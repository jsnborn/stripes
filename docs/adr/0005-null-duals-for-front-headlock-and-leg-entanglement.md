# ADR 0005: Null duals for front headlock and leg entanglement

- **Status:** Accepted
- **Date:** 2026-10-19
- **PR:** #24

## Context

Spec section 3.1 lists seventeen positions and flags two of them. It names
`front-headlock-bottom` and `leg-entanglement-bottom` as duals, but neither is
a position in the table.

Declaring those duals forces a choice. [ADR 0003](./0003-derive-dual-edges.md)
derives a mirrored edge for every non-submission technique, so a declared dual
is a node that edges will point at. Both bottoms would then exist with incoming
edges and no outgoing technique, which is exactly the dead end spec section
2.1's invariant forbids — and the failure would show up in
`validateConnectivity` at PR 17, on data already written around the assumption.

## Decision

`front-headlock-top` and `leg-entanglement-top` have `dual: null`. Being caught
in either position is outside v1.

Seventeen positions. No extra techniques. A null dual derives no mirrored edge,
so no dead end is created.

## Alternatives considered

**Add both bottoms with a defensive technique each** — a guillotine escape and
a leg lock escape — making nineteen positions and forty technique slots. This
is the more complete model of the mat, and both are real things that happen to
white belts. Rejected because it widens the curriculum past the belt test that
[ADR 0004](./0004-position-map-is-the-primary-view.md) had just established as
the source of truth. The sheet requires two straight foot locks as *attacks*
and asks for no defence of either position.

**Model the front headlock only**, since getting caught in one is far more
common at white belt than being leg entangled. Genuinely tempting, and the
asymmetry is real. Rejected because a rule that applies to one case and not its
neighbour needs a justification stronger than "this one comes up more", and
nothing in the source document distinguishes them.

## Consequences

**Easier.** The invariant holds with no extra authoring. `dual: null` is now
exercised by real data rather than only by a fixture, so the null path in
`buildAdjacency` is covered from PR 12 onward. The curriculum stays the size
the belt test defines.

**Harder.** The position map will show two top positions with no bottom
counterpart, which is visibly asymmetric next to the seven positions that do
pair. That needs either a UI explanation or acceptance that the map is honest
about what v1 covers. More substantially, a user who is being guillotined gets
nothing from this app — and `gapAnalysis` cannot report a hole it has no node
for, so the absence is invisible rather than flagged. If leg lock defence
becomes part of a later belt's curriculum, a superseding ADR adds both bottoms
and their escapes rather than this one being edited.
