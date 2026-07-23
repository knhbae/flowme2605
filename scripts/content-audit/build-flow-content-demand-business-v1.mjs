import fs from 'node:fs';
import path from 'node:path';
import {
  observedAt,
  goldBenchmarks,
  sourceCandidates,
  scoreModel,
  selectedContentBundles,
  comparisonBundles,
  flattened,
  portfolioCoverage,
  ruleGapProposals,
} from './flow-content-demand-business-v1-data.mjs';

const root = process.cwd();
const auditDir = path.join(root, 'docs', 'content-audit');
const assetName = '2026-07-22-flow-content-demand-business-assets';
const assetDir = path.join(auditDir, assetName);
const scanPath = path.join(assetDir, 'opened-url-scan-v1.json');
const screenshotPath = path.join(assetDir, 'screenshot-evidence-v1.json');
const ohouseScreenshotPath = path.join(assetDir, 'ohouse-screenshot-evidence-v1.json');
const goldOutputPath = path.join(auditDir, '2026-07-22-flow-content-gold-benchmark-v1.json');
const dataOutputPath = path.join(auditDir, '2026-07-22-flow-content-demand-business-data-v1.json');
const htmlOutputPath = path.join(auditDir, '2026-07-22-flow-content-demand-business-review-ko.html');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const scan = readJson(scanPath);
const screenshotEvidence = readJson(screenshotPath);
const ohouseScreenshotEvidence = readJson(ohouseScreenshotPath);
const allBundles = [...selectedContentBundles, ...comparisonBundles];
const sourceRowById = new Map(flattened.sourceRows.map((row) => [row.sourceRowId, row]));

const metricPatterns = [
  /(?:조회|댓글|스크랩|좋아요|구독자)\s*([0-9][0-9,.]*)/g,
  /(?:viewCount|view_count|reviewCount|ratingCount|commentCount)\\?"?\s*:\s*\\?"?([1-9][0-9]*)/gi,
  /(?:stars?|forks?)\D{0,20}([1-9][0-9,.]*[kKmM]?)/gi,
];

function hasPositiveNumericMetric(candidate) {
  const text = JSON.stringify(candidate.signals || {});
  return metricPatterns.some((pattern) => {
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    while (match) {
      const value = Number(String(match[1]).replace(/,/g, '').replace(/[kKmM]$/, ''));
      if (Number.isFinite(value) && value > 0) return true;
      match = pattern.exec(text);
    }
    return false;
  });
}

const numericDemandCandidates = scan.candidates.filter(hasPositiveNumericMetric);
const dualGateCandidates = sourceCandidates.filter((candidate) => candidate.hardGates.visibleDemand && candidate.hardGates.userCommunication);
const sourceRowCandidates = sourceCandidates.filter((candidate) => candidate.hardGates.sourceRows);

function enrichItem(item) {
  return {
    itemId: item.itemId,
    itemTitle: item.itemTitle,
    memo: item.memo,
    completionMode: item.completionMode,
    optional: Boolean(item.optional),
    schedule: item.schedule || null,
    sourceRowIds: item.sourceRowIds,
    sourceTrace: item.sourceRowIds.map((sourceRowId) => {
      const row = sourceRowById.get(sourceRowId);
      return {
        sourceRowId,
        sourceUrl: row?.sourceUrl || null,
        sourceLocator: row?.sourceLocator || null,
      };
    }),
  };
}

function publicBundle(entry) {
  return {
    bundleId: entry.bundleId,
    title: entry.title,
    category: entry.category,
    status: entry.status,
    sourceType: entry.sourceType,
    sourceUrls: entry.sourceUrls,
    userPromise: entry.userPromise,
    firstAction: entry.firstAction,
    setupFields: entry.setupFields,
    defaultArtifact: entry.defaultArtifact,
    rightsMode: entry.rightsMode,
    cautions: entry.cautions || [],
    map: {
      mapId: entry.map.mapId,
      title: entry.map.title,
      flows: entry.map.flows.map((flow) => ({
        flowId: flow.flowId,
        title: flow.title,
        expectedItemCount: flow.expectedItemCount,
        sourceVideoUrl: flow.sourceVideoUrl || null,
        steps: flow.steps.map((step) => ({
          stepId: step.stepId,
          title: step.title,
          schedule: step.schedule || null,
          prerequisite: step.prerequisite || null,
          items: step.items.map(enrichItem),
        })),
      })),
    },
  };
}

const selectedPublicBundles = selectedContentBundles.map(publicBundle);
const comparisonPublicBundles = comparisonBundles.map(publicBundle);
const candidateByBundleId = new Map(sourceCandidates.filter((entry) => entry.selectedBundleId).map((entry) => [entry.selectedBundleId, entry]));

const reviewRecords = allBundles.map((entry) => {
  const candidate = candidateByBundleId.get(entry.bundleId)
    || sourceCandidates.find((candidateEntry) => candidateEntry.sourceUrl === entry.sourceUrls[0]);
  return {
    bundleId: entry.bundleId,
    decision: entry.decision,
    status: entry.status,
    candidateId: candidate?.candidateId || null,
    scoreTotal: candidate?.scores.total || null,
    scores: candidate?.scores || null,
    demandEvidence: candidate?.demandEvidence || [],
    communicationEvidence: candidate?.communicationEvidence || [],
    copyIntentEvidence: candidate?.copyIntentEvidence || [],
    businessEvidence: candidate?.businessEvidence || [],
    businessValue: entry.businessValue,
    uxFit: entry.uxFit,
    screenshots: entry.screenshots,
    rightsAndSafety: candidate?.rightsAndSafety || null,
    hardGateFailure: entry.hardGateFailure || null,
  };
});

