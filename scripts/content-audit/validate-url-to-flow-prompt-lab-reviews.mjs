import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const specDir = path.join(
  root,
  'docs',
  'specs',
  '2026-07-14-url-to-flow-prompt-lab',
);
const auditDir = path.join(
  root,
  'docs',
  'content-audit',
  '2026-07-14-url-to-flow-prompt-lab',
);
const reviewsDir = path.join(auditDir, 'reviews');
const inputsDir = path.join(auditDir, 'review-inputs');
const runsDir = path.join(auditDir, 'runs');
const proposalValidator = path.join(
  here,
  'validate-url-to-flow-prompt-lab.mjs',
);

const args = process.argv.slice(2);
const roundIndex = args.indexOf('--round');
const selectedRound = roundIndex >= 0 ? args[roundIndex + 1] : null;
const jsonOutput = args.includes('--json');

if (args.includes('--help')) {
  console.log(`Usage:
  node scripts/content-audit/validate-url-to-flow-prompt-lab-reviews.mjs [--round round-2] [--json]`);
  process.exit(0);
}
if (roundIndex >= 0 && !/^round-[1-9]\d*$/.test(selectedRound ?? '')) {
  throw new Error('--round must look like round-1 or round-2.');
}

const casesDoc = JSON.parse(
  fs.readFileSync(path.join(specDir, 'cases-v1.json'), 'utf8'),
);
const expectedDoc = JSON.parse(
  fs.readFileSync(path.join(specDir, 'expected-v1.json'), 'utf8'),
);
const template = JSON.parse(
  fs.readFileSync(path.join(specDir, 'review-result-template.json'), 'utf8'),
);
const cases = new Map(
  casesDoc.cases.map((entry) => [entry.caseId, entry]),
);
const expectations = new Map(
  expectedDoc.expectations.map((entry) => [entry.caseId, entry]),
);
const scoreKeys = Object.keys(template.scores);
const correctionCountKeys = [
  'deletedItems',
  'mergedItems',
  'splitItems',
  'titleRewrites',
  'completionRewrites',
  'sourceRefFixes',
  'omissionFixes',
  'scheduleRemovals',
  'destinationChanges',
  'riskBoundaryFixes',
];
const decisions = new Set([
  'content_gate_pass',
  'revise',
  'source_import_required',
  'hold',
  'reject',
  'invalid_run',
]);
const findingCodes = new Set([
  'invented_action',
  'invented_date',
  'invented_repeat',
  'invented_fact',
]);
const expectedKeyPattern = /^(?:hiddenExpectation|expectation|expectations|expectationSetVersion|expected(?:[A-Z_].*)?|fixtureKind|canonicalFixtureId|goldenRef)$/;
const modelEvidenceKeys = new Set([
  'modelEvidence',
  'provider',
  'model',
  'modelTier',
  'timing',
  'usage',
  'cost',
  'latencyMs',
  'startedAt',
  'completedAt',
  'inputTokens',
  'outputTokens',
  'pricingRef',
  'evidenceKind',
]);
const inputKeys = [
  'reviewInputSchemaVersion',
  'round',
  'caseId',
  'caseSetVersion',
  'promptVersion',
  'proposalSchemaVersion',
  'rubric',
  'reviewResultTemplate',
  'rawRun',
  'proposalFingerprint',
  'sourcePacket',
  'proposal',
  'validator',
];
const reviewInputTemplatePath =
  'docs/specs/2026-07-14-url-to-flow-prompt-lab/review-result-template.json';
const rubricReference =
  'docs/specs/2026-07-14-url-to-flow-prompt-lab/review-rubric.md';
const rubricVersion = 'flowme-url-to-flow-prompt-lab-review-rubric-v2';
const fingerprintPattern = /^sha256:[0-9a-f]{64}$/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected) {
  if (!isObject(value)) return false;
  return (
    JSON.stringify(Object.keys(value).sort()) ===
    JSON.stringify([...expected].sort())
  );
}

function collectJson(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectJson(target);
      return entry.isFile() && entry.name.endsWith('.json') ? [target] : [];
    });
}

function relativeFile(filePath) {
  return path.relative(root, filePath).replaceAll('\\', '/');
}

