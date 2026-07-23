import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ContractValidationError,
  validateAgainstSchema,
} from '../2026-07-20-flowme-taxonomy-v1-1/validate-taxonomy-v1-1.mjs';

export { ContractValidationError, validateAgainstSchema };

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCHEMA_PATH = path.join(here, 'benchmark-envelope-v1.schema.json');
const ARTIFACTS = ['calendar', 'checklist', 'todo', 'sheet', 'memo'];
const ROLES = ['rules', 'low_cost', 'high_capability'];
const STOPPED_STATES = ['source_import_required', 'hold', 'blocked'];
const SHA256 = /^[a-f0-9]{64}$/u;

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
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((value, index) => value === b[index]);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function calculateSplitHash(cases) {
  const sealed = [...cases]
    .map(({ caseId, split }) => ({ caseId, split }))
    .sort((left, right) => left.caseId.localeCompare(right.caseId));
  return sha256(canonicalJson(sealed));
}

function normalizeSchemaErrors(error, prefix) {
  return (error.errors || [error.message]).map((entry) => (
    isObject(entry) && entry.code
      ? entry
      : issue('json_schema', prefix, String(entry))
  ));
}

function throwIf(errors, label) {
  if (errors.length) throw new ContractValidationError(`${label} failed`, errors);
}

function hasPayload(projection) {
  return projection?.payload !== null && projection?.payload !== undefined;
}

function canonicalHasContent(canonical) {
  if (!isObject(canonical)) return false;
  return canonical.title !== null
    || ['items', 'fields', 'memos', 'references', 'conditionalResponses']
      .some((key) => Array.isArray(canonical[key]) && canonical[key].length > 0);
}

