'use client';

import {useRef,useState} from 'react';
import type {LegacyCreatorRecoveryCandidate,LegacyCreatorRecoveryRead} from '../../../lib/flow/integrated-poc/legacy-creator-recovery-codec';
import {programErrorMessage,type ProgramMutationResult} from '../../../lib/flow/integrated-poc/ui-contract';
import styles from './ProgramRevisionHistory.module.css';

type Ready=Extract<LegacyCreatorRecoveryRead,{kind:'ready'}>;
export type ProgramLegacyCreatorRecoveryProps<Request>={
 actorId:string;inputBlocked:boolean;
 read:()=>LegacyCreatorRecoveryRead;
 prepare:(loaded:Ready,candidate:LegacyCreatorRecoveryCandidate)=>{ok:true;request:Request;preview:{contextWarnings:string[];existingDraftId:string|null}}|{ok:false;reason:string};
 handoff:(request:Request)=>Promise<ProgramMutationResult>;
 onOpenCreatorDraft:(draftId:string)=>void;
 onContinueCurrent?:()=>void;
 onPendingChange?:(pending:boolean)=>void;
};

const relation:Record<LegacyCreatorRecoveryCandidate['eligibility'],string>={
 'first-save-before':'첫 저장 전','newer-than-saved':'마지막 저장 이후','not-newer-than-saved':'저장본보다 오래되거나 같은 시각',
};
const stageNames={input:'원문',structure:'구조',result:'결과'};
const issueNames={ 'invalid-entry':'자료의 연결 관계를 확인하지 못했습니다.', 'unsupported-entry':'이 제작 구조는 아직 이어갈 수 없습니다.', 'non-creator':'개인·제안 문서는 제작 복구 대상이 아닙니다.' };
function message(reason:string):string{
 if(reason==='dirty'||reason==='dirty-working'||reason==='pending-input')return '현재 작성 중인 내용을 먼저 확인해 주세요. 자동으로 저장하거나 덮어쓰지 않았습니다.';
 if(reason==='conflict')return '원래 자료나 현재 작업이 바뀌었습니다. 현재 입력을 확인한 뒤 목록을 다시 읽고 선택해 주세요.';
 if(reason==='not-newer')return '저장본보다 오래되거나 같은 시각의 임시 작업입니다. 원본은 그대로 남아 있습니다.';
 if(reason==='already-changed')return '이 임시 작업을 이어간 뒤 변경한 내용이 있습니다. 다시 덮어쓰지 않고 현재 제작 작업에서 확인해 주세요.';
 return programErrorMessage(reason);
}
function savedPreview(candidate:LegacyCreatorRecoveryCandidate):{raw:string;revision:string}|null{
 if(candidate.durableRecordJson===null)return null;
 try{const saved=JSON.parse(candidate.durableRecordJson);return typeof saved.document?.rawText==='string'&&typeof saved.revisionId==='string'?{raw:saved.document.rawText,revision:saved.revisionId}:null;}catch{return null;}
}

/** Pure UI port: no Storage or repository access, automatic read, or own writer.
 * Parent handoff owns current-input checks, exclusive lock and exact-wire CAS.
 * The opaque request returned on selection is retained unchanged for retry. */