function isWithin(parent, target) {
  const relative = path.relative(parent, target);
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function proposalFingerprint(proposal) {
  const digest = createHash('sha256')
    .update(JSON.stringify(proposal), 'utf8')
    .digest('hex');
  return `sha256:${digest}`;
}

function average(scores) {
  return scoreKeys.reduce((sum, key) => sum + scores[key], 0) / scoreKeys.length;
}

function sameSortedStrings(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (
    left.some((entry) => typeof entry !== 'string') ||
    right.some((entry) => typeof entry !== 'string')
  ) {
    return false;
  }
  return (
    JSON.stringify([...left].sort()) === JSON.stringify([...right].sort())
  );
}

function findForbiddenFields(value, pointer = '$', findings = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      findForbiddenFields(entry, `${pointer}[${index}]`, findings),
    );
    return findings;
  }
  if (!isObject(value)) return findings;
  for (const [key, child] of Object.entries(value)) {
    const childPointer = `${pointer}.${key}`;
    if (expectedKeyPattern.test(key)) {
      findings.push({ kind: 'expected', pointer: childPointer });
    }
    if (modelEvidenceKeys.has(key)) {
      findings.push({ kind: 'model_evidence', pointer: childPointer });
    }
    findForbiddenFields(child, childPointer, findings);
  }
  return findings;
}

const rawValidationCache = new Map();

function validateRawRun(runFile) {
  if (rawValidationCache.has(runFile)) {
    return rawValidationCache.get(runFile);
  }
  const result = spawnSync(
    process.execPath,
    [proposalValidator, '--file', runFile, '--json'],
    { cwd: root, encoding: 'utf8' },
  );
  if (!result.stdout.trim()) {
    throw new Error(
      `Proposal validator returned no JSON for ${relativeFile(runFile)}: ${result.stderr.trim()}`,
    );
  }
  const report = JSON.parse(result.stdout);
  if (
    typeof report.validatorVersion !== 'string' ||
    !Array.isArray(report.results) ||
    report.results.length !== 1
  ) {
    throw new Error(
      `Proposal validator envelope is invalid for ${relativeFile(runFile)}.`,
    );
  }
  const validatedRun = report.results[0];
  const record = {
    validatorVersion: report.validatorVersion,
    runId: validatedRun.runId,
    runErrors: validatedRun.errors ?? [],
    outputs: new Map(
      (validatedRun.outputs ?? []).map((output) => [output.caseId, output]),
    ),
  };
  rawValidationCache.set(runFile, record);
  return record;
}