export function validateRunEnvelope(run, {
  schema = JSON.parse(fs.readFileSync(DEFAULT_SCHEMA_PATH, 'utf8')),
  manifestCase = null,
  sealMetadata = null,
  goldCase = null,
} = {}) {
  const errors = [];
  try {
    validateAgainstSchema(run, schema, 'run');
  } catch (error) {
    errors.push(...normalizeSchemaErrors(error, 'run'));
  }

  const acquired = run?.sourceAssessment?.acquiredRowIds || [];
  const assignments = run?.sourceRowAssignments || [];
  const assignmentIds = assignments.map((entry) => entry?.sourceRowId);
  ensure(unique(acquired), errors, 'duplicate_acquired_row', 'sourceAssessment.acquiredRowIds', 'Acquired SourceRow IDs must be unique.');
  ensure(unique(assignmentIds), errors, 'source_row_assignment_count', 'sourceRowAssignments', 'Every acquired SourceRow must have exactly one assignment.');
  ensure(sameSet(acquired, assignmentIds), errors, 'source_row_accounting', 'sourceRowAssignments', 'Assignments must account for exactly the acquired SourceRows, with no missing or extra IDs.');

  const completeness = run?.sourceAssessment?.completeness;
  const state = run?.feasibility?.state;
  const executable = run?.feasibility?.executableAllowed === true;
  const flowPossible = run?.feasibility?.flowPossible === true;
  const sourceIncomplete = ['partial', 'metadata_only', 'missing'].includes(completeness);
  const projectionEntries = ARTIFACTS.map((artifact) => [artifact, run?.projections?.[artifact]]);
  const anyProjectionPayload = projectionEntries.some(([, projection]) => hasPayload(projection));

  if (sourceIncomplete) {
    ensure(STOPPED_STATES.includes(state), errors, 'completeness_disposition', 'feasibility.state', 'Incomplete source evidence must stop at source_import_required, hold, or blocked.');
    ensure(!executable && !flowPossible, errors, 'completeness_disposition', 'feasibility', 'Incomplete source evidence cannot be executable or Flow-possible.');
    ensure(!canonicalHasContent(run?.canonical), errors, 'source_incomplete_payload', 'canonical', 'Incomplete source evidence cannot produce canonical content.');
    ensure(!anyProjectionPayload, errors, 'source_incomplete_payload', 'projections', 'Incomplete source evidence cannot produce projection payloads.');
  }
  if (['ready', 'needs_confirmation'].includes(state)) {
    ensure(completeness === 'complete' && executable && flowPossible, errors, 'ready_disposition', 'feasibility', 'A usable disposition requires complete source evidence and an executable possible Flow.');
  }
  if (state === 'source_import_required') {
    ensure(completeness !== 'complete', errors, 'source_import_disposition', 'sourceAssessment.completeness', 'source_import_required must identify incomplete source evidence.');
  }
  if (!executable) {
    ensure((run?.canonical?.items || []).length === 0, errors, 'non_executable_items', 'canonical.items', 'Canonical Items require executableAllowed=true.');
  }

  const itemIds = [];
  for (const [index, item] of (run?.canonical?.items || []).entries()) {
    itemIds.push(item?.itemId);
    const refs = item?.sourceRefs || [];
    ensure(refs.length > 0, errors, 'item_provenance', `canonical.items[${index}].sourceRefs`, 'Every Item must cite at least one acquired SourceRow.');
    ensure(refs.every((ref) => acquired.includes(ref)), errors, 'item_provenance', `canonical.items[${index}].sourceRefs`, 'Item sourceRefs must resolve to acquired SourceRows.');
  }
  ensure(unique(itemIds), errors, 'duplicate_item_id', 'canonical.items', 'Canonical itemId values must be unique.');

  const primaryArtifact = run?.classification?.primaryArtifact;
  const secondaryArtifacts = run?.classification?.secondaryArtifacts || [];
  ensure(primaryArtifact !== 'hybrid', errors, 'hybrid_primary_artifact', 'classification.primaryArtifact', 'hybrid is forbidden as a primary artifact.');
  ensure(!secondaryArtifacts.includes(primaryArtifact), errors, 'artifact_duplicate', 'classification.secondaryArtifacts', 'The primary artifact cannot be repeated as secondary.');
  const primaryProjectionNames = projectionEntries.filter(([, value]) => value?.availability === 'primary').map(([name]) => name);
  const secondaryProjectionNames = projectionEntries.filter(([, value]) => value?.availability === 'secondary').map(([name]) => name);
  const usablePreview = executable
    && run?.gates?.personalPreviewAllowed === true
    && ['ready', 'needs_confirmation'].includes(state);
  if (usablePreview) {
    ensure(primaryProjectionNames.length === 1, errors, 'primary_projection_count', 'projections', 'A usable run must expose exactly one primary projection.');
    ensure(primaryProjectionNames[0] === primaryArtifact, errors, 'primary_projection_mismatch', 'projections', 'Primary projection must match classification.primaryArtifact.');
    ensure(sameSet(secondaryProjectionNames, secondaryArtifacts), errors, 'secondary_projection_mismatch', 'projections', 'Secondary projections must match classification.secondaryArtifacts.');
  } else {
    ensure(primaryProjectionNames.length === 0, errors, 'blocked_primary_projection', 'projections', 'A stopped or non-previewable run cannot expose a primary projection.');
  }

  for (const [artifact, projection] of projectionEntries) {
    if (['blocked', 'not_applicable'].includes(projection?.availability)) {
      ensure(!hasPayload(projection), errors, 'blocked_projection_payload', `projections.${artifact}.payload`, 'Blocked and not-applicable projections must have null payloads.');
    }
    if (hasPayload(projection)) {
      ensure(executable && !STOPPED_STATES.includes(state), errors, 'stopped_projection_payload', `projections.${artifact}.payload`, 'Stopped or non-executable runs cannot expose usable projection payloads.');
    }
  }

  const scheduledItemCount = (run?.canonical?.items || []).filter((item) => item?.schedule !== null && item?.schedule !== undefined).length;
  const eventCount = run?.projections?.ics?.eventCount ?? 0;
  const unscheduledIcsCount = eventCount > scheduledItemCount ? eventCount - scheduledItemCount : 0;
  ensure(unscheduledIcsCount === 0, errors, 'unscheduled_ics', 'projections.ics.eventCount', 'Each ICS event requires a scheduled canonical Item.');
  ensure(eventCount > 0 || run?.projections?.ics?.actionVisible !== true, errors, 'empty_ics_action', 'projections.ics.actionVisible', 'ICS action cannot be visible with zero events.');
  if (hasPayload(run?.projections?.calendar)) {
    ensure(scheduledItemCount > 0, errors, 'unscheduled_calendar', 'projections.calendar.payload', 'Calendar payload requires at least one scheduled Item.');
  }
  ensure(run?.selfReview?.unscheduledIcsViolationCount === unscheduledIcsCount, errors, 'unscheduled_ics_count_drift', 'selfReview.unscheduledIcsViolationCount', 'Declared unscheduled ICS count must equal the recomputed count.');

  const requiredUserInputs = (run?.minimumInputs || []).filter((input) => input?.owner === 'user' && input?.requiredBeforeFirstPreview === true);
  ensure(requiredUserInputs.length <= 2, errors, 'user_input_budget', 'minimumInputs', 'First useful preview may require at most two user-owned values.');
  const sourceKeys = run?.sourceAssessment?.sourceValueSemanticKeys || [];
  const reentryInputs = (run?.minimumInputs || []).filter((input) => input?.owner === 'user' && sourceKeys.includes(input?.semanticKey));
  ensure(reentryInputs.length === 0, errors, 'source_value_reentry', 'minimumInputs', 'A user input cannot ask for a source-derived semantic value.');
  ensure(run?.selfReview?.sourceValueReentryCount === reentryInputs.length, errors, 'source_value_reentry_count_drift', 'selfReview.sourceValueReentryCount', 'Declared source re-entry count must equal the recomputed count.');

  ensure(run?.feasibility?.flowPossible === (primaryArtifact !== null), errors, 'flow_artifact_consistency', 'classification.primaryArtifact', 'flowPossible must agree with whether a natural primary artifact was identified.');
  if (run?.gates?.publicExportAllowed) {
    ensure(completeness === 'complete', errors, 'public_gate_uncleared', 'gates.publicExportAllowed', 'Public export requires complete source evidence.');
    ensure(run.gates.access === 'open', errors, 'public_gate_uncleared', 'gates.access', 'Public export requires an open access gate.');
    ensure(run.gates.rights === 'open', errors, 'public_gate_uncleared', 'gates.rights', 'Public export requires an open rights gate.');
    ensure(run.gates.freshness === 'passed', errors, 'public_gate_uncleared', 'gates.freshness', 'Public export requires cleared freshness.');
    ensure(run.gates.locale === 'applicable', errors, 'public_gate_uncleared', 'gates.locale', 'Public export requires locale applicability.');
    ensure(run.gates.safety === 'not_required', errors, 'public_gate_uncleared', 'gates.safety', 'Public export cannot bypass safety review.');
    ensure(run.gates.privacy === 'not_required', errors, 'public_gate_uncleared', 'gates.privacy', 'Public export cannot bypass privacy review.');
  }
  if (run?.gates?.personalPreviewAllowed) {
    ensure(completeness === 'complete' && executable, errors, 'personal_preview_uncleared', 'gates.personalPreviewAllowed', 'Personal preview requires complete evidence and executableAllowed=true.');
    ensure(!['blocked'].includes(run.gates.safety) && !['blocked'].includes(run.gates.privacy), errors, 'personal_preview_uncleared', 'gates', 'Personal preview cannot bypass blocked safety or privacy gates.');
  }

  if (manifestCase) {
    ensure(run?.caseId === manifestCase.caseId, errors, 'manifest_case_mismatch', 'caseId', 'Run caseId must match its manifest case.');
    ensure(run?.benchmarkTrace?.split === manifestCase.split, errors, 'run_split_mismatch', 'benchmarkTrace.split', 'Run split must match the sealed manifest split.');
  }
  if (sealMetadata) {
    ensure(run?.benchmarkTrace?.sealedSplitHash === sealMetadata.splitHash, errors, 'run_split_seal_mismatch', 'benchmarkTrace.sealedSplitHash', 'Run must carry the sealed manifest split hash.');
    if (manifestCase?.split === 'final_holdout') {
      ensure(run?.benchmarkTrace?.rulesHash === sealMetadata.finalHoldoutRulesHash, errors, 'holdout_rules_hash', 'benchmarkTrace.rulesHash', 'Final-holdout runs must use the frozen final-holdout rules hash.');
    }
  }
  if (goldCase) {
    const goldRowIds = sourceRowIdsOfGoldCase(goldCase);
    ensure(sameSet(acquired, goldRowIds), errors, 'gold_source_packet_mismatch', 'sourceAssessment.acquiredRowIds', 'Run SourceRows must exactly match the acquired rows in the gold source packet.');
  }

  throwIf(errors, `run ${run?.caseId || '<unknown>'}`);
  return {
    caseId: run.caseId,
    role: run.processor.role,
    acquiredRowCount: acquired.length,
    assignmentCount: assignments.length,
    itemCount: run.canonical.items.length,
    requiredUserInputCount: requiredUserInputs.length,
  };
}

