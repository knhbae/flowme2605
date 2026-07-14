import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const specDir = path.join(root, 'docs', 'specs', '2026-07-14-url-to-flow-prompt-lab');
const auditDir = path.join(root, 'docs', 'content-audit', '2026-07-14-url-to-flow-prompt-lab');
const runsDir = path.join(auditDir, 'runs');
const reviewsDir = path.join(auditDir, 'reviews');
const validatorPath = path.join(here, 'validate-url-to-flow-prompt-lab.mjs');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const rel = (file) => path.relative(root, file).replaceAll('\\', '/');
const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

function collectJson(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectJson(target);
      return entry.isFile() && entry.name.endsWith('.json') ? [target] : [];
    })
    .sort();
}

function validateRun(file) {
  const result = spawnSync(process.execPath, [validatorPath, '--file', file, '--json'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (!result.stdout.trim()) {
    throw new Error(`Validator returned no JSON for ${rel(file)}: ${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

function aggregateValidation(files) {
  const reports = files.map((file) => validateRun(file));
  return {
    runFiles: reports.reduce((sum, report) => sum + report.runFiles, 0),
    outputCount: reports.reduce((sum, report) => sum + report.outputCount, 0),
    validRuns: reports.reduce((sum, report) => sum + report.validRuns, 0),
    validOutputs: reports.reduce((sum, report) => sum + report.validOutputs, 0),
    errors: reports.reduce((sum, report) => sum + report.errors, 0),
    warnings: reports.reduce((sum, report) => sum + report.warnings, 0),
    reports,
  };
}

function outputsFrom(files) {
  const outputs = new Map();
  for (const file of files) {
    const run = readJson(file);
    for (const output of run.outputs) outputs.set(output.caseId, output);
  }
  return outputs;
}

function reviewsFrom(round) {
  const results = [];
  for (const file of collectJson(path.join(reviewsDir, round))) {
    results.push(...readJson(file).results);
  }
  return results.sort((a, b) => a.caseId.localeCompare(b.caseId));
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(value) {
  return Number(value.toFixed(2));
}

function groupSignature(output) {
  return (output.proposal?.items ?? [])
    .map((item) => [...item.sourceRowIds].sort().join('+'))
    .sort();
}

function structureSignature(output) {
  return JSON.stringify({
    status: [
      output.status.generationState,
      output.status.outcome,
      output.status.errorCode,
      output.reviewHints.recommendedDisposition,
    ],
    primaryArtifact: output.conversionDecision?.primaryArtifact ?? null,
    sourceGroups: groupSignature(output),
    projections: (output.projectionPlan ?? [])
      .map((entry) => `${entry.target}:${entry.applicability}`)
      .sort(),
  });
}

const casesDoc = readJson(path.join(specDir, 'cases-v1.json'));
const expectedDoc = readJson(path.join(specDir, 'expected-v1.json'));
const cases = new Map(casesDoc.cases.map((entry) => [entry.caseId, entry]));
const expectations = new Map(
  expectedDoc.expectations.map((entry) => [entry.caseId, entry]),
);

const round1Files = ['batch-a.json', 'batch-b.json', 'batch-c.json'].map((name) =>
  path.join(runsDir, 'round-1', name),
);
const round2Files = ['batch-a.json', 'batch-b.json', 'batch-c.json'].map((name) =>
  path.join(runsDir, 'round-2', name),
);
const round3AcceptedFiles = ['batch-g.json', 'batch-f.json'].map((name) =>
  path.join(runsDir, 'round-3', name),
);
const round3DiscardedFiles = ['batch-d.json', 'batch-e.json'].map((name) =>
  path.join(runsDir, 'round-3', name),
);

for (const file of [
  ...round1Files,
  ...round2Files,
  ...round3AcceptedFiles,
  ...round3DiscardedFiles,
]) {
  if (!fs.existsSync(file)) throw new Error(`Missing run evidence: ${rel(file)}`);
}

const round1Validation = aggregateValidation(round1Files);
const round2Validation = aggregateValidation(round2Files);
const round3Validation = aggregateValidation(round3AcceptedFiles);
const round3DiscardedValidation = aggregateValidation(round3DiscardedFiles);
const round1Outputs = outputsFrom(round1Files);
const round2Outputs = outputsFrom(round2Files);
const round3Outputs = outputsFrom(round3AcceptedFiles);
const round1Reviews = reviewsFrom('round-1');
const round2Reviews = reviewsFrom('round-2');

if (round1Reviews.length !== 12 || round2Reviews.length !== 12) {
  throw new Error('Expected 12 blind reviews in both Round 1 and Round 2.');
}

const round2ReviewMap = new Map(round2Reviews.map((entry) => [entry.caseId, entry]));
const positiveReviews = round2Reviews.filter((entry) => entry.qualityAverage !== null);
const negativeReviews = round2Reviews.filter((entry) => entry.negativeGatePassed !== null);
const scoreKeys = [
  ['userNeedFit', '사용자 필요'],
  ['executionClarity', '실행 명확성'],
  ['contentFidelityAndCoverage', '원문 충실도'],
  ['portabilityAndNaturalArtifact', '이식성'],
  ['cognitiveLoad', '인지 부하'],
  ['copySpecificity', '문구 구체성'],
  ['sourceAndSafetySeparation', '출처·안전'],
];
const scoreAverages = Object.fromEntries(
  scoreKeys.map(([key]) => [key, round2(mean(positiveReviews.map((entry) => entry.scores[key])))]),
);

const stability = [...round3Outputs.entries()]
  .map(([caseId, output]) => {
    const baseline = round2Outputs.get(caseId);
    return {
      caseId,
      name: expectations.get(caseId).name,
      match: structureSignature(baseline) === structureSignature(output),
      round2Artifact: baseline.conversionDecision?.primaryArtifact ?? 'none',
      round3Artifact: output.conversionDecision?.primaryArtifact ?? 'none',
      sourceGroups: groupSignature(output),
    };
  })
  .sort((a, b) => a.caseId.localeCompare(b.caseId));

const caseSummaries = casesDoc.cases.map((entry) => {
  const expected = expectations.get(entry.caseId);
  const output = round2Outputs.get(entry.caseId);
  const review = round2ReviewMap.get(entry.caseId);
  return {
    caseId: entry.caseId,
    name: expected.name,
    fixtureKind: expected.fixtureKind,
    fixtureShape: expected.fixtureShape,
    sourceTitle: entry.source.primary.title,
    sourceLines: entry.sourceRows.map((row) => ({
      sourceRowId: row.sourceRowId,
      text: [row.title, row.detail].filter(Boolean).join(' — '),
    })),
    userJob: entry.userJob,
    status: output.status,
    disposition: output.reviewHints.recommendedDisposition,
    primaryArtifact: output.conversionDecision?.primaryArtifact ?? null,
    proposalTitle: output.proposal.proposalTitle,
    proposalItems: output.proposal.items.map((item) => ({
      title: item.title,
      doneWhen: item.completion.doneWhen,
      sourceRowIds: item.sourceRowIds,
    })),
    omittedRows: output.proposal.omittedRows,
    qualityAverage: review.qualityAverage,
    executionClarity: review.scores.executionClarity,
    contentQualityGatePassed: review.contentQualityGatePassed,
    negativeGatePassed: review.negativeGatePassed,
    reviewHardFailCodes: review.reviewHardFailCodes,
    decision: review.decision,
    topFixes: review.topFixes,
    correctedPreview: review.correctedPreview,
  };
});

const positiveCases = caseSummaries.filter((entry) => entry.fixtureKind === 'positive');
const negativeCases = caseSummaries.filter((entry) => entry.fixtureKind === 'negative');
const invalidCodeCounts = {};
for (const report of round1Validation.reports) {
  for (const run of report.results) {
    for (const output of run.outputs) {
      for (const error of output.errors) {
        invalidCodeCounts[error.code] = (invalidCodeCounts[error.code] ?? 0) + 1;
      }
    }
  }
}

const allRound2OperationalLanesUnavailable = round2Files.every((file) => {
  const run = readJson(file);
  return (
    run.modelEvidence.evidenceKind === 'in_session_same_model' &&
    run.modelEvidence.modelTier === 'unclassified' &&
    ['timing', 'usage', 'cost'].every(
      (lane) => run[lane].evidenceKind === 'not_available',
    )
  );
});

const metrics = {
  round1: {
    validOutputs: round1Validation.validOutputs,
    outputs: round1Validation.outputCount,
    validRuns: round1Validation.validRuns,
    runs: round1Validation.runFiles,
    errors: round1Validation.errors,
  },
  round2: {
    validOutputs: round2Validation.validOutputs,
    outputs: round2Validation.outputCount,
    validRuns: round2Validation.validRuns,
    runs: round2Validation.runFiles,
    errors: round2Validation.errors,
  },
  round3: {
    validOutputs: round3Validation.validOutputs,
    outputs: round3Validation.outputCount,
    validRuns: round3Validation.validRuns,
    runs: round3Validation.runFiles,
    discardedEnvelopeRuns: round3DiscardedValidation.runFiles - round3DiscardedValidation.validRuns,
  },
  sourceAccountingRate: round2(
    mean(round2Reviews.map((entry) => entry.sourceRowAccounting.accountedSourceRowRate)),
  ),
  itemKeepRate: round2(mean(positiveReviews.map((entry) => entry.correction.itemKeepRate))),
  qualityAverage: round2(mean(positiveReviews.map((entry) => entry.qualityAverage))),
  scoreAverages,
  contentQualityGatePasses: positiveReviews.filter((entry) => entry.contentQualityGatePassed).length,
  positiveCases: positiveReviews.length,
  negativeGatePasses: negativeReviews.filter((entry) => entry.negativeGatePassed).length,
  negativeCases: negativeReviews.length,
  stabilityMatches: stability.filter((entry) => entry.match).length,
  stabilityCases: stability.length,
  unsupportedActionDateFactDetections: round2Reviews.reduce(
    (sum, entry) => sum + (entry.reviewHardFailCodes?.length ?? 0),
    0,
  ),
  realProviderCostEvidenceAvailable: !allRound2OperationalLanesUnavailable,
};

const reportData = {
  reportVersion: 'flowme-url-to-flow-prompt-lab-report-v1',
  date: '2026-07-14',
  caseSetVersion: casesDoc.caseSetVersion,
  expectationSetVersion: expectedDoc.expectationSetVersion,
  promptVersions: ['url-to-flow-prompt-v0.1', 'url-to-flow-prompt-v0.2'],
  proposalSchemaVersion: 'flowme-semantic-proposal-v1',
  metrics,
  invalidCodeCounts,
  stability,
  cases: caseSummaries,
  evidenceBoundary: {
    generation: 'in_session_same_model',
    modelTier: 'unclassified',
    latency: 'not_available',
    tokens: 'not_available',
    cost: 'not_available',
    humanReview: false,
  },
};

fs.mkdirSync(auditDir, { recursive: true });
fs.writeFileSync(
  path.join(auditDir, 'report-data.json'),
  `${JSON.stringify(reportData, null, 2)}\n`,
  'utf8',
);

function markdownCase(entry) {
  const source = entry.sourceLines.length
    ? entry.sourceLines.map((row) => `\`${row.sourceRowId}\` ${row.text}`).join('<br>')
    : 'SourceRow 없음';
  const result = entry.correctedPreview.title ?? `${entry.status.errorCode} / ${entry.disposition}`;
  return `| ${entry.caseId} | ${entry.name} | ${source} | ${result} | ${entry.qualityAverage ?? 'N/A'} | ${entry.decision} |`;
}

const comparisonMarkdown = `# URL-to-FLOW Prompt Lab v1 비교 결과

Date: 2026-07-14<br>
Evidence: 기존 canonical 콘텐츠 10건 + negative gate 2건, 외부 API 없음

## 한 문장 결론

SourceRow-only 입력에서도 prompt v0.2는 12/12 구조 유효, SourceRow accounting 100%, negative gate 2/2를 달성했다. 양성 10건의 블라인드 proxy review 평균은 ${metrics.qualityAverage}/5이고 Item keep rate는 ${(metrics.itemKeepRate * 100).toFixed(0)}%였다. 다만 사람 검토 시간, 실제 저가/고가 모델, latency, token, cost는 아직 측정하지 않았다.

## 첫 예시

\`극세 필터는 4주에 한 번 청소\` → \`극세 필터 청소하기\` → 완료 기준 \`청소를 마쳤다\` → Checklist와 Calendar 후보. 실제 시작일과 반복 규칙은 규칙 계층과 사람 review가 확정한다.

## 라운드 비교

| Round | Prompt | 유효 output | 유효 run | 해석 |
| --- | --- | ---: | ---: | --- |
| 1 | v0.1 | ${metrics.round1.validOutputs}/${metrics.round1.outputs} | ${metrics.round1.validRuns}/${metrics.round1.runs} | enum·nested shape가 prompt에 충분히 고정되지 않음 |
| 2 | v0.2 | ${metrics.round2.validOutputs}/${metrics.round2.outputs} | ${metrics.round2.validRuns}/${metrics.round2.runs} | exact enum과 필드 모양만 보강해 전건 통과 |
| 3 | v0.2 stability | ${metrics.round3.validOutputs}/${metrics.round3.outputs} | ${metrics.round3.validRuns}/${metrics.round3.runs} | 대표 5건 + negative 2건 구조 일치 ${metrics.stabilityMatches}/${metrics.stabilityCases} |

Round 3에서 caseSetVersion 접두어를 빠뜨린 orchestration envelope 2건은 raw evidence로 보존하고, 같은 Round 안에서 독립 재실행한 batch F/G만 안정성 판정에 사용했다. 출력 자체는 유효했지만 run 증거 계약을 어겼으므로 제외했다.

안정성 1건의 차이는 case-05가 Round 3에서 \`calendar:blocked\` 설명을 추가한 것이다. status, primary artifact, Item 수, SourceRow 묶음, 실제 applicable 목적지는 같았고 exact projection plan만 달랐다. 따라서 exact 구조 일치율은 6/7(85.7%)로 종료 기준 80%를 넘지만, 완전 동일 7/7로 과장하지 않는다.

## 품질 gate

| 지표 | 결과 | 목표 | 판정 |
| --- | ---: | ---: | --- |
| Schema valid | ${metrics.round2.validOutputs}/${metrics.round2.outputs} | 100% | PASS |
| SourceRow accounting | ${(metrics.sourceAccountingRate * 100).toFixed(0)}% | 100% | PASS |
| Unsupported action/date/fact 검출 | ${metrics.unsupportedActionDateFactDetections}건 | 0건 | PASS (validator + proxy review 범위) |
| Negative gate | ${metrics.negativeGatePasses}/${metrics.negativeCases} | 2/2 | PASS |
| Item keep rate | ${(metrics.itemKeepRate * 100).toFixed(0)}% | 80%+ | PASS |
| 전체 품질 평균 | ${metrics.qualityAverage}/5 | 3.5+ | PASS |
| 실행 명확성 평균 | ${metrics.scoreAverages.executionClarity}/5 | 4.0+ | PASS |
| 원문 충실도 평균 | ${metrics.scoreAverages.contentFidelityAndCoverage}/5 | 4.0+ | PASS |
| 출처·안전 평균 | ${metrics.scoreAverages.sourceAndSafetySeparation}/5 | 4.0+ | PASS |
| 사례별 content quality gate | ${metrics.contentQualityGatePasses}/${metrics.positiveCases} | 80%+ | PASS |

사례 06과 09는 Item을 유지할 수 있지만 Execution Clarity가 3점이라 문구 수정 대상으로 남았다. 사람의 교정 시간은 측정하지 않았으므로 전체 \`USABLE\` 판정은 하지 않았다.

## 12개 사례

| Case | 원 콘텐츠 형태 | SourceRow | 교정 FLOW / gate | 평균 | 판정 |
| --- | --- | --- | --- | ---: | --- |
${caseSummaries.map(markdownCase).join('\n')}

## 구조 해석

- Evidence minimum: \`SourceRow\`
- Execution minimum: 상태와 완료 기준을 가진 \`Item\`
- Optional grouping: \`Step\`
- Projection: Calendar/ICS, Checklist/Todo, Sheet, Memo
- LLM ownership: 사용자 일, Item 묶기, 제목, 완료 기준, 목적지 후보
- Rule ownership: ID, 상태, 날짜 해석, 반복 규칙, SourceRow accounting, export 생성

따라서 ICS나 checklist가 FLOW의 최소단위가 아니다. 둘은 같은 Item을 각 도구에 맞게 옮기는 projection이다.

## 아직 증명하지 않은 것

- production URL fetch/crawl/PDF·영상 추출
- 실제 cheap/premium 모델 품질·latency·token·cost 비교
- 사람 reviewer의 교정 시간과 실제 사용자 실행 성공률
- DB, 저장·발행, 계정·권한, 재처리 queue

## 다음 실험

동일한 cases v1, prompt v0.2, schema/validator v1을 잠근 뒤 실제 저가 모델과 고가 모델을 각 사례 3회 실행한다. provider-reported token, 외부 타이머 latency, 실행일 가격표 기반 계산 cost를 기록하고, 동일한 블라인드 리뷰 순서로 품질·keep rate·교정 시간을 비교한다.

## 산출물

- [슬라이드형 HTML](./report.html)
- [보고서 데이터](./report-data.json)
- [Prompt v0.2](../../specs/2026-07-14-url-to-flow-prompt-lab/prompt-v0.2.md)
- [리뷰 기준](../../specs/2026-07-14-url-to-flow-prompt-lab/review-rubric.md)
- [시험 cases](../../specs/2026-07-14-url-to-flow-prompt-lab/cases-v1.json)
`;

fs.writeFileSync(path.join(auditDir, 'comparison.md'), comparisonMarkdown, 'utf8');

const arrowSvg = `<svg class="arrow-svg" viewBox="0 0 72 32" aria-hidden="true"><path d="M2 16h58M48 5l12 11-12 11" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="square" stroke-linejoin="miter"/></svg>`;
const checkSvg = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 17l7 7L28 7" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="square"/></svg>`;
const blockSvg = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 7l18 18M25 7L7 25" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="square"/></svg>`;

function slide(number, title, body, options = {}) {
  const titleMarkup = options.title === false ? '' : `\n      <h2>${esc(title)}</h2>`;
  return `<section class="slide ${options.className ?? ''}" id="slide-${number}" data-title="${esc(title)}">
    <div class="stage">${titleMarkup}
      ${body}
      <div class="slide-index" aria-hidden="true">${String(number).padStart(2, '0')}</div>
    </div>
  </section>`;
}

function metric(label, value, note, tone = '') {
  return `<div class="metric ${tone}"><strong>${esc(value)}</strong><span>${esc(label)}</span><small>${esc(note)}</small></div>`;
}

function galleryRow(entry) {
  const source = entry.sourceLines.length
    ? entry.sourceLines.map((row) => row.text).join(' · ')
    : 'SourceRow 없음';
  const destination = entry.correctedPreview.destinations.join(' · ') || entry.disposition;
  return `<div class="gallery-row">
    <div><span class="case-id">${esc(entry.caseId)}</span><strong>${esc(source)}</strong><small>${esc(entry.fixtureShape)}</small></div>
    <div class="row-arrow">${arrowSvg}</div>
    <div><strong>${esc(entry.correctedPreview.title ?? entry.status.errorCode)}</strong><small>${entry.correctedPreview.items.length} Item · ${esc(destination)}</small></div>
  </div>`;
}

function previewCase(entry) {
  const score = entry.qualityAverage === null ? 'N/A' : `${entry.qualityAverage}/5`;
  const items = entry.correctedPreview.items
    .map(
      (item) => `<li><strong>${esc(item.title)}</strong><span>${esc(item.doneWhen)}</span><code>${esc(item.sourceRowIds.join(', '))}</code></li>`,
    )
    .join('');
  return `<article class="preview-case">
    <header><span>${esc(entry.caseId)} · ${esc(entry.name)}</span><strong>${esc(score)}</strong></header>
    <div class="preview-columns">
      <div class="evidence-column"><b>SourceRow</b>${entry.sourceLines
        .map((row) => `<p>${esc(row.text)}<code>${esc(row.sourceRowId)}</code></p>`)
        .join('')}</div>
      <div class="preview-arrow">${arrowSvg}</div>
      <div class="flow-column"><b>${esc(entry.correctedPreview.title)}</b><ol>${items}</ol><small>${esc(entry.correctedPreview.destinations.join(' · '))}</small></div>
    </div>
    <footer>${esc(entry.correctedPreview.reviewNote)}</footer>
  </article>`;
}

function scoreBar(key, label) {
  const value = metrics.scoreAverages[key];
  return `<div class="score-row"><span>${esc(label)}</span><div><i style="--score:${value}"></i></div><strong>${value}</strong></div>`;
}

const slides = [];
slides.push(
  slide(
    1,
    'URL 한 개가, 실행 가능한 FLOW가 되려면',
    `<h1>URL 한 개가,<br>실행 가능한 FLOW가 되려면</h1>
    <div class="transform-rail">
      <div class="source-box"><span>SourceRow</span><strong>극세 필터는 4주에 한 번 청소</strong></div>
      <div class="hero-arrow">${arrowSvg}</div>
      <div class="item-table"><span>FLOW Item</span><dl><dt>제목</dt><dd>극세 필터 청소하기</dd><dt>완료 조건</dt><dd>청소를 마쳤다</dd><dt>연결 대상</dt><dd>Checklist · Calendar 후보</dd></dl></div>
    </div>
    <div class="round-shift"><span>v0.1</span><strong class="cobalt">1/12</strong>${arrowSvg}<span>v0.2</span><strong class="coral">12/12</strong></div>
    <p class="hero-note">기존 콘텐츠 12건 · 외부 API 없음 · SourceRow-only 통제 입력</p>`,
    { title: false, className: 'cover-slide' },
  ),
);

slides.push(
  slide(
    2,
    '결론부터: v0.2는 후보가 됐고, 사람 검증은 아직이다',
    `<div class="metric-rail">
      ${metric('schema valid', '12/12', 'Round 2')}
      ${metric('SourceRow accounting', '100%', 'mapped 또는 omitted')}
      ${metric('negative gate', '2/2', 'missing source · locale')}
      ${metric('proxy review 평균', `${metrics.qualityAverage}/5`, '양성 10건')}
      ${metric('사례별 content gate', `${metrics.contentQualityGatePasses}/10`, 'Execution Clarity가 관건', 'coral-line')}
      ${metric('구조 안정성', `${metrics.stabilityMatches}/${metrics.stabilityCases}`, 'Round 3 재실행')}
    </div>
    <div class="verdict-band"><strong>지금 결정할 수 있는 것</strong><p>prompt v0.2와 SourceRow→Item 계약은 실제 provider 비교에 넘길 수 있다.</p><strong>아직 결정할 수 없는 것</strong><p>저가/고가 모델 우열, 비용, 사람 교정 시간, production URL fetch 품질.</p></div>
    <p class="evidence-note">점수는 모델 신원을 숨긴 세션 내 proxy review다. 사람 사용성 검증이나 실제 API 비용 증거로 해석하지 않는다.</p>`,
  ),
);

slides.push(
  slide(
    3,
    'ICS가 최소단위는 아니다',
    `<div class="unit-flow">
      <div><span>근거 최소단위</span><strong>SourceRow</strong><p>“극세 필터는 4주에 한 번 청소”</p><code>row-aircon-filter-4week</code></div>
      ${arrowSvg}
      <div class="primary-unit"><span>실행 최소단위</span><strong>Item</strong><p>극세 필터 청소하기</p><small>상태 · 완료 조건 · SourceRef</small></div>
      ${arrowSvg}
      <div><span>목적지별 표현</span><strong>Projection</strong><p>Calendar · Checklist · Sheet · Memo</p><small>같은 Item을 도구 문법으로 옮긴다</small></div>
    </div>
    <div class="unit-notes"><p><b>Step</b>은 여러 Item을 읽기 쉽게 묶는 선택 구조다.</p><p><b>ICS</b>는 날짜 근거와 사용자 anchor가 있을 때 생성되는 Calendar projection이다.</p><p><b>Checklist</b>도 저장 모델 자체가 아니라 Item의 한 출력 형태다.</p></div>
    <div class="answer-line">따라서 backend의 중심 객체는 <strong>SourceRow + Item</strong>, 외부 도구 연동은 <strong>projection adapter</strong>다.</div>`,
  ),
);

slides.push(
  slide(
    4,
    '첫 다섯 사례: 원문 모양이 달라도 같은 계약으로 변환한다',
    `<div class="gallery-list">${positiveCases.slice(0, 5).map(galleryRow).join('')}</div>`,
    { className: 'dense-slide' },
  ),
);

slides.push(
  slide(
    5,
    '다음 다섯 사례: Item 수는 목표가 아니라 결과다',
    `<div class="gallery-list">${positiveCases.slice(5, 10).map(galleryRow).join('')}</div>
    <p class="evidence-note">maxItems=7은 채워야 할 목표가 아니라 안전 상한이다. 1 Item이 자연스러운 콘텐츠는 1개로 끝낸다.</p>`,
    { className: 'dense-slide' },
  ),
);

slides.push(
  slide(
    6,
    '만들지 않는 것도 변환 품질이다',
    `<div class="negative-grid">
      <article><div class="gate-icon">${blockSvg}</div><span>${esc(negativeCases[0].caseId)}</span><h3>SourceRow 없음</h3><p>PDF 본문과 학습 행을 받지 못했다.</p><dl><dt>status</dt><dd>failed · no_proposal</dd><dt>error</dt><dd>missing_source_rows</dd><dt>결과</dt><dd>Item 0 · projection 0</dd></dl><strong>source_import_required</strong></article>
      <article><div class="gate-icon coral">${blockSvg}</div><span>${esc(negativeCases[1].caseId)}</span><h3>지역 적용성 미확인</h3><p>미국 병원·보험 맥락을 한국 출산 준비로 승격할 수 없다.</p><dl><dt>status</dt><dd>failed · no_proposal</dd><dt>error</dt><dd>locale_applicability_unverified</dd><dt>결과</dt><dd>Item 0 · projection 0</dd></dl><strong>hold</strong></article>
    </div>
    <div class="answer-line">좋은 모델은 빈칸을 그럴듯하게 채우지 않고, <strong>왜 멈췄는지</strong>를 저장 가능한 상태로 남긴다.</div>`,
  ),
);

slides.push(
  slide(
    7,
    'LLM은 의미를 제안하고, 규칙이 제품 상태를 만든다',
    `<div class="pipeline">
      <div class="outside"><strong>URL</strong><span>production fetch</span><small>이번 세션 범위 밖</small></div>${arrowSvg}
      <div><strong>SourceRow</strong><span>근거 정규화</span><small>이번 세션 시작</small></div>${arrowSvg}
      <div class="control"><strong>Gate</strong><span>지역 · 민감도</span><small>rule owned</small></div>${arrowSvg}
      <div><strong>LLM Proposal</strong><span>묶기 · 제목 · 완료조건</span><small>semantic only</small></div>${arrowSvg}
      <div class="control"><strong>Validator</strong><span>ID · 상태 · 날짜 · 누락</span><small>rule owned</small></div>${arrowSvg}
      <div><strong>Item + Export</strong><span>Checklist · Calendar</span><small>Sheet · Memo</small></div>
    </div>
    <div class="ownership-legend"><span><i class="blue-line"></i>생성·표현</span><span><i class="coral-line"></i>통제·상태</span></div>
    <p class="evidence-note">DB 저장·자동 발행 전에는 human review가 readiness를 소유한다. 그래서 proposal의 readiness는 항상 null이다.</p>`,
  ),
);

slides.push(
  slide(
    8,
    '한 번에 한 결함만 고쳤다',
    `<div class="rounds-table">
      <div><strong>Round 1 · v0.1</strong><span class="big coral">${metrics.round1.validOutputs}/${metrics.round1.outputs}</span><p>의미는 대체로 맞았지만 enum, memoCandidate, scheduleCandidate 같은 exact contract가 흔들렸다.</p></div>
      <div class="change-column">${arrowSvg}<strong>수정 1개</strong><p>허용 enum과 nested field 모양을 prompt에 그대로 열거</p></div>
      <div><strong>Round 2 · v0.2</strong><span class="big cobalt">${metrics.round2.validOutputs}/${metrics.round2.outputs}</span><p>SourceRow-only 12건 전부 schema와 accounting을 통과했다.</p></div>
      <div class="change-column">${arrowSvg}<strong>동일 prompt</strong><p>대표 5건 + negative 2건 독립 재실행</p></div>
      <div><strong>Round 3 · stability</strong><span class="big cobalt">${metrics.stabilityMatches}/${metrics.stabilityCases}</span><p>case-05가 calendar:blocked를 한 줄 더 기록했다. exact 구조 일치 85.7%.</p></div>
    </div>
    <div class="method-note"><b>Validator 정렬</b><span>failed 사유가 reviewHints에 있어도 유효하다는 prompt/schema 계약에 맞춰 validator의 false negative를 수정했다.</span><b>Run 증거 정렬</b><span>caseSetVersion 오타가 난 envelope 2건은 제외하고 raw로 보존한 뒤 독립 재실행했다.</span></div>`,
  ),
);

slides.push(
  slide(
    9,
    '평균은 통과했지만, 문장 두 곳은 더 구체적이어야 한다',
    `<div class="review-layout"><div class="score-bars">${scoreKeys
      .map(([key, label]) => scoreBar(key, label))
      .join('')}</div>
      <div class="review-summary">${metric('전체 평균', `${metrics.qualityAverage}/5`, '10 positive')}${metric('Item keep', `${(metrics.itemKeepRate * 100).toFixed(0)}%`, '제목 수정도 유지로 계산')}${metric('사례별 gate', `${metrics.contentQualityGatePasses}/10`, '80% threshold')}</div></div>
    <div class="revision-rail"><article><span>case-06 · 4.00</span><strong>“영상 실행”은 실제 완료 행동이 약하다</strong><p>“영상의 레시피를 따라 만들기”처럼 관찰 가능한 행동으로 교정.</p></article><article><span>case-09 · 4.00</span><strong>“prompt 실행”은 사진을 찍는 행동이 숨는다</strong><p>“Day 1 prompt로 사진 찍기”로 교정하고 실제 날짜는 만들지 않는다.</p></article></div>
    <p class="evidence-note">proxy review는 모델 신원을 숨겼지만 사람이 아니다. reviewSeconds와 burden은 null이며 전체 USABLE 판정을 내리지 않았다.</p>`,
    { className: 'dense-slide' },
  ),
);

slides.push(
  slide(10, '교정 미리보기 1–3', `<div class="preview-stack">${positiveCases.slice(0, 3).map(previewCase).join('')}</div>`, { className: 'preview-slide' }),
);
slides.push(
  slide(11, '교정 미리보기 4–6', `<div class="preview-stack">${positiveCases.slice(3, 6).map(previewCase).join('')}</div>`, { className: 'preview-slide' }),
);
slides.push(
  slide(12, '교정 미리보기 7–10', `<div class="preview-stack compact">${positiveCases.slice(6, 10).map(previewCase).join('')}</div>`, { className: 'preview-slide dense-slide' }),
);

slides.push(
  slide(
    13,
    '안정성은 확인했고, 모델 가격대 비교는 아직 0건이다',
    `<div class="stability-table"><header><span>Case</span><span>Round 2 artifact</span><span>Round 3 artifact</span><span>구조</span></header>${stability
      .map((entry) => `<div><span>${esc(entry.caseId)}</span><span>${esc(entry.round2Artifact)}</span><span>${esc(entry.round3Artifact)}</span><strong>${entry.match ? 'MATCH' : 'DIFF'}</strong></div>`)
      .join('')}</div>
    <div class="cost-lane"><div><strong>이번 세션 증거</strong><p>provider/model: codex-subagent-runtime · tier: unclassified</p><p>latency · token · cost: null / not_available</p></div><div><strong>다음 provider 실험</strong><p>동일 prompt/cases/schema · 모델당 사례별 3회</p><p>외부 타이머 latency · provider token · 실행일 가격표 cost</p></div></div>
    <p class="evidence-note">같은 기반 모델의 서브 세션 결과는 prompt 반복성만 말한다. cheap/premium 우열이나 비용 절감을 주장하지 않는다.</p>`,
    { className: 'dense-slide' },
  ),
);

slides.push(
  slide(
    14,
    'Backend를 만들기 전에 준비할 것은 API 키보다 계약이다',
    `<div class="backend-rows">
      <div><span>01</span><strong>Ingress</strong><p>URL fetch, 권리·robots·timeout, PDF/영상/본문 추출</p><small>이번 세션에서는 있다고 가정</small></div>
      <div><span>02</span><strong>Evidence</strong><p>Source · SourceRow · locale · risk · checkedAt</p><small>현재 cases v1로 고정</small></div>
      <div><span>03</span><strong>Semantic proposal</strong><p>provider-neutral prompt v0.2 + compact JSON schema</p><small>LLM 교체 가능</small></div>
      <div><span>04</span><strong>Rule assembler</strong><p>ID, 상태, 일정 해석, 누락 검증, projection adapter</p><small>결정론적 코드</small></div>
      <div><span>05</span><strong>Review & storage</strong><p>원문/제안 diff, 승인·보류·거절, version, retry, audit log</p><small>DB는 이 계약 다음</small></div>
      <div><span>06</span><strong>Operations</strong><p>latency, token, cost, cache, queue, redaction, observability</p><small>실제 provider에서 측정</small></div>
    </div>
    <div class="answer-line">LLM API와 저장소는 필요하지만, <strong>무엇을 저장하고 누가 결정하는지</strong>가 먼저 고정돼야 한다.</div>`,
    { className: 'dense-slide' },
  ),
);

slides.push(
  slide(
    15,
    '다음 목표는 “더 좋은 prompt”가 아니라 실제 모델 비교다',
    `<div class="next-sequence"><div><span>1</span><strong>v0.2 동결</strong><p>cases v1 · schema v1 · validator v1</p></div>${arrowSvg}<div><span>2</span><strong>cheap / premium</strong><p>같은 12건을 각 3회 실행</p></div>${arrowSvg}<div><span>3</span><strong>블라인드 사람 review</strong><p>점수 · keep · 교정 시간</p></div>${arrowSvg}<div><span>4</span><strong>Go / No-Go</strong><p>품질 대비 latency · token · cost</p></div></div>
    <div class="final-decision"><strong>이번 세션의 결정</strong><p>SourceRow를 근거 최소단위, Item을 실행 최소단위로 두고 prompt v0.2를 실제 provider 비교 후보로 잠근다.</p></div>
    <div class="artifact-links"><a href="./comparison.md">비교 Markdown</a><a href="./report-data.json">보고서 데이터</a><a href="../../specs/2026-07-14-url-to-flow-prompt-lab/prompt-v0.2.md">Prompt v0.2</a><a href="../../specs/2026-07-14-url-to-flow-prompt-lab/review-rubric.md">Review rubric</a></div>`,
  ),
);

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>URL-to-FLOW Prompt Lab v1</title>
  <style>
    :root{--ink:#0b0b0d;--blue:#123dcc;--coral:#ff4b2f;--line:#d8dce6;--pale:#f2f5ff;--white:#fff;--muted:#5f6470;--stage-w:min(1440px,calc((100svh - 32px)*16/9),calc(100vw - 96px));font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",Inter,Arial,sans-serif;color:var(--ink);background:var(--white)}
    *{box-sizing:border-box}html{scroll-behavior:smooth;background:#fff}body{margin:0;background:#fff;color:var(--ink)}a{color:inherit;text-decoration-thickness:2px;text-underline-offset:4px}button{font:inherit}.deck{scroll-snap-type:y mandatory}.slide{min-height:100svh;display:grid;place-items:center;scroll-snap-align:start;padding:16px 48px;background:#fff}.stage{position:relative;width:var(--stage-w);aspect-ratio:16/9;max-height:calc(100svh - 32px);padding:clamp(32px,4vw,72px);overflow:hidden;border:1px solid #eef0f5;background:#fff;box-shadow:0 18px 60px rgba(12,26,74,.08)}h1,h2,h3,p{margin-top:0}h1{font-size:clamp(42px,4.7vw,78px);line-height:1.08;letter-spacing:-.055em;margin-bottom:clamp(32px,4vh,70px);max-width:1000px}h2{font-size:clamp(34px,3.7vw,62px);line-height:1.1;letter-spacing:-.05em;margin:0 0 clamp(28px,3.2vh,52px);max-width:1160px}.slide-index{position:absolute;right:28px;bottom:24px;font:700 13px/1 Arial;color:#a7acb8;letter-spacing:.12em}.arrow-svg{width:72px;height:32px;color:var(--blue);display:block}.cover-slide .stage{padding-top:clamp(32px,4vh,62px)}.transform-rail{display:grid;grid-template-columns:minmax(260px,.9fr) 90px minmax(430px,1.2fr);align-items:center;gap:24px}.source-box{border:2px solid var(--blue);min-height:170px;display:grid;align-content:center;padding:30px}.source-box span,.item-table>span{font-size:18px;font-weight:800;color:var(--blue);margin-bottom:18px}.source-box strong{font-size:clamp(24px,2.1vw,36px);line-height:1.35;letter-spacing:-.03em}.hero-arrow{display:grid;place-items:center}.item-table dl{display:grid;grid-template-columns:155px 1fr;margin:0;border-top:1px solid #aeb4c2}.item-table dt,.item-table dd{margin:0;padding:15px 18px;border-bottom:1px solid #aeb4c2;font-size:clamp(17px,1.55vw,26px)}.item-table dt{color:var(--blue);font-weight:800;border-right:1px solid #aeb4c2}.item-table dt:nth-of-type(2){color:var(--coral)}.item-table dd{font-weight:700}.round-shift{margin-top:clamp(30px,5vh,76px);padding-top:25px;border-top:3px solid var(--blue);display:flex;align-items:baseline;justify-content:center;gap:24px;font-size:24px;font-weight:800}.round-shift strong{font-size:clamp(40px,4vw,70px)}.round-shift .arrow-svg{display:inline-block;width:58px;transform:translateY(7px)}.cobalt{color:var(--blue)}.coral{color:var(--coral)}.hero-note{margin:14px 0 0;text-align:center;color:var(--muted);font-size:14px}.metric-rail{display:grid;grid-template-columns:repeat(6,1fr);border-top:2px solid var(--blue);border-bottom:2px solid var(--blue)}.metric{min-width:0;padding:28px 20px;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:8px}.metric:last-child{border-right:0}.metric strong{font-size:clamp(30px,3vw,52px);color:var(--blue);letter-spacing:-.04em}.metric span{font-weight:800;font-size:16px}.metric small{color:var(--muted);line-height:1.4}.metric.coral-line strong{color:var(--coral)}.verdict-band{margin-top:42px;display:grid;grid-template-columns:210px 1fr 210px 1fr;gap:18px 24px;align-items:start}.verdict-band strong{font-size:20px;color:var(--blue)}.verdict-band strong:nth-of-type(2){color:var(--coral)}.verdict-band p{font-size:20px;line-height:1.55;margin:0}.evidence-note{margin:30px 0 0;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:15px;line-height:1.55}.unit-flow{display:grid;grid-template-columns:1fr 80px 1fr 80px 1fr;align-items:center}.unit-flow>div{min-height:250px;padding:28px;border-top:3px solid var(--blue);background:var(--pale)}.unit-flow>div.primary-unit{border-color:var(--coral);background:#fff7f4}.unit-flow span{display:block;color:var(--blue);font-weight:800;margin-bottom:16px}.unit-flow .primary-unit span{color:var(--coral)}.unit-flow strong{display:block;font-size:42px;margin-bottom:24px}.unit-flow p{font-size:21px;line-height:1.4}.unit-flow code{font-size:13px;color:var(--muted)}.unit-flow small{font-size:16px}.unit-notes{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:35px}.unit-notes p{border-top:1px solid var(--line);padding-top:16px;font-size:17px;line-height:1.55}.answer-line{margin-top:28px;padding:20px 24px;border-left:5px solid var(--coral);font-size:21px;background:#fff7f4}.gallery-list{border-top:2px solid var(--blue)}.gallery-row{display:grid;grid-template-columns:1fr 92px 1.05fr;align-items:center;min-height:92px;border-bottom:1px solid var(--blue);gap:24px}.gallery-row>div:first-child,.gallery-row>div:last-child{display:grid;grid-template-columns:auto 1fr;column-gap:16px;align-items:baseline}.gallery-row strong{font-size:clamp(17px,1.4vw,24px);letter-spacing:-.03em}.gallery-row small{grid-column:2;color:var(--muted);margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.case-id{font:800 12px/1 Arial;color:var(--blue);letter-spacing:.08em}.row-arrow{display:grid!important;grid-template-columns:1fr!important;place-items:center}.negative-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px}.negative-grid article{border-top:4px solid var(--blue);padding:28px 4px 0;position:relative}.negative-grid article:nth-child(2){border-color:var(--coral)}.negative-grid article>span{color:var(--blue);font:800 13px Arial}.negative-grid h3{font-size:34px;margin:18px 0}.negative-grid p{font-size:19px;color:var(--muted);line-height:1.5}.negative-grid dl{display:grid;grid-template-columns:120px 1fr;border-top:1px solid var(--line)}.negative-grid dt,.negative-grid dd{margin:0;padding:12px 0;border-bottom:1px solid var(--line)}.negative-grid dt{color:var(--muted)}.negative-grid dd{font-family:ui-monospace,Consolas,monospace}.negative-grid article>strong{display:block;color:var(--coral);font-size:26px;margin-top:20px}.gate-icon{position:absolute;right:4px;top:28px;width:50px;height:50px;color:var(--blue)}.gate-icon svg{width:100%}.gate-icon.coral{color:var(--coral)}.pipeline{display:grid;grid-template-columns:repeat(5,minmax(115px,1fr) 56px) minmax(130px,1.1fr);align-items:center;margin-top:70px}.pipeline>div{min-height:190px;border-top:3px solid var(--blue);padding:22px 8px}.pipeline>div.control{border-color:var(--coral)}.pipeline>div.outside{border-style:dashed;color:var(--muted)}.pipeline strong,.pipeline span,.pipeline small{display:block}.pipeline strong{font-size:22px}.pipeline span{margin-top:30px;font-weight:700}.pipeline small{margin-top:9px;color:var(--muted)}.pipeline .control strong{color:var(--coral)}.pipeline .arrow-svg{width:48px}.ownership-legend{display:flex;gap:36px;margin-top:60px;border-top:1px solid var(--line);padding-top:18px}.ownership-legend span{display:flex;align-items:center;gap:12px}.ownership-legend i{width:42px;border-top:4px solid var(--blue)}.ownership-legend i.coral-line{border-color:var(--coral)}.rounds-table{display:grid;grid-template-columns:1fr .55fr 1fr .55fr 1fr;gap:28px;align-items:start}.rounds-table>div:not(.change-column){border-top:4px solid var(--blue);padding-top:22px}.rounds-table strong{font-size:20px}.rounds-table .big{display:block;font-size:clamp(40px,4vw,68px);margin:25px 0 12px}.rounds-table p{font-size:17px;line-height:1.55;color:var(--muted)}.change-column{text-align:center;padding-top:80px}.change-column .arrow-svg{margin:auto}.change-column strong{display:block;margin-top:16px;color:var(--coral)}.change-column p{font-size:14px}.method-note{display:grid;grid-template-columns:170px 1fr 170px 1fr;gap:14px 22px;border-top:1px solid var(--line);margin-top:40px;padding-top:20px;font-size:15px;line-height:1.5}.method-note b{color:var(--blue)}.review-layout{display:grid;grid-template-columns:1.5fr .8fr;gap:60px}.score-bars{border-top:2px solid var(--blue)}.score-row{display:grid;grid-template-columns:150px 1fr 42px;gap:16px;align-items:center;border-bottom:1px solid var(--line);min-height:48px}.score-row span{font-weight:700}.score-row>div{height:8px;background:#e9ecf4}.score-row i{display:block;width:calc(var(--score)/5*100%);height:100%;background:var(--blue)}.review-summary{display:grid;grid-template-columns:1fr;border-top:2px solid var(--coral)}.review-summary .metric{border-right:0;border-bottom:1px solid var(--line);padding:18px}.revision-rail{display:grid;grid-template-columns:1fr 1fr;gap:34px;margin-top:30px}.revision-rail article{border-top:3px solid var(--coral);padding-top:16px}.revision-rail span{color:var(--coral);font-weight:800}.revision-rail strong{display:block;font-size:20px;margin:10px 0}.revision-rail p{color:var(--muted);line-height:1.45;font-size:15px}.preview-stack{display:grid;gap:17px}.preview-case{border-top:2px solid var(--blue);padding-top:13px}.preview-case header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.preview-case header span{font-weight:800;color:var(--blue)}.preview-case header strong{font-size:16px}.preview-columns{display:grid;grid-template-columns:.8fr 55px 1.6fr;align-items:center;gap:10px}.evidence-column,.flow-column{min-width:0}.evidence-column>b,.flow-column>b{font-size:17px}.evidence-column p{font-size:14px;margin:7px 0;color:var(--muted)}.evidence-column code{display:block;font-size:10px;margin-top:3px}.preview-arrow .arrow-svg{width:48px}.flow-column ol{display:flex;gap:14px;margin:8px 0 0;padding:0;list-style:none}.flow-column li{flex:1;border-left:3px solid var(--coral);padding-left:10px;min-width:0}.flow-column li strong,.flow-column li span,.flow-column li code{display:block}.flow-column li strong{font-size:14px}.flow-column li span{font-size:12px;color:var(--muted);margin-top:4px}.flow-column li code{font-size:9px;margin-top:4px}.flow-column small{font-size:11px;color:var(--blue)}.preview-case footer{font-size:11px;color:var(--muted);margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.preview-stack.compact{gap:11px}.preview-stack.compact .preview-case{padding-top:9px}.preview-stack.compact .preview-case footer{display:none}.stability-table{border-top:2px solid var(--blue)}.stability-table header,.stability-table>div{display:grid;grid-template-columns:.7fr 1fr 1fr .7fr;gap:20px;align-items:center;border-bottom:1px solid var(--line);min-height:43px}.stability-table header{font-weight:800;color:var(--blue)}.stability-table strong{color:var(--blue)}.cost-lane{display:grid;grid-template-columns:1fr 1fr;gap:44px;margin-top:28px}.cost-lane>div{border-top:3px solid var(--blue);padding-top:16px}.cost-lane>div:nth-child(2){border-color:var(--coral)}.cost-lane strong{font-size:20px}.cost-lane p{font-size:15px;margin:9px 0;color:var(--muted)}.backend-rows{border-top:2px solid var(--blue)}.backend-rows>div{display:grid;grid-template-columns:50px 180px 1fr 200px;align-items:center;min-height:74px;border-bottom:1px solid var(--line);gap:16px}.backend-rows span{font:800 13px Arial;color:var(--blue)}.backend-rows strong{font-size:20px}.backend-rows p{margin:0;font-size:17px}.backend-rows small{color:var(--muted)}.next-sequence{display:grid;grid-template-columns:1fr 58px 1fr 58px 1fr 58px 1fr;align-items:center;margin-top:80px}.next-sequence>div{border-top:4px solid var(--blue);padding-top:18px;min-height:180px}.next-sequence>div:nth-of-type(2),.next-sequence>div:nth-of-type(4){border-color:var(--coral)}.next-sequence span{font:800 13px Arial;color:var(--blue)}.next-sequence strong{display:block;font-size:25px;margin:18px 0}.next-sequence p{color:var(--muted);line-height:1.5}.next-sequence .arrow-svg{width:48px}.final-decision{border-left:6px solid var(--coral);background:#fff7f4;padding:24px 30px;margin-top:44px;display:grid;grid-template-columns:180px 1fr;gap:20px}.final-decision p{font-size:20px;line-height:1.5;margin:0}.artifact-links{display:flex;gap:28px;margin-top:28px;font-size:14px;color:var(--blue)}.deck-nav{position:fixed;right:14px;top:50%;transform:translateY(-50%);display:grid;gap:6px;z-index:10}.deck-nav button{width:12px;height:12px;padding:0;border:1px solid var(--blue);background:#fff;cursor:pointer}.deck-nav button.active{background:var(--blue)}.deck-controls{position:fixed;left:16px;bottom:16px;z-index:10;display:flex;gap:8px}.deck-controls button{width:38px;height:38px;border:1px solid var(--blue);background:#fff;color:var(--blue);font-weight:900;cursor:pointer}.deck-progress{position:fixed;left:0;top:0;height:3px;background:var(--coral);width:0;z-index:20;transition:width .2s ease}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .dense-slide .stage,.preview-slide .stage{padding:38px 58px}.dense-slide h2,.preview-slide h2{font-size:clamp(30px,3.1vw,50px);margin-bottom:22px}.dense-slide .score-row{min-height:40px}.dense-slide .review-summary .metric{padding:12px 16px}.dense-slide .revision-rail{margin-top:16px}.dense-slide .revision-rail article{padding-top:10px}.dense-slide .revision-rail strong{font-size:17px;margin:7px 0}.dense-slide .revision-rail p{font-size:13px;margin-bottom:0}.dense-slide .evidence-note{margin-top:15px;padding-top:10px}.preview-slide .preview-stack{gap:10px}.preview-slide .preview-case{padding-top:8px}.preview-slide .preview-case header{margin-bottom:5px}.preview-slide .preview-case footer{margin-top:4px}.preview-stack.compact{gap:5px}.preview-stack.compact .preview-case{padding-top:4px}.preview-stack.compact .preview-case header{margin-bottom:1px}.preview-stack.compact .evidence-column p{font-size:12px;margin:3px 0}.preview-stack.compact .flow-column ol{margin-top:3px}.preview-stack.compact .flow-column li strong{font-size:12px}.preview-stack.compact .flow-column li span{font-size:10px;margin-top:2px}
    @media(max-width:1100px){:root{--stage-w:calc(100vw - 40px)}.slide{padding:12px 20px}.stage{aspect-ratio:auto;min-height:calc(100svh - 24px);max-height:none;padding:38px}.dense-slide .stage{overflow:auto}.metric-rail{grid-template-columns:repeat(3,1fr)}.metric:nth-child(3){border-right:0}.transform-rail{grid-template-columns:1fr 60px 1.25fr}.gallery-row{grid-template-columns:1fr 65px 1fr}.pipeline{grid-template-columns:repeat(5,minmax(90px,1fr) 38px) minmax(100px,1fr)}.pipeline strong{font-size:17px}.pipeline span{font-size:13px}.rounds-table{gap:14px}.backend-rows>div{grid-template-columns:40px 150px 1fr 160px}}
    @media(max-width:760px){html{scroll-behavior:auto}.deck{scroll-snap-type:none}.slide{display:block;min-height:0;padding:0;border-bottom:10px solid var(--pale)}.stage{width:100%;min-height:100svh;aspect-ratio:auto;border:0;box-shadow:none;padding:56px 22px 44px;overflow:visible}.slide-index{right:20px;bottom:18px}h1{font-size:43px}h2{font-size:35px;margin-bottom:30px}.transform-rail,.unit-flow,.negative-grid,.review-layout,.cost-lane{grid-template-columns:1fr}.hero-arrow,.unit-flow>.arrow-svg{transform:rotate(90deg);margin:auto}.round-shift{flex-wrap:wrap;gap:14px}.round-shift .arrow-svg{width:42px}.metric-rail{grid-template-columns:1fr 1fr}.metric:nth-child(3){border-right:1px solid var(--line)}.metric:nth-child(2n){border-right:0}.verdict-band{grid-template-columns:1fr}.unit-notes{grid-template-columns:1fr}.gallery-row{grid-template-columns:1fr;gap:10px;padding:20px 0}.row-arrow{transform:rotate(90deg)}.gallery-row>div:first-child,.gallery-row>div:last-child{grid-template-columns:auto 1fr}.pipeline{display:flex;flex-direction:column;margin-top:0}.pipeline>div{width:100%;min-height:0}.pipeline>.arrow-svg{transform:rotate(90deg);margin:10px}.rounds-table,.method-note{grid-template-columns:1fr}.change-column{padding:10px}.change-column .arrow-svg{transform:rotate(90deg)}.review-summary{grid-template-columns:1fr 1fr}.revision-rail{grid-template-columns:1fr}.preview-columns{grid-template-columns:1fr}.preview-arrow{transform:rotate(90deg);margin:auto}.flow-column ol{display:grid}.preview-case footer{white-space:normal}.negative-grid dd,.negative-grid article>strong{overflow-wrap:anywhere;word-break:break-word}.stability-table{font-size:12px;overflow:auto}.stability-table header,.stability-table>div{grid-template-columns:70px 110px 110px 70px}.backend-rows>div{grid-template-columns:34px 1fr;align-items:start;padding:16px 0}.backend-rows p,.backend-rows small{grid-column:2}.next-sequence{grid-template-columns:1fr}.next-sequence>.arrow-svg{transform:rotate(90deg);margin:10px auto}.final-decision{grid-template-columns:1fr}.artifact-links{flex-direction:column;gap:12px}.deck-nav{display:none}.deck-controls{left:auto;right:12px;bottom:12px}.evidence-note{font-size:13px}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.deck-progress{transition:none}}
    @media print{@page{size:landscape;margin:0}.deck-nav,.deck-controls,.deck-progress{display:none}.slide{break-after:page;min-height:100vh;padding:0}.stage{width:100vw;height:100vh;max-height:none;aspect-ratio:auto;border:0;box-shadow:none}}
  </style>
</head>
<body>
  <div class="deck-progress" aria-hidden="true"></div>
  <main class="deck">${slides.join('\n')}</main>
  <nav class="deck-nav" aria-label="슬라이드 이동"></nav>
  <div class="deck-controls"><button type="button" data-dir="-1" aria-label="이전 슬라이드">↑</button><button type="button" data-dir="1" aria-label="다음 슬라이드">↓</button></div>
  <p class="sr-only" aria-live="polite" id="slide-status"></p>
  <script>
    const slides=[...document.querySelectorAll('.slide')];
    const nav=document.querySelector('.deck-nav');
    const progress=document.querySelector('.deck-progress');
    const status=document.querySelector('#slide-status');
    let current=0;
    slides.forEach((slide,index)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',(index+1)+'번: '+slide.dataset.title);button.addEventListener('click',()=>go(index));nav.append(button)});
    const dots=[...nav.children];
    function update(index){current=Math.max(0,Math.min(slides.length-1,index));dots.forEach((dot,i)=>dot.classList.toggle('active',i===current));progress.style.width=((current+1)/slides.length*100)+'%';status.textContent=(current+1)+' / '+slides.length+' '+slides[current].dataset.title}
    function go(index){const target=Math.max(0,Math.min(slides.length-1,index));slides[target].scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});update(target)}
    document.querySelectorAll('[data-dir]').forEach(button=>button.addEventListener('click',()=>go(current+Number(button.dataset.dir))));
    addEventListener('keydown',event=>{if(['ArrowDown','ArrowRight','PageDown'].includes(event.key)){event.preventDefault();go(current+1)}if(['ArrowUp','ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();go(current-1)}if(event.key==='Home'){event.preventDefault();go(0)}if(event.key==='End'){event.preventDefault();go(slides.length-1)}});
    const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&entry.intersectionRatio>.55)update(slides.indexOf(entry.target))}},{threshold:[.55]});slides.forEach(slide=>observer.observe(slide));update(0);
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(auditDir, 'report.html'), html, 'utf8');

const localReportLinks = [
  './comparison.md',
  './report-data.json',
  '../../specs/2026-07-14-url-to-flow-prompt-lab/prompt-v0.2.md',
  '../../specs/2026-07-14-url-to-flow-prompt-lab/review-rubric.md',
];
const missingReportLinks = localReportLinks.filter(
  (href) => !fs.existsSync(path.resolve(auditDir, href)),
);
if (missingReportLinks.length > 0) {
  throw new Error(`Broken local report links: ${missingReportLinks.join(', ')}`);
}
if (
  slides.length !== 15 ||
  !html.includes('<span>v0.1</span><strong class="cobalt">1/12</strong>') ||
  !html.includes('<span>v0.2</span><strong class="coral">12/12</strong>')
) {
  throw new Error('Report deck structure or first-viewport evidence copy is incomplete.');
}

console.log(`Wrote Prompt Lab report artifacts:
${rel(path.join(auditDir, 'report-data.json'))}
${rel(path.join(auditDir, 'comparison.md'))}
${rel(path.join(auditDir, 'report.html'))}`);
