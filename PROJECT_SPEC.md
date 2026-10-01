# Stripes: Project Spec

## 1. Overview

Think roadmap.sh, but for jiu-jitsu. An interactive web app that lays out a Brazilian jiu-jitsu curriculum as a clickable learning roadmap. Users click a technique to see notes and a video, mark their progress, and get recommendations on what to learn next and where their game has gaps. A second view shows the same techniques as a map of positions and transitions on the mat.

The roadmap view is the product's front door. The position map is the differentiator: a roadmap can tell you what to study, but it can't tell you that you have no escapes from mount.

That split is not a guess. Several released BJJ apps already ship a structured white-to-blue curriculum with progress tracking, so the roadmap view is a commodity. None of them models positions as a graph and computes structural gaps from it. The position map and gap analysis are the defensible ground, which is why section 10 builds them before the roadmap is polished.

**v1 scope:** a white-to-blue belt reference. The goal is *breadth of position coverage* — every position a blue belt should know, with a few techniques from each — rather than depth in any one position. The data model supports later belts and deeper content without a migration.

The project has two goals, in this order:

1. **Learning.** The author is building this to learn graph data structures and algorithms. Claude Code writes the implementations; the author owns every design decision and must be able to explain each algorithm — what it does, why it terminates, its complexity — without looking at the code. `CLAUDE.md` makes that a blocking gate before any `src/graph/` PR is committed. The point is understanding, not keystrokes.
2. **Portfolio.** It should be deployed, tested, documented, visually polished, and interesting to a reviewer or grappler within 10 seconds of opening it.

## 2. Core design: two graphs

The curriculum is modeled as two separate directed graphs over the same data.

### 2.1 Position graph (what happens on the mat)
- **Nodes:** positions, each with a perspective. `closed-guard-bottom` and `closed-guard-top` are different nodes.
- **Edges:** techniques that move from one position to another, plus their derived duals (section 2.6).
- Sweeps and reversals change perspective (scissor sweep: `closed-guard-bottom` to `mount-top`).
- Submissions are edges to a terminal node with id `finish`.
- Cycles are allowed and expected.
- **Invariant:** every position is reachable from `standing`, and every position except `finish` has at least one outgoing technique. Validated by `validateConnectivity`, not assumed.

### 2.2 Learning graph (what to study before what)
- **Nodes:** techniques.
- **Edges:** prerequisites ("learn A before B").
- Must be a DAG. Cycles are a data error and must be detected.
- Prerequisites may cross belts: a blue-to-purple technique can require a white-to-blue one.

**Open risk, to be resolved before PR 7.** The learning graph's edges are hand-authored, and most BJJ techniques have no hard prerequisite. If the real graph turns out to be sparse — say under a dozen edges with a maximum depth of 2 — then `roadmapLayers` returns two layers, one of them holding most of the curriculum, and the roadmap's y-axis is not carrying information. **Before writing any code, write all 38 prerequisite lists on paper and count the edges and the longest chain.** Section 6 records both layout options and the trigger for choosing between them. The position graph earns its keep regardless; the learning graph is the one that has to prove it has content behind it.

### 2.3 Modeling principle: a technique is (move + position)

A technique is identified by the move **and** the position it starts from, never by the move alone. "Armbar" is not one node — `armbar-from-mount` and `armbar-from-closed-guard` are separate techniques, because they have different setups, different failure modes, and are taught separately. The same applies to wrist locks, chokes, and every other move available from more than one position.

This keeps `from` a single position id, which keeps every algorithm simple. What it loses — the shared mechanism between variants — is recovered by the optional `family` field (section 3).

### 2.4 Position granularity

Positions are part of the product, not just graph plumbing: the app is a reference of positions a blue belt should know, so a named position earns a node even if only one technique starts from it. A sparse node is informative — the map visibly says "you have nothing here."

**Split rule:** split one position into several when **three or more** techniques behave genuinely differently from it. Until then, keep it coarse. This is why `leg-entanglement-top` is a single node in v1 rather than separate `ashi-garami`, `single-leg-x`, and `saddle` nodes — three nodes holding one technique each is over-modeling. It splits when leg lock content grows.

A split changes the `from` of existing techniques, which is the one event that can strand saved progress. Section 5.2 says how that is handled.

### 2.5 Modeling rule: `to` is the taught outcome

On the mat a technique rarely has one outcome. A butterfly sweep can land in mount, side control, or half guard depending on how the opponent reacts, and a scramble can put either person anywhere. The model does not try to capture that:

> **`to` is where the technique is taught to land, not every place a scramble might put you.**

This is a deliberate loss of fidelity, and it is what makes the graph useful. If every plausible outcome became an edge, the position graph would trend toward fully connected — gap analysis would find no gaps, the path finder would reach `finish` from anywhere, and the map would stop being a map. The value of the position graph is that it is opinionated about the main lines, which is also what a curriculum is.

Ambiguity is handled in this order:

1. **One canonical `to`** — the taught outcome. The default, and usually the end of the discussion.
2. **Split into `family` variants** when a variant is genuinely a different technique — different grips, a different finish, taught separately. Two techniques sharing one `family` (section 2.3). Do not reach for this while a position holds only one technique of that kind.
3. **Put the nuance in `notes`** — "lands in mount if they turn away, half guard if they post." Free text reads better to a human than a list of position ids, and costs nothing.

Explicitly rejected for v1: `to: string[]`, and weighted outcomes. Weighted edges are queued for v2, where the weights come from the author's own roll logs rather than from invented percentages (section 11 forbids inventing technique details as fact).

### 2.6 Dual positions: why the graph would otherwise be disconnected

