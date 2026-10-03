import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assertUxExactBuild, assertUxObservedAssets, captureUxExactBuild, loadUxExactBuild,
  UX_EXACT_QA_PATHS, UX_EXACT_REQUIRED_COMPILE_PATHS } from './ux-exact-build';

function fixture(run: (root: string) => void) {
  const root = mkdtempSync(path.join(tmpdir(), 'flowme-ux-exact-'));
  try {
    for (const name of [...UX_EXACT_REQUIRED_COMPILE_PATHS, ...UX_EXACT_QA_PATHS, '.next/BUILD_ID', '.next/static/css/style.css', '.next/static/chunks/app.js']) {
      mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      writeFileSync(path.join(root, name), name === '.next/BUILD_ID' ? 'synthetic-build_1' : name === 'tsconfig.json' ? '{"compilerOptions":{"moduleResolution":"bundler","module":"esnext"}}' : `// synthetic:${name}\n`);
    }
    execFileSync('git', ['init', '-q', root], { windowsHide: true, stdio: 'ignore' });
    execFileSync('git', ['-C', root, '-c', 'user.name=Synthetic fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--allow-empty', '-qm', 'Synthetic exact-build fixture'], { windowsHide: true, stdio: 'ignore' });
    run(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}
const rejected = (run: () => unknown) => assert.throws(run, /ux-exact-build-rejected/);

test('explicit manifest binds provided root, HEAD, build, real inputs and every static file', () => fixture(root => {
  const proof = captureUxExactBuild(root, UX_EXACT_REQUIRED_COMPILE_PATHS);
  const file = path.join(root, 'proof.json'); writeFileSync(file, JSON.stringify(proof));
  assert.deepEqual(loadUxExactBuild({ FLOWME_UX_COMPARISON_EXACT_BUILD_FILE: file }, root), proof);
  assert.equal(proof.staticAssets.length, 2);
  assertUxObservedAssets(proof, proof.staticAssets.map(item => ({ ...item, path: item.path.replace(/^\.next\//, '/_next/') })), root);
}));

test('missing or relative manifest never falls back to old provided root or current working build', () => {
  for (const value of [undefined, '', 'proof.json', '../proof.json', 'missing\nproof'])
    rejected(() => loadUxExactBuild({ FLOWME_UX_COMPARISON_EXACT_BUILD_FILE: value }));
});

test('head, build, CSS, compatibility compiler and QA drift fail closed', () => fixture(root => {
  const proof = captureUxExactBuild(root, UX_EXACT_REQUIRED_COMPILE_PATHS);
  rejected(() => assertUxExactBuild({ ...proof, head: 'f'.repeat(40) }, root));
  rejected(() => assertUxExactBuild({ ...proof, buildId: 'old-build' }, root));
  for (const name of ['.next/BUILD_ID', 'app/globals.css', 'scripts/tailwind-v3-compat.cjs', UX_EXACT_QA_PATHS[0]]) {
    const file = path.join(root, name), before = readFileSync(file);
    writeFileSync(file, 'drift'); rejected(() => assertUxExactBuild(proof, root)); writeFileSync(file, before);
  }
  assertUxExactBuild(proof, root);
}));

test('omitted compiler or QA entry and duplicate paths cannot pass the new checkpoint', () => fixture(root => {
  const proof = captureUxExactBuild(root, UX_EXACT_REQUIRED_COMPILE_PATHS);
  rejected(() => assertUxExactBuild({ ...proof, compileInputs: proof.compileInputs.filter(file => file.path !== 'scripts/tailwind-v3-compat.cjs') }, root));
  rejected(() => assertUxExactBuild({ ...proof, qaInputs: proof.qaInputs.slice(1) }, root));
  rejected(() => assertUxExactBuild({ ...proof, compileInputs: [...proof.compileInputs, proof.compileInputs[0]] }, root));
}));

test('static manifest cannot omit existing assets or ignore new or changed files', () => fixture(root => {
  const proof = captureUxExactBuild(root, UX_EXACT_REQUIRED_COMPILE_PATHS);
  rejected(() => assertUxExactBuild({ ...proof, staticAssets: proof.staticAssets.slice(1) }, root));
  writeFileSync(path.join(root, '.next/static/chunks/new.js'), 'new'); rejected(() => assertUxExactBuild(proof, root));
  rmSync(path.join(root, '.next/static/chunks/new.js'));
  writeFileSync(path.join(root, '.next/static/chunks/app.js'), 'changed'); rejected(() => assertUxExactBuild(proof, root));
}));

test('traversal, broad roots, private source/config and malformed hashes are rejected', () => fixture(root => {
  const proof = captureUxExactBuild(root, UX_EXACT_REQUIRED_COMPILE_PATHS);
  for (const name of ['../outside', '/outside', 'app\\other', '.tmp/config.json', '.env.local', 'lib/flow/integrated-poc/catalog-library-pack.v1.json'])
    rejected(() => assertUxExactBuild({ ...proof, compileInputs: [...proof.compileInputs, { path: name, sha256: 'f'.repeat(64) }] }, root));
  rejected(() => assertUxExactBuild({ ...proof, providedRoot: path.parse(root).root }, root));
  rejected(() => assertUxExactBuild({ ...proof, staticAssets: [{ ...proof.staticAssets[0], sha256: 'bad' }] }, root));
}));

test('observed assets must be nonempty, known, unique and exact; API URLs never match', () => fixture(root => {
  const proof = captureUxExactBuild(root, UX_EXACT_REQUIRED_COMPILE_PATHS);
  const asset = { ...proof.staticAssets[0], path: proof.staticAssets[0].path.replace(/^\.next\//, '/_next/') };
  rejected(() => assertUxObservedAssets(proof, [], root));
  rejected(() => assertUxObservedAssets(proof, [asset, asset], root));
  rejected(() => assertUxObservedAssets(proof, [{ ...asset, path: '/api/alpha/account' }], root));
  rejected(() => assertUxObservedAssets(proof, [{ ...asset, sha256: 'f'.repeat(64) }], root));
  assertUxObservedAssets(proof, [asset], root);
}));

test('linked static directories are not silently followed into a different asset tree', () => fixture(root => {
  const proof = captureUxExactBuild(root, UX_EXACT_REQUIRED_COMPILE_PATHS);
  symlinkSync(path.join(root, '.next/static/css'), path.join(root, '.next/static/css-linked'), 'junction');
  rejected(() => assertUxExactBuild(proof, root));
  rejected(() => captureUxExactBuild(root, UX_EXACT_REQUIRED_COMPILE_PATHS));
}));

test('actual runner root and head are bound; r6 proof cannot validate a different r7 runner', () => fixture(root => {
  const runner = `${root}-runner`;
  try {
    cpSync(root, runner, { recursive: true });
    const proof = captureUxExactBuild(root, UX_EXACT_REQUIRED_COMPILE_PATHS, UX_EXACT_QA_PATHS, runner);
    assertUxExactBuild(proof, runner);
    rejected(() => assertUxExactBuild(proof, root));
    const file = path.join(root, 'proof.json'); writeFileSync(file, JSON.stringify(proof));
    rejected(() => loadUxExactBuild({ FLOWME_UX_COMPARISON_EXACT_BUILD_FILE: file }, root));
    writeFileSync(path.join(runner, UX_EXACT_QA_PATHS[0]), '// different r7 cases');
    rejected(() => loadUxExactBuild({ FLOWME_UX_COMPARISON_EXACT_BUILD_FILE: file }, runner));
    rejected(() => captureUxExactBuild(root, UX_EXACT_REQUIRED_COMPILE_PATHS, UX_EXACT_QA_PATHS, runner));
  } finally { rmSync(runner, { recursive: true, force: true }); }
}));

test('entire local QA dependency closure is captured and omitted, missing or drifted imported inputs fail', () => fixture(root => {
  const browser = path.join(root, UX_EXACT_QA_PATHS[0]), nested = 'tests/e2e/exact-nested.fixture.ts', dependency = 'lib/exact-qa-model.ts';
  mkdirSync(path.dirname(path.join(root, dependency)), { recursive: true });
  writeFileSync(browser, "import './alpha-auth.fixture'; export * from './exact-nested.fixture';\n");
  writeFileSync(path.join(root, nested), "import type { QaModel } from '../../lib/exact-qa-model'; const x = import('./cloudflare-release.fixture'); const y = require('./folder-content-entry.fixture');\n");
  writeFileSync(path.join(root, dependency), 'export type QaModel = {};');
  const proof = captureUxExactBuild(root, UX_EXACT_REQUIRED_COMPILE_PATHS);
  assert.ok(proof.qaInputs.some(file => file.path === nested)); assert.ok(proof.qaInputs.some(file => file.path === dependency));
  for (const name of [nested, dependency, 'tests/e2e/alpha-auth.fixture.ts', 'tests/e2e/cloudflare-release.fixture.ts', 'tests/e2e/folder-content-entry.fixture.ts']) {
    rejected(() => assertUxExactBuild({ ...proof, qaInputs: proof.qaInputs.filter(file => file.path !== name) }, root));
    const file = path.join(root, name), before = readFileSync(file); writeFileSync(file, '// drift');
    rejected(() => assertUxExactBuild(proof, root)); writeFileSync(file, before);
  }
  rmSync(path.join(root, dependency)); rejected(() => assertUxExactBuild(proof, root));
}));
