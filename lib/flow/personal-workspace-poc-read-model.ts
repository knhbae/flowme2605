import { FLOW_USER_DATA_BUNDLES_STORAGE_KEY } from './flow-user-data-mutation-transaction';
import {
  MY_FLOW_DATE_OVERRIDES_STORAGE_KEY,
  MY_FLOW_DATE_REMOVED_OVERRIDE,
  MY_FLOW_ITEM_DRAFTS_STORAGE_KEY,
  getMyFlowDateOverrideKey,
  resolveMyFlowEffectiveDate,
  type StoredMyFlowItemDraft,
} from './my-flow-personal-state';
import {
  buildPersonalDraftProjectionValueOverlays,
  getPersonalDraftProjectionValueKey,
} from './personal-draft-projection-state';
import {
  createPersonalDraftStructuralOverlay,
  isPersonalDraftStructuralEditEligible,
} from './personal-draft-structural-edit';
import {
  PERSONAL_WORKSPACE_POC_VERSION,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocMapGroupRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocFieldLayers,
  type PersonalWorkspacePocFieldOwner,
  type PersonalWorkspacePocFieldProvenance,
  type PersonalWorkspacePocFlowItem,
  type PersonalWorkspacePocFlowItemFieldOwnership,
  type PersonalWorkspacePocFlowFieldOwnership,
  type PersonalWorkspacePocFlowPresentation,
  type PersonalWorkspacePocFlowSection,
  type PersonalWorkspacePocOwnedFieldValue,
  type PersonalWorkspacePocReadModel,
  type PersonalWorkspacePocScheduleInput,
} from './personal-workspace-poc-contract';
import { isPersonalWorkspacePocDate } from './personal-workspace-poc-state';
import { buildPersonalDraftStructuralProjection } from './personal-structural-projection';
import {
  getPersonalStructuralOverlayStorageKey,
  normalizePersonalStructuralOverlay,
  type PersonalStructuralSchedule,
  type PersonalStructuralOverlay,
} from './personal-structural-overlay';
import { readProjectionIdentityStorage } from './projection-identity';
import {
  isValidPublicFlowDateOverrideRecord,
  isValidPublicFlowItemDraftRecord,
  readPublicFlowSaveJsonRecord,
} from './public-flow-save-transaction';
import {
  mergeSavedPlanEditorPersonalStructuralOverlayRaw,
  parseSavedPlanEditorMapPersistence,
  parseSavedPlanEditorMapSnapshot,
} from './saved-plan-editor-persistence';
import {
  classifySavedPlanEditorOrigin,
  isSupportedSavedPlanEditorOrigin,
} from './saved-plan-editor-origin';
import {
  applySourceBackedPersistenceRecordToBundle,
  getSourceBackedFlowMapPersistenceStorageKey,
  type SourceBackedFlowMapPersistenceRecord,
} from './source-backed-my-flow';
import {
  normalizeSavedFlowRecord,
  type SavedFlowMapSnapshot,
  type SavedFlowRecord,
} from './storage';
import type { FlowBundle, FlowItem } from './types';

const SAVED_FLOW_KEY_PREFIX = 'flow:saved:';
const SAVED_FLOW_MAP_KEY_PREFIX = 'flow:map:saved:';
const SAVED_FLOW_MAP_PERSISTENCE_KEY_PREFIX = 'flow:map:persistence:';
const LEGACY_BUNDLE_REGISTRY_KEYS = [
  'flow_builder_mvp_bundles_v10',
  'flow_builder_mvp_bundles_v9',
  'flow_builder_mvp_bundles_v8',
  'flow_builder_mvp_bundles_v7',
  'flow_builder_mvp_bundles_v6',
  'flow_builder_mvp_bundles_v5',
  'flow_builder_mvp_bundles_v4',
  'flow_builder_mvp_bundles_v3',
] as const;
const FLOW_STRUCTURE_TYPES = new Set(['timeline', 'phase', 'routine', 'checklist']);
const FLOW_ANCHOR_TYPES = new Set([
  'start_date',
  'end_date',
  'baby_age_month',
  'baby_birth_date',
  'none',
]);

export type PersonalWorkspacePocReadStorage = Pick<Storage, 'length' | 'key' | 'getItem'>;

export type PersonalWorkspacePocReadResult =
  | { ok: true; model: PersonalWorkspacePocReadModel }
  | { ok: false; reason: string };

type InternalResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

type StrictSavedRecord = {
  rawValue: Record<string, unknown>;
  record: SavedFlowRecord;
};

type StrictSavedMap = {
  snapshot: SavedFlowMapSnapshot;
  persistence?: SourceBackedFlowMapPersistenceRecord;
};

type Candidate = {
  flowSlug: string;
  bundle: FlowBundle;
  savedRecord?: StrictSavedRecord;
  savedMap?: StrictSavedMap;
};

type ProjectableItem = {
  id: string;
  title: string;
  description?: string;
  sectionId?: string;
  order: number;
  dayOffset?: number;
};

type ProjectionValues = {
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  dateOverrides: Record<string, string>;
};

type OwnedFieldInput<T> = {
  value?: T;
  owner: PersonalWorkspacePocFieldOwner;
  provenance: PersonalWorkspacePocFieldProvenance;
};

type ProjectedDate = OwnedFieldInput<string>;

function ownedField<T>(input: OwnedFieldInput<T>): PersonalWorkspacePocOwnedFieldValue<T> {
  return {
    ...(input.value !== undefined ? { value: input.value } : {}),
    owner: input.owner,
    provenance: input.provenance,
  };
}

function emptyField<T>(): PersonalWorkspacePocOwnedFieldValue<T> {
  return { owner: 'none', provenance: 'none' };
}

function fieldLayers<T>(options: {
  source?: OwnedFieldInput<T>;
  existingPersonal?: OwnedFieldInput<T>;
  effective?: OwnedFieldInput<T>;
}): PersonalWorkspacePocFieldLayers<T> {
  return {
    source: options.source ? ownedField(options.source) : emptyField<T>(),
    existingPersonal: options.existingPersonal
      ? ownedField(options.existingPersonal)
      : emptyField<T>(),
    effective: options.effective ? ownedField(options.effective) : emptyField<T>(),
  };
}

function noneSchedule(
  owner: PersonalWorkspacePocFieldOwner = 'none',
  provenance: PersonalWorkspacePocFieldProvenance = 'none',
): PersonalWorkspacePocScheduleInput {
  return { mode: 'none', owner, provenance };
}

function scheduleInput(options: {
  schedule?: PersonalStructuralSchedule;
  owner: PersonalWorkspacePocFieldOwner;
  provenance: PersonalWorkspacePocFieldProvenance;
}): PersonalWorkspacePocScheduleInput {
  if (!options.schedule) return noneSchedule(options.owner, options.provenance);
  return options.schedule.mode === 'anchor_offset'
    ? {
        mode: 'day-offset',
        dayOffset: options.schedule.dayOffset,
        owner: options.owner,
        provenance: options.provenance,
      }
    : {
        mode: 'absolute',
        date: options.schedule.date,
        owner: options.owner,
        provenance: options.provenance,
      };
}

