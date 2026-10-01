import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertReleaseEvidence, collectReleaseEvidence, runReleaseEvidence, validateReleaseManifest } from './folder-content-release-evidence.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT = resolve(ROOT, 'output/folder-content-dev-release');
const HEAD = `08aa8311${'0'.repeat(32)}`;
const SECRET = 'synthetic-private-settings-body-do-not-copy';
const put = (file, value) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); };
function fixture(t) {
  mkdirSync(OUTPUT, { recursive: true });
  const directory = mkdtempSync(resolve(OUTPUT, 'unit-fixtures-'));
  const root = resolve(directory, 'candidate'), liveRoot = resolve(directory, 'live');
  t.after(() => {
    const part = relative(OUTPUT, directory);
    assert(!part.startsWith(`..${sep}`) && part !== '..' && part.startsWith('unit-fixtures-'));
    rmSync(directory, { recursive: true, force: true });
  });
  put(resolve(root, 'app/alpha/page.tsx'), 'export const source = 1;');
  put(resolve(root, 'lib/flow/item.ts'), 'export const item = 1;');
  put(resolve(root, '.next/BUILD_ID'), 'actual-candidate-build\n');
  put(resolve(root, '.next/static/chunks/page.js'), 'actual candidate asset');
  put(resolve(root, '.next/static/css/style.css'), 'body { color: black; }');
  put(resolve(liveRoot, '.next/BUILD_ID'), 'actual-live-build\n');
  put(resolve(liveRoot, 'next.config.ts'), 'live config bytes');
  put(resolve(liveRoot, 'tsconfig.json'), '{"live":true}');
  const protectedFiles = [
    { label: 'live-build', path: resolve(liveRoot, '.next/BUILD_ID') },
    { label: 'live-next-config', path: resolve(liveRoot, 'next.config.ts') },
    { label: 'live-tsconfig', path: resolve(liveRoot, 'tsconfig.json') },
    ...['host-settings', 'server-settings', 'source-pack', 'feedback-ledger'].map(label => {
      const path = resolve(directory, 'protected', `${label}.json`); put(path, `${SECRET}:${label}`); return { label, path };
    }),
  ];
  const input = { schema: 'flowme-folder-content-release-manifest/1', candidateRoot: root, liveRoot,
    candidateSourcePaths: ['app/alpha/page.tsx', 'lib/flow/item.ts'], protectedFiles };
  const manifestPath = resolve(root, 'output/folder-content-dev-release/evidence-manifest.json');
  put(manifestPath, JSON.stringify(input));
  return { root, liveRoot, input, manifestPath, directory, validated: () => validateReleaseManifest(input, root) };
}

test('capture records actual candidate and live builds separately, source/static hashes and seven hash-only labels', t => {
  const f = fixture(t), evidence = collectReleaseEvidence(f.validated(), () => HEAD);
  assert.equal(evidence.candidate.head, HEAD);
  assert.equal(evidence.candidate.buildId, 'actual-candidate-build');
  assert.equal(evidence.live.buildId, 'actual-live-build');
  assert.equal(evidence.candidate.sourceHashes.length, 2);
  assert.equal(evidence.candidate.staticAssetHashes.length, 2);
  assert.equal(evidence.protected.length, 7);
  for (const row of evidence.protected) assert.deepEqual(Object.keys(row), ['label', 'sha256']);
  const text = JSON.stringify(evidence);
  assert(!text.includes(SECRET)); assert(!text.includes(f.directory));
  assert(evidence.meaning.includes('Source/build pairing is not inferred'));
});

test('manifest rejects missing and extra keys, unknown schema, invalid roots and nonarray source list', t => {
  const f = fixture(t);
  const missing = { ...f.input }; delete missing.liveRoot;
  for (const input of [missing, { ...f.input, extra: true }, { ...f.input, schema: 'other' },
    { ...f.input, candidateRoot: 'relative' }, { ...f.input, candidateRoot: f.liveRoot },
    { ...f.input, liveRoot: f.root }, { ...f.input, candidateSourcePaths: 'app/alpha/page.tsx' }]) {
    assert.throws(() => validateReleaseManifest(input, f.root), /rejected/);
  }
});

