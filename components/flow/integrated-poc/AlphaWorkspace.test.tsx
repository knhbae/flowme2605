import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createAlphaUiRecovery, alphaUiRecoveryKey } from '../../../lib/flow/integrated-poc/alpha-ui-recovery';
import { createProgramPrivateSpace } from '../../../lib/flow/integrated-poc/program-data';
import { ALPHA_COMMAND_SCHEMA, ALPHA_SCHEMA, type AlphaCommand } from '../../../lib/flow/integrated-poc/alpha-persistence/contract';
import { PROGRAM_SCHEMA } from '../../../lib/flow/integrated-poc/contract';
import { materializeAccount, privateChanges } from '../../../lib/flow/integrated-poc/alpha-persistence/program-adapter';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import { createAlphaCreatorRecovery } from '../../../lib/flow/integrated-poc/alpha-creator-recovery';
import { canonicalJson, detached } from '../../../lib/flow/integrated-poc/alpha-persistence/json';
import { createAlphaSocialRecovery } from '../../../lib/flow/integrated-poc/alpha-social-recovery';
import { executeAlphaSocialIntent } from '../../../lib/flow/integrated-poc/alpha-social/dispatch';
import { newProgramParticipationDraft } from '../../../lib/flow/integrated-poc/participation-editor';
import { confirmedAlphaPrivateTextSave } from '../../../lib/flow/integrated-poc/alpha-private-save-ack';
import { programLocation } from '../../../lib/flow/integrated-poc/navigation';

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
    currentOwnerRef: { current: 'owner-a' }, confirmedAlphaPrivateTextSave,
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

function lostPrivateTextSave() {
  const h = harness(), before = snapshot();
  before.account.space.text = M.addDocument(before.account.space.text, { title: '개인 메모' });
  const documentId = before.account.space.text.documents[0].id;
  before.account.space.text = M.editText(before.account.space.text, documentId, '원래 메모');
  before.envelope = materializeAccount(before.account, { actorIds: ['owner-a'], public: before.envelope.data.public });
  const next = structuredClone(before); next.account.revision++;
  next.account.space.text = M.editText(next.account.space.text, documentId, '제출한 메모');
  next.envelope = materializeAccount(next.account, { actorIds: ['owner-a'], public: before.envelope.data.public });
  const pending = { schema: ALPHA_COMMAND_SCHEMA, kind: 'change-private' as const, requestId: 'same-private-request', expectedRevision: 1,
    changes: privateChanges(before.account.space, next.account.space) };
  Object.assign(h.context, { data: before.envelope.data });
  h.context.currentData.current = before.envelope.data; h.context.currentRevision.current = 1;
  h.context.previousSnapshot.current = { ...before, pending, draft: pending, status: 'checking-result' };
  let dirty = true, eligible = true, acknowledgments = 0;
  const port = { hasPendingInput: () => dirty, captureDrafts: () => dirty ? [{ documentId, title: '개인 메모', raw: '제출한 메모' }] : [],
    acceptConfirmedPrivateText: (expected: unknown, confirmed: unknown) => {
      acknowledgments++; assert.deepEqual(expected, before.account.space.text); assert.deepEqual(confirmed, next.account.space.text);
      if (!eligible) return false; dirty = false; return true;
    } };
  h.context.editors.current = port;
  const result = { ...next, status: 'saved', lastReceipt: { requestId: pending.requestId, kind: pending.kind, changed: true, revision: 2 } };
  return { h, before, result, documentId, dirty: () => dirty, acknowledgments: () => acknowledgments, refuse: () => { eligible = false; } };
}

test('browse opens the same Flow search with or without community posts', async () => {
  for (const posts of [[], [{ id: 'visible-post' }]]) {
    const h = harness(), destinations: unknown[] = [];
    h.context.data.public.posts = posts;
    h.context.navigate = async (next: unknown) => { destinations.push(next); };
    await h.button('둘러보기').props.onClick();
    assert.deepEqual(destinations, [{ view: 'discover' }]);
    assert(!h.calls.includes('mutation'));
  }
});

