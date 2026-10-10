// Read-only filesystem evidence. Only explicit source paths and build static
// files are hashed; protected settings are never parsed, copied or serialized.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '../..');
const SCHEMA = 'flowme-folder-content-release-manifest/1';
const EVIDENCE_SCHEMA = 'flowme-folder-content-release-evidence/1';
const OUTPUT = 'output/folder-content-dev-release';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const pathKey = value => process.platform === 'win32' ? value.toLowerCase() : value;
const fail = code => { throw Error(`folder-content-evidence-${code}`); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function keys(value, expected) {
  if (!plain(value) || Object.keys(value).sort().join('|') !== [...expected].sort().join('|')) fail('manifest-shape-rejected');
}
function absolute(value) {
  if (typeof value !== 'string' || !isAbsolute(value) || /[\0*?]/.test(value)) fail('absolute-path-rejected');
  return resolve(value);
}
function inside(root, file) {
  const part = relative(root, file);
  return part !== '' && !isAbsolute(part) && part !== '..' && !part.startsWith(`..${sep}`);
}
function bytes(file) {
  try { if (!lstatSync(file).isFile()) fail('file-unavailable'); return readFileSync(file); }
  catch { fail('file-unavailable'); }
}
function containedFile(root, file) {
  if (!inside(root, file)) fail('path-outside-root');
  let actualRoot, actualFile;
  try { actualRoot = realpathSync(root); actualFile = realpathSync(file); }
  catch { fail('file-unavailable'); }
  if (!inside(actualRoot, actualFile)) fail('path-outside-root');
  let part = root;
  for (const name of relative(root, file).split(sep)) {
    part = join(part, name);
    if (lstatSync(part).isSymbolicLink()) fail('symlink-rejected');
  }
  bytes(file);
  return file;
}
function sourcePath(root, value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_@./-]+$/.test(value)
    || value.split('/').some(part => !part || part === '.' || part === '..')) fail('source-path-rejected');
  const parts = value.split('/');
  if (parts.some(part => /^\.env(?:\.|$)/i.test(part)
    || ['.tmp', 'output', 'outputs', '.next', 'node_modules', '.git'].includes(part.toLowerCase()))) fail('source-path-rejected');
  return containedFile(root, resolve(root, value));
}

/** The manifest is local operator input, never a publication allowlist. */
export function validateReleaseManifest(input, expectedRoot = ROOT) {
  keys(input, ['schema', 'candidateRoot', 'liveRoot', 'candidateSourcePaths', 'protectedFiles']);
  if (input.schema !== SCHEMA) fail('manifest-schema-rejected');
  const candidateRoot = absolute(input.candidateRoot), liveRoot = absolute(input.liveRoot);
  if (pathKey(candidateRoot) !== pathKey(resolve(expectedRoot)) || pathKey(candidateRoot) === pathKey(liveRoot)) fail('manifest-root-rejected');
  if (!Array.isArray(input.candidateSourcePaths) || input.candidateSourcePaths.length === 0) fail('source-list-rejected');
  const sourceFiles = input.candidateSourcePaths.map(path => ({ path, file: sourcePath(candidateRoot, path) }));
  if (new Set(sourceFiles.map(row => pathKey(row.file))).size !== sourceFiles.length) fail('source-duplicate-rejected');
  if (!Array.isArray(input.protectedFiles) || input.protectedFiles.length !== 7) fail('protected-count-rejected');
  const protectedFiles = input.protectedFiles.map(row => {
    keys(row, ['label', 'path']);
    if (typeof row.label !== 'string' || !/^[a-z0-9-]{1,50}$/.test(row.label)) fail('protected-label-rejected');
    const file = absolute(row.path); bytes(file); return { label: row.label, file };
  });
  if (new Set(protectedFiles.map(row => row.label)).size !== 7
    || new Set(protectedFiles.map(row => pathKey(realpathSync(row.file)))).size !== 7) fail('protected-duplicate-rejected');
  const livePaths = [
    ['live-build', '.next/BUILD_ID'], ['live-next-config', 'next.config.ts'], ['live-tsconfig', 'tsconfig.json'],
  ].map(([label, path]) => ({ label, file: containedFile(liveRoot, resolve(liveRoot, path)) }));
  for (const row of livePaths) {
    if (!protectedFiles.some(item => item.label === row.label && pathKey(item.file) === pathKey(row.file))) fail('live-protection-rejected');
  }
  containedFile(candidateRoot, resolve(candidateRoot, '.next/BUILD_ID'));
  return { candidateRoot, liveRoot, sourceFiles: sourceFiles.sort((a, b) => a.path.localeCompare(b.path, 'en')),
    protectedFiles, livePaths, manifestSha256: sha256(JSON.stringify(input)) };
}

