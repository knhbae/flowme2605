import {programClone,programFailure,programResult,type ProgramData,type ProgramPrivateSpace,type ProgramTransition} from './contract';
import {validateProgramData,programIdentifier} from './program-data';
import {programSame} from './controller';
import {createProgramCreatorWorkspace,creatorWorkingFromRecord} from './creator-workspace';
import type {ProgramCreatorWorking} from './creator-workspace-contract';
import {validateProgramCreatorWorking} from './creator-workspace-validation';
import {createNativeCreatorDocumentOwner} from './native-creator-document';
import {isNativeCreatorRecoverySource,type NativeCreatorRecoverySource,type NativeCreatorRecordUi} from './native-creator-document-contract';
import {decodeLegacyCreatorRecoveries,type LegacyCreatorRecoveryCandidate} from './legacy-creator-recovery-codec';
import {stableAuthoringHash,stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';

/** Replaceable PoC handoff choices. No original D2 schema or writer is changed. */
export const LEGACY_RECOVERY_HANDOFF_CONTRACT={version:1,target:'new-unsaved-working',olderRecovery:'read-only',duplicate:'exact-existing-only'} as const;
export type LegacyCreatorRecoverySelection={draftId:string;recoveryId:string};
export type LegacyCreatorRecoveryHandoffRequest={version:1;actorId:string;requestId:string;targetDraftId:string;now:string;
 selection:LegacyCreatorRecoverySelection;expectedRaw:string;expectedSpace:ProgramPrivateSpace;working:ProgramCreatorWorking;mode:'create'|'existing'};
export type LegacyCreatorRecoveryHandoffPreview={candidate:LegacyCreatorRecoveryCandidate;working:ProgramCreatorWorking;contextWarnings:string[];existingDraftId:string|null};
export type LegacyCreatorRecoveryHandoffPrepared={ok:true;request:LegacyCreatorRecoveryHandoffRequest;preview:LegacyCreatorRecoveryHandoffPreview}
 |{ok:false;reason:'invalid'|'forbidden'|'unavailable'|'corrupt'|'unsupported'|'missing'|'not-newer'|'dirty-working'|'already-changed'};
const stamp=(value:string)=>Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const fail=(reason:Extract<LegacyCreatorRecoveryHandoffPrepared,{ok:false}>['reason']):LegacyCreatorRecoveryHandoffPrepared=>({ok:false,reason});
const sourceOf=(candidate:LegacyCreatorRecoveryCandidate):NativeCreatorRecoverySource=>({kind:'legacy-recovery',version:1,storageKey:candidate.storageKey,draftId:candidate.draftId,recoveryId:candidate.recoveryId,revisionId:candidate.revisionId,recoveredAt:candidate.recoveredAt,documentJson:candidate.documentJson,recoveryJson:candidate.recoveryJson,durableRecordJson:candidate.durableRecordJson});
export function mapLegacyCreatorRecoveryWorking(candidate:LegacyCreatorRecoveryCandidate,targetDraftId:string,now:string):{working:ProgramCreatorWorking;contextWarnings:string[]}|null{
 const warnings:string[]=[],pending=candidate.workingRawText!==candidate.canonicalRawText;
 const ui:NativeCreatorRecordUi={activeStage:pending?'input':candidate.activeStage};
 if(pending&&candidate.activeStage!=='input')warnings.push('미반영 원문을 먼저 확인하도록 원문 단계로 엽니다. 원래 단계는 복구 출처에 보존합니다.');
 if(candidate.selectedItemId){if(candidate.selectionAvailable)ui.selectedItemId=candidate.selectedItemId;else warnings.push('원래 선택 항목이 현재 구조에 없어 선택을 복원하지 않습니다. 원래 식별값은 보존합니다.');}
 if(candidate.primaryArtifact){if(['calendar','todo','sheet','memo'].includes(candidate.primaryArtifact))ui.primaryArtifact=candidate.primaryArtifact as NativeCreatorRecordUi['primaryArtifact'];else warnings.push('지원하지 않는 옛 출력 화면은 자동으로 열지 않습니다. 원래 값은 보존합니다.');}
 if(candidate.focusTarget)warnings.push('옛 화면의 초점 위치는 자동 실행하지 않습니다. 원래 값은 보존합니다.');
 const source=sourceOf(candidate),owner=createNativeCreatorDocumentOwner({id:targetDraftId,source,currentRecordUi:ui},now);
 if(!owner.ok)return null;
 const working:ProgramCreatorWorking={draftId:targetDraftId,title:candidate.title,rawText:candidate.canonicalRawText,baseRecordRevision:null,nativeDocument:owner.owner,nativeSelection:source,...(pending?{nativePendingRawText:candidate.workingRawText}:{})};
 return validateProgramCreatorWorking(working)?{working,contextWarnings:warnings}:null;
}
const mappedWorking=mapLegacyCreatorRecoveryWorking;
function existingCandidate(data:ProgramData,actorId:string,candidate:LegacyCreatorRecoveryCandidate):{kind:'none'}|{kind:'changed'}|{kind:'exact';working:ProgramCreatorWorking}{
 const workspace=data.spaces[actorId].creatorWorkspace;
 const matches=(working:ProgramCreatorWorking|null|undefined)=>!!working?.nativeDocument&&isNativeCreatorRecoverySource(working.nativeDocument.source)&&working.nativeDocument.source.storageKey===candidate.storageKey&&working.nativeDocument.source.draftId===candidate.draftId&&working.nativeDocument.source.recoveryId===candidate.recoveryId;
 const current=workspace?.working;
 if(matches(current)){
  const mapped=mappedWorking(candidate,current!.draftId,current!.nativeDocument!.createdAt);
  return mapped&&programSame(mapped.working,current)?{kind:'exact',working:current!}:{kind:'changed'};
 }
 const saved=Object.values(workspace?.structureDrafts??{}).some(context=>context.nativeDocument&&isNativeCreatorRecoverySource(context.nativeDocument.source)&&context.nativeDocument.source.draftId===candidate.draftId&&context.nativeDocument.source.recoveryId===candidate.recoveryId);
 // A successful receipt whose target was undone/edited is not authority to revive it.
 const token=recoveryIdentityFingerprint(candidate);
 const recorded=data.receipts.some(r=>r.actorId===actorId&&r.kind==='legacy-recovery-handoff'&&r.fingerprint.startsWith(token+':'));
 return saved||recorded?{kind:'changed'}:{kind:'none'};
}
function recoveryIdentityFingerprint(candidate:LegacyCreatorRecoveryCandidate){return stableAuthoringJson([candidate.storageKey,candidate.draftId,candidate.recoveryId]);}
function fingerprint(request:LegacyCreatorRecoveryHandoffRequest,candidate:LegacyCreatorRecoveryCandidate){
 const text=stableAuthoringJson({selection:request.selection,targetDraftId:request.targetDraftId,working:request.working,source:sourceOf(candidate)});
 // Receipts are not private storage: only identity/digests, never raw or native JSON.
 return `${recoveryIdentityFingerprint(candidate)}:${text.length}:${stableAuthoringHash(text)}:${stableAuthoringHash([...text].reverse().join(''))}`;
}
/** Read-only prepare: caller supplies IDs/time, no storage or parser side effects. */
export function prepareLegacyCreatorRecoveryHandoff(data:ProgramData,input:{actorId:string;requestId:string;targetDraftId:string;selection:LegacyCreatorRecoverySelection;now:string},actualLegacyRaw:string|null):LegacyCreatorRecoveryHandoffPrepared{
 try{
  if(!validateProgramData(data)||!programIdentifier(input.requestId)||!programIdentifier(input.targetDraftId)||!stamp(input.now))return fail('invalid');
  if(input.actorId!=='local-user'||data.activeActorId!==input.actorId||!data.spaces[input.actorId])return fail('forbidden');
  const read=decodeLegacyCreatorRecoveries(actualLegacyRaw);if(read.kind!=='ready')return fail(read.kind==='empty'?'missing':read.kind);
  const candidate=read.candidates.find(c=>c.draftId===input.selection.draftId&&c.recoveryId===input.selection.recoveryId);if(!candidate)return fail('missing');
  if(!candidate.eligible)return fail('not-newer');if(input.now<candidate.recoveredAt)return fail('invalid');
  const existing=existingCandidate(data,input.actorId,candidate);if(existing.kind==='changed')return fail('already-changed');
  const space=data.spaces[input.actorId],workspace=space.creatorWorkspace;
  if(existing.kind==='none'&&workspace?.working&&!programSame(workspace.working,creatorWorkingFromRecord(workspace,workspace.working.draftId)))return fail('dirty-working');
  const target=existing.kind==='exact'?existing.working.draftId:input.targetDraftId;
  if(existing.kind==='none'&&(workspace?.library.records[target]||workspace?.working?.draftId===target))return fail('invalid');
  const mapped=mappedWorking(candidate,target,existing.kind==='exact'?existing.working.nativeDocument!.createdAt:input.now);if(!mapped)return fail('unsupported');
  const request:LegacyCreatorRecoveryHandoffRequest={version:1,actorId:input.actorId,requestId:input.requestId,targetDraftId:target,now:input.now,selection:programClone(input.selection),expectedRaw:read.raw,expectedSpace:programClone(space),working:mapped.working,mode:existing.kind==='exact'?'existing':'create'};
  return{ok:true,request,preview:{candidate:programClone(candidate),working:programClone(mapped.working),contextWarnings:mapped.contextWarnings,existingDraftId:existing.kind==='exact'?target:null}};
 }catch{return fail('invalid');}
}
/** Controller must reread the original key inside its exclusive mutation callback.
 * The two keys are not an atomic distributed transaction; this imports that exact read snapshot. */
export function handoffLegacyCreatorRecovery(data:ProgramData,request:LegacyCreatorRecoveryHandoffRequest,actualLegacyRaw:string|null):ProgramTransition<string>{
 try{
  if(request.version!==1||!validateProgramData(data)||data.activeActorId!==request.actorId||request.actorId!=='local-user')return programFailure(data,'forbidden');
  if(actualLegacyRaw!==request.expectedRaw)return programFailure(data,'conflict');
  const read=decodeLegacyCreatorRecoveries(actualLegacyRaw);if(read.kind!=='ready')return programFailure(data,'invalid');
  const candidate=read.candidates.find(c=>c.draftId===request.selection.draftId&&c.recoveryId===request.selection.recoveryId);if(!candidate||!candidate.eligible)return programFailure(data,'invalid');
  const digest=fingerprint(request,candidate),prior=data.receipts.find(r=>r.actorId===request.actorId&&r.id===request.requestId);
  if(prior){if(prior.kind!=='legacy-recovery-handoff'||prior.fingerprint!==digest||prior.resultId!==request.targetDraftId)return programFailure(data,'duplicate-request');
   return programSame(data.spaces[request.actorId].creatorWorkspace?.working,request.working)?programResult(data,data,prior.resultId):programFailure(data,'conflict');}
  if(!programSame(data.spaces[request.actorId],request.expectedSpace))return programFailure(data,'conflict');
  const prepared=prepareLegacyCreatorRecoveryHandoff(data,{actorId:request.actorId,requestId:request.requestId,targetDraftId:request.targetDraftId,selection:request.selection,now:request.now},actualLegacyRaw);
  if(!prepared.ok)return programFailure(data,prepared.reason==='forbidden'?'forbidden':prepared.reason==='dirty-working'||prepared.reason==='already-changed'?'conflict':'invalid');
  if(!programSame(prepared.request,request))return programFailure(data,'conflict');
  if(request.mode==='existing')return programResult(data,data,request.targetDraftId);
  if(data.receipts.length>=2000)return programFailure(data,'limit');
  const next=programClone(data),space=next.spaces[request.actorId];space.creatorWorkspace??=createProgramCreatorWorkspace(request.now);space.creatorWorkspace.working=programClone(request.working);
  next.receipts.push({id:request.requestId,actorId:request.actorId,kind:'legacy-recovery-handoff',fingerprint:digest,resultId:request.targetDraftId});
  return validateProgramData(next)?programResult(data,next,request.targetDraftId):programFailure(data,'invalid');
 }catch{return programFailure(data,'invalid');}
}
