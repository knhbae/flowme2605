import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SPEC_DIR, '..', '..', '..');
const OUTPUT = path.join(
  REPO_ROOT,
  'docs',
  'content-audit',
  '2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-review-ko.html',
);

const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(SPEC_DIR, name), 'utf8'));
const creatorData = JSON.parse(
  fs.readFileSync(
    path.join(
      REPO_ROOT,
      'docs',
      'content-audit',
      '2026-07-23-creator-flow-portfolio-data-v1.json',
    ),
    'utf8',
  ),
);
const current = read('runs/current-canonical/results-v1.json').records;
const shared = read('runs/item-shared-context/results-v1.json').records;
const literal = read('runs/literal-ics-first/results-v1.json').records;
const categoryFit = read('category-fit-matrix-v1.json').records;
const scorecard = read('architecture-scorecard-v1.json');
const roundTrip = read('round-trip-results-v1.json').records;
const boundaries = read('creator-boundary-controls-v1.json').cases;
const expansion = read('creator-expansion-selection-v1.json');
const finalDecision = read('final-adjudication-v1.json');
const validation = read('validation-results-v1.json');
const creatorById = new Map(
  creatorData.creatorPortfolioRecords.map((record) => [record.creatorId, record]),
);
const exampleByBundle = new Map(
  creatorData.representativeFlowExamples.map((example) => [
    example.userContentBundle.bundleId,
    example,
  ]),
);

const labels = {
  home_living: '집·살림',
  family_parenting: '가족·육아',
  study_reading: '공부·독서',
  money_admin_purchase: '돈·행정·구매',
  health_fitness: '건강·운동',
  travel_outings: '여행·외출',
  meals_grocery: '식사·장보기',
  work_career: '일·커리어',
  hobby_pet: '취미·반려',
  ordered: '순서형 Map',
  source_curation: '제작자 큐레이션',
  unordered_collection: '순서 없는 컬렉션',
  single_sensitive_schedule: '민감 일정 1건',
  single_flow: '단일 Flow',
};

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function flattenItems(record) {
  return record.flows.flatMap((flow) =>
    flow.steps.flatMap((step) =>
      step.items.map((item) => ({
        ...item,
        flowTitle: flow.title,
        stepTitle: step.title,
      })),
    ),
  );
}

function sourceImage(creatorId) {
  return `2026-07-23-creator-flow-portfolio-assets/creator-${creatorId}-source.png`;
}

function sourceUrl(example) {
  return example.userContentBundle.sourceUrls[0];
}

function architectureComparison(bundleId) {
  const canonical = current.find((record) => record.bundleId === bundleId);
  const literalRecord = literal.find((record) => record.bundleId === bundleId);
  const sharedRecord = shared.find((record) => record.bundleId === bundleId);
  const trip = roundTrip.find((record) => record.bundleId === bundleId);
  const items = flattenItems(canonical);
  const contexts = sharedRecord.sharedContexts.length;
  const scheduled = items.filter((item) => item.schedule).length;
  const vtodo = literalRecord.calendar.components.filter(
    (component) => component.kind === 'VTODO',
  ).length;
  const event = literalRecord.calendar.components.filter(
    (component) => component.kind === 'VEVENT',
  ).length;
  return `
    <div class="architecture-grid">
      <article class="arch arch-go">
        <div class="arch-top"><span>A</span><strong>Current canonical</strong><b>Go</b></div>
        <p><strong>${items.length} Item</strong>과 SourceRow를 직접 보존합니다. 일정 없는 Item은 Calendar 밖에 남습니다.</p>
        <dl><div><dt>Calendar</dt><dd>${trip.projectionIcs.compactComponents} compact / ${trip.projectionIcs.granularComponents} granular</dd></div><div><dt>의미 round-trip</dt><dd>100%</dd></div></dl>
      </article>
      <article class="arch arch-hold">
        <div class="arch-top"><span>B</span><strong>Literal ICS-first</strong><b>Hold</b></div>
        <p><strong>${event} VEVENT · ${vtodo} VTODO</strong>. 일정 직렬화는 되지만 완료·계층·출처는 비표준/미보장 metadata에 의존합니다.</p>
        <dl><div><dt>외부 client</dt><dd>not run</dd></div><div><dt>관계 보존</dt><dd>not proven</dd></div></dl>
      </article>
      <article class="arch arch-modify">
        <div class="arch-top"><span>C</span><strong>Item + SharedContext</strong><b>Modify</b></div>
        <p><strong>${contexts} context</strong>를 만들 수 있지만 기존 setup field가 날짜를 이미 한 번만 받습니다.</p>
        <dl><div><dt>일정 Item</dt><dd>${scheduled}</dd></div><div><dt>추가 사용자 이득</dt><dd>${contexts > 1 ? '부분적' : '근거 부족'}</dd></div></dl>
      </article>
    </div>`;
}

