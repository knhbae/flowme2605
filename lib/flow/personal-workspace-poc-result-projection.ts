import {
  getPersonalWorkspacePocFlowFieldOwnership,
  getPersonalWorkspacePocFlowItemFieldOwnership,
  PERSONAL_WORKSPACE_POC_VERSION,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocFlowItem,
  type PersonalWorkspacePocAuthoredFlow,
  type PersonalWorkspacePocAuthoringParsedItemSnapshot,
  type PersonalWorkspacePocOrigin,
  type PersonalWorkspacePocPersonalPlanItemOverlay,
  type PersonalWorkspacePocReadModel,
  type PersonalWorkspacePocState,
} from './personal-workspace-poc-contract';
import { fingerprintPersonalWorkspacePocAuthoringSource } from './personal-workspace-poc-authoring';
import { expandPersonalWorkspacePocOccurrences } from './personal-workspace-poc-occurrence';
import {
  applyPersonalWorkspacePocTimelineOrder,
  isPersonalWorkspacePocCompleted,
  isPersonalWorkspacePocDate,
} from './personal-workspace-poc-state';

export const PERSONAL_WORKSPACE_POC_RESULT_PROJECTION_VERSION = 3 as const;

/**
 * Local result files are an additive PoC contract. Keeping this version
 * separate avoids changing the saved read-model/store contract when only the
 * deterministic presentation payload changes.
 */
export const PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT_VERSION = 2 as const;

export const PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT = Object.freeze({
  version: PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT_VERSION,
  filenamePattern: 'flow-{title}-{savedCopyId}.{extension}',
  txt: Object.freeze({
    mediaType: 'text/plain;charset=utf-8' as const,
    encoding: 'utf-8' as const,
    bom: false as const,
    lineEndings: 'lf' as const,
    finalNewline: 'single' as const,
  }),
  csv: Object.freeze({
    mediaType: 'text/csv;charset=utf-8' as const,
    encoding: 'utf-8' as const,
    bom: true as const,
    lineEndings: 'crlf' as const,
    finalNewline: 'single' as const,
    delimiter: ',' as const,
    escaping: 'rfc4180-double-quote-all-fields' as const,
    nullValue: '' as const,
  }),
});

/**
 * The four user-facing result slots. TXT is a copy payload owned by Text, not
 * a fifth canonical model.
 */
export const PERSONAL_WORKSPACE_POC_RESULT_SLOT_ORDER = Object.freeze([
  'text',
  'todo',
  'calendar',
  'sheet',
] as const);

export type PersonalWorkspacePocPrimaryResultView =
  (typeof PERSONAL_WORKSPACE_POC_RESULT_SLOT_ORDER)[number];

/** `txt` remains readable while existing P0 presenters move to copy-in-Text. */
export type PersonalWorkspacePocResultView = PersonalWorkspacePocPrimaryResultView | 'txt';

export type PersonalWorkspacePocResultNavigationState = Readonly<{
  selectedFlowRef?: string;
  resultView: PersonalWorkspacePocResultView;
  baseDate?: string;
  selectedDate?: string;
  openItemRef?: string | null;
  focusReturn?: Readonly<{
    kind: 'flow-result-heading';
    flowRef: string;
  }>;
}>;

export type PersonalWorkspacePocResultNavigationTransition =
  | Readonly<{
    ok: true;
    changed: true;
    state: PersonalWorkspacePocResultNavigationState & Readonly<{
      selectedFlowRef: string;
      baseDate: string;
      selectedDate: string;
    }>;
  }>
  | Readonly<{
    ok: true;
    changed: false;
    reason: 'same-flow';
    state: PersonalWorkspacePocResultNavigationState;
  }>
  | Readonly<{
    ok: false;
    changed: false;
    reason: 'invalid-local-today' | 'invalid-flow-anchor';
    state: PersonalWorkspacePocResultNavigationState;
  }>;

export type PersonalWorkspacePocResultDateOwner =
  | 'execution-placement'
  | 'poc-personal-plan'
  | 'imported-personal'
  | 'source'
  | 'none';

export type PersonalWorkspacePocResultSourceAttributes = Readonly<{
  description?: string;
  relativeDate?: string;
  date?: string;
  resolvedDate?: string;
  time?: string;
  timeZone?: string;
  place?: string;
  resourceUrl?: string;
  recurrence?: string;
  recurrenceEnd?: string;
  completionCriteria?: string;
  durationMinutes?: number;
  executionCondition?: string;
  resourceLabel?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  guide?: string;
  caution?: string;
  subchecks?: readonly Readonly<{
    subcheckId: string;
    title: string;
    sourceChecked: boolean;
  }>[];
  additionalDescriptions?: readonly string[];
  sourceChecked?: boolean;
}>;

export type PersonalWorkspacePocResultItem = Readonly<{
  ref: string;
  /** Immutable canonical Item identity; `ref` is a result row/occurrence identity. */
  sourceItemRef?: string;
  occurrenceId?: string;
  occurrenceIndex?: number;
  originalOccurrenceDate?: string;
  flowRef: string;
  /** Present on projections built by v2; optional only for P0 presenter fixtures. */
  savedCopyId?: string;
  flowId?: string;
  itemId?: string;
  title: string;
  memo?: string;
  sectionTitle?: string;
  sourceOrder?: number;
  sourceLine?: number;
  sourceAttributes?: PersonalWorkspacePocResultSourceAttributes;
  planOrder: number;
  contextOrder: number;
  contextKey: string;
  manualContextOrder: boolean;
  planDate?: string;
  planDateOwner: Exclude<PersonalWorkspacePocResultDateOwner, 'execution-placement'>;
  effectiveDate?: string;
  effectiveDateOwner: PersonalWorkspacePocResultDateOwner;
  executionScheduleMode: 'inherit' | 'fixed_date' | 'unscheduled';
  time?: string;
  timelinePolicy: 'auto' | 'included' | 'excluded';
  completed: boolean;
  completedAt?: string;
}>;

export type PersonalWorkspacePocResultTextLine = Readonly<{
  kind: 'flow-title' | 'separator' | 'section' | 'item' | 'plan-date' | 'execution-date' | 'property' | 'memo' | 'source-note';
  text: string;
  itemRef?: string;
}>;

export type PersonalWorkspacePocResultTextProjection = Readonly<{
  itemRefs: readonly string[];
  lines: readonly PersonalWorkspacePocResultTextLine[];
}>;

export type PersonalWorkspacePocResultTodoSection = Readonly<{
  key: string;
  title: string;
  itemRefs: readonly string[];
  items: readonly PersonalWorkspacePocResultItem[];
}>;

export type PersonalWorkspacePocResultTodoGroup = Readonly<{
  key: `date:${string}` | 'undated';
  date?: string;
  label: string;
  itemRefs: readonly string[];
  items: readonly PersonalWorkspacePocResultItem[];
  sections: readonly PersonalWorkspacePocResultTodoSection[];
}>;

export type PersonalWorkspacePocResultTodoProjection = Readonly<{
  itemRefs: readonly string[];
  groups: readonly PersonalWorkspacePocResultTodoGroup[];
  rowCount: number;
}>;

export type PersonalWorkspacePocResultCalendarCell = Readonly<{
  key: string;
  date?: string;
  day?: number;
  inMonth: boolean;
  selected: boolean;
  itemRefs: readonly string[];
  completedCount: number;
}>;

export type PersonalWorkspacePocResultCalendarProjection = Readonly<{
  itemRefs: readonly string[];
  month: string;
  baseDate: string;
  selectedDate: string;
  cells: readonly PersonalWorkspacePocResultCalendarCell[];
  selectedItemRefs: readonly string[];
  selectedItems: readonly PersonalWorkspacePocResultItem[];
  undatedItemRefs: readonly string[];
  /** Additive fields are optional only for legacy presenter fixtures. */
  datePolicy?: 'effective-date-execution-first';
  weekStartsOn?: 'sunday';
  weekCount?: number;
  monthItemRefs?: readonly string[];
  undatedItems?: readonly PersonalWorkspacePocResultItem[];
}>;

