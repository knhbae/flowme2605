import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const specDir = path.join(
  root,
  'docs',
  'specs',
  '2026-07-14-url-to-flow-prompt-lab',
);
const defaultRunsDir = path.join(
  root,
  'docs',
  'content-audit',
  '2026-07-14-url-to-flow-prompt-lab',
  'runs',
);

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const fileArgIndex = args.indexOf('--file');
const wantsAll = args.includes('--all');

if (args.includes('--help') || (!wantsAll && fileArgIndex === -1)) {
  console.log(`Usage:
  node scripts/content-audit/validate-url-to-flow-prompt-lab.mjs --file <run.json> [--json]
  node scripts/content-audit/validate-url-to-flow-prompt-lab.mjs --all [--json]

--all scans docs/content-audit/2026-07-14-url-to-flow-prompt-lab/runs recursively.`);
  process.exit(args.includes('--help') ? 0 : 1);
}

const caseDoc = JSON.parse(
  fs.readFileSync(path.join(specDir, 'cases-v1.json'), 'utf8'),
);
const expectedDoc = JSON.parse(
  fs.readFileSync(path.join(specDir, 'expected-v1.json'), 'utf8'),
);
const proposalSchema = JSON.parse(
  fs.readFileSync(path.join(specDir, 'proposal-schema-v1.json'), 'utf8'),
);
const cases = new Map(caseDoc.cases.map((entry) => [entry.caseId, entry]));
const expectations = new Map(
  expectedDoc.expectations.map((entry) => [entry.caseId, entry]),
);

const TOP_KEYS = [
  'proposalSchemaVersion',
  'promptVersion',
  'requestId',
  'caseId',
  'status',
  'sourceAssessment',
  'conversionDecision',
  'proposal',
  'projectionPlan',
  'reviewHints',
];
const STATES = new Set(['proposal', 'partial', 'failed']);
const OUTCOMES = new Set(['complete', 'partial', 'no_proposal', 'rejected']);
const INTENTS = new Set(['act', 'inspect', 'decide', 'record', 'use_resource']);
const COMPLETION = new Set(['check', 'decision', 'record']);
const DISPOSITIONS = new Set(['review', 'source_import_required', 'hold', 'reject']);
const ARTIFACTS = new Set(['calendar', 'checklist', 'todo', 'sheet', 'memo', 'hybrid']);
const TARGETS = new Set(['calendar', 'checklist', 'todo', 'sheet', 'memo']);
const APPLICABILITY = new Set(['applicable', 'not_applicable', 'blocked']);
const ACCESS = new Set(['readable', 'partial', 'unavailable', 'blocked']);
const SOURCE_SHAPES = new Set([
  'date_preparation',
  'ordered_procedure',
  'repeating_routine',
  'source_table_rows',
  'resource_queue',
  'compare_decide',
  'phase_lifecycle',
  'single_resource',
  'unknown',
]);
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
const PATTERNS = new Set([
  'date_preparation',
  'ordered_procedure',
  'repeating_routine',
  'source_table_rows',
  'resource_queue',
  'compare_decide',
  'phase_lifecycle',
]);
const OMISSION_REASONS = new Set([
  'non_user_action',
  'duplicate',
  'marketing',
  'supporting_source_boundary',
  'unsafe_or_unsupported',
  'out_of_claimed_scope',
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expectedKeys) {
  if (!isObject(value)) return false;
  const actual = Object.keys(value).sort();
  return JSON.stringify(actual) === JSON.stringify([...expectedKeys].sort());
}

function unique(values) {
  return new Set(values).size === values.length;
}

function sourceText(caseInput, sourceRowIds) {
  return caseInput.sourceRows
    .filter((row) => sourceRowIds.includes(row.sourceRowId))
    .map((row) => `${row.title}\n${row.detail ?? ''}`)
    .join('\n');
}

function sameSet(left, right) {
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index])
  );
}

function pushError(result, code, message) {
  result.errors.push({ code, message });
}

function pushWarning(result, code, message) {
  result.warnings.push({ code, message });
}

