import type { BudgetConsulted, Direction, RejectionReason } from '../types.js';

export type Action =
  | {
      type: 'look';
    }
  | {
      type: 'go';
      direction: Direction;
    };

export type ParseResult =
  | {
      ok: true;
      action: Action;
    }
  | {
      ok: false;
      rejection: {
        reason: RejectionReason;
        message: string;
        input: string;
        budgetsConsulted: BudgetConsulted[];
      };
    };

const DIRECTION_ALIASES: Record<string, Direction> = {
  n: 'north',
  north: 'north',
  s: 'south',
  south: 'south',
  e: 'east',
  east: 'east',
  w: 'west',
  west: 'west',
};

export function parseInput(input: string): ParseResult {
  const trimmed = input.trim();
  const lowered = trimmed.toLowerCase();

  if (lowered === 'look' || lowered === 'l') {
    return { ok: true, action: { type: 'look' } };
  }

  if (lowered === 'go' || lowered.startsWith('go ')) {
    const parts = lowered.split(/\s+/).filter((p) => p !== '');
    if (parts.length < 2) {
      return {
        ok: false,
        rejection: {
          reason: 'missing-argument',
          message: "Go where? Try 'go north'.",
          input: trimmed,
          budgetsConsulted: [],
        },
      };
    }

    const direction = DIRECTION_ALIASES[parts[1] ?? ''];
    if (!direction) {
      return {
        ok: false,
        rejection: {
          reason: 'invalid-argument',
          message: `Unknown direction: ${parts[1]}.`,
          input: trimmed,
          budgetsConsulted: [],
        },
      };
    }

    return { ok: true, action: { type: 'go', direction } };
  }

  return {
    ok: false,
    rejection: {
      reason: 'unknown-command',
      message: `Unknown command: ${trimmed}. Type 'help'.`,
      input: trimmed,
      budgetsConsulted: [],
    },
  };
}
