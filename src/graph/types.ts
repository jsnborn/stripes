/**
 * Domain types for the curriculum.
 *
 * Nothing in src/graph imports React or a graph library. Everything here is
 * readonly: every function in this directory is pure, so mutating an input
 * should be a compile error rather than a code review note.
 */

export type Belt = 'white' | 'blue' | 'purple' | 'brown' | 'black'

export type Perspective = 'top' | 'bottom' | 'neutral'

export type TechniqueCategory =
  'sweep' | 'escape' | 'submission' | 'pass' | 'takedown' | 'guard-entry' | 'advance' | 'transition'

/**
 * The terminal node of the position graph. A submission is an edge to it.
 *
 * Kept as a constant so the rules that turn on it read by name. ADR 0003's
 * "submissions are never dualled" becomes `if (isFinish(t.to)) continue`
 * rather than the same string literal repeated across five algorithms.
 */
export const FINISH = 'finish'

export function isFinish(target: string): boolean {
  return target === FINISH
}

export type Position = {
  readonly id: string
  readonly name: string
  readonly perspective: Perspective
  /** The same physical position from the other side. Null where there is no other side. */
  readonly dual: string | null
  readonly description: string
}

export type TechniqueVideo = {
  /** A YouTube id, never a full URL and never a rehosted file. */
  readonly youtubeId: string
  /** Most good demonstrations sit minutes inside a longer video. */
  readonly startSeconds?: number
  readonly channel: string
}

export type Technique = {
  readonly id: string
  readonly name: string
  /** The belt this is learned during. "white" means needed to earn blue. */
  readonly belt: Belt
  /** A position id. Exactly one, per ADR 0002. */
  readonly from: string
  /** A position id, or FINISH. */
  readonly to: string
  readonly category: TechniqueCategory
  /** Groups variants across positions for display. No algorithm reads this. */
  readonly family?: string
  readonly prerequisites: readonly string[]
  readonly video?: TechniqueVideo
  readonly notes: string
}

export type Curriculum = {
  readonly positions: readonly Position[]
  readonly techniques: readonly Technique[]
}

/** 0 unseen, 1 seen, 2 can drill, 3 hits it live. */
export type ProgressLevel = 0 | 1 | 2 | 3

/** Technique id to level. Absent means 0. */
export type Progress = Readonly<Record<string, ProgressLevel>>

export type UserData = {
  /** Bumps only when this shape changes, never when the curriculum does. */
  readonly schemaVersion: number
  readonly progress: Progress
  /** Technique id to the user's own note. */
  readonly notes: Readonly<Record<string, string>>
  /** Ids no longer in the curriculum. Parked rather than deleted. */
  readonly orphaned?: Progress
}
