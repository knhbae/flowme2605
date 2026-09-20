'use client';
import React from 'react';
import { programRecurringScheduleFromDraft, programRecurringScheduleLabel, projectProgramPublicRecurrence,
  type ProgramPublicationRecurrenceDraft } from '@/lib/flow/integrated-poc/public-recurrence-contract';

export function ProgramPublicationRecurrence({ value, disabled, onChange, styles, purpose = 'publication' }: {
  value: ProgramPublicationRecurrenceDraft; disabled: boolean; onChange: (value: ProgramPublicationRecurrenceDraft) => void;
  styles: Record<string, string>; purpose?: 'publication' | 'proposal';
}) {
  const schedule = programRecurringScheduleFromDraft(value);
  const preview = schedule?.start.kind === 'fixed' ? projectProgramPublicRecurrence({ itemId: 'publication-preview',
    startDate: schedule.start.date, rule: schedule.rule, limit: 4 }) : null;
  const edit = (key: keyof ProgramPublicationRecurrenceDraft, text: string) => onChange({ ...value, [key]: text });
  // Text locking belongs to the publisher's native-input port. Disabling the
  // ancestor fieldset would also disable an actively composing text control.
  return <fieldset className={styles.source}><legend>{purpose === 'proposal' ? '제안할 반복 일정' : '공개할 반복 일정'}</legend>
    <p>{purpose === 'proposal' ? '공개 원문에 제안할 규칙입니다.' : '원본의 반복 규칙입니다.'} 개인 실행에서 옮긴 날짜나 완료 기록은 포함하지 않습니다.</p>
    <label className={styles.field}>반복 규칙<input data-publication-field="recurrence:raw" value={value.raw} maxLength={500}
      onChange={event => edit('raw', event.target.value)} placeholder="예: 매주 화, 목" /></label>
    <label className={styles.field}>종료 횟수 또는 날짜 · 선택<input data-publication-field="recurrence:end" value={value.end} maxLength={100}
      onChange={event => edit('end', event.target.value)} placeholder="예: 8회 또는 2026-12-31" /></label>
    <label className={styles.field}>공개 시작일<select disabled={disabled} value={value.startKind} onChange={event => onChange({ ...value, startKind: event.target.value as ProgramPublicationRecurrenceDraft['startKind'], startValue: '' })}>
      <option value="undated">시작일 미정</option><option value="fixed">고정 시작일</option><option value="relative">개인 기준일로부터</option>
    </select></label>
    {value.startKind !== 'undated' && <label className={styles.field}>{value.startKind === 'fixed' ? '공개할 시작 날짜' : '기준일 차이 · 전날 -1, 다음 날 1'}
      <input type={value.startKind === 'fixed' ? 'date' : 'text'} inputMode={value.startKind === 'relative' ? 'numeric' : undefined}
        data-publication-field="recurrence:startValue" value={value.startValue} onChange={event => edit('startValue', event.target.value)} /></label>}
    <div className={styles.two}><label className={styles.field}>시간 · 선택<input type="time" data-publication-field="recurrence:time" value={value.time} onChange={event => edit('time', event.target.value)} /></label>
      <label className={styles.field}>시간대 · 선택<input data-publication-field="recurrence:timeZone" value={value.timeZone} maxLength={120} placeholder="예: Asia/Seoul" onChange={event => edit('timeZone', event.target.value)} /></label></div>
    {schedule ? <><p>{programRecurringScheduleLabel(schedule)}</p>
      {preview?.ok ? <p>첫 회차: {preview.projection.occurrences.map(row => row.date).join(', ')}. 원래 작성 도구의 규칙에 따라 명시한 시작일을 첫 회차로 포함합니다.</p>
        : <p>시작일 또는 개인 기준일을 정한 뒤 회차 날짜를 계산합니다.</p>}</>
      : <p className={styles.error} role="status">반복 규칙·종료·시작일·시간대를 확인해 주세요. {purpose === 'proposal' ? '입력을 유지하고 있습니다. 아직 제안을 보내지 않았습니다.' : '입력 중인 내용도 비공개 초안에 보관합니다.'}</p>}
  </fieldset>;
}
