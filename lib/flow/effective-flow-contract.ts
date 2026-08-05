import type {
  EffectiveFlowExportDestination,
  EffectiveFlowResult,
  EffectiveFlowSnapshot,
} from './effective-flow-snapshot';
import type { FlowExperienceProjectionRow } from './flow-experience-projection';

export const EFFECTIVE_FLOW_CONTRACT_SCHEMA_VERSION = 1 as const;
export const EFFECTIVE_FLOW_ARTIFACT_MANIFEST_VERSION = 1 as const;

export type EffectiveFlowLossTreatment =
  | 'preserved'
  | 'transformed'
  | 'omitted'
  | 'held'
  | 'unavailable';

export type EffectiveFlowContractField =
  | 'canonical_item_id'
  | 'item_title'
  | 'item_description'
  | 'schedule_date'
  | 'time_zone'
  | 'repeat_rule'
  | 'item_order'
  | 'item_inclusion'
  | 'completion_criterion'
  | 'personal_memo'
  | 'execution_memo'
  | 'completion_state'
  | 'warning'
  | 'resource_links'
  | 'source_url'
  | 'internal_overlay_version'
  | 'artifact_version'
  | 'scope'
  | 'receipt';

export type EffectiveFlowFieldChannel = 'manifest' | 'payload' | 'receipt';

export type EffectiveFlowFieldLossRule = {
  field: EffectiveFlowContractField;
  channel: EffectiveFlowFieldChannel;
  treatment: EffectiveFlowLossTreatment;
  condition: 'always' | 'when_present' | 'when_missing' | 'when_timed' | 'when_all_day';
  reason: string;
};

const SHARED_MANIFEST_RULES: EffectiveFlowFieldLossRule[] = [
  {
    field: 'canonical_item_id',
    channel: 'manifest',
    treatment: 'preserved',
    condition: 'always',
    reason: '미리보기, 저장, 결과 생성, 영수증이 같은 canonical Item ID를 사용합니다.',
  },
  {
    field: 'internal_overlay_version',
    channel: 'manifest',
    treatment: 'preserved',
    condition: 'always',
    reason: 'source, personal, execution layer version을 artifact manifest에 고정합니다.',
  },
  {
    field: 'internal_overlay_version',
    channel: 'payload',
    treatment: 'omitted',
    condition: 'always',
    reason: '내부 layer version은 사용자 결과 본문에 노출하지 않습니다.',
  },
  {
    field: 'artifact_version',
    channel: 'manifest',
    treatment: 'preserved',
    condition: 'always',
    reason: 'artifact contract version과 snapshot hash를 manifest에 남깁니다.',
  },
  {
    field: 'scope',
    channel: 'manifest',
    treatment: 'preserved',
    condition: 'always',
    reason: '전체, 선택 항목, 단일 항목 범위를 manifest에 그대로 남깁니다.',
  },
  {
    field: 'receipt',
    channel: 'receipt',
    treatment: 'preserved',
    condition: 'always',
    reason: '결과 영수증은 snapshot hash, scope, Item IDs, count, 제외 이유를 보존합니다.',
  },
];

