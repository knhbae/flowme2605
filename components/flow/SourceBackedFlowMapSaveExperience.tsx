'use client';

import { useState } from 'react';

import { toContentDisplayTitle, toUserFacingSourceTitle } from '@/lib/flow/display-title';
import {
  buildEffectiveFlowMapSnapshot,
  buildFlowMapCanonicalItemId,
  type EffectiveFlowMapSnapshot,
} from '@/lib/flow/effective-flow-map-snapshot';
import { buildEffectiveFlowMapResult } from '@/lib/flow/effective-flow-map-result';
import type { EffectiveFlowExportDestination } from '@/lib/flow/effective-flow-snapshot';
import type { FlowExperienceProjectionRow } from '@/lib/flow/flow-experience-projection';
import { getQ3UserCopyProfile } from '@/lib/flow/q3-user-copy';
import type { SourceBackedFlowMapPublishPackage } from '@/lib/flow/source-backed-my-flow';
import { FlowSaveBeforeFrame } from './FlowSaveBeforeFrame';
import { PublicFlowItemPreview } from './PublicFlowItemPreview';
import { PublicPlanResultPreview } from './PublicPlanResultPreview';
import { SourceBackedFlowMapExecutionOutline } from './SourceBackedFlowMapExecutionOutline';
import { SourceBackedFlowMapSaveButton } from './SourceBackedFlowMapSaveButton';

type SourceBackedFlowMapSaveExperienceProps = {
  publishPackage: SourceBackedFlowMapPublishPackage;
  displayTitle: string;
  sourceLabel: string;
  q3CopyEnabled?: boolean;
  visualSubtractionEnabled?: boolean;
};

type ApprovedPublicDestination = Extract<
  EffectiveFlowExportDestination,
  'memo' | 'checklist' | 'calendar'
>;

function buildLegacyDisplayFlows(
  publishPackage: SourceBackedFlowMapPublishPackage,
  snapshot: EffectiveFlowMapSnapshot,
) {
  const effectiveIds = new Set(snapshot.itemIds.effective);
  return publishPackage.public.childFlows.flatMap((flow) => {
    const steps = flow.steps.flatMap((step) => {
      const itemKey = buildFlowMapCanonicalItemId(flow.slug, step.id);
      return effectiveIds.has(itemKey) ? [{ ...step, itemKey }] : [];
    });
    return steps.length > 0 ? [{ ...flow, steps }] : [];
  });
}

