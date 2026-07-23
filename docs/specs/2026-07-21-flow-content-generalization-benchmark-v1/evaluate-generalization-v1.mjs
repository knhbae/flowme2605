import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ContractValidationError,
  flattenRuns,
  validateAgainstSchema,
  validateBenchmarkDocuments,
} from './validate-generalization-v1.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_RUN_SCHEMA_PATH = path.join(here, 'benchmark-envelope-v1.schema.json');
const DEFAULT_ADJUDICATION_SCHEMA_PATH = path.join(here, 'adjudication-v1.schema.json');
const ROLES = ['rules', 'low_cost', 'high_capability'];
const ARTIFACTS = ['calendar', 'checklist', 'todo', 'sheet', 'memo'];
const GATE_KEYS = [
  'access',
  'rights',
  'freshness',
  'locale',
  'safety',
  'privacy',
  'publicExportAllowed',
  'personalPreviewAllowed',
];
const STOPPED_STATES = ['source_import_required', 'hold', 'blocked'];
const SOURCE_COMPLETENESS = ['complete', 'partial', 'metadata_only', 'missing'];
const STATES = ['ready', 'needs_confirmation', ...STOPPED_STATES];
const INVENTION_TYPES = ['action', 'date', 'repeat', 'completion', 'condition', 'location', 'field', 'other'];
const VALID_GATE_VALUES = {
  access: ['open', 'partial', 'account_required', 'unavailable'],
  rights: ['open', 'link_only', 'permission_required', 'restricted', 'unknown'],
  freshness: ['passed', 'review_required', 'unknown'],
  locale: ['applicable', 'review_required', 'not_applicable'],
  safety: ['not_required', 'review_required', 'blocked'],
  privacy: ['not_required', 'review_required', 'blocked'],
};

function issue(code, at, message) {
  return { code, path: at, message };
}