test('purpose tabs retain three entries and Flow search precedes optional community browsing', () => {
  const h = harness(); h.context.browse = true; h.context.destination = { view: 'discover' };
  const tree = h.render();
  const purpose = nodes(tree).find(node => node.type === 'nav' && node.props['aria-label'] === '작업 공간')!;
  assert.deepEqual(nodes(purpose.props.children).filter(node => node.type === 'button').map(node => text(node.props.children)), ['내 공간', '둘러보기', '내 활동']);
  const browsing = nodes(tree).find(node => node.type === 'nav' && node.props['aria-label'] === '둘러보기 종류')!;
  const entries = nodes(browsing.props.children).filter(node => node.type === 'button');
  assert.deepEqual(entries.map(node => text(node.props.children)), ['Flow 찾기', '경험·질문·지식']);
  assert.equal(entries[0].props['aria-current'], 'page'); assert.equal(entries[1].props['aria-current'], undefined);
});

test('alpha discovery uses account ownership copy without changing the public data', () => {
  const h = harness(), before = JSON.stringify(h.context.data);
  Object.assign(h.context, { seen: { discovery: true, community: false }, discoverySelection: undefined,
    discoveryState: {}, useVersion: () => assert.fail('render must not import'), startText: () => assert.fail('render must not create'),
    setDiscoveryState: () => assert.fail('render must not change presentation') });
  const discovery = nodes(h.render()).find(node => node.type === 'program-discovery')!;
  assert.equal(discovery.props.storageScope, 'account');
  assert.equal(JSON.stringify(h.context.data), before); assert(!h.calls.includes('mutation'));
});

test('discovery creation entry only navigates to the remembered private creator draft without a write', () => {
  const h = harness(), destinations: unknown[] = [], before = JSON.stringify(h.context.data);
  Object.assign(h.context, { seen: { discovery: true, community: false }, discoverySelection: undefined,
    discoveryState: {}, creatorSelection: 'remembered-private-draft',
    useVersion: () => assert.fail('creation entry must not import'), startText: () => assert.fail('creation entry must not create a document'),
    setDiscoveryState: () => assert.fail('creation entry must not change discovery'), navigate: (next: unknown) => { destinations.push(next); } });
  const discovery = nodes(h.render()).find(node => node.type === 'program-discovery')!;
  discovery.props.onCreateFlow();
  assert.deepEqual(destinations, [{ view: 'creator', id: 'remembered-private-draft' }]);
  assert.equal(JSON.stringify(h.context.data), before); assert.deepEqual(h.calls, []);
});

test('content navigation keeps pending input and stops before changing location until all editors flush', async () => {
  for (const view of ['discover', 'creator'] as const) for (const block of ['pending', 'external', 'flush', 'none']) {
    const h = harness(), routes: string[] = [], raw = { title: '작성 중인 원문', raw: '유지할 입력\n두 번째 줄' };
    let captured = 0, locked = 0, flushed = 0;
    h.context.captureInput = () => { captured++; return true; };
    h.context.editors.current = { captureDrafts: () => [raw], hasPendingInput: () => true,
      lockInput: () => { locked++; return () => { locked--; }; }, flushAll: async () => { flushed++; return block !== 'flush'; } };
    h.context.externalRef.current = block === 'external';
    h.context.snapshot.pending = block === 'pending' ? { requestId: 'unchanged-request' } : null;
    Object.assign(h.context, { programLocation, setSeen: (update: (value: unknown) => unknown) => { h.context.seen = update(h.context.seen); },
      setDiscoverySelection: (value: unknown) => { h.context.discoverySelection = value; }, setCommunityView: () => {}, setCommunitySelection: () => {} });
    h.context.window.location = { hash: '#flowme/space' };
    h.context.window.history = { pushState: (_state: unknown, _title: string, route: string) => { routes.push(route); } };
    const navigate = evaluate(`(${declaration('navigate')})`, h.context);
    const before = JSON.stringify(h.context.data); await navigate({ view });
    assert.equal(locked, 0); assert.equal(raw.raw, '유지할 입력\n두 번째 줄'); assert.equal(JSON.stringify(h.context.data), before);
    if (block === 'none') { assert.deepEqual(routes, [`#flowme/${view}`]); assert.equal(h.context.destination.view, view); }
    else { assert.deepEqual(routes, []); assert.equal(h.context.destination.view, 'space'); }
    assert.equal(captured, ['pending', 'external'].includes(block) ? 0 : 1);
    assert.equal(flushed, ['pending', 'external'].includes(block) ? 0 : 1); assert(!h.calls.includes('mutation'));
  }
});

