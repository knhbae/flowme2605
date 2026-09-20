'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProgramData } from '../../../lib/flow/integrated-poc/contract';
import { programDateRange, type ProgramPeriod } from '../../../lib/flow/integrated-poc/execution';
import { programErrorMessage, type ProgramMutate } from '../../../lib/flow/integrated-poc/ui-contract';
import { readProgramExecutionOccurrences, readProgramOccurrencePeriod, programOccurrenceWindowFor, updateProgramOccurrenceExecution, type ProgramExecutionOccurrenceRow } from '../../../lib/flow/integrated-poc/recurrence-state';
import type { ProgramOccurrenceExecution, ProgramOccurrenceIdentity } from '../../../lib/flow/integrated-poc/recurrence-state-contract';
import { programDate } from '../../../lib/flow/integrated-poc/program-data';
import { programSeriesMetadata, programSeriesVisibleInDocument } from '../../../lib/flow/integrated-poc/recurrence-target';
import styles from './ProgramRecurrence.module.css';
import type { ProgramEditorFlush } from '../../../lib/flow/integrated-poc/document-action';
import type { ProgramRecurrenceDocumentPresentation } from '../../../lib/flow/integrated-poc/navigation';
import { programOccurrenceSourceFacts, readProgramOccurrenceRecovery, reconnectProgramOccurrenceSource, type ProgramOccurrenceRecovery } from '../../../lib/flow/integrated-poc/recurrence-recovery';
import { updateProgramPersonalOccurrence } from '../../../lib/flow/integrated-poc/program-recurrence-plan-state';
import { ProgramRecurrencePlan } from './ProgramRecurrencePlan';
import { programRecurrenceFocusId, type ProgramRecurrencePlanFocusRequest } from '../../../lib/flow/integrated-poc/recurrence-plan-focus';

export type ProgramRecurrenceProps = { data: ProgramData; mutate: ProgramMutate; today: string; period: ProgramPeriod; date: string;
  row?: ProgramExecutionOccurrenceRow;
  onPlanApplied?: (request: ProgramRecurrencePlanFocusRequest) => void;
  presentation?: ProgramRecurrenceDocumentPresentation; onPresentationChange?: (value: ProgramRecurrenceDocumentPresentation) => void;
  onRegisterEditors?: (port: ProgramEditorFlush | null) => void;
  documentId?: string; folderId?: string; query?: string; onOpenSource: (documentId: string, lineId: string) => void;
  onShowPeriod?: (period: ProgramPeriod, date: string) => void; onUndo: () => Promise<void>; onRedo: () => Promise<void> };

const sourceRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const sourceText = (...values: unknown[]) => values.find(value => typeof value === 'string' && value.trim()) as string | undefined;
export function programRecurrenceComparison(identity: ProgramOccurrenceIdentity, repository?: ProgramData['public'], sourceFacts = programOccurrenceSourceFacts(identity, repository)) {
  const facts = sourceRecord(sourceFacts), item = sourceRecord(facts.item), context = sourceRecord(facts.context), attributes = sourceRecord(context.attributes);
  const version = sourceRecord(facts.publicVersion);
  return [
    ...(identity.publicOwner ? [['일정 기준 공개 판본', typeof version.number === 'number' ? `v${version.number}` : undefined]] : []),
    ['제목', sourceText(item.title)], ['설명', sourceText(attributes.description, item.description)],
    ['원문 날짜', sourceText(attributes.date, item.sourceDate, identity.sourceRule.startDate)],
    ['시간', sourceText(attributes.time, item.sourceTimingLabel)], ['시간대', sourceText(attributes.timeZone, item.timeZone)],
    ['반복 규칙', [sourceText(attributes.recurrence, identity.sourceRule.recurrence), sourceText(attributes.recurrenceEnd, identity.sourceRule.recurrenceEnd)].filter(Boolean).join(' · ')],
  ].map(([label, value]) => ({ label: label!, value: facts.unavailable ? '원본 확인 불가' : value || '지정 없음' }));
}

