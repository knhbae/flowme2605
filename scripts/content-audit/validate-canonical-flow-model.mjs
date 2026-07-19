#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURE_PATH = path.resolve(
  SCRIPT_DIR,
  '../../docs/specs/2026-07-11-canonical-flow-data-model/golden-fixtures-v1.json',
);
const fixturePath = path.resolve(process.argv[2] ?? DEFAULT_FIXTURE_PATH);

const CANONICAL_SCHEMA_VERSION = 'flowme-canonical-flow-v1';
const FIXTURE_SCHEMA_VERSION = 'flowme-canonical-golden-fixtures-v1';
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const RAW_HASH_PATTERN = /^[a-f0-9]{64}$/;
const CONTENT_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const LIFE_AREAS = new Set([
  'home_living',
  'family_parenting',
  'study_reading',
  'money_admin_purchase',
  'health_fitness',
  'travel_outings',
  'meals_grocery',
  'work_career',
  'hobby_pet',
]);
const PLANNING_PATTERNS = new Set([
  'date_preparation',
  'ordered_procedure',
  'repeating_routine',
  'source_table_rows',
  'resource_queue',
  'compare_decide',
  'phase_lifecycle',
]);
const NATURAL_ARTIFACTS = new Set(['calendar', 'checklist', 'todo', 'sheet', 'memo', 'hybrid']);
const LIFECYCLE_STATUSES = new Set(['draft', 'in_review', 'published', 'retired']);
const RISK_LEVELS = new Set([
  'low',
  'medium',
  'medical_sensitive',
  'legal_sensitive',
  'financial_sensitive',
  'safety_sensitive',
  'privacy_sensitive',
]);
const SOURCE_TYPES = new Set(['official', 'creator_experience', 'reference', 'user_supplied']);
const RIGHTS_STATUSES = new Set(['allowed', 'needs_review', 'blocked']);
const SOURCE_ROW_TYPES = new Set(['date', 'offset', 'check', 'table_row', 'procedure', 'resource', 'reference']);
const SOURCE_RELATIONS = new Set(['derived_from', 'supports', 'caution', 'boundary']);
const SOURCE_SUPPORT_LEVELS = new Set(['direct', 'creator_interpretation', 'user_request', 'inferred_draft']);
const ANCHOR_KINDS = new Set(['start_date', 'end_date', 'event_date', 'birth_date', 'age_month']);
const ITEM_INTENTS = new Set(['act', 'inspect', 'decide', 'record', 'use_resource']);
const COMPLETION_MODES = new Set(['check', 'decision', 'record']);
const SCHEDULE_MODES = new Set(['absolute', 'anchor_offset', 'date_window']);
const FIELD_VALUE_TYPES = new Set([
  'short_text',
  'long_text',
  'number',
  'boolean',
  'date',
  'datetime',
  'url',
  'single_select',
  'multi_select',
  'file_ref',
]);
const FIELD_PURPOSES = new Set(['schedule', 'sort', 'filter', 'record', 'export', 'generation']);
const FIELD_VALUE_SOURCES = new Set(['user', 'source', 'derived']);
const MEMO_KINDS = new Set([
  'instruction',
  'source_detail',
  'creator_experience',
  'caution',
  'hold_template',
  'user_prompt',
]);
const PROJECTION_TARGETS = new Set(['calendar', 'checklist', 'todo', 'sheet', 'memo']);
const PROJECTION_FORMATS = new Set(['ics', 'plain_text', 'markdown', 'csv', 'tsv', 'xlsx']);
const PROJECTION_FORMATS_BY_TARGET = new Map([
  ['calendar', new Set(['ics'])],
  ['checklist', new Set(['plain_text', 'markdown'])],
  ['todo', new Set(['plain_text', 'markdown'])],
  ['sheet', new Set(['csv', 'tsv', 'xlsx'])],
  ['memo', new Set(['plain_text', 'markdown'])],
]);
const PROJECTION_GRANULARITIES = new Set(['item', 'step_bundle', 'flow']);
const PROJECTION_GROUPS = new Set(['step', 'flow', 'none']);
const QUALITY_DIMENSIONS = [
  'userNeedFit',
  'executionClarity',
  'contentFidelity',
  'portability',
  'cognitiveLoad',
  'copySpecificity',
  'sourceSafety',
  'accessibilityOperability',
];
const READINESS_VALUES = new Set([
  'ready_for_internal_canary',
  'ready_second_wave',
  'source_import_required',
  'hold',
]);
const POSITIVE_READINESS = new Set(['ready_for_internal_canary', 'ready_second_wave']);

const errors = [];

function fail(location, message) {
  errors.push(location + ': ' + message);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function requireObject(value, location) {
  if (!isObject(value)) {
    fail(location, 'must be an object');
    return false;
  }
  return true;
}

function requireArray(value, location, options = {}) {
  if (!Array.isArray(value)) {
    fail(location, 'must be an array');
    return false;
  }
  if (options.nonEmpty && value.length === 0) fail(location, 'must not be empty');
  return true;
}

function requireString(value, location) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(location, 'must be a non-empty string');
    return false;
  }
  return true;
}

function requireId(value, location) {
  if (!requireString(value, location)) return false;
  if (!ID_PATTERN.test(value)) {
    fail(location, 'must use lowercase kebab-case stable ID syntax');
    return false;
  }
  return true;
}

function requireEnum(value, allowed, location) {
  if (!allowed.has(value)) {
    fail(location, 'has unsupported value ' + JSON.stringify(value));
    return false;
  }
  return true;
}

function requireBoolean(value, location) {
  if (typeof value !== 'boolean') fail(location, 'must be boolean');
}

function requireInteger(value, location, minimum = Number.MIN_SAFE_INTEGER) {
  if (!Number.isInteger(value) || value < minimum) {
    fail(location, 'must be an integer >= ' + minimum);
    return false;
  }
  return true;
}

function requireDate(value, location) {
  if (!requireString(value, location)) return false;
  if (Number.isNaN(Date.parse(value))) {
    fail(location, 'must be an ISO-compatible date or datetime');
    return false;
  }
  return true;
}

function requireUrl(value, location) {
  if (!requireString(value, location)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      fail(location, 'must use http or https');
      return false;
    }
  } catch {
    fail(location, 'must be a valid URL');
    return false;
  }
  return true;
}

