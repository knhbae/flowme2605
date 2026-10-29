import type {WritingOperation} from '../../alpha-persistence/rea-writing-edit';
import {EditorState,type Transaction} from 'prosemirror-state';
import {undo,redo,undoDepth,redoDepth,isHistoryTransaction,closeHistory} from 'prosemirror-history';
import type {AlphaReferenceContext} from '../../alpha-persistence/contract';
import {canonicalJson,detached,parseAlphaJson} from '../../alpha-persistence/json';
import {inspectAlphaStoredRead} from '../../alpha-auth/account-access';
import {freezeStored,readStoredProgramText,readOrderedStoredProgramText,validateReaStoredText,type DeepReadonly,type ReaStoredText,type ReaOrderedStoredText} from '../../rea-stored-text';
import {inspectMemoCohort} from '../../alpha-persistence/memo-cohort';
import {projectTagged,confirmTagged,replayTaggedConfirmation,sameStructure,appendTagged,removeTaggedAppend,type TaggedConfirmationReceipt} from '../tagged-codec';
import {setTaggedProgress,taggedProgressDate,type TaggedProgressRequest} from '../tagged-progress';
import {taggedSchema,toTaggedPM,fromTaggedPM,taggedLogical,taggedSelect,taggedLocate,taggedInline,type TaggedSelection} from './tagged-pm-schema';
import type {CompositionBinding} from './editor/composition-session';
import {TaggedProgressStep,TaggedAppendStep,TaggedConfirmStep,TaggedDraftStep,progressValue,TAGGED_ACTION_BOUNDARY,taggedHistoryPlugin,type ProgressValue,type AppendTarget,type ConfirmationTarget} from './tagged-history';
import type {AlphaReaProgressOperation} from '../../alpha-persistence/rea-progress-edit';

export type ConfirmRequest={requestId:string;inputOwnerId:string;docId:string;occurrenceId:string;kind:'task'|'schedule';expectedText:string;expectedRevision:number;explicit?:{plannedDate:string|null;commandToken:string}};
export type AppendRequest={afterOccurrenceId?:string;requestId:string;inputOwnerId:string;docId:string;occurrenceId:string;kind:'memo'|'task';text:string;expectedInputRevision:number;expectedSemanticRevision:number;expectedCompositionEpoch:number};
export type ReaInputCheckpoint={schema:'rea-input-checkpoint/1';docId:string;inputOwnerId:string;inputOwnerIds:string[];snapshot:ReaStoredText;entityPool:string[];allocated:number;reservedIds:string[];usedRequestIds:string[]};
type Failure={ok:false;reason:string};
const rejected=(reason:string):Failure=>({ok:false,reason});
type TaggedText=ReaStoredText|ReaOrderedStoredText;
type Prepared<T extends TaggedText>={request:ConfirmRequest;intent:string;state:EditorState;revision:number;semanticRevision:number;compositionEpoch:number;next:T;prefixLength:number;entityId:string;receipt:DeepReadonly<TaggedConfirmationReceipt>};
type ProgressEvent={sourceId:string;direction:'forward'|'inverse'|'noop'|'unsupported';operation:AlphaReaProgressOperation|null};
type ProgressSource={operation:AlphaReaProgressOperation;before:ProgressValue;after:ProgressValue};
/** Local semantic reader experiment. It has no repository, writer, view, or network port.
 * EditorState is the only live body owner. Baseline business data is immutable;
 * derived serialization is disposable and never replaces the input document. */
