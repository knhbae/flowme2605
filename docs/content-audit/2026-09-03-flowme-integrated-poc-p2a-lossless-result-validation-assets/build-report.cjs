const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const here = __dirname;
const repositoryRoot = path.resolve(here, '..', '..', '..');
const reportName = '2026-09-03-flowme-integrated-poc-p2a-lossless-result-validation-ko.html';
const reportPath = path.resolve(here, '..', reportName);
const traceAssets = path.resolve(
  here,
  '..',
  '2026-09-02-flowme-integrated-poc-requirements-traceability-assets',
);
const manifestPath = path.join(traceAssets, 'verification-manifest.json');
const overridePath = path.resolve(
  repositoryRoot,
  'docs',
  'specs',
  '2026-09-03-flowme-integrated-poc-lossless-result-closure-v1',
  'current-verdict-overrides.json',
);
const stylePath = path.join(here, 'style.css');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const manifest = readJson(manifestPath);
const verdictConfig = readJson(overridePath);
const style = fs.readFileSync(stylePath, 'utf8');

if (!Number.isInteger(manifest.version) || manifest.version < 2) {
  throw new Error(`verification manifest version 2+ required, got ${manifest.version}`);
}
if (!Array.isArray(manifest.runs)) throw new Error('verification manifest runs must be an array');
if (!verdictConfig.beforeP2A || !verdictConfig.afterP2A || !Array.isArray(verdictConfig.overrides)) {
  throw new Error('current verdict overrides are incomplete');
}

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const formatNumber = (value) => Number.isFinite(value)
  ? new Intl.NumberFormat('ko-KR').format(value)
  : '기록 없음';
const formatPercent = (value, total) => total > 0
  ? `${((value / total) * 100).toFixed(1)}%`
  : '—';
const fileHref = (repositoryPath) => `../../${String(repositoryPath)
  .split('/')
  .map((segment) => encodeURIComponent(segment))
  .join('/')}`;

const verdictKeys = ['satisfied', 'partial', 'missing', 'intentionalChange', 'excluded'];
const verdictLabels = {
  satisfied: '충족',
  partial: '부분',
  missing: '미구현',
  intentionalChange: '의도 변경',
  excluded: '제외',
};
const assertVerdictSummary = (label, summary) => {
  if (!summary || !Number.isInteger(summary.total)) throw new Error(`${label} total is missing`);
  const sum = verdictKeys.reduce((total, key) => {
    if (!Number.isInteger(summary[key]) || summary[key] < 0) {
      throw new Error(`${label}.${key} is invalid`);
    }
    return total + summary[key];
  }, 0);
  if (sum !== summary.total) throw new Error(`${label} verdict sum ${sum} does not match ${summary.total}`);
};

['V41', 'D1', 'D2', 'total'].forEach((product) => {
  assertVerdictSummary(`beforeP2A.${product}`, verdictConfig.beforeP2A[product]);
  assertVerdictSummary(`afterP2A.${product}`, verdictConfig.afterP2A[product]);
});
const afterProductTotal = ['V41', 'D1', 'D2']
  .reduce((total, product) => total + verdictConfig.afterP2A[product].total, 0);
if (afterProductTotal !== verdictConfig.afterP2A.total.total) {
  throw new Error('P2-A product totals do not match the total summary');
}

const requirementFiles = Object.entries(verdictConfig.base ?? {});
const requirementRows = requirementFiles.flatMap(([product, repositoryPath]) => {
  const rows = readJson(path.resolve(repositoryRoot, repositoryPath));
  if (!Array.isArray(rows)) throw new Error(`${repositoryPath} must contain an array`);
  return rows.map((row) => ({ ...row, product: row.product ?? product }));
});
const requirementById = new Map(requirementRows.map((row) => [row.id, row]));
if (requirementRows.length !== verdictConfig.afterP2A.total.total) {
  throw new Error(
    `requirement source count ${requirementRows.length} does not match ${verdictConfig.afterP2A.total.total}`,
  );
}

