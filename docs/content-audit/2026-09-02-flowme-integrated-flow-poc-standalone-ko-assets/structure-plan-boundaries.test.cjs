'use strict';
// B2 independent PD/D boundaries. Real M handoffs and C-issued structural
// candidates only; no product writes, storage/journal dispatch or UI claim.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('./model.js');
const P = require('./personal-plan-context.js');
const C = require('./workspace-checkpoint.js');
const PD = require('./personal-plan-display.js');
const D = require('./workspace-permanent-delete.js');
const NOW = '2026-09-05T14:20:00.000Z';
const META = 'personalPlanContextV1';
const TYPE = 'commit-source-bound-personal-plan-structure-context';
const RAW = '# 공통 원문\r\n## 같은 구간\r\n- [ ] A1\r\n- [ ] A2\r\n## 같은 구간\r\n- [ ] B1';
const TARGET_SECRET = 'TARGET_RAW_STEP_PRIVATE_6bbf9';
const OTHER_SECRET = 'NEIGHBOR_RAW_STEP_PRIVATE_64ac5';
const copy = value => JSON.parse(JSON.stringify(value));
const bytes = value => JSON.stringify(value);
const own = (value,key) => Object.prototype.hasOwnProperty.call(value,key);
const api = (module,name) => { assert.equal(typeof module[name],'function','B2 API unavailable: '+name); return module[name]; };

