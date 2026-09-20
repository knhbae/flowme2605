import { creatorExecutionItemRef, type ProgramCreatorExecutionSource, type ProgramCreatorExecutionRevision } from './creator-execution-contract';

/** Read projection only. Each row continues to name an authentic immutable source revision. */
export function creatorAdoptedRows(owner: ProgramCreatorExecutionSource) {
  const current=owner.revisions.find(r=>r.id===owner.currentRevisionId)!;
  if(!owner.adoption)return current.rows.map(row=>({row,revision:current,disposition:'active' as const}));
  return Object.entries(owner.adoption.selections).map(([rowId,choice])=>{
    const revision=owner.revisions.find(r=>r.id===choice.revisionId)!;
    return {revision,row:revision.rows.find(row=>row.rowId===rowId)!,disposition:choice.disposition};
  });
}
/** No raw/provenance validator consumes this projected view as a materialized revision. */
export function effectiveCreatorExecutionRevision(owner: ProgramCreatorExecutionSource): ProgramCreatorExecutionRevision {
  const current=owner.revisions.find(r=>r.id===owner.currentRevisionId)!;
  if(!owner.adoption)return current;
  const selected=creatorAdoptedRows(owner).filter(r=>r.disposition==='active');
  const rows=selected.map(({row})=>({...row,itemRef:creatorExecutionItemRef(owner.id,row.rowId)}));
  const items=selected.map(({row,revision},i)=>({...revision.flow.items.find(item=>item.ref===row.itemRef)!,ref:rows[i].itemRef}));
  const protectedLineIds=selected.filter(s=>s.row.kind==='series').flatMap(({row,revision})=>{
    // Revision protection is kept in source order; exact source slices identify this series block.
    const index=revision.protectedLineIds.indexOf(row.documentLineId),next=revision.rows.filter(r=>r.kind==='series'&&r.sourceLine>row.sourceLine).sort((a,b)=>a.sourceLine-b.sourceLine)[0];
    const end=next?revision.protectedLineIds.indexOf(next.documentLineId):revision.protectedLineIds.length;
    return revision.protectedLineIds.slice(index,end);
  });
  return {...current,rows,protectedLineIds,flow:{...current.flow,items}};
}
