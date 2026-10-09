# ADR 0002: A technique is identified by move plus starting position

- **Status:** Accepted
- **Date:** 2026-10-08
- **PR:** #13

## Context

An armbar is available from mount, from closed guard, and from side control.
A wrist lock is available from most top positions. Is "armbar" one thing in the
curriculum, or several?

The answer sets the shape of every algorithm downstream, because it decides
whether a technique's `from` is one position or a list of them.

## Decision

A technique is identified by the **move and the position it starts from**.
`armbar-from-mount` and `armbar-from-closed-guard` are separate techniques with
separate ids, separate notes, and separate progress.

This keeps `from: string` — exactly one position id — on every technique.

The shared mechanism between variants is recovered by an optional `family`
field. `family: "armbar"` groups them for display. No algorithm reads it.

## Alternatives considered

**Move as the node, position as an attribute.** One `armbar` technique with
`from: string[]`. Rejected because it pushes a list into the hot path of every
graph function: edge building, traversal, and path finding would each handle
one-to-many sources. It also makes progress meaningless — a user who hits the
armbar from mount and has never tried it from guard has no way to say so, even
though those are different skills with different setups and different failure
modes.

**Move-only nodes with separate position edges.** Techniques and positions in
one node set, linked by edges. Rejected for the reasons in
[ADR 0001](./0001-two-graph-model.md): it merges two graphs whose edges mean
different things.

## Consequences

**Easier.** `from` is a single id, so every algorithm in `src/graph/` stays
simple — no list handling anywhere. It matches how the material is actually
taught, since an armbar from mount and an armbar from guard are different
lessons on different days. Progress is tracked per context, which is what makes
gap analysis meaningful: "six attacks from mount, no escapes" is only a real
sentence if attacks and escapes are counted per position.

**Harder.** The curriculum has more entries than a move-indexed one would, and
the author writes a note for each. A user who considers themselves to "know the
armbar" has to mark it in several places. The shared mechanism between variants
is lost from the graph, and `family` only partly recovers it — being a display
hint that no algorithm reads, it cannot answer "show me every armbar I can
hit". If that question turns out to matter, it needs a new mechanism rather
than an extension of this one.
