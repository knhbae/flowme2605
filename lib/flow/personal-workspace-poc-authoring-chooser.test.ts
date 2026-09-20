import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import path from 'node:path';
import { buildSync } from 'esbuild';
import {
  AUTHORING_CHOOSER_VERSION, AUTHORING_CHOOSER_GROUPS, createAuthoringChooser,
  getAuthoringChooserGroup, getAuthoringChooserPropertyGroup,
  reduceAuthoringChooser, selectAuthoringChooser,
  type AuthoringChooserAction, type AuthoringChooserState,
} from './personal-workspace-poc-authoring-chooser';
import {
  PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG as CATALOG,
  PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_KEYS as KEYS,
  planPersonalWorkspacePocAuthoringPropertyEdit, planPersonalWorkspacePocAuthoringPropertyBatchEdit,
} from './personal-workspace-poc-authoring-properties';
import { fingerprintPersonalWorkspacePocAuthoringSource } from './personal-workspace-poc-authoring';

type State = AuthoringChooserState<object, unknown>;
type Command = Omit<AuthoringChooserAction<object, unknown>, 'session' | 'owner'>;
const owner = () => ({ documentId: 'draft-A', editorId: 'textarea-A', dispatchCount: 3,
  rawText: '# 비공개 원문\r\n- [ ] 같은 제목\r\n', draftSerialized: ' exact saved bytes ' });
const create = (entry: 'structure' | 'groups' = 'groups'): State => createAuthoringChooser({ owner: owner(), entry });
// Keep command-specific fields typed in callers while automatically binding the
// UI event to its opening session and the opaque coordinator owner.
function dispatch(state: State, command: Command & Record<string, unknown>) {
  return reduceAuthoringChooser(state, { ...command, session: state.session, owner: state.owner } as AuthoringChooserAction<object, unknown>);
}
function openValue(key: (typeof KEYS)[number] = 'place', draft?: unknown, initial = create()): State {
  const grouped = dispatch(initial, { type: 'choose-group', group: getAuthoringChooserPropertyGroup(key)!.key }).state;
  return dispatch(grouped, { type: 'choose-property', key, ...(arguments.length > 1 ? { initialDraft: draft } : {}) }).state;
}

test('versioned UI mapping has exactly the original four groups in order', () => {
  assert.equal(AUTHORING_CHOOSER_VERSION, 1);
  assert.deepEqual(AUTHORING_CHOOSER_GROUPS, [
    { key: 'schedule', label: '일정', propertyKeys: ['date', 'relativeDate', 'time', 'timezone', 'place', 'duration'] },
    { key: 'execution', label: '실행', propertyKeys: ['completion', 'condition', 'subcheck'] },
    { key: 'content', label: '내용', propertyKeys: ['detail', 'resource'] },
    { key: 'provenance', label: '더 보기', propertyKeys: ['repeat', 'repeatEnd', 'guide', 'caution', 'source'] },
  ]);
  assert.ok(Object.isFrozen(AUTHORING_CHOOSER_GROUPS));
  for (const entry of AUTHORING_CHOOSER_GROUPS) assert.ok(Object.isFrozen(entry) && Object.isFrozen(entry.propertyKeys));
});

test('UI mapping has all 16 catalog keys exactly once, without changing catalog groups', () => {
  const keys = AUTHORING_CHOOSER_GROUPS.flatMap(entry => entry.propertyKeys);
  assert.equal(keys.length, 16); assert.equal(new Set(keys).size, 16);
  assert.deepEqual([...keys].sort(), [...KEYS].sort());
  assert.equal(CATALOG.find(entry => entry.key === 'repeat')!.group, 'schedule');
  assert.equal(CATALOG.find(entry => entry.key === 'guide')!.group, 'content');
  assert.equal(getAuthoringChooserPropertyGroup('repeat')!.key, 'provenance');
  assert.equal(getAuthoringChooserPropertyGroup('guide')!.key, 'provenance');
});

test('unknown keys and prototype names have no group or property fallback', () => {
  for (const key of ['', 'missing', 'constructor', '__proto__', 'location', 'Schedule']) {
    assert.equal(getAuthoringChooserGroup(key), null);
    assert.equal(getAuthoringChooserPropertyGroup(key), null);
  }
});

