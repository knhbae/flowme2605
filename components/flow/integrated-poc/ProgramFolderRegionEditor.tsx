'use client';

import React, { useEffect, useRef, useState } from 'react';
import nativeEditor from '@/lib/flow/integrated-poc/vendor/text-editor.cjs';
import { planProgramRegionEdit, isProgramFolderViewCurrent, readProgramFolderRegions, type ProgramFolderDocumentView } from '@/lib/flow/integrated-poc/folder-document-regions';
import { textEditorRows, textWorkspaceModel as M, type TextRow, type TextWorkspaceState } from '@/lib/flow/integrated-poc/text-workspace';
import { programCalendarDate } from '@/lib/flow/integrated-poc/date-label';
import { programFolderOldDay, programFolderOldSince, programFolderRowDay } from '@/lib/flow/integrated-poc/folder-screen';
import { revealProgramEditorLine } from './editor-reveal';

export interface ProgramFolderRegionSnapshot {
  view: ProgramFolderDocumentView;
  raw: string;
  start: number;
  end: number;
  lineId: string | null;
  regionKey: string | null;
  regionRaw: string | null;
}

export interface ProgramFolderRegionPort {
  hasPending(): boolean;
  isComposing(): boolean;
  flush(): Promise<boolean>;
  captureRaw(): string;
  discard(): void;
  undo?(): boolean;
  takeSnapshot(): ProgramFolderRegionSnapshot | null;
  /** The editable region the writing bar acts on: the pending one, else the last focused one.
   *  `allowReadOnly` also returns it while it is read-only during a save (to aim a held press). */
  activeEditor?(allowReadOnly?: boolean): { instance: ReturnType<typeof nativeEditor.create>; area: HTMLTextAreaElement } | null;
  /** Whether the active region's own check would accept this region text (the bar's dry run). */
  canApplyActive?(raw: string): boolean;
  /** Put the caret in a saved line of an editable region (at `column`, else the line end) and show it. */
  revealLine?(lineId: string, column?: number): boolean;
}
/** A context line drawn like the body: no raw markers ("[2026-10-30]", "- /", "- [ ]") and no line numbers.
 *  Only a date line, a task's 날짜 property and a folder line's own tag are drawn differently; what the user
 *  wrote (titles, URLs, notes, fenced code) stays as written, as in the body. */
