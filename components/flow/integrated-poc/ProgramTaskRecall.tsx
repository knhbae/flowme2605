'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { programCalendarDate, programDaysBetween } from '@/lib/flow/integrated-poc/date-label';
import { programRecallChoices, programRecallKey, type ProgramRecallCandidate, type ProgramRecallLine } from '@/lib/flow/integrated-poc/task-recall';
import { createProgramRecallComputer, type ProgramRecallSource } from '@/lib/flow/integrated-poc/task-recall-compute';
import styles from './ProgramTaskRecall.module.css';

export type ProgramTaskRecallFrame = { line: ProgramRecallLine; raw: string; owner: object; documentId: string; generation: number };
export type ProgramTaskRecallPort = {
  surface: () => HTMLTextAreaElement | null;
  frame: () => ProgramTaskRecallFrame | null;
  caret: (offset: number) => { left: number; bottom: number } | null | undefined;
  choose: (candidate: ProgramRecallCandidate, frame: ProgramTaskRecallFrame) => void;
  coverBar: (covered: boolean) => void;
};
type View = { frame: ProgramTaskRecallFrame; rows: ProgramRecallCandidate[]; navigation: number; shownAt: number; phone: boolean; left: number; top: number; width: number };

/** Kept outside the editor's render owner: native input cancels one timer, never builds an index or parses a model.
 * The panel has no default selection and never takes input focus. */
