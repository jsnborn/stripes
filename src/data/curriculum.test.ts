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

describe('the position graph over real positions', () => {
  const graph = buildAdjacency(curriculum)

  test('has a node for every position plus finish', () => {
    expect(graph.out.size).toBe(positions.length + 1)
    expect(graph.out.has(FINISH)).toBe(true)
  })

  test('is entirely empty until techniques arrive at PR 11', () => {
    for (const edges of graph.out.values()) {
      expect(edges).toEqual([])
    }
  })
})
