import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createProgramData, validateProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { type ProgramData, type ProgramTransition } from '../../../lib/flow/integrated-poc/contract';
import { createProgramController } from '../../../lib/flow/integrated-poc/controller';
import { createProgramPost, createProgramReply, deleteProgramPost, editProgramPost, programPostEditToken } from '../../../lib/flow/integrated-poc/community';
import { publishProgramFlow, createProgramProposal } from '../../../lib/flow/integrated-poc/publication';
import type * as ComponentModule from './ProgramCommunity';
import { programErrorMessage } from '../../../lib/flow/integrated-poc/ui-contract';

const componentUrl = new URL('./ProgramCommunity.tsx', import.meta.url);
const source = readFileSync(componentUrl, 'utf8'), require = createRequire(componentUrl);
test('all seven composer entry buttons expose the same busy/media/lock guard before accepting a click', () => {
  const ast = ts.createSourceFile('ProgramCommunity.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let disabledExpression = '';
  const entries: ts.JsxOpeningElement[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'draftEntryDisabled') disabledExpression = node.initializer!.getText(ast);
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(ast) === 'button') {
      const click = node.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(ast) === 'onClick');
      if (click && /\b(openDraft|startReply|startPostEdit)\(/.test(click.getText(ast))) entries.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(entries.length, 7);
  for (const entry of entries) {
    const disabled = entry.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(ast) === 'disabled') as ts.JsxAttribute;
    assert(disabled); assert.equal((disabled.initializer as ts.JsxExpression).expression!.getText(ast), 'draftEntryDisabled');
  }
  const evaluate = new Function('busy', 'readingMedia', 'locked', `return (${disabledExpression});`);
  for (const busy of [false, true]) for (const media of [false, true]) for (const locked of [false, true]) {
    assert.equal(evaluate(busy, media, locked), busy || media || locked);
  }
});
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
const loaded = { exports: {} as typeof ComponentModule };
function componentRequire(id: string): unknown {
  if (id.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) };
  if (id === './ProgramProposalReview') {
    const child = { exports: {} }, raw = readFileSync(new URL('./ProgramProposalReview.tsx', componentUrl), 'utf8');
    const compiledChild = ts.transpileModule(raw, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
    vm.runInThisContext(`(function(module, exports, require) { ${compiledChild.outputText}\n})`, { filename: 'ProgramProposalReview.community.cjs' })(child, child.exports, componentRequire);
    return child.exports;
  }
  return require(id);
}
vm.runInThisContext(`(function(module, exports, require) { ${compiled.outputText}\n})`, { filename: 'ProgramCommunity.compiled.cjs' })(loaded, loaded.exports, (id: string) =>
  componentRequire(id));
const { ProgramCommunity, newProgramParticipationDraft, saveProgramParticipationDraft, discardProgramParticipationDraft, submitProgramParticipation } = loaded.exports;

