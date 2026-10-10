'use client';

import React, { useEffect, useRef, useState } from 'react';
import nativeEditor from '@/lib/flow/integrated-poc/vendor/text-editor.cjs';
import { planProgramRegionEdit, isProgramFolderViewCurrent, type ProgramFolderDocumentView } from '@/lib/flow/integrated-poc/folder-document-regions';
import { textEditorRows, textWorkspaceModel as M, type TextWorkspaceState } from '@/lib/flow/integrated-poc/text-workspace';

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
      if (flight) return flight;
      if (composing) { error = programRegionError('composition'); options.notify(); return Promise.resolve(false); }
      if (!pending) return options.persist();
      if (options.readonly()) { error = programRegionError('readonly'); options.notify(); return Promise.resolve(false); }
      const capture = pending;
      const now = new Date(), progressDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const plan = planProgramRegionEdit(options.workspace(), capture.view, capture.key, capture.raw, { progressDate });
      if (!plan.ok) { error = programRegionError(plan.reason); options.notify(); return Promise.resolve(false); }
      if (!options.accept(plan.next, capture.view.workspace)) { error = programRegionError('stale-workspace'); options.notify(); return Promise.resolve(false); }
      // Once accepted, the shared full-document draft owns failures and retries.
      pending = null; error = ''; options.notify();
      flight = options.persist().finally(() => { flight = null; options.notify(); });
      return flight;
    },
  };
  return api;
}

/** Preview a fragment inside its original document, never as a standalone model. */
export function previewProgramRegionText(view: ProgramFolderDocumentView, key: string, raw: string) {
  const region = view.regions.find(entry => entry.key === key);
  if (!region || !isProgramFolderViewCurrent(view.workspace, view)) return null;
  const prefix = view.fullRaw.split('\n').slice(0, region.startIndex).join('\n');
  const offset = prefix.length + (region.startIndex ? 1 : 0);
  const lines = view.fullRaw.split('\n');
  const incoming = raw ? raw.split('\n') : [];
  lines.splice(region.startIndex, region.endIndex - region.startIndex, ...incoming);
  const fullRaw = lines.join('\n');
  const checked = planProgramRegionEdit(view.workspace, view, key, raw);
  const edited = checked.ok ? { state: checked.next, reason: null } : M.editTextResult(view.workspace, view.documentId, fullRaw);
  if (edited.reason || M.raw(M.getDocument(edited.state, view.documentId)) !== fullRaw) return { fullRaw, offset, rows: [], lineId: () => null };
  const rows = textEditorRows(edited.state, view.documentId).slice(region.startIndex, region.startIndex + incoming.length)
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
  composing(): boolean;
  rows(): ReturnType<typeof textEditorRows>;
  canApply(raw: string): boolean;
  onRejected(): void;
  onChange(raw: string): void;
  onCompose(composing: boolean, raw: string): void;
  onPosition(start: number, end: number, raw: string): void;
  onRegister(port: NativeRegionPort | null): void;
  className: string;
}) {
  const host = useRef<HTMLDivElement>(null), latest = useRef(props); latest.current = props;
  const editor = useRef<ReturnType<typeof nativeEditor.create> | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const instance = nativeEditor.create(host.current, {
      value: latest.current.raw, label: latest.current.label, controls: false,
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
    for (const event of ['select', 'keyup', 'click', 'focus', 'blur']) area.addEventListener(event, position);
    area.addEventListener('compositionstart', start, true); area.addEventListener('compositionend', end, true);
    latest.current.onRegister({ instance, area });
    return () => {
      for (const event of ['select', 'keyup', 'click', 'focus', 'blur']) area.removeEventListener(event, position);
      area.removeEventListener('compositionstart', start, true); area.removeEventListener('compositionend', end, true);
      latest.current.onRegister(null); instance.destroy(); editor.current = null;
    };
  }, []);
  useEffect(() => {
    const instance = editor.current, area = host.current?.querySelector<HTMLTextAreaElement>('textarea');
    if (!instance || !area || props.composing()) return;
    // A confirmed save normally has the same bytes. Avoid resetting browser history.
    if (instance.getValue() !== props.raw) instance.setValue(props.raw, { preserveSelection: true });
    area.readOnly = props.readOnly; instance.refresh();
  }, [props.raw, props.readOnly, props.rows, props.composing]);
  useEffect(() => { editor.current?.setMode(props.mode ?? 'live'); }, [props.mode]);
  return <div ref={host} className={props.className} data-readonly={props.readOnly ? 'true' : 'false'}
    style={{ height: Math.max(3, Math.min(14, props.raw.split('\n').length + 1)) * 44 + 24 }} />;
}