export type PersonalWorkspacePocResultSheetColumnKey =
  | 'status'
  | 'sectionTitle'
  | 'title'
  | 'memo'
  | 'planDate'
  | 'effectiveDate'
  | 'time'
  | 'relativeDate'
  | 'sourceDate'
  | 'timeZone'
  | 'place'
  | 'resourceUrl'
  | 'recurrence'
  | 'recurrenceEnd'
  | 'completionCriteria'
  | 'completedAt'
  | 'planOrder'
  | 'sourceLine'
  | 'occurrenceIndex'
  | 'originalOccurrenceDate'
  | 'occurrenceId'
  | 'sourceItemRef'
  | 'itemRef';

export type PersonalWorkspacePocResultSheetCellValue = string | number | null;

export type PersonalWorkspacePocResultSheetColumn = Readonly<{
  key: PersonalWorkspacePocResultSheetColumnKey;
  label: string;
  kind: 'text' | 'number' | 'date' | 'time' | 'url' | 'identity';
  technical?: true;
}>;

export const PERSONAL_WORKSPACE_POC_RESULT_SHEET_COLUMNS = Object.freeze([
  { key: 'status', label: '상태', kind: 'text' },
  { key: 'sectionTitle', label: '단계', kind: 'text' },
  { key: 'title', label: '할 일', kind: 'text' },
  { key: 'memo', label: '메모', kind: 'text' },
  { key: 'planDate', label: '계획 날짜', kind: 'date' },
  { key: 'effectiveDate', label: '실행 날짜', kind: 'date' },
  { key: 'time', label: '실행 시간', kind: 'time' },
  { key: 'relativeDate', label: '원문 상대 날짜', kind: 'text' },
  { key: 'sourceDate', label: '원문 날짜', kind: 'date' },
  { key: 'timeZone', label: '시간대', kind: 'text' },
  { key: 'place', label: '장소', kind: 'text' },
  { key: 'resourceUrl', label: '자료', kind: 'url' },
  { key: 'recurrence', label: '반복', kind: 'text' },
  { key: 'recurrenceEnd', label: '반복 종료', kind: 'date' },
  { key: 'completionCriteria', label: '완료 기준', kind: 'text' },
  { key: 'completedAt', label: '완료 시각', kind: 'text' },
  { key: 'planOrder', label: '계획 순서', kind: 'number', technical: true },
  { key: 'sourceLine', label: '원문 줄', kind: 'number', technical: true },
  { key: 'occurrenceIndex', label: '회차', kind: 'number' },
  { key: 'originalOccurrenceDate', label: '원 발생일', kind: 'date', technical: true },
  { key: 'occurrenceId', label: 'Occurrence id', kind: 'identity', technical: true },
  { key: 'sourceItemRef', label: 'Source Item ref', kind: 'identity', technical: true },
  { key: 'itemRef', label: 'Item ref', kind: 'identity', technical: true },
] as const satisfies readonly PersonalWorkspacePocResultSheetColumn[]);

export type PersonalWorkspacePocResultSheetRow = Readonly<{
  rowId: string;
  itemRef: string;
  values: Readonly<Record<
    PersonalWorkspacePocResultSheetColumnKey,
    PersonalWorkspacePocResultSheetCellValue
  >>;
  /** Complete effective Item data; display cells never become a second model. */
  item: PersonalWorkspacePocResultItem;
}>;

export type PersonalWorkspacePocResultSheetProjection = Readonly<{
  itemRefs: readonly string[];
  /** Unique canonical source Items, distinct from the row manifest. */
  sourceItemRefs?: readonly string[];
  occurrenceIds?: readonly string[];
  columns: readonly PersonalWorkspacePocResultSheetColumn[];
  rows: readonly PersonalWorkspacePocResultSheetRow[];
  rowCount: number;
  sourcePreserved: true;
}>;

export type PersonalWorkspacePocResultTxtProjection = Readonly<{
  itemRefs: readonly string[];
  mediaType: 'text/plain;charset=utf-8';
  normalizedText: string;
  /** Additive v2 copy contract; actual v2 builder results always provide it. */
  mode?: 'copy-only';
  copyText?: string;
  lineItemRefs?: readonly (string | null)[];
  sourceRawTextIncluded?: false;
  downloadSupported?: boolean;
  normalization?: Readonly<{
    lineEndings: 'lf';
    finalNewline: 'single';
    trailingHorizontalWhitespace: 'removed';
  }>;
}>;

export type PersonalWorkspacePocResultDownloadFile = Readonly<{
  filename: string;
  mediaType: 'text/plain;charset=utf-8' | 'text/csv;charset=utf-8';
  encoding: 'utf-8';
  bom: boolean;
  lineEndings: 'lf' | 'crlf';
  finalNewline: 'single';
  payload: string;
}>;

export type PersonalWorkspacePocResultDownloads = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT_VERSION;
  itemRefs: readonly string[];
  txt: PersonalWorkspacePocResultDownloadFile & Readonly<{
    mediaType: 'text/plain;charset=utf-8';
    bom: false;
    lineEndings: 'lf';
  }>;
  csv: PersonalWorkspacePocResultDownloadFile & Readonly<{
    mediaType: 'text/csv;charset=utf-8';
    bom: true;
    lineEndings: 'crlf';
    columns: readonly PersonalWorkspacePocResultSheetColumnKey[];
    delimiter: ',';
    escaping: 'rfc4180-double-quote-all-fields';
  }>;
  sourceRawTextIncluded: false;
  sourceMutationCount: 0;
}>;

export type PersonalWorkspacePocResultSourceContract = Readonly<{
  origin: PersonalWorkspacePocOrigin;
  flowRef: string;
  savedCopyId: string;
  flowId: string;
  sourceSlug: string;
  owner: 'saved-plan-read-model' | 'authoring-working-source';
  sourcePreserved: true;
  sourceMutationCount: 0;
  authoring?: Readonly<{
    handoffId: string;
    documentId: string;
    revisionId: string;
    parseResultId: string;
    sourceSnapshotId: string;
    sourceFingerprint: string;
    /** Exact original JS string, including CRLF, tabs, and trailing newline. */
    rawText: string;
    itemMapping: 'complete' | 'legacy-unavailable';
  }>;
}>;

export type PersonalWorkspacePocResultProjection = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_RESULT_PROJECTION_VERSION;
  /** Additive v2 fields are optional only for legacy presenter fixtures. */
  slotOrder?: typeof PERSONAL_WORKSPACE_POC_RESULT_SLOT_ORDER;
  flowRef: string;
  title: string;
  baseDate: string;
  selectedDate: string;
  itemRefs: readonly string[];
  /** Canonical source identities and derived recurring row identities. */
  sourceItemRefs?: readonly string[];
  occurrenceIds?: readonly string[];
  items: readonly PersonalWorkspacePocResultItem[];
  text: PersonalWorkspacePocResultTextProjection;
  todo: PersonalWorkspacePocResultTodoProjection;
  calendar: PersonalWorkspacePocResultCalendarProjection;
  sheet?: PersonalWorkspacePocResultSheetProjection;
  txt: PersonalWorkspacePocResultTxtProjection;
  /** Present on builder results; optional only for legacy presenter fixtures. */
  downloads?: PersonalWorkspacePocResultDownloads;
  source?: PersonalWorkspacePocResultSourceContract;
}>;

export type PersonalWorkspacePocResultProjectionV3 = Omit<
  PersonalWorkspacePocResultProjection,
  'slotOrder' | 'calendar' | 'sheet' | 'txt' | 'downloads' | 'source'
> & Readonly<{
  slotOrder: typeof PERSONAL_WORKSPACE_POC_RESULT_SLOT_ORDER;
  calendar: PersonalWorkspacePocResultCalendarProjection & Readonly<{
    datePolicy: 'effective-date-execution-first';
    weekStartsOn: 'sunday';
    weekCount: number;
    monthItemRefs: readonly string[];
    undatedItems: readonly PersonalWorkspacePocResultItem[];
  }>;
  sheet: PersonalWorkspacePocResultSheetProjection;
  txt: PersonalWorkspacePocResultTxtProjection & Readonly<{
    mode: 'copy-only';
    copyText: string;
    lineItemRefs: readonly (string | null)[];
    sourceRawTextIncluded: false;
    downloadSupported: true;
    normalization: Readonly<{
      lineEndings: 'lf';
      finalNewline: 'single';
      trailingHorizontalWhitespace: 'removed';
    }>;
  }>;
  downloads: PersonalWorkspacePocResultDownloads;
  source: PersonalWorkspacePocResultSourceContract;
}>;