Every technique is naturally written from the winning side's point of view. You *do* a sweep, a pass, an escape. But you never *do* anything to arrive in mount-bottom — your opponent puts you there.

Written naively, that makes the position graph badly disconnected. Ten of the seventeen positions, including every defensive one, have no incoming edge at all: the three escape groups are outgoing edges from nodes that nothing points at. The invariant in section 2.1 would fail on the seed data.

The fix is that **every technique moves two people.** Each `Position` names its `dual` — the same physical position seen from the other side — and every non-submission technique derives a mirrored edge automatically:

```
  AUTHORED EDGE                                DERIVED DUAL EDGE
  knee-cut-pass                                (the person being passed)
  open-guard-top ──────▶ side-control-top      open-guard-bottom ──▶ side-control-bottom

  scissor-sweep                                (the person being swept)
  closed-guard-bottom ─▶ mount-top             closed-guard-top ────▶ mount-bottom
```

Rules:

- **Submissions are never dualled.** A technique with `to: "finish"` derives nothing. You do not "know" being submitted, and a dual edge here would let gap analysis and the path finder treat losing as an outcome you possess.
- **Duals are derived, never authored.** `buildAdjacency` computes them. They do not appear in `white.json`, are not separate `Technique` records, have no progress level of their own, and never appear in the roadmap or in study lists. They exist only as edges in the position graph.
- A dual edge inherits the progress level of the technique it mirrors, since knowing the knee cut is what teaches you what being knee-cut feels like.

Duals alone still leave butterfly guard and half guard unreachable, because nothing in the curriculum *enters* them. Section 3.2 adds four techniques — a back take, mount from side control, a butterfly entry, and a half guard entry — which together with the dual rule make all seventeen positions reachable from `standing`.

Deriving a mirrored graph is also a better exercise than several of the functions this project was originally going to hand-write.

## 3. Data model

### Where the curriculum comes from

**The curriculum is not invented.** Every technique slot below traces to Zenith BJJ's adult white-to-blue belt test — a one-page scoring sheet an instructor fills in at the test itself, covering **17 requirement categories over 32 technique slots**, each scored 0-10.

The sheet specifies **categories and counts, not techniques.** "2 Submissions from the Mount" is two slots; which two is the student's choice. That boundary is the shape of this project's data problem: the gym fixes the structure, the author fills it, and the graph checks that what results actually holds together.

| Requirement, as the sheet states it | Slots |
|---|---|
| 2 Submissions from the Closed Guard (at least one choke) | 2 |
| 2 Sweeps from the Closed Guard (one standing, one on the knees) | 2 |
| 1 Open Guard Sweep | 1 |
| 1 Butterfly Guard Sweep | 1 |
| 1 Half Guard Sweep | 1 |
| 3 Guard Passes (guard player must be busy) | 3 |
| 2 Ways of opening the Closed Guard | 2 |
| 2 Submissions from Side Control | 2 |
| 2 Submissions from the Mount | 2 |
| 2 Submissions from the Back | 2 |
| 2 Escapes from Side Control | 2 |
| 2 Escapes from the Mount | 2 |
| 2 Escapes from the Back | 2 |
| 2 Straight Foot Locks | 2 |
| 2 Wrist Locks | 2 |
| 1 Jump or pull to Closed Guard | 1 |
| 3 Take Downs | 3 |
| **Total** | **32** |

Section 3.2 maps these onto graph edges and adds six more that the graph requires. This table is the one organized the way the test is scored, which is also how a user thinks about their own progress; 3.2 is organized by `from` and `to`.

```ts
type Belt = "white" | "blue" | "purple" | "brown" | "black";

type Perspective = "top" | "bottom" | "neutral";

type Position = {
  id: string;            // "closed-guard-bottom"
  name: string;          // "Closed Guard (Bottom)"
  perspective: Perspective;
  dual: string | null;   // "closed-guard-top"; null for neutral positions
  description: string;
};

type TechniqueCategory =
  | "sweep"
  | "escape"
  | "submission"
  | "pass"
  | "takedown"
  | "guard-entry"
  | "advance"        // positional advancement: side control -> mount, mount -> back
  | "transition";

type Technique = {
  id: string;            // "armbar-from-mount"
  name: string;          // "Armbar from Mount"
  belt: Belt;            // the belt this is learned during ("white" = needed to earn blue)
  from: string;          // Position id
  to: string;            // Position id, or the sentinel "finish"
  category: TechniqueCategory;
  family?: string;       // "armbar" — groups variants across positions; no algorithm reads this
  prerequisites: string[]; // Technique ids, may reference earlier belts
  video?: TechniqueVideo;
  notes: string;         // Written in our own words, rendered as text (section 5.2)
};

type TechniqueVideo = {
  youtubeId: string;     // an id, never a full URL, never rehosted
  startSeconds?: number; // most good demos sit inside a longer video
  channel: string;       // shown as attribution in the drawer
};

type ProgressLevel = 0 | 1 | 2 | 3; // 0 unseen, 1 seen, 2 can drill, 3 hits it live
type Progress = Record<string, ProgressLevel>;

// Everything the user owns. One localStorage key, one exported file.
type UserData = {
  schemaVersion: number;             // bumps only when THIS shape changes
  progress: Progress;                // techniqueId -> level
  notes: Record<string, string>;     // techniqueId -> the user's own note
  orphaned?: Progress;               // ids no longer in the curriculum; parked, never deleted
};

type Curriculum = {
  positions: Position[];
  techniques: Technique[];
};
```

