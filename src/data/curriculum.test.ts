import { describe, expect, test } from 'vitest'
import { buildAdjacency } from '../graph/adjacency'
import { FINISH, PERSPECTIVES } from '../graph/types'
import { validateCurriculum } from '../graph/validate'
import { curriculum, loadCurriculum } from './curriculum'

const { positions } = curriculum

describe('the real positions', () => {
  test('are the seventeen from spec section 3.1', () => {
    expect(positions).toHaveLength(17)
  })

  test('pass validateCurriculum', () => {
    expect(validateCurriculum(curriculum)).toEqual([])
  })

  test('have unique ids', () => {
    expect(new Set(positions.map((p) => p.id)).size).toBe(positions.length)
  })

  test('each declare a known perspective', () => {
    for (const position of positions) {
      expect(PERSPECTIVES).toContain(position.perspective)
    }
  })
})

describe('duals', () => {
  test('every non-null dual names a position that exists', () => {
    const ids = new Set(positions.map((p) => p.id))
    for (const position of positions) {
      if (position.dual !== null) {
        expect(ids.has(position.dual)).toBe(true)
      }
    }
  })

  // If A's dual is B but B's dual is something else, PR 12 mirrors edges onto
  // the wrong node and the position graph is quietly wrong rather than broken.
  test('are symmetric', () => {
    const byId = new Map(positions.map((p) => [p.id, p]))
    for (const position of positions) {
      if (position.dual !== null) {
        expect(byId.get(position.dual)?.dual).toBe(position.id)
      }
    }
  })

  test('are null exactly where ADR 0005 says', () => {
    const nulls = positions.filter((p) => p.dual === null).map((p) => p.id)
    expect(nulls.sort()).toEqual(['front-headlock-top', 'leg-entanglement-top', 'standing'])
  })

  test('pair a top with a bottom, never two of the same perspective', () => {
    const byId = new Map(positions.map((p) => [p.id, p]))
    for (const position of positions) {
      const dual = position.dual === null ? null : byId.get(position.dual)
      if (dual) {
        expect(dual.perspective).not.toBe(position.perspective)
      }
    }
  })
})

describe('loadCurriculum', () => {
  test('throws rather than returning invalid data', () => {
    const broken = [{ ...positions[0]!, dual: 'nowhere' }]
    expect(() => loadCurriculum(broken, [])).toThrow(/Curriculum is invalid/)
  })

  test('names the offending position in the message', () => {
    const broken = [{ ...positions[0]!, dual: 'nowhere' }]
    expect(() => loadCurriculum(broken, [])).toThrow(/standing/)
  })
})

describe('the real techniques', () => {
  const { techniques } = curriculum

  test('are the thirty-eight slots from spec section 3.2', () => {
    expect(techniques).toHaveLength(38)
  })

  test('have unique ids', () => {
    expect(new Set(techniques.map((t) => t.id)).size).toBe(techniques.length)
  })

  test('match section 3.2 group by group', () => {
    const count = (predicate: (t: (typeof techniques)[number]) => boolean) =>
      techniques.filter(predicate).length

    expect(count((t) => t.from === 'standing' && t.category === 'takedown')).toBe(3)
    expect(count((t) => t.from === 'closed-guard-bottom' && t.to === FINISH)).toBe(2)
    expect(count((t) => t.from === 'closed-guard-bottom' && t.category === 'sweep')).toBe(2)
    expect(count((t) => t.from === 'closed-guard-top')).toBe(2)
    expect(count((t) => t.category === 'pass')).toBe(3)
    expect(count((t) => t.from === 'leg-entanglement-top')).toBe(2)
    expect(count((t) => t.from === 'side-control-top' && t.to === FINISH)).toBe(3)
    expect(count((t) => t.from === 'side-control-bottom')).toBe(2)
    expect(count((t) => t.from === 'mount-top' && t.to === FINISH)).toBe(3)
    expect(count((t) => t.from === 'mount-bottom')).toBe(2)
    expect(count((t) => t.from === 'back-control-top')).toBe(2)
    expect(count((t) => t.from === 'back-control-bottom')).toBe(2)
    expect(count((t) => t.family === 'wrist-lock')).toBe(2)
  })

  test('are all placeholders awaiting the author', () => {
    for (const technique of techniques) {
      expect(technique.notes).toMatch(/^TODO: review/)
    }
  })

  test('ship with no prerequisites, since inventing them would violate section 11', () => {
    for (const technique of techniques) {
      expect(technique.prerequisites).toEqual([])
    }
  })
})

describe('the position graph over real data', () => {
  const graph = buildAdjacency(curriculum)
  const edges = [...graph.out.values()].flat()

  test('has a node for every position plus finish', () => {
    expect(graph.out.size).toBe(curriculum.positions.length + 1)
    expect(graph.out.has(FINISH)).toBe(true)
  })

  // Spec section 2.1: every position but finish has somewhere to go. Full
  // reachability from standing is validateConnectivity at PR 17.
  test('every position has at least one outgoing technique', () => {
    for (const position of curriculum.positions) {
      expect(graph.out.get(position.id)?.length ?? 0).toBeGreaterThan(0)
    }
  })

  test('nothing leaves finish', () => {
    expect(graph.out.get(FINISH)).toEqual([])
  })

  test('derives a mirror for every technique that should have one', () => {
    const dualless = new Set(
      curriculum.positions
        .filter((p) => p.dual === null && p.perspective !== 'neutral')
        .map((p) => p.id),
    )
    const expected = curriculum.techniques.filter(
      (t) => t.to !== FINISH && !dualless.has(t.to) && !dualless.has(t.from),
    ).length

    expect(edges.filter((e) => e.derived)).toHaveLength(expected)
    expect(edges.filter((e) => !e.derived)).toHaveLength(curriculum.techniques.length)
  })

  test('no derived edge ends at finish, so losing is never an outcome you own', () => {
    expect(edges.filter((e) => e.derived && e.to === FINISH)).toEqual([])
  })
})
