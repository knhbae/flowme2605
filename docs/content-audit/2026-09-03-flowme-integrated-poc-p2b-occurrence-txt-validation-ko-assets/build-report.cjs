const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const here = __dirname;
const repositoryRoot = path.resolve(here, '..', '..', '..');
const reportName = '2026-09-03-flowme-integrated-poc-p2b-occurrence-txt-validation-ko.html';
const reportPath = path.resolve(here, '..', reportName);
const dataPath = path.join(here, 'report-data.json');
const stylePath = path.join(here, 'style.css');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const data = readJson(dataPath);
const style = fs.readFileSync(stylePath, 'utf8');
const repoPath = (repositoryPath) => path.resolve(repositoryRoot, repositoryPath);

if (data.version !== 1 || data.stage !== 'P2-B') {
  throw new Error(`P2-B report data v1 required, got ${data.stage} v${data.version}`);
}
if (!Array.isArray(data.requirementIds) || data.requirementIds.join(',') !== 'D2-017,D2-020') {
  throw new Error('P2-B report must cover D2-017 and D2-020 exactly');
}
if (!Array.isArray(data.manifestOutputs) || data.manifestOutputs.length !== 4) {
  throw new Error('P2-B report requires four result manifest outputs');
}
if (!Array.isArray(data.viewports) || data.viewports.length !== 6) {
  throw new Error('P2-B report requires six browser viewports');
}
if (!Array.isArray(data.verificationGates) || data.verificationGates.length < 6) {
  throw new Error('P2-B report verification gates are incomplete');
}
if (!Array.isArray(data.supplementalRunIds)) {
  throw new Error('P2-B supplemental run ids must be an array');
}
if (!data.txtContract || data.txtContract.version !== 2) {
  throw new Error('complete TXT v2 contract is required');
}

for (const [label, repositoryPath] of Object.entries(data.sourcePaths)) {
  if (!fs.existsSync(repoPath(repositoryPath))) {
    throw new Error(`missing ${label} source: ${repositoryPath}`);
  }
}

const verdictConfig = readJson(repoPath(data.sourcePaths.verdicts));
const requirements = readJson(repoPath(data.sourcePaths.requirements));
const manifest = readJson(repoPath(data.sourcePaths.manifest));

if (!verdictConfig.beforeP2B || !verdictConfig.afterP2B || !Array.isArray(verdictConfig.overrides)) {
  throw new Error('P2-B verdict config is incomplete');
}
if (!Array.isArray(requirements) || !Array.isArray(manifest.runs)) {
  throw new Error('requirement rows and verification manifest runs must be arrays');
}

const verdictKeys = ['satisfied', 'partial', 'missing', 'intentionalChange', 'excluded'];
const verdictLabels = {
  satisfied: '충족',
  partial: '부분',
  missing: '미구현',
  intentionalChange: '의도 변경',
  excluded: '제외',
};

function assertSummary(label, summary) {
  if (!summary || !Number.isInteger(summary.total)) throw new Error(`${label}.total is invalid`);
  const total = verdictKeys.reduce((sum, key) => {
    if (!Number.isInteger(summary[key]) || summary[key] < 0) {
      throw new Error(`${label}.${key} is invalid`);
    }
    return sum + summary[key];
  }, 0);
  if (total !== summary.total) throw new Error(`${label} verdict sum ${total} != ${summary.total}`);
}

for (const scope of ['V41', 'D1', 'D2', 'total']) {
  assertSummary(`beforeP2B.${scope}`, verdictConfig.beforeP2B[scope]);
  assertSummary(`afterP2B.${scope}`, verdictConfig.afterP2B[scope]);
}
if (verdictConfig.afterP2B.total.satisfied - verdictConfig.beforeP2B.total.satisfied !== 2) {
  throw new Error('P2-B target must promote exactly two primary requirements');
}

const requirementById = new Map(requirements.map((row) => [row.id, row]));
const overrideById = new Map(verdictConfig.overrides.map((row) => [row.id, row]));
const targetRows = data.requirementIds.map((id) => {
  const requirement = requirementById.get(id);
  const override = overrideById.get(id);
  if (!requirement || !override) throw new Error(`missing requirement or override for ${id}`);
  if (override.from !== '부분' || override.to !== '충족') {
    throw new Error(`${id} must be a partial-to-satisfied target`);
  }
  for (const evidencePath of override.currentEvidence ?? []) {
    if (!fs.existsSync(repoPath(evidencePath))) throw new Error(`${id} evidence missing: ${evidencePath}`);
  }
  return { id, requirement, override };
});

