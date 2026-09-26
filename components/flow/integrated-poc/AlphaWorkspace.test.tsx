import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createAlphaUiRecovery, alphaUiRecoveryKey } from '../../../lib/flow/integrated-poc/alpha-ui-recovery';
import { createProgramPrivateSpace } from '../../../lib/flow/integrated-poc/program-data';
import { ALPHA_COMMAND_SCHEMA, ALPHA_SCHEMA, type AlphaCommand } from '../../../lib/flow/integrated-poc/alpha-persistence/contract';
import { PROGRAM_SCHEMA } from '../../../lib/flow/integrated-poc/contract';
import { materializeAccount } from '../../../lib/flow/integrated-poc/alpha-persistence/program-adapter';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import { createAlphaCreatorRecovery } from '../../../lib/flow/integrated-poc/alpha-creator-recovery';
import { canonicalJson, detached } from '../../../lib/flow/integrated-poc/alpha-persistence/json';
import { createAlphaSocialRecovery } from '../../../lib/flow/integrated-poc/alpha-social-recovery';
import { executeAlphaSocialIntent } from '../../../lib/flow/integrated-poc/alpha-social/dispatch';
import { newProgramParticipationDraft } from '../../../lib/flow/integrated-poc/participation-editor';

// Execute the actual shell callbacks/effects/JSX with bounded browser/controller
// doubles. No product injection points, network, real account or DOM are involved.
const source = readFileSync(new URL('./AlphaWorkspace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('AlphaWorkspace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const require = createRequire(import.meta.url);
function find(predicate: (node: ts.Node) => boolean, root: ts.Node = ast): ts.Node {
  let found: ts.Node | undefined;
  function visit(node: ts.Node) { if (predicate(node)) { found = node; return; } if (!found) ts.forEachChild(node, visit); }
  visit(root); assert(found); return found;
}
function evaluate(expression: string, context: Record<string, unknown>) {
  const code = ts.transpileModule(`const value = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  return new Function('require', 'exports', ...Object.keys(context), `${code}; return value;`)(require, {}, ...Object.values(context));
}
const declaration = (name: string) => (find(n => ts.isFunctionDeclaration(n) && n.name?.text === name) as ts.FunctionDeclaration).getText(ast);
const initializer = (name: string) => (find(n => ts.isVariableDeclaration(n) && n.name.getText(ast) === name) as ts.VariableDeclaration).initializer!.getText(ast);
const effect = (part: string) => (find(n => ts.isCallExpression(n) && n.expression.getText(ast) === 'useEffect' && n.arguments[0]?.getText(ast).includes(part)) as ts.CallExpression).arguments[0].getText(ast);
const shell = find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'AlphaWorkspace') as ts.FunctionDeclaration;
const renderExpression = shell.body!.statements.filter(ts.isReturnStatement).at(-1)!.expression!.getText(ast);

test('pending modal recovery invokes exact same-request lookup without closing or discarding input', async () => {
  const calls: string[] = [];
  const context = { pending: true, snapshot: { status: 'recovery-required', busy: false }, external: false, styles: { problem: 'problem' },
    controller: { current: { resolvePending: async (retry: boolean) => { calls.push(`lookup:${retry}`); } } }, openLatest: () => { calls.push('discard'); } };
  const panel = evaluate(initializer('modalRecovery'), context);
  assert.equal(panel.props['aria-label'], '저장 결과 복구');
  const action = nodes(panel).find(node => node.type === 'button')!;
  assert.equal(action.props.disabled, false); await action.props.onClick(); assert.deepEqual(calls, ['lookup:true']);
  assert.equal(evaluate(initializer('modalRecovery'), { ...context, snapshot: { status: 'saving', busy: true } }), null);
  const locked = evaluate(initializer('modalRecovery'), { ...context, snapshot: { status: 'recovery-required', busy: true } });
  assert.equal(nodes(locked).find(node => node.type === 'button')!.props.disabled, true);
});

test('inspector native modal closes before returning focus to its menu opener', () => {
  const calls: string[] = [], opener = {};
  const dialog = { open: false, showModal() { this.open = true; calls.push('open'); }, close() { this.open = false; calls.push('close'); } };
  const cleanup = evaluate(effect('const dialog = inspectorDialog.current'), { inspector: 'copy', inspectorDialog: { current: dialog }, document: { activeElement: opener },
    restoreProgramDialogFocus: (target: unknown) => { assert.equal(target, opener); calls.push('return-focus'); } })();
  cleanup(); assert.deepEqual(calls, ['open', 'close', 'return-focus']);
});
test('pending recovery replaces stale failure notice only after confirmed successful resolution', async () => {
  let message='저장 상태 확인이 필요합니다', successful=false;
  const context={pending:true,snapshot:{status:'recovery-required',busy:false},external:false,styles:{},
    controller:{current:{resolvePending:async()=>successful}},openLatest:()=>{},setMessage:(value:string)=>{message=value;}};
  const action=nodes(evaluate(initializer('modalRecovery'),context)).find(node=>node.type==='button')!;
  await action.props.onClick(); assert.equal(message,'저장 상태 확인이 필요합니다');
  successful=true; await action.props.onClick(); assert.equal(message,'저장 결과를 확인했습니다.');
});
type Element = { type: unknown; props: Record<string, any> };
const nodes = (value: any): Element[] => !value ? [] : Array.isArray(value) ? value.flatMap(nodes)
  : typeof value === 'object' && 'props' in value ? [value, ...nodes(value.props.children)] : [];
const text = (value: any): string => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join('')
  : value && typeof value === 'object' ? text(value.props?.children) : '';
function snapshot(ownerId = 'owner-a', revision = 1) {
  const account = { schema: ALPHA_SCHEMA, ownerId, revision, source: { schema: PROGRAM_SCHEMA, actorId: ownerId, revision: 0 }, space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const envelope = materializeAccount(account, { actorIds: [ownerId], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } });
  return { ownerId, account, envelope, status: 'ready', busy: false, pending: null, draft: null, canUndo: false, canRedo: false };
}
function harness() {
  const initial = snapshot(), calls: string[] = [], storageValues = new Map<string, string>();
  const sessionStorage = { getItem: (key: string) => { calls.push(`read:${key}`); return storageValues.get(key) ?? null; },
    setItem: (key: string, raw: string) => { calls.push(`write:${key}`); storageValues.set(key, raw); }, removeItem: (key: string) => storageValues.delete(key) };
  const events = new Map<string, (event?: any) => void>(), copies: string[] = [];
  const context: Record<string, any> = {
    config: {}, session: { userId: 'owner-a', accessToken: 'fixed-a-token' }, email: 'a@example.invalid',
    SLOT_KEY: 'flow:poc:personal-workspace:v1:alpha-m3:tab', POLL_MS: 20_000,
    styles: new Proxy({}, { get: (_, key) => String(key) }), labels: { ready: '서버와 연결됨', conflict: '다른 변경이 먼저 저장되었습니다', 'checking-result': '저장 결과 확인이 필요합니다' },
    capability: { discovery: false, publication: false, copyInspection: false, revisionHistory: false, creatorNavigation: false },
    ProgramSpace: 'program-space', ProgramLegacyWorkspace: 'program-legacy', ProgramPrivateOutput: 'private-output', AlphaConflictReview: 'conflict-review', ProgramCreatorWorkspace: 'creator-workspace',
    AlphaCatalogPanels: 'catalog-panels',
    ProgramDiscovery: 'program-discovery', ProgramCommunity: 'program-community', ProgramPublisher: 'program-publisher', ProgramCopyInspector: 'program-inspector', AlphaPreservationPanel:'preservation-panel',
    preservation:false,preservationRef:{current:false},setPreservation:(value:boolean)=>{context.preservation=value;},
    seen: { discovery: false, community: false }, browse: false, modalRecovery: null, publisher: null, inspector: null, modalRef: { current: false }, inspectorDialog: { current: null },
    discoveryStateRef: { current: { url: '', pastedText: '', pastedTitle: '', transient: null } },
    programDiscoveryHasUnstoredInput: (state: any) => !!(state.url || state.pastedText || state.pastedTitle || state.transient),
    previousSnapshot: { current: null }, executeAlphaSocialIntent,
    currentPublicRevision: { current: null }, publisherEditors: { current: null }, communityEditors: { current: null }, inspectorEditors: { current: null },
    socialRecovery: { current: null }, parkedSocial: { current: [] }, activeSocial: { current: [] }, socialRecoveries: null,
    createAlphaSocialRecovery, setSocialRecoveries: (value: unknown) => { context.socialRecoveries = value; },
    setPublisher: (value: unknown) => { context.publisher = value; }, setInspector: (value: unknown) => { context.inspector = value; },
    snapshot: initial, data: initial.envelope.data, destination: { view: 'space' }, output: null, message: '', recoveries: null,
    storageError: false, external: false, presentation: 0, leave: false, disposed: { current: false }, ownMutation: { current: 0 }, externalRef: { current: false },
    currentData: { current: initial.envelope.data }, currentRevision: { current: initial.account.revision },
    editors: { current: null }, legacyEditors: { current: null }, uiRecovery: { current: null }, controller: { current: null },
    parkedDrafts: { current: [] }, activeDrafts: { current: [] },
    creatorEditors: { current: null }, creatorRecovery: { current: null }, parkedCreator: { current: [] }, activeCreator: { current: null },
    creatorRecoveries: null, creatorSeen: false, creatorSelection: undefined, catalogDetailOpen: false, setCatalogDetailOpen: (value: boolean) => { context.catalogDetailOpen = value; }, destinationRef: { current: { view: 'space' } },
    setCreatorRecoveries: (value: unknown) => { context.creatorRecoveries = value; }, setCreatorSeen: (value: unknown) => { context.creatorSeen = value; }, setCreatorSelection: (value: unknown) => { context.creatorSelection = value; },
    navigate: async () => {}, captureCreatorRoute: () => () => false, restoreCreator: async () => {}, canonicalJson, detached, createAlphaCreatorRecovery,
    setSnapshot: (value: unknown) => { context.snapshot = value; calls.push('snapshot'); }, setData: (value: unknown) => { context.data = value; calls.push('data'); },
    setOutput: (value: unknown) => { context.output = value; }, setRecoveries: (value: unknown) => { context.recoveries = value; },
    setStorageError: (value: unknown) => { context.storageError = value; }, setExternal: (value: unknown) => { context.external = value; },
    setMessage: (value: unknown) => { context.message = typeof value === 'function' ? value(context.message) : value; }, setLeave: (value: unknown) => { context.leave = value; },
    setPresentation: (fn: (value: number) => number) => { context.presentation = fn(context.presentation); }, setDestination: (value: unknown) => { context.destination = value; },
    programErrorMessage: (reason: string) => reason, PROGRAM_BUSY_NOTICE: 'busy', programLocalDate: () => '2026-09-21', M,
    onSignOut: async () => { calls.push('signout'); }, queueMicrotask: (fn: () => void) => fn(),
    sessionStorage, crypto: { randomUUID: () => 'isolated-tab' },
    localStorage: new Proxy({}, { get() { throw Error('operating localStorage must not be used'); } }),
    createAlphaUiRecovery, createAlphaTabRecovery: (storage: unknown, slot: string) => { assert.equal(storage, sessionStorage); assert.equal(slot, 'isolated-tab'); return {}; },
    createAlphaSyncController: () => store, createAlphaHttpRepository: () => ({}), fetch: () => { throw Error('network prohibited'); },
    navigator: { clipboard: { writeText: async (raw: string) => { copies.push(raw); } } },
    window: { addEventListener: (name: string, fn: any) => events.set(name, fn), removeEventListener: (name: string) => events.delete(name), setInterval: (fn: any) => { events.set('interval', fn); return 1; } },
    document: { visibilityState: 'visible', addEventListener: (name: string, fn: any) => events.set(name, fn), removeEventListener: (name: string) => events.delete(name) },
    clearInterval: () => { calls.push('clear-timer'); events.delete('interval'); },
    history: async () => { calls.push('history'); }, restoreDraft: async () => { calls.push('restore'); }, clearDrafts: () => { calls.push('clear-recovery'); },
  };
  const store = { snapshot: () => context.snapshot, mutate: async () => { calls.push('mutation'); return { ok: true, result: 'doc', changed: false }; },
    refresh: async () => { calls.push('refresh'); return true; }, resolvePending: async (retry: boolean) => { calls.push(`resolve:${retry}`); return true; },
    bindSession: () => calls.push('bind'), discardConflict: async () => { calls.push('discard'); return true; }, dispose: () => calls.push('dispose') };
  context.controller.current = store;
  context.mergeRecoveryDrafts = evaluate(`(${declaration('mergeRecoveryDrafts')})`, context);
  context.allEditors = evaluate(initializer('allEditors'), context);
  context.hasInput = evaluate(initializer('hasInput'), context);
  context.captureCreator = evaluate(`(${declaration('captureCreator')})`, context);
  context.captureInput = evaluate(`(${declaration('captureInput')})`, context);
  context.refreshAutomatically = evaluate(`(${declaration('refreshAutomatically')})`, context);
  context.closePreservation = evaluate(`(${declaration('closePreservation')})`, context);
  const present = evaluate(`(${declaration('present')})`, context);
  context.present = present;
  const render = () => {
    context.pending = !!context.snapshot?.pending; context.unavailable = context.snapshot?.status === 'session-expired' || !context.data;
    context.mutate = evaluate(initializer('mutate'), context); context.openLatest = evaluate(`(${declaration('openLatest')})`, context);
    return evaluate(renderExpression, context);
  };
  const button = (name: string) => { const found = nodes(render()).filter(node => node.type === 'button' && text(node.props.children) === name); assert.equal(found.length, 1); return found[0]; };
  return { context, calls, events, storageValues, sessionStorage, copies, store, present, render, button,
    initialize: () => evaluate(effect('createAlphaUiRecovery'), context)(),
    registerEvents: () => evaluate(effect("'beforeunload'"), context)(),
    mutate: () => evaluate(initializer('mutate'), context)('edit', () => { throw Error('controller double must not build'); }),
  };
}

test('preservation lifetime defers all automatic triggers and closes with one catch-up', async () => {
  const h = harness(); h.registerEvents(); h.context.snapshot.references = {};
  h.button('자료 가져오기 · 백업').props.onClick();
  assert.equal(h.context.preservationRef.current, true);
  for (const name of ['interval', 'focus', 'online', 'visibilitychange']) h.events.get(name)!();
  assert(!h.calls.includes('refresh'));
  const panel = nodes(h.render()).find(n => n.type === 'preservation-panel')!;
  await panel.props.onSaved(); assert.equal(h.calls.filter(c => c === 'refresh').length, 1);
  await h.button('서버에서 다시 확인').props.onClick(); assert.equal(h.calls.filter(c => c === 'refresh').length, 2);
  panel.props.onClose(); panel.props.onClose();
  assert.equal(h.calls.filter(c => c === 'refresh').length, 3);
  assert.equal(h.context.preservation, false);
  h.events.get('interval')!(); assert.equal(h.calls.filter(c => c === 'refresh').length, 4);
});

test('hidden or busy preservation close resumes on the next eligible automatic trigger', () => {
  for (const condition of ['hidden', 'busy']) {
    const h = harness(); h.registerEvents(); h.context.preservationRef.current = true;
    if (condition === 'hidden') h.context.document.visibilityState = 'hidden'; else h.context.snapshot.busy = true;
    h.context.closePreservation(); assert(!h.calls.includes('refresh'));
    h.context.document.visibilityState = 'visible'; h.context.snapshot.busy = false;
    h.events.get('focus')!(); assert.deepEqual(h.calls, ['refresh']);
  }
});

test('session binding and pending recovery remain active while preservation is open', () => {
  for (const pending of [null, { requestId: 'same-request' }]) {
    const h = harness(); h.context.preservationRef.current = true; h.context.snapshot.pending = pending;
    evaluate(effect('store.bindSession'), h.context)();
    assert.deepEqual(h.calls, ['bind', pending ? 'resolve:false' : 'refresh']);
  }
});

test('opening preservation does not abort an existing read; teardown removes all automatic sources', async () => {
  const h = harness(); const dispose = h.initialize(), cleanup = h.registerEvents();
  let finish!: () => void, completed = false;
  h.store.refresh = async () => { h.context.snapshot.busy = true; await new Promise<void>(resolve => { finish = resolve; }); completed = true; h.context.snapshot.busy = false; return true; };
  h.events.get('interval')!();
  h.context.preservationRef.current = true;
  h.events.get('focus')!(); finish(); await Promise.resolve(); assert.equal(completed, true);
  const staleFocus = h.events.get('focus')!;
  dispose(); cleanup(); assert.equal(h.events.size, 0);
  staleFocus(); h.context.closePreservation();
  assert.equal(h.context.controller.current, null); assert(h.calls.includes('clear-timer'));
});

test('late editor flush cannot open preservation after logout or account replacement', async () => {
  for (const replacement of [false, true]) {
    const h = harness(); let finish!: (ok: boolean) => void;
    h.context.editors.current = { flushAll: () => new Promise<boolean>(resolve => { finish = resolve; }) };
    h.button('자료 가져오기 · 백업').props.onClick();
    if (replacement) h.context.controller.current = { ...h.store }; else h.context.disposed.current = true;
    finish(true); await Promise.resolve();
    assert.equal(h.context.preservationRef.current, false); assert.equal(h.context.preservation, false);
  }
});

test('an expired or missing preservation snapshot releases its polling hold without restoring private data', () => {
  for (const missing of ['account', 'references']) {
    const h = harness(); h.context.snapshot.references = {}; h.context.preservation = true; h.context.preservationRef.current = true;
    h.context.snapshot[missing] = null; h.context.data = null;
    evaluate(effect('Expiry/failure'), h.context)();
    assert.equal(h.context.preservationRef.current, false); assert.equal(h.context.preservation, false);
    assert.equal(h.context.data, null); assert.equal(h.calls.length, 0);
    h.context.refreshAutomatically(); assert.deepEqual(h.calls, ['refresh']);
  }
});

test('busy mutation keeps captured input and clears only its temporary notice after settlement', async () => {
  const h = harness(); h.initialize();
  const draft = { title: 'unsent', raw: 'Keep exact\r\n input' };
  h.context.editors.current = { captureDrafts: () => [draft], hasPendingInput: () => true };
  h.context.snapshot.busy = true;
  h.context.controller.current = { ...h.store, mutate: async () => ({ ok: false, reason: 'busy' }) };
  assert.deepEqual(await h.mutate(), { ok: false, reason: 'busy' });
  assert.equal(h.context.message, 'busy');
  assert.deepEqual(h.context.uiRecovery.current.read().value.drafts, [draft]);
  h.present({ ...snapshot(), busy: true }); assert.equal(h.context.message, 'busy');
  h.present(snapshot()); assert.equal(h.context.message, '');
  assert.deepEqual(h.context.uiRecovery.current.read().value.drafts, [draft]);
  assert(!h.calls.includes('mutation'));
});

test('settled busy result cannot restore stale notice or erase a later failure', async () => {
  const h = harness(); h.context.snapshot.busy = true;
  let finish!: (value: unknown) => void;
  h.context.controller.current = { ...h.store, mutate: () => new Promise(resolve => { finish = resolve; }) };
  const attempt = h.mutate();
  h.present(snapshot()); h.context.message = 'unresolved';
  finish({ ok: false, reason: 'busy' }); await attempt;
  assert.equal(h.context.message, 'unresolved');
  h.present({ ...snapshot(), status: 'conflict', draft: {} }); assert.equal(h.context.message, 'unresolved');
});

test('pending or failed final snapshot removes busy notice without changing recovery protection', () => {
  for (const status of ['checking-result', 'conflict', 'session-expired']) {
    const h = harness(); h.context.message = 'busy';
    const pending = status === 'checking-result' ? { requestId: 'same' } : null;
    const next = { ...snapshot(), status, pending, draft: status === 'conflict' ? {} : null };
    h.present(next);
    assert.equal(h.context.message, ''); assert.equal(h.context.snapshot.pending, pending);
    assert.equal(h.context.snapshot.status, status);
  }
});

function lostSocialSave() {
  const h=harness(), draft={...newProgramParticipationDraft(),title:'Confirmed draft',body:'Exact input'};
  const command={schema:'flowme-alpha-social-command/1',kind:'social' as const,requestId:'lost-draft-save',expectedRevision:1,expectedPublicRevision:4,
    intent:{type:'participation-save' as const,draft,expected:null}};
  const result=executeAlphaSocialIntent(h.context.currentData.current,'owner-a',command.intent,command.requestId);
  assert(result.ok && result.changed);
  const next=snapshot('owner-a',2);next.account.space=result.data.spaces['owner-a'];next.envelope.data=result.data;
  h.context.currentPublicRevision.current=4;h.context.modalRef.current=true;
  h.context.previousSnapshot.current={...snapshot(),publicRevision:4,pending:command,status:'checking-result'};
  let dirty=true, accepted=true;
  h.context.communityEditors.current={hasPendingInput:()=>dirty,acceptConfirmedSocialDrafts:()=>{if(!accepted)return false;dirty=false;return true;}};
  return {h,next:{...next,status:'saved',publicRevision:4},refuse:()=>{accepted=false;}};
}

test('catalog detail hides but never unmounts the distinct creator draft and import surface', () => {
  const h = harness(); h.context.destination = { view: 'creator' };
  const initial = nodes(h.render());
  const panels = initial.find(n => n.type === 'catalog-panels')!;
  const editor = initial.find(n => n.type === 'creator-workspace')!;
  assert.equal(editor.props.active, true);
  panels.props.onDetailChange(true);
  const detail = nodes(h.render());
  assert.equal(detail.find(n => n.props['aria-label'] === '별도 제작 초안 작업 공간')!.props.hidden, true);
  assert.equal(detail.find(n => n.type === 'creator-workspace')!.props.active, false);
  assert.equal(detail.find(n => n.type === 'catalog-panels')!.props.detailOpen, true);
  panels.props.onDetailChange(false);
  const restored = nodes(h.render());
  assert.equal(restored.find(n => n.props['aria-label'] === '별도 제작 초안 작업 공간')!.props.hidden, false);
  assert.equal(restored.find(n => n.type === 'catalog-panels')!.props.detailOpen, false);
  assert.equal(h.calls.length, 0);
});
test('M5 exact lost private draft acknowledgement advances an open modal without freezing',()=>{
  const {h,next}=lostSocialSave();h.present(next);assert.equal(h.context.external,false);assert.equal(h.context.currentRevision.current,2);assert.equal(h.context.data,next.envelope.data);
});
for(const scenario of ['no-pending','revision-jump','public-revision','public-bytes','private-other','newer-or-composing','other-input','already-external'] as const){
 test(`M5 draft acknowledgement cannot bypass modal protection for ${scenario}`,()=>{
  const {h,next,refuse}=lostSocialSave();
  if(scenario==='no-pending')h.context.previousSnapshot.current.pending=null;
  if(scenario==='revision-jump')next.account.revision=3;
  if(scenario==='public-revision')next.publicRevision=5;
  if(scenario==='public-bytes')next.envelope.data.public={...next.envelope.data.public,posts:[{id:'external-post'} as any]};
  if(scenario==='private-other')next.account.space.position.scrollTop=42;
  if(scenario==='newer-or-composing')refuse();
  if(scenario==='other-input')h.context.editors.current={hasPendingInput:()=>true,captureDrafts:()=>[]};
  if(scenario==='already-external'){h.context.externalRef.current=true;h.context.external=true;}
  h.present(next);assert.equal(h.context.external,true);assert.equal(h.context.currentRevision.current,1);
 });
}

test('M4 creator capture stores full context separately and never offers personal-document recovery for comparison JSON', () => {
  const h=harness(); h.initialize();
  const working={draftId:'creator-a',title:'제작 입력',rawText:'# 제목\r\n- [ ] 한글',baseRecordRevision:null};
  h.context.creatorEditors.current={hasPendingInput:()=>true,captureCreatorWorking:()=>working,
    captureDrafts:()=>[{title:'제작 입력',raw:working.rawText},{title:'개인 실행 비교 선택',raw:'{"선택":"유지"}'}]};
  assert(h.context.captureInput());
  assert.equal(h.context.recoveries,null);assert.deepEqual(h.context.creatorRecoveries.entries[0].working,working);
  assert.equal(h.context.creatorRecoveries.entries[0].auxiliaries[0].raw,'{"선택":"유지"}');
  const rendered=h.render(); assert(text(rendered).includes('제작 작업본으로 복구'));assert(!text(rendered).includes('새 문서로 복구'));
  working.rawText+='새 입력';h.context.captureInput();assert.equal(h.context.creatorRecoveries.entries.length,1);
});
test('M4 creator-only unsent input is captured before account expiry and protected from a foreign response', () => {
  const h=harness();h.initialize();
  h.context.creatorEditors.current={hasPendingInput:()=>true,captureCreatorWorking:()=>({draftId:'creator-a',title:'제작 입력',rawText:'# 미저장',baseRecordRevision:null}),captureDrafts:()=>[{title:'제작 입력',raw:'# 미저장'}]};
  h.present({...snapshot(),account:null,envelope:null,status:'session-expired'});assert.equal(h.context.data,null);assert.equal(h.context.creatorRecoveries.entries.length,1);
  const before=h.storageValues.size;h.context.disposed.current=true;h.present(snapshot('owner-b'));assert.equal(h.context.data,null);assert.equal(h.storageValues.size,before);
});
test('M4 creator recovery failure blocks dispatch instead of falling back to personal raw recovery', async () => {
  const h=harness();h.initialize();h.context.creatorEditors.current={hasPendingInput:()=>true,captureCreatorWorking:()=>({draftId:'creator-a',title:'제작',rawText:'# 원문',baseRecordRevision:null}),captureDrafts:()=>[]};
  h.context.creatorRecovery.current={save:()=>({ok:false,reason:'storage-unavailable'})};
  assert.deepEqual(await h.mutate(),{ok:false,reason:'recovery-required'});assert.equal(h.context.storageError,true);assert(!h.calls.includes('mutation'));
});

test('M4 confirmed response acknowledges exact creator input before detecting an external conflict', () => {
  const h=harness(); let dirty=true, accepted=0;
  const next=snapshot('owner-a',2), working={draftId:'creator-a',title:'확인된 입력',rawText:'# 원문',baseRecordRevision:null};
  (next.account.space as any).creatorWorkspace={working};
  h.context.creatorEditors.current={hasPendingInput:()=>dirty,acceptConfirmedCreatorWorking:(value:unknown)=>{assert.deepEqual(value,working);dirty=false;accepted++;return true;}};
  h.present({...next,status:'saved'});
  assert.equal(accepted,1);assert.equal(h.context.external,false);assert.equal(h.context.currentRevision.current,2);
  assert.equal(h.context.data,next.envelope.data);
});
test('M4 newer creator or personal input still blocks response replacement; unresolved and foreign responses cannot acknowledge', () => {
  const h=harness(); let accepts=0;
  h.context.creatorEditors.current={hasPendingInput:()=>true,acceptConfirmedCreatorWorking:()=>{accepts++;return false;}};
  h.present({...snapshot('owner-a',2),status:'saved'});assert.equal(h.context.external,true);assert.equal(h.context.currentRevision.current,1);
  h.present({...snapshot('owner-a',2),pending:{requestId:'pending'}});assert.equal(accepts,1);
  h.present({...snapshot('owner-b',3),status:'saved'});assert.equal(accepts,1);
  const personal=harness();personal.context.creatorEditors.current={hasPendingInput:()=>false,acceptConfirmedCreatorWorking:()=>true};
  personal.context.editors.current={hasPendingInput:()=>true,captureDrafts:()=>[]};
  personal.present({...snapshot('owner-a',2),status:'saved'});assert.equal(personal.context.external,true);
});

test('actual initialization and beforeunload preserve unsent raw in the owner/tab session slot without localStorage access', () => {
  const h = harness(), dispose = h.initialize(), cleanup = h.registerEvents();
  const draft = { documentId: 'doc-a', title: '미저장 입력', raw: '한글 조합 😀\r\n두 번째 줄  ' };
  h.context.editors.current = { hasPendingInput: () => true, captureDrafts: () => [draft] };
  let prevented = false; const event = { preventDefault() { prevented = true; }, returnValue: undefined as string | undefined };
  h.events.get('beforeunload')!(event);
  const key = alphaUiRecoveryKey('owner-a', 'isolated-tab'), saved = JSON.parse(h.storageValues.get(key)!);
  assert.deepEqual(saved.drafts, [draft]); assert.equal(saved.ownerId, 'owner-a'); assert.equal(saved.slotId, 'isolated-tab');
  assert(prevented); assert.equal(event.returnValue, ''); assert(!h.calls.includes('mutation'));
  assert(h.calls.filter(call => call.startsWith('write:')).every(call => call.startsWith('write:flow:poc:personal-workspace:v1:')));
  cleanup(); dispose(); assert.equal(h.events.size, 0);
});

test('actual expiry presentation captures unsent input before hiding account content and output', () => {
  const h = harness(); h.context.output = 'private-doc';
  h.context.editors.current = { hasPendingInput: () => true, captureDrafts: () => [{ title: 'A 원문', raw: 'private A' }] };
  h.context.uiRecovery.current = { save: () => { assert.notEqual(h.context.data, null); h.calls.push('capture'); return { ok: true, value: null }; } };
  h.present({ ...snapshot(), account: null, envelope: null, status: 'session-expired' });
  assert.equal(h.context.data, null); assert.equal(h.context.currentData.current, null); assert.equal(h.context.output, null);
  assert(h.calls.indexOf('capture') < h.calls.indexOf('data'));
  assert.equal(nodes(h.render()).filter(node => node.type === 'program-space').length, 0);
});

test('disposed account responses cannot reveal content or capture into a later account', () => {
  const h = harness(), original = h.context.snapshot; h.context.disposed.current = true;
  h.present(snapshot('owner-b', 9)); assert.equal(h.context.snapshot, original); assert.equal(h.calls.length, 0);
});

test('auth shell gates the workspace by verified owner and gives each account a separate React key', () => {
  const authSource = readFileSync(new URL('./AlphaAuthPanel.tsx', import.meta.url), 'utf8');
  const authAst = ts.createSourceFile('AlphaAuthPanel.tsx', authSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const gate = find(node => ts.isIfStatement(node) && node.thenStatement.getText(authAst).includes('<AlphaWorkspace'), authAst) as ts.IfStatement;
  const base = { config: {}, workspaceSession: { userId: 'owner-a' }, workspaceOwner: 'owner-a', signedIn: true, mode: 'login', recoveryBlocked: false, callbackPhase: 'ready' };
  assert.equal(evaluate(gate.expression.getText(authAst), base), true);
  for (const patch of [{ workspaceOwner: 'owner-b' }, { workspaceOwner: null }, { workspaceSession: null }, { signedIn: false }, { mode: 'new-password' }, { recoveryBlocked: true }, { callbackPhase: 'pending' }]) {
    assert(!evaluate(gate.expression.getText(authAst), { ...base, ...patch }));
  }
  const child = find(node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(authAst) === 'AlphaWorkspace', authAst) as ts.JsxSelfClosingElement;
  for (const owner of ['owner-a', 'owner-b']) {
    const rendered = evaluate(child.getText(authAst), { ...base, workspaceSession: { userId: owner }, accountEmail: 'private', signOut: () => {}, AlphaWorkspace: 'alpha-workspace' });
    assert.equal(rendered.key, owner);
  }
});

test('pending response recovery dispatches the existing request lookup/retry, never a fresh mutation', async () => {
  const h = harness(); h.context.snapshot = { ...snapshot(), status: 'checking-result', pending: { requestId: 'same-request' } };
  const action = h.button('저장 결과 확인 · 같은 요청 재시도'); assert.equal(!!action.props.disabled, false);
  action.props.onClick(); await Promise.resolve(); assert.deepEqual(h.calls, ['resolve:true']);
  h.context.snapshot.status = 'saving'; assert.equal(nodes(h.render()).filter(node => node.type === 'button' && text(node) === '저장 결과 확인 · 같은 요청 재시도').length, 0);
});

test('latest-state action waits for active refresh and never labels a failed read as latest', async () => {
  const h=harness();h.context.external=true;h.context.externalRef.current=true;h.context.snapshot={...snapshot(),busy:true};
  assert.equal(h.button('입력 보관 후 최신 내용 열기').props.disabled,true);
  await h.context.openLatest();assert(!h.calls.includes('refresh'));assert(h.context.message.includes('서버 확인 중'));
  h.context.snapshot={...snapshot(),busy:false};h.store.refresh=async()=>false;h.render();await h.context.openLatest();
  assert.equal(h.context.externalRef.current,true);assert.equal(h.context.presentation,0);assert(h.context.message.includes('확인하지 못했습니다'));
});
test('conflict resolution uses its own successful refresh once, without a second racing refresh', async () => {
  const h=harness();h.context.snapshot={...snapshot(),status:'conflict',draft:{}};h.context.externalRef.current=true;
  h.render();await h.context.openLatest();assert.equal(h.calls.filter(c=>c==='discard').length,1);assert(!h.calls.includes('refresh'));assert.equal(h.context.externalRef.current,false);
});

test('conflict passes the exact draft/account to the readable comparison and renders no command JSON', async () => {
  const h = harness(); const draft: AlphaCommand = { schema: ALPHA_COMMAND_SCHEMA, requestId: 'private-command-id', expectedRevision: 0, kind: 'change-private', changes: [] };
  h.context.snapshot = { ...snapshot(), status: 'conflict', draft };
  const tree = h.render(), comparisons = nodes(tree).filter(node => node.type === 'conflict-review'); assert.equal(comparisons.length, 1);
  assert.equal(comparisons[0].props.draft, draft); assert.equal(comparisons[0].props.account, h.context.snapshot.account);
  assert(!text(tree).includes('private-command-id')); assert.equal(nodes(tree).filter(node => node.type === 'textarea').length, 0);
  await comparisons[0].props.onCopy('원문만\r\n😀'); assert.deepEqual(h.copies, ['원문만\r\n😀']); assert(!h.calls.includes('mutation'));
});

test('known storage failure and a newly failed raw capture both prevent mutations', async () => {
  for (const alreadyFailed of [true, false]) {
    const h = harness(); h.context.storageError = alreadyFailed;
    h.context.editors.current = { hasPendingInput: () => true, captureDrafts: () => [{ title: '원문', raw: 'unsent' }] };
    h.context.uiRecovery.current = { save: () => ({ ok: false, reason: 'storage-unavailable' }) };
    assert.deepEqual(await h.mutate(), { ok: false, reason: 'recovery-required' });
    assert.equal(h.context.ownMutation.current, 0); assert(!h.calls.includes('mutation')); assert(h.context.storageError);
  }
});

test('external snapshot preserves dirty editors until a successful explicit capture and latest-state action', async () => {
  const h = harness(), initial = h.context.data; let available = false;
  h.context.editors.current = { hasPendingInput: () => true, captureDrafts: () => [{ title: '계속 작성', raw: 'draft' }] };
  h.context.uiRecovery.current = { save: () => available ? { ok: true, value: null } : { ok: false, reason: 'storage-unavailable' } };
  h.present(snapshot('owner-a', 2)); assert.equal(h.context.data, initial); assert(h.context.externalRef.current);
  h.render(); await h.context.openLatest(); assert(!h.calls.includes('refresh')); assert.equal(h.context.data, initial);
  available = true; h.render(); await h.context.openLatest(); assert(h.calls.includes('refresh')); assert.equal(h.context.externalRef.current, false);
});
test('reloaded parked input survives new active drafts and continuous typing replaces only the active version', () => {
  const h=harness(), ui=createAlphaUiRecovery(h.sessionStorage,{ownerId:'owner-a',slotId:'isolated-tab'});
  assert(ui.read().ok);
  const parked={documentId:'old-doc',title:'충돌 후 보관',raw:'A\r\n남긴 원문  '}; assert(ui.save([parked]).ok);
  h.initialize();
  let active={documentId:'new-doc',title:'새 편집',raw:'B'};
  h.context.editors.current={hasPendingInput:()=>true,captureDrafts:()=>[active]};
  assert(h.context.captureInput());
  active={...active,raw:'BC'}; assert(h.context.captureInput());
  active={...active,raw:'BCD'}; assert(h.context.captureInput());
  const saved=h.context.uiRecovery.current.read(); assert(saved.ok);
  assert.deepEqual(saved.value.drafts,[parked,active]);
  assert.deepEqual(h.context.parkedDrafts.current,[parked]); assert.deepEqual(h.context.activeDrafts.current,[active]);
});
test('openLatest parks current conflict input and later editing preserves it without per-keystroke accumulation', async () => {
  const h=harness(); h.initialize();
  const parked={documentId:'same-doc',title:'같은 문서',raw:'내 충돌 원문'};
  let active={...parked}; h.context.editors.current={hasPendingInput:()=>true,captureDrafts:()=>[active]};
  h.context.snapshot={...snapshot(),status:'conflict',draft:{}}; h.render(); await h.context.openLatest();
  assert.deepEqual(h.context.parkedDrafts.current,[parked]);
  active={...parked,raw:'최신 문서에서 새 입력'}; assert(h.context.captureInput());
  active={...active,raw:'최신 문서에서 새 입력 2'}; assert(h.context.captureInput());
  assert.deepEqual(h.context.uiRecovery.current.read().value.drafts,[parked,active]);
});
test('parked and active drafts deduplicate exact identity only; temporary empty ports do not erase durable input', () => {
  const h=harness(); h.initialize();
  const draft={documentId:'doc',title:'title',raw:'exact\r\n'};
  h.context.parkedDrafts.current=[draft]; h.context.editors.current={captureDrafts:()=>[draft,{...draft,raw:'exact\n'}]};
  assert(h.context.captureInput()); assert.equal(h.context.uiRecovery.current.read().value.drafts.length,2);
  h.context.editors.current=null; assert(h.context.captureInput()); assert.equal(h.context.uiRecovery.current.read().value.drafts.length,2);
});
test('explicit recovery discard clears parked memory, preventing resurrection on the next capture', () => {
  const h=harness(); h.initialize();
  const old={title:'parked',raw:'old'}; h.context.parkedDrafts.current=[old];
  h.context.editors.current={captureDrafts:()=>[old]}; assert(h.context.captureInput());
  evaluate(`(${declaration('clearDrafts')})`,h.context)();
  assert.deepEqual(h.context.parkedDrafts.current,[]); assert.deepEqual(h.context.activeDrafts.current,[]);
  const fresh={title:'active',raw:'new'}; h.context.editors.current={captureDrafts:()=>[fresh]}; assert(h.context.captureInput());
  assert.deepEqual(h.context.uiRecovery.current.read().value.drafts,[fresh]);
});
test('confirmed all-draft server match clears parked memory as well as the durable record', async () => {
  const h=harness(); h.initialize();
  let workspace=M.addDocument(h.context.snapshot.account.space.text,{title:'서버 확인'});
  const documentId=workspace.documents[0].id; workspace=M.editText(workspace,documentId,'서버에 있는 원문');
  h.context.snapshot.account.space.text=workspace;
  const draft={documentId,title:'서버 확인',raw:'서버에 있는 원문'};
  h.context.parkedDrafts.current=[draft]; h.context.editors.current={captureDrafts:()=>[draft]};
  assert(h.context.captureInput()); const outcome=await h.mutate(); assert(outcome.ok,JSON.stringify({outcome,calls:h.calls,storageError:h.context.storageError}));
  assert.equal(h.context.uiRecovery.current.read().value,null);
  assert.deepEqual(h.context.parkedDrafts.current,[]); assert.deepEqual(h.context.activeDrafts.current,[]);
});
