'use client';

import React, {useMemo,useRef,useState} from 'react';
import type {ProgramData,ProgramTransition} from '@/lib/flow/integrated-poc/contract';
import {textWorkspaceModel as M} from '@/lib/flow/integrated-poc/text-workspace';
import {previewPersonalRounds,documentRepeatSeries,describePersonalRepeatRule,type PersonalTaskDate,type PersonalRepeatRule,type PersonalFlowVersion,type PersonalSeriesOwner,type PersonalStandaloneExecution} from '@/lib/flow/integrated-poc/personal-authoring';
import {capturePersonalVersion,createPersonalFlow,savePersonalVersion,connectPersonalFlow,startPersonalFlow,setPersonalRepeat,stopPersonalRepeat,startPersonalRound,changePersonalAnchor} from '@/lib/flow/integrated-poc/personal-authoring-commands';
import styles from './ProgramSpace.module.css';

type AuthoringCommand=(label:string,build:(data:ProgramData)=>ProgramTransition<string>,open?:boolean)=>Promise<void>;
/** The parent keys this form by the selected target, never by a server rule revision. */
export function PersonalRepeatForm(props:{today:string;target:string;flowId:string;version?:PersonalFlowVersion|null;versionId?:string;series?:PersonalSeriesOwner;disabled:boolean;onCommand:AuthoringCommand;children?:React.ReactNode}){
 const saved=props.series?.ruleVersions.find(v=>v.id===props.series!.currentRuleVersionId)?.rule;
 const [fields,setFields]=useState(()=>({frequency:saved?.kind??'daily',weekdays:saved?.kind==='weekdays'?[...saved.weekdays]:[1,3,5],start:saved?.startDate??props.today,endKind:saved?.end.kind??'count',count:saved?.end.kind==='count'?saved.end.count:4,until:saved?.end.kind==='until'?saved.end.date:props.today}));
 const {frequency,weekdays,start,endKind,count,until}=fields;
 const rule:PersonalRepeatRule={...(frequency==='daily'?{kind:'daily' as const}:{kind:'weekdays' as const,weekdays}),startDate:start,end:endKind==='count'?{kind:'count',count}:{kind:'until',date:until}};
 const preview=props.version?previewPersonalRounds(props.version,{rule,materialized:props.series?.rounds??[],targetKind:props.target==='flow'?'flow':'task'}):null;
 return <fieldset disabled={props.disabled}><legend>{props.series?'저장된 규칙':'새 반복 · 기본값 매일 4회'}</legend>{props.children}
  <label>주기<select aria-label="반복 주기" value={frequency} onChange={event=>setFields(previous=>({...previous,frequency:event.target.value as 'daily'|'weekdays'}))}><option value="daily">매일</option><option value="weekdays">선택 요일</option></select></label>
  {frequency==='weekdays'&&<div>{['일','월','화','수','목','금','토'].map((name,index)=><label key={name}><input type="checkbox" aria-label={`반복 ${name}요일`} checked={weekdays.includes(index)} onChange={event=>setFields(previous=>({...previous,weekdays:event.target.checked?[...previous.weekdays,index]:previous.weekdays.filter(day=>day!==index)}))}/>{name}</label>)}</div>}
  <label>시작일<input type="date" aria-label="반복 시작일" value={start} onChange={event=>setFields(previous=>({...previous,start:event.target.value}))}/></label>
  <label>종료 방식<select aria-label="반복 종료 방식" value={endKind} onChange={event=>setFields(previous=>({...previous,endKind:event.target.value as 'count'|'until'}))}><option value="count">횟수</option><option value="until">종료일</option></select></label>
  {endKind==='count'?<label>횟수<input type="number" aria-label="반복 횟수" min={1} max={12} value={count} onChange={event=>setFields(previous=>({...previous,count:Number(event.target.value)}))}/></label>:<label>종료일<input type="date" aria-label="반복 종료일" value={until} onChange={event=>setFields(previous=>({...previous,until:event.target.value}))}/></label>}
  {!props.target?<p>반복할 대상을 먼저 고르세요.</p>:preview?.ok?<p>미리보기 {preview.value.rounds.map(round=>`${round.anchorDate} (${round.items.length}개)`).join(' · ')||'남은 회차 없음'}</p>:<p>미리보기를 만들 수 없습니다. 날짜·횟수와 중복 반복 대상을 확인해 주세요.</p>}
  <button type="button" disabled={!props.target||!preview?.ok} onClick={()=>void props.onCommand('반복 규칙 저장',data=>setPersonalRepeat(data,{...(props.target==='flow'?{flowId:props.flowId}:{taskId:props.target}),seriesId:props.series?.id,versionId:props.versionId,rule}))}>{props.series?'미생성 회차 규칙 변경':'반복 설정 저장'}</button>
  {props.series&&<><button type="button" onClick={()=>void props.onCommand('반복 중지',data=>stopPersonalRepeat(data,props.series!.id))}>미생성 회차 중지</button>{preview?.ok&&preview.value.rounds.map(round=><button key={round.anchorDate} type="button" onClick={()=>void props.onCommand('반복 회차 시작',data=>startPersonalRound(data,{seriesId:props.series!.id,anchorDate:round.anchorDate}),true)}>{round.anchorDate} 회차 시작</button>)}</>}
  <small>기본 4회, 최대 12회. 이미 만든 회차와 지난 기록은 유지합니다.</small>
 </fieldset>;
}

