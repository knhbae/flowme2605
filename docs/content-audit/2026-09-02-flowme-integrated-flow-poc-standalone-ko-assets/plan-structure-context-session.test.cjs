'use strict';
// B2 E2 v4: generated fixture source only; no app, real storage or published HTML.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const M = require('./model.js');
const C = require('./workspace-checkpoint.js');
const P = require('./personal-plan-context.js');
const E0 = require('./plan-item-session.js');
const E = E0.createForWorkspace('checkpoint-v2');
const NOW = '2026-09-05T14:06:00.000Z';
const SOURCE = M.SOURCE_CANDIDATE_STORAGE_KEY;
const CONTRACT = 'flowme-standalone-source-bound-personal-plan-draft-v2';
const clone = value => JSON.parse(JSON.stringify(value));
const bytes = value => JSON.stringify(value);
let serial = 0;
const audits = [];
function api() {
  for (const name of ['createSourceBoundPersonalPlanStructureSession', 'checkSourceBoundPersonalPlanStructureSession',
    'createSourceBoundPersonalPlanStructureChild', 'applySourceBoundPersonalPlanStructureChild',
    'beginSourceBoundPersonalPlanStructureSave', 'retrySourceBoundPersonalPlanStructureSave',
    'resumeRecoveredSourceBoundPersonalPlanStructureSession']) assert.equal(typeof E[name], 'function', name + ' unavailable');
}
function fixture({ sourceUpdate = false, seed = false } = {}) {
  if (seed) { const cp = C.fromLegacy(null).checkpoint; return { cp, flow: cp.state.flows[0], sourceRaw: null }; }
  let state = M.seedState();
  const raw = '# 내 계획\n## 같은 구간\n- [ ] A1\n- [ ] A2\n## 같은 구간\n- [ ] B1';
  const flows = [];
  for (const id of ['first', 'second']) {
    const handoff = M.makeHandoff(raw, { draftId: 'e4-draft-' + id, handoffId: 'e4-handoff-' + id, sourceConfirmed: true, folderId: null });
    const result = M.apply(state, { type: 'commit-authoring', handoff, now: NOW });
    assert.equal(result.changed, true, result.error); state = result.state;
    flows.push(state.flows.find(flow => flow.handoffId === handoff.handoffId));
  }
  state.futureUnknown = { exact: ' \r\n\t🙂 ', values: [false, 0, null, { z: 2, a: 1 }] };
  let store = M.initialSourceCandidateStore(NOW);
  if (sourceUpdate) {
    const prepared = M.prepareLocalSourceCandidateReview(store, state, flows[0].id, {
      now: NOW, createdAt: NOW, incomingRawText: raw.replaceAll('같은 구간', '새 구간'),
    });
    assert.equal(prepared.ok, true, prepared.reason); store = prepared.store;
    for (const change of prepared.candidate.changes) {
      const resolved = M.resolveLocalSourceCandidateChange(store, { candidateId: prepared.candidate.candidateId,
        changeId: change.changeId, resolution: 'use-incoming', now: NOW });
      assert.equal(resolved.changed, true, resolved.code); store = resolved.store;
    }
    const applied = M.applyLocalSourceCandidate(store, state, flows[0].id, prepared.candidate.candidateId, NOW);
    assert.equal(applied.changed, true, applied.code); store = applied.store;
  }
  const rawLegacy = ' \r\n' + bytes({ version: 1, state, undo: null }) + '\n ';
  const converted = C.fromLegacy(rawLegacy); assert.equal(converted.ok, true, converted.reason);
  return { cp: converted.checkpoint, flow: flows[0], other: flows[1], sourceRaw: bytes(store) };
}
function storage(f, hooks = {}, absent = false) {
  const map = new Map([['flow:operating:e4-sentinel', ' \r\n원본 🙂\t ']]), calls = [], reads = [];
  if (!absent) map.set(E.STORAGE_KEY, bytes(f.cp));
  if (f.cp.legacyBaseRaw !== null) map.set(M.STORAGE_KEY, f.cp.legacyBaseRaw);
  if (f.sourceRaw !== null) map.set(SOURCE, f.sourceRaw);
  const boundary = { calls, forbidden: 0 }; audits.push(boundary);
  return { map, calls, reads,
    getItem(key) { reads.push(key); const value = map.get(key) ?? null; return hooks.read ? hooks.read({ key, value, map, calls, reads }) : value; },
    setItem(key, value) {
      if (![E.STORAGE_KEY, E.RECOVERY_KEY].includes(key)) boundary.forbidden++;
      assert.ok([E.STORAGE_KEY, E.RECOVERY_KEY].includes(key)); calls.push({ method: 'setItem', key });
      if (hooks.beforeWrite) hooks.beforeWrite({ key, value, map }); map.set(key, value);
      if (hooks.afterWrite) hooks.afterWrite({ key, value, map });
    },
    removeItem(key) {
      if (![E.STORAGE_KEY, E.RECOVERY_KEY].includes(key)) boundary.forbidden++;
      assert.ok([E.STORAGE_KEY, E.RECOVERY_KEY].includes(key)); calls.push({ method: 'removeItem', key });
      if (hooks.beforeRemove) hooks.beforeRemove({ key, map }); map.delete(key);
      if (hooks.afterRemove) hooks.afterRemove({ key, map });
    },
    clear() { boundary.forbidden++; throw Error('forbidden clear'); },
  };
}
function setup(options = {}) {
  api();
  const f = options.f || fixture(options), db = storage(f, options.hooks, options.absent), clock = { epoch: 5 };
  const readSourceEpoch = () => clock.epoch;
  const session = E.createSourceBoundPersonalPlanStructureSession(db, { checkpoint: f.cp, flowRef: f.flow.ref,
    sessionId: 'e4-session-' + (++serial), readSourceEpoch });
  return { f, db, clock, readSourceEpoch, session, absent: options.absent };
}
function opts(x, extra = {}) { return { checkpoint: x.f.cp, readSourceEpoch: x.readSourceEpoch, ...extra }; }
function edit(session, mutate = draft => draft.orderedItemRefs.reverse()) {
  const draft = clone(session.draft); mutate(draft); const changed = E.updateDraft(session, draft);
  assert.equal(changed.ok, true, changed.error); return changed.session;
}
function begin(x, session = edit(x.session)) {
  return E.beginSourceBoundPersonalPlanStructureSave(x.db, session, opts(x, { expectedRaw: x.absent ? null : bytes(x.f.cp),
    attemptId: 'e4-attempt-' + (++serial), now: NOW }));
}
function save(x, session) {
  const b = begin(x, session); assert.equal(b.ok, true, b.error || b.reason);
  const out = E.writeDurableAttempt(x.db, b.session, b.attempt, { readSourceEpoch: x.readSourceEpoch }); return { b, out };
}
function clean(x, saved) {
  const result = E.clearConfirmedRecovery(x.db, { expectedJournalRaw: saved.out.journalRaw }); assert.equal(result.ok, true, result.error); return result;
}
function prepared(x, saved) {
  const journal = JSON.parse(saved.out.journalRaw); journal.phase = 'prepared'; const raw = bytes(journal);
  x.db.map.set(E.RECOVERY_KEY, raw); return raw;
}
function boundary(x, sourceRaw = x.f.sourceRaw) {
  assert.equal(x.db.map.get('flow:operating:e4-sentinel'), ' \r\n원본 🙂\t ');
  assert.equal(x.db.map.get(M.STORAGE_KEY) ?? null, x.f.cp.legacyBaseRaw);
  assert.equal(x.db.map.get(SOURCE) ?? null, sourceRaw);
}

