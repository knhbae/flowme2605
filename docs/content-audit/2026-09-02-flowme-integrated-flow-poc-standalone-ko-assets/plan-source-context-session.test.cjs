'use strict';
// E16–18/v3: generated fixtures, memory storage only. Never print source snapshots.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { M, C, NOW, clone, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const P = require('./personal-plan-context.js');
const E = require('./plan-item-session.js').createForWorkspace('checkpoint-v2');
const SOURCE = M.SOURCE_CANDIDATE_STORAGE_KEY, OLD = M.STORAGE_KEY;
let serial = 0;
const audits = [];
function fixture(empty = false) {
  if (empty) { const cp = C.fromLegacy(null).checkpoint; return { cp, flow: cp.state.flows[0], sourceRaw: null }; }
  const f = sourceUpdateFixture(); f.task.title = f.task.sourceTitle;
  const raw = JSON.stringify({ version: 1, state: f.state, undo: null });
  const projected = C.fromLegacy(raw); assert.equal(projected.ok, true, projected.reason);
  return { ...f, cp: projected.checkpoint, sourceRaw: JSON.stringify(f.store) };
}
function storage(f, hooks = {}, absent = false) {
  const map = new Map([['flow:operating:v3-sentinel', ' \r\n유지 🙂\t ']]), calls = [], reads = [];
  if (!absent) map.set(E.STORAGE_KEY, JSON.stringify(f.cp));
  if (f.cp.legacyBaseRaw !== null) map.set(OLD, f.cp.legacyBaseRaw);
  if (f.sourceRaw !== null) map.set(SOURCE, f.sourceRaw);
  const audit = { map, calls, reads, forbidden: 0 }; audits.push(audit);
  return { map, calls, reads,
    getItem(key) { reads.push(key); const value = map.has(key) ? map.get(key) : null; return hooks.read ? hooks.read({ key, value, map, calls, reads }) : value; },
    setItem(key, value) { if(![E.STORAGE_KEY,E.RECOVERY_KEY].includes(key))audit.forbidden++;assert.ok([E.STORAGE_KEY, E.RECOVERY_KEY].includes(key), 'no source/operating writes'); calls.push({ method:'setItem', key }); if(hooks.beforeWrite)hooks.beforeWrite({key,value,map});map.set(key,value);if(hooks.afterWrite)hooks.afterWrite({key,value,map}); },
    removeItem(key) { if(![E.STORAGE_KEY,E.RECOVERY_KEY].includes(key))audit.forbidden++;assert.ok([E.STORAGE_KEY, E.RECOVERY_KEY].includes(key), 'no source/operating removes'); calls.push({ method:'removeItem',key });if(hooks.beforeRemove)hooks.beforeRemove({key,map});map.delete(key); },
    clear() { audit.forbidden++;throw Error('forbidden clear'); },
  };
}
function setup(options = {}) {
  const f = options.f || fixture(options.empty), clock = { epoch: 4 }, readSourceEpoch = () => clock.epoch;
  const db = storage(f, options.hooks, options.absent);
  const session = E.createSourceBoundPersonalPlanSession(db, { checkpoint:f.cp, flowRef:f.flow.ref, sessionId:'s-'+(++serial), readSourceEpoch });
  return { f, db, clock, readSourceEpoch, session, absent:options.absent };
}
function edit(s, change = d => { d.title = { mode:'override',value:'원문 제목' }; }) {
  const draft = clone(s.draft);change(draft);const r=E.updateDraft(s,draft);assert.equal(r.ok,true,r.error);return r.session;
}
function begin(x, s = edit(x.session)) {
  return E.beginSourceBoundPersonalPlanSave(x.db,s,{checkpoint:x.f.cp,expectedRaw:x.absent?null:JSON.stringify(x.f.cp),attemptId:'a-'+(++serial),now:NOW,readSourceEpoch:x.readSourceEpoch});
}
function save(x, s) { const b=begin(x,s);assert.equal(b.ok,true,b.error||b.reason);const out=E.writeDurableAttempt(x.db,b.session,b.attempt,{readSourceEpoch:x.readSourceEpoch});return {b,out}; }
function boundary(x, expectedSource = x.f.sourceRaw) {
  assert.equal(x.db.map.get('flow:operating:v3-sentinel'),' \r\n유지 🙂\t ');
  assert.equal((x.db.map.get(OLD)??null)===x.f.cp.legacyBaseRaw,true,'legacy bytes unchanged');
  assert.equal((x.db.map.get(SOURCE)??null)===expectedSource,true,'source bytes unchanged');
  assert.ok(x.db.calls.every(c=>[E.STORAGE_KEY,E.RECOVERY_KEY].includes(c.key)));
}
function prepared(x, saved) {const journal=JSON.parse(saved.out.journalRaw);journal.phase='prepared';const raw=JSON.stringify(journal);x.db.map.set(E.RECOVERY_KEY,raw);return raw;}

