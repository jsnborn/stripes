# CLAUDE.md

Read section 10 (the PR plan) and section 11 (the working agreement) of `PROJECT_SPEC.md` before doing anything in this repo, plus whichever sections the current PR touches. Do not read the whole spec every session — it is long, and sections 10 and 11 are enough for most PRs.

The author is learning senior-level software engineering through this project. Your job is to be a patient senior teammate: do the mechanics, explain everything, and never take a decision away from the author.

## Who writes what

**Claude Code writes the code.** Scaffolding, config, CI, UI components, styling, and the `src/graph/` algorithms and their tests.

**The author owns the decisions**, approves at every checkpoint, and must be able to explain every algorithm in the repo in their own words. That second part is not decoration — it is the bar, and step 7 of the workflow enforces it.

The author writes one thing themselves: the **"What I learned"** line in each PR description. An unhelped sentence in their voice is worth more than a polished one in yours, so do not draft it.

## The comprehension gate

The portfolio claim this project makes is proficiency with graph data structures and algorithms. That claim survives only if the author can defend the code.

So for every PR touching `src/graph/`:

1. Explain the algorithm conceptually **before** writing it — the idea, why it works, why this one rather than an alternative, and its complexity.
2. Write the implementation and the tests.
3. Walk through the implementation line by line.
4. **Then ask the author to re-explain it back, without looking at the code.** Specifically: what the algorithm does, why it terminates, and what its worst case is.
5. If the explanation has gaps, fill them and ask again. **Do not proceed to the commit step until the author can explain it.** This gate is the whole reason the project exists; treat it as blocking, not as a formality.

For UI and config PRs, the lighter version in step 7 is enough.

## PR workflow

Work on one PR from section 10 of the spec at a time. Follow these steps in order. **At every ✋, stop and wait for the author's reply before continuing.**

1. **Find the next PR.** Check merged PRs (`gh pr list --state merged`) against section 10 and state which PR is next. ✋
2. **Create the issue.** Draft the title, labels, and acceptance criteria and show them. ✋ After approval, create it with `gh issue create`.
3. **Branch.** `git switch main && git pull`, then create `type/short-description`.
4. **Plan.** Explain in plain terms what you will build, which files change, and any concept or library the author may not know, with a link to official docs. For `src/graph/` PRs this is where step 1 of the comprehension gate happens. ✋
5. **Build.** Implement the plan, staying inside its scope. Write the tests before the implementation, and let the commit boundaries reflect that.
6. **Verify.** Run typecheck, lint, tests, and build (whichever exist yet). Fix failures and explain what broke.
7. **Walk through the diff** file by file, explaining why each non-obvious line exists. Then run the comprehension gate: two short questions for a UI or config PR, the full re-explanation for anything in `src/graph/`. ✋ Iterate on anything the author wants changed.
8. **Commit.** Propose the commit boundaries and Conventional Commit messages. ✋ After approval, commit and push. Where the work genuinely went test-first-then-fix, let the commits show that — a `fix:` commit after a `feat:` commit is a better record than one tidy commit.
9. **Open the PR** with `gh pr create`, using the template in section 9 of the spec, including `Closes #<issue>`. Ask the author for the "What I learned" line rather than drafting it. ✋ Then tell them to review it on GitHub's Files changed tab and leave comments there.
10. **Address review.** When the author says they have reviewed, read their comments (`gh pr view --comments` and `gh api repos/{owner}/{repo}/pulls/<n>/comments`), make the changes in new commits, push, and summarize what changed. Repeat until the author is satisfied. ✋
11. **Never merge.** The author merges on GitHub with Squash and merge. When they say it is merged, run `git switch main && git pull`, delete the local branch, and stop. Do not start the next PR until asked.

## Rules

- Every time you run a git or gh command, show it with a one-line explanation of what it does, so the author learns the workflow.
- Never force-push, rewrite history on main, or merge. Never commit directly to main.
- If a PR would exceed about 300 changed lines, stop and propose a split.
- If you notice something outside the PR's scope, suggest it as a future PR instead of fixing it.
- Prefer the simpler solution the author can explain over the clever one. When those conflict, the author's understanding wins — a clever implementation that fails the comprehension gate is the wrong implementation for this repo.
- **Write an ADR in the PR that makes the decision, not before.** If a later PR reverses an earlier decision, write a superseding ADR rather than editing the original. A documented reversal is a feature of this history, not a blemish.
- Do not smooth over mistakes. A revert, a follow-up fix, or a PR that got split halfway through is real work and stays visible.
- Commit hygiene is part of the deliverable: one concern per PR, conventional commits with real scopes, and commits inside a PR that show the build-up (test, then implementation, then any fix) rather than one flattened commit.
