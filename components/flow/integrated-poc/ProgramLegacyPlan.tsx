'use client';
import React, { useEffect, useRef, useState } from 'react';
import type { ProgramData } from '@/lib/flow/integrated-poc/contract';
import type { ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import { programSame } from '@/lib/flow/integrated-poc/controller';
import { applyProgramLegacyPlan, previewProgramLegacyPlan, readProgramLegacyPlan, type ProgramLegacyPlanDraft } from '@/lib/flow/integrated-poc/program-legacy-plan';
import { programErrorMessage, type ProgramMutate } from '@/lib/flow/integrated-poc/ui-contract';
import styles from './ProgramLegacyWorkspace.module.css';
import planStyles from './ProgramLegacyPlan.module.css';
import { ProgramLegacyMapPlan } from './ProgramLegacyMapPlan';
import { ProgramLegacyPlanSeries, ProgramLegacySeriesComparison } from './ProgramLegacyPlanSeries';
export function programLegacyPlanIssue(reason: string): string {
  return ({'source-review-required':'원본이 바뀌었습니다. 현재 원본과 기존 선택을 다시 비교해 주세요.', 'empty-plan-policy-not-decided':'현재 사본에서 한 항목 이상 선택해 주세요. 전체 제외의 저장 방식은 아직 정하지 않았습니다.', 'invalid-anchor':'실제 날짜를 입력하거나 비워 두어 현재 기준일을 유지해 주세요.', 'invalid-catalog-selection':'현재 사본에 있는 항목만 선택할 수 있습니다. 취소 후 다시 열어 주세요.', 'map-plan-owner-required':'Map의 공동 기준일과 항목 범위는 아직 연결 중입니다. 현재 원문과 기존 실행은 그대로 사용할 수 있습니다.', 'relative-series-anchor-owner-required':'바뀌는 상대 반복마다 회차·범위·새 날짜를 선택해 주세요.', 'excluded-series-reinclude-review-required':'제외한 반복은 기준일을 유지한 채 먼저 다시 포함해 주세요. 저장 후 기준일을 바꿀 수 있습니다.','duplicate-series-owner':'같은 반복 계획이 두 번 선택됐습니다. 반복 선택을 지우고 각 항목의 현재 회차를 다시 골라 주세요.','unexpected-series-choice':'기준일이나 포함 범위가 바뀌었습니다. 반복 선택을 지우고 다시 확인해 주세요.','excluded-series-choice':'제외한 항목의 반복 변경 선택을 지워 주세요. 원문과 기록은 남습니다.','series-owner-conflict':'검토 중 반복 계획이 바뀌었습니다. 선택을 보관하고 취소한 뒤 다시 열어 주세요.','typed-source-schedule-required':'원문에서 상대 날짜를 정확히 확인하지 못했습니다. 원문 연결을 검토하거나 기준일을 비워 포함 선택만 적용해 주세요.', 'date-out-of-range':'계산한 날짜가 지원 범위를 벗어납니다. 다른 기준일을 선택해 주세요.', 'new-items-need-explicit-choice':'새로 생긴 각 항목을 포함할지 제외할지 직접 선택해 주세요.'} as Record<string,string>)[reason] ?? '현재 원문과 개인 상태를 안전하게 비교하지 못했습니다. 선택을 보관한 뒤 취소하고 다시 확인해 주세요.';
}
type Props={ data: ProgramData; flowRef: string; mutate: ProgramMutate; disabled?: boolean; onRegisterEditors?: (port: ProgramEditorFlush | null) => void; onPendingChange?: (pending: boolean) => void; canStart?: () => boolean };
export function ProgramLegacyPlan(props:Props){const read=readProgramLegacyPlan(props.data,props.data.activeActorId,props.flowRef,new Date().toISOString());return read.ok&&read.flow.presentation?.mapGroup?<ProgramLegacyMapPlan {...props}/>:<ProgramLegacySinglePlan {...props}/>;}
function ProgramLegacySinglePlan({ data, flowRef, mutate, disabled, onRegisterEditors, onPendingChange, canStart }: Props) {
  const actorId = data.activeActorId, live = useRef(data); live.current = data;
  const [draft,setDraft] = useState<ProgramLegacyPlanDraft|null>(null), draftRef = useRef(draft); draftRef.current = draft;
  const [preview,setPreview] = useState<ReturnType<typeof previewProgramLegacyPlan>|null>(null), [error,setError] = useState('');
  const [busy,setBusy] = useState(false), busyRef = useRef(false), locks = useRef(0), [locked,setLocked] = useState(false), composing = useRef(false);
  const expected = useRef(data.spaces[actorId]);
  const seriesInputs=useRef<Record<string,string>>({});
  const read = readProgramLegacyPlan(data,actorId,flowRef,new Date().toISOString());
  const hasPending = !!draft || busy;
  useEffect(() => { onPendingChange?.(hasPending); return () => onPendingChange?.(false); }, [hasPending, onPendingChange]);
  useEffect(() => {
    const port: ProgramEditorFlush = { hasPendingInput:()=>!!draftRef.current || busyRef.current || composing.current,
      flushAll:async()=>!draftRef.current && !busyRef.current && !composing.current,
      lockInput:()=>{ locks.current++; setLocked(true); return()=>{ locks.current=Math.max(0,locks.current-1); setLocked(locks.current>0); }; },
      pendingDocumentIds:()=>live.current.spaces[actorId].savedBindings.filter(row=>row.flowRef===flowRef).map(row=>row.documentId),
      captureDrafts:()=>draftRef.current ? [{ title:'기존 계획 선택',raw:JSON.stringify({draft:draftRef.current,seriesInputs:seriesInputs.current},null,2) }] : [],
      blocksExternalSnapshot:()=>!!draftRef.current || busyRef.current || composing.current };
    onRegisterEditors?.(port); return()=>onRegisterEditors?.(null);
  },[actorId,flowRef,onRegisterEditors]);
  if (!read.ok) return <p role="status">기준일·포함 선택을 읽지 못했습니다. 원문과 기존 기록은 유지됩니다.</p>;
  const cancel = () => { if (!busyRef.current && !locks.current && !composing.current) { seriesInputs.current={};draftRef.current=null;setDraft(null);setPreview(null);setError(''); } };
  const stale = !!draft && !programSame(expected.current,data.spaces[actorId]);
  return <section className={`${styles.notice} ${planStyles.panel}`} aria-label="기존 사본 기준일과 포함 선택" onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onKeyDown={event=>{ if(event.key==='Escape'){event.preventDefault();cancel();} }}>
    <h3>내 계획 기준일·포함 항목</h3>
    <p>원문 기준일 {read.sourceAnchor ?? '없음'} · 내 기준일 {read.personalAnchor ?? '없음'}</p>
    {read.stale && <p role="alert">원본 항목이 바뀌었습니다. 이전 기준일과 포함 선택, 기록은 보관 중입니다. 새 항목을 자동 포함하지 않았습니다. 원본 연결 검토가 필요합니다.</p>}
    {!draft ? <button type="button" disabled={disabled || locked} onClick={()=>{ if(disabled || locks.current || canStart?.()===false)return; expected.current=data.spaces[actorId];const next:ProgramLegacyPlanDraft={includedItemRefs:read.rows.filter(row=>row.included).map(row=>row.itemRef),...(read.stale?{reviewSourceToken:read.token,newItemChoices:{}}:{})};draftRef.current=next;setDraft(next); }}>기준일·항목 선택 검토</button> : <>
      <label>새 개인 기준일 (비우면 현재 유지)<input type="date" value={draft.personalAnchor ?? ''} disabled={busy || locked} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onChange={event=>{ if(busyRef.current||locks.current)return; const next={...draft,personalAnchor:event.target.value || undefined,seriesChoices:undefined};draftRef.current=next;setDraft(next);setPreview(null); }}/></label>
      <p>선택 {draft.includedItemRefs.length} / 현재 사본 {read.rows.length}. 제외해도 원문·개인 메모·지난 기록은 남습니다.</p>
      {read.rows.map(row=>row.pending ? <fieldset key={row.itemRef} disabled={busy||locked}><legend>{row.title} · 새 원문 항목</legend>{[true,false].map(include=><label key={String(include)}><input type="radio" name={`new-${row.itemRef}`} checked={draft.newItemChoices?.[row.itemRef]===include} onChange={()=>{if(busyRef.current||locks.current)return;const next={...draft,seriesChoices:undefined,newItemChoices:{...draft.newItemChoices,[row.itemRef]:include},includedItemRefs:include?[...draft.includedItemRefs.filter(ref=>ref!==row.itemRef),row.itemRef]:draft.includedItemRefs.filter(ref=>ref!==row.itemRef)};draftRef.current=next;setDraft(next);setPreview(null);}}/>{include?'포함':'제외'}</label>)}</fieldset> : <label key={row.itemRef}><input type="checkbox" checked={draft.includedItemRefs.includes(row.itemRef)} disabled={busy||locked} onChange={event=>{if(busyRef.current||locks.current)return; const next={...draft,seriesChoices:undefined,includedItemRefs:event.target.checked?[...draft.includedItemRefs,row.itemRef]:draft.includedItemRefs.filter(ref=>ref!==row.itemRef)};draftRef.current=next;setDraft(next);setPreview(null); }}/>{row.title}{row.recurrence?' · 전체 반복 항목 (회차 기록 보존)':''}</label>)}
      <ProgramLegacyPlanSeries data={data} read={read} anchor={draft.personalAnchor} included={draft.includedItemRefs} choices={draft.seriesChoices} disabled={busy||locked||stale} canEdit={()=>!busyRef.current&&!locks.current} onCapture={(id,raw)=>{if(raw)seriesInputs.current[id]=raw;else delete seriesInputs.current[id];setPreview(null);}} onChange={seriesChoices=>{if(busyRef.current||locks.current)return;const next={...draft,seriesChoices};draftRef.current=next;setDraft(next);setPreview(null);}}/>
      {stale && <p role="alert">검토 중 개인 내용이 바뀌었습니다. 현재 선택을 취소하고 다시 확인해 주세요.</p>}
      <div className={styles.actions}><button type="button" disabled={busy||locked||stale} onClick={()=>{if(composing.current||Object.keys(seriesInputs.current).length){setError('열어 둔 회차 선택을 확인하거나 취소해 주세요.');return;}setPreview(previewProgramLegacyPlan(data,{actorId,flowRef,now:new Date().toISOString(),draft}));}}>변경 비교</button><button type="button" disabled={busy||locked} onClick={cancel}>취소</button></div>
      {preview && (!preview.ok ? <p role="alert">{programLegacyPlanIssue(preview.reason)}</p> : <><p>계획 날짜 변경 {preview.counts.planDateChanges}개 · 실행 날짜 변경 {preview.counts.executionDateChanges}개 · 제외 {preview.counts.excluded}개 · 다시 포함 {preview.counts.restored}개</p><div className={planStyles.comparison} tabIndex={0} role="region" aria-label="항목별 계획과 실행 날짜 변화"><table><thead><tr><th>항목</th><th>원문 날짜</th><th>계획 날짜</th><th>실행 날짜</th><th>포함 선택</th></tr></thead><tbody>{preview.rows.map(row=><tr key={row.itemRef}><td>{row.title}</td><td>{row.sourceDate??'미정'}</td><td>{row.planDate??'미정'} → {row.afterDate??'미정'}</td><td>{row.executionDate??'미정'} → {row.afterExecutionDate??'미정'}</td><td>{row.afterIncluded?'포함':'제외 · 기록 보관'}</td></tr>)}</tbody></table></div><ProgramLegacySeriesComparison receipts={preview.seriesPreviews} titles={Object.fromEntries(read.rows.map(r=>[r.itemRef,r.title]))}/><p>개인 고정·미정 실행 날짜와 진행 기록은 유지합니다.</p><button type="button" disabled={busy||locked||stale} onClick={()=>{ if(busyRef.current||locks.current||composing.current||Object.keys(seriesInputs.current).length)return;busyRef.current=true;setBusy(true);void(async()=>{try{const result=await mutate('기존 계획 기준일·포함 선택',current=>applyProgramLegacyPlan(current,{actorId,flowRef,now:new Date().toISOString(),draft,expectedSpace:expected.current}));if(result.ok){seriesInputs.current={};draftRef.current=null;setDraft(null);setPreview(null);setError('');}else setError(programErrorMessage(result.reason));}catch{setError('저장하지 못했습니다. 선택을 유지했습니다.');}finally{busyRef.current=false;setBusy(false);}})();}}>이 선택 적용</button></>)}
      {error&&<p role="alert">{error}</p>}
    </>}
  </section>;
}
