'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {programId,type ProgramData} from '@/lib/flow/integrated-poc/contract';
import {readProgramNativeSourceUpdate,stageProgramNativeSourceUpdate,transitionProgramNativeSourceUpdate,upgradeProgramNativeSourceAbsences} from '@/lib/flow/integrated-poc/creator-native-source-store';
import {previewNativeCreatorAbsenceUpgrade} from '@/lib/flow/integrated-poc/native-creator-document';
import {prepareProgramNativeSourceInput,programNativeSourceDefaultMatches,programNativeSourceMatches,type ProgramNativeSourcePrepared} from '@/lib/flow/integrated-poc/creator-native-source-input';
import type {CreatorNativeSourceDecision,CreatorNativeSourceView} from '@/lib/flow/integrated-poc/creator-native-source-update-contract';
import type {ProgramCreatorWorking} from '@/lib/flow/integrated-poc/creator-workspace-contract';
import type {ProgramEditorFlush} from '@/lib/flow/integrated-poc/document-action';
import styles from './ProgramCreatorSourceUpdate.module.css';

export type ProgramCreatorSourceCommand=(
  {kind:'stage';input:Parameters<typeof stageProgramNativeSourceUpdate>[1]}|
  {kind:'event';input:Parameters<typeof transitionProgramNativeSourceUpdate>[1]}|
  {kind:'upgrade';input:Parameters<typeof upgradeProgramNativeSourceAbsences>[1]}
)&{now:string};
export type ProgramCreatorSourceUpdateProps={data:ProgramData;working:ProgramCreatorWorking;disabled:boolean;
  onCommand:(command:ProgramCreatorSourceCommand)=>Promise<{ok:true}|{ok:false;reason:string}>;
  onRegisterEditors:(port:ProgramEditorFlush|null)=>void};
