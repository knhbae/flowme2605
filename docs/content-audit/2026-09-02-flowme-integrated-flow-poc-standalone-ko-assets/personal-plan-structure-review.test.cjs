'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('./model.js');
const T = require('./timeline-context.js');
const C = require('./workspace-checkpoint.js');
const PD = require('./personal-plan-display.js');
function baselineApi() {
  const sandbox = { FlowMeIntegratedPoc: M, FlowPocTimelineContext: T };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../../output/k3b/before-section-order-plan/personal-plan-context.js'), 'utf8'), sandbox);
  return sandbox.FlowPocPersonalPlanContext;
}
const P = process.env.FLOWME_B2_P_BASELINE === '1' ? baselineApi() : require('./personal-plan-context.js');
const NOW = '2026-09-05T12:00:00.000Z', META = 'personalPlanContextV1';
const RAW = '# 원본 Plan\r\n## A\r\n- [ ] A1\r\n  - 날짜: 2026-09-05\r\n- [ ] A2\r\n## Z\r\n- [ ] Z1';
const clone = value => JSON.parse(JSON.stringify(value)), bytes = value => JSON.stringify(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
function fixture(raw = RAW) {
  const handoff = M.makeHandoff(raw, { handoffId: 'b2-review-handoff', draftId: 'b2-review-draft', sourceConfirmed: true, folderId: null });
  const made = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(made.changed, true, made.error);
  const converted = C.fromLegacy(' \r\n' + bytes({ version: 1, state: made.state, undo: null }) + '\r\n');
  assert.equal(converted.ok, true, converted.reason);
  const flow = made.state.flows.find(entry => entry.handoffId === handoff.handoffId);
  assert.ok(flow);
  assert.equal(typeof P.inspectPersonalPlanStructureEditor, 'function', 'B2 review feature unavailable');
  return { cp: converted.checkpoint, flow, raw, sourceRead: { ok: true, raw: null }, sourceEpoch: 7 };
}
function read(f, extra = {}, api = P) {
  return api.readPersonalPlanSourceContext({ rawState: f.cp.state, undo: f.cp.undo,
    legacyBaseRaw: f.cp.legacyBaseRaw, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, ...extra });
}
function open(f, api = P) {
  const source = read(f, {}, api); assert.equal(source.ok, true, source.reason);
  const opened = api.inspectPersonalPlanStructureEditor({ sourceContext: source.context, flowRef: f.flow.ref });
  assert.equal(opened.ok, true, opened.reason); return { ...opened, sourceContext: source.context };
}
function save(f, opened, mutate, api = P) {
  const draft = clone(opened.draft); mutate(draft);
  const before = bytes(f.cp), result = api.planPersonalPlanStructureState({ context: opened.context,
    rawState: f.cp.state, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, draft, now: NOW });
  assert.equal(result.ok, true, result.reason); assert.equal(bytes(f.cp), before);
  if (!result.changed) return { ...f, result };
  assert.deepEqual(clone(result.undo), f.cp.state);
  assert.deepEqual(clone(result.state.flows), f.cp.state.flows);
  assert.deepEqual(clone(result.state.tasks), f.cp.state.tasks);
  assert.deepEqual(clone(result.state.timelineContextV1), f.cp.state.timelineContextV1);
  return { ...f, cp: { ...f.cp, state: clone(result.state), undo: clone(result.undo) }, result };
}
function core(f, kind, mutate) {
  const source = read(f); assert.equal(source.ok, true, source.reason);
  const opened = kind === 'raw' ? P.inspectPlanContext({ state: f.cp.state, flowRef: f.flow.ref, legacyBaseRaw: f.cp.legacyBaseRaw, undo: f.cp.undo })
    : P.inspectPersonalPlanSourceEditor({ sourceContext: source.context, flowRef: f.flow.ref });
  assert.equal(opened.ok, true, opened.reason);
  const draft = clone(opened.draft); mutate(draft);
  const result = kind === 'raw' ? P.planPersonalPlanState({ state: f.cp.state, context: opened.context, draft, now: NOW })
    : P.planPersonalPlanSourceState({ rawState: f.cp.state, context: opened.context, draft, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, now: NOW });
  assert.equal(result.ok, true, result.reason);
  return result.changed ? { ...f, cp: { ...f.cp, state: result.state, undo: result.undo } } : f;
}
function structure(f) { return f.cp.state[META].entries[f.flow.ref].structure; }
function updatedSource(f, incoming) {
  const prepared = M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(NOW), f.cp.state, f.flow.id,
    { incomingRawText: incoming, now: NOW, createdAt: NOW });
  assert.equal(prepared.ok, true, prepared.reason);
  let store = prepared.store;
  for (const change of prepared.candidate.changes) {
    const resolved = M.resolveLocalSourceCandidateChange(store, { candidateId: prepared.candidate.candidateId,
      changeId: change.changeId, resolution: 'use-incoming', now: NOW });
    assert.equal(resolved.changed, true, resolved.code); store = resolved.store;
  }
  const applied = M.applyLocalSourceCandidate(store, f.cp.state, f.flow.id, prepared.candidate.candidateId, NOW);
  assert.equal(applied.changed, true, applied.code);
  return { ...f, store: applied.store, sourceRead: { ok: true, raw: bytes(applied.store) }, sourceEpoch: f.sourceEpoch + 1 };
}

