import { stdout } from 'node:process';

export type CommandResult = 'continue' | 'exit';

export function handleCommand(input: string): CommandResult {
  if (input === 'quit' || input === 'exit') return 'exit';

  if (input === 'help') {
    stdout.write('Commands: help, quit, exit\n');
    return 'continue';
  }

  stdout.write(`Unknown command: ${input}. Type "help".\n`);
  return 'continue';
}