export function ProgramTaskRecall({ port, active, source }: { port: ProgramTaskRecallPort; active: boolean; source: ProgramRecallSource }) {
  const portRef = useRef(port); portRef.current = port;
  const id = useId(), [view, setView] = useState<View | null>(null), current = useRef<View | null>(null), epoch = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), idle = useRef<number | null>(null), composing = useRef(false), enabled = useRef(active);
  enabled.current = active;
  const dismissal = useRef<string | null>(null), suppressed = useRef(false);
  const inputAt = useRef(0);
  const index = useRef<readonly ProgramRecallCandidate[]>([]), computer = useRef<ReturnType<typeof createProgramRecallComputer> | null>(null);
  const signature = (frame: ProgramTaskRecallFrame) => `${frame.documentId}\u0000${frame.line.lineId}\u0000${frame.raw}`;
  function present(next: View | null) {
    if (current.current === next) return;
    current.current = next; setView(next); portRef.current.coverBar(!!next?.phone);
    const area = portRef.current.surface();
    if (!area) return;
    if (next) {
      area.setAttribute('role', 'combobox'); area.setAttribute('aria-autocomplete', 'list'); area.setAttribute('aria-expanded', 'true'); area.setAttribute('aria-controls', id);
      if (next.navigation >= 0) area.setAttribute('aria-activedescendant', `${id}-${next.navigation}`); else area.removeAttribute('aria-activedescendant');
    } else if (area.getAttribute('aria-controls') === id) for (const name of ['role', 'aria-autocomplete', 'aria-expanded', 'aria-controls', 'aria-activedescendant']) area.removeAttribute(name);
  }
  function cancel() {
    epoch.current++; if (timer.current !== null) clearTimeout(timer.current); timer.current = null;
    if (idle.current !== null) window.cancelIdleCallback?.(idle.current); idle.current = null;
  }
  function hide(dismiss = false) { if (dismiss && current.current) dismissal.current = signature(current.current.frame); cancel(); present(null); }
  function sameFrame(left: ProgramTaskRecallFrame, right: ProgramTaskRecallFrame) {
    return left.owner === right.owner && left.documentId === right.documentId && left.generation === right.generation && left.line.lineId === right.line.lineId && left.raw === right.raw;
  }
  function choose(row: ProgramRecallCandidate) {
    const listed = current.current, frame = portRef.current.frame();
    if (!listed || !frame || composing.current || performance.now() - listed.shownAt < 300 || !sameFrame(listed.frame, frame)) return;
    hide(true); portRef.current.choose(row, frame);
  }
  function schedule(delay = 300) {
    cancel(); present(null);
    if (!enabled.current || composing.current || suppressed.current) return;
    const stamp = epoch.current;
    timer.current = setTimeout(() => {
      timer.current = null;
      const run = () => {
        idle.current = null;
        if (epoch.current !== stamp || !enabled.current || composing.current || suppressed.current) return;
        const frame = portRef.current.frame(), area = portRef.current.surface();
        if (!frame || !area || document.activeElement !== area || signature(frame) === dismissal.current) return;
        const phone = window.matchMedia('(max-width: 700px)').matches, width = phone ? Math.min(420, window.innerWidth - 16) : Math.min(440, window.innerWidth - 16);
        const rows = programRecallChoices(index.current, { query: frame.line.query, lineId: frame.line.lineId, folder: frame.line.folder, limit: phone ? 3 : 5 });
        if (!rows.length || epoch.current !== stamp) return;
        const box = portRef.current.caret(frame.line.start), viewport = window.visualViewport, floor = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
        const height = 44 + rows.length * 48 + 29, left = phone ? (window.innerWidth - width) / 2 : Math.min(window.innerWidth - width - 8, Math.max(8, box?.left ?? area.getBoundingClientRect().left));
        const top = phone ? Math.max(viewport?.offsetTop ?? 0, floor - height - 4) : Math.max(8, Math.min(floor - height - 8, (box?.bottom ?? area.getBoundingClientRect().top) + 8));
        present({ frame, rows, navigation: -1, shownAt: performance.now(), phone, left, top, width });
      };
      if (window.requestIdleCallback) idle.current = window.requestIdleCallback(run, { timeout: 1000 }); else run();
    }, delay);
  }
  useEffect(() => {
    const isSurface = (event: Event) => event.target === portRef.current.surface();
    const input = (event: Event) => { if (isSurface(event)) { inputAt.current = performance.now(); schedule(); } };
    const start = (event: Event) => { if (isSurface(event)) { composing.current = true; hide(); } };
    const end = (event: Event) => { if (isSurface(event)) { composing.current = false; schedule(0); } };
    const key = (event: KeyboardEvent) => {
      if (!isSurface(event) || !current.current) return;
      const action = programRecallKey(event.key, current.current.navigation, current.current.rows.length, composing.current || event.isComposing || event.keyCode === 229,
        event.ctrlKey || event.metaKey || event.altKey || event.shiftKey);
      if (action.kind === 'dismiss') { event.preventDefault(); event.stopImmediatePropagation(); hide(true); }
      else if (action.kind === 'highlight') { event.preventDefault(); event.stopImmediatePropagation(); present({ ...current.current, navigation: action.index }); }
      else if (action.kind === 'select') { event.preventDefault(); event.stopImmediatePropagation(); choose(current.current.rows[action.index]); }
      else if (!['Shift', 'Control', 'Meta', 'Alt'].includes(event.key)) hide();
    };
    const leaving = (event: Event) => { if (isSurface(event)) hide(); };
    const pointer = (event: PointerEvent) => { if (!(event.target instanceof Element && event.target.closest('[data-task-recall]'))) hide(); };
    const storage = () => { try { suppressed.current = localStorage.getItem('flowme:alpha:task-recall') === 'off'; } catch { suppressed.current = false; } if (suppressed.current) hide(); };
    storage(); document.addEventListener('input', input, true); document.addEventListener('compositionstart', start, true); document.addEventListener('compositionend', end, true);
    document.addEventListener('keydown', key, true); document.addEventListener('focusout', leaving, true); document.addEventListener('pointerdown', pointer, true);
    window.addEventListener('resize', leaving); window.visualViewport?.addEventListener('resize', leaving); window.addEventListener('storage', storage);
    return () => { cancel(); portRef.current.coverBar(false); const area = portRef.current.surface();
      if (area?.getAttribute('aria-controls') === id) for (const name of ['role', 'aria-autocomplete', 'aria-expanded', 'aria-controls', 'aria-activedescendant']) area.removeAttribute(name);
      document.removeEventListener('input', input, true); document.removeEventListener('compositionstart', start, true); document.removeEventListener('compositionend', end, true);
      document.removeEventListener('keydown', key, true); document.removeEventListener('focusout', leaving, true); document.removeEventListener('pointerdown', pointer, true);
      window.removeEventListener('resize', leaving); window.visualViewport?.removeEventListener('resize', leaving); window.removeEventListener('storage', storage); };
    // The port is read through the ref; re-rendering the editor must not recreate native input listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (!active) hide(); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!active) { computer.current?.dispose(); computer.current = null; index.current = []; return; }
    index.current = []; hide(); let live = true, timer: ReturnType<typeof setTimeout>, idleJob: number | null = null;
    const run = () => {
      if (!live || suppressed.current) return;
      const quiet = performance.now() - inputAt.current;
      if (quiet < 300 || composing.current) { timer = setTimeout(run, 300); return; }
      computer.current ??= createProgramRecallComputer();
      void computer.current.run(source).then(rows => { if (!live) return; index.current = rows; if (!composing.current) schedule(); });
    };
    // Saved source identity only; no dependency on draft RAW or the per-key query.
    timer = setTimeout(() => { if (window.requestIdleCallback) idleJob = window.requestIdleCallback(run, { timeout: 1000 }); else run(); }, 300);
    return () => { live = false; clearTimeout(timer); if (idleJob !== null) window.cancelIdleCallback?.(idleJob); computer.current?.cancel(); index.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, source.ownerId, source.space, source.today]);
  useEffect(() => () => { computer.current?.dispose(); }, []);
  if (!view) return null;
  return createPortal(<aside data-task-recall data-phone={view.phone || undefined} className={styles.panel} aria-label="지난 할 일 불러오기"
    style={{ left: view.left, top: view.top, width: view.width }} onPointerDown={event => event.preventDefault()}>
    <header><span>지난 할 일에서 불러오기</span><button type="button" aria-label="불러오기 닫기" onClick={() => hide(true)}>×</button></header>
    <div id={id} role="listbox" aria-label="지난 할 일">{view.rows.map((row, index) => <button key={row.lineId} id={`${id}-${index}`} type="button" role="option" tabIndex={-1}
      aria-selected={view.navigation === index} data-recall-line={row.lineId} onClick={() => choose(row)} className={styles.row}>
      <span className={styles.mark}>{row.done ? '✓' : row.percent > 0 ? `${row.percent}%` : '○'}</span>
      <span className={styles.words}><strong>{row.title}</strong><small>{row.parentTitle ? `${row.parentTitle} · ` : ''}{row.done ? '끝냄 · ' : ''}{row.day ? programCalendarDate(row.day, view.frame.line.today, false) : '날짜 미정'}{row.due ? ` · D${programDaysBetween(view.frame.line.today, row.due) > 0 ? '−' : '+'}${Math.abs(programDaysBetween(view.frame.line.today, row.due))}` : ''}</small></span>
      <span className={styles.verb}>{row.done ? '새로 시작' : '이어 쓰기'}</span>
    </button>)}</div><footer>계속 치면 좁혀집니다 · ↓ 선택 · Esc 닫기</footer>
  </aside>, document.body);
}
