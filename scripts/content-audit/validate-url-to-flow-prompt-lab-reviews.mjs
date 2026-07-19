import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const specDir = path.join(root, 'docs', 'specs', '2026-07-14-url-to-flow-prompt-lab');
const auditDir = path.join(root, 'docs', 'content-audit', '2026-07-14-url-to-flow-prompt-lab');
const reviewsDir = path.join(auditDir, 'reviews');
const inputsDir = path.join(auditDir, 'review-inputs');
const runsDir = path.join(auditDir, 'runs');
const proposalValidator = path.join(here, 'validate-url-to-flow-prompt-lab.mjs');

const args = process.argv.slice(2);
const roundIndex = args.indexOf('--round');
const selectedRound = roundIndex >= 0 ? args[roundIndex + 1] : null;
const jsonOutput = args.includes('--json');

if (args.includes('--help')) {
  console.log(`Usage:
  node scripts/content-audit/validate-url-to-flow-prompt-lab-reviews.mjs [--round round-2] [--json]`);
  process.exit(0);
}

const casesDoc = JSON.parse(fs.readFileSync(path.join(specDir, 'cases-v1.json'), 'utf8'));
const expectedDoc = JSON.parse(fs.readFileSync(path.join(specDir, 'expected-v1.json'), 'utf8'));
const template = JSON.parse(
  fs.readFileSync(path.join(specDir, 'review-result-template.json'), 'utf8'),
);
const cases = new Map(casesDoc.cases.map((entry) => [entry.caseId, entry]));
const expectations = new Map(expectedDoc.expectations.map((entry) => [entry.caseId, entry]));
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

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected) {
  if (!isObject(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function collectJson(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectJson(target);
    return entry.isFile() && entry.name.endsWith('.json') ? [target] : [];
  });
}

function proposalValidationByCase(round) {
  const byCase = new Map();
  for (const runFile of collectJson(path.join(runsDir, round))) {
    const result = spawnSync(
      process.execPath,
      [proposalValidator, '--file', runFile, '--json'],
      { cwd: root, encoding: 'utf8' },
    );
    if (!result.stdout.trim()) continue;
    const report = JSON.parse(result.stdout);
    for (const run of report.results) {
      for (const output of run.outputs) {
        byCase.set(output.caseId, {
          passed: run.errors.length === 0 && output.valid,
          hardFailCodes: [
            ...new Set([
              ...run.errors.map((error) => error.code),
              ...output.errors.map((error) => error.code),
            ]),
          ].sort(),
        });
      }
    }
  }
  return byCase;
}

function average(scores) {
  return scoreKeys.reduce((sum, key) => sum + scores[key], 0) / scoreKeys.length;
}

function validateResult(result, round, proposalValidation) {
  const errors = [];
  const add = (code, message) => errors.push({ code, message });
  const caseInput = cases.get(result.caseId);
  const expected = expectations.get(result.caseId);
  const inputPath = path.join(inputsDir, round, `${result.caseId}.json`);
  const reviewInput = fs.existsSync(inputPath)
    ? JSON.parse(fs.readFileSync(inputPath, 'utf8'))
    : null;

  if (!exactKeys(result, Object.keys(template))) add('result_shape', 'Result keys differ from template.');
  if (!caseInput || !expected || !reviewInput) {
    add('unknown_case', 'Case, expectation, or review input is missing.');
    return { caseId: result.caseId ?? null, valid: false, errors };
  }

  if (
    !exactKeys(result.reviewMethod, Object.keys(template.reviewMethod)) ||
    result.reviewMethod.reviewerKind !== 'in_session_model_proxy' ||
    result.reviewMethod.modelIdentityBlinded !== true ||
    result.reviewMethod.humanReviewer !== false
  ) {
    add('review_method', 'Review method must disclose the in-session blinded proxy.');
  }

  const actualValidation = proposalValidation.get(result.caseId);
  if (!actualValidation) {
    add('validator_missing', 'No proposal validator evidence found for this case.');
  } else {
    if (result.validator?.passed !== actualValidation.passed) {
      add('validator_pass_mismatch', 'Recorded validator pass differs from raw-run validation.');
    }
    const recordedCodes = [...(result.validator?.hardFailCodes ?? [])].sort();
    if (JSON.stringify(recordedCodes) !== JSON.stringify(actualValidation.hardFailCodes)) {
      add('validator_codes_mismatch', 'Recorded hard-fail codes differ from raw-run validation.');
    }
  }

  const isNegative = expected.fixtureKind === 'negative';
  if (actualValidation?.passed) {
    if (
      !Array.isArray(result.reviewHardFailCodes) ||
      result.reviewHardFailCodes.some((code) => typeof code !== 'string')
    ) {
      add('review_hard_fails', 'Valid runs need an explicit reviewHardFailCodes array.');
    }
  } else if (result.reviewHardFailCodes !== null) {
    add('review_hard_fails_unscored', 'Invalid runs must leave semantic hard-fail review null.');
  }
  const numericScores = scoreKeys.every(
    (key) => Number.isInteger(result.scores?.[key]) && result.scores[key] >= 1 && result.scores[key] <= 5,
  );
  const nullScores = scoreKeys.every((key) => result.scores?.[key] === null);
  const commentsComplete = scoreKeys.every(
    (key) => typeof result.scoreComments?.[key] === 'string' && result.scoreComments[key].length > 0,
  );
  if (!commentsComplete) add('score_comments', 'Every score axis needs a comment, including N/A.');

  if (actualValidation?.passed && !isNegative) {
    if (!numericScores) add('scores_required', 'Valid positive cases need seven integer scores.');
    if (numericScores) {
      const calculated = Number(average(result.scores).toFixed(2));
      if (Math.abs(result.qualityAverage - calculated) > 0.001) {
        add('average_mismatch', `qualityAverage must equal ${calculated}.`);
      }
    }
  } else if (!nullScores || result.qualityAverage !== null) {
    add('scores_must_be_null', 'Invalid or negative cases use null numeric scores and average.');
  }

  const proposal = reviewInput.proposal;
  const sourceRowIds = new Set(caseInput.sourceRows.map((row) => row.sourceRowId));
  const mapped = new Set(
    (proposal.proposal?.items ?? [])
      .flatMap((item) => (Array.isArray(item.sourceRowIds) ? item.sourceRowIds : []))
      .filter((rowId) => sourceRowIds.has(rowId)),
  );
  const omitted = new Set(
    (proposal.proposal?.omittedRows ?? [])
      .map((entry) => entry.sourceRowId)
      .filter((rowId) => sourceRowIds.has(rowId)),
  );
  const accounted = new Set([...mapped, ...omitted]);
  const accountingRate = sourceRowIds.size === 0 ? 1 : accounted.size / sourceRowIds.size;
  const expectedAccounting = {
    executableRows: sourceRowIds.size,
    mappedUniqueRows: mapped.size,
    approvedOmittedRows: omitted.size,
    accountedSourceRowRate: accountingRate,
  };
  for (const [key, value] of Object.entries(expectedAccounting)) {
    if (result.sourceRowAccounting?.[key] !== value) {
      add('accounting_mismatch', `${key} must equal ${value}.`);
    }
  }

  const originalItemCount = proposal.proposal?.items?.length ?? 0;
  if (result.correction?.originalItemCount !== originalItemCount) {
    add('original_item_count', `originalItemCount must equal ${originalItemCount}.`);
  }
  if (
    result.correction?.reviewSeconds !== null ||
    result.correction?.reviewTimeEvidenceKind !== 'not_available' ||
    result.correction?.burden !== null
  ) {
    add('timing_claim', 'Proxy review must keep human timing and burden unavailable.');
  }
  for (const key of correctionCountKeys) {
    if (!Number.isInteger(result.correction?.[key]) || result.correction[key] < 0) {
      add('correction_count', `${key} must be a non-negative integer.`);
    }
  }
  if (typeof result.correction?.fullRegenerationRequired !== 'boolean') {
    add('correction_regeneration', 'fullRegenerationRequired must be boolean.');
  }
  if (originalItemCount === 0) {
    if (result.correction?.keptOriginalItems !== 0 || result.correction?.itemKeepRate !== null) {
      add('zero_item_keep', 'Zero-item cases need keptOriginalItems=0 and itemKeepRate=null.');
    }
  } else {
    const kept = result.correction?.keptOriginalItems;
    if (!Number.isInteger(kept) || kept < 0 || kept > originalItemCount) {
      add('kept_item_count', 'keptOriginalItems is outside the valid range.');
    } else {
      const keepRate = kept / originalItemCount;
      if (Math.abs(result.correction.itemKeepRate - keepRate) > 0.001) {
        add('keep_rate', `itemKeepRate must equal ${keepRate}.`);
      }
    }
  }

  const calculatedContentGate =
    actualValidation?.passed === true &&
    !isNegative &&
    Array.isArray(result.reviewHardFailCodes) &&
    result.reviewHardFailCodes.length === 0 &&
    numericScores &&
    accountingRate === 1 &&
    result.correction?.itemKeepRate >= 0.8 &&
    average(result.scores) >= 3.5 &&
    result.scores.executionClarity >= 4 &&
    result.scores.contentFidelityAndCoverage >= 4 &&
    result.scores.sourceAndSafetySeparation >= 4;
  if (result.contentQualityGatePassed !== (isNegative ? null : calculatedContentGate)) {
    add('content_gate', 'contentQualityGatePassed does not match the declared thresholds.');
  }

  const proposalMatchesNegative =
    isNegative &&
    actualValidation?.passed === true &&
    proposal.status.generationState === expected.expectedStatus.generationState &&
    proposal.status.outcome === expected.expectedStatus.outcome &&
    proposal.status.errorCode === expected.expectedStatus.errorCode &&
    proposal.reviewHints.recommendedDisposition === expected.expectedStatus.recommendedDisposition &&
    proposal.proposal.items.length === 0 &&
    proposal.projectionPlan.length === 0;
  if (result.negativeGatePassed !== (isNegative ? proposalMatchesNegative : null)) {
    add('negative_gate', 'negativeGatePassed does not match expected disposition evidence.');
  }
  if (result.fullUsabilityVerified !== false) add('usability_claim', 'Human usability is not verified.');
  if (!decisions.has(result.decision)) add('decision', 'Unexpected review decision.');

  if (!exactKeys(result.correctedPreview, Object.keys(template.correctedPreview))) {
    add('preview_shape', 'correctedPreview keys differ from template.');
  } else {
    if (!Array.isArray(result.correctedPreview.items) || !Array.isArray(result.correctedPreview.destinations)) {
      add('preview_arrays', 'Preview items and destinations must be arrays.');
    }
    for (const item of result.correctedPreview.items ?? []) {
      if (
        !exactKeys(item, ['title', 'doneWhen', 'sourceRowIds']) ||
        typeof item.title !== 'string' ||
        typeof item.doneWhen !== 'string' ||
        !Array.isArray(item.sourceRowIds) ||
        item.sourceRowIds.some((rowId) => !sourceRowIds.has(rowId))
      ) {
        add('preview_item', 'Corrected preview Item shape or SourceRow reference is invalid.');
      }
    }
  }

  return { caseId: result.caseId, valid: errors.length === 0, errors };
}

const reviewFiles = collectJson(reviewsDir).filter((file) => {
  if (!selectedRound) return true;
  return file.includes(`${path.sep}${selectedRound}${path.sep}`);
});
const validationCache = new Map();
const seenCases = new Map();
const results = [];

for (const file of reviewFiles) {
  const reviewSet = JSON.parse(fs.readFileSync(file, 'utf8'));
  const round = reviewSet.round;
  const fileResult = {
    file: path.relative(root, file).replaceAll('\\', '/'),
    round,
    valid: true,
    errors: [],
    cases: [],
  };
  if (
    !exactKeys(reviewSet, [
      'reviewSetSchemaVersion',
      'round',
      'blindRunLabel',
      'rubricVersion',
      'results',
    ]) ||
    reviewSet.reviewSetSchemaVersion !== 'flowme-url-to-flow-review-set-v1' ||
    !Array.isArray(reviewSet.results)
  ) {
    fileResult.errors.push({ code: 'review_set_shape', message: 'Review set envelope is invalid.' });
  }
  if (!validationCache.has(round)) validationCache.set(round, proposalValidationByCase(round));
  for (const result of reviewSet.results ?? []) {
    const key = `${round}:${result.caseId}`;
    if (seenCases.has(key)) {
      fileResult.errors.push({ code: 'duplicate_review', message: `${key} is reviewed twice.` });
    }
    seenCases.set(key, file);
    fileResult.cases.push(validateResult(result, round, validationCache.get(round)));
  }
  fileResult.valid =
    fileResult.errors.length === 0 && fileResult.cases.every((entry) => entry.valid);
  results.push(fileResult);
}

const summary = {
  reviewValidatorVersion: 'flowme-url-to-flow-review-validator-v1',
  files: results.length,
  cases: results.reduce((sum, entry) => sum + entry.cases.length, 0),
  validFiles: results.filter((entry) => entry.valid).length,
  validCases: results.flatMap((entry) => entry.cases).filter((entry) => entry.valid).length,
  errors: results.reduce(
    (sum, entry) =>
      sum + entry.errors.length + entry.cases.reduce((n, item) => n + item.errors.length, 0),
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
    for (const error of file.errors) console.log(`  ERROR ${error.code}: ${error.message}`);
    for (const item of file.cases) {
      console.log(`  ${item.valid ? 'PASS' : 'FAIL'} ${item.caseId}`);
      for (const error of item.errors) console.log(`    ERROR ${error.code}: ${error.message}`);
    }
  }
}

process.exit(summary.errors === 0 ? 0 : 1);