function sourceScheduleForRegularItem(options: {
  candidate: Candidate;
  item: ProjectableItem;
  provenance: Extract<
    PersonalWorkspacePocFieldProvenance,
    'flow-bundle' | 'saved-map-persistence'
  >;
}): PersonalWorkspacePocScheduleInput {
  const binding = options.candidate.savedMap?.persistence?.childFlows
    .find((flow) => flow.slug === options.candidate.flowSlug)
    ?.steps.find((step) => step.stepId === options.item.id);
  if (binding) {
    if (binding.calendar.mode === 'anchor_offset' && Number.isFinite(binding.calendar.dayOffset)) {
      return {
        mode: 'day-offset',
        dayOffset: Number(binding.calendar.dayOffset),
        owner: 'source',
        provenance: options.provenance,
      };
    }
    if (binding.calendar.mode === 'absolute') {
      const possibleDate = (binding.calendar as { date?: unknown }).date;
      return {
        mode: 'absolute',
        ...(typeof possibleDate === 'string' && isPersonalWorkspacePocDate(possibleDate)
          ? { date: possibleDate }
          : {}),
        owner: 'source',
        provenance: options.provenance,
      };
    }
    if (binding.calendar.mode !== 'none') {
      return {
        mode: 'unsupported',
        sourceMode: binding.calendar.mode,
        owner: 'source',
        provenance: options.provenance,
      };
    }
    return noneSchedule('source', options.provenance);
  }
  return Number.isFinite(options.item.dayOffset)
    ? {
        mode: 'day-offset',
        dayOffset: Number(options.item.dayOffset),
        owner: 'source',
        provenance: options.provenance,
      }
    : noneSchedule('source', options.provenance);
}

function absolutePersonalSchedule(
  date: string | undefined,
  provenance: PersonalWorkspacePocFieldProvenance,
): PersonalWorkspacePocScheduleInput {
  return {
    mode: 'absolute',
    ...(date ? { date } : {}),
    owner: 'existing-personal',
    provenance,
  };
}

function buildDateFieldOwnership(options: {
  sourceSchedule: PersonalWorkspacePocScheduleInput;
  existingPersonalSchedule?: PersonalWorkspacePocScheduleInput;
  anchorInput?: OwnedFieldInput<string>;
  effectiveDate: ProjectedDate;
}): Pick<PersonalWorkspacePocFlowItemFieldOwnership, 'date' | 'dateDerivation'> {
  const personalSchedule = options.existingPersonalSchedule ?? noneSchedule();
  const isDirectOverride = options.effectiveDate.owner === 'existing-personal'
    && options.effectiveDate.provenance !== 'map-personal-copy'
    && options.effectiveDate.provenance !== 'personal-structural-overlay';
  const usesAnchor = !isDirectOverride && (
    personalSchedule.mode === 'day-offset'
    || (personalSchedule.mode === 'none' && options.sourceSchedule.mode === 'day-offset')
  );
  const sourceDate = options.sourceSchedule.mode === 'absolute'
    ? {
        ...(options.sourceSchedule.date ? { value: options.sourceSchedule.date } : {}),
        owner: options.sourceSchedule.owner,
        provenance: options.sourceSchedule.provenance,
      }
    : {
        owner: options.sourceSchedule.owner,
        provenance: options.sourceSchedule.provenance,
      };
  const effectiveDate = ownedField(options.effectiveDate);
  const personalValue = options.effectiveDate.owner === 'existing-personal'
    ? effectiveDate
    : emptyField<string>();
  const directOverride = isDirectOverride ? effectiveDate : emptyField<string>();
  const strategy = isDirectOverride
    ? 'existing-personal-override' as const
    : personalSchedule.mode !== 'none'
      ? 'existing-personal-schedule' as const
      : options.sourceSchedule.mode === 'day-offset'
        ? 'source-day-offset' as const
        : options.sourceSchedule.mode === 'absolute'
          ? 'source-absolute' as const
          : options.sourceSchedule.mode === 'unsupported'
            ? 'unsupported-source-schedule' as const
            : 'undated' as const;
  return {
    date: {
      source: sourceDate,
      existingPersonal: personalValue,
      effective: options.effectiveDate.provenance === 'none'
        ? emptyField<string>()
        : effectiveDate,
    },
    dateDerivation: {
      sourceSchedule: options.sourceSchedule,
      existingPersonalSchedule: personalSchedule,
      anchorInput: usesAnchor && options.anchorInput
        ? ownedField(options.anchorInput)
        : emptyField<string>(),
      existingPersonalOverride: directOverride,
      effectiveDate: options.effectiveDate.provenance === 'none'
        ? emptyField<string>()
        : effectiveDate,
      strategy,
    },
  };
}

function fail(reason: string): PersonalWorkspacePocReadResult {
  return { ok: false, reason };
}

function internalFail<T = never>(reason: string): InternalResult<T> {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function listStorageKeys(storage: PersonalWorkspacePocReadStorage): string[] | undefined {
  try {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key) keys.push(key);
    }
    return keys;
  } catch {
    return undefined;
  }
}

function isStrictSection(value: unknown, flowId: string): boolean {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.title)
    && Number.isFinite(value.order)
    && (!hasOwn(value, 'flow_id') || value.flow_id === flowId);
}

function isStrictItem(value: unknown, flowId: string): boolean {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && value.flow_id === flowId
    && isNonEmptyString(value.title)
    && (value.type === 'todo' || value.type === 'calendar')
    && Number.isFinite(value.order)
    && (!hasOwn(value, 'day_offset') || Number.isFinite(value.day_offset));
}

function isStrictMealSlot(value: unknown, flowId: string): boolean {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && value.flow_id === flowId
    && isNonEmptyString(value.menu_title)
    && Array.isArray(value.new_ingredients)
    && value.new_ingredients.every((ingredient) => typeof ingredient === 'string')
    && Number.isFinite(value.order)
    && Number.isFinite(value.day_offset);
}

function isStrictBundle(value: unknown): value is FlowBundle {
  if (!isRecord(value) || !isRecord(value.flow)) return false;
  const flow = value.flow;
  if (
    !isNonEmptyString(flow.id)
    || !isNonEmptyString(flow.slug)
    || !isNonEmptyString(flow.title)
    || !isNonEmptyString(flow.category)
    || typeof flow.structure_type !== 'string'
    || !FLOW_STRUCTURE_TYPES.has(flow.structure_type)
    || typeof flow.anchor_type !== 'string'
    || !FLOW_ANCHOR_TYPES.has(flow.anchor_type)
    || (flow.status !== 'draft' && flow.status !== 'published')
    || !Array.isArray(value.sections)
    || !Array.isArray(value.items)
    || value.sections.some((section) => !isStrictSection(section, flow.id as string))
    || value.items.some((item) => !isStrictItem(item, flow.id as string))
    || (hasOwn(value, 'mealSlots') && (
      !Array.isArray(value.mealSlots)
      || value.mealSlots.some((slot) => !isStrictMealSlot(slot, flow.id as string))
    ))
  ) return false;

  const sectionIds = value.sections.map((section) => (section as Record<string, unknown>).id);
  const itemIds = value.items.map((item) => (item as Record<string, unknown>).id);
  const mealSlotIds = Array.isArray(value.mealSlots)
    ? value.mealSlots.map((slot) => (slot as Record<string, unknown>).id)
    : [];
  return new Set(sectionIds).size === sectionIds.length
    && new Set(itemIds).size === itemIds.length
    && new Set(mealSlotIds).size === mealSlotIds.length;
}

