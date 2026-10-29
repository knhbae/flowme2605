import {DOMParser,Fragment} from 'prosemirror-model';
import {TextSelection} from 'prosemirror-state';
import type {EditorView} from 'prosemirror-view';
import {PmCodecSession,pmSchema,lineSelection} from '../pm-codec-session';
import {createCompositionSession,type CompositionBinding,type PublishedComposition,type WritingKernel} from './composition-session';
import {canonical} from '../../codec.cjs';

const same=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
function locate(view:EditorView,id:string){let found:any;view.state.doc.forEach((node,start)=>{if(node.attrs.id===id)found={node,start};});if(!found)throw Error('MISSING_LINE');return found;}
const parser=new DOMParser(pmSchema,[{tag:'br.ProseMirror-trailingBreak',ignore:true},{tag:'img.ProseMirror-separator',ignore:true},...DOMParser.fromSchema(pmSchema).rules]);
export function publishedComposition(view:EditorView,session:PmCodecSession,binding:CompositionBinding,readContent?:(content:HTMLElement,node:any)=>Fragment):PublishedComposition|null{
 try{
  const current=session.compositionState().session;
  if(view.isDestroyed||view.state!==session.view().state||!same(current.compositionOwner,binding)||current.docId!==binding.docId||current.ownerId!==binding.ownerId)return null;
  const selection=lineSelection(view.state.doc,view.state.selection);if(!selection)return null;
  if(view.hasFocus()){const native=view.dom.ownerDocument.getSelection();if(!native?.anchorNode||!native.focusNode||!view.dom.contains(native.anchorNode)||!view.dom.contains(native.focusNode)||view.posAtDOM(native.anchorNode,native.anchorOffset,1)!==view.state.selection.anchor||view.posAtDOM(native.focusNode,native.focusOffset,1)!==view.state.selection.head)return null;}
  const row=locate(view,binding.occurrenceId),dom=view.nodeDOM(row.start);if(!dom||dom.nodeType!==1)return null;
  const content=Array.from((dom as HTMLElement).children).find(e=>e.classList.contains('occurrence-content')) as HTMLElement|undefined;if(!content)return null;
  const parsed=readContent?readContent(content,row.node):parser.parse(content,{topNode:row.node.type.create(row.node.attrs),preserveWhitespace:'full'}).content;
  if(!parsed.eq(row.node.content))return null;
  return{binding:{...binding},text:row.node.textContent,selection};
 }catch{return null;}
}
export function nativeCompositionTarget(view:EditorView):string|null{try{const native=view.dom.ownerDocument.getSelection(),focus=native?.focusNode;if(focus&&view.dom.contains(focus)){const el=focus.nodeType===1?focus as Element:focus.parentElement,row=el?.closest('[data-line-id]'),id=row?.getAttribute('data-line-id');if(id&&view.nodeDOM(locate(view,id).start)===row)return id;}return lineSelection(view.state.doc,view.state.selection)?.occurrenceId??null;}catch{return null;}}
export function nativeCompositionSelection(view:EditorView){try{const native=view.dom.ownerDocument.getSelection();if(!native?.anchorNode||!native.focusNode||!view.dom.contains(native.anchorNode)||!view.dom.contains(native.focusNode))return null;return lineSelection(view.state.doc,TextSelection.create(view.state.doc,view.posAtDOM(native.anchorNode,native.anchorOffset,1),view.posAtDOM(native.focusNode,native.focusOffset,1)));}catch{return null;}}
export function sessionCompositionPort(session:PmCodecSession):WritingKernel{return{getState:()=>session.compositionState(),dispatch:action=>session.compositionAction(action)};}
export function installComposition(view:EditorView,session:PmCodecSession,notice:(status:string)=>void){const win=view.dom.ownerDocument.defaultView!;return createCompositionSession(sessionCompositionPort(session),{target:()=>nativeCompositionTarget(view),initialSelection:()=>nativeCompositionSelection(view),composing:()=>view.composing,published:b=>publishedComposition(view,session,b),requestFrame:cb=>win.requestAnimationFrame(cb),cancelFrame:id=>win.cancelAnimationFrame(id),notice});}