function fixture() {
  let state = M.seedState(); const flows=[];
  for(const id of ['target','neighbor']) {
    const handoff=M.makeHandoff(RAW,{draftId:'boundary-draft-'+id,handoffId:'boundary-handoff-'+id,sourceConfirmed:true,folderId:null});
    const made=M.apply(state,{type:'commit-authoring',handoff,now:NOW});
    assert.equal(made.changed,true,made.error); state=made.state;
    const flow=state.flows.find(row=>row.handoffId===handoff.handoffId); assert.ok(flow);
    assert.equal(flow.rawText,RAW); assert.equal(flow.sourceFingerprint,M.fingerprint(RAW));
    flows.push(flow);
  }
  // M.apply returns a detached clone: relocate both owners in the final state
  // before inserting the deliberate unknown JSON baseline values.
  for(let index=0;index<flows.length;index++) flows[index]=state.flows.find(flow=>flow.ref===flows[index].ref);
  flows[0].steps[0].privateUnknown={marker:TARGET_SECRET,sharedText:'같은 문자열',exact:' \r\n\t ',values:[0,false,null]};
  flows[1].steps[0].privateUnknown={marker:OTHER_SECRET,sharedText:'같은 문자열',exact:' \r\n\t ',values:[0,false,null]};
  assert.equal(bytes(state).includes(TARGET_SECRET),true); assert.equal(bytes(state).includes(OTHER_SECRET),true);
  assert.deepEqual(M.validate(state),[]);
  const legacy=' \r\n'+bytes({version:1,state,undo:copy(state)})+'\r\n ';
  const created=C.fromLegacy(legacy); assert.equal(created.ok,true,created.reason);
  const f={checkpoint:created.checkpoint,flow:flows[0],other:flows[1],sourceRead:{ok:true,raw:bytes(M.initialSourceCandidateStore(NOW))},sourceEpoch:11};
  assert.equal(P.readPersonalPlanSourceContext(readerInput(f)).ok,true,'genuine existing M/P/C fixture');
  return f;
}
const readerInput=f=>({rawState:f.checkpoint.state,legacyBaseRaw:f.checkpoint.legacyBaseRaw,undo:f.checkpoint.undo,sourceRead:f.sourceRead,sourceEpoch:f.sourceEpoch});
function refs(f,flow=f.flow) { return flow.steps.flatMap(s=>s.itemIds).map(id=>f.checkpoint.state.tasks.find(t=>t.id===id&&t.flowId===flow.id).ref); }
function edit(f,flow=f.flow,change) {
  const opened=api(C,'inspectSourceBoundPersonalPlanStructureContext')(f.checkpoint,{flowRef:flow.ref,sourceRead:f.sourceRead,sourceEpoch:f.sourceEpoch});
  assert.equal(opened.ok,true,opened.reason); assert.equal(opened.draft.version,2);
  const draft=copy(opened.draft);
  if(change) change(draft); else {
    draft.sectionTitles['step-1']={mode:'override',value:'같은 개인 별칭'};
    draft.orderedItemRefs=[draft.orderedItemRefs[0],draft.orderedItemRefs[2],draft.orderedItemRefs[1]];
  }
  const before=bytes(f.checkpoint), source=f.sourceRead.raw;
  const changed=C.transitionCheckpoint(f.checkpoint,{type:TYPE,context:opened.context,draft,sourceRead:f.sourceRead,sourceEpoch:f.sourceEpoch,now:NOW});
  assert.equal(changed.ok,true,changed.reason); assert.equal(changed.changed,true,changed.reason);
  assert.equal(bytes(f.checkpoint),before); assert.equal(f.sourceRead.raw,source);
  assert.deepEqual(changed.checkpoint.undo,f.checkpoint.state);
  assert.equal(C.validateCheckpoint(changed.checkpoint).ok,true);
  assert.deepEqual(changed.checkpoint.state.flows,f.checkpoint.state.flows);
  assert.deepEqual(changed.checkpoint.state.tasks,f.checkpoint.state.tasks);
  return {...f,checkpoint:changed.checkpoint};
}
function reset(f,flow=f.flow) { return edit(f,flow,draft=>{
  for(const id of Object.keys(draft.sectionTitles)) draft.sectionTitles[id]={mode:'inherit'};
  draft.orderedItemRefs=refs(f,flow);
}); }
function both() { const f=fixture(); return edit(edit(f,f.flow),f.other); }
function display(f,module=PD) {
  const input={checkpoint:f.checkpoint,sourceRead:f.sourceRead,sourceEpoch:f.sourceEpoch}, before=bytes(input);
  const result=module.projectPersonalPlanDisplay(input); assert.equal(bytes(input),before);
  for(const key of ['context','sourceContext','capabilities','ticket','attempt']) assert.equal(own(result,key),false);
  if(!result.ok) assert.equal(own(result,'state'),false);
  return result;
}
function candidate(before,after=before,module=PD) {
  const input={checkpoint:before.checkpoint,candidateCheckpoint:after.checkpoint,sourceRead:before.sourceRead,candidateSourceRead:after.sourceRead,sourceEpoch:before.sourceEpoch};
  const original=bytes(input), result=module.inspectPersonalPlanDisplayCandidate(input);
  assert.equal(bytes(input),original); assert.equal(result.scope,'candidate-display-check');
  for(const key of ['state','checkpoint','context','sourceContext','capabilities','ticket','attempt']) assert.equal(own(result,key),false);
  return result;
}
function structure(f,flow=f.flow) {
  const read=P.readPersonalPlanSourceContext(readerInput(f)); assert.equal(read.ok,true,read.reason);
  const result=api(P,'readPersonalPlanStructureView')({sourceContext:read.context,flowRef:flow.ref});
  assert.equal(result.ok,true,result.reason); assert.equal(result.viewOnly,true);
  return result;
}
function sourceVersion(f,incomingRawText,flow=f.flow,startStore) {
  const store=startStore||M.initialSourceCandidateStore(NOW);
  const proposed=M.prepareLocalSourceCandidateReview(store,f.checkpoint.state,flow.id,{now:NOW,createdAt:NOW,incomingRawText});
  assert.equal(proposed.ok,true,proposed.reason); let next=proposed.store;
  assert.ok(proposed.candidate.changes.length>0,'source fixture must contain actual changes');
  for(const change of proposed.candidate.changes) {
    const resolved=M.resolveLocalSourceCandidateChange(next,{candidateId:proposed.candidate.candidateId,changeId:change.changeId,resolution:'use-incoming',now:NOW});
    assert.equal(resolved.changed,true,resolved.code); next=resolved.store;
  }
  const applied=M.applyLocalSourceCandidate(next,f.checkpoint.state,flow.id,proposed.candidate.candidateId,NOW);
  assert.equal(applied.changed,true,applied.code);
  const raw=bytes(applied.store); assert.equal(M.loadSourceCandidateStore({getItem:()=>raw}).status,'restored');
  return {store:applied.store,sourceRead:{ok:true,raw}};
}
function trash(f,flow=f.flow) {
  const changed=C.transitionCheckpoint(f.checkpoint,{type:'move-to-trash',kind:'flow',id:flow.id,now:NOW});
  assert.equal(changed.ok,true,changed.reason); assert.equal(changed.changed,true);
  return {...f,checkpoint:changed.checkpoint};
}
const target=flow=>({kind:'flow',id:flow.id,ref:flow.ref,savedCopyId:flow.savedCopyId,sourceFlowId:flow.sourceFlowId});
function deletion(f,flow=f.flow,patch={}) {
  const input={checkpoint:f.checkpoint,target:target(flow),confirmed:true,expectedRevision:f.checkpoint.state.revision,sourceCandidateRaw:f.sourceRead.raw,now:NOW,...patch};
  const before=bytes(input), result=D.planPermanentDelete(input);
  assert.equal(bytes(input),before);
  if(!result.changed) { assert.equal(result.checkpoint,input.checkpoint); assert.deepEqual(result.writes,[]); assert.equal(result.sourceCandidateRaw,input.sourceCandidateRaw); }
  return result;
}
function remainingSnapshots(result) {
  const legacy=JSON.parse(result.legacyRaw);
  return [result.checkpoint.state,result.checkpoint.state.timelineContextV1.legacySnapshot,legacy.state,...(legacy.undo?[legacy.undo]:[])];
}
function assertTargetRemoved(f,result) {
  assert.equal(result.ok,true,result.reason); assert.equal(result.changed,true,result.reason);
  assert.equal(result.checkpoint.undo,null); assert.equal(C.validateCheckpoint(result.checkpoint).ok,true);
  for(const snapshot of remainingSnapshots(result)) {
    assert.equal(snapshot.flows.some(flow=>flow.ref===f.flow.ref),false);
    assert.equal(snapshot.tasks.some(task=>task.flowId===f.flow.id),false);
    assert.equal(own(snapshot[META]?.entries||{},f.flow.ref),false);
    assert.equal(bytes(snapshot).includes(TARGET_SECRET),false);
    assert.equal(bytes(snapshot).includes(f.flow.ref),false);
    assert.equal(bytes(snapshot).includes(OTHER_SECRET),true);
  }
  assert.equal(result.checkpointRaw.includes(TARGET_SECRET),false);
  assert.equal(result.checkpointRaw.includes(f.flow.ref),false);
  for(const write of result.writes) {
    assert.ok([M.STORAGE_KEY,M.SOURCE_CANDIDATE_STORAGE_KEY].includes(write.key));
    assert.equal(write.afterRaw.includes(TARGET_SECRET),false);
    assert.equal(write.afterRaw.includes(f.flow.ref),false);
  }
}

