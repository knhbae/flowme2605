import type {Line} from '../../codec.cjs';
import type {PmCodecSession} from '../pm-codec-session';
import type {createProgramPmOwner} from '../../owner';
import {canonical} from '../../codec.cjs';
import type {TextWorkspaceState} from '../../../text-workspace';

type ProgressRead=Pick<PmCodecSession,'summary'|'persistedProjection'>;
type MarkerPaint=(row:Line|null,enabled:boolean)=>void;

/** Derived marker data only. The accepted session baseline is the sole source.
 * A key/selection transaction never requests another model projection. */
export class ProgressMetadata {
 private stamp=-1;private rows=new Map<string,Line>();private enabled=false;
 private bindings=new Map<string,Set<MarkerPaint>>();
 constructor(private session:ProgressRead){this.sync();}
 sync(locked=false,nativeComposing=false){
  const s=this.session.summary(),mayPaint=!s.retired&&!s.composing&&!nativeComposing;
  const changed=mayPaint&&s.baselineVersion!==this.stamp;
  if(changed){const doc=this.session.persistedProjection().documents.find(d=>d.id===s.documentId);if(!doc)return false;this.rows=new Map(doc.rows.map(row=>[row.id,row]));this.stamp=s.baselineVersion;}
  const enabled=mayPaint&&!locked&&!s.held&&!s.busy&&!s.pendingCommit&&!s.dirty;
  if(changed||enabled!==this.enabled){this.enabled=enabled;for(const[id,paints]of this.bindings)for(const paint of paints)paint(this.rows.get(id)??null,enabled);}
  return changed;
 }
 bind(lineId:string,paint:MarkerPaint){let paints=this.bindings.get(lineId);if(!paints)this.bindings.set(lineId,paints=new Set());paints.add(paint);paint(this.rows.get(lineId)??null,this.enabled);return()=>{paints!.delete(paint);if(!paints!.size)this.bindings.delete(lineId);};}
}

type Parser=(token:string)=>{ok:boolean;percent:number|null};
type History={taskId:string;date:string;percent:number};
type Target={ownerId:string;documentId:string;lineId:string;taskId:string;baselineVersion:number;inputRevision:number};
export type ProgressPanelView=Target&{visit:number;fieldRevision:number;title:string;date:string;percent:string;recordDate:string|null;numeric:boolean;history:History[];edited:boolean;phase:'editing'|'saving'|'unverified';reason:string|null};
type Attempt={visit:number;fieldRevision:number;noticeToken:object};

/** Ephemeral status ownership only; never an input, request ID or stored field. */
export class ProgressNoticeOwner {
 private token:object|null=null;
 replace(token:object|null=null){this.token=token;}
 resolve(token:object|null){if(!token||this.token!==token)return false;this.token=null;return true;}
}

/** One bounded modal draft. It owns only unsubmitted form fields, never a
 * second source/domain document. Handoff must include its pending/checkpoint. */
