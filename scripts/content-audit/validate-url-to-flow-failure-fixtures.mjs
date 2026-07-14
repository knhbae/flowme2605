import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturePath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(
      repoRoot,
      'docs/specs/2026-07-12-url-to-flow-backend-readiness/failure-state-golden-fixtures-v1.json',
    );

const fail = (message) => {
  throw new Error(message);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};
const unique = (values) => new Set(values).size === values.length;
const sameSet = (left, right) =>
  left.length === right.length && left.every((value) => right.includes(value));

const document = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const { contract, fixtures } = document;

assert(document.schemaVersion === 'flowme.failure-state-fixtures.v1', 'Unexpected schemaVersion');
assert(contract && typeof contract === 'object', 'contract is required');
assert(Array.isArray(fixtures), 'fixtures must be an array');
assert(fixtures.length === 8, `Expected 8 fixtures, received ${fixtures.length}`);

const expectedByCase = {
  missing_source_rows: {
    status: 'failed',
    phase: 'extract',
    outcome: 'no_proposal',
    readiness: 'source_import_required',
    errorCode: 'source_rows_missing',
    canonicalDisposition: 'none',
    reviewRequired: false,
    saveAllowed: false,
  },
  locale_mismatch_sensitive: {
    status: 'failed',
    phase: 'validate',
    outcome: 'no_proposal',
    readiness: 'hold',
    errorCode: 'locale_applicability_unverified',
    canonicalDisposition: 'none',
    reviewRequired: true,
    saveAllowed: false,
  },
  unreadable_or_paywalled: {
    status: 'failed',
    phase: 'extract',
    outcome: 'no_proposal',
    readiness: 'source_import_required',
    errorCode: 'source_unreadable_or_paywalled',
    canonicalDisposition: 'none',
    reviewRequired: false,
    saveAllowed: false,
  },
  no_executable_user_job: {
    status: 'failed',
    phase: 'validate',
    outcome: 'rejected',
    readiness: null,
    errorCode: 'no_executable_user_job',
    canonicalDisposition: 'none',
    reviewRequired: false,
    saveAllowed: false,
  },
  multiple_primary_sources: {
    status: 'failed',
    phase: 'validate',
    outcome: 'no_proposal',
    readiness: 'hold',
    errorCode: 'multiple_primary_sources',
    canonicalDisposition: 'none',
    reviewRequired: true,
    saveAllowed: false,
  },
  invented_action: {
    status: 'failed',
    phase: 'validate',
    outcome: 'no_proposal',
    readiness: 'hold',
    errorCode: 'invented_action',
    canonicalDisposition: 'none',
    reviewRequired: false,
    saveAllowed: false,
  },
  invented_schedule_ics: {
    status: 'partial',
    phase: 'validate',
    outcome: 'partial',
    readiness: 'hold',
    errorCode: 'invented_schedule',
    canonicalDisposition: 'sanitized_partial',
    reviewRequired: true,
    saveAllowed: true,
  },
  runtime_fetch_timeout: {
    status: 'failed',
    phase: 'fetch',
    outcome: 'no_proposal',
    readiness: null,
    errorCode: 'fetch_timeout',
    canonicalDisposition: 'not_evaluated',
    reviewRequired: false,
    saveAllowed: false,
  },
};

const allowedOutcomes = new Set(['complete', 'partial', 'no_proposal', 'rejected', 'cancelled']);

assert(
  sameSet(contract.normalizedOutcomes, [...allowedOutcomes]),
  'contract.normalizedOutcomes must match the integrated outcome enum',
);

assert(
  sameSet(contract.requiredCases, Object.keys(expectedByCase)),
  'contract.requiredCases does not match validator coverage',
);
assert(
  sameSet(
    fixtures.map((fixture) => fixture.caseKey),
    contract.requiredCases,
  ),
  'Fixtures must cover every required case exactly once',
);
assert(unique(fixtures.map((fixture) => fixture.id)), 'Fixture IDs must be unique');
assert(unique(fixtures.map((fixture) => fixture.caseKey)), 'caseKey values must be unique');
assert(
  contract.globalRules.noProjectionBeforeReviewedSave &&
    contract.globalRules.noAutomaticRetry &&
    contract.globalRules.noAutomaticSave &&
    contract.globalRules.failedAttemptIsImmutable &&
    contract.globalRules.preserveSubmittedInput,
  'All global safety rules must be enabled',
);

