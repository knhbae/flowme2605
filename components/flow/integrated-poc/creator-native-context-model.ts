import type {NativeCreatorDocumentOwner} from '../../../lib/flow/integrated-poc/native-creator-document-contract';
import {readNativeCreatorDocument} from '../../../lib/flow/integrated-poc/native-creator-document';
import {allowedAuthoringIssueOutcomes,authoringIssueState} from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/issue-state';
import type {AuthoringWorkingTextItemPatch,CanonicalAuthoringItem,TextAuthoringDocument} from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/types';

/** D2 ItemInspector/view-model contract, adapted without mounting its storage host. */
export const nativeInspectorLabels:Record<keyof AuthoringWorkingTextItemPatch,string>={title:'제목',detail:'설명',completion:'완료 기준',date:'날짜',relativeDate:'상대 날짜',time:'시간',timezone:'시간대',place:'장소',duration:'소요 시간',repeat:'반복',repeatEnd:'반복 종료',condition:'실행 조건',resource:'자료',source:'출처',guide:'안내',caution:'주의'};
const propertyLabels:Record<Exclude<keyof AuthoringWorkingTextItemPatch,'title'>,string[]>={detail:['설명'],completion:['완료 기준'],date:['날짜'],relativeDate:['상대 날짜'],time:['시간'],timezone:['시간대'],place:['장소'],duration:['소요 시간','소요시간'],repeat:['반복'],repeatEnd:['반복 종료'],condition:['실행 조건','조건'],resource:['자료'],source:['출처'],guide:['안내'],caution:['주의']};
export const nativeIssueOutcomeLabels={keep_source_only:'원문에만 유지',hold:'나중에 결정',convert_to_item:'할 일로 만들기'} as const;
const issueLabels:Record<string,string>={unsupported_syntax:'아직 해석하지 않은 문법',unknown_property:'확인할 속성',unsupported_nested_item:'확인할 하위 항목',ambiguous_role:'문장의 용도 확인',missing_parent:'상위 연결 확인',invalid_date:'날짜 확인',invalid_url:'링크 확인',invalid_recurrence:'반복 규칙 확인',source_import_required:'원문 보완 필요',rights_review_required:'권리 검토 필요',safety_review_required:'안전 검토 필요'};
export function nativeIssueViews(document:TextAuthoringDocument){return document.parseResult.issues.map(issue=>({issue,label:issueLabels[issue.type]??'원문 확인',state:authoringIssueState(issue),outcomes:allowedAuthoringIssueOutcomes(issue),raw:issue.sourceRowIds.map(id=>document.parseResult.canonical.sourceRows.find(row=>row.sourceRowId===id)?.rawText??`원문 행을 찾지 못함: ${id}`).join('\n')}));}
export function nativeItemSourceRows(document:TextAuthoringDocument,item:CanonicalAuthoringItem){return document.parseResult.canonical.sourceRows.filter(row=>item.sourceRowIds.includes(row.sourceRowId)).sort((a,b)=>a.order-b.order);}
export function nativeInspectorPatch(document:TextAuthoringDocument,item:CanonicalAuthoringItem):AuthoringWorkingTextItemPatch{
 const property=(key:string)=>[...item.properties].reverse().find(p=>p.key===key)?.value??'';
 const rows=nativeItemSourceRows(document,item),sourceValue=(labels:string[])=>rows.filter(r=>r.state!=='tombstone').flatMap(r=>{const match=/^ {2}- ([^:：]+)[:：]\s*(.*)$/u.exec(r.rawText);return match&&labels.includes(match[1].trim())?[match[2].trim()]:[];}).join('\n');
 const structural=new Set(['date','relative_date','time','timezone','place','duration','repeat','repeat_end','condition','resource','source']),preserved=new Set<string>();
 for(const p of item.properties)if(!structural.has(p.key))preserved.add(`${p.label}: ${p.value}`.trim());
 for(const row of rows)if(row.rowType==='property'){const normalized=row.rawText.trim().replace(/^[-*+]\s+/u,'').trim();if(/^[^:：]{1,32}[:：]\s*.*$/u.test(normalized))preserved.add(normalized);}
 const schedule=item.schedule;
 return{title:item.title,detail:(item.detail??'').split(/\r?\n/u).filter(line=>!preserved.has(line.trim())).join('\n').trim(),completion:item.completion?.doneWhen??'',date:schedule?.kind==='absolute'?schedule.date:property('date'),relativeDate:schedule?.kind==='relative'?schedule.raw:property('relative_date'),time:schedule?.time??property('time'),timezone:schedule?.timezone??property('timezone'),place:property('place'),duration:schedule?.durationMinutes!=null?`${schedule.durationMinutes}분`:property('duration'),repeat:schedule?.repeat??property('repeat'),repeatEnd:property('repeat_end'),condition:property('condition'),resource:sourceValue(['자료'])||property('resource')||item.resources.map(r=>r.url||r.label).join(', '),source:sourceValue(['출처'])||property('source')||item.sources.map(r=>r.url||r.label).join(', '),guide:sourceValue(['안내','가이드'])||item.guides.join('\n'),caution:sourceValue(['주의','경고'])||item.cautions.join('\n')};
}
export function nativeInspectorUnsafeReason(document:TextAuthoringDocument,item:CanonicalAuthoringItem,patch:AuthoringWorkingTextItemPatch):string|undefined{
 const raw=nativeItemSourceRows(document,item).map(r=>r.rawText).join('\n'),before=nativeInspectorPatch(document,item);
 if(item.role!=='item')return '할 일이 아닌 행은 여기서 일부 속성만 수정하지 않습니다. 연결된 원문에서 수정해 주세요.';
 if(/^\s*\|.*\|\s*$/mu.test(raw)||raw.includes('\t'))return '표와 탭 원문은 일부 셀만 수정하지 않습니다. 연결된 원문에서 수정해 주세요.';
 const changed=(Object.keys(before) as (keyof AuthoringWorkingTextItemPatch)[]).filter(key=>before[key]!==patch[key]);
 for(const key of changed){if(key==='title'){if(!patch.title.trim())return '제목은 비워 둘 수 없습니다.';if(raw.split(/\r?\n/u).filter(line=>/^- \[[ xX]\] /u.test(line)).length!==1)return '원문에서 유일한 할 일 제목을 찾을 수 없습니다.';continue;}
  const count=raw.split(/\r?\n/u).filter(line=>propertyLabels[key].some(label=>line.startsWith(`  - ${label}:`))).length;
  // D2 can add ordinary properties, but preserves the stricter provenance
  // contract for resource/source/guide/caution. Its operation still validates
  // the full block, mappings, subchecks and every unrelated source row.
  if(count>1)return `‘${nativeInspectorLabels[key]}’이 여러 번 선언돼 있습니다. 연결된 원문에서 수정해 주세요.`;
  if(['source','resource','guide','caution'].includes(key)&&count!==1)return `‘${nativeInspectorLabels[key]}’ 추가는 연결된 원문에서 해 주세요.`;
  if((key==='source'||key==='resource')&&(patch[key].match(/https?:\/\/[^\s)]+/gu)??[]).length!==1)return '자료·출처는 원문 한 줄의 HTTP(S) 링크 한 개만 수정할 수 있습니다.';
 }
 if(patch.date.trim()){const date=patch.date.trim(),parsed=new Date(`${date}T00:00:00Z`);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)return '날짜는 실제 존재하는 YYYY-MM-DD로 입력해 주세요.';}
 return undefined;
}
export function nativeSplitBoundaries(title:string){return [...title.matchAll(/\s+/gu)].map(m=>m.index!+m[0].length).map(at=>({at,left:title.slice(0,at).trim(),right:title.slice(at).trim()})).filter(b=>b.left&&b.right);}
type CalendarAlignment={differs:boolean;orderedItemIds:string[];beforeTitles:string[];afterTitles:string[]};
const alignmentCache=new WeakMap<NativeCreatorDocumentOwner,CalendarAlignment>();
/** Same first actual Calendar row rank and per-Step stable undated tail as D2. */
export function nativeCalendarAlignment(owner:NativeCreatorDocumentOwner){
 const cached=alignmentCache.get(owner);if(cached)return cached;
 const read=readNativeCreatorDocument(owner);if(!read.ok||!read.projection.artifacts.calendar.eligible)return{differs:false,orderedItemIds:[] as string[],beforeTitles:[] as string[],afterTitles:[] as string[]};
 const rank=new Map<string,number>();read.projection.artifacts.calendar.rows.forEach((row,i)=>{if(!rank.has(row.itemId))rank.set(row.itemId,i);});
 const byId=new Map(read.document.parseResult.canonical.items.map(item=>[item.itemId,item])),beforeTitles:string[]=[],afterTitles:string[]=[];let differs=false;
 const orderedItemIds=[...read.document.parseResult.canonical.steps].sort((a,b)=>a.order-b.order).flatMap(step=>{const source=step.itemIds.filter(id=>byId.has(id));const sorted=source.map((id,index)=>({id,index,rank:rank.get(id)})).sort((a,b)=>a.rank===undefined&&b.rank===undefined?a.index-b.index:a.rank===undefined?1:b.rank===undefined?-1:a.rank-b.rank).map(r=>r.id);if(sorted.some((id,i)=>id!==source[i]))differs=true;beforeTitles.push(...source.map(id=>byId.get(id)!.title));afterTitles.push(...sorted.map(id=>byId.get(id)!.title));return sorted;});
 const result={differs,orderedItemIds,beforeTitles,afterTitles};alignmentCache.set(owner,result);return result;
}
