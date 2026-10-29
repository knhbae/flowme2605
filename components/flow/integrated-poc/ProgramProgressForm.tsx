'use client';

import React,{useId} from 'react';
import styles from './ProgramTextEditor.module.css';

/** The existing writing form, shared without importing native editor mutations. */
export function ProgramProgressForm(props:{title?:string;date:string;percent:string;history:{date:string;percent:number}[];disabled:boolean;locked?:boolean;inputsRef?:React.RefObject<HTMLFieldSetElement|null>;onDate:(value:string)=>void;onPercent:(value:string)=>void;onHistory:(date:string)=>void;onSubmit:()=>void}){
 const hintId=useId();
 const fields=<>
  <p>{props.title}</p><label>기록 날짜<input type="date" required value={props.date} onChange={event=>props.onDate(event.target.value)}/></label>
  <label>그날까지의 누적 진행률<input inputMode="decimal" required value={props.percent} onChange={event=>props.onPercent(event.target.value)} aria-describedby={hintId}/></label>
  <small id={hintId}>20, 20%, 0.2는 20%입니다. 날짜별 값을 더하지 않습니다.</small>
  <div className={styles.quickProgress}>{[0,20,50,100].map(value=><button type="button" key={value} onClick={()=>props.onPercent(String(value))}>{value}%</button>)}</div>
  <button type="submit" disabled={props.disabled}>진행 저장</button>
  {props.history.length>0&&<details><summary>날짜별 기록</summary><div className={styles.choices}>{props.history.map(record=><button type="button" key={record.date} onClick={()=>props.onHistory(record.date)}>{record.date}<span>{record.percent}%</span></button>)}</div></details>}
 </>;
 return <form onSubmit={event=>{event.preventDefault();props.onSubmit();}}>{props.inputsRef?<fieldset ref={props.inputsRef} disabled={props.locked} style={{border:0,padding:0,margin:0,minWidth:0}}>{fields}</fieldset>:fields}</form>;
}