test('E4-01 genuine actual-storage structure owner is frozen; old public brands cannot open or save it', () => {
  const x = setup(); assert.equal(x.session.draft.version, 2); assert.equal(x.session.draftContract, CONTRACT);
  assert.equal(E.STRUCTURE_PLAN_RECOVERY_VERSION, 4); assert.equal(E.STRUCTURE_PLAN_DRAFT_CONTRACT, CONTRACT);
  assert.ok(Object.isFrozen(x.session.draft.sectionTitles)); assert.ok(Object.isFrozen(x.session.draft.orderedItemRefs));
  assert.equal(Object.keys(x.session.draft.sectionTitles).length, 2); assert.equal(new Set(x.session.draft.orderedItemRefs).size, 3);
  assert.equal(E.checkSourceBoundPersonalPlanSession(x.db, x.session, opts(x)).ok, false);
  assert.equal(E.beginSourceBoundPersonalPlanSave(x.db, edit(x.session), opts(x)).ok, false);
  assert.equal(E.beginPersonalPlanSave(edit(x.session), {}).ok, false); assert.equal(E.beginSave(edit(x.session), {}).ok, false);
  const v3 = E.createSourceBoundPersonalPlanSession(x.db, opts(x, { sessionId: 'v3', flowRef: x.f.flow.ref }));
  assert.equal(E.checkSourceBoundPersonalPlanStructureSession(x.db, v3, opts(x)).ok, false);
  assert.equal(E.beginSourceBoundPersonalPlanStructureSave(x.db, v3, opts(x)).ok, false);
  assert.throws(() => E0.createSourceBoundPersonalPlanStructureSession(x.db, opts(x, { flowRef: x.f.flow.ref, sessionId: 'wrong-pair' })));
  for (const readSourceEpoch of [undefined, () => true, () => -1, () => 1.5, () => Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => E.createSourceBoundPersonalPlanStructureSession(x.db, opts(x, { sessionId: 'bad-epoch', flowRef: x.f.flow.ref, readSourceEpoch })));
  }
  assert.throws(() => E.createSourceBoundPersonalPlanStructureSession(x.db, opts(x, { sessionId: 'caller-packet', flowRef: x.f.flow.ref,
    sourceRead: { ok: true, raw: x.f.sourceRaw }, sourceEpoch: 5 })));
  const attempt = begin(x); assert.equal(attempt.ok, true, attempt.error);
  assert.equal(E.writeAttempt(x.db, attempt.session, attempt.attempt).status, 'preflight-failed');
  assert.equal(E.writeDurableAttempt(x.db, attempt.session, attempt.attempt).status, 'preflight-failed');
  assert.equal(x.db.calls.length, 0); boundary(x);
});

