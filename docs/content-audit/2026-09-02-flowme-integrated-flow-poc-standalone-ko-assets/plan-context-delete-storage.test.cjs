'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('./model.js');
const C=require('./workspace-checkpoint.js');
const S=require('./workspace-storage.js');
const P=require('./personal-plan-context.js');
const NOW='2026-09-05T11:00:00.000Z';
const PRIVATE='B1_SELECTED_PLAN_PRIVATE_한글';
const OP='flow:plan-delete:operating-sentinel';
const clone=value=>JSON.parse(JSON.stringify(value));
function memory(initial) {
  const values=new Map([[OP,'  원본\r\n😀\t  '],...Object.entries(initial)]);const calls=[];const hooks={};
  return {values,calls,hooks,
    getItem(key){if(hooks.read)hooks.read(key);return values.has(key)?values.get(key):null;},
    setItem(key,raw){calls.push(['set',key]);if(!key.startsWith('flow:poc:personal-workspace:v1:'))throw new Error('forbidden');if(hooks.before)hooks.before(key,raw);values.set(key,String(raw));if(hooks.after)hooks.after(key,raw);},
    removeItem(key){calls.push(['remove',key]);if(!key.startsWith('flow:poc:personal-workspace:v1:'))throw new Error('forbidden');if(hooks.before)hooks.before(key,null);values.delete(key);if(hooks.after)hooks.after(key,null);},
    clear(){calls.push(['clear']);throw new Error('forbidden');}
  };
}
const snapshot=storage=>Object.fromEntries(storage.values);
function overlay(cp,flowId,value) {
  const flow=cp.state.flows.find(f=>f.id===flowId);const opened=C.inspectPersonalPlanContext(cp,flow.ref);assert.equal(opened.ok,true,opened.reason);
  const draft=clone(opened.draft);draft.title={mode:'override',value};draft.items[Object.keys(draft.items)[0]].memo={mode:'override',value:value+'\r\n  '};
  const result=C.transitionCheckpoint(cp,{type:'commit-personal-plan-context',context:opened.context,draft,now:NOW});assert.equal(result.ok,true,result.reason);assert.equal(result.changed,true);return result.checkpoint;
}
function fixture(withSource=true) {
  const handoff=M.makeHandoff('# '+PRIVATE+'\n## 준비\n- [ ] '+PRIVATE+' 항목',{draftId:'plan-delete-draft',handoffId:'plan-delete-handoff',sourceConfirmed:true});
  const authored=M.apply(M.seedState(),{type:'commit-authoring',handoff,now:NOW});assert.equal(authored.changed,true,authored.error);
  const state=authored.state;const flow=state.flows.find(f=>f.handoffId===handoff.handoffId);
  const target={kind:'flow',id:flow.id,ref:flow.ref,savedCopyId:flow.savedCopyId,sourceFlowId:flow.sourceFlowId};let sourceRaw=null;
  if(withSource){const prepared=M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(NOW),state,flow.id,{now:NOW,createdAt:NOW});assert.equal(prepared.ok,true,prepared.reason);sourceRaw=JSON.stringify(prepared.store);}
  const legacyRaw=' \r\n'+JSON.stringify({version:1,state,undo:clone(state)},null,2)+'\r\n ';
  let cp=C.fromLegacy(legacyRaw).checkpoint;cp=overlay(cp,'memo','NEIGHBOR_PLAN_EXACT');cp=overlay(cp,flow.id,PRIVATE+' override');
  const trashed=C.transitionCheckpoint(cp,{type:'move-to-trash',kind:'flow',id:flow.id,now:NOW});assert.equal(trashed.ok,true);cp=trashed.checkpoint;
  const initial={[S.LEGACY_KEY]:legacyRaw,[S.STORAGE_KEY]:JSON.stringify(cp),[S.CREATOR_KEY]:'independent creator bytes',[S.DRAFT_KEY]:'independent working draft'};
  if(sourceRaw!==null)initial[S.SOURCE_KEY]=sourceRaw;
  const storage=memory(initial);const packet=S.loadWorkspace(storage);assert.equal(packet.ok,true,packet.reason);
  const planned=S.preparePermanentDelete(packet,{target,confirmed:true,expectedRevision:cp.state.revision,sourceCandidateRaw:sourceRaw,now:NOW},'b1-plan-delete-attempt');assert.equal(planned.ok,true,planned.reason);
  const neighborRef=cp.state.flows.find(f=>f.id==='memo').ref;
  return {storage,packet,planned,before:snapshot(storage),neighborRef,neighbor:clone(cp.state[P.METADATA_KEY].entries[neighborRef])};
}
function boundary(f,storage=f.storage) {
  assert.equal(storage.values.get(OP),f.before[OP]);assert.equal(storage.values.get(S.CREATOR_KEY),f.before[S.CREATOR_KEY]);assert.equal(storage.values.get(S.DRAFT_KEY),f.before[S.DRAFT_KEY]);
  assert.equal(storage.calls.some(call=>call[0]==='clear'||![S.LEGACY_KEY,S.STORAGE_KEY,S.SOURCE_KEY,S.RECOVERY_KEY].includes(call[1])),false);
}
function after(f,storage=f.storage) {
  for(const key of [S.LEGACY_KEY,S.STORAGE_KEY,S.SOURCE_KEY,S.RECOVERY_KEY])assert.equal((storage.values.get(key)||'').includes(PRIVATE),false,key);
  const packet=S.loadWorkspace(storage);assert.equal(packet.ok,true,packet.reason);assert.equal(packet.checkpoint.undo,null);
  assert.deepEqual(packet.checkpoint.state[P.METADATA_KEY].entries[f.neighborRef],f.neighbor);boundary(f,storage);
}

