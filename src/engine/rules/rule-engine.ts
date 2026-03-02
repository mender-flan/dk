import { getLocation, type WorldState } from '../state.js';
import type { BudgetConsulted, Direction, Event, RejectionReason } from '../types.js';

import type { Action } from './parse.js';

export type RuleResult =
  | {
      type: 'ok';
      nextState: WorldState;
      didAdvanceTurn: boolean;
      events: Event[];
    }
  | {
      type: 'rejected';
      reason: RejectionReason;
      message: string;
      input: string;
      budgetsConsulted: BudgetConsulted[];
    };

export function applyAction(state: WorldState, input: string, action: Action): RuleResult {
  switch (action.type) {
    case 'look':
      return {
        type: 'ok',
        nextState: state,
        didAdvanceTurn: false,
        events: [{ type: 'looked', locationId: state.playerLocationId }],
      };
    case 'go':
      return applyGo(state, input, action.direction);
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unexpected action type: ${String(_exhaustive)}`);
    }
  }
}

function applyGo(state: WorldState, input: string, direction: Direction): RuleResult {
  const fromLocationId = state.playerLocationId;
  const location = getLocation(state, fromLocationId);
  const toLocationId = location.exits[direction];

  if (!toLocationId) {
    return {
      type: 'rejected',
      reason: 'no-exit',
      message: `You can't go ${direction} from here.`,
      input,
      budgetsConsulted: [],
    };
  }

  const nextState: WorldState = {
    ...state,
    turn: state.turn + 1,
    playerLocationId: toLocationId,
  };

  return {
    type: 'ok',
    nextState,
    didAdvanceTurn: true,
    events: [{ type: 'moved', direction, fromLocationId, toLocationId }],
  };
}
