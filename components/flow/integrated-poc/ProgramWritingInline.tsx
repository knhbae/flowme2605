'use client';
import React,{useEffect,useRef,useState} from 'react';
import styles from './ProgramTextEditor.module.css';
import { programCalendarDate } from '@/lib/flow/integrated-poc/date-label';
/** W5: the dialog title names the parent ("‘…’ 아래 하위 할 일"); here one small line says the date and folder. */
export function ProgramWritingInline(props:{parentTitle:string;date:string|null;scope:string;initialKind?:'memo'|'task';memo:string;readDraft:(kind:'memo'|'task')=>string|undefined;remember:(kind:'memo'|'task',text:string)=>void;onSubmit:(kind:'memo'|'task',text:string)=>Promise<boolean>}){
 const[kind,setKind]=useState<'memo'|'task'|null>(props.initialKind??null),[text,setText]=useState('');const area=useRef<HTMLTextAreaElement>(null),composing=useRef(false);
 useEffect(()=>{if(!kind)return;setText(props.readDraft(kind)??(kind==='memo'?props.memo:''));queueMicrotask(()=>area.current?.focus());},[kind]);
 const submit=async()=>{if(composing.current||!kind||!text.trim())return;props.remember(kind,text);await props.onSubmit(kind,text);};
 return <section className={styles.authoringInline} aria-label={`${props.parentTitle} 바로 아래 추가`}>
  {!kind?<div className={styles.choices}><button type="button" onClick={()=>setKind('memo')}>{props.memo?'메모 이어 쓰기':'메모 추가'}</button><button type="button" onClick={()=>setKind('task')}>하위 할 일 추가 <small>날짜·진행을 따로 기록</small></button></div>:<>
   <p>{kind==='task'?[props.date?programCalendarDate(props.date, ''):'날짜 미정',props.scope].filter(Boolean).join(' · '):'부모의 메모 · 독립 할 일로 만들지 않음'}</p>
   <textarea ref={area} aria-label={kind==='task'?'새 하위 할 일 본문':'부모 메모 본문'} rows={4} value={text} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onChange={event=>{setText(event.target.value);props.remember(kind,event.target.value);}} />
   <button type="button" disabled={!text.trim()} onClick={()=>{void submit();}}>{kind==='memo'?'메모 반영':'하위 할 일 추가'}</button>
  </>}
 </section>;
}
