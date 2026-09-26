import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { createAlphaPreservationHandler } from './preservation-handler';
import { signAlphaCommand } from './command-handler';
import { createProgramPrivateSpace } from '../program-data';
import { createAlphaSyntheticFixtures } from '../alpha-persistence/synthetic-fixtures';
import { canonicalJson, sha256 } from '../alpha-persistence/json';
import { alphaSocialReferences, type AlphaSocialContext } from '../alpha-social/projection';
import { prepareLocalImport } from '../alpha-preservation/import';
import { PRESERVATION_PROTOCOL, SEALED_BACKUP_SCHEMA, type PreservationCommand } from '../alpha-preservation/contract';
import { validateAccountBackup } from '../alpha-preservation/backup';
import { newProgramParticipationDraft } from '../participation-editor';
import type { AlphaAccount } from '../alpha-persistence/contract';
import { BACKUP_FILE_SCHEMA, decodeBackupFile, encodeBackupFile } from '../alpha-preservation/file-codec';
import { BACKUP_DOWNLOAD_FORMAT, BACKUP_DOWNLOAD_SCHEMA } from '../alpha-preservation/backup-download';
import { preparePreservationWireRequest } from '../alpha-preservation/transport';
import { buildCatalogLibrarySnapshot } from '../catalog-library-source';
import { summarizePreservationContent } from '../alpha-preservation/content-summary';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const alias = 'member-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const key = 'ab'.repeat(32), token = 'fixture-only-no-real-secret-token';
const origin = 'http://localhost:3104';
const env = { FLOWME_ALPHA_ENABLED:'development-only',FLOWME_ALPHA_STAGE:'development',FLOWME_ALPHA_PROJECT_REF:'wkmzcxpnojobxrgebapw',
  FLOWME_ALPHA_SUPABASE_URL:'https://wkmzcxpnojobxrgebapw.supabase.co',FLOWME_ALPHA_PUBLISHABLE_KEY:'sb_publishable_fixture',
  FLOWME_ALPHA_REDIRECT_URL:`${origin}/auth/callback`,FLOWME_ALPHA_M3_SIGNING_KEY:key };
