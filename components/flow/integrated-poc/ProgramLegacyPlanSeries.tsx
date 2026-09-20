'use client';
import React, { useEffect, useRef, useState } from 'react';
import type { ProgramData } from '@/lib/flow/integrated-poc/contract';
import { programId } from '@/lib/flow/integrated-poc/contract';
import { readProgramLegacyPlan, programLegacySeriesAnchorBasis } from '@/lib/flow/integrated-poc/program-legacy-plan';
import { readProgramOccurrencePeriod, type ProgramExecutionOccurrenceRow } from '@/lib/flow/integrated-poc/recurrence-state';
import { prepareProgramRecurrencePlan } from '@/lib/flow/integrated-poc/program-recurrence-plan-state';
import { readProgramRecurrencePlan } from '@/lib/flow/integrated-poc/program-recurrence-plan';
import { previewProgramLegacySeriesPlan, type ProgramLegacySeriesChoice, type ProgramLegacySeriesPreview } from '@/lib/flow/integrated-poc/program-legacy-series-plan';
import { programLocalDate, programShiftDate } from '@/lib/flow/integrated-poc/execution';
import { programRecurrencePlanIssue } from './ProgramRecurrencePlan';
import styles from './ProgramLegacyPlan.module.css';

type Read = Extract<ReturnType<typeof readProgramLegacyPlan>, {ok:true}>;
type Props = {data:ProgramData;read:Read;anchor?:string;included:string[];choices?:Record<string,ProgramLegacySeriesChoice>;disabled?:boolean;canEdit?:()=>boolean;
 onChange:(choices:Record<string,ProgramLegacySeriesChoice>)=>void;onCapture?:(itemRef:string,raw:string|null)=>void};
