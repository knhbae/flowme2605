import {Schema,Node as PMNode} from 'prosemirror-model';
import {EditorState,TextSelection,type Transaction} from 'prosemirror-state';
import {canonical,type Codec,type CodecDraft,type Line,type Proposal} from '../codec.cjs';
import type {CompositionBinding,LogicalSelection} from './editor/composition-session';

export interface HostRead {baselineVersion:number;snapshot:unknown}
// These exact fake-host reasons guarantee no application of this proposal.
// Adapters must not relabel an uncertain transport outcome as one of these reasons.
export type NoApplyReason='INJECTED_FAILURE_BEFORE_COMMIT'|'DENIED'|'STALE_OR_UNKNOWN_PROPOSAL'|'INVALID_PROPOSAL';
export type HostCommitResult=({ok:true;status:'APPLIED'|'NO_CHANGE'}&HostRead)|{ok:false;reason:NoApplyReason|'UNVERIFIED_HOST_OUTCOME'|'HOST_REJECTED_NOT_APPLIED'};
export interface Host {read():HostRead;commit(proposal:Proposal,expectedStamp:number):Promise<HostCommitResult>}
export interface Ticket {ownerId:string;epoch:number}
type Endpoint={lineId:string|null;offset:number|null;position:number};
export interface HeldInput {reason:string;doc:unknown;selection:unknown;from:Endpoint;to:Endpoint;sourceFrom:Endpoint;sourceTo:Endpoint;rows:Row[]|null;inputText?:string}
type Row={id:string;mode:'memo'|'task-title'|'opaque';text:string};
type Attempt={proposal:Proposal;stamp:number;phase:'SAVING'|'RETRYABLE'|'UNVERIFIED';rows?:Row[]};
type Expansion={root:string;ids:string[];mode:'memo'|'task-title'};
type EnterHistory={before:EditorState;after:EditorState;beforeExpansion:Expansion|null;afterExpansion:Expansion};

// Headless, single physical line per node. No DOM, EditorView, native input or new syntax.
export const pmSchema=new Schema({nodes:{doc:{content:'line+'},line:{group:'block',content:'text*',marks:'',isolating:true,whitespace:'pre',attrs:{id:{default:''},mode:{default:'opaque'}},parseDOM:[{tag:'div[data-line-id]',getAttrs:dom=>({id:(dom as HTMLElement).dataset.lineId,mode:(dom as HTMLElement).dataset.mode})}],toDOM:n=>['div',{'data-line-id':n.attrs.id,'data-mode':n.attrs.mode},0]},text:{group:'inline'}}});
const same=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
const clone=<T>(v:T):T=>structuredClone(v);
function projected(draft:CodecDraft,docId:string):Row[]{const doc=draft.view().documents.find(d=>d.id===docId);if(!doc)throw Error('MISSING_DOCUMENT');return doc.rows.map(row=>({id:row.id,mode:row.editableReason!==null?'opaque':row.kind==='task'&&row.task?'task-title':'memo',text:row.editableReason===null&&row.kind==='task'&&row.task?row.task.title:row.raw}));}
function document(rows:Row[]){if(!rows.length)throw Error('EMPTY_DOCUMENT_VIEW_UNSUPPORTED');return pmSchema.nodes.doc.createChecked(null,rows.map(r=>pmSchema.nodes.line.createChecked({id:r.id,mode:r.mode},r.text?pmSchema.text(r.text):undefined)));}
function rowsOf(doc:PMNode):Row[]{doc.check();const rows:Row[]=[];doc.forEach(n=>{if(n.type!==pmSchema.nodes.line||!['memo','task-title','opaque'].includes(n.attrs.mode))throw Error('INVALID_LINE_NODE');rows.push({id:n.attrs.id,mode:n.attrs.mode,text:n.textContent});});return rows;}
function endpoint(doc:PMNode,pos:number):Endpoint{let found:Endpoint={lineId:null,offset:null,position:pos};doc.forEach((node,start)=>{if(pos>=start+1&&pos<=start+node.nodeSize-1)found={lineId:node.attrs.id,offset:pos-start-1,position:pos};});return found;}
function position(doc:PMNode,end:Endpoint):number {let result:number|undefined;doc.forEach((node,start)=>{if(node.attrs.id===end.lineId&&end.offset!==null&&end.offset>=0&&end.offset<=node.content.size)result=start+1+end.offset;});if(result===undefined)throw Error('SELECTION_UNMAPPABLE');return result;}
function collectReserved(value:unknown,ids:Set<string>){if(typeof value==='string'){ids.add(value);return;}if(value&&typeof value==='object')for(const[key,item]of Object.entries(value)){ids.add(key);collectReserved(item,ids);}}
export function lineSelection(doc:PMNode,s:{anchor:number;head:number}):LogicalSelection|null{const a=endpoint(doc,s.anchor),h=endpoint(doc,s.head);return a.lineId&&a.lineId===h.lineId&&a.offset!==null&&h.offset!==null?{occurrenceId:a.lineId,anchor:a.offset,head:h.offset,direction:s.anchor===s.head?'none':s.anchor<s.head?'forward':'backward'}:null;}

