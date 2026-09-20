import test from 'node:test';
import assert from 'node:assert/strict';
import { createTextAuthoringDocument } from './native-creator-vendor/text-authoring/parser';
import { createNativeCreatorDocumentOwner, applyNativeCreatorDocumentOperation, readNativeCreatorDocument } from './native-creator-document';
import { previewProgramCreatorSource } from './creator-workspace';
import { planCreatorCalendarSourceOrder } from './creator-calendar-source-order';
import { creatorSourceIdentity } from './creator-source-order';
import type { ProgramCreatorWorking } from './creator-workspace-contract';
import type { AuthoringCorrectionOperation } from './native-creator-document-contract';

const now='2026-09-12T19:00:00.000Z',today='2026-09-12';
const raw='# 실제 제작\r\n## 준비\r\n- [ ] 늦은 일\r\n  - 날짜: 2026-09-20\r\n- [ ] 빠른 일\r\n  - 날짜: 2026-09-15';
function fixture():ProgramCreatorWorking {
  const document=createTextAuthoringDocument(raw,{documentId:'actual-native-document',ownership:'creator',now,reviewRequirements:[{kind:'rights',reasonKey:'source-rights'}]});
  const native=createNativeCreatorDocumentOwner({id:'program-native-preview',source:{storageKey:'flow:text-authoring:drafts:v1',draftId:'original-draft',versionId:'original-saved-version',revisionId:document.revision.revisionId,documentJson:JSON.stringify(document)}},now);assert(native.ok);
  return{draftId:native.owner.id,title:document.title,rawText:raw,baseRecordRevision:1,nativeDocument:native.owner};
}
function change(w:ProgramCreatorWorking,operation:AuthoringCorrectionOperation){
  const native=applyNativeCreatorDocumentOperation(w.nativeDocument!,{expectedOwner:w.nativeDocument!,requestId:`preview-${operation.type}`,operation},now);assert(native.ok);
  return{...w,rawText:native.owner.document.rawText,nativeDocument:native.owner};
}
test('native preview returns the actual canonical projection, never a raw materializer surrogate',()=>{
  let w=fixture();const itemId=w.nativeDocument!.document.parseResult.canonical.items[0].itemId;
  w=change(w,{type:'exclude',itemId});const before=JSON.stringify(w),preview=previewProgramCreatorSource(w,today,now);
  assert.equal(preview.kind,'native');assert.equal(preview.materialized,null);assert.equal(preview.result,null);assert(preview.native?.ok);
  assert.deepEqual(preview.native,readNativeCreatorDocument(w.nativeDocument!));
  assert(!preview.native.projection.artifacts.calendar.rows.some(row=>row.itemId===itemId));assert.equal(preview.native.projection.counts.excluded,1);
  assert.equal(JSON.stringify(w),before);assert.equal(w.rawText,raw);
});
test('same raw role and canonical order edits remain distinct from the source text',()=>{
  let w=fixture();const items=w.nativeDocument!.document.parseResult.canonical.items;
  w=change(w,{type:'change_role',itemId:items[0].itemId,role:'guide'});
  w=change(w,{type:'reorder',itemId:items[1].itemId,toIndex:0});const preview=previewProgramCreatorSource(w,today,now);assert(preview.native?.ok);
  assert.equal(w.rawText,raw);assert.equal(preview.native.document.parseResult.canonical.items[0].itemId,items[1].itemId);
  assert.equal(preview.native.document.parseResult.canonical.items.find(i=>i.itemId===items[0].itemId)!.role,'guide');
  assert(!preview.native.projection.artifacts.todo.rows.some(row=>row.itemId===items[0].itemId));
  assert.deepEqual(preview.native.document.reviewGates,w.nativeDocument!.document.reviewGates);
});
test('pending native raw is explicit and does not replace the last applied structure',()=>{
  const w={...fixture(),nativePendingRawText:'새로 쓴 메모'},preview=previewProgramCreatorSource(w,today,now);assert(preview.native?.ok);
  assert.equal(preview.pendingRaw,true);assert.equal(preview.native.document.rawText,raw);assert.equal(w.nativePendingRawText,'새로 쓴 메모');
});
test('corrupt native owner or mismatched canonical raw never falls back to a plausible raw result',()=>{
  const w=fixture();
  for(const bad of [{...w,rawText:raw+'\n새 항목'},{...w,nativeDocument:{...w.nativeDocument!,revision:999}}]){
    const before=JSON.stringify(bad),preview=previewProgramCreatorSource(bad,today,now);assert.equal(preview.kind,'native');assert.equal(preview.native?.ok,false);
    assert.equal(preview.materialized,null);assert.equal(preview.result,null);assert.equal(JSON.stringify(bad),before);
  }
});
test('native Calendar alignment requests the canonical operation rather than a raw-only rewrite',()=>{
  const w=fixture(),identity=creatorSourceIdentity(raw,raw.split('\r\n').map((text,i)=>({id:`source-${i}`,text}))),before=JSON.stringify([w,identity]);
  assert.deepEqual(planCreatorCalendarSourceOrder(w,identity,2,{start:0,end:0,direction:'none'},today,now),{status:'blocked',reason:'native-calendar-operation-required'});
  assert.equal(JSON.stringify([w,identity]),before);
});
test('raw-only authoring retains its materializer and result path',()=>{
  const w=fixture();delete w.nativeDocument;const preview=previewProgramCreatorSource(w,today,now);
  assert.equal(preview.kind,'raw');assert(preview.materialized?.ok);assert(preview.result?.ok);assert.equal(preview.native,null);assert.equal(preview.pendingRaw,false);
});