test('B2R01 explicit gapped ids and mixed implicit/explicit CRLF preserve original section proof', () => {
  for (const [raw, expected] of [
    ['# Plan\r\n## Empty\r\n## Real\r\n- [ ] A', ['step-2']],
    ['# Plan\r\n- [ ] Implicit\r\n## Real\r\n- [ ] A', ['step-2']],
    ['# Plan\r\n## Same\r\n- [ ] A\r\n## Same\r\n- [ ] B', ['step-1', 'step-2']],
  ]) {
    const f = fixture(raw), opened = open(f);
    assert.deepEqual(Object.keys(opened.draft.sectionTitles), expected);
    const changed = save(f, opened, draft => { draft.sectionTitles[expected[0]] = { mode: 'override', value: '개인 구간' }; });
    assert.equal(changed.result.changed, true);
    assert.deepEqual(structure(changed).capture.editableSections.map(value => value.sectionId), expected);
    assert.equal(changed.cp.state.flows.find(flow => flow.ref === f.flow.ref).rawText, raw);
  }
});

test('B2R02 forged sourceLine id or membership never manufactures a section owner; full order is separate', () => {
  for (const variant of ['line', 'id', 'membership']) {
    const f = fixture(), cp = clone(f.cp), flow = cp.state.flows.find(entry => entry.ref === f.flow.ref);
    if (variant === 'line') cp.state.tasks.find(task => task.id === flow.steps[0].itemIds[0]).sourceLine += 1;
    if (variant === 'id') flow.steps[0].id = 'forged-stable-id';
    if (variant === 'membership') {
      const a = flow.steps[0].itemIds[1]; flow.steps[0].itemIds[1] = flow.steps[1].itemIds[0]; flow.steps[1].itemIds[0] = a;
    }
    const changed = { ...f, cp, flow }; assert.deepEqual(M.validate(cp.state), []);
    const opened = open(changed); assert.deepEqual(opened.draft.sectionTitles, {});
    assert.equal(save(changed, opened, draft => draft.orderedItemRefs.reverse()).result.changed, true);
  }
});

test('B2R03 verified source B then explicit personal A survives source Undo and unrelated core save until explicit inherit', () => {
  const original = fixture(), f = updatedSource(original, RAW.replace('## A', '## B'));
  const opened = open(f);
  assert.equal(opened.structure.sections[0].sourceTitle, 'B');
  const personal = save(f, opened, draft => { draft.sectionTitles['step-1'] = { mode: 'override', value: 'A' }; });
  assert.equal(structure(personal).sectionTitles['step-1'], 'A');
  const undone = M.undoLocalSourceCandidate(f.store, NOW); assert.equal(undone.changed, true, undone.code);
  const reverted = { ...personal, sourceRead: { ok: true, raw: bytes(undone.store) }, sourceEpoch: f.sourceEpoch + 1 };
  assert.equal(open(reverted).structure.sections[0].title, 'A');
  const beforeStructure = clone(structure(reverted));
  const memo = core(reverted, 'source', draft => { draft.items[Object.keys(draft.items)[0]].memo = { mode: 'override', value: '내 메모\r\n' }; });
  assert.deepEqual(structure(memo), beforeStructure);
  const clean = save(memo, open(memo), () => {}); assert.equal(clean.result.changed, false);
  const inherited = save(memo, open(memo), draft => { draft.sectionTitles['step-1'] = { mode: 'inherit' }; });
  assert.equal(own(inherited.cp.state[META].entries[f.flow.ref], 'structure'), false);
  assert.equal(inherited.cp.state[META].entries[f.flow.ref].overlay.items[Object.keys(open(memo).draft.items)[0]].memo, '내 메모\r\n');
});

