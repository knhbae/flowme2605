import type {ProgramWritingPosition} from './contract';
import {textWorkspaceModel as M,type TextWorkspaceState} from './text-workspace';

/** Presentation belongs to its document. Never follow a moved line into another
 * document or write a deleted document/line back from an old editor cache. */
export function normalizeProgramWritingPosition(text:TextWorkspaceState,position:ProgramWritingPosition):ProgramWritingPosition {
  const doc=M.getDocument(text,position.documentId??'');
  if(!doc)return{documentId:null,lineId:null,start:0,end:0,scrollTop:0};
  if(position.lineId&&!doc.lines.some(line=>line.id===position.lineId))return{documentId:doc.id,lineId:null,start:0,end:0,scrollTop:0};
  const max=M.raw(doc).length,integer=(value:number)=>Number.isFinite(value)?Math.min(max,Math.max(0,Math.floor(value))):0,start=integer(position.start);
  return{documentId:doc.id,lineId:position.lineId,start,end:Math.max(start,integer(position.end)),scrollTop:Number.isFinite(position.scrollTop)?Math.max(0,position.scrollTop):0};
}