export function programLegacyRelativeSeries(read:Read) {
 return read.flow.items.filter(item=>programLegacySeriesAnchorBasis(read,item)==='flow-anchor');
}
export function ProgramLegacyPlanSeries(props:Props) {
 const items=programLegacyRelativeSeries(props.read);
 if(!props.anchor||props.anchor===props.read.personalAnchor||!items.length)return null;
 return <div className={styles.series}><h4>함께 바꿀 상대 반복 계획</h4>{items.map(item=><ProgramLegacySeriesItem key={`${item.ref}:${props.anchor}:${props.included.includes(item.ref)}`} {...props} itemRef={item.ref} title={item.title}/>)}</div>;
}
function ProgramLegacySeriesItem(props:Props&{itemRef:string;title:string}) {
 const today=programLocalDate(new Date()),start=props.read.rows.find(row=>row.itemRef===props.itemRef)?.sourceDate??today;
 const [date,setDate]=useState(start),[range,setRange]=useState({from:start,to:programShiftDate(start,34)??start});
 const [editing,setEditing]=useState<{row:ProgramExecutionOccurrenceRow;choice:ProgramLegacySeriesChoice;scope:''|'whole_series'|'future_series'}|null>(null);
 const [error,setError]=useState(''),ime=useRef(false),live=useRef(props);live.current=props;
 const blocked=()=>!!live.current.disabled||live.current.canEdit?.()===false;
 const selected=props.choices?.[props.itemRef],included=props.included.includes(props.itemRef),wasIncluded=props.read.rows.find(r=>r.itemRef===props.itemRef)?.included;
 const read=readProgramOccurrencePeriod(props.data,{actorId:props.data.activeActorId,flowRef:props.read.flow.ref,localToday:today,...range,includeHeld:true,includeExcluded:true});
 const rows=read.ok?read.rows.filter(row=>row.sourceItemRef===props.itemRef):[];
 const changeEditing=(value:typeof editing)=>{if(blocked())return;setEditing(value);live.current.onCapture?.(props.itemRef,value?JSON.stringify({title:props.title,...value.choice,scope:value.scope}):null);};
 useEffect(()=>()=>live.current.onCapture?.(props.itemRef,null),[props.itemRef]);
 const begin=(row:ProgramExecutionOccurrenceRow)=>{if(blocked()||ime.current)return;const at=new Date().toISOString();
  const ready=prepareProgramRecurrencePlan(props.data,{actorId:props.data.activeActorId,flowRef:props.read.flow.ref,sourceIdentity:row.identity,ownerId:row.personalPlan?.ownerId??programId('plan'),localToday:today,now:at});
  if(!ready.ok){setError(programRecurrencePlanIssue(ready.reason));return;}
  changeEditing({row,scope:'',choice:{ownerId:ready.value.owner.ownerId,expectedOwner:ready.value.expectedOwner,sourceIdentity:row.identity,...(row.personalPlan?{personalIdentity:row.personalPlan.identity}:{}),originalDate:row.originalDate,scope:'future_series',targetDate:'',at}});setError('');
 };
 const confirm=()=>{if(!editing||!editing.scope||!editing.choice.targetDate||blocked()||ime.current)return;
  const choice={...editing.choice,scope:editing.scope};const preview=previewProgramLegacySeriesPlan(props.data,{actorId:props.data.activeActorId,flowRef:props.read.flow.ref,itemRef:props.itemRef,localToday:today,choice});
  if(!preview.ok){setError(programRecurrencePlanIssue(preview.reason));return;}
  props.onChange({...props.choices,[props.itemRef]:choice});changeEditing(null);setError('');
 };
 const delta=props.anchor&&props.read.personalAnchor?Math.round((Date.parse(props.anchor)-Date.parse(props.read.personalAnchor))/86400000):null;
 const suggested=editing&&delta!==null?programShiftDate(editing.row.executionDate??editing.row.originalDate,delta):null;
 return <fieldset disabled={props.disabled} onCompositionStart={()=>{ime.current=true;}} onCompositionEnd={()=>{ime.current=false;}}><legend>{props.title}</legend>
 {!included?<p>이 반복 항목은 제외합니다. 원문과 회차 기록은 남기고 새 반복 계획은 만들지 않습니다.</p>:!wasIncluded?<p role="status">제외한 반복은 먼저 기준일을 유지한 채 다시 포함해 주세요. 저장 후 기준일 변경을 검토할 수 있습니다.</p>:<>
 {selected&&<p>선택한 회차 {selected.originalDate} → {selected.targetDate} · {selected.scope==='whole_series'?'전체 반복 계획':'이 회차부터'} <button type="button" onClick={()=>{if(blocked()||ime.current)return;const next={...props.choices};delete next[props.itemRef];props.onChange(next);}}>반복 선택 지우기</button></p>}
 <label>찾을 회차의 날짜<input type="date" value={date} onChange={e=>{if(!blocked())setDate(e.target.value);}}/></label><button type="button" onClick={()=>{if(blocked()||ime.current||!date)return;setRange({from:date,to:programShiftDate(date,34)??date});}}>이 날짜부터 회차 찾기</button>
 <p>{range.from}~{range.to}의 회차입니다. 이 조회 범위가 반복의 끝은 아닙니다.</p>
 {!read.ok?<p role="alert">회차를 읽지 못했습니다. 원문 상태를 확인해 주세요.</p>:<>{rows.length===0&&<p>이 기간에는 선택할 회차가 없습니다. 다른 날짜를 조회해 주세요.</p>}<ul>{rows.map(row=><li key={row.key}><button type="button" onClick={()=>begin(row)}>{row.executionDate??'미정'} · {row.personalPlan?'개인 계획':'원래 계획'}{row.completion==='completed'?' · 완료':''}{row.participation!=='included'?' · 보류/제외':''}</button></li>)}</ul>{read.truncated&&<p role="status">조회 상한에 도달했습니다. 이 범위 뒤의 회차는 확인하지 못했습니다.</p>}</>}
 {editing&&<div aria-label={`${props.title} 회차 변경 선택`} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();if(!blocked()&&!ime.current){changeEditing(null);setError('');}}}}>
 <p>선택한 회차 {editing.row.originalDate} · 현재 실행 날짜 {editing.row.executionDate??'미정'}</p>
 <fieldset><legend>바꿀 범위</legend>{(['whole_series','future_series'] as const).map(scope=><label key={scope}><input type="radio" name={`series-scope-${props.itemRef}`} checked={editing.scope===scope} onChange={()=>changeEditing({...editing,scope})}/>{scope==='whole_series'?'전체 반복 계획':'이 회차부터'}</label>)}</fieldset>
 <p>이미 실행한 기록이 있으면 과거 계획·기록은 남기고 선택한 회차부터 새 계획을 만듭니다.</p>
 <label>선택한 회차의 새 날짜<input type="date" value={editing.choice.targetDate} onChange={e=>changeEditing({...editing,choice:{...editing.choice,targetDate:e.target.value}})}/></label>
 {suggested&&<button type="button" onClick={()=>changeEditing({...editing,choice:{...editing.choice,targetDate:suggested}})}>기준일 차이로 제안된 {suggested} 사용</button>}
 <button type="button" disabled={props.disabled||!editing.scope||!editing.choice.targetDate} onClick={confirm}>이 회차 선택 확인</button><button type="button" onClick={()=>{if(!blocked()&&!ime.current){changeEditing(null);setError('');}}}>회차 선택 취소</button>
 </div>}
 </>}{error&&<p role="alert">{error}</p>}
 </fieldset>;
}
export function ProgramLegacySeriesComparison({receipts,titles}:{receipts:ProgramLegacySeriesPreview[];titles:Record<string,string>}){
 return <>{receipts.filter(r=>r.preview).map(r=>{const p=r.preview!,start=p.operation.targetDate,end=programShiftDate(start,34)??start,after=readProgramRecurrencePlan(p.after,{start,end});return <details key={r.itemRef}><summary>{titles[r.itemRef]} · {p.operation.target.currentDate} → {start} · {p.operation.scope==='whole_series'?'전체 반복 계획':'이 회차부터'}</summary><p>이전 원문과 개인 기록은 보관합니다. 새 계획 미리보기 {start}~{end}.</p>{after.ok?<><ul>{after.value.personalOccurrences.slice(0,8).map(row=><li key={row.occurrenceId}>{row.localDate??'미정'}{row.scheduleProjection.startTime?` · ${row.scheduleProjection.startTime}`:''}{row.scheduleProjection.timeZone?` · ${row.scheduleProjection.timeZone}`:''}</li>)}</ul>{(after.value.truncated||after.value.personalOccurrences.length>8)&&<p>일부 회차만 표시했습니다. 적용 후 기간 보기에서 다른 날짜를 확인할 수 있습니다.</p>}</>:<p>미리보기 회차를 읽지 못했습니다.</p>}</details>;})}</>;
}