function itemPreview(record, limit = 5) {
  const items = flattenItems(record);
  return `
    <ol class="item-list">
      ${items
        .slice(0, limit)
        .map(
          (item) => `<li>
            <span class="check">✓</span>
            <div><strong>${esc(item.title)}</strong><small>${esc(item.stepTitle)} · ${item.schedule ? '일정 근거 있음' : '날짜 없음'}</small></div>
          </li>`,
        )
        .join('')}
    </ol>
    ${items.length > limit ? `<p class="more">외 ${items.length - limit}개 Item · 전체 데이터는 JSON/fixture에서 확인</p>` : ''}`;
}

function sourceRowsPreview(example, limit = 4) {
  return `<div class="source-rows">${example.sourceRows
    .slice(0, limit)
    .map(
      (row) => `<div><span>${esc(row.sourceRowId)}</span><p><strong>${esc(row.label)}</strong>${row.detail && row.detail !== row.label ? `<br>${esc(row.detail)}` : ''}</p></div>`,
    )
    .join('')}</div>`;
}

function contentCard(fit, expanded = false) {
  const example = exampleByBundle.get(fit.bundleId);
  const record = current.find((candidate) => candidate.bundleId === fit.bundleId);
  const creator = creatorById.get(fit.creatorId);
  const setup = example.userContentBundle.setupFields;
  const verdict = fit.mapType === 'single_sensitive_schedule' ? 'Modify' : 'Go';
  return `<article class="content-card ${expanded ? 'featured' : ''}" data-content-card data-category="${fit.lifeArea}" data-map="${fit.mapType}" data-calendar="${fit.naturalCalendarPolicy}" data-verdict="${verdict}">
    <header class="content-head">
      <div>
        <span class="eyebrow">${labels[fit.lifeArea]} · ${labels[fit.mapType] ?? fit.mapType}</span>
        <h3>${esc(fit.title)}</h3>
        <p>${esc(record.userJob)}</p>
      </div>
      <div class="verdict ${verdict.toLowerCase()}">${verdict}</div>
    </header>
    <div class="content-layout">
      <figure class="source-shot">
        <a href="${esc(sourceUrl(example))}" target="_blank" rel="noreferrer"><img src="${sourceImage(fit.creatorId)}" alt="${esc(creator.name)} 원문 근거 화면" loading="lazy"></a>
        <figcaption><strong>${esc(creator.name)}</strong><span>${esc(creator.decisionBand)} · ${esc(creator.verdict)}</span></figcaption>
      </figure>
      <section>
        <div class="facts">
          <div><span>Map</span><strong>${labels[fit.mapType] ?? fit.mapType}</strong></div>
          <div><span>원문 단위</span><strong>${esc(fit.sourceShape)}</strong></div>
          <div><span>기본 결과물</span><strong>${esc(fit.primaryArtifact)}</strong></div>
          <div><span>필요 입력</span><strong>${setup.length ? setup.map((field) => field.label).join(' · ') : '0개'}</strong></div>
        </div>
        <h4>사용자가 실제로 체크하는 Item</h4>
        ${itemPreview(record, expanded ? 6 : 4)}
      </section>
    </div>
    <details ${expanded ? 'open' : ''}>
      <summary>SourceRow와 세 구조 비교 보기</summary>
      <div class="detail-body">
        <h4>원문에서 확보한 행</h4>
        ${sourceRowsPreview(example)}
        ${architectureComparison(fit.bundleId)}
        <div class="projection-line">
          <span>Calendar: <b>${fit.naturalCalendarPolicy}</b></span>
          <span>Checklist: <b>${fit.secondaryArtifacts.includes('checklist') || fit.primaryArtifact === 'checklist' ? 'natural' : 'available'}</b></span>
          <span>Sheet: <b>${fit.secondaryArtifacts.includes('sheet') || fit.primaryArtifact === 'sheet' ? 'natural' : 'lossy'}</b></span>
          <span>Memo: <b>source/caution 보존</b></span>
        </div>
      </div>
    </details>
  </article>`;
}

