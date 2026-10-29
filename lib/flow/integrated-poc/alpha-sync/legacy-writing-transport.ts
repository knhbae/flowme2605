import {isAlphaAuthConfig,type AlphaAuthConfig} from '../alpha-auth/config';
import type {VerifiedAlphaSession} from '../alpha-auth/account-access';
import {createAlphaHttpRepository} from './http-repository';

export type AlphaLegacyWritingTransport=Readonly<{scope:'alpha-legacy-writing-transport/1';request:typeof fetch}>;
const contexts=new WeakMap<AlphaLegacyWritingTransport,{config:Readonly<AlphaAuthConfig>;identity:Readonly<VerifiedAlphaSession>}>();
/** Explicit native-v11 connection, separate from the synthetic PM runtime. */
export function createAlphaLegacyWritingTransport(config:AlphaAuthConfig,identity:VerifiedAlphaSession,request:typeof fetch):AlphaLegacyWritingTransport|null{
 if(!isAlphaAuthConfig(config)||!identity.userId||!identity.accessToken||typeof request!=='function')return null;
 const fixedConfig=Object.freeze({...config}),fixed=Object.freeze({...identity});
 const scoped:typeof fetch=async(input,init)=>{
  const headers=new Headers(init?.headers??(input instanceof Request?input.headers:undefined));
  if(headers.get('Authorization')!==`Bearer ${fixed.accessToken}`)throw Error('LEGACY_WRITING_IDENTITY_MISMATCH');
  return request(input,init);
 };
 const port=Object.freeze({scope:'alpha-legacy-writing-transport/1' as const,request:scoped});contexts.set(port,{config:fixedConfig,identity:fixed});return port;
}
export function matchesAlphaLegacyWritingTransport(port:AlphaLegacyWritingTransport,config:AlphaAuthConfig,identity:VerifiedAlphaSession){
 const fixed=contexts.get(port);return!!fixed&&fixed.identity.userId===identity.userId&&fixed.identity.accessToken===identity.accessToken
  &&Object.keys(fixed.config).length===Object.keys(config).length&&Object.keys(fixed.config).every(key=>fixed.config[key as keyof AlphaAuthConfig]===config[key as keyof AlphaAuthConfig]);
}
/** Same factory used by the actual native workspace and the mock-I/O checks. */
export function createAlphaLegacyWritingRepository(config:AlphaAuthConfig,identity:VerifiedAlphaSession,port:AlphaLegacyWritingTransport){
 return matchesAlphaLegacyWritingTransport(port,config,identity)?createAlphaHttpRepository(config,identity,port.request,{social:true}):null;
}
