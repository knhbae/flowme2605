'use client';

import type {OwnedWritingAck} from '@/lib/flow/integrated-poc/writing-ack';
import type {WritingCompute} from '@/lib/flow/integrated-poc/writing-compute';
import React, { useContext, useEffect, useId, useRef, useState } from 'react';
import { programEditorStatus, serverStatusWins } from '@/lib/flow/integrated-poc/program-status';
import { ProgramServerStatusContext } from './program-status-context';
import nativeEditor from '@/lib/flow/integrated-poc/vendor/text-editor.cjs';
import { textEditorRows, textWorkspaceModel as M, type TextEditorRowMeta, type TextMoveSelection, type TextMoveTarget, type TextWorkspaceState } from '@/lib/flow/integrated-poc/text-workspace';
import { readChildDrafts, type ProgramChildDraft } from '@/lib/flow/integrated-poc/child-draft-recovery';
import { createWritingBarHold, folderBarLine, heldTargetVerdict, taskMarkerLock, toggleTaskLine, writingBarLine, writingBarTarget, type WritingBarAction, type WritingBarLine, type WritingBarTarget } from '@/lib/flow/integrated-poc/writing-bar';
import '@/lib/flow/integrated-poc/vendor/text-editor.css';
import styles from './ProgramTextEditor.module.css';
import { planProgramDateBlockOrder, type DateBlockOrderPlan, type DateOrderSelection } from '@/lib/flow/integrated-poc/date-block-order';
import { applyProgramLinePermutation, createProgramPermutationHistory } from '@/lib/flow/integrated-poc/line-permutation';
import { programSame } from '@/lib/flow/integrated-poc/controller';
import { readProgramFolderCopyPreview, isProgramFolderCopyPreviewCurrent, copyProgramFolderOccurrence, type ProgramFolderCopyPreview } from '@/lib/flow/integrated-poc/folder-copy';
import { createAlphaStructuralDraft, type AlphaStructuralDraft } from '@/lib/flow/integrated-poc/alpha-structural-recovery';
import { restoredLineOffset } from '@/lib/flow/integrated-poc/folder-line-hold';
import { createProgramTextDraft, type ProgramTextCommit, type ProgramTextCommitOptions, type ProgramTextDraftState } from '@/lib/flow/integrated-poc/program-text-draft';
import {createProgramDocumentInput,type ProgramDocumentInput} from '@/lib/flow/integrated-poc/program-document-input';
import type { ProgramReferenceAccess } from '@/lib/flow/integrated-poc/reference-execution-guard';
import { linkProgramFolder, programFolderLineTitle, programFolderLinkProblem, programFolderLinkProblems } from '@/lib/flow/integrated-poc/folder-link-slot';
import { programFolderLinkPreview, isProgramFolderLinkPreviewCurrent, type ProgramFolderLinkPreview } from '@/lib/flow/integrated-poc/folder-link-preview';
import { isProgramFolderViewCurrent, planProgramRegionEdit, readProgramFolderRegions } from '@/lib/flow/integrated-poc/folder-document-regions';
import { childPlace, insertPlaceAfter, insertPreview, planLayoutInsertion, type InsertPreviewLine } from '@/lib/flow/integrated-poc/writing-insert-place';
import { revealProgramEditorLine } from './editor-reveal';
import { programFolderCreationLocation, programFolderInputSuggestion, programFolderPath, programFolderSuggestionPreservesSource } from '@/lib/flow/integrated-poc/folder-link-suggestions';
import { ProgramFolderRegionEditor, programRegionError, type ProgramFolderRegionPort, type ProgramFolderRegionSnapshot } from './ProgramFolderRegionEditor';
import regionStyles from './ProgramFolderRegionEditor.module.css';
import { readProgramTaskDatePresentation } from '@/lib/flow/integrated-poc/execution-presentation';
import { readProgramMemoContext, programTaskDateChangeHint } from '@/lib/flow/integrated-poc/text-context-presentation';
import { ProgramProgressForm } from './ProgramProgressForm';
import {ProgramWritingInline} from './ProgramWritingInline';
import {prepareWritingChild} from '@/lib/flow/integrated-poc/writing-child-command';
import {planWritingInsertion} from '@/lib/flow/integrated-poc/writing-insertion-command';

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
export type ProgramTextSaveStatus = { composing: boolean; saving: boolean; failed: boolean };