function requireRawHash(value, location) {
  if (!requireString(value, location)) return false;
  if (!RAW_HASH_PATTERN.test(value)) {
    fail(location, 'must be a 64-character lowercase hexadecimal hash');
    return false;
  }
  return true;
}

function requireContentHash(value, location) {
  if (!requireString(value, location)) return false;
  if (!CONTENT_HASH_PATTERN.test(value)) {
    fail(location, 'must use sha256: followed by 64 lowercase hexadecimal characters');
    return false;
  }
  return true;
}

const TOP_LEVEL_ENTITY_COLLECTION_IDS = new Map([
  ['flows', 'flowId'],
  ['steps', 'stepId'],
  ['items', 'itemId'],
  ['fields', 'fieldId'],
  ['memos', 'memoId'],
  ['sources', 'sourceId'],
  ['sourceSnapshots', 'snapshotId'],
  ['sourceRows', 'sourceRowId'],
  ['sourceRefs', 'sourceRefId'],
]);
const ORDERED_ARRAY_KEYS = new Set(['flowIds', 'stepIds', 'itemIds', 'options']);

function canonicalizeSemanticValue(value, key = '', depth = 0) {
  if (Array.isArray(value)) {
    const canonicalItems = value.map((item) => canonicalizeSemanticValue(item, '', depth + 1));
    const entityIdKey = depth === 0 ? TOP_LEVEL_ENTITY_COLLECTION_IDS.get(key) : undefined;
    if (entityIdKey) {
      return canonicalItems.sort((left, right) =>
        compareStrings(String(left?.[entityIdKey] ?? ''), String(right?.[entityIdKey] ?? '')));
    }
    if (ORDERED_ARRAY_KEYS.has(key)) return canonicalItems;
    if (canonicalItems.every((item) => typeof item === 'string')) {
      return canonicalItems.sort(compareStrings);
    }
    if (key === 'weekdays' && canonicalItems.every((item) => Number.isInteger(item))) {
      return canonicalItems.sort((left, right) => left - right);
    }
    if (key === 'projectionProfiles') {
      return canonicalItems.sort((left, right) =>
        compareStrings(JSON.stringify(left), JSON.stringify(right)));
    }
    return canonicalItems;
  }
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(compareStrings)
      .map((childKey) => [childKey, canonicalizeSemanticValue(value[childKey], childKey, depth)]),
  );
}

function computeContentHash(content) {
  const {
    contentHash: _contentHash,
    contentId: _contentId,
    version: _version,
    lifecycleStatus: _lifecycleStatus,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...semanticPayload
  } = content;
  const canonicalPayload = canonicalizeSemanticValue(semanticPayload);
  const serialized = JSON.stringify(canonicalPayload);
  return 'sha256:' + createHash('sha256').update(serialized, 'utf8').digest('hex');
}

function validateUniqueStrings(values, location, options = {}) {
  if (!requireArray(values, location, options)) return new Set();
  const seen = new Set();
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!requireString(value, location + '[' + index + ']')) continue;
    if (seen.has(value)) fail(location + '[' + index + ']', 'duplicates ' + value);
    seen.add(value);
  }
  return seen;
}

function buildEntityMap(entries, key, location, globalIds) {
  const map = new Map();
  if (!requireArray(entries, location)) return map;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const itemLocation = location + '[' + index + ']';
    if (!requireObject(entry, itemLocation)) continue;
    const id = entry[key];
    if (!requireId(id, itemLocation + '.' + key)) continue;
    if (map.has(id)) fail(itemLocation + '.' + key, 'duplicates ' + id + ' in ' + location);
    map.set(id, entry);
    if (globalIds.has(id)) {
      fail(itemLocation + '.' + key, 'duplicates globally scoped ID ' + id);
    } else {
      globalIds.add(id);
    }
  }
  return map;
}

function validateQualityScores(scores, location) {
  if (!requireObject(scores, location)) return;
  const keys = Object.keys(scores);
  for (const expected of QUALITY_DIMENSIONS) {
    if (!Object.hasOwn(scores, expected)) fail(location, 'missing quality dimension ' + expected);
  }
  for (const actual of keys) {
    if (!QUALITY_DIMENSIONS.includes(actual)) fail(location, 'contains unknown quality dimension ' + actual);
  }
  for (const dimension of QUALITY_DIMENSIONS) {
    const value = scores[dimension];
    const scoreLocation = location + '.' + dimension;
    if (!requireObject(value, scoreLocation)) continue;
    if (!Number.isInteger(value.score) || value.score < 1 || value.score > 5) {
      fail(scoreLocation + '.score', 'must be an integer from 1 to 5');
    }
    requireString(value.comment, scoreLocation + '.comment');
  }
}

function validateReview(review, location) {
  if (!requireObject(review, location)) return;
  requireId(review.reviewId, location + '.reviewId');
  requireId(review.contentId, location + '.contentId');
  requireString(review.contentVersion, location + '.contentVersion');
  requireEnum(review.readiness, READINESS_VALUES, location + '.readiness');
  validateQualityScores(review.qualityScores, location + '.qualityScores');
  if (requireArray(review.omittedRows, location + '.omittedRows')) {
    for (let index = 0; index < review.omittedRows.length; index += 1) {
      const omission = review.omittedRows[index];
      const omissionLocation = location + '.omittedRows[' + index + ']';
      if (!requireObject(omission, omissionLocation)) continue;
      requireId(omission.sourceRowId, omissionLocation + '.sourceRowId');
      requireString(omission.reason, omissionLocation + '.reason');
    }
  }
  if (requireArray(review.hardFails, location + '.hardFails')) {
    review.hardFails.forEach((value, index) => requireString(value, location + '.hardFails[' + index + ']'));
  }
  requireString(review.rightsDecision, location + '.rightsDecision');
  requireString(review.riskDecision, location + '.riskDecision');
  requireDate(review.reviewedAt, location + '.reviewedAt');
}

function projectionPair(target, format) {
  return target + ':' + format;
}

