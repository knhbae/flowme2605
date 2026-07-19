'use client';

import type {
  CalendarUnscheduledSchedulePreview,
  CalendarUnscheduledTrayItem,
} from '@/lib/flow/calendar-unscheduled-tray';
import { FlowItemMultiSelect } from './FlowItemMultiSelect';

type CalendarUnscheduledTrayProps = {
  items: CalendarUnscheduledTrayItem[];
  selectedKeys: string[];
  targetDate: string;
  preview: CalendarUnscheduledSchedulePreview;
  expanded: boolean;
  variant: 'drawer' | 'sidebar';
  undo?: { count: number; targetDateLabel: string };
  onToggleExpanded: () => void;
  onToggleItem: (key: string) => void;
  onToggleAll: () => void;
  onTargetDateChange: (date: string) => void;
  onPlaceToday: () => void;
  onKeepAnytime: () => void;
  onApply: () => void;
  onUndo: () => void;
};

export function CalendarUnscheduledTray({
  items,
  selectedKeys,
  targetDate,
  preview,
  expanded,
  variant,
  undo,
  onToggleExpanded,
  onToggleItem,
  onToggleAll,
  onTargetDateChange,
  onPlaceToday,
  onKeepAnytime,
  onApply,
  onUndo,
}: CalendarUnscheduledTrayProps) {
  if (items.length === 0 && !undo) return null;
  const panelVisible = variant === 'sidebar' || expanded;
  const headerContent = (
    <>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-950">일정에 놓기</span>
        <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
          언제든 할 일
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-2">
        <span
          data-testid="my-flow-calendar-unscheduled-count"
          className="inline-flex min-w-7 justify-center rounded-md bg-blue-50 px-2 py-1 text-xs font-black text-blue-700"
        >
          {items.length}
        </span>
        {variant === 'drawer' ? (
          <span aria-hidden="true" className="text-sm font-bold text-slate-500">
            {expanded ? '−' : '+'}
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <section
      id="calendar-placement-queue"
      data-testid="my-flow-calendar-unscheduled-tray"
      data-layout={variant}
      className={variant === 'sidebar'
        ? 'min-w-0 self-start rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-4'
        : 'border-y border-slate-200 bg-white py-2'}
    >
      {variant === 'drawer' ? (
        <button
          type="button"
          data-testid="my-flow-calendar-unscheduled-toggle"
          className="flex min-h-11 w-full items-center justify-between gap-3 px-1 text-left"
          aria-expanded={expanded}
          onClick={onToggleExpanded}
        >
          {headerContent}
        </button>
      ) : (
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-100 pb-2">
          {headerContent}
        </div>
      )}

      {undo ? (
        <div
          data-testid="my-flow-calendar-unscheduled-undo"
          className="mt-2 flex min-h-11 items-center justify-between gap-3 border-l-2 border-blue-600 bg-blue-50 px-3 py-2"
          role="status"
        >
          <p className="text-sm font-semibold text-blue-950">
            {undo.count}개를 {undo.targetDateLabel}에 놓았습니다.
          </p>
          <button
            type="button"
            data-testid="my-flow-calendar-unscheduled-undo-action"
            className="shrink-0 rounded-md px-2 py-1 text-sm font-bold text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onUndo}
          >
            되돌리기
          </button>
        </div>
      ) : null}

      {panelVisible && items.length > 0 ? (
        <div className="mt-2 pt-1" data-testid="my-flow-calendar-unscheduled-panel">
          <div>
            <FlowItemMultiSelect
              items={items.map((item) => ({
                key: item.key,
                title: item.title,
                meta: `언제든 · ${item.flowTitle}`,
              }))}
              selectedKeys={selectedKeys}
              itemTestId="my-flow-calendar-unscheduled-item"
              selectionAriaLabel={(item) => `${item.title} 일정에 놓을 항목으로 선택`}
              onToggleItem={onToggleItem}
              onToggleAll={onToggleAll}
              maxHeightClassName={variant === 'sidebar' ? 'max-h-[36vh]' : 'max-h-64'}
            />
          </div>
          <div className="mt-3 grid gap-2">
            <p
              data-testid="my-flow-calendar-unscheduled-preview"
              className="text-xs font-semibold text-slate-600"
            >
              {preview.selectedCount > 0
                ? `${preview.selectedCount}개 선택`
                : '놓을 할 일을 선택하세요'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="my-flow-calendar-unscheduled-today"
                aria-label="선택한 할 일을 오늘 일정에 놓기"
                className="min-h-10 rounded-md bg-blue-700 px-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={preview.selectedCount === 0}
                onClick={onPlaceToday}
              >
                오늘
              </button>
              <button
                type="button"
                data-testid="my-flow-calendar-unscheduled-keep"
                aria-label="선택한 할 일을 언제든 할 일로 유지"
                className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300"
                disabled={preview.selectedCount === 0}
                onClick={onKeepAnytime}
              >
                언제든
              </button>
            </div>
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              다른 날짜
              <input
                type="date"
                data-testid="my-flow-calendar-unscheduled-date"
                className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                value={targetDate}
                onChange={(event) => onTargetDateChange(event.target.value)}
              />
            </label>
            <button
              type="button"
              data-testid="my-flow-calendar-unscheduled-apply"
              className="min-h-11 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!preview.canApply}
              onClick={onApply}
            >
              이 날짜에 놓기
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