function isStrictBundleRegistry(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((entry) => !isStrictBundle(entry))) return false;
    const identities = parsed.map((entry) => {
      const bundle = entry as FlowBundle;
      return `${bundle.flow.id}\u0000${bundle.flow.slug}`;
    });
    return new Set(identities).size === identities.length;
  } catch {
    return false;
  }
}

function preflightBundleRegistry(
  storage: PersonalWorkspacePocReadStorage,
): InternalResult<undefined> {
  try {
    const active = storage.getItem(FLOW_USER_DATA_BUNDLES_STORAGE_KEY);
    if (active !== null) {
      return isStrictBundleRegistry(active)
        ? { ok: true, value: undefined }
        : internalFail('malformed-active-bundle-registry');
    }
    for (const key of LEGACY_BUNDLE_REGISTRY_KEYS) {
      const raw = storage.getItem(key);
      if (raw !== null && !isStrictBundleRegistry(raw)) {
        return internalFail('malformed-legacy-bundle-registry');
      }
    }
    return { ok: true, value: undefined };
  } catch {
    return internalFail('bundle-registry-read-failed');
  }
}

function parseStrictSavedRecords(
  storage: PersonalWorkspacePocReadStorage,
  keys: readonly string[],
): InternalResult<Map<string, StrictSavedRecord>> {
  const records = new Map<string, StrictSavedRecord>();
  for (const key of keys.filter((candidate) => candidate.startsWith(SAVED_FLOW_KEY_PREFIX))) {
    try {
      const raw = storage.getItem(key);
      if (raw === null) return internalFail('malformed-saved-record');
      const rawValue: unknown = JSON.parse(raw);
      const record = normalizeSavedFlowRecord(rawValue);
      const keySlug = key.slice(SAVED_FLOW_KEY_PREFIX.length);
      if (
        !isRecord(rawValue)
        || !record
        || rawValue.slug !== keySlug
        || record.slug !== keySlug
        || records.has(record.slug)
      ) return internalFail('malformed-saved-record');
      records.set(record.slug, { rawValue, record });
    } catch {
      return internalFail('malformed-saved-record');
    }
  }
  return { ok: true, value: records };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function mapPersonalCopyOwnersAreScoped(snapshot: SavedFlowMapSnapshot): boolean {
  const personalCopy = snapshot.personalCopy;
  if (!personalCopy) return true;
  const owners = new Set(snapshot.flowSlugs);
  return [
    personalCopy.includedStepIdsByFlow,
    personalCopy.excludedStepIdsByFlow,
    personalCopy.stepOverridesByFlow ?? {},
    personalCopy.retainedStepsByFlow ?? {},
  ].every((record) => Object.keys(record).every((flowSlug) => owners.has(flowSlug)));
}

function validateMapPersistencePair(
  snapshot: SavedFlowMapSnapshot,
  persistence: SourceBackedFlowMapPersistenceRecord,
): string | undefined {
  const snapshotFlows = [...snapshot.flowSlugs].sort();
  const persistedFlows = persistence.childFlows.map((child) => child.slug).sort();
  if (canonicalJson(snapshotFlows) !== canonicalJson(persistedFlows)) {
    return 'map-persistence-flow-mismatch';
  }
  if ((snapshot.anchor ?? undefined) !== (persistence.saved.anchor ?? undefined)) {
    return 'map-persistence-anchor-mismatch';
  }
  if (canonicalJson(snapshot.personalCopy) !== canonicalJson(persistence.personalCopy)) {
    return 'map-persistence-personal-copy-mismatch';
  }
  for (const child of persistence.childFlows) {
    const expectedCount = snapshot.stepCountsByFlow?.[child.slug];
    if (expectedCount !== undefined && expectedCount !== child.stepCount) {
      return 'map-persistence-step-count-mismatch';
    }
  }
  return undefined;
}

function parseStrictSavedMaps(
  storage: PersonalWorkspacePocReadStorage,
  keys: readonly string[],
): InternalResult<StrictSavedMap[]> {
  const maps: StrictSavedMap[] = [];
  const mapIds = new Set<string>();
  const snapshotKeys = keys.filter((key) => key.startsWith(SAVED_FLOW_MAP_KEY_PREFIX));
  for (const key of snapshotKeys) {
    const keyMapId = key.slice(SAVED_FLOW_MAP_KEY_PREFIX.length);
    let raw: string | null;
    let rawValue: unknown;
    try {
      raw = storage.getItem(key);
      rawValue = raw === null ? null : JSON.parse(raw);
    } catch {
      return internalFail('malformed-saved-map');
    }
    if (
      raw === null
      || !isRecord(rawValue)
      || !Array.isArray(rawValue.flowSlugs)
      || rawValue.flowSlugs.length === 0
      || rawValue.flowSlugs.some((flowSlug) => !isNonEmptyString(flowSlug))
      || mapIds.has(keyMapId)
    ) return internalFail('malformed-saved-map');

    const flowSlugs = rawValue.flowSlugs as string[];
    let snapshot: SavedFlowMapSnapshot | undefined;
    for (const flowSlug of flowSlugs) {
      const parsed = parseSavedPlanEditorMapSnapshot(raw, keyMapId, flowSlug);
      if (!parsed) return internalFail('malformed-saved-map');
      snapshot = parsed.snapshot;
    }
    if (!snapshot || !mapPersonalCopyOwnersAreScoped(snapshot)) {
      return internalFail('malformed-saved-map-personal-copy-owner');
    }

    const persistenceKey = getSourceBackedFlowMapPersistenceStorageKey(keyMapId);
    let persistenceRaw: string | null;
    try {
      persistenceRaw = storage.getItem(persistenceKey);
    } catch {
      return internalFail('map-persistence-read-failed');
    }
    let persistence: SourceBackedFlowMapPersistenceRecord | undefined;
    if (persistenceRaw !== null) {
      for (const flowSlug of flowSlugs) {
        const parsed = parseSavedPlanEditorMapPersistence(
          persistenceRaw,
          keyMapId,
          flowSlug,
        );
        if (!parsed) return internalFail('malformed-map-persistence');
        persistence = parsed.record;
      }
      if (!persistence) return internalFail('malformed-map-persistence');
      const pairError = validateMapPersistencePair(snapshot, persistence);
      if (pairError) return internalFail(pairError);
    }

    mapIds.add(keyMapId);
    maps.push({ snapshot, ...(persistence ? { persistence } : {}) });
  }

  for (const key of keys.filter((candidate) => (
    candidate.startsWith(SAVED_FLOW_MAP_PERSISTENCE_KEY_PREFIX)
  ))) {
    const mapId = key.slice(SAVED_FLOW_MAP_PERSISTENCE_KEY_PREFIX.length);
    if (!mapIds.has(mapId)) return internalFail('orphan-map-persistence');
  }
  return { ok: true, value: maps };
}

function hasValidDraftValueShape(value: unknown): boolean {
  if (!isValidPublicFlowItemDraftRecord(value)) return false;
  return Object.values(value).every((candidate) => {
    if (!isRecord(candidate)) return false;
    if (hasOwn(candidate, 'title') && typeof candidate.title !== 'string') return false;
    if (hasOwn(candidate, 'memo') && typeof candidate.memo !== 'string') return false;
    if (hasOwn(candidate, 'date')) {
      if (typeof candidate.date !== 'string') return false;
      if (candidate.date.trim() && !isPersonalWorkspacePocDate(candidate.date.trim())) return false;
    }
    return true;
  });
}

function hasValidDateOverrideShape(value: unknown): boolean {
  if (!isValidPublicFlowDateOverrideRecord(value)) return false;
  return Object.values(value).every((candidate) => {
    const normalized = candidate.trim();
    return !normalized
      || normalized === MY_FLOW_DATE_REMOVED_OVERRIDE
      || isPersonalWorkspacePocDate(normalized);
  });
}

function preflightProjectionStorage(
  storage: PersonalWorkspacePocReadStorage,
): InternalResult<undefined> {
  const drafts = readPublicFlowSaveJsonRecord(storage, MY_FLOW_ITEM_DRAFTS_STORAGE_KEY);
  if (!drafts.ok || !hasValidDraftValueShape(drafts.value)) {
    return internalFail('malformed-item-drafts');
  }
  const dates = readPublicFlowSaveJsonRecord(storage, MY_FLOW_DATE_OVERRIDES_STORAGE_KEY);
  if (!dates.ok || !hasValidDateOverrideShape(dates.value)) {
    return internalFail('malformed-date-overrides');
  }
  return { ok: true, value: undefined };
}

function readProjectionValues(
  storage: PersonalWorkspacePocReadStorage,
  flowSlug: string,
  itemIds: string[],
): InternalResult<ProjectionValues> {
  try {
    const projected = readProjectionIdentityStorage(storage, {
      flowId: flowSlug,
      itemIds,
      itemDraftStorageKey: MY_FLOW_ITEM_DRAFTS_STORAGE_KEY,
      dateOverrideStorageKey: MY_FLOW_DATE_OVERRIDES_STORAGE_KEY,
    });
    if (projected.source === 'malformed_preserved') {
      return internalFail('malformed-projection-identity-storage');
    }
    if (
      !hasValidDraftValueShape(projected.itemDrafts)
      || !hasValidDateOverrideShape(projected.dateOverrides)
    ) return internalFail('malformed-projection-identity-values');
    return {
      ok: true,
      value: {
        itemDrafts: projected.itemDrafts as Record<string, StoredMyFlowItemDraft>,
        dateOverrides: projected.dateOverrides as Record<string, string>,
      },
    };
  } catch {
    return internalFail('projection-identity-read-failed');
  }
}

function readStrictStructuralOverlay(
  storage: PersonalWorkspacePocReadStorage,
  savedCopyId: string,
  flowId: string,
): InternalResult<PersonalStructuralOverlay | undefined> {
  let raw: string | null;
  try {
    raw = storage.getItem(getPersonalStructuralOverlayStorageKey(savedCopyId));
  } catch {
    return internalFail('structural-overlay-read-failed');
  }
  if (raw === null) return { ok: true, value: undefined };

  try {
    const rawValue: unknown = JSON.parse(raw);
    const overlay = normalizePersonalStructuralOverlay(rawValue, { savedCopyId, flowId });
    if (!overlay) return internalFail('malformed-structural-overlay');
    mergeSavedPlanEditorPersonalStructuralOverlayRaw(rawValue, overlay);
    return { ok: true, value: overlay };
  } catch {
    return internalFail('malformed-structural-overlay');
  }
}

function findBundleForRecord(
  bundles: readonly FlowBundle[],
  record: SavedFlowRecord,
): FlowBundle | undefined {
  const sourceSlug = record.sourceFlowSlug?.trim();
  const sourceFlowKey = record.sourceFlowKey?.trim();
  return bundles.find((bundle) => (
    (sourceSlug && bundle.flow.slug === sourceSlug)
    || (sourceFlowKey && bundle.flow.id === sourceFlowKey)
    || bundle.flow.slug === record.slug
  ));
}

function addPlainDays(anchor: string | undefined, offset: number | undefined): string | undefined {
  if (!isPersonalWorkspacePocDate(anchor) || !Number.isFinite(offset)) return undefined;
  const [year, month, day] = anchor.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + Number(offset)));
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function timingLabel(offset: number | undefined): string | undefined {
  if (!Number.isFinite(offset)) return undefined;
  if (offset === 0) return 'D-Day';
  return Number(offset) > 0 ? `D+${offset}` : `D${offset}`;
}

