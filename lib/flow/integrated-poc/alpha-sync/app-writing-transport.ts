import type {AlphaAuthConfig} from '../alpha-auth/config';
import {programIdentifier} from '../program-data';
/** A selected docId is a route hint, not authority. Server rechecks owner/cohort/document. */
export function createAlphaDocumentWritingRequest(config:AlphaAuthConfig,request:typeof fetch){
 const origin=new URL(config.redirectUrl).origin;
 return (documentId:string,input:Parameters<typeof fetch>[0],init?:Parameters<typeof fetch>[1]):ReturnType<typeof fetch>=>{
  if(!programIdentifier(documentId))return Promise.reject(Error('INVALID_WRITING_DOCUMENT'));
  const url=new URL(input instanceof Request?input.url:String(input),config.redirectUrl);
  if(url.origin!==origin||url.pathname!=='/api/alpha/account')return request(input,init);
  if(url.search||url.hash)return Promise.reject(Error('WRITING_QUERY_NOT_SUPPORTED'));
  url.pathname='/api/alpha/writing/'+encodeURIComponent(documentId);
  return request(input instanceof Request?new Request(url,input):url.toString(),init);
 };
}