test('actual private response presentation acknowledges submitted input before conflict classification and clears only matching recovery', () => {
  const f = lostPrivateTextSave(), { h } = f;
  h.context.uiRecovery.current = createAlphaUiRecovery(h.sessionStorage, { ownerId: 'owner-a', slotId: 'private-ack' });
  assert(h.context.uiRecovery.current.read().ok);
  const saved = h.context.uiRecovery.current.save([{ documentId: f.documentId, title: '개인 메모', raw: '제출한 메모' }]); assert(saved.ok);
  h.context.recoveries = saved.value;
  h.present(f.result);
  assert.equal(f.acknowledgments(), 1); assert.equal(f.dirty(), false); assert.equal(h.context.external, false);
  assert.equal(h.context.currentRevision.current, 2); assert.equal(h.context.data, f.result.envelope.data);
  assert.equal(h.context.recoveries, null); assert.equal(h.context.uiRecovery.current.read().value, null);
  h.present(f.result); assert.equal(f.acknowledgments(), 1); assert(!h.calls.includes('mutation'));
});

test('private acknowledgment keeps unmatched parked recovery rather than clearing an entire record', () => {
  const f = lostPrivateTextSave(), { h } = f;
  h.context.uiRecovery.current = createAlphaUiRecovery(h.sessionStorage, { ownerId: 'owner-a', slotId: 'private-ack-unmatched' });
  assert(h.context.uiRecovery.current.read().ok);
  const saved = h.context.uiRecovery.current.save([{ documentId: f.documentId, title: '個人 메모', raw: '예전 보관 입력' }]); assert(saved.ok);
  h.context.recoveries = saved.value; h.present(f.result);
  assert.equal(f.dirty(), false); assert.equal(h.context.external, false); assert.deepEqual(h.context.uiRecovery.current.read().value, saved.value);
});

test('poll reading a pending write does not poison its later receipt acknowledgment or lend the read authority', () => {
  const f = lostPrivateTextSave(), { h } = f;
  const pending = h.context.previousSnapshot.current.pending;
  h.present({ ...f.result, status: 'checking-result', pending, draft: pending });
  assert.equal(f.acknowledgments(), 0); assert(f.dirty()); assert.equal(h.context.external, false);
  assert.equal(h.context.currentRevision.current, 1); assert.equal(h.context.data, f.before.envelope.data);
  h.present(f.result); assert.equal(f.acknowledgments(), 1); assert.equal(h.context.external, false);
  assert.equal(h.context.currentRevision.current, 2); assert.equal(f.dirty(), false);
});

test('poll with a later foreign revision stays pending, then preserves input as a real conflict on result resolution', () => {
  const f = lostPrivateTextSave(), { h } = f;
  const pending = h.context.previousSnapshot.current.pending;
  f.result.account.revision = 3;
  h.present({ ...f.result, status: 'checking-result', pending, draft: pending });
  assert.equal(h.context.external, false); assert.equal(h.context.currentRevision.current, 1);
  h.present(f.result); assert.equal(f.acknowledgments(), 0); assert.equal(h.context.external, true); assert(f.dirty());
});

test('newer private input or another dirty editor remains protected after an exact server receipt', () => {
  for (const mode of ['newer', 'other-editor']) {
    const f = lostPrivateTextSave(), { h } = f;
    if (mode === 'newer') f.refuse();
    else h.context.legacyEditors.current = { hasPendingInput: () => true, captureDrafts: () => [{ title: '다른 입력', raw: '원문 보존' }] };
    h.present(f.result); assert.equal(h.context.external, true); assert.equal(h.context.currentRevision.current, 1);
    assert.equal(h.context.data, f.before.envelope.data); assert.equal(f.dirty(), mode === 'newer');
  }
});

test('plain refresh, nonmatching receipt, later revision and an existing conflict never acknowledge private input', () => {
  for (const mode of ['no-pending', 'receipt', 'revision', 'already-external', 'owner', 'modal']) {
    const f = lostPrivateTextSave(), { h } = f;
    if (mode === 'no-pending') h.context.previousSnapshot.current.pending = null;
    if (mode === 'receipt') f.result.lastReceipt.requestId = 'other-request';
    if (mode === 'revision') f.result.account.revision = 3;
    if (mode === 'already-external') h.context.externalRef.current = true;
    if (mode === 'owner') h.context.previousSnapshot.current.ownerId = 'owner-b';
    if (mode === 'modal') h.context.modalRef.current = true;
    h.present(f.result);
    assert.equal(h.context.currentRevision.current, 1, mode); assert.equal(h.context.data, f.before.envelope.data, mode);
    assert.equal(f.acknowledgments(), mode === 'modal' ? 1 : 0, mode);
  }
});