const lastOverrideById = new Map();
verdictConfig.overrides.forEach((override) => lastOverrideById.set(override.id, override));
const targetDefinitions = [
  { id: 'D1-020', kind: 'promoted', expectedTo: '충족' },
  { id: 'D2-024', kind: 'promoted', expectedTo: '충족' },
  { id: 'D2-025', kind: 'promoted', expectedTo: '충족' },
  { id: 'D2-017', kind: 'partial', expectedTo: '부분' },
  { id: 'D2-020', kind: 'partial', expectedTo: '부분' },
  { id: 'D2-023', kind: 'partial', expectedTo: '부분' },
];
const targetRows = targetDefinitions.map((definition) => {
  const requirement = requirementById.get(definition.id);
  const override = lastOverrideById.get(definition.id);
  if (!requirement) throw new Error(`missing source requirement ${definition.id}`);
  if (!override) throw new Error(`missing P2-A verdict override ${definition.id}`);
  if (override.to !== definition.expectedTo) {
    throw new Error(`${definition.id} expected ${definition.expectedTo}, got ${override.to}`);
  }
  return { ...definition, requirement, override };
});
const promotedRows = targetRows.filter((row) => row.kind === 'promoted');
const partialRows = targetRows.filter((row) => row.kind === 'partial');

const runTotal = (run) => {
  for (const field of ['tests', 'staticPages', 'localLinks', 'requiredFiles']) {
    if (Number.isInteger(run[field])) return run[field];
  }
  if (Number.isInteger(run.passed) && Number.isInteger(run.failed)) return run.passed + run.failed;
  return null;
};
const runState = (run) => (run.status === 'FAIL' || Number(run.failed) > 0 ? 'failed' : 'passed');
const runs = manifest.runs.map((run) => ({ ...run, total: runTotal(run), state: runState(run) }));
const focusPattern = /(?:p2a|lossless|result-projection|personal-workspace-poc-model|standalone-model|standalone-runtime-browser|full-regression$|production-build$|documentation-check$)/iu;
const focusRuns = runs.filter((run) => focusPattern.test(String(run.id)));
const passingRuns = runs.filter((run) => run.state === 'passed').length;
const failingRuns = runs.length - passingRuns;
const viewports = [...new Set((manifest.browser?.viewports ?? []).map(String))];
const nonExcluded = verdictConfig.afterP2A.total.total - verdictConfig.afterP2A.total.excluded;
const coverageFully = formatPercent(verdictConfig.afterP2A.total.satisfied, nonExcluded);
const coverageWithPartial = formatPercent(
  verdictConfig.afterP2A.total.satisfied + verdictConfig.afterP2A.total.partial,
  nonExcluded,
);
const fullRegression = runs.find((run) => run.id === 'full-regression');

const sourceHash = crypto.createHash('sha256')
  .update(fs.readFileSync(manifestPath))
  .update('\u0000')
  .update(fs.readFileSync(overridePath))
  .digest('hex');
const builtAt = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'long',
  timeStyle: 'medium',
  timeZone: 'Asia/Seoul',
}).format(new Date());

const renderVerdictMetrics = (summary) => verdictKeys.map((key) => `
  <article class="metric" data-verdict="${key}">
    <span>${verdictLabels[key]}</span>
    <strong id="metric-${key}">${formatNumber(summary[key])}</strong>
  </article>`).join('');

const renderStateSummary = (label, summary, className) => `<article class="state ${className}">
  <h3>${escapeHtml(label)}</h3>
  <dl>${verdictKeys.map((key) => `<div><dt>${verdictLabels[key]}</dt><dd>${formatNumber(summary[key])}</dd></div>`).join('')}</dl>
</article>`;

const productNames = {
  V41: 'v4.1 UI',
  D1: '개발 1',
  D2: '개발 2',
};
const renderSourceCard = (product) => {
  const summary = verdictConfig.afterP2A[product];
  return `<article class="source-card" data-product="${product}">
    <header><h3>${escapeHtml(productNames[product])}</h3><span>${product} · ${formatNumber(summary.total)}개</span></header>
    <dl>${verdictKeys.map((key) => `<div><dt>${verdictLabels[key]}</dt><dd>${formatNumber(summary[key])}</dd></div>`).join('')}</dl>
  </article>`;
};

