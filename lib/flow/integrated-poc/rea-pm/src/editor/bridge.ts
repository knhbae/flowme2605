import {Decoration,DecorationSet,EditorView,type NodeView} from 'prosemirror-view';
import {AllSelection,TextSelection,type Selection,type EditorState,type Transaction} from 'prosemirror-state';
import type {Line} from '../../codec.cjs';
import {PmCodecSession} from '../pm-codec-session';
import {installComposition} from './composition-ports';
import {installViewportSelectionReveal} from './viewport-selection';
import {ProgressMetadata} from './progress-controls';
import {createNormalEnterHandlers,createEnterHistoryHandlers,normalEnterSelectionMatches,UNSUPPORTED_HISTORY} from './normal-enter';

export function publishInput(view:Pick<EditorView,'state'|'updateState'>,session:PmCodecSession,tr:Transaction){
 if(view.state!==session.view().state){session.holdInput('INPUT_OWNER_MISMATCH',tr.doc.textContent);return{ok:false as const,reason:'INPUT_OWNER_MISMATCH'};}
 const result=session.apply(tr,session.view().ticket);if(result.ok)view.updateState(session.view().state);return result;
}
export function syncHeldReadOnly(view:Pick<EditorView,'composing'|'setProps'>,session:PmCodecSession){if(view.composing||!session.summary().held)return false;view.setProps({editable:()=>false});return true;}

/** Exact display-only framing. PM still owns every original UTF-16 code unit. */
function syntaxRanges(meta:Line|null|undefined,raw:string):[number,number][]|null{
 const p=meta?.semantic?.presentation;if(!p||meta!.raw!==raw||!Number.isSafeInteger(p.bodyFrom)||!Number.isSafeInteger(p.bodyTo)||p.bodyFrom<0||p.bodyFrom>=p.bodyTo||p.bodyTo>raw.length)return null;
 return [[0,p.bodyFrom],[p.bodyTo,raw.length]].filter(([from,to])=>to>from) as [number,number][];
}
function canonicalChildren(content:Element,node:any,meta:Line|undefined){
 const flat=(n:ChildNode)=>n.nodeType===3||n.nodeType===1&&(n as Element).matches('br.ProseMirror-trailingBreak');
 const expected=node.attrs.mode==='opaque'?syntaxRanges(meta,node.textContent):null;
 if(!expected)return Array.from(content.childNodes).every(flat);
 let offset=0;const found:[number,number][]=[];
 for(const child of Array.from(content.childNodes)){
  const text=child.textContent??'',end=offset+text.length;
  if(child.nodeType!==3){
   if(child.nodeType!==1)return false;const span=child as Element;
   if(span.tagName!=='SPAN'||span.className!=='readonly-syntax-token'||span.getAttribute('hidden')!==''||span.getAttribute('aria-hidden')!=='true'||span.getAttribute('data-raw-from')!==String(offset)||span.getAttribute('data-raw-to')!==String(end)||span.attributes.length!==5||Array.from(span.childNodes).some(n=>n.nodeType!==3)||!expected.some(([from,to])=>from===offset&&to===end))return false;
   found.push([offset,end]);
  }
  offset=end;
 }
 return offset===node.textContent.length&&found.length===expected.length&&found.every(([from,to],i)=>from===expected[i][0]&&to===expected[i][1]);
}
function canonicalContents(view:Pick<EditorView,'state'|'dom'>,metadata:Map<string,Line>){
 const rows=Array.from(view.dom.children),contents:Element[]=[];
 if(rows.length!==view.state.doc.childCount)return null;
 for(let i=0;i<rows.length;i++){
  const row=rows[i],node=view.state.doc.child(i),found=row.querySelectorAll(':scope > .occurrence-content');
  if(!row.matches('.occurrence[data-line-id]')||row.getAttribute('data-line-id')!==node.attrs.id||row.getAttribute('data-mode')!==node.attrs.mode||found.length!==1||found[0].textContent!==node.textContent||!canonicalChildren(found[0],node,metadata.get(node.attrs.id)))return null;
  contents.push(found[0]);
 }
 return contents;
}

