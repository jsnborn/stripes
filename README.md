# Stripes

An interactive BJJ roadmap from white to blue belt, built on graph algorithms.

> **Status:** in active development. Follow progress in the [project board](../../projects) and [pull requests](../../pulls).

## What it does

Most white belts don't know what to work on next. Stripes lays out a white-to-blue belt jiu-jitsu curriculum as a clickable roadmap: open a technique to see notes and a video, track how well you know it, and get suggestions for what to learn next.

Inspired by roadmap.sh, but with a second view that maps positions and transitions on the mat, so it can show where your game has gaps. For example: "You know six attacks from mount and no escapes from it."

## How it works

The curriculum is modeled as two directed graphs over the same data:

- **Learning graph:** techniques and their prerequisites. A DAG, used for study order and "learn next" suggestions.
- **Position graph:** positions and the techniques that move between them. Used for gap analysis and finding your shortest known path to a submission.

## Planned features

- [ ] Roadmap view with progress tracking
- [ ] "Learn next" suggestions
- [ ] Position map view
- [ ] Gap analysis
- [ ] Path finder
- [ ] Mobile-friendly layout

## Tech stack

React, TypeScript, Tailwind CSS, React Flow, Vitest, Playwright

## License

MIT