test('E4-02 section order and core saves all use journal4; only actual structure upgrades metadata', () => {
  for (const kind of ['section', 'order', 'core']) {
    const x = setup(), edited = edit(x.session, draft => {
      if (kind === 'section') draft.sectionTitles['step-1'] = { mode: 'override', value: '개인 구간' };
      else if (kind === 'order') draft.orderedItemRefs = [draft.orderedItemRefs[0], draft.orderedItemRefs[2], draft.orderedItemRefs[1]];
      else draft.title = { mode: 'override', value: '개인 제목' };
    });
    const saved = save(x, edited); assert.equal(saved.out.status, 'committed', saved.out.error);
    const cp = JSON.parse(x.db.map.get(E.STORAGE_KEY)), journal = JSON.parse(saved.out.journalRaw);
    assert.equal(journal.version, 4); assert.equal(journal.draft.version, 2); assert.equal(journal.draftContract, CONTRACT);
    assert.equal(cp.state[P.METADATA_KEY].version, kind === 'core' ? 1 : 2);
    assert.deepEqual(cp.undo, x.f.cp.state); assert.equal(cp.state.revision, x.f.cp.state.revision + 1);
    for (const key of ['flows', 'tasks', 'orders', 'timelineContextV1', 'futureUnknown']) assert.deepEqual(cp.state[key], x.f.cp.state[key]);
    clean(x, saved); assert.equal(x.db.calls.length, 4); assert.equal(E.finishSave(saved.b.session, saved.b.attempt, saved.out).effect, 'close'); boundary(x);
  }
});

test('E4-03 source A to B preserves explicit old section A; explicit B and inherit are true no-ops', () => {
  const x = setup({ sourceUpdate: true });
  for (const title of [{ mode: 'inherit' }, { mode: 'override', value: '새 구간' }]) {
    const b = begin(x, edit(x.session, draft => { draft.sectionTitles['step-1'] = title; }));
    assert.equal(b.ok, true, b.error); assert.equal(b.changed, false); assert.equal(b.attempt, undefined);
  }
  assert.equal(x.db.calls.length, 0);
  const saved = save(x, edit(x.session, draft => { draft.sectionTitles['step-1'] = { mode: 'override', value: '같은 구간' }; }));
  assert.equal(saved.out.status, 'committed', saved.out.error);
  const cp = JSON.parse(x.db.map.get(E.STORAGE_KEY)); assert.equal(cp.state[P.METADATA_KEY].entries[x.f.flow.ref].structure.sectionTitles['step-1'], '같은 구간');
  clean(x, saved); const y = setup({ f: { ...x.f, cp } });
  const reset = save(y, edit(y.session, draft => { draft.sectionTitles['step-1'] = { mode: 'inherit' }; }));
  assert.equal(reset.out.status, 'committed', reset.out.error); assert.equal(Object.hasOwn(JSON.parse(y.db.map.get(E.STORAGE_KEY)).state, P.METADATA_KEY), false);
  boundary(x); boundary(y);
});

test('E4-04 strict draft identity descriptors readonly sections and child structure injection reject', () => {
  const x = setup(); let getters = 0;
  for (const mutate of [d => { d.sectionTitles.foreign = { mode: 'inherit' }; }, d => { d.orderedItemRefs[1] = d.orderedItemRefs[0]; },
    d => { d.orderedItemRefs.pop(); }, d => { d.version = 1; }, d => { d.extra = true; },
    d => Object.defineProperty(d, 'orderedItemRefs', { enumerable: true, get() { getters++; return []; } })]) {
    const draft = clone(x.session.draft); mutate(draft); const result = E.updateDraft(x.session, draft);
    assert.equal(result.ok, false); assert.equal(result.session, x.session);
  }
  assert.equal(getters, 0);
  for (const mutate of [d => { d.orderedItemRefs.toJSON = () => { getters++; return []; }; },
    d => { Object.setPrototypeOf(d.orderedItemRefs, Object.assign(Object.create(Array.prototype), { toJSON() { getters++; return []; } })); },
    d => { delete d.orderedItemRefs[1]; }, d => { d[Symbol('hidden')] = true; }]) {
    const draft = clone(x.session.draft); mutate(draft); assert.equal(E.updateDraft(x.session, draft).ok, false);
  }
  assert.equal(getters, 0);
  const child = E.createSourceBoundPersonalPlanStructureChild(x.db, x.session, opts(x, { sessionId: 'child-strict', itemRef: x.session.draft.orderedItemRefs[0] }));
  for (const key of ['sectionTitles', 'orderedItemRefs']) { const draft = clone(child.draft); draft[key] = key === 'sectionTitles' ? {} : []; assert.equal(E.updateDraft(child, draft).ok, false); }
  const seed = setup({ seed: true }); assert.deepEqual(seed.session.draft.sectionTitles, {});
  const draft = clone(seed.session.draft); draft.sectionTitles['step-1'] = { mode: 'override', value: '제조한 owner' };
  assert.equal(E.updateDraft(seed.session, draft).ok, false); assert.equal(x.db.calls.length + seed.db.calls.length, 0);
});

