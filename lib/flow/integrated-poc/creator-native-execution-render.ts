import type {TextLine} from './text-workspace';
import type {NativeCreatorDocumentOwner} from './native-creator-document-contract';
import {programNativeExecutionItemFacts} from './creator-native-execution-facts';
export type NativeItem=NativeCreatorDocumentOwner['document']['parseResult']['canonical']['items'][number];
export type NativeField='source'|'date'|'time'|'children';
/** Shared deterministic rendering: the validator checks the exact projection, not only IDs. */
export function nativeExecutionTexts(item:NativeItem,date:string|null|undefined){
 const facts=programNativeExecutionItemFacts(item),kind=facts.kind;
 const texts=[kind==='ordinary'?`- [ ] ${item.title}`:kind==='series'?`반복 규칙: ${item.title}`:`${item.role}: ${item.title}`];
 const property=(label:string,value:string|undefined|null)=>{if(value)texts.push(...value.split(/\r\n?|\n/).map((part,index)=>index?`    ${part}`:`  - ${label}: ${part}`));};
 property('설명',item.detail);property('완료 기준',item.completion?.doneWhen);
 property('날짜',date);property('시간',facts.time);property('시간대',facts.timeZone);
 for(const p of item.properties.filter(p=>!['date','relative_date','time','timezone','resource','source'].includes(p.key)))property(p.label,p.value);
 for(const link of item.resources)property('자료',link.url);for(const link of item.sources)property('출처',link.url);
 for(const guide of item.guides)property('안내',guide);for(const caution of item.cautions)property('주의',caution);
 for(const child of item.subchecks??[])texts.push(kind==='ordinary'?`  - [ ] ${child.title}`:`  - 세부 확인: ${child.title}`);
 return texts;
}
export function nativeExecutionFields(lines:readonly TextLine[]):Record<NativeField,TextLine[]>{
 const fields:Record<NativeField,TextLine[]>={source:[],date:[],time:[],children:[]};let field:NativeField='source';
 lines.forEach((line,index)=>{if(index===0)return;const key=/^\s+- ([^:]+):/.exec(line.text)?.[1];
  if(/^\s+- \[/.test(line.text)||key==='세부 확인')field='children';else if(key)field=key==='날짜'?'date':['시간','시간대'].includes(key)?'time':'source';
  fields[field].push(line);
 });return fields;
}
export function composeNativeExecutionLines(header:TextLine,fields:Record<NativeField,readonly TextLine[]>):TextLine[]{
 return [header,...fields.source,...fields.date,...fields.time,...fields.children].map(line=>({...line}));
}