test('B2R04 source value rename is supported but source item reorder and cross-Step membership remain blocked', () => {
  const f = fixture();
  assert.equal(read(updatedSource(f, RAW.replace('## A', '## B'))).ok, true);
  for (const incoming of [RAW.replace('A1', 'TEMP').replace('A2', 'A1').replace('TEMP', 'A2'),
    '# 원본 Plan\n## A\n- [ ] A1\n  - 날짜: 2026-09-05\n## Z\n- [ ] A2\n- [ ] Z1']) {
    const next = updatedSource(f, incoming), before = bytes(next.cp), result = read(next);
    assert.equal(result.ok, false); assert.equal(result.reason, 'source-membership-not-supported');
    assert.equal(bytes(next.cp), before);
  }
});

test('B2R05 old v1 whitespace/newline core titles and CRLF memo survive structure-only save and actual checkpoint Undo', () => {
  for (const title of ['  기존 제목  ', '첫 줄\n둘째 줄']) {
    const f = core(fixture(), 'source', draft => {
      draft.title = { mode: 'override', value: title };
      const item = draft.items[Object.keys(draft.items)[0]];
      item.title = { mode: 'override', value: title }; item.memo = { mode: 'override', value: ' \r\n메모\t ' };
    });
    assert.equal(f.cp.state[META].version, 1);
    const originalOverlay = clone(f.cp.state[META].entries[f.flow.ref].overlay);
    const next = save(f, open(f), draft => draft.orderedItemRefs.reverse());
    assert.deepEqual(next.cp.state[META].entries[f.flow.ref].overlay, originalOverlay);
    const result = C.undoCheckpoint(next.cp); assert.equal(result.ok, true, result.reason);
    assert.deepEqual({ ...result.checkpoint.state, updatedAt: f.cp.state.updatedAt }, f.cp.state);
    assert.equal(result.checkpoint.undo, null);
    const restored = { ...f, cp: clone(result.checkpoint) }; assert.equal(read(restored).ok, true);
    assert.equal(open(restored).draft.title.value, title);
    assert.equal(PD.projectPersonalPlanDisplay({ checkpoint: restored.cp, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch }).ok, true);
  }
});

test('B2R06 structure-only entry survives both old B1 writers adding and removing the last core override', () => {
  for (const kind of ['raw', 'source']) {
    const initial = fixture();
    const f = save(initial, open(initial), draft => {
      draft.sectionTitles['step-1'] = { mode: 'override', value: '내 구간' }; draft.orderedItemRefs.reverse();
    });
    const before = clone(structure(f));
    const changed = core(f, kind, draft => { draft.title = { mode: 'override', value: '개인 제목' }; });
    assert.deepEqual(structure(changed), before);
    const removed = core(changed, kind, draft => { draft.title = { mode: 'inherit' }; });
    assert.deepEqual(structure(removed), before);
    assert.deepEqual(removed.cp.state[META].entries[f.flow.ref].overlay.items, {});
    assert.equal(own(removed.cp.state[META].entries[f.flow.ref].overlay, 'title'), false);
    assert.equal(read(removed).ok, true); assert.equal(C.validateCheckpoint(removed.cp).ok, true);
  }
});

