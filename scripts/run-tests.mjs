import { spawnSync } from 'node:child_process';
import path from 'node:path';

const testFiles = [
  'lib/flow/date.test.ts',
  'lib/flow/parser.test.ts',
  'lib/flow/seed-flows.test.ts',
  'lib/flow/export.test.ts',
  'lib/flow/storage.test.ts',
  'lib/flow/surface.test.ts',
];

const args = ['--test', ...process.argv.slice(2), ...testFiles];
const command = process.execPath;
const tsxCli = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
const result = spawnSync(command, [tsxCli, ...args], { stdio: 'inherit' });

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
