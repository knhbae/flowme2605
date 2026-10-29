import {TextSelection} from 'prosemirror-state';
import type {EditorView} from 'prosemirror-view';
import type {TaggedSession} from '../tagged-session';
import {taggedInline,taggedLocate,taggedLogical} from '../tagged-pm-schema';

type ClipboardView=Pick<EditorView,'state'|'dispatch'|'composing'|'editable'>;
export type TaggedClipboardSession=Pick<TaggedSession,'state'|'diagnostics'|'rejectedIntent'|'retainInputIntent'>;
const installed=new WeakMap<EditorView,object>();
const reject=(reason:string)=>({ok:false as const,reason});

function inputReady(view:ClipboardView,session:TaggedClipboardSession){
  if(view.state!==session.state)return 'INPUT_OWNER_MISMATCH';
  if(session.diagnostics().closed)return 'OWNER_RETIRED';
  if(!view.editable)return 'INPUT_READONLY';
  if(session.rejectedIntent())return 'UNSUPPORTED_INPUT_INTENT_HOLD';
  if(view.composing||session.diagnostics().composing)return 'INPUT_NOT_SETTLED';
  return null;
}

/** A paste changes literal text in one existing occurrence only. CRLF/CR are
 * clipboard line endings and become LF; all other characters are kept exactly.
 * No grammar recognition, entity/occurrence allocation, focus or history owner. */
export function proposeTaggedPlainTextPaste(view:ClipboardView,session:TaggedClipboardSession,text:string){
  const blocked=inputReady(view,session);if(blocked)return reject(blocked);
  if(typeof text!=='string')return reject('PLAIN_TEXT_REQUIRED');
  const selection=view.state.selection;
  if(!(selection instanceof TextSelection))return reject('TEXT_SELECTION_REQUIRED');
  const selected=taggedLogical(view.state.doc,selection);
  if(!selected)return reject('CROSS_OCCURRENCE_PASTE_UNSUPPORTED');
  const row=taggedLocate(view.state.doc,selected.occurrenceId);
  if(row.node.attrs.kind==='folderLink')return reject('FOLDER_LABEL_READONLY');
  if(selection.$from.parent!==row.node||selection.$to.parent!==row.node)return reject('TEXT_SELECTION_REQUIRED');
  // An empty text/plain flavor must never erase an existing selected range.
  if(text==='')return{ok:true as const,tr:null,normalizedText:''};
  const normalizedText=text.replace(/\r\n?/g,'\n'),content=taggedInline(normalizedText);
  const tr=view.state.tr.replaceWith(selection.from,selection.to,content);
  tr.setSelection(TextSelection.create(tr.doc,selection.from+content.size));
  tr.setMeta('paste',true).setMeta('uiEvent','paste').scrollIntoView();
  return{ok:true as const,tr,normalizedText};
}

function plainText(event:ClipboardEvent){
  try{
    const data=event.clipboardData;if(!data)return reject('CLIPBOARD_DATA_UNAVAILABLE');
    if(data.files.length)return reject('CLIPBOARD_FILES_UNSUPPORTED');
    if(!Array.from(data.types).includes('text/plain'))return reject('PLAIN_TEXT_REQUIRED');
    return{ok:true as const,text:data.getData('text/plain')};
  }catch{return reject('CLIPBOARD_READ_FAILED');}
}

/** Native `paste` must be intercepted before PM parses HTML or bypasses its
 * handlePaste prop during composition. Native selection readiness is required
 * from the editor owner; this module never reads or rewrites native selection. */
export function createTaggedClipboardHandlers(session:TaggedClipboardSession,notice:(status:string)=>void,selectionReady:(view:ClipboardView)=>boolean){
  let destroyed=false;const handled=new WeakSet<object>();
  function paste(view:ClipboardView,event:ClipboardEvent){
    if(destroyed)return false;
    if(handled.has(event)||event.defaultPrevented)return true;
    handled.add(event);
    if(event.cancelable)event.preventDefault();
    const blocked=inputReady(view,session);if(blocked){notice(blocked);return true;}
    const read=plainText(event);if(!read.ok){notice(read.reason);return true;}
    if(!event.cancelable){session.retainInputIntent('NONCANCELABLE_PASTE_UNSUPPORTED',session.state.tr,read.text);notice('NONCANCELABLE_PASTE_UNSUPPORTED');return true;}
    let ready=false;try{ready=selectionReady(view);}catch{ /* Hold rather than guess a target. */ }
    if(!ready){session.retainInputIntent('NATIVE_SELECTION_NOT_PUBLISHED',session.state.tr,read.text);notice('NATIVE_SELECTION_NOT_PUBLISHED');return true;}
    const result=proposeTaggedPlainTextPaste(view,session,read.text);
    if(!result.ok){
      if(['TEXT_SELECTION_REQUIRED','CROSS_OCCURRENCE_PASTE_UNSUPPORTED'].includes(result.reason))session.retainInputIntent(result.reason,session.state.tr,read.text);
      notice(result.reason);return true;
    }
    if(!result.tr){notice('EMPTY_PLAIN_TEXT_PASTE_IGNORED');return true;}
    try{
      view.dispatch(result.tr);
      if(view.state===session.state&&session.state.doc.eq(result.tr.doc)&&session.state.selection.eq(result.tr.selection)){notice('PLAIN_TEXT_PASTE_APPLIED');return true;}
    }catch{ /* Keep the live state and the exact clipboard intent, never restore. */ }
    session.retainInputIntent('PASTE_PUBLICATION_HOLD',session.state.tr,read.text);notice('PASTE_PUBLICATION_HOLD');return true;
  }
  return{paste,handlePaste:paste,destroy(){destroyed=true;}};
}

/** Optional public-prop integration. The existing bridge/history/ACK code stays
 * owned by its caller. Other editor handlers are preserved, and cleanup does
 * not overwrite a newer owner's replacement paste handlers. */
export function installTaggedClipboardAdapter(view:EditorView,session:TaggedClipboardSession,notice:(status:string)=>void,selectionReady:(view:ClipboardView)=>boolean){
  if(view.isDestroyed)throw Error('EDITOR_VIEW_DESTROYED');
  if(installed.has(view))throw Error('CLIPBOARD_ADAPTER_ALREADY_INSTALLED');
  const lease={};
  const previousPaste=view.props.handlePaste,previousDomPaste=view.props.handleDOMEvents?.paste;
  const handlers=createTaggedClipboardHandlers(session,notice,selectionReady);
  const nativePaste=(current:EditorView,event:ClipboardEvent)=>handlers.paste(current,event);
  const fallbackPaste=(current:EditorView,event:ClipboardEvent)=>handlers.handlePaste(current,event);
  installed.set(view,lease);
  try{view.setProps({handlePaste:fallbackPaste,handleDOMEvents:{...view.props.handleDOMEvents,paste:nativePaste}});}
  catch(error){handlers.destroy();if(installed.get(view)===lease)installed.delete(view);throw error;}
  let destroyed=false;
  return{destroy(){
    if(destroyed)return;destroyed=true;handlers.destroy();
    try{
      if(view.isDestroyed)return;
      const next:Partial<EditorView['props']>={};
      if(view.props.handlePaste===fallbackPaste)next.handlePaste=previousPaste;
      if(view.props.handleDOMEvents?.paste===nativePaste){const dom={...view.props.handleDOMEvents};if(previousDomPaste)dom.paste=previousDomPaste;else delete dom.paste;next.handleDOMEvents=dom;}
      if(Object.keys(next).length)view.setProps(next);
    }finally{if(installed.get(view)===lease)installed.delete(view);}
  }};
}
