const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const assetDir = __dirname;
const repoRoot = path.resolve(assetDir, '..', '..', '..');
const outputPath = path.join(
  assetDir,
  '..',
  '2026-09-03-flowme-integrated-poc-p2c-personal-editing-validation-ko.html',
);

const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'),
);
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const hrefFor = (relativePath) => {
  const relative = path.relative(path.dirname(outputPath), path.join(repoRoot, relativePath))
    .replaceAll(path.sep, '/');
  return encodeURI(relative.startsWith('.') ? relative : `./${relative}`);
};
const unique = (values) => [...new Set(values)];

const data = JSON.parse(fs.readFileSync(path.join(assetDir, 'report-data.json'), 'utf8'));
const css = fs.readFileSync(path.join(assetDir, 'style.css'), 'utf8');
const verdicts = readJson(data.sourcePaths.verdicts);
const thisRun = readJson(data.sourcePaths.requirementsThisRun);
const manifest = readJson(data.sourcePaths.manifest);
const sourceRequirements = [
  ...readJson(data.sourcePaths.requirementsD1),
  ...readJson(data.sourcePaths.requirementsD2),
];

const expectedIds = ['D1-012', 'D2-021', 'D2-035', 'D2-036', 'D2-039'];
assert.equal(data.stage, 'P2-C');
assert.deepEqual(data.requirementIds, expectedIds);
assert.deepEqual(verdicts.beforeP2C.total, {
  total: 168,
  satisfied: 124,
  partial: 18,
  missing: 4,
  intentionalChange: 10,
  excluded: 12,
});
assert.deepEqual(verdicts.afterP2C.total, {
  total: 168,
  satisfied: 128,
  partial: 13,
  missing: 4,
  intentionalChange: 11,
  excluded: 12,
});
assert.deepEqual(verdicts.overrides.map(({ id }) => id), expectedIds);
assert.deepEqual(thisRun.map(({ id }) => id), expectedIds);
assert.equal(verdicts.overrides.filter(({ to }) => to === '충족').length, 4);
assert.equal(verdicts.overrides.filter(({ to }) => to === '의도적 변경').length, 1);
assert.equal(data.authoringCatalog.groups.flatMap(({ properties }) => properties).length, 16);
assert.deepEqual(data.viewports.map(({ label }) => label), [
  '390×844',
  '375×812',
  '844×390',
  '1024×768',
  '1440×900',
]);

const sourceById = new Map(sourceRequirements.map((row) => [row.id, row]));
const thisRunById = new Map(thisRun.map((row) => [row.id, row]));
const overrideById = new Map(verdicts.overrides.map((row) => [row.id, row]));
expectedIds.forEach((id) => {
  assert.ok(sourceById.has(id), `missing source requirement ${id}`);
  assert.ok(thisRunById.has(id), `missing P2-C summary ${id}`);
  const override = overrideById.get(id);
  assert.ok(override, `missing P2-C override ${id}`);
  assert.equal(override.evidenceLevel, 'E4');
  assert.ok(override.currentEvidence.length > 0, `${id} evidence`);
  assert.ok(override.verificationRunIds.length > 0, `${id} run ids`);
  override.currentEvidence.forEach((relativePath) => {
    assert.ok(fs.statSync(path.join(repoRoot, relativePath)).isFile(), `${id} missing ${relativePath}`);
  });
});

const plannedRunIds = unique(verdicts.overrides.flatMap(({ verificationRunIds }) => verificationRunIds)).sort();
const gateRunIds = unique(data.verificationGates.flatMap(({ runIds }) => runIds)).sort();
assert.deepEqual(gateRunIds, plannedRunIds, 'every planned P2-C run id must appear in a report gate');
assert.ok(
  data.overallEvidenceRunIds.every((id) => data.supplementalRunIds.includes(id)),
  'overall evidence must also remain visible in the supplemental ledger',
);

const runById = new Map(manifest.runs.map((run) => [run.id, run]));
const requiredViewportLabels = data.viewports.map(({ label }) => label.replace('×', 'x'));
const stateRank = { passed: 0, conditional: 1, pending: 2, failed: 3 };
const stateLabel = {
  passed: '통과',
  conditional: '조건부 통과',
  pending: '실행 대기',
  failed: '실패',
};

