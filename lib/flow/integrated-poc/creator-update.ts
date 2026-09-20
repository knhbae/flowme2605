import { programClone,programId,programFailure,programResult,type ProgramData,type ProgramPrivateSpace,type ProgramTransition } from './contract';
import { programSame } from './controller';
import { validateProgramData } from './program-data';
import { textWorkspaceModel as M,type TextLine } from './text-workspace';
import { prepareProgramCreatorExecution } from './creator-execution-handoff';
import { creatorAdoptedRows } from './creator-adoption';
import type { ProgramCreatorExecutionRevision,ProgramCreatorExecutionRow } from './creator-execution-contract';
import { moveProgramPersonalTaskText } from './task-document-move';
import { creatorSourceIdentity } from './creator-source-order';

export type CreatorUpdateChoice={source:'keep'|'incoming';date:'keep'|'incoming';time:'keep'|'incoming';children:'keep'|'incoming'};
export type CreatorUpdateRow={id:string;title:string;previous:string;personal:string;incoming:string;kind:'changed'|'added'|'removed';sourceKind:string;hasPrivateChanges:boolean};
export type CreatorUpdatePreview={id:string;draftId:string;documentId:string;rows:CreatorUpdateRow[];previousRaw:string;personalRaw:string;incomingRaw:string};
type Capture={actorId:string;space:ProgramPrivateSpace;prepared:NonNullable<ReturnType<typeof prepareProgramCreatorExecution>>;candidate:ProgramCreatorExecutionRevision;preview:CreatorUpdatePreview;baselineBlocks:Map<string,TextLine[]>;incomingBlocks:Map<string,TextLine[]>};
const captures=new WeakMap<CreatorUpdatePreview,Capture>();
const docs=(space:ProgramPrivateSpace)=>[...space.text.documents,...space.text.flows];
const raw=(lines:readonly TextLine[])=>lines.map(l=>l.text).join('\n');
function block(space:ProgramPrivateSpace,row:ProgramCreatorExecutionRow):TextLine[]|null {
  const doc=docs(space).find(d=>d.lines.some(l=>l.id===row.documentLineId));if(!doc)return null;
  const start=doc.lines.findIndex(l=>l.id===row.documentLineId);
  if(row.kind==='ordinary'){const selected=M.selectionForMove(space.text,doc.id,row.documentLineId);return selected?doc.lines.slice(selected.startIndex,selected.endIndex):null;}
  let end=start+1;while(end<doc.lines.length&&!/^\S/u.test(doc.lines[end].text))end++;
  return doc.lines.slice(start,end);
}
function sourceBlock(prepared:Capture['prepared'],row:ProgramCreatorExecutionRow,lines:TextLine[]) {
  const start=prepared.output.findIndex(l=>l.sourceLine===row.sourceLine);
  let end=start+1;while(end<lines.length&&!/^\S/u.test(lines[end].text))end++;
  if(row.kind==='ordinary')while(end>start+1&&!lines[end-1].text.trim())end--;
  return lines.slice(start,end);
}
/** A captured proposal, never a mutation or an inferred overwrite permission. */
export function inspectCreatorUpdate(data:ProgramData,draftId:string,now:string):CreatorUpdatePreview|null {
  if(!validateProgramData(data))return null;
  const actorId=data.activeActorId,space=data.spaces[actorId],workspace=space.creatorWorkspace,owner=workspace?.executionSources?.[draftId],record=workspace?.library.records[draftId];
  if(!workspace||!owner||!record||record.status!=='active'||space.archivedDocumentIds.includes(owner.documentId))return null;
  // A native canonical update must use its actual inclusion/role/review model,
  // never the raw-only execution adapter while the native bridge is pending.
  if(workspace.structureDrafts?.[draftId]?.nativeDocument || workspace.working?.draftId===draftId&&workspace.working.nativeDocument)return null;
  const current=owner.revisions.find(r=>r.id===owner.currentRevisionId)!;
  if(record.recordRevision<current.recordRevision||record.recordRevision===current.recordRevision&&!owner.adoption)return null;
  const reuse=record.recordRevision===current.recordRevision;
  const prepared=prepareProgramCreatorExecution(record.rawText,draftId,record.recordRevision,now,record.templateId,owner,workspace.sourceIdentities?.[draftId]?.identity);if(!prepared)return null;
  let temp=M.addDocument(space.text,{title:'업데이트 검토',folderId:M.getDocument(space.text,owner.documentId)!.folderId});const tempId=temp.documents.at(-1)!.id;
  temp=M.editText(temp,tempId,prepared.raw);const nextDoc=M.getDocument(temp,tempId)!;if(M.raw(nextDoc)!==prepared.raw)return null;
  const active=creatorAdoptedRows(owner).filter(s=>s.disposition==='active');
  const known=[...active.map(s=>s.row),...owner.revisions.slice().reverse().flatMap(r=>r.rows)],rows=prepared.materialized.parseResult.items.map(item=>{
    const sourceLineId=prepared.sourceLines[item.sourceLine-1].id,old=known.find(r=>r.sourceLineId===sourceLineId),index=prepared.output.findIndex(l=>l.sourceLine===item.sourceLine);
    const kind=item.recurrence?'series' as const:'ordinary' as const,stored=reuse?current.rows.find(r=>r.sourceLineId===sourceLineId):undefined;
    const documentLineId=stored?.documentLineId??(old?.kind==='ordinary'&&kind==='ordinary'?old.documentLineId:nextDoc.lines[index].id);nextDoc.lines[index].id=documentLineId;
    return{rowId:stored?.rowId??old?.rowId??programId('creator-row'),sourceLineId,sourceLine:item.sourceLine,itemRef:prepared.materialized.flow.authoring.sourceLineItemIdentityMap![String(item.sourceLine)].itemRef,documentLineId,kind};
  });
  if(reuse){let at=0;prepared.output.forEach((line,index)=>{if(line.series)nextDoc.lines[index].id=current.protectedLineIds[at++];});}
  const candidate:ProgramCreatorExecutionRevision=reuse?programClone(current):{id:programId('creator-update-revision'),recordRevision:record.recordRevision,committedAt:now,raw:record.rawText,sourceLines:programClone(prepared.sourceLines),flow:programClone(prepared.materialized.flow),rows,protectedLineIds:prepared.output.flatMap((l,i)=>l.series?[nextDoc.lines[i].id]:[])};
  const baselineBlocks=new Map<string,TextLine[]>(),incomingBlocks=new Map(candidate.rows.map(row=>[row.rowId,sourceBlock(prepared,row,nextDoc.lines)]));
  const view:CreatorUpdateRow[]=[];
  for(const selected of active){
    const oldPlan=prepareProgramCreatorExecution(selected.revision.raw,draftId,selected.revision.recordRevision,selected.revision.committedAt,record.templateId,undefined,creatorSourceIdentity(selected.revision.raw,selected.revision.sourceLines));
    // Reconstruct source projection with genuine raw; line identity is already in the immutable revision.
    const genuine=oldPlan??prepareProgramCreatorExecution(selected.revision.raw,draftId,selected.revision.recordRevision,selected.revision.committedAt,record.templateId);if(!genuine)return null;
    const sourceLines=genuine.output.map((line,i)=>({id:`preview-${i}`,text:line.text}));const baseline=sourceBlock(genuine,selected.row,sourceLines);baselineBlocks.set(selected.row.rowId,baseline);
    const personal=block(space,selected.row);if(!personal)return null;
    const incoming=incomingBlocks.get(selected.row.rowId),next=rows.find(r=>r.rowId===selected.row.rowId);
    view.push({id:selected.row.rowId,title:selected.revision.flow.items.find(i=>i.ref===selected.row.itemRef)!.title,previous:raw(baseline),personal:raw(personal),incoming:incoming?raw(incoming):'',kind:next?'changed':'removed',sourceKind:`${selected.row.kind} → ${next?.kind??'삭제'}`,hasPrivateChanges:raw(personal)!==raw(baseline)});
  }
  for(const row of rows.filter(row=>!active.some(s=>s.row.rowId===row.rowId)))view.push({id:row.rowId,title:candidate.flow.items.find(i=>i.ref===row.itemRef)!.title,previous:'',personal:'',incoming:raw(incomingBlocks.get(row.rowId)!),kind:'added',sourceKind:`추가 ${row.kind}`,hasPrivateChanges:false});
  const preview={id:programId('creator-update-preview'),draftId,documentId:owner.documentId,rows:view,previousRaw:current.raw,personalRaw:M.raw(M.getDocument(space.text,owner.documentId)),incomingRaw:record.rawText};
  captures.set(preview,{actorId,space:programClone(space),prepared,candidate,preview,baselineBlocks,incomingBlocks});return preview;
}
const propertyKey=(text:string)=>/^\s+- ([^:]+):/u.exec(text)?.[1]??null;
const child=(line:TextLine)=>/^\s+- \[[^\]]*\]/u.test(line.text);
/** The complete child tail includes its attributes, unknown lines and nested checks. */
const childStart=(lines:TextLine[])=>lines.findIndex(child);
/** Same parent native ID survives; private progress/date/memo/children are independent choices. */
function mergeOrdinary(space:ProgramPrivateSpace,old:ProgramCreatorExecutionRow,incoming:TextLine[],before:TextLine[],choice:CreatorUpdateChoice):boolean {
  const original=block(space,old),task=M.tasks(space.text).find(t=>t.id===old.documentLineId);if(!original||!task)return false;
  const doc=M.getDocument(space.text,task.docId)!;
  const title=incoming[0].text.replace(/^\s*- \[[^\]]*\]\s*/u,'');
  let text=M.updateTask(space.text,task.id,{title});if(!M.validate(text))return false;space.text=text;
  const target=M.getDocument(space.text,doc.id)!,start=target.lines.findIndex(l=>l.id===task.id),current=block(space,old)!;
  const next=current.map(l=>({...l})),head=(lines:TextLine[])=>lines.slice(0,childStart(lines)<0?lines.length:childStart(lines)),incomingProps=head(incoming).filter(l=>propertyKey(l.text)),beforeKeys=new Set(head(before).map(l=>propertyKey(l.text)).filter(Boolean));
  const owned=['날짜','시간','메모'];
  // Preserve private-only properties; source properties are replaced only on the explicit content choice.
  for(const key of new Set([...beforeKeys,...incomingProps.map(l=>propertyKey(l.text)!)])){
    if(owned.includes(key!))continue;
    const local=head(next).filter(l=>propertyKey(l.text)===key),remote=incomingProps.filter(l=>propertyKey(l.text)===key);if(local.length>1||remote.length>1)return false;
    if(local.length){const at=next.indexOf(local[0]);if(remote.length)next[at]={id:local[0].id,text:remote[0].text};else next.splice(at,1);}
    else if(remote.length)next.splice(1,0,{...remote[0]});
  }
  if(choice.children==='incoming'){
    const localAt=childStart(next),remoteAt=childStart(incoming),local=localAt<0?[]:next.slice(localAt),remote=remoteAt<0?[]:incoming.slice(remoteAt);
    if(raw(local)!==raw(remote)){
      // No title/index matching. Preserve old child IDs and their complete bytes in
      // an archived parent, and give the explicitly accepted source fresh IDs.
      if(local.length){
        space.text=M.addDocument(space.text,{title:`이전 하위 확인 · ${task.title}`,folderId:doc.folderId});
        const archive=space.text.documents.at(-1)!;space.archivedDocumentIds.push(archive.id);
        const parentId=programId('creator-subtree-parent');
        archive.lines.push({id:parentId,text:`- [ ] ${task.title}`},{id:programId('creator-subtree-date'),text:`  - 날짜: ${task.date??'미정'}`},...local.map(line=>({...line})));
        space.text.taskScopes[parentId]=space.text.itemScopes[parentId]=doc.folderId;
        const ids=new Set(local.map(line=>line.id));for(const binding of space.text.bindings)if(binding.docId===doc.id&&ids.has(binding.lineId))binding.docId=archive.id;
      }
      if(localAt>=0)next.splice(localAt);
      next.push(...remote.map(line=>{const id=programId('creator-adopt-child');if(child(line))space.text.itemScopes[id]=doc.folderId;return{id,text:line.text};}));
    }
  }
  M.getDocument(space.text,doc.id)!.lines.splice(start,current.length,...next);
  const dateLine=incoming.find(l=>propertyKey(l.text)==='날짜'),timeLine=incoming.find(l=>propertyKey(l.text)==='시간');
  // Keeping execution fields is explicit even if the source date differs.
  text=M.updateTask(space.text,task.id,{date:choice.date==='incoming'?(dateLine?.text.split(':').slice(1).join(':').trim()??null):task.date,
    time:choice.time==='incoming'?(timeLine?.text.split(':').slice(1).join(':').trim()??''):(task.time??'')});
  if(!M.validate(text))return false;space.text=text;return true;
}
export function applyCreatorUpdate(data:ProgramData,input:{actorId:string;preview:CreatorUpdatePreview;choices:Record<string,CreatorUpdateChoice>}):ProgramTransition<string> {
  const capture=captures.get(input.preview);if(!capture||capture.actorId!==input.actorId||data.activeActorId!==input.actorId)return programFailure(data,'forbidden');
  if(!validateProgramData(data)||!programSame(data.spaces[input.actorId],capture.space))return programFailure(data,'conflict');
  const choiceValues=Object.values(input.choices);if(Object.keys(input.choices).some(id=>!capture.preview.rows.some(r=>r.id===id))||choiceValues.some(c=>Object.keys(c).sort().join(',')!=='children,date,source,time'||Object.values(c).some(v=>v!=='keep'&&v!=='incoming')))return programFailure(data,'invalid');
  if(!choiceValues.some(c=>c.source==='incoming'))return programResult(data,data,capture.preview.documentId);
  const next=programClone(data),space=next.spaces[input.actorId],workspace=space.creatorWorkspace!,owner=workspace.executionSources![capture.preview.draftId],candidate=programClone(capture.candidate);
  const selected=creatorAdoptedRows(owner),selections=Object.fromEntries(selected.map(s=>[s.row.rowId,{revisionId:s.revision.id,disposition:s.disposition}]));
  function retain(row:ProgramCreatorExecutionRow):boolean {
    let targetId=space.retentionDocuments?.[owner.documentId];
    if(!targetId){space.text=M.addDocument(space.text,{title:'이전 제작 항목 · 개인 기록 보관',folderId:M.getDocument(space.text,owner.documentId)!.folderId});targetId=space.text.documents.at(-1)!.id;space.retentionDocuments??={};space.retentionDocuments[owner.documentId]=targetId;space.archivedDocumentIds.push(targetId);}
    if(row.kind==='ordinary'){const moved=moveProgramPersonalTaskText(space.text,row.documentLineId,targetId);if(!moved)return false;space.text=moved;return true;}
    const lines=block(space,row);if(!lines)return false;const ids=new Set(lines.map(l=>l.id));for(const doc of docs(space))doc.lines=doc.lines.filter(l=>!ids.has(l.id));M.getDocument(space.text,targetId)!.lines.push(...lines);return true;
  }
  for(const view of capture.preview.rows){
    const choice=input.choices[view.id]??{source:'keep',date:'keep',time:'keep',children:'keep'},old=selected.find(s=>s.row.rowId===view.id&&s.disposition==='active'),row=candidate.rows.find(r=>r.rowId===view.id);
    if(choice.source==='keep'){if(!old&&row)selections[row.rowId]={revisionId:candidate.id,disposition:'ignored'};continue;}
    if(!row){if(old&&!retain(old.row))return programFailure(data,'unresolved');if(old)selections[view.id]={revisionId:old.revision.id,disposition:'retained'};continue;}
    const incoming=programClone(capture.incomingBlocks.get(view.id)!);
    if(old?.revision.id===candidate.id&&row.kind==='series')continue;
    if(old?.row.kind==='ordinary'&&row.kind==='ordinary'){
      if(!mergeOrdinary(space,old.row,incoming,capture.baselineBlocks.get(view.id)!,choice))return programFailure(data,'conflict');row.documentLineId=old.row.documentLineId;
    }else{
      if(old&&!retain(old.row))return programFailure(data,'unresolved');
      const target=M.getDocument(space.text,owner.documentId)!;target.lines.push({id:programId('creator-separator'),text:''},...incoming);
      if(row.kind==='ordinary'){space.text.taskScopes[row.documentLineId]=space.text.itemScopes[row.documentLineId]=target.folderId;for(const line of incoming)if(child(line))space.text.itemScopes[line.id]=target.folderId;}
    }
    selections[view.id]={revisionId:candidate.id,disposition:'active'};
  }
  for(const revision of owner.revisions)for(const row of revision.rows)selections[row.rowId]??={revisionId:revision.id,disposition:'ignored'};
  const existing=owner.revisions.find(r=>r.id===candidate.id);if(existing&&!programSame(existing,candidate))return programFailure(data,'conflict');
  if(!existing)owner.revisions.push(candidate);owner.currentRevisionId=candidate.id;owner.adoption={version:1,selections};
  workspace.handoffs[capture.preview.draftId]={documentId:owner.documentId,recordRevision:candidate.recordRevision,raw:capture.prepared.raw,title:workspace.library.records[capture.preview.draftId].title};
  if(!programSame(space.text.progressRecords,capture.space.text.progressRecords)||!programSame(space.recurrenceExecution,capture.space.recurrenceExecution)||!validateProgramData(next))return programFailure(data,'unresolved');
  return programResult(data,programSame(space,capture.space)?data:next,owner.documentId);
}