function validateProjectionExpectations(expectations, location) {
  const result = { expected: new Set(), forbidden: new Set() };
  if (!requireObject(expectations, location)) return result;
  for (const key of ['expected', 'forbidden']) {
    const values = expectations[key];
    if (!requireArray(values, location + '.' + key)) continue;
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      const pairLocation = location + '.' + key + '[' + index + ']';
      if (!requireString(value, pairLocation)) continue;
      const [target, format, extra] = value.split(':');
      if (extra !== undefined || !target || !format) {
        fail(pairLocation, 'must use target:format');
        continue;
      }
      requireEnum(target, PROJECTION_TARGETS, pairLocation + ' target');
      requireEnum(format, PROJECTION_FORMATS, pairLocation + ' format');
      if (PROJECTION_FORMATS_BY_TARGET.has(target) && !PROJECTION_FORMATS_BY_TARGET.get(target).has(format)) {
        fail(pairLocation, 'uses a format not supported by target ' + target);
      }
      if (result[key].has(value)) fail(pairLocation, 'duplicates ' + value);
      result[key].add(value);
    }
  }
  for (const pair of result.expected) {
    if (result.forbidden.has(pair)) fail(location, pair + ' cannot be both expected and forbidden');
  }
  return result;
}

function validateSchedule(schedule, location, fields, coverageState) {
  if (!requireObject(schedule, location)) return;
  if (!requireEnum(schedule.mode, SCHEDULE_MODES, location + '.mode')) return;
  coverageState.scheduleModes.add(schedule.mode);

  if (schedule.mode === 'absolute') {
    requireDate(schedule.start, location + '.start');
    if (schedule.end !== undefined) requireDate(schedule.end, location + '.end');
    requireBoolean(schedule.allDay, location + '.allDay');
    if (schedule.timezone !== undefined) requireString(schedule.timezone, location + '.timezone');
    if (schedule.recurrence !== undefined) validateRecurrence(schedule.recurrence, location + '.recurrence');
    return;
  }

  if (schedule.mode === 'anchor_offset') {
    requireId(schedule.anchorFieldId, location + '.anchorFieldId');
    if (!fields.has(schedule.anchorFieldId)) fail(location + '.anchorFieldId', 'does not resolve to a Field');
    requireInteger(schedule.dayOffset, location + '.dayOffset');
    requireBoolean(schedule.allDay, location + '.allDay');
    if (schedule.recurrence !== undefined) validateRecurrence(schedule.recurrence, location + '.recurrence');
    return;
  }

  requireEnum(schedule.basis, new Set(['absolute', 'anchor_offset']), location + '.basis');
  if (schedule.basis === 'absolute') {
    requireDate(schedule.startDate, location + '.startDate');
    requireDate(schedule.endDate, location + '.endDate');
    if (schedule.reminderDate !== undefined) requireDate(schedule.reminderDate, location + '.reminderDate');
    if (
      typeof schedule.startDate === 'string'
      && typeof schedule.endDate === 'string'
      && Date.parse(schedule.startDate) > Date.parse(schedule.endDate)
    ) {
      fail(location, 'date window startDate must not be after endDate');
    }
  } else if (schedule.basis === 'anchor_offset') {
    requireId(schedule.anchorFieldId, location + '.anchorFieldId');
    if (!fields.has(schedule.anchorFieldId)) fail(location + '.anchorFieldId', 'does not resolve to a Field');
    requireInteger(schedule.startDayOffset, location + '.startDayOffset');
    requireInteger(schedule.endDayOffset, location + '.endDayOffset');
    requireInteger(schedule.reminderDayOffset, location + '.reminderDayOffset');
    if (
      Number.isInteger(schedule.startDayOffset)
      && Number.isInteger(schedule.endDayOffset)
      && schedule.startDayOffset > schedule.endDayOffset
    ) {
      fail(location, 'date window startDayOffset must not exceed endDayOffset');
    }
    if (
      Number.isInteger(schedule.reminderDayOffset)
      && Number.isInteger(schedule.startDayOffset)
      && Number.isInteger(schedule.endDayOffset)
      && (schedule.reminderDayOffset < schedule.startDayOffset || schedule.reminderDayOffset > schedule.endDayOffset)
    ) {
      fail(location + '.reminderDayOffset', 'must fall within the date window');
    }
  }
}

function validateRecurrence(recurrence, location) {
  if (!requireObject(recurrence, location)) return;
  requireEnum(recurrence.frequency, new Set(['daily', 'weekly', 'monthly']), location + '.frequency');
  requireInteger(recurrence.interval, location + '.interval', 1);
  requireBoolean(recurrence.sourceDefined, location + '.sourceDefined');
  if (recurrence.weekdays !== undefined && requireArray(recurrence.weekdays, location + '.weekdays')) {
    recurrence.weekdays.forEach((weekday, index) => {
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        fail(location + '.weekdays[' + index + ']', 'must be an integer from 0 to 6');
      }
    });
  }
  if (recurrence.count !== undefined) requireInteger(recurrence.count, location + '.count', 1);
  if (recurrence.until !== undefined) requireDate(recurrence.until, location + '.until');
}

function validateCompletion(completion, location, fields, itemFieldIds, coverageState) {
  if (!requireObject(completion, location)) return;
  if (!requireEnum(completion.mode, COMPLETION_MODES, location + '.mode')) return;
  coverageState.completionModes.add(completion.mode);

  if (completion.mode === 'check') {
    requireString(completion.doneWhen, location + '.doneWhen');
    return;
  }
  if (completion.mode === 'decision') {
    if (requireArray(completion.options, location + '.options', { nonEmpty: true })) {
      const optionValues = new Set();
      completion.options.forEach((option, index) => {
        const optionLocation = location + '.options[' + index + ']';
        if (!requireObject(option, optionLocation)) return;
        requireString(option.value, optionLocation + '.value');
        requireString(option.label, optionLocation + '.label');
        if (optionValues.has(option.value)) fail(optionLocation + '.value', 'duplicates decision value');
        optionValues.add(option.value);
        if (option.terminal !== undefined) requireBoolean(option.terminal, optionLocation + '.terminal');
      });
    }
    if (completion.doneWhen !== undefined) requireString(completion.doneWhen, location + '.doneWhen');
    return;
  }
  if (requireArray(completion.recordFieldIds, location + '.recordFieldIds', { nonEmpty: true })) {
    completion.recordFieldIds.forEach((fieldId, index) => {
      requireId(fieldId, location + '.recordFieldIds[' + index + ']');
      if (!fields.has(fieldId)) fail(location + '.recordFieldIds[' + index + ']', 'does not resolve to a Field');
      if (!itemFieldIds.has(fieldId)) {
        fail(location + '.recordFieldIds[' + index + ']', 'must also appear in the Item fieldIds array');
      }
    });
  }
  requireString(completion.doneWhen, location + '.doneWhen');
}

