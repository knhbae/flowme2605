'use client';

import { useState } from 'react';

import { toContentDisplayTitle, toUserFacingSourceTitle } from '@/lib/flow/display-title';
import {
  buildEffectiveFlowMapSnapshot,
  buildFlowMapCanonicalItemId,
  type EffectiveFlowMapSnapshot,
} from '@/lib/flow/effective-flow-map-snapshot';
import { getQ3UserCopyProfile } from '@/lib/flow/q3-user-copy';
import type { SourceBackedFlowMapPublishPackage } from '@/lib/flow/source-backed-my-flow';
import { FlowSaveBeforeFrame } from './FlowSaveBeforeFrame';
import { SourceBackedFlowMapExecutionOutline } from './SourceBackedFlowMapExecutionOutline';
import { SourceBackedFlowMapSaveButton } from './SourceBackedFlowMapSaveButton';

type SourceBackedFlowMapSaveExperienceProps = {
  publishPackage: SourceBackedFlowMapPublishPackage;
  displayTitle: string;
  sourceLabel: string;
  q3CopyEnabled?: boolean;
  visualSubtractionEnabled?: boolean;
};

function buildDisplayFlows(
  publishPackage: SourceBackedFlowMapPublishPackage,
  snapshot: EffectiveFlowMapSnapshot,
) {
  const effectiveIds = new Set<string>(snapshot.itemIds.effective);
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
  const { public: publicSurface } = publishPackage;
  const displayFlows = buildDisplayFlows(publishPackage, snapshot);
  const resultLabel = (publicSurface.artifacts[0] ?? '실행 준비')
    .replace(/\d+개/, `${snapshot.counts.effective}개`);
  const previewRows = snapshot.rows.map((row) => ({
    id: row.itemId,
    timing: row.stepTitle ? toUserFacingSourceTitle(row.stepTitle) : undefined,
    title: row.title,
    summary: row.detailItems[0],
  }));
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
        resultLabel={resultLabel}
        itemCount={snapshot.counts.effective}
        previewRows={previewRows}
        actions={(
          <SourceBackedFlowMapSaveButton
            effectiveSnapshot={snapshot}
            defaultTitle={displayTitle}
            q3CopyEnabled={q3CopyEnabled}
            visualSubtractionEnabled={visualSubtractionEnabled}
            onEffectiveSnapshotChange={setSnapshot}
            savedFlows={savedFlows}
            setupInput={publicSurface.setupInput}
          />
        )}
        composition="legacy"
        showScheduleIntent={!visualSubtractionEnabled}
        q3CopyEnabled={q3CopyEnabled}
      />

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
        flows={displayFlows}
      />
    </div>
  );
}
