import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ContractValidationError,
  validateAgainstSchema,
  validateTaxonomyAssignment,
} from '../2026-07-20-flowme-taxonomy-v1-1/validate-taxonomy-v1-1.mjs';

export { ContractValidationError, validateAgainstSchema };

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const taxonomyDir = path.resolve(here, '..', '2026-07-20-flowme-taxonomy-v1-1');
const RUN_VERSION = 'flowme-url-to-flow-output-run-v2';
const OUTPUT_VERSION = 'flowme-url-to-flow-output-envelope-v2';
const REVIEW_VERSION = 'flowme-output-quality-review-results-v2';
const PROJECTIONS = ['calendar', 'checklist', 'todo', 'sheet', 'memo'];
const ROLES = ['item', 'field', 'memo', 'reference', 'conditional_response', 'omission'];
const LANES = ['core_positive', 'core_boundary', 'positive_control', 'negative_control'];
const REVIEWER_LANES = ['rules_first', 'low_cost_independent', 'high_capability_independent'];
const ROLE_COLLECTION = {
  item: ['items', 'itemId'],
  field: ['fields', 'fieldId'],
  memo: ['memos', 'memoId'],
  reference: ['references', 'referenceId'],
  conditional_response: ['conditionalResponses', 'conditionalResponseId'],
};

function issue(code, at, message) {
  return { code, path: at, message };
}

function ensure(condition, errors, code, at, message) {
  if (!condition) errors.push(issue(code, at, message));
}

function throwIf(errors, label) {
  if (errors.length) throw new ContractValidationError(`${label} failed`, errors);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unique(values) {
  return new Set(values).size === values.length;
}

function sameSet(left = [], right = []) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((value, index) => value === b[index]);
}

function exactKeys(value, keys) {
  return isObject(value) && sameSet(Object.keys(value), keys);
}

function normalizeText(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ko-KR');
}

function payloadContainsText(payload, value) {
  const needle = normalizeText(value);
  return needle.length > 0 && normalizeText(JSON.stringify(payload)).includes(needle);
}

function deepValuesForKey(value, key, found = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => deepValuesForKey(entry, key, found));
    return found;
  }
  if (!isObject(value)) return found;
  for (const [childKey, child] of Object.entries(value)) {
    if (childKey === key) found.push(child);
    deepValuesForKey(child, key, found);
  }
  return found;
}

function hasNonEmptyDeepValue(payload, key) {
  return deepValuesForKey(payload, key).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (isObject(value)) return Object.keys(value).length > 0;
    return value !== null && value !== undefined && String(value).length > 0;
  });
}

function hasDeepKey(payload, key) {
  return deepValuesForKey(payload, key).length > 0;
}

function canonicalWarnings(draft) {
  return [
    ...draft.memos.filter((entry) => entry.kind === 'caution').map((entry) => entry.text),
    ...draft.conditionalResponses
      .filter((entry) => ['caution', 'stop', 'emergency'].includes(entry.severity))
      .map((entry) => `${entry.trigger}: ${entry.response}`),
  ];
}

function containsAllCanonicalText(payload, values) {
  return values.length > 0 && values.every((value) => payloadContainsText(payload, value));
}

function projectionSemanticEvidence(envelope, artifact, field, payload) {
  const draft = envelope.canonicalDraft;
  const payloadText = normalizeText(JSON.stringify(payload));
  const tasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
  const groups = Array.isArray(payload?.groups) ? payload.groups : [];
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  const fields = Array.isArray(payload?.fields) ? payload.fields : [];
  const notes = Array.isArray(payload?.notes) ? payload.notes : [];
  const references = Array.isArray(payload?.references) ? payload.references : [];
  const conditions = Array.isArray(payload?.conditions) ? payload.conditions : [];
  const groupedEntries = groups.flatMap((group) => Array.isArray(group.entries) ? group.entries : []);
  const warnings = canonicalWarnings(draft);
  const canonicalReferences = draft.references.map((entry) => entry.label);
  const hasItems = draft.items.length > 0;
  const allItemTitles = hasItems && containsAllCanonicalText(payload, draft.items.map((entry) => entry.title));
  const allDoneWhen = hasItems && containsAllCanonicalText(payload, draft.items.map((entry) => entry.completion.doneWhen));
  const allWarnings = warnings.length > 0 && containsAllCanonicalText(payload, warnings);
  const allReferences = canonicalReferences.length > 0 && containsAllCanonicalText(payload, canonicalReferences);

  const common = {
    title: hasNonEmptyDeepValue(payload, 'title'),
    sourceUrl: hasNonEmptyDeepValue(payload, 'sourceUrl'),
    doneWhen: hasNonEmptyDeepValue(payload, 'doneWhen') && allDoneWhen,
    completion: (hasNonEmptyDeepValue(payload, 'doneWhen') && allDoneWhen) || (Array.isArray(payload?.rows) && payload.rows.length > 0),
    warning: allWarnings,
    localizeBoundary: allWarnings,
    legalBoundary: allWarnings || allReferences,
    safetyReference: allReferences,
    officialBoundary: allReferences,
    prescriptionBoundary: allReferences,
  };
  if (field in common) return common[field];

  if (artifact === 'calendar') {
    if (field === 'schedule') return hasNonEmptyDeepValue(payload, 'schedule') || hasNonEmptyDeepValue(payload, 'date');
    if (field === 'anchorOffset') return entries.some((entry) => isObject(entry.schedule) && typeof entry.schedule.value === 'string' && entry.schedule.value.length > 0 && hasUserInputBoundary(entry.schedule.userInputPath));
    if (field === 'courseWindow') return typeof payload?.courseWindow === 'string' && payload.courseWindow.length > 0;
    if (field === 'windowStart') return fields.some((entry) => /(?:시작|start)/iu.test(`${entry.label ?? ''} ${entry.value ?? ''}`));
    if (field === 'windowEnd') return fields.some((entry) => /(?:종료|end)/iu.test(`${entry.label ?? ''} ${entry.value ?? ''}`));
    if (field === 'visitDate') return /(?:방문일|visit date|appointment date|예약일)/iu.test(payloadText);
  }

  if (artifact === 'checklist') {
    if (field === 'completion') return common.completion || (Array.isArray(payload?.rows) && payload.rows.length > 0);
    if (['group', 'step'].includes(field)) return groups.length > 0 && groups.every((group) => typeof group.title === 'string' && group.title.length > 0);
    if (field === 'order') return groupedEntries.length > 0 && allItemTitles;
    if (field === 'document') return groupedEntries.length > 0 && /(?:서류|신분증|여권|document|photo|사진)/iu.test(payloadText);
    if (field === 'condition') return groupedEntries.length > 0 && /(?:조건|경우|해당|if|when)/iu.test(payloadText);
    if (field === 'beforeAction') return /(?:작업 전|실행 전|before|준비)/iu.test(payloadText);
    if (field === 'afterAction') return /(?:작업 후|실행 후|after|회복|마무리)/iu.test(payloadText);
  }

  if (artifact === 'todo') {
    if (field === 'order') return tasks.length > 0 && (tasks.every((entry) => Number.isInteger(entry.order)) || allItemTitles);
    if (['chapter', 'topic', 'nextAction'].includes(field)) return tasks.length > 0 && allItemTitles;
    if (field === 'week') return hasNonEmptyDeepValue(payload, 'week') || /\d+\s*주차/iu.test(payloadText);
    if (field === 'activity') return hasNonEmptyDeepValue(payload, 'activity');
    if (field === 'duration') return hasNonEmptyDeepValue(payload, 'duration') || /\b\d{2}:\d{2}(?::\d{2})?\b/u.test(payloadText);
    if (field === 'phase') return hasNonEmptyDeepValue(payload, 'phase') || hasNonEmptyDeepValue(payload, 'step');
    if (field === 'trigger') return tasks.some((entry) => entry.recurrence !== null || entry.schedule !== null) || hasNonEmptyDeepValue(payload, 'trigger');
  }

  if (artifact === 'sheet') {
    if (field === 'order') return rows.length > 0 && rows.every((entry) => Number.isInteger(entry.order));
    if (['title', 'course', 'topic', 'chapter'].includes(field)) return rows.length > 0 && rows.every((entry) => typeof entry.title === 'string' && entry.title.length > 0);
    if (field === 'status') return rows.length > 0 && rows.every((entry) => typeof entry.status === 'string' && entry.status.length > 0);
    if (['week', 'activity', 'phase', 'evidence', 'note'].includes(field)) return hasDeepKey(payload, field);
    if (field === 'duration') return hasDeepKey(payload, 'duration') || /(?:\d+\s*주|\b\d{2}:\d{2}(?::\d{2})?\b)/u.test(payloadText);
    if (field === 'weeklyHours') return /(?:주\s*\d+\s*[~\-–]\s*\d+\s*시간|weekly\s*hours)/iu.test(payloadText);
    if (field === 'prerequisite') return /(?:선수조건|선행|prerequisite)/iu.test(payloadText);
    if (field === 'criterion') return rows.length > 0 || fields.length > 0;
    if (['option', 'scope', 'tradeoff'].includes(field)) return fields.length >= 2 && fields.every((entry) => hasNonEmptyDeepValue(entry, 'value'));
  }

  if (artifact === 'memo') {
    if (field === 'decision') return Array.isArray(payload?.decisionItems) && payload.decisionItems.length > 0;
    if (field === 'options') return fields.length >= 2;
    if (field === 'tradeoff') return fields.some((entry) => /(?:차이|비용|시간|tradeoff)/iu.test(`${entry.label ?? ''} ${entry.value ?? ''}`));
    if (field === 'unknownCost') return notes.some((entry) => /(?:비용|가격|견적|cost|price)/iu.test(entry.text ?? ''));
    if (field === 'contact') return notes.some((entry) => /(?:신청|연락|전화|contact|\d{2,4}-\d{3,4}-\d{4})/iu.test(entry.text ?? ''));
    if (field === 'challengeQuestions') return notes.some((entry) => /(?:도전|질문|challenge|question)/iu.test(entry.text ?? ''));
    if (field === 'conditions') return conditions.length > 0;
    if (field === 'stopRule') return conditions.some((entry) => entry.severity === 'stop');
    if (field === 'emergency') return conditions.some((entry) => entry.severity === 'emergency');
    if (field === 'beforeAction') return /(?:작업 전|실행 전|before|준비)/iu.test(payloadText);
    if (field === 'afterAction') return /(?:작업 후|실행 후|after|회복|마무리)/iu.test(payloadText);
  }

  return false;
}

export function calculateProjectionPayloadRetention(envelope, goldCase) {
  const byProjection = {};
  for (const artifact of PROJECTIONS) {
    const projection = envelope.projections[artifact];
    const expectedFields = [...(goldCase.essentialProjectionFields?.[artifact] ?? [])];
    const applicable = !['blocked', 'not_applicable'].includes(projection.availability);
    const retainedFields = applicable
      ? expectedFields.filter((field) => projectionSemanticEvidence(envelope, artifact, field, projection.payload))
      : [];
    const missingFields = applicable
      ? expectedFields.filter((field) => !retainedFields.includes(field))
      : [];
    const declaredMissingFields = applicable
      ? expectedFields.filter((field) => !projection.essentialFieldsRetained.includes(field))
      : [];
    byProjection[artifact] = {
      applicable,
      expectedFields,
      retainedFields,
      missingFields,
      declaredMissingFields,
      pass: !applicable || (missingFields.length === 0 && declaredMissingFields.length === 0),
    };
  }
  const applicableEntries = Object.values(byProjection).filter((entry) => entry.applicable);
  const expectedCount = applicableEntries.reduce((sum, entry) => sum + entry.expectedFields.length, 0);
  const retainedCount = applicableEntries.reduce((sum, entry) => sum + entry.retainedFields.length, 0);
  return {
    pass: applicableEntries.every((entry) => entry.pass),
    expectedCount,
    retainedCount,
    retentionRate: ratio(retainedCount, expectedCount),
    byProjection,
  };
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(values, percentileValue) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(percentileValue * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function ratio(numerator, denominator) {
  return denominator === 0 ? 1 : numerator / denominator;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function requiredJson(file, label, errors) {
  if (!fs.existsSync(file)) {
    errors.push(issue('missing_artifact', file, `Required ${label} is missing.`));
    return null;
  }
  try {
    return readJson(file);
  } catch (error) {
    errors.push(issue('invalid_json', file, `${label} is not valid JSON: ${error.message}`));
    return null;
  }
}

function collectJsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectJsonFiles(target);
    return entry.isFile() && entry.name.endsWith('.json') ? [target] : [];
  }).sort();
}

