import { describe, expect, test } from 'vitest'
import { FINISH, isFinish, type Curriculum } from './types'

/**
 * A four-position slice of the real shape: a guard, its dual, a top position
 * and a submission's edge to FINISH. Small enough to read, complete enough to
 * exercise dual derivation and the finish sentinel in PR 8 and PR 12.
 */
const fixture: Curriculum = {
  positions: [
    {
      id: 'closed-guard-bottom',
      name: 'Closed Guard (Bottom)',
      perspective: 'bottom',
      dual: 'closed-guard-top',
      description: 'Legs locked around the opponent, on your back.',
    },
    {
      id: 'closed-guard-top',
      name: 'Closed Guard (Top)',
      perspective: 'top',
      dual: 'closed-guard-bottom',
      description: 'Kneeling or standing inside their closed guard.',
    },
    {
      id: 'mount-top',
      name: 'Mount (Top)',
      perspective: 'top',
      dual: 'mount-bottom',
      description: 'Sitting on their torso.',
    },
    {
      id: 'mount-bottom',
      name: 'Mount (Bottom)',
      perspective: 'bottom',
      dual: 'mount-top',
      description: 'Flat on your back with them sitting on you.',
    },
  ],
  techniques: [
    {
      id: 'scissor-sweep',
      name: 'Scissor Sweep',
      belt: 'white',
      from: 'closed-guard-bottom',
      to: 'mount-top',
      category: 'sweep',
      prerequisites: [],
      notes: 'TODO: review',
    },
    {
      id: 'armbar-from-mount',
      name: 'Armbar from Mount',
      belt: 'white',
      from: 'mount-top',
      to: FINISH,
      category: 'submission',
      family: 'armbar',
      prerequisites: ['scissor-sweep'],
      notes: 'TODO: review',
    },
  ],
}

describe('isFinish', () => {
  test('recognises the sentinel', () => {
    expect(isFinish(FINISH)).toBe(true)
  })

  test('rejects a position id', () => {
    expect(isFinish('mount-top')).toBe(false)
  })
})

describe('the fixture', () => {
  test('has a submission ending at FINISH', () => {
    const submission = fixture.techniques.find((t) => t.category === 'submission')
    expect(submission?.to).toBe(FINISH)
  })

  test('pairs every position with a dual that exists', () => {
    const ids = new Set(fixture.positions.map((p) => p.id))
    for (const position of fixture.positions) {
      if (position.dual !== null) {
        expect(ids.has(position.dual)).toBe(true)
      }
    }
  })
})
