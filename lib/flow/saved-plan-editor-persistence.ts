import {
  MY_FLOW_DATE_REMOVED_OVERRIDE,
  getMyFlowDateOverrideKey,
  type StoredMyFlowItemDraft,
} from './my-flow-personal-state';
import { getPersonalDraftProjectionValueKey } from './personal-draft-projection-state';
import {
  normalizePersonalStructuralOverlay,
  type PersonalStructuralOverlay,
} from './personal-structural-overlay';
import type { PublicItemPersonalization } from './public-item-personalization';
import {
  getSourceBackedFlowMapSnapshotStorageKey,
  type SourceBackedFlowMapChildBinding,
  type SourceBackedFlowMapPersonalCopy,
  type SourceBackedFlowMapPersonalCopyStepOverride,
  type SourceBackedFlowMapPersistenceRecord,
  type SourceBackedFlowMapSavedSnapshot,
  type SourceBackedFlowMapStepBinding,
} from './source-backed-my-flow';
import {
  normalizeSavedFlowMapSnapshot,
  normalizeSavedFlowRecord,
  type SavedFlowRecord,
} from './storage';

export type SavedPlanEditorPersistenceSource = Readonly<{
  itemId: string;
  date?: string;
  originalDate?: string;
  valueOwnerKey?: string;
  dateOwnerKey?: string;
  dateValueOwnerKeys?: readonly string[];
  ownership?: 'source' | 'user_created';
}>;

export type SavedPlanEditorSourceDateValueOwner =
  | 'item-draft'
  | 'external';

export type SavedPlanEditorUnscheduledDateOwner =
  | 'date-override'
  | 'item-draft';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isUniqueNonEmptyStringList(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every(isNonEmptyString)
    && new Set(value).size === value.length;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNonEmptyStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isStringListRecord(value: unknown): value is Record<string, string[]> {
  return isRecord(value) && Object.entries(value).every(([key, list]) => (
    isNonEmptyString(key) && isUniqueNonEmptyStringList(list)
  ));
}

function isOptionalKnownFieldValid(
  value: Record<string, unknown>,
  key: string,
  predicate: (candidate: unknown) => boolean,
): boolean {
  return !hasOwn(value, key) || predicate(value[key]);
}

const ANCHOR_TYPES = new Set(['start_date', 'end_date', 'baby_age_month', 'baby_birth_date', 'none']);
const CALENDAR_MODES = new Set(['absolute', 'anchor_offset', 'routine', 'none']);
const DESTINATIONS = new Set(['calendar', 'todo', 'checklist', 'sheet', 'memo', 'progress']);
const PRIMARY_DESTINATIONS = new Set(['calendar', 'sheet', 'memo', 'internal_check', 'hybrid']);
const RISK_LEVELS = new Set(['low', 'medium', 'medical_sensitive', 'financial_sensitive']);
const SOURCE_TYPES = new Set(['official', 'creator_experience', 'reference']);
const STRUCTURE_TYPES = new Set(['timeline', 'phase', 'routine', 'checklist']);

function isPlainIsoDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1])
    && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[3]);
}

function isValidCalendar(value: unknown): boolean {
  if (!isRecord(value) || typeof value.mode !== 'string' || !CALENDAR_MODES.has(value.mode)) return false;
  if (!isOptionalKnownFieldValid(value, 'anchorType', (candidate) => (
    typeof candidate === 'string' && ANCHOR_TYPES.has(candidate)
  ))) return false;
  if (!isOptionalKnownFieldValid(value, 'dayOffset', (candidate) => (
    typeof candidate === 'number' && Number.isInteger(candidate)
  ))) return false;
  if (!isOptionalKnownFieldValid(value, 'allDay', (candidate) => typeof candidate === 'boolean')) return false;
  if (!isOptionalKnownFieldValid(value, 'repeatRule', isNonEmptyString)) return false;
  if (!hasOwn(value, 'window')) return true;
  const window = value.window;
  return isRecord(window)
    && isNonEmptyString(window.label)
    && typeof window.startDayOffset === 'number'
    && Number.isInteger(window.startDayOffset)
    && typeof window.endDayOffset === 'number'
    && Number.isInteger(window.endDayOffset);
}

function isValidTextFallback(value: unknown): boolean {
  if (!isRecord(value) || typeof value.title !== 'string' || typeof value.description !== 'string') return false;
  return isOptionalKnownFieldValid(value, 'items', isStringList)
    && isOptionalKnownFieldValid(value, 'memoHint', (candidate) => typeof candidate === 'string')
    && isOptionalKnownFieldValid(value, 'url', (candidate) => typeof candidate === 'string')
    && isOptionalKnownFieldValid(value, 'doneWhen', (candidate) => typeof candidate === 'string');
}

function isValidStepBinding(value: unknown, expectedStepId?: string): value is SourceBackedFlowMapStepBinding {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.stepId)
    || (expectedStepId !== undefined && value.stepId !== expectedStepId)
    || !isNonEmptyString(value.title)
    || typeof value.destination !== 'string'
    || !DESTINATIONS.has(value.destination)
    || !isValidCalendar(value.calendar)
    || !isValidTextFallback(value.textFallback)
  ) return false;
  return isOptionalKnownFieldValid(value, 'sourceUrl', isNonEmptyString)
    && isOptionalKnownFieldValid(value, 'sourceType', (candidate) => (
      typeof candidate === 'string' && SOURCE_TYPES.has(candidate)
    ))
    && isOptionalKnownFieldValid(value, 'riskLevel', (candidate) => (
      typeof candidate === 'string' && RISK_LEVELS.has(candidate)
    ));
}