test('B2R07 current and supplied Undo metadata are independently strict including reserved archive collisions', () => {
  const original = fixture(), f = save(original, open(original), draft => draft.orderedItemRefs.reverse());
  const validUndo = clone(f.cp.state);
  assert.equal(read({ ...original, cp: { ...original.cp, undo: validUndo } }).ok, true);
  for (const target of ['current', 'undo']) {
    const cp = clone(f.cp); cp.undo = clone(f.cp.state);
    const snapshot = target === 'current' ? cp.state : cp.undo;
    snapshot[META].entries[f.flow.ref].structure.capture.originalItemRefs.reverse();
    assert.equal(read({ ...f, cp }).ok, false);
    assert.equal(P.inspectPlanContext({ state: cp.state, flowRef: f.flow.ref, undo: cp.undo, legacyBaseRaw: cp.legacyBaseRaw }).ok, false);
  }
  const cp = clone(f.cp); cp.undo = clone(f.cp.state);
  cp.undo.timelineContextV1.legacySnapshot[META] = clone(cp.state[META]);
  assert.equal(read({ ...f, cp }).ok, false);
});

test('B2R08 new section text is trim-exact nonblank but internal newline and harmless token text are not forbidden', () => {
  const f = fixture(), opened = open(f);
  for (const value of ['첫 줄\n둘째 줄', '__proto__', 'constructor']) {
    const next = save(f, opened, draft => { draft.sectionTitles['step-1'] = { mode: 'override', value }; });
    assert.equal(structure(next).sectionTitles['step-1'], value);
  }
  for (const value of ['', ' ', ' 앞', '뒤 ', '\n제목']) {
    const draft = clone(opened.draft); draft.sectionTitles['step-1'] = { mode: 'override', value };
    assert.equal(P.validateCapturedPersonalPlanStructureDraft({ context: opened.context, draft }).ok, false);
  }
});

test('B2R09 structure API core-only updates keep v1 and structure reset retains v2 only while core entries remain', () => {
  const original = fixture(), opened = open(original);
  const f = save(original, opened, draft => { draft.title = { mode: 'override', value: '개인 제목' }; });
  assert.equal(f.cp.state[META].version, 1);
  const g = save(f, open(f), draft => draft.orderedItemRefs.reverse());
  const reset = save(g, open(g), draft => { draft.orderedItemRefs = opened.draft.orderedItemRefs; });
  assert.equal(reset.cp.state[META].version, 2);
  const empty = core(reset, 'source', draft => { draft.title = { mode: 'inherit' }; });
  assert.equal(own(empty.cp.state, META), false);
  const undo = C.undoCheckpoint(empty.cp); assert.equal(undo.ok, true, undo.reason);
  assert.equal(undo.checkpoint.state[META].version, 2);
});

test('B2R10 malformed metadata root entry capture and empty structure cannot pass through dual decoding', () => {
  const initial = fixture(), f = save(initial, open(initial), draft => draft.orderedItemRefs.reverse());
  const mutations = [
    meta => { meta.version = 1; meta.contract = P.CONTRACT; },
    meta => { meta.contract += '-unknown'; }, meta => { meta.extra = true; },
    meta => { meta.entries[f.flow.ref].extra = true; },
    meta => { meta.entries[f.flow.ref].structure.extra = true; },
    meta => { meta.entries[f.flow.ref].structure.capture.editableSections[0].sourceLine += 1; },
    meta => { meta.entries[f.flow.ref].structure.capture.rawSteps[0].title = 'tamper'; },
    meta => { delete meta.entries[f.flow.ref].structure.orderedItemRefs; },
    meta => { meta.entries[f.flow.ref].structure.orderedItemRefs = clone(meta.entries[f.flow.ref].structure.capture.originalItemRefs); },
    meta => { meta.entries = {}; },
  ];
  for (const mutate of mutations) {
    const cp = clone(f.cp); mutate(cp.state[META]);
    const before = bytes(cp); assert.equal(P.projectPersonalPlanState(cp.state).ok, false);
    assert.equal(read({ ...f, cp }).ok, false); assert.equal(bytes(cp), before);
  }
});

