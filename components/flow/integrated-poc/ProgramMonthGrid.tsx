'use client';

import React, { useEffect, useRef, useState } from 'react';
import { programMonthGrid, programMonthKeyTarget } from '@/lib/flow/integrated-poc/month-grid';
import type { ProgramOrderedExecutionRow } from '@/lib/flow/integrated-poc/recurrence-order';
import styles from './ProgramMonthGrid.module.css';

/** C5 (10-month-calendar.md 2·5): the month as a Monday-first grid of the list's own rows. Only the focused day takes
 *  Tab; arrows, Home/End and PageUp/PageDown move it (past the month's edge the chosen day, and so the month, moves),
 *  Enter, Space or a press opens the day. Days outside the month stay blank. Narrow cells show dots, wide ones titles. */
export function ProgramMonthGrid(props: { rows: readonly ProgramOrderedExecutionRow[]; date: string; today: string; titles: boolean;
  onPick: (day: string, open: boolean) => void }) {
  const grid = programMonthGrid(props.rows, props.date, props.today, props.date);
  const [focusDate, setFocusDate] = useState(props.date);
  const box = useRef<HTMLDivElement | null>(null), moved = useRef(false);
  useEffect(() => { setFocusDate(props.date); }, [props.date]);
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    box.current?.querySelector<HTMLButtonElement>(`[data-month-day="${focusDate}"]`)?.focus();
  }, [focusDate, props.date]);
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); props.onPick(focusDate, true); return; }
    const target = programMonthKeyTarget(focusDate, event.key);
    if (!target) return;
    event.preventDefault(); moved.current = true;
    if (target.slice(0, 7) !== props.date.slice(0, 7)) props.onPick(target, false);
    setFocusDate(target);
  }
  return <div ref={box} className={styles.month} data-titles={props.titles || undefined}>
    <div className={styles.weekdays} aria-hidden="true">{grid.weekdays.map(day => <span key={day}>{day}</span>)}</div>
    <div className={styles.grid} role="group" aria-label={`${grid.title} 달력`} onKeyDown={onKeyDown}>
      {grid.weeks.flat().map((cell, index) => cell
        ? <button key={cell.date} type="button" className={styles.day} data-month-day={cell.date} data-today={cell.today || undefined} data-selected={cell.selected || undefined}
          tabIndex={cell.date === focusDate ? 0 : -1} aria-label={cell.label} aria-current={cell.today ? 'date' : undefined}
          onFocus={() => setFocusDate(cell.date)} onClick={() => { setFocusDate(cell.date); props.onPick(cell.date, true); }}>
          <span className={styles.number} aria-hidden="true">{cell.day}</span>
          {props.titles
            ? <span className={styles.titles} aria-hidden="true">{cell.titles.map((title, at) => <span key={at} data-state={title.state}>{title.text}</span>)}
              {cell.titleMore > 0 && <span className={styles.more}>+{cell.titleMore}</span>}</span>
            : <span className={styles.dots} aria-hidden="true">{cell.dots.map((dot, at) => <i key={at} data-state={dot} />)}
              {cell.more > 0 && <span className={styles.more}>+{cell.more}</span>}</span>}
        </button>
        : <span key={`blank-${index}`} className={styles.blank} aria-hidden="true" />)}
    </div>
  </div>;
}
