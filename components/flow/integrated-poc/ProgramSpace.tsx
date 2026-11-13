'use client';

import type {OwnedWritingAck} from '@/lib/flow/integrated-poc/writing-ack';
import type {WritingCompute} from '@/lib/flow/integrated-poc/writing-compute';
import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { programClone, programFailure, programId, programResult, type ProgramData, type ProgramPrivateSpace, type ProgramTransition, type ProgramWritingPosition } from '@/lib/flow/integrated-poc/contract';
import { programDate } from '@/lib/flow/integrated-poc/program-data';
import { programFolderCopyAccessProblem } from '@/lib/flow/integrated-poc/folder-copy';
import { completingInSession, finishCompleting, type CompletingTasks } from '@/lib/flow/integrated-poc/automatic-read-wait';
import { addProgramQuickTask, archiveProgramDocument, completeProgramTask, createProgramDocument, createProgramFolder, deleteProgramFolder, linkProgramTask, moveProgramFolder, recordProgramTaskProgress, renameProgramDocument, renameProgramFolder, setProgramDocumentFolder, updateProgramTask } from '@/lib/flow/integrated-poc/private-space';
import { programDateRange, programExecutionTasks, programShiftDate, programShiftMonth, programTaskProgress, type ProgramPeriod } from '@/lib/flow/integrated-poc/execution';
import { programDateChipLabel, programDayHeadingParts, programPeriodTitleParts } from '@/lib/flow/integrated-poc/today-title';
import { programManualOrderDays, programOrderedExecutionRows, programTextExecutionKey, readProgramDayOrder, reorderProgramExecutionTimeline, resetProgramExecutionDayOrder,
  restoreProgramExecutionDayOrder, type ProgramDayOrder, type ProgramOrderedExecutionRow } from '@/lib/flow/integrated-poc/recurrence-order';
import { programNoticeEndsAt } from '@/lib/flow/integrated-poc/program-notice';
import { ProgramNoticeRow } from './ProgramNoticeRow';
import { ProgramFirstCleanup } from './ProgramFirstCleanup';
import type { ToastHold } from './use-toast-life';
import { carryProgramHead, restoreProgramHead, type ProgramHeadCarry } from '@/lib/flow/integrated-poc/tablet-head-carry';
import { programCheckNoticeAfter, programCheckNoticeEndsAt, programCheckNoticeFailed, programCheckNoticeLive, programCheckNoticeView, programCheckUndoable, type ProgramCheckNotice, type ProgramCheckStep } from '@/lib/flow/integrated-poc/check-progress-notice';
import { ProgramMonthGrid } from './ProgramMonthGrid';
import { ProgramFlowTodayBand, type ProgramFlowBandRow } from './ProgramFlowTodayBand';
import { programContinueBand, programContinueMeta, programSameTaskGroups, type ProgramContinueRow } from '@/lib/flow/integrated-poc/continue-band';
import { programSameTaskProof, programSameTaskProofThen, undoProgramSameTasks, type ProgramSameTaskProof } from '@/lib/flow/integrated-poc/same-task-undo';
import { programDayDialogStep, programMonthTitle, type ProgramDayDialogMode } from '@/lib/flow/integrated-poc/month-grid';
import { programFollowToday, programLaterToday, startProgramDayClock, type ProgramDayClock } from '@/lib/flow/integrated-poc/day-clock';
import { moveProgramTaskDates, programTaskDateChoices, programTaskDateMovesSocial, programTaskDatesMovedText, programTaskDateState, programTaskDateUndo, programTaskDateUndoLines, programTaskRepeatMember, restoreProgramTaskDates, type ProgramTaskDateLines, type ProgramTaskDateMove } from '@/lib/flow/integrated-poc/task-date-move';
import { PROGRAM_SELECT_REASON, programDayPicked, programSelectBlock, programSelectDay, programSelectRange, programToggleSelection, type ProgramSelectBlock } from '@/lib/flow/integrated-poc/select-mode';
import { programDayCount, programExecutionDay, programExecutionList, programExecutionRowMeta, readProgramTaskDatePresentation, type ProgramExecutionListItem } from '@/lib/flow/integrated-poc/execution-presentation';
import { programCalendarDate, programDaysBetween, programShortDate } from '@/lib/flow/integrated-poc/date-label';
import { timeRo } from '@/lib/flow/integrated-poc/number-particle';
import { programFirstOfficialFlows } from '@/lib/flow/integrated-poc/first-flows';
import { useAlphaOfficialActors } from './AlphaOfficialActors';
import { programCarryoverSummary, programCarryoverGroupScope, carryProgramTasksToToday, planProgramCarryover, programCarryoverBefore, programCarryoverItems, programCarryoverPlaces, programCarryoverProof, restoreProgramCarryover,
  PROGRAM_CARRYOVER_LIMIT, programMorningCarry, type ProgramCarryoverBefore, type ProgramCarryoverChoice, type ProgramCarryoverItem, type ProgramCarryoverPlan, type ProgramMorningCarry } from '@/lib/flow/integrated-poc/carryover';
import { programOpening } from '@/lib/flow/integrated-poc/carryover-opening';
import { completeProgramRepeat, convertProgramLegacyRepeat, programLegacyRepeatSeries, programRepeatLine, programRepeatSeen, readProgramRepeatCheck, settleProgramRepeatLines, undoProgramRepeat,
  PROGRAM_LEGACY_REPEAT_CARD, PROGRAM_LEGACY_REPEAT_DONE, PROGRAM_LEGACY_REPEAT_REFUSED, PROGRAM_REPEAT_UNDO_REFUSED, type ProgramRepeatCheck } from '@/lib/flow/integrated-poc/repeat-commands';
import { programRepeatTitle } from '@/lib/flow/integrated-poc/repeat-line';
import { programViewScope } from '@/lib/flow/integrated-poc/view-scope';
import { ProgramGroupAddRow } from './ProgramGroupAddRow';
import { ProgramFolderList } from './ProgramFolderList';
import { programDatesNoticeAfterView, programMovedDayTarget, type ProgramDatesNoticeKeep } from '@/lib/flow/integrated-poc/dates-notice-keep';
import folderStyles from './ProgramFolderScreen.module.css';
import { programFolderAncestry, programFolderTaskGroups, programFolderTree, programFolderWritingDocuments, programTaskFolderId, PROGRAM_FOLDER_TASK_GROUPS,
  type ProgramFolderTaskGroupKey } from '@/lib/flow/integrated-poc/folder-screen';
import { addProgramFolderTodayTask, programFolderTodayPlace, programFolderTodayUndo, undoProgramFolderTodayTask, type ProgramFolderTodayUndo } from '@/lib/flow/integrated-poc/folder-today-add';
import { programPublicationDocumentEntry } from '@/lib/flow/integrated-poc/publication-management';
import { ProgramFolderTodayAdd } from './ProgramFolderTodayAdd';
import { ProgramFlowMark, ProgramIcon, programRepeatText } from './icons';
import { ProgramFlowThread } from './ProgramFlowThread';
import { programDocumentThread } from '@/lib/flow/integrated-poc/flow-thread';
import { mergeProgramTextWorkspace } from '@/lib/flow/integrated-poc/text-merge';
import { flushProgramEditorCollection, prepareProgramDocumentAction, type ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import type { AlphaStructuralDraft, AlphaStructuralEditorPort } from '@/lib/flow/integrated-poc/alpha-structural-recovery';
import { childDraftRecoveryEntries, type ProgramChildDraft } from '@/lib/flow/integrated-poc/child-draft-recovery';
import { textWorkspaceModel as M, type TextRow, type TextTask, type TextWorkspaceState } from '@/lib/flow/integrated-poc/text-workspace';
import { programErrorMessage, type ProgramMutate, type ProgramNavigate, type ProgramMutationResult, type ProgramDestination } from '@/lib/flow/integrated-poc/ui-contract';
import { emptyProgramRecurrencePresentation, programNavigationMatchesDocument, type ProgramSpaceNavigation } from '@/lib/flow/integrated-poc/navigation';
import { ProgramDocumentProvenance } from './ProgramDocumentProvenance';
import { ProgramPersonalAuthoring } from './ProgramPersonalAuthoring';
import { programRowPatchEnabled } from '@/lib/flow/integrated-poc/typing-row-patch';
import { applyProgramParseCache } from '@/lib/flow/integrated-poc/typing-parse-cache';
import { PROGRAM_DAY_CLOSE_HOUR, programDeferPlan, programFlowRuns, programRechecks, programTaskHasEveningRecord, readProgramDeferChoice, writeProgramDeferChoice,
  type ProgramDeferMode, type ProgramDeferPlan, type ProgramFlowRun, type ProgramRecheck } from '@/lib/flow/integrated-poc/flow-run-progress';
import { ProgramFlowRuns, ProgramRechecks } from './ProgramFlowRuns';
import { ProgramDeferAsk } from './ProgramDeferAsk';
import { ProgramDateSheet } from './ProgramDateSheet';
import { programRepeatNextDate, readProgramRepeatMarker } from '@/lib/flow/integrated-poc/repeat-line';

/** typelag ② (11/11): the 반복·Flow sheet stays mounted while closed, so its input survives closing; while it is closed
 *  (live false) it is not drawn again, so a key typed in the text no longer redraws its row per task. Opening draws it
 *  with the data of that moment. The row patch switch off keeps it live, as r3. */
const ProgramPersonalAuthoringSheet = React.memo(function ProgramPersonalAuthoringSheet(props: React.ComponentProps<typeof ProgramPersonalAuthoring> & { live: boolean }) {
  const { live, ...rest } = props;
  void live;
  return <ProgramPersonalAuthoring {...rest} />;
}, (_previous, next) => !next.live);
import { documentHasPersonalAuthoring, documentRepeatSeries } from '@/lib/flow/integrated-poc/personal-authoring';
import type { ProgramPmHostContext } from '@/lib/flow/integrated-poc/rea-pm/app-host';
import { programTextProgressTransition } from '@/lib/flow/integrated-poc/program-text-progress-transition';
import { programTextTransition } from '@/lib/flow/integrated-poc/program-text-transition';
import { ProgramTextEditor, type ProgramSourceFocus, type ProgramTextCommitOptions, type ProgramTextPosition, type ProgramTextSaveStatus } from './ProgramTextEditor';
import { extendProgramRecent, extendProgramRecentRaw, moveProgramRecentOffset, programRecentDone, programRecentDoneCount, programRecentFolds, programRecentHidden,
  programRecentHold, restrictProgramRecent, PROGRAM_RECENT_WRITING, type ProgramRecentDone, type ProgramRecentFold, type ProgramRecentHold } from '@/lib/flow/integrated-poc/recent-writing';
import { readProgramFolderRegions, programFolderAfterDocumentOpen } from '@/lib/flow/integrated-poc/folder-document-regions';
import { ProgramRecurrence } from './ProgramRecurrence';
import { ProgramRecurrencePlanRecovery } from './ProgramRecurrencePlanRecovery';
import { ProgramOutputReturn } from './ProgramOutputReturn';
import { ProgramTaskDocumentMove } from './ProgramTaskDocumentMove';
import { ProgramDocumentTrash, ProgramDocumentTrashAction } from './ProgramDocumentTrash';
import { moveProgramTaskDocument } from '@/lib/flow/integrated-poc/task-document-move';
import { setProgramDocumentTrashed } from '@/lib/flow/integrated-poc/document-lifecycle';
import { programSame } from '@/lib/flow/integrated-poc/controller';
import { programReviewOriginReason, type ProgramReviewSpacePort } from '@/lib/flow/integrated-poc/review-return';
import { programLocation } from '@/lib/flow/integrated-poc/navigation';
import { normalizeProgramWritingPosition } from '@/lib/flow/integrated-poc/writing-position';
import { programLegacyTaskQualityHold, programPreservesLegacyQualityHold } from '@/lib/flow/integrated-poc/legacy-map-review';
import { programPreservesLegacyPlanExcluded } from '@/lib/flow/integrated-poc/program-legacy-plan-target';
import { programPreservesSeriesMetadata, programSeriesMetadata } from '@/lib/flow/integrated-poc/recurrence-target';
import { programDocumentContentLock, programPreservesLockedDocumentContent, programReferenceExecutionAccess, createProgramReferenceExecutionAccess } from '@/lib/flow/integrated-poc/reference-execution-guard';
import { resolveAlphaPrivateTaskSchedule } from '@/lib/flow/integrated-poc/alpha-social/private-task-schedule';
import styles from './ProgramSpace.module.css';
import { programRecurrenceFocusId, resolveProgramRecurrencePlanFocus, type ProgramRecurrencePlanFocusRequest } from '@/lib/flow/integrated-poc/recurrence-plan-focus';
import { programTaskDateChangeHint } from '@/lib/flow/integrated-poc/text-context-presentation';
import { restoreProgramDialogFocus, type ProgramWritingReturn } from '@/lib/flow/integrated-poc/dialog-return-focus';
import { readProgramTaskOrigin } from '@/lib/flow/integrated-poc/task-origin-presentation';
import { addDocumentCollection, collectionDocumentIds, setDocumentCollectionLink, type DocumentCollections } from '@/lib/flow/integrated-poc/document-collections';
import { createProgramWritingEntry } from '@/lib/flow/integrated-poc/writing-entry';
import { createPendingProgramSourceNavigation } from '@/lib/flow/integrated-poc/pending-source-navigation';
import { programCheckpointForWritingTarget } from '@/lib/flow/integrated-poc/writing-navigation';
import { canClassifyProgramTask } from '@/lib/flow/integrated-poc/task-classification';
import { commitTaskDateWithUndo, moveProgramTaskLocation, readTaskLocationPolicy, undoProgramTaskLocation } from '@/lib/flow/integrated-poc/task-location-command';
import { programDateLineDefaults, programDateLineOutcomes, type ProgramDateLineChoice, type ProgramDateLineChoices } from '@/lib/flow/integrated-poc/date-property-migration';
import { programContinuationStarts } from '@/lib/flow/integrated-poc/continuation';
import { applyProgramTextCleanup, programCleanupArchiveDocument, programCleanupArchiveStamp, programCleanupWhen, programTextCleanupDocuments, programTextCleanupPlan, restoreProgramTextCleanup, type ProgramTextCleanupPlan } from '@/lib/flow/integrated-poc/text-cleanup';
// 총괄 11/12: the words when a restore is refused because a changed document was changed again since.
const PROGRAM_CLEANUP_CHANGED = "전환 뒤 바뀐 글이 있어 자동으로 되돌릴 수 없습니다. 보관함의 '전환 전 원문'에서 필요한 부분을 옮겨 쓰세요";

import { programDueLabel } from '@/lib/flow/integrated-poc/due-date';
import { programIsWaitTitle, programWaitStartable, startProgramWait } from '@/lib/flow/integrated-poc/wait-line';
import type { TaskLocationTarget } from '@/lib/flow/integrated-poc/task-location-move';
import { recallProgramTask } from '@/lib/flow/integrated-poc/task-recall-command';
import type { ProgramRecallCandidate, ProgramRecallLine } from '@/lib/flow/integrated-poc/task-recall';
import { programLineDateChips } from '@/lib/flow/integrated-poc/task-date-move';
import { programFolderPath } from '@/lib/flow/integrated-poc/folder-link-suggestions';
import { ProgramTaskMoveSheet } from './ProgramTaskMoveSheet';
import { ProgramTaskMoveContext } from './task-move-context';
import { programCopyHeader } from '@/lib/flow/integrated-poc/program-copy-header';
import { programImportTargets } from '@/lib/flow/integrated-poc/program-import-links';
import { programDateHeadIndex } from '@/lib/flow/integrated-poc/input-bar';
import { keepProgramMoveTraces, programMoveTraceKey } from '@/lib/flow/integrated-poc/task-move-trace';

export { programMobileWritingKeyboardOpen, useProgramMobileWritingChrome } from './useProgramMobileWritingChrome';

/** F10 W-ORDER-02: the documents (by account) already opened at today in this page visit; not again until a reload. */
const PROGRAM_TODAY_SHOWN = new Set<string>();
// typelag (나): the model's document parse cache follows this device's switch (on unless 'flowme:alpha:parse-cache' = 'off').
if (typeof window !== 'undefined') applyProgramParseCache();

/** The document sheet's selection-only surface: no navigation, creation or editor is mounted here. */
export function ProgramImportDocumentPicker({ data, actorId, copyDocumentId, pendingDocumentIds, onChoose, onClose }: {
  data: ProgramData; actorId: string; copyDocumentId?: string; pendingDocumentIds: () => string[];
  onChoose: (documentId: string) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), composing = useRef(false);
  const [draft, setDraft] = useState(''), [query, setQuery] = useState(''), [folder, setFolder] = useState('');
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null, node = dialog.current;
    node?.showModal();
    return () => { if (node?.open) node.close(); restoreProgramDialogFocus(opener); };
  }, []);
  const space = data.spaces[actorId];
  const rows = programImportTargets(data, actorId, copyDocumentId, pendingDocumentIds()).filter(doc =>
    (!folder || doc.folderId === folder) && (!query || (doc.title + '\n' + M.raw(doc)).toLocaleLowerCase().includes(query.toLocaleLowerCase())));
  return <dialog ref={dialog} className={styles.findDialog} aria-label="넣을 문서 고르기" onCancel={event => { event.preventDefault(); if (!composing.current) onClose(); }}>
    <div className={styles.findHeading}><h2>넣을 문서 고르기</h2><button type="button" onClick={() => { if (!composing.current) onClose(); }}>닫기</button></div>
    <label className={styles.field}>내 문서·할 일 찾기<input autoFocus type="search" value={draft}
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={event => { composing.current = false; setQuery(event.currentTarget.value); }}
      onChange={event => { setDraft(event.target.value); if (!composing.current && !(event.nativeEvent as InputEvent).isComposing) setQuery(event.target.value); }} /></label>
    <label className={styles.field}>글 안의 폴더 범위<select value={folder} onChange={event => setFolder(event.target.value)}><option value="">전체 글</option>{space?.text.folders.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label>
    <ul className={styles.documents}>{rows.map(row => <li key={row.id}><button type="button" aria-disabled={!!row.reason} onClick={() => {
      const current = programImportTargets(data, actorId, copyDocumentId, pendingDocumentIds()).find(doc => doc.id === row.id);
      if (current && !current.reason) onChoose(row.id);
    }}>{row.title}<small>{row.reason ?? row.folder}</small></button></li>)}</ul>
    {!rows.length && <p className={styles.muted}>넣을 수 있는 문서가 없습니다.</p>}
  </dialog>;
}

export type ProgramSpaceCapabilities = {
  discovery?: boolean;
  publication?: boolean;
  copyInspection?: boolean;
  revisionHistory?: boolean;
  creatorNavigation?: boolean;
  /** Existing private text aggregate stores explicit ownership for ordinary canonical Items. */
  taskClassification?: boolean;
};
export type ProgramSpaceProps = {
  nativeAuthoringEnabled?:boolean;
  writingCompute?:WritingCompute;writingContext?:()=>{ownerId:string;baseRevision:number};
  data: ProgramData; mutate: ProgramMutate; navigate: ProgramNavigate; today: string;
  /** Omitted capabilities preserve the local PoC. Authenticated shells opt in to their available routes. */
  capabilities?: ProgramSpaceCapabilities;
  /** Presentation slots only: authority and recovery remain owned by the host. */
  noteHeader?: React.ReactNode;
  /** W11: the note header shows a notice line (saved input or the development notice); the new-document line
   *  then stays for screen readers only, so one notice line shows around the title. */
  noteNoticeShown?: boolean;
  noteStatus?: React.ReactNode;
  selectedDocumentId?: string; onUndo: () => Promise<void>; onRedo: () => Promise<void>;
  /** C6a: the space is picking rows (고르기); the host refuses its own writes meanwhile. */
  onSelectingChange?: (selecting: boolean) => void;
  /** C6a: the host's own operation runs (its undo/redo, a recheck, a read): 고르기 waits for it. */
  hostBusy?: () => boolean;
  outputReturn?: ProgramDestination;
  /** int4 (F5-b): `step` is where the publish steps open ('refine' resumes a draft). */
  onPublishDocument?: (documentId: string, step?: 'pick' | 'refine') => void;
  onInspectCopy?: (copyId: string) => void;
  onOpenCopySource?: (flowId: string, documentId: string, returnFocus?: HTMLElement) => void;
  onBrowseFlows?: (documentId?: string, returnFocus?: HTMLElement, writing?: ProgramWritingReturn) => void;
  /** UX B1 (11/6): a new document's arrival notice uses the same slot with its own button (되돌리기). */
  importNotice?: { actorId: string; documentId: string; lineId?: string; text: string; busy: boolean; onCancel?: () => void; actionLabel?: string; busyLabel?: string;
    /** Flow pipeline S2: [달력에서 보기] — the month of `first`, that day chosen, this Flow's days marked (S3). */
    calendar?: { first: string; title: string; count: number };
    /** Core3 P2b/P2c (FIG 13): a Flow's arrival is said as the bottom toast (ink, white words) while `open`; once it
     *  closed, its [되돌리기] stays at the end of the copy's source line. */
    toast?: { open: boolean; onClose: () => void; hold: ToastHold } };
  onRevisionHistory?: (documentId: string) => void;
  onOutputDocument?: (documentId: string) => void;
  onStartReview?: (documentId: string) => Promise<void>;
  onRegisterReviewSpace?: (port: ProgramReviewSpacePort | null) => void;
  onRegisterEditors?: (editors: (ProgramEditorFlush & AlphaStructuralEditorPort) | null) => void;
  /** Some document editor holds input it refused or failed to save. */
  onInputFailureChange?: (failed: boolean) => void;
  /** N7: input an editor refused and put back, for the tab's 복구함. */
  onKeepRefusedInput?: (draft: { title: string; raw: string; documentId?: string }) => boolean;
  onRegisterNavigation?: (navigation: ProgramSpaceNavigation | null) => void;
  /** R8b: the host draws the main tabs (쓰기·오늘·폴더) and chooses one through this port. The space's own
   *  period state stays here; this is not onRegisterNavigation, so source opens keep their focus path. */
  onRegisterMainTabs?: (port: { choose(tab: ProgramMainTab): Promise<boolean>; openArchive(): Promise<boolean> } | null) => void;
  /** Which main tab the space now shows, for the host's tabs. */
  onMainTabChange?: (tab: ProgramMainTab) => void;
  /** Core3 P1 fix: which document the writing screen has open ('' for none), also when the address names none. */
  onOpenDocumentChange?: (documentId: string) => void;
  /** The host draws the main tabs, so the space's own tab row stays hidden. */
  hostMainTabs?: boolean;
  /** Local view changes do not call mutate; the host must expose held authority. */
  canContinueWholeDocument?: () => boolean;
  /** Wait only the already-running private operation before an explicit source return. */
  awaitSourceReturnReady?: () => Promise<boolean>;
  /** Whether awaitSourceReturnReady would wait right now, so the wait can be shown at once. */
  sourceReturnWaits?: () => boolean;
  /** Show or clear the host's notice for a source open that is waiting. */
  onSourceReturnQueued?: (queued: boolean) => void;
  sourceReturnEpoch?: object;
  /** Supplied only by the explicit synthetic Alpha entry in this candidate. */
  pmTextHost?: ProgramPmHostContext;
  /** Optional whole-document links supplied by a local or account-owned browser host. */
  documentCollections?: { state: DocumentCollections; onChange: (next: DocumentCollections) => Promise<boolean>; initialWritingDocumentId?: string };
};
export type ProgramMainTab = 'documents' | 'today' | 'all';
/** The main tab a period belongs to: week, month and date-less are under 오늘. */
export const programMainTabOf = (period: ProgramPeriod): ProgramMainTab => period === 'documents' || period === 'all' ? period : 'today';
type Detail = { kind: 'task'; id: string } | { kind: 'folder'; id: string } | { kind: 'connect'; docId: string; lineId: string | null; insertAfter: boolean } | null;
/** 11/5 쓰기 '최근만 쓰기': what one document's editor gets in the recent view. */
type ProgramRecentView = { hold: ProgramRecentHold; hidden: Set<string>; workspace: TextWorkspaceState; folds: ProgramRecentFold[]; done: ProgramRecentDone };
type LibraryWritingHandoff = { epoch: number; documentId: string; folderId: string; focusOwner: Element | null };
/** The list view a row's title opened its source from, and where that row sat on screen. */
type SourceOrigin = { actorId: string; documentId: string; taskId: string; top: number | null; scrollY: number;
  /** An occurrence's row, by its list key (it has no task ID). */
  rowKey?: string;
  /** C5: opened from the calendar, with the day open in its sheet or panel. */
  view: { period: ProgramPeriod; date: string; folderId: string; query: string; monthView?: 'grid'; dayOpen?: boolean;
    /** F4-a: opened from a folder's [할 일] (else the 폴더 tab's list). */
    folderOpen?: boolean } };
const MONTH_VIEW_KEY = 'flow:poc:personal-workspace:v1:month-view';
/** PRD X1~X4 (11/8, user's choice): the writing head's 날짜별 | 폴더별 and its folder chips are held back until the folder
 *  screen is redesigned. A folder line's ⋮ (이 폴더만 모아 보기 · 분류에서 이 폴더 보기) and the 분류 tab stay; the
 *  device's last gathered folder (VIEW_FOLDER_KEY) is left as it is and no longer read. */
export const PROGRAM_WRITING_VIEW_SWITCH = false;
const CARRY_OPEN_KEY = 'flow:alpha:carryover-open:v1';
const periods: [ProgramPeriod, string][] = [['documents', '쓰기'], ['today', '오늘'], ['week', '주간'], ['month', '월간'], ['all', '폴더'], ['undated', '날짜 미정']];
const mainPeriods: [ProgramPeriod, string][] = [['documents', '쓰기'], ['today', '오늘'], ['all', '폴더']];
export const PROGRAM_EMPTY_EXAMPLE = '이번 주 준비\n- [ ] 확인할 일\n  - [ ] 먼저 확인할 내용\n자유롭게 적는 메모';
// A06 / V41-004–005: restore the approved v4.1 touch thresholds, not a new policy.
export const PROGRAM_MOVE_GESTURE_V1 = Object.freeze({ version: 1, holdMs: 350, cancelDistancePx: 8 });
/** F12 1차: how long the day close's date sheet, opened by a long press, ignores picks (the lifting finger's tap). */
export const PROGRAM_CLOSE_SHEET_SETTLE_MS = 500;
// U44: a tablet held sideways (a touch screen; a PC or laptop of the same size keeps its layout). The writing screen's
// title and ⋯ share the editor's tool line there; phones, portrait screens and taller ones keep the title line.
// A tap on 글 찾기 or the title while a composition or a document action is on: the find waits, and says so until then.
const FIND_BLOCKED = '입력과 저장을 마친 뒤 글 찾기를 열어 주세요. 현재 입력은 그대로 있습니다.';
/** P3-F4B-2: '＋ 오늘 할 일' after another tab or device saved first (the field's words are not kept by a reload). */
const FOLDER_TODAY_CONFLICT = '다른 곳에서 먼저 바뀌어 적지 않았습니다. 칸의 글을 복사해 두고 새로고침한 뒤 다시 적어 주세요.';
export const PROGRAM_TABLET_HEAD_QUERY = '(min-width: 1000px) and (max-height: 900px) and (orientation: landscape) and (pointer: coarse)';
// Visual A (11/7): a phone takes the same one head line ([title] … [↶][＋][⋯]); its ⋯ also holds the document's own
// actions (글 작업), so the line has one menu.
export const PROGRAM_PHONE_HEAD_QUERY = '(max-width: 700px)';
let tabletHeadQuery: MediaQueryList | null = null, phoneHeadQuery: MediaQueryList | null = null;
const tabletHead = () => tabletHeadQuery ??= window.matchMedia(`${PROGRAM_TABLET_HEAD_QUERY}, ${PROGRAM_PHONE_HEAD_QUERY}`);
const phoneHead = () => phoneHeadQuery ??= window.matchMedia(PROGRAM_PHONE_HEAD_QUERY);
function watchPhoneHead(change: () => void) { const query = phoneHead(); query.addEventListener('change', change); return () => query.removeEventListener('change', change); }
function watchTabletHead(change: () => void) { const query = tabletHead(); query.addEventListener('change', change); return () => query.removeEventListener('change', change); }

function initialProgramDocumentId(props: ProgramSpaceProps, space: ProgramPrivateSpace) {
  const remembered = props.selectedDocumentId ?? space.position.documentId;
  if (remembered !== null && remembered !== undefined) return remembered;
  const initialId = props.documentCollections?.initialWritingDocumentId;
  if (!initialId) return '';
  const retained = new Set(Object.values(space.retentionDocuments ?? {}));
  const document = space.text.documents.find(doc => doc.id === initialId);
  return document && !space.archivedDocumentIds.includes(document.id) && !space.documentTrash?.[document.id]
    && !retained.has(document.id) ? document.id : '';
}

function sameScheduleWorkspace(before: TextWorkspaceState, expected: TextWorkspaceState, actual: TextWorkspaceState) {
  if (!M.validate(actual)) return false;
  const comparable = programClone(expected);
  const priorIds = new Set([...before.documents, ...before.flows].flatMap(doc => doc.lines.map(line => line.id)));
  // The existing serializer gives new date/time properties fresh IDs. Every
  // original row ID and every other workspace field must still match exactly.
  for (const doc of [...comparable.documents, ...comparable.flows]) {
    const incoming = M.getDocument(actual, doc.id); if (!incoming) return false;
    for (let index = 0; index < doc.lines.length; index++) {
      const line = doc.lines[index]; if (priorIds.has(line.id)) continue;
      const row = incoming.lines[index]; if (!row || priorIds.has(row.id)) return false;
      line.id = row.id;
    }
  }
  return programSame(comparable, actual);
}

/** Codex f12a review P2-3, 기타 F4 (11/12): today and the hour from one clock (day-clock.ts), so a screen left open across
 *  midnight or 18:00 moves on by itself; until the clock runs (and in a server render) the host's today stands. */
function useProgramDayClock(hostToday: string): { today: string; hour: number } {
  const [clock, setClock] = useState<ProgramDayClock | null>(null);
  useEffect(() => startProgramDayClock({
    now: () => new Date(), setTimeout: (run, ms) => window.setTimeout(run, ms), clearTimeout: timer => window.clearTimeout(timer as number),
    onVisible: run => {
      const shown = () => { if (document.visibilityState === 'visible') run(); };
      document.addEventListener('visibilitychange', shown); window.addEventListener('focus', run); window.addEventListener('pageshow', run);
      return () => { document.removeEventListener('visibilitychange', shown); window.removeEventListener('focus', run); window.removeEventListener('pageshow', run); };
    },
  }, setClock), []);
  return { today: programLaterToday(hostToday, clock?.date ?? null), hour: clock?.hour ?? new Date().getHours() };
}

/** Redesign 1 + 3: the accounts asked about their writing cleanup in this page load (an app open asks once). */
const programTextCleanupAsked = new Set<string>();

export function ProgramSpace(props: ProgramSpaceProps) {
  const dayClock = useProgramDayClock(props.today);
  const { data } = props, today = dayClock.today, actorId = data.activeActorId, space = data.spaces[actorId];
  // typelag (11/11): the tasks of the saved text, read once per text (the screen draws again at every key; the band
  // asked them again for each of its rows). Read only.
  const textTasks = useMemo(() => M.tasks(space.text), [space.text]);
  // Redesign 4: 'n일째' counts from the day a task's 이어감 chain began (총괄 11/12).
  const continuationStarts = useMemo(() => programContinuationStarts(space.text), [space.text]);
  // 첫인상 (11/7): read here, not inside a branch; empty unless the official list was read (Alpha only).
  const officialActors = useAlphaOfficialActors();
  // C6a review: every save of the space goes through here. Each is counted while it waits (고르기 does not start during
  // one), and while picking it is refused, with undo/redo: 고르기 changes nothing. A document's own commit is counted only.
  const selectingNow = useRef(false), [savesPending, setSavesPending] = useState(0);
  const countedMutate: ProgramMutate = async (label, build, options) => { setSavesPending(count => count + 1); try { return await props.mutate(label, build, options); } finally { setSavesPending(count => count - 1); } };
  const mutate: ProgramMutate = (label, build, options) => selectingNow.current ? Promise.resolve({ ok: false, reason: 'busy' })
    : countedMutate(label, build, options).then(result => { if (result.ok && result.changed !== false) setDatesNotice(null); return result; })
      // N11a: another save ends the 밀린 일 notice too (its 되돌리기 would be refused by then anyway); F4-b's as well.
      .then(result => { if (result.ok && result.changed !== false) { setCarryNotice(null); setFolderTodayNotice(null); setLocationNotice(null); } return result; });
  const countedHistory = async (run: () => Promise<void>) => { setSavesPending(count => count + 1); try { await run(); } finally { setSavesPending(count => count - 1); } };
  const onUndo = () => selectingNow.current ? Promise.resolve() : countedHistory(props.onUndo), onRedo = () => selectingNow.current ? Promise.resolve() : countedHistory(props.onRedo);
  const writingAccess=useMemo(()=>createProgramReferenceExecutionAccess(space,actorId),[space,actorId]);
  // A PM save port does not establish full-document editing support. Keep the
  // existing complete writer for this route, without swapping owners on ACKs,
  // host readiness, content changes or composition. The isolated PM stays intact.
  const TextEditor = ProgramTextEditor;
  const dataRef = useRef(data); dataRef.current = data;
  const classificationRequest = useRef(false);
  const [classificationCreating, setClassificationCreating] = useState(false);
  const scheduleMounted = useRef(true);
  const scheduleAcknowledgment = useRef<{ actorId: string; before: ProgramPrivateSpace; after: ProgramPrivateSpace;
    beforeData: ProgramData; afterData: ProgramData; detail: boolean;
    accept?: (workspace: TextWorkspaceState | null) => void; timeout?: ReturnType<typeof setTimeout> } | null>(null);
  // N11a 결정 2: opened again three days or more since this device last did, the first screen is 오늘.
  const [opening] = useState(() => { let storage: Storage | null = null; try { storage = window.localStorage; } catch { /* no storage */ } return programOpening(storage, today); });
  const [period, setPeriod] = useState<ProgramPeriod>(() => opening.first ? 'today' : 'documents');
  // Writing tools are workspace-wide. The Flow·repeat box shows where the document already has
  // personal authoring, or after the ＋ menu asks for it; that ask is screen-only, never stored.
  const [authoringRequests, setAuthoringRequests] = useState<string[]>([]);
  const authoringBox = useRef<HTMLDivElement | null>(null), revealAuthoringBox = useRef(false);
  function requestPersonalAuthoring(id: string) {
    // Under the host tabs the Flow·반복 box is a sheet the toolbar's 반복 opens (R8b); it stays mounted, so its input survives closing.
    if (props.hostMainTabs) { const sheet = authoringSheet.current; if (sheet && !sheet.open) { sheet.showModal(); setAuthoringSheetOpen(true); } return; }
    revealAuthoringBox.current = true; setAuthoringRequests(previous => [...previous.filter(value => value !== id), id]);
  }
  const authoringSheet = useRef<HTMLDialogElement | null>(null);
  // typelag ② (11/11): with the row patch switch on, the closed sheet is not drawn again on each key (see below).
  const [authoringSheetOpen, setAuthoringSheetOpen] = useState(false), [rowPatch] = useState(() => programRowPatchEnabled());
  /** "반복 2" when the document has live repeats, else "반복". */
  // Asked on every render of the writing view, a key typed among them (11/5 '최근만 쓰기' profile: a whole read of a
  // long document each time), so kept while the text and the repeat plans are the same.
  const repeatLabels = useRef(new WeakMap<TextWorkspaceState, Map<string, { owner: typeof space.personalAuthoring; label: string }>>());
  function repeatLabel(id: string) {
    const known = repeatLabels.current.get(space.text)?.get(id);
    if (known && known.owner === space.personalAuthoring) return known.label;
    const taskIds = M.rowMeta(space.text, id).flatMap(row => row.kind === 'task' ? [row.isReference ? row.taskId ?? '' : row.id] : []);
    const count = documentRepeatSeries(space.personalAuthoring, id, taskIds).length, label = count ? `반복 ${count}` : '반복';
    if (!repeatLabels.current.has(space.text)) repeatLabels.current.set(space.text, new Map());
    repeatLabels.current.get(space.text)!.set(id, { owner: space.personalAuthoring, label });
    return label;
  }
  useEffect(() => {
    if (!revealAuthoringBox.current) return; revealAuthoringBox.current = false;
    const box = authoringBox.current?.querySelector<HTMLDetailsElement>(':scope > details:last-of-type');
    if (box) { box.open = true; box.scrollIntoView({ block: 'nearest' }); }
  }, [authoringRequests]);
  function showsPersonalAuthoring(id: string) {
    if (authoringRequests.includes(id)) return true;
    const taskIds = M.rowMeta(space.text, id).flatMap(row => row.kind === 'task' ? [row.isReference ? row.taskId ?? '' : row.id] : []);
    return documentHasPersonalAuthoring(space.personalAuthoring, id, taskIds)
      || textTasks.some(task => task.docId !== id && taskIds.includes(task.id));
  }
  const [date, setDate] = useState(today), [folderId, setFolderId] = useState(''), [query, setQuery] = useState('');
  // P2-3, 기타 F4: past midnight a view on the day that was today moves to the new today (left on yesterday, 오늘 showed
  // none of its progress lines, rechecks or day close).
  const shownToday = useRef(today);
  useEffect(() => { const was = shownToday.current; shownToday.current = today; if (was !== today) setDate(current => programFollowToday(current, was, today)); }, [today]);
  /** F4-a (11/9): the 폴더 tab's open folder — its [할 일] (period 'all', the folder as folderId; '' is 모든 할 일) or its
   *  [글] (period 'documents' with the folder's parts gathered in the document shown, as 이 폴더만 모아 보기 did). Null on
   *  the folder list. `writing`: the document 쓰기 showed before [글] took the editor (it comes back with 쓰기);
   *  `shown`: the document [글] keeps open. */
  type FolderScreen = { tab: 'tasks' | 'writing'; writing: string; shown: string | null };
  const [folderScreen, setFolderScreenState] = useState<FolderScreen | null>(null), folderScreenRef = useRef<FolderScreen | null>(null);
  const setFolderScreen = (next: FolderScreen | null) => { folderScreenRef.current = next; setFolderScreenState(next); };
  /** The folder opened last (the list's selected row on a wide screen; its parents stay unfolded in a long list). */
  const [lastFolder, setLastFolder] = useState('');
  const [folderStatus, setFolderStatus] = useState<{ label: string; warn: boolean } | null>(null);
  /** 폴더 관리's 삭제 asks once (the folder it asks about). */
  const [folderDeleteAsk, setFolderDeleteAsk] = useState<string | null>(null);
  /** [할 일]'s '끝낸 일 n개' (folded; a folder opens folded). */
  const [folderDoneOpen, setFolderDoneOpen] = useState(false);
  useEffect(() => { setFolderDoneOpen(false); }, [folderId, !!folderScreen]);
  /** F4-b (FR-7): [할 일]'s '＋ 오늘 할 일' field (open or not), what is said under it when a line could not be written,
   *  and the notice after a line with its 되돌리기. A view change closes them. */
  const [folderTodayOpen, setFolderTodayOpen] = useState(false), [folderTodayWarn, setFolderTodayWarn] = useState<string | null>(null);
  const folderTodayConflict = useRef(false);
  type FolderTodayNotice = { actorId: string; text: string; undo: ProgramFolderTodayUndo | null; refused?: boolean; undone?: boolean };
  const [folderTodayNotice, setFolderTodayNotice] = useState<FolderTodayNotice | null>(null), [folderTodayPending, setFolderTodayPending] = useState(false);
  useEffect(() => { setFolderTodayOpen(false); setFolderTodayWarn(null); setFolderTodayNotice(null); }, [actorId, folderId, !!folderScreen, folderScreen?.tab]);
  /** FR-1: an open folder (or its other tab) starts at the top — once the new screen is drawn (a frame before it, the old
   *  screen's height could leave the page part way down). */
  const [folderTop, setFolderTop] = useState(0);
  useEffect(() => { if (folderTop) window.scrollTo(0, 0); }, [folderTop]);
  /** 7k stage 1: the folder the writing view last gathered (its folderId while 쓰기 was shown), for the 쓰기 tab. */
  const writingFolder = useRef('');
  useEffect(() => { if (period === 'documents' && !folderScreen) writingFolder.current = folderId; }, [period, folderId, !!folderScreen]);
  const [queryDraft, setQueryDraft] = useState(''), queryComposing = useRef(false);
  useEffect(() => { if (!queryComposing.current) setQueryDraft(query); }, [query]);
  const [collectionId, setCollectionId] = useState(''), [quickDocumentId, setQuickDocumentId] = useState('');
  const collectionMode = props.documentCollections;
  const [selected, setSelected] = useState(() => initialProgramDocumentId(props, space));
  const [opened, setOpened] = useState<string[]>(selected ? [selected] : []);
  // Redesign 1 + 3 (W-TXT-01·03, 총괄 11/12): the account's writing brought to the new rules once (progress into [n%], the
  // '- 날짜:' lines), as one list asked when the app opens. [바꾸기]: a snapshot, then one save; [되돌리기]: one save back.
  // [나중에]: asked again the next time the app opens (a tab change does not ask).
  const [cleanupAsk, setCleanupAsk] = useState<{ actorId: string; plan: ProgramTextCleanupPlan; choices: ProgramDateLineChoices } | null>(null);
  const cleanupDialog = useRef<HTMLDialogElement>(null), [cleanupPending, setCleanupPending] = useState(false);
  const [cleanupNotice, setCleanupNotice] = useState<{ actorId: string; documents: number; stamp: string; undone?: boolean; refused?: string } | null>(null);
  const [detail, setDetail] = useState<Detail>(null), [message, setMessage] = useState('');
  const [writingNotice, setWritingNotice] = useState<{ actorId: string; documentId: string; text: string } | null>(null);
  const [viewChangeNotice, setViewChangeNotice] = useState<{ actorId: string; reason: 'composition' | 'recurrence' | 'saving' | 'save-failed' | 'pending' } | null>(null);
  const [taskNotice, setTaskNotice] = useState<{ taskId: string; title: string; text: string } | null>(null);
  const taskMoveGate=useContext(ProgramTaskMoveContext);
  const [detailFolderMove,setDetailFolderMove]=useState(false),[locationPending,setLocationPending]=useState(false);
  type LocationNotice={actorId:string;documentId:string;taskId:string;before:TextWorkspaceState;after:TextWorkspaceState;date:string|null;folderId:string;text:string;kind:TaskLocationTarget['kind'];scheduleUndo?:()=>Promise<boolean>;traceId?:string};
  /** W-MENU-27: the trace store of this device (null when the browser keeps none). */
  const traceStorage=()=>{try{return window.localStorage;}catch{return null;}};
  const [locationNotice,setLocationNotice]=useState<LocationNotice|null>(null);
  const [recallNotice, setRecallNotice] = useState<{ actorId: string; documentId: string; before: TextWorkspaceState; after: TextWorkspaceState; text: string; redo: boolean } | null>(null);
  const locationBusy=useRef(false);
  // I7: the notice after '시간순으로', holding the arrays it removed for its 되돌리기, or why that was refused.
  type OrderNotice = { actorId: string; removed: ProgramDayOrder; hidden: number; refused?: string; shownAt: number };
  const [orderNotice, setOrderNotice] = useState<OrderNotice | null>(null);
  const [orderNoticeHeld, setOrderNoticeHeld] = useState(false), [orderPending, setOrderPending] = useState(false);
  const orderBusy = useRef(false);
  // C6a 여러 개 고르기: the picked rows (list keys), the row pressed last (for Shift ranges), and what comes back on the
  // way out (the page's scroll; the calendar, when it started there). None of it is saved.
  // C6b: and what each picked task was when it was picked (its date, time and whole state), the move's expectation.
  type Selecting = { keys: ReadonlySet<string>; expected: ReadonlyMap<string, { taskId: string; date: string | null; time: string; state?: string }>; anchor: string | null; scrollY: number; calendar: boolean };
  const [selecting, setSelecting] = useState<Selecting | null>(null), [selectNotice, setSelectNotice] = useState<string | null>(null);
  const selectScrollBack = useRef<number | null>(null);
  // C6b: the date sheet, the one save it makes (pressed once), and its notice with 되돌리기.
  // Codex f12a review P1 (11/12): `lines`, a list with no copy's task: 되돌리기 puts each task's lines back exactly.
  type DatesNotice = { actorId: string; count: number; date: string | null; undo: ProgramTaskDateMove[]; lines?: ProgramTaskDateLines[] | null; taskIds: string[]; shownAt: number; refused?: string; undone?: boolean;
  /** F12 1차 (W-FLOW-09): a Flow step and the steps after it moved together say so in their own words. */
  text?: string };
  const datesSheet = useRef<HTMLDialogElement>(null), datesBusy = useRef(false), [datesPending, setDatesPending] = useState(false);
  // N10: a repeat round finished from 오늘 ('다음은 …' with 되돌리기), and the old one-task repeat's card.
  const [repeatNotice, setRepeatNotice] = useState<{ actorId: string; text: string; check: ProgramRepeatCheck | null; refused?: boolean } | null>(null);
  // F8 1단계 (CO-3 표시): '같은 일 n줄' — the notice after checking them all (its 되돌리기), and the sheet listing them.
  const [sameNotice, setSameNotice] = useState<{ actorId: string; ids: string[]; proof: ProgramSameTaskProof; undone?: boolean; refused?: boolean } | null>(null);
  const [sameSheet, setSameSheet] = useState<string | null>(null);
  const sameSheetRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { const sheet = sameSheetRef.current; if (!sheet) return; if (sameSheet && !sheet.open) sheet.showModal(); else if (!sameSheet && sheet.open) sheet.close(); }, [sameSheet]);
  const [legacyRepeatLater, setLegacyRepeatLater] = useState(false), [legacyRepeatNotice, setLegacyRepeatNotice] = useState<string | null>(null);
  const [datesNotice, setDatesNotice] = useState<DatesNotice | null>(null), [datesNoticeHeld, setDatesNoticeHeld] =useState(false);
  useEffect(() => {
    if (!datesNotice) return;
    const ends = programNoticeEndsAt({ tone: datesNotice.refused ? 'warn' : datesNotice.undone ? 'info' : 'choose', shownAt: datesNotice.shownAt, leftBlockAt: null, held: datesNoticeHeld });
    if (ends === null) return;
    const timer = setTimeout(() => setDatesNotice(current => current === datesNotice ? null : current), Math.max(0, ends - Date.now()));
    return () => clearTimeout(timer);
  }, [datesNotice, datesNoticeHeld]);
  // N11a 밀린 일: the card over 지난 미완료 (folded unless this device opened it), its one save, and the notice holding
  // what 되돌리기 puts back (until another save or a change of view).
  type CarryNotice = { actorId: string; text: string; before: ProgramCarryoverBefore | null; after: string; refused?: boolean; undone?: boolean; undatedView?: boolean; shownAt: number };
  // N11b 하나씩 정리: the card's sheet, the tasks it lists and what is chosen for each (nothing saved until 이대로 정리).
  const carrySheet = useRef<HTMLDialogElement>(null);
  const [carryItems, setCarryItems] = useState<ProgramCarryoverItem[] | null>(null), [carryChoices, setCarryChoices] = useState<ReadonlyMap<string, ProgramCarryoverChoice>>(new Map());
  // QA F1: the space the sheet showed (its save is planned on that, with the tokens of what was shown), and why it was
  // shown again (another device changed a line of it first).
  const [carrySheetSpace, setCarrySheetSpace] = useState<ProgramPrivateSpace | null>(null), [carrySheetNote, setCarrySheetNote] = useState<string | null>(null);
  // The space the last save was built on (the newest the save saw), to show the sheet again from after a refusal.
  const carrySeen = useRef<ProgramPrivateSpace | null>(null);
  const [carryNotice, setCarryNotice] = useState<CarryNotice | null>(null), [carryNoticeHeld, setCarryNoticeHeld] = useState(false);
  const carryBusy = useRef(false), [carryPending, setCarryPending] = useState(false);
  // 오늘 탭 ② (W-CARRY-12, mockup ③): after the morning press, 'n개 이어 씀 (… 옮김 · … 복사) · 되돌리기' stays under the
  // head while the writing is as that save left it (its 되돌리기 is exact).
  const [morningDone, setMorningDone] = useState<{ actorId: string; text: string; before: ProgramCarryoverBefore; after: string } | null>(null);
  const [carryOpen, setCarryOpenState] = useState(false);
  useEffect(() => { try { if (localStorage.getItem(CARRY_OPEN_KEY) === 'open') setCarryOpenState(true); } catch { /* folded, then */ } }, []);
  const setCarryOpen = (open: boolean) => { setCarryOpenState(open); try { localStorage.setItem(CARRY_OPEN_KEY, open ? 'open' : 'folded'); } catch { /* kept for this visit */ } };
  useEffect(() => {
    if (!carryNotice) return;
    const ends = programNoticeEndsAt({ tone: carryNotice.refused ? 'warn' : carryNotice.before ? 'choose' : 'info', shownAt: carryNotice.shownAt, leftBlockAt: null, held: carryNoticeHeld });
    if (ends === null) return;
    const timer = setTimeout(() => setCarryNotice(current => current === carryNotice ? null : current), Math.max(0, ends - Date.now()));
    return () => clearTimeout(timer);
  }, [carryNotice, carryNoticeHeld]);
  // C2: a check tap still completes at once; its notice offers 되돌리기 and 진행률로 (then the percent chips) for that
  // task, by ID. 10s, held while pressed or focused. [직접] opens the detail with its 진행 기록 open.
  // W-CARRY-10 (총괄 11/12): `proof`, the line and its record of that day before the notice's first save and after its last;
  // 되돌리기 puts them back exactly (a record the check added goes, one it changed gets its value back, other days' stay).
  type CheckNotice = ProgramCheckNotice & { actorId: string; proof?: ProgramSameTaskProof | null };
  const [checkNotice, setCheckNotice] = useState<CheckNotice | null>(null), [checkNoticeHeld, setCheckNoticeHeld] = useState(false);
  const checkNoticeRef = useRef(checkNotice); checkNoticeRef.current = checkNotice;
  const checkNoticeKeys = useRef(0), checkStepBusy = useRef(false), [directProgress, setDirectProgress] = useState(false);
  useEffect(() => {
    if (!checkNotice) return;
    const ends = programCheckNoticeEndsAt(checkNotice, checkNoticeHeld);
    if (ends === null) return;
    const timer = setTimeout(() => setCheckNotice(current => current === checkNotice ? null : current), Math.max(0, ends - Date.now()));
    return () => clearTimeout(timer);
  }, [checkNotice, checkNoticeHeld]);
  // The notice sits at the bottom of the screen (the list's sticky place), so the row it names is scrolled up above it.
  useEffect(() => {
    if (!checkNotice) return;
    const frame = requestAnimationFrame(() => {
      const box = root.current?.querySelector<HTMLElement>('[data-check-notice]');
      const line = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-task-id]') ?? []).find(element => element.dataset.taskId === checkNotice.targetId);
      const over = box && line ? line.getBoundingClientRect().bottom - box.getBoundingClientRect().top : 0;
      if (over > 0) (line?.closest('dialog') ?? window).scrollBy({ top: over + 8, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [checkNotice?.key]);
  // A check notice button pressed while Korean is being composed on the page (the ＋ line, say) runs once that
  // composition has ended, as the editor's notice buttons do (W15): the composed text stays whole.
  const pageComposing = useRef(false), heldCheckStep = useRef<(() => void) | null>(null);
  // N11a: [오늘로 옮기기] is off while Korean is being composed anywhere on the page.
  const [composingShown, setComposingShown] = useState(false);
  useEffect(() => {
    const start = () => { pageComposing.current = true; setComposingShown(true); };
    const end = () => { pageComposing.current = false; setComposingShown(false); const held = heldCheckStep.current; heldCheckStep.current = null; if (held) setTimeout(held, 0); };
    document.addEventListener('compositionstart', start, true); document.addEventListener('compositionend', end, true);
    return () => { document.removeEventListener('compositionstart', start, true); document.removeEventListener('compositionend', end, true); };
  }, []);
  const whenPageComposed = (run: () => void) => () => {
    const focused = document.activeElement as HTMLElement | null;
    if (pageComposing.current && !!focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA' || focused.isContentEditable)) { heldCheckStep.current = run; return; }
    run();
  };
  useEffect(() => {
    const top = selectScrollBack.current;
    if (selecting || top === null) return;
    selectScrollBack.current = null;
    const frame = requestAnimationFrame(() => window.scrollTo({ top, behavior: 'instant' }));
    return () => cancelAnimationFrame(frame);
  }, [selecting]);
  // W15 rules: a plain notice lasts 6s, held while pressed or focused; a refusal stays until closed.
  useEffect(() => {
    if (!orderNotice) return;
    const ends = programNoticeEndsAt({ tone: orderNotice.refused ? 'warn' : 'info', shownAt: orderNotice.shownAt, leftBlockAt: null, held: orderNoticeHeld });
    if (ends === null) return;
    const timer = setTimeout(() => setOrderNotice(current => current === orderNotice ? null : current), Math.max(0, ends - Date.now()));
    return () => clearTimeout(timer);
  }, [orderNotice, orderNoticeHeld]);
  // C5: the month as a list or a calendar (the last choice, on this device only), the day open in a narrow screen's
  // sheet, and the content's width: from 840px the day sits in a panel beside the grid, from 761px cells show titles.
  const [monthView, setMonthViewState] = useState<'list' | 'grid'>('list');
  const [dayOpen, setDayOpen] = useState(false), [monthWidth, setMonthWidth] = useState(0);
  // Flow pipeline S3: the Flow just taken, marked on the month's days. Screen state only: × or leaving 오늘 ends it.
  const [flowHighlight, setFlowHighlight] = useState<{ documentId: string; title: string; count: number } | null>(null);
  useEffect(() => { if (programMainTabOf(period) !== 'today') setFlowHighlight(null); }, [period]);
  useEffect(() => { setFlowHighlight(null); }, [actorId]);
  // The day sheet's ＋ line is being composed in (Korean): a sheet/panel switch waits for it (C5 re-review).
  const sheetComposing = useRef(false), [sheetSettled, setSheetSettled] = useState(0);
  const endSheetComposing = () => { if (!sheetComposing.current) return; sheetComposing.current = false; setSheetSettled(count => count + 1); };
  // What the day's dialog really is now (C5 re-review 2): its look and rules follow this, so while a switch waits for a
  // composition the sheet still looks and acts as a sheet (and the panel as a panel).
  const [dayDialog, setDayDialog] = useState<ProgramDayDialogMode>(null);
  const daySheet = useRef<HTMLDialogElement | null>(null), monthBox = useRef<HTMLDivElement | null>(null);
  useEffect(() => { try { if (localStorage.getItem(MONTH_VIEW_KEY) === 'grid') setMonthViewState('grid'); } catch { /* the list, then */ } }, []);
  const setMonthView = (next: 'list' | 'grid') => { setMonthViewState(next); try { localStorage.setItem(MONTH_VIEW_KEY, next); } catch { /* kept for this visit */ } };
  useEffect(() => {
    const box = monthBox.current;
    if (!box || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setMonthWidth(Math.round(entry.contentRect.width)));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  const [moving, setMoving] = useState<string | null>(null), [showArchived, setShowArchived] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const libraryToggle = useRef<HTMLButtonElement | null>(null);
  // The host's writing title ▾ opens the same sheet; it never shares libraryToggle.
  const titleToggle = useRef<HTMLButtonElement | null>(null);
  const noteFindMenu = useRef<HTMLDetailsElement | null>(null);
  const noteFindMenuSummary = useRef<HTMLElement | null>(null);
  const [noteQuickOpen, setNoteQuickOpen] = useState(false);
  const quickDisclosure = useRef<HTMLDetailsElement | null>(null);
  const libraryDialog = useRef<HTMLDialogElement | null>(null);
  const libraryComposing = useRef(false);
  // The find notice is about that moment: it goes once the composition and the lock are over, or the find opens, and
  // never takes another message with it (it stayed until another action cleared the message, 70s on a tablet).
  const findBlocked = useRef(false);
  const libraryReturn = useRef<{ actorId: string; documentId: string; period: ProgramPeriod; folderId: string;
    element: HTMLElement | null; area: HTMLTextAreaElement | null; raw: string;
    start: number; end: number; direction: 'forward' | 'backward' | 'none'; top: number; left: number; pageX: number; pageY: number } | null>(null);
  const libraryReveal = useRef({ epoch: 0, frame: null as number | null,
    request: null as LibraryWritingHandoff | null, committedRequest: null as LibraryWritingHandoff | null });
  const [libraryHandoff, setLibraryHandoff] = useState<LibraryWritingHandoff | null>(null);
  const [preparingDocumentAction, setPreparingDocumentAction] = useState(false);
  const preparing = useRef(false), selectedRef = useRef(selected); selectedRef.current = selected;
  const documentRouteOpening = useRef<Promise<void>>(Promise.resolve());
  const saveRequests = useRef<Record<string, (() => Promise<boolean>) | null>>({});
  const saveStatusReaders = useRef<Record<string, (() => ProgramTextSaveStatus) | null>>({});
  const inputFailures = useRef<Record<string, boolean>>({});
  const inputFailureChanged = (id: string, failed: boolean) => {
    if (!!inputFailures.current[id] === failed) return;
    inputFailures.current[id] = failed;
    props.onInputFailureChange?.(Object.values(inputFailures.current).some(Boolean));
  };
  const recurrencePorts = useRef<Record<string, ProgramEditorFlush | null>>({});
  // A flush may await an already-running local save. Only successfully persisted
  // editor commits can advance this chain; render props or arbitrary snapshots cannot.
  const moveFlush = useRef<{ actorId: string; expected: typeof space; conflict: boolean } | null>(null);
  const draftReaders = useRef<Record<string, (() => string) | null>>({});
  const inputCheckpointReaders = useRef<Record<string, (() => import('@/lib/flow/integrated-poc/document-action').ProgramEditorInputCheckpoint) | null>>({});
  const captureReaders = useRef<Record<string, (() => boolean) | null>>({});
  const externalReaders = useRef<Record<string, ((before: ProgramData, next: ProgramData) => boolean) | null>>({});
  const structuralDraftReaders = useRef<Record<string, (() => AlphaStructuralDraft | null) | null>>({});
  const childDraftReaders = useRef<Record<string, (() => ProgramChildDraft[]) | null>>({});
  const bodyPendingReaders = useRef<Record<string, (() => boolean) | null>>({});
  const confirmedSaveReaders = useRef<Record<string, ((before: TextWorkspaceState, next: TextWorkspaceState, ack?:OwnedWritingAck) => boolean) | null>>({});
  const inputLocks = useRef<Record<string, ((locked: boolean) => void) | null>>({}), inputLockCount = useRef(0);
  const [recordDate, setRecordDate] = useState(today), [percent, setPercent] = useState('0');
  const [progressRecordDate, setProgressRecordDate] = useState<string | null>(null);
  // An ACK must render even for a no-op save or repeated success message.
  const [progressDraftBaseline, setProgressDraftBaseline] = useState({ date: today, percent: '0' });
  const [executionDateDraft, setExecutionDateDraft] = useState('');
  const [executionTimeDraft, setExecutionTimeDraft] = useState('');
  const executionDraftOwner = useRef({ dialog: 0, input: 0, taskId: null as string | null });
  const [recurrencePresentation, setRecurrencePresentation] = useState(emptyProgramRecurrencePresentation);
  const root = useRef<HTMLElement | null>(null);
  const documentMenu = useRef<HTMLDetailsElement | null>(null);
  // U44 review: crossing the condition draws the head (title, ← 오늘, ⋯, notices) again in its other place. Just
  // before that, the old place still drawn, an open ⋯, the name in it and the focus are read; they are put back once
  // the new place is drawn (tablet-head-carry.ts says which, and when).
  const headCarry = useRef<ProgramHeadCarry | null>(null);
  const watchHead = useCallback((change: () => void) => watchTabletHead(() => {
    headCarry.current = carryProgramHead(selectedRef.current, root.current, documentMenu.current, document.activeElement); change();
  }), []);
  const tabletLandscape = useSyncExternalStore(watchHead, () => tabletHead().matches, () => false);
  const phoneLayout = useSyncExternalStore(watchPhoneHead, () => phoneHead().matches, () => false);
  useLayoutEffect(() => {
    const carry = headCarry.current; headCarry.current = null;
    if (carry) restoreProgramHead(carry, selectedRef.current, root.current, documentMenu.current, titleToggle.current, document.activeElement);
  }, [tabletLandscape]);
  const viewMenu = useRef<HTMLElement | null>(null);
  const writingRequest = useRef<string | null>(null);
  const [writingFocus, setWritingFocus] = useState<{ id: string; actorId: string; focusOwner: Element | null; managedReturnFocus?: Element | null } | null>(null);
  const writingFocusRef = useRef(writingFocus); writingFocusRef.current = writingFocus;
  useEffect(() => {
    setWritingNotice(current => current?.actorId === actorId && current.documentId === selected && period === 'documents' ? current : null);
  }, [actorId, selected, period]);
  useEffect(() => {
    if (!writingFocus || writingFocus.id !== selected || writingFocus.actorId !== actorId || period !== 'documents') return;
    const frame = requestAnimationFrame(() => {
      const area = root.current?.querySelector<HTMLTextAreaElement>('[data-program-document]:not([hidden]) textarea');
      if (area && !area.readOnly && area.getClientRects().length && dataRef.current.activeActorId === writingFocus.actorId
        && (document.activeElement === writingFocus.focusOwner || document.activeElement === document.body
          || !!writingFocus.managedReturnFocus && document.activeElement === writingFocus.managedReturnFocus)) area.focus();
      setWritingFocus(current => current === writingFocus ? null : current);
    });
    return () => cancelAnimationFrame(frame);
  }, [writingFocus, selected, actorId, period]);
  function focusViewControl() {
    // With the host's tabs, its current tab is the view control.
    const hosted = props.hostMainTabs ? root.current?.ownerDocument.querySelector<HTMLElement>('[data-main-tab][aria-current="page"]') : null;
    (hosted ?? viewMenu.current?.querySelector<HTMLElement>('[data-program-period][aria-current="page"]')
      ?? viewMenu.current?.querySelector<HTMLElement>('[data-program-period="today"]'))?.focus({ preventScroll: true });
  }
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
  function clearScheduleAcknowledgment(workspace: TextWorkspaceState | null = null) {
    const acknowledgment = scheduleAcknowledgment.current; scheduleAcknowledgment.current = null;
    if (acknowledgment?.timeout) clearTimeout(acknowledgment.timeout);
    acknowledgment?.accept?.(workspace);
  }
  function reconcileScheduleAcknowledgment() {
    const acknowledgment = scheduleAcknowledgment.current;
    if (!acknowledgment) return;
    if (!scheduleMounted.current) { clearScheduleAcknowledgment(); return; }
    const current = dataRef.current, authoritative = current.spaces[acknowledgment.actorId];
    if (current.activeActorId !== acknowledgment.actorId || !authoritative || acknowledgment.detail && detailExpected.current !== acknowledgment.after) { clearScheduleAcknowledgment(); return; }
    const comparable = programClone(acknowledgment.after); comparable.text = authoritative.text;
    const whole = programClone(acknowledgment.afterData); whole.spaces[acknowledgment.actorId].text = authoritative.text;
    // Request receipts belong to the host protocol, not this semantic text/owner proof.
    whole.receipts = current.receipts;
    if (programSame(comparable, authoritative) && (!acknowledgment.accept || programSame(whole, current))
      && sameScheduleWorkspace(acknowledgment.before.text, acknowledgment.after.text, authoritative.text)) {
      if (acknowledgment.detail) detailExpected.current = authoritative;
      clearScheduleAcknowledgment(authoritative.text); return;
    }
    if (programSame(current, acknowledgment.beforeData)) return;
    clearScheduleAcknowledgment();
  }
  useEffect(() => { reconcileScheduleAcknowledgment(); }, [data]);
  useEffect(() => {
    scheduleMounted.current = true;
    return () => { scheduleMounted.current = false; clearScheduleAcknowledgment(); };
  }, []);
  const dialog = useRef<HTMLDialogElement>(null), previousFocus = useRef<HTMLElement | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null), holdPoint = useRef<{ x: number; y: number } | null>(null);
  const suppressPointerClick = useRef<string | null>(null);
  // Keep native drag identity off the render path. Inserting the touch-move
  // notice during dragstart moves the source row and can cancel Chromium's
  // native drag before its data transfer has started.
  const nativeDrag = useRef<string | null>(null);
  const positions = useRef<Record<string, ProgramWritingPosition>>({}), dirty = useRef<Record<string, boolean>>({});
  // 11/5 쓰기 '최근만 쓰기' (W-a): a long document is written in its recent part, its old date sections folded into one
  // line (recent-writing.ts). Per writing session, the fold (recomputed when the person goes back to 최근만 보기); the
  // documents shown whole on this device (remembered); the view handed to each editor, kept while the text is the same.
  const recentHolds = useRef<Record<string, ProgramRecentHold | null>>({});
  const recentCache = useRef<Record<string, { text: TextWorkspaceState; hold: ProgramRecentHold; view: ProgramRecentView }>>({});
  const recentWholeKey = `flow:alpha:writing-whole:v1:${actorId}`;
  const [recentWhole, setRecentWhole] = useState<Record<string, true>>(() => {
    try { const read: unknown = JSON.parse(localStorage.getItem(recentWholeKey) ?? '{}'); return read && typeof read === 'object' && !Array.isArray(read) ? read as Record<string, true> : {}; }
    catch { return {}; }
  });
  const recentWholeRef = useRef(recentWhole); recentWholeRef.current = recentWhole;
  /** The document whose old days were opened to show a line found there ('찾은 줄이 지난 기록에 있어 펼쳤습니다'). */
  const [recentFound, setRecentFound] = useState<string | null>(null);
  // W-b: the documents whose [미정] finished tasks are shown ([보기]) on this device, remembered as the whole ones are.
  const recentDoneKey = `flow:alpha:writing-done:v1:${actorId}`;
  const [recentDoneShown, setRecentDoneShown] = useState<Record<string, true>>(() => {
    try { const read: unknown = JSON.parse(localStorage.getItem(recentDoneKey) ?? '{}'); return read && typeof read === 'object' && !Array.isArray(read) ? read as Record<string, true> : {}; }
    catch { return {}; }
  });
  const recentDoneShownRef = useRef(recentDoneShown); recentDoneShownRef.current = recentDoneShown;
  function recentHoldOf(id: string): ProgramRecentHold | null {
    if (id in recentHolds.current) return recentHolds.current[id];
    // A repeat line still to get its first round keeps its old day in view: the editor writes that round on the lines
    // it has, there as in the whole document (the same "- 날짜:" in the same place), and folded lines are never written.
    const doc = space.text.documents.find(entry => entry.id === id), long = !!doc && doc.lines.length > PROGRAM_RECENT_WRITING.lines;
    const keep = long ? new Set(settleProgramRepeatLines(space, id, today, null).settled.map(entry => entry.taskId)) : undefined;
    return recentHolds.current[id] = programRecentHold(space.text, id, today, { done: !recentDoneShownRef.current[id], keep });
  }
  /** W-b: how many finished tasks [미정] has, for '[접기]' once they are shown (kept while the text is the same). */
  const recentDoneCounts = useRef(new WeakMap<TextWorkspaceState, Map<string, number>>());
  function recentDoneCountOf(id: string) {
    const known = recentDoneCounts.current.get(space.text)?.get(id);
    if (known !== undefined) return known;
    const doc = space.text.documents.find(entry => entry.id === id), count = doc && doc.lines.length > PROGRAM_RECENT_WRITING.lines ? programRecentDoneCount(space.text, id) : 0;
    if (!recentDoneCounts.current.has(space.text)) recentDoneCounts.current.set(space.text, new Map());
    recentDoneCounts.current.get(space.text)!.set(id, count);
    return count;
  }
  /** The folder `id`'s editor gathers ('' for the whole document). F4-a: in the folder screen only the document [글]
   *  shows gets it (one editor of regions, FR-5); the others, 쓰기's included, stay whole and keep their state. */
  function editorFolderOf(id: string): string {
    if (collectionMode) return '';
    if (!folderScreen) return folderId;
    return folderScreen.tab === 'writing' && period === 'documents' && selected === id ? folderId : '';
  }
  /** The recent view handed to `id`'s editor, or null: the whole document (shown whole on this device, a folder or
   *  collection view, a document that cannot be written, or one with nothing to fold). */
  function recentViewOf(id: string): ProgramRecentView | null {
    if (collectionMode || editorFolderOf(id) || recentWhole[id] || !space.text.documents.some(doc => doc.id === id) || programDocumentContentLock(space, id) !== 'active') return null;
    const hold = recentHoldOf(id);
    if (!hold) return null;
    const cached = recentCache.current[id];
    if (cached && cached.text === space.text && cached.hold === hold) return cached.view;
    const hidden = programRecentHidden(space.text, hold);
    const view = { hold, hidden, workspace: restrictProgramRecent(space.text, id, hidden), folds: programRecentFolds(space.text, id, hidden), done: programRecentDone(space.text, id, hidden) };
    recentCache.current[id] = { text: space.text, hold, view };
    return view;
  }
  const recentViewRef = useRef(recentViewOf); recentViewRef.current = recentViewOf;
  /** The editor's state with the folded lines put back onto `base`; `check` proves the whole (a save), else a quick look.
   *  The same state asked again (every row's reference check while the editor draws) gets the same object back. */
  const recentWideKnown = useRef(new WeakMap<TextWorkspaceState, { base: TextWorkspaceState; hold: ProgramRecentHold; check: boolean; result: ReturnType<typeof extendProgramRecent> }>());
  function recentWide(id: string, view: ProgramRecentView, next: TextWorkspaceState, check = true, base = space.text) {
    const known = recentWideKnown.current.get(next);
    if (known && known.base === base && known.hold === view.hold && (known.check || !check)) return known.result;
    const result = extendProgramRecent(base, next, id, programRecentHidden(base, view.hold), check);
    recentWideKnown.current.set(next, { base, hold: view.hold, check, result });
    return result;
  }
  const recentNarrow = (id: string, view: ProgramRecentView, state: TextWorkspaceState) => restrictProgramRecent(state, id, programRecentHidden(state, view.hold));
  /** The raw the document's editor shows: the recent part in the recent view. */
  function shownDocument(id: string) {
    const view = recentViewRef.current(id), whole = M.getDocument(dataRef.current.spaces[actorId]?.text ?? space.text, id);
    return view ? M.getDocument(view.workspace, id) ?? whole : whole;
  }
  /** A caret between the recent part and the whole document, by its line. */
  function recentPosition<T extends ProgramTextPosition>(id: string, view: ProgramRecentView, position: T, toWhole: boolean): T {
    const recent = M.getDocument(view.workspace, id)?.lines ?? [], whole = M.getDocument(space.text, id)?.lines ?? [];
    const [from, to] = toWhole ? [recent, whole] : [whole, recent];
    // A scroll from the whole document means nothing in the recent part (it opens at its top, or at today: below).
    return { ...position, start: moveProgramRecentOffset(from, to, position.start), end: moveProgramRecentOffset(from, to, position.end), ...(toWhole ? {} : { scrollTop: 0 }) };
  }
  async function settleRecent(id: string) {
    if (saveStatusReaders.current[id]?.()?.composing || inputLockCount.current > 0) return false;
    if (dirty.current[id] && !await saveRequests.current[id]?.()) return false;
    return !dirty.current[id];
  }
  // Redesign 1 + 3: asked once when the app opens (this page load), for the account as it is then.
  useEffect(() => {
    if (programTextCleanupAsked.has(actorId)) return;
    const current = dataRef.current.spaces[actorId];
    if (!current) return;
    programTextCleanupAsked.add(actorId);
    const plan = programTextCleanupPlan(current);
    if (plan) setCleanupAsk({ actorId, plan, choices: programDateLineDefaults(plan.dates) });
  }, [actorId]);
  useEffect(() => {
    const sheet = cleanupDialog.current;
    if (!sheet) return;
    if (cleanupAsk && !sheet.open) sheet.showModal(); else if (!cleanupAsk && sheet.open) sheet.close();
  }, [cleanupAsk]);
  async function writeCleanup() {
    const ask = cleanupAsk;
    if (!ask || ask.actorId !== actorId || cleanupPending) return;
    // Pending input in the documents it changes is saved first; a composition holds it.
    for (const id of programTextCleanupDocuments(ask.plan)) if (!await settleRecent(id)) { setMessage('입력이 끝나면 다시 눌러 주세요.'); return; }
    // 총괄 11/12 ①: the originals go to an archived document '전환 전 원문 · when' in the same save; 되돌리기 reads them there.
    let stamp = '';
    setCleanupPending(true);
    try {
      const result = await run('글 정리', current => { const next = applyProgramTextCleanup(current, { ...base(current), plan: ask.plan, choices: ask.choices, when: programCleanupWhen(new Date()) });
        if (next.ok) stamp = next.result; return next; }, true);
      setCleanupAsk(null);
      if (!result.ok || !stamp) {
        if (!result.ok && result.reason === 'conflict') setMessage('그사이 바뀐 글이 있어 바꾸지 않았습니다. 앱을 다시 열면 다시 보여 드립니다.');
        else if (!result.ok && result.reason === 'limit') setMessage('원문을 보관할 자리가 없어 바꾸지 않았습니다(문서는 100개까지). 원문은 그대로입니다.');
        else if (!result.ok && result.reason !== 'busy') setMessage(result.reason === 'unresolved' ? '옮길 수 없는 줄이 있어 바꾸지 않았습니다. 원문은 그대로입니다.' : `${programErrorMessage(result.reason)} (${result.reason})`);
        return;
      }
      setCleanupNotice({ actorId, documents: programTextCleanupDocuments(ask.plan).length, stamp });
    } finally { setCleanupPending(false); }
  }
  /** 되돌리기, from the notice or from the archived original itself (any visit later). 총괄 11/12: only while every changed
   *  document is exactly as the cleanup left it; else it says so and opens the archived original to take from. */
  async function restoreCleanup(stamp: string) {
    if (cleanupPending) return false;
    setCleanupPending(true);
    try {
      const result = await run('글 정리 되돌리기', current => restoreProgramTextCleanup(current, { ...base(current), stamp }), true);
      const refused = result.ok ? undefined : result.reason === 'busy' ? '' : result.reason === 'missing' ? '보관 글에서 원문을 찾지 못해 되돌리지 않았습니다'
        : result.reason === 'conflict' ? PROGRAM_CLEANUP_CHANGED
        : result.reason === 'unresolved' ? '원문을 다시 쓸 수 없어 되돌리지 않았습니다. 지금 글은 그대로입니다' : `${programErrorMessage(result.reason)} (${result.reason})`;
      if (refused === '') return false;
      setCleanupNotice(current => current?.actorId === actorId && current.stamp === stamp ? { ...current, ...(refused ? { refused } : { undone: true }) } : current);
      setMessage(refused ?? '전환 전 원문으로 되돌렸습니다.');
      const archive = refused === PROGRAM_CLEANUP_CHANGED ? programCleanupArchiveDocument(dataRef.current.spaces[actorId], stamp) : null;
      if (archive && archive !== selected) void openDocument(archive);
      return !refused;
    } finally { setCleanupPending(false); }
  }
  const chooseDateLine = (ownerId: string, choice: ProgramDateLineChoice) => setCleanupAsk(ask => ask && { ...ask, choices: { ...ask.choices, [ownerId]: choice } });
  const monthDay = (date: string) => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;
  const progressMark = (text: string) => /\[[^\]]*\]/.exec(text)?.[0] ?? text;
  function rememberRecentWhole(next: Record<string, true>) {
    try { localStorage.setItem(recentWholeKey, JSON.stringify(next)); } catch { /* this visit only */ }
    setRecentWhole(next);
  }
  /** [펼치기]: the whole document in the editor, remembered on this device. A line opened from elsewhere (`found`)
   *  opens it the same way, its writing already settled. */
  async function showRecentWhole(id: string, found = false) {
    if (!found) await releaseRecentEditor(id);
    if (!found && !await settleRecent(id) && !keepRecentInput(id)) return;
    rememberRecentWhole({ ...recentWholeRef.current, [id]: true });
    setRecentFound(found ? id : null);
  }
  /** QA Q1 (390): pressing [펼치기] while typing took the editor's focus, its toolbar grew a line (the refused save's
   *  status) and the button moved from under the finger, so the click was lost. The press keeps the focus; the action
   *  lets go of the editor itself, as the press did (a composition ends), before it settles the input. The fold lines'
   *  other buttons ([보기], [접기], [최근만 보기]) move the same way and are pressed the same way. */
  const holdRecentFocus = (event: React.MouseEvent) => event.preventDefault();
  async function releaseRecentEditor(id: string) {
    const area = document.getElementById(`program-text-${encodeURIComponent(id)}`);
    if (!area || !area.contains(document.activeElement) && document.activeElement !== area) return;
    (document.activeElement as HTMLElement).blur();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }
  /** QA Q1: [펼치기] does not wait on a save. Input the recent part could not save (refused, as the folded days' order,
   *  or failed) goes to the 복구함 whole, as the 복구함 always keeps it (the folded days put back by the same function),
   *  and the whole document opens from the saved text. Not kept (storage), it stays as typed and nothing changes;
   *  input still being composed waits. */
  function keepRecentInput(id: string) {
    if (saveStatusReaders.current[id]?.()?.composing || inputLockCount.current > 0) { setMessage('입력을 마친 뒤 지난 기록을 펼쳐 주세요.'); return false; }
    const raw = draftReaders.current[id]?.(), title = documentsRef.current.find(doc => doc.id === id)?.title ?? '작성 중 문서';
    if (typeof raw !== 'string' || !props.onKeepRefusedInput?.({ documentId: id, title, raw })) { setMessage('입력을 복구함에 넣지 못해 펼치지 않았습니다. 입력은 그대로 있습니다.'); return false; }
    // The recent part's editor goes with its input, now in the 복구함; the whole one starts clean.
    editorDirtyChanged(id, actorId, false);
    setMessage('입력은 복구함에 있습니다.');
    return true;
  }
  /** W-b [보기] / [접기]: [미정]'s finished tasks shown where they are, or folded again (anew from the text as it is now). */
  async function showRecentDone(id: string, show: boolean) {
    await releaseRecentEditor(id);
    if (!await settleRecent(id)) { setMessage('작성 중인 입력을 저장한 뒤 끝낸 일을 펼치거나 접어 주세요.'); return; }
    delete recentHolds.current[id]; delete recentCache.current[id];
    const next = { ...recentDoneShownRef.current }; if (show) next[id] = true; else delete next[id];
    try { localStorage.setItem(recentDoneKey, JSON.stringify(next)); } catch { /* this visit only */ }
    setRecentDoneShown(next);
  }
  /** [최근만 보기]: the recent part again, folded anew from the text as it is now. */
  async function showRecentOnly(id: string) {
    await releaseRecentEditor(id);
    if (!await settleRecent(id)) { setMessage('작성 중인 입력을 저장한 뒤 최근만 보기로 바꿔 주세요.'); return; }
    delete recentHolds.current[id]; delete recentCache.current[id];
    const next = { ...recentWholeRef.current }; delete next[id];
    rememberRecentWhole(next); setRecentFound(null);
  }
  // F10 W-ORDER-02 (11/11): a document opens at today, once per page visit. One written oldest first (위가 과거, a new
  // one too) gets today's date line near the top and the caret at the end of today's section (on its empty last line
  // when it has one); a document with its old days folded (PROPOSAL 4-2) is scrolled to today in any order, as before.
  // Nothing is written or saved, and nothing is focused (a phone keeps its keyboard down; the reading view and its trace
  // lines stay). A line asked for (원래 줄 보기, 찾기: openDocument) wins; a folder or collection view is left alone;
  // and back in a document already opened, the editor keeps where it was.
  const todayKey = (id: string) => `${actorId}:${id}`;
  // The account may be read after the space is drawn (a first visit): opening at today waits for the document.
  const selectedPresent = !!selected && space.text.documents.some(doc => doc.id === selected);
  /** F10 W-ORDER-05: each document editor's '날짜 순서 바꾸기' preview, for the 글 작업 menu. */
  const sectionOrderOpeners = useRef<Record<string, (() => void) | null>>({});
  useEffect(() => {
    const id = selected;
    if (!id || period !== 'documents' || PROGRAM_TODAY_SHOWN.has(todayKey(id)) || collectionMode || editorFolderOf(id)) return;
    if (!space.text.documents.some(doc => doc.id === id)) return;
    PROGRAM_TODAY_SHOWN.add(todayKey(id));
    if (pendingSourceFocus.current?.documentId === id) return;
    // W-ORDER-02 (총괄 11/11 08:3x): every document, in any date order (newest first too).
    // Read from the text the editor shows now, each try: opening may write first (a repeat line's first round, say).
    let known: { text: TextWorkspaceState; index: number; caret: number | null; raw: string } | null = null;
    const plan = () => {
      const view = recentViewRef.current(id), text = view ? view.workspace : dataRef.current.spaces[actorId]?.text;
      if (!text) return null;
      if (known?.text === text) return known;
      const rows = M.rowMeta(text, id), head = rows.find(row => row.kind === 'date' && row.date === today), doc = M.getDocument(text, id);
      if (!doc || !doc.lines.length) return known = { text, index: -1, caret: null, raw: '' };
      // W-ORDER-08: no section for today: no line is made; the screen goes near where today's would come, no caret.
      if (!head) return known = { text, index: Math.min(programDateHeadIndex(doc.lines.map(line => line.text), today), doc.lines.length - 1), caret: null, raw: M.raw(doc) };
      // The end of today's section: its last line that is not blank, or the empty line right under it in the section.
      let caretLine = [...rows].reverse().find(row => row.dateLineId === head.id && row.id !== head.id && row.kind !== 'blank')?.index ?? head.index;
      if (rows[caretLine + 1]?.kind === 'blank' && rows[caretLine + 1]?.dateLineId === head.id) caretLine += 1;
      const caret = doc.lines.slice(0, caretLine + 1).reduce((sum, line) => sum + line.text.length + 1, 0) - 1;
      return known = { text, index: head.index, caret, raw: M.raw(doc) };
    };
    // QA Q2: not being typed in, the editor shows its text on its reading viewport (the vendor's scroll surface), the
    // textarea only while typed in: today goes in view on the surface shown (and on the textarea, which a switch to
    // typing carries over). Tried again (up to about ten seconds: on a first visit the editor comes after the account
    // is read) while the editor is not laid out yet or does not show that text yet; given up once the document is left.
    let tries = 0;
    const reveal = () => {
      if (selectedRef.current !== id) return;
      const at = plan();
      if (at && at.index < 0) return;
      const textarea = document.getElementById(`program-text-${encodeURIComponent(id)}`) as HTMLTextAreaElement | null, root = textarea?.closest<HTMLElement>('.tle-root');
      const row = at ? root?.querySelectorAll<HTMLElement>('.tle-line')[at.index] : undefined;
      if (!at || !textarea || !root || !row || !row.offsetHeight || textarea.value !== at.raw) { if (++tries < 600) requestAnimationFrame(reveal); return; }
      // A line asked for meanwhile, or typing begun: left as it is.
      if (pendingSourceFocus.current?.documentId === id || document.activeElement === textarea) return;
      // W-ORDER-02: the caret at the end of today's section, with no focus (selection only: no input, no save).
      if (at.caret !== null && at.caret >= 0 && at.caret <= textarea.value.length) textarea.setSelectionRange(at.caret, at.caret);
      const viewport = root.querySelector<HTMLElement>('.tle-viewport');
      const surface = viewport && (root.classList.contains('tle-reading-view') || root.classList.contains('tle-folded-view')) ? viewport : textarea;
      // Today's date line in the upper part of the screen; already there, the screen stays.
      if (row.offsetTop >= surface.scrollTop && row.offsetTop + row.offsetHeight <= surface.scrollTop + surface.clientHeight * .4) return;
      const top = Math.max(0, row.offsetTop - 20);
      textarea.scrollTop = top;
      if (surface !== textarea) surface.scrollTop = top;
    };
    requestAnimationFrame(() => requestAnimationFrame(reveal));
  }, [selected, selectedPresent, period, recentWhole]);
  const recentDay = (date: string) => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;
  /** The lines above (`atEnd` false) or under the editor: [미정]'s folded finished tasks (W-b) and the folded days there. */
  /** 7k stage 2 (11/7): the folders a document writes (its folder lines, in their first order), for the 폴더별 chips. */
  const docFoldersKept = useRef(new WeakMap<TextWorkspaceState, Map<string, { id: string; title: string; path: string }[]>>());
  function docFoldersOf(id: string) {
    let byDoc = docFoldersKept.current.get(space.text);
    if (!byDoc) docFoldersKept.current.set(space.text, byDoc = new Map());
    if (!byDoc.has(id)) {
      const seen = new Set<string>(), list: { id: string; title: string; path: string }[] = [];
      for (const row of M.getDocument(space.text, id) ? M.rowMeta(space.text, id) : []) {
        if (row.kind !== 'scope' || row.scopeKind !== 'folder' || !row.scopeId || seen.has(row.scopeId)) continue;
        const folder = space.text.folders.find(item => item.id === row.scopeId);
        if (!folder) continue;
        seen.add(folder.id); list.push({ id: folder.id, title: folder.title, path: folderOptions.find(item => item.id === folder.id)?.title ?? folder.title });
      }
      byDoc.set(id, list);
    }
    return byDoc.get(id)!;
  }
  /** The folder this device last gathered in a document (7k stage 2: 폴더별 opens on it). Storage may be unavailable. */
  const VIEW_FOLDER_KEY = 'flowme-writing-folder-view:v1';
  function lastViewFolder(id: string): string | null {
    try { const kept = JSON.parse(localStorage.getItem(VIEW_FOLDER_KEY) || '{}'); return typeof kept?.[id] === 'string' ? kept[id] : null; } catch { return null; }
  }
  function keepViewFolder(id: string, scopeId: string) {
    try { const kept = JSON.parse(localStorage.getItem(VIEW_FOLDER_KEY) || '{}') ?? {}; kept[id] = scopeId; localStorage.setItem(VIEW_FOLDER_KEY, JSON.stringify(kept)); } catch { /* the choice just is not kept */ }
  }
  /** 7k stage 2: the writing view's 날짜별 | 폴더별 and, by folder, the chips of this document's folders. A chip gathers
   *  that folder (stage 1's region editor; saved first); 날짜별 shows the whole document again. */
  function viewSwitch(id: string) {
    if (!PROGRAM_WRITING_VIEW_SWITCH || collectionMode || selected !== id || period !== 'documents') return null;
    const folders = docFoldersOf(id);
    if (!folders.length) return null;
    const gather = (scopeId: string) => { keepViewFolder(id, scopeId); if (scopeId !== folderId) void changeFolder(scopeId); };
    const byFolder = () => { if (folderId) return; const last = lastViewFolder(id); gather(folders.some(folder => folder.id === last) ? last! : folders[0].id); };
    return <div className={styles.viewSwitch} data-view-switch>
      <div className={styles.viewModes} role="group" aria-label="쓰기 보기">
        <button type="button" aria-pressed={!folderId} data-view-mode="date" disabled={preparingDocumentAction} onClick={() => { if (folderId) void changeFolder(''); }}>날짜별</button>
        <button type="button" aria-pressed={!!folderId} data-view-mode="folder" disabled={preparingDocumentAction} onClick={byFolder}>폴더별</button>
      </div>
      {folderId && <div className={styles.viewChips} role="group" aria-label="모아 볼 폴더">
        {folders.map(folder => <button type="button" key={folder.id} data-view-folder={folder.id} aria-pressed={folder.id === folderId} title={folder.path}
          disabled={preparingDocumentAction} onClick={() => gather(folder.id)}>{folder.title}</button>)}
      </div>}
    </div>;
  }
  function recentLine(id: string, view: ProgramRecentView | null, atEnd: boolean) {
    // [미정]'s line goes under the body with the old days' line, and both at once are one line of two buttons: each line
    // took the body two lines, the very ones the folds had freed for today's first task (390 check).
    // F11 W-HEIGHT-03 (11/11): shown ([접기]) or folded ([보기]), the finished tasks share the one line with the old days.
    const shownDone = atEnd && view && !view.done.count ? recentDoneShownCount(id) : 0;
    if (atEnd && view && (view.done.count || shownDone) && view.folds.some(fold => fold.atEnd)) return recentPairLine(id, view, shownDone);
    const done = atEnd ? recentDoneLine(id, view) : null, past = recentPastLine(id, view, atEnd);
    return done || past ? <>{done}{past}</> : null;
  }
  /** How many finished tasks of [미정] are shown now ([보기] pressed on this device), for the line that folds them again. */
  const recentDoneShownCount = (id: string) => recentDoneShown[id] && !recentWhole[id] && !collectionMode && !editorFolderOf(id) ? recentDoneCountOf(id) : 0;
  /** Both folds under the body: '✓ 끝낸 일 n개 보기' (or, shown, '접기') and '지난 기록 n일 펼치기', their full words as
   *  the buttons' names. */
  function recentPairLine(id: string, view: ProgramRecentView, shownDone = 0) {
    const folds = view.folds.filter(fold => fold.atEnd), through = folds.reduce((last, fold) => fold.through > last ? fold.through : last, '');
    const sum = (key: 'days' | 'tasks' | 'open') => folds.reduce((total, fold) => total + fold[key], 0);
    const done = shownDone ? `✓ 날짜 미정에서 끝낸 일 ${shownDone}개` : view.done.whole ? `날짜 미정 · 끝낸 일 ${view.done.count}개` : `✓ 날짜 미정에서 끝낸 일 ${view.done.count}개`;
    const past = `지난 기록 · ${through ? `${recentDay(through)}까지 ` : ''}${sum('days')}일 · 할 일 ${sum('tasks')}개 · 남은 일 ${sum('open')}개`;
    return <div className={`${styles.recentFold} ${styles.recentPair}`} data-recent-done={shownDone ? 'shown' : ''} data-recent-fold="end">
      {shownDone
        ? <button type="button" data-recent-action="done-fold" title={done} aria-label={`${done} · 접기`} onMouseDown={holdRecentFocus} onClick={() => void showRecentDone(id, false)}>✓ 끝낸 일 {shownDone}개 접기</button>
        : <button type="button" data-recent-action="done-show" title={done} aria-label={`${done} · 보기`} onMouseDown={holdRecentFocus} onClick={() => void showRecentDone(id, true)}>날짜 미정 끝낸 일 {view.done.count}개</button>}
      <button type="button" data-recent-action="past-show" title={past} aria-label={`${past} · 펼치기`} onMouseDown={holdRecentFocus} onClick={() => void showRecentWhole(id)}>지난 {sum('days')}일 펼치기</button></div>;
  }
  /** W-b: '✓ 날짜 미정에서 끝낸 일 n개 [보기]' ('날짜 미정 · 끝낸 일 n개' when [미정] folded whole), or [접기] once shown. */
  function recentDoneLine(id: string, view: ProgramRecentView | null) {
    if (view?.done.count) return <div className={styles.recentFold} data-recent-done>
      <p><span>{view.done.whole ? `날짜 미정 · 끝낸 일 ${view.done.count}개` : `✓ 날짜 미정에서 끝낸 일 ${view.done.count}개`}</span></p>
      <button type="button" data-recent-action="done-show" onMouseDown={holdRecentFocus} onClick={() => void showRecentDone(id, true)}>보기</button></div>;
    const count = recentDoneShownCount(id);
    return count ? <div className={styles.recentFold} data-recent-done="shown"><p><span>✓ 날짜 미정에서 끝낸 일 {count}개</span></p>
      <button type="button" data-recent-action="done-fold" onMouseDown={holdRecentFocus} onClick={() => void showRecentDone(id, false)}>접기</button></div> : null;
  }
  /** The folded days there ('지난 기록 · …'), or, shown whole, the way back. */
  function recentPastLine(id: string, view: ProgramRecentView | null, atEnd: boolean) {
    if (view) {
      const folds = view.folds.filter(fold => fold.atEnd === atEnd);
      if (!folds.length) return null;
      const through = folds.reduce((last, fold) => fold.through > last ? fold.through : last, ''), sum = (key: 'days' | 'tasks' | 'open') => folds.reduce((total, fold) => total + fold[key], 0);
      return <div className={styles.recentFold} data-recent-fold={atEnd ? 'end' : 'start'}>
        <p><span>지난 기록 · {through ? `${recentDay(through)}까지 ` : ''}{sum('days')}일</span><small>할 일 {sum('tasks')}개 · 남은 일 {sum('open')}개</small></p>
        <button type="button" data-recent-action="past-show" onMouseDown={holdRecentFocus} onClick={() => void showRecentWhole(id)}>펼치기</button></div>;
    }
    const hold = atEnd || !recentWhole[id] || collectionMode || editorFolderOf(id) ? null : recentHoldOf(id);
    if (!hold) return null;
    return <div className={styles.recentFold} data-recent-whole>
      <p><span>{recentFound === id ? '찾은 줄이 지난 기록에 있어 펼쳤습니다' : hold.lineIds.size ? '지난 기록을 펼쳤습니다 · 길면 입력이 느려질 수 있습니다' : '전체 문서를 보고 있습니다'}</span></p>
      <button type="button" data-recent-action="past-fold" onMouseDown={holdRecentFocus} onClick={() => void showRecentOnly(id)}>최근만 보기</button></div>;
  }
  const docs = [...space.text.documents, ...space.text.flows];
  const selectedDoc = docs.find(doc => doc.id === selected);
  // F11 W-HEIGHT-02: the message goes to the open document's notice line (the note layout's 쓰기, an editor showing).
  const noteLineMessage = !!message && message !== FIND_BLOCKED && !!props.noteHeader && period === 'documents' && !!selectedDoc && !collectionMode;
  const firstFlows = !selected && props.capabilities?.discovery !== false ? programFirstOfficialFlows(data, actorId, officialActors) : [];
  const retainedIds = new Set(Object.values(space.retentionDocuments ?? {}));
  const retentionSource = Object.entries(space.retentionDocuments ?? {}).find(([, id]) => id === selected)?.[0];
  const selectedArchived = !!selectedDoc && space.archivedDocumentIds.includes(selectedDoc.id);
  const selectedTrashed = !!selectedDoc && !!space.documentTrash?.[selectedDoc.id];
  const selectedQualityHold = selectedDoc ? space.savedBindings.filter(binding => binding.documentId === selectedDoc.id)
    .flatMap(binding => Object.values(binding.itemLines)).map(id => programLegacyTaskQualityHold(space, id)).find(Boolean) : null;
  const folder = space.text.folders.find(row => row.id === folderId);
  const executionQuery = { period, date, today, folderId: collectionMode ? '' : folderId, query, includeHeld: includeHeldOccurrences, includeExcluded: includeExcludedOccurrences, page: occurrencePage };
  const occurrenceResult = useMemo(() => period === 'documents' ? { rows: [], issues: [], hasMore: false, pendingStarts: [] } : programOrderedExecutionRows(data, executionQuery), [data, period, date, today, folderId, query, includeHeldOccurrences, includeExcludedOccurrences, occurrencePage]);
  // W-FLOW-07 · W-TXT-09: on today's own 오늘 (as todayHere reads it), an open '답 확인:' line dated by today is in '다시
  // 확인할 일' above the list, so not a row of the list (nor the day close) too.
  const rechecksShown = period === 'today' && date === today && !(folderScreen && !collectionMode) && !selecting && !folderId && !query;
  const executionRows = rechecksShown ? occurrenceResult.rows.filter(row => !(row.kind === 'text-task' && !row.task.done && !!row.task.date && row.task.date <= today
    && programIsWaitTitle(row.task.title))) : occurrenceResult.rows;
  const [emptyDaysOpen, setEmptyDaysOpen] = useState(false);
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const groupAddField = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setEmptyDaysOpen(false); setAddingDate(null); }, [actorId, period, date]);
  // I7: the days of this view ordered by hand and no longer in time order, with the rows a filter hides there.
  const manualOrderDays = useMemo(() => period === 'documents' ? new Map<string, { hidden: number }>() : programManualOrderDays(data, executionQuery, executionRows),
    [data, period, date, today, folderId, query, includeHeldOccurrences, includeExcludedOccurrences, occurrencePage, executionRows]);
  const executionList = programExecutionList(executionRows, period, date, today, emptyDaysOpen, manualOrderDays);
  // N11a: 오늘 with more than three past unfinished rows folds them under the 밀린 일 card; 고르기 shows them all.
  const carryShown = period === 'today' && date === today && !selecting;
  const bandDocumentId = period === 'documents' && !folderId && !!selectedDoc && !selectedArchived && !selectedTrashed
    && space.text.documents.some(doc => doc.id === selectedDoc.id) ? selectedDoc.id : null;
  // The card has always planned over the full space, even when the visible list is filtered.
  const todayRowsForBand = useMemo(() => !bandDocumentId && !carryShown ? []
    : programOrderedExecutionRows(data, { period: 'today', date: today, today, folderId: '', query: '', includeHeld: false, includeExcluded: false, page: 0 }).rows, [!!bandDocumentId, carryShown, data, today]);
  const carrySummary = useMemo(() => programCarryoverSummary(space, today, todayRowsForBand), [space, today, todayRowsForBand]);
  const sameGroupScope = useMemo(() => programCarryoverGroupScope(space), [space]);
  const carryPast = carryShown ? executionList.filter(item => item.kind === 'row' && item.group === 'past-incomplete') : [];
  // F8 1단계 (CO-3): the late card from one late line (it was more than three), so 지난 미완료 is always folded under it.
  // 오늘 탭 ② (W-CARRY-12, mockup ③): the morning button takes the last day tasks were written (not the calendar's
  // yesterday); the open lines of the days before fold to '밀린 일 n개 · 보기'. More than 14 days back, the first cleanup
  // asks instead of the button.
  const morning = useMemo(() => carryShown && carryPast.length > 0 ? programMorningCarry(space, today) : null, [carryShown, carryPast.length > 0, space, today]);
  const morningHolds = useMemo(() => !!morningDone && morningDone.actorId === actorId && programCarryoverProof(space) === morningDone.after, [morningDone, actorId, space]);
  const carryCard = carryShown && (morningHolds || !!morning && carrySummary.count > 0);
  // N11b: what the sheet's choices would do now (its save button says how many memos a deletion takes along).
  const carrySheetPlan = useMemo(() => carryItems && carrySheetSpace && period === 'today' ? planProgramCarryover(carrySheetSpace, today, undefined,
    new Map(carryItems.map(item => [item.kind, carryChoices.get(item.kind) ?? item.choice]))) : null, [carryItems, carryChoices, carrySheetSpace, period, today]);
  // N11b: on 오늘, the same words in two 분류 or more (never merged) say so on each row: '업무 · 분류 2곳'.
  const carryPlaces = useMemo(() => period === 'today' ? programCarryoverPlaces(space, executionRows.flatMap(row => row.kind === 'text-task' ? [row.task] : []))
    : new Map<string, { place: string; count: number }>(), [period, space, executionRows]);
  const listItems = carryCard && !carryOpen ? executionList.filter(item => !(item.kind === 'heading' && item.key === 'heading:past') && !(item.kind === 'row' && item.group === 'past-incomplete')) : executionList;
  // F8 1단계 (CO-3 표시): 오늘's open rows of one group that are the same task in the same folder show as the first written,
  // with '같은 일 n줄' (its sheet lists them); checking it finishes them all in one save, with one 되돌리기.
  const sameGroups = period === 'today' && !selecting ? programSameTaskGroups(listItems.flatMap(item => item.kind === 'row' && item.entry.kind === 'text-task' && item.group
    && !item.entry.task.done && !(M.currentProgress(space.text, item.entry.task.id) ?? 0) && !programRepeatLine(space, item.entry.task.id) ? [{ task: item.entry.task, group: item.group }] : []),
    sameGroupScope) : null;
  const shownItems = sameGroups?.hidden.size ? listItems.filter(item => !(item.kind === 'row' && item.entry.kind === 'text-task' && sameGroups.hidden.has(item.entry.task.id))) : listItems;
  const monthGrid = period === 'month' && monthView === 'grid';
  const wideMonth = monthWidth >= 840;
  // C6a: 고르기 ends with any view change (탭·기간·날짜·분류·검색) and with Esc; the picks are not kept. A view change
  // leaves the way 취소 does (the calendar comes back), but not to the old scroll: the view is another one now.
  useEffect(() => { stopSelecting(false); }, [actorId, period, date, folderId, query]);
  // C6b: the move's notice goes with a view change (and with another save, in the gate above).
  // P3c (11/9): [그날 보기] changes the view itself; the notice it came from (its 되돌리기) stays through that change only.
  // Any other view change (a tab, another day, a folder, a search) still drops it.
  // Matched by its undo list (a press on the notice refreshes its time, which makes a new notice object).
  // P3d (QA P2, 11/9): kept until this effect has seen the view [그날 보기] goes to (its period, and its day), not for a
  // time: on a slow phone the effect of the changed view ran after two frames and dropped the notice (3/3 at 4x CPU).
  const datesNoticeKept = useRef<ProgramDatesNoticeKeep<ProgramTaskDateMove[]> | null>(null);
  useEffect(() => {
    const kept = datesNoticeKept.current;
    setDatesNotice(current => current && programDatesNoticeAfterView(kept, current.undo, { period, date }).keep ? current : null);
    if (programDatesNoticeAfterView(kept, kept?.undo, { period, date }).release) datesNoticeKept.current = null;
  }, [actorId, period, date, folderId, query]);
  useEffect(() => { setCarryNotice(null); }, [actorId, period, date, folderId, query]);
  useEffect(()=>{setLocationNotice(null);},[actorId,period,date,folderId,query]);
  useEffect(()=>{setLocationNotice(current=>current&&!programSame(current.after,space.text)?null:current);},[space.text]);
  useEffect(() => { setCheckNotice(null); }, [actorId, period, date, folderId, query]);
  useEffect(() => {
    if (!selecting) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.isComposing && !document.querySelector('dialog:modal')) { event.preventDefault(); stopSelecting(); } };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [selecting]);
  // C6a re-review: the host hears when picking starts and ends (and when the space goes away while picking).
  useEffect(() => { const on = !!selecting; props.onSelectingChange?.(on); return () => { if (on) props.onSelectingChange?.(false); }; }, [!!selecting]);
  // C6a review: on a phone the bar covers the host's bottom tabs; they also leave the focus order and the accessibility
  // tree while picking (wide screens keep them: a tab there ends 고르기). The host's markup is left as it is.
  useEffect(() => {
    if (!selecting) return;
    const nav = root.current?.ownerDocument.querySelector('[data-main-tab]')?.closest('nav');
    if (!(nav instanceof HTMLElement)) return;
    const wide = window.matchMedia('(min-width: 701px)');
    const apply = () => { nav.inert = !wide.matches; };
    apply(); wide.addEventListener('change', apply);
    return () => { wide.removeEventListener('change', apply); nav.inert = false; };
  }, [!!selecting]);
  // The day shown beside the grid (wide) or in the sheet (narrow): always the chosen date, so a day picked in the panel
  // is the one the sheet shows. Narrowing while the panel's ＋ line is open keeps that day open, now as a sheet (C5 review P2).
  const dayShown = !monthGrid ? null : wideMonth || dayOpen || addingDate === date ? date : null;
  const daySheetLook = (dayDialog ?? (wideMonth ? 'panel' : 'sheet')) === 'sheet';
  const sheetOpen = monthGrid && daySheetLook && !!dayShown;
  // One dialog shows the day either way, so its ＋ line (title, time, composition) survives a switch between them:
  // a modal sheet on a narrow screen, a panel beside the grid when wide. Anything else (a source opening, the view
  // changing) closes it.
  useEffect(() => {
    const sheet = daySheet.current;
    if (!sheet) return;
    const current: ProgramDayDialogMode = !sheet.open ? null : sheet.matches(':modal') ? 'sheet' : 'panel';
    // Closing the dialog to show it again would blur the ＋ line mid-syllable: a switch waits for the composition to end.
    const step = programDayDialogStep({ day: dayShown, wide: wideMonth, current, composing: sheetComposing.current && sheet.contains(document.activeElement) });
    if (step.mode === current || step.wait) { setDayDialog(current); return; }
    const active = document.activeElement;
    if (sheet.open) sheet.close();
    if (step.mode === 'sheet') sheet.showModal(); else if (step.mode === 'panel') sheet.show();
    setDayDialog(step.mode);
    // Showing a dialog moves the focus into it: a switch keeps it where it was (the ＋ line), and the panel never takes it.
    if (active instanceof HTMLElement && active.isConnected && active !== document.body && (step.mode === 'panel' || sheet.contains(active))) active.focus({ preventScroll: true });
    // A sheet given up from inside (its ＋ line closed) hands the focus to the chosen day, not back to the page.
    if (!step.mode && current === 'sheet' && monthGrid && (!active || active === document.body || sheet.contains(active)))
      root.current?.querySelector<HTMLButtonElement>(`[data-month-day="${date}"]`)?.focus({ preventScroll: true });
  }, [dayShown, wideMonth, sheetSettled]);
  // The title row already says "오늘" when every row is today's; no repeated heading then (but 고르기 keeps it, for its [모두]).
  const hideDayHeadings = !selecting && !!props.noteHeader && period === 'today' && date === today
    && executionList.every(item => item.kind !== 'row' || item.group === 'on-date');
  const allTasks = useMemo(() => programExecutionTasks(space), [space]);
  const taskProgress = useMemo(() => programTaskProgress(space.text), [space.text]);
  // C6a: why each row of the view can or cannot be picked, and each day group's rows (for its [모두]).
  const selectBlocks = selecting ? new Map(executionRows.map(row => [row.key, programSelectBlock(space, row,
    row.kind === 'text-task' && (taskProgress(row.task.id).current ?? (row.task.done ? 100 : 0)) === 100)])) : null;
  const headingKeys = new Map<string, string[]>();
  if (selecting) { let heading = ''; for (const item of executionList) { if (item.kind === 'heading') heading = item.key; else if (item.kind === 'row' && heading) headingKeys.set(heading, [...(headingKeys.get(heading) ?? []), item.entry.key]); } }
  const detailTask = detail?.kind === 'task' ? allTasks.find(task => task.id === detail.id) : null;
  const deferPicker = useRef<HTMLInputElement>(null);
  const detailLinkedMemos = detailTask ? space.text.bindings.flatMap(binding => {
    if (binding.kind !== 'task' || binding.taskId !== detailTask.id) return [];
    const doc = space.text.documents.find(row => row.id === binding.docId);
    return doc && !space.archivedDocumentIds.includes(doc.id) && !space.documentTrash?.[doc.id]
      ? [{ documentId: doc.id, lineId: binding.lineId, title: doc.title }] : [];
  }) : [];
  const detailDatePresentation = useMemo(() => detailTask ? readProgramTaskDatePresentation(space.text, detailTask, today) : null, [space.text, detailTask, today]);
  const detailDateChangeHint = programTaskDateChangeHint(detailDatePresentation, executionDateDraft,
    { current: detailTask?.time ?? '', draft: executionTimeDraft }, today);
  const detailSchedulePending = !!detailTask && (executionDateDraft !== (detailTask.date ?? '') || executionTimeDraft !== (detailTask.time ?? ''));
  const detailProgressPending = recordDate !== progressDraftBaseline.date || percent !== progressDraftBaseline.percent;
  const matchingDocumentIds = useMemo(() => new Set(folderId && docs[0] ? readProgramFolderRegions(space.text, docs[0].id, folderId)?.matchingDocumentIds ?? [] : []), [space.text, folderId]);
  const selectedCollection = collectionMode?.state.collections.find(row => row.id === collectionId);
  const collectionIds = collectionMode ? collectionDocumentIds(collectionMode.state, collectionId ? [collectionId] : collectionMode.state.collections.map(row => row.id)) : null;
  const documentList = docs.filter(doc => !retainedIds.has(doc.id) && !space.documentTrash?.[doc.id] && space.archivedDocumentIds.includes(doc.id) === showArchived && (collectionMode ? !collectionId || !!collectionIds?.has(doc.id) : !folderId || doc.folderId === folderId || matchingDocumentIds.has(doc.id))
    && (!query || `${doc.title}\n${M.raw(doc)}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
  const quickDocuments = docs.filter(doc => programDocumentContentLock(space, doc.id) === 'active');
  const quickTarget = quickDocumentId || (selectedDoc && quickDocuments.some(doc => doc.id === selectedDoc.id) ? selectedDoc.id : '');
  const range = programDateRange(period, date);
  const presentation = useRef({ period, date, folderId, query, selected, showArchived, recurrence: recurrencePresentation });
  presentation.current = { period, date, folderId, query, selected, showArchived, recurrence: recurrencePresentation };
  function rememberFindFocus() {
    const element = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const area = element instanceof HTMLTextAreaElement && root.current?.contains(element) ? element : null;
    libraryReturn.current = { actorId, documentId: selectedRef.current, period: presentation.current.period,
      folderId: presentation.current.folderId, element, area, raw: area?.value ?? '',
      start: area?.selectionStart ?? 0, end: area?.selectionEnd ?? 0,
      direction: area?.selectionDirection ?? 'none', top: area?.scrollTop ?? 0, left: area?.scrollLeft ?? 0,
      pageX: window.scrollX, pageY: window.scrollY };
  }
  function clearFindBlocked() {
    if (!findBlocked.current || libraryComposing.current || inputLockCount.current > 0) return;
    findBlocked.current = false; setMessage(current => current === FIND_BLOCKED ? '' : current);
  }
  function openFindPanel() {
    if (libraryComposing.current || inputLockCount.current > 0) {
      libraryReturn.current = null;
      findBlocked.current = true; setMessage(FIND_BLOCKED); return;
    }
    clearFindBlocked();
    cancelLibraryReveal();
    if (!libraryReturn.current) rememberFindFocus();
    setLibraryOpen(true);
  }
  useEffect(() => {
    const panel = libraryDialog.current; if (!panel) return;
    if (libraryOpen) {
      if (libraryComposing.current) { setLibraryOpen(false); return; }
      if (noteFindMenu.current?.open) noteFindMenu.current.open = false;
      if (!panel.open) panel.showModal();
      return;
    }
    if (!panel.open) return;
    const retained = libraryReturn.current;
    const focusBeforeClose = document.activeElement;
    const ownsFocus = panel.contains(focusBeforeClose);
    panel.close(); libraryReturn.current = null;
    // ＋ 새 글 in the sheet: close() just put focus back on the sheet's opener.
    // Hand that observed focus to this exact writing request, unless the user moved on.
    const writing = writingFocusRef.current;
    if (writing?.focusOwner && panel.contains(writing.focusOwner)
      && (focusBeforeClose === writing.focusOwner || focusBeforeClose === document.body)) writing.managedReturnFocus = document.activeElement;
    const sourceReturn = pendingSourceFocus.current;
    // Switching today/find to writing removes the clicked result in the same
    // commit. Only that captured, now-detached owner may explain body focus.
    const detachedSourceOwner = sourceReturn?.findSourceOwner;
    const ownedRemoval = !ownsFocus && detachedSourceOwner && !detachedSourceOwner.isConnected
      && focusBeforeClose === document.body;
    if ((ownsFocus || ownedRemoval) && sourceReturn?.findPanel === panel && sourceReturn.documentId === selectedRef.current
      && presentation.current.period === 'documents' && dataRef.current.activeActorId === actorId) {
      // Native dialog.close() restores its opener before the source RAF runs.
      // Hand that observed focus to this exact request, never a later request.
      sourceReturn.managedReturnFocus = document.activeElement;
      sourceReturn.findPanel = undefined;
      requestAnimationFrame(sourceReturn.attempt);
    }
    // Closing a find panel is presentation-only. A document/source navigation
    // owns its own focus and must never be overwritten by this return.
    if (!retained || !ownsFocus || dataRef.current.activeActorId !== retained.actorId
      || selectedRef.current !== retained.documentId || presentation.current.period !== retained.period
      || presentation.current.folderId !== retained.folderId || libraryComposing.current) return;
    let target = retained.area ?? retained.element ?? libraryToggle.current;
    // U44 review: the tablet turned while the sheet was open, so the title it was opened from is drawn in its other
    // place now; that one takes the focus back.
    if (!retained.area && target && !target.isConnected && target.classList.contains(styles.titleButton)) target = titleToggle.current;
    // Only the same Find opener may fall back to its now-closed note menu.
    // A hidden editor or an unrelated removed owner must never transfer focus.
    if (!retained.area && target === libraryToggle.current && target?.isConnected
      && !target.getClientRects().length && noteFindMenuSummary.current?.getClientRects().length) {
      target = noteFindMenuSummary.current;
    }
    if (!target?.isConnected || !target.getClientRects().length) return;
    if (retained.area && (retained.area.value !== retained.raw || retained.area.readOnly)) return;
    target.focus({ preventScroll: true });
    if (retained.area) {
      retained.area.setSelectionRange(retained.start, retained.end, retained.direction);
      retained.area.scrollTop = retained.top; retained.area.scrollLeft = retained.left;
    }
  }, [libraryOpen]);
  const documentsRef = useRef(docs); documentsRef.current = docs;
  const workspaceRef = useRef(space.text); workspaceRef.current = space.text;
  const sourceFocusPorts = useRef<Record<string, ProgramSourceFocus | null>>({});
  const importArrival = useRef<{ key: string; attempt: () => void } | null>(null);
  const importArrived = useRef<string | null>(null);
  const pendingSourceFocus = useRef<{ documentId: string; taskId: string; attempt: () => void; isCurrent: () => boolean; managedReturnFocus?: Element | null; findPanel?: HTMLDialogElement; findSourceOwner?: Element | null } | null>(null);
  const sourceNavigation = useMemo(createPendingProgramSourceNavigation, []);
  const sourceEpoch = props.sourceReturnEpoch ?? props.pmTextHost?.epoch;
  // Tasks whose completion tap is still waiting or saving, one entry per task so
  // two waiting rows do not overwrite each other. The ref blocks a repeat tap at
  // once; the state draws those rows as waiting. Kept per session: a new session
  // starts with no locks, and an old tap's finish touches only its own set.
  const completingTasks = useRef<CompletingTasks>({ epoch: sourceEpoch, ids: new Set() });
  const [completingTaskIds, setCompletingTaskIds] = useState<ReadonlySet<string>>(() => new Set());
  const sourceMounted = useRef(true), sourceSession = useRef(sourceEpoch);
  sourceSession.current = sourceEpoch;
  // Flow pipeline S11: over a writing document of mine (not a Flow document, not a gathered folder), the unfinished tasks
  // of the Flows I took that 오늘 lists (its own query and order: today's and earlier ones still open). Drawn only.
  const flowDocuments = useMemo(() => new Map(space.copies.filter(copy => !space.documentTrash?.[copy.documentId] && !space.archivedDocumentIds.includes(copy.documentId))
    .flatMap(copy => (doc => doc ? [[copy.documentId, doc.title] as const] : [])(space.text.flows.find(row => row.id === copy.documentId)))), [space]);
  // F6-B2: each Flow document's 실 (its days as dots, the done ones filled) and done/total, for 오늘's rows and the band.
  const flowThreads = useMemo(() => new Map([...flowDocuments.keys()].map(id => [id, programDocumentThread(space.text, id)] as const)), [flowDocuments, space.text]);
  // F8 1단계 (CO-1): '이어지는 일' — 오늘's own query for today; the band takes the open rows dated today whose line is not in
  // this document's today section (a Flow's, moved, another document's, a repeat's round), and counts the late ones.
  const continueBand = useMemo(() => !bandDocumentId ? { rows: [] as ProgramContinueRow[], late: 0, flow: 0 } : programContinueBand(todayRowsForBand, { today, documentId: bandDocumentId,
    // int9 (typelag ①): each band row's repeat read from the text's tasks read once (textTasks), not a parse per row per key.
    flowTitle: id => flowDocuments.get(id) ?? null, repeat: id => (line => line && !line.block ? `↻ ${line.marker.label}` : null)(programRepeatLine(space, id, textTasks)),
    progress: id => taskProgress(id).current }), [todayRowsForBand, bandDocumentId, flowDocuments, space, today, taskProgress, textTasks]);
  // Core3 P3 (UX F2): a list row's ⋯ starts with 미루기 — the row as 고르기 would pick it (not a repeat's round, not
  // finished, not locked), moved by C6b's one save with its notice and 되돌리기. F8 1단계: in writing, the band's
  // [미루기] opens the same sheet, its row read from 오늘's own query.
  // A row checked in the band stays (faded, where it was) until the screen is left; a finished round has moved on.
  const [bandChecked, setBandChecked] = useState<ReadonlyMap<string, { row: ProgramContinueRow; index: number; repeatCheck?: ProgramRepeatCheck | null }>>(() => new Map());
  // int9 r2 (기타 int9 QA P3): a repeat round finished from the band says so in the writing view's notice line, with [되돌리기].
  const [bandUndoing, setBandUndoing] = useState<ReadonlySet<string>>(() => new Set());
  // F12 1차 (W-FLOW-04·05·07·08·09·10): 오늘's progress lines, '다시 확인할 일', the evening's [내일]/[건너뛰기], the
  // once-per-run question and the date sheet a long press on [내일] opens. Read in memory at each render; nothing stored.
  const flowRuns = useMemo(() => period === 'today' ? programFlowRuns(data, actorId, today, textTasks) : [], [period, data, actorId, today, textTasks]);
  const rechecks = useMemo(() => period === 'today' ? programRechecks(space, today) : [], [period, space, today]);
  const [flowBusy, setFlowBusy] = useState<ReadonlySet<string>>(() => new Set());
  // P2-3: the day close's hour is the clock's, read with today's date (never a minute late).
  const closeHour = dayClock.hour;
  const [deferAsk, setDeferAsk] = useState<{ run: ProgramFlowRun; taskId: string; date: string; plans: Record<ProgramDeferMode, ProgramDeferPlan>; time?: string } | null>(null);
  // 기타 F12 1차 QA P3: 다시 확인할 일's check and [내일] say what they did with [되돌리기].
  const [flowNotice, setFlowNotice] = useState<{ text: string; undo?: () => Promise<boolean>; busy?: boolean } | null>(null);
  const deferDialog = useRef<HTMLDialogElement>(null);
  const [closeSheet, setCloseSheet] = useState<{ taskId: string; run: ProgramFlowRun | null; at: number } | null>(null);
  const closeSheetDialog = useRef<HTMLDialogElement>(null);
  const closeHold = useRef<{ timer: ReturnType<typeof setTimeout>; fired: boolean } | null>(null);
  // UX r3 D1 (총괄 11/11 23:4x): in the day close the finished rows fold into '끝낸 일 n' (open for this visit only).
  const [closeDoneOpen, setCloseDoneOpen] = useState(false);
  useEffect(() => { const box = deferDialog.current; if (!box) return; if (deferAsk && !box.open) box.showModal(); if (!deferAsk && box.open) box.close(); }, [deferAsk]);
  useEffect(() => { const box = closeSheetDialog.current; if (!box) return; if (closeSheet && !box.open) box.showModal(); if (!closeSheet && box.open) box.close(); }, [closeSheet]);
  const [bandRepeatNotice, setBandRepeatNotice] = useState<{ actorId: string; documentId: string; taskId: string; text: string; check: ProgramRepeatCheck | null } | null>(null);
  const [bandFailed, setBandFailed] = useState<string | null>(null);
  useEffect(() => { setBandChecked(new Map()); setBandFailed(null); setBandRepeatNotice(null); }, [actorId, period, selected, folderId]);
  // The source open now waiting out the host's check, shown on its row and in the
  // host notice. A token, so an older wait on the same task cannot clear a newer one.
  const sourceWaiting = useRef<object | null>(null);
  const [sourceWaitingTask, setSourceWaitingTask] = useState<string | null>(null);
  function showSourceWaiting(taskId: string): object {
    const token = {};
    sourceWaiting.current = token; setSourceWaitingTask(taskId); props.onSourceReturnQueued?.(true);
    return token;
  }
  function clearSourceWaiting(token?: object) {
    if (!sourceWaiting.current || (token && sourceWaiting.current !== token)) return;
    sourceWaiting.current = null; setSourceWaitingTask(null); props.onSourceReturnQueued?.(false);
  }
  // "← 오늘" lives only while that same source stays open; any other document or view drops it.
  const [sourceOrigin, setSourceOrigin] = useState<SourceOrigin | null>(null);
  // The return also remembers what started it (a tab or "← 오늘") so focus moves on only from there.
  const [sourceRestore, setSourceRestore] = useState<(SourceOrigin & { opener: Element | null }) | null>(null);
  useEffect(() => {
    setSourceOrigin(origin => origin && (origin.actorId !== actorId || period !== 'documents' || selected !== origin.documentId) ? null : origin);
  }, [actorId, period, selected]);
  const sourceOriginTab = (origin: SourceOrigin) => origin.view.period === 'all' ? 'all' : 'today';
  const sourceOriginOpen = !!sourceOrigin && period === 'documents' && selected === sourceOrigin.documentId;
  // F4-a: from a folder's [할 일] the way back names that folder ('← 보고', '← 모든 할 일').
  const sourceOriginLabel = sourceOrigin && sourceOriginTab(sourceOrigin) === 'all' ? collectionMode ? '전체 할 일'
    : sourceOrigin.view.folderOpen ? sourceOrigin.view.folderId ? space.text.folders.find(row => row.id === sourceOrigin.view.folderId)?.title ?? '폴더' : '모든 할 일' : '폴더' : '오늘';
  /** The view a source opens from: C5 adds the calendar and the day open in its sheet or panel; F4-a, the folder screen. */
  const sourceView = (): SourceOrigin['view'] => ({ period, date, folderId, query, ...(monthGrid ? { monthView: 'grid' as const, dayOpen: !!dayShown } : {}),
    ...(period === 'all' && folderScreenRef.current ? { folderOpen: true } : {}) });
  function openFromList(task: TextTask, button: HTMLElement) {
    // C5 review P1: a line written on a day's ＋ stays; the press goes back to it. The sheet itself stays open
    // (the row shows its wait) until the source opens; openDocument closes it then, and 닫기 cancels the wait.
    if (keepWrittenDay()) return;
    const row = button.closest('li');
    const origin: SourceOrigin = { actorId, documentId: task.docId, taskId: task.id, top: row ? row.getBoundingClientRect().top : null,
      scrollY: window.scrollY, view: sourceView() };
    void openDocument(task.docId, task.id).then(opened => { if (opened && dataRef.current.activeActorId === origin.actorId) setSourceOrigin(origin); });
  }
  /** C5 review P2: an occurrence's source opens the same way, so "← 오늘" brings back its month, day and row. */
  function openOccurrenceSource(documentId: string, lineId: string, rowKey: string) {
    if (keepWrittenDay()) return;
    const row = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-execution-key]') ?? [])
      .find(element => element.dataset.executionKey === rowKey && element.getClientRects().length);
    const origin: SourceOrigin = { actorId, documentId, taskId: '', rowKey, top: row ? row.getBoundingClientRect().top : null, scrollY: window.scrollY, view: sourceView() };
    void openDocument(documentId, lineId).then(opened => { if (opened && dataRef.current.activeActorId === origin.actorId) setSourceOrigin(origin); });
  }
  async function returnToSourceOrigin() {
    const origin = sourceOrigin, opener = document.activeElement;
    if (!origin || inputLockCount.current > 0) return;
    const release = lockInput();
    try {
      // Same rule as any tab change: unsaved or composing input keeps this document open.
      if (!await flushAllEditors()) { showViewChangeBlocked(); return; }
      if (dataRef.current.activeActorId !== origin.actorId) return;
      setSourceOrigin(null); setPeriod(origin.view.period); setDate(origin.view.date); setFolderId(origin.view.folderId); setQuery(origin.view.query);
      setFolderScreen(origin.view.folderOpen ? { tab: 'tasks', writing: selectedRef.current, shown: null } : null);
      if (origin.view.monthView === 'grid') { setMonthView('grid'); setDayOpen(!!origin.view.dayOpen); }
      setMessage(''); setViewChangeNotice(null); setTaskNotice(null); setOrderNotice(null); setSourceRestore({ ...origin, opener });
    } finally { release(); }
  }
  /** One way to change the main tab, for the space's own tabs and the host's: the tab a source was
   *  opened from goes back there (R7); any other tab is an ordinary period change. */
  function chooseMainTab(key: ProgramMainTab): Promise<boolean> {
    return sourceOriginOpen && sourceOriginTab(sourceOrigin!) === key ? returnToSourceOrigin().then(() => true) : changePeriod(key, true);
  }
  const chooseMainTabRef = useRef(chooseMainTab); chooseMainTabRef.current = chooseMainTab;
  /** N9: the 복구함's way to archived documents: 쓰기, its document list, 보관함 shown. */
  async function openArchive(): Promise<boolean> {
    if (!await chooseMainTab('documents')) return false;
    setShowArchived(true); openFindPanel(); return true;
  }
  const openArchiveRef = useRef(openArchive); openArchiveRef.current = openArchive;
  useEffect(() => {
    props.onRegisterMainTabs?.({ choose: tab => chooseMainTabRef.current(tab), openArchive: () => openArchiveRef.current() });
    return () => props.onRegisterMainTabs?.(null);
  }, [actorId]);
  // F4-a: the folder screen is the 폴더 tab, its [글] included.
  const mainTab: ProgramMainTab = folderScreen ? 'all' : programMainTabOf(period);
  useEffect(() => { props.onMainTabChange?.(mainTab); }, [mainTab]);
  useEffect(() => { props.onOpenDocumentChange?.(selected); }, [selected]);
  useEffect(() => {
    const origin = sourceRestore;
    if (!origin) return;
    if (period !== origin.view.period) { setSourceRestore(null); return; }
    const frame = requestAnimationFrame(() => {
      setSourceRestore(null);
      const row = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-task-id], [data-execution-key]') ?? [])
        .find(element => (origin.rowKey ? element.dataset.executionKey === origin.rowKey : element.dataset.taskId === origin.taskId) && element.getClientRects().length);
      if (!row || origin.top === null) { window.scrollTo({ top: origin.scrollY, behavior: 'instant' }); return; }
      // Put the row back at its old height in whichever box scrolls it, then on the page.
      let offset = row.getBoundingClientRect().top - origin.top;
      for (let box = row.parentElement; box && Math.abs(offset) > 1; box = box.parentElement) {
        if (!/(auto|scroll)/.test(getComputedStyle(box).overflowY) || box.scrollHeight <= box.clientHeight) continue;
        box.scrollTop += offset; offset = row.getBoundingClientRect().top - origin.top;
      }
      if (Math.abs(offset) > 1) window.scrollBy({ top: offset, behavior: 'instant' });
      const active = document.activeElement;
      // C5: a row back in the calendar's sheet takes the focus the sheet's opening gave its first button.
      if (!active || active === document.body || !active.getClientRects().length || active === origin.opener || !!daySheet.current?.open && daySheet.current.contains(row))
        (row.querySelector<HTMLButtonElement>(`button.${styles.taskTitle}`) ?? row.querySelector<HTMLButtonElement>('button'))?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [sourceRestore, period]);
  useEffect(() => {
    if (completingTasks.current.epoch === sourceEpoch) return;
    completingTasks.current = { epoch: sourceEpoch, ids: new Set() };
    setCompletingTaskIds(new Set());
  }, [sourceEpoch]);
  useEffect(() => {
    sourceMounted.current = true;
    const cancel = () => { sourceNavigation.cancel(); pendingSourceFocus.current = null; };
    // A cancelled open stops waiting too, so its row and notice clear with it.
    const cancelOpen = () => { cancel(); clearSourceWaiting(); };
    // Capture before the clicked source handler creates its new intent. A later
    // action, including input/revert or focus navigation, invalidates the old one.
    const events = ['pointerdown', 'click', 'keydown', 'beforeinput', 'input', 'compositionstart', 'wheel'] as const;
    for (const event of events) document.addEventListener(event, cancelOpen, true);
    window.addEventListener('blur', cancelOpen);
    return () => {
      sourceMounted.current = false; cancelOpen();
      for (const event of events) document.removeEventListener(event, cancelOpen, true);
      window.removeEventListener('blur', cancelOpen);
    };
  }, [actorId, sourceEpoch, sourceNavigation]);
  function registerSourceFocus(documentId: string, focus: ProgramSourceFocus | null) {
    sourceFocusPorts.current[documentId] = focus;
    const request = pendingSourceFocus.current;
    if (focus && request?.documentId === documentId) requestAnimationFrame(request.attempt);
    if (focus && props.importNotice?.documentId === documentId && importArrival.current) requestAnimationFrame(importArrival.current.attempt);
  }
  useEffect(() => {
    const notice = props.importNotice;
    if (!notice?.lineId || notice.actorId !== actorId || notice.documentId !== selected) return;
    const key = actorId + ':' + notice.documentId + ':' + notice.lineId;
    if (importArrived.current === key) return;
    const focusOwner = document.activeElement;
    const attempt = () => {
      if (importArrival.current?.key !== key || dataRef.current.activeActorId !== actorId || selectedRef.current !== notice.documentId
        || sourceSession.current !== sourceEpoch || inputLockCount.current > 0 || Object.values(dirty.current).some(Boolean)
        || Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.())) return;
      if (document.activeElement !== focusOwner && document.activeElement !== document.body) { importArrival.current = null; return; }
      if (recentViewRef.current(notice.documentId)?.hidden.has(notice.lineId!)) { void showRecentWhole(notice.documentId, true); return; }
      const doc = shownDocument(notice.documentId);
      const textarea = document.getElementById('program-text-' + encodeURIComponent(notice.documentId)) as HTMLTextAreaElement | null;
      const index = doc?.lines.findIndex(line => line.id === notice.lineId) ?? -1;
      if (!doc || index < 0 || !textarea || !root.current?.contains(textarea) || !textarea.getClientRects().length
        || !sourceFocusPorts.current[notice.documentId]?.({ documentId: notice.documentId, lineId: notice.lineId!, raw: M.raw(doc) })) return;
      importArrived.current = key; importArrival.current = null;
      textarea.scrollTop = textarea.scrollHeight;
      const row = textarea.closest('.tle-root')?.querySelectorAll<HTMLElement>('.tle-line')[index];
      row?.animate([{ backgroundColor: '#dbeafe' }, { backgroundColor: 'transparent' }], { duration: 1500 });
    };
    importArrival.current = { key, attempt }; requestAnimationFrame(attempt);
    return () => { if (importArrival.current?.key === key) importArrival.current = null; };
  }, [actorId, selected, props.importNotice?.documentId, props.importNotice?.lineId, sourceEpoch]);
  function cancelLibraryReveal() {
    libraryReveal.current.epoch++;
    if (libraryReveal.current.frame !== null) cancelAnimationFrame(libraryReveal.current.frame);
    libraryReveal.current.frame = null;
    libraryReveal.current.request = null;
    libraryReveal.current.committedRequest = null;
  }
  useEffect(() => () => cancelLibraryReveal(), []);
  useEffect(() => {
    const request = libraryHandoff;
    if (!request || libraryReveal.current.request !== request) return;
    if (libraryOpen || period !== 'documents' || selected !== request.documentId || folderId !== request.folderId) {
      if (libraryReveal.current.committedRequest === request) libraryReveal.current.request = null;
      return;
    }
    libraryReveal.current.committedRequest = request;
    // Run only after React committed the disclosure and folder view. Child native
    // regions mount in passive effects; the event handler can precede that work.
    const frame = requestAnimationFrame(() => {
      if (libraryReveal.current.request !== request || libraryReveal.current.frame !== frame) return;
      libraryReveal.current.frame = null; libraryReveal.current.request = null; libraryReveal.current.committedRequest = null;
      if (libraryReveal.current.epoch !== request.epoch || inputLockCount.current > 0 || Object.values(dirty.current).some(Boolean)
        || Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.())
        || props.canContinueWholeDocument?.() === false || !window.matchMedia('(max-width:760px)').matches
        || selectedRef.current !== request.documentId || presentation.current.period !== 'documents'
        || presentation.current.folderId !== request.folderId) return;
      const button = props.hostMainTabs ? titleToggle.current : libraryToggle.current, host = root.current;
      const documentHost = Array.from(host?.querySelectorAll<HTMLElement>('[data-program-document]') ?? [])
        .find(element => element.dataset.programDocument === request.documentId);
      const editor = documentHost?.querySelector<HTMLElement>('section[aria-label="개인 문서 편집"]');
      const area = Array.from(editor?.querySelectorAll<HTMLTextAreaElement>('textarea') ?? [])
        .find(element => element.getClientRects().length && !element.readOnly);
      if (!host?.getClientRects().length || !button?.getClientRects().length || !editor?.getClientRects().length || !area) return;
      if (document.activeElement && document.activeElement !== document.body
        && document.activeElement !== request.focusOwner && document.activeElement !== button) return;
      // Preserve native input/caret and avoid opening the mobile keyboard.
      button.focus({ preventScroll: true });
      const bounds = area.getBoundingClientRect();
      if (bounds.top >= window.innerHeight || bounds.bottom <= 0) editor.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    libraryReveal.current.frame = frame;
    return () => {
      cancelAnimationFrame(frame);
      if (libraryReveal.current.frame === frame) libraryReveal.current.frame = null;
    };
  }, [libraryHandoff, libraryOpen, folderId, selected, period]);
  function lockInput() {
    inputLockCount.current++;
    Object.values(inputLocks.current).forEach(lock => lock?.(true));
    const releases = Object.values(recurrencePorts.current).flatMap(port => port?.lockInput ? [port.lockInput()] : []);
    let released = false;
    return () => {
      if (released) return; released = true; releases.forEach(release => release()); inputLockCount.current--;
      if (!inputLockCount.current) {
        Object.values(inputLocks.current).forEach(lock => lock?.(false));
        // Alpha's already-requested route flush temporarily locks retained
        // editors. Resume only this existing source-focus request after unlock.
        const request = pendingSourceFocus.current;
        if (request) requestAnimationFrame(request.attempt);
        clearFindBlocked();
      }
    };
  }
  async function flushRecurrenceEditors() {
    try { for (const port of Object.values(recurrencePorts.current)) if (port && !await port.flushAll()) return false; return true; }
    catch { return false; }
  }
  async function flushAllEditors() {
    if (!await flushRecurrenceEditors()) return false;
    return flushProgramEditorCollection(() => Object.keys(dirty.current).map(id => ({ dirty: () => !!dirty.current[id], save: saveRequests.current[id] ?? undefined })));
  }
  function currentViewChangeReason() {
    const statuses = Object.values(saveStatusReaders.current).flatMap(read => read ? [read()] : []);
    return statuses.some(status => status.composing) ? 'composition'
      : Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.()) ? 'recurrence'
      : statuses.some(status => status.saving) ? 'saving'
      : statuses.some(status => status.failed) ? 'save-failed' : 'pending';
  }
  function showViewChangeBlocked() {
    setViewChangeNotice({ actorId: dataRef.current.activeActorId, reason: currentViewChangeReason() });
  }
  function editorDirtyChanged(id: string, ownerId: string, value: boolean) {
    if (dataRef.current.activeActorId !== ownerId) return;
    const wasDirty = !!dirty.current[id]; dirty.current[id] = value;
    if (value) setViewChangeNotice(previous => {
      if (!previous || previous.actorId !== ownerId) return previous;
      const reason = currentViewChangeReason();
      return previous.reason === reason ? previous : { ...previous, reason };
    });
    if (wasDirty && !value) setViewChangeNotice(previous => {
      if (!previous || previous.actorId !== ownerId || Object.values(dirty.current).some(Boolean)
        || Object.values(saveStatusReaders.current).some(read => read?.().composing)
        || Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.())) return previous;
      return null;
    });
  }
  async function changeFolder(nextFolderId: string, options: { fromLibrary?: boolean } = {}) {
    cancelLibraryReveal();
    const epoch = libraryReveal.current.epoch, documentId = selectedRef.current;
    const focusOwner = options.fromLibrary ? document.activeElement : null;
    if (inputLockCount.current > 0) return;
    const release = lockInput();
    try {
      if (!await flushAllEditors()) { showViewChangeBlocked(); return; }
      setFolderId(nextFolderId); setMessage(''); setViewChangeNotice(null); setTaskNotice(null); setOrderNotice(null);
      // Only an explicit mobile library choice hands presentation back to writing.
      // Empty results keep the library available for choosing another document.
      if (options.fromLibrary && libraryReveal.current.epoch === epoch && window.matchMedia('(max-width:760px)').matches
        && presentation.current.period === 'documents' && selectedRef.current === documentId
        && documentsRef.current.some(doc => doc.id === documentId) && props.canContinueWholeDocument?.() !== false
        && programDocumentContentLock(space, documentId) === 'active'
        && (!nextFolderId || readProgramFolderRegions(workspaceRef.current, documentId, nextFolderId)?.regions.some(region => !region.readOnly))) {
        libraryReturn.current = null; setLibraryOpen(false);
        const request = { epoch, documentId, folderId: nextFolderId, focusOwner };
        libraryReveal.current.request = request; setLibraryHandoff(request);
      }
    } finally { release(); }
  }
  async function changePeriod(nextPeriod: ProgramPeriod, main = false) {
    if (inputLockCount.current > 0) return false;
    const release = lockInput();
    try {
      if (!await flushAllEditors()) { showViewChangeBlocked(); return false; }
      // 7k stage 1: the 쓰기 tab keeps the writing view's gathered folder (only 전체 보기 ends it); a folder picked in 분류
      // does not carry into 쓰기, and 오늘 shows everything.
      if (main) { setQuery(''); if (nextPeriod === 'documents') setFolderId(writingFolder.current); else setFolderId(''); }
      // F4-a: a main tab leaves the folder screen (폴더 itself goes back to its list); 쓰기 gets back the document it showed
      // before [글] took the editor.
      const screen = folderScreenRef.current;
      if (main && screen) {
        setFolderScreen(null);
        if (presentation.current.period === 'documents' && screen.writing !== selectedRef.current && (!screen.writing || documentsRef.current.some(doc => doc.id === screen.writing))) setSelected(screen.writing);
        if (nextPeriod === 'all') setFolderTop(count => count + 1);
      }
      setPeriod(nextPeriod); if (collectionMode) setLibraryOpen(false); if (nextPeriod === 'today') setDate(today); setMessage(''); setViewChangeNotice(null); setTaskNotice(null); setOrderNotice(null); return true;
    } finally { release(); }
  }
  async function changeCollection(nextId: string) {
    if (inputLockCount.current > 0) return;
    const release = lockInput();
    try {
      if (!await flushAllEditors()) { setMessage('작성 중인 입력을 저장하거나 취소한 뒤 모음을 바꿔 주세요.'); return; }
      setCollectionId(nextId); setMessage('');
    } finally { release(); }
  }
  async function writeCollections(next: DocumentCollections) {
    if (!collectionMode) return false;
    const saved = await collectionMode.onChange(next);
    setMessage(saved ? '' : '모음 연결을 저장하지 못했습니다. 원문은 변경하지 않았습니다.');
    return saved;
  }
  async function showFolderTasks() {
    return changePeriod('all');
  }
  async function showAllTasksFromEmpty() {
    if (!await changePeriod('all')) return;
    requestAnimationFrame(() => {
      if (presentation.current.period === 'all') focusViewControl();
    });
  }
  /** F4-a (FR-1): the three ways in — the 폴더 list, a folder line's '이 폴더 보기' (or its open control) and a task's
   *  folder in its ⋯ — open one screen: that folder's [할 일], from the top. '' is 모든 할 일 (it has no [글]). Every
   *  editor is saved first, as any view change. */
  async function openFolderScreen(nextFolderId: string) {
    if (inputLockCount.current > 0) return false;
    const release = lockInput();
    try {
      if (!await flushAllEditors()) { showViewChangeBlocked(); return false; }
      const screen = folderScreenRef.current, writing = screen ? screen.writing : selectedRef.current;
      // From another folder's [글]: 쓰기's document is the one under the editor again.
      if (screen && presentation.current.period === 'documents' && writing !== selectedRef.current && (!writing || documentsRef.current.some(doc => doc.id === writing))) setSelected(writing);
      setFolderScreen({ tab: 'tasks', writing, shown: null });
      setQuery(''); setFolderId(nextFolderId); setPeriod('all'); if (nextFolderId) setLastFolder(nextFolderId);
      setLibraryOpen(false); setSourceOrigin(null); setMessage(''); setViewChangeNotice(null); setTaskNotice(null); setOrderNotice(null);
      setFolderTop(count => count + 1);
      return true;
    } finally { release(); }
  }
  /** ‹ : back to the folder list (the folder stays chosen beside it on a wide screen). */
  async function closeFolderScreen() {
    if (!folderScreenRef.current || inputLockCount.current > 0) return;
    const release = lockInput();
    try {
      if (!await flushAllEditors()) { showViewChangeBlocked(); return; }
      const screen = folderScreenRef.current;
      if (!screen) return;
      if (presentation.current.period === 'documents' && screen.writing !== selectedRef.current && (!screen.writing || documentsRef.current.some(doc => doc.id === screen.writing))) setSelected(screen.writing);
      setFolderScreen(null); setFolderId(''); setPeriod('all'); setMessage(''); setViewChangeNotice(null);
      setFolderTop(count => count + 1);
    } finally { release(); }
  }
  /** [할 일] | [글]. [글] shows the document last written there (else the first) in the editor of regions; with no
   *  document it says so. Either starts at the top. */
  async function chooseFolderTab(tab: 'tasks' | 'writing') {
    const screen = folderScreenRef.current;
    if (!screen || inputLockCount.current > 0) return;
    const release = lockInput();
    try {
      if (!await flushAllEditors()) { showViewChangeBlocked(); return; }
      const current = folderScreenRef.current;
      if (!current) return;
      if (tab === 'tasks') { setPeriod('all'); setFolderScreen({ ...current, tab }); }
      else {
        const list = folderWritingDocumentsRef.current, id = current.shown && list.some(doc => doc.id === current.shown) ? current.shown : list[0]?.id ?? null;
        setFolderScreen({ ...current, tab, shown: id });
        if (id) { setSelected(id); setOpened(previous => previous.includes(id) ? previous : [...previous, id]); setPeriod('documents'); }
        else setPeriod('all');
      }
      setMessage(''); setViewChangeNotice(null); setTaskNotice(null);
      setFolderTop(count => count + 1);
    } finally { release(); }
  }
  /** [글]: a folded document's line opens it (one at a time; the one open before is saved first and folds). */
  async function showFolderDocument(id: string) {
    const screen = folderScreenRef.current;
    if (!screen || screen.tab !== 'writing' || selectedRef.current === id || inputLockCount.current > 0) return;
    const release = lockInput();
    try {
      if (!await flushAllEditors()) { showViewChangeBlocked(); return; }
      const current = folderScreenRef.current;
      if (!current || current.tab !== 'writing') return;
      setFolderScreen({ ...current, shown: id });
      setSelected(id); setOpened(previous => previous.includes(id) ? previous : [...previous, id]);
    } finally { release(); }
  }
  /** 위험 3: a locked line of [글] opens in its own writing, at that line's task (a check under it: its task). */
  function openFolderLine(documentId: string, row: TextRow) {
    const taskId = row.kind === 'task' ? row.id : row.parentTaskId ?? row.taskId ?? null;
    if (taskId) { void openDocument(documentId, taskId); return; }
    void (async () => {
      if (inputLockCount.current > 0) return;
      const release = lockInput();
      try {
        if (!await flushAllEditors()) { showViewChangeBlocked(); return; }
        setFolderScreen(null); setFolderId(''); setSelected(documentId); setPeriod('documents'); props.navigate({ view: 'space', id: documentId });
      } finally { release(); }
    })();
  }
  /** N9 (U50): the empty view's 할 일 추가 opens the view's own quick add, its title field focused. */
  function openQuickAddFromEmpty() {
    setNoteQuickOpen(true);
    const box = quickDisclosure.current; if (box) box.open = true;
    requestAnimationFrame(() => quickDisclosure.current?.querySelector<HTMLInputElement>('input[name="title"]')?.focus());
  }
  useEffect(() => {
    props.onRegisterEditors?.({ lockInput,
      inputCheckpoint: () => Object.keys(inputCheckpointReaders.current).sort().flatMap(id => { const read = inputCheckpointReaders.current[id]; return read ? [read()] : []; }),
      captureComplete: () => Object.values(captureReaders.current).every(read => !read || read()),
      acceptConfirmedPrivateText: (before, next, ack) => ack
        ? ack.identity.ownerId===actorId&&!!confirmedSaveReaders.current[ack.identity.docId]?.(before,next,ack)
        : Object.values(confirmedSaveReaders.current).reduce((accepted, confirm) => !!confirm?.(before, next) || accepted, false),
      hasPendingInput: () => Object.values(dirty.current).some(Boolean) || Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.()),
      blocksExternalSnapshot: (before, next) => Object.values(externalReaders.current).some(read => read?.(before, next)) || Object.values(recurrencePorts.current).some(port => port?.blocksExternalSnapshot?.(before, next)),
      pendingDocumentIds: () => Object.keys(dirty.current).filter(id => dirty.current[id]),
      // Recovery (11/10 21:04): a document is a draft only with body input. A child panel open over an unchanged body
      // keeps it pending (hasPendingInput, pendingDocumentIds) but is not kept as '이 문서에 복구할 입력'.
      captureDrafts: () => [...Object.keys(dirty.current).filter(id => dirty.current[id] && bodyPendingReaders.current[id]?.() !== false).map(id => ({ documentId: id, title: documentsRef.current.find(doc => doc.id === id)?.title ?? '작성 중 문서', raw: draftReaders.current[id]?.() ?? '' })), ...Object.values(recurrencePorts.current).flatMap(port => port?.captureDrafts?.() ?? [])],
      captureHeldDrafts: () => [...Object.keys(draftReaders.current).filter(id => saveStatusReaders.current[id]?.().held === true)
        .map(id => ({ documentId: id, title: documentsRef.current.find(doc => doc.id === id)?.title ?? '작성 중 문서', raw: draftReaders.current[id]?.() ?? '' })),
        ...Object.values(recurrencePorts.current).flatMap(port => port?.captureHeldDrafts?.() ?? [])],
      // Unconfirmed child panels go to the tab's recovery only, never to captureDrafts: save-ACK
      // ownership needs exactly one document draft there, and input boundaries read it too.
      captureRecoveryDrafts: () => childDraftRecoveryEntries(Object.values(childDraftReaders.current).flatMap(read => read?.() ?? [])),
      captureStructuralDrafts: () => Object.keys(dirty.current).filter(id => dirty.current[id]).flatMap(id => {
        const draft = structuralDraftReaders.current[id]?.(); return draft ? [draft] : [];
      }),
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
          PROGRAM_TODAY_SHOWN.add(`${actorId}:${id}`); // W-ORDER-02: back here, the place it had.
        }
        requestAnimationFrame(() => {
          for (const [id, position] of Object.entries(checkpoint.writing ?? {})) {
            const textarea = document.getElementById(`program-text-${encodeURIComponent(id)}`) as HTMLTextAreaElement | null;
            const view = recentViewRef.current(id), shown = view ? recentPosition(id, view, position, false) : position;
            if (textarea) { textarea.setSelectionRange(Math.min(shown.start, textarea.value.length), Math.min(shown.end, textarea.value.length)); textarea.scrollTop = position.scrollTop; }
          }
        });
      },
    });
    return () => props.onRegisterNavigation?.(null);
  }, [actorId]);
  async function openDocumentAction(action: (documentId: string) => void | Promise<void>, options: { closeMenu?: boolean; modalReturnFocus?: boolean } = {}) {
    if (!selectedDoc || preparing.current || retentionSource) return;
    const id = selectedDoc.id;
    const releaseInput = lockInput();
    preparing.current = true; setPreparingDocumentAction(true); setMessage('');
    try {
      if (!await flushRecurrenceEditors()) { setMessage('회차 날짜를 적용하거나 취소한 뒤 문서 작업을 다시 열어 주세요.'); return; }
      const result = await prepareProgramDocumentAction({ dirty: () => !!dirty.current[id], save: saveRequests.current[id] ?? undefined, stillSelected: () => selectedRef.current === id });
      if (result === 'ready') {
        // Ordinary navigation retains its focus behavior. A modal needs a visible
        // return target: the preparing action button is disabled and about to be
        // hidden, so establish the menu summary before the child captures focus.
        // Never reset the native title field or its compare-and-swap baseline.
        if (options.closeMenu !== false && documentMenu.current) {
          documentMenu.current.open = false;
          if (options.modalReturnFocus) documentMenu.current.querySelector<HTMLElement>(':scope > summary')?.focus({ preventScroll: true });
        }
        await action(id);
      }
      else if (result === 'save-failed') setMessage('현재 입력을 저장하지 못했습니다. 본문의 저장 오류를 해결한 뒤 다시 열어 주세요.');
    } finally { releaseInput(); preparing.current = false; setPreparingDocumentAction(false); }
  }
  useEffect(() => {
    const port: ProgramReviewSpacePort = {
      capture: documentId => {
        const editor = document.getElementById(`program-text-${encodeURIComponent(documentId)}`) as HTMLTextAreaElement | null;
        const doc = dataRef.current.spaces[actorId]?.text.documents.find(entry => entry.id === documentId);
        if (!doc || !editor || !editor.isConnected || (editor.readOnly && !preparing.current) || !editor.getClientRects().length
          || selectedRef.current !== documentId || presentation.current.period !== 'documents' || dirty.current[documentId]) return null;
        const raw = M.raw(doc);
        const origin = { actorId, documentId, raw, editor, checkpoint: {
          schema: 'flowme-navigation/1' as const, actorId, location: programLocation({ view: 'space', id: documentId }),
          space: { ...presentation.current }, scroll: window.scrollY, focus: editor.id,
          writing: { [documentId]: { start: editor.selectionStart, end: editor.selectionEnd, scrollTop: editor.scrollTop } },
        } };
        return editor.value === (shownDocument(documentId) ? M.raw(shownDocument(documentId)!) : raw) && !programReviewOriginReason(dataRef.current, origin) ? origin : null;
      },
      restore: (origin, currentVisit, previousFocus) => new Promise(resolve => {
        const valid = () => currentVisit() && !programReviewOriginReason(dataRef.current, origin)
          && selectedRef.current === origin.documentId && !dirty.current[origin.documentId]
          && !Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.())
          && origin.editor.isConnected && document.getElementById(origin.editor.id) === origin.editor
          && !origin.editor.readOnly && origin.editor.value === (shownDocument(origin.documentId) ? M.raw(shownDocument(origin.documentId)!) : origin.raw);
        if (!valid()) { resolve(false); return; }
        const view = origin.checkpoint.space!;
        setPeriod(view.period as ProgramPeriod); setDate(view.date); setFolderId(view.folderId); setQuery(view.query);
        setShowArchived(view.showArchived); setRecurrencePresentation(view.recurrence ?? emptyProgramRecurrencePresentation());
        requestAnimationFrame(() => {
          // Recheck at the actual DOM write, after React reveals the retained editor.
          if (!valid() || !origin.editor.getClientRects().length
            || (document.activeElement !== previousFocus && document.activeElement !== document.body)) { resolve(false); return; }
          const position = origin.checkpoint.writing?.[origin.documentId];
          if (position) {
            origin.editor.setSelectionRange(position.start, position.end);
            origin.editor.scrollTop = position.scrollTop;
          }
          origin.editor.focus({ preventScroll: true });
          window.scrollTo({ top: origin.checkpoint.scroll, behavior: 'instant' });
          resolve(true);
        });
      }),
    };
    props.onRegisterReviewSpace?.(port);
    return () => props.onRegisterReviewSpace?.(null);
  }, [actorId]);
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
  async function personalAuthoringCommand(label:string,build:(data:ProgramData)=>ProgramTransition<string>,openResult=false):Promise<boolean>{
    if(preparing.current)return false;const documentId=selectedRef.current,authority={actorId,expected:space,conflict:false};
    const release=lockInput();preparing.current=true;setPreparingDocumentAction(true);moveFlush.current=authority;
    try{
      if(!await flushAllEditors()){showViewChangeBlocked();return false;}
      if(authority.conflict||selectedRef.current!==documentId)return false;
      const result=await run(label,current=>current.activeActorId!==actorId||!programSame(current.spaces[actorId],authority.expected)?programFailure(current,'conflict'):build(current));
      if(result.ok&&openResult){setSelected(result.result);setOpened(previous=>previous.includes(result.result)?previous:[...previous,result.result]);setFolderId('');setPeriod('documents');props.navigate({view:'space',id:result.result});}return result.ok;
    }finally{if(moveFlush.current===authority)moveFlush.current=null;preparing.current=false;setPreparingDocumentAction(false);release();}
  }
  // User intent is based on the displayed state, not whatever happens to be on disk at commit time.
  const base = (_current: ProgramData) => ({ actorId, requestId: programId('request'), expectedSpace: detailExpected.current ?? formExpected.current ?? space });
  const run = async (label: string, build: (current: ProgramData) => ProgramTransition<string>, history = true,
    schedule?: { taskId: string; date: string | null; time?: string; onAcknowledged?: (workspace: TextWorkspaceState | null) => void }, ownsPresentation?: () => boolean,
    awaitAutomaticRead = false, rebuildOnConflict = false) => {
    const noticeOwner = { ...executionDraftOwner.current }, noticeView = presentation.current;
    let committedSpace: typeof space | null = null;
    let beforeSchedule: typeof space | null = null;
    let beforeScheduleData: ProgramData | null = null, committedScheduleData: ProgramData | null = null;
    const target = schedule ? resolveAlphaPrivateTaskSchedule(data, actorId, schedule.taskId) : null;
    const task = target ? allTasks.find(item => item.id === target.taskId) : null;
    const alphaSocial = target && task && schedule ? { type: 'private-task-schedule' as const, ...target,
      date: schedule.date, time: schedule.time ?? task.time ?? '' } : undefined;
    const result = await mutate(label, current => { const next = build(current); if (next.ok) { if (schedule) { beforeSchedule = current.spaces[actorId]; beforeScheduleData = current; committedScheduleData = next.data; } committedSpace = next.data.spaces[actorId]; } return next; },
      { history, ...(alphaSocial ? { alphaSocial } : {}), ...(awaitAutomaticRead ? { awaitAutomaticRead } : {}), ...(rebuildOnConflict ? { rebuildOnConflict } : {}) });
    // A read-only source return must not change a later dialog's message or baseline.
    if (ownsPresentation && !ownsPresentation()) return result;
    if (result.ok) {
      formExpected.current = null;
      if (detailExpected.current && committedSpace) {
        detailExpected.current = committedSpace;
      }
      if (schedule && beforeSchedule && committedSpace && beforeScheduleData && committedScheduleData) {
        clearScheduleAcknowledgment();
        const acknowledgment = { actorId, before: beforeSchedule, after: committedSpace, beforeData: beforeScheduleData,
          afterData: committedScheduleData, detail: detailExpected.current === committedSpace,
          accept: schedule.onAcknowledged, timeout: undefined as ReturnType<typeof setTimeout> | undefined };
        scheduleAcknowledgment.current = acknowledgment;
        // A missing render cannot leave the draft permanently saving or certify an unseen response.
        if (acknowledgment.accept) acknowledgment.timeout = setTimeout(() => {
          if (scheduleAcknowledgment.current === acknowledgment) clearScheduleAcknowledgment();
        }, 3000);
        reconcileScheduleAcknowledgment();
      }
      if (committedSpace && dataRef.current.activeActorId === actorId
        && noticeOwner.dialog === executionDraftOwner.current.dialog && noticeOwner.input === executionDraftOwner.current.input
        && noticeOwner.taskId === executionDraftOwner.current.taskId
        && noticeView.period === presentation.current.period && noticeView.date === presentation.current.date
        && noticeView.folderId === presentation.current.folderId && noticeView.query === presentation.current.query
        && (schedule || ['완료', '다시 열기', '진행 기록'].includes(label))) {
        const changedId = schedule?.taskId ?? result.result;
        const changed = M.tasks((committedSpace as ProgramPrivateSpace).text).find(task => task.id === changedId);
        if (changed) {
          setTaskNotice({ taskId: changed.id, title: changed.title,
            text: schedule ? (changed.date ? `날짜를 ${programCalendarDate(changed.date, today, false)}${changed.time ? ` ${changed.time}${timeRo(changed.time)}` : '로'} 저장했습니다.` : '날짜 없음으로 저장했습니다.')
              : label === '완료' ? '완료로 저장했습니다.' : label === '다시 열기' ? '미완료로 다시 열었습니다.' : '진행 기록을 저장했습니다.' });
        }
      }
    }
    // AlphaWorkspace owns the transient busy notice and clears it on settlement.
    // Keep this form's prior failure/input state instead of persisting a duplicate.
    if (result.ok || result.reason !== 'busy') setMessage(result.ok ? '' : programErrorMessage(result.reason)); return result;
  };
  /** F4-a 폴더 관리 (A7): each press fixes its whole intent, so it waits out the host's automatic read instead of being refused
   *  as busy (a 상위 폴더 picked right after another save was dropped without a word, the select back as it was); a refusal
   *  still says so in the sheet (run leaves 'busy' to the host's notice, which the open sheet covers). */
  async function manageRun(label: string, build: (current: ProgramData) => ProgramTransition<string>) {
    const result = await run(label, build, true, undefined, undefined, true);
    if (!result.ok && result.reason === 'busy') setMessage(programErrorMessage('busy'));
    return result;
  }
  function cancelHold() { if (hold.current) clearTimeout(hold.current); hold.current = null; holdPoint.current = null; }
  function close() {
    setDetailFolderMove(false);
    executionDraftOwner.current = { dialog: executionDraftOwner.current.dialog + 1, input: 0, taskId: null };
    dialog.current?.close(); detailExpected.current = null; clearScheduleAcknowledgment(); setDetail(null); setMessage(''); setDirectProgress(false);
    // A scheduled row can leave this period after applying its date. Return to
    // the visible period control instead of focusing that detached opener.
    if (!restoreProgramDialogFocus(previousFocus.current))
      focusViewControl();
  }
  function openDetail(next: Detail) {
    setDetailFolderMove(false);
    setTaskNotice(null); setFolderDeleteAsk(null);
    previousFocus.current = document.activeElement as HTMLElement; detailExpected.current = space;
    const task = next?.kind === 'task' ? allTasks.find(task => task.id === next.id) : null;
    executionDraftOwner.current = { dialog: executionDraftOwner.current.dialog + 1, input: 0, taskId: task?.id ?? null };
    // Row click state updates have not rendered yet. Read this exact target's
    // initial progress here instead of capturing the previous dialog's fields.
    const initialProgress = task ? { date: today, percent: String(M.currentProgress(space.text, task.id) ?? (task.done ? 100 : 0)) } : { date: recordDate, percent };
    setProgressRecordDate(null); setProgressDraftBaseline(initialProgress);
    if (task) { setRecordDate(initialProgress.date); setPercent(initialProgress.percent); }
    setExecutionDateDraft(task?.date ?? ''); setExecutionTimeDraft(task?.time ?? ''); setMessage(''); setDetail(next);
  }
  useEffect(() => { if (detail && dialog.current && !dialog.current.open) {
    dialog.current.showModal();
    if (detail.kind === 'task') dialog.current.scrollTop = 0;
  } }, [detail]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { cancelHold(); nativeDrag.current = null; setMoving(null); } };
    window.addEventListener('keydown', escape); return () => { cancelHold(); window.removeEventListener('keydown', escape); };
  }, []);
  useEffect(() => {
    const id = props.selectedDocumentId;
    let current = true;
    const opening = documentRouteOpening.current.catch(() => {}).then(async () => {
      if (!id || !current) return;
      if (!await prepareDocumentScopeChange(id, () => current)) return;
      if (!current || dataRef.current.activeActorId !== actorId) return;
      setFolderId(programFolderAfterDocumentOpen(dataRef.current.spaces[actorId].text, selectedRef.current, id, presentation.current.folderId));
      setSelected(id); setOpened(previous => previous.includes(id) ? previous : [...previous, id]); setPeriod('documents'); setFolderScreen(null);
    });
    documentRouteOpening.current = opening;
    void opening.catch(() => { if (current) setMessage('작성 중인 입력을 유지했습니다. 저장 상태를 확인한 뒤 글을 다시 열어 주세요.'); });
    return () => { current = false; };
  }, [props.selectedDocumentId]); // Data can arrive after navigation: retain the requested ID even before its document arrives.

  async function prepareDocumentScopeChange(id: string, canOpen: () => boolean = () => true): Promise<boolean> {
    const documentId = selectedRef.current, scope = presentation.current.folderId;
    if (programFolderAfterDocumentOpen(dataRef.current.spaces[actorId].text, documentId, id, scope) === scope) return canOpen();
    if (inputLockCount.current > 0) return false;
    // This shared scope controls every retained document's fragment editor.
    // Save all fragments before removing any of them, not only the visible one.
    const release = lockInput();
    try {
      if (!await flushAllEditors()) {
        setMessage('작성 중인 입력을 저장하거나 한글 입력을 마친 뒤 다른 글을 열어 주세요. 입력은 유지했습니다.');
        return false;
      }
      return canOpen() && dataRef.current.activeActorId === actorId
        && selectedRef.current === documentId && presentation.current.folderId === scope;
    } finally { release(); }
  }

  async function openDocument(id: string, taskId?: string,
    request?: { canOpen: () => boolean }): Promise<boolean> {
    if (request && !request.canOpen()) return false;
    pendingSourceFocus.current = null;
    const sourceFocusOwner = document.activeElement;
    const originView = JSON.stringify(presentation.current), originSession = sourceSession.current;
    let navigating = false;
    const intent = sourceNavigation.begin(() => sourceMounted.current && dataRef.current.activeActorId === actorId
      && sourceSession.current === originSession && (navigating || JSON.stringify(presentation.current) === originView));
    const ownsSource = () => intent.isCurrent() && (!request || request.canOpen());
    const writingBlocked = () => inputLockCount.current > 0 || Object.values(dirty.current).some(Boolean)
      || Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.());
    if (taskId && writingBlocked()) { setMessage('작성 중인 입력을 저장하거나 취소한 뒤 원래 항목을 열어 주세요.'); return false; }
    if (taskId && props.awaitSourceReturnReady) {
      // Say at once that the open waits; a later action cancels it and clears this.
      const waiting = props.sourceReturnWaits?.() ? showSourceWaiting(taskId) : undefined;
      const ready = await intent.wait(props.awaitSourceReturnReady);
      if (waiting) clearSourceWaiting(waiting);
      if (!ready) {
        // Say why instead of leaving the user on the list without a word.
        if (ownsSource()) setMessage('원문을 열지 못했습니다. 다시 눌러 주세요.');
        return false;
      }
      if (!ownsSource()) return false;
      if (writingBlocked()) { setMessage('작성 중인 입력을 저장하거나 취소한 뒤 원래 항목을 열어 주세요.'); return false; }
      if (document.activeElement !== sourceFocusOwner
        && (document.activeElement !== document.body || sourceFocusOwner?.isConnected)) return false;
    }
    if (!ownsSource()) return false;
    // Reading/navigation is presentation-only, so read the shown data directly. A no-op write
    // re-validated the whole workspace (over a second on a full space) while the tap waited,
    // and was refused whenever a background read held the writer.
    const current = dataRef.current, currentSpace = current.spaces[actorId];
    if (current.activeActorId !== actorId) return false;
    let targetPosition: ProgramWritingPosition | null = null;
    const target = taskId ? programCheckpointForWritingTarget(current, { view: 'space', id }, taskId, null)?.writing?.[id] : null;
    if (!M.getDocument(currentSpace.text, id) || taskId && !target) { setMessage(programErrorMessage('missing')); return false; }
    if (taskId && target) targetPosition = { documentId: id, lineId: taskId, ...target };
    const cached = selected && positions.current[selected];
    // Real editor commits retain their writing position; history checkpoints retain read-only returns.
    if (cached) positions.current[selected] = normalizeProgramWritingPosition(currentSpace.text, cached);
    setMessage('');
    if (taskId && writingBlocked()) {
      if (request) setMessage('작성 중인 입력을 저장하거나 취소한 뒤 원래 항목을 열어 주세요.');
      return false;
    }
    if (!taskId && !await prepareDocumentScopeChange(id, ownsSource)) return false;
    if (!ownsSource()) return false;
    navigating = true;
    setTaskNotice(null);
    if (targetPosition && recentViewRef.current(id)?.hidden.has(taskId!)) await showRecentWhole(id, true);
    // W-ORDER-02: a line asked for wins over opening at today.
    if (targetPosition) { positions.current[id] = targetPosition; setFolderId(''); PROGRAM_TODAY_SHOWN.add(todayKey(id)); }
    else setFolderId(programFolderAfterDocumentOpen(dataRef.current.spaces[actorId].text,
      selectedRef.current, id, presentation.current.folderId));
    libraryReturn.current = null;
    // C5: the calendar's day sheet closes the moment its source opens; a modal left over the writing screen would block it.
    if (daySheet.current?.matches(':modal')) daySheet.current.close();
    setDayOpen(false);
    setSelected(id); setLibraryOpen(false); setOpened(previous => previous.includes(id) ? previous : [...previous, id]); setPeriod('documents'); setFolderScreen(null);
    props.navigate({ view: 'space', id }, taskId ? { writingLineId: taskId } : undefined);
    // The full App owns history/checkpoint focus. Alpha has no navigation port
    // and needs its retained editor restored directly after revealing it.
    if (targetPosition && !props.onRegisterNavigation) {
      const requested = positions.current[id];
      // Retained editors read initialPosition only when mounted. Restore the
      // exact source row after revealing an already-mounted document as well.
      const attempt = () => {
        if (pendingSourceFocus.current?.attempt !== attempt || !intent.isCurrent()) return;
        // A RAF can precede the passive modal-close effect. Do not focus an
        // inert editor or consume the request while find still owns the top layer.
        if (pendingSourceFocus.current.findPanel?.open || inputLockCount.current > 0) return;
        if (writingBlocked() || selectedRef.current !== id || presentation.current.period !== 'documents'
          || !programSame(positions.current[id], requested) || dataRef.current.activeActorId !== actorId
          || document.activeElement !== document.body && document.activeElement !== sourceFocusOwner
            && document.activeElement !== pendingSourceFocus.current.managedReturnFocus) { pendingSourceFocus.current = null; return; }
        const doc = shownDocument(id);
        const index = doc?.lines.findIndex(line => line.id === taskId) ?? -1;
        const textarea = document.getElementById(`program-text-${encodeURIComponent(id)}`) as HTMLTextAreaElement | null;
        // A cold editor mounts in a passive effect. Its readiness notification
        // retries this same request; no timer loop or new navigation is created.
        if (!textarea || !sourceFocusPorts.current[id]) return;
        pendingSourceFocus.current = null;
        if (!doc || index < 0 || !textarea || !root.current?.contains(textarea) || !textarea.getClientRects().length
          || textarea.readOnly || textarea.value !== M.raw(doc)) return;
        if (!sourceFocusPorts.current[id]?.({ documentId: id, lineId: taskId!, raw: M.raw(doc) })) return;
        const offset = doc.lines.slice(0, index).reduce((sum, line) => sum + line.text.length + 1, 0);
        textarea.setSelectionRange(offset, offset);
        const renderedLine = textarea.closest('.tle-root')?.querySelectorAll<HTMLElement>('.tle-line')[index];
        // Explicit Item navigation reveals its start plus the following context.
        // Ordinary writing re-entry still restores the retained document position.
        textarea.scrollTop = renderedLine ? Math.max(0, renderedLine.offsetTop
          - Math.min(40, Math.max(20, textarea.clientHeight / 8))) : requested.scrollTop;
        textarea.scrollIntoView({ block: 'nearest' });
      };
      pendingSourceFocus.current = { documentId: id, taskId: taskId!, attempt, isCurrent: intent.isCurrent, findSourceOwner: sourceFocusOwner,
        findPanel: libraryDialog.current?.open && libraryDialog.current.contains(sourceFocusOwner) ? libraryDialog.current : undefined };
      requestAnimationFrame(attempt);
    }
    return true;
  }
  async function openDetailSource(documentId: string, taskId: string) {
    if (detailSchedulePending || detailProgressPending) return;
    const owner = { ...executionDraftOwner.current };
    const ownsPanel = () => dataRef.current.activeActorId === actorId
      && executionDraftOwner.current.dialog === owner.dialog
      && executionDraftOwner.current.taskId === owner.taskId
      && executionDraftOwner.current.input === owner.input;
    const opened = await openDocument(documentId, taskId, { canOpen: ownsPanel });
    if (opened && ownsPanel()) {
      close();
      const focusRequest = pendingSourceFocus.current;
      if (focusRequest?.documentId === documentId && focusRequest.taskId === taskId) focusRequest.managedReturnFocus = document.activeElement;
    }
  }
  async function beginWriting() {
    if (preparing.current || inputLockCount.current > 0) return;
    setWritingNotice(null);
    const focusOwner = document.activeElement;
    const authority = { actorId, expected: space, conflict: false };
    const release = lockInput(); preparing.current = true; setPreparingDocumentAction(true); moveFlush.current = authority;
    try {
      if (!await flushAllEditors()) { setMessage('작성 중인 입력을 확인한 뒤 새 글을 열어 주세요.'); return; }
      if (authority.conflict) { setMessage('현재 글이 바뀌었습니다. 내용을 확인한 뒤 다시 시도해 주세요.'); return; }
      writingRequest.current ??= programId('writing');
      const requestId = writingRequest.current;
      const result = await run('바로 쓰기', current => createProgramWritingEntry(current, { actorId, requestId,
        expectedSpace: authority.expected, reuseDocumentId: selectedRef.current || undefined }));
      if (!result.ok) return;
      const reused = result.result === selectedRef.current;
      root.current?.querySelectorAll<HTMLDetailsElement>('[data-editor-tools][open]').forEach(menu => { menu.open = false; });
      setWritingNotice({ actorId, documentId: result.result, text: reused ? '현재 빈 글에서 계속 씁니다.' : '새 글을 열었습니다.' });
      writingRequest.current = null; setWritingFocus({ id: result.result, actorId, focusOwner });
      setSelected(result.result); setOpened(previous => previous.includes(result.result) ? previous : [...previous, result.result]);
      setFolderId(''); setPeriod('documents'); setLibraryOpen(false);
      props.navigate({ view: 'space', id: result.result });
    } finally { if (moveFlush.current === authority) moveFlush.current = null; preparing.current = false; setPreparingDocumentAction(false); release(); }
  }
  async function newDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, title = String(new FormData(form).get('title') ?? '').trim();
    if (preparing.current || inputLockCount.current > 0) return;
    const authority = { actorId, expected: formExpected.current ?? space, conflict: false };
    const release = lockInput(); preparing.current = true; setPreparingDocumentAction(true); moveFlush.current = authority;
    try {
      if (!await flushAllEditors()) { setMessage('작성 중인 입력을 저장하거나 취소한 뒤 새 문서를 만들어 주세요.'); return; }
      if (authority.conflict) { setMessage('문서가 바뀌어 새 문서를 만들지 않았습니다. 현재 내용을 확인한 뒤 다시 시도해 주세요.'); return; }
      const result = await run('문서 만들기', current => current.activeActorId !== actorId ? programFailure(current, 'conflict') : createProgramDocument(current, {
        actorId, requestId: programId('request'), expectedSpace: authority.expected, title, folderId: collectionMode ? 'folder-unfiled' : folderId || 'folder-unfiled' }));
      if (result.ok) { form.reset(); setLibraryOpen(false); setSelected(result.result); setOpened(previous => [...previous, result.result]); setFolderId(''); setPeriod('documents'); props.navigate({ view: 'space', id: result.result }); }
    } finally { if (moveFlush.current === authority) moveFlush.current = null; preparing.current = false; setPreparingDocumentAction(false); release(); }
  }
  async function quickTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, input = new FormData(form), title = String(input.get('title') ?? ''), pickedDate = String(input.get('date') ?? '') || null;
    if (collectionMode) {
      const documentId = String(input.get('documentId') ?? '');
      if (!quickDocuments.some(doc => doc.id === documentId)) { setMessage('할 일을 작성할 문서를 먼저 선택해 주세요.'); return; }
      const result = await run('문서에 할 일 추가', current => addProgramQuickTask(current, { ...base(current), documentId, title, date: pickedDate }));
      if (result.ok) form.reset();
      return;
    }
    const result = await run('빠른 할 일 추가', current => quickTaskTransition(current, title, pickedDate));
    if (result.ok) form.reset();
  }
  function quickTaskTransition(current: ProgramData, title: string, pickedDate: string | null): ProgramTransition<string> {
    const currentSpace = current.spaces[actorId];
    let updated = current, documentId = currentSpace.text.documents.find(doc => doc.title === '빠른 할 일' && !currentSpace.archivedDocumentIds.includes(doc.id))?.id;
    if (!documentId) { const created = createProgramDocument(current, { ...base(current), title: '빠른 할 일', folderId: folderId || 'folder-unfiled' }); if (!created.ok) return created; updated = created.data; documentId = created.result; }
    return addProgramQuickTask(updated, { ...base(updated), expectedSpace: updated.spaces[actorId], documentId, title, date: pickedDate,
      ...(folderId ? { scopeId: folderId } : {}) });
  }
  /** A day heading's "＋" line: the same quick add with that day filled in, and the time if picked. */
  async function addOnDay(day: string, title: string, time: string) {
    const result = await run('빠른 할 일 추가', current => {
      const added = quickTaskTransition(current, title, day);
      if (!added.ok || !time) return added;
      const timed = updateProgramTask(added.data, { ...base(added.data), expectedSpace: added.data.spaces[actorId], taskId: added.result, patch: { time } });
      return timed.ok ? programResult(current, timed.data, added.result) : timed;
    }, true, undefined, undefined, true);
    // (C5 review P2: like a completion tap it waits out the host's automatic read instead of being refused as busy.)
    return result.ok;
  }
  /** F4-b (FR-7) [적기]: one line into the document 쓰기 kept last (its place taken from the space the save is made on),
   *  under today, under this folder, in one save; never the old '빠른 할 일'. Every editor is saved first. A line that
   *  could not be written stays in the field, with why under it. */
  async function addFolderToday(title: string) {
    const target = folderId;
    if (!target || !folderScreenRef.current) return false;
    if (preparing.current || inputLockCount.current > 0) { setFolderTodayWarn('다른 저장을 마친 뒤 다시 적어 주세요. 적은 내용은 그대로 있습니다.'); return false; }
    setFolderTodayWarn(null);
    const release = lockInput();
    try {
      if (!await flushAllEditors()) { setFolderTodayWarn('쓰던 글을 저장한 뒤 다시 적어 주세요. 적은 내용은 그대로 있습니다.'); return false; }
      const requestId = programId('folder-today');
      let undo: ProgramFolderTodayUndo | null = null, home = '';
      const result = await mutate('오늘 할 일 적기', current => {
        const shown = current.spaces[actorId], place = programFolderTodayPlace(shown, target, today);
        const next = addProgramFolderTodayTask(current, { actorId, requestId, expectedSpace: shown, documentId: place.documentId, folderId: target, title, today });
        if (next.ok && next.changed !== false) { undo = programFolderTodayUndo(shown, next.data.spaces[actorId]); home = place.title; }
        return next;
      }, { history: true, awaitAutomaticRead: true });
      if (result.ok) { folderTodayConflict.current = false; setFolderTodayNotice({ actorId, text: `${home || '쓰던 글'} 오늘에 적었습니다`, undo }); return true; }
      // P3-F4B-2: another tab or device saved first. Saves here stay refused until the page reads it again, and a retry
      // meanwhile fails on the stale writing ('unresolved'): both get the one sentence that says what to do.
      if (result.reason === 'conflict') folderTodayConflict.current = true;
      setFolderTodayWarn(folderTodayConflict.current && (result.reason === 'conflict' || result.reason === 'unresolved') ? FOLDER_TODAY_CONFLICT
        : result.reason === 'unresolved' ? '이 자리에는 적을 수 없습니다. 쓰기에서 적어 주세요. 적은 내용은 그대로 있습니다.'
        : `${programErrorMessage(result.reason)} 적은 내용은 그대로 있습니다.`);
      return false;
    } finally { release(); }
  }
  /** Its 되돌리기: the writing exactly as before that line (a head or folder line it made goes too), one save, only while
   *  nothing changed it since. */
  async function undoFolderToday(notice: FolderTodayNotice) {
    if (!notice.undo || folderTodayPending) return;
    const undo = notice.undo, requestId = programId('folder-today-undo');
    setFolderTodayPending(true);
    try {
      const result = await mutate('오늘 할 일 되돌리기', current => undoProgramFolderTodayTask(current, { actorId, requestId, expectedSpace: current.spaces[actorId], ...undo }),
        { history: true, awaitAutomaticRead: true });
      if (result.ok) setFolderTodayNotice({ ...notice, text: '적기 전으로 되돌렸습니다', undo: null, undone: true });
      else if (result.reason === 'conflict') setFolderTodayNotice({ ...notice, text: '그 뒤 바뀐 내용이 있어 되돌리지 않았습니다', undo: null, refused: true });
      else if (result.reason !== 'busy') setMessage(programErrorMessage(result.reason));
    } finally { setFolderTodayPending(false); }
  }
  function openGroupAdd(day: string) {
    // A written but unsent line stays where it is; only an empty one moves to another day.
    if (addingDate && addingDate !== day && groupAddField.current?.value.trim()) { groupAddField.current.focus(); return; }
    if (addingDate === day) groupAddField.current?.focus(); else setAddingDate(day);
  }
  /** C5: a line written on a day is never lost: picking another day, the month arrows or closing the sheet go back to it. */
  function keepWrittenDay() { if (!addingDate || !groupAddField.current?.value.trim()) return false; groupAddField.current.focus(); return true; }
  /** C5: a day of the grid becomes the chosen day; `open` shows it (a sheet on a narrow screen; the panel follows the chosen day). */
  function pickMonthDay(day: string, open: boolean) {
    if (keepWrittenDay()) return false;
    setDate(day);
    if (open && !wideMonth) setDayOpen(true);
    return true;
  }
  /** Flow pipeline S2/S3: [달력에서 보기] — 오늘 › 월간 as the calendar (for this visit: the stored choice stays), the month of
   *  the Flow's first date with that day chosen, and its days marked until × or leaving 오늘. Nothing is saved. */
  async function showFlowOnCalendar(documentId: string, target: { first: string; title: string; count: number }) {
    if (!await changePeriod('month', true)) return;
    setFolderId(''); setMonthViewState('grid'); setDayOpen(false); setDate(target.first);
    setFlowHighlight({ documentId, title: target.title, count: target.count });
  }
  /** C6a: into 고르기 (2-1). From the calendar it goes to the list at the chosen day's group first. */
  function startSelecting() {
    if (selectBlocked || props.sourceReturnWaits?.() || props.hostBusy?.() || keepWrittenDay()) return;
    if (Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.())) { setMessage('회차 날짜를 적용하거나 취소한 뒤 골라 주세요.'); return; }
    if (noteFindMenu.current) noteFindMenu.current.open = false;
    setTaskNotice(null); setOrderNotice(null); setAddingDate(null); setSelectNotice(null);
    selectingNow.current = true;
    setDatesNotice(null);
    setSelecting({ keys: new Set(), expected: new Map(), anchor: null, scrollY: window.scrollY, calendar: monthGrid });
    if (monthGrid) {
      setMonthViewState('list');
      requestAnimationFrame(() => requestAnimationFrame(() => root.current?.querySelector(`[data-day-heading="${date}"]`)?.scrollIntoView({ block: 'start' })));
    }
  }
  /** Out of 고르기 (취소, Esc, a view change): nothing is saved; the screen comes back, and the calendar if it started
   *  there; 취소 and Esc also bring back its scroll. */
  function stopSelecting(scrollBack = true) {
    const state = selecting;
    selectingNow.current = false;
    setSelecting(null); setSelectNotice(null);
    if (!state) return;
    if (state.calendar) setMonthViewState('grid');
    // Scrolled once the list is drawn again (the rows of 고르기 are not the list's height).
    if (scrollBack) selectScrollBack.current = state.scrollY;
  }
  /** A row pressed in 고르기: picked or let go (Shift: the range from the last one); a row that cannot be picked says why. */
  function pickRow(key: string, block: ProgramSelectBlock | null, shift: boolean) {
    if (block) { setSelectNotice(PROGRAM_SELECT_REASON[block]); return; }
    const order = executionRows.map(row => row.key), pickable = new Set(order.filter(row => !selectBlocks?.get(row)));
    setSelecting(current => current && { ...withPicks(current, shift ? programSelectRange(current.keys, order, pickable, current.anchor, key) : programToggleSelection(current.keys, key)), anchor: key });
  }
  /** C6b: the picks, each with what its task had when it was first picked (kept while it stays picked). */
  const withPicks = (current: Selecting, keys: ReadonlySet<string>): Selecting => ({ ...current, keys, expected: new Map([...keys].flatMap(key => {
    const kept = current.expected.get(key); if (kept) return [[key, kept] as const];
    const row = executionRows.find(entry => entry.key === key);
    return row?.kind === 'text-task' ? [[key, { taskId: row.task.id, date: row.task.date, time: row.task.time ?? '', state: programTaskDateState(space, row.task.id) ?? undefined }] as const] : [];
  })) });
  /** C6b 2-4: the date sheet from the bar: a W5 sheet on a phone, a small menu under the bar on a PC. */
  function openDatesSheet() {
    const sheet = datesSheet.current;
    if (!sheet || sheet.open || !selecting?.keys.size || datesPending) return;
    if (window.matchMedia('(min-width: 701px)').matches) sheet.show(); else sheet.showModal();
    sheet.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }
  function closeDatesSheet() {
    const sheet = datesSheet.current;
    if (!sheet?.open) return;
    sheet.close();
    root.current?.querySelector<HTMLButtonElement>('[aria-label="고른 할 일"] button[aria-haspopup]')?.focus({ preventScroll: true });
  }
  /** C6b 2-5: every pick to one date in one save, all or none, pressed once (it waits out an automatic read). A task
   *  changed since it was picked moves nothing and 고르기 stays with its picks. Picks already on that date go too: they
   *  are checked (changed since, finished, locked) though they do not move (C6b review). */
  async function applySelectDates(target: string | null) {
    if (!selecting || datesBusy.current) return;
    const picks = [...selecting.keys].map(key => selecting.expected.get(key));
    if (!picks.length || picks.some(pick => !pick)) { setSelectNotice('그사이 바뀐 할 일이 있어 옮기지 않았습니다. 다시 확인해 주세요.'); return; }
    const moves: ProgramTaskDateMove[] = picks.flatMap(pick => pick ? [{ taskId: pick.taskId, expected: { date: pick.date, time: pick.time, state: pick.state }, date: target }] : []);
    datesSheet.current?.close();
    if (moves.every(move => move.date === move.expected.date)) return;
    const requestId = programId('dates');
    // 되돌리기 is made inside the save, from the very state the move applies to (not the one shown before a read).
    let undo: ProgramTaskDateMove[] = [], undoLines: ProgramTaskDateLines[] | null = null;
    const social = programTaskDateMovesSocial(space, moves);
    datesBusy.current = true; setDatesPending(true); setSelectNotice(null);
    try {
      const result = await countedMutate('날짜 한꺼번에 바꾸기', current => { const next = moveProgramTaskDates(current, { actorId, requestId, moves }); if (next.ok) { undo = programTaskDateUndo(current.spaces[actorId], next.data.spaces[actorId], moves); undoLines = social ? null : programTaskDateUndoLines(current.spaces[actorId], next.data.spaces[actorId], undo); } return next; },
        { history: true, awaitAutomaticRead: true, ...(social ? { alphaSocial: { type: 'private-task-dates' as const, moves } } : {}) });
      if (result.ok) {
        if (selectingNow.current) stopSelecting();
        setTaskNotice(null); setOrderNotice(null);
        setDatesNotice({ actorId, count: picks.length, date: target, undo, lines: undoLines, taskIds: undo.map(move => move.taskId), shownAt: Date.now() });
      }
      else if (result.reason === 'conflict') setSelectNotice('그사이 바뀐 할 일이 있어 옮기지 않았습니다. 다시 확인해 주세요.');
      else if (result.reason !== 'busy') setSelectNotice(programErrorMessage(result.reason));
    } finally { datesBusy.current = false; setDatesPending(false); }
  }
  /** C6b 2-6: 되돌리기, one save putting the old dates back; a task changed since moves nothing, said in the notice. */
  async function restoreSelectDates(notice: DatesNotice) {
    if (datesBusy.current) return;
    const requestId = programId('dates');
    datesBusy.current = true; setDatesPending(true);
    try {
      // P1: a list with no copy's task gets its lines back exactly; one with a copy's task keeps the server's date command.
      const lines = notice.lines;
      const result = await countedMutate('날짜 되돌리기', current => lines ? restoreProgramTaskDates(current, { actorId, requestId, moves: notice.undo, lines })
        : moveProgramTaskDates(current, { actorId, requestId, moves: notice.undo }),
        { history: true, awaitAutomaticRead: true, ...(!lines && programTaskDateMovesSocial(space, notice.undo) ? { alphaSocial: { type: 'private-task-dates' as const, moves: notice.undo } } : {}) });
      if (result.ok) setDatesNotice({ ...notice, undone: true, shownAt: Date.now() });
      else if (result.reason === 'conflict') setDatesNotice({ ...notice, refused: '그 뒤 바뀐 할 일이 있어 되돌리지 않았습니다', shownAt: Date.now() });
      else if (result.reason !== 'busy') setMessage(programErrorMessage(result.reason));
    } finally { datesBusy.current = false; setDatesPending(false); }
  }
  /** [그날 보기]: the period holding the moved-to day (날짜 없음 has its own). */
  async function showMovedDay(target: string | null) {
    // Kept through this view change (a period, then a day: one or two renders) until the effect above sees the target
    // view. Already there, nothing changes: nothing is kept. A refused change (input still saving) releases it at once.
    const undo = datesNotice?.undo, view = programMovedDayTarget({ period, date }, target);
    if (!undo || !view) return;
    const kept: ProgramDatesNoticeKeep<ProgramTaskDateMove[]> = { undo, ...view };
    datesNoticeKept.current = kept;
    const release = () => { if (datesNoticeKept.current === kept) datesNoticeKept.current = null; };
    if (period !== view.period && !await changePeriod(view.period)) { release(); return; }
    if (target !== null) setDate(target);
  }
  /** A day heading's [모두]/[풀기] in 고르기, over that day's pickable rows (지난 미완료 too). */
  function selectDayButton(item: Extract<ProgramExecutionListItem, { kind: 'heading' }>) {
    const keys = (headingKeys.get(item.key) ?? []).filter(key => !selectBlocks?.get(key));
    if (!selecting || !keys.length) return null;
    const all = programDayPicked(selecting.keys, keys);
    return <button type="button" className={styles.selectDay} aria-label={`${item.label.replace(/ · \d+$/, '')} ${all ? '모두 풀기' : '모두 고르기'}`}
      onClick={() => setSelecting(current => current && withPicks(current, programSelectDay(current.keys, keys).selected))}>{all ? '풀기' : '모두'}</button>;
  }
  /** A row in 고르기: one button that picks it (aria-pressed); no check, source, drag, long press, … or Alt+↑↓. */
  function renderSelectRow(item: Extract<ProgramExecutionListItem, { kind: 'row' }>) {
    const entry = item.entry, block = selectBlocks?.get(entry.key) ?? null, picked = !!selecting?.keys.has(entry.key);
    return <li key={entry.key} className={styles.selectItem} data-select-row={entry.key} data-blocked={block ?? undefined}>
      <button type="button" className={styles.selectRow} aria-pressed={block ? undefined : picked} aria-disabled={block ? true : undefined}
        onClick={event => pickRow(entry.key, block, event.shiftKey)}>
        <span className={styles.selectMark} aria-hidden="true" data-picked={picked || undefined} />
        <span className={styles.selectText}><span className={styles.taskTitleText}>{entry.kind === 'text-task' ? entry.task.title : entry.row.title}</span>
          <small>{entry.kind === 'text-task' ? entry.task.docTitle : '반복 회차'}</small></span>
      </button></li>;
  }
  /** ↑↓ between the rows in 고르기 (Space picks the focused one). */
  function moveSelectFocus(event: React.KeyboardEvent<HTMLUListElement>) {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key) || event.altKey || event.nativeEvent.isComposing) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-select-row] button')), at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    event.preventDefault();
    buttons[Math.max(0, Math.min(buttons.length - 1, at + (event.key === 'ArrowDown' ? 1 : -1)))].focus();
  }
  function closeDaySheet() {
    if (keepWrittenDay()) return;
    setDayOpen(false); setAddingDate(null);
    requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(`[data-month-day="${date}"]`)?.focus({ preventScroll: true }));
  }
  /** C5: one day in the sheet or the panel: the list's heading words with I7 and ＋ (and 닫기 in the sheet), the ＋ line,
   *  the day's rows as the list draws them, or a note and a wide ＋ on an empty day. */
  function dayGroup(day: string, close?: () => void) {
    const [heading, ...rows] = programExecutionDay(executionRows, day, today, manualOrderDays);
    if (heading.kind !== 'heading') return null;
    return <>
      <div className={close ? `${styles.findHeading} ${styles.dayGroupHeading}` : styles.dayGroupHeading}>
        <h2 id={close ? 'program-day-sheet-title' : undefined} className={styles.executionGroup}>{heading.label}</h2>
        <div className={styles.dayGroupActions}>{dayHeadingControls(heading)}{close && <button type="button" onClick={close}>닫기</button>}</div></div>
      <ul className={styles.tasks}>{dayAddRow(heading)}{rows.map(item => renderListItem(item))}</ul>
      {!rows.length && addingDate !== day && <div className={styles.dayEmpty}><p>이 날에는 할 일이 없습니다.</p>
        <button type="button" disabled={preparingDocumentAction} onClick={() => openGroupAdd(day)}>＋ 이 날에 할 일</button></div>}
    </>;
  }
  function closeGroupAdd(day: string) {
    setAddingDate(current => current === day ? null : current);
    requestAnimationFrame(() => {
      if (document.activeElement && document.activeElement !== document.body) return;
      root.current?.querySelector<HTMLButtonElement>(`button[data-add-date="${day}"]`)?.focus({ preventScroll: true });
    });
  }
  async function editorCommit(docId: string, nextText: TextWorkspaceState, label: string, options?: ProgramTextCommitOptions) {
    if (options?.privateTaskProgress) {
      if (options.privateTaskSchedule || preparing.current || inputLockCount.current > 0
        || Object.entries(dirty.current).some(([id, pending]) => id !== docId && pending)
        || Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.())) return false;
      const requestId = programId('progress');
      const result = await mutate(label, current => programTextProgressTransition(current, { actorId, requestId, documentId: docId,
        expected: options.expectedWorkspace ?? space.text, next: nextText, progress: options.privateTaskProgress! }),
      { groupId: options.groupId, onPrivateMutation: options.onPrivateMutation });
      return result.ok;
    }
    const schedule = options?.privateTaskSchedule;
    if (schedule) {
      const before = options.expectedWorkspace ?? space.text;
      const task = M.tasks(before).find(item => item.id === schedule.taskId);
      if (!task || !M.rowMeta(before, docId).some(row => row.progressTargetId === task.id || row.taskId === task.id)
        || !M.validate(nextText) || !programSame(before, space.text)
        || schedule.date !== null && !programDate(schedule.date)
        || schedule.time !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)
        || preparing.current || inputLockCount.current > 0
        || Object.entries(dirty.current).some(([id, pending]) => id !== docId && pending)
        || Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.())) return false;
      const expected = M.updateTask(before, task.id, { date: schedule.date, time: schedule.time });
      if (!sameScheduleWorkspace(before, expected, nextText)) return false;
      const target = resolveAlphaPrivateTaskSchedule(data, actorId, schedule.taskId);
      if (!target && space.copies.some(copy => Object.values(copy.itemLines).includes(schedule.taskId))) return false;
      if (target) {
        let accept: ((workspace: TextWorkspaceState | null) => void) | undefined;
        const confirmation = options.onPrivateTaskScheduleAcknowledged
          ? new Promise<TextWorkspaceState | null>(resolve => { accept = resolve; }) : undefined;
        const result = await run(label, current => updateProgramTask(current, { actorId, requestId: programId('schedule'),
          expectedSpace: space, taskId: task.id, patch: { date: schedule.date, time: schedule.time } }), true, { ...schedule, onAcknowledged: accept });
        if (result.ok && confirmation) options.onPrivateTaskScheduleAcknowledged!(confirmation);
        return result.ok;
      }
    }
    let receipt: { before: typeof space; after: typeof space } | null = null;
    const expectedText = options?.expectedWorkspace ?? space.text;
    const attempt = () => countedMutate(label, current => {
      const transition = programTextTransition(current, { actorId, documentId: docId, expected: expectedText, next: nextText, position: positions.current[docId] });
      if (transition.ok) receipt = { before: programClone(current.spaces[actorId]), after: programClone(transition.data.spaces[actorId]) };
      return transition;
    }, { groupId: options?.groupId, onPrivateMutation: options?.onPrivateMutation,...(props.writingCompute&&!moveFlush.current?{alphaWriting:{documentId:docId,expected:expectedText,next:nextText,position:positions.current[docId],workingGeneration:options?.writingGeneration??0}}:{}) });
    let result = await attempt();
    // Region fix 2 (11/8): the single writer was busy for a moment (another save, or a background refresh on a slow
    // phone): nothing was sent, so try again for a few seconds instead of failing the write into the 복구함.
    for (let tries = 0; !result.ok && result.reason === 'busy' && tries < 40; tries++) {
      await new Promise(resolve => setTimeout(resolve, 150));
      result = await attempt();
    }
    // The controller refuses 'unresolved' (a result still pending) and 'busy' before anything is sent.
    if (!result.ok && ['unresolved','busy','not-sent','writing-preservation','writing-stale','worker-error'].includes(result.reason)) options?.onNotSent?.();
    const authority = moveFlush.current;
    if (authority) {
      // Foreign private writes between local saves break the chain.
      // A failed save never lends its proposed state authority to a document action.
      const committed = receipt as { before: typeof space; after: typeof space } | null;
      if (!result.ok || !committed || authority.actorId !== actorId || !programSame(authority.expected, committed.before)) authority.conflict = true;
      else authority.expected = committed.after;
    }
    return result.ok;
  }
  async function applyWritingExample() {
    const id = selectedRef.current, current = dataRef.current, owner = current.spaces[actorId];
    const doc = owner && M.getDocument(owner.text, id), raw = draftReaders.current[id]?.();
    const status = saveStatusReaders.current[id]?.();
    if (current.activeActorId !== actorId || !doc || programDocumentContentLock(owner, id) !== 'active'
      || preparing.current || inputLockCount.current > 0 || dirty.current[id] || status?.composing || status?.saving
      || typeof raw !== 'string' || raw.trim() || M.raw(doc).trim()) {
      setMessage('입력·저장을 마친 빈 글에만 예시를 넣을 수 있습니다.'); return false;
    }
    const focusOwner = document.activeElement, release = lockInput();
    preparing.current = true; setPreparingDocumentAction(true);
    try {
      const saved = await editorCommit(id, M.editText(owner.text, id, PROGRAM_EMPTY_EXAMPLE), '작성 예시 넣기', { expectedWorkspace: owner.text });
      if (!saved) { setMessage('예시를 저장하지 못했습니다. 현재 글을 확인하고 다시 시도해 주세요.'); return false; }
      if (dataRef.current.activeActorId === actorId && selectedRef.current === id) {
        root.current?.querySelectorAll<HTMLDetailsElement>('[data-editor-tools][open]').forEach(menu => { menu.open = false; });
        setWritingFocus({ id, actorId, focusOwner });
      }
      return true;
    } finally { preparing.current = false; setPreparingDocumentAction(false); release(); }
  }
  async function moveBefore(targetKey: string, beforeKey: string | null) {
    if (Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.())) { setMessage('회차 날짜를 적용하거나 취소한 뒤 순서를 바꿔 주세요.'); return; }
    const target = executionRows.find(row => row.key === targetKey); if (!target) return;
    const expectedKeys = executionRows.filter(row => row.date === target.date).map(row => row.key);
    await run('기간 목록 순서 이동', current => reorderProgramExecutionTimeline(current, { actorId, query: executionQuery, targetKey, beforeKey, expectedKeys, expectedOrder: space.executionTimelineOrders?.[target.date ?? 'undated'] ?? null })); setMoving(null);
  }
  const orderDayName = (day: string) => day === 'undated' ? '날짜 없음' : programCalendarDate(day, today, false);
  /** I7 '시간순으로': one save forgets the day's hand-made order (the whole day, rows a filter hides too). */
  async function resetDayOrder(day: string) {
    if (orderBusy.current) return;
    if (Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.())) { setMessage('회차 날짜를 적용하거나 취소한 뒤 순서를 바꿔 주세요.'); return; }
    const expected = readProgramDayOrder(space, day), hidden = manualOrderDays.get(day)?.hidden ?? 0;
    orderBusy.current = true; setOrderPending(true);
    try {
      // Like a completion tap, it waits out the host's automatic read (R4) rather than being refused as busy.
      const result = await run('시간순으로 정렬', current => resetProgramExecutionDayOrder(current, { actorId, expected }), true, undefined, undefined, true);
      if (result.ok) { setTaskNotice(null); setOrderNotice({ actorId, removed: expected, hidden, shownAt: Date.now() }); }
    } finally { orderBusy.current = false; setOrderPending(false); }
  }
  /** Its 되돌리기: a new save putting the order back; a day ordered again since refuses it, said in the notice. */
  async function restoreDayOrder(notice: OrderNotice) {
    if (orderBusy.current) return;
    orderBusy.current = true; setOrderPending(true);
    try {
      const result = await run('순서 되돌리기', current => restoreProgramExecutionDayOrder(current, { actorId, removed: notice.removed }), true, undefined, undefined, true);
      if (result.ok) setOrderNotice(null);
      else if (result.reason === 'conflict') { setMessage(''); setOrderNotice({ ...notice, refused: '그 뒤 순서가 바뀌어 되돌리지 않았습니다', shownAt: Date.now() }); }
    } finally { orderBusy.current = false; setOrderPending(false); }
  }
  function moveExecutionStep(key: string, direction: -1 | 1) {
    const target = executionRows.find(row => row.key === key); if (!target) return;
    const bucket = executionRows.filter(row => row.date === target.date), index = bucket.findIndex(row => row.key === key);
    if (direction < 0 && index > 0) void moveBefore(key, bucket[index - 1].key);
    if (direction > 0 && index < bucket.length - 1) void moveBefore(key, bucket[index + 2]?.key ?? null);
  }
  const moveStep = (task: TextTask, direction: -1 | 1) => moveExecutionStep(programTextExecutionKey(task), direction);
  function locationAvailability(){return {...(taskMoveGate?.read()??{blocked:false,checking:false}),confirm:taskMoveGate?.confirm};}
  async function moveTaskHere(taskId:string,target:TaskLocationTarget,expectedOverride?:ProgramPrivateSpace,planned=false){
    if(locationBusy.current)return false;
    if(locationAvailability().blocked){setMessage('저장을 확인한 뒤 옮겨 주세요.');return false;}
    // W-FLOW-09·10 (기타 F12 1차 QA P2, 11/12): every way of moving a Flow step to another day (the list's ⋯ chips and
    // date, the writing view's ⋮, the day close) goes through its plan: asked once per run when it passes the next
    // step, and never after a last-day run's anchor. The plan's own moves come back here as planned.
    if(!planned&&target.kind==='date'&&target.date){
      const owner=runOfTaskNow(taskId),now=owner?.steps.find(step=>step.taskId===taskId);
      if(owner&&now&&now.date!==target.date){deferFlowStep(owner,taskId,target.date,undefined,target.time);return false;}
    }
    const owner=dataRef.current.spaces[actorId],expected=expectedOverride??detailExpected.current??owner;
    const task=M.tasks(expected.text).find(item=>item.id===taskId),policy=readTaskLocationPolicy(expected,taskId);
    if(!task||policy.kind==='blocked'||!policy.documentId){setMessage(policy.message);return false;}
    if(policy.kind==='date-only'){
      if(target.kind!=='date'){setMessage(policy.message);return false;}
      const dialogOwner=executionDraftOwner.current.dialog;
      const outcome=await commitTaskDateWithUndo({begin:()=>taskMoveGate?.beginScheduleUndo?.(),apply:async()=>
        (await run('실행 날짜·시간 변경',current=>updateProgramTask(current,{...base(current),taskId,patch:{date:target.date,...(target.time!==undefined?{time:target.time}:{})}}),true,{taskId,date:target.date,...(target.time!==undefined?{time:target.time}:{})})).ok});
      if(outcome.kind==='blocked'){setMessage('저장 상태를 확인한 뒤 날짜를 다시 정해 주세요. 현재 내용은 유지했습니다.');return false;}
      if(outcome.kind!=='saved')return false;
      const capability=outcome.capability;
      if(capability&&dialogOwner===executionDraftOwner.current.dialog){
        if(detail)close();setTaskNotice(null);setLocationNotice({actorId,documentId:task.docId,taskId,before:expected.text,after:capability.text,date:target.date,folderId:task.scopeId,kind:'date',scheduleUndo:capability.undo,text:`날짜를 ${target.date?programCalendarDate(target.date,today,false)+'로':'미정으로'} 바꿨습니다`});
      }else setMessage('날짜는 저장했습니다. 그 뒤 상태가 바뀌어 지금은 되돌릴 수 없습니다.');
      return true;
    }
    locationBusy.current=true;setLocationPending(true);setLocationNotice(null);
    const dialogOwner=executionDraftOwner.current.dialog,view=presentation.current;
    try{
      let committed:TextWorkspaceState|null=null,beforeCommit:TextWorkspaceState|null=null;
      const result=await run('할 일 옮기기',current=>{const next=moveProgramTaskLocation(current,{actorId,requestId:programId('request'),expectedSpace:expected,taskId,target});if(next.ok){beforeCommit=current.spaces[actorId].text;committed=next.data.spaces[actorId].text;}return next;},true);
      if(!result.ok||!committed)return false;
      const after=committed as TextWorkspaceState,changed=M.tasks(after).find(item=>item.id===taskId);
      if(!changed)return false;
      // W-MENU-27: a move to a later day (or 날짜 미정) leaves its trace in the day it left, kept on this device.
      // W-MENU-26 (총괄 11/12, redesign 3+4): a move leaves no trace on this device any more (an 이어감 line says it in the text).
      const currentView=presentation.current;
      if(dialogOwner===executionDraftOwner.current.dialog&&view.period===currentView.period&&view.date===currentView.date&&view.folderId===currentView.folderId&&view.query===currentView.query){
        if(detail)close();setTaskNotice(null);setOrderNotice(null);setDatesNotice(null);
        setLocationNotice({actorId,documentId:task.docId,taskId,before:beforeCommit!,after,date:changed.date,folderId:changed.scopeId,kind:target.kind,
          // Redesign 3: in a document without date headings the date became its 마감 (the line stayed).
          text:target.kind==='date'&&target.date!==null&&changed.date===null&&changed.due===target.date?`마감을 ${programCalendarDate(target.date,today,false)}로 정했습니다`:target.kind==='date'?programTaskDatesMovedText(1,changed.date,today):`/ ${programFolderPath(after,changed.scopeId)}로 옮겼습니다`});
        requestAnimationFrame(()=>highlightTaskLocation(taskId));
      }
      return true;
    }finally{locationBusy.current=false;setLocationPending(false);}
  }
  function highlightTaskLocation(taskId:string){
    const row=Array.from(root.current?.querySelectorAll<HTMLElement>('[data-task-id]')??[]).find(node=>node.dataset.taskId===taskId);
    if(row){row.classList.add(styles.locationHighlight);window.setTimeout(()=>row.classList.remove(styles.locationHighlight),1200);}
  }
  async function undoTaskLocation(notice:LocationNotice){
    if(Object.values(dirty.current).some(Boolean)){setMessage('새 입력이 있어 되돌리지 않았습니다. 현재 내용은 유지했습니다.');return;}
    if(locationBusy.current||locationAvailability().blocked){setMessage('저장을 확인한 뒤 되돌려 주세요.');return;}
    locationBusy.current=true;setLocationPending(true);
    try{
      if(notice.scheduleUndo){
        if(!programSame(dataRef.current.spaces[actorId].text,notice.after)){setMessage('그 뒤 내용이 바뀌어 되돌리지 않았습니다.');return;}
        if(await notice.scheduleUndo())setLocationNotice(null);else setMessage('그 뒤 다른 변경이 있어 되돌리지 않았습니다.');return;
      }
      const result=await run('할 일 옮기기 되돌리기',current=>undoProgramTaskLocation(current,{actorId,documentId:notice.documentId,after:notice.after,before:notice.before}));
      if(result.ok){setLocationNotice(null);if(notice.traceId)keepProgramMoveTraces(traceStorage(),programMoveTraceKey(actorId),list=>list.filter(entry=>entry.id!==notice.traceId),today);}
    }finally{locationBusy.current=false;setLocationPending(false);}
  }
  async function recallTaskHere(documentId: string, candidate: ProgramRecallCandidate, line: ProgramRecallLine, working: TextWorkspaceState, recent: ProgramRecentView | null) {
    if (locationBusy.current || inputLockCount.current > 0 || locationAvailability().blocked || dataRef.current.activeActorId !== actorId) return false;
    const wide = recent ? recentWide(documentId, recent, working, false) : { ok: true as const, state: working };
    if (!wide.ok || selectedRef.current !== documentId || presentation.current.period !== 'documents') return false;
    const release = lockInput(); locationBusy.current = true;
    try {
      // Preserve the typed prefix before the semantic command. Its inverse returns to these exact bytes, not to an older server draft.
      if (!await flushAllEditors()) { showViewChangeBlocked(); return false; }
      const current = dataRef.current, owner = current.spaces[actorId];
      if (current.activeActorId !== actorId || selectedRef.current !== documentId || presentation.current.period !== 'documents' || !programSame(owner.text, wide.state)) {
        setMessage('그사이 글이 바뀌어 불러오지 않았습니다. 입력은 그대로 있습니다.'); return false;
      }
      const planned = recallProgramTask(owner, { candidate, documentId, lineId: line.lineId, expectedLine: line.text, today });
      if (!planned.ok) {
        setMessage(planned.reason === 'receiver-contract' ? '이 자리에 안전하게 이어 쓸 수 없어 불러오지 않았습니다. 입력은 그대로 있습니다.'
          : planned.reason === 'ambiguous' ? '같은 날 같은 제목의 일이 여러 개라 불러오지 않았습니다. 입력은 그대로 있습니다.'
          : '지난 일이나 입력 줄이 바뀌어 불러오지 않았습니다. 원문은 그대로 있습니다.'); return false;
      }
      const result = await run('지난 할 일 불러오기', latest => programTextTransition(latest, { actorId, documentId, expected: owner.text, next: planned.next }));
      if (!result.ok) return false;
      setRecallNotice({ actorId, documentId, before: owner.text, after: planned.next, text: planned.message, redo: false }); setMessage('');
      return true;
    } finally { locationBusy.current = false; release(); }
  }
  async function stepTaskRecall(redo: boolean) {
    const notice = recallNotice, current = dataRef.current;
    if (!notice || notice.actorId !== actorId || notice.redo !== redo || current.activeActorId !== actorId || locationBusy.current || locationAvailability().blocked
      || Object.values(dirty.current).some(Boolean) || !programSame(current.spaces[actorId].text, redo ? notice.before : notice.after)) return false;
    locationBusy.current = true;
    try {
      const result = await run(redo ? '지난 할 일 다시 불러오기' : '지난 할 일 불러오기 되돌리기', latest => programTextTransition(latest, {
        actorId, documentId: notice.documentId, expected: redo ? notice.before : notice.after, next: redo ? notice.after : notice.before }));
      if (result.ok) setRecallNotice({ ...notice, redo: !redo, text: redo ? '다시 불러왔습니다' : '치던 글자로 되돌렸습니다' });
      return result.ok;
    } finally { locationBusy.current = false; }
  }
  async function dateMove(taskId: string, nextDate: string | null) {
    const requested = { ...executionDraftOwner.current };
    const ok = await moveTaskHere(taskId,{kind:'date',date:nextDate});
    const current = executionDraftOwner.current;
    // A saved shortcut belongs to its original dialog and input generation.
    // It must not replace newer input or a task reopened while awaiting storage.
    if (ok && current.taskId === taskId && current.dialog === requested.dialog && current.input === requested.input) setExecutionDateDraft(nextDate ?? '');
  }
  async function applySchedule(taskId: string) {
    if (executionTimeDraft && !/^([01]\d|2[0-3]):[0-5]\d$/.test(executionTimeDraft)) { setMessage('시간을 시:분 형식으로 입력해 주세요.'); return; }
    await moveTaskHere(taskId,{kind:'date',date:executionDateDraft||null,time:executionTimeDraft});
  }
  async function findChangedTask() {
    const target = taskNotice;
    if (!target || detailSchedulePending || detailProgressPending) return;
    if (!programExecutionTasks(dataRef.current.spaces[actorId]).some(task => task.id === target.taskId)) {
      setMessage('이 항목의 현재 문서·보관 상태를 확인해 주세요.'); return;
    }
    if (detail) close();
    if (!await changePeriod('all')) return;
    requestAnimationFrame(() => {
      if (presentation.current.period !== 'all') return;
      const row = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-task-id]') ?? [])
        .find(element => element.dataset.taskId === target.taskId);
      const button = row?.querySelector<HTMLButtonElement>(`button.${styles.taskTitle}`);
      button?.focus({ preventScroll: true }); row?.scrollIntoView({ block: 'center' });
    });
  }
  const taskNoticeOutsideView = !!taskNotice && period !== 'documents'
    && !executionRows.some(entry => entry.kind === 'text-task' && entry.task.id === taskNotice.taskId);
  const taskNoticeContent = taskNotice && <div className={styles.taskNotice} role="status">
    <p>{taskNotice.title} · {taskNotice.text}{taskNoticeOutsideView && ' 현재 보기에서는 빠졌지만 항목과 기록은 그대로 있습니다.'}</p>
    {taskNoticeOutsideView && <button type="button" disabled={detailSchedulePending || detailProgressPending}
      onClick={() => void findChangedTask()}>전체 할 일에서 같은 항목 찾기</button>}
  </div>;
  const orderNoticeText = (notice: OrderNotice) => notice.refused
    ?? `${orderDayName(notice.removed.date)} 순서를 시간순으로 되돌렸습니다${notice.hidden ? ` · 숨긴 할 일 ${notice.hidden}개 포함` : ''}`;
  const releaseOrderNotice = () => { if (!orderNoticeHeld) return; setOrderNoticeHeld(false); setOrderNotice(current => current && { ...current, shownAt: Date.now() }); };
  // C6b: the move's notice (a choice: it stays until another save or a view change), 되돌리기 and 그날 보기.
  const datesLeft = !!datesNotice && datesNotice.taskIds.some(id => !executionRows.some(row => row.kind === 'text-task' && row.task.id === id));
  const releaseDatesNotice = () => { if (!datesNoticeHeld) return; setDatesNoticeHeld(false); setDatesNotice(current => current && { ...current, shownAt: Date.now() }); };
  const datesNoticeContent = datesNotice?.actorId === actorId && <div className={styles.orderNotice} data-dates-notice onPointerDown={() => setDatesNoticeHeld(true)}
    onPointerUp={releaseDatesNotice} onPointerLeave={releaseDatesNotice} onFocus={() => setDatesNoticeHeld(true)} onBlur={releaseDatesNotice}>
    <ProgramNoticeRow notice={{ tone: datesNotice.refused ? 'warn' : datesNotice.undone ? 'info' : 'choose',
      // Core3 P3b (UX): short enough for one line at 390; that a moved row left the view the list itself shows.
      text: datesNotice.refused ?? (datesNotice.undone ? `${datesNotice.undo.length === 1 ? '' : `${datesNotice.undo.length}개를 `}원래 날짜로 되돌렸습니다`
        : datesNotice.text ?? programTaskDatesMovedText(datesNotice.count, datesNotice.date, today)),
      actions: datesNotice.refused || datesNotice.undone || datesPending ? [] : [{ label: '되돌리기', run: () => void restoreSelectDates(datesNotice) }, ...(datesLeft ? [{ label: '그날 보기', run: () => void showMovedDay(datesNotice.date) }] : [])] }}
      onClose={() => setDatesNotice(null)} />
  </div>;
  /** C2: after a check tap saved: completing shows the check notice (and not the plain one); reopening ends it. A task
   *  the save left at another value (a record dated later wins) keeps the plain notice: nothing says 완료 wrongly. */
  /** Re-review: the view a check was made in is still the one shown (person, period, date, folder, search); a later
   *  view keeps its own notices, so a slow save's answer never brings back the one the change of view cleared. */
  /** N10 (SPEC 2): finishing a repeat line's round, from 오늘 or from an open document: one command on the space as it
   *  is now; the round the screen showed (`expected`) keeps a second tab from moving it twice. Another device's save
   *  that got in first is read and the check built again on it (QA F2), so both days are kept and the date moves once.
   *  `seen` is the line's log as that screen showed it, so a date only moved by hand is never taken for that (QA N1). */
  async function finishRepeatRound(taskId: string, expected: string | null, seen: string): Promise<ProgramRepeatCheck | 'refused' | null> {
    const result = await run('반복 회차 완료', current => completeProgramRepeat(current, { actorId, requestId: programId('repeat'), expectedSpace: current.spaces[actorId],
      taskId, today, expected, seen }), true, undefined, undefined, true, true);
    return result.ok ? readProgramRepeatCheck(result.result) : result.reason === 'conflict' ? 'refused' : null;
  }
  /** SPEC 3: 되돌리기 takes the whole check back, only while the line is as it left it. */
  async function undoRepeatRound(check: ProgramRepeatCheck): Promise<boolean> {
    const result = await run('반복 되돌리기', current => undoProgramRepeat(current, { actorId, requestId: programId('repeat-undo'), expectedSpace: current.spaces[actorId], check }));
    return result.ok;
  }
  const repeatNextText = (title: string, check: ProgramRepeatCheck) => `${programRepeatTitle(title)} · ${check.applied ? '' : '다른 곳에서 이미 끝낸 회차입니다 · '}다음은 ${programCalendarDate(check.after, today)}`;
  // QA P3: as with C2/C6, a slow save's answer speaks only in the view the tap was made in.
  async function finishRepeatFromList(taskId: string, title: string, expected: string | null, quiet = false, onCheck?: (check: ProgramRepeatCheck) => void) {
    const view = presentation.current, check = await finishRepeatRound(taskId, expected, programRepeatSeen(space, taskId));
    const saved = !!check && check !== 'refused';
    if (check && check !== 'refused' && check.applied) onCheck?.(check);
    if (quiet || !checkViewOwns(view)) return saved;
    // QA F1: a check that changed nothing here (the round was finished elsewhere first) offers no 되돌리기.
    setRepeatNotice(check && check !== 'refused' ? { actorId, text: repeatNextText(title, check), check: check.applied ? check : null }
      : { actorId, text: check === 'refused' ? '다른 곳에서 이 반복을 먼저 바꿨습니다. 지금 날짜를 확인해 주세요' : '반복 회차를 저장하지 못했습니다', check: null, refused: true });
    return saved;
  }
  /** The 오늘 list's check, and the S11 band's (Flow pipeline 11/8: one function, so both save the same). A repeat line
   *  finishes its round; a task between 0 and 100% opens its chips (the band, which shows no notice, its form); any other
   *  is done, or opened again, as of today. Resolves 'saved', 'failed', or 'ignored' (a tap while one waits; chips or form). */
  function checkTaskFromList(task: TextTask, from: 'list' | 'band' = 'list', onRepeatCheck?: (check: ProgramRepeatCheck) => void): Promise<'saved' | 'failed' | 'ignored'> {
    const { latest: progress, current } = taskProgress(task.id), value = current ?? (task.done ? 100 : 0);
    // N10: a repeat line's tap finishes its round (the box stays empty, the date moves on); no chips.
    const repeat = programRepeatLine(space, task.id);
    if (repeat && !repeat.block) {
      const ids = completingInSession(completingTasks, sourceSession.current);
      if (ids.has(task.id)) return Promise.resolve('ignored');
      ids.add(task.id); setCompletingTaskIds(new Set(ids));
      return finishRepeatFromList(task.id, task.title, task.date, from === 'band', onRepeatCheck).then(saved => saved ? 'saved' as const : 'failed' as const).finally(() => { if (finishCompleting(completingTasks, ids, task.id)) setCompletingTaskIds(new Set(ids)); });
    }
    // A record dated after today keeps the form (review P2): today's record would not change what shows.
    if (value > 0 && value < 100 && (from === 'band' || (progress?.date ?? '') > today)) { setRecordDate(today); setPercent(String(value)); openDetail({ kind: 'task', id: task.id }); return Promise.resolve('ignored'); }
    if (value > 0 && value < 100) { setCheckNotice({ actorId, stage: 'chips', targetId: task.id, title: task.title, before: value, after: value, shownAt: Date.now(), key: ++checkNoticeKeys.current }); return Promise.resolve('ignored'); }
    // A repeat tap while the first still waits or saves would act on a stale
    // value, so ignore it; the first tap waits out a refresh by itself.
    const ids = completingInSession(completingTasks, sourceSession.current);
    if (ids.has(task.id)) return Promise.resolve('ignored');
    ids.add(task.id); setCompletingTaskIds(new Set(ids));
    const done = () => { if (finishCompleting(completingTasks, ids, task.id)) setCompletingTaskIds(new Set(ids)); };
    let after: number | null = null, proof = null as ProgramSameTaskProof | null;
    const view = presentation.current;
    return run(value === 100 ? '다시 열기' : '완료', current => {
      const next = completeProgramTask(current, { ...base(current), taskId: task.id, date: today, done: value !== 100 });
      if (next.ok) { after = M.currentProgress(next.data.spaces[actorId].text, task.id); proof = programSameTaskProof(current.spaces[actorId].text, next.data.spaces[actorId].text, [task.id], today); }
      return next;
    }, true, undefined, undefined, true).then(result => { done(); if (result.ok && from === 'list' && checkViewOwns(view)) checkSaved(task.id, task.title, value, after, proof); return result.ok ? 'saved' as const : 'failed' as const; },
      () => { done(); return 'failed' as const; });
  }
  async function undoRepeatFromList(check: ProgramRepeatCheck) {
    const view = presentation.current, done = await undoRepeatRound(check);
    if (!checkViewOwns(view)) return;
    setRepeatNotice(done ? null : { actorId, text: PROGRAM_REPEAT_UNDO_REFUSED, check: null, refused: true });
  }
  const repeatNoticeContent = repeatNotice?.actorId === actorId && <div className={styles.orderNotice} data-repeat-notice>
    <ProgramNoticeRow notice={{ tone: repeatNotice.refused ? 'warn' : 'choose', text: repeatNotice.text, closeLabel: '알림 닫기',
      actions: repeatNotice.check ? [{ label: '되돌리기', run: () => void undoRepeatFromList(repeatNotice.check!) }] : [] }} onClose={() => setRepeatNotice(null)} />
  </div>;
  /** F8 1단계 (CO-3, 사용자 11/10 '권장대로'): checking the row that stands for '같은 일 n줄' finishes them all, as of today, in one
   *  save (the 오늘 check's own command, once per line); its notice's 되돌리기 puts each back as it was, in one save:
   *  the line and its record of today (int8b W-CARRY-10: a record the check added goes, not a 0% one left). */
  async function checkSameTasks(members: readonly TextTask[]) {
    const ids = completingInSession(completingTasks, sourceSession.current);
    if (members.some(task => ids.has(task.id))) return;
    for (const task of members) ids.add(task.id);
    setCompletingTaskIds(new Set(ids));
    const view = presentation.current, shown = space;
    let proof = null as ProgramSameTaskProof | null;
    try {
      const result = await run('같은 일 모두 끝냄', current => {
        let state = current, last: ProgramTransition<string> | null = null;
        for (const task of members) {
          const step = completeProgramTask(state, { actorId, requestId: programId('request'), expectedSpace: last ? state.spaces[actorId] : shown, taskId: task.id, date: today, done: true });
          if (!step.ok) return step;
          state = step.data; last = step;
        }
        proof = programSameTaskProof(current.spaces[actorId].text, state.spaces[actorId].text, members.map(task => task.id), today);
        return last!;
      }, true, undefined, undefined, true);
      if (result.ok && checkViewOwns(view) && proof) setSameNotice({ actorId, ids: members.map(task => task.id), proof });
    } finally {
      let changed = false;
      for (const task of members) changed = finishCompleting(completingTasks, ids, task.id) || changed;
      if (changed) setCompletingTaskIds(new Set(ids));
    }
  }
  async function undoSameTasks(notice: NonNullable<typeof sameNotice>) {
    const result = await run('같은 일 되돌리기', current => undoProgramSameTasks(current,
      { actorId, requestId: programId('request'), expectedSpace: current.spaces[actorId], proof: notice.proof }), true, undefined, undefined, true);
    setSameNotice(current => current === notice ? result.ok ? { ...notice, undone: true } : { ...notice, refused: true } : current);
  }
  const sameNoticeContent = sameNotice?.actorId === actorId && <div className={styles.orderNotice} data-same-notice>
    <ProgramNoticeRow notice={{ tone: sameNotice.refused ? 'warn' : sameNotice.undone ? 'info' : 'choose', closeLabel: '알림 닫기',
      text: sameNotice.refused ? '되돌리지 못했습니다. 지금 상태를 확인해 주세요' : sameNotice.undone ? `같은 일 ${sameNotice.ids.length}줄을 원래대로 되돌렸습니다` : `같은 일 ${sameNotice.ids.length}줄을 모두 끝냈습니다`,
      actions: sameNotice.undone || sameNotice.refused ? [] : [{ label: '되돌리기', run: () => void undoSameTasks(sameNotice) }] }} onClose={() => setSameNotice(null)} />
  </div>;
  const sameSheetMembers = sameSheet ? sameGroups?.members.get(sameSheet) ?? null : null;
  const sameSheetContent = period === 'today' && <dialog ref={sameSheetRef} className={`${styles.findDialog} ${styles.sameSheet}`} aria-labelledby="program-same-title" onClose={() => setSameSheet(null)}>
    {sameSheetMembers && <>
      <header><h2 id="program-same-title">같은 일 {sameSheetMembers.length}줄</h2><button type="button" aria-label="닫기" onClick={() => setSameSheet(null)}><ProgramIcon name="close" size={20} /></button></header>
      <p>행을 체크하면 이 줄들을 모두 끝냅니다. 줄을 누르면 원래 글에서 엽니다.</p>
      <ul>{sameSheetMembers.map(task => <li key={task.id}><button type="button" onClick={() => { setSameSheet(null); void openDocument(task.docId, task.id); }}>
        <span>{task.title}</span><small>{task.groupDate ? programCalendarDate(task.groupDate, today, false) : '날짜 없음'} · {task.docTitle}</small></button></li>)}</ul>
    </>}
  </dialog>;
  // SPEC 6: an old one-task repeat ('내 반복') becomes a repeat line by one press of the person's; nothing converts by itself.
  const legacyRepeat = programLegacyRepeatSeries(space)[0];
  async function convertLegacyRepeat() {
    if (!legacyRepeat) return;
    // QA F5: the press itself starts the host's automatic read (pointerdown after a quiet spell), so it waits that out
    // like a check tap; refused as busy, it never reached the server. Only the command's own answer means it cannot be
    // converted; a save that did not run keeps the card, and the host's message says why.
    const result = await run('예전 반복 바꾸기', current => convertProgramLegacyRepeat(current, { actorId, requestId: `legacy-repeat-${legacyRepeat.id}`,
      expectedSpace: current.spaces[actorId], seriesId: legacyRepeat.id, today }), true, undefined, undefined, true);
    if (!result.ok && !['missing', 'unresolved'].includes(result.reason)) return;
    setLegacyRepeatNotice(result.ok ? PROGRAM_LEGACY_REPEAT_DONE : PROGRAM_LEGACY_REPEAT_REFUSED);
    if (!result.ok) setLegacyRepeatLater(true);
  }
  const legacyRepeatContent = (legacyRepeatNotice || legacyRepeat && !legacyRepeatLater && period === 'today') && <div className={styles.orderNotice} data-legacy-repeat>
    <ProgramNoticeRow notice={legacyRepeatNotice ? { tone: 'info', text: legacyRepeatNotice, closeLabel: '알림 닫기' }
      : { tone: 'choose', text: PROGRAM_LEGACY_REPEAT_CARD, closeLabel: null, actions: [{ label: '바꾸기', run: () => void convertLegacyRepeat() }, { label: '나중에', run: () => setLegacyRepeatLater(true) }] }}
      onClose={() => setLegacyRepeatNotice(null)} />
  </div>;
  const checkViewOwns = (view: typeof presentation.current) => dataRef.current.activeActorId === actorId && view.period === presentation.current.period
    && view.date === presentation.current.date && view.folderId === presentation.current.folderId && view.query === presentation.current.query;
  function checkSaved(taskId: string, title: string, before: number, after: number | null, proof: ProgramSameTaskProof | null = null) {
    if (before === 100) { setCheckNotice(current => current?.targetId === taskId ? null : current); return; }
    if (after !== 100) return;
    setTaskNotice(current => current?.taskId === taskId ? null : current);
    setCheckNotice({ actorId, stage: 'done', targetId: taskId, title, before, after: 100, shownAt: Date.now(), key: ++checkNoticeKeys.current, proof });
  }
  /** C2: a check notice button. It acts on the task the notice names, wherever its row now is; a replaced notice does nothing. */
  async function runCheckStep(key: number, step: ProgramCheckStep) {
    const notice = checkNoticeRef.current;
    if (!notice || notice.key !== key || notice.actorId !== actorId || checkStepBusy.current) return;
    if (step.kind === 'chips') { setCheckNotice({ ...notice, stage: 'chips', shownAt: Date.now(), key: ++checkNoticeKeys.current }); return; }
    const task = programExecutionTasks(dataRef.current.spaces[actorId]).find(item => item.id === notice.targetId);
    const progressNow = task ? M.currentProgress(dataRef.current.spaces[actorId].text, task.id) : null;
    if (!task || progressNow === null) { setCheckNotice(null); setMessage(programErrorMessage('missing')); return; }
    if (step.kind === 'direct') { setCheckNotice(null); setRecordDate(today); setPercent(String(progressNow)); setDirectProgress(true); openDetail({ kind: 'task', id: task.id }); return; }
    if (step.kind === 'undo' && !programCheckUndoable(notice, progressNow)) { setCheckNotice(null); setMessage('그 뒤에 진행률이 바뀌어 되돌리지 않았습니다. 현재 기록은 유지했습니다.'); return; }
    // Review P2: a record dated after today decides the current value, so today's would not show; the form, as in the editor.
    if ((M.latestProgress(dataRef.current.spaces[actorId].text, task.id)?.date ?? '') > today) {
      setCheckNotice(null); setRecordDate(today); setPercent(String(progressNow)); openDetail({ kind: 'task', id: task.id });
      setMessage('미래 날짜의 진행 기록이 있습니다. 기록 날짜를 확인한 뒤 변경해 주세요.'); return;
    }
    const percent = step.kind === 'undo' ? notice.before : step.percent, undo = step.kind === 'undo';
    // The value the save leaves, read off the data it commits; the notice says what was saved only when that matches.
    let saved: number | null = null, stepProof = null as ProgramSameTaskProof | null;
    // W-CARRY-10 (총괄 11/12): with the notice's proof, 되돌리기 puts the line and its record of that day back exactly (no 0%
    // record left), only while they are as the notice's last save left them. Without one, the old value is recorded.
    const exact = undo && notice.proof ? notice.proof : null;
    checkStepBusy.current = true;
    setCheckNotice({ ...notice, saving: { percent, undo, quiet: false } });
    try {
      const result = await run(undo ? '완료 되돌리기' : percent === 100 ? '완료' : '진행률 기록', current => {
        const next = exact ? undoProgramSameTasks(current, { actorId, requestId: programId('request'), expectedSpace: current.spaces[actorId], proof: exact })
          : recordProgramTaskProgress(current, { ...base(current), taskId: task.id, date: today, percent });
        if (next.ok) {
          saved = M.currentProgress(next.data.spaces[actorId].text, task.id);
          if (!undo) stepProof = programSameTaskProof(current.spaces[actorId].text, next.data.spaces[actorId].text, [task.id], today);
        }
        return next;
      }, true, undefined, undefined, true);
      const failed = (kept: number | null, why: 'save' | 'changed') => setCheckNotice(shown => shown?.key !== key ? shown
        : { ...programCheckNoticeFailed(shown, { why, asked: percent, askedUndo: undo, kept }, Date.now(), ++checkNoticeKeys.current), actorId: shown.actorId });
      if (!result.ok) { if (result.reason === 'busy') setCheckNotice(shown => shown?.key !== key ? shown : { ...shown, saving: undefined }); else failed(progressNow, exact && result.reason === 'conflict' ? 'changed' : 'save'); return; }
      // An exact 되돌리기 is checked by its command (the line and record as left, then as before); no record may be left to read.
      if (!exact && saved !== percent) { failed(saved, 'changed'); return; }
      if (percent === 100) setTaskNotice(currentNotice => currentNotice?.taskId === task.id ? null : currentNotice);
      setCheckNotice(shown => shown?.key !== key ? shown : undo ? null
        : { ...programCheckNoticeAfter(shown, percent, Date.now(), ++checkNoticeKeys.current), actorId: shown.actorId, proof: programSameTaskProofThen(shown.proof, stepProof) });
    } finally { checkStepBusy.current = false; }
  }
  const runCheckStepRef = useRef(runCheckStep); runCheckStepRef.current = runCheckStep;
  const releaseCheckNotice = () => { if (!checkNoticeHeld) return; setCheckNoticeHeld(false); setCheckNotice(current => current && { ...current, shownAt: Date.now() }); };
  // A failure's value is the one this screen shows now (a re-read included), read as it is drawn (final review).
  const checkNoticeView = checkNotice?.actorId === actorId ? programCheckNoticeView(programCheckNoticeLive(checkNotice, M.currentProgress(space.text, checkNotice.targetId))) : null;
  const checkStep = (key: number, step: ProgramCheckStep) => whenPageComposed(() => { void runCheckStepRef.current(key, step); });
  const checkNoticeContent = checkNotice && checkNoticeView && <div className={styles.orderNotice} data-check-notice onPointerDown={() => setCheckNoticeHeld(true)}
    onPointerUp={releaseCheckNotice} onPointerLeave={releaseCheckNotice} onFocus={() => setCheckNoticeHeld(true)} onBlur={releaseCheckNotice}>
    <ProgramNoticeRow notice={{ tone: checkNoticeView.tone, text: checkNoticeView.text, closeLabel: '알림 닫기',
      actions: checkNoticeView.actions.map(button => ({ label: button.label, run: checkStep(checkNotice.key, button.step) })),
      chips: checkNoticeView.chips.map(button => ({ label: button.label, current: button.current, run: checkStep(checkNotice.key, button.step) })) }}
      onClose={() => setCheckNotice(null)} />
  </div>;
  const orderNoticeContent = orderNotice?.actorId === actorId && <div className={styles.orderNotice} data-order-notice onPointerDown={() => setOrderNoticeHeld(true)}
    onPointerUp={releaseOrderNotice} onPointerLeave={releaseOrderNotice} onFocus={() => setOrderNoticeHeld(true)} onBlur={releaseOrderNotice}>
    <ProgramNoticeRow notice={{ tone: orderNotice.refused ? 'warn' : 'info', text: orderNoticeText(orderNotice),
      actions: orderNotice.refused || orderPending ? [] : [{ label: '되돌리기', run: () => void restoreDayOrder(orderNotice) }] }} onClose={() => setOrderNotice(null)} />
  </div>;
  const viewChangeNoticeContent = viewChangeNotice?.actorId === actorId && <p role="alert" className={styles.error} data-view-change-notice={viewChangeNotice.reason}>{
    viewChangeNotice.reason === 'composition' ? '한글 입력을 마친 뒤 보기를 바꿔 주세요. 입력은 그대로 있습니다.'
      : viewChangeNotice.reason === 'recurrence' ? '회차 날짜를 적용하거나 취소한 뒤 보기를 바꿔 주세요.'
      : viewChangeNotice.reason === 'saving' ? '입력을 저장하는 중입니다. 저장을 마친 뒤 보기를 바꿔 주세요.'
      : viewChangeNotice.reason === 'save-failed' ? '입력을 저장하지 못해 보기를 바꾸지 않았습니다. 본문의 저장 상태를 확인해 주세요.'
      : '작성 중인 입력을 저장한 뒤 보기를 바꿔 주세요. 입력은 그대로 있습니다.'}</p>;
  // N9 (U51): the document list's folder scope and 폴더 정리 wait for a first folder of the person's own.
  const hasFolders = space.text.folders.some(item => item.id !== 'folder-unfiled');
  const folderOptions = space.text.folders.map(item => {
    const names = [item.title]; let parent = item.parentId;
    while (parent) { const ancestor = space.text.folders.find(row => row.id === parent); if (!ancestor) break; names.unshift(ancestor.title); parent = ancestor.parentId; }
    return { id: item.id, title: names.join(' / ') };
  });
  const taskFolderPath = (task: TextTask) => {
    if (collectionMode) return '문서';
    const actualFolderId = space.text.flows.find(flow => flow.id === task.scopeId)?.folderId ?? task.folderId;
    return folderOptions.find(item => item.id === actualFolderId)?.title ?? task.folder;
  };
  // Flow pipeline S3: the highlight while its document is still mine to see (an undo or the trash ends it quietly).
  const shownHighlight = flowHighlight && flowDocuments.has(flowHighlight.documentId) ? flowHighlight : null;
  const highlightCopyId = shownHighlight ? space.copies.find(copy => copy.documentId === shownHighlight.documentId)?.id ?? null : null;
  const highlightRow = shownHighlight ? { title: shownHighlight.title, test: (row: ProgramOrderedExecutionRow) => row.kind === 'text-task'
    ? row.task.docId === shownHighlight.documentId : !!highlightCopyId && row.row.savedCopyId === highlightCopyId } : undefined;
  /** S3 (with today A's T6 place): a Flow document's row shows that Flow's name where a folder would be. */
  const rowFlowTitle = (task: TextTask) => collectionMode ? null : flowDocuments.get(task.docId) ?? null;
  /** T6: the folder a row shows first ("/ 회사 일"); none for 미분류, no folder, or a collection. */
  const rowFolderTitle = (task: TextTask) => {
    if (collectionMode) return null;
    const actualFolderId = space.text.flows.find(flow => flow.id === task.scopeId)?.folderId ?? task.folderId;
    if (!actualFolderId || actualFolderId === 'folder-unfiled') return null;
    return folderOptions.find(item => item.id === actualFolderId)?.title ?? null;
  };

  // W6: the writing example is offered in the empty document's ＋ menu, not in the editor's 도구.
  const writingExampleReady = !!selectedDoc && programDocumentContentLock(space, selectedDoc.id) === 'active' && !M.raw(selectedDoc).trim();
  const publicationEntry = selectedDoc && props.capabilities?.publication !== false && props.onPublishDocument ? programPublicationDocumentEntry(data, selectedDoc.id) : null;
  const selectedDocumentTools = selectedDoc && !retentionSource && !selectedTrashed && <details key={selectedDoc.id} ref={documentMenu} onToggle={event => {
            const title = event.currentTarget.querySelector<HTMLInputElement>('input[name="title"]');
            if (!event.currentTarget.open && (!title || title.value === title.defaultValue)) formExpected.current = null;
          }}><summary aria-label="현재 글 작업"><span className={styles.documentToolsLabel}>글 작업</span><span className={styles.documentToolsMarker} aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" focusable="false"><path d="M5 12h.01M12 12h.01M19 12h.01" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></span></summary><div className={styles.documentTools} onInputCapture={() => { formExpected.current ??= space; }}>
            <form onSubmit={async event => { event.preventDefault(); const title = String(new FormData(event.currentTarget).get('title') ?? ''); await run('문서 이름 변경', current => renameProgramDocument(current, { ...base(current), documentId: selectedDoc.id, title })); }}><label>문서 이름<input key={selectedDoc.id + selectedDoc.title} name="title" defaultValue={selectedDoc.title} required /></label><button>이름 변경</button>
              {/* F12 2차 (W-FLOW-01): a Flow run's document title is its run name (nothing else stores it). */}
              {(space.copies.some(copy => copy.documentId === selectedDoc.id) || space.personalAuthoring?.executions?.some(execution => execution.executionDocumentId === selectedDoc.id))
                && <small className={styles.runNameHint} data-run-name-hint>이 이름이 실행 이름입니다. 오늘 진행 줄에 Flow 이름 뒤로 붙습니다(예: 월간 발표 12월).</small>}</form>
            {/* 총괄 조건 4: the whole document, as before, any time (remembered on this device; the recent part is the default). */}
            {period === 'documents' && !collectionMode && !folderId && recentHoldOf(selectedDoc.id) && <button type="button" data-recent-action={recentWhole[selectedDoc.id] ? 'menu-recent' : 'menu-whole'}
              disabled={preparingDocumentAction} onClick={() => { if (documentMenu.current) documentMenu.current.open = false;
                void (recentWhole[selectedDoc.id] ? showRecentOnly(selectedDoc.id) : showRecentWhole(selectedDoc.id)); }}>{recentWhole[selectedDoc.id] ? '최근만 보기' : '전체 보기'}</button>}
            {/* F10 W-ORDER-05: the date sections the other way round, previewed in the editor (the whole document only). */}
            {period === 'documents' && !collectionMode && !folderId && <button type="button" data-section-order-open disabled={preparingDocumentAction} onClick={event => {
              // The menu closes, with the editor tools it sits in on a phone, before the preview opens.
              for (let menu = event.currentTarget.closest('details'); menu; menu = menu.parentElement?.closest('details') ?? null) menu.open = false;
              if (documentMenu.current) documentMenu.current.open = false;
              if (recentViewOf(selectedDoc.id)) { setMessage('지난 기록을 펼친 뒤(전체 보기) 날짜 순서를 바꿔 주세요.'); return; }
              sectionOrderOpeners.current[selectedDoc.id]?.();
            }}>날짜 순서 바꾸기</button>}
            {!collectionMode && <label>보관 위치<select value={selectedDoc.folderId} onChange={event => { const value = event.target.value; void run('폴더 이동', current => setProgramDocumentFolder(current, { ...base(current), documentId: selectedDoc.id, folderId: value })); }}>{folderOptions.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
            {/* int4 (F5-b 목업 F5 상태): one entry by where this document is — 공개하기 (① 고르기), 공개 이어서 (its draft at ② 다듬기),
                or 공개 관리 · 버전 n (나's management screen, through the host's navigate, which saves the editors first). */}
            {publicationEntry && <button disabled={preparingDocumentAction} data-publication-entry={publicationEntry.kind} onClick={() => {
              if (publicationEntry.kind !== 'manage') { void openDocumentAction(id => props.onPublishDocument!(id, publicationEntry.initialStep), { modalReturnFocus: true }); return; }
              if (documentMenu.current) documentMenu.current.open = false;
              props.navigate({ view: 'activity', id: publicationEntry.flowId });
            }}>{publicationEntry.label}</button>}
            {props.capabilities?.revisionHistory !== false && props.onRevisionHistory && <button disabled={preparingDocumentAction} onClick={() => void openDocumentAction(props.onRevisionHistory!)}>저장본·복구</button>}
            {props.onOutputDocument && <button disabled={preparingDocumentAction} onClick={() => void openDocumentAction(props.onOutputDocument!)}>내 도구로 가져가기</button>}
            {props.onStartReview && <button disabled={preparingDocumentAction} onClick={() => void openDocumentAction(props.onStartReview!)}>후기 쓰기</button>}
            {props.capabilities?.copyInspection !== false && props.onInspectCopy && space.copies.filter(copy => copy.documentId === selectedDoc.id).map(copy => <button key={copy.id} disabled={preparingDocumentAction} onClick={() => void openDocumentAction(() => props.onInspectCopy!(copy.id), { modalReturnFocus: true })}>내 계획·원본 변경 확인</button>)}
            {space.savedBindings.filter(binding => binding.documentId === selectedDoc.id).map(binding => <button key={binding.flowRef} disabled={preparingDocumentAction} onClick={() => void openDocumentAction(() => props.navigate({ view: 'legacy', id: binding.flowRef }))}>원본·개인 계획 확인</button>)}
            {space.retentionDocuments?.[selectedDoc.id] && <button onClick={() => void openDocument(space.retentionDocuments![selectedDoc.id])}>복구 중 보관된 내용</button>}
            <button disabled={preparingDocumentAction} onClick={() => void openDocumentAction(async id => {
              // Archiving changes only this stable document's presence, never its freshly saved body.
              await run(selectedArchived ? '문서 복원' : '문서 보관', current => archiveProgramDocument(current, { actorId, requestId: programId('archive'), expectedSpace: current.spaces[actorId], documentId: id, archived: !selectedArchived }));
            })}>{selectedArchived ? '보관에서 꺼내기' : '문서 보관'}</button>
            <ProgramDocumentTrashAction key={selectedDoc.id} space={space} documentId={selectedDoc.id} disabled={preparingDocumentAction} onChange={changeDocumentTrash} />
          </div></details>;

  // Writing states share one title/action heading and one guarded finder.
  // Period views retain their existing entry position and search scope.
  function findPointerDown(event: React.PointerEvent) {
    if (libraryComposing.current) { event.preventDefault(); event.stopPropagation(); return; }
    rememberFindFocus(); if (libraryReturn.current?.area) event.preventDefault();
  }
  const compactNoteToday = !!props.noteHeader && period === 'today';
  // C6a: 고르기 stays off, with its reason, while a check or a source waits, a move or a save is on (2-1).
  // Any save waiting (C6a review): one state for all of them, the host's own operation too (an undo from its menu).
  const saving = savesPending > 0 || preparingDocumentAction || classificationCreating || orderPending || !!props.sourceReturnWaits?.();
  const selectBlocked = completingTaskIds.size ? '완료 저장을 기다리는 동안에는 고를 수 없습니다' : sourceWaitingTask ? '원문을 여는 동안에는 고를 수 없습니다'
    : moving ? '순서를 옮기는 동안에는 고를 수 없습니다' : saving ? '저장하는 동안에는 고를 수 없습니다' : props.hostBusy?.() ? '서버 확인이 끝난 뒤 고를 수 있습니다' : null;
  const findActions = <div className={styles.findActions}>
    {period === 'documents' && <button className={styles.newWriting} disabled={preparingDocumentAction} onClick={() => void beginWriting()}>새 글</button>}
    <button ref={libraryToggle} className={styles.libraryToggle} aria-label="글 찾기 · 내 문서와 할 일" aria-expanded={libraryOpen} aria-controls="program-library"
      onPointerDown={findPointerDown}
      onClick={openFindPanel}>글 찾기</button>
    {/* C6a: 여러 할 일을 골라 날짜를 한꺼번에 바꾸기 (the calendar goes to its list first). */}
    {period !== 'documents' && !selecting && <button type="button" className={styles.selectStart} disabled={!!selectBlocked} title={selectBlocked ?? undefined}
      onClick={startSelecting}>{compactNoteToday ? '여러 개 고르기' : monthGrid ? '목록에서 고르기' : '고르기'}</button>}
    {period !== 'documents' && !selecting && selectBlocked && <small className={styles.selectBlocked}>{selectBlocked}</small>}
  </div>;
  /** N11a [오늘로 옮기기]: the card's plan in one save, all or none (it waits out an automatic read). A line changed since
   *  the card showed it moves nothing. What 되돌리기 puts back is taken inside the save, from the very space it changed. */
  async function carryToToday(plan: ProgramCarryoverPlan, sheet?: { text: string; undated: boolean }, early?: ProgramMorningCarry): Promise<'saved' | 'conflict' | null> {
    if (!plan.lines.length || carryBusy.current || pageComposing.current) return null;
    const requestId = programId('carryover');
    let before: ProgramCarryoverBefore | null = null, after = '';
    carryBusy.current = true; setCarryPending(true); setCarryNotice(null);
    try {
      const result = await countedMutate('밀린 일 오늘로', current => {
        carrySeen.current = current.spaces[actorId] ?? null;
        const next = carryProgramTasksToToday(current, { actorId, requestId, expectedSpace: current.spaces[actorId], today, lines: plan.lines });
        if (next.ok) { before = programCarryoverBefore(current.spaces[actorId]); after = programCarryoverProof(next.data.spaces[actorId]); }
        return next;
      }, { history: true, awaitAutomaticRead: true });
      if (result.ok) {
        setTaskNotice(null); setOrderNotice(null); setDatesNotice(null);
        const kinds = plan.toToday;
        const text = sheet ? [sheet.text, plan.left ? `남은 ${plan.left}줄은 한 번 더 정리하면 됩니다.` : ''].filter(Boolean).join(' ')
          : [kinds ? `${kinds}가지를 오늘로 옮겼습니다.` : '', plan.removed ? kinds ? `겹친 줄과 끝낸 일의 남은 줄 ${plan.removed}개는 지웠습니다.` : `끝낸 일의 남은 줄 ${plan.removed}개를 지웠습니다.` : '',
            plan.left ? `남은 ${plan.left}줄은 한 번 더 누르면 정리됩니다.` : ''].filter(Boolean).join(' ');
        if (sheet) carrySheet.current?.close();
        if (early && before) {
          const parts = [early.moved ? `${early.moved}개 옮김` : '', early.continued ? `${early.continued}개 복사` : ''].filter(Boolean).join(' · ');
          setMorningDone({ actorId, text: `${early.lines}개 이어 씀${parts ? ` (${parts})` : ''}`, before, after });
          setCarryNotice({ actorId, text: `${early.lines}개 이어 썼습니다`, before, after, shownAt: Date.now() });
          return 'saved';
        }
        setCarryNotice({ actorId, text, before, after, ...(sheet?.undated ? { undatedView: true } : {}), shownAt: Date.now() });
        return 'saved';
      }
      if (result.reason === 'conflict') {
        if (!sheet) setCarryNotice({ actorId, text: '그사이 바뀐 할 일이 있어 정리하지 않았습니다. 다시 확인해 주세요.', before: null, after: '', refused: true, shownAt: Date.now() });
        return 'conflict';
      }
      if (result.reason !== 'busy') setMessage(programErrorMessage(result.reason));
      return null;
    } finally { carryBusy.current = false; setCarryPending(false); }
  }
  /** 되돌리기: the writing exactly as before the save, while nothing has changed it since. */
  async function undoCarry(notice: CarryNotice) {
    if (!notice.before || carryBusy.current) return;
    const before = notice.before, requestId = programId('carryover-undo');
    carryBusy.current = true; setCarryPending(true);
    try {
      const result = await countedMutate('밀린 일 되돌리기', current => restoreProgramCarryover(current, { actorId, requestId, expectedSpace: current.spaces[actorId], before, after: notice.after }),
        { history: true, awaitAutomaticRead: true });
      if (result.ok) { setCarryNotice({ ...notice, text: '정리 전으로 되돌렸습니다', before: null, undone: true, shownAt: Date.now() }); setMorningDone(current => current?.after === notice.after ? null : current); }
      else if (result.reason === 'conflict') setCarryNotice({ ...notice, text: '그 뒤 바뀐 할 일이 있어 되돌리지 않았습니다', before: null, refused: true, shownAt: Date.now() });
      else if (result.reason !== 'busy') setMessage(programErrorMessage(result.reason));
    } finally { carryBusy.current = false; setCarryPending(false); }
  }
  const carryWriting = composingShown || Object.values(dirty.current).some(Boolean);
  const carryRepeats = (morning?.plan.repeats ?? 0) + carryPast.filter(item => item.kind === 'row' && item.entry.kind === 'occurrence').length;
  // 오늘 탭 ② (W-CARRY-12, mockup ③): '이어 쓸 일 n개 · 어제 11월 12일 (목)' and [어제 일 n개 이어 쓰기] ('11/9(월) 일 n개' when
  // the last day tasks were written is not yesterday); hidden with nothing to take or that day more than 14 days back (the
  // first cleanup asks then). The days before: '밀린 일 n개' with 보기 (the rows) and 하나씩 정리. All counted in task lines.
  const morningYesterday = !!morning && programDaysBetween(morning.day, today) === 1;
  const morningButton = !!morning && morning.lines > 0 && !morning.stale && !morningHolds;
  const carryCardContent = carryCard && <section className={styles.carryCard} aria-label="밀린 일" data-carryover>
    {morningHolds && morningDone && <div className={styles.carryDone} data-morning-done>
      <p><span>{morningDone.text}</span>{!carryPending && <button type="button" className={styles.carryUndo}
        onClick={() => void undoCarry({ actorId, text: morningDone.text, before: morningDone.before, after: morningDone.after, shownAt: Date.now() })}>되돌리기</button>}</p>
      <small className={styles.carryNote}>오늘 구획을 고치기 전까지 이 자리에 남습니다.</small>
    </div>}
    {morning && morningButton && <>
      <p className={styles.carryTitle} data-morning-head>{`이어 쓸 일 ${morning.lines}개 · ${morningYesterday ? '어제 ' : ''}${programCalendarDate(morning.day, today)}`}</p>
      <div className={styles.carryActions}>
        <button type="button" className={styles.carryMove} data-morning-carry disabled={carryPending || saving || carryWriting || !!props.hostBusy?.()}
          aria-busy={carryPending || undefined} onClick={() => void carryToToday(morning.plan, undefined, morning)}>
          {carryPending ? '이어 쓰는 중…' : `${morningYesterday ? '어제' : programShortDate(morning.day)} 일 ${morning.lines}개 이어 쓰기`}</button>
      </div>
      <small className={styles.carryNote}>기록이 없는 일은 오늘로 옮기고, 진행률·체크·메모가 있는 일은 복사해 지난 줄에 이어감을 남깁니다.</small>
      {carryWriting && <small className={styles.carryNote} role="status">쓰기를 마치면 이어 쓸 수 있습니다</small>}
      {morning.plan.finished > 0 && <small className={styles.carryNote}>그 뒤에 끝낸 일의 남은 줄 {morning.plan.finished}가지는 지웁니다</small>}
      {morning.plan.left > 0 && <small className={styles.carryNote}>한 번에 {PROGRAM_CARRYOVER_LIMIT}줄까지 이어 씁니다 · 남은 {morning.plan.left}줄은 한 번 더 누르면 됩니다</small>}
    </>}
    {morning && (morning.older > 0 || !morningButton && !morningHolds) && <div className={styles.carryLate} data-late-line>
      <b>{opening.since ? `${programCalendarDate(opening.since, today, false)} 이후 처음 열었습니다 · ` : ''}밀린 일 {morning.older > 0 ? morning.older : carrySummary.lines}개</b>
      <button type="button" className={styles.carryFold} aria-expanded={carryOpen} onClick={() => setCarryOpen(!carryOpen)}>{carryOpen ? '접기' : '보기'}</button>
      <button type="button" className={styles.carryOne} aria-haspopup="dialog" disabled={carryPending} onClick={() => openCarrySheet()}>하나씩 정리</button>
    </div>}
    {carryRepeats > 0 && <small className={styles.carryNote}>반복 {carryRepeats}개는 체크하면 다음 회차로 넘어갑니다</small>}
  </section>;
  const releaseCarryNotice = () => { if (!carryNoticeHeld) return; setCarryNoticeHeld(false); setCarryNotice(current => current && { ...current, shownAt: Date.now() }); };
  const carryNoticeContent = carryNotice?.actorId === actorId && <div className={styles.orderNotice} data-carry-notice onPointerDown={() => setCarryNoticeHeld(true)}
    onPointerUp={releaseCarryNotice} onPointerLeave={releaseCarryNotice} onFocus={() => setCarryNoticeHeld(true)} onBlur={releaseCarryNotice}>
    <ProgramNoticeRow notice={{ tone: carryNotice.refused ? 'warn' : carryNotice.before ? 'choose' : 'info', text: carryNotice.text,
      actions: carryNotice.before && !carryPending ? [{ label: '되돌리기', run: () => void undoCarry(carryNotice) },
        ...(carryNotice.undatedView ? [{ label: '날짜 미정 보기', run: () => void changePeriod('undated') }] : [])] : [] }} onClose={() => setCarryNotice(null)} />
  </div>;
  // 11/5 phone P3: the notices under the list hold one place at the bottom (sticky), and the old-repeat card covered them
  // and the list there; it waits while one shows (they close by themselves) and comes back after.
  // F4-b: after a '＋ 오늘 할 일' line, where it went and its 되돌리기 (until another save or a view change).
  const folderTodayNoticeContent = folderTodayNotice?.actorId === actorId && !!folderScreen && <div className={styles.orderNotice} data-folder-today-notice>
    <ProgramNoticeRow notice={{ tone: folderTodayNotice.refused ? 'warn' : folderTodayNotice.undo ? 'choose' : 'info', text: folderTodayNotice.text,
      actions: folderTodayNotice.undo && !folderTodayPending ? [{ label: '되돌리기', run: () => void undoFolderToday(folderTodayNotice) }] : [] }}
      onClose={() => setFolderTodayNotice(null)} />
  </div>;
  const locationLeft=!!locationNotice&&(period==='documents'?!!recentViewRef.current(locationNotice.documentId)?.hidden.has(locationNotice.taskId):!executionRows.some(row=>row.kind==='text-task'&&row.task.id===locationNotice.taskId));
  const locationNoticeContent=locationNotice?.actorId===actorId&&<div className={styles.orderNotice} data-task-location-notice><ProgramNoticeRow notice={{tone:'choose',text:locationNotice.text,actions:locationPending?[]:[{label:'되돌리기',run:()=>void undoTaskLocation(locationNotice)},...(locationLeft?[{label:locationNotice.kind==='date'?'그날 보기':'그 폴더 보기',run:()=>{
    const notice=locationNotice;
    if(period==='documents'){void openDocument(notice.documentId,notice.taskId);return;}
    if(notice.kind!=='date'){void openFolderScreen(notice.folderId);return;}
    void changePeriod(notice.date?'today':'undated').then(ok=>{if(ok&&notice.date)setDate(notice.date);requestAnimationFrame(()=>highlightTaskLocation(notice.taskId));});
  }}]:[])]}} onClose={()=>setLocationNotice(null)}/></div>;
  const bottomNoticeShown = !!(!sheetOpen && (orderNoticeContent || checkNoticeContent || repeatNoticeContent || sameNoticeContent) || datesNoticeContent || carryNoticeContent || folderTodayNoticeContent || locationNoticeContent || selecting && selectNotice);
  /** N11b [하나씩 정리]: the card's tasks one by one (PROPOSAL 4-3), each with the card's choice to start from. */
  function openCarrySheet(keep?: ReadonlyMap<string, ProgramCarryoverChoice>, from?: ProgramPrivateSpace | null) {
    const shown = from ?? dataRef.current.spaces[actorId] ?? space, items = programCarryoverItems(shown, today);
    setCarrySheetSpace(shown); setCarryItems(items); setCarrySheetNote(null);
    setCarryChoices(new Map(items.map(item => [item.kind, keep?.get(item.kind) ?? item.choice])));
    if (!carrySheet.current?.open) carrySheet.current?.showModal();
  }
  const closeCarrySheet = () => carrySheet.current?.close();
  const carryChoiceOf = (item: ProgramCarryoverItem) => carryChoices.get(item.kind) ?? item.choice;
  const carryCounts = (['today', 'undated', 'delete'] as const).map(choice => carryItems?.filter(item => carryChoiceOf(item) === choice).length ?? 0);
  /** [이대로 정리]: every choice in one save, as the card's press (all or none, one 되돌리기). */
  async function applyCarrySheet() {
    const plan = carrySheetPlan;
    if (!carryItems || !plan) return;
    if (!plan.lines.length) { closeCarrySheet(); return; }
    const [moved, undated, deleted] = carryCounts;
    const text = `${['정리했습니다', moved ? `오늘 ${moved}가지` : '', undated ? `날짜 미정 ${undated}가지` : '', deleted ? `지움 ${deleted}가지` : ''].filter(Boolean).join(' · ')}.`;
    // A line changed elsewhere since the sheet showed it: nothing is saved, and the list is shown again from now.
    if (await carryToToday(plan, { text, undated: undated > 0 }) === 'conflict') {
      openCarrySheet(new Map(carryItems.map(item => [item.kind, carryChoiceOf(item)])), carrySeen.current);
      setCarrySheetNote('다른 곳에서 바뀌었어요. 목록을 다시 확인해 주세요');
    }
  }
  const carryChoiceLabel: Record<ProgramCarryoverChoice, string> = { today: '오늘', undated: '날짜 미정', delete: '지우기' };
  // QA F3: what a chosen deletion takes along, counted line by line: '메모 2줄 · 체크 1개 · 다른 줄 1줄'.
  const along = carrySheetPlan?.droppedUnder;
  const carryAlong = along ? [along.memo ? `메모 ${along.memo}줄` : '', along.check ? `체크 ${along.check}개` : '', along.other ? `다른 줄 ${along.other}줄` : ''].filter(Boolean).join(' · ') : '';
  const carryItemRow = (item: ProgramCarryoverItem, named: boolean) => {
    const choice = carryChoiceOf(item), options: ProgramCarryoverChoice[] = item.finished ? ['delete', 'today'] : ['today', 'undated', 'delete'];
    const meta = item.finished ? `${programCalendarDate(item.finished, today, false)} 끝냄 · 남은 줄 ${item.lines}`
      : [`${programDayCount(item.since, today) ?? 1}일째` /* 총괄 11/12 ②, one count (Codex re-review P2-2) */, item.lines > 1 ? `${item.lines}번 다시 씀` : '', item.today ? '오늘에도 있음' : ''].filter(Boolean).join(' · ');
    return <li key={item.kind} className={styles.carryItem} data-carry-item>
      <p><span>{named ? item.place || '분류 없음' : item.title}</span><small>{meta}</small></p>
      <div className={styles.carryChoices} role="radiogroup" aria-label={`${item.title}${named ? ` · ${item.place}` : ''} 정리`}>
        {options.map(option => <button key={option} type="button" role="radio" aria-checked={choice === option}
          onClick={() => setCarryChoices(current => new Map(current).set(item.kind, option))}>{carryChoiceLabel[option]}</button>)}
      </div>
    </li>;
  };
  // The same words in two 분류 or more are one bundle ('세차 예약 · 분류 2곳'), a choice for each 분류.
  const carrySection = (title: string, items: ProgramCarryoverItem[]) => {
    if (!items.length) return null;
    const bundles = new Map<string, ProgramCarryoverItem[]>();
    for (const item of items) bundles.set(item.title, [...bundles.get(item.title) ?? [], item]);
    return <section className={styles.carrySection} aria-label={title}><h3>{title} · {items.length}</h3><ul>
      {[...bundles.values()].map(bundle => bundle.length > 1 ? <li key={`bundle:${bundle[0].title}`} className={styles.carryBundle}>
        <p>{bundle[0].title} · 분류 {bundle.length}곳</p><ul>{bundle.map(item => carryItemRow(item, true))}</ul></li> : carryItemRow(bundle[0], false))}
    </ul></section>;
  };
  const carrySheetContent = period === 'today' && <dialog ref={carrySheet} className={`${styles.findDialog} ${styles.carrySheet}`} aria-labelledby="program-carry-title"
    onCancel={event => { event.preventDefault(); closeCarrySheet(); }}>
    <div className={styles.carrySheetHead}><h2 id="program-carry-title">밀린 일 정리</h2><button type="button" onClick={closeCarrySheet}>닫기</button></div>
    {carrySheetNote && <p className={styles.carrySheetNote} role="status">{carrySheetNote}</p>}
    {carryItems && carryItems.length > 0 && <>
      <p className={styles.carryMeta}>{programCalendarDate(carryItems.reduce((day, item) => item.since < day ? item.since : day, carryItems[0].since), today, false)}부터 {carryItems.length}가지 · {carryItems.reduce((sum, item) => sum + item.lines, 0)}줄</p>
      {carrySection('오늘로 옮길 일', carryItems.filter(item => !item.finished))}
      {carrySection('이미 끝낸 일 · 남은 줄만 지웁니다', carryItems.filter(item => item.finished))}
      <button type="button" className={styles.carryApply} disabled={carryPending || saving || carryWriting || !!props.hostBusy?.()} aria-busy={carryPending || undefined}
        onClick={() => void applyCarrySheet()}>{carryPending ? '정리하는 중…' : <>{`이대로 정리${[`오늘 ${carryCounts[0]}`, `날짜 미정 ${carryCounts[1]}`, `지우기 ${carryCounts[2]}`]
          .filter((_, index) => carryCounts[index]).map(part => ` · ${part}`).join('')}`}
          {/* A deletion the person chose takes what is under the line along (되돌리기 brings it back): said before saving. */}
          {carryAlong && <small className={styles.carryApplyNote}>{carryAlong} 함께 지움</small>}</>}</button>
    </>}
  </dialog>;
  const viewScope = programViewScope({ period, date, today, folderTitle: folderId ? folderOptions.find(item => item.id === folderId)?.title ?? '선택한 분류' : null, query });
  async function clearScope(kind: 'period' | 'folder' | 'query') {
    if (kind === 'period') return changePeriod('today');
    if (kind === 'folder') return changeFolder('');
    setQuery('');
  }
  // N9 (U47): with no document at all the title is the tab's name, not a list button; '새 글 쓰기' starts the first one.
  const noDocuments = !docs.length && !selectedDoc && !selected;
  const documentTitleText = selectedDoc ? selectedDoc.title : selected ? '문서를 찾을 수 없습니다' : noDocuments ? '쓰기' : '필요한 내용을 먼저 적으세요';
  // F4-a (11/9): the 폴더 tab. Its list (A1·A6), or an open folder: the head (‹ · parents › · name · ⋯), [할 일]·[글].
  const isOpenTask = (task: TextTask) => (taskProgress(task.id).current ?? (task.done ? 100 : 0)) !== 100;
  const folderTab = mainTab === 'all' && !collectionMode;
  const folderList = folderTab && !folderScreen && period === 'all';
  const folderWriting = !!folderScreen && folderScreen.tab === 'writing' && period === 'documents';
  const folderTree = useMemo(() => folderTab ? programFolderTree(space, isOpenTask) : null, [folderTab, space, taskProgress]);
  const folderWritingDocuments = useMemo(() => folderScreen && folderId ? programFolderWritingDocuments(space, folderId, isOpenTask, space.position.documentId) : [],
    [!!folderScreen, folderId, space, taskProgress]);
  const folderWritingDocumentsRef = useRef(folderWritingDocuments); folderWritingDocumentsRef.current = folderWritingDocuments;
  const folderOpenCount = useMemo(() => folderScreen ? programExecutionTasks(space, { folderId }).filter(isOpenTask).length : 0, [!!folderScreen, folderId, space, taskProgress]);
  const folderPath = folderScreen && folderId ? programFolderAncestry(space, folderId) : [];
  const folderName = folderId ? folderPath.at(-1)?.title ?? '폴더' : '모든 할 일';
  const folderTitleOf = (id: string) => space.text.folders.find(row => row.id === id)?.title ?? '미분류';
  useEffect(() => { if (!folderWriting) setFolderStatus(null); }, [folderWriting]);
  const folderHead = folderScreen && <div className={folderStyles.head} data-folder-head>
    <button type="button" className={folderStyles.back} aria-label="폴더 목록으로" disabled={preparingDocumentAction} onClick={() => void closeFolderScreen()}><ProgramIcon name="back" size={24} /></button>
    {folderPath.length > 1 && <span className={folderStyles.path}>{folderPath.slice(0, -1).map(item => <button key={item.id} type="button" className={folderStyles.pathLink}
      data-folder-parent={item.id} aria-label={`상위 폴더 ${item.title} 열기`} onClick={() => void openFolderScreen(item.id)}>{item.title} ›</button>)}</span>}
    <h1>{folderName}</h1>
    {folderWriting && folderStatus && <span className={folderStyles.status} aria-hidden="true" data-folder-status data-warn={folderStatus.warn || undefined}>{folderStatus.label}</span>}
    {folderId && folderId !== 'folder-unfiled' && <button type="button" className={folderStyles.more} aria-label={`${folderName} 폴더 관리`} aria-haspopup="dialog" data-folder-manage
      onClick={() => openDetail({ kind: 'folder', id: folderId })}><ProgramIcon name="more" size={24} /></button>}
    {folderWriting && <button type="button" className={folderStyles.finish} data-folder-finish onClick={() => { const active = document.activeElement; if (active instanceof HTMLElement) active.blur(); }}>완료</button>}
  </div>;
  // '모든 할 일' has no [글] (A1 ①): no tab line.
  const folderTabs = folderScreen && folderId && <div className={folderStyles.seg} role="tablist" aria-label={`${folderName} 보기`}>
    <button type="button" role="tab" className={folderStyles.tab} aria-selected={folderScreen.tab === 'tasks'} data-folder-tab="tasks" onClick={() => void chooseFolderTab('tasks')}>할 일 <small>{folderOpenCount}</small></button>
    <button type="button" role="tab" className={folderStyles.tab} aria-selected={folderScreen.tab === 'writing'} data-folder-tab="writing" onClick={() => void chooseFolderTab('writing')}>글 <small>{folderWritingDocuments.length}</small></button>
  </div>;
  const folderCreate = async (title: string) => {
    if (classificationRequest.current) return false;
    classificationRequest.current = true; setClassificationCreating(true);
    try { return (await run('폴더 만들기', current => createProgramFolder(current, { ...base(current), title, parentId: null }))).ok; }
    finally { classificationRequest.current = false; setClassificationCreating(false); }
  };
  const folderListView = (current: string | null) => folderTree && <ProgramFolderList tree={folderTree} current={current} lastOpened={lastFolder}
    disabled={preparingDocumentAction || classificationCreating} onOpen={id => void openFolderScreen(id)} onCreate={folderCreate} />;
  // [할 일] (A2): 지난 · 오늘 · 앞으로 · 날짜 미정, the finished ones folded; a row as 오늘's (check, ⋯ with 미루기).
  const folderGroups = folderScreen && folderScreen.tab === 'tasks' && period === 'all' ? programFolderTaskGroups(executionRows, today,
    entry => entry.kind === 'text-task' ? !isOpenTask(entry.task) : entry.row.completion === 'completed') : null;
  // The document most of the folder's tasks are written in goes unnamed on its rows (A2 ③: '늘 쓰는 글').
  const folderMainDocument = (() => {
    if (!folderGroups) return null;
    const counts = new Map<string, number>();
    for (const entry of executionRows) if (entry.kind === 'text-task') counts.set(entry.task.docId, (counts.get(entry.task.docId) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  })();
  // F4-b (A5): '＋ 오늘 할 일' ends 오늘 (a folder with open tasks but none today still gets 오늘, for it); '모든 할 일' has none.
  const folderTodayAdd = folderScreen && folderId && <ProgramFolderTodayAdd open={folderTodayOpen} warn={folderTodayWarn} disabled={preparingDocumentAction}
    place={folderTodayOpen ? programFolderTodayPlace(space, folderId, today).label : ''}
    onOpen={() => { setFolderTodayWarn(null); setFolderTodayOpen(true); }} onAdd={addFolderToday} onClose={() => { setFolderTodayOpen(false); setFolderTodayWarn(null); }} />;
  const folderShownGroups = !folderGroups ? [] : folderTodayAdd && folderGroups.open && !folderGroups.groups.some(group => group.key === 'today')
    ? [...folderGroups.groups.filter(group => group.key === 'late'), { key: 'today' as const, rows: [] }, ...folderGroups.groups.filter(group => group.key !== 'late')]
    : folderGroups.groups;
  // Today visual A (T1): "오늘" and its date in two parts (one line on a 390 phone); a week likewise.
  const titleParts = programPeriodTitleParts(period, date, today);
  const periodTitle = <h1>{titleParts ? <><span className={styles.titleMain}>{titleParts.main}</span><span className={styles.titleSub}>{titleParts.sub}{period === 'week' && folder ? ` · ${folder.title}` : ''}</span></>
    : period === 'all' ? (collectionMode ? '전체 할 일' : folder ? folder.title : '폴더')
    : `${period === 'month' ? programMonthTitle(date, today) : periods.find(([key]) => key === period)?.[1]}${folder ? ` · ${folder.title}` : ''}`}</h1>;
  // T3: the date chip's count, today's rows still open (what the list shows; presentation only).
  const openOnDate = executionList.filter(item => item.kind === 'row' && item.group === 'on-date'
    && (item.entry.kind === 'text-task' ? !item.entry.task.done : item.entry.row.completion !== 'completed')).length;
  const openDatePicker = () => {
    const input = document.getElementById('program-query-date') as HTMLInputElement | null;
    if (!input) return;
    try { input.showPicker(); } catch { input.focus(); }
  };
  // F6-B2 (목업 B, 하루 보기만): the day head on navy — month and weekday, the day's number big, 오늘/어제/내일, and that day's
  // 남은 일 · 끝낸 일 · Flow n (open rows from a Flow). Week and month keep their title rows.
  const [heroMonth, heroDate] = [Number(date.slice(5, 7)), Number(date.slice(8, 10))];
  const heroWeekday = '일월화수목금토'[new Date(`${date}T00:00:00Z`).getUTCDay()];
  const heroRelative = date === today ? '오늘' : date === programShiftDate(today, -1) ? '어제' : date === programShiftDate(today, 1) ? '내일' : '';
  const onDateRows = executionList.filter(item => item.kind === 'row' && item.group === 'on-date');
  const doneOnDate = onDateRows.length - openOnDate;
  const flowOnDate = onDateRows.filter(item => item.kind === 'row' && item.entry.kind === 'text-task' && !item.entry.task.done && flowDocuments.has(item.entry.task.docId)).length;
  const dayHero = <h1 className={styles.heroTitle}><span className={styles.heroSr}>{titleParts ? `${titleParts.main} ${titleParts.sub}` : date}</span>
    <span className={styles.heroMonth} aria-hidden="true">{heroMonth}월 · {heroWeekday}요일</span>
    <span className={styles.heroDay} aria-hidden="true">{heroDate}{heroRelative && <small>{heroRelative}</small>}</span></h1>;
  const heroStats = <p className={styles.heroStats} data-day-stats><span>남은 일 {openOnDate}</span><span aria-hidden="true">·</span><span>끝낸 일 {doneOnDate}</span>
    {flowOnDate > 0 && <span className={styles.heroFlow}><ProgramFlowMark size={18} />Flow {flowOnDate}</span>}</p>;
  // C5: in the month, the title row ends with [목록|달력] (each 52×44), remembered on this device.
  const monthTitleRow = <div className={styles.monthTitleRow}>{periodTitle}<div className={styles.monthViews} role="group" aria-label="월간 보기 방식">
    <button type="button" aria-pressed={monthView === 'list'} onClick={() => { if (!keepWrittenDay()) { setAddingDate(null); setMonthView('list'); } }}>목록</button>
    <button type="button" aria-pressed={monthView === 'grid'} onClick={() => { if (!keepWrittenDay()) { setAddingDate(null); setMonthView('grid'); } }}>달력</button></div></div>;
  // C6a: in 고르기 the title row is "n개 선택 · 취소" (0: what to do), the count spoken as it changes.
  const selectTitle = selecting && <div className={styles.selectTitle}><span role="status">{selecting.keys.size ? `${selecting.keys.size}개 선택` : '옮길 할 일을 누르세요'}</span>
    <button type="button" onClick={() => stopSelecting()}>취소</button></div>;

  const guardOccurrenceDraft = (event: React.SyntheticEvent) => {
    const pending = Object.entries(recurrencePorts.current).filter(([, port]) => port?.hasPendingInput?.());
    const editor = (event.target as HTMLElement).closest('[data-recurrence-editor]')?.getAttribute('data-recurrence-editor');
    if (pending.length && !pending.some(([key]) => key === editor)) {
      event.preventDefault(); event.stopPropagation(); setMessage('회차 날짜를 적용하거나 취소한 뒤 이동해 주세요.');
    }
  };
  /** One item of the period list: a day heading (with its ＋ line), the empty days line, or a row. C5's day sheet
   *  and panel draw their rows with it too. */
  /** A day heading's own controls (I7's '시간순으로', the day's ＋), for the list and for C5's sheet and panel. */
  function dayHeadingControls(item: Extract<ProgramExecutionListItem, { kind: 'heading' }>) {
    return <>{item.orderDate && !moving && <><span className={styles.manualOrder}>직접 정렬</span><button type="button" className={styles.timeOrder}
        aria-label={`${orderDayName(item.orderDate)} 순서를 시간순으로 되돌리기`} disabled={orderPending} onClick={() => void resetDayOrder(item.orderDate!)}>시간순으로</button></>}
      {item.addDate && !collectionMode && <button type="button" className={styles.dayAdd} data-add-date={item.addDate} aria-label={`${programCalendarDate(item.addDate, today)}에 할 일 추가`}
        aria-expanded={addingDate === item.addDate} disabled={preparingDocumentAction} onClick={() => openGroupAdd(item.addDate!)}><ProgramIcon name="plus" size={20} /></button>}</>;
  }
  /** The day's ＋ line (C2), under its heading. */
  function dayAddRow(item: Extract<ProgramExecutionListItem, { kind: 'heading' }>) {
    return addingDate === item.addDate && item.addDate && <ProgramGroupAddRow key={`${actorId}:${item.addDate}`} date={item.addDate} dayLabel={programCalendarDate(item.addDate, today)} inputRef={groupAddField}
      onAdd={(title, time) => addOnDay(item.addDate!, title, time)} onClose={() => closeGroupAdd(item.addDate!)} />;
  }
  /** F4-a (A2 ③④): a folder row's one line — its day (지난 in the late colour; 앞으로; 끝낸 일), time, '/ 하위' (on 모든
   *  할 일, its folder), and its document unless it is the folder's main one. */
  function folderRowMeta(task: TextTask, group: ProgramFolderTaskGroupKey | 'done') {
    const parts: React.ReactNode[] = [];
    if (completingTaskIds.has(task.id)) parts.push(<span className={styles.rowBusy}>{isOpenTask(task) ? '완료 대기 중' : '다시 열기 대기 중'}</span>);
    if (task.date && group === 'late') parts.push(<em className={styles.rowLate}>{programCalendarDate(task.date, today)}</em>);
    else if (task.date && (group === 'later' || group === 'done')) parts.push(programCalendarDate(task.date, today));
    if (task.time) parts.push(task.time);
    const own = programTaskFolderId(space, task);
    if (!folderId || own !== folderId) parts.push(<span className={styles.rowFolder}>/ {folderTitleOf(own)}</span>);
    if (task.docId !== folderMainDocument) parts.push(task.docTitle);
    return parts.map((part, index) => <React.Fragment key={index}>{index ? ' · ' : ''}{part}</React.Fragment>);
  }
  function renderListItem(item: ProgramExecutionListItem, folderMeta?: ProgramFolderTaskGroupKey | 'done'): React.ReactNode {
          if (selecting && item.kind === 'row') return renderSelectRow(item);
          if (item.kind === 'heading') return <React.Fragment key={item.key}>
            {/* T9: 오늘·어제·내일 and the date beside it, as in writing; the heading's spoken name stays the label. */}
            {!hideDayHeadings && <li className={styles.dayHeading} data-late={item.late || undefined} data-day-heading={item.addDate ?? undefined}><h2 className={styles.executionGroup} aria-label={item.addDate ? item.label : undefined}>
              {item.addDate ? (heading => <><span className={styles.dayMain} data-relative={heading.relative ?? undefined}>{heading.main}</span>{heading.sub && <span className={styles.daySub}>{heading.sub}</span>}</>)(programDayHeadingParts(item.addDate, today)) : item.label}</h2>
              {selecting ? selectDayButton(item) : dayHeadingControls(item)}</li>}
            {!selecting && dayAddRow(item)}
          </React.Fragment>;
          if (item.kind === 'empty-days') return <li key="empty-days" className={styles.emptyDays}><button type="button" aria-expanded={item.open} onClick={() => {
            // Folding would unmount a line being written on an empty day; keep it open and go back to it.
            if (item.open && addingDate && item.dates.includes(addingDate)) {
              if (groupAddField.current?.value.trim()) { groupAddField.current.focus(); return; }
              setAddingDate(null);
            }
            setEmptyDaysOpen(open => !open);
          }}>
            할 일 없는 날 {item.dates.length}일 · {item.open ? '접기' : '펼치기'}</button></li>;
          const entry = item.entry;
          if (entry.kind === 'occurrence') return <li key={entry.key} data-execution-key={entry.key} onKeyDown={event => { if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); moveExecutionStep(entry.key, event.key === 'ArrowUp' ? -1 : 1); } }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const from = event.dataTransfer.getData('text/plain'); if (from && (moving === from || nativeDrag.current === from)) void moveBefore(from, entry.key); nativeDrag.current = null; }}>
            {period === 'today' && entry.row.executionDate && entry.row.executionDate < date && <small>계속할 회차</small>}
            <div className={styles.actions}><button onClick={() => moveExecutionStep(entry.key, -1)}>같은 날짜에서 위로</button><button onClick={() => moveExecutionStep(entry.key, 1)}>같은 날짜에서 아래로</button>{moving && <button onClick={() => void moveBefore(moving, entry.key)}>이 회차 앞에 놓기</button>}</div>
            <ProgramRecurrence data={data} mutate={mutate} today={today} period={period} date={date} row={entry.row} onPlanApplied={focusAppliedPlan} onRegisterEditors={port => { recurrencePorts.current[entry.row.key] = port; }}
            onOpenSource={(id, line) => openOccurrenceSource(id, line, entry.key)} onShowPeriod={(nextPeriod, nextDate) => { setDate(nextDate); setPeriod(nextPeriod); }} onUndo={onUndo} onRedo={onRedo} /></li>;
          const task = entry.task;
          const origin = readProgramTaskOrigin(data, task);
          // UX C5 (11/6): the row is read as it shows: a repeat line by its title and chip, 직접 작성 not said (as on screen).
          const repeatRow = programRepeatLine(space, task.id, textTasks), repeatShown = repeatRow && (!repeatRow.block || repeatRow.block === 'done') ? repeatRow : null;
          const { latest: progress, current } = taskProgress(task.id), value = current ?? (task.done ? 100 : 0);
          const meta = programExecutionRowMeta({ date: task.date, done: value === 100, progress: progress?.date ? { date: progress.date, percent: progress.percent } : null, today, dated: item.dated,
            since: continuationStarts.get(task.id) ?? null });
          return <li key={entry.key} className={styles.task} data-task-id={task.id} data-done={value === 100 || undefined} data-close-row={closing() && item.kind === 'row' && value < 100 && !moving ? '' : undefined} data-flow-row={rowFlowTitle(task) ? '' : undefined} draggable onDragStart={event => { event.dataTransfer.setData('text/plain', entry.key); nativeDrag.current = entry.key; }} onDragEnd={() => { nativeDrag.current = null; setMoving(null); }}
            onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const from = event.dataTransfer.getData('text/plain'); if (from && (moving === from || nativeDrag.current === from)) void moveBefore(from, entry.key); nativeDrag.current = null; }}
            onKeyDown={event => { if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); moveStep(task, event.key === 'ArrowUp' ? -1 : 1); } }}>
            <button className={value > 0 && value < 100 ? `${styles.check} ${styles.partialProgress}` : styles.check} aria-label={`${task.title} ${completingTaskIds.has(task.id) ? (value === 100 ? '다시 열기 대기 중' : '완료 대기 중') : value > 0 && value < 100 ? `${value}% · 진행 기록 열기` : value === 100 ? '다시 열기' : '완료'}`} aria-pressed={value > 0 && value < 100 ? undefined : value === 100} aria-busy={completingTaskIds.has(task.id) || undefined} onClick={() => { const same = sameGroups?.members.get(task.id); if (same && value === 0) void checkSameTasks(same); else void checkTaskFromList(task); }}><span aria-hidden="true" className={styles.checkMark} data-check={completingTaskIds.has(task.id) ? 'busy' : value > 0 && value < 100 ? 'partial' : value === 100 ? 'done' : 'open'}>
              {completingTaskIds.has(task.id) ? '' : value > 0 && value < 100 ? `${value}%` : ''}</span></button>
            <button className={styles.taskTitle} aria-label={`${repeatShown ? `${programRepeatTitle(task.title)} · ${repeatShown.block ? '반복 멈춤' : `반복 ${repeatShown.marker.label}`}` : task.title}${origin.label !== '직접 작성' ? ` · ${origin.label}` : ''} · ${task.docTitle} 원문 열기`} aria-busy={sourceWaitingTask === task.id || undefined} onClick={event => moving ? void moveBefore(moving, entry.key) : openFromList(task, event.currentTarget)}>{(line => line ? <span className={styles.taskTitleText}>{programRepeatTitle(task.title)}<span className={styles.repeatChip}>{line.block ? '반복 멈춤' : programRepeatText(`↻ ${line.marker.label}`, 13)}</span></span>
              : <span className={styles.taskTitleText}>{task.title}</span>)(repeatShown)}
              {/* R4's waits, now visible on the row. The title's aria-busy and the host notice still do the announcing. */}
              <small>{sourceWaitingTask === task.id ? <span className={styles.rowBusy}>원문 여는 중…</span> : folderMeta ? folderRowMeta(task, folderMeta) : <>
                {/* T6: the row's folder first, small, as "/ 회사 일" (none for 미분류 or no folder); rows stay in their order. */}
                {/* F6-B2: a Flow's row says its name in teal, its 실 and n/m (done of all its tasks). */}
                {(flow => flow ? <><span className={styles.rowFlow} data-row-flow>{flow}</span>{(thread => thread && <span className={styles.rowThread}><ProgramFlowThread points={thread.points} done={thread.done} width={48} maxWidth={72} />{thread.doneTasks}/{thread.total}</span>)(flowThreads.get(task.docId))} · </>
                  : (scope => scope && <><span className={styles.rowFolder}>/ {scope}</span> · </>)(rowFolderTitle(task)))(rowFlowTitle(task))}
                {completingTaskIds.has(task.id) &&<><span className={styles.rowBusy}>{value === 100 ? '다시 열기 대기 중' : '완료 대기 중'}</span> · </>}
                {meta.late && <><em className={styles.rowLate}>{meta.late}</em> · </>}
                {/* Redesign 2 (W-TXT-02): its '- 마감:' as D-n; past, shown apart. */}
                {(due => due && <><span className={due.state === 'over' ? styles.rowLate : undefined} data-row-due={due.state}>{due.label}</span> · </>)(programDueLabel(task.due, today))}
                {[...meta.parts, ...(task.time ? [task.time] : []), ...(carryPlaces.has(task.id) ? [`${carryPlaces.get(task.id)!.place || '분류 없음'} · 분류 ${carryPlaces.get(task.id)!.count}곳`] : [])]
                  .map((part, index) => <React.Fragment key={index}>{part} · </React.Fragment>)}
                <span className={styles.taskOrigin}>{origin.label !== '직접 작성' && `${origin.label} · `}<span className={styles.taskFolder}>{taskFolderPath(task)} / </span>{task.docTitle} →</span>
              </>}</small></button>
            {/* F12 1차 (W-FLOW-08·11): the day close's action on an open row — [건너뛰기] for a repeat line's round, [내일]
                for the rest (a long press opens the date sheet); a series' occurrence keeps its own controls. */}
            {closing() && item.kind === 'row' && value < 100 && !moving && (readProgramRepeatMarker(task.title) && !repeatRow?.block
              ? <button type="button" className={styles.closeAction} data-close-action="skip" aria-label={`${programRepeatTitle(task.title)} 이번 회차 건너뛰기`} onClick={() => skipRepeatRound(task)}>건너뛰기</button>
              : !programTaskRepeatMember(space, task.id) && (programTaskHasEveningRecord(space.text, task)
                // W-CARRY-16 (총괄 11/12): a task with a record ([n%], a progress record, a checked subtask) is not moved in the
                // evening; it is continued tomorrow morning (밀린 일's 이어 쓰기).
                ? <span className={styles.closeNote} data-close-action="continue">내일 아침 이어 쓰기</span>
                : <button type="button" className={styles.closeAction} data-close-action="tomorrow" aria-label={`${task.title} 내일로`}
                onClick={() => { if (closeHold.current?.fired) { closeHold.current = null; return; } deferTask(task, programShiftDate(today, 1)); }}
                onPointerDown={() => closeHoldStart(task)} onPointerUp={closeHoldCancel} onPointerLeave={closeHoldCancel} onPointerCancel={closeHoldCancel}
                onContextMenu={event => event.preventDefault()}>내일</button>))}
            <button aria-label={`${task.title} 작업`} onClick={event => { if (suppressPointerClick.current === task.id && event.detail !== 0) { suppressPointerClick.current = null; return; } setRecordDate(today); setPercent(String(value)); openDetail({ kind: 'task', id: task.id }); }}
              onPointerDown={event => { suppressPointerClick.current = null; if (event.pointerType !== 'touch') return; cancelHold(); holdPoint.current = { x: event.clientX, y: event.clientY }; hold.current = setTimeout(() => { setMoving(entry.key); suppressPointerClick.current = task.id; hold.current = null; }, PROGRAM_MOVE_GESTURE_V1.holdMs); }}
              onPointerUp={cancelHold} onPointerCancel={() => { cancelHold(); suppressPointerClick.current = task.id; setMoving(null); }} onPointerMove={event => { if (holdPoint.current && Math.hypot(event.clientX - holdPoint.current.x, event.clientY - holdPoint.current.y) >= PROGRAM_MOVE_GESTURE_V1.cancelDistancePx) { cancelHold(); suppressPointerClick.current = task.id; } }}><ProgramIcon name="more" size={20} /></button>
            {(same => same && <button type="button" className={styles.sameChip} data-same-chip aria-haspopup="dialog" onClick={() => setSameSheet(task.id)}><span>같은 일 {same.length}줄</span></button>)(sameGroups?.members.get(task.id))}
          </li>;
  }
  // F8 1단계 (CO-1): the band's rows — open ones in its order (Flow, moved, progress, repeat), and those checked here kept
  // (faded) where they were.
  const bandRows: ProgramFlowBandRow[] = (() => {
    if (!bandDocumentId) return [];
    const list = continueBand.rows.filter(row => !bandChecked.has(row.task.id)).map(row => ({ row, done: false }));
    for (const [, kept] of [...bandChecked].sort((a, b) => a[1].index - b[1].index)) list.splice(Math.min(kept.index, list.length), 0, { row: kept.row, done: true });
    return list.map(({ row, done }) => ({ id: row.task.id, title: row.repeat ? programRepeatTitle(row.task.title) : row.task.title, kind: row.kind,
      meta: row.kind === 'flow' ? [] : programContinueMeta(row.task, bandDocumentId, rowFolderTitle(row.task), row.kind), flowTitle: row.flowTitle,
      flowDocumentId: row.kind === 'flow' ? row.task.docId : null, percent: row.percent, done, busy: completingTaskIds.has(row.task.id) || bandUndoing.has(row.task.id), repeat: row.repeat,
      undo: done && !!bandChecked.get(row.task.id)?.repeatCheck }));
  })();
  function checkFromBand(id: string) {
    const kept = bandChecked.get(id), index = bandRows.findIndex(row => row.id === id), shown = continueBand.rows.find(row => row.task.id === id) ?? kept?.row;
    // typelag (11/11): the text's tasks read once per text (textTasks), not again here.
    const live = textTasks.find(task => task.id === id) ?? kept?.row.task;
    if (!live || !shown || index < 0) return;
    setBandFailed(null);
    // int9 r2 (기타 int9 QA P3): the band shows no notice, so a repeat round finished here is undone by the same box, once:
    // its round comes back (never the next round finished by a second press).
    if (kept?.repeatCheck) { void undoBandRepeat(id, kept.repeatCheck); return; }
    let repeatCheck: ProgramRepeatCheck | null = null;
    void checkTaskFromList(live, 'band', check => { repeatCheck = check; }).then(outcome => {
      if (outcome === 'failed') { setBandFailed(id); return; }
      if (outcome === 'saved') setBandChecked(current => { const next = new Map(current); if (kept) next.delete(id); else next.set(id, { row: { ...shown, task: live }, index, repeatCheck }); return next; });
      const check = repeatCheck as ProgramRepeatCheck | null;
      if (outcome === 'saved' && check && bandDocumentId) setBandRepeatNotice({ actorId, documentId: bandDocumentId, taskId: id, text: repeatNextText(live.title, check), check });
    });
  }
  async function undoBandRepeat(id: string, check: ProgramRepeatCheck) {
    // The box is busy while the round comes back, so a second press cannot ask for it twice.
    if (bandUndoing.has(id)) return;
    setBandUndoing(current => new Set(current).add(id));
    const done = await undoRepeatRound(check).finally(() => setBandUndoing(current => { const next = new Set(current); next.delete(id); return next; }));
    if (!done) { setBandFailed(id); setBandRepeatNotice(current => current && current.taskId === id ? { ...current, text: PROGRAM_REPEAT_UNDO_REFUSED, check: null } : current); return; }
    setBandChecked(current => { const next = new Map(current); next.delete(id); return next; });
    setBandRepeatNotice(current => current && current.taskId === id ? null : current);
  }
  // The row's words: its original line (that document opened there; a folded section opens for this visit).
  function showBandSource(id: string) {
    const task = textTasks.find(row => row.id === id) ?? bandChecked.get(id)?.row.task;
    if (task) void openDocument(task.docId, task.id);
  }
  // F12 1차: a progress line's box checks its step with the list's own check (one save, its [되돌리기], W-FLOW-05).
  function checkRunStep(_run: ProgramFlowRun, taskId: string) {
    const task = textTasks.find(entry => entry.id === taskId);
    if (task) void checkTaskFromList(task);
  }
  function openRun(run: ProgramFlowRun) { void openDocument(run.documentId, run.wait?.taskId ?? run.next?.taskId); }
  const flowBusyWhile = async (id: string, work: () => Promise<unknown>) => {
    if (flowBusy.has(id)) return;
    setFlowBusy(current => new Set(current).add(id));
    try { await work(); } finally { setFlowBusy(current => { const next = new Set(current); next.delete(id); return next; }); }
  };
  // W-FLOW-07·08: '다시 확인할 일' — its box checks the subcheck; [내일] moves only its day to look again.
  // 기타 F12 1차 QA P3 (11/12): both actions offer [되돌리기] (오늘 has no ↶): the box's by checking it open again, [내일]'s by
  // the saved schedule's own undo (the exact state before, an inherited day back to inherited).
  function checkRecheck(row: ProgramRecheck) {
    void flowBusyWhile(row.taskId, async () => {
      let proof = null as ProgramSameTaskProof | null;
      const result = await run('완료', current => { const next = completeProgramTask(current, { ...base(current), taskId: row.taskId, date: today, done: true });
        if (next.ok) proof = programSameTaskProof(current.spaces[actorId].text, next.data.spaces[actorId].text, [row.taskId], today); return next; }, true);
      const exact = proof;
      if (result.ok) setFlowNotice({ text: `${row.title} · 완료했습니다`, undo: async () => {
        // Later, from the notice: the space it expects is the one saved then (base() holds this render's). W-CARRY-10: the
        // line and its record of today back exactly (the check's record goes; no 0% left).
        const back = await run('완료 되돌리기', current => exact ? undoProgramSameTasks(current, { actorId, requestId: programId('request'), expectedSpace: current.spaces[actorId], proof: exact })
          : completeProgramTask(current, { ...base(current), expectedSpace: current.spaces[actorId], taskId: row.taskId, date: today, done: false }), true);
        return back.ok;
      } });
    });
  }
  function recheckTomorrow(row: ProgramRecheck) {
    const tomorrow = programShiftDate(today, 1);
    void flowBusyWhile(row.taskId, async () => {
      if (locationAvailability().blocked) { setMessage('저장을 확인한 뒤 옮겨 주세요.'); return; }
      // Its [되돌리기] puts the text back exactly as it was (a day it inherited is inherited again), only while nothing changed since.
      let before: TextWorkspaceState | null = null, after: TextWorkspaceState | null = null;
      // W-TXT-09: a '답 확인:' line moves to tomorrow's section (its '- 기다림:' goes with it); a subcheck changes its day.
      const result = await run('다시 볼 날 바꾸기', current => { const next = row.kind === 'line'
        ? moveProgramTaskLocation(current, { ...base(current), taskId: row.taskId, documentId: row.docId, target: { kind: 'date', date: tomorrow } })
        : updateProgramTask(current, { ...base(current), taskId: row.taskId, patch: { date: tomorrow } });
        if (next.ok) { before = current.spaces[actorId].text; after = next.data.spaces[actorId].text; } return next; }, true);
      if (!result.ok || !before || !after) return;
      const was: TextWorkspaceState = before, now: TextWorkspaceState = after;
      setFlowNotice({ text: `${row.title} · 다시 볼 날을 ${programCalendarDate(tomorrow, today, false)}로 바꿨습니다`, undo: async () =>
        (await run('다시 볼 날 되돌리기', current => undoProgramTaskLocation(current, { actorId, documentId: row.docId, before: was, after: now }), true)).ok });
    });
  }
  // W-FLOW-07 · W-TXT-09: 답 기다리기 — '- [ ] 답 확인: <제목>' with '- 기다림: 오늘' in the section of the day to look again,
  // one save; its notice's [되돌리기] gives the text back exactly, only while nothing changed since.
  function startWait(task: TextTask, recheck: string) {
    void flowBusyWhile(task.id, async () => {
      let before: TextWorkspaceState | null = null, after: TextWorkspaceState | null = null;
      const result = await run('답 기다리기', current => { const next = startProgramWait(current, { ...base(current), taskId: task.id, date: recheck, today });
        if (next.ok) { before = current.spaces[actorId].text; after = next.data.spaces[actorId].text; } return next; }, true);
      if (!result.ok || !before || !after) { if (!result.ok && result.reason === 'conflict') setMessage('이 일의 답 확인 줄이 이미 있습니다.'); return; }
      const was: TextWorkspaceState = before, now: TextWorkspaceState = after;
      close();
      setFlowNotice({ text: `${task.title} · ${programCalendarDate(recheck, today, false)}에 답 확인 줄을 적었습니다`, undo: async () =>
        (await run('답 기다리기 되돌리기', current => undoProgramTaskLocation(current, { actorId, documentId: task.docId, before: was, after: now }), true)).ok });
    });
  }
  async function undoFlowNotice() {
    const notice = flowNotice;
    if (!notice?.undo || notice.busy) return;
    setFlowNotice({ ...notice, busy: true });
    const done = await notice.undo();
    setFlowNotice(done ? null : { text: '그 뒤 다른 변경이 있어 되돌리지 않았습니다', busy: false });
  }
  // W-FLOW-08·11: the evening's [내일] (a Flow step through the defer plan, my own task to tomorrow's section, W-MENU-07)
  // and [건너뛰기] (a repeat line's round: its day goes to the next round, nothing kept in its log).
  // The run a task is a step of, read now from the saved data (any view: the writing view has no progress lines).
  const runOfTaskNow = (taskId: string) => programFlowRuns(dataRef.current, actorId, today).find(entry => entry.steps.some(step => step.taskId === taskId)) ?? null;
  // Today's own 오늘 with nothing narrowing it: the progress lines and rechecks show; from 18:00 (assumed) the day close.
  const todayHere = () => period === 'today' && date === today && !folderTab && !selecting && !monthGrid && !folderId && !query;
  const closing = () => todayHere() && closeHour >= PROGRAM_DAY_CLOSE_HOUR;
  /** A finished row of 오늘's list (its check, or a 100% record), folded away in the day close. */
  const closeDoneRow = (item: ProgramExecutionListItem) => item.kind === 'row' && item.entry.kind !== 'occurrence'
    && (taskProgress(item.entry.task.id).current ?? (item.entry.task.done ? 100 : 0)) === 100;
  // A Flow step goes through its plan inside moveTaskHere; my own task to tomorrow's section (W-MENU-07).
  function deferTask(task: TextTask, nextDate: string) { void moveTaskHere(task.id, { kind: 'date', date: nextDate }); }
  function skipRepeatRound(task: TextTask) {
    const marker = readProgramRepeatMarker(task.title);
    if (!marker) return;
    const next = programRepeatNextDate(marker.rule, task.date, today);
    if (next && next !== task.date) void moveTaskHere(task.id, { kind: 'date', date: next });
  }
  function deferFlowStep(owner: ProgramFlowRun, taskId: string, nextDate: string, chosen?: ProgramDeferMode, time?: string) {
    const plans = { overlap: programDeferPlan(owner, taskId, nextDate, 'overlap'), 'keep-gaps': programDeferPlan(owner, taskId, nextDate, 'keep-gaps'), none: programDeferPlan(owner, taskId, nextDate, 'none') };
    // Not past the next step: only this step moves (the same day as the next one is not past it).
    const mode = !plans.overlap.ask ? 'none' : chosen ?? readProgramDeferChoice(owner.key);
    if (!mode) { setDeferAsk({ run: owner, taskId, date: nextDate, plans, time }); return; }
    void applyDeferPlan(owner, plans[mode], time);
  }
  async function applyDeferPlan(owner: ProgramFlowRun, plan: ProgramDeferPlan, time?: string) {
    // W-FLOW-10: nothing lands after a last-day run's anchor; such a plan moves nothing and says why.
    if (plan.blocked) { setMessage(`${plan.blocked.title}이(가) 기준일 ${programCalendarDate(owner.anchor!, today, false)} 뒤로 가서 옮기지 않았습니다. 기준일을 바꾸려면 Flow 글의 기준일 바꾸기를 쓰세요.`); return; }
    if (plan.moves.length === 1) { void moveTaskHere(plan.moves[0].taskId, { kind: 'date', date: plan.moves[0].to, ...(time !== undefined ? { time } : {}) }, undefined, true); return; }
    if (detail) close();
    if (datesBusy.current) return;
    const current = dataRef.current.spaces[actorId], tasks = M.tasks(current.text);
    const moves: ProgramTaskDateMove[] = plan.moves.flatMap(move => { const task = tasks.find(entry => entry.id === move.taskId);
      return task ? [{ taskId: move.taskId, expected: { date: task.date, time: task.time ?? '', state: programTaskDateState(current, move.taskId) ?? undefined }, date: move.to }] : []; });
    if (moves.length !== plan.moves.length) { setMessage('그사이 바뀐 할 일이 있어 옮기지 않았습니다. 다시 확인해 주세요.'); return; }
    // Codex f12a review P2-2 (11/12): a time picked with the asked step's date goes into the same save and 되돌리기. A copy's
    // steps go to the server, whose command has no time: then nothing moves and it says so.
    const social = programTaskDateMovesSocial(space, moves), asked = moves[0];
    const timeChange = time !== undefined && time !== asked.expected.time ? { taskId: asked.taskId, time } : undefined;
    if (social && timeChange) { setMessage('사본의 단계 여러 개를 함께 옮길 때는 시간을 같이 바꿀 수 없습니다. 날짜를 옮긴 뒤 시간을 바꿔 주세요.'); return; }
    const requestId = programId('dates');
    let undo: ProgramTaskDateMove[] = [], undoLines: ProgramTaskDateLines[] | null = null;
    datesBusy.current = true; setDatesPending(true);
    try {
      const result = await countedMutate('Flow 단계 함께 옮기기', state => { const next = moveProgramTaskDates(state, { actorId, requestId, moves, ...(timeChange ? { time: timeChange } : {}) });
        if (next.ok) { undo = programTaskDateUndo(state.spaces[actorId], next.data.spaces[actorId], moves); undoLines = social ? null : programTaskDateUndoLines(state.spaces[actorId], next.data.spaces[actorId], undo); } return next; },
        { history: true, awaitAutomaticRead: true, ...(social ? { alphaSocial: { type: 'private-task-dates' as const, moves } } : {}) });
      if (result.ok) {
        setTaskNotice(null); setOrderNotice(null);
        const titles = plan.moves.map(move => move.title), last = plan.moves[plan.moves.length - 1].to;
        setDatesNotice({ actorId, count: moves.length, date: last, undo, lines: undoLines, taskIds: undo.map(move => move.taskId), shownAt: Date.now(),
          text: `${titles[0]} 등 ${titles.length}개를 옮겼습니다 · ${programCalendarDate(last, today, false)}까지` });
      } else if (result.reason === 'conflict') setMessage('그사이 바뀐 할 일이 있어 옮기지 않았습니다. 다시 확인해 주세요.');
      else if (result.reason !== 'busy') setMessage(programErrorMessage(result.reason));
    } finally { datesBusy.current = false; setDatesPending(false); }
  }
  // A long press on [내일] opens the date sheet (W-MENU-24); a last-day Flow's step cannot pick a day after its anchor.
  // The sheet opens under the finger: the tap its lift makes (390 browser check, 11/11) must not pick a day, so a pick in
  // its first moment is ignored.
  const closeHoldStart = (task: TextTask) => { closeHoldCancel(); const hold = { fired: false, timer: setTimeout(() => { hold.fired = true; setCloseSheet({ taskId: task.id, run: runOfTaskNow(task.id), at: Date.now() }); }, PROGRAM_MOVE_GESTURE_V1.holdMs) }; closeHold.current = hold; };
  function closeHoldCancel() { if (closeHold.current) clearTimeout(closeHold.current.timer); }
  // [미루기]: the 오늘 row ⋯'s sheet (its 미루기 chips: 내일 · 이번 주말 · 다음 주 · 날짜 고르기).
  function deferFromBand(id: string) { if (textTasks.some(row => row.id === id)) openDetail({ kind: 'task', id }); }
  // F6-B2: the band draws one Flow's 실 when all its rows come from that Flow.
  const bandThread = (ids => ids.size === 1 && !ids.has('') ? flowThreads.get([...ids][0]) ?? null : null)(new Set(bandRows.map(row => row.flowDocumentId ?? '')));
  const flowBand = (bandRows.length > 0 || carrySummary.count > 0) && <ProgramFlowTodayBand rows={bandRows} open={bandRows.filter(row => !row.done).length} flow={continueBand.flow}
    late={carrySummary.count} failed={bandFailed} thread={bandThread} onCheck={checkFromBand} onShowSource={showBandSource} onDefer={deferFromBand}
    onShowToday={() => { void chooseMainTab('today'); }} />;
  const copyHeader = useMemo(() => selectedDoc ? programCopyHeader(data, actorId, selectedDoc.id) : null, [data, actorId, selectedDoc?.id]);
  // U44: on a tablet held sideways the title and ⋯ go into the open document's tool line, and the notices that sat
  // between them and the tools go under that line, above the body. Only their place changes: the editor keeps its key
  // and mount, so a composition, the caret and ↶ survive crossing the boundary (the tablet turned, the window sized).
  const headInToolbar = tabletLandscape && !!props.hostMainTabs && !!props.noteHeader && !!selectedDoc && opened.includes(selectedDoc.id) && !folderScreen;
  const docTitle = <>{sourceOriginOpen && <button type="button" className={styles.sourceReturn}
    aria-label={sourceOrigin?.view.monthView === 'grid' ? `오늘 · ${programMonthTitle(sourceOrigin.view.date, today)} 달력으로 돌아가기` : `${sourceOriginLabel} 목록으로 돌아가기`} onClick={() => void returnToSourceOrigin()}>← {sourceOriginLabel}</button>}<h1>{props.hostMainTabs && !noDocuments
    ? <button ref={titleToggle} type="button" className={styles.titleButton} aria-haspopup="dialog" aria-expanded={libraryOpen} aria-controls="program-library"
      aria-label={`${documentTitleText} · 문서 목록 열기`} onPointerDown={findPointerDown} onClick={openFindPanel}><span>{documentTitleText}</span><span aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" focusable="false"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span></button>
    : documentTitleText}</h1></>;
  const docActions = <>{props.hostMainTabs ? selectedDocumentTools && <div className={styles.titleActions}>{selectedDocumentTools}</div>
      : (!props.noteHeader || !selectedDoc) && <div className={styles.writingActions}>{period === 'documents' && findActions}{selectedDocumentTools}</div>}</>;
  // The notice's undo ([되돌리기] for an arrival, 이번 가져오기 취소 for a document it went into), while it may be used.
  const importCancel = props.importNotice?.onCancel && <button type="button" disabled={props.importNotice.busy} onClick={props.importNotice.onCancel}>{props.importNotice.busy ? props.importNotice.busyLabel ?? '연결을 빼는 중…' : props.importNotice.actionLabel ?? '이번 가져오기 취소'}</button>;
  const arrivalUndoAfterToast = !!importCancel && props.importNotice?.toast?.open === false && props.importNotice.actorId === actorId && props.importNotice.documentId === selected && !!selectedDoc;
  const docNotices = <>
    {props.noteHeader}
    {props.importNotice?.actorId === actorId && props.importNotice.documentId === selected && props.importNotice.toast?.open !== false && <div className={styles.importNotice}
      data-arrival-toast={props.importNotice.toast ? '' : undefined} {...props.importNotice.toast?.hold}><span role="status">{props.importNotice.text}</span>{importCancel}
      {props.importNotice.calendar && <button type="button" className={styles.importCalendar} data-import-calendar disabled={props.importNotice.busy}
        onClick={() => { const notice = props.importNotice; if (notice?.calendar) void showFlowOnCalendar(notice.documentId, notice.calendar); }}>달력에서 보기</button>}
      {/* Core3 P2c: [되돌리기] [달력에서 보기] [×]. */}
      {props.importNotice.toast && <button type="button" className={styles.importToastClose} data-arrival-close aria-label="알림 닫기" onClick={props.importNotice.toast.onClose}><ProgramIcon name="close" size={20} /></button>}</div>}
    {/* Once the arrival toast closed, its [되돌리기] stays (as long as it could before), on the copy's source line or here. */}
    {arrivalUndoAfterToast && !copyHeader && <p className={styles.importNotice} data-arrival-undo>{importCancel}</p>}
    <p role="status" aria-live="polite" aria-atomic="true" className={styles.writingEntryNotice} data-writing-entry-notice data-quiet={props.noteNoticeShown ? 'true' : undefined}>{writingNotice?.actorId === actorId && writingNotice.documentId === selected ? writingNotice.text : ''}</p>
    {/* 총괄 11/12 ①: an archived original ('전환 전 원문', '되돌리기 전 원문') is restored from here, any time. */}
    {selectedDoc && selectedArchived && (stamp => stamp && <div className={styles.importNotice} data-cleanup-archive={stamp}>
      <span role="status">새 규칙으로 바꾸기 전 원문입니다. 바꾼 직후에만 되돌릴 수 있습니다.</span>
      <button type="button" data-cleanup-restore disabled={cleanupPending || preparingDocumentAction} aria-busy={cleanupPending || undefined} onClick={() => void restoreCleanup(stamp)}>이 원문으로 되돌리기</button></div>)(programCleanupArchiveStamp(space.text, selectedDoc.id))}
    {!selectedDoc && props.noteStatus}
    {!selectedDoc ? selected ? <div className={styles.empty}><p>이 문서가 삭제되었거나 현재 인물의 문서가 아닐 수 있습니다. 다른 문서로 자동 이동하지 않았습니다. 내 문서 목록이나 보관함에서 다시 선택해 주세요.</p><button onClick={() => { setShowArchived(false); setLibraryOpen(true); }}>내 문서 목록</button><button onClick={() => { setShowArchived(true); setLibraryOpen(true); }}>보관함 확인</button></div> : <div className={styles.empty}><p>글과 할 일을 함께 적습니다. 이름과 위치는 나중에 정해도 됩니다.</p>
      {/* A new account starts here with no document; the title row keeps only a document's tools, so the
          first screen needs its own way to start writing. */}
      <button type="button" className={styles.emptyNewWriting} disabled={preparingDocumentAction} onClick={() => void beginWriting()}>새 글 쓰기</button>{props.capabilities?.discovery !== false && <button onClick={() => props.navigate({ view: 'discover' })}>Flow 찾기</button>}
      {/* 첫인상 (11/7): an empty account also sees a few Flows FlowMe put together; a card opens its detail. */}
      {firstFlows.length > 0 && <section className={styles.firstFlows} aria-labelledby="program-first-flows"><h2 id="program-first-flows">FlowMe가 정리한 Flow</h2>
        <p>살펴보고 마음에 들면 내 계획으로 가져올 수 있습니다.</p>
        <ul>{firstFlows.map(({ flowId, lines }) => <li key={flowId}><button type="button" data-first-flow={flowId} onClick={() => props.navigate({ view: 'flow', id: flowId })}>
          <span className={styles.firstFlowTitle}>{lines.title}{lines.badge && <span className={styles.firstFlowBadge}>{lines.badge}</span>}</span>
          <span className={styles.firstFlowSummary}>{lines.summary}</span>
          <span className={styles.firstFlowMeta}>{lines.meta}</span>
        </button></li>)}</ul></section>}</div> : <>
      {selectedTrashed && <ProgramDocumentTrashAction key={selectedDoc.id} space={space} documentId={selectedDoc.id} disabled={preparingDocumentAction} onChange={changeDocumentTrash} />}
      <ProgramDocumentProvenance data={data} documentId={selectedDoc.id} disabled={preparingDocumentAction || selectedTrashed} onOpenRevisions={props.capabilities?.revisionHistory !== false && props.onRevisionHistory ? () => void openDocumentAction(props.onRevisionHistory!) : undefined} onOpenCreatorDraft={props.capabilities?.creatorNavigation !== false ? draftId => void openDocumentAction(() => props.navigate({ view: 'creator', id: draftId })) : undefined} />
      {copyHeader && <div className={styles.copyHeader} data-state={copyHeader.kind}><span>{copyHeader.text}</span>
        {copyHeader.action === 'inspect' && props.onInspectCopy && props.capabilities?.copyInspection !== false && <button type="button" disabled={preparingDocumentAction} onClick={() => void openDocumentAction(() => props.onInspectCopy!(copyHeader.copyId), { modalReturnFocus: true })}>변경 확인</button>}
        {copyHeader.action === 'source' && props.onOpenCopySource && props.capabilities?.discovery !== false && <button type="button" disabled={preparingDocumentAction} onClick={event => { const returnFocus = event.currentTarget; void openDocumentAction(id => props.onOpenCopySource!(copyHeader.flowId, id, returnFocus)); }}>원본 보기</button>}
        {arrivalUndoAfterToast && <span data-arrival-undo>{importCancel}</span>}
      </div>}
      {selectedQualityHold && <p role="status" className={styles.muted}>{selectedQualityHold} 해당 원본 항목과 실행 기록은 읽기 전용으로 남깁니다. 다른 자유 메모는 계속 쓸 수 있습니다.</p>}
      {retentionSource && <p className={styles.muted}>저장본으로 되돌리며 빠진 내용을 보관한 곳입니다. <button onClick={() => void openDocument(retentionSource)}>원래 문서로 돌아가기</button></p>}
      {collectionMode && !retentionSource && !selectedTrashed && <><details className={styles.collectionDisclosure}>
        <summary>모음에 정리 · {collectionMode.state.collections.filter(row => row.documentIds.includes(selectedDoc.id)).map(row => row.title).join(', ') || '연결된 모음 없음'}</summary>
        <fieldset className={styles.collectionMembership}><legend>문서 전체 연결</legend>
        {collectionMode.state.collections.length ? collectionMode.state.collections.map(row => <label key={row.id}><input type="checkbox" checked={row.documentIds.includes(selectedDoc.id)} onChange={event => { void writeCollections(setDocumentCollectionLink(collectionMode.state, row.id, selectedDoc.id, event.target.checked)); }} />{row.title}</label>) : <p>모음 없이도 작성할 수 있습니다. 필요하면 문서 목록에서 모음을 만드세요.</p>}
        <small>이 문서 전체를 연결합니다. 체크를 빼도 원문과 할 일은 남습니다.</small>
      </fieldset></details>
        {selectedCollection && !selectedCollection.documentIds.includes(selectedDoc.id) && <p role="status" className={styles.muted}>이 문서는 선택한 모음에 없습니다. 원문은 그대로 열려 있습니다.</p>}
      </>}
    </>}
  </>;
  return <section ref={root} className={styles.space} data-note-layout={!!props.noteHeader} data-library-open={libraryOpen} aria-label="내 공간"
    onCompositionStartCapture={() => { libraryComposing.current = true; }} onCompositionEndCapture={() => { libraryComposing.current = false; if (findBlocked.current) setTimeout(clearFindBlocked, 0); }}
    onClickCapture={guardOccurrenceDraft} onKeyDownCapture={event => { if (!['Tab', 'Shift', 'Escape'].includes(event.key)) guardOccurrenceDraft(event); }}>
    {cleanupNotice?.actorId === actorId && <div className={styles.orderNotice} data-cleanup-notice>
      <ProgramNoticeRow notice={{ tone: cleanupNotice.refused ? 'warn' : cleanupNotice.undone ? 'info' : 'choose', closeLabel: '알림 닫기',
        text: cleanupNotice.refused ? cleanupNotice.refused : cleanupNotice.undone ? '글을 정리하기 전으로 되돌렸습니다' : `글 ${cleanupNotice.documents}개를 새 규칙으로 정리했습니다 · 원문은 보관함의 '전환 전 원문'에 있습니다`,
        actions: cleanupNotice.undone || cleanupNotice.refused ? [] : [{ label: '되돌리기', run: () => void restoreCleanup(cleanupNotice.stamp) }] }} onClose={() => setCleanupNotice(null)} />
    </div>}
    <dialog ref={cleanupDialog} className={`${styles.findDialog} ${styles.datesSheet} ${styles.dateLinesSheet}`} aria-labelledby="program-cleanup-title" data-cleanup-sheet
      onCancel={event => { event.preventDefault(); setCleanupAsk(null); }}>
      {cleanupAsk && (ask => { const day = (date: string | null) => date ? programCalendarDate(date, today, false) : '날짜 미정';
        return <>
          <h2 id="program-cleanup-title">글을 새 규칙으로 한 번 정리합니다</h2>
          <p className={styles.muted}>할 날은 날짜 제목 하나로 정하고, 진행률은 할 일 줄에 적습니다. 바꾸기 전 원문은 보관함의 '전환 전 원문'에 남고, 바꾼 직후에는 되돌릴 수 있습니다.</p>
          {ask.plan.progress.length > 0 && <><h3 className={styles.dateLinesHead}>진행률 {ask.plan.progressLines}줄 · 할 일 줄에 적습니다</h3>
            <ul className={styles.progressTextList} data-cleanup-progress>{ask.plan.progress.flatMap(doc => doc.changes.map(change => <li key={change.lineId}><span>{change.title}</span>
              <small>{doc.title} · {progressMark(change.before)} → {progressMark(change.after)} · {programCalendarDate(change.date, today, false)} 기록</small></li>))}</ul></>}
          {ask.plan.dates.length > 0 && <><h3 className={styles.dateLinesHead}>날짜 줄 {ask.plan.dateLines}개 · 날짜 제목으로 정리합니다</h3>
            {ask.plan.dates.map(doc => {
              // Codex P1-3: a subtask's line follows its parent's day as chosen (gone when it says that day, else its 마감).
              const outcome = programDateLineOutcomes(space.text, doc, ask.choices);
              const same = doc.items.filter(item => outcome.get(item.ownerId) === 'delete'), kept = doc.items.filter(item => outcome.get(item.ownerId) === 'keep');
              const other = doc.items.filter(item => !same.includes(item) && !kept.includes(item));
              return <section key={doc.documentId} className={styles.cleanupDocument} data-cleanup-document={doc.documentId}>
                <h4>{doc.title}{doc.headless ? ' · 날짜 제목 없는 글' : ''}</h4>
                {same.length > 0 && <p className={styles.dateLinesSame} data-date-lines-same>제목과 같은 날 · 줄만 지웁니다: {same.map(item => `${item.title} (${item.value ? monthDay(item.value) : '날짜 미정'})`).join(' · ')}</p>}
                {kept.length > 0 && <p className={styles.dateLinesSame} data-date-lines-kept>그대로 둡니다: {kept.map(item => `${item.title} (${day(item.value)})`).join(' · ')}</p>}
                {other.length > 0 && <ul className={styles.progressTextList}>{other.map(item => <li key={item.ownerId} data-date-line={item.ownerId}><span>{item.title}</span>
                  <small>{doc.headless ? '날짜 제목 없는 글이라 마감으로' : item.section ? `지금 ${monthDay(item.section)} 아래` : '지금 날짜 제목 없음'} · 날짜 줄 {day(item.value)}{item.subtask && !doc.headless ? ' · 하위 할 일은 마감으로만' : ''}</small>
                  <div className={styles.dateLineChoices} role="group" aria-label={`${item.title} 날짜 줄`}>{(item.choices.length ? item.choices : ['due' as const]).map(choice =>
                    <button type="button" key={choice} aria-pressed={outcome.get(item.ownerId) === choice} data-date-line-choice={choice} onClick={() => chooseDateLine(item.ownerId, choice)}>
                      {choice === 'move' ? item.value ? `${monthDay(item.value)}로 옮기기` : '날짜 미정으로 옮기기' : `마감 ${Number(item.value!.slice(5, 7))}/${Number(item.value!.slice(8, 10))}로`}</button>)}</div></li>)}</ul>}
              </section>; })}</>}
          <div className={styles.dateLinesButtons}>
            <button type="button" className={styles.dateLinesLater} onClick={() => setCleanupAsk(null)}>나중에</button>
            <button type="button" className={styles.dateLinesWrite} data-cleanup-write disabled={cleanupPending} aria-busy={cleanupPending || undefined} onClick={() => void writeCleanup()}>{cleanupPending ? '바꾸는 중…' : '바꾸기'}</button>
          </div>
          <p className={styles.muted}>‘나중에’를 고르면 다음에 앱을 열 때 다시 묻습니다.</p>
        </>; })(cleanupAsk)}
    </dialog>
    <div className={styles.contextActions}>
      <nav ref={viewMenu} className={styles.periods} aria-label="기본 이동" hidden={!!props.hostMainTabs}>{mainPeriods.map(([key, label]) => <button key={key} data-program-period={key} aria-current={mainTab === key ? 'page' : undefined}
        onClick={() => void chooseMainTab(key as ProgramMainTab)}>{key === 'all' && collectionMode ? '전체 할 일' : label}</button>)}</nav>
      {period !== 'documents' && !props.noteHeader && findActions}
    </div>
    <dialog ref={libraryDialog} id="program-library" className={styles.findDialog} aria-labelledby="program-find-title"
      onCancel={event => { event.preventDefault(); if (!libraryComposing.current) { cancelLibraryReveal(); setLibraryOpen(false); } }}>
      <div className={styles.findHeading}><h2 id="program-find-title">{props.hostMainTabs ? '문서' : '글 찾기'}</h2><button type="button" onClick={() => { if (!libraryComposing.current) { cancelLibraryReveal(); setLibraryOpen(false); } }}>닫기</button></div>
      {props.hostMainTabs && <button type="button" className={styles.sheetNewWriting} disabled={preparingDocumentAction} onClick={() => void beginWriting()}>＋ 새 글</button>}
      {props.hostMainTabs && props.capabilities?.discovery !== false && props.onBrowseFlows && <button type="button" className={styles.flowEntry} disabled={preparingDocumentAction} onClick={() => {
        const retained = libraryReturn.current, returnFocus = retained?.area ?? retained?.element ?? titleToggle.current ?? libraryToggle.current ?? undefined;
        // FC7: this document's writing position rides along, so coming back puts caret and scroll where they were.
        const writing = retained?.area && selectedDoc && retained.actorId === actorId && retained.documentId === selectedDoc.id
          ? { documentId: selectedDoc.id, area: retained.area, raw: retained.raw, start: retained.start, end: retained.end, direction: retained.direction,
            top: retained.top, left: retained.left, pageX: retained.pageX, pageY: retained.pageY } : undefined;
        setLibraryOpen(false); void (selectedDoc ? openDocumentAction(id => props.onBrowseFlows!(id, returnFocus, writing)) : props.onBrowseFlows!(undefined, returnFocus));
      }}>준비된 Flow에서 시작 ›</button>}
      {message && <p role="alert" className={styles.error}>{message}</p>}
      {libraryOpen && viewChangeNoticeContent}
      <label className={styles.field}>내 문서·할 일 찾기<input autoFocus id="program-private-search" type="search" value={queryDraft}
        onCompositionStart={() => { queryComposing.current = true; }}
        onCompositionEnd={event => { queryComposing.current = false; setQuery(event.currentTarget.value); setTaskNotice(null); }}
        onChange={event => { setQueryDraft(event.target.value); if (!queryComposing.current && !(event.nativeEvent as InputEvent).isComposing) { setQuery(event.target.value); setTaskNotice(null); } }} /></label>
      {query && <button type="button" onClick={() => setQuery('')}>검색 지우기</button>}
      {period !== 'documents' && <p className={styles.findScope}>현재 {periods.find(([key]) => key === period)?.[1]}{folder ? ` · ${folder.title}` : ''}에서 찾습니다. 닫으면 같은 보기로 돌아갑니다.</p>}
      {period !== 'documents' && query && <section aria-label="현재 보기의 할 일 검색 결과" className={styles.findTasks}>
        <h3>현재 보기의 할 일</h3>
        <ul className={styles.documents}>{executionRows.map(entry => {
          if (entry.kind === 'text-task') return <li key={entry.key}><button onClick={() => void openDocument(entry.task.docId, entry.task.id)}>{entry.task.title}<small>{entry.task.docTitle}</small></button></li>;
          const source = programSeriesMetadata(space).find(item => item.itemRef === entry.row.sourceItemRef);
          return <li key={entry.key}><button disabled={!source} onClick={() => { if (source) void openDocument(source.documentId, source.lineId); }}>{entry.row.title}<small>반복 회차 · {entry.row.executionDate ?? '날짜 미정'}{!source && ' · 원문을 찾을 수 없습니다'}</small></button></li>;
        })}</ul>
        {!executionRows.length && <p className={styles.muted}>현재 보기에는 검색 결과가 없습니다.</p>}
      </section>}
      <details className={styles.folderTools}><summary>이름을 정해 새 문서 만들기</summary><form className={styles.newDoc} onSubmit={newDocument}><label htmlFor="program-document-title">새 문서</label><div><input id="program-document-title" name="title" placeholder="문서 제목" required maxLength={240} /><button type="submit">만들기</button></div></form></details>
      {collectionMode ? <><label className={styles.field}>문서 모음<select aria-label="문서 모음" value={collectionId} onChange={event => { void changeCollection(event.target.value); }}><option value="">모든 문서</option>{collectionMode.state.collections.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label>
        <details className={styles.folderTools}><summary>모음 만들기</summary><form onSubmit={async event => { event.preventDefault(); const form = event.currentTarget, title = String(new FormData(form).get('title') ?? '');
          if (await writeCollections(addDocumentCollection(collectionMode.state, programId('collection'), title))) form.reset();
        }}><label>새 모음 이름<input name="title" required maxLength={100} /></label><button>만들기</button></form></details></> : <>{period === 'documents' && (hasFolders || folderId) && <label className={styles.field}>글 안의 폴더 범위<select value={folderId} onChange={event => { void changeFolder(event.target.value, { fromLibrary: true }); }}><option value="">전체 글</option>{folderOptions.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
      {(hasFolders || folderId) && <details className={styles.folderTools}><summary>폴더 정리</summary><form onSubmit={async event => {
        event.preventDefault(); const form = event.currentTarget, title = String(new FormData(form).get('title') ?? '');
        const result = await run('폴더 만들기', current => createProgramFolder(current, { ...base(current), title, parentId: folderId || null })); if (result.ok) form.reset();
      }}><label>새 폴더 이름<input name="title" required maxLength={100} /></label><button>폴더 만들기</button></form>{folder && folder.id !== 'folder-unfiled' && <button onClick={() => openDetail({ kind: 'folder', id: folder.id })}>{folder.title} 수정·이동</button>}</details>}</>}
      <div className={styles.listHeading}><h2>{showArchived ? '보관한 문서' : '문서'}</h2><button aria-pressed={showArchived} onClick={() => setShowArchived(value => !value)}>{showArchived ? '사용 중 보기' : '보관함'}</button></div>
      <ul className={styles.documents}>{documentList.map(doc => <li key={doc.id}><button aria-current={selected === doc.id && period === 'documents' ? 'page' : undefined} onClick={() => void openDocument(doc.id)}>{doc.title}<small>{(M.raw(doc).split('\n').find(line => line.trim()) ?? '').slice(0, 120)}</small><small>{space.text.flows.some(flow => flow.id === doc.id) ? '개인 Flow' : collectionMode ? '문서' : doc.folder}</small></button></li>)}</ul>
      {!documentList.length && <p className={styles.muted}>{query ? '검색 결과가 없습니다.' : showArchived ? '보관한 문서가 없습니다.' : '아직 글이 없습니다. ＋ 새 글로 시작하세요.'}</p>}
      <ProgramDocumentTrash space={space} actorId={actorId} mutate={countedMutate} disabled={saving || !!props.hostBusy?.()} onOpen={id => void openDocument(id)} />
    </dialog>
    <div className={styles.content}>
      {/* C6a review: hidden while picking (it saves), kept mounted with what it holds. */}
      {props.outputReturn && <div hidden={!!selecting}><ProgramOutputReturn key={`${actorId}:${props.outputReturn.executionKey}`} data={data} destination={props.outputReturn} today={today} mutate={mutate}
        onOpenSource={(id, line) => void openDocument(id, line)} onRegisterEditors={(port, key) => { recurrencePorts.current[key] = port; }} onUndo={onUndo} onRedo={onRedo} /></div>}
      {/* S4 v19: the find notice floats over the head row (it goes once input ends), so the body does not move. */}
      {/* F11 W-HEIGHT-02 (11/11): on 쓰기 with an open document the editor's one notice line says the message instead. */}
      {message && (message === FIND_BLOCKED
        ? <div className={styles.floatingNotice}><p role="alert" className={styles.error}>{message}</p></div>
        : noteLineMessage ? null : <p role="alert" className={styles.error}>{message}</p>)}
      {!libraryOpen && !detail && viewChangeNoticeContent}
      {!detail && !sheetOpen && taskNoticeContent}
      {/* F4-a (F4 1280): on a wide screen the folder list stays beside an open folder. The frame is always here (it is
          display: contents elsewhere), so the editors below never remount when the tab changes. */}
      <div className={styles.folderLayout} data-folder-layout={folderTab && folderScreen ? '' : undefined}>
      {folderTab && folderScreen && <aside className={styles.folderSide} aria-label="폴더"><h2>폴더</h2>{folderListView(folderId)}</aside>}
      <div className={styles.folderMain}>
      <div hidden={period !== 'documents'}>
        {/* F4-a (A3): [글] — the folder's head and tabs over the document shown, its parts of the folder only. */}
        {folderWriting && <>{folderHead}{folderTabs}{props.noteHeader && <div className={styles.periodNotice}>{props.noteHeader}</div>}</>}
        <ProgramRecurrencePlanRecovery data={data} today={today} documentId={selected || undefined} disabled={preparingDocumentAction} onOpenSource={(id, line) => void openDocument(id, line)} />
        {!headInToolbar && !folderWriting && <><div className={styles.docHeading}>{docTitle}{docActions}</div>{docNotices}</>}
        {props.nativeAuthoringEnabled&&selectedDoc&&!selectedTrashed&&!retentionSource&&(props.hostMainTabs
          ? <dialog ref={authoringSheet} className={`${styles.findDialog} ${styles.authoringSheet}`} aria-labelledby="program-authoring-title" onCancel={event => { event.preventDefault(); authoringSheet.current?.close(); }} onClose={() => setAuthoringSheetOpen(false)}>
            <div className={styles.findHeading}><h2 id="program-authoring-title">반복 · Flow</h2><button type="button" onClick={() => authoringSheet.current?.close()}>닫기</button></div>
            <ProgramPersonalAuthoringSheet live={!rowPatch || authoringSheetOpen} key={actorId+selectedDoc.id} data={data} documentId={selectedDoc.id} today={today} disabled={preparingDocumentAction} onCommand={personalAuthoringCommand} onOpenSource={(documentId,taskId)=>{authoringSheet.current?.close();void openDocument(documentId,taskId);}}/>
          </dialog>
          : !folderWriting&&showsPersonalAuthoring(selectedDoc.id)&&<div ref={authoringBox}><ProgramPersonalAuthoring key={actorId+selectedDoc.id} data={data} documentId={selectedDoc.id} today={today} disabled={preparingDocumentAction} onCommand={personalAuthoringCommand} onOpenSource={(documentId,taskId)=>{void openDocument(documentId,taskId);}}/></div>)}
        {opened.filter(id => docs.some(doc => doc.id === id)).map(id => { const recent = recentViewOf(id), recentTop = recentLine(id, recent, false), views = viewSwitch(id);
          const initial = positions.current[id] ?? (space.position.documentId === id ? space.position : undefined);
          return <div key={id} hidden={selected !== id} data-program-document={id}><TextEditor key={recent ? `recent:${recentDoneShown[id] ? 'done' : 'folded'}` : 'whole'}
          authoringMode={!!props.nativeAuthoringEnabled} onOpenPersonalAuthoring={() => requestPersonalAuthoring(id)} onFlowStepDate={(taskId, nextDate, time) => { const owner = runOfTaskNow(taskId); if (!owner) return false; deferFlowStep(owner, taskId, nextDate, undefined, time); return true; }} flowStepAnchor={taskId => (owner => owner?.basis === 'last' ? owner.anchor : null)(runOfTaskNow(taskId))} hostContext={props.pmTextHost}
          repeatLabel={props.hostMainTabs && props.nativeAuthoringEnabled && selected === id ? repeatLabel(id) : undefined}
          onRegisterInputCheckpoint={read => { inputCheckpointReaders.current[id] = read; }}
          onRegisterCaptureComplete={read => { captureReaders.current[id] = read; }}
          onRegisterExternalGuard={read => { externalReaders.current[id] = read; }}
          onRegisterBodyPending={read => { bodyPendingReaders.current[id] = read; }}
          docId={id} workspace={recent ? recent.workspace : space.text} active={selected === id && period === 'documents'} initialPosition={recent && initial ? recentPosition(id, recent, initial, false) : initial}
          recallSource={{ ownerId: actorId, space, today }}
          onTaskRecall={(candidate, line, working) => recallTaskHere(id, candidate, line, working, recent)}
          onTaskRecallHistory={redo => {
            if (!recallNotice || recallNotice.actorId !== actorId || recallNotice.documentId !== id || recallNotice.redo !== redo || dirty.current[id]
              || !programSame(dataRef.current.spaces[actorId].text, redo ? recallNotice.before : recallNotice.after)) return false;
            void stepTaskRecall(redo); return true;
          }}
          taskLocationPolicy={(lineId,shown)=>{
            const wide=recent?recentWide(id,recent,shown,false):{ok:true as const,state:shown},latest=dataRef.current.spaces[actorId];
            return wide.ok?readTaskLocationPolicy({...latest,text:wide.state},lineId,id):{kind:'blocked',taskId:lineId,documentId:null,message:'지난 기록을 펼친 뒤 옮겨 주세요.'};
          }}
          onTaskLocation={recent?async(lineId,target,working)=>{
            const wide=recentWide(id,recent,working,false);
            if(!wide.ok||inputLockCount.current>0||locationAvailability().blocked)return false;
            const release=lockInput();
            try{
              if(!await flushAllEditors()){showViewChangeBlocked();return false;}
              await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
              const owner=dataRef.current.spaces[actorId];
              if(selectedRef.current!==id||presentation.current.period!=='documents'||!programSame(owner.text,wide.state)){
                setMessage('그사이 내용이 바뀌어 옮기지 않았습니다. 원문은 유지했습니다.');return false;
              }
              return await moveTaskHere(lineId,target,owner);
            }finally{release();}
          }:undefined}
          onUndoTaskLocation={locationNotice?.documentId===id?()=>{if(dirty.current[id])return false;void undoTaskLocation(locationNotice);return true;}:undefined}
          onRegisterSectionOrder={open => { sectionOrderOpeners.current[id] = open; }}
          hostNotice={recallNotice && recallNotice.actorId === actorId && recallNotice.documentId === id && selected === id
            ? { text: recallNotice.text, close: () => setRecallNotice(null), action: { label: recallNotice.redo ? '다시 하기' : '되돌리기', run: () => { void stepTaskRecall(recallNotice.redo); } } }
            : bandRepeatNotice && bandRepeatNotice.actorId === actorId && bandRepeatNotice.documentId === id && selected === id
            ? { text: bandRepeatNotice.text, close: () => setBandRepeatNotice(null), repeat: true,
              action: bandRepeatNotice.check ? { label: '되돌리기', run: () => { const notice = bandRepeatNotice; if (notice.check) void undoBandRepeat(notice.taskId, notice.check); } } : null }
            : noteLineMessage && selected === id ? { text: message, close: () => setMessage('') } : undefined}
          authorizeTaskLocation={(before,next)=>{
            const wideBefore=recent?recentWide(id,recent,before,false):{ok:true as const,state:before},wideNext=recent?recentWide(id,recent,next):{ok:true as const,state:next};
            return wideBefore.ok&&wideNext.ok&&programTextTransition(dataRef.current,{actorId,documentId:id,expected:wideBefore.state,next:wideNext.state}).ok;
          }}
          noteStatus={selected === id ? props.noteStatus : undefined}
          noteActions={selected === id ? <>{props.noteHeader && !props.hostMainTabs && <>{period === 'documents' && findActions}{selectedDocumentTools}</>}{headInToolbar && phoneLayout && selectedDocumentTools}</> : undefined}
          headStart={headInToolbar && selected === id ? docTitle : undefined} headEnd={headInToolbar && selected === id && !phoneLayout ? docActions : undefined}
          headBelow={headInToolbar && selected === id || recentTop || views || flowBand && selected === id ? <>{headInToolbar && selected === id ? docNotices : null}{selected === id ? flowBand : null}{views}{recentTop}</> : undefined}
          onWritingExample={selected === id && writingExampleReady ? () => { void applyWritingExample(); } : undefined}
          folderId={editorFolderOf(id)} directWriting={!!collectionMode} onShowWholeDocument={() => { void changeFolder(''); }} onShowFolderTasks={() => { void showFolderTasks(); }}
          folderScreen={folderWriting && selected === id ? { open: folderWritingDocuments.find(doc => doc.id === id)?.open ?? 0, onStatus: setFolderStatus } : undefined}
          onOpenFolderLine={folderWriting && selected === id ? row => openFolderLine(id, row) : undefined}
          onContinueWholeDocument={stage => {
            // folderId controls every retained editor. Never unmount another pending region.
            if (props.canContinueWholeDocument?.() === false || inputLockCount.current > 0 || selected !== id || period !== 'documents'
              || Object.entries(dirty.current).some(([otherId, pending]) => otherId !== id && pending)
              || Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.())) {
              setMessage('다른 변경이나 저장 중인 입력을 확인한 뒤 전체 문서로 이어서 편집해 주세요.'); return false;
            }
            if (!stage()) return false;
            setFolderId(''); setMessage('');
            // F4-a (A3 ①): '전체 문서 ›' from [글] goes to 쓰기 with this document, at the line being written.
            if (folderScreenRef.current) { setFolderScreen(null); props.navigate({ view: 'space', id }); }
            return true;
          }}
          writingCompute={props.writingCompute} writingContext={props.writingContext}
          onCommit={(next, label, options) => {
            if (!recent) return editorCommit(id, next, label, options);
            // The folded days go back exactly as they were; a save that would change how they read is not made.
            const whole = recentWide(id, recent, next), expected = options?.expectedWorkspace && recentWide(id, recent, options.expectedWorkspace, false);
            if (!whole.ok || expected && !expected.ok) { setMessage('지난 기록과 이어지는 입력이라 최근만 보기에서 저장하지 않았습니다. 입력은 남아 있습니다. 지난 기록을 펼쳐 이어서 써 주세요.'); return Promise.resolve(false); }
            const acknowledged = options?.onPrivateTaskScheduleAcknowledged;
            return editorCommit(id, whole.state, label, options && { ...options, ...(expected?.ok ? { expectedWorkspace: expected.state } : {}),
              ...(acknowledged ? { onPrivateTaskScheduleAcknowledged: (confirmation: Promise<TextWorkspaceState | null>) => acknowledged(confirmation.then(state => state && recentNarrow(id, recent, state))) } : {}) });
          }}
          {...({
            authorizeTaskSplit: (lineId: string, shown: TextWorkspaceState) => {
              const wide = recent ? recentWide(id, recent, shown, false) : { ok: true as const, state: shown };
              if (!wide.ok) return false;
              const current = wide.state, latest = dataRef.current, owner = latest.spaces[actorId];
              if (latest.activeActorId !== actorId || !owner) return false;
              const projected = { ...latest, spaces: { ...latest.spaces, [actorId]: { ...owner, text: current } } };
              if (!canClassifyProgramTask(projected, lineId)) return false;
              const doc = current.documents.find(entry => entry.id === id);
              const rows = M.rowMeta(current, id);
              const row = rows.find(entry => entry.id === lineId);
              if (!doc || !row || row.kind !== 'task' || row.structuralKind !== 'task'
                || !row.isCanonical || row.isReference || row.depth !== 0 || row.scopeMismatch
                || rows.slice(row.index + 1, row.subtreeEndIndex).some(child =>
                  child.kind !== 'property' || child.depth !== row.depth + 1
                  || child.parentLineId !== lineId || child.taskId !== lineId)
                || !/^- \[ \] (.*)$/.test(doc.lines[row.index]?.text ?? '')
                || current.bindings.some(binding => binding.docId === id && binding.lineId === lineId
                  || binding.kind === 'task' && binding.taskId === lineId)) return false;
              // Retained copy slots and imported documents do not establish direct authorship.
              if (owner.copies.some(copy => copy.documentId === id
                || Object.values(copy.kindHandoffs?.items ?? {}).some(slots =>
                  [slots.ordinary, slots.recurring].some(slot => slot.lineId === lineId
                    || Object.values(slot.subcheckLines).includes(lineId))))
                || owner.savedBindings.some(binding => binding.documentId === id)
                || owner.creatorDraftImports?.some(binding => binding.documentId === id)
                || Object.values(owner.creatorWorkspace?.handoffs ?? {}).some(binding => binding.documentId === id)
                || Object.values(owner.creatorWorkspace?.executionSources ?? {}).some(source => source.documentId === id)
                || Object.values(owner.creatorWorkspace?.nativeExecutionSources ?? {}).some(source => source.documentId === id)) return false;
              return true;
            },
          })}
          folderCopyProblem={(state, docId, lineIds) => { const whole = recent ? recentWide(id, recent, state, false) : { ok: true as const, state };
            return whole.ok ? programFolderCopyAccessProblem({ ...space, text: whole.state }, docId, lineIds) : '지난 기록과 이어지는 줄이라 여기서 확인하지 못했습니다. 지난 기록을 펼쳐 주세요.'; }}
          validateWorkspace={next => { const whole = recent ? recentWide(id, recent, next, false) : { ok: true as const, state: next };
            return whole.ok && programPreservesLockedDocumentContent(space, whole.state) && programPreservesSeriesMetadata(space, whole.state) && programPreservesLegacyQualityHold(space, whole.state) && programPreservesLegacyPlanExcluded(space, whole.state); }}
          taskAccess={recent ? (taskId, current) => { const whole = current && recentWide(id, recent, current, false); return writingAccess(taskId, whole?.ok ? whole.state : undefined); } : writingAccess}
          onOpenTaskOrigin={(documentId, lineId) => { void openDocument(documentId, lineId); }}
          onPosition={(shownPosition, lineId) => {
            // Kept (and saved) in the whole document's terms.
            const view = recentViewRef.current(id), position = view ? recentPosition(id, view, shownPosition, true) : shownPosition;
            const sourceFocus = pendingSourceFocus.current;
            // Passive reports from the retained editor must not replace the
            // explicit target while this same source request still owns it.
            if (sourceFocus?.documentId === id && sourceFocus.isCurrent()) return;
            positions.current[id] = { ...position, documentId: id, lineId };
          }}
          onDirtyChange={value => { editorDirtyChanged(id, actorId, value); }} onInputFailureChange={failed => inputFailureChanged(id, failed)} onKeepRefusedInput={props.onKeepRefusedInput} repeatContext={() => dataRef.current.spaces[actorId] ?? space} onRepeatFinish={finishRepeatRound} onRepeatUndo={undoRepeatRound} onUndo={onUndo} onRedo={onRedo}
          onRegisterSave={(save, status) => { saveRequests.current[id] = save; saveStatusReaders.current[id] = status ?? null; }}
          onRegisterSourceFocus={focus => registerSourceFocus(id, focus)}
          onRegisterDraft={(read, working) => { draftReaders.current[id] = read && (() => {
            // The 복구함 keeps the whole document, made as a save makes it: from the editor's own state (lines with IDs).
            const raw = read(), view = recentViewRef.current(id), base = dataRef.current.spaces[actorId]?.text ?? space.text;
            return view ? extendProgramRecentRaw(base, id, programRecentHidden(base, view.hold), raw, working?.() ?? undefined) : raw;
          }); }}
          onRegisterStructuralDraft={read => { structuralDraftReaders.current[id] = read && (() => {
            const draft = read(), view = recentViewRef.current(id);
            if (!draft || !view) return draft;
            const before = recentWide(id, view, draft.before, false), next = recentWide(id, view, draft.next, false);
            return before.ok && next.ok ? { ...draft, before: before.state, next: next.state } : draft;
          }); }}
          onRegisterChildDrafts={read => { childDraftReaders.current[id] = read; }}
          onRegisterConfirmedSave={accept => { confirmedSaveReaders.current[id] = accept && ((before, next, ack) => {
            // Confirmed in the whole document's terms, judged in the editor's: its own save is the same recent part.
            const view = recentViewRef.current(id);
            return view ? accept(recentNarrow(id, view, before), recentNarrow(id, view, next)) : accept(before, next, ack);
          }); }}
          onRegisterInputLock={lock => { inputLocks.current[id] = lock; lock?.(inputLockCount.current > 0); }}
          onGatherFolder={collectionMode ? undefined : scopeId => { if (space.text.folders.some(item => item.id === scopeId)) { keepViewFolder(id, scopeId); void changeFolder(scopeId); } }}
          onOpenScope={scopeId => { if (space.text.folders.some(item => item.id === scopeId)) { if (collectionMode) { setMessage('기존 항목 분류는 모음이 아닙니다. 전체 문서에서 계속 작성합니다.'); return; } void openFolderScreen(scopeId); } else void openDocument(scopeId); }}
          onConnectFlow={(docId, lineId, insertAfter) => openDetail({ kind: 'connect', docId, lineId, insertAfter })}
          readOnly={programDocumentContentLock(space, id) !== 'active'} disabledReason={space.documentTrash?.[id] ? '휴지통의 문서입니다. 복원하면 삭제 전 상태로 돌아갑니다.' : retainedIds.has(id) ? '저장본으로 되돌리며 보관된 내용 · 읽기 전용' : '보관한 문서입니다. 보관에서 꺼내면 이어서 쓸 수 있습니다.'}
        />{recentLine(id, recent, true)}</div>; })}
        {locationNoticeContent}
        {/* F4-a (A3 ⑤): the folder's other documents, one folded line each; a press opens that one instead (one editor). */}
        {folderWriting && folderWritingDocuments.length > 1 && <ul className={folderStyles.docFolds} aria-label="이 폴더가 나오는 다른 글">
          {folderWritingDocuments.filter(doc => doc.id !== selected).map(doc => <li key={doc.id}><button type="button" className={folderStyles.docFold} data-folder-document={doc.id}
            data-done-only={!doc.open && doc.done ? '' : undefined} disabled={preparingDocumentAction} onClick={() => void showFolderDocument(doc.id)}
            aria-label={`${doc.title} 펼치기 · ${doc.open ? `할 일 ${doc.open}개` : doc.done ? `끝낸 일만 ${doc.done}개` : '할 일 없음'}`}>
            <span>{doc.title}</span><small>{doc.open ? `할 일 ${doc.open}` : doc.done ? `끝낸 일만 ${doc.done}` : '할 일 없음'}{doc.lastDate ? ` · ${programCalendarDate(doc.lastDate, today, false)}` : ''}</small><i aria-hidden="true"><ProgramIcon name="down" size={20} /></i></button></li>)}</ul>}
        {selectedDoc && !selectedArchived && !folderWriting && <ProgramRecurrence key={`${actorId}:${selectedDoc.id}`} data={data} mutate={mutate} today={today} period="documents" date={date} documentId={selectedDoc.id} onPlanApplied={focusAppliedPlan}
          presentation={recurrencePresentation.documents[selectedDoc.id] ?? { page: 0, includeHeld: false, includeExcluded: false }} onPresentationChange={value => setRecurrencePresentation(previous => ({ ...previous, documents: { ...previous.documents, [selectedDoc.id]: value } }))}
          onRegisterEditors={port => { recurrencePorts.current[selectedDoc.id] = port; }}
          onOpenSource={(id, line) => void openDocument(id, line)} onShowPeriod={(nextPeriod, nextDate) => { setDate(nextDate); setPeriod(nextPeriod); }} onUndo={onUndo} onRedo={onRedo} />}
      </div>
      <div ref={monthBox} hidden={period === 'documents'} className={styles.executionView} data-note-today={compactNoteToday || undefined} data-period={period}>
        {period !== 'all' && !selecting && <label className={styles.periodPicker}>기간<select aria-label="기간 보기" value={period} onChange={event => { void changePeriod(event.target.value as ProgramPeriod); }}>{periods.filter(([key]) => !['documents', 'all'].includes(key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
        <ProgramRecurrencePlanRecovery data={data} today={today} folderId={folderId || undefined} disabled={preparingDocumentAction} onOpenSource={(id, line) => void openDocument(id, line)} />
        {/* F4-a: the 폴더 tab's list says '폴더'; an open folder has its own head and [할 일]·[글]. */}
        {folderScreen ? <>{folderHead}{folderTabs}</> : folderList ? <div className={styles.periodHeading}><h1>폴더</h1></div> : <div className={styles.periodHeading}>{selecting ? selectTitle : compactNoteToday ? <div className={styles.notePeriodTitle} data-day-hero>{dayHero}<div className={styles.notePeriodActions}>
          <button type="button" className={styles.noteAdd} aria-expanded={noteQuickOpen} aria-controls="program-note-quick-task" onClick={() => setNoteQuickOpen(value => !value)}><ProgramIcon name="plus" size={20} />할 일 추가</button>
          <details ref={noteFindMenu} className={styles.notePeriodTools} onKeyDown={event => {
            if (event.key !== 'Escape' || event.nativeEvent.isComposing || !event.currentTarget.open) return;
            event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false; noteFindMenuSummary.current?.focus({ preventScroll: true });
          }}><summary ref={noteFindMenuSummary} aria-label="편집 도구" title="편집 도구"><span aria-hidden="true"><ProgramIcon name="more" size={20} /></span></summary><div className={styles.notePeriodToolsBody}>{findActions}
            {/* I7: the day heading is hidden here, so its button sits in this menu. */}
            {hideDayHeadings && manualOrderDays.has(date) && !moving && <button type="button" disabled={orderPending}
              onClick={() => { if (noteFindMenu.current) noteFindMenu.current.open = false; void resetDayOrder(date); }}>오늘 순서를 시간순으로</button>}</div></details>
        </div>{heroStats}</div> : period === 'month' ? monthTitleRow : periodTitle}{!selecting && !['all', 'undated', 'documents'].includes(period) && <div className={styles.dateNav}><button aria-label="이전 기간" onClick={() => { if (!keepWrittenDay()) setDate((period === 'month' ? programShiftMonth(date, -1) : programShiftDate(date, period === 'week' ? -7 : -1)) || date); }}><ProgramIcon name="back" size={20} /></button>
          {/* T3: the date as a chip that opens the date input's own picker; the input stays (unseen) with its label. */}
          <button type="button" className={styles.dateChip} onClick={openDatePicker}>{programDateChipLabel(period, date, today, openOnDate)}</button><label className={styles.dateField}>날짜<input id="program-query-date" type="date" value={date} onChange={event => { if (programDate(event.target.value) && !keepWrittenDay()) setDate(event.target.value); }} /></label><button aria-label="다음 기간" onClick={() => { if (!keepWrittenDay()) setDate((period === 'month' ? programShiftMonth(date, 1) : programShiftDate(date, period === 'week' ? 7 : 1)) || date); }}><ProgramIcon name="right" size={20} /></button></div>}</div>}
        {props.noteHeader && <div className={styles.periodNotice}>{props.noteHeader}</div>}
        {selecting && selectBlocks && [...selectBlocks.values()].some(Boolean) && <p className={styles.selectNote}>반복 회차·끝낸 할 일은 고를 수 없습니다</p>}
        {props.noteStatus && <div className={styles.periodStatus}>{props.noteStatus}{!compactNoteToday && period !== 'documents' && !selecting && !folderTab && findActions}</div>}
        {/* F4-a (A1): the 분류 picker and '새 분류' became the folder list (its ＋ 새 폴더). */}
        {folderList && folderListView(null)}
        {collectionMode && <p className={styles.muted}>모음과 관계없이 모든 문서의 같은 할 일을 날짜별로 봅니다.</p>}
        {folderTab ? null : props.hostMainTabs ? viewScope.length > 0 && <div className={styles.scopeLine} role="group" aria-label="지금 보는 범위">
          {viewScope.map(item => <span key={item.kind} className={styles.scopeChip}>{item.label}
            {!selecting && <button type="button" aria-label={`${item.label} 조건 풀기`} onClick={() => void clearScope(item.kind)}><ProgramIcon name="close" size={16} /></button>}</span>)}
          {!selecting && <button type="button" className={styles.scopeAll} onClick={() => void changePeriod('today', true)}>전체로 보기</button>}</div>
          : (folderId || query) && <div className={styles.filterContext} aria-label="할 일 조회 범위"><p>{folderId ? `${folderOptions.find(item => item.id === folderId)?.title ?? '선택한 폴더'} · 하위 포함` : '모든 폴더'}{query && <span>검색: {query}</span>}</p><button type="button" onClick={() => { void changeFolder(''); setQuery(''); }}>필터 해제</button></div>}
        {!monthGrid && range.from && range.to && range.to !== range.from && <p className={styles.muted}>{programCalendarDate(range.from, today)} ~ {programCalendarDate(range.to, today)}</p>}
        {/* F4-a: no 할 일 추가 (빠른 할 일) on the 폴더 tab; F4-b's ＋ 오늘 할 일 ends [할 일]'s 오늘 instead. */}
        {!monthGrid && !selecting && !folderTab && <details className={styles.quickDisclosure} ref={quickDisclosure} data-collapsible id={compactNoteToday ? 'program-note-quick-task' : undefined}
          {...(compactNoteToday ? { open: noteQuickOpen, hidden: !noteQuickOpen, onToggle: (event: React.SyntheticEvent<HTMLDetailsElement>) => setNoteQuickOpen(event.currentTarget.open) } : {})}>
          <summary>할 일 추가</summary>
          <form className={styles.quick} onSubmit={quickTask}>
          {collectionMode && <label className={styles.quickDocument}>작성 문서<select name="documentId" aria-label="빠른 추가 작성 문서" required value={quickTarget} onChange={event => setQuickDocumentId(event.target.value)}><option value="">문서 선택</option>{quickDocuments.map(doc => <option key={doc.id} value={doc.id}>{doc.title}</option>)}</select><small>모음에 자동 연결하지 않습니다.{!quickDocuments.length && ' 문서를 먼저 만들어 주세요.'}</small></label>}
          <label>빠른 할 일<input name="title" required placeholder="할 일을 적으세요" maxLength={500} /></label><label>실행 날짜<input key={period + date} type="date" name="date" defaultValue={period === 'undated' ? '' : date} /></label><button disabled={!!collectionMode && !quickTarget}>추가</button></form>
        </details>}
        {moving && <p role="status">옮길 행의 앞을 선택하세요. <button onClick={() => setMoving(null)}>취소</button></p>}
        {programSeriesMetadata(space).length > 0 && !folderList && !(folderScreen && folderScreen.tab === 'writing') && <div className={styles.actions}><label><input type="checkbox" checked={includeHeldOccurrences} onChange={event => setIncludeHeldOccurrences(event.target.checked)} /> 보류 회차</label><label><input type="checkbox" checked={includeExcludedOccurrences} onChange={event => setIncludeExcludedOccurrences(event.target.checked)} /> 제외 회차</label>
          {!selecting && <><button onClick={() => void onUndo()}>변경 되돌리기</button><button onClick={() => void onRedo()}>다시 실행</button></>}
          {period === 'all' && <><button disabled={!occurrencePage} onClick={() => setOccurrencePage(value => value - 1)}>이전 회차 구간</button><span>회차 조회 {occurrencePage + 1}</span><button disabled={!occurrenceResult.hasMore || occurrencePage >= 128} onClick={() => setOccurrencePage(value => value + 1)}>다음 회차 구간</button>
            {occurrencePage >= 128 && occurrenceResult.hasMore && <p role="status">조회 상한에 도달했습니다. 뒤에 회차가 더 있으며, 반복이 끝난 것은 아닙니다. 위에서 날짜를 고른 뒤 주간 목록으로 확인해 주세요.</p>}
            <button disabled={preparingDocumentAction} onClick={() => { if (Object.values(recurrencePorts.current).some(port => port?.hasPendingInput?.())) { setMessage('회차 날짜를 적용하거나 취소한 뒤 기간을 바꿔 주세요.'); return; } setPeriod('week'); }}>고른 날짜의 주간 보기</button></>}
          {period === 'today' && <><span>미완료 회차 조회: 지난 {28 * (occurrencePage + 1)}일 · 원래 날짜 유지</span><button disabled={!occurrenceResult.hasMore || occurrencePage >= 128} onClick={() => setOccurrencePage(value => value + 1)}>더 이전 회차 확인</button>{occurrencePage >= 128 && occurrenceResult.hasMore && <span>이전 전체를 확인한 것은 아닙니다. 더 오래된 회차는 원문에서 확인해 주세요.</span>}</>}
        </div>}
        {occurrenceResult.issues.some(issue => issue !== 'query-window-limit') && <p role="alert">원본이 바뀌었거나 안전하게 연결하지 못한 회차는 보관 중입니다. 원문에서 확인해 주세요.</p>}
        {occurrenceResult.issues.includes('query-window-limit') && <p role="alert">조회 가능한 회차 범위를 넘었습니다. 표시된 목록이 전체는 아니며, 원문과 기존 기록은 보존했습니다.</p>}
        {occurrenceResult.pendingStarts.map(entry => <p role="status" key={entry.itemRef}>{entry.title} · {entry.reason === 'anchor-required' ? '내 기준일' : '내 시작일'} 미정
          <button type="button" onClick={() => void openDocument(entry.documentId, entry.lineId)}>사본에서 날짜 정하기</button></p>)}
        {/* F4-a (F4 상태): an open folder's empty states — [할 일] with no open task (its finished ones still fold
            below), [글] with no document of the folder. */}
        {folderGroups && !folderGroups.open && <div className={folderStyles.empty} data-folder-empty="tasks">
          <p>{folderId ? '이 폴더에 열린 할 일이 없습니다.' : '열린 할 일이 없습니다.'}</p>
          {/* F4-b (F4 상태 최종안): a folder's empty [할 일] writes its first line here; 모든 할 일 still goes to 쓰기. */}
          {folderTodayAdd || <button type="button" onClick={() => void chooseMainTab('documents')}>{(title => title ? `${title}에서 쓰기` : '쓰기에서 쓰기')(docs.find(doc => doc.id === folderScreen?.writing)?.title)}</button>}</div>}
        {folderScreen && folderScreen.tab === 'writing' && period === 'all' && <div className={folderStyles.empty} data-folder-empty="writing">
          <p>이 폴더가 나오는 글이 없습니다.</p><p>할 일을 다른 폴더로 옮겼거나 폴더 줄을 지웠을 수 있습니다.</p></div>}
        {/* N9 (U50): with no task anywhere there is nothing to find; the button adds the first one instead. */}
        {!executionRows.length && !monthGrid && !folderTab && (noTasks => <div className={styles.empty}><p>{folderId || query ? '현재 조회 조건에 맞는 할 일이 없습니다.' : noTasks ? '아직 할 일이 없습니다.' : '이 보기에 할 일이 없습니다.'}</p>
          {period !== 'all' && period !== 'documents' && (noTasks && !folderId && !query && !selecting
            ? <button type="button" onClick={openQuickAddFromEmpty}>할 일 추가</button>
            : <button type="button" onClick={() => void showAllTasksFromEmpty()}>전체 할 일에서 찾기</button>)}</div>)(!textTasks.length && !programSeriesMetadata(space).length)}
        {/* C5: in the calendar the grid takes the list's place; the chosen day sits beside it when the content is wide. */}
        {/* C6a: the bar of 고르기. Phones cover the bottom tabs with it; wide screens hold it over the list. C6b: its
            [날짜 바꾸기 · n개] opens the date sheet (a sheet on a phone, a menu under the bar on a PC). */}
        {selecting && <div className={styles.selectBar} role="group" aria-label="고른 할 일">
          <span className={styles.selectBarCount}>{selecting.keys.size}개 선택</span>
          <button type="button" className={styles.selectApply} disabled={!selecting.keys.size || datesPending} aria-busy={datesPending || undefined} aria-haspopup="dialog"
            onClick={openDatesSheet}>{datesPending ? '옮기는 중…' : `날짜 바꾸기${selecting.keys.size ? ` · ${selecting.keys.size}개` : ''}`}</button>
          <button type="button" className={styles.selectCancel} onClick={() => stopSelecting()}>취소</button>
          <dialog ref={datesSheet} className={`${styles.findDialog} ${styles.datesSheet}`} aria-labelledby="program-dates-title"
            onCancel={event => { event.preventDefault(); closeDatesSheet(); }}
            onKeyDown={event => { if (event.key !== 'Escape' || event.nativeEvent.isComposing) return; event.preventDefault(); event.stopPropagation(); closeDatesSheet(); }}>
            <h2 id="program-dates-title">{selecting.keys.size}개를 어느 날로 옮길까요?</h2>
            {(() => { const picked = [...selecting.keys].map(key => selecting.expected.get(key)?.date ?? null), choices = programTaskDateChoices(today, picked);
              const choice = (key: string) => { const item = choices.find(entry => entry.key === key)!;
                return <button type="button" key={item.key} className={styles.datesChoice} disabled={item.off} onClick={() => void applySelectDates(item.date)}>{item.label}{item.detail && <small>{item.detail}</small>}</button>; };
              return <>{choice('today')}{choice('tomorrow')}{choice('monday')}
                <form className={styles.datesPick} onSubmit={event => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get('date') ?? ''); if (programDate(value)) void applySelectDates(value); }}>
                  <label>날짜 고르기…<input type="date" name="date" required /></label><button type="submit">이 날로</button></form>
                {choice('none')}</>; })()}
            <button type="button" className={styles.datesClose} onClick={closeDatesSheet}>닫기</button>
          </dialog></div>}
        {/* F12 1차 (W-FLOW-04·05·07): the progress lines, then '다시 확인할 일' (always, its day come), over 오늘's list. */}
        {todayHere() && <ProgramFlowRuns runs={flowRuns} today={today} tablet={!phoneLayout} saving={completingTaskIds} onCheck={checkRunStep} onOpen={openRun} />}
        {/* UX r3 D1: the day close opens with the finished rows folded ('끝낸 일 n · 펼치기'), then the rechecks. */}
        {closing() && (done => done.length > 0 && <div className={styles.closeDone} data-close-done>
          <button type="button" className={styles.closeDoneToggle} aria-expanded={closeDoneOpen} onClick={() => setCloseDoneOpen(open => !open)}>
            <ProgramIcon name="check" size={18} />끝낸 일 {done.length}<span>{closeDoneOpen ? '접기' : '펼치기'}</span></button>
          {closeDoneOpen && <ul className={styles.tasks}>{done.map(item => renderListItem(item))}</ul>}</div>)(shownItems.filter(closeDoneRow))}
        {todayHere() && <ProgramRechecks rows={rechecks} today={today} saving={flowBusy} onCheck={checkRecheck} onTomorrow={recheckTomorrow}
          onOpen={row => void openDocument(row.docId, row.taskId)} />}
        {/* W-FLOW-08: from 18:00 the open rows are '오늘 남은 일', each with [내일] (or [건너뛰기] for a repeat round). */}
        {closing() && (open => open > 0 && <h2 className={styles.closeHead} data-day-close>오늘 남은 일
          <small>{open}</small><span>저녁 6시부터 · [내일]을 길게 누르면 다른 날</span></h2>)(shownItems.filter(item => item.kind === 'row' && item.entry.kind !== 'occurrence' && !item.entry.task.done).length)}
        {/* N11a: the 밀린 일 card, over 오늘's list (never with the calendar). */}
        {/* 오늘 탭 처음 정리 (W-CARRY-13·15·18·19, 총괄 11/12): asked once on this device; its 되돌리기 stays for this visit. */}
        {period === 'today' && !monthGrid && <ProgramFirstCleanup actorId={actorId} space={space} today={today} stale={!!morning?.stale} disabled={saving || carryPending || !!props.hostBusy?.()} mutate={countedMutate} onMessage={setMessage} />}
        {!monthGrid && carryCardContent}{carrySheetContent}{sameSheetContent}
        {/* Flow pipeline S3: the Flow taken just now, its days marked; × lets it go (nothing saved). */}
        {monthGrid && shownHighlight && <div className={styles.flowHighlight} data-flow-highlight={shownHighlight.documentId}>
          <span><i aria-hidden="true" />{shownHighlight.title} · {shownHighlight.count}개</span>
          <button type="button" aria-label={`${shownHighlight.title} 표시 끄기`} onClick={() => setFlowHighlight(null)}><ProgramIcon name="close" size={20} /></button></div>}
        {monthGrid ? <div className={styles.monthLayout} data-wide={wideMonth || undefined}>
          <ProgramMonthGrid rows={executionRows} date={date} today={today} titles={monthWidth >= 761} onPick={pickMonthDay} flow={highlightRow} />
          {/* The chosen day: a sheet on a narrow screen (its row notices inside while open), a panel beside the grid
              when wide. One element either way, so its ＋ line survives the switch. */}
          <dialog ref={daySheet} className={daySheetLook ? `${styles.findDialog} ${styles.daySheet}` : styles.dayPanel}
            aria-labelledby={daySheetLook ? 'program-day-sheet-title' : undefined} aria-label={daySheetLook ? undefined : `${programCalendarDate(date, today)} 할 일`}
            data-expanded={daySheetLook && !!dayShown && addingDate === dayShown || undefined}
            onCancel={event => { event.preventDefault(); if (daySheetLook) closeDaySheet(); }}
            onKeyDown={event => { if (event.key === 'Escape' && (event.nativeEvent.isComposing || event.keyCode === 229)) { event.preventDefault(); event.stopPropagation(); }
              // A key that is not composing ends a composition whose end event never came (C5 re-review 2).
              if (!event.nativeEvent.isComposing && event.keyCode !== 229) endSheetComposing(); }}
            onInput={event => { if (!(event.nativeEvent as InputEvent).isComposing) endSheetComposing(); }}
            onCompositionStart={() => { sheetComposing.current = true; }} onCompositionEnd={endSheetComposing} onBlur={endSheetComposing}
            onClick={event => { const box = event.currentTarget.getBoundingClientRect();
              if (daySheetLook && event.target === event.currentTarget && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) closeDaySheet(); }}>
            {dayShown && <>{dayGroup(dayShown, daySheetLook ? closeDaySheet : undefined)}{sheetOpen && !detail && taskNoticeContent}{sheetOpen && !detail && orderNoticeContent}{sheetOpen && !detail && checkNoticeContent}</>}
          </dialog>
        </div> : folderGroups ? <ul className={styles.tasks} data-folder-tasks>
          {/* F4-a (A2): four heads in one rule (ink 14/700, the date muted beside it); rows as 오늘's, their meta one line. */}
          {folderShownGroups.map(group => <React.Fragment key={group.key}>
            <li className={folderStyles.group} data-folder-group={group.key}><h2>{PROGRAM_FOLDER_TASK_GROUPS[group.key]}
              {group.key === 'late' && <small>못 한 일 {group.rows.length}</small>}{group.key === 'today' && <small>{programCalendarDate(today, '')}</small>}</h2></li>
            {group.rows.map(entry => renderListItem({ kind: 'row', entry, group: null, dated: false }, group.key))}
            {/* F4-b (A5): the end of 오늘 (not a floating button). */}
            {group.key === 'today' && folderTodayAdd && folderGroups.open > 0 && <li className={folderStyles.todayAddRow} data-folder-today-row>{folderTodayAdd}</li>}</React.Fragment>)}
          {folderGroups.done.length > 0 && <li className={folderStyles.doneToggle}><button type="button" data-folder-done aria-expanded={folderDoneOpen}
            onClick={() => setFolderDoneOpen(open => !open)}>{folderDoneOpen ? `끝낸 일 ${folderGroups.done.length}개 접기 ⌃` : `끝낸 일 ${folderGroups.done.length}개 ›`}</button></li>}
          {folderDoneOpen && folderGroups.done.map(entry => renderListItem({ kind: 'row', entry, group: null, dated: false }, 'done'))}
        </ul> : folderTab ? null : <ul className={styles.tasks} onKeyDown={selecting ? moveSelectFocus : undefined}>{(closing() ? shownItems.filter(item => !closeDoneRow(item)) : shownItems).map(item => renderListItem(item))}</ul>}
        {selecting && selectNotice && <div className={styles.orderNotice}><ProgramNoticeRow notice={{ tone: 'info', text: selectNotice }} onClose={() => setSelectNotice(null)} /></div>}
        {/* I7: under the list, held at the bottom of the screen (above the bottom tabs on a phone) while it scrolls. */}
        {!detail && !sheetOpen && orderNoticeContent}
        {!detail && !sheetOpen && checkNoticeContent}{!detail && !sheetOpen && repeatNoticeContent}{!detail && !sheetOpen && sameNoticeContent}{!detail && !bottomNoticeShown && legacyRepeatContent}
        {!detail && datesNoticeContent}{!detail && carryNoticeContent}{!detail && folderTodayNoticeContent}{!detail&&locationNoticeContent}
        {/* 기타 F12 1차 QA P3: '다시 확인할 일' actions' notice with [되돌리기]. */}
        {!detail && flowNotice && <div className={styles.orderNotice} data-flow-notice><ProgramNoticeRow notice={{ tone: 'choose', text: flowNotice.text, actions: flowNotice.undo && !flowNotice.busy ? [{ label: '되돌리기', run: () => void undoFlowNotice() }] : [] }} onClose={() => setFlowNotice(null)} /></div>}
      </div>
      </div></div>
    </div>
    {/* F12 1차: the question and the date sheet sit at the root, so the writing view (the 오늘 view hidden) opens them too. */}
    {/* F12 1차 (W-FLOW-09): the once-per-run question when a deferred Flow step passes the next step. */}
    <dialog ref={deferDialog} className={`${styles.findDialog} ${styles.daySheet}`} aria-labelledby="program-defer-title" data-defer-dialog
      onCancel={event => { event.preventDefault(); setDeferAsk(null); }}>
      {deferAsk && (ask => { const index = ask.run.steps.findIndex(step => step.taskId === ask.taskId), next = ask.run.steps.slice(index + 1).find(step => !step.done && step.date);
      return next && <ProgramDeferAsk title={ask.run.steps[index]?.title ?? ''} date={ask.date} today={today} nextTitle={next.title} nextDate={next.date!} anchor={ask.run.anchor}
      last={ask.run.basis === 'last'} plans={ask.plans} onCancel={() => setDeferAsk(null)}
      onChoose={mode => { writeProgramDeferChoice(ask.run.key, mode); setDeferAsk(null); void applyDeferPlan(ask.run, ask.plans[mode], ask.time); }} />; })(deferAsk)}
    </dialog>
    {/* W-FLOW-08·10: a long press on [내일] — the date sheet (W-MENU-24); a last-day Flow's step stops at its anchor. */}
    <dialog ref={closeSheetDialog} className={`${styles.findDialog} ${styles.daySheet}`} aria-label="옮길 날 고르기" data-close-sheet
      onCancel={event => { event.preventDefault(); setCloseSheet(null); }}>
      {closeSheet && (task => { if (!task) return null;
      const anchor = closeSheet.run?.basis === 'last' ? closeSheet.run.anchor : null;
      return <><ProgramDateSheet title={task.title} summary={closeSheet.run ? `${closeSheet.run.title} · ${closeSheet.run.mark}` : '내 할 일'} today={today} current={task.date}
      marked={new Set(textTasks.flatMap(entry => !entry.done && entry.date ? [entry.date] : []))} notAfter={anchor}
      blockedNote={anchor ? `기준일 ${programCalendarDate(anchor, today)} 뒤로는 옮길 수 없습니다. 이 Flow는 마지막 일 기준이라 기준일은 고정입니다.` : null}
      onPick={value => { if (Date.now() - closeSheet.at < PROGRAM_CLOSE_SHEET_SETTLE_MS) return; setCloseSheet(null); if (value) deferTask(task, value); else void moveTaskHere(task.id, { kind: 'date', date: null }); }} />
      <button type="button" className={styles.datesClose} onClick={() => setCloseSheet(null)}>닫기</button></>; })(textTasks.find(entry => entry.id === closeSheet.taskId))}
    </dialog>
    <dialog ref={dialog} className={styles.dialog} data-task-detail={detail?.kind === 'task' ? true : undefined} aria-labelledby="program-detail-title" onCancel={event => { event.preventDefault(); close(); }}><div className={styles.dialogHeading}><h2 id="program-detail-title">{detail?.kind === 'task' ? detailFolderMove ? '폴더로 옮기기' : detailTask?.title ?? '할 일을 찾을 수 없습니다' : detail?.kind === 'folder' ? '폴더 관리' : '기존 할 일 연결'}</h2><button onClick={close} aria-label="닫기">닫기</button></div>
      {message && <p role="alert" className={styles.error}>{message}</p>}
      {!libraryOpen && detail && viewChangeNoticeContent}
      {detail?.kind==='task'&&detailTask&&detailFolderMove&&<><ProgramTaskMoveSheet key={detailTask.id} workspace={space.text} documentId={detailTask.docId} taskId={detailTask.id} today={today} availability={locationAvailability()} disabled={locationPending||detailSchedulePending||detailProgressPending} onChoose={folderId=>void moveTaskHere(detailTask.id,{kind:'folder',folderId})} onCreate={title=>void moveTaskHere(detailTask.id,{kind:'new-folder',title})}/><button type="button" onClick={()=>setDetailFolderMove(false)}>이전</button></>}
      {detail?.kind === 'task' && detailTask && !detailFolderMove && <>
        <section data-task-location-menu aria-label="옮기기"><h3>옮기기 <small>하위 할 일·메모도 같이</small></h3>
          {locationAvailability().blocked&&<p role="status" className={styles.muted}>저장을 확인하지 못해 옮기기를 잠시 막았습니다 <button type="button" disabled={locationAvailability().checking} onClick={taskMoveGate?.confirm}>{locationAvailability().checking?'확인 중…':'다시 확인'}</button></p>}
          {readTaskLocationPolicy(space,detailTask.id).kind!=='move'&&<p className={styles.muted}>{readTaskLocationPolicy(space,detailTask.id).message}</p>}
          <div className={styles.deferChips} role="group" aria-label="옮길 날">
            {programLineDateChips(today).map(chip=><button type="button" key={chip.key} disabled={locationPending||detailSchedulePending||detailProgressPending||locationAvailability().blocked} onClick={()=>void dateMove(detailTask.id,chip.date)}>{chip.label}</button>)}
            <button type="button" disabled={locationPending||detailSchedulePending||detailProgressPending||locationAvailability().blocked} onClick={()=>{const input=deferPicker.current;if(input){try{input.showPicker();}catch{input.focus();}}}}>날짜 고르기</button>
            <input ref={deferPicker} className={styles.deferPicker} type="date" tabIndex={-1} aria-label="옮길 날짜" value="" onChange={event=>{const value=event.currentTarget.value;if(/^\d{4}-\d{2}-\d{2}$/.test(value))void dateMove(detailTask.id,value);}}/>
          </div>
          {props.capabilities?.taskClassification!==false&&<button type="button" disabled={detailSchedulePending||detailProgressPending||locationAvailability().blocked||readTaskLocationPolicy(space,detailTask.id).kind!=='move'} onClick={()=>setDetailFolderMove(true)}>폴더로 옮기기 · 지금 / {programFolderPath(space.text,detailTask.scopeId)}</button>}
        </section>
        {/* W-FLOW-07 · W-TXT-09: 답 기다리기 — the day to look again; the text takes '- [ ] 답 확인: 제목' and '- 기다림: 오늘' there. */}
        {programWaitStartable(space, detailTask.id) && <section data-task-wait aria-label="답 기다리기"><h3>답 기다리기 <small>다시 볼 날에 ‘답 확인’ 줄을 적습니다</small></h3>
          <div className={styles.deferChips} role="group" aria-label="다시 볼 날">
            {programLineDateChips(today).filter(chip => chip.date > today).map(chip => <button type="button" key={chip.key} data-wait-date={chip.date}
              disabled={flowBusy.has(detailTask.id) || locationPending || detailSchedulePending || detailProgressPending} onClick={() => startWait(detailTask, chip.date)}>{chip.label}</button>)}
          </div></section>}
        <div className={styles.detailOrigin}>
          <p className={styles.muted}>{readProgramTaskOrigin(data, detailTask).label} · {detailTask.docTitle}</p>
          <button disabled={detailSchedulePending || detailProgressPending} onClick={() => openDetailSource(detailTask.docId, detailTask.id)}>원문 열기</button>
          {detailLinkedMemos.length > 0 && <div aria-label="연결 메모"><span>연결 메모</span>{detailLinkedMemos.map(memo => <button key={`${memo.documentId}:${memo.lineId}`} disabled={detailSchedulePending || detailProgressPending} onClick={() => openDetailSource(memo.documentId, memo.lineId)}>{memo.title} 열기</button>)}</div>}
          {readProgramTaskOrigin(data, detailTask).sourceUrl && <a href={readProgramTaskOrigin(data, detailTask).sourceUrl!} target="_blank" rel="noopener noreferrer">자료 원문 열기</a>}
          {(detailSchedulePending || detailProgressPending) && <p className={styles.muted}>날짜·시간 또는 진행 입력을 적용하거나, 닫아 취소한 뒤 원문을 열어 주세요.</p>}
        </div>
        {/* F4-a (A8 ③, FR-1): the task's folder, a link to that folder's screen (its [할 일], from the top). */}
        {!collectionMode && (own => <button type="button" className={folderStyles.taskFolder} data-task-folder={own} disabled={detailSchedulePending || detailProgressPending}
          aria-label={`폴더 ${programFolderAncestry(space, own).map(item => item.title).join(' › ') || folderTitleOf(own)} 보기`}
          onClick={() => { close(); void openFolderScreen(own); }}><span>폴더</span><b>{programFolderAncestry(space, own).map(item => item.title).join(' › ') || folderTitleOf(own)} ›</b></button>)(programTaskFolderId(space, detailTask))}
        <p className={styles.muted}>{readTaskLocationPolicy(space,detailTask.id).kind==='move'?'폴더나 날짜를 바꾸면 글에서도 그 자리로 옮깁니다. 하위 할 일·메모도 같이 갑니다.':readTaskLocationPolicy(space,detailTask.id).message}</p>
        {taskNoticeContent}
        <section className={styles.detailSchedule} aria-labelledby="program-detail-schedule"><h3 id="program-detail-schedule">날짜·시간</h3>
        {detailDatePresentation && <p className={styles.muted} aria-label="날짜 출처">{detailDatePresentation.label}{detailDatePresentation.context && <small>{detailDatePresentation.context}</small>}</p>}
        <form onSubmit={event => { event.preventDefault(); void applySchedule(detailTask.id); }}><div className={styles.scheduleFields}><label className={styles.field}>실행 날짜<input type="date" value={executionDateDraft} onChange={event => { executionDraftOwner.current.input++; setExecutionDateDraft(event.target.value); }} /></label><label className={styles.field}>시간<input type="time" step="60" value={executionTimeDraft} onChange={event => { executionDraftOwner.current.input++; setExecutionTimeDraft(event.target.value); }} /><small>비워 두면 시간 없음</small></label></div>{detailDateChangeHint && <p className={styles.muted} role="status">{detailDateChangeHint}</p>}<button disabled={locationPending||locationAvailability().blocked} className={styles.scheduleApply}>날짜·시간 적용</button></form><div className={styles.scheduleShortcuts}><button disabled={locationPending||locationAvailability().blocked} onClick={() => void dateMove(detailTask.id, today)}>오늘로 이동</button><button disabled={locationPending||locationAvailability().blocked} onClick={() => void dateMove(detailTask.id, programShiftDate(today, 1))}>내일로 이어하기</button><button disabled={locationPending||locationAvailability().blocked} onClick={() => void dateMove(detailTask.id, null)}>날짜 미정으로 이동</button></div>
        {detailTask.time && <p className={styles.muted}>날짜만 미정으로 옮기면 시간은 유지됩니다.</p>}
        </section>
        <details key={`progress-${executionDraftOwner.current.dialog}`} className={styles.detailSection} data-detail-section="progress" open={directProgress || undefined}><summary>진행 기록</summary>
        <form onSubmit={async event => { event.preventDefault(); const requested = { dialog: executionDraftOwner.current.dialog, date: recordDate, percent,
          correctionAsOfDate: progressRecordDate === recordDate && recordDate < today && detailTask.inputPercent !== undefined ? today : undefined };
          const result = await run('진행 기록', current => recordProgramTaskProgress(current, { ...base(current), taskId: detailTask.id, date: requested.date, percent: Number(requested.percent), correctionAsOfDate: requested.correctionAsOfDate }));
          if (result.ok && executionDraftOwner.current.dialog === requested.dialog && executionDraftOwner.current.taskId === detailTask.id) { setProgressDraftBaseline({ date: requested.date, percent: requested.percent }); setMessage('해당 날짜의 누적 진행을 저장했습니다.'); }
        }}><h3>날짜별 진행</h3><label>기록 날짜<input type="date" value={recordDate} onChange={event => { executionDraftOwner.current.input++; setRecordDate(event.target.value); }} required /></label><label>누적 진행 (%)<input type="number" min={0} max={100} value={percent} onChange={event => { executionDraftOwner.current.input++; setPercent(event.target.value); }} required /></label><button>진행 기록</button></form>
        <ul>{M.progressHistory(space.text, detailTask.id).map(record => <li key={record.date}><button onClick={() => { executionDraftOwner.current.input++; setProgressRecordDate(record.date); setRecordDate(record.date); setPercent(String(record.percent)); }}>{programCalendarDate(record.date, today, false)} · {record.percent}%</button></li>)}</ul>
        </details>
        <details key={`connections-${executionDraftOwner.current.dialog}`} className={styles.detailSection} data-detail-section="connections"><summary>연결·이동·순서</summary>
        {period !== 'documents' && <div className={styles.actions}><button onClick={() => moveStep(detailTask, -1)}>같은 날짜에서 위로</button><button onClick={() => moveStep(detailTask, 1)}>같은 날짜에서 아래로</button></div>}
        <label className={styles.field}>다른 문서에 연결<select defaultValue="" onChange={async event => { const docId = event.target.value; if (!docId) return; await run('같은 할 일 연결', current => linkProgramTask(current, { ...base(current), documentId: docId, taskId: detailTask.id })); }}><option value="">문서 선택</option>{space.text.documents.filter(doc => doc.id !== detailTask.docId && programDocumentContentLock(space, doc.id) === 'active').map(doc => <option key={doc.id} value={doc.id}>{doc.title}</option>)}</select></label>
        <ProgramTaskDocumentMove key={detailTask.id} data={data} taskId={detailTask.id} disabled={preparingDocumentAction} onMove={(destinationId, expectedSpace) => moveTaskDocument(detailTask.id, destinationId, expectedSpace)} onOpen={(documentId, taskId) => {
          if (detailSchedulePending || detailProgressPending) { setMessage('날짜·시간 또는 진행 입력을 적용하거나 취소한 뒤 원문을 열어 주세요.'); return; }
          void openDetailSource(documentId, taskId);
        }} />
        </details>
      </>}
      {/* F4-a (A7, FR-8): 폴더 관리 — 이름 · 상위 폴더 · 이 폴더가 나오는 곳 · 삭제, what a deletion leaves said before it is pressed. */}
      {detail?.kind === 'folder' && <div className={folderStyles.manage} data-folder-manage-sheet>
        <form onSubmit={async event => { event.preventDefault(); const title = String(new FormData(event.currentTarget).get('title') ?? ''); await manageRun('폴더 이름 변경', current => renameProgramFolder(current, { ...base(current), folderId: detail.id, title })); }}>
          <label><span className={folderStyles.label}>이름</span><span className={folderStyles.rename}><input key={detail.id} name="title" defaultValue={space.text.folders.find(item => item.id === detail.id)?.title} required maxLength={100} /><button>이름 변경</button></span></label>
          {/* W15 (F21): a rename here reaches every document's folder line for this folder. */}
          {(count => count > 0 && <p className={folderStyles.note} data-folder-line-documents>문서 {count}곳의 폴더 줄도 바뀝니다</p>)(new Set(space.text.bindings.filter(row => row.kind === 'scope' && row.scopeId === detail.id).map(row => row.docId)).size)}</form>
        <label><span className={folderStyles.label}>상위 폴더</span><select value={space.text.folders.find(item => item.id === detail.id)?.parentId ?? ''} onChange={event => { const parentId = event.target.value || null; void manageRun('폴더 이동', current => moveProgramFolder(current, { ...base(current), folderId: detail.id, parentId })); }}><option value="">최상위</option>{folderOptions.filter(item => item.id !== detail.id).map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
        <span className={folderStyles.label}>이 폴더가 나오는 곳</span>
        {(documents => <button type="button" className={folderStyles.place} data-folder-place onClick={() => { const id = detail.id; close(); void (folderScreenRef.current && folderId === id ? chooseFolderTab('writing') : openFolderScreen(id)); }}>
          <span>문서 {documents}개 · 열린 할 일 {programExecutionTasks(space, { folderId: detail.id }).filter(isOpenTask).length}개</span><span aria-hidden="true"><ProgramIcon name="right" size={16} /></span></button>)(
          folderScreen && folderId === detail.id ? folderWritingDocuments.length : programFolderWritingDocuments(space, detail.id, isOpenTask).length)}
        {folderDeleteAsk === detail.id ? <div className={folderStyles.confirm} role="group" aria-label="폴더 삭제 확인"><p>‘{space.text.folders.find(item => item.id === detail.id)?.title}’ 폴더를 삭제할까요?</p>
          <button type="button" className={folderStyles.danger} data-folder-delete-confirm onClick={async () => { const id = detail.id, result = await manageRun('폴더 삭제', current => deleteProgramFolder(current, { ...base(current), folderId: id })); setFolderDeleteAsk(null);
            if (result.ok) { close(); if (folderScreenRef.current && folderId === id) void closeFolderScreen(); else setFolderId('folder-unfiled'); } }}>삭제</button>
          <button type="button" onClick={() => setFolderDeleteAsk(null)}>취소</button></div>
          : <button type="button" className={folderStyles.delete} data-folder-delete onClick={() => setFolderDeleteAsk(detail.id)}>폴더 삭제</button>}
        <p className={folderStyles.note}>삭제해도 문서와 할 일은 미분류에 남습니다. 하위 폴더는 최상위로 옮겨집니다.</p>
      </div>}
      {detail?.kind === 'connect' && <ul className={styles.connect}>{allTasks.filter(task => task.docId !== detail.docId).map(task => <li key={task.id}><button onClick={async () => { const result = await run('같은 할 일 연결', current => linkProgramTask(current, { ...base(current), documentId: detail.docId, ...(detail.insertAfter ? { insertAfterLineId: detail.lineId } : { lineId: detail.lineId }), taskId: task.id })); if (result.ok) close(); }}>{task.title}<small>{task.docTitle}</small></button></li>)}</ul>}
    </dialog>
  </section>;
}
