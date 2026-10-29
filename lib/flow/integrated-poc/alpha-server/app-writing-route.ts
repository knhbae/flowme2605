import {ALPHA_REA_WRITING_PROFILE} from '../alpha-persistence/rea-writing-edit';
import {readAlphaAuthConfig} from '../alpha-auth/config';
import {createAlphaAppWritingAccountReader} from '../alpha-auth/account-access';
import {ALPHA_REA_PROGRESS_EDIT_PROFILE} from '../alpha-persistence/rea-progress-edit';
import {ALPHA_MEMO_BODY_PROFILE} from '../alpha-persistence/memo-cohort';
import {programIdentifier,programShape} from '../program-data';
import {readAlphaWritingRequestBody} from './command-handler';
import {alphaRequestOrigin} from './request-origin';
import {createAlphaWritingRoute} from './writing-route';

const failure=(reason:'invalid'|'unauthenticated'|'unavailable'|'not-found',status=200)=>Response.json({ok:false,reason},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
/** Selected path is only a hint. Profile and owner are never accepted from a
 * request body/header/query. Fresh underlying handler guards and DB CAS remain. */
export function createAlphaAppWritingRoute(env:Record<string,string|undefined>,backend:typeof fetch=fetch){
 const config=readAlphaAuthConfig(env);
 return async(request:Request,documentId:string):Promise<Response>=>{
  if(!config)return failure('unavailable',503);
  if(request.method!=='POST'||new URL(request.url).search||!alphaRequestOrigin(config,request)||!request.headers.get('content-type')?.startsWith('application/json')||!programIdentifier(documentId))return failure('invalid',400);
  const authorization=request.headers.get('authorization');if(!authorization||!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(authorization))return failure('unauthenticated',401);
  try{
   const userResponse=await backend(config.url+'/auth/v1/user',{headers:{apikey:config.publishableKey,Authorization:authorization},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!userResponse.ok)return failure(userResponse.status===401||userResponse.status===403?'unauthenticated':'unavailable');
   const user:unknown=await userResponse.json();
   if(!user||typeof user!=='object'||!('id'in user)||typeof user.id!=='string'||!/^[0-9a-f-]{36}$/.test(user.id)||'is_anonymous'in user&&user.is_anonymous)return failure('unauthenticated');
   let body:unknown;try{body=await readAlphaWritingRequestBody(request);}catch{return failure('invalid',400);}
   const forwarded=new Request(request,{body:JSON.stringify(body)});
   // Explicit receipt lookup is owner-scoped historical evidence, not current
   // document authority. Keep it available after archival/profile change; the
   // existing handler rechecks Auth and validates the lookup and receipt shape.
   if(programShape(body,['kind','requestId'])&&body.kind==='lookup')return await createAlphaWritingRoute(env,backend,{profile:ALPHA_REA_PROGRESS_EDIT_PROFILE,documentScope:{ownerId:user.id,documentId}})(forwarded);
   const read=await createAlphaAppWritingAccountReader(config,{userId:user.id,accessToken:authorization.slice(7)},backend).read();
   if(!read.ok)return failure(read.reason==='session-expired'?'unauthenticated':read.reason);
   if(read.kind!=='rea'&&read.kind!=='memo'||!read.documents.some(d=>d.id===documentId))return failure('not-found');
   const scope={ownerId:user.id,documentId};
   const options:Parameters<typeof createAlphaWritingRoute>[2]=read.kind==='rea'?{profile:ALPHA_REA_WRITING_PROFILE,documentScope:scope}:{profile:ALPHA_MEMO_BODY_PROFILE,memoDocumentScope:scope};
   return await createAlphaWritingRoute(env,backend,options)(forwarded);
  }catch{return failure('unavailable');}
 };
}
