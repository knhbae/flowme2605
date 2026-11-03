import { readAlphaSocialResponse, type AlphaSocialRead } from '../alpha-social/projection';
import { canonicalJson } from '../alpha-persistence/json';
import type { AlphaError, AlphaResult } from '../alpha-persistence/contract';
import { signAlphaCommand } from './command-handler';
export type AlphaServerCall = (path:string,payload?:unknown)=>Promise<Response>;
/** Signed server-only read includes all proposal rows for safe aggregate commits.
 * Never return this result directly from a browser-facing route. */
export async function readAlphaSocialServerContext(call:AlphaServerCall,owner:string,key:string):Promise<AlphaResult<AlphaSocialRead>> {
 const readText=canonicalJson({schema:'flowme-alpha-social-server-read/1'});
 try{
  const response=await call('/rest/v1/rpc/flowme_alpha_social_server_read_v1',{read_text:readText,proof:signAlphaCommand(owner,readText,key)});
  if(!response.ok)return {ok:false,reason:response.status===401||response.status===403?'unauthenticated':'unavailable'};
  const value:unknown=await response.json();const parsed=readAlphaSocialResponse(value,owner,{server:true});
  if(parsed)return {ok:true,value:parsed};
  const reason=value&&typeof value==='object'&&'reason'in value?value.reason:undefined;
  return {ok:false,reason:(['unauthenticated','not-found','unavailable'].includes(reason as string)?reason:'invalid') as AlphaError};
 }catch{return {ok:false,reason:'unavailable'};}
}
