'use client';

import type {
  CalendarUnscheduledSchedulePreview,
  CalendarUnscheduledTrayItem,
} from '@/lib/flow/calendar-unscheduled-tray';
import { FlowItemMultiSelect } from './FlowItemMultiSelect';
import {
  FLOW_UI_COMPACT_ACTION_CLASS,
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
  FLOW_UI_STATUS_INFO_CLASS,
  FLOW_UI_SURFACE_CLASS,
} from './flow-ui';

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
        <span className="block text-sm font-semibold text-[#1B1A17]">날짜 정하기</span>
        <span className="mt-0.5 block truncate text-xs font-medium text-[#6E6B64]">
          날짜 없는 할 일
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-2">
        <span
          data-testid="my-flow-calendar-unscheduled-count"
          className="inline-flex min-w-7 justify-center rounded-md bg-[#F3F1EC] px-2 py-1 text-xs font-semibold text-[#5C5952]"
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
        ? `min-w-0 self-start p-3 lg:sticky lg:top-4 ${FLOW_UI_SURFACE_CLASS}`
        : 'border-y border-[#E7E4DD] bg-white py-2'}
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
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-[#E7E4DD] pb-2">
          {headerContent}
        </div>
      )}

      {undo ? (
        <div
          data-testid="my-flow-calendar-unscheduled-undo"
          className={`mt-2 flex min-h-11 items-center justify-between gap-3 ${FLOW_UI_STATUS_INFO_CLASS}`}
          role="status"
        >
          <p className="text-sm font-semibold">
            {undo.count}개를 {undo.targetDateLabel}에 놓았습니다.
          </p>
          <button
            type="button"
            data-testid="my-flow-calendar-unscheduled-undo-action"
            className={FLOW_UI_COMPACT_ACTION_CLASS}
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
                meta: `날짜 없음 · ${item.flowTitle}`,
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
              className="text-xs font-semibold text-[#6E6B64]"
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
                className={FLOW_UI_PRIMARY_ACTION_CLASS}
                disabled={preview.selectedCount === 0}
                onClick={onPlaceToday}
              >
                오늘
              </button>
              <button
                type="button"
                data-testid="my-flow-calendar-unscheduled-keep"
                aria-label="선택한 할 일을 날짜 없이 유지"
                className={FLOW_UI_SECONDARY_ACTION_CLASS}
                disabled={preview.selectedCount === 0}
                onClick={onKeepAnytime}
              >
                날짜 없이
              </button>
            </div>
            <label className="grid gap-1 text-xs font-semibold text-[#6E6B64]">
              다른 날짜
              <input
                type="date"
                data-testid="my-flow-calendar-unscheduled-date"
                className={FLOW_UI_INPUT_CLASS}
                value={targetDate}
                onChange={(event) => onTargetDateChange(event.target.value)}
              />
            </label>
            <button
              type="button"
              data-testid="my-flow-calendar-unscheduled-apply"
              className={FLOW_UI_PRIMARY_ACTION_CLASS}
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
