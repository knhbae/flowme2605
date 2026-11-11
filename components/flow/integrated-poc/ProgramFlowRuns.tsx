'use client';
import React, { useEffect, useState } from 'react';
import { programCalendarDate, programDaysBetween } from '@/lib/flow/integrated-poc/date-label';
import { PROGRAM_FLOW_RUN_SHOWN, type ProgramFlowRun, type ProgramRecheck } from '@/lib/flow/integrated-poc/flow-run-progress';
import { ProgramFlowMark, ProgramIcon } from './icons';
import styles from './ProgramFlowRuns.module.css';

/** F12 1차 (W-FLOW-04·05·07, UX r3 C3·C4·E2·E3): over 오늘's list, one line per running Flow — its name, n/m, D-n or
 *  n일째, and 다음 (its box checks that line where it is written, as the list's own check does) or 기다림 (a checked step
 *  whose subcheck is open: no box). A phone shows 3, a tablet 5; the rest fold into 'Flow n개 더' (remembered here). */
export const PROGRAM_FLOW_RUNS_OPEN_KEY = 'flowme-flow-runs-open:v1';
export function programFlowRunNextLabel(date: string | null, today: string): string {
  if (!date) return '날짜 미정';
  const days = programDaysBetween(today, date);
  return days === 0 ? '오늘' : days === 1 ? '내일' : days < 0 ? `${programCalendarDate(date, today, false)} 지남` : programCalendarDate(date, today, false);
}
export function ProgramFlowRuns(props: { runs: readonly ProgramFlowRun[]; today: string; tablet: boolean;
  /** Steps being saved (their check pressed, not confirmed yet): '확인 중' beside the numbers (W-FLOW-05). */
  saving: ReadonlySet<string>;
  onCheck(run: ProgramFlowRun, taskId: string): void; onOpen(run: ProgramFlowRun): void }) {
  const [opened, setOpened] = useState(false);
  useEffect(() => { try { setOpened(localStorage.getItem(PROGRAM_FLOW_RUNS_OPEN_KEY) === '1'); } catch { /* folded, then */ } }, []);
  const remember = (next: boolean) => { setOpened(next); try { if (next) localStorage.setItem(PROGRAM_FLOW_RUNS_OPEN_KEY, '1'); else localStorage.removeItem(PROGRAM_FLOW_RUNS_OPEN_KEY); } catch { /* this visit only */ } };
  if (!props.runs.length) return null;
  const limit = props.tablet ? PROGRAM_FLOW_RUN_SHOWN.tablet : PROGRAM_FLOW_RUN_SHOWN.phone, folded = props.runs.length > limit && !opened;
  const shown = folded ? props.runs.slice(0, limit) : props.runs, rest = props.runs.slice(limit);
  const restWaiting = rest.filter(run => run.wait).length, restUndated = rest.filter(run => !run.wait && !run.next?.date).length;
  return <section className={styles.runs} aria-label="진행 중인 Flow" data-flow-runs>
    <ul className={styles.list}>{shown.map(run => {
      const busy = run.steps.some(step => props.saving.has(step.taskId));
      return <li key={run.key} data-flow-run={run.key} data-waiting={run.wait ? '' : undefined}>
        {run.wait ? <span className={styles.waitMark} aria-hidden="true"><ProgramIcon name="wait" size={18} /></span>
          : run.next && <button type="button" className={styles.check} aria-label={`${run.next.title} 완료`} aria-pressed={false} aria-busy={busy || undefined} disabled={busy}
            onClick={() => props.onCheck(run, run.next!.taskId)}><span aria-hidden="true" data-check={busy ? 'busy' : 'open'} /></button>}
        <button type="button" className={styles.text} onClick={() => props.onOpen(run)}
          aria-label={`${run.title} · ${run.done}/${run.total} · ${run.mark}${busy ? ' · 확인 중' : ''} · ${run.wait ? `기다림 ${run.wait.title}` : `다음 ${run.next?.title ?? ''}`} · 글 열기`}>
          <span className={styles.head}><ProgramFlowMark size={16} /><span className={styles.name}>{run.flow}{run.run && <span className={styles.runName} data-run-name> {run.run}</span>}</span>
            <span className={styles.count}>{run.done}/{run.total}</span>{busy && <span className={styles.checking}>확인 중</span>}<span className={styles.mark}>{run.mark}</span></span>
          <span className={styles.next}>{run.wait ? <>기다림: {run.wait.title}{run.wait.days ? ` (${run.wait.days}일째)` : ''}</>
            : run.next && <>다음: {run.next.title} · {programFlowRunNextLabel(run.next.date, props.today)}</>}</span>
        </button>
      </li>; })}</ul>
    {props.runs.length > limit && <button type="button" className={styles.fold} aria-expanded={!folded} onClick={() => remember(folded)}>
      {folded ? <>Flow {rest.length}개 더{restWaiting ? ` · 기다림 ${restWaiting}` : ''}{restUndated ? ` · 날짜 미정 ${restUndated}` : ''}<span>펼치기</span></> : <>접기<span>{limit}개만 보기</span></>}</button>}
  </section>;
}

/** W-FLOW-07·08 (UX r3 C3·D1): '다시 확인할 일' at the top of 오늘 — subchecks waiting on an answer whose day has come.
 *  The box checks the subcheck; [내일] moves only its day to look again (never the line, never a later step). */
export function ProgramRechecks(props: { rows: readonly ProgramRecheck[]; today: string; saving: ReadonlySet<string>;
  onCheck(row: ProgramRecheck): void; onTomorrow(row: ProgramRecheck): void; onOpen(row: ProgramRecheck): void }) {
  if (!props.rows.length) return null;
  return <section className={styles.rechecks} aria-labelledby="program-rechecks-title" data-rechecks>
    <h2 id="program-rechecks-title" className={styles.groupHead}>다시 확인할 일 <small>{props.rows.length}</small><span>[내일] = 다시 볼 날만</span></h2>
    <ul className={styles.list}>{props.rows.map(row => {
      const busy = props.saving.has(row.taskId);
      return <li key={row.taskId} data-recheck={row.taskId}>
        <button type="button" className={`${styles.check} ${styles.waitCheck}`} aria-label={`${row.title} 완료`} aria-pressed={false} aria-busy={busy || undefined} disabled={busy}
          onClick={() => props.onCheck(row)}><span aria-hidden="true" data-check={busy ? 'busy' : 'open'} /></button>
        <button type="button" className={styles.text} onClick={() => props.onOpen(row)} aria-label={`${row.title} · ${row.parentTitle} · 원래 줄 보기`}>
          <span className={styles.name}>{row.title}</span>
          <span className={styles.next}>{row.parentTitle}{row.days ? ` · 기다림 ${row.days}일째` : ''} · {row.docTitle}</span></button>
        <button type="button" className={styles.later} disabled={busy} onClick={() => props.onTomorrow(row)}>내일</button>
      </li>; })}</ul>
  </section>;
}