test('source manifest rejects traversal, absolute paths, globs, duplicate files and restricted directory reads', t => {
  const f = fixture(t);
  for (const path of ['../outside.ts', 'app/../alpha/page.tsx', resolve(f.root, 'app/alpha/page.tsx'),
    'app\\alpha\\page.tsx', 'app//alpha/page.tsx', 'app/*.tsx', '.env', '.env.local', 'app/.env.local',
    '.tmp/settings.json', 'output/source.ts', 'outputs/source.ts', '.next/BUILD_ID', 'node_modules/library/index.js', '.git/HEAD']) {
    assert.throws(() => validateReleaseManifest({ ...f.input, candidateSourcePaths: [path] }, f.root), /source-path-rejected/);
  }
  assert.throws(() => validateReleaseManifest({ ...f.input, candidateSourcePaths: ['app/alpha/page.tsx', 'app/alpha/page.tsx'] }, f.root), /source-duplicate/);
});

test('seven protected files require unique labels/paths and the exact live build/config paths', t => {
  const f = fixture(t);
  assert.throws(() => validateReleaseManifest({ ...f.input, protectedFiles: f.input.protectedFiles.slice(0, 6) }, f.root), /protected-count/);
  for (const row of [{ label: 'host-settings', path: f.input.protectedFiles[5].path },
    { label: 'server-settings', path: f.input.protectedFiles[3].path }]) {
    const protectedFiles = [...f.input.protectedFiles]; protectedFiles[4] = row;
    assert.throws(() => validateReleaseManifest({ ...f.input, protectedFiles }, f.root), /protected-duplicate/);
  }
  const protectedFiles = [...f.input.protectedFiles]; protectedFiles[0] = { ...protectedFiles[0], path: resolve(f.root, '.next/BUILD_ID') };
  assert.throws(() => validateReleaseManifest({ ...f.input, protectedFiles }, f.root), /live-protection/);
});

test('missing source, protected/build files and static assets fail closed', t => {
  const f = fixture(t);
  assert.throws(() => validateReleaseManifest({ ...f.input, candidateSourcePaths: ['app/alpha/missing.tsx'] }, f.root), /file-unavailable/);
  const protectedFiles = [...f.input.protectedFiles]; protectedFiles[6] = { ...protectedFiles[6], path: resolve(f.directory, 'missing.json') };
  assert.throws(() => validateReleaseManifest({ ...f.input, protectedFiles }, f.root), /file-unavailable/);
  const manifest = f.validated(); rmSync(resolve(f.root, '.next/static/chunks/page.js')); rmSync(resolve(f.root, '.next/static/css/style.css'));
  assert.throws(() => collectReleaseEvidence(manifest, () => HEAD), /static-assets-unavailable/);
  rmSync(resolve(f.root, '.next/BUILD_ID'));
  assert.throws(() => validateReleaseManifest(f.input, f.root), /file-unavailable/);
});

test('source and static directories cannot use links to leave their permitted roots', t => {
  const f = fixture(t), linked = resolve(f.root, 'lib/escaped');
  symlinkSync(resolve(f.directory, 'protected'), linked, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => validateReleaseManifest({ ...f.input, candidateSourcePaths: ['lib/escaped/source-pack.json'] }, f.root), /path-outside-root/);
  const manifest = f.validated(), staticDirectory = resolve(f.root, '.next/static');
  rmSync(staticDirectory, { recursive: true, force: true });
  symlinkSync(resolve(f.directory, 'protected'), staticDirectory, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => collectReleaseEvidence(manifest, () => HEAD), /static-path-rejected/);
});

