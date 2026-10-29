import type {EditorView} from 'prosemirror-view';
import type {TaggedSession} from '../tagged-session';
import {taggedSchema,taggedLogical,taggedLocate} from '../tagged-pm-schema';
import {TAGGED_ACTION_BOUNDARY} from '../tagged-history';

type EnterView=Pick<EditorView,'state'|'dispatch'|'composing'>;
/** Same-occurrence LF only. Enter never confirms syntax, splits an item, or allocates IDs. */
export function proposeTaggedLineBreak(view:EnterView,session:TaggedSession){
  const current=session.diagnostics();
  if(view.state!==session.state)return{ok:false as const,reason:'INPUT_OWNER_MISMATCH'};
  if(current.closed)return{ok:false as const,reason:'OWNER_RETIRED'};
  if(view.composing||current.composing)return{ok:false as const,reason:'INPUT_NOT_SETTLED'};
  if(session.rejectedIntent())return{ok:false as const,reason:'UNSUPPORTED_INPUT_INTENT_HOLD'};
  const selected=taggedLogical(view.state.doc,view.state.selection);
  if(!selected){const tr=view.state.tr.replaceSelectionWith(taggedSchema.nodes.hard_break.create());return session.retainInputIntent('CROSS_OCCURRENCE_EDIT_UNSUPPORTED',tr,'\n');}
  if(taggedLocate(view.state.doc,selected.occurrenceId).node.attrs.kind==='folderLink')return{ok:false as const,reason:'FOLDER_LABEL_READONLY'};
  return{ok:true as const,tr:view.state.tr.replaceSelectionWith(taggedSchema.nodes.hard_break.create()).setMeta(TAGGED_ACTION_BOUNDARY,true).scrollIntoView()};
}

/** Public EditorView event props. No timer, private PM fields, UA branch, or native DOM rewrite.
 * A canceled beforeinput may be followed by PM's synthetic iOS Enter fallback;
 * suppress that one fallback, while every new DOM keydown is a new gesture. */
export function createTaggedEnterHandlers(session:TaggedSession,notice:(status:string)=>void,selectionReady:(view:EnterView)=>boolean=()=>true){
  let consumedBeforeInput=false,destroyed=false;
  const handled=new WeakSet<object>();
  function history(view:EnterView,direction:'undo'|'redo'){
    if(view.state!==session.state){notice('INPUT_OWNER_MISMATCH');return;}
    if(!selectionReady(view)){notice('HISTORY_NATIVE_SELECTION_NOT_READY');return;}
    const prepared=session.prepareHistory(direction);if(!prepared.ok){notice(prepared.reason);return;}
    const before=view.state;view.dispatch(prepared.tr);
    notice(view.state===session.state&&view.state!==before?(direction==='undo'?'LOCAL_UNDO_APPLIED':'LOCAL_REDO_APPLIED'):'HISTORY_PUBLICATION_HOLD');
  }
  function insert(view:EnterView){
    // Preserve the first unresolved input before consulting native diagnostics.
    if(session.rejectedIntent()){notice('UNSUPPORTED_INPUT_INTENT_HOLD');return;}
    if(!selectionReady(view)){session.retainInputIntent('NATIVE_SELECTION_NOT_PUBLISHED',session.state.tr,'\n');notice('NATIVE_SELECTION_NOT_PUBLISHED');return;}
    const result=proposeTaggedLineBreak(view,session);
    if(!result.ok){notice(result.reason);return;}
    view.dispatch(result.tr);
    notice(view.state===session.state&&session.state.doc.eq(result.tr.doc)?'LINE_BREAK_APPLIED':'LINE_BREAK_PUBLICATION_HOLD');
  }
  return{
    observeKeyDown(view:EnterView,event:KeyboardEvent){
      if(!destroyed&&event.key==='Enter'&&!event.isComposing&&!view.composing)consumedBeforeInput=false;
      return false;
    },
    handleKeyDown(view:EnterView,event:KeyboardEvent){
      if(destroyed)return false;
      if(event.isComposing||view.composing)return false;
      const historyKey=!event.altKey&&(event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase());
      if(historyKey){if(handled.has(event))return true;handled.add(event);history(view,event.key.toLowerCase()==='y'||event.shiftKey?'redo':'undo');return true;}
      if(event.key!=='Enter')return false;
      if(handled.has(event))return true;handled.add(event);
      if(event.isTrusted===false&&consumedBeforeInput){consumedBeforeInput=false;notice('NATIVE_ENTER_ALREADY_HANDLED');return true;}
      if(session.diagnostics().composing){notice('INPUT_NOT_SETTLED');return true;}
      insert(view);return true; // PM prevents the default after this handler returns true.
    },
    beforeInput(view:EnterView,event:InputEvent){
      if(destroyed)return false;
      if(!['insertParagraph','insertLineBreak','historyUndo','historyRedo'].includes(event.inputType))return false;
      if(event.isComposing||view.composing)return false;
      if(handled.has(event)||event.defaultPrevented)return true;
      if(!event.cancelable){notice('NONCANCELABLE_ENTER_NOT_APPLIED');return false;}
      handled.add(event);event.preventDefault();
      if(event.inputType==='historyUndo'||event.inputType==='historyRedo'){history(view,event.inputType==='historyUndo'?'undo':'redo');return true;}
      consumedBeforeInput=true;
      if(session.diagnostics().composing){notice('INPUT_NOT_SETTLED');return true;}
      insert(view);return true;
    },
    destroy(){destroyed=true;consumedBeforeInput=false;}
  };
}
