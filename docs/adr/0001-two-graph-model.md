# ADR 0001: Model the curriculum as two graphs over one dataset

- **Status:** Accepted
- **Date:** 2026-10-08
- **PR:** #13

## Context

The app has to answer two questions that look similar and are not:

1. **What should I study next?** An ordering question. Its edges are
   prerequisites, it must never contain a cycle, and it has no spatial meaning.
2. **Where is my game full of holes?** A structural question about the mat. Its
   edges are techniques that move you between positions, cycles are normal
   (sweep, get swept back), and ordering means nothing.

One graph cannot carry both. An edge in the first means "learn A before B"; an
edge in the second means "this move takes you from A to B". A cycle is a data
error in one and expected in the other.

## Decision

Two separate directed graphs built over the same `Curriculum` data.

- **Learning graph:** nodes are techniques, edges are prerequisites. A DAG.
- **Position graph:** nodes are positions, edges are techniques plus their
  derived duals ([ADR 0003](./0003-derive-dual-edges.md)). Cyclic.

Neither is stored. Both are derived from one `positions.json` and one
`white.json`, so there is a single source of truth and nothing to keep in sync.

## Alternatives considered

**One graph with typed edges.** A single node set with `kind: "prerequisite" |
"transition"`. Rejected because every algorithm would begin by filtering edges
by type, which is two graphs with extra steps and worse ergonomics. Worse, the
DAG invariant could no longer be stated globally — "this graph has no cycles"
becomes "this graph has no cycles among edges of one type", which no cycle
detector expresses naturally.

**Roadmap only.** Simpler, and it is what a curriculum app normally is. Rejected
on the finding recorded in spec section 11: several released BJJ apps already
ship a white-to-blue curriculum with progress tracking, so a roadmap alone is a
commodity. The position graph is the part nothing else does.

**Position map only.** Loses study ordering entirely, and "what do I learn next"
is the question a white belt actually asks.

## Consequences

**Easier.** Each algorithm works on one clean graph, so `findPrerequisiteCycle`
can simply detect cycles and `validateConnectivity` can simply check
reachability, with no edge filtering in either. The two invariants are stated
plainly and are independently testable. Two views share one dataset, so progress
marked in one is visible in the other for free.

**Harder.** One dataset must satisfy two independent sets of invariants, and a
single technique edit can break either. A `from` change for one graph is a
prerequisite-depth change for the other. There are two views to design and keep
coherent rather than one, and spec section 6 commits to giving the position map
equal design investment rather than leftovers. Reconciling saved progress after
a curriculum change has to consider both.
