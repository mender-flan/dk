import { stdout } from 'node:process';

export type CommandResult = 'continue' | 'exit';

const BASE_COMMANDS = ['help', 'quit', 'exit'] as const;

export function handleCommand(input: string): CommandResult {
  const cmd = input.trim().toLowerCase();

  if (cmd === 'quit' || cmd === 'exit') return 'exit';

  if (cmd === 'help') {
    stdout.write(`Commands: ${BASE_COMMANDS.join(', ')}\n`);
    return 'continue';
  }

  stdout.write(`Unknown command: ${input}. Type "help".\n`);
  return 'continue';
}