const SHARED_TEXT_RULES: EffectiveFlowFieldLossRule[] = [
  {
    field: 'item_title',
    channel: 'payload',
    treatment: 'preserved',
    condition: 'always',
    reason: '개인화된 항목 제목을 그대로 직렬화합니다.',
  },
  {
    field: 'item_description',
    channel: 'payload',
    treatment: 'preserved',
    condition: 'when_present',
    reason: '원문 기반 설명을 별도 필드 또는 명시적 라벨로 보존합니다.',
  },
  {
    field: 'schedule_date',
    channel: 'payload',
    treatment: 'preserved',
    condition: 'when_present',
    reason: '날짜가 있는 항목은 yyyy-mm-dd 값을 바꾸지 않습니다.',
  },
  {
    field: 'time_zone',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'when_timed',
    reason: '시간대는 사람이 읽을 수 있는 일정 문장 또는 전용 열로 직렬화합니다.',
  },
  {
    field: 'time_zone',
    channel: 'payload',
    treatment: 'unavailable',
    condition: 'when_all_day',
    reason: '종일 일정에는 시간대 값이 없으며 값을 발명하지 않습니다.',
  },
  {
    field: 'repeat_rule',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'when_present',
    reason: '반복 규칙은 손실 없는 사용자 언어 또는 전용 열로 변환합니다.',
  },
  {
    field: 'item_order',
    channel: 'payload',
    treatment: 'preserved',
    condition: 'always',
    reason: 'effective snapshot의 항목 순서를 그대로 유지합니다.',
  },
  {
    field: 'item_inclusion',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'always',
    reason: '포함된 항목만 결과에 넣고 제외 ID와 이유는 manifest에 남깁니다.',
  },
  {
    field: 'completion_criterion',
    channel: 'payload',
    treatment: 'preserved',
    condition: 'when_present',
    reason: '실행 완료 상태와 합치지 않고 완료 기준 라벨과 원문을 보존합니다.',
  },
  {
    field: 'personal_memo',
    channel: 'payload',
    treatment: 'preserved',
    condition: 'when_present',
    reason: '개인 메모를 별도 라벨 또는 열로 보존합니다.',
  },
  {
    field: 'execution_memo',
    channel: 'payload',
    treatment: 'preserved',
    condition: 'when_present',
    reason: '실행 메모를 개인 메모 및 완료 기준과 분리해 보존합니다.',
  },
  {
    field: 'completion_state',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'always',
    reason: '실행 완료 상태를 체크박스나 명시적 상태 값으로 변환합니다.',
  },
  {
    field: 'warning',
    channel: 'payload',
    treatment: 'preserved',
    condition: 'when_present',
    reason: '행동에 필요한 주의는 닫힌 도움말 뒤로 숨기지 않고 결과에 남깁니다.',
  },
  {
    field: 'resource_links',
    channel: 'payload',
    treatment: 'preserved',
    condition: 'when_present',
    reason: '리소스 라벨과 URL을 함께 보존합니다.',
  },
  {
    field: 'source_url',
    channel: 'payload',
    treatment: 'preserved',
    condition: 'when_present',
    reason: '직접 원문 URL을 결과에 남깁니다.',
  },
];

const CALENDAR_RULES: EffectiveFlowFieldLossRule[] = [
  {
    field: 'item_title',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'always',
    reason: '개인화된 계획 제목과 항목 제목을 VEVENT SUMMARY로 조합합니다.',
  },
  {
    field: 'item_description',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'when_present',
    reason: '설명을 RFC 5545 DESCRIPTION 텍스트로 escape하고 fold합니다.',
  },
  {
    field: 'schedule_date',
    channel: 'payload',
    treatment: 'preserved',
    condition: 'when_present',
    reason: '유효한 날짜만 DTSTART/DTEND에 사용합니다.',
  },
  {
    field: 'schedule_date',
    channel: 'payload',
    treatment: 'held',
    condition: 'when_missing',
    reason: '날짜 없는 항목은 가짜 VEVENT를 만들지 않고 날짜 지정 전까지 보류합니다.',
  },
  {
    field: 'time_zone',
    channel: 'payload',
    treatment: 'preserved',
    condition: 'when_timed',
    reason: '시간이 있는 일정은 검증된 IANA TZID를 DTSTART/DTEND에 보존합니다.',
  },
  {
    field: 'time_zone',
    channel: 'payload',
    treatment: 'unavailable',
    condition: 'when_all_day',
    reason: '종일 날짜 projection에는 시간대 값을 발명하지 않습니다.',
  },
  {
    field: 'repeat_rule',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'when_present',
    reason: '검증된 반복 규칙을 RRULE과 안정적인 series identity로 변환합니다.',
  },
  {
    field: 'item_order',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'always',
    reason: '파일 생성 순서는 유지하지만 외부 캘린더의 표시 순서는 보장하지 않습니다.',
  },
  {
    field: 'item_inclusion',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'always',
    reason: 'eligible Item만 VEVENT로 만들고 제외·보류 ID는 manifest에 남깁니다.',
  },
  {
    field: 'completion_criterion',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'when_present',
    reason: '완료 기준을 DESCRIPTION의 독립 라벨로 직렬화합니다.',
  },
  {
    field: 'personal_memo',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'when_present',
    reason: '개인 메모를 DESCRIPTION의 독립 라벨로 직렬화합니다.',
  },
  {
    field: 'execution_memo',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'when_present',
    reason: '실행 메모를 DESCRIPTION의 독립 라벨로 직렬화합니다.',
  },
  {
    field: 'completion_state',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'always',
    reason: '실행 완료 상태를 VEVENT STATUS로 변환합니다.',
  },
  {
    field: 'warning',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'when_present',
    reason: '주의를 DESCRIPTION의 독립 라벨로 직렬화합니다.',
  },
  {
    field: 'resource_links',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'when_present',
    reason: '리소스 라벨과 URL을 DESCRIPTION에 직렬화합니다.',
  },
  {
    field: 'source_url',
    channel: 'payload',
    treatment: 'transformed',
    condition: 'when_present',
    reason: '직접 원문 URL을 URL 또는 DESCRIPTION 필드에 직렬화합니다.',
  },
];