export function regionContextText(row: Pick<TextRow, 'kind' | 'text' | 'date' | 'groupDate' | 'title' | 'done' | 'scopeTitle'>): string {
  const text = row.text.trim(), item = text.replace(/^- (\[[^\]]*\] ?)?/, '');
  switch (row.kind) {
    case 'date': { const date = row.date ?? row.groupDate; return date ? programCalendarDate(date, '') : text === '[미정]' ? '날짜 미정' : text; }
    case 'scope': return row.scopeTitle ?? text.replace(/ +<!-- flowme-folder:v1 id=[^\s<>]+ -->$/, '').replace(/^- \//, '');
    case 'task': case 'subcheck': return `${row.done ? '☑' : '☐'} ${row.title ?? item}`;
    case 'property': { const date = /^날짜:\s*(\d{4}-\d{2}-\d{2})$/.exec(item); return date ? `날짜: ${programCalendarDate(date[1], '')}` : item; }
    case 'heading': return text.replace(/^#+\s*/, '');
    case 'blank': return '';
    case 'fence': return text.replace(/^`{3,}.*$/, '');
    default: return text.startsWith('- ') ? `• ${item}` : text;
  }
}

export function programRegionError(reason: string): string {
  if (['stale-workspace', 'stale-region', 'invalid-view'].includes(reason)) return '다른 곳에서 문서가 바뀌었습니다. 입력은 남아 있습니다. 입력을 받은 뒤 저장본으로 돌아가 주세요.';
  if (reason === 'linked-document-change') return '이 제목을 바꾸면 다른 문서의 연결도 바뀝니다. 여기서는 저장하지 않았습니다. 입력을 받거나 취소한 뒤 전체 문서에서 수정해 주세요.';
  if (['existing-line-removed', 'identity-ambiguous'].includes(reason)) return '기존 줄을 안전하게 연결하지 못했습니다. 줄 삭제는 전체 문서에서 하고, 여러 제목·속성은 한 줄씩 수정해 저장해 주세요. 입력은 남아 있습니다.';
  if (reason === 'composition') return '한글 입력을 마친 뒤 보기 범위를 바꿔 주세요.';
  if (reason === 'readonly') return '지금은 이 문서를 저장할 수 없습니다. 입력은 남아 있습니다.';
  return '폴더 경계·날짜·소속·진행 기록이 바뀌는 입력은 여기서 저장할 수 없습니다. 구조를 유지해 수정하거나 입력을 받은 뒤 전체 문서에서 편집해 주세요.';
}

/** Local fragments never become a writer payload; only the checked full model does. */
export function createProgramRegionDraft(options: {
  workspace(): TextWorkspaceState;
  accept(next: TextWorkspaceState, before: TextWorkspaceState): boolean;
  persist(): Promise<boolean>;
  readonly(): boolean;
  notify(): void;
  /** Region fix 2 (11/8): the document's save is running. The region keeps taking keys meanwhile (it used to turn
   *  read-only, and keys typed then were lost without a word); its own write waits for that save (`idle`). */
  busy?(): boolean;
  idle?(): Promise<void>;
  /** The same view read again from the current workspace (a save or a refresh landed after this one was drawn). */
  refresh?(view: ProgramFolderDocumentView): ProgramFolderDocumentView | null;
}) {
  let pending: { view: ProgramFolderDocumentView; key: string; raw: string } | null = null;
  let composing = false, error = '', flight: Promise<boolean> | null = null;
  const api = {
    getState: () => ({ pending, composing, error, saving: !!flight }),
    hasPending: () => !!pending || composing,
    isComposing: () => composing,
    update(view: ProgramFolderDocumentView, key: string, raw: string) {
      if (pending && pending.key !== key) return false;
      const captured = pending?.view ?? view, original = captured.regions.find(region => region.key === key);
      if (!original || original.readOnly || options.readonly()) return false;
      pending = raw === original.raw ? null : { view: captured, key, raw }; error = ''; options.notify(); return true;
    },
    compose(value: boolean) { composing = value; options.notify(); },
    captureRaw() {
      if (!pending) return '';
      const region = pending.view.regions.find(entry => entry.key === pending!.key)!;
      const lines = pending.view.fullRaw.split('\n');
      lines.splice(region.startIndex, region.endIndex - region.startIndex, ...(pending.raw ? pending.raw.split('\n') : []));
      return lines.join('\n');
    },
    discard() { if (composing || flight) return; pending = null; error = ''; options.notify(); },
    flush(): Promise<boolean> {
      // Region fix 2: input typed while the last write was still going (the region takes keys during a save now) is
      // written once that write ends, not left pending until another key.
      if (flight) return flight.then(done => pending && !composing ? api.flush() : done);
      if (composing) { error = programRegionError('composition'); options.notify(); return Promise.resolve(false); }
      if (!pending) return options.persist();
      if (options.readonly()) { error = programRegionError('readonly'); options.notify(); return Promise.resolve(false); }
      // Region fix 2: while the document's save runs, this write waits for it (then flushes what is pending then).
      if (options.busy?.() && options.idle) return options.idle().then(() => api.flush());
      const capture = pending;
      const now = new Date(), progressDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      let view = capture.view, plan = planProgramRegionEdit(options.workspace(), view, capture.key, capture.raw, { progressDate });
      let accepted = plan.ok && options.accept(plan.next, view.workspace);
      // Region fix 2: refused only because the view is behind the workspace (a save or a refresh landed since it was
      // read): read it again and write once more — only when this region still reads as it did when typing began.
      if (!accepted && (!plan.ok ? ['stale-workspace', 'stale-region', 'invalid-view'].includes(plan.reason) : true) && options.refresh) {
        const fresh = options.refresh(view), was = view.regions.find(region => region.key === capture.key), now2 = fresh?.regions.find(region => region.key === capture.key);
        if (fresh && was && now2 && now2.raw === was.raw && !now2.readOnly) {
          view = fresh; plan = planProgramRegionEdit(options.workspace(), view, capture.key, capture.raw, { progressDate });
          accepted = plan.ok && options.accept(plan.next, view.workspace);
        }
      }
      if (!plan.ok) { error = programRegionError(plan.reason); options.notify(); return Promise.resolve(false); }
      if (!accepted) { error = programRegionError('stale-workspace'); options.notify(); return Promise.resolve(false); }
      // Once accepted, the shared full-document draft owns failures and retries.
      pending = null; error = ''; options.notify();
      flight = options.persist().finally(() => { flight = null; options.notify(); });
      return flight;
    },
  };
  return api;
}

/** Region fix (11/7): each region's editor asks for its rows on every draw; with many regions that was the whole check
 *  and the whole document's rows again per region and per draw. A view is a fixed snapshot, so its previews are kept
 *  by (region, text), and an unchanged region reads the rows of the view's own document (computed once per state). */
const previewKept = new WeakMap<ProgramFolderDocumentView, Map<string, ReturnType<typeof previewRegion>>>();
const rowsKept = new WeakMap<TextWorkspaceState, Map<string, ReturnType<typeof textEditorRows>>>();
function documentRows(state: TextWorkspaceState, documentId: string) {
  let byDocument = rowsKept.get(state);
  if (!byDocument) rowsKept.set(state, byDocument = new Map());
  if (!byDocument.has(documentId)) byDocument.set(documentId, textEditorRows(state, documentId));
  return byDocument.get(documentId)!;
}
/** F4-a: the document's rows with their day (a region's day folds it), read once per state like the editor rows above. */
const metaKept = new WeakMap<TextWorkspaceState, Map<string, TextRow[]>>();
function documentMeta(state: TextWorkspaceState, documentId: string) {
  let byDocument = metaKept.get(state);
  if (!byDocument) metaKept.set(state, byDocument = new Map());
  if (!byDocument.has(documentId)) byDocument.set(documentId, M.rowMeta(state, documentId));
  return byDocument.get(documentId)!;
}
/** Preview a fragment inside its original document, never as a standalone model. */
export function previewProgramRegionText(view: ProgramFolderDocumentView, key: string, raw: string) {
  let byView = previewKept.get(view);
  if (!byView) previewKept.set(view, byView = new Map());
  const id = `${key}\u0000${raw}`;
  if (!byView.has(id)) byView.set(id, previewRegion(view, key, raw));
  return byView.get(id)!;
}
// Whether a view is still its own snapshot, asked once per view for its previews (a write checks it again in full).
const currentKept = new WeakMap<ProgramFolderDocumentView, boolean>();
function previewRegion(view: ProgramFolderDocumentView, key: string, raw: string) {
  const region = view.regions.find(entry => entry.key === key);
  if (!currentKept.has(view)) currentKept.set(view, isProgramFolderViewCurrent(view.workspace, view));
  if (!region || !currentKept.get(view)) return null;
  const prefix = view.fullRaw.split('\n').slice(0, region.startIndex).join('\n');
  const offset = prefix.length + (region.startIndex ? 1 : 0);
  const lines = view.fullRaw.split('\n');
  const incoming = raw ? raw.split('\n') : [];
  lines.splice(region.startIndex, region.endIndex - region.startIndex, ...incoming);
  const fullRaw = lines.join('\n');
  // An unchanged region is the view's own document (the check would hand back that same state).
  const checked = raw === region.raw ? { ok: true as const, next: view.workspace } : planProgramRegionEdit(view.workspace, view, key, raw);
  const edited = checked.ok ? { state: checked.next, reason: null } : M.editTextResult(view.workspace, view.documentId, fullRaw);
  if (edited.reason || M.raw(M.getDocument(edited.state, view.documentId)) !== fullRaw) return { fullRaw, offset, rows: [], lineId: () => null };
  const rows = documentRows(edited.state, view.documentId).slice(region.startIndex, region.startIndex + incoming.length)
    .map(row => ({ ...row, subtreeEndIndex: Math.min(incoming.length, row.subtreeEndIndex - region.startIndex) }));
  const existingIds = new Set(M.getDocument(view.workspace, view.documentId)?.lines.map(line => line.id));
  return { fullRaw, offset, rows, lineId: (index: number) => existingIds.has(rows[index]?.id) ? rows[index].id : null };
}

interface NativeRegionPort {
  instance: ReturnType<typeof nativeEditor.create>;
  area: HTMLTextAreaElement;
}

function NativeProgramRegion(props: {
  raw: string;
  label: string;
  mode?: 'live' | 'text';
  readOnly: boolean;
  listEnterV2?: boolean;
  composing(): boolean;
  rows(): ReturnType<typeof textEditorRows>;
  /** The view the rows come from: a new one (after a save) repaints this region once; `rows` itself is read fresh. */
  version: unknown;
  canApply(raw: string): boolean;
  onRejected(): void;
  onChange(raw: string): void;
  onCompose(composing: boolean, raw: string): void;
  onPosition(start: number, end: number, raw: string): void;
  onRegister(port: NativeRegionPort | null): void;
  /** A typed "/" alone on its line; never for paste, composition, or a "/" inside text. */
  onSlash?(): void;
  className: string;
}) {
  const host = useRef<HTMLDivElement>(null), latest = useRef(props); latest.current = props;
  const editor = useRef<ReturnType<typeof nativeEditor.create> | null>(null);
  // F4-a (A3): no box. The region is as tall as its lines (32px each, wrapped lines included), so the page scrolls, not
  // the region; a key that adds or wraps a line grows it.
  const [height, setHeight] = useState(() => Math.max(1, props.raw.split('\n').length) * 32);
  const fit = () => {
    const box = host.current, area = box?.querySelector<HTMLTextAreaElement>('textarea');
    if (!box || !area) return;
    const style = getComputedStyle(area), line = parseFloat(style.lineHeight) || 32;
    const lines = Math.max(1, area.value.split('\n').length), pad = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
    const estimate = Math.ceil(lines * line + pad);
    box.style.height = `${estimate}px`;
    const next = area.scrollHeight > area.clientHeight + 1 ? Math.ceil(area.scrollHeight) : estimate;
    box.style.height = `${next}px`;
    setHeight(next);
  };
  const fitRef = useRef(fit); fitRef.current = fit;
  useEffect(() => {
    if (!host.current) return;
    const instance = nativeEditor.create(host.current, {
      value: latest.current.raw, label: latest.current.label, controls: false,
      // Same writing-tool settings as the body editor so one document never splits its Enter or
      // picker rules; controls:false already hides ＋ and pickers in this region.
      lineBreakEnter: () => false, typingPickers: () => false, listEnterV2: () => !!latest.current.listEnterV2,
      getRowMeta: () => latest.current.rows(),
      isActionDisabled: () => latest.current.readOnly,
      canApplyInput: raw => !latest.current.readOnly && latest.current.canApply(raw),
      onInputRejected: () => latest.current.onRejected(),
      onChange: raw => latest.current.onChange(raw),
    });
    editor.current = instance;
    instance.setMode(latest.current.mode ?? 'live');
    const area = host.current.querySelector<HTMLTextAreaElement>('textarea');
    if (!area) { instance.destroy(); editor.current = null; return; }
    area.readOnly = latest.current.readOnly;
    const position = () => latest.current.onPosition(area.selectionStart, area.selectionEnd, area.value);
    const start = () => latest.current.onCompose(true, area.value);
    const end = () => latest.current.onCompose(false, area.value);
    const slash = (event: Event) => {
      const caret = area.selectionStart, value = area.value, input = event as InputEvent;
      if (!latest.current.onSlash || input.isComposing || latest.current.composing() || input.inputType !== 'insertText' || input.data !== '/'
        || area.selectionEnd !== caret || value[caret - 1] !== '/') return;
      const rowStart = value.lastIndexOf('\n', caret - 1) + 1, rowEnd = value.indexOf('\n', caret);
      if (value.slice(rowStart, rowEnd < 0 ? value.length : rowEnd).trim() !== '/') return;
      queueMicrotask(() => { if (area.value === value && area.selectionStart === caret && !latest.current.composing()) latest.current.onSlash?.(); });
    };
    for (const event of ['select', 'keyup', 'click', 'focus', 'blur']) area.addEventListener(event, position);
    area.addEventListener('compositionstart', start, true); area.addEventListener('compositionend', end, true);
    area.addEventListener('input', slash);
    // A key refits only when the line count changed or the text now wraps past the bottom (one layout read otherwise).
    let lines = area.value.split('\n').length;
    const grow = () => { const now = area.value.split('\n').length; if (now !== lines || area.scrollHeight > area.clientHeight + 1) { lines = now; fitRef.current(); } };
    area.addEventListener('input', grow);
    // A narrower or wider screen wraps lines again.
    let width = host.current.clientWidth;
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { const now = host.current?.clientWidth ?? width; if (now !== width) { width = now; fitRef.current(); } });
    resize?.observe(host.current);
    latest.current.onRegister({ instance, area });
    fitRef.current();
    return () => {
      for (const event of ['select', 'keyup', 'click', 'focus', 'blur']) area.removeEventListener(event, position);
      area.removeEventListener('compositionstart', start, true); area.removeEventListener('compositionend', end, true);
      area.removeEventListener('input', slash); area.removeEventListener('input', grow); resize?.disconnect();
      latest.current.onRegister(null); instance.destroy(); editor.current = null;
    };
  }, []);
  useEffect(() => {
    const instance = editor.current, area = host.current?.querySelector<HTMLTextAreaElement>('textarea');
    if (!instance || !area || props.composing()) return;
    // A confirmed save normally has the same bytes. Avoid resetting browser history.
    if (instance.getValue() !== props.raw) instance.setValue(props.raw, { preserveSelection: true });
    area.readOnly = props.readOnly; instance.refresh();
    fitRef.current();
    // Region fix (11/7): keyed on the view, not on `rows` (a new function each draw): every region's editor used to
    // repaint on every key typed in any region (42 regions: 42 repaints a key).
  }, [props.raw, props.readOnly, props.version, props.composing]);
  useEffect(() => { editor.current?.setMode(props.mode ?? 'live'); }, [props.mode]);
  return <div ref={host} className={props.className} data-readonly={props.readOnly ? 'true' : 'false'} style={{ height, minHeight: 0 }} />;
}

export function ProgramFolderRegionEditor(props: {
  view: ProgramFolderDocumentView;
  readOnly: boolean;
  locked: boolean;
  /** Region fix 2: the document's save is running (the regions still take keys; their write waits for it). */
  saving?: boolean;
  mode?: 'live' | 'text';
  /** Same list Enter v2 setting as the body editor. */
  listEnterV2?: boolean;
  workspace(): TextWorkspaceState;
  onAccept(next: TextWorkspaceState, before: TextWorkspaceState): boolean;
  onPersist(): Promise<boolean>;
  onPending(pending: boolean, composing: boolean): void;
  onRegister(port: ProgramFolderRegionPort | null): void;
  onPosition(start: number, end: number, lineId: string | null): void;
  onDownload(): void;
  onContinueWholeDocument?(): void;
  /** Open the body editor's insert menu for the caret's line (＋ is in the toolbar and the writing bar). */
  onInsertMenu?(): void;
  /** Drawn right after the region being edited (the writing bar), so it stays next to that text. */
  afterActive?: React.ReactNode;
  styles: Record<string, string>;
  /** F4-a: the writing body's own class, so a region's lines read as 쓰기 does (check box, 32px ruler). */
  hostClassName?: string;
  /** F4-a: today, for the '오늘 · …' date tag and the 7-day fold ('지난 기록 n일 펼치기'). */
  today?: string;
  /** F4-a (위험 3): a line here that only its own writing can change (another folder's task) offers this. */
  onOpenLine?(row: TextRow): void;
}) {
  const styles = props.styles;
  const [oldOpen, setOldOpen] = useState(false);
  const latest = useRef(props); latest.current = props;
  const [, rerender] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const surfaces = useRef(new Map<string, NativeRegionPort>()), activeKey = useRef<string | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [controller] = useState(() => createProgramRegionDraft({
    workspace: () => latest.current.workspace(), accept: (next, before) => latest.current.onAccept(next, before),
    persist: () => latest.current.onPersist(), readonly: () => latest.current.readOnly,
    notify: () => { rerender(value => value + 1); const state = controllerRef.current?.getState(); if (state) latest.current.onPending(!!state.pending || state.composing, state.composing); },
    busy: () => !!latest.current.saving,
    // Settled a little after the save ends, so the page has drawn what it saved (the write is checked against that).
    idle: () => new Promise<void>(resolve => { const started = Date.now(); const tick = () => { if (!latest.current.saving || Date.now() - started > 15_000) setTimeout(resolve, 120); else setTimeout(tick, 60); }; tick(); }),
    refresh: view => readProgramFolderRegions(latest.current.workspace(), view.documentId, view.folderId),
  }));
  const controllerRef = useRef(controller); controllerRef.current = controller;
  const state = controller.getState(), view = state.pending?.view ?? props.view;
  /** Region fix (11/7): the view a key is checked and kept against. A save that landed between two keys (a slow phone
   *  saves while you type) leaves the last drawn view behind the workspace: read it again, by the same region keys, so
   *  the key is not refused as stale and taken back out of the text (which moved the caret and reordered the words). */
  const viewNow = (): ProgramFolderDocumentView => {
    const captured = controller.getState().pending?.view ?? latest.current.view, workspace = latest.current.workspace();
    if (captured.workspace === workspace) return captured;
    return readProgramFolderRegions(workspace, captured.documentId, captured.folderId) ?? captured;
  };
  useEffect(() => {
    latest.current.onRegister({ ...controller, undo: () => {
      if (controller.isComposing() || latest.current.locked || latest.current.readOnly) return false;
      const pending = controller.getState().pending;
      const port = surfaces.current.get(pending?.key ?? activeKey.current ?? '') ?? Array.from(surfaces.current.values()).find(entry => !entry.area.readOnly);
      return !!port && !port.area.readOnly && port.instance.undo();
    }, activeEditor: allowReadOnly => {
      const port = surfaces.current.get(controller.getState().pending?.key ?? activeKey.current ?? '');
      return port && (allowReadOnly || !port.area.readOnly) ? port : null;
    }, canApplyActive: raw => {
      const key = controller.getState().pending?.key ?? activeKey.current;
      return !!key && planProgramRegionEdit(latest.current.workspace(), viewNow(), key, raw).ok;
    }, revealLine: (lineId, column) => {
      const region = latest.current.view.regions.find(entry => !entry.readOnly && entry.lineIds.includes(lineId));
      const port = region && surfaces.current.get(region.key);
      if (!region || !port || port.area.readOnly || controller.getState().pending) return false;
      const index = region.lineIds.indexOf(lineId), lines = port.area.value.split('\n');
      if (index < 0 || index >= lines.length) return false;
      const offset = lines.slice(0, index).reduce((sum, line) => sum + line.length + 1, 0) + Math.min(column ?? lines[index].length, lines[index].length);
      activeKey.current = region.key;
      port.area.focus({ preventScroll: true }); port.area.setSelectionRange(offset, offset);
      revealProgramEditorLine(port.area, index);
      return true;
    }, takeSnapshot: () => {
      if (controller.isComposing() || controller.getState().saving || latest.current.readOnly || latest.current.locked) return null;
      const pending = controller.getState().pending, captured = pending?.view ?? latest.current.view;
      if (!isProgramFolderViewCurrent(latest.current.workspace(), captured)) return null;
      const key = pending?.key ?? activeKey.current ?? captured.regions.find(region => !region.readOnly)?.key;
      const port = key ? surfaces.current.get(key) : undefined;
      const region = captured.regions.find(entry => entry.key === key);
      if (!region) return { view: captured, raw: captured.fullRaw, start: 0, end: 0, lineId: null, regionKey: null, regionRaw: null };
      const raw = port?.instance.getValue() ?? pending?.raw ?? region.raw;
      const preview = previewProgramRegionText(captured, region.key, raw);
      if (!preview) return null;
      const start = port?.area.selectionStart ?? 0, end = port?.area.selectionEnd ?? start;
      return { view: captured, raw: preview.fullRaw, start: preview.offset + start, end: preview.offset + end,
        lineId: preview.lineId(raw.slice(0, start).split('\n').length - 1), regionKey: region.key, regionRaw: raw };
    } });
    return () => { if (timer.current) clearTimeout(timer.current); latest.current.onRegister(null); };
  }, [controller]);
  function schedule() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (!controller.isComposing()) void controller.flush(); }, 450);
  }
  const context = new Map(view.regions.flatMap(region => region.contextRows).filter(row => !view.regions.some(region => !region.readOnly && row.index >= region.startIndex && row.index < region.endIndex)).map(row => [row.id, row]));
  // F4-a (A3): the folder's own line is not drawn (this is that folder); a day older than the last 7 folds, as 쓰기's
  // 최근만 does, unless a region there holds input.
  const docRows = documentMeta(view.workspace, view.documentId), since = props.today ? programFolderOldSince(props.today) : '';
  const entries = [...Array.from(context.values()).filter(row => !(row.kind === 'scope' && row.scopeId === view.folderId)).map(row => ({ index: row.index, row, region: null, day: programFolderRowDay(row) })),
    ...view.regions.map((region, ordinal) => ({ index: region.startIndex, row: null, region, ordinal, day: programFolderRowDay(docRows[region.startIndex] ?? docRows[region.startIndex - 1]) }))]
    .sort((a, b) => a.index - b.index);
  const oldDays = new Set(entries.filter(entry => programFolderOldDay(entry.day, since)).map(entry => entry.day!));
  const heldOld = !!state.pending && entries.some(entry => entry.region?.key === state.pending!.key && programFolderOldDay(entry.day, since));
  const folded = (entry: { day: string | null }) => !oldOpen && !heldOld && programFolderOldDay(entry.day, since);
  // The bar follows the region last edited, or the first editable one before any is (of those in view).
  const barRegion = view.regions.some(region => region.key === activeRegion && !region.readOnly) ? activeRegion
    : entries.find(entry => entry.region && !entry.region.readOnly && !folded(entry))?.region?.key;
  const dayTag = (row: TextRow) => { const date = row.date ?? row.groupDate;
    return date && props.today ? `${date === props.today ? '오늘 · ' : ''}${programCalendarDate(date, '')}` : regionContextText(row); };
  const lockedLine = (row: TextRow) => (row.kind === 'task' || row.kind === 'subcheck') && !!props.onOpenLine;
  return <div ref={root} className={styles.regions} aria-label="현재 문서의 폴더 영역">
    {entries.map(entry => folded(entry) ? null : entry.row ? entry.row.kind === 'date' ? <div key={`context:${entry.row.id}`} className={styles.dayTag} data-context-line={entry.row.id}
      data-kind="date" data-today={entry.row.date === props.today || undefined}><span>{dayTag(entry.row)}</span></div>
      : <div key={`context:${entry.row.id}`} className={styles.context} data-context-line={entry.row.id}
      data-kind={entry.row.kind} data-locked={lockedLine(entry.row) || undefined} style={{ '--context-depth': entry.row.depth } as React.CSSProperties}>
      <span>{entry.row.kind === 'scope' ? `/ ${regionContextText(entry.row)}` : regionContextText(entry.row) || ' '}</span>
      {entry.row.scopeMismatch && !lockedLine(entry.row) && <small>실제 소속이 이 위치의 폴더와 다릅니다.</small>}
      {lockedLine(entry.row) && <button type="button" className={styles.openLine} data-open-line={entry.row.id}
        aria-label={`${entry.row.scopeMismatch ? '실제 소속이 이 위치의 폴더와 다릅니다 · ' : ''}원래 글에서 고치기`} onClick={() => props.onOpenLine?.(entry.row!)}>원래 글에서 고치기 ›</button>}
    </div> : entry.region && !entry.region.readOnly ? <div key={entry.region.key} className={styles.region} data-folder-region={entry.region.key}>
      <NativeProgramRegion label={`폴더 영역 ${'ordinal' in entry ? entry.ordinal! + 1 : 1} 원문`}
        mode={props.mode} listEnterV2={props.listEnterV2}
        raw={state.pending?.key === entry.region.key ? state.pending.raw : entry.region.raw}
        readOnly={props.readOnly || props.locked || !!state.pending && state.pending.key !== entry.region.key}
        composing={controller.isComposing} className={props.hostClassName ? `${styles.regionHost} ${props.hostClassName}` : styles.regionHost} version={view}
        rows={() => {
          const pending = controller.getState().pending;
          return previewProgramRegionText(pending?.view ?? view, entry.region!.key,
            surfaces.current.get(entry.region!.key)?.instance.getValue() ?? (pending?.key === entry.region!.key ? pending.raw : entry.region!.raw))?.rows ?? [];
        }}
        canApply={raw => planProgramRegionEdit(latest.current.workspace(), viewNow(), entry.region!.key, raw).ok}
        onRejected={() => setNotice('이 조작은 전체 문서에서 할 수 있습니다. 입력은 그대로 남아 있습니다.')}
        onChange={raw => { if (controller.update(viewNow(), entry.region!.key, raw)) { setNotice(''); schedule(); } }}
        onCompose={(composing, raw) => {
          if (timer.current) clearTimeout(timer.current);
          if (composing) controller.compose(true);
          else { controller.update(viewNow(), entry.region!.key, raw); controller.compose(false); schedule(); }
        }}
        onRegister={port => { if (port) surfaces.current.set(entry.region!.key, port); else surfaces.current.delete(entry.region!.key); }}
        onSlash={props.onInsertMenu ? () => { activeKey.current = entry.region!.key; latest.current.onInsertMenu?.(); } : undefined}
        onPosition={(start, end, raw) => {
          activeKey.current = entry.region!.key;
          if (activeRegion !== entry.region!.key) setActiveRegion(entry.region!.key);
          const preview = previewProgramRegionText(controller.getState().pending?.view ?? view, entry.region!.key, raw);
          if (preview) latest.current.onPosition(preview.offset + start, preview.offset + end, preview.lineId(raw.slice(0, start).split('\n').length - 1));
        }} />
      {entry.region.key === barRegion && props.afterActive}
    </div> : null)}
    {/* F4-a: no 영역 저장 · 영역 입력 취소; a region saves itself (450ms) as 쓰기 does, and says so in the head. */}
    {oldDays.size > 0 && !heldOld && <button type="button" className={styles.oldToggle} data-old-days={oldDays.size} aria-expanded={oldOpen}
      disabled={state.composing} onClick={() => setOldOpen(open => !open)}>{oldOpen ? '지난 기록 접기 ⌃' : `지난 기록 ${oldDays.size}일 펼치기 ⌄`}</button>}
    {notice && !state.error && <div className={styles.notice} role="status"><p>{notice}</p>{props.onContinueWholeDocument && <button type="button" disabled={state.composing || props.locked} onClick={props.onContinueWholeDocument}>전체 문서에서 계속 편집</button>}</div>}
    {state.error && <div className={styles.error} role="alert"><p>{state.error}</p>{props.onContinueWholeDocument && <button type="button" disabled={state.composing || props.locked} onClick={props.onContinueWholeDocument}>전체 문서에서 계속 편집</button>}<button type="button" onClick={props.onDownload}>입력한 원문 받기</button></div>}
  </div>;
}
