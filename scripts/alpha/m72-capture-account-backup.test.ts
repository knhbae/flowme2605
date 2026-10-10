import assert from 'node:assert/strict';
import test from 'node:test';
import { ALPHA_SCHEMA } from '../../lib/flow/integrated-poc/alpha-persistence/contract';
import { canonicalJson, sha256 } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import { createAccountBackup } from '../../lib/flow/integrated-poc/alpha-preservation/backup';
import { SEALED_BACKUP_SCHEMA, PRESERVATION_PROTOCOL } from '../../lib/flow/integrated-poc/alpha-preservation/contract';
import { PROGRAM_SCHEMA } from '../../lib/flow/integrated-poc/contract';
import { createProgramPrivateSpace } from '../../lib/flow/integrated-poc/program-data';
import { emptyAlphaReferences } from '../../lib/flow/integrated-poc/alpha-social/projection';
import type { AlphaAuthConfig } from '../../lib/flow/integrated-poc/alpha-auth/config';
import { captureAccountBackup } from './m72-capture-account-backup';
import { BACKUP_DOWNLOAD_FORMAT, BACKUP_DOWNLOAD_SCHEMA } from '../../lib/flow/integrated-poc/alpha-preservation/backup-download';
import { decodeBackupFile, encodeBackupFile } from '../../lib/flow/integrated-poc/alpha-preservation/file-codec';

const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const config: AlphaAuthConfig = { stage: 'development', url: 'https://wkmzcxpnojobxrgebapw.supabase.co',
  publishableKey: 'sb_publishable_fixture', redirectUrl: 'http://localhost:3104/auth/callback' };
const credential = Object.freeze({ email: 'private@example.test', password: 'DO-NOT-PRINT-password' });
const token = 'fixture-token-with-sufficient-length';
async function fixture() {
  const backup = await createAccountBackup({ account: { schema: ALPHA_SCHEMA, ownerId: owner, revision: 7,
    source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 }, space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] },
    references: emptyAlphaReferences(owner), operations: [], importArchives: [], createdAt: '2026-09-23T04:40:00.000Z' },
  async () => { throw Error('media-network-forbidden'); });
  return { schema: SEALED_BACKUP_SCHEMA, backup, proof: 'a'.repeat(64) };
}
async function harness(options: { signed?: object; badBackup?: boolean; preview?: object; logoutFailure?: boolean; failedStage?: 'login' | 'backup' | 'preview';
  checkedFile?: boolean; noncanonicalRaw?: boolean; changeFile?: (file: string) => string } = {}) {
  const backup = await fixture();
  const raw = options.noncanonicalRaw ? JSON.stringify(backup, null, 2) : canonicalJson(backup);
  // Whitespace exposes accidental file regeneration or raw canonicalization.
  const encoded = await encodeBackupFile(raw);
  const file = options.changeFile?.(encoded) ?? JSON.stringify(JSON.parse(encoded), null, 2);
  const preview = { ownerId: owner, mode: 'restore', sourceSha256: await sha256(Buffer.from(raw)),
    expectedRevision: 7, expectedPublicRevision: 0, same: true, canApply: false, details: [], ...options.preview };
  const calls: { url: string; method: string; body: any; headers: Headers }[] = [];
  const fetcher = (async (input, init) => {
    const url = String(input), body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const headers = new Headers(init?.headers); calls.push({ url, method: init?.method ?? 'GET', body, headers });
    assert.equal(init?.redirect, 'error'); assert(init?.signal); assert.equal(init?.method, 'POST');
    if (url === `${config.url}/auth/v1/token?grant_type=password`) {
      assert.deepEqual(body, credential); assert.equal(headers.get('apikey'), config.publishableKey);
      if (options.failedStage === 'login') return Response.json({ error: 'denied' }, { status: 400 });
      return Response.json({ access_token: token, user: { id: owner, email: credential.email, is_anonymous: false }, ...options.signed });
    }
    assert.equal(headers.get('authorization'), `Bearer ${token}`);
    if (url === `${config.url}/auth/v1/logout?scope=local`) {
      assert.equal(body, undefined); return new Response(null, { status: options.logoutFailure ? 503 : 204 });
    }
    assert.equal(url, 'http://localhost:3104/api/alpha/preservation');
    assert.equal(headers.get('origin'), 'http://localhost:3104'); assert.equal(body.client, PRESERVATION_PROTOCOL.client);
    if (body.kind === 'backup') {
      assert.deepEqual(Object.keys(body).sort(), ['client', 'format', 'kind']);
      assert.equal(body.format, BACKUP_DOWNLOAD_FORMAT);
      return Response.json(options.failedStage === 'backup' ? { ok: false, reason: 'revision-conflict' }
        : { ok: true, value: options.badBackup ? { ...backup, proof: 'bad' }
          : options.checkedFile ? { schema: BACKUP_DOWNLOAD_SCHEMA, file } : backup });
    }
    assert.equal(body.kind, 'preview', 'No commit, import, cleanup or setup is allowed');
    assert.equal(body.mode, 'restore'); assert.equal(body.actorId, '');
    assert.equal(body.sourceRaw, undefined); assert.equal(await decodeBackupFile(body.sourceFile), raw);
    if (options.checkedFile) assert.equal(body.sourceFile, file);
    return Response.json(options.failedStage === 'preview' ? { ok: false, reason: 'invalid-backup' } : { ok: true, value: preview });
  }) as typeof fetch;
  return { calls, fetcher, backup, raw, file };
}