export function PersonalExecutionAnchorForm(props:{execution:PersonalStandaloneExecution;disabled:boolean;onCommand:AuthoringCommand}){
 const [anchor,setAnchor]=useState(props.execution.anchorDate);
 return <fieldset disabled={props.disabled}><legend>이 새 실행의 기준일</legend><label>기준일<input type="date" aria-label="현재 실행 기준일" value={anchor} onChange={event=>setAnchor(event.target.value)}/></label><small>기록 없는 미시작 상대일만 이동합니다. 고정일과 개별 변경 날짜는 유지합니다.</small><button type="button" onClick={()=>void props.onCommand('개인 실행 기준일 변경',data=>changePersonalAnchor(data,props.execution.id,anchor))}>기준일 변경</button></fieldset>;
}

export function ProgramPersonalAuthoring(props:{data:ProgramData;documentId:string;today:string;disabled:boolean;onOpenSource:(documentId:string,taskId:string)=>void;onCommand:(label:string,build:(data:ProgramData)=>ProgramTransition<string>,openResult?:boolean)=>Promise<boolean>}) {
 const space=props.data.spaces[props.data.activeActorId],owner=space.personalAuthoring,doc=M.getDocument(space.text,props.documentId)!;
 // Kept while the text is the same: this renders under the writing view, so each key typed re-rendered it, and the
 // whole read of a long document each time was a third of a key's delay (11/5 '최근만 쓰기' profile).
 const {tasks,documentTaskIds,available}=useMemo(()=>{
  const all=M.tasks(space.text),taskIds=M.rowMeta(space.text,doc.id).flatMap(row=>row.kind==='task'?[row.isReference?row.taskId??'':row.id]:[]),ids=new Set(taskIds);
  return {tasks:all,documentTaskIds:taskIds,available:all.filter(t=>ids.has(t.id))};
 },[space.text,doc.id]);
 const savedRepeats=documentRepeatSeries(owner,doc.id,documentTaskIds);
 const [chosen,setChosen]=useState<string[]>([]),[title,setTitle]=useState(''),[newTitle,setNewTitle]=useState(''),[description,setDescription]=useState('');
 const [flowId,setFlowId]=useState(owner?.flows.find(f=>f.flowId===doc.id)?.flowId??owner?.flows[0]?.flowId??'');
 const flow=owner?.flows.find(f=>f.flowId===flowId),[versionId,setVersionId]=useState(''),version=flow?.versions.find(v=>v.id===versionId)??flow?.versions.find(v=>v.id===flow.currentVersionId);
 const [newAnchor,setNewAnchor]=useState(props.today),[dateModes,setDateModes]=useState<Record<string,PersonalTaskDate>>({});
 // Reopen on this document's saved rule; never start on a disabled option or another document's Flow rule.
 const [target,setTarget]=useState(()=>{const first=savedRepeats[0]?.source;return first?first.kind==='task'?first.taskId:'flow':owner?.flows.some(f=>f.flowId===doc.id)?'flow':'';});
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');const composing=useRef(false);
 const activeSeries=owner?.series.find(s=>!s.stopped&&(target==='flow'?s.source.kind==='flow'&&s.source.flowId===flowId:s.source.kind==='task'&&s.source.taskId===target));
 const source=activeSeries?.source;
 const repeatVersion=source?(source.kind==='flow'?owner?.flows.find(f=>f.flowId===source.flowId)?.versions.find(v=>v.id===source.versionId):source.version):target==='flow'?version:target?capturePersonalVersion(space.text,doc.id,{},[target],'preview-'+target):undefined;
 const execution=owner?.executions?.find(e=>e.executionDocumentId===doc.id);
 async function command(label:string,build:(data:ProgramData)=>ProgramTransition<string>,open=false){if(busy||props.disabled||composing.current)return;setBusy(true);setNotice('');try{setNotice(await props.onCommand(label,build,open)?'saved':'failed');}finally{setBusy(false);}}
 function selectTask(id:string,checked:boolean){const ids=new Set([id]);let changed=true;while(changed){changed=false;for(const task of tasks)if(task.parentTaskId&&ids.has(task.parentTaskId)&&!ids.has(task.id)){ids.add(task.id);changed=true;}}setChosen(previous=>checked?[...new Set([...previous,...ids])]:previous.filter(value=>!ids.has(value)));}
 function editRepeat(series:PersonalSeriesOwner){const source=series.source;if(source.kind==='flow'&&source.flowId!==flowId){setFlowId(source.flowId);setVersionId('');setDateModes({});setNewAnchor(props.today);}setTarget(source.kind==='task'?source.taskId:'flow');setNotice('');}
 function repeatSummary(series:PersonalSeriesOwner){
  const source=series.source,rule=series.ruleVersions.find(v=>v.id===series.currentRuleVersionId)?.rule;
  const frozen=source.kind==='flow'?owner?.flows.find(f=>f.flowId===source.flowId)?.versions.find(v=>v.id===source.versionId):source.version;
  const rounds=frozen&&rule?previewPersonalRounds(frozen,{rule,materialized:series.rounds,targetKind:source.kind}):null;
  const dates=rounds?.ok?rounds.value.rounds.map(round=>round.anchorDate.slice(5).replace('-','/')).join(', '):'';
  const name=source.kind==='task'?tasks.find(t=>t.id===source.taskId)?.title??'지워진 할 일':`Flow 전체 · ${M.getDocument(space.text,source.flowId)?.title??source.flowId}`;
  return `반복 중 · ${name}${rule?' · '+describePersonalRepeatRule(rule):''}${dates?` (${dates})`:''}`;
 }
 function saveVersion(){const dates=Object.fromEntries((version?.taskRefs??[]).map(ref=>[ref.taskId,dateModes[ref.taskId]??ref.date]));void command('개인 Flow 판본 확정',data=>savePersonalVersion(data,flowId,dates));}
 const disabled=busy||props.disabled;
 const connected=available.filter(task=>task.docId!==doc.id);
 return <>{!!connected.length&&<details className={styles.personalAuthoring}><summary>연결한 할 일의 메모·간단 체크</summary>{connected.map(task=>{const checks=M.parseDocument(M.getDocument(space.text,task.docId)!,space.text).items.filter(item=>!item.isCanonical&&item.parentTaskId===task.id);return <section key={task.id}><strong>{task.title} · 현재 {M.currentProgress(space.text,task.id)??0}%</strong>{task.note&&<p style={{whiteSpace:'pre-wrap'}}>{task.note}</p>}{checks.map(check=><p key={check.id}>{check.done?'☑':'☐'} {check.title} · {M.currentProgress(space.text,check.id)??0}%</p>)}<button type="button" disabled={disabled} onClick={()=>props.onOpenSource(task.docId,task.id)}>원문에서 편집</button></section>;})}</details>}
 <details className={styles.personalAuthoring} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onKeyDownCapture={event=>{if(composing.current&&event.key==='Enter')event.preventDefault();}}>
  <summary>Flow 구성 · 실행과 반복{savedRepeats.length?` · 반복 ${savedRepeats.length}개`:''}</summary>
  <div className={styles.repeatList}>{savedRepeats.length?savedRepeats.map(series=><p key={series.id}><span>{repeatSummary(series)}</span><button type="button" disabled={disabled} onClick={()=>editRepeat(series)}>고치기</button></p>):<p>아직 반복이 없습니다.</p>}</div>
  <PersonalRepeatForm key={props.data.activeActorId+':'+doc.id+':'+(target==='flow'?'flow:'+flowId:'task:'+target)} today={props.today} target={target} flowId={flowId} version={repeatVersion} versionId={version?.id} series={activeSeries} disabled={disabled} onCommand={command}>
   <label>반복할 대상<select aria-label="반복할 대상" value={target} onChange={event=>{setTarget(event.target.value);setNotice('');}}><option value="">반복할 대상 선택</option><option value="flow" disabled={!flow}>Flow 전체{flow?` · ${M.getDocument(space.text,flowId)?.title??flowId}`:''}</option>{/* N10 (SPEC 5): one task repeats as a repeat line now; only a one-task repeat already running stays here to change or stop. */}{available.filter(t=>owner?.series.some(s=>!s.stopped&&s.source.kind==='task'&&s.source.taskId===t.id)).map(t=><option key={t.id} value={t.id}>{t.parentTaskId?'하위 할 일 하나':'할 일 하나'} · {t.title}</option>)}</select></label><p>할 일 하나는 그 줄의 [반복] › 이 줄 반복으로 겁니다.</p>
  </PersonalRepeatForm>
  <fieldset disabled={disabled}><legend>이 문서에서 내 Flow 만들기</legend>
   <label>Flow 이름<input value={title} onChange={event=>setTitle(event.target.value)} /></label>
   {available.map(task=><label key={task.id}><input type="checkbox" checked={chosen.includes(task.id)} onChange={event=>selectTask(task.id,event.target.checked)} />{task.title}{task.parentTaskId?' · 하위 할 일':''}{tasks.some(t=>t.parentTaskId===task.id)?' · 하위 포함':''}</label>)}
   <label>새 행동 하나<input value={newTitle} onChange={event=>setNewTitle(event.target.value)} placeholder="필요할 때만 작성" /></label>
   <label>단계 설명<textarea rows={2} value={description} onChange={event=>setDescription(event.target.value)} /></label>
   <small>선택한 할 일과 하위 구조를 연결합니다. 메모는 행동 수에 넣지 않습니다.</small>
   <button type="button" disabled={!title.trim()||!chosen.length&&!newTitle.trim()} onClick={()=>void command('개인 Flow 구성',data=>createPersonalFlow(data,{documentId:doc.id,title,taskIds:chosen,newTaskTitle:newTitle,description}),true)}>Flow 만들기</button>
  </fieldset>
  {!!owner?.flows.length&&<fieldset disabled={disabled}><legend>내 Flow 연결 또는 새로 시작</legend>
   <label>대상 Flow<select value={flowId} onChange={event=>{setFlowId(event.target.value);setVersionId('');setDateModes({});setNewAnchor(props.today);setNotice('');}}>{owner.flows.map(f=><option key={f.flowId} value={f.flowId}>{M.getDocument(space.text,f.flowId)?.title??f.flowId}</option>)}</select></label>
   {flow&&<><label>구성 판본<select value={version?.id??''} onChange={event=>setVersionId(event.target.value)}>{flow.versions.map((v,index)=><option key={v.id} value={v.id}>판본 {index+1}{v.id===flow.currentVersionId?' · 현재':''}</option>)}</select></label>
    <button type="button" disabled={doc.id===flowId} onClick={()=>void command('내 Flow 연결',data=>connectPersonalFlow(data,{flowId,documentId:doc.id}))}>이 문서에 내 Flow 연결 · 같은 진행·기록</button>
    <label>새 실행 기준일<input type="date" aria-label="새 실행 기준일" value={newAnchor} onChange={event=>setNewAnchor(event.target.value)} /></label>
    <button type="button" disabled={!version||!newAnchor} onClick={()=>version&&void command('개인 Flow 새 시작',data=>startPersonalFlow(data,{flowId,versionId:version.id,anchorDate:newAnchor}),true)}>선택한 판본으로 새로 시작 · 진행 0</button>
    {doc.id===flowId&&<><p>이 본문을 고쳐도 확정한 판본은 바뀌지 않습니다. 새 판본에 날짜 방식을 지정하세요.</p>
     {version?.taskRefs.map(ref=>{const task=tasks.find(t=>t.id===ref.taskId),mode=dateModes[ref.taskId]??ref.date;return <label key={ref.taskId}>{task?.title}<select value={mode.kind} onChange={event=>setDateModes(previous=>({...previous,[ref.taskId]:event.target.value==='relative'?{kind:'relative',offsetDays:0}:event.target.value==='fixed'?{kind:'fixed',date:task?.date??props.today}:{kind:'undated'}}))}><option value="relative">기준일에서 며칠 뒤</option><option value="fixed">고정 날짜</option><option value="undated">날짜 미정</option></select>{mode.kind==='relative'?<input type="number" aria-label={`${task?.title} 상대 일수`} value={mode.offsetDays} onChange={event=>setDateModes(previous=>({...previous,[ref.taskId]:{kind:'relative',offsetDays:Number(event.target.value)}}))}/>:mode.kind==='fixed'?<input type="date" value={mode.date} onChange={event=>setDateModes(previous=>({...previous,[ref.taskId]:{kind:'fixed',date:event.target.value}}))}/>:null}</label>;})}
     <button type="button" onClick={saveVersion}>현재 본문을 새 판본으로 확정</button>
    </>}
   </>}
  </fieldset>}
  {execution&&<PersonalExecutionAnchorForm key={props.data.activeActorId+':'+doc.id+':'+execution.id} execution={execution} disabled={disabled} onCommand={command}/>}
  {notice&&<p role="status">{notice==='saved'?'서버 저장을 확인했습니다.': '변경을 적용하지 못했습니다. 입력을 유지했습니다.'}</p>}
 </details></>;
}
