import type { NativeCreatorDocumentOwner } from './native-creator-document-contract';
import { validateNativeCreatorDocumentOwner } from './native-creator-document';
import { creatorSourceOffsetToNative } from './creator-source-order';
import { programSame } from './controller';

export type NativeCreatorSourceFocusTarget={ownerId:string;ownerRevision:number;documentId:string;itemId:string;sourceRowIds:string[];rawText:string;startOffset:number;endOffset:number;startLine:number;endLine:number};

/** Exact source lineage, including every property row. Never infer from title. */
export function createNativeCreatorSourceFocusTarget(owner:NativeCreatorDocumentOwner,itemId:string):NativeCreatorSourceFocusTarget|null {
  if(!validateNativeCreatorDocumentOwner(owner))return null;
  const doc=owner.document,item=doc.parseResult.canonical.items.find(row=>row.itemId===itemId);
  if(!item?.sourceRowIds.length||new Set(item.sourceRowIds).size!==item.sourceRowIds.length)return null;
  const rows=item.sourceRowIds.map(id=>doc.parseResult.canonical.sourceRows.find(row=>row.sourceRowId===id));
  if(rows.some(row=>!row||row.state==='tombstone'||row.documentId!==doc.documentId
    ||!Number.isInteger(row.sourceRange.startOffset)||!Number.isInteger(row.sourceRange.endOffset)
    ||row.sourceRange.startOffset<0||row.sourceRange.endOffset<row.sourceRange.startOffset||row.sourceRange.endOffset>doc.rawText.length
    ||doc.rawText.slice(row.sourceRange.startOffset,row.sourceRange.endOffset)!==row.rawText))return null;
  const ranges=rows.map(row=>row!.sourceRange);
  return{ownerId:owner.id,ownerRevision:owner.revision,documentId:doc.documentId,itemId,sourceRowIds:[...item.sourceRowIds],rawText:doc.rawText,
    startOffset:Math.min(...ranges.map(row=>row.startOffset)),endOffset:Math.max(...ranges.map(row=>row.endOffset)),
    startLine:Math.min(...ranges.map(row=>row.startLine)),endLine:Math.max(...ranges.map(row=>row.endLine))};
}
export function nativeCreatorSourceFocusRange(owner:NativeCreatorDocumentOwner,target:NativeCreatorSourceFocusTarget):{start:number;end:number}|null {
  const exact=createNativeCreatorSourceFocusTarget(owner,target.itemId);
  if(!exact||!programSame(exact,target))return null;
  return{start:creatorSourceOffsetToNative(exact.rawText,exact.startOffset),end:creatorSourceOffsetToNative(exact.rawText,exact.endOffset)};
}
