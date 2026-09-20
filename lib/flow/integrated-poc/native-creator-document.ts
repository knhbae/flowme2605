import {isProgramCreatorDraftJson} from './creator-draft-provenance';
import {readNativeCreatorRecoverySource} from './native-creator-recovery-source';
import {isNativeCreatorRecoverySource,nativeCreatorSourceIdentity,type NativeCreatorDocumentProvenance} from './native-creator-document-contract';
import {createNativeOwnerReplayCache} from './native-owner-replay-cache';
import {applyAuthoringOperation} from './native-creator-vendor/text-authoring/operations';
import {buildAuthoringArtifactProjection} from './native-creator-vendor/text-authoring/artifact-projection';
import {validateTextAuthoringDocument} from './native-creator-vendor/text-authoring/validation';
import {stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';
import {isValidAuthoringDate} from './native-creator-vendor/text-authoring/recurrence';
import {replayNativeSourceDecision} from './creator-native-source-update-decision';
import {replayNativeSourceApply} from './creator-native-source-update-apply';
import {needsNativeSourceRecurrenceStage,stageNativeSourceRecurrences,decideNativeSourceRecurrence,normalizeNativeSourceRecurrenceProbe,applyNativeSourceRecurrenceResult,updateNativeSourceRecurrences,projectNativeSourceRecurrences} from './creator-native-source-update-recurrence';
import {needsNativeSourceSubcheckStage,stageNativeSourceSubchecks,decideNativeSourceSubchecks,normalizeNativeSourceSubcheckProbe,clearAcceptedSubcheckSessionScheduleProperties,applyNativeSourceSubcheckResult,updateNativeSourceSubchecks} from './creator-native-source-update-subchecks';
import {applyNativeCreatorAbsences,nextNativeCreatorAbsences,replayNativeCreatorAbsenceUpgrade,nativeCreatorAbsenceLosses,requiresNativeCreatorAbsenceUpgrade,type NativeCreatorAbsenceRecoveryField} from './native-creator-absence';
import {NATIVE_CREATOR_ACTION_LIMIT,NATIVE_CREATOR_DOCUMENT_JSON_LIMIT,NATIVE_CREATOR_OWNER_JSON_LIMIT,
 type NativeCreatorDocumentOwner,type NativeCreatorDocumentSource,type NativeCreatorRecordUi,type NativeCreatorActionPayload,
 type NativeCreatorDocumentResult,type NativeCreatorDocumentRead,type TextAuthoringDocument,type AuthoringCorrectionOperation,
 type BuildAuthoringArtifactProjectionOptions,type NativeCreatorSourceDecision,type NativeCreatorEffectiveAbsences,type NativeCreatorSourceRecurrences,type NativeCreatorSourceSubchecks} from './native-creator-document-contract';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=1200&&!['__proto__','prototype','constructor'].includes(v);
const stamp=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const same=(a:unknown,b:unknown)=>stableAuthoringJson(a)===stableAuthoringJson(b);
const shape=(v:unknown,required:string[],optional:string[]=[]):v is Record<string,unknown>=>object(v)&&required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
const copy=<T,>(value:T):T=>structuredClone(value);
const failure=(reason:Extract<NativeCreatorDocumentResult,{ok:false}>['reason']):NativeCreatorDocumentResult=>({ok:false,reason});

/** Native DTO boundary: preserve saved canonical state, never reparse its raw. */
export function validateNativeCreatorDocument(value:unknown):value is TextAuthoringDocument {
 try {
  if(!isProgramCreatorDraftJson(value)||!shape(value,['schemaVersion','documentId','ownership','title','rawText','inputKinds','primaryInputKind','parseResult','revision','revisionHistory','lifecycleStatus','createdAt','updatedAt'],['sourceTitle','sourceUrl','reviewGates','sourceState','forkedFrom','features','uiState'])
    ||!['flowme-text-authoring-v1','flowme-text-authoring-v2'].includes(value.schemaVersion as string)||value.ownership!=='creator'||!id(value.documentId)
    ||typeof value.title!=='string'||typeof value.rawText!=='string'||value.rawText.length>100000||!Array.isArray(value.inputKinds)||!Array.isArray(value.revisionHistory)
    ||!stamp(value.createdAt)||!stamp(value.updatedAt)||!object(value.revision)||!id(value.revision.revisionId)||JSON.stringify(value).length>NATIVE_CREATOR_DOCUMENT_JSON_LIMIT)return false;
  const doc=value as TextAuthoringDocument;
  if(!['draft','needs_review','previewed','archived'].includes(doc.lifecycleStatus)||!Array.isArray(doc.parseResult.canonical.items)||!Array.isArray(doc.parseResult.canonical.sourceRows))return false;
  return validateTextAuthoringDocument(doc).valid;
 }catch{return false;}
}
export function readNativeCreatorSavedDocument(source:unknown):TextAuthoringDocument|null {
 try {
  if(!isProgramCreatorDraftJson(source)||!shape(source,['storageKey','draftId','versionId','revisionId','documentJson'])||source.storageKey!=='flow:text-authoring:drafts:v1'||!id(source.draftId)||!id(source.versionId)||!id(source.revisionId)||typeof source.documentJson!=='string'||source.documentJson.length>NATIVE_CREATOR_DOCUMENT_JSON_LIMIT)return null;
  const document:unknown=JSON.parse(source.documentJson);return validateNativeCreatorDocument(document)&&document.revision.revisionId===source.revisionId?document:null;
 }catch{return null;}
}
/** Owner initialization/source comparison supports recovery; saved restore does not. */
export function readNativeCreatorSourceDocument(source:unknown):TextAuthoringDocument|null {
 if(!isProgramCreatorDraftJson(source))return null;
 if(object(source)&&source.kind==='legacy-recovery'){
  const recovery=readNativeCreatorRecoverySource(source);return recovery?JSON.parse(recovery.documentJson) as TextAuthoringDocument:null;
 }
 return readNativeCreatorSavedDocument(source);
}
function validUi(value:unknown):value is NativeCreatorRecordUi {
 return shape(value,[],['activeStage','focusTarget','selectedItemId','primaryArtifact'])&&(value.activeStage===undefined||['input','structure','result'].includes(value.activeStage as string))
  &&(value.focusTarget===undefined||id(value.focusTarget))&&(value.selectedItemId===undefined||id(value.selectedItemId))&&(value.primaryArtifact===undefined||['calendar','todo','sheet','memo'].includes(value.primaryArtifact as string));
}
const operationKeys:Record<string,{required:string[];optional?:string[]}>= {
 merge:{required:['itemIds']},split:{required:['itemId','at']},indent:{required:['itemId']},outdent:{required:['itemId']},reorder:{required:['itemId','toIndex']},align_source_order:{required:['orderedItemIds']},rename:{required:['itemId','title']},change_role:{required:['itemId','role']},include:{required:['itemId']},exclude:{required:['itemId']},restore:{required:[],optional:['itemId']},classify_issue:{required:['issueId','outcome'],optional:['targetStepId','titleOverride']},set_property:{required:['itemId','key','value']},sync_item_to_working_text:{required:['itemId','patch']},sync_working_text_from_input:{required:['rawText'],optional:['title','sourceTitle','sourceUrl','reviewRequirements']},record_review_decision:{required:['gateId','status'],optional:['evidenceNote']},reopen_review:{required:['gateId']},stage_source_update:{required:['candidate']},resolve_source_conflict:{required:['changeId','resolution']},apply_source_update:{required:[]},reject_source_update:{required:[]},undo:{required:[]},
};
function validOperation(value:unknown):value is AuthoringCorrectionOperation {
 if(!object(value)||typeof value.type!=='string'||!Object.hasOwn(operationKeys,value.type))return false;
 const keys=operationKeys[value.type];if(!shape(value,['type',...keys.required],keys.optional))return false;
 for(const field of ['itemId','issueId','gateId','changeId','targetStepId'])if(value[field]!==undefined&&!id(value[field]))return false;
 for(const field of ['title','value','rawText','sourceTitle','sourceUrl','titleOverride','evidenceNote'])if(value[field]!==undefined&&(typeof value[field]!=='string'||value[field].length>100000))return false;
 for(const field of ['at','toIndex'])if(value[field]!==undefined&&(!Number.isSafeInteger(value[field])||(value[field] as number)<0))return false;
 for(const field of ['itemIds','orderedItemIds'])if(value[field]!==undefined&&(!Array.isArray(value[field])||!(value[field] as unknown[]).every(id)||new Set(value[field] as unknown[]).size!==(value[field] as unknown[]).length))return false;
 if(value.type==='change_role'&&!['item','resource','guide','caution','completion'].includes(value.role as string))return false;
 if(value.type==='set_property'&&!['title','detail','completion','date','relative_date','time','timezone','place','duration','repeat','condition','resource','source'].includes(value.key as string))return false;
 if(value.type==='classify_issue'&&!['keep_source_only','hold','convert_to_item'].includes(value.outcome as string))return false;
 if(value.type==='record_review_decision'&&!['evidence_recorded','personal_only'].includes(value.status as string))return false;
 if(value.type==='resolve_source_conflict'&&!['keep_user','use_incoming','include_added','exclude_added','keep_previous','remove_removed'].includes(value.resolution as string))return false;
 return true;
}
type ReplayState={document:TextAuthoringDocument;recordUi:NativeCreatorRecordUi;effectiveAbsences?:NativeCreatorEffectiveAbsences;sourceRecurrences?:NativeCreatorSourceRecurrences;sourceSubchecks?:NativeCreatorSourceSubchecks};
type ReplayHistory={effectiveAbsences?:NativeCreatorEffectiveAbsences;sourceRecurrences?:NativeCreatorSourceRecurrences;sourceSubchecks?:NativeCreatorSourceSubchecks};
function applyPayload(document:TextAuthoringDocument,recordUi:NativeCreatorRecordUi,payload:NativeCreatorActionPayload,at:string,original:NativeCreatorDocumentProvenance,prior?:NativeCreatorEffectiveAbsences,undo?:NativeCreatorEffectiveAbsences,hasLegacyApply=false,recurrences?:NativeCreatorSourceRecurrences,undoRecurrences?:NativeCreatorSourceRecurrences,subchecks?:NativeCreatorSourceSubchecks,undoSubchecks?:NativeCreatorSourceSubchecks):ReplayState|null {
 const unchanged=():ReplayState=>({document,recordUi,...(prior?{effectiveAbsences:copy(prior)}:{}),...(recurrences?{sourceRecurrences:copy(recurrences)}:{}),...(subchecks?{sourceSubchecks:copy(subchecks)}:{})});
 const finish=(next:TextAuthoringDocument,ui=recordUi,sourceRecurrences=updateNativeSourceRecurrences(document,next,recurrences,payload,undoRecurrences),sourceSubchecks=updateNativeSourceSubchecks(subchecks,payload,undoSubchecks)):ReplayState=>{const effectiveAbsences=nextNativeCreatorAbsences(document,next,prior,payload,undo),effective=applyNativeCreatorAbsences(next,effectiveAbsences);if(!validateNativeCreatorDocument(effective))throw Error('invalid-effective-document');return{document:effective,recordUi:ui,...(effectiveAbsences?{effectiveAbsences}:{}),...(sourceRecurrences?{sourceRecurrences}:{}),...(sourceSubchecks?{sourceSubchecks}:{})};};
 if(payload.kind==='source-stage'){
  if(!shape(payload,['kind','stageVersion','candidate'],['requestId','at'])||![1,2].includes(payload.stageVersion))return null;
  const originalDocument=readNativeCreatorSourceDocument(original);if(!originalDocument)return null;
  if(payload.stageVersion===2){const staged=stageNativeSourceSubchecks(document,payload.candidate,at,originalDocument,subchecks,recurrences);return staged?finish(staged.document,recordUi,staged.sourceRecurrences,staged.sourceSubchecks):payload.candidate.snapshot.contentFingerprint===document.sourceState?.active.contentFingerprint?unchanged():null;}
  const staged=stageNativeSourceRecurrences(document,payload.candidate,at,originalDocument,recurrences);return staged?finish(staged.document,recordUi,staged.sourceRecurrences):payload.candidate.snapshot.contentFingerprint===document.sourceState?.active.contentFingerprint?unchanged():null;
 }
 if(payload.kind==='source-absence-upgrade'){
  if(!shape(payload,['kind','upgradeVersion'],['requestId','at'])||payload.upgradeVersion!==1||document.sourceState?.status!=='current')return null;
  if(!hasLegacyApply)return unchanged();
  const upgraded=replayNativeCreatorAbsenceUpgrade(document,prior);return validateNativeCreatorDocument(upgraded.document)?{...upgraded,recordUi,...(recurrences?{sourceRecurrences:copy(recurrences)}:{}),...(subchecks?{sourceSubchecks:copy(subchecks)}:{})}:null;
 }
 if(payload.kind==='restore'){
  const restored=readNativeCreatorSavedDocument(payload.source);if(!restored||payload.source.draftId!==original.draftId||payload.source.storageKey!==original.storageKey||restored.documentId!==document.documentId)return null;
  return {document:restored,recordUi};
 }
 if(payload.kind==='ui')return validUi(payload.recordUi)?finish(document,copy(payload.recordUi)):null;
 if(payload.kind==='source-apply'){
  if(!shape(payload,['kind','applyVersion'],['requestId','at'])||![1,2].includes(payload.applyVersion))return null;
  if(recurrences?.pending||subchecks?.pending){
   if(payload.applyVersion!==2||!document.sourceState||document.sourceState.status==='current')return null;
   let normalized=subchecks?.pending?normalizeNativeSourceSubcheckProbe(document,document.sourceState.incoming):document;
   if(recurrences?.pending)normalized=normalizeNativeSourceRecurrenceProbe(normalized,document.sourceState.incoming);
   let next=replayNativeSourceApply(normalized,at,2);if(!next)return null;
   if(subchecks?.pending)next=clearAcceptedSubcheckSessionScheduleProperties(document,next);
   let sourceRecurrences=recurrences,sourceSubchecks=subchecks;
   if(recurrences?.pending){const result=applyNativeSourceRecurrenceResult(document,next,recurrences);next=result.document;sourceRecurrences=result.sourceRecurrences;}
   if(subchecks?.pending){const result=applyNativeSourceSubcheckResult(document,next,subchecks);next=result.document;sourceSubchecks=result.sourceSubchecks;}
   return finish(next,recordUi,sourceRecurrences,sourceSubchecks);
  }
  const next=replayNativeSourceApply(document,at,payload.applyVersion);return next&&validateNativeCreatorDocument(next)&&next.documentId===document.documentId?finish(next):null;
 }
 if(payload.kind==='source-decision'){
  if(!shape(payload,['kind','decisionVersion','changeId','decision'],['requestId','at'])||payload.decisionVersion!==1||!id(payload.changeId))return null;
  const recurrence=recurrences&&decideNativeSourceRecurrence(recurrences,payload,at);if(recurrence)return finish(document,recordUi,recurrence);
  const checks=subchecks&&decideNativeSourceSubchecks(subchecks,payload,at);if(checks)return finish(document,recordUi,recurrences,checks);
  const next=replayNativeSourceDecision(document,payload,at);return next&&validateNativeCreatorDocument(next)&&next.documentId===document.documentId?finish(next):null;
 }
 if(payload.kind!=='operation'||!validOperation(payload.operation))return null;
 // Original operations retain undefined optional snapshot fields in memory. The
 // original repository's JSON transport omits those fields; use that same DTO
 // boundary, not a raw reparse or canonical regeneration.
 const next:unknown=JSON.parse(JSON.stringify(applyAuthoringOperation(document,payload.operation,{actorLane:'creator',now:at})));
 if(!validateNativeCreatorDocument(next)||next.documentId!==document.documentId)return null;
 if(same(next,document))return unchanged();
 return finish(next);
}
function undoRevisionId(document:TextAuthoringDocument):string|undefined {const stack:string[]=[];for(const revision of document.revisionHistory)for(const operation of revision.operations){if(operation.type==='undo')stack.pop();else if(revision.before)stack.push(revision.revisionId);}return stack.at(-1);}
function replayOwner(owner:NativeCreatorDocumentOwner,beforeAbsences=new Map<string,ReplayHistory>()):ReplayState|null {
 let document=readNativeCreatorSourceDocument(owner.source),recordUi=copy(owner.initialRecordUi),at=owner.createdAt,effectiveAbsences:NativeCreatorEffectiveAbsences|undefined,sourceRecurrences:NativeCreatorSourceRecurrences|undefined,sourceSubchecks:NativeCreatorSourceSubchecks|undefined,currentSource=owner.source,hasLegacyApply=false;const ids=new Set<string>();if(!document)return null;
 if(isNativeCreatorRecoverySource(owner.source)&&owner.createdAt<owner.source.recoveredAt)return null;
 const sources=new Map([[nativeCreatorSourceIdentity(owner.source),owner.source.documentJson]]);
 for(const action of owner.actions){
  const fields=action.kind==='restore'?['source']:action.kind==='operation'?['operation']:action.kind==='ui'?['recordUi']:action.kind==='source-decision'?['decisionVersion','changeId','decision']:action.kind==='source-apply'?['applyVersion']:action.kind==='source-absence-upgrade'?['upgradeVersion']:action.kind==='source-stage'?['stageVersion','candidate']:null;
  if(!fields||!shape(action,['kind','requestId','at',...fields])||!id(action.requestId)||ids.has(action.requestId)||!stamp(action.at)||action.at<at)return null;
  if(action.kind==='restore'){if(!readNativeCreatorSavedDocument(action.source))return null;const key=nativeCreatorSourceIdentity(action.source);if(sources.has(key)&&sources.get(key)!==action.source.documentJson)return null;sources.set(key,action.source.documentJson);}
  const previous:ReplayState={document,recordUi,...(effectiveAbsences?{effectiveAbsences}:{}),...(sourceRecurrences?{sourceRecurrences}:{}),...(sourceSubchecks?{sourceSubchecks}:{})},undo=beforeAbsences.get(undoRevisionId(document)??'');const next=applyPayload(document,recordUi,action,action.at,currentSource,effectiveAbsences,undo?.effectiveAbsences,hasLegacyApply,sourceRecurrences,undo?.sourceRecurrences,sourceSubchecks,undo?.sourceSubchecks);if(!next||same(next,previous))return null;
  if(next.document.revision.revisionId!==document.revision.revisionId)beforeAbsences.set(next.document.revision.revisionId,copy({effectiveAbsences,sourceRecurrences,sourceSubchecks}));
  ids.add(action.requestId);document=next.document;recordUi=next.recordUi;effectiveAbsences=next.effectiveAbsences;sourceRecurrences=next.sourceRecurrences;sourceSubchecks=next.sourceSubchecks;at=action.at;if(action.kind==='source-apply'&&action.applyVersion===1)hasLegacyApply=true;if(action.kind==='restore')currentSource=action.source;
 }
 if(at!==owner.updatedAt)return null;return{document,recordUi,...(effectiveAbsences?{effectiveAbsences}:{}),...(sourceRecurrences?{sourceRecurrences}:{}),...(sourceSubchecks?{sourceSubchecks}:{})};
}
/** Replay guards against forged current canonical fields after canonical key sorting/reload. */
function validatedOwnerReplay(value:unknown):ReplayState|null {
 try {
  if(!isProgramCreatorDraftJson(value)||!shape(value,['version','id','revision','createdAt','updatedAt','source','initialRecordUi','document','recordUi','actions'],['effectiveAbsences','sourceRecurrences','sourceSubchecks'])||value.version!==1||!id(value.id)||!stamp(value.createdAt)||!stamp(value.updatedAt)||!validUi(value.initialRecordUi)||!validUi(value.recordUi)||!Array.isArray(value.actions)||value.actions.length>NATIVE_CREATOR_ACTION_LIMIT||value.revision!==value.actions.length+1||JSON.stringify(value).length>NATIVE_CREATOR_OWNER_JSON_LIMIT)return null;
  if(Object.hasOwn(value,'effectiveAbsences')&&(!shape(value.effectiveAbsences,['version','entries'])||value.effectiveAbsences.version!==1||!Array.isArray(value.effectiveAbsences.entries)||!value.effectiveAbsences.entries.length||!value.effectiveAbsences.entries.every(e=>shape(e,['itemId','field','sourceSnapshotId'])&&id(e.itemId)&&id(e.sourceSnapshotId)&&['completion','schedule'].includes(e.field as string))))return null;
  const owner=value as NativeCreatorDocumentOwner,state=replayOwner(owner);return state&&same(state,{document:owner.document,recordUi:owner.recordUi,...(Object.hasOwn(owner,'effectiveAbsences')?{effectiveAbsences:owner.effectiveAbsences}:{}),...(Object.hasOwn(owner,'sourceRecurrences')?{sourceRecurrences:owner.sourceRecurrences}:{}),...(Object.hasOwn(owner,'sourceSubchecks')?{sourceSubchecks:owner.sourceSubchecks}:{})})?state:null;
 }catch{return null;}
}
const ownerReplayCache=createNativeOwnerReplayCache(validatedOwnerReplay);
export function validateNativeCreatorDocumentOwner(value:unknown):value is NativeCreatorDocumentOwner {return ownerReplayCache.read(value)!==null;}
export function createNativeCreatorDocumentOwner(input:{id:string;source:NativeCreatorDocumentProvenance;currentRecordUi?:NativeCreatorRecordUi},now:string):NativeCreatorDocumentResult {
 if(!isProgramCreatorDraftJson(input)||!shape(input,['id','source'],['currentRecordUi'])||!id(input.id)||!stamp(now))return failure('invalid');
 const document=readNativeCreatorSourceDocument(input.source);if(!document)return failure('unsupported-codec');const ui=input.currentRecordUi??{};if(!validUi(ui))return failure('invalid');
 const owner:NativeCreatorDocumentOwner={version:1,id:input.id,revision:1,createdAt:now,updatedAt:now,source:copy(input.source),initialRecordUi:copy(ui),document,recordUi:copy(ui),actions:[]};
 return validateNativeCreatorDocumentOwner(owner)?{ok:true,owner,changed:true}:failure('invalid');
}
function commit(owner:NativeCreatorDocumentOwner,input:{expectedOwner:NativeCreatorDocumentOwner;requestId:string},payload:NativeCreatorActionPayload,now:string):NativeCreatorDocumentResult {
 try {
  if(!validateNativeCreatorDocumentOwner(owner)||!isProgramCreatorDraftJson(input)||!isProgramCreatorDraftJson(payload)||!id(input.requestId)||!stamp(now))return failure('invalid');
  const prior=owner.actions.find(a=>a.requestId===input.requestId);
  if(prior){const {requestId:_,at:__,...oldPayload}=prior;return same(oldPayload,payload)?{ok:true,owner,changed:false}:failure('conflict');}
  if(!same(owner,input.expectedOwner)||now<owner.updatedAt)return failure('conflict');
  const history=new Map<string,ReplayHistory>();if(payload.kind==='operation'&&payload.operation.type==='undo')replayOwner(owner,history);
  const undo=history.get(undoRevisionId(owner.document)??''),currentSource=[...owner.actions].reverse().find(a=>a.kind==='restore');
  const next=applyPayload(owner.document,owner.recordUi,payload,now,currentSource?.kind==='restore'?currentSource.source:owner.source,owner.effectiveAbsences,undo?.effectiveAbsences,owner.actions.some(a=>a.kind==='source-apply'&&a.applyVersion===1),owner.sourceRecurrences,undo?.sourceRecurrences,owner.sourceSubchecks,undo?.sourceSubchecks);if(!next)return failure(payload.kind==='operation'?'unsupported-operation':'invalid');
  if(same(next,{document:owner.document,recordUi:owner.recordUi,...(owner.effectiveAbsences?{effectiveAbsences:owner.effectiveAbsences}:{}),...(owner.sourceRecurrences?{sourceRecurrences:owner.sourceRecurrences}:{}),...(owner.sourceSubchecks?{sourceSubchecks:owner.sourceSubchecks}:{})}))return{ok:true,owner,changed:false};
  if(owner.actions.length>=NATIVE_CREATOR_ACTION_LIMIT)return failure('history-capacity');
  const after:NativeCreatorDocumentOwner={...copy(owner),document:next.document,recordUi:next.recordUi,revision:owner.revision+1,updatedAt:now,actions:[...copy(owner.actions),{...copy(payload),requestId:input.requestId,at:now}]};
  if(next.effectiveAbsences)after.effectiveAbsences=next.effectiveAbsences;else delete after.effectiveAbsences;
  if(next.sourceRecurrences)after.sourceRecurrences=next.sourceRecurrences;else delete after.sourceRecurrences;
  if(next.sourceSubchecks)after.sourceSubchecks=next.sourceSubchecks;else delete after.sourceSubchecks;
  return validateNativeCreatorDocumentOwner(after)?{ok:true,owner:after,changed:true}:failure('invalid');
 }catch{return failure('invalid');}
}
export function applyNativeCreatorDocumentOperation(owner:NativeCreatorDocumentOwner,input:{expectedOwner:NativeCreatorDocumentOwner;requestId:string;operation:AuthoringCorrectionOperation},now:string):NativeCreatorDocumentResult {
 if(input.operation?.type==='stage_source_update'&&validateNativeCreatorDocumentOwner(owner)&&requiresNativeCreatorAbsenceUpgrade(owner))return failure('unsupported-operation');
 if(input.operation?.type==='stage_source_update'){try{if(isProgramCreatorDraftJson(input.operation)&&needsNativeSourceSubcheckStage(owner.document,input.operation.candidate,owner.sourceSubchecks))return commit(owner,input,{kind:'source-stage',stageVersion:2,candidate:input.operation.candidate},now);}catch{return failure('invalid');}}
 if(input.operation?.type==='stage_source_update'){try{if(isProgramCreatorDraftJson(input.operation)&&needsNativeSourceRecurrenceStage(owner.document,input.operation.candidate,owner.sourceRecurrences))return commit(owner,input,{kind:'source-stage',stageVersion:1,candidate:input.operation.candidate},now);}catch{return failure('invalid');}}
 return commit(owner,input,{kind:'operation',operation:input.operation},now);
}
export function applyNativeCreatorSourceDecision(owner:NativeCreatorDocumentOwner,input:{expectedOwner:NativeCreatorDocumentOwner;requestId:string;decision:NativeCreatorSourceDecision},now:string):NativeCreatorDocumentResult {
 return commit(owner,input,{kind:'source-decision',...input.decision},now);
}
export function applyNativeCreatorSourceSession(owner:NativeCreatorDocumentOwner,input:{expectedOwner:NativeCreatorDocumentOwner;requestId:string},now:string,applyVersion:1|2=2):NativeCreatorDocumentResult {
 return commit(owner,input,{kind:'source-apply',applyVersion},now);
}
export function previewNativeCreatorAbsenceUpgrade(owner:NativeCreatorDocumentOwner):{ok:true;required:boolean;fields:NativeCreatorAbsenceRecoveryField[]}|{ok:false;reason:'invalid'|'conflict'} {
 try{if(!validateNativeCreatorDocumentOwner(owner))return{ok:false,reason:'invalid'};if(owner.document.sourceState?.status!=='current')return{ok:false,reason:'conflict'};const fields=owner.actions.some(a=>a.kind==='source-apply'&&a.applyVersion===1)?nativeCreatorAbsenceLosses(owner.document,true):[];return{ok:true,required:fields.length>0,fields};}catch{return{ok:false,reason:'conflict'};}
}
export function upgradeNativeCreatorAbsences(owner:NativeCreatorDocumentOwner,input:{expectedOwner:NativeCreatorDocumentOwner;requestId:string},now:string):NativeCreatorDocumentResult {
 return commit(owner,input,{kind:'source-absence-upgrade',upgradeVersion:1},now);
}
export function restoreNativeCreatorDocument(owner:NativeCreatorDocumentOwner,input:{expectedOwner:NativeCreatorDocumentOwner;requestId:string;source:NativeCreatorDocumentSource},now:string):NativeCreatorDocumentResult {
 return commit(owner,input,{kind:'restore',source:input.source},now);
}
export function updateNativeCreatorRecordUi(owner:NativeCreatorDocumentOwner,input:{expectedOwner:NativeCreatorDocumentOwner;requestId:string;recordUi:NativeCreatorRecordUi},now:string):NativeCreatorDocumentResult {
 return commit(owner,input,{kind:'ui',recordUi:input.recordUi},now);
}
export function readNativeCreatorDocument(owner:NativeCreatorDocumentOwner,options:BuildAuthoringArtifactProjectionOptions={}):NativeCreatorDocumentRead {
 try {
  if(!validateNativeCreatorDocumentOwner(owner))return{ok:false,reason:'invalid'};
  if(!isProgramCreatorDraftJson(options)||!shape(options,[],['anchor','primaryArtifact','secondaryArtifacts','finiteOccurrenceLimit','occurrenceLimit','openEndedOccurrenceWeeks','recurrencePreviewWeeks'])
   ||options.anchor!==undefined&&!isValidAuthoringDate(options.anchor)||options.primaryArtifact!==undefined&&!['calendar','todo','sheet','memo'].includes(options.primaryArtifact)
   ||options.secondaryArtifacts!==undefined&&(!Array.isArray(options.secondaryArtifacts)||options.secondaryArtifacts.some(k=>!['calendar','todo','sheet','memo'].includes(k)))
   ||[options.finiteOccurrenceLimit,options.occurrenceLimit].some(n=>n!==undefined&&(!Number.isSafeInteger(n)||n<1||n>10000))
   ||[options.openEndedOccurrenceWeeks,options.recurrencePreviewWeeks].some(n=>n!==undefined&&(!Number.isSafeInteger(n)||n<1||n>520)))return{ok:false,reason:'invalid-projection-options'};
  const effective=applyNativeCreatorAbsences(owner.document,owner.effectiveAbsences,true),document=owner.sourceRecurrences?projectNativeSourceRecurrences(effective,owner.sourceRecurrences):effective,recordUi=copy(owner.recordUi);
  return{ok:true,document,recordUi,projection:buildAuthoringArtifactProjection(document,{...(recordUi.primaryArtifact?{primaryArtifact:recordUi.primaryArtifact}:{}),...options})};
 }catch{return{ok:false,reason:'invalid'};}
}
