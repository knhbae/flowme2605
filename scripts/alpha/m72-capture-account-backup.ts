/** Explicit real-account read/backup only. Never run fixture setup, cleanup or a commit. */
import { readFile, open, lstat, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { readAlphaAuthConfig, isAlphaAuthConfig, type AlphaAuthConfig } from '../../lib/flow/integrated-poc/alpha-auth/config';
import { PRESERVATION_PROTOCOL } from '../../lib/flow/integrated-poc/alpha-preservation/contract';
import { inspectPersonalBackup, checkPersonalBackupFiles } from './m7-personal-backup-check';
import { BACKUP_DOWNLOAD_FORMAT, readBackupDownload } from '../../lib/flow/integrated-poc/alpha-preservation/backup-download';
import { preparePreservationWireRequest } from '../../lib/flow/integrated-poc/alpha-preservation/transport';
import { acquireM3LiveLock } from './m3-live-lock';

const APP = 'http://localhost:3104';
const PROJECT = 'wkmzcxpnojobxrgebapw';
const ROOT = 'D:/FlowMe-Backups';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function need(value: unknown, code: string): asserts value { if (!value) throw Error(code); }
export type Credential = { email: string; password: string };

async function json(response: Response): Promise<any> {
  need(response.ok, 'request-rejected');
  const reader = response.body?.getReader(); need(reader, 'empty-response');
  const chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const next = await reader.read(); if (next.done) break;
    size += next.value.length; if (size > PRESERVATION_PROTOCOL.bytes) { await reader.cancel(); throw Error('response-limit'); }
    chunks.push(next.value);
  } } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Error('invalid-response'); }
}

export async function captureAccountBackup(config: AlphaAuthConfig, credential: Credential, expectedOwner: string, fetcher: typeof fetch = fetch) {
  need(isAlphaAuthConfig(config) && config.stage === 'development' && config.url === `https://${PROJECT}.supabase.co`
    && config.redirectUrl === `${APP}/auth/callback` && uuid.test(expectedOwner), 'development-binding-required');
  need(typeof credential.email === 'string' && credential.email.includes('@')
    && typeof credential.password === 'string' && credential.password.length > 0, 'credential-required');
  let token: string | undefined;
  try {
    const signed = await json(await fetcher(`${config.url}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: config.publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: credential.email, password: credential.password }), redirect: 'error', signal: AbortSignal.timeout(30_000),
    }));
    // Track the newly created session before checking identity so rejection still revokes it.
    if (typeof signed.access_token === 'string' && /^[A-Za-z0-9_.-]{20,8192}$/.test(signed.access_token)) token = signed.access_token;
    need(token && signed.user?.id === expectedOwner && signed.user?.email?.toLowerCase() === credential.email.toLowerCase()
      && signed.user.is_anonymous !== true, 'account-binding-mismatch');
    const api = async (body: object) => json(await fetcher(`${APP}/api/alpha/preservation`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Origin: APP },
      body: JSON.stringify(await preparePreservationWireRequest({ ...body, client: PRESERVATION_PROTOCOL.client })), redirect: 'error', signal: AbortSignal.timeout(30_000),
    }));
    const response = await api({ kind: 'backup', format: BACKUP_DOWNLOAD_FORMAT }); need(response.ok === true && response.value, 'backup-unavailable');
    const { raw, file } = await readBackupDownload(response.value, expectedOwner).catch(() => { throw Error('backup-integrity-failed'); });
    // Keep raw inspection/hash semantics distinct from the encoded file bytes.
    const inspection = await inspectPersonalBackup(Buffer.from(raw), expectedOwner);
    need(inspection.ok, 'backup-integrity-failed');
    // Reuse the checked file for preview rather than reconstructing its request.
    // Only server preview authenticates its seal and current relationship.
    const previewResponse = await api({ kind: 'preview', mode: 'restore', sourceFile: file, actorId: '' });
    need(previewResponse.ok === true && previewResponse.value, 'preview-unavailable');
    const preview = previewResponse.value;
    need(preview.ownerId === expectedOwner && preview.mode === 'restore' && preview.sourceSha256 === inspection.fileSha256
      && preview.same === true && preview.canApply === false && preview.expectedRevision === inspection.revision
      && Array.isArray(preview.details) && preview.details.length === 0, 'snapshot-changed-or-preview-failed');
    return { raw, file, inspection, serverPreview: { same: true, canApply: false, revision: preview.expectedRevision } };
  } finally {
    if (token) {
      const response = await fetcher(`${config.url}/auth/v1/logout?scope=local`, { method: 'POST',
        headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(30_000) });
      need(response.ok, 'own-session-logout-failed');
    }
  }
}

async function main() {
  // No paths, keys or account values in failure logs. CLI emails are explicit user selections.
  const [flag, role, email, expectedOwner] = process.argv.slice(2);
  need(process.argv.slice(2).length === 4 && flag === '--capture'
    && ['trial-user', 'trial-creator'].includes(role) && email.includes('@') && uuid.test(expectedOwner), 'explicit-account-required');
  const root = await lstat(ROOT); need(root.isDirectory() && !root.isSymbolicLink(), 'private-backup-root-required');
  const directory = join(ROOT, role);
  try { await mkdir(directory, { mode: 0o700 }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  const folder = await lstat(directory); need(folder.isDirectory() && !folder.isSymbolicLink(), 'regular-backup-folder-required');
  const config = readAlphaAuthConfig(JSON.parse(await readFile('.tmp/alpha-development.json', 'utf8'))); need(config, 'development-config-required');
  const stored = JSON.parse(await readFile('.tmp/alpha-test-accounts.json', 'utf8')) as { accounts?: Credential[] };
  const selected = stored.accounts?.filter(row => typeof row.email === 'string' && row.email.toLowerCase() === email.toLowerCase());
  need(selected?.length === 1 && typeof selected[0].password === 'string' && selected[0].password.length > 0, 'selected-local-credential-required');
  const result = await captureAccountBackup(config, selected[0], expectedOwner);
  const packed = result.file;
  const packedInspection = await inspectPersonalBackup(Buffer.from(packed), expectedOwner);
  need(packedInspection.ok && packedInspection.decodedFileSha256 === result.inspection.fileSha256, 'packed-backup-verification-failed');
  const stamp = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  const file = join(directory, `${stamp}-before-trial.json`);
  const handle = await open(file, 'wx', 0o600);
  try { await handle.writeFile(packed, 'utf8'); await handle.sync(); } finally { await handle.close(); }
  const checked = await checkPersonalBackupFiles({ backupPath: file, expectedOwner });
  need(checked.ok && checked.fileSha256 === packedInspection.fileSha256 && checked.decodedFileSha256 === result.inspection.fileSha256, 'written-backup-verification-failed');
  // Contains no email, owner ID, credentials or private text. Full data stays outside Git.
  const report = { schema: 'flowme-m72-baseline/1', role, backupFile: file, inspection: checked,
    serverPreview: result.serverPreview, appDataWrites: 0, remoteUploads: 0, ownSessionLoggedOut: true,
    independentSecondCopy: false, observedUsers: 0, realDeviceTest: false };
  const summary = await open(join(directory, `${stamp}-inspection.json`), 'wx', 0o600);
  try { await summary.writeFile(JSON.stringify(report, null, 2)); await summary.sync(); } finally { await summary.close(); }
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void (async () => { const release = await acquireM3LiveLock(); try { await main(); } finally { await release(); } })()
    .catch(() => { console.error('account-backup-capture-failed-no-private-values-printed'); process.exitCode = 1; });
}
