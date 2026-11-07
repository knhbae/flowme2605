'use client';

import React, { useEffect, useId, useState } from 'react';
import styles from './ProgramFlowTodayBand.module.css';

/** Flow pipeline S11 (11/8): over a writing document, today's and earlier unfinished tasks of the Flows I took, checked
 *  where they are. Drawn only: nothing is written into the document. The host gives the rows (the 오늘 list's own
 *  query and order) and checks with the 오늘 list's own check; a checked row stays, faded, until the screen is left.
 *  No rows, no band; hidden while the phone's keyboard is up (the page's data-writing-keyboard). */
export type ProgramFlowBandRow = { id: string; title: string; flowTitle: string; flowDocumentId: string; done: boolean; busy: boolean;
  /** A repeat line's chip ("↻ 매주 토"); a finished round is done here, and stays so. */
  repeat: string | null };
export const PROGRAM_FLOW_BAND_ROWS = 3;
const FOLD_KEY = 'flowme-flow-today-band-folded';

export function ProgramFlowTodayBand(props: { rows: readonly ProgramFlowBandRow[]; open: number; failed: string | null;
  onCheck(id: string): void; onOpenFlow(documentId: string): void; onShowToday(): void }) {
  const uid = useId();
  const [folded, setFolded] = useState(false);
  useEffect(() => { try { setFolded(localStorage.getItem(FOLD_KEY) === '1'); } catch { /* open, then */ } }, []);
  const fold = (next: boolean) => { setFolded(next); try { if (next) localStorage.setItem(FOLD_KEY, '1'); else localStorage.removeItem(FOLD_KEY); } catch { /* this visit only */ } };
  if (!props.rows.length) return null;
  const shown = props.rows.slice(0, PROGRAM_FLOW_BAND_ROWS), more = props.rows.length - shown.length;
  return <section className={styles.band} aria-labelledby={`${uid}-head`} data-flow-today-band data-folded={folded || undefined}>
    <div className={styles.head}><h2 id={`${uid}-head`}>오늘 Flow 할 일 · {props.open}</h2>
      <button type="button" className={styles.fold} aria-expanded={!folded} aria-controls={`${uid}-rows`} aria-label={folded ? '오늘 Flow 할 일 펼치기' : '오늘 Flow 할 일 접기'}
        onClick={() => fold(!folded)}><span aria-hidden="true">{folded ? '⌄' : '⌃'}</span></button></div>
    {!folded && <><ul id={`${uid}-rows`} className={styles.rows}>{shown.map(row => <li key={row.id} data-band-task={row.id} data-done={row.done || undefined}>
      <button type="button" className={styles.check} aria-pressed={row.done} aria-busy={row.busy || undefined} disabled={row.busy || row.done && !!row.repeat}
        aria-label={`${row.title} ${row.busy ? '저장 중' : row.done ? row.repeat ? '이번 회차 끝냄' : '다시 열기' : '완료'}`} onClick={() => props.onCheck(row.id)}>
        <span aria-hidden="true" data-check={row.busy ? 'busy' : row.done ? 'done' : 'open'}>{row.busy ? '…' : ''}</span></button>
      <span className={styles.title}>{row.title}{row.repeat && <span className={styles.chip}>{row.repeat}</span>}</span>
      <button type="button" className={styles.flow} onClick={() => props.onOpenFlow(row.flowDocumentId)} aria-label={`${row.flowTitle} 문서 열기`}>{row.flowTitle}</button>
      {props.failed === row.id && <p className={styles.failed} role="alert">체크하지 못했습니다. 다시 눌러 주세요</p>}
    </li>)}</ul>
      {more > 0 && <button type="button" className={styles.more} onClick={props.onShowToday}>{more}개 더 · 오늘에서 보기</button>}</>}
  </section>;
}
