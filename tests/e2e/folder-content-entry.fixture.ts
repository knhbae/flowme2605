import { createHash } from 'node:crypto';
import { expect, type Page, type Route, type TestInfo } from '@playwright/test';
import { mockCloudflareRelease, RELEASE_ORIGIN } from './cloudflare-release.fixture';
import { pairedSocialAccount, users } from './alpha-auth.fixture';
import { createAlphaFakeServer, validateAlphaCommand } from '../../lib/flow/integrated-poc/alpha-persistence/fake-server';
import { materializeAccount, privateChanges } from '../../lib/flow/integrated-poc/alpha-persistence/program-adapter';
import { canonicalJson } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import type { AlphaCommand, AlphaReceipt, AlphaPrivateCommand } from '../../lib/flow/integrated-poc/alpha-persistence/contract';
import { alphaSocialReferences, isAlphaSocialContext, type AlphaSocialContext } from '../../lib/flow/integrated-poc/alpha-social/projection';
import { isAlphaSocialCommand } from '../../lib/flow/integrated-poc/alpha-social/contract';
import { executeAlphaSocialIntent } from '../../lib/flow/integrated-poc/alpha-social/dispatch';
import { isAlphaCreatorCommand } from '../../lib/flow/integrated-poc/alpha-creator/contract';
import { dispatchAlphaCreatorCommand } from '../../lib/flow/integrated-poc/alpha-creator/dispatch';
import { textWorkspaceModel as M, type TextWorkspaceState } from '../../lib/flow/integrated-poc/text-workspace';

export const folderIds = { company: 'entry-company', work: 'entry-work', personal: 'entry-personal', homonym: 'entry-homonym' };
export const publicIds = { flow: 'entry-public-flow', version: 'entry-public-v1', item: 'entry-public-item', post: 'entry-public-post' };
export const publicTitle = '합성 공개 준비 Flow';
export function prepareEntryText(initial: TextWorkspaceState): TextWorkspaceState {
  let text = { ...initial, folders: [...initial.folders,
    { id: folderIds.company, title: '회사', parentId: null }, { id: folderIds.work, title: '업무', parentId: folderIds.company },
    { id: folderIds.personal, title: '개인', parentId: null }, { id: folderIds.homonym, title: '업무', parentId: folderIds.personal }] };
  const docId = text.documents[0].id;
  text = M.editText(text, docId, '보존할 문장\n- ');
  text = M.attachScope(text, docId, 1, folderIds.work);
  text = M.editText(text, docId, `${M.raw(M.getDocument(text, docId))}\n  - 영역 메모\n  - [ ] 보존할 작업\n바깥 문장\n- `);
  if (!M.validate(text)) throw Error('entry-synthetic-text-invalid');
  return text;
}

/** A narrow synthetic semantic overlay. The shared release fixture still owns
 * ALL Auth, unrecognized API/network denial, WS denial, operating sentinels,
 * console errors, viewport overflow and production static-asset SHA256 checks.
 * No catalog source pack, signed BFF or real Supabase call is used here. */