- Curriculum data lives in `src/data/` as `positions.json` plus one file per belt (`white.json`, later `blue.json`), merged at load time. Positions are shared across belts.
- **`finish` is a sentinel id, not a `Position`.** It has no perspective, no dual, and no row in `positions.json`. `validateConnectivity` special-cases it as the one node allowed to have no outgoing technique.
- Technique ids are permanent. Renaming a technique changes `name`, never `id`.
- `family` is display metadata only. No graph algorithm may depend on it.
- `Curriculum` has no `version` field. Content grows constantly and that is not a migration event; see section 5.2.
- `UserData` lives in the browser (localStorage) for the MVP. No backend, no auth. It is the only mutable data in the app.

### 3.1 v1 position set

Seventeen positions plus the `finish` sentinel.

| id | perspective | dual |
|---|---|---|
| `standing` | neutral | `null` |
| `closed-guard-bottom` | bottom | `closed-guard-top` |
| `closed-guard-top` | top | `closed-guard-bottom` |
| `open-guard-bottom` | bottom | `open-guard-top` |
| `open-guard-top` | top | `open-guard-bottom` |
| `butterfly-guard-bottom` | bottom | `butterfly-guard-top` |
| `butterfly-guard-top` | top | `butterfly-guard-bottom` |
| `half-guard-bottom` | bottom | `half-guard-top` |
| `half-guard-top` | top | `half-guard-bottom` |
| `side-control-bottom` | bottom | `side-control-top` |
| `side-control-top` | top | `side-control-bottom` |
| `mount-bottom` | bottom | `mount-top` |
| `mount-top` | top | `mount-bottom` |
| `back-control-bottom` | bottom | `back-control-top` |
| `back-control-top` | top | `back-control-bottom` |
| `front-headlock-top` | top | `front-headlock-bottom`* |
| `leg-entanglement-top` | top | `leg-entanglement-bottom`* |

\* These two duals are declared so the mirrored edge has somewhere to land, which means `front-headlock-bottom` and `leg-entanglement-bottom` exist as positions with incoming edges and no outgoing techniques. That violates the invariant. **Resolve at PR 10 by one of:** adding a defensive technique from each (a front headlock escape, a leg lock escape), or setting `dual: null` on these two and accepting that being caught in them is outside v1 scope. The second is cheaper and defensible for a white-to-blue curriculum. Decide with the validator running.

Deferred to post-v1: `turtle-bottom` / `turtle-top`, which need their own outgoing techniques before they can exist without breaking the invariant.

### 3.2 v1 technique slots (32 + 6 = 38)

**Thirty-two slots come from the belt test above. Six more exist because the graph demanded them**, bolded in the table and justified beneath it. The split is worth being able to see: the 32 are the gym's requirement, and the 6 are this project's own claim that a curriculum you cannot traverse is not a curriculum.

Counts, not final names. The author writes and corrects every technique name and note; anything drafted by Claude Code is marked `TODO: review`.

| Group | Count | From → To |
|---|---|---|
| Takedowns | 3 | `standing` → top position |
| Guard pull / jump | 1 | `standing` → `closed-guard-bottom` |
| Closed guard submissions (at least one choke) | 2 | `closed-guard-bottom` → `finish` |
| Closed guard sweeps (one vs. kneeling, one vs. standing) | 2 | `closed-guard-bottom` → top position |
| Closed guard openings | 2 | `closed-guard-top` → `open-guard-top` |
| Guard passes (guard player must be busy) | 3 | `open-guard-top` → `side-control-top` |
| Open guard sweep | 1 | `open-guard-bottom` → top position |
| **Butterfly guard entry** | **1** | `open-guard-bottom` → `butterfly-guard-bottom` |
| Butterfly guard sweep | 1 | `butterfly-guard-bottom` → top position |
| **Half guard entry** | **1** | guard → `half-guard-bottom` |
| Half guard sweep | 1 | `half-guard-bottom` → top position |
| **Leg entanglement entry** | **1** | guard → `leg-entanglement-top` |
| Straight foot locks | 2 | `leg-entanglement-top` → `finish` |
| Side control submissions | 2 | `side-control-top` → `finish` |
| Side control escapes | 2 | `side-control-bottom` → guard or top |
| **Mount from side control** | **1** | `side-control-top` → `mount-top` |
| Mount submissions | 2 | `mount-top` → `finish` |
| Mount escapes | 2 | `mount-bottom` → guard or top |
| **Back take** | **1** | `side-control-top` or `mount-top` → `back-control-top` |
| Back submissions | 2 | `back-control-top` → `finish` |
| Back escapes | 2 | `back-control-bottom` → recovered position |
| **Front headlock submission (guillotine)** | **1** | `front-headlock-top` → `finish` |
| Wrist locks | 2 | `mount-top` and `side-control-top` → `finish` |

Six of these groups exist because the graph demanded them, and each is section 2.5 or 2.6 in action:

- **Mount escapes** — without them `mount-bottom` is a dead end, the exact failure the README uses as its headline example.
- **Leg entanglement entry** — without it `leg-entanglement-top` is unreachable.
- **A guillotine from `front-headlock-top`** — the ghost escape honestly lands in a front headlock, a position the first draft did not have. Adding a position without a technique leaving it creates a dead end, so it arrives with a submission. This also closed a real curriculum gap.
- **A back take** — `back-control-top` had two submissions and no entry. A white-to-blue list with no back take is a curriculum hole, not just a graph hole.
- **Mount from side control** — the curriculum had no top-side positional advancement at all.
- **Butterfly and half guard entries** — the dual rule does not reach positions nothing enters.

**"Guard player must be busy"** is the sheet's own qualifier on the three passes, and it constrains which three count: a pass that only works against a flat, inactive guard does not. That shapes the author's choices at PR 11 and changes nothing in the data model.