test('V01 explicit actual-storage wrappers reject caller authority packets and non-numeric epoch',()=>{
  assert.equal(typeof E.createSourceBoundPersonalPlanSession,'function');assert.equal(typeof E.beginSourceBoundPersonalPlanSave,'function');
  const f=fixture(),db=storage(f);
  for(const readSourceEpoch of [undefined,()=>true,()=>-1,()=>1.2,()=>Number.MAX_SAFE_INTEGER+1,()=>{throw Error('counter')}])
    assert.throws(()=>E.createSourceBoundPersonalPlanSession(db,{checkpoint:f.cp,flowRef:f.flow.ref,sessionId:'bad',readSourceEpoch}));
  assert.throws(()=>E.createSourceBoundPersonalPlanSession(db,{checkpoint:f.cp,flowRef:f.flow.ref,sessionId:'packet-bypass',readSourceEpoch:()=>0,sourceRead:{ok:true,raw:null},sourceEpoch:0}));
  assert.equal(db.calls.length,0);
});

for(const target of ['flow','item']) test(`V02-${target} source A→B then explicit A commits intent, explicit B creates no attempt`,()=>{
  const x=setup(),a=target==='flow'?'원문 제목':'접수',bTitle=target==='flow'?'새 원문 제목':'새 접수';
  const field=(d,value)=>{if(target==='flow')d.title={mode:'override',value};else d.items[x.f.task.ref].title={mode:'override',value};};
  const no=begin(x,edit(x.session,d=>field(d,bTitle)));assert.equal(no.ok,true);assert.equal(no.changed,false);assert.equal(no.attempt,undefined);assert.equal(x.db.calls.length,0);
  const result=save(x,edit(x.session,d=>field(d,a)));assert.equal(result.out.status,'committed',result.out.error);
  const cp=JSON.parse(x.db.map.get(E.STORAGE_KEY)),view=P.readPersonalPlanSourceContext({rawState:cp.state,legacyBaseRaw:cp.legacyBaseRaw,undo:cp.undo,sourceRead:{ok:true,raw:x.f.sourceRaw},sourceEpoch:4});assert.equal(view.ok,true,view.reason);
  assert.equal(target==='flow'?view.state.flows.find(f=>f.ref===x.f.flow.ref).title:view.state.tasks.find(t=>t.ref===x.f.task.ref).title,a);
  assert.deepEqual(cp.undo,x.f.cp.state);assert.equal(cp.state.revision,x.f.cp.state.revision+1);assert.equal(result.out.writeCount,1);assert.equal(result.out.journalWriteCount,2);boundary(x);
});

test('V03 local draft validation has no reads; child creation/apply and generic bypasses require source freshness',()=>{
  const x=setup(),before=x.db.reads.length,parent=edit(x.session);assert.equal(x.db.reads.length,before);
  const opts={checkpoint:x.f.cp,readSourceEpoch:x.readSourceEpoch,itemRef:x.f.task.ref,sessionId:'child'};
  assert.throws(()=>E.createChildSession(parent,opts));
  const child=E.createSourceBoundPersonalPlanChild(x.db,parent,opts);const changed=edit(child,d=>{d.memo={mode:'override',value:''};});
  assert.equal(E.applyChild(parent,changed).ok,false);assert.equal(E.beginPersonalPlanSave(parent,{}).ok,false);assert.equal(E.beginSave(parent,{}).ok,false);
  const applied=E.applySourceBoundPersonalPlanChild(x.db,parent,changed,opts);assert.equal(applied.ok,true,applied.error);assert.equal(applied.parent.draft.items[x.f.task.ref].memo.value,'');assert.equal(x.db.calls.length,0);
  const next=E.createSourceBoundPersonalPlanChild(x.db,applied.parent,{...opts,sessionId:'later'});x.db.map.set(SOURCE,x.f.sourceRaw+' ');
  const blocked=E.applySourceBoundPersonalPlanChild(x.db,applied.parent,edit(next),opts);assert.equal(blocked.ok,false);assert.equal(x.db.calls.length,0);
});