export function ProgramLegacyCreatorRecovery<Request>({actorId,inputBlocked,read,prepare,handoff,onOpenCreatorDraft,onContinueCurrent,onPendingChange}:ProgramLegacyCreatorRecoveryProps<Request>){
 const [loaded,setLoaded]=useState<LegacyCreatorRecoveryRead|null>(null),[open,setOpen]=useState(false),[selected,setSelected]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[committed,setCommitted]=useState<{id:string;presentationPending:boolean}|null>(null);
 const [returnToCurrent,setReturnToCurrent]=useState(false);
 const [preview,setPreview]=useState<{contextWarnings:string[];existingDraftId:string|null}|null>(null);
 const trigger=useRef<HTMLButtonElement>(null),pending=useRef(false),readActor=useRef<string|null>(null);
 const selectedRequest=useRef<{actorId:string;candidateId:string;request:Request}|null>(null),finished=useRef<{id:string;actorId:string;presentationPending:boolean}|null>(null);
 const current=useRef({actorId,inputBlocked});current.current={actorId,inputBlocked};
 const candidate=loaded?.kind==='ready'?loaded.candidates.find(c=>c.recoveryId===selected):undefined;
 const sourceChangedActor=readActor.current!==null&&readActor.current!==actorId;
 const disabled=busy||actorId!=='local-user'||sourceChangedActor||committed!==null;
 function readList(){
  if(pending.current||finished.current||current.current.actorId!=='local-user'||actorId!==current.current.actorId)return;
  try{setLoaded(read());}catch{setLoaded({kind:'unavailable',raw:null});}
  readActor.current=actorId;selectedRequest.current=null;setSelected('');setPreview(null);setError('');setReturnToCurrent(false);setOpen(true);
 }
 function select(id:string){
  if(pending.current||finished.current||current.current.actorId!=='local-user'||actorId!==current.current.actorId||readActor.current!==actorId||loaded?.kind!=='ready')return;
  setSelected(id);selectedRequest.current=null;setPreview(null);setError('');setReturnToCurrent(false);const candidate=loaded.candidates.find(c=>c.recoveryId===id);if(!candidate||!candidate.eligible)return;
  if(current.current.inputBlocked){setError(message('dirty'));return;}
  try{const result=prepare(loaded,candidate);if(result.ok){selectedRequest.current={actorId,candidateId:id,request:result.request};setPreview(result.preview);}else{setError(message(result.reason));setReturnToCurrent(['dirty-working','already-changed','pending-input'].includes(result.reason));}}
  catch{setError('이 임시 작업을 안전하게 준비하지 못했습니다. 원본과 현재 입력은 그대로입니다.');}
 }
 function closeList(){if(pending.current)return;setOpen(false);trigger.current?.focus();}
 function openCommitted(){const result=finished.current;if(!result)return;if(result.actorId!==current.current.actorId){setError('임시 작업을 보관한 개인공간으로 돌아온 뒤 열어 주세요.');return;}try{onOpenCreatorDraft(result.id);setError('');}catch{setError('임시 작업은 보관됐지만 제작 화면을 열지 못했습니다. 다시 가져오지 않고 보관된 작업을 열 수 있습니다.');}}
 async function submit(){
  const captured=selectedRequest.current;
  if(pending.current||finished.current||!captured||captured.actorId!==current.current.actorId||captured.candidateId!==selected||current.current.inputBlocked||sourceChangedActor)return;
  pending.current=true;setBusy(true);setError('');onPendingChange?.(true);
  let openAfterCommit=false;
  try{
   const result=await handoff(captured.request);
   if(!result.ok){setError(message(result.reason));return;}
   const saved={id:result.result,actorId:captured.actorId,presentationPending:result.presentationPending===true};finished.current=saved;setCommitted(saved);
   openAfterCommit=!saved.presentationPending;
  }catch{setError('임시 작업을 가져오지 못했습니다. 선택과 비교 내용을 유지했습니다.');}
  finally{pending.current=false;setBusy(false);onPendingChange?.(false);}
  // Store success is latched before releasing the parent modal/input guard.
  // Navigation must not be dropped merely because that guard was still held.
  if(openAfterCommit)openCommitted();
 }
 const saved=candidate?savedPreview(candidate):null;
 return <section className={styles.section} style={{minWidth:0,overflowWrap:'anywhere'}} aria-label="개발2 임시 작업 복구" onKeyDown={event=>{
  if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();if(!pending.current)closeList();}
 }}>
  <h3>개발2 임시 작업</h3>
  <p>명시 저장 전 남은 작업을 읽습니다. 기존 저장소의 임시 작업과 저장본은 바꾸지 않습니다.</p>
  {actorId!=='local-user'?<p>‘나’의 개인공간에서 읽을 수 있습니다.</p>:<div className={styles.actions}>
   <button ref={trigger} disabled={busy||committed!==null} onClick={()=>{if(loaded&&!open)setOpen(true);else readList();}}>{loaded&&!open?'읽은 임시 작업 다시 보기':loaded?'임시 작업 목록 다시 읽기':'개발2 임시 작업 읽기'}</button>
   {open&&<button disabled={busy} onClick={closeList}>임시 작업 목록 닫기</button>}
  </div>}
  {open&&<>
   {sourceChangedActor&&<p role="alert" className={styles.error}>목록을 읽은 개인공간과 현재 개인공간이 다릅니다. 목록을 다시 읽어 주세요.</p>}
   {inputBlocked&&<p role="alert" className={styles.error}>현재 작성 중인 내용이 남아 있습니다. 먼저 제작 작업에서 확인해 주세요. 임시 작업은 덮어쓰지 않습니다.</p>}
   {inputBlocked&&onContinueCurrent&&<button disabled={busy} onClick={onContinueCurrent}>현재 제작 작업으로 돌아가기</button>}
   {loaded&&loaded.kind!=='ready'&&<p role={loaded.kind==='empty'?'status':'alert'}>{loaded.kind==='empty'?'이 기기에 남아 있는 개발2 임시 작업이 없습니다.':loaded.kind==='unavailable'?'이 기기의 저장소를 읽지 못했습니다. 원본은 그대로입니다.':loaded.kind==='unsupported'?'이 저장 형식은 아직 안전하게 읽을 수 없습니다. 원본은 그대로입니다.':'자료가 손상되었거나 연결 관계를 확인하지 못했습니다. 원본은 그대로입니다.'}</p>}
   {loaded?.kind==='ready'&&!sourceChangedActor&&actorId==='local-user'&&<>
    {!!loaded.issues.length&&<details><summary>이어갈 수 없는 자료 · {loaded.issues.length}개</summary><ul>{loaded.issues.map((issue,index)=><li key={`${issue.draftId}:${index}`}>{issue.draftId} — {issueNames[issue.reason]}</li>)}</ul></details>}
    {!loaded.candidates.length?<p>선택할 수 있는 임시 작업이 없습니다.</p>:<label>이어갈 임시 작업<select value={selected} disabled={disabled} onChange={event=>select(event.target.value)}><option value="">선택하세요</option>{loaded.candidates.map(c=><option key={c.recoveryId} value={c.recoveryId}>{c.title||'(제목 없음)'} · {relation[c.eligibility]} · {c.draftId}</option>)}</select></label>}
    {candidate&&<section aria-label="선택한 임시 작업 비교">
     <h4>{candidate.title||'제목 없는 임시 작업'}</h4><p>{relation[candidate.eligibility]} · {candidate.recoveredAt}</p>
     {!candidate.eligible&&<p role="alert">저장본보다 오래되거나 같은 시각의 자료는 여기서 인계하지 않습니다. 원본을 삭제하지 않았습니다.</p>}
     <div className={styles.compare}>
      <div><h4>마지막으로 해석한 원문</h4><pre className={styles.raw} tabIndex={0}>{candidate.canonicalRawText===''?'(빈 원문)':candidate.canonicalRawText}</pre></div>
      {candidate.workingRawText!==candidate.canonicalRawText?<div><h4>아직 반영하지 않은 입력</h4><pre className={styles.raw} tabIndex={0}>{candidate.workingRawText===''?'(비운 입력)':candidate.workingRawText}</pre></div>:<p>원문과 작성 중 입력이 같습니다. 미반영 입력을 새로 만들지 않습니다.</p>}
     </div>
     {candidate.durableRecordJson===null?<p>첫 명시 저장 전 자료입니다. 기존 저장 판본은 없습니다.</p>:saved?<details><summary>실제 명시 저장본과 비교 · {candidate.lastSavedAt}</summary><p>저장 revision: {saved.revision}</p><pre className={styles.raw} tabIndex={0}>{saved.raw===''?'(빈 저장 원문)':saved.raw}</pre></details>:<p role="alert">실제 저장본을 안전하게 비교하지 못했습니다.</p>}
     <details><summary>원래 작업 단계와 전체 자료</summary><p>작업 단계: {stageNames[candidate.activeStage]}{candidate.primaryArtifact?` · 출력: ${candidate.primaryArtifact}`:''}</p><p>초안: {candidate.draftId}<br/>복구본: {candidate.recoveryId}<br/>원래 문서: {candidate.documentId}<br/>작성 revision: {candidate.revisionId}</p>
      {candidate.selectedItemId&&<p>{candidate.selectionAvailable?'원래 선택 항목':'원래 선택 항목은 현재 구조에 없어 자동 선택하지 않습니다'}: {candidate.selectedItemId}</p>}
      <pre className={styles.raw} tabIndex={0}>{candidate.recoveryJson}</pre>
     </details>
     {!!preview?.contextWarnings.length&&<div role="status">{preview.contextWarnings.map((warning,index)=><p key={index}>{warning}</p>)}</div>}
     <p>{preview?.existingDraftId?'이미 같은 내용으로 이어가는 작업이 있습니다. 저장 없이 그 작업을 엽니다.':'새 작성 중 작업으로 보관합니다. 명시 저장본·개인 실행 기록·공개물은 바뀌지 않습니다.'}</p>
     <button className={styles.primary} disabled={disabled||inputBlocked||!candidate.eligible||!selectedRequest.current||candidate.durableRecordJson!==null&&!saved} onClick={()=>void submit()}>{busy?'임시 작업을 보관하는 중…':preview?.existingDraftId?'이미 이어가는 제작 작업 열기':'이 임시 작업으로 제작 이어가기'}</button>
    </section>}
   </>}
   {error&&<p role="alert" className={styles.error}>{error}</p>}
   {returnToCurrent&&!inputBlocked&&onContinueCurrent&&<button disabled={busy} onClick={onContinueCurrent}>현재 제작 작업으로 돌아가기</button>}
   {committed&&<div role="status" className={styles.status}><p>{committed.presentationPending?'임시 작업은 보관됐습니다. 저장된 화면을 다시 확인한 뒤 제작 작업을 열어 주세요.':'임시 작업을 작성 중 상태로 보관했습니다. 명시 저장은 제작 화면에서 따로 할 수 있습니다.'}</p><button disabled={busy} onClick={openCommitted}>복구한 제작 작업 열기</button></div>}
  </>}
 </section>;
}
