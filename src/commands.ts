import { stdout } from 'node:process';

import { GAME_HELP_TEXT } from './engine/rules/parse.js';

type CliDecision = {
  kind: 'cli';
  action: 'continue' | 'exit';
};

type GameDecision = {
  kind: 'game';
};

export type CommandDecision = CliDecision | GameDecision;

const CLI_COMMANDS = ['help', 'quit', 'exit'] as const;

export function handleCommand(input: string): CommandDecision {
  const trimmed = input.trim();
  const lowered = trimmed.toLowerCase();

  if (lowered === 'quit' || lowered === 'exit') return { kind: 'cli', action: 'exit' };

  if (lowered === 'help') {
    stdout.write(
      `CLI commands: ${CLI_COMMANDS.join(', ')}\n` +
        `${GAME_HELP_TEXT}\n`,
    );
    return { kind: 'cli', action: 'continue' };
  }

  return { kind: 'game' };
}
