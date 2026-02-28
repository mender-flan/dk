import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

async function main(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });

  stdout.write('DK — procedural TypeScript text adventure\n');
  stdout.write('Type "help" for commands, or "quit" to exit.\n\n');

  try {
    while (true) {
      const input = (await rl.question('> ')).trim();

      if (input === '') continue;
      if (input === 'quit' || input === 'exit') break;

      if (input === 'help') {
        stdout.write('Commands: help, quit\n');
        continue;
      }

      stdout.write(`You said: ${input}\n`);
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
