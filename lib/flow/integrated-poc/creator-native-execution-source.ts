import type {ProgramPrivateSpace} from './contract';
import {programDocumentContentLock} from './reference-execution-guard';
import {programNativeSelectedRows,validateProgramNativeExecutionSources} from './creator-native-execution-validation';
import {programNativeExecutionRef,programNativeItemRef,type ProgramNativeExecutionOwner} from './creator-native-execution-contract';
import {readNativeCreatorDocument} from './native-creator-document';
import {stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';
import type {AuthoringRecurrenceRule} from './native-creator-vendor/text-authoring/types';
import {programNativeExecutionItemFacts} from './creator-native-execution-facts';
import {programNativeSourceItemId} from './creator-native-execution-identity';
export function resolveProgramNativeExecutionSource(space:ProgramPrivateSpace,flowRef:string){
 const sources=space.creatorWorkspace?.nativeExecutionSources;
 if(!sources)return null;
 if(!validateProgramNativeExecutionSources(sources,space,space.creatorWorkspace!.library.records))return{ok:false as const,reason:'invalid-native-source'};
 const owners=Object.values(sources).filter(owner=>programNativeExecutionRef(owner.id)===flowRef);if(!owners.length)return null;if(owners.length!==1)return{ok:false as const,reason:'ambiguous-native-source'};
 return resolveNativeOwner(space,owners[0]);
}
export function resolveNativeOwner(space:ProgramPrivateSpace,owner:ProgramNativeExecutionOwner){
 const selected=programNativeSelectedRows(owner).filter(s=>s.disposition==='active'),current=owner.revisions.at(-1)!;
 const cache=new Map<string,ReturnType<typeof readNativeCreatorDocument>>();
 const items:{ref:string;itemId:string;title:string;description:string;sourceDate:string|null}[]=[];
 const contexts=new Map<string,{attributes:{date:string|null;resolvedDate:string|null;time:string|null;timeZone:string|null;recurrence:string|null;recurrenceEnd:string|null;resourceUrl:string|null;sourceUrl:string|null;nativeRule:AuthoringRecurrenceRule|null};nativeItem:typeof current.nativeDocument.document.parseResult.canonical.items[number]}>();
 const rows:typeof selected=[];
 for(const entry of selected){let read=cache.get(entry.revision.id);if(!read){read=readNativeCreatorDocument(entry.revision.nativeDocument,entry.revision.anchor?{anchor:entry.revision.anchor}:{});cache.set(entry.revision.id,read);}if(!read.ok)return{ok:false as const,reason:'invalid-native-projection'};
  const item=read.document.parseResult.canonical.items.find(item=>item.itemId===programNativeSourceItemId(entry.row));if(!item||!item.included)return{ok:false as const,reason:'missing-native-item'};
  const fieldRead=(revisionId:string|undefined)=>{const revision=owner.revisions.find(r=>r.id===(revisionId??entry.revision.id));if(!revision)return null;let result=cache.get(revision.id);if(!result){result=readNativeCreatorDocument(revision.nativeDocument,revision.anchor?{anchor:revision.anchor}:{});cache.set(revision.id,result);}return result.ok?result:null;};
  const dateRead=fieldRead(entry.selection.dateRevisionId),timeRead=fieldRead(entry.selection.timeRevisionId);if(!dateRead||!timeRead)return{ok:false as const,reason:'invalid-native-field-source'};
  const fieldSourceId=(revisionId:string|undefined)=>{const row=owner.revisions.find(r=>r.id===(revisionId??entry.revision.id))?.rows.find(r=>r.itemId===entry.row.itemId);return row?programNativeSourceItemId(row):null;};
  const dateItem=dateRead.document.parseResult.canonical.items.find(i=>i.itemId===fieldSourceId(entry.selection.dateRevisionId)),timeItem=timeRead.document.parseResult.canonical.items.find(i=>i.itemId===fieldSourceId(entry.selection.timeRevisionId));if(!timeItem||!dateItem)return{ok:false as const,reason:'missing-native-field-source'};
  const facts=programNativeExecutionItemFacts(item,entry.revision.anchor),timeFacts=programNativeExecutionItemFacts(timeItem),dateRevision=owner.revisions.find(r=>r.id===(entry.selection.dateRevisionId??entry.revision.id))!;
  const ref=programNativeItemRef(owner.id,entry.row.itemId),date=programNativeExecutionItemFacts(dateItem,dateRevision.anchor).date;
  items.push({ref,itemId:entry.row.itemId,title:item.title,description:item.detail??'',sourceDate:date});rows.push(entry);
  contexts.set(ref,{nativeItem:item,attributes:{date,resolvedDate:date,time:timeFacts.time,timeZone:timeFacts.timeZone,
   recurrence:facts.rule?.raw??null,recurrenceEnd:facts.rule?.end?.raw??null,nativeRule:facts.rule,resourceUrl:item.resources[0]?.url??null,sourceUrl:item.sources[0]?.url??read.document.sourceUrl??null}});
 }
 const flow={ref:programNativeExecutionRef(owner.id),title:current.nativeDocument.document.title,items};
 return{ok:true as const,kind:'native' as const,workspaceId:owner.id,owner,revision:current,selected:rows,flow,contexts,inactive:programDocumentContentLock(space,owner.documentId)!=='active',
  sourceRevisionToken:stableAuthoringJson({native:{ownerId:owner.id,selections:owner.selections},flow,contexts:Object.fromEntries(contexts)}),originalExceptions:[] as {sourceItemRef:string;originalDate:string}[]};
}
