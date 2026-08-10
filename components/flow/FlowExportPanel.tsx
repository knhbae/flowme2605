'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  buildArtifactExportRecommendationVM,
  type ArtifactExportRecommendation,
} from '@/lib/flow/artifact-recommendation';
import {
  buildFlowExportScopePlan,
  type FlowExportDestination,
  type FlowExportArtifactProfile,
  type FlowExportResultReceipt,
  type FlowExportScope,
  type FlowExportScopeItem,
  type FlowExportScopePlan,
} from '@/lib/flow/export-scope';
import {
  SAVED_PLAN_TRANSFER_DESTINATIONS,
  SAVED_PLAN_TRANSFER_FORMAT_BY_DESTINATION,
  type SavedPlanTransferPreview,
} from '@/lib/flow/saved-plan-transfer-codec';
import type { EffectiveFlowProjectionManifest } from '@/lib/flow/effective-flow-contract';
import { FlowItemMultiSelect } from './FlowItemMultiSelect';
import { FlowExportReceipt } from './FlowExportReceipt';
import { FlowExportPlan } from './FlowExecutionPrimitives';
import { FlowContextDisclosure } from './FlowContextDisclosure';
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

export type FlowExportCapabilityPreviewControls = {
  selectedDestination?: FlowExportDestination;
  onSelectDestination: (destination: FlowExportDestination) => void;
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
  persistentReceipt?: FlowExportResultReceipt;
  legacyPersonalDraft?: boolean;
  showEntry?: boolean;
  fixedScope?: boolean;
  showClose?: boolean;
  destinations?: FlowExportDestination[];
  preferredDestination?: FlowExportDestination;
  sourceLabel?: string;
  destinationCopyOverride?: Partial<Record<FlowExportDestination, { label: string; result: string }>>;
  destinationNotices?: Partial<Record<FlowExportDestination, string>>;
  destinationTestId?: (destination: FlowExportDestination) => string;
  capabilityPreview?: ReactNode | ((controls: FlowExportCapabilityPreviewControls) => ReactNode);
  projectionManifests?: Partial<Record<FlowExportDestination, EffectiveFlowProjectionManifest>>;
  transferLayer?: ReactNode;
  transferReceipt?: ReactNode;
  savedTransferSurface?: 'confirmation' | 'legacy';
  entryActionRole?: string;
  q3CopyEnabled?: boolean;
  approvedSavedTransfer?: boolean;
  savedTransferPreviews?: Partial<Record<FlowExportDestination, SavedPlanTransferPreview>>;
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

const approvedSavedTransferCopy: Record<FlowExportDestination, { label: string; result: string }> = {
  memo: { label: '텍스트', result: 'TXT 원문' },
  checklist: { label: '할 일', result: 'VTODO 파일' },
  calendar: { label: '캘린더', result: 'VEVENT 파일' },
  sheet: { label: 'Excel', result: 'XLSX 표' },
};

const approvedSavedTransferCta: Record<FlowExportDestination, string> = {
  memo: '텍스트 복사',
  checklist: '할 일 파일 받기',
  calendar: '캘린더 파일 받기',
  sheet: 'Excel 파일 받기',
};

function exportResultKind(
  destination: FlowExportDestination,
  approvedSavedTransfer: boolean,
): 'copy' | 'download' {
  if (approvedSavedTransfer) return destination === 'memo' ? 'copy' : 'download';
  return destination === 'calendar' ? 'download' : 'copy';
}

export function FlowExportPanel({
  flowTitle,
  items,
  open,
  scope,
  selectedKeys,
  currentItemKey,
  stableIdentity,
  feedback,
  persistentReceipt,
  legacyPersonalDraft = false,
  showEntry = true,
  fixedScope = false,
  showClose = true,
  destinations: requestedDestinations,
  preferredDestination,
  sourceLabel,
  destinationCopyOverride,
  destinationNotices,
  destinationTestId,
  capabilityPreview,
  projectionManifests,
  transferLayer,
  transferReceipt,
  savedTransferSurface,
  entryActionRole,
  q3CopyEnabled = true,
  approvedSavedTransfer = false,
  savedTransferPreviews,
  onOpenChange,
  onScopeChange,
  onSelectedKeysChange,
  onExport,
}: FlowExportPanelProps) {
  const destinations: FlowExportDestination[] = requestedDestinations
    ? [...requestedDestinations]
    : approvedSavedTransfer
      ? [...SAVED_PLAN_TRANSFER_DESTINATIONS]
      : ['calendar', 'checklist', 'sheet', 'memo'];
  const artifactProfile: FlowExportArtifactProfile = approvedSavedTransfer
    ? 'approved_saved_transfer'
    : 'legacy';
  const [receipt, setReceipt] = useState<FlowExportResultReceipt | null>(null);
  const [pendingDestination, setPendingDestination] = useState<FlowExportDestination | null>(null);
  const [previewDestination, setPreviewDestination] = useState<FlowExportDestination | undefined>(
    preferredDestination ?? (approvedSavedTransfer ? SAVED_PLAN_TRANSFER_DESTINATIONS[0] : undefined),
  );
  const receiptContainerRef = useRef<HTMLDivElement>(null);
  const recommendationContainerRef = useRef<HTMLDivElement>(null);
  const entryButtonRef = useRef<HTMLButtonElement>(null);
  const approvedPreviewBodyRef = useRef<HTMLElement>(null);
  const flowPlan = buildFlowExportScopePlan({
    scope: 'flow',
    items,
    flowTitle,
    artifactProfile,
  });
  const selectedPlan = buildFlowExportScopePlan({
    scope: 'selected',
    items,
    selectedKeys,
    flowTitle,
    artifactProfile,
  });
  const currentItemPlan = buildFlowExportScopePlan({
    scope: 'item',
    items,
    currentItemKey,
    flowTitle,
    artifactProfile,
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
  const entryLabel = q3CopyEnabled && !legacyPersonalDraft
    ? `내 도구로 옮기기 · ${plan.includedCount}개`
    : getExportScopeActionLabel(scope, plan.includedCount);
  const scopeLabel = scope === 'flow'
    ? q3CopyEnabled ? '계획 전체' : 'Flow 전체'
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
  const calendarManifest = projectionManifests?.calendar;
  const calendarOutputCount = calendarManifest?.counts.output ?? plan.countByDestination.calendar;
  const calendarUnavailable = destinations.includes('calendar')
    && plan.includedCount > 0
    && (
      calendarOutputCount === 0
      || calendarManifest?.availability === 'held'
      || calendarManifest?.availability === 'unavailable'
    );
  const visibleReceipt = receipt ?? persistentReceipt ?? null;
  const renderedCapabilityPreview = typeof capabilityPreview === 'function'
    ? capabilityPreview({
        selectedDestination: previewDestination,
        onSelectDestination: setPreviewDestination,
      })
    : capabilityPreview;
  const selectedSavedTransferPreview = previewDestination
    ? savedTransferPreviews?.[previewDestination]
    : undefined;
  const selectedSavedTransferManifest = previewDestination
    ? projectionManifests?.[previewDestination]
    : undefined;
  const selectedSavedTransferUnavailable = !selectedSavedTransferPreview
    || selectedSavedTransferPreview.outputCount === 0
    || selectedSavedTransferManifest?.availability === 'held'
    || selectedSavedTransferManifest?.availability === 'unavailable';

  useEffect(() => {
    setReceipt(null);
    setPendingDestination(null);
    setPreviewDestination(
      preferredDestination ?? (approvedSavedTransfer ? SAVED_PLAN_TRANSFER_DESTINATIONS[0] : undefined),
    );
  }, [approvedSavedTransfer, flowTitle, preferredDestination, scope, selectedKeys.join('|')]);

  useEffect(() => {
    if (!visibleReceipt) return;
    const frame = window.requestAnimationFrame(() => {
      receiptContainerRef.current?.scrollIntoView({ block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [visibleReceipt]);

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

  const runExport = async (destination: FlowExportDestination) => {
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
        resultKind: exportResultKind(destination, approvedSavedTransfer),
        status: 'error',
        outputCount: 0,
        omittedCount: plan.includedCount,
        message: '가져오지 못했습니다',
      });
    } finally {
      setPendingDestination(null);
    }
  };

  const renderDestinationButton = (
    destination: FlowExportDestination,
    candidate?: ArtifactExportRecommendation,
    hidden = false,
  ) => {
    const copy = approvedSavedTransfer
      ? approvedSavedTransferCopy[destination]
      : destinationCopyOverride?.[destination] ?? destinationCopy[destination];
    const manifest = projectionManifests?.[destination];
    const count = manifest?.counts.output ?? plan.countByDestination[destination];
    const disabled = count === 0
      || manifest?.availability === 'held'
      || manifest?.availability === 'unavailable';
    const pending = pendingDestination === destination;
    const anotherDestinationPending = pendingDestination !== null && !pending;
    const omitted = manifest
      ? manifest.counts.held + manifest.counts.unavailable
      : plan.metrics.omittedCountByDestination[destination];
    const manifestReasons = manifest
      ? Array.from(new Set([
          ...manifest.heldItemIds,
          ...manifest.unavailableItemIds,
        ].map((itemId) => manifest.reasonsByItemId[itemId]).filter(Boolean)))
      : [];
    const disabledReason = manifestReasons[0] ?? (
      destination === 'calendar' && plan.includedCount > 0
        ? '날짜 있는 항목이 없어요'
        : '항목을 먼저 선택하세요'
    );
    const outputUnit = destination === 'sheet' ? '행' : '개';
    const actionScopeLabel = scope === 'flow'
      ? scopeLabel
      : exportRecommendation.scopeLabel;
    const scopedActionLabel = `${actionScopeLabel} · ${copy.label} ${count}${outputUnit}`;
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
        data-export-format={approvedSavedTransfer
          ? SAVED_PLAN_TRANSFER_FORMAT_BY_DESTINATION[destination]
          : undefined}
        data-export-state={pending ? 'pending' : disabled ? 'disabled' : 'ready'}
        data-export-preview-selected={previewDestination === destination ? 'true' : 'false'}
        data-export-manifest-availability={manifest?.availability}
        data-export-manifest-item-ids={manifest?.eligibleItemIds.join(',')}
        data-export-manifest-held-item-ids={manifest?.heldItemIds.join(',')}
        data-export-manifest-unavailable-item-ids={manifest?.unavailableItemIds.join(',')}
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
          setPreviewDestination(destination);
          setReceipt(null);
          if (!approvedSavedTransfer) await runExport(destination);
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

  const renderApprovedTransferFormatTab = (destination: FlowExportDestination) => {
    const preview = savedTransferPreviews?.[destination];
    const manifest = projectionManifests?.[destination];
    const disabled = !preview
      || preview.outputCount === 0
      || manifest?.availability === 'held'
      || manifest?.availability === 'unavailable';
    const selected = previewDestination === destination;
    return (
      <button
        key={destination}
        id={`my-flow-transfer-tab-${destination}`}
        type="button"
        role="tab"
        aria-selected={selected}
        aria-controls="my-flow-export-destination-preview"
        disabled={disabled}
        data-testid={`my-flow-transfer-tab-${destination}`}
        data-export-destination={destination}
        data-export-format={SAVED_PLAN_TRANSFER_FORMAT_BY_DESTINATION[destination]}
        className={`min-h-12 border-r border-[var(--flowme-border)] px-2 py-2 text-sm font-semibold last:border-r-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)] disabled:cursor-not-allowed disabled:text-[var(--flowme-text-tertiary)] ${
          selected
            ? 'bg-[var(--flowme-action-soft)] text-[var(--flowme-action)]'
            : 'bg-[var(--flowme-surface)] text-[var(--flowme-text-secondary)] hover:bg-[var(--flowme-surface-subtle)]'
        }`}
        onClick={() => {
          setPreviewDestination(destination);
          setReceipt(null);
        }}
      >
        <span className="block">{approvedSavedTransferCopy[destination].label}</span>
        <span className="mt-0.5 block text-[10px] font-medium">
          {preview ? `${preview.outputCount}개` : '준비 중'}
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
          data-action-role={entryActionRole}
          aria-expanded={open}
          aria-label={`${flowTitle} ${entryLabel}`}
          className={`${FLOW_UI_SECONDARY_ACTION_CLASS}${approvedSavedTransfer ? ' !min-h-12' : ''}`}
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
          data-saved-transfer-surface={savedTransferSurface}
          data-saved-transfer-profile={artifactProfile}
          className={`${showEntry ? 'mt-3 border-t border-[var(--flowme-border)] pt-3' : ''}${approvedSavedTransfer ? ' [&_button]:min-h-12 [&_input]:min-h-12 [&_select]:min-h-12' : ''}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className={showEntry ? 'sr-only' : 'text-base font-semibold text-[var(--flowme-text)]'}>{FLOW_EXECUTION_ACTIONS.exportFlow.label}</h4>
            </div>
            {showClose ? (
              <button
                type="button"
                aria-label={approvedSavedTransfer ? '이전' : `${flowTitle} 옮기기 닫기`}
                title={approvedSavedTransfer ? '이전' : '닫기'}
                className={approvedSavedTransfer ? `${FLOW_UI_SECONDARY_ACTION_CLASS} !min-h-12` : FLOW_UI_ICON_ACTION_CLASS}
                onClick={() => {
                  onOpenChange(false);
                  window.requestAnimationFrame(() => entryButtonRef.current?.focus({ preventScroll: true }));
                }}
              >
                {approvedSavedTransfer ? '이전' : <span aria-hidden="true">×</span>}
              </button>
            ) : null}
          </div>

          {renderedCapabilityPreview ? (
            <div data-testid="my-flow-export-capability-preview" className="mt-3">
              {renderedCapabilityPreview}
            </div>
          ) : null}

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
                aria-label="옮길 범위"
              >
                <span className="text-sm font-semibold text-[var(--flowme-text)]">{scopeLabel}</span>
                <span className="sr-only"> · {plan.includedCount}개</span>
              </div>
            ) : (
              <div
                data-testid="my-flow-export-scope-control"
                className={`mt-1 grid-cols-2 ${FLOW_UI_SEGMENTED_CLASS}`}
                role="group"
                aria-label="옮길 범위"
              >
                <button
                  type="button"
                  data-testid="my-flow-export-scope-flow"
                  aria-pressed={scope === 'flow'}
                  className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${scope === 'flow' ? FLOW_UI_SEGMENT_ACTIVE_CLASS : FLOW_UI_SEGMENT_IDLE_CLASS}`}
                  onClick={() => onScopeChange('flow')}
                >
                  {q3CopyEnabled ? '계획 전체' : 'Flow 전체'}<span className="sr-only"> · {flowPlan.includedCount}개</span>
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
                selectionAriaLabel={(item) => `${item.title} 옮길 항목으로 선택`}
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
                ? `반복 계획 ${plan.metrics.recurringSeriesCount}개 · 캘린더 파일 ${calendarOutputCount}개 · 화면 회차 ${plan.metrics.visibleOccurrenceCount}개`
                : `캘린더 ${calendarOutputCount}개`}
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
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <p
                  id="my-flow-export-format-heading"
                  className="text-xs font-semibold text-[var(--flowme-text-secondary)]"
                >
                  2 · 형식
                </p>
                {approvedSavedTransfer ? (
                  <FlowContextDisclosure
                    kind="help"
                    label="옮기기 형식 도움"
                    title="어떤 형식을 고를까요?"
                    testId="my-flow-transfer-format-help"
                  >
                    <div className="space-y-2 text-sm leading-6">
                      <p><strong>텍스트</strong>는 계획 전체를 읽을 수 있는 TXT로 복사합니다.</p>
                      <p><strong>할 일</strong>은 Item마다 VTODO 하나를 만듭니다.</p>
                      <p><strong>캘린더</strong>는 날짜가 있는 Item마다 VEVENT 하나를 만듭니다.</p>
                      <p><strong>Excel</strong>은 Item 하나를 표의 한 행으로 저장합니다.</p>
                    </div>
                  </FlowContextDisclosure>
                ) : null}
              </div>
              <p className="text-[11px] font-medium text-[var(--flowme-text-tertiary)]">
                이 범위에서 만들 수 있는 결과
              </p>
            </div>
            {calendarUnavailable ? (
              <p
                data-testid="my-flow-export-calendar-recovery"
                className="mt-2 border-l-2 border-[var(--flowme-border-strong)] pl-2 text-xs font-medium leading-5 text-[var(--flowme-text-secondary)]"
              >
                {q3CopyEnabled
                  ? '캘린더 파일은 날짜를 정한 항목만 만들 수 있어요. 계획으로 돌아가 날짜를 정해 주세요.'
                  : '캘린더 파일은 날짜를 정한 항목만 만들 수 있어요. Flow로 돌아가 날짜를 정해 주세요.'}
              </p>
            ) : null}
            <div
              ref={recommendationContainerRef}
              data-testid="my-flow-export-recommendations"
              data-p29-marker="P29-ARTIFACT-EXPORT-PREFLIGHT"
              className="mt-2"
            >
            {approvedSavedTransfer ? (
              <div
                role="tablist"
                aria-label="내 도구로 옮길 형식"
                className="grid grid-cols-4 overflow-hidden border-y border-[var(--flowme-border)]"
              >
                {destinations.map(renderApprovedTransferFormatTab)}
              </div>
            ) : exportRecommendation.visible.length > 0 ? (
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

            {!approvedSavedTransfer && exportRecommendation.additional.length > 0 ? (
              <details data-testid="my-flow-export-more-formats" className="border-b border-[var(--flowme-border)]">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-2 text-xs font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)]">
                  <span>형식 {exportRecommendation.visible.length + exportRecommendation.additional.length}개 중 {exportRecommendation.additional.length}개 더</span>
                  <span aria-hidden="true">⌄</span>
                </summary>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
                  {exportRecommendation.additional.map((candidate) => (
                    renderDestinationButton(candidate.destination, candidate)
                  ))}
                </div>
              </details>
            ) : null}
            {approvedSavedTransfer && previewDestination ? (
              <section
                id="my-flow-export-destination-preview"
                data-testid="my-flow-export-destination-preview"
                data-export-preview-destination={previewDestination}
                data-export-preview-format={SAVED_PLAN_TRANSFER_FORMAT_BY_DESTINATION[previewDestination]}
                className="mt-3 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)] p-3"
                aria-labelledby="my-flow-export-destination-preview-heading"
              >
                <div className="flex items-center justify-between gap-3">
                  <h5
                    id="my-flow-export-destination-preview-heading"
                    className="text-sm font-semibold text-[var(--flowme-text)]"
                  >
                    {approvedSavedTransferCopy[previewDestination].label} 미리보기
                  </h5>
                  {selectedSavedTransferPreview ? (
                    <span className="text-xs font-medium text-[var(--flowme-text-secondary)]">
                      {selectedSavedTransferPreview.outputCount}개
                    </span>
                  ) : null}
                </div>
                {previewDestination === 'memo'
                  && selectedSavedTransferPreview?.body.kind === 'text'
                  && (selectedSavedTransferPreview.body.previewItemCount ?? 0) < selectedSavedTransferPreview.itemCount ? (
                    <p
                      data-testid="my-flow-export-text-preview-scope"
                      className="mt-2 text-xs font-medium leading-5 text-[var(--flowme-text-secondary)]"
                    >
                      전체 {selectedSavedTransferPreview.itemCount}개 중 {selectedSavedTransferPreview.body.previewItemCount}개 미리보기 · 복사할 때는 전체 {selectedSavedTransferPreview.itemCount}개가 포함됩니다.
                    </p>
                  ) : null}
                {selectedSavedTransferPreview?.body.kind === 'text' ? (
                  <pre
                    ref={(node) => { approvedPreviewBodyRef.current = node; }}
                    tabIndex={-1}
                    data-testid="my-flow-export-text-preview"
                    className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--flowme-surface-subtle)] p-3 text-xs leading-5 text-[var(--flowme-text-secondary)]"
                  >
                    {selectedSavedTransferPreview.body.previewContent
                      ?? selectedSavedTransferPreview.body.content}
                  </pre>
                ) : selectedSavedTransferPreview?.body.kind === 'table' ? (
                  <div
                    ref={(node) => { approvedPreviewBodyRef.current = node; }}
                    tabIndex={-1}
                    className="mt-2 max-w-full overflow-x-auto rounded-lg border border-[var(--flowme-border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                  >
                    <table data-testid="my-flow-export-xlsx-preview" className="min-w-max border-collapse text-left text-xs">
                      <caption className="sr-only">저장된 계획 Excel 미리보기</caption>
                      <thead>
                        <tr>
                          {selectedSavedTransferPreview.body.columns.map((column) => (
                            <th key={column} scope="col" className="border-b border-r border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] px-2 py-2 font-semibold last:border-r-0">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSavedTransferPreview.body.rows.map((row, rowIndex) => (
                          <tr key={`${rowIndex}:${String(row[0] ?? '')}`}>
                            {row.map((cell, columnIndex) => (
                              <td key={`${columnIndex}:${String(cell)}`} className="max-w-64 whitespace-pre-wrap border-b border-r border-[var(--flowme-border)] px-2 py-2 align-top last:border-r-0">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p data-testid="my-flow-export-preview-missing" className="mt-2 text-xs leading-5 text-[var(--flowme-text-secondary)]">
                    이 형식의 실제 미리보기를 준비하고 있어요.
                  </p>
                )}
                {selectedSavedTransferPreview?.lossNote ? (
                  <div className="mt-2 flex items-start gap-2">
                    <p data-testid="my-flow-export-preview-loss-note" className="min-w-0 flex-1 text-xs leading-5 text-[var(--flowme-warning-strong)]">
                      {selectedSavedTransferPreview.lossNote}
                    </p>
                    {previewDestination === 'sheet' ? (
                      <FlowContextDisclosure
                        kind="caution"
                        label="Excel로 옮기기 전 주의사항"
                        title="Excel 파일은 자동 동기화되지 않아요"
                        testId="my-flow-transfer-excel-warning"
                      >
                        <div className="space-y-2 text-sm leading-6">
                          <p>Excel에서 바꾼 완료·날짜·메모는 FlowMe에 돌아오지 않습니다.</p>
                          <p>확인 항목은 새 행이나 Excel checkbox가 아니라 메모 셀의 Markdown 텍스트로 보존됩니다.</p>
                        </div>
                      </FlowContextDisclosure>
                    ) : null}
                  </div>
                ) : null}
                <div className={`mt-3 grid gap-2 ${previewDestination === 'calendar' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {previewDestination === 'calendar' ? (
                    <button
                      type="button"
                      data-testid="my-flow-export-calendar-review"
                      className="min-h-12 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border-strong)] bg-white px-3 text-sm font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                      onClick={() => {
                        approvedPreviewBodyRef.current?.focus({ preventScroll: true });
                        approvedPreviewBodyRef.current?.scrollIntoView({ block: 'nearest' });
                      }}
                    >
                      내용 확인
                    </button>
                  ) : null}
                  <button
                    type="button"
                    data-testid="my-flow-export-approved-cta"
                    data-export-destination={previewDestination}
                    data-export-format={SAVED_PLAN_TRANSFER_FORMAT_BY_DESTINATION[previewDestination]}
                    disabled={selectedSavedTransferUnavailable || pendingDestination !== null}
                    aria-busy={pendingDestination === previewDestination || undefined}
                    className="min-h-12 w-full rounded-[var(--flowme-radius-control)] bg-[var(--flowme-action)] px-3 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => runExport(previewDestination)}
                  >
                    {pendingDestination === previewDestination
                      ? '준비 중...'
                      : approvedSavedTransferCta[previewDestination]}
                  </button>
                </div>
              </section>
            ) : null}
            {destinations.flatMap((destination) => {
              const notice = destinationNotices?.[destination]?.trim();
              return notice ? [(
                <p
                  key={destination}
                  data-testid={`my-flow-export-${destination}-format-notice`}
                  className="mt-2 border-l-2 border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] px-2 py-1.5 text-xs font-medium leading-5 text-[var(--flowme-warning-strong)]"
                >
                  {notice}
                </p>
              )] : [];
            })}

            <div hidden aria-hidden="true">
              {exportRecommendation.unavailable.map((destination) => (
                renderDestinationButton(destination, undefined, true)
              ))}
            </div>
            </div>
          </section>

          {visibleReceipt ? (
            <div ref={receiptContainerRef} data-testid="my-flow-export-receipt-step">
              <p className="mt-3 text-xs font-semibold text-[var(--flowme-text-secondary)]">3 · 결과</p>
              <FlowExportReceipt
                receipt={visibleReceipt}
                flowTitle={flowTitle}
                sourceLabel={sourceLabel}
                stableIdentity={stableIdentity}
                q3CopyEnabled={q3CopyEnabled}
              />
            </div>
          ) : null}

          {transferReceipt}
          {transferLayer}

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
