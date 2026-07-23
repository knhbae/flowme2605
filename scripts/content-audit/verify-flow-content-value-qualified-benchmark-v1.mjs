import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  benchmarkCases as canonicalCases,
  candidatePool as canonicalCandidatePool,
  scoreWeights,
} from './flow-content-value-qualified-benchmark-v1-data.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const defaultSpecDir = path.join(repoRoot, 'docs/specs/2026-07-22-flow-content-value-qualified-benchmark-v1');
const defaultHtml = path.join(repoRoot, 'docs/content-audit/2026-07-22-flow-content-value-qualified-benchmark-v1-ko.html');
const SCHEMA_VERSION = 'flow-content-value-qualified-benchmark-v1';
const SCORE_KEYS = Object.keys(scoreWeights);
const ROLES = ['rules', 'low_cost', 'high_capability'];
const ARTIFACTS = new Set(['calendar', 'checklist', 'todo', 'sheet', 'memo']);
const STOP_STATUSES = new Set(['source_import_required', 'hold', 'blocked']);
const REQUIRED_GATE_KEYS = ['source', 'rights', 'locale', 'safety', 'privacy'];

const REQUIRED_JSON_FILES = [
  'candidate-pool-v1.json',
  'value-admission-contract-v1.json',
  'admission-scorecard-v1.json',
  'rejected-candidates-v1.json',
  'selected-positive-set-v1.json',
  'boundary-control-set-v1.json',
  'source-evidence-v1.json',
  'gold-source-contract-v1.json',
  'calibration-results-v1.json',
  'final-holdout-results-v1.json',
  'model-comparison-v1.json',
  'value-and-conversion-metrics-v1.json',
  'final-adjudication-v1.json',
  'seal-v1.json',
  'benchmark-v1.schema.json',
];

const REQUIRED_SUPPORT_FILES = [
  'baseline-rules-v1.md',
  'baseline-prompt-v1.md',
  'revised-rules-v1.md',
];

class BenchmarkValidationError extends Error {
  constructor(errors) {
    super(`Flow Content Value-Qualified Benchmark v1 validation failed (${errors.length}):\n- ${errors.join('\n- ')}`);
    this.name = 'BenchmarkValidationError';
    this.errors = errors;
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeRole(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['rule', 'rules', 'rule_based', 'rules_based'].includes(key)) return 'rules';
  if (['low', 'low_cost', 'lowcost', 'cheap'].includes(key)) return 'low_cost';
  if (['high', 'high_capability', 'highcapability', 'expensive'].includes(key)) return 'high_capability';
  return key;
}

function normalizeSplit(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (key === 'holdout' || key === 'final') return 'final_holdout';
  return key;
}

function firstArray(document, keys) {
  if (Array.isArray(document)) return document;
  if (!isRecord(document)) return [];
  for (const key of keys) {
    if (Array.isArray(document[key])) return document[key];
  }
  if (isRecord(document.data)) {
    for (const key of keys) {
      if (Array.isArray(document.data[key])) return document.data[key];
    }
  }
  return [];
}

function extractCandidates(document) {
  return firstArray(document, ['candidates', 'candidatePool', 'pool', 'scorecards', 'rows', 'records', 'entries']);
}

function extractCases(document) {
  return firstArray(document, ['cases', 'goldCases', 'contracts', 'positiveSet', 'boundarySet', 'records', 'entries']);
}

function extractEvidence(document) {
  const direct = firstArray(document, ['evidence', 'sourceEvidence', 'records', 'entries']);
  if (direct.length) return direct;
  const candidates = extractCandidates(document);
  return candidates.flatMap((candidate) => Array.isArray(candidate?.evidence) ? candidate.evidence : []);
}

function runValue(entry) {
  if (!isRecord(entry)) return entry;
  return entry.run || entry.result || entry.output || entry.conversion || entry;
}

function flattenRunDocument(document, inherited = {}) {
  const flattened = [];
  const visit = (node, context = {}) => {
    if (Array.isArray(node)) {
      for (const value of node) visit(value, context);
      return;
    }
    if (!isRecord(node)) return;

    const next = {
      role: normalizeRole(node.role || node.modelRole || node.processor?.role || context.role),
      split: normalizeSplit(node.split || node.phase || node.dataset || context.split),
      caseId: node.caseId || node.case?.caseId || context.caseId,
    };

    for (const key of ['roles', 'roleResults', 'resultsByRole']) {
      if (isRecord(node[key])) {
        for (const [role, value] of Object.entries(node[key])) {
          const raw = runValue(value);
          if (isRecord(raw)) flattened.push({ ...raw, caseId: raw.caseId || next.caseId, role: normalizeRole(raw.role || role), split: normalizeSplit(raw.split || raw.phase || next.split) });
        }
        return;
      }
    }

    if (node.caseId && (node.flowPossible !== undefined || node.items || node.canonical?.items || node.flow?.items)) {
      const raw = runValue(node);
      flattened.push({ ...raw, caseId: raw.caseId || next.caseId, role: normalizeRole(raw.role || next.role), split: normalizeSplit(raw.split || raw.phase || next.split) });
      return;
    }

    for (const role of ROLES) {
      const value = node[role] || node[role.replace('_', '-')];
      if (Array.isArray(value) || isRecord(value)) visit(value, { ...next, role });
    }

    for (const key of ['results', 'runs', 'cases', 'entries', 'records', 'conversions']) {
      if (Array.isArray(node[key])) visit(node[key], next);
    }
  };
  visit(document, inherited);
  return flattened;
}

function getItems(run) {
  const candidates = [run?.items, run?.allowedItems, run?.canonical?.items, run?.flow?.items, run?.output?.items];
  return candidates.find(Array.isArray) || [];
}

function getMinimumInputs(run) {
  const candidates = [run?.minimumInputs, run?.minimumUserInputs, run?.requiredInputs, run?.inputs?.required];
  return candidates.find(Array.isArray) || [];
}

function getPrimaryProjection(run) {
  return run?.primaryProjection ?? run?.primaryArtifact ?? run?.projection?.primary ?? null;
}

function getSecondaryProjections(run) {
  const value = run?.secondaryProjections ?? run?.secondaryArtifacts ?? run?.projection?.secondary;
  return Array.isArray(value) ? value : [];
}

function getSourceRefs(item) {
  const value = item?.sourceRowRefs ?? item?.sourceRefs ?? item?.provenance?.sourceRowRefs ?? item?.provenance?.sourceRefs;
  return Array.isArray(value) ? value : [];
}

function getGates(value) {
  return value?.gates || value?.reviewGates || value?.gate || {};
}

function getBoolean(value, keys) {
  for (const key of keys) {
    if (typeof value?.[key] === 'boolean') return value[key];
  }
  return undefined;
}

function hasExecutableProjection(value) {
  if (value === null || value === undefined || value === false) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  if (!isRecord(value)) return Boolean(value);
  if (value.enabled === false || value.provided === false || ['omitted', 'not_provided', 'forbidden', 'blocked'].includes(value.status) || ['omitted', 'not_provided', 'forbidden', 'blocked', 'conditional'].includes(value.availability)) return false;
  for (const key of ['events', 'items', 'rows', 'entries', 'tasks', 'records']) {
    if (Array.isArray(value[key])) return value[key].length > 0;
  }
  if (typeof value.ics === 'string') return value.ics.trim().length > 0;
  const contentKeys = Object.keys(value).filter((key) => !['reason', 'status', 'enabled', 'provided', 'note'].includes(key));
  return contentKeys.length > 0;
}

function calendarProjection(run) {
  return run?.projections?.calendar ?? run?.projections?.ics ?? run?.calendar ?? run?.ics ?? null;
}

function hasDateEvidence(value) {
  if (typeof value === 'string') return /DTSTART|\b20\d{2}-\d{2}-\d{2}\b|\b\d{4}\d{2}\d{2}T\d{6}\b/i.test(value);
  if (Array.isArray(value)) return value.length > 0 && value.every(hasDateEvidence);
  if (!isRecord(value)) return false;
  if (value.requiresInput === true || value.previewOnly === true) return true;
  if (['omitted', 'not_provided'].includes(value.status)) return true;
  if (value.date || value.start || value.startsAt || value.end || value.endsAt || value.due || value.dueAt || value.dateWindow || value.dtstart || value.DTSTART) return true;
  if (value.schedule) return hasDateEvidence(value.schedule);
  for (const key of ['events', 'items', 'entries']) {
    if (Array.isArray(value[key])) return value[key].length === 0 || value[key].every(hasDateEvidence);
  }
  if (typeof value.ics === 'string') return hasDateEvidence(value.ics);
  return !hasExecutableProjection(value);
}

function recursiveTruthyQuotaOverride(value, trail = '$') {
  const hits = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => hits.push(...recursiveTruthyQuotaOverride(entry, `${trail}[${index}]`)));
  } else if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) {
      const next = `${trail}.${key}`;
      const primitiveOverride = typeof entry === 'boolean' || typeof entry === 'number' || typeof entry === 'string';
      if (/quotaOverride/i.test(key) && primitiveOverride && entry !== false && entry !== 0 && entry !== '0' && entry !== 'false' && entry !== null && entry !== undefined) hits.push(next);
      hits.push(...recursiveTruthyQuotaOverride(entry, next));
    }
  }
  return hits;
}

