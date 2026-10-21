# ADR 0006: Adjacency list keyed by position, with edges that own their endpoints

- **Status:** Accepted
- **Date:** 2026-10-21
- **PR:** #26

## Context

The position graph needed a representation. Every algorithm from PR 17 onward
walks it, so the shape chosen here is inherited by all of them.

`/plan-eng-review` ran before this PR, as spec section 11 requires, and found
two problems in the sketched design.

## Decision

**An adjacency list: one map from position id to the edges leaving it**, plus an
entry for `FINISH`. Every node is seeded with an empty list, so "nothing leaves
here" is an empty array rather than a missing key — a distinction gap analysis
depends on, since a position with no outgoing techniques is the headline finding
the product promises.

**`dualOf(position)` returns the position's own id when its perspective is
`neutral`, otherwise its declared `dual`.** `dual: null` was carrying two
incompatible meanings. `standing` is neutral, so both people are in it and a
takedown must mirror from it; `front-headlock-top` and `leg-entanglement-top`
are scoped out by [ADR 0005](./0005-null-duals-for-front-headlock-and-leg-entanglement.md)
and must mirror nowhere. `perspective` already distinguishes them.

**An `Edge` owns its own `from` and `to`.** Traversal reads those and never the
technique's. On a derived edge they differ by design, so reaching through to
`technique.to` walks to the wrong node and returns a plausible wrong answer.
`technique` is display and progress payload.

**The transposed adjacency is not built here.** It arrives at PR 21, where
`canReachFinish` consumes it.

## Alternatives considered

**An adjacency matrix.** Seventeen positions is 289 cells, so space is not the
argument. Two other things are: the question asked here is always "what leaves
this node", which is O(1) plus O(degree) on a list and a full row scan on a
matrix; and a matrix cell holds a boolean, while these edges carry a payload —
which technique, its notes, its progress.

**Skip the mirror whenever either endpoint's dual is null**, the literal reading
of ADR 0003. Rejected because it silently drops all four techniques leaving
`standing`, so nothing would derive an edge into a bottom position from the
feet, and `validateConnectivity` at PR 17 would report those positions
unreachable — on a curriculum already written around the assumption.

**Make `standing` self-dual in the data** (`"dual": "standing"`). Workable, and
it keeps the rule a plain lookup. Rejected because the existing test asserting a
dual pairs a top with a bottom would need a neutral exemption, and a
self-referential row reads oddly to anyone scanning the JSON.

**Keep `technique` as the only endpoint source.** Rejected per the review: it
makes `edge.to` and `edge.technique.to` disagree on every derived edge with
nothing marking which is correct.

## Consequences

**Easier.** Every later algorithm gets O(1) access to a node's outgoing edges,
and the same structure serves the position detail panel with no separate index.
Seeded empty lists mean a gap is a readable empty array. The `Edge` shape makes
traversal correct by default rather than by discipline.

**Harder.** Two fields on `Edge` look redundant on authored edges until you know
why, and that knowledge lives in a comment rather than in the types. Adding the
transpose later touches this function again rather than being free. And a
derived edge still carries a `technique` whose own `from` and `to` disagree with
the edge's — the footgun is reduced, not removed, because the payload has to be
there for notes and progress.

**A rule that was dead code until mutation testing.** The submission exclusion
originally sat behind a guard that already swallowed submissions for an
unrelated reason, so removing it broke no test. Making the unknown-position
guard throw rather than skip made the exclusion load-bearing and testable, and
turned invalid input into a loud failure instead of a graph quietly short an
edge.