test('V04 observed source A→B→A invalidates a binding even when the caller counter failed to advance',()=>{
  const x=setup(),s=edit(x.session);x.db.map.set(SOURCE,x.f.sourceRaw+' ');
  assert.equal(E.checkSourceBoundPersonalPlanSession(x.db,s,{checkpoint:x.f.cp,readSourceEpoch:x.readSourceEpoch}).ok,false);
  x.db.map.set(SOURCE,x.f.sourceRaw);assert.equal(begin(x,s).ok,false);assert.equal(x.db.calls.length,0);boundary(x);
});

test('V05 observed epoch ABA and epoch changes during direct source read are never accepted as fresh',()=>{
  const x=setup();x.clock.epoch++;assert.equal(begin(x).ok,false);x.clock.epoch--;assert.equal(begin(x).ok,false);assert.equal(x.db.calls.length,0);
  let epoch=0;const f=fixture(),db=storage(f,{read:({key,value})=>{if(key===SOURCE)epoch++;return value;}});
  assert.throws(()=>E.createSourceBoundPersonalPlanSession(db,{checkpoint:f.cp,flowRef:f.flow.ref,sessionId:'unstable',readSourceEpoch:()=>epoch}));assert.equal(db.calls.length,0);
});

test('V06 source read failure at open/begin is not absence and never writes',()=>{
  const f=fixture(),db=storage(f,{read:({key,value})=>{if(key===SOURCE)throw Error('read');return value;}});
  assert.throws(()=>E.createSourceBoundPersonalPlanSession(db,{checkpoint:f.cp,flowRef:f.flow.ref,sessionId:'failed',readSourceEpoch:()=>0}));assert.equal(db.calls.length,0);
  let fail=false;const x=setup({hooks:{read:({key,value})=>{if(fail&&key===SOURCE)throw Error('read');return value;}}});fail=true;assert.equal(begin(x).ok,false);assert.equal(x.db.calls.length,0);
});

for(const phase of ['prepare','target','confirm']) test(`V07-${phase} actual source drift at durable boundary stops subsequent writes without source rollback`,()=>{
  let x;const hooks={afterWrite:({key,value,map})=>{
    if(phase==='target'&&key===E.RECOVERY_KEY&&JSON.parse(value).phase==='prepared')map.set(SOURCE,x.f.sourceRaw+' ');
    if(phase==='confirm'&&key===E.STORAGE_KEY)map.set(SOURCE,x.f.sourceRaw+' ');
  }};x=setup({hooks});const b=begin(x);assert.equal(b.ok,true);if(phase==='prepare')x.db.map.set(SOURCE,x.f.sourceRaw+' ');
  const out=E.writeDurableAttempt(x.db,b.session,b.attempt,{readSourceEpoch:x.readSourceEpoch});assert.notEqual(out.status,'committed');assert.equal(out.writeCount,phase==='confirm'?1:0);assert.equal(out.rollbackWriteCount,0);boundary(x,x.f.sourceRaw+' ');
});

test('V08 retry re-reads actual source and generic retry cannot turn stale or failed observation into permission',()=>{
  let once=true;const x=setup({hooks:{beforeWrite:({key})=>{if(key===E.STORAGE_KEY&&once){once=false;throw Error('quota');}}}}),s=save(x);
  assert.equal(s.out.status,'failed');const finished=E.finishSave(s.b.session,s.b.attempt,s.out);assert.equal(E.retrySave(finished.session,s.b.attempt.attemptId).ok,false);
  const retry=E.retrySourceBoundPersonalPlanSave(x.db,finished.session,{checkpoint:x.f.cp,readSourceEpoch:x.readSourceEpoch,attemptId:s.b.attempt.attemptId});assert.equal(retry.ok,true);assert.equal(retry.attempt,s.b.attempt);
  x.clock.epoch++;const out=E.writeDurableAttempt(x.db,retry.session,retry.attempt,{readSourceEpoch:x.readSourceEpoch});assert.notEqual(out.status,'committed');assert.equal(out.writeCount,0);boundary(x);
});

