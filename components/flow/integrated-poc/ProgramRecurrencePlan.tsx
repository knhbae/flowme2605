'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ProgramData, ProgramPrivateSpace } from '../../../lib/flow/integrated-poc/contract';
import type { ProgramEditorFlush } from '../../../lib/flow/integrated-poc/document-action';
import type { ProgramExecutionOccurrenceRow } from '../../../lib/flow/integrated-poc/recurrence-state';
import type { ProgramRecurrencePlanOwner } from '../../../lib/flow/integrated-poc/program-recurrence-plan-contract';
import { previewProgramRecurrencePlan, readProgramRecurrencePlan, resolveProgramRecurrencePlanTarget } from '../../../lib/flow/integrated-poc/program-recurrence-plan';
import { applyProgramRecurrencePlanTransition, prepareProgramRecurrencePlan } from '../../../lib/flow/integrated-poc/program-recurrence-plan-state';
import { programSame } from '../../../lib/flow/integrated-poc/controller';
import { programShiftDate } from '../../../lib/flow/integrated-poc/execution';
import { programErrorMessage, type ProgramMutate } from '../../../lib/flow/integrated-poc/ui-contract';
import styles from './ProgramRecurrence.module.css';
import { programRecurrencePlanFocusRequest, type ProgramRecurrencePlanFocusRequest } from '../../../lib/flow/integrated-poc/recurrence-plan-focus';

type Draft = {
  owner: ProgramRecurrencePlanOwner;
  expectedOwner: ProgramRecurrencePlanOwner | null;
  expectedSpace: ProgramPrivateSpace;
  scope: 'whole_series' | 'future_series';
  date: string;
};
type Props = {
  data: ProgramData; row: ProgramExecutionOccurrenceRow; today: string;
  mutate: ProgramMutate; disabled?: boolean;
  onApplied?: (request: ProgramRecurrencePlanFocusRequest) => void;
  onRegisterEditors?: (port: ProgramEditorFlush | null) => void;
  onPendingChange?: (pending: boolean) => void;
};

export function programRecurrencePlanIssue(reason: string): string {
  return ({
    'creator-plan-owner-required': '제작 문서에서 가져온 반복 계획의 전체 날짜 변경은 아직 연결 중입니다. 개별 회차의 날짜와 완료는 그대로 사용할 수 있습니다.',
    'source-unavailable-or-held': '원문이 바뀌었거나 보관·보류된 항목입니다. 원래 문서에서 상태를 확인한 뒤 다시 열어 주세요.',
    'source-cutover-requires-pending-inherited': '개인 날짜를 고정하거나 완료·제외한 회차는 새 계획의 시작으로 쓰지 않습니다. 원래 날짜를 따르는 미완료 회차를 선택해 주세요.',
    'series-cutover-requires-pending-or-reopened': '새 계획은 아직 완료하지 않은 회차부터 시작할 수 있습니다. 완료한 기록은 그대로 남깁니다.',
    'source-owned-occurrence': '이 회차는 이전 원본 계획에 남긴 기록입니다. 새 개인 계획의 회차에서 변경해 주세요.',
    'source-coverage-conflict': '보존한 이전 계획보다 앞선 날짜로 이동할 수 없습니다.',
    'unchanged-date': '현재와 같은 날짜입니다. 저장된 내용은 바뀌지 않았습니다.',
    'undated-cutover': '날짜 미정 회차는 새 계획의 시작으로 쓰지 않습니다. 이 회차에 실행 날짜를 정하거나 다른 미완료 회차를 선택해 주세요.',
    'invalid-owner-or-period': '이 범위의 반복 계획을 읽지 못했습니다. 원문과 기록은 유지됩니다.',
    'history-limit': '이 PoC의 계획 변경 이력 한도에 도달했습니다. 기존 기록은 유지됩니다.',
    'invalid-target': '선택한 회차나 날짜가 바뀌었습니다. 취소한 뒤 현재 회차에서 다시 열어 주세요.',
  } as Record<string, string>)[reason] ?? programErrorMessage(reason);
}

