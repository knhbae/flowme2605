'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';

import type {
  FlowCapabilityResultCandidate,
  FlowCapabilityResultViewModel,
  FlowResultSemanticAction,
} from '@/lib/flow/capability-result-view-model';
import type { EffectiveFlowExportDestination } from '@/lib/flow/effective-flow-snapshot';
import type {
  FlowExperienceProjection,
  FlowExperienceShape,
} from '@/lib/flow/flow-experience-projection';
import { FlowArtifactDataPreview } from './FlowArtifactDataPreview';

const ACTION_LABELS: Record<FlowResultSemanticAction, string> = {
  'save-to-personal-plan': '내 Flow에 저장',
  'edit-public-draft': '수정',
  'create-quick-local-result': '바로 결과 만들기',
  'execute-saved-result': '계속 실행',
  'edit-saved-plan': '수정',
  'transfer-to-own-tool': '내 도구로 옮기기',
};

export type FlowCapabilityResultPreviewProps = {
  viewModel: FlowCapabilityResultViewModel;
  selectedDestination?: EffectiveFlowExportDestination;
  onSelect?: (candidate: FlowCapabilityResultCandidate) => void;
  onEdit?: (candidate: FlowCapabilityResultCandidate) => void;
  onAction?: (action: FlowResultSemanticAction) => void;
  actionLabels?: Partial<Record<FlowResultSemanticAction, string>>;
  previewRowLimit?: number;
  testId?: string;
};

function getCandidateKey(candidate: FlowCapabilityResultCandidate): string {
  return `${candidate.destination}:${candidate.manifest.snapshotHash}`;
}

function getCandidateByDestination(
  viewModel: FlowCapabilityResultViewModel,
  destination?: EffectiveFlowExportDestination,
): FlowCapabilityResultCandidate | undefined {
  if (!destination) return undefined;
  return viewModel.selectable.find((candidate) => candidate.destination === destination);
}

function buildCandidateProjection(
  viewModel: FlowCapabilityResultViewModel,
  candidate: FlowCapabilityResultCandidate,
): FlowExperienceProjection {
  const base = viewModel.result.projection;
  const emptyShape = (shape: FlowExperienceShape) => ({
    ...base.shapes[shape],
    role: 'not_applicable' as const,
    rows: [],
    count: 0,
  });
  const shapes: FlowExperienceProjection['shapes'] = {
    flow_execution: emptyShape('flow_execution'),
    calendar: emptyShape('calendar'),
    checklist: emptyShape('checklist'),
    sheet: emptyShape('sheet'),
    memo: emptyShape('memo'),
  };

  shapes[candidate.shape] = {
    ...base.shapes[candidate.shape],
    role: 'primary',
    rows: candidate.rows,
    count: candidate.rows.length,
  };

  return {
    ...base,
    primaryShape: candidate.shape,
    secondaryShapes: [],
    outlineRows: candidate.rows,
    shapes,
  };
}

function CandidateChoice({
  candidate,
  selected,
  immediate,
  onSelect,
}: {
  candidate: FlowCapabilityResultCandidate;
  selected: boolean;
  immediate: boolean;
  onSelect: (candidate: FlowCapabilityResultCandidate) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-testid="flow-capability-result-choice"
      data-capability-candidate-role={candidate.role}
      data-capability-candidate-state={candidate.availability}
      data-capability-destination={candidate.destination}
      data-capability-immediate={immediate ? 'true' : 'false'}
      data-capability-snapshot-kind={candidate.manifest.snapshotKind}
      data-capability-manifest-hash={candidate.manifest.snapshotHash}
      data-capability-manifest-item-ids={candidate.manifest.eligibleItemIds.join(',')}
      data-capability-manifest-requested-item-ids={candidate.manifest.requestedItemIds.join(',')}
      data-capability-output-count={candidate.outputCount}
      data-capability-expected-output-count={candidate.expectedOutputCount}
      className={`min-h-[var(--flowme-control-height)] rounded-[var(--flowme-radius-control)] border px-3 py-2 text-left text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${
        selected
          ? 'border-[var(--flowme-action)] bg-[var(--flowme-action-soft)] text-[var(--flowme-action-strong)]'
          : 'border-[var(--flowme-border)] bg-[var(--flowme-surface)] text-[var(--flowme-text-secondary)] hover:border-[var(--flowme-action)]'
      }`}
      onClick={() => onSelect(candidate)}
    >
      <span className="block text-[10px] font-semibold text-[var(--flowme-text-tertiary)]">
        {selected ? '선택한 결과' : candidate.role === 'primary' ? '추천 결과' : '다른 결과'}
      </span>
      <span className="mt-0.5 block">{candidate.label} · {candidate.countLabel}</span>
    </button>
  );
}