function normalizeSchemaErrors(error, prefix) {
  return (error.errors || [error.message]).map((entry) => {
    if (isObject(entry) && entry.code) return entry;
    return issue('json_schema', prefix, typeof entry === 'string' ? entry : JSON.stringify(entry));
  });
}

function caseMap(document) {
  return new Map((document?.cases || []).map((entry) => [entry.caseId, entry]));
}

function laneOf(entry) {
  return entry?.lane;
}

export function validateManifest(manifest, { requireFullPortfolio = true } = {}) {
  const errors = [];
  ensure(manifest?.documentType === 'flowme_output_quality_case_manifest', errors, 'manifest_type', 'manifest.documentType', 'Unexpected manifest documentType.');
  ensure(typeof manifest?.caseSetVersion === 'string' && manifest.caseSetVersion.length > 0, errors, 'manifest_version', 'manifest.caseSetVersion', 'caseSetVersion is required.');
  ensure(Array.isArray(manifest?.cases), errors, 'manifest_cases', 'manifest.cases', 'cases must be an array.');
  if (Array.isArray(manifest?.cases)) {
    const ids = manifest.cases.map((entry) => entry.caseId);
    ensure(unique(ids), errors, 'duplicate_case', 'manifest.cases', 'caseId values must be unique.');
    for (const [index, entry] of manifest.cases.entries()) {
      ensure(typeof entry.caseId === 'string' && entry.caseId.length > 0, errors, 'case_id', `manifest.cases[${index}].caseId`, 'caseId is required.');
      ensure(LANES.includes(laneOf(entry)), errors, 'case_lane', `manifest.cases[${index}].lane`, 'Unsupported portfolio lane.');
    }
    if (requireFullPortfolio) {
      ensure(manifest.cases.length === 18, errors, 'case_count', 'manifest.cases', 'Exactly 18 cases are required.');
      const counts = Object.fromEntries(LANES.map((lane) => [lane, manifest.cases.filter((entry) => laneOf(entry) === lane).length]));
      ensure(counts.core_positive === 8, errors, 'lane_count', 'manifest.cases', 'core_positive must contain 8 cases.');
      ensure(counts.core_boundary === 4, errors, 'lane_count', 'manifest.cases', 'core_boundary must contain 4 cases.');
      ensure(counts.positive_control === 4, errors, 'lane_count', 'manifest.cases', 'positive_control must contain 4 cases.');
      ensure(counts.negative_control === 2, errors, 'lane_count', 'manifest.cases', 'negative_control must contain 2 cases.');
    }
  }
  throwIf(errors, 'case manifest');
  return true;
}

function validateGoldDisposition(value, at, errors) {
  ensure(isObject(value), errors, 'gold_disposition', at, 'expectedDisposition must be an object.');
  if (!isObject(value)) return;
  ensure(['completed', 'failed'].includes(value.generationState), errors, 'gold_disposition', `${at}.generationState`, 'Unsupported generationState.');
  ensure(['proposal', 'no_proposal', 'rejected'].includes(value.outcome), errors, 'gold_disposition', `${at}.outcome`, 'Unsupported outcome.');
  ensure(['ready_for_internal_canary', 'ready_second_wave', 'source_import_required', 'hold'].includes(value.conversionReadiness), errors, 'gold_disposition', `${at}.conversionReadiness`, 'Unsupported conversionReadiness.');
  ensure(typeof value.executableAllowed === 'boolean', errors, 'gold_disposition', `${at}.executableAllowed`, 'Boolean executableAllowed is required.');
  ensure(typeof value.publicExportAllowed === 'boolean', errors, 'gold_disposition', `${at}.publicExportAllowed`, 'Boolean publicExportAllowed is required.');
}

function coreClassification(value) {
  return {
    primaryLifeArea: value?.primaryLifeArea ?? null,
    sourceShape: value?.sourceShape ?? null,
    primaryExecutionPattern: value?.primaryExecutionPattern ?? null,
    primaryArtifact: value?.primaryArtifact ?? null,
  };
}

function goldGateDecision(expectedClassification) {
  return {
    discoveryAccess: expectedClassification?.access?.discoveryAccess ?? null,
    rowAccess: expectedClassification?.access?.rowAccess ?? null,
    sourceRowStatus: expectedClassification?.review?.sourceRowStatus ?? null,
    rightsBasis: expectedClassification?.rights?.basis ?? null,
    allowedUse: expectedClassification?.rights?.allowedUse ?? [],
    freshnessReview: expectedClassification?.review?.freshnessReview ?? null,
    localeReview: expectedClassification?.review?.localeReview ?? null,
    safetyReview: expectedClassification?.review?.safetyReview ?? null,
    privacyReview: expectedClassification?.review?.privacyReview ?? null,
    rightsReview: expectedClassification?.review?.rightsReview ?? expectedClassification?.rights?.reviewStatus ?? null,
    promotionState: expectedClassification?.review?.promotionState ?? null,
    blockers: expectedClassification?.review?.blockers ?? [],
  };
}

function envelopeGateDecision(classification) {
  return {
    discoveryAccess: classification.access.discoveryAccess,
    rowAccess: classification.access.rowAccess,
    sourceRowStatus: classification.review.sourceRowStatus,
    rightsBasis: classification.rights.basis,
    allowedUse: classification.rights.allowedUse,
    freshnessReview: classification.review.freshnessReview,
    localeReview: classification.review.localeReview,
    safetyReview: classification.review.safetyReview,
    privacyReview: classification.review.privacyReview,
    rightsReview: classification.review.rightsReview,
    promotionState: classification.review.promotionState,
    blockers: classification.review.blockers,
  };
}

function validateGoldClassificationGates(envelope, goldCase, errors, { enforce = true } = {}) {
  const expected = goldCase.expectedClassification;
  const actual = envelope.classification;
  let matches = true;
  const compare = (condition, code, at, message) => {
    if (condition) return;
    matches = false;
    if (enforce) errors.push(issue(code, at, message));
  };
  if (expected?.access) {
    for (const key of ['providerType', 'discoveryAccess', 'rowAccess']) {
      if (key in expected.access) compare(actual.access[key] === expected.access[key], 'access_gold_mismatch', `classification.access.${key}`, `${key} differs from the frozen access gate.`);
    }
    if (typeof expected.access.sourceFormat === 'string') compare(actual.access.sourceFormat.category === expected.access.sourceFormat, 'access_gold_mismatch', 'classification.access.sourceFormat.category', 'sourceFormat differs from the frozen access gate.');
  }
  if (expected?.rights) {
    for (const key of ['basis', 'reviewStatus', 'personalTransformAllowed', 'publicReleaseAllowed']) {
      if (key in expected.rights) compare(actual.rights[key] === expected.rights[key], 'rights_gold_mismatch', `classification.rights.${key}`, `${key} differs from the frozen rights gate.`);
    }
    if (Array.isArray(expected.rights.allowedUse)) compare(sameSet(actual.rights.allowedUse, expected.rights.allowedUse), 'rights_gold_mismatch', 'classification.rights.allowedUse', 'allowedUse differs from the frozen rights gate.');
  }
  const expectedGates = goldGateDecision(expected);
  const actualGates = envelopeGateDecision(actual);
  for (const [key, value] of Object.entries(expectedGates)) {
    if (value === null) continue;
    if (['blockers', 'allowedUse'].includes(key)) compare(sameSet(actualGates[key], value), 'review_gate_gold_mismatch', `classification.review.${key}`, `${key} differs from the frozen review gate.`);
    else compare(actualGates[key] === value, 'review_gate_gold_mismatch', `classification.review.${key}`, `${key} differs from the frozen review gate.`);
  }
  return matches;
}

export function validateGoldContract(gold, manifest, { requireFullPortfolio = true } = {}) {
  const errors = [];
  ensure(gold?.documentType === 'flowme_output_quality_gold_source_contract', errors, 'gold_type', 'gold.documentType', 'Unexpected gold documentType.');
  ensure(typeof gold?.contractVersion === 'string' && gold.contractVersion.length > 0, errors, 'gold_version', 'gold.contractVersion', 'contractVersion is required.');
  ensure(gold?.caseSetVersion === manifest?.caseSetVersion, errors, 'gold_case_version', 'gold.caseSetVersion', 'Gold and manifest caseSetVersion must match.');
  ensure(Array.isArray(gold?.cases), errors, 'gold_cases', 'gold.cases', 'cases must be an array.');
  if (Array.isArray(gold?.cases)) {
    const expectedIds = (manifest?.cases || []).map((entry) => entry.caseId);
    const ids = gold.cases.map((entry) => entry.caseId);
    ensure(unique(ids), errors, 'duplicate_gold_case', 'gold.cases', 'Gold caseId values must be unique.');
    ensure(sameSet(ids, expectedIds), errors, 'gold_case_set', 'gold.cases', 'Gold cases must exactly match the manifest.');
    if (requireFullPortfolio) ensure(gold.cases.length === 18, errors, 'gold_case_count', 'gold.cases', 'Exactly 18 gold cases are required.');
    for (const [index, entry] of gold.cases.entries()) {
      const at = `gold.cases[${index}]`;
      ensure(['complete', 'partial', 'metadata_only', 'missing'].includes(entry.sourceCompleteness), errors, 'gold_source_status', `${at}.sourceCompleteness`, 'Unsupported sourceCompleteness.');
      validateGoldDisposition(entry.expectedDisposition, `${at}.expectedDisposition`, errors);
      ensure(isObject(entry.expectedClassification), errors, 'gold_classification', `${at}.expectedClassification`, 'expectedClassification is required.');
      if (isObject(entry.expectedClassification)) {
        const expectedCore = coreClassification(entry.expectedClassification);
        ensure(typeof expectedCore.primaryLifeArea === 'string', errors, 'gold_classification', `${at}.expectedClassification.primaryLifeArea`, 'primaryLifeArea is required.');
      }
      ensure(Array.isArray(entry.expectedRoleByRow), errors, 'gold_roles', `${at}.expectedRoleByRow`, 'expectedRoleByRow must be an array.');
      if (Array.isArray(entry.expectedRoleByRow)) {
        const rowIds = entry.expectedRoleByRow.map((row) => row.sourceRowId);
        ensure(unique(rowIds), errors, 'duplicate_gold_row', `${at}.expectedRoleByRow`, 'Each gold SourceRow must occur once.');
        for (const [rowIndex, row] of entry.expectedRoleByRow.entries()) {
          ensure(typeof row.sourceRowId === 'string' && row.sourceRowId.length > 0, errors, 'gold_row_id', `${at}.expectedRoleByRow[${rowIndex}]`, 'sourceRowId is required.');
          ensure(ROLES.includes(row.role), errors, 'gold_role', `${at}.expectedRoleByRow[${rowIndex}].role`, 'Unsupported SourceRow role.');
        }
        ensure(Array.isArray(entry.sourceRows), errors, 'gold_source_rows', `${at}.sourceRows`, 'Frozen sourceRows must be an array.');
        if (Array.isArray(entry.sourceRows)) {
          const frozenRowIds = entry.sourceRows.map((row) => row.sourceRowId);
          ensure(unique(frozenRowIds), errors, 'duplicate_gold_source_row', `${at}.sourceRows`, 'Frozen SourceRow IDs must be unique.');
          ensure(sameSet(frozenRowIds, rowIds), errors, 'gold_role_scope_mismatch', at, 'Frozen SourceRows and expectedRoleByRow must have the same exact row set.');
          const manifestEntry = (manifest?.cases || []).find((candidate) => candidate.caseId === entry.caseId);
          if (Number.isInteger(manifestEntry?.sourceRowCount)) ensure(frozenRowIds.length === manifestEntry.sourceRowCount, errors, 'manifest_gold_row_count', at, 'Manifest sourceRowCount differs from the frozen gold scope.');
          if (entry.sourceCompleteness === 'complete') {
            ensure(frozenRowIds.length > 0, errors, 'complete_empty_source', `${at}.sourceRows`, 'Complete source scope cannot be empty.');
            ensure(Array.isArray(entry.missingRows) && entry.missingRows.length === 0, errors, 'complete_missing_rows', `${at}.missingRows`, 'Complete source scope cannot declare missing rows.');
          } else {
            ensure(Array.isArray(entry.missingRows) && entry.missingRows.length > 0, errors, 'incomplete_without_missing_rows', `${at}.missingRows`, 'Incomplete source scope must name what is missing.');
            ensure(!['ready_for_internal_canary', 'ready_second_wave'].includes(entry.expectedDisposition?.conversionReadiness), errors, 'gold_incomplete_promoted', `${at}.expectedDisposition.conversionReadiness`, 'Incomplete gold source scope cannot be marked ready.');
          }
        }
      }
      ensure(Array.isArray(entry.forbiddenInferences), errors, 'gold_forbidden', `${at}.forbiddenInferences`, 'forbiddenInferences must be an array.');
      ensure(isObject(entry.essentialProjectionFields), errors, 'gold_projection_fields', `${at}.essentialProjectionFields`, 'essentialProjectionFields must be an object.');
      if (isObject(entry.essentialProjectionFields)) {
        ensure(sameSet(Object.keys(entry.essentialProjectionFields), PROJECTIONS), errors, 'gold_projection_keys', `${at}.essentialProjectionFields`, 'All five projection keys are required.');
        for (const target of PROJECTIONS) {
          ensure(Array.isArray(entry.essentialProjectionFields[target]) && unique(entry.essentialProjectionFields[target]), errors, 'gold_projection_fields', `${at}.essentialProjectionFields.${target}`, 'Essential fields must be a unique array.');
        }
      }
    }
  }
  throwIf(errors, 'gold source contract');
  return true;
}