function isValidStepOverride(value: unknown): value is SourceBackedFlowMapPersonalCopyStepOverride {
  if (!isRecord(value)) return false;
  if (!isOptionalKnownFieldValid(value, 'title', isNonEmptyString)) return false;
  if (!isOptionalKnownFieldValid(value, 'userMemo', isNonEmptyString)) return false;
  if (hasOwn(value, 'schedule')) {
    const schedule = value.schedule;
    if (
      !isRecord(schedule)
      || schedule.mode !== 'fixed_date'
      || !isNonEmptyString(schedule.date)
      || !isPlainIsoDate(schedule.date)
    ) return false;
  }
  return hasOwn(value, 'title') || hasOwn(value, 'userMemo') || hasOwn(value, 'schedule');
}

function isValidNestedRecord(
  value: unknown,
  predicate: (candidate: unknown, key: string) => boolean,
): boolean {
  return isRecord(value) && Object.entries(value).every(([key, candidate]) => (
    isNonEmptyString(key) && predicate(candidate, key)
  ));
}

function isValidPersonalCopy(value: unknown): value is SourceBackedFlowMapPersonalCopy {
  if (
    !isRecord(value)
    || (value.source !== 'url_first_custom_start'
      && value.source !== 'version_review'
      && value.source !== 'personal_edit')
    || !isStringListRecord(value.includedStepIdsByFlow)
    || !isStringListRecord(value.excludedStepIdsByFlow)
  ) return false;
  if (!isOptionalKnownFieldValid(value, 'originalTitle', isNonEmptyString)) return false;
  const included = value.includedStepIdsByFlow as Record<string, string[]>;
  const excluded = value.excludedStepIdsByFlow as Record<string, string[]>;
  if (Object.keys(included).some((flowSlug) => {
    const excludedIds = new Set(excluded[flowSlug] ?? []);
    return included[flowSlug].some((stepId) => excludedIds.has(stepId));
  })) return false;
  if (hasOwn(value, 'stepOverridesByFlow') && !isValidNestedRecord(
    value.stepOverridesByFlow,
    (flowOverrides) => isValidNestedRecord(flowOverrides, isValidStepOverride),
  )) return false;
  if (hasOwn(value, 'retainedStepsByFlow') && !isValidNestedRecord(
    value.retainedStepsByFlow,
    (retainedSteps) => isValidNestedRecord(retainedSteps, (step, stepId) => isValidStepBinding(step, stepId)),
  )) return false;
  return true;
}

function isValidNumberRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.entries(value).every(([key, count]) => (
    isNonEmptyString(key) && isNonNegativeInteger(count)
  ));
}

function isValidRiskRecord(value: unknown): boolean {
  return isRecord(value) && Object.entries(value).every(([key, risk]) => (
    isNonEmptyString(key) && typeof risk === 'string' && RISK_LEVELS.has(risk)
  ));
}

function isValidStringRecord(value: unknown): boolean {
  return isRecord(value) && Object.entries(value).every(([key, item]) => (
    isNonEmptyString(key) && isNonEmptyString(item)
  ));
}

function isValidMapSnapshotRaw(
  value: Record<string, unknown>,
  mapId: string,
  flowSlug: string,
): boolean {
  if (
    !isNonEmptyString(mapId)
    || !isNonEmptyString(flowSlug)
    || !isNonEmptyString(value.mapId)
    || value.mapId !== mapId
    || !isNonEmptyString(value.title)
    || !isNonEmptyString(value.version)
    || !isNonEmptyString(value.savedAt)
    || !isUniqueNonEmptyStringList(value.flowSlugs)
    || !value.flowSlugs.includes(flowSlug)
  ) return false;
  if (!isOptionalKnownFieldValid(value, 'anchor', (candidate) => (
    isNonEmptyString(candidate) && isPlainIsoDate(candidate)
  ))) return false;
  if (!isOptionalKnownFieldValid(value, 'stepCountsByFlow', isValidNumberRecord)) return false;
  if (!isOptionalKnownFieldValid(value, 'riskLevelsByFlow', isValidRiskRecord)) return false;
  if (!isOptionalKnownFieldValid(value, 'sourceCheckedAtByFlow', isValidStringRecord)) return false;
  return !hasOwn(value, 'personalCopy') || isValidPersonalCopy(value.personalCopy);
}

function isValidChildBinding(value: unknown): value is SourceBackedFlowMapChildBinding {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.slug)
    || !isNonEmptyString(value.flowId)
    || !isNonEmptyString(value.title)
    || !isNonEmptyString(value.category)
    || typeof value.structureType !== 'string'
    || !STRUCTURE_TYPES.has(value.structureType)
    || typeof value.anchorType !== 'string'
    || !ANCHOR_TYPES.has(value.anchorType)
    || typeof value.primaryDestination !== 'string'
    || !PRIMARY_DESTINATIONS.has(value.primaryDestination)
    || !isNonNegativeInteger(value.stepCount)
    || !isNonNegativeInteger(value.itemFallbackCount)
    || !isUniqueNonEmptyStringList(value.stepIds)
    || !Array.isArray(value.steps)
    || value.steps.some((step) => !isValidStepBinding(step))
  ) return false;
  const expectedStepIds = value.stepIds as string[];
  if (value.steps.length !== expectedStepIds.length || value.stepCount !== value.steps.length) return false;
  const stepIds = value.steps.map((step) => (step as SourceBackedFlowMapStepBinding).stepId);
  if (new Set(stepIds).size !== stepIds.length || stepIds.some((stepId, index) => stepId !== expectedStepIds[index])) {
    return false;
  }
  const itemFallbackCount = value.steps.reduce((total, step) => (
    total + (isRecord(step.textFallback) && Array.isArray(step.textFallback.items)
      ? step.textFallback.items.length
      : 0)
  ), 0);
  if (value.itemFallbackCount !== itemFallbackCount) return false;
  return isOptionalKnownFieldValid(value, 'riskLevel', (candidate) => (
    typeof candidate === 'string' && RISK_LEVELS.has(candidate)
  ))
    && isOptionalKnownFieldValid(value, 'sourceTitle', isNonEmptyString)
    && isOptionalKnownFieldValid(value, 'sourceUrl', isNonEmptyString)
    && isOptionalKnownFieldValid(value, 'sourceCheckedAt', isNonEmptyString);
}

