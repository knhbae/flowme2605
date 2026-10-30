import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, readFile, unlink, rmdir, rename, mkdir, symlink, open } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAccountBackup } from '../../lib/flow/integrated-poc/alpha-preservation/backup';
import { SEALED_BACKUP_SCHEMA } from '../../lib/flow/integrated-poc/alpha-preservation/contract';
import { createProgramPrivateSpace } from '../../lib/flow/integrated-poc/program-data';
import { PROGRAM_SCHEMA } from '../../lib/flow/integrated-poc/contract';
import { ALPHA_SCHEMA } from '../../lib/flow/integrated-poc/alpha-persistence/contract';
import { emptyAlphaReferences } from '../../lib/flow/integrated-poc/alpha-social/projection';
import { canonicalJson } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import { checkPersonalBackupFiles } from './m7-personal-backup-check';

const owner = '11111111-1111-4111-8111-111111111111';
async function fixture() {
  const backup = await createAccountBackup({ account: { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0,
    source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 }, space: createProgramPrivateSpace(),
    legacyReceipts: [], legacyUndo: [] }, references: emptyAlphaReferences(owner), operations: [],
    importArchives: [], createdAt: '2026-09-24T04:00:00.000Z' }, async () => { throw Error('no-network'); });
  return Buffer.from(canonicalJson({ schema: SEALED_BACKUP_SCHEMA, backup, proof: 'a'.repeat(64) }));
}

// The digest hook schedules an actual filesystem change after the first read.
// No sleep/race timing assumption, fabricated fs stat, or product test hook.
for (const operation of ['edit', 'replace-identical', 'remove'] as const) {
  test(`primary ${operation} during payload validation must not certify the stale file and copy`, async t => {
    const directory = await mkdtemp(path.join(tmpdir(), 'flowme-m72-file-race-'));
    const primary = path.join(directory, 'primary.json'), copy = path.join(directory, 'copy.json'), moved = path.join(directory, 'moved.json');
    t.after(async () => {
      for (const file of [primary, copy, moved]) {
        try { await unlink(file); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      }
      await rmdir(directory);
    });
    const raw = await fixture();
    await writeFile(primary, raw, { flag: 'wx' }); await writeFile(copy, raw, { flag: 'wx' });
    const digest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    let changed = false;
    t.mock.method(globalThis.crypto.subtle, 'digest', async (...args: Parameters<typeof digest>) => {
      if (!changed) {
        changed = true;
        if (operation === 'edit') await writeFile(primary, Buffer.concat([raw, Buffer.from('\n')]));
        else if (operation === 'replace-identical') { await rename(primary, moved); await writeFile(primary, raw, { flag: 'wx' }); }
        else await unlink(primary);
      }
      return digest(...args);
    });
    const result = await checkPersonalBackupFiles({ backupPath: primary, copyPath: copy });
    assert.equal(changed, true);
    assert.deepEqual(result, { ok: false, reason: 'file-changed' });
    assert.deepEqual(await readFile(copy), raw);
    assert(!JSON.stringify(result).includes(directory));
  });
}

test('same-length in-place change is rejected even without a second copy', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'flowme-m72-same-length-'));
  const file = path.join(directory, 'primary.json');
  t.after(async () => { await unlink(file); await rmdir(directory); });
  const raw = await fixture(); await writeFile(file, raw, { flag: 'wx' });
  const digest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
  let changed = false;
  t.mock.method(globalThis.crypto.subtle, 'digest', async (...args: Parameters<typeof digest>) => {
    if (!changed) {
      changed = true;
      const handle = await open(file, 'r+');
      try { await handle.write(Buffer.from('['), 0, 1, 0); } finally { await handle.close(); }
    }
    return digest(...args);
  });
  assert.deepEqual(await checkPersonalBackupFiles({ backupPath: file }), { ok: false, reason: 'file-changed' });
  assert.equal((await readFile(file)).length, raw.length);
});

test('directory aliases do not count as copies and changing their target invalidates the check', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'flowme-m72-alias-'));
  const a = path.join(directory, 'a'), b = path.join(directory, 'b'), alias = path.join(directory, 'alias');
  const first = path.join(a, 'backup.json'), second = path.join(b, 'backup.json'), selected = path.join(alias, 'backup.json');
  let aliasCreated = false;
  t.after(async () => {
    if (aliasCreated) { if (process.platform === 'win32') await rmdir(alias); else await unlink(alias); }
    for (const file of [first, second]) await unlink(file);
    await rmdir(a); await rmdir(b); await rmdir(directory);
  });
  const raw = await fixture(); await mkdir(a); await mkdir(b);
  await writeFile(first, raw, { flag: 'wx' }); await writeFile(second, raw, { flag: 'wx' });
  // Windows junctions need no developer-mode/elevation unlike file symlinks.
  await symlink(a, alias, 'junction'); aliasCreated = true;
  assert.deepEqual(await checkPersonalBackupFiles({ backupPath: selected, copyPath: first }), { ok: false, reason: 'same-file' });
  const stable = await checkPersonalBackupFiles({ backupPath: selected, copyPath: second });
  assert(stable.ok); assert.equal(stable.independentStorage, 'not-verified');
  const digest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle); let switched = false;
  t.mock.method(globalThis.crypto.subtle, 'digest', async (...args: Parameters<typeof digest>) => {
    if (!switched) {
      switched = true;
      if (process.platform === 'win32') await rmdir(alias); else await unlink(alias);
      aliasCreated = false; await symlink(b, alias, 'junction'); aliasCreated = true;
    }
    return digest(...args);
  });
  assert.deepEqual(await checkPersonalBackupFiles({ backupPath: selected, copyPath: first }), { ok: false, reason: 'file-changed' });
  assert.equal(switched, true);
  assert.deepEqual(await readFile(first), raw); assert.deepEqual(await readFile(second), raw);
});

test('special device input is rejected without hanging or emitting a private path', () => {
  const file = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const child = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/alpha/m7-personal-backup-check.ts', '--backup', file],
    { encoding: 'utf8', windowsHide: true, timeout: 10_000 });
  assert.equal(child.error, undefined); assert.equal(child.status, 1);
  assert.deepEqual(JSON.parse(child.stdout), { ok: false, reason: 'unreadable-file' });
  assert.equal(child.stderr, '');
});