function validateRightsAndReview(envelope, errors) {
  const rights = envelope.classification.rights;
  const review = envelope.classification.review;
  const feasibility = envelope.feasibility;
  ensure(rights.reviewStatus === review.rightsReview, errors, 'rights_review_mismatch', 'classification', 'Rights status and review gate must agree.');
  ensure(review.sourceRowStatus === envelope.sourceEvidence.sourceCompleteness, errors, 'source_status_mismatch', 'classification.review.sourceRowStatus', 'Review sourceRowStatus must match source evidence.');
  ensure(review.conversionReadiness === feasibility.conversionReadiness, errors, 'readiness_mismatch', 'classification.review.conversionReadiness', 'Review and feasibility readiness must agree.');
  ensure(sameSet(review.blockers, feasibility.blockers), errors, 'blocker_mismatch', 'classification.review.blockers', 'Review and feasibility blockers must remain synchronized, not collapsed.');
  ensure(rights.publicReleaseAllowed === feasibility.publicExportAllowed, errors, 'publication_mismatch', 'classification.rights.publicReleaseAllowed', 'Rights publication and feasibility public export must agree.');
  if (rights.personalTransformAllowed) {
    ensure(rights.allowedUse.includes('personal_transform') && rights.reviewStatus === 'approved', errors, 'personal_rights_gate', 'classification.rights', 'Personal transform requires approved personal_transform use.');
  }
  if (rights.publicReleaseAllowed) {
    ensure(rights.personalTransformAllowed, errors, 'public_rights_gate', 'classification.rights', 'Public release requires personal transform permission.');
    ensure(rights.reviewStatus === 'approved', errors, 'public_rights_gate', 'classification.rights.reviewStatus', 'Public release requires approved rights.');
    ensure(rights.allowedUse.includes('public_derived') || rights.allowedUse.includes('public_republish'), errors, 'public_rights_gate', 'classification.rights.allowedUse', 'Public release requires a public allowed use.');
    ensure(review.sourceRowStatus === 'complete', errors, 'public_review_gate', 'classification.review.sourceRowStatus', 'Public export requires complete source rows.');
    ensure(['current', 'not_required'].includes(review.freshnessReview), errors, 'public_review_gate', 'classification.review.freshnessReview', 'Freshness review is not cleared.');
    ensure(['applicable', 'not_required'].includes(review.localeReview), errors, 'public_review_gate', 'classification.review.localeReview', 'Locale review is not cleared.');
    ensure(['passed_with_boundary', 'not_required'].includes(review.safetyReview), errors, 'public_review_gate', 'classification.review.safetyReview', 'Safety review is not cleared.');
    ensure(['passed', 'not_required'].includes(review.privacyReview), errors, 'public_review_gate', 'classification.review.privacyReview', 'Privacy review is not cleared.');
    ensure(['public_candidate', 'published'].includes(review.promotionState), errors, 'public_review_gate', 'classification.review.promotionState', 'Promotion is not cleared.');
    ensure(review.blockers.length === 0, errors, 'public_review_gate', 'classification.review.blockers', 'Public export cannot retain blockers.');
  }
}

function validateFrozenSourceEvidence(envelope, goldCase, errors) {
  const evidence = envelope.sourceEvidence;
  const primary = evidence.primarySource;
  const goldPrimary = goldCase.primarySource || {};
  for (const [actualPath, actualValue, expectedValue] of [
    ['primarySource.sourceId', primary.sourceId, goldPrimary.sourceId],
    ['primarySource.url', primary.url, goldPrimary.url],
    ['primarySource.title', primary.title, goldPrimary.title],
    ['primarySource.snapshot.snapshotId', primary.snapshot.snapshotId, goldPrimary.snapshotId],
    ['primarySource.snapshot.contentHash', primary.snapshot.contentHash, goldPrimary.contentHash],
    ['claimedScope', evidence.claimedScope, goldCase.claimedScope],
  ]) {
    if (expectedValue !== undefined) ensure(actualValue === expectedValue, errors, 'source_snapshot_gold_mismatch', `sourceEvidence.${actualPath}`, `${actualPath} differs from the frozen source contract.`);
  }
  const goldRows = new Map((goldCase.sourceRows || []).map((row) => [row.sourceRowId, row]));
  for (const [index, row] of evidence.sourceRows.entries()) {
    const goldRow = goldRows.get(row.sourceRowId);
    ensure(Boolean(goldRow), errors, 'source_row_gold_mismatch', `sourceEvidence.sourceRows[${index}]`, 'SourceRow is absent from the frozen source contract.');
    if (!goldRow) continue;
    for (const key of ['sourceId', 'snapshotId', 'title', 'detail', 'order', 'locator']) {
      ensure(row[key] === goldRow[key], errors, 'source_row_content_gold', `sourceEvidence.sourceRows[${index}].${key}`, `SourceRow ${key} differs from the frozen source contract.`);
    }
  }
  const expectedLandmarks = (goldCase.landmarks || []).map((entry) => typeof entry === 'string' ? entry : entry.label);
  ensure(sameSet(evidence.landmarks.map((entry) => entry.label), expectedLandmarks), errors, 'landmark_gold_coverage', 'sourceEvidence.landmarks', 'Landmark labels must exactly cover the frozen source contract.');
  const expectedMissingRows = (goldCase.missingRows || []).map((entry) => typeof entry === 'string' ? entry : entry.label);
  ensure(sameSet(evidence.missingRows.map((entry) => entry.label), expectedMissingRows), errors, 'missing_row_gold_coverage', 'sourceEvidence.missingRows', 'Missing-row labels must exactly match the frozen source contract.');
}

function sourceCorpus(sourceRows, sourceRowIds) {
  const ids = new Set(sourceRowIds);
  return normalizeText(sourceRows.filter((row) => ids.has(row.sourceRowId)).map((row) => `${row.title}\n${row.detail}`).join('\n'));
}

function isUserBoundary(value, userInputPath) {
  const valuePath = typeof value === 'string' && /^\$user\.[A-Za-z0-9_.-]+$/.test(value);
  const explicitPath = typeof userInputPath === 'string' && /^\$user\.[A-Za-z0-9_.-]+$/.test(userInputPath);
  return valuePath || explicitPath;
}

function isUserPlaceholder(value) {
  return typeof value === 'string' && /^\$user\.[A-Za-z0-9_.-]+$/.test(value);
}

function hasUserInputBoundary(userInputPath) {
  return typeof userInputPath === 'string' && /^\$user\.[A-Za-z0-9_.-]+$/.test(userInputPath);
}

function validateEvidenceBoundValue(value, at, sourceRows, rowIds, errors) {
  if (!value) return;
  const validRefs = Array.isArray(value.sourceRowIds) && value.sourceRowIds.every((rowId) => rowIds.has(rowId));
  ensure(validRefs, errors, 'semantic_claim_source', `${at}.sourceRowIds`, 'Schedule/recurrence references unknown SourceRows.');
  if (isUserPlaceholder(value.value)) return;
  if (hasUserInputBoundary(value.userInputPath)) {
    const corpus = sourceCorpus(sourceRows, value.sourceRowIds || []);
    const valueGrounded = corpus.includes(normalizeText(value.value));
    const quoteGrounded = typeof value.evidenceQuote === 'string' && value.evidenceQuote.trim().length > 0 && corpus.includes(normalizeText(value.evidenceQuote));
    ensure(valueGrounded || quoteGrounded, errors, 'invented_semantic_claim', at, 'Derived schedule/recurrence needs both a $user.* boundary and source-grounded offset/rule evidence.');
    return;
  }
  ensure(typeof value.evidenceQuote === 'string' && value.evidenceQuote.trim().length > 0, errors, 'semantic_claim_evidence', `${at}.evidenceQuote`, 'Source-derived schedule/recurrence needs a literal evidence quote.');
  if (typeof value.evidenceQuote === 'string' && value.evidenceQuote.trim()) {
    const corpus = sourceCorpus(sourceRows, value.sourceRowIds || []);
    ensure(corpus.includes(normalizeText(value.evidenceQuote)), errors, 'invented_semantic_claim', at, 'Schedule/recurrence evidence quote is absent from the cited source rows.');
  }
}

function validateConditionalEvidence(value, at, sourceRows, rowIds, errors) {
  const validRefs = value.sourceRowIds.length > 0 && value.sourceRowIds.every((rowId) => rowIds.has(rowId));
  ensure(validRefs, errors, 'conditional_source', `${at}.sourceRowIds`, 'Conditional response needs known SourceRows.');
  if (isUserBoundary(value.trigger, null) || isUserBoundary(value.response, null)) return;
  const corpus = sourceCorpus(sourceRows, value.sourceRowIds);
  ensure(corpus.includes(normalizeText(value.evidenceQuote)), errors, 'invented_condition', `${at}.evidenceQuote`, 'Conditional evidence quote is absent from the cited source rows.');
}

