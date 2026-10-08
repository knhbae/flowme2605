'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import nativeEditor from '@/lib/flow/integrated-poc/vendor/text-editor.cjs';
import { textEditorRows, textWorkspaceModel as M, type TextMoveSelection, type TextMoveTarget, type TextProgressCheckConflict, type TextWorkspaceState } from '@/lib/flow/integrated-poc/text-workspace';
import '@/lib/flow/integrated-poc/vendor/text-editor.css';
import styles from './ProgramTextEditor.module.css';
import { planProgramDateBlockOrder, type DateBlockOrderPlan, type DateOrderSelection } from '@/lib/flow/integrated-poc/date-block-order';
import { applyProgramLinePermutation, createProgramPermutationHistory } from '@/lib/flow/integrated-poc/line-permutation';
import { programSame } from '@/lib/flow/integrated-poc/controller';
import { programClone } from '@/lib/flow/integrated-poc/contract';
import type { ProgramReferenceAccess } from '@/lib/flow/integrated-poc/reference-execution-guard';
import { linkProgramFolder, programFolderLineTitle } from '@/lib/flow/integrated-poc/folder-link-slot';
import { programFolderLinkPreview, isProgramFolderLinkPreviewCurrent, type ProgramFolderLinkPreview } from '@/lib/flow/integrated-poc/folder-link-preview';
import { isProgramFolderViewCurrent, readProgramFolderRegions } from '@/lib/flow/integrated-poc/folder-document-regions';
import { programFolderCreationLocation, programFolderInputSuggestion, programFolderPath, programFolderSuggestionPreservesSource } from '@/lib/flow/integrated-poc/folder-link-suggestions';
import { ProgramFolderRegionEditor, type ProgramFolderRegionPort, type ProgramFolderRegionSnapshot } from './ProgramFolderRegionEditor';
import regionStyles from './ProgramFolderRegionEditor.module.css';
import { readProgramTaskDatePresentation } from '@/lib/flow/integrated-poc/execution-presentation';
import { readProgramMemoContext, programTaskDateChangeHint } from '@/lib/flow/integrated-poc/text-context-presentation';