/** Kept as a source-compatible alias for existing P2-A callers and fixtures. */
export type PersonalWorkspacePocResultProjectionV2 = PersonalWorkspacePocResultProjectionV3;

export type PersonalWorkspacePocResultProjectionFailureReason =
  | 'invalid-model-version'
  | 'invalid-model-shape'
  | 'invalid-state-version'
  | 'invalid-state-shape'
  | 'invalid-local-today'
  | 'flow-not-found'
  | 'unsupported-origin'
  | 'malformed-flow-identity'
  | 'duplicate-item-identity'
  | 'malformed-item-identity'
  | 'invalid-authoring-lineage'
  | 'unsupported-item-schedule'
  | 'invalid-personal-plan-overlay'
  | 'invalid-item-date'
  | 'invalid-recurrence'
  | 'invalid-occurrence-state'
  | 'invalid-base-date'
  | 'invalid-selected-date';

export type PersonalWorkspacePocResultProjectionResult =
  | Readonly<{ ok: true; projection: PersonalWorkspacePocResultProjectionV2 }>
  | Readonly<{ ok: false; reason: PersonalWorkspacePocResultProjectionFailureReason }>;

type DateResolution = Readonly<{
  date?: string;
  owner: PersonalWorkspacePocResultDateOwner;
}>;

type PreorderedItem = Omit<
  PersonalWorkspacePocResultItem,
  'contextOrder' | 'contextKey' | 'manualContextOrder'
>;

type PersonalWorkspacePocAuthoringItemContext = Readonly<{
  sourceLine: number;
  attributes: PersonalWorkspacePocResultSourceAttributes;
}>;

type PersonalWorkspacePocResultSourceResolution =
  | Readonly<{
    ok: true;
    source: PersonalWorkspacePocResultSourceContract;
    itemContextByRef: ReadonlyMap<string, PersonalWorkspacePocAuthoringItemContext>;
  }>
  | Readonly<{ ok: false; reason: 'invalid-authoring-lineage' }>;

const PERSONAL_WORKSPACE_POC_RESULT_SUPPORTED_ORIGINS = new Set<PersonalWorkspacePocOrigin>([
  'source-backed-map',
  'personal-draft',
  'canonical-personal-copy',
  'legacy-saved-plan',
  'authoring-handoff',
]);