test('SB01 real C structure v2 remains a display fact; PD exposes no editor token and calls no editor/planner',()=>{
  const f=both(), before=bytes(f.checkpoint); assert.equal(f.checkpoint.state[META].version,2);
  let editorCalls=0,ambientCalls=0;
  const adapter={...P};
  for(const name of ['inspectPersonalPlanEditor','inspectPersonalPlanSourceEditor','inspectPersonalPlanStructureEditor','planPersonalPlanState','planPersonalPlanSourceState','planPersonalPlanStructureState']) {
    if(typeof P[name]==='function') adapter[name]=(...args)=>{editorCalls++;return P[name](...args);};
  }
  const sandbox={FlowMeIntegratedPoc:M,FlowPocWorkspaceCheckpoint:C,FlowPocPersonalPlanContext:adapter};
  for(const key of ['window','document','localStorage','sessionStorage','fetch']) Object.defineProperty(sandbox,key,{get(){ambientCalls++;throw new Error('ambient access');}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'personal-plan-display.js'),'utf8'),vm.createContext(sandbox));
  const result=display(f,sandbox.FlowPocPersonalPlanDisplay);
  assert.equal(result.ok,true,result.reason); assert.equal(result.mode,'personal-source-display');
  assert.equal(candidate(f,f,sandbox.FlowPocPersonalPlanDisplay).ok,true);
  assert.equal(editorCalls,0); assert.equal(ambientCalls,0); assert.equal(bytes(f.checkpoint),before);
  assert.deepEqual(structure(f).orderedItemRefs,[refs(f)[0],refs(f)[2],refs(f)[1]]);
  assert.equal(structure(f).sections.find(s=>s.sectionId==='step-1').title,'같은 개인 별칭');
  assert.equal(structure(f,f.other).sections.find(s=>s.sectionId==='step-1').title,'같은 개인 별칭');
});