function ConditionalResult({
  candidate,
  onEdit,
}: {
  candidate: FlowCapabilityResultCandidate;
  onEdit?: (candidate: FlowCapabilityResultCandidate) => void;
}) {
  return (
    <li
      data-testid="flow-capability-conditional-result"
      data-capability-candidate-role="conditional"
      data-capability-candidate-state={candidate.availability}
      data-capability-destination={candidate.destination}
      data-capability-snapshot-kind={candidate.manifest.snapshotKind}
      data-capability-manifest-hash={candidate.manifest.snapshotHash}
      data-capability-manifest-item-ids={candidate.manifest.eligibleItemIds.join(',')}
      data-capability-manifest-held-item-ids={candidate.manifest.heldItemIds.join(',')}
      data-capability-output-count={candidate.outputCount}
      data-capability-expected-output-count={candidate.expectedOutputCount}
      className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-3 py-3"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--flowme-text)]">{candidate.label}</p>
          <p className="mt-1 text-[11px] leading-5 text-[var(--flowme-text-secondary)]">
            {candidate.conditionLabel ?? candidate.reason}
          </p>
          {candidate.outputCount > 0 ? (
            <p className="mt-1 text-[11px] text-[var(--flowme-text-tertiary)]">
              현재 {candidate.countLabel} 확인 가능
            </p>
          ) : null}
        </div>
        {candidate.conditionAction && onEdit ? (
          <button
            type="button"
            data-testid="flow-capability-conditional-edit"
            data-condition-action={candidate.conditionAction}
            data-capability-destination={candidate.destination}
            className="min-h-[var(--flowme-control-height)] shrink-0 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] px-3 text-xs font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
            onClick={() => onEdit(candidate)}
          >
            설정
          </button>
        ) : null}
      </div>
    </li>
  );
}