test('E4-05 child apply changes only its item and preserves invalid parent section and full order', () => {
  const x = setup(), parent = edit(x.session, draft => { draft.sectionTitles['step-1'] = { mode: 'override', value: '' }; draft.orderedItemRefs.reverse(); });
  assert.equal(parent.status, 'dirty-invalid'); const ref = parent.draft.orderedItemRefs[0];
  const child = E.createSourceBoundPersonalPlanStructureChild(x.db, parent, opts(x, { sessionId: 'child', itemRef: ref }));
  const changed = edit(child, draft => { draft.memo = { mode: 'override', value: '' }; draft.schedule = { mode: 'fixed_date', date: '2026-09-11' }; });
  assert.equal(E.applyChild(parent, changed).ok, false); assert.equal(E.applySourceBoundPersonalPlanChild(x.db, parent, changed, opts(x)).ok, false);
  const applied = E.applySourceBoundPersonalPlanStructureChild(x.db, parent, changed, opts(x)); assert.equal(applied.ok, true, applied.error);
  assert.deepEqual(applied.parent.draft.sectionTitles, parent.draft.sectionTitles); assert.deepEqual(applied.parent.draft.orderedItemRefs, parent.draft.orderedItemRefs);
  assert.equal(applied.parent.status, 'dirty-invalid'); assert.deepEqual(applied.parent.draft.items[ref].memo, { mode: 'override', value: '' });
  for (const key of Object.keys(parent.draft.items).filter(id => id !== ref)) assert.deepEqual(applied.parent.draft.items[key], parent.draft.items[key]);
  assert.equal(begin(x, applied.parent).ok, false); assert.equal(x.db.calls.length, 0);
});

test('E4-06 parent object revision ABA cross-copy child and forged owner never apply', () => {
  const x = setup(), parent = edit(x.session), ref = parent.draft.orderedItemRefs[0];
  const child = E.createSourceBoundPersonalPlanStructureChild(x.db, parent, opts(x, { sessionId: 'owned-child', itemRef: ref }));
  const changed = edit(child, draft => { draft.memo = { mode: 'override', value: '남길 입력' }; });
  const aba = edit(edit(parent, d => { d.title = { mode: 'override', value: '다른 값' }; }), d => { d.title = clone(parent.draft.title); });
  const other = E.createSourceBoundPersonalPlanStructureSession(x.db, opts(x, { sessionId: parent.sessionId, flowRef: x.f.other.ref }));
  for (const target of [aba, other, clone(parent)]) assert.equal(E.applySourceBoundPersonalPlanStructureChild(x.db, target, changed, opts(x)).ok, false);
  assert.equal(E.applySourceBoundPersonalPlanStructureChild(x.db, parent, clone(changed), opts(x)).ok, false);
  assert.equal(E.applySourceBoundPersonalPlanStructureChild(x.db, parent, changed, opts(x)).ok, true); assert.equal(x.db.calls.length, 0);
});

test('E4-07 unchanged reset cancel Escape Back and dirty confirmation create no candidate or writes', () => {
  const x = setup(), dirty = edit(x.session), reset = edit(dirty, d => { d.orderedItemRefs = clone(x.session.draft.orderedItemRefs); });
  const unchanged = begin(x, reset); assert.equal(unchanged.ok, true); assert.equal(unchanged.changed, false); assert.equal(unchanged.attempt, undefined);
  for (const reason of E.CLOSE_REASONS) {
    assert.equal(E.requestClose(x.session, { reason }).effect, 'close');
    const closing = E.requestClose(dirty, { reason, editingPoint: 'exact-focus' }); assert.equal(closing.effect, 'confirm');
    assert.equal(E.continueEditing(closing.session).returnPoint, 'exact-focus'); assert.equal(E.discardChanges(closing.session).effect, 'close');
  }
  assert.equal(x.db.calls.length, 0); boundary(x);
});

