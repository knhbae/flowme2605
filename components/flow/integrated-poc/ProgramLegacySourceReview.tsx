'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ProgramData } from '@/lib/flow/integrated-poc/contract';
import { programId } from '@/lib/flow/integrated-poc/contract';
import type { ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import type { ProgramLegacyPort } from '@/lib/flow/integrated-poc/legacy-port';
import { readProgramLegacySourceLifecycle, readProgramLegacySourceMapping, readProgramLegacyMapSourceConnection, type ProgramLegacySourceAction } from '@/lib/flow/integrated-poc/legacy-source-lifecycle';
import { programLegacyMapEvidenceText, readProgramLegacyCurrentMapSource } from '@/lib/flow/integrated-poc/legacy-map-source';
import { readProgramSelectedMapRecurrences, type ProgramStructuredMapRecurrenceContext } from '@/lib/flow/integrated-poc/legacy-map-recurrence';
import { programLegacySourceChanges, programLegacyRevisionRefs, programLegacyStructuredItemEvidence, projectProgramLegacySource, sourceCanonical, type ProgramLegacySourceOwner, type ProgramLegacySourceChange, type ProgramLegacySourceSelection } from '@/lib/flow/integrated-poc/legacy-source-lifecycle-contract';
import { textWorkspaceModel as M } from '@/lib/flow/integrated-poc/text-workspace';
import { programLegacyIdentity } from '@/lib/flow/integrated-poc/legacy-projection';
import { programErrorMessage } from '@/lib/flow/integrated-poc/ui-contract';
import { ProgramLegacyMappingCandidates, ProgramLegacyMappingItem, ProgramLegacyMappingPair, programLegacyMappingOptionLabel } from './ProgramLegacySourceMapping';
import styles from './ProgramLegacySourceReview.module.css';

type Mapping = Extract<ReturnType<typeof readProgramLegacySourceMapping>, { ok: true }>;
type Draft = { actorId: string; documentId: string; flowRef: string; raw: string; requestId: string; expectedToken: string;
  recurrence?: { context: ProgramStructuredMapRecurrenceContext; expectedSelection: string; confirmed: boolean };
  mapping?: { prepared: Mapping; itemRefs: Record<string, string>; confirmed: boolean; partial?: true; unmatchedItems?: Record<string, 'keep-personal' | 'archive-execution'> } };
export function programLegacyMappingReady(mapping: NonNullable<Draft['mapping']>) {
  const choices = mapping.prepared.materialized.items.map(item => mapping.itemRefs[item.ref]);
  if (choices.some(value => !value)) return false;
  if (!mapping.partial) return new Set(choices).size === choices.length;
  const refs = choices.filter(value => !['new', 'source-only'].includes(value));
  return new Set(refs).size === refs.length && mapping.prepared.target.items.filter(item => !refs.includes(item.ref)).every(item => !!mapping.unmatchedItems?.[item.ref]);
}
export function createProgramLegacySourceEditor(input: { change: (draft: Draft | null) => void; lockChanged: (locked: boolean) => void; save: (draft: Draft) => Promise<boolean>; isBusy?: () => boolean }) {
  let draft: Draft | null = null, locks = 0, composing = false, flight: Promise<boolean> | null = null;
  const editable = () => locks === 0 && !flight && !input.isBusy?.();
  const api = {
    read: () => draft, editable,
    update: (next: Draft | null) => { if (!editable()) return false; draft = next; input.change(draft); return true; },
    composition: (value: boolean) => { if (value && !editable()) return false; composing = value; return true; },
    finishComposition: (raw: string) => { if (!composing) return false; composing = false; if (draft) { draft = { ...draft, raw }; input.change(draft); } return true; },
    hasPendingInput: () => draft !== null || composing || !!input.isBusy?.(),
    pendingDocumentIds: () => draft ? [draft.documentId] : [],
    captureDrafts: () => draft ? [{ title: draft.mapping ? '원문 행 연결 선택' : '비교 전 원문', raw: draft.raw + (draft.mapping ? '\n\n선택한 행 연결\n' + Object.entries(draft.mapping.itemRefs).map(([row, item]) => `${row} → ${item}`).join('\n') + '\n기존 항목 처리\n' + JSON.stringify(draft.mapping.unmatchedItems ?? {}, null, 2) : '') }] : [],
    blocksExternalSnapshot: (before: ProgramData, next: ProgramData) => !!draft && sourceCanonical(before.spaces[draft.actorId]) !== sourceCanonical(next.spaces[draft.actorId]),
    lockInput: () => { locks++; input.lockChanged(true); let released = false; return () => { if (released) return; released = true; locks--; input.lockChanged(locks > 0); }; },
    flushAll: (): Promise<boolean> => {
      if (flight) return flight;
      if (composing || input.isBusy?.()) return Promise.resolve(false);
      if (!draft) return Promise.resolve(true);
      if (draft.recurrence && !draft.recurrence.confirmed) return Promise.resolve(false);
      if (draft.mapping && !draft.mapping.confirmed) return Promise.resolve(false);
      const captured = draft;
      flight = Promise.resolve().then(() => input.save(captured)).then(ok => { if (ok && captured === draft) { draft = null; input.change(null); } return ok && draft === null; }, () => false).finally(() => { flight = null; });
      return flight;
    },
  };
  return api;
}
/** These exact refs were explicitly kept outside the raw-row mapping. Their
 * absence from another raw revision is not evidence that its author deleted a row. */
export function programLegacySourceUnlinkedItem(owner: ProgramLegacySourceOwner, change: ProgramLegacySourceChange) {
  return change.kind === 'removed' && !!change.itemRef && !!owner.partialMapping
    && Object.hasOwn(owner.partialMapping.unmatchedItems, change.itemRef)
    && owner.effective.itemRevisions[change.itemRef] === owner.baseRevisionId;
}
export function programLegacySourceComparison(owner: ProgramLegacySourceOwner, revisionId: string, change: ProgramLegacySourceChange, selected?: ProgramLegacySourceSelection) {
  const mine = projectProgramLegacySource(owner), incoming = projectProgramLegacySource(owner, selected ?? { flowRevisionId: revisionId,
    itemRevisions: Object.fromEntries(programLegacyRevisionRefs(owner, revisionId).map(ref => [ref, revisionId])), retainedItemRefs: [] });
  if (!mine || !incoming) return [];
  if (change.kind === 'flow') return [
    { label: '원본 제목', mine: mine.flow.title, incoming: incoming.flow.title },
    { label: '원본 기준일', mine: mine.flow.anchorDate ?? '', incoming: incoming.flow.anchorDate ?? '' },
    { label: '출처', mine: JSON.stringify(mine.flow.presentation?.discovery ?? null, null, 2), incoming: JSON.stringify(incoming.flow.presentation?.discovery ?? null, null, 2) },
  ].filter(row => row.mine !== row.incoming);
  const before = mine.flow.items.find(item => item.ref === change.itemRef), after = incoming.flow.items.find(item => item.ref === change.itemRef);
  if (programLegacySourceUnlinkedItem(owner, change)) return [
    { label: '기존 개인 항목', mine: before?.title ?? '', incoming: '새 원문 행 연결 없음 · 개인 항목 보존' },
    { label: '처음 연결할 때의 선택', mine: owner.partialMapping!.unmatchedItems[change.itemRef!] === 'archive-execution' ? '기록은 남기고 새 실행 보관' : '개인 항목으로 계속 사용', incoming: '기존 선택 유지' },
  ];
  const beforeAttrs = mine.contexts.get(change.itemRef!)?.attributes, afterAttrs = incoming.contexts.get(change.itemRef!)?.attributes;
  const reappearing = !!after && !!change.itemRef && owner.effective.retainedItemRefs.includes(change.itemRef)
    && !Object.hasOwn(owner.partialMapping?.unmatchedItems ?? {}, change.itemRef);
  const rows = [
    { label: '실행 방식', mine: !before ? '기존 원문에 없음' : beforeAttrs?.recurrence ? '반복 회차' : '일반 항목', incoming: !after ? '새 원문에 없음 · 개인 기록 보존' : afterAttrs?.recurrence ? '반복 회차' : '일반 항목' },
    { label: '항목', mine: before?.title ?? '(없음)', incoming: after?.title ?? '(새 원문에서 빠짐 — 개인 계획에 보존)' },
    { label: '설명', mine: before?.description ?? '', incoming: after?.description ?? '' },
    { label: '완료 기준', mine: before?.completionCriterion ?? '', incoming: after?.completionCriterion ?? '' },
    { label: '원문 날짜', mine: before?.sourceDate ?? '', incoming: after?.sourceDate ?? '' },
    { label: '원문 일정', mine: before?.sourceTimingLabel ?? '', incoming: after?.sourceTimingLabel ?? '' },
    { label: '구역', mine: before?.sectionTitle ?? '', incoming: after?.sectionTitle ?? '' },
    { label: '원문 순서', mine: before ? String(before.sourceOrder + 1) : '', incoming: after ? String(after.sourceOrder + 1) : '' },
  ];
  if (owner.structured) rows.push({ label: '실제 Step 구조·출처', mine: JSON.stringify(programLegacyStructuredItemEvidence(owner, owner.effective.itemRevisions[change.itemRef!], change.itemRef!) ?? null, null, 2),
    incoming: JSON.stringify(programLegacyStructuredItemEvidence(owner, selected?.itemRevisions[change.itemRef!] ?? revisionId, change.itemRef!) ?? null, null, 2) });
  const labels: Record<string, string> = { time: '시간', timeZone: '시간대', recurrence: '반복', recurrenceEnd: '반복 종료', subchecks: '하위 체크', completionCriteria: '완료 기준', sourceUrl: '출처 URL', sourceLabel: '출처 이름', relativeDate: '상대 날짜', durationMinutes: '소요 시간', place: '장소', executionCondition: '실행 조건', caution: '주의', guide: '안내', resourceUrl: '자료 URL', resourceLabel: '자료 이름', sourceChecked: '원문 체크' };
  for (const field of new Set([...Object.keys(beforeAttrs ?? {}), ...Object.keys(afterAttrs ?? {})])) {
    const a = beforeAttrs?.[field as keyof typeof beforeAttrs], b = afterAttrs?.[field as keyof typeof afterAttrs];
    const display = (value: unknown) => value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    rows.push({ label: labels[field] ?? field, mine: display(a), incoming: display(b) });
  }
  const changed = rows.filter(row => row.mine !== row.incoming);
  if (reappearing) {
    // Identical content can still require an explicit source-membership choice.
    // Keep its actual title visible so the decision never becomes an empty form.
    if (!changed.some(row => row.label === '항목')) changed.unshift(rows.find(row => row.label === '항목')!);
    changed.push({ label: '원본 연결', mine: '원본에서 빠짐을 확인함 · 개인 항목 보존', incoming: '현재 제공 원본에 다시 연결' });
  }
  return changed;
}
export function programLegacySourceExecutionRecords(data: ProgramData, owner: ProgramLegacySourceOwner, itemRef: string) {
  const space = data.spaces[data.activeActorId], item = projectProgramLegacySource(owner)?.flow.items.find(item => item.ref === itemRef);
  if (!item || !space.legacySnapshot) return null;
  const id = programLegacyIdentity('item', space.legacySnapshot.workspaceId, item.savedCopyId, item.flowId, item.itemId, item.ref);
  const task = M.tasks(space.text).find(task => task.id === id && task.isCanonical);
  const doc = task ? M.getDocument(space.text, task.docId) : null;
  const row = doc ? M.rowMeta(space.text, doc.id).find(row => row.id === id) : null;
  return { ordinary: doc && row ? doc.lines.slice(row.index, row.subtreeEndIndex).map(line => line.text).join('\n') : '',
    history: M.progressHistory(space.text, id),
    occurrences: Object.values(space.recurrenceExecution?.entries ?? {}).filter(entry => entry.sourceFlowRef === owner.flowRef && entry.sourceItemRef === itemRef) };
}
export type ProgramLegacySourceReviewProps = { data: ProgramData; port: ProgramLegacyPort; flowRef?: string; blocked: boolean;
  canStart: () => boolean; onRegisterEditors?: (api: ProgramEditorFlush | null) => void; onPendingChange?: (pending: boolean) => void };
export function ProgramLegacySourceReview({ data, port, flowRef, blocked, canStart, onRegisterEditors, onPendingChange }: ProgramLegacySourceReviewProps) {
  const [draft, setDraft] = useState<Draft | null>(null), [locked, setLocked] = useState(false), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''), [error, setError] = useState(false), [discard, setDiscard] = useState(false), [undoReview, setUndoReview] = useState<{ token: string; flowRef: string } | null>(null);
  const busyRef = useRef(false), live = useRef({ data, port, flowRef, blocked, canStart }); live.current = { data, port, flowRef, blocked, canStart };
  const save = useRef<(draft: Draft) => Promise<boolean>>(async () => false);
  const editor = useMemo(() => createProgramLegacySourceEditor({ change: setDraft, lockChanged: setLocked, save: draft => save.current(draft), isBusy: () => busyRef.current }), []);
  const pendingChanged = useRef(onPendingChange); pendingChanged.current = onPendingChange;
  useEffect(() => { onRegisterEditors?.(editor); return () => onRegisterEditors?.(null); }, [editor, onRegisterEditors]);
  useEffect(() => { onPendingChange?.(!!draft || busy); }, [draft, busy, onPendingChange]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (editor.hasPendingInput()) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [editor]);
  const view = flowRef ? port.readSource(new Date().toISOString(), flowRef) : port.read(new Date().toISOString());
  const source = view.ok && flowRef ? readProgramLegacySourceLifecycle(view.payload, flowRef) : null;
  const mapping = view.ok && flowRef && source && !source.ok && source.reason === 'source-item-mapping-required' ? readProgramLegacySourceMapping(view.payload, flowRef, { partial: true }) : null;
  const mapSource = view.ok && flowRef ? readProgramLegacyMapSourceConnection(view.payload, flowRef) : null;
  const structuredOwner = source?.ok ? source.owner.structured : undefined;
  const mapRecurrences = source?.ok && mapSource && structuredOwner ? readProgramSelectedMapRecurrences(source.owner, mapSource.revision.flow) : null;
  const mapCurrent = useMemo(() => mapSource ? readProgramLegacyCurrentMapSource(mapSource.revision.flow, new Date().toISOString()) : null,
    [mapSource?.sourceToken]);
  const run = async (action: ProgramLegacySourceAction, expectedToken: string) => {
    if (busyRef.current) return false;
    busyRef.current = true; setBusy(true); pendingChanged.current?.(true); setMessage('');
    try {
      const receipt = await live.current.port.commitSource({ expectedToken, action });
      setError(!receipt.ok);
      const reasons: Record<string, string> = { invalid: '원문의 제목·항목·일정을 확인해 주세요. 입력은 유지했습니다.', 'missing-choice': '바뀐 항목마다 유지할 내용을 골라 주세요.', 'source-conflict': '비교 이후 원본이 바뀌었습니다. 이 비교로 덮어쓰지 않았습니다.', 'stale-program-view': '다른 변경이 먼저 저장됐습니다. 입력은 남아 있습니다. 복사해 보관한 뒤 최신 상태에서 다시 비교해 주세요.', 'undo-personal-record-conflict': '추가된 항목에 개인 기록이 있어 원본만 되돌릴 수 없습니다. 기록을 보존한 채 검토가 필요합니다.', 'section-context-conflict': '서로 다른 구역 정보를 한 항목 묶음으로 합칠 수 없습니다. 선택을 다시 확인해 주세요.', 'no-source-change': '비교할 원본 항목 차이가 없습니다. 입력 원문은 그대로 남겨 두었습니다.' };
      setMessage(receipt.ok ? action.type === 'activate-map-recurrence' ? '반복 회차를 연결했습니다. 이전 기록은 유지했습니다. 기간 보기에서 실행하거나 상단에서 되돌릴 수 있습니다.' : action.type === 'apply' ? '선택한 원본을 같은 개인 문서에 적용했습니다.' : action.type === 'undo' ? '원본 선택을 되돌렸습니다. 개인 기록은 유지했습니다.' : '비교와 선택을 개인 공간에 보관했습니다.' : receipt.issues.map(issue => reasons[issue.code] ?? issue.code).join(' ') || programErrorMessage(receipt.reason));
      return receipt.ok;
    } finally { busyRef.current = false; setBusy(false); pendingChanged.current?.(editor.hasPendingInput()); }
  };
  save.current = async captured => {
    if (captured.actorId !== live.current.data.activeActorId || !captured.raw.trim()) return false;
    if (captured.recurrence) {
      if (!captured.recurrence.confirmed) return false;
      return run({ type: 'activate-map-recurrence', flowRef: captured.flowRef, requestId: captured.requestId,
        expectedSelection: captured.recurrence.expectedSelection, itemRefs: [captured.recurrence.context.itemRef], now: new Date().toISOString() }, captured.expectedToken);
    }
    if (captured.mapping) {
      if (!captured.mapping.confirmed) { setError(true); setMessage('원문 행 연결은 자동 확정하지 않습니다. 모든 연결을 직접 확인해 주세요.'); return false; }
      if (!programLegacyMappingReady(captured.mapping)) return false;
      if (captured.mapping.partial) return run({ type: 'map-partial-items', flowRef: captured.flowRef, requestId: captured.requestId,
        expectedSourceToken: captured.mapping.prepared.sourceToken, now: new Date().toISOString(), unmatchedItems: captured.mapping.unmatchedItems ?? {},
        rowChoices: Object.fromEntries(Object.entries(captured.mapping.itemRefs).map(([ref, choice]) => [ref, choice === 'new' || choice === 'source-only' ? { kind: choice } : { kind: 'existing', itemRef: choice }])) }, captured.expectedToken);
      return run({ type: 'map-items', flowRef: captured.flowRef, requestId: captured.requestId, expectedSourceToken: captured.mapping.prepared.sourceToken,
        itemRefs: captured.mapping.itemRefs, now: new Date().toISOString() }, captured.expectedToken);
    }
    return run({ type: 'stage', flowRef: captured.flowRef, requestId: captured.requestId, rawText: captured.raw, now: new Date().toISOString() }, captured.expectedToken);
  };
  const edit = (raw: string) => {
    if (busyRef.current || !editor.editable() || !live.current.canStart()) return;
    const current = editor.read();
    if (current) { editor.update({ ...current, raw }); pendingChanged.current?.(true); return; }
    if (!view.ok || !flowRef) return;
    const binding = data.spaces[data.activeActorId].savedBindings.find(row => row.flowRef === flowRef);
    if (!binding) return;
    editor.update({ actorId: data.activeActorId, documentId: binding.documentId, flowRef, raw, requestId: programId('source-review'), expectedToken: view.token });
    pendingChanged.current?.(true);
  };
  const act = (action: ProgramLegacySourceAction) => { if (!view.ok || !editor.editable() || editor.hasPendingInput() || busyRef.current || !live.current.canStart()) return; void run(action, view.token); };
  const reviews = source?.ok ? [...source.owner.reviews].reverse() : [];
  const executionRecords = (owner: ProgramLegacySourceOwner, itemRef: string) => {
    const records = programLegacySourceExecutionRecords(data, owner, itemRef); if (!records) return null;
    return <details><summary>보존할 일반 항목·회차 기록 확인</summary>
      <p>일반→반복은 기존 일반 항목을 보관 문서로 옮기며 ID·개인 날짜·메모·하위 항목·진행을 유지합니다. 반복 완료로 자동 복사하지 않습니다. 다시 일반 항목으로 돌아오면 보관한 개인 내용을 복귀시키고, 과거 회차 기록은 별도로 남깁니다.</p>
      <pre>{records.ordinary || '(보관할 일반 항목 없음)'}</pre>
      <p>일반 항목 진행: {records.history.map(row => `${row.date} ${row.percent}%`).join(' · ') || '(없음)'}</p>
      <p>과거 회차 기록 {records.occurrences.length}개: 날짜·순서로 새 실행에 연결하지 않습니다.</p>
      {!!records.occurrences.length && <pre>{JSON.stringify(records.occurrences, null, 2)}</pre>}
    </details>;
  };
  return <details className={styles.panel}><summary>원본 변경 비교</summary>
    <p>{mapSource ? '저장한 Map 구조와 이 앱에 실제 제공된 Flow·Step·출처를 비교합니다. TXT 원문으로 변환하거나 새 공개 판본으로 발행하지 않습니다.' : '이 계획에 입력한 원문을 비교합니다. 공개 Flow의 새 판본이나 외부에서 가져온 결과가 아닙니다.'} 개인 제목·메모·실행 날짜·완료 기록은 원본과 따로 유지합니다.</p>
    {message && <p role={error ? 'alert' : 'status'} className={error ? styles.error : styles.status}>{message}</p>}
    {!source?.ok && !mapSource && <p className={styles.notice}>{source && !source.ok && source.reason === 'source-item-mapping-required' ? '이 원본은 검증된 원문 행↔항목 연결이 없어 변경 비교를 적용할 수 없습니다. 원문과 기존 개인 기록은 유지했습니다. 다른 계획은 계속 사용할 수 있습니다.' : '연결 상태를 확인할 수 없습니다. 입력한 원문은 아래에서 계속 보관하거나 복사할 수 있습니다.'}</p>}
    {mapping && !mapping.ok && !mapSource && <p className={styles.notice}>{mapping.reason === 'mapping-cardinality-review-required' ? '저장된 원문 행 수와 현재 항목 수가 다릅니다. 빠진 항목·남긴 개인 항목을 임의로 연결하지 않았습니다. 원본별 보완 검토가 필요합니다.' : '이 계획에는 연결을 검증할 저장 원문이 없습니다. Flow·Step·출처를 먼저 원래 제작 도구에서 보완해야 합니다. 개인 확인으로 품질 보류를 해제하지 않습니다.'}</p>}
    {mapSource && <section className={styles.notice} aria-label="Map 구조와 출처 연결"><h3>TXT 없이 저장된 Map 원본</h3>
      <p>Map: {mapSource.revision.flow.presentation!.mapGroup!.title} · Flow: {mapSource.revision.flow.flowId} · Step {mapSource.revision.flow.items.length}개</p>
      <p>같은 Flow ID와 Step ID만 같은 항목으로 연결합니다. 제목·순서가 같아도 다른 ID는 자동 연결하지 않습니다. 새 원본에서 빠진 항목의 개인 기록도 남깁니다. 원래 품질·의료·최신성 보류는 이 확인으로 해제되지 않습니다.</p>
      <details><summary>저장 당시 구조·출처 전체</summary><textarea readOnly rows={8} value={programLegacyMapEvidenceText(mapSource.revision)} onFocus={event => event.currentTarget.select()} /></details>
      {!structuredOwner ? <button disabled={blocked || busy || locked || !!draft} onClick={() => act({ type: 'connect-map', flowRef: mapSource.revision.flow.ref, requestId: programId('map-source'), expectedSourceToken: mapSource.sourceToken, now: new Date().toISOString() })}>저장 구조·출처를 확인하고 연결</button>
        : mapCurrent ? <><p>현재 제공 자료: {mapCurrent.persistence.map.sourceTitle} · 원본 표기 버전 {mapCurrent.persistence.map.version} · {mapCurrent.persistence.map.updatedAt}</p>
          <details><summary>현재 제공 Flow·Step·출처 전체</summary><textarea readOnly rows={8} value={programLegacyMapEvidenceText(mapCurrent)} onFocus={event => event.currentTarget.select()} /></details>
          <button disabled={blocked || busy || locked || !!draft} onClick={() => act({ type: 'stage-map', flowRef: mapSource.revision.flow.ref, requestId: programId('map-review'), now: new Date().toISOString() })}>현재 제공 Map 원본 비교·보관</button>
        </> : <p>이 Map의 현재 구조 자료를 확인할 수 없습니다. 저장한 구조와 기록은 유지합니다. 실제 같은 Map·Flow ID의 자료가 보완되어야 비교를 다시 시작할 수 있습니다.</p>}
    </section>}
    {source?.ok && mapRecurrences?.ok && !!mapRecurrences.contexts.size && <section className={styles.notice} aria-label="저장된 반복 일정 연결">
      <h3>반복 회차로 실행</h3>
      {[...mapRecurrences.contexts.values()].map(context => {
        const linked = !!source.owner.mapExecution?.items[context.itemRef], rule = context.series.revisions[0].rule;
        const days: Record<string, string> = { MO: '월', TU: '화', WE: '수', TH: '목', FR: '금', SA: '토', SU: '일' };
        const label = rule.frequency === 'daily' ? `${rule.interval}일마다` : rule.frequency === 'weekly'
          ? `${rule.interval}주마다${rule.weekdays?.length ? ` · ${rule.weekdays.map(day => days[day]).join('·')}` : ''}` : `${rule.interval}개월마다 · ${rule.dayOfMonth}일`;
        return <div key={context.itemRef}><p>{source.projection.flow.items.find(item => item.ref === context.itemRef)?.title} · {label} · 기준일 {context.startDate}{linked ? ' · 연결됨' : ''}</p>
          {!linked && !draft && <button disabled={blocked || busy || locked} onClick={() => {
            if (!view.ok || !editor.editable() || !live.current.canStart()) return;
            const binding = data.spaces[data.activeActorId].savedBindings.find(row => row.flowRef === flowRef); if (!binding) return;
            editor.update({ actorId: data.activeActorId, documentId: binding.documentId, flowRef: source.owner.flowRef,
              raw: JSON.stringify(context, null, 2), requestId: programId('map-execution'), expectedToken: view.token,
              recurrence: { context, expectedSelection: sourceCanonical(source.owner.effective), confirmed: false } }); pendingChanged.current?.(true);
          }}>이 항목의 반복 연결 검토</button>}
        </div>;
      })}
      {draft?.recurrence && <section aria-label="반복 연결 확인" onKeyDown={event => {
        if (event.key === 'Escape' && !busy && !locked) { event.preventDefault(); if (editor.update(null)) { pendingChanged.current?.(false); setMessage('반복 연결을 취소했습니다. 변경하지 않았습니다.'); setError(false); } }
      }}>
        <p>{draft.recurrence.context.ruleBasis === 'saved-calendar-setting' ? '요일은 저장된 개인 캘린더 설정입니다. 원문 영상의 고정 처방이 아닙니다.' : '저장된 구조 자료의 반복 규칙을 사용합니다.'}</p>
        <p>기존 일반 항목의 날짜·메모·진행·참조는 보관합니다. 새 회차를 완료한 것으로 복사하지 않습니다. 원본 일정과 Flow 소속은 바꾸지 않으며, 원래 품질 보류도 해제하지 않습니다.</p>
        {draft.recurrence.context.warning && <p>{draft.recurrence.context.warning}</p>}
        {executionRecords(source.owner, draft.recurrence.context.itemRef)}
        <details><summary>반복 규칙·출처 근거</summary><pre>{draft.raw}</pre></details>
        {(!view.ok || view.token !== draft.expectedToken) && <p role="alert">검토 중 내용이 바뀌었습니다. 취소한 뒤 최신 내용을 다시 확인해 주세요.</p>}
        <div className={styles.actions}><button disabled={blocked || busy || locked || !view.ok || view.token !== draft.expectedToken} onClick={() => {
          const current = editor.read(); if (!current?.recurrence || !editor.editable()) return;
          if (editor.update({ ...current, recurrence: { ...current.recurrence, confirmed: true } })) void editor.flushAll();
        }}>{busy ? '연결 저장 중…' : '기록을 보존하고 반복 회차 연결'}</button><button disabled={busy || locked} onClick={() => {
          if (editor.update(null)) { pendingChanged.current?.(false); setMessage('반복 연결을 취소했습니다. 변경하지 않았습니다.'); setError(false); }
        }}>변경 없이 취소</button></div>
      </section>}
    </section>}
    {mapping?.ok && !draft && <button disabled={blocked || busy || locked} onClick={() => {
      if (!view.ok || !flowRef || !editor.editable() || !live.current.canStart()) return;
      const binding = data.spaces[data.activeActorId].savedBindings.find(row => row.flowRef === flowRef); if (!binding) return;
      editor.update({ actorId: data.activeActorId, documentId: binding.documentId, flowRef, raw: mapping.materialized.authoring.rawText,
        requestId: programId('source-mapping'), expectedToken: view.token, mapping: { prepared: mapping, itemRefs: {}, confirmed: false,
          ...(mapping.materialized.items.length !== mapping.target.items.length ? { partial: true as const, unmatchedItems: {} } : {}) } }); pendingChanged.current?.(true);
    }}>저장 원문과 기존 항목 직접 연결</button>}
    {draft?.mapping && <section aria-label="원문 행 연결 보완" className={styles.notice}><h3>어느 원문 행에 해당하는 항목인가요?</h3>
      <p>제목이나 순서로 자동 선택하지 않았습니다. 같은 일을 가리키는 항목을 직접 고르세요. 연결하면 원문의 시간·일정 등 누락된 속성이 복원됩니다. 개인 제목·메모·날짜·완료 기록은 그대로 유지합니다.</p>
      {draft.mapping.partial && <p>원문 {draft.mapping.prepared.materialized.items.length}행과 기존 {draft.mapping.prepared.target.items.length}개 항목의 수가 다릅니다. 새 항목으로 만들거나 원문에만 둘 행, 연결하지 않을 기존 항목의 처리를 각각 고르세요.</p>}
      <details><summary>저장된 원문 전체</summary><textarea aria-label="저장된 원문 전체" readOnly rows={8} value={draft.raw} onFocus={event => event.currentTarget.select()} /></details>
      <ProgramLegacyMappingCandidates items={draft.mapping.prepared.target.items} />
      {draft.mapping.prepared.materialized.items.map(item => {
        const prepared = draft.mapping!.prepared, context = prepared.contexts.get(item.ref), selected = draft.mapping!.itemRefs[item.ref];
        return <fieldset key={item.ref} disabled={busy || locked || blocked}><legend>원문 {context?.sourceLine}행 · {item.title}</legend>
          <ProgramLegacyMappingPair item={item} context={context} existing={prepared.target.items.find(target => target.ref === selected)} selection={selected}>
          <label>연결할 기존 항목<select aria-label={`${item.ref} 연결할 기존 항목`} value={selected ?? ''} onChange={event => {
            const current = editor.read(); if (!current?.mapping || !editor.editable()) return;
            const itemRefs = { ...current.mapping.itemRefs, [item.ref]: event.target.value };
            editor.update({ ...current, mapping: { ...current.mapping, confirmed: false, itemRefs,
              ...(current.mapping.partial ? { unmatchedItems: Object.fromEntries(Object.entries(current.mapping.unmatchedItems ?? {}).filter(([ref]) => !Object.values(itemRefs).includes(ref))) } : {}) } });
          }}><option value="">직접 선택</option>{draft.mapping!.partial && <><option value="new">새 항목으로 추가</option><option value="source-only">실행 항목 없이 원문에만 보존</option></>}{prepared.target.items.map(target => <option value={target.ref} key={target.ref}>{programLegacyMappingOptionLabel(target)}</option>)}</select></label>
          </ProgramLegacyMappingPair>
        </fieldset>;
      })}
      {draft.mapping.partial && draft.mapping.prepared.target.items.filter(item => !Object.values(draft.mapping!.itemRefs).includes(item.ref)).map(item => <fieldset key={item.ref} disabled={busy || locked || blocked}><legend>연결하지 않은 기존 항목 · {item.title}</legend>
        <ProgramLegacyMappingItem item={item} label="연결하지 않은 기존 항목" /><label>이 항목의 개인 기록과 실행<select aria-label={`${item.ref} 연결하지 않은 기존 항목 처리`} value={draft.mapping!.unmatchedItems?.[item.ref] ?? ''} onChange={event => {
          const current = editor.read(); if (!current?.mapping?.partial || !editor.editable()) return;
          const unmatchedItems = { ...current.mapping.unmatchedItems }; if (event.target.value) unmatchedItems[item.ref] = event.target.value as 'keep-personal' | 'archive-execution'; else delete unmatchedItems[item.ref];
          editor.update({ ...current, mapping: { ...current.mapping, confirmed: false, unmatchedItems } });
        }}><option value="">직접 선택</option><option value="keep-personal">개인 항목으로 계속 사용</option><option value="archive-execution">기록은 남기고 새 실행 보관</option></select></label>
        <p>제목·메모·날짜·하위 항목·진행·참조는 삭제하지 않습니다. 실행 보관은 기간 목록과 새 실행에서 제외하며, 연결한 문서에서 기존 내용을 읽을 수 있습니다.</p>
      </fieldset>)}
      <p>이 연결 선택은 확정 전까지 새로고침하면 사라집니다. 다른 화면으로 이동하기 전 확정하거나 아래 텍스트를 보관해 주세요.</p>
      <details><summary>선택 내용 복사</summary><textarea readOnly rows={7} value={editor.captureDrafts()[0]?.raw ?? draft.raw} onFocus={event => event.currentTarget.select()} /></details>
      <div className={styles.actions}><button disabled={busy || locked || blocked || !view.ok || view.token !== draft.expectedToken || !programLegacyMappingReady(draft.mapping)} onClick={() => {
        const current = editor.read(); if (!current?.mapping || !editor.editable()) return;
        if (editor.update({ ...current, mapping: { ...current.mapping, confirmed: true } })) void editor.flushAll();
      }}>모든 연결을 확인하고 원문 속성 복원</button><button disabled={busy || locked} onClick={() => { if (editor.update(null)) pendingChanged.current?.(false); }}>연결 선택 버리기</button></div>
      {(!view.ok || view.token !== draft.expectedToken) && <p role="alert">원본이나 개인 내용이 바뀌었습니다. 선택 내용을 보관한 뒤 최신 상태에서 다시 연결해 주세요.</p>}
    </section>}
    {(source?.ok || draft) && !structuredOwner && !draft?.mapping && <form onSubmit={event => { event.preventDefault(); void editor.flushAll(); }}>
      <label>비교할 새 원문<textarea value={draft?.raw ?? ''} rows={8} maxLength={300000} disabled={busy || locked || blocked} onChange={event => edit(event.target.value)}
        onCompositionStart={event => { if (!editor.read()) edit(event.currentTarget.value); editor.composition(true); pendingChanged.current?.(true); }} onCompositionEnd={event => { editor.finishComposition(event.currentTarget.value); pendingChanged.current?.(editor.hasPendingInput()); }} /></label>
      <small>비교 보관 후에는 새로고침해도 이어서 선택할 수 있습니다. 보관 전 입력은 창을 닫으면 사라지므로 먼저 복사해 주세요.</small>
      <div className={styles.actions}><button disabled={busy || !draft || !source?.ok || blocked}>원문 비교·보관</button><button type="button" disabled={!draft} onClick={() => { void (async () => { try { await navigator.clipboard.writeText(editor.read()?.raw ?? ''); setError(false); setMessage('입력 원문을 복사했습니다.'); } catch { setError(true); setMessage('자동 복사가 되지 않습니다. 원문을 직접 선택해 복사해 주세요.'); } })(); }}>입력 복사</button><button type="button" disabled={busy || locked || !draft} onClick={() => setDiscard(true)}>입력 버리기</button></div>
      {discard && <div className={styles.notice}><p>보관하지 않은 입력을 버릴까요?</p><button type="button" onClick={() => { if (editor.update(null)) { setDiscard(false); pendingChanged.current?.(false); } }}>입력 버리기 확인</button><button type="button" onClick={() => setDiscard(false)}>계속 편집</button></div>}
    </form>}
    {source?.ok && <div>{source.owner.undo && <><button disabled={blocked || busy || locked || !!draft} onClick={() => { if (view.ok) setUndoReview({ token: view.token, flowRef: source.owner.flowRef }); }}>마지막 원본 적용만 되돌리기</button>
      {undoReview && <section className={styles.notice} aria-label="원본 되돌리기 비교"><h3>되돌릴 원본과 남길 개인 항목</h3><p>이전 원본 선택으로 돌아갑니다. 적용하면서 새로 추가된 항목과 그 개인 기록은 삭제하지 않고 ‘원본 적용 뒤 보존한 항목’으로 남깁니다.</p>
        <dl>{programLegacySourceComparison(source.owner, source.owner.undo.selection.flowRevisionId, { id: 'flow', itemRef: null, kind: 'flow' }, source.owner.undo.selection).map(row => <React.Fragment key={row.label}><dt>{row.label}</dt><dd>현재: {row.mine || '(없음)'} → 이전: {row.incoming || '(없음)'}</dd></React.Fragment>)}</dl>
        {Object.entries(source.owner.effective.itemRevisions).map(([ref, revision]) => {
          const oldRevision = source.owner.undo!.selection.itemRevisions[ref];
          if (oldRevision === revision) return null;
          const currentItem = projectProgramLegacySource(source.owner)!.flow.items.find(item => item.ref === ref)!;
          const previousItem = oldRevision ? projectProgramLegacySource(source.owner, source.owner.undo!.selection)!.flow.items.find(item => item.ref === ref) : null;
          const id = data.spaces[data.activeActorId].savedBindings.find(binding => binding.flowRef === flowRef)?.itemLines[ref];
          const document = data.spaces[data.activeActorId].text.flows.find(doc => doc.lines.some(line => line.id === id));
          const lineAt = document?.lines.findIndex(line => line.id === id) ?? -1;
          const itemRefs = new Set(Object.values(data.spaces[data.activeActorId].savedBindings.find(binding => binding.flowRef === flowRef)?.itemLines ?? {}));
          let end = lineAt + 1; while (document && end < document.lines.length && !itemRefs.has(document.lines[end].id)) end++;
          return <details key={ref} open><summary>{currentItem.title} → {previousItem?.title ?? '현재 항목·기록 보존'}</summary>
            {previousItem && <dl>{programLegacySourceComparison(source.owner, oldRevision, { id: `item:${ref}`, itemRef: ref, kind: 'modified' }, source.owner.undo!.selection).map((row, index) => <React.Fragment key={`${row.label}:${index}`}><dt>{row.label}</dt><dd><span>현재</span><pre>{row.mine || '(없음)'}</pre><span>되돌릴 원본</span><pre>{row.incoming || '(없음)'}</pre></dd></React.Fragment>)}</dl>}
            <p>보존할 개인 내용</p><pre>{document && lineAt >= 0 ? document.lines.slice(lineAt, end).map(line => line.text).join('\n') : '(연결 내용 없음)'}</pre>
            {id && <p>개인 진행 기록: {M.progressHistory(data.spaces[data.activeActorId].text, id).map(record => `${record.date} ${record.percent}%`).join(' · ') || '(없음)'}</p>}
            {executionRecords(source.owner, ref)}
          </details>;
        })}
        {(!view.ok || undoReview.token !== view.token || undoReview.flowRef !== source.owner.flowRef) && <p role="alert">비교 중 내용이 바뀌었습니다. 변경 없이 닫은 뒤 최신 내용을 다시 비교해 주세요.</p>}
        <div className={styles.actions}><button disabled={blocked || busy || locked || !!draft || !view.ok || undoReview.token !== view.token || undoReview.flowRef !== source.owner.flowRef} onClick={() => { if (!view.ok || undoReview.token !== view.token || undoReview.flowRef !== source.owner.flowRef) return; act({ type: 'undo', flowRef: source.owner.flowRef, now: new Date().toISOString(), retainAddedItemRefs: Object.keys(source.owner.effective.itemRevisions).filter(ref => !Object.hasOwn(source.owner.undo!.selection.itemRevisions, ref)) }); setUndoReview(null); }}>추가 항목·기록을 보존하며 원본 선택 되돌리기</button><button onClick={() => setUndoReview(null)}>변경 없이 닫기</button></div>
      </section>}
    </>}
      {reviews.map(review => {
        const base = { ...source.owner, effective: JSON.parse(review.expectedSelection) }, changes = programLegacySourceChanges(base, review.incomingRevisionId,
          { includeAcknowledgedRemovals: review.status === 'applied' }), stale = review.expectedSelection !== sourceCanonical(source.owner.effective);
        const disabled = blocked || busy || locked || !!draft || review.status === 'applied' || stale;
        return <details className={styles.review} key={review.id} open={review.status !== 'applied'}><summary>{review.status === 'applied' ? '적용한 원본' : review.status === 'deferred' ? '나중에 비교할 원본' : '선택할 원본'} · {changes.length}개 {changes.some(change => programLegacySourceUnlinkedItem(base, change)) ? '검토' : '차이'}</summary>
          <p>출처: {structuredOwner ? '실제 제공 Map 구조 자료' : '개인 입력 원문'} · {review.createdAt} · {review.incomingRevisionId}</p>{stale && review.status !== 'applied' && <p role="alert">다른 원본이 먼저 적용되어 이 비교는 오래됐습니다. 아래 원문을 보관한 뒤 최신 원본으로 새 비교를 시작해 주세요.</p>}
          {!changes.length && review.status !== 'applied' && <p role="status">이미 확인한 원본 변경입니다. 보존한 개인 항목과 기록은 그대로 남아 있습니다.</p>}
          {changes.map(change => { const unlinked = programLegacySourceUnlinkedItem(base, change); return <fieldset key={change.id} disabled={disabled}><legend>{unlinked ? '기존 개인 항목 · 새 원문 행 연결 없음' : change.kind === 'flow' ? '원본 정보' : change.kind === 'added' ? '추가 항목' : change.kind === 'removed' ? '새 원문에서 빠진 항목' : base.effective.retainedItemRefs.includes(change.itemRef!) ? '원본에 다시 제공된 항목' : '바뀐 항목'}</legend>
            <dl>{programLegacySourceComparison(base, review.incomingRevisionId, change).map((row, index) => <React.Fragment key={`${row.label}:${index}`}><dt>{row.label}</dt><dd><span>{unlinked ? '기존 항목' : '현재 원본'}</span><pre>{row.mine || '(없음)'}</pre><span>{unlinked ? '연결 상태' : '새 원문'}</span><pre>{row.incoming || '(없음)'}</pre></dd></React.Fragment>)}</dl>
            {change.itemRef && programLegacySourceComparison(base, review.incomingRevisionId, change).some(row => row.label === '실행 방식') && executionRecords(source.owner, change.itemRef)}
            <div className={styles.choices}>{(['mine', 'incoming'] as const).map(choice => <label key={choice}><input type="radio" name={`${review.id}:${change.id}`} checked={review.choices[change.id] === choice} onChange={() => act({ type: 'choice', flowRef: source.owner.flowRef, reviewId: review.id, changeId: change.id, choice, now: new Date().toISOString() })} />{unlinked ? choice === 'mine' ? '기존 항목 유지' : '원문 연결 없음 확인 · 개인 항목 보존' : choice === 'mine' ? '현재 원본 유지' : change.kind === 'removed' ? '원문 삭제 확인 · 내 항목 보존' : '새 원문 사용'}</label>)}</div>
          </fieldset>; })}
          <details><summary>{structuredOwner ? '보관한 구조·출처 전체' : '보관한 원문 전체'}</summary><textarea readOnly rows={8} value={structuredOwner ? programLegacyMapEvidenceText(structuredOwner.revisions[review.incomingRevisionId]) : source.owner.revisions[review.incomingRevisionId].authoring.rawText} onFocus={event => event.currentTarget.select()} /></details>
          {review.status !== 'applied' && <div className={styles.actions}><button disabled={disabled || !changes.length || changes.some(change => !review.choices[change.id])} onClick={() => act({ type: 'apply', flowRef: source.owner.flowRef, reviewId: review.id, now: new Date().toISOString() })}>선택한 내용 적용</button><button disabled={disabled} onClick={() => act({ type: 'defer', flowRef: source.owner.flowRef, reviewId: review.id, now: new Date().toISOString() })}>나중에 비교</button></div>}
        </details>;
      })}</div>}
  </details>;
}
