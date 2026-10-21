import { FINISH, type Curriculum, type Position, type Technique } from './types'

/**
 * A readable slice of the real shape: one guard and its dual, one top
 * position and its dual, a sweep between them and a submission to FINISH.
 *
 * Extracted from types.test.ts now that PR 8 is a second consumer.
 */
export const positions: readonly Position[] = [
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
  {
    // Neutral: both people are here, so it is its own dual.
    id: 'standing',
    name: 'Standing',
    perspective: 'neutral',
    dual: null,
    description: 'Both on the feet.',
  },
  {
    // Scoped out by ADR 0005: no bottom side exists, so nothing mirrors into it.
    id: 'leg-entanglement-top',
    name: 'Leg Entanglement (Top)',
    perspective: 'top',
    dual: null,
    description: 'One of their legs isolated.',
  },
]

export const techniques: readonly Technique[] = [
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
]

export const validCurriculum: Curriculum = { positions, techniques }

/**
 * Techniques chosen to hit every branch of dual derivation:
 * a normal mirror, a submission, a neutral source, and a null-dual target.
 */
export const derivationTechniques: readonly Technique[] = [
  ...techniques,
  {
    id: 'double-leg',
    name: 'Double Leg',
    belt: 'white',
    from: 'standing',
    to: 'mount-top',
    category: 'takedown',
    prerequisites: [],
    notes: 'TODO: review',
  },
  {
    id: 'leg-entanglement-entry',
    name: 'Leg Entanglement Entry',
    belt: 'white',
    from: 'closed-guard-bottom',
    to: 'leg-entanglement-top',
    category: 'transition',
    prerequisites: [],
    notes: 'TODO: review',
  },
]

export const derivationCurriculum: Curriculum = {
  positions,
  techniques: derivationTechniques,
}

/**
 * The fixture with one technique patched, for testing a single failure.
 *
 * Takes the target id separately from the changes so a test can break the
 * id itself; an earlier version matched on the replacement's own id and
 * silently changed nothing when that was the field under test.
 */
export function withTechnique(targetId: string, changes: Partial<Technique>): Curriculum {
  return {
    positions,
    techniques: techniques.map((t) => (t.id === targetId ? { ...t, ...changes } : t)),
  }
}

/** The fixture with one position patched. Mirrors withTechnique. */
export function withPosition(targetId: string, changes: Partial<Position>): Curriculum {
  return {
    positions: positions.map((p) => (p.id === targetId ? { ...p, ...changes } : p)),
    techniques,
  }
}