test('V09 v3 record contains exact transient snapshot and source-aware derivation; downgrade/unknown fields block',()=>{
  const x=setup(),s=save(x);assert.equal(s.out.status,'committed');const j=JSON.parse(s.out.journalRaw);assert.equal(j.version,3);assert.equal(j.sourceReadSnapshot.version,1);assert.equal(j.sourceReadSnapshot.raw===x.f.sourceRaw,true);
  assert.equal(j.draftContract,'flowme-standalone-source-bound-personal-plan-draft-v1');assert.equal(Object.hasOwn(j,'sourceContext'),false);
  for(const mutate of [v=>{v.version=2;},v=>{v.sourceReadSnapshot.version=9;},v=>{v.sourceReadSnapshot.extra=true;},v=>{delete v.sourceReadSnapshot;},v=>{v.draftContract='unknown';},v=>{v.kind='quick';},v=>{v.sourceReadSnapshot.raw=null;}]){
    const bad=clone(j);mutate(bad);x.db.map.set(E.RECOVERY_KEY,JSON.stringify(bad));const count=x.db.calls.length;assert.equal(E.loadRecovery(x.db).status,'blocked');assert.equal(x.db.calls.length,count);
  }boundary(x);
});

test('V10 valid unrelated C candidate and modified baseline fail v3 derivation even when the target equals it',()=>{
  const x=setup(),s=save(x),j=JSON.parse(s.out.journalRaw),other=C.inspectPersonalPlanContext(x.f.cp,x.f.cp.state.flows[0].ref),draft=clone(other.draft);draft.title={mode:'override',value:'다른 Flow'};
  const result=C.transitionCheckpoint(x.f.cp,{type:'commit-personal-plan-context',context:other.context,draft,now:NOW});assert.equal(result.changed,true);
  const bad=clone(j);bad.candidateRaw=JSON.stringify(result.checkpoint);x.db.map.set(E.STORAGE_KEY,bad.candidateRaw);x.db.map.set(E.RECOVERY_KEY,JSON.stringify(bad));assert.equal(E.loadRecovery(x.db).status,'blocked');
  j.baseline.title={mode:'override',value:'다른 기본값'};x.db.map.set(E.STORAGE_KEY,j.candidateRaw);x.db.map.set(E.RECOVERY_KEY,JSON.stringify(j));assert.equal(E.loadRecovery(x.db).status,'blocked');boundary(x);
});

test('V11 prepared restore uses historical source evidence but changed current source keeps draft read-only',()=>{
  const x=setup(),s=save(x),raw=prepared(x,s),changed=x.f.sourceRaw+' ';x.db.map.set(SOURCE,changed);
  const count=x.db.calls.length;assert.equal(E.loadRecovery(x.db).status,'prepared');assert.equal(x.db.calls.length,count);
  const recovery=E.recoverDurableAttempt(x.db,{expectedJournalRaw:raw});assert.equal(recovery.ok,true,recovery.error);assert.equal(recovery.requiresSourceReopen,true);assert.equal(recovery.review.viewOnly,true);assert.deepEqual(recovery.review.draft,s.b.session.draft);
  assert.throws(()=>E.resumeRecoveredSession(recovery,{sessionId:'raw-bypass',storage:x.db}));const after=x.db.calls.length;
  const reopened=E.resumeRecoveredSourceBoundPersonalPlanSession(x.db,recovery,{sessionId:'changed-source',readSourceEpoch:x.readSourceEpoch});assert.equal(reopened.ok,false);assert.equal(reopened.requiresSourceReopen,true);assert.deepEqual(reopened.review,recovery.review);assert.equal(x.db.calls.length,after);boundary(x,changed);
});

test('V12 same current source explicitly reopens a recovered draft with new context and one-use token, without autosave',()=>{
  const x=setup(),s=save(x),raw=prepared(x,s),recovery=E.recoverDurableAttempt(x.db,{expectedJournalRaw:raw});assert.equal(recovery.ok,true);
  x.clock.epoch=9;const count=x.db.calls.length,reopened=E.resumeRecoveredSourceBoundPersonalPlanSession(x.db,recovery,{sessionId:'fresh-reopen',readSourceEpoch:x.readSourceEpoch});
  assert.equal(reopened.ok,true,reopened.reason);assert.equal(reopened.requiresSourceReopen,false);assert.deepEqual(reopened.session.draft,s.b.session.draft);assert.equal(x.db.calls.length,count);
  assert.equal(E.resumeRecoveredSourceBoundPersonalPlanSession(x.db,recovery,{sessionId:'replay',readSourceEpoch:x.readSourceEpoch}).ok,false);
  const b=begin(x,reopened.session);assert.equal(b.ok,true,b.error);boundary(x);
});