const heroCases = [
  'bundle-moving-d30',
  'bundle-wtable-summer-banchan-five',
  'bundle-andstudio-job-prep-videos',
].map((bundleId) => categoryFit.find((record) => record.bundleId === bundleId));
const remaining = categoryFit.filter(
  (record) => !heroCases.some((hero) => hero.bundleId === record.bundleId),
);

const scoreRows = scorecard.records
  .map(
    (record) => `<tr><td><strong>${esc(record.architecture)}</strong><small>${esc(record.verdict)}</small></td><td><span class="score-bar"><i style="width:${record.total}%"></i></span><b>${record.total}</b></td><td>${esc(record.evidence)}</td></tr>`,
  )
  .join('');

const boundaryRows = boundaries
  .map(
    (record) => `<article class="boundary">
      <span>${esc(record.creatorReadiness.decisionBand)} → ${esc(record.expectedStop)}</span>
      <h4>${esc(record.creatorName)}</h4>
      <p>${esc(record.selectedSource.title)}</p>
      <strong>${esc(record.goldReason)}</strong>
    </article>`,
  )
  .join('');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FlowMe Item·Map Architecture & Creator Portfolio Fit</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22><rect width=%2264%22 height=%2264%22 rx=%2216%22 fill=%22%23102c22%22/><path d=%22M18 18h29v8H27v8h16v8H27v15h-9z%22 fill=%22%23d8f26a%22/></svg>">
  <style>
    :root{--ink:#14211c;--muted:#65736c;--line:#dce7df;--paper:#f5f8f3;--green:#1d6f4f;--lime:#d8f26a;--navy:#17352b;--amber:#b66a13;--red:#a8493e;--blue:#285da8;--white:#fff;--shadow:0 18px 50px rgba(20,42,32,.09)}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",Arial,sans-serif;line-height:1.55}a{color:inherit}.shell{width:min(1360px,calc(100% - 48px));margin:auto}.slide{min-height:760px;padding:64px 0;border-bottom:1px solid var(--line);display:flex;align-items:center}.slide>.shell{width:min(1360px,calc(100% - 48px))}.hero{min-height:900px;background:radial-gradient(circle at 85% 15%,rgba(216,242,106,.24),transparent 32%),linear-gradient(145deg,#102c22,#1b4435);color:white}.eyebrow{display:inline-block;color:#4f745f;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.hero .eyebrow{color:var(--lime)}h1{font-size:clamp(44px,6vw,82px);line-height:1.03;letter-spacing:-.055em;margin:20px 0;max-width:1100px}h2{font-size:clamp(34px,4.2vw,60px);line-height:1.08;letter-spacing:-.045em;margin:10px 0 18px}h3{font-size:26px;line-height:1.2;letter-spacing:-.025em;margin:7px 0}h4{font-size:16px;margin:22px 0 10px}.lead{max-width:880px;font-size:21px;color:#dbe9e1}.decision-banner{display:grid;grid-template-columns:1.4fr .6fr;gap:22px;margin-top:44px}.decision-copy{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:24px;padding:30px}.decision-copy strong{display:block;font-size:31px;color:var(--lime)}.decision-copy p{margin:8px 0 0;color:#d9e7df}.metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.metrics div{background:white;color:var(--ink);padding:18px;border-radius:18px}.metrics span{display:block;color:var(--muted);font-size:12px}.metrics strong{display:block;font-size:30px}.evidence-note{margin-top:24px;font-size:13px;color:#c9d8d0}.section-intro{max-width:880px;margin-bottom:36px}.section-intro p{color:var(--muted);font-size:18px}.hero-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.mini-case{background:white;border:1px solid var(--line);border-radius:22px;overflow:hidden;box-shadow:var(--shadow)}.mini-case img{width:100%;height:190px;object-fit:cover;display:block}.mini-case div{padding:20px}.mini-case span{font-size:12px;color:var(--green);font-weight:800}.mini-case h3{font-size:22px}.mini-case p{color:var(--muted);font-size:14px}.model-flow{display:grid;grid-template-columns:repeat(7,auto);align-items:center;gap:12px;margin:36px 0}.model-flow span{background:white;border:1px solid var(--line);padding:18px 20px;border-radius:16px;text-align:center;font-weight:800;box-shadow:var(--shadow)}.model-flow i{font-style:normal;color:var(--green);font-size:24px}.model-flow .projection{background:#e5f2e8}.score-table{width:100%;border-collapse:separate;border-spacing:0 10px}.score-table tr{background:white}.score-table td{padding:20px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.score-table td:first-child{border-left:1px solid var(--line);border-radius:16px 0 0 16px;width:240px}.score-table td:last-child{border-right:1px solid var(--line);border-radius:0 16px 16px 0;color:var(--muted)}.score-table small{display:block;color:var(--muted)}.score-table td:nth-child(2){width:300px}.score-bar{display:inline-block;width:210px;height:10px;background:#e5ebe7;border-radius:99px;margin-right:12px;vertical-align:middle;overflow:hidden}.score-bar i{display:block;height:100%;background:var(--green);border-radius:99px}.filter-shell{position:sticky;top:0;z-index:10;background:rgba(245,248,243,.94);backdrop-filter:blur(12px);border-bottom:1px solid var(--line);padding:12px 0}.filters{display:flex;gap:8px;overflow:auto}.filter{appearance:none;border:1px solid var(--line);background:white;border-radius:99px;padding:9px 14px;white-space:nowrap;font-weight:700;color:var(--ink);cursor:pointer}.filter[aria-pressed="true"]{background:var(--navy);color:white;border-color:var(--navy)}.content-stack{display:grid;gap:24px}.content-card{background:white;border:1px solid var(--line);border-radius:26px;padding:28px;box-shadow:var(--shadow)}.content-card[hidden]{display:none}.content-head{display:flex;justify-content:space-between;gap:24px}.content-head p{color:var(--muted);margin:8px 0;max-width:760px}.verdict{width:76px;height:42px;display:grid;place-items:center;border-radius:99px;font-weight:900}.verdict.go{background:#e1f4e9;color:var(--green)}.verdict.modify{background:#fff1d7;color:var(--amber)}.content-layout{display:grid;grid-template-columns:360px 1fr;gap:30px;margin-top:18px}.source-shot{margin:0;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#eef2ee}.source-shot img{width:100%;height:250px;object-fit:cover;display:block}.source-shot figcaption{display:flex;justify-content:space-between;padding:13px 15px;font-size:13px}.source-shot figcaption span{color:var(--muted)}.facts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.facts div{background:#f4f7f3;border-radius:13px;padding:12px}.facts span{display:block;color:var(--muted);font-size:11px}.facts strong{font-size:13px}.item-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}.item-list li{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #edf2ee}.item-list .check{width:24px;height:24px;display:grid;place-items:center;border-radius:7px;background:#e2f3e9;color:var(--green);font-weight:900}.item-list small{display:block;color:var(--muted)}.more{color:var(--muted);font-size:12px}.content-card details{border-top:1px solid var(--line);margin-top:22px;padding-top:18px}.content-card summary{cursor:pointer;font-weight:900;color:var(--green)}.detail-body{padding-top:20px}.source-rows{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.source-rows>div{display:grid;grid-template-columns:150px 1fr;gap:10px;background:#f6f8f5;border-radius:12px;padding:10px}.source-rows span{font-family:ui-monospace,Consolas,monospace;font-size:10px;color:var(--blue);word-break:break-all}.source-rows p{font-size:12px;margin:0}.architecture-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:22px}.arch{border:1px solid var(--line);border-radius:18px;padding:18px}.arch-top{display:flex;gap:9px;align-items:center}.arch-top span{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#eef2ef;font-weight:900}.arch-top strong{flex:1}.arch-top b{font-size:11px}.arch p{font-size:13px;color:var(--muted);min-height:82px}.arch dl{margin:0}.arch dl div{display:flex;justify-content:space-between;border-top:1px solid var(--line);padding:7px 0;font-size:11px}.arch dt{color:var(--muted)}.arch-go{border-color:#9dd2b4}.arch-hold{border-color:#e5b1ab}.arch-modify{border-color:#e5ca91}.projection-line{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.projection-line span{background:#eef3ef;border-radius:99px;padding:8px 11px;font-size:11px}.boundary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.boundary{background:white;border:1px solid var(--line);border-radius:18px;padding:18px}.boundary span{color:var(--red);font-size:11px;font-weight:900}.boundary h4{font-size:19px;margin:6px 0}.boundary p{font-size:12px;color:var(--muted);min-height:60px}.boundary strong{font-size:12px}.evidence-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.evidence-card{background:white;border:1px solid var(--line);border-radius:20px;padding:24px}.evidence-card strong{font-size:38px;display:block}.evidence-card span{color:var(--muted)}.footer{background:#102c22;color:white;padding:58px 0}.footer a{color:var(--lime)}.footer-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:30px}.footer ul{margin:0;padding-left:18px;color:#d6e3dc}.mono{font-family:ui-monospace,Consolas,monospace;font-size:12px}.hidden-count{padding:22px;text-align:center;color:var(--muted)}
    @media(max-width:900px){.slide{padding:46px 0;min-height:auto}.shell,.slide>.shell{width:min(100% - 28px,1360px)}.decision-banner,.content-layout,.footer-grid{grid-template-columns:1fr}.hero-grid,.architecture-grid,.boundary-grid,.evidence-grid{grid-template-columns:1fr 1fr}.content-layout{gap:18px}.source-shot img{height:280px}.facts{grid-template-columns:1fr 1fr}.model-flow{grid-template-columns:1fr;gap:5px}.model-flow i{transform:rotate(90deg);text-align:center}.score-table td:nth-child(2){width:220px}.score-bar{width:140px}}
    @media(max-width:600px){.hero{min-height:844px}.hero-grid,.architecture-grid,.boundary-grid,.evidence-grid,.source-rows{grid-template-columns:1fr}.metrics{grid-template-columns:1fr 1fr}h1{font-size:43px}.lead{font-size:17px}.content-card{padding:18px;border-radius:20px}.content-head{display:block}.verdict{margin-top:10px}.source-shot img{height:220px}.facts{grid-template-columns:1fr 1fr}.source-rows>div{grid-template-columns:1fr}.arch p{min-height:0}.score-table,.score-table tbody,.score-table tr,.score-table td{display:block}.score-table tr{margin-bottom:14px;border-radius:16px}.score-table td{border:0!important;width:auto!important}.score-bar{width:75%}.filter-shell{top:0}.footer-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <section class="slide hero">
    <div class="shell">
      <span class="eyebrow">2026-07-27 · source-backed architecture lab</span>
      <h1>ICS를 원본으로<br>삼지 않아도 된다</h1>
      <p class="lead">9개 카테고리의 실제 제작자 콘텐츠를 세 구조로 변환했습니다. 결론은 canonical Item을 유지하고, 같은 날짜의 여러 할 일은 <strong>내보낼 때만 묶는 것</strong>입니다.</p>
      <div class="decision-banner">
        <div class="decision-copy">
          <span>최종 권고</span>
          <strong>Canonical v1 유지 + projection-time grouping</strong>
          <p>SharedContext는 의미를 보존했지만 사용자 입력 감소 근거가 1개 콘텐츠뿐이라 canonical 채택을 보류했습니다.</p>
        </div>
        <div class="metrics">
          <div><span>카테고리</span><strong>9</strong></div>
          <div><span>실제 Item</span><strong>148</strong></div>
          <div><span>SourceRow</span><strong>198</strong></div>
          <div><span>자동 검증</span><strong>${validation.checkCount}</strong></div>
        </div>
      </div>
      <p class="evidence-note">내부 구조·parser·렌더 QA 결과입니다. 외부 Calendar 실제 import와 관찰 사용자 검증은 실행하지 않았습니다.</p>
    </div>
  </section>

  <section class="slide">
    <div class="shell">
      <div class="section-intro"><span class="eyebrow">첫 화면부터 실제 예시</span><h2>묶음은 같아도<br>시간 관계는 다르다</h2><p>이사에는 날짜 묶음이 필요하지만, 반찬 큐레이션과 취업 영상 컬렉션에 날짜나 필수 순서를 만들면 원문 의미가 바뀝니다.</p></div>
      <div class="hero-grid">
        ${heroCases
          .map((fit) => {
            const example = exampleByBundle.get(fit.bundleId);
            const creator = creatorById.get(fit.creatorId);
            return `<article class="mini-case"><img src="${sourceImage(fit.creatorId)}" alt="${esc(creator.name)} 원문"><div><span>${labels[fit.mapType]}</span><h3>${esc(fit.title)}</h3><p>${esc(current.find((record) => record.bundleId === fit.bundleId).userJob)}</p><strong>Calendar: ${fit.naturalCalendarPolicy}</strong></div></article>`;
          })
          .join('')}
      </div>
    </div>
  </section>

  <section class="slide">
    <div class="shell">
      <div class="section-intro"><span class="eyebrow">권고 데이터 구조</span><h2>Item은 원본,<br>ICS는 전달물</h2><p>Map과 Step은 의미를 묶고, 상태는 Item이 소유합니다. Calendar는 일정이 있는 effective Item만 선택적으로 직렬화합니다.</p></div>
      <div class="model-flow"><span>SourceRow<br><small>근거</small></span><i>→</i><span>Item<br><small>실행 상태</small></span><i>→</i><span>Step / Flow / Map<br><small>의미 그룹</small></span><i>→</i><span class="projection">Calendar · Checklist<br>Todo · Sheet · Memo</span></div>
      <table class="score-table"><tbody>${scoreRows}</tbody></table>
    </div>
  </section>

  <div class="filter-shell">
    <div class="shell filters" aria-label="콘텐츠 필터">
      <button class="filter" data-filter="all" aria-pressed="true">전체 9개</button>
      ${Object.entries(labels)
        .filter(([key]) => key.includes('_') && categoryFit.some((record) => record.lifeArea === key))
        .map(([key, label]) => `<button class="filter" data-filter="category:${key}" aria-pressed="false">${label}</button>`)
        .join('')}
      <button class="filter" data-filter="calendar:none" aria-pressed="false">ICS 불필요</button>
      <button class="filter" data-filter="map:ordered" aria-pressed="false">순서형</button>
      <button class="filter" data-filter="map:source_curation" aria-pressed="false">큐레이션</button>
      <button class="filter" data-filter="map:unordered_collection" aria-pressed="false">컬렉션</button>
    </div>
  </div>

  <section class="slide" style="align-items:flex-start">
    <div class="shell">
      <div class="section-intro"><span class="eyebrow">9개 category fit</span><h2>실제 콘텐츠에<br>세 구조를 적용한 결과</h2><p>각 카드에서 SourceRow, 실제 Item, 세 아키텍처, projection 손실을 연속해서 볼 수 있습니다.</p></div>
      <div class="content-stack" id="contentStack">
        ${heroCases.map((fit) => contentCard(fit, true)).join('')}
        ${remaining.map((fit) => contentCard(fit, false)).join('')}
      </div>
      <p class="hidden-count" id="hiddenCount" hidden>선택한 필터에 맞는 콘텐츠가 없습니다.</p>
    </div>
  </section>

  <section class="slide">
    <div class="shell">
      <div class="section-intro"><span class="eyebrow">정확히 멈추기</span><h2>좋은 제작자도<br>아직 Flow는 아닐 수 있다</h2><p>Go 제작자라도 SourceRow가 없으면 멈추고, Single 콘텐츠를 제작자 전체 Map으로 승격하지 않습니다.</p></div>
      <div class="boundary-grid">${boundaryRows}</div>
    </div>
  </section>

  <section class="slide">
    <div class="shell">
      <div class="section-intro"><span class="eyebrow">검증과 경계</span><h2>통과한 것과<br>아직 모르는 것</h2></div>
      <div class="evidence-grid">
        <article class="evidence-card"><span>Canonical semantic round-trip</span><strong>9 / 9</strong><p>Item ID, SourceRow, schedule 의미가 JSON 직렬화 후 동일합니다.</p></article>
        <article class="evidence-card"><span>잘못된 날짜 없는 VEVENT</span><strong>0</strong><p>날짜 없는 30 Item은 canonical Calendar에서 제외했습니다.</p></article>
        <article class="evidence-card"><span>Stop control</span><strong>${boundaries.length} / ${boundaries.length}</strong><p>Hold·Single·source import·provider 경계를 별도 상태로 유지합니다.</p></article>
        <article class="evidence-card"><span>Literal ICS syntax</span><strong>9 / 9</strong><p>자체 parser에서는 통과했지만 외부 client 의미 보존은 증명하지 못했습니다.</p></article>
        <article class="evidence-card"><span>External client round-trip</span><strong style="font-size:28px">NOT RUN</strong><p>Google·Outlook·Apple 계정에 데이터를 쓰지 않았습니다.</p></article>
        <article class="evidence-card"><span>Observed-user validation</span><strong style="font-size:28px">NOT RUN</strong><p>이 보고서는 내부 구조·사용성 walkthrough입니다.</p></article>
      </div>
    </div>
  </section>

  <footer class="footer">
    <div class="shell footer-grid">
      <div>
        <span class="eyebrow">다음 backend 목표</span>
        <h2>Canonical validator와<br>projection adapter 구현</h2>
        <p>이번 결과가 승인되면 runtime을 갈아엎지 않고 canonical DTO validator, projectionPolicy, compact/granular Calendar adapter부터 구현합니다.</p>
      </div>
      <div>
        <strong>이번에 하지 않은 것</strong>
        <ul><li>앱·DB·seed 변경</li><li>실제 Calendar import</li><li>콘텐츠 공개 승인</li><li>사용자 검증 주장</li><li>commit·push·deploy</li></ul>
        <p class="mono">Expansion ${expansion.count} · Decision ${finalDecision.decision}<br>Validator ${validation.passedCount}/${validation.checkCount}</p>
      </div>
    </div>
  </footer>
  <script>
    const buttons=[...document.querySelectorAll('[data-filter]')];
    const cards=[...document.querySelectorAll('[data-content-card]')];
    const empty=document.getElementById('hiddenCount');
    buttons.forEach(button=>button.addEventListener('click',()=>{
      buttons.forEach(candidate=>candidate.setAttribute('aria-pressed','false'));
      button.setAttribute('aria-pressed','true');
      const value=button.dataset.filter;
      let shown=0;
      cards.forEach(card=>{
        const visible=value==='all'||(() => {
          const [axis,expected]=value.split(':');
          return card.dataset[axis]===expected;
        })();
        card.hidden=!visible;
        if(visible) shown++;
      });
      empty.hidden=shown!==0;
    }));
  </script>
</body>
</html>`;

fs.writeFileSync(OUTPUT, html, 'utf8');
console.log(
  JSON.stringify(
    {
      output: OUTPUT,
      bytes: Buffer.byteLength(html),
      primaryCases: categoryFit.length,
      boundaryCases: boundaries.length,
      decision: finalDecision.decision,
    },
    null,
    2,
  ),
);
