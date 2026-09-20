import {validateNativeCreatorDocumentOwner} from './native-creator-document';
import {validateProgramCreatorNativeContext} from './creator-native-context';
import type {ProgramNativeExecutionSources,ProgramNativeExecutionOwner,ProgramNativeExecutionSelection} from './creator-native-execution-contract';
import {stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';
import {isValidAuthoringDate} from './native-creator-vendor/text-authoring/recurrence';
import {nativeExecutionTexts,nativeExecutionFields,composeNativeExecutionLines} from './creator-native-execution-render';
import {programNativeExecutionItemFacts,programNativeExecutionDocument} from './creator-native-execution-facts';
import {validateProgramNativeRawLineage} from './creator-native-lineage-contract';
import type {ProgramCreatorExecutionSource} from './creator-execution-contract';
import {programNativeExecutionIdentity,programNativeSourceItemId} from './creator-native-execution-identity';
import type {ProgramNativeExecutionRevision,ProgramNativeExecutionRow} from './creator-native-execution-contract';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=1200&&!['__proto__','constructor','prototype'].includes(v);
const exact=(v:Record<string,unknown>,keys:string)=>Object.keys(v).sort().join(',')===keys.split(',').sort().join(',');
export function programNativeSelectedRows(owner:ProgramNativeExecutionOwner){return Object.entries(owner.selections).flatMap(([itemId,choice])=>{const revision=owner.revisions.find(r=>r.id===choice.revisionId),row=revision?.rows.find(r=>r.itemId===itemId);return revision&&row?[{revision,row:choice.execution?{...row,...choice.execution}:row,selection:choice,disposition:choice.disposition}]:[];});}
/** Every independently accepted field retains its source's review boundary. */
export function programNativeSelectionHeld(owner:ProgramNativeExecutionOwner,selection:ProgramNativeExecutionSelection){
 return [selection.revisionId,selection.dateRevisionId,selection.timeRevisionId,selection.childrenRevisionId].some(id=>{if(!id)return false;const document=owner.revisions.find(r=>r.id===id)?.nativeDocument.document;return !document||!!document.reviewGates?.some(g=>g.status==='required')||!!document.sourceState&&document.sourceState.status!=='current';});
}
/** Replays full native documents; never recreates a legacy Flow from their text. */
export function validateProgramNativeExecutionSources(value:unknown,space:{text:{documents:readonly {id:string;lines?:readonly{id:string}[]}[];flows:readonly{id:string;lines?:readonly{id:string}[]}[]};creatorWorkspace?:{executionSources?:Record<string,ProgramCreatorExecutionSource>}},records:Record<string,{recordRevision:number}>):value is ProgramNativeExecutionSources {
 try{
  if(!obj(value)||Object.keys(value).length>200)return false;const owners=new Set<string>(),documents=new Set<string>();
  const docs=[...space.text.documents,...space.text.flows],allLines=new Set(docs.flatMap(d=>d.lines?.map(l=>l.id)??[])),selectedLines=new Set<string>();
  for(const [draftId,v] of Object.entries(value)){
   if(!obj(v)||!exact(v,'version,id,draftId,documentId,currentRevisionId,revisions,selections'+(Object.hasOwn(v,'rawLineage')?',rawLineage':''))||v.version!==1||v.draftId!==draftId||!records[draftId]||!id(v.id)||owners.has(v.id)||!id(v.documentId)||documents.has(v.documentId)||!docs.some(d=>d.id===v.documentId)||!Array.isArray(v.revisions)||!v.revisions.length||v.revisions.length>100||!obj(v.selections))return false;
   owners.add(v.id);documents.add(v.documentId);let priorContext=0;const revisions=new Set<string>();
   for(const r of v.revisions){
    if(!obj(r)||!exact(r,'id,recordRevision,contextRevision,committedAt,nativeDocument,nativeSelection,anchor,rows')||!id(r.id)||revisions.has(r.id)||!Number.isSafeInteger(r.recordRevision)||Number(r.recordRevision)<1||Number(r.recordRevision)>records[draftId].recordRevision||!Number.isSafeInteger(r.contextRevision)||Number(r.contextRevision)<1||Number(r.contextRevision)<priorContext||typeof r.committedAt!=='string'||!Number.isFinite(Date.parse(r.committedAt))||new Date(r.committedAt).toISOString()!==r.committedAt||(r.anchor!==null&&!isValidAuthoringDate(r.anchor as string))||!validateNativeCreatorDocumentOwner(r.nativeDocument)||!validateProgramCreatorNativeContext(r.nativeDocument,r.nativeSelection,draftId)||!Array.isArray(r.rows))return false;
    if(Number(r.contextRevision)===priorContext){const previous=v.revisions[v.revisions.indexOf(r)-1];if(stableAuthoringJson(previous.nativeDocument)!==stableAuthoringJson(r.nativeDocument)||stableAuthoringJson(previous.nativeSelection)!==stableAuthoringJson(r.nativeSelection)||previous.recordRevision!==r.recordRevision||previous.anchor===r.anchor)return false;}
    revisions.add(r.id);priorContext=Number(r.contextRevision);const items=programNativeExecutionDocument(r.nativeDocument).parseResult.canonical.items,ids=new Set<string>(),executionIds=new Set<string>();
    const lineage=r.rows.some(row=>obj(row)&&Object.hasOwn(row,'sourceItemId'))?programNativeExecutionIdentity(v.revisions.slice(0,v.revisions.indexOf(r)) as ProgramNativeExecutionRevision[],r.nativeDocument):null;
    if(r.rows.length!==items.length)return false;
    for(const row of r.rows){const item=obj(row)?items.find(i=>i.itemId===(row.sourceItemId??row.itemId)):undefined;
     if(!item||!obj(row)||!exact(row,'itemId,sourceRowIds,rowId,lineId,kind,lines'+(Object.hasOwn(row,'sourceItemId')?',sourceItemId':''))||!id(row.itemId)||executionIds.has(row.itemId)||Object.hasOwn(row,'sourceItemId')&&(!id(row.sourceItemId)||row.sourceItemId===row.itemId||lineage?.get(row.sourceItemId)!==row.itemId)||ids.has(item.itemId)||stableAuthoringJson(row.sourceRowIds)!==stableAuthoringJson(item.sourceRowIds)||!id(row.rowId)||!id(row.lineId)||row.kind!==programNativeExecutionItemFacts(item).kind||!Array.isArray(row.lines)||!row.lines.length||row.lines[0].id!==row.lineId||new Set(row.lines.map(l=>l.id)).size!==row.lines.length||row.lines.some(l=>!obj(l)||!exact(l,'id,text')||!id(l.id)||typeof l.text!=='string'||/[\r\n]/.test(l.text)))return false;ids.add(item.itemId);executionIds.add(row.itemId);
     const date=programNativeExecutionItemFacts(item,r.anchor as string|null).date;
     if(stableAuthoringJson(row.lines.map(l=>l.text))!==stableAuthoringJson(nativeExecutionTexts(item,date)))return false;
    }
   }
   if(v.currentRevisionId!==v.revisions.at(-1).id)return false;
   if(v.rawLineage!==undefined&&!validateProgramNativeRawLineage(v.rawLineage,space.creatorWorkspace?.executionSources?.[draftId],v.revisions.flatMap(r=>r.rows.map((row:{itemId:string})=>row.itemId)),v.documentId))return false;
   if(v.rawLineage!==undefined){const lineage=v.rawLineage as import('./creator-native-lineage-contract').ProgramNativeRawLineage,source=space.creatorWorkspace!.executionSources![draftId],firstRows=v.revisions[0].rows;
    if(Object.entries(lineage.bindings).some(([itemId,b])=>{const old=source.revisions.find(r=>r.id===b.revisionId)!.rows.find(r=>r.rowId===b.rowId)!,first=firstRows.find((r:{itemId:string})=>r.itemId===itemId);return !first||source.adoption?.selections[b.rowId]?.disposition!=='retained'||(b.mode==='same'?(old.kind!=='ordinary'||first.kind!=='ordinary'||first.lineId!==old.documentLineId):first.lineId===old.documentLineId);}))return false;
   }
   for(const [itemId,s] of Object.entries(v.selections)){
    if(!obj(s)||!Object.hasOwn(s,'revisionId')||!Object.hasOwn(s,'disposition')||Object.keys(s).some(k=>!['revisionId','disposition','execution','dateRevisionId','timeRevisionId','childrenRevisionId'].includes(k))||!['active','retained','ignored'].includes(s.disposition as string))return false;
    const r=v.revisions.find(r=>r.id===s.revisionId),row=r?.rows.find((row:{itemId:string})=>row.itemId===itemId);if(!row)return false;
    const item=r.nativeDocument.document.parseResult.canonical.items.find((i:{itemId:string})=>i.itemId===programNativeSourceItemId(row as ProgramNativeExecutionRow));if(s.disposition==='active'&&!item.included)return false;
    const fields=nativeExecutionFields(row.lines);
    for(const name of ['date','time','children'] as const){const ref=s[`${name}RevisionId`];if(ref===undefined)continue;
     const fieldRow=v.revisions.find(r=>r.id===ref)?.rows.find((row:{itemId:string})=>row.itemId===itemId);if(!fieldRow||fieldRow.kind!==row.kind)return false;fields[name]=nativeExecutionFields(fieldRow.lines)[name];
    }
    let lineId=row.lineId;
    if(s.execution!==undefined){const e=s.execution;if(!obj(e)||!exact(e,'lineId,lines')||!id(e.lineId)||!Array.isArray(e.lines)||!e.lines.length||e.lines[0].id!==e.lineId||new Set(e.lines.map(l=>l.id)).size!==e.lines.length||e.lines.some(l=>!obj(l)||!exact(l,'id,text')||!id(l.id)||typeof l.text!=='string'||/[\r\n]/.test(l.text)))return false;
     if(stableAuthoringJson(e.lines.map(l=>l.text))!==stableAuthoringJson(composeNativeExecutionLines(row.lines[0],fields).map(l=>l.text)))return false;lineId=e.lineId;
    }
    if(s.disposition!=='ignored'){if(!allLines.has(lineId)||selectedLines.has(lineId))return false;selectedLines.add(lineId);}
   }
  }
  return true;
 }catch{return false;}
}