test('checked file capture preserves exact received file and decoded bytes without recompression', async () => {
  const h = await harness({ checkedFile: true, noncanonicalRaw: true });
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'CompressionStream')!;
  Object.defineProperty(globalThis, 'CompressionStream', { configurable: true, value: undefined });
  try {
    const result = await captureAccountBackup(config, credential, owner, h.fetcher);
    assert.equal(result.file, h.file); assert.equal(result.raw, h.raw);
    assert.equal(result.inspection.decodedFileSha256, await sha256(Buffer.from(h.raw)));
    assert.notEqual(await sha256(Buffer.from(h.file)), result.inspection.decodedFileSha256);
    assert.equal(h.calls.length, 4); assert(h.calls.at(-1)?.url.endsWith('/logout?scope=local'));
  } finally { Object.defineProperty(globalThis, 'CompressionStream', descriptor); }
});

for (const [label, changeFile] of Object.entries({
  'damaged content digest': (file: string) => JSON.stringify({ ...JSON.parse(file), sha256: '0'.repeat(64) }),
  'unsupported file schema': (file: string) => JSON.stringify({ ...JSON.parse(file), schema: 'unknown' }),
  'truncated file': (file: string) => file.slice(0, -1),
  'uncompressed payload': () => JSON.stringify({ schema: SEALED_BACKUP_SCHEMA }),
})) {
  test(`checked file ${label} is rejected before server preview`, async () => {
    const h = await harness({ checkedFile: true, changeFile });
    await assert.rejects(captureAccountBackup(config, credential, owner, h.fetcher), /backup-integrity-failed/);
    assert.equal(h.calls.length, 3); assert(h.calls.at(-1)?.url.endsWith('/logout?scope=local'));
  });
}

test('checked file hash cannot substitute for decoded source hash in server preview', async () => {
  const seed = await harness({ checkedFile: true });
  const h = await harness({ checkedFile: true, preview: { sourceSha256: await sha256(Buffer.from(seed.file)) } });
  await assert.rejects(captureAccountBackup(config, credential, owner, h.fetcher), /snapshot-changed-or-preview-failed/);
  assert.equal(h.calls.length, 4); assert(h.calls.at(-1)?.url.endsWith('/logout?scope=local'));
});