/** A native selectionchange may arrive after keydown. Publish only the exact
 * owned DOM selection, never pending DOM input or a corrected/nearby position. */
function publishNativeEnterSelection(view:Pick<EditorView,'state'|'dispatch'|'hasFocus'|'dom'|'posAtDOM'>,session:PmCodecSession){
 try{
  if(!view.hasFocus())return false;
  const native=view.dom.ownerDocument.getSelection(),before=view.state;
  if(!native?.anchorNode||!native.focusNode||!view.dom.contains(native.anchorNode)||!view.dom.contains(native.focusNode))return false;
  const source=session.persistedProjection().documents.find(d=>d.id===session.summary().documentId),contents=canonicalContents(view,new Map(source?.rows.map(row=>[row.id,row])));
  if(!contents)return false; // Never overwrite an unpublished edit in any row.
  const endpoint=(node:Node,offset:number)=>{
   const content=contents.find(c=>c===node||c.contains(node));if(!content)return null;
   const index=contents.indexOf(content),line=before.doc.child(index);if(line.attrs.mode!=='memo'&&line.attrs.mode!=='task-title')return null;
   const pos=view.posAtDOM(node,offset,1);if(!Number.isSafeInteger(pos)||pos<0||pos>before.doc.content.size)return null;
   const resolved=before.doc.resolve(pos);if(resolved.depth!==1||!resolved.parent.inlineContent||resolved.parent.attrs.id!==line.attrs.id)return null;
   const range=view.dom.ownerDocument.createRange();range.selectNodeContents(content);range.setEnd(node,offset);
   return range.toString().length===resolved.parentOffset?pos:null;
  };
  const anchor=endpoint(native.anchorNode,native.anchorOffset),head=endpoint(native.focusNode,native.focusOffset);
  if(anchor===null||head===null||!before.doc.resolve(anchor).sameParent(before.doc.resolve(head)))return false;
  const selection=TextSelection.create(before.doc,anchor,head);if(selection.eq(before.selection))return true;
  const tr=before.tr.setSelection(selection);if(tr.docChanged||tr.steps.length||!tr.doc.eq(before.doc))return false;
  view.dispatch(tr); // Existing publishInput -> session.apply -> view.updateState.
  return view.state===session.view().state&&view.state.doc.eq(before.doc)&&view.state.selection.eq(selection)&&!session.summary().held;
 }catch{return false;}
}

/** Core prepares one reserved-ID command. Publish it once through the existing input owner. */
export function publishNormalEnter(view:Pick<EditorView,'state'|'dispatch'|'composing'|'hasFocus'|'dom'|'posAtDOM'>,session:PmCodecSession,locked=false){
 const s=session.summary();
 if(view.composing||!s.inputSettled)return{ok:false as const,reason:'INPUT_NOT_SETTLED'};
 if(locked||s.retired||s.held||s.busy||s.pendingCommit)return{ok:false as const,reason:locked?'EDITOR_LOCKED':s.retired?'STALE_INPUT_OWNER':s.held?'PENDING_INPUT':'PENDING_COMMIT'};
 // Do not call holdInput while already held: it would replace the first inputText.
 if(view.state!==session.view().state)return session.holdInput('INPUT_OWNER_MISMATCH','\n');
 if(!normalEnterSelectionMatches(view))publishNativeEnterSelection(view,session);
 if(!normalEnterSelectionMatches(view))return session.holdInput('NATIVE_SELECTION_NOT_PUBLISHED','\n');
 const prepared=session.prepareEnter(session.view().ticket);if(!prepared.ok)return prepared;
 const before=view.state;view.dispatch(prepared.tr);
 const accepted=view.state===session.view().state&&view.state!==before&&view.state.doc.eq(prepared.tr.doc)&&view.state.selection.eq(prepared.tr.selection)&&!session.summary().held;
 return accepted?{ok:true as const}:{ok:false as const,reason:'ENTER_PUBLICATION_HOLD'};
}