test('V13 null-before seed with confirmed source absence retains null snapshot and restores only target absence',()=>{
  const x=setup({empty:true,absent:true}),s=save(x,edit(x.session,d=>{d.title={mode:'override',value:'seed 개인 변경'};}));assert.equal(s.out.status,'committed',s.out.error);
  assert.equal(JSON.parse(s.out.journalRaw).sourceReadSnapshot.raw,null);const raw=prepared(x,s),r=E.recoverDurableAttempt(x.db,{expectedJournalRaw:raw});assert.equal(r.ok,true);assert.equal(x.db.map.has(E.STORAGE_KEY),false);
  const reopened=E.resumeRecoveredSourceBoundPersonalPlanSession(x.db,r,{sessionId:'seed-reopen',readSourceEpoch:x.readSourceEpoch});assert.equal(reopened.ok,true,reopened.reason);boundary(x);
});

test('V14 confirmed cleanup is historical-only and source drift/read-error never causes target rollback',()=>{
  let unreadable=false;const x=setup({hooks:{read:({key,value})=>{if(unreadable&&key===SOURCE)throw Error('current source unreadable');return value;}}}),s=save(x);assert.equal(s.out.status,'committed');
  unreadable=true;const count=x.db.calls.length;assert.equal(E.loadRecovery(x.db).status,'confirmed');assert.equal(x.db.calls.length,count);
  const cleaned=E.clearConfirmedRecovery(x.db,{expectedJournalRaw:s.out.journalRaw});assert.equal(cleaned.ok,true,cleaned.error);assert.equal(cleaned.writeCount,0);assert.equal(cleaned.requiresSourceReopen,true);assert.equal(x.db.map.get(E.STORAGE_KEY)===s.b.attempt.serialized,true);boundary(x);
});

test('V15 source drift after confirmed stays committed but requires a new source open before normal close',()=>{
  let x;x=setup({hooks:{afterWrite:({key,value,map})=>{if(key===E.RECOVERY_KEY&&JSON.parse(value).phase==='confirmed')map.set(SOURCE,x.f.sourceRaw+' ');}}});const s=save(x);
  assert.equal(s.out.status,'committed');assert.equal(s.out.canResume,false);assert.equal(s.out.requiresSourceReopen,true);assert.equal(s.out.rollbackWriteCount,0);
  assert.equal(E.finishSave(s.b.session,s.b.attempt,s.out).effect,'blocked');boundary(x,x.f.sourceRaw+' ');
});

test('V16 snapshot size and cleanup lifetime are measured without printing its content',t=>{
  const x=setup(),s=save(x);assert.equal(s.out.status,'committed');const j=JSON.parse(s.out.journalRaw);
  t.diagnostic(JSON.stringify({sourceRawUtf8Bytes:Buffer.byteLength(x.f.sourceRaw),journalUtf8Bytes:Buffer.byteLength(s.out.journalRaw),beforeUtf8Bytes:Buffer.byteLength(j.beforeRaw),candidateUtf8Bytes:Buffer.byteLength(j.candidateRaw)}));
  assert.equal(E.clearConfirmedRecovery(x.db,{expectedJournalRaw:s.out.journalRaw}).ok,true);assert.equal(x.db.map.has(E.RECOVERY_KEY),false);boundary(x);
});

