import type {EditorView} from 'prosemirror-view';

type EnterView=Pick<EditorView,'state'|'composing'|'hasFocus'|'dom'|'posAtDOM'>;
type EnterSummary={inputSettled:boolean;held:boolean;retired:boolean;busy:boolean;pendingCommit:unknown};
export interface NormalEnterPorts {
 summary:()=>EnterSummary;
 locked:()=>boolean;
 enter:(view:EnterView)=>{ok:boolean;reason?:string};
 notice:(status:string)=>void;
}
export const UNSUPPORTED_ENTER='수정키 Enter는 이 저장 연결에서 아직 지원하지 않습니다.';
export const UNSUPPORTED_HISTORY='일반 Undo·Redo는 이 저장 연결에서 아직 지원하지 않습니다.';

/** Read public DOM selection only. Never focus, publish a selection or flush native input here. */
export function normalEnterSelectionMatches(view:EnterView){
 try{
  if(!view.hasFocus())return false;
  const selection=view.dom.ownerDocument.getSelection();
  if(!selection?.anchorNode||!selection.focusNode||!view.dom.contains(selection.anchorNode)||!view.dom.contains(selection.focusNode))return false;
  return view.posAtDOM(selection.anchorNode,selection.anchorOffset,1)===view.state.selection.anchor&&view.posAtDOM(selection.focusNode,selection.focusOffset,1)===view.state.selection.head;
 }catch{return false;}
}

/** One normal Enter intent per public DOM gesture. No timer, UA branch or private PM field.
 * Real DOM keydown observes a new gesture; PM's beforeinput fallback calls handleKeyDown
 * without that observer. A keyup/new DOM keydown/blur ends the preceding key gesture.
 * A 229 confirmation guard lasts through compositionend until that key boundary.
 */
export function createNormalEnterHandlers(ports:NormalEnterPorts){
 let destroyed=false,keyGesture=false,physicalEnterActive=false,suppressFallback=true,imeGesture=false,modifiedGesture=false;
 const handled=new WeakSet<object>();
 const clearGesture=()=>{keyGesture=false;physicalEnterActive=false;imeGesture=false;modifiedGesture=false;};
 const clear=()=>{clearGesture();suppressFallback=true;};
 const unsettled=(view:EnterView,event:{isComposing?:boolean})=>event.isComposing===true||view.composing||!ports.summary().inputSettled;
 function insert(view:EnterView){
  const s=ports.summary();
  const reason=ports.locked()?'EDITOR_LOCKED':s.retired?'STALE_INPUT_OWNER':s.held?'PENDING_INPUT':s.busy||s.pendingCommit?'PENDING_COMMIT':null;
  if(reason){ports.notice(reason);return;}
  const result=ports.enter(view);ports.notice(result.ok?'ENTER_APPLIED':result.reason??'ENTER_PUBLICATION_HOLD');
 }
 return{
  observeKeyDown(view:EnterView,event:KeyboardEvent){
   if(destroyed)return false;
   if(handled.has(event)){keyGesture=true;suppressFallback=true;return false;}
   clear();
   const enter=event.key==='Enter'||event.keyCode===13;
   physicalEnterActive=enter;
   imeGesture=event.keyCode===229||event.isComposing||enter&&(view.composing||!ports.summary().inputSettled);
   modifiedGesture=enter&&!!(event.shiftKey||event.ctrlKey||event.metaKey||event.altKey);
   const s=ports.summary();
   suppressFallback=!enter||imeGesture||modifiedGesture||event.cancelable===false||event.defaultPrevented||ports.locked()||s.held||s.retired||s.busy||!!s.pendingCommit;
   return false;
  },
  handleKeyDown(view:EnterView,event:KeyboardEvent){
   if(destroyed||event.key!=='Enter')return false;
   if(event.keyCode===229){imeGesture=true;suppressFallback=true;return false;}
   if(unsettled(view,event)){keyGesture=physicalEnterActive;suppressFallback=true;return false;}
   if(handled.has(event))return true;
   if(event.defaultPrevented){keyGesture=physicalEnterActive;suppressFallback=true;return true;}
   if(event.cancelable===false){keyGesture=physicalEnterActive;suppressFallback=true;ports.notice('ENTER_EVENT_NOT_CANCELABLE');return false;}
   handled.add(event);
   if(suppressFallback&&event.isTrusted===false)return true;
   suppressFallback=true;
   keyGesture=physicalEnterActive;
   if(event.shiftKey||event.ctrlKey||event.metaKey||event.altKey){ports.notice(UNSUPPORTED_ENTER);return true;}
   if(imeGesture)return true;
   insert(view);return true; // EditorView prevents the default for a handled keydown.
  },
  beforeInput(view:EnterView,event:InputEvent){
   if(destroyed||!['insertParagraph','insertLineBreak'].includes(event.inputType))return false;
   if(unsettled(view,event)){suppressFallback=true;return false;} // Do not cancel final IME text.
   if(handled.has(event))return true;
   if(event.defaultPrevented){suppressFallback=true;return true;}
   if(!event.cancelable){suppressFallback=true;ports.notice('ENTER_EVENT_NOT_CANCELABLE');return false;}
   handled.add(event);event.preventDefault();suppressFallback=true;
   if(modifiedGesture){ports.notice(UNSUPPORTED_ENTER);return true;}
   if(keyGesture||imeGesture)return true;
   if(event.inputType==='insertLineBreak'){ports.notice(UNSUPPORTED_ENTER);return true;}
   insert(view);return true;
  },
  // PM's delayed fallback may run after keyup. Only a new raw Enter may authorize
  // a fresh fallback; BI-only Enter remains independently supported above.
  keyUp(){clearGesture();return false;},
  blur(){clear();return false;},
  compositionStart(){keyGesture=false;modifiedGesture=false;suppressFallback=true;return false;},
  destroy(){destroyed=true;clear();}
 };
}

