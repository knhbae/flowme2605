'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const M = require('./model.js');
const C = require('./workspace-checkpoint.js');
const P = require('./personal-plan-context.js');
const D = require('./workspace-permanent-delete.js');
const NOW = '2026-09-05T10:00:00.000Z';
const META = P.METADATA_KEY;
const clone = value => JSON.parse(JSON.stringify(value));
const own = (value,key) => Object.prototype.hasOwnProperty.call(value,key);
function fixture() {
  const state = M.seedState();
  const item = state.tasks.find(task=>task.id==='quote');
  item.memo = 'TARGET_BASELINE_MEMO\r\n  ';
  delete item.planDate;
  state.tasks.find(task=>task.id==='contract').planDate = null;
  const raw = ' \r\n'+JSON.stringify({version:1,state,undo:clone(state)},null,2)+'\r\n ';
  const result=C.fromLegacy(raw);assert.equal(result.ok,true,result.reason);return result.checkpoint;
}
const getFlow = (cp,id='moving')=>cp.state.flows.find(flow=>flow.id===id);
function overlay(cp,id='moving',value='TARGET_PRIVATE_PLAN_TITLE') {
  const opened=C.inspectPersonalPlanContext(cp,getFlow(cp,id).ref);assert.equal(opened.ok,true,opened.reason);
  const draft=clone(opened.draft);draft.title={mode:'override',value};
  const ref=Object.keys(draft.items)[0];draft.items[ref].memo={mode:'override',value:id==='moving'?'TARGET_PRIVATE_PLAN_MEMO\r\n  ':'이웃 개인 메모'};
  const result=C.transitionCheckpoint(cp,{type:'commit-personal-plan-context',context:opened.context,draft,now:NOW});
  assert.equal(result.ok,true,result.reason);assert.equal(result.changed,true);return result.checkpoint;
}
function action(cp,request) {const result=C.transitionCheckpoint(cp,{...request,now:NOW});assert.equal(result.ok,true,result.reason);assert.equal(result.changed,true);return result.checkpoint;}
const trash = (cp,kind='flow',id='moving')=>action(cp,{type:'move-to-trash',kind,id});
function request(cp,kind='flow',id='moving') {
  const flow=kind==='flow'?getFlow(cp,id):null;
  return {checkpoint:cp,target:flow?{kind,id,savedCopyId:flow.savedCopyId,sourceFlowId:flow.sourceFlowId,ref:flow.ref}:{kind,id},confirmed:true,expectedRevision:cp.state.revision,sourceCandidateRaw:null,now:NOW};
}
function success(input,api=D) {
  const before=JSON.stringify(input);const result=api.planPermanentDelete(input);
  assert.equal(result.ok,true,result.reason);assert.equal(result.changed,true);assert.equal(JSON.stringify(input),before);
  assert.equal(C.validateCheckpoint(result.checkpoint).ok,true);assert.equal(result.checkpoint.undo,null);
  assert.equal(result.checkpoint.state.revision,input.checkpoint.state.revision+1);
  assert.ok(result.writes.every(write=>write.key.startsWith('flow:poc:personal-workspace:v1:')));return result;
}
function blocked(input) {
  const before=JSON.stringify(input);const result=D.planPermanentDelete(input);assert.equal(result.ok,false);
  assert.equal(result.changed,false);assert.equal(result.checkpoint,input.checkpoint);assert.deepEqual(result.writes,[]);
  assert.equal(JSON.stringify(input),before);return result;
}

