'use client';

import React, { useEffect, useRef, useState } from 'react';
import { programClone, programId, type ProgramData, type ProgramItemPatch, type ProgramPublicItem, type ProgramPublicVersion } from '@/lib/flow/integrated-poc/contract';
import { programSame } from '@/lib/flow/integrated-poc/controller';
import { programCopyProposalContextMatches, programCopyProposalPreviousChecks, submitProgramCopyProposal, type ProgramCopyProposalContext } from '@/lib/flow/integrated-poc/copy-proposal';
import { validateProgramProposalChecks } from '@/lib/flow/integrated-poc/program-data';
import type { ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import { programRecurringDraftFromSchedule, programRecurringScheduleFromDraft, type ProgramPublicationRecurrenceDraft } from '@/lib/flow/integrated-poc/public-recurrence-contract';
import { programProposalComparisonValue } from '@/lib/flow/integrated-poc/proposal-comparison';
import { programErrorMessage, type ProgramMutate } from '@/lib/flow/integrated-poc/ui-contract';
import { ProgramPublicationRecurrence } from './ProgramPublicationRecurrence';
import { ProgramPublicationTiming } from './ProgramPublicationTiming';
import { programOrdinaryTimingDraft, programOrdinaryTimingFromDraft, type ProgramOrdinaryTimingDraft } from '@/lib/flow/integrated-poc/public-ordinary-time';
import styles from './ProgramCopyInspector.module.css';

type Field = 'title' | 'description' | 'completionCriteria' | 'schedule' | 'subchecks';
type Draft = { context: ProgramCopyProposalContext; versionNumber: number; requestId: string; field: Field; text: string;
  scheduleKind: ProgramPublicItem['schedule']['kind']; recurrence: ProgramPublicationRecurrenceDraft; timing: ProgramOrdinaryTimingDraft; reason: string; subchecks: ProgramPublicItem['subchecks'] };
export type ProgramCopyProposalProps = { data: ProgramData; copyId: string; version: ProgramPublicVersion; mutate: ProgramMutate; disabled: boolean;
  onRegisterEditors: (port: ProgramEditorFlush | null) => void; onPendingChange: (pending: boolean) => void };
const fields: Record<Field, string> = { title: '제목', description: '설명', completionCriteria: '완료 기준', schedule: '원문 일정', subchecks: '하위 체크' };
const emptyRecurrence = (): ProgramPublicationRecurrenceDraft => ({ version: 1, raw: '', end: '', startKind: 'undated', startValue: '', time: '', timeZone: '' });
function patchFrom(draft: Draft): ProgramItemPatch | null {
  if (draft.field === 'subchecks') return validateProgramProposalChecks(draft.subchecks) ? { subchecks: programClone(draft.subchecks) } : null;
  if (draft.field !== 'schedule') return { [draft.field]: draft.text };
  const timing = draft.scheduleKind !== 'recurring' ? programOrdinaryTimingFromDraft(draft.timing) : undefined;
  if (timing === null) return null;
  const ordinaryTiming = timing && (timing.time || timing.timeZone) ? { timing } : {};
  const schedule = draft.scheduleKind === 'recurring' ? programRecurringScheduleFromDraft(draft.recurrence)
    : draft.scheduleKind === 'fixed' ? { kind: 'fixed' as const, date: draft.text, ...ordinaryTiming }
      : draft.scheduleKind === 'relative' ? { kind: 'relative' as const, days: /^[+-]?\d+$/.test(draft.text.trim()) ? Number(draft.text) : NaN, ...ordinaryTiming }
        : { kind: 'undated' as const, ...ordinaryTiming };
  return schedule ? { schedule } : null;
}
export function ProgramCopyProposal(props: ProgramCopyProposalProps) {
  const live = useRef(props); live.current = props;
  const [draft, setDraft] = useState<Draft | null>(null), draftRef = useRef(draft);
  const [field, setField] = useState<Field>('description'), [busy, setBusy] = useState(false), [locked, setLocked] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const touched = useRef(false), composing = useRef(false), busyRef = useRef(false), locks = useRef(0);
  const form = useRef<HTMLFormElement>(null), itemSelect = useRef<HTMLSelectElement>(null), restoreSelection = useRef(false);
  const pending = () => touched.current || composing.current || busyRef.current;
  const signal = () => live.current.onPendingChange(pending());
  const readonly = () => { if (!composing.current) form.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea').forEach(input => { input.readOnly = locks.current > 0 || busyRef.current || live.current.disabled; }); };
  const update = (value: Draft | null, dirty = true) => {
    if ((locks.current || busyRef.current || live.current.disabled) && !composing.current) return;
    draftRef.current = value; setDraft(value); touched.current = dirty; setError(''); setMessage(''); signal();
  };
  useEffect(() => {
    props.onRegisterEditors({ hasPendingInput: pending, flushAll: async () => !pending(), blocksExternalSnapshot: pending,
      captureDrafts: () => pending() && draftRef.current ? [{ title: '미제출 원문 개선 제안', raw: JSON.stringify(draftRef.current, null, 2) }] : [],
      lockInput: () => { locks.current++; setLocked(true); readonly(); let released = false; return () => {
        if (released) return; released = true; locks.current--; setLocked(locks.current > 0); readonly();
      }; } });
    return () => props.onRegisterEditors(null);
  }, [props.onRegisterEditors]);
  useEffect(() => { readonly(); }, [props.disabled, busy, locked]);
  useEffect(() => { if (!busy && !draft && restoreSelection.current) { restoreSelection.current = false; itemSelect.current?.focus(); } }, [busy, draft]);
  const choose = (itemId: string, nextField = field) => {
    if (pending() || locks.current || live.current.disabled) return;
    setField(nextField);
    const source = props.version.items.find(item => item.id === itemId);
    if (!source) { update(null, false); return; }
    const schedule = source.schedule;
    update({ context: { actorId: props.data.activeActorId, copyId: props.copyId, flowId: props.version.flowId,
      baseVersionId: props.version.id, item: programClone(source) }, versionNumber: props.version.number, requestId: programId('copy-proposal'), field: nextField,
      text: nextField === 'subchecks' ? '' : nextField !== 'schedule' ? source[nextField] : schedule.kind === 'fixed' ? schedule.date : schedule.kind === 'relative' ? String(schedule.days) : '',
      scheduleKind: schedule.kind, recurrence: schedule.kind === 'recurring' ? programRecurringDraftFromSchedule(schedule) : emptyRecurrence(), timing: programOrdinaryTimingDraft(schedule.kind !== 'recurring' ? schedule.timing : undefined), reason: '', subchecks: programClone(source.subchecks) }, false);
  };
  const cancel = () => {
    if (busyRef.current || locks.current || live.current.disabled || composing.current) return;
    restoreSelection.current = true; update(null, false); setMessage('제안 입력을 취소했습니다. 저장된 내용은 바뀌지 않았습니다.');
  };
  const sameContext = !draft || (props.version.id === draft.context.baseVersionId && props.copyId === draft.context.copyId
    && programCopyProposalContextMatches(props.data, draft.context));
  const patch = draft && patchFrom(draft), unchanged = !!draft && !!patch && Object.entries(patch).every(([key, value]) => programSame(draft.context.item[key as Field], value));
  const previousChecks = draft?.field === 'subchecks' ? programCopyProposalPreviousChecks(props.data, draft.context).filter(check => !draft.subchecks.some(row => row.id === check.id)) : [];
  const focusCheck = (id?: string) => queueMicrotask(() => {
    const inputs = form.current?.querySelectorAll<HTMLInputElement>('input[data-proposal-check]');
    const input = inputs && [...inputs].find(input => input.dataset.proposalCheck === id);
    (input ?? form.current?.querySelector<HTMLButtonElement>('button[data-check-add]'))?.focus();
  });
  const changeChecks = (checks: ProgramPublicItem['subchecks'], focusId?: string) => {
    if (!draft || locks.current || busyRef.current || live.current.disabled || composing.current) return;
    update({ ...draft, subchecks: checks }); focusCheck(focusId);
  };
  return <details className={styles.section}><summary>이 원문의 항목 개선 제안</summary>
    <p>공개 v{draft?.versionNumber ?? props.version.number}의 항목 한 필드에 대한 제안입니다. 개인 메모와 진행 기록은 보내지 않습니다.</p>
    <form ref={form} aria-label="원문 항목 개선 제안" onCompositionStart={() => { composing.current = true; signal(); }} onCompositionEnd={() => { composing.current = false; readonly(); signal(); }}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!event.nativeEvent.isComposing) cancel(); } }}
      onSubmit={async event => {
        event.preventDefault(); const currentDraft = draftRef.current;
        if (!currentDraft || !sameContext || composing.current || busyRef.current || locks.current || live.current.disabled) return;
        const currentPatch = patchFrom(currentDraft);
        if (!currentPatch || Object.entries(currentPatch).every(([key, value]) => programSame(currentDraft.context.item[key as Field], value))) {
          setError(currentPatch ? '원문과 같은 내용입니다. 변경할 내용을 입력해 주세요.' : currentDraft.field === 'subchecks' ? '체크 문구를 확인해 주세요. 빈 문구나 줄바꿈은 보낼 수 없습니다.' : '일정 입력을 확인해 주세요. 제안을 보내지 않았습니다.'); return;
        }
        busyRef.current = true; setBusy(true); readonly(); signal(); setError(''); setMessage('');
        try {
          const input = { context: programClone(currentDraft.context), requestId: currentDraft.requestId, reason: currentDraft.reason, patch: currentPatch };
          const now = new Date().toISOString();
          const result = await live.current.mutate('원문 항목 개선 제안', current => submitProgramCopyProposal(current, input, now), { alphaSocial: {
            type: 'proposal-create', copyId: input.context.copyId, flowId: input.context.flowId, baseVersionId: input.context.baseVersionId,
            itemId: input.context.item.id, reason: input.reason, patch: input.patch,
          } });
          if (!result.ok) { setError(programErrorMessage(result.reason)); return; }
          restoreSelection.current = true; draftRef.current = null; setDraft(null); touched.current = false;
          setMessage(result.changed === false ? '이미 보낸 제안입니다. 중복으로 보내지 않았습니다.' : '개선 제안을 보냈습니다. 공개 원문은 아직 바뀌지 않았습니다.');
        } catch { setError(programErrorMessage('storage-unavailable')); }
        finally { busyRef.current = false; setBusy(false); readonly(); signal(); }
      }}>
      <label>원문 항목<select ref={itemSelect} disabled={busy || locked || props.disabled || pending()} value={draft?.context.item.id ?? ''} onChange={event => choose(event.target.value)}><option value="">항목 선택</option>{props.version.items.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label>제안할 필드<select disabled={busy || locked || props.disabled || pending()} value={field} onChange={event => choose(draft?.context.item.id ?? '', event.target.value as Field)}>{Object.entries(fields).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {draft && <><small>현재 공개 원문</small><pre>{programProposalComparisonValue(draft.context.item[draft.field])}</pre>
        {draft.field === 'subchecks' ? <fieldset className={styles.fields} disabled={busy || locked || props.disabled} aria-label="하위 체크 제안">
          <ul className={styles.items}>{draft.subchecks.map((check, index) => <li key={check.id}>
            <label>{`체크 문구 · ${index + 1}`}<input required maxLength={500} data-proposal-check={check.id} value={check.title}
              onChange={event => update({ ...draft, subchecks: draft.subchecks.map(row => row.id === check.id ? { ...row, title: event.target.value } : row) })} /></label>
            <div className={styles.actions}>
              <button type="button" aria-label={`체크 ${index + 1} 위로`} disabled={index === 0} onClick={() => { const checks = [...draft.subchecks]; [checks[index - 1], checks[index]] = [checks[index], checks[index - 1]]; changeChecks(checks, check.id); }}>위로</button>
              <button type="button" aria-label={`체크 ${index + 1} 아래로`} disabled={index === draft.subchecks.length - 1} onClick={() => { const checks = [...draft.subchecks]; [checks[index + 1], checks[index]] = [checks[index], checks[index + 1]]; changeChecks(checks, check.id); }}>아래로</button>
              <button type="button" aria-label={`체크 ${index + 1} 제안에서 제외`} onClick={() => changeChecks(draft.subchecks.filter(row => row.id !== check.id), draft.subchecks[index + 1]?.id ?? draft.subchecks[index - 1]?.id)}>제안에서 제외</button>
            </div>
          </li>)}</ul>
          {!draft.subchecks.length && <p>하위 체크가 없는 내용으로 제안합니다.</p>}
          <button type="button" data-check-add disabled={draft.subchecks.length >= 500} onClick={() => { const id = programId('proposal-check'); changeChecks([...draft.subchecks, { id, title: '' }], id); }}>체크 추가</button>
          {!!previousChecks.length && <label>이전 체크 복원<select value="" disabled={draft.subchecks.length >= 500} onChange={event => {
            const check = previousChecks.find(check => check.id === event.target.value); if (check) changeChecks([...draft.subchecks, { id: check.id, title: check.title }], check.id);
          }}><option value="">복원할 체크 선택</option>{previousChecks.map(check => <option key={check.id} value={check.id}>{check.title} · v{check.versionNumber}</option>)}</select></label>}
        </fieldset> : draft.field === 'schedule' ? <><label>일정 종류<select disabled={busy || locked || props.disabled} value={draft.scheduleKind} onChange={event => update({ ...draft, scheduleKind: event.target.value as Draft['scheduleKind'] })}>
          <option value="undated">미정</option><option value="fixed">고정 날짜</option><option value="relative">기준일로부터</option><option value="recurring">반복 일정</option></select></label>
          {draft.scheduleKind === 'recurring' ? <ProgramPublicationRecurrence value={draft.recurrence} disabled={busy || locked || props.disabled} purpose="proposal"
            styles={{ source: styles.fields, field: '', two: '', error: styles.error }} onChange={recurrence => update({ ...draft, recurrence })} />
            : draft.scheduleKind !== 'undated' && <label>{draft.scheduleKind === 'fixed' ? '날짜' : '기준일 차이 (일)'}<input required type={draft.scheduleKind === 'fixed' ? 'date' : 'text'} inputMode={draft.scheduleKind === 'relative' ? 'numeric' : undefined}
              readOnly={busy || locked || props.disabled} value={draft.text} onChange={event => update({ ...draft, text: event.target.value })} /></label>}</>
          : <label>제안 내용<textarea required={draft.field === 'title'} readOnly={busy || locked || props.disabled} value={draft.text} onChange={event => update({ ...draft, text: event.target.value })} rows={4} /></label>}
        <label>제안 이유<textarea required readOnly={busy || locked || props.disabled} value={draft.reason} onChange={event => update({ ...draft, reason: event.target.value })} rows={3} maxLength={10000} /></label>
        {draft.scheduleKind !== 'recurring' && draft.field === 'schedule' && <ProgramPublicationTiming value={draft.timing} disabled={busy || locked || props.disabled} purpose="proposal" styles={{ two: styles.fields, field: '', error: styles.error }} onChange={timing => update({ ...draft, timing })} />}
        {draft.field === 'schedule' && <p>작성자가 채택하면 새 공개 판본이 생깁니다. 개인 사본의 일정과 지난 기록은 자동으로 바뀌지 않습니다.</p>}
      </>}
      {!sameContext && <p role="alert" className={styles.error}>입력의 기준 판본·항목 연결이 달라졌습니다. 입력은 유지하며 다른 대상에 보내지 않습니다.</p>}
      {error ? <p role="alert" className={styles.error}>{error}</p> : <p role="status">{busy ? '저장 중…' : message}</p>}
      <div className={styles.actions}><button type="submit" disabled={busy || locked || props.disabled || !sameContext || !draft || !draft.reason.trim() || !patch || unchanged}>개선 제안 보내기</button>
        {draft && <button type="button" disabled={busy || locked || props.disabled} onClick={cancel}>제안 입력 취소</button>}</div>
    </form>
  </details>;
}
