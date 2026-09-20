'use client';
import React from 'react';
import { PROGRAM_ORDINARY_TIME_LIMITS, programOrdinaryTimingDraft, programOrdinaryTimingFromDraft, type ProgramOrdinaryTimingDraft } from '@/lib/flow/integrated-poc/public-ordinary-time';

export function ProgramPublicationTiming({ value, disabled, onChange, styles, purpose = 'publication' }: {
  value?: ProgramOrdinaryTimingDraft; disabled: boolean; onChange: (value: ProgramOrdinaryTimingDraft) => void;
  styles: Record<string, string>; purpose?: 'publication' | 'proposal';
}) {
  const current = value ?? programOrdinaryTimingDraft(), label = purpose === 'publication' ? '공개' : '제안';
  // Publication input locking must preserve an active IME composition.
  // The publisher's native-input port owns it, as for recurrence inputs.
  const readOnly = purpose === 'proposal' ? disabled : undefined;
  return <fieldset className={styles.two} aria-label={`${label} 시간·시간대`}>
    <label className={styles.field}>{label} 시간 · 선택<input type="text" readOnly={readOnly} placeholder="HH:mm" maxLength={PROGRAM_ORDINARY_TIME_LIMITS.time} data-publication-field="timing:time" value={current.time} onChange={event => onChange({ ...current, time: event.target.value })} /></label>
    <label className={styles.field}>{label} 시간대 · 선택<input type="text" readOnly={readOnly} placeholder="Asia/Tokyo" maxLength={PROGRAM_ORDINARY_TIME_LIMITS.timeZone} data-publication-field="timing:timeZone" value={current.timeZone} onChange={event => onChange({ ...current, timeZone: event.target.value })} /></label>
    {!programOrdinaryTimingFromDraft(current) && <p role="alert" className={styles.error}>시간은 HH:mm, 시간대는 Asia/Tokyo 같은 이름으로 입력해 주세요. {purpose === 'proposal' ? '입력을 유지하며 아직 제안을 보내지 않았습니다.' : '입력은 보관하며 이 상태로 공개하지 않습니다.'}</p>}
  </fieldset>;
}
