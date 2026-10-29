import {Schema,Fragment,Node as PMNode} from 'prosemirror-model';
import {TextSelection,NodeSelection,type Selection} from 'prosemirror-state';
import type {DocumentBody} from '../tagged-codec';
export type TaggedSelection={occurrenceId:string;anchor:number;head:number;direction:'none'|'forward'|'backward'};
// Selective reuse of approved typed schema/selection mapping, without materialize().
export const taggedSchema=new Schema({nodes:{
  doc:{content:'occurrence+'},
  occurrence:{group:'block',content:'inline*',marks:'',defining:true,isolating:true,whitespace:'pre',attrs:{oid:{default:''},kind:{default:'memo'},entityId:{default:null},folderId:{default:null},beforeLinkText:{default:null},draft:{default:null}},
    parseDOM:[{tag:'div[data-oid]',getAttrs:dom=>{const e=dom as HTMLElement;return{oid:e.dataset.oid,kind:e.dataset.kind??'memo',entityId:e.dataset.entityId??null,folderId:e.dataset.folderId??null,beforeLinkText:e.dataset.beforeLinkText??null};}}],
    toDOM:n=>['div',{'data-oid':n.attrs.oid,'data-kind':n.attrs.kind,'data-entity-id':n.attrs.entityId,'data-folder-id':n.attrs.folderId,'data-before-link-text':n.attrs.beforeLinkText},0]},
  text:{group:'inline'},hard_break:{inline:true,group:'inline',selectable:false,parseDOM:[{tag:'br'}],toDOM:()=>['br'],leafText:()=> '\n'}
}});
export function taggedInline(text:string){const out:PMNode[]=[];text.split('\n').forEach((part,i)=>{if(i)out.push(taggedSchema.nodes.hard_break.create());if(part)out.push(taggedSchema.text(part));});return Fragment.fromArray(out);}
export function toTaggedPM(body:DocumentBody){return taggedSchema.nodes.doc.createChecked(null,body.order.map(oid=>{const b=body.blocks[oid];return taggedSchema.nodes.occurrence.createChecked({oid,kind:b.kind,entityId:b.entityId,folderId:b.folderId,beforeLinkText:b.beforeLinkText??null,draft:b.draft??null},taggedInline(b.text));}));}
export function fromTaggedPM(doc:PMNode):DocumentBody {
  if(doc.type!==taggedSchema.nodes.doc)throw Error('WRONG_SCHEMA');doc.check();
  const blocks:DocumentBody['blocks']=Object.create(null),order:string[]=[];
  doc.forEach(node=>{const{oid,kind,entityId,folderId,beforeLinkText,draft}=node.attrs;
    if(node.type!==taggedSchema.nodes.occurrence||typeof oid!=='string'||!oid.trim()||['__proto__','constructor','prototype'].includes(oid)||Object.hasOwn(blocks,oid)||!['memo','task','schedule','folderLink'].includes(kind))throw Error('INVALID_OCCURRENCE');
    let text='';node.forEach(child=>{if(child.isText)text+=child.text;else if(child.type===taggedSchema.nodes.hard_break)text+='\n';else throw Error('UNSUPPORTED_INLINE');});
    blocks[oid]={kind,text,entityId,folderId,...(beforeLinkText!==null?{beforeLinkText}:{}),...(draft!==null?{draft}:{})};order.push(oid);
  });return{blocks,order};
}
export function taggedLocate(doc:PMNode,id:string){let found:{node:PMNode;start:number}|null=null;doc.forEach((node,start)=>{if(node.attrs.oid===id)found={node,start};});if(!found)throw Error('MISSING_OCCURRENCE');return found as{node:PMNode;start:number};}
function at(doc:PMNode,pos:number):{id:string;offset:number}|null{let found:{id:string;offset:number}|null=null;doc.forEach((node,start)=>{if(pos>=start+1&&pos<=start+node.nodeSize-1)found={id:node.attrs.oid,offset:pos-start-1};});return found;}
export function taggedLogical(doc:PMNode,selection:Selection):TaggedSelection|null {
  if(selection instanceof NodeSelection&&selection.node.type===taggedSchema.nodes.occurrence)return{occurrenceId:selection.node.attrs.oid,anchor:0,head:0,direction:'none'};
  const a=at(doc,selection.anchor),h=at(doc,selection.head);if(!a||!h||a.id!==h.id)return null;
  return{occurrenceId:a.id,anchor:a.offset,head:h.offset,direction:selection.anchor===selection.head?'none':selection.anchor<selection.head?'forward':'backward'};
}
export function taggedSelect(doc:PMNode,selection:TaggedSelection){const row=taggedLocate(doc,selection.occurrenceId);if(row.node.attrs.kind==='folderLink')return NodeSelection.create(doc,row.start);if(!Number.isInteger(selection.anchor)||!Number.isInteger(selection.head)||Math.min(selection.anchor,selection.head)<0||Math.max(selection.anchor,selection.head)>row.node.content.size)throw Error('UNMAPPABLE_SELECTION');return TextSelection.create(doc,row.start+1+selection.anchor,row.start+1+selection.head);}