test('groups entry exposes four groups and zero properties; structure exposes neither', () => {
  const groups = selectAuthoringChooser(create());
  assert.equal(groups.groups.length, 4); assert.deepEqual(groups.propertyKeys, []);
  const structure = selectAuthoringChooser(create('structure'));
  assert.deepEqual(structure.groups, []); assert.deepEqual(structure.propertyKeys, []);
});

test('choosing a group exposes only its own properties and never all 16', () => {
  for (const entry of AUTHORING_CHOOSER_GROUPS) {
    const selected = dispatch(create(), { type: 'choose-group', group: entry.key }).state;
    const view = selectAuthoringChooser(selected);
    assert.equal(view.stage, 'properties'); assert.equal(view.group, entry.key);
    assert.deepEqual(view.propertyKeys, entry.propertyKeys); assert.deepEqual(view.groups, []);
  }
});

test('all 16 keys enter value with their exact key; dependency routing stays in the adapter', () => {
  for (const key of KEYS) {
    const state = openValue(key);
    assert.equal(state.stage, 'value'); assert.equal(state.property, key);
    assert.equal(state.group, getAuthoringChooserPropertyGroup(key)!.key);
    assert.deepEqual(selectAuthoringChooser(state).propertyKeys, []);
  }
  assert.equal(openValue('timezone').property, 'timezone');
  assert.equal(openValue('repeatEnd').property, 'repeatEnd');
});

test('one-step back is value -> properties -> groups -> structure -> opener', () => {
  const initial = create('structure'); const identity = initial.owner;
  let state = dispatch(initial, { type: 'show-groups' }).state;
  state = openValue('place', { value: '서울역' }, state);
  const expected = [
    ['properties', 'property', 'place'], ['groups', 'group', 'schedule'],
    ['structure', 'structure', undefined], ['closed', 'opener', undefined],
  ];
  for (const [stage, focus, focusKey] of expected) {
    const result = dispatch(state, { type: 'back' }); state = result.state;
    assert.equal(state.stage, stage); assert.equal(result.focus, focus); assert.equal(result.focusKey, focusKey);
    assert.equal(state.owner, identity); assert.equal(state.session, initial.session);
  }
  assert.deepEqual(state.drafts, {});
});

test('review entry back closes at groups rather than inventing a structure menu', () => {
  let state = openValue(); state = dispatch(state, { type: 'back' }).state;
  state = dispatch(state, { type: 'back' }).state;
  const done = dispatch(state, { type: 'back' });
  assert.equal(done.state.stage, 'closed'); assert.equal(done.focus, 'opener');
});

test('back and group switching preserve exact draft values and stale/failure metadata', () => {
  const draft = { value: ' 서울\r\n역 🙂\t ', feedback: { kind: 'failed', message: '보관 오류' }, stale: true };
  const original = openValue('place', draft);
  let state = dispatch(original, { type: 'back' }).state;
  state = dispatch(state, { type: 'back' }).state;
  state = openValue('resource', { value: 'https://example.com/resource' }, state);
  state = dispatch(state, { type: 'back' }).state;
  state = dispatch(state, { type: 'back' }).state;
  state = openValue('place', { value: 'new default', stale: false }, state);
  assert.equal(state.drafts.place, draft); assert.equal(state.owner, original.owner);
  assert.equal((state.drafts.place as typeof draft).stale, true);
  assert.deepEqual(state.drafts.resource, { value: 'https://example.com/resource' });
});

test('empty, null and explicitly undefined drafts are not replaced by re-entry defaults', () => {
  for (const value of ['', null, undefined]) {
    let state = openValue('place', value); state = dispatch(state, { type: 'back' }).state;
    state = dispatch(state, { type: 'choose-property', key: 'place', initialDraft: 'replacement' }).state;
    assert.ok(Object.prototype.hasOwnProperty.call(state.drafts, 'place'));
    assert.equal(state.drafts.place, value);
  }
});

