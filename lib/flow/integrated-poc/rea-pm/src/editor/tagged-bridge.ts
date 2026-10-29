import {DOMParser,type Fragment} from 'prosemirror-model';
import {TextSelection,type Transaction} from 'prosemirror-state';
import {EditorView,type NodeView} from 'prosemirror-view';
import {canonicalJson} from '../../../alpha-persistence/json';
import type {TaggedSession,AppendRequest} from '../tagged-session';
import {taggedSchema,taggedLogical,taggedLocate,fromTaggedPM} from '../tagged-pm-schema';
import {createCompositionSession,type CompositionBinding,type PublishedComposition} from './composition-session';
import {createTaggedEnterHandlers} from './tagged-enter';
import {installTaggedClipboardAdapter} from './tagged-clipboard';
import {TAGGED_ACTION_BOUNDARY} from '../tagged-history';

const parser=new DOMParser(taggedSchema,[{tag:'br.ProseMirror-trailingBreak',ignore:true},{tag:'img.ProseMirror-separator',ignore:true},...DOMParser.fromSchema(taggedSchema).rules]);
const same=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b);
export function taggedNativeSelectionMatches(view:Pick<EditorView,'hasFocus'|'dom'|'state'|'posAtDOM'>){
  if(!view.hasFocus())return true;
  try{const native=view.dom.ownerDocument.getSelection();return!!native?.anchorNode&&!!native.focusNode&&view.dom.contains(native.anchorNode)&&view.dom.contains(native.focusNode)&&view.posAtDOM(native.anchorNode,native.anchorOffset,1)===view.state.selection.anchor&&view.posAtDOM(native.focusNode,native.focusOffset,1)===view.state.selection.head;}catch{return false;}
}
// A late Enter fallback after blur must not edit an inactive view. Composition
// publication can still settle after blur when its exact owner/DOM match holds.
export function taggedEnterSelectionReady(view:Pick<EditorView,'hasFocus'|'dom'|'state'|'posAtDOM'>){return view.hasFocus()&&taggedNativeSelectionMatches(view);}
export function taggedPublishedComposition(view:EditorView,session:TaggedSession,binding:CompositionBinding,readContent?:(content:HTMLElement,node:any)=>Fragment):PublishedComposition|null {
  try{
    const current=session.compositionState().session;
    if(view.isDestroyed||view.state!==session.state||!same(current.compositionOwner,binding)||current.docId!==binding.docId||current.ownerId!==binding.ownerId||current.generation!==binding.generation||!taggedNativeSelectionMatches(view))return null;
    const selection=taggedLogical(view.state.doc,view.state.selection);if(!selection||selection.occurrenceId!==binding.occurrenceId)return null;
    const row=taggedLocate(view.state.doc,binding.occurrenceId),dom=view.nodeDOM(row.start);if(!dom||dom.nodeType!==1)return null;
    const content=Array.from((dom as HTMLElement).children).find(e=>e.classList.contains('occurrence-content')) as HTMLElement|undefined;if(!content)return null;
    const parsed=readContent?readContent(content,row.node):parser.parse(content,{topNode:row.node.type.create(row.node.attrs),preserveWhitespace:'full'}).content;
    if(!parsed.eq(row.node.content))return null;
    return{binding:{...binding},text:fromTaggedPM(view.state.doc).blocks[binding.occurrenceId].text,selection};
  }catch{return null;}
}
function nativeTarget(view:EditorView){
  try{const native=view.dom.ownerDocument.getSelection(),focus=native?.focusNode;if(focus&&view.dom.contains(focus)){const el=focus.nodeType===1?focus as Element:focus.parentElement,row=el?.closest('[data-oid]'),id=row?.getAttribute('data-oid');if(id&&view.nodeDOM(taggedLocate(view.state.doc,id).start)===row)return id;}return taggedLogical(view.state.doc,view.state.selection)?.occurrenceId??null;}catch{return null;}
}
function nativeSelection(view:EditorView){
  try{const n=view.dom.ownerDocument.getSelection();if(!n?.anchorNode||!n.focusNode||!view.dom.contains(n.anchorNode)||!view.dom.contains(n.focusNode))return null;return taggedLogical(view.state.doc,TextSelection.create(view.state.doc,view.posAtDOM(n.anchorNode,n.anchorOffset,1),view.posAtDOM(n.focusNode,n.focusOffset,1)));}catch{return null;}
}
export function publishTaggedInput(view:Pick<EditorView,'state'|'updateState'>,session:TaggedSession,tr:Transaction){
  if(view.state!==session.state)return session.retainInputIntent('INPUT_OWNER_MISMATCH',tr);
  // A paste is one explicit user action, separate from adjacent typing on both sides.
  if(tr.getMeta('paste')===true&&tr.getMeta('uiEvent')==='paste')tr.setMeta(TAGGED_ACTION_BOUNDARY,true);
  const result=session.apply(tr);if(result.ok)view.updateState(session.state);return result;
}
/** Publish accepted progress/history plugin state without replacing doc/selection or touching IME DOM. */
export function publishTaggedMetadata(view:Pick<EditorView,'state'|'updateState'|'composing'>,session:TaggedSession){
  if(view.state===session.state)return true;
  if(view.composing||session.diagnostics().composing||session.rejectedIntent()||!view.state.doc.eq(session.state.doc)||!view.state.selection.eq(session.state.selection))return false;
  view.updateState(session.state);return true;
}
type ActionView=Pick<EditorView,'state'|'updateState'|'composing'|'isDestroyed'|'editable'|'focus'>;
type InputActionPorts={currentSession():TaggedSession|null;currentView():ActionView|null;held():boolean;selectionReady(view:ActionView):boolean;focusAllowed():boolean;changed(status:string):void};
/** Explicit same-owner toolbar commands. appendItem already applied its PM event:
 * publish that state once, never dispatch the creation transaction again. */
