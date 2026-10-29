import type {WritingOperation} from '../alpha-persistence/rea-writing-edit';
import {ownedIds} from './tagged-codec';
import type {AlphaAccount,AlphaPrivateCommand,AlphaReferenceContext,AlphaRepository,AlphaRecoveryPort,AlphaReceipt} from '../alpha-persistence/contract';
import {ALPHA_COMMAND_SCHEMA} from '../alpha-persistence/contract';
import {createAlphaClient} from '../alpha-persistence/client';
import {createAlphaMemoryRecovery} from '../alpha-persistence/local-recovery';
import {inspectStoredAlphaAccount,privateChanges} from '../alpha-persistence/program-adapter';
import {canonicalJson,detached,parseAlphaJson} from '../alpha-persistence/json';
import {exactAlphaPrivateChange} from '../alpha-private-save-ack';
import type {ReaStoredSpace} from '../rea-stored-text';
import {openTaggedSession,openMemoTaggedSession,type TaggedSession,type ReaInputCheckpoint} from './src/tagged-session';
import {exactReentryReceipt,reentryProgressUnproven,isReaInputCheckpoint,type AlphaTypedReentryRecovery,type ReaReentryAttempt,type ReaReentryCheckpoint} from '../alpha-sync/typed-reentry-recovery';
import {ALPHA_MEMO_BODY_PROFILE,inspectMemoCohort,isMemoAccount,prepareMemoBodyEdit,exactMemoBodyAck,type MemoSpace} from '../alpha-persistence/memo-cohort';
import type {AlphaReaProgressOperation} from '../alpha-persistence/rea-progress-edit';

export type TaggedAlphaAccount=AlphaAccount<ReaStoredSpace|MemoSpace>;
export function isTaggedAlphaTestAccount(value:unknown,refs:AlphaReferenceContext,ownerId?:string):value is TaggedAlphaAccount {
 const read=inspectStoredAlphaAccount(value,refs,ownerId);
 return read.kind==='rea-readonly'&&read.snapshot.source.actorId===read.snapshot.ownerId
  &&refs.actorIds.length===1&&refs.actorIds[0]===read.snapshot.ownerId&&!refs.social
  &&canonicalJson(value)===canonicalJson(read.snapshot);
}
type Stamp=ReturnType<TaggedSession['submissionStamp']>;
type ProgressCapture=Extract<ReturnType<TaggedSession['captureProgressOperations']>,{ok:true}>;
export type TaggedProgressSubmissionPort={prepare(input:{command:AlphaPrivateCommand;before:TaggedAlphaAccount;expected:TaggedAlphaAccount;operations:readonly AlphaReaProgressOperation[];writing:readonly WritingOperation[];stamp:Stamp;generation:number}):{ok:boolean;reason?:string};confirmed(command:AlphaPrivateCommand):void};
type PanelIntent={occurrenceId:string;recordDate:string;percent:number};
type WritingCapture=Extract<ReturnType<TaggedSession['captureWritingOperations']>,{ok:true}>;
type Attempt={writingCapture?:WritingCapture;command:AlphaPrivateCommand;before:TaggedAlphaAccount;expected:TaggedAlphaAccount;references:AlphaReferenceContext|undefined;session:TaggedSession;stamp:Stamp;json:string;generation:number;changed:boolean;progressCapture:ProgressCapture|null;stage:'SUBMITTED'|'UNVERIFIED'|'REJECTED';reentered?:ReaReentryAttempt};
const reject=(reason:string)=>({ok:false as const,reason});
const same=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b);
function copyReentryInput(value:unknown,documentId:string):ReaInputCheckpoint{
 const copy=parseAlphaJson(canonicalJson(value));
 if(!isReaInputCheckpoint(copy,documentId))throw Error('INVALID_REENTRY_INPUT_COPY');
 return copy;
}

/** Local integration using actual Alpha client/wire semantics and an injected memory repository.
 * No actual app route imports this host. Legacy account/HTTP guards remain v11-only. */