function baseRunState(run) {
  if (!run) return 'pending';
  const knownBaseline = Number(run.knownBaselineFailures ?? 0);
  const p2cFailures = Number(run.p2cFailures ?? run.stageFailures ?? 0);
  if (
    ['KNOWN_BASELINE_FAILURE', 'PASS_WITH_KNOWN_BASELINE_FAILURE'].includes(run.status)
    && knownBaseline > 0
    && p2cFailures === 0
  ) return 'conditional';
  if (run.status === 'FAIL' && knownBaseline > 0 && p2cFailures === 0) return 'conditional';
  if (run.status === 'FAIL' || Number(run.failed) > 0) return 'failed';
  if (run.status === 'PASS' || (Number.isInteger(run.passed) && Number(run.failed) === 0)) {
    return 'passed';
  }
  return 'pending';
}

function mergeStates(states) {
  return states.reduce(
    (worst, state) => (stateRank[state] > stateRank[worst] ? state : worst),
    'passed',
  );
}

function validateStorageBoundary(run) {
  const fields = ['writesOutsideAllowedPrefix', 'removesOutsideAllowedPrefix', 'clearCalls'];
  if (fields.some((field) => !Number.isInteger(run?.[field]))) return 'pending';
  if (fields.some((field) => run[field] !== 0)) return 'failed';
  if (run.operatingSnapshotByteIdentical === false || run.nonPocSnapshotByteIdentical === false) {
    return 'failed';
  }
  if (run.operatingSnapshotByteIdentical !== true && run.nonPocSnapshotByteIdentical !== true) {
    return 'pending';
  }
  return 'passed';
}

function validateViewports(run) {
  if (!Array.isArray(run?.viewports)) return 'pending';
  if (!requiredViewportLabels.every((label) => run.viewports.includes(label))) return 'pending';
  const errorFields = ['horizontalOverflowFailures', 'consoleErrors', 'pageErrors'];
  if (errorFields.some((field) => !Number.isInteger(run[field]))) return 'pending';
  if (errorFields.some((field) => run[field] !== 0)) return 'failed';
  return 'passed';
}

function evaluateRunIds(runIds, options = {}) {
  const runs = runIds.map((id) => runById.get(id));
  const states = runs.map(baseRunState);
  if (options.requiresStorageBoundary) {
    states.push(...runs.map(validateStorageBoundary));
  }
  if (options.requiresViewports) {
    states.push(...runs.map(validateViewports));
  }
  return mergeStates(states);
}

const gates = data.verificationGates.map((gate) => ({
  ...gate,
  state: evaluateRunIds(gate.runIds, gate),
  runs: gate.runIds.map((id) => runById.get(id) ?? { id }),
}));
const gateById = new Map(gates.map((gate) => [gate.id, gate]));
const overallEvidenceState = evaluateRunIds(data.overallEvidenceRunIds);
const overallState = mergeStates([...gates.map(({ state }) => state), overallEvidenceState]);
const overallLabel = overallState === 'passed'
  ? '검증 완료'
  : overallState === 'conditional'
    ? '검증 완료 · 기존 결함 별도'
    : overallState === 'failed' ? '검증 실패' : '검증 대기';

function requirementState(override) {
  const ids = override.verificationRunIds;
  const states = ids.map((id) => baseRunState(runById.get(id)));
  states.push(...ids
    .filter((id) => /(?:react|standalone)-browser-focused/u.test(id))
    .map((id) => validateStorageBoundary(runById.get(id))));
  states.push(...ids
    .filter((id) => /five-viewport-browser/u.test(id))
    .map((id) => validateViewports(runById.get(id))));
  return mergeStates(states);
}

function requirementStatus(override, state) {
  if (state === 'failed') return '판정 보류';
  if (state === 'pending') {
    return override.to === '의도적 변경' ? '변경 판정 · 검증 대기' : '승격 후보 · 검증 대기';
  }
  if (override.to === '의도적 변경') {
    return state === 'conditional' ? '의도적 변경 확인 · 기존 결함 별도' : '의도적 변경 확인';
  }
  return state === 'conditional' ? '충족 확인 · 기존 결함 별도' : '충족 확인';
}