Wrist lock `from` positions are pinned to `mount-top` and `side-control-top` rather than left open, so neither hangs off an unreachable node.

Positions with room to grow — open guard, butterfly, half guard, leg entanglement — are intentionally thin. Adding a fourth butterfly sweep is one JSON entry and no code change.

### 3.3 The editability boundary

**The curriculum is read-only. The user owns their progress and their notes.**

- **Read-only curriculum** is the product, not a limitation. The value is that someone opinionated decided what a blue belt needs to know. A user-editable roadmap is a note-taking app with a graph view.
- It keeps validation at **build time**. `validateCurriculum`, `validateConnectivity`, and `findPrerequisiteCycle` run in CI against static JSON (PR 9 wires them in), so a broken graph cannot ship.
- **Per-technique user notes** capture most of what a user actually wants for one PR and zero algorithm changes.

User-authored techniques are the natural **v2** headline, with accounts and sharing. Section 4's rule that every function works on any set of techniques is what makes that a feature rather than a rewrite.

### 3.4 Video policy

- Store a YouTube **id**, never a full URL and never a rehosted file.
- `startSeconds` matters: most good demonstrations sit minutes inside a longer video.
- `channel` is displayed as attribution alongside a "watch on YouTube" link.
- `video` is optional and the no-video state is **designed**, so link rot degrades gracefully.
- A weekly scheduled GitHub Action checks each id against YouTube's oEmbed endpoint (no API key) and opens an issue on failure. **Caveat worth writing down: GitHub disables scheduled workflows after 60 days of repository inactivity**, which is exactly the state a finished portfolio repo is in — so treat the checker as best-effort, not a guarantee. oEmbed also catches deleted and private videos but not embedding-disabled ones, so test each link as a real embed once when adding it.
- Curating videos is slow human work and must not block code. Seed data ships with no videos; videos are an optional PR after the kill line.

## 4. Algorithms

All algorithms are pure TypeScript functions in `src/graph/`, with no graph library and no React imports. Each has unit tests.

**Input shape rule.** Learning-graph functions take `Technique[]`. Position-graph functions take `Curriculum`, because they need positions and duals. No function filters by belt internally — callers pass exactly the technique set they want, which is what makes multi-belt and (in v2) user-authored techniques free.

| Function | Purpose | Approach |
|---|---|---|
| `validateCurriculum(c)` | Every `from`, `to`, and prerequisite id exists; no duplicate ids; every field well-shaped against a schema | Set lookups + schema |
| `buildAdjacency(c)` | Adjacency lists for both graphs, **including derived dual edges** (section 2.6) | Map building + mirroring |
| `validateConnectivity(c)` | Every position reachable from `standing`; every position but `finish` has an outgoing technique | BFS from `standing` |
| `findPrerequisiteCycle(techniques)` | A cycle path if the learning graph has one, else `null` | DFS with recursion-stack coloring |
| `roadmapLayers(techniques)` | A row per technique, every prerequisite above what depends on it. **Also yields the topological order**, so `learningOrder` is a thin derivation of this rather than its own algorithm | Longest-path layering; throws on cycle |
| `learnNext(techniques, progress, minLevel = 2)` | Unlearned techniques whose prerequisites are all at or above `minLevel` | Frontier filter |
| `gapAnalysis(c, progress, minLevel = 2)` | Per position: known counts by category, warnings, dead ends | Counting over adjacency |
| `shortestPathToFinish(start, c, progress, minLevel = 2)` | Shortest sequence of known techniques to `finish`, or `null` | BFS over progress-filtered edges |
| `canReachFinish(c, progress, minLevel = 2)` | Which positions can reach a submission *at all* with what you know | BFS on the **transposed** graph from `finish` |
| `positionComponents(c, progress, minLevel = 2)` | Strongly connected components of the known position graph | Tarjan (or Kosaraju) |

The last two are the strongest algorithms in the project and they exist because the domain asks for them. `canReachFinish` answers "is there any submission I can get to from here", which is a far better gap signal than counting categories. And **a strongly connected component is literally "positions you can cycle among"** — so any position outside the component containing a route to `finish` is a structural hole in your game. That is the insight no competing app has.

Four functions on this list are loops, not algorithms: `validateCurriculum`, `buildAdjacency`, `learnNext`, `gapAnalysis`. They are paired into two PRs rather than getting four PRs of ceremony. The genuinely distinct ideas are BFS, transposed BFS, DFS with colors, longest-path layering, and Tarjan — five.

Queued, conditional: `reduceCrossings(layers)` — barycenter ordering within each roadmap layer, built only if the rendered roadmap needs it, judged from a screenshot after PR 39.

Post-v1: weight edges by success rate from roll logs and use Dijkstra.

### 4.1 Required test cases (minimum)
- Valid curriculum passes; missing ids, duplicate ids, and malformed fields all fail.
- **Dual derivation:** a pass produces the mirrored bottom-side edge; a submission produces none; a `dual: null` position produces none.
- Connectivity flags an unreachable position and a non-`finish` position with no outgoing technique; passes on a well-formed curriculum; does not flag `finish`.
- Cycle detection finds a 2-node and a 3-node cycle and returns `null` on a DAG.
- `roadmapLayers` puts prerequisite-free techniques on layer 0, places every technique below all prerequisites including uneven chains, and throws on a cycle.
- `learnNext` excludes learned techniques and unmet prerequisites; includes prerequisite-free techniques.
- `gapAnalysis` reports zero escapes for a position with only attacks known; reports dead ends.
- `shortestPathToFinish` returns the shortest path, ignores techniques below `minLevel`, returns an empty path from `finish`, and `null` when unreachable.
- `canReachFinish` returns nothing on empty progress, and grows correctly as progress is added.
- `positionComponents` finds a known 2-position cycle as one component and isolated positions as singletons.