function resolveStructuralScheduleDate(
  schedule: PersonalStructuralSchedule | undefined,
  anchorDate: string | undefined,
): string | undefined {
  if (!schedule) return undefined;
  return schedule.mode === 'fixed_date'
    ? schedule.date
    : addPlainDays(anchorDate, schedule.dayOffset);
}

function toProjectableItems(bundle: FlowBundle): InternalResult<ProjectableItem[]> {
  const sourceItems: ProjectableItem[] = bundle.flow.content_type === 'meal_plan'
    ? (bundle.mealSlots ?? []).map((slot) => ({
        id: slot.id,
        title: slot.menu_title,
        description: slot.new_ingredients.join(', '),
        sectionId: slot.section_id,
        order: slot.order,
        dayOffset: slot.day_offset,
      }))
    : bundle.items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        sectionId: item.section_id,
        order: item.order,
        dayOffset: item.day_offset,
      }));
  const ids = new Set<string>();
  for (const item of sourceItems) {
    if (
      !item.id.trim()
      || !item.title.trim()
      || !Number.isFinite(item.order)
      || (item.dayOffset !== undefined && !Number.isFinite(item.dayOffset))
      || ids.has(item.id)
    ) return internalFail('malformed-flow-bundle-projection');
    ids.add(item.id);
  }
  return { ok: true, value: sourceItems };
}

function projectFlowSections(
  bundle: FlowBundle,
  options: Readonly<{
    editable: boolean;
    titleOwner: PersonalWorkspacePocFlowSection['titleOwner'];
  }>,
): InternalResult<PersonalWorkspacePocFlowSection[]> {
  const ids = new Set<string>();
  const sections: PersonalWorkspacePocFlowSection[] = [];
  for (const section of bundle.sections) {
    const sectionId = section.id.trim();
    const title = section.title.trim();
    if (!sectionId
      || sectionId !== section.id
      || !title
      || title !== section.title
      || !Number.isSafeInteger(section.order)
      || section.order < 0
      || ids.has(sectionId)) {
      return internalFail('malformed-flow-section-catalog');
    }
    ids.add(sectionId);
    sections.push({
      sectionId,
      title,
      sourceOrder: section.order,
      titleOwner: options.titleOwner,
      editCapability: options.editable ? 'poc-shadow' : 'read-only',
    });
  }
  return {
    ok: true,
    value: sections.sort((left, right) => (
      left.sourceOrder - right.sourceOrder
      || left.sectionId.localeCompare(right.sectionId)
    )),
  };
}