export async function mockFolderContentEntry(page: Page, options: { catalog?: boolean; community?: boolean } = {}) {
  const base = await mockCloudflareRelease(page, { document: { title: '합성 연결 문서', raw: '' }, prepareText: prepareEntryText });
  const seed = await base.current();
  const context = pairedSocialAccount('a', seed).value.context as AlphaSocialContext;
  const other = context.actors[1].id, stamp = '2026-10-01T00:00:00Z';
  if (options.catalog) {
    context.public.flows.push({ id: publicIds.flow, ownerId: other, currentVersionId: publicIds.version,
      category: '합성 검증', situations: ['준비'], derivedFrom: null, archived: false });
    context.public.versions.push({ id: publicIds.version, flowId: publicIds.flow, number: 1, parentVersionId: null,
      title: publicTitle, summary: '브라우저 회귀용 합성 원문입니다.',
      source: { kind: 'simulated-example', label: '합성 출처', url: null, checkedAt: null }, createdBy: other, createdAt: stamp,
      items: [{ id: publicIds.item, title: '합성 공개 준비 항목', description: '합성 방법', completionCriteria: '합성 기준',
        sourceUrl: null, schedule: { kind: 'fixed', date: '2026-10-10' }, subchecks: [] }] });
  }
  if (options.community) context.public.posts.push({ id: publicIds.post, authorId: other, kind: 'experience',
    title: '합성 공개 경험', body: '공개 글이 있어도 Flow 찾기로 진입합니다.', topic: '합성 검증',
    flowId: options.catalog ? publicIds.flow : null, versionId: options.catalog ? publicIds.version : null,
    itemId: null, evidencePostIds: [], media: [], createdAt: stamp, updatedAt: stamp, deleted: false });
  if (!isAlphaSocialContext(context)) throw Error('entry-synthetic-context-invalid');
  const references = alphaSocialReferences(context, users.a.id);
  const server = createAlphaFakeServer([{ account: seed, references }]);
  const repository = server.connect(server.issueSession(users.a.id));
  const commands: AlphaCommand[] = [], lookups: string[] = [], blocked: string[] = [], reads: number[] = [];
  const receipts = new Map<string, { fingerprint: string; receipt: AlphaReceipt }>();
  const publicHash = createHash('sha256').update(canonicalJson(context.public)).digest('hex');
  let intercepted = 0;
  async function current() { const result = await repository.read(); if (!result.ok) throw Error('entry-account-unavailable'); return result.value; }
  const json = (route: Route, value: unknown) => route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': RELEASE_ORIGIN, 'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }, body: JSON.stringify(value) });
  await page.addInitScript(() => {
    const audit = { calls: 0 }; Object.defineProperty(window, '__folderContentStorage', { value: audit });
    for (const name of ['setItem', 'removeItem', 'clear'] as const) {
      const original = Storage.prototype[name];
      Object.defineProperty(Storage.prototype, name, { configurable: true, value: function(this: Storage, ...args: string[]) {
        audit.calls++; return Reflect.apply(original, this, args);
      } });
    }
  });
  // Page routes run before the shared context boundary. Every nonexact match
  // falls through to that deny-by-default boundary, never route.continue().
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    if (url.origin === 'https://wkmzcxpnojobxrgebapw.supabase.co' && method === 'POST'
      && url.pathname === '/rest/v1/rpc/flowme_alpha_social_read_v1' && !url.search) {
      intercepted++; expect(request.postDataJSON()).toEqual({}); const account = await current(); reads.push(account.revision);
      return json(route, { ok: true, value: { account, context: structuredClone(context) } });
    }
    if (url.origin === 'https://wkmzcxpnojobxrgebapw.supabase.co' && method === 'GET'
      && url.pathname === '/rest/v1/flowme_alpha_accounts') return json(route, [{ account: await current() }]);
    if (url.origin === RELEASE_ORIGIN && method === 'GET' && !url.search && url.pathname === '/api/alpha/catalog') {
      // Deliberately no frozen private source pack in this regression. Creator
      // remains usable beside its explicit catalog-unavailable presentation.
      intercepted++; return json(route, { ok: false, reason: 'unavailable' });
    }
    if (url.origin !== RELEASE_ORIGIN || method !== 'POST' || url.search
      || !['/api/alpha/account', '/api/alpha/creator', '/api/alpha/social'].includes(url.pathname)) return route.fallback();
    intercepted++; const body = request.postDataJSON();
    if (body.kind === 'lookup' && typeof body.requestId === 'string' && url.pathname === '/api/alpha/account') {
      lookups.push(body.requestId); return json(route, { ok: true, value: receipts.get(body.requestId)?.receipt ?? null });
    }
    const command = body.command;
    const privateCommand = url.pathname === '/api/alpha/account' && validateAlphaCommand(command);
    const creatorCommand = url.pathname === '/api/alpha/creator' && isAlphaCreatorCommand(command)
      && ['working', 'library-action'].includes(command.intent.type);
    const socialCommand = url.pathname === '/api/alpha/social' && isAlphaSocialCommand(command) && command.intent.type === 'copy-import';
    if (body.kind !== 'execute' || !privateCommand && !creatorCommand && !socialCommand) {
      blocked.push(`${method}:${url.pathname}`); return json(route, { ok: false, reason: 'invalid' });
    }
    commands.push(structuredClone(command));
    const fingerprint = canonicalJson(command), old = receipts.get(command.requestId);
    if (old) return json(route, old.fingerprint === fingerprint ? { ok: true, value: old.receipt } : { ok: false, reason: 'idempotency-conflict' });
    if (base.state.rejectNextExecute) { const reason = base.state.rejectNextExecute; base.state.rejectNextExecute = null; return json(route, { ok: false, reason }); }
    const account = await current();
    if (command.expectedRevision !== account.revision || socialCommand && command.expectedPublicRevision !== context.revision)
      return json(route, { ok: false, reason: 'revision-conflict' });
    let compiled: AlphaPrivateCommand | null = privateCommand ? command : null, resultId: string | undefined;
    if (creatorCommand) {
      const result = dispatchAlphaCreatorCommand(account, command, references);
      if (!result.ok || !result.changed) return json(route, { ok: false, reason: result.ok ? 'no-change' : 'invalid' });
      compiled = { schema: 'flowme-alpha-command/1', kind: 'change-private', requestId: command.requestId,
        expectedRevision: command.expectedRevision, changes: result.changes }; resultId = result.result;
    } else if (socialCommand) {
      const data = materializeAccount(account, references).data;
      const result = executeAlphaSocialIntent(data, account.ownerId, command.intent, command.requestId, stamp);
      if (!result.ok || !result.changed || canonicalJson(result.data.public) !== canonicalJson(data.public))
        return json(route, { ok: false, reason: result.ok ? 'no-change' : 'invalid' });
      compiled = { schema: 'flowme-alpha-command/1', kind: 'change-private', requestId: command.requestId,
        expectedRevision: command.expectedRevision, changes: privateChanges(account.space, result.data.spaces[account.ownerId]) }; resultId = result.result;
    }
    if (!compiled) return json(route, { ok: false, reason: 'invalid' });
    const result = await repository.execute(compiled);
    if (!result.ok) return json(route, result);
    const receipt: AlphaReceipt = { ...result.value, kind: command.kind, ...(resultId ? { resultId } : {}),
      ...(socialCommand ? { publicRevision: context.revision } : {}) };
    receipts.set(command.requestId, { fingerprint, receipt });
    if (base.state.loseNextReceipt) { base.state.loseNextReceipt = false; base.state.lostRequestId = command.requestId;
      return json(route, { ok: false, reason: 'unavailable' }); }
    return json(route, { ok: true, value: receipt });
  });
  return { state: base.state, current, commands, lookups, reads, context, diagnostics: server.diagnostics,
    async assertBoundary(info: TestInfo) {
      expect(blocked, 'Unexpected semantic command is denied, never forwarded').toEqual([]);
      expect(createHash('sha256').update(canonicalJson(context.public)).digest('hex')).toBe(publicHash);
      expect(base.diagnostics()).toEqual({ mutations: 0, operations: 0 });
      await base.assertBoundary(info);
      await info.attach('folder-content-synthetic-overlay', { contentType: 'application/json', body: JSON.stringify({
        evidence: 'Synthetic semantic dispatch + in-memory CAS; not real BFF, Auth/RLS, DB, OS IME or observed-user validation.',
        forwardedAuth: 0, forwardedApi: 0, catalogFixture: 'explicit-unavailable-no-private-source-pack', publicHash, publicUnchanged: true, intercepted,
        ...server.diagnostics(), commands: commands.map(command => ({ kind: command.kind, requestId: command.requestId,
          expectedRevision: command.expectedRevision, ...(command.kind === 'creator' || command.kind === 'social' ? { intent: command.intent.type } : {}) })) }) });
    } };
}