export class PmCodecSession {
  private state:EditorState;private draft:CodecDraft;private baselineRows:Row[];private stamp:number;private baseline:unknown;private epoch=0;private inputRevision=0;private retired=false;private held:HeldInput|null=null;private attempt:Attempt|null=null;private busy=false;private status='OPENED';
  readonly ownerId='pm-codec-'+crypto.randomUUID();
  private compositionBinding:CompositionBinding|null=null;private compositionEnded=false;
  private expansion:Expansion|null=null;private reservedIds=new Set<string>();
  private enterTransactions=new WeakMap<Transaction,{doc:PMNode;anchor:number;head:number;expansion:Expansion|null;before:EditorState;epoch:number;stamp:number;action:'enter'|'undo'|'redo';history?:EnterHistory}>();
  private enterHistoryTransactions=new WeakSet<Transaction>();
  private enterUndo:EnterHistory[]=[];private enterRedo:EnterHistory[]=[];
  private constructor(private codec:Codec,private host:Host,private docId:string,read:HostRead,draft:CodecDraft){this.draft=draft;this.baseline=clone(read.snapshot);this.stamp=read.baselineVersion;this.baselineRows=projected(draft,docId);this.state=EditorState.create({schema:pmSchema,doc:document(this.baselineRows)});collectReserved(this.baseline,this.reservedIds);}
  static open(codec:Codec,host:Host,docId:string):{ok:true;session:PmCodecSession}|{ok:false;reason:string;preservedSnapshot?:unknown}{
    let preservedSnapshot:unknown;try{const read=host.read();preservedSnapshot=read.snapshot;if(!Number.isSafeInteger(read.baselineVersion)||read.baselineVersion<1)return{ok:false,reason:'INVALID_BASELINE_VERSION',preservedSnapshot};const draft=codec.open(read.snapshot);if(!draft.ok)return{ok:false,reason:draft.reason,preservedSnapshot};return{ok:true,session:new PmCodecSession(codec,host,docId,read,draft)};}catch(e){return{ok:false,reason:(e as Error).message,preservedSnapshot};}
  }
  inputCheckpoint(){return{ownerId:this.ownerId,revision:this.inputRevision};}
  view(){return{state:this.state,ticket:{ownerId:this.ownerId,epoch:this.epoch} as Ticket};}
  private dirtyRows(doc=this.state.doc){const base=new Map(this.baselineRows.map(r=>[r.id,r]));return rowsOf(doc).filter(r=>r.text!==base.get(r.id)?.text||r.mode!==base.get(r.id)?.mode);}
  private allowedDraft(rows=rowsOf(this.state.doc)){
    if(!this.expansion){const base=new Map(this.baselineRows.map(r=>[r.id,r]));return rows.filter(r=>r.text!==base.get(r.id)?.text||r.mode!==base.get(r.id)?.mode).length<=1;}
    const ids=new Set(this.expansion.ids),outside=rows.filter(r=>!ids.has(r.id)),before=this.baselineRows.filter(r=>r.id!==this.expansion!.root);
    if(!same(outside,before)||!same(rows.filter(r=>ids.has(r.id)).map(r=>r.id),this.expansion.ids))return false;
    if(this.attempt?.rows){const prior=new Map(this.attempt.rows.map(r=>[r.id,r]));return rows.filter(r=>!same(r,prior.get(r.id))).length<=1;}
    return true;
  }
  private expansionProposal(rows:Row[],expansion:Expansion){const source=this.draft.view().documents.find(d=>d.id===this.docId)?.rows.find(r=>r.id===expansion.root);return this.draft.prepare({kind:expansion.mode==='memo'?'splitMemoLines':'splitTaskLines',documentId:this.docId,lineId:expansion.root,expectedText:source?.raw,lines:rows.filter(r=>expansion.ids.includes(r.id)).map(({id,text})=>({id,text}))});}
  /** Prepare only. The existing UI dispatcher publishes this exact transaction once. */
  prepareEnter(ticket:Ticket){
    const reject=(reason:string)=>this.holdInput(reason,'\n');
    if(this.retired)return reject('STALE_INPUT_OWNER');
    if(ticket.ownerId!==this.ownerId||ticket.epoch!==this.epoch)return reject('STALE_TRANSACTION');
    if(this.compositionBinding)return{ok:false as const,reason:'INPUT_NOT_SETTLED'};
    if(this.held)return reject('PENDING_INPUT');
    if(this.busy||this.attempt)return reject('PENDING_COMMIT');
    const selected=lineSelection(this.state.doc,this.state.selection);if(!selected)return reject('CROSS_ROW_ENTER_UNSUPPORTED');
    const rows=rowsOf(this.state.doc),index=rows.findIndex(r=>r.id===selected.occurrenceId),row=rows[index];
    if(!row||row.mode==='opaque')return reject('ENTER_TARGET_UNSUPPORTED');
    if(row.mode==='task-title'&&(selected.anchor!==selected.head||selected.anchor<=0||selected.anchor>=row.text.length))return reject('ENTER_TASK_SELECTION_UNSUPPORTED');
    if(!this.allowedDraft(rows)||this.expansion&&!this.expansion.ids.includes(row.id)||!this.expansion&&this.dirtyRows().some(r=>r.id!==row.id))return reject('MULTI_ROW_EDIT_UNSUPPORTED');
    let newLineId:string|undefined;for(let i=0;i<8;i++){const id='pm-line-'+crypto.randomUUID();if(!this.reservedIds.has(id)){this.reservedIds.add(id);newLineId=id;break;}}
    if(!newLineId)return reject('ID_RESERVATION_FAILED');
    const from=Math.min(selected.anchor,selected.head),to=Math.max(selected.anchor,selected.head);
    const left={...row,text:row.text.slice(0,from)},right={id:newLineId,mode:row.mode,text:row.text.slice(to)};
    const nextRows=rows.slice();nextRows.splice(index,1,left,right);
    const group=new Set(this.expansion?.ids??[row.id]);group.add(newLineId);
    const expansion={root:this.expansion?.root??row.id,ids:nextRows.filter(r=>group.has(r.id)).map(r=>r.id),mode:row.mode};
    const checked=this.expansionProposal(nextRows,expansion);if(!checked.ok)return reject(checked.reason);
    let start=0,node:PMNode|null=null;this.state.doc.forEach((n,p)=>{if(n.attrs.id===row.id){start=p;node=n;}});
    if(!node)return reject('MISSING_LINE');
    const first=document([left]).firstChild!,second=document([right]).firstChild!;
    const tr=this.state.tr.replaceWith(start,start+(node as PMNode).nodeSize,[first,second]);
    const anchor=start+first.nodeSize+1;tr.setSelection(TextSelection.create(tr.doc,anchor)).scrollIntoView();
    this.enterTransactions.set(tr,{doc:tr.doc,anchor,head:anchor,expansion,before:this.state,epoch:this.epoch,stamp:this.stamp,action:'enter'});
    return{ok:true as const,tr,newLineId};
  }
  /** Exact local Enter inverse only; it cannot delete submitted or saved tasks. */
  private prepareEnterHistory(ticket:Ticket,redo:boolean){
    const reject=(reason:string)=>this.rejected(reason,undefined,false);
    if(this.retired||ticket.ownerId!==this.ownerId||ticket.epoch!==this.epoch)return reject('STALE_TRANSACTION');
    if(this.compositionBinding)return{ok:false as const,reason:'INPUT_NOT_SETTLED'};
    if(this.held||this.busy||this.attempt)return reject(this.held?'PENDING_INPUT':'PENDING_COMMIT');
    const entry=(redo?this.enterRedo:this.enterUndo).at(-1);if(!entry)return{ok:false as const,reason:'NO_LOCAL_ENTER_HISTORY'};
    const source=redo?entry.before:entry.after,target=redo?entry.after:entry.before;
    if(!this.state.doc.eq(source.doc))return reject('ENTER_HISTORY_INPUT_CHANGED');
    const expansion=redo?entry.afterExpansion:entry.beforeExpansion;
    if(expansion){const checked=this.expansionProposal(rowsOf(target.doc),expansion);if(!checked.ok)return reject(checked.reason);}
    const tr=this.state.tr.replaceWith(0,this.state.doc.content.size,target.doc.content);tr.setSelection(TextSelection.create(tr.doc,target.selection.anchor,target.selection.head));
    this.enterTransactions.set(tr,{doc:tr.doc,anchor:target.selection.anchor,head:target.selection.head,expansion,before:this.state,epoch:this.epoch,stamp:this.stamp,action:redo?'redo':'undo',history:entry});
    this.enterHistoryTransactions.add(tr); // Command identity survives successful apply for replay refusal.
    return{ok:true as const,tr};
  }
  prepareEnterUndo(ticket:Ticket){return this.prepareEnterHistory(ticket,false);}
  prepareEnterRedo(ticket:Ticket){return this.prepareEnterHistory(ticket,true);}
  summary(){return{ownerId:this.ownerId,epoch:this.epoch,status:this.status,baselineVersion:this.stamp,dirty:this.dirtyRows().length>0,held:this.held!==null,busy:this.busy,pendingCommit:this.attempt?.phase??null,retired:this.retired,documentId:this.docId,inputSettled:this.compositionBinding===null,composing:this.compositionBinding!==null};}
  persistedProjection(){return this.draft.view();} // Explicit mount/ACK inspection only; never called on each input.
  compositionState(){return{session:{docId:this.docId,ownerId:this.ownerId,generation:0,compositionOwner:this.compositionBinding?clone(this.compositionBinding):null}};}
  compositionAction(a:any):{status:string}{
    const binding=this.compositionBinding;
    if(a.action==='beginComposition'){
      if(this.retired||this.held||binding)return{status:'COMPOSITION_OWNER_HOLD'};
      const id=String(a.target).slice(this.docId.length+1),row=rowsOf(this.state.doc).find(r=>r.id===id);
      if(a.target!==this.docId+'/'+id||!row||row.mode==='opaque')return{status:'READ_ONLY_COMPOSITION_TARGET'};
      this.compositionBinding={docId:this.docId,ownerId:this.ownerId,generation:0,occurrenceId:id};this.compositionEnded=false;this.inputRevision++;return{status:'OBSERVED'};
    }
    if(a.action==='setSelection')return{status:'OBSERVED'}; // Native selection remains PM-owned; no reset here.
    if(!binding||this.retired||this.held||a.target!==this.docId+'/'+binding.occurrenceId)return{status:'STALE_COMPOSITION_OWNER'};
    if(a.action==='compositionEndWithoutFinalInput'){if(!this.compositionEnded)this.inputRevision++;this.compositionEnded=true;return{status:'OBSERVED'};}
    if(a.action!=='finalInput'||!this.compositionEnded||a.ownerId!==this.ownerId||a.generation!==0)return{status:'STALE_COMPOSITION_OWNER'};
    const row=rowsOf(this.state.doc).find(r=>r.id===binding.occurrenceId),selected=lineSelection(this.state.doc,this.state.selection);
    if(!row||row.text!==a.text||!same(selected,a.selection))return{status:'PM_PUBLICATION_MISMATCH'};
    this.compositionBinding=null;this.compositionEnded=false;this.inputRevision++;
    // Settled input may still be an incomplete title. Canonical title validation belongs to save().
    if(/[\r\n]/.test(row.text)||!this.allowedDraft()){this.rejected('FINAL_INPUT_UNSUPPORTED');return{status:'DRAFT_RETAINED'};}
    this.status='COMPOSITION_ACCEPTED';return{status:'ACCEPTED'};
  }
  holdInput(reason:string,inputText:string){const result=this.rejected(reason);this.held!.inputText=inputText;return result;}
  pendingInput(){return this.held?clone(this.held):null;}
  private rejected(reason:string,tr?:Transaction,retain=true){const doc=tr?.doc??this.state.doc,sel=tr?.selection??this.state.selection;let rows:Row[]|null=null;try{rows=rowsOf(doc);}catch{}const held:HeldInput={reason,doc:doc.toJSON(),selection:sel.toJSON(),from:endpoint(doc,sel.anchor),to:endpoint(doc,sel.head),sourceFrom:endpoint(this.state.doc,this.state.selection.anchor),sourceTo:endpoint(this.state.doc,this.state.selection.head),rows};if(retain&&!this.held&&!(tr&&this.enterHistoryTransactions.has(tr))){this.held=clone(held);this.inputRevision++;}this.status=reason;return{ok:false as const,reason,preservedInput:held};}
  apply(tr:Transaction,ticket:Ticket):{ok:true}|{ok:false;reason:string;preservedInput:HeldInput}{
    if(this.retired)return this.rejected('STALE_INPUT_OWNER',tr);
    if(ticket.ownerId!==this.ownerId||ticket.epoch!==this.epoch||!tr.before.eq(this.state.doc))return this.rejected('STALE_TRANSACTION',tr);
    if(this.held)return this.rejected('PENDING_INPUT',tr);
    if(tr.docChanged&&tr.getMeta('composition')!==undefined&&!this.compositionBinding)return this.rejected('UNBOUND_COMPOSITION_INPUT',tr);
    let next:EditorState,rows:Row[];try{next=this.state.apply(tr);rows=rowsOf(next.doc);}catch{return this.rejected('INVALID_PM_PROPOSAL',tr);}
    const before=rowsOf(this.state.doc);
    const enter=this.enterTransactions.get(tr);
    if(enter){
      if(this.compositionBinding)return this.rejected('INPUT_NOT_SETTLED',tr,false);
      if(this.busy||this.attempt)return this.rejected('PENDING_COMMIT',tr);
      if(this.state!==enter.before||this.epoch!==enter.epoch||this.stamp!==enter.stamp)return this.rejected('STALE_ENTER_PROPOSAL',tr);
      if(!next.doc.eq(enter.doc)||next.selection.anchor!==enter.anchor||next.selection.head!==enter.head)return this.rejected('INVALID_ENTER_PROPOSAL',tr);
      if(enter.action==='enter'){this.enterUndo.push({before:this.state,after:next,beforeExpansion:this.expansion,afterExpansion:enter.expansion!});this.enterRedo=[];}
      else if(enter.action==='undo'){if(this.enterUndo.at(-1)!==enter.history)return this.rejected('STALE_ENTER_HISTORY',tr);this.enterUndo.pop();this.enterRedo.push(enter.history!);}
      else{if(this.enterRedo.at(-1)!==enter.history)return this.rejected('STALE_ENTER_HISTORY',tr);this.enterRedo.pop();this.enterUndo.push(enter.history!);}
      this.enterTransactions.delete(tr);this.expansion=enter.expansion;this.state=next;this.epoch++;this.inputRevision++;this.status=enter.action==='enter'?'ENTER_APPLIED':enter.action==='undo'?'ENTER_UNDONE':'ENTER_REDONE';return{ok:true};
    }
    if(rows.length!==before.length||rows.some((r,i)=>r.id!==before[i].id||r.mode!==before[i].mode))return this.rejected('STRUCTURE_OR_ID_UNSUPPORTED',tr);
    const changed=rows.filter((r,i)=>r.text!==before[i].text);
    if(changed.some(r=>r.mode==='opaque'))return this.rejected('OPAQUE_ROW_READ_ONLY',tr);
    if(this.compositionBinding){
      if(changed.some(r=>r.id!==this.compositionBinding!.occurrenceId))return this.rejected('COMPOSITION_TARGET_MISMATCH',tr);
      this.state=next;this.epoch++;this.inputRevision++;this.status='PREEDIT_NOT_SETTLED';return{ok:true};
    }
    if(changed.some(r=>/[\r\n]/.test(r.text)))return this.rejected('MULTILINE_UNSUPPORTED',tr);
    // Keep the exact editable title draft, including temporary empty/edge-space text.
    if(changed.length>1||!this.allowedDraft(rows))return this.rejected('MULTI_ROW_EDIT_UNSUPPORTED',tr);
    this.state=next;this.epoch++;this.inputRevision++;this.status='INPUT_ACCEPTED';return{ok:true};
  }
  private makeProposal(){if(this.expansion)return this.expansionProposal(rowsOf(this.state.doc),this.expansion);const changed=this.dirtyRows();if(!changed.length)return this.draft.prepare();const row=changed[0],source=this.draft.view().documents.find(d=>d.id===this.docId)!.rows.find(r=>r.id===row.id)!;return this.draft.prepare({kind:row.mode==='task-title'?'renameTask':'replaceMemo',documentId:this.docId,lineId:row.id,expectedText:source.raw,...(row.mode==='task-title'?{title:row.text}:{text:row.text})});}
  private async commit(attempt:Attempt){
    this.enterUndo=[];this.enterRedo=[];this.busy=true;attempt.phase='SAVING';try{const result=await this.host.commit(attempt.proposal,attempt.stamp);
      if(result?.ok===false){
        if(result.reason==='INJECTED_FAILURE_BEFORE_COMMIT'){attempt.phase='RETRYABLE';this.status='RETRYABLE_FAILURE';}
        else if(result.reason==='DENIED'||result.reason==='STALE_OR_UNKNOWN_PROPOSAL'||result.reason==='INVALID_PROPOSAL'||result.reason==='HOST_REJECTED_NOT_APPLIED'){this.attempt=null;this.status=result.reason;}
        else{attempt.phase='UNVERIFIED';this.status='UNVERIFIED_COMMIT_RESULT';}
        return{ok:false as const,reason:this.status};
      }
      // Unknown negatives and malformed results can arrive outside the static Host type.
      // Retain the frozen attempt even if current input later equals its old baseline.
      if(result?.ok!==true){attempt.phase='UNVERIFIED';this.status='UNVERIFIED_COMMIT_RESULT';return{ok:false as const,reason:this.status};}
      return this.acceptResult(attempt,result);
    }catch{attempt.phase='UNVERIFIED';this.status='UNVERIFIED_COMMIT_RESULT';return{ok:false as const,reason:this.status};}finally{this.busy=false;}
  }
  private acceptResult(attempt:Attempt,result:Extract<HostCommitResult,{ok:true}>){
      const expectedStamp=attempt.stamp+(attempt.proposal.changed?1:0);
      if(this.retired||this.attempt!==attempt||result.baselineVersion!==expectedStamp||result.status!==(attempt.proposal.changed?'APPLIED':'NO_CHANGE')||!same(result.snapshot,attempt.proposal.snapshot)){attempt.phase='UNVERIFIED';this.status='UNVERIFIED_COMMIT_RESULT';return{ok:false as const,reason:this.status};}
      const next=this.codec.open(result.snapshot);if(!next.ok){attempt.phase='UNVERIFIED';this.status='UNVERIFIED_COMMIT_RESULT';return{ok:false as const,reason:this.status};}
      const rows=projected(next,this.docId),current=rowsOf(this.state.doc);if(rows.length!==current.length||rows.some((r,i)=>r.id!==current[i].id||r.mode!==current[i].mode)){attempt.phase='UNVERIFIED';this.status='UNVERIFIED_COMMIT_RESULT';return{ok:false as const,reason:this.status};}
      // ACK updates only the persisted baseline. PM state, selection, epoch and held input stay owned here.
      this.baseline=clone(result.snapshot);collectReserved(this.baseline,this.reservedIds);this.draft=next;this.baselineRows=rows;this.stamp=result.baselineVersion;this.attempt=null;this.expansion=null;this.status='COMMIT_CONFIRMED';return{ok:true as const};
  }
  /** Only the matching host adapter may supply a receipt/readback-verified late result. */
  acceptHostConfirmation(result:Extract<HostCommitResult,{ok:true}>){
    if(this.busy||!this.attempt||this.attempt.phase!=='UNVERIFIED')return false;
    return this.acceptResult(this.attempt,result).ok;
  }
  /** A clean sibling's save may advance the full workspace. Keep this exact PM
   * state only when its complete projected document (including metadata) is unchanged. */
  acceptUnchangedDocumentBaseline(read:HostRead){
    if(this.retired||this.busy||this.attempt||this.held||this.compositionBinding||this.dirtyRows().length||read.baselineVersion!==this.stamp+1)return false;
    const next=this.codec.open(read.snapshot);if(!next.ok)return false;
    const beforeDoc=this.draft.view().documents.find(d=>d.id===this.docId),afterDoc=next.view().documents.find(d=>d.id===this.docId);
    if(!beforeDoc||!afterDoc||!same(beforeDoc,afterDoc))return false;
    this.baseline=clone(read.snapshot);collectReserved(this.baseline,this.reservedIds);this.draft=next;this.stamp=read.baselineVersion;this.baselineRows=projected(next,this.docId);this.status='UNCHANGED_DOCUMENT_REBASED';return true;
  }
  inputCapture(){
    const live=rowsOf(this.state.doc),baseline=this.baseline as {documents:{id:string;lines:{id:string;text:string}[]}[];flows:{id:string;lines:{id:string;text:string}[]}[]};
    const source=[...baseline.documents,...baseline.flows].find(d=>d.id===this.docId)!;
    const byId=new Map(source.lines.map(line=>[line.id,line]));
    const raw=live.map(row=>{const original=byId.get(row.id)!;
      if(row.mode!=='task-title')return row.text;
      if(!original)return this.expansion?.mode==='task-title'&&this.expansion.ids.includes(row.id)?'- [ ] '+row.text:row.text;
      const frame=/^( *-\s+\[)([^\]\r\n]*)(\](?:\s+|$))(.*?)(\s*)$/.exec(original.text);
      return frame?frame[1]+frame[2]+frame[3]+row.text+frame[5]:original.text;
    }).join('\n');
    // Existing recovery creates a new RAW document, not this typed owner or selection.
    const pending=this.dirtyRows().length>0||!!this.held||!!this.attempt||this.busy||!!this.compositionBinding;
    return{raw,complete:!pending,pending};
  }
  async save(){
    if(this.retired)return{ok:false,reason:'STALE_INPUT_OWNER'};
    if(this.compositionBinding)return{ok:false,reason:'INPUT_NOT_SETTLED'};
    if(this.busy||this.attempt)return{ok:false,reason:'PENDING_COMMIT'};
    if(this.held)return{ok:false,reason:'PENDING_INPUT'};
    // A late ACK may rebase two locally changed rows. Never silently save only the first.
    if(!this.allowedDraft())return this.rejected('MULTI_ROW_EDIT_UNSUPPORTED');
    const proposal=this.makeProposal();
    if(!proposal.ok){
      // Invalid canonical titles are correctable drafts, not structural/owner holds.
      if(proposal.reason==='TITLE_UNSUPPORTED')this.status=proposal.reason;
      else this.rejected(proposal.reason);
      return{ok:false,reason:proposal.reason,preservedInput:proposal.preservedInput};
    }
    const attempt:Attempt={proposal,stamp:this.stamp,phase:'SAVING',rows:rowsOf(this.state.doc)};
    this.attempt=attempt;return this.commit(attempt);
  }
  /** Explicit dated command only. UI gesture/panel integration is deliberately separate. */
  async recordProgress(lineId:string,date:string,percent:number,correctionAsOfDate?:string){
    if(this.retired)return{ok:false,reason:'STALE_INPUT_OWNER'};
    if(this.compositionBinding)return{ok:false,reason:'INPUT_NOT_SETTLED'};
    if(this.busy||this.attempt)return{ok:false,reason:'PENDING_COMMIT'};
    if(this.held||this.dirtyRows().length)return{ok:false,reason:'INPUT_OWNER_HOLD'};
    const row=this.draft.view().documents.find(d=>d.id===this.docId)?.rows.find(r=>r.id===lineId);
    if(!row)return{ok:false,reason:'MISSING_TASK'};
    const proposal=this.draft.prepare({kind:'recordProgress',documentId:this.docId,lineId,expectedText:row.raw,date,percent,...(correctionAsOfDate===undefined?{}:{correctionAsOfDate})});
    if(!proposal.ok)return{ok:false,reason:proposal.reason};
    this.inputRevision++;
    const attempt:Attempt={proposal,stamp:this.stamp,phase:'SAVING'};this.attempt=attempt;return this.commit(attempt);
  }
  async retry(){if(this.retired)return{ok:false,reason:'STALE_INPUT_OWNER'};if(this.compositionBinding)return{ok:false,reason:'INPUT_NOT_SETTLED'};if(this.busy||this.attempt?.phase!=='RETRYABLE')return{ok:false,reason:'NO_RETRYABLE_COMMIT'};return this.commit(this.attempt);}
  reopen(docId=this.docId):{ok:true;session:PmCodecSession}|{ok:false;reason:string;preservedSnapshot?:unknown}{
    if(this.retired||this.busy||this.attempt||this.held||this.compositionBinding||this.dirtyRows().length)return{ok:false,reason:'INPUT_OWNER_HOLD'};
    const state=this.state,stamp=this.stamp,baseline=this.baseline;
    const next=PmCodecSession.open(this.codec,this.host,docId);if(!next.ok)return next;
    if(this.retired||this.busy||this.attempt||this.held||this.compositionBinding||this.state!==state||this.stamp!==stamp||this.baseline!==baseline||this.dirtyRows().length)return{ok:false,reason:'INPUT_OWNER_CHANGED_DURING_OPEN'};
    if(next.session.stamp<this.stamp||next.session.stamp===this.stamp&&!same(next.session.baseline,this.baseline))return{ok:false,reason:'STALE_HOST_READ'};
    if(docId===this.docId){try{const a=endpoint(this.state.doc,this.state.selection.anchor),h=endpoint(this.state.doc,this.state.selection.head);next.session.state=next.session.state.apply(next.session.state.tr.setSelection(TextSelection.create(next.session.state.doc,position(next.session.state.doc,a),position(next.session.state.doc,h))));}catch{return{ok:false,reason:'SELECTION_UNMAPPABLE'};}}
    for(const id of this.reservedIds)next.session.reservedIds.add(id);this.retired=true;return next;
  }
}