function mergeItemDrafts(
  values: ProjectionValues,
  flowSlug: string,
  itemId: string,
  sourceDate?: string,
): StoredMyFlowItemDraft {
  const canonicalKey = getPersonalDraftProjectionValueKey(flowSlug, itemId);
  const dateScopedKey = getMyFlowDateOverrideKey(flowSlug, itemId, sourceDate);
  return {
    ...(values.itemDrafts[canonicalKey] ?? {}),
    ...(values.itemDrafts[dateScopedKey] ?? {}),
  };
}

function resolveProjectedDate(options: {
  flowSlug: string;
  itemId: string;
  sourceDate?: string;
  values: ProjectionValues;
  draft: StoredMyFlowItemDraft;
  personalCopyDate?: string;
  personalCopyProvenance?: PersonalWorkspacePocFieldProvenance;
  sourceOwner?: PersonalWorkspacePocFieldOwner;
  sourceProvenance?: PersonalWorkspacePocFieldProvenance;
}): InternalResult<ProjectedDate> {
  const valueKey = getPersonalDraftProjectionValueKey(options.flowSlug, options.itemId);
  const dateKey = getMyFlowDateOverrideKey(
    options.flowSlug,
    options.itemId,
    options.sourceDate,
  );
  const storedExecutionDate = options.values.dateOverrides[dateKey]
    ?? options.values.dateOverrides[valueKey];
  const dateOverrides = storedExecutionDate !== undefined
    ? { [dateKey]: storedExecutionDate }
    : hasOwn(options.draft, 'date') && !options.draft.date?.trim()
      ? { [dateKey]: MY_FLOW_DATE_REMOVED_OVERRIDE }
      : undefined;
  const resolved = resolveMyFlowEffectiveDate({
    flowSlug: options.flowSlug,
    itemId: options.itemId,
    sourceDate: options.sourceDate,
    ...(dateOverrides ? { dateOverrides } : {}),
    ...(options.draft.date?.trim() ? { draftDateOverride: options.draft.date.trim() } : {}),
    ...(options.personalCopyDate ? { personalCopyDateOverride: options.personalCopyDate } : {}),
  });
  if (resolved.date && !isPersonalWorkspacePocDate(resolved.date)) {
    return internalFail('invalid-effective-item-date');
  }
  const draftRemovesDate = hasOwn(options.draft, 'date') && !options.draft.date?.trim();
  const provenance: PersonalWorkspacePocFieldProvenance =
    storedExecutionDate?.trim() === MY_FLOW_DATE_REMOVED_OVERRIDE
    || (storedExecutionDate?.trim() && isPersonalWorkspacePocDate(storedExecutionDate.trim()))
      ? 'my-flow-date-override'
      : draftRemovesDate || resolved.source === 'draft'
        ? 'my-flow-item-draft'
        : resolved.source === 'personal_copy'
          ? options.personalCopyProvenance ?? 'map-personal-copy'
          : resolved.source === 'source'
            ? options.sourceProvenance ?? 'derived-anchor-offset'
            : 'none';
  const owner: PersonalWorkspacePocFieldOwner =
    provenance === 'none'
      ? 'none'
      : provenance === 'derived-anchor-offset'
        ? 'derived'
      : resolved.source === 'source'
        ? options.sourceOwner ?? 'source'
        : 'existing-personal';
  return {
    ok: true,
    value: {
      ...(resolved.date ? { value: resolved.date } : {}),
      owner,
      provenance,
    },
  };
}

function projectStructuralDraft(options: {
  storage: PersonalWorkspacePocReadStorage;
  candidate: Candidate;
  bundle: FlowBundle;
  savedCopyId: string;
  anchorDate?: string;
  anchorInput?: OwnedFieldInput<string>;
  structuralOverlay?: PersonalStructuralOverlay;
}): InternalResult<PersonalWorkspacePocFlowItem[]> {
  const overlay = options.structuralOverlay ?? createPersonalDraftStructuralOverlay(options.bundle);
  const itemIds = [
    ...options.bundle.items.map((item) => item.id),
    ...overlay.userItems.map((item) => item.itemId),
  ];
  const valuesResult = readProjectionValues(options.storage, options.candidate.flowSlug, itemIds);
  if (!valuesResult.ok) return internalFail(valuesResult.reason);
  const values = valuesResult.value;
  const structuralDateOverrides = Object.fromEntries(
    Object.entries(values.dateOverrides).map(([key, value]) => [
      key,
      value === MY_FLOW_DATE_REMOVED_OVERRIDE ? '' : value,
    ]),
  );
  const projection = buildPersonalDraftStructuralProjection({
    bundle: options.bundle,
    structuralOverlay: overlay,
    valueOverlays: buildPersonalDraftProjectionValueOverlays({
      flowSlug: options.candidate.flowSlug,
      sourceItemIds: options.bundle.items.map((item) => item.id),
      structuralOverlay: overlay,
      itemDrafts: values.itemDrafts,
      dateOverrides: structuralDateOverrides,
    }),
    anchorDate: options.anchorDate,
  });
  if (!projection) return internalFail('personal-draft-structural-projection-failed');
  if (projection.warnings.some((warning) => (
    warning.startsWith('duplicate_')
    || warning.startsWith('personal_item_collides_')
    || warning.startsWith('unknown_order_item:')
    || warning.startsWith('tombstone_ownership_mismatch:')
  ))) return internalFail('personal-draft-structural-identity-conflict');

  const sections = new Map(options.bundle.sections.map((section) => [section.id, section.title]));
  const refs = new Set<string>();
  const items: PersonalWorkspacePocFlowItem[] = [];
  for (const row of projection.effectiveRows) {
    const source = row.sourceItem?.source;
    const sourceSchedule = row.sourceItem
      ? scheduleInput({
          schedule: row.sourceItem.schedule,
          owner: 'source',
          provenance: 'flow-bundle',
        })
      : noneSchedule();
    const existingPersonalSchedule = row.userItem
      ? scheduleInput({
          schedule: row.userItem.schedule,
          owner: 'existing-personal',
          provenance: 'personal-structural-overlay',
        })
      : noneSchedule();
    const sourceScheduleDate = resolveStructuralScheduleDate(
      row.sourceItem?.schedule,
      options.anchorDate,
    );
    const structuralPersonalDate = resolveStructuralScheduleDate(
      row.userItem?.schedule,
      options.anchorDate,
    );
    const draft = mergeItemDrafts(
      values,
      options.candidate.flowSlug,
      row.itemId,
      sourceScheduleDate,
    );
    const dateResult = resolveProjectedDate({
      flowSlug: options.candidate.flowSlug,
      itemId: row.itemId,
      sourceDate: sourceScheduleDate,
      values,
      draft,
      ...(structuralPersonalDate
        ? {
            personalCopyDate: structuralPersonalDate,
            personalCopyProvenance: 'personal-structural-overlay' as const,
          }
        : {}),
      sourceProvenance: sourceSchedule.mode === 'day-offset'
        ? 'derived-anchor-offset'
        : sourceSchedule.provenance,
    });
    if (!dateResult.ok) return internalFail(dateResult.reason);
    const ref = toPersonalWorkspacePocFlowItemRef(
      options.savedCopyId,
      options.bundle.flow.id,
      row.itemId,
    );
    if (refs.has(ref) || !row.title.trim()) {
      return internalFail('duplicate-item-identity');
    }
    refs.add(ref);
    const description = row.personalMemo || source?.description;
    const personalTitle = draft.title?.trim()
      ? {
          value: row.title,
          owner: 'existing-personal' as const,
          provenance: 'my-flow-item-draft' as const,
        }
      : row.userItem
        ? {
            value: row.title,
            owner: 'existing-personal' as const,
            provenance: 'personal-structural-overlay' as const,
          }
        : undefined;
    const personalDescription = row.personalMemo
      ? {
          value: row.personalMemo,
          owner: 'existing-personal' as const,
          provenance: draft.memo?.trim()
            ? 'my-flow-item-draft' as const
            : 'personal-structural-overlay' as const,
        }
      : undefined;
    const personalOrder = row.userItem || overlay.orderOverride.includes(row.itemId)
      ? {
          value: row.personalOrderRank,
          owner: 'existing-personal' as const,
          provenance: 'personal-structural-overlay' as const,
        }
      : undefined;
    const dateOwnership = buildDateFieldOwnership({
      sourceSchedule,
      existingPersonalSchedule,
      ...(options.anchorInput ? { anchorInput: options.anchorInput } : {}),
      effectiveDate: dateResult.value,
    });
    const fieldOwnership: PersonalWorkspacePocFlowItemFieldOwnership = {
      title: fieldLayers({
        ...(row.sourceItem
          ? {
              source: {
                value: row.sourceItem.title,
                owner: 'source' as const,
                provenance: 'flow-bundle' as const,
              },
            }
          : {}),
        ...(personalTitle ? { existingPersonal: personalTitle } : {}),
        effective: personalTitle ?? {
          value: row.title,
          owner: row.sourceItem ? 'source' as const : 'existing-personal' as const,
          provenance: row.sourceItem
            ? 'flow-bundle' as const
            : 'personal-structural-overlay' as const,
        },
      }),
      description: fieldLayers({
        ...(row.sourceItem
          ? {
              source: {
                ...(source?.description !== undefined ? { value: source.description } : {}),
                owner: 'source' as const,
                provenance: 'flow-bundle' as const,
              },
            }
          : {}),
        ...(personalDescription ? { existingPersonal: personalDescription } : {}),
        ...(description !== undefined
          ? {
              effective: personalDescription ?? {
                value: description,
                owner: 'source' as const,
                provenance: 'flow-bundle' as const,
              },
            }
          : {}),
      }),
      order: fieldLayers({
        ...(row.sourceItem
          ? {
              source: {
                value: row.sourceItem.order,
                owner: 'source' as const,
                provenance: 'flow-bundle' as const,
              },
            }
          : {}),
        ...(personalOrder ? { existingPersonal: personalOrder } : {}),
        effective: personalOrder ?? {
          value: row.personalOrderRank,
          owner: 'source' as const,
          provenance: 'flow-bundle' as const,
        },
      }),
      ...dateOwnership,
    };
    if (source?.section_id && !sections.has(source.section_id)) {
      return internalFail('unknown-flow-section-reference');
    }
    items.push({
      ref,
      savedCopyId: options.savedCopyId,
      flowId: options.bundle.flow.id,
      itemId: row.itemId,
      title: row.title,
      ...(description ? { description } : {}),
      ...(source?.section_id && sections.get(source.section_id)
        ? { sectionId: source.section_id, sectionTitle: sections.get(source.section_id) }
        : row.ownership === 'user_created'
          ? { sectionTitle: '내가 추가한 할 일' }
          : {}),
      sourceOrder: row.personalOrderRank,
      ...(dateResult.value.value ? { sourceDate: dateResult.value.value } : {}),
      ...(row.schedule?.mode === 'anchor_offset'
        ? { sourceTimingLabel: timingLabel(row.schedule.dayOffset) }
        : {}),
      fieldOwnership,
    });
  }
  return { ok: true, value: items };
}