function validateReviewInput(reviewInput, round, caseInput, add) {
  if (!exactKeys(reviewInput, inputKeys)) {
    add('review_input_shape', 'Review input keys differ from the v2 contract.');
  }
  if (
    reviewInput.reviewInputSchemaVersion !==
    'flowme-url-to-flow-blind-review-input-v2'
  ) {
    add('review_input_version', 'Review input schema must be v2.');
  }
  if (
    reviewInput.round !== round ||
    reviewInput.caseId !== caseInput.caseId ||
    reviewInput.caseSetVersion !== casesDoc.caseSetVersion
  ) {
    add('review_input_identity', 'Review input round/case/case-set identity differs.');
  }
  if (
    !exactKeys(reviewInput.rubric, ['version', 'reference']) ||
    reviewInput.rubric?.version !== rubricVersion ||
    reviewInput.rubric?.reference !== rubricReference ||
    reviewInput.reviewResultTemplate !== reviewInputTemplatePath
  ) {
    add('review_input_contract', 'Rubric or review-result template reference differs.');
  }

  for (const finding of findForbiddenFields(reviewInput)) {
    add(
      finding.kind === 'expected'
        ? 'blind_expected_field'
        : 'blind_model_evidence',
      `Forbidden ${finding.kind} field appears at ${finding.pointer}.`,
    );
  }

  if (!isDeepStrictEqual(reviewInput.sourcePacket, caseInput)) {
    add(
      'source_packet_mismatch',
      'Review input sourcePacket differs from the fixed cases document.',
    );
  }

  if (
    !exactKeys(reviewInput.rawRun, ['runFile', 'runId']) ||
    typeof reviewInput.rawRun?.runFile !== 'string' ||
    typeof reviewInput.rawRun?.runId !== 'string'
  ) {
    add('raw_run_reference', 'rawRun must contain string runFile and runId.');
    return null;
  }

  const runFile = path.resolve(root, reviewInput.rawRun.runFile);
  const roundRunsDir = path.resolve(runsDir, round);
  if (
    relativeFile(runFile) !== reviewInput.rawRun.runFile ||
    !isWithin(roundRunsDir, runFile) ||
    path.extname(runFile) !== '.json' ||
    !fs.existsSync(runFile)
  ) {
    add(
      'raw_run_path',
      'rawRun.runFile must be a normalized repo-relative JSON path inside the selected round.',
    );
    return null;
  }

  const rawRun = JSON.parse(fs.readFileSync(runFile, 'utf8'));
  if (
    rawRun.runId !== reviewInput.rawRun.runId ||
    rawRun.caseSetVersion !== casesDoc.caseSetVersion ||
    !Array.isArray(rawRun.outputs)
  ) {
    add('raw_run_identity', 'Referenced raw run identity or case-set version differs.');
    return null;
  }
  const matchingOutputs = rawRun.outputs.filter(
    (output) => output?.caseId === caseInput.caseId,
  );
  if (matchingOutputs.length !== 1) {
    add(
      'raw_proposal_count',
      'Referenced raw run must contain exactly one proposal for the case.',
    );
    return null;
  }
  const rawProposal = matchingOutputs[0];
  if (!isDeepStrictEqual(reviewInput.proposal, rawProposal)) {
    add(
      'raw_proposal_mismatch',
      'Review input proposal differs from the referenced raw run output.',
    );
  }
  if (
    reviewInput.promptVersion !== rawProposal.promptVersion ||
    reviewInput.proposalSchemaVersion !== rawProposal.proposalSchemaVersion
  ) {
    add('proposal_version_mismatch', 'Proposal version metadata differs from raw output.');
  }

  const fingerprint = proposalFingerprint(rawProposal);
  if (
    !fingerprintPattern.test(reviewInput.proposalFingerprint ?? '') ||
    reviewInput.proposalFingerprint !== fingerprint
  ) {
    add(
      'proposal_fingerprint_mismatch',
      'Review input proposalFingerprint differs from the referenced raw proposal.',
    );
  }

  const validation = validateRawRun(runFile);
  if (validation.runId !== rawRun.runId) {
    add('validator_run_mismatch', 'Proposal validator runId differs from raw run.');
    return null;
  }
  const outputValidation = validation.outputs.get(caseInput.caseId);
  if (!outputValidation) {
    add('validator_missing', 'No proposal validator evidence found for this case.');
    return null;
  }
  const codes = [
    ...new Set([
      ...validation.runErrors.map((error) => error.code),
      ...(outputValidation.errors ?? []).map((error) => error.code),
    ]),
  ].sort();
  const actualValidation = {
    validatorVersion: validation.validatorVersion,
    passed: validation.runErrors.length === 0 && outputValidation.valid === true,
    codes,
  };
  if (
    !exactKeys(reviewInput.validator, [
      'validatorVersion',
      'passed',
      'codes',
    ]) ||
    reviewInput.validator?.validatorVersion !==
      actualValidation.validatorVersion ||
    reviewInput.validator?.passed !== actualValidation.passed ||
    !sameSortedStrings(reviewInput.validator?.codes, actualValidation.codes)
  ) {
    add(
      'review_input_validator_mismatch',
      'Embedded validator passed/codes differ from deterministic raw-run validation.',
    );
  }

  return {
    proposal: rawProposal,
    fingerprint,
    validation: actualValidation,
  };
}

function analyzeAccounting(proposal, caseInput) {
  const sourceRowIds = new Set(
    caseInput.sourceRows.map((row) => row.sourceRowId),
  );
  const mapped = new Set();
  const omitted = new Set();
  const unknownMapped = new Set();
  const unknownOmitted = new Set();
  const duplicateOmitted = new Set();

  const proposalItems = Array.isArray(proposal.proposal?.items)
    ? proposal.proposal.items
    : [];
  const omittedRows = Array.isArray(proposal.proposal?.omittedRows)
    ? proposal.proposal.omittedRows
    : [];
  for (const item of proposalItems) {
    for (const rowId of Array.isArray(item?.sourceRowIds)
      ? item.sourceRowIds
      : []) {
      if (sourceRowIds.has(rowId)) mapped.add(rowId);
      else unknownMapped.add(rowId);
    }
  }
  for (const omission of omittedRows) {
    const rowId = omission?.sourceRowId;
    if (sourceRowIds.has(rowId)) {
      if (omitted.has(rowId)) duplicateOmitted.add(rowId);
      omitted.add(rowId);
    } else {
      unknownOmitted.add(rowId);
    }
  }

  const overlap = new Set([...mapped].filter((rowId) => omitted.has(rowId)));
  const accounted = new Set([...mapped, ...omitted]);
  const missing = new Set(
    [...sourceRowIds].filter((rowId) => !accounted.has(rowId)),
  );
  const rate = sourceRowIds.size === 0 ? 1 : accounted.size / sourceRowIds.size;
  return {
    sourceRowIds,
    mapped,
    omitted,
    unknownMapped,
    unknownOmitted,
    duplicateOmitted,
    overlap,
    missing,
    rate,
    full:
      unknownMapped.size === 0 &&
      unknownOmitted.size === 0 &&
      duplicateOmitted.size === 0 &&
      overlap.size === 0 &&
      missing.size === 0,
  };
}

