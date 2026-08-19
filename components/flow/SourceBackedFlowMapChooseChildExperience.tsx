'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { formatKoreanShortDate } from '@/lib/flow/date';
import { toContentDisplayTitle, toUserFacingSourceTitle } from '@/lib/flow/display-title';
import {
  buildEffectiveFlowMapSnapshot,
  buildFlowMapActionContractFromSnapshot,
  reviseEffectiveFlowMapSnapshot,
} from '@/lib/flow/effective-flow-map-snapshot';
import { buildEffectiveFlowMapResult } from '@/lib/flow/effective-flow-map-result';
import type { EffectiveFlowExportDestination } from '@/lib/flow/effective-flow-snapshot';
import type { FlowExperienceProjectionRow } from '@/lib/flow/flow-experience-projection';
import { getQ3UserCopyProfile } from '@/lib/flow/q3-user-copy';
import type { SourceBackedFlowMapPublishPackage } from '@/lib/flow/source-backed-my-flow';
import { FlowSaveBeforeFrame } from './FlowSaveBeforeFrame';
import { PublicFlowItemPreview } from './PublicFlowItemPreview';
import { PublicPlanResultPreview } from './PublicPlanResultPreview';

type ApprovedPublicDestination = Extract<
  EffectiveFlowExportDestination,
  'memo' | 'checklist' | 'calendar'
>;