function validateContent(content, review, expectations, location, coverageState) {
  if (!requireObject(content, location)) return;
  if (content.schemaVersion !== CANONICAL_SCHEMA_VERSION) {
    fail(location + '.schemaVersion', 'must equal ' + CANONICAL_SCHEMA_VERSION);
  }
  requireId(content.contentId, location + '.contentId');
  requireString(content.version, location + '.version');
  requireContentHash(content.contentHash, location + '.contentHash');
  if (CONTENT_HASH_PATTERN.test(content.contentHash)) {
    const expectedContentHash = computeContentHash(content);
    if (content.contentHash !== expectedContentHash) {
      fail(
        location + '.contentHash',
        'does not match semantic canonical payload; expected ' + expectedContentHash,
      );
    }
  }
  requireEnum(content.lifecycleStatus, LIFECYCLE_STATUSES, location + '.lifecycleStatus');
  requireDate(content.createdAt, location + '.createdAt');
  requireDate(content.updatedAt, location + '.updatedAt');
  if (review.contentId !== content.contentId) fail(location, 'review.contentId must match content.contentId');
  if (review.contentVersion !== content.version) fail(location, 'review.contentVersion must match content.version');

  const globalIds = new Set([content.contentId]);
  const bundle = content.bundle;
  if (!requireObject(bundle, location + '.bundle')) return;
  requireId(bundle.bundleId, location + '.bundle.bundleId');
  if (globalIds.has(bundle.bundleId)) fail(location + '.bundle.bundleId', 'duplicates globally scoped ID');
  globalIds.add(bundle.bundleId);
  requireString(bundle.title, location + '.bundle.title');
  requireEnum(bundle.lifeArea, LIFE_AREAS, location + '.bundle.lifeArea');
  coverageState.lifeAreas.add(bundle.lifeArea);
  validateUniqueStrings(bundle.topicTags, location + '.bundle.topicTags');
  validateUniqueStrings(bundle.flowIds, location + '.bundle.flowIds', { nonEmpty: true });

  const flows = buildEntityMap(content.flows, 'flowId', location + '.flows', globalIds);
  const steps = buildEntityMap(content.steps, 'stepId', location + '.steps', globalIds);
  const items = buildEntityMap(content.items, 'itemId', location + '.items', globalIds);
  const fields = buildEntityMap(content.fields, 'fieldId', location + '.fields', globalIds);
  const memos = buildEntityMap(content.memos, 'memoId', location + '.memos', globalIds);
  const sources = buildEntityMap(content.sources, 'sourceId', location + '.sources', globalIds);
  const snapshots = buildEntityMap(content.sourceSnapshots, 'snapshotId', location + '.sourceSnapshots', globalIds);
  const sourceRows = buildEntityMap(content.sourceRows, 'sourceRowId', location + '.sourceRows', globalIds);
  const sourceRefs = buildEntityMap(content.sourceRefs, 'sourceRefId', location + '.sourceRefs', globalIds);

  if (flows.size === 0) fail(location + '.flows', 'positive content requires at least one Flow');
  if (steps.size === 0) fail(location + '.steps', 'positive content requires at least one Step');
  if (items.size === 0) fail(location + '.items', 'positive content requires at least one Item');
  if (sources.size === 0) fail(location + '.sources', 'positive content requires at least one Source');
  if (snapshots.size === 0) fail(location + '.sourceSnapshots', 'positive content requires at least one SourceSnapshot');
  if (sourceRows.size === 0) fail(location + '.sourceRows', 'positive content requires at least one SourceRow');
  if (sourceRefs.size === 0) fail(location + '.sourceRefs', 'positive content requires at least one SourceRef');

  for (const flowId of bundle.flowIds ?? []) {
    if (!flows.has(flowId)) fail(location + '.bundle.flowIds', flowId + ' does not resolve to a Flow');
  }
  for (const [flowId, flow] of flows) {
    const flowLocation = location + '.flows[' + flowId + ']';
    if (flow.bundleId !== bundle.bundleId) fail(flowLocation + '.bundleId', 'must match bundle.bundleId');
    requireString(flow.title, flowLocation + '.title');
    requireString(flow.userNeed, flowLocation + '.userNeed');
    requireId(flow.primarySourceId, flowLocation + '.primarySourceId');
    if (!sources.has(flow.primarySourceId)) fail(flowLocation + '.primarySourceId', 'does not resolve to a Source');
    const supporting = validateUniqueStrings(flow.supportingSourceIds, flowLocation + '.supportingSourceIds');
    for (const sourceId of supporting) {
      if (!sources.has(sourceId)) fail(flowLocation + '.supportingSourceIds', sourceId + ' does not resolve to a Source');
      if (sourceId === flow.primarySourceId) fail(flowLocation + '.supportingSourceIds', 'cannot repeat primarySourceId');
    }
    requireEnum(flow.planningPattern, PLANNING_PATTERNS, flowLocation + '.planningPattern');
    coverageState.planningPatterns.add(flow.planningPattern);
    const secondaryPatterns = validateUniqueStrings(flow.secondaryPatterns, flowLocation + '.secondaryPatterns');
    for (const pattern of secondaryPatterns) {
      requireEnum(pattern, PLANNING_PATTERNS, flowLocation + '.secondaryPatterns');
      coverageState.planningPatterns.add(pattern);
      if (pattern === flow.planningPattern) fail(flowLocation + '.secondaryPatterns', 'cannot repeat primary planningPattern');
    }
    requireEnum(flow.primaryArtifact, NATURAL_ARTIFACTS, flowLocation + '.primaryArtifact');
    requireEnum(flow.riskLevel, RISK_LEVELS, flowLocation + '.riskLevel');
    const setupFields = validateUniqueStrings(flow.setupFieldIds, flowLocation + '.setupFieldIds');
    for (const fieldId of setupFields) {
      if (!fields.has(fieldId)) fail(flowLocation + '.setupFieldIds', fieldId + ' does not resolve to a Field');
    }
    if (flow.anchorDefinition !== undefined) {
      const anchor = flow.anchorDefinition;
      if (requireObject(anchor, flowLocation + '.anchorDefinition')) {
        requireId(anchor.fieldId, flowLocation + '.anchorDefinition.fieldId');
        if (!fields.has(anchor.fieldId)) fail(flowLocation + '.anchorDefinition.fieldId', 'does not resolve to a Field');
        if (!setupFields.has(anchor.fieldId)) fail(flowLocation + '.anchorDefinition.fieldId', 'must also appear in setupFieldIds');
        requireEnum(anchor.kind, ANCHOR_KINDS, flowLocation + '.anchorDefinition.kind');
        requireString(anchor.label, flowLocation + '.anchorDefinition.label');
        requireBoolean(anchor.required, flowLocation + '.anchorDefinition.required');
      }
    }
    const flowStepIds = validateUniqueStrings(flow.stepIds, flowLocation + '.stepIds', { nonEmpty: true });
    const stepOrders = new Map();
    for (const stepId of flowStepIds) {
      const step = steps.get(stepId);
      if (!step) fail(flowLocation + '.stepIds', stepId + ' does not resolve to a Step');
      else {
        if (step.flowId !== flowId) fail(flowLocation + '.stepIds', stepId + ' belongs to another Flow');
        if (Number.isInteger(step.order)) {
          if (stepOrders.has(step.order)) {
            fail(
              flowLocation + '.stepIds',
              stepId + ' duplicates Step.order ' + step.order + ' used by ' + stepOrders.get(step.order),
            );
          } else {
            stepOrders.set(step.order, stepId);
          }
        }
      }
    }

    if (!requireArray(flow.projectionProfiles, flowLocation + '.projectionProfiles', { nonEmpty: true })) continue;
    for (let index = 0; index < flow.projectionProfiles.length; index += 1) {
      const profile = flow.projectionProfiles[index];
      const profileLocation = flowLocation + '.projectionProfiles[' + index + ']';
      if (!requireObject(profile, profileLocation)) continue;
      requireEnum(profile.target, PROJECTION_TARGETS, profileLocation + '.target');
      coverageState.projectionTargets.add(profile.target);
      if (requireArray(profile.formats, profileLocation + '.formats', { nonEmpty: true })) {
        profile.formats.forEach((format, formatIndex) => {
          requireEnum(format, PROJECTION_FORMATS, profileLocation + '.formats[' + formatIndex + ']');
          if (
            PROJECTION_FORMATS_BY_TARGET.has(profile.target)
            && !PROJECTION_FORMATS_BY_TARGET.get(profile.target).has(format)
          ) {
            fail(profileLocation + '.formats[' + formatIndex + ']', 'is not valid for target ' + profile.target);
          }
          coverageState.actualProjectionPairs.add(projectionPair(profile.target, format));
        });
      }
      requireEnum(profile.granularity, PROJECTION_GRANULARITIES, profileLocation + '.granularity');
      if (profile.groupBy !== undefined) requireEnum(profile.groupBy, PROJECTION_GROUPS, profileLocation + '.groupBy');
      requireBoolean(profile.includeSource, profileLocation + '.includeSource');
      requireBoolean(profile.includeCautions, profileLocation + '.includeCautions');
      requireBoolean(profile.includeUserMemo, profileLocation + '.includeUserMemo');
    }
  }

  for (const [stepId, step] of steps) {
    const stepLocation = location + '.steps[' + stepId + ']';
    if (!flows.has(step.flowId)) fail(stepLocation + '.flowId', 'does not resolve to a Flow');
    requireString(step.title, stepLocation + '.title');
    requireInteger(step.order, stepLocation + '.order', 0);
    const stepItemIds = validateUniqueStrings(step.itemIds, stepLocation + '.itemIds', { nonEmpty: true });
    const itemOrders = new Map();
    for (const itemId of stepItemIds) {
      const item = items.get(itemId);
      if (!item) fail(stepLocation + '.itemIds', itemId + ' does not resolve to an Item');
      else {
        if (item.stepId !== stepId) fail(stepLocation + '.itemIds', itemId + ' belongs to another Step');
        if (Number.isInteger(item.order)) {
          if (itemOrders.has(item.order)) {
            fail(
              stepLocation + '.itemIds',
              itemId + ' duplicates Item.order ' + item.order + ' used by ' + itemOrders.get(item.order),
            );
          } else {
            itemOrders.set(item.order, itemId);
          }
        }
      }
    }
    const refs = validateUniqueStrings(step.sourceRefIds, stepLocation + '.sourceRefIds');
    for (const refId of refs) {
      const ref = sourceRefs.get(refId);
      if (!ref) fail(stepLocation + '.sourceRefIds', refId + ' does not resolve');
      else if (ref.entityType !== 'step' || ref.entityId !== stepId) {
        fail(stepLocation + '.sourceRefIds', refId + ' does not point back to this Step');
      }
    }
  }

  for (const [fieldId, field] of fields) {
    const fieldLocation = location + '.fields[' + fieldId + ']';
    if (requireObject(field.owner, fieldLocation + '.owner')) {
      requireEnum(field.owner.type, new Set(['flow', 'item']), fieldLocation + '.owner.type');
      requireId(field.owner.id, fieldLocation + '.owner.id');
      const ownerMap = field.owner.type === 'flow' ? flows : items;
      if (!ownerMap.has(field.owner.id)) fail(fieldLocation + '.owner.id', 'does not resolve to owner');
    }
    requireString(field.key, fieldLocation + '.key');
    requireString(field.label, fieldLocation + '.label');
    requireEnum(field.valueType, FIELD_VALUE_TYPES, fieldLocation + '.valueType');
    if (requireArray(field.purposes, fieldLocation + '.purposes', { nonEmpty: true })) {
      field.purposes.forEach((purpose, index) => requireEnum(purpose, FIELD_PURPOSES, fieldLocation + '.purposes[' + index + ']'));
    }
    requireEnum(field.valueSource, FIELD_VALUE_SOURCES, fieldLocation + '.valueSource');
    requireBoolean(field.required, fieldLocation + '.required');
    if (field.sensitive !== undefined) requireBoolean(field.sensitive, fieldLocation + '.sensitive');
    const refs = field.sourceRefIds === undefined
      ? new Set()
      : validateUniqueStrings(field.sourceRefIds, fieldLocation + '.sourceRefIds');
    for (const refId of refs) {
      const ref = sourceRefs.get(refId);
      if (!ref) fail(fieldLocation + '.sourceRefIds', refId + ' does not resolve');
      else if (ref.entityType !== 'field' || ref.entityId !== fieldId) {
        fail(fieldLocation + '.sourceRefIds', refId + ' does not point back to this Field');
      }
    }
  }

  for (const [memoId, memo] of memos) {
    const memoLocation = location + '.memos[' + memoId + ']';
    if (requireObject(memo.scope, memoLocation + '.scope')) {
      requireEnum(memo.scope.type, new Set(['flow', 'step', 'item']), memoLocation + '.scope.type');
      requireId(memo.scope.id, memoLocation + '.scope.id');
      const ownerMap = memo.scope.type === 'flow' ? flows : memo.scope.type === 'step' ? steps : items;
      if (!ownerMap.has(memo.scope.id)) fail(memoLocation + '.scope.id', 'does not resolve to scope owner');
    }
    requireEnum(memo.kind, MEMO_KINDS, memoLocation + '.kind');
    requireString(memo.text, memoLocation + '.text');
    const refs = memo.sourceRefIds === undefined
      ? new Set()
      : validateUniqueStrings(memo.sourceRefIds, memoLocation + '.sourceRefIds');
    for (const refId of refs) {
      const ref = sourceRefs.get(refId);
      if (!ref) fail(memoLocation + '.sourceRefIds', refId + ' does not resolve');
      else if (ref.entityType !== 'memo' || ref.entityId !== memoId) {
        fail(memoLocation + '.sourceRefIds', refId + ' does not point back to this Memo');
      }
    }
  }

  for (const [itemId, item] of items) {
    const itemLocation = location + '.items[' + itemId + ']';
    if (!steps.has(item.stepId)) fail(itemLocation + '.stepId', 'does not resolve to a Step');
    requireString(item.title, itemLocation + '.title');
    requireEnum(item.intent, ITEM_INTENTS, itemLocation + '.intent');
    requireInteger(item.order, itemLocation + '.order', 0);
    const fieldIds = validateUniqueStrings(item.fieldIds, itemLocation + '.fieldIds');
    for (const fieldId of fieldIds) {
      const field = fields.get(fieldId);
      if (!field) fail(itemLocation + '.fieldIds', fieldId + ' does not resolve');
      else if (field.owner?.type !== 'item' || field.owner?.id !== itemId) {
        fail(itemLocation + '.fieldIds', fieldId + ' is not owned by this Item');
      }
    }
    const memoIds = validateUniqueStrings(item.memoIds, itemLocation + '.memoIds');
    for (const memoId of memoIds) {
      const memo = memos.get(memoId);
      if (!memo) fail(itemLocation + '.memoIds', memoId + ' does not resolve');
      else if (memo.scope?.type !== 'item' || memo.scope?.id !== itemId) {
        fail(itemLocation + '.memoIds', memoId + ' is not scoped to this Item');
      }
    }
    const cautionMemoIds = validateUniqueStrings(item.cautionMemoIds, itemLocation + '.cautionMemoIds');
    for (const memoId of cautionMemoIds) {
      const memo = memos.get(memoId);
      if (!memo) fail(itemLocation + '.cautionMemoIds', memoId + ' does not resolve');
      else {
        if (memo.kind !== 'caution') fail(itemLocation + '.cautionMemoIds', memoId + ' is not a caution Memo');
        if (memo.scope?.type !== 'item' || memo.scope?.id !== itemId) {
          fail(itemLocation + '.cautionMemoIds', memoId + ' is not scoped to this Item');
        }
      }
    }
    validateCompletion(item.completion, itemLocation + '.completion', fields, fieldIds, coverageState);
    if (item.schedule !== undefined) validateSchedule(item.schedule, itemLocation + '.schedule', fields, coverageState);
    const refIds = validateUniqueStrings(item.sourceRefIds, itemLocation + '.sourceRefIds', { nonEmpty: true });
    let hasPublishableSupport = false;
    for (const refId of refIds) {
      const ref = sourceRefs.get(refId);
      if (!ref) {
        fail(itemLocation + '.sourceRefIds', refId + ' does not resolve');
        continue;
      }
      if (ref.entityType !== 'item' || ref.entityId !== itemId) {
        fail(itemLocation + '.sourceRefIds', refId + ' does not point back to this Item');
      }
      if (
        ref.supportLevel === 'direct'
        || ref.supportLevel === 'creator_interpretation'
        || ref.supportLevel === 'user_request'
      ) {
        hasPublishableSupport = true;
      }
      if (ref.supportLevel === 'inferred_draft') {
        fail(itemLocation + '.sourceRefIds', 'positive fixture cannot publish inferred_draft support');
      }
    }
    if (!hasPublishableSupport) {
      fail(itemLocation + '.sourceRefIds', 'requires direct, creator_interpretation, or user_request support');
    }
  }

  for (const [sourceId, source] of sources) {
    const sourceLocation = location + '.sources[' + sourceId + ']';
    requireString(source.title, sourceLocation + '.title');
    requireEnum(source.sourceType, SOURCE_TYPES, sourceLocation + '.sourceType');
    requireUrl(source.originalUrl, sourceLocation + '.originalUrl');
    requireUrl(source.canonicalUrl, sourceLocation + '.canonicalUrl');
    requireDate(source.checkedAt, sourceLocation + '.checkedAt');
    requireEnum(source.rightsStatus, RIGHTS_STATUSES, sourceLocation + '.rightsStatus');
    requireEnum(source.riskLevel, RISK_LEVELS, sourceLocation + '.riskLevel');
  }

  for (const [snapshotId, snapshot] of snapshots) {
    const snapshotLocation = location + '.sourceSnapshots[' + snapshotId + ']';
    requireId(snapshot.sourceId, snapshotLocation + '.sourceId');
    if (!sources.has(snapshot.sourceId)) fail(snapshotLocation + '.sourceId', 'does not resolve to a Source');
    requireDate(snapshot.fetchedAt, snapshotLocation + '.fetchedAt');
    requireUrl(snapshot.finalUrl, snapshotLocation + '.finalUrl');
    requireRawHash(snapshot.contentHash, snapshotLocation + '.contentHash');
    requireString(snapshot.extractionVersion, snapshotLocation + '.extractionVersion');
  }

  const sourceRowOrdersBySnapshot = new Map();
  for (const [rowId, row] of sourceRows) {
    const rowLocation = location + '.sourceRows[' + rowId + ']';
    requireId(row.sourceId, rowLocation + '.sourceId');
    if (!sources.has(row.sourceId)) fail(rowLocation + '.sourceId', 'does not resolve to a Source');
    requireId(row.snapshotId, rowLocation + '.snapshotId');
    const snapshot = snapshots.get(row.snapshotId);
    if (!snapshot) {
      fail(rowLocation + '.snapshotId', 'does not resolve to a SourceSnapshot');
    } else if (snapshot.sourceId !== row.sourceId) {
      fail(rowLocation + '.snapshotId', 'snapshot belongs to a different Source');
    }
    requireEnum(row.rowType, SOURCE_ROW_TYPES, rowLocation + '.rowType');
    requireString(row.title, rowLocation + '.title');
    requireInteger(row.order, rowLocation + '.order', 0);
    if (typeof row.snapshotId === 'string' && Number.isInteger(row.order)) {
      const orders = sourceRowOrdersBySnapshot.get(row.snapshotId) ?? new Map();
      if (orders.has(row.order)) {
        fail(
          rowLocation + '.order',
          'duplicates SourceRow.order ' + row.order + ' used by ' + orders.get(row.order) + ' in the same Snapshot',
        );
      } else {
        orders.set(row.order, rowId);
      }
      sourceRowOrdersBySnapshot.set(row.snapshotId, orders);
    }
  }

  const entityMaps = {
    flow: flows,
    step: steps,
    item: items,
    field: fields,
    memo: memos,
  };
  for (const [refId, ref] of sourceRefs) {
    const refLocation = location + '.sourceRefs[' + refId + ']';
    requireEnum(ref.entityType, new Set(Object.keys(entityMaps)), refLocation + '.entityType');
    requireId(ref.entityId, refLocation + '.entityId');
    const entityMap = entityMaps[ref.entityType];
    if (!entityMap?.has(ref.entityId)) fail(refLocation + '.entityId', 'does not resolve to declared entity type');
    if (requireArray(ref.sourceRowIds, refLocation + '.sourceRowIds', { nonEmpty: true })) {
      ref.sourceRowIds.forEach((rowId, index) => {
        requireId(rowId, refLocation + '.sourceRowIds[' + index + ']');
        if (!sourceRows.has(rowId)) fail(refLocation + '.sourceRowIds[' + index + ']', 'does not resolve to a SourceRow');
      });
    }
    requireEnum(ref.relation, SOURCE_RELATIONS, refLocation + '.relation');
    requireEnum(ref.supportLevel, SOURCE_SUPPORT_LEVELS, refLocation + '.supportLevel');
  }

  for (let index = 0; index < review.omittedRows.length; index += 1) {
    const omission = review.omittedRows[index];
    if (!sourceRows.has(omission.sourceRowId)) {
      fail(location + ' review.omittedRows[' + index + ']', 'does not resolve to a SourceRow in content');
    }
  }

  for (const expected of expectations.expected) {
    if (!coverageState.actualProjectionPairs.has(expected)) {
      fail(location + ' projectionExpectations.expected', expected + ' has no matching ProjectionProfile');
    }
  }
  for (const forbidden of expectations.forbidden) {
    if (coverageState.actualProjectionPairs.has(forbidden)) {
      fail(location + ' projectionExpectations.forbidden', forbidden + ' is emitted by a ProjectionProfile');
    }
  }
  if (expectations.expected.has('calendar:ics')) {
    const hasSchedule = [...items.values()].some((item) => isObject(item.schedule));
    if (!hasSchedule) fail(location, 'calendar:ics expectation requires at least one scheduled Item');
  }
}