function failure(
  reason: PersonalWorkspacePocResultProjectionFailureReason,
): PersonalWorkspacePocResultProjectionResult {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isSupportedOrigin(value: unknown): value is PersonalWorkspacePocOrigin {
  return typeof value === 'string'
    && PERSONAL_WORKSPACE_POC_RESULT_SUPPORTED_ORIGINS.has(value as PersonalWorkspacePocOrigin);
}

function hasValidStateShape(state: PersonalWorkspacePocState): boolean {
  return isRecord(state)
    && state.version === PERSONAL_WORKSPACE_POC_VERSION
    && isRecord(state.placements)
    && isRecord(state.completions)
    && (state.occurrencePlacements === undefined || isRecord(state.occurrencePlacements))
    && (state.occurrenceCompletions === undefined || isRecord(state.occurrenceCompletions))
    && Array.isArray(state.timelineOrders)
    && (state.personalPlanOverlays === undefined || isRecord(state.personalPlanOverlays));
}

function hasValidFlowShape(flow: PersonalWorkspacePocFlow): boolean {
  return isRecord(flow)
    && isNonEmptyString(flow.ref)
    && isNonEmptyString(flow.savedCopyId)
    && isNonEmptyString(flow.flowId)
    && isNonEmptyString(flow.sourceSlug)
    && isNonEmptyString(flow.title)
    && isSupportedOrigin(flow.origin)
    && Array.isArray(flow.items);
}

function hasValidItemShape(item: PersonalWorkspacePocFlowItem): boolean {
  return isRecord(item)
    && isNonEmptyString(item.ref)
    && isNonEmptyString(item.savedCopyId)
    && isNonEmptyString(item.flowId)
    && isNonEmptyString(item.itemId)
    && isNonEmptyString(item.title)
    && Number.isSafeInteger(item.sourceOrder)
    && item.sourceOrder >= 0
    && isOptionalString(item.description)
    && (item.sectionTitle === undefined || isNonEmptyString(item.sectionTitle))
    && (item.sourceDate === undefined || isPersonalWorkspacePocDate(item.sourceDate))
    && (item.sourceTimingLabel === undefined || isNonEmptyString(item.sourceTimingLabel));
}

function hasValidPersonalPlanOverlayShape(value: unknown): boolean {
  if (!isRecord(value)
    || !isNonEmptyString(value.flowRef)
    || !isNonEmptyString(value.savedCopyId)
    || !isNonEmptyString(value.flowId)
    || !isRecord(value.items)
    || (value.title !== undefined && !isNonEmptyString(value.title))
    || (value.sectionTitles !== undefined && !isRecord(value.sectionTitles))
    || (value.orderedItemRefs !== undefined
      && (!Array.isArray(value.orderedItemRefs)
        || !value.orderedItemRefs.every(isNonEmptyString)))) return false;
  if (!Object.values(value.sectionTitles ?? {}).every((title) => (
    isNonEmptyString(title) && title === title.trim()
  ))) return false;
  return Object.entries(value.items).every(([itemRef, unknownOverlay]) => {
    if (!isRecord(unknownOverlay)
      || unknownOverlay.itemRef !== itemRef
      || (unknownOverlay.title !== undefined && !isNonEmptyString(unknownOverlay.title))
      || !isOptionalString(unknownOverlay.memo)) return false;
    if (unknownOverlay.schedule === undefined) return true;
    if (!isRecord(unknownOverlay.schedule)) return false;
    return unknownOverlay.schedule.mode === 'unscheduled'
      || (unknownOverlay.schedule.mode === 'fixed_date'
        && isPersonalWorkspacePocDate(unknownOverlay.schedule.date));
  });
}

function sourceAttributesFor(
  parsed: PersonalWorkspacePocAuthoringParsedItemSnapshot,
): PersonalWorkspacePocResultSourceAttributes {
  return {
    ...(parsed.description !== undefined ? { description: parsed.description } : {}),
    ...(parsed.additionalDescriptions !== undefined
      ? { additionalDescriptions: parsed.additionalDescriptions }
      : {}),
    ...(parsed.relativeDate !== undefined ? { relativeDate: parsed.relativeDate } : {}),
    ...(parsed.date !== undefined ? { date: parsed.date } : {}),
    ...(parsed.resolvedDate !== undefined ? { resolvedDate: parsed.resolvedDate } : {}),
    ...(parsed.time !== undefined ? { time: parsed.time } : {}),
    ...(parsed.timeZone !== undefined ? { timeZone: parsed.timeZone } : {}),
    ...(parsed.place !== undefined ? { place: parsed.place } : {}),
    ...(parsed.durationMinutes !== undefined ? { durationMinutes: parsed.durationMinutes } : {}),
    ...(parsed.resourceUrl !== undefined ? { resourceUrl: parsed.resourceUrl } : {}),
    ...(parsed.resourceLabel !== undefined ? { resourceLabel: parsed.resourceLabel } : {}),
    ...(parsed.sourceUrl !== undefined ? { sourceUrl: parsed.sourceUrl } : {}),
    ...(parsed.sourceLabel !== undefined ? { sourceLabel: parsed.sourceLabel } : {}),
    ...(parsed.recurrence !== undefined ? { recurrence: parsed.recurrence } : {}),
    ...(parsed.recurrenceEnd !== undefined ? { recurrenceEnd: parsed.recurrenceEnd } : {}),
    ...(parsed.completionCriteria !== undefined
      ? { completionCriteria: parsed.completionCriteria }
      : {}),
    ...(parsed.executionCondition !== undefined
      ? { executionCondition: parsed.executionCondition }
      : {}),
    ...(parsed.guide !== undefined ? { guide: parsed.guide } : {}),
    ...(parsed.caution !== undefined ? { caution: parsed.caution } : {}),
    ...(parsed.subchecks !== undefined ? { subchecks: parsed.subchecks } : {}),
    ...(parsed.sourceChecked !== undefined ? { sourceChecked: parsed.sourceChecked } : {}),
  };
}

function hasValidParsedItemSnapshot(
  value: unknown,
): value is PersonalWorkspacePocAuthoringParsedItemSnapshot {
  if (!isRecord(value)
    || !Number.isSafeInteger(value.sourceLine)
    || Number(value.sourceLine) < 1
    || !Number.isSafeInteger(value.sourceOrder)
    || Number(value.sourceOrder) < 0
    || !isNonEmptyString(value.title)
    || (value.sectionTitle !== undefined && !isNonEmptyString(value.sectionTitle))) return false;
  const stringsValid = [
    'description',
    'relativeDate',
    'date',
    'resolvedDate',
    'time',
    'timeZone',
    'place',
    'resourceUrl',
    'recurrence',
    'recurrenceEnd',
    'completionCriteria',
    'resourceLabel',
    'sourceUrl',
    'sourceLabel',
    'executionCondition',
    'guide',
    'caution',
  ].every((key) => isOptionalString(value[key]));
  if (!stringsValid
    || (value.sourceChecked !== undefined && typeof value.sourceChecked !== 'boolean')
    || (value.durationMinutes !== undefined
      && (!Number.isSafeInteger(value.durationMinutes) || Number(value.durationMinutes) < 1))
    || (value.additionalDescriptions !== undefined
      && (!Array.isArray(value.additionalDescriptions)
        || !value.additionalDescriptions.every((entry) => typeof entry === 'string')))
    || (value.subchecks !== undefined
      && (!Array.isArray(value.subchecks)
        || !value.subchecks.every((entry) => isRecord(entry)
          && isNonEmptyString(entry.subcheckId)
          && isNonEmptyString(entry.title)
          && typeof entry.sourceChecked === 'boolean')))) return false;
  return true;
}

function resolveResultSource(
  flow: PersonalWorkspacePocFlow,
  sourceItemByRef: ReadonlyMap<string, PersonalWorkspacePocFlowItem>,
): PersonalWorkspacePocResultSourceResolution {
  const base = {
    origin: flow.origin,
    flowRef: flow.ref,
    savedCopyId: flow.savedCopyId,
    flowId: flow.flowId,
    sourceSlug: flow.sourceSlug,
    sourcePreserved: true as const,
    sourceMutationCount: 0 as const,
  };
  if (flow.origin !== 'authoring-handoff') {
    return {
      ok: true,
      source: { ...base, owner: 'saved-plan-read-model' },
      itemContextByRef: new Map(),
    };
  }

  const authored = flow as PersonalWorkspacePocAuthoredFlow;
  const lineage = authored.authoring as unknown;
  if (!isRecord(lineage)
    || !isNonEmptyString(lineage.handoffId)
    || !isNonEmptyString(lineage.documentId)
    || !isNonEmptyString(lineage.revisionId)
    || !isNonEmptyString(lineage.parseResultId)
    || !isNonEmptyString(lineage.sourceSnapshotId)
    || typeof lineage.rawText !== 'string'
    || !isNonEmptyString(lineage.sourceFingerprint)
    || fingerprintPersonalWorkspacePocAuthoringSource(lineage.rawText)
      !== lineage.sourceFingerprint) {
    return { ok: false, reason: 'invalid-authoring-lineage' };
  }

  const identityMap = lineage.sourceLineItemIdentityMap;
  const parsedItems = lineage.parsedItems;
  if ((identityMap === undefined) !== (parsedItems === undefined)) {
    return { ok: false, reason: 'invalid-authoring-lineage' };
  }

  const itemContextByRef = new Map<string, PersonalWorkspacePocAuthoringItemContext>();
  if (identityMap !== undefined && parsedItems !== undefined) {
    if (!isRecord(identityMap)
      || !Array.isArray(parsedItems)
      || !parsedItems.every(hasValidParsedItemSnapshot)) {
      return { ok: false, reason: 'invalid-authoring-lineage' };
    }
    const parsedByLine = new Map(
      parsedItems.map((parsed) => [String(parsed.sourceLine), parsed]),
    );
    if (parsedByLine.size !== parsedItems.length) {
      return { ok: false, reason: 'invalid-authoring-lineage' };
    }
    for (const [line, unknownIdentity] of Object.entries(identityMap)) {
      if (!isRecord(unknownIdentity)
        || String(unknownIdentity.sourceLine) !== line
        || !Number.isSafeInteger(unknownIdentity.sourceLine)
        || Number(unknownIdentity.sourceLine) < 1
        || !isNonEmptyString(unknownIdentity.itemRef)
        || unknownIdentity.savedCopyId !== flow.savedCopyId
        || unknownIdentity.flowId !== flow.flowId
        || !isNonEmptyString(unknownIdentity.itemId)
        || unknownIdentity.itemRef !== toPersonalWorkspacePocFlowItemRef(
          flow.savedCopyId,
          flow.flowId,
          unknownIdentity.itemId,
        )
        || !sourceItemByRef.has(unknownIdentity.itemRef)
        || itemContextByRef.has(unknownIdentity.itemRef)) {
        return { ok: false, reason: 'invalid-authoring-lineage' };
      }
      const parsed = parsedByLine.get(line);
      if (!parsed) return { ok: false, reason: 'invalid-authoring-lineage' };
      const sourceItem = sourceItemByRef.get(unknownIdentity.itemRef);
      if (!sourceItem
        || sourceItem.itemId !== unknownIdentity.itemId
        || sourceItem.sourceOrder !== parsed.sourceOrder) {
        return { ok: false, reason: 'invalid-authoring-lineage' };
      }
      itemContextByRef.set(unknownIdentity.itemRef, {
        sourceLine: parsed.sourceLine,
        attributes: sourceAttributesFor(parsed),
      });
    }
    if (itemContextByRef.size !== sourceItemByRef.size
      || parsedByLine.size !== sourceItemByRef.size) {
      return { ok: false, reason: 'invalid-authoring-lineage' };
    }
  }

  return {
    ok: true,
    source: {
      ...base,
      owner: 'authoring-working-source',
      authoring: {
        handoffId: lineage.handoffId,
        documentId: lineage.documentId,
        revisionId: lineage.revisionId,
        parseResultId: lineage.parseResultId,
        sourceSnapshotId: lineage.sourceSnapshotId,
        sourceFingerprint: lineage.sourceFingerprint,
        rawText: lineage.rawText,
        itemMapping: identityMap === undefined ? 'legacy-unavailable' : 'complete',
      },
    },
    itemContextByRef,
  };
}

function hasUnsupportedItemSchedule(
  flow: PersonalWorkspacePocFlow,
  item: PersonalWorkspacePocFlowItem,
): boolean {
  const date = getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow).dateDerivation;
  return date.strategy === 'unsupported-source-schedule'
    || date.sourceSchedule.mode === 'unsupported'
    || date.existingPersonalSchedule.mode === 'unsupported'
    || date.pocPersonalSchedule?.mode === 'unsupported';
}

function hasImportedPersonalValue(owner: string, provenance: string): boolean {
  return owner === 'existing-personal' || provenance !== 'none';
}

function resolvePlanDate(
  flow: PersonalWorkspacePocFlow,
  item: PersonalWorkspacePocFlowItem,
  overlay: PersonalWorkspacePocPersonalPlanItemOverlay | undefined,
): DateResolution | null {
  if (overlay?.schedule?.mode === 'fixed_date') {
    return isPersonalWorkspacePocDate(overlay.schedule.date)
      ? { date: overlay.schedule.date, owner: 'poc-personal-plan' }
      : null;
  }
  if (overlay?.schedule?.mode === 'unscheduled') {
    return { owner: 'poc-personal-plan' };
  }

  const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow);
  const imported = ownership.date.existingPersonal;
  if (hasImportedPersonalValue(imported.owner, imported.provenance)) {
    return imported.value === undefined
      ? { owner: 'imported-personal' }
      : isPersonalWorkspacePocDate(imported.value)
        ? { date: imported.value, owner: 'imported-personal' }
        : null;
  }

  const sourceCandidate = ownership.date.source.value
    ?? (ownership.dateDerivation.strategy === 'source-day-offset'
      || ownership.dateDerivation.strategy === 'source-absolute'
      ? ownership.dateDerivation.effectiveDate.value
      : undefined)
    ?? item.sourceDate;
  if (sourceCandidate === undefined) return { owner: 'none' };
  return isPersonalWorkspacePocDate(sourceCandidate)
    ? { date: sourceCandidate, owner: 'source' }
    : null;
}

