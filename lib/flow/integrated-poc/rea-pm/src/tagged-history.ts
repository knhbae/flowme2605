import {Step,StepResult,ReplaceStep,type Mappable} from 'prosemirror-transform';
import {Slice,Fragment,type Node,type Schema} from 'prosemirror-model';
import {Plugin} from 'prosemirror-state';
import {history} from 'prosemirror-history';
import {canonicalJson,detached} from '../../alpha-persistence/json';
import {freezeStored,type ReaStoredText} from '../../rea-stored-text';
import {taggedProgressDate} from '../tagged-progress';
import {taggedSchema,taggedInline} from './tagged-pm-schema';
import type {ReaStoredOccurrence} from '../../rea-stored-text';

export const TAGGED_ACTION_BOUNDARY='flowmeTaggedActionBoundary';
/** Keep the official engine/config/key. Existing IME-aware view props own DOM routing. */
export function taggedHistoryPlugin(){const plugin=history();return new Plugin({...plugin.spec,props:{}});}
export type ProgressValue={currentPercent:number;progressRecords:readonly {recordDate:string;percent:number}[]};
export type ProgressTarget={inputOwnerId:string;docId:string;occurrenceId:string;entityId:string};
const shape=(x:any,keys:string[])=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const percent=(n:any)=>Number.isInteger(n)&&n>=0&&n<=100;
function validValue(v:any):v is ProgressValue{return shape(v,['currentPercent','progressRecords'])&&percent(v.currentPercent)&&Array.isArray(v.progressRecords)&&new Set(v.progressRecords.map((r:any)=>r?.recordDate)).size===v.progressRecords.length&&v.progressRecords.every((r:any)=>shape(r,['recordDate','percent'])&&taggedProgressDate(r.recordDate)&&percent(r.percent));}
const validTarget=(v:any):v is ProgressTarget=>shape(v,['inputOwnerId','docId','occurrenceId','entityId'])&&Object.values(v).every(id=>typeof id==='string'&&!!id.trim()&&!['__proto__','constructor','prototype'].includes(id));
export const progressValue=(task:ReaStoredText['tasks'][string]):ProgressValue=>({currentPercent:task.currentPercent,progressRecords:task.progressRecords.map(r=>({...r}))});

/** A pure, identity-doc Step puts explicit progress in the same official PM history.
 * Actual business mutation belongs to session preflight/atomic commit, never apply/invert/map. */
export class TaggedProgressStep extends Step {
 readonly target:ProgressTarget;readonly before:ProgressValue;readonly after:ProgressValue;readonly origin:string|null;
 constructor(target:ProgressTarget,before:ProgressValue,after:ProgressValue,origin:string|null=null){super();canonicalJson({target,before,after,origin});if(!validTarget(target)||!validValue(before)||!validValue(after)||(origin!==null&&(typeof origin!=='string'||!origin.trim())))throw Error('INVALID_PROGRESS_HISTORY_STEP');this.target=freezeStored(detached(target));this.before=freezeStored(detached(before));this.after=freezeStored(detached(after));this.origin=origin;Object.freeze(this);}
 apply(doc:Node){return StepResult.ok(doc);}
 invert(_doc:Node){return new TaggedProgressStep(this.target,this.after,this.before,this.origin);}
 map(_mapping:Mappable){return this;}
 toJSON(){return{stepType:'flowmeTaggedProgressHistory/1',target:detached(this.target),before:detached(this.before),after:detached(this.after),...(this.origin!==null?{origin:this.origin}:{})};}
 static fromJSON(_schema:Schema,value:any){if(!(shape(value,['stepType','target','before','after'])||shape(value,['stepType','target','before','after','origin']))||value.stepType!=='flowmeTaggedProgressHistory/1')throw Error('INVALID_PROGRESS_HISTORY_JSON');return new TaggedProgressStep(value.target,value.before,value.after,value.origin===undefined?null:value.origin);}
}
Step.jsonID('flowmeTaggedProgressHistory/1',TaggedProgressStep);

export type AppendTarget={afterOccurrenceId?:string;nextOccurrenceId?:string|null;inputOwnerId:string;docId:string;occurrenceId:string;entityId:string|null};
/** One explicit allocation in the existing PM history. Business changes and
 * save-boundary permission remain with the session/host, never this pure Step. */
