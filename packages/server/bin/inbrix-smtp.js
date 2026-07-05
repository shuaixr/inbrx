#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cliPath = resolve(root, 'dist/cli.js');

if (!existsSync(cliPath)) {
  console.error('Build output is missing. Run "npm run build" before using the CLI.');
  process.exit(1);
}

const { runCli } = await import('../dist/cli.js');

runCli(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
