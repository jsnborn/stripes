# ADR 0003: Derive dual edges rather than authoring the losing side

- **Status:** Accepted
- **Date:** 2026-10-08
- **PR:** #13

## Context

Every technique is naturally written from the winning side. You *do* a sweep,
a pass, an escape. Nobody *does* anything to arrive in mount-bottom — the
opponent puts you there.

Written that way, the position graph is badly disconnected. Ten of the
seventeen positions, including every defensive one, have no incoming edge at
all: the three escape groups are outgoing edges from nodes nothing points at.
The spec section 2.1 invariant — every position reachable from `standing` —
fails on the seed data before a line of UI exists.

This is not cosmetic. `canReachFinish`, `gapAnalysis`, and
`shortestPathToFinish` all walk incoming and outgoing edges. On a graph where
half the nodes are unreachable, every one of them returns an answer that looks
plausible and is wrong.

## Decision

Every `Position` names its `dual` — the same physical position from the other
side — and `buildAdjacency` derives a mirrored edge for every non-submission
technique.

```
  AUTHORED                                   DERIVED
  scissor-sweep                              (the person being swept)
  closed-guard-bottom ─▶ mount-top           closed-guard-top ─▶ mount-bottom
```

Three rules make this safe:

- **Submissions are never dualled.** A technique with `to: "finish"` derives
  nothing. You do not "know" being submitted, and a dual here would let gap
  analysis and the path finder treat losing as an outcome you possess.
- **Duals are derived, never authored.** They are not records in `white.json`,
  have no progress of their own, and never appear in the roadmap or a study
  list. They exist only as edges in the position graph.
- **A dual inherits the progress of the technique it mirrors**, because knowing
  the knee cut is what teaches you what being knee-cut feels like.

## Alternatives considered

**Author the defensive edges by hand.** Write "being swept" as its own
technique. Rejected: it roughly doubles the authoring work described in spec
section 10 as 10 to 15 hours, and the two halves would drift as the curriculum
changes. It also pollutes the roadmap with entries nobody studies.

**Drop the connectivity invariant.** Accept a disconnected graph. Rejected
because the invariant is what makes the position graph worth building — without
it, "you cannot reach a finish from here" stops being a finding about your game
and becomes an artifact of how the data was written.

**Make positions perspective-free.** One `mount` node instead of `mount-top`
and `mount-bottom`. This does fix connectivity. Rejected because perspective is
the product: "six attacks from mount and no escapes from it" is not expressible
if mount is one node.

## Consequences

**Easier.** The connectivity invariant holds on real data, so every reachability
algorithm returns something meaningful. One authored technique yields two edges,
so the curriculum stays the size a person can write. Deriving a mirrored graph
is also a better algorithm exercise than several of the functions this project
originally planned to hand-write.

**Harder.** Half the edges in the position graph do not appear in the JSON,
which makes the data harder to debug by reading — a wrong edge may be a wrong
`dual` three positions away. Derived edges must never leak into the roadmap,
study lists, or progress, and nothing in the type system enforces that; it is a
discipline the tests have to hold. The submission exclusion is a silent
correctness rule — forget it and the path finder cheerfully reports that you
can reach `finish` by being armbarred. Positions whose `dual` is declared but
which have no outgoing technique become dead ends that trip the invariant,
which is the open issue spec section 3.1 defers to PR 10.