export function ProgramFolderRegionEditor(props: {
  view: ProgramFolderDocumentView;
  readOnly: boolean;
  locked: boolean;
  mode?: 'live' | 'text';
  workspace(): TextWorkspaceState;
  onAccept(next: TextWorkspaceState, before: TextWorkspaceState): boolean;
  onPersist(): Promise<boolean>;
  onPending(pending: boolean, composing: boolean): void;
  onRegister(port: ProgramFolderRegionPort | null): void;
  onPosition(start: number, end: number, lineId: string | null): void;
  onDownload(): void;
  onContinueWholeDocument?(): void;
  styles: Record<string, string>;
}) {
  const styles = props.styles;
  const latest = useRef(props); latest.current = props;
  const [, rerender] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const surfaces = useRef(new Map<string, NativeRegionPort>()), activeKey = useRef<string | null>(null);
  const [notice, setNotice] = useState('');
  const [controller] = useState(() => createProgramRegionDraft({
    workspace: () => latest.current.workspace(), accept: (next, before) => latest.current.onAccept(next, before),
    persist: () => latest.current.onPersist(), readonly: () => latest.current.readOnly,
    notify: () => { rerender(value => value + 1); const state = controllerRef.current?.getState(); if (state) latest.current.onPending(!!state.pending || state.composing, state.composing); },
  }));
  const controllerRef = useRef(controller); controllerRef.current = controller;
  const state = controller.getState(), view = state.pending?.view ?? props.view;
  useEffect(() => {
    latest.current.onRegister({ ...controller, undo: () => {
      if (controller.isComposing() || latest.current.locked || latest.current.readOnly) return false;
      const pending = controller.getState().pending;
      const port = surfaces.current.get(pending?.key ?? activeKey.current ?? '') ?? Array.from(surfaces.current.values()).find(entry => !entry.area.readOnly);
      return !!port && !port.area.readOnly && port.instance.undo();
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
  const entries = [...Array.from(context.values()).map(row => ({ index: row.index, row, region: null })),
    ...view.regions.map((region, ordinal) => ({ index: region.startIndex, row: null, region, ordinal }))].sort((a, b) => a.index - b.index);
  return <div ref={root} className={styles.regions} aria-label="현재 문서의 폴더 영역">
    {entries.map(entry => entry.row ? <div key={`context:${entry.row.id}`} className={styles.context} data-context-line={entry.row.id}>
      <small>원문 {entry.row.index + 1}줄 · 문맥</small><pre>{entry.row.text || ' '}</pre>
      {entry.row.scopeMismatch && <small>실제 소속이 이 위치의 폴더와 다릅니다.</small>}
    </div> : entry.region && !entry.region.readOnly ? <div key={entry.region.key} className={styles.region} data-folder-region={entry.region.key}>
      <span className={styles.regionLabel}>원문 {entry.region.startIndex + 1}–{Math.max(entry.region.startIndex + 1, entry.region.endIndex)}줄</span>
      <NativeProgramRegion label={`폴더 영역 ${'ordinal' in entry ? entry.ordinal! + 1 : 1} 원문`}
        mode={props.mode}
        raw={state.pending?.key === entry.region.key ? state.pending.raw : entry.region.raw}
        readOnly={props.readOnly || props.locked || !!state.pending && state.pending.key !== entry.region.key}
        composing={controller.isComposing} className={styles.regionHost}
        rows={() => {
          const pending = controller.getState().pending;
          return previewProgramRegionText(pending?.view ?? view, entry.region!.key,
            surfaces.current.get(entry.region!.key)?.instance.getValue() ?? (pending?.key === entry.region!.key ? pending.raw : entry.region!.raw))?.rows ?? [];
        }}
        canApply={raw => planProgramRegionEdit(latest.current.workspace(), controller.getState().pending?.view ?? latest.current.view, entry.region!.key, raw).ok}
        onRejected={() => setNotice('이 조작은 전체 문서에서 할 수 있습니다. 입력은 그대로 남아 있습니다.')}
        onChange={raw => { if (controller.update(view, entry.region!.key, raw)) { setNotice(''); schedule(); } }}
        onCompose={(composing, raw) => {
          if (timer.current) clearTimeout(timer.current);
          if (composing) controller.compose(true);
          else { controller.update(view, entry.region!.key, raw); controller.compose(false); schedule(); }
        }}
        onRegister={port => { if (port) surfaces.current.set(entry.region!.key, port); else surfaces.current.delete(entry.region!.key); }}
        onPosition={(start, end, raw) => {
          activeKey.current = entry.region!.key;
          const preview = previewProgramRegionText(controller.getState().pending?.view ?? view, entry.region!.key, raw);
          if (preview) latest.current.onPosition(preview.offset + start, preview.offset + end, preview.lineId(raw.slice(0, start).split('\n').length - 1));
        }} />
    </div> : null)}
    {state.pending && <div className={styles.actions}><button type="button" disabled={props.readOnly || props.locked || state.composing} onClick={() => { void controller.flush(); }}>영역 저장</button>
      <button type="button" disabled={props.locked || state.composing} onClick={() => controller.discard()}>영역 입력 취소</button></div>}
    {notice && !state.error && <div className={styles.notice} role="status"><p>{notice}</p>{props.onContinueWholeDocument && <button type="button" disabled={state.composing || props.locked} onClick={props.onContinueWholeDocument}>전체 문서에서 계속 편집</button>}</div>}
    {state.error && <div className={styles.error} role="alert"><p>{state.error}</p>{props.onContinueWholeDocument && <button type="button" disabled={state.composing || props.locked} onClick={props.onContinueWholeDocument}>전체 문서에서 계속 편집</button>}<button type="button" onClick={props.onDownload}>입력한 원문 받기</button></div>}
  </div>;
}