test('B1DS01 actual delete coordinator retains private journal until confirmed cleanup and preserves neighbor Plan',()=>{
  const f=fixture();assert.equal(f.storage.calls.length,0);
  const result=S.commitPrepared(f.storage,f.planned.prepared);assert.equal(result.status,'committed',result.reason);assert.equal(result.deletionComplete,false);
  assert.equal(f.storage.values.get(S.RECOVERY_KEY).includes(PRIVATE),true);
  assert.equal(S.cleanupCommitted(f.storage,result.receipt).deletionComplete,true);after(f);
  const count=f.storage.calls.filter(call=>call[0]==='set'&&call[1]===S.STORAGE_KEY).length;assert.equal(count,1);
});
test('B1DS02 every interrupted metadata-bearing snapshot restores exact before or cleans confirmed after',()=>{
  const f=fixture();const frames=[];f.storage.hooks.after=()=>frames.push(snapshot(f.storage));assert.equal(S.commitPrepared(f.storage,f.planned.prepared).ok,true);
  assert.ok(frames.length>=4);
  for(const frame of frames){const storage=memory(frame);const recovery=S.loadActionRecovery(storage);assert.equal(recovery.ok,true,recovery.reason);assert.equal(storage.calls.length,0);
    const result=S.recoverAction(storage,{expectedJournalRaw:recovery.journalRaw});assert.equal(result.ok,true,result.reason);
    if(recovery.status==='prepared'){assert.deepEqual(snapshot(storage),f.before);boundary(f,storage);}else{assert.equal(result.deletionComplete,true);after(f,storage);}
  }
});
test('B1DS03 fault before each write restores original metadata bytes and all old/source values',()=>{
  const probe=fixture();const count=probe.planned.prepared.journal.entries.filter(e=>e.beforeRaw!==e.afterRaw).length+2;
  for(let nth=1;nth<=count;nth++){const f=fixture();let calls=0;f.storage.hooks.before=()=>{if(++calls===nth)throw new Error('fault before write');};
    const result=S.commitPrepared(f.storage,f.planned.prepared);assert.equal(result.ok,false);delete f.storage.hooks.before;
    const raw=f.storage.values.get(S.RECOVERY_KEY)||f.planned.prepared.raw;const recovered=S.recoverAction(f.storage,{expectedJournalRaw:raw});assert.equal(recovered.ok,true,recovered.reason);
    assert.deepEqual(snapshot(f.storage),f.before);boundary(f);
  }
});
test('B1DS04 throw-after writes use exact bytes and never roll back confirmed Plan deletion',()=>{
  const probe=fixture();const count=probe.planned.prepared.journal.entries.filter(e=>e.beforeRaw!==e.afterRaw).length+2;
  for(let nth=1;nth<=count;nth++){const f=fixture();let calls=0;f.storage.hooks.after=()=>{if(++calls===nth)throw new Error('after write');};
    const result=S.commitPrepared(f.storage,f.planned.prepared);assert.equal(result.status,'committed',result.reason);delete f.storage.hooks.after;
    assert.equal(S.cleanupCommitted(f.storage,result.receipt).deletionComplete,true);after(f);
  }
});
test('B1DS05 read loss after each write remains explicitly recoverable with exact Plan ownership',()=>{
  const probe=fixture();const count=probe.planned.prepared.journal.entries.filter(e=>e.beforeRaw!==e.afterRaw).length+2;
  for(let nth=1;nth<=count;nth++){const f=fixture();let calls=0;let failed=false;f.storage.hooks.after=()=>{if(++calls===nth)failed=true;};f.storage.hooks.read=()=>{if(failed)throw new Error('read unavailable');};
    assert.equal(S.commitPrepared(f.storage,f.planned.prepared).ok,false);const fresh=memory(snapshot(f.storage));const pending=S.loadActionRecovery(fresh);assert.equal(pending.ok,true,pending.reason);
    const recovered=S.recoverAction(fresh,{expectedJournalRaw:pending.journalRaw});assert.equal(recovered.ok,true,recovered.reason);
    if(pending.status==='prepared'){assert.deepEqual(snapshot(fresh),f.before);boundary(f,fresh);}else after(f,fresh);
  }
});
test('B1DS06 failed confirmed cleanup keeps deletion incomplete and reload cleanup writes no extra target',()=>{
  const f=fixture();const result=S.commitPrepared(f.storage,f.planned.prepared);assert.equal(result.ok,true);
  f.storage.hooks.before=(key,raw)=>{if(key===S.RECOVERY_KEY&&raw===null)throw new Error('cleanup');};
  assert.equal(S.cleanupCommitted(f.storage,result.receipt).ok,false);const fresh=memory(snapshot(f.storage));
  const pending=S.loadActionRecovery(fresh);assert.equal(pending.status,'confirmed');assert.equal(S.recoverAction(fresh,{expectedJournalRaw:pending.journalRaw}).deletionComplete,true);
  assert.equal(fresh.calls.filter(call=>call[1]===S.STORAGE_KEY).length,0);after(f,fresh);
});
test('B1DS07 tampered neighbor overlay in prepared after checkpoint is rejected with zero storage calls',()=>{
  const f=fixture();const journal=clone(f.planned.prepared.journal);const entry=journal.entries.find(e=>e.key===S.STORAGE_KEY);assert.ok(entry);
  const afterState=JSON.parse(entry.afterRaw);afterState.state[P.METADATA_KEY].entries[f.neighborRef].overlay.title='UNAUTHORIZED_NEIGHBOR';entry.afterRaw=JSON.stringify(afterState);
  const raw=JSON.stringify(journal);assert.equal(S.decodeJournal(raw),null);const fresh=memory({...f.before,[S.RECOVERY_KEY]:raw});
  assert.equal(S.recoverAction(fresh,{expectedJournalRaw:raw}).ok,false);assert.equal(fresh.calls.length,0);boundary(f,fresh);
});
test('B1DS08 verified absent source key stays absent after metadata-aware deletion and cleanup',()=>{
  const f=fixture(false);const result=S.commitPrepared(f.storage,f.planned.prepared);assert.equal(result.ok,true,result.reason);assert.equal(S.cleanupCommitted(f.storage,result.receipt).deletionComplete,true);after(f);
  assert.equal(f.storage.values.has(S.SOURCE_KEY),false);assert.equal(f.storage.calls.filter(call=>call[1]===S.SOURCE_KEY).length,0);
});
