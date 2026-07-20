'use client';

import {
  buildFlowExportScopePlan,
  type FlowExportDestination,
  type FlowExportScope,
  type FlowExportScopeItem,
  type FlowExportScopePlan,
} from '@/lib/flow/export-scope';
import { FlowItemMultiSelect } from './FlowItemMultiSelect';
import {
  FLOW_UI_ICON_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
  FLOW_UI_SEGMENTED_CLASS,
  FLOW_UI_SEGMENT_ACTIVE_CLASS,
  FLOW_UI_SEGMENT_IDLE_CLASS,
} from './flow-ui';

export type FlowExportPanelItem = FlowExportScopeItem & {
  meta?: string;
  calendarSeriesId?: string;
  calendarVisibleOccurrenceCount?: number;
};

type FlowExportPanelProps = {
  flowTitle: string;
  items: FlowExportPanelItem[];
  open: boolean;
  scope: Exclude<FlowExportScope, 'item'>;
  selectedKeys: string[];
  feedback?: string;
  legacyPersonalDraft?: boolean;
  showEntry?: boolean;
  onOpenChange: (open: boolean) => void;
  onScopeChange: (scope: Exclude<FlowExportScope, 'item'>) => void;
  onSelectedKeysChange: (keys: string[]) => void;
  onExport: (destination: FlowExportDestination, plan: FlowExportScopePlan) => void;
};

const destinationCopy: Record<FlowExportDestination, { label: string; result: string }> = {
  calendar: { label: '캘린더 파일', result: '날짜 있는 항목' },
  checklist: { label: '체크리스트 복사', result: '선택 범위' },
  sheet: { label: '시트로 복사', result: '선택 범위' },
  memo: { label: '메모로 복사', result: '선택 범위' },
};

