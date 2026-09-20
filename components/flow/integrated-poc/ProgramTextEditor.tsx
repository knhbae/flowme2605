'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import nativeEditor from '@/lib/flow/integrated-poc/vendor/text-editor.cjs';
import { textEditorRows, textWorkspaceModel as M, type TextMoveSelection, type TextMoveTarget, type TextWorkspaceState } from '@/lib/flow/integrated-poc/text-workspace';
import '@/lib/flow/integrated-poc/vendor/text-editor.css';
import styles from './ProgramTextEditor.module.css';
import { planProgramDateBlockOrder, type DateBlockOrderPlan, type DateOrderSelection } from '@/lib/flow/integrated-poc/date-block-order';
import { applyProgramLinePermutation, createProgramPermutationHistory } from '@/lib/flow/integrated-poc/line-permutation';
import { programSame } from '@/lib/flow/integrated-poc/controller';
import type { ProgramReferenceAccess } from '@/lib/flow/integrated-poc/reference-execution-guard';

export interface ProgramTextPosition { start: number; end: number; scrollTop: number }
export interface ProgramTextEditorProps {
  docId: string;
  workspace: TextWorkspaceState;
  onCommit: (next: TextWorkspaceState, label: string, options?: { groupId?: string; expectedWorkspace?: TextWorkspaceState }) => Promise<boolean>;
  onPosition?: (selection: ProgramTextPosition, lineId: string | null) => void;
  initialPosition?: ProgramTextPosition;
  onOpenScope?: (scopeId: string) => void;
  taskAccess?: (taskId: string) => ProgramReferenceAccess;
  onOpenTaskOrigin?: (documentId: string, lineId: string) => void;
  onConnectFlow?: (docId: string, lineId: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterSave?: (save: (() => Promise<boolean>) | null) => void;
  onRegisterInputLock?: (lock: ((locked: boolean) => void) | null) => void;
  onRegisterDraft?: (read: (() => string) | null) => void;
  onUndo?: () => void | Promise<void>;
  onRedo?: () => void | Promise<void>;
  readOnly?: boolean;
  disabledReason?: string;
  validateWorkspace?: (next: TextWorkspaceState) => boolean;
}

export interface ProgramTextDraftState {
  committed: TextWorkspaceState;
  working: TextWorkspaceState;
  raw: string;
  dirty: boolean;
  saving: boolean;
  invalid: boolean;
  error: string;
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
  const report = () => notify({ ...state });
  const api = {
    getState: () => state,
    rejectRaw(raw: string) {
      state = { ...state, raw, invalid: true, dirty: true, error: '문서 문맥이 바뀌어 순서를 반영하지 않았습니다. 입력은 남아 있습니다.' }; report();
    },
    updateRaw(raw: string, progressDate: string) {
      const baseRaw = M.raw(M.getDocument(state.committed, docId));
      const next = raw === baseRaw ? state.committed : M.editText(state.working, docId, raw, { progressDate });
      const protectedChange = !validateWorkspace(next);
      const invalid = protectedChange || M.raw(M.getDocument(next, docId)) !== raw;
      state = { ...state, raw, working: invalid ? state.working : next, invalid,
        dirty: state.saving || raw !== baseRaw || next !== state.committed,
        error: protectedChange ? '보관·휴지통·복구 문서나 반복 규칙·보류 항목의 원문 표시는 여기서 바꿀 수 없습니다. 해당 줄을 원래대로 되돌리면 일반 할 일과 메모를 계속 편집할 수 있습니다. 입력은 보관 중입니다.' : invalid ? '아직 반영할 수 없는 입력입니다. 날짜·진행률·들여쓰기를 확인해 주세요. 입력은 그대로 남아 있습니다.' : '' };
      label = '문서 편집'; groupId = `text:${docId}`; report();
      return !invalid;
    },
    apply(next: TextWorkspaceState, nextLabel: string) {
      if (state.invalid || state.saving || !M.validate(next) || !validateWorkspace(next) || next === state.working) return false;
      state = { ...state, working: next, raw: M.raw(M.getDocument(next, docId)), dirty: true, error: '' };
      label = nextLabel; groupId = undefined; report(); return true;
    },
    synchronize(next: TextWorkspaceState) {
      if (state.dirty || state.saving || state.committed === next || programSame(state.committed, next)) return false;
      state = { ...state, committed: next, working: next, raw: M.raw(M.getDocument(next, docId)), error: '' };
      report(); return true;
    },
    discard(next: TextWorkspaceState) {
      if (state.saving) return false;
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
          state = { ...state, saving: true, error: '' }; report();
          let accepted = false;
          try { accepted = await commit(next, label, { groupId, expectedWorkspace: state.committed }); } catch { accepted = false; }
          if (!accepted) {
            state = { ...state, saving: false, dirty: true, error: '저장하지 못했습니다. 입력은 남아 있습니다. 다시 저장해 주세요.' };
            report(); return false;
          }
          const unchanged = state.working === next && state.raw === submittedRaw;
          state = { ...state, committed: next, saving: false, dirty: !unchanged };
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

type Panel = { kind: 'insert' | 'progress' | 'date' | 'folder' | 'move' | 'reference' | 'order'; lineId: string | null } | null;
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
  const [percent, setPercent] = useState('0');
  const [folderName, setFolderName] = useState('');
  const [message, setMessage] = useState('');
  const disabled = inputLocked || !!props.readOnly || draft.invalid || draft.saving;

  const currentState = () => draftRef.current?.getState().working ?? propsRef.current.workspace;
  const currentDoc = () => M.getDocument(currentState(), propsRef.current.docId);
  const currentRow = (lineId: string | null) => M.rowMeta(currentState(), propsRef.current.docId).find(row => row.id === lineId);
  const accessFor = (lineId: string | null) => { const row = currentRow(lineId), target = row?.progressTargetId ?? row?.taskId; return target ? propsRef.current.taskAccess?.(target) : undefined; };
  const textArea = () => hostRef.current?.querySelector<HTMLTextAreaElement>('textarea') ?? null;
  const actionsDisabled = () => inputLockedRef.current || !!propsRef.current.readOnly || !!draftRef.current?.getState().invalid || !!draftRef.current?.getState().saving;

  function rememberPosition() {
    const textarea = textArea();
    if (!textarea) return;
    const index = textarea.value.slice(0, textarea.selectionStart).split('\n').length - 1;
    propsRef.current.onPosition?.({ start: textarea.selectionStart, end: textarea.selectionEnd, scrollTop: textarea.scrollTop }, currentDoc()?.lines[index]?.id ?? null);
  }
  function closePanel() {
    dialogRef.current?.close(); setPanel(null); setMessage(''); setOrderPreview(null);
    editorRef.current?.focus();
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
  async function saveNow() {
    if (composingRef.current) return false;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (propsRef.current.readOnly) return false;
    return draftRef.current?.save() ?? false;
  }
  useEffect(() => {
    propsRef.current.onRegisterSave?.(saveNow);
    propsRef.current.onRegisterDraft?.(() => textArea()?.value ?? draftRef.current?.getState().raw ?? '');
    propsRef.current.onRegisterInputLock?.(locked => {
      // Do not terminate a native IME composition by changing readOnly. Its
      // dirty signal makes the parent flush reject the context change instead.
      if (locked && composingRef.current) return;
      inputLockedRef.current = locked; setInputLocked(locked);
      const textarea = textArea(); if (textarea) textarea.readOnly = locked || !!propsRef.current.readOnly;
      if (locked) { orderEpochRef.current++; cancelMove(); dialogRef.current?.close(); setPanel(null); setOrderPreview(null); }
      editorRef.current?.refresh();
    });
    return () => { propsRef.current.onRegisterSave?.(null); propsRef.current.onRegisterInputLock?.(null); propsRef.current.onRegisterDraft?.(null); };
  }, [props.docId]);
  function scheduleSave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void saveNow(); }, 450);
  }
  async function apply(next: TextWorkspaceState, label: string) {
    if (actionsDisabled() || !draftRef.current?.apply(next, label)) { setMessage('이 변경은 적용할 수 없습니다. 현재 내용은 유지했습니다.'); return false; }
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
    setPercent(String(progress?.percent ?? (row.done ? 100 : 0)));
    setMessage(''); setPanel({ kind, lineId });
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
    if (action.type === 'scope-picker') { setFolderName(''); setPanel({ kind: 'folder', lineId }); return; }
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
        setDraft(next); propsRef.current.onDirtyChange?.(next.dirty || composingRef.current);
        queueMicrotask(() => { if (alive) editorRef.current?.refresh(); });
      }, next => propsRef.current.validateWorkspace?.(next) ?? true);
    draftRef.current = controller; setDraft(controller.getState());
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
    const compositionStart = () => { composingRef.current = true; orderEpochRef.current++; setOrderPreview(null); propsRef.current.onDirtyChange?.(true); };
    const compositionEnd = () => { composingRef.current = false; };
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
      if (!controller.getState().dirty && !composingRef.current) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnOnExit);
    return () => {
      alive = false; rememberPosition();
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
    if (draftRef.current?.synchronize(props.workspace)) {
      orderEpochRef.current++; orderHistoryRef.current.clear(); orderPositionsRef.current = [];
      editorRef.current?.setValue(draftRef.current.getState().raw, { preserveSelection: true });
    }
  }, [props.workspace]);
  useEffect(() => {
    const textarea = textArea(); if (textarea) textarea.readOnly = inputLockedRef.current || !!props.readOnly;
    editorRef.current?.refresh();
  }, [props.readOnly]);
  useEffect(() => { editorRef.current?.setMode(mode); }, [mode, props.docId]);
  useEffect(() => {
    if (panel && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [panel]);

  const row = panel ? currentRow(panel.lineId) : undefined;
  const panelAccess = panel ? accessFor(panel.lineId) : undefined;
  const protectedExecutionPanel = !!panelAccess?.reason && !!panel && ['progress', 'date'].includes(panel.kind);
  const insertions = panel?.lineId ? M.insertionOptions(draft.working, props.docId, panel.lineId) : [];
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
    const slot = scopeSlot(panel?.lineId ?? null);
    if (!slot) return;
    const next = scopeId ? M.attachScope(slot.state, props.docId, slot.index, scopeId) : M.createFolderAt(slot.state, props.docId, slot.index, folderName.trim());
    if (next === slot.state) { setMessage('같은 이름·위치·폴더 연결을 확인해 주세요.'); return; }
    closePanel(); await apply(next, scopeId ? '폴더 연결' : '새 폴더');
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
    if (accessFor(panel?.lineId ?? null)?.reason) { setPanel({ kind: 'reference', lineId: panel?.lineId ?? null }); return; }
    const target = currentRow(panel?.lineId ?? null)?.progressTargetId;
    if (!target) return;
    const next = M.updateTask(currentState(), target, { date: date || null });
    if (next === currentState()) { closePanel(); return; }
    closePanel(); await apply(next, '항목 날짜');
  }
  function downloadDraft() {
    const blob = new Blob([draftRef.current?.getState().raw ?? draft.raw], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${M.getDocument(props.workspace, props.docId)?.title || '문서'}.txt`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const title = protectedExecutionPanel ? '연결된 항목' : panel?.kind === 'order' ? '같은 구간 날짜순 정렬' : panel?.kind === 'progress' ? '누적 진행률' : panel?.kind === 'date' ? '항목 날짜' : panel?.kind === 'folder' ? '폴더 연결' : panel?.kind === 'move' ? '이동할 위치' : panel?.kind === 'reference' ? '연결된 항목' : '이 위치에 추가';
  return <section className={styles.editor} aria-label="개인 문서 편집" data-dirty={draft.dirty ? 'true' : 'false'} onKeyDownCapture={event => {
    if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase()) && (inputLockedRef.current || draftRef.current?.getState().saving)) { event.preventDefault(); event.stopPropagation(); }
    if (event.key === 'Escape' && (panel || movingRef.current)) { event.preventDefault(); event.stopPropagation(); closePanel(); cancelMove(); }
  }}>
    <div className={styles.toolbar}>
      <div className={styles.mode} aria-label="문서 표시 방식">
        <button type="button" aria-pressed={mode === 'live'} onClick={() => setMode('live')}>문서</button>
        <button type="button" aria-pressed={mode === 'text'} onClick={() => setMode('text')}>원문</button>
      </div>
      <button type="button" disabled={disabled} onClick={() => { const index = editorRef.current?.getSelection().lineIndex ?? 0; setPanel({ kind: 'insert', lineId: currentDoc()?.lines[index]?.id ?? null }); }}>＋ 추가</button>
      <button type="button" disabled={disabled || draft.dirty} onClick={() => previewOrder()}>날짜순 정렬</button>
      <button type="button" disabled={inputLocked || !!props.readOnly || draft.saving} aria-label="입력 되돌리기" onClick={() => { if (orderHistoryRef.current.hasEntries()) nativeHistory('historyUndo'); else if (props.onUndo && !draft.dirty) void props.onUndo(); else editorRef.current?.undo(); }}>↶</button>
      {(props.onRedo || orderHistoryRef.current.hasEntries()) && <button type="button" disabled={disabled || draft.dirty} aria-label="다시 실행" onClick={() => { if (orderHistoryRef.current.hasEntries()) nativeHistory('historyRedo'); else void props.onRedo?.(); }}>↷</button>}
      <span className={styles.status} role="status" aria-live="polite">{props.readOnly ? props.disabledReason || '읽기 전용' : inputLocked ? '변경을 마치는 중… 입력을 잠시 보호합니다.' : draft.saving ? '저장 중…' : draft.error ? '저장되지 않은 입력' : draft.dirty ? '편집 중' : '저장됨'}</span>
    </div>
    {draft.error && <div className={styles.error} role="alert"><p>{draft.error}</p><div>
      <button type="button" disabled={!!props.readOnly || draft.invalid || draft.saving} onClick={() => { void saveNow(); }}>다시 저장</button>
      <button type="button" onClick={downloadDraft}>입력한 원문 받기</button>
      <button type="button" disabled={inputLocked || draft.saving} onClick={() => { if (draftRef.current?.discard(propsRef.current.workspace)) { orderHistoryRef.current.clear(); orderPositionsRef.current = []; orderEpochRef.current++; editorRef.current?.setValue(draftRef.current.getState().raw, { preserveSelection: true }); } }}>저장본으로 되돌리기</button>
    </div></div>}
    {moving && <div className={styles.moveNotice} role="status"><span>{moving.label} · 하위 {moving.descendantCount}줄</span><button type="button" onClick={() => setPanel({ kind: 'move', lineId: moving.lineId })}>위치 선택</button><button type="button" onClick={cancelMove}>이동 취소</button></div>}
    {message && !panel && <p className={styles.message} role="status">{message}</p>}
    <div ref={hostRef} className={styles.host} data-native-editor="v11-core" />
    {panel && <dialog ref={dialogRef} className={styles.dialog} aria-label={title} onCancel={event => { event.preventDefault(); closePanel(); cancelMove(); }}>
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
        {insertions.map(option => <button type="button" key={`${option.kind}:${option.offset}:${option.depth}`} onClick={() => insertNative(option.offset, option.text, option.caretOffset)}>{option.label}<small>{option.relation}</small></button>)}
        {!currentDoc()?.lines.length && <><button type="button" onClick={() => insertNative(0, '- [ ] ', 6)}>할 일</button><button type="button" onClick={() => { closePanel(); editorRef.current?.focus(); }}>자유 메모</button></>}
        <button type="button" onClick={insertDateSection}>날짜 구획 · 문서 끝에</button>
        <button type="button" onClick={() => { setFolderName(''); setPanel({ kind: 'folder', lineId: panel.lineId }); }}>폴더 연결</button>
        {row?.isReference && panelAccess?.documentId && panelAccess.lineId === (row.progressTargetId ?? row.taskId) && !panelAccess.reason && <button type="button" disabled={disabled} onClick={() => {
          const current = currentRow(panel.lineId), access = accessFor(panel.lineId);
          if (actionsDisabled() || composingRef.current || !current?.isReference || !access?.documentId || access.lineId !== (current.progressTargetId ?? current.taskId)) return;
          setPanel({ kind: 'reference', lineId: panel.lineId });
        }}>연결된 항목 보기</button>}
        {props.onConnectFlow && <button type="button" onClick={() => { void connectFlow(panel.lineId); }}>Flow 연결</button>}
        {row?.progressTargetId && (accessFor(panel.lineId)?.reason ? <button type="button" onClick={() => setPanel({ kind: 'reference', lineId: panel.lineId })}>기록·원래 항목 보기</button> : <><button type="button" onClick={() => openProgress(panel.lineId)}>진행 기록</button><button type="button" onClick={() => openProgress(panel.lineId, 'date')}>날짜 바꾸기</button></>)}
        {row && ['task', 'subcheck', 'scope'].includes(row.kind) && <button type="button" onClick={() => beginMove(panel.lineId, true)}>하위 묶음 이동</button>}
        {row && <><button type="button" onClick={() => { closePanel(); editorRef.current?.focus(row.index); editorRef.current?.indent(false); }}>들여쓰기</button><button type="button" onClick={() => { closePanel(); editorRef.current?.focus(row.index); editorRef.current?.indent(true); }}>내어쓰기</button><button type="button" onClick={() => { closePanel(); editorRef.current?.toggleFold(row.index); }}>하위 내용 접기 / 펼치기</button></>}
      </div>}
      {panel.kind === 'progress' && !protectedExecutionPanel && <form onSubmit={event => { event.preventDefault(); void applyProgress(); }}>
        <p>{row?.title || row?.task?.title}</p><label>기록 날짜<input type="date" required value={date} onChange={event => setDate(event.target.value)} /></label>
        <label>그날까지의 누적 진행률<input inputMode="decimal" required value={percent} onChange={event => setPercent(event.target.value)} aria-describedby={progressHintId} /></label>
        <small id={progressHintId}>20, 20%, 0.2는 20%입니다. 날짜별 값을 더하지 않습니다.</small>
        <div className={styles.quickProgress}>{[0, 20, 50, 100].map(value => <button type="button" key={value} onClick={() => setPercent(String(value))}>{value}%</button>)}</div>
        <button type="submit" disabled={disabled}>진행 저장</button>
        {row?.progressTargetId && M.progressHistory(draft.working, row.progressTargetId).length > 0 && <details><summary>날짜별 기록</summary><div className={styles.choices}>{M.progressHistory(draft.working, row.progressTargetId).map(record => <button type="button" key={record.date} onClick={() => { setDate(record.date); setPercent(String(record.percent)); }}>{record.date}<span>{record.percent}%</span></button>)}</div></details>}
      </form>}
      {panel.kind === 'date' && !protectedExecutionPanel && <form onSubmit={event => { event.preventDefault(); void applyDate(); }}><label>항목 날짜<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label><button type="button" onClick={() => setDate('')}>날짜 미정</button><button type="submit" disabled={disabled}>날짜 적용</button></form>}
      {panel.kind === 'folder' && <><div className={styles.choices}>{M.scopes(draft.working).filter(scope => scope.kind === 'folder').map(scope => <button type="button" key={scope.id} onClick={() => { void attachFolder(scope.id); }}>{scope.title}</button>)}</div><form onSubmit={event => { event.preventDefault(); void attachFolder(null); }}><label>새 폴더 이름<input value={folderName} maxLength={100} onChange={event => setFolderName(event.target.value)} /></label><button type="submit" disabled={!folderName.trim() || disabled}>만들어 연결</button></form></>}
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
