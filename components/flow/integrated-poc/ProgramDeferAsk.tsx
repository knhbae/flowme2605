'use client';
import React, { useState } from 'react';
import { programCalendarDate } from '@/lib/flow/integrated-poc/date-label';
import type { ProgramDeferMode, ProgramDeferPlan } from '@/lib/flow/integrated-poc/flow-run-progress';
import styles from './ProgramDeferAsk.module.css';

/** F12 1차 (W-FLOW-09·10, UX r3 D2): a Flow step deferred past the next step's day — asked once per run: 겹칠 때만
 *  (default) / 간격 지키며 / 그대로, each with the dates it gives. A choice that would land a step after a last-day
 *  run's anchor is shown and cannot be chosen (W-FLOW-10). The choice is remembered on this device for this run. */
export const PROGRAM_DEFER_LABELS: Record<ProgramDeferMode, string> = { overlap: '겹칠 때만 밀기', 'keep-gaps': '간격 지키며 밀기', none: '뒤 단계 그대로' };
export function ProgramDeferAsk(props: { title: string; date: string; today: string; nextTitle: string; nextDate: string; anchor: string | null; last: boolean;
  plans: Record<ProgramDeferMode, ProgramDeferPlan>; onChoose(mode: ProgramDeferMode): void; onCancel(): void }) {
  const [mode, setMode] = useState<ProgramDeferMode>(() => props.plans.overlap.blocked ? (props.plans.none.blocked ? 'overlap' : 'none') : 'overlap');
  const day = (date: string | null) => date ? programCalendarDate(date, props.today) : '날짜 미정';
  const detail = (plan: ProgramDeferPlan, which: ProgramDeferMode) => {
    const later = plan.moves.slice(1);
    const parts = which === 'none' ? [`${props.nextTitle} ${day(props.nextDate)} 그대로 · ${props.title}보다 앞서게 됩니다`]
      : later.length ? later.map(move => `${move.title} ${day(move.from)} → ${day(move.to)}`) : ['뒤 단계는 그대로'];
    if (props.last && props.anchor) parts.push(`기준일 ${day(props.anchor)} 고정`);
    return parts.join(' · ');
  };
  return <div className={styles.ask} data-defer-ask>
    <h2 id="program-defer-title">{props.title} → {day(props.date)}</h2>
    <p className={styles.sub}>{props.nextTitle}({day(props.nextDate)})보다 늦어집니다. 뒤 단계는 어떻게 할까요? 이 Flow에서 한 번만 묻습니다.</p>
    <div role="radiogroup" aria-labelledby="program-defer-title" className={styles.options}>
      {(['overlap', 'keep-gaps', 'none'] as const).map(which => { const plan = props.plans[which];
        return <button type="button" key={which} role="radio" aria-checked={mode === which} disabled={!!plan.blocked} data-defer-mode={which}
          className={styles.option} onClick={() => setMode(which)}>
          <span className={styles.label}>{PROGRAM_DEFER_LABELS[which]}{which === 'overlap' && <span className={styles.tag}>기본</span>}</span>
          <span className={styles.detail}>{plan.blocked ? `${plan.blocked.title}이(가) 기준일 ${day(props.anchor)} 뒤로 가서 고를 수 없습니다` : detail(plan, which)}</span></button>; })}
    </div>
    <p className={styles.hint}>고른 방식은 이 기기에서 이 Flow에 기억합니다. [되돌리기] 한 번이면 모두 돌아갑니다.</p>
    <div className={styles.actions}><button type="button" onClick={props.onCancel}>취소</button>
      <button type="button" className={styles.primary} disabled={!!props.plans[mode].blocked} onClick={() => props.onChoose(mode)}>옮기기</button></div>
  </div>;
}