test('E4-08 source and epoch observed ABA whole Undo drift and read errors fail closed with draft retained', () => {
  for (const kind of ['source', 'epoch', 'undo', 'read']) {
    let failRead = false; const x = setup({ hooks: { read: ({ key, value }) => { if (failRead && key === SOURCE) throw Error('read'); return value; } } });
    const s = edit(x.session), options = opts(x); const beforeDraft = bytes(s.draft);
    if (kind === 'source') x.db.map.set(SOURCE, x.f.sourceRaw + ' ');
    if (kind === 'epoch') x.clock.epoch++;
    if (kind === 'undo') { options.checkpoint = clone(x.f.cp); options.checkpoint.undo = clone(x.f.cp.state); }
    if (kind === 'read') failRead = true;
    assert.equal(E.checkSourceBoundPersonalPlanStructureSession(x.db, s, options).ok, false);
    if (kind === 'source') x.db.map.set(SOURCE, x.f.sourceRaw);
    if (kind === 'epoch') x.clock.epoch--;
    failRead = false;
    if (kind !== 'read') assert.equal(begin(x, s).ok, false);
    else assert.equal(E.checkSourceBoundPersonalPlanStructureSession(x.db, s, opts(x)).ok, true);
    assert.equal(bytes(s.draft), beforeDraft); assert.equal(x.db.calls.length, 0); boundary(x);
  }
});

test('E4-09 journal version contract kind and unknown shape cannot downgrade or cross a fixed pair', () => {
  const x = setup(), saved = save(x); assert.equal(saved.out.status, 'committed', saved.out.error); const journal = JSON.parse(saved.out.journalRaw);
  for (const mutate of [j => { j.version = 3; }, j => { j.draftContract = E.SOURCE_PLAN_DRAFT_CONTRACT; }, j => { j.kind = 'item'; },
    j => { j.kind = 'quick'; }, j => { j.extra = true; }, j => { delete j.sourceReadSnapshot; }, j => { j.sourceReadSnapshot.version = 9; },
    j => { j.draft.version = 1; }, j => { j.targetKey = E0.STORAGE_KEY; }]) {
    const bad = clone(journal); mutate(bad); x.db.map.set(E.RECOVERY_KEY, bytes(bad)); const count = x.db.calls.length;
    assert.equal(E.loadRecovery(x.db).status, 'blocked'); assert.equal(x.db.calls.length, count);
  }
  boundary(x);
});

test('E4-10 historical replay validates v4 and null-before without reading current source or upgrading old Undo', () => {
  for (const absent of [false, true]) {
    const x = setup({ absent }), saved = save(x); assert.equal(saved.out.status, 'committed', saved.out.error);
    const count = x.db.calls.length; const db = { ...x.db, getItem(key) { if (key === SOURCE) throw Error('current source is not historical authority'); return x.db.getItem(key); } };
    const recovery = E.loadRecovery(db); assert.equal(recovery.status, 'confirmed', recovery.error); assert.equal(recovery.journal.version, 4);
    assert.equal(recovery.journal.beforeRaw, absent ? null : bytes(x.f.cp)); assert.deepEqual(JSON.parse(recovery.journal.candidateRaw).undo, x.f.cp.state);
    assert.equal(x.db.calls.length, count); boundary(x);
  }
});

test('E4-11 valid unrelated candidate and tampered baseline structure source or Undo never pass recomputation', () => {
  const x = setup(), saved = save(x); assert.equal(saved.out.status, 'committed', saved.out.error); const journal = JSON.parse(saved.out.journalRaw);
  const other = C.inspectSourceBoundPersonalPlanContext(x.f.cp, { flowRef: x.f.other.ref, sourceRead: { ok: true, raw: x.f.sourceRaw }, sourceEpoch: 5 });
  const draft = clone(other.draft); draft.title = { mode: 'override', value: '다른 Flow' };
  const unrelated = C.transitionCheckpoint(x.f.cp, { type: 'commit-source-bound-personal-plan-context', context: other.context, draft,
    sourceRead: { ok: true, raw: x.f.sourceRaw }, sourceEpoch: 5, now: NOW }); assert.equal(unrelated.changed, true, unrelated.reason);
  for (const mutate of [j => { j.candidateRaw = bytes(unrelated.checkpoint); }, j => { j.baseline.orderedItemRefs.reverse(); },
    j => { j.draft.orderedItemRefs = clone(j.baseline.orderedItemRefs); }, j => { j.sourceReadSnapshot.raw = 'broken'; },
    j => { const cp = JSON.parse(j.candidateRaw); cp.undo = null; j.candidateRaw = bytes(cp); },
    j => { const cp = JSON.parse(j.candidateRaw); cp.state.futureUnknown.exact += 'changed'; j.candidateRaw = bytes(cp); }]) {
    const bad = clone(journal); mutate(bad); x.db.map.set(E.RECOVERY_KEY, bytes(bad)); x.db.map.set(E.STORAGE_KEY, bad.candidateRaw);
    const count = x.db.calls.length; assert.equal(E.loadRecovery(x.db).status, 'blocked'); assert.equal(x.db.calls.length, count);
  }
  boundary(x);
});

