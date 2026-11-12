'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProgramPrivateSpace } from '@/lib/flow/integrated-poc/contract';
import { programId } from '@/lib/flow/integrated-poc/contract';
import { programCalendarDate } from '@/lib/flow/integrated-poc/date-label';
import { closeProgramAlreadyContinued, programAlreadyContinuedPlan, programFirstCleanupBefore, programFirstCleanupProof, programStalePlan, restoreProgramFirstCleanup,
  sendProgramStaleTasks, type ProgramContinuedClose, type ProgramFirstCleanupBefore, type ProgramStaleChoice } from '@/lib/flow/integrated-poc/first-cleanup';
import { programErrorMessage, type ProgramMutate } from '@/lib/flow/integrated-poc/ui-contract';
import { ProgramNoticeRow } from './ProgramNoticeRow';
import styles from './ProgramSpace.module.css';

/** 오늘 탭 처음 정리 (W-CARRY-13·15·18·19, 총괄 11/12, mockup ②). Shown once on this device for the account, when there
 *  is something to list: ② the lines already written again (closed as that day's record) and ③ 2주 넘은 일, line by line
 *  to 날짜 미정 or 휴지통. Each step is its own save with its own 되돌리기, kept under the list for this visit.
 *  (① merging same-content documents waits for 기획's rule.) */
export const PROGRAM_FIRST_CLEANUP_KEY = (actorId: string) => `flow:first-cleanup:v1:${actorId}`;
type Step = 'close' | 'stale';
type Done = { step: Step; text: string; before: ProgramFirstCleanupBefore | null; after: string; state: 'done' | 'undone' | 'refused' };