export function validateManifest(manifest) {
  const errors = [];
  const cases = manifest?.cases;
  ensure(Array.isArray(cases), errors, 'manifest_cases', 'manifest.cases', 'Manifest cases must be an array.');
  if (!Array.isArray(cases)) throwIf(errors, 'manifest');
  ensure(cases.length === 18, errors, 'case_count', 'manifest.cases', 'The benchmark manifest must contain exactly 18 cases.');
  ensure(unique(cases.map((entry) => entry?.caseId)), errors, 'duplicate_case_id', 'manifest.cases', 'Manifest caseId values must be unique.');
  for (const [index, entry] of cases.entries()) {
    ensure(typeof entry?.caseId === 'string' && entry.caseId.length > 0, errors, 'manifest_case_id', `manifest.cases[${index}].caseId`, 'caseId is required.');
    ensure(['calibration', 'final_holdout'].includes(entry?.split), errors, 'manifest_split', `manifest.cases[${index}].split`, 'split must be calibration or final_holdout.');
  }
  ensure(cases.filter((entry) => entry.split === 'calibration').length === 12, errors, 'split_count', 'manifest.cases', 'Calibration must contain exactly 12 cases.');
  ensure(cases.filter((entry) => entry.split === 'final_holdout').length === 6, errors, 'split_count', 'manifest.cases', 'Final holdout must contain exactly 6 cases.');

  const seal = manifest?.sealMetadata;
  ensure(isObject(seal), errors, 'split_seal_metadata', 'manifest.sealMetadata', 'Split seal metadata is required.');
  if (isObject(seal)) {
    ensure(seal.algorithm === 'sha256', errors, 'split_seal_metadata', 'manifest.sealMetadata.algorithm', 'Split seal algorithm must be sha256.');
    ensure(typeof seal.sealedAt === 'string' && !Number.isNaN(Date.parse(seal.sealedAt)), errors, 'split_seal_metadata', 'manifest.sealMetadata.sealedAt', 'A valid pre-generation seal timestamp is required.');
    for (const key of ['splitHash', 'baselineRulesHash', 'revisedRulesHash', 'finalHoldoutRulesHash']) {
      ensure(SHA256.test(seal[key] || ''), errors, 'split_seal_metadata', `manifest.sealMetadata.${key}`, `${key} must be a lowercase SHA-256 digest.`);
    }
    ensure(seal.splitHash === calculateSplitHash(cases), errors, 'split_seal_hash', 'manifest.sealMetadata.splitHash', 'splitHash does not match the sealed case assignment.');
    ensure(seal.finalHoldoutRulesHash === seal.revisedRulesHash, errors, 'holdout_rules_hash', 'manifest.sealMetadata.finalHoldoutRulesHash', 'Final holdout must freeze the revised-rules hash.');
  }
  throwIf(errors, 'manifest');
  return { caseCount: cases.length, splitHash: seal.splitHash };
}

