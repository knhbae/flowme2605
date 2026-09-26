import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_SCHEMA } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { canonicalJson } from './alpha-persistence/json';
import { isAccountForOwner } from './alpha-auth/account-access';
import { buildCatalogContent, CATALOG_CONTENT_SLUGS, CATALOG_CONTENT_V2_SLUGS, CATALOG_CONTENT_V3_SLUGS } from './catalog-content-source';
import { buildCatalogLibrarySnapshot } from './catalog-library-source';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { inspectProgramNativeCreatorHandoff } from './creator-native-execution-adapter';
import { fingerprintPersonalWorkspacePocAuthoringSource as fingerprint } from '../personal-workspace-poc-authoring';
import { textWorkspaceModel as M } from './text-workspace';
import { readNativeCreatorSourceDocument } from './native-creator-document';
import { isNativeCreatorCatalogContentSource, type NativeCreatorCatalogContentSource } from './native-creator-document-contract';
import { validateProgramCreatorNativeContext } from './creator-native-context';
import { creatorWorkingFromRecord } from './creator-workspace';
import { ALPHA_CREATOR_COMMAND_SCHEMA, isAlphaCreatorCommand, type AlphaCreatorCommand, type AlphaCreatorIntent } from './alpha-creator/contract';
import { dispatchAlphaCreatorCommand } from './alpha-creator/dispatch-source';
import { preservesAlphaCreatorBoundary } from './alpha-creator/boundary';
const OWNER='11111111-1111-4111-8111-111111111111', NOW='2026-09-23T05:00:00.000Z';
const empty=():AlphaAccount=>({schema:ALPHA_SCHEMA,ownerId:OWNER,revision:0,source:{schema:PROGRAM_SCHEMA,actorId:OWNER,revision:0},space:createProgramPrivateSpace(),legacyReceipts:[],legacyUndo:[]});
const command=(a:AlphaAccount,intent:AlphaCreatorIntent):AlphaCreatorCommand=>({schema:ALPHA_CREATOR_COMMAND_SCHEMA,kind:'creator',requestId:`import-test-${a.revision}`,expectedRevision:a.revision,intent});
function intent(slug:string=CATALOG_CONTENT_SLUGS[0],draftId='imported'):AlphaCreatorIntent {
 const source=buildCatalogContent(slug);assert(source.ok);
 return {type:'catalog-content-import',draftId,sourceSlug:slug,sourceVersionId:source.content.versionId,now:NOW};
}
function commit(a:AlphaAccount,i:AlphaCreatorIntent){
 const bytes=canonicalJson(a),r=dispatchAlphaCreatorCommand(a,command(a,i));assert(r.ok,JSON.stringify(r));assert.equal(canonicalJson(a),bytes);
 const next=structuredClone(a);for(const c of r.changes){if(c.present)Object.assign(next.space,{[c.field]:c.value});else delete next.space[c.field];}
 if(r.changed)next.revision++;assert(isAccountForOwner(next,OWNER));return {account:next,result:r};
}
function withoutCreator(a:AlphaAccount){const copy=structuredClone(a);delete copy.space.creatorWorkspace;copy.revision=0;return canonicalJson(copy);}

test('two explicit content imports create 2 private drafts, 30 items, 9 sections and nothing personal/public',()=>{
 let account=empty();const before=withoutCreator(account);
 for(const [n,slug] of CATALOG_CONTENT_SLUGS.entries()){
  const applied=commit(account,intent(slug,`imported-${n}`));account=applied.account;
  assert.deepEqual(applied.result.changes.map(c=>c.field),['creatorWorkspace']);
 }
 const w=account.space.creatorWorkspace!;assert.equal(Object.keys(w.library.records).length,2);assert.equal(w.working,null);
 let items=0,sections=0;
 for(const [id,context] of Object.entries(w.structureDrafts!)){
  const owner=context.nativeDocument!,source=owner.source;assert(isNativeCreatorCatalogContentSource(source));
  const expected=buildCatalogContent(source.sourceSlug);assert(expected.ok);
  assert.deepEqual(JSON.parse(source.contentJson),expected.content);
  assert.deepEqual(readNativeCreatorSourceDocument(source),expected.document);
  items+=owner.document.parseResult.canonical.items.length;sections+=owner.document.parseResult.canonical.steps.length;
  assert.deepEqual(owner.actions,[]);assert.equal(w.library.records[id].recordRevision,1);
  assert.equal(w.savedHistory!.drafts[id].length,1);
  assert(owner.document.parseResult.canonical.items.every(row=>!row.sourceChecked));
 }
 assert.equal(items,30);assert.equal(sections,9);assert.equal(withoutCreator(account),before);
});

