'use strict';
// B1-E E01–15: actual checkpoint-bound draft/protocol tests in memory.
// Source freshness/capability E16–18 is intentionally NOT connected here.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { M, C, NOW, clone, legacyFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const P = require('./personal-plan-context.js');
const E = require('./plan-item-session.js').createForWorkspace('checkpoint-v2');
const CONTRACT = 'flowme-standalone-personal-plan-draft-v1';
const OLD = 'flow:poc:personal-workspace:v1:standalone-integrated';
const PREFIX = 'flow:poc:personal-workspace:v1:';
const SENTINEL = 'flow:b1e:operating-sentinel';
const SENTINEL_BYTES = ' \r\n운영 🙂 bytes\t ';
let serial = 0;
function fixture() { return legacyFixture().checkpoint; }
function flow(cp, id = 'moving') { return cp.state.flows.find(f => f.id === id); }
function open(cp = fixture(), id = 'moving', sessionId = 'p-' + (++serial)) {
  return E.createPersonalPlanSession({ checkpoint: cp, flowRef: flow(cp, id).ref, sessionId, returnPoint: { selector: '#exact-opener' } });
}
function edit(s, change = draft => { draft.title = { mode: 'override', value: '  새 계획\r\n제목  ' }; }) {
  const draft = clone(s.draft); change(draft); const r = E.updateDraft(s, draft); assert.equal(r.ok, true, r.error); return r.session;
}
function submit(s, cp, before = JSON.stringify(cp)) {
  const r = E.beginPersonalPlanSave(s, { checkpoint: cp, expectedRaw: before, attemptId: 'a-' + (++serial), now: NOW });
  assert.equal(r.ok, true, r.error); return r;
}
function store(cp, before = JSON.stringify(cp), hooks = {}) {
  const values = new Map([[SENTINEL, SENTINEL_BYTES]]), calls = [];
  if (before !== null) values.set(E.STORAGE_KEY, before);
  if (cp.legacyBaseRaw !== null) values.set(OLD, cp.legacyBaseRaw);
  const api = {
    values, calls,
    getItem(key) { const value = values.has(key) ? values.get(key) : null; return hooks.read ? hooks.read({ key, value, values, calls }) : value; },
    setItem(key, value) {
      assert.ok(key.startsWith(PREFIX)); calls.push({ method: 'setItem', key, value });
      if (hooks.beforeWrite) hooks.beforeWrite({ key, value, values, calls });
      values.set(key, value);
      if (hooks.afterWrite) hooks.afterWrite({ key, value, values, calls });
    },
    removeItem(key) {
      assert.ok(key.startsWith(PREFIX)); calls.push({ method: 'removeItem', key });
      if (hooks.beforeRemove) hooks.beforeRemove({ key, values, calls });
      values.delete(key);
      if (hooks.afterRemove) hooks.afterRemove({ key, values, calls });
    },
    clear() { throw new Error('forbidden clear'); },
  };
  return api;
}
function boundary(db, cp) {
  assert.equal(db.values.get(SENTINEL), SENTINEL_BYTES);
  assert.equal(db.values.has(OLD) ? db.values.get(OLD) : null, cp.legacyBaseRaw);
  assert.ok(db.calls.every(c => c.key === E.STORAGE_KEY || c.key === E.RECOVERY_KEY));
}
function saved(cp = fixture()) {
  const s = edit(open(cp)), b = submit(s, cp), db = store(cp);
  const out = E.writeDurableAttempt(db, b.session, b.attempt);
  assert.equal(out.status, 'committed', out.error);
  return { cp, s, b, db, out, journal: JSON.parse(out.journalRaw) };
}
function asPrepared(f, mutate = () => {}) {
  const j = clone(f.journal); j.phase = 'prepared'; mutate(j);
  const raw = JSON.stringify(j); f.db.values.set(E.RECOVERY_KEY, raw); f.db.values.set(E.STORAGE_KEY, j.candidateRaw);
  return raw;
}

test('E01 new wrappers are explicit/lazy in CJS and UMD; legacy and Quick remain version1', () => {
  assert.equal(typeof E.createPersonalPlanSession, 'function'); assert.equal(typeof E.beginPersonalPlanSave, 'function');
  const realm = vm.createContext({}); vm.runInContext(fs.readFileSync(require.resolve('./plan-item-session.js'), 'utf8'), realm);
  assert.equal(typeof realm.FlowPocPlanItemSession.createForWorkspace('checkpoint-v2').createPersonalPlanSession, 'function');
  assert.equal(E.RECOVERY_VERSION, 1); assert.equal(E.PERSONAL_PLAN_RECOVERY_VERSION, 2); assert.equal(E.PERSONAL_PLAN_DRAFT_CONTRACT, CONTRACT);
  assert.throws(() => require('./plan-item-session.js').createPersonalPlanSession({}), /personal-plan|checkpoint/i);
  assert.throws(() => E.createSession({ sessionId: 'foreign', scopeId: 'x', kind: 'plan', draftContract: CONTRACT, draft: {} }), /contract|personal-plan/i);
});

