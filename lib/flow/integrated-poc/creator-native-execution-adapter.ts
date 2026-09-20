import {programClone,programId,programFailure,programResult,type ProgramData,type ProgramPrivateSpace,type ProgramTransition} from './contract';
import {validateProgramData,programDate,programIdentifier} from './program-data';
import {programSame} from './controller';
import {textWorkspaceModel as M,type TextLine} from './text-workspace';
import {readNativeCreatorDocument} from './native-creator-document';
import {nativeCreatorSourcePreviewIdentity} from './native-creator-document-contract';
import {programCreatorNativeSelection} from './creator-native-context';
import {programNativeSelectedRows} from './creator-native-execution-validation';
import type {ProgramNativeExecutionOwner,ProgramNativeExecutionRevision,ProgramNativeExecutionRow} from './creator-native-execution-contract';
import type {CreatorUpdateChoice} from './creator-update';
import {moveProgramPersonalTaskText} from './task-document-move';
import {programDocumentContentLock} from './reference-execution-guard';
import {nativeExecutionTexts,nativeExecutionFields,composeNativeExecutionLines,type NativeField} from './creator-native-execution-render';
import {stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';
import {programNativeExecutionItemFacts,programNativeExecutionDocument} from './creator-native-execution-facts';
import {programNativeExecutionIdentity,programNativeSourceItemId} from './creator-native-execution-identity';
export type ProgramNativeHandoffPreview={id:string;draftId:string;documentId:string|null;sourceVersionId:string|null;sourceRecoveryId?:string;contextRevision:number;sourceRaw:string;rows:{itemId:string;title:string;previous:string;personal:string;incoming:string;sourceRowIds:string[];kind:'added'|'changed'|'removed';previousKind:string|null;incomingKind:string|null;sourceDate:string|null;sourceTime:string|null;timeZone:string|null;fieldUpdatesAllowed:boolean;mode:'new'|'update'|'replace'|'retain'}[]};
type Capture={actorId:string;space:ProgramPrivateSpace;revision:ProgramNativeExecutionRevision;owner:ProgramNativeExecutionOwner|undefined;title:string;preview:ProgramNativeHandoffPreview};
const captures=new WeakMap<ProgramNativeHandoffPreview,Capture>();
const docs=(space:ProgramPrivateSpace)=>[...space.text.documents,...space.text.flows];
const raw=(lines:readonly TextLine[])=>lines.map(l=>l.text).join('\n');
function block(space:ProgramPrivateSpace,row:ProgramNativeExecutionRow){const doc=docs(space).find(d=>d.lines.some(l=>l.id===row.lineId));if(!doc)return null;const start=doc.lines.findIndex(l=>l.id===row.lineId);let end=start+1;while(end<doc.lines.length&&(!doc.lines[end].text.trim()||/^\s/.test(doc.lines[end].text)))end++;return{doc,start,end,lines:doc.lines.slice(start,end)};}
/** A pure native projection. Full source remains in the immutable owner, including
 * excluded Items and source-only/table content, never reinterpreted as tasks. */
export function inspectProgramNativeCreatorHandoff(data:ProgramData,input:{actorId:string;draftId:string;anchor?:string},now:string):{ok:true;preview:ProgramNativeHandoffPreview}|{ok:false;reason:string}{
 if(!validateProgramData(data)||data.activeActorId!==input.actorId||!Number.isFinite(Date.parse(now))||new Date(now).toISOString()!==now)return{ok:false,reason:'invalid'};
 const space=data.spaces[input.actorId],workspace=space.creatorWorkspace,record=workspace?.library.records[input.draftId],context=workspace?.structureDrafts?.[input.draftId],owner=workspace?.nativeExecutionSources?.[input.draftId];
 if(!record||!context?.nativeDocument)return{ok:false,reason:'missing-native-source'};
 if(record.status!=='active'||owner&&programDocumentContentLock(space,owner.documentId)!=='active')return{ok:false,reason:'archived'};
 if(workspace?.working?.draftId===input.draftId&&(workspace.working.nativePendingRawText!==undefined||!programSame(workspace.working.nativeDocument,context.nativeDocument)||workspace.working.title!==record.title||!programSame(workspace.working.structure??null,context.structure??null)||!programSame(programCreatorNativeSelection(context.nativeDocument,workspace.working.nativeSelection),programCreatorNativeSelection(context.nativeDocument,context.nativeSelection))))return{ok:false,reason:'unsaved-working'};
 if(input.anchor!==undefined&&!programDate(input.anchor))return{ok:false,reason:'invalid-anchor'};
 // A raw-owned existing document cannot be matched to native items by title or line.
 if(!owner&&workspace?.handoffs[input.draftId])return{ok:false,reason:'native-lineage-mapping-required'};
 const anchor=input.anchor??owner?.revisions.at(-1)?.anchor??null;
 const read=readNativeCreatorDocument(context.nativeDocument,anchor?{anchor}:{});if(!read.ok)return{ok:false,reason:read.reason};
 const canonical=read.document.parseResult.canonical,prior=owner?programNativeSelectedRows(owner):[],known=owner?.revisions.flatMap(r=>r.rows)??[];
 let identities:Map<string,string>;try{identities=programNativeExecutionIdentity(owner?.revisions??[],context.nativeDocument);}catch{return{ok:false,reason:'ambiguous-native-lineage'};}
 const rows:ProgramNativeExecutionRow[]=canonical.items.map(item=>{
  const facts=programNativeExecutionItemFacts(item,anchor),kind=facts.kind;
  const itemId=identities.get(item.itemId)!,old=[...known].reverse().find(r=>r.itemId===itemId&&r.kind===kind),lineId=old?.lineId??programId('native-execution-line');
  const texts=nativeExecutionTexts(item,facts.date);
  return{itemId,...(itemId!==item.itemId?{sourceItemId:item.itemId}:{}),sourceRowIds:programClone(item.sourceRowIds),rowId:old?.rowId??programId('native-execution-row'),lineId,kind,lines:texts.map((text,index)=>({id:index===0?lineId:old?.lines[index]?.text===text?old.lines[index].id:programId('native-execution-detail'),text}))};
 });
 const revision:ProgramNativeExecutionRevision={id:programId('native-execution-revision'),recordRevision:record.recordRevision,contextRevision:context.contextRevision,committedAt:now,nativeDocument:programClone(context.nativeDocument),nativeSelection:programClone(programCreatorNativeSelection(context.nativeDocument,context.nativeSelection)),anchor:input.anchor??owner?.revisions.at(-1)?.anchor??null,rows};
 const preview:ProgramNativeHandoffPreview={id:programId('native-handoff-preview'),draftId:input.draftId,documentId:owner?.documentId??null,...nativeCreatorSourcePreviewIdentity(revision.nativeSelection),contextRevision:context.contextRevision,sourceRaw:read.document.rawText,rows:[]};
 for(const itemId of new Set([...prior.map(s=>s.row.itemId),...rows.map(r=>r.itemId)])){
  const previous=prior.find(s=>s.row.itemId===itemId&&s.disposition!=='ignored'),incoming=rows.find(r=>r.itemId===itemId),item=incoming?canonical.items.find(i=>i.itemId===programNativeSourceItemId(incoming)):undefined,active=!!item?.included;
  const personal=previous?block(space,previous.row):null;if(previous&&!personal)return{ok:false,reason:'missing-personal-target'};
  const facts=item?programNativeExecutionItemFacts(item,anchor):null,fieldUpdatesAllowed=!!previous&&previous.disposition==='active'&&active&&previous.row.kind===incoming?.kind;
  preview.rows.push({itemId,title:item?.title??(previous?previous.revision.nativeDocument.document.parseResult.canonical.items.find(i=>i.itemId===programNativeSourceItemId(previous.row))?.title:undefined)??'',sourceRowIds:item?.sourceRowIds??previous?.row.sourceRowIds??[],previous:previous?raw(previous.row.lines):'',personal:personal?raw(personal.lines):'',incoming:incoming&&active?raw(incoming.lines):'',kind:!active?'removed':previous?'changed':'added',previousKind:previous?.row.kind??null,incomingKind:active?incoming?.kind??null:null,sourceDate:facts?.date??null,sourceTime:facts?.time??null,timeZone:facts?.timeZone??null,fieldUpdatesAllowed,mode:!active?'retain':fieldUpdatesAllowed?'update':previous?'replace':'new'});
 }
 captures.set(preview,{actorId:input.actorId,space:programClone(space),revision,owner:owner?programClone(owner):undefined,title:record.title,preview:programClone(preview)});return{ok:true,preview};
}
export function applyProgramNativeCreatorHandoff(data:ProgramData,input:{actorId:string;requestId:string;preview:ProgramNativeHandoffPreview;choices:Record<string,CreatorUpdateChoice>},now:string):ProgramTransition<string>{
 const capture=captures.get(input.preview);if(!capture||capture.actorId!==input.actorId||data.activeActorId!==input.actorId)return programFailure(data,'forbidden');
 if(!validateProgramData(data)||!programIdentifier(input.requestId)||!Number.isFinite(Date.parse(now))||new Date(now).toISOString()!==now||!programSame(input.preview,capture.preview))return programFailure(data,'invalid');
 // Receipt identity contains no private before/after text or native payload.
 const fp=stableAuthoringJson({previewId:input.preview.id,draftId:input.preview.draftId,choices:input.choices}),receipt=data.receipts.find(r=>r.actorId===input.actorId&&r.id===input.requestId);
 if(receipt){if(receipt.kind!=='native-creator-handoff'||receipt.fingerprint!==fp)return programFailure(data,'duplicate-request');const target=data.spaces[input.actorId].creatorWorkspace?.nativeExecutionSources?.[input.preview.draftId];return target?.documentId===receipt.resultId&&M.getDocument(data.spaces[input.actorId].text,receipt.resultId)?programResult(data,data,receipt.resultId):programFailure(data,'conflict');}
 if(!programSame(data.spaces[input.actorId],capture.space)||Object.keys(input.choices).some(id=>!input.preview.rows.some(r=>r.itemId===id))||Object.values(input.choices).some(c=>Object.keys(c).sort().join(',')!=='children,date,source,time'||Object.values(c).some(v=>!['keep','incoming'].includes(v))))return programFailure(data,'conflict');
 if(!Object.values(input.choices).some(c=>Object.values(c).includes('incoming'))||!capture.owner&&!Object.values(input.choices).some(c=>c.source==='incoming'))return programResult(data,data,capture.owner?.documentId??'cancelled');
 if(!capture.owner&&!capture.preview.rows.some(row=>row.incomingKind!==null&&input.choices[row.itemId]?.source==='incoming'))return programResult(data,data,'cancelled');
 if(!capture.preview.rows.some(row=>{const choice=input.choices[row.itemId];return choice&&(choice.source==='incoming'&&(row.incomingKind!==null||row.mode==='retain'&&row.personal!=='')||row.fieldUpdatesAllowed&&Object.values(choice).includes('incoming'));}))return programResult(data,data,capture.owner?.documentId??'cancelled');
 const current=capture.owner?.revisions.at(-1),reuse=!!current&&current.contextRevision===capture.revision.contextRevision&&current.recordRevision===capture.revision.recordRevision&&programSame(current.nativeSelection,capture.revision.nativeSelection)&&programSame(current.anchor,capture.revision.anchor);
 if(data.receipts.length>=2000||!reuse&&capture.owner&&capture.owner.revisions.length>=100)return programFailure(data,'limit');
 const next=programClone(data),space=next.spaces[input.actorId],workspace=space.creatorWorkspace!,revision=programClone(reuse?current!:capture.revision);
 if(!capture.owner){space.text=M.addDocument(space.text,{title:capture.title,folderId:'folder-unfiled'});}
 const documentId=capture.owner?.documentId??space.text.documents.at(-1)!.id;
 const owner:ProgramNativeExecutionOwner=capture.owner?programClone(capture.owner):{version:1,id:programId('native-execution'),draftId:input.preview.draftId,documentId,currentRevisionId:revision.id,revisions:[],selections:{}};
 const previous=programNativeSelectedRows(owner);
 const retain=(row:ProgramNativeExecutionRow)=>{const found=block(space,row);if(!found)return false;let retainedId=space.retentionDocuments?.[documentId];if(!retainedId){space.text=M.addDocument(space.text,{title:`${capture.title} · 이전 제작 항목`,folderId:found.doc.folderId});retainedId=space.text.documents.at(-1)!.id;space.retentionDocuments??={};space.retentionDocuments[documentId]=retainedId;space.archivedDocumentIds.push(retainedId);}
  if(row.kind==='ordinary'){const moved=moveProgramPersonalTaskText(space.text,row.lineId,retainedId);if(!moved)return false;space.text=moved;}else{const original=M.getDocument(space.text,found.doc.id)!;original.lines.splice(found.start,found.end-found.start);M.getDocument(space.text,retainedId)!.lines.push(...found.lines);for(const b of space.text.bindings)if(b.docId===found.doc.id&&found.lines.some(l=>l.id===b.lineId))b.docId=retainedId;}return true;};
 const addExecutionScopes=(doc:NonNullable<ReturnType<typeof M.getDocument>>)=>{for(const item of M.parseDocument(doc,space.text).items){if(space.text.bindings.some(b=>b.kind==='task'&&b.lineId===item.id))continue;space.text.itemScopes[item.id]??=doc.folderId;if(item.isCanonical)space.text.taskScopes[item.id]=space.text.itemScopes[item.id];}};
 const archiveLines=(lines:TextLine[],title:string,folderId:string)=>{if(!lines.length)return;const doc={id:programId('native-retention'),title:`이전 제작 내용 · ${title}`.slice(0,200),folderId,folder:space.text.folders.find(f=>f.id===folderId)!.title,lines:[{id:programId('retained-native-parent'),text:`- [ ] ${title}`},...(/^ {4}/.test(lines[0].text)?[{id:programId('retained-native-context'),text:'  - 이전 내용:'}]:[]),...lines]};space.text.documents.push(doc);space.archivedDocumentIds.push(doc.id);for(const b of space.text.bindings)if(lines.some(l=>l.id===b.lineId))b.docId=doc.id;addExecutionScopes(doc);};
 const effectiveDocument=programNativeExecutionDocument(revision.nativeDocument);
 for(const view of input.preview.rows){const choice=input.choices[view.itemId],old=previous.find(s=>s.row.itemId===view.itemId&&s.disposition!=='ignored'),row=revision.rows.find(r=>r.itemId===view.itemId),item=row?effectiveDocument.parseResult.canonical.items.find(i=>i.itemId===programNativeSourceItemId(row)):undefined;
  if(!choice||!Object.values(choice).includes('incoming')){if(!owner.selections[view.itemId]&&row)owner.selections[view.itemId]={revisionId:revision.id,disposition:'ignored'};continue;}
  const sameTarget=!!old&&old.row.kind===row?.kind&&old.disposition==='active';
  // Independent fields cannot create an excluded/new target or switch its kind.
  if(choice.source!=='incoming'&&(!sameTarget||!item?.included))continue;
  if(!item?.included){if(old?.disposition==='active'&&!retain(old.row))return programFailure(data,'conflict');if(old)owner.selections[view.itemId]={...old.selection,disposition:'retained'};else if(row)owner.selections[view.itemId]={revisionId:revision.id,disposition:'ignored'};continue;}
  if(!row)return programFailure(data,'invalid');
  if(sameTarget&&old){
   const actual=block(space,old.row);if(!actual)return programFailure(data,'conflict');
   const beforeFields=nativeExecutionFields(old.row.lines),incomingFields=nativeExecutionFields(row.lines),fields=programClone(beforeFields),nextLines=programClone(actual.lines),retained:TextLine[]=[];
   const header={id:old.row.lineId,text:choice.source==='incoming'?row.lines[0].text:old.row.lines[0].text};
   if(choice.source==='incoming'&&row.kind!=='ordinary')nextLines[0].text=row.lines[0].text;
   const propertyFields:NativeField[]=row.kind==='ordinary'?['source','time']:['source','date','time','children'];
   for(const name of propertyFields){if(choice[name]!=='incoming')continue;
    const originals=beforeFields[name],ids=new Set(originals.map(l=>l.id));
    for(const original of originals){const personal=nextLines.find(l=>l.id===original.id);if(personal&&personal.text!==original.text)retained.push(personal);}
    const selected=incomingFields[name].map((line,index)=>{const prior=originals[index],personal=prior&&nextLines.find(l=>l.id===prior.id);return{id:prior&&prior.text===line.text&&personal?.text===line.text?prior.id:programId('native-execution-detail'),text:line.text};});
    for(let i=nextLines.length-1;i>=1;i--)if(ids.has(nextLines[i].id))nextLines.splice(i,1);
    nextLines.splice(1,0,...selected);fields[name]=selected;
   }
   if(choice.children==='incoming'&&row.kind==='ordinary'){
    const childRevision=owner.revisions.find(r=>r.id===(old.selection.childrenRevisionId??old.revision.id))!,childRow=childRevision.rows.find(r=>r.itemId===view.itemId)!,oldChildren=childRevision.nativeDocument.document.parseResult.canonical.items.find(i=>i.itemId===programNativeSourceItemId(childRow))?.subchecks??[],newChildren=item.subchecks??[],oldLines=beforeFields.children,selected:TextLine[]=[];
    // Exact canonical subcheck IDs, never text matching, preserve checked state and attached prose.
    for(const [index,child] of oldChildren.entries()){if(newChildren.some(c=>c.subcheckId===child.subcheckId))continue;const line=oldLines[index],start=line?nextLines.findIndex(l=>l.id===line.id):-1;if(start<0)continue;let end=start+1;while(end<nextLines.length&&!/^\s{0,2}- \[/.test(nextLines[end].text))end++;retained.push(...nextLines.splice(start,end-start));}
    for(const [index,child] of newChildren.entries()){const priorIndex=oldChildren.findIndex(c=>c.subcheckId===child.subcheckId),prior=oldLines[priorIndex],at=prior?nextLines.findIndex(l=>l.id===prior.id):-1;
     const line={id:at>=0?prior.id:programId('native-child'),text:incomingFields.children[index].text};selected.push(line);
     if(at>=0)nextLines[at]={id:line.id,text:nextLines[at].text.replace(/^(\s*- \[[^\]\r\n]*\]\s*).*/,(_,prefix)=>prefix+child.title)};else nextLines.push({...line});
    }fields.children=selected;
   }
   // Main-date/time updates use the existing task writer, preserving personal completion and history.
   M.getDocument(space.text,actual.doc.id)!.lines.splice(actual.start,actual.end-actual.start,...nextLines);
   addExecutionScopes(M.getDocument(space.text,actual.doc.id)!);
   if(retained.length)archiveLines(retained,item.title,actual.doc.folderId);
   if(row.kind==='ordinary'){
    const task=M.tasks(space.text).find(t=>t.id===old.row.lineId),patch:{title?:string;date?:string|null;time?:string}={};if(choice.source==='incoming'&&task?.title!==item.title)patch.title=item.title;if(choice.date==='incoming'&&task?.date!==view.sourceDate)patch.date=view.sourceDate;if(choice.time==='incoming'&&(task?.time??'')!==(view.sourceTime??''))patch.time=view.sourceTime??'';
    if(Object.keys(patch).length)space.text=M.updateTask(space.text,old.row.lineId,patch);
   }
   if(choice.date==='incoming')fields.date=programClone(incomingFields.date);
   const live=block(space,old.row)!;
   for(const name of ['date','time'] as const)if(choice[name]==='incoming')fields[name]=fields[name].map(line=>({...line,id:live.lines.find(l=>l.text===line.text)?.id??programId('native-execution-detail')}));
   const selection={...old.selection,revisionId:choice.source==='incoming'?revision.id:old.revision.id,disposition:'active' as const,execution:{lineId:old.row.lineId,lines:composeNativeExecutionLines(header,fields)}};
   for(const name of ['date','time','children'] as const){const fieldRevision=choice[name]==='incoming'?revision.id:(old.selection[`${name}RevisionId`]??old.revision.id);if(fieldRevision===selection.revisionId)delete selection[`${name}RevisionId`];else selection[`${name}RevisionId`]=fieldRevision;}
   owner.selections[view.itemId]=selection;
  }else{
   if(old?.disposition==='active'&&!retain(old.row))return programFailure(data,'conflict');
   // Returning/kind-changing items get a fresh execution identity; retained history is never recycled.
   const lineId=old?programId('native-execution-line'):row.lineId,lines=composeNativeExecutionLines({...row.lines[0],id:lineId},nativeExecutionFields(row.lines)).map((l,i)=>({id:i&&old?programId('native-execution-detail'):l.id,text:l.text}));
   const doc=M.getDocument(space.text,documentId)!;doc.lines.push(...programClone(lines));
   addExecutionScopes(doc);
   owner.selections[view.itemId]={revisionId:revision.id,disposition:'active',execution:{lineId,lines}};
  }
 }
 // A source revision is immutable even when later accepting another field/item from it.
 if(!reuse)owner.revisions.push(revision);
 if(reuse&&programSame(owner,capture.owner)&&programSame(space.text,capture.space.text))return programResult(data,data,documentId);
 owner.currentRevisionId=revision.id;workspace.nativeExecutionSources??={};workspace.nativeExecutionSources[owner.draftId]=owner;
 workspace.handoffs[owner.draftId]={documentId,recordRevision:revision.recordRevision,raw:M.raw(M.getDocument(space.text,documentId)),title:capture.title};
 next.receipts.push({actorId:input.actorId,id:input.requestId,kind:'native-creator-handoff',fingerprint:fp,resultId:documentId});
 return validateProgramData(next)?programResult(data,next,documentId):programFailure(data,'invalid');
}
