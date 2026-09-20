'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./model.js');
const C = require('./workspace-checkpoint.js');
const P = require('./personal-plan-context.js');
const NOW = '2026-09-06T01:00:00.000Z';

test('B3S17 long emoji labels stay well-formed at both UTF-16 cut parities without altering source or summary identity', () => {
  assert.equal(typeof P.summarizeCapturedPersonalPlanChanges, 'function');
  for (const prefix of ['', '가']) {
    const title = prefix + '😀'.repeat(90), rawText = '# 표시 경계\n## A\n- [ ] ' + title;
    const handoff = M.makeHandoff(rawText, { draftId: 'summary-unicode-draft', handoffId: 'summary-unicode-handoff', sourceConfirmed: true, folderId: null });
    const made = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: NOW }); assert.equal(made.changed, true, made.error);
    const flow = made.state.flows.find(value => value.handoffId === handoff.handoffId);
    const converted = C.fromLegacy(JSON.stringify({ version: 1, state: made.state, undo: null })); assert.equal(converted.ok, true, converted.reason);
    const cp = converted.checkpoint, before = JSON.stringify(cp);
    const opened = C.inspectSourceBoundPersonalPlanStructureContext(cp, { flowRef: flow.ref, sourceRead: { ok: true, raw: null }, sourceEpoch: 3 });
    assert.equal(opened.ok, true, opened.reason); const draft = JSON.parse(JSON.stringify(opened.draft)), ref = draft.orderedItemRefs[0];
    draft.items[ref].memo = { mode: 'override', value: '개인 메모' };
    const result = P.summarizeCapturedPersonalPlanChanges({ context: opened.context, draft });
    assert.equal(result.ok, true, result.reason); assert.equal(result.changedFieldCount, 1);
    assert.deepEqual(result.affectedRefs, [ref]); assert.equal(result.changes[0].field, `item.${ref}.memo`);
    const label = result.changes[0].label;
    assert.ok(label.length <= 160); assert.doesNotMatch(label, /[\uD800-\uDFFF]/u, 'label contains a split surrogate pair');
    assert.equal(label.endsWith('…'), true); assert.equal(label.startsWith(prefix + '😀'), true);
    assert.equal(JSON.stringify(cp), before); assert.equal(cp.state.flows.find(value => value.ref === flow.ref).rawText, rawText);
  }
});