export class ProgressPanelOwner {
 private panel:ProgressPanelView|null=null;private revision=0;private visit=0;private attempt:Attempt|null=null;
 constructor(private session:PmCodecSession,private parse:Parser,private today:()=>string,private blocked:(lineId:string)=>string|undefined=()=>undefined){}
 inputRevision(){return this.revision;}
 pendingNoticeToken(){return this.attempt?.noticeToken??null;}
 hasPendingInput(){return!!this.panel&&(this.panel.edited||this.panel.phase!=='editing');}
 view(){return this.panel?structuredClone(this.panel):null;}
 private row(lineId:string){const s=this.session.summary();const row=this.session.persistedProjection().documents.find(d=>d.id===s.documentId)?.rows.find(r=>r.id===lineId);
  return row&&row.kind==='task'&&row.editableReason===null&&row.entityId===lineId&&row.task?row:null;}
 private ready(lineId:string){const s=this.session.summary();return this.blocked(lineId)??(s.retired?'STALE_INPUT_OWNER':!s.inputSettled?'INPUT_NOT_SETTLED':s.busy||s.pendingCommit?'PENDING_COMMIT':s.held||s.dirty?'INPUT_OWNER_HOLD':undefined);}
 private history(row:Line){return(row.task!.history as History[]).map(r=>({...r})).sort((a,b)=>a.date.localeCompare(b.date));}
 open(lineId:string){const reason=this.ready(lineId);if(reason)return{ok:false as const,reason};const row=this.row(lineId);if(!row)return{ok:false as const,reason:'UNSUPPORTED_PROGRESS_TARGET'};
  if(this.hasPendingInput())return{ok:false as const,reason:'PANEL_DRAFT_PENDING'};
  const s=this.session.summary(),checkpoint=this.session.inputCheckpoint();this.revision++;
  this.panel={ownerId:s.ownerId,documentId:s.documentId,lineId,taskId:row.entityId!,baselineVersion:s.baselineVersion,inputRevision:checkpoint.revision,visit:++this.visit,fieldRevision:0,title:row.task!.title,
   date:this.today(),percent:String(row.task!.currentPercent??0),recordDate:null,numeric:this.parse(row.task!.exactToken??'').ok,history:this.history(row),edited:false,phase:'editing',reason:null};
  return{ok:true as const};
 }
 close(){if(this.panel){this.panel=null;this.revision++;}/* In-flight session attempts remain protected independently. */}
 private edit(change:(p:ProgressPanelView)=>void){if(!this.panel||this.blocked(this.panel.lineId))return;change(this.panel);this.panel.fieldRevision++;this.panel.edited=true;this.panel.reason=null;this.revision++;}
 setDate(date:string){this.edit(p=>{p.date=date;});}
 setPercent(percent:string){this.edit(p=>{p.percent=percent;});}
 chooseHistory(date:string){const record=this.panel?.history.find(r=>r.date===date);if(record)this.edit(p=>{p.recordDate=record.date;p.date=record.date;p.percent=String(record.percent);});}
 private settle(attempt:Attempt){const p=this.panel;if(!p||p.visit!==attempt.visit)return;
  if(p.fieldRevision===attempt.fieldRevision){this.close();return;}
  // Newer form fields survive the older ACK. Rebind only the persisted target.
  const s=this.session.summary(),row=this.row(p.lineId);if(!row||s.ownerId!==p.ownerId||s.documentId!==p.documentId||s.retired)return;
  p.baselineVersion=s.baselineVersion;p.inputRevision=this.session.inputCheckpoint().revision;p.history=this.history(row);p.phase='editing';p.reason=null;
 }
 async submit():Promise<{ok:boolean;reason?:string;notify:boolean;noticeToken?:object}>{const p=this.panel;if(!p)return{ok:false as const,reason:'NO_PROGRESS_PANEL',notify:false};
  const s=this.session.summary(),checkpoint=this.session.inputCheckpoint(),reason=this.ready(p.lineId);
  if(reason||this.attempt||s.ownerId!==p.ownerId||s.documentId!==p.documentId||s.baselineVersion!==p.baselineVersion||checkpoint.revision!==p.inputRevision){p.reason=reason??'PANEL_TARGET_CHANGED';return{ok:false as const,reason:p.reason,notify:true};}
  const row=this.row(p.lineId),parsed=this.parse(p.percent.trim());
  if(!row||row.entityId!==p.taskId){p.reason='PANEL_TARGET_CHANGED';return{ok:false as const,reason:p.reason,notify:true};}
  if(!parsed.ok||parsed.percent===null||!p.date){p.reason='INVALID_PROGRESS_INPUT';return{ok:false as const,reason:p.reason,notify:true};}
  const asOf=this.today(),correction=p.recordDate===p.date&&p.date<asOf&&this.parse(row.task!.exactToken??'').ok;
  const attempt={visit:p.visit,fieldRevision:p.fieldRevision,noticeToken:Object.freeze({})};this.attempt=attempt;p.phase='saving';p.reason=null;this.revision++;
  const result=await this.session.recordProgress(p.lineId,p.date,parsed.percent,correction?asOf:undefined);
  const notify=this.panel?.visit===attempt.visit&&this.panel.fieldRevision===attempt.fieldRevision;
  if(result.ok){this.attempt=null;this.settle(attempt);}
  else{const unknown=this.session.summary().pendingCommit==='UNVERIFIED';if(!unknown)this.attempt=null;
   if(this.panel?.visit===attempt.visit){this.panel.phase=unknown?'unverified':'editing';this.panel.reason=notify?result.reason:null;
    const current=this.session.summary();
    // A verified no-apply consumed this command's revision, not a new input.
    // UNKNOWN/pending, changed owner/baseline or another input cannot rebind.
    if(!current.pendingCommit&&!current.dirty&&!current.held&&current.inputSettled&&!current.retired&&current.ownerId===this.panel.ownerId&&current.documentId===this.panel.documentId&&current.baselineVersion===this.panel.baselineVersion&&this.session.inputCheckpoint().revision===this.panel.inputRevision+1)this.panel.inputRevision++;
   }}
  return{...result,notify,noticeToken:!result.ok&&this.attempt===attempt?attempt.noticeToken:undefined};
 }
 /** Call only after owner.confirmed(before,next) accepted the exact late proof. */
 confirmed(){const attempt=this.attempt;if(!attempt||this.session.summary().pendingCommit)return false;const notify=this.panel?.visit===attempt.visit&&this.panel.fieldRevision===attempt.fieldRevision;this.attempt=null;this.settle(attempt);return notify;}
}