function sourceRowIdsOfGoldCase(goldCase) {
  if (Array.isArray(goldCase?.sourceRows)) return goldCase.sourceRows.map((row) => row.sourceRowId || row.rowId || row.id);
  if (Array.isArray(goldCase?.sourceAssessment?.acquiredRowIds)) return goldCase.sourceAssessment.acquiredRowIds;
  if (Array.isArray(goldCase?.acquiredRowIds)) return goldCase.acquiredRowIds;
  return [];
}

export function validateGold(gold, manifest) {
  const errors = [];
  const cases = gold?.cases;
  ensure(Array.isArray(cases), errors, 'gold_cases', 'gold.cases', 'Gold cases must be an array.');
  if (!Array.isArray(cases)) throwIf(errors, 'gold');
  ensure(cases.length === 18, errors, 'gold_case_count', 'gold.cases', 'Gold contract must contain exactly 18 cases.');
  ensure(unique(cases.map((entry) => entry?.caseId)), errors, 'duplicate_gold_case_id', 'gold.cases', 'Gold caseId values must be unique.');
  ensure(sameSet(cases.map((entry) => entry.caseId), manifest.cases.map((entry) => entry.caseId)), errors, 'gold_manifest_case_mismatch', 'gold.cases', 'Gold and manifest case sets must match exactly.');
  for (const [index, entry] of cases.entries()) {
    const rowIds = sourceRowIdsOfGoldCase(entry);
    ensure(unique(rowIds) && rowIds.every((value) => typeof value === 'string' && value.length > 0), errors, 'gold_source_rows', `gold.cases[${index}]`, 'Gold acquired SourceRow IDs must be unique non-empty strings.');
  }
  throwIf(errors, 'gold');
  return { caseCount: cases.length };
}

