'use client';

import React, { useEffect, useId, useState } from 'react';
import styles from './ProgramFlowTodayBand.module.css';
import { ProgramFlowMark, ProgramIcon, programRepeatText } from './icons';
import { ProgramFlowThread } from './ProgramFlowThread';
import type { ProgramFlowThreadShape } from '@/lib/flow/integrated-poc/flow-thread';
import type { ProgramContinueKind } from '@/lib/flow/integrated-poc/continue-band';

/** F8 1단계 (CO-1, 11/10): '이어지는 일' — the Flow band of S11 (11/8) widened, one band only. Over a writing document, the
 *  open tasks dated today whose line is not in this document's today section (moved to today, another document, a
 *  folded old section, a Flow's copy, a repeat's round), checked where they are with the 오늘 list's own check; a checked
 *  row stays, faded, until the screen is left. The late ones are one summary line. Drawn only: nothing is written.
 *  One folded line by default ('이어지는 일 n · Flow n · first two titles'), the whole line a button, opened in place: up to
 *  five rows (check · title and where it was written, the source · [미루기]), then 'n개 더' and the late line. Opened is
 *  what this device remembers. Hidden while the phone's keyboard is up (the page's data-writing-keyboard). */
export type ProgramFlowBandRow = { id: string; title: string; kind: ProgramContinueKind;
  /** Where it was written and how it came to today ('11/7에 씀', '미룸', "‘회사’ 문서", '/ 집안일'). */
  meta: readonly string[];
  flowTitle: string | null; flowDocumentId: string | null; percent: number | null; done: boolean; busy: boolean;
  /** A repeat line's chip ("↻ 매주 토"); a finished round is done here, and stays so. */
  repeat: string | null };
export const PROGRAM_FLOW_BAND_ROWS = 5;
const OPEN_KEY = 'flowme-continue-band-open:v2';

export function ProgramFlowTodayBand(props: { rows: readonly ProgramFlowBandRow[]; open: number; flow: number; late: number; failed: string | null;
  thread?: ProgramFlowThreadShape | null; onCheck(id: string): void; onShowSource(id: string): void; onDefer(id: string): void; onShowToday(): void }) {
  const uid = useId();
  const [opened, setOpened] = useState(false);
  useEffect(() => { try { setOpened(localStorage.getItem(OPEN_KEY) === '1'); } catch { /* folded, then */ } }, []);
  const remember = (next: boolean) => { setOpened(next); try { if (next) localStorage.setItem(OPEN_KEY, '1'); else localStorage.removeItem(OPEN_KEY); } catch { /* this visit only */ } };
  if (!props.rows.length && !props.late) return null;
  const shown = props.rows.slice(0, PROGRAM_FLOW_BAND_ROWS), more = props.rows.length - shown.length;
  const summary = props.rows.filter(row => !row.done).slice(0, 2).map(row => row.title).join(' · ') || (props.late ? `밀린 일 ${props.late}개` : '');
  return <section className={styles.band} aria-labelledby={`${uid}-head`} data-flow-today-band data-continue-band data-opened={opened || undefined}>
    <h2 className={styles.heading}><button type="button" id={`${uid}-head`} className={styles.head} aria-expanded={opened} aria-controls={`${uid}-rows`} onClick={() => remember(!opened)}>
      <ProgramIcon name="today" size={18} className={styles.mark} /><span className={styles.label}>이어지는 일</span><span className={styles.count}>{props.open}</span>
      {props.flow > 0 && <span className={styles.flowCount} aria-label={`Flow ${props.flow}`}><ProgramFlowMark size={16} />{props.flow}</span>}
      {!opened && summary && <span className={styles.summary}>{summary}</span>}
      {props.thread && <ProgramFlowThread points={props.thread.points} done={props.thread.done} width={56} />}
      <span className={styles.chevron} aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d={opened ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span></button></h2>
    {opened && <div id={`${uid}-rows`}>
      {shown.length > 0 && <ul className={styles.rows}>{shown.map(row => <li key={row.id} data-band-task={row.id} data-kind={row.kind} data-done={row.done || undefined}>
        <button type="button" className={styles.check} aria-pressed={row.done} aria-busy={row.busy || undefined} disabled={row.busy || row.done && !!row.repeat}
          aria-label={`${row.title} ${row.busy ? '저장 중' : row.done ? row.repeat ? '이번 회차 끝냄' : '다시 열기' : '완료'}`} onClick={() => props.onCheck(row.id)}>
          <span aria-hidden="true" data-check={row.busy ? 'busy' : row.done ? 'done' : 'open'} /></button>
        {/* The words and where they were written are one button: the original line (its document opened there). */}
        <button type="button" className={styles.text} onClick={() => props.onShowSource(row.id)} aria-label={`${row.title} · ${row.flowTitle ?? row.meta.join(' · ')} · 원래 줄 보기`}>
          <span className={styles.title}>{row.title}{row.repeat && <span className={styles.chip}>{programRepeatText(row.repeat, 13)}</span>}</span>
          <small className={styles.meta}>{row.flowTitle && <span className={styles.flowName}>{row.flowTitle}</span>}
            {row.percent !== null && <span className={styles.percent}>{row.percent}%</span>}
            {row.meta.map((part, index) => <React.Fragment key={index}>{index || row.flowTitle ? ' · ' : ''}{index === 0 ? <u>{part}</u> : part}</React.Fragment>)}</small></button>
        {!row.done && <button type="button" className={styles.defer} onClick={() => props.onDefer(row.id)} aria-label={`${row.title} 미루기`}>미루기</button>}
        {props.failed === row.id && <p className={styles.failed} role="alert">체크하지 못했습니다. 다시 눌러 주세요</p>}
      </li>)}</ul>}
      {more > 0 && <button type="button" className={styles.foot} onClick={props.onShowToday}>{more}개 더 · 오늘 탭에서 보기<ProgramIcon name="right" size={16} /></button>}
      {props.late > 0 && <button type="button" className={styles.foot} data-late onClick={props.onShowToday}><span className={styles.late}>밀린 일 {props.late}개</span> · 오늘 탭에서 정리<ProgramIcon name="right" size={16} /></button>}
    </div>}
  </section>;
}