function validateCoverageList(values, location, allowed) {
  const entries = validateUniqueStrings(values, location, { nonEmpty: true });
  for (const entry of entries) requireEnum(entry, allowed, location);
  return entries;
}

let document;
try {
  document = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
} catch (error) {
  console.error('Canonical Flow fixture validation failed before schema checks.');
  console.error(String(error));
  process.exit(1);
}

if (!requireObject(document, 'document')) {
  process.exit(1);
}
if (document.fixtureSchemaVersion !== FIXTURE_SCHEMA_VERSION) {
  fail('document.fixtureSchemaVersion', 'must equal ' + FIXTURE_SCHEMA_VERSION);
}
if (document.canonicalSchemaVersion !== CANONICAL_SCHEMA_VERSION) {
  fail('document.canonicalSchemaVersion', 'must equal ' + CANONICAL_SCHEMA_VERSION);
}
requireDate(document.generatedAt, 'document.generatedAt');

const coverage = document.coverage;
if (!requireObject(coverage, 'document.coverage')) {
  process.exit(1);
}
const requiredPositiveShapes = validateUniqueStrings(
  coverage.requiredPositiveShapes,
  'document.coverage.requiredPositiveShapes',
  { nonEmpty: true },
);
const requiredNegativeShapes = validateUniqueStrings(
  coverage.requiredNegativeShapes,
  'document.coverage.requiredNegativeShapes',
  { nonEmpty: true },
);
const requiredLifeAreas = validateCoverageList(
  coverage.requiredLifeAreas,
  'document.coverage.requiredLifeAreas',
  LIFE_AREAS,
);
const requiredPlanningPatterns = validateCoverageList(
  coverage.requiredPlanningPatterns,
  'document.coverage.requiredPlanningPatterns',
  PLANNING_PATTERNS,
);
const requiredProjectionTargets = validateCoverageList(
  coverage.requiredProjectionTargets,
  'document.coverage.requiredProjectionTargets',
  PROJECTION_TARGETS,
);
const requiredCompletionModes = validateCoverageList(
  coverage.requiredCompletionModes,
  'document.coverage.requiredCompletionModes',
  COMPLETION_MODES,
);
const requiredScheduleModes = validateCoverageList(
  coverage.requiredScheduleModes,
  'document.coverage.requiredScheduleModes',
  SCHEDULE_MODES,
);