export const EFFECTIVE_FLOW_FORMAT_LOSS_SCHEMA = {
  calendar: [...SHARED_MANIFEST_RULES, ...CALENDAR_RULES],
  checklist: [...SHARED_MANIFEST_RULES, ...SHARED_TEXT_RULES],
  sheet: [...SHARED_MANIFEST_RULES, ...SHARED_TEXT_RULES],
  memo: [...SHARED_MANIFEST_RULES, ...SHARED_TEXT_RULES],
} satisfies Record<EffectiveFlowExportDestination, EffectiveFlowFieldLossRule[]>;

export type EffectiveFlowProjectionScope =
  | { kind: 'flow' }
  | { kind: 'selected'; itemIds: string[] }
  | { kind: 'item'; itemId: string };

export type EffectiveFlowProjectionAvailability =
  | 'available'
  | 'conditional'
  | 'held'
  | 'unavailable';

export type EffectiveFlowProjectionConsumer =
  | 'public_preview'
  | 'saved_detail'
  | 'flow_map_preview'
  | 'flow_map_save'
  | 'export_preview'
  | 'export_artifact'
  | 'export_receipt';

export type EffectiveFlowProjectionManifest = {
  schemaVersion: typeof EFFECTIVE_FLOW_CONTRACT_SCHEMA_VERSION;
  artifactManifestVersion: typeof EFFECTIVE_FLOW_ARTIFACT_MANIFEST_VERSION;
  consumer: EffectiveFlowProjectionConsumer;
  snapshotKind: 'effective_authoring' | 'effective_execution';
  snapshotVersion: string;
  snapshotHash: string;
  identity: {
    flowId: string;
    flowSlug: string;
    sourceVersion: string;
    personalVersion: string;
    executionVersion: string;
  };
  destination: EffectiveFlowExportDestination;
  artifactKind: 'calendar_ics' | 'portable_checklist' | 'tabular_sheet' | 'portable_memo';
  scope: EffectiveFlowProjectionScope;
  availability: EffectiveFlowProjectionAvailability;
  canonicalItemIds: string[];
  requestedItemIds: string[];
  eligibleItemIds: string[];
  heldItemIds: string[];
  unavailableItemIds: string[];
  excludedItemIds: string[];
  counts: {
    canonical: number;
    requested: number;
    eligible: number;
    held: number;
    unavailable: number;
    excluded: number;
    output: number;
  };
  reasonsByItemId: Record<string, string>;
  fieldRules: EffectiveFlowFieldLossRule[];
};

const ARTIFACT_KIND_BY_DESTINATION: EffectiveFlowProjectionManifest['artifactKind'][] = [
  'calendar_ics',
  'portable_checklist',
  'tabular_sheet',
  'portable_memo',
];

