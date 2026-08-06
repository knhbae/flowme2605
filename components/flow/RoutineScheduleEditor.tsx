'use client';

import React from 'react';

import type { SavedFlowRoutineDefinition, SavedFlowRoutineEnd } from '@/lib/flow/storage';

export type RoutineScheduleEditorValue = {
  weekdays: string[];
  definition: SavedFlowRoutineDefinition;
};

type RoutineScheduleEditorProps = {
  value: RoutineScheduleEditorValue;
  onChange: (value: RoutineScheduleEditorValue) => void;
  sourceDurationDays?: number;
  disabled?: boolean;
  compact?: boolean;
  testId?: string;
};

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

function updateEnd(
  value: RoutineScheduleEditorValue,
  end: SavedFlowRoutineEnd,
): RoutineScheduleEditorValue {
  return {
    ...value,
    definition: { ...value.definition, end },
  };
}

function formatSourceDuration(days?: number): string {
  if (!days) return '';
  return days % 7 === 0 ? `원문 기준 ${days / 7}주` : `원문 기준 ${days}일`;
}

function getPreviewPolicy(
  definition: SavedFlowRoutineDefinition,
  sourceDurationDays?: number,
): string {
  if (definition.end.mode === 'source' && sourceDurationDays) {
    return `전체 일정 · ${formatSourceDuration(sourceDurationDays)}`;
  }
  if (definition.end.mode === 'until') return '전체 일정 · 선택한 종료일까지';
  if (definition.end.mode === 'count') return `전체 일정 · ${definition.end.count}회까지`;
  return '다음 4주 미리보기 · 반복은 계속';
}

