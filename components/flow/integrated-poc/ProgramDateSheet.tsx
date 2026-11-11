'use client';
import { useMemo, useState } from 'react';
import { programCalendarDate } from '@/lib/flow/integrated-poc/date-label';
import { programDateSheetChips, programMonthGrid, programMonthLabel, programShiftMonth } from '@/lib/flow/integrated-poc/date-sheet';
import { ProgramIcon } from './icons';
import styles from './ProgramDateSheet.module.css';

/** F9 W-MENU-24: ⋮ [고르기] — the quick chips and this month's calendar; a press moves the task there at once (the
 *  editor closes the sheet and offers 되돌리기, W-MENU-03). The time stays in 진행 [날짜·시간]. */
export function ProgramDateSheet(props: { title: string; summary: string; today: string; current: string | null;
  marked: ReadonlySet<string>; disabled?: boolean; blockedNote?: string | null; onPick: (date: string | null) => void }) {
  const [month, setMonth] = useState(() => props.today.slice(0, 7));
  const chips = useMemo(() => programDateSheetChips(props.today, props.current), [props.today, props.current]);
  const weeks = useMemo(() => programMonthGrid(month, props.today, props.current, props.marked), [month, props.today, props.current, props.marked]);
  return <section data-date-sheet className={styles.sheet}>
    <p className={styles.place}><strong>{props.title || '옮길 할 일'}</strong><span>{props.summary}</span></p>
    {props.blockedNote && <p className={styles.note} role="status">{props.blockedNote}</p>}
    <div className={styles.chips} role="group" aria-label="빠른 날짜">
      {chips.map(chip => <button type="button" key={chip.key} data-date-chip={chip.key} disabled={props.disabled || chip.off} onClick={() => props.onPick(chip.date)}>
        {chip.label}{chip.detail && <small>{chip.detail}</small>}</button>)}
    </div>
    <div className={styles.calendar}>
      <div className={styles.monthHead}>
        <button type="button" aria-label="이전 달" onClick={() => setMonth(value => programShiftMonth(value, -1))}><ProgramIcon name="back" size={20} /></button>
        <span aria-live="polite">{programMonthLabel(month)}</span>
        <button type="button" aria-label="다음 달" onClick={() => setMonth(value => programShiftMonth(value, 1))}><ProgramIcon name="right" size={20} /></button>
      </div>
      <div className={styles.weekdays} aria-hidden="true">{'일월화수목금토'.split('').map(day => <span key={day}>{day}</span>)}</div>
      <div className={styles.days} role="group" aria-label={`${programMonthLabel(month)} 날짜`}>
        {weeks.flat().map((cell, index) => cell ? <button type="button" key={cell.date} data-date={cell.date}
          className={[cell.past && styles.past, cell.today && styles.today, cell.current && styles.current].filter(Boolean).join(' ') || undefined}
          aria-current={cell.today ? 'date' : undefined} disabled={props.disabled || cell.current}
          aria-label={`${programCalendarDate(cell.date, props.today)}${cell.today ? ' 오늘' : ''}${cell.current ? ' 지금 날짜' : ''}${cell.marked ? ' 할 일 있음' : ''}`}
          onClick={() => props.onPick(cell.date)}>{cell.day}{cell.marked && <span className={styles.dot} aria-hidden="true" />}</button>
          : <span key={`pad-${index}`} aria-hidden="true" />)}
      </div>
      <p className={styles.legend}>● 그날 할 일이 있음 · 테두리 = 오늘 · 시간은 진행의 [날짜·시간]</p>
    </div>
  </section>;
}
