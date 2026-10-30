import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import { createAlphaSocialCommandHandler } from './social-command-handler';
import { signAlphaCommand, createAlphaCommandHandler } from './command-handler';
import { createAlphaCreatorCommandHandler } from './creator-command-handler';
import { ALPHA_SOCIAL_COMMAND_SCHEMA, type AlphaSocialCommand } from '../alpha-social/contract';
import { ALPHA_SOCIAL_CONTEXT_SCHEMA, alphaSocialReferences, mapAlphaPublicActor, type AlphaSocialContext } from '../alpha-social/projection';
import { ALPHA_SCHEMA, type AlphaAccount } from '../alpha-persistence/contract';
import { PROGRAM_SCHEMA } from '../contract';
import { createProgramPrivateSpace } from '../program-data';
import { newProgramParticipationDraft } from '../participation-editor';
import { materializeAccount } from '../alpha-persistence/program-adapter';
import { publishProgramFlow } from '../publication';
import { importProgramPublicVersion } from '../private-space';
const owner='11111111-1111-4111-8111-111111111111',alias='member-22222222-2222-4222-8222-222222222222',key='ab'.repeat(32),token='fixture-only-not-a-real-token',now='2026-09-21T14:00:00.000Z';
const env={FLOWME_ALPHA_ENABLED:'development-only',FLOWME_ALPHA_STAGE:'development',FLOWME_ALPHA_PROJECT_REF:'wkmzcxpnojobxrgebapw',FLOWME_ALPHA_SUPABASE_URL:'https://wkmzcxpnojobxrgebapw.supabase.co',FLOWME_ALPHA_PUBLISHABLE_KEY:'sb_publishable_fixture',FLOWME_ALPHA_REDIRECT_URL:'http://localhost:3104/auth/callback',FLOWME_ALPHA_M3_SIGNING_KEY:key};
function fixture(){
 const account:AlphaAccount={schema:ALPHA_SCHEMA,ownerId:owner,revision:0,source:{schema:PROGRAM_SCHEMA,actorId:owner,revision:0},space:createProgramPrivateSpace(),legacyReceipts:[],legacyUndo:[]};
 const context:AlphaSocialContext={schema:ALPHA_SOCIAL_CONTEXT_SCHEMA,revision:0,ownActorId:alias,actors:[{id:alias,name:'Participant'}],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}};
 const draft={...newProgramParticipationDraft(),title:'Question',body:'Public words',topic:'Test'};
 const command:AlphaSocialCommand={schema:ALPHA_SOCIAL_COMMAND_SCHEMA,kind:'social',requestId:'social-request',expectedRevision:0,expectedPublicRevision:0,intent:{type:'participation-submit',draft,expected:null}};
 const state={account,context,expired:false,invalidRead:false,loseCommit:false,malformed:false,denied:false,receipt:null as unknown};
 const calls:{path:string;body:any;authorization:string|null}[]=[];
 const fetcher:typeof fetch=async(url,init)=>{const path=new URL(String(url)).pathname,body=init?.body?JSON.parse(String(init.body)):undefined;calls.push({path,body,authorization:new Headers(init?.headers).get('authorization')});
  if(path==='/auth/v1/user')return Response.json({id:owner},{status:state.expired?401:200});
  if(path==='/rest/v1/flowme_alpha_accounts')return Response.json([{account:state.account}]);
  if(path.endsWith('social_server_read_v1')){assert.equal(body.proof,signAlphaCommand(owner,body.read_text,key));return Response.json(state.invalidRead?{ok:true,value:{account:state.account,context:{}}}:{ok:true,value:{account:state.account,context:state.context}});}
  if(path.endsWith('lookup_v1'))return Response.json({ok:true,value:state.receipt});
  if(state.loseCommit)throw Error('lost response');
  const commit=JSON.parse(body.commit_text??body.command_text);assert.equal(body.proof,signAlphaCommand(owner,body.commit_text??body.command_text,key));
  if(state.denied)return Response.json({ok:false,reason:'rate-limited'});
  const cmd=commit.command??commit;
  return Response.json({ok:true,value:{requestId:cmd.requestId,revision:cmd.expectedRevision+1,kind:cmd.kind,changed:true,...(cmd.kind==='social'||cmd.kind==='undo-social'?{publicRevision:cmd.expectedPublicRevision+(commit.publicRepository?1:0)}:{}),...(cmd.kind==='social'?{resultId:commit.resultId??'original-result'}:cmd.kind==='creator'?{resultId:commit.resultId}:{}),...(state.malformed?{foreign:true}:{})}});
 };
 const request=(body:unknown,origin='http://localhost:3104')=>new Request('http://localhost:3104/api/alpha/social',{method:'POST',headers:{'content-type':'application/json',Origin:origin,Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
 return {state,calls,fetcher,request,command,handler:createAlphaSocialCommandHandler(env,fetcher,()=>now)};
}
test('social handler signs server-authored public post with stable alias and fixed auth',async()=>{const f=fixture();const response=await f.handler(f.request({kind:'execute',command:f.command}));const value=await response.json();assert.equal(value.ok,true);assert.equal(response.headers.get('cache-control'),'no-store');const commit=JSON.parse(f.calls.at(-1)!.body.commit_text);assert.equal(commit.publicRepository.posts[0].authorId,alias);assert.equal(commit.publicRepository.posts[0].createdAt,now);assert.deepEqual(commit.command,f.command);assert(!JSON.stringify(value).includes('Public words'));assert(!JSON.stringify(value).includes(key));assert(f.calls.every(c=>c.authorization===`Bearer ${token}`));});

test('new public photos require original Storage bytes; private fallback cannot authorize publication',async()=>{
 for(const mode of ['missing','corrupt','valid']as const){
  const f=fixture(),id='media-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',bytes=Buffer.from('original-immutable-photo');
  if(f.command.intent.type!=='participation-submit')throw Error('fixture');
  f.command.intent.draft.media=[{id,dataUrl:`flowme-media:${id}`,alt:'photo',synthetic:true}];
  const fetcher:typeof fetch=async(url,init)=>{const p=new URL(String(url)).pathname;
   assert(!p.endsWith('preserved_media_read_v1'),'public path must not read private restored bytes');
   if(p.endsWith('social_media_read_v1'))return Response.json({ok:true,value:{id,path:`media/${id}.webp`,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length}});
   if(p.startsWith('/storage/'))return mode==='missing'?new Response(null,{status:404}):new Response(mode==='corrupt'?Buffer.from('broken'):bytes);
   return f.fetcher(url,init);
  };
  const result=await(await createAlphaSocialCommandHandler(env,fetcher,()=>now)(f.request({kind:'execute',command:f.command}))).json();
  assert.equal(result.ok,mode==='valid');assert.equal(f.calls.filter(c=>c.path.endsWith('social_execute_v1')).length,mode==='valid'?1:0);
 }
});
test('social requests refuse patch owner timestamp and cross-origin before upstream',async()=>{for(const extra of [{ownerId:owner},{changes:[]},{now}]){const f=fixture();const v=await(await f.handler(f.request({kind:'execute',command:{...f.command,...extra}}))).json();assert.equal(v.reason,'invalid');assert.equal(f.calls.length,0);}const f=fixture();assert.equal((await(await f.handler(f.request({kind:'execute',command:f.command},'https://attacker.invalid')))).status,400);assert.equal(f.calls.length,0);});
test('stale account or public revision carries null commit for original ledger replay',async()=>{for(const field of ['account','context'] as const){const f=fixture();f.state[field].revision=2;const v=await(await f.handler(f.request({kind:'execute',command:f.command}))).json();assert.equal(v.ok,true);assert.equal(v.value.resultId,'original-result');const commit=JSON.parse(f.calls.at(-1)!.body.commit_text);assert.deepEqual(commit.changes,[]);assert.equal(commit.publicRepository,null);assert.equal(commit.resultId,null);assert.deepEqual(commit.command,f.command);}});
test('future dual revision and unavailable reference context never reach writer',async()=>{for(const which of ['expectedRevision','expectedPublicRevision']){const f=fixture();const v=await(await f.handler(f.request({kind:'execute',command:{...f.command,[which]:1}}))).json();assert.equal(v.reason,'revision-conflict');assert(!f.calls.some(c=>c.path.endsWith('social_execute_v1')));}const f=fixture();f.state.invalidRead=true;assert.equal((await(await f.handler(f.request({kind:'execute',command:f.command}))).json()).reason,'invalid');});
test('private-only social Undo delegates inverse to ledger, never accepts patch',async()=>{const f=fixture();const command={schema:ALPHA_SOCIAL_COMMAND_SCHEMA,kind:'undo-social',requestId:'undo',operationId:'original',expectedRevision:0,expectedPublicRevision:0};const v=await(await f.handler(f.request({kind:'execute',command}))).json();assert.equal(v.ok,true);const commit=JSON.parse(f.calls.at(-1)!.body.commit_text);assert.deepEqual(commit.changes,[]);assert.equal(commit.publicRepository,null);assert.equal(commit.resultId,null);assert.equal((await(await f.handler(f.request({kind:'execute',command:{...command,changes:[]}}))).json()).reason,'invalid');});
test('rate limit loss malformed acknowledgement and revoked auth remain explicit failures',async()=>{for(const flag of ['denied','loseCommit','malformed','expired'] as const){const f=fixture();f.state[flag]=true;const v=await(await f.handler(f.request({kind:'execute',command:f.command}))).json();assert.equal(v.ok,false);assert.equal(v.reason,flag==='denied'?'rate-limited':flag==='expired'?'unauthenticated':'unavailable');}});
test('social receipt lookup exposes receipt only',async()=>{const f=fixture();f.state.receipt={requestId:'request',revision:1,publicRevision:1,changed:true,kind:'social',resultId:'post-one'};assert.deepEqual((await(await f.handler(f.request({kind:'lookup',requestId:'request'}))).json()).value,f.state.receipt);assert.equal(f.calls.length,2);});
test('M3 and M4 server writers obtain authoritative references for an existing public copy',async()=>{
 for(const kind of ['private','creator']){
  const f=fixture();const data=materializeAccount(f.state.account,alphaSocialReferences(f.state.context,owner)).data;
  const pub=publishProgramFlow(data,{actorId:owner,requestId:'fixture-publish',title:'Source',summary:'',category:'Test',situations:[],source:{kind:'user-text',label:'Own',url:null,checkedAt:null},items:[{id:'item-one',title:'Task',description:'',completionCriteria:'',sourceUrl:null,schedule:{kind:'undated'},subchecks:[]}]},now);if(!pub.ok)throw Error(pub.reason);
  const copied=importProgramPublicVersion(pub.data,{actorId:owner,requestId:'fixture-copy',expectedSpace:pub.data.spaces[owner],versionId:pub.result,itemIds:['item-one'],anchor:null});if(!copied.ok)throw Error(copied.reason);
  f.state.account.space=copied.data.spaces[owner];f.state.context.public=mapAlphaPublicActor(copied.data.public,owner,alias);
  const command=kind==='private'?{schema:'flowme-alpha-command/1',kind:'change-private',requestId:'private',expectedRevision:0,changes:[{field:'archivedDocumentIds',present:true,value:[f.state.account.space.copies[0].documentId]}]}:{schema:'flowme-alpha-creator-command/1',kind:'creator',requestId:'creator',expectedRevision:0,intent:{type:'working',now,working:{draftId:'draft',title:'New',rawText:'# New',baseRecordRevision:null}}};
  const handler=kind==='private'?createAlphaCommandHandler(env,f.fetcher):createAlphaCreatorCommandHandler(env,f.fetcher);
  const result=await(await handler(f.request({kind:'execute',command}))).json();assert.equal(result.ok,true,JSON.stringify(result));assert(f.calls.some(c=>c.path.endsWith('social_server_read_v1')));
 }
});