function jsonType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function matchesJsonType(value, expectedType) {
  switch (expectedType) {
    case 'null':
      return value === null;
    case 'array':
      return Array.isArray(value);
    case 'object':
      return isObject(value);
    case 'string':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return Number.isInteger(value);
    default:
      return false;
  }
}

function sameJsonValue(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => sameJsonValue(value, right[index]))
    );
  }
  if (isObject(left) && isObject(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      sameJsonValue(leftKeys, rightKeys) &&
      leftKeys.every((key) => sameJsonValue(left[key], right[key]))
    );
  }
  return false;
}

function resolveLocalRef(ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return null;
  return ref
    .slice(2)
    .split('/')
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce(
      (value, segment) =>
        isObject(value) && Object.hasOwn(value, segment) ? value[segment] : null,
      proposalSchema,
    );
}

function childJsonPath(parent, key) {
  return typeof key === 'number'
    ? `${parent}[${key}]`
    : `${parent}.${String(key).replaceAll('\\', '\\\\').replaceAll('.', '\\.')}`;
}

function validateJsonSchema(value, schema, instancePath = '$') {
  const errors = [];
  if (!isObject(schema)) {
    return [{ path: instancePath, message: 'Schema node is not an object.' }];
  }

  if (schema.$ref !== undefined) {
    const resolved = resolveLocalRef(schema.$ref);
    if (!resolved) {
      errors.push({ path: instancePath, message: `Unresolvable schema reference ${schema.$ref}.` });
    } else {
      errors.push(...validateJsonSchema(value, resolved, instancePath));
    }
  }

  if (Array.isArray(schema.oneOf)) {
    const branchErrors = schema.oneOf.map((branch) =>
      validateJsonSchema(value, branch, instancePath),
    );
    const matches = branchErrors.filter((branch) => branch.length === 0).length;
    if (matches !== 1) {
      errors.push({
        path: instancePath,
        message: `Must match exactly one schema in oneOf; matched ${matches}.`,
      });
    }
  }

  if (schema.type !== undefined) {
    const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expectedTypes.some((expectedType) => matchesJsonType(value, expectedType))) {
      errors.push({
        path: instancePath,
        message: `Expected type ${expectedTypes.join('|')}; received ${jsonType(value)}.`,
      });
      return errors;
    }
  }

  if (schema.const !== undefined && !sameJsonValue(value, schema.const)) {
    errors.push({ path: instancePath, message: `Value must equal const ${JSON.stringify(schema.const)}.` });
  }
  if (
    Array.isArray(schema.enum) &&
    !schema.enum.some((candidate) => sameJsonValue(value, candidate))
  ) {
    errors.push({ path: instancePath, message: `Value is not one of ${JSON.stringify(schema.enum)}.` });
  }

  if (typeof value === 'string') {
    if (Number.isInteger(schema.minLength) && value.length < schema.minLength) {
      errors.push({
        path: instancePath,
        message: `String length ${value.length} is below minLength ${schema.minLength}.`,
      });
    }
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern, 'u').test(value)) {
      errors.push({ path: instancePath, message: `String does not match pattern ${schema.pattern}.` });
    }
  }

  if (Array.isArray(value)) {
    if (Number.isInteger(schema.minItems) && value.length < schema.minItems) {
      errors.push({
        path: instancePath,
        message: `Array length ${value.length} is below minItems ${schema.minItems}.`,
      });
    }
    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) {
      errors.push({
        path: instancePath,
        message: `Array length ${value.length} exceeds maxItems ${schema.maxItems}.`,
      });
    }
    if (schema.uniqueItems === true) {
      for (let index = 0; index < value.length; index += 1) {
        if (value.slice(0, index).some((prior) => sameJsonValue(prior, value[index]))) {
          errors.push({ path: childJsonPath(instancePath, index), message: 'Array items must be unique.' });
        }
      }
    }
    if (isObject(schema.items)) {
      value.forEach((item, index) => {
        errors.push(...validateJsonSchema(item, schema.items, childJsonPath(instancePath, index)));
      });
    }
  }

  if (isObject(value)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!Object.hasOwn(value, key)) {
          errors.push({ path: childJsonPath(instancePath, key), message: 'Required property is missing.' });
        }
      }
    }
    if (isObject(schema.properties)) {
      for (const [key, childSchema] of Object.entries(schema.properties)) {
        if (Object.hasOwn(value, key)) {
          errors.push(
            ...validateJsonSchema(value[key], childSchema, childJsonPath(instancePath, key)),
          );
        }
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) {
          if (!Object.hasOwn(schema.properties, key)) {
            errors.push({
              path: childJsonPath(instancePath, key),
              message: 'Additional property is not allowed.',
            });
          }
        }
      }
    }
  }

  return errors;
}