function generatedContent(envelope) {
  return JSON.stringify({
    canonicalDraft: envelope.canonicalDraft,
    projectionPayloads: Object.fromEntries(PROJECTIONS.map((target) => [target, envelope.projections[target].payload])),
  });
}

function validateForbiddenInferences(envelope, goldCase, errors) {
  const haystack = generatedContent(envelope);
  for (const [index, forbidden] of (goldCase.forbiddenInferences || []).entries()) {
    const at = `gold.forbiddenInferences[${index}]`;
    let matched = false;
    if (typeof forbidden === 'string') {
      matched = normalizeText(haystack).includes(normalizeText(forbidden));
    } else if (isObject(forbidden)) {
      if (typeof forbidden.pattern === 'string') {
        try { matched = new RegExp(forbidden.pattern, 'iu').test(haystack); }
        catch (error) { errors.push(issue('invalid_forbidden_pattern', at, error.message)); }
      } else if (typeof forbidden.needle === 'string') {
        matched = normalizeText(haystack).includes(normalizeText(forbidden.needle));
      }
    }
    ensure(!matched, errors, 'unsupported_inference', at, 'Generated executable content contains a forbidden inference.');
  }
}

function validateDraftIntegrity(envelope, errors) {
  const draft = envelope.canonicalDraft;
  const sourceRows = envelope.sourceEvidence.sourceRows;
  const rowIds = new Set(sourceRows.map((row) => row.sourceRowId));
  const collections = {
    steps: ['stepId', draft.steps],
    items: ['itemId', draft.items],
    fields: ['fieldId', draft.fields],
    memos: ['memoId', draft.memos],
    references: ['referenceId', draft.references],
    conditionalResponses: ['conditionalResponseId', draft.conditionalResponses],
  };
  const idSets = {};
  for (const [name, [idKey, values]] of Object.entries(collections)) {
    const ids = values.map((entry) => entry[idKey]);
    ensure(unique(ids), errors, 'duplicate_entity_id', `canonicalDraft.${name}`, `${name} IDs must be unique.`);
    idSets[name] = new Set(ids);
  }
  if (draft.flow === null) {
    ensure(Object.values(collections).every(([, values]) => values.length === 0), errors, 'null_flow_has_entities', 'canonicalDraft', 'A null Flow cannot retain canonical entities.');
  } else {
    ensure(sameSet(draft.flow.stepIds, [...idSets.steps]), errors, 'flow_step_membership', 'canonicalDraft.flow.stepIds', 'Flow Step membership is incomplete or stale.');
  }
  for (const [index, step] of draft.steps.entries()) {
    ensure(step.flowId === draft.flow?.flowId, errors, 'step_flow_mismatch', `canonicalDraft.steps[${index}].flowId`, 'Step flowId must match Flow.');
    ensure(step.itemIds.every((itemId) => idSets.items.has(itemId)), errors, 'step_item_ref', `canonicalDraft.steps[${index}].itemIds`, 'Step references an unknown Item.');
    ensure(step.sourceRowIds.every((rowId) => rowIds.has(rowId)), errors, 'step_source_ref', `canonicalDraft.steps[${index}].sourceRowIds`, 'Step references an unknown SourceRow.');
  }
  for (const [index, item] of draft.items.entries()) {
    const at = `canonicalDraft.items[${index}]`;
    ensure(idSets.steps.has(item.stepId), errors, 'item_step_ref', `${at}.stepId`, 'Item references an unknown Step.');
    const memberships = draft.steps.filter((step) => step.itemIds.includes(item.itemId));
    ensure(memberships.length === 1 && memberships[0]?.stepId === item.stepId, errors, 'item_step_membership', at, 'Item must belong to exactly one matching Step.');
    ensure(item.sourceRowIds.length > 0 && item.sourceRowIds.every((rowId) => rowIds.has(rowId)), errors, 'item_source_ref', `${at}.sourceRowIds`, 'Item needs direct known SourceRows.');
    ensure(item.fieldIds.every((id) => idSets.fields.has(id)), errors, 'item_field_ref', `${at}.fieldIds`, 'Item references an unknown Field.');
    ensure(item.memoIds.every((id) => idSets.memos.has(id)), errors, 'item_memo_ref', `${at}.memoIds`, 'Item references an unknown Memo.');
    ensure(item.referenceIds.every((id) => idSets.references.has(id)), errors, 'item_reference_ref', `${at}.referenceIds`, 'Item references an unknown Reference.');
    ensure(item.conditionalResponseIds.every((id) => idSets.conditionalResponses.has(id)), errors, 'item_conditional_ref', `${at}.conditionalResponseIds`, 'Item references an unknown ConditionalResponse.');
    validateEvidenceBoundValue(item.schedule, `${at}.schedule`, sourceRows, rowIds, errors);
    validateEvidenceBoundValue(item.recurrence, `${at}.recurrence`, sourceRows, rowIds, errors);
  }
  for (const [name, [idKey, values]] of Object.entries(collections)) {
    if (name === 'steps' || name === 'items') continue;
    for (const [index, value] of values.entries()) {
      ensure(value.sourceRowIds.every((rowId) => rowIds.has(rowId)), errors, 'entity_source_ref', `canonicalDraft.${name}[${index}].sourceRowIds`, `${idKey} entity references an unknown SourceRow.`);
    }
  }
  draft.conditionalResponses.forEach((entry, index) => validateConditionalEvidence(entry, `canonicalDraft.conditionalResponses[${index}]`, sourceRows, rowIds, errors));
  return idSets;
}

function validateRoleAccounting(envelope, goldCase, idSets, errors) {
  const rows = envelope.sourceEvidence.sourceRows;
  const rowIds = rows.map((row) => row.sourceRowId);
  const assignments = envelope.sourceEvidence.roleAssignments;
  const assignedIds = assignments.map((entry) => entry.sourceRowId);
  const goldRoles = new Map(goldCase.expectedRoleByRow.map((entry) => [entry.sourceRowId, entry.role]));
  ensure(unique(rowIds), errors, 'duplicate_source_row', 'sourceEvidence.sourceRows', 'SourceRow IDs must be unique.');
  ensure(unique(assignedIds), errors, 'duplicate_role_assignment', 'sourceEvidence.roleAssignments', 'Each SourceRow must have exactly one role assignment.');
  ensure(sameSet(rowIds, assignedIds), errors, 'source_role_accounting', 'sourceEvidence.roleAssignments', 'Every acquired SourceRow must be assigned exactly once.');
  ensure(sameSet(rowIds, [...goldRoles.keys()]), errors, 'full_source_scope', 'sourceEvidence.sourceRows', 'Acquired SourceRows must exactly match the frozen gold scope.');
  const hasDraft = envelope.canonicalDraft.flow !== null;
  for (const [index, assignment] of assignments.entries()) {
    const at = `sourceEvidence.roleAssignments[${index}]`;
    ensure(ROLES.includes(assignment.role), errors, 'role_enum', `${at}.role`, 'Unsupported SourceRow role.');
    ensure(assignment.role === goldRoles.get(assignment.sourceRowId), errors, 'role_gold_mismatch', at, 'SourceRow role differs from the frozen gold contract.');
    if (assignment.role === 'omission') {
      ensure(assignment.targetIds.length === 0, errors, 'omission_target', `${at}.targetIds`, 'Omission must not target a canonical entity.');
      continue;
    }
    const [collection] = ROLE_COLLECTION[assignment.role];
    if (!hasDraft) {
      ensure(assignment.targetIds.length === 0, errors, 'blocked_role_target', `${at}.targetIds`, 'A no-proposal result cannot expose canonical targets.');
      continue;
    }
    ensure(assignment.targetIds.length > 0, errors, 'missing_role_target', `${at}.targetIds`, 'A proposal role needs at least one canonical target.');
    ensure(assignment.targetIds.every((targetId) => idSets[collection].has(targetId)), errors, 'unknown_role_target', `${at}.targetIds`, `Role target must exist in canonicalDraft.${collection}.`);
    const targetValues = envelope.canonicalDraft[collection].filter((entry) => assignment.targetIds.includes(entry[ROLE_COLLECTION[assignment.role][1]]));
    ensure(targetValues.every((entry) => entry.sourceRowIds.includes(assignment.sourceRowId)), errors, 'role_target_source_mismatch', at, 'Role target must directly cite the assigned SourceRow.');
  }
}

function draftEntityCount(draft) {
  return draft.steps.length + draft.items.length + draft.fields.length + draft.memos.length + draft.references.length + draft.conditionalResponses.length + (draft.flow ? 1 : 0);
}

function validateFeasibility(envelope, errors) {
  const feasibility = envelope.feasibility;
  const sourceStatus = envelope.sourceEvidence.sourceCompleteness;
  const entityCount = draftEntityCount(envelope.canonicalDraft);
  const blockedOutcome = feasibility.generationState === 'failed' || ['no_proposal', 'rejected'].includes(feasibility.outcome) || feasibility.executableAllowed === false;
  if (feasibility.generationState === 'failed') {
    ensure(feasibility.outcome !== 'proposal', errors, 'failed_proposal', 'feasibility', 'A failed generation cannot return a proposal.');
    ensure(typeof feasibility.errorCode === 'string' && feasibility.errorCode.length > 0, errors, 'failed_error_code', 'feasibility.errorCode', 'Failed generation needs an errorCode.');
  }
  if (feasibility.outcome === 'proposal') {
    ensure(feasibility.generationState === 'completed', errors, 'proposal_state', 'feasibility.generationState', 'A proposal requires completed generation.');
    ensure(feasibility.errorCode === null, errors, 'proposal_error_code', 'feasibility.errorCode', 'A completed proposal cannot retain an errorCode.');
  }
  if (sourceStatus !== 'complete') {
    ensure(!['ready_for_internal_canary', 'ready_second_wave'].includes(feasibility.conversionReadiness), errors, 'incomplete_source_promoted', 'feasibility.conversionReadiness', 'Partial, metadata-only or missing source cannot be promoted to ready.');
    ensure(feasibility.publicExportAllowed === false, errors, 'incomplete_source_public', 'feasibility.publicExportAllowed', 'Incomplete source cannot be publicly exportable.');
  }
  if (['metadata_only', 'missing'].includes(sourceStatus)) {
    ensure(feasibility.outcome !== 'proposal', errors, 'sparse_source_proposal', 'feasibility.outcome', 'Metadata-only or missing source cannot become a Flow proposal.');
  }
  if (feasibility.conversionReadiness === 'source_import_required') {
    ensure(feasibility.outcome === 'no_proposal', errors, 'source_import_outcome', 'feasibility.outcome', 'source_import_required must return no_proposal.');
    ensure(feasibility.executableAllowed === false && feasibility.publicExportAllowed === false, errors, 'source_import_executable', 'feasibility', 'source_import_required must block executable and public output.');
    ensure(feasibility.blockers.includes('source_import_required') || feasibility.blockers.includes('source_incomplete'), errors, 'source_import_blocker', 'feasibility.blockers', 'source_import_required needs a source blocker.');
  }
  if (blockedOutcome) ensure(entityCount === 0, errors, 'blocked_has_canonical_output', 'canonicalDraft', 'Failed, rejected, no-proposal or non-executable output cannot retain canonical entities.');
  ensure(!(feasibility.publicExportAllowed && !feasibility.executableAllowed), errors, 'public_without_executable', 'feasibility', 'Public export requires executable output.');
}

