import fs from 'node:fs';
import path from 'node:path';
import {
  categories,
  deepDiveServices,
  discoveredCandidates,
  executionPatterns,
  opportunities,
  reportMeta,
  scoreDimensions,
  verifiedServices,
} from './vertical-execution-service-data.mjs';

const root = process.cwd();
const docsDir = path.join(root, 'docs', 'content-audit');
const assetDir = path.join(docsDir, '2026-07-28-vertical-execution-service-assets');
const captureLogFile = path.join(assetDir, 'capture-log.json');
const jsonFile = path.join(docsDir, '2026-07-28-vertical-execution-service-benchmark-v1.json');
const htmlFile = path.join(docsDir, '2026-07-28-vertical-execution-service-review-ko.html');
const handoffFile = path.join(docsDir, '2026-07-28-vertical-execution-content-opportunity-handoff-ko.md');

fs.mkdirSync(assetDir, { recursive: true });

if (!fs.existsSync(captureLogFile)) {
  throw new Error(`Missing capture log: ${captureLogFile}`);
}

const captureLog = JSON.parse(fs.readFileSync(captureLogFile, 'utf8'));
const captureById = new Map(captureLog.results.map((item) => [item.screenshotId, item]));
const categoryById = new Map(categories.map((item) => [item.id, item]));
const patternById = new Map(executionPatterns.map((item) => [item.id, item]));

const decisionLabels = {
  go: 'Go',
  partner: 'Partner',
  benchmark: 'Benchmark',
  hold: 'Hold',
};

const relationshipLabels = {
  open_content_source_candidate: '공개 콘텐츠 원천 후보',
  creator_partner_candidate: '제작자·서비스 파트너 후보',
  permission_required: '권리 확인 필요',
  ux_logic_benchmark_only: 'UX·로직 벤치마크 전용',
  external_execution_destination: '외부 실행 목적지',
  direct_competitor_boundary: '전문·직접 경쟁 경계',
  hold: '보류',
  reject: '제외',
};

