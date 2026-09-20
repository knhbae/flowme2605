import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, createWriteStream, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listProgramSourcePaths } from './program-source-files.mjs';
import { verificationExitCode } from './program-verification-result.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const kind = process.argv[2];
if (!['new-tests', 'npm-test', 'approved-tests', 'public-tests', 'build', 'docs', 'audit'].includes(kind)) throw Error('choose new-tests/npm-test/approved-tests/public-tests/build/docs/audit');
const listPaths = () => listProgramSourcePaths(root);
const paths = listPaths();
const testPaths = paths.filter(path => /\.test\.tsx?$/.test(path));
if (kind === 'new-tests' && testPaths.length === 0) throw new Error('No integrated test files collected');
const hashes = selected => selected.map(path => ({ path, sha256: existsSync(resolve(root, path)) ? createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex') : null }));
const before = hashes(paths), started = new Date().toISOString();
const directory = resolve(root, 'output/integrated-product-poc'); mkdirSync(directory, { recursive: true });
const stamp = started.replace(/[:.]/g, '-'), name = `${kind}-${stamp}`;
const log = createWriteStream(resolve(directory, `${name}.log`));
const commands = { 'npm-test': ['test'], 'approved-tests': ['run', 'test:approved-plan-execution'], 'public-tests': ['run', 'test:public-plan-surface'], build: ['run', 'build'], docs: ['run', 'docs:check'], audit: ['run', 'security:audit'] };
const windows = process.platform === 'win32';
const command = kind === 'new-tests' ? process.execPath : windows ? process.env.ComSpec || 'cmd.exe' : 'npm';
// Bound workers and their heaps on the shared 16 GB host. The unchanged
// 200-item reader suite completed with this bound after Windows worker exits.
// This is a test-process limit, not a product limit or a diagnosed crash cause.
// TAP retains child exit/signal diagnostics if a worker cannot finish.
// A sequential diagnostic run preserves every file/assertion when a Windows
// test worker exits abruptly. Record the chosen resource bound in the result.
const requestedTestConcurrency = process.argv[3];
if (requestedTestConcurrency !== undefined && (kind !== 'new-tests' || !['1', '2'].includes(requestedTestConcurrency))) throw Error('new-tests concurrency must be 1 or 2');
const testConcurrency = kind === 'new-tests' ? Number(requestedTestConcurrency ?? 2) : null;
// The unchanged six-case/200-item reader also passes with 256/4 MiB under
// Windows commit pressure. Opt in explicitly; retain process isolation and
// every test, and record this execution bound instead of changing assertions.
const requestedTestHeap = process.argv[4];
if (requestedTestHeap !== undefined && (kind !== 'new-tests' || !['256', '512'].includes(requestedTestHeap))) throw Error('new-tests heap must be 256 or 512');
const testMaxOldSpaceMb = kind === 'new-tests' ? Number(requestedTestHeap ?? 512) : null;
const testMaxSemiSpaceMb = testMaxOldSpaceMb === 256 ? 4 : null;
const args = kind === 'new-tests' ? [`--max-old-space-size=${testMaxOldSpaceMb}`, ...(testMaxSemiSpaceMb ? [`--max-semi-space-size=${testMaxSemiSpaceMb}`] : []), '--import', 'tsx', '--test', `--test-concurrency=${testConcurrency}`, '--test-reporter=tap', ...testPaths] : windows ? ['/d', '/s', '/c', ['npm.cmd', ...commands[kind]].join(' ')] : commands[kind];
let output = '';
let launchError = null;
const child = spawn(command, args, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => { const text = bytes.toString(); output += text; log.write(bytes); });
child.on('error', error => { launchError = String(error); output += launchError; log.write(launchError); });
child.on('close', (code, signal) => {
  log.end();
  const total = label => [...output.matchAll(new RegExp(`^(?:# |ℹ )?${label} (\\d+)\\s*$`, 'gm'))].reduce((sum, item) => sum + Number(item[1]), 0);
  const after = hashes(listPaths()), prior = new Map(before.map(file => [file.path, file.sha256])), final = new Map(after.map(file => [file.path, file.sha256]));
  const changed = [...new Set([...prior.keys(), ...final.keys()])].filter(path => prior.get(path) !== final.get(path));
  const result = { kind, started, ended: new Date().toISOString(), exitCode: code, signal, launchError, nodeOptions: process.env.NODE_OPTIONS ?? null, testConcurrency, testMaxOldSpaceMb, testMaxSemiSpaceMb, testFileCount: kind === 'new-tests' ? testPaths.length : null, testExecutions: total('tests'), passed: total('pass'), failed: total('fail'), skipped: total('skipped'), cancelled: total('cancelled'), sourceChangedDuringRun: changed, log: `${name}.log`, sourceHashes: after };
  const verifiedExitCode = verificationExitCode(result);
  writeFileSync(resolve(directory, `${name}.json`), JSON.stringify({ ...result, verifiedExitCode }, null, 2));
  writeFileSync(resolve(directory, `${kind}-latest.json`), JSON.stringify({ ...result, verifiedExitCode }, null, 2));
  console.log(JSON.stringify({ ...result, verifiedExitCode, sourceHashes: `${name}.json` }, null, 2));
  process.exitCode = verifiedExitCode;
});