### 4.2 Property-based tests

Using [fast-check](https://fast-check.dev/):

- For any random DAG, every edge `a -> b` has `a` before `b` in the topological order from `roadmapLayers`.
- For any random DAG, every technique's layer exceeds every prerequisite's layer.
- For any random graph containing a cycle, `findPrerequisiteCycle` returns a path that is genuinely a cycle in that graph.

**Scope warning:** writing a good random-DAG arbitrary is harder than the algorithms it tests and can eat a whole session. If it stalls, drop to a fixed table of hand-built graphs and move on. The property tests are a bonus, not a gate.

## 5. MVP features

1. **Roadmap view:** the learning graph laid out top to bottom using `roadmapLayers`. See section 6 for how rows and position grouping relate — they are not two axes.
2. **Position map view:** the position graph with pan and zoom. Nodes colored by perspective; technique edges colored by progress level; dual edges rendered more faintly than authored ones.
3. **Technique drawer:** notes, category, prerequisites, same-`family` variants, embedded video with attribution, the user's own note, and a progress selector.
4. **Learn next panel:** `learnNext`, ordered by `roadmapLayers`, highlighted on the roadmap.
5. **Gaps panel:** `gapAnalysis`, `canReachFinish`, and `positionComponents` together — "you have nothing from here", "you cannot reach a submission from here", "these positions are cut off from your game".
6. **Path finder:** pick a start, highlight the shortest known path to a finish. A supporting detail, not a headline.
7. **User notes:** free text per technique. The one place a user writes into the app.
8. **Persistence:** `UserData` in localStorage, with export and import as JSON.
9. **Sample progress:** a one-click canned profile a first-time visitor can apply and clear, so the differentiator does not open in its degenerate state (section 5.1).
10. **Responsive:** a designed mobile layout. **Desktop-first, explicitly** — see the sync limitation in 5.1.

The belt filter UI is not in v1 (only one belt exists), but nothing in the UI should hardcode "white belt".

### Non-goals for MVP

Accounts, a backend, roll logging, belts beyond white-to-blue, coach or gym features, a native app, and cross-device sync. Also explicitly out: **the user cannot add, edit, or remove techniques or positions** (section 3.3).

### 5.1 Known limitations, stated rather than implied

**Broad coverage weakens two features.** With two techniques per position, `gapAnalysis` reports gaps in the *curriculum* as much as in the user's game, and `shortestPathToFinish` mostly finds one- and two-move paths. Both improve for free as content grows. Do not oversell either in the README.

**The empty state is the degenerate state.** All progress starts at 0, so on a fresh browser the gaps panel flags all seventeen positions, `canReachFinish` returns nothing, and the path finder returns `null` everywhere. Since the position map ships before the roadmap is polished, this is the *first* thing a reviewer sees. Feature 9 exists for exactly this reason, and `gapAnalysis` needs a distinct "you have not marked anything yet" state rather than an all-red report, which is alarming rather than informative.

**There is no sync, so "at the gym" has a real limit.** localStorage is per-origin *per device*. A phone opening the app has zero progress, and the only bridge is exporting on desktop and importing through a mobile file picker — which is friction exactly where you would want to mark "hits it live". v1 is **desktop-first with a designed mobile layout**, not a synced companion app. URL-encoded state or a QR handoff would fix it and is deferred to v2. Do not let the README imply sync that does not exist.

### 5.2 Runtime robustness

No backend, no network calls, no async work, so almost every classic failure mode is absent. Five remain, each with a named handler:

| Failure | Trigger | Handling | User sees |
|---|---|---|---|
| Curriculum data error at runtime | `roadmapLayers` throws on a cycle in JSON that bypassed CI | Error boundary | A designed error state naming the problem, never a blank page |
| `localStorage` unavailable | Safari private mode, or a browser blocking site data — the accessor itself throws | Every read and write in try/catch | The app runs with progress unsaved, and says so once |
| `localStorage` write rejected | Quota exceeded | Caught on write | A message that progress could not be saved, with a prompt to export |
| Imported file is bad | Malformed JSON, unknown ids, wrong `schemaVersion` | Schema-validated before touching state; rejected loudly | A specific reason, and existing data untouched |
| Saved id no longer exists | A position split changed a technique's `from`, or a technique was removed | Reconciled on load | A one-time note that N entries were parked, with nothing lost |

Rules that follow:

- **The error boundary ships before the first deploy** (PR 14), not as end-of-project polish. A reviewer meeting a white screen is the worst outcome this project has.
- **Notes render as text, never as HTML.** No `dangerouslySetInnerHTML` anywhere. Imported JSON is the only untrusted input path, and this is what stops it being a stored-XSS vector.
- **Import validates against the current curriculum.** Unknown ids are reported, not silently dropped.
- **Reconcile on load; never migrate on a version number.** Every load compares saved keys against the live curriculum. Unknown ids move to `orphaned` and stay there. This is strictly better than version-gated migration: adding techniques is purely additive and should never mark a user's data stale, and the real hazard is a position split (section 2.4), which no curriculum version number predicts. `schemaVersion` therefore tracks only the shape of `UserData` itself.
- **A single JSON schema serves both** the project's own data files (PR 8, run in CI at PR 9) and user imports (PR 26). `resolveJsonModule` plus an `as Curriculum` cast is an unchecked assertion — a typo'd `category` or a missing `notes` would pass typecheck, tests, and coverage.

## 6. Design and UI

The app should look like a polished product, not a class project.

### Direction
- Clean and calm, closer to Linear or roadmap.sh than a busy dashboard.
- Dark and light mode from day one, following the system setting with a manual toggle.
- **The graph is the hero — whichever graph the user is looking at.** Chrome stays minimal so the canvas gets the space. The position map is the differentiated view and gets equal design investment to the roadmap, not leftovers.
- Belt colors are the brand accent, used for section markers and progress, not splashed everywhere.

### The roadmap's y-axis
Feature 1 must not claim two axes. **Layering is global: a technique's row is its prerequisite depth across the whole curriculum, and position grouping is visual only** — color bands and labels, not a second vertical ordering. With two techniques per position, per-section layering would be trivially degenerate.

**Fallback, triggered by the section 2.2 check.** If the hand-authored prerequisite graph turns out to have fewer than about 15 edges or a maximum depth of 2, the layered y-axis is not carrying information. In that case the roadmap's rows become belt then position section, `roadmapLayers` stays as an algorithm exercise with tests, and it stops being the layout engine. Decide this before PR 12, not after.

### System
- **Tailwind CSS** with design tokens (colors, spacing, radius, font sizes) as CSS variables defined once.
- **shadcn/ui** for accessible primitives, copied into the repo. Added at PR 30, when the shell and drawer need them.
- **React Flow is installed at PR 13** and owns node rendering in both views from the start. It is not added later for edges — that would rewrite the hero view. PR 13 will run close to the size target because React Flow brings node measurement and positioning with it; split it if it exceeds.
- **One typeface** (Inter or Geist) with a clear size scale.
- **Progress colors:** 4 levels paired with an icon or fill style, not color alone.

### Mobile
**Below the `md` breakpoint the roadmap is a grouped vertical list, not a pannable canvas** — same node component, same drawer, ordered by layer. Pinch-zooming a graph on a phone is technically possible and genuinely bad. The position map stays a canvas, since its whole point is spatial, with larger touch targets and a fit-to-view control.

### Quality bar
- No layout shift, no unstyled flashes, smooth pan and zoom.
- Keyboard navigable: tab through nodes, Enter opens the drawer, Escape closes it. **Built with the drawer at PR 32, not retrofitted** — focus traps and focus restoration retrofit badly.
- Empty states and loading states are designed, not default. The empty state is a first-class case here (section 5.1), not an afterthought.
- Every UI PR includes a screenshot in the description, light and dark.

## 7. Stack

- Vite + React + TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- React Flow for both views (rendering only; no algorithms from the library)
- Vitest for unit tests, fast-check for property tests, Playwright for end-to-end tests
- GitHub Actions: typecheck, lint, unit tests, **curriculum data validation** (PR 9), coverage (PR 24), and e2e (PR 42) — each added by the PR that introduces it, never promised before it exists
- Deploy to Vercel, with a preview deployment on every PR

## 8. Repo structure

```
src/
  data/
    positions.json
    white.json
    schema.ts        # one schema, used for project data and user imports
  graph/             # pure algorithms + tests (author-written)
    types.ts
    validate.ts
    adjacency.ts     # includes dual derivation
    connectivity.ts
    cycles.ts
    layers.ts
    frontier.ts      # learnNext + gapAnalysis
    paths.ts         # shortestPathToFinish + canReachFinish
    components.ts    # Tarjan
    *.test.ts
  state/             # persistence + reconciliation
  components/
    ui/              # shadcn primitives
    roadmap/
    position-map/
  styles/
  App.tsx
e2e/
docs/
  adr/            # one per decision, written in the PR that makes it
.github/
  workflows/
  ISSUE_TEMPLATE/
  pull_request_template.md
  dependabot.yml
CHANGELOG.md
PROJECT_SPEC.md
README.md
```

## 9. Git workflow

The commit and PR history is part of the portfolio. It should read like a professional team's history because the work is genuinely done in small, reviewed steps. Never backdate commits or batch-generate history.

### Branches and merging
- `main` is always deployable. Branch protection on: CI must pass before merge.
- One branch per PR, named `type/short-description`.
- **Squash and merge** so `main` has one clean commit per PR.
- Delete the branch after merge.

### Issues and planning
- Every PR in section 10 starts as a GitHub Issue with acceptance criteria. The PR body says `Closes #<issue>`.
- Issues live on a Project board: Backlog, In progress, In review, Done.
- Label by area: `graph`, `ui`, `data`, `infra`, `docs`.

### Decisions
- Significant choices get an ADR in `docs/adr/`, numbered. Context, decision, alternatives, consequences. Under a page.
- **Write each ADR in the PR that makes the choice, not up front.** An ADR written twenty PRs before its code is speculation and a reviewer can tell. PR 5 carries only the two decisions already exercised — the two-graph model and technique identity as (move + position), now joined by dual derivation. React Flow, localStorage, and no-backend get their ADRs at PRs 13, 25, and 25.

### Releases
- Semantic versioning. **Tag `v0.1.0` at PR 44** — both views working, progress persisted, deployed, e2e green. That is the kill line (section 10).
- `v1.0.0` after whatever of Milestone 8 actually gets done.
- Each release gets GitHub release notes. Keep a `CHANGELOG.md`.

### Automation
- Pre-commit hook (Husky + lint-staged) runs Prettier and ESLint on staged files.
- Dependabot opens weekly dependency update PRs.
- CI enforces at least 90% coverage on `src/graph/`. **Note what this does not buy:** coverage on pure functions is easy and will not catch the real risk, which is wrong data. That is what PR 9's validation is for.

### Commits
- [Conventional Commits](https://www.conventionalcommits.org/): `feat`, `fix`, `test`, `refactor`, `chore`, `ci`, `docs`, `style`, with an optional scope.
- Imperative mood, under 72 characters.
- Each commit builds and passes tests. Typical algorithm PR: `test(graph): ...` first, then `feat(graph): ...`.

### PR size and scope
- **One concern per PR.** Setting up the toolchain counts as one concern; three separate config PRs for it reads as padding.
- Target under about 300 changed lines, excluding lockfiles, generated shadcn components, and curriculum JSON.
- **Curriculum JSON is excluded from the line target, which means nothing caps it.** PR 11 is 38 objects with notes and prerequisites — 10 to 15 hours of writing. Split it by position cluster if it grows past a sitting, and ship every note as `TODO: review` so prose never gates the data.
- No drive-by refactors.
- Every PR description uses this template:

```md
## What
One or two sentences.

## Why
The problem this solves or the milestone it advances.

## How to test
Commands or steps.

## Screenshots
UI PRs only: light and dark.

## What I learned
Concepts I had to understand to build this.
```

## 10. PR plan

Each line is one PR. Order matters.

**Two ordering principles.** First, ship the differentiator early: a white-to-blue curriculum list is a commodity, a position graph that finds structural holes is not. Second, never ship a view before the data it needs exists — `gapAnalysis` and progress-colored edges are meaningless without saved progress, so Milestone 4 precedes the position map, and the shell and drawer precede it too so that clicking the map does something.

**PR 0: Documentation** — numbered 0 so nothing below shifts.
0. `docs: add project spec and working agreement`

Commits the spec, the working agreement, and a refreshed README. Lands before the toolchain so that anyone landing on the repo can see what it is before there is anything to run.

**Milestone 1: Toolchain** (4 PRs)
1. `chore: scaffold Vite + React + TypeScript (strict)`
2. `chore: add ESLint, Prettier, Husky, and lint-staged`
3. `ci: run typecheck, lint, and Vitest on GitHub Actions`
4. `chore: add issue and PR templates, Dependabot, and an ADR template`

**Milestone 2: Vertical slice to a live roadmap** (11 PRs)
5. `docs: add ADRs for the two-graph model, technique identity, and dual edges`
6. `style: add Tailwind with design tokens and dark mode`
7. `feat(graph): add domain types`
8. `feat(graph): validate curriculum ids, references, and shape`
9. `ci: validate curriculum data on every PR`
10. `feat(data): add shared positions with duals`
11. `feat(data): seed the v1 technique set`
12. `feat(graph): compute roadmap layers from prerequisites`
13. `feat(ui): render the roadmap with React Flow custom nodes`
14. `feat(ui): add an error boundary and designed empty states`
15. `chore: deploy to Vercel with a preview on every PR`

Validation lands before the data, and in CI before the data, so bad ids and bad shapes fail loudly while the curriculum is being written. **Before PR 7, do the paper exercise in section 2.2**; before PR 12, settle the y-axis per section 6.

**Milestone 3: Graph algorithms** (tests commit first, then the author's implementation)
16. `feat(graph): build adjacency lists and derive dual edges`
17. `feat(graph): validate position graph connectivity with BFS`
18. `feat(graph): detect prerequisite cycles with DFS`
19. `feat(graph): compute the learn-next frontier and gap counts`
20. `feat(graph): find the shortest known path to finish with BFS`
21. `feat(graph): find which positions can reach a finish at all`
22. `feat(graph): find strongly connected components of the position graph`
23. `test(graph): add property-based tests with fast-check`
24. `ci: enforce 90% coverage on src/graph`

**Milestone 4: Progress foundation** (5 PRs)
25. `feat(state): persist user data in localStorage with guarded access`
26. `feat(state): export and import user data with schema validation`
27. `feat(state): reconcile saved data against the live curriculum on load`
28. `feat(ui): add a progress selector and color the roadmap by progress`
29. `feat(state): add a per-technique user note`

Export/import sits immediately behind persistence rather than twenty PRs later: localStorage is the only copy of a user's data, and a cleared browser with no export is unrecoverable.

**Milestone 5: Shell, drawer, and keyboard** (3 PRs)
30. `chore: add shadcn/ui primitives and the base layout shell`
31. `feat(ui): add the technique drawer with notes, family, and video slot`
32. `feat(ui): add keyboard navigation and focus management`

These come before the position map so that clicking a node on the differentiator opens something, and the gaps and path panels have a layout to live in.

**Milestone 6: Position map — the differentiator** (6 PRs)
33. `feat(ui): render the position graph with React Flow`
34. `feat(ui): color by perspective and progress, add a legend`
35. `feat(ui): add the gaps panel with reachability and components`
36. `feat(ui): add the path finder with graph highlighting`
37. `feat(ui): add the view switcher between roadmap and position map`
38. `feat(ui): add sample progress so a first visit is not all red`

**Milestone 7: Roadmap complete, then release** (6 PRs)
39. `feat(ui): draw prerequisite edges and position section bands`
40. `feat(ui): add the learn-next panel with roadmap highlighting`
41. `feat(ui): render the roadmap as a grouped list on mobile`
42. `ci: add Playwright to the workflow`
43. `test(e2e): cover roadmap, progress, and position map flows`
44. `chore: tag v0.1.0 with changelog`

### The kill line: PR 44

**PR 44 is the definition of done.** At that point both views work, progress persists and survives a reload, the app is deployed with a live URL, and end-to-end tests pass. Everything after it is enhancement.

Milestone 8 is **explicitly optional**. If PR 44 is not merged by **31 January 2027**, cut Milestone 8 entirely, write the README against what exists, and tag `v1.0.0`. A finished small thing on your GitHub beats an abandoned large one, and the failure mode this line exists to prevent is stalling at 70% with nothing tagged.

**Milestone 8: Optional — content depth and polish** (8 PRs)
45. `feat(data): add curated videos with channel attribution`
46. `ci: check curated video links on a weekly schedule`
47. `feat(graph): reduce roadmap edge crossings with the barycenter heuristic` — only if the render needs it, judged after PR 39
48. `feat(data): deepen open guard, butterfly guard, and half guard`
49. `feat(data): expand closed guard, mount, side control, and back`
50. `chore: add accessibility and Lighthouse checks to CI` — budget this as real work; React Flow canvases routinely trip axe on nested interactive elements and handle contrast
51. `docs: write the README with screenshots, live link, favicon, and OG image`
52. `chore: tag v1.0.0 with changelog`

### Stall provision

The comprehension gate can block a PR but must never block the project. If the author cannot get comfortable with an algorithm after two sessions, Claude Code simplifies the implementation rather than stalling — a clear O(n²) beats an opaque O(n) at this scale, where n is 38 — and records the tradeoff in an ADR.

`positionComponents` is the likeliest candidate. If Tarjan's single-pass lowlink bookkeeping will not stick, use **Kosaraju** instead: two ordinary depth-first passes, one on the graph and one on its transpose. Slower in theory, far easier to hold in your head, and the transpose pass is already built for `canReachFinish`.

### Open question, deliberately unresolved

**Which view loads by default.** Section 5 lists the roadmap first; the position map is the differentiated view and ships earlier. Revisit at PR 37, when the view switcher makes both visible side by side.

### Deferred to v2

Accounts and a backend, user-authored techniques, sharing a curriculum with a gym, roll logging, weighted paths via Dijkstra, and cross-device sync (URL-encoded state or a QR handoff).

**An advanced blue belt curriculum.** The 32 slots in section 3 are the belt test's *minimum* — what the gym requires to promote someone, not the ceiling of what a blue belt knows. A deeper second set is the natural content expansion, and because section 3.3 keeps the curriculum read-only and section 4 requires every function to work on any set of techniques, it is new JSON and no new code.

Target pace: a few PRs per week. Steady cadence matters more than speed.

## 11. Working agreement for Claude Code

The author is using this project to learn, and must understand every line before it merges.

### Scope
- Work on **one PR from section 10 at a time.** Do not start the next without being asked.
- Stay inside the PR's scope. Mention anything else as a suggested future PR.
- If a PR would exceed the size target, stop and propose a split.

### Who writes what

`CLAUDE.md` is authoritative on this; the summary here exists so the spec is readable on its own.

- **Claude Code writes the code** — scaffolding, config, CI, UI, styling, and the `src/graph/` algorithms and their tests.
- **The author owns every decision**, approves at each checkpoint, and writes the "What I learned" line in each PR description themselves.
- **The comprehension gate is blocking.** For any PR touching `src/graph/`, the author must re-explain the algorithm without looking at the code — what it does, why it terminates, its worst case — before the PR is committed. A clever implementation that fails this gate is the wrong implementation for this repo.
- **The author authors the curriculum content.** Technique names, notes, prerequisites, and `from`/`to` routing require real mat knowledge, and section 11 forbids Claude Code from inventing technique details as fact. Drafts are marked `TODO: review` and the author corrects them.
- **Git and GitHub mechanics:** Claude Code creates issues, branches, commits, pushes, and PRs, showing every command with a one-line explanation. **It never merges, force-pushes, or commits to main.**
- **ADRs are written in the PR that makes the decision.** A later reversal gets a superseding ADR, never an edit to the original. A documented reversal is a feature of this history.
- **Commit hygiene is part of the deliverable.** One concern per PR, conventional commits with real scopes, and commits inside a PR that show the build-up — tests, then implementation, then any fix — rather than one flattened commit.

### Teaching
- **Before writing code:** explain the plan, which files change, and any unfamiliar concept, with a link to official docs. Wait for a go-ahead.
- **After writing code:** walk through the diff file by file.
- End each PR with two questions that check understanding, and a suggested "What I learned" line.
- Prefer the simpler solution the author can explain over the clever one.

### Code
- TypeScript strict mode; no `any` without a comment explaining why.
- Keep algorithm code free of React and library dependencies.
- Use design tokens, never hardcoded colors or spacing.
- Do not invent technique details as fact. Draft placeholder notes marked `TODO: review`.
- Never download or rehost video. Store a YouTube id (section 3.4).
- Never add a UI affordance for editing the curriculum (section 3.3).
- Never use `dangerouslySetInnerHTML`. All notes are plain text (section 5.2).
- Wrap every `localStorage` access in try/catch. The accessor itself throws in some browsers, not just the write.

### Review checkpoints
- `/plan-ceo-review` ran on 2026-09-25 in HOLD SCOPE mode. It found that the roadmap view is a commodity across released BJJ apps while the position graph and gap analysis are differentiated, which is why section 10 ships the position map before the roadmap is polished. Its outside-voice pass then found that the position graph was disconnected as specified, which produced section 2.6.
- Run `/plan-eng-review` before Milestone 6, when the UI architecture decisions go live (React Flow node structure, where progress state lives, how both views share data and selection).

## 12. README outline (for PR 51)

1. One-line description + live link + screenshot/GIF
2. Why: the two-graph model, and what the position map adds over a plain roadmap
3. Algorithms used and what question each answers — lead with components and reachability
4. Tech stack
5. Running locally and running tests
6. Honest limitations (section 5.1): no sync, desktop-first, curriculum breadth over depth
7. Roadmap: more belts, roll logging, weighted paths, gym curricula