export function SourceBackedFlowMapSaveExperience({
  publishPackage,
  displayTitle,
  sourceLabel,
  q3CopyEnabled = true,
  visualSubtractionEnabled = true,
}: SourceBackedFlowMapSaveExperienceProps) {
  const copy = getQ3UserCopyProfile(q3CopyEnabled);
  const [snapshot, setSnapshot] = useState(() => buildEffectiveFlowMapSnapshot({
    publishPackage,
    effectiveTitle: displayTitle,
    executionState: 'executable',
    sourceLabel,
  }));
  const [anchor, setAnchor] = useState(publishPackage.public.setupInput?.defaultValue ?? '');
  const [selectedDestination, setSelectedDestination] = useState<ApprovedPublicDestination>('memo');
  const [previewItem, setPreviewItem] = useState<{
    row: FlowExperienceProjectionRow;
    returnFocusSelector: string;
  }>();
  const { public: publicSurface } = publishPackage;
  const previewAnchor = selectedDestination === 'calendar' ? anchor : '';
  const publicResult = buildEffectiveFlowMapResult({
    publishPackage,
    mapSnapshot: snapshot,
    anchor: previewAnchor,
    q3CopyEnabled,
  });
  const selectedCandidate = publicResult.viewModel.all.find(
    (candidate) => candidate.destination === selectedDestination,
  );
  const selectedResultReady = Boolean(
    selectedCandidate
      && selectedCandidate.outputCount > 0
      && selectedCandidate.availability !== 'held'
      && selectedCandidate.availability !== 'unavailable',
  );
  const selectedResultMessage = selectedDestination === 'calendar'
    ? '날짜가 있는 Todo가 없어요. Text 또는 Todo를 선택해 저장해 주세요.'
    : '이 형식으로 저장할 수 있는 Item이 없어요. 다른 결과 형식을 선택해 주세요.';
  const approvedPreviewRows = publicResult.previewRows.map((row) => ({
    id: row.id,
    timing: row.section,
    title: row.title,
    summary: row.memo ?? row.description,
  }));
  const legacyPreviewRows = snapshot.rows.map((row) => ({
    id: row.itemId,
    timing: row.stepTitle ? toUserFacingSourceTitle(row.stepTitle) : undefined,
    title: row.title,
    summary: row.detailItems[0],
  }));
  const legacyDisplayFlows = visualSubtractionEnabled
    ? []
    : buildLegacyDisplayFlows(publishPackage, snapshot);
  const legacyResultLabel = (publicSurface.artifacts[0] ?? '실행 준비')
    .replace(/\d+개/u, `${snapshot.counts.effective}개`);
  const savedFlows = publicSurface.childFlows.map((flow) => ({
    slug: flow.slug,
    title: toContentDisplayTitle(flow.title),
    artifactMode: flow.destination === 'sheet'
      ? 'sheet' as const
      : flow.destination === 'calendar' || flow.destination === 'hybrid'
        ? 'calendar' as const
        : 'checklist' as const,
    steps: flow.steps.map((step) => ({ id: step.id, title: step.title })),
  }));

  return (
    <div
      data-testid="flow-map-effective-snapshot"
      data-flow-map-snapshot-hash={snapshot.snapshotHash}
      data-flow-map-title={snapshot.effectiveTitle}
      data-flow-map-item-count={snapshot.counts.effective}
      data-flow-map-item-ids={JSON.stringify(snapshot.itemIds.effective)}
      data-public-result-owner={publicResult.owner.kind}
      data-public-result-owner-id={publicResult.owner.mapId}
      data-public-result-owner-version={publicResult.owner.sourceVersion}
      data-public-result-owner-hash={publicResult.owner.snapshotHash}
    >
      <FlowSaveBeforeFrame
        rootTestId="flow-map-hero"
        previewTestId="flow-map-artifact-preview"
        previewRowTestId="flow-map-artifact-preview-row"
        eyebrow={copy.publicPreview.eyebrow}
        title={snapshot.effectiveTitle}
        categoryLabel={publicSurface.categoryLabel}
        sourceLabel={toUserFacingSourceTitle(publicSurface.sourceTitle)}
        sourceHref={snapshot.identity.sourceUrl}
        inputLabel={publicSurface.setupInput?.label ?? '입력 없음'}
        resultLabel={visualSubtractionEnabled
          ? selectedCandidate?.countLabel ?? `${snapshot.counts.effective}개`
          : legacyResultLabel}
        itemCount={snapshot.counts.effective}
        previewRows={visualSubtractionEnabled ? approvedPreviewRows : legacyPreviewRows}
        artifactPreview={visualSubtractionEnabled ? (
          <PublicPlanResultPreview
            viewModel={publicResult.viewModel}
            selectedDestination={selectedDestination}
            previewRowLimit={6}
            testId="public-flow-capability-result"
            anchorDate={previewAnchor}
            calendarEmptyAction={(
              <p data-testid="flow-map-calendar-empty-action" className="px-3 py-4 text-sm text-[var(--flowme-text-secondary)]">
                날짜가 있는 Todo가 없어요. Text 또는 Todo 결과를 확인해 주세요.
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
        ) : undefined}
        actions={(
          <SourceBackedFlowMapSaveButton
            effectiveSnapshot={snapshot}
            defaultTitle={displayTitle}
            anchor={anchor}
            onAnchorChange={setAnchor}
            selectedArtifactMode={visualSubtractionEnabled ? selectedDestination : undefined}
            selectedResultReady={visualSubtractionEnabled ? selectedResultReady : true}
            selectedResultMessage={visualSubtractionEnabled ? selectedResultMessage : undefined}
            q3CopyEnabled={q3CopyEnabled}
            visualSubtractionEnabled={visualSubtractionEnabled}
            onEffectiveSnapshotChange={setSnapshot}
            editorRows={publicResult.editorRows}
            savedFlows={savedFlows}
            setupInput={publicSurface.setupInput}
          />
        )}
        composition={visualSubtractionEnabled ? 'artifact-first' : 'legacy'}
        showScheduleIntent={!visualSubtractionEnabled}
        q3CopyEnabled={q3CopyEnabled}
      />
      {!visualSubtractionEnabled ? (
        <SourceBackedFlowMapExecutionOutline
          sourceTitle={publicSurface.sourceTitle}
          sourceHref={snapshot.identity.sourceUrl}
          sourceLabel={snapshot.identity.sourceLabel}
          sourceActionIntent="open_source"
          summary={publicSurface.summary}
          inputLabel={publicSurface.setupInput ? '입력 1개' : '입력 없음'}
          itemCount={snapshot.counts.effective}
          chooseChildBeforeSave={false}
          childCtaLabel="설정하고 시작"
          flows={legacyDisplayFlows}
        />
      ) : null}
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
