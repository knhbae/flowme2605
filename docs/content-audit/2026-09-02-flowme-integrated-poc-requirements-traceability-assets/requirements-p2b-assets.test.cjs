const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const here = __dirname;
const repoRoot = path.resolve(here, '..', '..', '..');
const reportPath = path.join(here, '..', '2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html');
const p2aConfigPath = path.join(
  repoRoot,
  'docs/specs/2026-09-03-flowme-integrated-poc-lossless-result-closure-v1/current-verdict-overrides.json',
);
const p2bConfigPath = path.join(
  repoRoot,
  'docs/specs/2026-09-03-flowme-integrated-poc-occurrence-txt-closure-v1/current-verdict-overrides.json',
);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const assetJson = (name) => readJson(path.join(here, name));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();

const verdictKeys = {
  '충족': 'fulfilled',
  '부분': 'partial',
  '미충족': 'missing',
  '의도적 변경': 'intentionalChange',
  '결정 필요': 'decisionRequired',
  '제외': 'excluded',
};

function currentPrimaryRows() {
  const rows = ['requirements-v41.json', 'requirements-d1.json', 'requirements-d2.json']
    .flatMap((file) => assetJson(file));
  const overrides = [readJson(p2aConfigPath), readJson(p2bConfigPath)]
    .flatMap((config) => config.overrides);
  return rows.map((row) => overrides
    .filter((override) => override.id === row.id)
    .reduce((current, override) => {
      assert.equal(current.verdict, override.from, `${row.id} override chain`);
      return { ...current, verdict: override.to };
    }, row));
}

test('P2-A snapshots stay byte-fixed while P2-B is an additive two-row trace layer', () => {
  assert.equal(
    sha256(path.join(here, 'requirements-this-run-p2a.json')),
    '1CA7C85A2DEA50A527791642455E62AE057046BBB0CAB1A296C23D3C426A0BD3',
  );
  assert.equal(
    sha256(p2aConfigPath),
    '7565CC15313ABAAA4735BA571339CD99CB2C08712DE8ACF413B9FA03BDAEE017',
  );

  const rows = assetJson('requirements-this-run-p2b.json');
  assert.deepEqual(rows.map((row) => row.id), ['D2-017', 'D2-020']);
  assert.ok(rows.every((row) => row.status === 'P2-B 충족' && row.detail.length > 80));

  const config = readJson(p2bConfigPath);
  assert.equal(config.version, 1);
  assert.equal(config.stage, 'P2-B');
  assert.deepEqual(config.beforeP2B.total, {
    total: 168,
    satisfied: 122,
    partial: 20,
    missing: 4,
    intentionalChange: 10,
    excluded: 12,
  });
  assert.deepEqual(config.afterP2B.total, {
    total: 168,
    satisfied: 124,
    partial: 18,
    missing: 4,
    intentionalChange: 10,
    excluded: 12,
  });
});

test('the P2-B override chain remains locked to 124/18/4/10/12 and 22 gaps', () => {
  const rows = currentPrimaryRows();
  const counts = Object.fromEntries(Object.values(verdictKeys).map((key) => [key, 0]));
  rows.forEach((row) => { counts[verdictKeys[row.verdict]] += 1; });

  assert.equal(rows.length, 168);
  assert.deepEqual(counts, {
    fulfilled: 124,
    partial: 18,
    missing: 4,
    intentionalChange: 10,
    decisionRequired: 0,
    excluded: 12,
  });
  assert.equal(counts.partial + counts.missing, 22);
});

test('fulfilled P2-B rows require existing implementation, test, and passing run evidence', () => {
  const config = readJson(p2bConfigPath);
  const manifest = assetJson('verification-manifest.json');
  const runs = new Map(manifest.runs.map((run) => [run.id, run]));

  assert.deepEqual(config.overrides.map((override) => override.id), ['D2-017', 'D2-020']);
  config.overrides.forEach((override) => {
    assert.equal(override.to, '충족');
    assert.ok(override.implementationEvidence.length > 0, `${override.id} implementation evidence`);
    assert.ok(override.testEvidence.length > 0, `${override.id} test evidence`);
    assert.ok(override.verificationRunIds.length > 0, `${override.id} verification runs`);
    override.implementationEvidence.forEach((file) => {
      assert.doesNotMatch(file, /\.(?:test|spec)\./u);
      assert.ok(fs.statSync(path.resolve(repoRoot, file)).isFile(), `${override.id} missing ${file}`);
    });
    override.testEvidence.forEach((file) => {
      assert.match(file, /\.(?:test|spec)\.(?:ts|tsx|cjs)$/u);
      assert.ok(fs.statSync(path.resolve(repoRoot, file)).isFile(), `${override.id} missing ${file}`);
    });
    override.verificationRunIds.forEach((runId) => {
      const run = runs.get(runId);
      assert.ok(run, `${override.id} missing run ${runId}`);
      const total = run.tests ?? run.staticPages ?? run.localLinks;
      assert.equal(run.failed, 0, `${runId} failures`);
      assert.equal(run.passed, total, `${runId} incomplete`);
      assert.notEqual(run.status, 'FAIL', `${runId} status`);
    });
  });
});