export function ProgramRecurrence(props: ProgramRecurrenceProps) {
  const { data, today, period, date } = props, actorId = data.activeActorId, space = data.spaces[actorId];
  const [localPresentation, setLocalPresentation] = useState<ProgramRecurrenceDocumentPresentation>({ page: 0, includeHeld: false, includeExcluded: false });
  const presentation = props.presentation ?? localPresentation, showHeld = presentation.includeHeld, showExcluded = presentation.includeExcluded, page = presentation.page;
  const changePresentation = (patch: Partial<ProgramRecurrenceDocumentPresentation>) => { const next = { ...presentation, ...patch }; if (props.onPresentationChange) props.onPresentationChange(next); else setLocalPresentation(next); };
  const setShowHeld = (includeHeld: boolean) => changePresentation({ includeHeld }), setShowExcluded = (includeExcluded: boolean) => changePresentation({ includeExcluded });
  const setPage = (change: (value: number) => number) => changePresentation({ page: change(page) });
  const [target, setTarget] = useState<string | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), busyRef = useRef(false);
  const [dateDraft, setDateDraft] = useState<{ row: ProgramExecutionOccurrenceRow; value: string } | null>(null), dateDraftRef = useRef(dateDraft); dateDraftRef.current = dateDraft;
  const [locked, setLocked] = useState(false), lockCount = useRef(0);
  const planPort = useRef<ProgramEditorFlush | null>(null), [planPending, setPlanPending] = useState(false);
  const registerPlan = useCallback((port: ProgramEditorFlush | null) => { planPort.current = port; }, []);
  const [review, setReview] = useState<ProgramOccurrenceRecovery | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<{ text: string; source: string; key: string; reconnected: boolean } | null>(null);
  const sourceMessageScope = useMemo(() => JSON.stringify([actorId, props.documentId, space.legacySnapshot?.raw, space.creatorWorkspace?.executionSources]), [actorId, props.documentId, space.legacySnapshot?.raw, space.creatorWorkspace?.executionSources]);
  const [lookupDate, setLookupDate] = useState(date);
  const cancelDate = () => { dateDraftRef.current = null; setDateDraft(null); };
  useEffect(() => {
    props.onRegisterEditors?.({ hasPendingInput: () => !!dateDraftRef.current || busyRef.current || !!planPort.current?.hasPendingInput?.(),
      flushAll: async () => !dateDraftRef.current && !busyRef.current && (await planPort.current?.flushAll() ?? true),
      captureDrafts: () => [...(dateDraftRef.current ? [{ title: '회차 날짜 변경 초안', raw: JSON.stringify({ identity: dateDraftRef.current.row.personalPlan?.identity ?? dateDraftRef.current.row.identity, date: dateDraftRef.current.value }) }] : []), ...(planPort.current?.captureDrafts?.() ?? [])],
      lockInput: () => { lockCount.current++; setLocked(true); const releasePlan = planPort.current?.lockInput(); let released = false; return () => { if (!released) { released = true; releasePlan?.(); lockCount.current--; setLocked(lockCount.current > 0); } }; },
      blocksExternalSnapshot: () => !!dateDraftRef.current || busyRef.current || !!planPort.current?.hasPendingInput?.() });
    const warn = (event: BeforeUnloadEvent) => { if (dateDraftRef.current || planPort.current?.hasPendingInput?.()) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => { props.onRegisterEditors?.(null); window.removeEventListener('beforeunload', warn); };
  }, []);
  const metadata = useMemo(() => programSeriesMetadata(space), [space]);
  const selectedMetadata = metadata.filter(item => (!props.documentId || programSeriesVisibleInDocument(space, item, props.documentId)) && (!props.folderId || (() => {
    const document = [...space.text.documents, ...space.text.flows].find(doc => doc.id === item.documentId);
    let folder = space.text.folders.find(folder => folder.id === document?.folderId); const visited = new Set<string>();
    while (folder && !visited.has(folder.id)) { if (folder.id === props.folderId) return true; visited.add(folder.id); folder = space.text.folders.find(entry => entry.id === folder!.parentId); } return false;
  })()) && !space.archivedDocumentIds.includes(item.documentId));
  const flowRefs = [...new Set(selectedMetadata.map(item => item.flowRef))];
  const recoveryFlows = props.documentId ? [...new Set([
    ...selectedMetadata.map(item => item.flowRef),
    ...space.savedBindings.filter(binding => binding.documentId === props.documentId).map(binding => binding.flowRef),
    ...Object.values(space.creatorWorkspace?.executionSources ?? {}).filter(owner => owner.documentId === props.documentId).flatMap(owner => owner.revisions.map(revision => revision.flow.ref)),
  ])] : flowRefs;
  const recoveries = useMemo(() => props.row ? [] : readProgramOccurrenceRecovery(data, { actorId, localToday: today, flowRefs: recoveryFlows }), [data, actorId, today, props.row, recoveryFlows.join('|')]);
  const views = useMemo(() => props.row ? [] : flowRefs.map(flowRef => {
    const common = { actorId, flowRef, localToday: today };
    if (period === 'documents' || period === 'all') return readProgramExecutionOccurrences(data, { ...common, window: { finiteOffset: page * 30, finiteLimit: 30, windowOffsetWeeks: page * 4, windowWeeks: 4 } });
    const range = programDateRange(period, date);
    return readProgramOccurrencePeriod(data, { ...common, ...(period === 'undated' ? { undatedOnly: true } : range), includeHeld: showHeld, includeExcluded: showExcluded });
  }), [data, actorId, today, period, date, page, showHeld, showExcluded, flowRefs.join('|'), props.row]);
  const rows = props.row ? props.row.planExcluded || props.row.planSuperseded ? [] : [props.row] : views.flatMap(view => view.ok ? view.rows : []).filter(row => !row.flowInactive && !row.sourceConflict && !row.planExcluded && !row.planSuperseded
    && (showHeld || row.participation !== 'held' && !row.mapReviewHold) && (showExcluded || row.participation !== 'excluded')
    && selectedMetadata.some(item => item.itemRef === row.sourceItemRef) && (!props.query || `${row.title}\n${row.memo}`.toLocaleLowerCase().includes(props.query.toLocaleLowerCase())));
  const detail = target ? rows.find(row => row.key === target) : null;
  const hasMore = views.some(view => view.ok && ('personalHasMore' in view && view.personalHasMore || view.series.some(series => series.manifest.hasMore)));
  const storedFacts = review ? programOccurrenceSourceFacts(review.stored, data.public) : undefined;
  const currentFacts = review?.currentSourceFacts ?? (review?.current ? programOccurrenceSourceFacts(review.current.identity, data.public) : undefined);
  const currentComparison = review && currentFacts ? programRecurrenceComparison(review.current?.identity ?? review.stored, data.public, currentFacts) : [];
  const comparison = review ? programRecurrenceComparison(review.stored, data.public, storedFacts).map(before => ({ ...before,
    after: currentComparison.find(field => field.label === before.label)?.value ?? '동일한 회차 확인 불가' })) : [];
  const changes = comparison.filter(field => field.value !== field.after);
  const mutate = async (row: ProgramExecutionOccurrenceRow, changes: Partial<Pick<ProgramOccurrenceExecution, 'schedule' | 'completion' | 'participation'>>) => {
    if (busyRef.current || lockCount.current || planPort.current?.hasPendingInput?.() || row.sourceConflict || row.mapReviewHold || row.planExcluded || row.planSuperseded || row.flowInactive) return false;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const outcome = await props.mutate('반복 회차 실행 변경', latest => row.personalPlan
        ? updateProgramPersonalOccurrence(latest, { actorId, ownerId: row.personalPlan.ownerId, expectedOwner: row.personalPlan.expectedOwner,
          identity: row.personalPlan.identity, changes, at: new Date().toISOString(), localToday: today })
        : updateProgramOccurrenceExecution(latest, { actorId, flowRef: row.identity.sourceFlowRef, localToday: today,
          window: programOccurrenceWindowFor(row.identity), identity: row.identity, expected: row.stored, changes }));
      if (!outcome.ok) setError(programErrorMessage(outcome.reason)); return outcome.ok;
    } catch { setError(programErrorMessage('storage-unavailable')); return false; }
    finally { busyRef.current = false; setBusy(false); }
  };
  const resolveRecovery = async (choice: 'reconnect' | 'keep') => {
    if (!review || busyRef.current || lockCount.current || dateDraftRef.current || planPort.current?.hasPendingInput?.()) return;
    const selected = review; busyRef.current = true; setBusy(true); setError('');
    try {
      const outcome = await props.mutate(choice === 'keep' ? '회차 개인 기록 보관 유지' : '회차 원본 명시 재연결', latest => reconnectProgramOccurrenceSource(latest, {
        actorId, localToday: today, expected: selected.stored, currentIdentity: selected.current?.identity ?? null, choice }));
      if (outcome.ok) { setReview(null); setRecoveryMessage({ source: sourceMessageScope, key: selected.key, reconnected: choice === 'reconnect', text: choice === 'keep' ? '개인 기록은 이전 원본과 함께 보관했습니다. 자동으로 연결하지 않습니다.' : '같은 회차의 날짜·완료·포함 상태를 유지하며 현재 원본에 연결했습니다.' }); }
      else setError(programErrorMessage(outcome.reason));
    } catch { setError(programErrorMessage('storage-unavailable')); } finally { busyRef.current = false; setBusy(false); }
  };
  if (!selectedMetadata.length && !recoveries.length) return null;
  return <section className={styles.surface} aria-label="반복 회차와 보류 항목" data-recurrence-editor={props.row?.key ?? props.documentId ?? 'recurrence'}>
    {!props.row && <><h2>{period === 'documents' ? '반복 규칙과 개별 회차' : '반복 회차'}</h2>
    <p>원문 항목은 반복 규칙입니다. 아래에서 바꾸는 날짜와 완료는 선택한 회차에만 적용합니다.</p>
    <div className={styles.controls}><label><input type="checkbox" disabled={busy || locked || planPending || !!dateDraft} checked={showHeld} onChange={event => setShowHeld(event.target.checked)} /> 보류 회차 보기</label>
      <label><input type="checkbox" disabled={busy || locked || planPending || !!dateDraft} checked={showExcluded} onChange={event => setShowExcluded(event.target.checked)} /> 제외 회차 보기</label>
      <button type="button" disabled={busy || locked || planPending || !!dateDraft} onClick={() => void props.onUndo()}>최근 변경 되돌리기</button><button type="button" disabled={busy || locked || planPending || !!dateDraft} onClick={() => void props.onRedo()}>다시 실행</button></div>
    {selectedMetadata.filter(item => item.capability === 'held' || item.capability === 'unsupported').map(item => <p key={item.itemRef}>
      {item.capability === 'held' ? '이 Map은 원문과 실행 조건 검토 전이라 실행을 잠갔습니다.' : '원본 업데이트의 항목별 속성 연결을 확인해야 합니다. 원문은 보존했습니다.'}
      <button type="button" onClick={() => props.onOpenSource(item.documentId, item.lineId)}>해당 원문 보기</button></p>)}
    {views.some(view => !view.ok) && <p role="alert" className={styles.error}>회차를 안전하게 읽지 못했습니다. 원본은 변경하지 않았습니다.</p>}
    {views.flatMap(view => view.ok ? view.pendingStarts ?? [] : []).filter(entry => selectedMetadata.some(item => item.itemRef === entry.itemRef)).map(entry => <p key={entry.itemRef} role="status">
      {entry.title} · {entry.reason === 'anchor-required' ? '내 기준일' : '내 시작일'} 미정. 날짜를 정하면 회차가 나타납니다.
      <button type="button" disabled={busy || locked || planPending || !!dateDraft} onClick={() => props.onOpenSource(entry.documentId, entry.lineId)}>해당 사본 보기</button>
    </p>)}
    {views.some(view => view.ok && view.sourceConflictKeys.length > 0) && <p role="alert">원본이 바뀐 이전 회차 기록은 보관 중입니다. 새 회차에 자동으로 덮어쓰지 않았습니다.</p>}
    {(views.some(view=>view.ok && view.rows.some(row=>row.planExcluded))) && <p role="status">계획에서 제외한 반복 항목의 회차 기록은 보관 중입니다. 기존 계획에서 항목을 다시 포함하면 같은 회차로 이어집니다.</p>}
    {recoveries.length > 0 && <section className={styles.recovery} aria-label="원본이 바뀐 회차 기록"><h3>원본이 바뀐 회차 기록</h3>
      <p>같은 항목·반복 규칙·원래 날짜가 확인되는 회차만 다시 연결할 수 있습니다. 다른 회차의 기록으로 옮기지 않습니다.</p>
      <ul>{recoveries.map(entry => <li key={entry.key}>원래 {entry.stored.originalDate} · {entry.stored.occurrenceIndex}회차 · 개인 날짜 {entry.stored.schedule.mode === 'inherit' ? '원래 날짜 따름' : entry.stored.schedule.date ?? '날짜 미정'} · {entry.stored.completion.status === 'completed' ? '완료' : entry.stored.completion.status === 'open' ? '다시 열림' : '완료 기록 없음'}
        <button disabled={busy || locked || planPending || !!dateDraft} onClick={() => { setReview(entry); setRecoveryMessage(null); }}>개인 기록과 원본 비교</button></li>)}</ul>
      {review && <div className={styles.detail} role="region" aria-label="회차 원본 재연결 비교" onKeyDown={event => { if (event.key === 'Escape' && !busyRef.current && !lockCount.current) { event.preventDefault(); event.stopPropagation(); setReview(null); } }}>
        <p>원래 {review.stored.originalDate} · {review.stored.occurrenceIndex}회차. 개인 날짜·완료 시각·포함/보류/제외 상태를 그대로 유지합니다.</p>
        <dl><dt>개인 실행 날짜</dt><dd>{review.stored.schedule.mode === 'inherit' ? review.stored.originalDate : review.stored.schedule.date ?? '날짜 미정'}</dd><dt>완료 기록</dt><dd>{review.stored.completion.status === 'completed' ? '완료' : review.stored.completion.status === 'open' ? '다시 열림' : '완료 기록 없음'} {review.stored.completion.completedAt ?? ''}</dd><dt>실행 포함 상태</dt><dd>{review.stored.participation === 'included' ? '포함' : review.stored.participation === 'excluded' ? '제외' : '보류'}</dd></dl>
        <h4>바뀐 원문 내용</h4>
        {review.stored.publicOwner && <p>각 일정 판본의 원문을 비교합니다. 개인 문서에서 따로 고친 내용은 포함하지 않습니다.</p>}
        {changes.length ? <dl className={styles.changes}>{changes.map(field => <div key={field.label}><dt>{field.label}</dt><dd><span>기록 당시</span>{field.value}</dd><dd><span>현재 원문</span>{field.after}</dd></div>)}</dl>
          : <p>제목·설명·날짜·시간·시간대·반복 규칙은 같습니다. 아래에서 다른 원문 속성과 연결 정보를 확인할 수 있습니다.</p>}
        <details className={styles.sourceDetails}><summary>원문 항목과 연결 정보 자세히</summary><dl className={styles.changes}>{comparison.map(field => <div key={field.label}><dt>{field.label}</dt><dd><span>기록 당시</span>{field.value}</dd><dd><span>현재 원문</span>{field.after}</dd></div>)}</dl>
          <div className={styles.comparison}><section><h4>기록 당시 원문 속성</h4><pre>{JSON.stringify(storedFacts, null, 2)}</pre></section><section><h4>현재 원문 속성</h4><pre>{currentFacts ? JSON.stringify(currentFacts, null, 2) : '동일한 회차를 확인할 수 없습니다. 기록은 이전 원본과 함께 보관합니다.'}</pre></section></div></details>
        {!review.canReconnect && <p>{review.reason === 'execution-held' ? '원본의 실행 검토가 필요하거나 비활성 상태입니다. 검토가 끝날 때까지 개인 기록을 보관합니다.' : '반복 규칙·원래 날짜·식별자가 달라졌거나 원본을 읽을 수 없어 이 기록을 다른 회차에 연결하지 않습니다.'}</p>}
        <div className={styles.controls}><button disabled={!review.canReconnect || busy || locked || planPending || !!dateDraft} onClick={() => void resolveRecovery('reconnect')}>개인 기록을 유지하고 현재 원본에 연결</button><button disabled={busy || locked || planPending || !!dateDraft} onClick={() => void resolveRecovery('keep')}>이전 원본과 보관 유지</button><button disabled={busy || locked} onClick={() => setReview(null)}>비교 취소</button></div>
      </div>}
    </section>}
    {recoveryMessage?.source === sourceMessageScope && recoveryMessage.reconnected !== recoveries.some(entry => entry.key === recoveryMessage.key) && <p role="status">{recoveryMessage.text}</p>}
    </>}<ul className={styles.rows}>{rows.map(row => <li className={styles.row} key={row.key} data-occurrence-key={row.key}>
      <div className={styles.controls}><button type="button" aria-label={`${row.title} ${row.personalPlan ? `${row.originalDate} 개인 회차` : `${row.occurrenceIndex}회차`} ${row.completion === 'completed' ? '다시 열기' : '완료'}`} aria-pressed={row.completion === 'completed'} disabled={busy || locked || planPending || !!dateDraft || row.mapReviewHold || row.participation !== 'included'}
        onClick={() => void mutate(row, { completion: row.completion === 'completed' ? { status: 'open', completedAt: null } : { status: 'completed', completedAt: new Date().toISOString() } })}>{row.completion === 'completed' ? '완료됨' : '완료'}</button>
        <button type="button" id={programRecurrenceFocusId(row.key)} className={styles.title} disabled={locked || planPending || !!dateDraft && dateDraft.row.key !== row.key} onClick={() => setTarget(row.key)}>{row.title} · {row.personalPlan ? `${row.originalDate} 개인 회차` : row.occurrenceIndex}{!row.personalPlan && '회차'}</button></div>
      <p className={styles.meta}>{row.personalPlan ? '내 반복 계획 ' : '원래 '}{row.originalDate} → 실행 {row.executionDate ?? '날짜 미정'}{row.participation === 'held' ? ' · 보류' : row.participation === 'excluded' ? ' · 제외' : ''}{row.time ? ` · 원문 시간 ${row.time}` : ''}{row.timeZone ? ` · 시간대 ${row.timeZone}` : ''}</p>
      {detail?.key === row.key && <div className={styles.detail} onKeyDown={event => { if (event.key === 'Escape' && !busyRef.current && !lockCount.current && !planPort.current?.hasPendingInput?.()) { event.preventDefault(); event.stopPropagation(); cancelDate(); setTarget(null); } }}><div className={styles.controls}>
        <form onSubmit={async event => { event.preventDefault(); const draft = dateDraftRef.current; if (!draft || busyRef.current || locked) return; const saved = await mutate(draft.row, { schedule: draft.value ? { mode: 'fixed_date', date: draft.value } : { mode: 'unscheduled', date: null } }); if (saved) cancelDate(); }}>
          <label>이 회차 날짜<input type="date" value={dateDraft?.row.key === row.key ? dateDraft.value : row.executionDate ?? ''} disabled={busy || locked || planPending || row.mapReviewHold} onChange={event => { if (busyRef.current || lockCount.current || planPort.current?.hasPendingInput?.()) return; const next = { row: dateDraftRef.current?.row ?? row, value: event.target.value }; dateDraftRef.current = next; setDateDraft(next); }} /></label>
          <button type="submit" disabled={!dateDraft || busy || locked}>날짜 적용</button><button type="button" disabled={!dateDraft || busy || locked} onClick={cancelDate}>날짜 변경 취소</button>
        </form>
        <button type="button" disabled={busy || locked || planPending || !!dateDraft || row.mapReviewHold} onClick={() => void mutate(row, { schedule: { mode: 'fixed_date', date: today } })}>오늘로 이동</button>
        <button type="button" disabled={busy || locked || planPending || !!dateDraft || row.mapReviewHold} onClick={() => void mutate(row, { schedule: { mode: 'unscheduled', date: null } })}>날짜 미정</button>
        <button type="button" disabled={busy || locked || planPending || !!dateDraft || row.mapReviewHold} onClick={() => void mutate(row, { schedule: { mode: 'inherit', date: null } })}>원래 날짜 따르기</button>
        <label>이 회차 실행<select value={row.participation} disabled={busy || locked || planPending || !!dateDraft || row.mapReviewHold} onChange={event => void mutate(row, { participation: event.target.value as ProgramOccurrenceExecution['participation'] })}><option value="included">포함</option><option value="excluded">제외</option><option value="held">보류</option></select></label>
        <button type="button" disabled={busy || planPending || !!dateDraft} onClick={() => { const item = metadata.find(item => item.itemRef === row.sourceItemRef); if (item) props.onOpenSource(item.documentId, item.lineId); }}>원문 항목으로 돌아가기</button>
        {props.onShowPeriod && <button type="button" disabled={busy || planPending || !!dateDraft} onClick={() => props.onShowPeriod?.(row.executionDate ? 'week' : 'undated', row.executionDate ?? today)}>이 회차의 기간 보기</button>}
        <button type="button" disabled={busy || locked || planPending} onClick={() => { cancelDate(); setTarget(null); }}>상세 닫기 · 미적용 취소</button></div>{row.memo && <p>{row.memo}</p>}
        <ProgramRecurrencePlan data={data} row={row} today={today} mutate={props.mutate} disabled={busy || locked || !!dateDraft || row.mapReviewHold || row.flowInactive || row.planExcluded}
          onRegisterEditors={registerPlan} onPendingChange={setPlanPending} onApplied={props.onPlanApplied} />
      </div>}
    </li>)}</ul>
    {!rows.length && <p>현재 범위에 표시할 회차가 없습니다.</p>}
    {!props.row && (period === 'documents' || period === 'all') && <div className={styles.controls}><button type="button" disabled={page === 0 || busy || locked || planPending || !!dateDraft} onClick={() => setPage(value => value - 1)}>이전 회차</button>
      <span>조회 구간 {page + 1} · 반복 종료가 아닙니다</span><button type="button" disabled={busy || locked || planPending || !!dateDraft || page >= 128 || !hasMore} onClick={() => setPage(value => value + 1)}>다음 회차</button>
      {page >= 128 && hasMore && <p role="status">한 번에 넘겨볼 수 있는 조회 범위에 도달했습니다. 뒤에 회차가 더 있으며, 반복이 끝난 것은 아닙니다. 날짜를 골라 기간 목록에서 확인해 주세요.</p>}
      {props.onShowPeriod && <form className={styles.controls} onSubmit={event => { event.preventDefault(); if (!busyRef.current && !lockCount.current && !dateDraftRef.current && programDate(lookupDate)) props.onShowPeriod?.('week', lookupDate); }}>
        <label>회차를 찾을 날짜<input type="date" value={lookupDate} disabled={busy || locked || planPending || !!dateDraft} onChange={event => setLookupDate(event.target.value)} /></label><button disabled={busy || locked || planPending || !!dateDraft || !programDate(lookupDate)}>날짜로 기간 보기</button></form>}
      </div>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}
