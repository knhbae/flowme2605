import {applyNativeCreatorDocumentOperation,applyNativeCreatorSourceDecision,applyNativeCreatorSourceSession,readNativeCreatorDocument,validateNativeCreatorDocument,validateNativeCreatorDocumentOwner} from './native-creator-document';
import {createAuthoringSourceSnapshotRef,createAuthoringSourceUpdateCandidate} from './native-creator-vendor/text-authoring/source-update';
import {stableAuthoringHash,stableAuthoringId,stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';
import {isProgramCreatorDraftJson} from './creator-draft-provenance';
import {createNativeSourceValidationCache} from './creator-native-source-update-cache';
import {requiresNativeCreatorAbsenceUpgrade} from './native-creator-absence';
import type {NativeCreatorDocumentOwner,TextAuthoringDocument,BuildAuthoringArtifactProjectionOptions} from './native-creator-document-contract';
import type {AuthoringSourceItemMatch} from './native-creator-vendor/text-authoring/types';
import type {ProgramNativeSourceChange} from './creator-native-source-update-contract';
import {CREATOR_NATIVE_SOURCE_EVENT_LIMIT,CREATOR_NATIVE_SOURCE_SESSION_LIMIT,type CreatorNativeSourceEnvelope as Envelope,type CreatorNativeSourceSession as Session,type CreatorNativeSourceAuthority as Authority,type CreatorNativeSourceEvent as Event,type CreatorNativeSourceReceipt as Receipt,type CreatorNativeSourceView as View,type CreatorNativeSourceDecision as Decision,type CreatorNativeSourceFailure as Failure,type CreatorNativeSourceResult as Result,type CreatorNativeSourceMutation as Mutation} from './creator-native-source-update-contract';

const copy=<T,>(v:T):T=>structuredClone(v);
const same=(a:unknown,b:unknown)=>stableAuthoringJson(a)===stableAuthoringJson(b);
const hash=(v:unknown)=>stableAuthoringHash(stableAuthoringJson(v));
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const shape=(v:unknown,keys:string[])=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const id=(v:unknown):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=1200&&!['__proto__','constructor','prototype'].includes(v);
const stamp=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const fail=<T,>(reason:Failure):Result<T>=>({ok:false,reason});
const good=<T,>(value:T):Result<T>=>({ok:true,value});
function utf8Hash(raw:string){let h=0x811c9dc5;for(const byte of new TextEncoder().encode(raw)){h^=byte;h=Math.imul(h,0x01000193);}return(h>>>0).toString(36).padStart(7,'0');}
function active(owner:NativeCreatorDocumentOwner){return owner.document.sourceState?.active??createAuthoringSourceSnapshotRef(owner.document,{capturedAt:owner.document.createdAt});}
function sourceId(owner:NativeCreatorDocumentOwner){const base=active(owner);return stableAuthoringId('source-identity',owner.id,base.sourceUrl??owner.document.sourceUrl,base.sourceTitle??owner.document.sourceTitle);}
const envelopeKeys=['envelopeVersion','adapter','collectorKind','eventId','candidateId','contentId','sourceId','externalVersion','baseSnapshotId','baseWorkingRevisionId','rawText','rawByteLength','rawByteHash','contentHash','mediaType','charset','collectedAt','receivedAt','providedBy','sourceOwnerClaim','idempotencyKey'];
function validEnvelope(owner:NativeCreatorDocumentOwner,value:unknown):value is Envelope{
 if(!shape(value,envelopeKeys)||!object(value))return false;
 const e=value as Envelope;
 if(e.envelopeVersion!==1||e.adapter!=='LOCAL_SYNTHETIC_HOST_ADAPTER'||e.collectorKind!=='local_synthetic'||e.charset!=='utf-8'||!['text/plain','text/markdown'].includes(e.mediaType)||!['eventId','candidateId','contentId','sourceId','externalVersion','baseSnapshotId','baseWorkingRevisionId','providedBy','sourceOwnerClaim','idempotencyKey'].every(k=>id(value[k]))||typeof e.rawText!=='string'||e.rawText.length>100000||!stamp(e.collectedAt)||!stamp(e.receivedAt)||e.receivedAt<e.collectedAt)return false;
 return e.rawByteLength===new TextEncoder().encode(e.rawText).byteLength&&e.rawByteHash===utf8Hash(e.rawText)&&e.contentHash===stableAuthoringHash(e.rawText)&&e.idempotencyKey===stableAuthoringId('source-idempotency',e.sourceId,e.externalVersion,e.rawByteHash)&&e.contentId===owner.document.documentId&&e.sourceId===sourceId(owner)&&e.baseSnapshotId===active(owner).snapshotId&&e.baseWorkingRevisionId===owner.document.revision.revisionId;
}
export function createCreatorNativeSourceEnvelope(owner:NativeCreatorDocumentOwner,input:{rawText:string;externalVersion:string;providedBy:string;sourceOwnerClaim:string;collectedAt:string;receivedAt:string;eventId?:string;candidateId?:string;mediaType?:'text/plain'|'text/markdown'}):Result<Envelope>{
 try{if(!validateNativeCreatorDocumentOwner(owner)||!isProgramCreatorDraftJson(input))return fail('invalid');const sid=sourceId(owner),rawByteHash=utf8Hash(input.rawText),candidateId=input.candidateId??stableAuthoringId('source-candidate',sid,input.externalVersion,rawByteHash),e:Envelope={envelopeVersion:1,adapter:'LOCAL_SYNTHETIC_HOST_ADAPTER',collectorKind:'local_synthetic',eventId:input.eventId??stableAuthoringId('source-event',candidateId,input.receivedAt),candidateId,contentId:owner.document.documentId,sourceId:sid,externalVersion:input.externalVersion,baseSnapshotId:active(owner).snapshotId,baseWorkingRevisionId:owner.document.revision.revisionId,rawText:input.rawText,rawByteLength:new TextEncoder().encode(input.rawText).byteLength,rawByteHash,contentHash:stableAuthoringHash(input.rawText),mediaType:input.mediaType??'text/markdown',charset:'utf-8',collectedAt:input.collectedAt,receivedAt:input.receivedAt,providedBy:input.providedBy,sourceOwnerClaim:input.sourceOwnerClaim,idempotencyKey:stableAuthoringId('source-idempotency',sid,input.externalVersion,rawByteHash)};return validEnvelope(owner,e)?good(e):fail('invalid-envelope');}catch{return fail('invalid-envelope');}
}
export function creatorNativeSourceAuthorityActor(s:Session){return s.version===2?s.ownerMapping?.targetActorId:s.actorId;}
function canRead(s:Session,a:Authority){return a.actorId===creatorNativeSourceAuthorityActor(s)&&a.draftId===s.draftId;}
function authorized(s:Session,a:Authority){return canRead(s,a)&&a.lane==='creator'&&a.permission===true&&!a.archived&&s.authorityConstraint==='creator_required'&&s.baseOwner.document.ownership==='creator'&&s.baseOwner.document.lifecycleStatus!=='archived';}
function sourceChanges(owner:NativeCreatorDocumentOwner):ProgramNativeSourceChange[]{const state=owner.document.sourceState;if(!state||state.status==='current')throw Error('invalid-candidate');return [...state.changes,...(owner.sourceRecurrences?.pending?.changes??[]),...(owner.sourceSubchecks?.pending?.changes??[])];}
/** Match the existing session's comparison-wide status, including the typed
 * Program recurrence lane. Its mandatory userValue is not itself a conflict:
 * only an actual working/source divergence is. Decisions never rewrite facts. */
function comparisonStatus(staged:NativeCreatorDocumentOwner):'conflict'|'comparing'{
 return staged.document.sourceState?.status==='conflict_source_vs_user'||[...(staged.sourceRecurrences?.pending?.changes??[]),...(staged.sourceSubchecks?.pending?.changes??[])].some(change=>!same(change.oldSourceValue,change.userValue))?'conflict':'comparing';
}
function unwrap(result:ReturnType<typeof applyNativeCreatorDocumentOperation>){if(!result.ok)throw Error(result.reason==='history-capacity'||result.reason==='document-capacity'?result.reason:'invalid-candidate');return result.owner;}
function stageOwner(s:Session){const candidate=createAuthoringSourceUpdateCandidate(s.candidateDocument,{capturedAt:s.envelope.collectedAt,externalVersion:s.envelope.externalVersion,matches:s.matches});const result=applyNativeCreatorDocumentOperation(s.baseOwner,{expectedOwner:s.baseOwner,requestId:`${s.sessionId}:stage`,operation:{type:'stage_source_update',candidate}},s.createdAt);if(!result.ok)throw Error(result.reason==='history-capacity'||result.reason==='document-capacity'?result.reason:'invalid-candidate');if(!result.changed)throw Error('no-new-source');sourceChanges(result.owner);return result.owner;}
type Chosen={changeId:string;decision:Decision;at:string;requestId:string};
function decidedOwner(s:Session,staged:NativeCreatorDocumentOwner,chosen:Chosen[]){let owner=staged;for(const d of chosen.filter(d=>d.decision!=='later').sort((a,b)=>a.at.localeCompare(b.at)||a.requestId.localeCompare(b.requestId))){owner=unwrap(applyNativeCreatorSourceDecision(owner,{expectedOwner:owner,requestId:`${s.sessionId}:decide:${d.requestId}`,decision:{decisionVersion:1,changeId:d.changeId,decision:d.decision as 'keep_working'|'use_incoming'}},d.at));}return owner;}
function receiptFor(s:Session,decided:NativeCreatorDocumentOwner,result:NativeCreatorDocumentOwner,at:string):Receipt{
 const read=readNativeCreatorDocument(result,s.projectionOptions);if(!read.ok)throw Error('invalid');
 const decisionSetHash=hash(sourceChanges(decided).map(c=>({changeId:c.changeId,state:c.state,resolution:c.resolution??null,actorLane:c.actorLane??null}))),applied=active(result);
 return{receiptVersion:1,receiptId:stableAuthoringId('native-source-apply-receipt',s.sessionId,s.envelope.idempotencyKey,decisionSetHash),sessionId:s.sessionId,candidateId:s.envelope.candidateId,eventId:s.envelope.eventId,idempotencyKey:s.envelope.idempotencyKey,baseSnapshotId:s.envelope.baseSnapshotId,appliedCandidateSnapshotId:applied.snapshotId,baseWorkingRevisionId:s.envelope.baseWorkingRevisionId,resultWorkingRevisionId:result.document.revision.revisionId,baseOwnerHash:hash(s.baseOwner),resultOwnerHash:hash(result),resultCanonicalHash:hash(result.document.parseResult.canonical),resultProjectionHash:hash(read.projection),decisionSetHash,projectionOptions:copy(s.projectionOptions),projectionOptionsHash:hash(s.projectionOptions),appliedAt:at,sideEffects:{publish:0,network:0,operatingWrite:0,privateExecutionWrite:0}};
}
function applyDecided(s:Session,decided:NativeCreatorDocumentOwner,chosen:readonly {changeId:string;decision:Decision}[],event:{requestId:string;at:string;applyVersion?:2}){
 const changes=sourceChanges(decided);if(changes.some(c=>c.state!=='resolved'||!chosen.some(d=>d.changeId===c.changeId&&d.decision!=='later')))throw Error('unresolved');
 const result=unwrap(applyNativeCreatorSourceSession(decided,{expectedOwner:decided,requestId:`${s.sessionId}:apply:${event.requestId}`},event.at,event.applyVersion??1));if(result.document.sourceState?.status!=='current'||active(result).snapshotId===s.envelope.baseSnapshotId)throw Error('invalid-candidate');
 return{result,decided,receipt:receiptFor(s,decided,result,event.at)};
}
function originalSessionPrefix(s:Session,revision:number):Session{
 const {ownerMapping:_,...original}=s;
 return {...original,version:1,revision,events:copy(s.events.slice(0,revision-1))};
}
function validOwnerMapping(s:Session):boolean{
 const mapping=s.ownerMapping;
 return !!mapping&&shape(mapping,['version','targetActorId','sourceRevision','sourceHash'])&&mapping.version===1
  &&id(mapping.targetActorId)&&mapping.targetActorId!==s.actorId&&Number.isSafeInteger(mapping.sourceRevision)
  &&mapping.sourceRevision>=1&&mapping.sourceRevision<=s.revision&&Array.isArray(s.events)
  &&mapping.sourceHash===hash(originalSessionPrefix(s,mapping.sourceRevision));
}
function validSessionBase(value:unknown):value is Session{
 if(object(value)&&value.version===2){
  const mapped=value as Session;
  return shape(value,['version','sessionId','actorId','draftId','revision','createdAt','authorityConstraint','baseOwner','envelope','candidateDocument','matches','projectionOptions','events','ownerMapping'])
   &&validOwnerMapping(mapped)&&validSessionBase(originalSessionPrefix(mapped,mapped.revision));
 }
 if(!isProgramCreatorDraftJson(value)||!shape(value,['version','sessionId','actorId','draftId','revision','createdAt','authorityConstraint','baseOwner','envelope','candidateDocument','matches','projectionOptions','events'])||!object(value))return false;
 const s=value as Session;
 if(!Array.isArray(s.matches)||s.matches.some(m=>!shape(m,['activeItemId','incomingItemId','basis'])||!id(m.activeItemId)||!id(m.incomingItemId)||!['explicit','stable_entity_id'].includes(m.basis)))return false;
 return s.version===1&&id(s.sessionId)&&id(s.actorId)&&id(s.draftId)&&stamp(s.createdAt)&&['creator_required','denied'].includes(s.authorityConstraint)&&validateNativeCreatorDocumentOwner(s.baseOwner)&&s.draftId===s.baseOwner.id&&s.createdAt>=s.baseOwner.updatedAt&&validEnvelope(s.baseOwner,s.envelope)&&s.createdAt>=s.envelope.receivedAt&&validateNativeCreatorDocument(s.candidateDocument)&&s.candidateDocument.documentId===s.baseOwner.document.documentId&&s.candidateDocument.rawText===s.envelope.rawText&&Array.isArray(s.matches)&&s.matches.length<=10000&&Array.isArray(s.events)&&s.events.length<=CREATOR_NATIVE_SOURCE_EVENT_LIMIT&&s.revision===s.events.length+1&&JSON.stringify(s).length<=CREATOR_NATIVE_SOURCE_SESSION_LIMIT&&s.sessionId===stableAuthoringId('native-source-session',s.actorId,s.draftId,s.envelope.idempotencyKey,hash(s.baseOwner))&&readNativeCreatorDocument(s.baseOwner,s.projectionOptions).ok;
}
/** Recompute every transition and receipt; persisted allow is never authority. */
function replay(s:Session):View{
 if(!validSessionBase(s))throw Error('invalid');const staged=stageOwner(s),initial=sourceChanges(staged),chosen=new Map<string,Chosen>(),ids=new Set<string>();let at=s.createdAt,status:View['status']=comparisonStatus(staged),selectedChangeId:string|null=null,scrollTop=0,resultOwner=s.baseOwner,receipt:Receipt|undefined;
 // Only one replay invocation owns this value. A changed decision invalidates it;
 // no persisted validation, authority, or caller-owned object is cached here.
 let decided:NativeCreatorDocumentOwner|undefined;
 const getDecided=()=>decided??=decidedOwner(s,staged,[...chosen.values()]);
 for(const e of s.events){if(!id(e.requestId)||ids.has(e.requestId)||!stamp(e.at)||e.at<at)throw Error('invalid');ids.add(e.requestId);at=e.at;const terminal=['rejected','undo-available','reverted'].includes(status);
  if(e.kind==='focus'){if(!shape(e,['kind','requestId','at','selectedChangeId','scrollTop'])||e.selectedChangeId!==null&&!initial.some(c=>c.changeId===e.selectedChangeId)||!Number.isSafeInteger(e.scrollTop)||e.scrollTop<0||e.scrollTop>10000000)throw Error('invalid');selectedChangeId=e.selectedChangeId;scrollTop=e.scrollTop;continue;}
  if(s.authorityConstraint==='denied')throw Error('forbidden');
  if(e.kind==='decision'){if(terminal||!shape(e,['kind','requestId','at','changeId','decision'])||!['keep_working','use_incoming','later'].includes(e.decision)||!initial.some(c=>c.changeId===e.changeId))throw Error('invalid');chosen.set(e.changeId,{changeId:e.changeId,decision:e.decision,at:e.at,requestId:e.requestId});decided=undefined;selectedChangeId=e.changeId;status=comparisonStatus(staged);}
  else if(e.kind==='defer'){if(terminal||!shape(e,['kind','requestId','at']))throw Error('invalid');status='deferred';}
  else if(e.kind==='reject'){if(terminal||!shape(e,['kind','requestId','at']))throw Error('invalid');const ready=getDecided(),rejected=unwrap(applyNativeCreatorDocumentOperation(ready,{expectedOwner:ready,requestId:`${s.sessionId}:reject:${e.requestId}`,operation:{type:'reject_source_update'}},e.at));if(rejected.document.sourceState?.status!=='current')throw Error('invalid');status='rejected';}
  else if(e.kind==='apply'){if(terminal||!shape(e,['kind','requestId','at','receipt',...(e.applyVersion===undefined?[]:['applyVersion'])])||e.applyVersion!==undefined&&e.applyVersion!==2)throw Error('invalid');const applied=applyDecided(s,getDecided(),[...chosen.values()],e);if(!same(e.receipt,applied.receipt))throw Error('invalid');resultOwner=applied.result;receipt=applied.receipt;status='undo-available';}
  else if(e.kind==='undo'){if(status!=='undo-available'||!shape(e,['kind','requestId','at']))throw Error('invalid');resultOwner=s.baseOwner;status='reverted';}
  else throw Error('invalid');
 }
 const stagedOwner=getDecided(),changes=sourceChanges(stagedOwner);
 return{workingAbsences:changes.flatMap(c=>c.kind==='changed'&&(c.field==='completion'||c.field==='schedule')&&s.baseOwner.effectiveAbsences?.entries.some(e=>e.itemId===c.activeItemId&&e.field===c.field)?[{changeId:c.changeId,itemId:c.activeItemId,field:c.field,effectiveValue:null}]:[]),status,creatorCanApply:false,changes:copy(changes),decisions:[...chosen.values()].map(({requestId:_,...d})=>d),selectedChangeId,scrollTop,unresolvedCount:changes.filter(c=>c.state!=='resolved'||!chosen.has(c.changeId)||chosen.get(c.changeId)?.decision==='later').length,comparison:{baseRawText:active(s.baseOwner).rawText??null,workingRawText:s.baseOwner.document.rawText,candidateRawText:s.envelope.rawText},...(receipt?{receipt}:{}),stagedOwner,resultOwner};
}
function reason(error:unknown):Failure{const text=error instanceof Error?error.message:'';return ['invalid','history-capacity','document-capacity','invalid-candidate','no-new-source','unresolved','forbidden'].includes(text)?text as Failure:'invalid';}
const validatedSessions=createNativeSourceValidationCache(value=>{try{replay(value as Session);return true;}catch{return false;}});
export function validateCreatorNativeSourceSession(value:unknown):value is Session{return validatedSessions.validate(value);}
/** Caller must have explicitly selected this source actor and the destination account. */
export function mapCreatorNativeSourceOwner(s:Session,selectedActorId:string,targetActorId:string):Result<Session>{
 try{
  if(!validateCreatorNativeSourceSession(s)||creatorNativeSourceAuthorityActor(s)!==selectedActorId||!id(targetActorId))return fail('forbidden');
  if(selectedActorId===targetActorId)return good(copy(s));
  // A second account transfer needs its own provenance chain; never silently replace one.
  if(s.version!==1)return fail('forbidden');
  const next:Session={...copy(s),version:2,ownerMapping:{version:1,targetActorId,sourceRevision:s.revision,sourceHash:hash(s)}};
  return validateCreatorNativeSourceSession(next)?good(next):fail('invalid');
 }catch{return fail('invalid');}
}
export function stageCreatorNativeSourceCandidate(owner:NativeCreatorDocumentOwner,input:{envelope:Envelope;candidateDocument:TextAuthoringDocument;matches?:AuthoringSourceItemMatch[];projectionOptions?:BuildAuthoringArtifactProjectionOptions;authority:Authority},now:string):Result<Session>{
 try{if(!validateNativeCreatorDocumentOwner(owner)||!validEnvelope(owner,input.envelope))return fail('invalid-envelope');if(requiresNativeCreatorAbsenceUpgrade(owner))return fail('explicit-absence-upgrade-required');if(owner.document.sourceState&&owner.document.sourceState.status!=='current')return fail('conflict');if(!id(input.authority.actorId)||input.authority.draftId!==owner.id)return fail('forbidden');const s:Session={version:1,sessionId:stableAuthoringId('native-source-session',input.authority.actorId,owner.id,input.envelope.idempotencyKey,hash(owner)),actorId:input.authority.actorId,draftId:owner.id,revision:1,createdAt:now,authorityConstraint:input.authority.permission&&input.authority.lane==='creator'&&!input.authority.archived?'creator_required':'denied',baseOwner:copy(owner),envelope:copy(input.envelope),candidateDocument:copy(input.candidateDocument),matches:copy(input.matches??[]),projectionOptions:copy(input.projectionOptions??{}),events:[]};replay(s);return good(s);}catch(e){return fail(reason(e));}
}
export function readCreatorNativeSourceSession(s:Session,owner:NativeCreatorDocumentOwner,authority:Authority):Result<View>{try{const view=replay(s);if(!validateNativeCreatorDocumentOwner(owner)||!canRead(s,authority))return fail('forbidden');if(!same(owner,view.resultOwner))view.status='stale-candidate';view.creatorCanApply=authorized(s,authority)&&view.status!=='stale-candidate'&&!['rejected','reverted'].includes(view.status);return good(view);}catch(e){return fail(reason(e));}}
type EventInput={kind:'decision';changeId:string;decision:Decision}|{kind:'focus';selectedChangeId:string|null;scrollTop:number}|{kind:'defer'}|{kind:'reject'}|{kind:'apply'}|{kind:'undo'};
export function transitionCreatorNativeSourceSession(s:Session,owner:NativeCreatorDocumentOwner,input:{expectedSession:Session;requestId:string;event:EventInput;authority:Authority;injectFailure?:'before-domain-apply'|'before-commit'},now:string):Result<Mutation>{
 try{const view=replay(s);if(!canRead(s,input.authority)||(input.event.kind!=='focus'&&!authorized(s,input.authority)))return fail('forbidden');if(!validateNativeCreatorDocumentOwner(owner)||!same(owner,view.resultOwner))return fail('stale-candidate');if(!id(input.requestId)||!stamp(now)||now<(s.events.at(-1)?.at??s.createdAt))return fail('invalid');
  const prior=s.events.find(e=>e.requestId===input.requestId);if(prior){const {requestId:_,at:__,...payload}=prior;const comparable=prior.kind==='apply'?{kind:'apply'}:payload;if(!same(comparable,input.event))return fail('conflict');if(prior.kind==='apply'&&view.status!=='undo-available')return fail('terminal-session');return good({session:s,owner,changed:false,ownerChanged:false,replayed:true});}
  if(!same(input.expectedSession,s))return fail('conflict');if(s.events.length>=CREATOR_NATIVE_SOURCE_EVENT_LIMIT)return fail('history-capacity');if(input.event.kind!=='focus'&&['rejected','reverted','undo-available'].includes(view.status)&&!(view.status==='undo-available'&&input.event.kind==='undo'))return fail('terminal-session');
  if(input.event.kind==='focus'&&view.selectedChangeId===input.event.selectedChangeId&&view.scrollTop===input.event.scrollTop)return good({session:s,owner,changed:false,ownerChanged:false,replayed:false});
  const requestedEvent=input.event;if(requestedEvent.kind==='decision'&&view.decisions.some(d=>d.changeId===requestedEvent.changeId&&d.decision===requestedEvent.decision))return good({session:s,owner,changed:false,ownerChanged:false,replayed:false});
  if(input.injectFailure==='before-domain-apply')return fail('injected-failure');
  let event:Event;if(input.event.kind==='apply'){if(view.unresolvedCount)return fail('unresolved');const applied=applyDecided(s,view.stagedOwner,view.decisions,{requestId:input.requestId,at:now,applyVersion:2});event={kind:'apply',applyVersion:2,requestId:input.requestId,at:now,receipt:applied.receipt};}else event={...input.event,requestId:input.requestId,at:now};
  const next:Session={...copy(s),revision:s.revision+1,events:[...copy(s.events),event]},checked=replay(next);if(input.injectFailure==='before-commit')return fail('injected-failure');return good({session:next,owner:checked.resultOwner,changed:true,ownerChanged:!same(owner,checked.resultOwner),replayed:false});
 }catch(e){return fail(reason(e));}
}
export function serializeCreatorNativeSourceSession(s:Session):Result<string>{return validateCreatorNativeSourceSession(s)?good(stableAuthoringJson(s)):fail('invalid');}
export function hydrateCreatorNativeSourceSession(raw:string):Result<Session>{try{if(typeof raw!=='string'||raw.length>CREATOR_NATIVE_SOURCE_SESSION_LIMIT)return fail('invalid');const parsed:unknown=JSON.parse(raw);return validateCreatorNativeSourceSession(parsed)?good(parsed):fail('invalid');}catch{return fail('invalid');}}