const runsById = new Map();
manifest.runs.forEach((run) => runsById.set(run.id, run));

function classifyRun(run) {
  if (!run) return 'pending';
  if ((run.status === 'FAIL' || run.status === 'KNOWN_BASELINE_FAILURE'
    || run.status === 'PASS_WITH_KNOWN_BASELINE_FAILURE')
    && Number(run.p2bFailures) === 0 && Number(run.knownBaselineFailures) > 0) return 'conditional';
  if (run.status === 'FAIL' || Number(run.failed) > 0) return 'failed';
  if (run.status === 'PASS' || (Number.isInteger(run.passed) && Number(run.failed) === 0)) return 'passed';
  return 'pending';
}

function runTotal(run) {
  if (!run) return null;
  for (const field of ['tests', 'staticPages', 'localLinks', 'requiredFiles']) {
    if (Number.isInteger(run[field])) return run[field];
  }
  if (Number.isInteger(run.passed) && Number.isInteger(run.failed)) return run.passed + run.failed;
  return null;
}

const gates = data.verificationGates.map((gate) => {
  const matchingRuns = gate.runIds
    .map((id) => runsById.get(id))
    .filter(Boolean);
  const selectedRuns = gate.match === 'all' ? matchingRuns : matchingRuns.slice(0, 1);
  const missingIds = gate.match === 'all'
    ? gate.runIds.filter((id) => !runsById.has(id))
    : selectedRuns.length === 0 ? gate.runIds : [];
  const states = selectedRuns.map(classifyRun);
  const state = states.includes('failed')
    ? 'failed'
    : missingIds.length > 0 || states.includes('pending') || selectedRuns.length === 0
      ? 'pending'
      : states.includes('conditional') ? 'conditional' : 'passed';
  const totals = selectedRuns.map(runTotal);
  const total = totals.every(Number.isInteger)
    ? totals.reduce((sum, value) => sum + value, 0)
    : null;
  return {
    ...gate,
    matchedIds: selectedRuns.map((run) => run.id),
    missingIds,
    runs: selectedRuns,
    state,
    total,
    passed: selectedRuns.reduce((sum, run) => sum + (Number(run.passed) || 0), 0),
    failed: selectedRuns.reduce((sum, run) => sum + (Number(run.failed) || 0), 0),
  };
});
const supplementalRuns = data.supplementalRunIds.map((id) => {
  const run = runsById.get(id);
  return run
    ? { ...run, total: runTotal(run), state: classifyRun(run) }
    : { id, total: null, passed: 0, failed: 0, state: 'pending' };
});
const gateById = new Map(gates.map((gate) => [gate.id, gate]));
const gateState = (id) => gateById.get(id)?.state ?? 'pending';
const closureGateIds = ['model', 'standalone', 'browser', 'full', 'build'];
const closureStates = closureGateIds.map(gateState);
const acceptedStates = new Set(['passed', 'conditional']);
const allClosureAccepted = closureStates.every((state) => acceptedStates.has(state));
const anyGateFailed = gates.some((gate) => gate.state === 'failed');
const allGatesResolved = gates.every((gate) => acceptedStates.has(gate.state));
const anyConditional = gates.some((gate) => gate.state === 'conditional');
const overallState = anyGateFailed
  ? 'failed'
  : !allGatesResolved ? 'pending' : anyConditional ? 'conditional' : 'passed';
const currentSummary = allClosureAccepted
  ? verdictConfig.afterP2B.total
  : verdictConfig.beforeP2B.total;

