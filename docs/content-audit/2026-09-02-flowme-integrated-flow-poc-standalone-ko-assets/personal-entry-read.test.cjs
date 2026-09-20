'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { M, C, NOW, clone, legacyFixture, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const PD = require('./personal-plan-display.js');
const P = require('./personal-plan-context.js');
const file = path.join(__dirname, 'personal-entry-read.js');
const R = fs.existsSync(file) ? require(file) : {};
const sourceFiles = ['personal-entry-read.js', 'personal-entry-read.test.cjs', 'model.js', 'workspace-checkpoint.js',
  'personal-plan-context.js', 'personal-plan-display.js'];
const sourceHashes = () => sourceFiles.map(name => ({ name, sha256: fs.existsSync(path.join(__dirname, name))
  ? crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, name))).digest('hex') : null }));
const sourceBefore = sourceHashes();
test.after(() => {
  const sourceAfter = sourceHashes(); assert.deepEqual(sourceAfter, sourceBefore, 'reader and actual dependency sources remain exact during this run');
  console.log('ENTRY_CATALOG_SOURCE_BOUNDARY ' + JSON.stringify({ before: sourceBefore, after: sourceAfter, exact: true,
    scope: 'pure catalog capture only; no application, storage or current-authority claim' }));
});
const bytes = value => JSON.stringify(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
function api(reader = R) {
  assert.equal(typeof reader.createPersonalEntryReadPacket, 'function', 'new catalog factory must exist');
  assert.equal(typeof reader.readPersonalEntryCatalog, 'function', 'new genuine packet reader must exist');
  return reader;
}
function fromState(state, undo = null) {
  const result = C.fromLegacy(' \r\n' + bytes({ version: 1, state, undo }) + '\r\n ');
  assert.equal(result.ok, true, result.reason);
  return { checkpoint: result.checkpoint, sourceRead: { ok: true, raw: null }, sourceEpoch: 0 };
}
function seed() { return fromState(M.seedState()); }
function read(input, reader = R) {
  api(reader); const before = bytes(input), captured = reader.createPersonalEntryReadPacket(input);
  assert.equal(bytes(input), before, 'read must preserve every supplied byte/value');
  if (!captured.ok) {
    assert.equal(captured.scope, 'entry-catalog-read'); assert.equal(own(captured, 'packet'), false);
    return captured;
  }
  assert.deepEqual(Object.keys(captured.packet).sort(), ['contract', 'version']);
  const result = reader.readPersonalEntryCatalog(captured.packet);
  assert.equal(result.ok, true, result.reason); return { ...result, packet: captured.packet };
}
function rename(input, flowRef, change) {
  const opened = C.inspectSourceBoundPersonalPlanContext(input.checkpoint,
    { flowRef, sourceRead: input.sourceRead, sourceEpoch: input.sourceEpoch });
  assert.equal(opened.ok, true, opened.reason);
  const draft = clone(opened.draft); change(draft);
  const result = C.transitionCheckpoint(input.checkpoint, { type: 'commit-source-bound-personal-plan-context',
    context: opened.context, draft, sourceRead: input.sourceRead, sourceEpoch: input.sourceEpoch, now: NOW });
  assert.equal(result.ok, true, result.reason); assert.equal(result.changed, true);
  return { ...input, checkpoint: result.checkpoint };
}
function sourced() {
  const f = sourceUpdateFixture();
  return { ...f, input: { ...fromState(f.state), sourceRead: { ok: true, raw: bytes(f.store) }, sourceEpoch: 12 } };
}
function unsupportedSource(f) {
  const prepared = M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(NOW), f.state, f.flow.id,
    { now: NOW, createdAt: NOW, incomingRawText: f.flow.rawText + '\n- [ ] 추가 원문 Item' });
  assert.equal(prepared.ok, true, prepared.reason); let store = prepared.store;
  for (const change of prepared.candidate.changes) {
    const resolved = M.resolveLocalSourceCandidateChange(store, { candidateId: prepared.candidate.candidateId,
      changeId: change.changeId, resolution: 'use-incoming', now: NOW });
    assert.equal(resolved.changed, true, resolved.code); store = resolved.store;
  }
  const applied = M.applyLocalSourceCandidate(store, f.state, f.flow.id, prepared.candidate.candidateId, NOW);
  assert.equal(applied.changed, true, applied.code);
  const raw = bytes(applied.store);
  assert.equal(M.loadSourceCandidateStore({ getItem: () => raw }).status, 'restored');
  return { ok: true, raw };
}
function sandbox(overrides = {}, access = () => {}) {
  api(); const context = vm.createContext({ FlowMeIntegratedPoc: M, FlowPocWorkspaceCheckpoint: C,
    FlowPocPersonalPlanDisplay: PD, ...overrides });
  for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest']) {
    Object.defineProperty(context, key, { get() { access(key); throw new Error('ambient access'); } });
  }
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  return { reader: context.FlowPocPersonalEntryRead, context };
}