function projectRegularItems(options: {
  storage: PersonalWorkspacePocReadStorage;
  candidate: Candidate;
  sourceBundle: FlowBundle;
  sourceProvenance: Extract<
    PersonalWorkspacePocFieldProvenance,
    'flow-bundle' | 'saved-map-persistence'
  >;
  bundle: FlowBundle;
  savedCopyId: string;
  anchorDate?: string;
  anchorInput?: OwnedFieldInput<string>;
}): InternalResult<PersonalWorkspacePocFlowItem[]> {
  const sourceResult = toProjectableItems(options.bundle);
  if (!sourceResult.ok) return internalFail(sourceResult.reason);
  let sourceItems = sourceResult.value;
  const sourceOwnedResult = toProjectableItems(options.sourceBundle);
  if (!sourceOwnedResult.ok) return internalFail(sourceOwnedResult.reason);
  const sourceOwnedItems = new Map(sourceOwnedResult.value.map((item) => [item.id, item]));
  const personalCopy = options.candidate.savedMap?.snapshot.personalCopy;
  const includedIds = personalCopy?.includedStepIdsByFlow[options.candidate.flowSlug];
  const excludedIds = new Set(
    personalCopy?.excludedStepIdsByFlow[options.candidate.flowSlug] ?? [],
  );
  if (includedIds) {
    const availableIds = new Set(sourceItems.map((item) => item.id));
    if (includedIds.some((itemId) => !availableIds.has(itemId))) {
      return internalFail('map-personal-copy-item-mismatch');
    }
    const included = new Set(includedIds);
    sourceItems = sourceItems.filter((item) => included.has(item.id) && !excludedIds.has(item.id));
  } else if (excludedIds.size > 0) {
    sourceItems = sourceItems.filter((item) => !excludedIds.has(item.id));
  }

  const valuesResult = readProjectionValues(
    options.storage,
    options.candidate.flowSlug,
    sourceItems.map((item) => item.id),
  );
  if (!valuesResult.ok) return internalFail(valuesResult.reason);
  const values = valuesResult.value;
  const sections = new Map(options.bundle.sections.map((section) => [section.id, section.title]));
  const refs = new Set<string>();
  const items: PersonalWorkspacePocFlowItem[] = [];
  for (const item of sourceItems) {
    const sourceOwnedItem = sourceOwnedItems.get(item.id) ?? item;
    const sourceSchedule = sourceScheduleForRegularItem({
      candidate: options.candidate,
      item: sourceOwnedItem,
      provenance: options.sourceProvenance,
    });
    const sourceDate = sourceSchedule.mode === 'absolute'
      ? sourceSchedule.date
      : sourceSchedule.mode === 'day-offset'
        ? addPlainDays(options.anchorDate, sourceSchedule.dayOffset)
        : undefined;
    const draft = mergeItemDrafts(
      values,
      options.candidate.flowSlug,
      item.id,
      sourceDate,
    );
    const personalOverride = personalCopy?.stepOverridesByFlow?.[options.candidate.flowSlug]?.[item.id];
    const dateResult = resolveProjectedDate({
      flowSlug: options.candidate.flowSlug,
      itemId: item.id,
      sourceDate,
      values,
      draft,
      personalCopyDate: personalOverride?.schedule?.date,
      sourceProvenance: sourceSchedule.mode === 'day-offset'
        ? 'derived-anchor-offset'
        : sourceSchedule.provenance,
    });
    if (!dateResult.ok) return internalFail(dateResult.reason);
    const title = personalOverride?.title?.trim() || draft.title?.trim() || item.title.trim();
    if (!title) return internalFail('invalid-effective-item-title');
    const ref = toPersonalWorkspacePocFlowItemRef(
      options.savedCopyId,
      options.bundle.flow.id,
      item.id,
    );
    if (refs.has(ref)) return internalFail('duplicate-item-identity');
    refs.add(ref);
    const description = personalOverride?.userMemo?.trim()
      || draft.memo?.trim()
      || item.description?.trim();
    const personalTitle = personalOverride?.title?.trim()
      ? {
          value: title,
          owner: 'existing-personal' as const,
          provenance: 'map-personal-copy' as const,
        }
      : draft.title?.trim()
        ? {
            value: title,
            owner: 'existing-personal' as const,
            provenance: 'my-flow-item-draft' as const,
          }
        : undefined;
    const personalDescription = personalOverride?.userMemo?.trim()
      ? {
          value: description,
          owner: 'existing-personal' as const,
          provenance: 'map-personal-copy' as const,
        }
      : draft.memo?.trim()
        ? {
            value: description,
            owner: 'existing-personal' as const,
            provenance: 'my-flow-item-draft' as const,
          }
        : undefined;
    const existingPersonalSchedule = personalOverride?.schedule?.date
      ? absolutePersonalSchedule(personalOverride.schedule.date, 'map-personal-copy')
      : noneSchedule();
    const dateOwnership = buildDateFieldOwnership({
      sourceSchedule,
      existingPersonalSchedule,
      ...(options.anchorInput ? { anchorInput: options.anchorInput } : {}),
      effectiveDate: dateResult.value,
    });
    const fieldOwnership: PersonalWorkspacePocFlowItemFieldOwnership = {
      title: fieldLayers({
        source: {
          value: sourceOwnedItem.title,
          owner: 'source',
          provenance: options.sourceProvenance,
        },
        ...(personalTitle ? { existingPersonal: personalTitle } : {}),
        effective: personalTitle ?? {
          value: title,
          owner: 'source',
          provenance: options.sourceProvenance,
        },
      }),
      description: fieldLayers({
        source: {
          ...(sourceOwnedItem.description !== undefined
            ? { value: sourceOwnedItem.description }
            : {}),
          owner: 'source',
          provenance: options.sourceProvenance,
        },
        ...(personalDescription ? { existingPersonal: personalDescription } : {}),
        ...(description
          ? {
              effective: personalDescription ?? {
                value: description,
                owner: 'source' as const,
                provenance: options.sourceProvenance,
              },
            }
          : {}),
      }),
      order: fieldLayers({
        source: {
          value: sourceOwnedItem.order,
          owner: 'source',
          provenance: options.sourceProvenance,
        },
        effective: {
          value: item.order,
          owner: 'source',
          provenance: options.sourceProvenance,
        },
      }),
      ...dateOwnership,
    };
    if (item.sectionId && !sections.has(item.sectionId)) {
      return internalFail('unknown-flow-section-reference');
    }
    items.push({
      ref,
      savedCopyId: options.savedCopyId,
      flowId: options.bundle.flow.id,
      itemId: item.id,
      title,
      ...(description ? { description } : {}),
      ...(item.sectionId && sections.get(item.sectionId)
        ? { sectionId: item.sectionId, sectionTitle: sections.get(item.sectionId) }
        : {}),
      sourceOrder: item.order,
      ...(dateResult.value.value ? { sourceDate: dateResult.value.value } : {}),
      ...(timingLabel(item.dayOffset) ? { sourceTimingLabel: timingLabel(item.dayOffset) } : {}),
      fieldOwnership,
    });
  }
  return { ok: true, value: items.sort((left, right) => left.sourceOrder - right.sourceOrder) };
}