test('checked file still requires server seal verification and no-change preview', async () => {
  const h = await harness({ checkedFile: true, failedStage: 'preview' });
  await assert.rejects(captureAccountBackup(config, credential, owner, h.fetcher), /preview-unavailable/);
  assert.equal(h.calls.length, 4); assert(h.calls.at(-1)?.url.endsWith('/logout?scope=local'));
  assert(h.calls.every(call => call.body?.kind !== 'commit'));
});

test('selected account backup and server no-change preview are read-only and logout is local only', async () => {
  const h = await harness(), result = await captureAccountBackup(config, credential, owner, h.fetcher);
  assert.equal(result.raw, canonicalJson(h.backup)); assert(result.inspection.ok);
  assert.deepEqual(result.serverPreview, { same: true, canApply: false, revision: 7 });
  assert.equal(h.calls.length, 4); assert(h.calls.at(-1)?.url.endsWith('/logout?scope=local'));
  assert(!JSON.stringify(result.inspection).includes(credential.password));
  assert.equal(credential.password, 'DO-NOT-PRINT-password');
});
test('production, alternate origins and malformed owner are refused before any request', async () => {
  const h = await harness();
  for (const bad of [{ ...config, stage: 'preview' }, { ...config, url: 'https://production.supabase.co' },
    { ...config, redirectUrl: 'http://localhost:3000/auth/callback' }]) {
    await assert.rejects(captureAccountBackup(bad as AlphaAuthConfig, credential, owner, h.fetcher), /development-binding-required/);
  }
  await assert.rejects(captureAccountBackup(config, credential, 'not-owner', h.fetcher), /development-binding-required/);
  assert.equal(h.calls.length, 0);
});
for (const label of ['owner', 'email', 'anonymous'] as const) {
  test(`wrong ${label} logs out the new session without accessing account data`, async () => {
    const user = { id: label === 'owner' ? other : owner, email: label === 'email' ? 'other@example.test' : credential.email, is_anonymous: label === 'anonymous' };
    const h = await harness({ signed: { user } });
    await assert.rejects(captureAccountBackup(config, credential, owner, h.fetcher), /account-binding-mismatch/);
    assert.equal(h.calls.length, 2); assert(h.calls[1].url.endsWith('/logout?scope=local'));
  });
}
test('unsuccessful signin does not send a logout or data request', async () => {
  const h = await harness({ failedStage: 'login' });
  await assert.rejects(captureAccountBackup(config, credential, owner, h.fetcher), /request-rejected/); assert.equal(h.calls.length, 1);
});
for (const failedStage of ['backup', 'preview'] as const) {
  test(`${failedStage} failure is not treated as a backup success and still revokes only its own session`, async () => {
    const h = await harness({ failedStage }); await assert.rejects(captureAccountBackup(config, credential, owner, h.fetcher), /unavailable/);
    assert(h.calls.at(-1)?.url.endsWith('/logout?scope=local')); assert(h.calls.every(call => call.body?.kind !== 'commit'));
  });
}
test('corrupt backup is refused before preview', async () => {
  const h = await harness({ badBackup: true });
  await assert.rejects(captureAccountBackup(config, credential, owner, h.fetcher), /backup-integrity-failed/);
  assert.equal(h.calls.length, 3); assert(h.calls.at(-1)?.url.endsWith('/logout?scope=local'));
});
for (const [field, value] of Object.entries({ ownerId: other, mode: 'import', sourceSha256: '0'.repeat(64),
  expectedRevision: 8, same: false, canApply: true, details: ['unresolved'] })) {
  test(`preview ${field} disagreement prevents a verified backup result`, async () => {
    const h = await harness({ preview: { [field]: value } });
    await assert.rejects(captureAccountBackup(config, credential, owner, h.fetcher), /snapshot-changed-or-preview-failed/);
    assert.equal(h.calls.length, 4); assert(h.calls.at(-1)?.url.endsWith('/logout?scope=local'));
  });
}
test('logout failure cannot claim a clean session close', async () => {
  const h = await harness({ logoutFailure: true });
  await assert.rejects(captureAccountBackup(config, credential, owner, h.fetcher), /own-session-logout-failed/);
});