test('SB02 same-id same-order source rename and actual source Undo preserve the private alias and global order',()=>{
  const f=both(), before=bytes(f.checkpoint);
  const updated=sourceVersion(f,RAW.replace('## 같은 구간','## 새 source 구간'));
  const next={...f,sourceRead:updated.sourceRead}; assert.equal(candidate(f,next).ok,true);
  assert.equal(display(next).ok,true); const view=structure(next);
  assert.equal(view.sections.find(s=>s.sectionId==='step-1').title,'같은 개인 별칭');
  assert.deepEqual(view.orderedItemRefs,structure(f).orderedItemRefs);
  const undone=M.undoLocalSourceCandidate(updated.store,NOW); assert.equal(undone.changed,true,undone.code);
  const after={...f,sourceRead:{ok:true,raw:bytes(undone.store)}};
  assert.equal(candidate(next,after).ok,true); assert.equal(display(after).ok,true);
  assert.deepEqual(structure(after).orderedItemRefs,structure(f).orderedItemRefs);
  assert.equal(bytes(f.checkpoint),before);
});

test('SB03 current structural P blocks missing corrupt or unreadable source and never falls back to raw state',()=>{
  const f=both(); assert.equal(display(f).ok,true);
  for(const sourceRead of [{ok:false,reason:'read-error'},{ok:false,reason:'unavailable'},{ok:true,raw:'{'},{ok:true,raw:bytes({version:999})}]) {
    const next={...f,sourceRead}, shown=display(next), checked=candidate(next);
    assert.equal(shown.ok,false); assert.equal(own(shown,'state'),false); assert.match(shown.reason,/source-read-/);
    assert.equal(checked.ok,false); assert.equal(checked.pair,'current'); assert.equal(checked.snapshot,'current');
  }
  assert.equal(display({...f,sourceRead:{ok:true,raw:null}}).ok,true,'validated exact source absence is distinct from failed read');
});

test('SB04 actual source reorder or membership expansion blocks both current and reachable Undo structure owners',()=>{
  const original=fixture(), changed=edit(original), undoneOnly=reset(changed);
  assert.equal(own(undoneOnly.checkpoint.state,META),false); assert.equal(own(undoneOnly.checkpoint.undo,META),true);
  for(const f of [changed,undoneOnly]) {
    assert.equal(candidate(f).ok,true);
    for(const raw of [RAW.replace('- [ ] A1\r\n- [ ] A2','- [ ] A2\r\n- [ ] A1'),RAW+'\r\n- [ ] new source Item']) {
      const version=sourceVersion(f,raw), result=candidate(f,{...f,sourceRead:version.sourceRead});
      assert.equal(result.ok,false); assert.equal(result.reason,'source-membership-not-supported');
      assert.equal(result.pair,'candidate'); assert.equal(result.snapshot,f===changed?'current':'undo');
    }
  }
});