/** Exact, unsaved Enter inverse only. Core owns the before-state, IDs and history proof. */
export function publishEnterHistory(view:Pick<EditorView,'state'|'dispatch'|'composing'|'hasFocus'|'dom'|'posAtDOM'>,session:PmCodecSession,direction:'undo'|'redo',locked=false){
 const s=session.summary();
 if(view.composing||!s.inputSettled)return{ok:false as const,reason:'INPUT_NOT_SETTLED'};
 if(locked||s.retired||s.held||s.busy||s.pendingCommit)return{ok:false as const,reason:locked?'EDITOR_LOCKED':s.retired?'STALE_INPUT_OWNER':s.held?'PENDING_INPUT':'PENDING_COMMIT'};
 if(view.state!==session.view().state||!normalEnterSelectionMatches(view))return{ok:false as const,reason:'NATIVE_SELECTION_NOT_PUBLISHED'};
 const ticket=session.view().ticket,prepared=direction==='undo'?session.prepareEnterUndo(ticket):session.prepareEnterRedo(ticket);if(!prepared.ok)return prepared;
 const before=view.state;view.dispatch(prepared.tr);
 const accepted=view.state===session.view().state&&view.state!==before&&view.state.doc.eq(prepared.tr.doc)&&view.state.selection.eq(prepared.tr.selection)&&!session.summary().held;
 return accepted?{ok:true as const}:{ok:false as const,reason:'ENTER_HISTORY_PUBLICATION_HOLD'};
}