const stateLabels = {
  passed: '확인됨',
  conditional: '조건부 확인',
  pending: '검증 대기',
  failed: '실패',
};
const overallLabels = {
  passed: '검증 완료',
  conditional: '검증 완료 · 기존 회귀 1건',
  pending: '검증 대기',
  failed: '검증 실패',
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const formatNumber = (value) => Number.isFinite(value)
  ? new Intl.NumberFormat('ko-KR').format(value)
  : '—';
const fileHref = (repositoryPath) => `../../${String(repositoryPath)
  .split('/')
  .map((segment) => encodeURIComponent(segment))
  .join('/')}`;
const renderEvidence = (paths) => `<ul class="evidence-links">${paths.map((repositoryPath) => (
  `<li><a href="${fileHref(repositoryPath)}">${escapeHtml(repositoryPath)}</a></li>`
)).join('')}</ul>`;

function requirementState() {
  if (closureStates.includes('failed')) return 'failed';
  if (allClosureAccepted) return closureStates.includes('conditional') ? 'conditional' : 'passed';
  return 'pending';
}

const renderRequirement = ({ id, requirement, override }) => {
  const state = requirementState();
  return `<details class="requirement" data-state="${state}" open>
    <summary>
      <span class="req-id">${escapeHtml(id)}</span>
      <span class="req-copy"><strong>${escapeHtml(requirement.title)}</strong><small>${escapeHtml(requirement.expected)}</small></span>
      <span class="status ${state}">${state === 'passed'
        ? '충족 확인'
        : state === 'conditional' ? '충족 확인 · 기존 결함 별도'
          : state === 'failed' ? '판정 보류' : '승격 후보 · 검증 대기'}</span>
    </summary>
    <div class="requirement-body">
      <section><h4>이전 판정</h4><p>${escapeHtml(override.from)} · ${escapeHtml(requirement.reason)}</p></section>
      <section><h4>구현된 닫힘 조건</h4><p>${escapeHtml(override.reason)}</p></section>
      <section><h4>판정 경계</h4><p>${escapeHtml(override.action)}</p></section>
      <section><h4>검증 상태</h4><p>${allClosureAccepted
        ? closureStates.includes('conditional')
          ? 'P2-B 관련 실패는 0건입니다. 기존 날짜 기준 회귀 1건은 별도 결함으로 남긴 채 충족 판정을 사용할 수 있습니다.'
          : '필수 종료 gate가 모두 확인되어 충족 판정을 사용할 수 있습니다.'
        : '코드 증거는 존재하지만 필수 종료 gate가 모두 끝날 때까지 최종 충족으로 확정하지 않습니다.'}</p></section>
      ${renderEvidence(override.currentEvidence ?? [])}
    </div>
  </details>`;
};

const renderDecision = (decision) => `<article class="decision">
  <div class="decision-index">${escapeHtml(decision.id)}</div>
  <div><h3>${escapeHtml(decision.title)}</h3><dl>
    <div><dt>충돌</dt><dd>${escapeHtml(decision.conflict)}</dd></div>
    <div><dt>이번 결정</dt><dd>${escapeHtml(decision.decision)}</dd></div>
    <div><dt>보호선</dt><dd>${escapeHtml(decision.guardrail)}</dd></div>
  </dl></div>
</article>`;

const renderGate = (gate) => {
  const result = gate.runs.length > 0 && gate.total !== null
    ? `${formatNumber(gate.passed)} / ${formatNumber(gate.total)}`
    : gate.runs.length > 0 ? '실행 수 미기록' : '실행 기록 없음';
  const command = gate.runs.length > 0
    ? gate.runs.map((run) => run.command).join(' + ')
    : `대기 중: ${gate.runIds.join(gate.match === 'all' ? ' + ' : ' 또는 ')}`;
  return `<tr class="gate-row" data-gate-state="${gate.state}">
    <td><strong>${escapeHtml(gate.label)}</strong><small>${escapeHtml(gate.description)}</small></td>
    <td><span class="status ${gate.state}">${stateLabels[gate.state]}</span></td>
    <td class="numeric">${escapeHtml(result)}</td>
    <td><code>${escapeHtml(command)}</code></td>
  </tr>`;
};

const renderScenario = (scenario) => {
  const model = gateState(scenario.modelGate);
  const runtime = gateState(scenario.runtimeGate);
  const combined = model === 'failed' || runtime === 'failed'
    ? 'failed'
    : acceptedStates.has(model) && acceptedStates.has(runtime)
      ? model === 'conditional' || runtime === 'conditional' ? 'conditional' : 'passed'
      : 'pending';
  return `<tr class="scenario-row" data-scenario-state="${combined}">
    <td><span class="scenario-id">${escapeHtml(scenario.id)}</span><strong>${escapeHtml(scenario.title)}</strong></td>
    <td>${escapeHtml(scenario.expected)}</td>
    <td><span class="status ${model}">모델 ${stateLabels[model]}</span></td>
    <td><span class="status ${runtime}">브라우저 ${stateLabels[runtime]}</span></td>
  </tr>`;
};

const previousFullRun = [...manifest.runs].reverse().find((run) => run.id === 'full-regression');
const traceVerdicts = manifest.coverage?.currentPrimaryVerdicts ?? {};
const external = manifest.externalEvidence ?? {};
const publish = manifest.publish ?? {};
const storage = manifest.storageBoundary ?? {};
const sourceHash = crypto.createHash('sha256')
  .update(fs.readFileSync(dataPath))
  .update('\u0000')
  .update(fs.readFileSync(repoPath(data.sourcePaths.verdicts)))
  .update('\u0000')
  .update(fs.readFileSync(repoPath(data.sourcePaths.manifest)))
  .digest('hex');

const reportData = JSON.stringify({
  dataVersion: data.version,
  stage: data.stage,
  overallState,
  overallLabel: overallLabels[overallState],
  allClosureAccepted,
  currentSummary,
  beforeP2B: verdictConfig.beforeP2B,
  afterP2B: verdictConfig.afterP2B,
  traceVerdicts,
  requirementIds: data.requirementIds,
  gates: gates.map(({ id, label, matchedIds, missingIds, state, total, passed, failed }) => ({
    id,
    label,
    matchedIds,
    missingIds,
    state,
    total,
    passed,
    failed,
  })),
  supplementalRuns,
  viewports: data.viewports,
  manifestVersion: manifest.version,
  manifestGeneratedAt: manifest.generatedAt ?? null,
  sourceHash,
}).replaceAll('<', '\\u003c');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23096772'/%3E%3Cpath d='M16 14h33v9H26v9h18v9H26v9h23v9H16z' fill='white'/%3E%3C/svg%3E">
  <title>${escapeHtml(data.title)}</title>
  <style>${style}</style>
</head>
<body>
  <a class="skip" href="#verdict">판정으로 바로 이동</a>
  <header class="topbar">
    <a class="brand" href="#top" aria-label="보고서 처음으로">FlowMe <span>P2-B 검증</span></a>
    <nav aria-label="보고서 구획">
      <a href="#verdict">판정</a>
      <a href="#decisions">결정</a>
      <a href="#requirements">요구</a>
      <a href="#manifest">Manifest</a>
      <a href="#txt">TXT</a>
      <a href="#scenarios">시나리오</a>
      <a href="#verification">검증</a>
    </nav>
  </header>

  <main class="page" id="top">
    <section class="hero">
      <div class="hero-main">
        <p class="meta">2026-09-03 · isolated functional PoC · evidence report</p>
        <h1>반복 회차와 완전 TXT,<br>끝났는지까지 검증합니다.</h1>
        <p class="lead">${escapeHtml(data.purpose)}</p>
        <div class="hero-actions">
          <a class="primary-action" id="open-standalone" href="./2026-09-02-flowme-integrated-flow-poc-standalone-ko.html">조작형 독립 HTML 열기</a>
          <a class="secondary-action" id="open-trace" href="./2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html">168개 추적표 열기</a>
        </div>
      </div>
      <aside class="hero-status ${overallState}" aria-label="P2-B 검증 상태">
        <span>종합 종료 판정</span>
        <strong id="overall-status">${overallLabels[overallState]}</strong>
        <p>${overallState === 'passed'
          ? '필수 model·standalone·browser·전체 회귀·build·docs gate가 모두 확인됐습니다.'
          : overallState === 'conditional'
            ? 'P2-B 관련 실패는 0건입니다. 기존 날짜 기준 회귀 1건은 별도 결함으로 남겼습니다.'
          : overallState === 'failed'
            ? '실패한 gate가 있어 충족 승격을 보류합니다.'
            : '필수 실행 기록이 모두 모일 때까지 충족 승격을 확정하지 않습니다.'}</p>
        <dl>
          <div><dt>이전 확정</dt><dd>${formatNumber(verdictConfig.beforeP2B.total.satisfied)} / ${formatNumber(verdictConfig.beforeP2B.total.total)}</dd></div>
          <div><dt>목표 판정</dt><dd>${formatNumber(verdictConfig.afterP2B.total.satisfied)} / ${formatNumber(verdictConfig.afterP2B.total.total)}</dd></div>
          <div><dt>확인된 gate</dt><dd>${gates.filter((gate) => gate.state === 'passed').length} / ${gates.length}</dd></div>
        </dl>
      </aside>
    </section>

    <section class="status-rail" aria-label="P2-B 핵심 계약">
      <div><span>닫을 갭</span><strong>2개</strong><small>D2-017 · D2-020</small></div>
      <div><span>원본 관계</span><strong>1 → N</strong><small>Item 1개 · occurrence N개</small></div>
      <div><span>결과 화면</span><strong>4개</strong><small>Text · Todo · Calendar · Sheet</small></div>
      <div><span>TXT 계약</span><strong>v${data.txtContract.version}</strong><small>화면 · 복사 · 다운로드 동일 byte</small></div>
    </section>

    <section class="section" id="verdict" tabindex="-1">
      <header class="section-head">
        <div><span>01</span><h2>목표 숫자와 종료 판정을 분리했습니다.</h2></div>
        <p><code>afterP2B</code>의 124개는 두 갭을 닫았을 때의 목표 판정입니다. 현재 보고서는 코드 파일의 존재만으로 종합 통과를 만들지 않고, 필수 fresh 실행이 빠져 있으면 “검증 대기”로 남깁니다.</p>
      </header>
      <div class="verdict-ledger">
        <article>
          <span>P2-B 전 확정 기준</span>
          <strong>${formatNumber(verdictConfig.beforeP2B.total.satisfied)}</strong>
          <p>충족 · 전체 ${formatNumber(verdictConfig.beforeP2B.total.total)}개</p>
        </article>
        <div class="ledger-arrow" aria-hidden="true">→</div>
        <article class="target">
          <span>두 항목 승격 목표</span>
          <strong>+2</strong>
          <p>D2-017 · D2-020</p>
        </article>
        <div class="ledger-arrow" aria-hidden="true">→</div>
        <article class="result ${overallState}">
          <span>이 보고서의 현재 종료 판정</span>
          <strong>${overallLabels[overallState]}</strong>
          <p>현재 사용할 수 있는 확정 충족 ${formatNumber(currentSummary.satisfied)}개</p>
        </article>
      </div>
      <div class="honesty-note">
        <strong>추적표 snapshot과의 관계</strong>
        <p>현재 verification manifest에는 충족 ${formatNumber(traceVerdicts.fulfilled)}개가 기록돼 있습니다. 이 숫자는 P2-B override 반영 상태이며, 이 보고서의 종료 gate 판정과 별개입니다. 빠진 실행이 있으면 보고서는 계속 검증 대기로 표시합니다.</p>
      </div>
    </section>

    <section class="section dark" id="decisions" tabindex="-1">
      <header class="section-head">
        <div><span>02</span><h2>정본 충돌을 세 가지 결정으로 고정했습니다.</h2></div>
        <p>원 개발 결과를 덮어쓰지 않고, 통합 PoC에서 필요한 확장만 좁게 허용했습니다. 이 결정은 운영 schema나 영구 제품 정책이 아닙니다.</p>
      </header>
      <div class="decision-list">${data.decisions.map(renderDecision).join('')}</div>
    </section>

    <section class="section" id="requirements" tabindex="-1">
      <header class="section-head">
        <div><span>03</span><h2>두 요구를 하나씩 원문과 맞췄습니다.</h2></div>
        <p>구현·테스트 파일은 직접 연결합니다. 상태 배지는 필수 종료 gate에서 계산하므로 아직 끝나지 않은 검증을 숨기지 않습니다.</p>
      </header>
      <div class="requirement-list">${targetRows.map(renderRequirement).join('')}</div>
    </section>

    <section class="section manifest-section" id="manifest" tabindex="-1">
      <header class="section-head">
        <div><span>04</span><h2>한 occurrence manifest가 모든 결과를 만듭니다.</h2></div>
        <p><code>sourceItemRef</code>는 원본 Item을 가리키고, <code>occurrenceId</code>는 원 발생일과 반복 signature로 고정됩니다. 실행 날짜를 옮겨도 occurrence identity는 바뀌지 않습니다.</p>
      </header>
      <div class="manifest-flow" aria-label="source Item에서 네 결과로 이어지는 occurrence manifest">
        <article class="source-node"><span>Canonical source</span><strong>Item 1개</strong><code>sourceItemRef</code></article>
        <div class="flow-arrow" aria-hidden="true">→</div>
        <article class="manifest-node"><span>occurrence contract v1</span><strong>안정적인 N개 회차</strong><code>occurrenceId · originalDate · index</code></article>
        <div class="flow-arrow split" aria-hidden="true">→</div>
        <div class="output-stack">${data.manifestOutputs.map((output) => `<article>
          <strong>${escapeHtml(output.name)}</strong><span>${escapeHtml(output.role)}</span><small>${escapeHtml(output.mustMatch)}</small>
        </article>`).join('')}</div>
      </div>
      <div class="contract-strip">
        <div><span>유한 반복</span><strong>기본 30회</strong><small>첫 회차 포함 · offset 확장</small></div>
        <div><span>종료 없는 반복</span><strong>기본 4주</strong><small>공통 window 확장</small></div>
        <div><span>3회 종료</span><strong>정확히 3행</strong><small>첫 날짜가 1회차</small></div>
        <div><span>무효 규칙</span><strong>fail-closed</strong><small>가짜 회차·저장 없음</small></div>
      </div>
    </section>

    <section class="section txt-section" id="txt" tabindex="-1">
      <header class="section-head">
        <div><span>05</span><h2>Complete TXT는 하나의 byte payload입니다.</h2></div>
        <p>화면에서 읽는 TXT, clipboard에 전달하는 문자열, 로컬 <code>.txt</code> Blob이 같은 normalized text를 사용합니다. Working Source는 별도 원문으로 남습니다.</p>
      </header>
      <div class="txt-layout">
        <div>
          <dl class="byte-contract">
            <div><dt>인코딩</dt><dd>${escapeHtml(data.txtContract.encoding)}</dd></div>
            <div><dt>BOM</dt><dd>${escapeHtml(data.txtContract.bom)}</dd></div>
            <div><dt>개행</dt><dd>${escapeHtml(data.txtContract.newline)}</dd></div>
            <div><dt>마지막 개행</dt><dd>${escapeHtml(data.txtContract.finalNewline)}</dd></div>
            <div><dt>행 끝 공백</dt><dd>${escapeHtml(data.txtContract.trailingSpaces)}</dd></div>
            <div><dt>번호</dt><dd>${escapeHtml(data.txtContract.numbering)}</dd></div>
          </dl>
          <div class="property-order"><strong>전용 속성 고정 순서</strong><ol>${data.txtContract.propertyOrder.map((property) => `<li>${escapeHtml(property)}</li>`).join('')}</ol></div>
        </div>
        <figure class="txt-sample"><figcaption>계약 예시 · 실제 출력 일치 여부는 자동 검증 gate로 판정</figcaption><pre>${escapeHtml(data.txtContract.sample)}</pre></figure>
      </div>
    </section>

    <section class="section dark" id="transitions" tabindex="-1">
      <header class="section-head">
        <div><span>06</span><h2>회차 조작은 shadow state에서만 움직입니다.</h2></div>
        <p>날짜 이동·완료·다시 열기·Undo·reload는 occurrence 단위 실행 기록입니다. source Item과 원 일정은 편집하지 않습니다.</p>
      </header>
      <ol class="transition-flow">
        <li><span>1</span><strong>회차 선택</strong><small>occurrenceId와 sourceItemRef 함께 검증</small></li>
        <li><span>2</span><strong>날짜 이동 또는 완료</strong><small>PoC shadow map만 변경</small></li>
        <li><span>3</span><strong>다시 열기·Undo</strong><small>해당 회차 snapshot만 복원</small></li>
        <li><span>4</span><strong>reload</strong><small>마지막 성공 상태만 복구</small></li>
      </ol>
      <div class="invariant"><strong>계속 불변</strong><span>source Item 수 1 · originalDate · Flow 소속 · 운영 flow:* byte · 기존 /my</span></div>
    </section>

    <section class="section" id="surfaces" tabindex="-1">
      <header class="section-head">
        <div><span>07</span><h2>React와 독립 HTML을 따로 판정합니다.</h2></div>
        <p>같은 계약을 구현했다는 코드 증거와 실제 브라우저에서 같은 조작 결과가 나온다는 증거는 서로 다른 gate입니다.</p>
      </header>
      <div class="surface-pair">
        <article><span>제품 내 격리 표면</span><h3>React exact-query PoC</h3><p><code>/my?personalWorkspacePoc=v1</code>에서 저장 Flow 결과의 회차를 조작합니다.</p><ul><li>result projection v3</li><li>occurrence shadow transition</li><li>Text/Todo/Calendar/Sheet</li><li>clipboard와 로컬 download</li></ul></article>
        <article><span>브라우저 파일 표면</span><h3>Standalone single-file</h3><p>서버 없이 파일로 열어 같은 회차·TXT 계약과 저장 경계를 조작합니다.</p><ul><li>동일 recurrence grammar</li><li>동일 stable occurrence identity</li><li>Undo·reload 복구</li><li>운영 key sentinel 비교</li></ul></article>
      </div>
    </section>

    <section class="section scenario-section" id="scenarios" tabindex="-1">
      <header class="section-head">
        <div><span>08</span><h2>시나리오 결과를 모델과 브라우저로 나눴습니다.</h2></div>
        <p>모델 통과만으로 조작 경험까지 통과했다고 쓰지 않습니다. 각 행에서 계약 검증과 실제 화면 검증 상태를 따로 확인할 수 있습니다.</p>
      </header>
      <div class="table-wrap"><table>
        <thead><tr><th>시나리오</th><th>기대 결과</th><th>순수 계약</th><th>실제 브라우저</th></tr></thead>
        <tbody>${data.scenarios.map(renderScenario).join('')}</tbody>
      </table></div>
    </section>

    <section class="section" id="boundary" tabindex="-1">
      <header class="section-head">
        <div><span>09</span><h2>운영 데이터 보호선을 별도 gate로 둡니다.</h2></div>
        <p>자동 브라우저 fixture의 byte 비교는 실제 사용자의 브라우저 profile이나 운영 backend 검사가 아닙니다. 증거 범위를 그대로 표시합니다.</p>
      </header>
      <div class="boundary-layout">
        <ul class="boundary-list">${data.boundaries.map((boundary) => `<li>${escapeHtml(boundary)}</li>`).join('')}</ul>
        <aside class="boundary-proof ${gateState('browser')}">
          <span>이번 P2-B browser boundary</span><strong>${stateLabels[gateState('browser')]}</strong>
          <dl><div><dt>prefix 밖 set</dt><dd>${gateState('browser') === 'passed' ? formatNumber(storage.writesOutsideAllowedPrefix) : '대기'}</dd></div><div><dt>prefix 밖 remove</dt><dd>${gateState('browser') === 'passed' ? formatNumber(storage.removesOutsideAllowedPrefix) : '대기'}</dd></div><div><dt>clear</dt><dd>${gateState('browser') === 'passed' ? formatNumber(storage.clearCalls) : '대기'}</dd></div><div><dt>운영 byte 변경</dt><dd>${gateState('browser') === 'passed' ? formatNumber(storage.operatingSentinelBytesChanged) : '대기'}</dd></div></dl>
        </aside>
      </div>
    </section>

    <section class="section verification-section" id="verification" tabindex="-1">
      <header class="section-head">
        <div><span>10</span><h2>실제 실행 기록으로만 상태가 바뀝니다.</h2></div>
        <p>표는 verification manifest의 run ID를 읽습니다. 기록이 없으면 0/0 PASS로 만들지 않고 “검증 대기”로 표시합니다.</p>
      </header>
      <div class="filterbar" aria-label="검증 gate 필터">
        <div>
          <button type="button" data-gate-filter="all" aria-pressed="true">전체 ${gates.length}</button>
          <button type="button" data-gate-filter="passed" aria-pressed="false">확인 ${gates.filter((gate) => gate.state === 'passed').length}</button>
          <button type="button" data-gate-filter="conditional" aria-pressed="false">조건부 ${gates.filter((gate) => gate.state === 'conditional').length}</button>
          <button type="button" data-gate-filter="pending" aria-pressed="false">대기 ${gates.filter((gate) => gate.state === 'pending').length}</button>
          <button type="button" data-gate-filter="failed" aria-pressed="false">실패 ${gates.filter((gate) => gate.state === 'failed').length}</button>
        </div>
        <span id="gate-count" aria-live="polite">${gates.length}건 표시</span>
      </div>
      <div class="table-wrap"><table class="gate-table">
        <thead><tr><th>검증 gate</th><th>상태</th><th>실행 결과</th><th>명령 또는 대기 run ID</th></tr></thead>
        <tbody>${gates.map(renderGate).join('')}</tbody>
      </table></div>
      <div class="supplemental-runs" aria-label="P2-B fresh 지원 실행">
        <h3>Fresh 지원 실행</h3>
        ${supplementalRuns.map((run) => `<article>
          <div><strong>${escapeHtml(run.label)}</strong><small>${escapeHtml(run.scope)}</small></div>
          <span class="status ${run.state}">${stateLabels[run.state]}</span>
          <strong class="supplemental-count">${formatNumber(run.passed)} / ${formatNumber(run.total)}</strong>
          <code>${escapeHtml(run.command)}</code>
        </article>`).join('')}
        <p>이 실행은 fresh 회귀 보강 증거입니다. 누락된 closure gate를 대신하거나 종합 종료 판정을 자동으로 올리지 않습니다.</p>
      </div>
      ${previousFullRun?.status === 'FAIL' ? `<div class="history-note"><strong>이전 전체 회귀 참고</strong><p>P2-A 시점의 <code>full-regression</code>은 ${formatNumber(previousFullRun.passed)} / ${formatNumber(runTotal(previousFullRun))}에서 중단됐습니다. ${escapeHtml(previousFullRun.failure?.summary ?? '')} 이 기록을 이번 P2-B fresh 전체 회귀로 대체하지 않습니다.</p></div>` : ''}
      <div class="viewport-grid" aria-label="브라우저 검사 화면">${data.viewports.map((viewport) => `<article><strong>${escapeHtml(viewport.label)}</strong><span>${formatNumber(viewport.width)} × ${formatNumber(viewport.height)}</span><small>${gateState('browser') === 'passed' ? 'P2-B 확인됨' : 'P2-B 검증 대기'}</small></article>`).join('')}</div>
    </section>

    <section class="section limits-section" id="limits" tabindex="-1">
      <header class="section-head">
        <div><span>11</span><h2>자동화 밖의 증거는 별도로 남깁니다.</h2></div>
        <p>화면 캡처와 Chromium 자동화는 실제 기기 검사나 관찰 사용자 검증이 아닙니다. publish도 사용자 승인 전에는 진행하지 않습니다.</p>
      </header>
      <div class="external-grid">
        <article><span>실제 Android Chrome</span><strong>${escapeHtml(external.androidChrome ?? '미실행')}</strong></article>
        <article><span>실제 iOS Safari</span><strong>${escapeHtml(external.iosSafari ?? '미실행')}</strong></article>
        <article><span>보조기술</span><strong>${escapeHtml(external.screenReader ?? '미실행')}</strong></article>
        <article class="users"><span>관찰 사용자</span><strong>${formatNumber(external.observedUsers ?? 0)}명</strong></article>
      </div>
      <div class="publish-grid">
        <div><span>commit</span><strong>${escapeHtml(publish.commit ?? '미진행')}</strong></div>
        <div><span>push</span><strong>${escapeHtml(publish.push ?? '미진행')}</strong></div>
        <div><span>PR</span><strong>${escapeHtml(publish.pullRequest ?? '미진행')}</strong></div>
        <div><span>Preview</span><strong>${escapeHtml(publish.preview ?? '미진행')}</strong></div>
        <div><span>Production</span><strong>${escapeHtml(publish.production ?? '미진행')}</strong></div>
      </div>
      <div class="remaining"><strong>남은 결함·의사결정</strong><ul>${data.remaining.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
    </section>

    <section class="source-footer" aria-label="보고서 생성 근거">
      <div><span>보고서 범위</span><strong>${escapeHtml(data.scope)}</strong></div>
      <div><span>manifest</span><strong id="manifest-version">v${formatNumber(manifest.version)}</strong></div>
      <div><span>source hash</span><code>${sourceHash}</code></div>
      <p>이 파일은 P2-B spec·요구 추적 행·판정 override·verification manifest에서 생성한 읽기 전용 검증 동반물입니다.</p>
    </section>
  </main>

  <footer><p>FlowMe 통합 PoC P2-B · 실제 기기 및 관찰 사용자 증거와 자동화 결과를 구분합니다.</p></footer>
  <script type="application/json" id="report-data">${reportData}</script>
  <script>
    (() => {
      const buttons = [...document.querySelectorAll('[data-gate-filter]')];
      const rows = [...document.querySelectorAll('.gate-row')];
      const count = document.querySelector('#gate-count');
      buttons.forEach((button) => button.addEventListener('click', () => {
        const filter = button.dataset.gateFilter;
        buttons.forEach((candidate) => candidate.setAttribute('aria-pressed', String(candidate === button)));
        let visible = 0;
        rows.forEach((row) => {
          const show = filter === 'all' || row.dataset.gateState === filter;
          row.hidden = !show;
          if (show) visible += 1;
        });
        if (count) count.textContent = visible + '건 표시';
      }));
    })();
  </script>
</body>
</html>
`;

const executableScripts = Array.from(html.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/gu))
  .map((match) => match[1])
  .join('\n');
if (/localStorage\.(?:setItem|removeItem|clear)/u.test(executableScripts)) {
  throw new Error('read-only report must not call localStorage writers');
}
if (overallState === 'pending' && !html.includes('검증 대기')) {
  throw new Error('pending verification must be visible in the report');
}
if (!html.includes('byte-for-byte') || !html.includes('관찰 사용자')) {
  throw new Error('evidence boundary copy is incomplete');
}

fs.writeFileSync(reportPath, html, 'utf8');
console.log(JSON.stringify({
  report: path.relative(repositoryRoot, reportPath).replaceAll('\\', '/'),
  stage: data.stage,
  overallState,
  gates: Object.fromEntries(gates.map((gate) => [gate.id, gate.state])),
  requirements: targetRows.map((row) => row.id),
  sourceHash,
}, null, 2));