const requirements = expectedIds.map((id) => {
  const source = sourceById.get(id);
  const override = overrideById.get(id);
  const summary = thisRunById.get(id);
  const state = requirementState(override);
  return {
    ...source,
    override,
    summary,
    state,
    status: requirementStatus(override, state),
    targetKind: override.to === '의도적 변경' ? 'intentional' : 'fulfilled',
  };
});

const before = verdicts.beforeP2C.total;
const after = verdicts.afterP2C.total;
const beforeGap = before.partial + before.missing;
const afterGap = after.partial + after.missing;
const builtAt = new Date().toISOString();
const runTotal = (run) => run.tests ?? run.staticPages ?? run.localLinks;
const runCount = (run) => {
  const total = runTotal(run);
  return Number.isInteger(total) ? `${run.passed ?? 0} / ${total}` : '0 / —';
};
const runStateLabel = (run) => stateLabel[baseRunState(run)];
const arrowSvg = '<svg aria-hidden="true" viewBox="0 0 32 20"><path d="M2 10h25M20 3l7 7-7 7"/></svg>';

const sourceLinks = {
  standalone: hrefFor(data.sourcePaths.standalone),
  trace: hrefFor(data.sourcePaths.trace),
  spec: hrefFor(data.sourcePaths.spec),
  evidence: hrefFor(data.sourcePaths.requirementsThisRun),
  verdicts: hrefFor(data.sourcePaths.verdicts),
  manifest: hrefFor(data.sourcePaths.manifest),
};

const requirementsHtml = requirements.map((row) => `
  <details class="requirement" data-kind="${row.targetKind}" data-state="${row.state}" data-product="${row.product}">
    <summary>
      <span class="req-id">${escapeHtml(row.id)}</span>
      <span class="req-heading"><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.product === 'D1' ? '개발1' : '개발2')} · ${escapeHtml(row.priority)}</small></span>
      <span class="status status-${row.state}">${escapeHtml(row.status)}</span>
    </summary>
    <div class="requirement-body">
      <section>
        <h3>이번 계약</h3>
        <p>${escapeHtml(row.summary.detail)}</p>
      </section>
      <section>
        <h3>${row.override.to === '의도적 변경' ? '변경 근거' : '충족 근거'}</h3>
        <p>${escapeHtml(row.override.reason)}</p>
        <p class="action">경계 · ${escapeHtml(row.override.action)}</p>
      </section>
      <section class="requirement-evidence">
        <h3>구현·테스트 증거</h3>
        <ul>${row.override.currentEvidence.map((evidence) => `<li><a href="${hrefFor(evidence)}">${escapeHtml(evidence)}</a></li>`).join('')}</ul>
      </section>
      <section class="requirement-runs">
        <h3>E4 실행 게이트</h3>
        <ul>${row.override.verificationRunIds.map((id) => {
          const run = runById.get(id);
          return `<li><code>${escapeHtml(id)}</code><span class="mini-state state-${baseRunState(run)}">${escapeHtml(runStateLabel(run))}</span></li>`;
        }).join('')}</ul>
      </section>
    </div>
  </details>
`).join('');

const gatesHtml = gates.map((gate) => `
  <article class="gate-row" data-state="${gate.state}">
    <div>
      <strong>${escapeHtml(gate.label)}</strong>
      <p>${escapeHtml(gate.description)}</p>
    </div>
    <ul>${gate.runs.map((run) => `
      <li>
        <span><code>${escapeHtml(run.id)}</code><small>${run.command ? escapeHtml(run.command) : 'manifest 실행 기록 없음'}</small></span>
        <strong>${escapeHtml(runCount(run))}</strong>
      </li>`).join('')}
    </ul>
    <span class="status status-${gate.state}">${escapeHtml(stateLabel[gate.state])}</span>
  </article>
`).join('');

const scenariosHtml = data.scenarios.map((scenario) => {
  const scenarioState = mergeStates(scenario.gateIds.map((id) => gateById.get(id).state));
  return `
    <article class="scenario-row">
      <span>${escapeHtml(scenario.id)}</span>
      <div><strong>${escapeHtml(scenario.title)}</strong><p>${escapeHtml(scenario.expected)}</p></div>
      <span class="status status-${scenarioState}">${escapeHtml(stateLabel[scenarioState])}</span>
    </article>`;
}).join('');