for (const fixture of fixtures) {
  const prefix = `${fixture.id}/${fixture.caseKey}`;
  const expectedCase = expectedByCase[fixture.caseKey];
  const expected = fixture.expected;
  const state = expected?.state;
  const projections = expected?.projections;

  assert(/^FAIL-\d{3}$/.test(fixture.id), `${prefix}: invalid fixture ID`);
  assert(expectedCase, `${prefix}: validator has no expected case contract`);
  assert(state?.fromStatus === 'generating', `${prefix}: failure must leave generating`);
  assert(
    contract.generationStatuses.includes(state.status),
    `${prefix}: status is not an authoritative generation status`,
  );
  assert(
    contract.terminalStatusesUnderTest.includes(state.status),
    `${prefix}: status must be partial or failed`,
  );

  for (const key of ['status', 'phase', 'outcome', 'readiness', 'errorCode']) {
    assert(
      state[key] === expectedCase[key],
      `${prefix}: expected ${key}=${String(expectedCase[key])}, received ${String(state[key])}`,
    );
  }

  assert(
    state.readiness === null || contract.conversionReadiness.includes(state.readiness),
    `${prefix}: invalid conversion readiness`,
  );
  assert(allowedOutcomes.has(state.outcome), `${prefix}: invalid normalized outcome`);
  assert(
    state.status === 'partial'
      ? state.outcome === 'partial'
      : state.outcome === 'no_proposal' || state.outcome === 'rejected',
    `${prefix}: generation status and outcome are inconsistent`,
  );
  assert(
    (state.readiness === null) ===
      (fixture.failureClass === 'runtime' || state.outcome === 'rejected'),
    `${prefix}: null readiness is limited to pre-content runtime or rejected conversion`,
  );
  assert(state.errorCode !== state.outcome, `${prefix}: errorCode must not duplicate outcome`);
  assert(state.errorCode !== state.readiness, `${prefix}: errorCode must not duplicate readiness`);
  assert(
    expected.content?.canonicalDisposition === expectedCase.canonicalDisposition,
    `${prefix}: unexpected canonical content disposition`,
  );
  assert(
    expected.attempt?.disposition === (state.status === 'partial' ? 'closed_partial' : 'closed_failed'),
    `${prefix}: attempt disposition must match status`,
  );
  assert(expected.attempt?.lateResultMayMutate === false, `${prefix}: late result mutation must be blocked`);

  const beforeReview = projections?.availableBeforeReview;
  const eligible = projections?.eligibleAfterReviewedSave;
  const forbidden = projections?.forbidden;
  assert(Array.isArray(beforeReview) && beforeReview.length === 0, `${prefix}: pre-review projection is forbidden`);
  assert(Array.isArray(eligible) && unique(eligible), `${prefix}: invalid eligible projection list`);
  assert(Array.isArray(forbidden) && unique(forbidden), `${prefix}: invalid forbidden projection list`);
  assert(
    eligible.every((target) => contract.projectionTargets.includes(target)) &&
      forbidden.every((target) => contract.projectionTargets.includes(target)),
    `${prefix}: unknown projection target`,
  );
  assert(
    eligible.every((target) => !forbidden.includes(target)),
    `${prefix}: projection cannot be both eligible and forbidden`,
  );
  assert(
    sameSet([...eligible, ...forbidden], contract.projectionTargets),
    `${prefix}: every projection target needs an explicit outcome`,
  );
  assert(
    Array.isArray(projections.lossCodes) && projections.lossCodes.length > 0 && unique(projections.lossCodes),
    `${prefix}: lossCodes must be a non-empty unique list`,
  );

  assert(expected.humanReview?.required === expectedCase.reviewRequired, `${prefix}: human-review rule mismatch`);
  assert(expected.humanReview?.canOverrideCurrentAttempt === false, `${prefix}: current failure cannot be overridden`);
  assert(expected.retry?.automatic === false, `${prefix}: automatic retry is prohibited`);
  assert(expected.retry?.allowed === true, `${prefix}: an explicit recovery path is required`);
  assert(expected.retry?.createsNewAttempt === true, `${prefix}: retry must create a new attempt`);
  assert(expected.save?.automatic === false, `${prefix}: automatic save is prohibited`);
  assert(expected.save?.allowed === expectedCase.saveAllowed, `${prefix}: save rule mismatch`);
  assert(expected.save?.requiresExplicitUserAction === true, `${prefix}: save must require explicit action`);
  assert(expected.preserve?.submittedInput === true, `${prefix}: submitted input must be preserved`);
  assert(expected.preserve?.lastSafeState === true, `${prefix}: last safe state must be preserved`);

  if (!expected.save.allowed) {
    assert(eligible.length === 0, `${prefix}: unsaveable content cannot declare post-save projections`);
  } else {
    assert(state.status === 'partial', `${prefix}: only sanitized partial is saveable in this fixture set`);
    assert(expected.humanReview.required, `${prefix}: saveable partial requires human review`);
  }
}

const scheduleFixture = fixtures.find((fixture) => fixture.caseKey === 'invented_schedule_ics');
assert(
  scheduleFixture.expected.projections.forbidden.includes('calendar'),
  'invented_schedule_ics must forbid Calendar/ICS projection',
);
assert(
  sameSet(scheduleFixture.expected.projections.eligibleAfterReviewedSave, [
    'checklist',
    'todo',
    'sheet',
    'memo',
  ]),
  'invented_schedule_ics must retain only unscheduled projection eligibility',
);

const statusCounts = fixtures.reduce((counts, fixture) => {
  const status = fixture.expected.state.status;
  counts[status] = (counts[status] ?? 0) + 1;
  return counts;
}, {});
const readinessCounts = fixtures.reduce((counts, fixture) => {
  const readiness = fixture.expected.state.readiness ?? 'not_evaluated';
  counts[readiness] = (counts[readiness] ?? 0) + 1;
  return counts;
}, {});

console.log(
  `PASS ${path.basename(fixturePath)}: ${fixtures.length} fixtures; ` +
    `status failed=${statusCounts.failed ?? 0}, partial=${statusCounts.partial ?? 0}; ` +
    `readiness source_import_required=${readinessCounts.source_import_required ?? 0}, ` +
    `hold=${readinessCounts.hold ?? 0}, not_evaluated=${readinessCounts.not_evaluated ?? 0}; ` +
    `${contract.projectionTargets.length} projection targets; automatic retry=0; automatic save=0.`,
);