export function SourceBackedFlowMapChooseChildExperience({
  publishPackage,
  displayTitle,
  sourceLabel,
  q3CopyEnabled = true,
}: {
  publishPackage: SourceBackedFlowMapPublishPackage;
  displayTitle: string;
  sourceLabel: string;
  q3CopyEnabled?: boolean;
}) {
  const copy = getQ3UserCopyProfile(q3CopyEnabled);
  const baseSnapshot = useMemo(() => buildEffectiveFlowMapSnapshot({
    publishPackage,
    effectiveTitle: displayTitle,
    executionState: 'executable',
    sourceLabel,
  }), [displayTitle, publishPackage, sourceLabel]);
  const defaultChildSlug = publishPackage.public.recommendedFlowSlug
    && publishPackage.public.childFlows.some(
      (child) => child.slug === publishPackage.public.recommendedFlowSlug,
    )
    ? publishPackage.public.recommendedFlowSlug
    : publishPackage.public.childFlows[0]?.slug ?? '';
  const [selectedChildSlug, setSelectedChildSlug] = useState(defaultChildSlug);
  const [selectedDestination, setSelectedDestination] = useState<ApprovedPublicDestination>('memo');
  const [previewItem, setPreviewItem] = useState<{
    row: FlowExperienceProjectionRow;
    returnFocusSelector: string;
  }>();
  const selectedChild = publishPackage.public.childFlows.find(
    (child) => child.slug === selectedChildSlug,
  ) ?? publishPackage.public.childFlows[0];
  if (!selectedChild) return null;
  const selectedItemIds = baseSnapshot.canonicalRows
    .filter((row) => row.flowSlug === selectedChild.slug)
    .map((row) => row.itemId);
  const selectedSnapshot = reviseEffectiveFlowMapSnapshot(baseSnapshot, {
    effectiveTitle: selectedChild.title,
    selectedItemIds,
  });
  const previewAnchor = selectedDestination === 'calendar'
    ? publishPackage.public.setupInput?.defaultValue
    : undefined;
  const publicResult = buildEffectiveFlowMapResult({
    publishPackage,
    mapSnapshot: selectedSnapshot,
    anchor: previewAnchor,
    q3CopyEnabled,
  });
  const selectedCandidate = publicResult.viewModel.all.find(
    (candidate) => candidate.destination === selectedDestination,
  );
  const actionContract = buildFlowMapActionContractFromSnapshot(baseSnapshot, {
    surface: 'public_preview',
    editable: false,
    exportable: false,
  });
  const choiceCopy = publishPackage.public.choiceCopy ?? {
    heading: '먼저 계획 하나를 고르세요.',
    body: '각 계획의 결과를 확인한 뒤 필요한 계획만 여세요.',
    childCtaLabel: '내용 보고 시작',
  };
  const previewRows = publicResult.previewRows.map((row) => ({
    id: row.id,
    timing: row.section,
    title: row.title,
    summary: row.memo ?? row.description,
  }));
  const selectedChildTitle = toContentDisplayTitle(selectedChild.title);
  const childSelector = (
    <section
      data-testid="flow-map-choose-child"
      data-map-action-intent={actionContract.actions.primary?.intent}
      aria-labelledby="flow-map-choose-child-heading"
      className="rounded-[var(--flowme-radius-card)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] px-3 py-3"
    >
      <h2
        id="flow-map-choose-child-heading"
        className="text-sm font-semibold text-[var(--flowme-text)]"
      >
        확인할 계획
      </h2>
      <p
        data-testid="flow-map-selected-child-copy"
        className="mt-1 text-xs font-semibold leading-5 text-[var(--flowme-action-strong)]"
      >
        현재 {selectedChildTitle} 선택됨
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--flowme-text-secondary)]">
        {choiceCopy.body}
      </p>
      <fieldset className="mt-3 grid gap-2">
        <legend className="sr-only">
          {q3CopyEnabled ? copy.map.selectPlans : '사용할 Flow 선택'}
        </legend>
        {publishPackage.public.childFlows.map((child) => {
          const selected = child.slug === selectedChild.slug;
          return (
            <label
              key={child.slug}
              data-testid="flow-map-child-choice"
              data-flow-slug={child.slug}
              className={`flex min-h-12 cursor-pointer items-center rounded-md border px-3 py-2.5 text-left text-sm font-semibold focus-within:ring-2 focus-within:ring-[var(--flowme-focus)] ${selected
                ? 'border-[var(--flowme-action)] bg-[var(--flowme-action-soft)] text-[var(--flowme-action)]'
                : 'border-[var(--flowme-border)] bg-white text-[var(--flowme-text)]'}`}
            >
              <input
                className="sr-only"
                type="radio"
                name={`flow-map-child-${publishPackage.map.id}`}
                value={child.slug}
                checked={selected}
                onChange={() => {
                  setSelectedChildSlug(child.slug);
                  setSelectedDestination('memo');
                  setPreviewItem(undefined);
                }}
              />
              <span>{toContentDisplayTitle(child.title)}</span>
            </label>
          );
        })}
      </fieldset>
    </section>
  );

  return (
    <div
      data-testid="flow-map-effective-snapshot"
      data-flow-map-snapshot-hash={baseSnapshot.snapshotHash}
      data-flow-map-title={baseSnapshot.effectiveTitle}
      data-flow-map-item-count={selectedSnapshot.counts.effective}
      data-flow-map-item-ids={JSON.stringify(selectedSnapshot.itemIds.effective)}
      data-public-result-owner={publicResult.owner.kind}
      data-public-result-owner-id={publicResult.owner.mapId}
      data-public-result-owner-version={publicResult.owner.sourceVersion}
      data-public-result-owner-hash={publicResult.owner.snapshotHash}
      data-p35-visual-subtraction="on"
    >
      <FlowSaveBeforeFrame
        rootTestId="flow-map-hero"
        previewTestId="flow-map-artifact-preview"
        previewRowTestId="flow-map-artifact-preview-row"
        eyebrow={copy.publicPreview.eyebrow}
        title={displayTitle}
        categoryLabel={publishPackage.public.categoryLabel}
        sourceLabel={toUserFacingSourceTitle(publishPackage.public.sourceTitle)}
        sourceHref={actionContract.identity.source.href}
        inputLabel={publishPackage.public.choiceCopy?.inputLabel ?? '계획별 설정'}
        resultLabel={selectedCandidate?.countLabel ?? `${selectedSnapshot.counts.effective}개`}
        itemCount={selectedSnapshot.counts.effective}
        previewRows={previewRows}
        artifactPreview={(
          <div className="grid gap-3">
            {childSelector}
            <PublicPlanResultPreview
              viewModel={publicResult.viewModel}
              selectedDestination={selectedDestination}
              textSyntaxModel={publicResult.textSyntaxModel}
              previewRowLimit={6}
              testId="public-flow-capability-result"
              anchorDate={previewAnchor}
              calendarPreamble={publishPackage.public.setupInput ? (
                <div data-testid="flow-map-calendar-context" className="grid gap-1">
                  <p className="text-sm font-semibold text-[var(--flowme-text)]">
                    {publishPackage.public.setupInput.label}
                  </p>
                  <p className="text-xs leading-5 text-[var(--flowme-text-secondary)]">
                    {previewAnchor
                      ? `${formatKoreanShortDate(previewAnchor, { includeWeekday: true })} 기준 일정입니다. 계획을 열면 날짜를 바꿀 수 있어요.`
                      : '계획을 연 뒤 날짜를 정하면 Calendar 일정이 만들어집니다.'}
                  </p>
                </div>
              ) : undefined}
              calendarEmptyAction={(
                <p data-testid="flow-map-calendar-empty-action" className="px-3 py-4 text-sm text-[var(--flowme-text-secondary)]">
                  이 계획에는 아직 날짜가 있는 Todo가 없어요. 계획을 연 뒤 날짜를 정해 주세요.
                </p>
              )}
              onRowOpen={(row, returnFocusSelector) => {
                setPreviewItem({ row, returnFocusSelector });
              }}
              onSelect={(candidate) => {
                if (candidate.destination === 'memo'
                  || candidate.destination === 'checklist'
                  || candidate.destination === 'calendar') {
                  setSelectedDestination(candidate.destination);
                }
              }}
            />
          </div>
        )}
        actions={(
          <div className="grid gap-3">
            {actionContract.risk.caution ? (
              <p
                data-testid="flow-map-risk-caution"
                data-adjacent-to-action={actionContract.risk.caution.adjacentToActionId}
                className="border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-950"
              >
                {actionContract.risk.caution.text}
              </p>
            ) : null}
            <Link
              data-testid="flow-map-open-selected-child"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--flowme-action)] px-4 py-3 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
              href={`/f/${selectedChild.slug}`}
            >
              {choiceCopy.childCtaLabel}
            </Link>
          </div>
        )}
        composition="artifact-first"
        q3CopyEnabled={q3CopyEnabled}
      />
      {previewItem ? (
        <PublicFlowItemPreview
          row={previewItem.row}
          memoText={previewItem.row.memo}
          returnFocusSelector={previewItem.returnFocusSelector}
          onClose={() => setPreviewItem(undefined)}
        />
      ) : null}
    </div>
  );
}
