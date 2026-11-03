import { readAlphaAuthConfig } from '../alpha-auth/config';
import { alphaInternalMediaRequest, alphaRequestOrigin } from './request-origin';
import { isAlphaSocialCommand, ALPHA_SOCIAL_COMMAND_SCHEMA, type AlphaSocialCommand } from '../alpha-social/contract';
import { executeAlphaSocialIntent } from '../alpha-social/dispatch';
import { alphaSocialReferences, mapAlphaPublicActor } from '../alpha-social/projection';
import { ALPHA_LIMITS, type AlphaChange, type AlphaError } from '../alpha-persistence/contract';
import { materializeAccount, privateChanges, validateAlphaAccount } from '../alpha-persistence/program-adapter';
import { canonicalJson, detached, parseAlphaJson } from '../alpha-persistence/json';
import { isAlphaWireReceipt } from '../alpha-sync/wire';
import { programIdentifier, programShape } from '../program-data';
import { signAlphaCommand } from './command-handler';
import { preservesAlphaPrivateSources } from './private-boundary';
import { readAlphaSocialServerContext } from './social-context';
import type { ProgramPublicRepository } from '../contract';
import { createAlphaMediaHandler } from './media-handler';

export const ALPHA_SOCIAL_COMMIT_SCHEMA='flowme-alpha-social-commit/1' as const;
type Undo={schema:typeof ALPHA_SOCIAL_COMMAND_SCHEMA;kind:'undo-social';requestId:string;expectedRevision:number;expectedPublicRevision:number;operationId:string};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const failure=(reason:AlphaError,status=200)=>Response.json({ok:false,reason},{status,headers});
const output=(value:unknown)=>Response.json(value,{headers});
function undo(value:unknown):value is Undo{return programShape(value,['schema','kind','requestId','expectedRevision','expectedPublicRevision','operationId'])&&value.schema===ALPHA_SOCIAL_COMMAND_SCHEMA&&value.kind==='undo-social'&&programIdentifier(value.requestId)&&value.requestId.length<=160&&programIdentifier(value.operationId)&&value.operationId.length<=160&&value.requestId!==value.operationId&&Number.isSafeInteger(value.expectedRevision)&&Number(value.expectedRevision)>=0&&Number.isSafeInteger(value.expectedPublicRevision)&&Number(value.expectedPublicRevision)>=0;}
async function boundedBody(request:Request):Promise<unknown>{const reader=request.body?.getReader();if(!reader)throw Error('empty');const chunks:Uint8Array[]=[];let bytes=0;try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>ALPHA_LIMITS.bytes){await reader.cancel();throw Error('oversized');}chunks.push(part.value);}}finally{reader.releaseLock();}return parseAlphaJson(Buffer.concat(chunks).toString('utf8'));}
function validResult(v:unknown):v is {ok:true;value:unknown}|{ok:false;reason:AlphaError}{return programShape(v,['ok','reason'])&&v.ok===false&&['invalid','unauthenticated','not-found','revision-conflict','idempotency-conflict','undo-conflict','unavailable','no-change','rate-limited'].includes(v.reason as string)||programShape(v,['ok','value'])&&v.ok===true&&(v.value===null||isAlphaWireReceipt(v.value));}

