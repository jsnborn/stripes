import { describe, expect, test } from 'vitest'
import { techniques, validCurriculum, withTechnique } from './fixtures'
import { FINISH, type Curriculum, type Position } from './types'
import { validateCurriculum } from './validate'

/** The kinds reported, for asserting without matching on message text. */
function kinds(curriculum: Curriculum): string[] {
  return validateCurriculum(curriculum).map((problem) => problem.kind)
}

describe('a valid curriculum', () => {
  test('reports no problems', () => {
    expect(validateCurriculum(validCurriculum)).toEqual([])
  })

  test('accepts FINISH as a target without calling it unknown', () => {
    const submission = techniques.find((t) => t.to === FINISH)
    expect(submission).toBeDefined()
    expect(kinds(validCurriculum)).not.toContain('unknown-to')
  })
})

describe('referential integrity', () => {
  test('flags a from that names no position', () => {
    const broken = withTechnique('scissor-sweep', { from: 'turtle-bottom' })
    expect(kinds(broken)).toContain('unknown-from')
  })

  test('flags a to that names no position', () => {
    const broken = withTechnique('scissor-sweep', { to: 'turtle-top' })
    expect(kinds(broken)).toContain('unknown-to')
  })

  test('flags a prerequisite that names no technique', () => {
    const broken = withTechnique('armbar-from-mount', { prerequisites: ['berimbolo'] })
    expect(kinds(broken)).toContain('unknown-prerequisite')
  })

  test('flags a dual that names no position', () => {
    const orphanDual: Position = {
      id: 'standing',
      name: 'Standing',
      perspective: 'neutral',
      dual: 'floating-in-space',
      description: 'On the feet.',
    }
    const broken: Curriculum = {
      positions: [...validCurriculum.positions, orphanDual],
      techniques,
    }
    expect(kinds(broken)).toContain('unknown-dual')
  })

  test('names the offending id so the message is actionable', () => {
    const broken = withTechnique('scissor-sweep', { from: 'turtle-bottom' })
    const problem = validateCurriculum(broken).find((p) => p.kind === 'unknown-from')
    expect(problem?.id).toBe('scissor-sweep')
  })
})

describe('duplicates', () => {
  test('flags two positions sharing an id', () => {
    const broken: Curriculum = {
      positions: [...validCurriculum.positions, validCurriculum.positions[0]!],
      techniques,
    }
    expect(kinds(broken)).toContain('duplicate-position-id')
  })

  test('flags two techniques sharing an id', () => {
    const broken: Curriculum = {
      positions: validCurriculum.positions,
      techniques: [...techniques, techniques[0]!],
    }
    expect(kinds(broken)).toContain('duplicate-technique-id')
  })
})

describe('shape', () => {
  test('flags an empty id', () => {
    const broken = withTechnique('scissor-sweep', { id: '' })
    expect(kinds(broken)).toContain('bad-field')
  })

  test('flags a belt outside the union', () => {
    const broken = withTechnique('scissor-sweep', { belt: 'coral' as unknown as 'white' })
    expect(kinds(broken)).toContain('bad-field')
  })

  test('flags a category outside the union', () => {
    const broken = withTechnique('scissor-sweep', {
      category: 'wristlocking' as unknown as 'sweep',
    })
    expect(kinds(broken)).toContain('bad-field')
  })

  test('flags a missing notes field', () => {
    const { notes: _notes, ...withoutNotes } = techniques[0]!
    const broken: Curriculum = {
      positions: validCurriculum.positions,
      techniques: [withoutNotes as (typeof techniques)[number]],
    }
    expect(kinds(broken)).toContain('bad-field')
  })
})

describe('reporting', () => {
  test('returns every problem rather than stopping at the first', () => {
    const broken = withTechnique('scissor-sweep', { from: 'turtle-bottom', to: 'turtle-top' })
    expect(validateCurriculum(broken).length).toBeGreaterThan(1)
  })
})
