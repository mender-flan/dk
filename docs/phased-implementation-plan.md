# DK engine — phased implementation plan

This document turns the architecture in `docs/game-engine-design.md` into an incremental build plan. Each phase should result in a playable, debuggable CLI build, even if the content is still minimal.

Acceptance criteria are split into:

- **Functional**: player-visible behavior and engine API behavior.
- **Non-functional**: determinism, safety, performance bounds, and debuggability.

## Cross-cutting requirements (apply to every phase)

These criteria are intentionally repeated here so they don’t get lost between phases.

**Functional**

- The game loop remains usable from the CLI (`npm run dev`) at the end of each phase.
- Engine logic remains behind an engine API surface (the CLI should not mutate engine internals directly).

**Non-functional**

- `npm run build` and `npm run typecheck` pass (`typecheck` is defined in `package.json` as `tsc -p tsconfig.json --noEmit`).
- **Determinism**: for the same seed and the same input sequence, the world state and emitted events are identical (including event ordering).
- **No hidden randomness**: engine code does not call `Math.random()` (all randomness must be derived from a seeded RNG).
- **Rejections are not exceptions**: expected failures (parse/resolve/rules rejections) do not throw; they return a structured rejection and leave engine state unchanged.
- **Layer separation** is maintained:
  - generation builds initial state
  - simulation/rules transform state and emit structured events
  - narration turns events/state into human-readable text

## Phase 0 — repo baseline (already done)

**Goal**: establish a stable CLI and TypeScript build baseline.

**Deliverables**

- Bootstrap CLI loop in `src/index.ts`.
- Minimal command handling in `src/commands.ts`.

**Acceptance criteria**

**Functional**

- Running `npm run dev` starts an interactive prompt.
- `help`, `quit`, `exit` behave as expected.

**Non-functional**

- `npm run build` passes.
- `npm run typecheck` passes.

## Phase 1 — engine skeleton + core world + movement

**Goal**: introduce the engine module boundary and implement a tiny deterministic world with `look` and `go`.

**Deliverables**

- `src/engine/` module skeleton (state, rng, generation pipeline, rule engine boundary, narration boundary).
- A minimal `createEngine()` implementation that:
  - constructs initial world state from a seed
  - supports `step(input)`
  - supports `getView()`
- CLI wired to the engine (CLI reads input; engine decides output).

**Acceptance criteria**

**Functional**

- `createEngine({ seed })` produces a world with at least:
  - one start location
  - at least one additional connected location
  - at least one exit the player can traverse
- `step('look')` returns room description and does not advance the turn.
- `step('go <direction>')` moves the player if an exit exists; otherwise it produces a rule rejection and does not advance the turn.
- `getView()` returns a stable, minimal player view (turn, location, visible entities).

**Non-functional**

- Seed is visible in the CLI banner (or in a debug-printable place) so a run can be reproduced.
- The `go` behavior is deterministic when multiple exits or matches exist (no “pick a random one”).
- The engine does not throw for invalid commands like `go` without a direction.

## Phase 2 — entities + inventory + containment invariants

**Goal**: add portable items and inventory management while keeping containment rules consistent.

**Deliverables**

- Entity kinds expanded to include at least: `item`, `container` (if containers are included in this phase).
- Rule support for `take`, `drop`, and `inventory`.
- Helpers to update containment (room vs container) in one place (so invariants can be asserted).

**Acceptance criteria**

**Functional**

- The generator places at least one takeable item in the start area.
- `step('take <item>')` moves the item to player inventory and emits a structured event.
- `step('drop <item>')` moves the item from inventory to the current room.
- `step('inventory')` lists carried items.
- If containers are introduced in this phase: moving items into/out of a container works and is reflected in `getView()`.

**Non-functional**

- Containment invariants hold after every action (no entity can be both in inventory and also in a container list, etc.).
- Rejected actions (taking a missing item, dropping an item you don’t have) do not change state.

## Phase 3 — gating template (door + key) + reachability validation

**Goal**: implement a small but “real” solvable gate: a locked door and a key placed in a reachable location, plus a validation step that proves reachability.

**Deliverables**

- Entity kind(s) for `door` and a lockable capability.
- A rule for `use <key> on <door>` (or equivalent) that unlocks the door.
- Generation places:
  - a locked door gating a location
  - a key reachable before the door
