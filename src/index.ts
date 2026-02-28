import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

type CommandResult = 'continue' | 'exit';

function handleCommand(input: string): CommandResult {
  if (input === 'help') {
    stdout.write('Commands: help, quit\n');
    return 'continue';
  }

  stdout.write(`You said: ${input}\n`);
  return 'continue';
}

function handleFatalError(err: unknown): void {
  if (err instanceof Error) {
    console.error(err.message);
    return;
  }

  console.error(String(err));
}

async function main(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });

  stdout.write('DK — procedural TypeScript text adventure\n');
  stdout.write('Type "help" for commands, or "quit" to exit.\n\n');

  try {
    while (true) {
      const input = (await rl.question('> ')).trim();

      if (input === '') continue;
      if (input === 'quit' || input === 'exit') break;

      const result = handleCommand(input);
      if (result === 'exit') break;
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  handleFatalError(err);
  process.exitCode = 1;
});