function validateProjections(envelope, goldCase, errors, { enforcePayloadEvidence = true } = {}) {
  const taxonomy = envelope.classification.taxonomy;
  const feasibility = envelope.feasibility;
  const sensitiveHoldBlockers = new Set(['rights_unknown', 'rights_permission_required', 'rights_blocked', 'safety_review_required', 'locale_review_required', 'privacy_review_required']);
  const exportHold = feasibility.conversionReadiness === 'hold' && feasibility.blockers.some((blocker) => sensitiveHoldBlockers.has(blocker));
  for (const target of PROJECTIONS) {
    const projection = envelope.projections[target];
    const at = `projections.${target}`;
    if (['blocked', 'not_applicable'].includes(projection.availability)) {
      ensure(projection.payload === null, errors, 'blocked_projection_payload', `${at}.payload`, 'Blocked/not-applicable projection must have null payload.');
      ensure(projection.essentialFieldsRetained.length === 0, errors, 'blocked_projection_retention', `${at}.essentialFieldsRetained`, 'Blocked/not-applicable projection cannot claim retained fields.');
    } else {
      ensure(projection.payload !== null, errors, 'usable_projection_payload', `${at}.payload`, 'Usable projection needs a payload.');
      const expected = goldCase.essentialProjectionFields[target] || [];
      ensure(expected.every((field) => projection.essentialFieldsRetained.includes(field)), errors, 'projection_essential_loss', `${at}.essentialFieldsRetained`, 'Applicable projection lost a frozen essential field.');
      ensure(!projection.lossManifest.some((entry) => entry.severity === 'essential'), errors, 'projection_essential_loss', `${at}.lossManifest`, 'Applicable projection declares essential-field loss.');
    }
  }
  if (feasibility.outcome === 'proposal' && feasibility.executableAllowed && !exportHold) {
    ensure(taxonomy.primaryArtifact !== null, errors, 'missing_primary_artifact', 'classification.taxonomy.primaryArtifact', 'Executable proposal requires a primaryArtifact.');
    if (taxonomy.primaryArtifact) ensure(envelope.projections[taxonomy.primaryArtifact].availability === 'primary', errors, 'primary_projection_mismatch', `projections.${taxonomy.primaryArtifact}.availability`, 'Primary artifact must own the primary projection.');
    ensure(PROJECTIONS.filter((target) => envelope.projections[target].availability === 'primary').length === 1, errors, 'primary_projection_count', 'projections', 'Executable proposal must have exactly one primary projection.');
  }
  if (exportHold) {
    for (const target of PROJECTIONS) {
      ensure(['blocked', 'not_applicable'].includes(envelope.projections[target].availability), errors, 'hold_projection_exposed', `projections.${target}`, 'Rights/safety/locale/privacy hold may keep an internal draft but must block export projections.');
    }
    ensure(feasibility.publicExportAllowed === false, errors, 'hold_public_export', 'feasibility.publicExportAllowed', 'Sensitive hold cannot allow public export.');
  }
  if (feasibility.outcome !== 'proposal' || !feasibility.executableAllowed) {
    for (const target of PROJECTIONS) ensure(['blocked', 'not_applicable'].includes(envelope.projections[target].availability), errors, 'nonproposal_projection', `projections.${target}`, 'No-proposal/non-executable result cannot expose a usable projection.');
  }
  const payloadRetention = calculateProjectionPayloadRetention(envelope, goldCase);
  if (enforcePayloadEvidence) {
    for (const [target, result] of Object.entries(payloadRetention.byProjection)) {
      ensure(result.missingFields.length === 0, errors, 'projection_payload_evidence_loss', `projections.${target}.payload`, `Projection payload does not contain declared essential semantics: ${result.missingFields.join(', ')}.`);
    }
  }
  return payloadRetention;
}

function validateProjectionSemanticClaims(envelope, errors) {
  const sourceRows = envelope.sourceEvidence.sourceRows;
  const rowIds = new Set(sourceRows.map((row) => row.sourceRowId));
  const allSourceText = normalizeText(sourceRows.map((row) => `${row.title}\n${row.detail}`).join('\n'));
  const semanticKey = /^(date|startDate|endDate|dueDate|deadline|repeat|rrule|recurrence|condition|trigger)$/i;
  const visit = (value, at) => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${at}[${index}]`));
      return;
    }
    if (!isObject(value)) return;
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${at}.${key}`;
      if (['schedule', 'recurrence'].includes(key) && child !== null) {
        if (isObject(child) && exactKeys(child, ['value', 'sourceRowIds', 'evidenceQuote', 'userInputPath'])) validateEvidenceBoundValue(child, childPath, sourceRows, rowIds, errors);
        else errors.push(issue('projection_semantic_provenance', childPath, 'Projected schedule/recurrence must retain the canonical evidence-bound shape.'));
      } else if (semanticKey.test(key) && ['string', 'number'].includes(typeof child)) {
        if (!isUserPlaceholder(child)) {
          const citedRows = Array.isArray(value.sourceRowIds) ? value.sourceRowIds : [];
          const quote = typeof value.evidenceQuote === 'string' ? value.evidenceQuote : null;
          const directlyPresent = allSourceText.includes(normalizeText(child));
          const citedEvidence = citedRows.length > 0 && quote && citedRows.every((rowId) => rowIds.has(rowId)) && sourceCorpus(sourceRows, citedRows).includes(normalizeText(quote));
          const derivedFromUser = hasUserInputBoundary(value.userInputPath) && citedEvidence;
          ensure(directlyPresent || citedEvidence || derivedFromUser, errors, 'projection_semantic_provenance', childPath, 'Projected date/repeat/condition lacks source evidence or a source-grounded $user.* derivation boundary.');
        }
      }
      visit(child, childPath);
    }
  };
  for (const target of PROJECTIONS) {
    const projection = envelope.projections[target];
    if (!['blocked', 'not_applicable'].includes(projection.availability) && projection.payload !== null) visit(projection.payload, `projections.${target}.payload`);
  }
}

export function validateOutputEnvelope(envelope, { manifestCase, goldCase, schema, taxonomy, enforceGold = true, enforceProjectionPayloadEvidence = true }) {
  const errors = [];
  try { validateAgainstSchema(envelope, schema, `output:${envelope?.caseId ?? 'unknown'}`); }
  catch (error) { errors.push(...normalizeSchemaErrors(error, 'output')); }
  if (errors.length) throwIf(errors, `output ${envelope?.caseId ?? 'unknown'}`);

  ensure(envelope.envelopeSchemaVersion === OUTPUT_VERSION, errors, 'output_version', 'envelopeSchemaVersion', 'Unexpected output envelope version.');
  ensure(manifestCase?.caseId === envelope.caseId, errors, 'manifest_case_mismatch', 'caseId', 'Envelope caseId is absent from the manifest.');
  ensure(goldCase?.caseId === envelope.caseId, errors, 'gold_case_mismatch', 'caseId', 'Envelope caseId is absent from the gold contract.');
  ensure(envelope.sourceEvidence.sourceCompleteness === goldCase.sourceCompleteness, errors, 'source_completeness_gold', 'sourceEvidence.sourceCompleteness', 'Source completeness differs from the frozen gold contract.');
  validateFrozenSourceEvidence(envelope, goldCase, errors);
  const primary = envelope.sourceEvidence.primarySource;
  for (const [index, row] of envelope.sourceEvidence.sourceRows.entries()) {
    ensure(row.sourceId === primary.sourceId, errors, 'source_row_source', `sourceEvidence.sourceRows[${index}].sourceId`, 'SourceRow sourceId differs from the primary source.');
    ensure(row.snapshotId === primary.snapshot.snapshotId, errors, 'source_row_snapshot', `sourceEvidence.sourceRows[${index}].snapshotId`, 'SourceRow snapshotId differs from the frozen snapshot.');
  }
  for (const [index, landmark] of envelope.sourceEvidence.landmarks.entries()) {
    const rowIds = new Set(envelope.sourceEvidence.sourceRows.map((row) => row.sourceRowId));
    const absenceLandmark = envelope.sourceEvidence.sourceCompleteness === 'missing' && rowIds.size === 0 && landmark.sourceRowIds.length === 0;
    ensure(absenceLandmark || (landmark.sourceRowIds.length > 0 && landmark.sourceRowIds.every((rowId) => rowIds.has(rowId))), errors, 'landmark_source_ref', `sourceEvidence.landmarks[${index}].sourceRowIds`, 'Landmark must cite acquired SourceRows, except an explicit zero-row missing-source landmark.');
  }
  try { validateTaxonomyAssignment(envelope.classification.taxonomy, taxonomy, `${envelope.caseId}.taxonomy`, { partial: true }); }
  catch (error) { errors.push(...normalizeSchemaErrors(error, 'classification.taxonomy')); }
  validateRightsAndReview(envelope, errors);
  validateFeasibility(envelope, errors);
  const idSets = validateDraftIntegrity(envelope, errors);
  validateRoleAccounting(envelope, goldCase, idSets, errors);
  const projectionPayloadRetention = validateProjections(envelope, goldCase, errors, { enforcePayloadEvidence: enforceProjectionPayloadEvidence });
  validateProjectionSemanticClaims(envelope, errors);
  validateForbiddenInferences(envelope, goldCase, errors);

  const expectedDisposition = goldCase.expectedDisposition;
  let dispositionMatch = true;
  for (const key of ['generationState', 'outcome', 'conversionReadiness', 'executableAllowed', 'publicExportAllowed']) {
    const matches = envelope.feasibility[key] === expectedDisposition[key];
    dispositionMatch &&= matches;
    if (enforceGold) ensure(matches, errors, 'disposition_gold_mismatch', `feasibility.${key}`, `${key} differs from the frozen expected disposition.`);
  }
  const expectedCore = coreClassification(goldCase.expectedClassification);
  const actualCore = coreClassification(envelope.classification.taxonomy);
  let classificationMatch = true;
  for (const key of Object.keys(expectedCore)) {
    const matches = actualCore[key] === expectedCore[key];
    classificationMatch &&= matches;
    if (enforceGold) ensure(matches, errors, 'classification_gold_mismatch', `classification.taxonomy.${key}`, `${key} differs from the frozen expected classification.`);
  }
  const gateMatch = validateGoldClassificationGates(envelope, goldCase, errors, { enforce: enforceGold });

  throwIf(errors, `output ${envelope.caseId}`);
  return {
    caseId: envelope.caseId,
    sourceRowCount: envelope.sourceEvidence.sourceRows.length,
    roleAccountingRate: ratio(envelope.sourceEvidence.roleAssignments.length, envelope.sourceEvidence.sourceRows.length),
    canonicalItemCount: envelope.canonicalDraft.items.length,
    dispositionMatch,
    classificationMatch,
    gateMatch,
    goldEnforced: enforceGold,
    projectionPayloadEvidencePass: projectionPayloadRetention.pass,
    projectionPayloadRetention,
  };
}

function validateEvidenceLane(run, errors) {
  ensure(isObject(run.generator) && typeof run.generator.evidenceKind === 'string', errors, 'generator_evidence', 'run.generator', 'generator evidence is required.');
  for (const lane of ['timing', 'usage', 'cost']) {
    ensure(isObject(run[lane]) && typeof run[lane].evidenceKind === 'string', errors, `${lane}_evidence`, `run.${lane}`, `${lane} evidenceKind is required.`);
    if (run[lane]?.evidenceKind === 'not_available') {
      const unsupported = Object.entries(run[lane]).filter(([key, value]) => key !== 'evidenceKind' && value !== null);
      ensure(unsupported.length === 0, errors, `${lane}_unsupported_claim`, `run.${lane}`, `${lane} values must be null when evidence is unavailable.`);
    }
  }
}