test('B2R11 getters and descriptor arrays are refused before evaluation in draft and metadata', () => {
  const f = fixture(), opened = open(f); let calls = 0;
  const get = () => { calls += 1; return opened.draft.orderedItemRefs; };
  for (const field of ['title', 'items', 'sectionTitles', 'orderedItemRefs']) {
    const draft = clone(opened.draft); Object.defineProperty(draft, field, { enumerable: true, get });
    assert.equal(P.validateCapturedPersonalPlanStructureDraft({ context: opened.context, draft }).ok, false);
  }
  for (const variant of ['getter', 'hidden', 'hole']) {
    const draft = clone(opened.draft);
    if (variant === 'getter') Object.defineProperty(draft.orderedItemRefs, '0', { enumerable: true, get });
    if (variant === 'hidden') Object.defineProperty(draft.orderedItemRefs, '0', { enumerable: false, value: draft.orderedItemRefs[0] });
    if (variant === 'hole') delete draft.orderedItemRefs[0];
    assert.equal(P.validateCapturedPersonalPlanStructureDraft({ context: opened.context, draft }).ok, false);
  }
  const g = save(f, opened, draft => draft.orderedItemRefs.reverse()), cp = clone(g.cp);
  Object.defineProperty(cp.state[META].entries[f.flow.ref].structure, 'capture', { enumerable: true, get });
  assert.equal(P.projectPersonalPlanState(cp.state).ok, false);
  assert.equal(calls, 0);
});

test('B2R12 public inputs reject unknown fields cloned and wrong-family contexts with no candidate', () => {
  const f = fixture(), opened = open(f), source = read(f);
  const v1 = P.inspectPersonalPlanSourceEditor({ sourceContext: source.context, flowRef: f.flow.ref });
  for (const context of [null, {}, clone(opened.context), source.context, v1.context]) {
    assert.equal(P.validateCapturedPersonalPlanStructureDraft({ context, draft: opened.draft }).ok, false);
  }
  for (const extra of [{ trusted: true }, { canEdit: true }, { now: NOW }]) {
    assert.equal(P.validateCapturedPersonalPlanStructureDraft({ context: opened.context, draft: opened.draft, ...extra }).ok, false);
  }
  assert.equal(P.inspectPersonalPlanStructureEditor({ sourceContext: source.context, flowRef: f.flow.ref, editable: true }).ok, false);
  assert.equal(P.readPersonalPlanStructureView({ sourceContext: opened.context, flowRef: f.flow.ref }).ok, false);
});

test('B2R13 no-op does not allocate metadata and actual changes still require valid time and revision capacity', () => {
  const f = fixture(), opened = open(f), draft = clone(opened.draft);
  const input = { context: opened.context, rawState: f.cp.state, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, draft, now: 'bad' };
  const noop = P.planPersonalPlanStructureState(input); assert.equal(noop.ok, true); assert.equal(noop.changed, false);
  draft.orderedItemRefs.reverse(); assert.equal(P.planPersonalPlanStructureState(input).ok, false);
  const cp = clone(f.cp); cp.state.revision = Number.MAX_SAFE_INTEGER;
  const full = { ...f, cp }, fresh = open(full), changed = clone(fresh.draft); changed.orderedItemRefs.reverse();
  assert.equal(P.planPersonalPlanStructureState({ ...input, context: fresh.context, rawState: cp.state, draft: changed, now: NOW }).ok, false);
  assert.equal(own(f.cp.state, META), false);
});

test('B2R14 actual UMD and standard cross-realm data use genuine tokens without ambient storage or DOM', () => {
  const f = fixture(); let accessed = 0;
  const sandbox = { FlowMeIntegratedPoc: M, FlowPocTimelineContext: T };
  for (const key of ['window', 'document', 'localStorage']) Object.defineProperty(sandbox, key, { get() { accessed += 1; throw new Error(key); } });
  vm.runInNewContext(fs.readFileSync(require.resolve('./personal-plan-context.js'), 'utf8'), sandbox);
  const api = sandbox.FlowPocPersonalPlanContext, opened = open(f, api);
  const context = vm.createContext({ text: bytes(opened.draft) });
  const draft = vm.runInContext('JSON.parse(text)', context); draft.orderedItemRefs.reverse();
  assert.equal(api.validateCapturedPersonalPlanStructureDraft({ context: opened.context, draft }).ok, true);
  assert.equal(api.planPersonalPlanStructureState({ context: opened.context, rawState: f.cp.state,
    sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, draft, now: NOW }).changed, true);
  assert.equal(accessed, 0);
});