test('E02 genuine C/P context stays private while raw current/Undo/legacy and baseline are independently frozen', () => {
  const cp = fixture(), before = JSON.stringify(cp), s = open(cp);
  assert.equal(s.kind, 'plan'); assert.equal(s.scopeId, flow(cp).ref); assert.equal(s.draftContract, CONTRACT);
  assert.equal(s.sourceBoundary, 'not-bound'); assert.equal(Object.hasOwn(s.draft, 'draftContract'), false);
  assert.notEqual(s.draft, s.baseline); assert.ok(Object.isFrozen(s.draft.items)); assert.ok(Object.isFrozen(s.baseline));
  assert.equal(Object.hasOwn(s, 'context'), false); assert.equal(JSON.stringify(cp), before);
  assert.equal(E.beginPersonalPlanSave(clone(s), {}).ok, false);
  const bad = clone(cp); bad.undo.personalPlanContextV1 = { version: 999 };
  assert.throws(() => open(bad), /checkpoint|plan/i);
});

test('E03 invalid supported values stay dirty-invalid; unsafe shapes and getters preserve the previous session', () => {
  const s = open(), refs = Object.keys(s.draft.items);
  for (const change of [d => { d.title = { mode: 'override', value: '' }; }, d => { d.items[refs[0]].schedule = { mode: 'fixed_date', date: '' }; }]) {
    const next = edit(s, change); assert.equal(next.status, 'dirty-invalid'); assert.equal(next.valid, false);
    assert.equal(E.requestClose(next, { reason: 'cancel' }).effect, 'confirm');
  }
  for (const change of [d => { d.sectionTitles = {}; }, d => { d.items[refs[0]].schedule = { mode: 'unknown' }; }, d => { delete d.items[refs[0]]; }]) {
    const d = clone(s.draft); change(d); const r = E.updateDraft(s, d); assert.equal(r.ok, false); assert.equal(r.session, s);
  }
  let reads = 0; const getter = clone(s.draft); Object.defineProperty(getter, 'title', { enumerable: true, get() { reads++; return { mode: 'inherit' }; } });
  assert.equal(E.updateDraft(s, getter).ok, false); assert.equal(reads, 0);
});

test('E04 child full refs cannot be replaced by local id, source flow id or same-title sibling identity', () => {
  const s = open(), refs = Object.keys(s.draft.items);
  assert.throws(() => E.createChildSession(s, { sessionId: 'child-local', itemId: 'quote' }), /item|ref|child/i);
  const child = E.createChildSession(s, { sessionId: 'child', itemRef: refs[0] });
  assert.equal(child.scopeId, refs[0]); assert.equal(child.draftContract, CONTRACT); assert.equal(child.sourceBoundary, 'not-bound');
  assert.equal(child.draft.flowId, s.draft.flowId); assert.notEqual(child.draft.flowId, 'moving');
  const foreign = clone(child.draft); foreign.itemRef = refs[1]; assert.equal(E.updateDraft(child, foreign).ok, false);
  const wrong = clone(s.draft); wrong.flowRef = flow(fixture(), 'memo').ref; assert.equal(E.updateDraft(s, wrong).ok, false);
});

test('E05 child mode apply preserves exact strings, parent changes and other Item; discard is staged only', () => {
  const parent = edit(open()), refs = Object.keys(parent.draft.items), beforeOther = clone(parent.draft.items[refs[1]]);
  const child = E.createChildSession(parent, { sessionId: 'child-a', itemRef: refs[0], returnPoint: { selector: '#exact-item' } });
  const changed = edit(child, d => { d.title = { mode: 'override', value: '  Item\r\n제목  ' }; d.memo = { mode: 'override', value: '' }; d.schedule = { mode: 'unscheduled' }; });
  const applied = E.applyChild(parent, changed); assert.equal(applied.ok, true); assert.equal(applied.child, null);
  assert.deepEqual(applied.parent.draft.items[refs[0]], { itemRef: refs[0], title: changed.draft.title, memo: changed.draft.memo, schedule: changed.draft.schedule });
  assert.deepEqual(applied.parent.draft.items[refs[1]], beforeOther); assert.deepEqual(applied.parent.draft.title, parent.draft.title);
  assert.deepEqual(applied.parent.baseline, parent.baseline);
  const reopened = E.createChildSession(applied.parent, { sessionId: 'child-again', itemRef: refs[0] });
  assert.deepEqual(reopened.baseline.title, changed.draft.title);
  const pending = E.requestClose(edit(reopened, d => { d.memo = { mode: 'override', value: '다음 입력' }; }), { reason: 'escape' });
  assert.equal(E.discardChanges(pending.session).effect, 'close'); assert.deepEqual(applied.parent.draft.items[refs[0]].memo, { mode: 'override', value: '' });
});