function projectCandidate(
  storage: PersonalWorkspacePocReadStorage,
  candidate: Candidate,
): InternalResult<PersonalWorkspacePocFlow> {
  const origin = classifySavedPlanEditorOrigin({
    flowSlug: candidate.flowSlug,
    bundleFlowSlug: candidate.bundle.flow.slug,
    bundleStatus: candidate.bundle.flow.status,
    ...(candidate.savedMap ? { savedMap: candidate.savedMap.snapshot } : {}),
    ...(candidate.savedRecord ? { savedRecord: candidate.savedRecord.rawValue } : {}),
  });
  if (!isSupportedSavedPlanEditorOrigin(origin)) {
    return internalFail(`unsupported-saved-plan-origin:${origin.reason}`);
  }

  const savedCopyId = candidate.savedRecord?.record.personalCopyKey
    ?? candidate.savedRecord?.record.slug
    ?? candidate.flowSlug;
  const flowId = candidate.bundle.flow.id;
  if (
    candidate.savedMap?.snapshot.anchor
    && candidate.savedRecord?.record.anchor
    && candidate.savedMap.snapshot.anchor !== candidate.savedRecord.record.anchor
  ) return internalFail('map-child-anchor-mismatch');
  const anchorDate = candidate.savedMap?.snapshot.anchor ?? candidate.savedRecord?.record.anchor;
  const validAnchorDate = isPersonalWorkspacePocDate(anchorDate) ? anchorDate : undefined;
  const anchorInput: OwnedFieldInput<string> | undefined = validAnchorDate
    ? {
        value: validAnchorDate,
        owner: 'existing-personal',
        provenance: candidate.savedMap ? 'saved-map-snapshot' : 'saved-record',
      }
    : undefined;
  let sourceBundle = candidate.bundle;
  let effectiveBundle = candidate.bundle;
  const persistedMapChild = candidate.savedMap?.persistence?.childFlows.find((child) => (
    child.slug === candidate.flowSlug
  ));
  if (candidate.savedMap) {
    if (persistedMapChild && persistedMapChild.flowId !== flowId) {
      return internalFail('map-bundle-flow-id-mismatch');
    }
    sourceBundle = applySourceBackedPersistenceRecordToBundle(
      candidate.bundle,
      candidate.savedMap.persistence,
    );
    effectiveBundle = applySourceBackedPersistenceRecordToBundle(
      candidate.bundle,
      candidate.savedMap.persistence,
      candidate.savedMap.snapshot.personalCopy,
    );
  }

  let itemsResult: InternalResult<PersonalWorkspacePocFlowItem[]>;
  const structuralOverlayResult = origin.kind === 'personal-draft'
    ? readStrictStructuralOverlay(storage, savedCopyId, flowId)
    : { ok: true as const, value: undefined };
  if (!structuralOverlayResult.ok) return internalFail(structuralOverlayResult.reason);
  if (origin.kind === 'personal-draft' && structuralOverlayResult.value) {
    if (!isPersonalDraftStructuralEditEligible(effectiveBundle)) {
      return internalFail('structural-overlay-not-supported-for-origin');
    }
  }
  if (origin.kind === 'personal-draft' && isPersonalDraftStructuralEditEligible(effectiveBundle)) {
    itemsResult = projectStructuralDraft({
      storage,
      candidate,
      bundle: effectiveBundle,
      savedCopyId,
      anchorDate,
      ...(anchorInput ? { anchorInput } : {}),
      structuralOverlay: structuralOverlayResult.value,
    });
  } else {
    itemsResult = projectRegularItems({
      storage,
      candidate,
      sourceBundle,
      sourceProvenance: candidate.savedMap?.persistence
        ? 'saved-map-persistence'
        : 'flow-bundle',
      bundle: effectiveBundle,
      savedCopyId,
      anchorDate,
      ...(anchorInput ? { anchorInput } : {}),
    });
  }
  if (!itemsResult.ok) return internalFail(itemsResult.reason);

  const personalDraftOwnsSections = origin.kind === 'personal-draft'
    && isPersonalDraftStructuralEditEligible(effectiveBundle);
  const sectionsResult = projectFlowSections(effectiveBundle, {
    editable: personalDraftOwnsSections,
    titleOwner: personalDraftOwnsSections ? 'existing-personal' : 'source',
  });
  if (!sectionsResult.ok) return internalFail(sectionsResult.reason);

  const personalTitle = candidate.savedRecord?.record.personalTitle
    ? {
        value: candidate.savedRecord.record.personalTitle,
        owner: 'existing-personal' as const,
        provenance: 'saved-record' as const,
      }
    : undefined;
  const effectiveTitle = candidate.savedRecord?.record.personalTitle ?? effectiveBundle.flow.title;
  const personalAnchor = anchorInput;
  const fieldOwnership: PersonalWorkspacePocFlowFieldOwnership = {
    title: fieldLayers({
      source: {
        value: candidate.bundle.flow.title,
        owner: 'source',
        provenance: 'flow-bundle',
      },
      ...(personalTitle ? { existingPersonal: personalTitle } : {}),
      effective: personalTitle ?? {
        value: effectiveTitle,
        owner: 'source',
        provenance: 'flow-bundle',
      },
    }),
    anchorDate: fieldLayers({
      ...(personalAnchor ? { existingPersonal: personalAnchor, effective: personalAnchor } : {}),
    }),
  };
  const sourceTitle = candidate.bundle.flow.source_title
    ?? persistedMapChild?.sourceTitle
    ?? candidate.savedMap?.persistence?.map.sourceTitle;
  const sourceUrls = [
    candidate.bundle.flow.source_url,
    persistedMapChild?.sourceUrl,
    candidate.savedMap?.persistence?.map.sourceUrl,
  ].reduce<string[]>((values, value) => {
    const normalized = value?.trim();
    if (normalized && !values.includes(normalized)) values.push(normalized);
    return values;
  }, []);
  const mapChildOrder = candidate.savedMap
    ? candidate.savedMap.snapshot.flowSlugs.indexOf(candidate.flowSlug)
    : -1;
  if (candidate.savedMap && mapChildOrder < 0) {
    return internalFail('map-child-order-mismatch');
  }
  const presentation: PersonalWorkspacePocFlowPresentation = {
    ...(sourceTitle || sourceUrls.length > 0
      ? {
          discovery: {
            ...(sourceTitle ? { sourceTitle } : {}),
            sourceUrls,
          },
        }
      : {}),
    ...(candidate.savedMap
      ? {
          mapGroup: {
            groupRef: toPersonalWorkspacePocMapGroupRef(candidate.savedMap.snapshot.mapId),
            ownerId: candidate.savedMap.snapshot.mapId,
            title: candidate.savedMap.snapshot.title,
            childOrder: mapChildOrder,
            childCount: candidate.savedMap.snapshot.flowSlugs.length,
            executionState: candidate.savedMap.persistence?.readiness.content
              === 'needs_creator_review'
              ? 'review-hold' as const
              : 'executable' as const,
            reviewReasons: candidate.savedMap.persistence?.readiness.reasons ?? [],
          },
        }
      : {}),
  };

  return {
    ok: true,
    value: {
      ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId),
      savedCopyId,
      flowId,
      sourceSlug: candidate.bundle.flow.slug,
      title: effectiveTitle,
      origin: origin.kind,
      ...(validAnchorDate ? { anchorDate: validAnchorDate } : {}),
      fieldOwnership,
      ...(presentation.discovery || presentation.mapGroup ? { presentation } : {}),
      sections: sectionsResult.value,
      items: itemsResult.value,
    },
  };
}