test('fresh P2-B regression evidence preserves the one known baseline failure without claiming a full pass', () => {
  const manifest = assetJson('verification-manifest.json');
  const runs = new Map(manifest.runs.map((run) => [run.id, run]));

  assert.deepEqual(runs.get('p2b-personal-workspace-poc-suite'), {
    id: 'p2b-personal-workspace-poc-suite',
    command: 'npm.cmd run test:personal-workspace-poc',
    tests: 371,
    passed: 371,
    failed: 0,
    status: 'PASS',
    groups: {
      pretestCrossSurfaceContract: { tests: 17, passed: 17, failed: 0 },
      mainModelSuite: { tests: 354, passed: 354, failed: 0 },
    },
    scope: 'P2-B 변경을 포함한 fresh personal-workspace PoC 전체 모델 회귀',
  });
  assert.match(runs.get('p2b-result-six-viewport-browser').command, /FLOWME_PLAYWRIGHT_PORT='3199'/u);
  assert.deepEqual(runs.get('p2b-result-six-viewport-browser').viewports, [
    '320x700', '390x844', '375x812', '844x390', '1024x768', '1440x900',
  ]);
  ['p2b-browser-focused', 'p2b-result-six-viewport-browser'].forEach((runId) => {
    const resultArtifact = runs.get(runId).resultArtifact;
    assert.ok(fs.statSync(path.resolve(repoRoot, resultArtifact)).isFile(), `${runId} missing result artifact`);
  });
  runs.get('p2b-result-six-viewport-browser').screenshots.forEach((screenshot) => {
    assert.ok(fs.statSync(path.resolve(repoRoot, screenshot)).isFile(), `missing screenshot ${screenshot}`);
  });
  assert.deepEqual(runs.get('p2b-production-build'), {
    id: 'p2b-production-build',
    command: 'npm.cmd run build',
    staticPages: 18,
    passed: 18,
    failed: 0,
    status: 'PASS',
    framework: 'Next.js 15.5.21',
    scope: 'P2-B occurrence, complete TXT, React presenter와 standalone 결합 변경을 반영한 fresh production build',
  });
  assert.match(runs.get('full-regression').failure.summary, /dog-adoption-first-week/u);
  assert.deepEqual(
    {
      tests: runs.get('full-regression').tests,
      passed: runs.get('full-regression').passed,
      failed: runs.get('full-regression').failed,
      status: runs.get('full-regression').status,
      stoppedEarly: runs.get('full-regression').stoppedEarly,
    },
    { tests: 1636, passed: 1635, failed: 1, status: 'FAIL', stoppedEarly: true },
  );
  assert.deepEqual(
    {
      tests: runs.get('full-regression-tail-after-stop').tests,
      passed: runs.get('full-regression-tail-after-stop').passed,
      failed: runs.get('full-regression-tail-after-stop').failed,
      status: runs.get('full-regression-tail-after-stop').status,
    },
    { tests: 220, passed: 220, failed: 0, status: 'PASS' },
  );
  assert.deepEqual(
    {
      requiredFiles: runs.get('documentation-check').requiredFiles,
      localLinks: runs.get('documentation-check').localLinks,
      failed: runs.get('documentation-check').failed,
      status: runs.get('documentation-check').status,
    },
    { requiredFiles: 16, localLinks: 4594, failed: 0, status: 'PASS' },
  );
});

test('builder verify-only validates the latest trace without changing the P2-A report HTML', () => {
  const before = fs.readFileSync(reportPath);
  const result = spawnSync(
    process.execPath,
    [path.join(here, 'build-report.cjs'), '--verify-only'],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /verified 254 requirements without writing report HTML/u);
  assert.deepEqual(fs.readFileSync(reportPath), before);
});