export function createTaggedInputActions(ports:InputActionPorts){
 const tickets=new WeakMap<object,{session:TaggedSession;view:ActionView;state:ActionView['state'];request:AppendRequest;applied:Extract<ReturnType<TaggedSession['appendItem']>,{ok:true}>|null}>();
 const fail=(reason:string)=>({ok:false as const,reason});
 function ready(session:TaggedSession|null,view:ActionView|null){
  if(!session||!view||ports.currentSession()!==session||ports.currentView()!==view||view.isDestroyed||session.diagnostics().closed)return 'INPUT_OWNER_MISMATCH';
  if(view.state!==session.state)return 'INPUT_PUBLICATION_NOT_CURRENT';
  if(!view.editable)return 'INPUT_READONLY';
  if(view.composing||session.diagnostics().composing)return 'INPUT_NOT_SETTLED';
  if(session.rejectedIntent())return 'UNSUPPORTED_INPUT_INTENT_HOLD';
  if(ports.held())return 'PANEL_OR_OWNER_HOLD';
  if(!ports.selectionReady(view))return 'NATIVE_SELECTION_NOT_PUBLISHED';
  if(ports.currentSession()!==session||ports.currentView()!==view||view.isDestroyed||session.diagnostics().closed||view.state!==session.state)return 'INPUT_OWNER_MISMATCH';
  return null;
 }
 function published(session:TaggedSession,view:ActionView,status:string){
  if(ports.currentSession()!==session||ports.currentView()!==view||view.isDestroyed)return fail('INPUT_OWNER_CHANGED_AFTER_PUBLICATION');
  ports.changed(status);
  // changed/checkpoint callbacks may replace or retire this owner. Focus is a
  // separate, synchronous capability, not an effect of a later save receipt.
  const focus=ports.currentSession()===session&&ports.currentView()===view&&!view.isDestroyed&&!ports.held()&&!session.diagnostics().closed&&!view.composing&&!session.diagnostics().composing&&ports.focusAllowed();
  if(focus&&ports.currentSession()===session&&ports.currentView()===view&&view.state===session.state&&!view.isDestroyed&&!session.diagnostics().closed)view.focus();
  return{ok:true as const};
 }
 return{
  prepareAppend(value:Pick<AppendRequest,'requestId'|'occurrenceId'|'kind'|'text'|'afterOccurrenceId'>){
   const session=ports.currentSession(),view=ports.currentView(),blocked=ready(session,view);if(blocked||!session||!view)return fail(blocked??'INPUT_OWNER_MISMATCH');
   const stamp=session.submissionStamp(),ticket=Object.freeze({});
   tickets.set(ticket,{session,view,state:session.state,request:{...value,inputOwnerId:session.inputOwnerId,docId:session.docId,expectedInputRevision:stamp.inputRevision,expectedSemanticRevision:stamp.semanticRevision,expectedCompositionEpoch:stamp.compositionEpoch},applied:null});
   return{ok:true as const,ticket};
  },
  append(ticket:object){
   const saved=tickets.get(ticket);if(!saved)return fail('UNKNOWN_APPEND_INTENT');
   const {session,view}=saved,blocked=ready(session,view);if(blocked)return fail(blocked);
   if(saved.applied)return{...saved.applied,status:'DUPLICATE' as const,published:false as const};
   if(session.state!==saved.state)return fail('STALE_APPEND_INTENT');
   const result=session.appendItem(saved.request);if(!result.ok)return result;saved.applied=result;
   if(result.status==='DUPLICATE')return{...result,published:false as const};
   try{view.updateState(session.state);}catch{return fail('APPEND_APPLIED_PUBLICATION_HELD');}
   if(view.state!==session.state)return fail('APPEND_APPLIED_PUBLICATION_HELD');
   const notified=published(session,view,'EXPLICIT_APPEND_APPLIED');return notified.ok?{...result,published:true as const}:notified;
  },

  confirm(occurrenceId:string,kind:'task'|'schedule',explicit:{plannedDate:string|null;commandToken:string},requestId:string){
   const session=ports.currentSession(),view=ports.currentView(),blocked=ready(session,view);if(blocked||!session||!view)return fail(blocked??'INPUT_OWNER_MISMATCH');
   const block=session.pendingBody().blocks[occurrenceId];if(!block)return fail('MISSING_TARGET');
   const prepared=session.prepareConfirmation({requestId,inputOwnerId:session.inputOwnerId,docId:session.docId,occurrenceId,kind,expectedText:block.text,expectedRevision:session.diagnostics().revision,explicit});
   if(!prepared.ok||prepared.status==='DUPLICATE')return prepared;
   const result=session.commitConfirmation(prepared.token);if(!result.ok)return result;view.updateState(session.state);return published(session,view,'EXPLICIT_CONFIRMATION_APPLIED');
  },
  draft(occurrenceId:string,draft:Parameters<TaggedSession['setDraft']>[2],requestId:string){
   const session=ports.currentSession(),view=ports.currentView(),blocked=ready(session,view);if(blocked||!session||!view)return fail(blocked??'INPUT_OWNER_MISMATCH');
   const result=session.setDraft(requestId,occurrenceId,draft,session.diagnostics().revision);if(!result.ok)return result;view.updateState(session.state);return published(session,view,'EXPLICIT_DRAFT_APPLIED');
  },
  history(direction:'undo'|'redo'){

   const session=ports.currentSession(),view=ports.currentView(),blocked=ready(session,view);if(blocked||!session||!view)return fail(blocked??'INPUT_OWNER_MISMATCH');
   const prepared=session.prepareHistory(direction);if(!prepared.ok)return prepared;
   const result=publishTaggedInput(view,session,prepared.tr);if(!result.ok)return result;
   return published(session,view,direction==='undo'?'LOCAL_UNDO_APPLIED':'LOCAL_REDO_APPLIED');
  },
 };
}
export type TaggedProgressOpen=(target:NonNullable<ReturnType<TaggedSession['progressTarget']>>)=>void;
/** The same handler is used by the optional marker. Dirty text is not a disabled condition. */
export function requestTaggedProgress(view:Pick<EditorView,'state'>,session:TaggedSession,occurrenceId:string,open:TaggedProgressOpen){
  if(view.state!==session.state)return{ok:false as const,reason:'INPUT_OWNER_MISMATCH'};
  const target=session.progressTarget(occurrenceId);
  if(!target||!target.enabled)return{ok:false as const,reason:'PROGRESS_OWNER_HOLD'};
  open(target);return{ok:true as const};
}
/** Optional local progress request port only. No real save/host or ProgramSpace activation. */
export class TaggedEnterEditor {
  readonly view:EditorView;
  private lifecycle?:ReturnType<typeof createCompositionSession>;
  private enter:ReturnType<typeof createTaggedEnterHandlers>;
  private clipboard?:ReturnType<typeof installTaggedClipboardAdapter>;
  private progressPaint=new Set<()=>void>();
  constructor(place:HTMLElement,readonly session:TaggedSession,private changed:(status:string)=>void=()=>{},private openProgress?:TaggedProgressOpen,private toggleProgress?:(target:Parameters<TaggedProgressOpen>[0],pointer:boolean)=>void){
    this.enter=createTaggedEnterHandlers(session,changed,view=>taggedEnterSelectionReady(view as EditorView));
    this.view=new EditorView(place,{state:session.state,attributes:{role:'textbox','aria-label':'합성 typed Enter 편집기 · 저장 미지원','aria-multiline':'true'},editable:()=>!session.diagnostics().closed,
      nodeViews:{occurrence:node=>this.row(node)},dispatchTransaction:tr=>{const result=publishTaggedInput(this.view,session,tr);this.changed(result.ok?'INPUT_APPLIED':result.reason);this.lifecycle?.published();this.refreshProgress();},
      handleKeyDown:(view,event)=>this.enter.handleKeyDown(view,event),
      handlePaste:(_view,event)=>{const text=event.clipboardData?.getData('text/plain');session.retainInputIntent('PASTE_NOT_CONNECTED_IN_ENTER_CANDIDATE',session.state.tr,text);this.changed('PASTE_NOT_CONNECTED_IN_ENTER_CANDIDATE');return true;},
      handleDrop:()=>{this.changed('DROP_NOT_CONNECTED');return true;},
      handleDOMEvents:{keydown:(view,event)=>this.enter.observeKeyDown(view,event),beforeinput:(view,event)=>this.enter.beforeInput(view,event as InputEvent),
        compositionstart:()=>{this.lifecycle?.start();this.refreshProgress();return false;},compositionend:()=>{this.lifecycle?.end();this.refreshProgress();return false;},input:(_view,event)=>{const e=event as InputEvent;this.lifecycle?.nativeInput(e.inputType,e.isComposing);return false;}}
    });
    const win=this.view.dom.ownerDocument.defaultView!;
    this.lifecycle=createCompositionSession({getState:()=>session.compositionState(),dispatch:action=>session.compositionAction(action)},{target:()=>nativeTarget(this.view),initialSelection:()=>nativeSelection(this.view),composing:()=>this.view.composing,published:binding=>taggedPublishedComposition(this.view,session,binding),requestFrame:cb=>win.requestAnimationFrame(cb),cancelFrame:id=>win.cancelAnimationFrame(id),notice:status=>{changed(status);this.refreshProgress();}});
    try{this.clipboard=installTaggedClipboardAdapter(this.view,session,changed,view=>taggedEnterSelectionReady(view as EditorView));}
    catch(error){this.destroy();throw error;}
  }
  private row(initial:any):NodeView {
    let node=initial;const doc=this.view?.dom.ownerDocument??document,dom=doc.createElement('div');dom.className='occurrence';dom.dataset.oid=node.attrs.oid;dom.dataset.kind=node.attrs.kind;
    if(node.attrs.kind==='folderLink'){dom.contentEditable='false';dom.textContent=node.textContent;return{dom,update:next=>{if(next.type!==node.type||!same(next.attrs,node.attrs)||!next.content.eq(node.content))return false;node=next;return true;}};}
    let button:HTMLButtonElement|null=null;
    const paint=()=>{if(!button)return;const target=this.session.progressMarker(node.attrs.oid),disabled=!target?.enabled,text=target?`${target.percent}%`:'진행',label=target?`진행 ${target.percent}% 수정`:'진행 수정 불가';if(target&&[0,100].includes(target.percent)){button.setAttribute('role','checkbox');button.setAttribute('aria-checked',String(target.percent===100));button.setAttribute('title','완료 상태 바꾸기');}else{button.removeAttribute('role');button.removeAttribute('aria-checked');}if(button.disabled!==disabled)button.disabled=disabled;if(button.textContent!==text)button.textContent=text;if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);};
    if(node.attrs.kind==='task'&&this.openProgress){button=doc.createElement('button');button.type='button';button.contentEditable='false';button.className='occurrence-progress';button.dataset.oid=node.attrs.oid;button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',event=>{const target=this.session.progressTarget(node.attrs.oid);if(target?.enabled&&this.toggleProgress&&[0,100].includes(target.percent)){this.toggleProgress(target,event.detail>0);return;}const result=requestTaggedProgress(this.view,this.session,node.attrs.oid,this.openProgress!);if(!result.ok)this.changed(result.reason);});dom.append(button);this.progressPaint.add(paint);paint();}
    let dateLabel:HTMLElement|null=null;
    if(node.attrs.kind==='schedule'){dateLabel=doc.createElement('time');dateLabel.contentEditable='false';dateLabel.textContent=this.session.scheduleMarker(node.attrs.oid);dateLabel.setAttribute('aria-label','일정 날짜');dom.append(dateLabel);}
    const content=doc.createElement('div');content.className='occurrence-content';dom.append(content);
    return{dom,contentDOM:content,stopEvent:event=>!!button&&event.target instanceof doc.defaultView!.Node&&button.contains(event.target),ignoreMutation:mutation=>!!button&&button.contains(mutation.target)||!!dateLabel&&dateLabel.contains(mutation.target),update:next=>{if(next.type!==node.type||next.attrs.oid!==node.attrs.oid||next.attrs.kind!==node.attrs.kind)return false;node=next;paint();return true;},destroy:()=>{this.progressPaint.delete(paint);}};
  }
  refreshProgress(){publishTaggedMetadata(this.view,this.session);for(const paint of this.progressPaint)paint();}
  snapshot(){return{writeAllowed:false as const,summary:this.session.diagnostics(),history:this.session.historyState(),pmOwnerSame:this.view.state===this.session.state,body:this.session.pendingBody(),selection:taggedLogical(this.view.state.doc,this.view.state.selection),pendingIntent:this.session.rejectedIntent(),compositionLifecycle:this.lifecycle?.trace()??[]};}
  destroy(){this.clipboard?.destroy();this.enter.destroy();this.lifecycle?.destroy();this.view.destroy();}
}