export class TaggedAppendStep extends Step {
 readonly target:AppendTarget;readonly block:ReaStoredOccurrence;
 constructor(readonly position:number,readonly adding:boolean,target:AppendTarget,block:ReaStoredOccurrence,readonly origin:string){
  super();canonicalJson({target,block,origin});
  if(!Number.isSafeInteger(position)||position<0||typeof adding!=='boolean'||!origin?.trim()||!shape(target,['inputOwnerId','docId','occurrenceId','entityId',...(Object.hasOwn(target,'afterOccurrenceId')?['afterOccurrenceId','nextOccurrenceId']:[])])||!['inputOwnerId','docId','occurrenceId'].every(k=>typeof (target as any)[k]==='string'&&!!(target as any)[k].trim())||!shape(block,['kind','text','entityId','folderId'])||!['memo','task'].includes(block.kind)||typeof block.text!=='string'||block.folderId!==null||block.entityId!==target.entityId||block.kind==='memo'&&block.entityId!==null||block.kind==='task'&&(typeof block.entityId!=='string'||!block.entityId.trim()))throw Error('INVALID_APPEND_HISTORY_STEP');
  this.target=freezeStored(detached(target));this.block=freezeStored(detached(block));
  this.node();Object.freeze(this);
 }
 private node(){return taggedSchema.nodes.occurrence.createChecked({oid:this.target.occurrenceId,kind:this.block.kind,entityId:this.block.entityId,folderId:null},taggedInline(this.block.text));}
 private replacement(){const node=this.node();return new ReplaceStep(this.position,this.position+(this.adding?0:node.nodeSize),this.adding?new Slice(Fragment.from(node),0,0):Slice.empty);}
 apply(doc:Node){
  let found=false;doc.forEach(node=>{if(node.attrs.oid===this.target.occurrenceId)found=true;});
  if(this.adding&&found)return StepResult.fail('APPEND_HISTORY_ID_ALREADY_PRESENT');
  if(!this.adding){const node=doc.nodeAt(this.position);if(!node||!node.eq(this.node()))return StepResult.fail('APPEND_HISTORY_PREIMAGE_MISMATCH');}
  return this.replacement().apply(doc);
 }
 getMap(){return this.replacement().getMap();}
 invert(_doc:Node){return new TaggedAppendStep(this.position,!this.adding,this.target,this.block,this.origin);}
 map(mapping:Mappable){const mapped=this.replacement().map(mapping);return mapped&&mapped.to-mapped.from===(this.adding?0:this.node().nodeSize)?new TaggedAppendStep(mapped.from,this.adding,this.target,this.block,this.origin):null;}
 toJSON(){return{stepType:'flowmeTaggedAppendHistory/1',position:this.position,adding:this.adding,target:detached(this.target),block:detached(this.block),origin:this.origin};}
 static fromJSON(_schema:Schema,v:any){if(!shape(v,['stepType','position','adding','target','block','origin'])||v.stepType!=='flowmeTaggedAppendHistory/1')throw Error('INVALID_APPEND_HISTORY_JSON');return new TaggedAppendStep(v.position,v.adding,v.target,v.block,v.origin);}
}
Step.jsonID('flowmeTaggedAppendHistory/1',TaggedAppendStep);

export type ConfirmationTarget={inputOwnerId:string;docId:string;occurrenceId:string;entityId:string;kind:'task'|'schedule'};
/** Document-only representation of a confirmation. Domain receipt/authority is
 * checked atomically by TaggedSession before publishing an engine transaction. */
