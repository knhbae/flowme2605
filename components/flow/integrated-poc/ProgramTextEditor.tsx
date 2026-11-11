'use client';

import type {OwnedWritingAck} from '@/lib/flow/integrated-poc/writing-ack';
import type {WritingCompute} from '@/lib/flow/integrated-poc/writing-compute';
import React, { useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { programEditorStatus, serverStatusWins } from '@/lib/flow/integrated-poc/program-status';
import { ProgramServerStatusContext, type ProgramAlertLine } from './program-status-context';
import nativeEditor from '@/lib/flow/integrated-poc/vendor/text-editor.cjs';
import { textEditorRows, textWorkspaceModel as M, type TextEditorRowMeta, type TextMoveSelection, type TextMoveTarget, type TextRow, type TextWorkspaceState } from '@/lib/flow/integrated-poc/text-workspace';
import { programLineDateChips, programTaskDatesMovedText } from '@/lib/flow/integrated-poc/task-date-move';
import { keepProgramMoveTraces, programMoveTrace, programMoveTraceLines, readProgramMoveTraces, PROGRAM_MOVE_TRACE_EVENT, type ProgramMoveTrace } from '@/lib/flow/integrated-poc/task-move-trace';
import { planProgramDateSectionReverse, type DateSectionOrderPlan } from '@/lib/flow/integrated-poc/date-section-order';
import { ProgramDateSheet } from './ProgramDateSheet';
import { programBracketDate, programBracketDatePlan, programDateHeaderPlan, programFolderSeedPlan, programTodayStartPlan } from '@/lib/flow/integrated-poc/input-bar';
import type { ProgramPrivateSpace } from '@/lib/flow/integrated-poc/contract';
import { programRepeatLine, programRepeatSeen, settleProgramRepeatLines, PROGRAM_REPEAT_BLOCK_TEXT, PROGRAM_REPEAT_UNDO_REFUSED, type ProgramRepeatCheck } from '@/lib/flow/integrated-poc/repeat-commands';
import { parseProgramRepeatWords, programRepeatTitle, readProgramRepeatMarker } from '@/lib/flow/integrated-poc/repeat-line';
import { programCalendarDate, programDateLabel } from '@/lib/flow/integrated-poc/date-label';
import { readChildDrafts, type ProgramChildDraft } from '@/lib/flow/integrated-poc/child-draft-recovery';
import { createWritingBarHold, folderBarLine, heldTargetVerdict, taskMarkerLock, toggleTaskLine, writingBarLine, writingBarTarget, type WritingBarAction, type WritingBarLine, type WritingBarTarget } from '@/lib/flow/integrated-poc/writing-bar';
import { programFlowBelow, programKeyboardBarCramped, programKeyboardBarPlace, programKeyboardBarSettle, programKeyboardRoom, programVisibleBottom } from '@/lib/flow/integrated-poc/keyboard-bar-place';
import '@/lib/flow/integrated-poc/vendor/text-editor.css';
import styles from './ProgramTextEditor.module.css';
import { ProgramIcon, type ProgramIconName } from './icons';
import { createFolderPickerDismissal, createFolderPickerHold, createFolderPickerIndex, folderPickerKey, folderPickerNavigation, folderPickerSignature, folderPickerTarget,
  planFolderPickerLink, readFolderPickerChoices, readFolderPickerCommand, readFolderPickerCompositionLine, readFolderPickerLine, type FolderPickerCandidate, type FolderPickerChoice, type FolderPickerCompositionOwner,
  type FolderPickerDefault } from '@/lib/flow/integrated-poc/folder-picker';

/** The phone bar's rows (input v2): its tools, the date chips, ⋯, and (stage 2) the folder chips. */
type BarMode = 'tools' | 'date' | 'more' | 'folders';
type BarTrigger = { kind: 'bracket' | 'slash'; lineId: string } | { kind: 'chain'; lineId: string; raw: string; before: TextWorkspaceState };
type FolderPickerView = { lineId: string; signature: string; parentId: string | null; parentLabel: string; linked: boolean;
  enter: FolderPickerDefault | null; candidates: FolderPickerCandidate[]; navigation: number; indent: boolean;
  left: number; top: number; width: number; above: boolean; listHeight: number; barHeight: number; phone: boolean };
type PickerImeCycle = { start(): void; input(event: InputEvent): void; end(event: CompositionEvent): void;
  keydown(event: KeyboardEvent): boolean; keyup(): void; reconcile(): void; cancel(): void };
const pickerImeFactory = require('@/lib/flow/integrated-poc/ime-enter-cycle.cjs') as {
  create(readFrame: () => { raw: string; start: number; end: number; direction: string; epoch: number; focused: boolean; editable: boolean } | null): PickerImeCycle;
};
import { planProgramDateBlockOrder, type DateBlockOrderPlan, type DateOrderSelection } from '@/lib/flow/integrated-poc/date-block-order';
import { applyProgramLinePermutation, createProgramPermutationHistory } from '@/lib/flow/integrated-poc/line-permutation';
import { programSame } from '@/lib/flow/integrated-poc/controller';
import { readProgramFolderCopyPreview, isProgramFolderCopyPreviewCurrent, copyProgramFolderOccurrence, type ProgramFolderCopyPreview } from '@/lib/flow/integrated-poc/folder-copy';
import { createAlphaStructuralDraft, type AlphaStructuralDraft } from '@/lib/flow/integrated-poc/alpha-structural-recovery';
import { folderRefusalStands, indentTouchesLinkedFolder, linkedFolderLinesTextEditMoves, restoredLineOffset, textEditTouchesLinkedFolderIndent, type FolderIndentRefusal } from '@/lib/flow/integrated-poc/folder-line-hold';
import { createProgramTextDraft, FOLDER_INDENT_NOTICE, type ProgramTextCommit, type ProgramTextCommitOptions, type ProgramTextDraftState } from '@/lib/flow/integrated-poc/program-text-draft';
import { programBarDropNotice, programIndentRefusalNotice, programIndentShape, type ProgramBarDrop, type ProgramIndentRefusal } from '@/lib/flow/integrated-poc/bar-indent-notice';
import {createProgramDocumentInput,type ProgramDocumentInput} from '@/lib/flow/integrated-poc/program-document-input';
import { programRowPatchEnabled } from '@/lib/flow/integrated-poc/typing-row-patch';
import type { ProgramReferenceAccess } from '@/lib/flow/integrated-poc/reference-execution-guard';
import { linkProgramFolder, programFolderLineTitle, programFolderLinkProblem, programFolderLinkProblems } from '@/lib/flow/integrated-poc/folder-link-slot';
import { programFolderLinkPreview, isProgramFolderLinkPreviewCurrent, type ProgramFolderLinkPreview } from '@/lib/flow/integrated-poc/folder-link-preview';
import { isProgramFolderViewCurrent, planProgramRegionEdit, readProgramFolderRegions } from '@/lib/flow/integrated-poc/folder-document-regions';
import { childPlace, insertPlaceAfter, insertPreview, planLayoutInsertion, programInsertMenuTitle, programLayoutPlaceNote, programPlaceNote, type InsertPreviewLine } from '@/lib/flow/integrated-poc/writing-insert-place';
import { programWritingDialogPlace } from '@/lib/flow/integrated-poc/writing-dialog-place';
import { revealProgramEditorLine } from './editor-reveal';
import { ProgramNoticeRow } from './ProgramNoticeRow';
import { programScaffoldRemoval } from '@/lib/flow/integrated-poc/writing-scaffold';
import { planProgramWritingInput, programCompositionCaret, type WritingPlan, type WritingSplice } from '@/lib/flow/integrated-poc/writing-guard';
import { programAlignRows } from '@/lib/flow/integrated-poc/writing-hold';
import { programAbout, programHeldFix, programHeldPlain, programHeldReasonText, programPasteFit, programPasteNotice, programPasteOverLimit, programTextLimitShare, programTextRoom } from '@/lib/flow/integrated-poc/writing-guard-notice';
import { PROGRAM_MEMO_TIP_MS, PROGRAM_MEMO_TIP_TEXT, programMemoTipLeft, programMemoTipStorage, programMemoTipTake } from '@/lib/flow/integrated-poc/memo-enter-tip';
import { programNoticeEndsAt, programNoticeOrder, type ProgramNoticeAction, type ProgramNoticeTone } from '@/lib/flow/integrated-poc/program-notice';
import { programFolderCreatedNotice, programFolderKeptText, programFolderMoveNotice, programFolderRelinkedNotice, programFolderRenamedEverywhere, ro } from '@/lib/flow/integrated-poc/folder-notice';
import { programFolderCreationLocation, programFolderPath } from '@/lib/flow/integrated-poc/folder-link-suggestions';
import { ProgramFolderRegionEditor, programRegionError, type ProgramFolderRegionPort, type ProgramFolderRegionSnapshot } from './ProgramFolderRegionEditor';
import regionStyles from './ProgramFolderRegionEditor.module.css';
import { readProgramTaskDatePresentation } from '@/lib/flow/integrated-poc/execution-presentation';
import { readProgramMemoContext, programTaskDateChangeHint } from '@/lib/flow/integrated-poc/text-context-presentation';
import { ProgramProgressForm } from './ProgramProgressForm';
import { programCheckChipsFit, programCheckNoticeAfter, programCheckNoticeEndsAt, programCheckNoticeFailed, programCheckNoticeLive, programCheckNoticeView, programCheckSaveOutcome, programCheckTaskSignature, programCheckUndoable, type ProgramCheckNotice, type ProgramCheckStep } from '@/lib/flow/integrated-poc/check-progress-notice';
import {ProgramWritingInline} from './ProgramWritingInline';
import {prepareWritingChild} from '@/lib/flow/integrated-poc/writing-child-command';
import {planWritingInsertion} from '@/lib/flow/integrated-poc/writing-insertion-command';
import { moveTaskLocation, readTaskLocationSource, TASK_LOCATION_FAILURE_TEXT, type TaskLocationTarget } from '@/lib/flow/integrated-poc/task-location-move';
import { commitTaskDateWithUndo, type TaskLocationPolicy } from '@/lib/flow/integrated-poc/task-location-command';
import { ProgramTaskMoveSheet } from './ProgramTaskMoveSheet';
import { ProgramTaskMoveContext } from './task-move-context';
import { TASK_DATE_SUGGESTION_EVENT, TASK_DATE_SUGGESTION_KEY, readTaskDateSuggestion, undoTaskDateSuggestion, taskDateSuggestionUndoFrameMatches, taskDateSuggestionLabel, taskDateSuggestionsEnabled, taskDateSuggestionToday, type TaskDateSuggestion } from '@/lib/flow/integrated-poc/task-date-suggestion';

export { createProgramTextDraft } from '@/lib/flow/integrated-poc/program-text-draft';
export type { ProgramTextCommitOptions, ProgramTextDraftState } from '@/lib/flow/integrated-poc/program-text-draft';

export interface ProgramTextPosition { start: number; end: number; scrollTop: number }

/** Inline folder metadata disappears after an accepted import; retain the same
 * visible line/column instead of leaving the caret at an encoded ID offset. */
export function programFolderTextOffset(raw: string, visibleRaw: string, offset: number): number {
  const source = raw.split('\n'), visible = visibleRaw.split('\n');
  let remaining = Math.max(0, Math.min(raw.length, offset)), destination = 0;
  for (let index = 0; index < source.length; index++) {
    const line = visible[index] ?? '';
    if (remaining <= source[index].length) return Math.min(visibleRaw.length, destination + Math.min(remaining, line.length));
    remaining -= source[index].length + 1; destination += line.length + 1;
  }
  return visibleRaw.length;
}
type WritingSelection = ProgramTextPosition & { direction: 'forward' | 'backward' | 'none'; scrollLeft: number };

/** Keep the same source characters when a menu action adds properties or moves a row. */
export function programTextSelectionAfterChange(before: TextWorkspaceState, next: TextWorkspaceState, docId: string, selection: WritingSelection): WritingSelection | null {
  const previous = M.getDocument(before, docId), current = M.getDocument(next, docId);
  if (!previous || !current) return null;
  function translate(offset: number) {
    let start = 0;
    for (const line of previous!.lines) {
      if (offset <= start + line.text.length) {
        const index = current!.lines.findIndex(entry => entry.id === line.id);
        if (index < 0) return null;
        const text = current!.lines[index].text, oldIndent = line.text.match(/^ */)![0].length, newIndent = text.match(/^ */)![0].length;
        const column = offset - start, adjusted = column >= oldIndent ? column + newIndent - oldIndent : column;
        return current!.lines.slice(0, index).reduce((total, entry) => total + entry.text.length + 1, 0) + Math.max(0, Math.min(text.length, adjusted));
      }
      start += line.text.length + 1;
    }
    return null;
  }
  const start = translate(selection.start), end = translate(selection.end);
  if (start === null || end === null) return null;
  return { ...selection, start: Math.min(start, end), end: Math.max(start, end),
    direction: start > end ? selection.direction === 'backward' ? 'forward' : 'backward' : selection.direction };
}
export type ProgramSourceFocus = (target: { documentId: string; lineId: string; raw: string }) => boolean;
/** Read-only UI state for explaining a refused view change, not save authority. */
export type ProgramTextSaveStatus = { composing: boolean; saving: boolean; failed: boolean; held?: boolean };

export interface ProgramTextEditorProps {
  /** Optional integration ports are ignored by the legacy editor. */
  writingCompute?:WritingCompute;writingContext?:()=>{ownerId:string;baseRevision:number};
  hostContext?: import('@/lib/flow/integrated-poc/rea-pm/app-host').ProgramPmHostContext;
  onRegisterInputCheckpoint?: (read: (() => import('@/lib/flow/integrated-poc/document-action').ProgramEditorInputCheckpoint) | null) => void;
  onRegisterCaptureComplete?: (read: (() => boolean) | null) => void;
  onRegisterExternalGuard?: (read: ((before: import('@/lib/flow/integrated-poc/contract').ProgramData, next: import('@/lib/flow/integrated-poc/contract').ProgramData) => boolean) | null) => void;
  /** Recovery (11/10 21:04): whether the document body has input not yet saved. An open child panel alone keeps
   *  onDirtyChange true (its protection) but is not body input; the host keeps only body input as the document's draft. */
  onRegisterBodyPending?: (read: (() => boolean) | null) => void;
  docId: string;
  workspace: TextWorkspaceState;
  onCommit: ProgramTextCommit;
  taskLocationPolicy?: (lineId: string, state: TextWorkspaceState) => TaskLocationPolicy;
  authorizeTaskLocation?: (before: TextWorkspaceState, next: TextWorkspaceState) => boolean;
  /** A folded writing view delegates source placement to the host's complete document. */
  onTaskLocation?: (lineId: string, target: TaskLocationTarget, working: TextWorkspaceState) => Promise<boolean>;
  onUndoTaskLocation?: () => boolean;
  /** F9 W-MENU-26: where this device keeps the moves the trace lines are drawn from (localStorage); none, no traces. */
  moveTraceKey?: string;
  /** F10 W-ORDER-05: the host's 글 ⋮ '날짜 순서 바꾸기' opens this editor's preview. */
  onRegisterSectionOrder?: (open: (() => void) | null) => void;
  /** F11 W-HEIGHT-02: a passing notice of the host (the space's message) for the one notice line under the tool bar. */
  hostNotice?: { text: string; close: () => void; action?: { label: string; run: () => void } | null; repeat?: boolean } | null;
  onPosition?: (selection: ProgramTextPosition, lineId: string | null) => void;
  initialPosition?: ProgramTextPosition;
  onOpenScope?: (scopeId: string) => void;
  /** 7k stage 1 (11/7): a folder line's own entrance — this document's parts of that folder, written in place. */
  onGatherFolder?: (scopeId: string) => void;
  taskAccess?: (taskId: string, current?:TextWorkspaceState) => ProgramReferenceAccess;
  folderCopyProblem?: (state: TextWorkspaceState, docId: string, lineIds: readonly string[]) => string | null;
  onOpenTaskOrigin?: (documentId: string, lineId: string) => void;
  onConnectFlow?: (docId: string, lineId: string | null, insertAfter: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** The input was refused here (kept, not saved) or its save failed; false once it saves or is reverted. */
  onInputFailureChange?: (failed: boolean) => void;
  /** N7: a line's input this editor refused and put back is kept in the tab's 복구함 (W11 saved input). */
  onKeepRefusedInput?: (draft: { title: string; raw: string }) => boolean;
  /** N10: the space's repeat context (copies, repeats) for judging a repeat line, and the host's one command for
   *  finishing a round and taking it back; the editor then takes the saved document as any outside change. */
  repeatContext?: () => Pick<ProgramPrivateSpace, 'copies' | 'personalAuthoring' | 'savedBindings' | 'legacySnapshot' | 'recurrenceExecution'>;
  onRepeatFinish?: (taskId: string, expected: string | null, seen: string) => Promise<ProgramRepeatCheck | 'refused' | null>;
  onRepeatUndo?: (check: ProgramRepeatCheck) => Promise<boolean>;
  onRegisterSave?: (save: (() => Promise<boolean>) | null, status?: (() => ProgramTextSaveStatus) | null) => void;
  onRegisterSourceFocus?: (focus: ProgramSourceFocus | null) => void;
  onRegisterInputLock?: (lock: ((locked: boolean) => void) | null) => void;
  /** `working`: the state the raw was accepted into (lines with their IDs), the one a save sends. */
  onRegisterDraft?: (read: (() => string) | null, working?: (() => TextWorkspaceState | null) | null) => void;
  onRegisterStructuralDraft?: (read: (() => AlphaStructuralDraft | null) | null) => void;
  /** Unconfirmed memo/child-task panel text, for the tab's input recovery only. */
  onRegisterChildDrafts?: (read: (() => ProgramChildDraft[]) | null) => void;
  onRegisterConfirmedSave?: (accept: ((before: TextWorkspaceState, next: TextWorkspaceState, ack?:OwnedWritingAck) => boolean) | null) => void;
  onUndo?: () => void | Promise<void>;
  onRedo?: () => void | Promise<void>;
  /** W6: puts the writing example into an empty document (offered in its ＋ menu). */
  onWritingExample?: () => void;
  readOnly?: boolean;
  /** Retained editors keep their input/history, but not an open navigation menu. */
  active?: boolean;
  /** Local document-collection UI: direct writing first, current-line tools secondary. */
  directWriting?: boolean;
  /** The workspace-wide writing tools flag ('/' menu, add right below, ＋ menu); never per document. */
  authoringMode?:boolean;
  /** Opens this document's Flow·repeat box from the ＋ menu. */
  onOpenPersonalAuthoring?: () => void;
  /** R8b toolbar button for the Flow·반복 sheet ("반복 2" or "반복"); absent, no button. */
  repeatLabel?: string;
  /** Host-owned status/actions share the existing toolbar, not the input owner. */
  noteStatus?: React.ReactNode;
  noteActions?: React.ReactNode;
  /** U44: on a tablet held sideways the host's document title (start) and ⋯ (end) share the toolbar's line, and the
   *  host's notices sit under it (below), above the body. They stay the host's: input and keys there are not this
   *  editor's typing. Absent, the toolbar is as it was. */
  headStart?: React.ReactNode;
  headEnd?: React.ReactNode;
  headBelow?: React.ReactNode;
  disabledReason?: string;
  validateWorkspace?: (next: TextWorkspaceState) => boolean;
  /** Proposal gate: caller verifies current canonical private ownership and known copy/source exclusions. Absent means refuse. */
  authorizeTaskSplit?: (lineId: string, current: TextWorkspaceState) => boolean;
  folderId?: string;
  onShowWholeDocument?: () => void;
  /** Parent checks other mounted drafts before running a synchronous local handoff. */
  onContinueWholeDocument?: (stage: () => boolean) => boolean;
  onShowFolderTasks?: () => void;
  /** F4-a (A3·A4): this document shown in the folder screen's [글]. Its head is one line (name · 할 일 n · 전체 문서 ›)
   *  instead of the gathered view's bar, the tool line keeps only the save status (the bar under the line being
   *  written keeps its tools), and the status words go to the folder screen's head. */
  folderScreen?: { open: number; onStatus?: (status: { label: string; warn: boolean }) => void };
  /** F4-a (위험 3): a line of another folder's task, shown locked in the folder screen, opens in its own writing. */
  onOpenFolderLine?: (row: TextRow) => void;
}

/** Wrap only modal endpoints; intermediate controls retain their native Tab behavior. */
export function trapProgramDialogTab(
  dialog: HTMLDialogElement,
  event: Pick<React.KeyboardEvent<HTMLDialogElement>, 'key' | 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey' | 'preventDefault' | 'stopPropagation'>
    & { nativeEvent?: { isComposing?: boolean }; defaultPrevented?: boolean },
) {
  if (!dialog.open || event.key !== 'Tab' || event.ctrlKey || event.altKey || event.metaKey
    || event.nativeEvent?.isComposing || event.defaultPrevented) return false;
  const active = dialog.ownerDocument.activeElement, view = dialog.ownerDocument.defaultView;
  if (!active || !dialog.contains(active) || !view) return false;
  const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], summary, [tabindex]'))
    .filter(node => node.tabIndex >= 0 && !node.matches(':disabled') && !node.closest('[hidden], [inert]')
      && !(node.tagName === 'INPUT' && (node as HTMLInputElement).type === 'hidden') && node.getClientRects().length > 0
      && !['hidden', 'collapse'].includes(view.getComputedStyle(node).visibility));
  if (!controls.length) return false;
  const first = controls[0], last = controls[controls.length - 1];
  const destination = event.shiftKey ? active === first ? last : null : active === last ? first : null;
  if (!destination) return false;
  event.preventDefault(); event.stopPropagation(); destination.focus(); return true;
}

const FOLDER_STRUCTURE_LOCK = '분류 보기에서는 저장된 줄의 종류와 들여쓰기를 바꿀 수 없습니다. ‘전체 문서 보기’에서 바꿔 주세요.';
const REGION_OUTSIDE = '이 자리는 지금 보는 분류 영역 밖이라 여기서 넣지 않았습니다. 원문은 그대로입니다. 전체 문서에서 추가해 주세요.';
/** W6: an empty document's hint; the first character (a composing one too) takes it away. */
// N9 (U52): short enough that its second line stays one line beside the ⋮ on a 390px phone.
const EMPTY_DOCUMENT_HINT = '여기에 적으세요.\n할 일은 ☐ 또는 - [ ], 메뉴는 /';
/** W6: bar icons drawn to read as what they do: indenting is not moving, and ↳ is not ↶. F6-B1: from the one icon set
 *  where it has the shape (↳ and ↷ keep their own drawing). */
const BAR_SET: Partial<Record<WritingBarAction, ProgramIconName>> = { task: 'todo', outdent: 'outdent', indent: 'indent', menu: 'plus', date: 'cal', folder: 'folder', undo: 'undo', repeat: 'repeat' };
function BarIcon({ name }: { name: WritingBarAction }) {
  const set = BAR_SET[name]; if (set) return <ProgramIcon name={set} size={20} />;
  const path = { task: 'M5 5h14v14H5z', outdent: 'M4 5v14M20 12H9m4-4-4 4 4 4', indent: 'M20 5v14M4 12h11m-4-4 4 4-4 4',
    enter: 'M7 5v7a3 3 0 0 0 3 3h9m-4-4 4 4-4 4', menu: 'M12 5v14M5 12h14',
    // Input v2 stage 1: 날짜 and 폴더 in the bar, ↶ ↷ 반복 in its ⋯ row.
    date: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', folder: 'M3 7V5h7l2 2h9v13H3Z', undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
    redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13', repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3' }[name];
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
/** Input v2 stage 1: a bar date chip's short day ("7일 토"); its full date is in the chip's name. */
const barDay = (date: string) => `${Number(date.slice(8, 10))}일 ${'일월화수목금토'[new Date(`${date}T00:00:00Z`).getUTCDay()]}`;
/** Input v2 stage 1: the bar's ⋯ (its row holds ↶ ↷ 반복 and the ＋ menu). */
const BAR_MORE_ICON = <ProgramIcon name="more" size={20} />;
/** Write polish C (11/7): the toolbar's drawn icons, one family and size, in place of ＋ ↶ ↷ and bare words. The
 *  buttons keep their names (aria-label or their word); the icons are hidden from screen readers. */
function ToolIcon({ name, size = 20 }: { name: 'add' | 'undo' | 'redo' | 'repeat' | 'tools'; size?: number }) {
  const set = ({ add: 'plus', undo: 'undo', repeat: 'repeat' } as const)[name as 'add' | 'undo' | 'repeat'];
  if (set) return <ProgramIcon name={set} size={size} />;
  const path = { add: 'M12 5v14M5 12h14', undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11', redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
    repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
    tools: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6' }[name];
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false"><path d={path} fill="none" stroke="currentColor" strokeWidth={name === 'add' ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
const BAR_COMPOSING_NOTICE = '입력 중인 글자가 아직 끝나지 않아 실행하지 않았습니다. 글자를 마친 뒤 다시 눌러 주세요.';
/** Input v2 stage 2: a chip pressed after its line changed (a save, another device, a finished composition) does nothing. */
const BAR_LINE_CHANGED = '줄이 바뀌어 다시 열어 주세요. 원문은 그대로입니다.';

/** U44: the host's title, ⋯ and notices in the toolbar's line (a tablet held sideways) stay outside the editor for its
 *  typing, keys and focus, as they are on their own row elsewhere. */
function inEditorHead(target: EventTarget | null) {
  return target instanceof Element && !!target.closest('[data-editor-head]');
}

/** F10 W-ORDER-05: a date line as the order preview names it ('11월 13일 (금)', '날짜 미정'). */
function sectionHeadLabel(head: string) {
  const dated = /^\[(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\]$/.exec(head.trim());
  if (dated) return programCalendarDate(`${dated[1]}-${dated[2].padStart(2, '0')}-${dated[3].padStart(2, '0')}`, today());
  return head.trim() === '[미정]' ? '날짜 미정' : head.trim();
}
function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Size only the existing surface; warnings remain in normal document flow. Whole lines of the ruler (U45: 36px on
 *  touch, 26px with a mouse) below the ruler's top padding (20px; write polish D, 11/7: 8px in the note editor, read
 *  from the ruler like its line), so the last line is never cut. */
export function programEditorVisibleHeight(top: number, bottom: number, line = 26, pad = 20) {
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return null;
  const available = Math.max(64, bottom - Math.max(0, top) - 12), step = line > 0 ? line : 26, head = pad >= 0 ? pad : 20;
  return Math.max(64, head + Math.floor((available - head) / step) * step);
}

/** Promote a checked local fragment into the whole editor, never into a writer.
 * Even invalid whole input stays recoverable; it does not bypass normal save guards. */
export function stageProgramRegionInput(controller: ReturnType<typeof createProgramTextDraft>,
  docId: string, capture: ProgramFolderRegionSnapshot | null,
  guard: { composing?: boolean; locked?: boolean; readOnly?: boolean; install?: (raw: string) => boolean } = {}): boolean {
  const state = controller.getState();
  if (!capture || guard.composing || guard.locked || guard.readOnly || state.saving
    || capture.view.documentId !== docId || !isProgramFolderViewCurrent(state.working, capture.view)
    || typeof capture.raw !== 'string' || !Number.isInteger(capture.start) || !Number.isInteger(capture.end)
    || capture.start < 0 || capture.end < capture.start || capture.end > capture.raw.length) return false;
  const region = capture.view.regions.find(entry => entry.key === capture.regionKey);
  let expected = capture.view.fullRaw;
  if (capture.regionKey !== null) {
    if (!region || region.readOnly || typeof capture.regionRaw !== 'string') return false;
    const lines = capture.view.fullRaw.split('\n');
    lines.splice(region.startIndex, region.endIndex - region.startIndex, ...(capture.regionRaw ? capture.regionRaw.split('\n') : []));
    expected = lines.join('\n');
  }
  if (expected !== capture.raw) return false;
  // Do not consume or stage the fragment until its retained destination accepts
  // the exact bytes. A composing/destroyed native instance can refuse setValue.
  if (guard.install && !guard.install(capture.raw)) return false;
  if (capture.raw !== state.raw) controller.updateRaw(capture.raw);
  return controller.getState().raw === capture.raw;
}

type ChildTarget={documentId:string;parentId:string;workspace:TextWorkspaceState;raw:string;title:string;date:string|null;scope:string;memo:string;kind?:'memo'|'task'};
type Panel = { kind: 'insert' | 'child' | 'progress' | 'date' | 'date-sheet' | 'folder' | 'task-folder' | 'folder-copy' | 'move' | 'reference' | 'order' | 'section-order' | 'repeat'; lineId: string | null; child?:ChildTarget; folderLinkPreview?: ProgramFolderLinkPreview; folderCopyPreview?: ProgramFolderCopyPreview; locationExpected?: TextWorkspaceState } | null;
type Moving = TextMoveSelection & { targets: TextMoveTarget[] };

export function programTextProtectionMessage(access?: ProgramReferenceAccess): string {
  return access?.reason ?? '이 부분은 직접 수정할 수 없는 원문 표시입니다. 원래 항목의 보관·보류 상태를 확인해 주세요. 반복 항목의 실행 날짜와 완료는 회차 목록에서 바꿀 수 있습니다.';
}

export function ProgramReferencePanel({ access, title, date, history, onOrigin, onUnlink, onProgress, onDate }: {
  access?: ProgramReferenceAccess; title: string; date: string | null; history: { date: string; percent: number }[];
  onOrigin?: () => void; onUnlink?: () => void; onProgress: () => void; onDate: () => void;
}) {
  return <div className={styles.choices}><p>{title}</p>{access?.reason && <p role="status">{access.reason}</p>}
    <p>항목 날짜: {date ?? '미정'}</p>
    {history.length ? <details><summary>날짜별 기록 읽기 · {history.length}개</summary><ul>{history.map(record => <li key={record.date}>{record.date} · {record.percent}%</li>)}</ul></details> : <p>저장된 진행 기록이 없습니다.</p>}
    {!access?.reason && <><button type="button" onClick={onProgress}>진행 기록</button><button type="button" onClick={onDate}>날짜·시간</button></>}
    {access?.documentId && onOrigin && <button type="button" onClick={onOrigin}>원래 문서의 항목 열기</button>}
    {onUnlink && <button type="button" onClick={onUnlink}>이 연결만 해제</button>}
  </div>;
}

/** A default binary check records progress on the existing Item, a subcheck's too (N9: one tap completes it, as a
 * task's does). Partial progress and future-record ambiguity retain the explicit detail UI. */
/** Presentation follows the real action; this never authorizes a mutation. */
/** A checkbox line with no title yet. */
const EMPTY_TITLE_TASK = /^\s*-\s+\[([ xX]|\d+(?:\.\d+)?%?)\]\s*$/;

export function programCheckboxAction(meta: TextEditorRowMeta, access: ProgramReferenceAccess | undefined, date: string): 'toggle' | 'progress-open' | 'reference-open' {
  if (!meta.progressTargetId || !access || access.kind !== 'active' || access.reason
    || access.lineId !== meta.progressTargetId || !access.documentId) return 'reference-open';
  if ((meta.progressDate ?? '') > date
    || (meta.progressPercent !== 0 && meta.progressPercent !== 100)) return 'progress-open';
  return ['task', 'reference', 'subcheck'].includes(meta.kind) ? 'toggle' : 'progress-open';
}

export function programDirectCheckboxChange(workspace: TextWorkspaceState, docId: string, lineId: string, date: string) {
  const row = M.rowMeta(workspace, docId).find(entry => entry.id === lineId);
  const target = row?.progressTargetId;
  if (!row||row.kind!=='task'&&row.kind!=='subcheck' || !target) return { kind: 'blocked' } as const;
  const value = M.currentProgress(workspace, target);
  if (value === null) return { kind: 'blocked' } as const;
  if (value > 0 && value < 100) return { kind: 'panel', reason: 'partial' } as const;
  if ((M.latestProgress(workspace, target)?.date ?? '') > date) return { kind: 'panel', reason: 'future' } as const;
  const percent = value === 100 ? 0 : 100;
  const next = M.recordProgress(workspace, target, date, percent);
  return next === workspace ? { kind: 'blocked' } as const : { kind: 'apply', next, target, percent } as const;
}

// B0: a new "- /name" line is text while it is typed. An explicit finish on it (Enter, a bar action) links
// the folder of that name or makes it; leaving it (another line, blur, a flush) only links a folder of
// exactly that name. Typing and native undo on such a caret line are held; a paste is not.
const FOLDER_LINE = /^ *- \/(?!.*<!--\s*flowme-folder)/;
const HOLDING_INPUT = ['', 'historyUndo', 'historyRedo', 'insertText', 'insertCompositionText', 'insertReplacementText', 'deleteContentBackward', 'deleteContentForward', 'deleteWordBackward', 'deleteWordForward'];
export function heldInput(raw: string, caret: number | undefined, inputType: string): number[] | undefined {
  if (caret === undefined || !HOLDING_INPUT.includes(inputType)) return undefined;
  const index = raw.slice(0, caret).split('\n').length - 1;
  return FOLDER_LINE.test(raw.split('\n')[index] ?? '') ? [index] : undefined;
}
/** A pending command is not a committed edit; every completion recomputes this. */
export function programTextInputPending(state:Pick<ProgramTextDraftState,'dirty'|'invalid'|'raw'>,nativeRaw:string|undefined,composing:boolean,region:boolean,checking:boolean){
  return state.dirty||state.invalid||composing||region||checking||(nativeRaw!==undefined&&nativeRaw!==state.raw);
}

export function ProgramTextEditor(props: ProgramTextEditorProps) {
  const propsRef = useRef(props); propsRef.current = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ReturnType<typeof nativeEditor.create> | null>(null);
  const draftRef = useRef<ReturnType<typeof createProgramTextDraft> | null>(null);
  // The "- /name" line typed last; `left` once leaving it found no folder of that name. `offAtStart`: a linked
  // line whose text was already off its folder's name when this edit began (D3 B c: it is never moved).
  // named: an edit while held changed the line's folder name (not only its indent, as the bar's ⇤ does).
  const heldFolderLineRef = useRef<{ id: string; left: boolean; offAtStart: boolean; named?: boolean } | null>(null);
  // W15: the folder notice in the notice row, with how long it stays (info 6s; a choice while the caret is in
  // its line's block, then 6s); `held` while pressed or focused. N5 3b review P2 (3): its `key` stays through
  // every copy of it (a restart, a choice's block), and its times are read off performance.now(), a monotonic
  // clock, so a wall clock set back never lengthens it.
  type FolderNotice = { text: string; tone: ProgramNoticeTone; actions?: ProgramNoticeAction[]; lineId?: string; shownAt: number; leftBlockAt: number | null; operationId?: number; key: number };
  const [folderNotice, setFolderNotice] = useState<FolderNotice | null>(null);
  const folderNoticeRef = useRef<FolderNotice | null>(null); folderNoticeRef.current = folderNotice;
  // N10: a repeat round finished here ('다음은 …' with 되돌리기), a first round written for an interval line (with
  // 날짜 고르기), or why a marker stays plain text. Each refusal is said once per line text.
  const [repeatNotice, setRepeatNotice] = useState<{ text: string; tone: ProgramNoticeTone; actions?: ProgramNoticeAction[] } | null>(null);
  const repeatToldRef = useRef(new Set<string>()), repeatBusyRef = useRef(false);
  // QA F3: a settle held back by a save in flight (the caret left the line while it saved) runs once that save is
  // acknowledged; a folder view's caret line comes from its region editor.
  const settleWantedRef = useRef(false), regionLineRef = useRef<string | null>(null);
  // N10 (SPEC 5): the 이 줄 반복 form, for keyboards where "@" is hard to reach; it writes the same marker.
  type RepeatForm = { kind: 'daily' | 'weekdays-only' | 'weekend' | 'days-of-week' | 'days' | 'weeks' | 'month-day' | 'month-last' | 'yearly' | 'months';
    days: number[]; every: string; monthDay: string; month: string; day: string };
  const [repeatForm, setRepeatForm] = useState<RepeatForm>({ kind: 'daily', days: [1], every: '2', monthDay: '1', month: '1', day: '1' });
  // N5 3b review P2 (2): when the shown notice is due to end, as its timer was set (none while it stays). A timer
  // can run late (a hidden tab, a phone in the background), so a return and a ⇤ read the clock themselves.
  const folderNoticeDue = useRef<{ notice: FolderNotice; at: number } | null>(null);
  const folderNoticeRestarting = useRef<FolderNotice | null>(null);
  const folderNoticeKeys = useRef(0);
  const folderRawUndoRef = useRef(false);
  // enter1 (11/10): the text as the folder step shown in the notice left it; ↶ takes later text back before that step.
  const folderStepRawRef = useRef<string | null>(null);
  // Sheet '추가' (11/10): the line start the line menu just wrote, until it is typed into or taken away.
  const scaffoldRef = useRef<{ lineId: string; text: string } | null>(null);
  // int5 QA P2-INT5-1: the text before a start was taken away and the end of that start, until the next input: a ↶ that
  // brings exactly that text back leaves the caret at the start's end, nothing selected (the browser selects what it restored).
  const scaffoldRestoreRef = useRef<{ raw: string; caret: number } | null>(null);
  // 저장 재설계 B (11/10): a writing rule's own edit in flight (onChange hands its splice to the draft) and the notice of the
  // writing rules (a mark taken whole, a head merge asked, a paste, the limit); the caret's line, for a held line's words.
  const plannedInputRef = useRef<{ raw: string; splice?: WritingSplice } | null>(null);
  const applyingPlanRef = useRef(false);
  const [writingNotice, setWritingNotice] = useState<{ tone: ProgramNoticeTone; text: string; detail?: string; actions?: ProgramNoticeAction[]; key: number; paint?: number[] } | null>(null);
  const writingNoticeKeys = useRef(0);
  const [writingCaretLine, setWritingCaretLine] = useState(-1);
  const [heldClosed, setHeldClosed] = useState<string | null>(null);
  const limitStepRef = useRef<{ docId: string; step: number }>({ docId: '', step: 0 });
  /** The last limit notice shown (its notice key): a paste notice after it says it too (notePaste). */
  const limitNoticeRef = useRef<{ key: number; text: string; room: string } | null>(null);
  // memo-enter (11/10): the tip after a plain Enter continued a memo (its key; null when none shows).
  const [memoTip, setMemoTip] = useState<number | null>(null);
  const memoTipKeys = useRef(0);
  // Any other notice up (a move, a warning, a check, a folder, a repeat): the tip neither shows nor counts (UX).
  const memoTipBlockedRef = useRef(false);
  const [dateSuggestion, setDateSuggestion] = useState<TaskDateSuggestion | null>(null);
  const dateSuggestionRef = useRef<TaskDateSuggestion | null>(null);
  const dateSuggestionSeen = useRef(new Set<string>()), dateSuggestionCaret = useRef<string | null>(null);
  const dateSuggestionEnabled = useRef(true), dateSuggestionBlocked = useRef(false), dateSuggestionFinish = useRef(false), dateSuggestionSaving = useRef(false);
  const [dateApplied, setDateApplied] = useState<{ text: string; undo: () => void } | null>(null);
  const setSuggestion = (next: TaskDateSuggestion | null) => { dateSuggestionRef.current = next; setDateSuggestion(next); };
  const [noticeHeld, setNoticeHeld] = useState(false);
  // N5 3b phone: a new folder's notice held while its D11 B ⇤ is open and the caret is on that folder's block.
  const [freshHeld, setFreshHeld] = useState(false);
  // W15 review P1-4: a notice button pressed during a composition runs once it has ended, like a held bar press,
  // so the model changes only when the native editor can take the new text.
  const heldNoticeAction = useRef<(() => void) | null>(null);
  const whenComposed = (run: () => void) => () => { if (composingRef.current) { heldNoticeAction.current = run; return; } run(); };
  // C2: the check notice for one task (by ID): 완료했습니다 [되돌리기] [진행률로], then its percent chips.
  const [checkNotice, setCheckNoticeState] = useState<ProgramCheckNotice | null>(null);
  const checkNoticeRef = useRef<ProgramCheckNotice | null>(null), checkNoticeKeys = useRef(0);
  const setCheckNotice = (next: ProgramCheckNotice | null) => { checkNoticeRef.current = next; setCheckNoticeState(next); };
  // C2: what a check left on its way, by task (document + task ID) and apart from the notice, so another task's
  // notice never drops it: the save each step started, settled on its own, and a choice waiting for a save in flight.
  type CheckStepToRun = Exclude<ProgramCheckStep, { kind: 'chips' }>;
  // Each step keeps the draft's input generation it was applied at; only a save carrying that generation, once
  // acknowledged, settles it as saved (final review, 총괄). checkAcked is the newest generation a save was acked for.
  const checkSaves = useRef(new Map<string, { notice: ProgramCheckNotice; percent: number; undo: boolean; quiet: boolean; generation: number }>());
  const checkAcked = useRef(-1);
  // A held choice keeps what its task's line was then (signature): newer input there wins over it.
  type CheckHeld = { notice: ProgramCheckNotice; step: Extract<CheckStepToRun, { kind: 'undo' | 'percent' }>; signature: string };
  const checkHeld = useRef(new Map<string, CheckHeld>());
  const checkSignature = (state: TextWorkspaceState, targetId: string) => programCheckTaskSignature(state, targetId, M.currentProgress(state, targetId));
  const checkWorkKey = (targetId: string) => propsRef.current.docId + '\n' + targetId;
  // Linked folder lines an edit other than typing (a paste) renamed, by line ID, until they are put back.
  const renamedFolderLinesRef = useRef(new Set<string>());
  const documentInputRef=useRef<ProgramDocumentInput|null>(null);
  const checkPendingRef=useRef<string|null>(null);
  const checkNotifyRef=useRef<((pending:boolean)=>void)|undefined>(undefined);
  const [checkPending,setCheckPending]=useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movingRef = useRef<Moving | null>(null);
  const inputLockedRef = useRef(false);
  const composingRef = useRef(false);
  const regionPortRef = useRef<ProgramFolderRegionPort | null>(null);
  const regionPendingRef = useRef(false);
  const regionPositionRef = useRef<{ start: number; end: number } | null>(null);
  const previousFolderRef = useRef(props.folderId);
  const wholeContinuationRef = useRef<{ start: number; end: number; raw: string } | null>(null);
  const [regionPending, setRegionPending] = useState(false);
  const orderHistoryRef = useRef(createProgramPermutationHistory(props.docId));
  const historyTypeRef = useRef('');
  const orderPositionsRef = useRef<{ state: TextWorkspaceState; selection: DateOrderSelection; scrollTop: number }[]>([]);
  const orderEpochRef = useRef(0);
  const pendingOrderRef = useRef<{ before: TextWorkspaceState; next: TextWorkspaceState; raw: string } | null>(null);
  const menuReturnRef = useRef<WritingSelection | null>(null);
  const [orderPreview, setOrderPreview] = useState<{ plan: DateBlockOrderPlan; before: TextWorkspaceState; epoch: number; selection: DateOrderSelection; scrollTop: number } | null>(null);
  const [inputLocked, setInputLocked] = useState(false);
  const [draft, setDraft] = useState<ProgramTextDraftState>(() => ({ committed: props.workspace, working: props.workspace,
    raw: M.raw(M.getDocument(props.workspace, props.docId)), dirty: false, saving: false, invalid: false, error: '' }));
  const [mode, setMode] = useState<'live' | 'text'>('live');
  const modeRef = useRef(mode); modeRef.current = mode;
  const [panel, setPanelState] = useState<Panel>(null),panelRef=useRef<Panel>(null);
  const setPanel=(next:Panel)=>{panelRef.current=next;setPanelState(next);};
  const childTarget=panel?.kind==='child'?panel.child??null:null;
  const currentChild=()=>panelRef.current?.kind==='child'?panelRef.current.child??null:null;
  const childDrafts=useRef<Record<string,string>>({});
  // Recovery reads panel text as it is; it never marks the document dirty or blocks other actions.
  // typelag (11/11): the whole text is read for the tasks only when a child panel has text kept (the 복구함 runs this
  // at every key).
  const captureChildDrafts=()=>Object.keys(childDrafts.current).length?readChildDrafts(childDrafts.current,M.tasks(currentState())):[];
  const panelComposingRef=useRef(false),compositionGeneration=useRef(0);
  const slashCommandRef=useRef<{lineId:string;raw:string;workspace:TextWorkspaceState;generation:number}|null>(null);
  // The insert menu's place preview follows the focused or hovered choice; null means the first one.
  const [previewKey,setPreviewKey]=useState<string|null>(null);
  const [moving, setMoving] = useState<Moving | null>(null);
  // F11: whether the notice line's [자세히] is open.
  const [alertDetail, setAlertDetail] = useState(false);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [percent, setPercent] = useState('0');
  const [progressRecordDate, setProgressRecordDate] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [message, setMessage] = useState('');
  // Set while the native editor's Tab just skipped a folder-line indent, so the key keeps focus here.
  const folderIndentSkipped = useRef(false);
  const [composing, setComposing] = useState(false);
  const disabled = inputLocked || !!props.readOnly || draft.invalid || draft.saving;
  const insertionDisabled=inputLocked||!!props.readOnly||draft.invalid||composing||regionPending||checkPending;
  // Writing model A bar (S3): ☐ ← → ↵ ＋. Its buttons never dim for composition or a save;
  // a press then is held, shown pressed, and runs once when input settles.
  const [barLine, setBarLine] = useState<WritingBarLine>({ canOutdent: false, canIndent: false, isTask: false, markerLock: null });
  const [barHold] = useState(() => createWritingBarHold<WritingBarTarget>()), [heldBar, setHeldBar] = useState<WritingBarAction | null>(null);
  // Input v2 stage 1 (11/7): the bar turns into a chip row for 날짜 or ⋯ without moving focus (the keyboard stays). It goes
  // back to its tools after a chip runs, on ×, or when the caret leaves the line it was opened on. A date chip's day
  // rides with the held press ('date'); 폴더 writes its `- /` line once and the folder suggestions take over.
  const [barMode, setBarModeState] = useState<BarMode>('tools'), barModeRef = useRef<{ mode: BarMode; line: number }>({ mode: 'tools', line: -1 });
  const barDateUndo = useRef<{ docId: string; taskId: string; before: TextWorkspaceState; after: TextWorkspaceState; date: string; time: string; raw: string; redo: boolean; suggestion?: true } | null>(null);
  type LocationEdit = { docId: string; taskId: string; before: TextWorkspaceState; after: TextWorkspaceState; raw: string; redo: boolean; label: string; date: string | null; folderId: string; kind: TaskLocationTarget['kind']; trace?: ProgramMoveTrace | null };
  // F9 W-MENU-26: the moves this device keeps for the trace lines (see task-move-trace); read again when another tab
  // of this browser writes them.
  const [moveTraces, setMoveTraces] = useState<ProgramMoveTrace[]>(() => props.moveTraceKey && typeof window !== 'undefined' ? readProgramMoveTraces(window.localStorage, props.moveTraceKey) : []);
  const moveTracesRef = useRef(moveTraces); moveTracesRef.current = moveTraces;
  function keepMoveTraces(change: (list: ProgramMoveTrace[]) => ProgramMoveTrace[]) {
    const key = propsRef.current.moveTraceKey;
    if (!key) return;
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { storage = null; }
    // The stored list is the base (another tab may have added to it); without storage, this visit's list.
    const next = keepProgramMoveTraces(storage, key, change, today(), moveTracesRef.current);
    moveTracesRef.current = next; setMoveTraces(next);
  }
  function rememberMove(before: TextWorkspaceState, taskId: string, toDate: string | null) {
    const trace = programMoveTrace(before, propsRef.current.docId, taskId, toDate, Date.now(), `trace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    if (trace) keepMoveTraces(list => [...list, trace]);
    return trace;
  }
  function forgetMove(trace: ProgramMoveTrace | null | undefined) { if (trace) keepMoveTraces(list => list.filter(entry => entry.id !== trace.id)); }
  /** The rows the vendor paints, with each trace line on the row it goes under (drawn in the reading view only). */
  const traceLinesKnown = useRef<{ state: TextWorkspaceState; traces: ProgramMoveTrace[]; day: string; docId: string; lines: ReturnType<typeof programMoveTraceLines> } | null>(null);
  function traceLinesOf(working: TextWorkspaceState) {
    const traces = moveTracesRef.current, day = today(), docId = propsRef.current.docId, known = traceLinesKnown.current;
    if (known && known.state === working && known.traces === traces && known.day === day && known.docId === docId) return known.lines;
    const lines: ReturnType<typeof programMoveTraceLines> = propsRef.current.moveTraceKey && traces.length ? programMoveTraceLines(working, docId, traces, day) : new Map();
    traceLinesKnown.current = { state: working, traces, day, docId, lines };
    return lines;
  }
  function withMoveTraces<T extends { id?: string } | null | undefined>(working: TextWorkspaceState, rows: T[]): T[] {
    if (propsRef.current.folderId || !moveTracesRef.current.length) return rows;
    const lines = traceLinesOf(working);
    if (!lines.size) return rows;
    return rows.map(row => { const drawn = row?.id ? lines.get(row.id) : undefined; return drawn ? { ...row, trace: drawn.map(line => line.text).join('\n') } as T : row; });
  }
  /** [그날 보기]: the moved task's line in view (the reading view stays; no keyboard comes up) and briefly marked. */
  function openTrace(lineIndex: number, at: number) {
    const doc = currentDoc(), lineId = doc?.lines[lineIndex]?.id, line = lineId ? traceLinesOf(currentState()).get(lineId)?.[at] : undefined;
    const index = line ? doc?.lines.findIndex(entry => entry.id === line.taskId) ?? -1 : -1;
    const row = index >= 0 ? hostRef.current?.querySelector<HTMLElement>(`.tle-line[data-line-index="${index}"]`) : null, area = textArea();
    if (!line || !row || !area) return;
    const root = row.closest<HTMLElement>('.tle-root'), viewport = root?.querySelector<HTMLElement>('.tle-viewport');
    const surface = viewport && root && (root.classList.contains('tle-reading-view') || root.classList.contains('tle-folded-view')) ? viewport : area;
    const top = Math.max(0, row.offsetTop - Math.min(40, Math.max(20, surface.clientHeight / 8)));
    surface.scrollTop = top; if (surface !== area) area.scrollTop = top;
    row.scrollIntoView({ block: 'nearest' });
    highlightLocation(line.taskId);
  }
  const openTraceRef = useRef(openTrace); openTraceRef.current = openTrace;
  useEffect(() => { editorRef.current?.refresh(); }, [moveTraces]);
  useEffect(() => {
    const key = props.moveTraceKey;
    if (!key) return;
    const read = (event: StorageEvent) => { if (event.key === key) { const next = readProgramMoveTraces(window.localStorage, key); moveTracesRef.current = next; setMoveTraces(next); } };
    // W-MENU-27: the host's moves (오늘 row detail, the band, the folded view) are kept in this tab too.
    const here = (event: Event) => { if ((event as CustomEvent<{ key?: string }>).detail?.key === key) { const next = readProgramMoveTraces(window.localStorage, key); moveTracesRef.current = next; setMoveTraces(next); } };
    window.addEventListener('storage', read); window.addEventListener(PROGRAM_MOVE_TRACE_EVENT, here);
    return () => { window.removeEventListener('storage', read); window.removeEventListener(PROGRAM_MOVE_TRACE_EVENT, here); };
  }, [props.moveTraceKey]);
  const locationUndo = useRef<LocationEdit | null>(null);
  const [locationNotice,setLocationNotice]=useState<LocationEdit|null>(null);
  const taskMoveGate=useContext(ProgramTaskMoveContext);
  type ScheduleUndo={docId:string;working:TextWorkspaceState;raw:string;text:string;undo:()=>Promise<boolean>};
  const scheduleUndo=useRef<ScheduleUndo|null>(null),[scheduleNotice,setScheduleNotice]=useState<ScheduleUndo|null>(null);
  // Stage 2: `origin` is what the seed came from ('/' or '-/'); × then puts that back (none: the 폴더 button, × takes it away).
  const barChipDate = useRef<string | null>(null), folderSeedRef = useRef<{ docId: string; lineId: string; inPlace: boolean; before: TextWorkspaceState; origin?: '/' | '-/' } | null>(null), datePickRef = useRef<HTMLInputElement>(null);
  // Input v2 stage 2 (11/7): the line a chip row was opened from — a typed `[` (date chips), a typed `/` (folder chips),
  // or the empty line under a head line a date chip just wrote ('chain': the folder chips follow). Context for its writes.
  const barTriggerRef = useRef<BarTrigger | null>(null), [bracketText, setBracketText] = useState('');
  // IV-P3-1 (11/7): a folder line the bar's 폴더 or the '/' menu wrote (its text and link in one go): the next ↶, while the
  // text is as it left it, puts back the document from before the press; ↷ then the folder again.
  // Stage 2: `then` — after a chain's folder: the document before the date chip's head line (the second ↶ goes there).
  const barFolderUndo = useRef<{ docId: string; before: TextWorkspaceState; after: TextWorkspaceState; raw: string; redo: boolean; then?: TextWorkspaceState } | null>(null);
  // S5: why the last ⇤·⇥ was refused inside the editor's own check (the model's reason, or a linked folder line).
  const indentRefusal = useRef<ProgramIndentRefusal | null>(null);
  // N5 3b review: which lines the shown D11 reason is about, so a later D11 B move takes down only a reason that ended.
  const folderRefusal = useRef<FolderIndentRefusal | null>(null);
  const barRef = useRef<HTMLDivElement>(null), barLockId = useId(), roomRef = useRef<HTMLDivElement>(null), noticeRef = useRef<HTMLDivElement>(null);
  const [picker, setPicker] = useState<FolderPickerView | null>(null), pickerRef = useRef<FolderPickerView | null>(null);
  const pickerCompositionOwner = useRef<FolderPickerCompositionOwner | null>(null);
  const pickerId = useId(), [pickerDismissed] = useState(createFolderPickerDismissal), pickerRecent = useRef<string[]>([]);
  const writingRootId = useId();
  // 저장 재설계 B: a plain writing notice (a mark taken whole, a paste) goes after 6 s, like the other plain notices.
  useEffect(() => {
    if (!writingNotice || writingNotice.tone !== 'info' || noticeHeld) return;
    const key = writingNotice.key, timer = setTimeout(() => setWritingNotice(previous => previous?.key === key ? null : previous), 6000);
    return () => clearTimeout(timer);
  }, [writingNotice, noticeHeld]);
  const pickerIndex = useRef<{ folders: TextWorkspaceState['folders']; rows: FolderPickerCandidate[] } | null>(null);
  const [pickerHold] = useState(createFolderPickerHold), [pickerHeld, setPickerHeld] = useState(false);
  const pickerIme = useRef<PickerImeCycle | null>(null), pickerHoldLimit = useRef<ReturnType<typeof setTimeout> | null>(null);
  // R6b: with the host's status (Alpha note), one slot shows one status. Only the open document's
  // editor gets noteStatus, so only it takes the host's status; without a host nothing changes.
  const hostStatus = useContext(ProgramServerStatusContext), serverView = props.noteStatus ? hostStatus : null;
  // While typing, saving and editing show as one quiet dot, so the 450 ms saves do not flicker words.
  // It is marked on bubbling input, after the field's own handler. Marked in capture, its render
  // committed first and put the old value back into the field, so the typed text was lost.
  const [typing, setTyping] = useState(false), typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function markTyping() {
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { typingTimer.current = null; setTyping(false); }, 1000);
  }
  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current); }, []);
  const compositionAnchorRef = useRef<{ area: HTMLTextAreaElement; offset: number } | null>(null);
  // One retry chain at a time for the current held press, capped by elapsed time.
  const barRetry = useRef<{ frame: number; serial: number; since: number } | null>(null);
  const holdLimit = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (holdLimit.current) clearTimeout(holdLimit.current); }, []);
  // Input v2: a menu or form opened from the bar's ⋯ row (＋, 반복, 날짜 고르기) gives the bar its tools back.
  useEffect(() => { if (panel && barModeRef.current.mode !== 'tools') setBarMode('tools'); }, [panel]);
  useEffect(() => {
    // A press held through a composition is released after the compositionend event has finished. The editor
    // hears compositionend in the capture phase, before the native editor does, so releasing here would find the
    // native editor still composing and every bar action (indent, outdent, task, enter) would be refused and lost.
    if (!composing && barHold.held()) { const timer = setTimeout(releaseHeldBar, 0); return () => clearTimeout(timer); }
    releaseHeldBar();
  }, [composing, draft.saving, inputLocked, props.readOnly, regionPending]);
  const finishAfterComposition = useRef(false);
  // N7 review 5: a line's finish skipped mid-composition runs after compositionend has finished, as a held press
  // does; a few frames more while the composed text reaches the model.
  useEffect(() => {
    if (composing || !finishAfterComposition.current) return;
    let tries = 0, timer = setTimeout(function retry() { if (!finishLeftAfterComposition() && !composingRef.current && ++tries < 10) timer = setTimeout(retry, 50); }, 0);
    return () => clearTimeout(timer);
  }, [composing]);
  // The same for a notice button: after compositionend has finished, so the composed text is in the model first.
  useEffect(() => {
    if (composing || !heldNoticeAction.current) return;
    const timer = setTimeout(() => { if (composingRef.current) return; const run = heldNoticeAction.current; heldNoticeAction.current = null; run?.(); }, 0);
    return () => clearTimeout(timer);
  }, [composing]);
  // Other typing or leaving the editor cancels a held press; the composition's own input does not,
  // including a final insertText some keyboards send right after compositionend.
  useEffect(() => {
    const root = hostRef.current?.closest('section');
    if (!root) return;
    let composedJustNow = false, settle: ReturnType<typeof setTimeout> | null = null;
    // S5: a press let go here says so; it used to vanish without a word.
    const cancel = (why: ProgramBarDrop) => { const action = barHold.held(); if (action) { barHold.cancel(); setHeldBar(null); setMessage(programBarDropNotice(action, why)); } };
    const typed = (event: Event) => {
      if (inEditorHead(event.target)) return;
      const type = (event as InputEvent).inputType;
      // The lease ends on newer ordinary input. Only mutate its ref here;
      // render after native/bubble input, never over the incoming DOM value.
      if (pickerHold.input(type, composingRef.current, composedJustNow)) queueMicrotask(() => setPickerHeld(false));
      if (composingRef.current || ['insertCompositionText', 'insertFromComposition', 'deleteByComposition', 'deleteCompositionText'].includes(type)
        || composedJustNow && type === 'insertText') return;
      cancel('typed');
    };
    const composed = (event: Event) => { if (inEditorHead(event.target)) return; compositionAnchorRef.current = null; composedJustNow = true; if (settle) clearTimeout(settle); settle = setTimeout(() => { composedJustNow = false; settle = null; }, 0); };
    const started = (event: Event) => {
      if (inEditorHead(event.target)) return;
      if (pickerHold.pending()) { pickerHold.cancel(); queueMicrotask(() => setPickerHeld(false)); }
      const area = event.target instanceof HTMLTextAreaElement ? event.target : null;
      compositionAnchorRef.current = area ? { area, offset: area.selectionStart } : null;
    };
    const left = (event: FocusEvent) => { if (!(event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) || inEditorHead(event.relatedTarget)) cancel('left'); };
    root.addEventListener('beforeinput', typed, true); root.addEventListener('compositionstart', started, true); root.addEventListener('compositionend', composed, true); root.addEventListener('focusout', left);
    return () => { if (settle) clearTimeout(settle); root.removeEventListener('beforeinput', typed, true); root.removeEventListener('compositionstart', started, true); root.removeEventListener('compositionend', composed, true); root.removeEventListener('focusout', left); };
  }, [barHold, pickerHold]);

  const currentState = () => draftRef.current?.getState().working ?? propsRef.current.workspace;
  const currentDoc = () => M.getDocument(currentState(), propsRef.current.docId);
  const currentRow = (lineId: string | null) => {const state=currentState();return(documentInputRef.current?.rows(state)??M.rowMeta(state,propsRef.current.docId)).find(row=>row.id===lineId);};
  const accessFor = (lineId: string | null) => { const row = currentRow(lineId), target = row?.progressTargetId ?? row?.taskId; return target ? propsRef.current.taskAccess?.(target,currentState()) : undefined; };
  const textArea = () => hostRef.current?.querySelector<HTMLTextAreaElement>('textarea') ?? null;
  // A save in flight only blocks actions: the row metadata still matches the text, so the vendor keeps painting.
  const paintDisabled = () => !!checkPendingRef.current || inputLockedRef.current || !!propsRef.current.readOnly || !!draftRef.current?.getState().invalid;
  const actionsDisabled = () => paintDisabled() || !!draftRef.current?.getState().saving;
  // S5: ⇤·⇥ on the body do not wait for a save in flight. The draft keeps input made during a save and the save
  // loop takes it next, as it does for typing. Locks, read-only, a check in flight and an invalid draft still stop
  // them; composition stops them in the native editor.
  const indentDisabled = () => paintDisabled();
  const indentsNow = (action: WritingBarAction | null) => (action === 'indent' || action === 'outdent') && !propsRef.current.folderId;

  function presentPicker(next: FolderPickerView | null) {
    if (JSON.stringify(pickerRef.current) === JSON.stringify(next)) return;
    pickerRef.current = next; setPicker(next);
    const area = textArea();
    if (area) {
      if (next) { area.setAttribute('role', 'combobox'); area.setAttribute('aria-autocomplete', 'list'); area.setAttribute('aria-expanded', 'true'); area.setAttribute('aria-controls', pickerId); }
      else { for (const name of ['role', 'aria-autocomplete', 'aria-expanded', 'aria-controls', 'aria-activedescendant']) area.removeAttribute(name); }
      if (next && next.navigation >= 0) area.setAttribute('aria-activedescendant', `${pickerId}-${next.navigation}`);
      else area.removeAttribute('aria-activedescendant');
    }
  }
  function dismissPicker() {
    const view = pickerRef.current;
    if (view) {
      const source = currentDoc()?.lines.find(line => line.id === view.lineId);
      if (source) pickerDismissed.hide(propsRef.current.docId, view.lineId, source.text);
    }
    pickerHold.cancel(); setPickerHeld(false); presentPicker(null);
  }
  function syncPicker() {
    const area = textArea(), controller = draftRef.current, state = controller?.getState();
    // Folder-region structural edits retain their existing admission surface.
    if (!area || !controller || !state || !propsRef.current.authoringMode || propsRef.current.folderId || panelRef.current
      || movingRef.current || modeRef.current !== 'live' || inputLockedRef.current || propsRef.current.readOnly || state.invalid
      || checkPendingRef.current || document.activeElement !== area) { presentPicker(null); return; }
    const nativeLine = readFolderPickerLine(area.value, area.selectionStart, area.selectionEnd), doc = currentDoc();
    const line = composingRef.current ? readFolderPickerCompositionLine(pickerCompositionOwner.current, {
      controller, surface: area, documentId: propsRef.current.docId, lineId: nativeLine && doc?.lines[nativeLine.index]?.id || null,
      committedRaw: state.raw, raw: area.value, caret: area.selectionStart, end: area.selectionEnd,
      composing: true, active: pickerRef.current?.lineId === doc?.lines[nativeLine?.index ?? -1]?.id,
      focused: document.activeElement === area, editable: !area.readOnly, connected: area.isConnected,
    }) : state.raw === area.value ? nativeLine : null;
    const source = line && doc?.lines[line.index];
    if (!line || !source) { presentPicker(null); return; }
    const row = currentRow(source.id);
    if (!row || !['note', 'scope'].includes(row.kind) || row.isReference || row.kind === 'scope' && row.scopeKind !== 'folder') { presentPicker(null); return; }
    const binding = state.working.bindings.find(item => item.docId === propsRef.current.docId && item.lineId === source.id && item.kind === 'scope');
    const linked = binding?.kind === 'scope' ? state.working.folders.find(item => item.id === binding.scopeId) : null;
    const signature = folderPickerSignature(propsRef.current.docId, source.id, line.text);
    if (pickerDismissed.hidden(propsRef.current.docId, source.id, line.text) || linked?.title === line.query && pickerRef.current?.lineId !== source.id) { presentPicker(null); return; }
    if (pickerIndex.current?.folders !== state.working.folders) pickerIndex.current = { folders: state.working.folders, rows: createFolderPickerIndex(state.working.folders) };
    const parentId = linked ? linked.parentId : row.ancestorScopeKind === 'folder' ? row.ancestorScopeId : null;
    const parent = parentId ? pickerIndex.current.rows.find(item => item.id === parentId) : null;
    const old = pickerRef.current, choices = readFolderPickerChoices(pickerIndex.current.rows, line.query, parentId,
      { composing: composingRef.current, previous: old?.candidates, recentIds: pickerRecent.current });
    const box = editorRef.current?.caretRect(line.start + line.indent.length + 3), viewport = window.visualViewport;
    const width = Math.min(320, window.innerWidth - 16), bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
    const overhead = 80 + (choices.enter?.kind === 'folder' ? 0 : 44), desired = overhead + Math.min(240, Math.max(40, choices.candidates.length * 40));
    const belowRoom = box ? bottom - box.bottom - 16 : 240, aboveRoom = box ? box.top - (viewport?.offsetTop ?? 0) - 16 : 0;
    const above = !!box && belowRoom < desired && aboveRoom > belowRoom;
    const listHeight = Math.max(40, Math.min(240, (above ? aboveRoom : belowRoom) - overhead));
    const barHeight = old?.barHeight ?? barRef.current?.getBoundingClientRect().height ?? 0;
    presentPicker({ lineId: source.id, signature, parentId, parentLabel: parent?.path ?? '최상위', linked: !!linked,
      ...choices, indent: line.indent.length > 0, navigation: folderPickerNavigation(old?.candidates ?? [], old?.navigation ?? -1, choices.candidates, old?.signature === signature),
      left: Math.max(8, Math.min(window.innerWidth - width - 8, box?.left ?? area.getBoundingClientRect().left)),
      top: box ? above ? Math.max(8, box.top - 8) : box.bottom + 8 : area.getBoundingClientRect().top,
      width, above, listHeight, barHeight, phone: window.matchMedia('(max-width: 700px)').matches });
  }
  function runPickerChoice(choice: FolderPickerChoice, lineId: string) {
    const view = pickerRef.current, controller = draftRef.current, area = textArea();
    if (!view || view.lineId !== lineId || !controller || !area || actionsDisabled() || composingRef.current) return;
    const command = readFolderPickerCommand(currentState(), propsRef.current.docId, lineId, area.value, area.selectionStart, area.selectionEnd);
    if (!command || view.signature !== folderPickerSignature(propsRef.current.docId, lineId, command.text)) { syncPicker(); return; }
    if (choice.kind === 'ambiguous') { setMessage('같은 이름의 폴더가 여러 개입니다. 연결할 폴더를 직접 골라 주세요.'); return; }
    if (choice.kind === 'create') {
      // A pointer chooses the item; only a later native Enter starts a line.
      // An explicit live command must also work after restore/reload, where no
      // typing-history heldFolderLineRef exists.
      const previous = controller.getState(), binding = previous.working.bindings.find(row => row.docId === propsRef.current.docId && row.lineId === lineId);
      const oldFolder = binding?.kind === 'scope' ? previous.working.folders.find(folder => folder.id === binding.scopeId) : null;
      const moved = oldFolder ? controller.moveFolderLine(command.index) : null;
      const declared = moved ? moved.ok : !binding && controller.declareFolderLine(command.index, false, true);
      if (!declared) {
        const notice = controller.getState().folderNotice;
        showFolderNotice(notice || '이 폴더 선택은 적용할 수 없습니다. 현재 내용은 유지했습니다.', 'warn'); return;
      }
      const after = controller.getState();
      if (after.raw !== area.value && !shown(after.raw)) { controller.restoreState(previous); return; }
      heldFolderLineRef.current = null;
      if (moved?.ok && oldFolder) showFolderMove(moved.before, after.working, lineId, moved.fromId, oldFolder.title);
      else {
        const notice = after.folderNotice ?? programFolderCreatedNotice(previous.working, after.working) ?? relinkedNotice(lineId);
        if (notice) showFolderOperation(notice, 'info', lineId);
      }
      dismissPicker();
      const doc = currentDoc(), at = doc?.lines.findIndex(line => line.id === lineId) ?? -1;
      if (doc && at >= 0) { const end = doc.lines.slice(0, at + 1).reduce((length, line) => length + line.text.length + 1, -1); area.setSelectionRange(end, end); }
      rememberBarFolder(lineId);
      editorRef.current?.refresh(); scheduleSave(); return;
    }
    if (choice.kind === 'outdent') { pickerHold.cancel(); setPickerHeld(false); editorRef.current?.indent(true); queueMicrotask(syncPicker); return; }
    const before = currentState(), old = before.bindings.find(item => item.docId === propsRef.current.docId && item.lineId === lineId && item.kind === 'scope');
    const linked = planFolderPickerLink(before, propsRef.current.docId, lineId, choice.folder.id);
    if (linked.problem) { setMessage(linked.problem); return; }
    dismissPicker();
    if (programSame(before, linked.state)) return;
    // apply installs the native value synchronously; the completion never steals a newer caret.
    const pending = apply(linked.state, '폴더 선택', undefined, { lineId, scopeId: choice.folder.id });
    const installed = controller.getState();
    if (programSame(installed.working, linked.state)) {
      const lines = M.getDocument(installed.working, propsRef.current.docId)!.lines, at = lines.findIndex(line => line.id === lineId);
      const caret = lines.slice(0, at + 1).reduce((length, line) => length + line.text.length + 1, -1);
      area.setSelectionRange(caret, caret); editorRef.current?.refresh();
      pickerRecent.current = [choice.folder.id, ...pickerRecent.current.filter(id => id !== choice.folder.id)].slice(0, 30);
      rememberBarFolder(lineId);
      if (linked.moved && old?.kind === 'scope') showFolderMove(before, installed.working, lineId, old.scopeId, before.folders.find(item => item.id === old.scopeId)?.title ?? '');
    }
    void pending;
  }
  function releasePickerHold() {
    const view = pickerRef.current, area = textArea(), controller = draftRef.current;
    const intent = pickerHold.release({ controller, documentId: propsRef.current.docId, lineId: view?.lineId ?? null,
      composing: composingRef.current, saving: !!controller?.getState().saving, active: !!view,
      surface: area, value: area?.value ?? '', caret: area?.selectionStart ?? 0, selectionEnd: area?.selectionEnd ?? 0,
      editable: !!area && !area.readOnly && !inputLockedRef.current && !propsRef.current.readOnly,
      connected: !!area?.isConnected, focusHere: document.activeElement === area });
    if (!pickerHold.pending()) setPickerHeld(false);
    if (intent) runPickerChoice(intent.choice, intent.lineId);
  }
  function pressPicker(choice: FolderPickerChoice) {
    const view = pickerRef.current, area = textArea(), controller = draftRef.current;
    if (!view || !area || !controller || inputLockedRef.current || propsRef.current.readOnly) return;
    const anchor = compositionAnchorRef.current;
    if (!composingRef.current && !controller.getState().saving) { runPickerChoice(choice, view.lineId); return; }
    if (!pickerHold.press({ controller, documentId: propsRef.current.docId, lineId: view.lineId, choice,
      target: folderPickerTarget(area, area.value, area.selectionStart, composingRef.current && anchor?.area === area ? anchor.offset : area.selectionStart) })) return;
    setPickerHeld(true);
    if (pickerHoldLimit.current) clearTimeout(pickerHoldLimit.current);
    if (composingRef.current) {
      const serial = pickerHold.serial();
      pickerHoldLimit.current = setTimeout(() => {
        if (pickerHold.pending() && pickerHold.serial() === serial && composingRef.current) {
          pickerHold.cancel(); setPickerHeld(false); setMessage(BAR_COMPOSING_NOTICE);
        }
      }, 1000);
    }
  }

  const checkActionsDisabled = (lineIndex?:number) => {
    const controller=draftRef.current,state=controller?.getState();
    if(!controller||!state||checkPendingRef.current||inputLockedRef.current||propsRef.current.readOnly
      ||state.invalid||composingRef.current||regionPendingRef.current)return true;
    // With the writing tools on, a task without a title cannot be checked; the line is left as written.
    if(lineIndex!==undefined&&propsRef.current.authoringMode&&EMPTY_TITLE_TASK.test(currentDoc()?.lines[lineIndex]?.text??''))return true;
    if(!state.saving)return false;
    if(textArea()?.value!==state.raw)return true;
    const doc=currentDoc(),date=today();
    return !doc?.lines.some((line,index)=>{
      if(lineIndex!==undefined&&index!==lineIndex)return false;
      const row=currentRow(line.id),target=row?.progressTargetId,access=accessFor(line.id);
      const meta=documentInputRef.current?.paint(state.working)?.[index];
      const canonicalChild=row?.kind==='subcheck'&&row.isCanonical&&!row.isReference&&controller.canApplyLocal()
        &&!!meta&&[0,100].includes(meta.progressPercent!)&&(meta.progressDate??'')<=date;
      if(!controller.canCheck(line.id,date)&&!canonicalChild)return false;
      return !!propsRef.current.taskAccess&&!!target&&!!access&&access.kind==='active'&&!access.reason
        &&access.lineId===target&&!!access.documentId
        &&!!M.getDocument(state.working,access.documentId)?.lines.some(source=>source.id===target);
    });
  };

  /** N10: the repeat line a row's box acts on (a reference acts on its original), or null. */
  function repeatLineFor(lineId: string | null) {
    const context = propsRef.current.repeatContext?.(), row = currentRow(lineId), target = row?.progressTargetId;
    return context && target && row?.kind !== 'subcheck' ? programRepeatLine({ ...context, text: currentState() }, target) : null;
  }
  /** N10 (SPEC 1, 첫 회차): repeat lines the caret has left (all of them on leaving the editor) get their first round's
   *  "- 날짜:" once; a marker that may not repeat says why once. Never mid-composition, never over unsaved screen input.
   *  A folder view settles only the lines its editable regions show, once their input is accepted (QA F3). */
  function settleRepeatLines(all: boolean) {
    const controller = draftRef.current, context = propsRef.current.repeatContext?.(), folderId = propsRef.current.folderId;
    if (!controller || !context || propsRef.current.readOnly) return;
    const state = controller.getState(), area = folderId ? regionPortRef.current?.activeEditor?.(true)?.area ?? null : textArea();
    // Input not yet in the draft (a composition, a region's pending text) or a save on its way: the caret may already
    // have left, so the settle waits for that save's acknowledgement instead of being dropped (QA F3).
    if (state.saving || composingRef.current || repeatBusyRef.current || regionPendingRef.current || !folderId && (!area || area.value !== state.raw)) {
      settleWantedRef.current = true; return;
    }
    if (state.invalid || actionsDisabled()) return;
    const lines = M.getDocument(state.working, propsRef.current.docId)?.lines ?? [], focused = !!area && area.ownerDocument.activeElement === area;
    const caret = all || !focused ? null : folderId ? regionLineRef.current
      : lines[area!.value.slice(0, area!.selectionStart).split('\n').length - 1]?.id ?? null;
    const shown = folderId ? new Set(readProgramFolderRegions(state.working, propsRef.current.docId, folderId)?.regions
      .filter(region => !region.readOnly).flatMap(region => region.lineIds) ?? []) : undefined;
    const result = settleProgramRepeatLines({ ...context, text: state.working }, propsRef.current.docId, today(), caret, shown);
    const told = repeatToldRef.current, block = result.blocked.find(entry => !told.has(`${entry.taskId}:${entry.block}`));
    if (block) { told.add(`${block.taskId}:${block.block}`); setRepeatNotice({ tone: 'warn', text: PROGRAM_REPEAT_BLOCK_TEXT[block.block] }); }
    if (!result.settled.length) return;
    void apply(result.text, '반복 첫 회차').then(saved => {
      // An interval line's first round is a guess (today plus the interval): say it, with a way to change it.
      const first = result.settled.find(entry => !entry.fixed);
      if (saved && first) setRepeatNotice({ tone: 'choose', text: `${programRepeatTitle(first.title)} · 첫 회차 ${programCalendarDate(first.date, today())}`,
        actions: [{ label: '날짜 고르기', run: () => openProgress(first.taskId, 'date') }] });
    });
  }
  /** N10 (SPEC 2): a repeat line's tap finishes its round by the host's one command, once this editor's input is saved;
   *  the saved document comes back as any outside change does. Its notice offers 되돌리기 (SPEC 3). */
  const lastRepeatCheck = useRef<ProgramRepeatCheck | null>(null);
  async function finishRepeatHere(taskId: string, title: string, expected: string | null) {
    const finish = propsRef.current.onRepeatFinish;
    if (!finish || repeatBusyRef.current || composingRef.current) return;
    // The log as shown at the press, before the save below lets a newer account in (QA N1).
    const seen = programRepeatSeen(propsRef.current.repeatContext?.(), taskId);
    repeatBusyRef.current = true;
    try {
      if (draftRef.current?.getState().dirty && !await saveNow()) return;
      const check = await finish(taskId, expected, seen);
      if (check && check !== 'refused') {
        // QA F1: a check that changed nothing here (finished elsewhere first) has nothing of its own to take back.
        lastRepeatCheck.current = check.applied ? check : null;
        setRepeatNotice({ tone: 'choose', text: `${programRepeatTitle(title)} · ${check.applied ? '' : '다른 곳에서 이미 끝낸 회차입니다 · '}다음은 ${programCalendarDate(check.after, today())}`,
          actions: check.applied ? [{ label: '되돌리기', run: () => void undoRepeatHere(check) }] : [] });
      } else setRepeatNotice({ tone: 'warn', text: check === 'refused' ? '다른 곳에서 이 반복을 먼저 바꿨습니다. 지금 날짜를 확인해 주세요' : '반복 회차를 저장하지 못했습니다' });
    } finally { repeatBusyRef.current = false; }
  }
  async function undoRepeatHere(check: ProgramRepeatCheck) {
    const undo = propsRef.current.onRepeatUndo;
    if (!undo || repeatBusyRef.current || composingRef.current) return;
    repeatBusyRef.current = true;
    try {
      if (draftRef.current?.getState().dirty && !await saveNow()) return;
      lastRepeatCheck.current = null;
      setRepeatNotice(await undo(check) ? null : { tone: 'warn', text: PROGRAM_REPEAT_UNDO_REFUSED });
    } finally { repeatBusyRef.current = false; }
  }
  /** SPEC 5: the task a repeat form acts on, its marker if any, and why it may not repeat (judged as if it had one). */
  function repeatTarget(lineId: string | null) {
    const context = propsRef.current.repeatContext?.(), row = currentRow(lineId), taskId = row?.kind === 'task' ? row.progressTargetId : undefined;
    const task = taskId ? M.tasks(currentState()).find(item => item.id === taskId) : undefined;
    if (!context || !task || row?.isReference) return { task: null, block: 'reference' as const, marker: null };
    const marker = readProgramRepeatMarker(task.title), trial = marker ? currentState() : M.updateTask(currentState(), task.id, { title: `${task.title} @매일` });
    return { task, marker, block: programRepeatLine({ ...context, text: trial }, task.id)?.block ?? null };
  }
  function openRepeatPanel(lineId: string | null) {
    const rule = repeatTarget(lineId).marker?.rule;
    if (rule) setRepeatForm(form => ({ ...form, ...(rule.kind === 'daily' ? { kind: 'daily' } : rule.kind === 'weekdays'
      ? (rule.days.length === 5 && !rule.days.includes(0) && !rule.days.includes(6) ? { kind: 'weekdays-only' } : rule.days.length === 2 && rule.days.includes(0) && rule.days.includes(6) ? { kind: 'weekend' } : { kind: 'days-of-week', days: rule.days })
      : rule.kind === 'days' ? { kind: 'days', every: String(rule.every) } : rule.kind === 'weeks' ? { kind: 'weeks', every: String(rule.every) }
      : rule.kind === 'months' ? { kind: 'months', every: String(rule.every) } : rule.kind === 'month-day' ? (rule.day === 'last' ? { kind: 'month-last' } : { kind: 'month-day', monthDay: String(rule.day) })
      : { kind: 'yearly', month: String(rule.month), day: String(rule.day) }) } as RepeatForm));
    setMessage(''); setPanel({ kind: 'repeat', lineId });
  }
  /** The marker words the form names, or null while it names none (they go through the same reader as typed ones). */
  function repeatWords(form: RepeatForm): string | null {
    const names = ['일', '월', '화', '수', '목', '금', '토'];
    const words = form.kind === 'daily' ? '매일' : form.kind === 'weekdays-only' ? '평일' : form.kind === 'weekend' ? '주말'
      : form.kind === 'days-of-week' ? `매주 ${[1, 2, 3, 4, 5, 6, 0].filter(day => form.days.includes(day)).map(day => names[day]).join(' ')}`
      : form.kind === 'days' ? `${form.every}일마다` : form.kind === 'weeks' ? (form.every === '1' ? '매주' : `${form.every}주마다`)
      : form.kind === 'months' ? `${form.every}개월마다` : form.kind === 'month-last' ? '매달 말일' : form.kind === 'month-day' ? `매달 ${form.monthDay}일`
      : `매년 ${form.month}/${form.day}`;
    return parseProgramRepeatWords(words) ? words : null;
  }
  async function applyRepeatForm(lineId: string | null, stop = false) {
    const target = repeatTarget(lineId), words = repeatWords(repeatForm);
    if (!target.task || target.block || !stop && !words) return;
    const title = stop ? programRepeatTitle(target.task.title) : `${programRepeatTitle(target.task.title)} @${words}`;
    const next = M.updateTask(currentState(), target.task.id, { title });
    closePanel();
    if (next !== currentState() && await apply(next, stop ? '반복 그만하기' : '반복 표시') && !stop) settleRepeatLines(true);
  }
  /** ↶ right after a finished round, with nothing typed since (any input forgets it), is that round's 되돌리기 (SPEC 3). */
  function undoRepeatCheck() {
    const last = lastRepeatCheck.current, state = draftRef.current?.getState();
    if (!last || !state || state.dirty) return false;
    void undoRepeatHere(last); return true;
  }

  function rememberPosition() {
    if (propsRef.current.folderId) return;
    const textarea = textArea();
    if (!textarea) return;
    const index = textarea.value.slice(0, textarea.selectionStart).split('\n').length - 1;
    const held = heldFolderLineRef.current;
    if (held) { if (currentDoc()?.lines[index]?.id === held.id) held.left = false; else finishHeldFolderLine(); }
    finishRenamedFolderLines(false);
    // W15: a choice notice stays while the caret is in its line's block (the line and the lines under it).
    setFolderNotice(current => {
      if (!current || current.tone !== 'choose' || !current.lineId) return current;
      const rows = textEditorRows(currentState(), propsRef.current.docId), start = rows.findIndex(row => row.id === current.lineId);
      const inside = start >= 0 && index >= start && index < Math.max(rows[start].subtreeEndIndex, start + 1);
      const leftBlockAt = inside ? null : current.leftBlockAt ?? performance.now();
      return leftBlockAt === current.leftBlockAt ? current : { ...current, leftBlockAt };
    });
    propsRef.current.onPosition?.({ start: textarea.selectionStart, end: textarea.selectionEnd, scrollTop: textarea.scrollTop }, currentDoc()?.lines[index]?.id ?? null);
    syncFreshNotice(); syncBarLine();
  }

  /** Only the line just left is inspected. Typing on the next line keeps one suggestion until that line ends. */
  function finishDateSuggestion() {
    const controller = draftRef.current, area = textArea(), p = propsRef.current;
    if (!controller || !area || p.folderId || !p.authoringMode || p.active === false || p.readOnly) return;
    if (composingRef.current || area.value !== controller.getState().raw) { dateSuggestionFinish.current = true; return; }
    dateSuggestionFinish.current = false;
    const state = controller.getState(), lines = M.getDocument(state.working, p.docId)?.lines ?? [];
    const current = area.ownerDocument.activeElement === area ? lines[caretLine(area)]?.id ?? null : null;
    const previous = dateSuggestionCaret.current;
    dateSuggestionCaret.current = current;
    if (!previous || previous === current) return;
    setSuggestion(null);
    if (state.invalid || !dateSuggestionEnabled.current || dateSuggestionBlocked.current) return;
    const candidate = readTaskDateSuggestion(state.working, p.docId, previous, taskDateSuggestionToday());
    if (!candidate || p.repeatContext?.().copies.some(copy => copy.documentId === p.docId)) return;
    const key = `${candidate.lineId}:${candidate.date}`;
    if (dateSuggestionSeen.current.has(key)) return;
    dateSuggestionSeen.current.add(key); setSuggestion(candidate);
  }

  async function acceptDateSuggestion(candidate: TaskDateSuggestion) {
    const controller = draftRef.current;
    const usable = () => { const p = propsRef.current; return !!controller && draftRef.current === controller && !p.folderId && p.active !== false
      && dateSuggestionEnabled.current && !composingRef.current && candidate.docId === p.docId; };
    if (!controller || !usable() || dateSuggestionSaving.current) return;
    // int8b (QA-int8 0-6): a chip pressed before this document's own input is saved (the Enter that ended the line, the
    // date words just typed, a save in flight) saves it first. The move is judged against what is saved
    // (authorizeTaskLocation), where this document's unsaved input reads as another change ('연결·반복 상태가 바뀌어
    // 옮기지 않았습니다'); a real change from elsewhere is still refused there. The host's copy (this editor's workspace)
    // is read once it shows the save.
    if (controller.getState().dirty || controller.getState().saving) {
      dateSuggestionSaving.current = true;
      try {
        if (!await saveNow(false) || !usable()) return;
        for (let frame = 0; frame < 10 && !programSame(propsRef.current.workspace, controller.getState().committed); frame++)
          await new Promise(resolve => requestAnimationFrame(resolve));
      } finally { dateSuggestionSaving.current = false; }
    }
    const p = propsRef.current, area = textArea();
    if (!area || !usable() || actionsDisabled() || area.value !== controller.getState().raw) return;
    const before = controller.getState(), current = readTaskDateSuggestion(before.working, p.docId, candidate.lineId, taskDateSuggestionToday());
    if (!current || current.source !== candidate.source || current.date !== candidate.date
      || p.repeatContext?.().copies.some(copy => copy.documentId === p.docId)) { setSuggestion(null); return; }
    const row = currentRow(candidate.lineId), target = row?.progressTargetId, task = target ? M.tasks(before.working).find(item => item.id === target) : undefined;
    if (!task) return;
    setSuggestion(null);
    // int9 r2 (W-NLDATE-07, 기타 int9 QA P2): a document without date heads only gets the date ('- 날짜:' under the task, in
    // place); no date head is made and nothing moves. Otherwise the ⋮ date's own path (W-MENU-07).
    const headless = !M.rowMeta(before.working, p.docId).some(item => item.kind === 'date');
    const done = headless && target && !accessFor(candidate.lineId)?.reason ? applyDateOnly(target, candidate.date, task.time ?? '')
      : applyDateChip(candidate.lineId, candidate.date), after = controller.getState();
    if (after.raw === before.raw) return;
    const history = { docId: p.docId, taskId: task.id, before: before.working, after: after.working,
      date: candidate.date, time: task.time ?? '', raw: after.raw, redo: false, suggestion: true as const };
    barDateUndo.current = history;
    const oldIds = new Set(M.getDocument(before.working, p.docId)?.lines.map(line => line.id));
    const property = M.getDocument(after.working, p.docId)?.lines.find(line => !oldIds.has(line.id) && /^ *- 날짜:/.test(line.text));
    setDateApplied({ text: `${taskDateSuggestionLabel(candidate.date, taskDateSuggestionToday())} 옮겼습니다`, undo: whenComposed(() => {
      if (p.docId !== propsRef.current.docId || actionsDisabled()) return;
      if (barDateUndo.current === history && undoBarDate()) { setDateApplied(null); return; }
      if (!property) { setDateApplied(null); return; }
      const state = controller.getState(), next = undoTaskDateSuggestion(state.working, p.docId, task.id, property, candidate.date);
      if (!next) { setDateApplied(null); return; }
      // Continued writing and another document's refresh survive: remove only this exact property.
      const restored = M.tasks(next).find(item => item.id === task.id);
      if (restored) void apply(next, '날짜 말 제안 되돌리기', { taskId: restored.id, date: restored.date, time: restored.time ?? '' });
      setDateApplied(null);
    }) });
    void done;
  }
  /** N5 3b (phone): D11 B's ⇤ lasts only while the new folder's notice shows, and on a phone getting back onto that
   *  line takes longer than an info notice's 6s. So, like a choice, that notice stays while the ⇤ is still open
   *  (nothing edited since) and the caret is on the new line or under it; once either ends, its 6s start.
   *  Review P2: only while this editor is the one shown — another document, a folder view or another screen
   *  starts them too, so a long stay there never brings the ⇤ back. */
  function freshNoticeHolds() {
    const controller = draftRef.current, operation = controller?.folderOperation(), area = textArea();
    if (propsRef.current.folderId || propsRef.current.active === false || !hostRef.current?.getClientRects().length
      || !controller || !area || !operation?.lineId || folderNoticeRef.current?.operationId !== operation.id
      || !controller.freshFolderLine(operation.lineId)) return false;
    const rows = textEditorRows(controller.getState().working, propsRef.current.docId), start = rows.findIndex(row => row.id === operation.lineId);
    const index = area.value.slice(0, area.selectionStart).split('\n').length - 1;
    return start >= 0 && index >= start && index < Math.max(rows[start].subtreeEndIndex, start + 1);
  }
  function syncFreshNotice() { endFolderNoticeIfOver(); const holds = freshNoticeHolds(); setFreshHeld(previous => previous === holds ? previous : holds); }
  /** Review P2 (2): a notice past its due time ends now, with its folder operation, as its late timer would have;
   *  so coming back, or a ⇤, after its 6s never holds it again. */
  function endFolderNoticeIfOver() {
    const due = folderNoticeDue.current, over = folderNoticeRef.current;
    if (!due || !over || due.notice.key !== over.key || due.at > performance.now()) return false;
    folderNoticeDue.current = null; folderNoticeRef.current = null; draftRef.current?.endFolderNotice();
    // Review P2 (3): by its key, so a copy already made of it (a choice's block, entered again) goes too.
    setFolderNotice(current => current?.key === over.key ? null : current);
    return true;
  }
  /** B0: judge the held "- /name" line by its whole name. Explicit (Enter or a bar action with the caret on
   * it) links or makes the folder; otherwise only a folder of exactly that name is linked, once per leaving. */
  function finishHeldFolderLine(explicit = false) {
    const held = heldFolderLineRef.current, controller = draftRef.current, area = textArea();
    if (held && composingRef.current) finishAfterComposition.current = true;
    if (!held || !controller || !area || composingRef.current || propsRef.current.readOnly) return;
    const state = controller.getState();
    if (state.invalid || area.value !== state.raw) return;
    const docId = propsRef.current.docId, lines = M.getDocument(state.working, docId)?.lines ?? [];
    const index = lines.findIndex(line => line.id === held.id);
    // A linked line still showing its folder's name has nothing left to finish.
    const binding = state.working.bindings.find(row => row.docId === docId && row.lineId === held.id);
    const linked = binding?.kind === 'scope' ? state.working.folders.find(folder => folder.id === binding.scopeId) : undefined;
    if (index < 0 || !FOLDER_LINE.test(lines[index].text) || binding && (!linked || lines[index].text.replace(/^ *- \//, '').trim() === linked.title)) {
      heldFolderLineRef.current = null;
      // S4 v14 phone: its name deleted and typed back ('- /' kept). A folder this draft made is linked again (D11 B).
      // S4 v16 phone: only when the name was edited; ⇤ then Enter is no typing back. Nothing changed, so no 되돌리기
      // (it undid a link the line never lost, leaving '- 새자식' as plain text).
      if (index >= 0 && linked && held.named && FOLDER_LINE.test(lines[index].text) && controller.relinkFolderLine(lines[index].id)) {
        const notice = relinkedNotice(lines[index].id); if (notice) showFolderOperation(notice, 'info', lines[index].id, [], false);
      }
      return;
    }
    // D3 B (W15): a linked line finished with a new name moves, or renames its folder when only this document uses it.
    // N7 review 4 (총괄 decision, within B0's one judgement once the line is finished): leaving the line finishes it
    // as Enter does, so a typo fixed and left is renamed, not put back and kept. A line already off its folder's name
    // (c), 미분류 or a refusal puts the name back.
    if (binding) {
      heldFolderLineRef.current = null;
      const typed = lines[index].text.replace(/^ *- \//, '').trim();
      let why: 'off' | 'name-conflict' | 'shared' | 'refused' = held.offAtStart ? 'off' : 'refused', boxed = false;
      if (!held.offAtStart && linked && linked.id !== 'folder-unfiled') {
        const previous = controller.getState(), moved = controller.moveFolderLine(index);
        if (moved.ok) {
          const after = controller.getState();
          if (after.raw !== area.value && !shown(after.raw)) { controller.restoreState(previous); return; }
          showFolderMove(moved.before, after.working, lines[index].id, moved.fromId, linked.title);
          scheduleSave(); return;
        }
        if (moved.reason === 'name-conflict') why = 'name-conflict';
        if (moved.reason === 'used-elsewhere') why = 'shared';
      }
      // N7 review: every name put back (off, two of it there, used elsewhere, refused) keeps what was typed in the
      // 복구함, where it can be had again; a notice alone was lost once closed. Nothing typed, nothing kept. Not kept
      // (the tab's storage failed, and says so), the line is not put back: the input stays as typed.
      if (linked && linked.id !== 'folder-unfiled' && typed && propsRef.current.onKeepRefusedInput) {
        if (!propsRef.current.onKeepRefusedInput({ title: `‘${linked.title}’ 폴더 줄에 쓴 이름`, raw: (area.value.split('\n')[index] ?? lines[index].text).trim() })) {
          heldFolderLineRef.current = held; return;
        }
        boxed = true;
      }
      const beforeRaw = area.value, { selectionStart, selectionEnd, selectionDirection } = area;
      if (!controller.restoreFolderLineName(index)) return;
      // The caret keeps its place on the shorter or longer name, so the Enter that finished the line opens
      // the next line instead of splitting the one below.
      const restored = controller.getState().raw, line = restored.split('\n')[index];
      editorRef.current?.setValue(restored, { selection: { start: restoredLineOffset(beforeRaw, index, line, selectionStart),
        end: restoredLineOffset(beforeRaw, index, line, selectionEnd), direction: selectionDirection } });
      // 미분류 keeps the draft's own words; the others say why the name went back (no buttons).
      if (linked && linked.id !== 'folder-unfiled') showFolderNotice(programFolderKeptText(linked.title, typed, why, boxed), why === 'name-conflict' || why === 'shared' || why === 'refused' ? 'warn' : 'choose', lines[index].id);
      else { const notice = controller.getState().folderNotice; if (notice) showFolderNotice(notice, 'warn'); }
      scheduleSave(); return;
    }
    const create = explicit && area.value.slice(0, area.selectionStart).split('\n').length - 1 === index;
    if (!create && held.left) return;
    const declared = controller.declareFolderLine(index, !create);
    heldFolderLineRef.current = declared || create ? null : { ...held, left: true };
    // B1 (W15): a folder this made is announced too.
    const notice = controller.getState().folderNotice ?? (declared ? programFolderCreatedNotice(state.working, controller.getState().working) ?? relinkedNotice(lines[index]?.id) : null);
    if (notice) showFolderOperation(notice, 'info', lines[index]?.id);
    if (!declared) return;
    const visibleRaw = controller.getState().raw;
    if (visibleRaw !== area.value) editorRef.current?.setValue(visibleRaw, { preserveSelection: true });
    scheduleSave();
  }
  /** N1 (QA3 block 2): linked folder lines a paste renamed go back to their folders' names together, each once
   *  the caret is off it, or all of them on leaving the editor or on Enter. Only those lines change. */
  function finishRenamedFolderLines(all: boolean) {
    const pending = renamedFolderLinesRef.current, controller = draftRef.current, area = textArea();
    if (pending.size && composingRef.current) finishAfterComposition.current = true;
    if (!pending.size || !controller || !area || composingRef.current || propsRef.current.readOnly) return;
    const state = controller.getState();
    if (state.invalid || area.value !== state.raw) return;
    const lines = M.getDocument(state.working, propsRef.current.docId)?.lines ?? [];
    const caretLine = area.value.slice(0, area.selectionStart).split('\n').length - 1, indexes: number[] = [];
    for (const id of [...pending]) {
      const index = lines.findIndex(line => line.id === id);
      if (index >= 0 && !all && index === caretLine) continue;
      pending.delete(id);
      if (index >= 0) indexes.push(index);
    }
    if (!indexes.length) return;
    // N7 review 4: pasted names put back are kept in the 복구함 too; not kept, the lines stay as pasted.
    const keep = propsRef.current.onKeepRefusedInput, rows = area.value.split('\n');
    const drafts = keep ? indexes.flatMap(index => {
      const binding = state.working.bindings.find(row => row.kind === 'scope' && row.docId === propsRef.current.docId && row.lineId === lines[index].id);
      const folder = binding?.kind === 'scope' ? state.working.folders.find(entry => entry.id === binding.scopeId) : undefined;
      const typed = (rows[index] ?? '').replace(/^ *- \//, '').trim();
      return folder && folder.id !== 'folder-unfiled' && typed && typed !== folder.title ? [{ title: `‘${folder.title}’ 폴더 줄에 쓴 이름`, raw: rows[index].trim() }] : [];
    }) : [];
    if (!drafts.every(draft => keep!(draft))) { for (const index of indexes) pending.add(lines[index].id); return; }
    const { selectionStart, selectionEnd, selectionDirection } = area;
    let raw = area.value, start = selectionStart, end = selectionEnd;
    if (!controller.restoreFolderLineNames(indexes, drafts.length > 0)) return;
    // The caret is carried through each restored line, the last line first so each step reads the raw it changes.
    const restored = controller.getState().raw, restoredLines = restored.split('\n');
    for (const index of [...indexes].sort((a, b) => b - a)) {
      const line = restoredLines[index], rows = raw.split('\n');
      start = restoredLineOffset(raw, index, line, start); end = restoredLineOffset(raw, index, line, end);
      rows[index] = line; raw = rows.join('\n');
    }
    editorRef.current?.setValue(restored, { selection: { start, end, direction: selectionDirection } });
    const notice = controller.getState().folderNotice; if (notice) showFolderNotice(notice, 'choose', lines[indexes[0]]?.id);
    scheduleSave();
  }
  /** N7 review 5: a finish skipped because a composition was on (a blur or the caret leaving mid-IME; 천지인
   *  confirms late) runs once the composition has ended and its text is in: the held line as left when the caret is
   *  not on it or the editor is not focused, and the pasted lines off the caret (all of them, unfocused). False while
   *  it should wait (still composing, or the composed text not in yet). */
  function finishLeftAfterComposition() {
    const controller = draftRef.current, area = textArea();
    if (!finishAfterComposition.current) return true;
    if (composingRef.current || !controller || !area || area.value !== controller.getState().raw) return false;
    finishAfterComposition.current = false;
    const held = heldFolderLineRef.current, focused = area.ownerDocument.activeElement === area;
    const index = held ? currentDoc()?.lines.findIndex(line => line.id === held.id) ?? -1 : -1;
    if (held && (!focused || index !== area.value.slice(0, area.selectionStart).split('\n').length - 1)) finishHeldFolderLine();
    finishRenamedFolderLines(!focused);
    return true;
  }
  /** One ↶ (or the notice's 되돌리기) right after a finished folder line moved puts the whole move back (D3 B). */
  function undoFolderMove() {
    const controller = draftRef.current;
    const id = folderNoticeRef.current?.operationId, operation = controller?.folderOperation();
    // N7 (review n6-fix): a name typed back, linked again, has no folder step to undo; ↶ is the text's own.
    if (!controller || id === undefined || operation?.id === id && !operation.undoable
      || composingRef.current || inputLockedRef.current || propsRef.current.readOnly) return false;
    // enter1 (11/10, 사용자 '권장대로'): text written after the folder step (the first task a folder line's Enter opened)
    // goes back first, by the text's own history; the folder step is undone once the text is as that step left it.
    if (textAfterFolderStep()) return false;
    const previous = controller.getState();
    const result = controller.undoFolderOperation(id);
    if (!result.ok) { showFolderNotice(result.reason, 'warn'); return true; }
    if (!shown(controller.getState().raw)) { controller.restoreState(previous); return false; }
    folderRawUndoRef.current = false;
    const notice = controller.getState().folderNotice; if (notice) showFolderNotice(notice, 'info');
    scheduleSave(); return true;
  }
  /** D3 B c: was this linked folder line's text already off its folder's name in that state? */
  function folderLineOff(state: TextWorkspaceState, lineId: string) {
    const line = M.getDocument(state, propsRef.current.docId)?.lines.find(entry => entry.id === lineId);
    const binding = line && state.bindings.find(row => row.kind === 'scope' && row.docId === propsRef.current.docId && row.lineId === line.id);
    const folder = binding && binding.kind === 'scope' ? state.folders.find(entry => entry.id === binding.scopeId) : undefined;
    return !!line && !!folder && FOLDER_LINE.test(line.text) && line.text.replace(/^ *- \//, '').trim() !== folder.title;
  }
  /** W15: show a folder notice in the notice row. A choice notice remembers its line, for its lifetime. */
  function showFolderNotice(text: string, tone: ProgramNoticeTone, lineId?: string, actions?: ProgramNoticeAction[]) {
    // memo-enter (11/10): a plain notice has no folder step for '글만 돌아갑니다' to speak of.
    folderRawUndoRef.current = false;
    draftRef.current?.endFolderNotice();
    const next = { text, tone, actions, lineId: tone === 'choose' ? lineId : undefined, shownAt: performance.now(), leftBlockAt: null, key: ++folderNoticeKeys.current };
    folderNoticeRef.current = next; setFolderNotice(next);
  }
  /** S4 v14 phone: a folder this draft made, its emptied line typed again and linked to it by name: announced as the
   *  new folder was, so D11 B's ⇤ keeps to the notice. Null for any other link. */
  function relinkedNotice(lineId: string | undefined) {
    const controller = draftRef.current, operation = controller?.folderOperation();
    return controller && lineId && operation?.kind === 'link' && operation.lineId === lineId && controller.freshFolderLine(lineId)
      ? programFolderRelinkedNotice(controller.getState().working, propsRef.current.docId, lineId) : null;
  }
  function showFolderOperation(text: string, tone: ProgramNoticeTone, lineId?: string, actions: ProgramNoticeAction[] = [], undoable = true) {
    const operation = draftRef.current?.folderOperation();
    if (!operation) { showFolderNotice(text, tone, lineId, actions); return; }
    const undo: ProgramNoticeAction = { label: '되돌리기', run: whenComposed(() => {
      if (folderNoticeRef.current?.operationId !== operation.id) { showFolderNotice('이 폴더 동작의 알림이 끝났습니다. 현재 입력은 유지했습니다.', 'warn'); return; }
      undoFolderMove();
    }) };
    folderRawUndoRef.current = undoable; folderStepRawRef.current = draftRef.current?.getState().raw ?? null;
    const next: FolderNotice = { text: operation.kind === 'scopes' ? operation.notice : text + (operation.notice ? ' · ' + operation.notice : ''), tone, actions: undoable ? [...actions, undo] : actions, lineId: tone === 'choose' ? lineId : undefined,
      shownAt: performance.now(), leftBlockAt: null, operationId: operation.id, key: ++folderNoticeKeys.current };
    folderNoticeRef.current = next; setFolderNotice(next);
  }
  /** enter1: has the text changed since the folder step in the notice (so ↶ is the text's own first)? */
  function textAfterFolderStep() { const raw = draftRef.current?.getState().raw; return folderStepRawRef.current !== null && raw !== undefined && raw !== folderStepRawRef.current; }
  function explainRawFolderUndo() { if (folderRawUndoRef.current && !textAfterFolderStep()) { folderRawUndoRef.current = false; setMessage('글만 돌아갑니다'); } }
  /** The notice after Enter moved a linked folder line or renamed its folder, with its buttons. */
  function showFolderMove(before: TextWorkspaceState, after: TextWorkspaceState, lineId: string, fromId: string, oldTitle: string) {
    const notice = programFolderMoveNotice(before, after, propsRef.current.docId, lineId, fromId);
    const title = M.getDocument(after, propsRef.current.docId)?.lines.find(line => line.id === lineId)?.text.replace(/^ *- \//, '').trim() ?? '';
    // Only right after the move: an edit since (a held press's composition too) leaves it, and says so.
    const everywhere: ProgramNoticeAction = { label: '모든 문서에 적용', run: whenComposed(() => { void renameEverywhere(before, fromId, title, oldTitle); }) };
    showFolderOperation(notice.text, notice.tone, lineId, notice.kind === 'moved' ? [everywhere] : []);
  }
  /** [모든 문서에 적용], right after the move only: the move is replaced by renaming the folder in every document
   *  (the 분류 rename path), applied to the state before the move so no folder of the new name is left behind. */
  async function renameEverywhere(before: TextWorkspaceState, fromId: string, title: string, oldTitle: string) {
    const controller = draftRef.current;
    if (!controller || !controller.canUndoFolderMove() || composingRef.current) { showFolderNotice('다른 편집이 있어 모든 문서에 적용하지 않았습니다. 분류 화면에서 이름을 바꿀 수 있습니다.', 'warn'); return; }
    const original = controller.folderRenameBase(fromId);
    if (!original) { showFolderNotice('그 뒤에 관련 입력이나 연결이 바뀌어 모든 문서에 적용하지 않았습니다. 현재 입력은 유지했습니다.', 'warn'); return; }
    const next = M.renameScope(original, fromId, title);
    if (next === original || !(await apply(next, '폴더 이름 바꾸기', undefined, undefined, original))) return;
    // The folder's lines as the rename left them: its 되돌리기 undoes only that (W15 review P1-2).
    showFolderOperation(programFolderRenamedEverywhere(next, fromId, oldTitle), 'info');
  }
  /** The editor the writing bar acts on: the body, or the focused folder region. */
  function barEditor() {
    if (propsRef.current.folderId) return regionPortRef.current?.activeEditor?.() ?? null;
    const instance = editorRef.current, area = textArea();
    return instance && area ? { instance, area } : null;
  }
  function readBarLine(): WritingBarLine | null {
    const target = barEditor();
    if (!target) return null;
    const raw = target.area.value, caret = target.area.selectionStart, state = currentState(), docId = propsRef.current.docId;
    let meta: TextEditorRowMeta | undefined;
    if (propsRef.current.folderId) {
      const snapshot = regionPortRef.current?.takeSnapshot();
      if (!snapshot) return null;
      meta = snapshot.lineId ? textEditorRows(state, docId).find(row => row.id === snapshot.lineId) : undefined;
    } else {
      const working = draftRef.current?.getState().working ?? state;
      meta = (documentInputRef.current?.paint(working) ?? textEditorRows(working, docId))[raw.slice(0, caret).split('\n').length - 1];
    }
    const line = writingBarLine(raw, caret, isTask => isTask ? taskMarkerLock(meta, state, docId) : null);
    if (!propsRef.current.folderId && meta?.scopeKind === 'folder'
      && !(folderNoticeRef.current?.operationId === draftRef.current?.folderOperation()?.id && draftRef.current?.freshFolderLine(meta.id))) {
      return { ...line, canIndent: false, canOutdent: false, structureLock: FOLDER_INDENT_NOTICE };
    }
    // A folder region keeps saved lines' kind and depth; offer only what its own check accepts.
    return propsRef.current.folderId
      ? folderBarLine(line, raw, caret, next => !!regionPortRef.current?.canApplyActive?.(next), FOLDER_STRUCTURE_LOCK, target.area.selectionEnd) : line;
  }
  function syncBarLine() {
    if (!propsRef.current.authoringMode) return;
    const next = readBarLine();
    if (next) setBarLine(previous => previous.canOutdent === next.canOutdent && previous.canIndent === next.canIndent
      && previous.isTask === next.isTask && previous.markerLock === next.markerLock && previous.structureLock === next.structureLock ? previous : next);
    // Input v2: a chip row belongs to the line it was opened on.
    const area = textArea();
    if (barModeRef.current.mode !== 'tools' && (!area || caretLine(area) !== barModeRef.current.line)) setBarMode('tools');
  }
  const caretLine = (area: HTMLTextAreaElement) => area.value.slice(0, area.selectionStart).split('\n').length - 1;
  function setBarMode(mode: BarMode, trigger: BarTrigger | null = null) {
    const area = textArea(), previous = barTriggerRef.current;
    barModeRef.current = { mode, line: area ? caretLine(area) : -1 };
    barTriggerRef.current = trigger;
    // A '/' row closing hands its slash context back (the ＋ menu, when it is what opened, keeps its own).
    if (previous?.kind === 'slash' && !panelRef.current && slashCommandRef.current?.lineId === previous.lineId) slashCommandRef.current = null;
    setBarModeState(mode);
  }
  /** 날짜 chips: the day goes with the held press, so a chip pressed mid-composition runs once it ends. */
  function pressDateChip(date: string) { barChipDate.current = date; pressBar('date'); }
  function runBar(action: WritingBarAction) {
    const target = barEditor();
    if (!target || inputLockedRef.current || propsRef.current.readOnly) return;
    if (!propsRef.current.folderId) finishHeldFolderLine(true);
    if (action === 'menu') { if (propsRef.current.folderId) void openRegionInsertMenu(); else openCurrentInsertMenu(target.instance.getSelection().lineIndex); return; }
    if (action === 'date' || action === 'folder' || action === 'undo' || action === 'redo' || action === 'repeat') { runBarWrite(action); syncBarLine(); return; }
    if (action === 'enter') target.instance.enter(true);
    else if (action === 'task') {
      const line = readBarLine();
      if (line?.markerLock) return;
      const plan = toggleTaskLine(target.area.value, target.area.selectionStart);
      target.instance.replaceRange(plan.start, plan.end, plan.text, { selectionAfter: { start: plan.caret, end: plan.caret } });
    } else {
      indentRefusal.current = null;
      if (!target.instance.indent(action === 'outdent')) explainIndent(action, target.area);
    }
    syncBarLine();
  }
  /** Input v2 stage 1: what the bar's chip rows write. Each is one write in today's grammar through a path the editor
   *  already has (N9 날짜 칩 for a task, insertNative for a head line or the `- /` line), so one press is one ↶. */
  function runBarWrite(action: 'date' | 'folder' | 'undo' | 'redo' | 'repeat') {
    // A press from a chip row gives the bar its tools back (the ＋ menu's dialog does it when it opens).
    const trigger = barTriggerRef.current;
    if (barModeRef.current.mode !== 'tools') setBarMode('tools');
    if (action === 'undo') { undoInput(); return; }
    if (action === 'redo') { redoInput(); return; }
    if (action === 'repeat') { openRepeatFromTools(); return; }
    if (action === 'date') { const date = barChipDate.current; barChipDate.current = null; if (date) runDateChoice(date, trigger); return; }
    const activeLine = propsRef.current.folderId ? regionLineRef.current : currentDoc()?.lines[textArea() ? caretLine(textArea()!) : -1]?.id;
    if (action === 'folder' && activeLine && currentRow(activeLine)?.progressTargetId) { openFolderPanel(activeLine); return; }
    const area = textArea();
    if (propsRef.current.folderId || !area) return;
    const plan = programFolderSeedPlan(area.value, area.selectionStart), before = currentState();
    folderSeedRef.current = null;
    if (!insertNative(plan.offset, plan.text, plan.caret)) return;
    const seeded = currentDoc()?.lines[area.value.slice(0, plan.caret).split('\n').length - 1];
    if (seeded?.text === '- /') folderSeedRef.current = { docId: propsRef.current.docId, lineId: seeded.id, inPlace: plan.text === '- /', before };
    requestAnimationFrame(syncPicker);
  }
  /** IV-P3-1: the suggestions finished the `- /` line the bar's 폴더 wrote: one ↶ takes back both (a typed `- /` keeps
   *  the usual folder steps). */
  function rememberBarFolder(lineId: string) {
    const seed = folderSeedRef.current, state = draftRef.current?.getState();
    if (!seed || !state || seed.lineId !== lineId || seed.docId !== propsRef.current.docId) return;
    folderSeedRef.current = null;
    barFolderUndo.current = { docId: seed.docId, before: seed.before, after: state.working, raw: state.raw, redo: false };
  }
  function undoBarFolder() { return stepBarFolder(false); }
  function redoBarFolder() { return stepBarFolder(true); }
  function stepBarFolder(redo: boolean) {
    const last = barFolderUndo.current, state = draftRef.current?.getState();
    if (!last || !state || last.docId !== propsRef.current.docId || state.raw !== last.raw) { if (last && state && state.raw !== last.raw) barFolderUndo.current = null; return false; }
    if (last.redo !== redo) {
      // Stage 2: after a chain's folder was taken back, the next ↶ takes back the head line its date chip wrote.
      if (redo || !last.then) return false;
      if (actionsDisabled() || composingRef.current || regionPendingRef.current) return true;
      const back = apply(last.then, '날짜 줄 되돌리기');
      barFolderUndo.current = null; void back;
      return true;
    }
    if (actionsDisabled() || composingRef.current || regionPendingRef.current) return true;
    const done = apply(redo ? last.after : last.before, redo ? '폴더 선택' : '폴더 선택 되돌리기');
    // The folder step's own notice (and its 되돌리기) would now undo something already undone.
    folderNoticeRef.current = null; setFolderNotice(null);
    const raw = draftRef.current?.getState().raw;
    barFolderUndo.current = raw !== undefined && raw !== last.raw ? { ...last, raw, redo: !redo } : null;
    void done;
    return true;
  }
  /** A task line (N9): its own date, as the line menu's chip sets it. Any other line: the day's head line (Q1, R1). */
  function runDateChoice(date: string, trigger: BarTrigger | null = null) {
    const area = barEditor()?.area ?? textArea(), doc = currentDoc();
    if (!area || !doc) return;
    const line = propsRef.current.folderId ? doc.lines.find(item=>item.id===regionLineRef.current) : doc.lines[caretLine(area)], target = line ? currentRow(line.id)?.progressTargetId : undefined;
    // Stage 2: the chips a typed `[` opened: that `[…` line turns into the day's head line, in one edit (one ↶).
    if (trigger?.kind === 'bracket') {
      const index = doc.lines.findIndex(item => item.id === trigger.lineId), bracket = doc.lines[index];
      if (!bracket || !/^\[[0-9/.-]*$/.test(bracket.text) || area.value !== draftRef.current?.getState().raw) { setMessage(BAR_LINE_CHANGED); return; }
      const start = doc.lines.slice(0, index).reduce((sum, item) => sum + item.text.length + 1, 0), before = currentState();
      const plan = programBracketDatePlan(area.value, start, start + bracket.text.length, date);
      if (plan && applyNativeRange(plan.start, plan.end, plan.text, plan.caret, plan.nextRaw)) chainFolders(date, before);
      return;
    }
    const task = target ? M.tasks(currentState()).find(item => item.id === target) : undefined;
    if (line && target && task) {
      if(locationAvailability().blocked){setMessage('저장을 확인한 뒤 옮겨 주세요.');return;}
      const policy=locationPolicy(line.id);
      if(policy.kind==='blocked'){setMessage(policy.message);return;}
      if (policy.kind === 'move') { void performTaskLocation(line.id,{kind:'date',date}); return; }
      // Exceptions own a receipt-bound undo. Never stage a speculative legacy whole-frame record here.
      void applyDateChip(line.id, date);
      return;
    }
    const plan = programDateHeaderPlan(area.value, area.selectionStart, date), before = currentState();
    // Stage 2: a new head line (not a day already there) is followed by the folder chips for its first line.
    if (plan && insertNative(plan.offset, plan.text, plan.caret) && plan.text.includes(`[${date}]`)) chainFolders(date, before);
  }
  /** N9's date path is not in the native history, so ↶ right after a bar date chip (the text still as the chip left
   *  it) puts back the document as it was right before the chip, and ↷ then the chip's (through N9's own path again).
   *  Any other edit ends it, and ↶ is the text's own again. */
  function undoBarDate() { return stepBarDate(false); }
  function redoBarDate() { return stepBarDate(true); }
  function stepBarDate(redo: boolean) {
    const last = barDateUndo.current, state = draftRef.current?.getState();
    if (!last || !state || last.docId !== propsRef.current.docId || state.raw !== last.raw) { if (last && state && state.raw !== last.raw) barDateUndo.current = null; return false; }
    if (last.redo !== redo) return false;
    if (last.suggestion && !taskDateSuggestionUndoFrameMatches(state.working, last.docId, last.before, last.after, redo)) { barDateUndo.current = null; return false; }
    if (actionsDisabled() || composingRef.current || regionPendingRef.current) return true;
    const done = redo ? apply(last.after, '항목 날짜·시간', { taskId: last.taskId, date: last.date, time: last.time }) : apply(last.before, '항목 날짜·시간 되돌리기');
    const raw = draftRef.current?.getState().raw;
    barDateUndo.current = raw !== undefined && raw !== last.raw ? { ...last, raw, redo: !redo } : null;
    if (!redo && raw !== last.raw) setDateApplied(null);
    void done;
    return true;
  }
  /** 고르기: a task opens its date form (N9 날짜 고르기); another line, the phone's own date picker, then the head line. */
  function pickBarDate() {
    const area = barEditor()?.area??textArea(), doc = currentDoc(), input = datePickRef.current;
    if (!area || !doc || !input || inputLockedRef.current || propsRef.current.readOnly) return;
    const line = propsRef.current.folderId?doc.lines.find(item=>item.id===regionLineRef.current):doc.lines[caretLine(area)], target = line ? currentRow(line.id)?.progressTargetId : undefined;
    // F9 W-MENU-24: a task's 고르기 is the calendar sheet, as in its ⋮ (the time stays in 진행 [날짜·시간]).
    if (line && target && M.tasks(currentState()).some(task => task.id === target)) { setBarMode('tools'); openDateSheet(line.id); return; }
    input.value = today();
    try { input.showPicker(); } catch { input.focus(); }
  }
  function datePicked(value: string) {
    const area = textArea(), trigger = barTriggerRef.current;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !area) return;
    setBarMode('tools'); area.focus({ preventScroll: true });
    if (composingRef.current) return;
    runDateChoice(value, trigger);
  }
  /** × on suggestions the 폴더 button opened: the `- /` it wrote goes too, if the line is still just that. */
  function closeBarPicker() {
    const seed = folderSeedRef.current, view = pickerRef.current;
    folderSeedRef.current = null;
    dismissPicker();
    if (!seed || !view || seed.lineId !== view.lineId || seed.docId !== propsRef.current.docId) return;
    const area = textArea(), controller = draftRef.current, doc = currentDoc();
    if (!area || !controller || !doc || composingRef.current || inputLockedRef.current || area.value !== controller.getState().raw) return;
    const index = doc.lines.findIndex(line => line.id === seed.lineId);
    // Stage 2: a seed made from a typed '/' or '-/' gives that back (the line still just its `- /`).
    if (seed.origin && index >= 0) {
      const text = doc.lines[index].text, indent = /^[ \t]*/.exec(text)![0];
      if (text !== `${indent}- /`) return;
      const at = doc.lines.slice(0, index).reduce((sum, line) => sum + line.text.length + 1, 0) + indent.length;
      editorRef.current?.replaceRange(at, at + 3, seed.origin, { selectionAfter: { start: at + seed.origin.length, end: at + seed.origin.length } });
      return;
    }
    if (index < 0 || doc.lines[index].text !== '- /' || !seed.inPlace && index === 0) return;
    const start = doc.lines.slice(0, index).reduce((sum, line) => sum + line.text.length + 1, 0), from = seed.inPlace ? start : start - 1;
    editorRef.current?.replaceRange(from, start + 3, '', { selectionAfter: { start: from, end: from } });
  }
  /** The toolbar's ↶ ↷ 반복, also run from the bar's ⋯ row (Q2: hidden with the toolbar while the keyboard is up). */
  function undoInput() {
    const props = propsRef.current, state = draftRef.current?.getState();
    if (stepLocation(false)) return;
    if(stepScheduleUndo())return;
    if(propsRef.current.onUndoTaskLocation?.())return;
    if (undoBarFolder()) return;
    if (undoFolderMove() || undoRepeatCheck()) return;
    if (undoBarDate()) return;
    if (props.folderId && regionPendingRef.current) regionPortRef.current?.undo?.(); else if (orderHistoryRef.current.hasEntries()) nativeHistory('historyUndo'); else if (props.authoringMode && !props.folderId) editorRef.current?.undo(); else if (props.onUndo && !state?.dirty) void props.onUndo(); else if (!props.folderId) editorRef.current?.undo();
  }
  /** The steps ↶ ↷ take before the text's own history, in the same order (undoInput, redoInput); true when one ran. */
  function historyStep(type: 'historyUndo' | 'historyRedo') {
    if (stepLocation(type === 'historyRedo')) return true;
    if(type==='historyUndo'&&stepScheduleUndo())return true;
    if(type==='historyUndo'&&propsRef.current.onUndoTaskLocation?.())return true;
    return type === 'historyUndo' ? undoBarFolder() || undoFolderMove() || undoRepeatCheck() || undoBarDate() : redoBarFolder() || redoBarDate();
  }
  const historyStepFn = useRef(historyStep); historyStepFn.current = historyStep;
  function redoInput() {
    if (stepLocation(true)) return;
    const props = propsRef.current, state = draftRef.current?.getState();
    if (redoBarFolder() || redoBarDate()) return;
    // 7k stage 1: in a folder view ↷ goes where its ↶ went (the saved steps), not to the hidden whole editor's history.
    if (orderHistoryRef.current.hasEntries() || props.authoringMode && !props.folderId) nativeHistory('historyRedo'); else if (props.onRedo && !state?.dirty) void props.onRedo();
  }
  function openRepeatFromTools() {
    const props = propsRef.current;
    if (!props.repeatContext) { props.onOpenPersonalAuthoring?.(); return; }
    const area = textArea(), index = area ? area.value.slice(0, area.selectionStart).split('\n').length - 1 : -1;
    openRepeatPanel(currentDoc()?.lines[index]?.id ?? null);
  }
  /** '/' on an empty line (W12): its menu leads with the folders (input v2 stage 1, '얹기'). A folder replaces the '/'
   *  with `- /이름` and links it in one change (one ↶), as a suggestion does; the slash menu's context check applies. */
  async function applySlashFolder(scopeId: string) {
    const slash = slashCommandRef.current, controller = draftRef.current, doc = currentDoc(), area = textArea(), docId = propsRef.current.docId;
    if (!slash || !controller || !doc || !area || inputLockedRef.current || propsRef.current.readOnly || composingRef.current || regionPendingRef.current || checkPendingRef.current) return;
    const before = currentState(), raw = controller.getState().raw, line = doc.lines.find(item => item.id === slash.lineId);
    if (before !== slash.workspace || controller.generation() !== slash.generation || raw !== slash.raw || area.value !== raw || !line || line.text.trim() !== '/') {
      setMessage('추가 위치의 문맥이 바뀌었습니다. 현재 줄에서 다시 열어 주세요.'); return;
    }
    const slot = { ...before, documents: before.documents.map(entry => entry.id !== docId ? entry
      : { ...entry, lines: entry.lines.map(item => item.id === line.id ? { ...item, text: `${/^ */.exec(line.text)![0]}- /` } : item) }) };
    // Only empty lines may sit under it: a deeper line would become the folder's.
    const row = M.rowMeta(slot, docId).find(item => item.id === line.id);
    if (!row || doc.lines.slice(row.index + 1, row.subtreeEndIndex).some(item => item.text.trim())) { setMessage('이 줄 아래에 들여 쓴 줄이 있어 폴더를 넣지 않았습니다. 빈 줄에서 다시 열어 주세요.'); return; }
    const linked = planFolderPickerLink(slot, docId, line.id, scopeId);
    if (linked.problem) { setMessage(linked.problem); return; }
    dismissPanel(false, false);
    // Not as a picker target: the draft would re-plan from the '/' line, which is not a `- /` line yet.
    const done = apply(linked.state, '폴더 선택'), written = draftRef.current?.getState();
    // IV-P3-1: one ↶ puts the '/' line back as it was (installed before the save starts, so a ↶ during it counts).
    if (written && written.raw !== raw) barFolderUndo.current = { docId, before, after: written.working, raw: written.raw, redo: false };
    if (!await done) return;
    const lines = M.getDocument(currentState(), docId)?.lines ?? [], at = lines.findIndex(item => item.id === line.id);
    if (at < 0) return;
    const caret = lines.slice(0, at + 1).reduce((length, item) => length + item.text.length + 1, -1);
    pickerRecent.current = [scopeId, ...pickerRecent.current.filter(id => id !== scopeId)].slice(0, 30);
    textArea()?.focus({ preventScroll: true }); textArea()?.setSelectionRange(caret, caret); editorRef.current?.refresh();
  }
  /** 새 폴더… in the '/' menu: the '/' becomes `- /` and the suggestions take the name (as typing `- /` does). */
  function slashNewFolder() {
    const slash = slashCommandRef.current, doc = currentDoc(), line = slash && doc?.lines.find(item => item.id === slash.lineId);
    if (!doc || !line) return;
    const start = doc.lines.slice(0, doc.lines.indexOf(line)).reduce((sum, item) => sum + item.text.length + 1, 0) + line.text.indexOf('/');
    if (insertNative(start, '- /', start + 3)) { textArea()?.focus({ preventScroll: true }); requestAnimationFrame(syncPicker); }
  }
  /** Input v2 stage 2 (11/7), C1: the phone bar is up (its CSS shows it only while the body has focus on a narrow screen,
   *  in writing, not in a folder view). The PC has no bar and keeps its '/' menu. */
  const barShownNow = () => !!propsRef.current.authoringMode && !propsRef.current.folderId && !!barRef.current?.getClientRects().length;
  /** Stage 2: what one typed character opens on the phone bar (C1–C6): a lone `[` on an empty line the date chips, a
   *  lone `/` the folder chips, `-/` its `- /` and the folder suggestions. An open row closes once its line leaves its
   *  form (`[a`, `/x`, a `]`, anything typed on a chain's empty line); the text stays as typed. */
  function handleBarTrigger(beforeRaw: string, inputType: string) {
    const area = textArea(), controller = draftRef.current;
    if (!area || !controller) return;
    const raw = area.value, caret = area.selectionStart, rowStart = raw.lastIndexOf('\n', caret - 1) + 1, next = raw.indexOf('\n', caret);
    const rowEnd = next < 0 ? raw.length : next, text = raw.slice(rowStart, rowEnd), index = raw.slice(0, caret).split('\n').length - 1;
    const open = barTriggerRef.current;
    if (open && barModeRef.current.mode !== 'tools') {
      const line = currentDoc()?.lines[index], form = open.kind === 'bracket' ? /^\[[0-9/.-]*$/ : open.kind === 'slash' ? /^[ \t]*\/$/ : /^$/;
      if (!line || line.id !== open.lineId || !form.test(text)) setBarMode('tools');
      else if (open.kind === 'bracket') setBracketText(text);
    }
    if (!barShownNow() || composingRef.current || !['insertText', 'insertReplacementText'].includes(inputType)) return;
    // C3–C4: one character typed at the end of its line (a paste, a deletion or a replacement does not count).
    if (area.selectionEnd !== caret || caret !== rowEnd || caret < 1 || raw.slice(0, caret - 1) + raw.slice(caret) !== beforeRaw) return;
    if (inputLockedRef.current || propsRef.current.readOnly || panelRef.current || regionPendingRef.current || checkPendingRef.current) return;
    // C5: not inside a code fence.
    if (raw.split('\n').slice(0, index).filter(line => /^\s*(```|~~~)/.test(line)).length % 2) return;
    const previous = text.slice(0, -1);
    queueMicrotask(() => {
      if (composingRef.current || area.value !== raw || area.selectionStart !== caret || controller.getState().invalid || controller.getState().raw !== raw) return;
      const line = currentDoc()?.lines[index];
      if (!line || line.text !== text) return;
      if (previous === '' && text === '[') { setBracketText(text); setBarMode('date', { kind: 'bracket', lineId: line.id }); return; }
      if (/^[ \t]*$/.test(previous) && /^[ \t]*\/$/.test(text)) { openSlashFolders(index); return; }
      if (/^[ \t]*-$/.test(previous) && /^[ \t]*-\/$/.test(text)) fixDashSlash(index);
    });
  }
  const barTriggerFn = useRef(handleBarTrigger); barTriggerFn.current = handleBarTrigger;
  /** Stage 2: a typed '/' on an empty line opens the folder chips (with [메뉴] for the ＋ menu); the keyboard stays. */
  function openSlashFolders(index: number) {
    const controller = draftRef.current, line = currentDoc()?.lines[index];
    if (!controller || !line || line.text.trim() !== '/') return;
    setBarMode('folders', { kind: 'slash', lineId: line.id });
    slashCommandRef.current = { lineId: line.id, raw: controller.getState().raw, workspace: currentState(), generation: controller.generation() };
  }
  /** Stage 2: `-/` becomes `- /` (one edit of its own, one ↶) and the folder suggestions answer it; × gives `-/` back. */
  function fixDashSlash(index: number) {
    const doc = currentDoc(), line = doc?.lines[index], before = currentState(), raw = textArea()?.value;
    if (!doc || !line || !/^[ \t]*-\/$/.test(line.text) || raw === undefined) return;
    const start = doc.lines.slice(0, index).reduce((sum, item) => sum + item.text.length + 1, 0) + line.text.length - 2;
    slashCommandRef.current = null;
    if (!applyNativeRange(start, start + 2, '- /', start + 3, raw.slice(0, start) + '- /' + raw.slice(start + 2))) return;
    const seeded = currentDoc()?.lines[index];
    if (seeded && /^[ \t]*- \/$/.test(seeded.text)) folderSeedRef.current = { docId: propsRef.current.docId, lineId: seeded.id, inPlace: true, before, origin: '-/' };
    requestAnimationFrame(syncPicker);
  }
  /** Stage 2: one native edit replacing a range (a `[` line's date chip), checked and applied as insertNative does. */
  function applyNativeRange(start: number, end: number, text: string, caret: number, nextRaw: string) {
    const controller = draftRef.current, area = textArea();
    if (!controller || !area || inputLockedRef.current || propsRef.current.readOnly || controller.getState().invalid || composingRef.current || panelComposingRef.current || regionPendingRef.current || checkPendingRef.current) { setMessage('현재는 항목을 추가할 수 없습니다. 입력은 유지했습니다.'); return false; }
    const raw = controller.getState().raw;
    if (area.value !== raw || raw.slice(0, start) + text + raw.slice(end) !== nextRaw) { setMessage(BAR_LINE_CHANGED); return false; }
    if (!controller.prepareRaw(nextRaw, { inputType: 'insertText', compositionGeneration: compositionGeneration.current }, true)) { setMessage('이 위치에는 추가할 수 없습니다. 원문은 유지했습니다.'); return false; }
    const applied = editorRef.current?.replaceRange(start, end, text, { selectionAfter: { start: caret, end: caret } });
    if (!applied || controller.getState().invalid || controller.getState().raw !== nextRaw) { setMessage('브라우저가 추가를 적용하지 못했습니다. 현재 입력은 유지했습니다.'); return false; }
    editorRef.current?.refreshViewport(); rememberPosition();
    revealProgramEditorLine(area, nextRaw.slice(0, caret).split('\n').length - 1);
    return true;
  }
  /** Stage 2: a date chip that wrote a new head line hands the bar to the folder chips for the empty line under it. */
  function chainFolders(date: string, before: TextWorkspaceState) {
    const area = textArea(), doc = currentDoc();
    if (!area || !doc || !propsRef.current.authoringMode || propsRef.current.folderId) return;
    const index = caretLine(area), line = doc.lines[index];
    const above = doc.lines.slice(0, index).reverse().find(item => item.text.trim());
    if (!line || line.text.trim() || above?.text.trim() !== `[${date}]`) return;
    setBarMode('folders', { kind: 'chain', lineId: line.id, raw: area.value, before });
  }
  /** Stage 2: a folder chip. A typed '/' turns into `- /이름` and its link (the '/' menu's folder path); the empty line
   *  under a new head line gets them (applyLineFolder). Either is one change, one ↶. */
  function runBarFolder(scopeId: string) {
    const trigger = barTriggerRef.current;
    if (!trigger || composingRef.current) { if (composingRef.current) setMessage(BAR_COMPOSING_NOTICE); return; }
    if (trigger.kind === 'slash') {
      // The line is still the lone '/' it was opened on (a save in between does not change that): its context is now.
      const controller = draftRef.current, line = currentDoc()?.lines.find(item => item.id === trigger.lineId);
      if (!controller || !line || line.text.trim() !== '/' || textArea()?.value !== controller.getState().raw) { setBarMode('tools'); setMessage(BAR_LINE_CHANGED); return; }
      slashCommandRef.current = { lineId: line.id, raw: controller.getState().raw, workspace: currentState(), generation: controller.generation() };
      void applySlashFolder(scopeId); setBarMode('tools'); return;
    }
    if (trigger.kind === 'chain') { setBarMode('tools'); void applyLineFolder(trigger, scopeId); }
  }
  /** Stage 2: the folder chips' line under a new head line: `- /이름` and its link in one change, after the same context
   *  check as the '/' menu (the line, its text, nothing else changed since the head line came). */
  async function applyLineFolder(trigger: Extract<BarTrigger, { kind: 'chain' }>, scopeId: string) {
    const controller = draftRef.current, doc = currentDoc(), area = textArea(), docId = propsRef.current.docId;
    if (!controller || !doc || !area || inputLockedRef.current || propsRef.current.readOnly || composingRef.current || regionPendingRef.current || checkPendingRef.current) return;
    const before = currentState(), raw = controller.getState().raw, line = doc.lines.find(item => item.id === trigger.lineId);
    if (raw !== trigger.raw || area.value !== raw || !line || line.text.trim()) { setMessage(BAR_LINE_CHANGED); return; }
    const slot = { ...before, documents: before.documents.map(entry => entry.id !== docId ? entry
      : { ...entry, lines: entry.lines.map(item => item.id === line.id ? { ...item, text: `${/^ */.exec(line.text)![0]}- /` } : item) }) };
    const row = M.rowMeta(slot, docId).find(item => item.id === line.id);
    if (!row || doc.lines.slice(row.index + 1, row.subtreeEndIndex).some(item => item.text.trim())) { setMessage('이 줄 아래에 들여 쓴 줄이 있어 폴더를 넣지 않았습니다.'); return; }
    const linked = planFolderPickerLink(slot, docId, line.id, scopeId);
    if (linked.problem) { setMessage(linked.problem); return; }
    const done = apply(linked.state, '폴더 선택'), written = draftRef.current?.getState();
    // One ↶ takes the folder line back and leaves the head line (IV-P3-1's record); the next ↶ takes the head line too.
    if (written && written.raw !== raw) barFolderUndo.current = { docId, before, after: written.working, raw: written.raw, redo: false, then: trigger.before };
    if (!await done) return;
    const lines = M.getDocument(currentState(), docId)?.lines ?? [], at = lines.findIndex(item => item.id === line.id);
    if (at < 0) return;
    const caret = lines.slice(0, at + 1).reduce((length, item) => length + item.text.length + 1, -1);
    pickerRecent.current = [scopeId, ...pickerRecent.current.filter(id => id !== scopeId)].slice(0, 30);
    textArea()?.focus({ preventScroll: true }); textArea()?.setSelectionRange(caret, caret); editorRef.current?.refresh();
  }
  /** Stage 2: [＋ 새 폴더] on the folder chips: the line becomes `- /` (a typed '/' keeps its place) and the folder
   *  suggestions take the name; × on them gives the '/' back (a chain's line goes back to empty). */
  function barNewFolder() {
    const trigger = barTriggerRef.current, area = textArea(), doc = currentDoc();
    if (!trigger || !area || !doc) return;
    if (composingRef.current) { setMessage(BAR_COMPOSING_NOTICE); return; }
    const index = doc.lines.findIndex(item => item.id === trigger.lineId), line = doc.lines[index], before = currentState();
    setBarMode('tools'); slashCommandRef.current = null;
    if (!line || (trigger.kind === 'chain' ? line.text.trim() || area.value !== trigger.raw : line.text.trim() !== '/')) { setMessage(BAR_LINE_CHANGED); return; }
    const start = doc.lines.slice(0, index).reduce((sum, item) => sum + item.text.length + 1, 0);
    const at = trigger.kind === 'slash' ? start + line.text.indexOf('/') : start + line.text.length;
    if (!insertNative(at, trigger.kind === 'slash' ? '- ' : '- /', at + 3)) return;
    const seeded = currentDoc()?.lines[index];
    if (seeded) folderSeedRef.current = { docId: propsRef.current.docId, lineId: seeded.id, inPlace: true, before, ...(trigger.kind === 'slash' ? { origin: '/' as const } : {}) };
    area.focus({ preventScroll: true }); requestAnimationFrame(syncPicker);
  }
  /** Stage 2: [메뉴] on a typed '/' row: the ＋ menu as the '/' opened it before (the panel takes the keyboard down). */
  function barMenu() {
    const trigger = barTriggerRef.current, doc = currentDoc(), index = trigger && doc ? doc.lines.findIndex(item => item.id === trigger.lineId) : -1;
    setBarMode('tools');
    if (index >= 0) openCurrentInsertMenu(index);
  }
  /** Stage 2 (오늘 시작 줄): today's head line from above the body, in the same press that brings the keyboard up. */
  function startToday() {
    const area = textArea();
    if (!area) return;
    area.focus({ preventScroll: true });
    const plan = programTodayStartPlan(area.value, today()), before = currentState();
    if (plan && insertNative(plan.offset, plan.text, plan.caret)) chainFolders(today(), before);
  }
  /** D11: say why these folder lines do not move by text, and remember which ones it was about (N5 3b review). */
  function refuseFolderIndent(lineIds: string[]) {
    folderRefusal.current = { docId: propsRef.current.docId, lineIds };
    setMessage(FOLDER_INDENT_NOTICE);
  }
  /** S5: a refused ⇤·⇥ says why: the editor's state, the model's reason, or the line's own shape. A linked folder
   *  line or a protection rule already showed its notice, and a folder region shows its structure lock. */
  function explainIndent(action: 'indent' | 'outdent', area: HTMLTextAreaElement) {
    const recorded = indentRefusal.current; indentRefusal.current = null;
    if (recorded?.kind === 'folder' || recorded?.kind === 'protected') return;
    if (propsRef.current.folderId) { setMessage(FOLDER_STRUCTURE_LOCK); return; }
    const state = draftRef.current?.getState();
    const refusal = recorded ?? (inputLockedRef.current || propsRef.current.readOnly ? { kind: 'busy', why: 'locked' } as const
      : checkPendingRef.current ? { kind: 'busy', why: 'checking' } as const : state?.invalid ? { kind: 'busy', why: 'invalid' } as const
      : { kind: 'shape', why: programIndentShape(area.value, area.selectionStart, action === 'outdent') } as const);
    setMessage(programIndentRefusalNotice(action, refusal));
  }
  /** 저장 재설계 B (11/10): one edit the writing rules planned, through the native editor (so one ↶ takes it back), its
   *  splice handed to the draft with it (none for whole lines, which the model matches by their words). */
  function applyWritingEdit(splice: WritingSplice, submitted: WritingSplice | undefined, selectionAfter?: { start: number; end: number }) {
    const area = textArea(), editor = editorRef.current; if (!area || !editor) return false;
    plannedInputRef.current = { raw: area.value.slice(0, splice.start) + splice.text + area.value.slice(splice.end), splice: submitted };
    applyingPlanRef.current = true;
    try { return editor.replaceRange(splice.start, splice.end, splice.text, selectionAfter ? { selectionAfter } : undefined) === true; }
    finally { applyingPlanRef.current = false; plannedInputRef.current = null; setWritingCaretLine(area.value.slice(0, area.selectionStart).split('\n').length - 1); }
  }
  function showWritingNotice(tone: ProgramNoticeTone, text: string, actions?: ProgramNoticeAction[], detail?: string, paint?: number[]) {
    setWritingNotice({ tone, text, detail, actions, key: ++writingNoticeKeys.current, paint });
  }
  /** A date head's name for a question: "내일 11월 11일", "11월 14일 (토)", "날짜 미정". */
  function headDateName(date: string | null | undefined) {
    if (!date) return '날짜 미정';
    const near = programDateLabel(date, today());
    return ['오늘', '내일', '어제'].includes(near) ? `${near} ${programCalendarDate(date, today(), false)}` : near;
  }
  /** The writing rules' outcome for one key or paste: a planned edit (with K1's notice when a mark went whole), a key
   *  kept (with why), or K2's question. */
  function runWritingPlan(plan: WritingPlan, typed: WritingSplice, type: string) {
    const area = textArea(); if (!area) return;
    if (plan.kind === 'keep') {
      if (plan.why === 'indent-refused') { indentRefusal.current = { kind: 'model', reason: null }; explainIndent(typed.text ? 'indent' : 'outdent', area); }
      else if (plan.why === 'folder-indent') setMessage(FOLDER_INDENT_NOTICE);
      else if (plan.why === 'date-head') showWritingNotice('info', '날짜 머리는 날짜 고르기로 바꿉니다');
      return;
    }
    if (plan.kind === 'ask') { askMerge(plan, typed); return; }
    // A planned paste's own input (checkTextLimit) comes inside applyWritingEdit: notices are counted from before it.
    const before = area.value, removed = before.slice(plan.splice.start, plan.splice.end), since = writingNoticeKeys.current;
    if (!applyWritingEdit(plan.splice, plan.structural ? undefined : plan.splice, plan.selectionAfter)) return;
    // K1: ⌫ took a mark whole; the title stays as plain text. One ↶ (or 되돌리기) puts the mark back.
    const property = /-\s+(메모|날짜|시간):/.exec(removed);
    if ((plan.why === 'mark' || plan.why === 'join') && (/-\s+\[[^\]\n]*\]/.test(removed) || property))
      showWritingNotice('info', property && !/-\s+\[/.test(removed) ? `${property[1]} 표식을 지웠습니다` : '할 일 표식을 지웠습니다', [{ label: '되돌리기', run: whenComposed(() => { setWritingNotice(null); undoInput(); }) }]);
    else if (type === 'insertFromPaste') notePaste(plan.splice.start, plan.splice.text, since);
  }
  /** K2: a deletion that would break a date or folder head paints the section it heads and asks first. [합치기] takes the
   *  head away (a folder's lines move out one step with it); [그대로 두기] changes nothing. The paint is drawn, not selected:
   *  the caret stays where it was, so nothing typed next (a composition included) can replace the head. */
  function askMerge(plan: Extract<WritingPlan, { kind: 'ask' }>, typed: WritingSplice) {
    const area = textArea(), state = draftRef.current?.getState(); if (!area || !state) return;
    const raw = area.value, lines = raw.split('\n'), at = (index: number) => lines.slice(0, index).reduce((sum, line) => sum + line.length + 1, 0);
    const first = plan.heads[0];
    const rows = M.rowMeta(state.working, propsRef.current.docId) as ({ kind: string; date?: string | null; subtreeEndIndex?: number })[];
    const sectionEnd = first.kind === 'date' ? (index => index < 0 ? lines.length : index)(rows.findIndex((row, index) => index > first.index && row.kind === 'date'))
      : rows[first.index]?.subtreeEndIndex ?? first.index + 1;
    const paint = Array.from({ length: Math.max(1, sectionEnd - first.index) }, (_, offset) => first.index + offset);
    let text: string, detail: string;
    if (first.kind === 'date') {
      const next = rows.findIndex((row, index) => index > first.index && row.kind === 'date'), end = next < 0 ? rows.length : next;
      const count = rows.slice(first.index + 1, end).filter(row => row.kind === 'task').length;
      const above = rows.slice(0, first.index).reverse().find(row => row.kind === 'date');
      const into = above ? programDateLabel(above.date, today()) : '날짜 없음';
      text = `‘${headDateName(rows[first.index]?.date)}’ 구획을 위 구획과 합칠까요?`;
      detail = `할 일 ${count}개가 ${into}${ro(into)}`;
    } else {
      const end = rows[first.index]?.subtreeEndIndex ?? first.index + 1, count = rows.slice(first.index + 1, end).filter(row => row.kind === 'task').length;
      text = `‘${first.text.replace(/^ *- \//, '').trim()}’ 폴더 줄을 지우고 위와 합칠까요?`;
      detail = `할 일 ${count}개가 이 폴더 줄 밖으로`;
    }
    const keep = () => { setWritingNotice(null); const now = textArea(); if (now && now.value === raw) now.focus({ preventScroll: true }); };
    const merge = () => {
      setWritingNotice(null); const now = textArea(); if (!now || now.value !== raw) return;
      const splice = plan.merge.splice;
      applyWritingEdit(splice, plan.merge.structural ? undefined : splice, { start: splice.start, end: splice.start });
    };
    showWritingNotice('choose', text, [{ label: '합치기', run: whenComposed(merge) }, { label: '그대로 두기', run: whenComposed(keep) }], detail, paint);
  }
  /** P1: lines pasted are kept as typed; two or more plain lines get [할 일 n개로] and ↶ beside the notice. */
  function notePaste(start: number, text: string, since = writingNoticeKeys.current) {
    // int7b QA 3-4 (W-SAVE-04): a paste the rules leave as it is goes in by the browser after this beforeinput (and
    // after its microtasks): the lines are read in the next task, once they are there.
    setTimeout(() => {
      const area = textArea(); if (!area || area.value.slice(start, start + text.length) !== text) return;
      const raw = area.value, first = raw.slice(0, start).split('\n').length - 1, count = text.split('\n').length;
      const lines = raw.split('\n'), at = (index: number) => lines.slice(0, index).reduce((sum, line) => sum + line.length + 1, 0);
      const from = start === at(first) ? first : first + 1, to = first + count - 1;
      const plain = [] as number[];
      for (let index = from; index <= to && index < lines.length; index++) {
        const line = lines[index];
        if (line.trim() && !/^ *-\s+\[/.test(line) && !/^ *- \//.test(line) && !/^ *-\s+(메모|날짜|시간):/.test(line) && !/^\[.*\]$/.test(line.trim())) plain.push(index);
      }
      if (to - from + 1 < 2) return;
      const toTasks = () => {
        const now = textArea(); if (!now || now.value !== raw) return;
        const block = lines.slice(from, to + 1).map((line, offset) => plain.includes(from + offset) ? `${/^ */.exec(line)![0]}- [ ] ${line.trim().replace(/^-\s+/, '')}` : line).join('\n');
        setWritingNotice(null);
        applyWritingEdit({ start: at(from), end: at(to) + lines[to].length, text: block }, undefined);
      };
      // notice (11/11, 기타 3-5): the 80%·90% notice this paste brought (checkTextLimit, in its input, before this task)
      // goes first; the paste is said in the same notice, not over it.
      const shown = limitNoticeRef.current, notice = programPasteNotice(to - from + 1, shown && shown.key > since ? shown : null);
      showWritingNotice(notice.tone, notice.text, [
        ...(plain.length >= 2 && to - from < 60 ? [{ label: `할 일 ${plain.length}개로`, run: whenComposed(toTasks) }] : []),
        { label: '되돌리기', run: whenComposed(() => { setWritingNotice(null); undoInput(); }) }], notice.detail);
    }, 0);
  }
  /** P3: a paste that would take the text past the limit is asked before anything goes in. */
  function askLongPaste(start: number, end: number, text: string) {
    const area = textArea(); if (!area) return;
    const raw = area.value, fit = programPasteFit(raw, start, end, text);
    showWritingNotice('warn', `붙여넣을 글이 깁니다 · ${programAbout(text.length)} · ${text.split('\n').length.toLocaleString('ko-KR')}줄`,
      fit ? [{ label: `앞부분 ${programAbout(fit.length)}만 붙여넣기`, run: whenComposed(() => {
        const now = textArea(), controller = draftRef.current; if (!now || now.value !== raw || !controller) return;
        // A long text goes in at once (the browser's own insertion sends one input per line, each a full render):
        // the draft takes it, then the screen shows it. This one step is not in ↶'s history, and the notice says so.
        const next = raw.slice(0, start) + fit + raw.slice(end), caret = start + fit.length;
        const accepted = controller.updateRaw(next, '', { inputType: 'insertFromPaste', inputSplice: { start, end, text: fit } });
        editorRef.current?.setValue(controller.getState().raw, { selection: { start: caret, end: caret } });
        if (accepted || controller.getState().held) scheduleSave();
        // int7b QA (W-GUARD-13): the limit this paste reaches is said in the same notice, so '↶로 되돌리지 않습니다' stays.
        const reached = textLimitReached(next);
        showWritingNotice(reached ? 'warn' : 'info', `앞부분 ${programAbout(fit.length)}를 붙여넣었습니다`, [],
          ['이 붙여넣기는 ↶로 되돌리지 않습니다', ...(reached ? [`${reached.text} · ${reached.room}`] : [])].join(' · '));
      }) }] : [], `이 글에 남은 자리 ${programTextRoom(raw.slice(0, start) + raw.slice(end))} · 아직 넣지 않았습니다`);
  }
  /** P2: once at 80% of the limit and once more at 90%, per document: the step newly reached (counted as said), or null. */
  function textLimitReached(raw: string) {
    const docId = propsRef.current.docId, step = limitStepRef.current.docId === docId ? limitStepRef.current.step : 0, share = programTextLimitShare(raw);
    const next = share >= 0.9 ? 2 : share >= 0.8 ? 1 : 0;
    limitStepRef.current = { docId, step: Math.max(next, step) };
    return next > step ? { text: `이 글이 한도의 ${next === 2 ? 90 : 80}%에 닿았습니다`, room: `남은 ${programTextRoom(raw)}` } : null;
  }
  function checkTextLimit(raw: string) {
    const reached = textLimitReached(raw);
    if (!reached) return;
    showWritingNotice('warn', reached.text, [], reached.room);
    limitNoticeRef.current = { key: writingNoticeKeys.current, ...reached };
  }
  /** L2·L4: the caret goes to a held line (its end), shown. */
  function goToHeldLine(index: number) {
    const area = textArea(); if (!area) return;
    const lines = area.value.split('\n'), end = lines.slice(0, index + 1).reduce((sum, line) => sum + line.length + 1, 0) - 1;
    area.focus({ preventScroll: true }); area.setSelectionRange(end, end); revealProgramEditorLine(area, index); setWritingCaretLine(index);
  }
  function pressBar(action: WritingBarAction) {
    if (inputLockedRef.current || propsRef.current.readOnly) return;
    const busy = composingRef.current || !!draftRef.current?.getState().saving && !indentsNow(action);
    // A held press remembers where it was aimed; a folder region may be read-only while it saves.
    const surface = busy ? propsRef.current.folderId ? regionPortRef.current?.activeEditor?.(true) ?? null : barEditor() : null;
    if (busy && !surface) return;
    const anchor = compositionAnchorRef.current, area = surface?.area;
    const settled = area && composingRef.current && anchor?.area === area ? anchor.offset : area?.selectionStart;
    stopBarRetry();
    const run = barHold.press(action, busy, area ? writingBarTarget(area, area.value, area.selectionStart, settled) : null);
    setHeldBar(barHold.held());
    if (run) { runBar(run); return; }
    // N1 fix 3: a keyboard that keeps the whole word composing (Samsung 천지인) may end the composition only at
    // the next space or character. A press held for a composition waits one second, then lets go and says why.
    // It never commits, blurs or rewrites the composing text.
    if (!composingRef.current) return;
    const serial = barHold.serial();
    if (holdLimit.current) clearTimeout(holdLimit.current);
    holdLimit.current = setTimeout(() => {
      holdLimit.current = null;
      if (barHold.held() && barHold.serial() === serial && composingRef.current) { barHold.cancel(); setHeldBar(null); setMessage(BAR_COMPOSING_NOTICE); }
    }, 1000);
  }
  function stopBarRetry() { if (barRetry.current) { cancelAnimationFrame(barRetry.current.frame); barRetry.current = null; } }
  /** Run a held press once input settles, only where it was aimed. The press is taken only when its
   *  target is ready, so a region still read-only right after its save keeps it, for up to one second. */
  function dropHeldBar(why: ProgramBarDrop) {
    const action = barHold.held();
    stopBarRetry(); barHold.cancel(); setHeldBar(null);
    if (action) setMessage(programBarDropNotice(action, why));
  }
  function releaseHeldBar() {
    if (!barHold.held()) { stopBarRetry(); return; }
    if (inputLockedRef.current || propsRef.current.readOnly) { dropHeldBar('locked'); return; }
    // A ⇤·⇥ held through a composition runs once it ends, even while a save is in flight (S5).
    if (composingRef.current || draftRef.current?.getState().saving && !indentsNow(barHold.held())) return;
    const target = barHold.target(), aimed = target?.surface as HTMLTextAreaElement | undefined, now = barEditor(), active = document.activeElement;
    const verdict = heldTargetVerdict(target, { surface: now?.area ?? null, value: now?.area.value ?? '', caret: now?.area.selectionStart ?? 0,
      selectionEnd: now?.area.selectionEnd ?? now?.area.selectionStart ?? 0, editable: !!now && !now.area.readOnly, connected: !!aimed?.isConnected,
      focusHere: !!active && (active === aimed || !!barRef.current?.contains(active) || active instanceof HTMLElement && !!active.closest('[data-bar-action]')) });
    if (verdict === 'wait') {
      const serial = barHold.serial(), since = barRetry.current?.serial === serial ? barRetry.current.since : performance.now();
      stopBarRetry();
      if (performance.now() - since > 1000) { dropHeldBar('expired'); return; }
      const frame = requestAnimationFrame(() => { if (barRetry.current?.frame === frame) releaseHeldBar(); });
      barRetry.current = { frame, serial, since };
      return;
    }
    // A retry that outlived its second is dropped even if the line just became ready.
    const expired = barRetry.current?.serial === barHold.serial() && performance.now() - barRetry.current.since > 1000;
    if (expired) { dropHeldBar('expired'); return; }
    // Never run on another line or surface: the press is let go, and says whether focus left or the line changed.
    if (verdict === 'cancel') { dropHeldBar(!aimed?.isConnected || !(active === aimed || !!barRef.current?.contains(active)
      || active instanceof HTMLElement && !!active.closest('[data-bar-action]')) ? 'left' : 'moved'); return; }
    stopBarRetry();
    const run = barHold.release(false);
    setHeldBar(null);
    if (run) runBar(run);
  }
  function closePanel() {
    if(panelComposingRef.current||composingRef.current)return;
    dismissPanel(true,true);
  }
  function dismissPanel(restore:boolean,resumeSave:boolean) {
    slashCommandRef.current=null;
    dialogRef.current?.close(); setPanel(null); setMessage(''); setOrderPreview(null);
    const saved = menuReturnRef.current; menuReturnRef.current = null;
    const state=draftRef.current?.getState();
    if(state)propsRef.current.onDirtyChange?.(programTextInputPending(state,textArea()?.value,composingRef.current,regionPendingRef.current,!!checkPendingRef.current));
    if(resumeSave&&state?.dirty&&!state.invalid&&!state.error)scheduleSave();
    if(restore&&!composingRef.current&&!inputLockedRef.current){editorRef.current?.focus();if(saved)restoreWritingSelection(saved);}
  }
  function writingSelection(): WritingSelection | null {
    const area = textArea();
    return area ? { start: area.selectionStart, end: area.selectionEnd, direction: area.selectionDirection,
      scrollTop: area.scrollTop, scrollLeft: area.scrollLeft } : null;
  }
  function restoreWritingSelection(saved: WritingSelection) {
    const area = textArea();
    if (!area || composingRef.current || inputLockedRef.current || area.inert) return;
    area.setSelectionRange(saved.start, saved.end, saved.direction);
    area.scrollTop = saved.scrollTop; area.scrollLeft = saved.scrollLeft;
    // Update the native editor's existing selection/viewport listeners, not its value/history.
    area.dispatchEvent(new Event('select', { bubbles: true }));
  }
  /** Folder view: what the menu's 들여쓰기/내어쓰기 would do to that line, checked by the region's own rule. */
  function regionIndentPlan(lineId: string | null, outdent: boolean): { ok: true } | { ok: false; reason: string } {
    const folderId = propsRef.current.folderId, view = folderId ? readProgramFolderRegions(currentState(), propsRef.current.docId, folderId) : null;
    const region = lineId ? view?.regions.find(entry => !entry.readOnly && entry.lineIds.includes(lineId)) : undefined;
    if (!view || !region || !lineId) return { ok: false, reason: REGION_OUTSIDE };
    const lines = region.raw.split('\n'), index = region.lineIds.indexOf(lineId), text = lines[index] ?? '';
    const next = outdent ? text.replace(/^( {1,2}|\t)/, '') : `  ${text}`;
    if (next === text) return { ok: false, reason: '더 내어 쓸 수 없습니다.' };
    lines[index] = next;
    return planProgramRegionEdit(currentState(), view, region.key, lines.join('\n')).ok ? { ok: true } : { ok: false, reason: FOLDER_STRUCTURE_LOCK };
  }
  /** A deferred caret move must not take the caret from newer input that started meanwhile. */
  function revealAllowed() {
    const active = document.activeElement;
    return !composingRef.current && !(active instanceof HTMLElement && active.matches('input, textarea, select, [contenteditable="true"]')
      && (!hostRef.current?.closest('section')?.contains(active) || inEditorHead(active)));
  }
  function indentFromMenu(outdent: boolean) {
    const lineId = panel?.lineId ?? null, index = currentRow(lineId)?.index;
    if (propsRef.current.folderId) {
      const plan = regionIndentPlan(lineId, outdent);
      if (!plan.ok) { setMessage(plan.reason); return; }
      closePanel();
      // The region editor's own indent, so its input check (planProgramRegionEdit) decides again.
      requestAnimationFrame(() => {
        const port = regionPortRef.current;
        if (!lineId || !revealAllowed() || !port?.revealLine?.(lineId)) return;
        port.activeEditor?.()?.instance.indent(outdent);
      });
      return;
    }
    closePanel();
    const selection = editorRef.current?.getSelection();
    if (index !== undefined && selection?.lineIndex !== index) editorRef.current?.focus(index);
    editorRef.current?.indent(outdent);
  }
  const toolsRef = useRef<HTMLDetailsElement>(null);
  // W6: the 도구 menu closes on a press outside it and when the document or screen changes, not only on its items.
  useEffect(() => {
    const menu = toolsRef.current; if (!menu) return;
    const owner = menu.ownerDocument;
    const outside = (event: Event) => { if (menu.open && !(event.target instanceof Node && menu.contains(event.target))) menu.open = false; };
    owner.addEventListener('pointerdown', outside, true);
    return () => { owner.removeEventListener('pointerdown', outside, true); menu.open = false; };
  }, [props.docId, props.active]);
  function closeEditorTools(button: HTMLButtonElement) {
    const menu = button.closest('details');
    if (menu) { menu.open = false; menu.querySelector('summary')?.focus(); }
  }
  function returnToDocumentMode(button: HTMLButtonElement) {
    const section = button.closest('section');
    setMode('live');
    requestAnimationFrame(() => {
      const area = Array.from(section?.querySelectorAll<HTMLTextAreaElement>('textarea') ?? []).find(node => !node.readOnly && node.getClientRects().length);
      const fallback = Array.from(section?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(node => !node.disabled && node.getClientRects().length);
      const summary = Array.from(section?.querySelectorAll<HTMLElement>('summary') ?? []).find(node => node.getClientRects().length);
      (area ?? fallback ?? summary)?.focus();
    });
  }
  function previewOrder(scopeLineId?: string) {
    if (actionsDisabled() || composingRef.current || draftRef.current?.getState().dirty) return;
    const state = currentState(), doc = currentDoc(), textarea = textArea(); if (!doc || !textarea) return;
    const selection: DateOrderSelection = { start: textarea.selectionStart, end: textarea.selectionEnd, direction: textarea.selectionDirection || 'none' };
    const index = textarea.value.slice(0, selection.start).split('\n').length - 1;
    const headings = M.parseDocument(doc, state).rows.filter(row => row.kind === 'heading' && /^##\s+\S/.test(row.text));
    const scope = scopeLineId ?? headings.filter(row => row.index <= index).at(-1)?.id ?? headings[0]?.id ?? '';
    setOrderPreview({ plan: planProgramDateBlockOrder(state, doc.id, scope, selection), before: state, epoch: orderEpochRef.current, selection, scrollTop: textarea.scrollTop });
    setPanel({ kind: 'order', lineId: scope });
  }
  /** F10 W-ORDER-05: 글 ⋮ '날짜 순서 바꾸기' — the dated sections turned round, previewed; applied as the K4-W order is
   *  (applyOrder: one native edit, one save, one ↶). Input not saved yet is saved first. */
  async function previewSectionOrder() {
    if (composingRef.current || inputLockedRef.current || propsRef.current.readOnly || propsRef.current.folderId) return;
    if (draftRef.current?.getState().dirty) await saveNow(false);
    const state = currentState(), doc = currentDoc(), textarea = textArea(); if (!doc || !textarea) return;
    const selection: DateOrderSelection = { start: textarea.selectionStart, end: textarea.selectionEnd, direction: textarea.selectionDirection || 'none' };
    const plan: DateSectionOrderPlan = draftRef.current?.getState().dirty || actionsDisabled() ? { status: 'blocked', reason: 'unsaved' } : planProgramDateSectionReverse(state, doc.id, selection);
    setOrderPreview({ plan, before: state, epoch: orderEpochRef.current, selection, scrollTop: textarea.scrollTop });
    setMessage(''); setPanel({ kind: 'section-order', lineId: null });
  }
  const previewSectionOrderRef = useRef(previewSectionOrder); previewSectionOrderRef.current = previewSectionOrder;
  useEffect(() => {
    props.onRegisterSectionOrder?.(() => { void previewSectionOrderRef.current(); });
    return () => props.onRegisterSectionOrder?.(null);
  }, []);
  function applyOrder() {
    const capture = orderPreview, controller = draftRef.current, textarea = textArea();
    if (!capture || capture.plan.status !== 'ready' || !controller || !textarea || actionsDisabled() || composingRef.current ||
      capture.epoch !== orderEpochRef.current || !programSame(currentState(), capture.before) || textarea.value !== capture.plan.beforeRaw) {
      setMessage('내용이 바뀌어 다시 확인해야 합니다. 현재 입력은 유지했습니다.'); return;
    }
    const next = applyProgramLinePermutation(capture.before, propsRef.current.docId, capture.plan.afterLineIds);
    if (!next) { setMessage('이 구간의 순서를 안전하게 바꿀 수 없습니다.'); return; }
    const plan = capture.plan;
    orderPositionsRef.current.push({ state: capture.before, selection: plan.selectionBefore, scrollTop: capture.scrollTop }, { state: next, selection: plan.selectionAfter, scrollTop: capture.scrollTop });
    closePanel();
    pendingOrderRef.current = { before: capture.before, next, raw: plan.afterRaw };
    const applied = editorRef.current?.replaceRange(plan.replacement.start, plan.replacement.end, plan.replacement.text, { selectionAfter: plan.selectionAfter });
    pendingOrderRef.current = null;
    if (!applied) { setMessage('브라우저가 순서를 적용하지 못했습니다. 원문을 직접 편집할 수 있습니다.'); return; }
    textarea.scrollTop = capture.scrollTop;
    rememberPosition();
  }
  function nativeHistory(type: 'historyUndo' | 'historyRedo') {
    if (actionsDisabled() || composingRef.current) return;
    historyTypeRef.current = type;
    if (type === 'historyUndo') editorRef.current?.undo();
    else { const textarea = textArea(); textarea?.focus({ preventScroll: true }); textarea?.ownerDocument.execCommand('redo'); }
    historyTypeRef.current = '';
  }
  function cancelMove() {
    movingRef.current = null; setMoving(null); editorRef.current?.setMoveState(null);
  }
  async function saveFullDraft() {
    if (composingRef.current) return false;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (propsRef.current.readOnly) return false;
    const controller = draftRef.current;
    const saved = await (controller?.save() ?? false);
    // The draft owns the confirmed baseline and drains newer input. Parent
    // props may still contain an earlier ACK until React commits its update;
    // never adopt that stale snapshot backwards after a successful save.
    // Generated property IDs use the draft confirmation port; external
    // workspace updates keep the existing synchronization effect.
    return saved&&!!controller&&!programTextInputPending(controller.getState(),textArea()?.value,composingRef.current,regionPendingRef.current,!!checkPendingRef.current);
  }
  async function saveNow(finish = true) {
    if(currentChild()){setMessage('추가 중인 내용을 적용하거나 닫은 뒤 계속해 주세요. 초안은 남아 있습니다.');return false;}
    if(checkPendingRef.current)return false;
    if (composingRef.current) { setMessage('한글 입력을 마친 뒤 보기 범위를 바꿔 주세요.'); return false; }
    // A flush finishes a held "- /name" line; the 450 ms background save does not.
    if (finish) finishHeldFolderLine();
    const saved = await (regionPortRef.current ? regionPortRef.current.flush() : saveFullDraft());
    if (saved && !composingRef.current && !regionPendingRef.current && !draftRef.current?.getState().dirty) {
      setMessage(previous => previous === '한글 입력을 마친 뒤 보기 범위를 바꿔 주세요.' ? '' : previous);
    }
    return saved;
  }
  /** The body's own unsaved input: a change not yet saved (or refused, or saving), a composition, a region edit or a
   *  check in progress. A child panel open over an unchanged body is not body input (its text is a recovery draft). */
  function bodyInputPending() {
    const state = draftRef.current?.getState();
    if (!state) return true;
    return state.saving || !!checkPendingRef.current || !!regionPortRef.current?.hasPending()
      || programTextInputPending(state, textArea()?.value, composingRef.current, regionPendingRef.current, !!checkPendingRef.current);
  }
  function captureDraftRaw() {
    // Recovery may retain unfinished native composition without admitting it
    // as validated working state or submitting it to the server.
    if(composingRef.current&&!regionPendingRef.current)return textArea()?.value??draftRef.current?.getState().raw??'';
    return regionPortRef.current?.hasPending() ? regionPortRef.current.captureRaw() || draftRef.current?.getState().raw || ''
      : draftRef.current?.getState().raw ?? textArea()?.value ?? '';
  }
  function captureStructuralDraft() {
    const state = draftRef.current?.getState();
    return state?.dirty ? createAlphaStructuralDraft(state.committed, state.working, propsRef.current.docId) : null;
  }
  function acceptRegion(next: TextWorkspaceState, before: TextWorkspaceState) {
    const controller = draftRef.current;
    if (!controller || propsRef.current.readOnly || composingRef.current || controller.getState().saving
      || !programSame(before, controller.getState().working) || !programSame(propsRef.current.workspace, controller.getState().committed)
      || propsRef.current.validateWorkspace && !propsRef.current.validateWorkspace(next)) return false;
    if (programSame(next, controller.getState().working)) return true;
    if (!controller.apply(next, '폴더 영역 편집')) return false;
    orderHistoryRef.current.clear(); orderPositionsRef.current = []; orderEpochRef.current++;
    editorRef.current?.setValue(controller.getState().raw, { preserveSelection: true });
    return true;
  }
  function continueWholeDocument() {
    const controller = draftRef.current, port = regionPortRef.current;
    if (!controller || !port || !propsRef.current.onContinueWholeDocument) return;
    const moved = propsRef.current.onContinueWholeDocument(() => {
      const capture = port.takeSnapshot(), destination = editorRef.current;
      // A newer authoritative workspace cannot be adopted as the draft's old baseline.
      if (!destination || !programSame(propsRef.current.workspace, controller.getState().committed)
        || !stageProgramRegionInput(controller, propsRef.current.docId, capture,
          { composing: composingRef.current, locked: inputLockedRef.current, readOnly: propsRef.current.readOnly,
            install: raw => destination.setValue(raw, { preserveSelection: true }) === true && destination.getValue() === raw })) return false;
      if (timerRef.current) clearTimeout(timerRef.current);
      regionPositionRef.current = { start: capture!.start, end: capture!.end };
      wholeContinuationRef.current = { start: capture!.start, end: capture!.end, raw: capture!.raw };
      orderHistoryRef.current.clear(); orderPositionsRef.current = []; orderEpochRef.current++;
      port.discard();
      return true;
    });
    if (!moved) setMessage('입력은 남아 있습니다. 다른 입력·저장 중인 변경을 확인한 뒤 전체 문서에서 계속 편집해 주세요.');
  }
  const focusSourceRow: ProgramSourceFocus = target => {
    const state = draftRef.current?.getState(), doc = currentDoc(), textarea = textArea();
    if (!state || !doc || !textarea || target.documentId !== propsRef.current.docId || doc.id !== target.documentId
      || composingRef.current || regionPendingRef.current || !!propsRef.current.folderId || actionsDisabled() || state.dirty || textarea.readOnly
      || target.raw !== state.raw || target.raw !== M.raw(doc) || textarea.value !== target.raw
      || !hostRef.current?.getClientRects().length) return false;
    const index = doc.lines.findIndex(line => line.id === target.lineId);
    if (index < 0) return false;
    // Native focus unfolds its presentation and removes inert before focusing.
    // Merely focusing the retained textarea cannot enter a folded document.
    const focused = editorRef.current?.focus(index) === true && textarea.ownerDocument.activeElement === textarea;
    if (focused) {
      const tools = hostRef.current?.closest('section')?.querySelector<HTMLDetailsElement>('[data-editor-tools]');
      if (tools) tools.open = false;
    }
    return focused;
  };
  // A local refusal never reaches the server, so the host learns of it only here. A check mark still being typed is
  // held (unsaved, 편집 중) but is not one: deleting a task line or typing one passes through `- [`.
  const inputFailed = draft.invalid && !draft.typingMark || !!draft.error;
  useEffect(() => { propsRef.current.onInputFailureChange?.(inputFailed); }, [inputFailed]);
  useEffect(() => () => propsRef.current.onInputFailureChange?.(false), []);
  useEffect(() => {
    propsRef.current.onRegisterSave?.(saveNow, () => ({ composing: composingRef.current, saving: !!checkPendingRef.current || !!draftRef.current?.getState().saving, failed: !!draftRef.current?.getState().error, held: !!draftRef.current?.getState().held?.lines.length }));
    propsRef.current.onRegisterSourceFocus?.(focusSourceRow);
    propsRef.current.onRegisterDraft?.(captureDraftRaw, () => draftRef.current?.getState().working ?? null);
    propsRef.current.onRegisterStructuralDraft?.(captureStructuralDraft);
    propsRef.current.onRegisterChildDrafts?.(captureChildDrafts);
    propsRef.current.onRegisterCaptureComplete?.(()=>!currentChild());
    propsRef.current.onRegisterExternalGuard?.(()=>!!currentChild());
    propsRef.current.onRegisterBodyPending?.(bodyInputPending);
    propsRef.current.onRegisterInputLock?.(locked => {
      // Do not terminate a native IME composition by changing readOnly. Its
      // dirty signal makes the parent flush reject the context change instead.
      if (locked && composingRef.current) return;
      inputLockedRef.current = locked; setInputLocked(locked);
      const textarea = textArea(); if (textarea) textarea.readOnly = locked || !!propsRef.current.readOnly;
      if (locked) { orderEpochRef.current++; cancelMove(); dialogRef.current?.close(); setPanel(null); setOrderPreview(null); }
      editorRef.current?.refresh();
    });
    return () => { propsRef.current.onRegisterBodyPending?.(null);propsRef.current.onRegisterCaptureComplete?.(null);propsRef.current.onRegisterExternalGuard?.(null);propsRef.current.onRegisterSave?.(null, null); propsRef.current.onRegisterSourceFocus?.(null); propsRef.current.onRegisterInputLock?.(null); propsRef.current.onRegisterDraft?.(null); propsRef.current.onRegisterStructuralDraft?.(null); propsRef.current.onRegisterChildDrafts?.(null); };
  }, [props.docId]);
  function scheduleSave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    // A pending commit may fail after newer input armed this timer.
    // A keyboard may keep a word composing for long (Samsung 천지인); the background save waits for it without
    // a notice. The "한글 입력을 마친 뒤" notice is for a flush the user asked for, such as changing the view.
    timerRef.current = setTimeout(() => {
      if (composingRef.current) { scheduleSave(); return; }
      if (!draftRef.current?.getState().error) void saveNow(false);
    }, 450);
  }
  /** Puts the model's text on the screen; false when the native editor refused it (a composition began). */
  const shown = (raw: string) => !editorRef.current || editorRef.current.setValue(raw, { preserveSelection: true }) !== false;
  async function apply(next: TextWorkspaceState, label: string, schedule?: ProgramTextCommitOptions['privateTaskSchedule'], pickerTarget?: { lineId: string; scopeId: string }, folderBefore?: TextWorkspaceState) {
    const before = currentState(), selected = writingSelection(), previous = draftRef.current?.getState();
    const beforeOperation = draftRef.current?.folderOperation();
    // W15 review P1-4: never change the model during a composition (the screen would refuse the text), and if
    // the screen refuses it anyway, put the model back so both agree.
    if (composingRef.current) { setMessage('한글 입력을 마친 뒤 다시 눌러 주세요. 현재 내용은 유지했습니다.'); return false; }
    if (actionsDisabled() || !previous || !draftRef.current?.apply(next, label, schedule, pickerTarget, folderBefore)) { setMessage('이 변경은 적용할 수 없습니다. 현재 내용은 유지했습니다.'); return false; }
    cancelMove();
    if (!shown(draftRef.current.getState().raw)) { draftRef.current.restoreState(previous); setMessage('화면에 반영하지 못해 적용하지 않았습니다. 현재 내용은 유지했습니다.'); return false; }
    orderHistoryRef.current.clear(); orderPositionsRef.current = []; orderEpochRef.current++;
    const returned = selected && programTextSelectionAfterChange(before, next, propsRef.current.docId, selected);
    if (returned) {
      restoreWritingSelection(returned);
      // A moved source can be outside the old scroll window; reveal only after
      // model changes. Plain menu cancellation keeps its original scroll.
      editorRef.current?.refreshViewport();
    }
    editorRef.current?.refresh();
    const operation = draftRef.current.folderOperation();
    if (operation && (operation.id !== beforeOperation?.id || operation.at !== beforeOperation.at)) showFolderOperation('폴더 동작을 반영했습니다', 'info');
    return saveNow();
  }
  function locationPolicy(lineId: string | null): TaskLocationPolicy {
    const state=currentState(), target=currentRow(lineId)?.progressTargetId??lineId??'';
    return propsRef.current.taskLocationPolicy?.(lineId??target,state)??{
      kind:readTaskLocationSource(state,propsRef.current.docId,target)?'move':'date-only',taskId:target,documentId:propsRef.current.docId,
      message:'연결·반복 항목은 자리 그대로 날짜만 바꿉니다.'};
  }
  function locationAvailability() { return {...(taskMoveGate?.read()??{blocked:false,checking:false}),confirm:taskMoveGate?.confirm}; }
  function highlightLocation(taskId:string) {
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const folderId=propsRef.current.folderId,region=folderId?readProgramFolderRegions(currentState(),propsRef.current.docId,folderId)?.regions.find(entry=>entry.lineIds.includes(taskId)):undefined;
      const index=region?region.lineIds.indexOf(taskId):currentDoc()?.lines.findIndex(line=>line.id===taskId)??-1;
      if(index<0)return;
      const surface=region?Array.from(hostRef.current?.closest('section')?.querySelectorAll<HTMLElement>('[data-folder-region]')??[]).find(node=>node.dataset.folderRegion===region.key):hostRef.current;
      const node=surface?.querySelector<HTMLElement>(`.tle-line[data-line-index="${index}"]`);
      if(node){node.classList.add(styles.locationHighlight);window.setTimeout(()=>node.classList.remove(styles.locationHighlight),1200);}
    }));
  }
  function showLocation(last:LocationEdit) {
    if(last.docId!==propsRef.current.docId)return;
    if(propsRef.current.folderId&&last.folderId!==propsRef.current.folderId){propsRef.current.onOpenScope?.(last.folderId);return;}
    if(regionPortRef.current?.revealLine?.(last.taskId)){highlightLocation(last.taskId);return;}
    const index=currentDoc()?.lines.findIndex(line=>line.id===last.taskId)??-1,area=textArea();
    if(index>=0&&area){editorRef.current?.focus(index);revealProgramEditorLine(area,index);highlightLocation(last.taskId);}
  }
  function locationOutside(last:LocationEdit) {
    if(props.folderId)return last.folderId!==props.folderId;
    const index=currentDoc()?.lines.findIndex(line=>line.id===last.taskId)??-1;
    const line=hostRef.current?.querySelector<HTMLElement>(`.tle-line[data-line-index="${index}"]`),area=textArea();
    if(!line||!area)return true;
    const box=line.getBoundingClientRect(),view=area.getBoundingClientRect();
    return box.bottom<view.top||box.top>Math.min(view.bottom,window.innerHeight);
  }
  async function performTaskLocation(lineId:string|null,target:TaskLocationTarget) {
    if(actionsDisabled()||composingRef.current||regionPendingRef.current)return;
    const policy=locationPolicy(lineId);
    if(policy.kind!=='move'||!policy.documentId){setMessage(policy.message);return;}
    if(locationAvailability().blocked){setMessage('저장을 확인한 뒤 옮겨 주세요.');return;}
    const before=currentState();
    if(panel?.locationExpected&&!programSame(panel.locationExpected,before)){setMessage('그사이 내용이 바뀌었습니다. 닫고 다시 옮겨 주세요.');return;}
    // W-MENU-27: the host keeps that move's trace (moveTaskHere), as for its other ways in.
    if(propsRef.current.onTaskLocation){closePanel();await propsRef.current.onTaskLocation(policy.taskId,target,before);return;}
    const moved=moveTaskLocation(before,{documentId:policy.documentId,taskId:policy.taskId,target});
    if(!moved.ok){setMessage(TASK_LOCATION_FAILURE_TEXT[moved.reason]);return;}
    if(!moved.changed){closePanel();return;}
    if(propsRef.current.authorizeTaskLocation?.(before,moved.next)===false){setMessage('이 묶음의 연결·반복 상태가 바뀌어 옮기지 않았습니다. 원문은 유지했습니다.');return;}
    // F9 (UX ux-carry-order): '11월 13일 (금)으로 옮겼습니다', the particle by ro() (programTaskDatesMovedText).
    const label=target.kind==='date'?programTaskDatesMovedText(1,moved.date,today()):`/ ${programFolderPath(moved.next,moved.folderId)}로 옮겼습니다`;
    closePanel();barDateUndo.current=null;setLocationNotice(null);
    const pending=apply(moved.next,'할 일 옮기기'),state=draftRef.current?.getState();
    if(!state||!programSame(state.working,moved.next))return;
    const record:LocationEdit={docId:propsRef.current.docId,taskId:policy.taskId,before,after:moved.next,raw:state.raw,redo:false,label,date:moved.date,folderId:moved.folderId,kind:target.kind};
    // W-MENU-26: a move to another day leaves its trace (kept on this device); 되돌리기 takes it back (stepLocation).
    if(target.kind==='date')record.trace=rememberMove(before,policy.taskId,moved.date);
    locationUndo.current=record;highlightLocation(policy.taskId);
    if(propsRef.current.folderId===moved.folderId)requestAnimationFrame(()=>{
      if(propsRef.current.docId===record.docId&&propsRef.current.active!==false&&!composingRef.current&&programSame(currentState(),record.after))regionPortRef.current?.revealLine?.(record.taskId);
    });
    if(await pending&&locationUndo.current===record&&programSame(currentState(),record.after))setLocationNotice(record);
  }
  function stepLocation(redo:boolean) {
    const last=locationUndo.current,state=draftRef.current?.getState();
    if(!last||!state||last.docId!==propsRef.current.docId||last.redo!==redo)return false;
    if(state.raw!==last.raw||!programSame(state.working,redo?last.before:last.after)){locationUndo.current=null;setLocationNotice(null);return false;}
    if(actionsDisabled()||composingRef.current||regionPendingRef.current)return true;
    if(locationAvailability().blocked){setMessage('저장을 확인한 뒤 되돌려 주세요.');return true;}
    const next=redo?last.after:last.before;
    if(propsRef.current.authorizeTaskLocation?.(state.working,next)===false){setMessage('다른 변경이 있어 되돌리지 않았습니다. 현재 내용은 유지했습니다.');return true;}
    const pending=apply(next,redo?'할 일 다시 옮기기':'할 일 옮기기 되돌리기'),installed=draftRef.current?.getState();
    if(installed&&programSame(installed.working,next)&&last.trace){const trace=last.trace;if(redo)keepMoveTraces(list=>[...list.filter(entry=>entry.id!==trace.id),trace]);else forgetMove(trace);}
    setLocationNotice(null);
    locationUndo.current=installed&&programSame(installed.working,next)?{...last,raw:installed.raw,redo:!redo}:null;
    void pending;return true;
  }
  function stepScheduleUndo(){
    const last=scheduleUndo.current,state=draftRef.current?.getState();
    if(!last||!state)return false;
    if(last.docId!==propsRef.current.docId||last.raw!==state.raw||!programSame(last.working,state.working)){scheduleUndo.current=null;setScheduleNotice(null);return false;}
    if(actionsDisabled()||composingRef.current||regionPendingRef.current)return true;
    scheduleUndo.current=null;setScheduleNotice(null);
    void last.undo().then(ok=>{if(!ok)setMessage('그 뒤 다른 변경이 있어 되돌리지 않았습니다. 현재 내용은 유지했습니다.');});return true;
  }
  async function applyDateOnly(target:string,value:string|null,time:string){
    const docId=propsRef.current.docId;barDateUndo.current=null;
    const outcome=await commitTaskDateWithUndo({begin:()=>taskMoveGate?.beginScheduleUndo?.(),apply:()=>{
      const next=M.updateTask(currentState(),target,{date:value,time});closePanel();
      return apply(next,'항목 날짜·시간',{taskId:target,date:value,time});
    }});
    if(outcome.kind==='blocked'){setMessage('저장 상태를 확인한 뒤 날짜를 다시 정해 주세요. 현재 내용은 유지했습니다.');return;}
    if(outcome.kind!=='saved'||propsRef.current.docId!==docId)return;
    const capability=outcome.capability,state=draftRef.current?.getState();
    if(capability&&state){
      const record:ScheduleUndo={docId,working:state.working,raw:state.raw,text:`날짜를 ${value?programCalendarDate(value,today(),false)+'로':'미정으로'} 바꿨습니다`,undo:capability.undo};
      barDateUndo.current=null;scheduleUndo.current=record;setScheduleNotice(record);
    }else{scheduleUndo.current=null;setScheduleNotice(null);setMessage('날짜는 저장했습니다. 그 뒤 상태가 바뀌어 지금은 되돌릴 수 없습니다.');}
  }
  function beginMove(lineId: string | null, openDialog: boolean) {
    if (!lineId || actionsDisabled()) return;
    const state = currentState(), id = propsRef.current.docId;
    const selection = M.selectionForMove(state, id, lineId), targets = M.moveTargets(state, id, lineId);
    if (!selection || !targets.length) { setMessage('옮길 수 있는 위치가 없습니다.'); return; }
    const next = { ...selection, targets };
    movingRef.current = next; setMoving(next); editorRef.current?.setMoveState(next);
    if (openDialog) setPanel({ kind: 'move', lineId });
  }
  async function finishMove(beforeLineId: string | null, depth: number) {
    const selection = movingRef.current;
    if (!selection) return;
    const next = M.moveSubtree(currentState(), propsRef.current.docId, selection.lineId, beforeLineId, depth);
    closePanel();
    await apply(next, '하위 묶음 이동');
  }
  /** C2: after a check tap, completing shows the check notice; anything else ends the one for that task. A newer tap on
   *  a task supersedes a choice of its still waiting. */
  function noticeCheck(targetId: string, title: string, before: number | null) {
    const work = checkWorkKey(targetId);
    checkHeld.current.delete(work);
    if (before !== null && before !== 100 && M.currentProgress(currentState(), targetId) === 100) {
      // 총괄: the check shows at once; the notice says "완료 저장 중…" until the save settles.
      const notice: ProgramCheckNotice = { stage: 'done', targetId, title, before, after: 100, shownAt: performance.now(), key: ++checkNoticeKeys.current, saving: { percent: 100, undo: false, quiet: true } };
      checkSaves.current.set(work, { notice, percent: 100, undo: false, quiet: true, generation: draftRef.current?.generation() ?? 0 }); setCheckNotice(notice);
    } else {
      checkSaves.current.delete(work);
      if (checkNoticeRef.current?.targetId === targetId) setCheckNotice(null);
    }
  }
  /** C2: each step on its way is settled off the draft: saved (only then "완료했습니다" or "기록했습니다"), refused, saved
   *  with another value, or overtaken by newer input on the screen (its words no longer apply). 총괄 (11/2): a refused
   *  save is left to the editor's own handling, which keeps the input and says it did not save; this only says so too,
   *  and drops the choices that waited for that save. Nothing is put back or saved again here. A failure is said even
   *  under another task's notice (the shown task's first); a success changes only its own task's notice. */
  function settleCheckSaves() {
    const state = draftRef.current?.getState();
    if (!state) return;
    const refused = !state.saving && (!!state.error || state.invalid);
    let failure: ProgramCheckNotice | null = null, failureShown = false;
    const fail = (notice: ProgramCheckNotice, mine: boolean, detail: Parameters<typeof programCheckNoticeFailed>[1]) => {
      if (failureShown) return;
      failure = programCheckNoticeFailed(notice, detail, performance.now(), ++checkNoticeKeys.current); failureShown = mine;
    };
    const dropHeld = (work: string) => {
      const held = checkHeld.current.get(work);
      if (!held) return undefined;
      checkHeld.current.delete(work);
      return { percent: held.step.kind === 'undo' ? held.notice.before : held.step.percent, undo: held.step.kind === 'undo' };
    };
    // Everything saved acknowledges every generation so far; otherwise the newest acked save says how far it went.
    const acked = !state.dirty && !state.saving ? Math.max(checkAcked.current, draftRef.current?.generation() ?? -1) : checkAcked.current;
    for (const [work, entry] of [...checkSaves.current]) {
      const { notice, percent, undo, quiet } = entry, targetId = notice.targetId, saved = M.currentProgress(state.committed, targetId);
      const outcome = programCheckSaveOutcome(saved, M.currentProgress(state.working, targetId), percent, state, acked >= entry.generation);
      if (!outcome) continue;
      checkSaves.current.delete(work);
      const visible = checkNoticeRef.current, mine = visible?.targetId === targetId ? visible : null;
      if (outcome === 'overtaken') { if (mine?.saving?.percent === percent && !checkHeld.current.has(work)) setCheckNotice(null); continue; }
      if (outcome === 'saved') {
        if (mine && !checkHeld.current.has(work)) setCheckNotice(quiet ? { ...mine, saving: undefined } : undo ? null : programCheckNoticeAfter(mine, percent, performance.now(), ++checkNoticeKeys.current));
        continue;
      }
      fail(mine ?? notice, !!mine, outcome === 'refused' ? { why: 'save', asked: percent, askedUndo: undo, dropped: refused ? dropHeld(work) : undefined }
        : { why: 'changed', asked: percent, kept: saved });
    }
    // Choices still waiting when a save was refused are dropped too, and said.
    if (refused) for (const [work, held] of [...checkHeld.current]) {
      const mine = checkNoticeRef.current?.targetId === held.notice.targetId ? checkNoticeRef.current : null;
      fail(mine ?? held.notice, !!mine, { why: 'save', dropped: dropHeld(work) });
    }
    if (failure) setCheckNotice(failure);
  }
  /** C2: a tap on a task between 1% and 99% shows the chips, [완료] first, where the tap could have toggled it. */
  function showCheckChips(lineId: string | null) {
    const row = currentRow(lineId), target = row?.progressTargetId, value = target ? M.currentProgress(currentState(), target) : null;
    if (!row || !target || value === null || !programCheckChipsFit({ kind: row.isReference ? 'reference' : row.kind, isCanonical: !!row.isCanonical, progressTargetId: target,
      progressPercent: value, progressDate: M.latestProgress(currentState(), target)?.date ?? null }, accessFor(lineId), today())) return false;
    setMessage(''); setCheckNotice({ stage: 'chips', targetId: target, title: row.title || row.task?.title || '할 일', before: value, after: value, shownAt: performance.now(), key: ++checkNoticeKeys.current });
    return true;
  }
  /** C2: a check notice button. It acts on the task the notice names, wherever its line now is; a replaced notice does nothing. */
  function pressCheckStep(key: number, step: ProgramCheckStep) {
    const notice = checkNoticeRef.current;
    if (!notice || notice.key !== key) return;
    if (step.kind === 'chips') { setCheckNotice({ ...notice, stage: 'chips', shownAt: performance.now(), key: ++checkNoticeKeys.current }); return; }
    performCheckStep(notice, step);
  }
  /** C2: a step on the task `notice` names, now or, while a save is in flight, once it ends (held by task, not by
   *  notice). The notice shown is updated only while it is still this task's; a save already on its way stays tracked. */
  function performCheckStep(notice: ProgramCheckNotice, step: CheckStepToRun) {
    const work = checkWorkKey(notice.targetId), shown = () => checkNoticeRef.current?.targetId === notice.targetId ? checkNoticeRef.current : null;
    const leave = () => { if (shown()) setCheckNotice(null); };
    const lineId = (documentInputRef.current?.rows(currentState()) ?? M.rowMeta(currentState(), propsRef.current.docId)).find(row => row.progressTargetId === notice.targetId)?.id ?? null;
    if (!lineId) { leave(); setMessage('이 할 일을 문서에서 찾지 못했습니다. 현재 내용과 기록은 유지했습니다.'); return; }
    // Review: [직접] only opens the form; a save on its way keeps being watched, so a refusal is still said.
    if (step.kind === 'direct') { leave(); openProgress(lineId); return; }
    const access = accessFor(lineId);
    if (!access || access.kind !== 'active' || access.reason) { leave(); setPanel({ kind: 'reference', lineId }); return; }
    const percent = step.kind === 'undo' ? notice.before : step.percent, saving = { percent, undo: step.kind === 'undo', quiet: false };
    // A choice made while a save is in flight waits for it, and its notice says so until it is settled; the clock never
    // ends it (× does, and drops the choice with it). If that save is refused, the choice is dropped and said.
    if (draftRef.current?.getState().saving) {
      checkHeld.current.set(work, { notice, step, signature: checkSignature(currentState(), notice.targetId) });
      const mine = shown(); if (mine) setCheckNotice({ ...mine, saving });
      return;
    }
    const unsent = () => { const mine = shown(); if (mine?.saving && !mine.saving.quiet) setCheckNotice({ ...mine, saving: undefined }); };
    const current = M.currentProgress(currentState(), notice.targetId);
    if (step.kind === 'undo' && !programCheckUndoable(notice, current)) { leave(); setMessage('그 뒤에 진행률이 바뀌어 되돌리지 않았습니다. 현재 기록은 유지했습니다.'); return; }
    if ((M.latestProgress(currentState(), notice.targetId)?.date ?? '') > today()) {
      leave(); openProgress(lineId); setMessage('미래 날짜의 진행 기록이 있습니다. 기록 날짜를 확인한 뒤 변경해 주세요.'); return;
    }
    if (!draftRef.current?.flush()) { unsent(); return; }
    const next = M.recordProgress(currentState(), notice.targetId, today(), percent);
    if (next !== currentState()) void apply(next, step.kind === 'undo' ? '완료 되돌리기' : percent === 100 ? '할 일 완료' : '날짜별 누적 진행');
    // apply said why when it refused; the notice then stays as it was.
    if (M.currentProgress(currentState(), notice.targetId) !== percent) { unsent(); return; }
    // Saving now: the notice says what was saved once the save has settled.
    checkSaves.current.set(work, { notice, ...saving, generation: draftRef.current?.generation() ?? 0 });
    const mine = shown(); if (mine) setCheckNotice({ ...mine, saving });
    settleCheckSaves();
  }
  /** Re-review: a choice that waited for a save while newer input (a paste, typing) changed its task's line is dropped,
   *  and said: the latest input wins. */
  function dropLaterCheck(held: CheckHeld) {
    const mine = checkNoticeRef.current?.targetId === held.notice.targetId ? checkNoticeRef.current : null;
    const dropped = { percent: held.step.kind === 'undo' ? held.notice.before : held.step.percent, undo: held.step.kind === 'undo' };
    setCheckNotice(programCheckNoticeFailed(mine ?? held.notice, { why: 'later', dropped }, performance.now(), ++checkNoticeKeys.current));
  }
  /** × on the notice: it ends, and a choice of its task still waiting for a save goes with it. */
  function closeCheckNotice() {
    const notice = checkNoticeRef.current;
    if (notice) checkHeld.current.delete(checkWorkKey(notice.targetId));
    setCheckNotice(null);
  }
  function openProgress(lineId: string | null, kind: 'progress' | 'date' = 'progress') {
    const row = currentRow(lineId);
    if (!row?.progressTargetId) return;
    if (accessFor(lineId)?.reason) { setMessage(''); setPanel({ kind: 'reference', lineId }); return; }
    setProgressRecordDate(null);
    setDate(kind === 'date' ? row.date ?? '' : today());
    setTime(row.time ?? row.task?.time ?? '');
    setPercent(String(M.currentProgress(currentState(), row.progressTargetId) ?? (row.done ? 100 : 0)));
    setMessage(''); setPanel({ kind, lineId });
  }
  function progressConflictToView() {
    const state = draftRef.current?.getState(), conflict = state?.progressConflict;
    if (!state?.invalid || !conflict || state.saving || inputLockedRef.current || propsRef.current.readOnly
      || composingRef.current || regionPendingRef.current || textArea()?.value !== state.raw) return null;
    const row = currentRow(conflict.lineId);
    if (!row || row.progressTargetId !== conflict.targetId) return null;
    const access = propsRef.current.taskAccess?.(conflict.targetId,currentState());
    if (propsRef.current.taskAccess && (!access || access.kind !== 'active' || access.reason
      || access.lineId !== conflict.targetId || !access.documentId
      || !M.getDocument(state.working, access.documentId)?.lines.some(line => line.id === conflict.targetId))) return null;
    if (row.isReference && !access) return null;
    return conflict;
  }
  function showProgressConflict() {
    // Viewing never resolves invalid input, applies progress or calls a writer.
    const conflict = progressConflictToView();
    if (conflict) openProgress(conflict.lineId);
  }
  function authoringAnchor(index:number){
    if(!propsRef.current.authoringMode)return null;
    const state=currentState(),rows=documentInputRef.current?.rows(state)??M.rowMeta(state,propsRef.current.docId),selected=rows[index];if(!selected)return null;
    let parent=selected.kind==='task'&&selected.isCanonical?selected:rows.find(row=>row.id===(selected.parentTaskId??selected.taskId)&&row.kind==='task'&&row.isCanonical);
    if(!parent)return null;let bottom=parent.index;
    for(let i=parent.index+1;i<parent.subtreeEndIndex;i++){if(['task','subcheck'].includes(rows[i]?.kind))break;bottom=i;}
    return{parentIndex:parent.index,bottomIndex:bottom};
  }
  function openAuthoringChild(index:number,kind?:'memo'|'task'){
    if(!propsRef.current.authoringMode||inputLockedRef.current||propsRef.current.readOnly||checkPendingRef.current||composingRef.current||regionPendingRef.current||!draftRef.current?.canApplyLocal()||!draftRef.current.flush()){setMessage('현재는 하위 내용을 추가할 수 없습니다. 입력이나 저장 상태를 확인해 주세요.');return false;}
    const state=currentState(),doc=currentDoc(),anchor=authoringAnchor(index);if(!doc||!anchor||textArea()?.value!==draftRef.current.getState().raw)return false;
    const line=doc.lines[anchor.parentIndex],binding=state.bindings.find(b=>b.docId===doc.id&&b.lineId===line?.id&&b.kind==='task'),targetId=binding?.kind==='task'?binding.taskId:line?.id;
    const ownedTask=documentInputRef.current?.rows(state)?.[anchor.parentIndex]?.task;
    const task=ownedTask?.id===targetId?ownedTask:M.tasks(state).find(t=>t.id===targetId),access=task?propsRef.current.taskAccess?.(task.id,state):null;if(!task||!access||access.kind!=='active'||access.reason){setMessage(access?.reason??'이 항목에는 하위 내용을 추가할 수 없습니다.');return false;}
    if(editorRef.current?.isFolded(anchor.parentIndex))editorRef.current.toggleFold(anchor.parentIndex);
    const target:ChildTarget={documentId:task.docId,parentId:task.id,workspace:state,raw:M.raw(M.getDocument(state,task.docId)),title:task.title,date:task.date,scope:task.scopeTitle,memo:task.note,kind};
    if(timerRef.current)clearTimeout(timerRef.current);
    setMessage('');setPanel({kind:'child',lineId:task.id,child:target});propsRef.current.onDirtyChange?.(true);return true;
  }
  async function submitAuthoringChild(kind:'memo'|'task',text:string){
    const target=currentChild(),controller=draftRef.current;
    if(!target||!controller||panelComposingRef.current||composingRef.current||regionPendingRef.current)return false;
    if(inputLockedRef.current||propsRef.current.readOnly||!controller.canApplyLocal()){setMessage('현재는 추가를 적용할 수 없습니다. 입력과 저장 상태를 확인해 주세요. 초안은 남아 있습니다.');return false;}
    const before=currentState(),access=propsRef.current.taskAccess?.(target.parentId,before);
    if(before!==target.workspace||propsRef.current.docId!==target.documentId||access?.kind!=='active'||access.reason){setMessage('추가할 문맥이나 권한이 바뀌었습니다. 초안을 보관하고 현재 항목에서 다시 열어 주세요.');return false;}
    const result=prepareWritingChild(before,{docId:target.documentId,parentId:target.parentId,kind,text,expectedRaw:target.raw});
    if(!result.ok){setMessage(result.reason);return false;}
    // In a folder view the new line must land inside a part this view can edit, or it would vanish from sight.
    const folderId=propsRef.current.folderId;
    if(folderId&&!readProgramFolderRegions(result.workspace,target.documentId,folderId)?.regions.some(region=>!region.readOnly&&region.lineIds.includes(result.lineId))){setMessage(REGION_OUTSIDE);return false;}
    if(!controller.applyLocal(result.workspace,kind==='memo'?'부모 메모 수정':'독립 하위 할 일 추가')){setMessage('변경을 적용하지 못했습니다. 초안은 남아 있습니다.');return false;}
    editorRef.current?.setValue(controller.getState().raw,{preserveSelection:true});
    // The accepted source now owns the text and IDs. Saving may acknowledge an
    // older snapshot; it must not keep this menu or the new caret waiting.
    delete childDrafts.current[target.parentId+':'+kind];dismissPanel(false,false);
    const index=currentDoc()?.lines.findIndex(l=>l.id===result.lineId)??-1;
    if(folderId)requestAnimationFrame(()=>{if(revealAllowed())regionPortRef.current?.revealLine?.(result.lineId);});
    else if(index>=0){const area=textArea();editorRef.current?.focus(index);area?.setSelectionRange(result.offset,result.offset);editorRef.current?.refreshViewport();rememberPosition();if(area)revealProgramEditorLine(area,index);}
    scheduleSave();return true;
  }
  function handleAction(action: nativeEditor.Action) {
    if(action.type==='authoring-insert'){openCurrentInsertMenu(action.lineIndex);return;}
    if (action.type === 'move-cancel') { cancelMove(); return; }
    if (action.type==='toggle'?checkActionsDisabled(action.lineIndex):actionsDisabled()) return false;
    const lineId = currentDoc()?.lines[action.lineIndex]?.id ?? null;
    if(composingRef.current)return false;
    if(action.type!=='toggle'&&!draftRef.current?.flush())return false;
    if (action.type === 'move-select') { beginMove(lineId, false); return; }
    if (action.type === 'move-drop') { if (action.beforeLineId !== undefined && action.depth !== undefined) void finishMove(action.beforeLineId, action.depth); return; }
    if (action.type === 'toggle') {
      if (!lineId || composingRef.current || regionPendingRef.current) return false;
      const access = accessFor(lineId);
      const target = currentRow(lineId)?.progressTargetId;
      if (!propsRef.current.taskAccess || !target || !access || access.kind !== 'active' || access.reason
        || access.lineId !== target || !access.documentId
        || !M.getDocument(currentState(), access.documentId)?.lines.some(line => line.id === target)) {
        setPanel({ kind: 'reference', lineId }); return false;
      }
      // N10: a repeat line's tap finishes its round (the box stays empty, its date moves on); no C2 chips.
      const repeat = repeatLineFor(lineId);
      if (repeat && !repeat.block) { void finishRepeatHere(repeat.task.id, repeat.task.title, repeat.task.date); return; }
      const checkTitle = currentRow(lineId)?.title || currentRow(lineId)?.task?.title || '할 일', checkBefore = M.currentProgress(currentState(), target);
      const controller=draftRef.current,compute=propsRef.current.writingCompute,context=propsRef.current.writingContext?.();
      if(controller&&compute&&context){
        const before=currentState(),selected=writingSelection();
        let locallyApplied=controller.applyCheck(lineId,today());
        const selectedRow=currentRow(lineId);
        if(!locallyApplied&&selectedRow?.kind==='subcheck'&&selectedRow.isCanonical&&!selectedRow.isReference&&controller.canApplyLocal()){
          const change=programDirectCheckboxChange(before,propsRef.current.docId,lineId,today());
          if(change.kind==='apply')locallyApplied=controller.applyLocal(change.next,'독립 하위 할 일 체크 변경');
        }
        if(locallyApplied){
          cancelMove();orderHistoryRef.current.clear();orderPositionsRef.current=[];orderEpochRef.current++;
          editorRef.current?.setValue(controller.getState().raw,{preserveSelection:true});
          const returned=selected&&programTextSelectionAfterChange(before,currentState(),propsRef.current.docId,selected);if(returned)restoreWritingSelection(returned);
          editorRef.current?.refresh();noticeCheck(target,checkTitle,checkBefore);void saveNow();return;
        }
        // Unsupported/structural checks cannot borrow a normal save exemption.
        if(controller.getState().saving)return false;
        const generation=controller.generation(),requestId=crypto.randomUUID(),docId=propsRef.current.docId,policy=JSON.stringify(access);
        const notifyCheck=propsRef.current.onDirtyChange;
        if(timerRef.current)clearTimeout(timerRef.current);checkPendingRef.current=requestId;checkNotifyRef.current=notifyCheck;setCheckPending(true);notifyCheck?.(true);
        void compute.run({...context,docId,workingGeneration:generation,requestId},{kind:'check',workspace:before,lineId,date:today()}).then(reply=>{
          if(checkPendingRef.current!==requestId||draftRef.current!==controller)return;
          checkPendingRef.current=null;setCheckPending(false);
          const live=propsRef.current.writingContext?.();
          if(!reply.ok||live?.ownerId!==context.ownerId||live.baseRevision!==context.baseRevision||propsRef.current.docId!==docId
            ||controller.generation()!==generation||currentState()!==before||inputLockedRef.current||propsRef.current.readOnly||composingRef.current
            ||policy!==JSON.stringify(propsRef.current.taskAccess?.(target,currentState()))){setMessage('체크할 문맥이 바뀌어 반영하지 않았습니다. 입력은 유지했습니다.');scheduleSave();return;}
          if(reply.panel){openProgress(lineId);if(reply.panel==='future')setMessage('미래 날짜의 진행 기록이 있습니다. 기록 날짜를 확인한 뒤 변경해 주세요.');}
          else if(reply.workspace){void apply(reply.workspace,'할 일 체크 변경');noticeCheck(target,checkTitle,checkBefore);}
          else setMessage('체크 변경을 반영하지 못했습니다. 현재 내용과 기록은 유지했습니다.');
        }).catch(()=>{if(draftRef.current===controller)setMessage('체크를 확인하지 못했습니다. 현재 입력은 유지했습니다.');}).finally(()=>{
          if(draftRef.current!==controller||propsRef.current.docId!==docId)return;
          if(checkPendingRef.current===requestId){checkPendingRef.current=null;setCheckPending(false);}
          checkNotifyRef.current=undefined;
          notifyCheck?.(programTextInputPending(controller.getState(),textArea()?.value,composingRef.current,regionPendingRef.current,!!checkPendingRef.current));
        });return;
      }
      if(!draftRef.current?.flush())return false;
      const change = programDirectCheckboxChange(currentState(), propsRef.current.docId, lineId, today());
      if (change.kind === 'panel') {
        openProgress(lineId);
        if (change.reason === 'future') setMessage('미래 날짜의 진행 기록이 있습니다. 기록 날짜를 확인한 뒤 변경해 주세요.');
      } else if (change.kind === 'apply') { void apply(change.next, change.percent === 100 ? '할 일 완료' : '완료 취소'); noticeCheck(target, checkTitle, checkBefore); }
      else setMessage('체크 변경을 반영하지 못했습니다. 현재 내용과 기록은 유지했습니다.');
      return;
    }
    if (action.type === 'progress-open') { if (!showCheckChips(lineId)) openProgress(lineId); return; }
    if (action.type === 'task-date') { openProgress(lineId, 'date'); return; }
    if (action.type === 'scope-open') {
      // F4-a (FR-1): a folder line's entrance opens that folder's screen, as its ⋮ '이 폴더 보기' does (saved first).
      const row = currentRow(lineId), scopeId = row?.scopeId;
      if (scopeId) void saveNow().then(saved => { if (saved) propsRef.current.onOpenScope?.(scopeId); });
      return;
    }
    if (['reference-open', 'task-origin'].includes(action.type)) { setPanel({ kind: 'reference', lineId }); return; }
    if (action.type === 'scope-picker') { openFolderPanel(lineId); return; }
    if (action.type === 'task-picker') { void connectFlow(lineId); return; }
    setMessage(''); setPanel({ kind: 'insert', lineId });
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let alive = true;
    checkPendingRef.current=null;setCheckPending(false);
    const documentInput=createProgramDocumentInput(propsRef.current.workspace,props.docId);documentInputRef.current=documentInput;
    const controller = createProgramTextDraft(documentInput.initial, props.docId,
      (next, label, options) => propsRef.current.onCommit(next, label, options).then(accepted => {
        if (accepted && options?.writingGeneration !== undefined) checkAcked.current = Math.max(checkAcked.current, options.writingGeneration);
        return accepted;
      }), next => {
        if (!alive) return;
        setDraft(next); propsRef.current.onDirtyChange?.(!!currentChild()||programTextInputPending(next,textArea()?.value,composingRef.current,regionPendingRef.current,!!checkPendingRef.current));
        queueMicrotask(() => { if (alive) editorRef.current?.refresh(); });
      }, next => propsRef.current.validateWorkspace?.(next) ?? true,documentInput,!!propsRef.current.writingCompute,()=>propsRef.current.validateWorkspace,()=>propsRef.current.workspace);
    draftRef.current = controller; setDraft(controller.getState());
    propsRef.current.onRegisterConfirmedSave?.((before, next, ack) => {
      if (!alive || composingRef.current || inputLockedRef.current || textArea()?.value !== controller.getState().raw) return false;
      // Confirmation updates state only; preserve the native textarea and its selection/history.
      const accepted = controller.acceptConfirmedSave(before, next, ack);
      // Input typed while the result was unknown (its own save was refused then) is saved now.
      if (accepted && !ack && controller.getState().dirty && !controller.getState().saving) scheduleSave();
      return accepted;
    });
    orderHistoryRef.current = createProgramPermutationHistory(props.docId); orderPositionsRef.current = []; orderEpochRef.current++; pendingOrderRef.current = null;
    movingRef.current = null; setMoving(null); setPanel(null);
    type FreshIndent = NonNullable<ReturnType<typeof controller.planFreshFolderIndent>>;
    let indentCandidate: FreshIndent | null = null, indentAction: FreshIndent | null = null;
    const currentIndentAction = (raw: string) => indentAction && alive && draftRef.current === controller && propsRef.current.docId === props.docId
      && propsRef.current.active !== false && !propsRef.current.folderId && !composingRef.current && !inputLockedRef.current && !propsRef.current.readOnly
      && folderNoticeRef.current?.operationId === indentAction.operationId && controller.getState().working === indentAction.before
      && controller.generation() === indentAction.generation && indentAction.plan.nextRaw === raw ? indentAction : null;
    // N5 3b: once the new folder moved, an earlier D11 reason stops standing in front of its notice, but only when it
    // no longer holds (its lines were this one, or are no longer linked folder lines); one about another folder line stays.
    const applyFreshIndent = (proof: FreshIndent, raw: string) => {
      const moved = M.getDocument(proof.before, props.docId)?.lines[proof.plan.startLine]?.id ?? '';
      if (!controller.applyFreshFolderIndent(proof, raw)) return false;
      if (!folderRefusalStands(controller.getState().working, folderRefusal.current, moved)) {
        folderRefusal.current = null; setMessage(current => current === FOLDER_INDENT_NOTICE ? '' : current);
      }
      return true;
    };
    const rowPatch = programRowPatchEnabled();
    let aligned: { accepted: string; shown: string; rows: unknown; out: TextEditorRowMeta[] } | null = null;
    const instance = nativeEditor.create(host, {
      value: controller.getState().raw, label: '문서 내용', taskSplitEnabled: !!propsRef.current.authorizeTaskSplit,
      // typelag ② (11/11): typing redraws and measures only the rows it changed; one switch (typing-row-patch.ts).
      rowPatch,
      getCheckAction: (_index, meta) => programCheckboxAction(meta,
        meta.progressTargetId ? propsRef.current.taskAccess?.(meta.progressTargetId,currentState()) : undefined, today()),
      // 11/10 18:05 (실사용): rows of the text the model took, placed on the text shown; a refused or held line has none.
      getRowMeta: () => { const state = controller.getState(), rows = documentInput.paint(state.working) ?? textEditorRows(state.working, props.docId);
        const accepted = M.raw(M.getDocument(state.working, props.docId)), shown = textArea()?.value ?? state.raw;
        if (accepted === shown) return withMoveTraces(state.working, rows);
        // typelag ②: a composition renders several times over the same texts; the rows placed once serve them all.
        if (rowPatch && aligned && aligned.accepted === accepted && aligned.shown === shown && aligned.rows === rows) return withMoveTraces(state.working, aligned.out);
        const out = programAlignRows(accepted, shown, rows, rowPatch) as typeof rows;
        aligned = { accepted, shown, rows, out };
        return withMoveTraces(state.working, out); },
      // F9 W-MENU-26: [그날 보기] on a trace line (vendor appendMoveTrace).
      onTraceOpen: (lineIndex: number, at: number) => { openTraceRef.current(lineIndex, at); },
      isActionDisabled: actionsDisabled,
      isPaintDisabled: paintDisabled,
      isIndentDisabled: indentDisabled,
      // Enter keeps the list rules; with the writing tools on, ＋ opens their menu, typed pickers stay off,
      // and list Enter v2 applies (one flag, so turning it off restores the R3 Enter).
      lineBreakEnter:()=>false,
      typingPickers:()=>!propsRef.current.authoringMode,
      plusOpensAuthoring:()=>!!propsRef.current.authoringMode,
      listEnterV2:()=>!!propsRef.current.authoringMode,
      // memo-enter (11/10): after Enter continued a memo, how to leave it (the first few times on this device).
      onMemoContinue:()=>{if(!memoTipBlockedRef.current&&programMemoTipTake(programMemoTipStorage()))setMemoTip(++memoTipKeys.current);},
      onMemoExit:()=>{programMemoTipLeft(programMemoTipStorage());},
      // W12: the empty-line '/' hint follows the writing tools, whose '/' opens the tool menu.
      lineHints:()=>!!propsRef.current.authoringMode&&!propsRef.current.readOnly,
      getAddAnchor:index=>propsRef.current.authoringMode?{parentIndex:index,bottomIndex:index}:null,
      isCheckDisabled: checkActionsDisabled,
      adjustIndentPlan: plan => {
        indentCandidate = null; endFolderNoticeIfOver();
        const area = textArea(), operationId = folderNoticeRef.current?.operationId;
        if (!alive || draftRef.current !== controller || propsRef.current.active === false || propsRef.current.folderId || composingRef.current
          || inputLockedRef.current || propsRef.current.readOnly || operationId === undefined || area?.value !== controller.getState().raw
          || plan.selectionBefore.start !== area.selectionStart || plan.selectionBefore.end !== area.selectionEnd) return null;
        indentCandidate = controller.planFreshFolderIndent(plan, operationId);
        return indentCandidate?.plan ?? null;
      },
      onIndentStart: plan => { indentAction = indentCandidate?.plan === plan ? indentCandidate : null; indentCandidate = null; },
      onIndentEnd: () => { indentAction = null; indentCandidate = null; },
      canApplyIndent: (raw, details) => {
        if (indentDisabled()) return false;
        // D11 (d): ⇤·⇥ never moves a linked folder line, alone or with other selected lines: the whole action is
        // skipped and the reason shows. The bar, Tab and a press held through a composition all come here.
        const state = controller.getState();
        if (indentCandidate && indentCandidate.before === state.working && indentCandidate.generation === controller.generation()
          && indentCandidate.plan.nextRaw === raw && folderNoticeRef.current?.operationId === indentCandidate.operationId) return true;
        if (state.raw === textArea()?.value && indentTouchesLinkedFolder(state.working, props.docId, details.startLine, details.endLine)) {
          folderIndentSkipped.current = true; indentRefusal.current = { kind: 'folder' };
          refuseFolderIndent((M.getDocument(state.working, props.docId)?.lines ?? []).slice(details.startLine, details.endLine + 1).map(line => line.id)); return false;
        }
        // The model's own reason is kept for the bar's notice (S5).
        const result = M.editTextResult(state.working, props.docId, raw, { progressDate: today() });
        if (M.raw(M.getDocument(result.state, props.docId)) === raw) return true;
        indentRefusal.current = { kind: 'model', reason: result.reason };
        return false;
      },
      canApplyTaskSplit: (raw, intent) => {
        if (!intent.taskSplit) return true;
        const before = controller.getState().working;
        if (actionsDisabled() || propsRef.current.authorizeTaskSplit?.(intent.taskSplit.sourceLineId, before) !== true) return false;
        const next = M.editTextResult(before, props.docId, raw, { folderText: true,
          inputSplice: { start: intent.start, end: intent.end, text: intent.text }, taskSplit: intent.taskSplit });
        return next.reason === null && M.raw(M.getDocument(next.state, props.docId)) === raw
          && (propsRef.current.validateWorkspace?.(next.state) ?? true);
      },
      beforeEnter: () => {
        // A restored plain slash line has no typing-history ref. Only this real
        // Enter may adopt its exact current unbound head, using W16's parser.
        const liveArea = textArea(), live = controller.getState();
        if (draftRef.current === controller && propsRef.current.docId === props.docId
          && liveArea && !liveArea.readOnly && !live.invalid && !inputLockedRef.current && propsRef.current.active !== false
          && !composingRef.current && !propsRef.current.readOnly && live.raw === liveArea.value
          && liveArea.selectionStart === liveArea.selectionEnd) {
          const index = liveArea.value.slice(0, liveArea.selectionStart).split('\n').length - 1;
          const head = M.getDocument(live.working, props.docId)?.lines[index];
          if (head && !live.working.bindings.some(row => row.docId === props.docId && row.lineId === head.id)
            && readFolderPickerCommand(live.working, props.docId, head.id, liveArea.value, liveArea.selectionStart, liveArea.selectionEnd)) {
            // Finish a different old owner only as leaving it (link-only), never
            // as this Enter's declaration. Re-read the exact B command after it.
            if (heldFolderLineRef.current && heldFolderLineRef.current.id !== head.id) finishHeldFolderLine(false);
            const current = controller.getState();
            if (!current.invalid && current.raw === liveArea.value
              && !current.working.bindings.some(row => row.docId === props.docId && row.lineId === head.id)
              && readFolderPickerCommand(current.working, props.docId, head.id, liveArea.value, liveArea.selectionStart, liveArea.selectionEnd))
              heldFolderLineRef.current = { id: head.id, left: false, offAtStart: false };
          }
        }
        finishHeldFolderLine(true); finishRenamedFolderLines(true);
        const area = textArea();
        if (area && area.selectionStart === area.selectionEnd) {
          const at = area.value.slice(0, area.selectionStart).split('\n').length - 1;
          const line = M.getDocument(controller.getState().working, props.docId)?.lines[at];
          if (line && area.selectionStart === area.value.split('\n').slice(0, at + 1).join('\n').length) controller.noteFolderEnter(line.id);
        }
      },
      onChange: (raw, input) => {
        if (inputLockedRef.current || propsRef.current.readOnly) { editorRef.current?.setValue(controller.getState().raw, { preserveSelection: true }); return; }
        if (raw === controller.getState().raw) { historyTypeRef.current = ''; return; }
        const beforeRaw=controller.getState().raw;
        cancelMove();
        orderEpochRef.current++;
        const pending = pendingOrderRef.current;
        const historyType = input?.inputType || historyTypeRef.current; historyTypeRef.current = '';
        const restored = orderHistoryRef.current.resolve(controller.getState().working, raw, historyType);
        const beforeText = controller.getState().working;
        const beforeOperation = controller.folderOperation();
        let accepted = false;
        const hold = heldInput(raw, textArea()?.selectionStart, historyType || input?.inputType || '');
        const indentProof = currentIndentAction(raw);
        if (indentProof) accepted = applyFreshIndent(indentProof, raw);
        else if (pending) {
          accepted = pending.raw === raw && programSame(pending.before, controller.getState().working) && controller.apply(pending.next, '같은 구간 날짜순 정렬');
          if (accepted) orderHistoryRef.current.record(pending.before, pending.next);
          else controller.rejectRaw(raw);
        } else if (restored) accepted = controller.apply(restored, historyType === 'historyUndo' ? '날짜순 정렬 입력 취소' : '날짜순 정렬 다시 실행');
        else if ((historyType === 'historyUndo' || historyType === 'historyRedo') && orderHistoryRef.current.can(controller.getState().working, historyType)) controller.rejectRaw(raw);
        else if (input?.taskSplit && propsRef.current.authorizeTaskSplit?.(input.taskSplit.sourceLineId, controller.getState().working) !== true) controller.rejectRaw(raw);
        // 저장 재설계 B: a writing rule's own edit comes with its splice (none for whole lines).
        else { const planned = plannedInputRef.current, plannedSplice = planned && planned.raw === raw ? planned.splice : undefined;
          accepted = controller.updateRaw(raw, '', { inputType: historyType || input?.inputType || '', inputSplice: input?.inputSplice ?? plannedSplice,compositionGeneration:compositionGeneration.current, ...(input?.taskSplit ? { taskSplit: input.taskSplit } : {}), folderHold: hold }); }
        if (restored && accepted) {
          const position = orderPositionsRef.current.slice().reverse().find(entry => programSame(M.getDocument(entry.state, props.docId), M.getDocument(restored, props.docId)));
          if (position) queueMicrotask(() => { const area = textArea(); if (area && area.value === raw) { area.setSelectionRange(position.selection.start, position.selection.end, position.selection.direction); area.scrollTop = position.scrollTop; rememberPosition(); } });
        }
        if (accepted) {
          const afterText = controller.getState().working;
          // A paste can make folders; each new one is announced (B1).
          { const operation = controller.folderOperation();
            const changed = operation && (operation.id !== beforeOperation?.id || operation.at !== beforeOperation.at);
            const notice = controller.getState().folderNotice ?? programFolderCreatedNotice(beforeText, afterText);
            if (notice || changed) showFolderOperation(notice ?? '폴더 분류를 바꿨습니다', 'info', operation?.lineId);
          }
          const renamed = new Set(beforeText.folders.filter(folder => afterText.folders.some(next => next.id === folder.id && next.title !== folder.title)).map(folder => folder.id));
          if (afterText.bindings.some(binding => binding.kind === 'scope' && binding.docId !== props.docId && renamed.has(binding.scopeId))) {
            setMessage('폴더 이름을 바꾸면 연결된 다른 글에도 같은 이름이 표시됩니다.');
          }
          const visibleRaw = controller.getState().raw, area = textArea();
          if (visibleRaw !== raw && area) {
            const start = programFolderTextOffset(raw, visibleRaw, area.selectionStart);
            const end = programFolderTextOffset(raw, visibleRaw, area.selectionEnd);
            const direction = area.selectionDirection;
            editorRef.current?.setValue(visibleRaw, { preserveSelection: true });
            area.setSelectionRange(start, end, direction);
          }
          if (hold) {
            const line = currentDoc()?.lines[hold[0]];
            if (heldFolderLineRef.current && heldFolderLineRef.current.id !== line?.id) finishHeldFolderLine();
            if (line) {
              // D3 B c: a linked line already off its folder's name before this edit stays off the move.
              const same = heldFolderLineRef.current?.id === line.id ? heldFolderLineRef.current : null;
              // S4 v16 phone: ⇤ holds the line too, its name unchanged; only a name edited makes it 'typed back' below.
              const nameOf = (text: TextWorkspaceState) => M.getDocument(text, props.docId)?.lines.find(row => row.id === line.id)?.text.replace(/^ *- \//, '').trim();
              heldFolderLineRef.current = { id: line.id, left: false, offAtStart: same ? same.offAtStart : folderLineOff(beforeText, line.id),
                named: !!same?.named || nameOf(beforeText) !== nameOf(afterText) };
            }
          } else {
            // A paste over linked folder lines' names is finished like typing: every line it renamed goes back.
            const was = new Map((M.getDocument(beforeText, props.docId)?.lines ?? []).map(line => [line.id, line.text]));
            for (const line of M.getDocument(afterText, props.docId)?.lines ?? []) {
              if (was.has(line.id) && was.get(line.id) !== line.text && FOLDER_LINE.test(line.text)
                && afterText.bindings.some(row => row.kind === 'scope' && row.docId === props.docId && row.lineId === line.id)) renamedFolderLinesRef.current.add(line.id);
            }
          }
          requestAuthoringSlash(beforeRaw,historyType||input?.inputType||'');
          barTriggerFn.current(beforeRaw,historyType||input?.inputType||'');
          scheduleSave();
        }
        // 저장 재설계 B: a refused input with held lines still saves its other lines.
        else if (controller.getState().held) scheduleSave();
        else if (timerRef.current) clearTimeout(timerRef.current);
        if (accepted || controller.getState().held) checkTextLimit(raw);
        rememberPosition(); finishDateSuggestion();
      },
      onAction: handleAction,
    });
    editorRef.current = instance;
    const textarea = host.querySelector<HTMLTextAreaElement>('textarea');
    let lastAuthoringSlash='';
    function requestAuthoringSlash(beforeRaw:string,inputType:string){
      if(!propsRef.current.authoringMode||!textarea||composingRef.current
        ||!['insertText','insertReplacementText','insertCompositionText'].includes(inputType))return;
      const raw=textarea.value,caret=textarea.selectionStart;
      if(raw===beforeRaw||textarea.selectionEnd!==caret||raw[caret-1]!=='/')return;
      // Input v2 stage 2: on the phone bar a lone '/' opens the folder chips instead (their [메뉴] opens this menu).
      // typelag (11/11): asked only once a '/' was typed — it reads the layout, and every key paid for it.
      if(barShownNow())return;
      const rowStart=raw.lastIndexOf('\n',caret-1)+1,rowEnd=raw.indexOf('\n',caret);
      if(raw.slice(rowStart,rowEnd<0?raw.length:rowEnd).trim()!=='/')return;
      let start=0,oldEnd=beforeRaw.length,newEnd=raw.length;
      while(start<oldEnd&&start<newEnd&&beforeRaw[start]===raw[start])start++;
      while(oldEnd>start&&newEnd>start&&beforeRaw[oldEnd-1]===raw[newEnd-1]){oldEnd--;newEnd--;}
      if(raw.slice(start,newEnd)!=='/'||/[^\t ]/.test(beforeRaw.slice(start,oldEnd)))return;
      queueMicrotask(()=>{
        if(!alive||composingRef.current||!textarea||propsRef.current.docId!==props.docId||inputLockedRef.current
          ||propsRef.current.readOnly||textarea.value!==raw||textarea.selectionStart!==caret||textarea.selectionEnd!==caret)return;
        const state=controller.getState();if(state.invalid||state.raw!==raw)return;
        const index=raw.slice(0,caret).split('\n').length-1,line=currentDoc()?.lines[index];
        if(line?.text.trim()!=='/')return;
        const key=line.id+':'+controller.generation()+':'+raw;if(lastAuthoringSlash===key)return;lastAuthoringSlash=key;
        openCurrentInsertMenu(index);
      });
    }
    /** int7b QA 0-5 (W-GUARD-07): a composition never starts inside a mark. The browser composes where the caret is when
     *  the composition starts (each syllable its own ↶ step, as anywhere), so the caret goes to the title's start first,
     *  where a typed letter goes; only on a draft whose model text is the text shown (the rules' own condition). */
    const compositionToTitle = () => {
      if (!textarea || applyingPlanRef.current || propsRef.current.folderId || textarea.selectionStart !== textarea.selectionEnd) return;
      const shown = controller.getState();
      if (shown.invalid || textarea.value !== shown.raw || M.raw(M.getDocument(shown.working, props.docId)) !== textarea.value) return;
      const to = programCompositionCaret(textarea.value, M.rowMeta(shown.working, props.docId), textarea.selectionStart);
      if (to !== null) textarea.setSelectionRange(to, to);
    };
    const compositionStart = () => { compositionToTitle(); setSuggestion(null); compositionGeneration.current++;controller.cancelPreparedRaw();composingRef.current = true; setComposing(true); orderEpochRef.current++; setOrderPreview(null); propsRef.current.onDirtyChange?.(true); };
    const compositionEnd = () => {
      compositionGeneration.current++;controller.cancelPreparedRaw();composingRef.current = false; setComposing(false);
      // The native target listener publishes the final raw after this capture listener.
      // Even unchanged raw must release protection and rearm a timer spent composing.
      queueMicrotask(() => {
        if (!alive || composingRef.current) return;
        const state = controller.getState();
        propsRef.current.onDirtyChange?.(!!currentChild()||programTextInputPending(state,textArea()?.value,composingRef.current,regionPendingRef.current,!!checkPendingRef.current));
        setMessage(previous => previous === '한글 입력을 마친 뒤 보기 범위를 바꿔 주세요.' ? '' : previous);
        if (state.dirty && !state.saving && !state.invalid && !state.error) scheduleSave();
        if (dateSuggestionFinish.current) finishDateSuggestion();
      });
    };
    host.addEventListener('compositionstart', compositionStart, true);
    host.addEventListener('compositionend', compositionEnd, true);
    // The memo tip goes with the next key, a composition starting, a press (the caret moving off) or the input left;
    // captured first, so the Enter that shows it is not one of them.
    const clearMemoTip = () => setMemoTip(null);
    for (const type of ['keydown', 'compositionstart', 'pointerdown', 'focusout']) host.addEventListener(type, clearMemoTip, true);
    /** 저장 재설계 B (11/10): the writing rules (writing-guard.ts) on a person's own ⌫, Delete, cut, paste or typed letter,
     *  before the browser edits. Only on a draft whose model text is the text shown; never on an edit the editor or the
     *  bar makes itself (theirs insert whole strings), a composition, or Enter (the native Enter rules own it). */
    const writingRule = (event: InputEvent, type: string, start: number, end: number, insert: string | null) => {
      if (applyingPlanRef.current || !textarea || composingRef.current || event.isComposing || propsRef.current.folderId) return false;
      const text = type === 'insertFromPaste' ? (event.dataTransfer?.getData('text/plain') ?? event.data ?? '').replace(/\r\n?/g, '\n') : type === 'deleteByCut' ? '' : insert;
      if (text === null || !(type === 'deleteContentBackward' || type === 'deleteContentForward' || type === 'deleteByCut'
        || type === 'insertFromPaste' && !!text || type === 'insertText' && text.length === 1 && text !== '\n')) return false;
      const shown = controller.getState();
      if (shown.invalid || textarea.value !== shown.raw || M.raw(M.getDocument(shown.working, props.docId)) !== textarea.value) return false;
      const from = type === 'deleteByCut' ? textarea.selectionStart : start, to = type === 'deleteByCut' ? textarea.selectionEnd : end;
      if (type === 'deleteByCut' && from === to) return false;
      const stop = () => { event.preventDefault(); event.stopImmediatePropagation(); };
      // P3: a paste past the limit is asked before anything goes in.
      if (type === 'insertFromPaste' && programPasteOverLimit(textarea.value, from, to, text)) { stop(); askLongPaste(from, to, text); return true; }
      // A long paste goes in as the browser pastes it (one input); its line problems, if any, are held lines.
      if (type === 'insertFromPaste' && (text.length > 4000 || text.split('\n').length > 60)) { notePaste(from, text); return false; }
      const plan = planProgramWritingInput(M, shown.working, props.docId, { start: from, end: to, text }, type);
      if (plan.kind === 'apply' && !plan.changed) { if (type === 'insertFromPaste') notePaste(from, text); return false; }
      // A cut's copy is already made (the cut event comes first); only its deletion is planned.
      stop(); runWritingPlan(plan, { start: from, end: to, text }, type); return true;
    };
    const preventLockedInput = (event: Event) => {
      controller.cancelPreparedRaw();
      const type = (event as InputEvent).inputType;
      // Ctrl+Z · Ctrl+Y · Ctrl+Shift+Z (and the browser's own undo) take the same steps as ↶ ↷ (P3, 11/7): a folder or
      // date chosen from a chip, a folder step, a repeat check go back as one step; else the text's own history.
      if ((type === 'historyUndo' || type === 'historyRedo') && !composingRef.current && historyStepFn.current(type)) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if (type === 'historyUndo') explainRawFolderUndo();
      if ((inputLockedRef.current || (controller.getState().saving && (type === 'historyUndo' || type === 'historyRedo'))) && !composingRef.current) { event.preventDefault(); event.stopImmediatePropagation(); }
      if (!event.defaultPrevented && !composingRef.current && textarea && propsRef.current.validateWorkspace && !type?.startsWith('history')) {
        let start = textarea.selectionStart, end = textarea.selectionEnd, insert: string | null = null;
        if (type === 'insertText' || type === 'insertFromPaste') insert = (event as InputEvent).data;
        else if (type === 'insertParagraph' || type === 'insertLineBreak') insert = '\n';
        else if (type === 'deleteContentBackward') { insert = ''; if (start === end) start = Math.max(0, start - 1); }
        else if (type === 'deleteContentForward') { insert = ''; if (start === end) end = Math.min(textarea.value.length, end + 1); }
        if (insert !== null && currentIndentAction(textarea.value.slice(0, start) + insert + textarea.value.slice(end))) return;
        if (writingRule(event as InputEvent, type ?? '', start, end, insert)) return;
        if (insert !== null) {
          const raw=textarea.value.slice(0,start)+insert+textarea.value.slice(end);
          // D11 B: this proof exists only inside this exact synchronous native indentation.
          // Every other beforeinput keeps the ordinary linked-folder/model guard.
          if (currentIndentAction(raw)) return;
          // N5 phone (D11 보강): ⌫·Delete or typing in a linked folder line's leading spaces, or joining it to the line
          // above, would move the folder by text. Nothing changes and the reason shows, instead of a refused draft
          // that blocks saving and keeps a recovery row. Only on a valid draft whose model text is the text shown: a draft
          // already refused (its working model is the older text) goes the usual way, so typing it back can repair it.
          const shownState = controller.getState();
          if (!shownState.invalid && textarea.value === shownState.raw && M.raw(M.getDocument(shownState.working, props.docId)) === textarea.value
            && textEditTouchesLinkedFolderIndent(shownState.working, props.docId, start, end, insert)) {
            event.preventDefault(); event.stopImmediatePropagation();
            refuseFolderIndent(linkedFolderLinesTextEditMoves(shownState.working, props.docId, start, end, insert));
            indentRefusal.current = { kind: 'folder' }; return;
          }
          if (!controller.prepareRaw(raw,{inputType:type??'',compositionGeneration:compositionGeneration.current,...(type==='insertFromPaste'?{inputSplice:{start,end,text:insert}}:{}),folderHold:heldInput(raw,start+insert.length,type??'')})) {
            event.preventDefault(); event.stopImmediatePropagation();
            const index = textarea.value.slice(0, textarea.selectionStart).split('\n').length - 1;
            setMessage(programTextProtectionMessage(accessFor(currentDoc()?.lines[index]?.id ?? null)));
            // Bar indent review P2: an ⇤·⇥ this refused keeps this reason; the bar's notice must not replace it.
            indentRefusal.current = { kind: 'protected' };
          }
        }
      }
    };
    // N7 review 6: mid-composition the native editor holds its onChange, so no line is held yet when the blur comes
    // (a folder name selected and typed over in Hangul). The finish is scheduled anyway, for after compositionend.
    const finishOnBlur = () => { if (composingRef.current) finishAfterComposition.current = true; finishHeldFolderLine(); finishRenamedFolderLines(true); };
    // N10 (SPEC 1): the caret leaving a line (or the editor) settles the repeat lines it has left.
    // 저장 재설계 B: the caret's line, for a held line's words and fixes.
    const noteCaretLine = () => { if (textarea) setWritingCaretLine(textarea.value.slice(0, textarea.selectionStart).split('\n').length - 1); };
    const settleOnMove = () => { settleRepeatLines(false); settleScaffold(); noteCaretLine(); }, settleOnBlur = () => settleRepeatLines(true);
    const observeInput = (event: Event) => {
      const input=event as InputEvent;historyTypeRef.current=input.inputType||historyTypeRef.current;lastRepeatCheck.current=null;
      // 저장 재설계 B: typing on ends K2's question (nothing was merged); the caret's line follows the typing. Not during a
      // planned edit: the browser sends one input per line of it, and the editor would render each time.
      if (!applyingPlanRef.current) { setWritingNotice(previous => previous?.tone === 'choose' ? null : previous); noteCaretLine(); }
      // int5 QA P2-INT5-1: a ↶ that brought back a start taken away leaves the caret at its end, nothing selected.
      const restore=scaffoldRestoreRef.current;
      if(restore&&textarea){if(textarea.value===restore.raw){scaffoldRestoreRef.current=null;textarea.setSelectionRange(restore.caret,restore.caret);}else if(input.inputType!=='historyUndo')scaffoldRestoreRef.current=null;}
    };
    if (textarea) {
      textarea.id = `program-text-${encodeURIComponent(props.docId)}`;
      textarea.readOnly = inputLockedRef.current || !!propsRef.current.readOnly;
      const position = propsRef.current.initialPosition;
      if (position) {
        textarea.setSelectionRange(Math.min(position.start, textarea.value.length), Math.min(position.end, textarea.value.length));
        textarea.scrollTop = position.scrollTop;
      }
      for (const event of ['select', 'scroll', 'keyup', 'click', 'blur']) textarea.addEventListener(event, rememberPosition);
      for (const event of ['select', 'keyup', 'click', 'blur']) textarea.addEventListener(event, finishDateSuggestion);
      textarea.addEventListener('blur', finishOnBlur);
      for (const event of ['select', 'keyup', 'click']) textarea.addEventListener(event, settleOnMove);
      textarea.addEventListener('blur', settleOnBlur);
      textarea.addEventListener('beforeinput', preventLockedInput, true);
      textarea.addEventListener('input', observeInput, true);
    }
    const warnOnExit = (event: BeforeUnloadEvent) => {
      if (!controller.getState().dirty && !composingRef.current && !regionPendingRef.current) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnOnExit);
    // The parent may have requested this source while the retained editor was
    // still mounting. Notify again only after native input is fully configured.
    propsRef.current.onRegisterSourceFocus?.(focusSourceRow);
    return () => {
      alive = false; rememberPosition();
      propsRef.current.onRegisterConfirmedSave?.(null);
      host.removeEventListener('compositionstart', compositionStart, true); host.removeEventListener('compositionend', compositionEnd, true);
      for (const type of ['keydown', 'compositionstart', 'pointerdown', 'focusout']) host.removeEventListener(type, clearMemoTip, true);
      window.removeEventListener('beforeunload', warnOnExit);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (textarea) for (const event of ['select', 'scroll', 'keyup', 'click', 'blur']) textarea.removeEventListener(event, rememberPosition);
      if (textarea) for (const event of ['select', 'keyup', 'click', 'blur']) textarea.removeEventListener(event, finishDateSuggestion);
      textarea?.removeEventListener('blur', finishOnBlur);
      if (textarea) for (const event of ['select', 'keyup', 'click']) textarea.removeEventListener(event, settleOnMove);
      textarea?.removeEventListener('blur', settleOnBlur);
      textarea?.removeEventListener('beforeinput', preventLockedInput, true);
      textarea?.removeEventListener('input', observeInput, true);
      checkPendingRef.current=null;
      checkNotifyRef.current?.(programTextInputPending(controller.getState(),textarea?.value,composingRef.current,regionPendingRef.current,false));checkNotifyRef.current=undefined;
      instance.destroy(); editorRef.current = null; draftRef.current = null;documentInputRef.current=null;
    };
    // Keep the same native textarea through every edit, failed save and parent rerender.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.docId]);

  useEffect(() => {
    const area = textArea(); if (!area) return;
    let epoch = 0, frame = 0, alive = true;
    const cycle = pickerImeFactory.create(() => ({ raw: area.value, start: area.selectionStart, end: area.selectionEnd,
      direction: area.selectionDirection, epoch, focused: document.activeElement === area, editable: !area.readOnly }));
    pickerIme.current = cycle;
    const refresh = () => { if (frame) cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { frame = 0; if (alive) { syncPicker(); releasePickerHold(); } }); };
    const start = () => {
      cycle.start();
      const controller = draftRef.current, line = readFolderPickerLine(area.value, area.selectionStart, area.selectionEnd);
      const source = line && currentDoc()?.lines[line.index];
      pickerCompositionOwner.current = controller && source && pickerRef.current?.lineId === source.id
        && controller.getState().raw === area.value && document.activeElement === area
        ? { controller, surface: area, documentId: propsRef.current.docId, lineId: source.id, raw: area.value, caret: area.selectionStart } : null;
    };
    const input = (event: Event) => { epoch++; cycle.input(event as InputEvent); refresh(); };
    // Registered after the native target listeners: the native editor owns the
    // final composition RAW before this receipt and any React picker render.
    const end = (event: Event) => { pickerCompositionOwner.current = null; cycle.end(event as CompositionEvent); refresh(); };
    const keyup = () => { cycle.keyup(); refresh(); };
    const reconcile = () => { cycle.reconcile(); refresh(); };
    const outside = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && !hostRef.current?.contains(target) && !barRef.current?.contains(target)
        && !(target instanceof Element && target.closest('[data-folder-picker]'))) { pickerHold.cancel(); setPickerHeld(false); presentPicker(null); }
    };
    area.addEventListener('compositionstart', start); area.addEventListener('compositionend', end);
    area.addEventListener('input', input); area.addEventListener('keyup', keyup);
    for (const name of ['select', 'click', 'focus', 'blur', 'scroll']) area.addEventListener(name, reconcile);
    window.addEventListener('resize', refresh); window.addEventListener('scroll', refresh, true);
    document.addEventListener('pointerdown', outside, true);
    return () => {
      alive = false; if (frame) cancelAnimationFrame(frame); cycle.cancel(); pickerIme.current = null; pickerCompositionOwner.current = null;
      pickerHold.cancel(); if (pickerHoldLimit.current) clearTimeout(pickerHoldLimit.current);
      pickerRef.current = null;
      area.removeEventListener('compositionstart', start); area.removeEventListener('compositionend', end);
      area.removeEventListener('input', input); area.removeEventListener('keyup', keyup);
      for (const name of ['select', 'click', 'focus', 'blur', 'scroll']) area.removeEventListener(name, reconcile);
      window.removeEventListener('resize', refresh); window.removeEventListener('scroll', refresh, true);
      document.removeEventListener('pointerdown', outside, true);
    };
    // Native owner stays mounted through input and React renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.docId]);
  useEffect(() => {
    // A remote/ACK snapshot can change folder names without an input event.
    // Run after the native synchronize effect, retaining a highlighted ID only.
    const timer = setTimeout(() => { syncPicker(); releasePickerHold(); }, 0);
    return () => clearTimeout(timer);
  }, [composing, draft.saving, inputLocked, props.readOnly, draft.invalid, mode, panel, moving, props.workspace]);
  useEffect(() => {
    if (!picker || picker.navigation < 0) return;
    const option = document.getElementById(`${pickerId}-${picker.navigation}`), list = option?.parentElement;
    if (!option || list?.getAttribute('role') !== 'listbox') return;
    const cell = option.getBoundingClientRect(), box = list.getBoundingClientRect();
    if (picker.phone) {
      if (cell.left < box.left) list.scrollLeft -= box.left - cell.left;
      else if (cell.right > box.right) list.scrollLeft += cell.right - box.right;
    } else {
      if (cell.top < box.top) list.scrollTop -= box.top - cell.top;
      else if (cell.bottom > box.bottom) list.scrollTop += cell.bottom - box.bottom;
    }
  }, [picker?.navigation, picker?.signature, picker?.phone, pickerId]);

  useEffect(() => {
    const controller = draftRef.current;
    if (!regionPendingRef.current && controller?.synchronize(props.workspace)) {
      orderEpochRef.current++; orderHistoryRef.current.clear(); orderPositionsRef.current = [];
      const installed = editorRef.current?.setValue(controller.getState().raw, { preserveSelection: true }) === true;
      if (draftRef.current !== controller) return;
      // synchronize reports before native installation; publish the completed
      // handoff without releasing any actual input owner or failed installation.
      const state = controller.getState();
      propsRef.current.onDirtyChange?.(!installed || !!currentChild() || state.saving
        || programTextInputPending(state, textArea()?.value, composingRef.current, regionPendingRef.current, !!checkPendingRef.current));
    }
  }, [props.workspace, regionPending]);
  useEffect(() => {
    const textarea = textArea(); if (textarea) {
      textarea.readOnly = inputLockedRef.current || !!props.readOnly;
      textarea.placeholder = props.readOnly ? '' : props.directWriting ? '여기에 바로 적으세요' : EMPTY_DOCUMENT_HINT;
    }
    editorRef.current?.refresh();
  }, [props.readOnly, props.directWriting, props.docId]);
  useEffect(() => { editorRef.current?.setMode(mode); }, [mode, props.docId]);
  useEffect(() => {
    const read = () => { dateSuggestionEnabled.current = taskDateSuggestionsEnabled(); if (!dateSuggestionEnabled.current) setSuggestion(null); };
    const changed = (event: StorageEvent) => { if (event.key === TASK_DATE_SUGGESTION_KEY || event.key === null) read(); };
    read(); window.addEventListener(TASK_DATE_SUGGESTION_EVENT, read); window.addEventListener('storage', changed);
    return () => { window.removeEventListener(TASK_DATE_SUGGESTION_EVENT, read); window.removeEventListener('storage', changed); };
  }, []);
  useEffect(() => {
    if (props.active === false || props.folderId) { setSuggestion(null); setDateApplied(null); dateSuggestionCaret.current = null; }
  }, [props.active, props.folderId]);
  useEffect(() => { dateSuggestionSeen.current.clear(); dateSuggestionCaret.current = null; setSuggestion(null); setDateApplied(null); }, [props.docId]);
  useEffect(() => {
    const candidate = dateSuggestionRef.current;
    if (!candidate) return;
    const source = M.getDocument(draft.working, props.docId)?.lines.find(line => line.id === candidate.lineId), row = currentRow(candidate.lineId);
    // Invalidation reads existing row metadata; date words are parsed only on a line finish or an explicit press.
    if (candidate.docId !== props.docId || draft.invalid || dateSuggestionBlocked.current || source?.text !== candidate.source
      || row?.kind !== 'task' || !row.isCanonical || row.isReference || row.scopeKind === 'flow'
      || row.dateLineId && row.groupDate !== taskDateSuggestionToday() || row.task?.explicitDate) setSuggestion(null);
  }, [draft.working, draft.invalid, moving, message, checkNotice, folderNotice, repeatNotice, memoTip, dateApplied]);
  useEffect(() => { if (!dateApplied) return; const timer = setTimeout(() => setDateApplied(current => current === dateApplied ? null : current), 6000); return () => clearTimeout(timer); }, [dateApplied]);
  // W15: an info notice ends 6s after it shows, a choice 6s after the caret leaves its block; held, neither.
  // Waiting behind the move notice or a message, it has not shown yet (review P2): its time starts once it shows.
  // C2: the check notice, the newest tap's, goes before a folder notice of its rank or lower (never before a warning).
  const checkTone = checkNotice ? programCheckNoticeView(checkNotice).tone : null;
  const checkBeforeFolder = !!checkNotice && !!folderNotice && folderNotice.tone !== 'warn' && !(checkTone === 'info' && folderNotice.tone === 'choose');
  const folderWaiting = !!folderNotice && (!!moving || !!message && !panel || checkBeforeFolder);
  const folderWaitedRef = useRef(false);
  const restartFolderNotice = () => {
    // Until the restarted notice renders, the one shown has no due time (its old one would be in the past).
    folderNoticeRestarting.current = folderNoticeRef.current;
    setFolderNotice(current => current && { ...current, shownAt: performance.now(), leftBlockAt: current.leftBlockAt === null ? null : performance.now() });
  };
  useEffect(() => {
    if (folderWaiting) { folderWaitedRef.current = true; return; }
    if (!folderWaitedRef.current) return;
    folderWaitedRef.current = false; restartFolderNotice();
  }, [folderWaiting]);
  // N5 3b phone: a new folder's notice held for its ⇤ has its 6s from when that hold ends.
  const freshHeldRef = useRef(false);
  useEffect(() => {
    if (freshHeld) { freshHeldRef.current = true; return; }
    if (!freshHeldRef.current) return;
    freshHeldRef.current = false; restartFolderNotice();
  }, [freshHeld]);
  useEffect(() => { if (memoTip === null) return; const timer = window.setTimeout(() => setMemoTip(current => current === memoTip ? null : current), PROGRAM_MEMO_TIP_MS); return () => window.clearTimeout(timer); }, [memoTip]);
  useEffect(() => {
    // memo-enter (11/10): once that folder step's notice is gone, a later ↶ is the text's own: no '글만 돌아갑니다'.
    if (!folderNotice) { draftRef.current?.endFolderNotice(); folderRawUndoRef.current = false; }
    if (!folderNotice) { folderNoticeDue.current = folderNoticeRestarting.current = null; return; }
    const ends = programNoticeEndsAt({ tone: folderNotice.tone, shownAt: folderNotice.shownAt, leftBlockAt: folderNotice.leftBlockAt, held: noticeHeld || freshHeld, waiting: folderWaiting });
    const restarting = folderNoticeRestarting.current === folderNotice; if (!restarting) folderNoticeRestarting.current = null;
    folderNoticeDue.current = ends === null || restarting ? null : { notice: folderNotice, at: ends };
    if (ends === null) return;
    const timer = window.setTimeout(() => setFolderNotice(current => current === folderNotice ? null : current), Math.max(0, ends - performance.now()));
    return () => window.clearTimeout(timer);
  }, [folderNotice, noticeHeld, folderWaiting, freshHeld]);
  useEffect(() => { syncFreshNotice(); syncBarLine(); }, [folderNotice, draft.working, props.authoringMode, props.active, props.folderId]);
  // QA F3: the settle a save held back, once that save is acknowledged (the caret line, if still there, waits on).
  useEffect(() => { if (!draft.saving && settleWantedRef.current) { settleWantedRef.current = false; settleRepeatLines(false); } }, [draft.saving]);
  // QA F3: leaving a folder view's regions settles their repeat lines, as the body's blur does; after the focus lands.
  useEffect(() => {
    const root = hostRef.current?.parentElement;
    if (!root || !props.folderId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const left = () => { clearTimeout(timer); timer = setTimeout(() => settleRepeatLines(false), 0); };
    root.addEventListener('focusout', left);
    return () => { clearTimeout(timer); root.removeEventListener('focusout', left); };
  }, [props.folderId]);
  // C2: the check notice lasts 10s once it shows; held while pressed or focused there, or while it waits behind another.
  const checkWaiting = !!checkNotice && (!!moving || !!message && !panel || !!folderNotice && !checkBeforeFolder);
  const checkWaitedRef = useRef(false);
  const restartCheckNotice = () => { const current = checkNoticeRef.current; if (current) setCheckNotice({ ...current, shownAt: performance.now() }); };
  useEffect(() => {
    if (!checkNotice) return;
    if (checkWaiting) { checkWaitedRef.current = true; return; }
    if (checkWaitedRef.current) { checkWaitedRef.current = false; restartCheckNotice(); return; }
    const ends = programCheckNoticeEndsAt(checkNotice, noticeHeld);
    if (ends === null) return;
    const timer = window.setTimeout(() => { if (checkNoticeRef.current === checkNotice) setCheckNotice(null); }, Math.max(0, ends - performance.now()));
    return () => window.clearTimeout(timer);
  }, [checkNotice, noticeHeld, checkWaiting]);
  // Choices held for a save run once it ends well, one at a time: each starts a save the next one waits for. After a
  // refused save they do not run; the settle that follows drops them and says so.
  useEffect(() => {
    for (;;) {
      const state = draftRef.current?.getState();
      if (!state || state.saving || state.error || state.invalid) break;
      const held = [...checkHeld.current][0];
      if (!held) break;
      checkHeld.current.delete(held[0]);
      if (checkSignature(state.working, held[1].notice.targetId) !== held[1].signature) { dropLaterCheck(held[1]); continue; }
      performCheckStep(held[1].notice, held[1].step);
    }
  }, [draft.saving]);
  useEffect(() => { settleCheckSaves(); }, [draft]);
  useEffect(() => { checkSaves.current.clear(); checkHeld.current.clear(); setCheckNotice(null); }, [props.docId]);
  useEffect(()=>{
    const last=locationUndo.current;
    if(last&&(!programSame(draft.working,last.redo?last.before:last.after)||last.docId!==props.docId||props.active===false)){
      locationUndo.current=null;setLocationNotice(null);
    }
  },[draft.working,props.docId,props.active]);
  useEffect(()=>{const last=scheduleUndo.current;if(last&&(!programSame(draft.working,last.working)||last.docId!==props.docId||props.active===false)){scheduleUndo.current=null;setScheduleNotice(null);}},[draft.working,props.docId,props.active]);
  // Review P2: a screen or document hiding this retained editor changes none of its props, only its size.
  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    const observer = new ResizeObserver(() => syncFreshNotice()); observer.observe(host);
    return () => observer.disconnect();
  }, [props.docId]);
  useEffect(() => {
    if (props.active !== false) return;
    const tools = hostRef.current?.closest('section')?.querySelector<HTMLDetailsElement>('[data-editor-tools]');
    if (tools) tools.open = false;
  }, [props.active]);
  useEffect(() => {
    const previous = previousFolderRef.current; previousFolderRef.current = props.folderId;
    // Only an explicit, successful fragment handoff restores its caret. Ordinary
    // period/source navigation already owns an exact Item focus request.
    const position = wholeContinuationRef.current, area = textArea(); wholeContinuationRef.current = null;
    if (previous && !props.folderId && position && area && area.value === position.raw
      && hostRef.current?.getClientRects().length && !composingRef.current) {
      editorRef.current?.focus(); area.setSelectionRange(Math.min(position.start, area.value.length), Math.min(position.end, area.value.length));
      rememberPosition();
    }
  }, [props.folderId]);
  useEffect(() => {
    if (panel && dialogRef.current && !dialogRef.current.open) {
      menuReturnRef.current = writingSelection();
      dialogRef.current.showModal();
    }
  }, [panel]);

  useEffect(()=>{
    const dialog=dialogRef.current;if(!panel||!dialog)return;
    const view=dialog.ownerDocument.defaultView;if(!view)return;
    const visual=view.visualViewport;let frame=0;
    const update=()=>{
      frame=0;
      // W5: on a phone the dialog is a sheet whose bottom follows the visual viewport (the keyboard's top).
      for (const [name, value] of Object.entries(programWritingDialogPlace(view, visual))) dialog.style.setProperty(name, value);
      const body=dialog.querySelector<HTMLElement>('.'+styles.dialogBody),active=dialog.ownerDocument.activeElement;
      if(body&&active instanceof HTMLElement&&body.contains(active)){
        const visible=body.getBoundingClientRect(),field=active.getBoundingClientRect();
        if(field.bottom>visible.bottom)body.scrollTop+=field.bottom-visible.bottom+8;
        else if(field.top<visible.top)body.scrollTop-=visible.top-field.top+8;
      }
    };
    const schedule=()=>{if(!frame)frame=view.requestAnimationFrame(update);};
    update();visual?.addEventListener('resize',schedule);visual?.addEventListener('scroll',schedule);view.addEventListener('resize',schedule);dialog.addEventListener('focusin',schedule);
    return()=>{if(frame)view.cancelAnimationFrame(frame);visual?.removeEventListener('resize',schedule);visual?.removeEventListener('scroll',schedule);view.removeEventListener('resize',schedule);dialog.removeEventListener('focusin',schedule);};
  },[panel]);

  // Keep the native install/sync lifecycle intact; observe layout after it mounts.
  useEffect(() => {
    /** Folder view: cap the focused region so its last line and the bar under it stay above the keyboard. */
    function fitFolderRegion(root: Element | null, barShown: boolean, bottom: number) {
      const focused = root?.querySelector('[data-folder-region] :focus')?.closest('[data-folder-region]');
      for (const region of Array.from(root?.querySelectorAll<HTMLElement>('[data-folder-region] [data-readonly]') ?? [])) {
        const height = barShown && focused?.contains(region) ? programEditorVisibleHeight(region.getBoundingClientRect().top, bottom) : null;
        const value = height === null ? '' : `${Math.max(132, height)}px`;
        if (region.style.maxHeight !== value) region.style.maxHeight = value;
      }
    }
    const host = hostRef.current, shell = host?.closest('[data-alpha-frame], [data-testid="integrated-program-app"]') ?? host?.closest('main');
    if (!host || !shell) return;
    const view = host.ownerDocument.defaultView;
    if (!view) return;
    const visual = view.visualViewport;
    let frame = 0, nudgeUntil = 0;
    const update = () => {
      frame = 0;
      const nav = shell.querySelector<HTMLElement>('nav[aria-label="기본 이동"], nav[aria-label="주요 메뉴"]');
      const navTop = nav?.getClientRects().length && view.getComputedStyle(nav).position === 'fixed' ? nav.getBoundingClientRect().top : null;
      let bottom = programVisibleBottom(view, visual, navTop);
      // N1 fix 3: the mobile writing bar is fixed to that visible bottom (CSS), right above the keyboard however
      // it shrinks or pans the view; the body (or the folder region being edited) ends above it.
      const bar = barRef.current;
      if (bar) for (const [name, value] of Object.entries(programKeyboardBarPlace(view, visual, bottom))) bar.style.setProperty(name, value);
      const barShown = !!bar?.getClientRects().length;
      // v14 phone: where it is drawn, not window.innerHeight, decides (an address bar brought back by the keyboard).
      const settled = barShown ? programKeyboardBarSettle(parseFloat(bar!.style.getPropertyValue('--writing-bar-bottom')), bar!.getBoundingClientRect().bottom, bottom) : null;
      if (settled !== null) bar!.style.setProperty('--writing-bar-bottom', `${settled}px`);
      // N1 fix 5: room under the body so the page can scroll the body, and its last line, above the bar.
      const room = roomRef.current;
      if (room) { const height = `${programKeyboardRoom(view, programVisibleBottom(view, visual, null), barShown ? bar!.getBoundingClientRect().height + 4 : 0)}px`; if (room.style.height !== height) room.style.height = height; }
      if (barShown) bottom -= bar!.getBoundingClientRect().height + 4;
      if (!host.getClientRects().length) { fitFolderRegion(host.closest('section'), barShown, bottom); return; }
      // W2: the move notice and the last message sit between the body and the bar.
      const notice = noticeRef.current;
      if (notice?.getClientRects().length) bottom -= notice.getBoundingClientRect().height;
      // The 17px fix: while no keyboard is up the page is no taller than the screen, so the body also leaves room
      // for what the page lays out below it (the work pane's and the page's bottom paddings, the notices, fix 5's
      // room), and is measured from the page's top: a page scrolled for a moment never makes it, and so the page,
      // longer. A keyboard up keeps fix 5's room to scroll the body above the bar.
      const keyboard = programVisibleBottom(view, visual, null) < view.innerHeight;
      const below = keyboard ? null : programFlowBelow(host, host.ownerDocument.body, node => view.getComputedStyle(node as Element));
      const top = host.getBoundingClientRect().top + (keyboard ? 0 : view.scrollY);
      const ruler = host.querySelector('.tle-root'), line = ruler ? parseFloat(view.getComputedStyle(ruler).getPropertyValue('--tle-line')) : NaN;
      const pad = ruler ? parseFloat(view.getComputedStyle(ruler).getPropertyValue('--tle-pad-top')) : NaN;
      const height = programEditorVisibleHeight(top, below === null ? bottom : Math.min(bottom, view.innerHeight - below + 12), Number.isFinite(line) ? line : undefined, Number.isFinite(pad) ? pad : undefined);
      if (height !== null && host.style.getPropertyValue('--program-editor-visible-height') !== `${height}px`) {
        host.style.setProperty('--program-editor-visible-height', `${height}px`);
        // ResizeObserver ordering must not leave the caret at the previous height.
        // Reuse its guarded reveal path without changing input or focus ownership.
        editorRef.current?.refreshViewport();
      }
      // With the page at its top, the text above the body can leave no line above the bar. Shortly after the
      // keyboard opens or the body takes focus (the rows above settle a frame or two later), bring the body up,
      // and again within that window whenever it is cramped: the header that comes with the keyboard can arrive
      // after the first nudge. A later scroll by the user is never pulled back. W2's notices under the body count.
      const end = Math.max(host.getBoundingClientRect().bottom, notice?.getClientRects().length ? notice.getBoundingClientRect().bottom : 0);
      if (view.performance.now() < nudgeUntil && barShown && programKeyboardBarCramped(end, bar!.getBoundingClientRect().top)) host.scrollIntoView({ block: 'start' });
    };
    const schedule = () => { if (!frame) frame = view.requestAnimationFrame(update); };
    const scheduleNudge = () => { nudgeUntil = view.performance.now() + 600; schedule(); };
    const observer = new ResizeObserver(schedule);
    observer.observe(shell); observer.observe(host);
    if (noticeRef.current) observer.observe(noticeRef.current);
    // Hidden retained editors and sibling notices can change top without changing
    // the shell's minimum height. No input/value/selection observer is needed.
    const mutation = new MutationObserver(schedule);
    mutation.observe(shell, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'open', 'data-writing-keyboard'] });
    view.addEventListener('resize', schedule); view.addEventListener('scroll', schedule, { passive: true });
    visual?.addEventListener('resize', scheduleNudge); visual?.addEventListener('scroll', schedule);
    // The writing bar shows while the body has focus (CSS), which no observer above sees.
    const editorRoot = host.closest('section');
    editorRoot?.addEventListener('focusin', scheduleNudge); editorRoot?.addEventListener('focusout', schedule);
    schedule();
    return () => { observer.disconnect(); mutation.disconnect(); view.cancelAnimationFrame(frame);
      view.removeEventListener('resize', schedule); view.removeEventListener('scroll', schedule);
      visual?.removeEventListener('resize', scheduleNudge); visual?.removeEventListener('scroll', schedule);
      editorRoot?.removeEventListener('focusin', scheduleNudge); editorRoot?.removeEventListener('focusout', schedule); };
  }, []);

  const row = panel ? currentRow(panel.lineId) : undefined;
  const creationLocation = panel?.kind === 'folder' ? programFolderCreationLocation(draft.working, props.docId, panel.lineId) : null;
  const folderLinkProblems = panel?.kind === 'folder' ? programFolderLinkProblems(draft.working, props.docId, panel.lineId) : new Map();
  const panelAccess = panel ? accessFor(panel.lineId) : undefined;
  const protectedExecutionPanel = !!panelAccess?.reason && !!panel && ['progress', 'date'].includes(panel.kind);
  const insertions = panel?.lineId ? M.insertionOptions(draft.working, props.docId, panel.lineId) : [];
  const memoContext = panel?.kind === 'insert' ? readProgramMemoContext(draft.working, props.docId, panel.lineId) : null;
  const folderIndent = props.folderId && panel?.kind === 'insert' && row
    ? { indent: regionIndentPlan(row.id, false), outdent: regionIndentPlan(row.id, true) } : null;
  const menuInsertions = insertions.filter(option=>!props.authoringMode||option.kind!=='subcheck'&&option.kind!=='note');
  // "하위 할 일" and "메모" open the same inline input, each already set to its kind, each saying its place.
  const childAnchor = panel?.kind === 'insert' && props.authoringMode && row ? authoringAnchor(row.index) : null;
  const childLine = childAnchor ? currentDoc()?.lines[childAnchor.parentIndex] : undefined;
  const childPlaceInfo = childLine ? childPlace(draft.working, props.docId, childLine.id) : null;
  const childParent = childLine && childPlaceInfo ? { id: childLine.id, place: childPlaceInfo, depth: currentRow(childLine.id)?.depth ?? 0,
    memo: !!M.tasks(draft.working).find(task => task.id === childLine.id)?.note } : null;
  const layoutPlaces = panel?.kind === 'insert' && props.authoringMode
    ? { step: planLayoutInsertion(draft.working, props.docId, panel.lineId, 'step'), description: planLayoutInsertion(draft.working, props.docId, panel.lineId, 'description') }
    : { step: null, description: null };
  const previewChoices: { key: string; anchorId: string; at: number; depth: number; label: string }[] = [];
  if (childParent) previewChoices.push({ key: 'child', anchorId: childParent.id, at: childParent.place.index, depth: childParent.depth + 1, label: '새 하위 할 일이 여기에' });
  if (row) {
    for (const option of menuInsertions) previewChoices.push({ key: `${option.kind}:${option.offset}:${option.depth}`, anchorId: row.id, at: option.index, depth: option.depth, label: option.kind === 'note' ? '새 메모가 여기에' : '새 할 일이 여기에' });
    for (const kind of ['step', 'description'] as const) {
      const place = layoutPlaces[kind];
      if (place?.ok) previewChoices.push({ key: kind, anchorId: row.id, at: place.index, depth: 0, label: kind === 'step' ? '새 소제목이 여기에' : '일반 글이 여기에' });
    }
  }
  const previewChoice = previewChoices.find(choice => choice.key === previewKey) ?? previewChoices[0];
  const placePreview: InsertPreviewLine[] = previewChoice ? insertPreview(draft.working, props.docId, previewChoice.anchorId, previewChoice.at, previewChoice.depth, previewChoice.label) : [];
  const dateContext = panel?.kind === 'date' && !protectedExecutionPanel && row?.progressTargetId
    ? readProgramTaskDatePresentation(draft.working, { id: row.progressTargetId, docId: props.docId }) : null;
  const dateChangeHint = programTaskDateChangeHint(dateContext, date, {
    current: row?.task?.time ?? row?.time ?? '', draft: time,
  });
  function openCurrentInsertMenu(index:number){
    const controller=draftRef.current,doc=currentDoc(),line=doc?.lines[index];
    if(!controller||inputLockedRef.current||propsRef.current.readOnly||controller.getState().invalid||composingRef.current||regionPendingRef.current||checkPendingRef.current){setMessage('입력이나 문서 상태를 확인한 뒤 다시 열어 주세요. 원문은 유지했습니다.');return false;}
    const raw=controller.getState().raw;
    slashCommandRef.current=line?.text.trim()==='/'?{lineId:line.id,raw,workspace:currentState(),generation:controller.generation()}:null;
    setPreviewKey(null);setMessage('');setPanel({kind:'insert',lineId:line?.id??null});return true;
  }
  function insertNative(offset: number, text: string, caret: number) {
    const controller=draftRef.current,before=currentState(),doc=currentDoc(),area=textArea(),slash=slashCommandRef.current;
    if(!controller||!doc||!area||inputLockedRef.current||propsRef.current.readOnly||controller.getState().invalid||composingRef.current||panelComposingRef.current||regionPendingRef.current||checkPendingRef.current){setMessage('현재는 항목을 추가할 수 없습니다. 입력은 유지했습니다.');return;}
    const raw=controller.getState().raw;if(area.value!==raw){setMessage('본문 입력을 확인한 뒤 다시 선택해 주세요. 원문은 유지했습니다.');return;}
    let command:null|{start:number;end:number;raw:string}=null;
    if(slash){
      const index=doc.lines.findIndex(line=>line.id===slash.lineId),line=doc.lines[index];
      if(before!==slash.workspace||controller.generation()!==slash.generation||raw!==slash.raw||!line||line.text.trim()!=='/'){setMessage('추가 위치의 문맥이 바뀌었습니다. 현재 줄에서 다시 열어 주세요.');return;}
      const start=doc.lines.slice(0,index).reduce((n,line)=>n+line.text.length+1,0)+line.text.indexOf('/');command={start,end:start+1,raw};
    }
    const plan=planWritingInsertion(raw,{offset,text,caretOffset:caret},command);
    // A folder view hides the body editor; the change goes through the region's own check instead.
    if(plan&&propsRef.current.folderId){if(applyRegionInsertion(plan.nextRaw,plan.selectionAfter.start))dismissPanel(false,false);return;}
    if(!plan||!controller.prepareRaw(plan.nextRaw,{inputType:'insertText',compositionGeneration:compositionGeneration.current},true)){setMessage('이 위치에는 추가할 수 없습니다. 원문과 추가 명령은 유지했습니다.');return;}
    const previous=panelRef.current,returned=menuReturnRef.current;
    // A native modal makes the background textarea inert. Close it before the
    // one browser transaction that consumes slash and inserts the scaffold.
    dismissPanel(false,false);
    const applied=editorRef.current?.replaceRange(plan.start,plan.end,plan.text,{selectionAfter:plan.selectionAfter});
    if(!applied||controller.getState().invalid||controller.getState().raw!==plan.nextRaw){
      if(currentState()===before&&area.value===raw){if(returned)restoreWritingSelection(returned);slashCommandRef.current=slash;menuReturnRef.current=returned;setPanel(previous?{...previous}:{kind:'insert',lineId:doc.lines.at(-1)?.id??null});}
      setMessage('브라우저가 추가를 적용하지 못했습니다. 현재 입력은 유지했습니다.');return;
    }
    editorRef.current?.refreshViewport();rememberPosition();
    revealProgramEditorLine(area,plan.nextRaw.slice(0,plan.selectionAfter.start).split('\n').length-1);
    // Sheet '추가' (11/10): remember the line start just written; left as it is when the caret goes on, it is taken away.
    {const index=plan.nextRaw.slice(0,plan.selectionAfter.start).split('\n').length-1,line=currentDoc()?.lines[index];
      scaffoldRef.current=line&&programScaffoldRemoval(plan.nextRaw,index,plan.selectionAfter)?{lineId:line.id,text:line.text}:null;}
    return true;
  }
  /** Sheet '추가' (11/10, a real-use report): the menu's line start ('- [ ] ', '- 메모: ', '- ', '## ', an empty line) left as it was written when
   *  the caret goes to another line is taken away again — one browser step, so one ↶ brings it back (the caret at its end). Typed into, it is
   *  the person's line and stays. Never while composing, saving's raw differs, or in a folder view. */
  function settleScaffold(){
    const held=scaffoldRef.current,area=textArea(),controller=draftRef.current;
    if(!held||!area||!controller||composingRef.current||propsRef.current.folderId)return;
    const doc=currentDoc(),index=doc?.lines.findIndex(line=>line.id===held.lineId)??-1;
    if(!doc||index<0||doc.lines[index].text!==held.text){scaffoldRef.current=null;return;}
    if(area.value.slice(0,area.selectionStart).split('\n').length-1===index)return;
    const raw=controller.getState().raw;if(area.value!==raw||controller.getState().invalid)return;
    const removal=programScaffoldRemoval(raw,index,{start:area.selectionStart,end:area.selectionEnd});
    scaffoldRef.current=null;
    if(!removal||!controller.prepareRaw(removal.nextRaw,{inputType:'deleteContentBackward',compositionGeneration:compositionGeneration.current},true))return;
    const caret=raw.split('\n').slice(0,index).reduce((n,line)=>n+line.length+1,0)+held.text.length;
    if(editorRef.current?.replaceRange(removal.from,removal.to,'',{selectionAfter:removal.selection}))scaffoldRestoreRef.current={raw,caret};
  }
  function insertAuthoringLayout(kind:'step'|'description'){
    // After the pressed line's whole block, and only where no line changes what it belongs to.
    const place=planLayoutInsertion(currentState(),propsRef.current.docId,panel?.lineId??null,kind);
    if(!place.ok){setMessage(place.reason);return;}
    insertNative(place.offset,place.text,place.caretOffset);
  }
  /** Folder view: put a menu insertion into the visible region through the region's own check. */
  function applyRegionInsertion(nextRaw:string,caret:number){
    const port=regionPortRef.current,snapshot=port?.takeSnapshot(),region=snapshot?.view.regions.find(entry=>entry.key===snapshot.regionKey&&!entry.readOnly);
    if(!port||!snapshot||!region||port.hasPending()){setMessage('분류 영역의 입력이나 저장을 마친 뒤 다시 골라 주세요. 원문은 유지했습니다.');return false;}
    const before=snapshot.view.fullRaw.split('\n'),after=nextRaw.split('\n'),end=region.endIndex+after.length-before.length;
    if(end<region.startIndex||after.slice(0,region.startIndex).join('\n')!==before.slice(0,region.startIndex).join('\n')
      ||after.slice(end).join('\n')!==before.slice(region.endIndex).join('\n')){setMessage(REGION_OUTSIDE);return false;}
    const plan=planProgramRegionEdit(currentState(),snapshot.view,region.key,after.slice(region.startIndex,end).join('\n'),{progressDate:today()});
    if(!plan.ok){setMessage(programRegionError(plan.reason));return false;}
    if(!acceptRegion(plan.next,snapshot.view.workspace)){setMessage('지금은 이 영역에 넣을 수 없습니다. 저장이 끝난 뒤 다시 골라 주세요. 원문은 유지했습니다.');return false;}
    const lineId=M.getDocument(plan.next,propsRef.current.docId)?.lines[nextRaw.slice(0,caret).split('\n').length-1]?.id,column=caret-(nextRaw.lastIndexOf('\n',caret-1)+1);
    scheduleSave();
    requestAnimationFrame(()=>{if(lineId&&revealAllowed())regionPortRef.current?.revealLine?.(lineId,column);});
    return true;
  }
  /** Folder view ＋ or "/": save what the region holds first, so the menu works on real line IDs. */
  async function openRegionInsertMenu(){
    const port=regionPortRef.current;
    if(!port||port.isComposing()||inputLockedRef.current||propsRef.current.readOnly||checkPendingRef.current){setMessage('입력이나 문서 상태를 확인한 뒤 다시 열어 주세요. 원문은 유지했습니다.');return false;}
    if(!port.hasPending())return openRegionMenuAt(port);
    // Waiting for the region's save: pin the request (document, folder view, editor, region line) and,
    // like connectFlow, drop it on any newer press, key, focus move or input. No late menu.
    const surface=port.activeEditor?.(true),aimed=surface?writingBarTarget(surface.area,surface.area.value,surface.area.selectionStart):null;
    const docId=propsRef.current.docId,folderId=propsRef.current.folderId,controller=draftRef.current,owner=surface?.area.ownerDocument;
    let interrupted=false;const interrupt=()=>{interrupted=true;};
    const events=['pointerdown','keydown','focusin','beforeinput','compositionstart'];
    for(const event of events)owner?.addEventListener(event,interrupt,true);
    try{
      if(!aimed||!await port.flush())return false;
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const now=port.activeEditor?.();
      if(interrupted||propsRef.current.active===false||propsRef.current.docId!==docId||propsRef.current.folderId!==folderId
        ||draftRef.current!==controller||regionPortRef.current!==port||composingRef.current||inputLockedRef.current||!now
        ||heldTargetVerdict(aimed,{surface:now.area,value:now.area.value,caret:now.area.selectionStart,editable:!now.area.readOnly,connected:now.area.isConnected,focusHere:true})!=='run')return false;
      return openRegionMenuAt(port);
    }finally{for(const event of events)owner?.removeEventListener(event,interrupt,true);}
  }
  function openRegionMenuAt(port:ProgramFolderRegionPort){
    const snapshot=port.takeSnapshot(),index=snapshot?.lineId?currentDoc()?.lines.findIndex(line=>line.id===snapshot.lineId)??-1:-1;
    if(!snapshot?.regionKey||index<0){setMessage('추가할 줄을 찾지 못했습니다. 분류 영역 안의 줄을 누른 뒤 다시 열어 주세요.');return false;}
    return openCurrentInsertMenu(index);
  }
  function scopeSlot(lineId: string | null) {
    const state = currentState();
    const doc = M.getDocument(state, propsRef.current.docId);
    if (!doc) return null;
    const selected = currentRow(lineId);
    // Describe the location only. Preparing a persisted row here would leave
    // it behind when the user closes the target picker without selecting.
    return { lineId: selected?.id ?? null, insertAfter: !(selected && /^ *-\s*$/.test(selected.text)) };
  }
  async function connectFlow(lineId: string | null) {
    const isActive = () => propsRef.current.active !== false;
    if (!propsRef.current.onConnectFlow || !isActive() || actionsDisabled() || composingRef.current) return;
    const docId = propsRef.current.docId, controller = draftRef.current;
    const slot = scopeSlot(lineId);
    if (!slot) { setMessage('이 위치에는 연결할 수 없습니다.'); return; }
    closePanel();
    // Closing our own menu restores focus. Only later user intent cancels the
    // deferred modal; a save ACK must not take over newer input or another doc.
    const area = textArea(), owner = area?.ownerDocument;
    let interrupted = false;
    const interrupt = () => { interrupted = true; };
    const events = ['pointerdown', 'keydown', 'focusin', 'beforeinput', 'compositionstart'];
    for (const event of events) owner?.addEventListener(event, interrupt, true);
    try {
      const ready = await saveNow();
      if (ready && !interrupted && isActive() && propsRef.current.docId === docId && draftRef.current === controller
        && area === textArea() && !actionsDisabled() && !composingRef.current
        && !regionPendingRef.current && !controller?.getState().dirty) {
        propsRef.current.onConnectFlow?.(docId, slot.lineId, slot.insertAfter);
      }
    } finally {
      for (const event of events) owner?.removeEventListener(event, interrupt, true);
    }
  }
  async function attachFolder(scopeId: string | null) {
    if (actionsDisabled() || composingRef.current) return;
    const state = currentState();
    if (panel?.folderLinkPreview?.docId !== propsRef.current.docId
      || !isProgramFolderLinkPreviewCurrent(state, panel?.folderLinkPreview)) {
      setMessage('연결할 위치가 바뀌었습니다. 닫고 다시 폴더를 선택해 주세요.'); return;
    }
    const problem = scopeId ? programFolderLinkProblem(state, props.docId, panel?.lineId ?? null, scopeId) : null;
    if (problem) { setMessage(problem.message); return; }
    const next = linkProgramFolder(state, props.docId, panel?.lineId ?? null, scopeId ? { scopeId } : { title: folderName });
    if (next === state) { setMessage('같은 이름·위치·폴더 연결을 확인해 주세요.'); return; }
    closePanel();
    await saveFolderLink(state, next, scopeId ? '폴더 연결' : '새 폴더');
  }
  async function saveFolderLink(before: TextWorkspaceState, next: TextWorkspaceState, label: string) {
    // apply changes the native value/selection synchronously. Only the save is
    // pending here; a newer user action owns focus even when raw text is equal.
    const pending = apply(next, label), area = textArea(), owner = area?.ownerDocument;
    let interrupted = false;
    const interrupt = () => { interrupted = true; };
    const events = ['pointerdown', 'keydown', 'focusin', 'beforeinput', 'compositionstart'];
    for (const event of events) owner?.addEventListener(event, interrupt, true);
    try {
      if (await pending && !interrupted && area === textArea()) continueAfterFolderLink(before, next);
    } finally {
      for (const event of events) owner?.removeEventListener(event, interrupt, true);
    }
  }
  function continueAfterFolderLink(before: TextWorkspaceState, next: TextWorkspaceState) {
    if (actionsDisabled() || composingRef.current || !programSame(currentState(), next)) return;
    const id = propsRef.current.docId, doc = M.getDocument(next, id), area = textArea();
    if (!doc || area?.value !== M.raw(doc)) return;
    const linked = next.bindings.find(binding => binding.docId === id && binding.kind === 'scope'
      && !before.bindings.some(previous => programSame(previous, binding)));
    const index = doc.lines.findIndex(line => line.id === linked?.lineId);
    // Only this explicit successful folder choice changes the caret target.
    // Native focus owns selection, wrapping, viewport and composition guards.
    if (index >= 0) editorRef.current?.focus(index);
  }
  function openFolderPanel(lineId: string | null) {
    if (actionsDisabled() || composingRef.current) return;
    if(currentRow(lineId)?.progressTargetId){
      const policy=locationPolicy(lineId);
      if(policy.kind!=='move'){setMessage(policy.message);return;}
      setMessage('');setPanel({kind:'task-folder',lineId,locationExpected:currentState()});return;
    }
    const preview = programFolderLinkPreview(currentState(), propsRef.current.docId, lineId, 'direct');
    if (!preview) { setMessage('이 위치에는 폴더를 연결할 수 없습니다.'); return; }
    setFolderName(programFolderLineTitle(currentState(), propsRef.current.docId, lineId) ?? '');
    setMessage(''); setPanel({ kind: 'folder', lineId, folderLinkPreview: preview });
  }
  function openFolderCopy(lineId: string | null) {
    if (!lineId || actionsDisabled() || composingRef.current || regionPendingRef.current) return;
    const state = currentState(), docId = propsRef.current.docId;
    const preview = readProgramFolderCopyPreview(state, docId, lineId);
    if (!preview) { setMessage('선택한 일반 폴더 묶음에서 사본을 만들어 주세요.'); return; }
    const check = propsRef.current.folderCopyProblem;
    if (!check) { setMessage('이 문서에서는 폴더 사본을 만들 수 없습니다.'); return; }
    const problem = check(state, docId, preview.lines.map(line => line.id));
    if (problem) { setMessage(problem); return; }
    setFolderName(''); setMessage(''); setPanel({ kind: 'folder-copy', lineId, folderCopyPreview: preview });
  }
  async function makeFolderCopy() {
    if (actionsDisabled() || composingRef.current || regionPendingRef.current) return;
    const preview = panel?.kind === 'folder-copy' ? panel.folderCopyPreview : null;
    const state = currentState();
    if (!preview || preview.docId !== propsRef.current.docId || !isProgramFolderCopyPreviewCurrent(state, preview)) {
      setMessage('선택한 폴더 내용이 바뀌었습니다. 닫고 다시 선택해 주세요.'); return;
    }
    const check = propsRef.current.folderCopyProblem;
    if (!check) { setMessage('이 문서에서는 폴더 사본을 만들 수 없습니다.'); return; }
    const problem = check(state, preview.docId, preview.lines.map(line => line.id));
    if (problem) { setMessage(problem); return; }
    const result = copyProgramFolderOccurrence(state, preview, folderName);
    if (!result.ok) { setMessage(result.message); return; }
    closePanel();
    if (!await apply(result.workspace, '폴더 독립 사본')) return;
    if (await saveNow()) setMessage('사본을 새 문서에 저장했습니다. 문서 목록에서 ‘' + folderName.trim() + '’을 열 수 있습니다.');
  }
  function insertDateSection() {
    const doc = currentDoc(); if (!doc) return;
    const raw = M.raw(doc), insertion = `${raw && !raw.endsWith('\n') ? '\n' : ''}[${today()}]\n`;
    insertNative(raw.length, insertion, raw.length + insertion.length);
  }
  async function applyProgress() {
    if (accessFor(panel?.lineId ?? null)?.reason) { setPanel({ kind: 'reference', lineId: panel?.lineId ?? null }); return; }
    const target = currentRow(panel?.lineId ?? null)?.progressTargetId;
    if (!target) return;
    const parsed = M.parseProgressToken(percent.trim());
    if (!parsed.ok || parsed.percent === null || !date) { setMessage('진행률과 기록 날짜를 확인해 주세요. 예: 20, 20%, 0.2'); return; }
    const correction = progressRecordDate === date && date < today() && currentRow(panel?.lineId ?? null)?.progressPercent !== undefined;
    const next = correction ? M.correctProgressRecord(currentState(), target, date, parsed.percent, today())
      : M.recordProgress(currentState(), target, date, parsed.percent);
    if (next === currentState()) { closePanel(); return; }
    closePanel(); await apply(next, correction ? '날짜별 진행 기록 수정' : '날짜별 누적 진행');
  }
  async function applyDate() {
    if (actionsDisabled() || composingRef.current || regionPendingRef.current) return;
    if(locationAvailability().blocked){setMessage('저장을 확인한 뒤 옮겨 주세요.');return;}
    if (accessFor(panel?.lineId ?? null)?.reason) { setPanel({ kind: 'reference', lineId: panel?.lineId ?? null }); return; }
    const target = currentRow(panel?.lineId ?? null)?.progressTargetId;
    if (!target) return;
    const policy=locationPolicy(panel?.lineId??null);
    if(policy.kind==='blocked'){setMessage(policy.message);return;}
    if(policy.kind==='move'){await performTaskLocation(panel?.lineId??null,{kind:'date',date:date||null,time});return;}
    const task = M.tasks(currentState()).find(item => item.id === target);
    if (task && task.date === (date || null) && (task.time ?? '') === time) { closePanel(); return; }
    await applyDateOnly(target,date||null,time);
  }
  /** F9 W-MENU-24: the calendar sheet of a task (⋮ [고르기], the bar's 고르기). */
  function openDateSheet(lineId: string | null) {
    const row = currentRow(lineId);
    if (!row?.progressTargetId) return;
    if (accessFor(lineId)?.reason) { setMessage(''); setPanel({ kind: 'reference', lineId }); return; }
    setMessage(''); setPanel({ kind: 'date-sheet', lineId });
  }
  /** A day (or 날짜 미정) pressed in the sheet: moved at once, as a ⋮ chip moves (W-MENU-07); the sheet closes. */
  async function pickSheetDate(lineId: string | null, value: string | null) {
    if (value !== null) { await applyDateChip(lineId, value); return; }
    if (actionsDisabled() || composingRef.current || regionPendingRef.current) return;
    if(locationAvailability().blocked){setMessage('저장을 확인한 뒤 옮겨 주세요.');return;}
    if (accessFor(lineId)?.reason) { setPanel({ kind: 'reference', lineId }); return; }
    const target = currentRow(lineId)?.progressTargetId, task = target ? M.tasks(currentState()).find(item => item.id === target) : undefined;
    if (!target || !task) return;
    const policy=locationPolicy(lineId);
    if(policy.kind==='blocked'){setMessage(policy.message);return;}
    if(policy.kind==='move'){await performTaskLocation(lineId,{kind:'date',date:null});return;}
    if (task.date === null) { closePanel(); return; }
    await applyDateOnly(target,null,task.time??'');
  }
  /** N9: a line menu date chip sets the date in one press, as 날짜·시간 적용 would, and keeps the time. */
  async function applyDateChip(lineId: string | null, value: string) {
    if (actionsDisabled() || composingRef.current || regionPendingRef.current) return;
    if(locationAvailability().blocked){setMessage('저장을 확인한 뒤 옮겨 주세요.');return;}
    if (accessFor(lineId)?.reason) { setPanel({ kind: 'reference', lineId }); return; }
    const target = currentRow(lineId)?.progressTargetId, task = target ? M.tasks(currentState()).find(item => item.id === target) : undefined;
    if (!target || !task) return;
    const policy=locationPolicy(lineId);
    if(policy.kind==='blocked'){setMessage(policy.message);return;}
    if(policy.kind==='move'){await performTaskLocation(lineId,{kind:'date',date:value});return;}
    if (task.date === value) { closePanel(); return; }
    await applyDateOnly(target,value,task.time??'');
  }
  function downloadDraft() {
    const blob = new Blob([captureDraftRaw()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${M.getDocument(props.workspace, props.docId)?.title || '문서'}.txt`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyFolderText() {
    if (composingRef.current || inputLockedRef.current || actionsDisabled() || propsRef.current.folderId) return;
    const docId = propsRef.current.docId;
    if (!await saveNow() || composingRef.current || inputLockedRef.current || propsRef.current.docId !== docId
      || draftRef.current?.getState().dirty || draftRef.current?.getState().invalid) return;
    const text = M.exportFolderText(currentState(), docId);
    if (text === null) return;
    try {
      await navigator.clipboard.writeText(text);
      setMessage('폴더 연결을 포함한 TXT를 복사했습니다.');
    } catch {
      setMessage('TXT를 복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.');
    }
  }

  // W5: the ＋ menu's head is its target line in one line ("‘…’ 아래에", or 새 줄 for an empty line or a typed "/").
  // A registered task's menu also holds its 진행·날짜, so its head is the task alone and the add choices get "추가".
  const menuTargetText = row ? memoContext?.label || row.title || row.task?.title || row.text : '';
  const title = panel?.kind==='child' ? childTarget?.kind==='task' ? `‘${childTarget.title}’ 아래 하위 할 일` : childTarget?.kind==='memo' ? `‘${childTarget.title}’ 메모` : programInsertMenuTitle(childTarget?.title) :protectedExecutionPanel ? '연결된 항목' : panel?.kind === 'order' ? '같은 구간 날짜순 정렬' : panel?.kind === 'repeat' ? '반복' : panel?.kind === 'progress' ? '진행 기록' : panel?.kind === 'date' ? '날짜·시간' : panel?.kind === 'date-sheet' ? '옮길 날' : panel?.kind === 'section-order' ? '날짜 순서 바꾸기' : panel?.kind === 'task-folder' ? '폴더로 옮기기' : panel?.kind === 'folder-copy' ? '폴더 사본 만들기' : panel?.kind === 'folder' ? '폴더 연결' : panel?.kind === 'move' ? '이동할 위치' : panel?.kind === 'reference' ? '연결된 항목' : panel?.kind === 'insert' && row?.progressTargetId ? `‘${menuTargetText.trim()}’` : programInsertMenuTitle(menuTargetText);
  // Region fix (11/7): one view per workspace (it was read anew on every draw: a new snapshot, every region repainted).
  const folderView = useMemo(() => props.folderId ? readProgramFolderRegions(draft.working, props.docId, props.folderId) : null,
    [draft.working, props.docId, props.folderId]);
  const progressConflict = progressConflictToView();
  const inputPending=!!childTarget||programTextInputPending(draft,textArea()?.value,composing,regionPending,checkPending);
  // Bar buttons turn off only for input protection, read-only, or a move they cannot make.
  const barOff = inputLocked || !!props.readOnly;
  // Input v2 stage 1: a '/' line's menu leads with the folders, the recent ones first ('얹기'; the menu itself stays).
  const slashFolders = panel?.kind === 'insert' && props.authoringMode && !props.folderId && slashCommandRef.current?.lineId === panel.lineId
    ? readFolderPickerChoices(createFolderPickerIndex(draft.working.folders), '', null, { recentIds: pickerRecent.current }).candidates.slice(0, 12) : null;
  // Stage 2: the bar's folder chips, the same choices and order as the '/' menu's.
  const barFolderChoices = barMode === 'folders' && props.authoringMode && !props.folderId
    ? readFolderPickerChoices(createFolderPickerIndex(draft.working.folders), '', null, { recentIds: pickerRecent.current }).candidates.slice(0, 12) : [];
  // Stage 2 (오늘 시작 줄): offered above the body while today has no head line and it would go first.
  const todayStart = props.authoringMode && !props.folderId && !props.readOnly && props.active !== false
    ? (doc => doc ? programTodayStartPlan(M.raw(doc), today()) : null)(currentDoc()) : null;
  // ↶ ↷ in the toolbar and in the bar's ⋯ row are off for the same reasons.
  const undoOff = inputLocked || !!props.readOnly || draft.saving || !!props.folderId && draft.dirty && !regionPending;
  // 7k stage 1: in a folder view ↷ redoes a saved step as ↶ undoes one (redoInput); none while its input waits.
  const redoOff = inputLocked || !!props.readOnly || draft.saving || !!props.folderId && draft.dirty;
  const editorStatus = programEditorStatus({ readOnly: !!props.readOnly, readOnlyLabel: props.disabledReason, error: !!draft.error,
    locked: inputLocked, saving: draft.saving, checking: checkPending, pending: inputPending });
  const serverWins = serverStatusWins(serverView, editorStatus);
  // F11 W-HEIGHT-01/02 (11/11, 안2): one notice line under the tool bar, the most pressing first: this editor's own save
  // trouble ([다시 저장]; its box under [자세히]), the host's line (save state, this document's kept input, its last
  // message), then the space's passing notice. The rest goes under [자세히]. Only with the host's status (the 쓰기 tab).
  // With the host's warning too, its words and its action (다시 확인: the server first, as in the W2 box) come first.
  const hostWarn = serverView?.alert?.tone === 'warn' ? serverView.alert : null;
  const ownAlert: ProgramAlertLine | null = serverView && draft.error ? { tone: 'warn',
    text: hostWarn?.text ?? (props.readOnly ? '읽기 전용 · 입력은 남아 있습니다' : inputLocked ? '입력 보호 · 입력은 남아 있습니다' : '저장 확인 필요 · 입력은 남아 있습니다'),
    action: hostWarn?.action ?? (props.readOnly ? null : { label: '다시 저장', run: () => { if (draftRef.current?.getState().invalid) draftRef.current.recheck(); void saveNow(); }, disabled: draft.saving }),
    recoveries: serverView.alert?.recoveries, openRecovery: serverView.alert?.openRecovery, detail: editorRecoveryBody(serverView.recoveryBody), note: serverView.alert?.note,
    newVersion: serverView.alert?.newVersion } : null;
  const baseAlert: ProgramAlertLine | null = ownAlert ?? serverView?.alert ?? (serverView && props.hostNotice ? { tone: 'info', text: props.hostNotice.text, close: props.hostNotice.close,
    action: props.hostNotice.action ?? null } : null);
  const alertLine: ProgramAlertLine | null = baseAlert && props.hostNotice && baseAlert.text !== props.hostNotice.text
    ? { ...baseAlert, detail: <>{baseAlert.detail}<p className={styles.alertNote}>{props.hostNotice.text}</p></> } : baseAlert;
  const alertKey = alertLine ? alertLine.tone + alertLine.text : '';
  useEffect(() => { setAlertDetail(false); }, [alertKey]);
  // W-VER-04 (11/11): the line's words open [자세히] too (a phone hides that button when the line has three); a newer build
  // under it ends the words '· 새 버전', or a dot beside them when the words would not fit on the line.
  const alertMore = !!alertLine && !!(alertLine.detail || alertLine.note);
  const alertTextRef = useRef<HTMLParagraphElement | null>(null), [versionCompact, setVersionCompact] = useState(false);
  useEffect(() => { setVersionCompact(false); }, [alertKey]);
  useLayoutEffect(() => {
    const words = alertTextRef.current;
    if (alertLine?.newVersion && !versionCompact && words && words.scrollWidth > words.clientWidth + 1) setVersionCompact(true);
  });
  const alertView = alertLine && <div className={styles.alertLine} data-alert-line data-alert-tone={alertLine.tone}
    data-repeat-notice={baseAlert === alertLine && !ownAlert && !serverView?.alert && props.hostNotice?.repeat ? '' : undefined}>
    <p ref={alertTextRef} role={alertLine.tone === 'warn' ? 'alert' : 'status'} title={alertLine.newVersion ? `${alertLine.text} · 새 버전` : alertLine.text}
      data-alert-text className={alertMore ? styles.alertTextMore : undefined} onClick={alertMore ? () => setAlertDetail(open => !open) : undefined}>
      {alertLine.tone === 'warn' && <span aria-hidden="true">⚠ </span>}{alertLine.text}
      {alertLine.newVersion && !versionCompact && <span data-alert-new-version="words"> · 새 버전</span>}</p>
    {alertLine.newVersion && versionCompact && <span className={styles.alertVersionDot} data-alert-new-version="dot"><span className={styles.srOnly}>새 버전</span></span>}
    <div className={styles.alertActions}>
      {alertLine.action && <button type="button" data-alert-action disabled={alertLine.action.disabled} onClick={alertLine.action.run}>{alertLine.action.label}</button>}
      {!!alertLine.recoveries && alertLine.openRecovery && <button type="button" data-alert-recovery onClick={event => alertLine.openRecovery!(event.currentTarget)}>복구함 {alertLine.recoveries}</button>}
      {(alertLine.detail || alertLine.note) && <button type="button" data-alert-more aria-expanded={alertDetail} onClick={() => setAlertDetail(open => !open)}>{alertDetail ? '접기' : '자세히'}</button>}
      {alertLine.close && <button type="button" data-alert-close aria-label="알림 닫기" onClick={alertLine.close}><ProgramIcon name="close" size={18} /></button>}
    </div>
    {alertDetail && (alertLine.detail || alertLine.note) && <div className={styles.alertDetail}>{alertLine.detail}{alertLine.note}</div>}
  </div>;
  const statusWarn = (serverWins ? serverView!.level : editorStatus.level) <= 4;
  // The words show the winner; the recovery boxes stay whichever wins, so no action is lost.
  const statusLabel = serverWins ? serverView!.label : editorStatus.label;
  // F4-a (A4 ①): the folder screen's head says the save status in one word (the tool line holds its recovery box).
  const folderStatus = props.folderId ? props.folderScreen?.onStatus : undefined;
  useEffect(() => { folderStatus?.({ label: statusLabel, warn: statusWarn }); }, [folderStatus, statusLabel, statusWarn]);
  const hasRecovery = !!serverView?.recovery || !!draft.error;
  // A refused edit that names its line: shown with the reason's first sentence (다시 저장 judges it again).
  const refused = draft.invalid && draft.problemLine !== undefined && !props.readOnly;
  const refusedLine = (draft.problemLine ?? 0) + 1, refusedReason = draft.error.split(/(?<=\.)\s/)[0];
  // 저장 재설계 B (L2·L4, 11/10): held lines are marked (a wavy line and a band before it); the notice row says how many
  // and goes to the first ([그 줄로]); with the caret on one, its reason and its one-press fix ([맞추기]·[할 일로]·[맨 앞으로],
  // [글로 두기] for a broken mark). A fix is one edit: one ↶ takes it back.
  const held = !props.readOnly && draft.held?.lines.length ? draft.held : null;
  const heldKey = held ? `${draft.raw.length}:${held.lines.join(',')}` : '';
  const heldAt = held && held.lines.includes(writingCaretLine) ? writingCaretLine : -1;
  const applyHeldFix = (fix: { start: number; end: number; text: string }) => whenComposed(() => {
    const area = textArea(); if (!area || area.value !== draftRef.current?.getState().raw) return;
    applyWritingEdit({ start: fix.start, end: fix.end, text: fix.text }, undefined, { start: fix.start + fix.text.length, end: fix.start + fix.text.length });
  });
  const heldView = !held || heldClosed === heldKey ? null : heldAt >= 0 ? (() => {
    const reason = held.reasons[heldAt] ?? 'other', fix = programHeldFix(draft.raw, heldAt, reason, held.restore), plain = programHeldPlain(draft.raw, heldAt, reason);
    return { tone: 'warn' as const, text: programHeldReasonText(reason, held.message),
      detail: reason === 'records' ? '기록은 그 할 일에 그대로 있습니다 · 다른 줄은 저장됩니다' : '이 줄은 아직 저장되지 않았습니다 · 다른 줄은 저장됩니다',
      actions: [...(fix ? [{ label: fix.label, run: applyHeldFix(fix) }] : []), ...(plain ? [{ label: plain.label, run: applyHeldFix(plain) }] : [])],
      closeLabel: '알림 닫기', close: () => setHeldClosed(heldKey) };
  })() : { tone: 'warn' as const, text: `저장 안 됨 · 줄 ${held.lines.length}개를 고치면 저장됩니다`,
    actions: [{ label: '그 줄로', run: () => goToHeldLine(held.lines[0]) }], closeLabel: '알림 닫기', close: () => setHeldClosed(heldKey) };
  const heldCss = (held ? `${held.lines.map(index => `[data-writing-root="${writingRootId}"] .tle-line[data-line-index="${index}"]`).join(',')}`
    + '{text-decoration:underline wavy #b45309;text-decoration-thickness:1px;text-underline-offset:4px;box-shadow:inset 3px 0 0 #b45309}' : '')
    // K2: the section a merge would join, painted while the question shows.
    + (writingNotice?.paint?.length ? `${writingNotice.paint.map(index => `[data-writing-root="${writingRootId}"] .tle-line[data-line-index="${index}"]`).join(',')}{background:var(--flowme-b-selected,#e6ecfb)}` : '');
  // While typing, anything short of a warning is one quiet dot, a fast "저장됨" included.
  const quietStatus = !!serverView && typing && !statusWarn && !inputLocked;
  // The bar's slot is the same status, short; the toolbar slot holds the one live announcement.
  const barStatus = quietStatus || !serverView && editorStatus.level >= 6 && editorStatus.level < 8 && !inputLocked ? '●'
    : props.readOnly ? '읽기 전용' : statusWarn ? `⚠ ${statusLabel}` : inputLocked ? '입력 잠시 멈춤' : statusLabel;
  /** The bar's copy of the status: never announced. A warning there is a button only when there is
   *  a recovery box to open (keyboard closes, the box and its actions show); otherwise just the words. */
  function barStatusSlot() {
    // F6-B1 (목업 B): saved is the icon set's check here (13px words no longer fit beside the bar's seven buttons at 390).
    if (!statusWarn || !hasRecovery) return <span className={styles.barStatus} aria-hidden="true" data-warn={statusWarn || undefined} data-saved={barStatus === '저장됨' || undefined}>{barStatus === '저장됨' ? <ProgramIcon name="check" size={18} /> : barStatus}</span>;
    return <button type="button" className={styles.barStatus} data-warn="true" aria-label={`${statusLabel} · 복구 열기`}
      onPointerDown={event => { event.preventDefault(); }} onClick={openStatusRecovery}>{barStatus}</button>;
  }
  function openStatusRecovery() {
    const box = barRef.current?.closest('section')?.querySelector<HTMLDetailsElement>(`.${styles.statusSlot} details`);
    if (!box) return;
    box.open = true;
    box.querySelector<HTMLElement>('summary')?.focus();
  }
  /** The editor's own recovery box (다시 저장, 입력한 원문 받기, 저장본으로 되돌리기). A refused edit also keeps
   * its line and the first sentence of its reason visible. W2: given the host's recovery too (`server`), the one
   * box holds both, the server's first, so there is one summary to open. */
  function editorRecovery(announce: boolean, server?: React.ReactNode) {
    const label = props.readOnly ? '읽기 전용 · 복구' : inputLocked ? '입력 보호 · 복구' : '저장 확인 필요 · 복구';
    return <details name="program-input-feedback" className={styles.saveFeedback} onKeyDown={event => {
        if (event.key !== 'Escape' || event.nativeEvent.isComposing || composingRef.current || !event.currentTarget.open) return;
        event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false;
        event.currentTarget.querySelector('summary')?.focus({ preventScroll: true });
      }}><summary title={props.readOnly ? props.disabledReason || '읽기 전용' : draft.error}>{announce ? <span role="alert">{label}</span> : <span>{label}</span>}</summary>{editorRecoveryBody(server)}</details>;
  }
  /** The recovery box's content (its reason and actions; the server's first, W2), also what F11's [자세히] opens. */
  function editorRecoveryBody(server?: React.ReactNode) {
    const own = <><p>{draft.error}</p><div className={styles.recoveryActions}>
      {progressConflict && <button type="button" onClick={showProgressConflict}>진행 조절 보기</button>}
      <button type="button" disabled={!!props.readOnly || draft.saving} onClick={() => { if (draftRef.current?.getState().invalid) draftRef.current.recheck(); void saveNow(); }}>다시 저장</button>
      <button type="button" onClick={downloadDraft}>입력한 원문 받기</button>
      <button type="button" disabled={inputLocked || draft.saving} onClick={() => { if (draftRef.current?.discard(propsRef.current.workspace)) { orderHistoryRef.current.clear(); orderPositionsRef.current = []; orderEpochRef.current++; editorRef.current?.setValue(draftRef.current.getState().raw, { preserveSelection: true }); } }}>저장본으로 되돌리기</button>
      </div></>;
    return <div className={styles.error}>
      {server ? <><section className={styles.recoveryGroup} aria-label="서버 저장"><h4>서버 저장</h4>{server}</section>
        <section className={styles.recoveryGroup} aria-label="이 기기의 입력"><h4>이 기기의 입력</h4>{own}</section></> : own}
      </div>;
  }
  function barButton(action: WritingBarAction, icon: React.ReactNode, label: string, keys: string, off: boolean, className?: string, describedBy?: string) {
    const folderHint = (action === 'indent' || action === 'outdent') && barLine.structureLock === FOLDER_INDENT_NOTICE;
    return <button key={action} type="button" className={className} data-bar-action={action} data-held={heldBar === action ? 'true' : undefined}
      aria-label={label} aria-describedby={describedBy} aria-disabled={folderHint || undefined} style={folderHint ? { opacity: .45 } : undefined} title={`${label} · ${keys}`} disabled={barOff || off && !folderHint}
      onPointerDown={event => { event.preventDefault(); }} onClick={() => { pressBar(action); }}>{icon}</button>;
  }
  /** Input v2 stage 1 (11/7): the phone bar is [☐][날짜][폴더][⇤][⇥][↳][⋯]. 날짜 and ⋯ turn the bar into a chip row in
   *  place (focus and the keyboard stay); 폴더 writes the `- /` line and the folder suggestions take the bar. The PC
   *  toolbar keeps ☐ ⇤ ⇥ ↳. A folder view has no 날짜·폴더 (the region keeps its own structure). */
  function barButtons(place: 'toolbar' | 'bar') {
    const className = place === 'toolbar' ? styles.toolbarBarButton : undefined, locked = barLine.markerLock, moved = barLine.structureLock;
    const keep = (event: React.PointerEvent) => { event.preventDefault(); }, body = place === 'bar' && !props.folderId, dateBody=place==='bar'&&(!props.folderId||barLine.isTask);
    const dateMoveOff=barOff||barLine.isTask&&locationAvailability().blocked;
    const close = (label: string) => <button type="button" className={styles.barClose} aria-label={label} onPointerDown={keep} onClick={() => setBarMode('tools')}><ProgramIcon name="close" size={20} /></button>;
    const tools = <>
      {barButton('task', <BarIcon name="task" />, barLine.isTask ? '일반 줄로 바꾸기' : '할 일로 바꾸기', '- [ ]', !!locked, className, locked ? barLockId + place : undefined)}
      {locked && <span id={barLockId + place} hidden>{barLine.markerLock}</span>}
      {moved && <span id={barLockId + place + 'move'} hidden>{moved}</span>}
      {dateBody && <button type="button" className={styles.barWide} data-bar-mode="date" aria-label={barLine.isTask?'날짜로 옮기기':'날짜 넣기'} title={barLine.isTask?'날짜로 옮기기':'날짜 넣기'} disabled={barOff}
        onPointerDown={keep} onClick={() => setBarMode('date')}><BarIcon name="date" /><span>날짜</span></button>}
      {body && barButton('folder', <><BarIcon name="folder" /><span>폴더</span></>, '폴더 줄 넣기', '- /', false, styles.barWide)}
      {barButton('outdent', <BarIcon name="outdent" />, '내어쓰기', 'Shift+Tab', !barLine.canOutdent, className, moved ? barLockId + place + 'move' : undefined)}
      {barButton('indent', <BarIcon name="indent" />, '들여쓰기', 'Tab', !barLine.canIndent, className, moved ? barLockId + place + 'move' : undefined)}
      {barButton('enter', <BarIcon name="enter" />, '할 일 아래 메모 줄', 'Shift+Enter', false, className)}
      {place === 'bar' && <button type="button" data-bar-mode="more" aria-label="더 보기 · 되돌리기·반복·추가 메뉴" title="되돌리기·다시 하기·반복·추가 메뉴" disabled={barOff}
        onPointerDown={keep} onClick={() => setBarMode('more')}>{BAR_MORE_ICON}</button>}
    </>;
    // Stage 2: from a typed `[`, the day its digits name comes first ("11월 12일 목"; another year with the year).
    const typed = barTriggerRef.current?.kind === 'bracket' ? programBracketDate(bracketText, today()) : null;
    const typedLabel = typed && ((year, month, day) => `${year !== Number(today().slice(0, 4)) ? `${year}년 ` : ''}${month}월 ${day}일 ${'일월화수목금토'[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]}`)(...typed.split('-').map(Number) as [number, number, number]);
    const dates = <>
      <span className={styles.barHeading} title={dateMoveOff?'저장 확인 뒤 옮길 수 있어요':undefined}>{barLine.isTask ? (dateMoveOff?'저장 확인 뒤 옮길 수 있어요':barMode==='date'&&locationPolicy(props.folderId?regionLineRef.current:currentDoc()?.lines[textArea()?caretLine(textArea()!):-1]?.id??null).kind!=='move'?'날짜만':'옮길 날') : '날짜 줄'}</span>
      <div className={styles.barChips} role="group" aria-label="날짜 고르기">
        {typed && <button type="button" key="typed" data-bar-chip="typed" disabled={dateMoveOff} data-held={heldBar === 'date' && barChipDate.current === typed ? 'true' : undefined}
          aria-label={typedLabel ?? typed} onPointerDown={keep} onClick={() => pressDateChip(typed)}>{typedLabel}</button>}
        {programLineDateChips(today()).map(chip => <button type="button" key={chip.key} data-bar-chip={chip.key} disabled={dateMoveOff}
          data-held={heldBar === 'date' && barChipDate.current === chip.date ? 'true' : undefined} aria-label={`${chip.label} · ${chip.detail}`}
          onPointerDown={keep} onClick={() => pressDateChip(chip.date)}>{chip.label}<small>{barDay(chip.date)}</small></button>)}
        <button type="button" data-bar-chip="pick" disabled={dateMoveOff} onPointerDown={keep} onClick={pickBarDate}>고르기</button>
      </div>
      {close('날짜 닫기')}
    </>;
    const more = <>
      {barButton('undo', <BarIcon name="undo" />, '입력 되돌리기', 'Ctrl+Z', undoOff)}
      {props.authoringMode && barButton('redo', <BarIcon name="redo" />, '입력 다시 하기', 'Ctrl+Y', redoOff)}
      {props.repeatLabel && props.onOpenPersonalAuthoring && barButton('repeat', <><BarIcon name="repeat" /><span>{props.repeatLabel}</span></>, '반복', props.repeatLabel, false, styles.barWide)}
      {barButton('menu', <BarIcon name="menu" />, '추가 메뉴', '/', false)}
      {close('도구 닫기')}
    </>;
    // Stage 2: the folder chips (from a typed '/', or after a new head line): folders, ＋ 새 폴더, [메뉴] for a '/', ×.
    const folders = <>
      <span className={styles.barHeading}>폴더</span>
      <div className={styles.barChips} role="group" aria-label="폴더 고르기">
        {barFolderChoices.map(folder => <button type="button" key={folder.id} data-bar-folder={folder.id} disabled={barOff} title={folder.path}
          onPointerDown={keep} onClick={() => runBarFolder(folder.id)}>{folder.title}</button>)}
        <button type="button" data-bar-folder="new" disabled={barOff} onPointerDown={keep} onClick={barNewFolder}><ProgramIcon name="plus" size={16} />새 폴더</button>
      </div>
      {barTriggerRef.current?.kind === 'slash' && <button type="button" className={styles.barMenu} data-bar-slash-menu disabled={barOff} onPointerDown={keep} onClick={barMenu}>메뉴</button>}
      {close('폴더 닫기')}
    </>;
    return place === 'bar' && barMode === 'date' && dateBody ? dates : place === 'bar' && barMode === 'more' ? more : place === 'bar' && barMode === 'folders' && body ? folders : tools;
  }
  /** W2: the move notice and the last message sit under the body (right above the keyboard bar while typing on
   *  a phone), never between the toolbar and the body: the body keeps its top and ends above them instead.
   *  Their buttons keep focus where it is, like the bar's: leaving the body would drop the bar and move them. */
  // W15: one notice row at a time: an ongoing move, then warnings (the editor's messages, until closed), then
  // choices, then plain notices; the rest wait ("n개 더"). A press or focus inside holds a notice's time.
  function checkNoticeView(notice: ProgramCheckNotice) {
    const view = programCheckNoticeView(programCheckNoticeLive(notice, M.currentProgress(draft.committed, notice.targetId))), run = (step: ProgramCheckStep) => whenComposed(() => pressCheckStep(notice.key, step));
    return { tone: view.tone, text: view.text, closeLabel: '알림 닫기', close: closeCheckNotice,
      actions: view.actions.map(button => ({ label: button.label, run: run(button.step) })),
      chips: view.chips.map(button => ({ label: button.label, current: button.current, run: run(button.step) })) };
  }
  dateSuggestionBlocked.current = !!moving || !!message && !panel || !!checkNotice || !!folderNotice || !!repeatNotice || !!writingNotice || !!heldView || !!locationNotice || !!scheduleNotice || memoTip !== null || !!dateApplied;
  memoTipBlockedRef.current = !!moving || !!message && !panel || !!checkNotice || !!folderNotice || !!repeatNotice || !!writingNotice || !!heldView || !!locationNotice || !!scheduleNotice || !!dateSuggestion || !!dateApplied;
  const noticeViews = programNoticeOrder([
    ...(moving ? [{ moving: true, tone: 'choose' as const, text: `${moving.label} · 하위 ${moving.descendantCount}줄`, closeLabel: null, close: undefined,
      actions: [{ label: '위치 선택', run: () => setPanel({ kind: 'move', lineId: moving.lineId }) }, { label: '이동 취소', run: cancelMove }] }] : []),
    ...(message && !panel ? [{ tone: 'warn' as const, text: message, closeLabel: '안내 닫기', close: () => setMessage('') }] : []),
    // 저장 재설계 B: a writing question or warning answers the latest key (K2's question above all), so it leads its tone.
    ...(writingNotice && writingNotice.tone !== 'info' ? [{ tone: writingNotice.tone, text: writingNotice.text, detail: writingNotice.detail, actions: writingNotice.actions, closeLabel: '알림 닫기', close: () => setWritingNotice(null) }] : []),
    ...(checkNotice ? [checkNoticeView(checkNotice)] : []),
    ...(locationNotice ? [{tone:'choose' as const,text:locationNotice.label,closeLabel:'알림 닫기',close:()=>setLocationNotice(null),actions:[{label:'되돌리기',run:whenComposed(()=>{stepLocation(false);})},...(locationOutside(locationNotice)?[{label:props.folderId&&locationNotice.folderId!==props.folderId?'그 폴더 보기':'그날 보기',run:whenComposed(()=>showLocation(locationNotice))}]:[])]}] : []),
    ...(scheduleNotice?[{tone:'choose' as const,text:scheduleNotice.text,closeLabel:'알림 닫기',close:()=>setScheduleNotice(null),actions:[{label:'되돌리기',run:whenComposed(()=>{stepScheduleUndo();})}]}]:[]),
    ...(folderNotice ? [{ tone: folderNotice.tone, text: folderNotice.text, actions: folderNotice.actions, closeLabel: '알림 닫기', close: () => setFolderNotice(null) }] : []),
    ...(repeatNotice ? [{ tone: repeatNotice.tone, text: repeatNotice.text, actions: repeatNotice.actions, closeLabel: '알림 닫기', close: () => setRepeatNotice(null) }] : []),
    ...(memoTip !== null ? [{ tone: 'info' as const, text: PROGRAM_MEMO_TIP_TEXT, closeLabel: '알림 닫기', close: () => setMemoTip(null) }] : []),
    ...(heldView ? [heldView] : []),
    ...(writingNotice?.tone === 'info' ? [{ tone: writingNotice.tone, text: writingNotice.text, detail: writingNotice.detail, actions: writingNotice.actions, closeLabel: '알림 닫기', close: () => setWritingNotice(null) }] : []),
    ...(dateApplied ? [{ tone: 'info' as const, text: dateApplied.text, actions: [{ label: '되돌리기', run: dateApplied.undo }], closeLabel: '알림 닫기', close: () => setDateApplied(null) }] : []),
    ...(dateSuggestion && !dateSuggestionBlocked.current && !composing ? [{ tone: 'suggest' as const, text: dateSuggestion.source.replace(/^ *- \[ \] */, ''),
      emphasis: { start: dateSuggestion.words.start - (dateSuggestion.source.match(/^ *- \[ \] */)?.[0].length ?? 0), end: dateSuggestion.words.end - (dateSuggestion.source.match(/^ *- \[ \] */)?.[0].length ?? 0) },
      actions: [{ label: taskDateSuggestionLabel(dateSuggestion.date, taskDateSuggestionToday()), run: whenComposed(() => { void acceptDateSuggestion(dateSuggestion); }) }],
      closeLabel: '날짜 제안 무시', close: () => setSuggestion(null) }] : []),
  ]);
  const releaseNotice = () => { if (!noticeHeld) return; setNoticeHeld(false); restartFolderNotice(); restartCheckNotice(); };
  const notices = <div ref={noticeRef} className={styles.notices} onPointerDown={() => setNoticeHeld(true)} onPointerUp={releaseNotice} onPointerLeave={releaseNotice}
    onFocus={() => setNoticeHeld(true)} onBlur={releaseNotice}>
    {refused && <p className={styles.refusedLine}><span>{refusedLine}번째 줄: {refusedReason}</span></p>}
    {serverView?.extras && <div className={styles.serverExtras}>{serverView.extras}</div>}
    {noticeViews[0] && <ProgramNoticeRow notice={{ ...noticeViews[0], more: noticeViews.length - 1 }} onClose={noticeViews[0].close} />}
  </div>;
  const pickerEnterLabel = picker?.enter?.kind === 'folder' ? picker.enter.folder.title
    : picker?.enter?.kind === 'create' ? `새 폴더 ‘${picker.enter.title}’` : picker?.enter?.kind === 'ambiguous' ? '폴더를 직접 선택' : '폴더 이름 입력';
  const heldPickerChoice = pickerHold.pending()?.choice, heldPickerFolderId = heldPickerChoice?.kind === 'folder' ? heldPickerChoice.folder.id : null;
  const pickerFolderIcon = <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 7V5h7l2 2h9v13H3Z" /></svg>;
  const pickerChoiceButton = (candidate: FolderPickerCandidate, index: number) => <button key={candidate.id} type="button" tabIndex={-1}
    id={`${pickerId}-${index}`} role="option" aria-selected={picker?.navigation === index} data-folder-choice={candidate.id}
    data-held={pickerHeld && heldPickerFolderId === candidate.id ? 'true' : undefined}
    title={`${candidate.parentLabel} › ${candidate.title}`} onPointerDown={event => event.preventDefault()}
    onClick={() => pressPicker({ kind: 'folder', folder: candidate })}>
    {candidate.parentId !== picker?.parentId && <span className={styles.pickerParent}>{candidate.parentLabel} › </span>}{candidate.title}
  </button>;
  const writingBar = <div ref={barRef} className={styles.writingBar} role="toolbar" aria-label="쓰기 도구" data-editor-tools
    data-folder-picker={picker?.phone ? 'true' : undefined}
    style={picker?.phone && picker.barHeight > 0 ? { height: picker.barHeight, minHeight: picker.barHeight } : undefined}>
    {picker?.phone ? <>
      {picker.indent && !picker.linked ? <button type="button" tabIndex={-1} className={styles.pickerHeading} aria-label="상위로 내어쓰기"
        title={picker.parentLabel} onPointerDown={event => event.preventDefault()} onClick={() => pressPicker({ kind: 'outdent' })}>⇤ {picker.parentLabel} ›</button>
        : <span className={styles.pickerHeading} title={picker.parentLabel} aria-label={`현재 상위: ${picker.parentLabel}`}>{picker.parentId ? `${picker.parentLabel} ›` : pickerFolderIcon}</span>}
      {picker.enter && <button type="button" tabIndex={-1} className={styles.pickerEnter} data-held={pickerHeld ? 'true' : undefined}
        data-new={picker.enter.kind === 'create' ? 'true' : undefined}
        title={pickerEnterLabel} aria-label={`Enter로 ${pickerEnterLabel}`}
        onPointerDown={event => event.preventDefault()} onClick={() => { if (picker.enter) pressPicker(picker.enter); }}>↵ {pickerEnterLabel}</button>}
      <div id={pickerId} role="listbox" aria-label="연결할 폴더" className={styles.pickerChips}>{picker.candidates.map(pickerChoiceButton)}</div>
      {!picker.enter && !picker.candidates.length && <span className={styles.pickerEmpty}>폴더 이름을 치고 Enter</span>}
      <button type="button" tabIndex={-1} className={styles.pickerClose} aria-label="폴더 추천 닫기" onPointerDown={event => event.preventDefault()} onClick={closeBarPicker}><ProgramIcon name="close" size={20} /></button>
    </> : <>{barButtons('bar')}{barStatusSlot()}</>}
    <input ref={datePickRef} type="date" className={styles.srOnly} tabIndex={-1} aria-hidden="true" onChange={event => datePicked(event.currentTarget.value)} />
  </div>;
  const folderPicker = picker && !picker.phone ? <div data-folder-picker className={styles.folderPicker}
    style={{ left: picker.left, top: picker.top, width: picker.width, transform: picker.above ? 'translateY(-100%)' : undefined }}>
    <div className={styles.pickerHeader}><span>{picker.parentId ? `${picker.parentLabel} ›` : '최상위'}</span>
      <button type="button" tabIndex={-1} aria-label="폴더 추천 닫기" onPointerDown={event => event.preventDefault()} onClick={dismissPicker}><ProgramIcon name="close" size={20} /></button></div>
    <div id={pickerId} role="listbox" aria-label="연결할 폴더" className={styles.pickerList} style={{ maxHeight: picker.listHeight }}>{picker.candidates.map(pickerChoiceButton)}
      {!picker.candidates.length && <p>{picker.enter ? '일치하는 폴더가 없습니다.' : '폴더 이름을 치고 Enter'}</p>}</div>
    {picker.enter && picker.enter.kind !== 'folder' && <button type="button" tabIndex={-1} className={styles.pickerDefault}
      onPointerDown={event => event.preventDefault()} onClick={() => { if (picker.enter) pressPicker(picker.enter); }}>↵ {pickerEnterLabel}</button>}
    <small>↓ 폴더 선택 · Esc 닫기{picker.indent && !picker.linked ? ' · Shift+Tab 상위로' : ''}</small>
  </div> : null;
  return <section className={styles.editor} aria-label="개인 문서 편집" data-dirty={inputPending ? 'true' : 'false'} data-folder-screen={props.folderId && props.folderScreen ? 'true' : undefined} onInput={serverView ? event => { if (!inEditorHead(event.target)) markTyping(); } : undefined}
    onKeyDown={event => { if (event.key === 'Tab' && folderIndentSkipped.current) event.preventDefault(); folderIndentSkipped.current = false; }} onKeyDownCapture={event => {
    const imeConsumed = pickerIme.current?.keydown(event.nativeEvent) ?? false;
    const view = pickerRef.current;
    if (view && event.target === textArea()) {
      const action = folderPickerKey(event.nativeEvent, view.navigation, view.candidates.length, composingRef.current, imeConsumed);
      if (action.kind === 'dismiss') { event.preventDefault(); event.stopPropagation(); dismissPicker(); return; }
      if (action.kind === 'highlight') { event.preventDefault(); event.stopPropagation(); presentPicker({ ...view, navigation: action.index }); return; }
      if (action.kind === 'select') { event.preventDefault(); event.stopPropagation(); pressPicker({ kind: 'folder', folder: view.candidates[action.index] }); return; }
      if (action.kind === 'reset' && view.navigation !== -1) presentPicker({ ...view, navigation: -1 });
    }
    if (event.key === 'Tab') folderIndentSkipped.current = false;
    if (inEditorHead(event.target)) return;
    if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase()) && (inputLockedRef.current || draftRef.current?.getState().saving)) { event.preventDefault(); event.stopPropagation(); }
    // P3 (11/7): Ctrl+Z · Ctrl+Y · Ctrl+Shift+Z on the body take ↶ ↷'s own steps first. Here too, not only in
    // beforeinput: a browser sends no redo there when its own redo list is empty (as right after such a step).
    else if ((event.ctrlKey || event.metaKey) && !event.altKey && ['z', 'y'].includes(event.key.toLowerCase()) && event.target === textArea()
      && !event.nativeEvent.isComposing && !composingRef.current
      && historyStep(event.key.toLowerCase() === 'y' || event.shiftKey ? 'historyRedo' : 'historyUndo')) { event.preventDefault(); event.stopPropagation(); return; }
    if (event.key === 'Escape' && (panelRef.current || movingRef.current) && !event.nativeEvent.isComposing && !panelComposingRef.current && !composingRef.current) { event.preventDefault(); event.stopPropagation(); closePanel(); cancelMove(); }
  }}>
    {folderPicker}
    <div className={styles.toolbar}>
      {props.headStart && <div className={styles.headStart} data-editor-head="start">{props.headStart}</div>}
      {mode === 'text' && <button type="button" onClick={event => returnToDocumentMode(event.currentTarget)}>문서로 돌아가기</button>}
      <button type="button" className={styles.addButton} hidden={props.directWriting && !props.noteStatus} disabled={props.folderId ? inputLocked || !!props.readOnly || draft.invalid || composing || checkPending : insertionDisabled}
        onClick={() => { if (props.folderId) { void openRegionInsertMenu(); return; } const index = editorRef.current?.getSelection().lineIndex ?? 0;openCurrentInsertMenu(index); }}><ToolIcon name="add" size={18} />추가</button>
      {/* W6: [추가] | [☐ ⇤ ⇥ ↳] | [↶ ↷] [반복] [도구]; ↶ never sits next to ↳. Write polish C: the status ends the line (CSS order). */}
      {props.authoringMode && <span className={styles.toolbarSep} aria-hidden="true" />}
      {props.authoringMode && barButtons('toolbar')}
      {props.authoringMode && <span className={styles.toolbarSep} aria-hidden="true" />}
      <button type="button" disabled={undoOff} title={props.folderId && draft.dirty ? '저장되지 않은 입력은 저장본으로 되돌리기에서 취소할 수 있습니다.' : '입력 되돌리기 · Ctrl+Z'} aria-label="입력 되돌리기" onClick={undoInput}><ToolIcon name="undo" /></button>
      {props.authoringMode && <button type="button" disabled={redoOff} title="입력 다시 하기 · Ctrl+Y" aria-label="입력 다시 하기"
        onClick={redoInput}><ToolIcon name="redo" /></button>}
      {/* N10 (SPEC 5): [반복] offers 이 줄 반복 (the caret's line) and 반복·Flow 만들기 in one small panel. */}
      {props.repeatLabel && props.onOpenPersonalAuthoring && <button type="button" className={styles.repeatButton} aria-haspopup="dialog" onClick={() => {
        openRepeatFromTools();
      }}><ToolIcon name="repeat" size={18} />{props.repeatLabel}</button>}
      <details ref={toolsRef} className={styles.editorTools} data-editor-tools onKeyDown={event => {
        if (event.key !== 'Escape' || event.nativeEvent.isComposing || !event.currentTarget.open) return;
        event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus();
      }}>
        <summary aria-label="편집 도구" title="편집 도구"><ToolIcon name="tools" size={18} />도구</summary>
        <div className={styles.editorToolActions}>
          {props.noteActions}
          {/* Visual A: on a phone ↷ and 반복 leave the head line for this menu (CSS shows them there only). */}
          {props.authoringMode && <button type="button" className={styles.menuPhone} disabled={redoOff} onClick={event => { closeEditorTools(event.currentTarget); redoInput(); }}>입력 다시 하기</button>}
          {props.repeatLabel && props.onOpenPersonalAuthoring && <button type="button" className={styles.menuPhone} onClick={event => { closeEditorTools(event.currentTarget); openRepeatFromTools(); }}>{props.repeatLabel}</button>}
          <button type="button" aria-pressed={mode === 'text'} disabled={inputLocked || composing} onClick={event => { if (composingRef.current || inputLockedRef.current) return; closeEditorTools(event.currentTarget); setMode(mode === 'text' ? 'live' : 'text'); }}>원문 {mode === 'text' ? '닫기' : '보기'}</button>
          <button type="button" hidden={!!props.folderId} disabled={disabled || composing} onClick={event => { closeEditorTools(event.currentTarget); void copyFolderText(); }}>문서 TXT 복사</button>
          {props.directWriting && !props.noteStatus && <button type="button" disabled={insertionDisabled} onClick={event => { closeEditorTools(event.currentTarget); const index = editorRef.current?.getSelection().lineIndex ?? 0;openCurrentInsertMenu(index); }}>현재 줄에 추가</button>}
          <button type="button" hidden={!!props.folderId} disabled={disabled || draft.dirty} onClick={event => { closeEditorTools(event.currentTarget); previewOrder(); }}>날짜순 정렬</button>
          {!props.authoringMode && (props.onRedo || orderHistoryRef.current.hasEntries()) && <button type="button" hidden={!!props.folderId} disabled={disabled || draft.dirty} aria-label="다시 실행" onClick={event => { closeEditorTools(event.currentTarget); if (orderHistoryRef.current.hasEntries()) nativeHistory('historyRedo'); else void props.onRedo?.(); }}>다시 실행</button>}
        </div>
      </details>
      {serverView ? <div className={styles.statusSlot} data-warn={statusWarn || undefined}>
        {/* One live node: an alert for a warning (words hidden when a recovery box shows them), else a quiet status. */}
        {/* F11 W-HEIGHT-01: with the warning in the notice line (which announces it), the tool bar says '확인 필요' only. */}
        {alertLine?.tone === 'warn' ? <span className={styles.status} data-alert-short>확인 필요</span> : <>
        {statusWarn ? <span className={hasRecovery ? styles.srOnly : styles.status} role="alert">{statusLabel}</span>
          : <span className={styles.status} role="status" aria-live="polite" data-quiet={quietStatus || undefined}>{quietStatus ? <span aria-hidden="true">●</span> : statusLabel}</span>}
        {draft.error ? editorRecovery(false, serverView.recoveryBody) : serverView.recovery}</>}
      </div> : <>
        {props.noteStatus && <div className={styles.noteStatus}>{props.noteStatus}</div>}
        {draft.error ? editorRecovery(true) : <span className={styles.status} role="status" aria-live="polite">{editorStatus.label}</span>}
      </>}
      {props.headEnd && <div className={styles.headEnd} data-editor-head="end">{props.headEnd}</div>}
    </div>
    {alertView}
    {props.headBelow && <div className={styles.headBelow} data-editor-head="below">{props.headBelow}</div>}
    {props.folderId && props.folderScreen && <div className={regionStyles.docHead} data-folder-doc-head><strong>{currentDoc()?.title || '현재 글'}</strong><small>할 일 {props.folderScreen.open}</small>
      {/* A3 ①: the whole document, at the line being written (the gathered view's 전체 보기). */}
      <button type="button" data-whole-document disabled={inputLocked || !!props.readOnly || draft.saving || composingRef.current} onClick={props.onContinueWholeDocument ? continueWholeDocument : props.onShowWholeDocument}>전체 문서 ›</button>
      {!folderView?.regions.length && <p>이 문서에는 이 폴더 부분이 없습니다.</p>}</div>}
    {props.folderId && !props.folderScreen && <div className={regionStyles.actions} aria-label="문서 조회 범위" data-folder-gather>
      {/* 7k stage 1: the gathered folder says what is shown; only 전체 보기 ends it (the 쓰기 tab keeps it). */}<p><strong>/{folderView?.folderPath ?? '선택한 폴더'}</strong>만 보는 중 <small>{currentDoc()?.title || '현재 글'} · 하위 폴더 포함</small></p>
      <button type="button" data-gather-end disabled={inputLocked || !!props.readOnly || draft.saving || composingRef.current} onClick={props.onContinueWholeDocument ? continueWholeDocument : props.onShowWholeDocument}>전체 보기</button><button type="button" onClick={props.onShowFolderTasks}>폴더 전체 할 일</button>
      {!folderView?.regions.length && <p>이 분류에 맞는 내용이 없습니다. 전체 문서에서 확인할 수 있습니다.</p>}
    </div>}
    {/* Input v2 stage 2: 오늘 시작 줄 — today's head line in one press (focus first, so a phone's keyboard comes up). */}
    {todayStart && <button type="button" className={styles.todayStart} data-today-start disabled={inputLocked || draft.saving} onClick={startToday}>
      <span aria-hidden="true"><ProgramIcon name="plus" size={20} /></span>오늘 {programCalendarDate(today(), today())} 쓰기</button>}
    {heldCss && <style>{heldCss}</style>}
    <div ref={hostRef} className={`${styles.host}${props.directWriting ? ` ${styles.directWriting}` : ''}`} hidden={!!props.folderId} data-native-editor="v11-core" data-writing-root={writingRootId} />
    {notices}
    {folderView && <ProgramFolderRegionEditor key={`${props.docId}:${props.folderId}`} styles={regionStyles} view={folderView} readOnly={!!props.readOnly} locked={inputLocked} saving={draft.saving} mode={mode} listEnterV2={!!props.authoringMode}
      hostClassName={styles.host} today={today()} onOpenLine={props.onOpenFolderLine}
      workspace={currentState} onAccept={acceptRegion} onPersist={saveFullDraft} onDownload={downloadDraft}
      onContinueWholeDocument={continueWholeDocument} onInsertMenu={props.authoringMode ? () => { void openRegionInsertMenu(); } : undefined}
      afterActive={props.authoringMode ? writingBar : undefined}
      onPosition={(start, end, lineId) => { regionPositionRef.current = { start, end }; regionLineRef.current = lineId ?? null; propsRef.current.onPosition?.({ start, end, scrollTop: 0 }, lineId); syncBarLine(); settleRepeatLines(false); }}
      onRegister={port => { regionPortRef.current = port; }}
      onPending={(pending, composing) => { regionPendingRef.current = pending; composingRef.current = composing; setRegionPending(pending); propsRef.current.onDirtyChange?.(pending || !!draftRef.current?.getState().dirty); if (!composing) queueMicrotask(releaseHeldBar); }} />}
    {props.authoringMode && !folderView && writingBar}
    {props.authoringMode && !folderView && <div ref={roomRef} className={styles.keyboardRoom} aria-hidden="true" />}
    {panel && <dialog ref={dialogRef} className={styles.dialog} aria-label={title} onCompositionStartCapture={()=>{panelComposingRef.current=true;}} onCompositionEndCapture={()=>{panelComposingRef.current=false;}} onKeyDown={event => { trapProgramDialogTab(event.currentTarget, event); }} onCancel={event => { event.preventDefault(); closePanel(); cancelMove(); }}>
      <header><h3 title={title}>{title}</h3><button type="button" aria-label="닫기" onClick={closePanel}><ProgramIcon name="close" size={20} /></button></header>
      <div className={styles.dialogBody}>
      {childTarget&&<ProgramWritingInline key={childTarget.parentId+(childTarget.kind??'')} initialKind={childTarget.kind} parentTitle={childTarget.title} date={childTarget.date} scope={childTarget.scope} memo={childTarget.memo} readDraft={kind=>childDrafts.current[childTarget.parentId+':'+kind]} remember={(kind,text)=>{childDrafts.current[childTarget.parentId+':'+kind]=text;}} onSubmit={submitAuthoringChild}/>}

      {message && <p role="alert" className={styles.message}>{message}</p>}
      {panel.kind === 'order' && <div className={styles.choices}>
        <label>정렬할 구간<select value={panel.lineId ?? ''} onChange={event => previewOrder(event.target.value)}>
          {!panel.lineId && <option value="">명시한 구간이 없습니다</option>}
          {M.parseDocument(currentDoc()!, currentState()).rows.filter(entry => entry.kind === 'heading' && /^##\s+\S/.test(entry.text)).map(entry => <option key={entry.id} value={entry.id}>{entry.text.replace(/^##\s+/, '')}</option>)}
        </select></label>
        <p>선택한 구간의 항목을 날짜, 종일, 시간 순으로 옮깁니다. 속성·하위 체크·메모가 함께 이동하며 일정과 진행 기록은 바꾸지 않습니다.</p>
        {orderPreview?.plan.status === 'ready' ? <><label>변경 전<textarea readOnly value={orderPreview.plan.beforeRaw} /></label><label>변경 후<textarea readOnly value={orderPreview.plan.afterRaw} /></label></> :
          <p role="status">{orderPreview?.plan.status === 'noop' ? '이미 날짜순이거나 정렬할 항목이 두 개보다 적습니다.' : '명시한 구간(## 제목)과 고정 날짜가 있는 항목이 필요합니다. 미정·참조·혼합 구간이나 경계를 넘는 선택은 그대로 둡니다.'}</p>}
        <button type="button" onClick={closePanel}>취소</button>
        <button type="button" disabled={disabled || orderPreview?.plan.status !== 'ready'} onClick={applyOrder}>원문에 날짜순 적용</button>
      </div>}
      {panel.kind === 'section-order' && (plan => <div className={styles.choices} data-section-order>
        {plan?.status === 'ready' ? <>
          <p>날짜 구획의 순서만 거꾸로 바꿉니다. 구획 안 줄의 순서와 내용은 그대로이고, ↶ 한 번으로 되돌립니다.</p>
          <div className={styles.sectionOrderPreview}>
            <section aria-label="지금 순서"><h4>지금</h4><ol>{plan.headsBefore?.map((head, index) => <li key={index}>{sectionHeadLabel(head)}</li>)}</ol></section>
            <section aria-label="바꾼 뒤 순서"><h4>바꾼 뒤</h4><ol>{plan.headsAfter?.map((head, index) => <li key={index}>{sectionHeadLabel(head)}</li>)}</ol></section>
          </div>
        </> : <p role="status">{plan?.status === 'noop' ? '날짜 구획이 둘 이상인 글에서 바꿀 수 있습니다.' : plan?.status === 'blocked' && plan.reason === 'unsaved' ? '입력을 저장한 뒤 다시 열어 주세요. 원문은 그대로입니다.'
          : plan?.status === 'blocked' && plan.reason === 'execution-meaning-change' ? '바꾸면 어떤 할 일의 날짜나 폴더가 달라져 바꾸지 않습니다. 원문은 그대로입니다.' : '이 글은 순서를 안전하게 바꿀 수 없습니다. 원문은 그대로입니다.'}</p>}
        <button type="button" onClick={closePanel}>취소</button>
        <button type="button" data-section-order-apply disabled={disabled || plan?.status !== 'ready'} onClick={applyOrder}>순서 바꾸기</button>
      </div>)(orderPreview?.plan as DateSectionOrderPlan | undefined)}
      {panel.kind === 'repeat' && (target => <div className={styles.choices} data-repeat-panel>
        {/* N10 (SPEC 5): 이 줄 반복 writes the same "@…" marker a person can type; 반복·Flow 만들기 is the old sheet. */}
        <h4>이 줄 반복</h4>
        {!target.task ? <p role="status">할 일 줄에 커서를 두고 다시 눌러 주세요.</p>
          : target.block ? <p role="status">{PROGRAM_REPEAT_BLOCK_TEXT[target.block]}</p> : <>
          <p className={styles.dateTarget}>‘{programRepeatTitle(target.task.title)}’{target.marker ? ` · 지금 ${target.marker.label}` : ''}</p>
          <label>주기<select value={repeatForm.kind} onChange={event => setRepeatForm(form => ({ ...form, kind: event.target.value as RepeatForm['kind'] }))}>
            <option value="daily">매일</option><option value="weekdays-only">평일</option><option value="weekend">주말</option><option value="days-of-week">요일 고르기</option>
            <option value="days">며칠마다</option><option value="weeks">몇 주마다</option><option value="month-day">매달 그 날</option><option value="month-last">매달 말일</option>
            <option value="yearly">매년 그 날</option><option value="months">몇 달마다</option></select></label>
          {repeatForm.kind === 'days-of-week' && <div className={styles.dateChips} role="group" aria-label="요일">{[1, 2, 3, 4, 5, 6, 0].map(day =>
            <button type="button" key={day} aria-pressed={repeatForm.days.includes(day)} onClick={() => setRepeatForm(form => ({ ...form,
              days: form.days.includes(day) ? form.days.filter(value => value !== day) : [...form.days, day] }))}>{['일', '월', '화', '수', '목', '금', '토'][day]}</button>)}</div>}
          {['days', 'weeks', 'months'].includes(repeatForm.kind) && <label>{repeatForm.kind === 'days' ? '며칠마다 (2~365)' : repeatForm.kind === 'weeks' ? '몇 주마다 (1~52)' : '몇 달마다 (1~24)'}
            <input inputMode="numeric" value={repeatForm.every} onChange={event => setRepeatForm(form => ({ ...form, every: event.target.value.trim() }))} /></label>}
          {repeatForm.kind === 'month-day' && <label>며칠 (1~31)<input inputMode="numeric" value={repeatForm.monthDay} onChange={event => setRepeatForm(form => ({ ...form, monthDay: event.target.value.trim() }))} /></label>}
          {repeatForm.kind === 'yearly' && <><label>월<input inputMode="numeric" value={repeatForm.month} onChange={event => setRepeatForm(form => ({ ...form, month: event.target.value.trim() }))} /></label>
            <label>일<input inputMode="numeric" value={repeatForm.day} onChange={event => setRepeatForm(form => ({ ...form, day: event.target.value.trim() }))} /></label></>}
          <button type="button" disabled={!repeatWords(repeatForm) || actionsDisabled()} onClick={() => void applyRepeatForm(panel.lineId)}>
            {repeatWords(repeatForm) ? `${target.marker ? '반복 바꾸기' : '반복 적용'} · @${repeatWords(repeatForm)}` : '주기를 확인해 주세요'}</button>
          {target.marker && <button type="button" disabled={actionsDisabled()} onClick={() => void applyRepeatForm(panel.lineId, true)}>반복 그만하기</button>}
        </>}
        {props.onOpenPersonalAuthoring && <><h4>묶음 반복</h4><button type="button" onClick={() => { closePanel(); props.onOpenPersonalAuthoring?.(); }}>반복·Flow 만들기…<small>여러 할 일과 단계</small></button></>}
      </div>)(repeatTarget(panel.lineId))}
      {panel.kind === 'insert' && <div className={styles.choices}>
        {/* VA-P3-1 (11/7): the folder line's own entrance, by name. F4-a (A8 ②): one item, the folder's screen (its
            [할 일] first); 이 폴더만 모아 보기 and 분류에서 이 폴더 보기 became that screen. Saved before it opens. */}
        {row?.kind === 'scope' && row.scopeKind === 'folder' && row.scopeId && props.onOpenScope && <button type="button" data-open-scope onClick={() => {
          const scopeId = currentRow(panel.lineId)?.scopeId; dismissPanel(false, false);
          if (scopeId) void saveNow().then(saved => { if (saved) propsRef.current.onOpenScope?.(scopeId); });
        }}>이 폴더 보기 ›</button>}
        {slashFolders && <section className={styles.menuSection} aria-label="폴더 줄 넣기"><h4>폴더</h4><div className={styles.dateChips} role="group" aria-label="폴더 고르기">
          {slashFolders.map(folder => <button type="button" key={folder.id} data-slash-folder={folder.id} disabled={insertionDisabled} title={folder.path}
            onClick={() => void applySlashFolder(folder.id)}>{folder.title}</button>)}
          <button type="button" data-slash-folder="new" disabled={insertionDisabled} onClick={slashNewFolder}>새 폴더…</button></div></section>}
        {memoContext && <p className={styles.contextHint}>{memoContext.continuation}</p>}
        {row?.kind === 'subcheck' && row.isCanonical === true && !row.isReference && <small className={styles.registeredNotice}>이 하위 항목은 별도 할 일로 등록돼 있습니다. 들여쓰기를 바꿔도 등록과 진행 기록은 유지됩니다.</small>}
        {row?.progressTargetId && <section className={styles.menuSection} aria-label="옮기기" data-task-location-menu><h4>옮기기 <small>하위 할 일·메모도 같이</small></h4>
          {locationAvailability().blocked&&<div role="status" className={styles.contextHint}>저장을 확인하지 못해 옮기기를 잠시 막았습니다 <button type="button" disabled={locationAvailability().checking} onClick={taskMoveGate?.confirm}>{locationAvailability().checking?'확인 중…':'다시 확인'}</button></div>}
          {locationPolicy(panel.lineId).kind!=='move'&&<p className={styles.contextHint}>{locationPolicy(panel.lineId).message}</p>}
          <div className={styles.dateChips} role="group" aria-label="옮길 날">
            {programLineDateChips(today()).map(chip=><button type="button" key={chip.key} disabled={actionsDisabled()||locationAvailability().blocked||locationPolicy(panel.lineId).kind==='blocked'} onClick={()=>void applyDateChip(panel.lineId,chip.date)}>{chip.label}<small>{chip.detail}</small></button>)}
            <button type="button" data-date-sheet-open disabled={actionsDisabled()||locationAvailability().blocked||locationPolicy(panel.lineId).kind==='blocked'} onClick={()=>openDateSheet(panel.lineId)}>고르기<small>달력</small></button>
          </div>
          <button type="button" disabled={actionsDisabled()||locationAvailability().blocked||locationPolicy(panel.lineId).kind!=='move'} onClick={()=>openFolderPanel(panel.lineId)}>폴더로 옮기기<small>지금 / {programFolderPath(currentState(),M.tasks(currentState()).find(item=>item.id===row.progressTargetId)?.scopeId??'folder-unfiled')}</small></button>
        </section>}
        {row?.progressTargetId && <section className={styles.menuSection} aria-label="선택 항목 진행"><h4>진행</h4>
          {accessFor(panel.lineId)?.reason ? <button type="button" onClick={() => setPanel({ kind: 'reference', lineId: panel.lineId })}>기록·원래 항목 보기</button> : (chipTask => <>
            <button type="button" onClick={() => openProgress(panel.lineId)}>진행 기록</button>
            {/* F9 W-MENU-24: [고르기] is the calendar now; the time stays here, for every task. */}
            <button type="button" data-progress-date onClick={() => openProgress(panel.lineId, 'date')}>날짜·시간</button>
            {chipTask && props.repeatContext && row?.kind === 'task' && <button type="button" onClick={() => openRepeatPanel(panel.lineId)}>반복…</button>}
          </>)(M.tasks(currentState()).find(item => item.id === row.progressTargetId))}
        </section>}
        <section className={styles.menuSection} aria-label="이 위치에 추가">{row?.progressTargetId && <h4>추가</h4>}
        {placePreview.length>0&&<ol className={styles.insertPreview} aria-hidden="true">{placePreview.filter(line => !(line.kind === 'anchor' && line.text.trim() === '/')).map((line,index)=><li key={index} data-kind={line.kind} style={{paddingInlineStart:`${Math.min(line.depth,4)*14+8}px`}}>{line.text}</li>)}</ol>}
        {childParent&&<button type="button" onFocus={()=>setPreviewKey('child')} onMouseEnter={()=>setPreviewKey('child')} onClick={()=>{openAuthoringChild(row!.index,'task');}}>하위 할 일{programPlaceNote(childParent.place.label) && <small>{programPlaceNote(childParent.place.label)}</small>}</button>}
        {menuInsertions.map(option => <button type="button" key={`${option.kind}:${option.offset}:${option.depth}`} disabled={insertionDisabled}
          onFocus={()=>setPreviewKey(`${option.kind}:${option.offset}:${option.depth}`)} onMouseEnter={()=>setPreviewKey(`${option.kind}:${option.offset}:${option.depth}`)}
          onClick={() => insertNative(option.offset, option.text, option.caretOffset)}>{option.label}{(note => note && <small>{note}</small>)(programPlaceNote(option.label.startsWith('다음 ')&&row?insertPlaceAfter(option.index-row.index-1,row.title||row.task?.title||row.text.trim()):option.relation))}</button>)}
        {childParent&&<button type="button" onClick={()=>{openAuthoringChild(row!.index,'memo');}}>메모<small>{childParent.memo?'이 할 일에 붙임 · 있는 메모를 고침':'이 할 일에 붙임'}</small></button>}
        {props.authoringMode&&(['step','description'] as const).map(kind=>{const place=layoutPlaces[kind];return <button type="button" key={kind} disabled={insertionDisabled||!place?.ok}
          onFocus={()=>setPreviewKey(kind)} onMouseEnter={()=>setPreviewKey(kind)} onClick={()=>insertAuthoringLayout(kind)}>{kind==='step'?'소제목 추가':'일반 글 추가'}
          {(note => note && <small>{note}</small>)(place?.ok?programLayoutPlaceNote(kind,place):'여기에는 넣을 수 없음')}</button>;})}
        {props.authoringMode&&props.onOpenPersonalAuthoring&&<button type="button" onClick={()=>{closePanel();props.onOpenPersonalAuthoring?.();}}>반복·Flow 만들기</button>}
        {!currentDoc()?.lines.length && <><button type="button" disabled={insertionDisabled} onClick={() => insertNative(0, '- [ ] ', 6)}>할 일</button><button type="button" onClick={() => { closePanel(); editorRef.current?.focus(); }}>일반 글</button></>}
        {props.onWritingExample && <button type="button" disabled={insertionDisabled} onClick={() => { closePanel(); props.onWritingExample?.(); }}>작성 예시 넣기<small>할 일·하위 할 일·메모가 든 예시</small></button>}
        </section>
        <details className={styles.menuGroup} aria-label="연결·구획"><summary>연결·구획</summary><div className={styles.choices}>
        <button type="button" onClick={insertDateSection}>날짜 구획 · 문서 끝에</button>
        {!row?.progressTargetId&&<button type="button" onClick={() => openFolderPanel(panel.lineId)}>폴더 연결</button>}
        {row?.isReference && panelAccess?.documentId && panelAccess.lineId === (row.progressTargetId ?? row.taskId) && !panelAccess.reason && <button type="button" disabled={disabled} onClick={() => {
          const current = currentRow(panel.lineId), access = accessFor(panel.lineId);
          if (actionsDisabled() || composingRef.current || !current?.isReference || !access?.documentId || access.lineId !== (current.progressTargetId ?? current.taskId)) return;
          setPanel({ kind: 'reference', lineId: panel.lineId });
        }}>연결된 항목 보기</button>}
        {props.onConnectFlow && <button type="button" onClick={() => { void connectFlow(panel.lineId); }}>Flow 연결</button>}
        </div></details>
        {row && <details className={styles.menuGroup} aria-label="선택 항목 옮기기·접기"><summary>옮기기·접기</summary><div className={styles.choices}>
        {row?.kind === 'scope' && row.scopeKind === 'folder' && props.folderCopyProblem && <button type="button" disabled={disabled} onClick={() => openFolderCopy(panel.lineId)}>이 폴더 묶음의 사본 만들기…</button>}
        {row?.kind === 'scope' && <small>폴더 연결을 포함하려면 편집 도구의 ‘문서 TXT 복사’를 쓰세요. 항목 기록을 유지해 옮기려면 하위 묶음 이동을 쓰세요.</small>}
        {row && ['task', 'subcheck', 'scope'].includes(row.kind) && <button type="button" disabled={!!props.folderId} onClick={() => beginMove(panel.lineId, true)}>하위 묶음 이동</button>}
        {row && <><button type="button" disabled={!!folderIndent && !folderIndent.indent.ok} onClick={() => indentFromMenu(false)}>들여쓰기</button>
          <button type="button" disabled={!!folderIndent && !folderIndent.outdent.ok} onClick={() => indentFromMenu(true)}>내어쓰기</button>
          <button type="button" disabled={!!props.folderId} onClick={() => { closePanel(); editorRef.current?.toggleFold(row.index); }}>하위 내용 접기 / 펼치기</button></>}
        {folderIndent && <small>{!folderIndent.indent.ok || !folderIndent.outdent.ok ? FOLDER_STRUCTURE_LOCK : '분류 보기에서는 접기와 하위 묶음 이동을 쓸 수 없습니다. ‘전체 문서 보기’에서 해 주세요.'}</small>}
        </div></details>}
      </div>}
      {panel.kind === 'progress' && !protectedExecutionPanel && <ProgramProgressForm title={row?.title || row?.task?.title} date={date} percent={percent} disabled={disabled}
        history={row?.progressTargetId ? M.progressHistory(draft.working, row.progressTargetId) : []} onDate={setDate} onPercent={setPercent}
        onHistory={recordDate=>{const record=row?.progressTargetId?M.progressHistory(draft.working,row.progressTargetId).find(entry=>entry.date===recordDate):null;if(record){setProgressRecordDate(record.date);setDate(record.date);setPercent(String(record.percent));}}}
        onSubmit={()=>{void applyProgress();}} />}
      {panel.kind === 'date' && !protectedExecutionPanel && <form onSubmit={event => { event.preventDefault(); void applyDate(); }}><p className={styles.dateTarget}>{row?.title || row?.task?.title}</p>
        <p className={styles.contextHint}>{locationPolicy(panel.lineId).kind==='move'?'같은 폴더의 고른 날짜로 하위 할 일·메모도 같이 옮깁니다.':locationPolicy(panel.lineId).message}</p>
        {dateContext && <p className={styles.contextHint} aria-label="날짜 출처">{dateContext.label}{dateContext.context && <small>{dateContext.context}</small>}</p>}
        <label>실행 날짜<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label><label>시간<input type="time" step={60} value={time} onChange={event => setTime(event.target.value)} /></label>
        {dateChangeHint && <p className={styles.contextHint} role="status">{dateChangeHint}</p>}
        <button type="button" onClick={() => setDate('')}>날짜 미정</button><button type="submit" disabled={disabled||locationAvailability().blocked}>날짜·시간 적용</button></form>}
      {panel.kind==='date-sheet'&&(sheetRow=>{
        const task=sheetRow?.progressTargetId?M.tasks(draft.working).find(item=>item.id===sheetRow.progressTargetId):undefined,policy=locationPolicy(panel.lineId);
        const rows=sheetRow?M.rowMeta(draft.working,props.docId).slice(sheetRow.index+1,sheetRow.subtreeEndIndex):[];
        const children=rows.filter(entry=>entry.kind==='task'||entry.kind==='subcheck').length,memos=rows.filter(entry=>entry.kind==='property'&&/^ *-\s+메모:/.test(entry.text)||entry.kind==='note'&&!!entry.text.trim()).length;
        const summary=policy.kind!=='move'?policy.message:[children?`하위 할 일 ${children}`:'',memos?`메모 ${memos}줄`:''].filter(Boolean).join(' · ')+(children||memos?' 같이 갑니다':'할 일을 통째로 옮깁니다');
        const marked=new Set(M.tasks(draft.working).flatMap(item=>!item.done&&item.date?[item.date]:[]));
        return <ProgramDateSheet title={sheetRow?.title||task?.title||''} summary={summary} today={today()} current={task?.date??null} marked={marked}
          disabled={disabled||actionsDisabled()||locationAvailability().blocked||policy.kind==='blocked'}
          blockedNote={locationAvailability().blocked?'저장을 확인한 뒤 옮길 수 있어요.':policy.kind==='blocked'?policy.message:null}
          onPick={value=>{void pickSheetDate(panel.lineId,value);}}/>;
      })(currentRow(panel.lineId))}
      {panel.kind==='task-folder'&&<ProgramTaskMoveSheet workspace={draft.working} documentId={props.docId} taskId={locationPolicy(panel.lineId).taskId} today={today()} availability={locationAvailability()} disabled={disabled} onChoose={folderId=>void performTaskLocation(panel.lineId,{kind:'folder',folderId})} onCreate={title=>void performTaskLocation(panel.lineId,{kind:'new-folder',title})}/>}
      {panel.kind === 'folder-copy' && <form onSubmit={event => { event.preventDefault(); void makeFolderCopy(); }}>
        <p>선택한 ‘{panel.folderCopyPreview?.title}’ 묶음만 새 문서로 복사합니다.</p>
        <small>최상위 폴더에 새 사본을 만듭니다. 현재값·날짜·메모는 유지하고 날짜별 기록은 복사하지 않습니다.</small>
        <label>새 사본 이름<input value={folderName} maxLength={100} required onChange={event => setFolderName(event.target.value)} /></label>
        <button type="submit" disabled={disabled || !folderName.trim()}>사본 만들어 저장</button>
      </form>}
      {panel.kind === 'folder' && <><div className={styles.folderPreview} aria-label="폴더 연결 위치"><strong>{panel.folderLinkPreview?.locationLabel}</strong>{panel.folderLinkPreview?.source && <small>기준 줄: {panel.folderLinkPreview.source.text || '빈 줄'}</small>}{panel.folderLinkPreview?.destination.relation !== 'same-line' && <small>기존 내용과 하위 항목은 그대로 둡니다.</small>}</div><div className={styles.choices}>{M.scopes(draft.working).filter(scope => scope.kind === 'folder').map(scope => {
        const problem = folderLinkProblems.get(scope.id);
        return <button type="button" key={scope.id} disabled={disabled || !!problem} onClick={() => { void attachFolder(scope.id); }}>{programFolderPath(draft.working, scope.id)}{problem && <small>{problem.message}</small>}</button>;
      })}</div><form onSubmit={event => { event.preventDefault(); void attachFolder(null); }}>{creationLocation !== null && <small>생성 위치: {creationLocation}</small>}<label>새 폴더 이름<input value={folderName} maxLength={100} onChange={event => setFolderName(event.target.value)} /></label><button type="submit" disabled={!folderName.trim() || disabled}>만들어 연결</button></form></>}
      {panel.kind === 'move' && <div className={styles.choices}>{moving?.targets.map(target => <button type="button" key={target.targetKey} onClick={() => { void finishMove(target.beforeLineId, target.depth); }}>{target.label}<small>깊이 {target.depth}</small></button>)}</div>}
      {(panel.kind === 'reference' || protectedExecutionPanel) && <ProgramReferencePanel access={panelAccess} title={row?.task?.title || row?.title || '연결된 항목'} date={row?.date ?? null}
        history={row?.progressTargetId ? M.progressHistory(draft.working, row.progressTargetId) : []}
        onProgress={() => openProgress(panel.lineId)} onDate={() => openProgress(panel.lineId, 'date')}
        onOrigin={props.onOpenTaskOrigin ? () => { const access = accessFor(panel.lineId); if (!access?.documentId) return; closePanel(); void saveNow().then(saved => { if (saved) propsRef.current.onOpenTaskOrigin?.(access.documentId!, access.lineId); }); } : undefined}
        onUnlink={row?.isReference && !props.readOnly ? () => { const lineId = panel.lineId; closePanel(); if (lineId) void apply(M.unlink(currentState(), props.docId, lineId), '항목 연결 해제'); } : undefined} />}
      </div>
    </dialog>}
  </section>;
}

export default ProgramTextEditor;