test('E4-12 actual source drift and read failure at prepare target confirm stop later writes without source rollback', () => {
  for (const phase of ['prepare', 'target', 'confirm']) for (const fault of ['drift', 'read', 'epoch']) {
    let armed = false, x; const hooks = {
      read: ({ key, value }) => { if (armed && fault === 'read' && key === SOURCE) throw Error('read'); return value; },
      afterWrite: ({ key, value, map }) => {
        if ((phase === 'target' && key === E.RECOVERY_KEY && JSON.parse(value).phase === 'prepared') || (phase === 'confirm' && key === E.STORAGE_KEY)) {
          armed = true; if (fault === 'drift') map.set(SOURCE, x.f.sourceRaw + ' '); if (fault === 'epoch') x.clock.epoch++;
        }
      },
    };
    x = setup({ hooks }); const b = begin(x); assert.equal(b.ok, true, b.error);
    if (phase === 'prepare') { armed = true; if (fault === 'drift') x.db.map.set(SOURCE, x.f.sourceRaw + ' '); if (fault === 'epoch') x.clock.epoch++; }
    const out = E.writeDurableAttempt(x.db, b.session, b.attempt, { readSourceEpoch: x.readSourceEpoch });
    assert.notEqual(out.status, 'committed'); assert.equal(out.writeCount, phase === 'confirm' ? 1 : 0); assert.equal(out.rollbackWriteCount, 0);
    boundary(x, fault === 'drift' ? x.f.sourceRaw + ' ' : x.f.sourceRaw);
  }
});

test('E4-13 quota and throwing target restore only owned bytes; foreign or unreadable rollback remains gated', () => {
  for (const fault of ['quota', 'throw-after', 'foreign', 'rollback-fail', 'readback', 'rollback-read']) {
    let targetWrites = 0, targetReadback = 0;
    const x = setup({ hooks: {
      read: ({ key, value }) => {
        if (key === E.STORAGE_KEY && targetWrites === 1) {
          targetReadback++;
          if (fault === 'readback' && targetReadback === 1) return 'unverified-readback';
          if (fault === 'rollback-read') throw Error('unreadable target');
        }
        return value;
      },
      beforeWrite: ({ key }) => { if (key === E.STORAGE_KEY) { targetWrites++; if (fault === 'quota' || (fault === 'rollback-fail' && targetWrites > 1)) throw Error('quota'); } },
      afterWrite: ({ key, map }) => { if (key === E.STORAGE_KEY && targetWrites === 1 && ['throw-after', 'foreign', 'rollback-fail'].includes(fault)) { if (fault === 'foreign') map.set(key, 'foreign-target'); throw Error('after'); } },
    } });
    const saved = save(x); assert.equal(saved.out.status, ['foreign', 'rollback-fail', 'rollback-read'].includes(fault) ? 'recovery-required' : 'failed');
    assert.equal(saved.out.rollbackWriteCount, ['throw-after', 'rollback-fail', 'readback'].includes(fault) ? 1 : 0);
    if (fault === 'foreign') assert.equal(x.db.map.get(E.STORAGE_KEY), 'foreign-target');
    if (['quota', 'throw-after', 'readback'].includes(fault)) { assert.equal(x.db.map.get(E.STORAGE_KEY), bytes(x.f.cp)); assert.equal(x.db.map.has(E.RECOVERY_KEY), false); }
    boundary(x);
  }
});

test('E4-14 prepared restore keeps changed-source structure draft read-only and resumes once after explicit matching read', () => {
  const x = setup(), saved = save(x); assert.equal(saved.out.status, 'committed', saved.out.error); const raw = prepared(x, saved);
  x.db.map.set(SOURCE, x.f.sourceRaw + ' '); const count = x.db.calls.length; assert.equal(E.loadRecovery(x.db).status, 'prepared'); assert.equal(x.db.calls.length, count);
  const recovery = E.recoverDurableAttempt(x.db, { expectedJournalRaw: raw }); assert.equal(recovery.ok, true, recovery.error);
  assert.equal(recovery.requiresSourceReopen, true); assert.equal(recovery.review.viewOnly, true); assert.deepEqual(recovery.review.draft, saved.b.session.draft);
  assert.throws(() => E.resumeRecoveredSession(recovery, { storage: x.db, sessionId: 'raw-escape' }));
  assert.equal(E.resumeRecoveredSourceBoundPersonalPlanSession(x.db, recovery, { sessionId: 'v3-escape', readSourceEpoch: x.readSourceEpoch }).ok, false);
  const after = x.db.calls.length;
  const blocked = E.resumeRecoveredSourceBoundPersonalPlanStructureSession(x.db, recovery, { sessionId: 'changed', readSourceEpoch: x.readSourceEpoch });
  assert.equal(blocked.ok, false); assert.deepEqual(blocked.review, recovery.review); assert.equal(x.db.calls.length, after);
  x.db.map.set(SOURCE, x.f.sourceRaw); x.clock.epoch = 12;
  const reopened = E.resumeRecoveredSourceBoundPersonalPlanStructureSession(x.db, recovery, { sessionId: 'fresh', readSourceEpoch: x.readSourceEpoch });
  assert.equal(reopened.ok, true, reopened.reason); assert.deepEqual(reopened.session.draft, saved.b.session.draft);
  assert.equal(E.resumeRecoveredSourceBoundPersonalPlanStructureSession(x.db, recovery, { sessionId: 'again', readSourceEpoch: x.readSourceEpoch }).ok, false);
  assert.equal(x.db.calls.length, after); boundary(x);
});