function resolveEffectiveDate(
  state: PersonalWorkspacePocState,
  itemRef: string,
  planDate: DateResolution,
): Readonly<{ resolution: DateResolution; mode: 'inherit' | 'fixed_date' | 'unscheduled' }> | null {
  const placement = state.placements[itemRef];
  if (!placement || placement.scheduleMode === 'inherit') {
    return { resolution: planDate, mode: 'inherit' };
  }
  if (placement.scheduleMode === 'unscheduled') {
    return { resolution: { owner: 'execution-placement' }, mode: 'unscheduled' };
  }
  if (!isPersonalWorkspacePocDate(placement.date)) return null;
  return {
    resolution: { date: placement.date, owner: 'execution-placement' },
    mode: 'fixed_date',
  };
}

function resolveFlowBaseDate(
  flow: PersonalWorkspacePocFlow,
  localToday: string,
): Readonly<{ ok: true; date: string }> | Readonly<{ ok: false; reason: 'invalid-local-today' | 'invalid-flow-anchor' }> {
  if (!isPersonalWorkspacePocDate(localToday)) {
    return { ok: false, reason: 'invalid-local-today' };
  }
  const anchor = getPersonalWorkspacePocFlowFieldOwnership(flow).anchorDate.effective.value
    ?? flow.anchorDate;
  if (anchor === undefined) return { ok: true, date: localToday };
  return isPersonalWorkspacePocDate(anchor)
    ? { ok: true, date: anchor }
    : { ok: false, reason: 'invalid-flow-anchor' };
}

/** Flow changes reset transient result navigation without writing any store. */
export function selectPersonalWorkspacePocResultFlow(
  current: PersonalWorkspacePocResultNavigationState,
  flow: PersonalWorkspacePocFlow,
  localToday: string,
): PersonalWorkspacePocResultNavigationTransition {
  if (current.selectedFlowRef === flow.ref) {
    return { ok: true, changed: false, reason: 'same-flow', state: current };
  }
  const base = resolveFlowBaseDate(flow, localToday);
  if (!base.ok) return { ok: false, changed: false, reason: base.reason, state: current };
  return {
    ok: true,
    changed: true,
    state: {
      selectedFlowRef: flow.ref,
      resultView: 'text',
      baseDate: base.date,
      selectedDate: base.date,
      openItemRef: null,
      focusReturn: { kind: 'flow-result-heading', flowRef: flow.ref },
    },
  };
}

function contextForDate(date: string | undefined): Readonly<{
  context: 'date' | 'undated';
  key: string;
}> {
  return date
    ? { context: 'date', key: date }
    : { context: 'undated', key: 'undated' };
}

function applyContextOrder(
  items: readonly PreorderedItem[],
  state: PersonalWorkspacePocState,
): readonly PersonalWorkspacePocResultItem[] {
  const refsByContext = new Map<string, string[]>();
  for (const item of items) {
    const context = contextForDate(item.effectiveDate);
    const key = `${context.context}:${context.key}`;
    const refs = refsByContext.get(key) ?? [];
    refs.push(item.ref);
    refsByContext.set(key, refs);
  }

  const rankByRef = new Map<string, Readonly<{
    order: number;
    key: string;
    manual: boolean;
  }>>();
  for (const [compoundKey, refs] of refsByContext) {
    const separator = compoundKey.indexOf(':');
    const context = compoundKey.slice(0, separator) as 'date' | 'undated';
    const contextKey = compoundKey.slice(separator + 1);
    const ordered = applyPersonalWorkspacePocTimelineOrder(
      state,
      context,
      contextKey,
      refs,
    );
    const manual = state.timelineOrders.some(
      (entry) => entry.context === context && entry.contextKey === contextKey,
    );
    ordered.forEach((ref, order) => rankByRef.set(ref, {
      order,
      key: compoundKey,
      manual,
    }));
  }

  return items.map((item) => {
    const rank = rankByRef.get(item.ref) ?? {
      order: item.planOrder,
      key: 'undated:undated',
      manual: false,
    };
    return {
      ...item,
      contextOrder: rank.order,
      contextKey: rank.key,
      manualContextOrder: rank.manual,
    };
  });
}

function buildTextProjection(
  title: string,
  items: readonly PersonalWorkspacePocResultItem[],
  itemRefs: readonly string[],
  sourceNotes: readonly string[] = [],
): PersonalWorkspacePocResultTextProjection {
  const lines: PersonalWorkspacePocResultTextLine[] = [
    { kind: 'flow-title', text: title },
    { kind: 'separator', text: '='.repeat(Math.max(3, Array.from(title).length)) },
    { kind: 'separator', text: '' },
  ];
  const appendProperty = (
    label: string,
    value: string | number | undefined,
    itemRef: string,
    kind: PersonalWorkspacePocResultTextLine['kind'] = 'property',
  ) => {
    if (value === undefined || String(value).length === 0) return;
    const parts = String(value).replace(/\r\n|\r|\n/gu, '\n').split('\n');
    lines.push({ kind, text: `   ${label}: ${parts[0]}`, itemRef });
    parts.slice(1).forEach((part) => lines.push({ kind, text: `     ${part}`, itemRef }));
  };
  let section: string | undefined;
  let sectionNumber = 0;
  for (const item of [...items].sort((left, right) => left.planOrder - right.planOrder)) {
    const nextSection = item.sectionTitle?.trim() || '할 일';
    if (nextSection !== section) {
      if (section !== undefined) lines.push({ kind: 'separator', text: '' });
      section = nextSection;
      sectionNumber = 0;
      lines.push({ kind: 'section', text: `[${section}]` });
    }
    sectionNumber += 1;
    lines.push({
      kind: 'item',
      text: `${sectionNumber}. ${item.completed ? '☑' : '☐'} ${item.title}${item.occurrenceIndex ? ` · ${item.occurrenceIndex}회차` : ''}`,
      itemRef: item.ref,
    });
    const attrs = item.sourceAttributes;
    const descriptions = [attrs?.description, ...(attrs?.additionalDescriptions ?? [])]
      .filter((value): value is string => Boolean(value));
    appendProperty('설명', descriptions.length > 0 ? descriptions.join('\n') : undefined, item.ref);
    if (item.memo && !descriptions.includes(item.memo)) appendProperty('메모', item.memo, item.ref, 'memo');
    appendProperty('완료 기준', attrs?.completionCriteria, item.ref);
    appendProperty('날짜', item.effectiveDate ?? '날짜 미정', item.ref, 'execution-date');
    appendProperty('시간', item.time ?? attrs?.time, item.ref);
    appendProperty('시간대', attrs?.timeZone, item.ref);
    appendProperty('장소', attrs?.place, item.ref);
    appendProperty('소요 시간', attrs?.durationMinutes === undefined ? undefined : `${attrs.durationMinutes}분`, item.ref);
    appendProperty('반복', attrs?.recurrence
      ? `${attrs.recurrence}${attrs.recurrenceEnd ? ` · 종료 ${attrs.recurrenceEnd}` : ''}`
      : undefined, item.ref);
    appendProperty('실행 조건', attrs?.executionCondition, item.ref);
    if ((attrs?.subchecks?.length ?? 0) > 0) {
      lines.push({ kind: 'property', text: '   체크리스트:', itemRef: item.ref });
      attrs?.subchecks?.forEach((subcheck) => lines.push({
        kind: 'property',
        text: `     ${subcheck.sourceChecked ? '☑' : '☐'} ${subcheck.title}`,
        itemRef: item.ref,
      }));
    }
    appendProperty('자료', attrs?.resourceUrl
      ? `${attrs.resourceLabel ? `${attrs.resourceLabel}: ` : ''}${attrs.resourceUrl}`
      : undefined, item.ref);
    appendProperty('출처', attrs?.sourceUrl
      ? `${attrs.sourceLabel ? `${attrs.sourceLabel}: ` : ''}${attrs.sourceUrl}`
      : undefined, item.ref);
    appendProperty('안내', attrs?.guide, item.ref);
    appendProperty('주의', attrs?.caution, item.ref);
  }
  const meaningfulNotes = sourceNotes.filter((line) => line.length > 0);
  if (meaningfulNotes.length > 0) {
    lines.push({ kind: 'separator', text: '' });
    lines.push({ kind: 'source-note', text: '[원문 메모]' });
    meaningfulNotes.forEach((text) => lines.push({ kind: 'source-note', text }));
  }
  return { itemRefs, lines };
}