test('V17 actual UMD source-bound create/submit/record decode consumes shared validators without global storage',()=>{
  const sandbox={FlowMeIntegratedPoc:M,FlowPocTimelineContext:require('./timeline-context.js')};let globals=0;
  for(const key of ['localStorage','window','document'])Object.defineProperty(sandbox,key,{get(){globals++;throw Error(key);}});
  const realm=vm.createContext(sandbox);for(const file of ['workspace-checkpoint.js','personal-plan-context.js','plan-item-session.js'])vm.runInContext(fs.readFileSync(require.resolve('./'+file),'utf8'),realm);
  const api=realm.FlowPocPlanItemSession.createForWorkspace('checkpoint-v2'),f=fixture(),db=storage(f),readSourceEpoch=()=>0;
  const s=api.createSourceBoundPersonalPlanSession(db,{checkpoint:f.cp,flowRef:f.flow.ref,sessionId:'umd-v3',readSourceEpoch}),d=clone(s.draft);d.title={mode:'override',value:'원문 제목'};
  const u=api.updateDraft(s,d);assert.equal(u.ok,true);const b=api.beginSourceBoundPersonalPlanSave(db,u.session,{checkpoint:f.cp,expectedRaw:JSON.stringify(f.cp),attemptId:'umd-a',now:NOW,readSourceEpoch});assert.equal(b.ok,true,b.error);
  const out=api.writeDurableAttempt(db,b.session,b.attempt,{readSourceEpoch});assert.equal(out.status,'committed',out.error);assert.equal(api.loadRecovery(db).status,'confirmed');assert.equal(globals,0);
});

test('V18 a missing or boolean live epoch getter cannot dispatch an otherwise genuine source attempt',()=>{
  for(const readSourceEpoch of [undefined,()=>true]){const x=setup(),b=begin(x);assert.equal(b.ok,true);const before=x.db.calls.length;
    const out=E.writeDurableAttempt(x.db,b.session,b.attempt,{readSourceEpoch});assert.equal(out.status,'preflight-failed');assert.equal(x.db.calls.length,before);
    assert.equal(E.writeAttempt(x.db,b.session,b.attempt).writeCount,0);boundary(x);
  }
});

test('V19 epoch-only changes after prepared or target stop the next durable phase with unchanged source bytes',()=>{
  for(const phase of ['target','confirm']){let x;x=setup({hooks:{afterWrite:({key,value})=>{
    if(phase==='target'&&key===E.RECOVERY_KEY&&JSON.parse(value).phase==='prepared')x.clock.epoch++;
    if(phase==='confirm'&&key===E.STORAGE_KEY)x.clock.epoch++;
  }}});const s=save(x);assert.equal(s.out.status,'recovery-required');assert.equal(s.out.writeCount,phase==='confirm'?1:0);assert.equal(s.out.rollbackWriteCount,0);boundary(x);}
});

test('V20 source read errors at all three durable phases stay unavailable rather than empty',()=>{
  for(const phase of ['prepare','target','confirm']){let fail=false;const x=setup({hooks:{
    read:({key,value})=>{if(fail&&key===SOURCE)throw Error('source access denied');return value;},
    afterWrite:({key,value})=>{if(phase==='target'&&key===E.RECOVERY_KEY&&JSON.parse(value).phase==='prepared')fail=true;if(phase==='confirm'&&key===E.STORAGE_KEY)fail=true;},
  }}),b=begin(x);assert.equal(b.ok,true);if(phase==='prepare')fail=true;
    const out=E.writeDurableAttempt(x.db,b.session,b.attempt,{readSourceEpoch:x.readSourceEpoch});assert.notEqual(out.status,'committed');assert.equal(out.sourceError,'source-read-error');assert.equal(out.writeCount,phase==='confirm'?1:0);
    if(phase==='prepare'){const done=E.finishSave(b.session,b.attempt,out);fail=false;const retry=E.retrySourceBoundPersonalPlanSave(x.db,done.session,{checkpoint:x.f.cp,readSourceEpoch:x.readSourceEpoch,attemptId:b.attempt.attemptId});assert.equal(retry.ok,true);assert.equal(E.writeDurableAttempt(x.db,retry.session,retry.attempt,{readSourceEpoch:x.readSourceEpoch}).status,'committed');}
    boundary(x);
  }
});

test('V21 snapshot corruption and a valid empty source store cannot be substituted for historical applied source',()=>{
  const x=setup(),s=save(x),j=JSON.parse(s.out.journalRaw);assert.equal(s.out.status,'committed');
  const empty=JSON.stringify(M.initialSourceCandidateStore(NOW));assert.ok(M.loadSourceCandidateStore({getItem:()=>empty}).status!=='corrupt');
  for(const raw of ['{broken','{}',empty]){const bad=clone(j);bad.sourceReadSnapshot.raw=raw;x.db.map.set(E.RECOVERY_KEY,JSON.stringify(bad));const count=x.db.calls.length;
    assert.equal(E.loadRecovery(x.db).status,'blocked');assert.equal(E.clearConfirmedRecovery(x.db,{expectedJournalRaw:JSON.stringify(bad)}).ok,false);assert.equal(x.db.calls.length,count);}
  boundary(x);
});