const CALENDAR_INCOMPATIBLE_ROLES = new Set([
  'record',
  'resource',
  'reference',
  'warning',
]);

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function fingerprint(value: unknown): string {
  const input = stableSerialize(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeScope(
  result: EffectiveFlowResult,
  scope: EffectiveFlowProjectionScope,
): {
  scope: EffectiveFlowProjectionScope;
  rows: FlowExperienceProjectionRow[];
  requestedItemIds: string[];
} {
  const rowById = new Map(result.rows.map((row) => [row.id, row]));
  if (scope.kind === 'flow') {
    return {
      scope: { kind: 'flow' },
      rows: [...result.rows],
      requestedItemIds: result.rows.map((row) => row.id),
    };
  }
  const requested = scope.kind === 'item'
    ? [scope.itemId]
    : Array.from(new Set(scope.itemIds));
  const requestedSet = new Set(requested);
  const rows = result.rows.filter((row) => requestedSet.has(row.id));
  return {
    scope: scope.kind === 'item'
      ? { kind: 'item', itemId: scope.itemId }
      : { kind: 'selected', itemIds: rows.map((row) => row.id) },
    rows,
    requestedItemIds: rows.map((row) => row.id),
  };
}

function classifyRow(
  row: FlowExperienceProjectionRow,
  destination: EffectiveFlowExportDestination,
): { disposition: 'eligible' | 'held' | 'unavailable'; reason?: string } {
  if (destination === 'calendar') {
    if (CALENDAR_INCOMPATIBLE_ROLES.has(row.role)) {
      return {
        disposition: 'unavailable',
        reason: `${row.role} 역할은 Calendar 결과로 실행 의미를 보존할 수 없습니다.`,
      };
    }
    if (!row.schedule.date) {
      return {
        disposition: 'held',
        reason: '날짜를 정하기 전에는 Calendar 결과를 만들지 않습니다.',
      };
    }
  }
  if (!row.eligibleShapes.includes(destination)) {
    return {
      disposition: 'unavailable',
      reason: `${destination} 형식에서 이 Item 역할을 안전하게 표현할 수 없습니다.`,
    };
  }
  return { disposition: 'eligible' };
}

function buildAvailability(options: {
  reviewHold: boolean;
  eligibleCount: number;
  heldCount: number;
  unavailableCount: number;
}): EffectiveFlowProjectionAvailability {
  if (options.reviewHold) return 'held';
  if (options.eligibleCount > 0) {
    return options.heldCount > 0 || options.unavailableCount > 0
      ? 'conditional'
      : 'available';
  }
  if (options.heldCount > 0) return 'conditional';
  return 'unavailable';
}

export function buildEffectiveFlowProjectionManifest(options: {
  snapshot: EffectiveFlowSnapshot;
  result?: EffectiveFlowResult;
  consumer: EffectiveFlowProjectionConsumer;
  destination: EffectiveFlowExportDestination;
  scope?: EffectiveFlowProjectionScope;
  snapshotKind?: 'effective_authoring' | 'effective_execution';
  executionState?: 'executable' | 'review_hold';
}): EffectiveFlowProjectionManifest {
  const result = options.result ?? options.snapshot.committed;
  const scope = normalizeScope(result, options.scope ?? { kind: 'flow' });
  const reviewHold = options.executionState === 'review_hold';
  const eligibleItemIds: string[] = [];
  const heldItemIds: string[] = [];
  const unavailableItemIds: string[] = [];
  const reasonsByItemId: Record<string, string> = {};
  const calendarFormat = result.exportPlan.formats.calendar;
  const isRoutineCalendar = options.destination === 'calendar'
    && calendarFormat.supported
    && calendarFormat.outputCount === 1
    && calendarFormat.omittedFields.some(
      (omission) => omission.field === 'item_inclusion',
    );

  scope.rows.forEach((row) => {
    if (reviewHold) {
      heldItemIds.push(row.id);
      reasonsByItemId[row.id] = '검토 보류 상태에서는 결과를 생성하지 않습니다.';
      return;
    }
    if (isRoutineCalendar) {
      eligibleItemIds.push(row.id);
      return;
    }
    const classification = classifyRow(row, options.destination);
    if (classification.disposition === 'eligible') eligibleItemIds.push(row.id);
    if (classification.disposition === 'held') heldItemIds.push(row.id);
    if (classification.disposition === 'unavailable') unavailableItemIds.push(row.id);
    if (classification.reason) reasonsByItemId[row.id] = classification.reason;
  });

  const outputCount = reviewHold
    ? 0
    : isRoutineCalendar && eligibleItemIds.length > 0
      ? 1
      : eligibleItemIds.length;
  const canonicalItemIds = result.rows.map((row) => row.id);
  const excludedItemIds = result.excludedRows.map((row) => row.id);
  const snapshotKind = options.snapshotKind ?? 'effective_execution';
  const snapshotVersion = [
    options.snapshot.layers.source.version,
    options.snapshot.layers.personal.version,
    options.snapshot.layers.execution.version,
  ].join('|');
  const snapshotHash = fingerprint({
    schemaVersion: EFFECTIVE_FLOW_CONTRACT_SCHEMA_VERSION,
    snapshotKind,
    snapshotVersion,
    destination: options.destination,
    scope: scope.scope,
    canonicalItemIds,
    requestedItemIds: scope.requestedItemIds,
    eligibleItemIds,
    heldItemIds,
    unavailableItemIds,
    excludedItemIds,
  });
  const destinationIndex = ['calendar', 'checklist', 'sheet', 'memo'].indexOf(options.destination);

  return {
    schemaVersion: EFFECTIVE_FLOW_CONTRACT_SCHEMA_VERSION,
    artifactManifestVersion: EFFECTIVE_FLOW_ARTIFACT_MANIFEST_VERSION,
    consumer: options.consumer,
    snapshotKind,
    snapshotVersion,
    snapshotHash,
    identity: {
      flowId: options.snapshot.identity.flowId,
      flowSlug: options.snapshot.identity.flowSlug,
      sourceVersion: options.snapshot.layers.source.version,
      personalVersion: options.snapshot.layers.personal.version,
      executionVersion: options.snapshot.layers.execution.version,
    },
    destination: options.destination,
    artifactKind: ARTIFACT_KIND_BY_DESTINATION[destinationIndex]!,
    scope: scope.scope,
    availability: buildAvailability({
      reviewHold,
      eligibleCount: eligibleItemIds.length,
      heldCount: heldItemIds.length,
      unavailableCount: unavailableItemIds.length,
    }),
    canonicalItemIds,
    requestedItemIds: scope.requestedItemIds,
    eligibleItemIds,
    heldItemIds,
    unavailableItemIds,
    excludedItemIds,
    counts: {
      canonical: canonicalItemIds.length,
      requested: scope.requestedItemIds.length,
      eligible: eligibleItemIds.length,
      held: heldItemIds.length,
      unavailable: unavailableItemIds.length,
      excluded: excludedItemIds.length,
      output: outputCount,
    },
    reasonsByItemId,
    fieldRules: EFFECTIVE_FLOW_FORMAT_LOSS_SCHEMA[options.destination].map((rule) => ({ ...rule })),
  };
}

export type FlowActionLifecycle =
  | 'public_preview'
  | 'public_draft'
  | 'public_quick_result'
  | 'saved_plan'
  | 'execution'
  | 'saved_transfer'
  | 'artifact_result'
  | 'artifact_history';

export type FlowActionCapability =
  | 'view_result'
  | 'edit_plan'
  | 'edit_item'
  | 'save_plan'
  | 'create_quick_local_result'
  | 'open_today_lens'
  | 'complete_item'
  | 'transfer_saved_result'
  | 'inspect_receipt'
  | 'replay_result';

export type FlowActionScope = 'flow' | 'selected' | 'item' | 'result';

export type FlowActionOwner =
  | 'public_result_surface'
  | 'shared_plan_editor'
  | 'shared_item_editor'
  | 'public_save_action'
  | 'public_quick_confirmation'
  | 'saved_plan_library'
  | 'saved_plan_detail'
  | 'item_detail'
  | 'saved_transfer_confirmation'
  | 'persistent_export_receipt'
  | 'export_history';

export type FlowActionOwnershipRule = {
  lifecycle: FlowActionLifecycle;
  capability: FlowActionCapability;
  scope: FlowActionScope;
  owner: FlowActionOwner;
  persistence: 'none' | 'session' | 'saved_plan' | 'persistent_receipt';
};

export const FLOW_ACTION_OWNERSHIP_MATRIX: FlowActionOwnershipRule[] = [
  { lifecycle: 'public_preview', capability: 'view_result', scope: 'flow', owner: 'public_result_surface', persistence: 'none' },
  { lifecycle: 'public_draft', capability: 'edit_plan', scope: 'flow', owner: 'shared_plan_editor', persistence: 'session' },
  { lifecycle: 'public_draft', capability: 'edit_item', scope: 'item', owner: 'shared_item_editor', persistence: 'session' },
  { lifecycle: 'public_draft', capability: 'save_plan', scope: 'flow', owner: 'public_save_action', persistence: 'saved_plan' },
  { lifecycle: 'public_quick_result', capability: 'create_quick_local_result', scope: 'flow', owner: 'public_quick_confirmation', persistence: 'session' },
  { lifecycle: 'public_quick_result', capability: 'create_quick_local_result', scope: 'selected', owner: 'public_quick_confirmation', persistence: 'session' },
  { lifecycle: 'saved_plan', capability: 'view_result', scope: 'flow', owner: 'saved_plan_detail', persistence: 'saved_plan' },
  { lifecycle: 'saved_plan', capability: 'edit_plan', scope: 'flow', owner: 'shared_plan_editor', persistence: 'saved_plan' },
  { lifecycle: 'saved_plan', capability: 'edit_item', scope: 'item', owner: 'shared_item_editor', persistence: 'saved_plan' },
  { lifecycle: 'saved_plan', capability: 'open_today_lens', scope: 'flow', owner: 'saved_plan_library', persistence: 'none' },
  { lifecycle: 'execution', capability: 'complete_item', scope: 'item', owner: 'item_detail', persistence: 'saved_plan' },
  { lifecycle: 'saved_transfer', capability: 'transfer_saved_result', scope: 'flow', owner: 'saved_transfer_confirmation', persistence: 'persistent_receipt' },
  { lifecycle: 'saved_transfer', capability: 'transfer_saved_result', scope: 'selected', owner: 'saved_transfer_confirmation', persistence: 'persistent_receipt' },
  { lifecycle: 'saved_transfer', capability: 'transfer_saved_result', scope: 'item', owner: 'saved_transfer_confirmation', persistence: 'persistent_receipt' },
  { lifecycle: 'artifact_result', capability: 'inspect_receipt', scope: 'result', owner: 'persistent_export_receipt', persistence: 'persistent_receipt' },
  { lifecycle: 'artifact_history', capability: 'replay_result', scope: 'result', owner: 'export_history', persistence: 'persistent_receipt' },
];

export function assertSingleFlowActionOwner(
  matrix: readonly FlowActionOwnershipRule[] = FLOW_ACTION_OWNERSHIP_MATRIX,
): void {
  const seen = new Map<string, FlowActionOwner>();
  matrix.forEach((rule) => {
    const key = `${rule.lifecycle}:${rule.capability}:${rule.scope}`;
    const existing = seen.get(key);
    if (existing) {
      throw new Error(`Duplicate primary action owner for ${key}: ${existing}, ${rule.owner}`);
    }
    seen.set(key, rule.owner);
  });
}

export type LegacyFlowCompatibilityState =
  | 'supported'
  | 'legacy_unversioned'
  | 'held_missing_base'
  | 'held_unsupported_schema'
  | 'held_malformed';

export type LegacyFlowCompatibilityInspection = {
  storageKey: string;
  state: LegacyFlowCompatibilityState;
  raw: string;
  rawPreserved: true;
  baseId: string;
  itemIds: string[];
  schemaVersion?: number;
  reason: string;
};

function collectLegacyItemIds(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const source = value as Record<string, unknown>;
  const ids = new Set<string>();
  const collect = (candidate: unknown) => {
    if (!Array.isArray(candidate)) return;
    candidate.forEach((entry) => {
      if (typeof entry === 'string' && entry.trim()) ids.add(entry.trim());
    });
  };
  collect(source.itemIds);
  collect(source.flowSlugs);
  const personalCopy = source.personalCopy;
  if (personalCopy && typeof personalCopy === 'object') {
    const copy = personalCopy as Record<string, unknown>;
    ['includedStepIdsByFlow', 'excludedStepIdsByFlow'].forEach((field) => {
      const record = copy[field];
      if (!record || typeof record !== 'object') return;
      Object.values(record as Record<string, unknown>).forEach(collect);
    });
  }
  return [...ids].sort();
}

/**
 * Read-only compatibility inspection for foundation gates. It never normalizes,
 * migrates, or writes the supplied raw storage value.
 */
export function inspectLegacyFlowCompatibility(options: {
  storageKey: string;
  raw: string;
  baseId: string;
  baseExists: boolean;
  supportedSchemaVersions?: readonly number[];
}): LegacyFlowCompatibilityInspection {
  const supportedSchemaVersions = options.supportedSchemaVersions ?? [1];
  let parsed: unknown;
  try {
    parsed = JSON.parse(options.raw);
  } catch {
    return {
      storageKey: options.storageKey,
      state: 'held_malformed',
      raw: options.raw,
      rawPreserved: true,
      baseId: options.baseId,
      itemIds: [],
      reason: '저장 JSON을 읽을 수 없어 원문 bytes를 유지한 채 복구 검토가 필요합니다.',
    };
  }
  if (!parsed || typeof parsed !== 'object') {
    return {
      storageKey: options.storageKey,
      state: 'held_malformed',
      raw: options.raw,
      rawPreserved: true,
      baseId: options.baseId,
      itemIds: [],
      reason: '저장값이 지원하는 record 형태가 아니므로 자동 보정하지 않습니다.',
    };
  }
  const record = parsed as Record<string, unknown>;
  const schemaVersion = typeof record.schemaVersion === 'number'
    && Number.isSafeInteger(record.schemaVersion)
    ? record.schemaVersion
    : undefined;
  const itemIds = collectLegacyItemIds(record);
  if (schemaVersion !== undefined && !supportedSchemaVersions.includes(schemaVersion)) {
    return {
      storageKey: options.storageKey,
      state: 'held_unsupported_schema',
      raw: options.raw,
      rawPreserved: true,
      baseId: options.baseId,
      itemIds,
      schemaVersion,
      reason: `지원하지 않는 schemaVersion ${schemaVersion}이므로 자동 rewrite하지 않습니다.`,
    };
  }
  if (!options.baseExists) {
    return {
      storageKey: options.storageKey,
      state: 'held_missing_base',
      raw: options.raw,
      rawPreserved: true,
      baseId: options.baseId,
      itemIds,
      ...(schemaVersion !== undefined ? { schemaVersion } : {}),
      reason: '참조하는 source/base를 찾지 못해 결과 생성을 보류하고 원래 저장값을 유지합니다.',
    };
  }
  if (schemaVersion === undefined) {
    return {
      storageKey: options.storageKey,
      state: 'legacy_unversioned',
      raw: options.raw,
      rawPreserved: true,
      baseId: options.baseId,
      itemIds,
      reason: 'schemaVersion이 없는 legacy record이며 읽기만 허용하고 자동 rewrite하지 않습니다.',
    };
  }
  return {
    storageKey: options.storageKey,
    state: 'supported',
    raw: options.raw,
    rawPreserved: true,
    baseId: options.baseId,
    itemIds,
    schemaVersion,
    reason: `지원하는 schemaVersion ${schemaVersion} record입니다.`,
  };
}
