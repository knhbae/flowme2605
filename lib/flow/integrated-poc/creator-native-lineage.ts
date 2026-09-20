import {programClone,programId,programFailure,programResult,type ProgramData,type ProgramPrivateSpace,type ProgramTransition} from './contract';
import {validateProgramData,programDate,programIdentifier} from './program-data';
import {programSame} from './controller';
import {textWorkspaceModel as M,type TextLine} from './text-workspace';
import {readNativeCreatorDocument,readNativeCreatorSourceDocument} from './native-creator-document';
import {nativeCreatorSourcePreviewIdentity} from './native-creator-document-contract';
import {programCreatorNativeSelection} from './creator-native-context';
import {programNativeExecutionItemFacts} from './creator-native-execution-facts';
import {nativeExecutionTexts,nativeExecutionFields,composeNativeExecutionLines} from './creator-native-execution-render';
import {creatorAdoptedRows} from './creator-adoption';
import {programDocumentContentLock} from './reference-execution-guard';
import {moveProgramPersonalTaskText} from './task-document-move';
import {stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';
import type {ProgramNativeExecutionOwner,ProgramNativeExecutionRevision} from './creator-native-execution-contract';
import type {ProgramNativeLineageMapping} from './creator-native-lineage-contract';

export type ProgramNativeLineagePreview={id:string;draftId:string;documentId:string;rawOwnerId:string;sourceVersionId:string|null;sourceRecoveryId?:string;
 items:{itemId:string;title:string;included:boolean;kind:'ordinary'|'series'|'note';incoming:string;sourceRowIds:string[];exactRowIds:string[];suggestedRowId:string|null}[];
 existing:{rowId:string;revisionId:string;lineId:string;kind:'ordinary'|'series';title:string;source:string;personal:string;documentId:string}[]};
type Capture={actorId:string;space:ProgramPrivateSpace;preview:ProgramNativeLineagePreview;revision:ProgramNativeExecutionRevision};
const captures=new WeakMap<ProgramNativeLineagePreview,Capture>();
const documents=(space:ProgramPrivateSpace)=>[...space.text.documents,...space.text.flows];
const raw=(lines:readonly TextLine[])=>lines.map(l=>l.text).join('\n');
function block(space:ProgramPrivateSpace,lineId:string){const doc=documents(space).find(d=>d.lines.some(l=>l.id===lineId));if(!doc)return null;const start=doc.lines.findIndex(l=>l.id===lineId);let end=start+1;while(end<doc.lines.length&&(!doc.lines[end].text.trim()||/^\s/.test(doc.lines[end].text)))end++;return{doc,start,end,lines:doc.lines.slice(start,end)};}
const fieldLabel=(text:string)=>{const label=/^\s+(?:- )?([^:]+):/.exec(text)?.[1].trim();return label?({date:'날짜',time:'시간',timezone:'시간대',description:'설명',completion:'완료 기준'} as Record<string,string>)[label]??label:null;};
/** Bind only unambiguous owned property units, never an unrelated free memo
 * which happens to occur before a property. Extra personal lines stay unbound. */
function bindBaselineFields(incoming:readonly TextLine[],personal:readonly TextLine[]){
 const fields=nativeExecutionFields(incoming),units:{label:string;lines:TextLine[]}[]=[];let unit:{label:string;lines:TextLine[]}|null=null;
 for(const line of personal.slice(1)){const label=fieldLabel(line.text);if(label){unit={label,lines:[line]};units.push(unit);}else if(unit&&/^ {4}\S/.test(line.text))unit.lines.push(line);else unit=null;}
 for(const field of ['source','date','time'] as const){let active:typeof units[number]|undefined,index=0;fields[field]=fields[field].map(line=>{const label=fieldLabel(line.text);if(label){const candidates=units.filter(u=>u.label===label);active=candidates.length===1?candidates[0]:undefined;index=0;}return{...line,id:active?.lines[index++]?.id??line.id};});}
 const children=personal.filter(line=>/^\s+- \[[^\]]*\]/.test(line.text));fields.children=fields.children.map((line,index)=>({...line,id:children[index]?.id??line.id}));const used=new Set<string>();for(const field of ['source','date','time','children'] as const)fields[field]=fields[field].map(line=>{const id=used.has(line.id)?programId('native-execution-detail'):line.id;used.add(id);return{...line,id};});return fields;
}

/** Suggestions require a byte-identical captured source and its immutable row
 * locator. Equal titles, current array positions and dates never establish ID. */
