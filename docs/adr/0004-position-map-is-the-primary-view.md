# ADR 0004: The position map is the primary view

- **Status:** Accepted
- **Date:** 2026-10-14
- **PR:** #15

## Context

A throwaway spike after PR 5 rendered the roadmap the way the spec described it:
techniques as nodes, laid out by prerequisite depth. Two problems appeared
immediately.

**Width, not depth, is the constraint.** Spec section 2.2 worried the
prerequisite graph would be too shallow. The real failure is sideways. Every
technique with no prerequisite lands in layer 0, and with 32 real techniques —
where most escapes, most submissions and all three takedowns plausibly have no
hard prerequisite — layer 0 holds 15 or more nodes at roughly 3400px. The
roadmap scrolls off-screen before depth is ever the problem.

**Orphans lie about themselves.** In the spike, two mount escapes sat in the top
row beside the takedowns purely because nothing listed them as a prerequisite.
The layout implied they were entry points. They are not.

The deeper issue is that a prerequisite-layered roadmap answers "what order
should I study in". The question a white belt actually asks is "what are my
options from here", and the layout buries the position, which is the thing
people navigate by.

The curriculum's own source agrees. Zenith BJJ's belt test sheet is organized
position, then category: "2 Sweeps from the Closed Guard", "2 Escapes from the
Mount". That structure is already in the user's head before they open the app.

## Decision

**The position map is the primary view.** It loads first, and selecting a
position opens its techniques grouped by category with a top/bottom toggle.

The roadmap remains, as a list grouped by position section. `roadmapLayers`
stays as an algorithm with tests and stops being the layout engine — the
fallback spec section 6 already wrote, triggered on judgment rather than on an
edge count.

This does **not** supersede [ADR 0001](./0001-two-graph-model.md). Two graphs
over one dataset still holds. What changes is which graph drives navigation.

No data model change. `Technique` already carries `from: string` and
`category: TechniqueCategory`, so "sweeps from closed-guard-bottom" is a filter
over two existing fields.

## Alternatives considered

**Keep the roadmap primary and fix only the layout**, grouping nodes into
position bands instead of global prerequisite layers. Rejected as treating the
symptom: you would still land on the roadmap, and position-first navigation
would stay six milestones away.

**Drop the roadmap entirely.** Genuinely tempting — it cuts about six PRs and
sharpens the project onto its differentiator, which spec section 11 already
found is the half nothing else ships. Rejected because the roadmap is the only
view that shows the whole curriculum at once, and "roadmap" is what the README
promises.

**Make the detail view a tree** — position, then category, then technique.
Rejected because the position graph has cycles (mount to back to mount) and a
tree cannot express one without duplicating nodes. Those cycles are information,
not noise; they are what makes `positionComponents` meaningful.

## Consequences

**Easier.** The view matches the structure of the source document and of how the
material is taught, so no translation layer sits between the two. The
differentiated view ships earlier, which is the ordering principle section 10
already argued for. The adjacency list serves navigation and every graph
algorithm at once rather than needing a separate index.

**Harder.** The single-screen overview is gone; position-first means drilling in,
so you see closed guard or you see mount, never all 32 together. The roadmap
becomes a secondary surface that still has to be designed and maintained without
being the thing anyone opens first, which is the kind of feature that rots. The
learning graph's visible payoff shrinks to ordering within a position, so its
prerequisite edges now have to earn their keep on much less work — if they turn
out to carry nothing, a later ADR should say so and remove them rather than
leave a DAG nobody reads.