test('SB05 actual workspace Undo and Undo-only source failure use the captured whole snapshot without cross-pair fallback',()=>{
  const base=fixture(), changed=edit(base), resetState=reset(changed);
  const restored=C.undoCheckpoint(resetState.checkpoint); assert.equal(restored.ok,true); assert.equal(restored.changed,true);
  const expected=copy(changed.checkpoint.state); expected.updatedAt=M.TODAY+'T12:00:00.000Z';
  assert.deepEqual(restored.checkpoint.state,expected); assert.equal(restored.checkpoint.undo,null);
  assert.equal(candidate(resetState,{...resetState,checkpoint:restored.checkpoint}).ok,true);
  const unavailable={...resetState,sourceRead:{ok:false,reason:'read-error'}};
  const shown=display(unavailable); assert.equal(shown.ok,true); assert.equal(shown.mode,'personal-execution-only');
  assert.equal(shown.hasReachablePersonalUndo,true);
  const blocked=candidate(unavailable,base); assert.equal(blocked.ok,false); assert.equal(blocked.pair,'current'); assert.equal(blocked.snapshot,'undo');
  assert.equal(display({...resetState,checkpoint:restored.checkpoint,sourceRead:unavailable.sourceRead}).ok,false);
});

test('SB06 exact permanent-delete removes target rawSteps capture aliases refs and Undo while equal-text neighbor survives',()=>{
  const f=trash(both()), before=bytes(f.checkpoint), neighbor=copy(f.checkpoint.state[META].entries[f.other.ref]);
  assert.ok(f.checkpoint.state[META].entries[f.flow.ref].structure.capture.rawSteps[0].privateUnknown);
  assert.ok(f.checkpoint.undo[META].entries[f.flow.ref].structure);
  const result=deletion(f); assertTargetRemoved(f,result);
  assert.deepEqual(result.checkpoint.state[META].entries[f.other.ref],neighbor);
  assert.deepEqual(result.checkpoint.state.flows.find(flow=>flow.ref===f.other.ref),f.checkpoint.state.flows.find(flow=>flow.ref===f.other.ref));
  assert.equal(bytes(result.checkpoint).includes('같은 개인 별칭'),true,'same text owned by another copy is retained');
  assert.equal(bytes(f.checkpoint),before);
  const serialized=JSON.parse(result.checkpointRaw); assert.equal(C.validateCheckpoint(serialized).ok,true);
  assert.equal(C.undoCheckpoint(serialized).changed,false);
  const later=C.transitionCheckpoint(serialized,{type:'add-quick',title:'삭제 이후 별도 할 일',date:null,folderId:null,now:NOW});
  assert.equal(later.ok,true,later.reason); assert.equal(later.changed,true,later.reason);
  const reopened=C.undoCheckpoint(later.checkpoint); assert.equal(reopened.changed,true,reopened.reason);
  assert.equal(bytes(reopened.checkpoint).includes(TARGET_SECRET),false); assert.equal(bytes(reopened.checkpoint).includes(f.flow.ref),false);
});

test('SB07 validated persisted Undo-only target structure is scrubbed without manufacturing a fresh editor or keeping private history',()=>{
  const base=fixture(), structural=edit(base), resetState=reset(structural), trashed=trash(resetState);
  // Persisted-data boundary fixture: both snapshots originate from real C
  // transitions; their valid pair is tested as stored input, not claimed UI history.
  const checkpoint={...trashed.checkpoint,undo:copy(structural.checkpoint.state)};
  assert.equal(C.validateCheckpoint(checkpoint).ok,true); assert.equal(own(checkpoint.state,META),false);
  assert.equal(own(checkpoint.undo[META].entries,base.flow.ref),true);
  const f={...base,checkpoint}, result=deletion(f); assertTargetRemoved(f,result);
  assert.equal(own(result.checkpoint.state,META),false); assert.equal(result.checkpoint.undo,null);
  assert.equal(result.footprint.clearedActiveUndo,true);
});

