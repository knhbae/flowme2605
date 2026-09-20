'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { programId, type ProgramCopyCheckChoice, type ProgramCopyField, type ProgramData, type ProgramPrivateSpace, type ProgramPublicItem, type ProgramTransition } from '@/lib/flow/integrated-poc/contract';
import { applyProgramCopyVersion, applyProgramCopyKindChange, compareProgramCopyVersion, previewProgramCopyAnchor, previewProgramCopyScheduleResolution, previewProgramCopyKindChange, previewProgramCopyCheckResolution, setProgramCopyAnchor, setProgramCopyInclusion, setProgramCopySeriesStart, linkProgramCopySeries, unlinkProgramCopySeries, type ProgramCopyFieldComparison, type ProgramCopyScheduleResolution, type ProgramCopyKindChangePreview, type ProgramCopyCheckResolutionPreview } from '@/lib/flow/integrated-poc/private-space';
import { readProgramPublicCopyRecurrenceSource } from '@/lib/flow/integrated-poc/public-copy-recurrence';
import { previewProgramCopyFieldResolution, type ProgramCopyFieldResolutionPreview, type ProgramCopyResolvableField } from '@/lib/flow/integrated-poc/private-space';
import type { ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import { ProgramCopyProposal } from './ProgramCopyProposal';
import { programRecurringScheduleLabel } from '@/lib/flow/integrated-poc/public-recurrence-contract';
import { programOrdinaryScheduleLabel } from '@/lib/flow/integrated-poc/public-ordinary-time';
import { programErrorMessage, type ProgramMutate, type ProgramNavigate } from '@/lib/flow/integrated-poc/ui-contract';
import styles from './ProgramCopyInspector.module.css';

export type ProgramCopyInspectorProps = {
  data: ProgramData; mutate: ProgramMutate; navigate: ProgramNavigate; copyId: string; onClose: () => void; today: string;
  onRegisterEditors?: (port: ProgramEditorFlush | null) => void;
};
const labels: Record<ProgramCopyField, string> = { title: '제목', description: '설명', completionCriteria: '완료 기준', sourceUrl: '출처 링크', schedule: '원문 일정', subchecks: '하위 체크' };
const dateLabel = (value: string | null) => value ?? '미정';
const sourceBlockLabels: Record<NonNullable<ProgramCopyFieldComparison['blockedReason']>, string> = {
  'series-kind-change': '항목 형태가 바뀝니다. 이전 본문과 기록의 보관·복원을 먼저 확인해 주세요.',
  'series-private-start': '개인 시작일이 있습니다. 새 일정을 받기 전에 이전 선택의 보관을 확인해 주세요.',
  'series-personal-plan': '별도 개인 반복 계획이 있습니다. 새 일정과 이전 계획의 관계를 먼저 확인해 주세요.',
  'retired-check-review': '다시 추가된 체크의 문구가 보관된 내용과 다릅니다. 유지할 문구를 먼저 선택해 주세요.',
};
export function programCopyValueLabel(value: unknown): string {
  if (value === null) return '없음';
  if (typeof value === 'string') return value || '없음';
  if (Array.isArray(value)) return value.map(row => row.title).join('\n') || '없음';
  if (value && typeof value === 'object' && 'kind' in value) {
    const schedule = value as ProgramPublicItem['schedule'];
    return schedule.kind === 'recurring' ? programRecurringScheduleLabel(schedule)
      : programOrdinaryScheduleLabel(schedule);
  }
  return '';
}

/** Unchanged information remains available without displacing the current decision. */
export function ProgramCopyFieldChoices({ comparisons, selected, busy, versionNumber, onToggle, onReview }: {
  comparisons: ProgramCopyFieldComparison[]; selected: ProgramCopyField[]; busy: boolean; versionNumber: number;
  onToggle: (field: ProgramCopyField, checked: boolean) => void;
  onReview?: (field: ProgramCopyResolvableField, opener: HTMLButtonElement) => void;
}) {
  const changed = comparisons.filter(field => field.sourceChanged || field.privateChanged);
  const unchanged = comparisons.filter(field => !field.sourceChanged && !field.privateChanged);
  return <>
    {changed.length ? <ul className={styles.items}>{changed.map(field => <li key={field.field}>
      <label className={styles.check}><input type="checkbox" disabled={busy || !field.canApply || !field.sourceChanged} checked={selected.includes(field.field)} onChange={event => onToggle(field.field, event.target.checked)} />{labels[field.field]}</label>
      <small>내 사본의 기준 → 공개 v{versionNumber}</small><div className={styles.compare}><pre>{programCopyValueLabel(field.before)}</pre><pre>{programCopyValueLabel(field.incoming)}</pre></div>
      {field.privateChanged && <p className={styles.error}>개인 본문도 바뀌었습니다. 자동 반영하지 않습니다.<br />현재 개인 내용: {field.currentText}</p>}
      {onReview && field.sourceChanged && field.privateChanged && !field.alreadyApplied && ['title', 'description', 'completionCriteria', 'sourceUrl'].includes(field.field)
        && <button type="button" disabled={busy} aria-label={`${labels[field.field]} · 내 내용/새 내용 비교`} onClick={event => onReview(field.field as ProgramCopyResolvableField, event.currentTarget)}>내 내용/새 내용 비교</button>}
      {field.blockedReason && <p className={styles.error}>{sourceBlockLabels[field.blockedReason]}</p>}
      {field.field === 'schedule' && selected.includes('schedule') && field.canApply
        && (field.before as ProgramPublicItem['schedule'] | null)?.kind === 'recurring'
        && <p>반영한 반복 규칙으로 새 회차를 조회합니다. 지난 실행 기록은 유지되며, 달라진 회차는 자동으로 다시 연결하지 않습니다.</p>}
      {field.alreadyApplied && <small>현재 내용과 같습니다.</small>}
    </li>)}</ul> : <p>비교한 항목의 내용이 같습니다.</p>}
    {unchanged.length > 0 && <details className={styles.section}><summary>바뀌지 않은 정보 {unchanged.length}개</summary>
      <ul className={styles.items}>{unchanged.map(field => <li key={field.field}><strong>{labels[field.field]}</strong><pre>{programCopyValueLabel(field.incoming)}</pre></li>)}</ul>
    </details>}
  </>;
}

/** Keep the live outcome at the action that produced it, even in a long comparison. */
export function ProgramCopyFeedback({ busy, error, message }: { busy: boolean; error: string; message: string }) {
  if (error) return <p className={styles.error} role="alert">{error}</p>;
  if (busy) return <p role="status">저장 중…</p>;
  return message ? <p role="status">{message}</p> : null;
}

/** The default keeps private text. Only the separate apply action can accept source. */
export function ProgramCopyFieldReview({ preview, confirmed, disabled, onConfirm, onApply, onCancel }: {
  preview: ProgramCopyFieldResolutionPreview; confirmed: boolean; disabled: boolean;
  onConfirm: (value: boolean) => void; onApply: () => void; onCancel: () => void;
}) {
  return <section className={styles.section} aria-label={`${labels[preview.field]} 내용 비교`}><h3>{labels[preview.field]} · 사용할 내용</h3>
    <details><summary>내 사본의 비교 기준</summary><pre>{programCopyValueLabel(preview.before)}</pre></details>
    <div className={styles.compare}><div><strong>현재 내 내용</strong><pre>{programCopyValueLabel(preview.currentText)}</pre></div><div><strong>새 공개 내용</strong><pre>{programCopyValueLabel(preview.incoming)}</pre></div></div>
    <p>이 필드만 바꿉니다. 개인 날짜·진행·메모와 다른 필드는 유지합니다.</p>
    <fieldset className={styles.fields} disabled={disabled}>
      <label className={styles.check}><input type="radio" name="copy-field-choice" autoFocus checked={!confirmed} onChange={() => onConfirm(false)} />내 내용 유지</label>
      <label className={styles.check}><input type="radio" name="copy-field-choice" checked={confirmed} onChange={() => onConfirm(true)} />새 내용 선택</label>
      <div className={styles.actions}><button type="button" disabled={!confirmed} onClick={onApply}>새 내용 적용</button><button type="button" onClick={onCancel}>내 내용 유지하고 닫기</button></div>
    </fieldset>
  </section>;
}

/** One acknowledgement for the schedule only; unrelated field choices stay separate. */
export function ProgramCopyScheduleReview({ preview, confirmed, disabled, onConfirm, onApply, onCancel }: {
  preview: ProgramCopyScheduleResolution; confirmed: boolean; disabled: boolean;
  onConfirm: (value: boolean) => void; onApply: () => void; onCancel: () => void;
}) {
  return <section className={styles.section} aria-label="새 일정 수용 검토"><h3>새 일정 수용 검토</h3>
    <p>받을 원문 일정: {programRecurringScheduleLabel(preview.incoming)}</p>
    {preview.beforeStartDate !== preview.nextStartDate && <p>반복 시작: {dateLabel(preview.beforeStartDate)} → {dateLabel(preview.nextStartDate)}</p>}
    {preview.previousStart.present && <p>직접 정한 시작일 {dateLabel(preview.previousStart.date)}은 이력에 남깁니다.
      {preview.incoming.start.kind === 'undated' ? ' 새 원문도 시작 미정이므로 지금 선택을 계속 사용합니다.' : ' 앞으로는 새 원문의 시작 조건을 사용합니다.'}</p>}
    {preview.personalPlans.length > 0 && <ul className={styles.items}>{preview.personalPlans.map((plan, index) => <li key={plan.ownerId}>
      <strong>개인 계획 {index + 1}</strong>
      {plan.changes.map((change, index) => <small key={index}>{change.scope === 'whole_series' ? '전체 계획' : '이후 계획'} · {change.from} → {change.to}</small>)}
      <span>{plan.continuesAfter ? '이 판본에 연결했던 계획이 다시 활성화됩니다.' : '기존 계획은 읽기 전용으로 보관합니다.'} 개인 회차 기록 {plan.executionRecords}개를 유지합니다.</span>
    </li>)}</ul>}
    <p>지난 완료·날짜 기록을 새 회차에 복제하지 않습니다. 다른 원문 필드와 개인 메모는 바뀌지 않습니다.</p>
    <fieldset className={styles.fields} disabled={disabled}>
      <label className={styles.check}><input type="checkbox" autoFocus checked={confirmed} onChange={event => onConfirm(event.target.checked)} />이전 선택·기록을 보존하고 새 일정을 받겠습니다</label>
      <div className={styles.actions}><button type="button" disabled={!confirmed} onClick={onApply}>새 일정만 수용</button><button type="button" onClick={onCancel}>수용 취소</button></div>
    </fieldset>
  </section>;
}

export function ProgramCopyKindReview({ preview, confirmed, disabled, onConfirm, onApply, onCancel }: {
  preview: ProgramCopyKindChangePreview; confirmed: boolean; disabled: boolean;
  onConfirm: (value: boolean) => void; onApply: () => void; onCancel: () => void;
}) {
  const toSeries = preview.direction === 'ordinary-to-recurring';
  return <section className={styles.section} aria-label="항목 형태 전환 검토"><h3>{toSeries ? '일반 항목 → 반복 항목' : '반복 항목 → 일반 항목'}</h3>
    <div className={styles.compare}><pre>{programCopyValueLabel(preview.before)}</pre><pre>{programCopyValueLabel(preview.incoming)}</pre></div>
    {preview.ordinary.lineId && <p>{toSeries ? '기존 일반 항목을 읽기 전용으로 보관합니다.' : '이전 일반 항목과 개인 기록을 복원합니다.'} {preview.ordinary.title} · 개인 날짜 {dateLabel(preview.ordinary.date)}
      {' '}· 하위 체크 {preview.ordinary.childTasks}개 · 진행 기록 {preview.ordinary.progressRecords}개 · 문서 참조 {preview.ordinary.references}개를 유지합니다.</p>}
    {!toSeries && !preview.restoresOrdinary && <p>새 일반 항목은 완료하지 않은 상태로 시작합니다. 반복 회차의 완료를 가져오지 않습니다.</p>}
    {(preview.recurrenceRecords > 0 || preview.personalPlanOwnerIds.length > 0 || preview.recurringReferences > 0) && <p>반복 회차 기록 {preview.recurrenceRecords}개, 개인 계획 {preview.personalPlanOwnerIds.length}개, 반복 참조 {preview.recurringReferences}개를 보존합니다. 다른 형태의 완료로 합치지 않습니다.</p>}
    <p>개인 본문·메모·지난 기록은 유지합니다. 참조는 원래 형태를 계속 가리키며, 되돌리기로 전환 전 상태를 복원할 수 있습니다.</p>
    <fieldset className={styles.fields} disabled={disabled}>
      <label className={styles.check}><input type="checkbox" autoFocus checked={confirmed} onChange={event => onConfirm(event.target.checked)} />기존 내용과 기록을 보존하고 형태를 전환하겠습니다</label>
      <div className={styles.actions}><button type="button" disabled={!confirmed} onClick={onApply}>기록 보존·형태 전환</button><button type="button" onClick={onCancel}>전환 취소</button></div>
    </fieldset>
  </section>;
}

/** Each displayed comparison is immutable source content; private edits use the canonical editor. */
export function ProgramCopyCheckReview({ preview, choices, disabled, onChoose, onApply, onCancel }: {
  preview: ProgramCopyCheckResolutionPreview; choices: Record<string, ProgramCopyCheckChoice>; disabled: boolean;
  onChoose: (childId: string, choice: ProgramCopyCheckChoice | '') => void; onApply: () => void; onCancel: () => void;
}) {
  const ready = preview.checks.every(check => ['keep-private', 'accept-source'].includes(choices[check.childId]));
  return <section className={styles.section} aria-label="다시 추가된 체크 비교"><h3>다시 추가된 체크</h3>
    <p>체크마다 사용할 문구를 고릅니다. 날짜·완료·메모는 유지하고, 이전 문구는 선택 이력에 남깁니다.</p>
    <fieldset className={styles.fields} disabled={disabled}>
      {preview.checks.map((check, index) => <div key={check.childId} className={styles.section}>
        <div className={styles.compare}><div><strong>보관한 문구</strong><pre>{check.previousTitle}</pre></div><div><strong>새 원문</strong><pre>{check.incomingTitle}</pre></div></div>
        {(check.progressRecords > 0 || check.descendantRows > 0) && <small>진행 기록 {check.progressRecords}개 · 하위 행 {check.descendantRows}개 유지</small>}
        <label>사용할 문구 · {index + 1}<select autoFocus={index === 0} value={choices[check.childId] ?? ''} onChange={event => onChoose(check.childId, event.target.value as ProgramCopyCheckChoice | '')}>
          <option value="">문구 선택</option><option value="keep-private">보관한 문구 유지</option><option value="accept-source">새 원문 받기</option>
        </select></label>
      </div>)}
      <details><summary>받을 하위 체크 전체 {preview.incoming.length}개</summary><ul>{preview.incoming.map(child => <li key={child.id}>{child.title}</li>)}</ul><p>위에서 보관한 문구를 선택한 체크는 개인 문구로 표시합니다. 원문에서 빠진 체크의 개인 본문·기록은 보관합니다.</p></details>
      <div className={styles.actions}><button type="button" disabled={!ready} onClick={onApply}>선택한 문구로 체크 복원</button><button type="button" onClick={onCancel}>복원 취소</button></div>
    </fieldset>
  </section>;
}

export function ProgramCopyInspector(props: ProgramCopyInspectorProps) {
  const { data, copyId } = props, actorId = data.activeActorId, space = data.spaces[actorId];
  const copy = space.copies.find(copy => copy.id === copyId);
  const flow = copy && data.public.flows.find(flow => flow.id === copy.flowId);
  const versions = copy ? data.public.versions.filter(version => version.flowId === copy.flowId).sort((a, b) => b.number - a.number) : [];
  const original = versions.find(version => version.id === copy?.baseVersionId);
  const [anchor, setAnchor] = useState(copy?.anchor ?? '');
  const [anchorPreview, setAnchorPreview] = useState(false);
  const [versionId, setVersionId] = useState(flow?.currentVersionId ?? original?.id ?? '');
  const [selectedItem, setSelectedItem] = useState('');
  const [fields, setFields] = useState<ProgramCopyField[]>([]);
  const proposalPort = useRef<ProgramEditorFlush | null>(null), proposalPendingRef = useRef(false);
  const [proposalPending, setProposalPending] = useState(false);
  const registerProposal = useCallback((port: ProgramEditorFlush | null) => { proposalPort.current = port; }, []);
  const reportProposal = useCallback((pending: boolean) => { proposalPendingRef.current = pending; setProposalPending(pending); }, []);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [feedbackTarget, setFeedbackTarget] = useState<'general' | 'source-fields' | 'schedule-resolution'>('general');
  const [scheduleDraft, setScheduleDraft] = useState<{ preview: ProgramCopyScheduleResolution | ProgramCopyKindChangePreview | ProgramCopyCheckResolutionPreview | ProgramCopyFieldResolutionPreview; checkChoices?: Record<string, ProgramCopyCheckChoice>; confirmed: boolean; expectedSpace: ProgramPrivateSpace; requestId: string; at: string } | null>(null);
  const scheduleRef = useRef(scheduleDraft), scheduleOpener = useRef<HTMLButtonElement | null>(null), comparisonItemSelect = useRef<HTMLSelectElement | null>(null);
  scheduleRef.current = scheduleDraft;
  const updateScheduleDraft = (value: typeof scheduleDraft) => { scheduleRef.current = value; setScheduleDraft(value); };
  const [seriesDraft, setSeriesDraft] = useState<{ itemId: string; title: string; value: string } | null>(null);
  const [referenceDocuments, setReferenceDocuments] = useState<Record<string, string>>({});
  const draftRef = useRef(seriesDraft), busyRef = useRef(false), locks = useRef(0), startOpener = useRef<HTMLButtonElement | null>(null);
  const [locked, setLocked] = useState(false);
  draftRef.current = seriesDraft;
  const updateSeriesDraft = (value: typeof seriesDraft) => { draftRef.current = value; setSeriesDraft(value); };
  useEffect(() => {
    const pending = () => !!draftRef.current || !!scheduleRef.current || busyRef.current || !!proposalPort.current?.hasPendingInput?.();
    props.onRegisterEditors?.({ hasPendingInput: pending, flushAll: async () => !pending(),
      pendingDocumentIds: () => copy ? [copy.documentId] : [],
      captureDrafts: () => [...(draftRef.current ? [{ title: '개인 반복 시작일 입력', raw: `${draftRef.current.title}\n시작일: ${draftRef.current.value || '미정'}` }] : []),
        ...(scheduleRef.current ? [{ title: 'checks' in scheduleRef.current.preview ? '하위 체크 복원 검토' : 'field' in scheduleRef.current.preview ? `${labels[scheduleRef.current.preview.field]} 내용 비교` : '새 일정 수용 검토', raw: `${programCopyValueLabel(scheduleRef.current.preview.before)}\n→ ${programCopyValueLabel(scheduleRef.current.preview.incoming)}\n확인: ${scheduleRef.current.confirmed ? '선택' : '미선택'}${'field' in scheduleRef.current.preview ? `\n내 내용: ${scheduleRef.current.preview.currentText}\n사용할 내용: ${scheduleRef.current.confirmed ? '새 내용' : '내 내용 유지'}` : ''}${'checks' in scheduleRef.current.preview ? `\n${scheduleRef.current.preview.checks.map(check => `${check.previousTitle} → ${check.incomingTitle}: ${scheduleRef.current?.checkChoices?.[check.childId] === 'keep-private' ? '보관한 문구 유지' : scheduleRef.current?.checkChoices?.[check.childId] === 'accept-source' ? '새 원문 받기' : '미선택'}`).join('\n')}` : ''}` }] : []), ...(proposalPort.current?.captureDrafts?.() ?? [])],
      blocksExternalSnapshot: pending,
      lockInput: () => { locks.current++; setLocked(true); const releaseProposal = proposalPort.current?.lockInput(); let released = false; return () => { if (!released) { released = true; releaseProposal?.(); locks.current--; setLocked(locks.current > 0); } }; } });
    const warn = (event: BeforeUnloadEvent) => { if (pending()) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => { props.onRegisterEditors?.(null); window.removeEventListener('beforeunload', warn); };
  }, [props.onRegisterEditors, copy?.documentId]);
  useEffect(() => { if (!seriesDraft && startOpener.current) { startOpener.current.focus(); startOpener.current = null; } }, [seriesDraft]);
  useEffect(() => { if (!scheduleDraft && scheduleOpener.current) {
    const target = scheduleOpener.current.isConnected && !scheduleOpener.current.disabled ? scheduleOpener.current : comparisonItemSelect.current;
    target?.focus(); scheduleOpener.current = null;
  } }, [scheduleDraft]);
  if (!copy || !original) return <section className={styles.inspector}><p role="alert">개인 Flow의 원문 연결을 찾지 못했습니다.</p><button onClick={props.onClose}>닫기</button></section>;

  const recurring = readProgramPublicCopyRecurrenceSource(space, data.public, copy.id);
  const close = () => { if (busyRef.current || locks.current) return; if (draftRef.current || scheduleRef.current || proposalPendingRef.current) { setFeedbackTarget('general'); setError('입력 중인 시작일·비교·제안을 마치거나 취소한 뒤 닫아 주세요.'); return; } props.onClose(); };

  const target = versions.find(version => version.id === versionId) ?? original;
  const comparison = compareProgramCopyVersion(data, { actorId, copyId, versionId: target.id });
  const row = comparison.ok ? comparison.result.items.find(item => item.itemId === selectedItem) : undefined;
  const preview = anchorPreview ? previewProgramCopyAnchor(data, { actorId, copyId, anchor: anchor || null }) : null;
  const catalog = new Map(original.items.map(item => [item.id, item]));
  for (const itemId of Object.keys(copy.itemLines)) if (!catalog.has(itemId)) {
    const sourceVersion = copy.appliedFields[itemId]?.title ?? copy.baseVersionId;
    const item = versions.find(version => version.id === sourceVersion)?.items.find(item => item.id === itemId);
    if (item) catalog.set(itemId, item);
  }
  const requestBase = () => ({ actorId, requestId: programId('copy-action'), expectedSpace: space });
  async function save(label: string, build: (current: ProgramData) => ProgramTransition<string>, success: string, feedback: 'general' | 'source-fields' | 'schedule-resolution' = 'general') {
    if (busyRef.current || locks.current || proposalPendingRef.current) return;
    if (scheduleRef.current && feedback !== 'schedule-resolution') return;
    busyRef.current = true; setBusy(true); setFeedbackTarget(feedback); setError(''); setMessage('');
    try {
      const result = await props.mutate(label, build);
      if (result.ok) { setMessage(result.changed === false ? '같은 상태입니다. 저장된 내용은 바뀌지 않았습니다.' : success); return true; }
      setError(programErrorMessage(result.reason)); return false;
    } catch { setError(programErrorMessage('storage-unavailable')); return false; }
    finally { busyRef.current = false; setBusy(false); }
  }
  const cancelSchedule = () => { if (busyRef.current || locks.current) return; const preview = scheduleRef.current?.preview, label = preview && 'checks' in preview ? '체크 복원' : preview && 'direction' in preview ? '형태 전환' : preview && 'field' in preview ? '내용 변경' : '일정 수용'; updateScheduleDraft(null); setFeedbackTarget('schedule-resolution'); setError(''); setMessage(`${label}을 취소했습니다. 개인 계획과 기록은 그대로입니다.`); };
  return <section className={styles.inspector} aria-label="개인 Flow 설정" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (busyRef.current || locks.current) return;
      if (scheduleRef.current) cancelSchedule(); else if (draftRef.current) { updateSeriesDraft(null); setError(''); setMessage('시작일 변경을 취소했습니다.'); } else close(); }
  }}>
    <header className={styles.heading}><div><h2>{original.title}</h2><p>개인 사본 · 처음 가져온 원문 v{original.number}</p></div><button type="button" disabled={busy || locked} onClick={close}>닫기</button></header>
    <button type="button" disabled={busy || locked || !!seriesDraft || !!scheduleDraft || proposalPending} onClick={() => props.navigate({ view: 'flow', id: copy.flowId })}>공개 원문 확인</button>
    {feedbackTarget === 'general' && <ProgramCopyFeedback busy={busy} error={error} message={message} />}

    {recurring.ok && recurring.source.items.length > 0 && <section className={styles.section} aria-label="개인 반복 시작과 문서 참조"><h3>반복 시작과 문서 참조</h3>
      <p>참조 문서에서도 같은 회차를 사용합니다. 시작일을 바꾸면 이전 회차 기록은 보관하며 새 회차에 복제하지 않습니다.</p>
      <ul className={styles.items}>{recurring.source.items.map(entry => <li key={entry.item.id}><strong>{entry.item.title}</strong>
        <small>{programRecurringScheduleLabel(entry.item.schedule)}</small><span>개인 시작일: {entry.startDate ?? '미정'}</span>
        {entry.item.schedule.start.kind === 'undated' && <button type="button" disabled={busy || locked || !!seriesDraft || !!scheduleDraft || proposalPending} onClick={event => {
          if (busyRef.current || locks.current || draftRef.current || scheduleRef.current || proposalPendingRef.current) return;
          startOpener.current = event.currentTarget; updateSeriesDraft({ itemId: entry.item.id, title: entry.item.title, value: entry.startDate ?? '' }); setFeedbackTarget('general'); setError(''); setMessage('');
        }}>시작일 정하기 · {entry.item.title}</button>}
        {seriesDraft?.itemId === entry.item.id && <form aria-label={`${entry.item.title} 시작일`} onSubmit={async event => {
          event.preventDefault(); if (!draftRef.current || busyRef.current || locks.current) return;
          const draft = draftRef.current, input = { ...requestBase(), copyId, itemId: draft.itemId, start: draft.value || null };
          if (await save('개인 반복 시작일 변경', current => setProgramCopySeriesStart(current, input), '개인 시작일을 저장했습니다. 지난 기록은 유지됩니다.')) updateSeriesDraft(null);
        }}><fieldset disabled={busy || locked} className={styles.fields}>
          <label>개인 시작일<input type="date" autoFocus value={seriesDraft.value} onChange={event => updateSeriesDraft({ ...seriesDraft, value: event.target.value })} /></label>
          <div className={styles.actions}><button type="button" onClick={() => updateSeriesDraft({ ...seriesDraft, value: '' })}>미정으로</button><button type="submit">시작일 저장</button>
            <button type="button" onClick={() => { updateSeriesDraft(null); setError(''); setMessage('시작일 변경을 취소했습니다.'); }}>취소</button></div>
        </fieldset></form>}
        <fieldset disabled={busy || locked || !!seriesDraft || !!scheduleDraft || proposalPending} className={styles.fields}><label>참조할 문서 · {entry.item.title}<select value={referenceDocuments[entry.item.id] ?? ''} onChange={event => setReferenceDocuments(values => ({ ...values, [entry.item.id]: event.target.value }))}>
          <option value="">문서 선택</option>{[...space.text.documents, ...space.text.flows].filter(doc => doc.id !== copy.documentId && !space.archivedDocumentIds.includes(doc.id) && !space.documentTrash?.[doc.id]).map(doc => <option key={doc.id} value={doc.id}>{doc.title}</option>)}
        </select></label><button type="button" disabled={!referenceDocuments[entry.item.id]} onClick={() => {
          const input = { ...requestBase(), copyId, itemId: entry.item.id, documentId: referenceDocuments[entry.item.id] };
          void save('반복 문서 참조', current => linkProgramCopySeries(current, input), '문서에 같은 반복의 참조를 연결했습니다.');
        }}>문서에 참조 추가</button>
        {(copy.recurrence?.references ?? []).filter(ref => ref.itemId === entry.item.id).map(ref => <div className={styles.actions} key={ref.lineId}><span>{[...space.text.documents, ...space.text.flows].find(doc => doc.id === ref.documentId)?.title ?? '문서 없음'}</span>
          <button type="button" disabled={space.archivedDocumentIds.includes(ref.documentId) || !!space.documentTrash?.[ref.documentId]} onClick={() => {
            const input = { ...requestBase(), copyId, documentId: ref.documentId, lineId: ref.lineId };
            void save('반복 문서 참조 해제', current => unlinkProgramCopySeries(current, input), '이 문서의 참조만 해제했습니다. 회차 기록은 유지됩니다.');
          }}>이 참조 해제</button></div>)}
        </fieldset>
      </li>)}</ul>
    </section>}
    <fieldset disabled={busy || locked || !!seriesDraft || !!scheduleDraft || proposalPending} className={styles.fields}>

    <section className={styles.section} aria-labelledby="copy-anchor-heading"><h3 id="copy-anchor-heading">내 기준일</h3>
      <p>상대 일정만 기준일을 따라갑니다. 직접 바꾼 실행 날짜와 진행 기록은 유지합니다.</p>
      <form onSubmit={event => { event.preventDefault(); setAnchorPreview(true); }}>
        <label>기준일 <input type="date" value={anchor} onChange={event => { setAnchor(event.target.value); setAnchorPreview(false); }} /></label>
        <div className={styles.actions}><button type="button" onClick={() => { setAnchor(''); setAnchorPreview(false); }}>미정으로</button><button type="submit">변경 미리보기</button></div>
      </form>
      {preview && (preview.ok ? <div><ul className={styles.items}>{preview.result.items.map(item => <li key={item.itemId}>
        <strong>{item.title}</strong><small>원문 일정: {item.sourceSchedule}</small>
        <span>{item.recurring ? '반복 시작일' : '실행 날짜'}: {dateLabel(item.beforeDate)} → {dateLabel(item.afterDate)}</span>
        {item.recurring && item.beforeDate !== item.afterDate && <small>지난 회차 기록은 보관합니다. 별도 개인 반복 계획이 있으면 계획의 변경 범위를 먼저 확인해야 합니다.</small>}
        {item.privateOverride && <small>{item.recurring ? '기준일을 따르지 않는 시작일 유지' : '직접 정한 날짜 유지'}{item.inferredOverride ? ' · 본문 변경 감지' : ''}</small>}
      </li>)}</ul><button disabled={busy} type="button" onClick={async () => {
        const input = { ...requestBase(), copyId, anchor: anchor || null };
        if (await save('개인 Flow 기준일 변경', current => setProgramCopyAnchor(current, input), '기준일을 저장했습니다. 진행 기록은 그대로입니다.')) setAnchorPreview(false);
      }}>이 기준일로 저장</button></div> : <p role="alert">{programErrorMessage(preview.reason)}</p>)}
    </section>

    <section className={styles.section}><h3>가져온 원문의 전체 항목</h3><p>제외한 항목도 본문과 기록은 남습니다. 다시 포함하면 같은 항목으로 이어집니다.</p>
      <ul className={styles.items}>{[...catalog.values()].map(item => <li key={item.id}><div className={styles.heading}>
        <span>{item.title}<small>{copy.includedItemIds.includes(item.id) ? '실행 목록에 포함' : copy.itemLines[item.id] ? '제외됨 · 기록 보관' : '아직 가져오지 않음'}</small></span>
        <button disabled={busy} type="button" onClick={() => {
          const included = !copy.includedItemIds.includes(item.id), input = { ...requestBase(), copyId, itemId: item.id, included };
          void save(included ? '개인 Flow 항목 포함' : '개인 Flow 항목 제외', current => setProgramCopyInclusion(current, input), included ? '항목을 포함했습니다.' : '실행 목록에서 제외했습니다. 본문과 기록은 유지됩니다.');
        }}>{copy.includedItemIds.includes(item.id) ? '제외' : '포함'}</button>
      </div></li>)}</ul>
    </section>

    <section className={styles.section}><h3>공개 판본 비교</h3>
      <p>개인 메모와 지난 실행 기록은 유지합니다.</p>
      <label>비교할 공개 판본<select value={target.id} onChange={event => { if (proposalPendingRef.current) return; setVersionId(event.target.value); setSelectedItem(''); setFields([]); setFeedbackTarget('general'); setError(''); setMessage(''); }}>
        {versions.map(version => <option key={version.id} value={version.id}>v{version.number} · {version.title}</option>)}
      </select></label>
      {comparison.ok ? <><label>비교할 항목<select ref={comparisonItemSelect} value={selectedItem} onChange={event => { setSelectedItem(event.target.value); setFields([]); setFeedbackTarget('general'); setError(''); setMessage(''); }}><option value="">항목 선택</option>
        {comparison.result.items.map(item => <option key={item.itemId} value={item.itemId}>{item.title} · {{ added: '새 항목', removed: '원문에서 제외', changed: '변경 있음', unchanged: '같은 원문' }[item.state]}</option>)}
      </select></label>
      {row && <div>{row.state === 'removed' ? <p>이 판본에서 제외된 항목입니다. 개인 본문과 기록은 유지합니다.</p> : <>
        {row.state === 'added' && <p>처음 가져오는 항목은 전체 원문 필드와 하위 체크를 함께 만듭니다.</p>}
        <ProgramCopyFieldChoices comparisons={row.fields} selected={fields} busy={busy} versionNumber={target.number}
          onReview={(field, opener) => {
            if (busyRef.current || locks.current || scheduleRef.current || draftRef.current || proposalPendingRef.current || proposalPort.current?.hasPendingInput?.()) return;
            const reviewed = previewProgramCopyFieldResolution(data, { actorId, copyId, itemId: row.itemId, versionId: target.id, field });
            setFeedbackTarget('schedule-resolution'); setError(''); setMessage('');
            if (!reviewed.ok) { setError(programErrorMessage(reviewed.reason)); return; }
            scheduleOpener.current = opener;
            updateScheduleDraft({ preview: reviewed.result, confirmed: false, expectedSpace: space, requestId: programId('copy-field'), at: new Date().toISOString() });
          }}
          onToggle={(field, checked) => setFields(value => checked ? [...value, field] : value.filter(key => key !== field))} />
        {row.fields.some(field => field.field === 'subchecks' && !field.privateChanged && field.blockedReason === 'retired-check-review') && <button type="button" onClick={event => {
          if (busyRef.current || locks.current || scheduleRef.current || draftRef.current || proposalPendingRef.current || proposalPort.current?.hasPendingInput?.()) return;
          const reviewed = previewProgramCopyCheckResolution(data, { actorId, copyId, itemId: row.itemId, versionId: target.id });
          setFeedbackTarget('schedule-resolution'); setError(''); setMessage('');
          if (!reviewed.ok) { setError(programErrorMessage(reviewed.reason)); return; }
          scheduleOpener.current = event.currentTarget;
          updateScheduleDraft({ preview: reviewed.result, checkChoices: {}, confirmed: false, expectedSpace: space, requestId: programId('copy-checks'), at: new Date().toISOString() });
        }}>다시 추가된 체크 비교</button>}
        {row.fields.some(field => field.field === 'schedule' && !field.privateChanged && field.blockedReason === 'series-kind-change') && <button type="button" onClick={event => {
          if (busyRef.current || locks.current || scheduleRef.current || draftRef.current || proposalPendingRef.current || proposalPort.current?.hasPendingInput?.()) return;
          const reviewed = previewProgramCopyKindChange(data, { actorId, copyId, itemId: row.itemId, versionId: target.id });
          setFeedbackTarget('schedule-resolution'); setError(''); setMessage('');
          if (!reviewed.ok) { setError(programErrorMessage(reviewed.reason)); return; }
          scheduleOpener.current = event.currentTarget;
          updateScheduleDraft({ preview: reviewed.result, confirmed: false, expectedSpace: space, requestId: programId('copy-kind'), at: new Date().toISOString() });
        }}>항목 형태 전환 검토</button>}
        {row.fields.some(field => field.field === 'schedule' && field.sourceChanged && !field.privateChanged && ['series-private-start', 'series-personal-plan'].includes(field.blockedReason ?? '')) && <button type="button" onClick={event => {
          if (busyRef.current || locks.current || scheduleRef.current || draftRef.current || proposalPendingRef.current || proposalPort.current?.hasPendingInput?.()) return;
          const reviewed = previewProgramCopyScheduleResolution(data, { actorId, copyId, itemId: row.itemId, versionId: target.id });
          setFeedbackTarget('schedule-resolution'); setError(''); setMessage('');
          if (!reviewed.ok) { setError(programErrorMessage(reviewed.reason)); return; }
          scheduleOpener.current = event.currentTarget;
          updateScheduleDraft({ preview: reviewed.result, confirmed: false, expectedSpace: space, requestId: programId('copy-schedule'), at: new Date().toISOString() });
        }}>새 일정 수용 검토</button>}
        {feedbackTarget === 'source-fields' && <ProgramCopyFeedback busy={busy} error={error} message={message} />}
        <div className={styles.actions}><button type="button" disabled={busy} onClick={() => { setFields([]); setSelectedItem(''); setFeedbackTarget('general'); setError(''); setMessage('개인 사본을 그대로 유지합니다.'); }}>그대로 유지</button>
          <button type="button" disabled={busy || fields.length === 0} onClick={async () => {
            const input = { ...requestBase(), copyId, versionId: target.id, expectedBaseVersionId: copy.baseVersionId, itemIds: [row.itemId], fields };
            if (await save('공개 원문 선택 필드 반영', current => applyProgramCopyVersion(current, input), '선택한 변경을 반영했습니다. 상단 실행 취소로 되돌릴 수 있습니다.', 'source-fields')) setFields([]);
          }}>선택한 변경 반영</button></div>
      </>}</div>}</> : <p role="alert">{programErrorMessage(comparison.reason)}</p>}
    </section>

    </fieldset>
    {scheduleDraft && 'field' in scheduleDraft.preview && <ProgramCopyFieldReview preview={scheduleDraft.preview} confirmed={scheduleDraft.confirmed} disabled={busy || locked}
      onConfirm={confirmed => { const draft = scheduleRef.current; if (draft && 'field' in draft.preview && !busyRef.current && !locks.current) updateScheduleDraft({ ...draft, confirmed }); }} onCancel={cancelSchedule}
      onApply={() => { const draft = scheduleRef.current; if (!draft?.confirmed || !('field' in draft.preview) || busyRef.current || locks.current) return;
        const input = { actorId, requestId: draft.requestId, expectedSpace: draft.expectedSpace, copyId, versionId: draft.preview.toVersionId,
          expectedBaseVersionId: copy.baseVersionId, itemIds: [draft.preview.itemId], fields: [draft.preview.field], fieldResolution: { confirmed: true as const, at: draft.at, preview: draft.preview } };
        void save('공개 원문 충돌 내용 수용', current => applyProgramCopyVersion(current, input), '선택한 새 내용을 반영했습니다. 다른 개인 내용과 기록은 유지했습니다.', 'schedule-resolution').then(saved => { if (saved) { updateScheduleDraft(null); setFields([]); } });
      }} />}
    {scheduleDraft && 'direction' in scheduleDraft.preview && <ProgramCopyKindReview preview={scheduleDraft.preview} confirmed={scheduleDraft.confirmed} disabled={busy || locked}
      onConfirm={confirmed => { if (scheduleRef.current && !busyRef.current && !locks.current) updateScheduleDraft({ ...scheduleRef.current, confirmed }); }} onCancel={cancelSchedule}
      onApply={() => { const draft = scheduleRef.current; if (!draft?.confirmed || !('direction' in draft.preview) || busyRef.current || locks.current) return;
        const input = { actorId, requestId: draft.requestId, expectedSpace: draft.expectedSpace, confirmed: true as const, at: draft.at, preview: draft.preview };
        void save('공개 사본 형태 전환', current => applyProgramCopyKindChange(current, input), '형태를 전환했습니다. 이전 본문과 기록은 유지했으며 되돌리기로 복원할 수 있습니다.', 'schedule-resolution').then(saved => { if (saved) { updateScheduleDraft(null); setFields([]); } });
      }} />}
    {scheduleDraft && 'checks' in scheduleDraft.preview && <ProgramCopyCheckReview preview={scheduleDraft.preview} choices={scheduleDraft.checkChoices ?? {}} disabled={busy || locked}
      onChoose={(childId, choice) => { const draft = scheduleRef.current; if (!draft || !('checks' in draft.preview) || busyRef.current || locks.current) return;
        const choices = { ...draft.checkChoices }; if (choice) choices[childId] = choice; else delete choices[childId];
        updateScheduleDraft({ ...draft, checkChoices: choices, confirmed: draft.preview.checks.every(check => !!choices[check.childId]) });
      }} onCancel={cancelSchedule}
      onApply={() => { const draft = scheduleRef.current; if (!draft?.confirmed || !('checks' in draft.preview) || busyRef.current || locks.current) return;
        const input = { actorId, requestId: draft.requestId, expectedSpace: draft.expectedSpace, copyId, versionId: draft.preview.toVersionId, expectedBaseVersionId: copy.baseVersionId,
          itemIds: [draft.preview.itemId], fields: ['subchecks'] as ProgramCopyField[], checkResolution: { confirmed: true as const, at: draft.at, preview: draft.preview, choices: draft.checkChoices ?? {} } };
        void save('하위 체크 복원', current => applyProgramCopyVersion(current, input), '선택한 문구로 체크를 복원했습니다. 이전 문구와 개인 기록은 남겼습니다.', 'schedule-resolution').then(saved => { if (saved) { updateScheduleDraft(null); setFields([]); } });
      }} />}
    {scheduleDraft && !('direction' in scheduleDraft.preview) && !('checks' in scheduleDraft.preview) && !('field' in scheduleDraft.preview) && <ProgramCopyScheduleReview preview={scheduleDraft.preview} confirmed={scheduleDraft.confirmed} disabled={busy || locked}
      onConfirm={confirmed => { if (scheduleRef.current && !busyRef.current && !locks.current) updateScheduleDraft({ ...scheduleRef.current, confirmed }); }} onCancel={cancelSchedule}
      onApply={() => { const draft = scheduleRef.current; if (!draft?.confirmed || 'direction' in draft.preview || 'checks' in draft.preview || 'field' in draft.preview || busyRef.current || locks.current) return;
        const input = { actorId, requestId: draft.requestId, expectedSpace: draft.expectedSpace, copyId, versionId: draft.preview.toVersionId,
          expectedBaseVersionId: copy.baseVersionId, itemIds: [draft.preview.itemId], fields: ['schedule'] as ProgramCopyField[], scheduleResolution: { confirmed: true as const, at: draft.at, preview: draft.preview } };
        void save('개인 선택 보존·새 일정 수용', current => applyProgramCopyVersion(current, input), '새 일정을 수용했습니다. 이전 선택과 기록은 보관했으며 되돌리기로 복원할 수 있습니다.', 'schedule-resolution').then(saved => { if (saved) { updateScheduleDraft(null); setFields([]); } });
      }} />}
    {feedbackTarget === 'schedule-resolution' && <ProgramCopyFeedback busy={busy} error={error} message={message} />}
    {!!copy.checkResolutions?.entries.length && <details className={styles.section}><summary>체크 복원 선택 {copy.checkResolutions.entries.length}건</summary>
      <ul className={styles.items}>{[...copy.checkResolutions.entries].reverse().map(entry => <li key={entry.id}><strong>{catalog.get(entry.itemId)?.title ?? entry.itemId}</strong>
        <small>{entry.at} · v{versions.find(v => v.id === entry.toVersionId)?.number}</small>
        {entry.decisions.map(decision => <div key={decision.childId}><span>{decision.choice === 'keep-private' ? '보관한 문구 유지' : '새 원문 받기'}</span>
          <div className={styles.compare}><pre>{decision.previousTitle}</pre><pre>{decision.incomingTitle}</pre></div></div>)}
        <button type="button" disabled={busy || locked || !!seriesDraft || !!scheduleDraft || proposalPending} onClick={() => props.navigate({ view: 'flow', id: copy.flowId, versionId: entry.toVersionId, itemId: entry.itemId })}>비교한 원문 판본 보기</button>
      </li>)}</ul>
    </details>}
    {!!copy.kindHandoffs?.entries.length && <details className={styles.section}><summary>이전 실행 형태와 기록</summary>
      <ul className={styles.items}>{Object.entries(copy.kindHandoffs.items).map(([itemId, pair]) => <li key={itemId}><strong>{catalog.get(itemId)?.title ?? itemId}</strong>
        {(['ordinary', 'recurring'] as const).map(kind => {
          const slot = pair[kind], doc = [...space.text.documents, ...space.text.flows].find(doc => doc.lines.some(line => line.id === slot.lineId));
          return doc && <button key={kind} type="button" disabled={busy || locked || !!seriesDraft || !!scheduleDraft || proposalPending}
            onClick={() => props.navigate({ view: 'space', id: doc.id }, { writingLineId: slot.lineId })}>{kind === 'ordinary' ? '일반 항목·개인 기록' : '반복 원문·보존 기록'} 열기{doc.id === copy.documentId ? '' : ' · 보관됨'}</button>;
        })}
      </li>)}</ul>
    </details>}
    {!!copy.recurrence?.retainedChoices?.entries.length && <details className={styles.section}><summary>이전 일정 선택 {copy.recurrence.retainedChoices.entries.length}건</summary>
      <ul className={styles.items}>{[...copy.recurrence.retainedChoices.entries].reverse().map(choice => <li key={choice.id}>
        <strong>{catalog.get(choice.itemId)?.title ?? choice.itemId}</strong>
        <small>{choice.at} · v{versions.find(version => version.id === choice.fromVersionId)?.number} → v{versions.find(version => version.id === choice.toVersionId)?.number}</small>
        {choice.previousStart.present && <span>당시 개인 시작일: {dateLabel(choice.previousStart.date)}</span>}
        {choice.personalPlanOwnerIds.length > 0 && <span>당시 개인 계획 {choice.personalPlanOwnerIds.length}개 · 지난 기록은 문서의 보존 기록에서 확인할 수 있습니다.</span>}
        <button type="button" disabled={busy || locked || !!seriesDraft || !!scheduleDraft || proposalPending} onClick={() => props.navigate({ view: 'flow', id: copy.flowId, versionId: choice.fromVersionId, itemId: choice.itemId })}>이전 원문 판본 보기</button>
      </li>)}</ul>
    </details>}
    <ProgramCopyProposal data={data} copyId={copy.id} version={target} mutate={props.mutate} disabled={busy || locked || !!seriesDraft || !!scheduleDraft}
      onRegisterEditors={registerProposal} onPendingChange={reportProposal} />
  </section>;
}
export default ProgramCopyInspector;
