import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const weightedPath = path.join(
  root,
  'docs/content-audit/original-source-review/2026-06-07-weighted-korean-source-flow-candidates.json',
);
const jsonPath = path.join(
  root,
  'docs/content-audit/original-source-review/2026-06-07-top-service-flow-ui-candidates.json',
);
const htmlPath = path.join(root, 'docs/content-audit/2026-06-07-top-service-flow-ui-candidates.html');

const routeMap = {
  'washer-tub-clean-monthly': '/f/washer-tub-clean-monthly',
  'lg-aircon-filter-biweekly': null,
  'water-purifier-filter-cycle': '/f/water-purifier-filter-cycle',
  'monstera-care-routine': '/f/monstera-care-routine',
  'wedding-12-month-timeline': '/f/wedding-d180-basic',
  'used-car-buying-check': '/f/used-car-buying-check',
  'moving-d30-checklist': '/f/moving-d30-basic',
};

const uiDecisions = {
  'washer-tub-clean-monthly': {
    screen: '반복 일정 + 날짜 안 체크리스트',
    saveCta: '월간 루틴으로 저장',
    firstScreen: '첫 청소일과 반복 주기만 받고, 청소 방법은 메모에 둔다.',
    serviceGap: '현재 route 있음. 세탁기 모델/준비물은 추가 입력이 아니라 메모 cue로 유지.',
  },
  'lg-aircon-filter-biweekly': {
    screen: '2주 청소 루틴 + 6개월 교체 보조 알림',
    saveCta: '필터 청소 일정 저장',
    firstScreen: '첫 청소일, 에어컨 타입 정도만 받고 2주/6개월 주기를 분리해서 보여준다.',
    serviceGap: '신규 public route 필요. LG 공식 문서 조회수와 주기표가 강한 근거.',
  },
  'water-purifier-filter-cycle': {
    screen: '필터 주기표',
    saveCta: '필터 주기표 작성',
    firstScreen: '필터명/주기/마지막 교체일/다음 확인일 표가 먼저 보여야 한다.',
    serviceGap: '현재 route 있음. 체크리스트처럼 보이지 않게 sheet-first 문구 유지.',
  },
  'monstera-care-routine': {
    screen: '물주기 확인 일정 + 보류/관찰 결과',
    saveCta: '식물 루틴으로 저장',
    firstScreen: '마지막 물준 날을 받고, 날짜를 열면 흙/배수/잎 상태 체크가 보인다.',
    serviceGap: '현재 route 있음. “오늘은 보류”를 실패가 아니라 정상 결과로 계속 노출.',
  },
  'wedding-12-month-timeline': {
    screen: 'D-day 타임라인 캘린더',
    saveCta: '예식일 기준 일정 저장',
    firstScreen: '예식일만 입력하면 D-300부터 D-day까지 월별 준비 일정이 생긴다.',
    serviceGap: '현재 route 있음. 모바일에서는 전체 일정과 선택 날짜 상세를 분리.',
  },
  'used-car-buying-check': {
    screen: '현장 체크리스트 + 최종 판단',
    saveCta: '현장 체크 시작',
    firstScreen: '날짜 입력 없이 바로 체크리스트를 열고, 마지막에 구매/보류/거절만 남긴다.',
    serviceGap: '현재 route 있음. 사진/증빙을 기본 흐름으로 올리지 않는다.',
  },
  'moving-d30-checklist': {
    screen: '이사일 기준 타임라인 + 체크리스트',
    saveCta: '이사일 기준 저장',
    firstScreen: '이사일을 입력하면 업체/청소/인터넷/전입신고 일정이 날짜별로 생긴다.',
    serviceGap: '기존 moving-d30-basic route와 연결. D-day 텍스트는 캘린더 안에서 과하지 않게.',
  },
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const weighted = JSON.parse(fs.readFileSync(weightedPath, 'utf8'));
const top = weighted.candidates
  .filter((candidate) => candidate.decision === '합격')
  .map((candidate) => ({
    ...candidate,
    route: routeMap[candidate.id] ?? null,
    uiDecision: uiDecisions[candidate.id],
  }));

const output = {
  generatedAt: '2026-06-07',
  purpose:
    '합격한 한국어 외부 콘텐츠 후보를 실제 서비스형 Flow UI 후보로 검토하기 위한 산출물. 원문에서 어떤 단서가 저장 설정과 실행 산출물로 옮겨지는지 확인한다.',
  criteria: {
    inputCeiling: 'ICS, 삼성/애플 캘린더, 리마인더 수준의 입력 복잡도',
    primaryArtifacts: ['캘린더', '체크리스트', '시트', '메모'],
    detailPolicy: '방법, 준비물, 구매 링크, 주의, 원문 링크는 기본적으로 description/메모/첨부/링크로 보낸다.',
  },
  candidates: top,
};

fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

const setupRows = (candidate) => {
  const inputs = candidate.inputs?.length ? candidate.inputs : [candidate.selection.primaryInput];
  return inputs.slice(0, 3).map((input) => `<div><span>${escapeHtml(input)}</span><strong>사용자 입력</strong></div>`).join('');
};

const artifactRows = (candidate) =>
  candidate.flowItems
    .slice(0, candidate.id === 'used-car-buying-check' || candidate.id.includes('wedding') ? 6 : 4)
    .map(
      (item) => `<li>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.schedule)}</span>
        <p>${escapeHtml(item.memo)}</p>
      </li>`,
    )
    .join('');

const cards = top
  .map((candidate, index) => {
    const routeLabel = candidate.route
      ? `<a class="route-link" href="${candidate.route}">서비스 route 열기</a>`
      : `<span class="route-missing">신규 route 필요</span>`;
    return `<article class="candidate" id="${escapeHtml(candidate.id)}">
      <header>
        <div>
          <span class="rank">#${index + 1}</span>
          <span class="category">${escapeHtml(candidate.category)}</span>
          <span class="score">적합 ${candidate.weightedScore.toFixed(2)}</span>
          <h2>${escapeHtml(candidate.title)}</h2>
          <p>${escapeHtml(candidate.selection.selectionReason)}</p>
        </div>
        ${routeLabel}
      </header>
      <div class="screen-grid">
        <section class="source-panel">
          <h3>원문에서 보이는 실행 단서</h3>
          <a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(candidate.sourceTitle)}</a>
          <p>${escapeHtml(candidate.selection.originalCue)}</p>
          <small>${escapeHtml(candidate.selection.reactionEvidence)}</small>
        </section>
        <section class="phone">
          <div class="phone-top">
            <span>${escapeHtml(candidate.uiDecision.screen)}</span>
            <strong>${escapeHtml(candidate.title)}</strong>
          </div>
          <div class="save-box">
            <h3>${escapeHtml(candidate.uiDecision.saveCta)}</h3>
            <p>${escapeHtml(candidate.uiDecision.firstScreen)}</p>
            <div class="input-list">${setupRows(candidate)}</div>
          </div>
          <div class="artifact-box">
            <div class="artifact-head">
              <span>${escapeHtml(candidate.selection.artifact)}</span>
              <strong>${escapeHtml(candidate.selection.primaryInput)}</strong>
            </div>
            <ol>${artifactRows(candidate)}</ol>
          </div>
          <div class="memo-box">
            <strong>메모/description</strong>
            <p>${escapeHtml(candidate.memo)}</p>
          </div>
        </section>
        <section class="review-panel">
          <h3>UI 판단</h3>
          <p>${escapeHtml(candidate.uiDecision.serviceGap)}</p>
          <h3>검토 질문</h3>
          <ul>
            <li>원문을 본 뒤 이 저장 화면이 자연스러운가?</li>
            <li>입력값이 캘린더/리마인더 수준을 넘지 않는가?</li>
            <li>날짜나 체크 항목을 열었을 때 원문 핵심 단서가 보이는가?</li>
            <li>방법/링크/준비물이 메모에 들어가도 충분한가?</li>
          </ul>
        </section>
      </div>
    </article>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>상위 Flow 콘텐츠 서비스형 UI 후보</title>
  <style>
    :root {
      --bg: #f5f6f8;
      --paper: #fff;
      --ink: #172033;
      --muted: #667085;
      --line: #d8dee8;
      --blue: #2563eb;
      --green: #0f766e;
      --amber: #b45309;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif; }
    a { color: var(--blue); text-decoration: none; }
    .wrap { max-width: 1240px; margin: 0 auto; padding: 30px 18px 72px; }
    .hero { display: grid; grid-template-columns: 1.2fr .8fr; gap: 20px; align-items: end; background: #111827; color: white; border-radius: 8px; padding: 28px; }
    .hero h1 { margin: 0 0 10px; font-size: clamp(28px, 4vw, 44px); letter-spacing: 0; }
    .hero p { margin: 0; color: #d1d5db; line-height: 1.65; }
    .hero aside { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18); border-radius: 8px; padding: 16px; }
    .hero aside strong { display: block; font-size: 24px; margin-bottom: 4px; }
    .nav { position: sticky; top: 0; z-index: 2; display: flex; gap: 10px; overflow-x: auto; padding: 12px 0; background: rgba(245,246,248,.94); backdrop-filter: blur(8px); }
    .nav a { flex: 0 0 auto; border: 1px solid var(--line); background: var(--paper); color: var(--ink); border-radius: 999px; padding: 9px 12px; font-size: 14px; }
    .candidate { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 18px; margin: 18px 0; }
    .candidate header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--line); padding-bottom: 14px; }
    .candidate h2 { margin: 8px 0 6px; font-size: 24px; letter-spacing: 0; }
    .candidate p { margin: 0; color: var(--muted); line-height: 1.55; }
    .rank, .category, .score { display: inline-flex; padding: 5px 8px; border-radius: 999px; font-size: 12px; margin-right: 4px; background: #eef2ff; color: #3730a3; }
    .category { background: #ecfeff; color: #155e75; }
    .score { background: #dcfce7; color: #166534; }
    .route-link, .route-missing { align-self: start; white-space: nowrap; border-radius: 8px; padding: 10px 12px; font-weight: 700; font-size: 14px; }
    .route-link { background: var(--blue); color: #fff; }
    .route-missing { background: #fef3c7; color: #92400e; }
    .screen-grid { display: grid; grid-template-columns: .9fr 1.05fr .8fr; gap: 14px; margin-top: 16px; }
    .source-panel, .review-panel { border: 1px solid var(--line); background: #fbfcfe; border-radius: 8px; padding: 14px; }
    h3 { margin: 0 0 9px; font-size: 15px; }
    .source-panel p, .review-panel p { margin-top: 10px; }
    .source-panel small { display: block; margin-top: 12px; color: var(--muted); line-height: 1.5; }
    .review-panel ul { margin: 8px 0 0; padding-left: 18px; color: var(--muted); line-height: 1.6; }
    .phone { max-width: 420px; width: 100%; margin: 0 auto; border: 1px solid #cbd5e1; background: #f9fafb; border-radius: 22px; padding: 12px; box-shadow: 0 18px 38px rgba(15,23,42,.12); }
    .phone-top { background: #111827; color: white; border-radius: 16px; padding: 16px; }
    .phone-top span { display: block; color: #cbd5e1; font-size: 12px; margin-bottom: 6px; }
    .phone-top strong { display: block; font-size: 20px; line-height: 1.25; }
    .save-box, .artifact-box, .memo-box { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px; margin-top: 10px; }
    .save-box h3 { color: var(--blue); }
    .input-list { display: grid; gap: 8px; margin-top: 12px; }
    .input-list div { display: flex; justify-content: space-between; gap: 10px; border: 1px solid #edf1f6; border-radius: 10px; padding: 9px; }
    .input-list span { color: var(--ink); font-weight: 700; }
    .input-list strong { color: var(--muted); font-size: 12px; }
    .artifact-head { display: flex; justify-content: space-between; gap: 10px; color: var(--muted); font-size: 13px; }
    .artifact-head strong { color: var(--ink); }
    ol { margin: 10px 0 0; padding-left: 0; list-style: none; display: grid; gap: 8px; }
    ol li { border-top: 1px solid #edf1f6; padding-top: 9px; }
    ol strong { display: block; font-size: 14px; }
    ol span { display: inline-block; color: var(--green); font-size: 12px; margin: 3px 0; }
    ol p, .memo-box p { font-size: 13px; }
    @media (max-width: 980px) {
      .hero, .screen-grid { grid-template-columns: 1fr; }
      .candidate header { display: block; }
      .route-link, .route-missing { display: inline-flex; margin-top: 12px; }
      .phone { max-width: none; border-radius: 8px; box-shadow: none; }
    }
    @media (max-width: 620px) {
      .wrap { padding: 18px 10px 48px; }
      .hero { padding: 20px; }
      .candidate { padding: 14px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <div>
        <h1>상위 Flow 콘텐츠 서비스형 UI 후보</h1>
        <p>가중 선별에서 합격한 7개 후보를 실제 서비스 화면에 가까운 구조로 다시 봅니다. 핵심은 원문을 읽은 사용자가 저장 설정과 실행 산출물을 보고 바로 “내 캘린더/체크/시트/메모에 이렇게 들어가겠네”라고 이해할 수 있는지입니다.</p>
      </div>
      <aside>
        <strong>${top.length}개</strong>
        <span>합격 후보만 표시. 방법/준비물/링크는 입력이 아니라 description/메모에 둡니다.</span>
      </aside>
    </section>
    <nav class="nav" aria-label="후보 바로가기">
      ${top.map((candidate, index) => `<a href="#${escapeHtml(candidate.id)}">${index + 1}. ${escapeHtml(candidate.title)}</a>`).join('')}
    </nav>
    ${cards}
  </main>
</body>
</html>
`;

fs.writeFileSync(htmlPath, html, 'utf8');
console.log(`Wrote ${path.relative(root, jsonPath)}`);
console.log(`Wrote ${path.relative(root, htmlPath)}`);
