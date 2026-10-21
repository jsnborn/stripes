import {
  FINISH,
  isFinish,
  type Curriculum,
  type Edge,
  type Position,
  type PositionGraph,
} from './types'

/**
 * The position this one looks like from the other side.
 *
 * `dual: null` carries two different meanings, and they need opposite
 * behaviour:
 *
 *   standing              neutral  — both people are here, so it is its own
 *                                    dual and a takedown mirrors from it
 *   leg-entanglement-top  top      — the other side is outside v1 (ADR 0005),
 *                                    so nothing mirrors into it
 *
 * `perspective` already distinguishes them, so the rule reads it rather than
 * adding a third state to the data.
 */
export function dualOf(position: Position): string | null {
  return position.perspective === 'neutral' ? position.id : position.dual
}

/**
 * Builds the position graph: for each position, the techniques leaving it.
 *
 *   AUTHORED (what you do)                 DERIVED (what happens to them)
 *
 *   scissor-sweep
 *   closed-guard-bottom ──▶ mount-top      closed-guard-top ──▶ mount-bottom
 *
 * Every non-submission technique yields two edges, because every technique
 * moves two people (ADR 0003). Without the mirrors, ten of seventeen
 * positions would have no incoming edge and every reachability answer would
 * be wrong rather than missing.
 *
 * One pass over the techniques, so O(V + E) time and space. It cannot loop:
 * there is no recursion and nothing is revisited.
 */
export function buildAdjacency(curriculum: Curriculum): PositionGraph {
  const positionsById = new Map(curriculum.positions.map((p) => [p.id, p]))

  // Seed every node, so "nothing leaves here" is an empty list rather than a
  // missing key. FINISH is a node too; nothing leaves it, and asking is valid.
  const out = new Map<string, Edge[]>()
  for (const position of curriculum.positions) {
    out.set(position.id, [])
  }
  out.set(FINISH, [])

  for (const technique of curriculum.techniques) {
    // Checked before the edge is filed, not after. An unknown id means the
    // caller skipped validateCurriculum; dropping the edge silently would
    // leave a graph quietly short an edge rather than obviously broken.
    const from = positionsById.get(technique.from)
    if (!from) throw unknownPosition(technique.id, technique.from)

    push(out, technique.from, {
      from: technique.from,
      to: technique.to,
      technique,
      derived: false,
    })

    // A submission has no other side. Mirroring it would let the path finder
    // report being armbarred as a way to reach a finish.
    if (isFinish(technique.to)) continue

    const to = positionsById.get(technique.to)
    if (!to) throw unknownPosition(technique.id, technique.to)

    const mirroredFrom = dualOf(from)
    const mirroredTo = dualOf(to)
    if (mirroredFrom === null || mirroredTo === null) continue

    push(out, mirroredFrom, {
      from: mirroredFrom,
      to: mirroredTo,
      technique,
      derived: true,
    })
  }

  return { out }
}

function push(out: Map<string, Edge[]>, nodeId: string, edge: Edge): void {
  const edges = out.get(nodeId)
  if (edges) edges.push(edge)
}

function unknownPosition(techniqueId: string, positionId: string): Error {
  return new Error(
    `Technique "${techniqueId}" names unknown position "${positionId}". Run validateCurriculum first.`,
  )
}