- Validation that asserts:
  - the world graph is connected from the start
  - the key is reachable from the start without passing through the locked door

**Acceptance criteria**

**Functional**

- The player can reach the gated area in a fresh game without any debug commands.
- If the player attempts to pass through the locked door before unlocking it, the action is rejected with an explanation.
- Unlocking the door changes subsequent behavior (movement is allowed).

**Non-functional**

- Validation failures include the seed and enough identifiers (location IDs, challenge IDs if present) to reproduce the failure.
- The generator does not enter an unbounded regeneration loop; validation has a bounded retry strategy.

## Phase 4 — multi-step challenge graph + redundant clues

**Goal**: move from a single gate to a small, structured challenge DAG with redundant clues, and make clue presence testable via structured events.

**Deliverables**

- A representation for challenges and prerequisites (a small DAG of 3–4 nodes is enough).
- At least one “alternative path” (two different ways to satisfy a prerequisite).
- Clues are represented structurally (for example via flags or explicit hint events), not only in prose.
- Narration renders:
  - rejections
  - movement + room descriptions
  - at least one clue/hint event

**Acceptance criteria**

**Functional**

- In a fresh game, a player can complete the challenge chain to reach a clear “milestone” outcome (reach a final room, retrieve an item, etc.).
- At least one prerequisite has two solutions and both are viable.
- For each critical prerequisite, there are at least two independent clue sources.

**Non-functional**

- “Critical” entities (keys, unique tools) cannot be permanently lost in a way that makes the game unwinnable.
- Clue delivery can be asserted without depending on exact narration text (for example, by checking emitted hint/clue events).

## Phase 5 — NPC + talk + deterministic dialogue

**Goal**: add at least one NPC with deterministic dialogue and memory, using rules/events rather than embedding dialogue logic into the CLI.

**Deliverables**

- Entity kind `npc` with a minimal “mind” (traits, voice, goals, memory).
- A `talk` action (or `ask <npc> about <topic>`) that:
  - resolves an NPC in the room
  - emits a structured “spoke” event
  - can set flags or reveal a clue
- Narration that renders NPC voice consistently.

**Acceptance criteria**

**Functional**

- The generator places at least one NPC the player can meet.
- Talking to the NPC produces output that is consistent across runs with the same seed.
- The NPC can provide at least one actionable clue that ties into the challenge graph.

**Non-functional**

- NPC behavior does not introduce nondeterminism (no “pick a random line” without seeded choice).
- NPC memory updates are stable and driven only by game turns/events.

## Phase 6 — storylets + advanced validation (bounded solver) + regeneration

**Goal**: introduce storylets for micro-narrative reactivity, and add a bounded solver-based validation loop that can reject/regenerate bad worlds without rewriting core runtime rules.

**Deliverables**

- A storylet system with:
  - preconditions
  - effects
  - deterministic bindings to entities/locations
- A bounded solver used during generation-time validation that:
  - enumerates candidate actions via the rule registry
  - validates at least one win condition is reachable
- A regeneration strategy that retries the smallest failing layer (rebinding challenges before regenerating the whole world).

**Acceptance criteria**

**Functional**

- At least 2 storylets can trigger across normal play and visibly affect the world (flags, moved entities, unlocking a route, etc.).
- A world that fails solvability validation is regenerated or downgraded to a guaranteed-solvable template set.

**Non-functional**

- Solver bounds are explicit (maximum depth and expansion budget) and cannot hang the process.
- Solver and runtime share the same rule logic (`canApply`/`apply`) to prevent divergence.

## Phase 7 — save/load + debug commands + “playtest loop” polish

**Goal**: make the game state persistable and make procedural debugging fast.

**Deliverables**

- Snapshot save/load using the `SaveFile` / `WorldSnapshot` JSON shapes from the design doc.
- CLI commands for:
  - `save <path>` and `load <path>` (or equivalent)
  - a debug-only command set gated by an env var (seed display, flags dump, teleport)

**Acceptance criteria**

**Functional**

- A save file can be written and loaded, and the loaded game continues from the same world state.
- `EntityId` values are stable across save/load.
- Save files include `saveFormatVersion` and `seed`.

**Non-functional**

- Derived indexes are rebuilt on load (they are not required to be stored in the snapshot).
- Save/load fails with a clear error message for malformed JSON or unsupported `saveFormatVersion` (and does not corrupt the current in-memory game).
