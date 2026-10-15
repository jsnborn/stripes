import { BELTS, CATEGORIES, PERSPECTIVES, isFinish, type Curriculum } from './types'

export type ProblemKind =
  | 'bad-field'
  | 'duplicate-position-id'
  | 'duplicate-technique-id'
  | 'unknown-dual'
  | 'unknown-from'
  | 'unknown-prerequisite'
  | 'unknown-to'

export type Problem = {
  readonly kind: ProblemKind
  /** The offending position or technique id, so the message is actionable. */
  readonly id: string
  readonly message: string
}

/**
 * Checks a curriculum and returns everything wrong with it.
 *
 * Returns problems rather than throwing, because authoring 32 techniques
 * means wanting every problem at once rather than one per run.
 *
 * Two different jobs here. Shape checks ask whether a field is well formed.
 * Reference checks ask whether a well-formed id points at something real,
 * which is the bug the type system cannot catch and the reason this exists.
 */
export function validateCurriculum(curriculum: Curriculum): Problem[] {
  const problems: Problem[] = []

  const positionIds = new Set<string>()
  for (const position of curriculum.positions) {
    if (positionIds.has(position.id)) {
      problems.push({
        kind: 'duplicate-position-id',
        id: position.id,
        message: `Position id "${position.id}" is used more than once.`,
      })
    }
    positionIds.add(position.id)
    problems.push(...checkPositionShape(position))
  }

  const techniqueIds = new Set<string>()
  for (const technique of curriculum.techniques) {
    if (techniqueIds.has(technique.id)) {
      problems.push({
        kind: 'duplicate-technique-id',
        id: technique.id,
        message: `Technique id "${technique.id}" is used more than once.`,
      })
    }
    techniqueIds.add(technique.id)
    problems.push(...checkTechniqueShape(technique))
  }

  // References are checked only once every id is known, so a forward
  // reference to a position declared later is not falsely reported.
  for (const position of curriculum.positions) {
    if (position.dual !== null && !positionIds.has(position.dual)) {
      problems.push({
        kind: 'unknown-dual',
        id: position.id,
        message: `Position "${position.id}" has dual "${position.dual}", which does not exist.`,
      })
    }
  }

  for (const technique of curriculum.techniques) {
    if (!positionIds.has(technique.from)) {
      problems.push({
        kind: 'unknown-from',
        id: technique.id,
        message: `Technique "${technique.id}" starts from "${technique.from}", which does not exist.`,
      })
    }

    // FINISH is the terminal node and is never declared as a position.
    if (!isFinish(technique.to) && !positionIds.has(technique.to)) {
      problems.push({
        kind: 'unknown-to',
        id: technique.id,
        message: `Technique "${technique.id}" ends at "${technique.to}", which does not exist.`,
      })
    }

    for (const prerequisite of technique.prerequisites) {
      if (!techniqueIds.has(prerequisite)) {
        problems.push({
          kind: 'unknown-prerequisite',
          id: technique.id,
          message: `Technique "${technique.id}" requires "${prerequisite}", which does not exist.`,
        })
      }
    }
  }

  return problems
}

function badField(id: string, field: string, reason: string): Problem {
  return { kind: 'bad-field', id, message: `${id}: ${field} ${reason}.` }
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0
}

function checkPositionShape(position: Curriculum['positions'][number]): Problem[] {
  const problems: Problem[] = []
  const id = isNonEmptyString(position.id) ? position.id : '<missing id>'

  if (!isNonEmptyString(position.id)) problems.push(badField(id, 'id', 'is missing or empty'))
  if (!isNonEmptyString(position.name)) problems.push(badField(id, 'name', 'is missing or empty'))
  if (!PERSPECTIVES.includes(position.perspective)) {
    problems.push(badField(id, 'perspective', `is not one of ${PERSPECTIVES.join(', ')}`))
  }
  if (position.dual !== null && !isNonEmptyString(position.dual)) {
    problems.push(badField(id, 'dual', 'must be a position id or null'))
  }
  if (typeof position.description !== 'string') {
    problems.push(badField(id, 'description', 'is missing'))
  }

  return problems
}

function checkTechniqueShape(technique: Curriculum['techniques'][number]): Problem[] {
  const problems: Problem[] = []
  const id = isNonEmptyString(technique.id) ? technique.id : '<missing id>'

  if (!isNonEmptyString(technique.id)) problems.push(badField(id, 'id', 'is missing or empty'))
  if (!isNonEmptyString(technique.name)) problems.push(badField(id, 'name', 'is missing or empty'))
  if (!BELTS.includes(technique.belt)) {
    problems.push(badField(id, 'belt', `is not one of ${BELTS.join(', ')}`))
  }
  if (!CATEGORIES.includes(technique.category)) {
    problems.push(badField(id, 'category', `is not one of ${CATEGORIES.join(', ')}`))
  }
  if (!isNonEmptyString(technique.from)) problems.push(badField(id, 'from', 'is missing or empty'))
  if (!isNonEmptyString(technique.to)) problems.push(badField(id, 'to', 'is missing or empty'))
  if (!Array.isArray(technique.prerequisites)) {
    problems.push(badField(id, 'prerequisites', 'must be an array'))
  }
  if (typeof technique.notes !== 'string') {
    problems.push(badField(id, 'notes', 'is missing'))
  }

  return problems
}