test('B2R15 display is detached and actual Undo restores structure after explicit core-plus-structure reset', () => {
  const initial = fixture(), f = save(initial, open(initial), draft => {
    draft.title = { mode: 'override', value: '개인 제목' }; draft.orderedItemRefs.reverse();
  });
  const opened = open(f), display = P.readPersonalPlanStructureView({ sourceContext: opened.sourceContext, flowRef: f.flow.ref });
  assert.equal(Object.isFrozen(display.orderedItemRefs), true); assert.equal(Object.isFrozen(display.sections), true);
  const reset = save(f, opened, draft => { draft.title = { mode: 'inherit' }; draft.orderedItemRefs = open(initial).draft.orderedItemRefs; });
  assert.equal(own(reset.cp.state, META), false);
  const undone = C.undoCheckpoint(reset.cp); assert.equal(undone.ok, true, undone.reason);
  assert.deepEqual({ ...undone.checkpoint.state, updatedAt: f.cp.state.updatedAt }, f.cp.state);
  const restored = { ...f, cp: clone(undone.checkpoint) };
  assert.deepEqual(open(restored).draft.orderedItemRefs, opened.draft.orderedItemRefs);
  assert.equal(PD.inspectPersonalPlanDisplayCandidate({ checkpoint: reset.cp, candidateCheckpoint: restored.cp,
    sourceRead: f.sourceRead, candidateSourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch }).ok, true);
});

test('B2R16 source reader remains strict for current P and actual reachable Undo P on failed source reads', () => {
  const initial = fixture(), f = save(initial, open(initial), draft => draft.orderedItemRefs.reverse());
  const undoOnly = { ...initial.cp, undo: clone(f.cp.state) };
  for (const sourceRead of [{ ok: false, reason: 'read-error' }, { ok: true, raw: '{' }]) {
    assert.equal(read({ ...f, sourceRead }).ok, false);
    assert.equal(PD.inspectPersonalPlanDisplayCandidate({ checkpoint: undoOnly, candidateCheckpoint: initial.cp,
      sourceRead, candidateSourceRead: initial.sourceRead, sourceEpoch: 7 }).ok, false);
  }
});

test('B2R17 only actual normalized nonempty handoff and draft id suffixes can prove authored section ownership', () => {
  const original = fixture(); assert.deepEqual(Object.keys(open(original).draft.sectionTitles), ['step-1', 'step-2']);
  const variants = [
    { sourceFlowId: 'authoring-' }, { sourceFlowId: 'authoring- bad' }, { sourceFlowId: 'authoring-UPPER' },
    { sourceFlowId: 'authoring-draft with space' }, { handoffId: ' ' + original.flow.handoffId + ' ' },
    { handoffId: original.flow.handoffId.toUpperCase() },
  ];
  for (const patch of variants) {
    const cp = clone(original.cp), flow = cp.state.flows.find(entry => entry.id === original.flow.id);
    Object.assign(flow, patch); flow.savedCopyId = 'poc-' + flow.handoffId;
    flow.ref = 'saved-flow:' + encodeURIComponent(flow.savedCopyId) + ':' + encodeURIComponent(flow.sourceFlowId);
    for (const task of cp.state.tasks.filter(entry => entry.flowId === flow.id)) {
      const itemId = decodeURIComponent(task.ref.slice(task.ref.lastIndexOf(':') + 1));
      task.ref = 'flow-item:' + encodeURIComponent(flow.savedCopyId) + ':' + encodeURIComponent(flow.sourceFlowId) + ':' + encodeURIComponent(itemId);
    }
    assert.deepEqual(M.validate(cp.state), []);
    const f = { ...original, cp, flow }, opened = open(f);
    assert.deepEqual(opened.draft.sectionTitles, {}, bytes(patch));
    assert.equal(save(f, opened, draft => draft.orderedItemRefs.reverse()).result.changed, true);
  }
});