test('E06 parent revision ABA and a different genuine root with the same string id cannot adopt a child', () => {
  const cp = fixture(), p = open(cp, 'moving', 'same-ms'), ref = Object.keys(p.draft.items)[0];
  const child = edit(E.createChildSession(p, { sessionId: 'child-aba', itemRef: ref }), d => { d.memo = { mode: 'override', value: '변경' }; });
  const changed = edit(p), back = edit(changed, d => { d.title = { mode: 'inherit' }; });
  assert.equal(back.status, 'clean'); assert.ok(back.revision > p.revision);
  assert.equal(E.applyChild(back, child).ok, false); assert.equal(E.applyChild(open(cp, 'moving', 'same-ms'), child).ok, false);
  assert.equal(E.beginSave(child, {}).ok, false); assert.equal(E.beginPersonalPlanSave(child, {}).ok, false);
});

test('E07 semantic no-op creates no attempt; same-date fixed pin stays an explicit staged intent', () => {
  const cp = fixture(), s = open(cp), baselineTitle = flow(cp).title;
  const same = edit(s, d => { d.title = { mode: 'override', value: baselineTitle }; });
  assert.equal(same.status, 'dirty-valid'); const no = E.beginPersonalPlanSave(same, { checkpoint: cp, expectedRaw: JSON.stringify(cp), attemptId: 'noop', now: NOW });
  assert.equal(no.changed, false); assert.equal(no.effect, 'unchanged'); assert.equal(no.session, same); assert.equal(no.attempt, undefined);
  // quote is deliberately undated in the inherited fixture; pin the dated peer.
  const dated = cp.state.tasks.find(t => Object.hasOwn(s.draft.items, t.ref) && typeof t.sourceDate === 'string');
  const ref = dated.ref, date = dated.sourceDate;
  const pin = edit(s, d => { d.items[ref].schedule = { mode: 'fixed_date', date }; });
  const b = submit(pin, cp); assert.equal(b.attempt.candidate.state.personalPlanContextV1.entries[s.scopeId].overlay.items[ref].schedule.mode, 'fixed_date');
});

test('E08 checkpoint-only durable protocol commits one candidate and one full Undo, without claiming source validation', () => {
  const f = saved(); assert.equal(f.b.sourceBoundary, 'not-bound'); assert.equal(f.b.attempt.sourceBoundary, 'not-bound'); assert.equal(f.out.sourceBoundary, 'not-bound');
  assert.equal(f.out.writeCount, 1); assert.equal(f.out.journalWriteCount, 2); assert.equal(f.journal.version, 2); assert.equal(f.journal.draftContract, CONTRACT);
  assert.equal(f.journal.kind, 'plan'); assert.equal(f.journal.scopeId, f.s.scopeId); assert.deepEqual(f.journal.baseline, f.s.baseline); assert.deepEqual(f.journal.draft, f.s.draft);
  assert.equal(Object.hasOwn(f.journal, 'context'), false); assert.equal(Object.hasOwn(f.journal, 'sourceReady'), false);
  const stored = JSON.parse(f.db.values.get(E.STORAGE_KEY)); assert.deepEqual(stored.undo, f.cp.state); assert.equal(stored.state.revision, f.cp.state.revision + 1);
  assert.deepEqual(stored.state.tasks, f.cp.state.tasks); assert.deepEqual(stored.state.flows, f.cp.state.flows);
  const finished = E.finishSave(f.b.session, f.b.attempt, f.out); assert.equal(finished.effect, 'close');
  assert.equal(E.finishSave(f.b.session, f.b.attempt, f.out).ok, false);
  const clean = E.clearConfirmedRecovery(f.db, { expectedJournalRaw: f.out.journalRaw }); assert.equal(clean.ok, true); assert.equal(clean.writeCount, 0);
  assert.equal(C.validateCheckpoint(stored).ok, true); const undo = C.undoCheckpoint(stored, NOW); assert.equal(undo.changed, true);
  assert.equal(Object.hasOwn(undo.checkpoint.state, P.METADATA_KEY), false); boundary(f.db, f.cp);
});