export interface ProgramTextPosition { start: number; end: number; scrollTop: number }
export type ProgramSourceFocus = (target: { documentId: string; lineId: string; raw: string }) => boolean;
export type ProgramTextCommitOptions = {
  groupId?: string;
  expectedWorkspace?: TextWorkspaceState;
  privateTaskSchedule?: { taskId: string; date: string | null; time: string };
  /** UI-only confirmation of a successful schedule's server-generated property IDs. */
  onPrivateTaskScheduleAcknowledged?: (confirmation: Promise<TextWorkspaceState | null>) => void;
};
export interface ProgramTextEditorProps {
  docId: string;
  workspace: TextWorkspaceState;
  onCommit: (next: TextWorkspaceState, label: string, options?: ProgramTextCommitOptions) => Promise<boolean>;
  onPosition?: (selection: ProgramTextPosition, lineId: string | null) => void;
  initialPosition?: ProgramTextPosition;
  onOpenScope?: (scopeId: string) => void;
  taskAccess?: (taskId: string) => ProgramReferenceAccess;
  onOpenTaskOrigin?: (documentId: string, lineId: string) => void;
  onConnectFlow?: (docId: string, lineId: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterSave?: (save: (() => Promise<boolean>) | null) => void;
  onRegisterSourceFocus?: (focus: ProgramSourceFocus | null) => void;
  onRegisterInputLock?: (lock: ((locked: boolean) => void) | null) => void;
  onRegisterDraft?: (read: (() => string) | null) => void;
  onRegisterConfirmedSave?: (accept: ((before: TextWorkspaceState, next: TextWorkspaceState) => boolean) | null) => void;
  onUndo?: () => void | Promise<void>;
  onRedo?: () => void | Promise<void>;
  readOnly?: boolean;
  /** Local document-collection UI: direct writing first, current-line tools secondary. */
  directWriting?: boolean;
  disabledReason?: string;
  validateWorkspace?: (next: TextWorkspaceState) => boolean;
  folderId?: string;
  onShowWholeDocument?: () => void;
  /** Parent checks other mounted drafts before running a synchronous local handoff. */
  onContinueWholeDocument?: (stage: () => boolean) => boolean;
  onShowFolderTasks?: () => void;
}

export interface ProgramTextDraftState {
  committed: TextWorkspaceState;
  working: TextWorkspaceState;
  raw: string;
  dirty: boolean;
  saving: boolean;
  invalid: boolean;
  error: string;
  progressConflict?: TextProgressCheckConflict;
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

/** Serializes draft commits while preserving newer typing and rejected raw input. */
export function createProgramTextDraft(
  workspace: TextWorkspaceState,
  docId: string,
  commit: ProgramTextEditorProps['onCommit'],
  notify: (state: ProgramTextDraftState) => void,
  validateWorkspace: (next: TextWorkspaceState) => boolean = () => true,
) {
  let state: ProgramTextDraftState = { committed: workspace, working: workspace, raw: M.raw(M.getDocument(workspace, docId)), dirty: false, saving: false, invalid: false, error: '' };
  let flight: Promise<boolean> | null = null;
  let label = '문서 편집';
  let groupId: string | undefined;
  let privateTaskSchedule: ProgramTextCommitOptions['privateTaskSchedule'];
  let inputGeneration = 0;
  let submitted: { before: TextWorkspaceState; next: TextWorkspaceState; generation: number } | null = null;
  const report = () => notify({ ...state });
  const api = {
    getState: () => state,
    rejectRaw(raw: string) {
      privateTaskSchedule = undefined;
      inputGeneration++;
      state = { ...state, raw, invalid: true, dirty: true, progressConflict: undefined, error: '문서 문맥이 바뀌어 순서를 반영하지 않았습니다. 입력은 남아 있습니다.' }; report();
    },
    updateRaw(raw: string, progressDate: string) {
      privateTaskSchedule = undefined;
      inputGeneration++;
      const baseRaw = M.raw(M.getDocument(state.committed, docId));
      const edit: ReturnType<typeof M.editTextResult> = raw === baseRaw ? { state: state.committed, reason: null }
        : M.editTextResult(state.working, docId, raw, { progressDate });
      const next = edit.state;
      const protectedChange = !validateWorkspace(next);
      const invalid = protectedChange || M.raw(M.getDocument(next, docId)) !== raw;
      state = { ...state, raw, working: invalid ? state.working : next, invalid,
        dirty: state.saving || raw !== baseRaw || next !== state.committed,
        progressConflict: !protectedChange && invalid && edit.reason === 'progress-check-conflict' ? edit.progressConflict : undefined,
        error: protectedChange ? '보관·휴지통·복구 문서나 반복 규칙·보류 항목의 원문 표시는 여기서 바꿀 수 없습니다. 해당 줄을 원래대로 되돌리면 일반 할 일과 메모를 계속 편집할 수 있습니다. 입력은 보관 중입니다.'
          : !invalid ? '' : edit.reason === 'identity-ambiguous'
            ? '여러 줄의 변경을 기존 항목과 연결하지 못해 반영하지 않았습니다. 제목 수정과 줄 이동은 나누고, 여러 제목은 한 줄씩 수정해 저장해 주세요. 입력은 그대로 남아 있습니다.'
            : edit.reason === 'invalid-format'
              ? '날짜·진행률·들여쓰기 형식을 확인해 주세요. 입력은 그대로 남아 있습니다.'
              : edit.reason === 'progress-check-conflict'
                ? '진행 기록과 다른 체크 표시로 바꿀 수 없습니다. 체크 표시를 되돌린 뒤 ‘진행 조절’에서 변경해 주세요. 입력은 남아 있습니다.'
              : '입력을 안전하게 반영하지 못했습니다. 변경을 나눠서 다시 시도해 주세요. 입력은 그대로 남아 있습니다.' };
      label = '문서 편집'; groupId = `text:${docId}`; report();
      return !invalid;
    },
    apply(next: TextWorkspaceState, nextLabel: string, schedule?: ProgramTextCommitOptions['privateTaskSchedule']) {
      if (state.invalid || state.saving || !M.validate(next) || !validateWorkspace(next) || next === state.working) return false;
      inputGeneration++;
      state = { ...state, working: next, raw: M.raw(M.getDocument(next, docId)), dirty: true, error: '', progressConflict: undefined };
      label = nextLabel; groupId = undefined; privateTaskSchedule = schedule; report(); return true;
    },
    synchronize(next: TextWorkspaceState) {
      if (state.dirty || state.saving || state.committed === next || programSame(state.committed, next)) return false;
      state = { ...state, committed: next, working: next, raw: M.raw(M.getDocument(next, docId)), error: '', progressConflict: undefined };
      report(); return true;
    },
    acceptConfirmedSave(before: TextWorkspaceState, next: TextWorkspaceState) {
      if (!submitted || !state.dirty || state.saving || state.invalid || inputGeneration !== submitted.generation
        || !programSame(submitted.before, before) || !programSame(submitted.next, next)
        || !programSame(state.working, next) || state.raw !== M.raw(M.getDocument(next, docId))) return false;
      state = { ...state, committed: next, working: next, dirty: false, error: '', progressConflict: undefined };
      submitted = null; report(); return true;
    },
    discard(next: TextWorkspaceState) {
      if (state.saving) return false;
      privateTaskSchedule = undefined;
      submitted = null; inputGeneration++;
      state = { committed: next, working: next, raw: M.raw(M.getDocument(next, docId)), dirty: false, saving: false, invalid: false, error: '' };
      report(); return true;
    },
    save(): Promise<boolean> {
      if (flight) return flight;
      if (state.invalid) return Promise.resolve(false);
      if (!state.dirty) return Promise.resolve(true);
      flight = (async () => {
        while (state.dirty && !state.invalid) {
          const next = state.working, submittedRaw = M.raw(M.getDocument(next, docId));
          const before = state.committed, schedule = privateTaskSchedule;
          const oldIds = new Set([...before.documents, ...before.flows].flatMap(doc => doc.lines.map(line => line.id)));
          const insertedProperty = schedule && [...next.documents, ...next.flows].some(doc => doc.lines.some(line => !oldIds.has(line.id)));
          let confirmation: Promise<TextWorkspaceState | null> | undefined;
          submitted = { before: state.committed, next, generation: inputGeneration };
          state = { ...state, saving: true, error: '', progressConflict: undefined }; report();
          let accepted = false;
          try { accepted = await commit(next, label, { groupId, expectedWorkspace: state.committed,
            ...(schedule ? { privateTaskSchedule: schedule } : {}),
            ...(insertedProperty ? { onPrivateTaskScheduleAcknowledged: (pending: Promise<TextWorkspaceState | null>) => { confirmation = pending; } } : {}) }); } catch { accepted = false; }
          if (!accepted) {
            state = { ...state, saving: false, dirty: true, error: '저장하지 못했습니다. 입력은 남아 있습니다. 다시 저장해 주세요.' };
            report(); return false;
          }
          let committed = next, working = state.working;
          if (confirmation) {
            const authoritative = await confirmation.catch(() => null);
            const comparable = programClone(next);
            const identities = new Map<string, string>();
            let valid = !!authoritative && M.validate(authoritative);
            for (const doc of [...comparable.documents, ...comparable.flows]) {
              const incoming = authoritative && M.getDocument(authoritative, doc.id);
              if (!incoming) { valid = false; break; }
              for (const [index, line] of doc.lines.entries()) if (!oldIds.has(line.id)) {
                const replacement = incoming.lines[index];
                if (!replacement || oldIds.has(replacement.id)) { valid = false; break; }
                identities.set(line.id, replacement.id); line.id = replacement.id;
              }
            }
            if (!valid || !programSame(comparable, authoritative)) {
              state = { ...state, saving: false, dirty: true, error: '저장된 일정의 문맥을 확인하지 못했습니다. 입력은 남아 있습니다.' };
              submitted = null; report(); return false;
            }
            // Change identities only. Newer raw text, selection and its dirty state remain owned by the editor.
            working = programClone(state.working);
            for (const doc of [...working.documents, ...working.flows]) for (const line of doc.lines) line.id = identities.get(line.id) ?? line.id;
            if (!M.validate(working) || M.raw(M.getDocument(working, docId)) !== state.raw) {
              state = { ...state, saving: false, dirty: true, error: '입력을 안전하게 연결하지 못했습니다. 입력은 남아 있습니다.' };
              submitted = null; report(); return false;
            }
            committed = authoritative!;
          }
          const unchanged = state.working === next && state.raw === submittedRaw;
          submitted = null;
          state = { ...state, committed, working, saving: false, dirty: !unchanged };
          report();
        }
        return !state.dirty;
      })().finally(() => { flight = null; });
      return flight;
    },
  };
  return api;
}

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
  if (capture.raw !== state.raw) controller.updateRaw(capture.raw, today());
  return controller.getState().raw === capture.raw;
}

type Panel = { kind: 'insert' | 'progress' | 'date' | 'folder' | 'move' | 'reference' | 'order'; lineId: string | null; folderSuggestionTitle?: string; folderLinkPreview?: ProgramFolderLinkPreview } | null;
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

export function ProgramTextEditor(props: ProgramTextEditorProps) {
  const progressHintId = useId();
  const propsRef = useRef(props); propsRef.current = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ReturnType<typeof nativeEditor.create> | null>(null);
  const draftRef = useRef<ReturnType<typeof createProgramTextDraft> | null>(null);
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
  const [orderPreview, setOrderPreview] = useState<{ plan: DateBlockOrderPlan; before: TextWorkspaceState; epoch: number; selection: DateOrderSelection; scrollTop: number } | null>(null);
  const [inputLocked, setInputLocked] = useState(false);
  const [draft, setDraft] = useState<ProgramTextDraftState>(() => ({ committed: props.workspace, working: props.workspace,
    raw: M.raw(M.getDocument(props.workspace, props.docId)), dirty: false, saving: false, invalid: false, error: '' }));
  const [mode, setMode] = useState<'live' | 'text'>('live');
  const [panel, setPanel] = useState<Panel>(null);
  const [moving, setMoving] = useState<Moving | null>(null);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [percent, setPercent] = useState('0');
  const [folderName, setFolderName] = useState('');
  const [message, setMessage] = useState('');
  const [composing, setComposing] = useState(false);
  const disabled = inputLocked || !!props.readOnly || draft.invalid || draft.saving;

  const currentState = () => draftRef.current?.getState().working ?? propsRef.current.workspace;
  const currentDoc = () => M.getDocument(currentState(), propsRef.current.docId);
  const currentRow = (lineId: string | null) => M.rowMeta(currentState(), propsRef.current.docId).find(row => row.id === lineId);
  const accessFor = (lineId: string | null) => { const row = currentRow(lineId), target = row?.progressTargetId ?? row?.taskId; return target ? propsRef.current.taskAccess?.(target) : undefined; };
  const textArea = () => hostRef.current?.querySelector<HTMLTextAreaElement>('textarea') ?? null;
  const actionsDisabled = () => inputLockedRef.current || !!propsRef.current.readOnly || !!draftRef.current?.getState().invalid || !!draftRef.current?.getState().saving;

  function rememberPosition() {
    if (propsRef.current.folderId) return;
    const textarea = textArea();
    if (!textarea) return;
    const index = textarea.value.slice(0, textarea.selectionStart).split('\n').length - 1;
    const lineId = textarea.selectionStart === textarea.selectionEnd ? currentDoc()?.lines[index]?.id ?? null : null;
    if (suggestionLineRef.current !== lineId) { suggestionLineRef.current = lineId; setSuggestionLineId(lineId); setDismissedSuggestion(''); }
    propsRef.current.onPosition?.({ start: textarea.selectionStart, end: textarea.selectionEnd, scrollTop: textarea.scrollTop }, currentDoc()?.lines[index]?.id ?? null);
  }
  function closePanel() {
    dialogRef.current?.close(); setPanel(null); setMessage(''); setOrderPreview(null);
    editorRef.current?.focus();
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
    const controller = draftRef.current, before = propsRef.current.workspace;
    const saved = await (controller?.save() ?? false);
    // An authoritative account response may rerender during the save. Its new
    // property-row IDs belong to the committed workspace, after input settles.
    if (saved && controller && controller === draftRef.current && propsRef.current.workspace !== before
      && !composingRef.current && !regionPendingRef.current && controller.synchronize(propsRef.current.workspace)) {
      editorRef.current?.setValue(controller.getState().raw, { preserveSelection: true });
    }
    return saved;
  }
  async function saveNow() {
    if (composingRef.current) { setMessage('한글 입력을 마친 뒤 보기 범위를 바꿔 주세요.'); return false; }
    return regionPortRef.current ? regionPortRef.current.flush() : saveFullDraft();
  }
  function captureDraftRaw() {
    return regionPortRef.current?.hasPending() ? regionPortRef.current.captureRaw() || draftRef.current?.getState().raw || ''
      : draftRef.current?.getState().raw ?? textArea()?.value ?? '';
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
    return editorRef.current?.focus(index) === true && textarea.ownerDocument.activeElement === textarea;
  };
  useEffect(() => {
    propsRef.current.onRegisterSave?.(saveNow);
    propsRef.current.onRegisterSourceFocus?.(focusSourceRow);
    propsRef.current.onRegisterDraft?.(captureDraftRaw);
    propsRef.current.onRegisterInputLock?.(locked => {
      // Do not terminate a native IME composition by changing readOnly. Its
      // dirty signal makes the parent flush reject the context change instead.
      if (locked && composingRef.current) return;
      inputLockedRef.current = locked; setInputLocked(locked);
      const textarea = textArea(); if (textarea) textarea.readOnly = locked || !!propsRef.current.readOnly;
      if (locked) { orderEpochRef.current++; cancelMove(); dialogRef.current?.close(); setPanel(null); setOrderPreview(null); }
      editorRef.current?.refresh();
    });
    return () => { propsRef.current.onRegisterSave?.(null); propsRef.current.onRegisterSourceFocus?.(null); propsRef.current.onRegisterInputLock?.(null); propsRef.current.onRegisterDraft?.(null); };
  }, [props.docId]);
  function scheduleSave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void saveNow(); }, 450);
  }
  async function apply(next: TextWorkspaceState, label: string, schedule?: ProgramTextCommitOptions['privateTaskSchedule']) {
    if (actionsDisabled() || !draftRef.current?.apply(next, label, schedule)) { setMessage('이 변경은 적용할 수 없습니다. 현재 내용은 유지했습니다.'); return false; }
    cancelMove();
    orderHistoryRef.current.clear(); orderPositionsRef.current = []; orderEpochRef.current++;
    editorRef.current?.setValue(draftRef.current.getState().raw, { preserveSelection: true });
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
    if (await apply(next, '하위 묶음 이동')) {
      const index = currentDoc()?.lines.findIndex(line => line.id === selection.lineId);
      if (index !== undefined && index >= 0) editorRef.current?.focusControl(index);
    }
  }
  function openProgress(lineId: string | null, kind: 'progress' | 'date' = 'progress') {
    const row = currentRow(lineId);
    if (!row?.progressTargetId) return;
    if (accessFor(lineId)?.reason) { setMessage(''); setPanel({ kind: 'reference', lineId }); return; }
    const progress = M.latestProgress(currentState(), row.progressTargetId);
    setDate(kind === 'date' ? row.date ?? '' : today());
    setTime(row.time ?? row.task?.time ?? '');
    setPercent(String(progress?.percent ?? (row.done ? 100 : 0)));
    setMessage(''); setPanel({ kind, lineId });
  }
  function progressConflictToView() {
    const state = draftRef.current?.getState(), conflict = state?.progressConflict;
    if (!state?.invalid || !conflict || state.saving || inputLockedRef.current || propsRef.current.readOnly
      || composingRef.current || regionPendingRef.current || textArea()?.value !== state.raw) return null;
    const row = currentRow(conflict.lineId);
    if (!row || row.progressTargetId !== conflict.targetId) return null;
    const access = propsRef.current.taskAccess?.(conflict.targetId);
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
  function handleAction(action: nativeEditor.Action) {
    if (action.type === 'move-cancel') { cancelMove(); return; }
    if (actionsDisabled()) return false;
    const lineId = currentDoc()?.lines[action.lineIndex]?.id ?? null;
    if (action.type === 'move-select') { beginMove(lineId, false); return; }
    if (action.type === 'move-drop') { if (action.beforeLineId !== undefined && action.depth !== undefined) void finishMove(action.beforeLineId, action.depth); return; }
    if (action.type === 'progress-open' || action.type === 'toggle') { openProgress(lineId); return; }
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
    const controller = createProgramTextDraft(propsRef.current.workspace, props.docId,
      (...args) => propsRef.current.onCommit(...args), next => {
        if (!alive) return;
        setDraft(next); propsRef.current.onDirtyChange?.(next.dirty || composingRef.current || regionPendingRef.current);
        queueMicrotask(() => { if (alive) editorRef.current?.refresh(); });
      }, next => propsRef.current.validateWorkspace?.(next) ?? true);
    draftRef.current = controller; setDraft(controller.getState());
    propsRef.current.onRegisterConfirmedSave?.((before, next) => {
      if (!alive || composingRef.current || inputLockedRef.current || textArea()?.value !== controller.getState().raw) return false;
      // Confirmation updates state only; preserve the native textarea and its selection/history.
      return controller.acceptConfirmedSave(before, next);
    });
    orderHistoryRef.current = createProgramPermutationHistory(props.docId); orderPositionsRef.current = []; orderEpochRef.current++; pendingOrderRef.current = null;
    movingRef.current = null; setMoving(null); setPanel(null);
    const instance = nativeEditor.create(host, {
      value: controller.getState().raw, label: '문서 내용',
      getRowMeta: () => textEditorRows(controller.getState().working, props.docId),
      isActionDisabled: actionsDisabled,
      canApplyIndent: raw => !actionsDisabled() && M.raw(M.getDocument(M.editText(controller.getState().working, props.docId, raw, { progressDate: today() }), props.docId)) === raw,
      onChange: raw => {
        if (inputLockedRef.current || propsRef.current.readOnly) { editorRef.current?.setValue(controller.getState().raw, { preserveSelection: true }); return; }
        if (raw === controller.getState().raw) { historyTypeRef.current = ''; return; }
        cancelMove();
        orderEpochRef.current++;
        const pending = pendingOrderRef.current;
        const historyType = historyTypeRef.current; historyTypeRef.current = '';
        const restored = orderHistoryRef.current.resolve(controller.getState().working, raw, historyType);
        let accepted = false;
        if (pending) {
          accepted = pending.raw === raw && programSame(pending.before, controller.getState().working) && controller.apply(pending.next, '같은 구간 날짜순 정렬');
          if (accepted) orderHistoryRef.current.record(pending.before, pending.next);
          else controller.rejectRaw(raw);
        } else if (restored) accepted = controller.apply(restored, historyType === 'historyUndo' ? '날짜순 정렬 입력 취소' : '날짜순 정렬 다시 실행');
        else if ((historyType === 'historyUndo' || historyType === 'historyRedo') && orderHistoryRef.current.can(controller.getState().working, historyType)) controller.rejectRaw(raw);
        else accepted = controller.updateRaw(raw, today());
        if (restored && accepted) {
          const position = orderPositionsRef.current.slice().reverse().find(entry => programSame(M.getDocument(entry.state, props.docId), M.getDocument(restored, props.docId)));
          if (position) queueMicrotask(() => { const area = textArea(); if (area && area.value === raw) { area.setSelectionRange(position.selection.start, position.selection.end, position.selection.direction); area.scrollTop = position.scrollTop; rememberPosition(); } });
        }
        if (accepted) scheduleSave();
        else if (timerRef.current) clearTimeout(timerRef.current);
        rememberPosition();
      },
      onAction: handleAction,
    });
    editorRef.current = instance;
    const textarea = host.querySelector<HTMLTextAreaElement>('textarea');
    const compositionStart = () => { composingRef.current = true; setComposing(true); orderEpochRef.current++; setOrderPreview(null); propsRef.current.onDirtyChange?.(true); };
    const compositionEnd = () => { composingRef.current = false; setComposing(false); };
    host.addEventListener('compositionstart', compositionStart, true);
    host.addEventListener('compositionend', compositionEnd, true);
    const preventLockedInput = (event: Event) => {
      const type = (event as InputEvent).inputType;
      if ((inputLockedRef.current || (controller.getState().saving && (type === 'historyUndo' || type === 'historyRedo'))) && !composingRef.current) { event.preventDefault(); event.stopImmediatePropagation(); }
      if (!event.defaultPrevented && !composingRef.current && textarea && propsRef.current.validateWorkspace && !type?.startsWith('history')) {
        let start = textarea.selectionStart, end = textarea.selectionEnd, insert: string | null = null;
        if (type === 'insertText' || type === 'insertFromPaste') insert = (event as InputEvent).data;
        else if (type === 'insertParagraph' || type === 'insertLineBreak') insert = '\n';
        else if (type === 'deleteContentBackward') { insert = ''; if (start === end) start = Math.max(0, start - 1); }
        else if (type === 'deleteContentForward') { insert = ''; if (start === end) end = Math.min(textarea.value.length, end + 1); }
        if (insert !== null) {
          const candidate = M.editText(controller.getState().working, props.docId, textarea.value.slice(0, start) + insert + textarea.value.slice(end), { progressDate: today() });
          if (!propsRef.current.validateWorkspace(candidate)) {
            event.preventDefault(); event.stopImmediatePropagation();
            const index = textarea.value.slice(0, textarea.selectionStart).split('\n').length - 1;
            setMessage(programTextProtectionMessage(accessFor(currentDoc()?.lines[index]?.id ?? null)));
          }
        }
      }
    };
    const observeInput = (event: Event) => { historyTypeRef.current = (event as InputEvent).inputType || historyTypeRef.current; };
    if (textarea) {
      textarea.id = `program-text-${encodeURIComponent(props.docId)}`;
      textarea.readOnly = inputLockedRef.current || !!propsRef.current.readOnly;
      const position = propsRef.current.initialPosition;
      if (position) {
        textarea.setSelectionRange(Math.min(position.start, textarea.value.length), Math.min(position.end, textarea.value.length));
        textarea.scrollTop = position.scrollTop;
      }
      for (const event of ['select', 'scroll', 'keyup', 'click', 'blur']) textarea.addEventListener(event, rememberPosition);
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
      textarea?.removeEventListener('beforeinput', preventLockedInput, true);
      textarea?.removeEventListener('input', observeInput, true);
      instance.destroy(); editorRef.current = null; draftRef.current = null;
    };
    // Keep the same native textarea through every edit, failed save and parent rerender.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.docId]);

  useEffect(() => {
    if (!regionPendingRef.current && draftRef.current?.synchronize(props.workspace)) {
      orderEpochRef.current++; orderHistoryRef.current.clear(); orderPositionsRef.current = [];
      editorRef.current?.setValue(draftRef.current.getState().raw, { preserveSelection: true });
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
    if (panel && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [panel]);

  // Keep the native install/sync lifecycle intact; observe layout after it mounts.
  useEffect(() => {
    const host = hostRef.current, shell = host?.closest('main');
    if (!host || !shell) return;
    const view = host.ownerDocument.defaultView;
    if (!view) return;
    const visual = view.visualViewport;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!host.getClientRects().length) return;
      let bottom = Math.min(view.innerHeight, visual ? visual.offsetTop + visual.height : view.innerHeight);
      const nav = shell.querySelector<HTMLElement>('nav[aria-label="기본 이동"]');
      if (nav && view.getComputedStyle(nav).position === 'fixed') bottom = Math.min(bottom, nav.getBoundingClientRect().top);
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
    mutation.observe(shell, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'open'] });
    view.addEventListener('resize', schedule); view.addEventListener('scroll', schedule, { passive: true });
    visual?.addEventListener('resize', schedule); visual?.addEventListener('scroll', schedule);
    schedule();
    return () => { observer.disconnect(); mutation.disconnect(); view.cancelAnimationFrame(frame);
      view.removeEventListener('resize', schedule); view.removeEventListener('scroll', schedule);
      visual?.removeEventListener('resize', schedule); visual?.removeEventListener('scroll', schedule); };
  }, []);

  const row = panel ? currentRow(panel.lineId) : undefined;
  const creationLocation = panel?.kind === 'folder' ? programFolderCreationLocation(draft.working, props.docId, panel.lineId) : null;
  const panelAccess = panel ? accessFor(panel.lineId) : undefined;
  const protectedExecutionPanel = !!panelAccess?.reason && !!panel && ['progress', 'date'].includes(panel.kind);
  const insertions = panel?.lineId ? M.insertionOptions(draft.working, props.docId, panel.lineId) : [];
  const memoContext = panel?.kind === 'insert' ? readProgramMemoContext(draft.working, props.docId, panel.lineId) : null;
  const dateContext = panel?.kind === 'date' && !protectedExecutionPanel && row?.progressTargetId
    ? readProgramTaskDatePresentation(draft.working, { id: row.progressTargetId, docId: props.docId }) : null;
  const dateChangeHint = programTaskDateChangeHint(dateContext, date, {
    current: row?.task?.time ?? row?.time ?? '', draft: time,
  });
  function insertNative(offset: number, text: string, caret: number) {
    if (actionsDisabled()) return;
    closePanel();
    if (!editorRef.current?.replaceRange(offset, offset, text, { selectionAfter: { start: caret, end: caret } })) setMessage('브라우저가 입력을 적용하지 못했습니다. 본문에서 직접 입력할 수 있습니다.');
  }
  function scopeSlot(lineId: string | null) {
    let state = currentState();
    const doc = M.getDocument(state, propsRef.current.docId);
    if (!doc) return null;
    const selected = currentRow(lineId);
    if (selected && /^ *-\s*$/.test(selected.text)) return { state, index: selected.index, lineId: selected.id };
    const index = selected?.subtreeEndIndex ?? doc.lines.length;
    const depth = selected?.kind === 'scope' ? selected.depth + 1 : selected?.kind === 'date' ? 0 : selected?.depth ?? 0;
    const lines = doc.lines.map(line => line.text);
    lines.splice(index, 0, `${'  '.repeat(depth)}- `);
    state = M.editText(state, doc.id, lines.join('\n'), { progressDate: today() });
    const inserted = M.getDocument(state, doc.id)?.lines[index];
    if (!inserted || !/^ *-\s*$/.test(inserted.text)) return null;
    return { state, index, lineId: inserted.id };
  }
  async function connectFlow(lineId: string | null) {
    if (!propsRef.current.onConnectFlow) return;
    const slot = scopeSlot(lineId);
    if (!slot) { setMessage('이 위치에는 연결할 수 없습니다.'); return; }
    closePanel();
    const ready = slot.state === currentState() ? await saveNow() : await apply(slot.state, 'Flow 연결 위치');
    if (ready) propsRef.current.onConnectFlow(propsRef.current.docId, slot.lineId);
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
    const next = linkProgramFolder(state, props.docId, panel?.lineId ?? null, scopeId ? { scopeId } : { title: folderName });
    if (next === state) { setMessage('같은 이름·위치·폴더 연결을 확인해 주세요.'); return; }
    if (panel?.folderSuggestionTitle !== undefined && !programFolderSuggestionPreservesSource(state, next)) {
      setMessage('원문을 바꾸는 연결은 적용하지 않았습니다. 현재 입력을 유지했습니다.'); return;
    }
    closePanel(); await apply(next, scopeId ? '폴더 연결' : '새 폴더');
  }
  function openFolderPanel(lineId: string | null, suggestionTitle?: string) {
    if (actionsDisabled() || composingRef.current) return;
    const preview = programFolderLinkPreview(currentState(), propsRef.current.docId, lineId, suggestionTitle === undefined ? 'direct' : 'proposal');
    if (!preview) { setMessage('이 위치에는 폴더를 연결할 수 없습니다.'); return; }
    setFolderName(suggestionTitle ?? programFolderLineTitle(currentState(), propsRef.current.docId, lineId) ?? '');
    setMessage(''); setPanel({ kind: 'folder', lineId, folderSuggestionTitle: suggestionTitle, folderLinkPreview: preview });
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
    const next = M.recordProgress(currentState(), target, date, parsed.percent);
    if (next === currentState()) { closePanel(); return; }
    closePanel(); await apply(next, '날짜별 누적 진행');
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

  const title = protectedExecutionPanel ? '연결된 항목' : panel?.kind === 'order' ? '같은 구간 날짜순 정렬' : panel?.kind === 'progress' ? '누적 진행률' : panel?.kind === 'date' ? '항목 날짜' : panel?.kind === 'folder' ? '폴더 연결' : panel?.kind === 'move' ? '이동할 위치' : panel?.kind === 'reference' ? '연결된 항목' : '이 위치에 추가';
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
    await apply(next, '기존 폴더 연결');
  }
  function createSuggestion() {
    const current = currentSuggestion();
    if (!current || current.folders.length) return;
    openFolderPanel(current.lineId, current.title);
  }
  const progressConflict = progressConflictToView();
  return <section className={styles.editor} aria-label="개인 문서 편집" data-dirty={draft.dirty ? 'true' : 'false'} onKeyDownCapture={event => {
    if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase()) && (inputLockedRef.current || draftRef.current?.getState().saving)) { event.preventDefault(); event.stopPropagation(); }
    if (event.key === 'Escape' && (panel || movingRef.current)) { event.preventDefault(); event.stopPropagation(); closePanel(); cancelMove(); }
    else if (event.key === 'Escape' && suggestion && !event.nativeEvent?.isComposing && !composingRef.current) { event.preventDefault(); event.stopPropagation(); setDismissedSuggestion(suggestionKey); }
  }}>
    <div className={styles.toolbar}>
      {mode === 'text' && <button type="button" onClick={event => returnToDocumentMode(event.currentTarget)}>문서로 돌아가기</button>}
      <button type="button" hidden={!!props.folderId || props.directWriting} disabled={disabled} onClick={() => { const index = editorRef.current?.getSelection().lineIndex ?? 0; setPanel({ kind: 'insert', lineId: currentDoc()?.lines[index]?.id ?? null }); }}>＋ 추가</button>
      <button type="button" disabled={inputLocked || !!props.readOnly || draft.saving || !!props.folderId && draft.dirty && !regionPending} title={props.folderId && draft.dirty ? '저장되지 않은 입력은 저장본으로 되돌리기에서 취소할 수 있습니다.' : '입력 되돌리기'} aria-label="입력 되돌리기" onClick={() => { if (props.folderId && regionPending) regionPortRef.current?.undo?.(); else if (orderHistoryRef.current.hasEntries()) nativeHistory('historyUndo'); else if (props.onUndo && !draft.dirty) void props.onUndo(); else if (!props.folderId) editorRef.current?.undo(); }}>↶</button>
      <details className={styles.editorTools} onKeyDown={event => {
        if (event.key !== 'Escape' || event.nativeEvent.isComposing || !event.currentTarget.open) return;
        event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus();
      }}>
        <summary aria-label="편집 도구" title="편집 도구"><span aria-hidden="true">…</span></summary>
        <div className={styles.editorToolActions}>
          <button type="button" aria-pressed={mode === 'text'} disabled={inputLocked || composing} onClick={event => { if (composingRef.current || inputLockedRef.current) return; closeEditorTools(event.currentTarget); setMode(mode === 'text' ? 'live' : 'text'); }}>원문 {mode === 'text' ? '닫기' : '보기'}</button>
          {props.directWriting && <button type="button" disabled={disabled} onClick={event => { closeEditorTools(event.currentTarget); const index = editorRef.current?.getSelection().lineIndex ?? 0; setPanel({ kind: 'insert', lineId: currentDoc()?.lines[index]?.id ?? null }); }}>현재 줄에 추가</button>}
          <button type="button" hidden={!!props.folderId} disabled={disabled || draft.dirty} onClick={event => { closeEditorTools(event.currentTarget); previewOrder(); }}>날짜순 정렬</button>
          {(props.onRedo || orderHistoryRef.current.hasEntries()) && <button type="button" hidden={!!props.folderId} disabled={disabled || draft.dirty} aria-label="다시 실행" onClick={event => { closeEditorTools(event.currentTarget); if (orderHistoryRef.current.hasEntries()) nativeHistory('historyRedo'); else void props.onRedo?.(); }}>다시 실행</button>}
        </div>
      </details>
      <span className={styles.status} role="status" aria-live="polite">{props.readOnly ? props.disabledReason || '읽기 전용' : inputLocked ? '변경을 마치는 중… 입력을 잠시 보호합니다.' : draft.saving ? '저장 중…' : draft.error ? '저장되지 않은 입력' : draft.dirty || !!props.folderId && regionPending ? '편집 중' : '저장됨'}</span>
    </div>
    {draft.error && <div className={styles.error} role="alert"><p>{draft.error}</p><div>
      {progressConflict && <button type="button" onClick={showProgressConflict}>진행 조절 보기</button>}
      <button type="button" disabled={!!props.readOnly || draft.invalid || draft.saving} onClick={() => { void saveNow(); }}>다시 저장</button>
      <button type="button" onClick={downloadDraft}>입력한 원문 받기</button>
      <button type="button" disabled={inputLocked || draft.saving} onClick={() => { if (draftRef.current?.discard(propsRef.current.workspace)) { orderHistoryRef.current.clear(); orderPositionsRef.current = []; orderEpochRef.current++; editorRef.current?.setValue(draftRef.current.getState().raw, { preserveSelection: true }); } }}>저장본으로 되돌리기</button>
    </div></div>}
    {moving && <div className={styles.moveNotice} role="status"><span>{moving.label} · 하위 {moving.descendantCount}줄</span><button type="button" onClick={() => setPanel({ kind: 'move', lineId: moving.lineId })}>위치 선택</button><button type="button" onClick={cancelMove}>이동 취소</button></div>}
    {message && !panel && <p className={styles.message} role="status">{message}</p>}
    {suggestion && <div className={regionStyles.actions} role="region" aria-label="폴더 연결 제안">{suggestion.folders.length > 0
      ? suggestion.folders.map(entry => <button type="button" key={entry.id} disabled={disabled} onClick={() => { void chooseSuggestion(entry.id); }}>{entry.path} 연결</button>)
      : <button type="button" disabled={disabled} onClick={createSuggestion}>새 폴더로 연결…</button>}<button type="button" onClick={() => setDismissedSuggestion(suggestionKey)}>제안 닫기</button></div>}
    {props.folderId && <div className={regionStyles.actions} aria-label="문서 조회 범위"><p>{folderView?.folderPath ?? '선택한 폴더'} · 현재 문서 · 하위 폴더 포함</p>
      <button type="button" disabled={inputLocked || !!props.readOnly || draft.saving || composingRef.current} onClick={props.onContinueWholeDocument ? continueWholeDocument : props.onShowWholeDocument}>전체 문서 보기</button><button type="button" onClick={props.onShowFolderTasks}>폴더 전체 할 일</button>
      {!folderView?.regions.length && <p>현재 문서에는 이 폴더의 연결 영역이나 할 일이 없습니다.</p>}
    </div>}
    <div ref={hostRef} className={`${styles.host}${props.directWriting ? ` ${styles.directWriting}` : ''}`} hidden={!!props.folderId} data-native-editor="v11-core" />
    {folderView && <ProgramFolderRegionEditor key={`${props.docId}:${props.folderId}`} styles={regionStyles} view={folderView} readOnly={!!props.readOnly} locked={inputLocked || draft.saving} mode={mode}
      workspace={currentState} onAccept={acceptRegion} onPersist={saveFullDraft} onDownload={downloadDraft}
      onContinueWholeDocument={continueWholeDocument}
      onPosition={(start, end, lineId) => { regionPositionRef.current = { start, end }; propsRef.current.onPosition?.({ start, end, scrollTop: 0 }, lineId); }}
      onRegister={port => { regionPortRef.current = port; }}
      onPending={(pending, composing) => { regionPendingRef.current = pending; composingRef.current = composing; setRegionPending(pending); propsRef.current.onDirtyChange?.(pending || !!draftRef.current?.getState().dirty); }} />}
    {panel && <dialog ref={dialogRef} className={styles.dialog} aria-label={title} onKeyDown={event => { trapProgramDialogTab(event.currentTarget, event); }} onCancel={event => { event.preventDefault(); closePanel(); cancelMove(); }}>
      <header><h3>{title}</h3><button type="button" aria-label="닫기" onClick={closePanel}>×</button></header>
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
        <section className={styles.menuSection} aria-label="추가·연결"><h4>추가·연결</h4>
        {insertions.map(option => <button type="button" key={`${option.kind}:${option.offset}:${option.depth}`} onClick={() => insertNative(option.offset, option.text, option.caretOffset)}>{option.label}<small>{option.relation}</small></button>)}
        {!currentDoc()?.lines.length && <><button type="button" onClick={() => insertNative(0, '- [ ] ', 6)}>할 일</button><button type="button" onClick={() => { closePanel(); editorRef.current?.focus(); }}>자유 메모</button></>}
        <button type="button" onClick={insertDateSection}>날짜 구획 · 문서 끝에</button>
        <button type="button" onClick={() => openFolderPanel(panel.lineId)}>폴더 연결</button>
        {row?.isReference && panelAccess?.documentId && panelAccess.lineId === (row.progressTargetId ?? row.taskId) && !panelAccess.reason && <button type="button" disabled={disabled} onClick={() => {
          const current = currentRow(panel.lineId), access = accessFor(panel.lineId);
          if (actionsDisabled() || composingRef.current || !current?.isReference || !access?.documentId || access.lineId !== (current.progressTargetId ?? current.taskId)) return;
          setPanel({ kind: 'reference', lineId: panel.lineId });
        }}>연결된 항목 보기</button>}
        {props.onConnectFlow && <button type="button" onClick={() => { void connectFlow(panel.lineId); }}>Flow 연결</button>}
        </section>
        {row && <section className={styles.menuSection} aria-label="선택 항목 문서 구조"><h4>문서 구조</h4>
        {row && ['task', 'subcheck', 'scope'].includes(row.kind) && <button type="button" onClick={() => beginMove(panel.lineId, true)}>하위 묶음 이동</button>}
        {row && <><button type="button" onClick={() => { closePanel(); editorRef.current?.focus(row.index); editorRef.current?.indent(false); }}>들여쓰기</button><button type="button" onClick={() => { closePanel(); editorRef.current?.focus(row.index); editorRef.current?.indent(true); }}>내어쓰기</button><button type="button" onClick={() => { closePanel(); editorRef.current?.toggleFold(row.index); }}>하위 내용 접기 / 펼치기</button></>}
        </section>}
      </div>}
      {panel.kind === 'progress' && !protectedExecutionPanel && <form onSubmit={event => { event.preventDefault(); void applyProgress(); }}>
        <p>{row?.title || row?.task?.title}</p><label>기록 날짜<input type="date" required value={date} onChange={event => setDate(event.target.value)} /></label>
        <label>그날까지의 누적 진행률<input inputMode="decimal" required value={percent} onChange={event => setPercent(event.target.value)} aria-describedby={progressHintId} /></label>
        <small id={progressHintId}>20, 20%, 0.2는 20%입니다. 날짜별 값을 더하지 않습니다.</small>
        <div className={styles.quickProgress}>{[0, 20, 50, 100].map(value => <button type="button" key={value} onClick={() => setPercent(String(value))}>{value}%</button>)}</div>
        <button type="submit" disabled={disabled}>진행 저장</button>
        {row?.progressTargetId && M.progressHistory(draft.working, row.progressTargetId).length > 0 && <details><summary>날짜별 기록</summary><div className={styles.choices}>{M.progressHistory(draft.working, row.progressTargetId).map(record => <button type="button" key={record.date} onClick={() => { setDate(record.date); setPercent(String(record.percent)); }}>{record.date}<span>{record.percent}%</span></button>)}</div></details>}
      </form>}
      {panel.kind === 'date' && !protectedExecutionPanel && <form onSubmit={event => { event.preventDefault(); void applyDate(); }}><p className={styles.dateTarget}>{row?.title || row?.task?.title}</p>
        {dateContext && <p className={styles.contextHint} aria-label="날짜 출처">{dateContext.label}{dateContext.context && <small>{dateContext.context}</small>}</p>}
        <label>실행 날짜<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label><label>시간<input type="time" step={60} value={time} onChange={event => setTime(event.target.value)} /></label>
        {dateChangeHint && <p className={styles.contextHint} role="status">{dateChangeHint}</p>}
        <button type="button" onClick={() => setDate('')}>날짜 미정</button><button type="submit" disabled={disabled}>날짜·시간 적용</button></form>}
      {panel.kind === 'folder' && <><div className={styles.folderPreview} aria-label="폴더 연결 위치"><strong>{panel.folderLinkPreview?.locationLabel}</strong>{panel.folderLinkPreview?.source && <small>기준 줄: {panel.folderLinkPreview.source.text || '빈 줄'}</small>}{panel.folderLinkPreview?.destination.relation !== 'same-line' && <small>기존 내용과 하위 항목은 그대로 둡니다.</small>}</div><div className={styles.choices}>{M.scopes(draft.working).filter(scope => scope.kind === 'folder').map(scope => <button type="button" key={scope.id} disabled={disabled} onClick={() => { void attachFolder(scope.id); }}>{programFolderPath(draft.working, scope.id)}</button>)}</div><form onSubmit={event => { event.preventDefault(); void attachFolder(null); }}>{creationLocation !== null && <small>생성 위치: {creationLocation}</small>}<label>새 폴더 이름<input value={folderName} maxLength={100} onChange={event => setFolderName(event.target.value)} /></label><button type="submit" disabled={!folderName.trim() || disabled}>만들어 연결</button></form></>}
      {panel.kind === 'move' && <div className={styles.choices}>{moving?.targets.map(target => <button type="button" key={target.targetKey} onClick={() => { void finishMove(target.beforeLineId, target.depth); }}>{target.label}<small>깊이 {target.depth}</small></button>)}</div>}
      {(panel.kind === 'reference' || protectedExecutionPanel) && <ProgramReferencePanel access={panelAccess} title={row?.task?.title || row?.title || '연결된 항목'} date={row?.date ?? null}
        history={row?.progressTargetId ? M.progressHistory(draft.working, row.progressTargetId) : []}
        onProgress={() => openProgress(panel.lineId)} onDate={() => openProgress(panel.lineId, 'date')}
        onOrigin={props.onOpenTaskOrigin ? () => { const access = accessFor(panel.lineId); if (!access?.documentId) return; closePanel(); void saveNow().then(saved => { if (saved) propsRef.current.onOpenTaskOrigin?.(access.documentId!, access.lineId); }); } : undefined}
        onUnlink={row?.isReference && !props.readOnly ? () => { const lineId = panel.lineId; closePanel(); if (lineId) void apply(M.unlink(currentState(), props.docId, lineId), '항목 연결 해제'); } : undefined} />}
    </dialog>}
  </section>;
}

export default ProgramTextEditor;