test('response from an old owner closure cannot acknowledge or present a later account', () => {
  const f = lostPrivateTextSave(); f.h.context.currentOwnerRef.current = 'owner-b';
  f.h.present(f.result); assert.equal(f.acknowledgments(), 0); assert.equal(f.h.calls.length, 0); assert(f.dirty());
});

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

test('known rejected private input offers correction without claiming an external conflict', () => {
  const h = harness();
  h.context.snapshot = { ...snapshot(), status: 'recovery-required', draft: {}, retryableRejectedDraft: true };
  const tree = h.render();
  assert(text(tree).includes('저장 거절 · 입력 보존됨'));
  assert(text(tree).includes('문서에서 내용을 수정한 뒤'));
  assert.equal(nodes(tree).filter(node => node.type === 'conflict-review').length, 0);
  assert.equal(nodes(tree).filter(node => node.props['aria-label'] === '다른 기기 변경과 입력 보호').length, 0);
  assert.equal(evaluate(initializer('modalRecovery'), h.context), null);
  h.context.external = true;
  assert(nodes(h.render()).some(node => node.props['aria-label'] === '다른 기기 변경과 입력 보호'));
});

test('known rejected save notice does not direct intact input to a reload', async () => {
  const h = harness(); h.initialize();
  h.context.snapshot = { ...snapshot(), status: 'recovery-required', draft: {}, retryableRejectedDraft: true };
  h.context.controller.current = { ...h.store, mutate: async () => ({ ok: false, reason: 'recovery-required' }) };
  await h.mutate();
  assert.equal(h.context.message, '저장되지 않았습니다. 입력을 수정한 뒤 다시 저장해 주세요.');
  assert(!h.context.message.includes('새로고침'));
});

test('NHUI01 definitive native handoff rejection keeps the existing comparison without generic private correction or conflict actions', () => {
  const h = harness();
  h.context.snapshot = { ...snapshot(), status: 'recovery-required', draft: { kind: 'creator' }, retryableNativeHandoff: true };
  const tree = h.render();
  assert(text(tree).includes('저장 거절 · 입력 보존됨'));
  assert(text(tree).includes('비교와 선택은 유지했습니다. 같은 선택으로 다시 적용해 주세요.'));
  assert(!text(tree).includes('문서에서 내용을 수정한 뒤'));
  assert.equal(nodes(tree).filter(node => node.type === 'conflict-review').length, 0);
  assert.equal(nodes(tree).filter(node => node.props['aria-label'] === '다른 기기 변경과 입력 보호').length, 0);
  assert.equal(evaluate(initializer('modalRecovery'), h.context), null);
  assert(!h.calls.includes('mutation')); assert(!h.calls.includes('discard'));
  h.context.external = true;
  assert(nodes(h.render()).some(node => node.props['aria-label'] === '다른 기기 변경과 입력 보호'));
});

test('NHUI02 native retry guidance requires live eligibility and unknown pending still directs to the same request', async () => {
  const h = harness(); h.initialize();
  h.context.snapshot = { ...snapshot(), status: 'recovery-required', draft: { kind: 'creator' }, retryableNativeHandoff: true };
  h.context.controller.current = { ...h.store, mutate: async () => ({ ok: false, reason: 'limit' }) };
  await h.mutate();
  assert.equal(h.context.message, '저장되지 않았습니다. 비교와 선택은 유지했습니다. 같은 선택으로 다시 적용해 주세요.');
  h.context.snapshot.pending = { requestId: 'unknown-handoff' };
  await h.mutate(); assert.equal(h.context.message, 'checking-result');
  h.render();
  const pendingRecovery = evaluate(initializer('modalRecovery'), h.context);
  assert.equal(pendingRecovery.props['aria-label'], '저장 결과 복구');
  assert.equal(h.calls.includes('resolve:true'), false);
});