function isValidMapPersistenceRaw(
  value: Record<string, unknown>,
  mapId: string,
  flowSlug: string,
): value is Record<string, unknown> & SourceBackedFlowMapPersistenceRecord {
  if (
    !isNonEmptyString(mapId)
    || !isNonEmptyString(flowSlug)
    || value.schemaVersion !== 1
    || value.recordType !== 'saved_source_backed_flow_map'
    || value.bridgeStorageKey !== getSourceBackedFlowMapSnapshotStorageKey(mapId)
    || !isRecord(value.map)
    || !isNonEmptyString(value.map.id)
    || value.map.id !== mapId
    || !isNonEmptyString(value.map.title)
    || !isNonEmptyString(value.map.userLabel)
    || !isNonEmptyString(value.map.version)
    || !isNonEmptyString(value.map.updatedAt)
    || (value.map.updatePolicy !== 'auto_patch_when_safe' && value.map.updatePolicy !== 'review_before_apply')
    || !isNonEmptyString(value.map.sourceTitle)
    || !isNonEmptyString(value.map.sourceUrl)
    || !isRecord(value.saved)
    || !isNonEmptyString(value.saved.savedAt)
    || value.saved.sourceSurface !== 'public_save'
    || !isOptionalKnownFieldValid(value.saved, 'anchor', (candidate) => (
      isNonEmptyString(candidate) && isPlainIsoDate(candidate)
    ))
    || !isRecord(value.readiness)
    || (value.readiness.content !== 'ready_for_my_flow' && value.readiness.content !== 'needs_creator_review')
    || typeof value.readiness.update !== 'string'
    || !new Set(['up_to_date', 'map_missing', 'minor_update_available', 'review_before_apply']).has(value.readiness.update)
    || !isNonEmptyStringList(value.readiness.reasons)
    || !Array.isArray(value.childFlows)
    || value.childFlows.some((flow) => !isValidChildBinding(flow))
    || !isRecord(value.updateAssessment)
    || typeof value.updateAssessment.status !== 'string'
    || !new Set(['up_to_date', 'map_missing', 'minor_update_available', 'review_before_apply']).has(value.updateAssessment.status)
    || typeof value.updateAssessment.userAction !== 'string'
    || !new Set(['none', 'reconnect_source', 'review_changes']).has(value.updateAssessment.userAction)
    || typeof value.updateAssessment.canApplyAutomatically !== 'boolean'
    || !isNonEmptyString(value.updateAssessment.savedVersion)
    || !isOptionalKnownFieldValid(value.updateAssessment, 'currentVersion', isNonEmptyString)
    || !isNonEmptyStringList(value.updateAssessment.reasons)
    || !isUniqueNonEmptyStringList(value.updateAssessment.affectedFlows)
    || (hasOwn(value, 'personalCopy') && !isValidPersonalCopy(value.personalCopy))
  ) return false;

  const flows = value.childFlows as SourceBackedFlowMapChildBinding[];
  if (new Set(flows.map((flow) => flow.slug)).size !== flows.length) return false;
  if (new Set(flows.map((flow) => flow.flowId)).size !== flows.length) return false;
  return flows.filter((flow) => flow.slug === flowSlug).length === 1;
}

function mergeOptionalPersonalCopy(
  raw: unknown,
  next: SourceBackedFlowMapSavedSnapshot['personalCopy'],
): Record<string, unknown> | undefined {
  if (!next) return undefined;
  const merged: Record<string, unknown> = {
    ...(isRecord(raw) ? structuredClone(raw) : {}),
    ...structuredClone(next),
  };
  const rawCopy = isRecord(raw) ? raw : {};
  if (next.stepOverridesByFlow) {
    const rawFlows = isRecord(rawCopy.stepOverridesByFlow) ? rawCopy.stepOverridesByFlow : {};
    merged.stepOverridesByFlow = Object.fromEntries(
      Object.entries(next.stepOverridesByFlow).map(([flowSlug, nextOverrides]) => {
        const rawOverrides = isRecord(rawFlows[flowSlug]) ? rawFlows[flowSlug] : {};
        return [
          flowSlug,
          Object.fromEntries(Object.entries(nextOverrides).map(([stepId, nextOverride]) => {
            const rawOverride = isRecord(rawOverrides[stepId]) ? rawOverrides[stepId] : {};
            const override: Record<string, unknown> = {
              ...structuredClone(rawOverride),
              ...structuredClone(nextOverride),
            };
            if (nextOverride.schedule) {
              override.schedule = {
                ...(isRecord(rawOverride.schedule) ? structuredClone(rawOverride.schedule) : {}),
                ...structuredClone(nextOverride.schedule),
              };
            } else {
              delete override.schedule;
            }
            if (nextOverride.title === undefined) delete override.title;
            if (nextOverride.userMemo === undefined) delete override.userMemo;
            return [stepId, override];
          })),
        ];
      }),
    );
  }
  if (next.retainedStepsByFlow) {
    const rawFlows = isRecord(rawCopy.retainedStepsByFlow) ? rawCopy.retainedStepsByFlow : {};
    merged.retainedStepsByFlow = Object.fromEntries(
      Object.entries(next.retainedStepsByFlow).map(([flowSlug, nextSteps]) => {
        const rawSteps = isRecord(rawFlows[flowSlug]) ? rawFlows[flowSlug] : {};
        return [
          flowSlug,
          Object.fromEntries(Object.entries(nextSteps).map(([stepId, nextStep]) => [
            stepId,
            mergeStepRaw(rawSteps[stepId], nextStep as unknown as Record<string, unknown>),
          ])),
        ];
      }),
    );
  }
  for (const optionalKey of ['originalTitle', 'stepOverridesByFlow', 'retainedStepsByFlow']) {
    if (!hasOwn(next as unknown as Record<string, unknown>, optionalKey)) delete merged[optionalKey];
  }
  return merged;
}

