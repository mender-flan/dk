import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { type CommandResult, handleCommand } from './commands.js';

function handleFatalError(err: unknown): void {
  if (err instanceof Error) {
    console.error('Fatal error:', err.stack ?? err.message);
    return;
  }

  console.error('Fatal error:', String(err));
}

async function main(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    stdout.write('DK — procedural TypeScript text adventure (bootstrap)\n');
    stdout.write(
      "Type 'help' for commands, or 'quit'/'exit' to leave the game. Story content will be added later.\n\n",
    );

    let running = true;
    while (running) {
      let input: string;
      try {
        input = (await rl.question('> ')).trim();
      } catch {
        stdout.write('\nGoodbye!\n');
        break;
      }

      if (input === '') continue;

      try {
        const result: CommandResult = handleCommand(input);
        if (result === 'exit') running = false;
      } catch (err) {
        console.error('Command error:', err instanceof Error ? err.message : String(err));
      }
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  handleFatalError(err);
  process.exitCode = 1;
});