test('remember-value shallow-copies immutable UI state without freezing opaque values or owner', () => {
  const initial = openValue('place'); const draft = { value: '변경 전', owner: initial.owner };
  const result = dispatch(initial, { type: 'remember-value', key: 'place', draft });
  assert.notEqual(result.state, initial); assert.notEqual(result.state.drafts, initial.drafts);
  assert.equal(result.state.owner, initial.owner); assert.equal(result.state.drafts.place, draft);
  assert.ok(Object.isFrozen(result.state)); assert.ok(Object.isFrozen(result.state.drafts));
  assert.ok(Object.isFrozen(result.state.session)); assert.equal(Object.isFrozen(draft), false);
  assert.equal(Object.isFrozen(initial.owner), false); assert.deepEqual(initial.drafts, {});
  const same = dispatch(result.state, { type: 'remember-value', key: 'place', draft });
  assert.equal(same.state, result.state); assert.equal(same.changed, false); assert.equal(same.reason, 'same');
});

test('opaque owner getters are never read and rendering excludes owner and draft payloads', () => {
  const opaque = new Proxy({}, { get() { throw new Error('owner-is-opaque'); } });
  const state = createAuthoringChooser({ owner: opaque, entry: 'groups' });
  const next = reduceAuthoringChooser(state, { owner: opaque, session: state.session, type: 'choose-group', group: 'schedule' });
  assert.equal(next.state.owner, opaque);
  assert.deepEqual(Object.keys(selectAuthoringChooser(next.state)), ['stage', 'group', 'property', 'groups', 'propertyKeys']);
  assert.doesNotThrow(() => JSON.stringify(selectAuthoringChooser(next.state)));
});

test('navigationLocked rejects back, close, group change and draft edits with the exact state', () => {
  const state = openValue('place', { value: 'keep', status: 'recovery-required' });
  const commands = [{ type: 'back' }, { type: 'close', reason: 'tab' }, { type: 'choose-group', group: 'content' },
    { type: 'remember-value', key: 'place', draft: { value: 'replace' } }];
  for (const command of commands) {
    const result = reduceAuthoringChooser(state, { ...command, session: state.session, owner: state.owner } as AuthoringChooserAction<object, unknown>, { navigationLocked: true });
    assert.equal(result.changed, false); assert.equal(result.reason, 'navigation-locked');
    assert.equal(result.state, state); assert.equal(result.focus, 'none');
  }
});

test('same bytes/title in a different opaque owner cannot dispatch against the current owner', () => {
  const state = create();
  const result = reduceAuthoringChooser(state, { session: state.session, owner: { ...state.owner }, type: 'choose-group', group: 'schedule' });
  assert.equal(result.reason, 'stale-owner'); assert.equal(result.state, state);
});

test('old UI events cannot act after close/reopen even when the coordinator reuses its owner object', () => {
  const prior = create(); const action = { session: prior.session, owner: prior.owner, type: 'show-groups' as const };
  const closed = dispatch(prior, { type: 'close', reason: 'cancel' }).state;
  assert.equal(reduceAuthoringChooser(closed, action).reason, 'closed');
  const reopened = createAuthoringChooser({ owner: prior.owner, entry: 'structure' });
  assert.notEqual(prior.session, reopened.session);
  assert.equal(reduceAuthoringChooser(reopened, action).reason, 'stale-session');
  assert.deepEqual(reopened.drafts, {});
});

test('copying or serializing the UI session does not recreate its event authority', () => {
  const state = create();
  for (const session of [{ ...state.session }, JSON.parse(JSON.stringify(state.session))]) {
    const result = reduceAuthoringChooser(state, { session, owner: state.owner, type: 'choose-group', group: 'schedule' });
    assert.equal(result.reason, 'stale-session'); assert.equal(result.changed, false);
  }
});

test('Tab, outside click and external dismissal close without requesting opener focus', () => {
  for (const reason of ['tab', 'outside', 'external'] as const) {
    const state = openValue('place', { value: 'draft' }); const result = dispatch(state, { type: 'close', reason });
    assert.equal(result.state.stage, 'closed'); assert.equal(result.focus, 'none');
    assert.deepEqual(result.state.drafts, {}); assert.equal(selectAuthoringChooser(result.state).groups.length, 0);
  }
});