test('SB08 unknown owner and malformed v2 captures remain zero-change without narrowing neighboring data by guess',()=>{
  const f=trash(both()); assert.equal(deletion(f).ok,true,'known-owner positive control');
  const unknown=copy(f.checkpoint); unknown.state.unknownOwner={text:TARGET_SECRET};
  assert.equal(C.validateCheckpoint(unknown).ok,true,'ordinary unknown JSON remains a valid checkpoint');
  const denied=deletion({...f,checkpoint:unknown}); assert.equal(denied.ok,false); assert.equal(denied.reason,'delete-scope-unproven');
  for(const stateKey of ['state','undo']) {
    const corrupt=copy(f.checkpoint); corrupt[stateKey][META].entries[f.flow.ref].structure.capture.unknownPermission=true;
    assert.equal(C.validateCheckpoint(corrupt).ok,false);
    const result=deletion({...f,checkpoint:corrupt}); assert.equal(result.ok,false); assert.equal(result.reason,'invalid-checkpoint');
    assert.equal(display({...f,checkpoint:corrupt}).ok,false);
  }
});

test('SB09 actual source-candidate target scrub keeps the neighbor source and validates the correct before/final PD pairs',()=>{
  const initial=both();
  const first=sourceVersion(initial,RAW.replace('## 같은 구간','## 대상의 새 구간'));
  const second=sourceVersion(initial,RAW.replace('## 같은 구간','## 이웃의 새 구간'),initial.other,first.store);
  const f=trash({...initial,sourceRead:second.sourceRead}); assert.equal(display(f).ok,true);
  const neighborSource=copy(second.store.effectiveVersions[f.other.ref]); assert.ok(neighborSource);
  const result=deletion(f); assertTargetRemoved(f,result);
  const source=JSON.parse(result.sourceCandidateRaw);
  assert.deepEqual(source.effectiveVersions[f.other.ref],neighborSource);
  assert.equal(own(source.effectiveVersions,f.flow.ref),false); assert.equal(result.sourceCandidateRaw.includes(f.flow.ref),false);
  const sourceWrite=result.writes.find(write=>write.key===M.SOURCE_CANDIDATE_STORAGE_KEY); assert.ok(sourceWrite);
  assert.equal(sourceWrite.beforeRaw,second.sourceRead.raw); assert.equal(sourceWrite.afterRaw,result.sourceCandidateRaw);
  const final={...f,checkpoint:result.checkpoint,sourceRead:{ok:true,raw:result.sourceCandidateRaw}};
  assert.equal(candidate(f,final).ok,true,'current source stays with before; scrubbed source stays with final checkpoint');
  assert.equal(display(final).ok,true);
  assert.deepEqual(result.checkpoint.state[META].entries[f.other.ref],f.checkpoint.state[META].entries[f.other.ref]);
});

test('SB10 deleting a Flow with no own structural entry preserves other v2 entries and independent Quick exactly',()=>{
  const base=fixture(), f=trash(edit(base,base.other));
  assert.equal(own(f.checkpoint.state[META].entries,f.flow.ref),false); assert.equal(own(f.checkpoint.state[META].entries,f.other.ref),true);
  const neighbor=copy(f.checkpoint.state[META].entries[f.other.ref]);
  const quick=copy(f.checkpoint.state.tasks.filter(task=>task.flowId===null)); assert.ok(quick.length>0);
  const result=deletion(f); assertTargetRemoved(f,result);
  assert.deepEqual(result.checkpoint.state[META].entries[f.other.ref],neighbor);
  assert.deepEqual(result.checkpoint.state.tasks.filter(task=>task.flowId===null),quick);
  const invalid=deletion(f,f.flow,{target:{...target(f.flow),savedCopyId:f.other.savedCopyId}});
  assert.equal(invalid.ok,false); assert.equal(invalid.reason,'invalid-delete-target');
});