type Operation = {owner_id:string;request_id:string;command:PreservationCommand;receipt:Record<string,unknown>;inverse:unknown[];undone:boolean};
type Archive = {owner_id:string;source_sha256:string;source_raw:string;source_actor_id:string;receipt:Record<string,unknown>;created_at:string};
function fixture() {
  const account:AlphaAccount = {schema:'flowme-alpha-account/1',ownerId:owner,revision:0,
    source:{schema:'flowme-integrated-product-poc/1',actorId:owner,revision:0},space:createProgramPrivateSpace(),legacyUndo:[],legacyReceipts:[]};
  const context:AlphaSocialContext = {schema:'flowme-alpha-social-context/1',revision:0,ownActorId:alias,
    actors:[{id:alias,name:'Participant'}],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}};
  const state={account,context,operations:[] as Operation[],importArchives:[] as Archive[],calls:[] as string[],commits:[] as any[],
    writes:0,revoked:false,reads:0,changeOnSecondRead:false,oversizedRead:false,files:new Map<string,Uint8Array>(),
    preserved:new Map<string,Uint8Array>(),eligible:new Set<string>(),foreign:new Set<string>()};
  const fetcher:typeof fetch = async (url,init) => {
    const path=new URL(String(url)).pathname; state.calls.push(path);
    assert.equal(new Headers(init?.headers).get('authorization'),`Bearer ${token}`);
    const body=typeof init?.body==='string'?JSON.parse(init.body):undefined;
    const ok=(value:unknown)=>Response.json({ok:true,value});
    const fail=(reason:string)=>Response.json({ok:false,reason});
    if(path==='/auth/v1/user')return state.revoked?Response.json({}, {status:401}):Response.json({id:owner,is_anonymous:false});
    if(path.endsWith('flowme_alpha_preservation_read_v1')){
      assert.equal(body.read_text,canonicalJson({schema:'flowme-alpha-preservation-read/1'}));
      assert.equal(body.proof,signAlphaCommand(owner,body.read_text,key));
      state.reads++;if(state.changeOnSecondRead&&state.reads===2)state.context.revision++;
      if(state.oversizedRead)return new Response(' '.repeat(PRESERVATION_PROTOCOL.bytes+1)+'{}');
      return ok({account:state.account,context:state.context,operations:state.operations,importArchives:state.importArchives});
    }
    if(path.endsWith('flowme_alpha_lookup_v1'))return ok(state.operations.find(row=>row.request_id===body.request_id)?.receipt??null);
    if(path.endsWith('flowme_alpha_preserved_media_check_v1')) {
      assert.equal(body.proof,signAlphaCommand(owner,body.check_text,key));
      return JSON.parse(body.check_text).files.every((file:any)=>state.eligible.has(file.id)&&!state.foreign.has(file.id))?ok(true):fail('missing-file');
    }
    if(path.endsWith('flowme_alpha_preserved_media_read_v1')) {
      const bytes=state.preserved.get(body.media_id);
      return bytes?ok({id:body.media_id,mime:'image/webp',bytes:bytes.length,sha256:await sha256(bytes),base64:Buffer.from(bytes).toString('base64')}):fail('not-found');
    }
    if(/flowme_alpha_preservation_execute_v[12]$/.test(path)){
      assert.equal(body.proof,signAlphaCommand(owner,body.commit_text,key));
      assert(Buffer.byteLength(body.commit_text)<=PRESERVATION_PROTOCOL.bytes);
      const commit=JSON.parse(body.commit_text),command=commit.command as PreservationCommand;state.commits.push(commit);
      // Mirror the SQL archive precondition BEFORE replay to catch null-archive retry bugs.
      if(command.mode==='import'&&(!commit.archive||await sha256(new TextEncoder().encode(commit.archive.sourceRaw))!==command.sourceSha256))return fail('invalid');
      const old=state.operations.find(row=>row.request_id===command.requestId);
      if(old)return canonicalJson(old.command)===canonicalJson(command)?ok(old.receipt):fail('idempotency-conflict');
      const imported=command.mode==='import'&&state.importArchives.find(row=>row.source_sha256===command.sourceSha256);
      if(imported)return ok(imported.receipt);
      if(command.expectedRevision!==state.account.revision||command.expectedPublicRevision!==state.context.revision)return fail('revision-conflict');
      if(canonicalJson(commit.space)===canonicalJson(state.account.space)&&!commit.files?.length)return fail('no-change');
      for(const file of commit.files??[])if(!state.eligible.has(file.id)||state.foreign.has(file.id))return fail('missing-file');
      for(const file of commit.files??[])state.preserved.set(file.id,new Uint8Array(Buffer.from(file.base64,'base64')));
      state.account={...state.account,space:structuredClone(commit.space),revision:state.account.revision+1};state.writes++;
      const receipt={requestId:command.requestId,revision:state.account.revision,changed:true,kind:'preservation',publicRevision:state.context.revision};
      state.operations.push({owner_id:owner,request_id:command.requestId,command,receipt,inverse:[],undone:false});
      if(command.mode==='import')state.importArchives.push({owner_id:owner,source_sha256:command.sourceSha256,source_raw:commit.archive.sourceRaw,
        source_actor_id:commit.archive.actorId,receipt,created_at:'2026-09-21T14:00:00.000Z'});
      return ok(receipt);
    }
    if(path.endsWith('flowme_alpha_social_media_read_v1')){
      const bytes=state.files.get(body.media_id);if(bytes)state.eligible.add(body.media_id);return bytes?ok({id:body.media_id,path:`media/${body.media_id}.webp`,bytes:bytes.length,sha256:await sha256(bytes)}):fail('not-found');
    }
    if(path.startsWith('/storage/v1/object/authenticated/')){
      const id=path.split('/').at(-1)!.replace(/\.webp$/,'');const bytes=state.files.get(id);
      return bytes?new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/webp'}}):new Response(null,{status:404});
    }
    throw Error(`Unexpected external path: ${path}`);
  };
  const handler=createAlphaPreservationHandler(env,fetcher);
  const request=(payload:unknown)=>new Request(`${origin}/api/alpha/preservation`,{method:'POST',headers:{Origin:origin,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const send=async(payload:Record<string,unknown>)=>{const response=await handler(request({client:PRESERVATION_PROTOCOL.client,...payload}));return {status:response.status,...await response.json()};};
  return {state,handler,request,send};
}
async function source(f:ReturnType<typeof fixture>){
  const input=createAlphaSyntheticFixtures()[0],prepared=await prepareLocalImport(canonicalJson(input.envelope),input.actorId,f.state.account,alphaSocialReferences(f.state.context,owner));
  assert(prepared.ok);return {sourceRaw:prepared.archive.sourceRaw,actorId:prepared.archive.actorId,sourceSha256:prepared.sourceSha256};
}
function command(hash:string,requestId='import-1',mode:'import'|'restore'='import',revision=0):PreservationCommand{
  return {schema:PRESERVATION_PROTOCOL.schema,kind:'preservation',requestId,mode,sourceSha256:hash,expectedRevision:revision,expectedPublicRevision:0};
}

test('preservation backup and import preview are zero-write, owner-scoped and sealed',async()=>{
  const f=fixture(),raw=await source(f),before=canonicalJson(f.state.account);
  const preview=await f.send({kind:'preview',mode:'import',sourceRaw:raw.sourceRaw,actorId:raw.actorId});assert(preview.ok&&preview.value.canApply);
  assert.deepEqual(preview.value.content.current,summarizePreservationContent(f.state.account.space));
  assert.equal(preview.value.content.next.documents,preview.value.documents);
  assert(preview.value.content.next.documents>preview.value.content.current.documents);
  assert.equal(preview.value.content.next.savedFlows,preview.value.savedFlows);
  const result=await f.send({kind:'backup'});assert(result.ok);assert.equal(result.value.schema,SEALED_BACKUP_SCHEMA);
  assert((await validateAccountBackup(canonicalJson(result.value.backup),owner)).ok);
  assert.equal(result.value.proof,signAlphaCommand(owner,canonicalJson({schema:SEALED_BACKUP_SCHEMA,ownerId:owner,digest:result.value.backup.integrity.payloadSha256}),key));
  assert.equal(f.state.writes,0);assert.equal(f.state.commits.length,0);assert.equal(canonicalJson(f.state.account),before);
});

test('file and legacy downloads preserve the same complete validated sealed snapshot',async()=>{
  const f=fixture();
  f.state.importArchives=[{owner_id:owner,source_sha256:'a'.repeat(64),source_raw:'  한글 원문\r\n"인용" \\ 경로 그대로  ',
    source_actor_id:owner,receipt:{revision:0},created_at:'2026-09-24T00:00:00.000Z'}];
  const legacy=await f.send({kind:'backup'});
  const packed=await f.send({kind:'backup',format:BACKUP_DOWNLOAD_FORMAT});
  assert(legacy.ok&&packed.ok); assert.equal(packed.value.schema,BACKUP_DOWNLOAD_SCHEMA);
  const sealed=JSON.parse(await decodeBackupFile(packed.value.file));
  assert.equal(sealed.schema,SEALED_BACKUP_SCHEMA);
  const checked=await validateAccountBackup(canonicalJson(sealed.backup),owner); assert(checked.ok);
  assert.equal(sealed.proof,signAlphaCommand(owner,canonicalJson({schema:SEALED_BACKUP_SCHEMA,ownerId:owner,digest:checked.value.integrity.payloadSha256}),key));
  // Independent requests may have different creation times and corresponding seals.
  const {createdAt:one,integrity:first,...firstPayload}=legacy.value.backup;
  const {createdAt:two,integrity:second,...secondPayload}=sealed.backup;
  assert.equal(new Date(one).toISOString(),one); assert.equal(new Date(two).toISOString(),two);
  assert(first.payloadSha256&&second.payloadSha256); assert.deepEqual(secondPayload,firstPayload);
  assert.equal(f.state.reads,4); assert.equal(f.state.writes,0); assert.equal(f.state.commits.length,0);
});

test('file download still rejects snapshot change before returning any package',async()=>{
  const f=fixture(); f.state.changeOnSecondRead=true;
  const response=await f.send({kind:'backup',format:BACKUP_DOWNLOAD_FORMAT});
  assert.equal(response.ok,false); assert.equal(response.reason,'revision-conflict');
  assert(!Object.hasOwn(response,'value')); assert.equal(f.state.reads,2); assert.equal(f.state.writes,0);
});

test('restore preview compares full catalog counts with a legacy backup without writing or hiding removal',async()=>{
  const f=fixture(),legacy=await f.send({kind:'backup'});assert(legacy.ok);
  f.state.account.space.catalogLibrary=buildCatalogLibrarySnapshot('2026-09-23T12:00:00.000Z');
  const before=canonicalJson(f.state.account);
  const preview=await f.send({kind:'preview',mode:'restore',sourceRaw:canonicalJson(legacy.value),actorId:owner});
  assert(preview.ok&&preview.value.canApply,JSON.stringify(preview));
  assert.deepEqual(preview.value.content.current,summarizePreservationContent(f.state.account.space));
  assert.deepEqual([preview.value.content.current.catalogFlows,preview.value.content.current.catalogItems,
    preview.value.content.current.catalogSections,preview.value.content.current.catalogMaps,preview.value.content.current.catalogVariants],
    [177,957,371,26,2]);
  assert.equal(preview.value.content.next.catalogFlows,0);assert.equal(preview.value.content.next.catalogMaps,0);
  assert.equal(f.state.writes,0);assert.equal(f.state.commits.length,0);assert.equal(canonicalJson(f.state.account),before);
});

test('catalog-only backup restore preview reports non-empty contents even with zero text documents',async()=>{
  const f=fixture();f.state.account.space.catalogLibrary=buildCatalogLibrarySnapshot('2026-09-23T12:00:00.000Z');
  const backup=await f.send({kind:'backup'});assert(backup.ok);
  f.state.account.space=createProgramPrivateSpace();const before=canonicalJson(f.state.account);
  const preview=await f.send({kind:'preview',mode:'restore',sourceRaw:canonicalJson(backup.value),actorId:owner});
  assert(preview.ok&&preview.value.canApply,JSON.stringify(preview));
  assert.equal(preview.value.documents,0);assert.equal(preview.value.savedFlows,0);
  assert.equal(preview.value.content.current.catalogFlows,0);assert.equal(preview.value.content.next.catalogFlows,177);
  assert.equal(preview.value.content.next.catalogMaps,26);assert.equal(preview.value.content.next.catalogVariants,2);
  assert.equal(f.state.writes,0);assert.equal(f.state.commits.length,0);assert.equal(canonicalJson(f.state.account),before);
});

test('backup permits bounded escape-heavy source through exact compressed preview transport',async()=>{
  const f=fixture();
  // 15 MB of valid JSON string content becomes over 30 MB when sourceRaw is
  // nested in the preview/commit request. The source itself remains readable.
  f.state.importArchives.push({owner_id:owner,source_sha256:'a'.repeat(64),source_raw:'\\'.repeat(7_500_000),
    source_actor_id:owner,receipt:{},created_at:'2026-09-21T14:00:00.000Z'});
  const result=await f.send({kind:'backup'});
  assert.equal(result.ok,true);
  const sourceRaw=canonicalJson(result.value), hash=await sha256(new TextEncoder().encode(sourceRaw));
  const wire=await preparePreservationWireRequest({client:1,kind:'preview',mode:'restore',sourceRaw,actorId:owner});
  assert.equal(typeof wire.sourceFile,'string'); assert(!('sourceRaw' in wire));
  const preview=await f.send(wire);assert(preview.ok);assert.equal(preview.value.sourceSha256,hash);assert.equal(preview.value.same,true);
  assert.equal(f.state.writes,0);assert.equal(f.state.commits.length,0);
});

test('compressed restore keeps the exact hash, owner seal, explicit commit and idempotency boundary',async()=>{
  const f=fixture(),initial=structuredClone(f.state.account),backup=await f.send({kind:'backup'});assert(backup.ok);
  const sourceRaw=canonicalJson(backup.value),sourceFile=await encodeBackupFile(sourceRaw);
  const preview=await f.send({kind:'preview',mode:'restore',sourceFile,actorId:owner});
  const legacy=await f.send({kind:'preview',mode:'restore',sourceRaw,actorId:owner});
  assert.deepEqual(preview,legacy);assert.equal(f.state.writes,0);
  const raw=await source(f);assert((await f.send({kind:'commit',command:command(raw.sourceSha256),sourceRaw:raw.sourceRaw,actorId:raw.actorId})).ok);
  const previous=structuredClone(f.state.operations),publicBefore=canonicalJson(f.state.context),archives=canonicalJson(f.state.importArchives);
  const payload={kind:'commit',command:command(preview.value.sourceSha256,'packed-restore','restore',1),sourceFile,actorId:owner};
  const restored=await f.send(payload);assert(restored.ok,JSON.stringify(restored));
  assert.deepEqual(f.state.account.space,initial.space);assert.equal(f.state.account.revision,2);
  assert.equal(canonicalJson(f.state.context),publicBefore);assert.equal(canonicalJson(f.state.importArchives),archives);
  assert.deepEqual(f.state.operations.slice(0,previous.length),previous);
  assert.deepEqual((await f.send(payload)).value,restored.value);assert.equal(f.state.writes,2);
});

test('compressed transport rejects malformed, foreign, tampered and non-restore payloads with zero writes',async()=>{
  const f=fixture(),backup=await f.send({kind:'backup'});assert(backup.ok);
  const sourceRaw=canonicalJson(backup.value),sourceFile=await encodeBackupFile(sourceRaw),wrapper=JSON.parse(sourceFile);
  const wrongProof=structuredClone(backup.value);wrongProof.proof='0'.repeat(64);
  const foreign=structuredClone(backup.value);foreign.backup.account.ownerId=other;
  for(const invalid of [sourceRaw,'{',JSON.stringify({...wrapper,bytes:30_000_001}),JSON.stringify({...wrapper,bytes:1}),
    JSON.stringify({...wrapper,sha256:'0'.repeat(64)}),JSON.stringify({...wrapper,data:'AAAA'}),
    JSON.stringify({...wrapper,extra:true}),await encodeBackupFile(canonicalJson(wrongProof)),await encodeBackupFile(canonicalJson(foreign))]) {
    const result=await f.send({kind:'preview',mode:'restore',sourceFile:invalid,actorId:owner});assert.equal(result.reason,'invalid-backup');
  }
  for(const payload of [{kind:'preview',mode:'restore',sourceFile,sourceRaw,actorId:owner},
    {kind:'preview',mode:'import',sourceFile,actorId:owner},
    {kind:'commit',command:command('a'.repeat(64)),sourceFile,actorId:owner}])assert.equal((await f.send(payload)).status,400);
  assert.equal(f.state.writes,0);assert.equal(f.state.commits.length,0);
  f.state.calls=[];f.state.revoked=true;
  const result=await f.send({kind:'preview',mode:'restore',sourceFile:JSON.stringify({schema:BACKUP_FILE_SCHEMA}),actorId:owner});
  assert.equal(result.reason,'unauthenticated');assert.deepEqual(f.state.calls,['/auth/v1/user']);
});

test('preservation import writes private space once and preserves source/public/legacy history',async()=>{
  const f=fixture(),raw=await source(f),before=structuredClone(f.state.account),publicBefore=canonicalJson(f.state.context);
  const result=await f.send({kind:'commit',command:command(raw.sourceSha256),sourceRaw:raw.sourceRaw,actorId:raw.actorId});assert(result.ok);
  assert.equal(f.state.writes,1);assert.equal(f.state.account.revision,1);assert(f.state.account.space.text.documents.length>0);
  assert.deepEqual(f.state.account.source,before.source);assert.deepEqual(f.state.account.legacyUndo,before.legacyUndo);assert.deepEqual(f.state.account.legacyReceipts,before.legacyReceipts);
  assert.equal(canonicalJson(f.state.context),publicBefore);assert.equal(f.state.importArchives[0].source_raw,raw.sourceRaw);
  assert.deepEqual(f.state.operations[0].inverse,[]);
});

test('preservation import receipt retry and same-hash new request survive later personal edits without writes',async()=>{
  const f=fixture(),raw=await source(f),cmd=command(raw.sourceSha256),payload={kind:'commit',command:cmd,sourceRaw:raw.sourceRaw,actorId:raw.actorId};
  const first=await f.send(payload);assert(first.ok);f.state.account.space.text.documents[0].title='Later user edit';f.state.account.revision++;
  const before=canonicalJson(f.state.account),writes=f.state.writes;
  const retry=await f.send(payload);assert(retry.ok,JSON.stringify(retry));assert.deepEqual(retry.value,first.value);
  const again=await f.send({...payload,command:command(raw.sourceSha256,'import-new-request','import',f.state.account.revision)});
  assert(again.ok,JSON.stringify(again));assert.deepEqual(again.value,first.value);assert.equal(f.state.writes,writes);assert.equal(canonicalJson(f.state.account),before);
});

test('preservation stale CAS, altered hash and reused request with another command never write',async()=>{
  const f=fixture(),raw=await source(f);
  const stale=await f.send({kind:'commit',command:command(raw.sourceSha256,'stale','import',1),sourceRaw:raw.sourceRaw,actorId:raw.actorId});assert.equal(stale.reason,'revision-conflict');
  const wrong=await f.send({kind:'commit',command:command('f'.repeat(64)),sourceRaw:raw.sourceRaw,actorId:raw.actorId});assert.equal(wrong.reason,'invalid');assert.equal(f.state.writes,0);
  assert((await f.send({kind:'commit',command:command(raw.sourceSha256),sourceRaw:raw.sourceRaw,actorId:raw.actorId})).ok);
  const conflict=await f.send({kind:'commit',command:command(raw.sourceSha256,'import-1','import',1),sourceRaw:raw.sourceRaw,actorId:raw.actorId});assert.equal(conflict.reason,'idempotency-conflict');assert.equal(f.state.writes,1);
});

test('preservation restore requires the signed owner backup and never applies an altered seal',async()=>{
  const f=fixture(),backup=await f.send({kind:'backup'});assert(backup.ok);
  for(const foreign of [false,true]){
    const sealed=structuredClone(backup.value);if(foreign)sealed.backup.account.ownerId=other;else sealed.proof='0'.repeat(64);
    const response=await f.send({kind:'preview',mode:'restore',sourceRaw:canonicalJson(sealed),actorId:owner});assert.equal(response.reason,'invalid-backup');
  }
  assert.equal(f.state.writes,0);assert.equal(f.state.commits.length,0);
});

test('preservation restores private space at current revision without replaying backup journals',async()=>{
  const f=fixture(),initial=structuredClone(f.state.account),backup=await f.send({kind:'backup'});assert(backup.ok);
  const raw=await source(f);assert((await f.send({kind:'commit',command:command(raw.sourceSha256),sourceRaw:raw.sourceRaw,actorId:raw.actorId})).ok);
  const sealedRaw=canonicalJson(backup.value),hash=await sha256(new TextEncoder().encode(sealedRaw)),oldOperation=structuredClone(f.state.operations[0]);
  const restore=await f.send({kind:'commit',command:command(hash,'restore-1','restore',1),sourceRaw:sealedRaw,actorId:owner});assert(restore.ok,JSON.stringify(restore));
  assert.equal(f.state.account.revision,2);assert.deepEqual(f.state.account.space,initial.space);assert.deepEqual(f.state.account.source,initial.source);
  assert.equal(f.state.operations.length,2);assert.deepEqual(f.state.operations[0],oldOperation);assert.equal(f.state.importArchives.length,1);
  assert.equal(f.state.writes,2);assert.deepEqual(f.state.operations[1].inverse,[]);
});

test('preservation backup resolves private staged media bytes; missing media never emits partial backup',async()=>{
  const f=fixture(),id='media-cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const draft={...newProgramParticipationDraft(),body:'Private photo',media:[{id,dataUrl:`flowme-media:${id}`,alt:'Synthetic image',synthetic:true}]};
  f.state.account.space.participationDrafts=[draft];
  f.state.files.set(id,await sharp({create:{width:2,height:2,channels:3,background:'blue'}}).webp().toBuffer());
  const good=await f.send({kind:'backup'});assert(good.ok,JSON.stringify(good));assert.equal(good.value.backup.files.length,1);
  f.state.files.clear();const missing=await f.send({kind:'backup'});assert.equal(missing.ok,false);assert.equal(missing.reason,'missing-file');assert(!('value' in missing));assert.equal(f.state.writes,0);
});

test('preservation changes during backup invalidate the whole result',async()=>{
  const f=fixture();f.state.changeOnSecondRead=true;const result=await f.send({kind:'backup'});
  assert.equal(result.reason,'revision-conflict');assert(!('value' in result));assert.equal(f.state.writes,0);
});

test('preservation restores exact owned missing private bytes atomically and retries once',async()=>{
  const f=fixture(),id='media-dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  f.state.account.space.participationDrafts=[{...newProgramParticipationDraft(),body:'Private photo',media:[{id,dataUrl:`flowme-media:${id}`,alt:'Private synthetic image',synthetic:true}]}];
  f.state.files.set(id,await sharp({create:{width:2,height:2,channels:3,background:'blue'}}).webp().toBuffer());
  const backup=await f.send({kind:'backup'});assert(backup.ok);f.state.account.space=createProgramPrivateSpace();f.state.account.revision=1;f.state.files.clear();
  const sourceRaw=canonicalJson(backup.value),sourceSha256=await sha256(new TextEncoder().encode(sourceRaw));
  const result=await f.send({kind:'commit',command:command(sourceSha256,'missing-private-restore','restore',1),sourceRaw,actorId:owner});
  assert.equal(result.ok,true);assert.equal(f.state.writes,1);assert.equal(f.state.commits.length,1);
  assert.equal(f.state.account.space.participationDrafts?.length??0,1);
  assert.equal(Buffer.from(f.state.preserved.get(id)!).toString('base64'),backup.value.backup.files[0].base64);
  const retry=await f.send({kind:'commit',command:command(sourceSha256,'missing-private-restore','restore',1),sourceRaw,actorId:owner});
  assert.deepEqual(retry.value,result.value);assert.equal(f.state.writes,1);
  const roundtrip=await f.send({kind:'backup'});assert.equal(roundtrip.ok,true);assert.deepEqual(roundtrip.value.backup.files,backup.value.backup.files);
  assert(!f.state.calls.some(path=>path.includes('media_stage_v1')));
});

test('preservation same-space missing bytes can apply; stale and foreign files write nothing',async()=>{
  const f=fixture(),id='media-eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  f.state.account.space.participationDrafts=[{...newProgramParticipationDraft(),body:'private',media:[{id,dataUrl:`flowme-media:${id}`,alt:'photo',synthetic:true}]}];
  f.state.files.set(id,await sharp({create:{width:2,height:2,channels:3,background:'red'}}).webp().toBuffer());
  const backup=await f.send({kind:'backup'});assert(backup.ok);f.state.files.clear();
  const sourceRaw=canonicalJson(backup.value),hash=await sha256(new TextEncoder().encode(sourceRaw));
  const preview=await f.send({kind:'preview',mode:'restore',sourceRaw,actorId:owner});assert(preview.value.canApply);assert(!preview.value.same);assert.equal(f.state.writes,0);
  const stale=await f.send({kind:'commit',command:command(hash,'stale','restore',1),sourceRaw,actorId:owner});assert.equal(stale.reason,'revision-conflict');assert.equal(f.state.preserved.size,0);
  f.state.foreign.add(id);const foreign=await f.send({kind:'commit',command:command(hash,'foreign','restore'),sourceRaw,actorId:owner});assert.equal(foreign.reason,'missing-file');assert.equal(f.state.writes,0);assert.equal(f.state.preserved.size,0);
  f.state.foreign.clear();const restored=await f.send({kind:'commit',command:command(hash,'bytes-only','restore'),sourceRaw,actorId:owner});assert(restored.ok);assert.equal(f.state.account.revision,1);assert.equal(f.state.preserved.size,1);
});

test('preservation old client, revoked session and oversized request are fail-closed',async()=>{
  const f=fixture();const old=await f.send({kind:'backup',client:0});assert.equal(old.reason,'unsupported-client');assert.equal(f.state.calls.length,0);
  f.state.revoked=true;const revoked=await f.send({kind:'backup'});assert.equal(revoked.reason,'unauthenticated');assert(!f.state.calls.some(path=>path.includes('/rpc/')));
  const huge=await f.handler(f.request({client:1,kind:'preview',mode:'import',sourceRaw:'x'.repeat(PRESERVATION_PROTOCOL.bytes),actorId:'local-user'}));
  assert.equal(huge.status,400);assert.equal(f.state.writes,0);
});

test('preservation refuses oversized upstream snapshots without partial backup',async()=>{
  const f=fixture();f.state.oversizedRead=true;const response=await f.send({kind:'backup'});
  assert.equal(response.ok,false);assert(!('value' in response));assert.equal(f.state.writes,0);assert.equal(f.state.reads,1);
});