export function createTaggedAlphaTestHost(input:{scope:'local-typed-memory-test/1';ownerId:string;documentId:string;inputOwnerId:string;entityIds:readonly string[];references:AlphaReferenceContext;repository:AlphaRepository<ReaStoredSpace|MemoSpace>;recovery?:AlphaRecoveryPort<ReaStoredSpace|MemoSpace>;reentry?:AlphaTypedReentryRecovery;requestId:()=>string;progressSubmission?:TaggedProgressSubmissionPort;textProfile?:typeof ALPHA_MEMO_BODY_PROFILE}){
 if(input.scope!=='local-typed-memory-test/1')throw Error('MEMORY_TEST_SCOPE_REQUIRED');
 if(input.textProfile!==undefined&&input.textProfile!==ALPHA_MEMO_BODY_PROFILE)throw Error('UNSUPPORTED_HOST_PROFILE');
 const memo=input.textProfile===ALPHA_MEMO_BODY_PROFILE;
 if(memo&&input.progressSubmission)throw Error('MEMO_PROGRESS_NOT_SUPPORTED');
 if(input.reentry&&(memo||input.recovery||input.reentry.binding.ownerId!==input.ownerId||input.reentry.binding.docId!==input.documentId))throw Error('REENTRY_PROFILE_OR_BINDING_MISMATCH');
 const profileAccount=(value:unknown,refs:AlphaReferenceContext,ownerId?:string):value is TaggedAlphaAccount=>memo?!!ownerId&&isMemoAccount(value,ownerId,refs):isTaggedAlphaTestAccount(value,refs,ownerId);
 const references=detached(input.references),reentryRead=input.reentry?.probe();
 let reentryGate=reentryRead?.ok?reentryRead.value?.checkpoint?.attempt??null:null,observedReceipt:AlphaReceipt|null=null;
 const observe=<T extends {ok:boolean;value?:unknown}>(value:T)=>{const a=attempt?.reentered??checkpointAttempt();if(a&&value.ok&&exactReentryReceipt(a,value.value))observedReceipt=detached(value.value);return value;};
 const repository=input.reentry?{...input.repository,references:()=>input.repository.references?.()??detached(references),execute:async(command:Parameters<typeof input.repository.execute>[0])=>observe(await input.repository.execute(command)),lookup:async(id:string)=>observe(await input.repository.lookup(id))}:input.repository;
 if(!repository.references||!same(repository.references(),references))throw Error('TEST_REFERENCE_PORT_REQUIRED');
 let session:TaggedSession|null=null,attempt:Attempt|null=null,coverage:{stamp:Stamp;json:string}|null=null,writeBaseline:TaggedAlphaAccount|null=null;
 let panelIntent:PanelIntent|null=null;
 let generation=0,inflight=false,reading=false,disposed=false,phase='UNOPENED',panelRevision=0,panelPending=false,panelInput:unknown=null;
 function checkpointAttempt():ReaReentryAttempt|null{
  if(!attempt)return null;
  if(attempt.reentered){const a=detached(attempt.reentered);if(observedReceipt&&exactReentryReceipt(a,observedReceipt))a.receipt=detached(observedReceipt);return a;}
  const a={command:detached(attempt.command),commandJson:canonicalJson(attempt.command),before:detached(attempt.before),expected:detached(attempt.expected),references:detached(attempt.references),stamp:detached(attempt.stamp),generation:attempt.generation,operations:detached(attempt.progressCapture?.operations??[]),receipt:null} as ReaReentryAttempt;
  if(observedReceipt&&exactReentryReceipt(a,observedReceipt))a.receipt=detached(observedReceipt);return a;
 }
 if(input.reentry&&!input.reentry.bindCheckpoint(():ReaReentryCheckpoint|null=>{
  if(!session)return null;const captured=session.captureReentryInput();
  if(!captured.ok||panelPending)throw Error('LATEST_INPUT_CHECKPOINT_HELD');
  return{latest:copyReentryInput(captured.input,input.documentId),attempt:checkpointAttempt()};
 }))throw Error('REENTRY_CHECKPOINT_PROVIDER_ALREADY_BOUND');
 const validate=(value:unknown,ownerId:string,refs?:AlphaReferenceContext):value is TaggedAlphaAccount=>{
  if(!refs||!same(refs,references)||!profileAccount(value,refs,ownerId))return false;
  // Reject a wrong-but-valid readback before the shared client clears its pending request.
  if(attempt&&!same(value,attempt.before)&&!same(value,attempt.expected))return false;
  if(reentryGate&&!same(value,reentryGate.before)&&!same(value,reentryGate.expected))return false;
  return true;
 };
 const client=createAlphaClient<ReaStoredSpace|MemoSpace>(validate,input.reentry?.protocol??input.recovery??createAlphaMemoryRecovery<ReaStoredSpace|MemoSpace>());
 client.bindSession(input.ownerId,repository);
 const held=()=>!session||disposed||!!input.reentry?.inspect().retired||!!input.reentry?.inspect().reason||session.diagnostics().closed||session.diagnostics().composing||!!session.rejectedIntent();
 const covered=()=>!!session&&!!coverage&&!held()&&!panelPending&&same(session.submissionStamp(),coverage.stamp);
 const baselineMatches=()=>!!writeBaseline&&same(writeBaseline,client.snapshot().state?.confirmed);
 const canLeave=()=>{const c=client.snapshot();return!!session&&!held()&&!attempt&&!inflight&&!reading&&!panelPending&&covered()&&baselineMatches()&&!c.state?.pending&&!c.state?.draft&&['ready','saved','same-location'].includes(c.status);};
 const buildSession=(account:TaggedAlphaAccount,restored?:{latest:ReaInputCheckpoint;confirmed:TaggedAlphaAccount;progressHold:boolean})=>{
  let ownerSequence=generation+1, freshOwner=input.inputOwnerId+'-'+ownerSequence;
  // The same caller label is valid after restart, but the retired checkpoint's
  // input owner is never re-adopted. No history/stamp/token is imported.
  while(restored?.latest.inputOwnerIds.includes(freshOwner))freshOwner=input.inputOwnerId+'-'+(++ownerSequence);
  const text=account.space.text,used='schema' in text&&text.schema==='flowme-rea-text/1'?new Set([...ownedIds(text),...Object.keys(text.confirmationOrigins??{}),...Object.keys(text.insertionOrigins??{})]):new Set<string>();
  const entityIds=restored?.latest.entityPool??input.entityIds.filter(id=>!used.has(id));
  const opened=(memo?openMemoTaggedSession:openTaggedSession)({account,accountOwnerId:input.ownerId,references,docId:input.documentId,inputOwnerId:freshOwner,entityIds});
  if(!opened.ok)return opened;const round=opened.session.roundTrip();if(!round.ok)return round;
  if(restored){const accepted=opened.session.restoreReentryInput(restored.latest,restored.progressHold);if(!accepted.ok)return accepted;}
  const created=opened.session;
  if(!created.bindAppendHistoryGuard(target=>{
   const current=client.snapshot(),confirmed=current.state?.confirmed;
   if(session!==created||disposed||input.reentry?.inspect().retired||input.reentry?.inspect().reason||inflight||reading||panelPending||!baselineMatches()||!confirmed||current.state?.pending)return false;
   if(attempt&&(attempt.stage!=='REJECTED'||!current.retryableRejectedDraft||!same(confirmed,attempt.before)))return false;
   if(!attempt&&current.state?.draft)return false;
   const text=confirmed.space.text;
   if(!('schema' in text)||text.schema!=='flowme-rea-text/1')return false;
   // Only IDs absent from the exact confirmed account remain unsaved. An ACK
   // pins its captured expected IDs, not later local creations/working state.
   return!Object.values(text.documents).some(d=>Object.hasOwn(d.blocks,target.occurrenceId))
    &&(target.entityId===null||!Object.hasOwn(text.tasks,target.entityId));
  }))return reject('APPEND_HISTORY_GUARD_ALREADY_BOUND');
  if(!created.bindConfirmationHistoryGuard(()=>session===created&&!disposed&&!reading&&!panelPending&&baselineMatches()))return reject('CONFIRMATION_GUARD_ALREADY_BOUND');
  generation++;session=opened.session;writeBaseline=detached(restored?.confirmed??account);coverage=restored?null:{stamp:detached(session.submissionStamp()),json:round.json};phase=restored?'REENTRY_INPUT_PRESERVED':'READY';return{ok:true as const,session};
 };
 const finish=(a:Attempt)=>{
  const c=client.snapshot(),account=c.state?.confirmed;
  if(attempt!==a||session!==a.session||generation!==a.generation||disposed||input.reentry?.inspect().retired||input.reentry?.inspect().reason||!account||c.ownerId!==input.ownerId||c.state?.pending||c.state?.draft||!same(c.state?.references,a.references)||!same(account,a.expected))return false;
  const proof=memo?prepareMemoBodyEdit(a.before,a.command,input.ownerId,references):null;
  const exact=a.changed?!!c.lastReceipt&&c.status==='saved'&&(memo?!!proof?.ok&&exactMemoBodyAck(proof.value,account,c.lastReceipt):exactAlphaPrivateChange(input.ownerId,a.before.space,a.command,account,c.lastReceipt)):c.status==='ready'&&same(account,a.before);
  if(!exact)return false;
  if(a.progressCapture&&!a.session.acknowledgeProgressOperations(a.progressCapture.token))return false;
  if(a.writingCapture&&!a.session.acknowledgeWritingOperations(a.writingCapture.token))return false;
  input.progressSubmission?.confirmed(a.command);
  const currentRound=session.roundTrip();
  writeBaseline=detached(account);coverage=a.reentered?(currentRound.ok&&currentRound.json===a.json&&!session.diagnostics().reentryProgressHold?{stamp:detached(session.submissionStamp()),json:a.json}:null):{stamp:detached(a.stamp),json:a.json};attempt=null;reentryGate=null;phase=covered()?'CONFIRMED':'LATEST_INPUT_UNSUBMITTED';return true;
 };
 async function submit(retryRejected=false){
  if(held())return reject('INPUT_OWNER_HOLD');if(inflight||reading)return reject('HOST_BUSY');
  const previous=attempt;
  if(previous&&(!retryRejected||previous.stage!=='REJECTED'||!client.snapshot().retryableRejectedDraft))return reject('PENDING_EXACT_CONFIRMATION');
  if(panelPending)return reject('PANEL_INPUT_HOLD');
  // A rejected refresh must not silently rebase the old editor's full text snapshot.
  if(!baselineMatches())return reject('EXTERNAL_ACCOUNT_CHANGED');
  const round=session!.roundTrip();if(!round.ok)return round;const before=client.snapshot().state?.confirmed;if(!before)return reject('NO_CONFIRMED_ACCOUNT');
  // Initial v11 equality is a read-confirmed local no-op, never a format write.
  // Keep the same PM owner/history; later input is outside the captured coverage.
  if(memo&&!previous&&!client.snapshot().state?.pending&&!client.snapshot().state?.draft){
   const cohort=inspectMemoCohort(before,input.ownerId,references);
   if(cohort.ok&&cohort.origin==='v11'&&same(round.snapshot,cohort.projected.space.text)){
    const original=session!,epoch=generation,stamp=detached(original.submissionStamp());inflight=true;phase='CONFIRMING_NOOP';
    try{
     if(!await client.refresh()||disposed||generation!==epoch||session!==original||!same(client.snapshot().state?.confirmed,before))return reject('NOOP_ACCOUNT_CHANGED_OR_UNVERIFIED');
     writeBaseline=detached(before);coverage={stamp,json:round.json};phase=covered()?'CONFIRMED':'LATEST_INPUT_UNSUBMITTED';
     return{ok:true as const,latestCovered:covered(),noChange:true};
    }finally{if(phase==='CONFIRMING_NOOP')phase='NOOP_UNVERIFIED';inflight=false;}
   }
  }
  const nextSpace={...detached(before.space),text:detached(round.snapshot)};
  const command:AlphaPrivateCommand={schema:ALPHA_COMMAND_SCHEMA,kind:'change-private',requestId:input.requestId(),expectedRevision:before.revision,changes:[{field:'text',present:true,value:nextSpace.text}]};
  const changed=privateChanges(before.space,nextSpace).length>0,expected:unknown={...detached(before),revision:before.revision+(changed?1:0),space:nextSpace};
  if(!profileAccount(expected,references,input.ownerId))return reject('UNSUPPORTED_ACCOUNT_PROFILE');
  if(memo){const proof=prepareMemoBodyEdit(before,command,input.ownerId,references);if(!proof.ok||!same(proof.value.expected,expected))return reject(proof.ok?'MEMO_EXPECTED_MISMATCH':proof.reason);}
  const stamp=detached(session!.submissionStamp());let progressCapture:ProgressCapture|null=null;let writingCapture:WritingCapture|undefined;
  if(input.progressSubmission){
   const captured=session!.captureProgressOperations(stamp);if(!captured.ok)return captured;
   const writing=session!.captureWritingOperations(stamp);if(!writing.ok)return writing;
   const prepared=input.progressSubmission.prepare({command,before,expected,operations:captured.operations,writing:writing.operations,stamp,generation});if(!prepared.ok)return reject(prepared.reason??'PROGRESS_SUBMISSION_REJECTED');progressCapture=captured;writingCapture=writing;
  }
  const a:Attempt={writingCapture,command,before:detached(before),expected,references:detached(client.snapshot().state?.references),session:session!,stamp,json:round.json,generation,changed,progressCapture,stage:'SUBMITTED'};
  attempt=a;inflight=true;phase='SUBMITTING';
  try{
   await client.execute(command,retryRejected?{retryRejectedDraft:true}:undefined);
   // The client's no-op is only a local equality check; require a fresh read as proof.
   if(!changed&&client.snapshot().status==='same-location')await client.refresh();
   if(finish(a))return{ok:true as const,latestCovered:covered(),requestId:command.requestId,noChange:!changed};
   const c=client.snapshot();a.stage=c.retryableRejectedDraft&&!c.state?.pending&&c.state?.draft?.requestId===command.requestId?'REJECTED':'UNVERIFIED';phase=a.stage;
   return reject(a.stage==='REJECTED'?'CONFIRMED_REJECTION':'EXACT_CONFIRMATION_REQUIRED');
  }finally{inflight=false;}
 }
 return{
  async open(){
   if(disposed||session||reading||inflight)return reject('HOST_ALREADY_OPEN_OR_BUSY');reading=true;
   try{
    if(reentryRead&&!reentryRead.ok)return reject(reentryRead.reason);
    const saved=reentryRead?.ok?reentryRead.value:null,checkpoint=saved?.checkpoint;
    if(saved&&checkpoint){
     const confirmed=saved.protocol.confirmed!;
     const latestAccount={...detached(confirmed),space:{...detached(confirmed.space),text:detached(checkpoint.latest.snapshot)}};
     const progressBase=saved.protocol.pending&&checkpoint.attempt?checkpoint.attempt.expected.space.text:confirmed.space.text;
     const opened=buildSession(latestAccount,{latest:checkpoint.latest,confirmed,progressHold:reentryProgressUnproven(progressBase,checkpoint.latest.snapshot)});if(!opened.ok)return opened;
     if(saved.protocol.pending||saved.protocol.draft){
      const a=checkpoint.attempt!;
      attempt={command:detached(a.command),before:detached(a.before),expected:detached(a.expected),references:detached(a.references),session:session!,stamp:detached(session!.submissionStamp()),json:canonicalJson(a.expected.space.text),generation,changed:a.expected.revision!==a.before.revision,progressCapture:null,stage:'UNVERIFIED',reentered:detached(a)};reentryGate=null;
      if(!saved.protocol.pending){phase='RELOADED_DRAFT_HELD';return{ok:true as const,session:session!,reentry:'RELOADED_DRAFT_HELD' as const};}
      const aLive=attempt;await client.resolvePending(false);
      if(disposed||input.reentry?.inspect().retired)return reject('REENTRY_BINDING_RETIRED');
      const exact=finish(aLive);if(!exact)phase='UNVERIFIED';
      return{ok:true as const,session:session!,reentry:exact?'EXACT_REQUEST_RESOLVED' as const:'UNKNOWN_REQUEST_HELD' as const};
     }
     if(!await client.refresh()||disposed||input.reentry?.inspect().retired||!same(client.snapshot().state?.confirmed,confirmed)){phase='REENTRY_READ_HELD';return{ok:true as const,session:session!,reentry:'REENTRY_READ_HELD' as const};}
     reentryGate=null;const round=session!.roundTrip();coverage=round.ok&&same(round.snapshot,confirmed.space.text)&&!session!.diagnostics().reentryProgressHold?{stamp:detached(session!.submissionStamp()),json:round.json}:null;phase=covered()?'CONFIRMED':'LATEST_INPUT_UNSUBMITTED';
     return{ok:true as const,session:session!,reentry:'FRESH_READ_INPUT_PRESERVED' as const};
    }
    if(!await client.refresh())return reject('ACCOUNT_READ_REJECTED');const a=client.snapshot().state?.confirmed;
    if(!a)return reject('NO_CONFIRMED_ACCOUNT');const opened=buildSession(a);if(opened.ok&&input.reentry&&!input.reentry.checkpointInput()){phase='REENTRY_CHECKPOINT_HELD';return reject('REENTRY_CHECKPOINT_HELD');}return opened;
   }finally{reading=false;}
  },
  currentSession:()=>session,
  recordProgress(requestId:string,occurrenceId:string,recordDate:string,percent:number,expectedPanelRevision?:number){if(held())return reject('INPUT_OWNER_HOLD');if(panelPending&&(expectedPanelRevision!==panelRevision||!same(panelIntent,{occurrenceId,recordDate,percent})))return reject('PANEL_CHANGED');if(expectedPanelRevision!==undefined&&expectedPanelRevision!==panelRevision)return reject('PANEL_CHANGED');const target=session!.progressTarget(occurrenceId);if(!target)return reject('PROGRESS_TARGET_MISMATCH');const stamp=session!.submissionStamp();const result=session!.setProgress({requestId,inputOwnerId:session!.inputOwnerId,docId:session!.docId,occurrenceId,entityId:target.entityId,recordDate,percent,expectedInputRevision:stamp.inputRevision,expectedSemanticRevision:stamp.semanticRevision,expectedCompositionEpoch:stamp.compositionEpoch});if(result.ok&&panelPending){panelPending=false;panelInput=null;panelIntent=null;panelRevision++;}return result;},
  setPanelInput(value:unknown,pending:boolean,intent?:PanelIntent){panelInput=detached(value);panelIntent=intent?detached(intent):null;panelPending=pending;return++panelRevision;},
  save:()=>submit(false),retryRejected:()=>submit(true),
  checkpointInput(){if(!input.reentry)return reject('REENTRY_PORT_NOT_PROVIDED');return input.reentry.checkpointInput()?{ok:true as const}:reject('REENTRY_CHECKPOINT_HELD');},
  retireReentryBinding(){if(!input.reentry)return reject('REENTRY_PORT_NOT_PROVIDED');input.reentry.retire();disposed=true;generation++;return{ok:true as const};},
  async confirmPending(retrySameRequest=false){if(input.reentry&&retrySameRequest)return reject('REENTRY_REPLAY_NOT_ENABLED');if(!attempt||attempt.stage==='REJECTED')return reject('NO_UNVERIFIED_ATTEMPT');if(inflight||reading||held()||panelPending)return reject('INPUT_OWNER_HOLD');const a=attempt;inflight=true;try{await client.resolvePending(retrySameRequest);if(finish(a))return{ok:true as const,latestCovered:covered()};a.stage='UNVERIFIED';phase='UNVERIFIED';return reject('EXACT_CONFIRMATION_REQUIRED');}finally{inflight=false;}},
  async flush(){if(panelPending||held())return false;const result=await submit(false);return result.ok&&canLeave();},
  capture(){const body=session?.pendingBody()??null,round=session?.roundTrip();return{kind:'memory-input-and-structure' as const,complete:!!round?.ok&&!held()&&!panelPending&&!attempt&&!inflight,body,structure:round?.ok?round.snapshot:null,panelInput:detached(panelInput),stamp:session?.submissionStamp()??null,persisted:false as const};},
  canLeave,
  async reopen(){
   if(!canLeave())return reject('UNSAVED_OWNER_HOLD');const original=session!,state=original.state,stamp=original.submissionStamp(),panel=panelRevision;reading=true;
   try{const ok=await client.refresh();if(!ok)return reject('ACCOUNT_READ_REJECTED');if(session!==original||original.state!==state||!same(original.submissionStamp(),stamp)||panel!==panelRevision||panelPending||held()||attempt)return reject('OWNER_CHANGED_DURING_READ');const next=client.snapshot().state?.confirmed;if(!next)return reject('NO_CONFIRMED_ACCOUNT');
    const previous=session;
    // Reopening a recovered owner must not reset its consumed/retired namespace
    // or revive old stamp-zero input. This is a value-only fresh session too.
    const captured=input.reentry?original.captureReentryInput():null;
    if(captured&&!captured.ok)return captured;
    if(captured?.ok&&!same(captured.input.snapshot,next.space.text))return reject('REENTRY_REOPEN_ACCOUNT_CHANGED');
    const opened=buildSession(next,captured?.ok?{latest:copyReentryInput(captured.input,input.documentId),confirmed:next,progressHold:false}:undefined);
    if(!opened.ok)return opened;previous!.close();
    if(input.reentry){
     const round=opened.session.roundTrip();coverage=round.ok?{stamp:detached(opened.session.submissionStamp()),json:round.json}:null;
     if(!input.reentry.checkpointInput()){phase='REENTRY_CHECKPOINT_HELD';return reject('REENTRY_CHECKPOINT_HELD');}
    }
    return{ok:true as const,session:opened.session};
   }finally{reading=false;}
  },
  close(){if(!canLeave())return reject('UNSAVED_OWNER_HOLD');session!.close();disposed=true;phase='CLOSED';return{ok:true as const};},
  inspect(){const round=session?.roundTrip();return{scope:'local-typed-memory-test/1',phase,inflight,reading,panelPending,panelRevision,generation,baselineMatches:baselineMatches(),canLeave:canLeave(),latestCovered:covered(),progressWitness:session?.progressWitnessState()??null,attempt:attempt?{command:detached(attempt.command),before:detached(attempt.before),expected:detached(attempt.expected),stamp:detached(attempt.stamp),progress:attempt.progressCapture?{operations:detached(attempt.progressCapture.operations),start:attempt.progressCapture.start,end:attempt.progressCapture.end,generation:attempt.generation}:null,stage:attempt.stage}:null,working:round??null,body:session?.pendingBody()??null,client:client.snapshot(),actualAppWriteAllowed:false as const};},
 };
}
