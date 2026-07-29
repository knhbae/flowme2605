import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  REQUIRED_ARTIFACTS,
  validateArtifactSchema,
  validateV2,
} from './validate-v2.mjs';

const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));

function readArtifact(filename) {
  return JSON.parse(
    fs.readFileSync(path.join(SPEC_DIR, filename), 'utf8'),
  );
}

function expectFailure(result, checkPrefix) {
  assert.equal(result.passed, false);
  assert.ok(
    result.errors.some((error) => error.startsWith(checkPrefix)),
    `expected ${checkPrefix}; received:\n${result.errors.join('\n')}`,
  );
}

test('all ten required artifacts pass schema and cross-file invariants', () => {
  const result = validateV2();
  assert.equal(
    result.passed,
    true,
    result.errors.length ? result.errors.join('\n') : 'validator failed',
  );
  assert.equal(result.failedCount, 0);
  assert.ok(result.checkCount >= 200);
  assert.deepEqual(result.expectedCounts, {
    bundles: 8,
    flows: 21,
    steps: 49,
    items: 160,
    sourceRows: 210,
    scheduledItems: 112,
    undatedItems: 48,
  });
});

test('the schema maps and validates every required artifact independently', () => {
  const schema = readArtifact(
    'qualified-revalidation-artifacts-v2.schema.json',
  );
  assert.deepEqual(Object.keys(schema['x-fileSchemas']), REQUIRED_ARTIFACTS);
  for (const filename of REQUIRED_ARTIFACTS) {
    assert.deepEqual(
      validateArtifactSchema(readArtifact(filename), filename, schema),
      [],
      filename,
    );
  }
});

test('an unresolved Item source reference is rejected', () => {
  const fixture = readArtifact('qualified-corpus-fixture-v2.json');
  fixture.bundles[0].bundle.map.flows[0].steps[0].items[0].sourceRowIds = [
    'missing-source-row',
  ];
  const result = validateV2({
    overrides: {
      'qualified-corpus-fixture-v2.json': fixture,
    },
  });
  expectFailure(result, 'fixture:bundle-moving-d30:item_source_refs');
});

test('a scheduleless VEVENT is rejected', () => {
  const matrix = readArtifact('projection-matrix-v2.json');
  const undated = matrix.records.find((record) => record.schedule === null);
  assert.ok(undated, 'expected an undated projection record');
  undated.calendarComponent = 'VEVENT';
  undated.projections.calendar.eligible = true;
  undated.projections.calendar.component = 'VEVENT';
  const result = validateV2({
    overrides: {
      'projection-matrix-v2.json': matrix,
    },
  });
  expectFailure(result, 'projection:no_scheduleless_vevent');
});

test('an undeclared nested VEVENT or VTODO is rejected', () => {
  const roundTrip = readArtifact('round-trip-results-v2.json');
  roundTrip.summary.nestedVeventOrVtodo = 1;
  roundTrip.records[0].literalIcsFirst.nestedVeventOrVtodo = 1;
  const result = validateV2({
    overrides: {
      'round-trip-results-v2.json': roundTrip,
    },
  });
  expectFailure(result, 'schema:round-trip-results-v2.json');
  expectFailure(result, 'round_trip:no_scheduleless_or_nested_components');
});

test('undated VTODO remains opt-in with a non-calendar fallback', () => {
  const matrix = readArtifact('projection-matrix-v2.json');
  const undated = matrix.records.find((record) => record.schedule === null);
  assert.ok(undated, 'expected an undated projection record');
  undated.vtodoFallback = false;
  undated.projections.vtodo.defaultEnabled = true;
  undated.projections.vtodo.fallback = [];
  const result = validateV2({
    overrides: {
      'projection-matrix-v2.json': matrix,
    },
  });
  expectFailure(result, 'projection:undated_non_calendar');
});

test('WEB1 is the sole normal-corpus public Go record', () => {
  const rights = readArtifact('rights-and-readiness-matrix-v2.json');
  const web1 = rights.records.find(
    (record) => record.creatorId === 'study-opentutorials',
  );
  assert.ok(web1, 'expected WEB1 rights record');
  web1.publicReadiness = 'Modify';
  const result = validateV2({
    overrides: {
      'rights-and-readiness-matrix-v2.json': rights,
    },
  });
  expectFailure(result, 'rights:web1_public_go');
  expectFailure(result, 'rights:normal_public_counts');
});

test('Triple and Fitpet cannot leak into normal corpus totals', () => {
  const rights = readArtifact('rights-and-readiness-matrix-v2.json');
  const triple = rights.records.find(
    (record) => record.creatorId === 'travel-triple',
  );
  assert.ok(triple, 'expected Triple boundary record');
  triple.includedInNormalCorpusTotals = true;
  const result = validateV2({
    overrides: {
      'rights-and-readiness-matrix-v2.json': rights,
    },
  });
  expectFailure(result, 'rights:normal_count');
  expectFailure(result, 'rights:normal_ids');
});

test('vertical opportunities remain excluded from qualified corpus counts', () => {
  const vertical = readArtifact('vertical-opportunity-appendix-v1.json');
  vertical.opportunities[0].contributesToQualifiedCorpusCounts = true;
  const result = validateV2({
    overrides: {
      'vertical-opportunity-appendix-v1.json': vertical,
    },
  });
  expectFailure(result, 'schema:vertical-opportunity-appendix-v1.json');
  expectFailure(result, 'vertical:all_excluded');
});

test('external client and observed-user evidence cannot be upgraded silently', () => {
  const final = readArtifact('final-adjudication-v2.json');
  final.verifiedMetrics.externalClientRoundTrip = 'pass';
  final.verificationStatus.externalGoogleOutlookAppleRoundTrip = 'PASS';
  final.verificationStatus.observedUserValidation = 'PASS';
  const result = validateV2({
    overrides: {
      'final-adjudication-v2.json': final,
    },
  });
  expectFailure(result, 'schema:final-adjudication-v2.json');
  expectFailure(result, 'final:external_client_not_run');
  expectFailure(result, 'final:decision_and_boundaries');
});
