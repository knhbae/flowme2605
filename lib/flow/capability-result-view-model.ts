import {
  buildEffectiveFlowProjectionManifest,
  type EffectiveFlowProjectionAvailability,
  type EffectiveFlowProjectionConsumer,
  type EffectiveFlowProjectionManifest,
  type EffectiveFlowProjectionScope,
} from './effective-flow-contract';
import type {
  EffectiveFlowExportDestination,
  EffectiveFlowResult,
  EffectiveFlowSnapshot,
} from './effective-flow-snapshot';
import type {
  FlowExperienceProjectionRow,
  FlowExperienceShape,
} from './flow-experience-projection';

export const FLOW_CAPABILITY_RESULT_DESTINATIONS = [
  'calendar',
  'checklist',
  'sheet',
  'memo',
] as const satisfies readonly EffectiveFlowExportDestination[];

export type FlowCapabilityResultLifecycle = 'public_preview' | 'saved_detail';
export type FlowCapabilityResultRole = 'primary' | 'available' | 'conditional' | 'unavailable';

export type FlowCapabilityResultCandidate = {
  destination: EffectiveFlowExportDestination;
  shape: Exclude<FlowExperienceShape, 'flow_execution'>;
  label: string;
  role: FlowCapabilityResultRole;
  availability: EffectiveFlowProjectionAvailability;
  outputCount: number;
  expectedOutputCount: number;
  countLabel: string;
  rows: FlowExperienceProjectionRow[];
  manifest: EffectiveFlowProjectionManifest;
  conditionAction?: 'edit_schedule' | 'edit_plan';
  conditionLabel?: string;
  reason: string;
  lossSummary: string;
};

export type FlowResultSemanticAction =
  | 'save-to-personal-plan'
  | 'edit-public-draft'
  | 'create-quick-local-result'
  | 'execute-saved-result'
  | 'edit-saved-plan'
  | 'transfer-to-own-tool';

export type FlowResultActionOwner = {
  role: FlowResultSemanticAction;
  priority: 'primary' | 'secondary' | 'hidden';
  owner: string;
  persistence: 'none' | 'session' | 'saved_plan' | 'persistent_receipt';
};

export const FLOW_RESULT_ACTION_HIERARCHY: Record<
  FlowCapabilityResultLifecycle,
  readonly FlowResultActionOwner[]
> = {
  public_preview: [
    {
      role: 'save-to-personal-plan',
      priority: 'primary',
      owner: 'public_save_action',
      persistence: 'saved_plan',
    },
    {
      role: 'edit-public-draft',
      priority: 'secondary',
      owner: 'shared_plan_editor',
      persistence: 'session',
    },
    {
      role: 'create-quick-local-result',
      priority: 'hidden',
      owner: 'public_quick_confirmation',
      persistence: 'session',
    },
  ],
  saved_detail: [
    {
      role: 'execute-saved-result',
      priority: 'primary',
      owner: 'saved_plan_detail',
      persistence: 'saved_plan',
    },
    {
      role: 'edit-saved-plan',
      priority: 'secondary',
      owner: 'shared_plan_editor',
      persistence: 'saved_plan',
    },
    {
      role: 'transfer-to-own-tool',
      priority: 'secondary',
      owner: 'saved_transfer_confirmation',
      persistence: 'persistent_receipt',
    },
  ],
};

export type FlowCapabilityResultViewModel = {
  lifecycle: FlowCapabilityResultLifecycle;
  stateLabel: string;
  scopeLabel: string;
  receiptLabel: string;
  snapshotKind: 'effective_authoring' | 'effective_execution';
  snapshotVersion: string;
  result: EffectiveFlowResult;
  primary?: FlowCapabilityResultCandidate;
  available: FlowCapabilityResultCandidate[];
  additionalAvailable: FlowCapabilityResultCandidate[];
  conditional: FlowCapabilityResultCandidate[];
  unavailable: FlowCapabilityResultCandidate[];
  selectable: FlowCapabilityResultCandidate[];
  all: FlowCapabilityResultCandidate[];
  actions: readonly FlowResultActionOwner[];
};

const DESTINATION_LABEL: Record<EffectiveFlowExportDestination, string> = {
  calendar: '캘린더',
  checklist: '체크리스트',
  sheet: '시트',
  memo: '메모',
};

function destinationShape(
  destination: EffectiveFlowExportDestination,
): Exclude<FlowExperienceShape, 'flow_execution'> {
  return destination;
}

function outputCountLabel(
  destination: EffectiveFlowExportDestination,
  count: number,
): string {
  if (destination === 'calendar') return `일정 ${count}개`;
  if (destination === 'sheet') return `${count}행`;
  return `${count}개`;
}

function firstReason(manifest: EffectiveFlowProjectionManifest): string | undefined {
  return manifest.requestedItemIds
    .map((itemId) => manifest.reasonsByItemId[itemId])
    .find(Boolean);
}

