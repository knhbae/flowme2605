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
  undo?: { count: number; targetDateLabel: string };
  onToggleExpanded: () => void;
  onToggleItem: (key: string) => void;
  onToggleAll: () => void;
  onTargetDateChange: (date: string) => void;
  onApply: () => void;
  onUndo: () => void;
};

export function CalendarUnscheduledTray({
  items,
  selectedKeys,
  targetDate,
  preview,
  expanded,
  undo,
  onToggleExpanded,
  onToggleItem,
  onToggleAll,
  onTargetDateChange,
  onApply,
  onUndo,
}: CalendarUnscheduledTrayProps) {
  if (items.length === 0 && !undo) return null;
  return (
    <section
      data-testid="my-flow-calendar-unscheduled-tray"
      className="mb-3 border-y border-slate-200 bg-white py-2 sm:mb-4 sm:py-3"
    >
      <button
        type="button"
        data-testid="my-flow-calendar-unscheduled-toggle"
        className="flex min-h-11 w-full items-center justify-between gap-3 px-1 text-left"
        aria-expanded={expanded}
        onClick={onToggleExpanded}
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-950">날짜 없음</span>
          <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
            {items.length > 0 ? '캘린더에 놓을 할 일' : '모두 캘린더에 놓았습니다'}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-2">
          <span
            data-testid="my-flow-calendar-unscheduled-count"
            className="inline-flex min-w-7 justify-center rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700"
          >
            {items.length}
          </span>
          <span aria-hidden="true" className="text-sm font-bold text-slate-500">
            {expanded ? '−' : '+'}
          </span>
        </span>
      </button>

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

      {expanded && items.length > 0 ? (
        <div className="mt-2 border-t border-slate-100 pt-2" data-testid="my-flow-calendar-unscheduled-panel">
          <div className="px-1">
            <FlowItemMultiSelect
              items={items.map((item) => ({ key: item.key, title: item.title, meta: item.flowTitle }))}
              selectedKeys={selectedKeys}
              itemTestId="my-flow-calendar-unscheduled-item"
              selectionAriaLabel={(item) => `${item.title} 날짜 지정 대상으로 선택`}
              onToggleItem={onToggleItem}
              onToggleAll={onToggleAll}
            />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(180px,240px)_1fr_auto] sm:items-end">
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              놓을 날짜
              <input
                type="date"
                data-testid="my-flow-calendar-unscheduled-date"
                className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                value={targetDate}
                onChange={(event) => onTargetDateChange(event.target.value)}
              />
            </label>
            <p
              data-testid="my-flow-calendar-unscheduled-preview"
              className="text-xs font-semibold text-slate-600 sm:pb-3"
            >
              {preview.selectedCount > 0
                ? `${preview.selectedCount}개 · ${preview.affectedFlowCount}개 Flow`
                : '먼저 할 일을 선택하세요'}
            </p>
            <button
              type="button"
              data-testid="my-flow-calendar-unscheduled-apply"
              className="min-h-11 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!preview.canApply}
              onClick={onApply}
            >
              날짜에 놓기
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