function validateProposal(output, run) {
  const result = {
    caseId: output?.caseId ?? null,
    valid: true,
    errors: [],
    warnings: [],
    metrics: {
      sourceRowCount: 0,
      mappedSourceRowCount: 0,
      omittedSourceRowCount: 0,
      accountedSourceRowRate: null,
      itemCount: 0,
      expectedItemCount: null,
      structuralSourceGroupingMatch: null,
      expectedDispositionMatch: null,
      expectedArtifactMatch: null,
    },
  };

  const schemaErrors = validateJsonSchema(output, proposalSchema);
  for (const schemaError of schemaErrors) {
    pushError(result, 'json_schema', `${schemaError.path}: ${schemaError.message}`);
  }
  if (schemaErrors.length > 0) {
    result.valid = false;
    return result;
  }

  if (!exactKeys(output, TOP_KEYS)) {
    pushError(result, 'schema_top_level', 'Top-level keys do not match proposal schema v1.');
    result.valid = false;
    return result;
  }

  const caseInput = cases.get(output.caseId);
  const expected = expectations.get(output.caseId);
  if (!caseInput || !expected) {
    pushError(result, 'unknown_case', `Unknown caseId ${output.caseId}.`);
    result.valid = false;
    return result;
  }

  const inputRowIds = caseInput.sourceRows.map((row) => row.sourceRowId);
  const inputRowIdSet = new Set(inputRowIds);
  result.metrics.sourceRowCount = inputRowIds.length;
  result.metrics.expectedItemCount = expected.expectedItems.length;

  if (output.proposalSchemaVersion !== 'flowme-semantic-proposal-v1') {
    pushError(result, 'schema_version', 'Unexpected proposalSchemaVersion.');
  }
  if (output.promptVersion !== run.promptVersion) {
    pushError(result, 'prompt_version_mismatch', 'Output promptVersion differs from run.');
  }
  if (output.requestId !== caseInput.requestId) {
    pushError(result, 'request_id_mismatch', 'Output requestId differs from case input.');
  }

  const status = output.status;
  if (
    !exactKeys(status, ['generationState', 'outcome', 'readiness', 'errorCode']) ||
    !STATES.has(status?.generationState) ||
    !OUTCOMES.has(status?.outcome) ||
    status?.readiness !== null ||
    !(typeof status?.errorCode === 'string' || status?.errorCode === null)
  ) {
    pushError(result, 'status_schema', 'Status dimensions are invalid or readiness is authoritative.');
  }

  const validPair =
    (status.generationState === 'proposal' && status.outcome === 'complete') ||
    (status.generationState === 'partial' && status.outcome === 'partial') ||
    (status.generationState === 'failed' &&
      ['no_proposal', 'rejected'].includes(status.outcome));
  if (!validPair) {
    pushError(result, 'status_pair', 'generationState/outcome pair is invalid.');
  }

  const assessment = output.sourceAssessment;
  if (
    !exactKeys(assessment, [
      'access',
      'sourceShape',
      'primarySourceId',
      'supportingSourceIds',
      'receivedSourceRowIds',
      'untrustedInstructionDetected',
    ]) ||
    !ACCESS.has(assessment?.access) ||
    !SOURCE_SHAPES.has(assessment?.sourceShape) ||
    typeof assessment?.primarySourceId !== 'string' ||
    !Array.isArray(assessment?.supportingSourceIds) ||
    !assessment.supportingSourceIds.every((value) => typeof value === 'string') ||
    !unique(assessment.supportingSourceIds) ||
    !Array.isArray(assessment?.receivedSourceRowIds) ||
    !assessment.receivedSourceRowIds.every((value) => typeof value === 'string') ||
    !unique(assessment.receivedSourceRowIds) ||
    typeof assessment?.untrustedInstructionDetected !== 'boolean'
  ) {
    pushError(result, 'source_assessment_schema', 'sourceAssessment shape is invalid.');
  } else {
    if (assessment.primarySourceId !== caseInput.source.primary.sourceId) {
      pushError(result, 'primary_source_mismatch', 'Primary source differs from case input.');
    }
    const expectedSupporting = caseInput.source.supporting.map((source) => source.sourceId);
    if (!sameSet(assessment.supportingSourceIds, expectedSupporting)) {
      pushError(result, 'supporting_source_mismatch', 'Supporting source IDs differ from case input.');
    }
    if (!sameSet(assessment.receivedSourceRowIds, inputRowIds)) {
      pushError(result, 'received_rows_mismatch', 'receivedSourceRowIds must exactly echo input rows.');
    }
  }

  if (status.generationState === 'failed') {
    if (output.conversionDecision !== null) {
      pushError(result, 'failed_has_conversion', 'Failed result must not return conversionDecision.');
    }
  } else if (!isObject(output.conversionDecision)) {
    pushError(result, 'missing_conversion', 'Proposal/partial result requires conversionDecision.');
  } else {
    const decision = output.conversionDecision;
    if (
      !exactKeys(decision, [
        'userNeed',
        'lifeArea',
        'planningPattern',
        'primaryArtifact',
        'contentShape',
      ]) ||
      typeof decision.userNeed !== 'string' ||
      decision.userNeed.length === 0 ||
      !LIFE_AREAS.has(decision.lifeArea) ||
      !PATTERNS.has(decision.planningPattern) ||
      !ARTIFACTS.has(decision.primaryArtifact) ||
      typeof decision.contentShape !== 'string' ||
      decision.contentShape.length === 0
    ) {
      pushError(result, 'conversion_schema', 'conversionDecision shape or enum is invalid.');
    }
  }

  const proposal = output.proposal;
  if (
    !exactKeys(proposal, ['proposalTitle', 'items', 'omittedRows', 'incompleteReason']) ||
    !Array.isArray(proposal.items) ||
    !Array.isArray(proposal.omittedRows) ||
    !(typeof proposal.proposalTitle === 'string' || proposal.proposalTitle === null) ||
    !(typeof proposal.incompleteReason === 'string' || proposal.incompleteReason === null)
  ) {
    pushError(result, 'proposal_schema', 'Proposal shape is invalid.');
    result.valid = false;
    return result;
  }

  result.metrics.itemCount = proposal.items.length;
  if (proposal.items.length > caseInput.maxItems) {
    pushError(result, 'item_count_over_cap', 'Item count exceeds input maxItems.');
  }
  if (status.generationState === 'proposal' && proposal.items.length === 0) {
    pushError(result, 'empty_complete_proposal', 'Complete proposal must include at least one Item.');
  }
  if (status.generationState === 'failed') {
    if (
      proposal.proposalTitle !== null ||
      proposal.items.length !== 0 ||
      proposal.omittedRows.length !== 0 ||
      output.projectionPlan.length !== 0
    ) {
      pushError(result, 'failed_has_artifact', 'Failed result must emit no proposal or projection.');
    }
    const failureReasons = [
      ...(Array.isArray(output.reviewHints?.uncertainties)
        ? output.reviewHints.uncertainties
        : []),
      ...(Array.isArray(output.reviewHints?.humanReviewRequired)
        ? output.reviewHints.humanReviewRequired
        : []),
    ];
    const hasUserReadableFailureReason =
      (typeof proposal.incompleteReason === 'string' && proposal.incompleteReason.length > 0) ||
      failureReasons.some((value) => typeof value === 'string' && value.length > 0);
    if (!hasUserReadableFailureReason) {
      pushError(
        result,
        'failed_missing_reason',
        'Failed result needs a user-readable reason in incompleteReason or reviewHints.',
      );
    }
  }
  if (status.generationState === 'partial' && !proposal.incompleteReason) {
    pushError(result, 'partial_missing_reason', 'Partial result needs incompleteReason.');
  }

  const proposalIds = proposal.items.map((item) => item.proposalId);
  if (!unique(proposalIds)) {
    pushError(result, 'duplicate_proposal_id', 'proposalId values must be unique.');
  }

  const mapped = new Set();
  for (const item of proposal.items) {
    if (
      !exactKeys(item, [
        'proposalId',
        'title',
        'intent',
        'sourceRowIds',
        'completion',
        'memoCandidate',
        'groupingCandidate',
        'scheduleCandidate',
      ]) ||
      typeof item.proposalId !== 'string' ||
      typeof item.title !== 'string' ||
      !INTENTS.has(item.intent) ||
      !Array.isArray(item.sourceRowIds) ||
      item.sourceRowIds.length === 0 ||
      !unique(item.sourceRowIds) ||
      !(typeof item.memoCandidate === 'string' || item.memoCandidate === null) ||
      !(typeof item.groupingCandidate === 'string' || item.groupingCandidate === null)
    ) {
      pushError(result, 'item_schema', `Invalid Item shape in ${item.proposalId ?? 'unknown'}.`);
      continue;
    }
    for (const rowId of item.sourceRowIds) {
      if (!inputRowIdSet.has(rowId)) {
        pushError(result, 'item_without_source', `${item.proposalId} references unknown row ${rowId}.`);
      } else {
        mapped.add(rowId);
      }
    }
    if (
      !exactKeys(item.completion, ['mode', 'doneWhen']) ||
      !COMPLETION.has(item.completion.mode) ||
      typeof item.completion.doneWhen !== 'string' ||
      item.completion.doneWhen.length === 0
    ) {
      pushError(result, 'completion_schema', `${item.proposalId} has invalid completion.`);
    }
    if (item.scheduleCandidate !== null) {
      const schedule = item.scheduleCandidate;
      if (
        !exactKeys(schedule, ['sourceRowIds', 'sourceText', 'parsedByRule']) ||
        !Array.isArray(schedule.sourceRowIds) ||
        schedule.sourceRowIds.length === 0 ||
        !schedule.sourceRowIds.every(
          (rowId) => typeof rowId === 'string' && rowId.length > 0,
        ) ||
        !unique(schedule.sourceRowIds) ||
        schedule.parsedByRule !== false ||
        typeof schedule.sourceText !== 'string' ||
        schedule.sourceText.length === 0
      ) {
        pushError(result, 'schedule_schema', `${item.proposalId} has invalid scheduleCandidate.`);
      } else {
        for (const rowId of schedule.sourceRowIds) {
          if (!item.sourceRowIds.includes(rowId) || !inputRowIdSet.has(rowId)) {
            pushError(result, 'invented_schedule_source', `${item.proposalId} schedule uses unsupported row ${rowId}.`);
          }
        }
        const evidence = sourceText(caseInput, schedule.sourceRowIds);
        if (!evidence.includes(schedule.sourceText)) {
          pushError(result, 'invented_schedule', `${item.proposalId} schedule text is not verbatim source evidence.`);
        }
      }
    }
  }

  const omitted = new Set();
  for (const omission of proposal.omittedRows) {
    if (
      !exactKeys(omission, ['sourceRowId', 'reasonCode', 'reason']) ||
      typeof omission.sourceRowId !== 'string' ||
      !OMISSION_REASONS.has(omission.reasonCode) ||
      typeof omission.reason !== 'string' ||
      omission.reason.length === 0
    ) {
      pushError(result, 'omission_schema', 'Invalid omittedRows entry.');
      continue;
    }
    if (!inputRowIdSet.has(omission.sourceRowId)) {
      pushError(result, 'omission_unknown_row', `Omission references unknown row ${omission.sourceRowId}.`);
    } else if (omitted.has(omission.sourceRowId)) {
      pushError(result, 'duplicate_omission', `Row ${omission.sourceRowId} is omitted twice.`);
    } else {
      omitted.add(omission.sourceRowId);
    }
  }

  const accounted = new Set([...mapped, ...omitted]);
  const mappedAndOmitted = [...mapped].filter((rowId) => omitted.has(rowId));
  if (mappedAndOmitted.length > 0) {
    pushError(
      result,
      'source_row_mapped_and_omitted',
      `Rows cannot be both mapped and omitted: ${mappedAndOmitted.join(', ')}.`,
    );
  }
  result.metrics.mappedSourceRowCount = mapped.size;
  result.metrics.omittedSourceRowCount = omitted.size;
  result.metrics.accountedSourceRowRate =
    inputRowIds.length === 0 ? 1 : accounted.size / inputRowIds.length;
  const unaccounted = inputRowIds.filter((rowId) => !accounted.has(rowId));
  if (unaccounted.length > 0) {
    pushError(result, 'silent_source_omission', `Unaccounted rows: ${unaccounted.join(', ')}.`);
  }

  if (!Array.isArray(output.projectionPlan)) {
    pushError(result, 'projection_schema', 'projectionPlan must be an array.');
  } else {
    const targets = [];
    for (const projection of output.projectionPlan) {
      if (
        !exactKeys(projection, ['target', 'applicability', 'reason']) ||
        !TARGETS.has(projection.target) ||
        !APPLICABILITY.has(projection.applicability) ||
        typeof projection.reason !== 'string' ||
        projection.reason.length === 0
      ) {
        pushError(result, 'projection_schema', 'Invalid projectionPlan entry.');
      }
      targets.push(projection.target);
    }
    if (!unique(targets)) {
      pushError(result, 'duplicate_projection', 'Projection targets must be unique.');
    }
  }

  const hints = output.reviewHints;
  if (
    !exactKeys(hints, [
      'recommendedDisposition',
      'uncertainties',
      'hardFailCodes',
      'humanReviewRequired',
    ]) ||
    !DISPOSITIONS.has(hints?.recommendedDisposition) ||
    !Array.isArray(hints?.uncertainties) ||
    !hints.uncertainties.every((value) => typeof value === 'string') ||
    !Array.isArray(hints?.hardFailCodes) ||
    !hints.hardFailCodes.every((value) => typeof value === 'string') ||
    !unique(hints.hardFailCodes) ||
    !Array.isArray(hints?.humanReviewRequired) ||
    !hints.humanReviewRequired.every((value) => typeof value === 'string')
  ) {
    pushError(result, 'review_hints_schema', 'reviewHints shape is invalid.');
  }

  result.metrics.expectedDispositionMatch =
    hints?.recommendedDisposition === expected.expectedStatus.recommendedDisposition &&
    status.generationState === expected.expectedStatus.generationState &&
    status.outcome === expected.expectedStatus.outcome &&
    status.errorCode === expected.expectedStatus.errorCode;

  if (expected.fixtureKind === 'negative' && !result.metrics.expectedDispositionMatch) {
    pushError(result, 'negative_gate_mismatch', 'Negative status/disposition differs from hidden expectation.');
  }

  if (expected.fixtureKind === 'positive' && output.conversionDecision) {
    result.metrics.expectedArtifactMatch =
      output.conversionDecision.primaryArtifact === expected.expectedConversion.primaryArtifact;
    if (!result.metrics.expectedArtifactMatch) {
      pushWarning(result, 'artifact_difference', 'Primary artifact differs from canonical reference.');
    }
  }

  const expectedGroups = expected.expectedItems
    .map((item) => [...item.sourceRowIds].sort().join('|'))
    .sort();
  const actualGroups = proposal.items
    .map((item) => [...(item.sourceRowIds ?? [])].sort().join('|'))
    .sort();
  result.metrics.structuralSourceGroupingMatch =
    JSON.stringify(expectedGroups) === JSON.stringify(actualGroups);
  if (expected.fixtureKind === 'positive' && !result.metrics.structuralSourceGroupingMatch) {
    pushWarning(result, 'item_grouping_difference', 'SourceRow-to-Item grouping differs from canonical reference.');
  }

  result.valid = result.errors.length === 0;
  return result;
}

