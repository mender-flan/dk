import { generateInitialState } from './generate/pipeline.js';
import { narrateStep } from './narration/narrator.js';
import type { WorldState } from './state.js';
import { parseInput } from './rules/parse.js';
import { applyAction } from './rules/rule-engine.js';
import type { BudgetConsulted, Event, PlayerView, Seed, StepResult } from './types.js';
import { assertValidWorldState } from './validate.js';
import { buildPlayerView } from './view.js';

export type { BudgetConsulted, Event, PlayerView, Seed, StepResult } from './types.js';

export interface EngineBudgets {
  /**
   * Reserved for generation-time validation loops in later phases.
   *
   * Phase 1 does not currently retry or regenerate worlds.
   */
  generationRetries: number;

  /**
   * Reserved for bounded solver validation in later phases.
   *
   * Phase 1 does not currently run a solver.
   */
  solverMaxDepth: number;

  /**
   * Reserved for bounded solver validation in later phases.
   *
   * Phase 1 does not currently run a solver.
   */
  solverExpansionBudget: number;
}

export interface EngineConfig {
  seed: Seed;

  /**
   * Reserved for later phases where generation validation and solvers consult explicit budgets.
   */
  budgets?: Partial<EngineBudgets>;
}

export interface GameEngine {
  getView(): PlayerView;
  step(input: string): StepResult;
}

export function createEngine(config: EngineConfig): GameEngine {
  const runSeed = config.seed;
  let state: WorldState = generateInitialState(config.seed);
  assertValidWorldState(state);

  function makeRejectedEvent(rejection: {
    reason: Extract<Event, { type: 'rejected' }>['reason'];
    message: string;
    input: string;
    budgetsConsulted: BudgetConsulted[];
  }): Extract<Event, { type: 'rejected' }> {
    return {
      type: 'rejected',
      seed: runSeed,
      ...rejection,
    };
  }

  return {
    getView(): PlayerView {
      return buildPlayerView(state);
    },
    step(input: string): StepResult {
      const parsed = parseInput(input);

      if (!parsed.ok) {
        const event: Event = makeRejectedEvent(parsed.rejection);

        return {
          output: narrateStep(state, [event]),
          didAdvanceTurn: false,
          events: [event],
        };
      }

      const result = applyAction(state, parsed.input, parsed.action);
      if (result.type === 'rejected') {
        const event: Event = makeRejectedEvent({
          reason: result.reason,
          message: result.message,
          input: result.input,
          budgetsConsulted: result.budgetsConsulted,
        });

        return {
          output: narrateStep(state, [event]),
          didAdvanceTurn: false,
          events: [event],
        };
      }

      state = result.nextState;
      return {
        output: narrateStep(state, result.events),
        didAdvanceTurn: result.didAdvanceTurn,
        events: result.events,
      };
    },
  };
}