const scoreLabels = {
  followabilityScore: '따라 하기 쉬움',
  minimumInputQuality: '최소 입력',
  generatedPlanClarity: '생성 결과 명확성',
  nextActionClarity: '다음 행동',
  editRescheduleFlexibility: '수정·재일정',
  contentPortfolioDepth: '콘텐츠 깊이',
  creatorBusinessLoop: '제작자 비즈니스',
  portabilityGap: '외부 이식 기회',
  flowmeValueDelta: 'FlowMe 추가 가치',
  evidenceConfidence: '근거 신뢰도',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function scoreAverage(service) {
  const values = scoreDimensions.map((dimension) => service.scores[dimension].score);
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function categoryLabel(id) {
  return categoryById.get(id)?.label ?? id;
}

function patternLabel(id) {
  return patternById.get(id)?.label ?? id;
}

function list(items, className = '') {
  return `<ul${className ? ` class="${className}"` : ''}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function evidenceLevelLabel(level) {
  return {
    public_web_verified: '공개 웹 확인',
    app_store_verified: '앱스토어 확인',
    support_doc_verified: '지원 문서 확인',
    access_limited: '접근 제한',
    unknown: '미확인',
  }[level] ?? level;
}

function renderScreenshot(service, shot) {
  const capture = captureById.get(shot.id);
  const status = capture?.status === 'captured_public_surface' ? '공개 화면 캡처' : '접근 제한';
  return `
    <figure class="evidence-shot">
      <a href="${escapeHtml(shot.url)}" target="_blank" rel="noreferrer">
        <img src="${escapeHtml(shot.file)}" alt="${escapeHtml(`${service.name} ${shot.title}`)}" loading="lazy">
      </a>
      <figcaption>
        <strong>${escapeHtml(shot.title)}</strong>
        <span>${escapeHtml(status)} · ${escapeHtml(evidenceLevelLabel(shot.verificationLevel))}</span>
      </figcaption>
    </figure>`;
}

function renderJourney(service) {
  const steps = [
    ['상황', service.userMoment],
    ['최초 입력', service.initialInputs.filter((item) => item.required).map((item) => item.name).join(' · ') || '0개'],
    ['생성 결과', service.generatedArtifact],
    ['오늘/다음', service.nextAction],
    ['완료·수정', service.editBehavior],
  ];
  return `<ol class="journey">${steps.map(([label, value], index) => `
    <li>
      <span class="journey-index">${index + 1}</span>
      <div><b>${escapeHtml(label)}</b><p>${escapeHtml(value)}</p></div>
    </li>`).join('')}</ol>`;
}

function renderPatternPreview(service) {
  const action = escapeHtml(service.nextAction);
  const artifact = escapeHtml(service.generatedArtifact);
  const loop = service.coreLoop.map((item) => escapeHtml(item));

  if (service.executionPattern === 'environment_to_maintenance') {
    return `
      <div class="preview-block">
        <div class="preview-label">오늘 관리</div>
        <div class="preview-task active"><i></i><b>${action}</b><span>오늘</span></div>
        <div class="preview-task"><i></i><b>다음 반복 일정</b><span>원문 주기</span></div>
      </div>`;
  }

  if (service.executionPattern === 'profile_to_daily_plan') {
    return `
      <div class="preview-block">
        <div class="preview-progress"><span style="width:42%"></span></div>
        <div class="preview-label">프로필에 맞춘 오늘 계획</div>
        <div class="preview-focus"><small>지금 할 활동</small><b>${action}</b></div>
        <div class="preview-foot">완료하면 다음 활동을 보여줌</div>
      </div>`;
  }

  if (service.executionPattern === 'progress_to_next_lesson') {
    return `
      <div class="lesson-path" aria-label="진도 경로 구조">
        <div class="lesson-node done"><i></i><span>완료한 회차</span></div>
        <div class="lesson-node current"><i></i><span>${action}</span></div>
        <div class="lesson-node next"><i></i><span>다음 회차</span></div>
      </div>`;
  }

  if (service.executionPattern === 'goal_to_plan') {
    return `
      <div class="goal-preview">
        <div class="goal-result"><small>생성된 계획</small><b>${artifact}</b></div>
        <div class="goal-line"><i></i><i class="current"></i><i></i></div>
        <div class="goal-labels"><span>시작</span><span>오늘</span><span>목표</span></div>
        <div class="preview-focus compact"><small>다음 행동</small><b>${action}</b></div>
      </div>`;
  }

  if (service.executionPattern === 'collection_to_itinerary') {
    return `
      <div class="itinerary-preview">
        <div><time>날짜별</time><b>${loop[1] || '일정 생성'}</b><span>저장한 자료 배치</span></div>
        <div class="current"><time>오늘</time><b>${action}</b><span>링크·장소 함께 표시</span></div>
        <div><time>다음</time><b>${loop[3] || '다음 일정'}</b><span>순서 변경 가능</span></div>
      </div>`;
  }

  if (service.executionPattern === 'anchor_date_to_timeline') {
    return `
      <div class="dday-preview">
        <div class="dday-anchor"><small>입력한 기준일</small><b>D-day</b></div>
        <div class="dday-row"><span>먼저</span><b>원문의 앞 구간</b><i>예정</i></div>
        <div class="dday-row active"><span>오늘</span><b>${action}</b><i>할 일</i></div>
        <div class="dday-row"><span>다음</span><b>원문의 다음 구간</b><i>예정</i></div>
      </div>`;
  }

  if (service.executionPattern === 'content_to_guided_session') {
    return `
      <div class="session-preview">
        ${loop.slice(0, 4).map((item, index) => `
          <div class="${index === 3 ? 'active' : index < 3 ? 'done' : ''}">
            <i>${index + 1}</i><span>${item}</span>
          </div>`).join('')}
        <div class="preview-focus compact"><small>지금</small><b>${action}</b></div>
      </div>`;
  }

  if (service.executionPattern === 'state_to_follow_up') {
    return `
      <div class="state-preview">
        <div class="state-tabs">${loop.slice(0, 3).map((item, index) => `<span class="${index === 1 ? 'active' : ''}">${item}</span>`).join('')}</div>
        <div class="preview-focus"><small>현재 상태의 다음 행동</small><b>${action}</b></div>
        <div class="state-date"><span>후속 일정</span><b>필요할 때만 지정</b></div>
      </div>`;
  }

  return `
    <div class="preview-block">
      <div class="goal-result"><small>생성 결과</small><b>${artifact}</b></div>
      <div class="preview-focus"><small>다음 행동</small><b>${action}</b></div>
    </div>`;
}

function renderSetupFields(service) {
  const requiredInputs = service.initialInputs.filter((item) => item.required);
  const optionalInputs = service.initialInputs.filter((item) => !item.required);
  return `
    <div class="mock-fields">
      ${requiredInputs.map((item) => `
        <div class="mock-field">
          <label>${escapeHtml(item.name)} <span>필수</span></label>
          <div>${escapeHtml(item.reason)} 선택</div>
        </div>`).join('')}
      ${optionalInputs.length > 0 ? `
        <button class="mock-later" type="button">선택 정보 ${optionalInputs.length}개는 나중에 정하기</button>` : ''}
    </div>`;
}

function renderUiStoryboard(service) {
  const opportunity = opportunities.find((item) => item.id === service.opportunityId);
  const requiredCount = service.initialInputs.filter((item) => item.required).length;
  return `
    <div class="storyboard-heading">
      <div>
        <h3>FlowMe로 보이면 이렇게</h3>
        <p>벤치마크 구조를 FlowMe 사용 흐름에 대입한 개념 UI입니다. 실제 앱 화면이나 원문 콘텐츠 복제가 아닙니다.</p>
      </div>
      <span>${escapeHtml(patternLabel(service.executionPattern))}</span>
    </div>
    <div class="ui-storyboard" aria-label="${escapeHtml(`${service.name}형 FlowMe 개념 UI`)}">
      <section class="ui-screen">
        <div class="ui-step-label"><span>1</span> 발견</div>
        <div class="ui-shell">
          <header class="ui-topbar"><b>Flows</b><span>구조 예시</span></header>
          <div class="ui-body">
            <div class="ui-source">${escapeHtml(categoryLabel(service.category))} · 원문 링크 유지</div>
            <h4>${escapeHtml(service.name)}형<br>${escapeHtml(patternLabel(service.executionPattern))}</h4>
            <p>${escapeHtml(service.userMoment)}</p>
            <div class="ui-outcome">
              <small>저장하면 생기는 것</small>
              <b>${escapeHtml(service.generatedArtifact)}</b>
            </div>
          </div>
          <footer class="ui-bottom"><button type="button">저장 결과 먼저 보기</button></footer>
        </div>
      </section>

      <section class="ui-screen">
        <div class="ui-step-label"><span>2</span> 최소 입력</div>
        <div class="ui-shell">
          <header class="ui-topbar"><b>시작 설정</b><span>필수 ${requiredCount}개</span></header>
          <div class="ui-body">
            <p class="ui-helper">계획 생성에 필요한 값만 먼저 정합니다.</p>
            ${renderSetupFields(service)}
            <div class="ui-info-row"><i></i><span>원문에서 알 수 있는 값은 다시 묻지 않음</span></div>
          </div>
          <footer class="ui-bottom"><button type="button">전체 결과 미리보기</button></footer>
        </div>
      </section>

      <section class="ui-screen">
        <div class="ui-step-label"><span>3</span> 생성 결과</div>
        <div class="ui-shell">
          <header class="ui-topbar"><b>미리보기</b><span>저장 전</span></header>
          <div class="ui-body preview-body">
            <div class="ui-artifact-title">
              <small>생성될 결과</small>
              <h4>${escapeHtml(service.generatedArtifact)}</h4>
            </div>
            ${renderPatternPreview(service)}
            <div class="ui-destination"><span>내보내기</span><b>${escapeHtml(opportunity?.naturalArtifact ?? '캘린더 · 체크리스트 · 메모')}</b></div>
          </div>
          <footer class="ui-bottom split"><button class="secondary" type="button">입력 수정</button><button type="button">이대로 저장</button></footer>
        </div>
      </section>

      <section class="ui-screen">
        <div class="ui-step-label"><span>4</span> 오늘 실행</div>
        <div class="ui-shell">
          <header class="ui-topbar"><b>오늘</b><span>다음 행동</span></header>
          <div class="ui-body today-body">
            <div class="today-focus">
              <span class="today-status">지금 할 일</span>
              <h4>${escapeHtml(service.nextAction)}</h4>
              <p>${escapeHtml(service.generatedArtifact)}에서 꺼낸 현재 행동</p>
            </div>
            <button class="source-link-button" type="button"><i></i>원문·제작자 링크 열기</button>
            <div class="today-meta">
              <span>세부 내용은 메모</span>
              <span>일정은 나중에 수정</span>
            </div>
          </div>
          <footer class="ui-bottom split"><button class="secondary" type="button">일정 바꾸기</button><button type="button">완료 표시</button></footer>
        </div>
      </section>
    </div>
    <details class="journey-details">
      <summary>텍스트 구조도 함께 보기</summary>
      ${renderJourney(service)}
    </details>`;
}

function renderPatternAtlas() {
  return executionPatterns.map((pattern, index) => {
    const services = deepDiveServices.filter((service) => service.executionPattern === pattern.id);
    if (services.length === 0) return '';
    const exemplar = services[0];
    const requiredInputs = [...new Set(services.flatMap((service) => service.initialInputs.filter((item) => item.required).map((item) => item.name)))];
    return `
      <article class="pattern-card" style="--pattern-index:${index}">
        <header>
          <span>${index + 1}</span>
          <div><small>실행 원형</small><h3>${escapeHtml(pattern.label)}</h3></div>
        </header>
        <div class="pattern-flow">
          <div><small>입력</small><b>${escapeHtml(requiredInputs.slice(0, 2).join(' · ') || '0개')}</b></div>
          <i></i>
          <div><small>생성</small><b>${escapeHtml(exemplar.generatedArtifact)}</b></div>
          <i></i>
          <div><small>오늘</small><b>${escapeHtml(exemplar.nextAction)}</b></div>
        </div>
        <footer>${services.map((service) => `<a href="#service-${escapeHtml(service.id)}">${escapeHtml(service.name)}</a>`).join('')}</footer>
      </article>`;
  }).join('');
}

function renderScoreDetails(service) {
  return `<details class="score-details">
    <summary>10개 점수와 감점 근거 보기 <span>${scoreAverage(service)}/10</span></summary>
    <div class="score-list">
      ${scoreDimensions.map((dimension) => {
        const record = service.scores[dimension];
        return `<div class="score-row">
          <div class="score-head">
            <b>${escapeHtml(scoreLabels[dimension])}</b>
            <span>${record.score}/10</span>
          </div>
          <div class="meter" aria-hidden="true"><i style="width:${record.score * 10}%"></i></div>
          <p>${escapeHtml(record.comment)}</p>
        </div>`;
      }).join('')}
    </div>
  </details>`;
}

function renderServiceCard(service) {
  const opportunity = opportunities.find((item) => item.id === service.opportunityId);
  return `
    <article
      class="service-card"
      id="service-${escapeHtml(service.id)}"
      data-decision="${escapeHtml(service.finalDecision)}"
      data-category="${escapeHtml(service.category)}"
    >
      <header class="service-header">
        <div>
          <div class="eyebrow">${escapeHtml(categoryLabel(service.category))} · ${escapeHtml(patternLabel(service.executionPattern))}</div>
          <h2>${escapeHtml(service.name)}</h2>
          <p>${escapeHtml(service.userMoment)}</p>
        </div>
        <div class="verdict-stack">
          <span class="decision ${escapeHtml(service.finalDecision)}">${escapeHtml(decisionLabels[service.finalDecision])}</span>
          <span class="relationship">${escapeHtml(relationshipLabels[service.serviceRelationship])}</span>
        </div>
      </header>

      <div class="evidence-grid">
        ${service.screenshots.map((shot) => renderScreenshot(service, shot)).join('')}
      </div>

      <section class="service-section ui-demo-section">
        ${renderUiStoryboard(service)}
      </section>

      <details class="analysis-details">
        <summary>입력·결과·차용 경계 분석 보기</summary>
        <div class="analysis-body">
      <section class="service-section compare-section">
        <div>
          <h3>입력은 이만큼</h3>
          <ul class="input-list">
            ${service.initialInputs.map((item) => `
              <li>
                <span class="${item.required ? 'required' : 'optional'}">${item.required ? '필수' : '선택'}</span>
                <b>${escapeHtml(item.name)}</b>
                <small>${escapeHtml(item.reason)}</small>
              </li>`).join('')}
          </ul>
        </div>
        <div>
          <h3>결과는 이렇게</h3>
          <p class="artifact">${escapeHtml(service.generatedArtifact)}</p>
          <p><b>오늘:</b> ${escapeHtml(service.nextAction)}</p>
          <p><b>수정:</b> ${escapeHtml(service.editBehavior)}</p>
        </div>
      </section>

      <section class="service-section boundary-section">
        <div>
          <h3>FlowMe가 차용할 구조</h3>
          ${list(service.transferablePatterns)}
        </div>
        <div>
          <h3>만들지 말아야 할 영역</h3>
          ${list(service.doNotBuild)}
        </div>
      </section>

      <section class="service-section signal-section">
        <div>
          <h3>사용자 커뮤니케이션 증거</h3>
          <span class="signal-status">${escapeHtml(service.userCommunicationEvidence.status)}</span>
          <p>${escapeHtml(service.userCommunicationEvidence.observed)}</p>
          <small>${escapeHtml(service.userCommunicationEvidence.creatorResponse)}</small>
        </div>
        <div>
          <h3>확인된 비즈니스 연결</h3>
          <p>${escapeHtml(service.businessEvidenceRecord.observed)}</p>
          <small>${escapeHtml(service.businessEvidenceRecord.unknown)}</small>
        </div>
      </section>
        </div>
      </details>

      <section class="service-section opportunity-strip">
        <div>
          <span class="opportunity-label">콘텐츠 발굴 기회</span>
          <h3>${escapeHtml(opportunity?.title ?? '보조 벤치마크')}</h3>
          <p>${escapeHtml(service.flowmeDelta)}</p>
        </div>
        <span class="opportunity-decision">${escapeHtml(opportunity?.decision ? decisionLabels[opportunity.decision] : 'Benchmark')}</span>
      </section>

      ${renderScoreDetails(service)}

      <details class="source-details">
        <summary>근거·검증 경계 보기</summary>
        <p class="boundary-note">${escapeHtml(service.verificationBoundary)}</p>
        <ul class="source-list">
          ${service.evidenceSources.map((item) => `
            <li>
              <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>
              <span>${escapeHtml(item.claim)}</span>
            </li>`).join('')}
          <li>
            <a href="${escapeHtml(service.userCommunicationEvidence.sourceUrl)}" target="_blank" rel="noreferrer">사용자 커뮤니케이션 확인 근거</a>
            <span>${escapeHtml(service.userCommunicationEvidence.observed)}</span>
          </li>
        </ul>
      </details>
    </article>`;
}

function renderOpportunity(opportunity) {
  return `
    <article class="opportunity-card">
      <header>
        <span>${opportunity.rank}</span>
        <div>
          <small>${escapeHtml(categoryLabel(opportunity.category))}</small>
          <h3>${escapeHtml(opportunity.title)}</h3>
        </div>
        <b class="decision ${escapeHtml(opportunity.decision)}">${escapeHtml(decisionLabels[opportunity.decision])}</b>
      </header>
      <dl>
        <div><dt>찾을 원문</dt><dd>${escapeHtml(opportunity.sourceShape)}</dd></div>
        <div><dt>필수 source row</dt><dd>${escapeHtml(opportunity.requiredSourceRows.join(' · '))}</dd></div>
        <div><dt>최소 입력</dt><dd>${escapeHtml(opportunity.expectedInputs.join(' · '))}</dd></div>
        <div><dt>생성 결과</dt><dd>${escapeHtml(opportunity.naturalArtifact)}</dd></div>
      </dl>
      <details>
        <summary>검색어·권리 경계 보기</summary>
        <p><b>검색어:</b> ${escapeHtml(opportunity.searchQueries.join(' / '))}</p>
        <p><b>제작자:</b> ${escapeHtml(opportunity.creatorTypes.join(' / '))}</p>
        <p><b>경계:</b> ${escapeHtml(opportunity.publicUseBoundary)}</p>
      </details>
    </article>`;
}

function renderCompactService(service) {
  const required = service.initialInputs.filter((item) => item.required).length;
  const serviceName = service.deepDive
    ? `<a href="#service-${escapeHtml(service.id)}">${escapeHtml(service.name)}</a><span class="deep-mark">심층</span>`
    : `<span>${escapeHtml(service.name)}</span>`;
  return `
    <tr>
      <td>${serviceName}</td>
      <td>${escapeHtml(categoryLabel(service.category))}</td>
      <td>${escapeHtml(patternLabel(service.executionPattern))}</td>
      <td>${required}개</td>
      <td>${escapeHtml(service.generatedArtifact)}</td>
      <td><span class="decision ${escapeHtml(service.finalDecision)}">${escapeHtml(decisionLabels[service.finalDecision])}</span></td>
    </tr>`;
}

const summary = {
  discoveredCount: discoveredCandidates.length,
  verifiedCount: verifiedServices.length,
  deepDiveCount: deepDiveServices.length,
  categoryCount: new Set(verifiedServices.map((service) => service.category)).size,
  opportunityCount: opportunities.length,
  evidenceUrlCount: new Set(verifiedServices.flatMap((service) => [
    ...service.evidenceSources.map((item) => item.url),
    service.userCommunicationEvidence.sourceUrl,
  ])).size,
  screenshotCount: captureLog.results.filter((item) => item.screenshotBytes > 0).length,
  accessLimitedCount: captureLog.results.filter((item) => item.status === 'access_limited').length,
  inAppVerifiedCount: verifiedServices.filter((service) => service.evidenceLevels.includes('in_app_verified')).length,
  decisions: Object.fromEntries(['go', 'partner', 'benchmark', 'hold'].map((decision) => [
    decision,
    verifiedServices.filter((service) => service.finalDecision === decision).length,
  ])),
};

const benchmarkData = {
  meta: reportMeta,
  summary,
  evidenceBoundary: {
    allowedLevels: ['public_web_verified', 'app_store_verified', 'support_doc_verified', 'access_limited', 'unknown'],
    excludedClaim: 'in_app_verified',
    automationNote: '자동 캡처는 공개 화면 렌더링 증거이며 실제 사용자 검증이 아니다.',
  },
  categories,
  executionPatterns,
  discoveredCandidates,
  verifiedServices,
  deepDiveServiceIds: deepDiveServices.map((service) => service.id),
  contentDiscoveryOpportunities: opportunities,
  captureEvidence: {
    file: '2026-07-28-vertical-execution-service-assets/capture-log.json',
    counts: captureLog.counts,
    results: captureLog.results,
  },
  finalCompression: deepDiveServices.map((service) => ({
    serviceId: service.id,
    serviceName: service.name,
    ...service.compression,
  })),
};

fs.writeFileSync(jsonFile, `${JSON.stringify(benchmarkData, null, 2)}\n`, 'utf8');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(reportMeta.title)}</title>
  <style>
    :root {
      --bg: #f3f5f4;
      --paper: #ffffff;
      --ink: #17201c;
      --muted: #65706a;
      --line: #d8dedb;
      --green: #1c6b50;
      --green-soft: #e7f2ed;
      --blue: #355f9a;
      --blue-soft: #eaf0f9;
      --amber: #8a6510;
      --amber-soft: #f7f0d9;
      --coral: #a94f39;
      --coral-soft: #faece7;
      --shadow: 0 8px 24px rgba(23, 32, 28, .07);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif;
      line-height: 1.55;
      letter-spacing: 0;
      overflow-wrap: anywhere;
    }
    a { color: var(--blue); }
    button, select { font: inherit; letter-spacing: 0; }
    .report-header {
      background: var(--paper);
      border-bottom: 1px solid var(--line);
      padding: 32px 20px 24px;
    }
    .header-inner, main, .appendix-inner {
      width: min(1160px, 100%);
      margin: 0 auto;
    }
    .eyebrow { color: var(--green); font-size: 13px; font-weight: 800; margin-bottom: 6px; }
    h1 { margin: 0; font-size: 32px; line-height: 1.2; }
    .lede { max-width: 760px; margin: 10px 0 0; color: var(--muted); }
    .headline-answer {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(280px, .8fr);
      gap: 18px;
      margin-top: 22px;
      align-items: stretch;
    }
    .answer-copy {
      border-left: 4px solid var(--green);
      padding: 14px 16px;
      background: var(--green-soft);
    }
    .answer-copy b { display: block; margin-bottom: 4px; }
    .answer-copy p { margin: 0; }
    .scope-note {
      padding: 14px 16px;
      border: 1px solid var(--line);
      background: #fafbfa;
      font-size: 13px;
      color: var(--muted);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
      margin-top: 18px;
    }
    .stat {
      border-top: 3px solid var(--line);
      padding: 10px 12px;
      background: #fafbfa;
    }
    .stat:nth-child(1) { border-color: var(--blue); }
    .stat:nth-child(2) { border-color: var(--green); }
    .stat:nth-child(3) { border-color: var(--amber); }
    .stat:nth-child(4) { border-color: var(--coral); }
    .stat:nth-child(5) { border-color: #6d5c95; }
    .stat b { display: block; font-size: 25px; line-height: 1.1; }
    .stat span { color: var(--muted); font-size: 12px; }
    .filter-bar {
      position: sticky;
      top: 0;
      z-index: 30;
      border-bottom: 1px solid var(--line);
      background: rgba(255, 255, 255, .96);
      backdrop-filter: blur(10px);
    }
    .filter-inner {
      width: min(1160px, 100%);
      margin: 0 auto;
      padding: 10px 20px;
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .filter-button {
      width: 38px;
      height: 38px;
      border: 1px solid var(--line);
      background: white;
      color: var(--ink);
      border-radius: 6px;
      cursor: pointer;
      font-weight: 800;
    }
    .filter-button[data-filter="all"] { width: auto; padding: 0 12px; }
    .filter-button.active { color: white; background: var(--ink); border-color: var(--ink); }
    .filter-button .full-label { display: none; }
    .filter-select {
      min-width: 170px;
      height: 38px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: white;
      padding: 0 34px 0 10px;
    }
    .visible-count { margin-left: auto; color: var(--muted); font-size: 13px; }
    main { padding: 26px 20px 54px; }
    .section-heading { margin: 0 0 16px; }
    .section-heading h2 { margin: 0; font-size: 24px; }
    .section-heading p { margin: 5px 0 0; color: var(--muted); }
    .pattern-overview {
      margin-bottom: 36px;
      padding-bottom: 36px;
      border-bottom: 2px solid var(--ink);
    }
    .pattern-atlas {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .pattern-card {
      --accent: var(--green);
      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--line);
      border-top: 4px solid var(--accent);
      border-radius: 8px;
      background: var(--paper);
    }
    .pattern-card:nth-child(2) { --accent: var(--blue); }
    .pattern-card:nth-child(3) { --accent: var(--amber); }
    .pattern-card:nth-child(4) { --accent: var(--coral); }
    .pattern-card:nth-child(5) { --accent: #6d5c95; }
    .pattern-card:nth-child(6) { --accent: #4b747b; }
    .pattern-card:nth-child(7) { --accent: #936237; }
    .pattern-card:nth-child(8) { --accent: #3f6658; }
    .pattern-card > header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px 10px;
    }
    .pattern-card > header > span {
      flex: 0 0 30px;
      height: 30px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      color: white;
      background: var(--accent);
      font-size: 12px;
      font-weight: 900;
    }
    .pattern-card > header small { color: var(--muted); font-size: 11px; }
    .pattern-card > header h3 { margin: 0; font-size: 17px; }
    .pattern-flow {
      display: grid;
      grid-template-columns: minmax(0, .8fr) 18px minmax(0, 1.2fr) 18px minmax(0, 1fr);
      align-items: stretch;
      gap: 4px;
      padding: 0 16px 14px;
    }
    .pattern-flow > div {
      min-width: 0;
      padding: 9px 10px;
      border: 1px solid var(--line);
      background: #fafbfa;
    }
    .pattern-flow small { display: block; color: var(--accent); font-size: 10px; font-weight: 900; }
    .pattern-flow b { display: block; margin-top: 3px; font-size: 12px; line-height: 1.4; }
    .pattern-flow > i {
      position: relative;
      align-self: center;
      height: 1px;
      background: #aeb8b3;
    }
    .pattern-flow > i::after {
      content: "";
      position: absolute;
      top: -3px;
      right: 0;
      width: 6px;
      height: 6px;
      border-top: 1px solid #87928c;
      border-right: 1px solid #87928c;
      transform: rotate(45deg);
    }
    .pattern-card > footer {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      padding: 10px 16px;
      border-top: 1px solid var(--line);
      background: #f7f9f8;
    }
    .pattern-card > footer a {
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--ink);
      background: white;
      font-size: 11px;
      font-weight: 800;
      text-decoration: none;
    }
    .service-list { display: grid; gap: 20px; }
    .service-card {
      min-width: 0;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      overflow: hidden;
      scroll-margin-top: 74px;
    }
    .service-card.hidden { display: none; }
    .service-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding: 20px;
      border-bottom: 1px solid var(--line);
    }
    .service-header h2 { margin: 0; font-size: 24px; }
    .service-header p { margin: 6px 0 0; color: var(--muted); }
    .verdict-stack { display: grid; justify-items: end; gap: 6px; flex: 0 0 auto; }
    .decision, .relationship, .deep-mark {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      border-radius: 5px;
      padding: 3px 8px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .decision.go { color: var(--green); background: var(--green-soft); }
    .decision.partner { color: var(--blue); background: var(--blue-soft); }
    .decision.benchmark { color: var(--amber); background: var(--amber-soft); }
    .decision.hold { color: var(--coral); background: var(--coral-soft); }
    .relationship { color: var(--muted); background: #f0f2f1; }
    .evidence-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1px;
      background: var(--line);
    }
    .evidence-shot { margin: 0; min-width: 0; background: var(--paper); }
    .evidence-shot a { display: block; aspect-ratio: 16 / 9; overflow: hidden; background: #e8ecea; }
    .evidence-shot img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top center; }
    .evidence-shot figcaption { display: flex; justify-content: space-between; gap: 10px; padding: 9px 12px; font-size: 12px; }
    .evidence-shot figcaption span { color: var(--muted); text-align: right; }
    .service-section { padding: 18px 20px; border-top: 1px solid var(--line); }
    .service-section > h3, .service-section > div > h3 { margin: 0 0 10px; font-size: 16px; }
    .ui-demo-section { background: #f6f8f7; }
    .storyboard-heading {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .storyboard-heading h3 { margin: 0; font-size: 18px; }
    .storyboard-heading p { max-width: 720px; margin: 4px 0 0; color: var(--muted); font-size: 12px; }
    .storyboard-heading > span {
      flex: 0 0 auto;
      padding: 4px 8px;
      border: 1px solid #bfd4cb;
      border-radius: 5px;
      color: var(--green);
      background: var(--green-soft);
      font-size: 11px;
      font-weight: 900;
    }
    .ui-storyboard {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }
    .ui-screen {
      position: relative;
      min-width: 0;
    }
    .ui-screen:not(:last-child)::after {
      content: "";
      position: absolute;
      z-index: 2;
      top: calc(50% + 12px);
      right: -10px;
      width: 7px;
      height: 7px;
      border-top: 2px solid #7d8983;
      border-right: 2px solid #7d8983;
      transform: rotate(45deg);
      background: var(--bg);
    }
    .ui-step-label {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 30px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 900;
    }
    .ui-step-label span {
      display: grid;
      place-items: center;
      width: 21px;
      height: 21px;
      border-radius: 50%;
      color: white;
      background: var(--ink);
      font-size: 10px;
    }
    .ui-shell {
      min-height: 410px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #cdd6d1;
      border-radius: 8px;
      background: var(--paper);
      box-shadow: 0 5px 14px rgba(23, 32, 28, .06);
    }
    .ui-topbar {
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 0 13px;
      border-bottom: 1px solid var(--line);
      background: #fbfcfb;
    }
    .ui-topbar b { font-size: 13px; }
    .ui-topbar span { color: var(--muted); font-size: 10px; }
    .ui-body {
      min-width: 0;
      flex: 1;
      padding: 14px;
    }
    .ui-body > h4 {
      margin: 10px 0 7px;
      font-size: 17px;
      line-height: 1.32;
    }
    .ui-body > p { margin: 0; color: var(--muted); font-size: 11px; }
    .ui-source {
      display: inline-flex;
      padding: 3px 6px;
      border-radius: 4px;
      color: var(--blue);
      background: var(--blue-soft);
      font-size: 9px;
      font-weight: 800;
    }
    .ui-outcome {
      margin-top: 16px;
      padding: 11px;
      border-left: 3px solid var(--green);
      background: var(--green-soft);
    }
    .ui-outcome small, .ui-artifact-title small, .goal-result small, .preview-focus small {
      display: block;
      color: var(--muted);
      font-size: 9px;
      font-weight: 800;
    }
    .ui-outcome b { display: block; margin-top: 3px; font-size: 12px; }
    .ui-bottom {
      min-height: 54px;
      display: flex;
      align-items: center;
      padding: 9px 11px;
      border-top: 1px solid var(--line);
      background: #fbfcfb;
    }
    .ui-bottom button {
      width: 100%;
      min-height: 36px;
      border: 1px solid var(--ink);
      border-radius: 6px;
      color: white;
      background: var(--ink);
      font-size: 11px;
      font-weight: 900;
      cursor: default;
    }
    .ui-bottom.split { gap: 7px; }
    .ui-bottom.split button { min-width: 0; }
    .ui-bottom button.secondary {
      color: var(--ink);
      background: white;
      border-color: var(--line);
    }
    .ui-helper { margin-bottom: 12px !important; }
    .mock-fields { display: grid; gap: 8px; }
    .mock-field label {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      color: var(--ink);
      font-size: 10px;
      font-weight: 800;
    }
    .mock-field label span { color: var(--coral); font-size: 9px; }
    .mock-field > div {
      margin-top: 4px;
      padding: 9px 10px;
      border: 1px solid var(--line);
      border-radius: 5px;
      color: var(--muted);
      background: white;
      font-size: 10px;
    }
    .mock-later {
      min-height: 30px;
      padding: 5px 8px;
      border: 1px dashed #a8b4ae;
      border-radius: 5px;
      color: var(--blue);
      background: #f7f9fb;
      font-size: 9px;
      font-weight: 800;
      text-align: left;
      cursor: default;
    }
    .ui-info-row {
      display: flex;
      gap: 6px;
      margin-top: 12px;
      color: var(--muted);
      font-size: 9px;
    }
    .ui-info-row i {
      flex: 0 0 12px;
      height: 12px;
      border: 2px solid var(--green);
      border-radius: 50%;
    }
    .ui-artifact-title h4 { margin: 2px 0 11px; font-size: 14px; line-height: 1.35; }
    .preview-body { padding: 12px; }
    .preview-block, .goal-preview, .itinerary-preview, .dday-preview, .session-preview, .state-preview, .lesson-path {
      min-width: 0;
      padding: 10px;
      border: 1px solid var(--line);
      background: #fafbfa;
    }
    .preview-label { margin-bottom: 7px; color: var(--green); font-size: 9px; font-weight: 900; }
    .preview-task {
      display: grid;
      grid-template-columns: 14px minmax(0, 1fr) auto;
      gap: 6px;
      align-items: start;
      padding: 7px 0;
      border-top: 1px dashed var(--line);
    }
    .preview-task i {
      width: 12px;
      height: 12px;
      margin-top: 2px;
      border: 1px solid #9aa69f;
      border-radius: 3px;
      background: white;
    }
    .preview-task.active i { border-color: var(--green); background: var(--green-soft); }
    .preview-task b { font-size: 9px; }
    .preview-task span { color: var(--muted); font-size: 8px; }
    .preview-progress {
      height: 5px;
      margin-bottom: 10px;
      overflow: hidden;
      background: #e1e6e3;
    }
    .preview-progress span { display: block; height: 100%; background: var(--green); }
    .preview-focus {
      margin-top: 8px;
      padding: 11px;
      border: 1px solid #b8cec4;
      background: white;
    }
    .preview-focus.compact { padding: 8px; }
    .preview-focus b { display: block; margin-top: 4px; font-size: 10px; line-height: 1.4; }
    .preview-foot { margin-top: 8px; color: var(--muted); font-size: 8px; }
    .lesson-path { display: grid; gap: 5px; }
    .lesson-node {
      display: grid;
      grid-template-columns: 20px minmax(0, 1fr);
      gap: 8px;
      align-items: center;
      min-height: 38px;
      color: var(--muted);
      font-size: 9px;
    }
    .lesson-node i {
      width: 20px;
      height: 20px;
      border: 2px solid #bbc5c0;
      border-radius: 50%;
      background: white;
    }
    .lesson-node.done i { border-color: var(--green); background: var(--green-soft); }
    .lesson-node.current { color: var(--ink); font-weight: 900; }
    .lesson-node.current i { border: 6px solid var(--blue); }
    .lesson-node.next i { border-style: dashed; }
    .goal-result b { display: block; margin-top: 3px; font-size: 10px; }
    .goal-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 20px;
      margin-top: 10px;
      border-top: 2px solid #bbc5c0;
    }
    .goal-line i {
      width: 10px;
      height: 10px;
      margin-top: -12px;
      border: 2px solid #9aa69f;
      border-radius: 50%;
      background: white;
    }
    .goal-line i.current { border-color: var(--green); background: var(--green); }
    .goal-labels { display: flex; justify-content: space-between; color: var(--muted); font-size: 8px; }
    .itinerary-preview { display: grid; gap: 6px; }
    .itinerary-preview > div {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      column-gap: 7px;
      padding: 7px;
      border-left: 2px solid #bcc6c1;
      background: white;
    }
    .itinerary-preview > div.current { border-left-color: var(--green); background: var(--green-soft); }
    .itinerary-preview time { grid-row: 1 / 3; color: var(--muted); font-size: 8px; }
    .itinerary-preview b { font-size: 9px; }
    .itinerary-preview span { color: var(--muted); font-size: 8px; }
    .dday-anchor {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--ink);
    }
    .dday-anchor small { color: var(--muted); font-size: 8px; }
    .dday-anchor b { font-size: 14px; }
    .dday-row {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr) auto;
      gap: 6px;
      padding: 7px 0;
      border-bottom: 1px dashed var(--line);
    }
    .dday-row span, .dday-row i { color: var(--muted); font-size: 8px; font-style: normal; }
    .dday-row b { font-size: 9px; }
    .dday-row.active b { color: var(--green); }
    .session-preview { display: grid; gap: 5px; }
    .session-preview > div:not(.preview-focus) {
      display: grid;
      grid-template-columns: 20px minmax(0, 1fr);
      gap: 7px;
      align-items: center;
      min-height: 28px;
      color: var(--muted);
      font-size: 9px;
    }
    .session-preview > div:not(.preview-focus) i {
      display: grid;
      place-items: center;
      width: 19px;
      height: 19px;
      border-radius: 50%;
      background: #e3e8e5;
      font-size: 8px;
      font-style: normal;
    }
    .session-preview > div.done i { color: white; background: var(--green); }
    .session-preview > div.active { color: var(--ink); font-weight: 900; }
    .state-tabs { display: flex; gap: 4px; overflow: hidden; }
    .state-tabs span {
      min-width: 0;
      padding: 4px 6px;
      border-radius: 4px;
      color: var(--muted);
      background: #e9edeb;
      font-size: 7px;
      white-space: nowrap;
    }
    .state-tabs span.active { color: var(--blue); background: var(--blue-soft); }
    .state-date {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed var(--line);
      font-size: 8px;
    }
    .state-date span { color: var(--muted); }
    .ui-destination {
      display: grid;
      gap: 2px;
      margin-top: 10px;
      padding-top: 9px;
      border-top: 1px dashed var(--line);
    }
    .ui-destination span { color: var(--muted); font-size: 8px; }
    .ui-destination b { font-size: 9px; }
    .today-body { display: flex; flex-direction: column; }
    .today-focus {
      padding: 14px 12px;
      border-top: 3px solid var(--green);
      background: var(--green-soft);
    }
    .today-focus h4 { margin: 8px 0 5px; font-size: 15px; line-height: 1.35; }
    .today-focus p { margin: 0; color: var(--muted); font-size: 9px; }
    .today-status {
      color: var(--green);
      font-size: 9px;
      font-weight: 900;
    }
    .source-link-button {
      display: flex;
      align-items: center;
      gap: 7px;
      min-height: 34px;
      margin-top: 10px;
      padding: 7px 9px;
      border: 1px solid var(--line);
      border-radius: 5px;
      color: var(--blue);
      background: white;
      font-size: 9px;
      font-weight: 800;
      text-align: left;
      cursor: default;
    }
    .source-link-button i {
      width: 12px;
      height: 12px;
      border: 2px solid var(--blue);
      border-radius: 50%;
    }
    .today-meta {
      display: grid;
      gap: 5px;
      margin-top: 12px;
      color: var(--muted);
      font-size: 8px;
    }
    .today-meta span::before { content: "· "; color: var(--green); }
    .journey-details {
      margin-top: 14px;
      border: 1px solid var(--line);
      background: white;
    }
    .journey-details > summary { padding: 10px 12px; color: var(--muted); font-size: 11px; }
    .journey-details .journey { padding: 10px 12px; border-top: 1px solid var(--line); }
    .journey {
      list-style: none;
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0;
      padding: 0;
      margin: 0;
    }
    .journey li {
      min-width: 0;
      position: relative;
      display: flex;
      gap: 8px;
      padding: 8px 12px 8px 0;
    }
    .journey li:not(:last-child)::after {
      content: "";
      position: absolute;
      top: 18px;
      right: 3px;
      width: 7px;
      height: 7px;
      border-top: 2px solid #aab4af;
      border-right: 2px solid #aab4af;
      transform: rotate(45deg);
    }
    .journey-index {
      flex: 0 0 24px;
      height: 24px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      color: white;
      background: var(--ink);
      font-size: 12px;
      font-weight: 800;
    }
    .journey b { font-size: 12px; color: var(--green); }
    .journey p { margin: 3px 0 0; font-size: 13px; }
    .compare-section, .boundary-section, .signal-section {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 26px;
    }
    .compare-section > div + div, .boundary-section > div + div, .signal-section > div + div { border-left: 1px solid var(--line); padding-left: 26px; }
    .input-list { list-style: none; margin: 0; padding: 0; }
    .input-list li { display: grid; grid-template-columns: 42px minmax(0, .7fr) minmax(0, 1fr); align-items: start; gap: 8px; padding: 6px 0; border-bottom: 1px dashed var(--line); }
    .input-list span { font-size: 11px; font-weight: 800; padding: 2px 5px; border-radius: 4px; text-align: center; }
    .input-list .required { color: var(--coral); background: var(--coral-soft); }
    .input-list .optional { color: var(--blue); background: var(--blue-soft); }
    .input-list small { color: var(--muted); }
    .artifact { margin: 0 0 10px; font-size: 17px; font-weight: 800; color: var(--green); }
    .compare-section p { margin: 6px 0; }
    .boundary-section ul { margin: 0; padding-left: 20px; }
    .boundary-section li { margin: 5px 0; }
    .signal-section p { margin: 8px 0 4px; }
    .signal-section small { color: var(--muted); }
    .signal-status {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--blue);
      background: var(--blue-soft);
      font-size: 11px;
      font-weight: 800;
    }
    .opportunity-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      background: #f9faf9;
    }
    .opportunity-strip h3 { margin: 3px 0 4px !important; font-size: 18px !important; }
    .opportunity-strip p { margin: 0; color: var(--muted); }
    .opportunity-label { color: var(--blue); font-size: 12px; font-weight: 800; }
    .opportunity-decision { font-size: 13px; font-weight: 900; color: var(--green); }
    details { border-top: 1px solid var(--line); }
    details summary { cursor: pointer; padding: 14px 20px; font-weight: 800; }
    details summary span { float: right; color: var(--green); }
    .analysis-details > summary { background: #fbfcfb; }
    .analysis-body > .service-section:first-child { border-top: 1px solid var(--line); }
    .score-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid var(--line); }
    .score-row { padding: 13px 20px; border-bottom: 1px solid var(--line); }
    .score-row:nth-child(odd) { border-right: 1px solid var(--line); }
    .score-head { display: flex; justify-content: space-between; gap: 12px; }
    .score-head span { color: var(--green); font-weight: 900; }
    .meter { height: 4px; margin: 7px 0; background: #e6eae8; }
    .meter i { display: block; height: 100%; background: var(--green); }
    .score-row p { margin: 0; color: var(--muted); font-size: 12px; }
    .source-details { border-top: 0; }
    .source-details[open] { border-top: 1px solid var(--line); }
    .boundary-note { margin: 0; padding: 0 20px 12px; color: var(--coral); font-size: 13px; }
    .source-list { margin: 0; padding: 0 36px 20px; }
    .source-list li { margin: 8px 0; }
    .source-list span { display: block; color: var(--muted); font-size: 12px; }
    .opportunity-band { margin-top: 40px; padding-top: 34px; border-top: 2px solid var(--ink); }
    .opportunity-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .opportunity-card { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
    .opportunity-card header { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 10px; align-items: start; padding: 16px; }
    .opportunity-card header > span { display: grid; place-items: center; width: 30px; height: 30px; background: var(--ink); color: white; border-radius: 50%; font-weight: 900; }
    .opportunity-card h3 { margin: 2px 0 0; font-size: 17px; }
    .opportunity-card small { color: var(--muted); }
    .opportunity-card dl { margin: 0; padding: 0 16px 16px; }
    .opportunity-card dl div { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 10px; padding: 6px 0; border-top: 1px dashed var(--line); }
    .opportunity-card dt { font-size: 12px; font-weight: 800; color: var(--green); }
    .opportunity-card dd { margin: 0; font-size: 13px; }
    .opportunity-card details p { margin: 0; padding: 0 16px 10px; font-size: 13px; }
    .appendix {
      background: #e9edeb;
      border-top: 1px solid var(--line);
      padding: 42px 20px;
    }
    .table-wrap { overflow-x: auto; background: white; border: 1px solid var(--line); }
    table { width: 100%; border-collapse: collapse; min-width: 880px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); font-size: 12px; vertical-align: top; }
    th { position: sticky; top: 0; background: #f6f8f7; color: var(--muted); }
    .deep-mark { margin-left: 5px; color: var(--green); background: var(--green-soft); }
    .longlist { columns: 3; margin: 16px 0 0; padding-left: 20px; }
    .longlist li { break-inside: avoid; margin: 5px 0; font-size: 13px; }
    .method-note { margin-top: 26px; padding: 16px; background: white; border-left: 4px solid var(--amber); color: var(--muted); font-size: 13px; }
    footer { padding: 20px; color: var(--muted); text-align: center; font-size: 12px; }
    @media (min-width: 760px) {
      .filter-button { width: auto; padding: 0 12px; }
      .filter-button .short-label { display: none; }
      .filter-button .full-label { display: inline; }
    }
    @media (min-width: 760px) and (max-width: 1050px) {
      .ui-storyboard { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .ui-screen:not(:last-child)::after { display: none; }
    }
    @media (max-width: 759px) {
      .report-header { padding: 22px 14px 18px; }
      h1 { font-size: 25px; }
      .headline-answer { grid-template-columns: 1fr; }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .stat:last-child { grid-column: 1 / -1; }
      .filter-inner { padding: 8px 12px; gap: 6px; }
      .filter-select { order: 2; width: calc(100% - 74px); min-width: 0; }
      .visible-count { order: 2; width: 68px; margin-left: 0; text-align: right; font-size: 11px; }
      main { padding: 18px 10px 36px; }
      .section-heading h2 { font-size: 20px; }
      .pattern-overview { margin-bottom: 28px; padding-bottom: 28px; }
      .pattern-atlas { grid-template-columns: 1fr; }
      .pattern-flow { grid-template-columns: 1fr; gap: 5px; }
      .pattern-flow > i { width: 1px; height: 10px; justify-self: center; }
      .pattern-flow > i::after { top: auto; right: -3px; bottom: 0; transform: rotate(135deg); }
      .service-list { gap: 14px; }
      .service-header { padding: 16px; flex-direction: column; gap: 10px; }
      .service-header h2 { font-size: 21px; }
      .verdict-stack { justify-items: start; }
      .evidence-grid { grid-template-columns: 1fr; }
      .evidence-shot figcaption { flex-direction: column; gap: 2px; }
      .evidence-shot figcaption span { text-align: left; }
      .service-section { padding: 16px; }
      .storyboard-heading { flex-direction: column; gap: 8px; }
      .ui-storyboard { grid-template-columns: 1fr; gap: 20px; }
      .ui-screen:not(:last-child)::after {
        top: auto;
        right: calc(50% - 4px);
        bottom: -11px;
        transform: rotate(135deg);
        background: var(--bg);
      }
      .ui-shell { min-height: 350px; }
      .ui-body { padding: 15px; }
      .journey-details .journey { padding: 10px 14px; }
      .journey { grid-template-columns: 1fr; }
      .journey li { padding: 6px 0 10px; }
      .journey li:not(:last-child)::after { top: auto; bottom: 0; left: 10px; right: auto; transform: rotate(135deg); }
      .compare-section, .boundary-section, .signal-section { grid-template-columns: 1fr; gap: 16px; }
      .compare-section > div + div, .boundary-section > div + div, .signal-section > div + div { border-left: 0; border-top: 1px solid var(--line); padding: 16px 0 0; }
      .input-list li { grid-template-columns: 42px minmax(0, 1fr); }
      .input-list small { grid-column: 2; }
      .opportunity-strip { align-items: flex-start; }
      .score-list { grid-template-columns: 1fr; }
      .score-row:nth-child(odd) { border-right: 0; }
      .opportunity-list { grid-template-columns: 1fr; }
      .opportunity-card header { grid-template-columns: 34px minmax(0, 1fr); }
      .opportunity-card header .decision { grid-column: 2; justify-self: start; }
      .opportunity-card dl div { grid-template-columns: 1fr; gap: 2px; }
      .appendix { padding: 32px 10px; }
      .longlist { columns: 1; }
    }
  </style>
</head>
<body>
  <header class="report-header">
    <div class="header-inner">
      <div class="eyebrow">2026-07-28 · 공개 실행 서비스 벤치마크</div>
      <h1>좋은 Vertical 서비스는 콘텐츠를<br>“오늘 할 일”로 바꾼다</h1>
      <p class="lede">앱 24개의 공개 화면과 공식 근거를 비교하고, 핵심 10개는 FlowMe에서 어떻게 보일지 4단계 개념 UI로 시각화했습니다.</p>
      <div class="headline-answer">
        <div class="answer-copy">
          <b>핵심 결론</b>
          <p>강한 구조는 입력을 0~2개로 줄이고, 전체 결과를 먼저 보여준 뒤, 오늘 한 행동만 꺼냅니다. FlowMe는 추천 엔진·진단·마켓플레이스를 만들기보다 공개 원문을 일정·체크·진도·외부 결과물로 연결하는 역할에 집중해야 합니다.</p>
        </div>
        <div class="scope-note">
          <b>검증 경계</b><br>
          공개 웹·공식 도움말·앱스토어만 확인했습니다. 아래 화면은 자동 캡처 증거이며 로그인 내부 기능이나 실제 사용자 행동을 검증한 것이 아닙니다.
        </div>
      </div>
      <div class="stats">
        <div class="stat"><b>${summary.discoveredCount}</b><span>발견 후보</span></div>
        <div class="stat"><b>${summary.verifiedCount}</b><span>공식 근거 검증</span></div>
        <div class="stat"><b>${summary.deepDiveCount}</b><span>심층 서비스</span></div>
        <div class="stat"><b>${summary.screenshotCount}</b><span>원문 캡처</span></div>
        <div class="stat"><b>${summary.opportunityCount}</b><span>콘텐츠 기회</span></div>
      </div>
    </div>
  </header>

  <nav class="filter-bar" aria-label="서비스 필터">
    <div class="filter-inner">
      <button class="filter-button active" type="button" data-filter="all" title="전체 보기">전체</button>
      <button class="filter-button" type="button" data-filter="go" title="Go"><span class="short-label">G</span><span class="full-label">Go</span></button>
      <button class="filter-button" type="button" data-filter="partner" title="Partner"><span class="short-label">P</span><span class="full-label">Partner</span></button>
      <button class="filter-button" type="button" data-filter="benchmark" title="Benchmark"><span class="short-label">B</span><span class="full-label">Benchmark</span></button>
      <button class="filter-button" type="button" data-filter="hold" title="Hold"><span class="short-label">H</span><span class="full-label">Hold</span></button>
      <select class="filter-select" id="category-filter" aria-label="카테고리 선택">
        <option value="all">모든 카테고리</option>
        ${categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.label)}</option>`).join('')}
      </select>
      <span class="visible-count" id="visible-count">${deepDiveServices.length}개 표시</span>
    </div>
  </nav>

  <main>
    <section class="pattern-overview" id="pattern-overview">
      <div class="section-heading">
        <h2>8가지 실행 구조를 한눈에</h2>
        <p>각 서비스가 무엇을 입력받아 어떤 결과를 만들고, 오늘 무엇을 꺼내 주는지 비교합니다.</p>
      </div>
      <div class="pattern-atlas">
        ${renderPatternAtlas()}
      </div>
    </section>

    <div class="section-heading">
      <h2>서비스별 FlowMe UI 미리보기</h2>
      <p>원문 화면 2장과 발견 → 최소 입력 → 결과 미리보기 → 오늘 실행 4화면을 함께 봅니다.</p>
    </div>
    <section class="service-list" id="service-list">
      ${deepDiveServices.map(renderServiceCard).join('')}
    </section>

    <section class="opportunity-band" id="opportunities">
      <div class="section-heading">
        <h2>다음 콘텐츠 발굴 기회 8개</h2>
        <p>서비스 콘텐츠를 복제하지 않고, 같은 실행 패턴을 가진 공개 제작자·브랜드 원문을 찾는 방향입니다.</p>
      </div>
      <div class="opportunity-list">
        ${opportunities.map(renderOpportunity).join('')}
      </div>
    </section>
  </main>

  <section class="appendix">
    <div class="appendix-inner">
      <div class="section-heading">
        <h2>검증한 24개 전체</h2>
        <p>심층 10개 외 서비스도 공식 근거와 동일한 점수 구조로 JSON 원장에 포함했습니다.</p>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>서비스</th><th>카테고리</th><th>실행 패턴</th><th>필수 입력</th><th>생성 결과</th><th>판정</th></tr></thead>
          <tbody>${verifiedServices.map(renderCompactService).join('')}</tbody>
        </table>
      </div>

      <div class="section-heading" style="margin-top:32px">
        <h2>발견 후보 36개</h2>
        <p>수량을 맞추기 위해 중복·약한 후보를 승격하지 않았습니다.</p>
      </div>
      <ul class="longlist">
        ${discoveredCandidates.map((candidate) => `<li><b>${escapeHtml(candidate.name)}</b> · ${escapeHtml(candidate.status === 'verified' ? '검증' : '보조 후보')} · ${escapeHtml(categoryLabel(candidate.category))}</li>`).join('')}
      </ul>
      <div class="method-note">
        <b>판정 해석:</b> Go는 해당 서비스의 데이터를 가져오라는 뜻이 아니라 같은 원형의 공개 콘텐츠 발굴을 진행할 가치가 있다는 뜻입니다. Partner는 권리·제휴가 확인될 때만 공개 전환할 수 있고, Benchmark는 실행 구조만 참고합니다. Hold는 전문·규제·민감 데이터 경계가 우선입니다.
      </div>
    </div>
  </section>

  <footer>FlowMe content audit · ${escapeHtml(reportMeta.checkedAt)} · app/seed/canonical 변경 없음</footer>

  <script>
    (() => {
      const buttons = [...document.querySelectorAll('[data-filter]')];
      const categorySelect = document.getElementById('category-filter');
      const cards = [...document.querySelectorAll('.service-card')];
      const count = document.getElementById('visible-count');
      let decision = 'all';

      function applyFilters() {
        let visible = 0;
        for (const card of cards) {
          const matchesDecision = decision === 'all' || card.dataset.decision === decision;
          const matchesCategory = categorySelect.value === 'all' || card.dataset.category === categorySelect.value;
          card.classList.toggle('hidden', !(matchesDecision && matchesCategory));
          if (matchesDecision && matchesCategory) visible += 1;
        }
        count.textContent = visible + '개 표시';
      }

      for (const button of buttons) {
        button.addEventListener('click', () => {
          decision = button.dataset.filter;
          buttons.forEach((item) => item.classList.toggle('active', item === button));
          applyFilters();
        });
      }
      categorySelect.addEventListener('change', applyFilters);
    })();
  </script>
</body>
</html>`;

fs.writeFileSync(htmlFile, html, 'utf8');

const handoff = `# Vertical 실행 서비스 기반 콘텐츠 발굴 Handoff

작성일: 2026-07-28  
범위: 콘텐츠 발굴·기획 전용. 앱 코드, seed, canonical 로직은 변경하지 않는다.

## 먼저 읽을 파일

1. \`docs/content-audit/2026-07-28-vertical-execution-service-review-ko.html\`
2. \`docs/content-audit/2026-07-28-vertical-execution-service-benchmark-v1.json\`
3. 이 문서
4. \`docs/flow-rules/source-to-flow-conversion-gate.md\`
5. \`docs/flow-rules/flow-content-source-selection.md\`

## 이번 조사에서 확인한 결론

- 좋은 Vertical 서비스는 콘텐츠 양보다 \`최소 입력 → 전체 결과 미리보기 → 오늘/다음 행동 → 완료·수정 → 다음 행동\` 연결이 강하다.
- FlowMe는 자동 추천·진단·전문 계산·마켓플레이스를 복제하지 않는다.
- FlowMe의 기회는 공개 원문을 날짜 없는 저장, 기준일 일정, 반복 루틴, 상태형 체크, 캘린더·시트·메모 내보내기로 바꾸는 실행 레이어다.
- 서비스 전체가 좋은 것과 공개 콘텐츠 공급처로 좋은 것은 다르다. Benchmark와 Partner를 분리한다.
- 자동 캡처는 공개 화면 근거이지 in-app 검증이나 실제 사용자 검증이 아니다.

## 우선 발굴할 8개 기회

${opportunities.map((opportunity) => `### ${opportunity.rank}. ${opportunity.title}

- 판정: ${decisionLabels[opportunity.decision]}
- 생활 영역: ${categoryLabel(opportunity.category)}
- 찾을 source shape: ${opportunity.sourceShape}
- 제작자 유형: ${opportunity.creatorTypes.join(', ')}
- 실제 검색어: ${opportunity.searchQueries.join(' / ')}
- 반드시 확보할 source row: ${opportunity.requiredSourceRows.join(', ')}
- 예상 최초 입력: ${opportunity.expectedInputs.join(', ')}
- 자연스러운 결과물: ${opportunity.naturalArtifact}
- 공개·권리 경계: ${opportunity.publicUseBoundary}
`).join('\n')}

## 발굴 통과 조건

후보는 아래를 모두 충족해야 한다.

1. 실제 공개 URL을 열고 제목·제작자·최신성을 확인한다.
2. 실행 가능한 표 row, 회차, D-day 구간, 반복 주기, 영상 목록 중 하나가 실제 원문에 있다.
3. 저장 후 생기는 결과물을 한 문장으로 설명할 수 있다.
4. 첫 사용자 입력은 기본 0~1개, 예외적으로 2개를 넘지 않는다.
5. 원문에 없는 행동·날짜·반복·완료 기준을 만들지 않는다.
6. Item은 독립적으로 체크할 가치가 있는 최소 행동만 둔다.
7. 링크·수량·조건·팁·상태는 detail/memo/sourceTrace에 둔다.
8. creator 콘텐츠, 공식 근거, 위험·주의 정보를 분리한다.
9. 공개 전환 권리가 불명확하면 link_metadata_only 또는 permission_required로 둔다.
10. 서비스 고유 추천 엔진이나 유료 콘텐츠를 source row로 간주하지 않는다.

## 다음 조사 산출물 권장 구조

- 후보 URL 원장: 40~60개
- 실제 원문 재열람: 24~36개
- source row 확보: 12개 이상
- 최종 콘텐츠 후보: 6~8개
- 각 기회별 최소 1개 후보를 목표로 하되 약한 카테고리를 억지로 채우지 않는다.
- 사용자 검토 HTML에는 주요 결과, 원문 캡처, 생성될 Flow 전체를 먼저 배치한다.

## 로직 세션에 넘길 때 확정할 필드

- \`userMoment\`
- \`naturalArtifact\`
- \`minimumAnchor\`
- \`stage0Behavior\`
- \`admissionType\`: Link/Bucket | Quick Flow | Full Flow | Hold
- \`sourceRows\`
- \`sourceTrace\`
- \`dateIntent\`
- \`defaultDestination\`
- \`doNotBuildBoundary\`

## 절대 하지 말 것

- 앱 서비스의 비공개 계획·유료 영상·도안·문항·자막을 복제하지 않는다.
- 마케팅 화면만 보고 in_app_verified로 기록하지 않는다.
- 발달·의료·세금·운동 강도·식물 질병 진단을 FlowMe가 새로 계산하지 않는다.
- 지도 최적화, 결제, 예약, 은행 연동, GPS, 웨어러블 코칭을 콘텐츠 기능으로 확장하지 않는다.
- 카테고리 수를 맞추기 위해 source row가 없는 후보를 승격하지 않는다.

## 다음 세션 완료 보고

- 실제로 연 URL 수
- source row 확보 수
- Go / Partner / Benchmark / Hold 수
- 권리 확인이 필요한 후보
- 선택한 6~8개와 선택 이유
- 원문에 없는 항목을 추가하지 않았다는 검증
- 앱 코드·seed·canonical 변경 없음
`;

fs.writeFileSync(handoffFile, handoff, 'utf8');

console.log(JSON.stringify({
  files: [jsonFile, htmlFile, handoffFile],
  summary,
}, null, 2));