function candidateReason(manifest: EffectiveFlowProjectionManifest): string {
  if (manifest.availability === 'held') {
    return firstReason(manifest) ?? '현재 검토 상태에서는 이 결과를 만들 수 없습니다.';
  }
  if (manifest.destination === 'calendar' && manifest.counts.held > 0) {
    return manifest.counts.eligible > 0
      ? `날짜가 있는 ${manifest.counts.eligible}개를 먼저 확인할 수 있어요.`
      : '날짜를 정하면 캘린더 결과를 확인할 수 있어요.';
  }
  if (manifest.availability === 'unavailable') {
    return firstReason(manifest) ?? '현재 내용은 이 형식으로 의미 있게 옮길 수 없습니다.';
  }
  if (manifest.availability === 'conditional' && manifest.counts.unavailable > 0) {
    return `${manifest.counts.output}개를 확인할 수 있고 ${manifest.counts.unavailable}개는 이 형식에 포함되지 않아요.`;
  }
  return `${DESTINATION_LABEL[manifest.destination]} 결과를 지금 확인할 수 있어요.`;
}

function candidateLossSummary(manifest: EffectiveFlowProjectionManifest): string {
  const parts = [
    manifest.counts.held > 0 ? `조건 필요 ${manifest.counts.held}개` : '',
    manifest.counts.unavailable > 0 ? `표현 불가 ${manifest.counts.unavailable}개` : '',
    manifest.counts.excluded > 0 ? `제외 ${manifest.counts.excluded}개` : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '선택 범위 전체 유지';
}

function buildCandidate(options: {
  result: EffectiveFlowResult;
  manifest: EffectiveFlowProjectionManifest;
}): Omit<FlowCapabilityResultCandidate, 'role'> {
  const eligible = new Set(options.manifest.eligibleItemIds);
  const rows = options.result.projection.shapes[destinationShape(options.manifest.destination)].rows
    .filter((row) => eligible.has(row.id));
  const expectedOutputCount = options.manifest.counts.output + options.manifest.counts.held;
  const hasEditableCondition = options.manifest.availability === 'conditional'
    && options.manifest.counts.held > 0;

  return {
    destination: options.manifest.destination,
    shape: destinationShape(options.manifest.destination),
    label: DESTINATION_LABEL[options.manifest.destination],
    availability: options.manifest.availability,
    outputCount: options.manifest.counts.output,
    expectedOutputCount,
    countLabel: outputCountLabel(options.manifest.destination, options.manifest.counts.output),
    rows,
    manifest: options.manifest,
    ...(hasEditableCondition
      ? {
          conditionAction: options.manifest.destination === 'calendar'
            ? 'edit_schedule' as const
            : 'edit_plan' as const,
          conditionLabel: options.manifest.destination === 'calendar'
            ? `날짜를 정하면 최대 ${expectedOutputCount}개`
            : `내용을 수정하면 최대 ${expectedOutputCount}개`,
        }
      : {}),
    reason: candidateReason(options.manifest),
    lossSummary: candidateLossSummary(options.manifest),
  };
}

function uniqueDestinations(
  destinations: readonly EffectiveFlowExportDestination[],
): EffectiveFlowExportDestination[] {
  return destinations.filter((destination, index) => destinations.indexOf(destination) === index);
}

export function buildFlowCapabilityResultViewModel(options: {
  snapshot: EffectiveFlowSnapshot;
  lifecycle: FlowCapabilityResultLifecycle;
  q3CopyEnabled?: boolean;
  result?: EffectiveFlowResult;
  scope?: EffectiveFlowProjectionScope;
  preferredDestination?: EffectiveFlowExportDestination;
  executionState?: 'executable' | 'review_hold';
}): FlowCapabilityResultViewModel {
  const result = options.result ?? options.snapshot.committed;
  const snapshotKind = options.lifecycle === 'public_preview'
    ? 'effective_authoring'
    : 'effective_execution';
  const consumer: EffectiveFlowProjectionConsumer = options.lifecycle === 'public_preview'
    ? 'public_preview'
    : 'saved_detail';
  const preferredDestination = options.preferredDestination ?? result.selectedArtifactMode;
  const ranking = uniqueDestinations([
    preferredDestination,
    ...result.exportPlan.supportedDestinations,
    ...FLOW_CAPABILITY_RESULT_DESTINATIONS,
  ]);
  const unranked = FLOW_CAPABILITY_RESULT_DESTINATIONS.filter(
    (destination) => !ranking.includes(destination),
  );
  const manifests = [...ranking, ...unranked].map((destination) => (
    buildEffectiveFlowProjectionManifest({
      snapshot: options.snapshot,
      result,
      consumer,
      destination,
      scope: options.scope,
      snapshotKind,
      executionState: options.executionState,
    })
  ));
  const baseCandidates = manifests.map((manifest) => buildCandidate({ result, manifest }));
  const primaryIndex = baseCandidates.findIndex((candidate) => (
    candidate.outputCount > 0
    && candidate.availability !== 'held'
    && candidate.availability !== 'unavailable'
  ));
  const primary = primaryIndex >= 0
    ? { ...baseCandidates[primaryIndex], role: 'primary' as const }
    : undefined;
  const remainder = baseCandidates.filter((_, index) => index !== primaryIndex);
  const ready = remainder
    .filter((candidate) => candidate.availability === 'available' && candidate.outputCount > 0)
    .map((candidate) => ({ ...candidate, role: 'available' as const }));
  const conditional = remainder
    .filter((candidate) => candidate.availability === 'conditional')
    .map((candidate) => ({ ...candidate, role: 'conditional' as const }));
  const unavailable = remainder
    .filter((candidate) => (
      candidate.availability === 'held'
      || candidate.availability === 'unavailable'
      || (candidate.availability === 'available' && candidate.outputCount === 0)
    ))
    .map((candidate) => ({ ...candidate, role: 'unavailable' as const }));
  const available = ready.slice(0, 2);
  const additionalAvailable = ready.slice(2);
  const all = [
    ...(primary ? [primary] : []),
    ...available,
    ...additionalAvailable,
    ...conditional,
    ...unavailable,
  ];
  const q3CopyEnabled = options.q3CopyEnabled !== false;
  const stateLabel = q3CopyEnabled
    ? options.lifecycle === 'public_preview'
      ? '결과 미리보기'
      : '옮기기 전 미리보기'
    : options.lifecycle === 'public_preview'
      ? '저장 전 미리보기'
      : '저장한 Flow 결과';
  const scopeLabel = q3CopyEnabled
    ? options.lifecycle === 'public_preview'
      ? `현재 계획 · ${result.rows.length}개`
      : `저장한 계획 · ${result.rows.length}개`
    : options.lifecycle === 'public_preview'
      ? `현재 공개 초안 · ${result.rows.length}개`
      : `저장한 전체 Flow · ${result.rows.length}개`;
  const receiptLabel = q3CopyEnabled
    ? ''
    : options.lifecycle === 'public_preview'
      ? '아직 결과를 만들거나 기록하지 않았어요.'
      : '생성 전 · 옮긴 결과 기록은 생성 후 별도로 남아요.';

  return {
    lifecycle: options.lifecycle,
    stateLabel,
    scopeLabel,
    receiptLabel,
    snapshotKind,
    snapshotVersion: [
      options.snapshot.layers.source.version,
      options.snapshot.layers.personal.version,
      options.snapshot.layers.execution.version,
    ].join('|'),
    result,
    ...(primary ? { primary } : {}),
    available,
    additionalAvailable,
    conditional,
    unavailable,
    selectable: [
      ...(primary ? [primary] : []),
      ...available,
      ...additionalAvailable,
    ],
    all,
    actions: FLOW_RESULT_ACTION_HIERARCHY[options.lifecycle],
  };
}

export type PublicQuickResultEligibilityReason =
  | 'feature_disabled'
  | 'public_draft_modified'
  | 'no_ready_result'
  | 'result_requires_input'
  | 'not_local_only'
  | 'remote_or_provider_required'
  | 'persistent_receipt_required'
  | 'history_required'
  | 'payload_mismatch'
  | 'disclosure_missing'
  | 'save_path_missing';

export type PublicQuickResultEligibility = {
  eligible: boolean;
  reasonCode?: PublicQuickResultEligibilityReason;
  reasonCodes: PublicQuickResultEligibilityReason[];
  destination?: EffectiveFlowExportDestination;
  manifest?: EffectiveFlowProjectionManifest;
};

export function evaluatePublicQuickResultEligibility(options: {
  featureEnabled: boolean;
  publicDraftDirty: boolean;
  viewModel: FlowCapabilityResultViewModel;
  localOnly: boolean;
  requiresRemoteOrProvider: boolean;
  requiresPersistentReceipt: boolean;
  requiresHistory: boolean;
  payloadParity: boolean;
  disclosureVisible: boolean;
  savePathVisible: boolean;
}): PublicQuickResultEligibility {
  const reasons: PublicQuickResultEligibilityReason[] = [];
  const primary = options.viewModel.primary;
  if (!options.featureEnabled) reasons.push('feature_disabled');
  if (options.publicDraftDirty) reasons.push('public_draft_modified');
  if (!primary || primary.outputCount === 0) reasons.push('no_ready_result');
  if (primary?.availability === 'conditional') reasons.push('result_requires_input');
  if (!options.localOnly) reasons.push('not_local_only');
  if (options.requiresRemoteOrProvider) reasons.push('remote_or_provider_required');
  if (options.requiresPersistentReceipt) reasons.push('persistent_receipt_required');
  if (options.requiresHistory) reasons.push('history_required');
  if (!options.payloadParity) reasons.push('payload_mismatch');
  if (!options.disclosureVisible) reasons.push('disclosure_missing');
  if (!options.savePathVisible) reasons.push('save_path_missing');

  return {
    eligible: reasons.length === 0,
    ...(reasons[0] ? { reasonCode: reasons[0] } : {}),
    reasonCodes: reasons,
    ...(primary ? { destination: primary.destination, manifest: primary.manifest } : {}),
  };
}