test('NHUI03 a recovered or invalidated native draft retains the latest-comparison recovery path, not direct retry guidance', () => {
  const h = harness();
  h.context.snapshot = { ...snapshot(), status: 'recovery-required', draft: { kind: 'creator' }, retryableNativeHandoff: false };
  const tree = h.render();
  assert(!text(tree).includes('같은 선택으로 다시 적용해 주세요.'));
  assert(nodes(tree).some(node => node.props['aria-label'] === '다른 기기 변경과 입력 보호'));
  assert.equal(nodes(evaluate(initializer('modalRecovery'), h.context)).filter(node => node.type === 'button').length, 1);
  assert(!h.calls.includes('mutation')); assert(!h.calls.includes('discard'));
});

test('unknown save notice directs to the same-request result check instead of a reload', async () => {
  const h = harness(); h.initialize();
  h.context.snapshot = { ...snapshot(), status: 'recovery-required', pending: { requestId: 'still-pending' } };
  h.context.controller.current = { ...h.store, mutate: async () => ({ ok: false, reason: 'recovery-required' }) };
  await h.mutate();
  assert.equal(h.context.message, 'checking-result');
});

test('SRUI01 definitive participation draft refusal offers correction in its current composer, not a conflict or reload', async () => {
  const h = harness(); h.initialize();
  h.context.snapshot = { ...snapshot(), status: 'recovery-required', draft: { kind: 'social' }, retryableRejectedSocialDraft: true };
  h.context.controller.current = { ...h.store, mutate: async () => ({ ok: false, reason: 'rate-limited' }) };
  await h.mutate();
  assert.equal(h.context.message, '글 입력은 남아 있습니다. 내용을 수정하거나 ‘나중에 이어 쓰기’를 눌러 다시 보관해 주세요.');
  const tree = h.render();
  assert(text(tree).includes('저장 거절 · 입력 보존됨'));
  assert(text(tree).includes('나중에 이어 쓰기'));
  assert(!text(tree).includes('문서에서 내용을 수정한 뒤'));
  assert.equal(nodes(tree).filter(node => node.props['aria-label'] === '다른 기기 변경과 입력 보호').length, 0);
  assert.equal(nodes(tree).filter(node => node.type === 'conflict-review').length, 0);
  assert.equal(evaluate(initializer('modalRecovery'), h.context), null);
});

test('SRUI02 pending acknowledgment wins over a stale retry flag without claiming rejection', async () => {
  const h = harness(); h.initialize();
  h.context.snapshot = { ...snapshot(), status: 'recovery-required', draft: { kind: 'social' },
    pending: { requestId: 'unknown-social' }, retryableRejectedSocialDraft: true };
  h.context.controller.current = { ...h.store, mutate: async () => ({ ok: false, reason: 'unresolved' }) };
  await h.mutate(); assert.equal(h.context.message, 'checking-result');
  const tree = h.render();
  assert.equal(nodes(tree).filter(node => node.props['aria-label'] === '거절된 저장과 입력 보호').length, 0);
  assert.equal(evaluate(initializer('modalRecovery'), h.context).props['aria-label'], '저장 결과 복구');
});

test('SRUI03 invalidated social retry and external changes keep input protection and latest comparison', () => {
  const h = harness(); h.context.snapshot = { ...snapshot(), status: 'recovery-required', draft: { kind: 'social' }, retryableRejectedSocialDraft: false };
  assert(nodes(h.render()).some(node => node.props['aria-label'] === '다른 기기 변경과 입력 보호'));
  h.context.snapshot.retryableRejectedSocialDraft = true; h.context.external = true;
  const tree = h.render();
  assert(nodes(tree).some(node => node.props['aria-label'] === '다른 기기 변경과 입력 보호'));
  assert(!nodes(tree).some(node => node.props['aria-label'] === '거절된 저장과 입력 보호'));
  assert.equal(h.calls.includes('mutation'), false); assert.equal(h.calls.includes('discard'), false);
});

function communityDraftNoticeHarness() {
  const h = harness(); h.context.seen.community = true;
  Object.assign(h.context, { communityView: 'community', communitySelection: undefined, communityState: {}, setCommunityState: () => {}, mediaPort: {} });
  const draft = { ...newProgramParticipationDraft(), title: '합성 제목', body: '거절된 입력' };
  const authority = { ...snapshot(), status: 'recovery-required', retryableRejectedSocialDraft: true,
    draft: { kind: 'social', intent: { type: 'participation-save', draft: structuredClone(draft), expected: null } } };
  h.context.controller.current = { ...h.store, snapshot: () => authority };
  const notice = () => {
    const fn = nodes(h.render()).find(node => node.type === 'program-community')!.props.resolveDraftSaveError;
    assert.equal(typeof fn, 'function'); return fn;
  };
  return { ...h, draft, authority, notice };
}

