'use client';

import { useEffect, useState } from 'react';
import {
  buildFlowExportScopePlan,
  type FlowExportDestination,
  type FlowExportResultReceipt,
  type FlowExportScope,
  type FlowExportScopeItem,
  type FlowExportScopePlan,
} from '@/lib/flow/export-scope';
import { FlowItemMultiSelect } from './FlowItemMultiSelect';
import { FlowExportReceipt } from './FlowExportReceipt';
import { FlowExportPlan, FlowPlanStep } from './FlowExecutionPrimitives';
import { FLOW_EXECUTION_ACTIONS } from '@/lib/flow/execution-ui-contract';
import {
  FLOW_UI_ICON_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
  FLOW_UI_SEGMENTED_CLASS,
  FLOW_UI_SEGMENT_ACTIVE_CLASS,
  FLOW_UI_SEGMENT_IDLE_CLASS,
} from './flow-ui';

export type FlowExportPanelItem = FlowExportScopeItem & {
  meta?: string;
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
  fixedScope?: boolean;
  showClose?: boolean;
  destinations?: FlowExportDestination[];
  destinationCopyOverride?: Partial<Record<FlowExportDestination, { label: string; result: string }>>;
  destinationTestId?: (destination: FlowExportDestination) => string;
  onOpenChange: (open: boolean) => void;
  onScopeChange: (scope: Exclude<FlowExportScope, 'item'>) => void;
  onSelectedKeysChange: (keys: string[]) => void;
  onExport: (
    destination: FlowExportDestination,
    plan: FlowExportScopePlan,
  ) => FlowExportResultReceipt | void | Promise<FlowExportResultReceipt | void>;
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
  fixedScope = false,
  showClose = true,
  destinations = ['calendar', 'checklist', 'sheet', 'memo'],
  destinationCopyOverride,
  destinationTestId,
  onOpenChange,
  onScopeChange,
  onSelectedKeysChange,
  onExport,
}: FlowExportPanelProps) {
  const [receipt, setReceipt] = useState<FlowExportResultReceipt | null>(null);
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

  useEffect(() => {
    setReceipt(null);
  }, [flowTitle, scope, selectedKeys.join('|')]);

  return (
    <FlowExportPlan
      data-testid={legacyPersonalDraft ? 'personal-draft-list-export' : 'my-flow-export-surface'}
      className="mt-3"
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
          {FLOW_EXECUTION_ACTIONS.exportFlow.label}
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
            <div>
              <p className="text-[11px] font-semibold text-[var(--flowme-text-tertiary)]">{FLOW_EXECUTION_ACTIONS.exportFlow.label}</p>
              <h4 className="text-base font-semibold text-[var(--flowme-text)]">범위와 결과 확인</h4>
            </div>
            {showClose ? (
              <button
                type="button"
                aria-label={`${flowTitle} 가져가기 닫기`}
                title="닫기"
                className={FLOW_UI_ICON_ACTION_CLASS}
                onClick={() => onOpenChange(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
          </div>

          <FlowPlanStep index={1} label="범위" />
          {fixedScope ? (
            <div
              data-testid="my-flow-export-scope-control"
              className="mt-1 flex min-h-11 items-center justify-between border-y border-[var(--flowme-border)] py-2"
              aria-label="가져갈 범위"
            >
              <span className="text-sm font-semibold text-[var(--flowme-text)]">Flow 전체</span>
              <span className="text-xs font-semibold text-[var(--flowme-text-secondary)]">{flowPlan.includedCount}개</span>
            </div>
          ) : (
            <div
              data-testid="my-flow-export-scope-control"
              className={`mt-1 grid-cols-2 ${FLOW_UI_SEGMENTED_CLASS}`}
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
          )}

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

          <FlowPlanStep index={2} label="예상 결과" />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-y border-[var(--flowme-border)] py-2">
            <p data-testid="my-flow-export-scope-summary" className="text-sm font-semibold text-[var(--flowme-text)]">
              {scopeLabel} · {plan.includedCount}개
            </p>
            <p data-testid="my-flow-export-calendar-summary" className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
              {plan.metrics.recurringSeriesCount > 0
                ? `반복 일정 ${plan.metrics.recurringSeriesCount}개 · 표시 회차 ${plan.metrics.visibleOccurrenceCount}개`
                : `캘린더 ${plan.countByDestination.calendar}개`}
            </p>
          </div>
          <div data-testid="my-flow-export-eligibility-summary" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-[var(--flowme-text-secondary)]">
            <span>날짜 있음 {plan.metrics.datedCount}개</span>
            <span>날짜 없음 {plan.metrics.undatedCount}개</span>
            {plan.excludedCount + plan.tombstonedCount > 0 ? (
              <span>목록에서 제외 {plan.excludedCount + plan.tombstonedCount}개</span>
            ) : null}
          </div>

          <div className="mt-3">
            <FlowPlanStep index={3} label="형식" />
            <div className={`mt-1 grid grid-cols-2 overflow-hidden border-y border-[var(--flowme-border)] ${destinations.length > 2 ? 'sm:grid-cols-4' : ''}`}>
              {destinations.map((destination) => {
                const copy = destinationCopyOverride?.[destination] ?? destinationCopy[destination];
                const count = plan.countByDestination[destination];
                const disabled = count === 0;
                const omitted = plan.metrics.omittedCountByDestination[destination];
                const disabledReason = destination === 'calendar' && plan.includedCount > 0
                  ? '날짜 있는 항목이 없어요'
                  : '항목을 먼저 선택하세요';
                return (
                  <button
                    key={destination}
                    type="button"
                    data-testid={destinationTestId?.(destination) ?? (
                      legacyPersonalDraft && destination !== 'calendar'
                        ? `personal-draft-copy-${destination}`
                        : `my-flow-export-${destination}`
                    )}
                    disabled={disabled}
                    aria-label={`${copy.label} ${count}개`}
                    data-export-count={count}
                    className="min-h-14 border-b border-r border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-3 py-2 text-left transition hover:bg-[var(--flowme-surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)] disabled:cursor-not-allowed disabled:bg-[var(--flowme-surface-subtle)] disabled:text-[var(--flowme-text-tertiary)] sm:border-b-0 last:border-r-0"
                    onClick={async () => {
                      const nextReceipt = await onExport(destination, plan);
                      if (nextReceipt) setReceipt(nextReceipt);
                    }}
                  >
                    <span className="block text-sm font-bold">{copy.label}</span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-[var(--flowme-text-secondary)]">
                      {disabled
                        ? disabledReason
                        : `${copy.result} · ${count}개${omitted > 0 ? ` · ${omitted}개 제외` : ''}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {receipt ? (
            <div>
              <FlowPlanStep index={4} label="완료" />
              <FlowExportReceipt receipt={receipt} />
            </div>
          ) : null}

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
    </FlowExportPlan>
  );
}