// Run the actual queued save callback and notice expression, without React hooks,
// browser/network or a new product-only injection point.
function draftSaveNoticeHarness(outcome: { ok: boolean; reason?: string }, rejects = false) {
  const ast = ts.createSourceFile('ProgramCommunity.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function find(predicate: (node: ts.Node) => boolean): ts.Node {
    let found: ts.Node | undefined;
    function visit(node: ts.Node) { if (predicate(node)) found = node; else if (!found) ts.forEachChild(node, visit); }
    visit(ast); assert(found); return found;
  }
  const declaration = (name: string) => (find(node => ts.isFunctionDeclaration(node) && node.name?.text === name) as ts.FunctionDeclaration).getText(ast);
  const expression = (name: string) => (find(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === name) as ts.VariableDeclaration).initializer!.getText(ast);
  const draft = { ...newProgramParticipationDraft(), title: '합성 질문', body: '보존할 입력' };
  const calls: string[] = [], context: Record<string, any> = {
    draft, actorId: 'actor-synthetic', storageScope: 'account', errorNotice: { message: '' },
    saveFlights: { current: 0 }, queue: { current: Promise.resolve(true) }, mounted: { current: true }, savedDraftRef: { current: null },
    setSaveState: (value: string) => calls.push(`status:${value}`), setDraftConflict: (value: boolean) => calls.push(`conflict:${value}`),
    setErrorNotice: (value: any) => { context.errorNotice = typeof value === 'function' ? value(context.errorNotice) : value; }, programErrorMessage, programClone: structuredClone,
    saveProgramParticipationDraft,
    mutate: async (_label: string, _build: unknown, options: any) => {
      calls.push('mutation'); assert.equal(options.alphaSocial.type, 'participation-save');
      assert.equal(options.alphaSocial.draft, draft); assert.equal(options.alphaSocial.expected, null);
      if (rejects) throw Error('synthetic storage failure'); return outcome;
    },
    resolveDraftSaveError: (next: unknown, expected: unknown, reason: string) => {
      calls.push(`notice:${reason}`); assert.deepEqual(next, draft); assert.equal(expected, null);
      return reason === 'recovery-required' ? '초안을 저장하지 못했습니다. 입력은 남아 있습니다.' : undefined;
    },
  };
  function evaluate(value: string) {
    const code = ts.transpileModule(`const value = ${value};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    return new Function(...Object.keys(context), `${code}; return value;`)(...Object.values(context));
  }
  context.setError = (message: string) => evaluate(`(${declaration('setError')})`)(message);
  return { context, calls, draft, save: () => evaluate(`(${declaration('save')})`)(draft), notice: () => evaluate(expression('error')) };
}

test('draft save failure selects its current host notice while preserving the failed input and queued mutation', async () => {
  const h = draftSaveNoticeHarness({ ok: false, reason: 'recovery-required' });
  assert.equal(await h.save(), false); assert.equal(h.context.savedDraftRef.current, null);
  assert.deepEqual(h.context.errorNotice.draftSave.draft, h.draft); assert.notEqual(h.context.errorNotice.draftSave.draft, h.draft);
  assert.equal(h.context.errorNotice.draftSave.expected, null);
  assert.equal(h.context.errorNotice.message, programErrorMessage('recovery-required'));
  assert.equal(h.notice(), '초안을 저장하지 못했습니다. 입력은 남아 있습니다.');
  assert.deepEqual(h.calls.filter(value => value === 'mutation'), ['mutation']); assert.equal(h.context.saveFlights.current, 0);
  h.context.resolveDraftSaveError = () => undefined;
  assert.equal(h.notice(), programErrorMessage('recovery-required'), 'revoked live authority falls back on the next render');
  assert.equal(h.draft.body, '보존할 입력');
});

test('other composer errors remove save origin and cannot inherit a rejected draft notice', async () => {
  const h = draftSaveNoticeHarness({ ok: false, reason: 'recovery-required' }); await h.save();
  for (const message of [programErrorMessage('presentation-pending'), '사진을 올리지 못했어요.', programErrorMessage('conflict'), '']) {
    h.context.setError(message); assert.equal(h.context.errorNotice.draftSave, undefined); assert.equal(h.notice(), message);
  }
  assert(!h.calls.some(value => value.startsWith('notice:')));
});

test('draft save limit and pending-result messages retain their existing recovery meaning', async () => {
  for (const reason of ['limit', 'checking-result', 'conflict', 'unauthenticated']) {
    const h = draftSaveNoticeHarness({ ok: false, reason }); await h.save();
    assert.equal(h.notice(), programErrorMessage(reason)); assert.equal(h.context.savedDraftRef.current, null);
  }
});

test('save success and thrown storage failure clear the scoped refusal origin', async () => {
  const success = draftSaveNoticeHarness({ ok: true }); assert.equal(await success.save(), true);
  assert.equal(success.notice(), ''); assert.deepEqual(success.context.savedDraftRef.current, success.draft);
  const failed = draftSaveNoticeHarness({ ok: false }, true); assert.equal(await failed.save(), false);
  assert.equal(failed.context.errorNotice.draftSave, undefined);
  assert.equal(failed.notice(), '입력은 그대로입니다. 저장을 다시 시도해 주세요.');
  const retry = draftSaveNoticeHarness({ ok: false, reason: 'recovery-required' }); await retry.save();
  let release!: () => void;
  retry.context.queue.current = new Promise<void>(resolve => { release = resolve; });
  const saving = retry.save(); assert.equal(retry.notice(), '', 'stale failed-save guidance clears before the queued retry');
  release(); await saving;
});

test('a notice for a different active draft cannot replace the common recovery copy', async () => {
  const h = draftSaveNoticeHarness({ ok: false, reason: 'recovery-required' }); await h.save();
  h.context.draft = { ...h.draft, id: 'other-draft' };
  assert.equal(h.notice(), programErrorMessage('recovery-required'));
  assert(!h.calls.some(value => value.startsWith('notice:')));
});

test('a queued later save clears a refusal arriving from the earlier save before dispatch', async () => {
  const h = draftSaveNoticeHarness({ ok: false, reason: 'recovery-required' }); let mutations = 0;
  h.context.mutate = async () => {
    mutations++;
    if (mutations === 1) return { ok: false, reason: 'recovery-required' };
    assert.equal(h.context.errorNotice.draftSave, undefined, 'queued save must not display its predecessor refusal');
    return { ok: true };
  };
  const first = h.save(), later = h.save();
  assert.equal(await first, false); assert.equal(await later, true);
  assert.equal(mutations, 2); assert.equal(h.notice(), ''); assert.equal(h.context.saveFlights.current, 0);
});
const now = '2026-09-12T12:00:00.000Z', actorId = 'local-user', otherId = 'participant-jihun';

test('successive guarded drafts survive real controller canonical key ordering and reload', async () => {
  const values = new Map<string, string>([['flow:operating:guard', ' exact original bytes ']]), writes: string[] = [];
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { writes.push(key); values.set(key, value); },
    removeItem: (key: string) => { writes.push(key); values.delete(key); } };
  const controller = createProgramController({ initialData: createProgramData(), storage, exclusive: async work => work() }); assert(controller.ok);
  let expected: ReturnType<typeof newProgramParticipationDraft> | null = null;
  let draft = { ...newProgramParticipationDraft(), title: '저장 왕복', body: '첫 본문' };
  for (const body of ['첫 본문', '두 번째 본문', '세 번째\n긴 본문']) {
    draft = { ...draft, body };
    const result = await controller.mutate('초안 입력', current => saveProgramParticipationDraft(current, actorId, draft, { expected }), { actorId, history: false });
    assert(result.ok); expected = JSON.parse(JSON.stringify(draft));
  }
  const reopened = createProgramController({ initialData: createProgramData(), storage, exclusive: async work => work() }); assert(reopened.ok);
  assert.deepEqual(reopened.snapshot().envelope.data.spaces[actorId].participationDrafts[0], draft);
  assert.equal(values.get('flow:operating:guard'), ' exact original bytes ');
  assert.equal(writes.length, 3); assert(writes.every(key => key.startsWith('flow:poc:personal-workspace:v1:program:')));
});

test('autosave cannot overwrite a peer draft; explicit comparison can adopt the latest baseline', () => {
  const draft = { ...newProgramParticipationDraft(), title: '질문', body: '기존 입력' };
  const first = ok(saveProgramParticipationDraft(createProgramData(), actorId, draft, { expected: null }));
  const peer = { ...draft, body: '다른 탭 입력' };
  const second = ok(saveProgramParticipationDraft(first.data, actorId, peer, { expected: draft }));
  const mine = { ...draft, body: '현재 화면 입력' };
  const rejected = saveProgramParticipationDraft(second.data, actorId, mine, { expected: draft });
  assert(!rejected.ok); assert.equal(rejected.reason, 'conflict'); assert.equal(rejected.data, second.data);
  const resolved = ok(saveProgramParticipationDraft(second.data, actorId, mine, { expected: peer }));
  assert.equal(resolved.data.spaces[actorId].participationDrafts[0].body, mine.body);
});

test('discard and public submit reject a changed private draft without deleting or publishing it', () => {
  const draft = { ...newProgramParticipationDraft(), title: '검토할 질문', body: '이전 초안' };
  const saved = ok(saveProgramParticipationDraft(createProgramData(), actorId, draft));
  const peer = { ...draft, body: '보존할 다른 탭 입력' };
  const changed = ok(saveProgramParticipationDraft(saved.data, actorId, peer));
  for (const outcome of [discardProgramParticipationDraft(changed.data, actorId, draft.id, { expected: draft }),
    submitProgramParticipation(changed.data, actorId, draft, now, { expected: draft })]) {
    assert(!outcome.ok); assert.equal(outcome.reason, 'conflict'); assert.equal(outcome.data, changed.data);
    assert.equal(outcome.data.public.posts.length, 0);
  }
});

test('a peer deletion cannot be silently undone by stale autosave', () => {
  const draft = { ...newProgramParticipationDraft(), title: '입력', body: '남은 내용' };
  const saved = ok(saveProgramParticipationDraft(createProgramData(), actorId, draft));
  const removed = ok(discardProgramParticipationDraft(saved.data, actorId, draft.id, { expected: draft }));
  const result = saveProgramParticipationDraft(removed.data, actorId, draft, { expected: draft });
  assert(!result.ok); assert.equal(result.reason, 'conflict'); assert.equal(result.data, removed.data);
});
function ok<T>(result: ProgramTransition<T>) { assert(result.ok); assert(validateProgramData(result.data)); return result; }
function fixture() {
  const p = ok(createProgramPost(createProgramData(), { actorId, requestId: 'p1', kind: 'question', title: '처음 이사할 때 무엇부터 하나요?', body: '주소 이전과 짐 정리가 궁금해요.', topic: '이사' }, now));
  const r = ok(createProgramReply(p.data, { actorId: otherId, requestId: 'r1', postId: p.result, body: '먼저 계약 날짜를 확인했어요.' }, now));
  return { data: r.data, postId: p.result, replyId: r.result };
}
const render = (data: ProgramData, view: 'community' | 'activity' = 'community', selectedPostId?: string) => renderToStaticMarkup(
  <ProgramCommunity data={data} view={view} selectedPostId={selectedPostId} today="2026-09-12" mutate={async () => ({ ok: false, reason: 'not-called-during-render' })} navigate={() => {}} />,
);

test('SSR lists real post content with named search and does not expose actor switching or private drafts from another actor', () => {
  const { data } = fixture();
  const draft = { ...newProgramParticipationDraft(), title: '다른 사람의 비공개 초안', body: '개인 내용' };
  const privateState = ok(saveProgramParticipationDraft(data, otherId, draft));
  const markup = render(privateState.data);
  assert.match(markup, /처음 이사할 때 무엇부터 하나요/); assert.match(markup, /이야기 검색/); assert.match(markup, /글 쓰기/);
  assert.doesNotMatch(markup, /다른 사람의 비공개 초안|역할 전환|local-user|participant-jihun/);
});
test('restored community presentation controls the real list while exact reply route and business data stay unchanged',()=>{
 const {data,postId,replyId}=fixture(),before=JSON.stringify(data);let mutations=0;
 const shared={data,today:'2026-09-12',view:'community' as const,mutate:async()=>{mutations++;return{ok:false as const,reason:'unexpected'};},navigate:()=>{}};
 const filtered=renderToStaticMarkup(<ProgramCommunity {...shared} presentation={{version:1,query:'없는 검색',kind:'experience'}}/>);
 assert.match(filtered,/value="없는 검색"/);assert.match(filtered,/조건에 맞는 글이 없어요/);assert.doesNotMatch(filtered.slice(filtered.indexOf('<div class="filters">')),/처음 이사할 때 무엇부터 하나요/);
 const detail=renderToStaticMarkup(<ProgramCommunity {...shared} selectedPostId={postId} selectedReplyId={replyId} presentation={{version:1,query:'없는 검색',kind:'experience'}}/>);
 assert.match(detail,/먼저 계약 날짜를 확인했어요/);assert.match(detail,/aria-current="location"/);
 assert.equal(JSON.stringify(data),before);assert.equal(mutations,0);
});

test('SSR detail uses a route-safe parent reply button and allows separate ownership controls', () => {
  const base = fixture();
  const nested = ok(createProgramReply(base.data, { actorId, requestId: 'nested', postId: base.postId, parentReplyId: base.replyId, body: '계약 날짜부터 볼게요.' }, now));
  const markup = render(nested.data, 'community', base.postId);
  assert.doesNotMatch(markup, /href="#reply-/); assert.match(markup, /<button[^>]*>.*의 답글에 대한 답변<\/button>/); assert.match(markup, /계약 날짜부터 볼게요/);
  assert.match(markup, /aria-pressed="false"/); assert.match(markup, /답글 관리/); assert.match(markup, /글 관리/);
});

test('SSR exact reply destination exposes focusable location; a foreign reply is not substituted', () => {
  const base = fixture();
  const markup = renderToStaticMarkup(<ProgramCommunity data={base.data} view="community" selectedPostId={base.postId} selectedReplyId={base.replyId}
    today="2026-09-12" mutate={async () => ({ ok: false, reason: 'unused' })} navigate={() => {}} />);
  assert.match(markup, new RegExp(`id="reply-${base.replyId}"[^>]*tabindex="-1"[^>]*aria-current="location"`));
  const missing = renderToStaticMarkup(<ProgramCommunity data={base.data} view="community" selectedPostId={base.postId} selectedReplyId="not-this-post"
    today="2026-09-12" mutate={async () => ({ ok: false, reason: 'unused' })} navigate={() => {}} />);
  assert.match(missing, /요청한 답글을 찾을 수 없어요/); assert.doesNotMatch(missing, /aria-current="location"/);
});

test('SSR activity separates owned Flow and private publication drafts from conversation activity', () => {
  const base = fixture();
  const published = ok(publishProgramFlow(base.data, { actorId, requestId: 'activity-flow', title: '내 공개 Flow 제목', summary: '', category: '생활', situations: [],
    source: { kind: 'user-text', label: '직접 작성', url: null, checkedAt: null },
    items: [{ id: 'activity-item', title: '확인', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }] }, now));
  const markup = render(published.data, 'activity');
  assert.match(markup, /내 공개 Flow/); assert.match(markup, /내 공개 Flow 제목/); assert.match(markup, /작성 중인 공개 초안/);
  assert.match(markup, /연결된 개인 문서가 없습니다/); assert.doesNotMatch(markup, /공개 내용 편집/);
});

test('SSR deleted evidence is explicit and the author can repair its link', () => {
  const base = fixture();
  const knowledge = ok(createProgramPost(base.data, { actorId, requestId: 'knowledge', kind: 'knowledge', title: '이사 준비 요약', body: '확인한 내용을 모았습니다.', topic: '', evidencePostIds: [base.postId] }, now));
  const removed = ok(deleteProgramPost(knowledge.data, actorId, base.postId, now));
  const markup = render(removed.data, 'community', knowledge.result);
  assert.match(markup, /삭제된 근거 글/); assert.match(markup, /근거 연결 수정/);
  assert.doesNotMatch(markup, /주소 이전과 짐 정리가 궁금해요/);
});

test('SSR activity includes received replies and real proposal review outcome controls', () => {
  const base = fixture();
  const published = ok(publishProgramFlow(base.data, { actorId, requestId: 'flow', title: '첫 이사', summary: '예시', category: '생활', situations: [],
    source: { kind: 'simulated-example', label: '가상 콘텐츠', url: null, checkedAt: null },
    items: [{ id: 'item', title: '주소 변경', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }] }, now));
  const proposed = ok(createProgramProposal(published.data, { actorId: otherId, requestId: 'proposal', flowId: published.data.public.flows[0].id,
    baseVersionId: published.result, itemId: 'item', reason: '처리 기한도 알려 주세요.', patch: { description: '처리 기한을 확인합니다.' } }, now));
  const markup = render(proposed.data, 'activity');
  assert.match(markup, /내게 온 답글/); assert.match(markup, /먼저 계약 날짜를 확인했어요/);
  assert.match(markup, /내 Flow에 온 제안/); assert.match(markup, /처리 기한도 알려 주세요/); assert.match(markup, /채택하고 새 판본 공개/);
});

test('a private nested-reply draft preserves parent, request and cursor across serialization', () => {
  const base = fixture(), draft = newProgramParticipationDraft('reply');
  Object.assign(draft, { postId: base.postId, parentReplyId: base.replyId, body: '질문이 하나 더 있어요.', cursor: { start: 3, end: 7 } });
  const saved = ok(saveProgramParticipationDraft(base.data, actorId, draft));
  const reopened = JSON.parse(JSON.stringify(saved.data)) as ProgramData;
  assert(validateProgramData(reopened)); assert.deepEqual(reopened.spaces[actorId].participationDrafts[0], draft);
  assert.deepEqual(reopened.spaces[otherId], base.data.spaces[otherId]); assert.deepEqual(reopened.public, base.data.public);
});

test('one proposal has one protected editor even when its author owns the Flow', () => {
  const base = createProgramData();
  const published = ok(publishProgramFlow(base, { actorId, requestId: 'self-flow', title: '내 준비', summary: '', category: '생활', situations: [],
    source: { kind: 'simulated-example', label: '가상 콘텐츠', url: null, checkedAt: null },
    items: [{ id: 'self-item', title: '준비', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }] }, now));
  const proposed = ok(createProgramProposal(published.data, { actorId, requestId: 'self-proposal', flowId: published.data.public.flows.at(-1)!.id,
    baseVersionId: published.result, itemId: 'self-item', reason: '보완할 점', patch: { description: '내가 보완한 내용' } }, now));
  const markup = render(proposed.data, 'activity');
  assert.equal((markup.match(/검토 의견 \(선택\)/g) ?? []).length, 1);
  assert.match(markup, /의견 초안 저장/); assert.match(markup, /입력한 의견 TXT 보관/);
  assert(source.includes('reviewPorts.current.set(proposal.id, port)'));
  assert(source.includes("hidden={view !== 'activity' || !!selectedPostId}"));
});

test('successful submit removes only its draft atomically; lost response retry does not duplicate a reply', () => {
  const base = fixture(), draft = newProgramParticipationDraft('reply'), other = { ...newProgramParticipationDraft(), title: '계속 쓸 글' };
  Object.assign(draft, { postId: base.postId, parentReplyId: base.replyId, body: '중복되지 않을 답글' });
  let saved = ok(saveProgramParticipationDraft(base.data, actorId, draft)).data;
  saved = ok(saveProgramParticipationDraft(saved, actorId, other)).data;
  const first = ok(submitProgramParticipation(saved, actorId, draft, now));
  assert.equal(first.data.public.replies.length, 2); assert.equal(first.data.public.replies[1].parentReplyId, base.replyId);
  assert.deepEqual(first.data.spaces[actorId].participationDrafts.map(entry => entry.id), [other.id]);
  const replay = ok(submitProgramParticipation(first.data, actorId, draft, now));
  assert.equal(replay.changed, false); assert.equal(replay.result, first.result); assert.equal(replay.data.public.replies.length, 2);
});

test('failed stale submit preserves local edit and latest post; identical retry is harmless', () => {
  const base = fixture(), original = base.data.public.posts[0], draft = newProgramParticipationDraft('question');
  Object.assign(draft, { postId: original.id, editTargetId: original.id, title: original.title, body: '내가 쓰던 수정', topic: original.topic,
    expectedUpdatedAt: original.updatedAt, expectedContent: programPostEditToken(original) });
  const saved = ok(saveProgramParticipationDraft(base.data, actorId, draft));
  const edited = ok(editProgramPost(saved.data, { actorId, postId: original.id, title: '다른 탭의 최신 제목', body: original.body, topic: original.topic }, now));
  const failed = submitProgramParticipation(edited.data, actorId, draft, now);
  assert(!failed.ok); assert.equal(failed.reason, 'conflict'); assert.equal(failed.data, edited.data);
  assert.equal(failed.data.spaces[actorId].participationDrafts[0].body, '내가 쓰던 수정');
  const target = edited.data.public.posts[0]; draft.expectedContent = programPostEditToken(target); draft.expectedUpdatedAt = target.updatedAt;
  const applied = ok(submitProgramParticipation(edited.data, actorId, draft, now));
  assert.equal(ok(submitProgramParticipation(applied.data, actorId, draft, now)).changed, false);
});

test('cancel removes only a selected private draft and leaves public content untouched', () => {
  const base = fixture(), draft = { ...newProgramParticipationDraft(), title: '취소할 글', body: '게시하지 않아요' };
  const saved = ok(saveProgramParticipationDraft(base.data, actorId, draft));
  const cancelled = ok(discardProgramParticipationDraft(saved.data, actorId, draft.id));
  assert.equal(cancelled.data.spaces[actorId].participationDrafts.length, 0); assert.deepEqual(cancelled.data.public, base.data.public);
  const forbidden = discardProgramParticipationDraft(cancelled.data, 'unknown', draft.id); assert(!forbidden.ok); assert.equal(forbidden.reason, 'forbidden');
});

test('responsive source provides keyboard names, 44px controls and local-only image picking', () => {
  const css = readFileSync(new URL('./ProgramCommunity.module.css', import.meta.url), 'utf8');
  assert.match(css, /min-height: 44px/); assert.match(css, /:focus-visible/); assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(source, /history: false/); assert.match(source, /readAsDataURL/); assert.match(source, /expectedContent:/);
  assert.doesNotMatch(source, /localStorage|fetch\(|https?:\/\/|iframe|window\.open/);
});