test('V22 prepare quota before/after and target failure retain the correct history and only scoped rollback',()=>{
  for(const fault of ['prepare-before','prepare-after','target-after']){let once=true;const hit=({key,value})=>{const match=fault==='target-after'?key===E.STORAGE_KEY:key===E.RECOVERY_KEY&&JSON.parse(value).phase==='prepared';if(match&&once){once=false;throw Error('quota fixture');}};
    const x=setup({hooks:fault==='prepare-before'?{beforeWrite:hit}:{afterWrite:hit}}),s=save(x);assert.notEqual(s.out.status,'committed');
    assert.equal(s.out.writeCount,fault==='target-after'?1:0);assert.equal(s.out.rollbackWriteCount,fault==='target-after'?1:0);
    if(fault==='prepare-after'){assert.equal(E.loadRecovery(x.db).status,'prepared');const r=E.recoverDurableAttempt(x.db,{expectedJournalRaw:s.out.journalRaw});assert.equal(r.ok,true);assert.equal(r.writeCount,0);}
    else assert.equal(x.db.map.get(E.STORAGE_KEY)===JSON.stringify(x.f.cp),true);
    boundary(x);
  }
});

test('V23 failed confirmed cleanup retains transient snapshot; successful retry removes it without target changes',()=>{
  let fail=true;const x=setup({hooks:{beforeRemove:({key})=>{if(key===E.RECOVERY_KEY&&fail)throw Error('cleanup denied');}}}),s=save(x);assert.equal(s.out.status,'committed');
  assert.equal(E.clearConfirmedRecovery(x.db,{expectedJournalRaw:s.out.journalRaw}).ok,false);assert.equal(x.db.map.has(E.RECOVERY_KEY),true);assert.equal(E.loadRecovery(x.db).status,'confirmed');
  fail=false;const out=E.clearConfirmedRecovery(x.db,{expectedJournalRaw:s.out.journalRaw});assert.equal(out.ok,true);assert.equal(out.writeCount,0);assert.equal(x.db.map.has(E.RECOVERY_KEY),false);
  const count=x.db.calls.length;assert.equal(E.clearConfirmedRecovery(x.db,{expectedJournalRaw:s.out.journalRaw}).ok,true);assert.equal(x.db.calls.length,count);boundary(x);
});

test('V24 recovered source draft rejects cloned tokens, changed target and missing observation without writes',()=>{
  const x=setup(),s=save(x),raw=prepared(x,s),recovery=E.recoverDurableAttempt(x.db,{expectedJournalRaw:raw}),count=x.db.calls.length;assert.equal(recovery.ok,true);
  assert.equal(E.resumeRecoveredSourceBoundPersonalPlanSession(x.db,clone(recovery),{sessionId:'clone',readSourceEpoch:x.readSourceEpoch}).ok,false);
  assert.equal(E.resumeRecoveredSourceBoundPersonalPlanSession(x.db,recovery,{sessionId:'missing-counter'}).ok,false);
  x.db.map.set(E.STORAGE_KEY,'foreign bytes');assert.equal(E.resumeRecoveredSourceBoundPersonalPlanSession(x.db,recovery,{sessionId:'foreign-target',readSourceEpoch:x.readSourceEpoch}).ok,false);assert.equal(x.db.calls.length,count);
  x.db.map.set(E.STORAGE_KEY,JSON.stringify(x.f.cp));assert.equal(E.resumeRecoveredSourceBoundPersonalPlanSession(x.db,recovery,{sessionId:'recovered-exact',readSourceEpoch:x.readSourceEpoch}).ok,true);boundary(x);
});

test.after(()=>{
  for(const entry of audits){assert.equal(entry.forbidden,0);assert.equal(entry.map.get('flow:operating:v3-sentinel'),' \r\n유지 🙂\t ');}
  // Diagnostic counters, not additional registered scenarios. No payload content.
  process.stdout.write('# v3-boundary '+JSON.stringify({memoryStores:audits.length,reads:audits.reduce((n,a)=>n+a.reads.length,0),sourceReads:audits.reduce((n,a)=>n+a.reads.filter(k=>k===SOURCE).length,0),mutationCalls:audits.reduce((n,a)=>n+a.calls.length,0),forbidden:audits.reduce((n,a)=>n+a.forbidden,0)})+'\n');
});