function buildTodoSections(
  groupKey: string,
  items: readonly PersonalWorkspacePocResultItem[],
): readonly PersonalWorkspacePocResultTodoSection[] {
  const sections = new Map<string, PersonalWorkspacePocResultItem[]>();
  for (const item of items) {
    const title = item.sectionTitle?.trim() || '기타';
    const rows = sections.get(title) ?? [];
    rows.push(item);
    sections.set(title, rows);
  }
  return [...sections.entries()].map(([title, rows], index) => ({
    key: `${groupKey}:section:${index}`,
    title,
    itemRefs: rows.map((item) => item.ref),
    items: rows,
  }));
}

function buildTodoProjection(
  items: readonly PersonalWorkspacePocResultItem[],
  itemRefs: readonly string[],
): PersonalWorkspacePocResultTodoProjection {
  const groups = new Map<string, PersonalWorkspacePocResultItem[]>();
  for (const item of items) {
    const key = item.effectiveDate ? `date:${item.effectiveDate}` : 'undated';
    const rows = groups.get(key) ?? [];
    rows.push(item);
    groups.set(key, rows);
  }
  const orderedGroups = [...groups.entries()]
    .sort(([left], [right]) => {
      if (left === 'undated') return 1;
      if (right === 'undated') return -1;
      return left.localeCompare(right);
    })
    .map(([key, rows]): PersonalWorkspacePocResultTodoGroup => {
      const ordered = [...rows].sort((left, right) => (
        left.contextOrder - right.contextOrder || left.planOrder - right.planOrder
      ));
      const date = key === 'undated' ? undefined : key.slice('date:'.length);
      return {
        key: key as `date:${string}` | 'undated',
        ...(date ? { date } : {}),
        label: date ?? '날짜 미정',
        itemRefs: ordered.map((item) => item.ref),
        items: ordered,
        sections: buildTodoSections(key, ordered),
      };
    });
  return { itemRefs, groups: orderedGroups, rowCount: items.length };
}

function monthCells(
  month: string,
  selectedDate: string,
  items: readonly PersonalWorkspacePocResultItem[],
): readonly PersonalWorkspacePocResultCalendarCell[] {
  const [year, monthNumber] = month.split('-').map(Number);
  const leading = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  // Keep the local result frame stable at six Sunday-first weeks. This avoids
  // layout jumps between months and is the versioned P2-A calendar contract.
  const total = 42;
  const byDate = new Map<string, PersonalWorkspacePocResultItem[]>();
  for (const item of items) {
    if (!item.effectiveDate || item.timelinePolicy === 'excluded') continue;
    const rows = byDate.get(item.effectiveDate) ?? [];
    rows.push(item);
    byDate.set(item.effectiveDate, rows);
  }
  return Array.from({ length: total }, (_, index) => {
    const day = index - leading + 1;
    if (day < 1 || day > days) {
      return {
        key: `${month}:empty:${index}`,
        inMonth: false,
        selected: false,
        itemRefs: [],
        completedCount: 0,
      };
    }
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const rows = [...(byDate.get(date) ?? [])].sort((left, right) => (
      left.contextOrder - right.contextOrder || left.planOrder - right.planOrder
    ));
    return {
      key: date,
      date,
      day,
      inMonth: true,
      selected: date === selectedDate,
      itemRefs: rows.map((item) => item.ref),
      completedCount: rows.filter((item) => item.completed).length,
    };
  });
}

function buildCalendarProjection(
  items: readonly PersonalWorkspacePocResultItem[],
  itemRefs: readonly string[],
  baseDate: string,
  selectedDate: string,
): PersonalWorkspacePocResultProjectionV2['calendar'] {
  const month = baseDate.slice(0, 7);
  const cells = monthCells(month, selectedDate, items);
  const selectedItems = items
    .filter((item) => (
      item.effectiveDate === selectedDate && item.timelinePolicy !== 'excluded'
    ))
    .sort((left, right) => left.contextOrder - right.contextOrder || left.planOrder - right.planOrder);
  const undatedItems = items
    .filter((item) => !item.effectiveDate && item.timelinePolicy !== 'excluded')
    .sort((left, right) => left.planOrder - right.planOrder);
  const monthItemRefs = cells.flatMap((cell) => cell.itemRefs);
  return {
    itemRefs,
    month,
    baseDate,
    selectedDate,
    cells,
    selectedItemRefs: selectedItems.map((item) => item.ref),
    selectedItems,
    undatedItemRefs: undatedItems.map((item) => item.ref),
    datePolicy: 'effective-date-execution-first',
    weekStartsOn: 'sunday',
    weekCount: cells.length / 7,
    monthItemRefs,
    undatedItems,
  };
}

function sheetValue(value: string | number | undefined): PersonalWorkspacePocResultSheetCellValue {
  return value ?? null;
}

function buildSheetProjection(
  items: readonly PersonalWorkspacePocResultItem[],
  itemRefs: readonly string[],
): PersonalWorkspacePocResultSheetProjection {
  const rows = [...items]
    .sort((left, right) => left.planOrder - right.planOrder)
    .map((item): PersonalWorkspacePocResultSheetRow => ({
      rowId: item.occurrenceId ?? `sheet-row:${item.ref}`,
      itemRef: item.sourceItemRef ?? item.ref,
      values: {
        status: item.completed ? 'completed' : 'open',
        sectionTitle: sheetValue(item.sectionTitle),
        title: item.title,
        memo: sheetValue(item.memo),
        planDate: sheetValue(item.planDate),
        effectiveDate: sheetValue(item.effectiveDate),
        time: sheetValue(item.time),
        relativeDate: sheetValue(item.sourceAttributes?.relativeDate),
        sourceDate: sheetValue(item.sourceAttributes?.date),
        timeZone: sheetValue(item.sourceAttributes?.timeZone),
        place: sheetValue(item.sourceAttributes?.place),
        resourceUrl: sheetValue(item.sourceAttributes?.resourceUrl),
        recurrence: sheetValue(item.sourceAttributes?.recurrence),
        recurrenceEnd: sheetValue(item.sourceAttributes?.recurrenceEnd),
        completionCriteria: sheetValue(item.sourceAttributes?.completionCriteria),
        completedAt: sheetValue(item.completedAt),
        planOrder: item.planOrder,
        sourceLine: sheetValue(item.sourceLine),
        occurrenceIndex: sheetValue(item.occurrenceIndex),
        originalOccurrenceDate: sheetValue(item.originalOccurrenceDate),
        occurrenceId: sheetValue(item.occurrenceId),
        sourceItemRef: item.sourceItemRef ?? item.ref,
        itemRef: item.sourceItemRef ?? item.ref,
      },
      item,
    }));
  return {
    itemRefs,
    sourceItemRefs: [...new Set(items.map((item) => item.sourceItemRef ?? item.ref))],
    occurrenceIds: items.flatMap((item) => item.occurrenceId ? [item.occurrenceId] : []),
    columns: PERSONAL_WORKSPACE_POC_RESULT_SHEET_COLUMNS,
    rows,
    rowCount: rows.length,
    sourcePreserved: true,
  };
}