export function flattenRuns(documents) {
  return documents.flatMap((document) => {
    if (Array.isArray(document)) return document;
    if (Array.isArray(document?.runs)) return document.runs;
    if (Array.isArray(document?.results)) return document.results;
    if (Array.isArray(document?.cases) && document.cases.every((entry) => entry?.processor)) return document.cases;
    return document?.processor ? [document] : [];
  });
}

export function validateBenchmarkDocuments({ manifest, gold, runs, schema } = {}) {
  validateManifest(manifest);
  validateGold(gold, manifest);
  const errors = [];
  const manifestById = new Map(manifest.cases.map((entry) => [entry.caseId, entry]));
  const goldById = new Map(gold.cases.map((entry) => [entry.caseId, entry]));
  const normalizedRuns = flattenRuns(runs || []);
  const runKeys = normalizedRuns.map((run) => `${run?.caseId}:${run?.processor?.role}`);
  ensure(unique(runKeys), errors, 'duplicate_run', 'runs', 'Each case and processor role may appear only once.');
  for (const caseEntry of manifest.cases) {
    for (const role of ROLES) {
      ensure(runKeys.includes(`${caseEntry.caseId}:${role}`), errors, 'missing_run', 'runs', `Missing ${role} run for ${caseEntry.caseId}.`);
    }
  }
  ensure(normalizedRuns.length === manifest.cases.length * ROLES.length, errors, 'run_count', 'runs', 'A complete benchmark requires exactly three independent runs per case.');
  for (const run of normalizedRuns) {
    const manifestCase = manifestById.get(run?.caseId);
    ensure(Boolean(manifestCase), errors, 'unknown_run_case', 'runs', `Run references unknown case ${run?.caseId}.`);
    if (!manifestCase) continue;
    try {
      validateRunEnvelope(run, {
        schema,
        manifestCase,
        sealMetadata: manifest.sealMetadata,
        goldCase: goldById.get(run.caseId),
      });
    } catch (error) {
      errors.push(...normalizeSchemaErrors(error, `runs.${run.caseId}.${run?.processor?.role || 'unknown'}`));
    }
  }
  throwIf(errors, 'benchmark');
  return {
    caseCount: manifest.cases.length,
    runCount: normalizedRuns.length,
    calibrationCount: manifest.cases.filter((entry) => entry.split === 'calibration').length,
    finalHoldoutCount: manifest.cases.filter((entry) => entry.split === 'final_holdout').length,
    splitHash: manifest.sealMetadata.splitHash,
  };
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
  const options = { runs: [], schema: DEFAULT_SCHEMA_PATH };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === '--manifest') options.manifest = value;
    else if (arg === '--gold') options.gold = value;
    else if (arg === '--run') options.runs.push(value);
    else if (arg === '--schema') options.schema = value;
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
    if (arg !== '--help') index += 1;
  }
  return options;
}

function usage() {
  return 'Usage: node validate-generalization-v1.mjs --manifest <manifest.json> --gold <gold.json> --run <run.json|directory> [--run ...] [--schema <schema.json>]';
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return 0;
  }
  if (!options.manifest || !options.gold || options.runs.length === 0) throw new Error(usage());
  const result = validateBenchmarkDocuments({
    manifest: readJson(options.manifest),
    gold: readJson(options.gold),
    runs: options.runs.flatMap((target) => collectJsonFiles(target).map(readJson)),
    schema: readJson(options.schema),
  });
  console.log(`PASS generalization benchmark: ${result.caseCount} cases, ${result.runCount} independent runs, split ${result.calibrationCount}+${result.finalHoldoutCount}, seal ${result.splitHash}`);
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
