'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { programClone, programFailure, programId, programResult, type ProgramData, type ProgramTransition, type ProgramWritingPosition } from '@/lib/flow/integrated-poc/contract';
import { programDate } from '@/lib/flow/integrated-poc/program-data';
import { addProgramQuickTask, archiveProgramDocument, completeProgramTask, createProgramDocument, createProgramFolder, deleteProgramFolder, linkProgramTask, moveProgramFolder, recordProgramTaskProgress, renameProgramDocument, renameProgramFolder, setProgramDocumentFolder, updateProgramTask } from '@/lib/flow/integrated-poc/private-space';
import { programDateRange, programExecutionTasks, programIsContinuingTask, programShiftDate, programShiftMonth, type ProgramPeriod } from '@/lib/flow/integrated-poc/execution';
import { programOrderedExecutionRows, programTextExecutionKey, reorderProgramExecutionTimeline } from '@/lib/flow/integrated-poc/recurrence-order';
import { mergeProgramTextWorkspace } from '@/lib/flow/integrated-poc/text-merge';
import { flushProgramEditorCollection, prepareProgramDocumentAction, type ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import { textWorkspaceModel as M, type TextTask, type TextWorkspaceState } from '@/lib/flow/integrated-poc/text-workspace';
import { programErrorMessage, type ProgramMutate, type ProgramNavigate, type ProgramMutationResult, type ProgramDestination } from '@/lib/flow/integrated-poc/ui-contract';
import { emptyProgramRecurrencePresentation, programNavigationMatchesDocument, type ProgramSpaceNavigation } from '@/lib/flow/integrated-poc/navigation';
import { ProgramDocumentProvenance } from './ProgramDocumentProvenance';
import { ProgramTextEditor } from './ProgramTextEditor';
import { ProgramRecurrence } from './ProgramRecurrence';
import { ProgramRecurrencePlanRecovery } from './ProgramRecurrencePlanRecovery';
import { ProgramOutputReturn } from './ProgramOutputReturn';
import { ProgramTaskDocumentMove } from './ProgramTaskDocumentMove';
import { ProgramDocumentTrash, ProgramDocumentTrashAction } from './ProgramDocumentTrash';
import { moveProgramTaskDocument } from '@/lib/flow/integrated-poc/task-document-move';
import { setProgramDocumentTrashed } from '@/lib/flow/integrated-poc/document-lifecycle';
import { programSame } from '@/lib/flow/integrated-poc/controller';
import { normalizeProgramWritingPosition } from '@/lib/flow/integrated-poc/writing-position';
import { programLegacyTaskQualityHold, programPreservesLegacyQualityHold } from '@/lib/flow/integrated-poc/legacy-map-review';
import { programPreservesLegacyPlanExcluded } from '@/lib/flow/integrated-poc/program-legacy-plan-target';
import { programPreservesSeriesMetadata, programSeriesMetadata } from '@/lib/flow/integrated-poc/recurrence-target';
import { programDocumentContentLock, programPreservesLockedDocumentContent, programReferenceExecutionAccess } from '@/lib/flow/integrated-poc/reference-execution-guard';
import styles from './ProgramSpace.module.css';
import { programRecurrenceFocusId, resolveProgramRecurrencePlanFocus, type ProgramRecurrencePlanFocusRequest } from '@/lib/flow/integrated-poc/recurrence-plan-focus';

export type ProgramSpaceProps = {
  data: ProgramData; mutate: ProgramMutate; navigate: ProgramNavigate; today: string;
  selectedDocumentId?: string; onUndo: () => Promise<void>; onRedo: () => Promise<void>;
  outputReturn?: ProgramDestination;
  onPublishDocument: (documentId: string) => void;
  onInspectCopy: (copyId: string) => void;
  onRevisionHistory: (documentId: string) => void;
  onOutputDocument?: (documentId: string) => void;
  onRegisterEditors?: (editors: ProgramEditorFlush | null) => void;
  onRegisterNavigation?: (navigation: ProgramSpaceNavigation | null) => void;
};
type Detail = { kind: 'task'; id: string } | { kind: 'folder'; id: string } | { kind: 'connect'; docId: string; lineId: string } | null;
const periods: [ProgramPeriod, string][] = [['documents', '문서'], ['today', '오늘'], ['week', '주간'], ['month', '월간'], ['all', '전체 할 일'], ['undated', '날짜 미정']];
export const PROGRAM_EMPTY_EXAMPLE = '이번 주 준비\n- [ ] 확인할 일\n  - [ ] 먼저 확인할 내용\n자유롭게 적는 메모';

export function ProgramSpace(props: ProgramSpaceProps) {
  const { data, mutate, today } = props, actorId = data.activeActorId, space = data.spaces[actorId];
  const [period, setPeriod] = useState<ProgramPeriod>('documents');
  const [date, setDate] = useState(today), [folderId, setFolderId] = useState(''), [query, setQuery] = useState('');
  const [selected, setSelected] = useState(props.selectedDocumentId ?? space.position.documentId ?? '');
  const [opened, setOpened] = useState<string[]>(selected ? [selected] : []);
  const [detail, setDetail] = useState<Detail>(null), [message, setMessage] = useState('');
  const [moving, setMoving] = useState<string | null>(null), [showArchived, setShowArchived] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [preparingDocumentAction, setPreparingDocumentAction] = useState(false);
  const preparing = useRef(false), selectedRef = useRef(selected); selectedRef.current = selected;
  const saveRequests = useRef<Record<string, (() => Promise<boolean>) | null>>({});
  const recurrencePorts = useRef<Record<string, ProgramEditorFlush | null>>({});
  // A flush may await an already-running local save. Only successfully persisted
  // editor commits can advance this chain; render props or arbitrary snapshots cannot.
  const moveFlush = useRef<{ actorId: string; expected: typeof space; conflict: boolean } | null>(null);
  const draftReaders = useRef<Record<string, (() => string) | null>>({});
  const inputLocks = useRef<Record<string, ((locked: boolean) => void) | null>>({}), inputLockCount = useRef(0);
  const [recordDate, setRecordDate] = useState(today), [percent, setPercent] = useState('0');
  const [executionDateDraft, setExecutionDateDraft] = useState('');
  const [recurrencePresentation, setRecurrencePresentation] = useState(emptyProgramRecurrencePresentation);
  const root = useRef<HTMLElement | null>(null);
  const documentMenu = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => {
    const closeOutside = (event: Event) => {
      const menu = documentMenu.current;
      if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      const menu = documentMenu.current;
      if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented || !menu?.open || !menu.contains(event.target as Node)) return;
      menu.open = false; menu.querySelector('summary')?.focus();
    };
    window.addEventListener('pointerdown', closeOutside); window.addEventListener('focusin', closeOutside); window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('pointerdown', closeOutside); window.removeEventListener('focusin', closeOutside); window.removeEventListener('keydown', escape); };
  }, []);
  const [planFocus, setPlanFocus] = useState<{ request: ProgramRecurrencePlanFocusRequest; documentId: string } | null>(null);
  const planFocusRef = useRef(planFocus); planFocusRef.current = planFocus;
  const focusAppliedPlan = (request: ProgramRecurrencePlanFocusRequest) => setPlanFocus({ request, documentId: selectedRef.current });
  useEffect(() => {
    if (!planFocus) return;
    const target = resolveProgramRecurrencePlanFocus(data, planFocus.request);
    if (!target || selected !== planFocus.documentId) { setPlanFocus(null); return; }
    const frame = requestAnimationFrame(() => {
      if (planFocusRef.current !== planFocus) return;
      if (!root.current?.getClientRects().length) { setPlanFocus(null); return; }
      const button = document.getElementById(programRecurrenceFocusId(target.key)) as HTMLButtonElement | null;
      if (button && root.current.contains(button) && button.getClientRects().length && !button.disabled) {
        button.focus({ preventScroll: true }); button.scrollIntoView({ block: 'center' }); setPlanFocus(null);
      } else if (period !== 'week' || date !== target.date) {
        // The exact result may be outside the document page or current period.
        // Keep the selected document/filters and reveal its execution week.
        setPeriod('week'); setDate(target.date);
      } else setPlanFocus(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [planFocus, data, selected, period, date]);
  const includeHeldOccurrences = recurrencePresentation.includeHeld, includeExcludedOccurrences = recurrencePresentation.includeExcluded;
  const occurrencePage = period === 'today' || period === 'all' ? recurrencePresentation.pages[period] : 0;
  const setOccurrencePage = (change: (value: number) => number) => { if (period === 'today' || period === 'all') setRecurrencePresentation(previous => ({ ...previous, pages: { ...previous.pages, [period]: change(previous.pages[period]) } })); };
  const setIncludeHeldOccurrences = (value: boolean) => setRecurrencePresentation(previous => ({ ...previous, includeHeld: value }));
  const setIncludeExcludedOccurrences = (value: boolean) => setRecurrencePresentation(previous => ({ ...previous, includeExcluded: value }));
  const detailExpected = useRef<typeof space | null>(null), formExpected = useRef<typeof space | null>(null);
  const dialog = useRef<HTMLDialogElement>(null), previousFocus = useRef<HTMLElement | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null), holdPoint = useRef<{ x: number; y: number } | null>(null);
  const suppressPointerClick = useRef<string | null>(null);
  // Keep native drag identity off the render path. Inserting the touch-move
  // notice during dragstart moves the source row and can cancel Chromium's
  // native drag before its data transfer has started.
  const nativeDrag = useRef<string | null>(null);
  const positions = useRef<Record<string, ProgramWritingPosition>>({}), dirty = useRef<Record<string, boolean>>({});
  const docs = [...space.text.documents, ...space.text.flows];
  const selectedDoc = docs.find(doc => doc.id === selected);
  const retainedIds = new Set(Object.values(space.retentionDocuments ?? {}));
  const retentionSource = Object.entries(space.retentionDocuments ?? {}).find(([, id]) => id === selected)?.[0];
  const selectedArchived = !!selectedDoc && space.archivedDocumentIds.includes(selectedDoc.id);
  const selectedTrashed = !!selectedDoc && !!space.documentTrash?.[selectedDoc.id];
  const selectedQualityHold = selectedDoc ? space.savedBindings.filter(binding => binding.documentId === selectedDoc.id)
    .flatMap(binding => Object.values(binding.itemLines)).map(id => programLegacyTaskQualityHold(space, id)).find(Boolean) : null;
  const folder = space.text.folders.find(row => row.id === folderId);
  const executionQuery = { period, date, today, folderId, query, includeHeld: includeHeldOccurrences, includeExcluded: includeExcludedOccurrences, page: occurrencePage };
  const occurrenceResult = useMemo(() => period === 'documents' ? { rows: [], issues: [], hasMore: false, pendingStarts: [] } : programOrderedExecutionRows(data, executionQuery), [data, period, date, today, folderId, query, includeHeldOccurrences, includeExcludedOccurrences, occurrencePage]);
  const executionRows = occurrenceResult.rows;
  const allTasks = useMemo(() => programExecutionTasks(space), [space]);
  const detailTask = detail?.kind === 'task' ? allTasks.find(task => task.id === detail.id) : null;
  const documentList = docs.filter(doc => !retainedIds.has(doc.id) && !space.documentTrash?.[doc.id] && space.archivedDocumentIds.includes(doc.id) === showArchived && (!folderId || doc.folderId === folderId)
    && (!query || `${doc.title}\n${M.raw(doc)}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
  const range = programDateRange(period, date);
  const presentation = useRef({ period, date, folderId, query, selected, showArchived, recurrence: recurrencePresentation });
  presentation.current = { period, date, folderId, query, selected, showArchived, recurrence: recurrencePresentation };
  const documentsRef = useRef(docs); documentsRef.current = docs;
  function lockInput() {
    inputLockCount.current++;
    Object.values(inputLocks.current).forEach(lock => lock?.(true));
    const releases = Object.values(recurrencePorts.current).flatMap(port => port?.lockInput ? [port.lockInput()] : []);
    let released = false;
    return () => { if (released) return; released = true; releases.forEach(release => release()); inputLockCount.current--; if (!inputLockCount.current) Object.values(inputLocks.current).forEach(lock => lock?.(false)); };
  }
  async function flushRecurrenceEditors() {
    try { for (const port of Object.values(recurrencePorts.current)) if (port && !await port.flushAll()) return false; return true; }
    catch { return false; }
  }
  async function flushAllEditors() {
    if (!await flushRecurrenceEditors()) return false;
    return flushProgramEditorCollection(() => Object.keys(dirty.current).map(id => ({ dirty: () => !!dirty.current[id], save: saveRequests.current[id] ?? undefined })));
  }
  useEffect(() => {
    props.onRegisterEditors?.({ lockInput,
      hasPendingInput: () => Object.values(dirty.current).some(Boolean) || Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.()),
      blocksExternalSnapshot: (before, next) => Object.values(recurrencePorts.current).some(port => port?.blocksExternalSnapshot?.(before, next)),
      pendingDocumentIds: () => Object.keys(dirty.current).filter(id => dirty.current[id]),
      captureDrafts: () => [...Object.keys(dirty.current).filter(id => dirty.current[id]).map(id => ({ title: documentsRef.current.find(doc => doc.id === id)?.title ?? '작성 중 문서', raw: draftReaders.current[id]?.() ?? '' })), ...Object.values(recurrencePorts.current).flatMap(port => port?.captureDrafts?.() ?? [])],
      flushAll: flushAllEditors });
    return () => props.onRegisterEditors?.(null);
  }, [actorId]);
  useEffect(() => {
    props.onRegisterNavigation?.({
      actorId,
      capture: () => ({ space: presentation.current, writing: Object.fromEntries(Object.entries(positions.current).map(([id, position]) => [id, { start: position.start, end: position.end, scrollTop: position.scrollTop }])) }),
      restore: checkpoint => {
        if (checkpoint.actorId !== actorId) return;
        const view = checkpoint.space;
        if (view && !programNavigationMatchesDocument(checkpoint.location, view.selected)) return;
        if (view) {
          setPeriod(view.period as ProgramPeriod); if (programDate(view.date)) setDate(view.date);
          setFolderId(view.folderId); setQuery(view.query); setShowArchived(view.showArchived);
          setRecurrencePresentation(view.recurrence ?? emptyProgramRecurrencePresentation());
          if (documentsRef.current.some(doc => doc.id === view.selected)) { setSelected(view.selected); setOpened(previous => previous.includes(view.selected) ? previous : [...previous, view.selected]); }
        }
        for (const [id, position] of Object.entries(checkpoint.writing ?? {})) {
          const doc = documentsRef.current.find(entry => entry.id === id); if (!doc) continue;
          const lineIndex = M.raw(doc).slice(0, position.start).split('\n').length - 1;
          positions.current[id] = { ...position, documentId: id, lineId: doc.lines[lineIndex]?.id ?? null };
        }
        requestAnimationFrame(() => {
          for (const [id, position] of Object.entries(checkpoint.writing ?? {})) {
            const textarea = document.getElementById(`program-text-${encodeURIComponent(id)}`) as HTMLTextAreaElement | null;
            if (textarea) { textarea.setSelectionRange(Math.min(position.start, textarea.value.length), Math.min(position.end, textarea.value.length)); textarea.scrollTop = position.scrollTop; }
          }
        });
      },
    });
    return () => props.onRegisterNavigation?.(null);
  }, [actorId]);
  async function openDocumentAction(action: (documentId: string) => void | Promise<void>, options: { closeMenu?: boolean } = {}) {
    if (!selectedDoc || preparing.current || retentionSource) return;
    const id = selectedDoc.id;
    const releaseInput = lockInput();
    preparing.current = true; setPreparingDocumentAction(true); setMessage('');
    try {
      if (!await flushRecurrenceEditors()) { setMessage('회차 날짜를 적용하거나 취소한 뒤 문서 작업을 다시 열어 주세요.'); return; }
      const result = await prepareProgramDocumentAction({ dirty: () => !!dirty.current[id], save: saveRequests.current[id] ?? undefined, stillSelected: () => selectedRef.current === id });
      if (result === 'ready') {
        // The next surface owns focus. Closing the retained menu must neither
        // focus its summary nor discard an unsubmitted native title input.
        if (options.closeMenu !== false && documentMenu.current) documentMenu.current.open = false;
        await action(id);
      }
      else if (result === 'save-failed') setMessage('현재 입력을 저장하지 못했습니다. 본문의 저장 오류를 해결한 뒤 다시 열어 주세요.');
    } finally { releaseInput(); preparing.current = false; setPreparingDocumentAction(false); }
  }
  async function changeDocumentTrash(trashed: boolean): Promise<ProgramMutationResult> {
    let outcome: ProgramMutationResult = { ok: false, reason: 'conflict' };
    await openDocumentAction(async id => { outcome = await run(trashed ? '문서 휴지통 이동' : '문서 휴지통 복원', current => setProgramDocumentTrashed(current, {
      actorId, requestId: programId('trash'), expectedSpace: current.spaces[actorId], documentId: id, trashed, now: new Date().toISOString() })); }, { closeMenu: false });
    return outcome;
  }
  async function moveTaskDocument(taskId: string, destinationId: string, expectedSpace: typeof space): Promise<ProgramMutationResult> {
    if (preparing.current) return { ok: false, reason: 'conflict' };
    const release = lockInput(); preparing.current = true; setPreparingDocumentAction(true);
    const authority = { actorId, expected: expectedSpace, conflict: false }; moveFlush.current = authority;
    try {
      if (!await flushAllEditors()) return { ok: false, reason: 'conflict' };
      if (authority.conflict) return { ok: false, reason: 'conflict' };
      return await run('할 일 문서 이동', current => current.activeActorId !== actorId ? programFailure(current, 'conflict') : moveProgramTaskDocument(current, { actorId, requestId: programId('move'), expectedSpace: authority.expected, taskId, destinationId }));
    } finally { if (moveFlush.current === authority) moveFlush.current = null; preparing.current = false; setPreparingDocumentAction(false); release(); }
  }
  // User intent is based on the displayed state, not whatever happens to be on disk at commit time.
  const base = (_current: ProgramData) => ({ actorId, requestId: programId('request'), expectedSpace: detailExpected.current ?? formExpected.current ?? space });
  const run = async (label: string, build: (current: ProgramData) => ProgramTransition<string>, history = true) => {
    let committedSpace: typeof space | null = null;
    const result = await mutate(label, current => { const next = build(current); if (next.ok) committedSpace = next.data.spaces[actorId]; return next; }, { history });
    if (result.ok) { formExpected.current = null; if (detailExpected.current && committedSpace) detailExpected.current = committedSpace; }
    setMessage(result.ok ? '' : programErrorMessage(result.reason)); return result;
  };
  function cancelHold() { if (hold.current) clearTimeout(hold.current); hold.current = null; holdPoint.current = null; }
  function close() { dialog.current?.close(); detailExpected.current = null; setDetail(null); setMessage(''); previousFocus.current?.focus(); }
  function openDetail(next: Detail) { previousFocus.current = document.activeElement as HTMLElement; detailExpected.current = space; setExecutionDateDraft(next?.kind === 'task' ? allTasks.find(task => task.id === next.id)?.date ?? '' : ''); setMessage(''); setDetail(next); }
  useEffect(() => { if (detail && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [detail]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { cancelHold(); nativeDrag.current = null; setMoving(null); } };
    window.addEventListener('keydown', escape); return () => { cancelHold(); window.removeEventListener('keydown', escape); };
  }, []);
  useEffect(() => {
    if (props.selectedDocumentId) {
      setSelected(props.selectedDocumentId); setOpened(previous => previous.includes(props.selectedDocumentId!) ? previous : [...previous, props.selectedDocumentId!]); setPeriod('documents');
    }
  }, [props.selectedDocumentId]); // Data can arrive after navigation: retain the requested ID even before its document arrives.

  async function openDocument(id: string, taskId?: string) {
    let targetPosition: ProgramWritingPosition | null = null;
    const remembered = await run('작성 위치 기억', current => {
      if (current.activeActorId !== actorId) return programFailure(current, 'conflict');
      const currentSpace = current.spaces[actorId], doc = M.getDocument(currentSpace.text, id);
      if (!doc) return programFailure(current, 'missing');
      if (taskId) {
        const index = doc.lines.findIndex(line => line.id === taskId);
        if (index < 0) return programFailure(current, 'missing');
        const offset = doc.lines.slice(0, index).reduce((sum, line) => sum + line.text.length + 1, 0); targetPosition = { documentId: id, lineId: taskId, start: offset, end: offset, scrollTop: 0 };
      }
      const cached = selected && positions.current[selected];
      // Reading/navigation is presentation-only. Real editor commits retain
      // their writing position; history checkpoints retain read-only returns.
      if (cached) positions.current[selected] = normalizeProgramWritingPosition(currentSpace.text, cached);
      return programResult(current, current, id);
    }, false);
    if (!remembered.ok) return;
    if (targetPosition) positions.current[id] = targetPosition;
    setSelected(id); setLibraryOpen(false); setOpened(previous => previous.includes(id) ? previous : [...previous, id]); setPeriod('documents');
    props.navigate({ view: 'space', id }, taskId ? { writingLineId: taskId } : undefined);
  }
  async function newDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, title = String(new FormData(form).get('title') ?? '').trim();
    const result = await run('문서 만들기', current => createProgramDocument(current, { ...base(current), title, folderId: folderId || 'folder-unfiled' }));
    if (result.ok) { form.reset(); setLibraryOpen(false); setSelected(result.result); setOpened(previous => [...previous, result.result]); setPeriod('documents'); props.navigate({ view: 'space', id: result.result }); }
  }
  async function quickTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, input = new FormData(form), title = String(input.get('title') ?? ''), pickedDate = String(input.get('date') ?? '') || null;
    const result = await run('빠른 할 일 추가', current => {
      const currentSpace = current.spaces[actorId];
      let updated = current, documentId = currentSpace.text.documents.find(doc => doc.title === '빠른 할 일' && !currentSpace.archivedDocumentIds.includes(doc.id))?.id;
      if (!documentId) { const created = createProgramDocument(current, { ...base(current), title: '빠른 할 일', folderId: folderId || 'folder-unfiled' }); if (!created.ok) return created; updated = created.data; documentId = created.result; }
      return addProgramQuickTask(updated, { ...base(updated), expectedSpace: updated.spaces[actorId], documentId, title, date: pickedDate });
    });
    if (result.ok) form.reset();
  }
  async function editorCommit(docId: string, nextText: TextWorkspaceState, label: string, options?: { groupId?: string; expectedWorkspace?: TextWorkspaceState }) {
    let receipt: { before: typeof space; after: typeof space } | null = null;
    const result = await mutate(label, current => {
      if (current.activeActorId !== actorId) return programFailure(current, 'conflict');
      const before = current.spaces[actorId], merged = mergeProgramTextWorkspace(options?.expectedWorkspace ?? space.text, nextText, before.text);
      if (!merged || !programPreservesLockedDocumentContent(before, merged) || !programPreservesSeriesMetadata(before, merged) || !programPreservesLegacyQualityHold(before, merged) || !programPreservesLegacyPlanExcluded(before, merged)) return programFailure(current, 'conflict');
      const next = programClone(current); next.spaces[actorId].text = merged;
      const position = positions.current[docId];
      if (position && M.getDocument(merged, docId)?.lines.some(line => line.id === position.lineId)) next.spaces[actorId].position = position;
      const savedPosition = next.spaces[actorId].position;
      if (savedPosition.lineId && !M.getDocument(merged, savedPosition.documentId ?? '')?.lines.some(line => line.id === savedPosition.lineId)) next.spaces[actorId].position = { documentId: savedPosition.documentId, lineId: null, start: 0, end: 0, scrollTop: 0 };
      // Deleted unreferenced draft rows must not leave stale timeline metadata.
      const ids = new Set([...merged.documents, ...merged.flows].flatMap(doc => doc.lines.map(line => line.id)));
      for (const key of Object.keys(next.spaces[actorId].timelineOrders)) next.spaces[actorId].timelineOrders[key] = next.spaces[actorId].timelineOrders[key].filter(id => ids.has(id));
      receipt = { before: programClone(before), after: programClone(next.spaces[actorId]) };
      return programResult(current, next, docId);
    }, { groupId: options?.groupId });
    const authority = moveFlush.current;
    if (authority) {
      // Foreign private writes between local saves break the chain.
      // A failed save never lends its proposed state authority to the move.
      const committed = receipt as { before: typeof space; after: typeof space } | null;
      if (!result.ok || !committed || authority.actorId !== actorId || !programSame(authority.expected, committed.before)) authority.conflict = true;
      else authority.expected = committed.after;
    }
    return result.ok;
  }
  async function moveBefore(targetKey: string, beforeKey: string | null) {
    if (Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.())) { setMessage('회차 날짜를 적용하거나 취소한 뒤 순서를 바꿔 주세요.'); return; }
    const target = executionRows.find(row => row.key === targetKey); if (!target) return;
    const expectedKeys = executionRows.filter(row => row.date === target.date).map(row => row.key);
    await run('기간 목록 순서 이동', current => reorderProgramExecutionTimeline(current, { actorId, query: executionQuery, targetKey, beforeKey, expectedKeys, expectedOrder: space.executionTimelineOrders?.[target.date ?? 'undated'] ?? null })); setMoving(null);
  }
  function moveExecutionStep(key: string, direction: -1 | 1) {
    const target = executionRows.find(row => row.key === key); if (!target) return;
    const bucket = executionRows.filter(row => row.date === target.date), index = bucket.findIndex(row => row.key === key);
    if (direction < 0 && index > 0) void moveBefore(key, bucket[index - 1].key);
    if (direction > 0 && index < bucket.length - 1) void moveBefore(key, bucket[index + 2]?.key ?? null);
  }
  const moveStep = (task: TextTask, direction: -1 | 1) => moveExecutionStep(programTextExecutionKey(task), direction);
  async function dateMove(taskId: string, nextDate: string | null) {
    const result = await run('실행 날짜 변경', current => updateProgramTask(current, { ...base(current), taskId, patch: { date: nextDate } }));
    if (result.ok) setExecutionDateDraft(nextDate ?? '');
  }
  const folderOptions = space.text.folders.map(item => {
    const names = [item.title]; let parent = item.parentId;
    while (parent) { const ancestor = space.text.folders.find(row => row.id === parent); if (!ancestor) break; names.unshift(ancestor.title); parent = ancestor.parentId; }
    return { id: item.id, title: names.join(' / ') };
  });

  const guardOccurrenceDraft = (event: React.SyntheticEvent) => {
    const pending = Object.entries(recurrencePorts.current).filter(([, port]) => port?.hasPendingInput?.());
    const editor = (event.target as HTMLElement).closest('[data-recurrence-editor]')?.getAttribute('data-recurrence-editor');
    if (pending.length && !pending.some(([key]) => key === editor)) {
      event.preventDefault(); event.stopPropagation(); setMessage('회차 날짜를 적용하거나 취소한 뒤 이동해 주세요.');
    }
  };
  return <section ref={root} className={styles.space} aria-label="내 공간" onClickCapture={guardOccurrenceDraft} onKeyDownCapture={event => { if (!['Tab', 'Shift', 'Escape'].includes(event.key)) guardOccurrenceDraft(event); }}>
    {selectedDoc && <button className={styles.libraryToggle} aria-expanded={libraryOpen} aria-controls="program-library" onClick={() => setLibraryOpen(value => !value)}>문서·폴더 {libraryOpen ? '접기' : '열기'}{folder ? ` · ${folder.title}` : ''}</button>}
    <aside id="program-library" className={styles.sidebar} data-open={libraryOpen || !selectedDoc}>
      <form className={styles.newDoc} onSubmit={newDocument}><label htmlFor="program-document-title">새 문서</label><div><input id="program-document-title" name="title" placeholder="문서 제목" required maxLength={240} /><button type="submit">만들기</button></div></form>
      <label className={styles.field}>내 문서·할 일 찾기<input id="program-private-search" type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label className={styles.field}>폴더<select value={folderId} onChange={event => setFolderId(event.target.value)}><option value="">모든 폴더</option>{folderOptions.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <details className={styles.folderTools}><summary>폴더 정리</summary><form onSubmit={async event => {
        event.preventDefault(); const form = event.currentTarget, title = String(new FormData(form).get('title') ?? '');
        const result = await run('폴더 만들기', current => createProgramFolder(current, { ...base(current), title, parentId: folderId || null })); if (result.ok) form.reset();
      }}><label>새 폴더 이름<input name="title" required maxLength={100} /></label><button>폴더 만들기</button></form>{folder && folder.id !== 'folder-unfiled' && <button onClick={() => openDetail({ kind: 'folder', id: folder.id })}>{folder.title} 수정·이동</button>}</details>
      <div className={styles.listHeading}><h2>{showArchived ? '보관한 문서' : '문서'}</h2><button aria-pressed={showArchived} onClick={() => setShowArchived(value => !value)}>{showArchived ? '사용 중 보기' : '보관함'}</button></div>
      <ul className={styles.documents}>{documentList.map(doc => <li key={doc.id}><button aria-current={selected === doc.id && period === 'documents' ? 'page' : undefined} onClick={() => void openDocument(doc.id)}>{doc.title}<small>{space.text.flows.some(flow => flow.id === doc.id) ? '개인 Flow' : doc.folder}</small></button></li>)}</ul>
      {!documentList.length && <p className={styles.muted}>{query ? '찾는 문서가 없습니다.' : showArchived ? '보관한 문서가 없습니다.' : '첫 문서를 만들거나 빠른 할 일을 적어보세요.'}</p>}
      <ProgramDocumentTrash space={space} onOpen={id => void openDocument(id)} />
    </aside>
    <div className={styles.content}>
      {props.outputReturn && <ProgramOutputReturn key={`${actorId}:${props.outputReturn.executionKey}`} data={data} destination={props.outputReturn} today={today} mutate={mutate}
        onOpenSource={(id, line) => void openDocument(id, line)} onRegisterEditors={(port, key) => { recurrencePorts.current[key] = port; }} onUndo={props.onUndo} onRedo={props.onRedo} />}
      <nav className={styles.periods} aria-label="개인공간 보기">{periods.map(([key, label]) => <button key={key} aria-current={period === key ? 'page' : undefined} onClick={() => { setPeriod(key); if (key === 'today') setDate(today); }}>{label}</button>)}</nav>
      {message && <p role="alert" className={styles.error}>{message}</p>}
      <div hidden={period !== 'documents'}>
        <ProgramRecurrencePlanRecovery data={data} today={today} documentId={selected || undefined} disabled={preparingDocumentAction} onOpenSource={(id, line) => void openDocument(id, line)} />
        {!selectedDoc ? selected ? <div className={styles.empty}><h1>문서를 찾을 수 없습니다</h1><p>이 문서가 삭제되었거나 현재 인물의 문서가 아닐 수 있습니다. 다른 문서로 자동 이동하지 않았습니다. 내 문서 목록이나 보관함에서 다시 선택해 주세요.</p><button onClick={() => { setShowArchived(false); setLibraryOpen(true); }}>내 문서 목록</button><button onClick={() => { setShowArchived(true); setLibraryOpen(true); }}>보관함 확인</button></div> : <div className={styles.empty}><h1>필요한 내용을 먼저 적으세요</h1><p>메모로 두어도 좋고, 체크할 일에 날짜를 붙여도 됩니다.</p><button onClick={() => document.getElementById('program-document-title')?.focus()}>문서 만들기</button><button onClick={() => props.navigate({ view: 'discover' })}>다른 사람의 Flow 둘러보기</button></div> : <>
          <div className={styles.docHeading}><h1>{selectedDoc.title}</h1>{!retentionSource && !selectedTrashed && <details key={selectedDoc.id} ref={documentMenu} onToggle={event => {
            const title = event.currentTarget.querySelector<HTMLInputElement>('input[name="title"]');
            if (!event.currentTarget.open && (!title || title.value === title.defaultValue)) formExpected.current = null;
          }}><summary>문서 작업</summary><div className={styles.documentTools} onInputCapture={() => { formExpected.current ??= space; }}>
            <form onSubmit={async event => { event.preventDefault(); const title = String(new FormData(event.currentTarget).get('title') ?? ''); await run('문서 이름 변경', current => renameProgramDocument(current, { ...base(current), documentId: selectedDoc.id, title })); }}><label>문서 이름<input key={selectedDoc.id + selectedDoc.title} name="title" defaultValue={selectedDoc.title} required /></label><button>이름 변경</button></form>
            <label>문서 폴더<select value={selectedDoc.folderId} onChange={event => { const value = event.target.value; void run('폴더 이동', current => setProgramDocumentFolder(current, { ...base(current), documentId: selectedDoc.id, folderId: value })); }}>{folderOptions.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <button disabled={preparingDocumentAction} onClick={() => void openDocumentAction(props.onPublishDocument)}>선택해서 공개</button>
            <button disabled={preparingDocumentAction} onClick={() => void openDocumentAction(props.onRevisionHistory)}>저장판본·복구</button>
            {props.onOutputDocument && <button disabled={preparingDocumentAction} onClick={() => void openDocumentAction(props.onOutputDocument!)}>내 도구로 가져가기</button>}
            {space.copies.filter(copy => copy.documentId === selectedDoc.id).map(copy => <button key={copy.id} disabled={preparingDocumentAction} onClick={() => void openDocumentAction(() => props.onInspectCopy(copy.id))}>내 계획·원본 변경 확인</button>)}
            {space.savedBindings.filter(binding => binding.documentId === selectedDoc.id).map(binding => <button key={binding.flowRef} disabled={preparingDocumentAction} onClick={() => void openDocumentAction(() => props.navigate({ view: 'legacy', id: binding.flowRef }))}>원본·개인 계획 확인</button>)}
            {space.retentionDocuments?.[selectedDoc.id] && <button onClick={() => void openDocument(space.retentionDocuments![selectedDoc.id])}>복구 중 보관된 내용</button>}
            <button disabled={preparingDocumentAction} onClick={() => void openDocumentAction(async id => {
              // Archiving changes only this stable document's presence, never its freshly saved body.
              await run(selectedArchived ? '문서 복원' : '문서 보관', current => archiveProgramDocument(current, { actorId, requestId: programId('archive'), expectedSpace: current.spaces[actorId], documentId: id, archived: !selectedArchived }));
            })}>{selectedArchived ? '보관에서 꺼내기' : '문서 보관'}</button>
            <ProgramDocumentTrashAction key={selectedDoc.id} space={space} documentId={selectedDoc.id} disabled={preparingDocumentAction} onChange={changeDocumentTrash} />
          </div></details>}</div>
          {selectedTrashed && <ProgramDocumentTrashAction key={selectedDoc.id} space={space} documentId={selectedDoc.id} disabled={preparingDocumentAction} onChange={changeDocumentTrash} />}
          <ProgramDocumentProvenance data={data} documentId={selectedDoc.id} disabled={preparingDocumentAction || selectedTrashed} onOpenRevisions={() => void openDocumentAction(props.onRevisionHistory)} onOpenCreatorDraft={draftId => void openDocumentAction(() => props.navigate({ view: 'creator', id: draftId }))} />
          {selectedQualityHold && <p role="status" className={styles.muted}>{selectedQualityHold} 해당 원본 항목과 실행 기록은 읽기 전용으로 남깁니다. 다른 자유 메모는 계속 쓸 수 있습니다.</p>}
          {retentionSource && <p className={styles.muted}>판본 복구 중 빠진 내용을 보관한 곳입니다. <button onClick={() => void openDocument(retentionSource)}>원래 문서로 돌아가기</button></p>}
          {!selectedArchived && !M.raw(selectedDoc).trim() && <details className={styles.example}><summary>빈 문서에서 시작할 작성 예시</summary><pre>{PROGRAM_EMPTY_EXAMPLE}</pre><button onClick={() => void editorCommit(selectedDoc.id, M.editText(space.text, selectedDoc.id, PROGRAM_EMPTY_EXAMPLE), '작성 예시 넣기', { expectedWorkspace: space.text })}>이 예시를 문서에 넣기</button></details>}
        </>}
        {opened.filter(id => docs.some(doc => doc.id === id)).map(id => <div key={id} hidden={selected !== id} data-program-document={id}><ProgramTextEditor
          docId={id} workspace={space.text} initialPosition={positions.current[id] ?? (space.position.documentId === id ? space.position : undefined)}
          onCommit={(next, label, options) => editorCommit(id, next, label, options)}
          validateWorkspace={next => programPreservesLockedDocumentContent(space, next) && programPreservesSeriesMetadata(space, next) && programPreservesLegacyQualityHold(space, next) && programPreservesLegacyPlanExcluded(space, next)}
          taskAccess={taskId => programReferenceExecutionAccess(space, taskId)}
          onOpenTaskOrigin={(documentId, lineId) => { void openDocument(documentId, lineId); }}
          onPosition={(position, lineId) => { positions.current[id] = { ...position, documentId: id, lineId }; }}
          onDirtyChange={value => { dirty.current[id] = value; }} onUndo={props.onUndo} onRedo={props.onRedo}
          onRegisterSave={save => { saveRequests.current[id] = save; }}
          onRegisterDraft={read => { draftReaders.current[id] = read; }}
          onRegisterInputLock={lock => { inputLocks.current[id] = lock; lock?.(inputLockCount.current > 0); }}
          onOpenScope={scopeId => { if (space.text.folders.some(item => item.id === scopeId)) { setFolderId(scopeId); setPeriod('all'); } else void openDocument(scopeId); }}
          onConnectFlow={(docId, lineId) => openDetail({ kind: 'connect', docId, lineId })}
          readOnly={programDocumentContentLock(space, id) !== 'active'} disabledReason={space.documentTrash?.[id] ? '휴지통의 문서입니다. 복원하면 삭제 전 상태로 돌아갑니다.' : retainedIds.has(id) ? '판본 복구 중 보관된 내용 · 읽기 전용' : '보관한 문서입니다. 보관에서 꺼내면 이어서 쓸 수 있습니다.'}
        /></div>)}
        {selectedDoc && !selectedArchived && <ProgramRecurrence key={`${actorId}:${selectedDoc.id}`} data={data} mutate={mutate} today={today} period="documents" date={date} documentId={selectedDoc.id} onPlanApplied={focusAppliedPlan}
          presentation={recurrencePresentation.documents[selectedDoc.id] ?? { page: 0, includeHeld: false, includeExcluded: false }} onPresentationChange={value => setRecurrencePresentation(previous => ({ ...previous, documents: { ...previous.documents, [selectedDoc.id]: value } }))}
          onRegisterEditors={port => { recurrencePorts.current[selectedDoc.id] = port; }}
          onOpenSource={(id, line) => void openDocument(id, line)} onShowPeriod={(nextPeriod, nextDate) => { setDate(nextDate); setPeriod(nextPeriod); }} onUndo={props.onUndo} onRedo={props.onRedo} />}
      </div>
      <div hidden={period === 'documents'}>
        <ProgramRecurrencePlanRecovery data={data} today={today} folderId={folderId || undefined} disabled={preparingDocumentAction} onOpenSource={(id, line) => void openDocument(id, line)} />
        <div className={styles.periodHeading}><h1>{periods.find(([key]) => key === period)?.[1]}{folder ? ` · ${folder.title}` : ''}</h1>{!['all', 'undated', 'documents'].includes(period) && <div className={styles.dateNav}><button aria-label="이전 기간" onClick={() => setDate((period === 'month' ? programShiftMonth(date, -1) : programShiftDate(date, period === 'week' ? -7 : -1)) || date)}>‹</button><label>조회 날짜<input id="program-query-date" type="date" value={date} onChange={event => { if (programDate(event.target.value)) setDate(event.target.value); }} /></label><button aria-label="다음 기간" onClick={() => setDate((period === 'month' ? programShiftMonth(date, 1) : programShiftDate(date, period === 'week' ? 7 : 1)) || date)}>›</button></div>}</div>
        {range.from && range.to !== range.from && <p className={styles.muted}>{range.from} ~ {range.to}</p>}
        <form className={styles.quick} onSubmit={quickTask}><label>빠른 할 일<input name="title" required placeholder="할 일을 적으세요" maxLength={500} /></label><label>실행 날짜<input key={period + date} type="date" name="date" defaultValue={period === 'undated' ? '' : date} /></label><button>추가</button></form>
        {moving && <p role="status">옮길 행의 앞을 선택하세요. <button onClick={() => setMoving(null)}>취소</button></p>}
        {programSeriesMetadata(space).length > 0 && <div className={styles.actions}><label><input type="checkbox" checked={includeHeldOccurrences} onChange={event => setIncludeHeldOccurrences(event.target.checked)} /> 보류 회차</label><label><input type="checkbox" checked={includeExcludedOccurrences} onChange={event => setIncludeExcludedOccurrences(event.target.checked)} /> 제외 회차</label>
          <button onClick={() => void props.onUndo()}>변경 되돌리기</button><button onClick={() => void props.onRedo()}>다시 실행</button>
          {period === 'all' && <><button disabled={!occurrencePage} onClick={() => setOccurrencePage(value => value - 1)}>이전 회차 구간</button><span>회차 조회 {occurrencePage + 1}</span><button disabled={!occurrenceResult.hasMore || occurrencePage >= 128} onClick={() => setOccurrencePage(value => value + 1)}>다음 회차 구간</button>
            {occurrencePage >= 128 && occurrenceResult.hasMore && <p role="status">조회 상한에 도달했습니다. 뒤에 회차가 더 있으며, 반복이 끝난 것은 아닙니다. 위 조회 날짜를 고른 뒤 주간 목록으로 확인해 주세요.</p>}
            <button disabled={preparingDocumentAction} onClick={() => { if (Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.())) { setMessage('회차 날짜를 적용하거나 취소한 뒤 기간을 바꿔 주세요.'); return; } setPeriod('week'); }}>조회 날짜의 주간 보기</button></>}
          {period === 'today' && <><span>미완료 회차 조회: 지난 {28 * (occurrencePage + 1)}일 · 원래 날짜 유지</span><button disabled={!occurrenceResult.hasMore || occurrencePage >= 128} onClick={() => setOccurrencePage(value => value + 1)}>더 이전 회차 확인</button>{occurrencePage >= 128 && occurrenceResult.hasMore && <span>이전 전체를 확인한 것은 아닙니다. 더 오래된 회차는 원문에서 확인해 주세요.</span>}</>}
        </div>}
        {occurrenceResult.issues.some(issue => issue !== 'query-window-limit') && <p role="alert">원본이 바뀌었거나 안전하게 연결하지 못한 회차는 보관 중입니다. 원문에서 확인해 주세요.</p>}
        {occurrenceResult.issues.includes('query-window-limit') && <p role="alert">조회 가능한 회차 범위를 넘었습니다. 표시된 목록이 전체는 아니며, 원문과 기존 기록은 보존했습니다.</p>}
        {occurrenceResult.pendingStarts.map(entry => <p role="status" key={entry.itemRef}>{entry.title} · {entry.reason === 'anchor-required' ? '내 기준일' : '내 시작일'} 미정
          <button type="button" onClick={() => void openDocument(entry.documentId, entry.lineId)}>사본에서 날짜 정하기</button></p>)}
        {!executionRows.length && <p className={styles.empty}>이 보기에 할 일이 없습니다. 날짜나 폴더를 바꾸거나 새 할 일을 적어보세요.</p>}
        <ul className={styles.tasks}>{executionRows.map(entry => {
          if (entry.kind === 'occurrence') return <li key={entry.key} onKeyDown={event => { if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); moveExecutionStep(entry.key, event.key === 'ArrowUp' ? -1 : 1); } }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const from = event.dataTransfer.getData('text/plain'); if (from && (moving === from || nativeDrag.current === from)) void moveBefore(from, entry.key); nativeDrag.current = null; }}>
            {period === 'today' && entry.row.executionDate && entry.row.executionDate < date && <small>계속할 회차</small>}
            <div className={styles.actions}><button onClick={() => moveExecutionStep(entry.key, -1)}>같은 날짜에서 위로</button><button onClick={() => moveExecutionStep(entry.key, 1)}>같은 날짜에서 아래로</button>{moving && <button onClick={() => void moveBefore(moving, entry.key)}>이 회차 앞에 놓기</button>}</div>
            <ProgramRecurrence data={data} mutate={mutate} today={today} period={period} date={date} row={entry.row} onPlanApplied={focusAppliedPlan} onRegisterEditors={port => { recurrencePorts.current[entry.row.key] = port; }}
            onOpenSource={(id, line) => void openDocument(id, line)} onShowPeriod={(nextPeriod, nextDate) => { setDate(nextDate); setPeriod(nextPeriod); }} onUndo={props.onUndo} onRedo={props.onRedo} /></li>;
          const task = entry.task;
          const progress = M.latestProgress(space.text, task.id), value = progress?.percent ?? (task.done ? 100 : 0);
          return <li key={entry.key} className={styles.task} data-task-id={task.id} draggable onDragStart={event => { event.dataTransfer.setData('text/plain', entry.key); nativeDrag.current = entry.key; }} onDragEnd={() => { nativeDrag.current = null; setMoving(null); }}
            onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const from = event.dataTransfer.getData('text/plain'); if (from && (moving === from || nativeDrag.current === from)) void moveBefore(from, entry.key); nativeDrag.current = null; }}
            onKeyDown={event => { if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); moveStep(task, event.key === 'ArrowUp' ? -1 : 1); } }}>
            <button className={styles.check} aria-label={`${task.title} ${value === 100 ? '다시 열기' : '완료'}`} aria-pressed={value === 100} onClick={() => void run(value === 100 ? '다시 열기' : '완료', current => completeProgramTask(current, { ...base(current), taskId: task.id, date: today, done: value !== 100 }))}>{value === 100 ? '✓' : value ? `${value}%` : '○'}</button>
            <button className={styles.taskTitle} onClick={() => moving ? void moveBefore(moving, entry.key) : void openDocument(task.docId, task.id)}>{task.title}<small>{period === 'today' && programIsContinuingTask(task, date) ? '계속할 일 · ' : ''}{task.date ?? '날짜 미정'} · {task.docTitle}</small></button>
            <button aria-label={`${task.title} 작업`} onClick={event => { if (suppressPointerClick.current === task.id && event.detail !== 0) { suppressPointerClick.current = null; return; } setRecordDate(today); setPercent(String(value)); openDetail({ kind: 'task', id: task.id }); }}
              onPointerDown={event => { suppressPointerClick.current = null; if (event.pointerType !== 'touch') return; cancelHold(); holdPoint.current = { x: event.clientX, y: event.clientY }; hold.current = setTimeout(() => { setMoving(entry.key); suppressPointerClick.current = task.id; hold.current = null; }, 500); }}
              onPointerUp={cancelHold} onPointerCancel={() => { cancelHold(); suppressPointerClick.current = task.id; setMoving(null); }} onPointerMove={event => { if (holdPoint.current && Math.hypot(event.clientX - holdPoint.current.x, event.clientY - holdPoint.current.y) > 10) { cancelHold(); suppressPointerClick.current = task.id; } }}>…</button>
          </li>;
        })}</ul>
      </div>
    </div>
    <dialog ref={dialog} className={styles.dialog} onCancel={event => { event.preventDefault(); close(); }}><div className={styles.dialogHeading}><h2>{detail?.kind === 'task' ? detailTask?.title ?? '할 일을 찾을 수 없습니다' : detail?.kind === 'folder' ? '폴더 정리' : '기존 할 일 연결'}</h2><button onClick={close} aria-label="닫기">닫기</button></div>
      {message && <p role="alert" className={styles.error}>{message}</p>}
      {detail?.kind === 'task' && detailTask && <>
        <form onSubmit={event => { event.preventDefault(); void dateMove(detailTask.id, executionDateDraft || null); }}><label className={styles.field}>실행 날짜<input type="date" value={executionDateDraft} onChange={event => setExecutionDateDraft(event.target.value)} /></label><button>날짜 적용</button></form><div className={styles.actions}><button onClick={() => void dateMove(detailTask.id, today)}>오늘로 이동</button><button onClick={() => void dateMove(detailTask.id, programShiftDate(today, 1))}>내일로 이어하기</button><button onClick={() => void dateMove(detailTask.id, null)}>날짜 미정으로 이동</button></div>
        <form onSubmit={async event => { event.preventDefault(); const result = await run('진행 기록', current => recordProgramTaskProgress(current, { ...base(current), taskId: detailTask.id, date: recordDate, percent: Number(percent) })); if (result.ok) setMessage('해당 날짜의 누적 진행을 저장했습니다.'); }}><h3>날짜별 진행</h3><label>기록 날짜<input type="date" value={recordDate} onChange={event => setRecordDate(event.target.value)} required /></label><label>누적 진행 (%)<input type="number" min={0} max={100} value={percent} onChange={event => setPercent(event.target.value)} required /></label><button>진행 기록</button></form>
        <ul>{M.progressHistory(space.text, detailTask.id).map(record => <li key={record.date}><button onClick={() => { setRecordDate(record.date); setPercent(String(record.percent)); }}>{record.date} · {record.percent}%</button></li>)}</ul>
        {period !== 'documents' && <div className={styles.actions}><button onClick={() => moveStep(detailTask, -1)}>같은 날짜에서 위로</button><button onClick={() => moveStep(detailTask, 1)}>같은 날짜에서 아래로</button></div>}
        <label className={styles.field}>다른 문서에 연결<select defaultValue="" onChange={async event => { const docId = event.target.value; if (!docId) return; await run('같은 할 일 연결', current => linkProgramTask(current, { ...base(current), documentId: docId, taskId: detailTask.id })); }}><option value="">문서 선택</option>{space.text.documents.filter(doc => doc.id !== detailTask.docId && !space.archivedDocumentIds.includes(doc.id)).map(doc => <option key={doc.id} value={doc.id}>{doc.title}</option>)}</select></label>
        <ProgramTaskDocumentMove key={detailTask.id} data={data} taskId={detailTask.id} disabled={preparingDocumentAction} onMove={(destinationId, expectedSpace) => moveTaskDocument(detailTask.id, destinationId, expectedSpace)} onOpen={(documentId, taskId) => { close(); void openDocument(documentId, taskId); }} />
      </>}
      {detail?.kind === 'folder' && <>
        <form onSubmit={async event => { event.preventDefault(); const title = String(new FormData(event.currentTarget).get('title') ?? ''); await run('폴더 이름 변경', current => renameProgramFolder(current, { ...base(current), folderId: detail.id, title })); }}><label>폴더 이름<input key={detail.id} name="title" defaultValue={space.text.folders.find(item => item.id === detail.id)?.title} required /></label><button>이름 변경</button></form>
        <label className={styles.field}>상위 폴더<select value={space.text.folders.find(item => item.id === detail.id)?.parentId ?? ''} onChange={event => { const parentId = event.target.value || null; void run('폴더 이동', current => moveProgramFolder(current, { ...base(current), folderId: detail.id, parentId })); }}><option value="">최상위</option>{folderOptions.filter(item => item.id !== detail.id).map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
        <p>폴더를 삭제해도 문서와 할 일은 미분류에 남습니다. 하위 폴더는 최상위로 옮겨집니다.</p><button onClick={async () => { const result = await run('폴더 삭제', current => deleteProgramFolder(current, { ...base(current), folderId: detail.id })); if (result.ok) { setFolderId('folder-unfiled'); close(); } }}>폴더만 삭제</button>
      </>}
      {detail?.kind === 'connect' && <ul className={styles.connect}>{allTasks.filter(task => task.docId !== detail.docId).map(task => <li key={task.id}><button onClick={async () => { const result = await run('같은 할 일 연결', current => linkProgramTask(current, { ...base(current), documentId: detail.docId, lineId: detail.lineId, taskId: task.id })); if (result.ok) close(); }}>{task.title}<small>{task.docTitle}</small></button></li>)}</ul>}
    </dialog>
  </section>;
}