function ensure(condition, errors, code, at, message) {
  if (!condition) errors.push(issue(code, at, message));
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unique(values) {
  return Array.isArray(values) && new Set(values).size === values.length;
}

function sameSet(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : Number((numerator / denominator).toFixed(6));
}

function round(value) {
  return value === null || value === undefined ? null : Number(value.toFixed(6));
}

function throwIf(errors, label) {
  if (errors.length) throw new ContractValidationError(`${label} failed`, errors);
}

function normalizeSchemaErrors(error, prefix) {
  return (error.errors || [error.message]).map((entry) => (
    isObject(entry) && entry.code
      ? entry
      : issue('json_schema', prefix, String(entry))
  ));
}

function runKey(caseId, role) {
  return `${caseId}:${role}`;
}

function hasProjectionOffer(projection) {
  return ['primary', 'secondary', 'fallback'].includes(projection?.availability);
}

function hasProjectionPayload(projection) {
  return projection?.payload !== null && projection?.payload !== undefined;
}

function sourceRowIds(goldCase) {
  return (goldCase?.sourceRows || []).map((row) => row.sourceRowId);
}

function requiredMeaningRows(goldCase) {
  return (goldCase?.sourceRows || []).filter((row) => row.requiredForMeaning === true);
}

function goldDecision(goldCase) {
  return goldCase?.gold;
}

function nonEmpty(value) {
  return typeof value === 'string' && value.length > 0;
}

export function validateGoldEvaluationContract(gold, manifest) {
  const errors = [];
  const cases = gold?.cases;
  ensure(Array.isArray(cases), errors, 'gold_cases', 'gold.cases', 'Gold cases must be an array.');
  if (!Array.isArray(cases)) throwIf(errors, 'gold evaluation contract');
  const manifestIds = manifest.cases.map((entry) => entry.caseId);
  ensure(sameSet(cases.map((entry) => entry?.caseId), manifestIds), errors, 'gold_manifest_case_mismatch', 'gold.cases', 'Gold and manifest case sets must match exactly.');

  for (const [caseIndex, entry] of cases.entries()) {
    const base = `gold.cases[${caseIndex}]`;
    const rows = entry?.sourceRows;
    ensure(Array.isArray(rows), errors, 'gold_source_rows', `${base}.sourceRows`, 'sourceRows must be an array.');
    if (Array.isArray(rows)) {
      const rowIds = rows.map((row) => row?.sourceRowId);
      ensure(unique(rowIds), errors, 'duplicate_gold_source_row', `${base}.sourceRows`, 'Gold SourceRow IDs must be unique.');
      for (const [rowIndex, row] of rows.entries()) {
        const rowBase = `${base}.sourceRows[${rowIndex}]`;
        ensure(nonEmpty(row?.sourceRowId), errors, 'gold_source_row', `${rowBase}.sourceRowId`, 'sourceRowId is required.');
        ensure(nonEmpty(row?.text), errors, 'gold_source_row', `${rowBase}.text`, 'SourceRow text is required.');
        ensure(nonEmpty(row?.meaning), errors, 'gold_source_row', `${rowBase}.meaning`, 'SourceRow meaning is required.');
        ensure(nonEmpty(row?.goldRole), errors, 'gold_source_row', `${rowBase}.goldRole`, 'SourceRow goldRole is required.');
        ensure(typeof row?.requiredForMeaning === 'boolean', errors, 'gold_source_row', `${rowBase}.requiredForMeaning`, 'requiredForMeaning must be boolean.');
      }
    }

    const decision = goldDecision(entry);
    ensure(isObject(decision), errors, 'gold_decision', `${base}.gold`, 'A canonical gold decision is required.');
    if (!isObject(decision)) continue;
    ensure(['positive', 'boundary'].includes(decision.admissionLabel), errors, 'gold_admission_label', `${base}.gold.admissionLabel`, 'admissionLabel must be positive or boundary.');
    ensure(typeof decision.flowPossible === 'boolean', errors, 'gold_flow_possible', `${base}.gold.flowPossible`, 'flowPossible must be boolean.');
    ensure(STATES.includes(decision.state), errors, 'gold_state', `${base}.gold.state`, 'Gold state is unsupported.');
    ensure(SOURCE_COMPLETENESS.includes(decision.sourceCompleteness), errors, 'gold_source_completeness', `${base}.gold.sourceCompleteness`, 'Gold sourceCompleteness is unsupported.');
    ensure(nonEmpty(decision.userJob), errors, 'gold_user_job', `${base}.gold.userJob`, 'Gold userJob is required.');
    ensure(decision.naturalArtifact === null || ARTIFACTS.includes(decision.naturalArtifact), errors, 'gold_artifact', `${base}.gold.naturalArtifact`, 'naturalArtifact must be canonical or null.');
    ensure(Array.isArray(decision.secondaryArtifacts) && unique(decision.secondaryArtifacts), errors, 'gold_artifact', `${base}.gold.secondaryArtifacts`, 'secondaryArtifacts must be a unique array.');
    for (const artifact of decision.secondaryArtifacts || []) {
      ensure(ARTIFACTS.includes(artifact), errors, 'gold_artifact', `${base}.gold.secondaryArtifacts`, `Unsupported artifact ${artifact}.`);
      ensure(artifact !== decision.naturalArtifact, errors, 'gold_artifact', `${base}.gold.secondaryArtifacts`, 'Primary artifact cannot repeat as secondary.');
    }
    ensure(Array.isArray(decision.allowedItems), errors, 'gold_allowed_items', `${base}.gold.allowedItems`, 'allowedItems must be an array.');
    ensure(Array.isArray(decision.forbiddenItems), errors, 'gold_forbidden_items', `${base}.gold.forbiddenItems`, 'forbiddenItems must be an array.');
    ensure(Array.isArray(decision.minimumInputs), errors, 'gold_minimum_inputs', `${base}.gold.minimumInputs`, 'minimumInputs must be an array.');
    ensure(isObject(decision.gates), errors, 'gold_gates', `${base}.gold.gates`, 'All gold gates are required.');
    ensure(nonEmpty(decision.reason), errors, 'gold_reason', `${base}.gold.reason`, 'Gold reason is required.');

    const rowIdSet = new Set(sourceRowIds(entry));
    for (const [itemIndex, item] of (decision.allowedItems || []).entries()) {
      const itemBase = `${base}.gold.allowedItems[${itemIndex}]`;
      ensure(nonEmpty(item?.itemKey), errors, 'gold_allowed_item', `${itemBase}.itemKey`, 'itemKey is required.');
      ensure(nonEmpty(item?.titleIntent), errors, 'gold_allowed_item', `${itemBase}.titleIntent`, 'titleIntent is required.');
      ensure(Array.isArray(item?.sourceRefs) && item.sourceRefs.length > 0, errors, 'gold_allowed_item', `${itemBase}.sourceRefs`, 'Allowed Items require SourceRow refs.');
      ensure((item?.sourceRefs || []).every((rowId) => rowIdSet.has(rowId)), errors, 'gold_allowed_item', `${itemBase}.sourceRefs`, 'Allowed Item refs must resolve to gold SourceRows.');
    }
    const inputKeys = (decision.minimumInputs || []).map((input) => input?.semanticKey);
    ensure(unique(inputKeys), errors, 'gold_minimum_input', `${base}.gold.minimumInputs`, 'Gold minimum input semantic keys must be unique.');
    for (const [inputIndex, input] of (decision.minimumInputs || []).entries()) {
      ensure(nonEmpty(input?.semanticKey), errors, 'gold_minimum_input', `${base}.gold.minimumInputs[${inputIndex}].semanticKey`, 'semanticKey is required.');
      ensure(typeof input?.requiredBeforeFirstPreview === 'boolean', errors, 'gold_minimum_input', `${base}.gold.minimumInputs[${inputIndex}].requiredBeforeFirstPreview`, 'requiredBeforeFirstPreview must be boolean.');
    }
    if (isObject(decision.gates)) {
      for (const key of GATE_KEYS) ensure(key in decision.gates, errors, 'gold_gate_missing', `${base}.gold.gates.${key}`, `${key} gate is required.`);
      for (const [key, values] of Object.entries(VALID_GATE_VALUES)) {
        ensure(values.includes(decision.gates[key]), errors, 'gold_gate_value', `${base}.gold.gates.${key}`, `${key} gate value is unsupported.`);
      }
      for (const key of ['publicExportAllowed', 'personalPreviewAllowed']) {
        ensure(typeof decision.gates[key] === 'boolean', errors, 'gold_gate_value', `${base}.gold.gates.${key}`, `${key} must be boolean.`);
      }
    }
    if (decision.admissionLabel === 'positive') {
      ensure(decision.flowPossible === true, errors, 'gold_positive_disposition', `${base}.gold.flowPossible`, 'Positive gold cases must be Flow-possible.');
      ensure(ARTIFACTS.includes(decision.naturalArtifact), errors, 'gold_positive_disposition', `${base}.gold.naturalArtifact`, 'Positive gold cases require one natural artifact.');
      ensure(['ready', 'needs_confirmation'].includes(decision.state), errors, 'gold_positive_disposition', `${base}.gold.state`, 'Positive gold cases require a usable state.');
    }
    if (decision.admissionLabel === 'boundary') {
      ensure(decision.flowPossible === false, errors, 'gold_boundary_disposition', `${base}.gold.flowPossible`, 'Boundary gold cases must stop without a Flow.');
      ensure(decision.naturalArtifact === null, errors, 'gold_boundary_disposition', `${base}.gold.naturalArtifact`, 'Boundary gold cases cannot name a natural artifact.');
      ensure(STOPPED_STATES.includes(decision.state), errors, 'gold_boundary_disposition', `${base}.gold.state`, 'Boundary gold cases must use a stopped state.');
      ensure((decision.allowedItems || []).length === 0, errors, 'gold_boundary_disposition', `${base}.gold.allowedItems`, 'Boundary gold cases cannot allow executable Items.');
    }
  }
  throwIf(errors, 'gold evaluation contract');
  return { caseCount: cases.length };
}

function validateExactCoverage(actualIds, expectedIds, errors, code, at, label) {
  ensure(unique(actualIds), errors, code, at, `${label} IDs must be unique.`);
  ensure(sameSet(actualIds, expectedIds), errors, code, at, `${label} must cover the expected IDs exactly.`);
}

export function validateAdjudicationLedger({ ledger, manifest, gold, runs, schema } = {}) {
  const errors = [];
  try {
    validateAgainstSchema(ledger, schema || JSON.parse(fs.readFileSync(DEFAULT_ADJUDICATION_SCHEMA_PATH, 'utf8')), 'adjudication');
  } catch (error) {
    errors.push(...normalizeSchemaErrors(error, 'adjudication'));
  }
  const normalizedRuns = flattenRuns(runs || []);
  const runByKey = new Map(normalizedRuns.map((run) => [runKey(run.caseId, run.processor.role), run]));
  const goldById = new Map(gold.cases.map((entry) => [entry.caseId, entry]));
  const expectedKeys = manifest.cases.flatMap((entry) => ROLES.map((role) => runKey(entry.caseId, role)));
  const entries = ledger?.entries || [];
  const actualKeys = entries.map((entry) => runKey(entry?.caseId, entry?.role));
  validateExactCoverage(actualKeys, expectedKeys, errors, 'adjudication_entry_coverage', 'adjudication.entries', 'Adjudication entries');
  ensure(ledger?.adjudicatedAt !== null, errors, 'adjudication_pending', 'adjudication.adjudicatedAt', 'Completed evaluation requires adjudicatedAt.');

  for (const [index, entry] of entries.entries()) {
    const key = runKey(entry?.caseId, entry?.role);
    const base = `adjudication.entries[${index}]`;
    const run = runByKey.get(key);
    const goldCase = goldById.get(entry?.caseId);
    ensure(Boolean(run), errors, 'adjudication_unknown_run', base, `No run exists for ${key}.`);
    ensure(Boolean(goldCase), errors, 'adjudication_unknown_case', base, `No gold case exists for ${entry?.caseId}.`);
    if (!run || !goldCase) continue;
    ensure(entry.reviewStatus === 'reviewed', errors, 'adjudication_pending', `${base}.reviewStatus`, `${key} must be explicitly reviewed.`);
    ensure(nonEmpty(entry.reviewedAt) && !Number.isNaN(Date.parse(entry.reviewedAt)), errors, 'adjudication_pending', `${base}.reviewedAt`, `${key} requires a review timestamp.`);
    ensure(entry.usability !== null, errors, 'adjudication_pending', `${base}.usability`, `${key} requires a usability judgment.`);

    const expectedRowIds = sourceRowIds(goldCase);
    validateExactCoverage((entry.rowJudgments || []).map((row) => row.sourceRowId), expectedRowIds, errors, 'adjudication_row_coverage', `${base}.rowJudgments`, `${key} row judgments`);
    for (const [rowIndex, judgment] of (entry.rowJudgments || []).entries()) {
      const goldRow = goldCase.sourceRows.find((row) => row.sourceRowId === judgment.sourceRowId);
      ensure(judgment.meaningPreservation !== null, errors, 'adjudication_pending', `${base}.rowJudgments[${rowIndex}].meaningPreservation`, 'Meaning preservation must be reviewed.');
      if (goldRow?.requiredForMeaning) {
        ensure(judgment.meaningPreservation !== 'not_applicable', errors, 'required_row_not_adjudicated', `${base}.rowJudgments[${rowIndex}]`, 'A meaning-required SourceRow cannot be marked not_applicable.');
      }
      if (['partially_preserved', 'lost'].includes(judgment.meaningPreservation)) {
        ensure(nonEmpty(judgment.note), errors, 'adjudication_note_required', `${base}.rowJudgments[${rowIndex}].note`, 'Partial or lost meaning requires a note.');
      }
    }

    const expectedItemIds = run.canonical.items.map((item) => item.itemId);
    validateExactCoverage((entry.itemJudgments || []).map((item) => item.itemId), expectedItemIds, errors, 'adjudication_item_coverage', `${base}.itemJudgments`, `${key} Item judgments`);
    for (const [itemIndex, judgment] of (entry.itemJudgments || []).entries()) {
      ensure(judgment.disposition !== null, errors, 'adjudication_pending', `${base}.itemJudgments[${itemIndex}].disposition`, 'Item disposition must be reviewed.');
      ensure(judgment.semanticSupport !== null, errors, 'adjudication_pending', `${base}.itemJudgments[${itemIndex}].semanticSupport`, 'Item semantic support must be reviewed.');
      if (judgment.disposition !== 'keep' || judgment.semanticSupport !== 'supported' || judgment.inventionTypes.length > 0) {
        ensure(nonEmpty(judgment.note), errors, 'adjudication_note_required', `${base}.itemJudgments[${itemIndex}].note`, 'Changed, unsupported, or invented Items require a note.');
      }
    }
    const inventionKeys = (entry.runInventions || []).map((invention) => `${invention.inventionType}:${invention.affectedPath}`);
    ensure(unique(inventionKeys), errors, 'duplicate_run_invention', `${base}.runInventions`, 'Run-level invention labels must be unique by type and path.');

    const expectedInputIds = run.minimumInputs.map((input) => input.inputId);
    validateExactCoverage((entry.inputJudgments || []).map((input) => input.inputId), expectedInputIds, errors, 'adjudication_input_coverage', `${base}.inputJudgments`, `${key} input judgments`);
    for (const [inputIndex, judgment] of (entry.inputJudgments || []).entries()) {
      ensure(judgment.disposition !== null, errors, 'adjudication_pending', `${base}.inputJudgments[${inputIndex}].disposition`, 'Input disposition must be reviewed.');
      ensure(typeof judgment.sourceValueReentry === 'boolean', errors, 'adjudication_pending', `${base}.inputJudgments[${inputIndex}].sourceValueReentry`, 'Source-value re-entry must be reviewed.');
      if (judgment.disposition !== 'keep' || judgment.sourceValueReentry) {
        ensure(nonEmpty(judgment.note), errors, 'adjudication_note_required', `${base}.inputJudgments[${inputIndex}].note`, 'Changed or source-derived inputs require a note.');
      }
    }
    if (entry.actualCost !== null) {
      ensure(run.processor.actualProviderApiUsed === true, errors, 'fabricated_cost', `${base}.actualCost`, 'Actual provider cost cannot be attached when no provider API was used.');
      ensure(run.processor.measuredInputTokens !== null && run.processor.measuredOutputTokens !== null, errors, 'fabricated_cost', `${base}.actualCost`, 'Token-priced actual cost requires measured input and output tokens.');
    }
  }
  throwIf(errors, 'adjudication ledger');
  return { entryCount: entries.length };
}

export function createAdjudicationTemplate({ manifest, gold, runs, adjudicator } = {}) {
  const normalizedRuns = flattenRuns(runs || []);
  const runByKey = new Map(normalizedRuns.map((run) => [runKey(run.caseId, run.processor.role), run]));
  const goldById = new Map(gold.cases.map((entry) => [entry.caseId, entry]));
  return {
    schemaVersion: 'flow-content-generalization-adjudication-v1',
    benchmarkId: 'flow-content-generalization-benchmark-v1',
    adjudicatedAt: null,
    adjudicator: adjudicator || {
      name: 'pending internal adjudicator',
      reviewBasis: 'agent_assisted_internal',
      humanReviewerConfirmed: false,
      independenceNote: 'Review the gold source contract and one run at a time; do not copy the run self-review as the adjudication result.',
    },
    entries: manifest.cases.flatMap((manifestCase) => ROLES.map((role) => {
      const run = runByKey.get(runKey(manifestCase.caseId, role));
      const goldCase = goldById.get(manifestCase.caseId);
      if (!run || !goldCase) throw new Error(`Cannot initialize adjudication without ${manifestCase.caseId}:${role}.`);
      return {
        caseId: manifestCase.caseId,
        role,
        reviewStatus: 'pending',
        reviewedAt: null,
        rowJudgments: goldCase.sourceRows.map((row) => ({
          sourceRowId: row.sourceRowId,
          meaningPreservation: null,
          note: null,
        })),
        itemJudgments: run.canonical.items.map((item) => ({
          itemId: item.itemId,
          disposition: null,
          semanticSupport: null,
          inventionTypes: [],
          note: null,
        })),
        inputJudgments: run.minimumInputs.map((input) => ({
          inputId: input.inputId,
          disposition: null,
          sourceValueReentry: null,
          note: null,
        })),
        runInventions: [],
        usability: null,
        actualCost: null,
        notes: [],
      };
    })),
  };
}

function meaningWeight(value) {
  if (value === 'preserved') return 1;
  if (value === 'partially_preserved') return 0.5;
  return 0;
}

function inventionCounts(inventions) {
  const byType = Object.fromEntries(INVENTION_TYPES.map((type) => [type, 0]));
  for (const invention of inventions) byType[invention.inventionType] += 1;
  return {
    total: inventions.length,
    byType,
    coreActionDateRepeat: byType.action + byType.date + byType.repeat,
  };
}

function calculateRunRecord({ manifestCase, goldCase, run, adjudication }) {
  const decision = goldDecision(goldCase);
  const acquired = run.sourceAssessment.acquiredRowIds;
  const acquiredSet = new Set(acquired);
  const assignments = run.sourceRowAssignments;
  const assignmentSet = new Set(assignments.map((entry) => entry.sourceRowId));
  const rowJudgmentById = new Map(adjudication.rowJudgments.map((entry) => [entry.sourceRowId, entry]));
  const requiredRows = requiredMeaningRows(goldCase);
  const rowMeaningWeighted = requiredRows.reduce((sum, row) => sum + meaningWeight(rowJudgmentById.get(row.sourceRowId)?.meaningPreservation), 0);
  const itemJudgmentById = new Map(adjudication.itemJudgments.map((entry) => [entry.itemId, entry]));
  const itemDetails = run.canonical.items.map((item) => {
    const judgment = itemJudgmentById.get(item.itemId);
    const validReferences = item.sourceRefs.length > 0 && item.sourceRefs.every((ref) => acquiredSet.has(ref));
    return {
      itemId: item.itemId,
      validReferences,
      semanticSupport: judgment.semanticSupport,
      provenanceFulfilled: validReferences && judgment.semanticSupport === 'supported',
      disposition: judgment.disposition,
      inventionTypes: judgment.inventionTypes,
    };
  });
  const inventions = [
    ...adjudication.itemJudgments.flatMap((item) => item.inventionTypes.map((inventionType) => ({
      inventionType,
      affectedPath: `canonical.items.${item.itemId}`,
      source: 'item_judgment',
    }))),
    ...adjudication.runInventions.map((invention) => ({ ...invention, source: 'run_judgment' })),
  ];
  const inputJudgmentById = new Map(adjudication.inputJudgments.map((entry) => [entry.inputId, entry]));
  const sourceValueKeys = new Set(run.sourceAssessment.sourceValueSemanticKeys || []);
  const sourceValueReentryInputIds = run.minimumInputs
    .filter((input) => sourceValueKeys.has(input.semanticKey) || inputJudgmentById.get(input.inputId)?.sourceValueReentry === true)
    .map((input) => input.inputId);
  const requiredInputs = run.minimumInputs.filter((input) => input.owner === 'user' && input.requiredBeforeFirstPreview);
  const goldRequiredInputKeys = decision.minimumInputs
    .filter((input) => input.requiredBeforeFirstPreview)
    .map((input) => input.semanticKey);
  const actualRequiredInputKeys = requiredInputs.map((input) => input.semanticKey);
  const allowedArtifacts = new Set([decision.naturalArtifact, ...decision.secondaryArtifacts].filter(Boolean));
  const offeredArtifacts = ARTIFACTS.filter((artifact) => hasProjectionOffer(run.projections[artifact]));
  const unnecessaryArtifacts = offeredArtifacts.filter((artifact) => !allowedArtifacts.has(artifact));
  const scheduledItemCount = run.canonical.items.filter((item) => item.schedule !== null && item.schedule !== undefined).length;
  const unscheduledIcsCount = Math.max(0, run.projections.ics.eventCount - scheduledItemCount);
  const gateOmissions = GATE_KEYS.filter((key) => !(key in run.gates));
  const gateMismatches = GATE_KEYS.filter((key) => key in run.gates && run.gates[key] !== decision.gates[key]);
  const anyUsableProjectionPayload = ARTIFACTS.some((artifact) => hasProjectionPayload(run.projections[artifact]));
  const boundaryCorrectStop = decision.admissionLabel === 'boundary'
    && run.feasibility.flowPossible === false
    && STOPPED_STATES.includes(run.feasibility.state)
    && run.canonical.items.length === 0
    && !anyUsableProjectionPayload;
  const selfReviewPotentialCount = Array.isArray(run.selfReview.potentialInventions)
    ? run.selfReview.potentialInventions.length
    : 0;

  return {
    caseId: run.caseId,
    split: manifestCase.split,
    role: run.processor.role,
    goldAdmissionLabel: decision.admissionLabel,
    comparisons: {
      flowPossible: {
        gold: decision.flowPossible,
        actual: run.feasibility.flowPossible,
        match: decision.flowPossible === run.feasibility.flowPossible,
      },
      state: {
        gold: decision.state,
        actual: run.feasibility.state,
        match: decision.state === run.feasibility.state,
      },
      sourceCompleteness: {
        gold: decision.sourceCompleteness,
        actual: run.sourceAssessment.completeness,
        match: decision.sourceCompleteness === run.sourceAssessment.completeness,
      },
      primaryArtifact: {
        gold: decision.naturalArtifact,
        actual: run.classification.primaryArtifact,
        match: decision.naturalArtifact === run.classification.primaryArtifact,
      },
      requiredMinimumInputs: {
        goldSemanticKeys: goldRequiredInputKeys,
        actualSemanticKeys: actualRequiredInputKeys,
        exactMatch: sameSet(goldRequiredInputKeys, actualRequiredInputKeys),
      },
    },
    boundary: {
      correctStop: boundaryCorrectStop,
    },
    sourceRows: {
      goldCount: goldCase.sourceRows.length,
      acquiredCount: acquired.filter((rowId) => sourceRowIds(goldCase).includes(rowId)).length,
      accountedCount: sourceRowIds(goldCase).filter((rowId) => acquiredSet.has(rowId) && assignmentSet.has(rowId)).length,
      requiredMeaningCount: requiredRows.length,
      meaningPreservationWeightedCount: rowMeaningWeighted,
      meaningJudgments: adjudication.rowJudgments,
    },
    items: {
      generatedCount: run.canonical.items.length,
      provenanceFulfilledCount: itemDetails.filter((item) => item.provenanceFulfilled).length,
      deleteCount: adjudication.itemJudgments.filter((item) => item.disposition === 'delete').length,
      majorEditCount: adjudication.itemJudgments.filter((item) => item.disposition === 'major_edit').length,
      details: itemDetails,
    },
    inventions: {
      ...inventionCounts(inventions),
      labels: inventions,
      selfReviewPotentialCount,
      adjudicationFoundBeyondEmptySelfReview: inventions.length > 0 && selfReviewPotentialCount === 0,
    },
    inputs: {
      totalCount: run.minimumInputs.length,
      requiredBeforeFirstPreviewCount: requiredInputs.length,
      sourceValueReentryCount: sourceValueReentryInputIds.length,
      sourceValueReentryInputIds,
      exactGoldRequiredInputMatch: sameSet(goldRequiredInputKeys, actualRequiredInputKeys),
    },
    projections: {
      offeredArtifacts,
      unnecessaryArtifacts,
      unnecessaryCount: unnecessaryArtifacts.length,
      unscheduledIcsCount,
    },
    gates: {
      omissionCount: gateOmissions.length,
      mismatchCount: gateMismatches.length,
      issueCount: gateOmissions.length + gateMismatches.length,
      omissions: gateOmissions,
      mismatches: gateMismatches.map((key) => ({ key, gold: decision.gates[key], actual: run.gates[key] })),
    },
    review: {
      usability: adjudication.usability,
      directlyUsablePositive: decision.admissionLabel === 'positive' && adjudication.usability === 'directly_usable',
      correctStopJudged: decision.admissionLabel === 'boundary' && adjudication.usability === 'correct_stop',
    },
    measurements: {
      elapsedMs: run.processor.elapsedMs,
      inputTokens: run.processor.measuredInputTokens,
      outputTokens: run.processor.measuredOutputTokens,
      totalTokens: run.processor.measuredInputTokens !== null && run.processor.measuredOutputTokens !== null
        ? run.processor.measuredInputTokens + run.processor.measuredOutputTokens
        : null,
      retryCount: run.processor.retryCount,
      humanInterventionCount: run.processor.humanInterventionCount,
      actualProviderApiUsed: run.processor.actualProviderApiUsed,
      actualCost: adjudication.actualCost,
    },
  };
}

function measuredStats(values, totalRunCount) {
  const measured = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (measured.length === 0) {
    return {
      measuredRunCount: 0,
      unmeasuredRunCount: totalRunCount,
      coverageRate: 0,
      total: null,
      averageOverMeasuredRuns: null,
      minimum: null,
      maximum: null,
    };
  }
  const total = measured.reduce((sum, value) => sum + value, 0);
  return {
    measuredRunCount: measured.length,
    unmeasuredRunCount: totalRunCount - measured.length,
    coverageRate: ratio(measured.length, totalRunCount),
    total: round(total),
    averageOverMeasuredRuns: round(total / measured.length),
    minimum: Math.min(...measured),
    maximum: Math.max(...measured),
  };
}

function costStats(records) {
  const measured = records.filter((record) => record.measurements.actualCost !== null);
  const currencies = [...new Set(measured.map((record) => record.measurements.actualCost.currency))].sort();
  return {
    measuredRunCount: measured.length,
    unmeasuredRunCount: records.length - measured.length,
    coverageRate: ratio(measured.length, records.length) ?? 0,
    byCurrency: currencies.map((currency) => {
      const entries = measured.filter((record) => record.measurements.actualCost.currency === currency);
      const amount = entries.reduce((sum, record) => sum + record.measurements.actualCost.amount, 0);
      return {
        currency,
        measuredRunCount: entries.length,
        total: round(amount),
        averageOverMeasuredRuns: round(amount / entries.length),
        evidence: entries.map((record) => ({
          caseId: record.caseId,
          role: record.role,
          basis: record.measurements.actualCost.basis,
          evidence: record.measurements.actualCost.evidence,
        })),
      };
    }),
  };
}

function makeTarget(id, description, actual, threshold, pass) {
  return { id, description, actual, threshold, pass };
}

export function aggregateRecords(records, label = 'all') {
  const positive = records.filter((record) => record.goldAdmissionLabel === 'positive');
  const boundaries = records.filter((record) => record.goldAdmissionLabel === 'boundary');
  const flowMatches = records.filter((record) => record.comparisons.flowPossible.match).length;
  const stateMatches = records.filter((record) => record.comparisons.state.match).length;
  const completenessMatches = records.filter((record) => record.comparisons.sourceCompleteness.match).length;
  const boundaryStops = boundaries.filter((record) => record.boundary.correctStop).length;
  const goldRows = records.reduce((sum, record) => sum + record.sourceRows.goldCount, 0);
  const acquiredRows = records.reduce((sum, record) => sum + record.sourceRows.acquiredCount, 0);
  const accountedRows = records.reduce((sum, record) => sum + record.sourceRows.accountedCount, 0);
  const requiredMeaningRowsCount = records.reduce((sum, record) => sum + record.sourceRows.requiredMeaningCount, 0);
  const preservedMeaning = records.reduce((sum, record) => sum + record.sourceRows.meaningPreservationWeightedCount, 0);
  const generatedItems = records.reduce((sum, record) => sum + record.items.generatedCount, 0);
  const provenanceItems = records.reduce((sum, record) => sum + record.items.provenanceFulfilledCount, 0);
  const deletedItems = records.reduce((sum, record) => sum + record.items.deleteCount, 0);
  const majorEditedItems = records.reduce((sum, record) => sum + record.items.majorEditCount, 0);
  const inventionByType = Object.fromEntries(INVENTION_TYPES.map((type) => [
    type,
    records.reduce((sum, record) => sum + record.inventions.byType[type], 0),
  ]));
  const totalInventions = Object.values(inventionByType).reduce((sum, value) => sum + value, 0);
  const coreInventions = inventionByType.action + inventionByType.date + inventionByType.repeat;
  const sourceValueReentry = records.reduce((sum, record) => sum + record.inputs.sourceValueReentryCount, 0);
  const requiredInputViolations = positive.filter((record) => record.inputs.requiredBeforeFirstPreviewCount > 2).length;
  const inputExactMatches = records.filter((record) => record.inputs.exactGoldRequiredInputMatch).length;
  const positiveArtifactMatches = positive.filter((record) => record.comparisons.primaryArtifact.match).length;
  const allArtifactMatches = records.filter((record) => record.comparisons.primaryArtifact.match).length;
  const unnecessaryProjections = records.reduce((sum, record) => sum + record.projections.unnecessaryCount, 0);
  const unscheduledIcs = records.reduce((sum, record) => sum + record.projections.unscheduledIcsCount, 0);
  const gateOmissions = records.reduce((sum, record) => sum + record.gates.omissionCount, 0);
  const gateMismatches = records.reduce((sum, record) => sum + record.gates.mismatchCount, 0);
  const gateIssues = gateOmissions + gateMismatches;
  const directlyUsable = positive.filter((record) => record.review.directlyUsablePositive).length;
  const adjudicatedSelfReviewMisses = records.filter((record) => record.inventions.adjudicationFoundBeyondEmptySelfReview).length;
  const flowRate = ratio(flowMatches, records.length);
  const boundaryRate = ratio(boundaryStops, boundaries.length);
  const meaningRate = ratio(preservedMeaning, requiredMeaningRowsCount);
  const positiveArtifactRate = ratio(positiveArtifactMatches, positive.length);
  const combinedEditRate = ratio(deletedItems + majorEditedItems, generatedItems);
  const targets = [
    makeTarget('flow_possibility_at_least_85', 'Flow possibility agrees with gold in at least 85% of runs.', flowRate, '>= 0.85', flowRate !== null && flowRate >= 0.85),
    makeTarget('boundary_recall_100', 'Every boundary run stops without canonical Items or usable projections.', boundaryRate, '= 1', boundaryRate === 1),
    makeTarget('source_meaning_at_least_90', 'Meaning-required SourceRows retain at least 90% weighted meaning.', meaningRate, '>= 0.90', meaningRate !== null && meaningRate >= 0.9),
    makeTarget('primary_artifact_at_least_85', 'Positive runs choose the gold primary artifact in at least 85% of runs.', positiveArtifactRate, '>= 0.85', positiveArtifactRate !== null && positiveArtifactRate >= 0.85),
    makeTarget('core_invention_zero', 'Adjudicated action, date, and repeat inventions are zero.', coreInventions, '= 0', coreInventions === 0),
    makeTarget('all_invention_zero', 'All adjudicated invention labels are zero.', totalInventions, '= 0', totalInventions === 0),
    makeTarget('source_value_reentry_zero', 'Source-derived values are never requested as user input.', sourceValueReentry, '= 0', sourceValueReentry === 0),
    makeTarget('unscheduled_ics_zero', 'No ICS event exists without a scheduled canonical Item.', unscheduledIcs, '= 0', unscheduledIcs === 0),
    makeTarget('gate_issue_zero', 'No source, rights, locale, safety, privacy, or publication gate is omitted or disagrees with gold.', gateIssues, '= 0', gateIssues === 0),
    makeTarget('first_preview_input_budget', 'Positive runs require no more than two user values before first preview.', requiredInputViolations, '= 0 violations', requiredInputViolations === 0),
    makeTarget('reviewed_item_delete_or_major_edit_at_most_20', 'Deleted plus major-edited Items are at most 20% of generated Items.', combinedEditRate, '<= 0.20', combinedEditRate !== null && combinedEditRate <= 0.2),
  ];

  return {
    label,
    runCount: records.length,
    positiveRunCount: positive.length,
    boundaryRunCount: boundaries.length,
    flowPossibilityAgreement: { matches: flowMatches, total: records.length, rate: flowRate },
    finalStateAgreement: { matches: stateMatches, total: records.length, rate: ratio(stateMatches, records.length) },
    sourceCompletenessAgreement: { matches: completenessMatches, total: records.length, rate: ratio(completenessMatches, records.length) },
    boundaryRecall: { correctStops: boundaryStops, total: boundaries.length, rate: boundaryRate },
    sourceRowExtractionRecall: { acquired: acquiredRows, gold: goldRows, rate: ratio(acquiredRows, goldRows) },
    sourceRowAccounting: { accounted: accountedRows, gold: goldRows, rate: ratio(accountedRows, goldRows) },
    sourceRowMeaningPreservation: { weightedPreserved: preservedMeaning, requiredRows: requiredMeaningRowsCount, rate: meaningRate },
    itemProvenance: { fulfilled: provenanceItems, generated: generatedItems, rate: ratio(provenanceItems, generatedItems) },
    inventions: {
      total: totalInventions,
      coreActionDateRepeat: coreInventions,
      byType: inventionByType,
      runsWhereAdjudicationFoundInventionBeyondEmptySelfReview: adjudicatedSelfReviewMisses,
    },
    sourceValueReentry: { count: sourceValueReentry },
    minimumInputAgreement: { exactMatches: inputExactMatches, total: records.length, rate: ratio(inputExactMatches, records.length) },
    firstPreviewInputBudget: { positiveRunsOverTwo: requiredInputViolations, positiveRuns: positive.length },
    primaryArtifactAgreement: {
      positiveMatches: positiveArtifactMatches,
      positiveTotal: positive.length,
      positiveRate: positiveArtifactRate,
      allCaseMatches: allArtifactMatches,
      allCaseTotal: records.length,
      allCaseRate: ratio(allArtifactMatches, records.length),
    },
    unnecessaryProjections: { count: unnecessaryProjections },
    unscheduledIcs: { count: unscheduledIcs },
    gates: { omissionCount: gateOmissions, disagreementCount: gateMismatches, issueCount: gateIssues },
    reviewedItemChanges: {
      generatedItems,
      deletedItems,
      majorEditedItems,
      deleteRate: ratio(deletedItems, generatedItems),
      majorEditRate: ratio(majorEditedItems, generatedItems),
      combinedRate: combinedEditRate,
    },
    directlyUsablePositiveResults: { count: directlyUsable, total: positive.length, rate: ratio(directlyUsable, positive.length) },
    measurements: {
      elapsedMs: measuredStats(records.map((record) => record.measurements.elapsedMs), records.length),
      inputTokens: measuredStats(records.map((record) => record.measurements.inputTokens), records.length),
      outputTokens: measuredStats(records.map((record) => record.measurements.outputTokens), records.length),
      totalTokens: measuredStats(records.map((record) => record.measurements.totalTokens), records.length),
      actualCost: costStats(records),
      retryCount: {
        total: records.reduce((sum, record) => sum + record.measurements.retryCount, 0),
        average: ratio(records.reduce((sum, record) => sum + record.measurements.retryCount, 0), records.length),
      },
      humanInterventionCount: {
        total: records.reduce((sum, record) => sum + record.measurements.humanInterventionCount, 0),
        average: ratio(records.reduce((sum, record) => sum + record.measurements.humanInterventionCount, 0), records.length),
      },
    },
    targets: {
      results: targets,
      passed: targets.filter((target) => target.pass).length,
      total: targets.length,
      allPass: targets.every((target) => target.pass),
    },
  };
}

function keyRates(summary) {
  return {
    flowPossibilityAgreement: summary.flowPossibilityAgreement.rate,
    boundaryRecall: summary.boundaryRecall.rate,
    sourceRowMeaningPreservation: summary.sourceRowMeaningPreservation.rate,
    itemProvenance: summary.itemProvenance.rate,
    primaryArtifactAgreement: summary.primaryArtifactAgreement.positiveRate,
    directlyUsablePositiveResults: summary.directlyUsablePositiveResults.rate,
    reviewedItemChangeRate: summary.reviewedItemChanges.combinedRate,
  };
}

function numericDelta(right, left) {
  return typeof right === 'number' && typeof left === 'number' ? round(right - left) : null;
}

function pairwiseComparison(leftRole, rightRole, summaries) {
  const left = summaries[leftRole];
  const right = summaries[rightRole];
  const leftRates = keyRates(left);
  const rightRates = keyRates(right);
  const metrics = Object.fromEntries(Object.keys(leftRates).map((key) => [key, {
    left: leftRates[key],
    right: rightRates[key],
    deltaRightMinusLeft: numericDelta(rightRates[key], leftRates[key]),
  }]));
  const leftElapsed = left.measurements.elapsedMs.averageOverMeasuredRuns;
  const rightElapsed = right.measurements.elapsedMs.averageOverMeasuredRuns;
  const leftTokens = left.measurements.totalTokens.averageOverMeasuredRuns;
  const rightTokens = right.measurements.totalTokens.averageOverMeasuredRuns;
  const currencies = [...new Set([
    ...left.measurements.actualCost.byCurrency.map((entry) => entry.currency),
    ...right.measurements.actualCost.byCurrency.map((entry) => entry.currency),
  ])].sort();
  return {
    leftRole,
    rightRole,
    quality: metrics,
    elapsedMs: { left: leftElapsed, right: rightElapsed, deltaRightMinusLeft: numericDelta(rightElapsed, leftElapsed) },
    totalTokens: { left: leftTokens, right: rightTokens, deltaRightMinusLeft: numericDelta(rightTokens, leftTokens) },
    actualCost: {
      comparableByCurrency: currencies.map((currency) => {
        const leftCost = left.measurements.actualCost.byCurrency.find((entry) => entry.currency === currency)?.averageOverMeasuredRuns ?? null;
        const rightCost = right.measurements.actualCost.byCurrency.find((entry) => entry.currency === currency)?.averageOverMeasuredRuns ?? null;
        return { currency, left: leftCost, right: rightCost, deltaRightMinusLeft: numericDelta(rightCost, leftCost) };
      }),
      note: currencies.length === 0
        ? 'No actual provider cost was measured; no cost estimate was manufactured.'
        : 'Only explicitly evidenced actual-cost entries are compared; missing runs are not imputed.',
    },
  };
}

function summariesByRole(records, prefix) {
  return Object.fromEntries(ROLES.map((role) => [role, aggregateRecords(
    records.filter((record) => record.role === role),
    `${prefix}:${role}`,
  )]));
}

export function evaluateBenchmark({ manifest, gold, runs, adjudication, runSchema, adjudicationSchema, evaluatedAt } = {}) {
  const normalizedRuns = flattenRuns(runs || []);
  const effectiveRunSchema = runSchema || JSON.parse(fs.readFileSync(DEFAULT_RUN_SCHEMA_PATH, 'utf8'));
  const effectiveAdjudicationSchema = adjudicationSchema || JSON.parse(fs.readFileSync(DEFAULT_ADJUDICATION_SCHEMA_PATH, 'utf8'));
  validateBenchmarkDocuments({ manifest, gold, runs: normalizedRuns, schema: effectiveRunSchema });
  validateGoldEvaluationContract(gold, manifest);
  validateAdjudicationLedger({ ledger: adjudication, manifest, gold, runs: normalizedRuns, schema: effectiveAdjudicationSchema });
  const manifestById = new Map(manifest.cases.map((entry) => [entry.caseId, entry]));
  const goldById = new Map(gold.cases.map((entry) => [entry.caseId, entry]));
  const adjudicationByKey = new Map(adjudication.entries.map((entry) => [runKey(entry.caseId, entry.role), entry]));
  const records = normalizedRuns.map((run) => calculateRunRecord({
    manifestCase: manifestById.get(run.caseId),
    goldCase: goldById.get(run.caseId),
    run,
    adjudication: adjudicationByKey.get(runKey(run.caseId, run.processor.role)),
  })).sort((left, right) => (
    manifest.cases.findIndex((entry) => entry.caseId === left.caseId) - manifest.cases.findIndex((entry) => entry.caseId === right.caseId)
    || ROLES.indexOf(left.role) - ROLES.indexOf(right.role)
  ));
  const calibrationRecords = records.filter((record) => record.split === 'calibration');
  const finalRecords = records.filter((record) => record.split === 'final_holdout');
  const timestamp = evaluatedAt || new Date().toISOString();
  const boundaryStatement = 'Internal automated checks plus explicit internal adjudication; not observed-user validation.';
  const calibrationByRole = summariesByRole(calibrationRecords, 'calibration');
  const finalByRole = summariesByRole(finalRecords, 'final_holdout');
  const allByRole = summariesByRole(records, 'all');
  const calibrationOverall = aggregateRecords(calibrationRecords, 'calibration:all_roles');
  const finalOverall = aggregateRecords(finalRecords, 'final_holdout:all_roles');
  const allOverall = aggregateRecords(records, 'all:all_roles');

  const calibrationResults = {
    documentType: 'flow_content_generalization_calibration_results_v1',
    schemaVersion: 'flow-content-generalization-evaluation-v1',
    evaluatedAt: timestamp,
    validationBoundary: boundaryStatement,
    split: 'calibration',
    records: calibrationRecords,
    byRole: calibrationByRole,
    overall: calibrationOverall,
  };
  const finalHoldoutResults = {
    documentType: 'flow_content_generalization_final_holdout_results_v1',
    schemaVersion: 'flow-content-generalization-evaluation-v1',
    evaluatedAt: timestamp,
    validationBoundary: boundaryStatement,
    split: 'final_holdout',
    sealedSplitHash: manifest.sealMetadata.splitHash,
    frozenRulesHash: manifest.sealMetadata.finalHoldoutRulesHash,
    records: finalRecords,
    byRole: finalByRole,
    overall: finalOverall,
  };
  const modelComparison = {
    documentType: 'flow_content_generalization_model_comparison_v1',
    schemaVersion: 'flow-content-generalization-evaluation-v1',
    evaluatedAt: timestamp,
    validationBoundary: boundaryStatement,
    comparisonScope: 'final_holdout',
    roleSummaries: finalByRole,
    pairwise: [
      pairwiseComparison('rules', 'low_cost', finalByRole),
      pairwiseComparison('low_cost', 'high_capability', finalByRole),
      pairwiseComparison('rules', 'high_capability', finalByRole),
    ],
    costBoundary: 'Actual cost is null unless the adjudication ledger contains an evidenced provider charge or a verified-price calculation over measured tokens.',
  };
  const benchmarkMetrics = {
    documentType: 'flow_content_generalization_benchmark_metrics_v1',
    schemaVersion: 'flow-content-generalization-evaluation-v1',
    evaluatedAt: timestamp,
    validationBoundary: boundaryStatement,
    decisiveScope: 'final_holdout',
    calibration: { overall: calibrationOverall, byRole: calibrationByRole },
    finalHoldout: { overall: finalOverall, byRole: finalByRole },
    allRuns: { overall: allOverall, byRole: allByRole },
    finalGeneralizationAssessment: {
      allRolesCombinedPass: finalOverall.targets.allPass,
      byRole: Object.fromEntries(ROLES.map((role) => [role, {
        pass: finalByRole[role].targets.allPass,
        passedTargets: finalByRole[role].targets.passed,
        totalTargets: finalByRole[role].targets.total,
      }])),
      note: 'Final holdout is decisive. Calibration scores are diagnostic and are not substituted for holdout performance.',
    },
  };
  const finalAdjudication = {
    documentType: 'flow_content_generalization_final_adjudication_v1',
    schemaVersion: 'flow-content-generalization-evaluation-v1',
    evaluatedAt: timestamp,
    validationBoundary: boundaryStatement,
    adjudicator: adjudication.adjudicator,
    humanReviewerConfirmed: adjudication.adjudicator.humanReviewerConfirmed,
    entries: records.map((record) => ({
      caseId: record.caseId,
      split: record.split,
      role: record.role,
      goldAdmissionLabel: record.goldAdmissionLabel,
      computed: record,
      adjudication: adjudicationByKey.get(runKey(record.caseId, record.role)),
    })),
  };
  return {
    calibrationResults,
    finalHoldoutResults,
    modelComparison,
    benchmarkMetrics,
    finalAdjudication,
  };
}

const OUTPUT_FILENAMES = {
  calibrationResults: 'calibration-results-v1.json',
  finalHoldoutResults: 'final-holdout-results-v1.json',
  modelComparison: 'model-comparison-v1.json',
  benchmarkMetrics: 'benchmark-metrics-v1.json',
  finalAdjudication: 'final-adjudication-v1.json',
};

export function writeEvaluationOutputs(documents, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const written = [];
  for (const [key, filename] of Object.entries(OUTPUT_FILENAMES)) {
    const destination = path.join(outDir, filename);
    fs.writeFileSync(destination, `${JSON.stringify(documents[key], null, 2)}\n`, 'utf8');
    written.push(destination);
  }
  return written;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function collectJsonFiles(target) {
  if (!fs.existsSync(target)) throw new Error(`Path does not exist: ${target}`);
  if (fs.statSync(target).isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) return collectJsonFiles(child);
    return entry.isFile() && entry.name.endsWith('.json') ? [child] : [];
  });
}

