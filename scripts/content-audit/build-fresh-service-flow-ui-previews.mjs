import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reviewPath = path.join(
  root,
  'docs/content-audit/original-source-review/2026-06-07-diversified-source-flow-review.json',
);
const jsonPath = path.join(
  root,
  'docs/content-audit/original-source-review/2026-06-07-fresh-service-flow-ui-previews.json',
);
const htmlPath = path.join(root, 'docs/content-audit/2026-06-07-fresh-service-flow-ui-previews.html');

const sourceReview = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const pickedIds = ['japan-esim-setup', 'banana-peanut-recipe-video', 'kids-dino-footprint-art'];

const screenSpecs = {
  'japan-esim-setup': {
    publicSlug: 'travel-esim-preflight-setup',
    heroLabel: '여행/통신',
    primaryArtifact: '출국 전 체크리스트',
    primaryAction: '출국 전 설정 저장',
    setupFields: [
      ['출국일', '2026-07-18'],
      ['사용 기기', 'iPhone'],
      ['알림', 'D-3 오전 9시'],
    ],
    firstViewportNote: '출국일과 기기만 입력하면 QR 등록, 레이블 지정, 도착 후 로밍 ON 체크가 생깁니다.',
    artifactTitle: '일본 eSIM 출국 전 설정',
    artifactSubtitle: 'D-3부터 도착 후까지 4개 체크',
    calendar: [
      ['D-3', 'eSIM 지원 기기 확인'],
      ['D-2', '상품 구매 후 QR/코드 보관'],
      ['D-1', 'eSIM 추가 후 여행용 레이블 지정'],
      ['도착 후', '데이터 로밍 ON, LTE 확인'],
    ],
    detailTitle: 'D-1 eSIM 추가 후 여행용 레이블 지정',
    detailMemo:
      'QR을 스캔해 eSIM을 추가하고, 셀룰러 요금제 레이블을 여행용으로 지정합니다. 데이터 로밍 ON, APN, 재부팅, 비행기 모드 재시도는 문제 해결 메모에 둡니다.',
    descriptionLinks: ['원문 후기', 'Holafly 가이드', 'WOWPASS 공식 가이드'],
    uxDecision: '앱 설정 절차는 체크리스트가 맞고, APN/문제 해결은 description 메모가 맞다.',
  },
  'banana-peanut-recipe-video': {
    publicSlug: 'banana-peanut-airfryer-bread',
    heroLabel: '요리/레시피',
    primaryArtifact: '요리 체크리스트',
    primaryAction: '요리 일정으로 저장',
    setupFields: [
      ['요리 날짜', '이번 토요일'],
      ['분량', '3인분'],
      ['알림', '장보기 전날'],
    ],
    firstViewportNote: '재료와 조리 단계만 저장하고, 영상/팁/가격 정보는 메모에 둡니다.',
    artifactTitle: '노밀가루 바나나 땅콩버터 빵',
    artifactSubtitle: '장보기 1개 + 조리 3단계',
    calendar: [
      ['장보기', '바나나 2개, 계란 3개, 땅콩버터 3큰술'],
      ['준비', '내열용기, 포크, 에어프라이어 준비'],
      ['조리', '재료 섞고 토핑 올리기'],
      ['완료', '180도 약 15분 굽기'],
    ],
    detailTitle: '재료 섞고 토핑 올리기',
    detailMemo:
      '각 용기에 바나나, 계란, 땅콩버터를 넣고 포크로 섞습니다. 초코칩은 선택입니다. 원본 영상과 Chef tip은 description 링크에 둡니다.',
    descriptionLinks: ['유튜브 원본 영상', '레시피오 원문', '장보기 메모'],
    uxDecision: '레시피는 반복 루틴보다 1회 실행 체크리스트가 맞다. 조리 기록이나 칼로리 기록은 기본 UX에서 제외한다.',
  },
  'kids-dino-footprint-art': {
    publicSlug: 'kids-dino-footprint-art-play',
    heroLabel: '육아/놀이',
    primaryArtifact: '주말 놀이 캘린더',
    primaryAction: '주말 놀이로 저장',
    setupFields: [
      ['놀이 날짜', '이번 일요일'],
      ['아이 연령', '3세 이상'],
      ['알림', '전날 오후 8시'],
    ],
    firstViewportNote: '놀이 날짜와 연령만 정하고, 도안/준비물/작가 링크는 메모에 보관합니다.',
    artifactTitle: '공룡 발자국 찍기 놀이',
    artifactSubtitle: '전날 준비 + 당일 놀이 + 정리',
    calendar: [
      ['전날', '도안 다운로드/인쇄'],
      ['시작 전', '물감, 뽁뽁이 또는 매직페이퍼 준비'],
      ['놀이', '발자국 찍기 활동'],
      ['마무리', '작품 말리기와 정리'],
    ],
    detailTitle: '도안 다운로드/인쇄',
    detailMemo:
      '공룡 발자국 도안을 인쇄하고 물감이 튈 수 있는 공간을 준비합니다. 작품 사진, 아이 반응, 인스타 태그는 선택 메모입니다.',
    descriptionLinks: ['도안 원문', '준비물 사진', '작가 인스타그램'],
    uxDecision: '육아 놀이는 발달 기록 앱이 아니라, 놀이를 실행하기 위한 가벼운 캘린더/준비물 체크가 맞다.',
  },
};

