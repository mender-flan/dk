import { stdout } from 'node:process';

import type { GameEngine } from './engine/api.js';

export type CommandResult = 'continue' | 'exit';

const CLI_COMMANDS = ['help', 'quit', 'exit'] as const;

export function handleCommand(engine: GameEngine, input: string): CommandResult {
  const cmd = input.trim();
  const lowered = cmd.toLowerCase();

  if (lowered === 'quit' || lowered === 'exit') return 'exit';

  if (lowered === 'help') {
    stdout.write(
      `Commands: look, go <direction>, ${CLI_COMMANDS.join(', ')}\n` +
        "Directions: north/south/east/west (or n/s/e/w)\n",
    );
    return 'continue';
  }

  const result = engine.step(cmd);
  stdout.write(`${result.output}\n`);
  return 'continue';
}