export class TaggedSession<T extends TaggedText=TaggedText> {
  private current:EditorState;
  private baseline:T;
  private revision=0;
  private semanticRevision=0;
  private closed=false;
  private allocated=0;
  private pool:readonly string[];
  private prepared=new WeakMap<object,Prepared<T>>();
  private writingJournal:WritingOperation[]=[];
  private writingAcknowledged=0;
  private writingCaptures=new WeakMap<object,{start:number;end:number;json:string}>();
  private draftSources=new Map<string,{before:any;after:any}>();
  private receipts=new Map<string,{intent:string;entityId:string}>();
  private confirmationSources=new Map<string,DeepReadonly<{target:ConfirmationTarget;receipt:TaggedConfirmationReceipt}>>();
  private confirmationGuard:((target:ConfirmationTarget,direction:'confirm'|'undo'|'redo')=>boolean)|null=null;
  private appendReceipts=new Map<string,{intent:string;occurrenceId:string;entityId:string|null}>();
  private appendSources=new Map<string,DeepReadonly<{target:AppendTarget;block:ReaStoredText['documents'][string]['blocks'][string];task:ReaStoredText['tasks'][string]|null}>>();
  private reservedAppendIds=new Set<string>();
  private reenteredRequestIds=new Set<string>();
  private reenteredInputOwners=new Set<string>();
  private reentryProgressHold=false;
  private appendHistoryGuard:((target:AppendTarget)=>boolean)|null=null;
  private progressReceipts=new Map<string,{intent:string;receipt:unknown}>();
  private progressJournal:ProgressEvent[]=[];
  private progressSources=new Map<string,ProgressSource>();
  private progressOperationIds=new Set<string>();
  private progressAcknowledged=0;
  private progressCaptures=new WeakMap<object,{start:number;end:number;json:string}>();
  private preparedHistory=new WeakMap<Transaction,{state:EditorState;fingerprint:string;engineMeta:unknown;engineEntries:[string,unknown][];direction:'undo'|'redo'}>();
  private historyBoundaryNext=false;
  private composition:{binding:CompositionBinding;ended:boolean}|null=null;
  private compositionEpoch=0;
  private refused:unknown=null;
  readonly writeAllowed=false;
  readonly writeBlockedReason='REA_READERS_NOT_CONNECTED';
  constructor(snapshot:T,readonly docId:string,readonly inputOwnerId:string,ids:readonly string[]){
    this.baseline=freezeStored(detached(snapshot)) as T;this.pool=Object.freeze([...ids]);
    this.current=EditorState.create({schema:taggedSchema,doc:toTaggedPM(snapshot.documents[docId]),plugins:[taggedHistoryPlugin()]});
  }
  get state(){return this.current;}
  diagnostics(){return{revision:this.revision,allocatedIds:this.allocated,composing:!!this.composition,closed:this.closed,reentryProgressHold:this.reentryProgressHold,writeAllowed:false as const};}
  captureReentryInput(){
    const round=this.roundTrip();if(!round.ok||!validateReaStoredText(round.snapshot))return rejected('REENTRY_INPUT_NOT_SERIALIZABLE');
    return{ok:true as const,input:freezeStored({schema:'rea-input-checkpoint/1' as const,docId:this.docId,inputOwnerId:this.inputOwnerId,inputOwnerIds:[...new Set([...this.reenteredInputOwners,this.inputOwnerId])],snapshot:detached(round.snapshot),entityPool:[...this.pool],allocated:this.allocated,reservedIds:[...new Set([...this.reservedAppendIds,...this.pool.slice(0,this.allocated)])],usedRequestIds:[...new Set([...this.reenteredRequestIds,...this.receipts.keys(),...this.appendReceipts.keys(),...this.progressReceipts.keys(),...this.progressOperationIds])]})};
  }
  /** Restore values/retired namespaces only into a fresh PM owner. Never import
   * old history, revisions, WeakMap tokens, source Steps or composition state. */
  restoreReentryInput(input:ReaInputCheckpoint,progressWitnessHold:boolean){
    const ids=(v:unknown):v is string[]=>Array.isArray(v)&&new Set(v).size===v.length&&v.every(id=>typeof id==='string'&&!!id.trim()&&!['__proto__','constructor','prototype'].includes(id));
    try{
      if(this.closed||this.revision||this.semanticRevision||this.composition||this.refused||undoDepth(this.current)||redoDepth(this.current)||input.schema!=='rea-input-checkpoint/1'||input.docId!==this.docId||!ids(input.inputOwnerIds)||!input.inputOwnerIds.includes(input.inputOwnerId)||input.inputOwnerIds.includes(this.inputOwnerId)||!validateReaStoredText(input.snapshot)||canonicalJson(input.snapshot)!==canonicalJson(this.baseline)||canonicalJson(input.entityPool)!==canonicalJson(this.pool)||!Number.isSafeInteger(input.allocated)||input.allocated<0||input.allocated>this.pool.length||!ids(input.reservedIds)||!ids(input.usedRequestIds)||this.pool.slice(0,input.allocated).some(id=>!input.reservedIds.includes(id)))return rejected('INVALID_REENTRY_INPUT_STATE');
      this.allocated=input.allocated;this.reservedAppendIds=new Set(input.reservedIds);this.reenteredRequestIds=new Set(input.usedRequestIds);this.reenteredInputOwners=new Set(input.inputOwnerIds);this.reentryProgressHold=progressWitnessHold;return{ok:true as const,historyRestored:false as const};
    }catch{return rejected('INVALID_REENTRY_INPUT_STATE');}
  }
  /** Submission coverage uses both input and explicit-domain revisions; it owns no text. */
  submissionStamp(){return{inputOwnerId:this.inputOwnerId,docId:this.docId,inputRevision:this.revision,semanticRevision:this.semanticRevision,compositionEpoch:this.compositionEpoch};}
  /** Reduce only the still-unacknowledged event suffix. Frozen attempts keep their
   * original prefix; after ACK an inverse is reinterpreted against that cutoff.
   * No-op APPLIED events advance coverage but must never revive an undone set. */
  private progressOperations(){
    const active:Array<ProgressEvent|null>=[],positions=new Map<string,number>();
    for(const event of this.progressJournal.slice(this.progressAcknowledged)){
      if(event.direction==='noop')continue;
      const position=positions.get(event.sourceId),prior=position===undefined?null:active[position];
      if(prior&&prior.direction!==event.direction&&prior.direction!=='unsupported'&&event.direction!=='unsupported'){
        active[position!]=null;positions.delete(event.sourceId);continue;
      }
      if(prior)return rejected('PROGRESS_HISTORY_SEQUENCE_UNSUPPORTED');
      positions.set(event.sourceId,active.length);active.push(event);
    }
    const result=active.filter((event):event is ProgressEvent=>!!event);
    if(result.some(event=>!event.operation))return rejected('PROGRESS_HISTORY_WITNESS_UNSUPPORTED');
    return{ok:true as const,operations:result.map(event=>event.operation!)};
  }
  /** APPLIED/history event journal, not inferred snapshot differences. */
  captureProgressOperations(expected:ReturnType<TaggedSession['submissionStamp']>){
    if(this.reentryProgressHold)return rejected('REENTRY_PROGRESS_WITNESS_NOT_RESTORED');
    if(this.closed||this.composition||this.refused)return rejected('PROGRESS_WITNESS_INPUT_HOLD');
    if(canonicalJson(expected)!==canonicalJson(this.submissionStamp()))return rejected('STALE_PROGRESS_CAPTURE');
    const normalized=this.progressOperations();if(!normalized.ok)return normalized;
    const start=this.progressAcknowledged,end=this.progressJournal.length,operations=detached(normalized.operations),token=Object.freeze({});
    this.progressCaptures.set(token,{start,end,json:canonicalJson(this.progressJournal.slice(start,end))});
    return{ok:true as const,token,operations:freezeStored(operations),stamp:freezeStored(detached(expected)),start,end};
  }
  acknowledgeProgressOperations(token:object){
    const capture=this.progressCaptures.get(token);if(!capture||capture.start!==this.progressAcknowledged||canonicalJson(this.progressJournal.slice(capture.start,capture.end))!==capture.json)return false;
    this.progressAcknowledged=capture.end;this.progressCaptures.delete(token);return true;
  }
  progressWitnessState(){return{acknowledged:this.progressAcknowledged,applied:this.progressJournal.length,historyHold:!this.progressOperations().ok};}
  captureWritingOperations(expected:ReturnType<TaggedSession['submissionStamp']>){
    if(this.closed||this.composition||this.refused||canonicalJson(expected)!==canonicalJson(this.submissionStamp()))return rejected('WRITING_CAPTURE_HOLD');
    const start=this.writingAcknowledged,end=this.writingJournal.length,operations=detached(this.writingJournal.slice(start,end)),token=Object.freeze({});this.writingCaptures.set(token,{start,end,json:canonicalJson(operations)});return{ok:true as const,token,operations:freezeStored(operations)};
  }
  acknowledgeWritingOperations(token:object){const c=this.writingCaptures.get(token);if(!c||c.start!==this.writingAcknowledged||c.json!==canonicalJson(this.writingJournal.slice(c.start,c.end)))return false;this.writingAcknowledged=c.end;this.writingCaptures.delete(token);return true;}
  setDraft(requestId:string,occurrenceId:string,draft:ReaStoredText['documents'][string]['blocks'][string]['draft']|null,expectedRevision:number){
    if(this.closed||this.composition||this.refused||this.revision!==expectedRevision||this.draftSources.has(requestId))return rejected('DRAFT_OWNER_OR_REVISION_HOLD');
    const round=this.roundTrip();if(!round.ok||!validateReaStoredText(round.snapshot))return rejected('DRAFT_PROJECTION_HOLD');
    const before=round.snapshot.documents[this.docId]?.blocks[occurrenceId];if(before?.kind!=='memo')return rejected('DRAFT_TARGET_REQUIRED');
    const after=detached(before);if(draft)after.draft=detached(draft);else delete after.draft;
    const next=detached(round.snapshot);next.documents[this.docId].blocks[occurrenceId]=after;if(!validateReaStoredText(next))return rejected('INVALID_DRAFT');
    if(canonicalJson(before)===canonicalJson(after))return{ok:true as const};
    const row=taggedLocate(this.current.doc,occurrenceId),tr=this.current.tr.step(new TaggedDraftStep(row.start,occurrenceId,before,after,requestId));closeHistory(tr);const state=this.current.apply(tr);
    this.current=state;this.baseline=freezeStored(next) as T;this.revision++;this.semanticRevision++;this.historyBoundaryNext=true;this.draftSources.set(requestId,{before:detached(before),after:detached(after)});this.writingJournal.push({type:'draft',docId:this.docId,occurrenceId,before:detached(before),after:detached(after)});return{ok:true as const};
  }
  historyState(){return{undo:undoDepth(this.current),redo:redoDepth(this.current),held:this.closed||!!this.composition||!!this.refused,scope:'local-editor-actions' as const};}
  /** Optional current local authority, bound once. No account/writer permission
   * is acquired here; an external host must separately prove its own boundary. */
  bindConfirmationHistoryGuard(guard:(target:ConfirmationTarget,direction:'confirm'|'undo'|'redo')=>boolean){if(this.confirmationGuard||typeof guard!=='function')return false;this.confirmationGuard=guard;return true;}
  private confirmationAllowed(target:ConfirmationTarget,direction:'confirm'|'undo'|'redo'){
    const state=this.current,base=this.baseline,revision=this.revision,semantic=this.semanticRevision,epoch=this.compositionEpoch;
    try{if(this.confirmationGuard&&!this.confirmationGuard(target,direction))return false;}catch{return false;}
    return!this.closed&&!this.composition&&!this.refused&&state===this.current&&base===this.baseline&&revision===this.revision&&semantic===this.semanticRevision&&epoch===this.compositionEpoch&&target.inputOwnerId===this.inputOwnerId&&target.docId===this.docId;
  }
  private historyFingerprint(tr:Transaction){return canonicalJson({doc:tr.doc.toJSON(),selection:tr.selection.toJSON(),steps:tr.steps.map(step=>step.toJSON()),storedMarks:tr.storedMarks?.map(mark=>mark.toJSON())??null});}
  bindAppendHistoryGuard(guard:(target:AppendTarget)=>boolean){if(this.appendHistoryGuard||typeof guard!=='function')return false;this.appendHistoryGuard=guard;return true;}
  private appendHistoryAllowed(tr:Transaction){
    const steps=tr.steps.filter((s):s is TaggedAppendStep=>s instanceof TaggedAppendStep);
    if(!steps.length)return true;
    if(steps.length!==1||tr.steps.length!==1)return false;
    return steps.every(step=>{const source=this.appendSources.get(step.origin);return!!source&&canonicalJson(source.target)===canonicalJson(step.target)&&canonicalJson(source.block)===canonicalJson(step.block)&&(!this.appendHistoryGuard||this.appendHistoryGuard(step.target));});
  }
  prepareHistory(direction:'undo'|'redo'){
    if(this.closed||this.composition||this.refused)return rejected('INPUT_OWNER_HOLD');
    if(direction!=='undo'&&direction!=='redo')return rejected('INVALID_HISTORY_DIRECTION');
    let prepared:Transaction|undefined,available:boolean;try{available=(direction==='undo'?undo:redo)(this.current,tr=>{prepared=tr;});}catch{return rejected('UNDO_CONFLICT');}
    if(!available||!prepared||!prepared.steps.length)return rejected('HISTORY_EMPTY_OR_UNAPPLIED');
    if(!this.appendHistoryAllowed(prepared))return rejected('APPEND_HISTORY_SAVE_BOUNDARY_HOLD');
    try{const engineMeta=prepared.getMeta(this.current.plugins[0]);this.preparedHistory.set(prepared,{state:this.current,fingerprint:this.historyFingerprint(prepared),engineMeta,engineEntries:Object.entries(engineMeta),direction});}catch{return rejected('UNSUPPORTED_HISTORY_TRANSACTION');}
    return{ok:true as const,tr:prepared};
  }
  progressMarker(occurrenceId:string){
    // Ordinary input cannot change kind/ref/order. Read the stable-ID metadata,
    // not a whole PM-body projection for each rendered marker/keystroke.
    const block=this.baseline.documents[this.docId].blocks[occurrenceId],task=block?.kind==='task'?this.baseline.tasks[block.entityId!]:null;
    if(!task)return null;
    return freezeStored({occurrenceId,entityId:block.entityId!,percent:task.currentPercent,enabled:!this.closed&&!this.composition&&!this.refused});
  }
  scheduleMarker(occurrenceId:string){const b=this.baseline.documents[this.docId].blocks[occurrenceId];return b?.kind==='schedule'?this.baseline.schedules[b.entityId!]?.plannedDate??null:null;}
  progressTarget(occurrenceId:string){
    const marker=this.progressMarker(occurrenceId);return marker?freezeStored({...marker,records:detached(this.baseline.tasks[marker.entityId].progressRecords)}):null;
  }
  /** Explicit progress is part of this input owner's working change, even when text is dirty.
   * Project once at command time; never replace the PM state, selection or input document. */
  setProgress(request:TaggedProgressRequest){
    if(this.reentryProgressHold)return rejected('REENTRY_PROGRESS_WITNESS_NOT_RESTORED');
    if(this.baseline.schema==='flowme-rea-text/2')return rejected('ORDERED_PROGRESS_NOT_SUPPORTED');
    if(this.closed||request.inputOwnerId!==this.inputOwnerId||request.docId!==this.docId)return rejected('OWNER_OR_DOCUMENT_MISMATCH');
    if(this.composition)return rejected('COMPOSITION_OWNER_HOLD');
    if(this.refused)return rejected('UNSUPPORTED_INPUT_INTENT_HOLD');
    if(request.expectedCompositionEpoch!==this.compositionEpoch)return rejected('STALE_PROGRESS_COMPOSITION_EPOCH');
    if(typeof request.requestId!=='string'||!request.requestId.trim()||this.receipts.has(request.requestId)||this.appendReceipts.has(request.requestId)||this.reenteredRequestIds.has(request.requestId))return rejected('INVALID_OR_REUSED_PROGRESS_REQUEST');
    if(!taggedProgressDate(request.recordDate)||!Number.isInteger(request.percent)||request.percent<0||request.percent>100)return rejected('INVALID_PROGRESS_DATE_OR_PERCENT');
    const intent=canonicalJson({inputOwnerId:request.inputOwnerId,docId:request.docId,compositionEpoch:request.expectedCompositionEpoch,occurrenceId:request.occurrenceId,entityId:request.entityId,recordDate:request.recordDate,percent:request.percent});
    const prior=this.progressReceipts.get(request.requestId);
    if(prior)return prior.intent===intent?{ok:true as const,status:'DUPLICATE' as const,receipt:prior.receipt}:rejected('REQUEST_ID_REUSED');
    if(this.progressOperationIds.has(request.requestId))return rejected('REQUEST_ID_REUSED');
    if(request.expectedInputRevision!==this.revision||request.expectedSemanticRevision!==this.semanticRevision)return rejected('STALE_PROGRESS_REVISION');
    const projected=projectTagged(this.baseline,this.docId,fromTaggedPM(this.current.doc));if(!projected.ok)return projected;
    if(!validateReaStoredText(projected.snapshot))return rejected('ORDERED_PROGRESS_NOT_SUPPORTED');
    const result=setTaggedProgress(projected.snapshot,request);if(!result.ok)return result;
    if(result.changed){
      const tr=this.current.tr.step(new TaggedProgressStep({inputOwnerId:this.inputOwnerId,docId:this.docId,occurrenceId:request.occurrenceId,entityId:request.entityId},progressValue(projected.snapshot.tasks[request.entityId]),progressValue(result.snapshot.tasks[request.entityId]),request.requestId)).setMeta(TAGGED_ACTION_BOUNDARY,true);
      const accepted=this.apply(tr);if(!accepted.ok)return accepted;
    }
    const receipt=freezeStored({requestId:request.requestId,occurrenceId:request.occurrenceId,entityId:request.entityId,recordDate:request.recordDate,before:result.before,after:result.after,changed:result.changed,...this.submissionStamp()});
    this.progressReceipts.set(request.requestId,{intent,receipt});
    const operation=freezeStored({commandId:request.requestId,docId:this.docId,occurrenceId:request.occurrenceId,entityId:request.entityId,recordDate:request.recordDate,percent:request.percent});
    this.progressSources.set(request.requestId,freezeStored({operation,before:progressValue(projected.snapshot.tasks[request.entityId]),after:progressValue(result.snapshot.tasks[request.entityId])}));
    this.progressOperationIds.add(request.requestId);
    this.progressJournal.push(freezeStored({sourceId:request.requestId,direction:result.changed?'forward':'noop',operation}));
    return{ok:true as const,status:'APPLIED' as const,receipt};
  }
  pendingBody(){return freezeStored(fromTaggedPM(this.current.doc));}
  rejectedIntent(){return this.refused;}
  retainInputIntent(reason:string,tr:Transaction,insertedText?:string){
    // This is a terminal rejection port, not an implicit replace/discard action.
    // A later diagnostic or stale owner must not erase the unresolved input.
    if(!this.refused)this.refused=freezeStored({reason,proposal:tr.doc.toJSON(),selection:tr.selection.toJSON(),...(insertedText!==undefined?{insertedText}:{})});
    return rejected(reason);
  }
  close(){this.closed=true;}
  apply(tr:Transaction):{ok:true;revision:number}|Failure {
    if(this.closed)return rejected('OWNER_RETIRED');
    const historyAction=isHistoryTransaction(tr),originalTransaction=tr;
    if(tr.getMeta('flowmeLocalInversePrimitive'))return rejected('LEGACY_INVERSE_PRIMITIVE_NOT_CONNECTED');
    const prepared=this.preparedHistory.get(tr);
    if(historyAction||prepared){
      if(!historyAction||!prepared||prepared.state!==this.current)return rejected('STALE_HISTORY_TRANSACTION');
      try{
        const engine=tr.getMeta(this.current.plugins[0]);
        if(prepared.fingerprint!==this.historyFingerprint(tr)||prepared.engineMeta!==engine||Object.keys(engine).length!==prepared.engineEntries.length||prepared.engineEntries.some(([key,value])=>engine[key]!==value))return rejected('ALTERED_HISTORY_TRANSACTION');
        // Use a fresh command result, never caller-exposed mutable engine metadata.
        let authentic:Transaction|undefined;(prepared.direction==='undo'?undo:redo)(this.current,next=>{authentic=next;});
        if(!authentic||!authentic.steps.length||this.historyFingerprint(authentic)!==prepared.fingerprint)return rejected('HISTORY_REPLAY_MISMATCH');
        tr=authentic;
      }catch{return rejected('ALTERED_HISTORY_TRANSACTION');}
    }
    const draftSteps=tr.steps.filter((step):step is TaggedDraftStep=>step instanceof TaggedDraftStep);
    if(draftSteps.length&&(!historyAction||draftSteps.length!==1||tr.steps.length!==1))return rejected('UNREGISTERED_DRAFT_HISTORY');
    const progressSteps=tr.steps.filter((step):step is TaggedProgressStep=>step instanceof TaggedProgressStep),appendSteps=tr.steps.filter((step):step is TaggedAppendStep=>step instanceof TaggedAppendStep),confirmationSteps=tr.steps.filter((step):step is TaggedConfirmStep=>step instanceof TaggedConfirmStep);
    if(confirmationSteps.length&&(!historyAction||confirmationSteps.length!==1||tr.steps.length!==1))return rejected('UNREGISTERED_CONFIRM_HISTORY');
    if(appendSteps.length&&(!historyAction||!this.appendHistoryAllowed(tr)))return rejected('APPEND_HISTORY_SAVE_BOUNDARY_HOLD');
    if((historyAction||progressSteps.length)&& (this.composition||this.refused))return rejected('INPUT_OWNER_HOLD');
    try{
      if(!tr.before.eq(this.current.doc))throw Error('STALE_TRANSACTION');
      const boundary=tr.getMeta(TAGGED_ACTION_BOUNDARY)===true||progressSteps.length>0;
      if(!historyAction&&tr.steps.length&&(boundary||this.historyBoundaryNext))closeHistory(tr);
      const next=this.current.apply(tr),before=fromTaggedPM(this.current.doc),body=fromTaggedPM(next.doc);
      if((!appendSteps.length&&!confirmationSteps.length&&!draftSteps.length&&!sameStructure(before,body))||tr.docChanged&&!taggedLogical(next.doc,next.selection))throw Error('UNSUPPORTED_STRUCTURE_OR_SELECTION');
      if(tr.getMeta('composition')!==undefined&&!this.composition)throw Error('UNBOUND_COMPOSITION');
      if(this.composition){const bound=this.composition.binding.occurrenceId;
        if(!taggedLogical(next.doc,next.selection)||taggedLogical(next.doc,next.selection)!.occurrenceId!==bound||before.order.some(id=>id!==bound&&before.blocks[id].text!==body.blocks[id].text))throw Error('COMPOSITION_TARGET_MISMATCH');
      }
      let domain=this.baseline,semanticChanged=false;const historyEvents:ProgressEvent[]=[],reservedIds=new Set<string>();
      const writingEvents:WritingOperation[]=[];
      if(draftSteps.length){const step=draftSteps[0],source=this.draftSources.get(step.origin);if(!source||!((canonicalJson(source.before)===canonicalJson(step.before)&&canonicalJson(source.after)===canonicalJson(step.after))||(canonicalJson(source.before)===canonicalJson(step.after)&&canonicalJson(source.after)===canonicalJson(step.before))))return rejected('DRAFT_HISTORY_CONFLICT');
        if(canonicalJson(domain.documents[this.docId].blocks[step.occurrenceId])!==canonicalJson(step.before))return rejected('DRAFT_HISTORY_CONFLICT');const changed=detached(domain);changed.documents[this.docId].blocks[step.occurrenceId]=detached(step.after);if(!validateReaStoredText(changed)||canonicalJson({blocks:changed.documents[this.docId].blocks,order:changed.documents[this.docId].order})!==canonicalJson(body))return rejected('DRAFT_HISTORY_CONFLICT');domain=freezeStored(changed) as T;semanticChanged=true;writingEvents.push({type:'draft',docId:this.docId,occurrenceId:step.occurrenceId,before:detached(step.before),after:detached(step.after)});
      }
      if(confirmationSteps.length){
        const step=confirmationSteps[0],source=this.confirmationSources.get(step.origin);
        if(!source||canonicalJson(source.target)!==canonicalJson(step.target)||canonicalJson(source.receipt.before)!==canonicalJson(step.memo)||canonicalJson(source.receipt.after)!==canonicalJson(step.typed))return rejected('UNDO_CONFLICT');
        if(!validateReaStoredText(domain))return rejected('UNDO_CONFLICT');
        // Verify the canonical preimage before any disposable body projection.
        // Projecting first could erase a concurrent title/body change and hide
        // the conflict. Other unmerged canonical body changes remain HOLD.
        const changed=replayTaggedConfirmation(domain,source.receipt,step.confirming);if(!changed.ok)return changed;
        if(canonicalJson({blocks:changed.snapshot.documents[this.docId].blocks,order:changed.snapshot.documents[this.docId].order})!==canonicalJson(body))return rejected('UNDO_CONFLICT');
        if(!this.confirmationAllowed(step.target,step.confirming?'redo':'undo'))return rejected('CONFIRMATION_AUTHORITY_HOLD');
        domain=changed.snapshot as unknown as T;semanticChanged=true;writingEvents.push({type:'confirm',receipt:detached(source.receipt),confirming:step.confirming});
      }
      if(appendSteps.length){
        const step=appendSteps[0],source=this.appendSources.get(step.origin)!;
        const projected=projectTagged(domain,this.docId,before);
        if(!projected.ok||!validateReaStoredText(projected.snapshot))return rejected('APPEND_HISTORY_PREIMAGE_HOLD');
        const changed=step.adding?appendTagged(projected.snapshot,this.docId,step.target.occurrenceId,source.block.kind as 'memo'|'task',source.block.text,step.target.entityId,step.target.afterOccurrenceId):removeTaggedAppend(projected.snapshot,this.docId,step.target.occurrenceId,source.block,source.task,step.target.afterOccurrenceId);
        if(!changed.ok||canonicalJson({blocks:changed.snapshot.documents[this.docId].blocks,order:changed.snapshot.documents[this.docId].order})!==canonicalJson(body))return rejected('APPEND_HISTORY_DOMAIN_MISMATCH');
        domain=changed.snapshot as unknown as T;semanticChanged=true;if(step.target.afterOccurrenceId)writingEvents.push({type:'insert',docId:this.docId,occurrenceId:step.target.occurrenceId,afterOccurrenceId:step.target.afterOccurrenceId,nextOccurrenceId:step.target.nextOccurrenceId??null,block:detached(source.block),adding:step.adding});
      }
      if(progressSteps.length){
        if(domain.schema==='flowme-rea-text/2')return rejected('ORDERED_PROGRESS_NOT_SUPPORTED');
        const projected=projectTagged(domain,this.docId,body);if(!projected.ok)return rejected('HISTORY_DOMAIN_PROJECTION_REJECTED');
        const candidate:unknown=detached(projected.snapshot);if(!validateReaStoredText(candidate))return rejected('HISTORY_DOMAIN_UNSUPPORTED');
        const targets=new Set<string>();
        for(const step of progressSteps){
          const t=step.target,block=candidate.documents[this.docId]?.blocks[t.occurrenceId],task=candidate.tasks[t.entityId];
          if(t.inputOwnerId!==this.inputOwnerId||t.docId!==this.docId||block?.kind!=='task'||block.entityId!==t.entityId||!task)return rejected('HISTORY_PROGRESS_OWNER_OR_TARGET');
          if(canonicalJson(progressValue(task))!==canonicalJson(step.before))return rejected('HISTORY_PROGRESS_PREIMAGE');
          if(historyAction){
            const source=step.origin?this.progressSources.get(step.origin):null;
            const matched=source&&source.operation.docId===t.docId&&source.operation.occurrenceId===t.occurrenceId&&source.operation.entityId===t.entityId;
            const same=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b);
            const forward=matched&&same(step.before,source.before)&&same(step.after,source.after),inverse=matched&&same(step.before,source.after)&&same(step.after,source.before);
            let operation:AlphaReaProgressOperation|null=null;
            if(forward)operation=source.operation;
            else if(inverse){
              const record=step.after.progressRecords.find(r=>r.recordDate===source.operation.recordDate);
              // Only an exact existing-date set is expressible by today's writer.
              // Missing record, old ordering/current mismatch must remain HOLD.
              if(record){const trial=setTaggedProgress(candidate,{...source.operation,percent:record.percent});
                if(trial.ok&&same(progressValue(trial.snapshot.tasks[t.entityId]),step.after)){
                  let n=this.progressJournal.length+historyEvents.length+1,id=`rea-history-${n}`;
                  while(this.progressOperationIds.has(id)||this.receipts.has(id)||reservedIds.has(id))id=`rea-history-${++n}`;
                  reservedIds.add(id);operation={...source.operation,commandId:id,percent:record.percent};
                }
              }
            }
            historyEvents.push(freezeStored({sourceId:step.origin??`unbound-history-${this.progressJournal.length+historyEvents.length}`,direction:forward?'forward':inverse?'inverse':'unsupported',operation}));
          }
          task.currentPercent=step.after.currentPercent;task.progressRecords=step.after.progressRecords.map(r=>({...r}));targets.add(t.entityId);
        }
        if(!validateReaStoredText(candidate))return rejected('HISTORY_DOMAIN_RESULT_REJECTED');
        semanticChanged=[...targets].some(id=>canonicalJson(progressValue(domain.tasks[id]))!==canonicalJson(progressValue(candidate.tasks[id])));domain=freezeStored(candidate) as unknown as T;
      }
      // No tagged validation, grammar recognition, normalization, or domain update here.
      // A selection or unrelated accepted edit cannot dismiss unsupported intent.
      // No resolution UI is connected in this experiment: retain it and hold export.
      const textChanged=!this.current.doc.eq(next.doc);this.current=next;this.baseline=domain;if(textChanged)this.revision++;if(semanticChanged)this.semanticRevision++;
      this.writingJournal.push(...writingEvents);
      for(const event of historyEvents){this.progressJournal.push(event);if(event.operation)this.progressOperationIds.add(event.operation.commandId);}
      if(historyAction)this.preparedHistory.delete(originalTransaction);
      if(historyAction||boundary)this.historyBoundaryNext=true;else if(textChanged)this.historyBoundaryNext=false;
      return{ok:true,revision:this.revision};
    }catch(error){
      if(confirmationSteps.length)return rejected('UNDO_CONFLICT');
      // A rejected selection/attribute-only operation supplies no new text.
      // Its diagnostics must not replace an unresolved raw proposal, even when
      // its before document is stale. Return the current error independently.
      const changesText=tr.docChanged&&tr.doc.textBetween(0,tr.doc.content.size,'\n','\n')!==tr.before.textBetween(0,tr.before.content.size,'\n','\n');
      if(!this.refused||changesText)this.refused=freezeStored({reason:(error as Error).message,proposal:tr.doc.toJSON()});
      return rejected((error as Error).message);
    }
  }
  /** Same owner/end/final-publication boundary as the verified lifecycle.
   * This headless binding is not proof of native IME event delivery. */
  beginComposition(occurrenceId:string){
    if(this.closed||this.composition)return rejected('COMPOSITION_OWNER_HOLD');
    const body=fromTaggedPM(this.current.doc);
    // The validated native target can lead PM's selection publication at start.
    // Observe that exact existing ID; do not reset selection or accept text here.
    // apply() still restricts preedit and the published selection to this owner.
    if(!body.blocks[occurrenceId]||body.blocks[occurrenceId].kind==='folderLink')return rejected('COMPOSITION_TARGET_MISMATCH');
    const binding=Object.freeze({docId:this.docId,ownerId:this.inputOwnerId,generation:++this.compositionEpoch,occurrenceId});
    this.composition={binding,ended:false};this.historyBoundaryNext=true;return{ok:true as const,binding};
  }
  endComposition(binding:CompositionBinding){if(!this.matches(binding))return rejected('STALE_COMPOSITION');this.composition!.ended=true;return{ok:true as const};}
  settleComposition(binding:CompositionBinding,text:string,selection:TaggedSelection){
    if(!this.matches(binding)||!this.composition!.ended)return rejected('STALE_OR_UNFINISHED_COMPOSITION');
    const body=fromTaggedPM(this.current.doc),current=taggedLogical(this.current.doc,this.current.selection);
    if(body.blocks[binding.occurrenceId]?.text!==text||canonicalJson(current)!==canonicalJson(selection)||selection.occurrenceId!==binding.occurrenceId)return rejected('FINAL_PUBLICATION_MISMATCH');
    this.composition=null;this.historyBoundaryNext=true;return{ok:true as const};
  }
  private matches(binding:CompositionBinding){return!this.closed&&!!this.composition&&canonicalJson(binding)===canonicalJson(this.composition.binding);}
  /** Adapt the verified composition scheduler without resetting the PM selection. */
  compositionState(){return{session:{docId:this.docId,ownerId:this.inputOwnerId,generation:this.compositionEpoch,compositionOwner:this.composition?{...this.composition.binding}:null}};}
  compositionAction(action:any):{status:string}{
    if(action.action==='setSelection')return{status:'OBSERVED'};
    const target=String(action.target),id=target.slice(this.docId.length+1);
    if(target!==this.docId+'/'+id)return{status:'STALE_COMPOSITION_OWNER'};
    if(action.action==='beginComposition'){const result=this.beginComposition(id);return{status:result.ok?'OBSERVED':result.reason};}
    const binding=this.composition?.binding;
    if(!binding||target!==this.docId+'/'+binding.occurrenceId)return{status:'STALE_COMPOSITION_OWNER'};
    if(action.action==='compositionEndWithoutFinalInput'){const result=this.endComposition(binding);return{status:result.ok?'OBSERVED':result.reason};}
    if(action.action!=='finalInput'||action.ownerId!==binding.ownerId||action.generation!==binding.generation)return{status:'STALE_COMPOSITION_OWNER'};
    const result=this.settleComposition(binding,action.text,action.selection);return{status:result.ok?'ACCEPTED':result.reason};
  }
  roundTrip(){
    if(this.closed)return rejected('OWNER_RETIRED');if(this.composition)return rejected('COMPOSITION_OWNER_HOLD');
    if(this.refused)return rejected('UNSUPPORTED_INPUT_INTENT_HOLD');
    const projected=projectTagged(this.baseline,this.docId,fromTaggedPM(this.current.doc));if(!projected.ok)return projected;
    const json=canonicalJson(projected.snapshot),ordered=this.baseline.schema==='flowme-rea-text/2',read=ordered?readOrderedStoredProgramText(parseAlphaJson(json)):readStoredProgramText(parseAlphaJson(json));
    if(ordered?read.kind!=='rea-ordered-readonly':read.kind!=='rea-readonly')return rejected('CODEC_READBACK_REJECTED');
    if(!('snapshot' in read))return rejected('CODEC_READBACK_REJECTED');
    return{ok:true as const,json,snapshot:read.snapshot as unknown as T,writeAllowed:false as const,writeBlockedReason:this.writeBlockedReason};
  }
  /** Explicit semantic append, not an Enter handler or default app writer.
   * One allocation is one official PM event. Its inverse is limited to the
   * unsaved source/preimage and the current host's exact save-boundary proof. */
  appendItem(request:AppendRequest){
    if(this.baseline.schema!=='flowme-rea-text/1')return rejected('ORDERED_APPEND_NOT_SUPPORTED');
    if(this.closed||request.inputOwnerId!==this.inputOwnerId||request.docId!==this.docId)return rejected('OWNER_OR_DOCUMENT_MISMATCH');
    if(this.composition||this.refused)return rejected('INPUT_OWNER_HOLD');
    if(typeof request.requestId!=='string'||!request.requestId.trim()||!['memo','task'].includes(request.kind)||typeof request.text!=='string'||this.receipts.has(request.requestId)||this.progressReceipts.has(request.requestId)||this.progressOperationIds.has(request.requestId))return rejected('INVALID_APPEND_REQUEST');
    if(this.reenteredRequestIds.has(request.requestId))return rejected('REENTRY_REQUEST_ID_RETIRED');
    const intent=canonicalJson({docId:request.docId,occurrenceId:request.occurrenceId,kind:request.kind,text:request.text,...(request.afterOccurrenceId?{afterOccurrenceId:request.afterOccurrenceId}:{})});
    const prior=this.appendReceipts.get(request.requestId);
    if(prior)return prior.intent===intent?{ok:true as const,status:'DUPLICATE' as const,occurrenceId:prior.occurrenceId,entityId:prior.entityId}:rejected('REQUEST_ID_REUSED');
    if(this.reservedAppendIds.has(request.occurrenceId))return rejected('APPEND_ID_PERMANENTLY_RESERVED');
    if(request.expectedInputRevision!==this.revision||request.expectedSemanticRevision!==this.semanticRevision||request.expectedCompositionEpoch!==this.compositionEpoch)return rejected('STALE_APPEND_REVISION');
    const projected=projectTagged(this.baseline,this.docId,fromTaggedPM(this.current.doc));
    if(!projected.ok||!validateReaStoredText(projected.snapshot))return rejected('UNSERIALIZABLE_APPEND_INPUT_PRESERVED');
    const entityId=request.kind==='task'?this.pool[this.allocated]:null;
    if(entityId===undefined)return rejected('SYNTHETIC_ID_POOL_EXHAUSTED');
    if(entityId!==null&&this.reservedAppendIds.has(entityId))return rejected('APPEND_ID_PERMANENTLY_RESERVED');
    const result=appendTagged(projected.snapshot,this.docId,request.occurrenceId,request.kind,request.text,entityId,request.afterOccurrenceId);
    if(!result.ok)return result;
    try{
      const block=result.snapshot.documents[this.docId].blocks[request.occurrenceId];
      const target={inputOwnerId:this.inputOwnerId,docId:this.docId,occurrenceId:request.occurrenceId,entityId,...(request.afterOccurrenceId?{afterOccurrenceId:request.afterOccurrenceId,nextOccurrenceId:projected.snapshot.documents[this.docId].order[projected.snapshot.documents[this.docId].order.indexOf(request.afterOccurrenceId)+1]??null}:{})};
      const tr=this.current.tr.step(new TaggedAppendStep(request.afterOccurrenceId?taggedLocate(this.current.doc,request.afterOccurrenceId).start+taggedLocate(this.current.doc,request.afterOccurrenceId).node.nodeSize:this.current.doc.content.size,true,target,block,request.requestId)).setMeta(TAGGED_ACTION_BOUNDARY,true);
      tr.setSelection(taggedSelect(tr.doc,{occurrenceId:request.occurrenceId,anchor:block.text.length,head:block.text.length,direction:'none'}));
      closeHistory(tr);
      const next=this.current.apply(tr),document=result.snapshot.documents[this.docId];
      // Prove the newest event, not a depth +1 assumption: the official engine
      // may prune older events at its existing configured retention boundary.
      let inverse:Transaction|undefined;undo(next,value=>{inverse=value;});
      const only=inverse?.steps.length===1?inverse.steps[0]:null;
      if(canonicalJson(fromTaggedPM(next.doc))!==canonicalJson({blocks:document.blocks,order:document.order})||!(only instanceof TaggedAppendStep)||only.adding||only.origin!==request.requestId||!inverse!.doc.eq(this.current.doc)||redoDepth(next)!==0)return rejected('APPEND_PM_OR_HISTORY_MISMATCH');
      this.current=next;this.baseline=result.snapshot as unknown as T;this.revision++;this.semanticRevision++;this.historyBoundaryNext=true;
      if(request.kind==='task')this.allocated++;
      this.appendReceipts.set(request.requestId,{intent,occurrenceId:request.occurrenceId,entityId});
      this.appendSources.set(request.requestId,freezeStored({target,block:detached(block),task:entityId===null?null:detached(result.snapshot.tasks[entityId])}));
      if(target.afterOccurrenceId)this.writingJournal.push({type:'insert',docId:this.docId,occurrenceId:request.occurrenceId,afterOccurrenceId:target.afterOccurrenceId,nextOccurrenceId:target.nextOccurrenceId??null,block:detached(block),adding:true});
      this.reservedAppendIds.add(request.occurrenceId);if(entityId!==null)this.reservedAppendIds.add(entityId);
      return{ok:true as const,status:'APPLIED' as const,occurrenceId:request.occurrenceId,entityId};
    }catch{return rejected('APPEND_PUBLICATION_REJECTED');}
  }
  prepareConfirmation(request:ConfirmRequest){
    if(this.baseline.schema==='flowme-rea-text/2')return rejected('ORDERED_CONFIRMATION_NOT_SUPPORTED');
    if(this.closed||request.inputOwnerId!==this.inputOwnerId||request.docId!==this.docId)return rejected('OWNER_OR_DOCUMENT_MISMATCH');
    if(typeof request.requestId!=='string'||!request.requestId.trim()||!['task','schedule'].includes(request.kind))return rejected('INVALID_CONFIRM_REQUEST');
    if(this.progressReceipts.has(request.requestId)||this.appendReceipts.has(request.requestId)||this.reenteredRequestIds.has(request.requestId))return rejected('REQUEST_ID_REUSED');
    if(this.composition)return rejected('COMPOSITION_OWNER_HOLD');
    if(this.refused)return rejected('UNSUPPORTED_INPUT_INTENT_HOLD');
    const intent=canonicalJson({docId:request.docId,occurrenceId:request.occurrenceId,kind:request.kind,expectedText:request.expectedText,...(request.explicit?{explicit:request.explicit}:{})});
    const receipt=this.receipts.get(request.requestId);
    if(receipt)return receipt.intent===intent?{ok:true as const,status:'DUPLICATE' as const,entityId:receipt.entityId}:rejected('REQUEST_ID_REUSED');
    if(request.expectedRevision!==this.revision)return rejected('STALE_INPUT_REVISION');
    const projected=projectTagged(this.baseline,this.docId,fromTaggedPM(this.current.doc));if(!projected.ok)return projected;
    const id=this.pool[this.allocated];if(id===undefined)return rejected('SYNTHETIC_ID_POOL_EXHAUSTED');
    if(this.reservedAppendIds.has(id))return rejected('APPEND_ID_PERMANENTLY_RESERVED');
    if(!validateReaStoredText(projected.snapshot))return rejected('ORDERED_CONFIRMATION_NOT_SUPPORTED');
    const result=confirmTagged(projected.snapshot,this.docId,request.occurrenceId,request.kind,request.expectedText,id,request.explicit);if(!result.ok)return result;
    const token=Object.freeze({});this.prepared.set(token,{request:detached(request),intent,state:this.current,revision:this.revision,semanticRevision:this.semanticRevision,compositionEpoch:this.compositionEpoch,next:result.snapshot as unknown as T,prefixLength:result.prefixLength,entityId:id,receipt:result.receipt});
    return{ok:true as const,status:'PREPARED' as const,token};
  }
  commitConfirmation(token:object){
    const p=this.prepared.get(token);if(!p)return rejected('INVALID_OR_CONSUMED_PREPARATION');
    this.prepared.delete(token);
    if(this.closed||this.composition||this.refused||p.compositionEpoch!==this.compositionEpoch||p.state!==this.current||p.revision!==this.revision||p.semanticRevision!==this.semanticRevision||this.receipts.has(p.request.requestId)||this.progressReceipts.has(p.request.requestId)||this.pool[this.allocated]!==p.entityId)return rejected('STALE_PREPARATION');
    try{
      const selection=taggedLogical(this.current.doc,this.current.selection);if(!selection)throw Error('UNMAPPABLE_SELECTION');
      const row=taggedLocate(this.current.doc,p.request.occurrenceId),target:ConfirmationTarget={inputOwnerId:this.inputOwnerId,docId:this.docId,occurrenceId:p.request.occurrenceId,entityId:p.entityId,kind:p.request.kind};
      if(!this.confirmationAllowed(target,'confirm'))return rejected('CONFIRMATION_AUTHORITY_HOLD');
      const source=freezeStored({target,receipt:detached(p.receipt)});
      const tr=this.current.tr.step(new TaggedConfirmStep(row.start,true,target,p.receipt.before,p.receipt.after,p.request.requestId)).setMeta(TAGGED_ACTION_BOUNDARY,true);
      const mapOffset=(n:number)=>Math.max(0,n-p.prefixLength);
      const mapped=selection.occurrenceId===p.request.occurrenceId?{...selection,anchor:mapOffset(selection.anchor),head:mapOffset(selection.head)}:selection;
      tr.setSelection(taggedSelect(tr.doc,mapped));closeHistory(tr);const next=this.current.apply(tr);
      const body=fromTaggedPM(next.doc),expected=p.next.documents[this.docId];
      if(canonicalJson(body)!==canonicalJson({blocks:expected.blocks,order:expected.order}))throw Error('EXACT_PM_PROJECTION_MISMATCH');
      let inverse:Transaction|undefined;undo(next,value=>{inverse=value;});
      const only=inverse?.steps.length===1?inverse.steps[0]:null;
      if(!(only instanceof TaggedConfirmStep)||only.confirming||only.origin!==p.request.requestId||!inverse!.doc.eq(this.current.doc)||redoDepth(next)!==0)return rejected('CONFIRM_PM_HISTORY_MISMATCH');
      // All checks precede the single local commit and ID consumption.
      this.current=next;this.baseline=p.next;this.revision++;this.semanticRevision++;this.allocated++;this.historyBoundaryNext=true;
      this.receipts.set(p.request.requestId,{intent:p.intent,entityId:p.entityId});this.refused=null;
      this.confirmationSources.set(p.request.requestId,source);this.writingJournal.push({type:'confirm',receipt:detached(p.receipt),confirming:true});
      return{ok:true as const,entityId:p.entityId,revision:this.revision};
    }catch(error){return rejected((error as Error).message);}
  }
}
export function openTaggedSession(input:{account:unknown;accountOwnerId:string;references?:AlphaReferenceContext;docId:string;inputOwnerId:string;entityIds:readonly string[]}){
  const read=inspectAlphaStoredRead(input.account,input.accountOwnerId,input.references);
  if(read.kind!=='rea-readonly')return rejected(read.kind==='blocked'?read.reason:'USE_EXISTING_V11_SESSION');
  if(!input.inputOwnerId.trim()||!Object.hasOwn(read.text.snapshot.documents,input.docId))return rejected('INVALID_INPUT_OWNER_OR_DOCUMENT');
  return{ok:true as const,session:new TaggedSession(detached(read.text.snapshot) as ReaStoredText,input.docId,input.inputOwnerId,input.entityIds)};
}
/** Same PM owner/history/IME lifecycle, with a true v2 baseline and v2 codec.
 * The v11 source is only projected after whole-account lossless admission. */
export function openMemoTaggedSession(input:{account:unknown;accountOwnerId:string;references:AlphaReferenceContext;docId:string;inputOwnerId:string;entityIds:readonly string[]}){
 const cohort=inspectMemoCohort(input.account,input.accountOwnerId,input.references);if(!cohort.ok)return rejected(cohort.reason);
 if(!input.inputOwnerId.trim()||!Object.hasOwn(cohort.projected.space.text.documents,input.docId))return rejected('INVALID_INPUT_OWNER_OR_DOCUMENT');
 if(cohort.projected.space.archivedDocumentIds.includes(input.docId))return rejected('ARCHIVED_DOCUMENT_READONLY');
 return{ok:true as const,session:new TaggedSession<ReaOrderedStoredText>(detached(cohort.projected.space.text),input.docId,input.inputOwnerId,[])};
}