test('E4-15 confirmed throw-after and cleanup failure preserve durable fact despite source drift and never roll back target', () => {
  let refuseCleanup = true; const x = setup({ hooks: {
    afterWrite: ({ key, value, map }) => { if (key === E.RECOVERY_KEY && JSON.parse(value).phase === 'confirmed') { map.set(SOURCE, 'changed-source'); throw Error('after confirm'); } },
    beforeRemove: ({ key }) => { if (key === E.RECOVERY_KEY && refuseCleanup) throw Error('cleanup'); },
  } });
  const saved = save(x); assert.equal(saved.out.status, 'committed', saved.out.error); assert.equal(saved.out.canResume, false); assert.equal(saved.out.rollbackWriteCount, 0);
  assert.equal(E.finishSave(saved.b.session, saved.b.attempt, saved.out).effect, 'blocked');
  assert.equal(E.loadRecovery(x.db).status, 'confirmed'); const target = x.db.map.get(E.STORAGE_KEY), count = x.db.calls.length;
  assert.equal(E.recoverDurableAttempt(x.db, { expectedJournalRaw: saved.out.journalRaw }).ok, false);
  assert.equal(E.clearConfirmedRecovery(x.db, { expectedJournalRaw: saved.out.journalRaw }).ok, false); assert.equal(x.db.map.get(E.STORAGE_KEY), target);
  refuseCleanup = false; assert.equal(clean(x, saved).writeCount, 0);
  assert.ok(x.db.calls.slice(count).every(call => call.key === E.RECOVERY_KEY)); boundary(x, 'changed-source');
});

test('E4-16 retry keeps original candidate and refuses old wrappers double dispatch and late outcomes', () => {
  let once = true; const x = setup({ hooks: { beforeWrite: ({ key }) => { if (key === E.STORAGE_KEY && once) { once = false; throw Error('quota'); } } } });
  const saved = save(x); assert.equal(saved.out.status, 'failed'); const finished = E.finishSave(saved.b.session, saved.b.attempt, saved.out);
  assert.equal(E.retrySave(finished.session, saved.b.attempt.attemptId).ok, false);
  assert.equal(E.retrySourceBoundPersonalPlanSave(x.db, finished.session, opts(x, { attemptId: saved.b.attempt.attemptId })).ok, false);
  const retry = E.retrySourceBoundPersonalPlanStructureSave(x.db, finished.session, opts(x, { attemptId: saved.b.attempt.attemptId }));
  assert.equal(retry.ok, true, retry.error); assert.equal(retry.attempt, saved.b.attempt);
  const out = E.writeDurableAttempt(x.db, retry.session, retry.attempt, { readSourceEpoch: x.readSourceEpoch }); assert.equal(out.status, 'committed', out.error);
  const count = x.db.calls.length; assert.equal(E.writeDurableAttempt(x.db, retry.session, retry.attempt, { readSourceEpoch: x.readSourceEpoch }).status, 'preflight-failed');
  assert.equal(E.finishSave(retry.session, retry.attempt, saved.out).ok, false); assert.equal(E.finishSave(retry.session, retry.attempt, out).effect, 'close');
  assert.equal(E.finishSave(retry.session, retry.attempt, out).ok, false); assert.equal(x.db.calls.length, count); boundary(x);
});