test('E09 legacy Plan and Quick continue using version1 journals on the fixed checkpoint pair', () => {
  for (const kind of ['plan', 'quick']) {
    const cp = fixture();
    const draft = kind === 'plan' ? { flowId: 'moving', title: flow(cp).title, items: flow(cp).steps.flatMap(x => x.itemIds).map(id => { const t = cp.state.tasks.find(t => t.id === id); return { id, title: t.title, memo: t.memo || '', planDate: t.planDate ?? t.sourceDate ?? t.date }; }) }
      : { mode: 'quick', id: 'legacy-q', flowId: null, title: 'quick', memo: '', date: null, folderId: null };
    const oldSession = E.createSession({ sessionId: 'legacy-'+kind, kind, scopeId: kind === 'plan' ? 'moving' : 'legacy-q', draft });
    const changed = E.updateDraft(oldSession, { ...draft, title: draft.title + ' 수정' }).session;
    const action = kind === 'plan' ? { type: 'commit-personal-plan', flowId: 'moving', title: changed.draft.title, items: changed.draft.items } : { type: 'add-quick', title: changed.draft.title, date: null, folderId: null, now: NOW };
    const candidate = C.transitionCheckpoint(cp, action); assert.equal(candidate.changed, true);
    const b = E.beginSave(changed, { candidate: candidate.checkpoint, expectedRaw: JSON.stringify(cp), attemptId: 'old-'+kind }); assert.equal(b.ok, true);
    const db = store(cp), out = E.writeDurableAttempt(db, b.session, b.attempt); assert.equal(out.status, 'committed');
    assert.equal(JSON.parse(out.journalRaw).version, 1); assert.equal(Object.hasOwn(JSON.parse(out.journalRaw), 'draftContract'), false); boundary(db, cp);
  }
});

test('E10 valid unrelated/different-Flow candidate substitutions do not prove the submitted Plan journal', () => {
  const f = saved(), other = C.inspectPersonalPlanContext(f.cp, flow(f.cp, 'memo').ref), otherDraft = clone(other.draft);
  otherDraft.title = { mode: 'override', value: '이웃 변경' };
  const foreign = C.transitionCheckpoint(f.cp, { type: 'commit-personal-plan-context', context: other.context, draft: otherDraft, now: NOW }); assert.equal(foreign.changed, true);
  const both = C.inspectPersonalPlanContext(f.b.attempt.candidate, flow(f.cp, 'memo').ref), bothDraft = clone(both.draft); bothDraft.title = otherDraft.title;
  const injected = C.transitionCheckpoint(f.b.attempt.candidate, { type: 'commit-personal-plan-context', context: both.context, draft: bothDraft, now: NOW }).checkpoint;
  for (const candidate of [foreign.checkpoint, injected]) {
    assert.equal(C.validateCheckpoint(candidate).ok, true);
    asPrepared(f, j => { j.candidateRaw = JSON.stringify(candidate); }); const calls = f.db.calls.length;
    assert.equal(E.loadRecovery(f.db).status, 'blocked'); assert.equal(f.db.calls.length, calls);
  }
});

test('E10b strict new journal rejects changed baseline, forged discriminator, extra keys and child/Quick kinds', () => {
  const f = saved();
  for (const change of [j => { j.baseline.title = { mode: 'override', value: '가짜 baseline' }; }, j => { j.draftContract = 'unknown'; }, j => { j.extra = true; }, j => { j.kind = 'item'; }, j => { j.kind = 'quick'; }, j => { j.scopeId = flow(f.cp,'memo').ref; }, j => { j.version = 1; }]) {
    asPrepared(f, change); assert.equal(E.loadRecovery(f.db).status, 'blocked');
  }
});

test('E11 prepared null-before legacy or seed recovers absence and reissues a genuine context without auto-saving', () => {
  for (const cp of [fixture(), C.fromLegacy(null).checkpoint]) {
    const s = edit(open(cp)), b = submit(s, cp, null), db = store(cp, null), out = E.writeDurableAttempt(db, b.session, b.attempt);
    assert.equal(out.status, 'committed', out.error); const raw = asPrepared({ journal: JSON.parse(out.journalRaw), db });
    const inspected = E.loadRecovery(db); assert.equal(inspected.status, 'prepared'); const recovered = E.recoverDurableAttempt(db, { expectedJournalRaw: raw });
    assert.equal(recovered.ok, true, recovered.error); assert.equal(db.values.has(E.STORAGE_KEY), false); assert.equal(db.values.has(E.RECOVERY_KEY), false);
    const calls = db.calls.length, resumed = E.resumeRecoveredSession(recovered, { sessionId: 'resumed-' + (++serial), storage: db });
    assert.equal(resumed.draftContract, CONTRACT); assert.equal(resumed.sourceBoundary, 'not-bound'); assert.deepEqual(resumed.draft, s.draft); assert.deepEqual(resumed.baseline, s.baseline); assert.equal(db.calls.length, calls);
    assert.equal(submit(resumed, cp, null).ok, true); assert.throws(() => E.resumeRecoveredSession(recovered, { sessionId: 'replay', storage: db })); boundary(db, cp);
  }
});