export function buildPersonalWorkspacePocReadModel(
  storage: PersonalWorkspacePocReadStorage,
  bundles: readonly FlowBundle[],
): PersonalWorkspacePocReadResult {
  const bundlePreflight = preflightBundleRegistry(storage);
  if (!bundlePreflight.ok) return fail(bundlePreflight.reason);
  const projectionPreflight = preflightProjectionStorage(storage);
  if (!projectionPreflight.ok) return fail(projectionPreflight.reason);
  const keys = listStorageKeys(storage);
  if (!keys) return fail('storage-enumeration-failed');
  const recordsResult = parseStrictSavedRecords(storage, keys);
  if (!recordsResult.ok) return fail(recordsResult.reason);
  const mapsResult = parseStrictSavedMaps(storage, keys);
  if (!mapsResult.ok) return fail(mapsResult.reason);
  const records = recordsResult.value;
  const maps = mapsResult.value;

  const candidates: Candidate[] = [];
  const consumedRecords = new Set<string>();
  const mapOwnerByFlow = new Map<string, string>();
  for (const map of maps) {
    for (const flowSlug of map.snapshot.flowSlugs) {
      if (mapOwnerByFlow.has(flowSlug)) return fail('duplicate-map-flow-owner');
      mapOwnerByFlow.set(flowSlug, map.snapshot.mapId);
      const bundle = bundles.find((candidate) => candidate.flow.slug === flowSlug);
      if (!bundle) return fail('missing-map-flow-bundle');
      const savedRecord = records.get(flowSlug);
      if (savedRecord) consumedRecords.add(savedRecord.record.slug);
      candidates.push({
        flowSlug,
        bundle,
        savedMap: map,
        ...(savedRecord ? { savedRecord } : {}),
      });
    }
  }

  for (const savedRecord of records.values()) {
    if (consumedRecords.has(savedRecord.record.slug)) continue;
    const bundle = findBundleForRecord(bundles, savedRecord.record);
    if (!bundle) return fail('missing-saved-flow-bundle');
    candidates.push({ flowSlug: savedRecord.record.slug, bundle, savedRecord });
    consumedRecords.add(savedRecord.record.slug);
  }

  for (const bundle of bundles) {
    if (!bundle.flow.slug.startsWith('url-draft-') || bundle.flow.status !== 'draft') continue;
    if (candidates.some((candidate) => candidate.flowSlug === bundle.flow.slug)) continue;
    candidates.push({ flowSlug: bundle.flow.slug, bundle });
  }

  const flows: PersonalWorkspacePocFlow[] = [];
  const flowRefs = new Set<string>();
  const itemRefs = new Set<string>();
  for (const candidate of candidates) {
    const projected = projectCandidate(storage, candidate);
    if (!projected.ok) return fail(projected.reason);
    const flow = projected.value;
    if (flowRefs.has(flow.ref)) return fail('duplicate-flow-identity');
    flowRefs.add(flow.ref);
    for (const item of flow.items) {
      if (itemRefs.has(item.ref)) return fail('duplicate-item-identity');
      itemRefs.add(item.ref);
    }
    flows.push(flow);
  }

  flows.sort((left, right) => left.title.localeCompare(right.title, 'ko'));
  return { ok: true, model: { version: PERSONAL_WORKSPACE_POC_VERSION, flows } };
}