function groundingTarget(field, auditById) {
  if (
    field === 'projectionPlan' ||
    field.startsWith('projectionPlan.') ||
    field.startsWith('projectionPlan[')
  ) {
    return { key: 'projection', flag: 'projectionGrounded' };
  }
  for (const [proposalId, audit] of auditById) {
    const prefix = `proposal.items[${proposalId}]`;
    if (
      field === `${prefix}.title` ||
      field.startsWith(`${prefix}.title.`) ||
      field === `${prefix}.intent` ||
      field.startsWith(`${prefix}.intent.`)
    ) {
      return { key: `${proposalId}:action`, audit, flag: 'actionGrounded' };
    }
    if (
      field === `${prefix}.completion` ||
      field.startsWith(`${prefix}.completion.`)
    ) {
      return {
        key: `${proposalId}:completion`,
        audit,
        flag: 'completionGrounded',
      };
    }
    if (
      field === `${prefix}.memoCandidate` ||
      field.startsWith(`${prefix}.memoCandidate.`)
    ) {
      return { key: `${proposalId}:memo`, audit, flag: 'memoGrounded' };
    }
    if (
      field === `${prefix}.scheduleCandidate` ||
      field.startsWith(`${prefix}.scheduleCandidate.`)
    ) {
      return {
        key: `${proposalId}:schedule`,
        audit,
        flag: 'scheduleGrounded',
      };
    }
  }
  return null;
}

function validateGroundingAudit(
  groundingAudit,
  proposal,
  fingerprint,
  validationPassed,
  reviewHardFailCodes,
  add,
) {
  if (!exactKeys(groundingAudit, Object.keys(template.groundingAudit))) {
    add('grounding_audit_shape', 'groundingAudit keys differ from the template.');
    return;
  }
  if (groundingAudit.proposalFingerprint !== fingerprint) {
    add(
      'grounding_fingerprint_mismatch',
      'groundingAudit fingerprint differs from the raw proposal.',
    );
  }

  if (!validationPassed) {
    if (
      groundingAudit.items !== null ||
      groundingAudit.projectionGrounded !== null ||
      groundingAudit.projectionComment !== null ||
      groundingAudit.unsupportedContentFindings !== null
    ) {
      add(
        'invalid_grounding_must_be_null',
        'Invalid runs must leave semantic grounding fields null.',
      );
    }
    return;
  }

  const originalItems = Array.isArray(proposal.proposal?.items)
    ? proposal.proposal.items
    : [];
  if (
    !Array.isArray(groundingAudit.items) ||
    groundingAudit.items.length !== originalItems.length
  ) {
    add(
      'grounding_item_count',
      'groundingAudit needs exactly one row per original Item.',
    );
  }
  if (
    typeof groundingAudit.projectionGrounded !== 'boolean' ||
    typeof groundingAudit.projectionComment !== 'string' ||
    groundingAudit.projectionComment.trim().length === 0
  ) {
    add(
      'projection_grounding',
      'Valid proposals need boolean projectionGrounded and a non-empty comment.',
    );
  }
  if (!Array.isArray(groundingAudit.unsupportedContentFindings)) {
    add(
      'unsupported_findings_shape',
      'Valid proposals need an unsupportedContentFindings array.',
    );
  }

  const originalsById = new Map();
  for (const item of originalItems) {
    if (originalsById.has(item.proposalId)) {
      add('duplicate_proposal_id', `Original proposal repeats ${item.proposalId}.`);
    }
    originalsById.set(item.proposalId, item);
  }
  const auditById = new Map();
  for (const audit of groundingAudit.items ?? []) {
    if (
      !exactKeys(audit, [
        'proposalId',
        'sourceRowIds',
        'actionGrounded',
        'completionGrounded',
        'memoGrounded',
        'scheduleGrounded',
        'comment',
      ])
    ) {
      add('grounding_item_shape', 'Grounding Item keys differ from the contract.');
      continue;
    }
    const original = originalsById.get(audit.proposalId);
    if (!original || auditById.has(audit.proposalId)) {
      add(
        'grounding_item_identity',
        `Grounding Item ${audit.proposalId} is missing, unknown, or duplicated.`,
      );
      continue;
    }
    auditById.set(audit.proposalId, audit);
    if (!isDeepStrictEqual(audit.sourceRowIds, original.sourceRowIds)) {
      add(
        'grounding_source_rows',
        `${audit.proposalId} sourceRowIds differ from the original Item.`,
      );
    }
    for (const key of [
      'actionGrounded',
      'completionGrounded',
      'memoGrounded',
      'scheduleGrounded',
    ]) {
      if (typeof audit[key] !== 'boolean') {
        add('grounding_boolean', `${audit.proposalId}.${key} must be boolean.`);
      }
    }
    if (typeof audit.comment !== 'string' || audit.comment.trim().length === 0) {
      add('grounding_comment', `${audit.proposalId} needs a non-empty comment.`);
    }
  }
  for (const proposalId of originalsById.keys()) {
    if (!auditById.has(proposalId)) {
      add('grounding_item_missing', `No grounding row for ${proposalId}.`);
    }
  }

  const findingsByTarget = new Map();
  const findingCodeSet = new Set();
  for (const finding of groundingAudit.unsupportedContentFindings ?? []) {
    if (!exactKeys(finding, ['code', 'field', 'evidence'])) {
      add('unsupported_finding_shape', 'Unsupported finding keys differ from the contract.');
      continue;
    }
    if (!findingCodes.has(finding.code)) {
      add('unsupported_finding_code', `Unexpected finding code ${finding.code}.`);
    }
    if (
      typeof finding.field !== 'string' ||
      finding.field.trim().length === 0 ||
      typeof finding.evidence !== 'string' ||
      finding.evidence.trim().length === 0
    ) {
      add('unsupported_finding_detail', 'Finding field/evidence must be non-empty strings.');
      continue;
    }
    findingCodeSet.add(finding.code);
    const target = groundingTarget(finding.field, auditById);
    if (!target) {
      add(
        'unsupported_finding_field',
        `Finding field ${finding.field} does not map to an audited Item or projection.`,
      );
      continue;
    }
    const targetIsFalse =
      target.key === 'projection'
        ? groundingAudit.projectionGrounded === false
        : target.audit?.[target.flag] === false;
    if (!targetIsFalse) {
      add(
        'finding_without_false_grounding',
        `Finding ${finding.field} requires its grounding boolean to be false.`,
      );
    }
    findingsByTarget.set(
      target.key,
      (findingsByTarget.get(target.key) ?? 0) + 1,
    );
  }

  for (const [proposalId, audit] of auditById) {
    for (const [aspect, flag] of [
      ['action', 'actionGrounded'],
      ['completion', 'completionGrounded'],
      ['memo', 'memoGrounded'],
      ['schedule', 'scheduleGrounded'],
    ]) {
      if (
        audit[flag] === false &&
        !findingsByTarget.has(`${proposalId}:${aspect}`)
      ) {
        add(
          'false_grounding_without_finding',
          `${proposalId}.${flag}=false needs a matching unsupported-content finding.`,
        );
      }
    }
  }
  if (
    groundingAudit.projectionGrounded === false &&
    !findingsByTarget.has('projection')
  ) {
    add(
      'false_projection_without_finding',
      'projectionGrounded=false needs a projectionPlan finding.',
    );
  }

  const hardFailSet = new Set(
    Array.isArray(reviewHardFailCodes) ? reviewHardFailCodes : [],
  );
  for (const code of findingCodeSet) {
    if (!hardFailSet.has(code)) {
      add(
        'finding_code_missing_from_hard_fails',
        `${code} must also appear in reviewHardFailCodes.`,
      );
    }
  }
  for (const code of hardFailSet) {
    if (findingCodes.has(code) && !findingCodeSet.has(code)) {
      add(
        'hard_fail_missing_finding',
        `${code} in reviewHardFailCodes needs an unsupported-content finding.`,
      );
    }
  }
}