export function progressPanelMessage(reason:string|null){return reason==='INVALID_PROGRESS_INPUT'?'진행률과 기록 날짜를 확인해 주세요. 예: 20, 20%, 0.2':reason==='UNVERIFIED_COMMIT_RESULT'?'진행 저장을 확인하지 못했습니다. 입력과 기존 표시를 보존합니다. 저장 확인 뒤 다시 시도해 주세요.':reason?'입력이나 저장 상태를 확인해 주세요. 진행 패널의 값은 그대로 남아 있습니다.':'';}

/** The exact ports registered by React. A RAW readback cannot capture modal
 * fields, so an unsubmitted panel must refuse owner handoff rather than vanish. */
export function createProgressEditorPorts(owner:ReturnType<typeof createProgramPmOwner>,panel:ProgressPanelOwner,actorId:string,isCurrent=()=>true){
 let confirmedPair:{before:string;next:string}|null=null;
 return{
 checkpoint:()=>{const checkpoint=owner.session.inputCheckpoint();return{...checkpoint,revision:checkpoint.revision+panel.inputRevision()};},
 hasPendingInput:()=>owner.hasPendingInput()||panel.hasPendingInput(),
 captureComplete:()=>owner.captureComplete()&&!panel.hasPendingInput(),
 flush:async()=>!panel.hasPendingInput()&&await owner.flush(),
 confirmed:(before:TextWorkspaceState,next:TextWorkspaceState)=>{if(!isCurrent()||!owner.confirmed(before,next))return{accepted:false,notify:false};confirmedPair={before:canonical(before),next:canonical(next)};return{accepted:true,notify:panel.confirmed()};},
 blocksExternalSnapshot:(before:Parameters<typeof owner.blocksExternalSnapshot>[0],next:Parameters<typeof owner.blocksExternalSnapshot>[1])=>{
  if(!isCurrent())return true;
  // Alpha rechecks its guard after consuming the exact confirmation. New panel
  // fields must not turn that same own ACK into an external-write conflict.
  if(confirmedPair&&before.activeActorId===actorId&&next.activeActorId===actorId&&canonical(before.spaces[actorId]?.text)===confirmedPair.before&&canonical(next.spaces[actorId]?.text)===confirmedPair.next&&canonical(owner.host.current())===confirmedPair.next)return false;
  return panel.hasPendingInput()&&!owner.hasPendingInput()?true:owner.blocksExternalSnapshot(before,next);
 },
};}