function candidateId(value) {
  return value?.candidateId || value?.id;
}

function caseId(value) {
  return value?.caseId || value?.id;
}

function caseClass(value) {
  return value?.class || value?.goldClass || (value?.flowPossible === false ? 'boundary' : value?.flowPossible === true ? 'positive' : undefined);
}

function scorePoint(score) {
  if (typeof score === 'number') return score;
  return score?.points;
}

function scoreMax(score, fallback) {
  if (typeof score === 'number') return fallback;
  return score?.max;
}

function scoreComment(score) {
  return typeof score === 'number' ? '' : score?.comment;
}

function scoreEvidenceRefs(score) {
  return typeof score === 'number' ? [] : score?.evidenceRefs;
}

function hardGatesPass(candidate) {
  const gates = candidate?.hardGates || {};
  return ['source', 'rights', 'locale', 'safety', 'oneJob', 'naturalArtifact']
    .every((key) => String(gates[key] || '').startsWith('pass'));
}

function validateCandidatePool(pool, errors) {
  const ensure = (condition, message) => { if (!condition) errors.push(message); };
  ensure(pool.length === 40, `candidate pool must contain exactly 40 candidates; found ${pool.length}.`);
  const ids = pool.map(candidateId);
  ensure(ids.every(nonEmpty), 'every candidate must have a non-empty candidateId.');
  ensure(new Set(ids).size === ids.length, 'candidate IDs must be unique.');
  const urls = pool.map((candidate) => candidate.canonicalUrl);
  ensure(urls.every((url) => /^https?:\/\//.test(String(url))), 'every candidate must have an HTTP(S) canonicalUrl.');
  ensure(new Set(urls).size === urls.length, 'candidate canonical URLs must be unique.');

  for (const candidate of pool) {
    const id = candidateId(candidate) || '<missing-id>';
    const evidence = Array.isArray(candidate.evidence) ? candidate.evidence : [];
    const evidenceIds = new Set(evidence.map((entry) => entry.id));
    ensure(evidence.length >= 6, `${id}: at least six evidence records are required.`);
    ensure(evidence.every((entry) => nonEmpty(entry?.claim) && /^https?:\/\//.test(String(entry?.url || '')) && nonEmpty(entry?.observedAt)), `${id}: every evidence record needs claim, URL, and observedAt.`);
    const scores = candidate.scores || {};
    let total = 0;
    for (const key of SCORE_KEYS) {
      const score = scores[key];
      const points = scorePoint(score);
      const max = scoreMax(score, scoreWeights[key]);
      ensure(Number.isFinite(points) && points >= 0 && points <= scoreWeights[key], `${id}:${key} points must be between 0 and ${scoreWeights[key]}.`);
      ensure(max === scoreWeights[key], `${id}:${key} max must be ${scoreWeights[key]}; found ${max}.`);
      ensure(nonEmpty(scoreComment(score)), `${id}:${key} requires a source-grounded comment.`);
      const refs = scoreEvidenceRefs(score);
      ensure(Array.isArray(refs) && refs.length > 0, `${id}:${key} requires evidenceRefs.`);
      ensure((refs || []).every((ref) => evidenceIds.has(ref)), `${id}:${key} contains an unknown evidenceRef.`);
      total += Number.isFinite(points) ? points : 0;
    }
    ensure(total === candidate.computedTotal, `${id}: computedTotal ${candidate.computedTotal} does not equal score sum ${total}.`);
    const qualified = total >= 80 && hardGatesPass(candidate);
    ensure(candidate.qualified === qualified, `${id}: qualified must equal score>=80 AND all hard gates pass.`);
    ensure(isRecord(candidate.rights) && nonEmpty(candidate.rights.personalConversion) && nonEmpty(candidate.rights.publicCatalog), `${id}: personal conversion and public catalog rights must be recorded separately.`);
    const valueDeltaComplete = isRecord(candidate.valueDelta)
      && nonEmpty(candidate.valueDelta.sourceLinkOnlyLimit)
      && nonEmpty(candidate.valueDelta.persistentState)
      && nonEmpty(candidate.valueDelta.returnMoment);
    ensure(valueDeltaComplete, `${id}: link limitation, persistent state, and return moment are required even when a candidate is rejected.`);
    if (candidate.qualified || String(candidate.selection || '').startsWith('selected_')) {
      ensure(ARTIFACTS.has(candidate.valueDelta?.naturalArtifact), `${id}: a qualified candidate requires one canonical natural artifact.`);
    } else {
      ensure(candidate.valueDelta?.naturalArtifact == null || ARTIFACTS.has(candidate.valueDelta?.naturalArtifact), `${id}: naturalArtifact must be canonical or null.`);
    }
  }
}

function validateContract(contract, errors) {
  const weights = contract?.scoreWeights || contract?.weights || contract?.admission?.weights;
  if (!isRecord(weights)) {
    errors.push('value admission contract must declare scoreWeights.');
    return;
  }
  for (const key of SCORE_KEYS) {
    const value = typeof weights[key] === 'number' ? weights[key] : weights[key]?.max ?? weights[key]?.weight;
    if (value !== scoreWeights[key]) errors.push(`value admission contract weight ${key} must be ${scoreWeights[key]}; found ${value}.`);
  }
  const threshold = contract.positiveThreshold ?? contract.minimumScore ?? contract.threshold ?? contract.admission?.threshold;
  if (threshold !== 80) errors.push(`value admission positive threshold must be 80; found ${threshold}.`);
  const gates = contract.hardGates || contract.hardGateOrder || contract.admission?.hardGates || contract.gates;
  const gateNames = Array.isArray(gates) ? gates.map((entry) => typeof entry === 'string' ? entry : entry?.id || entry?.name) : Object.keys(gates || {});
  for (const required of ['source', 'rights', 'locale', 'safety', 'oneJob', 'naturalArtifact']) {
    if (!gateNames.includes(required)) errors.push(`value admission contract is missing hard gate ${required}.`);
  }
}

function selectedSplit(value) {
  const explicit = normalizeSplit(value?.split);
  if (explicit) return explicit;
  const selection = String(value?.selection || '');
  if (selection.includes('final')) return 'final_holdout';
  if (selection.includes('calibration')) return 'calibration';
  return '';
}

function validateSelection(pool, selected, boundary, gold, rejected, errors) {
  const ensure = (condition, message) => { if (!condition) errors.push(message); };
  const poolById = new Map(pool.map((candidate) => [candidateId(candidate), candidate]));
  const selectedIds = selected.map(candidateId);
  ensure(selected.length === 12, `selected positive set must contain exactly 12 candidates; found ${selected.length}.`);
  ensure(new Set(selectedIds).size === 12, 'selected positive candidate IDs must be unique.');
  ensure(selectedIds.every((id) => poolById.has(id)), 'every selected positive must exist in candidate pool.');

  const resolved = selected.map((entry) => poolById.get(candidateId(entry)) || entry);
  ensure(resolved.every((entry) => entry.computedTotal >= 80 && hardGatesPass(entry)), 'all selected positives must score at least 80 and pass every hard gate.');
  const calibration = selected.filter((entry) => selectedSplit(entry) === 'calibration');
  const holdout = selected.filter((entry) => selectedSplit(entry) === 'final_holdout');
  ensure(calibration.length === 8 && holdout.length === 4, `positive split must be calibration 8 + final holdout 4; found ${calibration.length}+${holdout.length}.`);
  const holdoutResolved = holdout.map((entry) => poolById.get(candidateId(entry)) || entry);
  ensure(holdoutResolved.every((entry) => String(entry.priorUse || '').startsWith('new_url_')), 'all four final holdout positives must be new URLs not used in prior conversion experiments.');

  ensure(boundary.length === 6, `boundary control set must contain exactly 6 cases; found ${boundary.length}.`);
  ensure(boundary.filter((entry) => normalizeSplit(entry.split) === 'calibration').length === 4, 'boundary calibration split must contain 4 cases.');
  ensure(boundary.filter((entry) => normalizeSplit(entry.split) === 'final_holdout').length === 2, 'boundary final holdout split must contain 2 cases.');
  for (const entry of boundary) {
    const id = caseId(entry) || candidateId(entry) || '<unknown-boundary>';
    ensure((caseClass(entry) || 'boundary') === 'boundary', `${id}: boundary entry must be labeled boundary.`);
    ensure(getItems(entry).length === 0, `${id}: boundary entry must not contain generated Items.`);
    ensure(getPrimaryProjection(entry) == null, `${id}: boundary entry must not declare a primary artifact/projection.`);
    ensure(STOP_STATUSES.has(entry.status), `${id}: boundary entry must stop with source_import_required, hold, or blocked.`);
  }

  ensure(gold.length === 18, `gold source contract must contain 18 cases; found ${gold.length}.`);
  const goldIds = gold.map(caseId);
  ensure(new Set(goldIds).size === 18, 'gold case IDs must be unique.');
  ensure(gold.filter((entry) => caseClass(entry) === 'positive' && normalizeSplit(entry.split) === 'calibration').length === 8, 'gold must contain 8 calibration positives.');
  ensure(gold.filter((entry) => caseClass(entry) === 'positive' && normalizeSplit(entry.split) === 'final_holdout').length === 4, 'gold must contain 4 final holdout positives.');
  ensure(gold.filter((entry) => caseClass(entry) === 'boundary' && normalizeSplit(entry.split) === 'calibration').length === 4, 'gold must contain 4 calibration boundaries.');
  ensure(gold.filter((entry) => caseClass(entry) === 'boundary' && normalizeSplit(entry.split) === 'final_holdout').length === 2, 'gold must contain 2 final holdout boundaries.');

  const canonicalById = new Map(canonicalCases.map((entry) => [entry.caseId, entry]));
  for (const entry of gold) {
    const id = caseId(entry);
    const expected = canonicalById.get(id);
    ensure(Boolean(expected), `${id}: gold case is not part of the frozen 18-case set.`);
    if (expected) {
      ensure(entry.candidateId === expected.candidateId, `${id}: candidateId differs from the frozen split.`);
      ensure(normalizeSplit(entry.split) === expected.split && caseClass(entry) === expected.class, `${id}: split/class differs from the frozen split.`);
    }
    ensure(Array.isArray(entry.minimumInputs) && entry.minimumInputs.length <= 2, `${id}: gold minimum inputs must be 0-2.`);
    const gates = getGates(entry);
    for (const key of REQUIRED_GATE_KEYS) ensure(nonEmpty(gates[key]), `${id}: gold gate ${key} is missing.`);
    ensure(typeof entry.publicReleaseAllowed === 'boolean' && typeof entry.privateConversionAllowed === 'boolean', `${id}: public release and private conversion must be separate booleans.`);
    if (caseClass(entry) === 'positive') {
      ensure(Array.isArray(entry.sourceRows) && entry.sourceRows.length > 0, `${id}: positive gold case requires SourceRows.`);
      ensure(ARTIFACTS.has(getPrimaryProjection(entry)), `${id}: positive gold case requires one natural primary artifact.`);
    } else {
      ensure(getItems(entry).length === 0, `${id}: boundary gold case must not contain generated Items.`);
      ensure(STOP_STATUSES.has(entry.status), `${id}: boundary gold case has a non-stop status.`);
      ensure(entry.publicReleaseAllowed === false && entry.privateConversionAllowed === false, `${id}: boundary gold case must not silently authorize conversion or publication.`);
    }
  }

  ensure(rejected.length === 28, `rejected-candidates artifact must contain the 28 non-selected pool records; found ${rejected.length}.`);
  const rejectedIds = rejected.map(candidateId);
  ensure(rejectedIds.every((id) => poolById.has(id) && !selectedIds.includes(id)), 'rejected candidates must be pool members outside the selected set.');
  ensure(rejected.every((entry) => nonEmpty(entry.rejectionReason || poolById.get(candidateId(entry))?.rejectionReason)), 'every rejected candidate needs a non-empty rejection reason.');
}

function validateRunResults(runs, gold, errors) {
  const ensure = (condition, message) => { if (!condition) errors.push(message); };
  const goldById = new Map(gold.map((entry) => [caseId(entry), entry]));
  const byKey = new Map();
  for (const run of runs) {
    const id = run.caseId;
    const role = normalizeRole(run.role);
    const split = normalizeSplit(run.split || goldById.get(id)?.split);
    if (!goldById.has(id) || !ROLES.includes(role)) continue;
    byKey.set(`${id}|${role}`, { ...run, role, split });
  }
  const uniqueRuns = [...byKey.values()];
  ensure(uniqueRuns.length === 54, `independent conversion coverage must be 18 cases x 3 roles = 54; found ${uniqueRuns.length}.`);
  for (const role of ROLES) ensure(uniqueRuns.filter((run) => run.role === role).length === 18, `${role} must cover all 18 cases.`);
  ensure(uniqueRuns.filter((run) => run.split === 'calibration').length === 36, 'calibration results must contain 12 cases x 3 roles = 36 runs.');
  ensure(uniqueRuns.filter((run) => run.split === 'final_holdout').length === 18, 'final holdout results must contain 6 cases x 3 roles = 18 runs.');

  const coveredByRole = Object.fromEntries(ROLES.map((role) => [role, { covered: new Set(), total: 0, artifactMatches: 0, positiveCount: 0, eligibilityMatches: 0 }]));
  for (const run of uniqueRuns) {
    const goldCase = goldById.get(run.caseId);
    const id = `${run.caseId}:${run.role}`;
    const items = getItems(run);
    const inputs = getMinimumInputs(run);
    const primary = getPrimaryProjection(run);
    const secondary = getSecondaryProjections(run);
    const gates = getGates(run);
    const publicAllowed = getBoolean(run, ['publicReleaseAllowed', 'publicAllowed']);
    const privateAllowed = getBoolean(run, ['privateConversionAllowed', 'privateAllowed']);

    ensure(typeof run.flowPossible === 'boolean', `${id}: flowPossible must be a boolean.`);
    ensure(Array.isArray(inputs) && inputs.length <= 2, `${id}: minimum inputs must contain 0-2 values.`);
    ensure(typeof publicAllowed === 'boolean' && typeof privateAllowed === 'boolean', `${id}: public release and private conversion must be separate booleans.`);
    for (const key of REQUIRED_GATE_KEYS) ensure(nonEmpty(gates[key]), `${id}: gate ${key} is missing.`);

    if (caseClass(goldCase) === 'boundary') {
      ensure(run.flowPossible === false, `${id}: boundary case must be rejected as a Flow.`);
      ensure(STOP_STATUSES.has(run.status), `${id}: boundary case must return a stop status.`);
      ensure(items.length === 0, `${id}: boundary case generated fake Items.`);
      ensure(primary == null, `${id}: boundary case must not select a primary projection.`);
      const projections = run.projections || {};
      for (const [projection, value] of Object.entries(projections)) ensure(!hasExecutableProjection(value), `${id}: boundary case generated executable ${projection} output.`);
      continue;
    }

    if (run.flowPossible === true) coveredByRole[run.role].eligibilityMatches += 1;
    ensure(run.flowPossible === true, `${id}: positive case should be Flow-capable.`);
    ensure(items.length > 0, `${id}: positive case must generate at least one Item.`);
    ensure(ARTIFACTS.has(primary), `${id}: positive run requires a canonical primary projection.`);
    coveredByRole[run.role].positiveCount += 1;
    if (primary === getPrimaryProjection(goldCase)) coveredByRole[run.role].artifactMatches += 1;
    ensure(!secondary.includes(primary), `${id}: primary projection must not be repeated in secondary projections.`);
    ensure(secondary.every((artifact) => ARTIFACTS.has(artifact)), `${id}: secondary projection contains a non-canonical artifact.`);
    ensure(inputs.length <= 2, `${id}: run asks for more than two required inputs.`);

    const rowIds = new Set((goldCase.sourceRows || []).map((row) => row.id));
    coveredByRole[run.role].total += rowIds.size;
    for (const [itemIndex, item] of items.entries()) {
      const refs = getSourceRefs(item);
      ensure(nonEmpty(item?.title) && nonEmpty(item?.detail), `${id}: Item ${itemIndex + 1} requires title and detail.`);
      ensure(item?.completion !== undefined && item?.completion !== null && String(item.completion).trim() !== '', `${id}: Item ${itemIndex + 1} requires an explicit completion contract.`);
      ensure(refs.length > 0, `${id}: Item ${itemIndex + 1} lacks SourceRow or explicit-user provenance.`);
      for (const ref of refs) {
        const valid = rowIds.has(ref) || String(ref).startsWith('user:');
        ensure(valid, `${id}: Item ${itemIndex + 1} references unknown provenance ${ref}.`);
        if (rowIds.has(ref)) coveredByRole[run.role].covered.add(`${run.caseId}|${ref}`);
      }
      const schedule = item?.schedule;
      if (schedule !== null && schedule !== undefined && schedule !== false) {
        const scheduleAllowed = getPrimaryProjection(goldCase) === 'calendar' || refs.some((ref) => {
          const row = (goldCase.sourceRows || []).find((entry) => entry.id === ref);
          return /date|deadline|schedule|weekday|window|period/i.test(String(row?.kind || ''));
        });
        ensure(scheduleAllowed, `${id}: Item ${itemIndex + 1} contains a schedule without source/user date authority.`);
      }
    }

    const calendar = calendarProjection(run);
    if (hasExecutableProjection(calendar)) {
      ensure(getPrimaryProjection(goldCase) === 'calendar' || goldCase.secondaryProjections?.includes('calendar') || goldCase.secondaryArtifacts?.includes('calendar'), `${id}: calendar/ICS was generated for a non-calendar case.`);
      const calendarRefsHaveDates = Array.isArray(calendar) && calendar.length > 0 && calendar.every((reference) => {
        if (isRecord(reference)) return hasDateEvidence(reference);
        const referencedItem = items.find((item) => [item.itemId, item.id].includes(reference));
        return referencedItem && hasDateEvidence(referencedItem.schedule);
      });
      ensure(hasDateEvidence(calendar) || calendarRefsHaveDates, `${id}: calendar/ICS output has no date, DTSTART, source-scheduled Item reference, or declared required date input.`);
    }
  }

  const artifactRates = [];
  for (const role of ROLES) {
    const stats = coveredByRole[role];
    const rate = stats.total ? stats.covered.size / stats.total : 0;
    ensure(rate >= 0.9, `${role}: aggregate SourceRow meaning-preservation coverage must be >=90%; found ${(rate * 100).toFixed(1)}%.`);
    const artifactRate = stats.positiveCount ? stats.artifactMatches / stats.positiveCount : 0;
    artifactRates.push({ role, rate: artifactRate });
  }
  const bestArtifact = artifactRates.sort((left, right) => right.rate - left.rate)[0];
  ensure(bestArtifact?.rate >= 0.85, `at least one executable role must reach >=85% primary artifact accuracy; best was ${bestArtifact?.role || 'none'} ${(100 * (bestArtifact?.rate || 0)).toFixed(1)}%. Other role rates remain comparison evidence, not silently rewritten.`);
  return uniqueRuns;
}

function extractAdjudications(document) {
  return firstArray(document, ['adjudications', 'cases', 'results', 'entries', 'records', 'decisions']);
}

function adjudicationDecision(entry) {
  return String(entry?.decision || entry?.verdict || entry?.finalDecision || entry?.outcome || entry?.finalStatus || '').trim().toLowerCase();
}

function validateAdjudication(document, gold, errors) {
  const ensure = (condition, message) => { if (!condition) errors.push(message); };
  const entries = extractAdjudications(document);
  ensure(entries.length === 18, `final adjudication must contain 18 case decisions; found ${entries.length}.`);
  const ids = entries.map(caseId);
  ensure(new Set(ids).size === entries.length, 'final adjudication case IDs must be unique.');
  const positiveIds = new Set(gold.filter((entry) => caseClass(entry) === 'positive').map(caseId));
  const positive = entries.filter((entry) => positiveIds.has(caseId(entry)));
  const acceptable = positive.filter((entry) => {
    const decision = adjudicationDecision(entry);
    const severity = String(entry.modifySeverity || entry.severity || '').toLowerCase();
    return decision === 'go' || decision.includes('minor_modify') || (decision === 'modify' && !['major', 'substantial'].includes(severity));
  });
  ensure(positive.length === 12, 'final adjudication must cover all 12 positive cases.');
  ensure(acceptable.length >= 10, `at least 10/12 positives must be Go or minor Modify; found ${acceptable.length}/12.`);
  const boundaryIds = new Set(gold.filter((entry) => caseClass(entry) === 'boundary').map(caseId));
  for (const entry of entries.filter((value) => boundaryIds.has(caseId(value)))) {
    const decision = adjudicationDecision(entry);
    ensure(STOP_STATUSES.has(decision) || decision === 'hold' || decision === 'blocked', `${caseId(entry)}: boundary adjudication must remain a stop decision.`);
  }
}

function normalizeHashEntries(seal) {
  const hashes = seal?.hashes;
  if (Array.isArray(hashes)) return hashes.map((entry) => ({ path: entry.path || entry.file, sha256: entry.sha256 || entry.hash }));
  if (isRecord(hashes)) {
    return Object.entries(hashes).map(([key, value]) => {
      if (typeof value === 'string') return { path: key, sha256: value };
      return { path: value?.path || value?.file || key, sha256: value?.sha256 || value?.hash };
    });
  }
  return Object.entries(seal || {})
    .filter(([key, value]) => /Hash$/.test(key) && value !== null && value !== undefined)
    .map(([key, value]) => ({ path: key, sha256: value, logical: true }));
}

function resolveSealedPath(filePath, specDir) {
  if (!nonEmpty(filePath)) return null;
  if (path.isAbsolute(filePath)) return filePath;
  const repoCandidate = path.resolve(repoRoot, filePath);
  if (fs.existsSync(repoCandidate)) return repoCandidate;
  return path.resolve(specDir, filePath);
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sha256Value(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return crypto.createHash('sha256').update(text).digest('hex');
}

function expectedLogicalHashes(specDir, seal = {}) {
  const read = (name) => loadJson(path.join(specDir, name));
  const readText = (name) => fs.readFileSync(path.join(specDir, name), 'utf8');
  const contract = read('value-admission-contract-v1.json');
  const pool = read('candidate-pool-v1.json');
  const evidence = read('source-evidence-v1.json');
  const calibrationPacket = read('blind-calibration-packet-v1.json');
  const finalPacket = read('blind-final-holdout-packet-v1.json');
  const split = canonicalCases.map(({ caseId: id, candidateId: candidate, split: set, class: caseType }) => ({ caseId: id, candidateId: candidate, split: set, class: caseType }));
  const expected = {
    rubricHash: sha256Value(contract),
    hardGateContractHash: sha256Value(contract.hardGateOrder || contract.hardGates),
    candidatePoolHash: sha256Value(extractCandidates(pool)),
    sourceEvidencePacketHash: sha256Value(extractEvidence(evidence)),
    splitHash: sha256Value(split),
    blindCalibrationPacketHash: sha256Value(extractCases(calibrationPacket)),
    blindFinalHoldoutPacketHash: sha256Value(extractCases(finalPacket)),
    baselineRulesHash: sha256Value(readText('baseline-rules-v1.md')),
    baselinePromptHash: sha256Value(readText('baseline-prompt-v1.md')),
  };
  const revisedPath = path.join(specDir, 'revised-rules-v1.md');
  if (fs.existsSync(revisedPath)) expected.revisedRulesHash = sha256Value(readText('revised-rules-v1.md'));
  if (seal.goldContractHash) expected.goldContractHash = sha256Value(extractCases(read('gold-source-contract-v1.json')));
  if (seal.correctionLogHash) {
    const correctionPath = resolveSealedPath(seal.correctionLogPath || 'holdout-correction-log-v1.json', specDir);
    expected.correctionLogHash = sha256Value(loadJson(correctionPath));
  }
  return expected;
}

function validateSeal(seal, specDir, errors, { verifyFiles = true } = {}) {
  const ensure = (condition, message) => { if (!condition) errors.push(message); };
  const entries = normalizeHashEntries(seal);
  ensure(entries.length >= 5, `seal must contain at least five frozen file hashes; found ${entries.length}.`);
  ensure(seal?.postHoldoutMutationCount === 0, `seal postHoldoutMutationCount must be 0; found ${seal?.postHoldoutMutationCount}.`);
  const logicalSeal = !seal?.hashes && entries.some((entry) => entry.logical);
  for (const entry of entries) {
    ensure(nonEmpty(entry.path), 'every seal hash needs a path.');
    ensure(/^[a-f0-9]{64}$/i.test(String(entry.sha256 || '')), `seal hash for ${entry.path || '<missing-path>'} is not SHA-256.`);
    if (!verifyFiles || logicalSeal || !nonEmpty(entry.path)) continue;
    const resolved = resolveSealedPath(entry.path, specDir);
    ensure(fs.existsSync(resolved), `sealed file does not exist: ${entry.path}.`);
    if (fs.existsSync(resolved) && /^[a-f0-9]{64}$/i.test(String(entry.sha256 || ''))) {
      ensure(sha256File(resolved) === entry.sha256.toLowerCase(), `sealed file changed after freeze: ${entry.path}.`);
    }
  }
  if (logicalSeal && verifyFiles) {
    let expected = {};
    try {
      expected = expectedLogicalHashes(specDir, seal);
    } catch (error) {
      errors.push(`cannot reconstruct logical seal hashes: ${error.message}`);
    }
    for (const [key, digest] of Object.entries(expected)) {
      ensure(nonEmpty(seal[key]), `seal is missing ${key}.`);
      if (nonEmpty(seal[key])) ensure(seal[key].toLowerCase() === digest, `sealed logical artifact changed after freeze: ${key}.`);
    }
    ensure(nonEmpty(seal.finalHoldoutOpenedAt), 'complete benchmark seal must record finalHoldoutOpenedAt.');
  }
}

function resolveDeclaredPath(filePath, specDir) {
  if (!nonEmpty(filePath)) return null;
  if (path.isAbsolute(filePath)) return filePath;
  const fromRepo = path.resolve(repoRoot, filePath);
  if (fs.existsSync(fromRepo)) return fromRepo;
  return path.resolve(specDir, filePath);
}

function booleanMarker(document, key) {
  if (typeof document?.[key] === 'boolean') return document[key];
  if (Array.isArray(document?.cases) && document.cases.length && document.cases.every((entry) => typeof entry?.[key] === 'boolean')) {
    const values = new Set(document.cases.map((entry) => entry[key]));
    if (values.size === 1) return [...values][0];
  }
  return undefined;
}

function attemptMarker(document) {
  if (Number.isInteger(document?.attempt)) return document.attempt;
  if (Array.isArray(document?.cases) && document.cases.length) {
    const attempts = new Set(document.cases.map((entry) => entry.attempt).filter(Number.isInteger));
    if (attempts.size === 1) return [...attempts][0];
  }
  return undefined;
}

function validateCorrectionProtocol(seal, specDir, errors) {
  const ensure = (condition, message) => { if (!condition) errors.push(message); };
  const unscoredCount = seal?.unscoredAttemptCount ?? 0;
  if (unscoredCount === 0) {
    if (seal?.scoredHoldoutAttempt !== undefined) ensure(seal.scoredHoldoutAttempt === 1, 'a clean holdout without archived attempts must use scoredHoldoutAttempt 1.');
    return;
  }

  ensure(unscoredCount === 1, `exactly one invalidated, unscored holdout attempt is allowed for this documented correction; found ${unscoredCount}.`);
  ensure(seal.scoredHoldoutAttempt === 2, `corrected holdout must declare scoredHoldoutAttempt 2; found ${seal.scoredHoldoutAttempt}.`);
  ensure(seal.postHoldoutMutationCount === 0, 'postHoldoutMutationCount must be 0 after the correction is re-sealed and before scored attempt 2.');
  ensure(nonEmpty(seal.resealedAt || seal.correctedAndResealedAt || seal.finalHoldoutOpenedAt), 'corrected holdout seal must record a re-seal/re-open timestamp.');
  ensure(nonEmpty(seal.goldContractHash), 'corrected holdout seal must include goldContractHash.');
  ensure(nonEmpty(seal.correctionLogHash), 'corrected holdout seal must include correctionLogHash.');

  const correctionPath = resolveDeclaredPath(seal.correctionLogPath || 'holdout-correction-log-v1.json', specDir);
  ensure(Boolean(correctionPath) && fs.existsSync(correctionPath), `holdout correction log does not exist: ${seal.correctionLogPath || 'holdout-correction-log-v1.json'}.`);
  let correction = null;
  if (correctionPath && fs.existsSync(correctionPath)) {
    try {
      correction = loadJson(correctionPath);
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (correction) {
    const correctionRecords = Array.isArray(correction.corrections) ? correction.corrections : [correction];
    const affected = correction.affectedCaseIds || correction.affectedCases || correctionRecords.flatMap((entry) => entry.affectedCaseIds || entry.affectedCases || [entry.affectedCaseId].filter(Boolean));
    ensure(Array.isArray(affected) && affected.includes('VQ-11'), 'correction log must identify VQ-11 as the affected case.');
    ensure(correctionRecords.some((entry) => nonEmpty(entry.reason || entry.error || entry.summary || entry.issue)), 'correction log requires a reason/summary/issue.');
    const correctionText = JSON.stringify(correction);
    ensure(/(?:VQ11-)?R03/.test(correctionText) && /(?:VQ11-)?R04/.test(correctionText), 'correction log must state the incorrect R03 binding and corrected R04 binding.');
    ensure(correction.attempt1Scored === false || correction.unscoredAttempt === 1 || correction.invalidatedAttempt === 1 || /attempt-1.{0,20}unscored|unscored.{0,20}attempt-1/i.test(correctionText), 'correction log must explicitly mark attempt 1 as unscored/invalidated.');
    for (const [key, expected] of [
      ['sourceRowsChanged', false],
      ['blindPacketChanged', false],
      ['baselineRulesChanged', false],
      ['admissionOrSplitChanged', false],
    ]) {
      const values = correctionRecords.map((entry) => entry[key]).filter((value) => value !== undefined);
      for (const value of values) ensure(value === expected, `correction log ${key} must be ${expected}.`);
    }
    for (const alias of ['rulesChanged', 'candidateSetChanged', 'splitChanged']) {
      const values = correctionRecords.map((entry) => entry[alias]).filter((value) => value !== undefined);
      for (const value of values) ensure(value === false, `correction log ${alias} must be false.`);
    }
  }

  const archivePaths = seal.unscoredAttemptArchivePaths || correction?.archivePaths || correction?.unscoredAttemptArchivePaths || [];
  ensure(Array.isArray(archivePaths) && archivePaths.length >= 3, `correction protocol must archive all three role outputs from unscored attempt 1; found ${archivePaths?.length ?? 0} archived path(s).`);
  const archivedRoles = new Set();
  for (const declared of archivePaths || []) {
    const archivePath = resolveDeclaredPath(typeof declared === 'string' ? declared : declared.path, specDir);
    ensure(Boolean(archivePath) && fs.existsSync(archivePath), `unscored attempt archive is missing: ${typeof declared === 'string' ? declared : declared.path}.`);
    if (!archivePath || !fs.existsSync(archivePath)) continue;
    let document;
    try {
      document = loadJson(archivePath);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    const role = normalizeRole(document.role || (typeof declared === 'object' ? declared.role : ''));
    if (!ROLES.includes(role)) continue;
    archivedRoles.add(role);
    ensure(Array.isArray(document.cases) && document.cases.length === 6, `${archivePath}: archived attempt 1 must contain six holdout cases.`);
    const attempt = attemptMarker(document);
    const scored = booleanMarker(document, 'scored');
    const archivePathLabel = /attempt-1-unscored|unscored-attempt-1|archive[\\/]attempt-1/i.test(archivePath);
    ensure(attempt === 1 || document.attemptLabel === 'unscored_attempt_1' || archivePathLabel, `${archivePath}: archive must be labeled attempt 1.`);
    ensure(scored === false || document.scored === false || archivePathLabel, `${archivePath}: archived attempt 1 must be explicitly unscored.`);
  }
  for (const role of ROLES) ensure(archivedRoles.has(role), `unscored attempt archive is missing role ${role}.`);

  const activePaths = seal.scoredHoldoutRunPaths || ROLES.map((role) => `runs/${role.replace('_', '-')}/final-holdout-v1.json`);
  ensure(Array.isArray(activePaths) && activePaths.length === 3, 'scored attempt 2 must declare exactly three active role output paths.');
  const activeRoles = new Set();
  for (const declared of activePaths || []) {
    const activePath = resolveDeclaredPath(typeof declared === 'string' ? declared : declared.path, specDir);
    ensure(Boolean(activePath) && fs.existsSync(activePath), `scored attempt 2 output is missing: ${typeof declared === 'string' ? declared : declared.path}.`);
    if (!activePath || !fs.existsSync(activePath)) continue;
    let document;
    try {
      document = loadJson(activePath);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    const role = normalizeRole(document.role || (typeof declared === 'object' ? declared.role : ''));
    activeRoles.add(role);
    ensure(Array.isArray(document.cases) && document.cases.length === 6, `${activePath}: scored attempt 2 must contain six holdout cases.`);
    ensure(attemptMarker(document) === 2, `${activePath}: active holdout output must be labeled attempt 2.`);
    ensure(document.scored === true || booleanMarker(document, 'scored') === true, `${activePath}: active holdout output must be explicitly scored.`);
    const independence = String(document.independence || document.independenceStatement || '');
    if (role === 'rules') {
      ensure(nonEmpty(independence) && /no gold|gold.{0,12}(?:not|without)|no other role|other role.{0,12}(?:not|without)/i.test(independence), `${activePath}: deterministic rules attempt 2 must state that gold/other role outputs were not used.`);
    } else {
      ensure(nonEmpty(independence) && /fresh|new agent|attempt.?2|rerun/i.test(independence), `${activePath}: model-role attempt 2 needs a fresh-agent/rerun independence statement.`);
    }
    ensure(document.priorAttemptOutputsConsulted !== true && !/consulted attempt.?1|used attempt.?1 output/i.test(independence), `${activePath}: attempt 2 may not consult attempt 1 outputs.`);
    const holdoutIds = new Set(canonicalCases.filter((entry) => entry.split === 'final_holdout').map((entry) => entry.caseId));
    ensure(document.cases.every((entry) => holdoutIds.has(entry.caseId)), `${activePath}: attempt 2 contains a non-holdout case.`);
  }
  for (const role of ROLES) ensure(activeRoles.has(role), `scored attempt 2 is missing role ${role}.`);
}

function validateSchemaDocument(schema, errors) {
  if (schema?.$schema !== 'https://json-schema.org/draft/2020-12/schema') errors.push('benchmark schema must use JSON Schema draft 2020-12.');
  for (const name of ['candidate', 'benchmarkCase', 'runResult', 'sealArtifact']) {
    if (!schema?.$defs?.[name]) errors.push(`benchmark schema is missing $defs.${name}.`);
  }
}

function validateHtml(html, errors) {
  const ensure = (condition, message) => { if (!condition) errors.push(message); };
  ensure(typeof html === 'string' && html.length > 1000, 'Korean review HTML is missing or too small to be a complete report.');
  for (const entry of canonicalCases) ensure(html.includes(entry.caseId), `HTML report does not expose case ${entry.caseId}.`);
  ensure(/@media/i.test(html) && /390|844/.test(html), 'HTML report must include mobile-responsive styling for the 390x844 review target.');
  ensure(/900px|1440/.test(html), 'HTML report must include the 1440x900 review baseline.');
  ensure(!/\b(?:TODO|TBD|PLACEHOLDER)\b/.test(html), 'HTML report contains an unfinished placeholder marker.');
  ensure(/observed[- ]user|관찰 사용자|실사용자 검증|실제 사용자 검증(?:이 아니다| 아님)|사용자 검증이 아님/i.test(html), 'HTML report must state that automated/agent QA is not observed-user validation.');
}

function versionOf(document) {
  return document?.schemaVersion || document?.benchmark?.schemaVersion || document?.meta?.schemaVersion;
}

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot parse JSON ${filePath}: ${error.message}`);
  }
}

function loadRunDocuments(specDir) {
  const runDir = path.join(specDir, 'runs');
  if (!fs.existsSync(runDir)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.json')) files.push(fullPath);
    }
  };
  visit(runDir);
  return files.map((filePath) => ({ filePath, document: loadJson(filePath) }));
}

function assertRequiredFiles(specDir, htmlPath) {
  const missing = [];
  for (const fileName of [...REQUIRED_JSON_FILES, ...REQUIRED_SUPPORT_FILES]) {
    const filePath = path.join(specDir, fileName);
    if (!fs.existsSync(filePath)) missing.push(filePath);
  }
  if (!fs.existsSync(htmlPath)) missing.push(htmlPath);
  if (missing.length) {
    throw new BenchmarkValidationError([
      `benchmark generation is incomplete; ${missing.length} required output(s) are missing`,
      ...missing.map((filePath) => `missing: ${filePath}`),
    ]);
  }
}

function artifact(document, aliases) {
  for (const name of aliases) if (document[name]) return document[name];
  return undefined;
}

export function validateArtifactSet(documents, options = {}) {
  const errors = [];
  const specDir = options.specDir || defaultSpecDir;
  const poolDoc = artifact(documents, ['candidate-pool-v1.json', 'candidatePool']);
  const contract = artifact(documents, ['value-admission-contract-v1.json', 'admissionContract']);
  const scorecard = artifact(documents, ['admission-scorecard-v1.json', 'scorecard']);
  const rejectedDoc = artifact(documents, ['rejected-candidates-v1.json', 'rejected']);
  const selectedDoc = artifact(documents, ['selected-positive-set-v1.json', 'selected']);
  const boundaryDoc = artifact(documents, ['boundary-control-set-v1.json', 'boundary']);
  const evidenceDoc = artifact(documents, ['source-evidence-v1.json', 'evidence']);
  const goldDoc = artifact(documents, ['gold-source-contract-v1.json', 'gold']);
  const calibrationDoc = artifact(documents, ['calibration-results-v1.json', 'calibration']);
  const finalDoc = artifact(documents, ['final-holdout-results-v1.json', 'finalHoldout']);
  const comparisonDoc = artifact(documents, ['model-comparison-v1.json', 'modelComparison']);
  const metricsDoc = artifact(documents, ['value-and-conversion-metrics-v1.json', 'metrics']);
  const adjudicationDoc = artifact(documents, ['final-adjudication-v1.json', 'adjudication']);
  const seal = artifact(documents, ['seal-v1.json', 'seal']);
  const schema = artifact(documents, ['benchmark-v1.schema.json', 'schema']);

  const named = {
    poolDoc, contract, scorecard, rejectedDoc, selectedDoc, boundaryDoc, evidenceDoc, goldDoc,
    calibrationDoc, finalDoc, comparisonDoc, metricsDoc, adjudicationDoc, seal, schema,
  };
  for (const [name, value] of Object.entries(named)) if (!value) errors.push(`missing in-memory artifact: ${name}.`);
  if (errors.length) throw new BenchmarkValidationError(errors);

  const acceptedVersions = {
    poolDoc: new Set([SCHEMA_VERSION]),
    contract: new Set([SCHEMA_VERSION, 'flow-content-value-admission-v1']),
    seal: new Set([SCHEMA_VERSION, 'value-qualified-benchmark-seal-v1']),
  };
  for (const [name, value] of Object.entries(named)) {
    if (name === 'schema') continue;
    const version = versionOf(value);
    if (version && acceptedVersions[name] && !acceptedVersions[name].has(version)) {
      errors.push(`${name} has an unsupported schemaVersion: ${version}.`);
    }
  }

  const pool = extractCandidates(poolDoc);
  const scorecards = extractCandidates(scorecard);
  const selected = extractCandidates(selectedDoc).length ? extractCandidates(selectedDoc) : extractCases(selectedDoc);
  const boundary = extractCases(boundaryDoc);
  const evidence = extractEvidence(evidenceDoc);
  const gold = extractCases(goldDoc);
  const rejected = extractCandidates(rejectedDoc).length ? extractCandidates(rejectedDoc) : extractCases(rejectedDoc);

  validateCandidatePool(pool, errors);
  validateContract(contract, errors);
  if (scorecards.length !== 40) errors.push(`admission scorecard must cover all 40 candidates; found ${scorecards.length}.`);
  const poolIds = new Set(pool.map(candidateId));
  if (scorecards.some((entry) => !poolIds.has(candidateId(entry)))) errors.push('admission scorecard contains an unknown candidate ID.');
  const allEvidenceIds = new Set(pool.flatMap((candidate) => (candidate.evidence || []).map((entry) => entry.id)));
  if (evidence.length !== allEvidenceIds.size) errors.push(`source evidence artifact must contain all ${allEvidenceIds.size} evidence rows exactly once; found ${evidence.length}.`);
  if (evidence.some((entry) => !allEvidenceIds.has(entry.id))) errors.push('source evidence artifact contains an unknown evidence ID.');
  validateSelection(pool, selected, boundary, gold, rejected, errors);

  const quotaHits = recursiveTruthyQuotaOverride(documents);
  if (quotaHits.length) errors.push(`quota overrides are forbidden; truthy override found at ${quotaHits.join(', ')}.`);

  const extraRunDocuments = Array.isArray(options.extraRunDocuments) ? options.extraRunDocuments : [];
  const runs = [calibrationDoc, finalDoc, ...extraRunDocuments].flatMap((document) => flattenRunDocument(document));
  const uniqueRuns = validateRunResults(runs, gold, errors);
  validateAdjudication(adjudicationDoc, gold, errors);
  validateSeal(seal, specDir, errors, { verifyFiles: options.verifySealFiles !== false });
  if (options.verifyCorrectionProtocol !== false) validateCorrectionProtocol(seal, specDir, errors);
  validateSchemaDocument(schema, errors);

  const comparisonRoles = new Set(flattenRunDocument(comparisonDoc).map((run) => normalizeRole(run.role)).filter(Boolean));
  const declaredRoles = comparisonDoc.roles || comparisonDoc.comparedRoles || comparisonDoc.models;
  if (Array.isArray(declaredRoles)) declaredRoles.forEach((role) => comparisonRoles.add(normalizeRole(typeof role === 'string' ? role : role.role || role.id)));
  for (const container of [comparisonDoc.byRole, comparisonDoc.byRoleFinal]) {
    if (isRecord(container)) Object.keys(container).forEach((role) => comparisonRoles.add(normalizeRole(role)));
  }
  for (const role of ROLES) if (!comparisonRoles.has(role)) errors.push(`model comparison must include ${role}.`);

  const metricText = JSON.stringify(metricsDoc);
  for (const name of ['boundary', 'provenance', 'artifact', 'sourceRow']) {
    if (!new RegExp(name, 'i').test(metricText)) errors.push(`metrics artifact must expose a ${name} metric.`);
  }
  if (/"observedUserValidation"\s*:\s*true/i.test(metricText)) errors.push('automated benchmark metrics must not claim observed-user validation.');

  if (options.html !== undefined) validateHtml(options.html, errors);
  if (errors.length) throw new BenchmarkValidationError(errors);

  return {
    candidateCount: pool.length,
    positiveCount: selected.length,
    boundaryCount: boundary.length,
    runCount: uniqueRuns.length,
    evidenceCount: evidence.length,
    quotaOverrideCount: quotaHits.length,
    postHoldoutMutationCount: seal.postHoldoutMutationCount,
  };
}

export function validateBenchmark({ specDir = defaultSpecDir, htmlPath = defaultHtml } = {}) {
  assertRequiredFiles(specDir, htmlPath);
  const documents = Object.fromEntries(REQUIRED_JSON_FILES.map((fileName) => [fileName, loadJson(path.join(specDir, fileName))]));
  const runDocuments = loadRunDocuments(specDir)
    .filter((entry) => !/(?:^|[\\/])(?:archive|unscored|attempt-1)(?:[\\/]|$)/i.test(entry.filePath))
    .map((entry) => entry.document);
  const html = fs.readFileSync(htmlPath, 'utf8');
  return validateArtifactSet(documents, { specDir, html, extraRunDocuments: runDocuments, verifySealFiles: true });
}

function parseArgs(argv) {
  const options = { specDir: defaultSpecDir, htmlPath: defaultHtml };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--spec-dir') options.specDir = path.resolve(argv[++index]);
    else if (argument === '--html') options.htmlPath = path.resolve(argv[++index]);
    else if (argument === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log('Usage: node scripts/content-audit/verify-flow-content-value-qualified-benchmark-v1.mjs [--spec-dir <dir>] [--html <report.html>]');
    return;
  }
  const result = validateBenchmark(options);
  console.log(`PASS value-qualified benchmark: ${result.candidateCount} candidates, ${result.positiveCount} positives, ${result.boundaryCount} boundaries, ${result.runCount} independent runs, ${result.evidenceCount} evidence rows, quota overrides ${result.quotaOverrideCount}, post-holdout mutations ${result.postHoldoutMutationCount}.`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    runCli();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

export {
  BenchmarkValidationError,
  REQUIRED_JSON_FILES,
  defaultHtml,
  defaultSpecDir,
  flattenRunDocument,
  normalizeHashEntries,
  recursiveTruthyQuotaOverride,
  validateCandidatePool,
  validateCorrectionProtocol,
  validateRunResults,
  validateSeal,
};