function validateResult(result, round, reviewSetLabel) {
  const errors = [];
  const add = (code, message) => errors.push({ code, message });
  const caseInput = cases.get(result.caseId);
  const expected = expectations.get(result.caseId);
  const inputPath = path.join(inputsDir, round, `${result.caseId}.json`);
  const reviewInput = fs.existsSync(inputPath)
    ? JSON.parse(fs.readFileSync(inputPath, 'utf8'))
    : null;

  if (!exactKeys(result, Object.keys(template))) {
    add('result_shape', 'Result keys differ from the v2 template.');
  }
  if (!caseInput || !expected || !reviewInput) {
    add('unknown_case', 'Case, expectation, or review input is missing.');
    return { caseId: result.caseId ?? null, valid: false, errors };
  }

  for (const finding of findForbiddenFields(result)) {
    add(
      finding.kind === 'expected'
        ? 'review_expected_field'
        : 'review_model_evidence',
      `Forbidden ${finding.kind} field appears at ${finding.pointer}.`,
    );
  }

  if (
    !exactKeys(result.reviewMethod, Object.keys(template.reviewMethod)) ||
    result.reviewMethod?.reviewerKind !== 'in_session_model_proxy' ||
    result.reviewMethod?.modelIdentityBlinded !== true ||
    result.reviewMethod?.humanReviewer !== false ||
    result.reviewMethod?.contextIsolation !==
      'fresh_subagent_no_expected_answers'
  ) {
    add(
      'review_method',
      'Review method must disclose a fresh subagent with no expected answers.',
    );
  }
  if (result.blindRunLabel !== reviewSetLabel) {
    add('blind_label', 'Result blindRunLabel differs from its review set.');
  }

  const raw = validateReviewInput(reviewInput, round, caseInput, add);
  const proposal = raw?.proposal ?? reviewInput.proposal;
  const actualValidation = raw?.validation ?? null;
  const fingerprint = raw?.fingerprint ?? proposalFingerprint(proposal);

  if (!exactKeys(result.validator, Object.keys(template.validator))) {
    add('result_validator_shape', 'Result validator keys differ from the template.');
  }
  if (!actualValidation) {
    add('validator_missing', 'No trusted raw-run validator evidence is available.');
  } else {
    if (result.validator?.passed !== actualValidation.passed) {
      add(
        'validator_pass_mismatch',
        'Recorded validator pass differs from raw-run validation.',
      );
    }
    if (
      !sameSortedStrings(
        result.validator?.hardFailCodes,
        actualValidation.codes,
      )
    ) {
      add(
        'validator_codes_mismatch',
        'Recorded hard-fail codes differ from raw-run validation.',
      );
    }
  }

  const isNegative = expected.fixtureKind === 'negative';
  if (actualValidation?.passed) {
    if (
      !Array.isArray(result.reviewHardFailCodes) ||
      result.reviewHardFailCodes.some((code) => typeof code !== 'string') ||
      new Set(result.reviewHardFailCodes).size !==
        result.reviewHardFailCodes.length
    ) {
      add(
        'review_hard_fails',
        'Valid runs need an explicit, duplicate-free reviewHardFailCodes array.',
      );
    }
  } else if (result.reviewHardFailCodes !== null) {
    add(
      'review_hard_fails_unscored',
      'Invalid runs must leave semantic hard-fail review null.',
    );
  }

  validateGroundingAudit(
    result.groundingAudit,
    proposal,
    fingerprint,
    actualValidation?.passed === true,
    result.reviewHardFailCodes,
    add,
  );

  if (!exactKeys(result.scores, scoreKeys)) {
    add('scores_shape', 'Score keys differ from the template.');
  }
  if (!exactKeys(result.scoreComments, scoreKeys)) {
    add('score_comments_shape', 'Score-comment keys differ from the template.');
  }
  const numericScores = scoreKeys.every(
    (key) =>
      Number.isInteger(result.scores?.[key]) &&
      result.scores[key] >= 1 &&
      result.scores[key] <= 5,
  );
  const nullScores = scoreKeys.every(
    (key) => result.scores?.[key] === null,
  );
  const commentsComplete = scoreKeys.every(
    (key) =>
      typeof result.scoreComments?.[key] === 'string' &&
      result.scoreComments[key].trim().length > 0,
  );
  if (!commentsComplete) {
    add('score_comments', 'Every score axis needs a comment, including N/A.');
  }

  if (actualValidation?.passed && !isNegative) {
    if (!numericScores) {
      add('scores_required', 'Valid positive cases need seven integer scores.');
    }
    if (numericScores) {
      const calculated = Number(average(result.scores).toFixed(2));
      if (Math.abs(result.qualityAverage - calculated) > 0.001) {
        add('average_mismatch', `qualityAverage must equal ${calculated}.`);
      }
    }
  } else if (!nullScores || result.qualityAverage !== null) {
    add(
      'scores_must_be_null',
      'Invalid or negative cases use null numeric scores and average.',
    );
  }

  const accounting = analyzeAccounting(proposal, caseInput);
  if (!exactKeys(result.sourceRowAccounting, Object.keys(template.sourceRowAccounting))) {
    add('accounting_shape', 'sourceRowAccounting keys differ from the template.');
  }
  const expectedAccounting = {
    executableRows: accounting.sourceRowIds.size,
    mappedUniqueRows: accounting.mapped.size,
    approvedOmittedRows: accounting.omitted.size,
    accountedSourceRowRate: accounting.rate,
  };
  for (const [key, value] of Object.entries(expectedAccounting)) {
    if (result.sourceRowAccounting?.[key] !== value) {
      add('accounting_mismatch', `${key} must equal ${value}.`);
    }
  }
  if (actualValidation?.passed) {
    if (accounting.unknownMapped.size > 0) {
      add('unknown_mapped_rows', 'Mapped SourceRows include IDs outside the case.');
    }
    if (accounting.unknownOmitted.size > 0) {
      add('unknown_omitted_rows', 'Omitted SourceRows include IDs outside the case.');
    }
    if (accounting.duplicateOmitted.size > 0) {
      add('duplicate_omitted_rows', 'omittedRows contains duplicate SourceRow IDs.');
    }
    if (accounting.overlap.size > 0) {
      add('mapped_omitted_overlap', 'Mapped and omitted SourceRows must be disjoint.');
    }
    if (accounting.missing.size > 0) {
      add('source_rows_unaccounted', 'Every case SourceRow must be mapped or omitted.');
    }
  }

  const originalItems = Array.isArray(proposal.proposal?.items)
    ? proposal.proposal.items
    : [];
  const originalIds = new Set(originalItems.map((item) => item.proposalId));
  if (!exactKeys(result.correctedPreview, Object.keys(template.correctedPreview))) {
    add('preview_shape', 'correctedPreview keys differ from the template.');
  }
  const previewItems = Array.isArray(result.correctedPreview?.items)
    ? result.correctedPreview.items
    : [];
  if (
    !Array.isArray(result.correctedPreview?.items) ||
    !Array.isArray(result.correctedPreview?.destinations)
  ) {
    add('preview_arrays', 'Preview items and destinations must be arrays.');
  }
  if (!actualValidation?.passed && previewItems.length > 0) {
    add('invalid_preview', 'Invalid runs cannot claim a corrected semantic preview.');
  }
  const keptIds = new Set();
  for (const item of previewItems) {
    if (
      !exactKeys(item, [
        'title',
        'doneWhen',
        'sourceRowIds',
        'sourceProposalIds',
      ]) ||
      typeof item.title !== 'string' ||
      item.title.trim().length === 0 ||
      typeof item.doneWhen !== 'string' ||
      item.doneWhen.trim().length === 0 ||
      !Array.isArray(item.sourceRowIds) ||
      item.sourceRowIds.some(
        (rowId) => !accounting.sourceRowIds.has(rowId),
      ) ||
      !Array.isArray(item.sourceProposalIds) ||
      item.sourceProposalIds.length === 0 ||
      item.sourceProposalIds.some((proposalId) => !originalIds.has(proposalId)) ||
      new Set(item.sourceProposalIds).size !== item.sourceProposalIds.length
    ) {
      add(
        'preview_item',
        'Corrected preview Item shape, SourceRow refs, or sourceProposalIds are invalid.',
      );
      continue;
    }
    item.sourceProposalIds.forEach((proposalId) => keptIds.add(proposalId));
  }

  if (!exactKeys(result.correction, Object.keys(template.correction))) {
    add('correction_shape', 'Correction keys differ from the template.');
  }
  const originalItemCount = originalItems.length;
  if (result.correction?.originalItemCount !== originalItemCount) {
    add(
      'original_item_count',
      `originalItemCount must equal ${originalItemCount}.`,
    );
  }
  if (
    result.correction?.reviewSeconds !== null ||
    result.correction?.reviewTimeEvidenceKind !== 'not_available' ||
    result.correction?.burden !== null
  ) {
    add(
      'timing_claim',
      'Proxy review must keep human timing and burden unavailable.',
    );
  }
  for (const key of correctionCountKeys) {
    if (
      !Number.isInteger(result.correction?.[key]) ||
      result.correction[key] < 0
    ) {
      add('correction_count', `${key} must be a non-negative integer.`);
    }
  }
  if (typeof result.correction?.fullRegenerationRequired !== 'boolean') {
    add(
      'correction_regeneration',
      'fullRegenerationRequired must be boolean.',
    );
  }
  if (result.correction?.keptOriginalItems !== keptIds.size) {
    add(
      'kept_item_count',
      `keptOriginalItems must equal ${keptIds.size}, derived from unique valid sourceProposalIds.`,
    );
  }
  if (originalItemCount === 0) {
    if (
      result.correction?.keptOriginalItems !== 0 ||
      result.correction?.itemKeepRate !== null
    ) {
      add(
        'zero_item_keep',
        'Zero-item cases need keptOriginalItems=0 and itemKeepRate=null.',
      );
    }
  } else {
    const keepRate = keptIds.size / originalItemCount;
    if (Math.abs(result.correction?.itemKeepRate - keepRate) > 0.001) {
      add('keep_rate', `itemKeepRate must equal ${keepRate}.`);
    }
  }

  const calculatedContentGate =
    actualValidation?.passed === true &&
    !isNegative &&
    Array.isArray(result.reviewHardFailCodes) &&
    result.reviewHardFailCodes.length === 0 &&
    numericScores &&
    accounting.full &&
    result.correction?.itemKeepRate >= 0.8 &&
    average(result.scores) >= 3.5 &&
    result.scores.executionClarity >= 4 &&
    result.scores.contentFidelityAndCoverage >= 4 &&
    result.scores.sourceAndSafetySeparation >= 4;
  if (
    result.contentQualityGatePassed !==
    (isNegative ? null : calculatedContentGate)
  ) {
    add(
      'content_gate',
      'contentQualityGatePassed does not match the declared thresholds.',
    );
  }

  const proposalMatchesNegative =
    isNegative &&
    actualValidation?.passed === true &&
    proposal.status.generationState ===
      expected.expectedStatus.generationState &&
    proposal.status.outcome === expected.expectedStatus.outcome &&
    proposal.status.errorCode === expected.expectedStatus.errorCode &&
    proposal.reviewHints.recommendedDisposition ===
      expected.expectedStatus.recommendedDisposition &&
    proposal.proposal.items.length === 0 &&
    proposal.projectionPlan.length === 0;
  if (
    result.negativeGatePassed !==
    (isNegative ? proposalMatchesNegative : null)
  ) {
    add(
      'negative_gate',
      'negativeGatePassed does not match post-review expected disposition evidence.',
    );
  }
  if (result.fullUsabilityVerified !== false) {
    add('usability_claim', 'Human usability is not verified.');
  }
  if (!decisions.has(result.decision)) {
    add('decision', 'Unexpected review decision.');
  }

  return { caseId: result.caseId, valid: errors.length === 0, errors };
}