function buildTxtProjection(
  text: PersonalWorkspacePocResultTextProjection,
): PersonalWorkspacePocResultProjectionV2['txt'] {
  const normalizedText = normalizeResultTxtPayload(
    text.lines.map((line) => line.text).join('\n'),
  );
  return {
    itemRefs: text.itemRefs,
    mediaType: 'text/plain;charset=utf-8',
    mode: 'copy-only',
    copyText: normalizedText,
    lineItemRefs: text.lines.map((line) => line.itemRef ?? null),
    normalizedText,
    sourceRawTextIncluded: false,
    downloadSupported: true,
    normalization: {
      lineEndings: 'lf',
      finalNewline: 'single',
      trailingHorizontalWhitespace: 'removed',
    },
  };
}

function sourceOnlyNotes(flow: PersonalWorkspacePocFlow): readonly string[] {
  if (flow.origin !== 'authoring-handoff') return [];
  const sourceLines = (flow as PersonalWorkspacePocAuthoredFlow)
    .authoring.fidelityManifest?.sourceLines;
  if (!Array.isArray(sourceLines)) return [];
  return sourceLines
    .filter((line) => line.support === 'source-only'
      && (line.kind === 'prose' || line.kind === 'fenced-code')
      && line.rawLine.length > 0)
    .map((line) => line.rawLine);
}

function normalizeResultTxtPayload(value: string): string {
  const body = value
    .replace(/\r\n|\r|\n/gu, '\n')
    .replace(/[ \t]+(?=\n|$)/gu, '')
    .replace(/\n+$/gu, '');
  return `${body}\n`;
}