const supplementalHtml = data.supplementalRunIds.map((id) => {
  const run = runById.get(id);
  return `
    <article>
      <span><strong>${escapeHtml(id)}</strong><small>${run?.command ? escapeHtml(run.command) : 'manifest 실행 기록 없음'}</small></span>
      <span class="supplemental-count">${escapeHtml(runCount(run ?? {}))}</span>
      <span class="mini-state state-${baseRunState(run)}">${escapeHtml(runStateLabel(run))}</span>
    </article>`;
}).join('');

const sourceStepHtml = data.ownership.forward.map((step, index) => `
  <div class="ownership-step"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(step)}</strong></div>
  ${index < data.ownership.forward.length - 1 ? `<div class="ownership-arrow">${arrowSvg}</div>` : ''}
`).join('');

const reportSnapshot = {
  version: data.version,
  stage: data.stage,
  builtAt,
  manifestVersion: manifest.version,
  manifestGeneratedAt: manifest.generatedAt,
  overallState,
  beforeP2C: before,
  afterP2C: after,
  requirementIds: expectedIds,
  requirements: requirements.map(({ id, state, status, targetKind, override }) => ({
    id,
    state,
    status,
    targetKind,
    runIds: override.verificationRunIds,
  })),
  gates: gates.map(({ id, state, runIds }) => ({ id, state, runIds })),
  plannedRunIds,
  overallEvidenceRunIds: data.overallEvidenceRunIds,
  overallEvidenceState,
  viewports: data.viewports,
  storageBoundary: {
    allowedPrefix: 'flow:poc:personal-workspace:v1:',
    gateStates: gates.filter(({ id }) => ['react', 'standalone'].includes(id)).map(({ id, state }) => ({ id, state })),
  },
  externalEvidence: manifest.externalEvidence,
  publish: manifest.publish,
};

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(data.title)}</title>
  <style>${css}</style>