const reviewFiles = collectJson(reviewsDir).filter((file) => {
  if (!selectedRound) return true;
  return file.includes(`${path.sep}${selectedRound}${path.sep}`);
});
const seenCases = new Map();
const results = [];

for (const file of reviewFiles) {
  const reviewSource = fs.readFileSync(file, 'utf8');
  const reviewSet = JSON.parse(reviewSource);
  const round = reviewSet.round;
  const fileResult = {
    file: relativeFile(file),
    round,
    valid: true,
    errors: [],
    cases: [],
  };
  if (reviewSource.includes('\uFFFD') || /\?{2,}/u.test(reviewSource)) {
    fileResult.errors.push({
      code: 'review_text_integrity',
      message: 'Review text contains a replacement glyph or consecutive question marks.',
    });
  }
  if (
    !exactKeys(reviewSet, [
      'reviewSetSchemaVersion',
      'round',
      'blindRunLabel',
      'rubricVersion',
      'results',
    ]) ||
    reviewSet.reviewSetSchemaVersion !==
      'flowme-url-to-flow-review-set-v2' ||
    reviewSet.rubricVersion !== rubricVersion ||
    !/^round-[1-9]\d*$/.test(round ?? '') ||
    typeof reviewSet.blindRunLabel !== 'string' ||
    reviewSet.blindRunLabel.trim().length === 0 ||
    !Array.isArray(reviewSet.results)
  ) {
    fileResult.errors.push({
      code: 'review_set_shape',
      message: 'Review set envelope is not the v2 contract.',
    });
  }
  for (const result of reviewSet.results ?? []) {
    const key = `${round}:${result.caseId}`;
    if (seenCases.has(key)) {
      fileResult.errors.push({
        code: 'duplicate_review',
        message: `${key} is reviewed twice.`,
      });
    }
    seenCases.set(key, file);
    fileResult.cases.push(
      validateResult(result, round, reviewSet.blindRunLabel),
    );
  }
  fileResult.valid =
    fileResult.errors.length === 0 &&
    fileResult.cases.every((entry) => entry.valid);
  results.push(fileResult);
}

