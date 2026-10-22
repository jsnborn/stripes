import type { Curriculum, Position, Technique } from '../graph/types'
import { validateCurriculum } from '../graph/validate'
import rawPositions from './positions.json'
import rawTechniques from './white.json'

/**
 * Builds a curriculum and refuses to return an invalid one.
 *
 * This is build-time data, so a broken curriculum should fail the test run
 * rather than render a wrong graph in a browser. Exported separately from
 * the module-level instance below so tests can feed it bad data.
 */
export function loadCurriculum(
  positions: readonly Position[],
  techniques: readonly Technique[],
): Curriculum {
  const curriculum: Curriculum = { positions, techniques }
  const problems = validateCurriculum(curriculum)

  if (problems.length > 0) {
    const detail = problems.map((problem) => `  ${problem.message}`).join('\n')
    throw new Error(`Curriculum is invalid:\n${detail}`)
  }

  return curriculum
}

/**
 * The cast is the one place untyped JSON becomes typed data. It is honest
 * because loadCurriculum checks the same values at runtime on the next line —
 * if the JSON does not match Position, this throws rather than lying.
 */
const positions = rawPositions as readonly Position[]

const techniques = rawTechniques as readonly Technique[]

export const curriculum = loadCurriculum(positions, techniques)
