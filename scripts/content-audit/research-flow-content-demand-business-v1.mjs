import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const auditDir = path.join(root, 'docs', 'content-audit');
const assetDir = path.join(auditDir, '2026-07-22-flow-content-demand-business-assets');
const outputFile = path.join(assetDir, 'opened-url-scan-v1.json');
const concurrency = Math.max(1, Math.min(8, Number(process.env.FLOW_SCOUT_CONCURRENCY || 5)));
const timeoutMs = Math.max(5_000, Number(process.env.FLOW_SCOUT_TIMEOUT_MS || 20_000));

fs.mkdirSync(assetDir, { recursive: true });

const goldBenchmarks = [
  ['GOLD-01', '펀맘', 'family_parenting', 'https://funmom.tistory.com/'],
  ['GOLD-02', '오픽 모의고사 공부 방법', 'study_reading', 'https://mansour.tistory.com/entry/%EC%98%A4%ED%94%BD-%EB%AA%A8%EC%9D%98%EA%B3%A0%EC%82%AC-%EA%B3%B5%EB%B6%80-%EB%B0%A9%EB%B2%95'],
  ['GOLD-03', '이유식 식단표', 'family_parenting', 'https://blog.naver.com/01695258757/222768860919'],
  ['GOLD-04', '독서 기록', 'study_reading', 'https://blog.naver.com/naristyle87/222978131890'],
  ['GOLD-05', '신차 구매', 'money_admin_purchase', 'https://web.getcha.kr/blog/complete-guide-new-car-purchase-procedure-for-beginners'],
  ['GOLD-06', '영유아 예방접종', 'family_parenting', 'https://khms.or.kr/healthy_life/prevention/vaccination_child'],
  ['GOLD-07', '이사 체크리스트', 'home_living', 'https://www.ajd.co.kr/contents/basic-tip/detail/%EC%9D%B4%EC%82%AC_%EC%A4%80%EB%B9%84_%EC%B2%B4%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8_2024_%EC%99%84%EB%B2%BD%EC%A0%95%EB%A6%AC!-23363'],
  ['GOLD-08A', '결혼 체크리스트 블로그', 'travel_outings', 'https://blog.naver.com/wilklove/223518896995'],
  ['GOLD-08B', '결혼 준비 노션', 'travel_outings', 'https://gongysd.com/wedding-notion/?bmode=view&idx=167989966'],
  ['GOLD-09', 'Allblanc 홈트', 'health_fitness', 'https://youtube.com/@allblanctv'],
].map(([candidateId, title, lifeArea, sourceUrl]) => ({ candidateId, title, lifeArea, sourceUrl, origin: 'gold_benchmark' }));

