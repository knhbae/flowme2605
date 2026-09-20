import test from 'node:test';
import assert from 'node:assert/strict';
import { creatorSourceIdentity, planCreatorSourceOrder as plan, validCreatorSourceIdentity } from './creator-source-order';
import { createProgramData } from './program-data';
import { setProgramCreatorWorking, applyProgramCreatorAction, creatorWorkingFromRecord, handoffProgramCreatorDraft } from './creator-workspace';
import { fingerprintPersonalWorkspacePocAuthoringSource as fp } from '../personal-workspace-poc-authoring';
const selection={start:0,end:0,direction:'none' as const};
function identity(raw:string) {return creatorSourceIdentity(raw,raw.replace(/\r\n?/gu,'\n').split('\n').map((text,i)=>({id:`source-${i}`,text})));}
const late='- [ ] 같은 제목\n  - 날짜: 2026-09-20\n  - 새 속성: 원문 그대로\n  - [x] 확인';
const early='- [ ] 같은 제목\n  - 날짜: 2026-09-15\n  - 새 속성: 원문 그대로\n  - [x] 확인';
test('actual authoring parser moves unknown properties and duplicate subchecks with explicit IDs for LF and CRLF',()=>{
  for(const eol of ['\n','\r\n']) {
    const raw=`# 제목\n## 준비\n${late}\n\n${early}\n## 다음\n메모`.replaceAll('\n',eol), before=identity(raw), copy=structuredClone(before),p=plan(before,2,selection);
    assert.equal(p.status,'ready',JSON.stringify(p));if(p.status!=='ready')continue;
    assert.equal(p.after.rawText,`# 제목\n## 준비\n${early}\n\n${late}\n## 다음\n메모`.replaceAll('\n',eol));
    assert.deepEqual(p.after.lines.slice(2,6).map(l=>l.id),before.lines.slice(7,11).map(l=>l.id));
    assert.equal(validCreatorSourceIdentity(p.after),true);assert.deepEqual(before,copy);
  }
});
test('undated slots remain fixed; dated slots use all-day then time and stable source order',()=>{
  const raw='# 제목\n## 준비\n- [ ] 오후\n  - 날짜: 2026-09-20\n  - 시간: 15:00\n- [ ] 미정\n- [ ] 종일\n  - 날짜: 2026-09-20\n- [ ] 오전\n  - 날짜: 2026-09-20\n  - 시간: 09:00';
  const p=plan(identity(raw),2,selection);assert.equal(p.status,'ready');if(p.status==='ready')assert.deepEqual(p.afterTitles,['종일','미정','오전','오후']);
});
test('selection follows its exact body and malformed/cross-boundary/stale identities are refused',()=>{
  const raw=`# 제목\n## 준비\n${late}\n${early}`,start=raw.indexOf('새 속성'),p=plan(identity(raw),2,{start,end:start+4,direction:'backward'});
  assert.equal(p.status,'ready');if(p.status==='ready'){assert.equal(p.after.rawText.slice(p.selectionAfter.start,p.selectionAfter.end),'새 속성');assert.equal(plan(p.after,2,selection).status,'noop');}
  assert.equal(plan(identity(raw),2,{start,end:raw.length,direction:'forward'}).status,'blocked');
  const bad=identity(raw);bad.lines[0].id=bad.lines[1].id;assert.equal(plan(bad,2,selection).status,'blocked');
  assert.equal(validCreatorSourceIdentity(identity(raw),raw+'x'),false);
  for(const addition of ['설명 소유 불명\n','### 중첩\n'])assert.equal(plan(identity(`# 제목\n## 준비\n${late}\n${addition}${early}`),2,selection).status,'blocked');
});
test('working identity survives explicit save, serialized reopen, and actual execution handoff',()=>{
  let data=createProgramData();const actorId=data.activeActorId,now='2026-09-12T11:00:00.000Z',raw=`# 제목\n## 준비\n${late}\n${early}`,p=plan(identity(raw),2,selection);assert.equal(p.status,'ready');if(p.status!=='ready')return;
  const w={draftId:'order-draft',title:'제목',rawText:p.after.rawText,baseRecordRevision:null,sourceIdentity:p.after};
  const set=setProgramCreatorWorking(data,{actorId,expectedWorking:null,working:w},now);assert.equal(set.ok,true);if(!set.ok)return;data=set.data;
  const saved=applyProgramCreatorAction(data,{actorId,requestId:'save-order',action:{type:'save',draftId:w.draftId,title:w.title,rawText:w.rawText,sourceFingerprint:fp(w.rawText),expectedLibraryRevision:0,now}},now);
  assert.equal(saved.ok,true);if(!saved.ok)return;data=JSON.parse(JSON.stringify(saved.data));
  assert.deepEqual(creatorWorkingFromRecord(data.spaces[actorId].creatorWorkspace!,w.draftId)?.sourceIdentity,p.after);
  const handed=handoffProgramCreatorDraft(data,{actorId,requestId:'handoff-order',draftId:w.draftId,expectedRecordRevision:1,today:'2026-09-12'},now);
  assert.equal(handed.ok,true);if(handed.ok)assert.deepEqual(handed.data.spaces[actorId].creatorWorkspace!.executionSources![w.draftId].revisions[0].sourceLines,p.after.lines);
});
test('sorting an already handed-off source preserves duplicate ordinary native targets and immutable prior revision',()=>{
  let data=createProgramData();const actorId=data.activeActorId,now='2026-09-12T11:00:00.000Z',draftId='existing-order',raw=`# 제목\n## 준비\n${late}\n${early}`;
  function save(rawText:string,sourceIdentity?:ReturnType<typeof identity>){
    const workspace=data.spaces[actorId].creatorWorkspace,revision=workspace?.library.records[draftId]?.recordRevision;
    const set=setProgramCreatorWorking(data,{actorId,expectedWorking:workspace?.working??null,working:{draftId,title:'제목',rawText,baseRecordRevision:revision??null,...(sourceIdentity?{sourceIdentity}:{})}},now);if(!set.ok)throw Error(set.reason);data=set.data;
    const saved=applyProgramCreatorAction(data,{actorId,requestId:`save-${revision??0}`,action:{type:'save',draftId,title:'제목',rawText,sourceFingerprint:fp(rawText),expectedLibraryRevision:data.spaces[actorId].creatorWorkspace!.library.revision,...(revision?{expectedRecordRevision:revision}:{}),now}},now);if(!saved.ok)throw Error(saved.reason);data=saved.data;
    const h=handoffProgramCreatorDraft(data,{actorId,requestId:`handoff-${revision??0}`,draftId,expectedRecordRevision:(revision??0)+1,today:'2026-09-12'},now);if(!h.ok)throw Error(h.reason);data=h.data;
  }
  save(raw);const original=structuredClone(data.spaces[actorId].creatorWorkspace!.executionSources![draftId].revisions[0]);
  const p=plan(creatorSourceIdentity(raw,original.sourceLines),2,selection);assert.equal(p.status,'ready');if(p.status!=='ready')return;
  save(p.after.rawText,p.after);
  const revisions=data.spaces[actorId].creatorWorkspace!.executionSources![draftId].revisions;assert.deepEqual(revisions[0],original);
  assert.deepEqual(revisions[1].rows.map(r=>[r.rowId,r.documentLineId]),[original.rows[1],original.rows[0]].map(r=>[r.rowId,r.documentLineId]));
});
test('stale receipt, duplicate IDs and stale working CAS reject without changing private or public bytes',()=>{
  const data=createProgramData(),actorId=data.activeActorId,now='2026-09-12T11:00:00.000Z',raw=`# 제목\n## 준비\n${late}\n${early}`,bytes=JSON.stringify(data);
  for(const invalid of [ {...identity(raw),sourceFingerprint:'wrong'}, {...identity(raw),rawText:raw+'\n'}, {...identity(raw),lines:identity(raw).lines.map(l=>({...l,id:'same'}))} ]){
    const result=setProgramCreatorWorking(data,{actorId,expectedWorking:null,working:{draftId:'bad-order',title:'제목',rawText:raw,baseRecordRevision:null,sourceIdentity:invalid}},now);assert.equal(result.ok,false);assert.equal(JSON.stringify(data),bytes);
  }
  const w={draftId:'good-order',title:'제목',rawText:raw,baseRecordRevision:null,sourceIdentity:identity(raw)};
  const first=setProgramCreatorWorking(data,{actorId,expectedWorking:null,working:w},now);assert(first.ok);if(!first.ok)return;
  const noop=setProgramCreatorWorking(first.data,{actorId,expectedWorking:w,working:w},now);assert(noop.ok);if(noop.ok)assert.equal(noop.changed,false);
  const stale=setProgramCreatorWorking(first.data,{actorId,expectedWorking:null,working:w},now);assert.equal(stale.ok,false);
  assert.deepEqual(first.data.public,data.public);
});