test('E12 initial target read failure and stale expectedRaw make no writes and preserve the draft', () => {
  for (const fault of ['read', 'drift']) {
    const cp = fixture(), b = submit(edit(open(cp)), cp), db = store(cp, JSON.stringify(cp), { read: ({key,value}) => { if (key===E.STORAGE_KEY && fault==='read') throw Error('read failed'); return key===E.STORAGE_KEY && fault==='drift' ? 'foreign' : value; } });
    const out = E.writeDurableAttempt(db,b.session,b.attempt); assert.equal(out.status,'preflight-failed'); assert.equal(db.calls.length,0);
    const done=E.finishSave(b.session,b.attempt,out); assert.equal(done.session.status,'recoverable-error'); assert.deepEqual(done.session.draft,b.session.draft);
    if (fault==='drift') assert.equal(E.retrySave(done.session,b.attempt.attemptId).ok,false);
  }
});

test('E12b target throw-before and throw-after preserve exact before bytes through the real durable protocol', () => {
  for (const after of [false,true]) {
    const cp=fixture(), before=JSON.stringify(cp), b=submit(edit(open(cp)),cp); let once=true;
    const hook=({key})=>{if(key===E.STORAGE_KEY&&once){once=false;throw Error('target fault')}};
    const db=store(cp,before,after?{afterWrite:hook}:{beforeWrite:hook}), out=E.writeDurableAttempt(db,b.session,b.attempt);
    assert.equal(out.status,'failed',out.error);assert.equal(db.values.get(E.STORAGE_KEY),before);assert.equal(db.values.has(E.RECOVERY_KEY),false);
    assert.equal(out.rollbackWriteCount,after?1:0);boundary(db,cp);
  }
});

test('E12c prepare throw-after is not success and explicit prepared recovery leaves before untouched', () => {
  const cp=fixture(), b=submit(edit(open(cp)),cp);let once=true;
  const db=store(cp,JSON.stringify(cp),{afterWrite:({key})=>{if(key===E.RECOVERY_KEY&&once){once=false;throw Error('prepare after')}}});
  const out=E.writeDurableAttempt(db,b.session,b.attempt);assert.equal(out.status,'recovery-required');assert.equal(out.writeCount,0);
  assert.equal(E.loadRecovery(db).status,'prepared');const rec=E.recoverDurableAttempt(db,{expectedJournalRaw:db.values.get(E.RECOVERY_KEY)});assert.equal(rec.ok,true);assert.equal(rec.writeCount,0);boundary(db,cp);
});

test('E13 foreign target or journal is never overwritten by prepared recovery', () => {
  for(const where of ['target','journal']){const f=saved(),raw=asPrepared(f);f.db.values.set(where==='target'?E.STORAGE_KEY:E.RECOVERY_KEY,'foreign bytes');const before=new Map(f.db.values),count=f.db.calls.length;
    assert.equal(E.recoverDurableAttempt(f.db,{expectedJournalRaw:raw}).ok,false);assert.deepEqual(f.db.values,before);assert.equal(f.db.calls.length,count);}
});

test('E14 confirmed throw-after and cleanup failure never rollback the committed candidate', () => {
  const cp=fixture(),b=submit(edit(open(cp)),cp);let confirmOnce=true,removeOnce=true;
  const db=store(cp,JSON.stringify(cp),{afterWrite:({key,value})=>{if(key===E.RECOVERY_KEY&&JSON.parse(value).phase==='confirmed'&&confirmOnce){confirmOnce=false;throw Error('confirmed after')}},beforeRemove:()=>{if(removeOnce){removeOnce=false;throw Error('cleanup')}}});
  const out=E.writeDurableAttempt(db,b.session,b.attempt);assert.equal(out.status,'committed');assert.equal(E.loadRecovery(db).status,'confirmed');
  assert.equal(E.recoverDurableAttempt(db,{expectedJournalRaw:out.journalRaw}).ok,false);
  assert.equal(E.clearConfirmedRecovery(db,{expectedJournalRaw:out.journalRaw}).ok,false);assert.equal(db.values.get(E.STORAGE_KEY),b.attempt.serialized);
  const cleanup=E.clearConfirmedRecovery(db,{expectedJournalRaw:out.journalRaw});assert.equal(cleanup.ok,true);assert.equal(cleanup.writeCount,0);
  const count=db.calls.length;assert.equal(E.clearConfirmedRecovery(db,{expectedJournalRaw:out.journalRaw}).ok,true);assert.equal(db.calls.length,count);boundary(db,cp);
});

