import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { handleCommand } from './commands.js';
import { createEngine } from './engine/api.js';

function parseSeedArg(args: string[]): { seed: string | undefined; warnings: string[] } {
  const warnings: string[] = [];
  let seed: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--seed') {
      const value = args[i + 1]?.trim();
      i += 1;
      if (!value || value.startsWith('-')) {
        warnings.push("Ignoring '--seed' without a value; using default seed.");
        continue;
      }

      seed = value;
      continue;
    }

    if (arg?.startsWith('--seed=')) {
      const [, value] = arg.split('=', 2);
      const trimmedValue = value?.trim();
      if (!trimmedValue) {
        warnings.push("Ignoring '--seed=' with an empty value; using default seed.");
        continue;
      }

      seed = trimmedValue;
      continue;
    }
  }

  return { seed, warnings };
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

  const parsedSeed = parseSeedArg(process.argv.slice(2));
  for (const warning of parsedSeed.warnings) {
    console.error(warning);
  }

  const seed = parsedSeed.seed ?? 'demo';
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
        const decision = handleCommand(input);
        switch (decision.kind) {
          case 'cli': {
            if (decision.action === 'exit') {
              running = false;
            }

            break;
          }
          case 'game': {
            const result = engine.step(input);
            stdout.write(`${result.output}\n`);
            break;
          }
          default: {
            const _exhaustive: never = decision;
            throw new Error(`Unexpected command kind: ${(decision as { kind?: unknown }).kind}`);
          }
        }
      } catch (err) {
        handleFatalError(err);
        stdout.write('\nAn unrecoverable error occurred. Exiting.\n');
        running = false;
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
