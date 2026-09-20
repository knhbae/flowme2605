import test from 'node:test';import assert from 'node:assert/strict';
import { createTextAuthoringDocument } from './native-creator-vendor/text-authoring/parser';
import { createNativeCreatorDocumentOwner,applyNativeCreatorDocumentOperation } from './native-creator-document';
import { createNativeCreatorSourceFocusTarget as targetFor,nativeCreatorSourceFocusRange as rangeFor } from './creator-native-source-focus';
const now='2026-09-12T19:00:00.000Z',raw='# 중복 제목\r\n- [ ] 같은 일\r\n  - 설명: 첫 원문\r\n- [ ] 같은 일\r\n  - 설명: 둘째 원문';
function fixture(){const document=createTextAuthoringDocument(raw,{documentId:'actual-document',ownership:'creator',now}),r=createNativeCreatorDocumentOwner({id:'native-focus',source:{storageKey:'flow:text-authoring:drafts:v1',draftId:'actual-draft',versionId:'actual-version',revisionId:document.revision.revisionId,documentJson:JSON.stringify(document)}},now);assert(r.ok);return r.owner;}
test('exact native item lineage returns CRLF source range and LF textarea offsets without title matching',()=>{
  const owner=fixture(),item=owner.document.parseResult.canonical.items[1],before=JSON.stringify(owner),target=targetFor(owner,item.itemId);assert(target);
  assert.deepEqual(target.sourceRowIds,item.sourceRowIds);assert.equal(target.ownerRevision,owner.revision);assert(target.rawText.slice(target.startOffset,target.endOffset).includes('둘째 원문'));
  const range=rangeFor(owner,target);assert(range);assert.equal(raw.replaceAll('\r\n','\n').slice(range.start,range.end),raw.slice(target.startOffset,target.endOffset).replaceAll('\r\n','\n'));assert.equal(JSON.stringify(owner),before);
});
test('stale owner, wrong row, wrong offsets or different document never choose a nearby source line',()=>{
  const owner=fixture(),target=targetFor(owner,owner.document.parseResult.canonical.items[0].itemId);assert(target);
  for(const change of [{ownerRevision:999},{documentId:'other'},{rawText:raw+'x'},{sourceRowIds:[]},{startOffset:target.startOffset+1},{itemId:'missing'}])assert.equal(rangeFor(owner,{...target,...change}),null);
  const edited=applyNativeCreatorDocumentOperation(owner,{expectedOwner:owner,requestId:'renamed',operation:{type:'rename',itemId:target.itemId,title:'바뀐 제목'}},now);assert(edited.ok);assert.equal(rangeFor(edited.owner,target),null);assert.equal(targetFor(owner,'missing'),null);
});
test('canonical reorder retains the exact original source locator',()=>{
  const owner=fixture(),itemId=owner.document.parseResult.canonical.items[1].itemId,initial=targetFor(owner,itemId);assert(initial);
  const result=applyNativeCreatorDocumentOperation(owner,{expectedOwner:owner,requestId:'reorder',operation:{type:'reorder',itemId,toIndex:0}},now);assert(result.ok);
  const target=targetFor(result.owner,itemId);assert(target);assert.equal(target.startOffset,initial.startOffset);assert.deepEqual(target.sourceRowIds,initial.sourceRowIds);
});