export function inspectProgramCreatorNativeLineage(data:ProgramData,input:{actorId:string;draftId:string;anchor?:string},now:string):{ok:true;preview:ProgramNativeLineagePreview}|{ok:false;reason:string}{
 if(!validateProgramData(data)||data.activeActorId!==input.actorId||!Number.isFinite(Date.parse(now))||new Date(now).toISOString()!==now)return{ok:false,reason:'invalid'};
 const space=data.spaces[input.actorId],w=space.creatorWorkspace,source=w?.executionSources?.[input.draftId],context=w?.structureDrafts?.[input.draftId],record=w?.library.records[input.draftId];
 if(!source||!record||!context?.nativeDocument)return{ok:false,reason:'missing-lineage-source'};
 if(w?.nativeExecutionSources?.[input.draftId])return{ok:false,reason:'already-linked'};
 if(record.status!=='active'||programDocumentContentLock(space,source.documentId)!=='active')return{ok:false,reason:'archived'};
 const working=w?.working;
 if(working?.draftId===input.draftId&&(working.nativePendingRawText!==undefined||working.title!==record.title||!programSame(working.nativeDocument,context.nativeDocument)||!programSame(working.structure??null,context.structure??null)||!programSame(programCreatorNativeSelection(context.nativeDocument,working.nativeSelection),programCreatorNativeSelection(context.nativeDocument,context.nativeSelection))))return{ok:false,reason:'unsaved-working'};
 if(input.anchor!==undefined&&!programDate(input.anchor))return{ok:false,reason:'invalid-anchor'};
 const anchor=input.anchor??null,read=readNativeCreatorDocument(context.nativeDocument,anchor?{anchor}:{});if(!read.ok)return{ok:false,reason:read.reason};
 const originDocuments=[context.nativeDocument.source,...context.nativeDocument.actions.flatMap(a=>a.kind==='restore'?[a.source]:[])].map(readNativeCreatorSourceDocument).filter(d=>!!d);
 const adopted=creatorAdoptedRows(source).filter(s=>s.disposition==='active');
 const preview:ProgramNativeLineagePreview={id:programId('native-lineage-preview'),draftId:input.draftId,documentId:source.documentId,rawOwnerId:source.id,...nativeCreatorSourcePreviewIdentity(programCreatorNativeSelection(context.nativeDocument,context.nativeSelection)),items:[],existing:[]};
 for(const entry of adopted){const found=block(space,entry.row.documentLineId);if(!found)return{ok:false,reason:'missing-personal-target'};
  if(programDocumentContentLock(space,found.doc.id)!=='active')return{ok:false,reason:'archived-target'};
  preview.existing.push({rowId:entry.row.rowId,revisionId:entry.revision.id,lineId:entry.row.documentLineId,kind:entry.row.kind,title:entry.revision.flow.items.find(i=>i.ref===entry.row.itemRef)?.title??'',source:entry.revision.raw,personal:raw(found.lines),documentId:found.doc.id});
 }
 const rows=read.document.parseResult.canonical.items.map(item=>{
  const facts=programNativeExecutionItemFacts(item,anchor),lineId=programId('native-execution-line'),texts=nativeExecutionTexts(item,facts.date);
  const exactRowIds=adopted.filter(entry=>source.revisions.some(revision=>{const old=revision.rows.find(row=>row.rowId===entry.row.rowId&&row.sourceLineId===entry.row.sourceLineId);return !!old&&originDocuments.some(origin=>origin.rawText===revision.raw&&origin.parseResult.canonical.sourceRows.some(row=>item.sourceRowIds.includes(row.sourceRowId)&&row.sourceRange.startLine===old.sourceLine&&row.rowType==='check'));})).map(entry=>entry.row.rowId);
  preview.items.push({itemId:item.itemId,title:item.title,included:item.included,kind:facts.kind,incoming:texts.join('\n'),sourceRowIds:programClone(item.sourceRowIds),exactRowIds,suggestedRowId:null});
  return{itemId:item.itemId,sourceRowIds:programClone(item.sourceRowIds),rowId:programId('native-execution-row'),lineId,kind:facts.kind,lines:texts.map((text,index)=>({id:index?programId('native-execution-detail'):lineId,text}))};
 });
 for(const item of preview.items)if(item.exactRowIds.length===1&&preview.items.filter(i=>i.exactRowIds.includes(item.exactRowIds[0])).length===1)item.suggestedRowId=item.exactRowIds[0];
 const revision:ProgramNativeExecutionRevision={id:programId('native-execution-revision'),recordRevision:record.recordRevision,contextRevision:context.contextRevision,committedAt:now,nativeDocument:programClone(context.nativeDocument),nativeSelection:programClone(programCreatorNativeSelection(context.nativeDocument,context.nativeSelection)),anchor,rows};
 captures.set(preview,{actorId:input.actorId,space:programClone(space),preview:programClone(preview),revision});return{ok:true,preview};
}

