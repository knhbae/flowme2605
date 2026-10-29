'use client';

import React,{useLayoutEffect,useRef,useState} from 'react';
import type {AlphaAuthConfig} from '@/lib/flow/integrated-poc/alpha-auth/config';
import type {VerifiedAlphaSession} from '@/lib/flow/integrated-poc/alpha-auth/account-access';
import {createAlphaAuthenticatedWritingShell,type AlphaAuthenticatedWritingPorts,type AlphaWritingShellView} from '@/lib/flow/integrated-poc/alpha-sync/authenticated-writing-shell';
import {mountAlphaLocalWritingWorkspace} from './AlphaLocalWritingWorkspace';

/** Always mounted by the opt-in AuthPanel branch, including sign-out. Hidden
 * foreign input is retained in this component when its owner refuses close. */
export function AlphaAuthenticatedWritingWorkspace({config,session,ports,email,onSignOut,legacy}:{config:AlphaAuthConfig;session:VerifiedAlphaSession|null;ports:AlphaAuthenticatedWritingPorts;email:string;onSignOut:()=>unknown;legacy:React.ReactNode}){
 const place=useRef<HTMLDivElement>(null),bridge=useRef<ReturnType<typeof createAlphaAuthenticatedWritingShell>|null>(null),configuredDocument=useRef(ports.documentId);
 const [state,setState]=useState<AlphaWritingShellView>({phase:'signed-out',ownerId:null,documentId:null,visible:false,active:false,canContinue:false,reason:null,documents:[],selecting:false,canSelect:false,retryDocumentId:null,returnDocumentId:null});
 useLayoutEffect(()=>{
  const target=place.current;if(!target)return;
  const connection=bridge.current??createAlphaAuthenticatedWritingShell(config,ports,async selector=>{
   const slot=target.ownerDocument.createElement('div');slot.hidden=true;target.append(slot);
   try{const surface=await mountAlphaLocalWritingWorkspace(slot,selector,ports.today);if(surface.kind!=='typed'){surface.destroy();slot.remove();throw Error('TYPED_OWNER_NOT_MOUNTED');}
    slot.hidden=false;return{destroy(){const result=surface.destroy();if(result.ok)slot.remove();return result;}};
   }catch(error){if(selector.close().ok)slot.remove();throw error;}
  });bridge.current=connection;const unsubscribe=connection.subscribe(()=>setState(connection.snapshot()));
  return()=>{unsubscribe();const closed=connection.close();if(closed.ok&&bridge.current===connection)bridge.current=null;};
 // The first construction owns its slot. A failed retirement cannot be replaced
 // by a prop change or an effect replay; changed construction ports stay HOLD.
 },[]);
 useLayoutEffect(()=>{const connection=bridge.current;if(connection){const changed=configuredDocument.current!==ports.documentId;configuredDocument.current=ports.documentId;void connection.bind(connection.matchesPorts(config,ports)?session:null,changed?ports.documentId:undefined);}},[config,ports.scope,ports.request,ports.documentRequest,ports.inputOwnerId,ports.requestId,ports.today,ports.entityIds,session?.userId,session?.accessToken,ports.documentId,ports.textProfile,ports.newItemsProfile,ports.supportMode,ports.reentry,ports.reentry?.binding,ports.reentry?.binding.ownerId,ports.reentry?.binding.docId,ports.reentry?.binding.slot]);
 const visible=state.visible&&!!session&&state.ownerId===session.userId&&!!bridge.current?.matchesPorts(config,ports);
 const active=visible&&state.active&&!!state.documentId&&!!bridge.current?.matchesIdentity(session,state.documentId);
 const continuable=visible&&state.canContinue&&!!state.documentId&&!!bridge.current?.matchesIdentity(session,state.documentId);
 const selectable=!!session&&state.ownerId===session.userId&&state.canSelect&&!!bridge.current?.matchesPorts(config,ports)&&!!bridge.current?.matchesSession(session);
 useLayoutEffect(()=>{
  const target=place.current;if(!target)return;
  // Do not force focus, selection, or composition termination. Native input
  // widgets keep their DOM; unsupported session transitions are only suspended.
  target.hidden=!visible;target.inert=!active;
 },[visible,active]);
 const signOut=()=>{if(session&&state.documentId&&bridge.current?.requestSignOut(config,ports,session,state.documentId).ok)void onSignOut();};
 const continueWriting=()=>{if(session&&state.documentId)bridge.current?.continueWriting(config,ports,session,state.documentId);};
 return <>
  {visible&&<header><span>{email}</span><button type="button" onClick={signOut}>로그아웃 · 계정 바꾸기</button></header>}
  {selectable&&<nav aria-label="문서"><ul>{state.documents.map(doc=><li key={doc.id}><button type="button" aria-current={state.documentId===doc.id?'page':undefined} disabled={state.selecting} onClick={()=>void bridge.current?.navigate({view:'space',id:doc.id})}>{doc.title}</button></li>)}</ul></nav>}
  {selectable&&(state.retryDocumentId||state.returnDocumentId)&&<div role="group" aria-label="문서 다시 열기">
   {state.retryDocumentId&&<button type="button" disabled={state.selecting} onClick={()=>{if(state.retryDocumentId)void bridge.current?.navigate({view:'space',id:state.retryDocumentId});}}>같은 문서 다시 열기</button>}
   {state.returnDocumentId&&<button type="button" disabled={state.selecting} onClick={()=>{if(state.returnDocumentId)void bridge.current?.navigate({view:'space',id:state.returnDocumentId});}}>이전 문서로 돌아가기</button>}
  </div>}
  {continuable&&<div role="group" aria-label="현재 입력 계속 작성"><p role="status">로그아웃하지 않았습니다. 현재 입력에서 계속 작성하거나 저장 결과를 확인할 수 있습니다.</p><button type="button" onClick={continueWriting}>계속 작성</button></div>}
  <div ref={place} hidden={!visible} aria-hidden={!visible} inert={!active}/>
  {session&&state.phase==='typed'&&state.reason&&<p role="status">{state.reason==='DOCUMENT_CHANGE_INPUT_HOLD'?'작성 중인 입력이나 저장 결과를 확인한 뒤 다른 문서를 열어 주세요. 현재 문서는 그대로 유지했습니다.':'문서를 확인하지 못해 현재 문서를 유지했습니다.'}</p>}
  {session&&state.phase!=='legacy'&&state.phase!=='typed'&&<p role="status">{state.phase==='held'?'이전 입력을 보존하고 있습니다. 계정이나 문서를 바꾸기 전에 입력 상태를 확인해 주세요.':state.phase==='checking'?'인증된 계정과 문서를 확인하고 있습니다.':selectable?state.retryDocumentId?'문서를 열지 못했습니다. 다시 열거나 문서 목록에서 다른 문서를 선택해 주세요.':'열 문서를 목록에서 선택해 주세요.':'이 경로로 문서를 열지 못했습니다. 입력을 새 계정에 옮기지 않았습니다.'}</p>}
  {(!session||state.phase==='legacy')&&legacy}
 </>;
}