test('E15 retry keeps the same candidate but input change, clone outcome and repeated submission cannot replay it', () => {
  const cp=fixture(),b=submit(edit(open(cp)),cp);let once=true;const db=store(cp,JSON.stringify(cp),{beforeWrite:({key})=>{if(key===E.STORAGE_KEY&&once){once=false;throw Error('quota')}}});
  const failed=E.writeDurableAttempt(db,b.session,b.attempt),finished=E.finishSave(b.session,b.attempt,failed);assert.equal(finished.session.status,'recoverable-error');
  const retry=E.retrySave(finished.session,b.attempt.attemptId);assert.equal(retry.ok,true);assert.equal(retry.attempt,b.attempt);
  const out=E.writeDurableAttempt(db,retry.session,retry.attempt);assert.equal(out.status,'committed');assert.equal(E.finishSave(retry.session,retry.attempt,clone(out)).ok,false);
  assert.equal(E.finishSave(retry.session,retry.attempt,out).effect,'close');const count=db.calls.length;
  assert.equal(E.writeDurableAttempt(db,retry.session,retry.attempt).status,'preflight-failed');assert.equal(db.calls.length,count);
  const changed=edit(finished.session,d=>{d.title={mode:'override',value:'다른 입력'}});assert.equal(E.retrySave(changed,b.attempt.attemptId).ok,false);assert.equal(E.finishSave(changed,b.attempt,failed).ok,false);boundary(db,cp);
});

test('E15b a drifted checkpoint including only Undo cannot be attached to a captured Plan context', () => {
  const cp=fixture(),s=edit(open(cp)),drift=clone(cp);drift.undo=null;assert.equal(C.validateCheckpoint(drift).ok,true);
  assert.equal(E.beginPersonalPlanSave(s,{checkpoint:drift,expectedRaw:JSON.stringify(drift),attemptId:'drift',now:NOW}).ok,false);
  assert.equal(E.beginSave(s,{candidate:cp,expectedRaw:JSON.stringify(cp),attemptId:'bypass'}).ok,false);
});

test('E02b actual UMD lazy dependencies support checkpoint-bound editing without DOM, storage or source reads', () => {
  const T = require('./timeline-context.js'), sandbox = { FlowMeIntegratedPoc: M, FlowPocTimelineContext: T };
  let reads = 0;
  for (const key of ['localStorage', 'document', 'window']) Object.defineProperty(sandbox, key, { get() { reads++; throw Error(key); } });
  const realm = vm.createContext(sandbox);
  for (const file of ['workspace-checkpoint.js', 'personal-plan-context.js', 'plan-item-session.js']) vm.runInContext(fs.readFileSync(require.resolve('./' + file), 'utf8'), realm);
  const api = realm.FlowPocPlanItemSession.createForWorkspace('checkpoint-v2'), cp = fixture();
  const s = api.createPersonalPlanSession({ checkpoint: cp, sessionId: 'umd', flowRef: flow(cp).ref });
  const d = clone(s.draft); d.title = { mode: 'override', value: '다른 realm 입력' };
  const edited = api.updateDraft(s, d); assert.equal(edited.ok, true);
  const b = api.beginPersonalPlanSave(edited.session, { checkpoint: cp, expectedRaw: JSON.stringify(cp), attemptId: 'umd-save', now: NOW });
  assert.equal(b.ok, true, b.error); assert.equal(b.sourceBoundary, 'not-bound'); assert.equal(reads, 0);
  const db = store(cp), out = api.writeDurableAttempt(db, b.session, b.attempt); assert.equal(out.status, 'committed', out.error); boundary(db, cp);
});

test('E03b rejected prototype, symbol, sparse array or non-JSON fields never execute hooks or mutate the baseline', () => {
  const cp = fixture(), before = JSON.stringify(cp), s = open(cp); let calls = 0;
  for (const make of [
    d => { const proto = Object.create(Object.prototype); proto.toJSON = () => { calls++; return {}; }; Object.setPrototypeOf(d.title, proto); },
    d => { d[Symbol('unknown')] = true; }, d => { Object.defineProperty(d, 'hidden', { value: 1 }); },
    d => { d.title.value = undefined; }, d => { d.items = []; d.items.length = 3; },
    d => { d.title = { mode: 'override', value: NaN }; },
  ]) { const d = clone(s.draft); make(d); const r = E.updateDraft(s, d); assert.equal(r.ok, false); assert.equal(r.session, s); }
  assert.equal(calls, 0); assert.equal(JSON.stringify(cp), before);
  const external = vm.runInNewContext('JSON.parse(' + JSON.stringify(before) + ')');
  assert.equal(open(external).status, 'clean');
});