/** Parse a fresh Map snapshot without discarding a malformed personal copy. */
export function parseSavedPlanEditorMapSnapshot(
  raw: string | null,
  mapId: string,
  flowSlug: string,
): { rawValue: Record<string, unknown>; snapshot: SourceBackedFlowMapSavedSnapshot } | undefined {
  if (raw === null) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed) || !isValidMapSnapshotRaw(parsed, mapId, flowSlug)) return undefined;
  const normalized = normalizeSavedFlowMapSnapshot(parsed);
  if (!normalized || (hasOwn(parsed, 'personalCopy') && !normalized.personalCopy)) return undefined;
  return {
    rawValue: parsed,
    snapshot: {
      mapId: normalized.mapId,
      title: normalized.title,
      version: normalized.version,
      savedAt: normalized.savedAt,
      ...(normalized.anchor ? { anchor: normalized.anchor } : {}),
      flowSlugs: [...normalized.flowSlugs],
      stepCountsByFlow: normalized.stepCountsByFlow ?? {},
      riskLevelsByFlow: (normalized.riskLevelsByFlow ?? {}) as SourceBackedFlowMapSavedSnapshot['riskLevelsByFlow'],
      sourceCheckedAtByFlow: normalized.sourceCheckedAtByFlow ?? {},
      ...(normalized.personalCopy ? { personalCopy: normalized.personalCopy } : {}),
    },
  };
}

/** Parse the existing persisted Map owner before it can be rewritten. */
export function parseSavedPlanEditorMapPersistence(
  raw: string | null,
  mapId: string,
  flowSlug: string,
): { rawValue: Record<string, unknown>; record: SourceBackedFlowMapPersistenceRecord } | undefined {
  if (raw === null) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed) || !isValidMapPersistenceRaw(parsed, mapId, flowSlug)) return undefined;
  return {
    rawValue: parsed,
    record: parsed,
  };
}

/** Merge a validated adjustment onto raw Map bytes while retaining unknown fields. */
export function mergeSavedPlanEditorMapSnapshotRaw(
  rawValue: Record<string, unknown>,
  next: SourceBackedFlowMapSavedSnapshot,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...structuredClone(rawValue),
    ...structuredClone(next),
  };
  if (next.anchor === undefined) delete merged.anchor;
  for (const optionalMapKey of ['stepCountsByFlow', 'riskLevelsByFlow', 'sourceCheckedAtByFlow']) {
    const nextMap = next[optionalMapKey as keyof SourceBackedFlowMapSavedSnapshot];
    if (!hasOwn(rawValue, optionalMapKey) && isRecord(nextMap) && Object.keys(nextMap).length === 0) {
      delete merged[optionalMapKey];
    }
  }
  const personalCopy = mergeOptionalPersonalCopy(rawValue.personalCopy, next.personalCopy);
  if (personalCopy) merged.personalCopy = personalCopy;
  else delete merged.personalCopy;
  return merged;
}

function mergeStepRaw(raw: unknown, next: Record<string, unknown>): Record<string, unknown> {
  const source = isRecord(raw) ? raw : {};
  const calendar = isRecord(next.calendar)
    ? {
        ...(isRecord(source.calendar) ? structuredClone(source.calendar) : {}),
        ...structuredClone(next.calendar),
      }
    : undefined;
  if (calendar && isRecord(next.calendar) && isRecord(next.calendar.window)) {
    const rawCalendar = isRecord(source.calendar) ? source.calendar : {};
    calendar.window = {
      ...(isRecord(rawCalendar.window) ? structuredClone(rawCalendar.window) : {}),
      ...structuredClone(next.calendar.window),
    };
  } else if (calendar) {
    delete calendar.window;
  }
  const textFallback = isRecord(next.textFallback)
    ? {
        ...(isRecord(source.textFallback) ? structuredClone(source.textFallback) : {}),
        ...structuredClone(next.textFallback),
      }
    : undefined;
  if (textFallback) {
    for (const optionalKey of ['items', 'memoHint', 'url', 'doneWhen']) {
      if (!hasOwn(next.textFallback as Record<string, unknown>, optionalKey)) delete textFallback[optionalKey];
    }
  }
  const merged: Record<string, unknown> = {
    ...structuredClone(source),
    ...structuredClone(next),
    ...(calendar ? { calendar } : {}),
    ...(textFallback ? { textFallback } : {}),
  };
  for (const optionalKey of ['sourceUrl', 'sourceType', 'riskLevel']) {
    if (!hasOwn(next, optionalKey)) delete merged[optionalKey];
  }
  return merged;
}

