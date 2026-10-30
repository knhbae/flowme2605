import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlphaAppWritingAccountReader } from './alpha-auth/account-access';
import { readAlphaAuthConfig } from './alpha-auth/config';
import { inspectMemoCohort } from './alpha-persistence/memo-cohort';
import { alphaReaOwnerReferences } from './alpha-persistence/rea-text-edit';
import { createAlphaAppWritingRoute } from './alpha-server/app-writing-route';
import { createProgramPrivateSpace } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';

// N1 fix 4: /alpha sent every v11 account holding only plain memos (a new user who wrote a few lines) to the
// memo cohort's picker, and the first edit there moved the account from v11 to the ordered v2 store, after
// which the main workspace could not open it again. Only an account already in v2 is the memo cohort now; a
// v11 memo-only account stays on the main workspace, and the writing route never takes its memo edits.
const USER = '11111111-1111-4111-8111-111111111111';
const env = { FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'test', FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw',
  FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co', FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_flowme_synthetic_qa',
  FLOWME_ALPHA_REDIRECT_URL: 'http://localhost:3104/auth/callback' };
const config = readAlphaAuthConfig(env)!;
const token = 'synthetic-token-' + 'x'.repeat(24);

function v11(lines: string[]) {
  const space = createProgramPrivateSpace() as ReturnType<typeof createProgramPrivateSpace> & { personalAuthoring?: unknown };
  delete space.personalAuthoring;
  const empty = { ...space.text, folders: [{ id: 'f-memo', title: '미분류', parentId: null }],
    documents: [{ id: 'd-memo', title: '작성한 글', folder: '미분류', folderId: 'f-memo', lines: [] }] };
  // The model writes the lines, so tasks and folder lines carry their own records like a real account.
  const edited = M.editTextResult(empty, 'd-memo', lines.join('\n'), { folderText: true });
  assert.equal(edited.reason ?? null, null);
  space.text = edited.state;
  space.position = { documentId: 'd-memo', lineId: null, start: 0, end: 0, scrollTop: 0 };
  return { schema: 'flowme-alpha-account/1', ownerId: USER, revision: 1, source: { schema: 'flowme-integrated-product-poc/1', actorId: USER, revision: 1 }, space, legacyUndo: [], legacyReceipts: [] };
}
const memoOnly = v11(['첫 글 한 줄', '둘째 줄']);
const cohort = inspectMemoCohort(memoOnly, USER, alphaReaOwnerReferences(USER));
const v2 = cohort.ok ? JSON.parse(JSON.stringify(cohort.projected)) : null;

function backend(account: unknown, log: string[]) {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(env.FLOWME_ALPHA_SUPABASE_URL, '');
    log.push(`${init?.method ?? 'GET'} ${url}`);
    if (url === '/auth/v1/user') return Response.json({ id: USER });
    if (url.startsWith('/rest/v1/flowme_alpha_accounts')) return Response.json([{ account }]);
    return Response.json({ ok: false }, { status: 500 });
  }) as typeof fetch;
}
const read = (account: unknown) => createAlphaAppWritingAccountReader(config, { userId: USER, accessToken: token } as never, backend(account, [])).read();

test('the fixtures are what the reader meets: a v11 memo-only account the cohort accepts, and its v2 projection', () => {
  assert.equal(cohort.ok, true);
  assert.equal(cohort.ok && cohort.origin, 'v11');
  const projected = inspectMemoCohort(v2, USER, alphaReaOwnerReferences(USER));
  assert.equal(projected.ok && projected.origin, 'v2');
});

test('a v11 account holding only memos opens the main workspace (legacy), not the memo picker', async () => {
  assert.deepEqual(await read(memoOnly), { ok: true, kind: 'legacy' });
});

test('an account already in v2 is still the memo cohort, with its documents', async () => {
  const result = await read(v2);
  assert.equal(result.ok && result.kind, 'memo');
  assert.deepEqual(result.ok && result.kind === 'memo' ? result.documents.map(doc => doc.id) : null, ['d-memo']);
});

test('a v11 account with a task or a folder line is unchanged: the main workspace', async () => {
  assert.deepEqual(await read(v11(['- [ ] 할 일', '메모'])), { ok: true, kind: 'legacy' });
  assert.deepEqual(await read(v11(['- /폴더', '  메모'])), { ok: true, kind: 'legacy' });
});

async function post(account: unknown) {
  const log: string[] = [];
  const request = new Request('http://localhost:3104/api/alpha/app-writing/d-memo', { method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, origin: 'http://localhost:3104' },
    body: JSON.stringify({ kind: 'edit', requestId: 'request-1' }) });
  const response = await createAlphaAppWritingRoute(env, backend(account, log))(request, 'd-memo');
  return { body: await response.json(), log };
}
const READS = ['GET /auth/v1/user', 'GET /auth/v1/user', 'GET /rest/v1/flowme_alpha_accounts?select=account'];

// Here the inner memo writing route stops at its own server settings ('unavailable'), so reaching it shows as
// that answer; refusing the document answers 'not-found' after reading only who asks and the account.
test('the writing route never takes a memo edit for a v11 account, so it is never moved to v2', async () => {
  const { body, log } = await post(memoOnly);
  assert.deepEqual(body, { ok: false, reason: 'not-found' });
  assert.deepEqual(log, READS);
});

test('a v2 account still reaches the memo writing route', async () => {
  const { body, log } = await post(v2);
  assert.notDeepEqual(body, { ok: false, reason: 'not-found' });
  assert.deepEqual(log, READS);
});