export function ProgramRecurrencePlan(props: Props) {
  const actorId = props.data.activeActorId, [draft, setDraft] = useState<Draft | null>(null), draftRef = useRef(draft);
  const [preview, setPreview] = useState<Extract<ReturnType<typeof previewProgramRecurrencePlan>, { ok: true }>['value'] | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), busyRef = useRef(false);
  const focusTrigger = useRef(false), focusRetry = useRef(false);
  const [locked, setLocked] = useState(false), locks = useRef(0), composing = useRef(false), live = useRef(props);
  live.current = props; draftRef.current = draft;
  const changeDraft = (value: Draft | null) => { draftRef.current = value; setDraft(value); live.current.onPendingChange?.(!!value); };
  useEffect(() => {
    const port: ProgramEditorFlush = {
      hasPendingInput: () => !!draftRef.current || busyRef.current || composing.current,
      flushAll: async () => !draftRef.current && !busyRef.current && !composing.current,
      captureDrafts: () => draftRef.current ? [{ title: '반복 계획 변경 선택', raw: JSON.stringify({ source: draftRef.current.owner.source, scope: draftRef.current.scope, date: draftRef.current.date }) }] : [],
      blocksExternalSnapshot: () => !!draftRef.current || busyRef.current || composing.current,
      lockInput: () => { locks.current++; setLocked(true); let released = false; return () => { if (!released) { released = true; locks.current--; setLocked(locks.current > 0); } }; },
    };
    props.onRegisterEditors?.(port);
    return () => { props.onRegisterEditors?.(null); live.current.onPendingChange?.(false); };
  }, [props.onRegisterEditors]);
  const blocked = props.disabled || busy || locked;
  const cancel = () => { if (busyRef.current || locks.current || composing.current) return; focusTrigger.current = true; changeDraft(null); setPreview(null); setError(''); };
  const open = () => {
    if (blocked || draftRef.current) return;
    const ready = prepareProgramRecurrencePlan(props.data, {
      actorId, flowRef: props.row.identity.sourceFlowRef, sourceIdentity: props.row.identity,
      ownerId: props.row.personalPlan?.ownerId ?? `plan-${crypto.randomUUID()}`, localToday: props.today, now: new Date().toISOString(),
    });
    if (!ready.ok) { setError(programRecurrencePlanIssue(ready.reason)); return; }
    changeDraft({ ...ready.value, scope: 'future_series', date: props.row.executionDate ?? props.row.originalDate }); setError('');
  };
  const stale = !!draft && !programSame(draft.expectedSpace, props.data.spaces[actorId]);
  const compare = () => {
    if (!draft || blocked || stale || composing.current) return;
    const resolved = resolveProgramRecurrencePlanTarget(draft.owner, { originalDate: props.row.originalDate, personalIdentity: props.row.personalPlan?.identity });
    if (!resolved.ok) { setError(programRecurrencePlanIssue(resolved.reason)); return; }
    const target = resolved.value;
    const result = previewProgramRecurrencePlan(draft.owner, {
      actorId, expected: draft.owner, currentSource: draft.owner.source,
      operation: { scope: draft.scope, targetDate: draft.date, target, sourceCutover: draft.owner.operations.length ? null : props.row.identity, at: new Date().toISOString() },
    });
    if (!result.ok) { setPreview(null); setError(programRecurrencePlanIssue(result.reason)); return; }
    setPreview(result.value); setError('');
  };
  const apply = async () => {
    if (!draft || !preview || busyRef.current || locks.current || composing.current || stale || props.disabled) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const outcome = await props.mutate('반복 계획 날짜 변경', current => applyProgramRecurrencePlanTransition(current, {
        actorId, expectedSpace: draft.expectedSpace, expectedOwner: draft.expectedOwner, preview, localToday: props.today,
      }));
      if (outcome.ok) {
        changeDraft(null); setPreview(null);
        if (!outcome.presentationPending) {
          // A focus handoff cannot turn a confirmed commit into a save failure.
          try { props.onApplied?.(programRecurrencePlanFocusRequest(preview.after, preview.operation.targetDate)); } catch { /* saved result remains authoritative */ }
        }
      } else { focusRetry.current = true; setError(programRecurrencePlanIssue(outcome.reason)); }
    } catch { focusRetry.current = true; setError(programErrorMessage('storage-unavailable')); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const start = draft ? (draft.date < props.row.originalDate ? draft.date : props.row.originalDate) : props.row.originalDate;
  const end = programShiftDate(draft?.date ?? start, 35) ?? draft?.date ?? start;
  const after = preview ? readProgramRecurrencePlan(preview.after, { start, end }) : null;
  return <section className={styles.plan} aria-label="반복 계획 날짜 변경" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); }
  }}>
    {!draft ? <button type="button" disabled={blocked} ref={node => { if (node && !node.disabled && focusTrigger.current) { focusTrigger.current = false; node.focus(); } }} onClick={open}>반복 계획 날짜 바꾸기</button> : <>
      <h4>반복 계획 날짜 변경</h4>
      <p>{props.row.title} · 선택한 회차 {props.row.originalDate}. 원문은 바꾸지 않습니다.</p>
      <fieldset disabled={blocked}><legend>변경 범위</legend>
        <label><input type="radio" name={`recurrence-scope-${props.row.key}`} checked={draft.scope === 'future_series'} onChange={() => { changeDraft({ ...draft, scope: 'future_series' }); setPreview(null); }} />이 회차부터</label>
        <label><input type="radio" name={`recurrence-scope-${props.row.key}`} checked={draft.scope === 'whole_series'} onChange={() => { changeDraft({ ...draft, scope: 'whole_series' }); setPreview(null); }} />전체 반복 계획</label>
      </fieldset>
      <p>이미 실행한 기록이 있으면 과거 계획과 기록은 남기고 선택한 회차부터 새 계획을 만듭니다.</p>
      <label>선택한 회차의 새 계획 날짜<input type="date" autoFocus value={draft.date} disabled={blocked} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onChange={event => { if (busyRef.current || locks.current) return; changeDraft({ ...draft, date: event.target.value }); setPreview(null); }} /></label>
      {stale && <p role="alert">검토 중 다른 내용이 저장됐습니다. 선택은 유지했습니다. 취소한 뒤 최신 계획에서 다시 열어 주세요.</p>}
      <div className={styles.controls}><button type="button" disabled={blocked || stale || !draft.date} onClick={compare}>계획 변경 비교</button><button type="button" disabled={blocked} onClick={cancel}>계획 변경 취소</button></div>
      {preview && after?.ok && <div className={styles.planPreview} aria-label="계획 변경 미리보기">
        <p>선택한 회차 {preview.operation.target.currentDate} → {preview.operation.targetDate}</p>
        <p>미리보기 {start}~{end}. 전체 반복 횟수가 아닌 이 기간의 새 개인 계획입니다.</p>
        <ul>{after.value.personalOccurrences.slice(0, 12).map(row => <li key={row.occurrenceId}>{row.localDate ?? '날짜 미정'}{row.scheduleProjection.startTime ? ` · ${row.scheduleProjection.startTime}` : ''}{row.scheduleProjection.timeZone ? ` · ${row.scheduleProjection.timeZone}` : ''}</li>)}</ul>
        {(after.value.personalOccurrences.length > 12 || after.value.truncated) && <p>미리보기 일부만 표시했습니다. 적용 후 기간 보기에서 다른 날짜를 확인할 수 있습니다.</p>}
        <p>원래 회차의 개인 날짜·완료·보류/제외 기록은 새 회차로 옮겨 쓰지 않습니다.</p>
        <button type="button" disabled={blocked || stale} ref={node => { if (node && !node.disabled && focusRetry.current) { focusRetry.current = false; node.focus(); } }} onClick={() => void apply()}>{busy ? '저장 중…' : '이 반복 계획 적용'}</button>
      </div>}
    </>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </section>;
}