test('E04b identical Item titles in independent saved copies stay exact-ref owned in both candidate and recovery', () => {
  let cp = fixture();
  const source = '# 동일 Flow\n## 단계\n- [ ] 같은 제목\n- [ ] 같은 제목';
  for (const suffix of ['a', 'b']) {
    const handoff = M.makeHandoff(source, { draftId: 'e2-copy-' + suffix, handoffId: 'e2-handoff-' + suffix, sourceConfirmed: true, folderId: null });
    const result = C.transitionCheckpoint(cp, { type: 'commit-authoring', handoff, now: NOW }); assert.equal(result.changed, true); cp = result.checkpoint;
  }
  const copies = cp.state.flows.filter(f => f.handoffId && f.handoffId.startsWith('e2-handoff-'));
  const session = E.createPersonalPlanSession({ checkpoint: cp, sessionId: 'copy-a', flowRef: copies[0].ref });
  const refs = Object.keys(session.draft.items), next = edit(session, d => { d.items[refs[1]].title = { mode: 'override', value: 'A 둘째만 변경' }; });
  const b = submit(next, cp), db = store(cp), out = E.writeDurableAttempt(db, b.session, b.attempt); assert.equal(out.status, 'committed');
  const state = P.projectPersonalPlanState(b.attempt.candidate.state).state;
  assert.equal(state.tasks.find(t => t.ref === refs[0]).title, '같은 제목'); assert.equal(state.tasks.find(t => t.ref === refs[1]).title, 'A 둘째만 변경');
  assert.deepEqual(state.tasks.filter(t => t.flowId === copies[1].id), cp.state.tasks.filter(t => t.flowId === copies[1].id));
  const j = JSON.parse(out.journalRaw); j.scopeId = copies[1].ref; db.values.set(E.RECOVERY_KEY, JSON.stringify(j));
  const count = db.calls.length; assert.equal(E.loadRecovery(db).status, 'blocked'); assert.equal(db.calls.length, count); boundary(db, cp);
});

test('E05b child cancel and parent dirty close never change snapshots, and pending/submitting owners stay locked', () => {
  const cp = fixture(), parent = edit(open(cp)), ref = Object.keys(parent.draft.items)[0];
  const child = edit(E.createChildSession(parent, { sessionId: 'close-child', itemRef: ref }), d => { d.memo = { mode: 'override', value: '아직 반영 안 함' }; });
  for (const reason of E.CLOSE_REASONS) {
    const pending = E.requestClose(child, { reason, editingPoint: { selectionStart: 3 } }); assert.equal(pending.effect, 'confirm');
    assert.equal(E.applyChild(parent, pending.session).ok, false);
    const continued = E.continueEditing(pending.session); assert.deepEqual(continued.session.draft, child.draft);
    assert.equal(E.discardChanges(pending.session).session, null);
  }
  const rootClose = E.requestClose(parent, { reason: 'browser-back' }); assert.equal(rootClose.rearmHistory, true); assert.equal(E.discardChanges(rootClose.session).session, null);
  const b = submit(parent, cp); assert.equal(E.requestClose(b.session, { reason: 'browser-back' }).effect, 'blocked');
  assert.throws(() => E.createChildSession(b.session, { sessionId: 'locked', itemRef: ref }));
  assert.equal(E.updateDraft(b.session, parent.draft).ok, false); assert.equal(Object.hasOwn(cp.state, P.METADATA_KEY), false);
});

test('E12d wrong transient target readback restores only owned bytes; foreign target remains locked', () => {
  for (const mode of ['transient', 'foreign']) {
    const cp = fixture(), before = JSON.stringify(cp), b = submit(edit(open(cp)), cp); let once = true;
    const db = store(cp, before, { read: ({ key, value, values }) => {
      if (key === E.STORAGE_KEY && value === b.attempt.serialized && once) { once = false; if (mode === 'foreign') values.set(key, 'foreign target'); return 'wrong readback'; }
      return value;
    } });
    const out = E.writeDurableAttempt(db, b.session, b.attempt);
    if (mode === 'transient') { assert.equal(out.status, 'failed'); assert.equal(out.rollbackWriteCount, 1); assert.equal(db.values.get(E.STORAGE_KEY), before); }
    else { assert.equal(out.status, 'recovery-required'); assert.equal(out.rollbackWriteCount, 0); assert.equal(db.values.get(E.STORAGE_KEY), 'foreign target'); }
    boundary(db, cp);
  }
});

