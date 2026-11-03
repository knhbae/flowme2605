import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { alphaRuntimeClosure, classifyRenderReleasePath, inspectReleaseBytes, safeReleasePath, sourceImportSpecs, trackedCatalogArtifacts } from './render-release-inventory.mjs';

test('release paths are review categories, not an implicit publication allowlist', () => {
  assert.equal(classifyRenderReleasePath('app/alpha/page.tsx'), 'runtime-review');
  assert.equal(classifyRenderReleasePath('lib/flow/integrated-poc/alpha-server/command-handler.ts'), 'runtime-review');
  assert.equal(classifyRenderReleasePath('lib/flow/integrated-poc/alpha-server/command-handler.test.ts'), 'verification-review');
  assert.equal(classifyRenderReleasePath('supabase/migrations/20260920.sql'), 'schema-review');
  assert.equal(classifyRenderReleasePath('supabase/candidates/experimental.sql'), 'exclude-candidate-sql');
  assert.equal(classifyRenderReleasePath('scripts/alpha/m72-delegated-trial-driver.ts'), 'exclude-private-driver');
  assert.equal(classifyRenderReleasePath('scripts/alpha/m7-live.ts'), 'tooling-review');
  assert.equal(classifyRenderReleasePath('scripts/alpha/patch-auth-debug-probe.mjs'), 'build-review');
  assert.equal(classifyRenderReleasePath('docs/STATUS.md'), 'documentation-review');
  assert.equal(classifyRenderReleasePath('unknown/private.json'), 'unclassified');
  assert.equal(classifyRenderReleasePath('lib/flow/integrated-poc/catalog-library-pack.v1.json'), 'exclude-private-catalog');
});

test('private catalog bytes remain flagged after renaming, gzip or text wrapping', () => {
  const raw = Buffer.from(JSON.stringify({ catalogVersion: 'flowme-previous-poc-content-synthetic-test', bundles: [], maps: [], policies: {}, variants: [] }));
  for (const bytes of [raw, gzipSync(raw), Buffer.from(`FLOWME-CATALOG-GZIP-BASE64-V1\n${gzipSync(raw).toString('base64')}\n`)]) {
    assert(inspectReleaseBytes('renamed.json', bytes).includes('private-catalog-payload'));
  }
  assert.deepEqual(inspectReleaseBytes('safe.json', Buffer.from('{"bundles":[],"maps":[]}')), []);
});

test('tracked catalog check inspects the index file set and does not mistake an untracked local source for publication', () => {
  const root = mkdtempSync(join(tmpdir(), 'flowme-tracked-catalog-test-'));
  const git = args => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  try {
    git(['init', '--quiet']);
    writeFileSync(join(root, 'safe.json'), '{}');
    const raw = Buffer.from(JSON.stringify({ catalogVersion: 'flowme-previous-poc-content-synthetic-test', bundles: [], maps: [], policies: {}, variants: [] }));
    writeFileSync(join(root, 'local.json'), raw);
    git(['add', '--', 'safe.json']);
    assert.deepEqual(trackedCatalogArtifacts(root), { checkedFiles: 1, findings: [] });
    writeFileSync(join(root, 'renamed.bin'), gzipSync(raw));
    git(['add', '--', 'renamed.bin']);
    assert.deepEqual(trackedCatalogArtifacts(root), { checkedFiles: 2, findings: [
      { path: 'renamed.bin', knownPrivatePath: false, signals: ['private-catalog-payload'] },
    ] });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('findings report types only, never matching values', () => {
  const example = ['postgres://name:', 'password', '@', 'example.invalid/db'].join('');
  const findings = inspectReleaseBytes('example.sql', Buffer.from(example));
  assert.deepEqual(findings, ['postgres-password-url', 'email-address']);
  assert.ok(!JSON.stringify(findings).includes(example));
  assert.deepEqual(inspectReleaseBytes('photo.png', Buffer.from([0, 1, 2])), ['non-text-review']);
});

test('inventory path cannot leave the supplied checkout', () => {
  assert.throws(() => safeReleasePath(process.cwd(), '../outside.txt'), /outside release workspace/);
});

test('source import scan includes static, type, and dynamic imports', () => {
  assert.deepEqual(sourceImportSpecs("import './base.css'; type T = import('./types').T; const child = import('./child');"),
    ['./base.css', './types', './child']);
});

test('alpha entry closure resolves every local import without treating it as the entire app', () => {
  const closure = alphaRuntimeClosure(process.cwd());
  assert.deepEqual(closure.entries, [
    'app/alpha/page.tsx', 'app/api/alpha/account/route.ts', 'app/api/alpha/catalog/route.ts',
    'app/api/alpha/creator/route.ts', 'app/api/alpha/health/route.ts', 'app/api/alpha/media/route.ts',
    'app/api/alpha/preservation/route.ts', 'app/api/alpha/social/route.ts', 'app/auth/callback/page.tsx',
  ]);
  assert.deepEqual(closure.unresolved, []);
  assert.ok(closure.totalFiles >= closure.entries.length);
  assert.deepEqual(closure.dirtyPaths, [...closure.dirtyPaths].sort());
  assert.equal(closure.dirtyPathListSha256,
    createHash('sha256').update(closure.dirtyPaths.join('\n') + '\n').digest('hex'));
});