if (!requireArray(document.fixtures, 'document.fixtures', { nonEmpty: true })) {
  process.exit(1);
}

const fixtureIds = new Set();
const positiveShapes = new Map();
const negativeShapes = new Map();
const aggregateCoverage = {
  lifeAreas: new Set(),
  planningPatterns: new Set(),
  projectionTargets: new Set(),
  completionModes: new Set(),
  scheduleModes: new Set(),
};
let positiveCount = 0;
let negativeCount = 0;

for (let index = 0; index < document.fixtures.length; index += 1) {
  const fixture = document.fixtures[index];
  const location = 'document.fixtures[' + index + ']';
  if (!requireObject(fixture, location)) continue;
  if (requireId(fixture.fixtureId, location + '.fixtureId')) {
    if (fixtureIds.has(fixture.fixtureId)) fail(location + '.fixtureId', 'duplicates fixture ID');
    fixtureIds.add(fixture.fixtureId);
  }
  requireEnum(fixture.kind, new Set(['positive', 'negative']), location + '.kind');
  requireString(fixture.shape, location + '.shape');
  requireString(fixture.name, location + '.name');
  validateUniqueStrings(fixture.legacyRefs, location + '.legacyRefs', { nonEmpty: true });
  validateReview(fixture.review, location + '.review');
  const expectations = validateProjectionExpectations(
    fixture.projectionExpectations,
    location + '.projectionExpectations',
  );

  if (fixture.kind === 'positive') {
    positiveCount += 1;
    positiveShapes.set(fixture.shape, (positiveShapes.get(fixture.shape) ?? 0) + 1);
    if (fixture.content === null) fail(location + '.content', 'positive fixture requires canonical content');
    if (!POSITIVE_READINESS.has(fixture.review?.readiness)) {
      fail(location + '.review.readiness', 'positive fixture must be canary or second-wave ready');
    }
    if ((fixture.review?.hardFails ?? []).length > 0) {
      fail(location + '.review.hardFails', 'positive fixture cannot contain hard fails');
    }
    if (expectations.expected.size === 0) fail(location + '.projectionExpectations.expected', 'positive fixture requires an expected projection');
    if (expectations.forbidden.size === 0) fail(location + '.projectionExpectations.forbidden', 'positive fixture requires a forbidden projection');
    const fixtureCoverage = {
      lifeAreas: aggregateCoverage.lifeAreas,
      planningPatterns: aggregateCoverage.planningPatterns,
      projectionTargets: aggregateCoverage.projectionTargets,
      completionModes: aggregateCoverage.completionModes,
      scheduleModes: aggregateCoverage.scheduleModes,
      actualProjectionPairs: new Set(),
    };
    validateContent(fixture.content, fixture.review, expectations, location + '.content', fixtureCoverage);
  } else if (fixture.kind === 'negative') {
    negativeCount += 1;
    negativeShapes.set(fixture.shape, (negativeShapes.get(fixture.shape) ?? 0) + 1);
    if (fixture.content !== null) fail(location + '.content', 'negative fixture must emit content: null');
    if (fixture.shape === 'missing_source_rows' && fixture.review?.readiness !== 'source_import_required') {
      fail(location + '.review.readiness', 'missing source rows must be source_import_required');
    }
    if (fixture.shape === 'nonlocal_sensitive_source' && fixture.review?.readiness !== 'hold') {
      fail(location + '.review.readiness', 'non-local sensitive source must be hold');
    }
    if (expectations.expected.size !== 0) fail(location + '.projectionExpectations.expected', 'negative fixture cannot expect projections');
    for (const target of requiredProjectionTargets) {
      const targetIsForbidden = [...expectations.forbidden].some((pair) => pair.startsWith(target + ':'));
      if (!targetIsForbidden) fail(location + '.projectionExpectations.forbidden', 'negative fixture must forbid target ' + target);
    }
  }
}

