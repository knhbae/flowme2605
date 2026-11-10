'use client';

import type { ProgramNoticeAction, ProgramNoticeTone } from '@/lib/flow/integrated-poc/program-notice';
import styles from './ProgramNoticeRow.module.css';
import { ProgramIcon } from './icons';

/** W15: one notice row for writing (and later 오늘·분류): a 3px band by tone, one or two lines of text, at most
 *  two text buttons and ×. It never takes focus (pointer presses are prevented) and announces once (status).
 *  Its order and lifetime rules live in lib/flow/integrated-poc/program-notice.ts. */
export interface ProgramNoticeView {
  text: string; tone: ProgramNoticeTone; actions?: ProgramNoticeAction[];
  /** 저장 재설계 B: a second line under the text (K2 "할 일 2개가 오늘로", a held line's "다른 줄은 저장됩니다"). */
  detail?: string;
  /** Notices waiting behind this one. */
  more?: number;
  /** The × label; the move notice has no × (its 이동 취소 ends it). */
  closeLabel?: string | null;
  /** C2: a row of choices under the text (the check notice's percents); `current` is the value it already has. */
  chips?: (ProgramNoticeAction & { current?: boolean })[];
}

const keepFocus = (event: React.PointerEvent) => { event.preventDefault(); };

export function ProgramNoticeRow({ notice, onClose }: { notice: ProgramNoticeView; onClose?: () => void }) {
  return <div className={styles.row} data-tone={notice.tone} role="status" data-notice-row>
    <span className={styles.text}>{notice.text}{notice.more ? <small className={styles.more}> · {notice.more}개 더</small> : null}{notice.detail ? <small className={styles.detail}>{notice.detail}</small> : null}</span>
    {(notice.actions ?? []).slice(0, 2).map(action =>
      <button key={action.label} type="button" className={styles.action} onPointerDown={keepFocus} onClick={action.run}>{action.label}</button>)}
    {notice.closeLabel !== null && onClose && <button type="button" className={styles.close} aria-label={notice.closeLabel ?? '안내 닫기'} onPointerDown={keepFocus} onClick={onClose}><ProgramIcon name="close" size={20} /></button>}
    {!!notice.chips?.length && <div className={styles.chips}>{notice.chips.map(chip =>
      <button key={chip.label} type="button" className={styles.chip} aria-pressed={chip.current || undefined} disabled={chip.current} onPointerDown={keepFocus} onClick={chip.run}>{chip.label}</button>)}</div>}
  </div>;
}