function buildId(root) {
  const value = bytes(resolve(root, '.next/BUILD_ID')).toString('utf8').trim();
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(value)) fail('build-id-rejected');
  return value;
}
function head(root) {
  const value = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value)) fail('head-rejected');
  return value;
}
function staticFiles(root) {
  const directory = resolve(root, '.next/static');
  try {
    if (!inside(realpathSync(root), realpathSync(directory)) || lstatSync(directory).isSymbolicLink()) fail('static-path-rejected');
  } catch { fail('static-path-rejected'); }
  const visit = dir => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { fail('static-assets-unavailable'); }
    return entries.flatMap(entry => {
      const file = join(dir, entry.name);
      if (entry.isSymbolicLink()) fail('static-symlink-rejected');
      if (entry.isDirectory()) return visit(file);
      if (!entry.isFile()) fail('static-entry-rejected');
      containedFile(directory, file);
      return [{ path: relative(root, file).split(sep).join('/'), sha256: sha256(bytes(file)) }];
    });
  };
  const rows = visit(directory).sort((a, b) => a.path.localeCompare(b.path, 'en'));
  if (rows.length === 0) fail('static-assets-unavailable');
  return rows;
}
const hashRows = rows => rows.map(({ label, file }) => ({ label, sha256: sha256(bytes(file)) }));
function candidateSnapshot(manifest, readHead) {
  const currentHead = readHead(manifest.candidateRoot);
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(currentHead)) fail('head-rejected');
  const sourceHashes = manifest.sourceFiles.map(({ path, file }) => ({ path, sha256: sha256(bytes(file)) }));
  const staticAssetHashes = staticFiles(manifest.candidateRoot);
  return { rootLabel: basename(manifest.candidateRoot), head: currentHead, buildId: buildId(manifest.candidateRoot),
    buildIdSha256: sha256(bytes(resolve(manifest.candidateRoot, '.next/BUILD_ID'))),
    sourceHashes, sourceSnapshotSha256: sha256(JSON.stringify(sourceHashes)),
    staticAssetHashes, staticAssetSnapshotSha256: sha256(JSON.stringify(staticAssetHashes)) };
}
function liveSnapshot(manifest) {
  return { rootLabel: basename(manifest.liveRoot), buildId: buildId(manifest.liveRoot), hashes: hashRows(manifest.livePaths) };
}

export function collectReleaseEvidence(manifest, readHead = head) {
  return { schema: EVIDENCE_SCHEMA, recordedAt: new Date().toISOString(), manifestSha256: manifest.manifestSha256,
    candidate: candidateSnapshot(manifest, readHead), live: liveSnapshot(manifest), protected: hashRows(manifest.protectedFiles),
    meaning: 'Read-only filesystem hashes of actual HEAD, source, BUILD_ID, static assets and protected files. Source/build pairing is not inferred. No network, Auth, API, DB, account, server or tunnel validation.' };
}

export function assertReleaseEvidence(baseline, manifest, mode, readHead = head) {
  if (!plain(baseline) || baseline.schema !== EVIDENCE_SCHEMA || baseline.manifestSha256 !== manifest.manifestSha256) fail('baseline-rejected');
  if (mode === 'assert-preserved') {
    assert.deepEqual(baseline.protected, hashRows(manifest.protectedFiles), 'protected-file-drift');
    assert.deepEqual(baseline.live, liveSnapshot(manifest), 'live-file-drift');
    return { protectedCount: 7, liveBuild: baseline.live.buildId, drift: 0 };
  }
  if (mode !== 'assert-source') fail('mode-rejected');
  assert.deepEqual(baseline.candidate, candidateSnapshot(manifest, readHead), 'candidate-source-or-build-drift');
  return { sourceCount: baseline.candidate.sourceHashes.length, staticAssetCount: baseline.candidate.staticAssetHashes.length,
    candidateBuild: baseline.candidate.buildId, drift: 0, buildUnchanged: true };
}

export function runReleaseEvidence(args, root = ROOT, readHead = head) {
  const [mode, label, manifestPath] = args;
  if (args.length !== 3 || !['capture', 'assert-preserved', 'assert-source'].includes(mode)) fail('arguments-rejected');
  if (typeof label !== 'string' || !/^[a-z0-9-]{1,50}$/.test(label)) fail('label-rejected');
  const output = resolve(root, OUTPUT), path = resolve(output, `${label}.json`);
  const inputPath = absolute(manifestPath);
  try { if (pathKey(realpathSync(output)) !== pathKey(resolve(realpathSync(root), OUTPUT))) fail('output-path-rejected'); }
  catch { fail('output-path-rejected'); }
  containedFile(output, inputPath);
  if (pathKey(inputPath) === pathKey(path)) fail('manifest-output-collision');
  let input;
  try { input = JSON.parse(bytes(inputPath).toString('utf8')); } catch { fail('manifest-json-rejected'); }
  const manifest = validateReleaseManifest(input, root);
  if (mode === 'capture') {
    if (existsSync(path)) fail('evidence-already-recorded');
    const evidence = collectReleaseEvidence(manifest, readHead);
    mkdirSync(output, { recursive: true });
    writeFileSync(path, JSON.stringify(evidence, null, 2), { flag: 'wx' });
    return { label, mode, head: evidence.candidate.head, candidateBuild: evidence.candidate.buildId, liveBuild: evidence.live.buildId,
      sourceCount: evidence.candidate.sourceHashes.length, staticAssetCount: evidence.candidate.staticAssetHashes.length,
      protectedCount: evidence.protected.length, sourceSnapshotSha256: evidence.candidate.sourceSnapshotSha256,
      staticAssetSnapshotSha256: evidence.candidate.staticAssetSnapshotSha256, manifestSha256: evidence.manifestSha256,
      localEvidence: `${OUTPUT}/${label}.json` };
  }
  let baseline;
  try { baseline = JSON.parse(bytes(containedFile(output, path)).toString('utf8')); } catch { fail('baseline-unavailable'); }
  return { label, mode, ...assertReleaseEvidence(baseline, manifest, mode, readHead) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(runReleaseEvidence(process.argv.slice(2)))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
