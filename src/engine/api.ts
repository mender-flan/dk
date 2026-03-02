import { generateInitialState } from './generate/pipeline.js';
import { narrateStep } from './narration/narrator.js';
import type { WorldState } from './state.js';
import { parseInput } from './rules/parse.js';
import { applyAction } from './rules/rule-engine.js';
import type { BudgetConsulted, Event, PlayerView, Seed, StepResult } from './types.js';
import { buildPlayerView } from './view.js';

export type { BudgetConsulted, Event, PlayerView, Seed, StepResult } from './types.js';

export interface EngineBudgets {
  generationRetries: number;
  solverMaxDepth: number;
  solverExpansionBudget: number;
}

export interface EngineConfig {
  seed: Seed;
  budgets?: Partial<EngineBudgets>;
}

export interface GameEngine {
  getView(): PlayerView;
  step(input: string): StepResult;
}

export function createEngine(config: EngineConfig): GameEngine {
  let state: WorldState = generateInitialState(config.seed);

  return {
    getView(): PlayerView {
      return buildPlayerView(state);
    },
    step(input: string): StepResult {
      const trimmed = input.trim();
      const parsed = parseInput(trimmed);

      if (!parsed.ok) {
        const event: Event = {
          type: 'rejected',
          seed: state.seed,
          ...parsed.rejection,
        };

        return {
          output: narrateStep(state, [event]),
          didAdvanceTurn: false,
          events: [event],
        };
      }

      const result = applyAction(state, trimmed, parsed.action);
      if (result.type === 'rejected') {
        const event: Event = {
          type: 'rejected',
          seed: state.seed,
          reason: result.reason,
          message: result.message,
          input: result.input,
          budgetsConsulted: result.budgetsConsulted,
        };

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