export interface ProgramTextEditorProps {
  /** Optional integration ports are ignored by the legacy editor. */
  writingCompute?:WritingCompute;writingContext?:()=>{ownerId:string;baseRevision:number};
  hostContext?: import('@/lib/flow/integrated-poc/rea-pm/app-host').ProgramPmHostContext;
  onRegisterInputCheckpoint?: (read: (() => import('@/lib/flow/integrated-poc/document-action').ProgramEditorInputCheckpoint) | null) => void;
  onRegisterCaptureComplete?: (read: (() => boolean) | null) => void;
  onRegisterExternalGuard?: (read: ((before: import('@/lib/flow/integrated-poc/contract').ProgramData, next: import('@/lib/flow/integrated-poc/contract').ProgramData) => boolean) | null) => void;
  docId: string;
  workspace: TextWorkspaceState;
  onCommit: ProgramTextCommit;
  onPosition?: (selection: ProgramTextPosition, lineId: string | null) => void;
  initialPosition?: ProgramTextPosition;
  onOpenScope?: (scopeId: string) => void;
  taskAccess?: (taskId: string, current?:TextWorkspaceState) => ProgramReferenceAccess;
  folderCopyProblem?: (state: TextWorkspaceState, docId: string, lineIds: readonly string[]) => string | null;
  onOpenTaskOrigin?: (documentId: string, lineId: string) => void;
  onConnectFlow?: (docId: string, lineId: string | null, insertAfter: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** The input was refused here (kept, not saved) or its save failed; false once it saves or is reverted. */
  onInputFailureChange?: (failed: boolean) => void;
  onRegisterSave?: (save: (() => Promise<boolean>) | null, status?: (() => ProgramTextSaveStatus) | null) => void;
  onRegisterSourceFocus?: (focus: ProgramSourceFocus | null) => void;
  onRegisterInputLock?: (lock: ((locked: boolean) => void) | null) => void;
  onRegisterDraft?: (read: (() => string) | null) => void;
  onRegisterStructuralDraft?: (read: (() => AlphaStructuralDraft | null) | null) => void;
  /** Unconfirmed memo/child-task panel text, for the tab's input recovery only. */
  onRegisterChildDrafts?: (read: (() => ProgramChildDraft[]) | null) => void;
  onRegisterConfirmedSave?: (accept: ((before: TextWorkspaceState, next: TextWorkspaceState, ack?:OwnedWritingAck) => boolean) | null) => void;
  onUndo?: () => void | Promise<void>;
  onRedo?: () => void | Promise<void>;
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
  disabledReason?: string;
  validateWorkspace?: (next: TextWorkspaceState) => boolean;
  /** Proposal gate: caller verifies current canonical private ownership and known copy/source exclusions. Absent means refuse. */
  authorizeTaskSplit?: (lineId: string, current: TextWorkspaceState) => boolean;
  folderId?: string;
  onShowWholeDocument?: () => void;
  /** Parent checks other mounted drafts before running a synchronous local handoff. */
  onContinueWholeDocument?: (stage: () => boolean) => boolean;
  onShowFolderTasks?: () => void;
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

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Size only the existing surface; warnings remain in normal document flow. */
export function programEditorVisibleHeight(top: number, bottom: number) {
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return null;
  const available = Math.max(64, bottom - Math.max(0, top) - 12);
  return Math.max(64, 20 + Math.floor((available - 20) / 26) * 26);
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
type Panel = { kind: 'insert' | 'child' | 'progress' | 'date' | 'folder' | 'folder-copy' | 'move' | 'reference' | 'order'; lineId: string | null; child?:ChildTarget; folderSuggestionTitle?: string; folderLinkPreview?: ProgramFolderLinkPreview; folderCopyPreview?: ProgramFolderCopyPreview } | null;
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
    {!access?.reason && <><button type="button" onClick={onProgress}>진행 기록</button><button type="button" onClick={onDate}>날짜 바꾸기</button></>}
    {access?.documentId && onOrigin && <button type="button" onClick={onOrigin}>원래 문서의 항목 열기</button>}
    {onUnlink && <button type="button" onClick={onUnlink}>이 연결만 해제</button>}
  </div>;
}

/** A default binary check records progress on the existing Item. Subchecks,
 * partial progress and future-record ambiguity retain the explicit detail UI. */
/** Presentation follows the real action; this never authorizes a mutation. */
/** A checkbox line with no title yet. */
const EMPTY_TITLE_TASK = /^\s*-\s+\[([ xX]|\d+(?:\.\d+)?%?)\]\s*$/;

export function programCheckboxAction(meta: TextEditorRowMeta, access: ProgramReferenceAccess | undefined, date: string): 'toggle' | 'progress-open' | 'reference-open' {
  if (!meta.progressTargetId || !access || access.kind !== 'active' || access.reason
    || access.lineId !== meta.progressTargetId || !access.documentId) return 'reference-open';
  if (meta.kind === 'subcheck' && !meta.isCanonical || (meta.progressDate ?? '') > date
    || (meta.progressPercent !== 0 && meta.progressPercent !== 100)) return 'progress-open';
  return ['task', 'reference'].includes(meta.kind)||meta.kind==='subcheck'&&meta.isCanonical ? 'toggle' : 'progress-open';
}

export function programDirectCheckboxChange(workspace: TextWorkspaceState, docId: string, lineId: string, date: string) {
  const row = M.rowMeta(workspace, docId).find(entry => entry.id === lineId);
  if (row?.kind === 'subcheck'&&!row.isCanonical) return { kind: 'panel', reason: 'subcheck' } as const;
  const target = row?.progressTargetId;
  if (!row||row.kind!=='task'&&!(row.kind==='subcheck'&&row.isCanonical) || !target) return { kind: 'blocked' } as const;
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
  // The unlinked "- /name" line typed last; `left` once leaving it found no folder of that name.
  const heldFolderLineRef = useRef<{ id: string; left: boolean } | null>(null);
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
  const [suggestionLineId, setSuggestionLineId] = useState<string | null>(null);
  const suggestionLineRef = useRef<string | null>(null);
  const [dismissedSuggestion, setDismissedSuggestion] = useState('');
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
  const [panel, setPanelState] = useState<Panel>(null),panelRef=useRef<Panel>(null);
  const setPanel=(next:Panel)=>{panelRef.current=next;setPanelState(next);};
  const childTarget=panel?.kind==='child'?panel.child??null:null;
  const currentChild=()=>panelRef.current?.kind==='child'?panelRef.current.child??null:null;
  const childDrafts=useRef<Record<string,string>>({});
  // Recovery reads panel text as it is; it never marks the document dirty or blocks other actions.
  const captureChildDrafts=()=>readChildDrafts(childDrafts.current,M.tasks(currentState()));
  const panelComposingRef=useRef(false),compositionGeneration=useRef(0);
  const slashCommandRef=useRef<{lineId:string;raw:string;workspace:TextWorkspaceState;generation:number}|null>(null);
  // The insert menu's place preview follows the focused or hovered choice; null means the first one.
  const [previewKey,setPreviewKey]=useState<string|null>(null);
  const [moving, setMoving] = useState<Moving | null>(null);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [percent, setPercent] = useState('0');
  const [progressRecordDate, setProgressRecordDate] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [message, setMessage] = useState('');
  const [composing, setComposing] = useState(false);
  const disabled = inputLocked || !!props.readOnly || draft.invalid || draft.saving;
  const insertionDisabled=inputLocked||!!props.readOnly||draft.invalid||composing||regionPending||checkPending;
  // Writing model A bar (S3): ☐ ← → ↵ ＋. Its buttons never dim for composition or a save;
  // a press then is held, shown pressed, and runs once when input settles.
  const [barLine, setBarLine] = useState<WritingBarLine>({ canOutdent: false, canIndent: false, isTask: false, markerLock: null });
  const [barHold] = useState(() => createWritingBarHold<WritingBarTarget>()), [heldBar, setHeldBar] = useState<WritingBarAction | null>(null);
  const barRef = useRef<HTMLDivElement>(null), barLockId = useId();
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
  useEffect(() => { releaseHeldBar(); }, [composing, draft.saving, inputLocked, props.readOnly, regionPending]);
  // Other typing or leaving the editor cancels a held press; the composition's own input does not,
  // including a final insertText some keyboards send right after compositionend.
  useEffect(() => {
    const root = hostRef.current?.closest('section');
    if (!root) return;
    let composedJustNow = false, settle: ReturnType<typeof setTimeout> | null = null;
    const cancel = () => { if (barHold.held()) { barHold.cancel(); setHeldBar(null); } };
    const typed = (event: Event) => {
      const type = (event as InputEvent).inputType;
      if (composingRef.current || ['insertCompositionText', 'insertFromComposition', 'deleteByComposition', 'deleteCompositionText'].includes(type)
        || composedJustNow && type === 'insertText') return;
      cancel();
    };
    const composed = () => { compositionAnchorRef.current = null; composedJustNow = true; if (settle) clearTimeout(settle); settle = setTimeout(() => { composedJustNow = false; settle = null; }, 0); };
    const started = (event: Event) => {
      const area = event.target instanceof HTMLTextAreaElement ? event.target : null;
      compositionAnchorRef.current = area ? { area, offset: area.selectionStart } : null;
    };
    const left = (event: FocusEvent) => { if (!(event.relatedTarget instanceof Node && root.contains(event.relatedTarget))) cancel(); };
    root.addEventListener('beforeinput', typed, true); root.addEventListener('compositionstart', started, true); root.addEventListener('compositionend', composed, true); root.addEventListener('focusout', left);
    return () => { if (settle) clearTimeout(settle); root.removeEventListener('beforeinput', typed, true); root.removeEventListener('compositionstart', started, true); root.removeEventListener('compositionend', composed, true); root.removeEventListener('focusout', left); };
  }, [barHold]);

  const currentState = () => draftRef.current?.getState().working ?? propsRef.current.workspace;
  const currentDoc = () => M.getDocument(currentState(), propsRef.current.docId);
  const currentRow = (lineId: string | null) => {const state=currentState();return(documentInputRef.current?.rows(state)??M.rowMeta(state,propsRef.current.docId)).find(row=>row.id===lineId);};
  const accessFor = (lineId: string | null) => { const row = currentRow(lineId), target = row?.progressTargetId ?? row?.taskId; return target ? propsRef.current.taskAccess?.(target,currentState()) : undefined; };
  const textArea = () => hostRef.current?.querySelector<HTMLTextAreaElement>('textarea') ?? null;
  const actionsDisabled = () => !!checkPendingRef.current || inputLockedRef.current || !!propsRef.current.readOnly || !!draftRef.current?.getState().invalid || !!draftRef.current?.getState().saving;

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

  function rememberPosition() {
    if (propsRef.current.folderId) return;
    const textarea = textArea();
    if (!textarea) return;
    const index = textarea.value.slice(0, textarea.selectionStart).split('\n').length - 1;
    const held = heldFolderLineRef.current;
    if (held) { if (currentDoc()?.lines[index]?.id === held.id) held.left = false; else finishHeldFolderLine(); }
    const lineId = textarea.selectionStart === textarea.selectionEnd ? currentDoc()?.lines[index]?.id ?? null : null;
    if (suggestionLineRef.current !== lineId) { suggestionLineRef.current = lineId; setSuggestionLineId(lineId); setDismissedSuggestion(''); }
    propsRef.current.onPosition?.({ start: textarea.selectionStart, end: textarea.selectionEnd, scrollTop: textarea.scrollTop }, currentDoc()?.lines[index]?.id ?? null);
    syncBarLine();
  }
  /** B0: judge the held "- /name" line by its whole name. Explicit (Enter or a bar action with the caret on
   * it) links or makes the folder; otherwise only a folder of exactly that name is linked, once per leaving. */
  function finishHeldFolderLine(explicit = false) {
    const held = heldFolderLineRef.current, controller = draftRef.current, area = textArea();
    if (!held || !controller || !area || composingRef.current || propsRef.current.readOnly) return;
    const state = controller.getState();
    if (state.invalid || area.value !== state.raw) return;
    const docId = propsRef.current.docId, lines = M.getDocument(state.working, docId)?.lines ?? [];
    const index = lines.findIndex(line => line.id === held.id);
    // A linked line still showing its folder's name has nothing left to finish.
    const binding = state.working.bindings.find(row => row.docId === docId && row.lineId === held.id);
    const linked = binding?.kind === 'scope' ? state.working.folders.find(folder => folder.id === binding.scopeId) : undefined;
    if (index < 0 || !FOLDER_LINE.test(lines[index].text) || binding && (!linked || lines[index].text.replace(/^ *- \//, '').trim() === linked.title)) {
      heldFolderLineRef.current = null; return;
    }
    // N1: a linked line's typed name goes back to its folder's name, however it is finished; nothing moves.
    if (binding) {
      heldFolderLineRef.current = null;
      const beforeRaw = area.value, { selectionStart, selectionEnd, selectionDirection } = area;
      if (!controller.restoreFolderLineName(index)) return;
      // The caret keeps its place on the shorter or longer name, so the Enter that finished the line opens
      // the next line instead of splitting the one below.
      const restored = controller.getState().raw, line = restored.split('\n')[index];
      editorRef.current?.setValue(restored, { selection: { start: restoredLineOffset(beforeRaw, index, line, selectionStart),
        end: restoredLineOffset(beforeRaw, index, line, selectionEnd), direction: selectionDirection } });
      const notice = controller.getState().folderNotice; if (notice) setMessage(notice);
      scheduleSave(); return;
    }
    const create = explicit && area.value.slice(0, area.selectionStart).split('\n').length - 1 === index;
    if (!create && held.left) return;
    const declared = controller.declareFolderLine(index, !create);
    heldFolderLineRef.current = declared || create ? null : { id: held.id, left: true };
    const notice = controller.getState().folderNotice; if (notice) setMessage(notice);
    if (!declared) return;
    const visibleRaw = controller.getState().raw;
    if (visibleRaw !== area.value) editorRef.current?.setValue(visibleRaw, { preserveSelection: true });
    scheduleSave();
  }
  /** One ↶ right after a finished folder line moved puts the whole move back (D3 B). */
  function undoFolderMove() {
    const controller = draftRef.current;
    if (!controller || composingRef.current || inputLockedRef.current || propsRef.current.readOnly || !controller.canUndoFolderMove()) return false;
    if (!controller.undoFolderMove()) return false;
    editorRef.current?.setValue(controller.getState().raw, { preserveSelection: true });
    const notice = controller.getState().folderNotice; if (notice) setMessage(notice);
    scheduleSave(); return true;
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
    // A folder region keeps saved lines' kind and depth; offer only what its own check accepts.
    return propsRef.current.folderId
      ? folderBarLine(line, raw, caret, next => !!regionPortRef.current?.canApplyActive?.(next), FOLDER_STRUCTURE_LOCK, target.area.selectionEnd) : line;
  }
  function syncBarLine() {
    if (!propsRef.current.authoringMode) return;
    const next = readBarLine();
    if (next) setBarLine(previous => previous.canOutdent === next.canOutdent && previous.canIndent === next.canIndent
      && previous.isTask === next.isTask && previous.markerLock === next.markerLock && previous.structureLock === next.structureLock ? previous : next);
  }
  function runBar(action: WritingBarAction) {
    const target = barEditor();
    if (!target || inputLockedRef.current || propsRef.current.readOnly) return;
    if (!propsRef.current.folderId) finishHeldFolderLine(true);
    if (action === 'menu') { if (propsRef.current.folderId) void openRegionInsertMenu(); else openCurrentInsertMenu(target.instance.getSelection().lineIndex); return; }
    if (action === 'enter') target.instance.enter(true);
    else if (action === 'task') {
      const line = readBarLine();
      if (line?.markerLock) return;
      const plan = toggleTaskLine(target.area.value, target.area.selectionStart);
      target.instance.replaceRange(plan.start, plan.end, plan.text, { selectionAfter: { start: plan.caret, end: plan.caret } });
    } else target.instance.indent(action === 'outdent');
    syncBarLine();
  }
  function pressBar(action: WritingBarAction) {
    if (inputLockedRef.current || propsRef.current.readOnly) return;
    const busy = composingRef.current || !!draftRef.current?.getState().saving;
    // A held press remembers where it was aimed; a folder region may be read-only while it saves.
    const surface = busy ? propsRef.current.folderId ? regionPortRef.current?.activeEditor?.(true) ?? null : barEditor() : null;
    if (busy && !surface) return;
    const anchor = compositionAnchorRef.current, area = surface?.area;
    const settled = area && composingRef.current && anchor?.area === area ? anchor.offset : area?.selectionStart;
    stopBarRetry();
    const run = barHold.press(action, busy, area ? writingBarTarget(area, area.value, area.selectionStart, settled) : null);
    setHeldBar(barHold.held());
    if (run) runBar(run);
  }
  function stopBarRetry() { if (barRetry.current) { cancelAnimationFrame(barRetry.current.frame); barRetry.current = null; } }
  /** Run a held press once input settles, only where it was aimed. The press is taken only when its
   *  target is ready, so a region still read-only right after its save keeps it, for up to one second. */
  function releaseHeldBar() {
    if (!barHold.held()) { stopBarRetry(); return; }
    if (inputLockedRef.current || propsRef.current.readOnly) { stopBarRetry(); barHold.cancel(); setHeldBar(null); return; }
    if (composingRef.current || draftRef.current?.getState().saving) return;
    const target = barHold.target(), aimed = target?.surface as HTMLTextAreaElement | undefined, now = barEditor(), active = document.activeElement;
    const verdict = heldTargetVerdict(target, { surface: now?.area ?? null, value: now?.area.value ?? '', caret: now?.area.selectionStart ?? 0,
      selectionEnd: now?.area.selectionEnd ?? now?.area.selectionStart ?? 0, editable: !!now && !now.area.readOnly, connected: !!aimed?.isConnected,
      focusHere: !!active && (active === aimed || !!barRef.current?.contains(active) || active instanceof HTMLElement && !!active.closest('[data-bar-action]')) });
    if (verdict === 'wait') {
      const serial = barHold.serial(), since = barRetry.current?.serial === serial ? barRetry.current.since : performance.now();
      stopBarRetry();
      if (performance.now() - since > 1000) { barHold.cancel(); setHeldBar(null); return; }
      const frame = requestAnimationFrame(() => { if (barRetry.current?.frame === frame) releaseHeldBar(); });
      barRetry.current = { frame, serial, since };
      return;
    }
    // A retry that outlived its second is dropped even if the line just became ready.
    const expired = barRetry.current?.serial === barHold.serial() && performance.now() - barRetry.current.since > 1000;
    stopBarRetry();
    const run = barHold.release(false);
    setHeldBar(null);
    if (verdict === 'run' && run && !expired) runBar(run);
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
      && !hostRef.current?.closest('section')?.contains(active));
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
  // A local refusal never reaches the server, so the host learns of it only here.
  const inputFailed = draft.invalid || !!draft.error;
  useEffect(() => { propsRef.current.onInputFailureChange?.(inputFailed); }, [inputFailed]);
  useEffect(() => () => propsRef.current.onInputFailureChange?.(false), []);
  useEffect(() => {
    propsRef.current.onRegisterSave?.(saveNow, () => ({ composing: composingRef.current, saving: !!checkPendingRef.current || !!draftRef.current?.getState().saving, failed: !!draftRef.current?.getState().error }));
    propsRef.current.onRegisterSourceFocus?.(focusSourceRow);
    propsRef.current.onRegisterDraft?.(captureDraftRaw);
    propsRef.current.onRegisterStructuralDraft?.(captureStructuralDraft);
    propsRef.current.onRegisterChildDrafts?.(captureChildDrafts);
    propsRef.current.onRegisterCaptureComplete?.(()=>!currentChild());
    propsRef.current.onRegisterExternalGuard?.(()=>!!currentChild());
    propsRef.current.onRegisterInputLock?.(locked => {
      // Do not terminate a native IME composition by changing readOnly. Its
      // dirty signal makes the parent flush reject the context change instead.
      if (locked && composingRef.current) return;
      inputLockedRef.current = locked; setInputLocked(locked);
      const textarea = textArea(); if (textarea) textarea.readOnly = locked || !!propsRef.current.readOnly;
      if (locked) { orderEpochRef.current++; cancelMove(); dialogRef.current?.close(); setPanel(null); setOrderPreview(null); }
      editorRef.current?.refresh();
    });
    return () => { propsRef.current.onRegisterCaptureComplete?.(null);propsRef.current.onRegisterExternalGuard?.(null);propsRef.current.onRegisterSave?.(null, null); propsRef.current.onRegisterSourceFocus?.(null); propsRef.current.onRegisterInputLock?.(null); propsRef.current.onRegisterDraft?.(null); propsRef.current.onRegisterStructuralDraft?.(null); propsRef.current.onRegisterChildDrafts?.(null); };
  }, [props.docId]);
  function scheduleSave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    // A pending commit may fail after newer input armed this timer.
    timerRef.current = setTimeout(() => { if (!draftRef.current?.getState().error) void saveNow(false); }, 450);
  }
  async function apply(next: TextWorkspaceState, label: string, schedule?: ProgramTextCommitOptions['privateTaskSchedule']) {
    const before = currentState(), selected = writingSelection();
    if (actionsDisabled() || !draftRef.current?.apply(next, label, schedule)) { setMessage('이 변경은 적용할 수 없습니다. 현재 내용은 유지했습니다.'); return false; }
    cancelMove();
    orderHistoryRef.current.clear(); orderPositionsRef.current = []; orderEpochRef.current++;
    editorRef.current?.setValue(draftRef.current.getState().raw, { preserveSelection: true });
    const returned = selected && programTextSelectionAfterChange(before, next, propsRef.current.docId, selected);
    if (returned) {
      restoreWritingSelection(returned);
      // A moved source can be outside the old scroll window; reveal only after
      // model changes. Plain menu cancellation keeps its original scroll.
      editorRef.current?.refreshViewport();
    }
    editorRef.current?.refresh();
    return saveNow();
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
          editorRef.current?.refresh();void saveNow();return;
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
          else if(reply.workspace)void apply(reply.workspace,'할 일 체크 변경');
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
      } else if (change.kind === 'apply') void apply(change.next, change.percent === 100 ? '할 일 완료' : '완료 취소');
      else setMessage('체크 변경을 반영하지 못했습니다. 현재 내용과 기록은 유지했습니다.');
      return;
    }
    if (action.type === 'progress-open') { openProgress(lineId); return; }
    if (action.type === 'task-date') { openProgress(lineId, 'date'); return; }
    if (action.type === 'scope-open') {
      const scopeId = currentRow(lineId)?.scopeId;
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
      (...args) => propsRef.current.onCommit(...args), next => {
        if (!alive) return;
        setDraft(next); propsRef.current.onDirtyChange?.(!!currentChild()||programTextInputPending(next,textArea()?.value,composingRef.current,regionPendingRef.current,!!checkPendingRef.current));
        queueMicrotask(() => { if (alive) editorRef.current?.refresh(); });
      }, next => propsRef.current.validateWorkspace?.(next) ?? true,documentInput,!!propsRef.current.writingCompute,()=>propsRef.current.validateWorkspace);
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
    const instance = nativeEditor.create(host, {
      value: controller.getState().raw, label: '문서 내용', taskSplitEnabled: !!propsRef.current.authorizeTaskSplit,
      getCheckAction: (_index, meta) => programCheckboxAction(meta,
        meta.progressTargetId ? propsRef.current.taskAccess?.(meta.progressTargetId,currentState()) : undefined, today()),
      getRowMeta: () => documentInput.paint(controller.getState().working)??textEditorRows(controller.getState().working, props.docId),
      isActionDisabled: actionsDisabled,
      // Enter keeps the list rules; with the writing tools on, ＋ opens their menu, typed pickers stay off,
      // and list Enter v2 applies (one flag, so turning it off restores the R3 Enter).
      lineBreakEnter:()=>false,
      typingPickers:()=>!propsRef.current.authoringMode,
      plusOpensAuthoring:()=>!!propsRef.current.authoringMode,
      listEnterV2:()=>!!propsRef.current.authoringMode,
      getAddAnchor:index=>propsRef.current.authoringMode?{parentIndex:index,bottomIndex:index}:null,
      isCheckDisabled: checkActionsDisabled,
      canApplyIndent: raw => !actionsDisabled() && M.raw(M.getDocument(M.editText(controller.getState().working, props.docId, raw, { progressDate: today() }), props.docId)) === raw,
      canApplyTaskSplit: (raw, intent) => {
        if (!intent.taskSplit) return true;
        const before = controller.getState().working;
        if (actionsDisabled() || propsRef.current.authorizeTaskSplit?.(intent.taskSplit.sourceLineId, before) !== true) return false;
        const next = M.editTextResult(before, props.docId, raw, { folderText: true,
          inputSplice: { start: intent.start, end: intent.end, text: intent.text }, taskSplit: intent.taskSplit });
        return next.reason === null && M.raw(M.getDocument(next.state, props.docId)) === raw
          && (propsRef.current.validateWorkspace?.(next.state) ?? true);
      },
      beforeEnter: () => finishHeldFolderLine(true),
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
        let accepted = false;
        const hold = heldInput(raw, textArea()?.selectionStart, historyType || input?.inputType || '');
        if (pending) {
          accepted = pending.raw === raw && programSame(pending.before, controller.getState().working) && controller.apply(pending.next, '같은 구간 날짜순 정렬');
          if (accepted) orderHistoryRef.current.record(pending.before, pending.next);
          else controller.rejectRaw(raw);
        } else if (restored) accepted = controller.apply(restored, historyType === 'historyUndo' ? '날짜순 정렬 입력 취소' : '날짜순 정렬 다시 실행');
        else if ((historyType === 'historyUndo' || historyType === 'historyRedo') && orderHistoryRef.current.can(controller.getState().working, historyType)) controller.rejectRaw(raw);
        else if (input?.taskSplit && propsRef.current.authorizeTaskSplit?.(input.taskSplit.sourceLineId, controller.getState().working) !== true) controller.rejectRaw(raw);
        else accepted = controller.updateRaw(raw, '', { inputType: historyType || input?.inputType || '', inputSplice: input?.inputSplice,compositionGeneration:compositionGeneration.current, ...(input?.taskSplit ? { taskSplit: input.taskSplit } : {}), folderHold: hold });
        if (restored && accepted) {
          const position = orderPositionsRef.current.slice().reverse().find(entry => programSame(M.getDocument(entry.state, props.docId), M.getDocument(restored, props.docId)));
          if (position) queueMicrotask(() => { const area = textArea(); if (area && area.value === raw) { area.setSelectionRange(position.selection.start, position.selection.end, position.selection.direction); area.scrollTop = position.scrollTop; rememberPosition(); } });
        }
        if (accepted) {
          { const notice = controller.getState().folderNotice; if (notice) setMessage(notice); }
          const afterText = controller.getState().working;
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
            if (line) heldFolderLineRef.current = { id: line.id, left: false };
          } else {
            // A paste over a linked folder line's name is finished like typing: its name goes back.
            const index = raw.slice(0, textArea()?.selectionStart ?? 0).split('\n').length - 1, line = currentDoc()?.lines[index];
            if (line && FOLDER_LINE.test(line.text) && controller.getState().working.bindings.some(row => row.kind === 'scope' && row.docId === props.docId && row.lineId === line.id)) {
              if (heldFolderLineRef.current && heldFolderLineRef.current.id !== line.id) finishHeldFolderLine();
              heldFolderLineRef.current = { id: line.id, left: false };
            }
          }
          requestAuthoringSlash(beforeRaw,historyType||input?.inputType||'');
          scheduleSave();
        }
        else if (timerRef.current) clearTimeout(timerRef.current);
        rememberPosition();
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
    const compositionStart = () => { compositionGeneration.current++;controller.cancelPreparedRaw();composingRef.current = true; setComposing(true); orderEpochRef.current++; setOrderPreview(null); propsRef.current.onDirtyChange?.(true); };
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
      });
    };
    host.addEventListener('compositionstart', compositionStart, true);
    host.addEventListener('compositionend', compositionEnd, true);
    const preventLockedInput = (event: Event) => {
      controller.cancelPreparedRaw();
      const type = (event as InputEvent).inputType;
      if (type === 'historyUndo' && undoFolderMove()) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if ((inputLockedRef.current || (controller.getState().saving && (type === 'historyUndo' || type === 'historyRedo'))) && !composingRef.current) { event.preventDefault(); event.stopImmediatePropagation(); }
      if (!event.defaultPrevented && !composingRef.current && textarea && propsRef.current.validateWorkspace && !type?.startsWith('history')) {
        let start = textarea.selectionStart, end = textarea.selectionEnd, insert: string | null = null;
        if (type === 'insertText' || type === 'insertFromPaste') insert = (event as InputEvent).data;
        else if (type === 'insertParagraph' || type === 'insertLineBreak') insert = '\n';
        else if (type === 'deleteContentBackward') { insert = ''; if (start === end) start = Math.max(0, start - 1); }
        else if (type === 'deleteContentForward') { insert = ''; if (start === end) end = Math.min(textarea.value.length, end + 1); }
        if (insert !== null) {
          const raw=textarea.value.slice(0,start)+insert+textarea.value.slice(end);
          if (!controller.prepareRaw(raw,{inputType:type??'',compositionGeneration:compositionGeneration.current,...(type==='insertFromPaste'?{inputSplice:{start,end,text:insert}}:{}),folderHold:heldInput(raw,start+insert.length,type??'')})) {
            event.preventDefault(); event.stopImmediatePropagation();
            const index = textarea.value.slice(0, textarea.selectionStart).split('\n').length - 1;
            setMessage(programTextProtectionMessage(accessFor(currentDoc()?.lines[index]?.id ?? null)));
          }
        }
      }
    };
    const finishOnBlur = () => finishHeldFolderLine();
    const observeInput = (event: Event) => {
      const input=event as InputEvent;historyTypeRef.current=input.inputType||historyTypeRef.current;
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
      textarea.addEventListener('blur', finishOnBlur);
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
      window.removeEventListener('beforeunload', warnOnExit);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (textarea) for (const event of ['select', 'scroll', 'keyup', 'click', 'blur']) textarea.removeEventListener(event, rememberPosition);
      textarea?.removeEventListener('blur', finishOnBlur);
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
      textarea.placeholder = props.directWriting && !props.readOnly ? '여기에 바로 적으세요' : '';
    }
    editorRef.current?.refresh();
  }, [props.readOnly, props.directWriting, props.docId]);
  useEffect(() => { editorRef.current?.setMode(mode); }, [mode, props.docId]);
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
      frame=0;const width=visual?.width??view.innerWidth,height=visual?.height??view.innerHeight;
      dialog.style.setProperty('--writing-view-height',height+'px');
      dialog.style.setProperty('--writing-view-width',width+'px');
      dialog.style.setProperty('--writing-dialog-top',((visual?.offsetTop??0)+12)+'px');
      dialog.style.setProperty('--writing-dialog-left',((visual?.offsetLeft??0)+Math.max(12,(width-430)/2))+'px');
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
    let frame = 0;
    const update = () => {
      frame = 0;
      let bottom = Math.min(view.innerHeight, visual ? visual.offsetTop + visual.height : view.innerHeight);
      const nav = shell.querySelector<HTMLElement>('nav[aria-label="기본 이동"], nav[aria-label="주요 메뉴"]');
      if (nav?.getClientRects().length && view.getComputedStyle(nav).position === 'fixed') bottom = Math.min(bottom, nav.getBoundingClientRect().top);
      // The mobile writing bar sits right under the body (or the folder region being edited), so that ends above it.
      const bar = barRef.current, barShown = !!bar?.getClientRects().length;
      if (barShown) bottom -= bar!.getBoundingClientRect().height + 4;
      if (!host.getClientRects().length) { fitFolderRegion(host.closest('section'), barShown, bottom); return; }
      const height = programEditorVisibleHeight(host.getBoundingClientRect().top, bottom);
      if (height !== null && host.style.getPropertyValue('--program-editor-visible-height') !== `${height}px`) {
        host.style.setProperty('--program-editor-visible-height', `${height}px`);
        // ResizeObserver ordering must not leave the caret at the previous height.
        // Reuse its guarded reveal path without changing input or focus ownership.
        editorRef.current?.refreshViewport();
      }
    };
    const schedule = () => { if (!frame) frame = view.requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(shell); observer.observe(host);
    // Hidden retained editors and sibling notices can change top without changing
    // the shell's minimum height. No input/value/selection observer is needed.
    const mutation = new MutationObserver(schedule);
    mutation.observe(shell, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'open', 'data-writing-keyboard'] });
    view.addEventListener('resize', schedule); view.addEventListener('scroll', schedule, { passive: true });
    visual?.addEventListener('resize', schedule); visual?.addEventListener('scroll', schedule);
    // The writing bar shows while the body has focus (CSS), which no observer above sees.
    const editorRoot = host.closest('section');
    editorRoot?.addEventListener('focusin', schedule); editorRoot?.addEventListener('focusout', schedule);
    schedule();
    return () => { observer.disconnect(); mutation.disconnect(); view.cancelAnimationFrame(frame);
      view.removeEventListener('resize', schedule); view.removeEventListener('scroll', schedule);
      visual?.removeEventListener('resize', schedule); visual?.removeEventListener('scroll', schedule);
      editorRoot?.removeEventListener('focusin', schedule); editorRoot?.removeEventListener('focusout', schedule); };
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
      if (place?.ok) previewChoices.push({ key: kind, anchorId: row.id, at: place.index, depth: 0, label: kind === 'step' ? '새 단계가 여기에' : '설명이 여기에' });
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
    if (panel?.folderSuggestionTitle !== undefined
      && (propsRef.current.folderId || textArea()?.value !== draftRef.current?.getState().raw
        || !programSame(propsRef.current.workspace, draftRef.current?.getState().committed)
        || programFolderLineTitle(state, propsRef.current.docId, panel.lineId) !== panel.folderSuggestionTitle)) {
      setMessage('현재 줄이 바뀌었습니다. 닫고 다시 폴더를 선택해 주세요.'); return;
    }
    const problem = scopeId ? programFolderLinkProblem(state, props.docId, panel?.lineId ?? null, scopeId) : null;
    if (problem) { setMessage(problem.message); return; }
    const next = linkProgramFolder(state, props.docId, panel?.lineId ?? null, scopeId ? { scopeId } : { title: folderName });
    if (next === state) { setMessage('같은 이름·위치·폴더 연결을 확인해 주세요.'); return; }
    if (panel?.folderSuggestionTitle !== undefined && !programFolderSuggestionPreservesSource(state, next)) {
      setMessage('원문을 바꾸는 연결은 적용하지 않았습니다. 현재 입력을 유지했습니다.'); return;
    }
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
  function openFolderPanel(lineId: string | null, suggestionTitle?: string) {
    if (actionsDisabled() || composingRef.current) return;
    const preview = programFolderLinkPreview(currentState(), propsRef.current.docId, lineId, suggestionTitle === undefined ? 'direct' : 'proposal');
    if (!preview) { setMessage('이 위치에는 폴더를 연결할 수 없습니다.'); return; }
    setFolderName(suggestionTitle ?? programFolderLineTitle(currentState(), propsRef.current.docId, lineId) ?? '');
    setMessage(''); setPanel({ kind: 'folder', lineId, folderSuggestionTitle: suggestionTitle, folderLinkPreview: preview });
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
    if (accessFor(panel?.lineId ?? null)?.reason) { setPanel({ kind: 'reference', lineId: panel?.lineId ?? null }); return; }
    const target = currentRow(panel?.lineId ?? null)?.progressTargetId;
    if (!target) return;
    const task = M.tasks(currentState()).find(item => item.id === target);
    if (task && task.date === (date || null) && (task.time ?? '') === time) { closePanel(); return; }
    const next = M.updateTask(currentState(), target, { date: date || null, time });
    if (next === currentState()) { closePanel(); return; }
    closePanel(); await apply(next, '항목 날짜·시간', { taskId: target, date: date || null, time });
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

  const title = panel?.kind==='child' ? childTarget?.kind==='task' ? '하위 할 일' : childTarget?.kind==='memo' ? '메모' : '부모 메모 · 독립 하위 할 일' :protectedExecutionPanel ? '연결된 항목' : panel?.kind === 'order' ? '같은 구간 날짜순 정렬' : panel?.kind === 'progress' ? '누적 진행률' : panel?.kind === 'date' ? '항목 날짜' : panel?.kind === 'folder-copy' ? '폴더 사본 만들기' : panel?.kind === 'folder' ? '폴더 연결' : panel?.kind === 'move' ? '이동할 위치' : panel?.kind === 'reference' ? '연결된 항목' : panel?.kind === 'insert' && row?.progressTargetId ? '항목 작업' : '이 위치에 추가';
  const folderView = props.folderId ? readProgramFolderRegions(draft.working, props.docId, props.folderId) : null;
  const suggestionKey = `${suggestionLineId}:${currentRow(suggestionLineId)?.text ?? ''}`;
  const suggestion = props.folderId || props.readOnly || inputLocked || draft.invalid || composing || panel || dismissedSuggestion === suggestionKey
    ? null : programFolderInputSuggestion(draft.working, props.docId, suggestionLineId);
  function currentSuggestion(savedFrom?: TextWorkspaceState) {
    const state = draftRef.current?.getState(), area = textArea();
    if (!suggestion || !state || !area || actionsDisabled() || composingRef.current || propsRef.current.folderId
      || suggestionLineRef.current !== suggestion.lineId || area.value !== state.raw || area.selectionStart !== area.selectionEnd
      || (!programSame(propsRef.current.workspace, state.committed)
        && (!savedFrom || !programSame(propsRef.current.workspace, savedFrom)))) return null;
    const index = area.value.slice(0, area.selectionStart).split('\n').length - 1;
    if (currentDoc()?.lines[index]?.id !== suggestion.lineId) return null;
    const latest = programFolderInputSuggestion(state.working, propsRef.current.docId, suggestion.lineId);
    return latest?.title === suggestion.title ? latest : null;
  }
  async function chooseSuggestion(folderId: string) {
    const savedFrom = draftRef.current?.getState().committed;
    const preview = programFolderLinkPreview(currentState(), propsRef.current.docId, suggestion?.lineId ?? null, 'proposal');
    // A successful local flush may settle before the parent rerenders. Only its
    // captured baseline can bridge that interval; foreign authority still fails.
    if (!currentSuggestion()?.folders.some(entry => entry.id === folderId) || !await saveNow()
      || !currentSuggestion(savedFrom)?.folders.some(entry => entry.id === folderId)) return;
    if (!isProgramFolderLinkPreviewCurrent(currentState(), preview)) {
      setMessage('연결할 위치가 바뀌었습니다. 현재 줄에서 다시 선택해 주세요.'); return;
    }
    const state = currentState(), next = linkProgramFolder(state, propsRef.current.docId, suggestion!.lineId, { scopeId: folderId });
    if (!programFolderSuggestionPreservesSource(state, next)) {
      setMessage('원문을 바꾸는 연결은 적용하지 않았습니다. 현재 입력을 유지했습니다.'); return;
    }
    await saveFolderLink(state, next, '기존 폴더 연결');
  }
  function createSuggestion() {
    const current = currentSuggestion();
    if (!current || current.folders.length) return;
    openFolderPanel(current.lineId, current.title);
  }
  const progressConflict = progressConflictToView();
  const inputPending=!!childTarget||programTextInputPending(draft,textArea()?.value,composing,regionPending,checkPending);
  // Bar buttons turn off only for input protection, read-only, or a move they cannot make.
  const barOff = inputLocked || !!props.readOnly;
  const editorStatus = programEditorStatus({ readOnly: !!props.readOnly, readOnlyLabel: props.disabledReason, error: !!draft.error,
    locked: inputLocked, saving: draft.saving, checking: checkPending, pending: inputPending });
  const serverWins = serverStatusWins(serverView, editorStatus);
  const statusWarn = (serverWins ? serverView!.level : editorStatus.level) <= 4;
  // The words show the winner; the recovery boxes stay whichever wins, so no action is lost.
  const statusLabel = serverWins ? serverView!.label : editorStatus.label;
  const hasRecovery = !!serverView?.recovery || !!draft.error;
  // A refused edit that names its line: shown with the reason's first sentence (다시 저장 judges it again).
  const refused = draft.invalid && draft.problemLine !== undefined && !props.readOnly;
  const refusedLine = (draft.problemLine ?? 0) + 1, refusedReason = draft.error.split(/(?<=\.)\s/)[0];
  // While typing, anything short of a warning is one quiet dot, a fast "저장됨" included.
  const quietStatus = !!serverView && typing && !statusWarn && !inputLocked;
  // The bar's slot is the same status, short; the toolbar slot holds the one live announcement.
  const barStatus = quietStatus || !serverView && editorStatus.level >= 6 && editorStatus.level < 8 && !inputLocked ? '●'
    : props.readOnly ? '읽기 전용' : statusWarn ? `⚠ ${statusLabel}` : inputLocked ? '입력 잠시 멈춤' : statusLabel;
  /** The bar's copy of the status: never announced. A warning there is a button only when there is
   *  a recovery box to open (keyboard closes, the box and its actions show); otherwise just the words. */
  function barStatusSlot() {
    if (!statusWarn || !hasRecovery) return <span className={styles.barStatus} aria-hidden="true" data-warn={statusWarn || undefined}>{barStatus}</span>;
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
   * its line and the first sentence of its reason visible. */
  function editorRecovery(announce: boolean) {
    const label = props.readOnly ? '읽기 전용 · 복구' : inputLocked ? '입력 보호 · 복구' : '저장 확인 필요 · 복구';
    return <>{refused && <p className={styles.refusedLine}><span>{refusedLine}번째 줄: {refusedReason}</span></p>}
    <details name="program-input-feedback" className={styles.saveFeedback} onKeyDown={event => {
        if (event.key !== 'Escape' || event.nativeEvent.isComposing || composingRef.current || !event.currentTarget.open) return;
        event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false;
        event.currentTarget.querySelector('summary')?.focus({ preventScroll: true });
      }}><summary title={props.readOnly ? props.disabledReason || '읽기 전용' : draft.error}>{announce ? <span role="alert">{label}</span> : <span>{label}</span>}</summary><div className={styles.error}><p>{draft.error}</p><div>
      {progressConflict && <button type="button" onClick={showProgressConflict}>진행 조절 보기</button>}
      <button type="button" disabled={!!props.readOnly || draft.saving} onClick={() => { if (draftRef.current?.getState().invalid) draftRef.current.recheck(); void saveNow(); }}>다시 저장</button>
      <button type="button" onClick={downloadDraft}>입력한 원문 받기</button>
      <button type="button" disabled={inputLocked || draft.saving} onClick={() => { if (draftRef.current?.discard(propsRef.current.workspace)) { orderHistoryRef.current.clear(); orderPositionsRef.current = []; orderEpochRef.current++; editorRef.current?.setValue(draftRef.current.getState().raw, { preserveSelection: true }); } }}>저장본으로 되돌리기</button>
      </div></div></details></>;
  }
  function barButton(action: WritingBarAction, icon: string, label: string, keys: string, off: boolean, className?: string, describedBy?: string) {
    return <button key={action} type="button" className={className} data-bar-action={action} data-held={heldBar === action ? 'true' : undefined}
      aria-label={label} aria-describedby={describedBy} title={`${label} · ${keys}`} disabled={barOff || off}
      onPointerDown={event => { event.preventDefault(); }} onClick={() => { pressBar(action); }}>{icon}</button>;
  }
  function barButtons(place: 'toolbar' | 'bar') {
    const className = place === 'toolbar' ? styles.toolbarBarButton : undefined, locked = barLine.markerLock, moved = barLine.structureLock;
    return <>
      {barButton('task', '☐', barLine.isTask ? '일반 줄로 바꾸기' : '할 일로 바꾸기', '- [ ]', !!locked, className, locked ? barLockId + place : undefined)}
      {locked && <span id={barLockId + place} hidden>{barLine.markerLock}</span>}
      {moved && <span id={barLockId + place + 'move'} hidden>{moved}</span>}
      {barButton('outdent', '←', '내어쓰기', 'Shift+Tab', !barLine.canOutdent, className, moved ? barLockId + place + 'move' : undefined)}
      {barButton('indent', '→', '들여쓰기', 'Tab', !barLine.canIndent, className, moved ? barLockId + place + 'move' : undefined)}
      {barButton('enter', '↵', '할 일 아래 메모 줄', 'Shift+Enter', false, className)}
      {place === 'bar' && barButton('menu', '＋', '추가 메뉴', '/', false)}
    </>;
  }
  const writingBar = <div ref={barRef} className={styles.writingBar} role="toolbar" aria-label="쓰기 도구" data-editor-tools>
      {barButtons('bar')}{barStatusSlot()}</div>;
  return <section className={styles.editor} aria-label="개인 문서 편집" data-dirty={inputPending ? 'true' : 'false'} onInput={serverView ? markTyping : undefined} onKeyDownCapture={event => {
    if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase()) && (inputLockedRef.current || draftRef.current?.getState().saving)) { event.preventDefault(); event.stopPropagation(); }
    if (event.key === 'Escape' && (panelRef.current || movingRef.current) && !event.nativeEvent.isComposing && !panelComposingRef.current && !composingRef.current) { event.preventDefault(); event.stopPropagation(); closePanel(); cancelMove(); }
    else if (event.key === 'Escape' && suggestion && !event.nativeEvent?.isComposing && !composingRef.current) { event.preventDefault(); event.stopPropagation(); setDismissedSuggestion(suggestionKey); }
  }}>
    <div className={styles.toolbar}>
      {mode === 'text' && <button type="button" onClick={event => returnToDocumentMode(event.currentTarget)}>문서로 돌아가기</button>}
      <button type="button" hidden={props.directWriting && !props.noteStatus} disabled={props.folderId ? inputLocked || !!props.readOnly || draft.invalid || composing || checkPending : insertionDisabled}
        onClick={() => { if (props.folderId) { void openRegionInsertMenu(); return; } const index = editorRef.current?.getSelection().lineIndex ?? 0;openCurrentInsertMenu(index); }}>＋ 추가</button>
      {props.authoringMode && barButtons('toolbar')}
      <button type="button" disabled={inputLocked || !!props.readOnly || draft.saving || !!props.folderId && draft.dirty && !regionPending} title={props.folderId && draft.dirty ? '저장되지 않은 입력은 저장본으로 되돌리기에서 취소할 수 있습니다.' : '입력 되돌리기'} aria-label="입력 되돌리기" onClick={() => { if (undoFolderMove()) return; if (props.folderId && regionPending) regionPortRef.current?.undo?.(); else if (orderHistoryRef.current.hasEntries()) nativeHistory('historyUndo'); else if(props.authoringMode&&!props.folderId)editorRef.current?.undo(); else if (props.onUndo && !draft.dirty) void props.onUndo(); else if (!props.folderId) editorRef.current?.undo(); }}>↶</button>
      {props.authoringMode && <button type="button" disabled={inputLocked || !!props.readOnly || draft.saving || !!props.folderId} title="다시 실행" aria-label="다시 실행"
        onClick={() => { if (orderHistoryRef.current.hasEntries() || props.authoringMode) nativeHistory('historyRedo'); else if (props.onRedo && !draft.dirty) void props.onRedo(); }}>↷</button>}
      {props.repeatLabel && props.onOpenPersonalAuthoring && <button type="button" className={styles.repeatButton} aria-haspopup="dialog" onClick={() => props.onOpenPersonalAuthoring?.()}>{props.repeatLabel}</button>}
      <details className={styles.editorTools} data-editor-tools onKeyDown={event => {
        if (event.key !== 'Escape' || event.nativeEvent.isComposing || !event.currentTarget.open) return;
        event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus();
      }}>
        <summary aria-label="편집 도구" title="편집 도구"><span aria-hidden="true">…</span></summary>
        <div className={styles.editorToolActions}>
          {props.noteActions}
          <button type="button" aria-pressed={mode === 'text'} disabled={inputLocked || composing} onClick={event => { if (composingRef.current || inputLockedRef.current) return; closeEditorTools(event.currentTarget); setMode(mode === 'text' ? 'live' : 'text'); }}>원문 {mode === 'text' ? '닫기' : '보기'}</button>
          <button type="button" hidden={!!props.folderId} disabled={disabled || composing} onClick={event => { closeEditorTools(event.currentTarget); void copyFolderText(); }}>문서 TXT 복사</button>
          {props.directWriting && <button type="button" disabled={insertionDisabled} onClick={event => { closeEditorTools(event.currentTarget); const index = editorRef.current?.getSelection().lineIndex ?? 0;openCurrentInsertMenu(index); }}>현재 줄에 추가</button>}
          <button type="button" hidden={!!props.folderId} disabled={disabled || draft.dirty} onClick={event => { closeEditorTools(event.currentTarget); previewOrder(); }}>날짜순 정렬</button>
          {!props.authoringMode && (props.onRedo || orderHistoryRef.current.hasEntries()) && <button type="button" hidden={!!props.folderId} disabled={disabled || draft.dirty} aria-label="다시 실행" onClick={event => { closeEditorTools(event.currentTarget); if (orderHistoryRef.current.hasEntries()) nativeHistory('historyRedo'); else void props.onRedo?.(); }}>다시 실행</button>}
        </div>
      </details>
      {serverView ? <div className={styles.statusSlot} data-warn={statusWarn || undefined}>
        {/* One live node: an alert for a warning (words hidden when a recovery box shows them), else a quiet status. */}
        {statusWarn ? <span className={hasRecovery ? styles.srOnly : styles.status} role="alert">{statusLabel}</span>
          : <span className={styles.status} role="status" aria-live="polite" data-quiet={quietStatus || undefined}>{quietStatus ? <span aria-hidden="true">●</span> : statusLabel}</span>}
        {serverView.recovery}
        {draft.error && editorRecovery(false)}
      </div> : <>
        {props.noteStatus && <div className={styles.noteStatus}>{props.noteStatus}</div>}
        {draft.error ? editorRecovery(true) : <span className={styles.status} role="status" aria-live="polite">{editorStatus.label}</span>}
      </>}
      {serverView?.extras && <div className={styles.serverExtras}>{serverView.extras}</div>}
    </div>
    {moving && <div className={styles.moveNotice} role="status"><span>{moving.label} · 하위 {moving.descendantCount}줄</span><button type="button" onClick={() => setPanel({ kind: 'move', lineId: moving.lineId })}>위치 선택</button><button type="button" onClick={cancelMove}>이동 취소</button></div>}
    {message && !panel && <p className={styles.message} role="status">{message}</p>}
    {suggestion && <div className={regionStyles.actions} role="region" aria-label="폴더 연결 제안">{suggestion.folders.length > 0
      ? suggestion.folders.map(entry => <button type="button" key={entry.id} disabled={disabled} onClick={() => { void chooseSuggestion(entry.id); }}>{entry.path} 연결</button>)
      : <button type="button" disabled={disabled} onClick={createSuggestion}>새 폴더로 연결…</button>}<button type="button" onClick={() => setDismissedSuggestion(suggestionKey)}>제안 닫기</button></div>}
    {props.folderId && <div className={regionStyles.actions} aria-label="문서 조회 범위"><p>{currentDoc()?.title || '현재 글'} · 분류: {folderView?.folderPath ?? '선택한 분류'} · 하위 분류 포함</p>
      <button type="button" disabled={inputLocked || !!props.readOnly || draft.saving || composingRef.current} onClick={props.onContinueWholeDocument ? continueWholeDocument : props.onShowWholeDocument}>전체 문서 보기</button><button type="button" onClick={props.onShowFolderTasks}>폴더 전체 할 일</button>
      {!folderView?.regions.length && <p>이 분류에 맞는 내용이 없습니다. 전체 문서에서 확인할 수 있습니다.</p>}
    </div>}
    <div ref={hostRef} className={`${styles.host}${props.directWriting ? ` ${styles.directWriting}` : ''}`} hidden={!!props.folderId} data-native-editor="v11-core" />
    {folderView && <ProgramFolderRegionEditor key={`${props.docId}:${props.folderId}`} styles={regionStyles} view={folderView} readOnly={!!props.readOnly} locked={inputLocked || draft.saving} mode={mode} listEnterV2={!!props.authoringMode}
      workspace={currentState} onAccept={acceptRegion} onPersist={saveFullDraft} onDownload={downloadDraft}
      onContinueWholeDocument={continueWholeDocument} onInsertMenu={props.authoringMode ? () => { void openRegionInsertMenu(); } : undefined}
      afterActive={props.authoringMode ? writingBar : undefined}
      onPosition={(start, end, lineId) => { regionPositionRef.current = { start, end }; propsRef.current.onPosition?.({ start, end, scrollTop: 0 }, lineId); syncBarLine(); }}
      onRegister={port => { regionPortRef.current = port; }}
      onPending={(pending, composing) => { regionPendingRef.current = pending; composingRef.current = composing; setRegionPending(pending); propsRef.current.onDirtyChange?.(pending || !!draftRef.current?.getState().dirty); if (!composing) queueMicrotask(releaseHeldBar); }} />}
    {props.authoringMode && !folderView && writingBar}
    {panel && <dialog ref={dialogRef} className={styles.dialog} aria-label={title} onCompositionStartCapture={()=>{panelComposingRef.current=true;}} onCompositionEndCapture={()=>{panelComposingRef.current=false;}} onKeyDown={event => { trapProgramDialogTab(event.currentTarget, event); }} onCancel={event => { event.preventDefault(); closePanel(); cancelMove(); }}>
      <header><h3>{title}</h3><button type="button" aria-label="닫기" onClick={closePanel}>×</button></header>
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
      {panel.kind === 'insert' && <div className={styles.choices}>
        {row && <p className={styles.menuTarget}>{memoContext?.label || row.title || row.task?.title || row.text}</p>}
        {memoContext && <p className={styles.contextHint}>{memoContext.continuation}</p>}
        {row?.kind === 'subcheck' && row.isCanonical === true && !row.isReference && <small className={styles.registeredNotice}>이 하위 항목은 별도 할 일로 등록돼 있습니다. 들여쓰기를 바꿔도 등록과 진행 기록은 유지됩니다.</small>}
        {row?.progressTargetId && <section className={styles.menuSection} aria-label="선택 항목 진행·날짜"><h4>진행·날짜</h4>
          {accessFor(panel.lineId)?.reason ? <button type="button" onClick={() => setPanel({ kind: 'reference', lineId: panel.lineId })}>기록·원래 항목 보기</button> : <><button type="button" onClick={() => openProgress(panel.lineId)}>진행 기록</button><button type="button" onClick={() => openProgress(panel.lineId, 'date')}>날짜 바꾸기</button></>}
        </section>}
        <section className={styles.menuSection} aria-label="이 위치에 추가"><h4>이 위치에 추가</h4>
        {placePreview.length>0&&<ol className={styles.insertPreview} aria-hidden="true">{placePreview.map((line,index)=><li key={index} data-kind={line.kind} style={{paddingInlineStart:`${Math.min(line.depth,4)*14+8}px`}}>{line.text}</li>)}</ol>}
        {childParent&&<button type="button" onFocus={()=>setPreviewKey('child')} onMouseEnter={()=>setPreviewKey('child')} onClick={()=>{openAuthoringChild(row!.index,'task');}}>하위 할 일<small>{childParent.place.label}</small></button>}
        {menuInsertions.map(option => <button type="button" key={`${option.kind}:${option.offset}:${option.depth}`} disabled={insertionDisabled}
          onFocus={()=>setPreviewKey(`${option.kind}:${option.offset}:${option.depth}`)} onMouseEnter={()=>setPreviewKey(`${option.kind}:${option.offset}:${option.depth}`)}
          onClick={() => insertNative(option.offset, option.text, option.caretOffset)}>{option.label}<small>{option.label.startsWith('다음 ')&&row?insertPlaceAfter(option.index-row.index-1,row.title||row.task?.title||row.text.trim()):option.relation}</small></button>)}
        {childParent&&<button type="button" onClick={()=>{openAuthoringChild(row!.index,'memo');}}>메모<small>{childParent.memo?'이 할 일에 붙임 · 있는 메모를 고침':'이 할 일에 붙임'}</small></button>}
        {props.authoringMode&&(['step','description'] as const).map(kind=>{const place=layoutPlaces[kind];return <button type="button" key={kind} disabled={insertionDisabled||!place?.ok}
          onFocus={()=>setPreviewKey(kind)} onMouseEnter={()=>setPreviewKey(kind)} onClick={()=>insertAuthoringLayout(kind)}>{kind==='step'?'단계 추가':'설명 이어 쓰기'}
          <small>{place?.ok?insertPlaceAfter(place.after,place.blockTitle):'여기에는 넣을 수 없음'}</small></button>;})}
        {props.authoringMode&&props.onOpenPersonalAuthoring&&<button type="button" onClick={()=>{closePanel();props.onOpenPersonalAuthoring?.();}}>반복·Flow 만들기</button>}
        {!currentDoc()?.lines.length && <><button type="button" disabled={insertionDisabled} onClick={() => insertNative(0, '- [ ] ', 6)}>할 일</button><button type="button" onClick={() => { closePanel(); editorRef.current?.focus(); }}>자유 메모</button></>}
        </section>
        <details className={styles.menuGroup} aria-label="추가·연결"><summary>추가·연결</summary><div className={styles.choices}>
        <button type="button" onClick={insertDateSection}>날짜 구획 · 문서 끝에</button>
        <button type="button" onClick={() => openFolderPanel(panel.lineId)}>폴더 연결</button>
        {row?.isReference && panelAccess?.documentId && panelAccess.lineId === (row.progressTargetId ?? row.taskId) && !panelAccess.reason && <button type="button" disabled={disabled} onClick={() => {
          const current = currentRow(panel.lineId), access = accessFor(panel.lineId);
          if (actionsDisabled() || composingRef.current || !current?.isReference || !access?.documentId || access.lineId !== (current.progressTargetId ?? current.taskId)) return;
          setPanel({ kind: 'reference', lineId: panel.lineId });
        }}>연결된 항목 보기</button>}
        {props.onConnectFlow && <button type="button" onClick={() => { void connectFlow(panel.lineId); }}>Flow 연결</button>}
        </div></details>
        {row && <details className={styles.menuGroup} aria-label="선택 항목 문서 구조"><summary>문서 구조</summary><div className={styles.choices}>
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
        {dateContext && <p className={styles.contextHint} aria-label="날짜 출처">{dateContext.label}{dateContext.context && <small>{dateContext.context}</small>}</p>}
        <label>실행 날짜<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label><label>시간<input type="time" step={60} value={time} onChange={event => setTime(event.target.value)} /></label>
        {dateChangeHint && <p className={styles.contextHint} role="status">{dateChangeHint}</p>}
        <button type="button" onClick={() => setDate('')}>날짜 미정</button><button type="submit" disabled={disabled}>날짜·시간 적용</button></form>}
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
