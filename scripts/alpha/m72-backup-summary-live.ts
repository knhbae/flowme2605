/** Opt-in read-only DEV QA verification. Auth login/logout only; no application writes.
 * Never reads actual 001/002 credentials, emits contents, or applies a restore. */
import assert from 'node:assert/strict';
import { lstat, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { canonicalJson, hashJson } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import { summarizePreservationContent } from '../../lib/flow/integrated-poc/alpha-preservation/content-summary';
import { validateAccountBackup } from '../../lib/flow/integrated-poc/alpha-preservation/backup';
import { preparePreservationWireRequest } from '../../lib/flow/integrated-poc/alpha-preservation/transport';

const APP = 'http://localhost:3104', PROJECT = 'wkmzcxpnojobxrgebapw', INPUT = '.tmp/m72-compact-qa.json';
let stage = 'approval', client: SupabaseClient | undefined, completed = false;
const checks: string[] = [], evidence: Record<string, unknown> = {};
const check = (name: string, value: unknown) => { assert(value, name); checks.push(name); };
async function main() {
  assert.deepEqual(process.argv.slice(2), ['--run-development-read-only']);
  stage = 'qa-config'; const stat = await lstat(INPUT); assert(stat.isFile() && !stat.isSymbolicLink() && stat.size < 16384);
  const qa = JSON.parse(await readFile(INPUT, 'utf8'));
  assert.deepEqual(Object.keys(qa).sort(), ['email', 'ownerId', 'password', 'projectRef', 'publishableKey', 'url']);
  assert(qa.projectRef === PROJECT && qa.url === `https://${PROJECT}.supabase.co`);
  assert(/^flowme-m72-qa-[a-z0-9-]+@example\.com$/i.test(qa.email));
  assert(qa.ownerId === 'd1d0e2e2-5e27-4e83-a504-488032721da6');
  const bounded: typeof fetch = (url, init) => fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(60_000) });
  client = createClient(qa.url, qa.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: bounded } });
  stage = 'qa-login'; const signed = await client.auth.signInWithPassword({ email: qa.email, password: qa.password });
  assert(!signed.error && signed.data.session && signed.data.user?.id === qa.ownerId && !signed.data.user.is_anonymous);
  const token = signed.data.session.access_token;
  const api = async (payload: Record<string, unknown>) => {
    assert(payload.kind === 'backup' || payload.kind === 'preview');
    const wire = await preparePreservationWireRequest({ ...payload, client: 1 });
    const response = await bounded(`${APP}/api/alpha/preservation`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Origin: APP }, body: JSON.stringify(wire) });
    assert(response.ok); const body = await response.json(); assert(body.ok); return body.value;
  };
  stage = 'before-backup'; const before = await api({ kind: 'backup' });
  check('server-sealed-backup-integrity', (await validateAccountBackup(canonicalJson(before.backup), qa.ownerId)).ok);
  stage = 'same-preview'; const preview = await api({ kind: 'preview', mode: 'restore', sourceRaw: canonicalJson(before), actorId: '' });
  check('qa-owner-bound', preview.ownerId === qa.ownerId);
  check('same-state-cannot-apply', preview.same === true && preview.canApply === false);
  const expected = summarizePreservationContent(before.backup.account.space);
  check('exact-current-content-counts', canonicalJson(preview.content.current) === canonicalJson(expected));
  check('exact-selected-content-counts', canonicalJson(preview.content.next) === canonicalJson(expected));
  stage = 'after-backup'; const after = await api({ kind: 'backup' });
  for (const part of ['account', 'operations', 'references', 'importArchives', 'files']) {
    check(`${part}-unchanged`, canonicalJson(before.backup[part]) === canonicalJson(after.backup[part]));
  }
  Object.assign(evidence, { revision: after.backup.account.revision, operations: after.backup.operations.length,
    accountSha256: await hashJson(after.backup.account), operationsSha256: await hashJson(after.backup.operations), content: expected });
  completed = true;
}
void main().catch(() => { completed = false; }).finally(async () => {
  let logoutOk = true;
  if (client) try { logoutOk = !(await client.auth.signOut({ scope: 'local' })).error; } catch { logoutOk = false; }
  const pass = completed && logoutOk, output = `output/alpha-m72-backup-summary-live/${new Date().toISOString().replace(/[:.]/g, '-')}`;
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/result.json`, JSON.stringify({ pass, stage, checks, logoutOk, evidence, qaOnly: true, applicationWrites: 0, actualRestore: false, actualUsersAccessed: 0 }, null, 2));
  console.log(JSON.stringify({ pass, stage, checks: checks.length, logoutOk, output })); if (!pass) process.exitCode = 1;
});
