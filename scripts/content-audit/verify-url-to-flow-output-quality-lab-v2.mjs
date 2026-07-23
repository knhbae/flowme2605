import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ContractValidationError,
  validateAll,
} from '../../docs/specs/2026-07-20-url-to-flow-output-quality-lab-v2/validate-output-quality-v2.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const specDir = path.join(root, 'docs', 'specs', '2026-07-20-url-to-flow-output-quality-lab-v2');
const auditFile = path.join(root, 'docs', 'content-audit', '2026-07-20-url-to-flow-output-quality-review-ko.html');
const wantsJson = process.argv.includes('--json');
const checks = [];

function check(name, condition, evidence) {
  checks.push({ name, passed: Boolean(condition), evidence });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function collectJsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectJsonFiles(target);
    return entry.isFile() && entry.name.endsWith('.json') ? [target] : [];
  }).sort();
}

function formatRate(value) {
  return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : 'n/a';
}

function inlineScriptsParse(html) {
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\bsrc\s*=/.test(match[1]) && !/\btype\s*=\s*["']application\/json["']/i.test(match[1]))
    .map((match) => match[2]);
  const errors = [];
  for (const [index, script] of scripts.entries()) {
    try { new Function(script); }
    catch (error) { errors.push(`inline script ${index + 1}: ${error.message}`); }
  }
  return { count: scripts.length, errors };
}

let validation = null;
let validationError = null;
try {
  validation = validateAll(specDir);
} catch (error) {
  validationError = error;
}

check(
  'all_required_artifacts_and_contracts',
  validation !== null,
  validation
    ? `${validation.caseCount} cases across ${validation.rounds.length} rounds passed schema and semantic validation`
    : `${validationError?.message ?? 'validation failed'}: ${(validationError?.errors || []).slice(0, 5).map((entry) => entry.message || entry).join(' | ')}`,
);

if (validation) {
  const manifest = readJson(path.join(specDir, 'case-manifest-v2.json'));
  const reviewResults = readJson(path.join(specDir, 'review-results-v2.json'));
  const runDocuments = collectJsonFiles(path.join(specDir, 'runs')).map(readJson);
  const finalMetrics = validation.metrics.at(-1);
  const previousMetrics = validation.metrics.at(-2);
  const finalRoundId = finalMetrics.roundId;
  const finalValidationRound = validation.rounds.find((round) => round.roundId === finalRoundId);
  const finalPayloadResults = finalValidationRound?.results.flatMap((run) => run.outputResults) ?? [];
  const finalOutputs = runDocuments.filter((run) => run.roundId === finalRoundId).flatMap((run) => run.outputs);
  const finalReviewRound = reviewResults.rounds.find((round) => round.roundId === finalRoundId);
  const finalReviewIds = new Set(finalReviewRound.reviews.map((entry) => entry.reviewId));
  const finalAdjudications = new Map(finalReviewRound.adjudications.map((entry) => [entry.caseId, entry]));

  check('portfolio_contract', manifest.cases.length === 18, '18 frozen cases');
  check('round_contract', validation.rounds.length >= 2 && validation.rounds.length <= 4, `${validation.rounds.length} complete rounds`);
  check('schema_and_canonical_gate', finalOutputs.length === 18, `${finalOutputs.length}/18 final envelopes valid`);
  check('source_role_accounting_gate', finalMetrics.sourceRoleAccountingRate === 1, formatRate(finalMetrics.sourceRoleAccountingRate));
  check('unsupported_inference_gate', finalMetrics.unsupportedInferenceCount === 0, `${finalMetrics.unsupportedInferenceCount} unsupported inferences`);
  check('checkability_gate', finalMetrics.checkabilityPrecision >= 0.95, formatRate(finalMetrics.checkabilityPrecision));
  check('safety_checkability_gate', finalMetrics.safetyCheckabilityPrecision === 1, formatRate(finalMetrics.safetyCheckabilityPrecision));
  check('projection_retention_gate', finalMetrics.essentialProjectionRetentionRate === 1, formatRate(finalMetrics.essentialProjectionRetentionRate));
  check(
    'projection_payload_evidence_gate',
    finalPayloadResults.length === 18 && finalPayloadResults.every((entry) => entry.projectionPayloadEvidencePass && entry.projectionPayloadRetention.retentionRate === 1),
    `${finalPayloadResults.filter((entry) => entry.projectionPayloadEvidencePass && entry.projectionPayloadRetention.retentionRate === 1).length}/18 final envelopes retain actual payload semantics`,
  );
  check('taxonomy_gold_gate', finalMetrics.coreTaxonomyGoldMatchRate >= 0.9, formatRate(finalMetrics.coreTaxonomyGoldMatchRate));
  check('taxonomy_axis_gold_gates', Object.values(finalMetrics.axisGoldMatchRates).every((value) => value >= 0.9), Object.entries(finalMetrics.axisGoldMatchRates).map(([key, value]) => `${key} ${formatRate(value)}`).join(', '));
  check('three_way_agreement_gate', finalMetrics.threeWayExactMatchRate >= 0.85, formatRate(finalMetrics.threeWayExactMatchRate));
  check('gate_gold_contract', finalMetrics.gateGoldMatchRate === 1, `${formatRate(finalMetrics.gateGoldMatchRate)} deterministic contract match; not observed-user validation`);
  check('three_way_gate_agreement', finalMetrics.threeWayGateExactMatchRate >= 0.85, formatRate(finalMetrics.threeWayGateExactMatchRate));
  check('disposition_gate', finalMetrics.dispositionMatchRate === 1, formatRate(finalMetrics.dispositionMatchRate));
  check('item_keep_gate', finalMetrics.medianItemKeepRate >= 0.8, formatRate(finalMetrics.medianItemKeepRate));
  check('core_positive_edit_gate', finalMetrics.corePositiveCount === 8 && finalMetrics.corePositiveNoMinorCount >= 7, `${finalMetrics.corePositiveNoMinorCount}/${finalMetrics.corePositiveCount} no/minor edit`);
  check('ready_structure_gate', finalMetrics.readyMajorRegenerationCount === 0, `${finalMetrics.readyMajorRegenerationCount} ready cases need major regeneration`);
  check('correction_time_gate', finalMetrics.medianCorrectionMinutes !== null && finalMetrics.medianCorrectionMinutes <= 5 && finalMetrics.p75CorrectionMinutes !== null && finalMetrics.p75CorrectionMinutes <= 10, `measured-only median ${finalMetrics.medianCorrectionMinutes}m, p75 ${finalMetrics.p75CorrectionMinutes}m`);
  check(
    'two_measured_correction_batches',
    previousMetrics?.roundId === 'round-3' && finalMetrics.roundId === 'round-4' && previousMetrics.measuredCoreCorrectionCount === 8 && previousMetrics.measuredCorrectionCount >= 8 && finalMetrics.measuredCoreCorrectionCount === 8 && finalMetrics.measuredCorrectionCount >= 8,
    previousMetrics
      ? `${previousMetrics.roundId}: ${previousMetrics.measuredCoreCorrectionCount}/8 core, ${previousMetrics.measuredCorrectionCount}/18 total; ${finalMetrics.roundId}: ${finalMetrics.measuredCoreCorrectionCount}/8 core, ${finalMetrics.measuredCorrectionCount}/18 total`
      : 'fewer than two reviewed rounds',
  );
  check('blocking_disagreement_gate', finalMetrics.blockingDisagreementCount === 0, `${finalMetrics.blockingDisagreementCount} blocking disagreements`);
  check(
    'two_clean_control_batches',
    previousMetrics?.roundId === 'round-3' && finalMetrics.roundId === 'round-4' && previousMetrics.controlRegressionCount === 0 && finalMetrics.controlRegressionCount === 0,
    previousMetrics ? `${previousMetrics.roundId}: ${previousMetrics.controlRegressionCount}; ${finalMetrics.roundId}: ${finalMetrics.controlRegressionCount}` : 'fewer than two reviewed rounds',
  );

  const reviewLinksValid = finalOutputs.every((output) => {
    const ids = output.reviewEvidence.independentReviewIds;
    return output.reviewEvidence.validatorStatus === 'pass' && ids.length === 3 && ids.every((id) => finalReviewIds.has(id));
  });
  check('envelope_review_provenance', reviewLinksValid, `${finalOutputs.filter((output) => output.reviewEvidence.validatorStatus === 'pass').length}/18 validator-pass envelopes with three review IDs`);

  const correctionsReconcile = finalOutputs.every((output) => {
    const adjudication = finalAdjudications.get(output.caseId);
    const correction = output.reviewEvidence.correction;
    if (!adjudication) return false;
    const expectedKeepRate = adjudication.itemsGenerated === 0 ? null : adjudication.itemsKept / adjudication.itemsGenerated;
    return correction.editLevel === adjudication.editLevel && correction.minutes === adjudication.correctionMinutes && correction.itemKeepRate === expectedKeepRate;
  });
  check('correction_raw_reconciliation', correctionsReconcile, 'Envelope correction evidence matches raw adjudications');

  check(
    'evidence_boundary',
    /not observed-user validation/i.test(reviewResults.claimBoundary),
    reviewResults.claimBoundary,
  );

  if (fs.existsSync(auditFile)) {
    const html = fs.readFileSync(auditFile, 'utf8');
    const coreIds = manifest.cases.filter((entry) => ['core_positive', 'core_boundary'].includes(entry.lane)).map((entry) => entry.caseId);
    const allIds = manifest.cases.map((entry) => entry.caseId);
    const scripts = inlineScriptsParse(html);
    const localHrefs = [...html.matchAll(/\bhref=["']([^"']+)["']/gi)].map((match) => match[1]).filter((href) => !/^(?:https?:|mailto:|javascript:|#)/i.test(href));
    const missingLocalHrefs = localHrefs.filter((href) => !fs.existsSync(path.resolve(path.dirname(auditFile), href.split('#')[0])));
    check('html_core_shelf', coreIds.length === 12 && coreIds.every((caseId) => html.includes(caseId)), `${coreIds.filter((caseId) => html.includes(caseId)).length}/12 core cases rendered`);
    check('html_control_appendix', allIds.every((caseId) => html.includes(caseId)), `${allIds.filter((caseId) => html.includes(caseId)).length}/18 total cases referenced`);
    check('html_inline_script_parse', scripts.errors.length === 0, scripts.errors.length ? scripts.errors.join(' | ') : `${scripts.count} inline scripts parsed`);
    check('html_self_contained_assets', !/<script[^>]+src=["']https?:\/\//i.test(html) && !/<link[^>]+href=["']https?:\/\//i.test(html), 'No remote JavaScript, stylesheet, font or icon dependency');
    check('html_local_links', missingLocalHrefs.length === 0, missingLocalHrefs.length ? `Missing: ${missingLocalHrefs.join(', ')}` : `${localHrefs.length} local links resolve`);
    check('html_validation_disclaimer', /(not observed-user validation|사용자 검증(?:이|은)? 아님|사용자 검증이 아니다)/i.test(html), 'HTML separates automated QA from observed-user validation');
  } else {
    check('html_core_shelf', false, `Missing ${path.relative(root, auditFile).replaceAll('\\', '/')}`);
    check('html_control_appendix', false, 'HTML report is missing');
    check('html_inline_script_parse', false, 'HTML report is missing');
    check('html_self_contained_assets', false, 'HTML report is missing');
    check('html_local_links', false, 'HTML report is missing');
    check('html_validation_disclaimer', false, 'HTML report is missing');
  }
}

const summary = {
  verifierVersion: 'flowme-url-to-flow-output-quality-lab-verifier-v2',
  passed: checks.every((entry) => entry.passed),
  passedChecks: checks.filter((entry) => entry.passed).length,
  totalChecks: checks.length,
  checks,
};

if (wantsJson) console.log(JSON.stringify(summary, null, 2));
else {
  console.log(`Output Quality Lab v2 verifier: ${summary.passedChecks}/${summary.totalChecks} checks passed.`);
  for (const entry of checks) console.log(`${entry.passed ? 'PASS' : 'FAIL'} ${entry.name}: ${entry.evidence}`);
}

process.exit(summary.passed ? 0 : 1);
