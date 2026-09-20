'use strict';

// Historical RED gate, kept explicit outside the normal *.test.cjs suite.
// SB01-03 now consume the approved bound intent API without weakening their
// expected results; SB05-06 retain the original raw-only compatibility controls.
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('./personal-plan-context.js');
const { NOW, clone, own, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');

function commitRaw(f, value) {
  const opened = P.inspectPlanContext({ state: f.state, flowRef: f.flow.ref });
  assert.equal(opened.ok, true);
  const draft = clone(opened.draft); draft.title = value;
  return P.planPersonalPlanState({ state: f.state, context: opened.context, draft, now: NOW });
}
function read(f, state) {
  const result = P.readPersonalPlanSourceContext({ rawState: state, legacyBaseRaw: null, undo: null,
    sourceRead: { ok: true, raw: JSON.stringify(f.store) }, sourceEpoch: 1 });
  assert.equal(result.ok, true, result.reason);
  return result;
}
function commitBound(f, value) {
  const source = read(f, f.state);
  const opened = P.inspectPersonalPlanSourceEditor({ sourceContext: source.context, flowRef: f.flow.ref });
  assert.equal(opened.ok, true, opened.reason);
  const draft = clone(opened.draft); draft.title = value;
  return P.planPersonalPlanSourceState({ rawState: f.state, context: opened.context, draft, now: NOW,
    sourceRead: { ok: true, raw: JSON.stringify(f.store) }, sourceEpoch: 1 });
}

test('SB01 source A to B then explicit A retains a personal A override through the approved bound API', () => {
  const f = sourceUpdateFixture(); const before = JSON.stringify(f.state);
  assert.equal(read(f, f.state).state.flows.find(flow => flow.ref === f.flow.ref).title, '새 원문 제목');
  const result = commitBound(f, { mode: 'override', value: f.flow.title });
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(f.state), before);
  assert.equal(result.changed, true, 'Sb explicit A differs from inherited current source B');
  assert.equal(result.state.personalPlanContextV1.entries[f.flow.ref].overlay.title, f.flow.title);
  assert.equal(read(f, result.state).state.flows.find(flow => flow.ref === f.flow.ref).title, f.flow.title);
});

test('SB02 explicit B equals inherited current source B and does not manufacture a new personal override', () => {
  const f = sourceUpdateFixture(); const before = JSON.stringify(f.state);
  const result = commitBound(f, { mode: 'override', value: '새 원문 제목' });
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(f.state), before);
  assert.equal(result.changed, false, 'Sb compares with verified pre-P source baseline B, not raw A');
  assert.equal(own(result.state, P.METADATA_KEY), false);
});

test('SB03 inherit after a distinct personal C removes only that overlay and displays verified B', () => {
  const f = sourceUpdateFixture(); const changed = commitBound(f, { mode: 'override', value: '개인 C' });
  assert.equal(changed.ok, true);
  const inherited = commitBound({ ...f, state: changed.state }, { mode: 'inherit' });
  assert.equal(inherited.ok, true);
  assert.equal(inherited.changed, true);
  assert.equal(own(inherited.state, P.METADATA_KEY), false);
  assert.equal(read(f, inherited.state).state.flows.find(flow => flow.ref === f.flow.ref).title, '새 원문 제목');
  assert.equal(inherited.state.flows.find(flow => flow.ref === f.flow.ref).title, f.flow.title);
});

test('SB04 valid explicit title A remains readable without the decoder assuming raw A means redundant intent', () => {
  const f = sourceUpdateFixture(); const candidate = commitRaw(f, { mode: 'override', value: '개인 C' }).state;
  candidate.personalPlanContextV1.entries[f.flow.ref].overlay.title = f.flow.title;
  const result = P.projectPersonalPlanState(candidate);
  assert.equal(result.ok, true, 'Sb decoder must allow the explicit string while normalization owns the comparison');
});

test('SB05 existing raw-only API keeps its original equal-raw no-op contract', () => {
  const f = sourceUpdateFixture();
  const result = commitRaw(f, { mode: 'override', value: f.flow.title });
  assert.equal(result.ok, true);
  assert.equal(result.changed, false);
  assert.equal(own(result.state, P.METADATA_KEY), false);
});

test('SB06 legacy missing sourceTitle inherits the existing personal baseline, not an invented source title', () => {
  const f = sourceUpdateFixture(); delete f.flow.sourceTitle;
  const result = commitRaw(f, { mode: 'inherit' });
  assert.equal(result.ok, true); assert.equal(result.changed, false);
  const view = read(f, result.state);
  assert.equal(view.state.flows.find(flow => flow.ref === f.flow.ref).title, f.flow.title);
  assert.equal(view.capabilities.flows[f.flow.ref].title.owner, 'existing-personal-baseline');
  assert.equal(own(f.flow, 'sourceTitle'), false);
});