/** PM session owns the only live EditorState. This bridge never maintains a second raw/domain document. */
export class CodecEditor {
 readonly view:EditorView;private lifecycle?:ReturnType<typeof installComposition>;private reveal?:ReturnType<typeof installViewportSelectionReveal>;private last='READY';private readOnlyApplied=false;private endFrame:number|null=null;private lockRequested=false;private locked=false;
 private metadata:ProgressMetadata;private readonlyRows=new Map<string,Line>();private normalEnter?:ReturnType<typeof createNormalEnterHandlers>;private enterHistory?:ReturnType<typeof createEnterHistoryHandlers>;
 private mouseIntent:{id:number;target:EventTarget|null;x:number;y:number;at:number}|null=null;
 private mouseSelection:{id:number;owner:string;baseline:number;expected:EditorState;doc:EditorState['doc'];anchor:number}|null=null;
 private cancelMouse=()=>{this.mouseIntent=null;const current=this.mouseSelection;this.mouseSelection=null;if(current)try{if(this.view.dom.hasPointerCapture(current.id))this.view.dom.releasePointerCapture(current.id);}catch{}};
 private selectionReady(expected:EditorState,requireFocus=true){const s=this.session.summary();return(!requireFocus||this.view.hasFocus())&&!this.lockRequested&&!this.locked&&!this.view.composing&&s.inputSettled&&!s.composing&&!s.held&&!s.retired&&!s.busy&&!s.pendingCommit&&this.view.state===expected&&this.session.view().state===expected&&!!canonicalContents(this.view,this.readonlyRows);}
 private publishSelection(selection:Selection,expected:EditorState){
  if(!this.selectionReady(expected))return false;
  if(selection.eq(expected.selection))return true;
  const tr=expected.tr.setSelection(selection);if(tr.docChanged||tr.steps.length||!tr.doc.eq(expected.doc))return false;
  this.view.dispatch(tr);
  return this.view.state===this.session.view().state&&this.view.state.doc.eq(expected.doc)&&this.view.state.selection.eq(selection)&&!this.session.summary().held;
 }
 private pointerPosition(x:number,y:number,readonlyStart=false){
  const hit=this.view.dom.ownerDocument.elementFromPoint(x,y);if(!hit||hit.closest('.marker,button,input,select,textarea,a,[role="button"]'))return null;
  const content=hit.closest('.occurrence-content'),row=content?.parentElement;if(!content||!row||row.parentElement!==this.view.dom||!row.matches('.occurrence[data-line-id]')||(readonlyStart&&row.getAttribute('data-mode')!=='opaque'))return null;
  const point=this.view.posAtCoords({left:x,top:y});if(!point)return null;const resolved=this.view.state.doc.resolve(point.pos);
  return resolved.depth===1&&resolved.parent.inlineContent&&resolved.parent.attrs.id===row.getAttribute('data-line-id')?point.pos:null;
 }
 private pointerDown(event:PointerEvent){
  this.cancelMouse();
  if(event.isTrusted&&event.pointerType==='mouse'&&event.isPrimary&&event.button===0&&event.buttons===1&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey)this.mouseIntent={id:event.pointerId,target:event.target,x:event.clientX,y:event.clientY,at:event.timeStamp};
  return false; // A non-mouse pointer and its compatibility mouse events stay native.
 }
 private mouseDown(event:MouseEvent){
  const intent=this.mouseIntent;this.mouseIntent=null;
  if(!intent||!event.isTrusted||event.defaultPrevented||event.button!==0||![1,3].includes(event.detail)||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||(event as MouseEvent&{sourceCapabilities?:{firesTouchEvents:boolean}}).sourceCapabilities?.firesTouchEvents||event.target!==intent.target||event.timeStamp<intent.at||event.timeStamp-intent.at>100||Math.abs(event.clientX-intent.x)>1||Math.abs(event.clientY-intent.y)>1)return false;
  const before=this.view.state;if(!this.selectionReady(before,false))return false;const anchor=this.pointerPosition(intent.x,intent.y,true);if(anchor===null)return false;
  if(event.detail===3){
   // The owned first click is absent from PM's private click counter. Preserve
   // its existing textblock triple-click behavior through the public command.
   const resolved=before.doc.resolve(anchor),start=anchor-resolved.parentOffset;event.preventDefault();this.view.focus();this.publishSelection(TextSelection.create(before.doc,start,start+resolved.parent.content.size),before);return true;
  }
  try{this.view.dom.setPointerCapture(intent.id);}catch{return false;}
  event.preventDefault();this.view.focus();const s=this.session.summary();this.mouseSelection={id:intent.id,owner:s.ownerId,baseline:s.baselineVersion,expected:before,doc:before.doc,anchor};
  if(!this.publishSelection(TextSelection.create(before.doc,anchor),before)){this.cancelMouse();return true;}
  this.mouseSelection.expected=this.view.state;return true;
 }
 private moveMouse(event:PointerEvent,ending=false){
  const drag=this.mouseSelection;if(!drag||event.pointerId!==drag.id)return false;
  if(!event.isTrusted||event.pointerType!=='mouse'||(!ending&&event.buttons!==1)||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey){this.cancelMouse();return false;}
  const s=this.session.summary();if(s.ownerId!==drag.owner||s.baselineVersion!==drag.baseline||!this.view.state.doc.eq(drag.doc)||!this.selectionReady(drag.expected)){this.cancelMouse();return true;}
  const head=this.pointerPosition(event.clientX,event.clientY);if(head===null){const box=this.view.dom.getBoundingClientRect();if(ending||event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)this.cancelMouse();return true;}
  event.preventDefault();if(!this.publishSelection(TextSelection.create(drag.doc,drag.anchor,head),drag.expected)){this.cancelMouse();return true;}
  drag.expected=this.view.state;if(ending)this.cancelMouse();return true;
 }
 private syntaxDecorations=(state:EditorState)=>{
  const spans:Decoration[]=[];state.doc.forEach((node,start)=>{if(node.attrs.mode!=='opaque')return;const ranges=syntaxRanges(this.readonlyRows.get(node.attrs.id),node.textContent);for(const[from,to]of ranges??[])spans.push(Decoration.inline(start+1+from,start+1+to,{class:'readonly-syntax-token',hidden:'','aria-hidden':'true','data-raw-from':String(from),'data-raw-to':String(to)}));});return DecorationSet.create(state.doc,spans);
 };
 private readPresentation(){const doc=this.session.persistedProjection().documents.find(d=>d.id===this.session.summary().documentId);this.readonlyRows=new Map(doc?.rows.map(row=>[row.id,row]));}
 constructor(place:HTMLElement,readonly session:PmCodecSession,private changed:(status:string)=>void,private onProgress?:(lineId:string)=>void){
  this.metadata=new ProgressMetadata(session);this.metadata.sync(!this.onProgress);this.readPresentation();
  this.view=new EditorView(place,{state:session.view().state,attributes:{role:'textbox','aria-label':'합성 v11 메모·제목 편집기','aria-multiline':'true'},editable:()=>!this.locked&&!session.summary().held&&!session.summary().retired,decorations:this.syntaxDecorations,nodeViews:{line:node=>this.row(node)},dispatchTransaction:tr=>this.input(tr),handleKeyDown:(_v,e)=>this.key(e),handlePaste:(_v,e)=>{if(this.locked)return true;const value=e.clipboardData?.getData('text/plain');if(value===undefined){this.notice('붙여넣기 원문을 읽을 수 없습니다.');return true;}if(/[\r\n]/.test(value)){session.holdInput('MULTILINE_PASTE_UNSUPPORTED',value);this.notice('여러 줄 붙여넣기는 저장 미지원입니다. 제안 원문은 보류 상태에 보존했습니다.');return true;}this.view.dispatch(this.view.state.tr.insertText(value).scrollIntoView());return true;},handleDrop:()=>{this.notice('드롭 입력은 이 연결에서 지원하지 않습니다.');return true;},handleDOMEvents:{
   pointerdown:(_v,event)=>this.pointerDown(event as PointerEvent),mousedown:(_v,event)=>this.mouseDown(event as MouseEvent),
   pointermove:(_v,event)=>this.moveMouse(event as PointerEvent),pointerup:(_v,event)=>{this.mouseIntent=null;return this.moveMouse(event as PointerEvent,true);},pointercancel:(_v,event)=>{if(this.mouseSelection?.id!==(event as PointerEvent).pointerId)return false;this.cancelMouse();return true;},lostpointercapture:(_v,event)=>{if(this.mouseSelection?.id===(event as PointerEvent).pointerId)this.cancelMouse();return false;},
   keydown:(_v,event)=>{this.cancelMouse();this.enterHistory?.observeKeyDown(this.view,event as KeyboardEvent);return this.normalEnter?.observeKeyDown(this.view,event as KeyboardEvent)??false;},
   keyup:()=>{this.enterHistory?.keyUp();return this.normalEnter?.keyUp()??false;},blur:()=>{this.cancelMouse();this.enterHistory?.blur();return this.normalEnter?.blur()??false;},
   compositionstart:()=>{this.cancelMouse();this.normalEnter?.compositionStart();this.enterHistory?.compositionStart();if(session.summary().held){this.readOnly();return true;}this.lifecycle?.start();return false;},compositionend:()=>{this.lifecycle?.end();const win=this.view.dom.ownerDocument.defaultView!;if(this.endFrame!==null)win.cancelAnimationFrame(this.endFrame);this.endFrame=win.requestAnimationFrame(()=>{this.endFrame=null;this.readOnly();this.refreshMetadata();});return false;},
   input:(_v,event)=>{const e=event as InputEvent;this.lifecycle?.nativeInput(e.inputType,e.isComposing);return false;},
   beforeinput:(_v,event)=>{const e=event as InputEvent;if(e.inputType==='insertParagraph'||e.inputType==='insertLineBreak')return this.normalEnter?.beforeInput(this.view,e)??false;if(e.inputType==='historyUndo'||e.inputType==='historyRedo')return this.enterHistory?.beforeInput(this.view,e)??false;if(e.isComposing||this.view.composing)return false;if(session.summary().held){e.preventDefault();this.readOnly();this.notice('보류 원문을 보존 중입니다. 추가 편집과 저장은 미지원입니다.');return true;}return false;}
  }});
  this.normalEnter=createNormalEnterHandlers({summary:()=>session.summary(),locked:()=>this.lockRequested||this.locked,enter:()=>publishNormalEnter(this.view,session,this.lockRequested||this.locked),notice:status=>this.notice(status)});
  this.enterHistory=createEnterHistoryHandlers({summary:()=>session.summary(),locked:()=>this.lockRequested||this.locked,undo:()=>publishEnterHistory(this.view,session,'undo',this.lockRequested||this.locked),redo:()=>publishEnterHistory(this.view,session,'redo',this.lockRequested||this.locked),notice:status=>this.notice(status)});
  this.lifecycle=installComposition(this.view,session,status=>this.notice(status));
  this.reveal=installViewportSelectionReveal(this.view,()=>({owner:session.ownerId,settled:session.summary().inputSettled,held:session.summary().held}));this.view.dom.ownerDocument.defaultView!.addEventListener('blur',this.cancelMouse);this.notice('READY');
 }
 private readOnly(){if(!this.readOnlyApplied&&this.view)this.readOnlyApplied=syncHeldReadOnly(this.view,this.session);}
 private notice(status:string){this.last=status;this.readOnly();if(this.lockRequested&&!this.locked&&!this.view?.composing&&this.session.summary().inputSettled)this.setLocked(true);this.refreshMetadata();this.changed(status);this.reveal?.resume();}
 /** Paint accepted metadata/decorations only; never change PM state, focus or raw. */
 refreshMetadata(){const changed=this.metadata.sync(this.lockRequested||this.locked||!this.onProgress,!!this.view?.composing);if(changed){this.readPresentation();this.view?.setProps({decorations:this.syntaxDecorations});}return changed;}
 /** Delay locking a live composition; never force focus, DOM replacement or a final input. */
 setLocked(locked:boolean){this.lockRequested=locked;if(locked)this.cancelMouse();if(locked&&(this.view.composing||!this.session.summary().inputSettled)){this.refreshMetadata();return false;}this.locked=locked;this.view.setProps({editable:()=>!this.locked&&!this.session.summary().held&&!this.session.summary().retired});this.refreshMetadata();return true;}
 private row(initial:any):NodeView{
  let node=initial;const doc=this.view?.dom.ownerDocument??document,dom=doc.createElement('div'),marker=doc.createElement('span'),content=doc.createElement('div');dom.className='occurrence';marker.className='marker';marker.contentEditable='false';content.className='occurrence-content';dom.append(marker,content);
  let unbind=()=>{};
  if(node.attrs.mode==='task-title'){
   const box=doc.createElement('input');box.type='checkbox';marker.append(box);
   unbind=this.metadata.bind(node.attrs.id,(meta,enabled)=>{const task=meta?.task,valid=meta?.editableReason===null&&meta.entityId===node.attrs.id&&!!task,latest=task?.latestRecorded as {date:string;percent:number}|null;
    box.checked=task?.currentPercent===100;box.indeterminate=!!task?.currentPercent&&task.currentPercent!==100;box.disabled=!enabled||!valid;
    box.title=`진행 기록 열기 · 현재 ${task?.currentPercent??0}%${latest?` · 최신 기록 ${latest.date} ${latest.percent}%`:''}`;box.setAttribute('aria-label',box.title);
    marker.dataset.currentPercent=String(task?.currentPercent??'');marker.dataset.latestDate=latest?.date??'';marker.dataset.latestPercent=String(latest?.percent??'');});
   box.addEventListener('mousedown',event=>event.preventDefault());
   box.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(!box.disabled)this.onProgress?.(node.attrs.id);});
  }else if(node.attrs.mode==='opaque'){
   content.contentEditable='false';marker.setAttribute('aria-hidden','true');dom.setAttribute('role','group');let painted:string|undefined;
   unbind=this.metadata.bind(node.attrs.id,meta=>{
    const semantic=meta?.semantic??null,structured=syntaxRanges(meta,node.textContent)!==null,key=JSON.stringify([semantic,structured]);if(key===painted)return;painted=key;
    marker.replaceChildren();marker.removeAttribute('aria-label');delete dom.dataset.semanticKind;delete dom.dataset.semanticDepth;delete dom.dataset.semanticScope;dom.dataset.semanticPresentation=structured?'structured':'raw';
    if(!semantic){marker.title='읽기 전용';dom.setAttribute('aria-label','읽기 전용');return;}
    dom.dataset.semanticKind=semantic.reference?'reference':semantic.kind;dom.dataset.semanticDepth=String(semantic.depth);
    if(semantic.scopeKind)dom.dataset.semanticScope=semantic.scopeKind;
    const progress=semantic.currentPercent,description=[semantic.label,structured&&progress!==null?`${progress}%`:'','읽기 전용'].filter(Boolean).join(' · ');
    marker.title=description;dom.setAttribute('aria-label',description);
    if(structured&&semantic.checked!==null){const box=doc.createElement('input');box.type='checkbox';box.disabled=true;box.tabIndex=-1;box.checked=progress===null?semantic.checked:progress===100;box.indeterminate=progress!==null&&progress>0&&progress<100;box.setAttribute('aria-hidden','true');marker.append(box);}
   });
  }
  const attr=(name:string,value:string)=>{if(dom.getAttribute(name)!==value)dom.setAttribute(name,value);};
  const attrs=()=>{attr('data-line-id',node.attrs.id);attr('data-mode',node.attrs.mode);attr('data-kind',node.attrs.mode==='task-title'?'task':node.attrs.mode==='memo'?'memo':'opaque');};attrs();
  return{dom,contentDOM:content,update:next=>{if(next.type!==node.type||next.attrs.id!==node.attrs.id||next.attrs.mode!==node.attrs.mode)return false;node=next;attrs();return true;},stopEvent:e=>marker.contains(e.target as Node),ignoreMutation:m=>marker.contains(m.target),destroy:()=>unbind()};
 }
 private input(tr:Transaction){
  const result=publishInput(this.view,this.session,tr);
  // Unsupported native input is retained by the session. Do not roll back a composition DOM.
  this.notice(result.ok?this.session.summary().status:result.reason);this.lifecycle?.published();
 }
 private key(e:KeyboardEvent){if(this.normalEnter?.handleKeyDown(this.view,e)||this.enterHistory?.handleKeyDown(this.view,e))return true;if(e.key==='Enter'||e.keyCode===229||e.isComposing||this.view.composing||!this.session.summary().inputSettled)return false;const modified=e.ctrlKey||e.metaKey;if(modified&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==='a'){const before=this.view.state;this.publishSelection(new AllSelection(before.doc),before);return true;}if(modified&&['z','y'].includes(e.key.toLowerCase())){this.notice(UNSUPPORTED_HISTORY);return true;}return false;}
 ready(){return!this.view.composing&&this.session.summary().inputSettled&&this.view.state===this.session.view().state;}
 async save(retry=false){if(!this.ready()){this.notice('입력 확정을 기다리고 있습니다.');return{ok:false,reason:'INPUT_NOT_SETTLED'};}const result=await(retry?this.session.retry():this.session.save());this.notice(result.ok?'모의 저장 확인됨':result.reason);return result;}
 reopen(documentId:string){if(!this.ready())return{ok:false as const,reason:'INPUT_NOT_SETTLED'};return this.session.reopen(documentId);}
 snapshot(){return{summary:this.session.summary(),status:this.last,pmOwnerSame:this.view.state===this.session.view().state,doc:this.view.state.doc.toJSON(),selection:this.view.state.selection.toJSON(),pending:this.session.pendingInput(),compositionLifecycle:this.lifecycle?.trace()??[]};}
 destroy(){this.cancelMouse();this.view.dom.ownerDocument.defaultView!.removeEventListener('blur',this.cancelMouse);this.normalEnter?.destroy();this.enterHistory?.destroy();this.lifecycle?.destroy();this.reveal?.destroy();if(this.endFrame!==null)this.view.dom.ownerDocument.defaultView!.cancelAnimationFrame(this.endFrame);this.view.destroy();}
}