const goldOutput = {
  schemaVersion: 'flowme-flow-content-gold-benchmark-v1',
  generatedAt: new Date().toISOString(),
  observedAt,
  purpose: '사용자 엄선 원문 9개를 수요·소통·복사 의도·비즈니스 가치·실행 구조의 검색 기준으로 재검증한다.',
  statusDefinitions: {
    gold_reference: '새 후보가 닮아야 할 수요·소통·실행 결합 사례',
    high_potential_after_import: '원문 행을 추가 확보하거나 범위를 좁히면 대표가 될 수 있음',
    boundary_example: '구조 또는 신뢰는 좋지만 대표 검색 모델의 hard gate를 충족하지 못함',
    reject_as_search_model: '새 후보 검색의 출발점으로 사용하지 않음',
  },
  goldBenchmarks,
  extractedSearchRules: [
    '사용자가 이미 저장·다운로드·요청·옮겨 적는 원문을 먼저 찾는다.',
    '댓글·질문·후기·수정 요청 중 하나가 실제로 보여야 creator 대표 후보가 된다.',
    '계획표·파일 행·영상 순서·D-day 체크처럼 원문 실행 행이 있어야 한다.',
    '제작자가 원문 유입·후속 글·상품·상담·커뮤니티를 위해 Flow를 공유할 이유가 있어야 한다.',
    '공식 정보는 creator 대표와 섞지 않고 최신성·안전성을 보강하는 trust anchor로 쓴다.',
    '구조만 좋은 원문은 Modify 또는 boundary로 남기고 수량을 맞추려고 승격하지 않는다.',
  ],
  goldReferences: goldBenchmarks.filter((entry) => entry.status === 'gold_reference').map((entry) => entry.benchmarkId),
  boundaryReferences: goldBenchmarks.filter((entry) => entry.status === 'boundary_example').map((entry) => entry.benchmarkId),
};