const renderEvidenceFiles = (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    return '<p>구조화된 증거 파일 경로가 아직 기록되지 않았습니다.</p>';
  }
  return `<ul class="evidence-files">${files.map((file) => `<li><a href="${fileHref(file)}">${escapeHtml(file)}</a></li>`).join('')}</ul>`;
};

const renderRequirement = (row) => {
  const { requirement, override } = row;
  const stateLabel = row.kind === 'promoted'
    ? `${override.from} → ${override.to}`
    : `${override.to} 유지`;
  return `<details class="requirement-card" data-kind="${row.kind}" ${row.kind === 'partial' ? 'open' : ''}>
    <summary>
      <span class="req-id">${escapeHtml(row.id)}</span>
      <span class="req-title">${escapeHtml(requirement.title)}</span>
      <span class="chip ${row.kind === 'partial' ? 'partial' : ''}">${escapeHtml(stateLabel)}</span>
    </summary>
    <div class="requirement-body">
      <section><h4>원 요구</h4><p>${escapeHtml(requirement.expected)}</p></section>
      <section><h4>이번 판정 근거</h4><p>${escapeHtml(override.evidence)}</p></section>
      <section><h4>현재 판정 이유</h4><p>${escapeHtml(override.reason)}</p></section>
      <section><h4>남은 조치</h4><p>${escapeHtml(override.action)}</p></section>
      ${renderEvidenceFiles(override.currentEvidence)}
    </div>
  </details>`;
};

const renderRunRow = (run) => {
  const result = run.total === null
    ? '실행 수 미기록'
    : `${formatNumber(run.passed)} / ${formatNumber(run.total)}`;
  const note = run.failure?.summary ?? run.scope ?? '';
  return `<tr class="run-row ${run.state}" data-run-id="${escapeHtml(run.id)}" data-run-state="${run.state}">
    <td><strong>${escapeHtml(run.id)}</strong>${note ? `<br><small>${escapeHtml(note)}</small>` : ''}</td>
    <td class="result">${escapeHtml(result)}</td>
    <td><span class="chip ${run.state === 'failed' ? 'partial' : ''}">${run.state === 'failed' ? 'FAIL' : 'PASS'}</span></td>
    <td><code>${escapeHtml(run.command)}</code></td>
  </tr>`;
};

const renderRunTable = (runRows, emptyMessage) => runRows.length > 0
  ? `<div class="run-table-wrap"><table class="run-table">
      <thead><tr><th>실행</th><th>통과 / 전체</th><th>판정</th><th>실제 명령</th></tr></thead>
      <tbody>${runRows.map(renderRunRow).join('')}</tbody>
    </table></div>`
  : `<div class="manual-note"><strong>전용 실행 기록 대기</strong><p>${escapeHtml(emptyMessage)}</p></div>`;