export function validateRunDocument(run, context, { requireFullCaseSet = false, file = null } = {}) {
  const errors = [];
  const required = ['runSchemaVersion', 'runId', 'roundId', 'caseSetVersion', 'goldContractVersion', 'outputSchemaVersion', 'taxonomyVersion', 'promptVersion', 'generator', 'timing', 'usage', 'cost', 'outputs'];
  ensure(exactKeys(run, required), errors, 'run_schema', file || 'run', 'Run top-level keys do not match v2.');
  ensure(run?.runSchemaVersion === RUN_VERSION, errors, 'run_version', 'run.runSchemaVersion', 'Unexpected run schema version.');
  ensure(/^round-[1-4]$/.test(run?.roundId ?? ''), errors, 'round_id', 'run.roundId', 'roundId must be round-1..round-4.');
  ensure(run?.caseSetVersion === context.manifest.caseSetVersion, errors, 'run_case_version', 'run.caseSetVersion', 'Run caseSetVersion is stale.');
  ensure(run?.goldContractVersion === context.gold.contractVersion, errors, 'run_gold_version', 'run.goldContractVersion', 'Run goldContractVersion is stale.');
  ensure(run?.outputSchemaVersion === OUTPUT_VERSION, errors, 'run_output_version', 'run.outputSchemaVersion', 'Run output schema version is stale.');
  ensure(run?.taxonomyVersion === context.taxonomy.schemaVersion, errors, 'run_taxonomy_version', 'run.taxonomyVersion', 'Run taxonomy version is stale.');
  ensure(Array.isArray(run?.outputs), errors, 'run_outputs', 'run.outputs', 'Run outputs must be an array.');
  validateEvidenceLane(run, errors);
  const manifestCases = caseMap(context.manifest);
  const goldCases = caseMap(context.gold);
  const outputResults = [];
  if (Array.isArray(run?.outputs)) {
    const ids = run.outputs.map((entry) => entry.caseId);
    ensure(unique(ids), errors, 'run_duplicate_case', 'run.outputs', 'A run cannot repeat a case.');
    if (requireFullCaseSet) ensure(sameSet(ids, [...manifestCases.keys()]), errors, 'run_case_set', 'run.outputs', 'Run must contain the exact manifest case set.');
    for (const output of run.outputs) {
      try {
        const enforceGold = !(run.roundId === 'round-1' || run.generator?.evidenceKind === 'unadjudicated_baseline');
        outputResults.push(validateOutputEnvelope(output, {
          manifestCase: manifestCases.get(output.caseId),
          goldCase: goldCases.get(output.caseId),
          schema: context.outputSchema,
          taxonomy: context.taxonomy,
          enforceGold,
          enforceProjectionPayloadEvidence: ['round-3', 'round-4'].includes(run.roundId),
        }));
      } catch (error) {
        errors.push(...normalizeSchemaErrors(error, `output:${output?.caseId ?? 'unknown'}`));
      }
    }
  }
  throwIf(errors, `run ${run?.runId ?? 'unknown'}`);
  return { runId: run.runId, roundId: run.roundId, outputResults };
}

export function validateRound(runEntries, context, roundId) {
  const errors = [];
  const results = [];
  const runsForRound = runEntries.filter((entry) => entry.run.roundId === roundId);
  for (const entry of runsForRound) {
    try { results.push(validateRunDocument(entry.run, context, { file: entry.file })); }
    catch (error) { errors.push(...normalizeSchemaErrors(error, entry.file || roundId)); }
  }
  ensure(runsForRound.length > 0, errors, 'missing_round', roundId, `No run files found for ${roundId}.`);
  const outputs = runsForRound.flatMap((entry) => entry.run.outputs || []);
  const outputIds = outputs.map((entry) => entry.caseId);
  ensure(unique(outputIds), errors, 'round_duplicate_case', roundId, 'Cases must occur exactly once across the round.');
  ensure(sameSet(outputIds, context.manifest.cases.map((entry) => entry.caseId)), errors, 'round_case_set', roundId, 'Round must contain the exact 18-case manifest set.');
  throwIf(errors, `round ${roundId}`);
  return { roundId, runCount: runsForRound.length, outputCount: outputs.length, results };
}

function classificationEqual(left, right) {
  return JSON.stringify(coreClassification(left)) === JSON.stringify(coreClassification(right));
}

function normalizedGateDecision(value) {
  return {
    discoveryAccess: value?.discoveryAccess ?? null,
    rowAccess: value?.rowAccess ?? null,
    sourceRowStatus: value?.sourceRowStatus ?? null,
    rightsBasis: value?.rightsBasis ?? null,
    allowedUse: [...(value?.allowedUse ?? [])].sort(),
    freshnessReview: value?.freshnessReview ?? null,
    localeReview: value?.localeReview ?? null,
    safetyReview: value?.safetyReview ?? null,
    privacyReview: value?.privacyReview ?? null,
    rightsReview: value?.rightsReview ?? null,
    promotionState: value?.promotionState ?? null,
    blockers: [...(value?.blockers ?? [])].sort(),
  };
}

function gateDecisionEqual(left, right) {
  return JSON.stringify(normalizedGateDecision(left)) === JSON.stringify(normalizedGateDecision(right));
}

export function validateReviewResults(document, context) {
  const errors = [];
  try { validateAgainstSchema(document, context.reviewSchema, 'review-results'); }
  catch (error) { errors.push(...normalizeSchemaErrors(error, 'review-results')); }
  if (errors.length) throwIf(errors, 'review results');
  ensure(document.caseSetVersion === context.manifest.caseSetVersion, errors, 'review_case_version', 'review.caseSetVersion', 'Review caseSetVersion is stale.');
  ensure(document.goldContractVersion === context.gold.contractVersion, errors, 'review_gold_version', 'review.goldContractVersion', 'Review goldContractVersion is stale.');
  ensure(/not observed-user validation/i.test(document.claimBoundary), errors, 'review_claim_boundary', 'review.claimBoundary', 'Review must disclaim observed-user validation.');
  const caseIds = context.manifest.cases.map((entry) => entry.caseId);
  const roundIds = document.rounds.map((entry) => entry.roundId);
  ensure(unique(roundIds), errors, 'duplicate_review_round', 'review.rounds', 'Review round IDs must be unique.');
  ensure(JSON.stringify(roundIds) === JSON.stringify(['round-1', 'round-2', 'round-3', 'round-4'].slice(0, roundIds.length)), errors, 'review_round_order', 'review.rounds', 'Review rounds must be consecutive and ordered from round-1.');
  for (const [roundIndex, round] of document.rounds.entries()) {
    const at = `review.rounds[${roundIndex}]`;
    ensure(sameSet(round.reviewerLanes, REVIEWER_LANES), errors, 'reviewer_lanes', `${at}.reviewerLanes`, 'All three reviewer lanes are required.');
    const reviewIds = round.reviews.map((entry) => entry.reviewId);
    ensure(unique(reviewIds), errors, 'duplicate_review_id', `${at}.reviews`, 'reviewId values must be unique.');
    for (const caseId of caseIds) {
      const caseReviews = round.reviews.filter((entry) => entry.caseId === caseId);
      ensure(caseReviews.length === 3 && sameSet(caseReviews.map((entry) => entry.reviewerLane), REVIEWER_LANES), errors, 'review_case_lanes', `${at}.reviews`, `${caseId} must have exactly three independent lanes.`);
      for (const review of caseReviews) {
        if (review.reviewerLane === 'rules_first') ensure(review.evidenceKind === 'deterministic_qa', errors, 'review_evidence_kind', `${at}.${review.reviewId}`, 'rules_first must be deterministic_qa.');
        else {
          ensure(review.independent === true, errors, 'review_independence', `${at}.${review.reviewId}`, 'Independent reviewer lanes must be marked independent.');
          ensure(review.evidenceKind === 'independent_agent_review', errors, 'review_evidence_kind', `${at}.${review.reviewId}`, 'Independent lanes must use independent_agent_review evidence.');
        }
        ensure(review.essentialProjectionRetentionRate >= 0 && review.essentialProjectionRetentionRate <= 1, errors, 'review_rate', `${at}.${review.reviewId}.essentialProjectionRetentionRate`, 'Retention rate must be 0..1.');
        ensure(review.gateDecision.sourceRowStatus !== 'complete' || review.gateDecision.rowAccess === 'full', errors, 'review_gate_consistency', `${at}.${review.reviewId}.gateDecision`, 'A complete SourceRow gate requires full row access.');
      }
    }
    ensure(round.reviews.length === caseIds.length * 3, errors, 'review_count', `${at}.reviews`, 'Round must contain exactly 3 reviews per case.');
    const adjudicationIds = round.adjudications.map((entry) => entry.caseId);
    ensure(unique(adjudicationIds) && sameSet(adjudicationIds, caseIds), errors, 'adjudication_case_set', `${at}.adjudications`, 'Adjudications must exactly match the case set.');
    for (const [index, adjudication] of round.adjudications.entries()) {
      const adjudicationAt = `${at}.adjudications[${index}]`;
      ensure(adjudication.itemsKept <= adjudication.itemsGenerated, errors, 'item_keep_count', `${at}.adjudications[${index}]`, 'itemsKept cannot exceed itemsGenerated.');
      ensure(adjudication.essentialFieldChecks.retained <= adjudication.essentialFieldChecks.expected, errors, 'retention_count', `${at}.adjudications[${index}]`, 'Retained essential fields cannot exceed expected fields.');
      ensure(adjudication.finalGateDecision.sourceRowStatus !== 'complete' || adjudication.finalGateDecision.rowAccess === 'full', errors, 'review_gate_consistency', `${at}.adjudications[${index}].finalGateDecision`, 'A complete SourceRow gate requires full row access.');
      const evidence = adjudication.correctionTimeEvidence;
      if (evidence.kind === 'measured_independent_agent_review') {
        const startedMs = Date.parse(evidence.startedAt);
        const endedMs = Date.parse(evidence.endedAt);
        ensure(typeof evidence.startedAt === 'string' && Number.isFinite(startedMs), errors, 'correction_measurement_timestamp', `${adjudicationAt}.correctionTimeEvidence.startedAt`, 'Measured correction evidence requires a valid start timestamp.');
        ensure(typeof evidence.endedAt === 'string' && Number.isFinite(endedMs), errors, 'correction_measurement_timestamp', `${adjudicationAt}.correctionTimeEvidence.endedAt`, 'Measured correction evidence requires a valid end timestamp.');
        ensure(typeof evidence.elapsedSeconds === 'number', errors, 'correction_measurement_elapsed', `${adjudicationAt}.correctionTimeEvidence.elapsedSeconds`, 'Measured correction evidence requires elapsedSeconds.');
        ensure(typeof evidence.reviewerId === 'string' && evidence.reviewerId.length > 0, errors, 'correction_measurement_reviewer', `${adjudicationAt}.correctionTimeEvidence.reviewerId`, 'Measured correction evidence requires reviewerId.');
        ensure(typeof evidence.measurementMethod === 'string' && evidence.measurementMethod.length > 0, errors, 'correction_measurement_method', `${adjudicationAt}.correctionTimeEvidence.measurementMethod`, 'Measured correction evidence requires measurementMethod.');
        if (Number.isFinite(startedMs) && Number.isFinite(endedMs)) {
          ensure(endedMs >= startedMs, errors, 'correction_measurement_order', `${adjudicationAt}.correctionTimeEvidence`, 'Measured correction end must not precede its start.');
          if (typeof evidence.elapsedSeconds === 'number') ensure(Math.abs((endedMs - startedMs) / 1000 - evidence.elapsedSeconds) <= 0.001, errors, 'correction_measurement_elapsed_mismatch', `${adjudicationAt}.correctionTimeEvidence.elapsedSeconds`, 'elapsedSeconds must match the timestamp interval.');
        }
        ensure(typeof adjudication.correctionMinutes === 'number', errors, 'correction_measurement_minutes', `${adjudicationAt}.correctionMinutes`, 'Measured correction evidence requires correctionMinutes.');
        if (typeof adjudication.correctionMinutes === 'number' && typeof evidence.elapsedSeconds === 'number') ensure(Math.abs(adjudication.correctionMinutes - evidence.elapsedSeconds / 60) <= 1e-9, errors, 'correction_measurement_minutes_mismatch', `${adjudicationAt}.correctionMinutes`, 'correctionMinutes must equal elapsedSeconds / 60.');
      } else if (evidence.kind === 'estimate_only') {
        ensure(evidence.startedAt === null && evidence.endedAt === null && evidence.elapsedSeconds === null, errors, 'correction_estimate_not_measured', `${adjudicationAt}.correctionTimeEvidence`, 'Estimate-only evidence cannot contain timestamps or elapsedSeconds.');
        ensure(typeof evidence.reviewerId === 'string' && evidence.reviewerId.length > 0, errors, 'correction_estimate_reviewer', `${adjudicationAt}.correctionTimeEvidence.reviewerId`, 'Estimate-only evidence requires the estimator reviewerId.');
        ensure(typeof evidence.measurementMethod === 'string' && evidence.measurementMethod.length > 0, errors, 'correction_estimate_method', `${adjudicationAt}.correctionTimeEvidence.measurementMethod`, 'Estimate-only evidence requires an explicit estimation method.');
      } else if (evidence.kind === 'not_available') {
        ensure(adjudication.correctionMinutes === null, errors, 'correction_not_available_minutes', `${adjudicationAt}.correctionMinutes`, 'Not-available evidence requires null correctionMinutes.');
        ensure(evidence.startedAt === null && evidence.endedAt === null && evidence.elapsedSeconds === null && evidence.reviewerId === null && evidence.measurementMethod === null, errors, 'correction_not_available_fields', `${adjudicationAt}.correctionTimeEvidence`, 'Not-available correction evidence must keep every measurement field null.');
      }
    }
  }
  throwIf(errors, 'review results');
  return recomputeReviewMetrics(document, context.manifest, context.gold);
}

