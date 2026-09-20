const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..', '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const overridePath = 'docs/specs/2026-09-03-flowme-integrated-poc-personal-editing-closure-v1/current-verdict-overrides.json';
const rowsPath = 'docs/content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/requirements-this-run-p2c.json';

test('P2-C inherits P2-B and accounts for all 168 primary requirements', () => {
  const data = readJson(overridePath);
  assert.equal(data.stage, 'P2-C');
  assert.equal(data.inherits, 'docs/specs/2026-09-03-flowme-integrated-poc-occurrence-txt-closure-v1/current-verdict-overrides.json');
  assert.deepEqual(data.beforeP2C.total, {
    total: 168, satisfied: 124, partial: 18, missing: 4, intentionalChange: 10, excluded: 12,
  });
  assert.deepEqual(data.afterP2C.total, {
    total: 168, satisfied: 128, partial: 13, missing: 4, intentionalChange: 11, excluded: 12,
  });
  for (const summary of Object.values(data.afterP2C)) {
    assert.equal(summary.satisfied + summary.partial + summary.missing + summary.intentionalChange + summary.excluded, summary.total);
  }

  const manifest = readJson(
    'docs/content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/verification-manifest.json',
  );
  assert.equal(manifest.version, 4);
  assert.equal(manifest.coverage.primaryRequirements, 168);
  assert.equal(manifest.coverage.primaryVerdictStage, 'P2-C');
  assert.equal(manifest.coverage.currentPrimaryGaps, 17);
  assert.deepEqual(manifest.coverage.currentPrimaryVerdicts, {
    fulfilled: 128,
    partial: 13,
    missing: 4,
    intentionalChange: 11,
    decisionRequired: 0,
    excluded: 12,
  });
});

test('P2-C closes four gaps and records one explicit ownership change', () => {
  const data = readJson(overridePath);
  const byId = new Map(data.overrides.map((entry) => [entry.id, entry]));
  assert.deepEqual([...byId.keys()].sort(), ['D1-012', 'D2-021', 'D2-035', 'D2-036', 'D2-039']);
  for (const id of ['D1-012', 'D2-035', 'D2-036', 'D2-039']) {
    assert.equal(byId.get(id).from, '부분');
    assert.equal(byId.get(id).to, '충족');
  }
  assert.equal(byId.get('D2-021').from, '부분');
  assert.equal(byId.get('D2-021').to, '의도적 변경');
  assert.match(byId.get('D2-021').reason, /원문.*개인|개인.*원문/u);
});

test('every P2-C override has E4 implementation and test evidence on disk', () => {
  const data = readJson(overridePath);
  for (const entry of data.overrides) {
    assert.equal(entry.evidenceLevel, 'E4', entry.id);
    assert.ok(entry.currentEvidence.length >= 5, entry.id);
    assert.ok(entry.verificationRunIds.length >= 2, entry.id);
    for (const relativePath of entry.currentEvidence) {
      assert.equal(fs.existsSync(path.join(root, relativePath)), true, `${entry.id}: ${relativePath}`);
    }
  }
});

test('P2-C additive summary contains the same five unique requirement ids', () => {
  const rows = readJson(rowsPath);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map((row) => row.id).sort(), ['D1-012', 'D2-021', 'D2-035', 'D2-036', 'D2-039']);
  assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
  assert.equal(rows.filter((row) => row.status === 'P2-C 충족').length, 4);
  assert.equal(rows.filter((row) => row.status === 'P2-C 의도적 변경').length, 1);
});
