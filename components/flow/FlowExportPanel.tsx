'use client';

import {
  buildFlowExportScopePlan,
  type FlowExportDestination,
  type FlowExportScope,
  type FlowExportScopeItem,
  type FlowExportScopePlan,
} from '@/lib/flow/export-scope';
import { FlowItemMultiSelect } from './FlowItemMultiSelect';

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
  onOpenChange,
  onScopeChange,
  onSelectedKeysChange,
  onExport,
}: FlowExportPanelProps) {
  const plan = buildFlowExportScopePlan({
    scope,
    items,
    selectedKeys,
    flowTitle,
  });
  const selectableItems = items.filter((item) => !item.excluded && !item.tombstoned);
  const validSelectedCount = selectableItems.filter((item) => selectedKeys.includes(item.key)).length;
  const scopeCount = scope === 'flow' ? plan.includedCount : validSelectedCount;

  return (
    <section
      data-testid={legacyPersonalDraft ? 'personal-draft-list-export' : 'my-flow-export-surface'}
      className="mt-3 border-t border-slate-200 pt-3"
    >
      <button
        type="button"
        data-testid={legacyPersonalDraft ? 'personal-draft-list-export-toggle' : 'my-flow-export-entry'}
        aria-expanded={open}
        aria-label={`${flowTitle} 가져가기`}
        className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
        onClick={() => onOpenChange(!open)}
      >
        가져가기
      </button>

      {open ? (
        <div data-testid="my-flow-export-panel" className="mt-3 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-slate-950">무엇을 가져갈까요?</h4>
            <button
              type="button"
              aria-label={`${flowTitle} 가져가기 닫기`}
              title="닫기"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-xl font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              onClick={() => onOpenChange(false)}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div
            data-testid="my-flow-export-scope-control"
            className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1"
            role="group"
            aria-label="가져갈 범위"
          >
            <button
              type="button"
              data-testid="my-flow-export-scope-flow"
              aria-pressed={scope === 'flow'}
              className={`min-h-10 rounded-md px-3 py-2 text-sm font-bold ${scope === 'flow' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => onScopeChange('flow')}
            >
              전체 Flow · {items.length}개
            </button>
            <button
              type="button"
              data-testid="my-flow-export-scope-selected"
              aria-pressed={scope === 'selected'}
              className={`min-h-10 rounded-md px-3 py-2 text-sm font-bold ${scope === 'selected' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => onScopeChange('selected')}
            >
              선택한 항목 · {validSelectedCount}개
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
                    validSelectedCount === selectableItems.length
                      ? []
                      : selectableItems.map((item) => item.key),
                  );
                }}
                maxHeightClassName="max-h-56"
              />
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p data-testid="my-flow-export-scope-summary" className="text-sm font-bold text-slate-900">
              {scope === 'flow' ? '전체 Flow' : '선택한 항목'} · {scopeCount}개
            </p>
            <p className="text-xs font-semibold text-slate-500">
              캘린더 {plan.countByDestination.calendar}개
            </p>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500">형식 선택</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                    className="min-h-12 rounded-md border border-slate-200 bg-white px-3 py-2 text-left hover:border-blue-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    onClick={() => onExport(destination, plan)}
                  >
                    <span className="block text-sm font-bold">{destinationCopy[destination].label}</span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">
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
              className="mt-2 text-xs font-bold text-emerald-700"
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