test('second import is no-op even after serialization or with a new proposed draft id',()=>{
 const a=commit(empty(),intent()).account;
 for(const value of [a,JSON.parse(JSON.stringify(a))]){
  const r=commit(value,intent(CATALOG_CONTENT_SLUGS[0],'not-a-duplicate'));
  assert.equal(r.result.changed,false);assert.equal(r.result.result,'imported');assert.deepEqual(r.result.changes,[]);assert.deepEqual(r.account,a);
 }
});

test('content intake preserves unsaved working text and rejects identity collision',()=>{
 const working={draftId:'unfinished',title:'내 글',rawText:'아직 쓰는 중\r\n',baseRecordRevision:null};
 const a=commit(empty(),{type:'working',working,now:NOW}).account;
 const b=commit(a,intent()).account;assert.deepEqual(b.space.creatorWorkspace!.working,working);
 assert(!dispatchAlphaCreatorCommand(a,command(a,intent(CATALOG_CONTENT_SLUGS[0],'unfinished'))).ok);
});

test('invalid locator, stale version, extra owner/content and stale account cannot mutate',()=>{
 const a=empty(),i=intent(),good=command(a,i),bytes=canonicalJson(a);
 for(const patch of [{sourceSlug:'other'}, {sourceVersionId:'old-version'}])assert(!dispatchAlphaCreatorCommand(a,{...good,intent:{...i,...patch} as AlphaCreatorIntent}).ok);
 for(const patch of [{ownerId:OWNER},{contentJson:'{}'},{working:null}])assert(!isAlphaCreatorCommand({...good,intent:{...i,...patch}}));
 assert.deepEqual(dispatchAlphaCreatorCommand(a,{...good,expectedRevision:1}),{ok:false,reason:'revision-conflict'});assert.equal(canonicalJson(a),bytes);
});

test('embedded source tampering and generic working-source injection fail closed',()=>{
 const a=commit(empty(),intent()).account,w=a.space.creatorWorkspace!,original=w.structureDrafts!.imported.nativeDocument!.source;
 assert(isNativeCreatorCatalogContentSource(original));
 for(const mutate of [(s:NativeCreatorCatalogContentSource)=>s.documentJson='{}',(s:NativeCreatorCatalogContentSource)=>s.contentJson='{}',(s:NativeCreatorCatalogContentSource)=>s.sourceSlug='other',(s:NativeCreatorCatalogContentSource)=>s.versionId='forged']){
  const bad:NativeCreatorCatalogContentSource=structuredClone(original);mutate(bad);assert.equal(readNativeCreatorSourceDocument(bad),null);
 }
 const working=creatorWorkingFromRecord(w,'imported');assert(working);
 assert(validateProgramCreatorNativeContext(working.nativeDocument,original,'imported',working.rawText));
 assert(!validateProgramCreatorNativeContext(working.nativeDocument,{...original,versionId:'forged'},'imported',working.rawText));
 assert(!dispatchAlphaCreatorCommand(empty(),command(empty(),{type:'working',working,now:NOW})).ok);
 const modified=structuredClone(a);modified.space.text.documents.push({id:'forged'} as any);
 assert(!preservesAlphaCreatorBoundary(a,modified,intent()));
});

test('archived imported content is not silently duplicated or unarchived',()=>{
 let a=commit(empty(),intent()).account;const lib=a.space.creatorWorkspace!.library;
 a=commit(a,{type:'library-action',now:NOW,action:{type:'archive',draftId:'imported',expectedLibraryRevision:lib.revision,expectedRecordRevision:1,now:NOW}}).account;
 const bytes=canonicalJson(a);assert(!dispatchAlphaCreatorCommand(a,command(a,intent(CATALOG_CONTENT_SLUGS[0],'new-id'))).ok);assert.equal(canonicalJson(a),bytes);
});

test('imported draft opens, duplicates, renames, archives and restores with exact source retained',()=>{
 let a=commit(empty(),intent()).account;const source=structuredClone(a.space.creatorWorkspace!.structureDrafts!.imported.nativeDocument!.source);
 const working=creatorWorkingFromRecord(a.space.creatorWorkspace!,'imported');assert(working);
 a=commit(a,{type:'working',working,now:NOW}).account;
 let library=a.space.creatorWorkspace!.library;
 a=commit(a,{type:'library-action',now:NOW,action:{type:'duplicate',sourceDraftId:'imported',newDraftId:'copy',expectedLibraryRevision:library.revision,expectedSourceRecordRevision:1,now:NOW}}).account;
 for(const type of ['rename','archive','restore'] as const){library=a.space.creatorWorkspace!.library;const base={draftId:'copy',expectedLibraryRevision:library.revision,expectedRecordRevision:library.records.copy.recordRevision,now:NOW};
  a=commit(a,{type:'library-action',now:NOW,action:type==='rename'?{...base,type,title:'내 관리 사본'}:{...base,type}}).account;
 }
 assert.deepEqual(a.space.creatorWorkspace!.structureDrafts!.copy.nativeDocument!.source,source);
 assert.equal(a.space.creatorWorkspace!.library.records.copy.title,'내 관리 사본');assert.equal(withoutCreator(a),withoutCreator(empty()));
});

