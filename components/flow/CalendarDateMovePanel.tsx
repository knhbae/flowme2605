'use client';

import type {
  CalendarDateMoveItem,
  CalendarDateMovePreview,
} from '@/lib/flow/calendar-date-move';
import { formatKoreanShortDate } from '@/lib/flow/date';
import { FlowItemMultiSelect } from './FlowItemMultiSelect';
import {
  FLOW_UI_COMPACT_ACTION_CLASS,
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_STATUS_INFO_CLASS,
  FLOW_UI_SURFACE_CLASS,
} from './flow-ui';

type CalendarDateMovePanelProps = {
  open: boolean;
  items: CalendarDateMoveItem[];
  selectedKeys: string[];
  targetDate: string;
  preview: CalendarDateMovePreview;
  undo?: { count: number; sourceDate: string; targetDate: string };
  onToggleItem: (key: string) => void;
  onToggleAll: () => void;
  onTargetDateChange: (date: string) => void;
  onApply: () => void;
  onCancel: () => void;
  onUndo: () => void;
};

export function CalendarDateMovePanel({
  open,
  items,
  selectedKeys,
  targetDate,
  preview,
  undo,
  onToggleItem,
  onToggleAll,
  onTargetDateChange,
  onApply,
  onCancel,
  onUndo,
}: CalendarDateMovePanelProps) {
  if (!open && !undo) return null;

  return (
    <div className="mt-3 grid gap-2">
      {undo ? (
        <div
          data-testid="my-flow-calendar-date-move-undo"
          className={`flex min-h-11 items-center justify-between gap-3 ${FLOW_UI_STATUS_INFO_CLASS}`}
          role="status"
        >
          <p className="text-sm font-semibold">
            {undo.count}개를 {formatKoreanShortDate(undo.targetDate)}로 옮겼습니다.
          </p>
          <button
            type="button"
            data-testid="my-flow-calendar-date-move-undo-action"
            aria-label={`${undo.count}개를 ${formatKoreanShortDate(undo.sourceDate)} 일정으로 되돌리기`}
            className={FLOW_UI_COMPACT_ACTION_CLASS}
            onClick={onUndo}
          >
            되돌리기
          </button>
        </div>
      ) : null}

      {open ? (
        <section data-testid="my-flow-calendar-date-move-panel" className={`p-3 ${FLOW_UI_SURFACE_CLASS}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-[#1B1A17]">일정 옮기기</h4>
              <p className="mt-0.5 text-xs font-medium text-[#6E6B64]">
                같은 날짜의 할 일을 골라 한 번에 옮깁니다.
              </p>
            </div>
            <button type="button" className={FLOW_UI_COMPACT_ACTION_CLASS} onClick={onCancel}>
              취소
            </button>
          </div>
          <div className="mt-2">
            <FlowItemMultiSelect
              items={items.map((item) => ({
                key: item.key,
                title: item.title,
                meta: `${item.kind === 'occurrence' ? '반복 회차' : '할 일'} · ${item.flowTitle}`,
              }))}
              selectedKeys={selectedKeys}
              itemTestId="my-flow-calendar-date-move-item"
              selectionAriaLabel={(item) => `${item.title} 날짜 옮길 항목으로 선택`}
              onToggleItem={onToggleItem}
              onToggleAll={onToggleAll}
              maxHeightClassName="max-h-56"
            />
          </div>
          <div className="mt-3 grid gap-2">
            <p data-testid="my-flow-calendar-date-move-preview" className="text-xs font-semibold text-[#6E6B64]">
              {preview.selectedCount > 0
                ? `${preview.selectedCount}개 · Flow ${preview.affectedFlowCount}개${preview.occurrenceCount > 0 ? ` · 반복 ${preview.occurrenceCount}회` : ''}${preview.sourceDate ? ` · ${formatKoreanShortDate(preview.sourceDate)}` : ''}${preview.targetDate ? ` → ${formatKoreanShortDate(preview.targetDate)}` : ''}`
                : '옮길 할 일을 선택하세요'}
            </p>
            <label className="grid gap-1 text-xs font-semibold text-[#6E6B64]">
              새 날짜
              <input
                type="date"
                data-testid="my-flow-calendar-date-move-target"
                className={FLOW_UI_INPUT_CLASS}
                value={targetDate}
                onChange={(event) => onTargetDateChange(event.target.value)}
              />
            </label>
            <button
              type="button"
              data-testid="my-flow-calendar-date-move-apply"
              className={FLOW_UI_PRIMARY_ACTION_CLASS}
              disabled={!preview.canApply}
              onClick={onApply}
            >
              {preview.selectedCount > 0 ? `선택한 ${preview.selectedCount}개 옮기기` : '선택한 할 일 옮기기'}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