test('directory links cannot disguise restricted source directories or move local output into source', t => {
  const f = fixture(t), restricted = resolve(f.root, '.tmp');
  put(resolve(restricted, 'settings.json'), SECRET);
  symlinkSync(restricted, resolve(f.root, 'lib/disguised'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => validateReleaseManifest({ ...f.input, candidateSourcePaths: ['lib/disguised/settings.json'] }, f.root), /symlink-rejected/);
  const localOutput = resolve(f.root, 'output/folder-content-dev-release');
  rmSync(localOutput, { recursive: true, force: true });
  symlinkSync(restricted, localOutput, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => runReleaseEvidence(['capture', 'unit', resolve(localOutput, 'settings.json')], f.root, () => HEAD), /output-path-rejected/);
});

test('assert-preserved detects protected byte drift without publishing any settings body', t => {
  const f = fixture(t), manifest = f.validated(), baseline = collectReleaseEvidence(manifest, () => HEAD);
  assert.deepEqual(assertReleaseEvidence(baseline, manifest, 'assert-preserved', () => HEAD), { protectedCount: 7, liveBuild: 'actual-live-build', drift: 0 });
  put(f.input.protectedFiles[3].path, `${SECRET}:changed`);
  assert.throws(() => assertReleaseEvidence(baseline, manifest, 'assert-preserved'), error =>
    error.message.includes('protected-file-drift') && !error.message.includes(SECRET));
});

test('assert-source detects source, build/static and HEAD drift without rebuilding or changing evidence', t => {
  const f = fixture(t), manifest = f.validated(), baseline = collectReleaseEvidence(manifest, () => HEAD);
  assert.equal(assertReleaseEvidence(baseline, manifest, 'assert-source', () => HEAD).drift, 0);
  assert.throws(() => assertReleaseEvidence(baseline, manifest, 'assert-source', () => 'a'.repeat(40)), /candidate-source-or-build-drift/);
  const file = resolve(f.root, 'app/alpha/page.tsx'), beforeBuild = readFileSync(resolve(f.root, '.next/BUILD_ID'));
  put(file, 'changed source');
  assert.throws(() => assertReleaseEvidence(baseline, manifest, 'assert-source', () => HEAD), /candidate-source-or-build-drift/);
  assert.deepEqual(readFileSync(resolve(f.root, '.next/BUILD_ID')), beforeBuild);
  put(file, 'export const source = 1;'); put(resolve(f.root, '.next/static/chunks/page.js'), 'changed asset');
  assert.throws(() => assertReleaseEvidence(baseline, manifest, 'assert-source', () => HEAD), /candidate-source-or-build-drift/);
});

test('local CLI output is append-only, hash-only and both assertions bind to the same exact manifest', t => {
  const f = fixture(t), args = ['capture', 'unit-capture', f.manifestPath];
  const result = runReleaseEvidence(args, f.root, () => HEAD);
  assert.equal(result.sourceCount, 2); assert.equal(result.staticAssetCount, 2); assert.equal(result.protectedCount, 7);
  assert(!JSON.stringify(result).includes(SECRET)); assert(!JSON.stringify(result).includes(f.directory));
  assert.throws(() => runReleaseEvidence(args, f.root, () => HEAD), /evidence-already-recorded/);
  for (const mode of ['assert-source', 'assert-preserved']) assert.equal(runReleaseEvidence([mode, 'unit-capture', f.manifestPath], f.root, () => HEAD).drift, 0);
  put(f.manifestPath, JSON.stringify({ ...f.input, candidateSourcePaths: ['app/alpha/page.tsx'] }));
  assert.throws(() => runReleaseEvidence(['assert-source', 'unit-capture', f.manifestPath], f.root, () => HEAD), /baseline-rejected/);
});

test('CLI rejects invalid modes/labels, output collisions and manifests outside ignored local output', t => {
  const f = fixture(t);
  for (const args of [['deploy', 'unit', f.manifestPath], ['capture', '../escape', f.manifestPath],
    ['capture', 'unit'], ['capture', 'evidence-manifest', f.manifestPath]]) {
    assert.throws(() => runReleaseEvidence(args, f.root, () => HEAD), /rejected|collision/);
  }
  const externalManifest = resolve(f.directory, 'outside.json'); put(externalManifest, JSON.stringify(f.input));
  assert.throws(() => runReleaseEvidence(['capture', 'unit', externalManifest], f.root, () => HEAD), /path-outside-root/);
});

test('folder browser config accepts only local/remote-readonly and keeps results separated by mode', () => {
  const url = pathToFileURL(resolve(ROOT, 'tests/e2e/folder-content-entry.config.ts')).href;
  const script = `const value = (await import(${JSON.stringify(url)})).default; const config = value.default ?? value; console.log(JSON.stringify({outputDir:config.outputDir,reporter:config.reporter,use:config.use,webServer:config.webServer}));`;
  const inspect = mode => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script],
    { cwd: ROOT, env: { ...process.env, FLOWME_CLOUDFLARE_QA_MODE: mode, FLOWME_FOLDER_CONTENT_ENTRY_RUN: 'adapter-unit' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  const local = inspect('local'), remote = inspect('remote-readonly');
  assert(local.outputDir.endsWith(`folder-content-entry-adapter-unit-local${sep}artifacts`));
  assert(remote.outputDir.endsWith(`folder-content-entry-adapter-unit-remote-readonly${sep}artifacts`));
  assert.notEqual(local.outputDir, remote.outputDir);
  assert.equal(local.use.baseURL, 'https://alpha.wikiplans.com'); assert.equal(remote.use.baseURL, local.use.baseURL);
  assert.equal(local.use.serviceWorkers, 'block'); assert.equal(remote.webServer, undefined);
  assert.throws(() => inspect('remote-write'));
});
