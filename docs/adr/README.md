# Architecture decision records

Short documents recording decisions that would otherwise be reconstructed from
`git log` and guesswork.

## Rules

**Write an ADR in the PR that makes the decision, not before.** An ADR written
twenty PRs ahead of its code is speculation, and a reviewer can tell.

**Never edit an ADR to reverse it.** Write a new one that supersedes it, and
mark the original `Superseded by`. A documented reversal shows the thinking
moved; a silently edited record hides that it ever did.

**Number sequentially**, zero-padded to four digits, never reused:
`0001-two-graph-model.md`. `0000-template.md` is the template.

## Scope

Not everything is an ADR. A decision earns one when it was genuinely contested,
constrains later work, or will look arbitrary to someone reading the code cold.
Picking a date library is not an ADR. Choosing to model the curriculum as two
graphs over the same data is.

## Index

Populated as ADRs land. First entries arrive in PR 5.
