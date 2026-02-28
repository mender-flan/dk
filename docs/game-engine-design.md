# DK procedural text adventure — game engine design

## Context

DK is a turn-based, command-line text adventure (Zork-like) where the world, characters, and challenges are procedurally generated. The core requirement is that content is *coherent* and challenges are *solvable* while still producing variety and surprise.

This document proposes an engine architecture that:

- Generates a world from a seed (deterministic, debuggable).
- Produces memorable NPCs with consistent behavior and voice.
- Creates solvable challenges by construction and validation.
- Runs a simple action loop: parse a player command → apply rules → narrate results.

## Goals

- **Procedural generation with constraints.** Variety without incoherence.
- **Solvable challenges.** No unwinnable states from initial generation.
- **Strong “fiction layer.”** The game should *read* like a story, even when generated.
- **Determinism.** A seed reproduces the same world and progression.
- **Simple engine core.** Prefer clear rules and data over complex frameworks.

## Non-goals (for the initial engine)

- Real-time systems.
- Graphics.
- Multiplayer.
- Infinite simulation. Generation is finite; play is open-ended within that world.

## Key concepts

- **World**: A graph of locations connected by exits.
- **Entity**: A thing in the world (player, NPC, item, room, door).
- **State**: The current facts about entities and the narrative.
- **Action**: The player’s intent (parsed command) plus the resolved target(s).
- **Rule**: A pure(ish) function that checks and applies an action to state.
- **Storylet**: A small, reusable narrative beat with preconditions and effects.
- **Challenge**: A goal with prerequisites and a satisfying outcome.

## High-level architecture

The engine is split into three layers:

1. **Generation**: Build `WorldState` from a seed.
2. **Simulation**: Apply actions and events to `WorldState`.
3. **Narration**: Convert state changes into player-facing text.

```text
           +---------------------+
seed ----> |  Generation Pipeline| ----> WorldState (initial)
           +----------+----------+
                      |
                      v
          +-----------+-----------+
input --> |  Parser + Resolver    | --> Action (typed)
          +-----------+-----------+
                      |
                      v
          +-----------+-----------+
          |  Rule Engine          | --> StateDelta + Events
          +-----------+-----------+
                      |
                      v
          +-----------+-----------+
          |  Narrator              | --> Text output
          +------------------------+
```

## Proposed module layout

The current repo contains a bootstrap CLI loop in `src/index.ts` and a minimal command handler in `src/commands.ts`. As we add the engine, the code can evolve toward:

```text
src/
  engine/
    api.ts              # Engine surface area used by the CLI
    state.ts            # WorldState, entities, indexes
    rng.ts              # Seeded RNG utilities
    generate/
      pipeline.ts       # Generate from seed
      world-graph.ts    # Locations/exits
      characters.ts     # NPCs
      challenges.ts     # Puzzle/challenge graph
      validate.ts       # Solvability + invariants
    rules/
      rule-engine.ts    # Applies actions; produces deltas + events
      builtins.ts       # look, go, take, talk, use, etc.
    narration/
      narrator.ts       # Text output from deltas/events
      grammar.ts        # Re-usable text patterns
  cli/
    parse.ts            # Parse raw input into a structured command
    resolve.ts          # Map nouns to entities, disambiguate
```

This is intentionally not prescriptive about exact filenames; the important point is separating generation, simulation, and narration.

## Engine API surface

The CLI should not know engine internals. It should be able to:

- create a new game from a seed
- accept player input
- receive output text + updated state

An initial API shape:

```ts
export type Seed = string;

export interface EngineConfig {
  seed: Seed;
  playerName?: string;
}

export interface PlayerView {
  turn: number;
  locationId: EntityId;
  locationName: string;
  visibleEntityIds: EntityId[];
  inventoryEntityIds: EntityId[];
  goals: Array<{ id: string; summary: string }>;
}

export interface StepResult {
  output: string;
  didAdvanceTurn: boolean;
  events: Event[];
}

export interface GameEngine {
  describeCurrentLocation(): string;
  getView(): PlayerView;
  step(input: string): StepResult;
  save(): string;
}

export function createEngine(config: EngineConfig): GameEngine;
```

`save()` returns a JSON string containing `seed` + the minimal delta from initial state (or a full state snapshot for simplicity at first).

## Data model

The engine should be data-driven, but it doesn’t need a full ECS. A practical approach:

- An `Entity` has an `id`, a `kind`, a `name`, and a bag of typed attributes.
- `WorldState` keeps indexes to speed up common queries (location contents, exits, inventory).

```ts
export type EntityId = string;
export type EntityKind =
  | 'player'
  | 'location'
  | 'npc'
  | 'item'
  | 'door'
  | 'container'
  | 'prop';

export interface EntityBase {
  id: EntityId;
  kind: EntityKind;
  name: string;
  description: string;
}

export interface Located {
  locationId: EntityId; // location entity
}

export interface Lockable {
  isLocked: boolean;
  keyId?: EntityId;
}

export interface NPCMind {
  traits: string[];
  voice: {
    register: 'plain' | 'flowery' | 'terse' | 'academic';
    quirks: string[];
  };
  goals: Array<{ id: string; summary: string; priority: number }>;
  memory: Array<{ turn: number; fact: string; aboutEntityId?: EntityId }>;
}

export type Entity =
  | (EntityBase & { kind: 'location'; exits: Record<string, EntityId> })
  | (EntityBase & { kind: 'player' } & Located)
  | (EntityBase & { kind: 'npc' } & Located & { mind: NPCMind })
  | (EntityBase & { kind: 'item' } & Located)
  | (EntityBase & { kind: 'door' } & Located & Lockable);

export interface WorldState {
  turn: number;
  entities: Map<EntityId, Entity>;
  playerId: EntityId;
  flags: Set<string>; // narrative facts / global toggles
}
```

This is “just enough structure” to support procedural generation, rule application, and narration.

As entity behaviors grow (e.g., “an item that is also a container” or “a door that is also a prop”), we should avoid a combinatorial explosion of union variants by refactoring toward composable capabilities (such as `Located`, `Lockable`, `Container`) stored as tagged records or side tables.

## Procedural generation pipeline

The generator builds the world in layers, each layer constrained by earlier layers.

### 1) Seed + theme

- Input: `seed` (string).
- Output: `rng`, plus global “bible” facts such as setting tone, themes, and recurring motifs.

Example “bible” facts:

- The world is an abandoned research complex.
- Recurring motif: mirrors.
- Social rule: characters avoid speaking directly about “the incident.”

These facts later shape NPC traits, room descriptions, and storylets.

### 2) World graph (locations + connectivity)

Goal: a connected graph with pacing (safe spaces, friction, optional branches).

Constraints:

- Ensure a connected component containing the start.
- Maintain a target number of nodes and branching factor.
- Reserve a “final” region reachable behind a gated path.

Implementation sketch:

- Start with a spine (linear path) for pacing.
- Add branches and loops for exploration.
- Tag locations with roles: `start`, `hub`, `puzzle-room`, `npc-home`, `treasure`, `final`.

### 3) Populate entities (items, props, NPCs)

- Place baseline interactables (containers, readable notes, props).
- Generate NPCs:
  - each NPC gets traits, voice quirks, and 1–3 goals
  - ensure some NPCs are positioned to provide information or trade

The goal is “memorable by consistency,” not by infinite novelty.

### 4) Challenges + gating (puzzle/challenge graph)

We represent challenges as a dependency DAG:

```text
Find crowbar  ->  Pry vent  ->  Access lab
Meet curator  ->  Gain trust -> Receive key
```

Rules for solvability:

- Every prerequisite must be placed in a location reachable *before* its dependent.
- Avoid cycles (or make them explicit “alternative routes”).
- Minimize “guess the verb” by allowing multiple solutions (e.g., `pry` OR `force` OR `use crowbar`).

Runtime safety for critical resources:

- Challenges can mark certain entities as `critical` (keys, codes, unique tools).
- The engine should prevent these from being permanently lost (or provide a deterministic recovery path).
- If a challenge allows consuming a resource, it should either produce a replacement, open an alternate route, or unlock the gate immediately.

Generation approach:

- Choose a small set of challenge templates.
- Bind template roles to actual entities/locations.
- Place gating objects and clues with redundancy (at least N independent clues).

### 5) Storylets (micro-narrative)

Storylets are authored templates with:

- preconditions: required flags, location roles, NPC traits
- effects: set flags, move entities, add/remove goals, unlock challenges
- narration: parameterized text

Storylets create the feeling of a reactive story while staying deterministic.

### 6) Validation

Validation is a first-class generation step.

Static invariants:

- player start location exists
- every referenced `EntityId` exists
- exits point to locations
- no door references a missing key

Solvability validation:

- Build an abstract state for planning (ignore flavor text).
- Run a bounded solver that tries to reach “win conditions” from start using allowed actions.
- Use strict bounds (maximum depth and node expansions per attempt) and a fixed retry budget per layer.
- If unsolved, regenerate only the failing layer (e.g., rebind challenges, move items), not the entire world.
- If solvability cannot be proven after the retry budget, fall back to a simpler, guaranteed-solvable template set and surface a debug-visible error that includes the `seed` and failing constraints.

## Runtime simulation

### Turn model

- The game advances in discrete turns when the player takes a meaningful action.
- Some actions are “free” (e.g., `help`), while others advance time.

`WorldState.turn` is a simple clock used for:

- NPC memory timestamps
- storylet cooldowns
- scheduled events

### Action parsing + resolution

Split into two phases:

1. **Parse** raw input into a *command intent*:
   - verb: `look`, `go`, `take`, `talk`, `use`, `inventory`
   - direct object: noun phrase
   - indirect object / prepositional phrase: `use key on door`
2. **Resolve** noun phrases against the current world:
   - match visible entities in the room + inventory
   - handle ambiguity with prompts (later) or deterministic ties (initially)

This lets us keep rules typed and predictable.

### Rule engine

Rules should be composable and testable:

- `canApply(action, state)` returns either `ok` or a failure message.
- `apply(action, state)` returns `{ nextState, events, didAdvanceTurn }`.

Events are small structured records used by narration:

```ts
export type Event =
  | { type: 'moved'; entityId: EntityId; from: EntityId; to: EntityId }
  | { type: 'flag-set'; flag: string }
  | { type: 'unlocked'; doorId: EntityId }
  | { type: 'spoke'; npcId: EntityId; topic: string };
```

### NPC behavior

NPCs don’t need complex AI. A deterministic “intent chooser” per turn is enough:

- Evaluate goals (priority + preconditions).
- Choose an action (move, speak, offer trade, block exit).
- Apply via the same rule engine.

The key is that NPC behavior should be:

- consistent with their traits and voice
- legible to the player (via narration)
- constrained (to avoid chaotic worlds)

## Narration

Narration is responsible for turning events + state into readable text.

Principles:

- Prefer specific, concrete descriptions over generic ones.
- Reuse motifs from the world bible.
- Maintain consistent NPC voice.
- Avoid repeating the same sentence structures.

Implementation approach:

- A small grammar system that picks among templates.
- A “recently used lines” buffer to avoid repetition.
- Summaries for multi-event outcomes (e.g., moving rooms triggers describing the new room, not every intermediate event).

Narration templates and storylets should be treated as versioned content (data-first assets) and covered by regression tests (for example, golden output snapshots for a fixed seed and a short command sequence) so that engine rule changes don’t silently degrade the fiction layer.

## Saving + loading

Two viable approaches:

1. **Snapshot:** serialize full `WorldState` as JSON. Simplest.
2. **Seed + log:** serialize seed + action/event log and replay. Smaller, but needs stable determinism.

For a first implementation, snapshots are fine; a future change can move to seed+log once we have stable rules and indexes.

## Debuggability and tooling

Procedural systems are easiest to build when debugging is first-class:

- Always include `seed` in the UI banner and in saves.
- Add a hidden `debug` command set (can be gated by an env var) for:
  - dumping visible entities
  - printing current flags
  - teleporting to a location
  - forcing regeneration of storylets for a turn

## Milestone implementation path (technical)

1. **Core world + movement**
   - Generate a small world graph, place the player, support `look` and `go`.
2. **Entities + inventory**
   - Add `take`, `drop`, `inventory`.
3. **Gating challenge template**
   - Add a `door` + `key` template and validate reachability.
4. **NPC + talk**
   - Add one NPC template with deterministic dialogue + memory.
5. **Storylets + validation loop**
   - Add a few storylets; run solvability validation and regenerate bindings on failure.
6. **Save/load**
   - Snapshot save + load from file.

## Open design questions

1. Should the “win condition” be a single final goal (reach location, retrieve item) or a configurable set per seed?
2. How much ambiguity handling do we want in the first parser iteration (prompt vs deterministic choice)?
3. Do we want a pluggable narration backend (templates now, optional LLM later), or keep it template-only for now?
