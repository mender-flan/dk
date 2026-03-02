import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { type CommandResult, handleCommand } from './commands.js';
import { createEngine } from './engine/api.js';

function parseSeedArg(args: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--seed') {
      const value = args[i + 1];
      if (value && !value.startsWith('-')) return value;
    }

    if (arg?.startsWith('--seed=')) {
      const [, value] = arg.split('=', 2);
      if (value && value.trim() !== '') return value;
    }
  }

  return undefined;
}

function handleFatalError(err: unknown): void {
  if (err instanceof Error) {
    console.error('Fatal error:', err.stack ?? err.message);
    return;
  }

  console.error('Fatal error:', String(err));
}

async function main(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  const seed = parseSeedArg(process.argv.slice(2)) ?? 'demo';
  const engine = createEngine({ seed });

  try {
    stdout.write('DK — procedural TypeScript text adventure\n');
    stdout.write(`Seed: ${seed}\n`);
    stdout.write(
      "Type 'help' for commands, or 'quit'/'exit' to leave the game.\n\n",
    );

    stdout.write(`${engine.step('look').output}\n`);

    let running = true;
    while (running) {
      let input: string;
      try {
        input = (await rl.question('> ')).trim();
      } catch {
        stdout.write('\nGoodbye!\n');
        running = false;
        continue;
      }

      if (input === '') continue;

      try {
        const result: CommandResult = handleCommand(engine, input);
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