export function RoutineScheduleEditor({
  value,
  onChange,
  sourceDurationDays,
  disabled = false,
  compact = false,
  testId = 'routine-schedule-editor',
}: RoutineScheduleEditorProps) {
  const { definition } = value;
  const endMode = definition.end.mode;
  const timeMode = definition.time ? 'timed' : 'all-day';
  const fieldClassName = 'mt-1 min-h-10 w-full rounded-md border border-[var(--flowme-border)] bg-white px-3 py-2 text-sm text-[var(--flowme-text)] outline-none focus:border-[var(--flowme-action)] focus:ring-2 focus:ring-[var(--flowme-focus)] disabled:bg-slate-50 disabled:text-slate-400';

  return (
    <fieldset
      data-testid={testId}
      data-p30-marker="P30-ROUTINE-ADVANCED-DENSITY"
      className={`min-w-0 ${compact ? 'grid gap-3' : 'grid gap-4'}`}
      disabled={disabled}
    >
      <legend className="sr-only">반복 일정 설정</legend>

      <section data-testid={`${testId}-when-group`} aria-labelledby={`${testId}-when-heading`} className="grid gap-3">
        <h3 id={`${testId}-when-heading`} className="text-xs font-semibold text-[var(--flowme-text-secondary)]">언제</h3>
        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[var(--flowme-text)]">반복 요일</span>
            <span data-testid={`${testId}-frequency-summary`} className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
              주 {value.weekdays.length}회
            </span>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((weekday) => {
              const checked = value.weekdays.includes(weekday);
              return (
                <label
                  key={weekday}
                  className={`relative flex min-h-10 min-w-0 cursor-pointer items-center justify-center rounded-md border text-xs font-semibold focus-within:ring-2 focus-within:ring-[var(--flowme-focus)] ${checked ? 'border-[var(--flowme-action)] bg-blue-50 text-[var(--flowme-action)]' : 'border-[var(--flowme-border)] bg-white text-[var(--flowme-text-secondary)]'}`}
                >
                  <input
                    className="absolute inset-0 cursor-pointer opacity-0"
                    type="checkbox"
                    aria-label={`반복 요일 ${weekday}`}
                    checked={checked}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...value.weekdays, weekday].filter((entry, index, entries) => entries.indexOf(entry) === index)
                        : value.weekdays.filter((entry) => entry !== weekday);
                      if (next.length > 0) onChange({ ...value, weekdays: next });
                    }}
                  />
                  <span aria-hidden="true">{weekday}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-[var(--flowme-text)]">
            실행 시간
            <select
              data-testid={`${testId}-time-mode`}
              className={fieldClassName}
              value={timeMode}
              onChange={(event) => {
                if (event.target.value === 'timed') {
                  onChange({
                    ...value,
                    definition: {
                      ...definition,
                      time: definition.time ?? '09:00',
                      durationMinutes: definition.durationMinutes ?? 30,
                    },
                  });
                  return;
                }
                const { time: _time, durationMinutes: _duration, ...allDayDefinition } = definition;
                onChange({ ...value, definition: allDayDefinition });
              }}
            >
              <option value="all-day">시간 정하지 않음</option>
              <option value="timed">시간 지정</option>
            </select>
          </label>
          {definition.time ? (
            <label className="block text-sm font-semibold text-[var(--flowme-text)]">
              시작 시간
              <input
                data-testid={`${testId}-time`}
                aria-label="반복 시작 시간"
                className={fieldClassName}
                type="time"
                value={definition.time}
                onChange={(event) => onChange({
                  ...value,
                  definition: { ...definition, time: event.target.value },
                })}
              />
            </label>
          ) : null}
        </div>

        {definition.time ? (
          <label className="block text-sm font-semibold text-[var(--flowme-text)] sm:max-w-xs">
            예상 시간
            <select
              data-testid={`${testId}-duration`}
              className={fieldClassName}
              value={definition.durationMinutes ?? 30}
              onChange={(event) => onChange({
                ...value,
                definition: { ...definition, durationMinutes: Number(event.target.value) },
              })}
            >
              {[15, 30, 45, 60, 90, 120].map((minutes) => (
                <option key={minutes} value={minutes}>{minutes}분</option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      <section data-testid={`${testId}-end-group`} aria-labelledby={`${testId}-end-heading`} className="grid gap-3 border-t border-[var(--flowme-border)] pt-3">
        <h3 id={`${testId}-end-heading`} className="text-xs font-semibold text-[var(--flowme-text-secondary)]">언제 끝</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-[var(--flowme-text)]">
            반복 종료
            <select
              data-testid={`${testId}-end-mode`}
              className={fieldClassName}
              value={endMode}
              onChange={(event) => {
                const mode = event.target.value as SavedFlowRoutineEnd['mode'];
                if (mode === 'source') onChange(updateEnd(value, { mode: 'source' }));
                if (mode === 'none') onChange(updateEnd(value, { mode: 'none' }));
                if (mode === 'until') onChange(updateEnd(value, { mode: 'until', date: definition.end.mode === 'until' ? definition.end.date : '' }));
                if (mode === 'count') onChange(updateEnd(value, { mode: 'count', count: definition.end.mode === 'count' ? definition.end.count : 12 }));
              }}
            >
              {sourceDurationDays ? <option value="source">{formatSourceDuration(sourceDurationDays)}</option> : null}
              <option value="none">계속 반복</option>
              <option value="until">날짜까지</option>
              <option value="count">횟수까지</option>
            </select>
          </label>
          {endMode === 'until' ? (
            <label className="block text-sm font-semibold text-[var(--flowme-text)]">
              종료일
              <input
                data-testid={`${testId}-end-date`}
                aria-label="반복 종료일"
                className={fieldClassName}
                type="date"
                value={definition.end.date}
                onChange={(event) => onChange(updateEnd(value, { mode: 'until', date: event.target.value }))}
              />
            </label>
          ) : null}
          {endMode === 'count' ? (
            <label className="block text-sm font-semibold text-[var(--flowme-text)]">
              전체 횟수
              <input
                data-testid={`${testId}-occurrence-count`}
                aria-label="전체 반복 횟수"
                className={fieldClassName}
                type="number"
                min={1}
                max={10000}
                step={1}
                value={definition.end.count}
                onChange={(event) => onChange(updateEnd(value, {
                  mode: 'count',
                  count: Math.min(10000, Math.max(1, Number(event.target.value) || 1)),
                }))}
              />
            </label>
          ) : null}
        </div>

        <p data-testid={`${testId}-preview-policy`} className="text-xs font-medium text-[var(--flowme-text-secondary)]">
          {getPreviewPolicy(definition, sourceDurationDays)}
        </p>
      </section>
    </fieldset>
  );
}
