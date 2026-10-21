import { describe, expect, test } from 'vitest'
import { buildAdjacency, dualOf } from './adjacency'
import { derivationCurriculum, derivationTechniques, positions, validCurriculum } from './fixtures'
import { FINISH, type Edge } from './types'

const byId = new Map(positions.map((p) => [p.id, p]))
const position = (id: string) => byId.get(id)!

/** Edges leaving a position, or an empty list. */
function out(graph: ReturnType<typeof buildAdjacency>, id: string): readonly Edge[] {
  return graph.out.get(id) ?? []
}

describe('dualOf', () => {
  test('a neutral position is its own dual', () => {
    expect(dualOf(position('standing'))).toBe('standing')
  })

  test('a two-sided position returns its declared dual', () => {
    expect(dualOf(position('mount-top'))).toBe('mount-bottom')
  })

  test('a scoped-out position returns null', () => {
    expect(dualOf(position('leg-entanglement-top'))).toBeNull()
  })
})

describe('authored edges', () => {
  const graph = buildAdjacency(validCurriculum)

  test('leave the position the technique starts from', () => {
    const ids = out(graph, 'closed-guard-bottom').map((e) => e.technique.id)
    expect(ids).toContain('scissor-sweep')
  })

  test('carry the endpoints the technique declares', () => {
    const edge = out(graph, 'closed-guard-bottom').find((e) => e.technique.id === 'scissor-sweep')!
    expect(edge.from).toBe('closed-guard-bottom')
    expect(edge.to).toBe('mount-top')
    expect(edge.derived).toBe(false)
  })

  test('every position is a key, even with nothing leaving it', () => {
    for (const p of validCurriculum.positions) {
      expect(graph.out.has(p.id)).toBe(true)
    }
  })

  test('finish is a node with nothing leaving it', () => {
    expect(graph.out.get(FINISH)).toEqual([])
  })
})

describe('derived edges', () => {
  const graph = buildAdjacency(derivationCurriculum)

  test('a normal technique mirrors dual to dual', () => {
    const mirrored = out(graph, 'closed-guard-top').find((e) => e.technique.id === 'scissor-sweep')
    expect(mirrored?.from).toBe('closed-guard-top')
    expect(mirrored?.to).toBe('mount-bottom')
    expect(mirrored?.derived).toBe(true)
  })

  // Catches the whole class: an edge whose from disagrees with the list it
  // sits in is filed correctly but lies about itself, which is the failure
  // D2 of the engineering review was about.
  test('every edge agrees with the key it is filed under', () => {
    for (const [nodeId, edges] of graph.out) {
      for (const edge of edges) {
        expect(edge.from).toBe(nodeId)
      }
    }
  })

  test('a submission derives nothing', () => {
    const all = [...graph.out.values()].flat()
    const mirrored = all.filter((e) => e.technique.id === 'armbar-from-mount' && e.derived)
    expect(mirrored).toEqual([])
  })

  // The case /plan-eng-review found: standing is neutral, so both people are
  // there. Without this the four techniques leaving standing mirror nowhere.
  test('a technique from a neutral position mirrors from that same position', () => {
    const mirrored = out(graph, 'standing').find(
      (e) => e.technique.id === 'double-leg' && e.derived,
    )
    expect(mirrored?.from).toBe('standing')
    expect(mirrored?.to).toBe('mount-bottom')
  })

  test('a technique into a scoped-out position derives nothing', () => {
    const all = [...graph.out.values()].flat()
    const mirrored = all.filter((e) => e.technique.id === 'leg-entanglement-entry' && e.derived)
    expect(mirrored).toEqual([])
  })

  test('a derived edge points somewhere its technique does not', () => {
    const mirrored = out(graph, 'closed-guard-top').find((e) => e.derived)!
    expect(mirrored.to).not.toBe(mirrored.technique.to)
  })

  // Asserted by id rather than by count: a count assertion recomputes the
  // implementation's own rule and passes when both are wrong.
  test('derives for exactly the techniques that should mirror', () => {
    const derivedIds = [...graph.out.values()]
      .flat()
      .filter((e) => e.derived)
      .map((e) => e.technique.id)
      .sort()
    expect(derivedIds).toEqual(['double-leg', 'scissor-sweep'])
  })
})

describe('invalid input', () => {
  // Without this the submission exclusion is untestable: FINISH is not a
  // position, so an unknown-id guard would swallow submissions and the
  // isFinish check would be dead code that mutation testing cannot catch.
  test('throws when a technique names an unknown position', () => {
    const broken = {
      positions,
      techniques: [{ ...derivationTechniques[0]!, to: 'turtle-top' }],
    }
    expect(() => buildAdjacency(broken)).toThrow(/unknown position/)
  })

  test('does not throw on a submission, whose target is never a position', () => {
    expect(() => buildAdjacency(derivationCurriculum)).not.toThrow()
  })

  // The endpoint check used to run after the authored edge was filed, and
  // submissions returned before reaching it, so an unknown from on a
  // submission vanished with no error.
  test('throws on an unknown from even when the technique is a submission', () => {
    const broken = {
      positions,
      techniques: [{ ...derivationTechniques[1]!, from: 'turtle-top' }],
    }
    expect(() => buildAdjacency(broken)).toThrow(/turtle-top/)
  })
})