// These URLs came from the live search pass on 2026-07-22. They supplement the
// earlier ledgers so the broad scan is not limited to already-scored sources.
const supplementalCandidates = [
  ['LIVE-HOME-01', '청소 성향 파악하기', 'home_living', 'https://ohou.se/advices/5951'],
  ['LIVE-HOME-02', '오늘의집 리모델링 가이드북', 'home_living', 'https://ohou.se/advices/guides/remodeling'],
  ['LIVE-HOME-03', '이사 준비 체크리스트 엑셀', 'home_living', 'https://wise-spring.tistory.com/24'],
  ['LIVE-FAMILY-01', '아리송 엄마표 무료학습지', 'family_parenting', 'https://ari-song.tistory.com/'],
  ['LIVE-FAMILY-02', '고노도로모 카드 프린트', 'family_parenting', 'https://ari-song.tistory.com/846'],
  ['LIVE-FAMILY-03', '미취학 무료 학습지 사이트 후기', 'family_parenting', 'https://slothmomstudy.tistory.com/2?category=1272554'],
  ['LIVE-FAMILY-04', '엄마표놀이 홈스쿨링 사이트 추천', 'family_parenting', 'https://inforbrief.tistory.com/222'],
  ['LIVE-FAMILY-05', '시멘토 엄마표 홈스쿨링 후기', 'family_parenting', 'https://print.symentor.co.kr/bbs/board.php?bo_table=real_review&wr_id=802'],
  ['LIVE-FAMILY-06', '시멘토 프린트학습지', 'family_parenting', 'https://print.symentor.co.kr/'],
  ['LIVE-STUDY-01', '독서 기록 노션 활용기', 'study_reading', 'https://nara.tistory.com/9042'],
  ['LIVE-STUDY-02', '독서 학습 기록 노션 구조', 'study_reading', 'https://jeonghun9326.tistory.com/93'],
  ['LIVE-STUDY-03', '노션 템플릿 공유 사용법', 'study_reading', 'https://nowhere-mymoney.tistory.com/280'],
  ['LIVE-STUDY-04', '독서 기록 템플릿 공유 모음', 'study_reading', 'https://marketinglover.tistory.com/'],
  ['LIVE-CAREER-01', '입퇴사 체크리스트', 'work_career', 'https://help.worksmobile.com/ko/admin-guides/manage-service/hr/check-list/'],
  ['LIVE-CREATOR-01', '1인 가구 콘텐츠 제작 가이드', 'work_career', 'https://ohou.se/advices/10827'],
  ['LIVE-CREATOR-02', '오늘의집 큐레이터 수익화 안내', 'work_career', 'https://ohou.se/advices/11736'],
  ['LIVE-TEMPLATE-01', 'Notion 독서 템플릿', 'study_reading', 'https://www.notion.com/templates/category/reading'],
  ['LIVE-TEMPLATE-02', 'Notion 여행 템플릿', 'travel_outings', 'https://www.notion.com/templates/category/travel'],
  ['LIVE-TEMPLATE-03', 'Notion 식단 계획 템플릿', 'meals_grocery', 'https://www.notion.com/templates/category/meal-planning'],
  ['LIVE-TEMPLATE-04', 'Notion 취업 템플릿', 'work_career', 'https://www.notion.com/templates/category/job-hunt'],
  ['LIVE-TEMPLATE-05', 'Notion 개인 재무 템플릿', 'money_admin_purchase', 'https://www.notion.com/templates/category/personal-finance'],
].map(([candidateId, title, lifeArea, sourceUrl]) => ({ candidateId, title, lifeArea, sourceUrl, origin: 'live_search_2026_07_22' }));

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(auditDir, name), 'utf8'));
}

function loadCandidates() {
  const rows = [...goldBenchmarks, ...supplementalCandidates];

  const scout = readJson('2026-07-04-web-source-scout-candidates.json');
  for (const row of scout.candidates) {
    rows.push({
      candidateId: row.id,
      title: row.title,
      lifeArea: row.category,
      sourceUrl: row.sourceUrl,
      sourceType: row.sourceType,
      sourceShape: row.sourceShape,
      origin: 'web_source_scout_2026_07_04',
    });
  }

  const expansion = readJson('2026-07-19-flow-content-source-expansion-seed.json');
  for (const row of expansion.candidates) {
    rows.push({
      candidateId: row.id,
      title: row.title,
      lifeArea: row.lifeArea,
      sourceUrl: row.sourceUrl,
      sourceType: row.providerType,
      sourceShape: row.sourceFormat,
      rightsMode: row.rightsMode,
      origin: 'source_expansion_2026_07_19',
    });
  }

  const admission = readJson('2026-07-20-flow-content-discovery-candidate-ledger-v1.json');
  for (const row of admission.freshCandidates) {
    rows.push({
      candidateId: row.candidateId,
      title: row.title,
      lifeArea: row.lifeArea,
      sourceUrl: row.sourceUrl,
      sourceType: row.risk,
      sourceShape: row.sourceShape,
      rightsMode: row.rights,
      origin: 'admission_ledger_2026_07_20',
    });
  }

  const mapping = readJson('2026-07-22-flowme-vertical-service-content-coverage-atlas-ceo-ko-content-mapping.json');
  for (const service of mapping.mappings) {
    for (const sample of service.sourceSamples || []) {
      rows.push({
        candidateId: sample.id,
        title: sample.title,
        lifeArea: service.categoryId,
        sourceUrl: sample.url,
        sourceType: sample.provider,
        sourceShape: 'vertical_atlas_source_sample',
        origin: 'vertical_atlas_2026_07_22',
      });
    }
  }

  const unique = new Map();
  for (const row of rows) {
    if (!/^https?:\/\//i.test(row.sourceUrl || '')) continue;
    const key = normalizeUrl(row.sourceUrl);
    const current = unique.get(key);
    if (!current) {
      unique.set(key, { ...row, aliases: [row.candidateId], origins: [row.origin] });
    } else {
      current.aliases = [...new Set([...current.aliases, row.candidateId])];
      current.origins = [...new Set([...current.origins, row.origin])];
      if (row.origin === 'gold_benchmark') {
        current.candidateId = row.candidateId;
        current.title = row.title;
        current.lifeArea = row.lifeArea;
      }
    }
  }
  return [...unique.values()];
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    return url.toString();
  } catch {
    return value;
  }
}