/** No automatic field adoption: same-kind ordinary bindings preserve every byte
 * of the existing personal block. Subsequent handoff uses the usual field review.
 * Old series/changed-kind execution retains its original owner and records. */
export function applyProgramCreatorNativeLineage(data:ProgramData,input:{actorId:string;requestId:string;preview:ProgramNativeLineagePreview;mapping:ProgramNativeLineageMapping},now:string):ProgramTransition<string>{
 const c=captures.get(input.preview);if(!c||c.actorId!==input.actorId||data.activeActorId!==input.actorId)return programFailure(data,'forbidden');
 if(!validateProgramData(data)||!programIdentifier(input.requestId)||!Number.isFinite(Date.parse(now))||new Date(now).toISOString()!==now||!programSame(input.preview,c.preview))return programFailure(data,'invalid');
 const fingerprint=stableAuthoringJson({previewId:input.preview.id,draftId:input.preview.draftId,mapping:input.mapping}),receipt=data.receipts.find(r=>r.actorId===input.actorId&&r.id===input.requestId);
 if(receipt){const target=data.spaces[input.actorId].creatorWorkspace?.nativeExecutionSources?.[input.preview.draftId];return receipt.kind==='native-creator-lineage'&&receipt.fingerprint===fingerprint&&target?.documentId===receipt.resultId&&M.getDocument(data.spaces[input.actorId].text,receipt.resultId)?programResult(data,data,receipt.resultId):programFailure(data,'duplicate-request');}
 if(!programSame(data.spaces[input.actorId],c.space))return programFailure(data,'conflict');
 const mapping=input.mapping;
 if(!mapping||typeof mapping!=='object'||Object.keys(mapping).sort().join(',')!=='items,remaining'||!mapping.items||!mapping.remaining||typeof mapping.items!=='object'||typeof mapping.remaining!=='object'||Array.isArray(mapping.items)||Array.isArray(mapping.remaining))return programFailure(data,'invalid');
 if(Object.keys(mapping.items).length!==c.preview.items.length||Object.keys(mapping.items).some(id=>!c.preview.items.some(i=>i.itemId===id)))return programFailure(data,'invalid');
 const consumed=new Set<string>();
 for(const item of c.preview.items){const choice=mapping.items[item.itemId];if(choice==='skip')continue;if(!item.included)return programFailure(data,'invalid');if(choice==='new')continue;if(typeof choice!=='string'||consumed.has(choice)||!c.preview.existing.some(r=>r.rowId===choice))return programFailure(data,'invalid');consumed.add(choice);}
 const remaining=c.preview.existing.filter(r=>!consumed.has(r.rowId));
 if(Object.keys(mapping.remaining).length!==remaining.length||Object.entries(mapping.remaining).some(([id,value])=>!remaining.some(r=>r.rowId===id)||!['keep','retain'].includes(value)))return programFailure(data,'invalid');
 if(!c.preview.items.some(i=>mapping.items[i.itemId]!=='skip'))return programResult(data,data,'cancelled');
 if(data.receipts.length>=2000)return programFailure(data,'limit');
 const next=programClone(data),space=next.spaces[input.actorId],w=space.creatorWorkspace!,source=w.executionSources![input.preview.draftId],revision=programClone(c.revision),documentId=source.documentId;
 const owner:ProgramNativeExecutionOwner={version:1,id:programId('native-execution'),draftId:source.draftId,documentId,currentRevisionId:revision.id,revisions:[revision],selections:{},rawLineage:{version:1,ownerId:source.id,documentId,bindings:{}}};
 const priorSelections=source.adoption?.selections??Object.fromEntries(source.revisions.flatMap(revision=>revision.rows.map(row=>[row.rowId,{revisionId:revision.id,disposition:revision.id===source.currentRevisionId?'active' as const:documents(space).some(doc=>doc.lines.some(l=>l.id===row.documentLineId))?'retained' as const:'ignored' as const}])));
 source.adoption={version:1,selections:programClone(priorSelections)};
 const retain=(lineId:string,kind:'ordinary'|'series')=>{const found=block(space,lineId);if(!found)return false;
  if(kind==='series'){const old=c.preview.existing.find(e=>e.lineId===lineId)!,revision=source.revisions.find(r=>r.id===old.revisionId)!,row=revision.rows.find(r=>r.rowId===old.rowId)!,next=revision.rows.filter(r=>r.kind==='series'&&r.sourceLine>row.sourceLine).sort((a,b)=>a.sourceLine-b.sourceLine)[0],ids=revision.protectedLineIds.slice(revision.protectedLineIds.indexOf(lineId),next?revision.protectedLineIds.indexOf(next.documentLineId):undefined);
   const positions=ids.map(id=>found.doc.lines.findIndex(l=>l.id===id));if(positions.some(p=>p<0))return false;found.end=Math.max(found.end,...positions.map(p=>p+1));found.lines=found.doc.lines.slice(found.start,found.end);
  }
  let retainedId=space.retentionDocuments?.[documentId];if(!retainedId){space.text=M.addDocument(space.text,{title:`${w.library.records[source.draftId].title} · 이전 제작 항목`,folderId:found.doc.folderId});retainedId=space.text.documents.at(-1)!.id;space.retentionDocuments??={};space.retentionDocuments[documentId]=retainedId;space.archivedDocumentIds.push(retainedId);}
  if(kind==='ordinary'){const moved=moveProgramPersonalTaskText(space.text,lineId,retainedId);if(!moved)return false;space.text=moved;}else{M.getDocument(space.text,found.doc.id)!.lines.splice(found.start,found.end-found.start);M.getDocument(space.text,retainedId)!.lines.push(...found.lines);for(const b of space.text.bindings)if(b.docId===found.doc.id&&found.lines.some(l=>l.id===b.lineId))b.docId=retainedId;}return true;};
 for(const item of c.preview.items){const choice=mapping.items[item.itemId],row=revision.rows.find(r=>r.itemId===item.itemId)!;
  if(choice==='skip'){owner.selections[item.itemId]={revisionId:revision.id,disposition:'ignored'};continue;}
  const old=c.preview.existing.find(e=>e.rowId===choice),same=!!old&&old.kind==='ordinary'&&row.kind==='ordinary';
  if(old){source.adoption.selections[old.rowId]={revisionId:old.revisionId,disposition:'retained'};owner.rawLineage!.bindings[item.itemId]={rowId:old.rowId,revisionId:old.revisionId,mode:same?'same':'replace'};}
  if(same&&old){
   row.lineId=old.lineId;row.lines[0].id=old.lineId;
   const found=block(space,old.lineId)!;
   // Property positions are scoped inside an explicitly identified target, not
   // used to infer Item identity. Unmapped extra prose stays personal forever.
   const sourceFields=bindBaselineFields(row.lines,found.lines);
   owner.selections[item.itemId]={revisionId:revision.id,disposition:'active',execution:{lineId:old.lineId,lines:composeNativeExecutionLines({id:old.lineId,text:row.lines[0].text},sourceFields)}};
  }else{
   if(old&&!retain(old.lineId,old.kind))return programFailure(data,'conflict');
   const doc=M.getDocument(space.text,documentId)!;doc.lines.push(...programClone(row.lines));
   for(const task of M.parseDocument(doc,space.text).items){if(space.text.bindings.some(b=>b.kind==='task'&&b.lineId===task.id))continue;space.text.itemScopes[task.id]??=doc.folderId;if(task.isCanonical)space.text.taskScopes[task.id]??=space.text.itemScopes[task.id];}
   owner.selections[item.itemId]={revisionId:revision.id,disposition:'active'};
  }
 }
 for(const old of remaining)if(mapping.remaining[old.rowId]==='retain'){if(!retain(old.lineId,old.kind))return programFailure(data,'conflict');source.adoption.selections[old.rowId]={revisionId:old.revisionId,disposition:'retained'};}
 w.nativeExecutionSources??={};w.nativeExecutionSources[source.draftId]=owner;
 w.handoffs[source.draftId]={documentId,recordRevision:revision.recordRevision,raw:M.raw(M.getDocument(space.text,documentId)),title:w.library.records[source.draftId].title};
 next.receipts.push({actorId:input.actorId,id:input.requestId,kind:'native-creator-lineage',fingerprint,resultId:documentId});
 return validateProgramData(next)?programResult(data,next,documentId):programFailure(data,'invalid');
}