const summary = {
  reviewValidatorVersion: 'flowme-url-to-flow-review-validator-v2',
  files: results.length,
  cases: results.reduce((sum, entry) => sum + entry.cases.length, 0),
  validFiles: results.filter((entry) => entry.valid).length,
  validCases: results
    .flatMap((entry) => entry.cases)
    .filter((entry) => entry.valid).length,
  errors: results.reduce(
    (sum, entry) =>
      sum +
      entry.errors.length +
      entry.cases.reduce((n, item) => n + item.errors.length, 0),
    0,
  ),
  results,
};

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(
    `Review validator: ${summary.validFiles}/${summary.files} files, ${summary.validCases}/${summary.cases} cases valid, ${summary.errors} errors.`,
  );
  for (const file of results) {
    console.log(`${file.valid ? 'PASS' : 'FAIL'} ${file.file}`);
    for (const error of file.errors) {
      console.log(`  ERROR ${error.code}: ${error.message}`);
    }
    for (const item of file.cases) {
      console.log(`  ${item.valid ? 'PASS' : 'FAIL'} ${item.caseId}`);
      for (const error of item.errors) {
        console.log(`    ERROR ${error.code}: ${error.message}`);
      }
    }
  }
}

process.exit(summary.errors === 0 ? 0 : 1);
