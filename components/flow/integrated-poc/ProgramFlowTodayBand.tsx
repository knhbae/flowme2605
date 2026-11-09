'use client';

import React, { useEffect, useId, useState } from 'react';
import styles from './ProgramFlowTodayBand.module.css';
import { ProgramFlowMark, ProgramIcon, programRepeatText } from './icons';
import { ProgramFlowThread } from './ProgramFlowThread';
import type { ProgramFlowThreadShape } from '@/lib/flow/integrated-poc/flow-thread';

/** Flow pipeline S11 (11/8): over a writing document, today's and earlier unfinished tasks of the Flows I took, checked
 *  where they are. Drawn only: nothing is written into the document. The host gives the rows (the 오늘 list's own
 *  query and order) and checks with the 오늘 list's own check; a checked row stays, faded, until the screen is left.
 *  No rows, no band; hidden while the phone's keyboard is up (the page's data-writing-keyboard).
 *  Core3 P1 (X9, 11/8): one folded line by default — "오늘 Flow 할 일 2 · 첫 두 제목 ⌄", the whole line a button — opened
 *  in place (three rows, checks, 'Flow 이름 ›', 오늘에서 모두 보기). Opened is what this device remembers. */
export type ProgramFlowBandRow = { id: string; title: string; flowTitle: string; flowDocumentId: string; done: boolean; busy: boolean;
  /** A repeat line's chip ("↻ 매주 토"); a finished round is done here, and stays so. */
  repeat: string | null };
export const PROGRAM_FLOW_BAND_ROWS = 3;
const OPEN_KEY = 'flowme-flow-today-band-open:v1';

/** F6-B2 (목업 B): on flow-soft, the 흐름 마크, the count in teal, and the Flow's 실 when one Flow fills the band (`thread`). */
export function ProgramFlowTodayBand(props: { rows: readonly ProgramFlowBandRow[]; open: number; failed: string | null; thread?: ProgramFlowThreadShape | null;
  onCheck(id: string): void; onOpenFlow(documentId: string): void; onShowToday(): void }) {
  const uid = useId();
  const [opened, setOpened] = useState(false);
  useEffect(() => { try { setOpened(localStorage.getItem(OPEN_KEY) === '1'); } catch { /* folded, then */ } }, []);
  const remember = (next: boolean) => { setOpened(next); try { if (next) localStorage.setItem(OPEN_KEY, '1'); else localStorage.removeItem(OPEN_KEY); } catch { /* this visit only */ } };
  if (!props.rows.length) return null;
  const shown = props.rows.slice(0, PROGRAM_FLOW_BAND_ROWS), more = props.rows.length - shown.length;
  const summary = props.rows.filter(row => !row.done).slice(0, 2).map(row => row.title).join(' · ');
  return <section className={styles.band} aria-labelledby={`${uid}-head`} data-flow-today-band data-opened={opened || undefined}>
    <h2 className={styles.heading}><button type="button" id={`${uid}-head`} className={styles.head} aria-expanded={opened} aria-controls={`${uid}-rows`} onClick={() => remember(!opened)}>
      <ProgramFlowMark size={18} className={styles.mark} /><span className={styles.label}>오늘 Flow 할 일</span><span className={styles.count}>{props.open}</span>
      {!opened && summary && <span className={styles.summary}>{summary}</span>}
      {props.thread && <ProgramFlowThread points={props.thread.points} done={props.thread.done} width={56} />}
      <span className={styles.chevron} aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d={opened ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span></button></h2>
    {opened && <><ul id={`${uid}-rows`} className={styles.rows}>{shown.map(row => <li key={row.id} data-band-task={row.id} data-done={row.done || undefined}>
      <button type="button" className={styles.check} aria-pressed={row.done} aria-busy={row.busy || undefined} disabled={row.busy || row.done && !!row.repeat}
        aria-label={`${row.title} ${row.busy ? '저장 중' : row.done ? row.repeat ? '이번 회차 끝냄' : '다시 열기' : '완료'}`} onClick={() => props.onCheck(row.id)}>
        <span aria-hidden="true" data-check={row.busy ? 'busy' : row.done ? 'done' : 'open'} /></button>
      <span className={styles.title}>{row.title}{row.repeat && <span className={styles.chip}>{programRepeatText(row.repeat, 13)}</span>}</span>
      <button type="button" className={styles.flow} onClick={() => props.onOpenFlow(row.flowDocumentId)} aria-label={`${row.flowTitle} 문서 열기`}>{row.flowTitle}<ProgramIcon name="right" size={16} /></button>
      {props.failed === row.id && <p className={styles.failed} role="alert">체크하지 못했습니다. 다시 눌러 주세요</p>}
    </li>)}</ul>
      <button type="button" className={styles.more} onClick={props.onShowToday}>{more > 0 ? `${more}개 더 · 오늘에서 모두 보기` : '오늘에서 모두 보기'}</button></>}
  </section>;
}