</head>
<body>
  <a class="skip" href="#requirements">요구사항 판정으로 이동</a>
  <header class="topbar">
    <a class="brand" href="#top" aria-label="보고서 처음으로">FlowMe <span>P2-C 검증</span></a>
    <nav aria-label="보고서 목차">
      <a href="#requirements">요구</a>
      <a href="#contracts">편집 계약</a>
      <a href="#verification">검증</a>
      <a href="#boundary">경계</a>
    </nav>
  </header>

  <main id="top" class="page">
    <section class="hero">
      <div class="hero-copy">
        <h1>개인 편집은<br>어디까지 닫혔나</h1>
        <p>${escapeHtml(data.purpose)}</p>
        <div class="hero-actions">
          <a id="open-standalone" class="primary-action" href="${sourceLinks.standalone}">독립 HTML 조작하기 ${arrowSvg}</a>
          <a id="open-trace" class="secondary-action" href="${sourceLinks.trace}">전체 요구 추적표</a>
        </div>
      </div>
      <aside class="hero-status" aria-label="현재 검증 상태">
        <span id="overall-status" class="overall overall-${overallState}">${escapeHtml(overallLabel)}</span>
        <h2>${overallState === 'pending' ? '구현 판정과 실행 증거를 아직 합산하지 않습니다.' : overallState === 'failed' ? '실패한 필수 게이트가 있어 판정을 보류합니다.' : '필수 게이트가 모두 해소됐습니다.'}</h2>
        <p>${overallState === 'pending' ? 'override에 계획된 run ID가 manifest에 모두 들어오고 저장·화면 세부 지표까지 확인돼야 E4로 닫힙니다.' : '자동화 결과와 알려진 기준선 결함을 분리해 표시합니다.'}</p>
        <dl>
          <div><dt>대상</dt><dd id="requirement-count">5개</dd></div>
          <div><dt>충족 목표</dt><dd>4개</dd></div>
          <div><dt>의도적 변경</dt><dd>1개</dd></div>
          <div><dt>필수 게이트</dt><dd>${gates.length}개</dd></div>
        </dl>
      </aside>
    </section>

    <section class="ledger" aria-labelledby="ledger-title">
      <div class="section-index">01</div>
      <div class="ledger-copy">
        <h2 id="ledger-title">판정 변화는 계획과 검증을 나눠 읽는다</h2>
        <p>아래 수치는 P2-C override의 목표 집계다. 이 페이지의 실행 게이트가 대기 중이면 승격도 검증 대기로 표시한다.</p>
      </div>
      <div class="ledger-before">
        <span>P2-B 기준</span>
        <strong><b id="before-satisfied">${before.satisfied}</b> 충족</strong>
        <small id="before-gap">부분 ${before.partial} + 미충족 ${before.missing} = 갭 ${beforeGap}</small>
      </div>
      <div class="ledger-arrow">${arrowSvg}</div>
      <div class="ledger-after">
        <span>P2-C 목표</span>
        <strong><b id="after-satisfied">${after.satisfied}</b> 충족</strong>
        <small id="after-gap">부분 ${after.partial} + 미충족 ${after.missing} = 갭 ${afterGap}</small>
      </div>
      <p class="ledger-note">충족 +4 · 의도적 변경 +1 · 미해소 갭 22 → 17</p>
    </section>

    <section id="requirements" class="section requirements-section">
      <div class="section-head">
        <div><span>02</span><h2>다섯 요구를 하나씩 대조한다</h2></div>
        <p>정본 문장, 이번 계약, 구현 파일과 계획된 run ID를 한 행에 묶었다. 행을 열면 근거와 남긴 경계를 바로 확인할 수 있다.</p>
      </div>
      <div class="filterbar" aria-label="요구사항 필터">
        <div role="group" aria-label="목표 판정">
          <button type="button" class="is-active" data-kind-filter="all">전체 5</button>
          <button type="button" data-kind-filter="fulfilled">충족 4</button>
          <button type="button" data-kind-filter="intentional">의도적 변경 1</button>
        </div>
        <label>실행 상태
          <select id="state-filter">
            <option value="all">전체 상태</option>
            <option value="passed">통과</option>
            <option value="conditional">조건부</option>
            <option value="pending">대기</option>
            <option value="failed">실패</option>
          </select>
        </label>
        <span id="visible-count" aria-live="polite">5건 표시</span>
      </div>
      <div class="requirements-list">${requirementsHtml}</div>
      <div class="source-actions">
        <a id="open-spec" href="${sourceLinks.spec}">P2-C 정본</a>
        <a id="open-evidence" href="${sourceLinks.evidence}">이번 요구 증거</a>
        <a id="open-verdicts" href="${sourceLinks.verdicts}">판정 override</a>
        <a id="open-manifest" href="${sourceLinks.manifest}">검증 manifest</a>
      </div>
    </section>

    <section id="contracts" class="section contracts-section">
      <div class="section-head">
        <div><span>03</span><h2>편집 가능한 것과 원본인 것을 분리한다</h2></div>
        <p>개인 구간 제목은 stable ref에 한 번만 저장하고, 작성 속성은 source transaction으로만 바꾼다. 두 전이를 한 저장으로 섞지 않는다.</p>
      </div>

      <article class="contract-block section-shadow">
        <header><span>D1-012</span><h3>구간 제목은 Item 복제가 아니라 section shadow다</h3></header>
        <div class="shadow-flow">
          <div class="owner-column editable">
            <span>편집 가능</span>
            ${data.sectionShadow.editableOwners.map((owner) => `<strong>${escapeHtml(owner)}</strong>`).join('')}
          </div>
          <div class="ownership-arrow">${arrowSvg}</div>
          <div class="shadow-store"><code>${escapeHtml(data.sectionShadow.store)}</code><small>${escapeHtml(data.sectionShadow.success)}</small></div>
          <div class="ownership-arrow">${arrowSvg}</div>
          <div class="projection-grid">${data.sectionShadow.projections.map((projection) => `<span>${escapeHtml(projection)}</span>`).join('')}</div>
        </div>
        <div class="readonly-strip"><strong>읽기 전용</strong>${data.sectionShadow.readOnlyOwners.map((owner) => `<span>${escapeHtml(owner)}</span>`).join('')}</div>
        <p class="zero-mutation">mutation 0 · ${escapeHtml(data.sectionShadow.zeroMutation)}</p>
      </article>

      <article class="contract-block authoring-contract">
        <header><span>D2-035 · D2-036 · D2-039</span><h3>16종은 네 그룹으로 찾고, 복잡한 값만 별도 surface를 쓴다</h3></header>
        <div class="catalog-groups">${data.authoringCatalog.groups.map((group) => `
          <section><strong>${escapeHtml(group.name)}</strong><p>${group.properties.map(escapeHtml).join(' · ')}</p></section>
        `).join('')}</div>
        <div class="surface-compare">
          <section>
            <span>editor 안에 유지</span>
            <h4>단순 inline</h4>
            <p>${data.authoringCatalog.inline.map(escapeHtml).join(' · ')}</p>
          </section>
          <section>
            <span>작은 화면 sheet · 넓은 화면 bounded surface</span>
            <h4>dependent</h4>
            <p>${data.authoringCatalog.dependent.map(escapeHtml).join(' · ')}</p>
          </section>
        </div>
        <ol class="reentry-list">${data.authoringCatalog.reentry.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
      </article>

      <article class="contract-block ownership-contract">
        <header><span>D2-021</span><h3>원문에서 결과로는 즉시, 개인 변경에서 원문으로는 차단</h3></header>
        <div class="source-flow">${sourceStepHtml}</div>
        <div class="reverse-boundary">
          <div><span>개인 shadow에만 남는 값</span><p>${data.ownership.personalOnly.map(escapeHtml).join(' · ')}</p></div>
          <div class="blocked-line"><b aria-hidden="true">×</b><strong>${escapeHtml(data.ownership.blockedReverse)}</strong></div>
        </div>
        <ul class="invariant-list">${data.ownership.invariants.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </article>
    </section>

    <section id="verification" class="section verification-section">
      <div class="section-head">
        <div><span>04</span><h2>manifest가 없으면 통과도 없다</h2></div>
        <p>override에 계획된 일곱 run ID를 다섯 게이트로 묶었다. 실행 누락이나 저장·화면 지표 누락은 자동으로 대기 상태가 된다.</p>
      </div>
      <div class="gate-filter" role="group" aria-label="검증 게이트 필터">
        <button type="button" class="is-active" data-gate-filter="all">전체 ${gates.length}</button>
        <button type="button" data-gate-filter="passed">통과 ${gates.filter(({ state }) => state === 'passed').length}</button>
        <button type="button" data-gate-filter="conditional">조건부 ${gates.filter(({ state }) => state === 'conditional').length}</button>
        <button type="button" data-gate-filter="pending">대기 ${gates.filter(({ state }) => state === 'pending').length}</button>
        <button type="button" data-gate-filter="failed">실패 ${gates.filter(({ state }) => state === 'failed').length}</button>
        <span id="gate-count">${gates.length}건 표시</span>
      </div>
      <div class="gate-list">${gatesHtml}</div>

      <div class="scenario-panel">
        <h3>필수 시뮬레이션</h3>
        ${scenariosHtml}
      </div>

      <div class="supplemental-runs">
        <h3>전체 회귀·문서·보고서 증거는 별도로 표시</h3>
        ${supplementalHtml}
        <p>필수 override 판정과 보조 실행을 섞어 통과 수를 부풀리지 않는다.</p>
      </div>

      <div class="viewport-grid">${data.viewports.map((viewport) => `
        <article><strong>${escapeHtml(viewport.label)}</strong><span>${viewport.width} × ${viewport.height}</span><small>${escapeHtml(stateLabel[gateById.get('viewports').state])}</small></article>
      `).join('')}</div>
    </section>

    <section id="boundary" class="section boundary-section">
      <div class="section-head">
        <div><span>05</span><h2>PoC 저장 경계가 최종 합격선이다</h2></div>
        <p>기능이 동작해도 운영 데이터나 작성 원본을 건드리면 이번 단계는 실패다.</p>
      </div>
      <div class="boundary-layout">
        <div class="prefix-proof">
          <span>허용 write/remove prefix</span>
          <code>flow:poc:personal-workspace:v1:*</code>
          <strong class="status status-${mergeStates(['react', 'standalone'].map((id) => gateById.get(id).state))}">${escapeHtml(stateLabel[mergeStates(['react', 'standalone'].map((id) => gateById.get(id).state))])}</strong>
          <p>focused browser run 두 개의 allowlist·clear·운영 snapshot 필드가 모두 있어야 통과한다.</p>
        </div>
        <ol>${data.boundaries.map((boundary) => `<li>${escapeHtml(boundary)}</li>`).join('')}</ol>
      </div>

      <div class="external-grid">
        <article><span>실제 Android Chrome</span><strong>${escapeHtml(manifest.externalEvidence?.androidChrome ?? '미실행')}</strong></article>
        <article><span>실제 iOS Safari</span><strong>${escapeHtml(manifest.externalEvidence?.iosSafari ?? '미실행')}</strong></article>
        <article><span>보조기술</span><strong>${escapeHtml(manifest.externalEvidence?.screenReader ?? '미실행')}</strong></article>
        <article class="users"><span>관찰 사용자</span><strong>${escapeHtml(manifest.externalEvidence?.observedUsers ?? 0)}명</strong></article>
      </div>
      <div class="publish-grid">${[
        ['commit', manifest.publish?.commit],
        ['push', manifest.publish?.push],
        ['PR', manifest.publish?.pullRequest],
        ['Preview', manifest.publish?.preview],
        ['Production', manifest.publish?.production],
      ].map(([label, value]) => `<div><span>${label}</span><strong>${escapeHtml(value ?? '미진행')}</strong></div>`).join('')}</div>
      <aside class="remaining"><strong>남은 경계와 다음 결정</strong><ul>${data.remaining.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></aside>
    </section>

    <section class="source-footer" aria-label="근거와 생성 정보">
      <div><span>정본</span><a href="${sourceLinks.spec}">${escapeHtml(data.sourcePaths.spec)}</a></div>
      <div><span>검증 manifest</span><a href="${sourceLinks.manifest}">${escapeHtml(manifest.generatedAt ?? '시간 없음')}</a></div>
      <div><span>보고서 생성</span><strong>${escapeHtml(builtAt)}</strong></div>
      <p>자동 테스트와 브라우저 캡처는 실제 기기 검사나 관찰 사용자 검증이 아니다. 이 보고서는 격리 PoC의 구현·시뮬레이션 증거만 다룬다.</p>
    </section>
  </main>

  <footer><p>FlowMe 통합 PoC · P2-C 개인 편집 검증 · commit/push/PR/Preview/Production 미진행</p></footer>
  <script id="report-data" type="application/json">${JSON.stringify(reportSnapshot).replaceAll('<', '\\u003c')}</script>
  <script>
    (() => {
      let kind = 'all';
      let state = 'all';
      const rows = [...document.querySelectorAll('.requirement')];
      const count = document.getElementById('visible-count');
      const updateRequirements = () => {
        let visible = 0;
        rows.forEach((row) => {
          const show = (kind === 'all' || row.dataset.kind === kind)
            && (state === 'all' || row.dataset.state === state);
          row.hidden = !show;
          if (show) visible += 1;
        });
        count.textContent = visible + '건 표시';
      };
      document.querySelectorAll('[data-kind-filter]').forEach((button) => {
        button.addEventListener('click', () => {
          kind = button.dataset.kindFilter;
          document.querySelectorAll('[data-kind-filter]').forEach((item) => item.classList.toggle('is-active', item === button));
          updateRequirements();
        });
      });
      document.getElementById('state-filter').addEventListener('change', (event) => {
        state = event.target.value;
        updateRequirements();
      });

      const gates = [...document.querySelectorAll('.gate-row')];
      const gateCount = document.getElementById('gate-count');
      document.querySelectorAll('[data-gate-filter]').forEach((button) => {
        button.addEventListener('click', () => {
          const filter = button.dataset.gateFilter;
          let visible = 0;
          gates.forEach((gate) => {
            const show = filter === 'all' || gate.dataset.state === filter;
            gate.hidden = !show;
            if (show) visible += 1;
          });
          gateCount.textContent = visible + '건 표시';
          document.querySelectorAll('[data-gate-filter]').forEach((item) => item.classList.toggle('is-active', item === button));
        });
      });
    })();
  </script>
</body>
</html>`;

const normalizedHtml = html.split('\n').map((line) => line.trimEnd()).join('\n');
fs.writeFileSync(outputPath, normalizedHtml, 'utf8');
console.log(`wrote ${path.relative(repoRoot, outputPath).replaceAll(path.sep, '/')} (${requirements.length} requirements, ${gates.length} gates, ${overallState})`);
