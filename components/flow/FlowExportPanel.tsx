'use client';

import { useEffect, useRef, useState } from 'react';
import {
  buildArtifactExportRecommendationVM,
  type ArtifactExportRecommendation,
} from '@/lib/flow/artifact-recommendation';
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
import { FlowExportPlan } from './FlowExecutionPrimitives';
import { FLOW_EXECUTION_ACTIONS } from '@/lib/flow/execution-ui-contract';
import { getExportScopeActionLabel } from '@/lib/flow/flow-command-grammar';
import {
  FLOW_UI_ICON_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
  FLOW_UI_SEGMENTED_CLASS,
  FLOW_UI_SEGMENT_ACTIVE_CLASS,
  FLOW_UI_SEGMENT_IDLE_CLASS,
} from './flow-ui';

export type FlowExportPanelItem = FlowExportScopeItem & {
  meta?: string;
  subcheckCount?: number;
  resourceCount?: number;
};

type FlowExportPanelProps = {
  flowTitle: string;
  items: FlowExportPanelItem[];
  open: boolean;
  scope: FlowExportScope;
  selectedKeys: string[];
  currentItemKey?: string;
  stableIdentity?: string;
  feedback?: string;
  legacyPersonalDraft?: boolean;
  showEntry?: boolean;
  fixedScope?: boolean;
  showClose?: boolean;
  destinations?: FlowExportDestination[];
  preferredDestination?: FlowExportDestination;
  sourceLabel?: string;
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
  currentItemKey,
  stableIdentity,
  feedback,
  legacyPersonalDraft = false,
  showEntry = true,
  fixedScope = false,
  showClose = true,
  destinations = ['calendar', 'checklist', 'sheet', 'memo'],
  preferredDestination,
  sourceLabel,
  destinationCopyOverride,
  destinationTestId,
  onOpenChange,
  onScopeChange,
  onSelectedKeysChange,
  onExport,
}: FlowExportPanelProps) {
  const [receipt, setReceipt] = useState<FlowExportResultReceipt | null>(null);
  const [pendingDestination, setPendingDestination] = useState<FlowExportDestination | null>(null);
  const receiptContainerRef = useRef<HTMLDivElement>(null);
  const recommendationContainerRef = useRef<HTMLDivElement>(null);
  const entryButtonRef = useRef<HTMLButtonElement>(null);
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
  const currentItemPlan = buildFlowExportScopePlan({
    scope: 'item',
    items,
    currentItemKey,
    flowTitle,
  });
  const plan = scope === 'flow'
    ? flowPlan
    : scope === 'selected'
      ? selectedPlan
      : currentItemPlan;
  const selectableItems = items.filter(
    (item) => !item.excluded && !item.tombstoned && item.listEligible !== false,
  );
  const selectedCount = selectedPlan.includedCount;
  const entryLabel = getExportScopeActionLabel(scope, plan.includedCount);
  const scopeLabel = scope === 'flow'
    ? 'Flow 전체'
    : scope === 'selected'
      ? '직접 선택'
      : '현재 항목';
  const includedKeySet = new Set(plan.items.map((item) => item.key));
  const includedPanelItems = items.filter((item) => includedKeySet.has(item.key));
  const nestedSubcheckCount = includedPanelItems.reduce(
    (count, item) => count + Math.max(0, item.subcheckCount ?? 0),
    0,
  );
  const resourceCount = includedPanelItems.reduce(
    (count, item) => count + Math.max(0, item.resourceCount ?? 0),
    0,
  );
  const hasNestedDetail = nestedSubcheckCount + resourceCount > 0;
  const exportRecommendation = buildArtifactExportRecommendationVM({
    plan,
    destinations,
    preferredDestination,
  });
  const recommendationByDestination = new Map(
    [...exportRecommendation.visible, ...exportRecommendation.additional]
      .map((candidate) => [candidate.destination, candidate] as const),
  );
  const calendarUnavailable = destinations.includes('calendar')
    && plan.includedCount > 0
    && plan.countByDestination.calendar === 0;

  useEffect(() => {
    setReceipt(null);
    setPendingDestination(null);
  }, [flowTitle, scope, selectedKeys.join('|')]);

  useEffect(() => {
    if (!receipt) return;
    const frame = window.requestAnimationFrame(() => {
      receiptContainerRef.current?.scrollIntoView({ block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [receipt]);

  useEffect(() => {
    if (!open || window.innerWidth >= 768) return;
    const frame = window.requestAnimationFrame(() => {
      const primary = recommendationContainerRef.current
        ?.querySelector<HTMLElement>('[data-action-priority="primary"]');
      if (!primary) return;
      const navigationTop = document
        .querySelector<HTMLElement>('[data-testid="platform-mobile-tabs"]')
        ?.getBoundingClientRect().top;
      const safeBottom = navigationTop ?? window.innerHeight - 16;
      const overflow = primary.getBoundingClientRect().bottom - safeBottom;
      if (overflow > 0) window.scrollBy({ top: overflow + 8, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, scope, selectedKeys.join('|')]);

  const renderDestinationButton = (
    destination: FlowExportDestination,
    candidate?: ArtifactExportRecommendation,
    hidden = false,
  ) => {
    const copy = destinationCopyOverride?.[destination] ?? destinationCopy[destination];
    const count = plan.countByDestination[destination];
    const disabled = count === 0;
    const pending = pendingDestination === destination;
    const anotherDestinationPending = pendingDestination !== null && !pending;
    const omitted = plan.metrics.omittedCountByDestination[destination];
    const disabledReason = destination === 'calendar' && plan.includedCount > 0
      ? '날짜 있는 항목이 없어요'
      : '항목을 먼저 선택하세요';
    const outputUnit = destination === 'sheet' ? '행' : '개';
    const scopedActionLabel = `${exportRecommendation.scopeLabel} · ${copy.label} ${count}${outputUnit}`;
    const role = candidate?.role ?? 'additional';

    return (
      <button
        key={destination}
        type="button"
        hidden={hidden}
        data-testid={destinationTestId?.(destination) ?? (
          legacyPersonalDraft && destination !== 'calendar'
            ? `personal-draft-copy-${destination}`
            : `my-flow-export-${destination}`
        )}
        disabled={disabled || anotherDestinationPending}
        aria-busy={pending || undefined}
        aria-label={pending
          ? `${scopedActionLabel} 준비 중`
          : disabled
            ? `${scopedActionLabel} 사용 불가, ${disabledReason}`
            : scopedActionLabel}
        title={disabled ? disabledReason : undefined}
        data-export-count={count}
        data-export-destination={destination}
        data-export-state={pending ? 'pending' : disabled ? 'disabled' : 'ready'}
        data-recommendation-role={role}
        data-recommendation-visible={!hidden}
        data-action-priority={role === 'primary' ? 'primary' : 'secondary'}
        className={`min-h-16 scroll-mb-[var(--flowme-mobile-tab-clearance)] border-b border-r border-[var(--flowme-border)] px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)] disabled:cursor-not-allowed disabled:bg-[var(--flowme-surface-subtle)] disabled:text-[var(--flowme-text-tertiary)] sm:border-b-0 last:border-r-0 ${
          role === 'primary'
            ? 'bg-[var(--flowme-action-soft)] hover:bg-blue-100'
            : 'bg-[var(--flowme-surface)] hover:bg-[var(--flowme-surface-subtle)]'
        }`}
        onClick={async () => {
          if (pendingDestination) return;
          setPendingDestination(destination);
          setReceipt(null);
          try {
            const nextReceipt = await onExport(destination, plan);
            if (nextReceipt) setReceipt(nextReceipt);
          } catch {
            setReceipt({
              scope: plan.scope,
              destination,
              resultKind: destination === 'calendar' ? 'download' : 'copy',
              status: 'error',
              outputCount: 0,
              omittedCount: plan.includedCount,
              message: '가져오지 못했습니다',
            });
          } finally {
            setPendingDestination(null);
          }
        }}
      >
        <span className="block text-sm font-bold">{pending ? '준비 중...' : scopedActionLabel}</span>
        <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-[var(--flowme-text-secondary)]">
          {disabled
            ? disabledReason
            : `${candidate?.reason ?? copy.result}${candidate?.lossSummary ? ` · ${candidate.lossSummary}` : omitted > 0 ? ` · ${omitted}개 제외` : ''}`}
        </span>
      </button>
    );
  };

  return (
    <FlowExportPlan
      data-testid={legacyPersonalDraft ? 'personal-draft-list-export' : 'my-flow-export-surface'}
      data-p30-marker={open ? 'P30-MOBILE-EXPORT-NO-FIXED-OVERLAP' : undefined}
      className={`mt-3 ${open ? 'flowme-mobile-export-clearance' : ''}`}
    >
      {showEntry ? (
        <button
          ref={entryButtonRef}
          type="button"
          data-testid={legacyPersonalDraft ? 'personal-draft-list-export-toggle' : 'my-flow-export-entry'}
          data-action-priority="secondary"
          aria-expanded={open}
          aria-label={`${flowTitle} ${entryLabel}`}
          className={FLOW_UI_SECONDARY_ACTION_CLASS}
          onClick={() => onOpenChange(!open)}
        >
          {entryLabel}
        </button>
      ) : null}

      {open ? (
        <div
          data-testid="my-flow-export-panel"
          data-export-scope={scope}
          data-export-included-count={plan.includedCount}
          data-export-layout="compact-preflight"
          data-default-expanded-secondary-count="0"
          data-flow-anatomy="export-preflight"
          data-p34-marker="P34-07-SCOPE-FIRST-EXPORT"
          data-p35-marker="P35-EXPORT-SCOPE-FIRST"
          data-p35-count-marker="P35-EXPORT-COUNT-PARITY"
          className={showEntry ? 'mt-3 border-t border-[var(--flowme-border)] pt-3' : ''}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold text-[var(--flowme-text)]">{FLOW_EXECUTION_ACTIONS.exportFlow.label}</h4>
              <p className="mt-0.5 text-xs font-semibold text-[var(--flowme-text-secondary)]">범위와 형식을 고르면 바로 가져갑니다.</p>
            </div>
            {showClose ? (
              <button
                type="button"
                aria-label={`${flowTitle} 가져가기 닫기`}
                title="닫기"
                className={FLOW_UI_ICON_ACTION_CLASS}
                onClick={() => {
                  onOpenChange(false);
                  window.requestAnimationFrame(() => entryButtonRef.current?.focus({ preventScroll: true }));
                }}
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
          </div>

          <section data-testid="my-flow-export-scope-step" aria-labelledby="my-flow-export-scope-heading">
            <p
              id="my-flow-export-scope-heading"
              className="mt-3 text-xs font-semibold text-[var(--flowme-text-secondary)]"
            >
              1 · 범위
            </p>
            {fixedScope ? (
              <div
                data-testid="my-flow-export-scope-control"
                className="mt-1 flex min-h-11 items-center justify-between border-y border-[var(--flowme-border)] py-2"
                aria-label="가져갈 범위"
              >
                <span className="text-sm font-semibold text-[var(--flowme-text)]">{scopeLabel}</span>
                <span className="sr-only"> · {plan.includedCount}개</span>
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
                  className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${scope === 'flow' ? FLOW_UI_SEGMENT_ACTIVE_CLASS : FLOW_UI_SEGMENT_IDLE_CLASS}`}
                  onClick={() => onScopeChange('flow')}
                >
                  Flow 전체<span className="sr-only"> · {flowPlan.includedCount}개</span>
                </button>
                <button
                  type="button"
                  data-testid="my-flow-export-scope-selected"
                  aria-pressed={scope === 'selected'}
                  className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${scope === 'selected' ? FLOW_UI_SEGMENT_ACTIVE_CLASS : FLOW_UI_SEGMENT_IDLE_CLASS}`}
                  onClick={() => onScopeChange('selected')}
                >
                  직접 선택<span className="sr-only"> · {selectedCount}개</span>
                </button>
              </div>
            )}
          </section>

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

          <div
            data-testid="my-flow-export-preflight"
            data-p35-r10-marker="P35-R10-EXPORT-SUMMARY-ONE-OWNER"
            className="mt-3 flex flex-wrap items-center justify-between gap-2 border-y border-[var(--flowme-border)] py-2"
          >
            <p data-testid="my-flow-export-scope-summary" className="text-sm font-semibold text-[var(--flowme-text)]">
              {scopeLabel} · {plan.includedCount}개
            </p>
            <p data-testid="my-flow-export-calendar-summary" className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
              {plan.metrics.recurringSeriesCount > 0
                ? `반복 계획 ${plan.metrics.recurringSeriesCount}개 · 캘린더 파일 ${plan.countByDestination.calendar}개 · 화면 회차 ${plan.metrics.visibleOccurrenceCount}개`
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
          {hasNestedDetail ? (
            <p
              data-testid="my-flow-export-detail-loss-notice"
              className="mt-2 break-keep text-xs font-medium leading-5 text-[var(--flowme-text-secondary)]"
            >
              세부 확인 항목과 자료는 FlowMe에 남습니다. 캘린더 파일에는 일정 설명으로 함께 담습니다.
            </p>
          ) : null}

          <section
            aria-labelledby="my-flow-export-format-heading"
            className="mt-3"
          >
            <div className="flex items-end justify-between gap-3">
              <p
                id="my-flow-export-format-heading"
                className="text-xs font-semibold text-[var(--flowme-text-secondary)]"
              >
                2 · 형식
              </p>
              <p className="text-[11px] font-medium text-[var(--flowme-text-tertiary)]">
                이 범위에서 만들 수 있는 결과
              </p>
            </div>
            {calendarUnavailable ? (
              <p
                data-testid="my-flow-export-calendar-recovery"
                className="mt-2 border-l-2 border-[var(--flowme-border-strong)] pl-2 text-xs font-medium leading-5 text-[var(--flowme-text-secondary)]"
              >
                캘린더 파일은 날짜를 정한 항목만 만들 수 있어요. Flow로 돌아가 날짜를 정해 주세요.
              </p>
            ) : null}
            <div
              ref={recommendationContainerRef}
              data-testid="my-flow-export-recommendations"
              data-p29-marker="P29-ARTIFACT-EXPORT-PREFLIGHT"
              className="mt-2"
            >
            {exportRecommendation.visible.length > 0 ? (
              <div className={`grid overflow-hidden border-y border-[var(--flowme-border)] ${exportRecommendation.visible.length > 1 ? 'grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]' : 'grid-cols-1'}`}>
                {exportRecommendation.visible.map((candidate) => (
                  renderDestinationButton(candidate.destination, candidate)
                ))}
              </div>
            ) : (
              <p className="border-y border-[var(--flowme-border)] px-3 py-4 text-sm text-[var(--flowme-text-secondary)]">
                선택한 범위에서 가져갈 항목이 없습니다.
              </p>
            )}

            {exportRecommendation.additional.length > 0 ? (
              <details data-testid="my-flow-export-more-formats" className="border-b border-[var(--flowme-border)]">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-2 text-xs font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)]">
                  <span>다른 형식 {exportRecommendation.additional.length}개</span>
                  <span aria-hidden="true">⌄</span>
                </summary>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
                  {exportRecommendation.additional.map((candidate) => (
                    renderDestinationButton(candidate.destination, candidate)
                  ))}
                </div>
              </details>
            ) : null}

            <div hidden aria-hidden="true">
              {exportRecommendation.unavailable.map((destination) => (
                renderDestinationButton(destination, undefined, true)
              ))}
            </div>
            </div>
          </section>

          {receipt ? (
            <div ref={receiptContainerRef} data-testid="my-flow-export-receipt-step">
              <p className="mt-3 text-xs font-semibold text-[var(--flowme-text-secondary)]">3 · 결과</p>
              <FlowExportReceipt
                receipt={receipt}
                flowTitle={flowTitle}
                sourceLabel={sourceLabel}
                stableIdentity={stableIdentity}
              />
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
