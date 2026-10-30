import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_SCHEMA } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { ALPHA_SCHEMA, ALPHA_LIMITS, type AlphaAccount } from './alpha-persistence/contract';
import { canonicalJson } from './alpha-persistence/json';
import { isAccountForOwner } from './alpha-auth/account-access';
import { CATALOG_LIBRARY_VERSION } from './catalog-library';
import { buildCatalogLibrarySnapshot } from './catalog-library-source';
import { ALPHA_CREATOR_COMMAND_SCHEMA, isAlphaCreatorCommand, type AlphaCreatorCommand } from './alpha-creator/contract';
import { dispatchAlphaCreatorCommand } from './alpha-creator/dispatch-source';
import { preservesAlphaCreatorBoundary } from './alpha-creator/boundary';
import { isM3Command } from './alpha-sync/contract';
import { buildCatalogContent } from './catalog-content-source';
const OWNER='11111111-1111-4111-8111-111111111111', NOW='2026-09-23T06:00:00.000Z';
const empty=():AlphaAccount=>({schema:ALPHA_SCHEMA,ownerId:OWNER,revision:0,source:{schema:PROGRAM_SCHEMA,actorId:OWNER,revision:0},space:createProgramPrivateSpace(),legacyReceipts:[],legacyUndo:[]});
const command=(a:AlphaAccount):AlphaCreatorCommand=>({schema:ALPHA_CREATOR_COMMAND_SCHEMA,kind:'creator',requestId:'full-catalog-test',expectedRevision:a.revision,intent:{type:'catalog-library-import',catalogVersion:CATALOG_LIBRARY_VERSION,now:NOW}});
function applied(a=empty()) { const result=dispatchAlphaCreatorCommand(a,command(a));assert(result.ok,JSON.stringify(result));const next=structuredClone(a);for(const c of result.changes){assert(c.present);Object.assign(next.space,{[c.field]:c.value});}assert(isAccountForOwner(next,OWNER));return {next,result}; }
test('full content is a single immutable private field; no creator/personal/source/public mutation',()=>{
 const a=empty(),before=canonicalJson(a),{next,result}=applied(a);
 assert.deepEqual(result.changes.map(c=>c.field),['catalogLibrary']);assert.equal(next.space.catalogLibrary!.bundles.length,177);assert.equal(next.space.catalogLibrary!.maps.length,26);
 assert.deepEqual(next.space.catalogLibrary,buildCatalogLibrarySnapshot(NOW));delete next.space.catalogLibrary;assert.equal(canonicalJson(next),before);assert.equal(canonicalJson(a),before);
 assert(Buffer.byteLength(canonicalJson(result.changes))<ALPHA_LIMITS.bytes/10);
});
test('repeat intake at a later time is no-op, not a second copy or overwritten timestamp',()=>{
 const {next}=applied();const c=command(next);c.intent.now='2026-09-24T06:00:00.000Z';c.requestId='other-request';const before=canonicalJson(next),r=dispatchAlphaCreatorCommand(next,c);assert(r.ok);assert.equal(r.changed,false);assert.deepEqual(r.changes,[]);assert.equal(canonicalJson(next),before);
});
test('unknown version, extra actor/content payload and stale revision fail closed',()=>{
 const a=empty(),c=command(a);assert.equal(isAlphaCreatorCommand({...c,intent:{...c.intent,actorId:OWNER}}),false);assert.equal(isAlphaCreatorCommand({...c,intent:{...c.intent,bundles:[]}}),false);
 assert.equal(dispatchAlphaCreatorCommand(a,{...c,intent:{type:'catalog-library-import',catalogVersion:'other',now:NOW}}).ok,false);
 assert.deepEqual(dispatchAlphaCreatorCommand(a,{...c,expectedRevision:1}),{ok:false,reason:'revision-conflict'});
});
test('ordinary execution and working commands cannot create or change catalog source',()=>{
 const a=empty(),{next}=applied(a);assert.equal(isM3Command({schema:'flowme-alpha-command/1',kind:'change-private',requestId:'bad',expectedRevision:0,changes:[{field:'catalogLibrary',present:true,value:next.space.catalogLibrary}]}),false);
 assert.equal(preservesAlphaCreatorBoundary(a,next,{type:'working',working:null,now:NOW}),false);
 const altered=structuredClone(next);altered.space.catalogLibrary!.bundles[0].flow.title='forged';assert.equal(isAccountForOwner(altered,OWNER),false);
 assert.equal(preservesAlphaCreatorBoundary(a,altered,command(a).intent),false);
 const personal=structuredClone(next);personal.space.position={...personal.space.position,folderId:'new-folder'} as typeof personal.space.position;assert.equal(preservesAlphaCreatorBoundary(a,personal,command(a).intent),false);
});
test('existing editable content and unsaved working text survive the full source intake exactly',()=>{
 const a=empty(),source=buildCatalogContent('moving-d30-basic');assert(source.ok);
 const first=dispatchAlphaCreatorCommand(a,{...command(a),intent:{type:'catalog-content-import',draftId:'old-editable',sourceSlug:'moving-d30-basic',sourceVersionId:source.content.versionId,now:NOW}});assert(first.ok);
 for(const c of first.changes){assert(c.present);Object.assign(a.space,{[c.field]:c.value});}
 const creator=canonicalJson(a.space.creatorWorkspace),{next}=applied(a);assert.equal(canonicalJson(next.space.creatorWorkspace),creator);
 const opened=dispatchAlphaCreatorCommand(next,{...command(next),intent:{type:'working',now:NOW,working:{draftId:'unsaved',title:'내 글',rawText:'보존할 글',baseRecordRevision:null}}});assert(opened.ok);assert.equal(opened.changes.some(c=>c.field==='catalogLibrary'),false);
});
test('content snapshot contains no imported personal completion/memos and keeps static check meaning',()=>{
 const {next}=applied();assert.equal(next.space.text.documents.length,0);assert.equal(next.space.text.flows.length,0);assert.equal(next.space.savedBindings.length,0);
 assert.equal(next.space.catalogLibrary!.bundles.flatMap(b=>b.items).filter(i=>i.status==='check').length,13);
 assert(next.space.catalogLibrary!.bundles.every(b=>!Object.hasOwn(b.flow,'copy_count')&&!Object.hasOwn(b.flow,'usage_count')));
});