function dispositionDecision(value) {
  return Object.fromEntries(['generationState', 'outcome', 'conversionReadiness', 'executableAllowed', 'publicExportAllowed'].map((key) => [key, value?.[key] ?? null]));
}

function gateDecisionFromClassification(classification) {
  return normalizedGateDecision({
    discoveryAccess: classification?.access?.discoveryAccess,
    rowAccess: classification?.access?.rowAccess,
    sourceRowStatus: classification?.review?.sourceRowStatus,
    rightsBasis: classification?.rights?.basis,
    allowedUse: classification?.rights?.allowedUse ?? [],
    freshnessReview: classification?.review?.freshnessReview,
    localeReview: classification?.review?.localeReview,
    safetyReview: classification?.review?.safetyReview,
    privacyReview: classification?.review?.privacyReview,
    rightsReview: classification?.review?.rightsReview ?? classification?.rights?.reviewStatus,
    promotionState: classification?.review?.promotionState,
    blockers: classification?.review?.blockers ?? [],
  });
}

export function validateRawReviewProvenance(reviewDocument, context) {
  const errors = [];
  const runDocuments = (context.runFiles || []).map((file) => ({ file, document: readJson(file) }));
  const decisionDocuments = (context.decisionFiles || []).map((file) => ({ file, document: readJson(file) }));
  const manifestIds = context.manifest.cases.map((entry) => entry.caseId);
  const goldCases = caseMap(context.gold);
  const expectedProfile = {
    low_cost_independent: 'low_cost_agent',
    high_capability_independent: 'high_capability_agent',
  };
  for (const [roundIndex, round] of reviewDocument.rounds.entries()) {
    const at = `review.rounds[${roundIndex}]`;
    const rulesOutputs = runDocuments.filter((entry) => entry.document.roundId === round.roundId).flatMap((entry) => entry.document.outputs || []);
    ensure(sameSet(rulesOutputs.map((entry) => entry.caseId), manifestIds), errors, 'raw_rules_case_set', at, `${round.roundId} rules output set must exactly match the manifest.`);
    const decisionsByLane = {};
    for (const [lane, profile] of Object.entries(expectedProfile)) {
      const matching = decisionDocuments.filter((entry) => entry.document.roundId === round.roundId && entry.document.profile === profile);
      ensure(matching.length === 1, errors, 'raw_decision_set', `${at}.${lane}`, `${round.roundId} requires exactly one ${profile} raw decision set.`);
      if (matching.length !== 1) continue;
      const document = matching[0].document;
      ensure(document.blind === true, errors, 'raw_decision_blinding', matching[0].file, 'Independent decision set must be blind.');
      ensure(document.caseSetVersion === context.manifest.caseSetVersion, errors, 'raw_decision_case_version', matching[0].file, 'Independent decision caseSetVersion is stale.');
      ensure(Array.isArray(document.decisions) && unique(document.decisions.map((entry) => entry.caseId)) && sameSet(document.decisions.map((entry) => entry.caseId), manifestIds), errors, 'raw_decision_case_set', matching[0].file, 'Independent decisions must exactly match the manifest.');
      ensure(document.modelEvidence?.actualApiCostMeasured !== true, errors, 'raw_cost_claim', matching[0].file, 'Session-agent evidence cannot claim measured provider API cost.');
      decisionsByLane[lane] = new Map((document.decisions || []).map((entry) => [entry.caseId, entry]));
    }
    for (const review of round.reviews) {
      let rawClassification;
      let rawDisposition;
      let rawGate;
      let rawRoles;
      if (review.reviewerLane === 'rules_first') {
        const output = rulesOutputs.find((entry) => entry.caseId === review.caseId);
        rawClassification = output?.classification?.taxonomy;
        rawDisposition = dispositionDecision(output?.feasibility);
        rawGate = gateDecisionFromClassification(output?.classification);
        rawRoles = output?.sourceEvidence?.roleAssignments;
      } else {
        const decision = decisionsByLane[review.reviewerLane]?.get(review.caseId);
        rawClassification = decision?.classification;
        rawDisposition = dispositionDecision(decision?.feasibility);
        rawGate = gateDecisionFromClassification(decision?.classification);
        rawRoles = decision?.roles;
      }
      ensure(classificationEqual(review.classification, rawClassification), errors, 'raw_classification_mismatch', `${at}.${review.reviewId}.classification`, 'Review classification differs from its raw lane evidence.');
      ensure(JSON.stringify(dispositionDecision(review.disposition)) === JSON.stringify(rawDisposition), errors, 'raw_disposition_mismatch', `${at}.${review.reviewId}.disposition`, 'Review disposition differs from its raw lane evidence.');
      ensure(gateDecisionEqual(review.gateDecision, rawGate), errors, 'raw_gate_mismatch', `${at}.${review.reviewId}.gateDecision`, 'Review gate decision differs from its raw lane evidence.');
      const goldRows = (goldCases.get(review.caseId)?.expectedRoleByRow || []).map((entry) => entry.sourceRowId);
      const roleRows = Array.isArray(rawRoles) ? rawRoles.map((entry) => entry.sourceRowId) : [];
      const sourceAccountingPass = unique(roleRows) && sameSet(roleRows, goldRows);
      ensure(review.sourceRoleAccountingPass === sourceAccountingPass, errors, 'raw_source_accounting_mismatch', `${at}.${review.reviewId}.sourceRoleAccountingPass`, 'Review source accounting flag differs from raw role assignments.');
    }
  }
  throwIf(errors, 'raw review provenance');
  return true;
}

export function recomputeReviewMetrics(document, manifest, gold) {
  const manifestCases = caseMap(manifest);
  const goldCases = caseMap(gold);
  return document.rounds.map((round) => {
    let exactMatches = 0;
    let exactGateMatches = 0;
    const axisMatches = { primaryLifeArea: 0, sourceShape: 0, primaryExecutionPattern: 0, primaryArtifact: 0 };
    const axisTotals = { primaryLifeArea: 0, sourceShape: 0, primaryExecutionPattern: 0, primaryArtifact: 0 };
    for (const manifestCase of manifest.cases) {
      const reviews = round.reviews.filter((entry) => entry.caseId === manifestCase.caseId);
      if (reviews.length === 3 && reviews.slice(1).every((entry) => classificationEqual(entry.classification, reviews[0].classification))) exactMatches += 1;
      if (reviews.length === 3 && reviews.slice(1).every((entry) => gateDecisionEqual(entry.gateDecision, reviews[0].gateDecision))) exactGateMatches += 1;
    }
    let goldMatches = 0;
    let goldTotal = 0;
    let gateGoldMatches = 0;
    let gateGoldTotal = 0;
    const gateFieldMatches = Object.fromEntries(Object.keys(normalizedGateDecision({})).map((key) => [key, 0]));
    const gateFieldTotals = Object.fromEntries(Object.keys(normalizedGateDecision({})).map((key) => [key, 0]));
    let dispositionMatches = 0;
    for (const adjudication of round.adjudications) {
      const goldCase = goldCases.get(adjudication.caseId);
      const expected = coreClassification(goldCase.expectedClassification);
      const actual = coreClassification(adjudication.finalClassification);
      for (const axis of Object.keys(axisMatches)) {
        if (expected[axis] !== null) {
          axisTotals[axis] += 1;
          goldTotal += 1;
          if (actual[axis] === expected[axis]) {
            axisMatches[axis] += 1;
            goldMatches += 1;
          }
        }
      }
      const disposition = goldCase.expectedDisposition;
      if (['generationState', 'outcome', 'conversionReadiness', 'executableAllowed', 'publicExportAllowed'].every((key) => adjudication.finalDisposition[key] === disposition[key])) dispositionMatches += 1;
      const expectedGate = normalizedGateDecision(goldGateDecision(goldCase.expectedClassification));
      const actualGate = normalizedGateDecision(adjudication.finalGateDecision);
      for (const key of Object.keys(expectedGate)) {
        if (expectedGate[key] === null) continue;
        gateFieldTotals[key] += 1;
        gateGoldTotal += 1;
        const matches = ['blockers', 'allowedUse'].includes(key) ? sameSet(expectedGate[key], actualGate[key]) : expectedGate[key] === actualGate[key];
        if (matches) {
          gateFieldMatches[key] += 1;
          gateGoldMatches += 1;
        }
      }
    }
    const checkable = round.adjudications.reduce((sum, entry) => sum + entry.checkableItems, 0);
    const nonCheckable = round.adjudications.reduce((sum, entry) => sum + entry.nonCheckableItems, 0);
    const essentialExpected = round.adjudications.reduce((sum, entry) => sum + entry.essentialFieldChecks.expected, 0);
    const essentialRetained = round.adjudications.reduce((sum, entry) => sum + entry.essentialFieldChecks.retained, 0);
    const keepRates = round.adjudications.filter((entry) => entry.itemsGenerated > 0).map((entry) => entry.itemsKept / entry.itemsGenerated);
    const corePositive = round.adjudications.filter((entry) => laneOf(manifestCases.get(entry.caseId)) === 'core_positive');
    const measuredCorrections = round.adjudications.filter((entry) => entry.correctionTimeEvidence.kind === 'measured_independent_agent_review');
    const correctionTimes = measuredCorrections.map((entry) => entry.correctionMinutes);
    const measuredCoreCorrections = measuredCorrections.filter((entry) => laneOf(manifestCases.get(entry.caseId)) === 'core_positive');
    const readyCases = round.adjudications.filter((entry) => ['ready_for_internal_canary', 'ready_second_wave'].includes(entry.finalDisposition.conversionReadiness));
    const controls = round.adjudications.filter((entry) => ['positive_control', 'negative_control'].includes(laneOf(manifestCases.get(entry.caseId))));
    const safetyCases = round.adjudications.filter((entry) => {
      const goldCase = goldCases.get(entry.caseId);
      return goldCase?.expectedClassification?.review?.safetyReview !== 'not_required' || goldCase?.expectedRoleByRow?.some((row) => row.role === 'conditional_response');
    });
    const safetyCheckable = safetyCases.reduce((sum, entry) => sum + entry.checkableItems, 0);
    const safetyNonCheckable = safetyCases.reduce((sum, entry) => sum + entry.nonCheckableItems, 0);
    return {
      roundId: round.roundId,
      caseCount: round.adjudications.length,
      sourceRoleAccountingRate: ratio(round.reviews.filter((entry) => entry.sourceRoleAccountingPass).length, round.reviews.length),
      unsupportedInferenceCount: round.adjudications.reduce((sum, entry) => sum + entry.unsupportedInferenceCount, 0),
      checkabilityPrecision: ratio(checkable, checkable + nonCheckable),
      safetyCheckabilityPrecision: ratio(safetyCheckable, safetyCheckable + safetyNonCheckable),
      essentialProjectionRetentionRate: ratio(essentialRetained, essentialExpected),
      threeWayExactMatchRate: ratio(exactMatches, manifest.cases.length),
      threeWayGateExactMatchRate: ratio(exactGateMatches, manifest.cases.length),
      coreTaxonomyGoldMatchRate: ratio(goldMatches, goldTotal),
      axisGoldMatchRates: Object.fromEntries(Object.keys(axisMatches).map((axis) => [axis, ratio(axisMatches[axis], axisTotals[axis])])),
      gateGoldMatchRate: ratio(gateGoldMatches, gateGoldTotal),
      gateFieldGoldMatchRates: Object.fromEntries(Object.keys(gateFieldMatches).map((key) => [key, ratio(gateFieldMatches[key], gateFieldTotals[key])])),
      dispositionMatchRate: ratio(dispositionMatches, round.adjudications.length),
      medianItemKeepRate: median(keepRates),
      corePositiveNoMinorCount: corePositive.filter((entry) => ['none', 'minor'].includes(entry.editLevel)).length,
      corePositiveCount: corePositive.length,
      readyMajorRegenerationCount: readyCases.filter((entry) => ['major', 'full_regeneration'].includes(entry.editLevel)).length,
      measuredCorrectionCount: measuredCorrections.length,
      measuredCoreCorrectionCount: measuredCoreCorrections.length,
      medianCorrectionMinutes: median(correctionTimes),
      p75CorrectionMinutes: percentile(correctionTimes, 0.75),
      controlRegressionCount: controls.filter((entry) => entry.controlRegression).length,
      blockingDisagreementCount: round.adjudications.filter((entry) => entry.blockingDisagreement || entry.unresolvedDisagreements.length > 0).length,
    };
  });
}