function MissingMemoDetails({ candidate }: { candidate: FlowCapabilityResultCandidate }) {
  if (!['calendar', 'checklist'].includes(candidate.shape)) return null;
  const rowsWithMemo = candidate.rows.filter((row) => row.memo);
  if (rowsWithMemo.length === 0) return null;

  return (
    <details
      data-testid="flow-capability-preserved-memo"
      className="border-t border-[var(--flowme-border)] px-2 py-2"
    >
      <summary className="min-h-[var(--flowme-control-height)] cursor-pointer list-none py-3 text-xs font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">
        함께 담긴 메모 {rowsWithMemo.length}개
      </summary>
      <ul className="space-y-2 pb-2">
        {rowsWithMemo.map((row) => (
          <li key={row.id} data-item-id={row.id} className="rounded-[var(--flowme-radius-control)] bg-[var(--flowme-soft)] px-3 py-2">
            <p className="text-xs font-semibold text-[var(--flowme-text)]">{row.title}</p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--flowme-text-secondary)]">{row.memo}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function FlowCapabilityResultPreview({
  viewModel,
  selectedDestination,
  onSelect,
  onEdit,
  onAction,
  actionLabels,
  previewRowLimit = 6,
  testId = 'flow-capability-result-preview',
}: FlowCapabilityResultPreviewProps) {
  const headingId = useId();
  const firstSelectable = viewModel.primary
    ?? viewModel.available[0]
    ?? viewModel.additionalAvailable[0];
  const [internalDestination, setInternalDestination] = useState<EffectiveFlowExportDestination | undefined>(
    firstSelectable?.destination,
  );
  const controlledCandidate = getCandidateByDestination(viewModel, selectedDestination);
  const internalCandidate = getCandidateByDestination(viewModel, internalDestination);
  const selectedCandidate = controlledCandidate ?? internalCandidate ?? firstSelectable;
  const selectedProjection = useMemo(
    () => selectedCandidate
      ? buildCandidateProjection(viewModel, selectedCandidate)
      : undefined,
    [selectedCandidate, viewModel],
  );
  const immediateAvailable = viewModel.available.slice(0, 2);
  const immediateCandidates = [
    ...(viewModel.primary ? [viewModel.primary] : []),
    ...immediateAvailable,
  ];
  const conditionalCandidates = [
    ...(viewModel.primary?.availability === 'conditional' ? [viewModel.primary] : []),
    ...viewModel.conditional,
  ].filter((candidate, index, candidates) => (
    candidates.findIndex((item) => item.destination === candidate.destination) === index
  ));
  const metadataCandidate = selectedCandidate
    ?? conditionalCandidates[0]
    ?? viewModel.unavailable[0];
  const selectionKey = viewModel.selectable.map(getCandidateKey).join('|');
  const primaryAction = viewModel.actions.find((action) => action.priority === 'primary');
  const secondaryActions = viewModel.actions.filter((action) => action.priority === 'secondary');

  useEffect(() => {
    if (getCandidateByDestination(viewModel, internalDestination)) return;
    setInternalDestination(firstSelectable?.destination);
  }, [firstSelectable?.destination, internalDestination, selectionKey, viewModel]);

  const selectCandidate = (candidate: FlowCapabilityResultCandidate) => {
    setInternalDestination(candidate.destination);
    onSelect?.(candidate);
  };
  const visibleActions = viewModel.actions.filter((action) => action.priority !== 'hidden');

  return (
    <section
      data-testid={testId}
      data-capability-lifecycle={viewModel.lifecycle}
      data-capability-state={viewModel.stateLabel}
      data-capability-scope={viewModel.scopeLabel}
      data-capability-receipt={viewModel.receiptLabel}
      data-capability-snapshot-kind={viewModel.snapshotKind}
      data-capability-snapshot-version={viewModel.snapshotVersion}
      data-capability-primary-destination={viewModel.primary?.destination ?? ''}
      data-capability-selected-destination={selectedCandidate?.destination ?? ''}
      data-capability-manifest-hash={metadataCandidate?.manifest.snapshotHash ?? ''}
      data-capability-manifest-item-ids={metadataCandidate?.manifest.eligibleItemIds.join(',') ?? ''}
      data-capability-output-count={metadataCandidate?.outputCount ?? 0}
      data-capability-primary-action={primaryAction?.role ?? ''}
      data-capability-primary-action-owner={primaryAction?.owner ?? ''}
      data-capability-secondary-actions={secondaryActions.map((action) => action.role).join(',')}
      className="min-w-0 overflow-hidden rounded-[var(--flowme-radius-card)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)]"
      aria-labelledby={headingId}
    >
      <header className="px-3 py-3">
        <p className="text-[10px] font-semibold text-[var(--flowme-text-tertiary)]">{viewModel.stateLabel}</p>
        <h2 id={headingId} className="mt-0.5 text-sm font-semibold text-[var(--flowme-text)]">
          {viewModel.scopeLabel}
        </h2>
        {viewModel.receiptLabel ? (
          <p className="mt-1 text-[11px] leading-5 text-[var(--flowme-text-secondary)]">{viewModel.receiptLabel}</p>
        ) : null}
      </header>

      {immediateCandidates.length > 0 ? (
        <div
          role="group"
          aria-label="확인할 결과"
          data-testid="flow-capability-immediate-results"
          className="flex flex-wrap gap-1.5 border-t border-[var(--flowme-border)] px-3 py-3"
        >
          {immediateCandidates.map((candidate) => (
            <CandidateChoice
              key={getCandidateKey(candidate)}
              candidate={candidate}
              selected={candidate.destination === selectedCandidate?.destination}
              immediate
              onSelect={selectCandidate}
            />
          ))}
        </div>
      ) : null}

      {viewModel.additionalAvailable.length > 0 ? (
        <details className="border-t border-[var(--flowme-border)] px-3 py-2">
          <summary className="min-h-[var(--flowme-control-height)] cursor-pointer list-none py-3 text-xs font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">
            형식 {viewModel.selectable.length}개 중 {viewModel.additionalAvailable.length}개 더
          </summary>
          <div className="flex flex-wrap gap-1.5 pb-2">
            {viewModel.additionalAvailable.map((candidate) => (
              <CandidateChoice
                key={getCandidateKey(candidate)}
                candidate={candidate}
                selected={candidate.destination === selectedCandidate?.destination}
                immediate={false}
                onSelect={selectCandidate}
              />
            ))}
          </div>
        </details>
      ) : null}

      {selectedCandidate && selectedProjection ? (
        <div
          data-testid="flow-capability-selected-preview"
          data-capability-destination={selectedCandidate.destination}
          data-capability-manifest-hash={selectedCandidate.manifest.snapshotHash}
          data-capability-manifest-item-ids={selectedCandidate.manifest.eligibleItemIds.join(',')}
          data-capability-output-count={selectedCandidate.outputCount}
        >
          <FlowArtifactDataPreview
            projection={selectedProjection}
            selectedShape={selectedCandidate.shape}
            showShapeChoices={false}
            showRecommendationReason={false}
            previewRowLimit={previewRowLimit}
            testId="flow-capability-artifact-preview"
            rowTestId="flow-capability-artifact-preview-row"
            expandTestId="flow-capability-artifact-preview-expand"
          />
          <MissingMemoDetails candidate={selectedCandidate} />
        </div>
      ) : (
        <p data-testid="flow-capability-no-ready-result" className="border-t border-[var(--flowme-border)] px-3 py-5 text-sm text-[var(--flowme-text-secondary)]">
          지금 바로 확인할 결과가 없습니다.
        </p>
      )}

      {conditionalCandidates.length > 0 ? (
        <section className="border-t border-[var(--flowme-border)] px-3 py-3" aria-labelledby={`${headingId}-conditional`}>
          <h3 id={`${headingId}-conditional`} className="text-xs font-semibold text-[var(--flowme-text)]">입력이 더 필요한 결과</h3>
          <ul className="mt-2 space-y-2">
            {conditionalCandidates.map((candidate) => (
              <ConditionalResult
                key={getCandidateKey(candidate)}
                candidate={candidate}
                onEdit={onEdit}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {viewModel.unavailable.length > 0 ? (
        <details
          data-testid="flow-capability-unavailable-results"
          className="border-t border-[var(--flowme-border)] px-3 py-2"
        >
          <summary className="min-h-[var(--flowme-control-height)] cursor-pointer list-none py-3 text-xs font-semibold text-[var(--flowme-text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">
            현재 만들 수 없는 형식 {viewModel.unavailable.length}개
          </summary>
          <ul className="space-y-2 pb-3">
            {viewModel.unavailable.map((candidate) => (
              <li
                key={getCandidateKey(candidate)}
                data-testid="flow-capability-unavailable-result"
                data-capability-candidate-role="unavailable"
                data-capability-candidate-state={candidate.availability}
                data-capability-destination={candidate.destination}
                data-capability-snapshot-kind={candidate.manifest.snapshotKind}
                data-capability-manifest-hash={candidate.manifest.snapshotHash}
                data-capability-manifest-item-ids={candidate.manifest.eligibleItemIds.join(',')}
                data-capability-output-count={candidate.outputCount}
                className="rounded-[var(--flowme-radius-control)] bg-[var(--flowme-soft)] px-3 py-2"
              >
                <p className="text-xs font-semibold text-[var(--flowme-text)]">{candidate.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--flowme-text-secondary)]">{candidate.reason}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {onAction && visibleActions.length > 0 ? (
        <footer
          data-testid="flow-capability-result-actions"
          className="flex flex-wrap justify-end gap-2 border-t border-[var(--flowme-border)] px-3 py-3"
        >
          {visibleActions.map((action) => (
            <button
              key={action.role}
              type="button"
              data-testid="flow-capability-result-action"
              data-action-role={action.role}
              data-action-priority={action.priority}
              data-action-owner={action.owner}
              data-action-persistence={action.persistence}
              className={`min-h-[var(--flowme-control-height)] rounded-[var(--flowme-radius-control)] px-3 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${
                action.priority === 'primary'
                  ? 'bg-[var(--flowme-action)] text-white'
                  : 'border border-[var(--flowme-border)] bg-[var(--flowme-surface)] text-[var(--flowme-text)]'
              }`}
              onClick={() => onAction(action.role)}
            >
              {actionLabels?.[action.role] ?? ACTION_LABELS[action.role]}
            </button>
          ))}
        </footer>
      ) : null}

    </section>
  );
}