function resultFilenameSegment(value: string, fallback: string): string {
  const normalized = value
    .normalize('NFKC')
    .replace(/[\u0000-\u001f<>:"/\\|?*\u007f]/gu, ' ')
    .trim()
    .replace(/\s+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^[-. ]+/gu, '')
    .replace(/[. ]+$/gu, '')
    .slice(0, 60);
  return normalized || fallback;
}

function quoteCsvValue(value: PersonalWorkspacePocResultSheetCellValue): string {
  return `"${String(value ?? '').replace(/"/gu, '""')}"`;
}

function buildCsvPayload(sheet: PersonalWorkspacePocResultSheetProjection): string {
  const rows = [
    sheet.columns.map((column) => quoteCsvValue(column.label)).join(','),
    ...sheet.rows.map((row) => sheet.columns
      .map((column) => quoteCsvValue(row.values[column.key]))
      .join(',')),
  ];
  return `\uFEFF${rows.join('\r\n')}\r\n`;
}

/**
 * Builds local-only files from an already resolved projection. It returns
 * strings and metadata only: no storage, browser, operating export, or source
 * writer is reachable from this pure function.
 */
export function buildPersonalWorkspacePocResultDownloads(input: Readonly<{
  title: string;
  savedCopyId: string;
  txt: PersonalWorkspacePocResultProjectionV2['txt'];
  sheet: PersonalWorkspacePocResultSheetProjection;
}>): PersonalWorkspacePocResultDownloads {
  const title = resultFilenameSegment(input.title, 'result');
  const savedCopyId = resultFilenameSegment(input.savedCopyId, 'copy');
  const stem = `flow-${title}-${savedCopyId}`;
  return {
    version: PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT_VERSION,
    itemRefs: input.txt.itemRefs,
    txt: {
      filename: `${stem}.txt`,
      mediaType: PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT.txt.mediaType,
      encoding: PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT.txt.encoding,
      bom: PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT.txt.bom,
      lineEndings: PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT.txt.lineEndings,
      finalNewline: PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT.txt.finalNewline,
      payload: normalizeResultTxtPayload(input.txt.normalizedText),
    },
    csv: {
      filename: `${stem}.csv`,
      mediaType: PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT.csv.mediaType,
      encoding: PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT.csv.encoding,
      bom: PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT.csv.bom,
      lineEndings: PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT.csv.lineEndings,
      finalNewline: PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT.csv.finalNewline,
      payload: buildCsvPayload(input.sheet),
      columns: input.sheet.columns.map((column) => column.key),
      delimiter: PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT.csv.delimiter,
      escaping: PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT.csv.escaping,
    },
    sourceRawTextIncluded: false,
    sourceMutationCount: 0,
  };
}

/**
 * Builds Text, Todo, Calendar, and Sheet plus copy/local-download payloads from
 * one immutable effective Item array. It has no storage, clipboard, Calendar,
 * or operating export writer port.
 */
export function buildPersonalWorkspacePocResultProjection(input: Readonly<{
  model: PersonalWorkspacePocReadModel;
  state: PersonalWorkspacePocState;
  flowRef: string;
  localToday: string;
  baseDate?: string;
  selectedDate?: string;
}>): PersonalWorkspacePocResultProjectionResult {
  if (!isRecord(input.model) || !Array.isArray(input.model.flows)) {
    return failure('invalid-model-shape');
  }
  if (input.model.version !== PERSONAL_WORKSPACE_POC_VERSION) {
    return failure('invalid-model-version');
  }
  if (!isRecord(input.state)) return failure('invalid-state-shape');
  if (input.state.version !== PERSONAL_WORKSPACE_POC_VERSION) {
    return failure('invalid-state-version');
  }
  if (!hasValidStateShape(input.state)) return failure('invalid-state-shape');
  if (!isPersonalWorkspacePocDate(input.localToday)) return failure('invalid-local-today');
  const flows = input.model.flows as readonly PersonalWorkspacePocFlow[];
  const flow = flows.find((candidate) => (
    isRecord(candidate) && candidate.ref === input.flowRef
  ));
  if (!flow) return failure('flow-not-found');
  if (!hasValidFlowShape(flow)) {
    return isSupportedOrigin(flow.origin)
      ? failure('invalid-model-shape')
      : failure('unsupported-origin');
  }
  if (flow.ref !== toPersonalWorkspacePocFlowRef(flow.savedCopyId, flow.flowId)) {
    return failure('malformed-flow-identity');
  }

  const base = resolveFlowBaseDate(flow, input.localToday);
  if (!base.ok) return failure(base.reason === 'invalid-local-today'
    ? 'invalid-local-today'
    : 'invalid-base-date');
  const baseDate = input.baseDate ?? base.date;
  if (!isPersonalWorkspacePocDate(baseDate)) return failure('invalid-base-date');
  const selectedDate = input.selectedDate ?? baseDate;
  if (!isPersonalWorkspacePocDate(selectedDate)) return failure('invalid-selected-date');

  const overlay = input.state.personalPlanOverlays?.[flow.ref];
  if (overlay !== undefined && !hasValidPersonalPlanOverlayShape(overlay)) {
    return failure('invalid-personal-plan-overlay');
  }
  if (overlay && (
    overlay.flowRef !== flow.ref
    || overlay.savedCopyId !== flow.savedCopyId
    || overlay.flowId !== flow.flowId
  )) return failure('invalid-personal-plan-overlay');

  const sourceItemByRef = new Map<string, PersonalWorkspacePocFlowItem>();
  for (const item of flow.items) {
    if (!hasValidItemShape(item)) return failure('invalid-model-shape');
    if (sourceItemByRef.has(item.ref)) return failure('duplicate-item-identity');
    if (item.ref !== toPersonalWorkspacePocFlowItemRef(item.savedCopyId, item.flowId, item.itemId)
      || item.savedCopyId !== flow.savedCopyId
      || item.flowId !== flow.flowId) return failure('malformed-item-identity');
    sourceItemByRef.set(item.ref, item);
  }
  const sourceResolution = resolveResultSource(flow, sourceItemByRef);
  if (!sourceResolution.ok) return failure(sourceResolution.reason);
  if (overlay && Object.keys(overlay.items).some((itemRef) => !sourceItemByRef.has(itemRef))) {
    return failure('invalid-personal-plan-overlay');
  }
  const sourceSectionById = new Map(
    (flow.sections ?? []).map((section) => [section.sectionId, section] as const),
  );
  if (sourceSectionById.size !== (flow.sections ?? []).length) {
    return failure('invalid-model-shape');
  }
  const sectionTitleOverrides = overlay?.sectionTitles ?? {};
  if (Object.keys(sectionTitleOverrides).length > 0
    && !['personal-draft', 'authoring-handoff'].includes(flow.origin)) {
    return failure('invalid-personal-plan-overlay');
  }
  for (const sectionId of Object.keys(sectionTitleOverrides)) {
    const section = sourceSectionById.get(sectionId);
    if (!section || section.editCapability !== 'poc-shadow') {
      return failure('invalid-personal-plan-overlay');
    }
  }
  const orderedRefs = overlay?.orderedItemRefs ?? flow.items.map((item) => item.ref);
  if (orderedRefs.length !== flow.items.length
    || new Set(orderedRefs).size !== orderedRefs.length
    || orderedRefs.some((itemRef) => !sourceItemByRef.has(itemRef))) {
    return failure('invalid-personal-plan-overlay');
  }

  const preordered: PreorderedItem[] = [];
  const projectedOccurrenceIds = new Set<string>();
  let manifestOrder = 0;
  for (const itemRef of orderedRefs) {
    const sourceItem = sourceItemByRef.get(itemRef) as PersonalWorkspacePocFlowItem;
    const itemOverlay = overlay?.items[itemRef];
    if (hasUnsupportedItemSchedule(flow, sourceItem)) {
      return failure('unsupported-item-schedule');
    }
    const planDate = resolvePlanDate(flow, sourceItem, itemOverlay);
    if (!planDate) return failure('invalid-item-date');
    const authoringContext = sourceResolution.itemContextByRef.get(itemRef);
    const memo = itemOverlay && Object.hasOwn(itemOverlay, 'memo')
      ? itemOverlay.memo
      : authoringContext
        ? undefined
        : sourceItem.description;
    const sourceAttributes = authoringContext?.attributes;
    const sourceSection = sourceItem.sectionId
      ? sourceSectionById.get(sourceItem.sectionId)
      : undefined;
    if (sourceItem.sectionId && sourceSectionById.size > 0
      && (!sourceSection || sourceItem.sectionTitle !== sourceSection.title)) {
      return failure('invalid-model-shape');
    }
    const effectiveSectionTitle = sourceItem.sectionId
      ? sectionTitleOverrides[sourceItem.sectionId] ?? sourceSection?.title ?? sourceItem.sectionTitle
      : sourceItem.sectionTitle;
    const common = {
      flowRef: flow.ref,
      savedCopyId: sourceItem.savedCopyId,
      flowId: sourceItem.flowId,
      itemId: sourceItem.itemId,
      title: itemOverlay?.title ?? sourceItem.title,
      ...(memo !== undefined ? { memo } : {}),
      ...(effectiveSectionTitle ? { sectionTitle: effectiveSectionTitle } : {}),
      sourceOrder: sourceItem.sourceOrder,
      ...(authoringContext ? {
        sourceLine: authoringContext.sourceLine,
        sourceAttributes,
      } : {}),
    } as const;

    if (sourceAttributes?.recurrence) {
      if (!planDate.date
        || input.state.placements[itemRef]
        || input.state.completions[itemRef]) return failure('invalid-occurrence-state');
      const expanded = expandPersonalWorkspacePocOccurrences({
        sourceItemRef: itemRef,
        startDate: planDate.date,
        recurrence: sourceAttributes.recurrence,
        ...(sourceAttributes.recurrenceEnd
          ? { recurrenceEnd: sourceAttributes.recurrenceEnd }
          : {}),
      });
      if (!expanded.ok) return failure('invalid-recurrence');
      for (const occurrence of expanded.manifest.rows) {
        projectedOccurrenceIds.add(occurrence.occurrenceId);
        const placement = input.state.occurrencePlacements?.[occurrence.occurrenceId];
        const completion = input.state.occurrenceCompletions?.[occurrence.occurrenceId];
        if ((placement && (placement.sourceItemRef !== itemRef
          || placement.originalDate !== occurrence.originalDate))
          || (completion && (completion.sourceItemRef !== itemRef
            || completion.originalDate !== occurrence.originalDate))) {
          return failure('invalid-occurrence-state');
        }
        const effectiveDate = placement?.scheduleMode === 'unscheduled'
          ? undefined
          : placement?.date ?? occurrence.originalDate;
        const completed = completion
          ? completion.status === 'completed'
          : Boolean(sourceAttributes.sourceChecked);
        preordered.push({
          ...common,
          ref: occurrence.occurrenceId,
          sourceItemRef: itemRef,
          occurrenceId: occurrence.occurrenceId,
          occurrenceIndex: occurrence.occurrenceIndex,
          originalOccurrenceDate: occurrence.originalDate,
          planOrder: manifestOrder,
          planDate: occurrence.originalDate,
          planDateOwner: planDate.owner as Exclude<PersonalWorkspacePocResultDateOwner, 'execution-placement'>,
          ...(effectiveDate ? { effectiveDate } : {}),
          effectiveDateOwner: placement ? 'execution-placement' : planDate.owner,
          executionScheduleMode: placement?.scheduleMode ?? 'inherit',
          ...(sourceAttributes.time ? { time: sourceAttributes.time } : {}),
          timelinePolicy: 'auto',
          completed,
          ...(completion?.completedAt ? { completedAt: completion.completedAt } : {}),
        });
        manifestOrder += 1;
      }
      continue;
    }

    const effective = resolveEffectiveDate(input.state, itemRef, planDate);
    if (!effective) return failure('invalid-item-date');
    const completion = input.state.completions[itemRef];
    const placement = input.state.placements[itemRef];
    preordered.push({
      ...common,
      ref: itemRef,
      sourceItemRef: itemRef,
      planOrder: manifestOrder,
      ...(planDate.date ? { planDate: planDate.date } : {}),
      planDateOwner: planDate.owner as Exclude<PersonalWorkspacePocResultDateOwner, 'execution-placement'>,
      ...(effective.resolution.date ? { effectiveDate: effective.resolution.date } : {}),
      effectiveDateOwner: effective.resolution.owner,
      executionScheduleMode: effective.mode,
      ...(placement?.time ?? sourceAttributes?.time
        ? { time: placement?.time ?? sourceAttributes?.time }
        : {}),
      timelinePolicy: placement?.timelinePolicy ?? 'auto',
      completed: completion
        ? completion.status === 'completed'
        : Boolean(sourceAttributes?.sourceChecked),
      ...(completion?.completedAt ? { completedAt: completion.completedAt } : {}),
    });
    manifestOrder += 1;
  }

  const hasForeignOccurrenceState = [
    ...Object.values(input.state.occurrencePlacements ?? {}),
    ...Object.values(input.state.occurrenceCompletions ?? {}),
  ].some((entry) => sourceItemByRef.has(entry.sourceItemRef)
    && !projectedOccurrenceIds.has(entry.occurrenceId));
  if (hasForeignOccurrenceState) return failure('invalid-occurrence-state');

  const items = applyContextOrder(preordered, input.state);
  const itemRefs = items
    .slice()
    .sort((left, right) => left.planOrder - right.planOrder)
    .map((item) => item.ref);
  const sourceItemRefs = orderedRefs.slice();
  const occurrenceIds = itemRefs.filter((ref) => ref.startsWith('poc-occurrence-series:v1:'));
  const title = overlay?.title ?? flow.title;
  const text = buildTextProjection(title, items, itemRefs, sourceOnlyNotes(flow));
  const todo = buildTodoProjection(items, itemRefs);
  const calendar = buildCalendarProjection(items, itemRefs, baseDate, selectedDate);
  const sheet = buildSheetProjection(items, itemRefs);
  const txt = buildTxtProjection(text);
  const downloads = buildPersonalWorkspacePocResultDownloads({
    title,
    savedCopyId: flow.savedCopyId,
    txt,
    sheet,
  });

  return {
    ok: true,
    projection: {
      version: PERSONAL_WORKSPACE_POC_RESULT_PROJECTION_VERSION,
      slotOrder: PERSONAL_WORKSPACE_POC_RESULT_SLOT_ORDER,
      flowRef: flow.ref,
      title,
      baseDate,
      selectedDate,
      itemRefs,
      sourceItemRefs,
      occurrenceIds,
      items,
      text,
      todo,
      calendar,
      sheet,
      txt,
      downloads,
      source: sourceResolution.source,
    },
  };
}
