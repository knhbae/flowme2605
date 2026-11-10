import {privateTextChangeIsolatedToDocument} from './writing-ack';
import {privateReceiptMatches} from './alpha-persistence/private-receipt';
import type {WritingIdentity,WritingPayload,WritingReply} from './writing-compute';
import {textWorkspaceModel as M,textEditorRows} from './text-workspace';
import {commandFromProgramTransition,validateAlphaAccount} from './alpha-persistence/program-adapter';
import {validateAlphaRecovery} from './alpha-persistence/local-recovery';
import {encodeRecoveryStorage} from './alpha-persistence/recovery-codec';
import {canonicalJson,detached} from './alpha-persistence/json';
import {isM3Command} from './alpha-sync/contract';
import {programTextTransition} from './program-text-transition';
export function computeWriting(identity:WritingIdentity,payload:WritingPayload):WritingReply{
 const start=performance.now();let value:Omit<WritingReply,'identity'|'metrics'>;
 try{if(!identity.ownerId||!identity.docId||!Number.isSafeInteger(identity.workingGeneration)||!Number.isSafeInteger(identity.baseRevision)||!identity.requestId)throw Error('worker-identity');
 if(payload.kind==='account'){
  const account=JSON.parse(payload.accountJson),references=JSON.parse(payload.referencesJson);
  value=validateAlphaAccount(account,references,identity.ownerId)?{ok:true,account,references}:{ok:false,reason:'worker-account'};
 }else if(payload.kind==='recovery'){
  const recovery=JSON.parse(payload.valueJson);
  const valid=validateAlphaRecovery(recovery,identity.ownerId,(value,owner,references):value is import('./alpha-persistence/contract').AlphaAccount=>validateAlphaAccount(value,references??{actorIds:[owner],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}},owner));
  value=valid?{ok:true,recoveryRaw:payload.compact?encodeRecoveryStorage(recovery):canonicalJson(recovery)}:{ok:false,reason:'worker-recovery'};
 }else if(payload.kind==='receipt'){
  const {before,command,candidate,receipt}=payload;if(before.ownerId!==identity.ownerId||before.revision!==identity.baseRevision||command.kind!=='change-private')throw Error('worker-receipt-context');
  value={ok:privateReceiptMatches(before,command,candidate,receipt)};
 }else if(payload.kind==='save'){
  if(payload.account.ownerId!==identity.ownerId||payload.account.revision!==identity.baseRevision)throw Error('worker-owner');
  let result='';const command=commandFromProgramTransition(payload.account,payload.references,identity.requestId,current=>{const transition=programTextTransition(current,{actorId:payload.account.source.actorId,documentId:identity.docId,expected:payload.expected,next:payload.next,position:payload.position});if(transition.ok)result=transition.result;return transition;});
  if(!isM3Command(command))throw Error('worker-command');
  const recoveryValue={schema:'flowme-alpha-recovery/1' as const,ownerId:identity.ownerId,confirmed:payload.account,pending:command,draft:command,references:payload.references};
  if(!validateAlphaRecovery(recoveryValue,identity.ownerId,(value,owner,references):value is import('./alpha-persistence/contract').AlphaAccount=>!!references&&validateAlphaAccount(value,references,owner)))throw Error('worker-recovery');
  const change=command.kind==='change-private'?command.changes.find(change=>change.field==='text'&&change.present):undefined;const text=change?.present?change.value:undefined;
  // A net-zero or position-only command has no text value to encode/compare.
  // Existing worker command equality + client checkpoint settle no-change safely.
  const ackEligible=change?.present===true&&payload.account.source.actorId===identity.ownerId&&canonicalJson(payload.account.space.text)===canonicalJson(payload.expected)&&canonicalJson(text)===canonicalJson(payload.next)
   &&privateTextChangeIsolatedToDocument(payload.expected,payload.next,identity.docId);
  value={ok:true,command,result,recoveryValue,recoveryRaw:encodeRecoveryStorage(recoveryValue),ackEligible};
 }else{
  const row=M.rowMeta(payload.workspace,identity.docId).find(r=>r.id===payload.lineId),target=row?.progressTargetId;
  // N9: a subcheck's tap completes it as a task's does; its progress stays its own record.
  if(row?.kind!=='task'&&row?.kind!=='subcheck'||!target)value={ok:false,reason:'blocked'};
  else {const percent=M.currentProgress(payload.workspace,target),latest=M.latestProgress(payload.workspace,target);
   if(percent===null)value={ok:false,reason:'blocked'};else if(percent>0&&percent<100)value={ok:true,panel:'partial'};else if((latest?.date??'')>payload.date)value={ok:true,panel:'future'};
   else {const workspace=M.recordProgress(payload.workspace,target,payload.date,percent===100?0:100);if(workspace===payload.workspace||!M.validate(workspace))value={ok:false,reason:'blocked'};else value={ok:true,workspace,rows:M.rowMeta(workspace,identity.docId),paint:textEditorRows(workspace,identity.docId)};}
  }
 }
 }catch(e){value={ok:false,reason:e instanceof Error?e.message:'worker-invalid'};}
 return {identity,...value,metrics:{computeMs:performance.now()-start}};
}
// The worker is a pure calculator. There is no fetch, storage, credential, or server port.
const scope=globalThis as unknown as {document?:unknown;postMessage?:(value:WritingReply)=>void;onmessage?:((event:MessageEvent<{identity:WritingIdentity;payload:WritingPayload}>)=>void)};
if(typeof scope.document==='undefined'&&typeof scope.postMessage==='function'){
 for(const key of ['fetch','XMLHttpRequest','WebSocket','indexedDB','caches','importScripts','navigator'])Object.defineProperty(globalThis,key,{configurable:false,get(){throw Error('WRITING_WORKER_CAPABILITY_DENIED:'+key);}});
 scope.onmessage=event=>scope.postMessage!(computeWriting(event.data.identity,event.data.payload));
}