function validateRun(filePath) {
  const run = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const result = {
    file: path.relative(root, filePath).replaceAll('\\', '/'),
    runId: run.runId ?? null,
    valid: true,
    errors: [],
    outputs: [],
  };

  const requiredRunKeys = [
    'runSchemaVersion',
    'runId',
    'promptVersion',
    'caseSetVersion',
    'proposalSchemaVersion',
    'modelEvidence',
    'timing',
    'usage',
    'cost',
    'outputs',
  ];
  if (!exactKeys(run, requiredRunKeys)) {
    result.errors.push({ code: 'run_schema', message: 'Run envelope keys are invalid.' });
  }
  if (run.runSchemaVersion !== 'flowme-url-to-flow-prompt-lab-run-v1') {
    result.errors.push({ code: 'run_version', message: 'Unexpected runSchemaVersion.' });
  }
  if (run.caseSetVersion !== caseDoc.caseSetVersion) {
    result.errors.push({ code: 'case_set_version', message: 'Run caseSetVersion is stale.' });
  }
  if (run.proposalSchemaVersion !== 'flowme-semantic-proposal-v1') {
    result.errors.push({ code: 'proposal_schema_version', message: 'Run proposal schema is stale.' });
  }
  if (!Array.isArray(run.outputs)) {
    result.errors.push({ code: 'run_outputs', message: 'Run outputs must be an array.' });
  } else {
    result.outputs = run.outputs.map((output) => validateProposal(output, run));
  }

  if (
    run.modelEvidence?.evidenceKind === 'in_session_same_model' &&
    run.modelEvidence?.modelTier !== 'unclassified'
  ) {
    result.errors.push({
      code: 'model_tier_claim',
      message: 'In-session same-model evidence cannot claim cheap/premium tier.',
    });
  }
  for (const lane of ['timing', 'usage', 'cost']) {
    if (run[lane]?.evidenceKind === 'not_available') {
      const values = Object.entries(run[lane]).filter(([key]) => key !== 'evidenceKind');
      const nonNull = values.filter(([, value]) => value !== null);
      if (nonNull.length > 0) {
        result.errors.push({
          code: `${lane}_unsupported_evidence`,
          message: `${lane} has values while evidenceKind is not_available.`,
        });
      }
    }
  }

  result.valid =
    result.errors.length === 0 && result.outputs.every((output) => output.valid);
  return result;
}

function collectJsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectJsonFiles(target);
    return entry.isFile() && entry.name.endsWith('.json') ? [target] : [];
  });
}

const files = wantsAll
  ? collectJsonFiles(defaultRunsDir)
  : [path.resolve(root, args[fileArgIndex + 1])];

if (files.length === 0) {
  console.error('No run JSON files found.');
  process.exit(1);
}

const results = files.map(validateRun);
const summary = {
  validatorVersion: 'flowme-url-to-flow-prompt-lab-validator-v1',
  runFiles: results.length,
  outputCount: results.reduce((sum, run) => sum + run.outputs.length, 0),
  validRuns: results.filter((run) => run.valid).length,
  validOutputs: results.flatMap((run) => run.outputs).filter((output) => output.valid).length,
  errors: results.reduce(
    (sum, run) =>
      sum +
      run.errors.length +
      run.outputs.reduce((count, output) => count + output.errors.length, 0),
    0,
  ),
  warnings: results.reduce(
    (sum, run) =>
      sum + run.outputs.reduce((count, output) => count + output.warnings.length, 0),
    0,
  ),
  results,
};

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(
    `Prompt Lab validator: ${summary.validRuns}/${summary.runFiles} runs, ${summary.validOutputs}/${summary.outputCount} outputs valid, ${summary.errors} errors, ${summary.warnings} warnings.`,
  );
  for (const run of results) {
    console.log(`${run.valid ? 'PASS' : 'FAIL'} ${run.file}`);
    for (const error of run.errors) console.log(`  ERROR ${error.code}: ${error.message}`);
    for (const output of run.outputs) {
      console.log(`  ${output.valid ? 'PASS' : 'FAIL'} ${output.caseId}`);
      for (const error of output.errors)
        console.log(`    ERROR ${error.code}: ${error.message}`);
      for (const warning of output.warnings)
        console.log(`    WARN ${warning.code}: ${warning.message}`);
    }
  }
}

process.exit(summary.errors === 0 ? 0 : 1);
