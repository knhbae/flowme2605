/**
 * FlowMe canonical content contract v1.
 *
 * This file is a tool-agnostic reference contract for backend, storage, adapters,
 * fixtures, and export projections. It is not wired into the current runtime yet.
 */

export const CANONICAL_FLOW_SCHEMA_VERSION = 'flowme-canonical-flow-v1' as const;

export type CanonicalFlowSchemaVersion = typeof CANONICAL_FLOW_SCHEMA_VERSION;

export type LifeArea =
  | 'home_living'
  | 'family_parenting'
  | 'study_reading'
  | 'money_admin_purchase'
  | 'health_fitness'
  | 'travel_outings'
  | 'meals_grocery'
  | 'work_career'
  | 'hobby_pet';

export type PlanningPattern =
  | 'date_preparation'
  | 'ordered_procedure'
  | 'repeating_routine'
  | 'source_table_rows'
  | 'resource_queue'
  | 'compare_decide'
  | 'phase_lifecycle';

export type NaturalArtifact = 'calendar' | 'checklist' | 'todo' | 'sheet' | 'memo' | 'hybrid';

export type ContentLifecycleStatus = 'draft' | 'in_review' | 'published' | 'retired';

export type RiskLevel =
  | 'low'
  | 'medium'
  | 'medical_sensitive'
  | 'legal_sensitive'
  | 'financial_sensitive'
  | 'safety_sensitive'
  | 'privacy_sensitive';

export type SourceType = 'official' | 'creator_experience' | 'reference' | 'user_supplied';

export type SourceRightsStatus = 'allowed' | 'needs_review' | 'blocked';

export type SourceDescriptor = {
  sourceId: string;
  title: string;
  sourceType: SourceType;
  originalUrl: string;
  canonicalUrl: string;
  locale?: string;
  publisher?: string;
  checkedAt: string;
  rightsStatus: SourceRightsStatus;
  riskLevel: RiskLevel;
};

export type SourceSnapshot = {
  snapshotId: string;
  sourceId: string;
  fetchedAt: string;
  finalUrl: string;
  contentHash: string;
  extractionVersion: string;
};

export type SourceRowType =
  | 'date'
  | 'offset'
  | 'check'
  | 'table_row'
  | 'procedure'
  | 'resource'
  | 'reference';

export type SourceRow = {
  sourceRowId: string;
  sourceId: string;
  snapshotId: string;
  rowType: SourceRowType;
  title: string;
  detail?: string;
  locator?: string;
  order: number;
};

export type SourceSupportLevel = 'direct' | 'creator_interpretation' | 'user_request' | 'inferred_draft';

export type SourceReference = {
  sourceRefId: string;
  entityType: 'flow' | 'step' | 'item' | 'field' | 'memo';
  entityId: string;
  sourceRowIds: string[];
  relation: 'derived_from' | 'supports' | 'caution' | 'boundary';
  supportLevel: SourceSupportLevel;
  note?: string;
};

export type AnchorKind =
  | 'start_date'
  | 'end_date'
  | 'event_date'
  | 'birth_date'
  | 'age_month'
  | 'none';

export type AnchorDefinition = {
  fieldId: string;
  kind: Exclude<AnchorKind, 'none'>;
  label: string;
  hint?: string;
  required: boolean;
};

export type RecurrenceSpec = {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  weekdays?: Array<0 | 1 | 2 | 3 | 4 | 5 | 6>;
  count?: number;
  until?: string;
  sourceDefined: boolean;
};

export type AbsoluteSchedule = {
  mode: 'absolute';
  start: string;
  end?: string;
  allDay: boolean;
  timezone?: string;
  recurrence?: RecurrenceSpec;
};

export type AnchorOffsetSchedule = {
  mode: 'anchor_offset';
  anchorFieldId: string;
  dayOffset: number;
  time?: string;
  durationMinutes?: number;
  allDay: boolean;
  timezone?: string;
  recurrence?: RecurrenceSpec;
};

export type AbsoluteDateWindowSchedule = {
  mode: 'date_window';
  basis: 'absolute';
  startDate: string;
  endDate: string;
  reminderDate?: string;
};

export type AnchorDateWindowSchedule = {
  mode: 'date_window';
  basis: 'anchor_offset';
  anchorFieldId: string;
  startDayOffset: number;
  endDayOffset: number;
  reminderDayOffset: number;
};

export type ScheduleSpec =
  | AbsoluteSchedule
  | AnchorOffsetSchedule
  | AbsoluteDateWindowSchedule
  | AnchorDateWindowSchedule;

export type DecisionOption = {
  value: string;
  label: string;
  terminal?: boolean;
};

export type CheckCompletion = {
  mode: 'check';
  doneWhen: string;
};

export type DecisionCompletion = {
  mode: 'decision';
  options: DecisionOption[];
  doneWhen?: string;
};

export type RecordCompletion = {
  mode: 'record';
  recordFieldIds: string[];
  doneWhen: string;
};

export type CompletionSpec = CheckCompletion | DecisionCompletion | RecordCompletion;

export type FieldValueType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'url'
  | 'single_select'
  | 'multi_select'
  | 'file_ref';

export type FieldPurpose = 'schedule' | 'sort' | 'filter' | 'record' | 'export' | 'generation';

export type FieldDefinition = {
  fieldId: string;
  owner: { type: 'flow' | 'item'; id: string };
  key: string;
  label: string;
  valueType: FieldValueType;
  purposes: FieldPurpose[];
  valueSource: 'user' | 'source' | 'derived';
  required: boolean;
  options?: Array<{ value: string; label: string }>;
  sourceDefault?: string | number | boolean | string[];
  sourceRefIds?: string[];
  sensitive?: boolean;
};