test('E12e failed null-before rollback keeps prepared evidence; recovery later restores absence and preserves draft', () => {
  const cp = fixture(), b = submit(edit(open(cp)), cp, null); let fault = true;
  const db = store(cp, null, { afterWrite: ({ key }) => { if (key === E.STORAGE_KEY && fault) throw Error('after target'); },
    beforeRemove: ({ key }) => { if (key === E.STORAGE_KEY && fault) throw Error('blocked rollback'); } });
  const out = E.writeDurableAttempt(db, b.session, b.attempt); assert.equal(out.status, 'recovery-required'); assert.equal(out.rollbackWriteCount, 1);
  assert.equal(db.values.get(E.STORAGE_KEY), b.attempt.serialized); assert.equal(E.loadRecovery(db).status, 'prepared');
  fault = false; const recovered = E.recoverDurableAttempt(db, { expectedJournalRaw: out.journalRaw }); assert.equal(recovered.ok, true);
  assert.equal(db.values.has(E.STORAGE_KEY), false); const resumed = E.resumeRecoveredSession(recovered, { storage: db, sessionId: 'null-rollback-resume' });
  assert.deepEqual(resumed.draft, b.session.draft); boundary(db, cp);
});

test('E13b unreadable startup remains read-only; recovery cannot resume after checkpoint or legacy base drift', () => {
  const f = saved(), raw = asPrepared(f); let unreadable = true;
  const db = store(f.cp, f.b.attempt.serialized, { read: ({ key, value }) => { if (unreadable && key === E.STORAGE_KEY) throw Error('read'); return value; } });
  db.values.set(E.RECOVERY_KEY, raw); assert.equal(E.loadRecovery(db).status, 'blocked'); assert.equal(db.calls.length, 0);
  unreadable = false; const recovered = E.recoverDurableAttempt(db, { expectedJournalRaw: raw }); assert.equal(recovered.ok, true);
  db.values.set(OLD, f.cp.legacyBaseRaw + ' '); assert.throws(() => E.resumeRecoveredSession(recovered, { storage: db, sessionId: 'drift-base' }));
  db.values.set(OLD, f.cp.legacyBaseRaw); db.values.set(E.STORAGE_KEY, 'other checkpoint');
  assert.throws(() => E.resumeRecoveredSession(recovered, { storage: db, sessionId: 'drift-current' }));
  db.values.set(E.STORAGE_KEY, JSON.stringify(f.cp)); assert.equal(E.resumeRecoveredSession(recovered, { storage: db, sessionId: 'exact-again' }).sourceBoundary, 'not-bound'); boundary(db, f.cp);
});

test('E14b confirmation unavailable after exact write is never auto-rolled back; reload distinguishes confirmed from prepared', () => {
  for (const mode of ['throw-before', 'read-after']) {
    const cp = fixture(), b = submit(edit(open(cp)), cp); let blind = false;
    const db = store(cp, JSON.stringify(cp), { beforeWrite: ({ key, value }) => { if (key === E.RECOVERY_KEY && JSON.parse(value).phase === 'confirmed' && mode === 'throw-before') throw Error('before confirm'); },
      afterWrite: ({ key, value }) => { if (key === E.RECOVERY_KEY && JSON.parse(value).phase === 'confirmed' && mode === 'read-after') blind = true; },
      read: ({ key, value }) => { if (blind && key === E.RECOVERY_KEY) throw Error('confirm unreadable'); return value; } });
    const out = E.writeDurableAttempt(db, b.session, b.attempt); assert.equal(out.status, 'recovery-required'); assert.equal(out.rollbackWriteCount, 0);
    assert.equal(db.values.get(E.STORAGE_KEY), b.attempt.serialized); blind = false;
    assert.equal(E.loadRecovery(db).status, mode === 'throw-before' ? 'prepared' : 'confirmed'); boundary(db, cp);
  }
});

test('E14c legacy base drift gates each write boundary without claiming source-candidate freshness', () => {
  for (const phase of ['prepare', 'target', 'confirm']) {
    const cp = fixture(), b = submit(edit(open(cp)), cp); let armed = phase === 'prepare';
    const db = store(cp, JSON.stringify(cp), { afterWrite: ({ key, value }) => {
      if (phase === 'target' && key === E.RECOVERY_KEY && JSON.parse(value).phase === 'prepared') armed = true;
      if (phase === 'confirm' && key === E.STORAGE_KEY) armed = true;
    }, read: ({ key, value, values }) => {
      if (key === OLD && armed) { values.set(OLD, cp.legacyBaseRaw + ' '); return cp.legacyBaseRaw + ' '; } return value;
    } });
    const out = E.writeDurableAttempt(db, b.session, b.attempt); assert.equal(out.status, 'recovery-required'); assert.equal(out.sourceBoundary, 'not-bound');
    assert.equal(out.writeCount, phase === 'confirm' ? 1 : 0); assert.equal(out.rollbackWriteCount, 0);
    assert.ok(db.calls.every(c => c.key === E.STORAGE_KEY || c.key === E.RECOVERY_KEY)); assert.equal(db.values.get(SENTINEL), SENTINEL_BYTES);
  }
});
