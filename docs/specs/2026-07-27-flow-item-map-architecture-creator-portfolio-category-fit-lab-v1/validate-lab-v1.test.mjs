import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLab } from './validate-lab-v1.mjs';

const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));

test('builder regenerates the architecture lab deterministically', () => {
  const output = execFileSync(
    process.execPath,
    [path.join(SPEC_DIR, 'build-lab-v1.mjs')],
    { encoding: 'utf8' },
  );
  const summary = JSON.parse(output);
  assert.equal(summary.primaryBundles, 9);
  assert.deepEqual(summary.totals, {
    flows: 22,
    steps: 57,
    items: 148,
    sourceRows: 198,
  });
  assert.equal(
    summary.decision,
    'keep_current_canonical_v1_add_projection_time_grouping',
  );
});

test('all corpus, architecture, projection and evidence invariants pass', () => {
  const result = validateLab();
  assert.equal(
    result.passed,
    true,
    result.errors.length ? result.errors.join('\n') : 'validator failed',
  );
  assert.equal(result.failedCount, 0);
  assert.ok(result.checkCount > 200);
});

test('stored strict JSON Schema evidence covers all three architecture runs', () => {
  const result = JSON.parse(
    fs.readFileSync(
      path.join(SPEC_DIR, 'schema-validation-results-v1.json'),
      'utf8',
    ),
  );
  assert.equal(result.passed, true);
  assert.deepEqual(result.compile, {
    passed: 3,
    total: 3,
    schemaIds: [
      'https://flowme.local/schemas/current-canonical-v1.schema.json',
      'https://flowme.local/schemas/item-shared-context-v1.schema.json',
      'https://flowme.local/schemas/literal-ics-graph-v1.schema.json',
    ],
  });
  assert.equal(result.positive.passed, 27);
  assert.equal(result.positive.total, 27);
  assert.equal(result.negative.passed, 6);
  assert.equal(result.negative.total, 6);
});