test('ER01 four active saved origins expose all eight exact members, never QuickItems', () => {
  api(); const input = seed(), result = read(input); assert.equal(result.ok, true, result.reason);
  assert.equal(R.VERSION, 1); assert.equal(R.CONTRACT, 'flowme-standalone-personal-entry-v1');
  assert.equal(result.catalog.copies.length, 4); assert.equal(result.catalog.excluded.length, 0);
  assert.deepEqual(result.catalog.copies.map(copy => copy.origin), [...R.ELIGIBLE_ORIGINS]);
  assert.equal(result.catalog.copies.flatMap(copy => copy.itemRefs).length, 8);
  for (const copy of result.catalog.copies) {
    const flow = input.checkpoint.state.flows.find(flow => flow.id === copy.localFlowId);
    assert.equal(copy.flowRef, flow.ref); assert.equal(copy.savedCopyId, flow.savedCopyId);
    assert.equal(copy.flowId, flow.sourceFlowId); assert.equal(copy.title, flow.title);
    assert.equal(copy.folderId, flow.folderId);
    assert.deepEqual(copy.itemRefs, copy.items.map(item => item.itemRef));
    assert.deepEqual(copy.items.map(item => item.localTaskId), flow.steps.flatMap(step => step.itemIds));
    for (const item of copy.items) {
      assert.equal(item.flowRef, copy.flowRef); assert.equal(item.savedCopyId, copy.savedCopyId);
      assert.equal(item.flowId, copy.flowId);
      assert.equal(item.itemRef, 'flow-item:' + [copy.savedCopyId, copy.flowId, item.itemId].map(encodeURIComponent).join(':'));
    }
  }
});
test('ER02 map grouping is unavailable and titles never become invented discovery/source facts', () => {
  api(); const result = read(seed()), map = result.catalog.copies.find(copy => copy.origin === 'source-backed-map');
  assert.deepEqual(map.grouping, { status: 'unavailable', reason: 'grouping-metadata-unavailable' });
  const forbidden = ['sourceName', 'sourceTitle', 'sourceUrl', 'url', 'mapId', 'mapGroup', 'criteria', 'description',
    'rawText', 'memo', 'context', 'sourceContext', 'capabilities', 'legacyBaseRaw', 'personalPlanContextV1'];
  function check(value) { if (value && typeof value === 'object') for (const [key, nested] of Object.entries(value)) {
    assert.equal(forbidden.includes(key), false, key); check(nested);
  } }
  check(result.catalog);
});
test('ER03 genuine source-bound personal Flow/Item titles are current while source and membership remain exact', () => {
  api(); const initial = seed(), flow = initial.checkpoint.state.flows[0], before = bytes(initial);
  const input = rename(initial, flow.ref, draft => {
    draft.title = { mode: 'override', value: '  내 제목  ' };
    draft.items[Object.keys(draft.items)[0]].title = { mode: 'override', value: '내 항목 제목' };
  });
  assert.equal(bytes(initial), before); const displayed = PD.projectPersonalPlanDisplay(input);
  assert.equal(displayed.mode, 'personal-source-display');
  const result = read(input), copy = result.catalog.copies.find(copy => copy.flowRef === flow.ref);
  assert.equal(copy.title, displayed.state.flows[0].title); assert.equal(copy.items[0].title, '내 항목 제목');
  assert.equal(input.checkpoint.state.flows[0].title, flow.title);
  assert.equal(copy.itemRefs.length, flow.steps.flatMap(step => step.itemIds).length);
});
test('ER04 large membership is lossless at 102 items and safe unknown legacy fields stay untouched, not leaked', () => {
  api(); const state = M.seedState(), flow = state.flows[0], template = state.tasks.find(task => task.id === 'quote');
  for (let n = 0; n < 100; n += 1) {
    const task = { ...clone(template), id: 'large-' + n, ref: 'flow-item:copy-map-moving:flow-moving:large-' + n, title: '동명', sourceTitle: '원문' };
    state.tasks.push(task); flow.steps[0].itemIds.push(task.id);
  }
  state.privateUnknown = { text: '  숨김\r\n값  ', array: [null, false, 0] };
  flow.unknown = { sourceName: '추정 금지' };
  const input = fromState(state), before = bytes(input), result = read(input);
  assert.equal(result.catalog.copies[0].items.length, 102); assert.equal(new Set(result.catalog.copies[0].itemRefs).size, 102);
  assert.equal(bytes(input), before); assert.equal(bytes(result.catalog).includes('추정 금지'), false);
});
test('ER05 actual authoring handoff stays known-but-not-eligible and never changes four-origin eligibility', () => {
  api(); const initial = seed(), handoff = M.makeHandoff('# 작성 문서\n## 준비\n- [ ] 작성 항목',
    { draftId: 'entry-draft', handoffId: 'entry-handoff', sourceConfirmed: true, folderId: null });
  const next = C.transitionCheckpoint(initial.checkpoint, { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(next.ok, true, next.reason); assert.equal(next.changed, true);
  const input = { ...initial, checkpoint: next.checkpoint }, result = read(input);
  const flow = next.checkpoint.state.flows.find(flow => flow.handoffId === handoff.handoffId);
  assert.equal(result.catalog.copies.length, 4);
  assert.deepEqual(result.catalog.excluded, [{ localFlowId: flow.id, flowRef: flow.ref, origin: 'authoring-handoff', reason: 'known-not-eligible' }]);
});
test('ER06 trashed copies are absent, restored copies return, and archived identity is still validated', () => {
  api(); const initial = seed();
  const next = C.transitionCheckpoint(initial.checkpoint, { type: 'move-to-trash', kind: 'flow', id: 'moving', now: NOW });
  assert.equal(next.ok, true, next.reason); assert.equal(next.changed, true);
  assert.equal(read({ ...initial, checkpoint: next.checkpoint }).catalog.copies.length, 3);
  const undone = C.undoCheckpoint(next.checkpoint); assert.equal(undone.ok, true);
  assert.equal(read({ ...initial, checkpoint: undone.checkpoint }).catalog.copies.length, 4);
  const bad = clone(next.checkpoint); bad.state.flows[0].ref += '-wrong';
  assert.equal(R.createPersonalEntryReadPacket({ ...initial, checkpoint: bad }).ok, false);
});
test('ER07 equal titles and source Flow ids across different saved copies never collapse; encoded identity is exact', () => {
  api(); const state = M.seedState(), original = state.flows[0], copy = clone(original);
  copy.id = 'second-copy'; copy.savedCopyId = '같은: 사본'; copy.sourceFlowId = original.sourceFlowId;
  copy.ref = 'saved-flow:' + [copy.savedCopyId, copy.sourceFlowId].map(encodeURIComponent).join(':');
  copy.steps.forEach(step => { step.itemIds = step.itemIds.map(id => 'second-' + id); });
  for (const old of state.tasks.filter(task => task.flowId === original.id)) {
    const task = clone(old), itemId = '동명: ' + old.id;
    task.id = 'second-' + old.id; task.flowId = copy.id;
    task.ref = 'flow-item:' + [copy.savedCopyId, copy.sourceFlowId, itemId].map(encodeURIComponent).join(':');
    state.tasks.push(task);
  }
  state.flows.push(copy); const result = read(fromState(state));
  assert.equal(result.catalog.copies.length, 5);
  assert.equal(result.catalog.copies.filter(flow => flow.title === original.title).length, 2);
  const second = result.catalog.copies.find(flow => flow.localFlowId === copy.id);
  assert.equal(second.savedCopyId, copy.savedCopyId); assert.equal(second.items[0].itemId, '동명: quote');
  assert.equal(new Set(result.catalog.copies.flatMap(flow => flow.itemRefs)).size, 10);
});
test('ER08 unknown origins, malformed full Flow refs and duplicate or foreign Item identity fail closed', () => {
  api(); const mutations = [
    state => { state.flows[0].origin = 'future-origin'; },
    state => { state.flows[0].ref = 'saved-flow:wrong:flow-moving'; },
    state => { state.flows[0].savedCopyId = ''; },
    state => { state.tasks.find(task => task.id === 'quote').ref = state.tasks.find(task => task.id === 'contract').ref; },
    state => { state.flows[0].steps[0].itemIds.push('washer-filter'); },
  ];
  for (const mutate of mutations) {
    const input = seed(); mutate(input.checkpoint.state);
    assert.equal(R.createPersonalEntryReadPacket(input).ok, false);
  }
  const state = M.seedState();
  state.flows.push({ ...clone(state.flows[0]), id: 'empty-duplicate', steps: [] });
  const converted = C.fromLegacy(bytes({ version: 1, state, undo: null }));
  assert.equal(converted.ok, true, 'actual legacy/C accepts this duplicate full ref despite distinct local ids');
  assert.equal(R.createPersonalEntryReadPacket({ ...seed(), checkpoint: converted.checkpoint }).ok, false);
});
test('ER09 checkpoint/version/provenance and current or Undo P corruption cannot yield a packet', () => {
  api(); const base = seed(), flow = base.checkpoint.state.flows[0];
  const withP = rename(base, flow.ref, draft => { draft.title = { mode: 'override', value: '개인 값' }; });
  const cleared = rename(withP, flow.ref, draft => { draft.title = { mode: 'inherit' }; });
  assert.equal(own(cleared.checkpoint.state, 'personalPlanContextV1'), false);
  assert.equal(own(cleared.checkpoint.undo, 'personalPlanContextV1'), true);
  const values = [
    { ...base, checkpoint: { ...base.checkpoint, version: 3 } },
    { ...base, checkpoint: { ...base.checkpoint, legacyBaseRaw: '{}' } },
    { ...withP, checkpoint: { ...withP.checkpoint, state: { ...withP.checkpoint.state, personalPlanContextV1: { version: 99 } } } },
    { ...cleared, checkpoint: { ...cleared.checkpoint, undo: { ...cleared.checkpoint.undo, personalPlanContextV1: { version: 99 } } } },
  ];
  for (const value of values) assert.equal(R.createPersonalEntryReadPacket(value).ok, false);
});
test('ER10 failed/corrupt/unknown-version source reads never masquerade as normal legacy catalog absence', () => {
  api(); const base = seed(); assert.equal(read(base).catalog.sourceStatus, 'empty');
  const values = [{ ok: false, reason: 'read-error' }, { ok: false, reason: 'unavailable' },
    { ok: true, raw: '{broken' }, { ok: true, raw: '{"version":999}' }];
  for (const sourceRead of values) {
    const input = { ...base, sourceRead }, display = PD.projectPersonalPlanDisplay(input);
    assert.equal(display.ok, true); assert.equal(display.mode, 'personal-execution-only');
    assert.equal(R.createPersonalEntryReadPacket(input).ok, false);
  }
});
test('ER11 reachable Undo P with unsupported actual source blocks even when current PD offers legacy display', () => {
  api(); const f = sourced();
  const withP = rename(f.input, f.flow.ref, draft => { draft.title = { mode: 'override', value: '내 보존 제목' }; });
  const cleared = rename(withP, f.flow.ref, draft => { draft.title = { mode: 'inherit' }; });
  assert.equal(own(cleared.checkpoint.state, 'personalPlanContextV1'), false);
  assert.equal(own(cleared.checkpoint.undo, 'personalPlanContextV1'), true);
  const input = { ...cleared, sourceRead: unsupportedSource(f) };
  assert.equal(PD.projectPersonalPlanDisplay(input).mode, 'legacy-display');
  const gate = PD.inspectPersonalPlanDisplayCandidate({ ...input, candidateCheckpoint: input.checkpoint, candidateSourceRead: input.sourceRead });
  assert.equal(gate.ok, false); assert.equal(gate.snapshot, 'undo');
  assert.equal(R.createPersonalEntryReadPacket(input).ok, false);
});
test('ER12 current P source mismatch and actual failed read never fall back to raw titles', () => {
  api(); const f = sourced(), input = rename(f.input, f.flow.ref, draft => { draft.title = { mode: 'override', value: '개인 값' }; });
  for (const sourceRead of [unsupportedSource(f), { ok: false, reason: 'read-error' }, { ok: true, raw: '{' }]) {
    assert.equal(R.createPersonalEntryReadPacket({ ...input, sourceRead }).ok, false);
  }
});
test('ER13 input/source packet unknown fields, epochs and pending shapes cannot assert read authority', () => {
  api(); const base = seed();
  const bad = [null, {}, { ...base, canRead: true }, { ...base, sourceRead: { ok: true, raw: null, pending: true } },
    { ...base, sourceRead: { ok: true } }, { ...base, sourceRead: { ok: false, reason: 'empty' } },
    { ...base, sourceRead: { status: 'restored', store: {} } },
    ...[-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '0'].map(sourceEpoch => ({ ...base, sourceEpoch }))];
  for (const value of bad) assert.equal(R.createPersonalEntryReadPacket(value).ok, false);
});
test('ER14 accessor/symbol/hidden/prototype/cycle/revoked-proxy input rejects with zero getter calls or outward throws', () => {
  api(); let reads = 0; const bad = [];
  const getter = seed(); Object.defineProperty(getter.checkpoint.state, 'hidden', { enumerable: true, get() { reads += 1; return 1; } }); bad.push(getter);
  const hidden = seed(); Object.defineProperty(hidden, 'hidden', { value: 1 }); bad.push(hidden);
  const symbolic = seed(); symbolic[Symbol('trust')] = true; bad.push(symbolic);
  const proto = seed(); Object.setPrototypeOf(proto.checkpoint.state, { inherited: true }); bad.push(proto);
  const cycle = seed(); cycle.checkpoint.state.loop = cycle; bad.push(cycle);
  const toJson = seed(); toJson.checkpoint.state.toJSON = () => { reads += 1; return {}; }; bad.push(toJson);
  const array = seed(); Object.setPrototypeOf(array.checkpoint.state.flows, Object.create(Array.prototype)); bad.push(array);
  const revoked = Proxy.revocable({}, {}); revoked.revoke(); bad.push(revoked.proxy);
  for (const value of bad) { let result; assert.doesNotThrow(() => { result = R.createPersonalEntryReadPacket(value); }); assert.equal(result.ok, false); }
  assert.equal(reads, 0);
});
test('ER15 capture-time packet detaches/freezes exact values, does not claim later S authority or source freshness', () => {
  api(); const input = seed(), captured = R.createPersonalEntryReadPacket(input); assert.equal(captured.ok, true);
  const first = R.readPersonalEntryCatalog(captured.packet), old = bytes(first.catalog);
  assert.equal(Object.isFrozen(captured.packet), true);
  assert.throws(() => { first.catalog.copies[0].title = '위조'; }, TypeError);
  assert.throws(() => { first.catalog.copies[0].items.push({}); }, TypeError);
  input.checkpoint.state.flows[0].title = '나중 입력'; input.sourceEpoch += 1;
  const second = R.readPersonalEntryCatalog(captured.packet);
  assert.equal(bytes(second.catalog), old); assert.notEqual(second.catalog, first.catalog);
  assert.equal(own(second, 'authority'), false); assert.equal(own(second, 'canWrite'), false);
  // App must separately check actual S.sameAuthority + observed source epoch; this packet cannot do I/O.
});
test('ER16 copied, forged, cross-factory and prototype-wrapped packets have no catalog or edit authority', () => {
  api(); const captured = R.createPersonalEntryReadPacket(seed()); assert.equal(captured.ok, true);
  const other = sandbox().reader;
  for (const packet of [null, {}, clone(captured.packet), Object.create(captured.packet), { contract: R.CONTRACT, version: 1 }]) {
    const result = R.readPersonalEntryCatalog(packet); assert.equal(result.ok, false); assert.equal(own(result, 'catalog'), false);
  }
  assert.equal(other.readPersonalEntryCatalog(captured.packet).ok, false);
  assert.equal(P.validateCapturedPersonalPlanSourceDraft({ context: captured.packet, draft: {} }).ok, false);
});
test('ER17 missing/wrong dependencies or throwing PD cannot promote a catalog, including no-P legacy input', () => {
  api(); const variants = [
    { FlowPocPersonalPlanDisplay: undefined }, { FlowPocPersonalPlanDisplay: { ...PD, VERSION: 99 } },
    { FlowPocWorkspaceCheckpoint: undefined }, { FlowMeIntegratedPoc: undefined },
    { FlowPocPersonalPlanDisplay: { ...PD, projectPersonalPlanDisplay() { throw new Error('broken display'); } } },
  ];
  for (const overrides of variants) assert.equal(sandbox(overrides).reader.createPersonalEntryReadPacket(seed()).ok, false);
});
test('ER18 ordinary cross-realm JSON succeeds without ambient I/O, clock, random, editor or planner calls', () => {
  api(); let touches = 0, editors = 0;
  const { reader, context } = sandbox({ FlowPocWorkspaceCheckpoint: { ...C,
    inspectPersonalPlanContext() { editors += 1; throw new Error('editor forbidden'); },
    inspectSourceBoundPersonalPlanContext() { editors += 1; throw new Error('editor forbidden'); },
    transitionCheckpoint() { editors += 1; throw new Error('planner forbidden'); },
  } }, () => { touches += 1; });
  vm.runInContext('Date.now = () => { throw new Error("clock forbidden"); }; Math.random = () => { throw new Error("random forbidden"); };', context);
  context.inputJson = bytes(seed()); const input = vm.runInContext('JSON.parse(inputJson)', context);
  const result = read(input, reader); assert.equal(result.ok, true); assert.equal(result.catalog.copies.length, 4);
  assert.equal(touches, 0); assert.equal(editors, 0);
});
test('ER19 source composition is genuine and capture has no URL/query resolver, renderer or source write exports', () => {
  api(); const f = sourced(), result = read(f.input); assert.equal(result.ok, true, result.reason);
  assert.equal(result.catalog.displayMode, 'legacy-display'); assert.equal(result.catalog.sourceStatus, 'restored');
  assert.equal(result.catalog.copies.length, 4); assert.equal(result.catalog.excluded.length, 1);
  assert.deepEqual(Object.keys(R).sort(), ['CONTRACT', 'ELIGIBLE_ORIGINS', 'VERSION', 'createPersonalEntryReadPacket', 'readPersonalEntryCatalog'].sort());
});
test('ER20 missing legacy source titles remain unavailable metadata instead of reconstructed original facts', () => {
  api(); const f = legacyFixture(), input = { checkpoint: f.checkpoint, sourceRead: { ok: true, raw: null }, sourceEpoch: 0 };
  const result = read(input); assert.equal(result.ok, true, result.reason);
  assert.equal(result.catalog.copies[0].title, f.checkpoint.state.flows[0].title);
  assert.equal(own(result.catalog.copies[0], 'sourceTitle'), false);
  assert.equal(own(result.catalog.copies[0].items[0], 'sourceTitle'), false);
});
test('ER21 actual legacy truthy non-string or blank titles cannot be promoted as typed catalog text', () => {
  api();
  for (const [kind, title] of [['flow', 123], ['item', 456], ['flow', '   '], ['item', '\r\n']]) {
    const state = M.seedState();
    if (kind === 'flow') state.flows[0].title = title;
    else state.tasks.find(task => task.id === 'quote').title = title;
    assert.deepEqual(M.validate(state), [], 'legacy validation is truthiness, not new DTO text typing');
    const input = fromState(state);
    assert.equal(R.createPersonalEntryReadPacket(input).ok, false);
  }
});
test('ER22 model error arrays or invalid validator shapes never count as a successful catalog validation', () => {
  api(); const input = seed();
  for (const validation of [['injected-validator-error'], false, true, undefined]) {
    const reader = sandbox({ FlowMeIntegratedPoc: { ...M, validate: () => validation } }).reader;
    assert.equal(reader.createPersonalEntryReadPacket(input).ok, false);
  }
});