const fieldNames:Record<string,string>={title:'제목',source_checked:'원본 체크',detail:'설명',completion:'완료 조건',schedule:'일정',recurrence:'반복 규칙',subchecks:'하위 확인 목록',resources:'자료',sources:'출처',guides:'안내',cautions:'주의',role:'역할',included:'포함 여부',nesting:'하위 구조',order:'순서',step_mapping:'구간'};
export function programSourceValueText(value:unknown,field?:string):string{
  if(value===null||value===undefined)return '없음';
  if(typeof value==='string')return value||'없음';
  if(typeof value==='boolean')return value?'예':'아니요';
  if(field==='subchecks'&&Array.isArray(value)&&value.every(check=>check&&typeof check==='object'&&typeof check.title==='string'&&typeof check.sourceChecked==='boolean'&&Object.keys(check).every(key=>['subcheckId','title','sourceChecked','order','sourceRowIds','owner'].includes(key))))return value.length?value.map(check=>`${check.sourceChecked?'[x]':'[ ]'} ${check.title}`).join('\n'):'없음';
  if(typeof value==='object'&&!Array.isArray(value)){
    const row=value as Record<string,unknown>,keys=Object.keys(row);
    if(field==='schedule'&&keys.every(key=>['kind','raw','date','dayOffset','anchorLabel','time','timezone','durationMinutes','repeat'].includes(key))){
      const date=row.kind==='absolute'&&typeof row.date==='string'?row.date:row.kind==='relative'&&typeof row.dayOffset==='number'?`${typeof row.anchorLabel==='string'?row.anchorLabel:'기준일'} ${row.dayOffset===0?'당일':`${row.dayOffset>0?'+':''}${row.dayOffset}일`}`:null;
      if(date)return [date,typeof row.time==='string'?`시간: ${row.time}`:null,typeof row.timezone==='string'?`시간대: ${row.timezone}`:null,typeof row.durationMinutes==='number'?`소요 시간: ${row.durationMinutes}분`:null,typeof row.repeat==='string'?`반복: ${row.repeat}`:null,typeof row.raw==='string'&&row.raw!==date?`원문 표기: ${row.raw}`:null].filter(Boolean).join('\n');
    }
    if(field==='recurrence'&&typeof row.raw==='string'&&typeof row.interval==='number'&&keys.every(key=>['raw','frequency','interval','weekdays','dayOfMonth','end','executionCondition','sourceRowIds'].includes(key))){
      const units:Record<string,string>={daily:'일',weekly:'주',monthly:'개월'},unit=units[String(row.frequency)];
      const weekdays:Record<string,string>={SU:'일',MO:'월',TU:'화',WE:'수',TH:'목',FR:'금',SA:'토'},days=Array.isArray(row.weekdays)&&row.weekdays.every(day=>typeof day==='string'&&weekdays[day])?row.weekdays.map(day=>weekdays[day as string]).join('·'):null;
      const end=row.end&&typeof row.end==='object'?row.end as Record<string,unknown>:null;
      const ending=end?.mode==='count'&&typeof end.count==='number'?`${end.count}회`:end?.mode==='until'&&typeof end.date==='string'?`${end.date}까지`:end?'': '종료 지정 없음';
      if(unit&&ending)return [`${row.interval}${unit}마다${days?` · ${days}요일`:typeof row.dayOfMonth==='number'?` · ${row.dayOfMonth}일`:''}`,`종료: ${ending}`,typeof row.executionCondition==='string'?`실행 조건: ${row.executionCondition}`:null,`원문 표기: ${row.raw}`].filter(Boolean).join('\n');
    }
  }
  return JSON.stringify(value,null,2);
}
function itemText(value:unknown,source=false){
  if(!value||typeof value!=='object')return programSourceValueText(value);
  const item=value as Record<string,unknown>,title=source?item.sourceTitle:item.title,detail=source?item.sourceDetail:item.detail,schedule=source?item.sourceSchedule:item.schedule,completion=source?item.sourceCompletion:item.completion;
  return [typeof title==='string'?title:null,typeof detail==='string'?detail:null,schedule?programSourceValueText(schedule,'schedule'):null,completion&&typeof completion==='object'&&'doneWhen'in completion?`완료 조건: ${String(completion.doneWhen)}`:null].filter(Boolean).join('\n')||programSourceValueText(value);
}
export function ProgramSourceChange({change,view,value,disabled,onChange}:{change:CreatorNativeSourceView['changes'][number];view:CreatorNativeSourceView;value:CreatorNativeSourceDecision;disabled:boolean;onChange:(value:CreatorNativeSourceDecision)=>void}){
  const active='activeItemId'in change?view.stagedOwner.document.parseResult.canonical.items.find(item=>item.itemId===change.activeItemId):null;
  const incoming='incomingSourceValue'in change?change.incomingSourceValue:null;
  const old='oldSourceValue'in change?change.oldSourceValue:null;
  const absent=view.workingAbsences.some(row=>row.changeId===change.changeId);
  const working=change.kind==='changed'?(absent?null:change.userValue!==undefined?change.userValue:old):change.kind==='removed'?active??old:null;
  const title=active?.title||(incoming&&typeof incoming==='object'&&'title'in incoming?String(incoming.title):'새 항목');
  const format=change.kind==='changed'?(value:unknown)=>programSourceValueText(value,change.field):itemText;
  return <fieldset disabled={disabled} className={styles.change} data-source-change={change.changeId}><legend>{title} · {change.kind==='changed'?fieldNames[change.field]??change.field:change.kind==='added'?'추가됨':'원본에서 빠짐'}</legend>
    <div className={styles.values}><div><h4>이전 원본</h4><pre tabIndex={0}>{change.kind==='removed'?itemText(old,true):format(old)}</pre></div><div><h4>내 작업</h4><pre tabIndex={0}>{format(working)}</pre>{absent&&<small>이전 비교에서 없음 유지</small>}</div><div><h4>새 원본</h4><pre tabIndex={0}>{format(incoming)}</pre></div></div>
    {change.kind!=='changed'&&<details><summary>항목의 전체 속성 확인</summary><pre tabIndex={0}>{programSourceValueText({'이전 항목의 원본·작업 속성':old,'현재 작업 속성':working,'새 원본 속성':incoming})}</pre></details>}
    {change.kind==='changed'&&change.field==='subchecks'&&<><p>하위 확인은 목록 전체를 유지하거나 새 목록으로 바꿉니다. 개인 실행의 체크와 기록은 여기서 바꾸지 않습니다.</p><details><summary>같은 내용도 비교하는 이유·출처 연결</summary><p>새 원문에서 연결 정보가 달라질 수 있습니다. 이름이 같아도 같은 하위 항목으로 자동 연결하지 않습니다.</p><pre tabIndex={0}>{programSourceValueText({'이전 원본':old,'내 작업':working,'새 원본':incoming})}</pre></details></>}
    <label>이 변경의 처리<select value={value} onChange={event=>onChange(event.target.value as CreatorNativeSourceDecision)}>
      <option value="later">아직 선택하지 않음 · 나중에</option><option value="keep_working">{change.kind==='added'?'지금 추가하지 않기':'내 작업 유지'}</option><option value="use_incoming">{change.kind==='removed'?'원본에서 빠진 항목 반영':'새 원본 반영'}</option>
    </select></label>
  </fieldset>;
}
export function ProgramCreatorSourceUpdate({data,working,disabled,onCommand,onRegisterEditors}:ProgramCreatorSourceUpdateProps){
  const actorId=data.activeActorId,draftId=working.draftId,session=data.spaces[actorId].creatorWorkspace?.sourceUpdateSessions?.[draftId]?.session??null;
  const read=useMemo(()=>readProgramNativeSourceUpdate(data,actorId,draftId),[data,actorId,draftId]),view=read?.ok?read.value:null;
  const upgrade=useMemo(()=>working.nativeDocument?previewNativeCreatorAbsenceUpgrade(working.nativeDocument):null,[working.nativeDocument]);
  const [open,setOpen]=useState(!!session),[raw,setRaw]=useState(''),[version,setVersion]=useState('');
  const [prepared,setPrepared]=useState<ProgramNativeSourcePrepared|null>(null),[matches,setMatches]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false),pending=useRef(false),composing=useRef(false),lock=useRef(0),[locked,setLocked]=useState(false);
  const [feedback,setFeedback]=useState<{error:boolean;text:string}|null>(null),[failedChoice,setFailedChoice]=useState<{id:string;decision:CreatorNativeSourceDecision}|null>(null);
  const retry=useRef<ProgramCreatorSourceCommand|null>(null),frame=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const state=useRef({raw,version,prepared,matches,failedChoice});state.current={raw,version,prepared,matches,failedChoice};
  const controls=disabled||busy||locked,terminal=!!view&&['rejected','reverted','undo-available'].includes(view.status);
  const port=useMemo<ProgramEditorFlush>(()=>({
    hasPendingInput:()=>pending.current||composing.current||!!state.current.raw||!!state.current.version||!!state.current.prepared||!!state.current.failedChoice,
    flushAll:async()=>{const dirty=pending.current||composing.current||!!state.current.raw||!!state.current.version||!!state.current.prepared||!!state.current.failedChoice;if(dirty)setFeedback({error:true,text:'새 원문 비교 입력을 저장하거나 취소한 뒤 이동해 주세요. 입력은 유지했습니다.'});return !dirty;},
    lockInput:()=>{lock.current++;setLocked(true);return()=>{lock.current=Math.max(0,lock.current-1);setLocked(lock.current>0);};},
    captureDrafts:()=>state.current.raw||state.current.version||state.current.failedChoice?[{title:'제작 원본 비교 중 입력',raw:JSON.stringify({captureVersion:1,draftId,...state.current},null,2)}]:[],
  }),[draftId]);
  useEffect(()=>{onRegisterEditors(port);return()=>onRegisterEditors(null);},[port,onRegisterEditors]);
  const selectFocus=()=>{if(typeof window!=='undefined')window.requestAnimationFrame(()=>frame.current?.querySelector<HTMLElement>('h3')?.focus());};
  function cancel(){if(pending.current||lock.current||composing.current)return;setRaw('');setVersion('');setPrepared(null);setMatches({});setFailedChoice(null);retry.current=null;setFeedback(null);setOpen(false);trigger.current?.focus();}
  function prepare(){if(controls||composing.current||!working.nativeDocument)return;const value=prepareProgramNativeSourceInput(working.nativeDocument,{rawText:raw,version,actorId},new Date().toISOString());if(!value){setFeedback({error:true,text:'새 원문과 비교 이름을 확인해 주세요. 빈 원문으로 기존 내용을 지우지 않습니다.'});return;}setPrepared(value);setMatches(programNativeSourceDefaultMatches(value));retry.current=null;setFeedback(null);selectFocus();}
  async function run(command:ProgramCreatorSourceCommand,label:string){
    if(pending.current||lock.current||disabled||composing.current)return false;
    retry.current=command;pending.current=true;setBusy(true);setFeedback({error:false,text:'비교 상태 저장 중…'});
    try{const result=await onCommand(command);if(!result.ok){setFeedback({error:true,text:result.reason});return false;}retry.current=null;setFailedChoice(null);setFeedback({error:false,text:label});return true;}
    catch{setFeedback({error:true,text:'저장하지 못했습니다. 입력과 선택은 유지했습니다. 다시 시도해 주세요.'});return false;}
    finally{pending.current=false;setBusy(false);}
  }
  async function stage(){if(!prepared)return;const exactMatches=programNativeSourceMatches(prepared,matches);if(!exactMatches){setFeedback({error:true,text:'같은 새 항목을 두 번 연결할 수 없습니다. 연결 선택을 확인해 주세요.'});return;}
    const command:ProgramCreatorSourceCommand=retry.current?.kind==='stage'?retry.current:{kind:'stage',now:new Date().toISOString(),input:{actorId,draftId,expectedWorking:working,expectedSession:session,envelope:prepared.envelope,candidateDocument:prepared.candidateDocument,matches:exactMatches,...(view?.status==='stale-candidate'?{replaceSession:true}:{})}};
    if(await run(command,'비교와 연결을 보관했습니다. 아직 제작 원문은 바꾸지 않았습니다.')){setRaw('');setVersion('');setPrepared(null);setMatches({});selectFocus();}
  }
  async function event(value:Parameters<typeof transitionProgramNativeSourceUpdate>[1]['event']){
    const command:ProgramCreatorSourceCommand={kind:'event',now:new Date().toISOString(),input:{actorId,draftId,expectedWorking:working,expectedSession:session,requestId:programId('native-source-event'),event:value}};
    if(value.kind==='decision')setFailedChoice({id:value.changeId,decision:value.decision});
    const ok=await run(command,value.kind==='apply'?'선택한 원본 변경을 제작 중 원문에 반영했습니다. 개인 실행과 공개 판본은 그대로입니다.':value.kind==='undo'?'원본 반영 전의 제작 작업을 복구했습니다. 개인 실행 기록은 그대로입니다.':value.kind==='reject'?'이번 원본을 반영하지 않기로 보관했습니다.':value.kind==='defer'?'비교 선택을 보관했습니다. 다시 열어 이어갈 수 있습니다.':'선택을 보관했습니다.');
    if(ok&&value.kind==='defer'){setOpen(false);trigger.current?.focus();}
  }
  async function retryLast(){const command=retry.current;if(!command)return;if(command.kind==='stage'){await stage();return;}
    const ok=await run(command,'저장 결과를 확인했습니다.');
    if(ok&&command.kind==='event'&&command.input.event.kind==='defer'){setOpen(false);trigger.current?.focus();}
  }
  const canStart=(!session||terminal||view?.status==='stale-candidate')&&!(upgrade?.ok&&upgrade.required);
  return <section className={styles.panel} aria-label="제작 원본 업데이트" onCompositionStartCapture={()=>{composing.current=true;}} onCompositionEndCapture={()=>{composing.current=false;}}>
    <button ref={trigger} type="button" disabled={controls} aria-expanded={open} onClick={()=>{setOpen(!open);if(!open)selectFocus();}}>{session?'원본 비교 이어 보기':'새 원문과 비교'}</button>
    {open&&<div ref={frame} onKeyDown={event=>{if(event.key==='Escape'&&!event.nativeEvent.isComposing&&!composing.current&&!pending.current){event.preventDefault();event.stopPropagation();cancel();}}}>
      <h3 tabIndex={-1}>제작 원본 업데이트</h3><p>붙여넣은 원문을 비교합니다. 외부 사이트에서 수집하거나 공개 원본을 수정하지 않습니다.</p>
      {upgrade?.ok&&upgrade.required&&<section className={styles.input} aria-label="이전 원본 비교 기준 복구"><p>이전 비교에서 선택한 ‘없음’을 유지하면서, 저장된 새 원본의 날짜·완료 조건을 비교 기준으로 복구해야 합니다. 원래 저장본과 개인 실행 기록은 바꾸지 않습니다.</p><button disabled={controls} onClick={()=>void run({kind:'upgrade',now:new Date().toISOString(),input:{actorId,draftId,expectedWorking:working,expectedSession:session,requestId:programId('source-upgrade')}},'원본 비교 기준을 복구했습니다. 선택한 없음은 유지했습니다.')}>저장된 원본 근거로 비교 기준 복구</button></section>}
      {read&&!read.ok&&<p role="alert">저장한 비교 상태를 읽지 못했습니다. 원문과 원래 저장본은 유지했습니다.</p>}
      {view&&<>
        <p>{view.status==='stale-candidate'?'비교 이후 제작 작업이 바뀌었습니다. 이 비교를 덮어쓰지 않고 보관합니다.':view.status==='undo-available'?'원본 변경을 반영했습니다.':view.status==='rejected'?'이번 원본은 반영하지 않았습니다.':view.status==='reverted'?'원본 반영을 되돌렸습니다.':`남은 선택 ${view.unresolvedCount}개`}</p>
        <details><summary>비교한 전체 원문 · {session!.envelope.externalVersion}</summary><div className={styles.values}>{Object.entries(view.comparison).map(([key,text])=><div key={key}><h4>{key==='baseRawText'?'이전 원본':key==='workingRawText'?'내 제작 원문':'붙여넣은 새 원문'}</h4><pre tabIndex={0}>{text??'이전 원문이 남아 있지 않습니다.'}</pre></div>)}</div></details>
        {!terminal&&view.changes.map(change=><ProgramSourceChange key={change.changeId} change={change} view={view} value={failedChoice?.id===change.changeId?failedChoice.decision:view.decisions.find(row=>row.changeId===change.changeId)?.decision??'later'} disabled={controls||!view.creatorCanApply||!!failedChoice} onChange={decision=>void event({kind:'decision',changeId:change.changeId,decision})}/>)}
        <div className={styles.actions}>{!terminal&&<><button disabled={controls||!view.creatorCanApply||view.unresolvedCount>0||!!failedChoice} onClick={()=>void event({kind:'apply'})}>선택한 원본 변경 적용</button><button disabled={controls||!view.creatorCanApply||!!failedChoice} onClick={()=>void event({kind:'defer'})}>선택 보관하고 나중에</button><button disabled={controls||!view.creatorCanApply||!!failedChoice} onClick={()=>void event({kind:'reject'})}>이번 원본 반영하지 않기</button></>}{view.status==='undo-available'&&<button disabled={controls||!view.creatorCanApply} onClick={()=>void event({kind:'undo'})}>이번 원본 반영 되돌리기</button>}</div>
      </>}
      {canStart&&<fieldset disabled={controls} className={styles.input}><legend>{session?'다음 원본 비교':'새 원문 준비'}</legend><label>비교 이름<input maxLength={200} value={version} onChange={e=>{setVersion(e.target.value);setPrepared(null);retry.current=null;}} placeholder="예: 9월 수정 원문"/></label><label>새 원문<textarea rows={7} maxLength={100000} value={raw} onChange={e=>{setRaw(e.target.value);setPrepared(null);retry.current=null;}}/></label>
        <button disabled={!raw.trim()||!version.trim()} onClick={prepare}>원문 항목 확인</button>
        {prepared&&<><p>같은 항목을 연결해 변경을 비교합니다. 연결하지 않은 기존 항목과 새 항목은 각각 삭제·추가로 비교하며, 아직 원문을 바꾸지 않습니다.</p>{prepared.owner.document.parseResult.canonical.items.map(item=><label key={item.itemId}>{item.title} · 새 원문의 연결 항목<select value={matches[item.itemId]??''} onChange={e=>{setMatches(v=>({...v,[item.itemId]:e.target.value}));retry.current=null;}}><option value="">연결하지 않음</option>{prepared.candidateDocument.parseResult.canonical.items.map(next=><option key={next.itemId} value={next.itemId}>{next.title} · {next.order+1}번째 항목</option>)}</select></label>)}<button onClick={()=>void stage()}>{view?.status==='stale-candidate'?'이전 비교를 취소하고 이 연결로 다시 비교':'이 연결로 비교 시작'}</button></>}
      </fieldset>}
      {feedback&&<p role={feedback.error?'alert':'status'} className={feedback.error?styles.error:styles.feedback}>{feedback.text}</p>}
      <div className={styles.actions}>{feedback?.error&&retry.current&&<button disabled={controls} onClick={()=>void retryLast()}>같은 선택 저장 다시 시도</button>}<button disabled={controls} onClick={cancel}>{raw||version||failedChoice?'미저장 비교 입력 취소':'비교 닫기'}</button></div>
    </div>}
  </section>;
}
