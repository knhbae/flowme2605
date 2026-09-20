'use strict';
// B2-a proposed contract RED only. Missing feature APIs must FAIL, never skip or
// pass by assert.throws. Fixtures use the real existing M/P/C implementation.
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./model.js');
const P = require('./personal-plan-context.js');
const C = require('./workspace-checkpoint.js');
const NOW = '2026-09-05T12:00:00.000Z';
const META = 'personalPlanContextV1';
const clone = value => JSON.parse(JSON.stringify(value));
const bytes = value => JSON.stringify(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const SOURCE = '# 원문 Plan\r\n## 같은 구간\r\n- [ ] A1\r\n  - 설명: 원문 설명\r\n- [ ] A2\r\n## 같은 구간\r\n- [ ] B1';
function api(module, name) {
  assert.equal(typeof module[name], 'function', 'B2 feature unavailable: ' + name);
  return module[name];
}
function commit(state, id, rawText = SOURCE) {
  const handoff = M.makeHandoff(rawText, { draftId: 'b2a-draft-' + id,
    handoffId: 'b2a-handoff-' + id, sourceConfirmed: true, folderId: null });
  const result = M.apply(state, { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(result.changed, true, result.error || result.message);
  assert.deepEqual(M.validate(result.state), []);
  const flow = result.state.flows.find(entry => entry.handoffId === handoff.handoffId);
  assert.ok(flow);
  assert.equal(flow.rawText, rawText);
  assert.equal(flow.sourceFingerprint, M.fingerprint(rawText));
  return { state: result.state, flow };
}
function checkpoint(state) {
  const raw = ' \r\n' + bytes({ version: 1, state, undo: null }) + '\r\n ';
  const converted = C.fromLegacy(raw);
  assert.equal(converted.ok, true, converted.reason);
  assert.equal(C.validateCheckpoint(converted.checkpoint).ok, true);
  return converted.checkpoint;
}
function fixture(rawText = SOURCE) {
  const first = commit(M.seedState(), 'a', rawText);
  const second = commit(first.state, 'b', rawText);
  second.state.legacyUnknown = { text: '  원래 값\r\n\t ', values: [0, false, null] };
  return { checkpoint: checkpoint(second.state), flow: first.flow, otherFlow: second.flow,
    sourceRead: { ok: true, raw: null }, sourceEpoch: 3 };
}
function source(f) {
  const before = bytes(f.checkpoint);
  const result = P.readPersonalPlanSourceContext({ rawState: f.checkpoint.state,
    legacyBaseRaw: f.checkpoint.legacyBaseRaw, undo: f.checkpoint.undo,
    sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch });
  assert.equal(result.ok, true, 'genuine existing source fixture: ' + result.reason);
  assert.equal(bytes(f.checkpoint), before);
  return result;
}
function refs(f, flow = f.flow) {
  return flow.steps.flatMap(step => step.itemIds).map(id => {
    const task = f.checkpoint.state.tasks.find(entry => entry.id === id && entry.flowId === flow.id);
    assert.ok(task); return task.ref;
  });
}
function open(f, flow = f.flow) {
  const verified = source(f);
  const result = api(P, 'inspectPersonalPlanStructureEditor')({ sourceContext: verified.context, flowRef: flow.ref });
  assert.equal(result.ok, true, result.reason);
  return { ...result, sourceContext: verified.context };
}
function validate(opened, draft) {
  return api(P, 'validateCapturedPersonalPlanStructureDraft')({ context: opened.context, draft });
}
function plan(f, opened, draft, patch = {}) {
  const before = bytes(f.checkpoint), beforeSource = bytes(f.sourceRead);
  const result = api(P, 'planPersonalPlanStructureState')({ context: opened.context,
    rawState: f.checkpoint.state, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, draft, now: NOW, ...patch });
  assert.equal(bytes(f.checkpoint), before);
  assert.equal(bytes(f.sourceRead), beforeSource);
  if (result.ok && result.changed) {
    assert.equal(result.state.revision, f.checkpoint.state.revision + 1);
    assert.deepEqual(result.undo, f.checkpoint.state);
    assert.deepEqual(result.state.flows, f.checkpoint.state.flows);
    assert.deepEqual(result.state.tasks, f.checkpoint.state.tasks);
    assert.deepEqual(result.state.orders, f.checkpoint.state.orders);
    assert.deepEqual(result.state.timelineContextV1, f.checkpoint.state.timelineContextV1);
    assert.deepEqual(result.state.legacyUnknown, f.checkpoint.state.legacyUnknown);
  }
  return result;
}
function advance(f, result) {
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.changed, true, result.reason);
  const next = { ...f, checkpoint: { ...f.checkpoint, state: result.state, undo: result.undo } };
  assert.equal(C.validateCheckpoint(next.checkpoint).ok, true);
  return next;
}
function view(f, flow = f.flow) {
  const verified = source(f);
  const result = api(P, 'readPersonalPlanStructureView')({ sourceContext: verified.context, flowRef: flow.ref });
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.viewOnly, true);
  assert.equal(result.flowRef, flow.ref);
  return result;
}
function coreMemo(f, flow, value) {
  const inspected = C.inspectSourceBoundPersonalPlanContext(f.checkpoint,
    { flowRef: flow.ref, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch });
  assert.equal(inspected.ok, true, inspected.reason);
  const draft = clone(inspected.draft);
  draft.items[refs(f, flow)[0]].memo = { mode: 'override', value };
  const result = C.transitionCheckpoint(f.checkpoint, { type: 'commit-source-bound-personal-plan-context',
    context: inspected.context, draft, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, now: NOW });
  assert.equal(result.changed, true, result.reason);
  return { ...f, checkpoint: result.checkpoint };
}

test('B2A01 real explicit same-title handoff produces version2 draft and exact editable stored section ids', () => {
  const f = fixture();
  assert.deepEqual(f.flow.steps.map(step => step.id), ['step-1', 'step-2']);
  assert.deepEqual(f.flow.steps.map(step => step.title), ['같은 구간', '같은 구간']);
  const before = bytes(f.checkpoint), opened = open(f);
  assert.equal(P.STRUCTURE_DRAFT_VERSION, 2);
  assert.equal(P.STRUCTURE_METADATA_VERSION, 2);
  assert.equal(opened.draft.version, 2);
  assert.deepEqual(Object.keys(opened.draft.sectionTitles), ['step-1', 'step-2']);
  assert.deepEqual(opened.draft.sectionTitles['step-1'], { mode: 'inherit' });
  assert.deepEqual(opened.draft.orderedItemRefs, refs(f));
  assert.deepEqual(opened.structure.sections.filter(section => section.editCapability === 'poc-shadow')
    .map(section => section.sectionId), ['step-1', 'step-2']);
  assert.equal(validate(opened, opened.draft).ok, true);
  assert.equal(bytes(f.checkpoint), before);
});

test('B2A02 implicit handoff Step is derived readonly while the full Item order remains editable', () => {
  const f = fixture('# 원문 Plan\n- [ ] 첫 항목\n- [ ] 둘째 항목');
  assert.deepEqual(f.flow.steps.map(step => step.title), ['할 일']);
  const opened = open(f), draft = clone(opened.draft);
  assert.deepEqual(draft.sectionTitles, {});
  assert.equal(opened.structure.sections.some(section => section.editCapability === 'poc-shadow'), false);
  draft.orderedItemRefs.reverse();
  assert.equal(validate(opened, draft).ok, true);
  assert.equal(plan(f, opened, draft).changed, true);
});

test('B2A03 four saved origins use full-ref order without inventing imported or seed section ownership', () => {
  const state = M.seedState(), f = { checkpoint: checkpoint(state), sourceRead: { ok: true, raw: null }, sourceEpoch: 0 };
  assert.deepEqual(new Set(state.flows.map(flow => flow.origin)), new Set([
    'source-backed-map', 'personal-draft', 'canonical-personal-copy', 'legacy-saved-plan']));
  source(f); api(P, 'inspectPersonalPlanStructureEditor');
  for (const flow of state.flows) {
    const opened = open(f, flow), draft = clone(opened.draft);
    assert.deepEqual(draft.sectionTitles, {});
    assert.equal(opened.structure.sections.some(section => section.editCapability === 'poc-shadow'), false);
    draft.orderedItemRefs.reverse();
    const next = advance(f, plan(f, opened, draft));
    assert.deepEqual(view(next, flow).orderedItemRefs, refs(f, flow).reverse());
  }
});

test('B2A04 same local section id in another saved copy never receives the selected alias', () => {
  const f = fixture(), opened = open(f), draft = clone(opened.draft);
  assert.notEqual(f.flow.ref, f.otherFlow.ref);
  assert.equal(f.flow.steps[0].id, f.otherFlow.steps[0].id);
  draft.sectionTitles['step-1'] = { mode: 'override', value: '내 첫 구간' };
  const next = advance(f, plan(f, opened, draft));
  assert.equal(view(next).sections.find(section => section.sectionId === 'step-1').title, '내 첫 구간');
  assert.equal(view(next).sections.find(section => section.sectionId === 'step-2').title, '같은 구간');
  assert.equal(view(next, f.otherFlow).sections.find(section => section.sectionId === 'step-1').title, '같은 구간');
  assert.deepEqual(Object.keys(next.checkpoint.state[META].entries), [f.flow.ref]);
});

test('B2A05 A1 B1 A2 order is global and preserves exact raw Step membership execution unknowns and full Undo', () => {
  const f = fixture(), opened = open(f), draft = clone(opened.draft), original = refs(f);
  draft.orderedItemRefs = [original[0], original[2], original[1]];
  const next = advance(f, plan(f, opened, draft)), projected = view(next);
  assert.deepEqual(projected.orderedItemRefs, draft.orderedItemRefs);
  const ownership = new Map(projected.sections.flatMap(section => section.itemRefs.map(ref => [ref, section.sectionId])));
  assert.deepEqual(projected.orderedItemRefs.map(ref => ownership.get(ref)), ['step-1', 'step-2', 'step-1']);
  assert.deepEqual(next.checkpoint.state[META].entries[f.flow.ref].structure.orderedItemRefs, draft.orderedItemRefs);
  assert.deepEqual(next.checkpoint.undo, f.checkpoint.state);
});

test('B2A06 positive structure draft works before missing duplicate foreign and readonly draft values are rejected', () => {
  const f = fixture(), opened = open(f), original = refs(f), good = clone(opened.draft);
  good.sectionTitles['step-2'] = { mode: 'override', value: '내 마지막 구간' };
  assert.equal(validate(opened, good).ok, true);
  for (const orderedItemRefs of [original.slice(1), [original[0], original[0], original[2]],
    [original[0], original[1], refs(f, f.otherFlow)[2]], []]) {
    const bad = { ...clone(good), orderedItemRefs };
    assert.equal(validate(opened, bad).ok, false);
    assert.equal(plan(f, opened, bad).ok, false);
  }
  for (const patch of [{ other: { mode: 'override', value: 'foreign' } }, { 'step-1': { mode: 'unknown' } }]) {
    assert.equal(validate(opened, { ...clone(good), sectionTitles: { ...good.sectionTitles, ...patch } }).ok, false);
  }
  const seeded = open(f, f.checkpoint.state.flows.find(flow => flow.id === 'memo'));
  assert.equal(validate(seeded, { ...clone(seeded.draft), sectionTitles: { outline: { mode: 'override', value: '권한 추정' } } }).ok, false);
});

test('B2A07 legacy v1 no-op never upgrades and explicit structure save preserves neighbor entry and v1 Undo exactly', () => {
  const original = fixture(), f = coreMemo(original, original.otherFlow, '이웃 개인 메모\r\n');
  assert.equal(f.checkpoint.state[META].version, 1);
  const before = bytes(f.checkpoint), neighbor = clone(f.checkpoint.state[META].entries[f.otherFlow.ref]);
  const opened = open(f), noop = plan(f, opened, clone(opened.draft));
  assert.equal(noop.ok, true); assert.equal(noop.changed, false); assert.equal(noop.state, f.checkpoint.state);
  assert.equal(bytes(f.checkpoint), before);
  const draft = clone(opened.draft); draft.orderedItemRefs.reverse();
  const next = advance(f, plan(f, opened, draft));
  assert.equal(next.checkpoint.state[META].version, 2);
  assert.equal(next.checkpoint.state[META].contract, 'flowme-standalone-personal-plan-context-v2');
  assert.deepEqual(next.checkpoint.state[META].entries[f.otherFlow.ref], neighbor);
  assert.equal(next.checkpoint.undo[META].version, 1);
  assert.deepEqual(next.checkpoint.undo, f.checkpoint.state);
  assert.equal(next.checkpoint.legacyBaseRaw, f.checkpoint.legacyBaseRaw);
});

test('B2A08 explicit inherited section and original order reset remove only structure and retain personal core memo', () => {
  const original = fixture(), f = coreMemo(original, original.flow, '  개인 메모\r\n\t  ');
  const core = clone(f.checkpoint.state[META].entries[f.flow.ref]);
  const opened = open(f), draft = clone(opened.draft);
  draft.sectionTitles['step-1'] = { mode: 'override', value: '내 구간' }; draft.orderedItemRefs.reverse();
  const first = advance(f, plan(f, opened, draft)), again = open(first), reset = clone(again.draft);
  reset.sectionTitles['step-1'] = { mode: 'inherit' }; reset.orderedItemRefs = refs(f);
  const next = advance(first, plan(first, again, reset));
  assert.equal(next.checkpoint.state[META].version, 2);
  assert.deepEqual(next.checkpoint.state[META].entries[f.flow.ref], core);
  assert.deepEqual(view(next).orderedItemRefs, refs(f));
  assert.equal(view(next).sections.find(section => section.sectionId === 'step-1').title, '같은 구간');
  const final = open(next), noop = plan(next, final, final.draft);
  assert.equal(noop.ok, true); assert.equal(noop.changed, false);
});

test('B2A09 missing duplicate stored section ids stay readonly without preventing independently valid full Item order', () => {
  for (const variant of ['missing', 'duplicate']) {
    const first = fixture(), raw = clone(first.checkpoint.state);
    delete raw.timelineContextV1;
    const flow = raw.flows.find(entry => entry.ref === first.flow.ref);
    if (variant === 'missing') delete flow.steps[0].id;
    else flow.steps[1].id = flow.steps[0].id;
    assert.deepEqual(M.validate(raw), []);
    const f = { ...first, flow, checkpoint: checkpoint(raw) }, opened = open(f), draft = clone(opened.draft);
    assert.deepEqual(draft.sectionTitles, {});
    draft.orderedItemRefs.reverse();
    assert.equal(validate(opened, draft).ok, true);
    assert.equal(plan(f, opened, draft).changed, true);
    if (variant === 'missing') assert.equal(own(f.checkpoint.state.flows.find(entry => entry.ref === flow.ref).steps[0], 'id'), false);
  }
});

test('B2A10 exact source bytes epoch and read errors cannot reuse a captured structure candidate', () => {
  const f = fixture(); f.sourceRead = { ok: true, raw: bytes(M.initialSourceCandidateStore(NOW)) };
  const opened = open(f), draft = clone(opened.draft); draft.orderedItemRefs.reverse();
  assert.equal(validate(opened, draft).ok, true);
  for (const patch of [{ sourceRead: { ok: true, raw: ' ' + f.sourceRead.raw } },
    { sourceEpoch: f.sourceEpoch + 1 }, { sourceRead: { ok: false, reason: 'read-error' } }]) {
    assert.equal(plan(f, opened, draft, patch).ok, false);
  }
});

test('B2A11 cloned B1 and read tokens never become structure owners; draft getters run zero times', () => {
  const f = fixture(), verified = source(f), opened = open(f), draft = clone(opened.draft);
  draft.orderedItemRefs.reverse();
  const b1 = P.inspectPersonalPlanSourceEditor({ sourceContext: verified.context, flowRef: f.flow.ref });
  assert.equal(b1.ok, true, b1.reason);
  assert.equal(validate(opened, draft).ok, true);
  for (const context of [{}, clone(opened.context), verified.context, b1.context]) {
    assert.equal(api(P, 'validateCapturedPersonalPlanStructureDraft')({ context, draft }).ok, false);
    assert.equal(plan(f, opened, draft, { context }).ok, false);
  }
  let calls = 0; const unsafe = clone(draft);
  Object.defineProperty(unsafe, 'orderedItemRefs', { enumerable: true, get() { calls += 1; return draft.orderedItemRefs; } });
  assert.equal(validate(opened, unsafe).ok, false); assert.equal(calls, 0);
  const before = bytes(f.checkpoint), projected = view(f);
  assert.notEqual(projected.sections, f.flow.steps);
  assert.notEqual(projected.orderedItemRefs, f.flow.steps[0].itemIds);
  assert.equal(bytes(f.checkpoint), before);
});

test('B2A12 C-issued structural token binds whole checkpoint and produces exactly one revision with exact before Undo', () => {
  const f = fixture(); source(f);
  const inspector = api(C, 'inspectSourceBoundPersonalPlanStructureContext');
  const observation = { flowRef: f.flow.ref, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch };
  const opened = inspector(f.checkpoint, observation); assert.equal(opened.ok, true, opened.reason);
  const draft = clone(opened.draft); draft.orderedItemRefs.reverse();
  const action = { type: 'commit-source-bound-personal-plan-structure-context', context: opened.context,
    draft, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, now: NOW };
  const before = bytes(f.checkpoint), result = C.transitionCheckpoint(f.checkpoint, action);
  assert.equal(result.ok, true, result.reason); assert.equal(result.changed, true, result.reason);
  assert.equal(result.checkpoint.state.revision, f.checkpoint.state.revision + 1);
  assert.deepEqual(result.checkpoint.undo, f.checkpoint.state);
  assert.equal(result.checkpoint.legacyBaseRaw, f.checkpoint.legacyBaseRaw);
  assert.equal(C.validateCheckpoint(result.checkpoint).ok, true);
  const rawP = open(f), foreign = C.transitionCheckpoint(f.checkpoint, { ...action, context: rawP.context });
  assert.equal(foreign.ok, false); assert.equal(foreign.changed, false);
  const drift = clone(f.checkpoint); drift.undo = clone(drift.state);
  assert.equal(C.validateCheckpoint(drift).ok, true);
  const denied = C.transitionCheckpoint(drift, action);
  assert.equal(denied.ok, false); assert.equal(denied.changed, false);
  assert.equal(bytes(f.checkpoint), before);
});