function inspectionUrl(value) {
  try {
    const url = new URL(value);
    if (!/(^|\.)blog\.naver\.com$/i.test(url.hostname)) return value;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2 || !/^\d+$/.test(parts[1])) return value;
    const [blogId, logNo] = parts;
    const postView = new URL('https://blog.naver.com/PostView.naver');
    postView.searchParams.set('blogId', blogId);
    postView.searchParams.set('logNo', logNo);
    postView.searchParams.set('redirect', 'Dlog');
    postView.searchParams.set('widgetTypeCall', 'true');
    postView.searchParams.set('directAccess', 'false');
    return postView.toString();
  } catch {
    return value;
  }
}

function decodeEntities(value = '') {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function textFromHtml(html) {
  return decodeEntities(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function titleFromHtml(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) : '';
}

function metaDescription(html) {
  const patterns = [
    /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*>/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1]).replace(/\s+/g, ' ').trim();
  }
  return '';
}

function collectMatches(input, patterns, limit = 12) {
  const values = [];
  for (const pattern of patterns) {
    for (const match of input.matchAll(pattern)) {
      const value = match[0].replace(/\\u0026/g, '&').replace(/\\"/g, '"').replace(/\s+/g, ' ').trim();
      if (!values.includes(value)) values.push(value.slice(0, 220));
      if (values.length >= limit) return values;
    }
  }
  return values;
}

function inspectSignals(html, text) {
  const sample = `${html.slice(0, 1_500_000)}\n${text.slice(0, 120_000)}`;
  const demand = collectMatches(sample, [
    /(?:조회(?:수)?|views?|viewCount|interactionCount|userInteractionCount)[^\n<>{}]{0,45}\d[\d,.만천억KMBkmb+]*/gi,
    /(?:스크랩|저장|favorites?|bookmarks?|saves?)[^\n<>{}]{0,45}\d[\d,.만천억KMBkmb+]*/gi,
    /(?:좋아요|likes?)[^\n<>{}]{0,45}\d[\d,.만천억KMBkmb+]*/gi,
    /(?:다운로드|downloads?|수강생|참여자|판매량|구매)[^\n<>{}]{0,55}\d[\d,.만천억KMBkmb+]*/gi,
  ]);
  const communication = collectMatches(sample, [
    /(?:댓글|comments?|commentCount|reviewCount|후기|질문|문의)[^\n<>{}]{0,55}\d[\d,.만천억KMBkmb+]*/gi,
    /(?:파일|비밀번호|자료|양식|템플릿).{0,45}(?:요청|부탁|보내|공유|다운로드)/gi,
    /(?:완주|실행|사용).{0,45}(?:후기|인증|결과)/gi,
  ]);
  const copyIntent = collectMatches(sample, [
    /[^\n<>{}]{0,35}(?:xlsx|xls|pdf|notion|노션|엑셀|계획표|식단표|체크리스트|템플릿|양식|프린트|다운로드)[^\n<>{}]{0,70}/gi,
  ], 16);
  const business = collectMatches(sample, [
    /[^\n<>{}]{0,35}(?:smartstore|스마트스토어|상품|강의|수강|예약|견적|상담|제휴|affiliate|newsletter|뉴스레터|구독|shop|store)[^\n<>{}]{0,70}/gi,
  ], 12);
  const sourceRows = collectMatches(text, [
    /(?:D[-+]?\s*\d+|\d+\s*(?:일|주|개월)\s*(?:전|후)|\d+\s*주차|\d+\s*회차|Day\s*\d+)[^.!?]{0,120}/gi,
    /(?:1단계|2단계|3단계|STEP\s*\d+)[^.!?]{0,120}/gi,
  ], 20);
  return { demand, communication, copyIntent, business, sourceRows };
}

async function fetchCandidate(candidate) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = new Date().toISOString();
  try {
    const inspectedUrl = inspectionUrl(candidate.sourceUrl);
    const response = await fetch(inspectedUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.7',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      },
    });
    const contentType = response.headers.get('content-type') || '';
    const buffer = Buffer.from(await response.arrayBuffer());
    const isText = /(html|json|xml|text|javascript)/i.test(contentType) || /\.(?:html?|json)(?:$|\?)/i.test(response.url);
    const html = isText ? buffer.toString('utf8') : '';
    const text = isText ? textFromHtml(html) : '';
    const title = isText ? titleFromHtml(html) : '';
    const signals = isText ? inspectSignals(html, text) : { demand: [], communication: [], copyIntent: [], business: [], sourceRows: [] };
    const opened = response.status < 400 && buffer.length >= (isText ? 700 : 4_000) && (isText ? text.length >= 180 : true);
    return {
      ...candidate,
      requestedUrl: candidate.sourceUrl,
      inspectedUrl,
      finalUrl: response.url,
      openedAt: startedAt,
      responseStatus: response.status,
      contentType,
      responseBytes: buffer.length,
      textLength: text.length,
      pageTitle: title,
      metaDescription: metaDescription(html),
      opened,
      signals,
      evidenceExcerpt: text.slice(0, 900),
      limitation: opened ? null : '응답은 받았지만 실제 본문 구조를 확인하기에 충분하지 않음',
    };
  } catch (error) {
    return {
      ...candidate,
      requestedUrl: candidate.sourceUrl,
      inspectedUrl: inspectionUrl(candidate.sourceUrl),
      finalUrl: null,
      openedAt: startedAt,
      responseStatus: null,
      contentType: null,
      responseBytes: 0,
      textLength: 0,
      pageTitle: '',
      metaDescription: '',
      opened: false,
      signals: { demand: [], communication: [], copyIntent: [], business: [], sourceRows: [] },
      evidenceExcerpt: '',
      limitation: String(error?.message || error).slice(0, 500),
    };
  } finally {
    clearTimeout(timer);
  }
}