function numericEqual(left, right) {
  return typeof left === 'number' && typeof right === 'number' && Math.abs(left - right) <= 1e-9;
}

function compareMetricObject(expected, actual, at, errors) {
  for (const [key, value] of Object.entries(expected)) {
    if (isObject(value)) compareMetricObject(value, actual?.[key], `${at}.${key}`, errors);
    else if (typeof value === 'number') ensure(numericEqual(value, actual?.[key]), errors, 'derived_metric_mismatch', `${at}.${key}`, 'Published metric differs from raw recomputation.');
    else ensure(value === actual?.[key], errors, 'derived_metric_mismatch', `${at}.${key}`, 'Published metric differs from raw recomputation.');
  }
}

export function validateComparison(document, recomputedMetrics, context) {
  const errors = [];
  ensure(document?.documentType === 'flowme_output_quality_comparison', errors, 'comparison_type', 'comparison.documentType', 'Unexpected comparison documentType.');
  ensure(document?.schemaVersion === 'flowme-output-quality-comparison-v2', errors, 'comparison_version', 'comparison.schemaVersion', 'Unexpected comparison schemaVersion.');
  ensure(document?.caseSetVersion === context.manifest.caseSetVersion, errors, 'comparison_case_version', 'comparison.caseSetVersion', 'Comparison caseSetVersion is stale.');
  ensure(document?.goldContractVersion === context.gold.contractVersion, errors, 'comparison_gold_version', 'comparison.goldContractVersion', 'Comparison goldContractVersion is stale.');
  ensure(/not observed-user validation/i.test(document?.validationBoundary ?? ''), errors, 'comparison_claim_boundary', 'comparison.validationBoundary', 'Comparison must disclaim observed-user validation.');
  ensure(Array.isArray(document?.rounds), errors, 'comparison_rounds', 'comparison.rounds', 'Comparison rounds are required.');
  if (Array.isArray(document?.rounds)) {
    ensure(sameSet(document.rounds.map((entry) => entry.roundId), recomputedMetrics.map((entry) => entry.roundId)), errors, 'comparison_round_set', 'comparison.rounds', 'Comparison rounds differ from raw review rounds.');
    for (const entry of document.rounds) {
      const recomputed = recomputedMetrics.find((metric) => metric.roundId === entry.roundId);
      ensure(isObject(entry.metrics), errors, 'comparison_metrics', `comparison.${entry.roundId}.metrics`, 'Round metrics are required.');
      if (isObject(entry.metrics) && recomputed) compareMetricObject(recomputed, entry.metrics, `comparison.${entry.roundId}.metrics`, errors);
    }
  }
  const final = recomputedMetrics.at(-1);
  ensure(isObject(document?.finalMetrics), errors, 'comparison_final_metrics', 'comparison.finalMetrics', 'finalMetrics are required.');
  if (isObject(document?.finalMetrics) && final) compareMetricObject(final, document.finalMetrics, 'comparison.finalMetrics', errors);
  throwIf(errors, 'comparison');
  return true;
}

export function loadContext(baseDir = here, { requireGenerated = false } = {}) {
  const errors = [];
  const context = {
    baseDir,
    manifest: requiredJson(path.join(baseDir, 'case-manifest-v2.json'), 'case manifest', errors),
    gold: requiredJson(path.join(baseDir, 'gold-source-contract-v2.json'), 'gold source contract', errors),
    outputSchema: requiredJson(path.join(baseDir, 'output-envelope-v2.schema.json'), 'output envelope schema', errors),
    reviewSchema: requiredJson(path.join(baseDir, 'review-result-v2.schema.json'), 'review result schema', errors),
    taxonomy: requiredJson(path.join(taxonomyDir, 'taxonomy-v1.1.json'), 'Taxonomy v1.1 catalog', errors),
  };
  if (requireGenerated) {
    context.reviewResults = requiredJson(path.join(baseDir, 'review-results-v2.json'), 'review results', errors);
    context.comparison = requiredJson(path.join(baseDir, 'comparison-v2.json'), 'comparison', errors);
    const runsDir = path.join(baseDir, 'runs');
    ensure(fs.existsSync(runsDir), errors, 'missing_artifact', runsDir, 'Required runs directory is missing.');
    context.runFiles = collectJsonFiles(runsDir);
    ensure(context.runFiles.length > 0, errors, 'missing_artifact', runsDir, 'No run JSON files were found.');
    const decisionsDir = path.join(baseDir, 'independent-decisions');
    ensure(fs.existsSync(decisionsDir), errors, 'missing_artifact', decisionsDir, 'Required independent-decisions directory is missing.');
    context.decisionFiles = collectJsonFiles(decisionsDir);
    ensure(context.decisionFiles.length > 0, errors, 'missing_artifact', decisionsDir, 'No independent decision JSON files were found.');
  }
  throwIf(errors, 'output-quality context');
  validateManifest(context.manifest);
  validateGoldContract(context.gold, context.manifest);
  return context;
}

export function validateAll(baseDir = here) {
  const context = loadContext(baseDir, { requireGenerated: true });
  const entries = context.runFiles.map((file) => ({ file, run: readJson(file) }));
  const roundIds = [...new Set(entries.map((entry) => entry.run.roundId))].sort();
  const errors = [];
  ensure(roundIds.length >= 2 && roundIds.length <= 4, errors, 'round_count', 'Two to four generated rounds are required.');
  const rounds = [];
  for (const roundId of roundIds) {
    try { rounds.push(validateRound(entries, context, roundId)); }
    catch (error) { errors.push(...normalizeSchemaErrors(error, roundId)); }
  }
  let metrics = [];
  try { metrics = validateReviewResults(context.reviewResults, context); }
  catch (error) { errors.push(...normalizeSchemaErrors(error, 'review-results')); }
  if (metrics.length) {
    ensure(sameSet(metrics.map((entry) => entry.roundId), roundIds), errors, 'review_run_round_set', 'review-results.rounds', 'Review rounds must exactly match generated run rounds.');
    try { validateComparison(context.comparison, metrics, context); }
    catch (error) { errors.push(...normalizeSchemaErrors(error, 'comparison')); }
    try { validateRawReviewProvenance(context.reviewResults, context); }
    catch (error) { errors.push(...normalizeSchemaErrors(error, 'raw-review-provenance')); }
  }
  throwIf(errors, 'all output-quality artifacts');
  return {
    validatorVersion: 'flowme-url-to-flow-output-quality-validator-v2',
    caseCount: context.manifest.cases.length,
    rounds,
    metrics,
    valid: true,
  };
}

function relative(file) {
  return path.relative(repoRoot, file).replaceAll('\\', '/');
}

function cliError(error, wantsJson) {
  const details = (error.errors || [error.message]).map((entry) => isObject(entry) ? entry : issue('validation', '', String(entry)));
  if (wantsJson) console.log(JSON.stringify({ valid: false, errors: details }, null, 2));
  else {
    console.error(error.message);
    for (const detail of details) console.error(`- ${detail.code}${detail.path ? ` ${detail.path}` : ''}: ${detail.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const wantsJson = args.includes('--json');
  const fileIndex = args.indexOf('--file');
  const roundIndex = args.indexOf('--round');
  if (args.includes('--help') || (!args.includes('--all') && fileIndex === -1 && roundIndex === -1)) {
    console.log(`Usage:\n  node validate-output-quality-v2.mjs --file <run.json> [--json]\n  node validate-output-quality-v2.mjs --round <round-1|round-2|round-3|round-4> [--json]\n  node validate-output-quality-v2.mjs --all [--json]\n\n--all requires the manifest, gold contract, 2-4 round files, review results, and comparison.`);
    process.exitCode = args.includes('--help') ? 0 : 1;
    return;
  }
  try {
    let result;
    if (args.includes('--all')) result = validateAll(here);
    else {
      const context = loadContext(here);
      if (fileIndex !== -1) {
        const file = path.resolve(repoRoot, args[fileIndex + 1]);
        if (!fs.existsSync(file)) throw new ContractValidationError('run file is missing', [issue('missing_artifact', file, 'Requested run JSON does not exist.')]);
        result = validateRunDocument(readJson(file), context, { file: relative(file) });
      } else {
        const roundId = args[roundIndex + 1];
        const files = collectJsonFiles(path.join(here, 'runs', roundId));
        if (!files.length) throw new ContractValidationError('round is missing', [issue('missing_artifact', path.join(here, 'runs', roundId), `No run JSON files found for ${roundId}.`)]);
        result = validateRound(files.map((file) => ({ file: relative(file), run: readJson(file) })), context, roundId);
      }
    }
    if (wantsJson) console.log(JSON.stringify(result, null, 2));
    else console.log(`PASS ${result.validatorVersion || result.roundId || result.runId}: output-quality v2 contract is valid.`);
  } catch (error) {
    cliError(error, wantsJson);
    process.exitCode = 1;
  }
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) await main();