if (positiveCount !== 10) fail('document.fixtures', 'must contain exactly 10 positive fixtures, found ' + positiveCount);
if (negativeCount !== 2) fail('document.fixtures', 'must contain exactly 2 negative fixtures, found ' + negativeCount);

for (const shape of requiredPositiveShapes) {
  const count = positiveShapes.get(shape) ?? 0;
  if (count !== 1) fail('coverage.positiveShapes', shape + ' must occur exactly once, found ' + count);
}
for (const shape of positiveShapes.keys()) {
  if (!requiredPositiveShapes.has(shape)) fail('coverage.positiveShapes', 'unexpected positive shape ' + shape);
}
for (const shape of requiredNegativeShapes) {
  const count = negativeShapes.get(shape) ?? 0;
  if (count !== 1) fail('coverage.negativeShapes', shape + ' must occur exactly once, found ' + count);
}
for (const shape of negativeShapes.keys()) {
  if (!requiredNegativeShapes.has(shape)) fail('coverage.negativeShapes', 'unexpected negative shape ' + shape);
}

for (const [label, required, actual] of [
  ['life area', requiredLifeAreas, aggregateCoverage.lifeAreas],
  ['planning pattern', requiredPlanningPatterns, aggregateCoverage.planningPatterns],
  ['projection target', requiredProjectionTargets, aggregateCoverage.projectionTargets],
  ['completion mode', requiredCompletionModes, aggregateCoverage.completionModes],
  ['schedule mode', requiredScheduleModes, aggregateCoverage.scheduleModes],
]) {
  for (const value of required) {
    if (!actual.has(value)) fail('coverage', 'missing required ' + label + ' ' + value);
  }
}

if (errors.length > 0) {
  console.error('Canonical Flow fixture validation failed with ' + errors.length + ' error(s):');
  errors.forEach((error, index) => console.error(String(index + 1).padStart(3, ' ') + '. ' + error));
  process.exit(1);
}

console.log(
  'Canonical Flow fixtures valid: '
    + positiveCount
    + ' positive, '
    + negativeCount
    + ' negative, '
    + aggregateCoverage.lifeAreas.size
    + ' life areas, '
    + aggregateCoverage.planningPatterns.size
    + ' planning patterns, '
    + aggregateCoverage.projectionTargets.size
    + ' projection targets.',
);