export type MemoKind =
  | 'instruction'
  | 'source_detail'
  | 'creator_experience'
  | 'caution'
  | 'hold_template'
  | 'user_prompt';

export type MemoBlock = {
  memoId: string;
  scope: { type: 'flow' | 'step' | 'item'; id: string };
  kind: MemoKind;
  title?: string;
  text: string;
  sourceRefIds?: string[];
};

export type ItemIntent = 'act' | 'inspect' | 'decide' | 'record' | 'use_resource';

export type CanonicalFlowItem = {
  itemId: string;
  stepId: string;
  title: string;
  description?: string;
  intent: ItemIntent;
  order: number;
  completion: CompletionSpec;
  schedule?: ScheduleSpec;
  fieldIds: string[];
  memoIds: string[];
  cautionMemoIds: string[];
  sourceRefIds: string[];
};

export type CanonicalFlowStep = {
  stepId: string;
  flowId: string;
  title: string;
  description?: string;
  order: number;
  itemIds: string[];
  sourceRefIds: string[];
  /** Display/grouping context only. Item.schedule remains authoritative. */
  groupingHint?: string;
};

export type ProjectionTarget = 'calendar' | 'checklist' | 'todo' | 'sheet' | 'memo';

export type ProjectionFormat = 'ics' | 'plain_text' | 'markdown' | 'csv' | 'tsv' | 'xlsx';

export type ProjectionProfile = {
  target: ProjectionTarget;
  formats: ProjectionFormat[];
  granularity: 'item' | 'step_bundle' | 'flow';
  groupBy?: 'step' | 'flow' | 'none';
  includeSource: boolean;
  includeCautions: boolean;
  includeUserMemo: boolean;
};

export type CanonicalFlow = {
  flowId: string;
  bundleId: string;
  title: string;
  summary?: string;
  userNeed: string;
  primarySourceId: string;
  supportingSourceIds: string[];
  planningPattern: PlanningPattern;
  secondaryPatterns: PlanningPattern[];
  primaryArtifact: NaturalArtifact;
  anchorDefinition?: AnchorDefinition;
  setupFieldIds: string[];
  stepIds: string[];
  projectionProfiles: ProjectionProfile[];
  riskLevel: RiskLevel;
};

export type CanonicalFlowBundle = {
  bundleId: string;
  title: string;
  summary?: string;
  lifeArea: LifeArea;
  topicTags: string[];
  flowIds: string[];
};

export type CanonicalFlowContent = {
  schemaVersion: CanonicalFlowSchemaVersion;
  contentId: string;
  version: string;
  contentHash: string;
  lifecycleStatus: ContentLifecycleStatus;
  createdAt: string;
  updatedAt: string;
  bundle: CanonicalFlowBundle;
  flows: CanonicalFlow[];
  steps: CanonicalFlowStep[];
  items: CanonicalFlowItem[];
  fields: FieldDefinition[];
  memos: MemoBlock[];
  sources: SourceDescriptor[];
  sourceSnapshots: SourceSnapshot[];
  sourceRows: SourceRow[];
  sourceRefs: SourceReference[];
};

export type QualityDimension =
  | 'userNeedFit'
  | 'executionClarity'
  | 'contentFidelity'
  | 'portability'
  | 'cognitiveLoad'
  | 'copySpecificity'
  | 'sourceSafety'
  | 'accessibilityOperability';

export type QualityScore = {
  score: 1 | 2 | 3 | 4 | 5;
  comment: string;
};

export type ConversionReadiness =
  | 'ready_for_internal_canary'
  | 'ready_second_wave'
  | 'source_import_required'
  | 'hold';

export type CanonicalFlowReviewRecord = {
  reviewId: string;
  contentId: string;
  contentVersion: string;
  readiness: ConversionReadiness;
  qualityScores: Record<QualityDimension, QualityScore>;
  omittedRows: Array<{ sourceRowId: string; reason: string }>;
  hardFails: string[];
  rightsDecision: string;
  riskDecision: string;
  reviewedAt: string;
};

export type UserItemOverlay = {
  itemId: string;
  included?: boolean;
  title?: string;
  scheduleOverride?: ScheduleSpec | null;
  memo?: string;
};

export type UserFlowCopy = {
  copyId: string;
  userId: string;
  contentId: string;
  pinnedContentVersion: string;
  title?: string;
  setupValues: Record<string, string | number | boolean | string[]>;
  itemOverlays: UserItemOverlay[];
  createdAt: string;
  updatedAt: string;
};

export type UserItemExecutionState = {
  itemId: string;
  occurrenceKey?: string;
  state: 'pending' | 'done' | 'skipped' | 'held';
  /** A single occurrence override; it never rewrites Item.schedule or the copy overlay. */
  scheduleOverride?: ScheduleSpec | null;
  fieldValues: Record<string, string | number | boolean | string[]>;
  decisionValue?: string;
  userMemo?: string;
  updatedAt: string;
};

export type ExecutionRun = {
  runId: string;
  copyId: string;
  contentVersion: string;
  status: 'active' | 'completed' | 'archived';
  startedAt: string;
  completedAt?: string;
  itemStates: UserItemExecutionState[];
};

export type VersionResolution = {
  copyId: string;
  fromVersion: string;
  toVersion: string;
  decisions: Array<{
    itemId: string;
    action: 'use_latest' | 'keep_personal' | 'retain_removed' | 'exclude';
  }>;
  resolvedAt: string;
};