test('explicit cancel closes and requests opener focus without keeping temporary drafts', () => {
  const result = dispatch(openValue('place', { status: 'failed', value: 'keep until cancel' }), { type: 'close', reason: 'cancel' });
  assert.equal(result.focus, 'opener'); assert.equal(result.state.stage, 'closed'); assert.deepEqual(result.state.drafts, {});
});

test('invalid transition or command cannot skip levels, cross groups, or replace another draft', () => {
  const state = create();
  const wrong = [
    { type: 'choose-property', key: 'place' }, { type: 'remember-value', key: 'place', draft: 'x' },
    { type: 'choose-group', group: '__proto__' }, { type: 'retarget-owner', owner: state.owner },
    { type: 'close', reason: 'unknown' },
  ];
  // Deliberately exercise malformed runtime input beyond the typed action union.
  for (const command of wrong) assert.equal(dispatch(state, command as Command & Record<string, unknown>).state, state);
  const properties = dispatch(state, { type: 'choose-group', group: 'schedule' }).state;
  assert.equal(dispatch(properties, { type: 'choose-property', key: 'repeat' }).reason, 'invalid-transition');
  assert.equal(dispatch(openValue('place'), { type: 'remember-value', key: 'resource', draft: 'x' }).reason, 'invalid-transition');
});

test('reopening a different document starts without values or failure state from the old document', () => {
  const old = openValue('place', { value: 'private pending value', status: 'failed' });
  const current = createAuthoringChooser({ owner: { ...owner(), documentId: 'draft-B' }, entry: 'groups' });
  assert.deepEqual(current.drafts, {}); assert.notEqual(old.owner, current.owner);
  assert.equal(reduceAuthoringChooser(current, { session: old.session, owner: old.owner, type: 'back' }).changed, false);
});

test('creation requires an explicit object owner and supported entry', () => {
  assert.throws(() => createAuthoringChooser({ owner: null as unknown as object, entry: 'groups' }), TypeError);
  assert.throws(() => createAuthoringChooser({ owner: {}, entry: 'value' as 'groups' }), TypeError);
});

test('chooser round trips leave catalog metadata and existing planner output exactly unchanged', () => {
  const metadata = JSON.stringify(CATALOG);
  const rawText = '# 여행\r\n- [ ] 예약 🙂\r\n  - 날짜: 2026-09-05\r\n  - 장소: 서울역  \r\n';
  const common = { intent: 'apply' as const, rawText, expectedSourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(rawText), itemSourceLine: 2 };
  const plan = () => [planPersonalWorkspacePocAuthoringPropertyEdit({ ...common, key: 'place', value: '부산역' }),
    planPersonalWorkspacePocAuthoringPropertyBatchEdit({ ...common, updates: [{ key: 'time', value: '10:00' }, { key: 'timezone', value: 'Asia/Seoul' }] })];
  const expected = JSON.stringify(plan());
  for (const key of KEYS) { const state = openValue(key, { rawText }); dispatch(state, { type: 'back' }); dispatch(state, { type: 'close', reason: 'cancel' }); }
  assert.equal(JSON.stringify(CATALOG), metadata); assert.equal(JSON.stringify(plan()), expected);
  assert.ok(plan().every(result => result.status === 'applied'));
});

test('bundled chooser reads no storage, DOM, clock, network or timers', () => {
  const bundle = buildSync({ entryPoints: [path.join(process.cwd(), 'lib/flow/personal-workspace-poc-authoring-chooser.ts')], bundle: true, write: false, platform: 'browser', format: 'iife', globalName: 'Chooser' }).outputFiles[0].text;
  let accesses = 0; const context = vm.createContext({});
  for (const key of ['localStorage', 'sessionStorage', 'document', 'window', 'Date', 'fetch', 'XMLHttpRequest', 'setTimeout', 'requestAnimationFrame']) {
    Object.defineProperty(context, key, { get() { accesses += 1; throw new Error('forbidden global ' + key); } });
  }
  vm.runInContext(bundle, context);
  vm.runInContext(`const owner = {}; const state = Chooser.createAuthoringChooser({ owner, entry: 'groups' });
    const next = Chooser.reduceAuthoringChooser(state, { owner, session: state.session, type: 'choose-group', group: 'schedule' });
    Chooser.selectAuthoringChooser(next.state);`, context);
  assert.equal(accesses, 0);
});