export function ProgramFirstCleanup(props: { actorId: string; space: ProgramPrivateSpace; today: string; disabled: boolean; mutate: ProgramMutate; onMessage(text: string): void }) {
  const { actorId, space, today } = props;
  const sheet = useRef<HTMLDialogElement | null>(null);
  const closePlan = useMemo(() => programAlreadyContinuedPlan(space, today), [space, today]);
  const stalePlan = useMemo(() => programStalePlan(space, today), [space, today]);
  const [left, setLeft] = useState<ReadonlySet<string>>(new Set()); // ② lines the person unticked
  const [choices, setChoices] = useState<ReadonlyMap<string, ProgramStaleChoice>>(new Map());
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<Done[]>([]);
  // Asked once on this device for the account (the first time there is something to list).
  useEffect(() => {
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { return; }
    const key = PROGRAM_FIRST_CLEANUP_KEY(actorId);
    if (!storage || storage.getItem(key) || (!closePlan.length && !stalePlan.length)) return;
    try { storage.setItem(key, today); } catch { return; }
    if (!sheet.current?.open) sheet.current?.showModal();
    // Asked when the 오늘 tab opens with something to list, not again on every change of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorId]);
  const choiceOf = (lineId: string) => choices.get(lineId) ?? 'undated';
  const chosenClose = closePlan.filter(entry => !left.has(entry.lineId));
  const counts = { undated: stalePlan.filter(line => choiceOf(line.lineId) === 'undated').length, trash: stalePlan.filter(line => line.trashable && choiceOf(line.lineId) === 'trash').length };
  async function save(step: Step, label: string, build: Parameters<ProgramMutate>[1], text: (count: string) => string) {
    if (pending || props.disabled) return;
    let before: ProgramFirstCleanupBefore | null = null, after = '';
    setPending(true);
    try {
      const result = await props.mutate(label, current => {
        const next = build(current);
        if (next.ok) { before = programFirstCleanupBefore(current.spaces[actorId]); after = programFirstCleanupProof(next.data.spaces[actorId]); }
        return next;
      }, { history: true, awaitAutomaticRead: true });
      if (result.ok && before) setDone(current => [...current.filter(entry => entry.step !== step), { step, text: text(String(result.result ?? '')), before, after, state: 'done' }]);
      else if (!result.ok && result.reason === 'conflict') props.onMessage('그사이 바뀐 줄이 있어 정리하지 않았습니다. 목록을 다시 확인해 주세요.');
      else if (!result.ok && result.reason !== 'busy') props.onMessage(`${programErrorMessage(result.reason)} (${result.reason})`);
    } finally { setPending(false); }
  }
  const closeLines = () => save('close', '다시 쓴 일 정리', current => closeProgramAlreadyContinued(current, { actorId, requestId: programId('first-cleanup'), expectedSpace: current.spaces[actorId], today, lines: chosenClose }),
    count => `다시 쓴 일 ${count}줄 정리함`);
  const sendStale = () => save('stale', '2주 넘은 일 정리', current => sendProgramStaleTasks(current, { actorId, requestId: programId('first-cleanup'), expectedSpace: current.spaces[actorId], today, now: new Date().toISOString(),
    lines: stalePlan.map(line => ({ lineId: line.lineId, choice: line.trashable ? choiceOf(line.lineId) : 'undated' })) }),
    () => [counts.undated ? `${counts.undated}줄 날짜 미정으로 보냄` : '', counts.trash ? `${counts.trash}줄 휴지통으로 보냄` : ''].filter(Boolean).join(' · '));
  async function undo(entry: Done) {
    if (!entry.before || pending) return;
    const before = entry.before;
    setPending(true);
    try {
      const result = await props.mutate('처음 정리 되돌리기', current => restoreProgramFirstCleanup(current, { actorId, requestId: programId('first-cleanup-undo'), expectedSpace: current.spaces[actorId], before, after: entry.after }),
        { history: true, awaitAutomaticRead: true });
      const state = result.ok ? 'undone' : !result.ok && result.reason === 'conflict' ? 'refused' : null;
      if (state) setDone(current => current.map(item => item === entry ? { ...item, before: null, state } : item));
      else if (!result.ok && result.reason !== 'busy') props.onMessage(`${programErrorMessage(result.reason)} (${result.reason})`);
    } finally { setPending(false); }
  }
  const day = (date: string) => programCalendarDate(date, today, false);
  const byDay = (lines: ProgramContinuedClose[]) => [...new Set(lines.map(line => line.day))].map(date => [date, lines.filter(line => line.day === date)] as const);
  const noticeText = (entry: Done) => entry.state === 'undone' ? '정리 전으로 되돌렸습니다' : entry.state === 'refused' ? '그 뒤 바뀐 줄이 있어 되돌리지 않았습니다' : entry.text;
  return <>
    {done.length > 0 && <div className={styles.orderNotice} data-first-cleanup-done>{done.map(entry => <ProgramNoticeRow key={entry.step}
      notice={{ tone: entry.state === 'refused' ? 'warn' : entry.state === 'done' ? 'choose' : 'info', text: noticeText(entry), actions: entry.state === 'done' && !pending ? [{ label: '되돌리기', run: () => void undo(entry) }] : [] }}
      onClose={() => setDone(current => current.filter(item => item !== entry))} />)}</div>}
    <dialog ref={sheet} className={`${styles.findDialog} ${styles.carrySheet}`} aria-labelledby="program-first-cleanup-title" data-first-cleanup
      onCancel={event => { event.preventDefault(); sheet.current?.close(); }}>
      <div className={styles.findHeading}><h2 id="program-first-cleanup-title">처음 한 번 정리</h2><button type="button" onClick={() => sheet.current?.close()}>닫기</button></div>
      {closePlan.length > 0 && <section className={styles.carrySection} aria-label="다시 쓴 일" data-first-cleanup-close>
        <h3>다시 쓴 일 {closePlan.length}줄</h3>
        <p className={styles.muted}>같은 제목을 그 뒤 날짜에 다시 썼습니다. 정리하면 지난 줄에 [&gt;]와 - 이어감: 다시 쓴 날이 붙고 밀린 일에서 빠집니다.</p>
        <ul>{byDay(closePlan).map(([date, lines]) => <li key={date} className={styles.carryItem}><p><span>{day(date)} · {lines.length}줄</span></p>
          <ul className={styles.firstCleanupLines}>{lines.map(line => <li key={line.lineId}><label><input type="checkbox" checked={!left.has(line.lineId)} data-first-cleanup-line={line.lineId}
            onChange={event => setLeft(current => { const next = new Set(current); if (event.target.checked) next.delete(line.lineId); else next.add(line.lineId); return next; })} />
            {line.title} <small>→ {Number(line.to.slice(5, 7))}/{Number(line.to.slice(8, 10))}</small></label></li>)}</ul></li>)}</ul>
        <div className={styles.carryActions}><button type="button" className={styles.carryMove} data-first-cleanup-close-apply disabled={pending || props.disabled || !chosenClose.length}
          aria-busy={pending || undefined} onClick={() => void closeLines()}>다시 쓴 것으로 정리 · {chosenClose.length}</button></div>
      </section>}
      {stalePlan.length > 0 && <section className={styles.carrySection} aria-label="2주 넘게 손대지 않은 일" data-first-cleanup-stale>
        <h3>2주 넘게 손대지 않은 일 {stalePlan.length}줄</h3>
        <p className={styles.muted}>줄마다 [날짜 미정](언젠가 할 일, 기본)이나 [휴지통](다시 할 일이 거의 없음)을 고릅니다. 휴지통은 지우기가 아니라 따로 모아 두는 것이고 언제든 되살립니다.</p>
        <div className={styles.carryActions}>
          <button type="button" onClick={() => setChoices(new Map(stalePlan.map(line => [line.lineId, 'undated' as const])))}>모두 날짜 미정으로</button>
          <button type="button" onClick={() => setChoices(new Map(stalePlan.map(line => [line.lineId, line.trashable ? 'trash' as const : 'undated' as const])))}>모두 휴지통</button>
        </div>
        <ul>{stalePlan.map(line => <li key={line.lineId} className={styles.carryItem} data-first-cleanup-stale-line={line.lineId}>
          <p><span>{line.title}</span><small>{Number(line.day.slice(5, 7))}/{Number(line.day.slice(8, 10))} · /{line.folder || '폴더 없음'}</small></p>
          <div className={styles.carryChoices} role="radiogroup" aria-label={`${line.title} 정리`}>
            {(['undated', 'trash'] as const).map(choice => <button key={choice} type="button" role="radio" aria-checked={choiceOf(line.lineId) === choice}
              disabled={choice === 'trash' && !line.trashable} onClick={() => setChoices(current => new Map(current).set(line.lineId, choice))}>{choice === 'undated' ? '날짜 미정' : '휴지통'}</button>)}
          </div></li>)}</ul>
        <div className={styles.carryActions}><button type="button" className={styles.carryMove} data-first-cleanup-stale-apply disabled={pending || props.disabled}
          aria-busy={pending || undefined} onClick={() => void sendStale()}>적용 · 날짜 미정 {counts.undated} · 휴지통 {counts.trash}</button></div>
      </section>}
      {!closePlan.length && !stalePlan.length && <p className={styles.muted}>정리할 줄이 없습니다.</p>}
    </dialog>
  </>;
}