/** Only the core's exact unsaved Enter history. No generic PM/browser history. */
export function createEnterHistoryHandlers(ports:Omit<NormalEnterPorts,'enter'>&{undo:NormalEnterPorts['enter'];redo:NormalEnterPorts['enter']}){
 let destroyed=false,consumedKey=false,blockedKey=false;
 const handled=new WeakSet<object>();
 const reset=()=>{consumedKey=false;blockedKey=false;};
 const composing=(view:EnterView,event:{isComposing?:boolean})=>event.isComposing===true||view.composing||!ports.summary().inputSettled;
 const historyKey=(e:KeyboardEvent)=>(e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase());
 const action=(e:KeyboardEvent):'undo'|'redo'|null=>!historyKey(e)||e.altKey?null:e.key.toLowerCase()==='z'?(e.shiftKey?'redo':'undo'):!e.shiftKey?'redo':null;
 function history(view:EnterView,direction:'undo'|'redo'){
  const s=ports.summary(),reason=ports.locked()?'EDITOR_LOCKED':s.retired?'STALE_INPUT_OWNER':s.held?'PENDING_INPUT':s.busy||s.pendingCommit?'PENDING_COMMIT':null;
  if(reason){ports.notice(reason);return;}
  const result=ports[direction](view);ports.notice(result.ok?(direction==='undo'?'ENTER_UNDO_APPLIED':'ENTER_REDO_APPLIED'):result.reason??'ENTER_HISTORY_PUBLICATION_HOLD');
 }
 return{
  observeKeyDown(view:EnterView,event:KeyboardEvent){
   if(destroyed)return false;
   if(handled.has(event)){consumedKey=true;blockedKey=true;return false;}
   reset();
   if(event.keyCode===229||composing(view,event))blockedKey=true;
   if(historyKey(event)){const s=ports.summary();blockedKey=blockedKey||!action(event)||event.defaultPrevented||event.cancelable===false||ports.locked()||s.held||s.retired||s.busy||!!s.pendingCommit;}
   return false;
  },
  handleKeyDown(view:EnterView,event:KeyboardEvent){
   if(destroyed||!historyKey(event))return false;
   if(event.keyCode===229||composing(view,event)){blockedKey=true;return false;}
   if(handled.has(event))return true;
   if(event.defaultPrevented){blockedKey=true;return true;}
   if(!event.cancelable){blockedKey=true;return false;}
   handled.add(event);consumedKey=true;
   const direction=action(event);if(!direction){ports.notice(UNSUPPORTED_HISTORY);return true;}
   if(!blockedKey)history(view,direction);return true;
  },
  beforeInput(view:EnterView,event:InputEvent){
   if(destroyed||!['historyUndo','historyRedo'].includes(event.inputType))return false;
   if(composing(view,event))return false;
   if(handled.has(event)||event.defaultPrevented)return true;
   if(!event.cancelable)return false;
   handled.add(event);event.preventDefault();if(!consumedKey&&!blockedKey)history(view,event.inputType==='historyUndo'?'undo':'redo');return true;
  },
  keyUp(){reset();return false;},blur(){reset();return false;},
  compositionStart(){return false;},
  destroy(){destroyed=true;reset();}
 };
}