function parseArgs(argv) {
  const options = {
    runs: [],
    runSchema: DEFAULT_RUN_SCHEMA_PATH,
    adjudicationSchema: DEFAULT_ADJUDICATION_SCHEMA_PATH,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--force') options.force = true;
    else {
      const value = argv[index + 1];
      if (value === undefined) throw new Error(`Missing value for ${arg}.`);
      if (arg === '--manifest') options.manifest = value;
      else if (arg === '--gold') options.gold = value;
      else if (arg === '--run') options.runs.push(value);
      else if (arg === '--adjudication') options.adjudication = value;
      else if (arg === '--run-schema') options.runSchema = value;
      else if (arg === '--adjudication-schema') options.adjudicationSchema = value;
      else if (arg === '--out-dir') options.outDir = value;
      else if (arg === '--init-adjudication') options.initAdjudication = value;
      else throw new Error(`Unknown argument: ${arg}`);
      index += 1;
    }
  }
  return options;
}

function usage() {
  return [
    'Evaluate:',
    '  node evaluate-generalization-v1.mjs --manifest <manifest.json> --gold <gold.json> --run <run.json|directory> [--run ...] --adjudication <ledger.json> --out-dir <directory>',
    'Initialize the explicit review ledger:',
    '  node evaluate-generalization-v1.mjs --manifest <manifest.json> --gold <gold.json> --run <run.json|directory> [--run ...] --init-adjudication <ledger.json> [--force]',
  ].join('\n');
}

