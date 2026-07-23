import fs from 'node:fs';
import path from 'node:path';
import {
  capabilitySnapshot,
  categories,
  currentContentAudit,
  evidenceLabels,
  excludedCandidates,
  fieldKeys,
  fieldLabelsKo,
  p0PortfolioBlueprint,
  reportMeta,
  services,
} from './vertical-service-content-atlas-data.mjs';

const root = process.cwd();
const docsDir = path.join(root, 'docs', 'content-audit');
const reportBase = '2026-07-22-flowme-vertical-service-content-coverage-atlas-ceo-ko';
const evidenceFile = `${reportBase}-evidence-ledger.json`;
const mappingFile = `${reportBase}-content-mapping.json`;
const portfolioFile = `${reportBase}-p0-portfolio.json`;
const htmlFile = `${reportBase}.html`;
const assetDir = path.join(docsDir, 'assets', '2026-07-22-flowme-vertical-service-content-coverage-atlas');
const captureLogFile = path.join(assetDir, 'capture-log.json');

fs.mkdirSync(docsDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });

const samples = services.flatMap((service) => service.samples.map((sample) => ({ service, sample })));
const sampleById = new Map(samples.map((entry) => [entry.sample.id, entry]));
const categoryById = new Map(categories.map((category) => [category.id, category]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(categories.length === 9, `Expected 9 categories, got ${categories.length}`);
assert(services.length === 27, `Expected 27 services, got ${services.length}`);
assert(samples.length === 54, `Expected 54 public content samples, got ${samples.length}`);
assert(currentContentAudit.length >= 15 && currentContentAudit.length <= 20, 'Current content audit must contain 15-20 cases');
assert(p0PortfolioBlueprint.length >= 18 && p0PortfolioBlueprint.length <= 24, 'P0 portfolio must contain 18-24 candidates');

for (const service of services) {
  assert(categoryById.has(service.categoryId), `Unknown category for ${service.id}`);
  assert(service.samples.length >= 2, `${service.name} needs at least two public samples`);
  assert(service.conversion?.sourceContentId, `${service.name} has no conversion`);
  assert(service.coverage?.current && service.coverage?.needsBuild && service.coverage?.external && service.coverage?.doNotCover, `${service.name} has incomplete coverage`);
  for (const sample of service.samples) {
    assert(/^https?:\/\//.test(sample.url), `${sample.id} has no public URL`);
    assert(sample.dataFields && fieldKeys.every((key) => sample.dataFields[key]), `${sample.id} has incomplete field anatomy`);
  }
}

const p0Portfolio = p0PortfolioBlueprint.map((item, index) => {
  const entry = sampleById.get(item.contentId);
  assert(entry, `Unknown P0 content id: ${item.contentId}`);
  const category = categoryById.get(entry.service.categoryId);
  return {
    rank: index + 1,
    ...item,
    contentTitle: entry.sample.title,
    sourceUrl: entry.sample.url,
    sourceProvider: entry.sample.provider,
    serviceId: entry.service.id,
    serviceName: entry.service.name,
    categoryId: category.id,
    category: category.labelKo,
    checkedAt: entry.sample.checkedAt,
    evidence: 'source_fact_plus_strategic_inference',
  };
});

const captureLog = fs.existsSync(captureLogFile) ? JSON.parse(fs.readFileSync(captureLogFile, 'utf8')) : null;
const captureByContentId = new Map((captureLog?.results ?? []).map((result) => [result.contentId, result]));
const screenshotRecords = services.flatMap((service) => service.samples.map((sample, index) => {
  const rel = service.screenshotFiles[index];
  const absolute = path.join(docsDir, ...rel.split('/'));
  const capture = captureByContentId.get(sample.id);
  return {
    serviceId: service.id,
    contentId: sample.id,
    sourceUrl: sample.url,
    file: rel,
    exists: fs.existsSync(absolute),
    bytes: fs.existsSync(absolute) ? fs.statSync(absolute).size : 0,
    capturedAt: fs.existsSync(absolute) ? fs.statSync(absolute).mtime.toISOString() : null,
    responseStatus: capture?.responseStatus ?? null,
    finalUrl: capture?.finalUrl ?? null,
    pageTitle: capture?.pageTitle ?? null,
    likelyContent: capture?.likelyContent ?? null,
    accessLimitation: capture?.limitation ?? null,
  };
}));

const evidenceLedger = {
  schemaVersion: 'flowme-vertical-service-content-evidence-v1',
  generatedAt: new Date().toISOString(),
  report: reportMeta,
  evidenceLabels,
  verificationBoundary: {
    source: '공개 웹 콘텐츠와 저장소 근거를 2026-07-22 기준으로 확인한 전략 조사다.',
    notClaimed: ['실제 FlowMe 사용자 성과', '제작자 계약·허가 완료', '제품 구현 완료', '자동 캡처를 실제 사용자 검증으로 간주'],
  },
  counts: {
    categories: categories.length,
    services: services.length,
    publicContentSamples: samples.length,
    serviceConversions: services.length,
    p0Candidates: p0Portfolio.length,
    currentContentAudited: currentContentAudit.length,
    screenshotsExpected: screenshotRecords.length,
    screenshotsPresent: screenshotRecords.filter((record) => record.exists).length,
    screenshotsVerifiedAsContent: screenshotRecords.filter((record) => record.likelyContent).length,
  },
  categories,
  services,
  screenshots: screenshotRecords,
  captureVerification: captureLog ? { viewport: captureLog.viewport, counts: captureLog.counts, note: captureLog.note, logFile: 'assets/2026-07-22-flowme-vertical-service-content-coverage-atlas/capture-log.json' } : null,
  excludedCandidates,
  currentRepositoryCapability: capabilitySnapshot,
  currentContentAudit,
};

const contentMapping = {
  schemaVersion: 'flowme-vertical-content-mapping-v1',
  generatedAt: new Date().toISOString(),
  definition: '원본 전체가 아니라 체크 가능한 행동 제목과 상세 설명, 필요한 선택 실행 데이터만 기준본으로 변환한다.',
  fields: fieldLabelsKo,
  mappings: services.map((service) => ({
    serviceId: service.id,
    serviceName: service.name,
    categoryId: service.categoryId,
    relationship: service.relationship,
    sourceSamples: service.samples.map((sample) => ({ id: sample.id, title: sample.title, url: sample.url, provider: sample.provider, dataFields: sample.dataFields })),
    conversion: service.conversion,
    coverage: service.coverage,
    ownership: {
      flowmeOwns: ['사용자가 선택한 행동', '개인 일정·기한·담당자', '개인 체크·메모', '원본 출처·제작자', '기준본과 개인본 관계'],
      remainsExternal: service.coverage.external,
      neverOwns: service.coverage.doNotCover,
    },
    decision: service.decision,
  })),
};

const portfolioLedger = {
  schemaVersion: 'flowme-p0-vertical-content-portfolio-v1',
  generatedAt: new Date().toISOString(),
  boundary: '후보 선정안이며 제작자 허가·최신성·제품 준비도 검토 전 발행 완료 콘텐츠가 아니다.',
  counts: {
    total: p0Portfolio.length,
    byStatus: countBy(p0Portfolio, 'status'),
    byCategory: countBy(p0Portfolio, 'category'),
    byFlowType: countBy(p0Portfolio, 'flowType'),
    byOwnerType: countBy(p0Portfolio, 'ownerType'),
  },
  candidates: p0Portfolio,
};

writeJson(evidenceFile, evidenceLedger);
writeJson(mappingFile, contentMapping);
writeJson(portfolioFile, portfolioLedger);

function countBy(rows, key) {
  return Object.fromEntries([...new Set(rows.map((row) => row[key]))].map((value) => [value, rows.filter((row) => row[key] === value).length]));
}

function writeJson(file, value) {
  fs.writeFileSync(path.join(docsDir, file), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function shortUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname.length > 42 ? `${parsed.pathname.slice(0, 39)}...` : parsed.pathname}`;
  } catch {
    return url;
  }
}

function chip(label, tone = '') {
  return `<span class="chip ${tone}">${esc(label)}</span>`;
}

function evidenceChip(kind) {
  const labels = {
    source: '원문 확인',
    repo: '저장소 확인',
    inference: '전략 판단',
    hypothesis: '가설·미측정',
  };
  return chip(labels[kind] ?? kind, `evidence ${kind}`);
}

function list(items, className = 'compact-list') {
  return `<ul class="${className}">${items.map((item) => `<li>${esc(displayText(item))}</li>`).join('')}</ul>`;
}

const flowTypeLabels = new Map([
  ['저장형', '일단 저장'],
  ['준비형', '준비물 확인'],
  ['즉시 실행형', '바로 실행'],
  ['일정형', '날짜를 정해 실행'],
  ['반복형', '반복·진도 관리'],
  ['참고형', '원문을 보며 실행'],
  ['협업형', '역할을 나눠 실행'],
  ['외부 실행형', '예약·신청은 기존 서비스에서'],
]);

const portfolioStatusLabels = new Map([
  ['P0-now', '바로 제작'],
  ['P1-review', '검토 후 제작'],
  ['P2-hold', '보류'],
]);

const decisionLabels = new Map([
  ['start_with_guardrails', '주의 문구와 함께 시작'],
  ['hold_for_locale', '한국 기준 검토 전 보류'],
  ['reference_after_locale_review', '국내 기준 검토 후 참고'],
  ['use_public_itinerary_as_schedule_source', '공개 일정에서 필요한 날짜만 사용'],
  ['priority_official_source', '공식 원본으로 우선 제작'],
  ['official_save_and_link', '공식 정보 저장·링크'],
  ['creator_source_priority', '제작자 협업 우선'],
  ['reference_model_and_export_target', '참고 사례·내보내기 대상'],
  ['korean_creator_priority', '한국 제작자 협업 우선'],
  ['single_workout_only', '단일 운동만 먼저'],
  ['preview_and_external_start', '미리 본 뒤 전문 앱에서 시작'],
  ['creator_single_action', '영상 하나 단위로 시작'],
  ['public_curriculum_only', '공개 커리큘럼만 사용'],
  ['creator_public_outline_pilot', '공개 목차로 시험 제작'],
  ['current_run_only', '현재 운영 강좌만 사용'],
  ['bucket_reference', '한 항목으로 저장'],
  ['single_timed_mission', '짧은 미션 하나로 시작'],
  ['single_bucket_reference', '한 항목과 원문 링크만'],
  ['official_low_risk_deadline', '공식 마감·준비물만'],
  ['selected_reason_checklist', '해당 사유의 준비물만'],
  ['after_verified_vehicle_dates', '차량별 공식 날짜 확인 후 사용'],
  ['preview_only', '미리보기만'],
  ['small_event_reference', '작은 행사부터'],
  ['localized_countdown', '국내 기준을 반영한 D-day'],
  ['creator_bucket_project', '제작자 프로젝트 저장'],
  ['low_risk_decision_memo', '저위험 수리 검토만'],
  ['tool_gated_bucket', '도구 보유자만 저장'],
]);

const serviceDisplay = {
  babybilly: {
    role: '한국 육아 콘텐츠 후보 · 제작자 협업 후보',
    story: '베이비빌리: 놀이를 찾고 저장할 수 있지만, 실제 실행은 원문 밖에서 이어진다',
    mapping: '놀이 하나만 저장하고 자세한 방법과 주의사항은 원문에서 본다',
  },
  netmums: {
    role: '해외 육아 콘텐츠 참고 · 한국 적용 보류',
    story: 'Netmums: 월령별 정보는 풍부하지만 한국 사용자에게 바로 적용할 수는 없다',
    mapping: '월령 가이드는 실행 계획이 아니라 참고 메모로만 남긴다',
  },
  'raising-children-network': {
    role: '공공 육아 콘텐츠 참고',
    story: 'Raising Children Network: 연령별 놀이 아이디어는 좋지만 한국 기준으로 다시 확인해야 한다',
    mapping: '놀이 하나를 저장하고 연령과 안전 정보는 원문에서 확인한다',
  },
  wanderlog: {
    role: '여행 계획 전문 서비스 · 일정 구성 참고',
    story: 'Wanderlog: 날짜와 장소를 한 번에 관리해 여행 계획 자체를 맡는다',
    mapping: '전체 여행을 복제하지 않고 필요한 날짜와 장소만 내 일정으로 가져온다',
  },
  visitkorea: {
    role: '공식 국내 여행 콘텐츠 · 첫 제작 후보',
    story: '대한민국 구석구석: 코스와 장소는 분명하지만 날짜와 최신 운영 정보는 사용자가 정해야 한다',
    mapping: '목적지를 먼저 저장하고 날짜가 정해지면 일정으로 바꾼다',
  },
  'nps-trails': {
    role: '공식 트레일 정보 · 현장 확인은 외부',
    story: 'NPS Trails: 거리·시간·난이도는 공식 정보로 제공하고 현장 상태는 따로 확인하게 한다',
    mapping: '트레일 한 곳을 저장하고 현장 상태와 안전 알림은 공식 사이트에서 확인한다',
  },
  cookpad: {
    role: '제작자 레시피 후보 · 실행 후기 참고',
    story: 'Cookpad: 레시피와 실제로 만들어 본 후기가 다음 사용자의 판단을 돕는다',
    mapping: '레시피는 원문에 두고 재료와 조리 순서만 내 메모로 가져온다',
  },
  'samsung-food': {
    role: '레시피·식단 전문 서비스 · 출처 연결 참고',
    story: 'Samsung Food: 여러 출처의 레시피를 저장·식단·장보기로 연결한다',
    mapping: '원작자 링크를 남긴 채 레시피 메모와 조리 체크만 가져온다',
  },
  '10000recipe': {
    role: '한국 제작자 레시피 후보',
    story: '만개의레시피: 한국어 레시피와 후기·조리 팁이 실제 요리를 돕는다',
    mapping: '반찬 레시피를 메모로 저장하고 필요한 단계만 체크한다',
  },
  'nike-training-club': {
    role: '운동 콘텐츠 후보 · 실제 운동은 Nike 앱',
    story: 'Nike Training Club: 운동 영상과 타이머까지 앱 안에서 실행을 끝낸다',
    mapping: '운동 하나만 일정에 넣고 실제 운동은 Nike 앱에서 한다',
  },
  runna: {
    role: '전문 훈련 서비스 · 후속 연결 검토',
    story: 'Runna: 개인 상태에 맞춰 훈련 강도를 계속 조정하는 전문 서비스다',
    mapping: '훈련 전체를 옮기지 않고 시작일과 주요 세션만 미리 본다',
  },
  'fitness-blender': {
    role: '제작자 운동 영상 후보',
    story: 'Fitness Blender: 길이와 난이도가 분명한 영상이라 바로 시작하기 쉽다',
    mapping: '운동 영상을 저장하고 준비와 완료만 FlowMe에서 체크한다',
  },
  coursera: {
    role: '강의 전문 플랫폼 · 학습은 Coursera에서',
    story: 'Coursera: 강의·과제·진도 관리는 플랫폼 안에서 완결된다',
    mapping: '공개 모듈만 진도표로 옮기고 학습은 Coursera에서 이어간다',
  },
  udemy: {
    role: '제작자 강의 플랫폼 · 학습은 Udemy에서',
    story: 'Udemy: 제작자 강의를 구매한 뒤 차시별 진도는 플랫폼이 관리한다',
    mapping: '공개 목차만 개인 진도표로 옮기고 강의 내용은 가져오지 않는다',
  },
  'k-mooc': {
    role: '공식 공개 강좌 · 학습은 K-MOOC에서',
    story: 'K-MOOC: 운영 기간과 주차별 과정이 공개된 강좌는 일정으로 옮기기 쉽다',
    mapping: '공식 운영 기간과 주차만 일정에 넣고 학습은 K-MOOC에서 한다',
  },
  houzz: {
    role: '전문가 인테리어 콘텐츠 · 영감 참고',
    story: 'Houzz: 완성된 공간에서 영감을 얻지만 실행 계획은 사용자가 따로 세운다',
    mapping: '옷장 정리는 한 번 할 일과 원문 링크만 남겨도 충분하다',
  },
  flylady: {
    role: '반복 생활 습관 참고',
    story: 'FlyLady: 짧은 생활 미션을 반복해 부담을 낮춘다',
    mapping: '10분 미션은 바로 실행하거나 원하는 요일에 반복한다',
  },
  konmari: {
    role: '전문가 정리 방법 · 상품 연결 사례',
    story: 'KonMari: 정리 방법과 상품·강의를 함께 제공하지만 실행 시점은 사용자가 정한다',
    mapping: '옷 정리는 한 항목으로 저장하고 자세한 방법은 원문에서 본다',
  },
  government24: {
    role: '공식 행정 정보 · 신청은 정부24에서',
    story: '정부24: 공식 절차와 신청 창구는 분명하지만 개인 마감 관리는 따로 해야 한다',
    mapping: '마감과 준비물만 챙기고 실제 신청은 정부24에서 한다',
  },
  'passport-korea': {
    role: '공식 여권 정보 · 신청은 공식 창구에서',
    story: '외교부 여권안내: 준비물과 수수료는 공식 정보로 확인하고 신청은 외부에서 끝낸다',
    mapping: '만료일과 준비물만 저장하고 신청은 공식 창구에서 한다',
  },
  kotsa: {
    role: '공식 자동차검사 정보 · 예약은 공단에서',
    story: '자동차검사: 차량별 검사 종류와 가능 기간을 조회해야 일정이 정확해진다',
    mapping: '검사 종류와 공식 날짜 범위를 확인한 뒤 예약 마감만 알린다',
  },
  'the-knot': {
    role: '결혼 준비 전문 서비스 · 장기 계획 참고',
    story: 'The Knot: 결혼식 날짜에서 역산해 업체·예산·게스트까지 함께 관리한다',
    mapping: '전체 웨딩 관리는 가져오지 않고 큰 일정만 미리 본다',
  },
  zola: {
    role: '결혼 준비·상거래 전문 서비스',
    story: 'Zola: 콘텐츠와 결혼 준비 도구·상거래를 한곳에 묶는다',
    mapping: '결혼 전체보다 손님 초대처럼 작은 행사부터 가져온다',
  },
  moveadvisor: {
    role: '이사 준비 콘텐츠 · D-day 구성 참고',
    story: 'MoveAdvisor: 이사일 하나를 기준으로 준비 순서를 역산한다',
    mapping: '이사일을 입력하면 큰 준비 항목만 D-day 일정으로 바꾼다',
  },
  instructables: {
    role: '제작자 만들기 콘텐츠 · 커뮤니티 참고',
    story: 'Instructables: 완성작·재료·사진 단계가 있어 따라 할지 판단하기 쉽다',
    mapping: '만들기를 먼저 저장하고 날짜가 정해지면 준비 목록을 연다',
  },
  ifixit: {
    role: '참여형 수리 지식 · 전문 수리는 외부',
    story: 'iFixit: 난이도·시간·도구·사진 단계를 보여줘 수리 가능성을 판단하게 한다',
    mapping: '저위험 수리만 검토 목록으로 만들고 전문 판단은 원문에 남긴다',
  },
  cricut: {
    role: '도구 중심 만들기 콘텐츠 · 실제 제작은 Cricut에서',
    story: 'Cricut: 기기·재료·도안이 맞아야 실행할 수 있는 도구 중심 서비스다',
    mapping: '프로젝트를 저장하되 도안과 기기 제어는 Cricut에서 한다',
  },
};

function displayFlowType(value = '') {
  return String(value)
    .split(/(→|·)/)
    .map((part) => flowTypeLabels.get(part.trim()) ?? part)
    .join('')
    .replaceAll('·', ' · ')
    .replaceAll('→', ' → ');
}

function displayStatus(value = '') {
  return portfolioStatusLabels.get(value) ?? value;
}

function displayDecision(value = '') {
  return decisionLabels.get(value) ?? value;
}

function displayText(value = '') {
  return String(value)
    .replaceAll('제작자 기준본', '제작자가 공개한 Flow')
    .replaceAll('사용자 개인본', '사용자가 고친 내 Flow')
    .replaceAll('개인 실행본', '내 상황에 맞춘 Flow')
    .replaceAll('기준본', '공용 Flow')
    .replaceAll('P0', '초기 단계')
    .replaceAll('P1', '다음 단계')
    .replaceAll('P2', '후속 단계')
    .replaceAll('버티컬', '전문 서비스')
    .replaceAll('export', '내보내기')
    .replaceAll('source import', '원문 가져오기')
    .replaceAll('creator table', '제작자 표');
}

function undatedLabel(flowType = '') {
  if (flowType.includes('즉시') || flowType.includes('참고')) return '날짜 없이 바로 실행';
  return '날짜는 나중에 정함';
}

function slide({ id, eyebrow, title, subtitle = '', category = 'executive', accent = '#172d27', body, className = '' }) {
  return `<section class="slide ${className}" id="${esc(id)}" data-category="${esc(category)}" style="--accent:${esc(accent)}">
    <header class="slide-head">
      <div><div class="eyebrow">${esc(eyebrow)}</div><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
      <div class="slide-no" aria-label="장표 번호"></div>
    </header>
    <div class="slide-body">${body}</div>
  </section>`;
}

function metric(value, label, note = '') {
  return `<div class="metric"><strong>${esc(value)}</strong><span>${esc(label)}</span>${note ? `<small>${esc(note)}</small>` : ''}</div>`;
}

function coverageColumn(label, items, tone) {
  return `<div class="coverage-col ${tone}"><h4>${esc(label)}</h4>${list(items)}</div>`;
}

function fieldSummary(sample) {
  const states = ['explicit_structured_or_labeled', 'present_in_prose_or_media', 'creator_judgment', 'flowme_inference_required', 'external_live_data', 'absent'];
  const labels = { explicit_structured_or_labeled: '항목으로 제공', present_in_prose_or_media: '본문·영상에 있음', creator_judgment: '제작자 판단', flowme_inference_required: 'FlowMe 제안', external_live_data: '외부 확인', absent: '없음' };
  const counts = Object.fromEntries(states.map((state) => [state, fieldKeys.filter((key) => sample.dataFields[key] === state).length]));
  return `<div class="field-bars">${states.map((state) => `<div class="field-row"><span>${labels[state]}</span><div><i class="${state}" style="width:${counts[state] === 0 ? 0 : Math.max(4, counts[state] / fieldKeys.length * 100)}%"></i></div><b>${counts[state]}</b></div>`).join('')}</div>`;
}

function journey(service) {
  const stages = [
    ['찾기', service.journey.discovery, service.journey.interest],
    ['고르기', service.journey.save, service.journey.context],
    ['준비', service.journey.date, service.journey.prepare],
    ['실행', service.journey.execute, service.journey.progress],
    ['다시 쓰기', service.journey.share, service.journey.reuse],
  ];
  return `<div class="journey">${stages.map(([label, first, second], index) => `<div class="journey-step"><b>${String(index + 1).padStart(2, '0')} · ${esc(label)}</b><span>${esc(displayText(first))}</span><small>${esc(displayText(second))}</small></div>`).join('')}</div>`;
}

function sampleFigure(service, sample, index) {
  const image = service.screenshotFiles[index];
  return `<figure class="source-shot">
    <a href="${esc(sample.url)}" target="_blank" rel="noreferrer"><img src="${esc(image)}" alt="${esc(service.name)}의 ${esc(sample.title)} 공개 화면" loading="lazy"></a>
    <figcaption><b>${esc(sample.title)}</b><span>${esc(sample.provider)} · 확인 ${esc(sample.checkedAt)}</span><a href="${esc(sample.url)}" target="_blank" rel="noreferrer">${esc(shortUrl(sample.url))}</a></figcaption>
  </figure>`;
}

function sourceCard(sample) {
  return `<article class="source-analysis"><div class="source-analysis-head"><h4>${esc(sample.title)}</h4>${evidenceChip('source')}</div>
    <p><b>첫 화면</b> ${esc(displayText(sample.firstView))}</p>
    <p><b>실행하려면 더 필요한 것</b> ${esc(displayText(sample.executionGap))}</p>
    <p><b>이미지·영상이 하는 일</b> ${esc(displayText(sample.mediaRole))}</p>
    <div class="fact-strip">${sample.observedFacts.slice(0, 2).map((fact) => `<span>${esc(displayText(fact))}</span>`).join('')}</div>
  </article>`;
}

function flowMock(service) {
  const conversion = service.conversion;
  return `<div class="flow-mock">
    <div class="mock-top"><span>FLOWME 적용 예시 · 아직 발행하지 않음</span>${chip(displayFlowType(conversion.naturalFlowType))}</div>
    <h3>${esc(conversion.appliedInstance.title)}</h3>
    <p>${esc(displayText(conversion.baseline.detail))}</p>
    <div class="mock-items">${conversion.appliedInstance.items.map((item) => `<div class="mock-item"><i aria-hidden="true"></i><div><b>${esc(item.title)}</b>${item.date ? `<time>${esc(formatDate(item.date))}</time>` : `<time>${esc(undatedLabel(conversion.naturalFlowType))}</time>`}<span>${esc(displayText(item.detail))}</span></div></div>`).join('')}</div>
    <a href="${esc(service.samples.find((sample) => sample.id === conversion.sourceContentId)?.url ?? service.samples[0].url)}" target="_blank" rel="noreferrer">자세한 내용은 원문에서 보기</a>
  </div>`;
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value));
  } catch {
    return value;
  }
}

const slides = [];
const p0Counts = countBy(p0Portfolio, 'status');
const auditCounts = countBy(currentContentAudit, 'disposition');

slides.push(slide({
  id: 'executive-answer', eyebrow: '핵심 요약 · 01', title: '원문은 그대로 두고, 사용자가 실제로 할 일만 가져온다',
  subtitle: '전문 서비스의 콘텐츠를 복제하지 않고 일정·체크리스트·메모처럼 바로 쓸 수 있는 결과로 바꾸는 전략',
  className: 'cover-slide',
  body: `<div class="answer-grid">
    <div class="answer-copy">
      <div class="thesis"><span>Flow의 기본 단위</span><strong>할 일 + 설명 + 필요할 때만 붙이는 날짜·장소·준비물</strong></div>
      <div class="thesis"><span>FlowMe가 맡을 것</span><strong>할 일, 날짜, 체크 상태, 개인 메모, 원문 링크</strong></div>
      <div class="thesis"><span>기존 서비스에 둘 것</span><strong>원문·영상·예약·결제·지도·전문 판단</strong></div>
      <div class="thesis"><span>초기 원칙</span><strong>저장, 바로 실행, 일정 추가 중 가장 단순한 방식으로 시작</strong></div>
    </div>
    <div class="metric-grid">
      ${metric('9', '생활 카테고리')}${metric('27', '상세 서비스')}${metric('54', '실제 공개 콘텐츠')}${metric('27', 'FlowMe 적용 예시')}
      ${metric('24', '초기 제작 후보', `${p0Counts['P0-now'] ?? 0}개 바로 제작`)}${metric('18', '현재 콘텐츠 재검토', '관찰 사용자 0명')}
    </div>
  </div>
  <div class="evidence-line">${evidenceChip('source')} ${evidenceChip('repo')} ${evidenceChip('inference')} ${evidenceChip('hypothesis')}<span>원문 사실, 저장소 확인, 전략 판단, 아직 검증하지 않은 가설을 구분했다.</span></div>`,
}));

slides.push(slide({
  id: 'executive-decisions', eyebrow: '핵심 요약 · 02', title: '오늘 정해야 다음 제작 범위가 흔들리지 않는다', subtitle: '콘텐츠의 기본 단위, 첫 제작 후보, FlowMe가 맡을 범위를 다섯 가지로 정리했다.',
  body: `<div class="decision-list">
    ${[
      ['1', 'Flow의 기본 단위', '할 일 + 설명 + 필요한 실행 정보', '승인', '원문이 단순하면 Flow도 한 항목으로 끝낸다.'],
      ['2', '처음 만들 콘텐츠', '24개 후보 중 16개부터 제작', '조건부 승인', '권리·최신성·안전을 확인한 실제 원문만 사용한다.'],
      ['3', 'FlowMe가 맡을 범위', '행동·개인 일정·체크·원문 링크', '승인', '원문·영상·커뮤니티는 제작자와 기존 서비스에 남긴다.'],
      ['4', '먼저 보완할 기능', '일단 저장 → 나중에 날짜 추가', '1순위', '여행·정리·만들기·가족 활동에 공통으로 필요하다.'],
      ['5', '기존 서비스에 맡길 기능', '예약·결제·지도·실시간 정보', '승인', '전문 서비스의 고유 기능과 경쟁하지 않는다.'],
    ].map(([no, name, choice, badge, impact]) => `<div class="decision-row"><b>${no}</b><span>${esc(name)}</span><strong>${esc(choice)}</strong>${chip(badge, badge === '1순위' ? 'priority' : '')}<p>${esc(impact)}</p></div>`).join('')}
  </div>
  <div class="portfolio-summary"><h3>초기 제작 후보 24개</h3>${Object.entries(p0Counts).map(([key, value]) => metric(String(value), displayStatus(key))).join('')}<p>${evidenceChip('hypothesis')} 아직 발행한 콘텐츠가 아니다. 제작자 허가, 최신성, 제품 준비도를 확인해야 한다.</p></div>`,
}));

slides.push(slide({
  id: 'executive-boundary', eyebrow: '핵심 요약 · 03', title: '지금 할 수 있는 일과 먼저 보완할 일을 구분했다', subtitle: '실제 저장소에서 확인한 기능과 전략 문서에만 있는 기능을 섞지 않았다.',
  body: `<div class="boundary-flow">
    <div><span>원본 서비스</span><strong>글·영상·강의·사진</strong><small>제작자·공식 기관이 소유</small></div><i>→</i>
    <div><span>공용 Flow</span><strong>할 일·설명·출처</strong><small>검토한 뒤 여러 사람이 사용</small></div><i>→</i>
    <div><span>내 Flow</span><strong>날짜·체크·메모</strong><small>개인 정보는 비공개가 기본</small></div><i>→</i>
    <div><span>기존 서비스</span><strong>캘린더·예약·강의</strong><small>전문 기능은 그곳에서 사용</small></div>
  </div>
  <div class="boundary-grid">
    ${coverageColumn('지금 할 수 있음', capabilitySnapshot.current, 'supported')}
    ${coverageColumn('먼저 보완해야 함', capabilitySnapshot.needsBuild, 'build')}
    ${coverageColumn('기존 서비스에서 처리', capabilitySnapshot.external, 'external')}
    ${coverageColumn('FlowMe가 하지 않음', capabilitySnapshot.doNotCover, 'no')}
  </div>
  <div class="audit-strip"><b>현재 콘텐츠 18개</b>${Object.entries(auditCounts).map(([key, value]) => chip(`${key} ${value}`, key.includes('교체') || key === '보류' ? 'warn' : ''))}<span>${evidenceChip('repo')} 자동 검사 결과이며, 관찰 사용자 검증은 아직 없다.</span></div>`,
}));

categories.forEach((category, categoryIndex) => {
  const categoryServices = services.filter((service) => service.categoryId === category.id);
  const categoryPortfolio = p0Portfolio.filter((item) => item.categoryId === category.id);
  const categorySamples = categoryServices.flatMap((service) => service.samples);
  slides.push(slide({
    id: `category-${category.id}`, eyebrow: `카테고리 결론 · ${String(categoryIndex + 4).padStart(2, '0')}`, title: `${category.labelKo}: ${category.thesis}`, subtitle: '서비스 3곳과 실제 공개 콘텐츠 6개를 비교한 결론', category: category.id, accent: category.accent,
    body: `<div class="category-decision-grid">
      <div class="category-lead">
        <div class="category-verdict">${chip(category.recommendation.replaceAll('P0', '초기 단계').replaceAll('P1', '다음 단계'), 'priority')}<h3>${esc(displayFlowType(category.defaultFlow))}</h3><p>사용자가 받는 결과: <b>${esc(category.destination)}</b></p></div>
        <div class="category-fields"><p><b>사용자에게 물을 것</b>${esc(category.minimalInputs)}</p><p><b>지금 가능한 범위</b>${esc(category.currentCoverage)}</p><p><b>먼저 보완할 점</b>${esc(category.biggestGap)}</p><p><b>주의할 점</b>${esc(category.risk)}</p></div>
      </div>
      <div class="service-mini-grid">${categoryServices.map((service) => `<a href="#service-${service.id}-story"><span>${esc(service.name)}</span><strong>${esc(service.decision.representativeFlow)}</strong><small>${esc(displayDecision(service.decision.p0))}</small></a>`).join('')}</div>
      <div class="category-evidence">
        <h3>실제 콘텐츠 6건</h3><div>${categorySamples.map((sample) => `<a href="${esc(sample.url)}" target="_blank" rel="noreferrer">${esc(sample.title)}</a>`).join('')}</div>
      </div>
      <div class="category-p0"><h3>처음 만들 Flow ${categoryPortfolio.length}개</h3>${categoryPortfolio.map((item) => `<div><span>${esc(displayStatus(item.status))}</span><b>${esc(item.contentTitle)}</b><small>${esc(displayFlowType(item.flowType))} · 위험 ${esc(item.risk)}</small></div>`).join('') || '<p>이번 24개 후보에서는 제외했다. 다음 검토에서 다시 본다.</p>'}</div>
    </div>`,
  }));
});

services.forEach((service, serviceIndex) => {
  const category = categoryById.get(service.categoryId);
  const appendixNo = String(serviceIndex + 1).padStart(2, '0');
  const display = serviceDisplay[service.id];
  slides.push(slide({
    id: `service-${service.id}-story`, eyebrow: `서비스 분석 ${appendixNo}A · ${category.labelKo}`, title: display?.story ?? `${service.name}: 콘텐츠를 발견한 뒤 어디까지 실행할 수 있는가`, subtitle: `${service.region} · ${display?.role ?? service.relationship}`, category: service.categoryId, accent: category.accent,
    body: `<div class="service-story-grid">
      <div class="screens">${service.samples.map((sample, index) => sampleFigure(service, sample, index)).join('')}</div>
      <div class="service-facts">
        <div class="service-role"><p><b>주요 사용자</b>${esc(service.coreUser)}</p><p><b>사용하는 상황</b>${esc(service.situation)}</p><p><b>콘텐츠 한 개의 단위</b>${esc(service.representativeContentUnit)}</p><p><b>만드는 사람</b>${esc(service.contentCreator)}</p><p><b>수익과 연결되는 방식</b>${esc(service.contentBusinessLink)}</p></div>
        ${service.samples.map(sourceCard).join('')}
      </div>
    </div>
    <div class="journey-wrap"><h3>찾기부터 다시 쓰기까지</h3>${journey(service)}<p class="why-study"><b>FlowMe가 참고할 점</b>${esc(displayText(service.whyFlowMeStudiesIt))}</p></div>`,
  }));

  const conversion = service.conversion;
  const sourceSample = service.samples.find((sample) => sample.id === conversion.sourceContentId) ?? service.samples[0];
  slides.push(slide({
    id: `service-${service.id}-mapping`, eyebrow: `FlowMe 적용 ${appendixNo}B · ${category.labelKo}`, title: display?.mapping ?? `${service.name}에서 실행에 필요한 정보만 가져온다`, subtitle: `예시 Flow: ${conversion.baseline.title} · 전략 예시이며 아직 발행하지 않음`, category: service.categoryId, accent: category.accent,
    body: `<div class="mapping-top">
      <div class="source-side"><img src="${esc(service.screenshotFiles[service.samples.indexOf(sourceSample)])}" alt="${esc(sourceSample.title)} 원본 화면" loading="lazy"><div><span>원본 콘텐츠</span><h3>${esc(sourceSample.title)}</h3><p>${esc(displayText(conversion.sourceShape))}</p><a href="${esc(sourceSample.url)}" target="_blank" rel="noreferrer">원문 열기</a></div></div>
      <div class="mapping-arrow">→<small>실행 정보만 정리</small></div>
      ${flowMock(service)}
    </div>
    <div class="mapping-detail-grid">
      <div class="transform-steps"><h3>원문이 내 Flow가 되는 과정</h3>
        <ol><li><b>찾은 행동</b><span>${esc(displayText(conversion.sourceRowUnit))}</span></li><li><b>공용 Flow</b><span>${esc(conversion.baseline.title)}</span></li><li><b>물어볼 것</b><span>${esc(displayText(conversion.minimalInputs.join(' · ') || '추가 입력 없음'))}</span></li><li><b>받는 결과</b><span>${esc(displayText(conversion.outputs.join(' · ')))}</span></li><li><b>실행 뒤</b><span>${esc(displayText(conversion.afterRun))}</span></li></ol>
      </div>
      <div class="data-anatomy"><h3>원문에 어떤 정보가 있는가</h3>${fieldSummary(sourceSample)}<p>${evidenceChip('source')} 원문에서 확인: ${esc(displayText(conversion.evidenceSeparation.sourceFacts.join(' · ')))}</p><p>${evidenceChip('inference')} FlowMe 제안: ${esc(displayText(conversion.evidenceSeparation.flowmeInference.join(' · ') || '없음'))}</p></div>
      <div class="coverage-map"><h3>FlowMe가 맡을 범위</h3><div>${coverageColumn('지금 할 수 있음', service.coverage.current, 'supported')}${coverageColumn('먼저 보완', service.coverage.needsBuild, 'build')}${coverageColumn('기존 서비스에서 처리', service.coverage.external, 'external')}${coverageColumn('FlowMe가 하지 않음', service.coverage.doNotCover, 'no')}</div></div>
    </div>
    <div class="decision-footer"><div><b>제작 방향</b>${chip(displayDecision(service.decision.p0), 'priority')}<span>${esc(displayText(service.decision.why))}</span></div><div><b>먼저 보완</b><span>${esc(displayText(service.decision.biggestGap))}</span></div><div><b>주의할 점</b><span>${esc(displayText(service.decision.biggestRisk))}</span></div><div><b>하지 않을 일</b><span>${esc(displayText(conversion.doNotBuild))}</span></div></div>`,
  }));
});

assert(slides.length === 66, `Expected 66 slides, got ${slides.length}`);

const categoryOptions = categories.map((category) => `<option value="category-${esc(category.id)}">${esc(category.labelKo)}</option>`).join('');
const serviceOptions = services.map((service) => `<option value="service-${esc(service.id)}-story">${esc(categoryById.get(service.categoryId).labelKo)} · ${esc(service.name)}</option>`).join('');

const supportingDocs = [
  ['AI 시대 플랫폼 전략', '2026-07-12-flowme-ai-era-platform-strategy-ceo-ko.html'],
  ['사용자·제작자 가치사슬', '2026-07-12-flowme-user-creator-value-chain-ceo-ko.html'],
  ['생태계·전문 서비스 전략', '2026-07-13-flowme-ecosystem-platform-vertical-strategy-ceo-ko.html'],
  ['육아·제작자 행동 전략', '2026-07-14-flowme-parenting-creator-action-strategy-ceo-ko.html'],
  ['Flow 콘텐츠 모델', '2026-07-18-flowme-flow-content-model-category-playbook-ceo-ko.html'],
  ['플랫폼·서비스 22개 사례 분석', '2026-07-21-flowme-platform-service-dossiers-ceo-ko.html'],
  ['내보내기 전략', '2026-07-05-flowme-export-pack-v1-strategy-ceo-ko.html'],
  ['출처·버전·신뢰 원칙', '2026-07-05-flowme-source-version-trust-ledger-ceo-ko.html'],
];

const auditDispositionOrder = ['그대로 사용', '데이터 보강', '더 적합한 원본으로 교체', '보류'];
const currentAuditHtml = auditDispositionOrder.map((disposition) => {
  const rows = currentContentAudit.filter((item) => item.disposition === disposition);
  return `<div class="audit-group"><h3>${esc(disposition)} <b>${rows.length}</b></h3>${rows.map((item) => `<div class="ledger-row"><span>${esc(item.caseId)}</span><strong>${esc(item.label)}</strong><p>${esc(displayText(item.reason))}</p><a href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer">원문</a></div>`).join('')}</div>`;
}).join('');

const p0LedgerHtml = p0Portfolio.map((item) => `<div class="ledger-row portfolio-row"><span>${esc(String(item.rank).padStart(2, '0'))}</span><strong>${esc(item.contentTitle)}</strong><p>${esc(item.category)} · ${esc(displayFlowType(item.flowType))} · ${esc(displayText(item.rationale))}</p>${chip(displayStatus(item.status), item.status === 'P0-now' ? 'priority' : '')}<a href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer">원문</a></div>`).join('');

const replacementHtml = excludedCandidates.map((item) => `<div class="ledger-row replacement-row"><strong>${esc(item.name)}</strong><p>${esc(item.reason)}</p><span>대체: ${esc(item.replacement)}</span></div>`).join('');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(reportMeta.title)}</title>
  <style>
    :root{--ink:#15211d;--muted:#5d6964;--line:#d9dfdc;--paper:#fff;--wash:#f4f7f5;--green:#1e6b51;--red:#b3473e;--amber:#a86b14;--blue:#2c6594;--purple:#6652a3;--bar-h:56px;color-scheme:light}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#e9eeeb;color:var(--ink);font-family:"Pretendard","Noto Sans KR","Malgun Gothic",Arial,sans-serif;letter-spacing:0;line-height:1.42}a{color:inherit;text-underline-offset:3px}button,select{font:inherit}
    .topbar{position:sticky;top:0;z-index:50;height:var(--bar-h);display:flex;align-items:center;gap:10px;padding:8px 14px;background:#172d27;color:#fff;border-bottom:1px solid #29443b}.brand{font-weight:800;white-space:nowrap}.brand small{display:block;font-size:10px;font-weight:500;color:#b9cac3}.topbar select{height:36px;max-width:230px;border:1px solid #557067;background:#203a31;color:#fff;padding:0 30px 0 10px;border-radius:4px}.topbar .spacer{flex:1}.topbar>a{font-size:12px;color:#dce8e3;white-space:nowrap}.progress{height:3px;position:fixed;top:var(--bar-h);left:0;right:0;z-index:51;background:#cfd8d4}.progress i{display:block;height:100%;width:0;background:#e5a634}
    main{display:grid;gap:20px;padding:20px}.slide{position:relative;width:min(1440px,100%);min-height:calc(100vh - var(--bar-h) - 40px);margin:0 auto;background:var(--paper);border-top:7px solid var(--accent);box-shadow:0 8px 28px rgba(20,35,29,.08);padding:28px 34px 26px;overflow:hidden;scroll-margin-top:calc(var(--bar-h) + 8px)}.slide-head{display:flex;justify-content:space-between;gap:24px;padding-bottom:14px;border-bottom:1px solid var(--line)}.eyebrow{font-size:11px;font-weight:800;color:var(--accent);text-transform:uppercase}.slide h2{font-size:clamp(24px,3vw,42px);line-height:1.16;margin:4px 0 0;max-width:1100px}.slide-head p{margin:7px 0 0;color:var(--muted);font-size:15px}.slide-no{font-size:12px;color:var(--muted);white-space:nowrap}.slide-body{padding-top:18px}.chip{display:inline-flex;align-items:center;min-height:24px;padding:3px 8px;border:1px solid #cbd5d1;background:#f6f8f7;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap}.chip.priority{background:#e5f3ec;border-color:#a8cbb9;color:#17543f}.chip.warn{background:#fff1e2;border-color:#e5bb83;color:#8b5108}.chip.evidence.source{background:#e8f3ff;color:#245e8c;border-color:#b8d4ec}.chip.evidence.repo{background:#e9f5ed;color:#276246;border-color:#b7d7c5}.chip.evidence.inference{background:#f0ecfb;color:#5a458d;border-color:#d1c7e9}.chip.evidence.hypothesis{background:#fff0eb;color:#983f34;border-color:#e4b8af}
    .cover-slide{background:#fbfdfc}.answer-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:34px}.answer-copy{display:grid;gap:10px}.thesis{display:grid;grid-template-columns:150px 1fr;align-items:center;gap:18px;padding:16px 0;border-bottom:1px solid var(--line)}.thesis span{font-size:12px;font-weight:800;color:var(--muted)}.thesis strong{font-size:22px;line-height:1.25}.metric-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.metric{display:flex;flex-direction:column;justify-content:center;min-height:118px;padding:15px;border:1px solid var(--line);border-radius:6px;background:#fff}.metric strong{font-size:40px;line-height:1;color:var(--green)}.metric span{font-weight:800;margin-top:8px}.metric small{color:var(--muted);margin-top:2px}.evidence-line{display:flex;align-items:center;gap:7px;margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}.evidence-line>span:last-child{font-size:12px;color:var(--muted)}
    .decision-list{display:grid;gap:8px}.decision-row{display:grid;grid-template-columns:38px 110px minmax(260px,1fr) auto 1.2fr;align-items:center;gap:12px;padding:12px;border-bottom:1px solid var(--line)}.decision-row>b{display:grid;place-items:center;width:32px;height:32px;background:#172d27;color:#fff;border-radius:4px}.decision-row>span{font-size:12px;font-weight:800;color:var(--muted)}.decision-row>strong{font-size:18px}.decision-row p{margin:0;color:var(--muted);font-size:13px}.portfolio-summary{display:flex;align-items:center;gap:10px;margin-top:18px;padding:14px;background:var(--wash)}.portfolio-summary h3{margin:0 10px 0 0}.portfolio-summary .metric{min-height:62px;min-width:100px;padding:8px}.portfolio-summary .metric strong{font-size:24px}.portfolio-summary p{margin-left:auto;font-size:12px;color:var(--muted)}
    .boundary-flow{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1fr;align-items:center;gap:10px}.boundary-flow>div{min-height:112px;padding:15px;border:1px solid var(--line);border-top:4px solid var(--green);background:#fff}.boundary-flow>div:nth-of-type(4){border-top-color:var(--blue)}.boundary-flow span,.boundary-flow small{display:block;color:var(--muted);font-size:11px}.boundary-flow strong{display:block;font-size:19px;margin:7px 0}.boundary-flow>i{font-style:normal;font-size:24px;color:var(--muted)}.boundary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px}.coverage-col{border:1px solid var(--line);border-top:4px solid #8aa198;padding:11px;background:#fff}.coverage-col.supported{border-top-color:#2c8a61}.coverage-col.build{border-top-color:#d08b28}.coverage-col.external{border-top-color:#397eb2}.coverage-col.no{border-top-color:#bd5148}.coverage-col h4{margin:0 0 8px;font-size:13px}.compact-list{padding:0;margin:0;list-style:none}.compact-list li{position:relative;padding:4px 0 4px 13px;font-size:11.5px;color:#34423d}.compact-list li::before{content:"";position:absolute;left:0;top:11px;width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.5}.audit-strip{display:flex;align-items:center;gap:8px;margin-top:16px;padding:12px;background:#172d27;color:#fff}.audit-strip>span:last-child{margin-left:auto;font-size:11px}.audit-strip .evidence{margin-right:5px}
    .category-decision-grid{display:grid;grid-template-columns:1.05fr 1fr;gap:14px}.category-lead,.service-mini-grid,.category-evidence,.category-p0{border:1px solid var(--line);padding:16px;background:#fff}.category-lead{display:grid;grid-template-columns:.8fr 1.2fr;gap:20px}.category-verdict h3{font-size:27px;line-height:1.15;margin:14px 0}.category-verdict p{color:var(--muted)}.category-fields{display:grid;gap:8px}.category-fields p{margin:0;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}.category-fields b{display:block;font-size:10px;color:var(--muted);margin-bottom:3px}.service-mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.service-mini-grid a{display:flex;flex-direction:column;min-width:0;padding:12px;background:var(--wash);text-decoration:none;border-left:3px solid var(--accent)}.service-mini-grid span,.service-mini-grid small{font-size:11px;color:var(--muted)}.service-mini-grid strong{font-size:15px;margin:7px 0}.category-evidence h3,.category-p0 h3{margin:0 0 10px}.category-evidence>div{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.category-evidence a{font-size:12px;padding:7px;background:var(--wash)}.category-p0>div{display:grid;grid-template-columns:70px 1fr auto;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)}.category-p0 span,.category-p0 small{font-size:10px;color:var(--muted)}
    .service-story-grid{display:grid;grid-template-columns:1.05fr 1fr;gap:18px}.screens{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.source-shot{margin:0;border:1px solid var(--line);background:#fff;min-width:0}.source-shot img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#eef2f0}.source-shot figcaption{display:flex;flex-direction:column;gap:3px;padding:10px}.source-shot figcaption b{font-size:13px}.source-shot figcaption span,.source-shot figcaption a{font-size:10px;color:var(--muted);overflow-wrap:anywhere}.service-facts{display:grid;grid-template-columns:1fr 1fr;gap:9px}.service-role{grid-column:1/-1;display:grid;grid-template-columns:repeat(5,1fr);gap:7px;background:var(--wash);padding:10px}.service-role p{margin:0;font-size:11px}.service-role b{display:block;color:var(--accent);font-size:10px;margin-bottom:3px}.source-analysis{border:1px solid var(--line);padding:10px}.source-analysis-head{display:flex;justify-content:space-between;gap:6px}.source-analysis h4{font-size:13px;margin:0 0 8px}.source-analysis p{font-size:10.5px;margin:5px 0}.source-analysis p b{color:var(--muted);margin-right:4px}.fact-strip{display:grid;gap:4px;margin-top:8px}.fact-strip span{font-size:10px;padding:5px;background:#edf5f1}.journey-wrap{margin-top:14px}.journey-wrap h3{font-size:14px;margin:0 0 7px}.journey{display:grid;grid-template-columns:repeat(10,1fr);gap:5px}.journey-step{position:relative;min-width:0;min-height:78px;padding:7px;border-top:3px solid var(--accent);background:var(--wash)}.journey-step b,.journey-step span{display:block}.journey-step b{font-size:9px;color:var(--accent)}.journey-step span{font-size:9px;margin-top:4px}.why-study{display:flex;gap:10px;margin:8px 0 0;font-size:11px;color:var(--muted)}.why-study b{color:var(--ink)}
    .mapping-top{display:grid;grid-template-columns:1fr 72px 1fr;gap:12px;align-items:stretch}.source-side{display:grid;grid-template-columns:1.1fr .9fr;border:1px solid var(--line);min-width:0}.source-side img{width:100%;height:100%;max-height:250px;object-fit:contain;background:#eef2f0}.source-side>div{padding:14px}.source-side span{font-size:10px;font-weight:800;color:var(--accent)}.source-side h3{font-size:18px;margin:6px 0}.source-side p,.source-side a{font-size:11px}.mapping-arrow{display:grid;place-items:center;font-size:34px;color:var(--accent)}.mapping-arrow small{font-size:9px;writing-mode:vertical-rl;color:var(--muted)}.flow-mock{border:2px solid #172d27;padding:14px;background:#fff}.mock-top{display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:800;color:var(--green)}.flow-mock h3{font-size:22px;margin:9px 0 5px}.flow-mock>p{font-size:11px;color:var(--muted);margin:0 0 10px}.mock-items{display:grid;gap:6px}.mock-item{display:grid;grid-template-columns:20px 1fr;gap:8px;padding:8px;background:var(--wash)}.mock-item>i{width:16px;height:16px;border:2px solid #45655a;border-radius:3px;margin-top:2px}.mock-item b,.mock-item time,.mock-item span{display:block}.mock-item b{font-size:12px}.mock-item time{font-size:9px;color:var(--accent);margin:2px 0}.mock-item span{font-size:10px;color:var(--muted)}.flow-mock>a{display:inline-block;margin-top:9px;font-size:11px;font-weight:800;color:var(--green)}.mapping-detail-grid{display:grid;grid-template-columns:.8fr .75fr 1.45fr;gap:10px;margin-top:12px}.mapping-detail-grid>div{border:1px solid var(--line);padding:10px}.mapping-detail-grid h3{font-size:13px;margin:0 0 7px}.transform-steps ol{margin:0;padding-left:20px}.transform-steps li{font-size:10.5px;margin:4px 0}.transform-steps b{display:inline-block;width:60px}.transform-steps span{color:var(--muted)}.field-bars{display:grid;gap:5px}.field-row{display:grid;grid-template-columns:55px 1fr 22px;gap:6px;align-items:center;font-size:9px}.field-row>div{height:7px;background:#e5eae7}.field-row i{display:block;height:100%;background:#7a8c85}.field-row i.explicit_structured_or_labeled{background:#2c8a61}.field-row i.present_in_prose_or_media{background:#397eb2}.field-row i.creator_judgment{background:#6652a3}.field-row i.flowme_inference_required{background:#d08b28}.field-row i.external_live_data{background:#1b7c78}.field-row i.absent{background:#bd5148}.data-anatomy p{font-size:9px;margin:6px 0}.coverage-map>div{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.coverage-map .coverage-col{padding:6px}.coverage-map .coverage-col h4{font-size:10px}.coverage-map .compact-list li{font-size:8.5px;padding-left:9px}.coverage-map .compact-list li::before{top:9px;width:3px;height:3px}.decision-footer{display:grid;grid-template-columns:1.2fr 1fr 1fr 1.2fr;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}.decision-footer>div{font-size:10px}.decision-footer b{display:block;color:var(--muted);font-size:9px;margin-bottom:4px}.decision-footer .chip{margin-right:6px}
    .pager{position:fixed;right:18px;bottom:18px;z-index:60;display:flex;gap:6px}.pager button{width:40px;height:40px;border:1px solid #486158;background:#172d27;color:#fff;border-radius:4px;font-size:22px;cursor:pointer}.decision-ledgers{width:min(1440px,calc(100% - 40px));margin:0 auto 20px;background:#fff;padding:28px 34px;border-top:7px solid #172d27;scroll-margin-top:calc(var(--bar-h) + 8px)}.decision-ledgers>header h2{font-size:30px;margin:0}.decision-ledgers>header p{color:var(--muted);margin:5px 0 18px}.decision-ledgers details{border-top:1px solid var(--line);padding:12px 0}.decision-ledgers summary{cursor:pointer;font-weight:800;font-size:17px}.audit-groups{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:14px}.audit-group h3{font-size:13px;margin:0;padding:8px;border-bottom:3px solid var(--green)}.audit-group h3 b{float:right}.ledger-list{display:grid;grid-template-columns:repeat(2,1fr);gap:0 18px;margin-top:14px}.ledger-row{display:grid;grid-template-columns:48px minmax(130px,.7fr) 1.3fr 42px;gap:8px;align-items:start;padding:8px;border-bottom:1px solid var(--line);font-size:10.5px}.ledger-row>span{color:var(--muted);font-weight:800}.ledger-row strong{font-size:11px}.ledger-row p{margin:0;color:var(--muted)}.ledger-row a{font-weight:800;color:var(--green)}.portfolio-row{grid-template-columns:32px minmax(160px,.8fr) 1.2fr auto 42px}.replacement-row{grid-template-columns:minmax(100px,.45fr) 1.3fr .7fr}.sources-footer{width:min(1440px,calc(100% - 40px));margin:0 auto 30px;padding:18px;background:#172d27;color:#fff}.sources-footer h2{font-size:16px}.sources-footer .links{display:flex;flex-wrap:wrap;gap:8px}.sources-footer a{font-size:11px;color:#dce8e3}.sources-footer p{font-size:11px;color:#b9cac3}
    .mapping-top .flow-mock{padding:10px}.mapping-top .flow-mock h3{font-size:19px;margin:6px 0 4px}.mapping-top .mock-item{padding:5px}.mapping-top .mock-item span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.mapping-top .source-side img{max-height:220px}.mapping-detail-grid{margin-top:8px}.decision-footer{margin-top:6px;padding-top:6px}.slide[id$="-mapping"]{padding-bottom:18px}
    .service-role p{font-size:12px}.service-role b{font-size:11px}.source-analysis h4{font-size:14px}.source-analysis p{font-size:11.5px}.fact-strip span{font-size:11px}.journey-wrap h3{font-size:15px}.journey{grid-template-columns:repeat(5,1fr);gap:7px}.journey-step{min-height:88px;padding:9px}.journey-step b,.journey-step span,.journey-step small{display:block}.journey-step b{font-size:10.5px}.journey-step span{font-size:10.5px;margin-top:5px}.journey-step small{font-size:9.5px;color:var(--muted);margin-top:4px}.why-study{font-size:12px}.source-side span{font-size:11px}.source-side p,.source-side a{font-size:12px}.mapping-arrow small{font-size:10px}.mock-top{font-size:10.5px}.flow-mock>p{font-size:12px}.mock-item b{font-size:12.5px}.mock-item time{font-size:10px}.mock-item span{font-size:11px}.flow-mock>a{font-size:12px}.mapping-detail-grid{grid-template-columns:.85fr .75fr 1.4fr}.mapping-detail-grid h3{font-size:14px}.transform-steps li{font-size:11px}.transform-steps b{width:66px}.field-row{grid-template-columns:78px 1fr 22px;font-size:9.5px}.data-anatomy p{font-size:9.5px}.coverage-map .compact-list li{font-size:9.5px}.decision-footer>div{font-size:10.5px}.decision-footer b{font-size:10px}
    #service-visitkorea-mapping{padding-bottom:5px}#service-visitkorea-mapping .slide-body{padding-top:10px}#service-visitkorea-mapping .source-side>div{padding:8px}#service-visitkorea-mapping .source-side h3{font-size:15px;line-height:1.2}#service-visitkorea-mapping .flow-mock>p{margin-bottom:6px}#service-visitkorea-mapping .mock-item{padding:4px}#service-visitkorea-mapping .mock-item span{-webkit-line-clamp:1}
    @media(max-width:900px){:root{--bar-h:98px}.topbar{height:var(--bar-h);flex-wrap:wrap;align-content:center}.brand{width:100%}.topbar select{max-width:calc(50% - 8px);flex:1;font-size:12px}.topbar>a{display:none}.slide{min-height:auto;padding:20px 16px}.slide h2{font-size:27px}.answer-grid,.category-decision-grid,.service-story-grid,.mapping-top,.mapping-detail-grid{grid-template-columns:1fr}.metric-grid{grid-template-columns:repeat(2,1fr)}.thesis{grid-template-columns:1fr;gap:4px}.decision-row{grid-template-columns:34px 1fr auto}.decision-row>strong,.decision-row p{grid-column:2/-1}.portfolio-summary{align-items:stretch;flex-wrap:wrap}.portfolio-summary p{margin-left:0}.boundary-flow{grid-template-columns:1fr}.boundary-flow>i{transform:rotate(90deg);text-align:center}.boundary-grid{grid-template-columns:1fr 1fr}.audit-strip{flex-wrap:wrap}.audit-strip>span:last-child{width:100%;margin-left:0}.category-lead{grid-template-columns:1fr}.service-mini-grid{grid-template-columns:1fr}.category-evidence>div{grid-template-columns:1fr}.category-p0>div{grid-template-columns:60px 1fr}.category-p0 small{grid-column:2}.screens{grid-template-columns:1fr}.service-facts{grid-template-columns:1fr}.service-role{grid-template-columns:1fr 1fr}.source-analysis{grid-column:1}.journey{grid-template-columns:repeat(2,1fr)}.source-side{grid-template-columns:1fr}.mapping-arrow{transform:rotate(90deg)}.mapping-arrow small{writing-mode:horizontal-tb}.coverage-map>div{grid-template-columns:1fr 1fr}.decision-footer{grid-template-columns:1fr 1fr}.slide-head{gap:8px}.slide-no{font-size:9px}.pager{right:8px;bottom:8px}.source-shot img{aspect-ratio:16/10}.decision-ledgers{width:calc(100% - 40px);padding:20px 16px}.audit-groups,.ledger-list{grid-template-columns:1fr}.ledger-row,.portfolio-row,.replacement-row{grid-template-columns:40px 1fr}.ledger-row p,.ledger-row .chip,.ledger-row a,.replacement-row span{grid-column:2}}
    @media print{.topbar,.progress,.pager{display:none}.slide{break-after:page;min-height:100vh;box-shadow:none;margin:0;padding:22px}.sources-footer{break-before:page}.source-shot img{max-height:240px}}
  </style>
</head>
<body>
  <nav class="topbar" aria-label="보고서 탐색">
    <div class="brand">FLOWME 전문 서비스 콘텐츠 분석<small>27개 서비스 · 실제 콘텐츠 54개 · 66장</small></div>
    <select id="section-jump" aria-label="카테고리 이동"><option value="executive-answer">요약</option>${categoryOptions}</select>
    <select id="service-jump" aria-label="서비스 이동"><option value="">서비스 바로가기</option>${serviceOptions}</select>
    <div class="spacer"></div>
    <a href="#decision-ledgers">세부 판정</a><a href="${evidenceFile}">수치·출처 JSON</a><a href="${mappingFile}">변환 근거 JSON</a><a href="${portfolioFile}">초기 후보 JSON</a>
  </nav>
  <div class="progress" aria-hidden="true"><i id="progress-bar"></i></div>
  <main>${slides.join('\n')}</main>
  <section class="decision-ledgers" id="decision-ledgers">
    <header><h2>세부 판정</h2><p>요약 장표에서 생략한 현재 콘텐츠 18개, 초기 제작 후보 24개, 서비스 교체 이유를 확인한다.</p></header>
    <details open><summary>현재 FlowMe 콘텐츠 18개 · 유지 / 보강 / 교체 / 보류</summary><div class="audit-groups">${currentAuditHtml}</div></details>
    <details><summary>초기 제작 후보 24개 · 실제 원문 URL</summary><div class="ledger-list">${p0LedgerHtml}</div></details>
    <details><summary>공개 콘텐츠를 확인하기 어려워 교체한 서비스</summary><div class="ledger-list">${replacementHtml}</div></details>
  </section>
  <footer class="sources-footer"><h2>관련 근거 문서</h2><div class="links">${supportingDocs.map(([label, href]) => `<a href="${href}">${esc(label)}</a>`).join('')}</div><p>${esc(reportMeta.scopeNote)} 자동 캡처와 화면 검사는 실제 사용자 검증이 아니다.</p></footer>
  <div class="pager"><button id="prev" title="이전 장표" aria-label="이전 장표">‹</button><button id="next" title="다음 장표" aria-label="다음 장표">›</button></div>
  <script>
    const slides = [...document.querySelectorAll('.slide')];
    slides.forEach((slide, index) => { slide.querySelector('.slide-no').textContent = String(index + 1).padStart(2, '0') + ' / ' + slides.length; });
    const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('section-jump').addEventListener('change', (event) => jump(event.target.value));
    document.getElementById('service-jump').addEventListener('change', (event) => event.target.value && jump(event.target.value));
    const currentIndex = () => { const y = window.scrollY + window.innerHeight * .35; let best = 0; slides.forEach((slide, i) => { if (slide.offsetTop <= y) best = i; }); return best; };
    document.getElementById('prev').addEventListener('click', () => jump(slides[Math.max(0, currentIndex() - 1)].id));
    document.getElementById('next').addEventListener('click', () => jump(slides[Math.min(slides.length - 1, currentIndex() + 1)].id));
    addEventListener('keydown', (event) => { if (['ArrowRight','PageDown'].includes(event.key)) { event.preventDefault(); document.getElementById('next').click(); } if (['ArrowLeft','PageUp'].includes(event.key)) { event.preventDefault(); document.getElementById('prev').click(); } });
    const updateProgress = () => { const max = document.documentElement.scrollHeight - innerHeight; document.getElementById('progress-bar').style.width = (max > 0 ? scrollY / max * 100 : 0) + '%'; };
    addEventListener('scroll', updateProgress, { passive: true }); updateProgress();
    document.querySelectorAll('img').forEach((img) => img.addEventListener('error', () => { img.alt += ' (캡처 확인 필요)'; img.style.background = '#fff1e8'; }));
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(docsDir, htmlFile), html, 'utf8');

console.log(JSON.stringify({
  html: path.join(docsDir, htmlFile),
  evidence: path.join(docsDir, evidenceFile),
  mapping: path.join(docsDir, mappingFile),
  portfolio: path.join(docsDir, portfolioFile),
  counts: evidenceLedger.counts,
  slides: slides.length,
}, null, 2));