const candidates = pickedIds.map((id) => {
  const review = sourceReview.candidates.find((candidate) => candidate.id === id);
  if (!review) throw new Error(`Missing diversified candidate: ${id}`);
  return {
    ...review,
    screen: screenSpecs[id],
  };
});

const output = {
  generatedAt: '2026-06-07',
  purpose:
    '새 카테고리 대표 후보를 실제 서비스형 UI에 가깝게 확인하기 위한 정적 프리뷰. 런타임 route 추가 전 UX 방향 확인용이다.',
  inputCeiling: 'ICS/삼성 캘린더/리마인더 수준의 입력만 허용한다.',
  candidates,
};

fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const sourceLinks = (candidate) =>
  [candidate.sourceUrl, ...candidate.supportUrls]
    .map((url, index) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${index === 0 ? '원문 열기' : `보조 출처 ${index}`}</a>`)
    .join('');

const setupFieldMarkup = (candidate) =>
  candidate.screen.setupFields
    .map(([label, value]) => `<div class="field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join('');

const artifactRows = (candidate) =>
  candidate.screen.calendar
    .map(
      ([time, title]) => `<li>
        <span>${escapeHtml(time)}</span>
        <strong>${escapeHtml(title)}</strong>
      </li>`,
    )
    .join('');

const cards = candidates
  .map(
    (candidate, index) => `<article class="flow-card" id="${escapeHtml(candidate.id)}">
      <section class="source">
        <div>
          <span class="rank">#${index + 1}</span>
          <span class="category">${escapeHtml(candidate.screen.heroLabel)}</span>
          <span class="score">적합 ${candidate.weightedScore.toFixed(2)}</span>
          <h2>${escapeHtml(candidate.title)}</h2>
          <p>${escapeHtml(candidate.sourceEvidence)}</p>
          <div class="links">${sourceLinks(candidate)}</div>
        </div>
        <aside>
          <strong>${escapeHtml(candidate.destination)}</strong>
          <p>${escapeHtml(candidate.screen.uxDecision)}</p>
        </aside>
      </section>
      <section class="service">
        <div class="phone">
          <div class="phone-hero">
            <span>${escapeHtml(candidate.screen.primaryArtifact)}</span>
            <h3>${escapeHtml(candidate.screen.artifactTitle)}</h3>
            <p>${escapeHtml(candidate.screen.firstViewportNote)}</p>
            <button>${escapeHtml(candidate.screen.primaryAction)}</button>
          </div>
          <div class="setup">
            <h4>저장 설정</h4>
            ${setupFieldMarkup(candidate)}
          </div>
          <div class="artifact">
            <div class="artifact-title">
              <span>${escapeHtml(candidate.screen.artifactSubtitle)}</span>
              <strong>${escapeHtml(candidate.screen.primaryArtifact)}</strong>
            </div>
            <ol>${artifactRows(candidate)}</ol>
          </div>
          <div class="detail">
            <h4>${escapeHtml(candidate.screen.detailTitle)}</h4>
            <p>${escapeHtml(candidate.screen.detailMemo)}</p>
            <div class="chips">${candidate.screen.descriptionLinks.map((link) => `<span>${escapeHtml(link)}</span>`).join('')}</div>
          </div>
        </div>
        <div class="review">
          <h3>검토 포인트</h3>
          <ul>
            <li>사용자 입력이 ${escapeHtml(candidate.inputs.join(', '))} 수준에서 끝나는가?</li>
            <li>방법/팁/링크가 별도 폼이 아니라 description에 들어가도 충분한가?</li>
            <li>원문을 보고 이 실행 산출물이 자연스럽다고 느끼는가?</li>
            <li>기존 가전/결혼/중고차와 다른 카테고리 대표성이 있는가?</li>
          </ul>
        </div>
      </section>
    </article>`,
  )
  .join('\n');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>신규 대표 Flow 서비스형 UI 프리뷰</title>
  <style>
    :root {
      --bg: #f6f7f9;
      --paper: #fff;
      --ink: #172033;
      --muted: #667085;
      --line: #d8dee8;
      --blue: #2563eb;
      --green: #0f766e;
      --dark: #111827;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif; }
    a { color: var(--blue); text-decoration: none; }
    .wrap { max-width: 1220px; margin: 0 auto; padding: 30px 18px 72px; }
    .hero { background: var(--dark); color: white; border-radius: 8px; padding: 28px; }
    .hero h1 { margin: 0 0 10px; font-size: clamp(28px, 4vw, 44px); letter-spacing: 0; }
    .hero p { margin: 0; color: #d1d5db; line-height: 1.65; max-width: 900px; }
    .nav { position: sticky; top: 0; z-index: 2; display: flex; gap: 10px; overflow-x: auto; padding: 12px 0; background: rgba(246,247,249,.94); backdrop-filter: blur(8px); }
    .nav a { flex: 0 0 auto; color: var(--ink); background: white; border: 1px solid var(--line); border-radius: 999px; padding: 9px 12px; font-size: 14px; }
    .flow-card { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 18px; margin: 18px 0; }
    .source { display: grid; grid-template-columns: 1fr 320px; gap: 18px; border-bottom: 1px solid var(--line); padding-bottom: 16px; }
    .rank, .category, .score { display: inline-flex; padding: 5px 8px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-size: 12px; margin-right: 4px; }
    .category { background: #ecfeff; color: #155e75; }
    .score { background: #dcfce7; color: #166534; }
    h2 { margin: 8px 0 8px; font-size: 25px; letter-spacing: 0; }
    h3, h4 { margin: 0 0 8px; letter-spacing: 0; }
    p { margin: 0; color: var(--muted); line-height: 1.58; }
    .links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .links a { border: 1px solid var(--line); border-radius: 999px; padding: 7px 10px; background: #fbfcfe; }
    aside { border: 1px solid var(--line); border-radius: 8px; background: #fbfcfe; padding: 14px; }
    aside strong { display: block; margin-bottom: 8px; }
    .service { display: grid; grid-template-columns: 440px 1fr; gap: 18px; margin-top: 16px; align-items: start; }
    .phone { border: 1px solid #cbd5e1; background: #f9fafb; border-radius: 24px; padding: 12px; box-shadow: 0 18px 38px rgba(15,23,42,.12); }
    .phone-hero { background: var(--dark); color: white; border-radius: 18px; padding: 18px; }
    .phone-hero span { color: #cbd5e1; font-size: 12px; }
    .phone-hero h3 { font-size: 23px; margin: 7px 0; }
    .phone-hero p { color: #d1d5db; }
    button { margin-top: 14px; width: 100%; border: 0; border-radius: 10px; background: var(--blue); color: white; padding: 12px 14px; font: inherit; font-weight: 700; }
    .setup, .artifact, .detail, .review { background: white; border: 1px solid var(--line); border-radius: 14px; padding: 14px; margin-top: 10px; }
    .field { display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid #edf1f6; padding: 9px 0; }
    .field:first-of-type { border-top: 0; }
    .field span { color: var(--muted); font-size: 13px; }
    .field strong { font-size: 14px; }
    .artifact-title { display: flex; justify-content: space-between; gap: 10px; color: var(--muted); font-size: 13px; }
    .artifact-title strong { color: var(--ink); }
    ol { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 8px; }
    li { border: 1px solid #edf1f6; border-radius: 10px; padding: 10px; }
    li span { display: block; color: var(--green); font-size: 12px; margin-bottom: 4px; }
    li strong { font-size: 14px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .chips span { border-radius: 999px; background: #eef2ff; color: #3730a3; padding: 6px 8px; font-size: 12px; }
    .review { margin-top: 0; }
    .review ul { margin: 8px 0 0; padding-left: 18px; color: var(--muted); line-height: 1.7; }
    @media (max-width: 900px) {
      .source, .service { grid-template-columns: 1fr; }
      .phone { width: 100%; border-radius: 8px; box-shadow: none; }
      .review { margin-top: 10px; }
    }
    @media (max-width: 620px) {
      .wrap { padding: 18px 10px 48px; }
      .hero, .flow-card { padding: 16px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <h1>신규 대표 Flow 서비스형 UI 프리뷰</h1>
      <p>기존 가전/결혼/중고차 후보 외에, eSIM 설정, 유튜브 기반 레시피, 엄마표 놀이가 FlowMe에 어떻게 담기는지 확인하기 위한 정적 서비스 프리뷰입니다. 입력은 캘린더/리마인더 수준으로 제한하고, 방법/링크/팁은 description 메모에 둡니다.</p>
    </section>
    <nav class="nav" aria-label="프리뷰 바로가기">
      ${candidates.map((candidate, index) => `<a href="#${escapeHtml(candidate.id)}">${index + 1}. ${escapeHtml(candidate.title)}</a>`).join('')}
    </nav>
    ${cards}
  </main>
</body>
</html>`;

fs.writeFileSync(htmlPath, html, 'utf8');

console.log(`Wrote ${path.relative(root, jsonPath)}`);
console.log(`Wrote ${path.relative(root, htmlPath)}`);