for (const slug of [...CATALOG_CONTENT_SLUGS, ...CATALOG_CONTENT_V2_SLUGS, ...CATALOG_CONTENT_V3_SLUGS]) test(`catalog editing lifecycle preserves source through import/edit/save/preview/handoff/reload: ${slug}`, () => {
 const initial=empty(); initial.space.catalogLibrary=buildCatalogLibrarySnapshot(NOW);
 const library=canonicalJson(initial.space.catalogLibrary), source=buildCatalogContent(slug); assert(source.ok);
 let a=commit(initial,intent(slug)).account;
 assert.equal(canonicalJson(a.space.text),canonicalJson(initial.space.text));
 assert.equal(commit(a,intent(slug,'second-id')).result.changed,false);
 const original=canonicalJson(a.space.creatorWorkspace!.structureDrafts!.imported.nativeDocument!.source);
 a=commit(a,{type:'working',working:creatorWorkingFromRecord(a.space.creatorWorkspace!,'imported'),now:NOW}).account;
 const first=a.space.creatorWorkspace!.working!.nativeDocument!.document.parseResult.canonical.items[0];
 a=commit(a,{type:'native-operation',draftId:'imported',operation:{type:'rename',itemId:first.itemId,title:'내가 편집한 항목'},now:NOW}).account;
 const w=a.space.creatorWorkspace!,working=w.working!;
 a=commit(a,{type:'library-action',now:NOW,action:{type:'save',draftId:'imported',title:working.title,rawText:working.rawText,sourceFingerprint:fingerprint(working.rawText),expectedLibraryRevision:w.library.revision,expectedRecordRevision:working.baseRecordRevision!,now:NOW}}).account;
 const refs={actorIds:[OWNER],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}};
 const data=materializeAccount(a,refs).data, beforePreview=canonicalJson(a);
 const preview=inspectProgramNativeCreatorHandoff(data,{actorId:OWNER,draftId:'imported',anchor:'2026-10-01'},NOW); assert(preview.ok);
 assert.equal(canonicalJson(a),beforePreview); assert.equal(preview.preview.rows.length,source.content.bundle.items.length);
 const allKeep=Object.fromEntries(preview.preview.rows.map(row=>[row.itemId,{source:'keep',date:'keep',time:'keep',children:'keep'} as const]));
 assert.equal(commit(a,{type:'native-handoff',draftId:'imported',anchor:'2026-10-01',choices:allKeep,now:NOW}).result.changed,false);
 const incoming=Object.fromEntries(preview.preview.rows.map(row=>[row.itemId,{source:'incoming',date:'incoming',time:'incoming',children:'incoming'} as const]));
 const applied=commit(a,{type:'native-handoff',draftId:'imported',anchor:'2026-10-01',choices:incoming,now:NOW}); a=applied.account;
 assert.equal(a.space.text.documents.length,initial.space.text.documents.length+1);
 const tasks=M.tasks(a.space.text); assert.equal(tasks.length,source.content.bundle.items.length); assert(tasks.some(t=>t.title==='내가 편집한 항목'));
 const owner=a.space.creatorWorkspace!.nativeExecutionSources!.imported;
 assert.equal(canonicalJson(owner.revisions[0].nativeDocument.source),original);
 assert.equal(canonicalJson(a.space.creatorWorkspace!.structureDrafts!.imported.nativeDocument!.source),original);
 for (const row of preview.preview.rows) { const task=tasks.find(t=>t.title===row.title); assert(task); assert.equal(task.date??null,row.sourceDate); }
 assert.equal(canonicalJson(a.space.catalogLibrary),library);
 const loaded=JSON.parse(JSON.stringify(a)); assert(isAccountForOwner(loaded,OWNER));
 assert.equal(commit(loaded,intent(slug,'third-id')).result.changed,false);
 assert.equal(canonicalJson(loaded.space.catalogLibrary),library);
 // Personal and public state not involved in this lifecycle remains exact.
 for (const field of Object.keys(initial.space) as (keyof typeof initial.space)[]) {
  if(['creatorWorkspace','text'].includes(field))continue;
  assert.equal(canonicalJson(a.space[field]),canonicalJson(initial.space[field]),field);
 }
});