/** Merge the matching child/step records as well as top-level Map metadata. */
export function mergeSavedPlanEditorMapPersistenceRaw(
  rawValue: Record<string, unknown>,
  next: SourceBackedFlowMapPersistenceRecord,
): Record<string, unknown> {
  const rawFlows = Array.isArray(rawValue.childFlows) ? rawValue.childFlows : [];
  const childFlows = next.childFlows.map((nextFlow) => {
    const rawFlow = rawFlows.find((candidate) => isRecord(candidate) && candidate.slug === nextFlow.slug);
    const rawSteps = isRecord(rawFlow) && Array.isArray(rawFlow.steps) ? rawFlow.steps : [];
    const mergedFlow: Record<string, unknown> = {
      ...(isRecord(rawFlow) ? structuredClone(rawFlow) : {}),
      ...structuredClone(nextFlow),
      steps: nextFlow.steps.map((nextStep) => mergeStepRaw(
        rawSteps.find((candidate) => isRecord(candidate) && candidate.stepId === nextStep.stepId),
        nextStep as unknown as Record<string, unknown>,
      )),
    };
    for (const optionalKey of ['riskLevel', 'sourceTitle', 'sourceUrl', 'sourceCheckedAt']) {
      if (!hasOwn(nextFlow as unknown as Record<string, unknown>, optionalKey)) delete mergedFlow[optionalKey];
    }
    return mergedFlow;
  });
  const merged: Record<string, unknown> = {
    ...structuredClone(rawValue),
    ...structuredClone(next),
    map: { ...(isRecord(rawValue.map) ? structuredClone(rawValue.map) : {}), ...structuredClone(next.map) },
    saved: { ...(isRecord(rawValue.saved) ? structuredClone(rawValue.saved) : {}), ...structuredClone(next.saved) },
    readiness: {
      ...(isRecord(rawValue.readiness) ? structuredClone(rawValue.readiness) : {}),
      ...structuredClone(next.readiness),
    },
    updateAssessment: {
      ...(isRecord(rawValue.updateAssessment) ? structuredClone(rawValue.updateAssessment) : {}),
      ...structuredClone(next.updateAssessment),
    },
    childFlows,
  };
  if (next.saved.anchor === undefined && isRecord(merged.saved)) delete merged.saved.anchor;
  if (next.updateAssessment.currentVersion === undefined && isRecord(merged.updateAssessment)) {
    delete merged.updateAssessment.currentVersion;
  }
  const personalCopy = mergeOptionalPersonalCopy(rawValue.personalCopy, next.personalCopy);
  if (personalCopy) merged.personalCopy = personalCopy;
  else delete merged.personalCopy;
  return merged;
}

/**
 * Patch the one personal bundle owner selected by both Flow ID and slug.
 * The anchor date itself remains in the saved-record/anchor owners; this only
 * keeps the draft Flow's dated/undated metadata aligned when an anchor is
 * added or removed.
 * An actual title or anchor-type change is required before `updated_at` moves.
 */