const renderStatusList = (source, labels) => `<dl class="status-list">${Object.entries(labels)
  .map(([key, label]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(source?.[key] ?? '기록 없음')}</dd></div>`)
  .join('')}</dl>`;

const reportData = JSON.stringify({
  beforeP2A: verdictConfig.beforeP2A,
  afterP2A: verdictConfig.afterP2A,
  targetIds: targetRows.map((row) => row.id),
  promotedIds: promotedRows.map((row) => row.id),
  partialIds: partialRows.map((row) => row.id),
  manifestVersion: manifest.version,
  manifestGeneratedAt: manifest.generatedAt,
  manifestRunCount: runs.length,
  focusRunIds: focusRuns.map((run) => run.id),
  viewports,
  storageBoundary: manifest.storageBoundary,
  singleFiles: manifest.singleFiles,
  externalEvidence: manifest.externalEvidence,
  publish: manifest.publish,
  sourceHash,
  builtAt,
}).replaceAll('<', '\\u003c');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23087f71'/%3E%3Cpath d='M17 15h31v9H27v9h17v9H27v16H17z' fill='white'/%3E%3C/svg%3E">
  <title>FlowMe 통합 PoC P2-A 무손실 결과 검증</title>
  <style>${style}</style>
</head>
<body>
  <a class="skip" href="#verdict">최종 판정으로 이동</a>
  <header class="topbar">
    <span class="brand">FlowMe · P2-A 검증</span>
    <nav class="topnav" aria-label="보고서 구획">
      <a href="#verdict">판정</a>
      <a href="#requirements">6개 항목</a>
      <a href="#surfaces">두 표면</a>
      <a href="#lossless">무손실</a>
      <a href="#tests">테스트</a>
      <a href="#limits">미실행</a>
    </nav>
  </header>

  <main class="page">
    <section class="hero">
      <div>
        <p class="eyebrow">2026-09-03 · integrated poc · p2-a</p>
        <h1>P2-A 무손실 결과 검증</h1>
        <p class="lead">v4.1 UI·개발 1·개발 2의 원자 요구 168개를 다시 판정했습니다. 같은 원본의 복수 사본, 결과 화면, 표·장문 원문 보존을 구현 증거와 남은 범위로 나눠 보여 줍니다.</p>
        <p class="scope-note"><strong>증거 성격</strong><span>이 독립 HTML은 코드·자동 테스트 결과를 읽기 쉽게 묶은 수동 검토 동반물입니다. 실제 기기 검사나 관찰 사용자 검증이 아닙니다.</span></p>
      </div>
      <aside class="hero-verdict" aria-label="P2-A 최종 판정 요약">
        <div><span>현재 충족</span><strong id="hero-satisfied">${formatNumber(verdictConfig.afterP2A.total.satisfied)} / ${formatNumber(verdictConfig.afterP2A.total.total)}</strong><p>제외도 전체 168개 안에 별도 집계</p></div>
        <div><span>이번 실제 승격</span><strong id="hero-promoted">${formatNumber(promotedRows.length)}건</strong><p>${promotedRows.map((row) => row.id).join(' · ')}</p></div>
        <div class="partial"><span>부분 유지</span><strong id="hero-partial-kept">${formatNumber(partialRows.length)}건</strong><p>${partialRows.map((row) => row.id).join(' · ')}</p></div>
      </aside>
      <div class="action-row">
        <a class="action" id="open-standalone" href="./2026-09-02-flowme-integrated-flow-poc-standalone-ko.html">조작형 독립 HTML 열기</a>
        <a class="action secondary" id="open-trace" href="./2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html">168개 갱신 추적표 열기</a>
      </div>
    </section>

    <div class="metric-rail" aria-label="P2-A 이후 168개 판정">
      ${renderVerdictMetrics(verdictConfig.afterP2A.total)}
    </div>

    <section class="section" id="verdict" tabindex="-1">
      <header class="section-head">
        <div><p class="eyebrow">01 · honest verdict</p><h2>119에서 122로, 세 항목만 승격했습니다.</h2></div>
        <p>숫자는 <code>current-verdict-overrides.json</code>의 전후 집계를 그대로 읽습니다. 부분 구현을 충족으로 올리지 않았고, 의도 변경과 제외도 충족 분모에 섞지 않았습니다.</p>
      </header>
      <div class="before-after">
        ${renderStateSummary('P2-A 전', verdictConfig.beforeP2A.total, 'before')}
        <div class="arrow" aria-hidden="true">→</div>
        ${renderStateSummary('P2-A 후', verdictConfig.afterP2A.total, 'after')}
      </div>
      <div class="ratio-strip">
        <div><span>제외 ${formatNumber(verdictConfig.afterP2A.total.excluded)}개를 뺀 완전 충족률</span><strong>${formatNumber(verdictConfig.afterP2A.total.satisfied)} / ${formatNumber(nonExcluded)} · ${coverageFully}</strong></div>
        <div><span>충족+부분 적용 범위</span><strong>${formatNumber(verdictConfig.afterP2A.total.satisfied + verdictConfig.afterP2A.total.partial)} / ${formatNumber(nonExcluded)} · ${coverageWithPartial}</strong></div>
      </div>
      <div class="source-grid">
        ${['V41', 'D1', 'D2'].map(renderSourceCard).join('')}
      </div>
    </section>

    <section class="section" id="requirements" tabindex="-1">
      <header class="section-head">
        <div><p class="eyebrow">02 · requirement decisions</p><h2>승격 3건과 부분 유지 3건</h2></div>
        <p>각 행을 열면 원 요구, 실제 구현 근거, 현재 판정 이유, 다음 조치를 한자리에서 볼 수 있습니다. 증거 경로도 override JSON에서 읽어 직접 연결합니다.</p>
      </header>
      <div class="filterbar">
        <div class="filter-group" aria-label="P2-A 요구 필터">
          <button class="filter-button" type="button" data-requirement-filter="all" aria-pressed="true">전체 ${targetRows.length}</button>
          <button class="filter-button" type="button" data-requirement-filter="promoted" aria-pressed="false">승격 ${promotedRows.length}</button>
          <button class="filter-button" type="button" data-requirement-filter="partial" aria-pressed="false">부분 유지 ${partialRows.length}</button>
        </div>
        <span class="filter-meta" id="requirement-count" aria-live="polite">${targetRows.length}건 표시</span>
      </div>
      <div class="requirement-list">
        ${targetRows.map(renderRequirement).join('')}
      </div>
    </section>

    <section class="section" id="surfaces" tabindex="-1">
      <header class="section-head">
        <div><p class="eyebrow">03 · react / standalone</p><h2>두 실행 표면에 같은 계약을 연결했습니다.</h2></div>
        <p>React 제품 PoC와 내려받아 여는 단일 HTML은 같은 identity·effective Item·결과 payload를 사용합니다. 화면 전환과 미리보기는 원본 source나 운영 writer를 바꾸지 않습니다.</p>
      </header>
      <div class="surface-grid">
        <article class="surface react">
          <h3>React 제품 PoC</h3>
          <p><code>/my?personalWorkspacePoc=v1</code>과 작성 화면에서 확인하는 통합 표면입니다.</p>
          <ul><li>활성 복수 사본에만 결정적 ordinal label</li><li>일요일 시작 7열·42칸 월간 결과와 날짜 미정 분리</li><li>TXT 복사·다운로드, CSV 다운로드</li><li>안전한 표 projection과 exact raw fallback</li></ul>
          <span class="surface-path"><code>components/flow/personal-workspace-poc/</code></span>
        </article>
        <article class="surface standalone">
          <h3>조작형 독립 HTML</h3>
          <p>브라우저에서 파일로 열어 같은 목록·상세·결과·무손실 상태를 직접 검토합니다.</p>
          <ul><li>목록·검색·상세의 동일 사본 구분</li><li>월 이동·선택일·날짜 미정 결과 전환</li><li>명시 클릭으로 메모리 Blob 다운로드</li><li>표와 장문 block의 safe/raw 표시</li></ul>
          <span class="surface-path"><code>docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko.html</code></span>
        </article>
      </div>
    </section>

    <section class="section" id="downloads" tabindex="-1">
      <header class="section-head">
        <div><p class="eyebrow">04 · download bytes</p><h2>다운로드 형식과 배포 파일 byte를 구분했습니다.</h2></div>
        <p>TXT·CSV 결과 payload 계약과 단일 HTML·Android 전달 사본의 동일성은 다른 증거입니다. 둘을 하나의 “다운로드 성공”으로 합치지 않습니다.</p>
      </header>
      <div class="contract-grid">
        <article class="contract" data-index="01"><h3>TXT MIME</h3><p><code>text/plain;charset=utf-8</code></p><ul><li>본문 개행 LF 정규화</li><li>UTF-8 BOM 없음</li></ul></article>
        <article class="contract" data-index="02"><h3>CSV MIME</h3><p><code>text/csv;charset=utf-8</code></p><ul><li>UTF-8 BOM 포함</li><li>행 끝 CRLF</li></ul></article>
        <article class="contract" data-index="03"><h3>CSV escaping</h3><p>RFC 4180 방식의 큰따옴표 escape</p><ul><li>결정적 filename</li><li>경로·제어문자 제외</li></ul></article>
        <article class="contract" data-index="04"><h3>쓰기 경계</h3><p>사용자 명시 클릭과 메모리 Blob만 사용</p><ul><li>운영 export writer 호출 안 함</li><li>source mutation 0</li></ul></article>
      </div>
      <div class="byte-proof" aria-label="manifest 단일 파일 byte 증거">
        <div><span>독립 HTML bytes</span><strong>${formatNumber(manifest.singleFiles?.standaloneBytes)}</strong></div>
        <div><span>Android 사본 bytes</span><strong>${formatNumber(manifest.singleFiles?.androidBytes)}</strong></div>
        <div><span>manifest byte 판정 · SHA-256</span><strong>${manifest.singleFiles?.byteEqual === true ? '동일' : manifest.singleFiles?.byteEqual === false ? '다름' : '기록 없음'}</strong><code>${escapeHtml(manifest.singleFiles?.sha256 ?? '기록 없음')}</code></div>
      </div>
    </section>

    <section class="section" id="lossless" tabindex="-1">
      <header class="section-head">
        <div><p class="eyebrow">05 · 31-case corpus</p><h2>구조화보다 원문 보존을 먼저 판정했습니다.</h2></div>
        <p>31개 정본 fixture는 출처와 원문 bytes를 갖습니다. 안전한 표만 SourceRow preview로 보이고, 모호하거나 위험하면 전체 raw text로 돌아갑니다.</p>
      </header>
      <div class="lossless-grid">
        <article class="lossless safe"><h3>안전한 표</h3><p>열 수와 delimiter가 결정적인 Markdown·CSV·TSV만 행·cell locator로 투영합니다.</p><ul><li>원문 slice 위치 유지</li><li>cell·row stable id</li><li>원문 round trip</li></ul></article>
        <article class="lossless raw"><h3>표·장문 fallback</h3><p>열 수 불일치, 닫히지 않은 quote, 혼합 delimiter, 위험 HTML은 잘라내거나 추측하지 않습니다.</p><ul><li>blockquote·code fence 보존</li><li>HTML/comment·빈 줄 보존</li><li>LF·CRLF·CR·mixed ending 보존</li></ul></article>
        <article class="lossless zero"><h3>자동 합성 0</h3><p>preview adapter는 표 행을 실행 행동으로 해석하지 않습니다.</p><ul><li>generated Item 0</li><li>generated Todo 0</li><li>generated Calendar 0</li></ul></article>
      </div>
      <div class="corpus-line"><strong>31개 canonical corpus</strong><span>React와 standalone의 status·rawText·lineEnding·headers·row locator·fallback·source mutation 의미를 맞추는 자동 계약입니다. UI에서 31개 사례를 고르는 QA picker는 아직 없어 D2-023은 부분으로 남습니다.</span></div>
    </section>

    <section class="section" id="boundary" tabindex="-1">
      <header class="section-head">
        <div><p class="eyebrow">06 · boundary / viewport</p><h2>저장 경계와 화면 검사를 따로 읽습니다.</h2></div>
        <p>아래 값은 <code>verification-manifest.json</code>의 현재 기록입니다. 사용자의 실제 브라우저 profile이나 운영 backend를 직접 검사한 결과로 확대 해석하지 않습니다.</p>
      </header>
      <div class="boundary-grid">
        <article class="boundary-card"><span>허용 prefix 밖 setItem</span><strong>${formatNumber(manifest.storageBoundary?.writesOutsideAllowedPrefix)}</strong><p>${escapeHtml(manifest.storageBoundary?.scope ?? '검증 범위 기록 없음')}</p></article>
        <article class="boundary-card"><span>허용 prefix 밖 removeItem</span><strong>${formatNumber(manifest.storageBoundary?.removesOutsideAllowedPrefix)}</strong><p><code>flow:poc:personal-workspace:v1:*</code> 이외 쓰기 금지</p></article>
        <article class="boundary-card"><span>localStorage.clear()</span><strong>${formatNumber(manifest.storageBoundary?.clearCalls)}</strong><p>초기화는 정확한 PoC prefix만 제거</p></article>
        <article class="boundary-card"><span>운영 sentinel bytes 변경</span><strong>${formatNumber(manifest.storageBoundary?.operatingSentinelBytesChanged)}</strong><p>${escapeHtml(manifest.storageBoundary?.note ?? '추가 설명 없음')}</p></article>
      </div>
      <div class="viewport-list" aria-label="manifest viewport 기록">
        ${viewports.length > 0 ? viewports.map((viewport) => `<div data-viewport="${escapeHtml(viewport)}"><strong>${escapeHtml(viewport.replace('x', ' × '))}</strong><span>manifest 자동 검사 기록</span></div>`).join('') : '<div><strong>기록 없음</strong><span>manifest browser.viewports가 비어 있습니다.</span></div>'}
      </div>
    </section>

    <section class="section" id="tests" tabindex="-1">
      <header class="section-head">
        <div><p class="eyebrow">07 · executed evidence</p><h2>실제 실행 수는 manifest만 표시합니다.</h2></div>
        <p>이 HTML에는 테스트 통과 개수를 고정해서 쓰지 않았습니다. builder를 다시 실행하면 manifest의 실행 수·통과·실패·명령이 그대로 갱신됩니다.</p>
      </header>
      <div class="evidence-grid">
        <article class="evidence-card"><span>manifest 버전</span><strong id="manifest-version">v${formatNumber(manifest.version)}</strong><p>${escapeHtml(manifest.generatedAt ?? '생성 시각 기록 없음')}</p></article>
        <article class="evidence-card"><span>기록된 실행</span><strong id="manifest-run-count">${formatNumber(runs.length)}개</strong><p>테스트·브라우저·build·문서 실행을 합산하지 않고 행별 표시</p></article>
        <article class="evidence-card"><span>PASS 실행</span><strong>${formatNumber(passingRuns)}개</strong><p>각 실행의 내부 test 수와 별도인 run 개수</p></article>
        <article class="evidence-card ${failingRuns > 0 ? 'failed' : ''}"><span>FAIL 실행</span><strong>${formatNumber(failingRuns)}개</strong><p>실패가 있으면 전체 성공으로 바꾸지 않음</p></article>
      </div>
      <div class="filterbar" style="margin-top: 15px">
        <div class="filter-group" aria-label="검증 실행 필터">
          <button class="filter-button" type="button" data-run-filter="all" aria-pressed="true">전체</button>
          <button class="filter-button" type="button" data-run-filter="passed" aria-pressed="false">PASS</button>
          <button class="filter-button" type="button" data-run-filter="failed" aria-pressed="false">FAIL</button>
        </div>
        <span class="filter-meta" id="run-count" aria-live="polite">${focusRuns.length}개 핵심 실행 표시</span>
      </div>
      ${renderRunTable(focusRuns, 'manifest에 P2-A·무손실 관련 전용 run id가 아직 없습니다. 최종 실행 기록을 manifest에 추가한 뒤 builder를 다시 실행해야 합니다.')}
      ${fullRegression?.state === 'failed' ? `<article class="regression-note"><strong>전체 회귀 판정: FAIL</strong><p>${escapeHtml(fullRegression.failure?.summary ?? 'manifest에 실패 상세가 기록되지 않았습니다.')} 별도 tail 실행은 이 실행을 PASS로 바꾸지 않습니다.</p></article>` : ''}
      <details class="all-runs"><summary>manifest 전체 실행 원장 ${formatNumber(runs.length)}개 보기</summary>${renderRunTable(runs, '실행 기록이 없습니다.')}</details>
    </section>

    <section class="section" id="limits" tabindex="-1">
      <header class="section-head">
        <div><p class="eyebrow">08 · external / publish</p><h2>미실행과 미게시를 분리해서 남깁니다.</h2></div>
        <p>자동 브라우저와 화면 캡처는 실제 Android Chrome·iOS Safari 검사도, 관찰 사용자의 성공률 증거도 아닙니다. 게시 상태도 기능 검증과 별개입니다.</p>
      </header>
      <div class="external-publish">
        <div>
          ${renderStatusList(manifest.externalEvidence, {
            androidChrome: '실제 Android Chrome',
            iosSafari: '실제 iOS Safari',
            screenReader: '스크린리더',
            browserZoom200Percent: '브라우저 200% 확대',
          })}
          <div style="height: 14px"></div>
          ${renderStatusList(manifest.publish, {
            commit: 'commit',
            push: 'push',
            pullRequest: 'PR',
            preview: 'Preview',
            production: 'Production',
          })}
        </div>
        <aside class="observed"><span>관찰 사용자 수</span><strong>${formatNumber(manifest.externalEvidence?.observedUsers)}명</strong><p>수동 검토 동반물과 자동화 결과를 관찰 사용자 검증으로 세지 않았습니다.</p></aside>
      </div>
      <article class="manual-note"><strong>이 보고서의 용도</strong><p>독립 HTML을 열어 구현·판정·증거 경로를 사람이 검토하는 데 쓰는 문서입니다. 제품 배포물, 실제 기기 인증서, 관찰 사용자 조사 결과가 아닙니다.</p></article>
    </section>
  </main>

  <footer class="footer">
    <p><strong>빌드:</strong> ${escapeHtml(builtAt)} · <strong>manifest:</strong> v${formatNumber(manifest.version)} / ${escapeHtml(manifest.generatedAt ?? '시각 기록 없음')}</p>
    <p><strong>입력:</strong> verification-manifest.json + current-verdict-overrides.json · <strong>SHA-256:</strong> <code>${sourceHash}</code></p>
    <p>입력 JSON이 바뀌면 <code>assets/build-report.cjs</code>를 다시 실행해야 이 단일 HTML에 반영됩니다.</p>
  </footer>

  <script id="report-data" type="application/json">${reportData}</script>
  <script>
    (() => {
      const requirementCards = [...document.querySelectorAll('.requirement-card')];
      const requirementCount = document.querySelector('#requirement-count');
      document.querySelectorAll('[data-requirement-filter]').forEach((button) => {
        button.addEventListener('click', () => {
          const filter = button.dataset.requirementFilter;
          document.querySelectorAll('[data-requirement-filter]').forEach((item) => {
            item.setAttribute('aria-pressed', String(item === button));
          });
          let visible = 0;
          requirementCards.forEach((card) => {
            const show = filter === 'all' || card.dataset.kind === filter;
            card.hidden = !show;
            if (show) visible += 1;
          });
          requirementCount.textContent = visible + '건 표시';
        });
      });

      const focusRunRows = [...document.querySelectorAll('#tests > .run-table-wrap .run-row')];
      const runCount = document.querySelector('#run-count');
      document.querySelectorAll('[data-run-filter]').forEach((button) => {
        button.addEventListener('click', () => {
          const filter = button.dataset.runFilter;
          document.querySelectorAll('[data-run-filter]').forEach((item) => {
            item.setAttribute('aria-pressed', String(item === button));
          });
          let visible = 0;
          focusRunRows.forEach((row) => {
            const show = filter === 'all' || row.dataset.runState === filter;
            row.hidden = !show;
            if (show) visible += 1;
          });
          runCount.textContent = visible + '개 핵심 실행 표시';
        });
      });
    })();
  </script>
</body>
</html>`;

fs.writeFileSync(reportPath, html, 'utf8');
console.log(JSON.stringify({
  report: reportPath,
  bytes: Buffer.byteLength(html),
  manifestVersion: manifest.version,
  manifestRuns: runs.length,
  focusRuns: focusRuns.length,
  verdict: verdictConfig.afterP2A.total,
  promoted: promotedRows.map((row) => row.id),
  partialKept: partialRows.map((row) => row.id),
  viewports,
  sourceHash,
}, null, 2));