const dataOutput = {
  schemaVersion: 'flowme-flow-content-demand-business-data-v1',
  generatedAt: new Date().toISOString(),
  observedAt,
  evidenceBoundary: '공개 URL과 공개 첨부파일을 2026-07-22에 확인한 조사 결과다. 비공개·구매·로그인 영역과 보이지 않는 수치는 unknown으로 남겼다.',
  researchSummary: {
    discoveredUrls: scan.counts.discoveredUrls,
    attemptedUrls: scan.counts.attemptedUrls,
    openedUrls: scan.counts.openedUrls,
    failedOrLimitedUrls: scan.counts.failedOrLimitedUrls,
    numericDemandEvidenceUrls: numericDemandCandidates.length,
    demandAndCommunicationValidatedCandidates: dualGateCandidates.length,
    sourceRowSecuredCandidates: sourceRowCandidates.length,
    deepReviewedCandidates: sourceCandidates.length,
    screenshotReviewedSources: screenshotEvidence.results.length + ohouseScreenshotEvidence.results.length,
    representativeBundles: selectedContentBundles.length,
    comparisonBundles: comparisonBundles.length,
  },
  scoreModel,
  portfolioCoverage,
  openedUrlEvidence: {
    ledger: `${assetName}/opened-url-scan-v1.json`,
    counts: scan.counts,
    numericMetricCandidateIds: numericDemandCandidates.map((entry) => entry.candidateId),
  },
  screenshotEvidence: {
    browserLedger: `${assetName}/screenshot-evidence-v1.json`,
    publicHtmlSnapshotLedger: `${assetName}/ohouse-screenshot-evidence-v1.json`,
    note: '오늘의집 직접 자동 탐색은 CDN 차단이 발생해, 같은 날 HTTP 200으로 받은 공개 원문 HTML을 스크립트 없이 렌더링한 스냅샷을 사용했다.',
    manualAttachmentCaptures: [
      `${assetName}/gold-baby-food-plan-page1.png`,
      `${assetName}/gold-baby-food-plan-page2.png`,
    ],
  },
  sourceCandidates,
  selectedContentBundles: selectedPublicBundles,
  comparisonBundles: comparisonPublicBundles,
  sourceRows: flattened.sourceRows,
  flows: flattened.flows,
  steps: flattened.steps,
  items: flattened.items,
  reviewRecords,
  ruleGapProposals,
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateData() {
  assert(scan.counts.discoveredUrls >= 200, '발견 URL 200개 미만');
  assert(scan.counts.openedUrls >= 120, '실제 열람 URL 120개 미만');
  assert(numericDemandCandidates.length >= 40, `수치 수요 근거 후보 40개 미만: ${numericDemandCandidates.length}`);
  assert(dualGateCandidates.length >= 24, `수요·소통 동시 통과 24개 미만: ${dualGateCandidates.length}`);
  assert(sourceRowCandidates.length >= 18, `source row 확보 후보 18개 미만: ${sourceRowCandidates.length}`);
  assert(selectedContentBundles.length >= 8 && selectedContentBundles.length <= 12, '대표 Bundle은 8~12개여야 함');
  assert(Object.keys(portfolioCoverage.lifeAreas).length >= 6, '대표 생활 영역 6개 미만');
  assert(selectedContentBundles.every((entry) => entry.map.flows.length > 0), 'Flow 없는 대표 Bundle 존재');
  assert(sourceCandidates.every((entry) => Object.values(entry.scores).every((scoreEntry) => typeof scoreEntry === 'number' || (scoreEntry.comment && Number.isFinite(scoreEntry.score)))), '점수 또는 점수 코멘트 누락');
  assert(flattened.items.every((entry) => entry.sourceRowIds.length > 0), 'sourceRowIds 없는 Item 존재');
  assert(flattened.items.every((entry) => entry.sourceTrace.every((trace) => trace.sourceUrl && trace.sourceLocator)), 'sourceTrace URL/locator 누락');
  const ids = new Set(flattened.sourceRows.map((row) => row.sourceRowId));
  assert(flattened.items.every((entry) => entry.sourceRowIds.every((id) => ids.has(id))), '존재하지 않는 sourceRowId 참조');
  for (const entry of allBundles) {
    for (const screenshot of entry.screenshots) {
      assert(fs.existsSync(path.join(assetDir, screenshot)), `캡처 누락: ${screenshot}`);
    }
  }
  const forbidden = /\b(?:TODO|TBD|placeholder)\b|generic memoHint|memoHint/iu;
  assert(!forbidden.test(JSON.stringify(dataOutput)), '금지된 placeholder 또는 memoHint 발견');
  return {
    discoveredUrls: scan.counts.discoveredUrls,
    openedUrls: scan.counts.openedUrls,
    numericDemandEvidenceUrls: numericDemandCandidates.length,
    dualGateCandidates: dualGateCandidates.length,
    sourceRowCandidates: sourceRowCandidates.length,
    selectedBundles: selectedContentBundles.length,
    flows: flattened.flows.length,
    steps: flattened.steps.length,
    items: flattened.items.length,
    sourceRows: flattened.sourceRows.length,
  };
}

const validation = validateData();
dataOutput.validation = validation;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function countBundle(entry) {
  const flows = entry.map.flows.length;
  const steps = entry.map.flows.reduce((sum, flow) => sum + flow.steps.length, 0);
  const items = entry.map.flows.reduce((sum, flow) => sum + flow.steps.reduce((stepSum, step) => stepSum + step.items.length, 0), 0);
  return { flows, steps, items };
}

function categoryKey(category) {
  return category.replaceAll('·', '-').replaceAll(' ', '-');
}

function sourceLinks(entry) {
  return entry.sourceUrls.map((url, index) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">원문 ${index + 1}</a>`).join('');
}

function evidencePills(items, emptyText = '공개 수치 없음') {
  if (!items?.length) return `<span class="muted">${escapeHtml(emptyText)}</span>`;
  return items.map((entry) => `<span class="evidence-pill">${escapeHtml(entry)}</span>`).join('');
}

function renderScreenshots(entry) {
  return `<div class="shot-grid">${entry.screenshots.map((file, index) => `
    <figure>
      <a href="${assetName}/${escapeHtml(file)}" target="_blank">
        <img src="${assetName}/${escapeHtml(file)}" alt="${escapeHtml(entry.title)} 원문 증거 ${index + 1}" loading="lazy">
      </a>
      <figcaption>원문 증거 ${index + 1} · ${escapeHtml(file.replace(/\.png$/i, ''))}</figcaption>
    </figure>`).join('')}</div>`;
}

function renderItem(itemEntry, itemIndex) {
  const traces = itemEntry.sourceRowIds.map((sourceRowId) => sourceRowById.get(sourceRowId)).filter(Boolean);
  return `<article class="flow-item">
    <div class="item-head"><span class="check-box" aria-hidden="true"></span><strong>${escapeHtml(itemEntry.itemTitle)}</strong>${itemEntry.optional ? '<span class="tag optional">선택</span>' : ''}</div>
    <p>${escapeHtml(itemEntry.memo)}</p>
    <details class="trace"><summary>원문 근거 ${traces.length}개</summary>
      <ul>${traces.map((row) => `<li><a href="${escapeHtml(row.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(row.label)}</a><span>${escapeHtml(row.sourceLocator)}</span></li>`).join('')}</ul>
    </details>
  </article>`;
}

function renderFlowTree(entry) {
  return entry.map.flows.map((flowEntry, flowIndex) => {
    const itemCount = flowEntry.steps.reduce((sum, stepEntry) => sum + stepEntry.items.length, 0);
    return `<details class="flow-block" ${flowIndex === 0 ? 'open' : ''}>
      <summary><span><small>Flow ${flowIndex + 1}</small>${escapeHtml(flowEntry.title)}</span><b>${flowEntry.steps.length} Step · ${itemCount} Item</b></summary>
      <div class="step-list">${flowEntry.steps.map((stepEntry, stepIndex) => `<section class="step-block">
        <header><span>Step ${stepIndex + 1}</span><h4>${escapeHtml(stepEntry.title)}</h4><b>${stepEntry.items.length}</b></header>
        ${stepEntry.items.length ? `<div class="item-list">${stepEntry.items.map(renderItem).join('')}</div>` : '<p class="empty-row">원문 휴식 구간: 실행 Item 없음</p>'}
      </section>`).join('')}</div>
    </details>`;
  }).join('');
}

function renderPreview(entry) {
  const firstFlow = entry.map.flows[0];
  const firstStep = firstFlow.steps[0];
  const previewItems = firstStep.items.slice(0, 3);
  return `<div class="live-preview">
    <div><small>저장하면 가장 먼저 보이는 내용</small><strong>${escapeHtml(firstStep.title)}</strong></div>
    <ul>${previewItems.map((itemEntry) => `<li><span class="check-box" aria-hidden="true"></span>${escapeHtml(itemEntry.itemTitle)}</li>`).join('')}</ul>
    ${firstStep.items.length > 3 ? `<p>외 ${firstStep.items.length - 3}개 · 전체 내용은 아래에서 확인</p>` : ''}
  </div>`;
}

function renderScores(candidate) {
  if (!candidate) return '';
  const entries = Object.entries(candidate.scores).filter(([key]) => key !== 'total');
  const labels = {
    visibleDemandScore: '보이는 수요',
    userCommunicationScore: '사용자 소통',
    copyExecutionIntentScore: '복사·실행 의도',
    creatorBusinessValueScore: '제작자·사업 가치',
    flowConversionFitScore: 'Flow 변환 적합성',
    portfolioCoverageScore: '포트폴리오 확장',
  };
  return `<details class="score-panel"><summary>점수와 감점 이유 · ${candidate.scores.total}/100</summary>
    <div class="score-list">${entries.map(([key, value]) => `<article><header><strong>${labels[key]}</strong><b>${value.score}/${value.max}</b></header><p>${escapeHtml(value.comment)}</p></article>`).join('')}</div>
  </details>`;
}

function renderMapping(entry) {
  const rows = [];
  for (const flowEntry of entry.map.flows) {
    for (const stepEntry of flowEntry.steps) {
      for (const itemEntry of stepEntry.items) {
        const traces = itemEntry.sourceRowIds.map((id) => sourceRowById.get(id)).filter(Boolean);
        rows.push(`<li><div><strong>${escapeHtml(itemEntry.itemTitle)}</strong><span>${escapeHtml(flowEntry.title)} · ${escapeHtml(stepEntry.title)}</span></div><div>${traces.map((row) => `<a href="${escapeHtml(row.sourceUrl)}" target="_blank">${escapeHtml(row.sourceLocator)}</a>`).join('')}</div></li>`);
      }
    }
  }
  return `<details class="mapping"><summary>원문 행 ↔ Item 대응 전체 ${rows.length}개</summary><ol>${rows.join('')}</ol></details>`;
}

function renderBundleDetail(entry, decisionOverride = null) {
  const counts = countBundle(entry);
  const review = reviewRecords.find((record) => record.bundleId === entry.bundleId);
  const candidate = sourceCandidates.find((candidateEntry) => candidateEntry.candidateId === review?.candidateId);
  const decision = decisionOverride || entry.decision;
  return `<article class="bundle-detail" id="${escapeHtml(entry.bundleId)}" data-decision="${escapeHtml(decision)}" data-category="${escapeHtml(categoryKey(entry.category))}">
    <header class="bundle-head">
      <div><span class="decision ${decision.toLowerCase()}">${escapeHtml(decision)}</span><span class="category">${escapeHtml(entry.category)}</span></div>
      <h2>${escapeHtml(entry.title)}</h2>
      <p>${escapeHtml(entry.userPromise)}</p>
      <div class="source-links">${sourceLinks(entry)}</div>
    </header>
    <div class="key-strip">
      <div><small>핵심 수요</small><strong>${escapeHtml(candidate?.demandEvidence?.[0] || '확인 필요')}</strong></div>
      <div><small>소통 증거</small><strong>${escapeHtml(candidate?.communicationEvidence?.[0] || '확인 필요')}</strong></div>
      <div><small>전체 구조</small><strong>${counts.flows} Flow · ${counts.steps} Step · ${counts.items} Item</strong></div>
      <div><small>최초 입력</small><strong>${escapeHtml(entry.uxFit.inputCount)}</strong></div>
    </div>
    ${renderScreenshots(entry)}
    <section class="value-grid">
      <article><small>사용자 가치</small><p>${escapeHtml(entry.businessValue.user)}</p></article>
      <article><small>제작자 가치</small><p>${escapeHtml(entry.businessValue.creator)}</p></article>
      <article><small>FlowMe 가치</small><p>${escapeHtml(entry.businessValue.flowMe)}</p></article>
    </section>
    <section class="ux-strip">
      <div><small>카드 약속</small><strong>${escapeHtml(entry.uxFit.cardPromise)}</strong></div>
      <div><small>첫 화면</small><strong>${escapeHtml(entry.uxFit.firstScreen)}</strong></div>
      <div><small>모바일</small><strong>${escapeHtml(entry.uxFit.mobileRule)}</strong></div>
      <div><small>판정</small><strong>${escapeHtml(entry.uxFit.verdict)}</strong></div>
    </section>
    ${entry.hardGateFailure ? `<aside class="modify-note"><strong>Modify 사유</strong><p>${escapeHtml(entry.hardGateFailure)}</p></aside>` : ''}
    ${renderPreview(entry)}
    <section class="flow-content">
      <header><div><small>실제 적용 데이터</small><h3>Flow 콘텐츠 전체</h3></div><button type="button" class="expand-bundle" data-target="${escapeHtml(entry.bundleId)}">모두 펼치기</button></header>
      ${renderFlowTree(entry)}
    </section>
    ${renderMapping(entry)}
    <section class="evidence-lines"><div><small>수요</small>${evidencePills(candidate?.demandEvidence)}</div><div><small>소통</small>${evidencePills(candidate?.communicationEvidence)}</div><div><small>복사 의도</small>${evidencePills(candidate?.copyIntentEvidence)}</div><div><small>비즈니스</small>${evidencePills(candidate?.businessEvidence)}</div></section>
    ${renderScores(candidate)}
  </article>`;
}

function renderDecisionCard(entry, decision = entry.decision, href = `#${entry.bundleId}`) {
  const counts = countBundle(entry);
  const review = reviewRecords.find((record) => record.bundleId === entry.bundleId);
  const candidate = sourceCandidates.find((candidateEntry) => candidateEntry.candidateId === review?.candidateId);
  return `<a class="decision-card" href="${escapeHtml(href)}" data-decision="${escapeHtml(decision)}" data-category="${escapeHtml(categoryKey(entry.category))}">
    <div><span class="decision ${decision.toLowerCase()}">${escapeHtml(decision)}</span><span class="category">${escapeHtml(entry.category)}</span></div>
    <h3>${escapeHtml(entry.title)}</h3>
    <p>${escapeHtml(entry.userPromise)}</p>
    <dl><div><dt>수요</dt><dd>${escapeHtml(candidate?.demandEvidence?.[0] || '확인 필요')}</dd></div><div><dt>소통</dt><dd>${escapeHtml(candidate?.communicationEvidence?.[0] || '확인 필요')}</dd></div></dl>
    <footer><strong>${counts.flows} Flow · ${counts.items} Item</strong><span>${candidate?.scores.total || '-'}점</span></footer>
  </a>`;
}

function renderHoldCard(benchmark) {
  return `<a class="decision-card hold-card" href="#gold-benchmarks" data-decision="Hold" data-category="all">
    <div><span class="decision hold">Hold</span><span class="category">Gold 경계</span></div>
    <h3>${escapeHtml(benchmark.title)}</h3>
    <p>${escapeHtml(benchmark.reason)}</p>
    <footer><strong>${escapeHtml(benchmark.status)}</strong><span>보류</span></footer>
  </a>`;
}

function renderGoldBenchmarks() {
  return goldBenchmarks.map((entry) => `<article class="gold-row">
    <header><span class="gold-status ${escapeHtml(entry.status)}">${escapeHtml(entry.status)}</span><h3>${escapeHtml(entry.title)}</h3><a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer">원문</a></header>
    <p>${escapeHtml(entry.reason)}</p>
    <div><strong>검색 기준으로 남긴 규칙</strong><span>${escapeHtml(entry.learnedRule)}</span></div>
  </article>`).join('');
}

function renderCandidateAppendix() {
  const label = {
    representative: '대표',
    promising_after_fix: '보완 후 유망',
    backup: '백업',
    trust_anchor: '공식 기준',
    source_import_required: '원문 행 필요',
  };
  return sourceCandidates.map((candidate) => `<details class="candidate-row">
    <summary><span><b>${escapeHtml(label[candidate.verdict] || candidate.verdict)}</b>${escapeHtml(candidate.title)}</span><strong>${candidate.scores.total}/100</strong></summary>
    <div class="candidate-body">
      <a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 열기</a>
      <p><b>수요:</b> ${escapeHtml(candidate.demandEvidence.join(' · ') || 'unknown')}</p>
      <p><b>소통:</b> ${escapeHtml(candidate.communicationEvidence.join(' · ') || 'unknown')}</p>
      <p><b>행 확보:</b> ${escapeHtml(candidate.sourceRowStatus)}</p>
      ${renderScores(candidate)}
    </div>
  </details>`).join('');
}

const comparisonSourceUrls = new Set(comparisonBundles.flatMap((entry) => entry.sourceUrls));
const holdBenchmarks = goldBenchmarks.filter((entry) => entry.status === 'boundary_example' && !comparisonSourceUrls.has(entry.url));
const categoryOptions = [...new Set(selectedContentBundles.map((entry) => entry.category))];
const selectedCards = selectedContentBundles.map((entry) => renderDecisionCard(entry)).join('');
const comparisonCards = comparisonBundles.map((entry) => renderDecisionCard(entry, 'Modify')).join('');
const holdCards = holdBenchmarks.map(renderHoldCard).join('');
const detailSections = selectedContentBundles.map((entry) => renderBundleDetail(entry)).join('');
const comparisonSections = comparisonBundles.map((entry) => renderBundleDetail(entry, 'Modify')).join('');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FlowMe 수요·비즈니스 원문 발굴 결과</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f6f5;
      --paper: #ffffff;
      --ink: #18201c;
      --muted: #65706a;
      --line: #d9dfdc;
      --green: #17643a;
      --green-soft: #e8f3ec;
      --blue: #1d4f91;
      --blue-soft: #eaf1fa;
      --amber: #8a5200;
      --amber-soft: #fff5db;
      --red: #9c2f2f;
      --red-soft: #fdeeee;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: var(--bg); color: var(--ink); font-family: Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif; letter-spacing: 0; line-height: 1.58; }
    a { color: var(--blue); text-decoration-thickness: 1px; text-underline-offset: 3px; }
    button, select { font: inherit; letter-spacing: 0; }
    button { cursor: pointer; }
    .shell { width: min(1240px, calc(100% - 40px)); margin: 0 auto; }
    .top { padding: 34px 0 22px; border-bottom: 1px solid var(--line); background: var(--paper); }
    .eyebrow { margin: 0 0 5px; color: var(--green); font-size: 13px; font-weight: 800; }
    h1 { margin: 0; max-width: 900px; font-size: 34px; line-height: 1.24; }
    .lede { max-width: 900px; margin: 12px 0 0; color: var(--muted); font-size: 16px; }
    .stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 24px; }
    .stats article { padding: 14px; border: 1px solid var(--line); border-radius: 6px; background: #fafbfa; }
    .stats small, .key-strip small, .value-grid small, .ux-strip small, .live-preview small, .evidence-lines small { display: block; color: var(--muted); font-size: 12px; font-weight: 800; }
    .stats strong { display: block; margin-top: 2px; font-size: 23px; line-height: 1.2; }
    .stats span { display: block; margin-top: 3px; color: var(--muted); font-size: 12px; }
    .filter-bar { position: sticky; top: 0; z-index: 20; border-bottom: 1px solid var(--line); background: rgba(255,255,255,.96); backdrop-filter: blur(8px); }
    .filter-inner { display: flex; gap: 8px; align-items: center; min-height: 58px; overflow-x: auto; scrollbar-width: none; }
    .filter-inner::-webkit-scrollbar { display: none; }
    .filter-button { flex: 0 0 auto; min-height: 36px; padding: 0 13px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--ink); font-weight: 800; }
    .filter-button[aria-pressed="true"] { border-color: var(--green); background: var(--green); color: #fff; }
    .category-select { min-height: 36px; margin-left: auto; padding: 0 34px 0 10px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--ink); }
    .section { padding: 30px 0; }
    .section-title { display: flex; justify-content: space-between; gap: 16px; align-items: end; margin-bottom: 14px; }
    .section-title h2 { margin: 0; font-size: 24px; }
    .section-title p { margin: 0; color: var(--muted); }
    .decision-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .decision-card { display: flex; min-height: 260px; flex-direction: column; padding: 16px; border: 1px solid var(--line); border-radius: 7px; background: var(--paper); color: var(--ink); text-decoration: none; }
    .decision-card:hover { border-color: #9fb2a7; box-shadow: 0 5px 18px rgba(25,43,32,.08); }
    .decision-card h3 { margin: 12px 0 7px; font-size: 19px; line-height: 1.35; }
    .decision-card > p { margin: 0 0 13px; color: var(--muted); font-size: 14px; }
    .decision-card dl { margin: auto 0 0; }
    .decision-card dl div { display: grid; grid-template-columns: 42px 1fr; gap: 6px; padding: 5px 0; border-top: 1px solid #edf0ee; font-size: 12px; }
    .decision-card dt { color: var(--muted); font-weight: 800; }
    .decision-card dd { margin: 0; }
    .decision-card footer { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--line); font-size: 13px; }
    .decision, .category, .tag, .gold-status { display: inline-flex; align-items: center; min-height: 24px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 900; }
    .decision.go { background: var(--green-soft); color: var(--green); }
    .decision.modify { background: var(--amber-soft); color: var(--amber); }
    .decision.hold { background: var(--red-soft); color: var(--red); }
    .category { margin-left: 5px; background: #eef1ef; color: #56615b; }
    .bundle-detail { margin: 18px 0 36px; border: 1px solid var(--line); border-radius: 8px; background: var(--paper); overflow: hidden; scroll-margin-top: 72px; }
    .bundle-head { padding: 24px; border-bottom: 1px solid var(--line); }
    .bundle-head h2 { margin: 10px 0 5px; font-size: 27px; line-height: 1.3; }
    .bundle-head > p { margin: 0; color: var(--muted); font-size: 16px; }
    .source-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; font-size: 13px; }
    .key-strip, .ux-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-bottom: 1px solid var(--line); }
    .key-strip > div, .ux-strip > div { min-height: 94px; padding: 14px; border-right: 1px solid var(--line); }
    .key-strip > div:last-child, .ux-strip > div:last-child { border-right: 0; }
    .key-strip strong, .ux-strip strong { display: block; margin-top: 5px; font-size: 14px; line-height: 1.45; }
    .shot-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 16px; border-bottom: 1px solid var(--line); background: #f9faf9; }
    .shot-grid figure { min-width: 0; margin: 0; border: 1px solid var(--line); border-radius: 5px; background: white; overflow: hidden; }
    .shot-grid a { display: block; aspect-ratio: 16 / 10; background: #eef1ef; }
    .shot-grid img { display: block; width: 100%; height: 100%; object-fit: contain; }
    .shot-grid figcaption { padding: 7px 9px; color: var(--muted); font-size: 11px; overflow-wrap: anywhere; }
    .value-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-bottom: 1px solid var(--line); }
    .value-grid article { padding: 16px; border-right: 1px solid var(--line); }
    .value-grid article:last-child { border-right: 0; }
    .value-grid p { margin: 6px 0 0; font-size: 14px; }
    .ux-strip { background: var(--blue-soft); }
    .modify-note { margin: 16px; padding: 13px; border: 1px solid #ecd39b; border-radius: 5px; background: var(--amber-soft); }
    .modify-note p { margin: 4px 0 0; }
    .live-preview { margin: 18px; padding: 16px; border: 1px solid #bdd5c6; border-radius: 6px; background: var(--green-soft); }
    .live-preview strong { display: block; margin-top: 2px; font-size: 18px; }
    .live-preview ul { display: grid; gap: 6px; margin: 12px 0 0; padding: 0; list-style: none; }
    .live-preview li { display: flex; gap: 9px; align-items: center; padding: 8px 10px; border: 1px solid #ccdfd3; border-radius: 4px; background: #fff; }
    .live-preview p { margin: 8px 0 0; color: var(--muted); font-size: 12px; }
    .check-box { flex: 0 0 18px; width: 18px; height: 18px; border: 2px solid #9da9a2; border-radius: 4px; background: #fff; }
    .flow-content { padding: 18px; border-top: 1px solid var(--line); }
    .flow-content > header { display: flex; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 10px; }
    .flow-content h3 { margin: 0; font-size: 21px; }
    .flow-content > header small { color: var(--green); font-weight: 900; }
    .expand-bundle { min-height: 36px; padding: 0 12px; border: 1px solid var(--green); border-radius: 5px; background: #fff; color: var(--green); font-weight: 800; }
    details > summary { cursor: pointer; }
    .flow-block { margin-top: 8px; border: 1px solid var(--line); border-radius: 6px; background: #fff; overflow: hidden; }
    .flow-block > summary { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 13px 14px; background: #f7f9f8; font-weight: 800; list-style-position: inside; }
    .flow-block > summary span { display: grid; gap: 1px; min-width: 0; }
    .flow-block > summary small { color: var(--green); font-size: 10px; }
    .flow-block > summary b { flex: 0 0 auto; color: var(--muted); font-size: 12px; }
    .step-list { padding: 8px; }
    .step-block { margin: 7px 0; border: 1px solid #e4e8e6; border-radius: 5px; }
    .step-block > header { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; padding: 10px 12px; border-bottom: 1px solid #e8ecea; background: #fcfdfc; }
    .step-block > header span { color: var(--green); font-size: 11px; font-weight: 900; }
    .step-block h4 { margin: 0; font-size: 15px; }
    .step-block > header b { display: grid; place-items: center; min-width: 25px; height: 25px; border-radius: 4px; background: #eef1ef; font-size: 11px; }
    .item-list { display: grid; gap: 7px; padding: 8px; }
    .flow-item { padding: 11px; border: 1px solid #e4e8e6; border-radius: 5px; background: #fff; }
    .item-head { display: flex; align-items: flex-start; gap: 8px; }
    .item-head strong { min-width: 0; font-size: 14px; }
    .tag.optional { margin-left: auto; background: var(--blue-soft); color: var(--blue); }
    .flow-item > p { margin: 7px 0 0 26px; color: #4e5a53; font-size: 13px; overflow-wrap: anywhere; }
    .trace { margin: 8px 0 0 26px; color: var(--muted); font-size: 12px; }
    .trace ul { display: grid; gap: 5px; margin: 7px 0 0; padding: 0; list-style: none; }
    .trace li { display: grid; gap: 1px; padding: 7px; border-left: 2px solid #b9c7bf; background: #f7f9f8; }
    .trace li span { overflow-wrap: anywhere; }
    .empty-row { margin: 0; padding: 12px; color: var(--muted); font-size: 13px; }
    .mapping, .score-panel { margin: 0 18px 18px; border: 1px solid var(--line); border-radius: 6px; background: #fff; }
    .mapping > summary, .score-panel > summary { padding: 12px 14px; font-weight: 900; }
    .mapping ol { display: grid; gap: 0; margin: 0; padding: 0; border-top: 1px solid var(--line); list-style: none; }
    .mapping li { display: grid; grid-template-columns: minmax(220px, .9fr) minmax(280px, 1.1fr); gap: 12px; padding: 9px 12px; border-bottom: 1px solid #edf0ee; }
    .mapping li:last-child { border-bottom: 0; }
    .mapping li > div { display: grid; gap: 2px; min-width: 0; }
    .mapping span { color: var(--muted); font-size: 11px; }
    .mapping a { overflow-wrap: anywhere; font-size: 12px; }
    .evidence-lines { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 0 18px 18px; }
    .evidence-lines > div { padding: 12px; border: 1px solid var(--line); border-radius: 5px; }
    .evidence-pill { display: block; margin-top: 4px; font-size: 13px; }
    .score-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; border-top: 1px solid var(--line); }
    .score-list article { padding: 12px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    .score-list article:nth-child(2n) { border-right: 0; }
    .score-list header { display: flex; justify-content: space-between; gap: 8px; }
    .score-list p { margin: 5px 0 0; color: var(--muted); font-size: 12px; }
    .gold-list { display: grid; gap: 8px; }
    .gold-row { padding: 15px; border: 1px solid var(--line); border-radius: 6px; background: #fff; }
    .gold-row header { display: flex; gap: 8px; align-items: center; }
    .gold-row h3 { margin: 0; font-size: 17px; }
    .gold-row header a { margin-left: auto; font-size: 12px; }
    .gold-row p { margin: 8px 0; color: var(--muted); }
    .gold-row > div { display: grid; gap: 2px; padding-top: 8px; border-top: 1px solid #edf0ee; font-size: 13px; }
    .gold-status.gold_reference { background: var(--green-soft); color: var(--green); }
    .gold-status.high_potential_after_import { background: var(--blue-soft); color: var(--blue); }
    .gold-status.boundary_example { background: var(--amber-soft); color: var(--amber); }
    .appendix { margin-bottom: 50px; }
    .appendix > details { border: 1px solid var(--line); border-radius: 6px; background: #fff; }
    .appendix > details > summary { padding: 14px 16px; font-weight: 900; }
    .candidate-list { display: grid; gap: 6px; padding: 8px; border-top: 1px solid var(--line); }
    .candidate-row { border: 1px solid #e4e8e6; border-radius: 5px; }
    .candidate-row > summary { display: flex; justify-content: space-between; gap: 10px; padding: 10px 12px; }
    .candidate-row > summary span { display: flex; gap: 8px; align-items: center; min-width: 0; }
    .candidate-row > summary b { flex: 0 0 auto; color: var(--green); font-size: 11px; }
    .candidate-body { padding: 12px; border-top: 1px solid var(--line); }
    .candidate-body > p { margin: 5px 0; font-size: 13px; }
    .candidate-body .score-panel { margin: 10px 0 0; }
    .muted { color: var(--muted); }
    .hidden { display: none !important; }
    .no-results { display: none; margin: 16px 0; padding: 18px; border: 1px dashed var(--line); text-align: center; color: var(--muted); }
    .no-results.visible { display: block; }
    .footer { padding: 24px 0 38px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; }
    @media (max-width: 900px) {
      .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .decision-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .key-strip, .ux-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .key-strip > div:nth-child(2), .ux-strip > div:nth-child(2) { border-right: 0; }
      .key-strip > div:nth-child(-n+2), .ux-strip > div:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
      .shot-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 640px) {
      .shell { width: min(100% - 20px, 1240px); }
      .top { padding: 22px 0 18px; }
      h1 { font-size: 26px; }
      .lede { font-size: 14px; }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .stats article { padding: 11px; }
      .stats strong { font-size: 20px; }
      .filter-inner { min-height: 52px; flex-wrap: wrap; padding: 8px 0; overflow: visible; }
      .category-select { flex: 1 0 100%; width: 100%; margin-left: 0; }
      .section { padding: 22px 0; }
      .section-title { display: block; }
      .section-title h2 { font-size: 21px; }
      .section-title p { margin-top: 4px; font-size: 13px; }
      .decision-grid { grid-template-columns: 1fr; }
      .decision-card { min-height: 0; }
      .bundle-detail { margin: 12px 0 28px; }
      .bundle-head { padding: 16px; }
      .bundle-head h2 { font-size: 22px; }
      .bundle-head > p { font-size: 14px; }
      .key-strip, .ux-strip, .value-grid, .evidence-lines { grid-template-columns: 1fr; }
      .key-strip > div, .ux-strip > div, .value-grid article { min-height: 0; border-right: 0; border-bottom: 1px solid var(--line); }
      .key-strip > div:last-child, .ux-strip > div:last-child, .value-grid article:last-child { border-bottom: 0; }
      .shot-grid { display: flex; gap: 8px; padding: 12px; overflow-x: auto; scroll-snap-type: x mandatory; }
      .shot-grid figure { flex: 0 0 88%; scroll-snap-align: start; }
      .live-preview { margin: 12px; padding: 13px; }
      .flow-content { padding: 12px; }
      .flow-content > header { align-items: center; }
      .flow-block > summary { align-items: flex-start; }
      .flow-block > summary b { max-width: 90px; white-space: normal; text-align: right; }
      .step-list { padding: 5px; }
      .step-block > header { grid-template-columns: auto 1fr auto; padding: 9px; }
      .item-list { padding: 5px; }
      .flow-item { padding: 10px; }
      .flow-item > p, .trace { margin-left: 0; }
      .mapping, .score-panel { margin: 0 12px 12px; }
      .mapping li { grid-template-columns: 1fr; gap: 4px; }
      .evidence-lines { margin: 0 12px 12px; }
      .score-list { grid-template-columns: 1fr; }
      .score-list article { border-right: 0; }
      .gold-row header { align-items: flex-start; flex-wrap: wrap; }
      .gold-row header a { margin-left: 0; }
    }
  </style>
</head>
<body>
  <header class="top">
    <div class="shell">
      <p class="eyebrow">2026-07-22 · 실제 원문 수요·소통·사업 가치 검증</p>
      <h1>사람들이 이미 저장하고 묻는 콘텐츠만 Flow로 만들었습니다</h1>
      <p class="lede">첫 화면은 대표 후보와 원문 증거입니다. 각 카드에서 원문 캡처, 저장 후 보이는 화면, 실제 Flow/Step/Item 전체와 점수 감점 이유를 차례로 확인할 수 있습니다.</p>
      <div class="stats">
        <article><small>발견 URL</small><strong>${validation.discoveredUrls}</strong><span>검색·기존 원장 통합</span></article>
        <article><small>실제 열람</small><strong>${validation.openedUrls}</strong><span>본문·파일·영상 확인</span></article>
        <article><small>수치 수요</small><strong>${validation.numericDemandEvidenceUrls}</strong><span>0보다 큰 공개 지표</span></article>
        <article><small>수요+소통</small><strong>${validation.dualGateCandidates}</strong><span>동시 hard gate 통과</span></article>
        <article><small>대표 Flow</small><strong>${validation.selectedBundles}</strong><span>${Object.keys(portfolioCoverage.lifeAreas).length}개 생활 영역</span></article>
      </div>
    </div>
  </header>

  <nav class="filter-bar" aria-label="후보 필터">
    <div class="shell filter-inner">
      <button class="filter-button" type="button" data-filter="All" aria-pressed="true">전체</button>
      <button class="filter-button" type="button" data-filter="Go" aria-pressed="false">Go 9</button>
      <button class="filter-button" type="button" data-filter="Modify" aria-pressed="false">Modify 1</button>
      <button class="filter-button" type="button" data-filter="Hold" aria-pressed="false">Hold ${holdBenchmarks.length}</button>
      <select class="category-select" aria-label="생활 영역 선택">
        <option value="all">모든 생활 영역</option>
        ${categoryOptions.map((category) => `<option value="${escapeHtml(categoryKey(category))}">${escapeHtml(category)}</option>`).join('')}
      </select>
    </div>
  </nav>

  <main>
    <section class="section shell" id="decisions">
      <div class="section-title"><div><h2>먼저 볼 결과</h2><p>대표 9개, 수요 보강이 필요한 비교군 1개, 별도 보류 ${holdBenchmarks.length}개</p></div></div>
      <div class="decision-grid" id="decision-grid">${selectedCards}${comparisonCards}${holdCards}</div>
      <p class="no-results" id="no-results">선택한 조건에 맞는 후보가 없습니다.</p>
    </section>

    <section class="section shell" id="full-content">
      <div class="section-title"><div><h2>대표 Flow 콘텐츠 전체</h2><p>샘플이 아니라 앱 투입을 판단할 수 있는 전체 22 Flow · 63 Step · 184 Item</p></div></div>
      ${detailSections}
      <div class="section-title"><div><h2>Modify 비교군</h2><p>구조는 우수하지만 수요·소통 hard gate를 보강해야 하는 사례</p></div></div>
      ${comparisonSections}
    </section>

    <section class="section shell" id="gold-benchmarks">
      <div class="section-title"><div><h2>사용자가 골랐던 9개에서 배운 기준</h2><p>좋았던 이유와 그대로 검색 모델로 쓰면 안 되는 경계를 함께 표시</p></div></div>
      <div class="gold-list">${renderGoldBenchmarks()}</div>
    </section>

    <section class="section shell appendix">
      <details>
        <summary>부록 · 심층 검토 후보 ${sourceCandidates.length}개와 점수 코멘트</summary>
        <div class="candidate-list">${renderCandidateAppendix()}</div>
      </details>
    </section>
  </main>

  <footer class="footer"><div class="shell">공개 원문 확인일 ${observedAt}. 보이지 않는 조회·판매·댓글 수는 추정하지 않았고, 원문 이미지와 전문은 Flow 데이터에 복제하지 않았습니다.</div></footer>

  <script>
    const filterButtons = [...document.querySelectorAll('[data-filter]')];
    const categorySelect = document.querySelector('.category-select');
    const noResults = document.getElementById('no-results');
    let activeDecision = 'All';

    function applyFilters() {
      const activeCategory = categorySelect.value;
      const cards = [...document.querySelectorAll('.decision-card')];
      let visibleCards = 0;
      for (const card of cards) {
        const decisionMatch = activeDecision === 'All' || card.dataset.decision === activeDecision;
        const categoryMatch = activeCategory === 'all' || card.dataset.category === activeCategory || card.dataset.category === 'all';
        card.classList.toggle('hidden', !(decisionMatch && categoryMatch));
        if (decisionMatch && categoryMatch) visibleCards += 1;
      }
      noResults.classList.toggle('visible', visibleCards === 0);
      for (const detail of document.querySelectorAll('.bundle-detail')) {
        const decisionMatch = activeDecision === 'All' || detail.dataset.decision === activeDecision;
        const categoryMatch = activeCategory === 'all' || detail.dataset.category === activeCategory;
        detail.classList.toggle('hidden', !(decisionMatch && categoryMatch));
      }
    }

    for (const button of filterButtons) {
      button.addEventListener('click', () => {
        activeDecision = button.dataset.filter;
        for (const peer of filterButtons) peer.setAttribute('aria-pressed', String(peer === button));
        applyFilters();
      });
    }
    categorySelect.addEventListener('change', applyFilters);

    for (const button of document.querySelectorAll('.expand-bundle')) {
      button.addEventListener('click', () => {
        const root = document.getElementById(button.dataset.target);
        const details = [...root.querySelectorAll('.flow-block')];
        const shouldOpen = details.some((entry) => !entry.open);
        for (const entry of details) entry.open = shouldOpen;
        button.textContent = shouldOpen ? '모두 접기' : '모두 펼치기';
      });
    }
  </script>
</body>
</html>`;

fs.writeFileSync(goldOutputPath, `${JSON.stringify(goldOutput, null, 2)}\n`, 'utf8');
fs.writeFileSync(dataOutputPath, `${JSON.stringify(dataOutput, null, 2)}\n`, 'utf8');
fs.writeFileSync(htmlOutputPath, html, 'utf8');

console.log(JSON.stringify({
  goldOutputPath,
  dataOutputPath,
  htmlOutputPath,
  validation,
}, null, 2));
