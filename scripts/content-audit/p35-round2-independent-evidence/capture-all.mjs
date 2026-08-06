import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const runStamp = new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, 'Z');
const outputRoot = path.resolve(
  repoRoot,
  process.env.FLOWME_P35_R2_REVIEW_EVIDENCE_DIR
    ?? path.join('output', 'playwright', 'p35-round2-review-rehearsal', `run-${runStamp}`),
);
const scripts = [
  'capture-s01-s08.mjs',
  'capture-s09-s16.mjs',
  'capture-s17-s23.mjs',
];
const provenanceScript = 'prepare-candidate-provenance.mjs';

function git(...args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

await mkdir(outputRoot, { recursive: true });

async function runScript(script) {
  const startedAt = new Date();
  const child = spawn(process.execPath, [path.join(scriptDir, script)], {
    cwd: repoRoot,
    env: {
      ...process.env,
      FLOWME_P35_R2_REVIEW_EVIDENCE_DIR: outputRoot,
      FLOWME_EVIDENCE_BASE_URL:
        process.env.FLOWME_EVIDENCE_BASE_URL ?? 'http://127.0.0.1:3114',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    stdout += text;
    process.stdout.write(`[${script}] ${text}`);
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderr += text;
    process.stderr.write(`[${script}] ${text}`);
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  return {
    script,
    exitCode,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    stdout,
    stderr,
  };
}

const results = [];
for (const script of scripts) {
  results.push(await runScript(script));
  if (results.at(-1).exitCode !== 0) break;
}

const buildId = await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')
  .then((value) => value.trim())
  .catch(() => 'NOT_AVAILABLE');
const headSha = git('rev-parse', 'HEAD');
const workingTreeStatus = git('status', '--porcelain=v1');
const workingTreeDirty = workingTreeStatus.length > 0;
const runRecord = {
  schemaVersion: 1,
  evidenceClass: workingTreeDirty ? 'LOCAL_REHEARSAL_NOT_FINAL' : 'CANDIDATE_BOUND_LOCAL_CAPTURE',
  observedUsers: 0,
  productCandidateSha: workingTreeDirty ? 'TBD_UNTIL_APPROVED_COMMIT' : headSha,
  workingTreeDirty,
  workingTreeStatus,
  buildId,
  baseUrl: process.env.FLOWME_EVIDENCE_BASE_URL ?? 'http://127.0.0.1:3114',
  outputRoot,
  runStamp,
  results,
};
await writeFile(
  path.join(outputRoot, 'capture-run.json'),
  `${JSON.stringify(runRecord, null, 2)}\n`,
  'utf8',
);

if (results.length === scripts.length && results.every((result) => result.exitCode === 0)) {
  const provenance = await runScript(provenanceScript);
  results.push(provenance);
  if (provenance.exitCode === 0) {
    runRecord.candidateProvenance = await readFile(
      path.join(outputRoot, 'candidate', 'candidate-provenance.json'),
      'utf8',
    ).then(JSON.parse);
    const gallery = await runScript('build-review-gallery.mjs');
    results.push(gallery);
    if (gallery.exitCode === 0) {
      results.push(await runScript('verify-review-gallery.mjs'));
    }
  }
  runRecord.results = results;
  await writeFile(
    path.join(outputRoot, 'capture-run.json'),
    `${JSON.stringify(runRecord, null, 2)}\n`,
    'utf8',
  );
}

const failed = results.filter((result) => result.exitCode !== 0);
console.log(JSON.stringify({ outputRoot, steps: results.length, failures: failed.length }, null, 2));
if (failed.length > 0 || results.length !== scripts.length + 3) process.exitCode = 1;
