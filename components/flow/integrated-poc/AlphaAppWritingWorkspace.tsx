'use client';
import React,{useEffect,useRef,useState} from 'react';
import type {AlphaAuthConfig} from '@/lib/flow/integrated-poc/alpha-auth/config';
import {createAlphaAppWritingAccountReader,type VerifiedAlphaSession} from '@/lib/flow/integrated-poc/alpha-auth/account-access';
import {ALPHA_MEMO_BODY_PROFILE} from '@/lib/flow/integrated-poc/alpha-persistence/memo-cohort';
import {ALPHA_REA_NEW_ITEMS_PROFILE} from '@/lib/flow/integrated-poc/alpha-persistence/rea-text-edit';
import type {AlphaAuthenticatedWritingPorts} from '@/lib/flow/integrated-poc/alpha-sync/authenticated-writing-shell';
import {createAlphaDocumentWritingRequest} from '@/lib/flow/integrated-poc/alpha-sync/app-writing-transport';
import {AlphaAuthenticatedWritingWorkspace} from './AlphaAuthenticatedWritingWorkspace';

type Read=Awaited<ReturnType<ReturnType<typeof createAlphaAppWritingAccountReader>['read']>>;
/** Normal app connector, not another login or persistent checkpoint store. Once
 * mounted, the accepted wrapper alone owns close/dirty/session transitions. */
export function AlphaAppWritingWorkspace({config,session,email,onSignOut,legacy}:{config:AlphaAuthConfig;session:VerifiedAlphaSession|null;email:string;onSignOut:()=>unknown;legacy:React.ReactNode}){
 const request=useRef(globalThis.fetch).current;
 const [admission,setAdmission]=useState<{identity:VerifiedAlphaSession;result:Read}|null>(null);
 const [ports,setPorts]=useState<AlphaAuthenticatedWritingPorts|null>(null);
 const inputLifetime=useRef(false);
 const legacyLifetime=useRef<string|null>(null);
 useEffect(()=>{
  if(!session||ports||legacyLifetime.current===session.userId)return;
  let current=true;const identity=session;
  void createAlphaAppWritingAccountReader(config,identity,request).read().then(result=>{
   if(!current)return;
   if(result.ok&&(result.kind==='legacy'||result.kind==='missing'))legacyLifetime.current=identity.userId;
   setAdmission({identity,result});
  });
  return()=>{current=false;};
 },[config,request,session?.userId,session?.accessToken,ports]);
 if(ports)return <AlphaAuthenticatedWritingWorkspace config={config} session={session} ports={ports} email={email} onSignOut={onSignOut} legacy={legacy}/>;
 if(!session||legacyLifetime.current===session.userId)return <>{legacy}</>;
 const exact=admission&&admission.identity.userId===session.userId&&admission.identity.accessToken===session.accessToken;
 const result=exact?admission.result:null;
 if(!result)return <p role="status">계정과 열 수 있는 문서를 확인하고 있습니다.</p>;
 if(!result.ok)return <section><p role="alert">계정 자료를 확인하지 못해 작성 화면을 열지 않았습니다. 기존 자료는 변경하지 않았습니다.</p><button type="button" onClick={()=>void onSignOut()}>로그아웃</button></section>;
 if(result.kind==='legacy'||result.kind==='missing')return <>{legacy}</>;
 const choose=(documentId:string)=>{
  if(inputLifetime.current||ports||!exact||!result.documents.some(doc=>doc.id===documentId))return;
  inputLifetime.current=true;
  const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  setPorts({scope:'local-alpha-auth-writing/1',request,documentRequest:createAlphaDocumentWritingRequest(config,request),documentId,inputOwnerId:'app-'+crypto.randomUUID(),entityIds:Object.freeze(Array.from({length:128},()=>crypto.randomUUID())),requestId:()=>crypto.randomUUID(),today,textProfile:result.kind==='memo'?ALPHA_MEMO_BODY_PROFILE:'rea-body-progress/1',...(result.kind==='rea'?{newItemsProfile:ALPHA_REA_NEW_ITEMS_PROFILE}:{}),supportMode:'authenticated-app'});
 };
 return <main><header><h1>열 문서를 선택하세요</h1><button type="button" onClick={()=>void onSignOut()}>로그아웃</button></header>
  <nav aria-label="작성할 문서"><ul>{result.documents.map(doc=><li key={doc.id}><button type="button" onClick={()=>choose(doc.id)}>{doc.title||'제목 없는 글'}</button></li>)}</ul></nav>
  {!result.documents.length&&<p role="status">현재 계정에 이 작성 경로로 열 수 있는 문서가 없습니다. 기존 자료를 변환하거나 새 사본을 만들지 않았습니다.</p>}
  <p>선택한 기존 문서에서 이어 씁니다. 미확인 저장 복구를 위한 브라우저 영속 보관은 아직 연결되지 않았습니다.</p>
 </main>;
}