function loadCliInputs(options) {
  if (!options.manifest || !options.gold || options.runs.length === 0) throw new Error(usage());
  const manifest = readJson(options.manifest);
  const gold = readJson(options.gold);
  const runs = options.runs.flatMap((target) => collectJsonFiles(target).map(readJson));
  return { manifest, gold, runs };
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return 0;
  }
  const inputs = loadCliInputs(options);
  const runSchema = readJson(options.runSchema);
  validateBenchmarkDocuments({ ...inputs, schema: runSchema });
  validateGoldEvaluationContract(inputs.gold, inputs.manifest);
  if (options.initAdjudication) {
    if (fs.existsSync(options.initAdjudication) && !options.force) throw new Error(`Refusing to overwrite existing adjudication ledger without --force: ${options.initAdjudication}`);
    const template = createAdjudicationTemplate(inputs);
    fs.mkdirSync(path.dirname(options.initAdjudication), { recursive: true });
    fs.writeFileSync(options.initAdjudication, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
    console.log(`WROTE pending adjudication template: ${options.initAdjudication}`);
    return 0;
  }
  if (!options.adjudication || !options.outDir) throw new Error(usage());
  const documents = evaluateBenchmark({
    ...inputs,
    adjudication: readJson(options.adjudication),
    runSchema,
    adjudicationSchema: readJson(options.adjudicationSchema),
  });
  const written = writeEvaluationOutputs(documents, options.outDir);
  console.log(`PASS benchmark evaluation: ${inputs.manifest.cases.length} cases, ${flattenRuns(inputs.runs).length} runs, ${written.length} outputs`);
  written.forEach((file) => console.log(file));
  return 0;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    process.exitCode = runCli();
  } catch (error) {
    console.error(error.message);
    for (const entry of error.errors || []) console.error(`${entry.code || 'error'} ${entry.path || ''}: ${entry.message || entry}`);
    process.exitCode = 1;
  }
}