test('SRUI04 child notice reads live exact rejected draft authority rather than the cached UI snapshot', () => {
  const h = communityDraftNoticeHarness();
  assert.equal(h.context.snapshot.retryableRejectedSocialDraft, undefined);
  assert.equal(h.notice()(h.draft, null, 'recovery-required'), '초안을 저장하지 못했습니다. 입력은 남아 있습니다.');
  h.authority.retryableRejectedSocialDraft = false;
  assert.equal(h.notice()(h.draft, null, 'recovery-required'), undefined);
  assert(!h.calls.includes('mutation')); assert(!h.calls.includes('discard'));
});

test('SRUI05 unknown, busy, external, storage and disposed states do not claim definite draft rejection', () => {
  for (const gate of ['pending', 'busy', 'external', 'storage', 'disposed', 'proof', 'owner'] as const) {
    const h = communityDraftNoticeHarness();
    if (gate === 'pending') Object.assign(h.authority, { pending: { requestId: 'unknown-result' } });
    if (gate === 'busy') h.authority.busy = true;
    if (gate === 'external') h.context.externalRef.current = true;
    if (gate === 'storage') h.context.storageError = true;
    if (gate === 'disposed') h.context.disposed.current = true;
    if (gate === 'proof') h.authority.retryableRejectedSocialDraft = false;
    if (gate === 'owner') h.authority.ownerId = 'other-owner';
    assert.equal(h.notice()(h.draft, null, 'recovery-required'), undefined, gate);
    assert(!h.calls.includes('mutation')); assert(!h.calls.includes('discard'));
  }
});

test('SRUI06 rejection notice cannot cross draft bytes, baseline, command kind or failure reason', () => {
  const h = communityDraftNoticeHarness(), fn = h.notice();
  for (const patch of [{ id: 'other' }, { body: 'later input' }, { flowId: 'other-flow' }, { versionId: 'other-version' },
    { itemId: 'other-item' }, { postId: 'other-post' }, { parentReplyId: 'other-reply' }, { editTargetId: 'other-edit' },
    { expectedUpdatedAt: 'later' }, { expectedContent: 'other-token' }, { requestId: 'other-content-request' }]) {
    assert.equal(fn({ ...h.draft, ...patch }, null, 'recovery-required'), undefined);
  }
  assert.equal(fn(h.draft, { ...h.draft }, 'recovery-required'), undefined);
  const circular = { ...h.draft } as any; circular.loop = circular;
  assert.doesNotThrow(() => assert.equal(fn(circular, null, 'recovery-required'), undefined));
  for (const reason of ['limit', 'conflict', 'checking-result', 'session-expired', 'presentation-pending']) assert.equal(fn(h.draft, null, reason), undefined);
  Object.assign(h.authority.draft.intent, { type: 'participation-submit' }); assert.equal(fn(h.draft, null, 'recovery-required'), undefined);
  Object.assign(h.authority.draft, { kind: 'creator' }); assert.equal(fn(h.draft, null, 'recovery-required'), undefined);
  Object.assign(h.authority, { draft: null }); assert.equal(fn(h.draft, null, 'recovery-required'), undefined);
  assert(!h.calls.includes('mutation')); assert(!h.calls.includes('discard'));
});