export function patchSavedPlanEditorBundleFlowRaw(options: {
  raw: string | null;
  flowId: string;
  flowSlug: string;
  title?: string;
  anchor?: string | null;
  updatedAt: string;
}): unknown[] | undefined {
  if (options.raw === null) {
    throw new TypeError('Saved-plan bundle owner is missing.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(options.raw);
  } catch {
    throw new TypeError('Saved-plan bundle owner is malformed.');
  }
  if (!Array.isArray(parsed)) {
    throw new TypeError('Saved-plan bundle owner is malformed.');
  }
  const indexes = parsed.flatMap((candidate, index) => (
    isRecord(candidate)
    && isRecord(candidate.flow)
    && candidate.flow.id === options.flowId
    && candidate.flow.slug === options.flowSlug
      ? [index]
      : []
  ));
  if (indexes.length !== 1) {
    throw new TypeError('Saved-plan bundle identity changed.');
  }
  if (!isNonEmptyString(options.flowId) || !isNonEmptyString(options.flowSlug)) {
    throw new TypeError('Saved-plan bundle identity is invalid.');
  }
  if (!isNonEmptyString(options.updatedAt) || !Number.isFinite(Date.parse(options.updatedAt))) {
    throw new TypeError('Saved-plan bundle update timestamp is invalid.');
  }
  const target = parsed[indexes[0]] as Record<string, unknown>;
  const flow = target.flow as Record<string, unknown>;
  if (
    !isNonEmptyString(flow.title)
    || typeof flow.anchor_type !== 'string'
    || !ANCHOR_TYPES.has(flow.anchor_type)
  ) {
    throw new TypeError('Saved-plan bundle Flow metadata is invalid.');
  }

  let titlePatch: string | undefined;
  if (options.title !== undefined) {
    titlePatch = options.title.trim();
    if (!titlePatch) throw new TypeError('Saved-plan bundle title is invalid.');
  }
  let anchorPatch: string | undefined;
  if (options.anchor !== undefined && options.anchor !== null) {
    anchorPatch = options.anchor.trim();
    if (anchorPatch && !isPlainIsoDate(anchorPatch)) {
      throw new TypeError('Saved-plan bundle anchor is invalid.');
    }
  }
  const nextTitle = titlePatch ?? flow.title;
  const nextAnchorType = options.anchor === undefined || options.anchor === null
    ? flow.anchor_type
    : anchorPatch
      ? flow.anchor_type === 'none' ? 'start_date' : flow.anchor_type
      : 'none';
  if (nextTitle === flow.title && nextAnchorType === flow.anchor_type) return undefined;

  const next = structuredClone(parsed);
  const nextTarget = next[indexes[0]] as Record<string, unknown>;
  const nextFlow = nextTarget.flow as Record<string, unknown>;
  nextTarget.flow = {
    ...nextFlow,
    title: nextTitle,
    anchor_type: nextAnchorType,
    updated_at: options.updatedAt,
  };
  return next;
}

/** Backward-compatible title-only entry point. */
export function patchSavedPlanEditorBundleTitleRaw(options: {
  raw: string | null;
  flowId: string;
  flowSlug: string;
  title: string;
  updatedAt: string;
}): unknown[] | undefined {
  return patchSavedPlanEditorBundleFlowRaw(options);
}

/**
 * A displayed Map title may intentionally omit a source-owned suffix. Only a
 * real user edit may replace the persisted title.
 */
export function getSavedPlanEditorTitlePatch(
  openedTitle: string,
  nextTitle: string,
): string | undefined {
  const normalizedNext = nextTitle.trim();
  if (!normalizedNext || normalizedNext === openedTitle.trim()) return undefined;
  return normalizedNext;
}

/**
 * Patch user-owned title/anchor fields on a fresh raw saved record without
 * migrating its schema variant or rebuilding unknown fields. Undefined means
 * the requested semantic values already match and no write is necessary.
 */
export function patchSavedPlanEditorSavedRecordRaw(options: {
  rawRecord: unknown;
  flowSlug: string;
  savedAt: string;
  title?: string;
  anchor?: string | null;
  allowAnchorClear?: boolean;
}): (Record<string, unknown> & SavedFlowRecord) | undefined {
  if (
    !isRecord(options.rawRecord)
    || (options.rawRecord.schemaVersion !== undefined
      && options.rawRecord.schemaVersion !== 2)
  ) {
    throw new TypeError('Saved-plan record schema variant is invalid.');
  }
  const normalized = normalizeSavedFlowRecord(options.rawRecord);
  if (!normalized || normalized.slug !== options.flowSlug) {
    throw new TypeError('Saved-plan record identity changed.');
  }
  const rawSchemaVersion = options.rawRecord.schemaVersion;
  if (normalized.schemaVersion !== rawSchemaVersion) {
    throw new TypeError('Saved-plan record schema variant changed.');
  }
  if (!isNonEmptyString(options.savedAt) || !Number.isFinite(Date.parse(options.savedAt))) {
    throw new TypeError('Saved-plan record update timestamp is invalid.');
  }

  let titlePatch: string | undefined;
  if (options.title !== undefined) {
    titlePatch = options.title.trim();
    if (!titlePatch) throw new TypeError('Saved-plan record title is invalid.');
  }
  const hasAnchorPatch = options.anchor !== undefined;
  const anchorPatch = typeof options.anchor === 'string' ? options.anchor.trim() : '';
  if (anchorPatch && !isPlainIsoDate(anchorPatch)) {
    throw new TypeError('Saved-plan record anchor is invalid.');
  }
  if (hasAnchorPatch && !anchorPatch && options.allowAnchorClear === false) {
    throw new TypeError('Saved-plan record anchor clearing is not allowed.');
  }

  const titleChanged = titlePatch !== undefined
    && options.rawRecord.personalTitle !== titlePatch;
  const anchorChanged = hasAnchorPatch && (
    anchorPatch
      ? options.rawRecord.anchor !== anchorPatch
        || options.rawRecord.dateIntent !== 'custom'
      : hasOwn(options.rawRecord, 'anchor')
        || options.rawRecord.dateIntent !== 'undated'
  );
  if (!titleChanged && !anchorChanged) return undefined;

  const next: Record<string, unknown> = {
    ...structuredClone(options.rawRecord),
    savedAt: options.savedAt,
    ...(titlePatch !== undefined ? { personalTitle: titlePatch } : {}),
  };
  if (hasAnchorPatch) {
    next.dateIntent = anchorPatch ? 'custom' : 'undated';
    if (anchorPatch) next.anchor = anchorPatch;
    else delete next.anchor;
  }

  const validated = normalizeSavedFlowRecord(next);
  if (
    !validated
    || validated.slug !== normalized.slug
    || validated.schemaVersion !== normalized.schemaVersion
  ) {
    throw new TypeError('Saved-plan record update is invalid.');
  }
  if (normalized.schemaVersion === 2 && (
    validated.personalCopyKey !== normalized.personalCopyKey
    || validated.sourceFlowKey !== normalized.sourceFlowKey
    || validated.sourceFlowSlug !== normalized.sourceFlowSlug
    || validated.sourceVersion !== normalized.sourceVersion
    || validated.lastSaveRequestId !== normalized.lastSaveRequestId
    || validated.savedItemCount !== normalized.savedItemCount
  )) {
    throw new TypeError('Saved-plan schema-v2 identity changed.');
  }
  return next as Record<string, unknown> & SavedFlowRecord;
}

/**
 * Legacy records stay legacy. Known user-owned fields are patched onto the
 * fresh raw record so unknown fields survive and schema-v2 identity is never
 * synthesized by an ordinary editor save.
 */
export function buildLegacySavedPlanEditorRecord(options: {
  rawRecord: unknown;
  flowSlug: string;
  openedTitle: string;
  nextTitle: string;
  savedAt: string;
}): Record<string, unknown> & SavedFlowRecord {
  if (!isRecord(options.rawRecord) || options.rawRecord.schemaVersion !== undefined) {
    throw new TypeError('Legacy saved-plan record is not an unversioned record.');
  }
  const normalized = normalizeSavedFlowRecord(options.rawRecord);
  if (!normalized || normalized.schemaVersion !== undefined || normalized.slug !== options.flowSlug) {
    throw new TypeError('Legacy saved-plan identity changed.');
  }
  const titlePatch = getSavedPlanEditorTitlePatch(options.openedTitle, options.nextTitle);
  const next = {
    ...structuredClone(options.rawRecord),
    savedAt: options.savedAt,
    ...(titlePatch ? { personalTitle: titlePatch } : {}),
  };
  const validated = normalizeSavedFlowRecord(next);
  if (!validated || validated.schemaVersion !== undefined || validated.slug !== options.flowSlug) {
    throw new TypeError('Legacy saved-plan update is invalid.');
  }
  return next as Record<string, unknown> & SavedFlowRecord;
}

function assertStrictRawPersonalStructuralOverlay(
  rawValue: unknown,
  next: PersonalStructuralOverlay,
): asserts rawValue is Record<string, unknown> {
  if (
    !isRecord(rawValue)
    || rawValue.schemaVersion !== next.schemaVersion
    || rawValue.savedCopyId !== next.savedCopyId
    || rawValue.flowId !== next.flowId
    || !Array.isArray(rawValue.userItems)
    || !Array.isArray(rawValue.itemTombstones)
    || !isUniqueNonEmptyStringList(rawValue.orderOverride)
    || !isRecord(rawValue.selection)
    || (rawValue.selection.mode !== 'all_except_excluded'
      && rawValue.selection.mode !== 'only_included')
    || !isUniqueNonEmptyStringList(rawValue.selection.includedItemIds)
    || !isUniqueNonEmptyStringList(rawValue.selection.excludedItemIds)
    || typeof rawValue.updatedAt !== 'string'
    || !Number.isFinite(Date.parse(rawValue.updatedAt))
  ) {
    throw new TypeError('Personal structural overlay owner is malformed or changed identity.');
  }

  const includedIds = new Set(rawValue.selection.includedItemIds);
  if (rawValue.selection.excludedItemIds.some((itemId) => includedIds.has(itemId))) {
    throw new TypeError('Personal structural overlay selection owners overlap.');
  }

  const userItemIds = new Set<string>();
  for (const candidate of rawValue.userItems) {
    if (
      !isRecord(candidate)
      || !isNonEmptyString(candidate.itemId)
      || userItemIds.has(candidate.itemId)
      || candidate.provenance !== 'user_created'
      || !isNonEmptyString(candidate.title)
      || typeof candidate.createdAt !== 'string'
      || !Number.isFinite(Date.parse(candidate.createdAt))
      || typeof candidate.orderKey !== 'number'
      || !Number.isFinite(candidate.orderKey)
      || (hasOwn(candidate, 'personalMemo') && typeof candidate.personalMemo !== 'string')
      || (hasOwn(candidate, 'schedule') && !isRecord(candidate.schedule))
    ) {
      throw new TypeError('Personal structural overlay contains a malformed user Item.');
    }
    userItemIds.add(candidate.itemId);
  }

  const tombstoneIds = new Set<string>();
  for (const candidate of rawValue.itemTombstones) {
    if (
      !isRecord(candidate)
      || !isNonEmptyString(candidate.itemId)
      || tombstoneIds.has(candidate.itemId)
      || (candidate.ownership !== 'source' && candidate.ownership !== 'user_created')
      || typeof candidate.deletedAt !== 'string'
      || !Number.isFinite(Date.parse(candidate.deletedAt))
    ) {
      throw new TypeError('Personal structural overlay contains a malformed tombstone.');
    }
    tombstoneIds.add(candidate.itemId);
  }

  const normalizedRaw = normalizePersonalStructuralOverlay(rawValue, {
    savedCopyId: next.savedCopyId,
    flowId: next.flowId,
    fallbackTimestamp: rawValue.updatedAt,
  });
  if (
    !normalizedRaw
    || normalizedRaw.userItems.length !== rawValue.userItems.length
    || normalizedRaw.itemTombstones.length !== rawValue.itemTombstones.length
    || normalizedRaw.orderOverride.length !== rawValue.orderOverride.length
    || normalizedRaw.selection.includedItemIds.length
      !== rawValue.selection.includedItemIds.length
    || normalizedRaw.selection.excludedItemIds.length
      !== rawValue.selection.excludedItemIds.length
    || rawValue.userItems.some((candidate) => (
      isRecord(candidate)
      && hasOwn(candidate, 'schedule')
      && !normalizedRaw.userItems.find((item) => item.itemId === candidate.itemId)?.schedule
    ))
  ) {
    throw new TypeError('Personal structural overlay cannot be normalized without data loss.');
  }
}

function mergeOptionalOwnedRecord(
  rawValue: unknown,
  nextValue: unknown,
): Record<string, unknown> | undefined {
  if (!isRecord(nextValue)) return undefined;
  return {
    ...(isRecord(rawValue) ? structuredClone(rawValue) : {}),
    ...structuredClone(nextValue),
  };
}

/**
 * Merge a normalized personal structural owner onto its fresh raw value.
 * Unknown fields survive at the top level and inside identity-bearing records;
 * malformed known containers fail closed instead of being normalized away.
 */
export function mergeSavedPlanEditorPersonalStructuralOverlayRaw(
  rawValue: unknown,
  nextOverlay: PersonalStructuralOverlay,
): Record<string, unknown> & PersonalStructuralOverlay {
  const next = normalizePersonalStructuralOverlay(nextOverlay, {
    savedCopyId: nextOverlay.savedCopyId,
    flowId: nextOverlay.flowId,
    fallbackTimestamp: nextOverlay.updatedAt,
  });
  if (!next) throw new TypeError('Next personal structural overlay is invalid.');

  if (rawValue === null || rawValue === undefined) {
    return structuredClone(next) as Record<string, unknown> & PersonalStructuralOverlay;
  }
  assertStrictRawPersonalStructuralOverlay(rawValue, next);

  const rawUserItems = rawValue.userItems as Record<string, unknown>[];
  const userItems = next.userItems.map((nextItem) => {
    const rawItem = rawUserItems.find((candidate) => candidate.itemId === nextItem.itemId);
    const merged: Record<string, unknown> = {
      ...(rawItem ? structuredClone(rawItem) : {}),
      ...structuredClone(nextItem),
    };
    const schedule = mergeOptionalOwnedRecord(rawItem?.schedule, nextItem.schedule);
    if (schedule) merged.schedule = schedule;
    else delete merged.schedule;
    if (nextItem.personalMemo === undefined) delete merged.personalMemo;
    return merged;
  });

  const rawTombstones = rawValue.itemTombstones as Record<string, unknown>[];
  const itemTombstones = next.itemTombstones.map((nextTombstone) => ({
    ...(rawTombstones.find((candidate) => candidate.itemId === nextTombstone.itemId)
      ? structuredClone(rawTombstones.find(
        (candidate) => candidate.itemId === nextTombstone.itemId,
      )!)
      : {}),
    ...structuredClone(nextTombstone),
  }));

  const merged: Record<string, unknown> = {
    ...structuredClone(rawValue),
    ...structuredClone(next),
    userItems,
    itemTombstones,
    selection: {
      ...structuredClone(rawValue.selection as Record<string, unknown>),
      ...structuredClone(next.selection),
    },
  };
  const migration = mergeOptionalOwnedRecord(rawValue.migration, next.migration);
  if (migration) merged.migration = migration;
  else delete merged.migration;
  return merged as Record<string, unknown> & PersonalStructuralOverlay;
}

/**
 * Apply source-owned Item date edits against explicit immutable owner keys.
 * `item-draft` stores a replacement date in the canonical value overlay;
 * `external` assumes another owner (for example a Map personal copy) stores
 * non-empty dates. `date-override` retains an unscheduled tombstone at the
 * immutable original owner (canonical, legacy, and Map contracts), while
 * `item-draft` records an explicit empty value without a global tombstone (the
 * personal-draft source contract).
 */
export function applySavedPlanEditorSourceDatePersonalizations(options: {
  flowSlug: string;
  sources: readonly SavedPlanEditorPersistenceSource[];
  personalizations: Readonly<Record<string, PublicItemPersonalization>>;
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  dateOverrides: Record<string, string>;
  valueOwner?: SavedPlanEditorSourceDateValueOwner;
  unscheduledOwner?: SavedPlanEditorUnscheduledDateOwner;
}): {
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  dateOverrides: Record<string, string>;
} {
  const itemDrafts = structuredClone(options.itemDrafts);
  const dateOverrides = { ...options.dateOverrides };

  options.sources.forEach((source) => {
    if (source.ownership === 'user_created') return;
    const personalization = options.personalizations[source.itemId];
    if (!personalization || !Object.prototype.hasOwnProperty.call(personalization, 'date')) return;
    const valueKey = source.valueOwnerKey?.trim()
      || getPersonalDraftProjectionValueKey(options.flowSlug, source.itemId);
    const dateOwnerKey = source.dateOwnerKey?.trim() || valueKey;
    if (!valueKey || !dateOwnerKey) {
      throw new TypeError('Saved-plan Item date owner is invalid.');
    }
    const currentDraft = { ...(itemDrafts[valueKey] ?? {}) };
    const requestedDate = personalization.date;
    const rawOriginalDate = source.originalDate?.trim();
    const originalDate = rawOriginalDate && rawOriginalDate !== 'none'
      ? rawOriginalDate
      : undefined;
    if (originalDate && !isPlainIsoDate(originalDate)) {
      throw new TypeError('Saved-plan source Item original date is invalid.');
    }
    const dateValueOwnerKeys = Array.from(new Set([
      dateOwnerKey,
      ...(source.date?.trim()
        ? [getMyFlowDateOverrideKey(options.flowSlug, source.itemId, source.date.trim())]
        : []),
      ...(source.dateValueOwnerKeys ?? []).map((key) => key.trim()).filter(Boolean),
    ])).filter((key) => key !== valueKey);
    dateValueOwnerKeys.forEach((aliasKey) => {
      const aliasDraft = { ...(itemDrafts[aliasKey] ?? {}) };
      delete aliasDraft.date;
      if (Object.keys(aliasDraft).length > 0) itemDrafts[aliasKey] = aliasDraft;
      else delete itemDrafts[aliasKey];
      if (aliasKey !== dateOwnerKey) delete dateOverrides[aliasKey];
    });

    if (typeof requestedDate === 'string' && requestedDate.trim()) {
      const date = requestedDate.trim();
      if (!isPlainIsoDate(date)) throw new TypeError('Saved-plan Item date is invalid.');
      if (date === originalDate) {
        delete currentDraft.date;
        delete dateOverrides[dateOwnerKey];
      } else {
        if ((options.valueOwner ?? 'item-draft') === 'item-draft') {
          currentDraft.date = date;
        } else {
          delete currentDraft.date;
        }
        delete dateOverrides[dateOwnerKey];
      }
    } else if (!originalDate) {
      delete currentDraft.date;
      delete dateOverrides[dateOwnerKey];
    } else if ((options.unscheduledOwner ?? 'date-override') === 'item-draft') {
      currentDraft.date = '';
      delete dateOverrides[dateOwnerKey];
    } else {
      delete currentDraft.date;
      dateOverrides[dateOwnerKey] = MY_FLOW_DATE_REMOVED_OVERRIDE;
    }

    if (Object.keys(currentDraft).length > 0) itemDrafts[valueKey] = currentDraft;
    else delete itemDrafts[valueKey];
  });

  return { itemDrafts, dateOverrides };
}

/** Backward-compatible personal-draft wrapper. */
export function applyPersonalDraftSourceDatePersonalizations(options: {
  flowSlug: string;
  sources: readonly SavedPlanEditorPersistenceSource[];
  personalizations: Readonly<Record<string, PublicItemPersonalization>>;
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  dateOverrides: Record<string, string>;
}): {
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  dateOverrides: Record<string, string>;
} {
  return applySavedPlanEditorSourceDatePersonalizations({
    ...options,
    valueOwner: 'item-draft',
    unscheduledOwner: 'item-draft',
  });
}