test('B1D01 selected Plan entry and private capture disappear from current, Undo and serialized after values',()=>{
  const cp=trash(overlay(fixture()));assert.ok(cp.state[META]);assert.ok(cp.undo[META]);
  const result=success(request(cp));assert.equal(own(result.checkpoint.state,META),false);
  for(const raw of [result.checkpointRaw,result.legacyRaw,...result.writes.map(write=>write.afterRaw)]) {
    for(const text of ['TARGET_PRIVATE_PLAN_TITLE','TARGET_PRIVATE_PLAN_MEMO','TARGET_BASELINE_MEMO'])assert.equal(raw.includes(text),false,text);
  }
  assert.equal(result.footprint.active.personalPlanEntries,1);
});
test('B1D02 equal text in another exact Flow owner survives without pruning its capture or overlay',()=>{
  let cp=overlay(fixture());cp=overlay(cp,'memo','TARGET_PRIVATE_PLAN_TITLE');cp=trash(cp);
  const neighborRef=getFlow(cp,'memo').ref;const neighbor=clone(cp.state[META].entries[neighborRef]);
  const result=success(request(cp));assert.deepEqual(result.checkpoint.state[META].entries[neighborRef],neighbor);
  assert.deepEqual(Object.keys(result.checkpoint.state[META].entries),[neighborRef]);
  assert.equal(result.checkpointRaw.includes('TARGET_PRIVATE_PLAN_TITLE'),true);
});
test('B1D03 deleting a different Flow preserves the only Plan metadata entry exactly',()=>{
  const cp=trash(overlay(fixture()),'flow','memo');const metadata=clone(cp.state[META]);
  const result=success(request(cp,'flow','memo'));assert.deepEqual(result.checkpoint.state[META],metadata);
  assert.equal(result.footprint.active.personalPlanEntries,0);
});
test('B1D04 Quick deletion cannot remove independent Flow Plan metadata',()=>{
  const cp=trash(overlay(fixture()),'quick','call');const metadata=clone(cp.state[META]);
  const result=success(request(cp,'quick','call'));assert.deepEqual(result.checkpoint.state[META],metadata);
  assert.equal(result.footprint.active.personalPlanEntries,0);
});
test('B1D05 metadata only in Undo is validated then removed with irreversible Undo cleanup',()=>{
  const cp=trash(overlay(fixture()));const next=clone(cp);delete next.state[META];assert.equal(C.validateCheckpoint(next).ok,true);
  const result=success(request(next));assert.equal(own(result.checkpoint.state,META),false);assert.equal(result.checkpointRaw.includes('TARGET_PRIVATE_PLAN_TITLE'),false);
});
test('B1D06 corrupt current or Undo metadata is not silently removed by deletion',()=>{
  const cp=trash(overlay(fixture()));
  for(const location of ['state','undo'])for(const corrupt of [state=>{state[META].version=999;},state=>{state[META].entries[getFlow(cp).ref].binding.savedCopyId='other';},state=>{state.tasks.find(t=>t.id==='quote').memo='unproven drift';}]){
    const bad=clone(cp);corrupt(bad[location]);blocked(request(bad));
  }
});
test('B1D07 legacy/archive reserved collision and unrelated unknown owner remain blocked',()=>{
  const cp=trash(overlay(fixture()));
  const archive=clone(cp);archive.state.timelineContextV1.legacySnapshot[META]=clone(cp.state[META]);blocked(request(archive));
  const legacy=clone(cp);const base=JSON.parse(legacy.legacyBaseRaw);base.state[META]=clone(cp.state[META]);legacy.legacyBaseRaw=JSON.stringify(base);blocked(request(legacy));
  const unknown=clone(cp);unknown.state.unownedGlobalPrivate={value:'retain'};assert.equal(blocked(request(unknown)).reason,'delete-scope-unproven');
});
test('B1D08 cancel, stale revision and non-trashed Plan preserve exact input and produce no candidate',()=>{
  const cp=trash(overlay(fixture()));const canceled=request(cp);canceled.confirmed=false;blocked(canceled);
  const stale=request(cp);stale.expectedRevision--;blocked(stale);blocked(request(overlay(fixture())));
});
test('B1D09 subsequent normal action and Undo cannot revive deleted Plan data after serialization',()=>{
  const deleted=success(request(trash(overlay(fixture()))));const reloaded=JSON.parse(deleted.checkpointRaw);
  const changed=action(reloaded,{type:'complete',id:'call',done:true,completedAt:NOW});const restored=C.undoCheckpoint(changed);assert.equal(restored.ok,true);
  assert.equal(JSON.stringify(restored).includes('TARGET_PRIVATE_PLAN'),false);assert.equal(C.validateCheckpoint(restored.checkpoint).ok,true);
});
test('B1D10 lazy browser UMD needs P only for metadata and calls no ambient storage or DOM',()=>{
  const sandbox={FlowMeIntegratedPoc:M,FlowPocWorkspaceCheckpoint:C};let access=0;
  for(const name of ['localStorage','document','window'])Object.defineProperty(sandbox,name,{get(){access++;throw new Error(name);}});
  const context=vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('./workspace-permanent-delete.js'),'utf8'),context);
  const api=context.FlowPocWorkspacePermanentDelete;success(request(trash(fixture())),api);
  const cp=trash(overlay(fixture()));assert.equal(api.planPermanentDelete(request(cp)).ok,false);
  context.FlowPocPersonalPlanContext=P;success(request(cp),api);assert.equal(access,0);
  context.FlowPocPersonalPlanContext={...P,VERSION:999};assert.equal(api.planPermanentDelete(request(cp)).ok,false);
});
test('B1D11 same saved-copy display title never authorizes a foreign target tuple',()=>{
  const cp=trash(overlay(fixture()));const input=request(cp);input.target.savedCopyId=getFlow(cp,'memo').savedCopyId;blocked(input);
});
test('B1D12 empty metadata removal does not change remaining execution, order or source facts',()=>{
  const cp=trash(overlay(fixture()));const flowIds=new Set([getFlow(cp).id]);
  const neighbors=clone(cp.state.tasks.filter(t=>!flowIds.has(t.flowId)));const result=success(request(cp));
  assert.deepEqual(result.checkpoint.state.tasks,neighbors);assert.deepEqual(result.checkpoint.state.folders,cp.state.folders);
  assert.equal(result.sourceCandidateRaw,null);assert.equal(result.checkpoint.state.updatedAt,NOW);
  assert.equal(result.checkpoint.state.timelineContextV1.legacySnapshot.tasks.some(t=>t.id==='quote'),false);
});