test('normal shell keeps save state and undo visible while account and routine actions start collapsed', () => {
  const h = harness(), tree = h.render();
  const management = nodes(tree).find(node => node.type === 'details' && node.props['aria-label'] === '계정 및 자료 관리')!;
  assert(management); assert.equal(management.props.open, undefined);
  const managed = new Set(nodes(management));
  assert.equal(text(nodes(management).find(node => node.type === 'summary')), '계정 · 자료 관리');
  for (const label of ['로그아웃 · 계정 바꾸기', '서버에서 다시 확인', '다시 실행', '자료 가져오기 · 백업']) {
    assert(nodes(tree).some(node => node.type === 'button' && text(node) === label && managed.has(node)), label);
  }
  assert(text(management).includes(h.context.email));
  assert(text(management).includes('마지막 확인 판본'));
  const undo = nodes(tree).find(node => node.type === 'button' && text(node) === '되돌리기')!;
  const status = nodes(tree).find(node => node.props.role === 'status' && text(node) === '서버와 연결됨')!;
  assert(undo && !managed.has(undo)); assert(status && !managed.has(status));
  const header = nodes(tree).find(node => node.type === 'header')!;
  assert(!text(header).includes(h.context.email)); assert(text(header).includes('개발계'));
  const notice = nodes(tree).find(node => node.type === 'details' && node.props['aria-label'] === '개발계 안내')!;
  const warning = text(nodes(notice).find(node => node.type === 'summary'));
  assert(warning.includes('공개한 내용은 로그인 사용자에게 보입니다'));
  assert(warning.includes('중요한 자료의 유일본은 넣지 마세요'));
  assert(text(notice).includes('개발용 통합 검증판'));
});

function assertOutsideRoutineDisclosure(tree: Element, predicate: (node: Element) => boolean) {
  const found = nodes(tree).filter(predicate); assert(found.length > 0, 'expected recovery/status must render');
  const hiddenByRoutine = new Set(nodes(tree).filter(node => node.type === 'details' &&
    ['계정 및 자료 관리', '개발계 안내'].includes(node.props['aria-label'])).flatMap(nodes));
  for (const node of found) assert(!hiddenByRoutine.has(node), 'recovery/status cannot be hidden by routine disclosure');
}

test('save failure, unknown result, conflict, expiry and logout recovery stay outside routine disclosure', () => {
  for (const state of ['saving', 'saved', 'recovery-required', 'checking-result', 'conflict', 'session-expired']) {
    const h = harness(); h.context.snapshot.status = state;
    h.context.labels = evaluate(initializer('labels'), {});
    if (state === 'checking-result') h.context.snapshot.pending = { requestId: 'same-request' };
    if (state === 'conflict') h.context.snapshot.draft = { schema: ALPHA_COMMAND_SCHEMA, requestId: 'draft', expectedRevision: 0, kind: 'change-private', changes: [] };
    const tree = h.render();
    assertOutsideRoutineDisclosure(tree, node => node.props.role === 'status' && text(node) === h.context.labels[state]);
    if (state === 'checking-result') assertOutsideRoutineDisclosure(tree, node => node.props['aria-label'] === '저장 결과 복구');
    if (state === 'conflict') assertOutsideRoutineDisclosure(tree, node => node.props['aria-label'] === '다른 기기 변경과 입력 보호');
    if (state === 'session-expired') assertOutsideRoutineDisclosure(tree, node => node.type === 'p' && text(node).includes('계정을 다시 확인한 뒤'));
  }
  for (const [patch, predicate] of [
    [{ storageError: true }, (node: Element) => node.props.role === 'alert' && text(node).includes('입력 보관 상태')],
    [{ external: true }, (node: Element) => node.props['aria-label'] === '다른 기기 변경과 입력 보호'],
    [{ leave: true }, (node: Element) => node.props['aria-label'] === '로그아웃 전 입력 확인'],
    [{ message: '저장하지 못했습니다. 입력은 남아 있습니다.' }, (node: Element) => node.props.role === 'status' && text(node).includes('저장하지 못했습니다')],
  ] as const) {
    const h = harness(); Object.assign(h.context, patch); assertOutsideRoutineDisclosure(h.render(), predicate);
  }
});

test('parked private, creator and social drafts remain separately discoverable outside account disclosure', () => {
  const h = harness();
  h.context.recoveries = { drafts: [{ title: '개인 입력', raw: '보관 원문' }] };
  h.context.creatorRecoveries = { entries: [{ working: { title: '제작 입력', rawText: '제작 원문' } }] };
  h.context.socialRecoveries = { entries: [{ kind: 'participation', value: { title: '참여 입력' } }] };
  h.context.external = true;
  const tree = h.render();
  for (const label of ['보관한 입력', '보관한 제작 입력', '보관한 공개·참여 입력']) {
    assertOutsideRoutineDisclosure(tree, node => node.type === 'summary' && text(node).startsWith(label));
  }
  for (const node of nodes(tree).filter(node => node.type === 'details' && node.props.className === 'recovery')) assert.equal(node.props.open, true);
});
