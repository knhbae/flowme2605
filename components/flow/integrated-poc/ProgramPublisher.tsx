'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { restoreProgramDialogFocus } from '@/lib/flow/integrated-poc/dialog-return-focus';
import { programClone, programFailure, programResult, type ProgramData, type ProgramPublicationDraft, type ProgramPublicationDraftRow } from '@/lib/flow/integrated-poc/contract';
import { numberGwa } from '@/lib/flow/integrated-poc/number-particle';
import { canPublishProgramSchedule } from '@/lib/flow/integrated-poc/program-data';
import { programSame } from '@/lib/flow/integrated-poc/controller';
import type { ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import { textWorkspaceModel as M } from '@/lib/flow/integrated-poc/text-workspace';
import { programErrorMessage, type ProgramMutate, type ProgramNavigate } from '@/lib/flow/integrated-poc/ui-contract';
import { programRecurringScheduleFromDraft, programRecurringScheduleLabel } from '@/lib/flow/integrated-poc/public-recurrence-contract';
import { programPublicationSeriesSourcesCurrent, programPublicationSeriesSubchecks, inspectProgramPublicationSeries, applyProgramPublicationSeriesReview, type ProgramPublicationSeriesReview } from '@/lib/flow/integrated-poc/publication-series-draft';
import { readProgramPublicationSeries } from '@/lib/flow/integrated-poc/publication-series-source';
import { ProgramPublicationRecurrence } from './ProgramPublicationRecurrence';
import { hasProgramOrdinaryPublicationSource, inspectProgramPublicationSource, applyProgramPublicationSource, type ProgramPublicationSourceReview, type ProgramPublicationSourceField } from '@/lib/flow/integrated-poc/publication-ordinary-source';
import { ProgramPublicationSourceReviewPanel } from './ProgramPublicationSourceReview';
import { ProgramPublicationTiming } from './ProgramPublicationTiming';
import { programOrdinaryTimingLabel } from '@/lib/flow/integrated-poc/public-ordinary-time';
import { ProgramShareLink } from './ProgramShareLink';
import { planProgramPublicationAnchor, programAnchorChip, programPublicationRowDates, programPublicationTakerPreview, restoreProgramPublicationAnchor,
  type ProgramAnchorUndo } from '@/lib/flow/integrated-poc/publication-anchor';
import { readProgramRepeatMarker, programRepeatLabel } from '@/lib/flow/integrated-poc/repeat-line';
import { programCalendarDate, programDateLabel } from '@/lib/flow/integrated-poc/date-label';
import { applyProgramPublicationStepDates, captureProgramPublicationStepInput, composeProgramPublicationSummary, programPublicationDateExample, programPublicationExposure, programPublicationSavedSchedules, programPublicationStepNativeValue, programPublicationSummaryParts, type ProgramPublicationDateMode, type ProgramPublicationStep } from '@/lib/flow/integrated-poc/publication-steps';
import { ProgramPublicationPick, ProgramPublicationPreviewCard } from './ProgramPublicationSteps';
import styles from './ProgramPublisher.module.css';
import { fullRowText, canRepublishProgramDocument, createProgramRepublishDraft, programPublicationRepublishSource } from '@/lib/flow/integrated-poc/publication-editor';

export type ProgramPublisherProps = { data: ProgramData; mutate: ProgramMutate; navigate: ProgramNavigate; documentId: string; onClose: () => void; today: string; storageScope?: 'local' | 'account'; readCurrentData?: () => ProgramData | null; externalRecovery?: React.ReactNode; onRegisterEditors?: (port: ProgramEditorFlush | null) => void };
import { publicationDraftAt, programPublicationRecoveryText, createProgramPublicationEditorPort, resolveProgramPrivatePublicationDraft, sameFingerprint, publicId, documentFingerprint, createProgramPublicationDraft, saveProgramPublicationDraft, programPublicationInput, publishProgramDocument, compareProgramPublication, resolveProgramPublicationComparison, archiveProgramPublication, type PublicationComparison, type PublicationConflictChoices } from '@/lib/flow/integrated-poc/publication-editor';
export * from '@/lib/flow/integrated-poc/publication-editor';
const same = programSame;

export function PublicationConflictReview({ comparison, choices, disabled, onChoice, onApply, onCancel }: { comparison: PublicationComparison; choices: PublicationConflictChoices; disabled: boolean; onChoice: (key: string, choice: 'draft' | 'latest') => void; onApply: () => void; onCancel: () => void }) {
  const remaining = comparison.fields.filter(field => !choices[field.key]).length;
  return <section className={styles.comparison} aria-label="최신 공개 버전과 초안 비교"><h3>버전 {comparison.latestNumber}{numberGwa(comparison.latestNumber)} 비교</h3><p>다른 필드마다 유지할 내용을 골라 주세요. 선택은 공개하지 않고 초안에만 반영합니다.</p>
    {comparison.fields.map(field => <fieldset key={field.key} disabled={disabled}><legend>{field.label}</legend><div className={styles.compareValues}>
      <label><strong>내 공개 초안</strong><pre>{field.draftText}</pre><span><input type="radio" name={`resolve-${field.key}`} checked={choices[field.key] === 'draft'} onChange={() => onChoice(field.key, 'draft')} />초안 유지</span></label>
      <label><strong>최신 공개 버전</strong><pre>{field.latestText}</pre><span><input type="radio" name={`resolve-${field.key}`} checked={choices[field.key] === 'latest'} onChange={() => onChoice(field.key, 'latest')} />최신 내용 선택</span></label>
    </div></fieldset>)}
    {!comparison.fields.length && <p>공개할 필드의 차이는 없습니다. 확인한 최신 버전만 초안의 기준으로 연결합니다.</p>}<p role="status">{remaining ? `${remaining}개 차이를 더 선택해 주세요.` : '모든 차이를 선택했습니다. 공개 전 미리보기에서 다시 확인할 수 있습니다.'}</p>
    <button type="button" disabled={disabled || remaining > 0} onClick={onApply}>선택한 내용으로 초안 갱신</button><button type="button" disabled={disabled} onClick={onCancel}>비교 취소 · 초안 유지</button>
  </section>;
}

export function ProgramPublisher({ data, mutate, navigate, documentId, onClose, onRegisterEditors, externalRecovery, storageScope = 'local', readCurrentData, today }: ProgramPublisherProps) {
  const actorId = useRef(data.activeActorId).current; const dataRef = useRef(data); dataRef.current = data;
  const [draft, setDraft] = useState(() => createProgramPublicationDraft(data, documentId, new Date().toISOString()));
  const [republishing, setRepublishing] = useState(() => {
    const saved = publicationDraftAt(data, data.activeActorId, documentId);
    return !!saved?.flowId && data.public.flows.some(flow => flow.id === saved.flowId && flow.archived);
  });
  const [republished, setRepublished] = useState<{ flowId: string; versionId: string } | null>(null);
  const draftRef = useRef(draft); draftRef.current = draft;
  const savedRef = useRef(data.spaces[actorId]?.publicationDrafts.find(row => row.documentId === documentId) ?? null);
  const flight = useRef<Promise<boolean> | null>(null); const [saving, setSaving] = useState(false); const [publishing, setPublishing] = useState(false);
  const publishingRef = useRef(false); const [message, setMessage] = useState(''); const [step, setStep] = useState<ProgramPublicationStep>('pick'); const [discarding, setDiscarding] = useState(false);
  const preview = step === 'preview';
  const setPreview = (value: boolean) => setStep(previous => value ? 'preview' : previous === 'preview' ? 'refine' : previous);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const itemHeading = useRef<HTMLHeadingElement>(null);
  const itemOpener = useRef<HTMLButtonElement | null>(null);
  const itemWasOpen = useRef(false);
  const [dateOptions, setDateOptions] = useState(false);
  // A saved selected undated schedule may be an explicit choice. Preserve it,
  // but let previously unselected tasks receive the automatic date conversion.
  const savedSchedules = useRef(programPublicationSavedSchedules(publicationDraftAt(data, data.activeActorId, documentId)?.rows ?? (draft?.flowId ? draft.rows : [])));
  const manuallySetSchedules = useRef(new Set<string>());
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const [comparison, setComparison] = useState<PublicationComparison | null>(null), [choices, setChoices] = useState<PublicationConflictChoices>({});
  const [archiveTarget, setArchiveTarget] = useState<{ flowId: string; versionId: string; title: string } | null>(null);
  const [seriesReview, setSeriesReview] = useState<ProgramPublicationSeriesReview | null>(null);
  const [seriesKeys, setSeriesKeys] = useState<string[]>([]);
  const seriesOpener = useRef<HTMLButtonElement>(null);
  const [sourceReview, setSourceReview] = useState<ProgramPublicationSourceReview | null>(null);
  const [sourceFields, setSourceFields] = useState<ProgramPublicationSourceField[]>([]);
  const sourceOpener = useRef<HTMLButtonElement | null>(null);
  const restoreSourceFocus = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null); const opener = useRef<HTMLElement | null>(null);
  const [published, setPublished] = useState<{ flowId: string; versionId: string; title: string } | null>(null);
  const leavePublished = (view: boolean) => {
    const done = published; if (!done) return;
    dialog.current?.close(); onClose();
    if (view) navigate({ view: 'flow', id: done.flowId, versionId: done.versionId }); else restoreProgramDialogFocus(opener.current);
  };
  const recovery = useRef<HTMLDetailsElement>(null);
  const composing = useRef(new Set<EventTarget>()), locks = useRef(0); const [locked, setLocked] = useState(false);
  const [privateComparison, setPrivateComparison] = useState<{ stored: ProgramPublicationDraft | null } | null>(null);
  const setCurrent = (next: ProgramPublicationDraft) => { draftRef.current = next; setDraft(next); setMessage(''); };
  const textInputs = () => Array.from(dialog.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-publication-field]') ?? []);
  const read = () => draftRef.current ? captureProgramPublicationStepInput(draftRef.current, textInputs().filter(element => element.type !== 'date').map(element => ({
    field: element.dataset.publicationField ?? '', itemId: element.closest<HTMLElement>('[data-publication-item]')?.dataset.publicationItem, value: element.value,
  }))) : null;
  const syncReadonly = () => {
    const blocked = locks.current > 0 || publishingRef.current;
    // Text readOnly is owned here, not by a JSX prop that can terminate native IME.
    // All non-composing fields lock synchronously, before any awaited work.
    for (const element of textInputs()) if (!composing.current.has(element)) element.readOnly = blocked;
    dialog.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[type="checkbox"],select').forEach(element => { element.disabled = blocked; });
  };
  const lockInput = () => {
    locks.current++; setLocked(true); syncReadonly(); let released = false;
    return () => { if (released) return; released = true; locks.current--; setLocked(locks.current > 0); syncReadonly(); };
  };
  const save = (): Promise<boolean> => {
    if (composing.current.size) return Promise.resolve(false);
    if (flight.current) return flight.current;
    const work = async () => {
      setSaving(true);
      try {
        while (read() && !same(savedRef.current, read())) {
          if (composing.current.size) return false;
          const snapshot = programClone(read()!); const expected = savedRef.current;
          if (!same(snapshot, draftRef.current)) { snapshot.updatedAt = new Date().toISOString(); setCurrent(snapshot); }
          const result = await mutate('공개 초안 저장', current => saveProgramPublicationDraft(current, actorId, snapshot, expected), { history: false, alphaSocial: { type: 'publication-save', draft: snapshot, expected } });
          if (!result.ok) { setMessage(programErrorMessage(result.reason)); return false; }
          savedRef.current = snapshot;
        }
        return true;
      } catch { setMessage('초안을 저장하지 못했습니다. 입력은 유지했습니다. 다시 저장한 뒤 닫아 주세요.'); return false; }
      finally { setSaving(false); }
    };
    const pending = work(); flight.current = pending; void pending.finally(() => { if (flight.current === pending) flight.current = null; }); return pending;
  };
  const edit = (patch: Partial<ProgramPublicationDraft>) => {
    if (!draftRef.current || publishingRef.current || locks.current && !composing.current.size) return;
    setCurrent({ ...draftRef.current, ...patch, updatedAt: new Date().toISOString() }); setPreview(false); setComparison(null); setChoices({});
    if (!composing.current.size) void save();
  };
  const editRow = (itemId: string, patch: Partial<ProgramPublicationDraftRow>) => {
    if (!draftRef.current || publishingRef.current || locks.current && !composing.current.size) return;
    if ('scheduleKind' in patch || 'scheduleValue' in patch || 'recurrence' in patch) { manuallySetSchedules.current.add(itemId); savedSchedules.current.delete(itemId); }
    edit({ rows: draftRef.current.rows.map(row => row.itemId === itemId ? { ...row, ...patch } : row) });
  };
  // Flow pipeline S7 (11/8): '날짜를 기준일 기준으로'. Which day is the 기준일, its name (kept in the summary's first line),
  // what [원래대로] puts back, and the day a taker picks in the preview. Screen state; the draft keeps only its rows/summary.
  const [anchorMode, setAnchorMode] = useState<ProgramPublicationDateMode>('first');
  const anchorName = programPublicationSummaryParts(draft?.summary ?? '').name;
  const dateExample = draft ? programPublicationDateExample(draft) : null;
  const [anchorUndo, setAnchorUndo] = useState<ProgramAnchorUndo | null>(null);
  const [anchorNote, setAnchorNote] = useState('');
  const [takerDate, setTakerDate] = useState(today);
  /** A change made here (not typed): into the native fields too, so a save reading them keeps it (as resolvePrivate does). */
  const commitDraft = (next: ProgramPublicationDraft) => {
    for (const element of textInputs()) {
      const field = element.dataset.publicationField ?? '', itemId = element.closest<HTMLElement>('[data-publication-item]')?.dataset.publicationItem;
      const value = programPublicationStepNativeValue(next, field, itemId);
      if (value !== undefined) element.value = value;
    }
    setCurrent({ ...next, updatedAt: new Date().toISOString() }); setPreview(false); setComparison(null); setChoices({}); void save();
  };
  const chooseDates = (mode: ProgramPublicationDateMode, enterRefine = false) => {
    if (unavailable() || !space) return; const current = read(); if (!current) return;
    const applied = applyProgramPublicationStepDates(current, programPublicationRowDates(space.text, documentId), mode, anchorUndo, new Set([...savedSchedules.current, ...manuallySetSchedules.current]), savedSchedules.current);
    commitDraft(applied.draft); setAnchorUndo(applied.undo); setAnchorMode(mode);
    if (applied.plan.anchor) setTakerDate(applied.plan.anchor);
    setAnchorNote(mode === 'none' ? '문서에서 가져온 날짜는 미정으로 둡니다.' : applied.plan.rows.length ? '문서 날짜를 기준일과의 간격으로 바꿨습니다.' : '바꿀 문서 날짜가 없습니다.');
    if (enterRefine) setStep('refine');
  };
  const unavailable = () => publishingRef.current || locks.current > 0 || composing.current.size > 0;
  const beginAction = () => { publishingRef.current = true; setPublishing(true); syncReadonly(); };
  const endAction = () => { publishingRef.current = false; setPublishing(false); syncReadonly(); };
  const close = async () => {
    if (unavailable()) return;
    beginAction();
    try { if (await save()) { dialog.current?.close(); onClose(); restoreProgramDialogFocus(opener.current); } } finally { endAction(); }
  };
  const port = createProgramPublicationEditorPort({ actorId, documentId, read, saved: () => savedRef.current,
    composing: () => composing.current.size > 0, busy: () => publishingRef.current, save, lock: lockInput, handlesPrivateConflict: true });
  const portRef = useRef(port); portRef.current = port;
  useEffect(() => {
    onRegisterEditors?.({ flushAll: () => portRef.current.flushAll(), lockInput: () => portRef.current.lockInput(),
      acceptConfirmedSocialDrafts: next => {
        if (next.activeActorId !== actorId || composing.current.size || flight.current || publishingRef.current || locks.current) return false;
        const value = read(), stored = value && next.spaces[actorId]?.publicationDrafts.find(entry => entry.id === value.id);
        if (!value || !stored || !same(value, stored) || same(savedRef.current, stored)) return false;
        savedRef.current = programClone(stored); setMessage(''); return true;
      },
      hasPendingInput: () => portRef.current.hasPendingInput!(), pendingDocumentIds: () => portRef.current.pendingDocumentIds!(),
      captureDrafts: () => portRef.current.captureDrafts!(), captureSocialDrafts: () => portRef.current.captureSocialDrafts!(), blocksExternalSnapshot: (before, next) => portRef.current.blocksExternalSnapshot!(before, next) });
    return () => onRegisterEditors?.(null);
  }, [onRegisterEditors]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (portRef.current.hasPendingInput?.()) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, []);
  useEffect(() => { syncReadonly(); });
  const keepInput = () => {
    const captured = read(); if (!captured) return;
    try {
      const url = URL.createObjectURL(new Blob([programPublicationRecoveryText(captured)], { type: 'text/plain;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'FlowMe-공개초안-입력.txt'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('공개 초안 입력의 TXT 받기를 요청했습니다. 공개하거나 입력을 지우지 않았습니다.');
    } catch { setMessage('파일 받기를 시작하지 못했습니다. 공개 입력을 직접 복사해 보관해 주세요.'); }
  };
  useEffect(() => {
    opener.current = document.activeElement as HTMLElement;
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    void save();
    return () => { restoreProgramDialogFocus(opener.current); };
    // This component is keyed by actor/document in the owning shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const discard = async () => {
    if (unavailable() || !draftRef.current) return;
    beginAction();
    try {
    if (!await save()) return;
    const target = draftRef.current;
    const result = await mutate('공개 초안 버리기', current => {
      if (current.activeActorId !== actorId || !same(current.spaces[actorId]?.publicationDrafts.find(row => row.id === target.id), savedRef.current)) return programFailure(current, 'conflict');
      const next = programClone(current); next.spaces[actorId].publicationDrafts = next.spaces[actorId].publicationDrafts.filter(row => row.id !== target.id);
      return programResult(current, next, target.id);
    }, { history: false, alphaSocial: { type: 'publication-discard', draftId: target.id, expected: target } });
    if (!result.ok) { setMessage(programErrorMessage(result.reason)); return; }
    dialog.current?.close(); onClose(); restoreProgramDialogFocus(opener.current);
    } catch { setMessage('초안을 지우지 못했습니다. 현재 입력은 유지했습니다.'); }
    finally { endAction(); }
  };
  const publish = async () => {
    if (unavailable() || !draftRef.current) return;
    beginAction();
    try {
      if (!await save()) return;
      const submitted = programClone(draftRef.current);
      let publishedFlowId: string | undefined;
      const result = await mutate(republishing ? '새 링크로 공개' : storageScope === 'account' ? submitted.flowId ? '새 버전 공개' : '선택 내용 공개' : submitted.flowId ? '새 버전 공개' : '선택 내용 공개', current => {
        const transition = publishProgramDocument(current, actorId, submitted, new Date().toISOString());
        if (transition.ok) publishedFlowId = transition.data.public.versions.find(row => row.id === transition.result)?.flowId;
        return transition;
      }, { history: false, alphaSocial: { type: 'publication-submit', draft: submitted } });
      if (!result.ok) { setMessage(programErrorMessage(result.reason)); return; }
      if (result.presentationPending) { setMessage(programErrorMessage('presentation-pending')); return; }
      const version = (readCurrentData?.() ?? dataRef.current).public.versions.find(row => row.id === result.result);
      // C9 × FC5: a republish keeps C9's own panel (its link button is added there); any other account publish shows
      // FC5's "공개했습니다" panel; a local publish closes and goes to the Flow as before.
      if (republishing) {
        const flowId = result.flowId ?? version?.flowId ?? publishedFlowId;
        if (!flowId) { setMessage('새 공개 링크를 확인하지 못했습니다. 입력을 유지했습니다. 현재 상태를 다시 확인해 주세요.'); return; }
        setRepublished({ flowId, versionId: result.result }); setMessage(''); return;
      }
      const flowId = result.flowId ?? version?.flowId ?? (storageScope === 'local' ? publishedFlowId : undefined) ?? submitted.flowId ?? undefined;
      // FC5 (UX 13): the account dialog stays open on a "공개했습니다" panel with the link, instead of closing at once.
      if (flowId) { setPublished({ flowId, versionId: result.result, title: version?.title ?? submitted.title }); return; }
      dialog.current?.close(); onClose(); navigate({ view: 'flow', id: flowId, ...(storageScope === 'account' ? { versionId: result.result } : {}) });
    } catch { setMessage('공개 결과를 확인하지 못했습니다. 초안과 요청 번호를 유지합니다. 최신 목록을 확인한 뒤 다시 시도해 주세요.'); }
    finally { endAction(); }
  };
  const space = data.spaces[actorId]; const originalRows = space ? M.rowMeta(space.text, documentId) : [];
  // S7: the rows' own dates, and what [바꾸기] would do now (from before an earlier 바꾸기, so pressing again re-applies).
  const rowDates = useMemo(() => space ? programPublicationRowDates(space.text, documentId) : new Map<string, string>(), [space?.text, documentId]);
  const seriesRead = useMemo(() => space ? readProgramPublicationSeries(space, documentId) : null, [space, documentId]);
  const hasSeries = !!seriesRead?.ok && seriesRead.candidates.length > 0;
  const anchorPlan = draft ? planProgramPublicationAnchor(anchorUndo ? restoreProgramPublicationAnchor(draft, anchorUndo).draft : draft, rowDates, anchorMode === 'last' ? 'last' : 'first') : null;
  const scheduleChip = (row: ProgramPublicationDraftRow) => {
    const marker = readProgramRepeatMarker(row.title.trim());
    if (row.scheduleKind === 'recurring' && row.recurrence) { const rule = programRecurringScheduleFromDraft(row.recurrence); return { text: `↻ ${rule ? programRecurringScheduleLabel(rule).split(' · ')[0] : '반복'}`, kind: 'repeat' }; }
    if (marker && row.scheduleKind === 'undated') return { text: `↻ ${programRepeatLabel(marker.rule)}`, kind: 'repeat' };
    if (row.scheduleKind === 'relative' && /^[+-]?\d+$/.test(row.scheduleValue)) return { text: programAnchorChip(anchorName, Number(row.scheduleValue)), kind: 'relative' };
    if (row.scheduleKind === 'fixed' && row.scheduleValue) return { text: programCalendarDate(row.scheduleValue, today), kind: 'fixed' };
    return { text: '날짜 미정', kind: 'undated' };
  };
  const currentFlow = draft?.flowId ? data.public.flows.find(row => row.id === draft.flowId) : undefined;
  const republishSource = draft ? programPublicationRepublishSource(data, actorId, draft) : null;
  const canRepublish = !!republishSource && canRepublishProgramDocument(data, actorId, documentId);
  const republishBlocked = !!currentFlow?.archived && (!republishing || !canRepublish);
  const input = draft ? programPublicationInput(draft, actorId, { newFlow: republishing && !!currentFlow?.archived }) : null;
  const startRepublishing = () => {
    if (unavailable()) return; const current = read(); if (!current?.flowId) return;
    const next = createProgramRepublishDraft(dataRef.current, documentId, current.flowId, new Date().toISOString(), current);
    if (!next) { setMessage('이 문서의 공개 연결이 바뀌었습니다. 입력은 유지했습니다. 현재 공개 상태를 다시 확인해 주세요.'); return; }
    setCurrent(next); setRepublishing(true); setPreview(false);
  };
  const sourceChanged = !!draft && !sameFingerprint(documentFingerprint(data, actorId, documentId), draft.sourceDocumentFingerprint);
  const seriesChanged = !!draft && !programPublicationSeriesSourcesCurrent(data, actorId, draft);
  const versionChanged = !!draft?.flowId && currentFlow?.currentVersionId !== draft.expectedVersionId;
  const storedDraft = publicationDraftAt(data, actorId, documentId);
  const privateChanged = !same(savedRef.current, storedDraft);
  const resolvePrivate = async (choice: 'mine' | 'stored') => {
    if (unavailable() || !privateComparison || !draftRef.current) return;
    const expected = programClone(privateComparison.stored), mine = programClone(read()!);
    beginAction();
    try {
      if (flight.current) await flight.current;
      let resolved: ProgramPublicationDraft | null = null;
      const result = await mutate('다른 탭 공개 초안 비교 확인', current => {
        const transition = resolveProgramPrivatePublicationDraft(current, actorId, mine, expected, choice);
        if (transition.ok) resolved = choice === 'mine' ? mine : createProgramPublicationDraft(current, documentId, new Date().toISOString());
        return transition;
      }, { history: false, alphaSocial: { type: 'publication-private-resolve', draft: mine, expected, choice } });
      if (!result.ok || !resolved) { setMessage('비교한 뒤 저장 상태가 다시 바뀌었거나 공개 연결이 달라졌습니다. 입력을 유지했습니다. 최신 초안을 다시 비교해 주세요.'); return; }
      const next = resolved as ProgramPublicationDraft;
      savedRef.current = choice === 'mine' ? mine : expected;
      // Install the explicit choice into native inputs as well as React state.
      for (const element of textInputs()) {
        const field = element.dataset.publicationField ?? '', itemId = element.closest<HTMLElement>('[data-publication-item]')?.dataset.publicationItem;
      const value = programPublicationStepNativeValue(next, field, itemId);
        if (value !== undefined) element.value = value;
      }
      savedSchedules.current = programPublicationSavedSchedules(next.rows); manuallySetSchedules.current.clear();
      setCurrent(next); setAnchorUndo(null); setPrivateComparison(null); setComparison(null); setChoices({}); setPreview(false);
      setMessage(choice === 'mine' ? '내 입력으로 비공개 초안을 저장했습니다. 공개 버전은 바꾸지 않았습니다.' : '확인한 저장 초안을 열었습니다. 공개 버전은 바꾸지 않았습니다.');
    } catch { setMessage('비교 선택을 저장하지 못했습니다. 내 입력과 비교 내용을 유지했습니다.'); }
    finally { endAction(); }
  };
  const acknowledgeSource = () => {
    if (!draft || !space) return;
    const fingerprint = documentFingerprint(data, actorId, documentId); if (fingerprint === null) return;
    if (fingerprint !== documentFingerprint(dataRef.current, actorId, documentId)) { setMessage(programErrorMessage('conflict')); return; }
    edit({ sourceDocumentFingerprint: fingerprint });
    setMessage('개인 문서 변경을 확인했습니다. 공개 초안과 공개 버전 기준은 그대로 유지했습니다.');
  };
  const startComparison = () => {
    if (!draftRef.current || unavailable()) return;
    const next = compareProgramPublication(dataRef.current, actorId, draftRef.current);
    if (!next) { setMessage(programErrorMessage('conflict')); return; }
    setComparison(next); setChoices({}); setPreview(false); setMessage('');
  };
  const applyComparison = async () => {
    if (!comparison || !draftRef.current || unavailable()) return;
    beginAction();
    try {
      if (!await save()) return;
      const submitted = programClone(draftRef.current); let updated: ProgramPublicationDraft | undefined;
      const result = await mutate('공개 버전 비교를 초안에 반영', current => {
        const transition = resolveProgramPublicationComparison(current, actorId, submitted, comparison, choices, new Date().toISOString());
        if (transition.ok) updated = transition.data.spaces[actorId].publicationDrafts.find(row => row.id === submitted.id);
        return transition;
      }, { history: false, alphaSocial: { type: 'publication-resolve', draft: submitted, choices, expectedVersionId: comparison.latestVersionId } });
      if (result.ok && result.presentationPending) { setMessage(programErrorMessage('presentation-pending')); return; }
      if (result.ok && storageScope === 'account') updated = readCurrentData?.()?.spaces[actorId]?.publicationDrafts.find(row => row.id === submitted.id);
      if (!result.ok || !updated) { setMessage(programErrorMessage(result.ok ? 'missing' : result.reason)); return; }
      savedSchedules.current = programPublicationSavedSchedules(updated.rows); manuallySetSchedules.current.clear(); setAnchorUndo(null);
      savedRef.current = updated; setCurrent(updated); setComparison(null); setChoices({}); setPreview(false); setMessage('선택한 내용을 초안에 저장했습니다. 공개 미리보기에서 결과를 확인해 주세요.');
    } catch { setMessage('비교 결과를 저장하지 못했습니다. 초안과 선택을 유지했습니다.'); }
    finally { endAction(); }
  };
  const archive = async () => {
    if (!archiveTarget || unavailable()) return;
    beginAction();
    try {
      if (!await save()) return;
      const result = await mutate('공개 목록에서 내리기', current => archiveProgramPublication(current, actorId, documentId, archiveTarget.flowId, archiveTarget.versionId), { history: false, alphaSocial: { type: 'publication-archive', documentId, flowId: archiveTarget.flowId, expectedVersionId: archiveTarget.versionId } });
      if (!result.ok) { setMessage(programErrorMessage(result.reason)); return; }
      setArchiveTarget(null); setComparison(null); setPreview(false); setMessage('공개 목록에서 내렸습니다. 기존 버전·개인 사본·작성 중인 초안은 그대로 보관했습니다.');
    } catch { setMessage('공개 철회 결과를 확인하지 못했습니다. 초안은 유지했습니다. 현재 상태를 확인한 뒤 다시 시도해 주세요.'); }
    finally { endAction(); }
  };
  const openPreview = () => { if (unavailable()) return; const next = read(); if (next && programPublicationInput(next, actorId, { newFlow: republishing && !!currentFlow?.archived })) { setCurrent(next); setEditingRow(null); setPreview(true); void save(); } };
  const back = () => { if (unavailable()) return; const next = read(); if (next) { setCurrent(next); setEditingRow(null); setStep(step === 'preview' ? 'refine' : 'pick'); void save(); } };
  const closeItem = () => {
    if (unavailable()) return;
    const next = read(); if (next) setCurrent(next);
    setSourceReview(null); setSourceFields([]); setEditingRow(null); void save();
  };
  useEffect(() => {
    if (editingRow) {
      itemWasOpen.current = true;
      itemOpener.current = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('[data-publication-item] > button') ?? []).find(button => button.parentElement?.dataset.publicationItem === editingRow) ?? null;
      itemHeading.current?.focus(); dialog.current?.scrollTo(0, 0);
    }
    else if (itemWasOpen.current) { itemWasOpen.current = false; itemOpener.current?.focus(); }
  }, [editingRow]);
  const selectRows = (ids: string[], selected: boolean) => {
    if (unavailable() || !draftRef.current) return;
    edit({ rows: draftRef.current.rows.map(row => ids.includes(row.itemId) ? { ...row, selected,
      ...(selected && row.origin === 'note' && !row.description ? { description: originalRows.find(original => original.id === row.rowId)?.text.trim() ?? '' } : {}) } : row) });
  };
  useEffect(() => { stepHeading.current?.focus(); dialog.current?.scrollTo(0, 0); }, [step]);
  const openSeriesReview = () => {
    if (unavailable()) return; const next = read(); if (!next) return;
    const result = inspectProgramPublicationSeries(dataRef.current, actorId, next);
    if (!result.ok) { setMessage('반복 원본을 확인하지 못했습니다. 초안을 유지했습니다. 원문 검토 상태를 먼저 확인해 주세요.'); return; }
    setCurrent(next); setSeriesReview(result.review); setSeriesKeys(result.review.candidates.filter(row => row.changed || row.removableRowIds.length > 0).map(row => row.sourceKey)); setPreview(false);
  };
  const applySeriesReview = () => {
    if (unavailable() || !seriesReview) return; const next = read(); if (!next) return;
    const result = applyProgramPublicationSeriesReview(dataRef.current, actorId, next, seriesReview, seriesKeys, new Date().toISOString());
    if (!result.ok) { setMessage('확인 중 원문이나 초안이 바뀌었습니다. 입력은 유지했습니다. 반복 항목을 다시 확인해 주세요.'); return; }
    if (result.changed) edit({ rows: result.draft.rows });
    setSeriesReview(null); seriesOpener.current?.focus();
  };
  const publicationReady = !input || input.items.every(item => canPublishProgramSchedule(item.schedule));
  const cancelSourceReview = () => { restoreSourceFocus.current = true; setSourceReview(null); setSourceFields([]); };
  const openSourceReview = (itemId: string, opener: HTMLButtonElement) => {
    if (unavailable()) return; const current = read(); if (!current) return;
    const result = inspectProgramPublicationSource(dataRef.current, actorId, current, itemId);
    if (!result.ok) { setMessage('연결된 원문을 확인하지 못했습니다. 공개 초안은 유지했습니다.'); return; }
    sourceOpener.current = opener; setCurrent(current); setSourceReview(result.review); setSourceFields([]); setPreview(false);
  };
  const applySourceReview = async () => {
    if (unavailable() || !sourceReview) return;
    const review = programClone(sourceReview), fields = [...sourceFields];
    beginAction();
    try {
      if (!await save()) return;
      const submitted = programClone(read()!), expected = programClone(savedRef.current);
      let updated: ProgramPublicationDraft | undefined, changed = false;
      const result = await mutate('선택한 원문 내용으로 공개 초안 저장', current => {
        const applied = applyProgramPublicationSource(current, actorId, submitted, review, fields, new Date().toISOString());
        if (!applied.ok) return programFailure(current, applied.reason);
        updated = applied.draft; changed = applied.changed;
        return saveProgramPublicationDraft(current, actorId, applied.draft, expected);
      }, { history: false, alphaSocial: { type: 'publication-source', draft: submitted, expected, itemId: review.row.itemId, fields } });
      if (result.ok && result.presentationPending) { setMessage(programErrorMessage('presentation-pending')); return; }
      if (result.ok && storageScope === 'account') updated = readCurrentData?.()?.spaces[actorId]?.publicationDrafts.find(row => row.id === submitted.id);
      if (!result.ok || !updated) { setMessage(result.ok ? '비교 결과를 확인하지 못했습니다. 선택을 유지했습니다.' : programErrorMessage(result.reason)); return; }
      const next: ProgramPublicationDraft = updated;
      savedRef.current = next;
      for (const element of textInputs()) {
        const field = element.dataset.publicationField ?? '';
        const sourceField = field.startsWith('timing:') ? 'timing' : field as ProgramPublicationSourceField;
        if (element.closest<HTMLElement>('[data-publication-item]')?.dataset.publicationItem !== review.row.itemId || !fields.includes(sourceField)) continue;
        const value = programPublicationStepNativeValue(next, field, review.row.itemId);
        if (value !== undefined) element.value = value;
      }
      setCurrent(next); cancelSourceReview(); setPreview(false);
      setMessage(changed ? '선택한 원문 내용을 초안에 저장했습니다. 아직 공개하지 않았습니다.' : '이미 같은 내용입니다. 저장하지 않았습니다.');
    } catch { setMessage('원문 내용을 저장하지 못했습니다. 비교와 선택을 유지했습니다. 다시 시도해 주세요.'); }
    finally { endAction(); }
  };
  const blocked = publishing || locked;
  useEffect(() => {
    if (!sourceReview && !blocked && restoreSourceFocus.current) { restoreSourceFocus.current = false; sourceOpener.current?.focus(); }
  }, [sourceReview, blocked]);
  // Reuse the existing modal and its IME capture. Only one sheet is visible and
  // focusable at a time; the publication fields stay mounted for native capture.
  const editingItem = draft?.rows.find(row => row.itemId === editingRow);
  const itemEditor = editingItem && (() => {
    const row = editingItem;
    const original = originalRows.find(value => value.id === row.rowId);
    const subchecks = row.seriesSource ? programPublicationSeriesSubchecks(row) : original?.task?.subchecks ?? [];
    const hasOrdinarySource = row.origin === 'task' && !!space && hasProgramOrdinaryPublicationSource(space, documentId, row.rowId);
    return <section className={styles.itemEditor} data-publication-item={row.itemId} aria-label="공개 항목 다듬기"><div className={styles.itemEditorHead}><h2 id="program-publication-item-title" ref={itemHeading} tabIndex={-1}>항목 다듬기</h2><button type="button" disabled={blocked} onClick={closeItem}>완료</button></div>
              <div className={styles.itemForm}><label className={styles.field}>공개용 항목 제목<input data-publication-field="title" value={row.title} maxLength={500} onChange={event => editRow(row.itemId, { title: event.target.value })} /></label><label className={styles.field}>공개용 설명<textarea rows={3} data-publication-field="description" value={row.description} maxLength={30000} onChange={event => editRow(row.itemId, { description: event.target.value })} /></label>
              {row.scheduleKind === 'recurring' && row.recurrence && <ProgramPublicationRecurrence value={row.recurrence} disabled={blocked} styles={styles} onChange={recurrence => editRow(row.itemId, { recurrence })} />}
              {row.scheduleKind !== 'recurring' && <details><summary>시간·시간대</summary><ProgramPublicationTiming value={row.timing} disabled={blocked} styles={styles} onChange={timing => editRow(row.itemId, { timing })} /></details>}
              <details><summary>완료 기준·일정·출처</summary><label className={styles.field}>완료 기준<input data-publication-field="completionCriteria" value={row.completionCriteria} onChange={event => editRow(row.itemId, { completionCriteria: event.target.value })} /></label><label className={styles.field}>공개 일정<select value={row.scheduleKind} disabled={blocked} onChange={event => editRow(row.itemId, { scheduleKind: event.target.value as ProgramPublicationDraftRow['scheduleKind'], scheduleValue: '' })}><option value="undated">날짜 미정</option><option value="fixed">고정 날짜를 직접 지정</option><option value="relative">기준일과의 간격을 직접 지정</option>{row.recurrence && <option value="recurring">반복 일정</option>}</select></label>{(row.scheduleKind === 'fixed' || row.scheduleKind === 'relative') && <label className={styles.field}>{row.scheduleKind === 'fixed' ? '공개할 날짜' : '기준일과의 일수 · 전날 -1, 다음 날 1'}<input type={row.scheduleKind === 'fixed' ? 'date' : 'text'} inputMode={row.scheduleKind === 'relative' ? 'numeric' : undefined} data-publication-field="scheduleValue" value={row.scheduleValue} onChange={event => editRow(row.itemId, { scheduleValue: event.target.value })} /></label>}<label className={styles.field}>항목 출처 URL · 선택<input type="url" data-publication-field="sourceUrl" value={row.sourceUrl} onChange={event => editRow(row.itemId, { sourceUrl: event.target.value })} /></label></details>
              {hasOrdinarySource && <button type="button" disabled={blocked} onClick={event => openSourceReview(row.itemId, event.currentTarget)}>원문 내용 가져오기</button>}
              {sourceReview?.row.itemId === row.itemId && <ProgramPublicationSourceReviewPanel review={sourceReview} fields={sourceFields} disabled={blocked} onFields={setSourceFields} onApply={() => void applySourceReview()} onCancel={cancelSourceReview} styles={styles} />}
              {subchecks.length > 0 && <details><summary>하위 확인 항목 선택</summary>{subchecks.map(check => <label key={check.id} className={styles.check}><input type="checkbox" disabled={blocked} checked={row.subchecks.some(value => value.id === publicId(check.id))} onChange={event => editRow(row.itemId, { subchecks: event.target.checked ? [...row.subchecks, { id: publicId(check.id), title: check.title }] : row.subchecks.filter(value => value.id !== publicId(check.id)) })} />{check.title}</label>)}</details>}
            </div>
              {(row.scheduleKind === 'fixed' || row.scheduleKind === 'recurring' && row.recurrence && (row.recurrence.startKind === 'fixed' || !!row.recurrence.end.match(/\d{4}-\d\d-\d\d/))) && <p className={styles.fixedWarning} role="status">직접 정한 실제 날짜가 그대로 공개됩니다. 날짜를 숨기려면 공개 일정을 바꿔 주세요.</p>}
            </section>;
  })();
  if (published) return <dialog ref={dialog} className={styles.dialog} aria-labelledby="program-published-title" onCancel={event => { event.preventDefault(); leavePublished(false); }}>
    <section className={styles.publishedPanel}><h2 id="program-published-title">공개했습니다</h2><p>{published.title}</p>
      <ProgramShareLink flowId={published.flowId} versionId={published.versionId} />
      <div className={styles.publishedActions}><button type="button" onClick={() => leavePublished(true)}>Flow 찾기에서 보기</button><button type="button" onClick={() => leavePublished(false)}>닫기</button></div>
      <p>나 › 내 활동에서 공개한 Flow를 다시 볼 수 있습니다.</p>
    </section>
  </dialog>;
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={editingItem ? "program-publication-item-title" : "program-publisher-title"} onCancel={event => { event.preventDefault(); if (editingItem) closeItem(); else void close(); }}
    onCompositionStartCapture={event => { composing.current.add(event.target); if (recovery.current) recovery.current.open = false; }}
    onCompositionEndCapture={event => { composing.current.delete(event.target); const next = read(); if (next) setCurrent({ ...next, updatedAt: new Date().toISOString() }); syncReadonly(); if (!composing.current.size) void save(); }}>
    {externalRecovery}
    <div className={styles.mainContent} hidden={!!editingItem}>
    <header className={styles.header}><button type="button" className={styles.iconButton} aria-label="닫기 · 초안 보관" disabled={blocked} onClick={() => void close()}>✕</button><div><h2 id="program-publisher-title" ref={stepHeading} tabIndex={-1}>{republishing ? '새 링크로 다시 공개' : currentFlow?.archived ? '공개 철회·보관 상태' : draft?.flowId ? '새 버전 공개' : '내 경험 공개'}</h2></div><small role="status">{saving ? '저장 중' : same(savedRef.current, draft) ? '저장됨' : '입력 중'}</small><details ref={recovery} className={styles.recovery}><summary aria-label="초안 메뉴">⋯</summary><div className={styles.recoveryActions}><button type="button" onClick={keepInput}>초안 TXT 보관</button><button type="button" disabled={blocked} onClick={() => void save()}>다시 저장</button><button type="button" className={styles.discard} disabled={blocked} onClick={() => setDiscarding(!discarding)}>초안 버리기</button></div></details></header>
    {!republished && <nav className={styles.steps} aria-label="공개 걸음">{(['pick', 'refine', 'preview'] as const).map((value, index) => <span key={value} aria-current={step === value ? 'step' : undefined}>{['① 고르기', '② 다듬기', '③ 미리보기'][index]}</span>)}</nav>}
    {republished ? <section className={styles.preview} role="status" aria-label="새 링크 공개 완료"><p>새 링크로 버전 1을 공개했습니다. 예전 Flow는 철회된 그대로입니다.</p>
      <ProgramShareLink flowId={republished.flowId} versionId={republished.versionId} />
      <button type="button" onClick={() => { dialog.current?.close(); onClose(); navigate({ view: 'flow', id: republished.flowId, versionId: republished.versionId }); }}>새 공개 Flow 열기</button></section> : !draft ? <p className={styles.error}>문서가 없거나 보관되었습니다. 공개할 내용을 다시 선택해 주세요.</p> : <>
      {storageScope === 'local' && <p className={styles.boundary}>이 기기의 로컬 PoC에서 확인합니다.</p>}
      {republishing && republishSource && <section className={styles.preview} aria-label="새 링크로 다시 공개 안내"><p>‘{republishSource.version.title}’(버전 {republishSource.version.number})는 철회된 채로 남습니다. 같은 내용으로 새 링크에 버전 1을 공개합니다.</p><p>예전 링크로는 가져오거나 출력할 수 없습니다. 새 링크를 다시 보내 주세요.</p><p>이전 버전·개인 사본·받은 제안은 철회한 Flow에 그대로 있습니다.</p></section>}
      {privateChanged && <section className={styles.warning} aria-label="다른 탭 공개 초안 변경"><p>다른 탭에 저장된 비공개 초안이 바뀌었습니다. 이 화면의 입력은 유지했으며 자동으로 덮어쓰지 않습니다.</p><button type="button" disabled={blocked} onClick={() => { if (!unavailable()) setPrivateComparison({ stored: programClone(storedDraft) }); }}>최신 비공개 초안과 비교</button></section>}
      {privateComparison && <section className={styles.warning} aria-label="비공개 초안 비교"><h3>어느 초안을 보관할까요?</h3><p>공개 버전 비교와 다릅니다. 선택해도 공개하지 않습니다. 내 입력을 TXT로 보관한 뒤 선택할 수 있습니다.</p>
        <details open><summary>이 화면의 입력</summary><pre className={styles.pre}>{draft ? programPublicationRecoveryText(draft) : ''}</pre></details>
        <details open><summary>비교할 때 저장된 초안</summary><pre className={styles.pre}>{privateComparison.stored ? programPublicationRecoveryText(privateComparison.stored) : '저장 초안 없음 · 다른 탭에서 공개했거나 지웠을 수 있습니다.'}</pre></details>
        <button type="button" disabled={blocked} onClick={() => void resolvePrivate('mine')}>내 입력으로 초안 보관</button><button type="button" disabled={blocked} onClick={() => void resolvePrivate('stored')}>내 입력 대신 확인한 저장 초안 열기</button><button type="button" disabled={blocked} onClick={() => setPrivateComparison(null)}>취소 · 내 입력 유지</button>
      </section>}
      {currentFlow?.ownerId === actorId && <details className={styles.management}><summary>공개 상태 관리</summary>{currentFlow.archived ? <><p>이 Flow는 철회된 채로 둡니다. 같은 내용을 새 링크로 다시 공개할 수 있습니다.</p>{!republishing && canRepublish && <button type="button" disabled={blocked} onClick={startRepublishing}>새 링크로 다시 공개…</button>}{!canRepublish && <p>이 문서는 새 링크로 공개 중이거나 공개 연결이 바뀌었습니다.</p>}</> : <><p>공개를 철회하면 탐색 목록에서 숨깁니다. 이미 만들어진 개인 사본과 이전 버전은 남습니다.</p><button type="button" disabled={blocked} onClick={() => setArchiveTarget({ flowId: currentFlow.id, versionId: currentFlow.currentVersionId, title: data.public.versions.find(row => row.id === currentFlow.currentVersionId)?.title ?? draft.title })}>공개 목록에서 내리기</button></>}</details>}
      {archiveTarget && <section className={styles.warning} aria-label="공개 철회 확인"><h3>‘{archiveTarget.title}’ 공개를 철회할까요?</h3><p>공개 목록에서만 숨깁니다. 원문·이전 버전·개인 사본·현재 초안은 지우지 않습니다. 나중에 같은 문서를 새 링크로 다시 공개할 수 있습니다. 이 Flow의 링크로는 더 이상 가져오거나 출력할 수 없습니다.</p>{currentFlow?.currentVersionId !== archiveTarget.versionId && <p role="alert">확인 중 버전이 바뀌었습니다. 취소한 뒤 최신 제목과 버전으로 다시 확인해 주세요.</p>}<button type="button" disabled={blocked || currentFlow?.currentVersionId !== archiveTarget.versionId} onClick={() => void archive()}>확인 · 공개 철회하고 보관</button><button type="button" disabled={blocked} onClick={() => setArchiveTarget(null)}>취소 · 공개 유지</button></section>}
      {sourceChanged && <section className={styles.warning}><strong>개인 문서가 바뀌었습니다.</strong><p>원문 변경을 확인해 주세요. 개인 내용은 공개 초안에 자동으로 추가하지 않습니다.</p><details><summary>현재 개인 원문 읽기 · 공개되지 않음</summary><pre className={styles.pre}>{M.raw(M.getDocument(space.text, documentId))}</pre></details><button type="button" disabled={blocked} onClick={acknowledgeSource}>원문 변경 확인 · 공개 초안 유지</button></section>}
      {versionChanged && !currentFlow?.archived && <section className={styles.warning}><strong>공개 버전이 바뀌었습니다.</strong><p>공개할 필드별로 초안을 유지할지 최신 내용을 가져올지 선택해 주세요.</p><button type="button" disabled={blocked} onClick={startComparison}>{comparison ? '최신 상태로 비교 다시 시작' : '최신 공개 버전과 비교'}</button></section>}
      {comparison && <PublicationConflictReview comparison={comparison} choices={choices} disabled={blocked} onChoice={(key, choice) => setChoices(previous => ({ ...previous, [key]: choice }))} onApply={() => void applyComparison()} onCancel={() => { setComparison(null); setChoices({}); }} />}
      {step === 'refine' && hasSeries && <details className={styles.management}><summary>반복 원본 확인</summary><p>반복 설정이 메모로 나뉜 이전 초안을 정리할 수 있습니다. 선택하거나 수정한 메모는 남기고, 공개할 항목은 별도로 고릅니다.</p>
        <button type="button" ref={seriesOpener} disabled={blocked} onClick={openSeriesReview}>반복 항목 확인하기</button></details>}
      {seriesChanged && <p className={styles.warning} role="alert">연결된 반복 원본이 바뀌었습니다. 반복 원본 확인에서 현재 초안과 비교해 주세요. 공개하지 않고 입력을 유지했습니다.</p>}
      {seriesReview && <section className={styles.comparison} aria-label="반복 원본과 초안 정리"><h3>반복 항목으로 묶기</h3>
        {!seriesReview.candidates.length && <p>이 문서에 연결된 반복 원본이 없습니다.</p>}
        {seriesReview.candidates.map(candidate => <fieldset key={candidate.sourceKey} disabled={blocked}><legend>{candidate.row.title}</legend>
          <label className={styles.check}><input type="checkbox" checked={seriesKeys.includes(candidate.sourceKey)} onChange={event => setSeriesKeys(previous => event.target.checked ? [...previous, candidate.sourceKey] : previous.filter(key => key !== candidate.sourceKey))} />이 원본 확인</label>
          <p>{programRecurringScheduleLabel(programRecurringScheduleFromDraft(candidate.row.recurrence!)!)}</p>
          {candidate.existingItemId && <details><summary>현재 공개 초안과 원본 비교</summary><h4>현재 초안</h4><pre className={styles.pre}>{fullRowText(draft.rows.find(row => row.itemId === candidate.existingItemId)!)}</pre><h4>확인할 원본</h4><pre className={styles.pre}>{fullRowText(candidate.row)}</pre></details>}
          <p>{candidate.existingItemId ? '이미 연결된 공개 항목의 제목·일정·선택은 그대로 유지합니다.' : '반복 한 항목을 새 후보로 추가합니다. 아직 공개에 선택하지 않습니다.'}</p>
          <p>수정하지 않은 원본 메모 {candidate.removableRowIds.length}개를 묶고, 선택·수정한 메모 {candidate.preservedRowIds.length}개는 남깁니다.</p>
        </fieldset>)}
        <button type="button" disabled={blocked || !seriesKeys.length} onClick={applySeriesReview}>확인한 원본으로 초안 정리</button>
        <button type="button" disabled={blocked} onClick={() => { setSeriesReview(null); seriesOpener.current?.focus(); }}>취소 · 초안 유지</button>
      </section>}
      {!publicationReady && <p className={styles.warning} role="status">반복 일정은 초안 저장·미리보기까지 사용할 수 있습니다. 개인 사본과 출력 연결이 준비되기 전에는 공개하지 않습니다.</p>}
      {step === 'pick' && <div className={styles.body}><ProgramPublicationPick draft={draft} originalRows={originalRows} today={today} disabled={blocked} onSelect={selectRows} /></div>}
      {step === 'refine' && <div className={styles.body}>
        <label className={styles.field}>공개 제목 · 필수<input data-publication-field="title" value={draft.title} maxLength={240} required onChange={event => edit({ title: event.target.value })} placeholder="다른 사람이 알아볼 제목" /></label>
        <label className={styles.field}>한 줄 소개 · 선택<textarea data-publication-field="summary" value={programPublicationSummaryParts(draft.summary).body} rows={2} maxLength={29940} onChange={event => edit({ summary: composeProgramPublicationSummary(anchorName, event.target.value) })} placeholder="누구에게 어떤 도움이 되는지" /></label>
        <section className={styles.anchorConvert} aria-labelledby="program-anchor-title" data-anchor-convert>
          <h3 id="program-anchor-title">날짜</h3>
          <div className={styles.dateLine}><span>{anchorMode === 'none' ? '문서 날짜는 빼고 보여 줍니다' : dateExample ? `날짜는 '${dateExample}'처럼 바꿔서 보여 줍니다` : '기준일로 바꿀 문서 날짜가 없습니다'}</span><span aria-hidden="true"> · </span><button type="button" className={styles.linkButton} aria-expanded={dateOptions} disabled={blocked} onClick={() => { if (!unavailable()) setDateOptions(!dateOptions); }}>바꾸기</button></div>
          {dateOptions && <section className={styles.dateOptions} aria-label="날짜 표시 바꾸기">
            <h4>어느 날을 기준으로 할까요?</h4>
            {([['first', '처음 날 기준', '그날부터 +n일'], ['last', '마지막 날 기준', '그날까지 −n일'], ['none', '날짜 빼기', '문서 날짜를 미정으로']] as const).map(([mode, label, hint]) => <button type="button" key={mode} aria-pressed={anchorMode === mode} disabled={blocked} onClick={() => { if (unavailable()) return; chooseDates(mode); setDateOptions(false); }}><span>{label}<small>{hint}</small></span>{anchorMode === mode && <span aria-hidden="true">✓</span>}</button>)}
            <button type="button" disabled={blocked} onClick={() => { if (!unavailable()) setDateOptions(false); }}>닫기</button>
          </section>}
          <label className={styles.field}>기준일 이름 · 선택<input data-publication-field="anchorName" value={anchorName} maxLength={40} placeholder="예: 이사일" onChange={event => edit({ summary: composeProgramPublicationSummary(event.target.value, programPublicationSummaryParts(draftRef.current!.summary).body) })} /></label>
          {anchorPlan && !anchorPlan.rows.length && !anchorUndo && anchorPlan.handSet === 0 && <p className={styles.anchorHint} data-anchor-none>고른 할 일에 바꿀 문서 날짜가 없습니다. 날짜 미정과 반복은 그대로 둡니다.</p>}
          {!!anchorPlan?.handSet && <p className={styles.anchorHint}>직접 정했거나 저장해 둔 일정 {anchorPlan.handSet}개는 그대로 둡니다. 항목을 눌러 바꿀 수 있습니다.</p>}
          {anchorNote && <p className={styles.visuallyHidden} role="status">{anchorNote}</p>}
        </section>
        <section className={styles.choices} aria-label="고른 항목 다듬기"><h3>고른 항목 {draft.rows.filter(row => row.selected).length}개</h3>{draft.rows.filter(row => row.selected).map(row => {
          const chip = scheduleChip(row), scheduleLabel = manuallySetSchedules.current.has(row.itemId) || row.scheduleKind === 'fixed' ? '직접 정함' : savedSchedules.current.has(row.itemId) && row.scheduleKind !== 'undated' ? '저장한 일정' : null;
          return <article className={styles.choice} data-publication-item={row.itemId} key={row.itemId}>
            <button type="button" className={styles.refineItem} disabled={blocked} aria-expanded={editingRow === row.itemId} onClick={() => { if (!unavailable()) setEditingRow(row.itemId); }}><span>{row.title || (row.origin === 'note' ? '메모 제목을 적어 주세요' : '제목 없는 항목')}<span className={styles.scheduleChip} data-schedule-chip={chip.kind}>{chip.text}</span>{scheduleLabel && <small>{scheduleLabel}</small>}</span><span aria-hidden="true">›</span></button>

          </article>;
        })}</section>
        <label className={styles.field}>출처 링크 · 선택<input type="url" data-publication-field="sourceUrl" value={draft.sourceUrl} onChange={event => edit({ sourceUrl: event.target.value })} placeholder="https:// 참고한 글이나 영상" /></label>
        <details className={styles.source}><summary>더 알리기</summary><div className={styles.two}><label className={styles.field}>분야<input data-publication-field="category" value={draft.category} maxLength={120} onChange={event => edit({ category: event.target.value })} /></label><label className={styles.field}>적용 상황 · 쉼표로 구분<input data-publication-field="situationsText" value={draft.situationsText} onChange={event => edit({ situationsText: event.target.value })} /></label></div><label className={styles.field}>출처 설명<input data-publication-field="sourceLabel" value={draft.sourceLabel} maxLength={500} onChange={event => edit({ sourceLabel: event.target.value })} /></label>
          <label className={styles.field}>다른 공개 원본에서 파생{draft.flowId ? <p>{draft.derivedFrom ? data.public.versions.find(row => row.id === draft.derivedFrom?.versionId)?.title ?? '기존 원본' : '독립 작성'} · 기존 관계 유지</p> : <select value={draft.derivedFrom?.versionId ?? ''} disabled={blocked} onChange={event => { const selected = data.public.versions.find(row => row.id === event.target.value); edit({ derivedFrom: selected ? { flowId: selected.flowId, versionId: selected.id } : null }); }}><option value="">독립 작성</option>{data.public.versions.filter(version => data.public.flows.some(flow => flow.id === version.flowId && !flow.archived)).map(version => <option key={version.id} value={version.id}>{version.title} · 버전 {version.number}</option>)}</select>}</label>
        </details>
      </div>}
      {preview && input && <section className={styles.preview} aria-label="실제로 공개할 내용">
        <ProgramPublicationPreviewCard data={data} flow={{ id: draft.flowId ?? 'publication-preview', ownerId: actorId, currentVersionId: 'publication-preview-version', category: input.category, situations: input.situations, derivedFrom: input.derivedFrom ?? null, archived: false }} version={{ id: 'publication-preview-version', flowId: draft.flowId ?? 'publication-preview', number: 1, parentVersionId: null, title: input.title, summary: input.summary, items: input.items, source: input.source, createdBy: actorId, createdAt: draft.updatedAt }} />
        <div className={styles.previewDetail}><h3>{input.title}</h3><p className={styles.pre}>{input.summary}</p><p>출처: {input.source.label}{input.source.kind === 'simulated-example' ? ' · 합성 예시' : ' · 개인 작성'}</p>{input.source.url && <a href={input.source.url} target="_blank" rel="noreferrer noopener">입력한 원문 URL</a>}
          <p>분야: {input.category}{input.situations.length > 0 && ` · 적용 상황: ${input.situations.join(', ')}`}</p>
          {input.derivedFrom && <p>원본: {data.public.versions.find(row => row.id === input.derivedFrom?.versionId)?.title} · 버전 {data.public.versions.find(row => row.id === input.derivedFrom?.versionId)?.number}</p>}
          <ol>{input.items.map(item => <li key={item.id}><h4>{item.title}</h4><p className={styles.pre}>{item.description}</p>{item.completionCriteria && <p>완료 기준: {item.completionCriteria}</p>}{item.sourceUrl && <p><a href={item.sourceUrl} target="_blank" rel="noreferrer noopener">항목 출처: {item.sourceUrl}</a></p>}<span className={styles.scheduleChip} data-schedule-chip={item.schedule.kind}>{item.schedule.kind === 'recurring' ? programRecurringScheduleLabel(item.schedule) : [item.schedule.kind === 'undated' ? '날짜 미정' : item.schedule.kind === 'fixed' ? `직접 정함 · ${item.schedule.date}` : programAnchorChip(anchorName, item.schedule.days), programOrdinaryTimingLabel(item.schedule.timing)].filter(Boolean).join(' · ')}</span>{item.subchecks.length > 0 && <ul>{item.subchecks.map(check => <li key={check.id}>{check.title}</li>)}</ul>}</li>)}</ol>
        </div>
        {programPublicationExposure(draft).fixed.length ? <div className={styles.fixedWarning} role="alert"><p>직접 정한 실제 날짜가 {programPublicationExposure(draft).fixed.length}개 항목에 그대로 공개됩니다.</p>{programPublicationExposure(draft).fixed.map(row => <button type="button" key={row.itemId} disabled={blocked} onClick={() => { if (!unavailable()) { setStep('refine'); setEditingRow(row.itemId); } }}>{row.title} · 일정 바꾸기</button>)}</div> : <p className={styles.exposure}>✓ 내 실제 날짜 0개 · 고른 메모 {programPublicationExposure(draft).notes}개 · 진행 기록 0개</p>}
        <p className={styles.scope}>{storageScope === 'account' ? '로그인한 FlowMe 사용자 누구나 Flow 찾기에서 봅니다. 후기는 공개됩니다.' : '이 기기의 로컬 PoC 목록에서 봅니다. 실제 사용자에게 공개하지 않습니다.'}{storageScope === 'account' && <><br />{'로그인한 다른 사용자에게 선택한 내용을 공개합니다. 계정을 지워도 공개한 Flow는 남습니다.'}</>}</p>
        {input.items.some(item => item.schedule.kind === 'relative' || item.schedule.kind === 'recurring' && item.schedule.start.kind === 'relative') && (taker => <details className={styles.takerPreview} data-taker-preview><summary>받는 사람이 가져가면</summary>
          <label className={styles.field}>받는 사람이 고른 {anchorName.trim() || '기준일'}<input type="date" value={takerDate} onChange={event => { if (event.target.value) setTakerDate(event.target.value); }} /></label>
          <ul className={styles.placeList}>{taker.dated.map(day => <li key={day.date} data-place-date={day.date}><b>{day.date === today ? `오늘 ${programCalendarDate(day.date, today, false)}` : programCalendarDate(day.date, today)}</b><span>{day.titles.join(' · ')}</span><em>{day.count}개</em></li>)}{taker.repeats.map(row => <li key={row.itemId} data-place-repeat><b>{row.label}</b><span>↻ {row.title}{row.first ? ` · ${programDateLabel(row.first, today, false)}부터` : ''}</span><em>반복</em></li>)}{taker.undated.count > 0 && <li data-place-undated><b>날짜 미정</b><span>{taker.undated.titles.join(' · ')}</span><em>{taker.undated.count}개</em></li>}</ul>
        </details>)(programPublicationTakerPreview(input.items, input.title, takerDate, today))}
      </section>}
      {message && <p className={styles.error} role="alert">{message}</p>}
      <footer className={styles.footer}>
        <span className={styles.footerCount}>{step === 'pick' ? `${draft.rows.filter(row => row.selected).length}개 고름` : step === 'refine' ? '제목과 날짜를 확인해 주세요' : `${input?.items.length ?? 0}개 항목`}</span>
        <div className={styles.actions}>{step !== 'pick' && <button type="button" disabled={blocked} onClick={back}>이전</button>}{step === 'pick' ? <button type="button" className={styles.primary} disabled={blocked || !draft.rows.some(row => row.selected) || republishBlocked} onClick={() => chooseDates(anchorMode, true)}>다음</button> : step === 'refine' ? <button type="button" className={styles.primary} disabled={!input || blocked || privateChanged || sourceChanged || versionChanged || republishBlocked} onClick={openPreview}>미리보기</button> : <button type="button" className={styles.primary} disabled={blocked || privateChanged || sourceChanged || versionChanged || republishBlocked || !input || !publicationReady} onClick={() => void publish()}>{publishing ? '공개 중…' : republishing ? '새 링크로 공개' : storageScope === 'account' ? '이 내용으로 공개' : '이 내용으로 PoC에 공개'}</button>}</div>
      </footer>
      {discarding && <section className={styles.warning}><p>공개 초안만 버립니다. 개인 문서와 이미 공개한 버전은 유지됩니다.</p><button type="button" disabled={blocked} onClick={() => void discard()}>공개 초안 버리기</button><button type="button" onClick={() => setDiscarding(false)}>계속 작성</button></section>}
    </>}
    </div>
    {itemEditor}
  </dialog>;
}
