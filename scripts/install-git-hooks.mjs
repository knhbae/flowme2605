import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hooksDir = resolve(rootDir, '.githooks');

if (!existsSync(hooksDir)) {
  throw new Error(`Missing hooks directory: ${hooksDir}`);
}

execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
  cwd: rootDir,
  stdio: 'inherit',
});

const configuredPath = execFileSync('git', ['config', '--get', 'core.hooksPath'], {
  cwd: rootDir,
  encoding: 'utf8',
}).trim();

console.log(`Git hooks path set to ${configuredPath}`);