const candidates = loadCandidates();
const results = new Array(candidates.length);
let cursor = 0;

async function worker(workerId) {
  while (true) {
    const index = cursor;
    cursor += 1;
    if (index >= candidates.length) return;
    results[index] = await fetchCandidate(candidates[index]);
    const result = results[index];
    console.log(`[${String(index + 1).padStart(3, '0')}/${candidates.length}] worker=${workerId} status=${result.responseStatus ?? 'ERR'} opened=${result.opened ? 'yes' : 'no'} ${result.title}`);
  }
}

await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index + 1)));

const counts = {
  discoveredUrls: candidates.length,
  attemptedUrls: results.length,
  openedUrls: results.filter((result) => result.opened).length,
  failedOrLimitedUrls: results.filter((result) => !result.opened).length,
  visibleDemandSignalUrls: results.filter((result) => result.signals.demand.length > 0).length,
  communicationSignalUrls: results.filter((result) => result.signals.communication.length > 0).length,
  copyIntentSignalUrls: results.filter((result) => result.signals.copyIntent.length > 0).length,
  businessSignalUrls: results.filter((result) => result.signals.business.length > 0).length,
  sourceRowHintUrls: results.filter((result) => result.signals.sourceRows.length > 0).length,
};

const output = {
  schemaVersion: 'flowme-demand-business-opened-url-scan-v1',
  generatedAt: new Date().toISOString(),
  checkedAt: '2026-07-22',
  method: {
    description: '기존 후보 원장, Gold Benchmark, 라이브 검색 보강 URL을 중복 제거한 뒤 실제 HTTP 응답과 본문을 다시 확인했다.',
    openedDefinition: 'HTTP 400 미만이며 HTML/JSON/XML은 본문 텍스트 180자 이상, 바이너리는 4KB 이상인 경우',
    limitations: [
      '이 단계의 정규식 신호는 심층 판정이 아니라 후보 축소용이다.',
      '댓글 수와 제작자 답변은 최종 후보 브라우저 검증에서 다시 확인한다.',
      '로그인·구매·동적 댓글 영역은 unknown으로 유지한다.',
    ],
  },
  counts,
  candidates: results,
};

fs.writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputFile, counts }, null, 2));