export function FlowExportPanel({
  flowTitle,
  items,
  open,
  scope,
  selectedKeys,
  feedback,
  legacyPersonalDraft = false,
  showEntry = true,
  onOpenChange,
  onScopeChange,
  onSelectedKeysChange,
  onExport,
}: FlowExportPanelProps) {
  const flowPlan = buildFlowExportScopePlan({
    scope: 'flow',
    items,
    flowTitle,
  });
  const selectedPlan = buildFlowExportScopePlan({
    scope: 'selected',
    items,
    selectedKeys,
    flowTitle,
  });
  const plan = scope === 'flow' ? flowPlan : selectedPlan;
  const selectableItems = items.filter(
    (item) => !item.excluded && !item.tombstoned && item.listEligible !== false,
  );
  const selectedCount = selectedPlan.includedCount;
  const scopeLabel = scope === 'flow' ? 'Flow 전체' : '직접 선택';
  const calendarItemKeys = new Set(
    plan.itemsByDestination.calendar.map((item) => item.key),
  );
  const calendarSeriesItems = items.filter(
    (item) => calendarItemKeys.has(item.key) && item.calendarSeriesId,
  );
  const calendarSeriesCount = new Set(
    calendarSeriesItems.map((item) => item.calendarSeriesId),
  ).size;
  const calendarOccurrenceCountBySeries = new Map<string, number>();
  calendarSeriesItems.forEach((item) => {
    if (!item.calendarSeriesId) return;
    calendarOccurrenceCountBySeries.set(
      item.calendarSeriesId,
      Math.max(
        calendarOccurrenceCountBySeries.get(item.calendarSeriesId) ?? 0,
        item.calendarVisibleOccurrenceCount ?? 0,
      ),
    );
  });
  const calendarVisibleOccurrenceCount = Array.from(
    calendarOccurrenceCountBySeries.values(),
  ).reduce((count, value) => count + value, 0);

  return (
    <section
      data-testid={legacyPersonalDraft ? 'personal-draft-list-export' : 'my-flow-export-surface'}
      className="mt-3 border-t border-slate-200 pt-3"
    >
      {showEntry ? (
        <button
          type="button"
          data-testid={legacyPersonalDraft ? 'personal-draft-list-export-toggle' : 'my-flow-export-entry'}
          aria-expanded={open}
          aria-label={`${flowTitle} 가져가기`}
          className={FLOW_UI_SECONDARY_ACTION_CLASS}
          onClick={() => onOpenChange(!open)}
        >
          가져가기
        </button>
      ) : null}

      {open ? (
        <div
          data-testid="my-flow-export-panel"
          data-export-scope={scope}
          data-export-included-count={plan.includedCount}
          className={showEntry ? 'mt-3 border-t border-[#E7E4DD] pt-3' : ''}
        >
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-base font-semibold text-[#1B1A17]">무엇을 가져갈까요?</h4>
            <button
              type="button"
              aria-label={`${flowTitle} 가져가기 닫기`}
              title="닫기"
              className={FLOW_UI_ICON_ACTION_CLASS}
              onClick={() => onOpenChange(false)}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div
            data-testid="my-flow-export-scope-control"
            className={`mt-3 grid-cols-2 ${FLOW_UI_SEGMENTED_CLASS}`}
            role="group"
            aria-label="가져갈 범위"
          >
            <button
              type="button"
              data-testid="my-flow-export-scope-flow"
              aria-pressed={scope === 'flow'}
              className={`min-h-10 rounded-md px-3 py-2 text-sm font-semibold ${scope === 'flow' ? FLOW_UI_SEGMENT_ACTIVE_CLASS : FLOW_UI_SEGMENT_IDLE_CLASS}`}
              onClick={() => onScopeChange('flow')}
            >
              Flow 전체 · {flowPlan.includedCount}개
            </button>
            <button
              type="button"
              data-testid="my-flow-export-scope-selected"
              aria-pressed={scope === 'selected'}
              className={`min-h-10 rounded-md px-3 py-2 text-sm font-semibold ${scope === 'selected' ? FLOW_UI_SEGMENT_ACTIVE_CLASS : FLOW_UI_SEGMENT_IDLE_CLASS}`}
              onClick={() => onScopeChange('selected')}
            >
              직접 선택 · {selectedCount}개
            </button>
          </div>

          {scope === 'selected' ? (
            <div data-testid="my-flow-export-selection" className="mt-3">
              <FlowItemMultiSelect
                items={selectableItems}
                selectedKeys={selectedKeys}
                itemTestId="my-flow-export-selectable-item"
                selectionAriaLabel={(item) => `${item.title} 가져갈 항목으로 선택`}
                onToggleItem={(key) => {
                  onSelectedKeysChange(
                    selectedKeys.includes(key)
                      ? selectedKeys.filter((selectedKey) => selectedKey !== key)
                      : [...selectedKeys, key],
                  );
                }}
                onToggleAll={() => {
                  onSelectedKeysChange(
                    selectedCount === selectableItems.length
                      ? []
                      : selectableItems.map((item) => item.key),
                  );
                }}
                maxHeightClassName="max-h-56"
              />
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p data-testid="my-flow-export-scope-summary" className="text-sm font-semibold text-[#1B1A17]">
              {scopeLabel} · {plan.includedCount}개
            </p>
            <p data-testid="my-flow-export-calendar-summary" className="text-xs font-semibold text-[#6E6B64]">
              {calendarSeriesCount > 0
                ? `반복 일정 ${calendarSeriesCount}개 · 표시 회차 ${calendarVisibleOccurrenceCount}개`
                : `캘린더 ${plan.countByDestination.calendar}개`}
            </p>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold text-[#6E6B64]">형식</p>
            <div className="mt-1 grid grid-cols-2 overflow-hidden border-y border-[#E7E4DD] sm:grid-cols-4">
              {(['calendar', 'checklist', 'sheet', 'memo'] as const).map((destination) => {
                const count = plan.countByDestination[destination];
                const disabled = count === 0;
                return (
                  <button
                    key={destination}
                    type="button"
                    data-testid={
                      legacyPersonalDraft && destination !== 'calendar'
                        ? `personal-draft-copy-${destination}`
                        : `my-flow-export-${destination}`
                    }
                    disabled={disabled}
                    aria-label={`${destinationCopy[destination].label} ${count}개`}
                    data-export-count={count}
                    className="min-h-14 border-b border-r border-[#E7E4DD] bg-white px-3 py-2 text-left transition hover:bg-[#FAFAF8] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#3654FF]/20 disabled:cursor-not-allowed disabled:bg-[#FAFAF8] disabled:text-[#A7A39A] sm:border-b-0 last:border-r-0"
                    onClick={() => onExport(destination, plan)}
                  >
                    <span className="block text-sm font-bold">{destinationCopy[destination].label}</span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-[#6E6B64]">
                      {destinationCopy[destination].result} · {count}개
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {feedback ? (
            <p
              data-testid={legacyPersonalDraft ? 'personal-draft-list-export-feedback' : 'my-flow-export-feedback'}
              className="mt-2 text-xs font-semibold text-emerald-700"
              role="status"
            >
              {feedback}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
