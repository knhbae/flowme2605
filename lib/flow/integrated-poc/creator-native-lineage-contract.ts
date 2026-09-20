import type {ProgramCreatorExecutionSource} from './creator-execution-contract';
/** An explicit Program ownership transfer. Original raw/native revisions remain
 * their own sources; this is not a fabricated source revision or legacy tuple. */
export type ProgramNativeRawLineage={version:1;ownerId:string;documentId:string;bindings:Record<string,{rowId:string;revisionId:string;mode:'same'|'replace'}>};
export type ProgramNativeLineageMapping={items:Record<string,string|'new'|'skip'>;remaining:Record<string,'keep'|'retain'>};
export function programNativeLineageOwnsRawSource(native:{draftId:string;documentId:string;rawLineage?:ProgramNativeRawLineage}|undefined,source:ProgramCreatorExecutionSource){
 const lineage=native?.rawLineage;
 return !!native&&!!lineage&&lineage.version===1&&native.draftId===source.draftId&&native.documentId===source.documentId&&lineage.documentId===source.documentId&&lineage.ownerId===source.id
  &&Object.values(lineage.bindings).every(binding=>source.revisions.find(r=>r.id===binding.revisionId)?.rows.some(row=>row.rowId===binding.rowId));
}
export function validateProgramNativeRawLineage(value:unknown,source:ProgramCreatorExecutionSource|undefined,itemIds:readonly string[],documentId:string):value is ProgramNativeRawLineage{
 if(!value||typeof value!=='object'||Array.isArray(value)||!source)return false;
 const v=value as ProgramNativeRawLineage;
 if(Object.keys(v).sort().join(',')!=='bindings,documentId,ownerId,version'||v.version!==1||v.ownerId!==source.id||v.documentId!==documentId||source.documentId!==documentId||!v.bindings||typeof v.bindings!=='object'||Array.isArray(v.bindings))return false;
 const seen=new Set<string>();
 return Object.entries(v.bindings).every(([itemId,b])=>{
  if(!itemIds.includes(itemId)||!b||typeof b!=='object'||Object.keys(b).sort().join(',')!=='mode,revisionId,rowId'||!['same','replace'].includes(b.mode)||seen.has(b.rowId))return false;
  seen.add(b.rowId);return !!source.revisions.find(r=>r.id===b.revisionId)?.rows.some(r=>r.rowId===b.rowId);
 });
}