export class TaggedConfirmStep extends Step {
 readonly target:ConfirmationTarget;readonly memo:ReaStoredOccurrence;readonly typed:ReaStoredOccurrence;
 constructor(readonly position:number,readonly confirming:boolean,target:ConfirmationTarget,memo:ReaStoredOccurrence,typed:ReaStoredOccurrence,readonly origin:string){
  super();canonicalJson({target,memo,typed,origin});
  if(!Number.isSafeInteger(position)||position<0||typeof confirming!=='boolean'||!origin?.trim()||!shape(target,['inputOwnerId','docId','occurrenceId','entityId','kind'])||!['task','schedule'].includes(target.kind)||!['inputOwnerId','docId','occurrenceId','entityId'].every(k=>typeof (target as any)[k]==='string'&&!!(target as any)[k].trim())||memo.kind!=='memo'||memo.entityId!==null||typed.kind!==target.kind||typed.entityId!==target.entityId||memo.folderId!==typed.folderId||typeof memo.text!=='string'||typeof typed.text!=='string')throw Error('INVALID_CONFIRM_HISTORY_STEP');
  this.target=freezeStored(detached(target));this.memo=freezeStored(detached(memo));this.typed=freezeStored(detached(typed));this.node(false);this.node(true);Object.freeze(this);
 }
 private node(typed:boolean){const block=typed?this.typed:this.memo;return taggedSchema.nodes.occurrence.createChecked({oid:this.target.occurrenceId,kind:block.kind,entityId:block.entityId,folderId:block.folderId,beforeLinkText:block.beforeLinkText??null,draft:block.draft??null},taggedInline(block.text));}
 private replacement(){const before=this.node(!this.confirming),after=this.node(this.confirming);return new ReplaceStep(this.position,this.position+before.nodeSize,new Slice(Fragment.from(after),0,0));}
 apply(doc:Node){const node=doc.nodeAt(this.position);return!node||!node.eq(this.node(!this.confirming))?StepResult.fail('CONFIRM_HISTORY_PREIMAGE_MISMATCH'):this.replacement().apply(doc);}
 getMap(){return this.replacement().getMap();}
 invert(_doc:Node){return new TaggedConfirmStep(this.position,!this.confirming,this.target,this.memo,this.typed,this.origin);}
 map(mapping:Mappable){const mapped=this.replacement().map(mapping);return mapped&&mapped.to-mapped.from===this.node(!this.confirming).nodeSize?new TaggedConfirmStep(mapped.from,this.confirming,this.target,this.memo,this.typed,this.origin):null;}
 toJSON(){return{stepType:'flowmeTaggedConfirmHistory/1',position:this.position,confirming:this.confirming,target:detached(this.target),memo:detached(this.memo),typed:detached(this.typed),origin:this.origin};}
 static fromJSON(_schema:Schema,v:any){if(!shape(v,['stepType','position','confirming','target','memo','typed','origin'])||v.stepType!=='flowmeTaggedConfirmHistory/1')throw Error('INVALID_CONFIRM_HISTORY_JSON');return new TaggedConfirmStep(v.position,v.confirming,v.target,v.memo,v.typed,v.origin);}
}
Step.jsonID('flowmeTaggedConfirmHistory/1',TaggedConfirmStep);

/** Memo metadata is one native history event; the session validates its source. */
export class TaggedDraftStep extends Step {
 constructor(readonly position:number,readonly occurrenceId:string,readonly before:ReaStoredOccurrence,readonly after:ReaStoredOccurrence,readonly origin:string){super();if(before.kind!=='memo'||after.kind!=='memo'||before.text!==after.text||before.folderId!==after.folderId||before.entityId!==null||after.entityId!==null||!origin)throw Error('INVALID_DRAFT_STEP');canonicalJson({before,after});Object.freeze(this);}
 private node(b:ReaStoredOccurrence){return taggedSchema.nodes.occurrence.createChecked({oid:this.occurrenceId,kind:'memo',entityId:null,folderId:b.folderId,draft:b.draft??null},taggedInline(b.text));}
 private replacement(){return new ReplaceStep(this.position,this.position+this.node(this.before).nodeSize,new Slice(Fragment.from(this.node(this.after)),0,0));}
 apply(doc:Node){const node=doc.nodeAt(this.position);return!node||!node.eq(this.node(this.before))?StepResult.fail('DRAFT_PREIMAGE_MISMATCH'):this.replacement().apply(doc);}
 getMap(){return this.replacement().getMap();}
 invert(_doc:Node){return new TaggedDraftStep(this.position,this.occurrenceId,this.after,this.before,this.origin);}
 map(mapping:Mappable){const r=this.replacement().map(mapping);return r&&r.to-r.from===this.node(this.before).nodeSize?new TaggedDraftStep(r.from,this.occurrenceId,this.before,this.after,this.origin):null;}
 toJSON(){return{stepType:'flowmeTaggedDraft/1',position:this.position,occurrenceId:this.occurrenceId,before:this.before,after:this.after,origin:this.origin};}
 static fromJSON(_schema:Schema,v:any){if(!shape(v,['stepType','position','occurrenceId','before','after','origin']))throw Error('INVALID_DRAFT_JSON');return new TaggedDraftStep(v.position,v.occurrenceId,v.before,v.after,v.origin);}
}
Step.jsonID('flowmeTaggedDraft/1',TaggedDraftStep);