test('E4-17 pending foreign old journals legacy drift and replacement v4 journal preserve every foreign byte', () => {
  for (const fault of ['old-journal', 'old-drift', 'new-journal', 'after-prepare-foreign']) {
    const x = setup({ hooks: { afterWrite: ({ key, value, map }) => { if (fault === 'after-prepare-foreign' && key === E.RECOVERY_KEY && JSON.parse(value).phase === 'prepared') map.set(key, 'foreign-replacement'); } } });
    const b = begin(x); assert.equal(b.ok, true, b.error);
    if (fault === 'old-journal') x.db.map.set(E0.RECOVERY_KEY, 'old-journal');
    if (fault === 'old-drift') x.db.map.set(M.STORAGE_KEY, 'old-drift');
    if (fault === 'new-journal') x.db.map.set(E.RECOVERY_KEY, 'foreign-journal');
    const out = E.writeDurableAttempt(x.db, b.session, b.attempt, { readSourceEpoch: x.readSourceEpoch }); assert.notEqual(out.status, 'committed'); assert.equal(out.writeCount, 0);
    if (fault === 'after-prepare-foreign') assert.equal(x.db.map.get(E.RECOVERY_KEY), 'foreign-replacement');
    else assert.equal(x.db.calls.length, 0);
    assert.equal(x.db.map.get(SOURCE), x.f.sourceRaw);
  }
});

test('E4-18 missing structure dependency fails only new branch and old v3 saves remain v3 with structure retained', () => {
  const x = setup(), saved = save(x); assert.equal(saved.out.status, 'committed', saved.out.error); clean(x, saved);
  const cp = JSON.parse(x.db.map.get(E.STORAGE_KEY)), structure = clone(cp.state[P.METADATA_KEY].entries[x.f.flow.ref].structure);
  const v3 = E.createSourceBoundPersonalPlanSession(x.db, { checkpoint: cp, flowRef: x.f.flow.ref, sessionId: 'old-api-core', readSourceEpoch: x.readSourceEpoch });
  const edited = edit(v3, d => { d.title = { mode: 'override', value: '기존 v3 제목 변경' }; });
  const b = E.beginSourceBoundPersonalPlanSave(x.db, edited, { checkpoint: cp, expectedRaw: bytes(cp), attemptId: 'old-attempt', now: NOW, readSourceEpoch: x.readSourceEpoch });
  assert.equal(b.ok, true, b.error); const out = E.writeDurableAttempt(x.db, b.session, b.attempt, { readSourceEpoch: x.readSourceEpoch });
  assert.equal(out.status, 'committed', out.error); assert.equal(JSON.parse(out.journalRaw).version, 3);
  assert.deepEqual(JSON.parse(x.db.map.get(E.STORAGE_KEY)).state[P.METADATA_KEY].entries[x.f.flow.ref].structure, structure);
  const v3Journal = JSON.parse(out.journalRaw); v3Journal.phase = 'prepared'; const oldPrepared = bytes(v3Journal);
  x.db.map.set(E.RECOVERY_KEY, oldPrepared); const oldRecovery = E.recoverDurableAttempt(x.db, { expectedJournalRaw: oldPrepared });
  assert.equal(oldRecovery.ok, true, oldRecovery.error);
  assert.equal(E.resumeRecoveredSourceBoundPersonalPlanStructureSession(x.db, oldRecovery, { sessionId: 'v4-escape', readSourceEpoch: x.readSourceEpoch }).ok, false);
  assert.equal(E.resumeRecoveredSourceBoundPersonalPlanSession(x.db, oldRecovery, { sessionId: 'old-v3-reopen', readSourceEpoch: x.readSourceEpoch }).ok, true);
  const sandbox = { FlowPocWorkspaceCheckpoint: { ...C, inspectSourceBoundPersonalPlanStructureContext: undefined }, FlowPocPersonalPlanContext: P };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('./plan-item-session.js'), 'utf8'), sandbox);
  const isolated = sandbox.FlowPocPlanItemSession.createForWorkspace('checkpoint-v2');
  assert.throws(() => isolated.createSourceBoundPersonalPlanStructureSession(x.db, { checkpoint: cp, flowRef: x.f.flow.ref, sessionId: 'missing-api', readSourceEpoch: x.readSourceEpoch }));
  assert.equal(vm.runInContext("FlowPocPlanItemSession.createSession({ sessionId: 'legacy', kind: 'quick', scopeId: 'q', draft: { title: 'quick', memo: '', date: null } }).status", sandbox), 'clean');
  boundary(x);
});

test.after(() => {
  assert.equal(audits.reduce((sum, audit) => sum + audit.forbidden, 0), 0);
  console.log('E4 boundary summary ' + JSON.stringify({ storages: audits.length, calls: audits.reduce((sum, a) => sum + a.calls.length, 0),
    targetSet: audits.reduce((sum, a) => sum + a.calls.filter(c => c.method === 'setItem' && c.key === E.STORAGE_KEY).length, 0),
    targetRemove: audits.reduce((sum, a) => sum + a.calls.filter(c => c.method === 'removeItem' && c.key === E.STORAGE_KEY).length, 0),
    journalSet: audits.reduce((sum, a) => sum + a.calls.filter(c => c.method === 'setItem' && c.key === E.RECOVERY_KEY).length, 0),
    journalRemove: audits.reduce((sum, a) => sum + a.calls.filter(c => c.method === 'removeItem' && c.key === E.RECOVERY_KEY).length, 0), forbidden: 0 }));
});
