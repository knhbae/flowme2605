import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Compile the task-owned source without changing assets served by QA3106.
// No original dirty repository, environment file, private pack or evidence is copied.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = resolve(root, 'output/playwright', `feedback-ux-isolated-build-${stamp}`);
const workspace = resolve(output, 'workspace');
const git = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', windowsHide: true });
if (git.status !== 0) throw Error('isolated-build-git-inventory-unavailable');
const rootFiles = new Set(['package.json', 'package-lock.json', 'next.config.ts', 'next-env.d.ts',
  'tsconfig.json', 'tsconfig.next.json', 'tailwind.config.ts', 'postcss.config.js']);
const paths = git.stdout.split('\0').filter(path => path && (
  /^(app|components|lib|public)\//.test(path) || rootFiles.has(path)
  || path === 'docs/content-audit/2026-07-01-curated-source-app-seed-v1.json'));
// Only this task's explicitly owned new runtime input is added. Never sweep
// untracked artifacts or evidence into the compile workspace.
const ownedNewRuntime = ['lib/flow/integrated-poc/alpha-social/private-task-schedule.ts', 'lib/flow/integrated-poc/folder-link-preview.ts', 'lib/flow/integrated-poc/execution-presentation.ts'];
for (const path of ownedNewRuntime) {
  if (existsSync(resolve(root, path)) && !paths.includes(path)) paths.push(path);
}
paths.sort();
if ([...rootFiles].some(path => !paths.includes(path))) throw Error('isolated-build-required-input-missing');
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const sources = paths.map(path => ({ path, sha256: hash(resolve(root, path)) }));
mkdirSync(workspace, { recursive: true });
for (const { path, sha256 } of sources) {
  const target = resolve(workspace, path);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(resolve(root, path), target);
  if (hash(target) !== sha256) throw Error(`isolated-build-copy-mismatch:${path}`);
}
symlinkSync(resolve(root, 'node_modules'), resolve(workspace, 'node_modules'), 'junction');
writeFileSync(resolve(output, 'inputs.json'), JSON.stringify({ root, workspace, sources }, null, 2));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('FLOWME_ALPHA_')));
// Catalog loading is read-only and explicitly uses the already verified local pack.
if (process.env.FLOWME_ALPHA_CATALOG_PACK_FILE) env.FLOWME_ALPHA_CATALOG_PACK_FILE = process.env.FLOWME_ALPHA_CATALOG_PACK_FILE;
env.NEXT_TELEMETRY_DISABLED = '1';
let log = '', launchError = null;
const started = new Date().toISOString();
const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';
const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd run build'] : ['run', 'build'];
const child = spawn(command, args, { cwd: workspace, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { log += data.toString(); });
child.on('error', error => { launchError = String(error); });
child.on('close', (exitCode, signal) => {
  const sourceChanged = sources.filter(({ path, sha256 }) => hash(resolve(root, path)) !== sha256).map(item => item.path);
  const copiedInputChanged = sources.filter(({ path, sha256 }) => hash(resolve(workspace, path)) !== sha256).map(item => item.path);
  const buildIdPath = resolve(workspace, '.next/BUILD_ID');
  const result = { started, ended: new Date().toISOString(), exitCode, signal, launchError,
    workspace, sourceFileCount: sources.length, sourceChanged, copiedInputChanged,
    buildId: existsSync(buildIdPath) ? readFileSync(buildIdPath, 'utf8').trim() : null,
    servingAssetsReplaced: false, environmentFilesCopied: false, privatePackCopied: false };
  writeFileSync(resolve(output, 'build.log'), log);
  writeFileSync(resolve(output, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, evidence: resolve(output, 'result.json') }, null, 2));
  process.exitCode = exitCode === 0 && !launchError && !signal && result.buildId && !sourceChanged.length && !copiedInputChanged.length ? 0 : 1;
});