export function createAlphaSocialCommandHandler(env:Record<string,string|undefined>,fetcher:typeof fetch=fetch,clock:()=>string=()=>new Date().toISOString()){
 const config=readAlphaAuthConfig(env),key=env.FLOWME_ALPHA_M3_SIGNING_KEY;
 return async(request:Request):Promise<Response>=>{
  if(!config||!key||!/^[a-f0-9]{64}$/.test(key))return failure('unavailable',503);
  const url=new URL(request.url),publicOrigin=alphaRequestOrigin(config,request);
  if(request.method!=='POST'||!publicOrigin||url.search||!request.headers.get('content-type')?.startsWith('application/json'))return failure('invalid',400);
  const authorization=request.headers.get('authorization');if(!authorization||!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(authorization))return failure('unauthenticated',401);
  let body:unknown;try{body=await boundedBody(request);}catch{return failure('invalid',400);}
  const execute=programShape(body,['kind','command'])&&body.kind==='execute'&&(isAlphaSocialCommand(body.command)||undo(body.command));
  const lookup=programShape(body,['kind','requestId'])&&body.kind==='lookup'&&programIdentifier(body.requestId)&&body.requestId.length<=160;
  if(!execute&&!lookup)return failure('invalid',400);
  const call=(path:string,payload?:unknown)=>fetcher(`${config.url}${path}`,{method:payload===undefined?'GET':'POST',headers:{apikey:config.publishableKey,Authorization:authorization,'Content-Type':'application/json'},...(payload===undefined?{}:{body:JSON.stringify(payload)}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  const upstream=(r:Response)=>failure(r.status===401||r.status===403?'unauthenticated':'unavailable');
  try{
   const authenticated=await call('/auth/v1/user');if(!authenticated.ok)return upstream(authenticated);const user:unknown=await authenticated.json();
   if(!user||typeof user!=='object'||!('id'in user)||typeof user.id!=='string'||!/^[0-9a-f-]{36}$/.test(user.id)||'is_anonymous'in user&&user.is_anonymous)return failure('unauthenticated');
   const owner=user.id;
   if(lookup){const response=await call('/rest/v1/rpc/flowme_alpha_lookup_v1',{request_id:(body as {requestId:string}).requestId});if(!response.ok)return upstream(response);const value:unknown=await response.json();return validResult(value)?output(value):failure('unavailable');}
   const command=(body as {command:AlphaSocialCommand|Undo}).command;
   const read=await readAlphaSocialServerContext(call,owner,key);if(!read.ok)return failure(read.reason);
   const {account,context}=read.value,references=alphaSocialReferences(context,owner);
   if(command.expectedRevision>account.revision||command.expectedPublicRevision>context.revision)return failure('revision-conflict');
   let changes:AlphaChange[]=[],publicRepository:ProgramPublicRepository|null=null,resultId:string|null=null;
   if(command.kind==='social'&&command.expectedRevision===account.revision&&command.expectedPublicRevision===context.revision){
    const baseline=materializeAccount(account,references);
    const transition=executeAlphaSocialIntent(baseline.data,owner,command.intent,command.requestId,clock());
    if(!transition.ok)return failure(transition.reason==='conflict'?'revision-conflict':transition.reason==='missing'?'not-found':transition.reason==='duplicate-request'?'idempotency-conflict':'invalid');
    if(!transition.changed)return failure('no-change');
    const next=detached(account);next.space=transition.data.spaces[owner];
    const nextReferences={...references,public:transition.data.public};
    if(!validateAlphaAccount(next,nextReferences,owner)||!preservesAlphaPrivateSources(account,next,nextReferences))return failure('invalid');
    changes=privateChanges(account.space,next.space);resultId=transition.result;
    if(canonicalJson(references.public)!==canonicalJson(transition.data.public))publicRepository=mapAlphaPublicActor(transition.data.public,owner,context.ownActorId);
   }
   if(publicRepository){
    const previous=new Set(context.public.posts.filter(post=>!post.deleted).flatMap(post=>post.media.map(photo=>photo.id)));
    const added=[...new Set(publicRepository.posts.filter(post=>!post.deleted).flatMap(post=>post.media.map(photo=>photo.id)))].filter(id=>!previous.has(id));
    const publicMedia=createAlphaMediaHandler(env,fetcher,{allowPreserved:false});
    for(const id of added){
      const response=await publicMedia(alphaInternalMediaRequest(publicOrigin,id,authorization,!!config.hosting));
      if(!response.ok)return failure(response.status===401?'unauthenticated':'invalid');
      await response.arrayBuffer();
    }
   }
   // Stale requests and Undo send no freshly compiled aggregate. SQL replays the
   // original intent before dual CAS, and derives private Undo from its ledger.
   const commitText=canonicalJson({schema:ALPHA_SOCIAL_COMMIT_SCHEMA,command,changes,publicRepository,resultId});
   const committed=await call('/rest/v1/rpc/flowme_alpha_social_execute_v1',{commit_text:commitText,proof:signAlphaCommand(owner,commitText,key)});
   if(!committed.ok)return upstream(committed);const value:unknown=await committed.json();
   if(!validResult(value))return failure('unavailable');
   if(value.ok&&(!isAlphaWireReceipt(value.value)||value.value.requestId!==command.requestId||value.value.kind!==command.kind||value.value.revision!==command.expectedRevision+1||!('publicRevision'in value.value)||!Number.isSafeInteger(value.value.publicRevision)||Number(value.value.publicRevision)<command.expectedPublicRevision||Number(value.value.publicRevision)>command.expectedPublicRevision+1||command.kind==='social'&&!programIdentifier(value.value.resultId)))return failure('unavailable');
   return output(value);
  }catch{return failure('unavailable');}
 };
}
