import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
const auditRel = 'docs/content-audit/2026-07-19-url-to-flow-p0-ten-url-benchmark';
const auditDir = path.join(repoRoot, auditRel);

const read = (rel) => JSON.parse(fs.readFileSync(path.join(auditDir, rel), 'utf8'));
const summary = read('benchmark-summary.json');
const selected = read('selected-flows.json');
const validation = read('selected-validation.json');
const snapshots = read('source-snapshots.json');
const lower = read('model-runs/lower-cost.json');
const higher = read('model-runs/higher-capability.json');
const reviewerA = read('review-results/reviewer-a.json');
const reviewerB = read('review-results/reviewer-b.json');
const repairs = read('editorial-repairs/lower-cost-repaired.json');

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const attr = esc;
const fmt = new Intl.NumberFormat('ko-KR');
const pct = (value) => `${Math.round(value * 100)}%`;
const caseById = (id) => selected.cases.find((entry) => entry.caseId === id);
const snapshotById = (id) => snapshots.snapshots.find((entry) => entry.caseId === id);
const case02 = caseById('case-02');
const case06 = caseById('case-06');
const rawLower = summary.rawLanes.find((lane) => lane.lane === 'lower_cost');
const rawHigher = summary.rawLanes.find((lane) => lane.lane === 'higher_capability');

const labels = {
  lower_cost: '저비용 레인',
  higher_capability: '고성능 레인',
  compile_candidate: '컴파일 후보',
  draft_only: '초안 전용',
  reextract_required: '재추출 필요',
  sensitive_locked: '민감정보 잠금',
  human_review_required: '사람 검토 필요',
  rights_review_required: '권리 검토 필요',
  phase_lifecycle: '단계 생애주기',
  repeating_routine: '반복 루틴',
  ordered_procedure: '순서 절차',
  source_table_rows: '원문 표 행',
  compare_decide: '비교·결정',
  resource_queue: '리소스 큐',
  calendar: '캘린더',
  checklist: '체크리스트',
  memo: '메모',
  sheet: '표',
  todo: '할 일',
};
const label = (value) => labels[value] || value || '—';

const badge = (text, tone = 'neutral') => `<span class="badge ${tone}">${esc(text)}</span>`;
const code = (value) => `<pre><code>${esc(typeof value === 'string' ? value : JSON.stringify(value, null, 2))}</code></pre>`;
const evidenceCards = (candidate, limit = Infinity) => (candidate?.sourceEvidence || []).slice(0, limit).map((ev) => `
  <article class="evidence-card">
    <span class="eyebrow">${esc(ev.evidenceId)} · ${esc(ev.locator)}</span>
    <blockquote>“${esc(ev.text)}”</blockquote>
  </article>`).join('');
const itemRows = (candidate, limit = Infinity) => (candidate?.flow?.items || []).slice(0, limit).map((item, index) => `
  <li class="item-row">
    <span class="item-number">${String(index + 1).padStart(2, '0')}</span>
    <div><strong>${esc(item.title)}</strong><small>완료: ${esc(item.doneWhen)}</small></div>
  </li>`).join('');
const renderedCard = (name, body) => `<article class="artifact-card"><span class="eyebrow">${esc(label(name))}</span><pre>${esc(body)}</pre></article>`;

const commonCss = `
:root{--ink:#17212b;--muted:#62707d;--paper:#f4f1e9;--card:#fffdf8;--line:#d8d4c9;--navy:#123047;--teal:#087e72;--coral:#eb6a4a;--gold:#d29b35;--red:#b63d4a;--green:#2c7a59;--shadow:0 18px 60px rgba(27,40,48,.12);color-scheme:light}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;line-height:1.55}a{color:var(--teal);text-underline-offset:3px}button,a{touch-action:manipulation}.skip{position:fixed;left:1rem;top:-5rem;z-index:100;background:#fff;padding:.75rem 1rem;border-radius:.5rem}.skip:focus{top:1rem}.eyebrow{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;font-weight:800;color:var(--teal)}h1,h2,h3,p{margin-top:0}h1{font-size:clamp(2.35rem,6vw,5.6rem);line-height:1.02;letter-spacing:-.055em}h2{font-size:clamp(1.85rem,4.2vw,3.8rem);line-height:1.08;letter-spacing:-.045em}h3{font-size:1.05rem;letter-spacing:-.02em}.lede{font-size:clamp(1rem,1.6vw,1.35rem);color:var(--muted);max-width:70ch}.muted{color:var(--muted)}.tiny{font-size:.76rem}.badge{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:.28rem .62rem;font-size:.72rem;font-weight:800;background:#fff}.badge.good{background:#e8f4ee;color:var(--green);border-color:#b9d9c8}.badge.warn{background:#fff4de;color:#895a00;border-color:#efd39d}.badge.bad{background:#fbe9eb;color:var(--red);border-color:#e8bbc1}.badge.dark{background:var(--navy);color:#fff;border-color:var(--navy)}.cluster{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}.grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.8rem}.card,.evidence-card,.artifact-card{background:var(--card);border:1px solid var(--line);border-radius:1rem;padding:1rem;box-shadow:0 6px 20px rgba(27,40,48,.05)}.card strong.metric{display:block;font-size:clamp(2rem,4vw,4rem);line-height:1;color:var(--navy)}blockquote{margin:.55rem 0 0;font-weight:650;letter-spacing:-.018em}pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:.65rem 0 0;font:500 .82rem/1.6 ui-monospace,SFMono-Regular,Consolas,monospace}pre code{font:inherit}.item-list{list-style:none;padding:0;margin:0;display:grid;gap:.65rem}.item-row{display:grid;grid-template-columns:2.25rem 1fr;gap:.8rem;align-items:start;border:1px solid var(--line);background:var(--card);padding:.75rem;border-radius:.8rem}.item-number{display:grid;place-items:center;width:2.1rem;height:2.1rem;border-radius:.65rem;background:var(--navy);color:#fff;font-size:.72rem;font-weight:900}.item-row small{display:block;color:var(--muted);margin-top:.15rem}.artifact-card pre{font-family:inherit;font-size:.88rem}.kpi{border-top:4px solid var(--teal)}.kpi.coral{border-color:var(--coral)}.kpi.gold{border-color:var(--gold)}.kpi.red{border-color:var(--red)}table{width:100%;border-collapse:collapse;font-size:.82rem}th,td{text-align:left;padding:.55rem .45rem;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}.table-wrap{overflow-x:auto}.callout{border-left:5px solid var(--teal);padding:.9rem 1rem;background:#e9f5f2;border-radius:0 .8rem .8rem 0}.callout.warn{border-color:var(--gold);background:#fff4df}.callout.bad{border-color:var(--red);background:#fbeaec}.decision{font-size:clamp(1.3rem,3vw,2.45rem);font-weight:900;letter-spacing:-.04em}.flowline{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:.55rem;counter-reset:pipeline}.flowline .node{position:relative;background:var(--card);border:1px solid var(--line);padding:.9rem;border-radius:.8rem;min-height:8rem}.flowline .node:before{counter-increment:pipeline;content:counter(pipeline);display:grid;place-items:center;width:1.6rem;height:1.6rem;border-radius:50%;background:var(--teal);color:#fff;font-size:.7rem;font-weight:900;margin-bottom:.55rem}.flowline .node:not(:last-child):after{content:"→";position:absolute;right:-.48rem;top:50%;z-index:2;color:var(--coral);font-weight:900}.source-link{display:inline-block;width:100%;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.asset-links{display:flex;gap:.7rem;flex-wrap:wrap}.asset-links a{font-size:.78rem}.dot{width:.55rem;height:.55rem;border-radius:50%;display:inline-block;background:currentColor;margin-right:.35rem}.json-box{max-height:18rem;overflow:auto;background:#101e29;color:#d9f3ec;border-radius:.9rem;padding:.8rem}.json-box pre{margin:0}.repair{border-left:3px solid var(--coral);padding-left:.8rem;margin:.7rem 0}.repair small{display:block;color:var(--muted)}
.grid-2>*,.grid-3>*,.grid-4>*,.hero-strip>*,.case-head>*{min-width:0}
@media(max-width:800px){.grid-2,.grid-3,.grid-4{grid-template-columns:1fr}.flowline{grid-template-columns:1fr 1fr}.flowline .node:not(:last-child):after{display:none}h1{font-size:2.7rem}table{min-width:720px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}
`;

const slideTitles = [
  'URL이 실행물로 바뀌는 순간','원문에서 Item까지','Item 하나, 세 가지 투영','원문마다 구조가 다르다','10개 URL 결과표','0개가 정답인 경우','수정은 숨기지 않는다','선호와 정확성의 충돌','커버리지와 공개 경계','최소 단위는 Item','백엔드 파이프라인','비용은 아직 추정치다','세 가지 출시 결정','지금 만들 백엔드의 범위','다음 증거 목표'
];

const reportCss = `${commonCss}
body{overflow:hidden}.rail{position:fixed;z-index:20;left:0;top:0;bottom:0;width:5.5rem;background:var(--navy);display:flex;flex-direction:column;align-items:center;padding:.9rem .5rem;color:#fff}.brand{font-weight:950;letter-spacing:-.05em;margin-bottom:auto}.rail-nav{display:grid;gap:.26rem}.rail-nav button{border:0;background:transparent;color:#89a2b2;width:2.35rem;height:1.7rem;border-radius:.55rem;font:800 .68rem/1 inherit;cursor:pointer}.rail-nav button[aria-current="true"]{background:var(--coral);color:#fff}.rail-foot{margin-top:auto;font-size:.65rem;color:#9cb0bd;text-align:center}.deck{height:100vh;margin-left:5.5rem;overflow-y:auto;scroll-snap-type:y mandatory}.slide{min-height:100vh;scroll-snap-align:start;padding:clamp(2rem,5vw,5rem);display:grid;grid-template-rows:auto 1fr auto;gap:1.4rem;position:relative;background:radial-gradient(circle at 88% 8%,rgba(8,126,114,.09),transparent 27%),var(--paper)}.slide:nth-child(even){background:radial-gradient(circle at 9% 90%,rgba(235,106,74,.08),transparent 30%),#f8f6ef}.slide-head{display:flex;justify-content:space-between;gap:1rem;align-items:start}.slide-index{font-size:.78rem;font-weight:900;color:var(--coral);letter-spacing:.1em}.slide-body{align-self:center;width:100%;max-width:1400px}.slide-foot{display:flex;justify-content:space-between;gap:1rem;color:var(--muted);font-size:.72rem}.slide-foot a{color:inherit}.hero-strip{display:grid;grid-template-columns:1.1fr .9fr;gap:1rem}.hero-title{color:var(--navy)}.vs{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:1rem}.vs-mark{font-size:1.4rem;font-weight:950;color:var(--coral)}.status-table td:first-child{font-weight:800}.status-table tr.hold{background:#fff4df}.pattern-card{min-height:8.5rem}.pattern-card strong{display:block;margin:.35rem 0}.compare-bar{height:.7rem;border-radius:999px;background:#d9d5ca;overflow:hidden}.compare-bar span{display:block;height:100%;background:var(--teal)}.compare-bar.premium span{background:var(--coral)}
@media(max-width:900px){body{overflow:auto}.rail{left:0;right:0;bottom:auto;width:auto;height:3.6rem;flex-direction:row;padding:.5rem}.brand{margin:0 1rem 0 0}.rail-nav{display:flex;overflow-x:auto}.rail-foot{display:none}.deck{height:auto;margin:3.6rem 0 0;scroll-snap-type:y proximity}.slide{min-height:auto;padding:2rem 1rem}.hero-strip{grid-template-columns:1fr}.slide-foot{margin-top:1.5rem}.rail-nav button{flex:0 0 auto}}
@media print{body{overflow:visible;background:#fff}.rail{display:none}.deck{height:auto;margin:0;overflow:visible}.slide{height:190mm;min-height:190mm;break-after:page;page-break-after:always;padding:12mm;background:#fff!important}.slide:last-child{break-after:auto}.slide-foot{display:none}a{color:inherit;text-decoration:none}}
`;

const slide = (number, title, body, note = 'URL → Flow P0 · 10 URL benchmark · 2026-07-19') => `
<section class="slide" id="slide-${number}" aria-labelledby="slide-title-${number}">
  <header class="slide-head"><div><span class="eyebrow">URL → FLOW P0 BENCHMARK</span><h2 id="slide-title-${number}">${esc(title)}</h2></div><span class="slide-index">${String(number).padStart(2, '0')} / 15</span></header>
  <div class="slide-body">${body}</div>
  <footer class="slide-foot"><span>${esc(note)}</span><span><a href="case-gallery.html">10개 상세 보기</a> · <a href="benchmark-summary.json">근거 JSON</a></span></footer>
</section>`;

const case02Rendered = case02.candidate.renderedArtifacts;
const case02Items = case02.candidate.flow.items;
const case06Evidence = case06.candidate.sourceEvidence;
const caseRows = selected.cases.map((entry) => {
  const disposition = entry.candidate.decision.disposition;
  const hold = disposition === 'reextract_required';
  const rawL = entry.rawGate.lowerCost.passed;
  const rawH = entry.rawGate.higherCapability.passed;
  return `<tr class="${hold ? 'hold' : ''}"><td>${esc(entry.caseId)}</td><td><a href="case-gallery.html#${attr(entry.caseId)}">${esc(entry.title)}</a></td><td>${esc(label(entry.candidate.flow?.planningPattern))}</td><td>${hold ? badge('0개 · 재추출', 'warn') : badge(`${entry.candidate.flow.items.length} Items`, 'good')}</td><td>${rawL ? '✓' : '✕'} / ${rawH ? '✓' : '✕'}</td><td>${esc(label(entry.selection.lane))}${entry.editProxy.operations.length ? ' + 수정' : ''}</td><td>${esc(label(entry.candidate.flow?.publicationState || 'hold'))}</td></tr>`;
}).join('');

const patterns = [
  ['case-01','phase_lifecycle','검진 대상 → 기간 → 결과 통보','체크리스트 + 메모'],
  ['case-02','repeating_routine','4주마다 청소 → 그늘 건조','캘린더 + 체크 + 메모'],
  ['case-03','ordered_procedure','여권 → 이심 → 현금 → 바우처','체크리스트'],
  ['case-05','source_table_rows','주차·시험 범위를 행으로 보존','학습 표 + 메모'],
  ['case-07','compare_decide','검색 → 시운전 → 판매자 → 이전','결정 체크 + 메모'],
  ['case-09','resource_queue','Day 1~4 촬영 주제 큐','달력 + 체크 초안'],
];
const patternCards = patterns.map(([id, pattern, action, output]) => `<article class="card pattern-card"><span class="eyebrow">${esc(id)} · ${esc(label(pattern))}</span><strong>${esc(action)}</strong><small>${esc(output)}</small></article>`).join('');

const repairCards = selected.cases.filter((entry) => entry.editProxy.operations.length).map((entry) => {
  const first = entry.editProxy.operations[0];
  const remaining = entry.editProxy.operations.length - 1;
  return `<article class="card"><span class="eyebrow">${esc(entry.caseId)} · ${entry.editProxy.weightedEditPoints || entry.editProxy.operations.reduce((sum, op) => sum + op.weight, 0)}점</span><h3>${esc(entry.title)}</h3><p><strong>정확 인용 보정 ${entry.editProxy.operations.length}건</strong></p><div class="repair"><strong>${esc(first.path)}</strong><small>합성 인용을 동결 원문의 정확한 연속 문자열과 locator로 교체</small></div>${remaining ? `<p class="tiny muted">같은 유형 ${remaining}건은 상세 갤러리에서 before/after 공개</p>` : ''}</article>`;
}).join('');

const itemJsonExcerpt = {
  itemId: case02Items[0].itemId,
  stepId: case02Items[0].stepId,
  title: case02Items[0].title,
  intent: case02Items[0].intent,
  doneWhen: case02Items[0].doneWhen,
  sourceEvidenceRefs: case02Items[0].sourceEvidenceRefs,
};

const slides = [
  slide(1, 'URL이 실행물로 바뀌는 순간', `
    <div class="hero-strip">
      <div><div class="cluster">${badge('case-02', 'dark')}${badge('원문 근거 정확 일치', 'good')}${badge('사람 검토 전', 'warn')}</div><h1 class="hero-title">극세 필터<br>4주 청소 루틴</h1><p class="lede">삼성전자서비스 URL 하나에서 반복 일정·실행 체크·주의 메모를 함께 만들었다. 첫 청소일만 사용자가 넣는다.</p><a class="source-link" href="${attr(case02.candidate.sourceAssessment.sourceUrl)}">원문 열기 → ${esc(case02.candidate.sourceAssessment.sourceUrl)}</a></div>
      <div class="grid-2"><article class="card kpi"><span class="eyebrow">원문 주기</span><strong class="metric">4주</strong><p>“${esc(case02.candidate.sourceEvidence[0].text)}”</p></article><article class="card kpi coral"><span class="eyebrow">실행 단위</span><strong class="metric">3</strong><p>선택 → 청소 → 그늘 건조</p></article><article class="artifact-card" style="grid-column:1/-1"><span class="eyebrow">실제 캘린더</span><pre>${esc(case02Rendered.calendarTemplate)}</pre></article></div>
    </div>`),
  slide(2, '원문 문장마다 실행 Item이 연결된다', `
    <div class="grid-2"><div><h3>동결된 SourceEvidence</h3>${evidenceCards(case02.candidate, 5)}</div><div><h3>그 근거로 만든 Flow Items</h3><ol class="item-list">${itemRows(case02.candidate)}</ol><div class="callout" style="margin-top:1rem"><strong>하드 게이트</strong><br>인용문 정확 일치 · 모든 Item의 근거 참조 · unsupportedClaims 0건</div></div></div>`),
  slide(3, 'Item 하나, 세 가지 자연스러운 투영', `
    <p class="lede">캘린더·체크리스트·메모가 각각 별도 콘텐츠가 아니다. 같은 Item 집합을 목적지에 맞게 투영하고, 잃는 정보는 loss ledger에 남긴다.</p>
    <div class="grid-3">${renderedCard('calendar', case02Rendered.calendarTemplate)}${renderedCard('checklist', case02Rendered.checklist)}${renderedCard('memo', case02Rendered.memo)}</div>
    <div class="callout warn" style="margin-top:1rem"><strong>경계:</strong> “첫 청소일”은 원문 사실이 아니라 사용자 입력이다. 4주 반복만 원문 근거다.</div>`),
  slide(4, '원문마다 구조와 산출물이 달라진다', `<p class="lede">카테고리가 아니라 사용자 일의 구조를 먼저 고른다. 이번 10개에서 6개 planning pattern이 실제로 나왔다.</p><div class="grid-3">${patternCards}</div>`),
  slide(5, '10개 URL의 선택 결과를 한눈에 본다', `
    <div class="cluster" style="margin-bottom:.8rem">${badge('10/10 선택본 하드 게이트 통과','good')}${badge('9개 Flow 생성','good')}${badge('1개 올바른 보류','warn')}${badge('공개 준비 0개','bad')}</div>
    <div class="table-wrap"><table class="status-table"><thead><tr><th>ID</th><th>원문</th><th>구조</th><th>결과</th><th>원시 gate<br>저/고</th><th>선택</th><th>공개 상태</th></tr></thead><tbody>${caseRows}</tbody></table></div>`),
  slide(6, 'case-06은 Flow 0개가 정답이었다', `
    <div class="grid-2"><div><div class="cluster">${badge('reextract_required','warn')}${badge('Items 0','dark')}${badge('projections 0','dark')}</div><h3 style="margin-top:1rem">${esc(case06.title)}</h3><p class="lede">${esc(case06.candidate.decision.reason)}</p>${evidenceCards(case06.candidate, 3)}</div><div><div class="callout bad"><strong>만들지 않은 것</strong><br>재료·조리법·완료 기준을 추측한 레시피 Flow</div><h3 style="margin-top:1.2rem">다시 확보해야 할 근거</h3><ol>${case06.candidate.decision.requiredReExtraction.map((entry) => `<li>${esc(entry)}</li>`).join('')}</ol><p><a href="${attr(case06.source.url)}">YouTube 원문 열기 →</a></p></div></div>`),
  slide(7, '수정은 결과에서 숨기지 않았다', `
    <div class="grid-3">${repairCards}</div>
    <div class="grid-3" style="margin-top:1rem"><article class="card kpi coral"><span class="eyebrow">수정한 선택본</span><strong class="metric">${summary.editProxy.repairedCases}/9</strong><p>생성된 Flow 중 ${pct(summary.editProxy.generatedCaseRepairRate)}</p></article><article class="card kpi gold"><span class="eyebrow">수정 연산</span><strong class="metric">${summary.editProxy.operationCount}</strong><p>정확 인용·locator 보정</p></article><article class="card kpi"><span class="eyebrow">가중 점수</span><strong class="metric">${summary.editProxy.weightedEditPoints}</strong><p>에이전트 편집 proxy</p></article></div>
    <p class="tiny muted">이 점수는 사람의 편집 시간·노동비·edit distance가 아니다.</p>`),
  slide(8, '“더 좋아 보임”과 “근거를 통과함”이 충돌했다', `
    <div class="vs"><article class="card"><span class="eyebrow">블라인드 모델 proxy 선호</span><h3>고성능 ${summary.blindReview.laneVotes.higher_capability}표</h3><div class="compare-bar premium"><span style="width:65%"></span></div><p>저비용 ${summary.blindReview.laneVotes.lower_cost}표 · 동률 ${summary.blindReview.laneVotes.tie}표</p></article><div class="vs-mark">≠</div><article class="card"><span class="eyebrow">원시 strict hard-pass</span><h3>저비용 ${rawLower.strictPassedCases}/10</h3><div class="compare-bar"><span style="width:${rawLower.strictPassedCases * 10}%"></span></div><p>고성능 ${rawHigher.strictPassedCases}/10 · 정확 인용 실패 ${rawHigher.exactEvidenceFailureCount}건</p></article></div>
    <div class="callout warn" style="margin-top:1rem"><strong>해석:</strong> 풍부한 문장과 구조는 선호를 얻었지만, 합성 인용이 source-grounded gate를 더 자주 깨뜨렸다. 두 리뷰어는 사람 심사가 아니라 모델 proxy다.</div>`),
  slide(9, '커버리지와 공개 경계는 분리한다', `
    <div class="grid-4"><article class="card kpi"><span class="eyebrow">읽기 가능한 스냅샷</span><strong class="metric">${summary.sourceCapture.readableCases}/10</strong></article><article class="card kpi coral"><span class="eyebrow">민감 사례</span><strong class="metric">${summary.sourceCapture.sensitiveCases}</strong><p>사람 검토 잠금</p></article><article class="card kpi gold"><span class="eyebrow">권리 검토</span><strong class="metric">${summary.sourceCapture.rightsReviewCases}</strong><p>creator/reference</p></article><article class="card kpi red"><span class="eyebrow">public-ready</span><strong class="metric">0</strong><p>선택 ≠ 공개 승인</p></article></div>
    <div class="grid-2" style="margin-top:1rem"><div class="callout"><strong>이번에 커버:</strong> 한 URL · 한 사용자 job · 한 primary artifact · bounded source scope</div><div class="callout bad"><strong>이번에 제외:</strong> 계정 쓰기 · 자동 게시 · 개인 의료/법률 판정 · 권리 미확인 creator 재사용</div></div>`),
  slide(10, '최소 저장 단위는 ICS가 아니라 Item이다', `
    <div class="grid-2"><div><p class="decision">Item이 의미와 완료 상태를 소유한다.</p><ul><li><strong>SourceEvidence</strong> — 어떤 원문이 근거인가</li><li><strong>Item</strong> — 사용자가 무엇을 하고 언제 끝나는가</li><li><strong>Projection</strong> — 캘린더·체크·표·메모에서 어떻게 보이는가</li></ul><div class="callout">case-02의 <code>item-01</code>은 캘린더 설명과 체크리스트 양쪽에서 재사용된다.</div></div><div class="json-box">${code(itemJsonExcerpt)}</div></div>`),
  slide(11, '백엔드는 이 여섯 단계를 책임진다', `
    <div class="flowline"><div class="node"><strong>Snapshot</strong><p>URL 본문·상태·hash 동결</p></div><div class="node"><strong>Extract</strong><p>근거 행과 source scope</p></div><div class="node"><strong>Propose</strong><p>cheap-first Item 구조</p></div><div class="node"><strong>Gate</strong><p>정확 인용·refs·unsupported 0</p></div><div class="node"><strong>Escalate</strong><p>bounded repair 또는 사람 큐</p></div><div class="node"><strong>Preview</strong><p>캘린더·체크·표·메모</p></div></div>
    <div class="callout warn" style="margin-top:1rem"><strong>중요:</strong> preview까지가 이번 조건부 범위다. 외부 계정 쓰기와 자동 공개는 gate 이후의 별도 제품 결정이다.</div>`),
  slide(12, '비용은 파일 크기 proxy까지만 안다', `
    <div class="grid-3"><article class="card kpi"><span class="eyebrow">저비용 출력 proxy</span><strong class="metric">${fmt.format(rawLower.estimatedOutputTokens)}</strong><p>chars ÷ 4 토큰 proxy</p></article><article class="card kpi coral"><span class="eyebrow">고성능 출력 proxy</span><strong class="metric">${fmt.format(rawHigher.estimatedOutputTokens)}</strong><p>${summary.costProxy.lowerToHigherOutputTokenRatio.toFixed(2)}× 출력량</p></article><article class="card kpi red"><span class="eyebrow">실제 provider 비용</span><strong class="metric">미측정</strong><p>요청 ID·재시도·latency 없음</p></article></div>
    <div class="callout bad" style="margin-top:1rem"><strong>말할 수 없는 것:</strong> accepted Flow당 원가, 실제 API 가격, p50/p95 지연, 사람 편집비. 세션 모델 이름도 가격 티어의 증거가 아니다.</div>`),
  slide(13, '세 가지 출시 결정을 분리한다', `
    <div class="grid-3"><article class="card kpi"><span class="eyebrow">내부 변환 adapter</span><p class="decision" style="color:var(--green)">CONDITIONAL GO</p><p>동결 snapshot · cheap-first · hard gate · preview</p></article><article class="card kpi gold"><span class="eyebrow">production URL/AI backend</span><p class="decision" style="color:#8b5c00">HOLD</p><p>실비·지연·사람 편집 증거 없음</p></article><article class="card kpi red"><span class="eyebrow">자동 공개</span><p class="decision" style="color:var(--red)">NO-GO</p><p>민감·권리·근거 실패를 자동 통과하지 않음</p></article></div>`),
  slide(14, '지금 만들 백엔드는 “검토 가능한 adapter”다', `
    <div class="grid-2"><div><h3>조건부로 구현할 것</h3><ul>${summary.backendDecision.allowedNow.map((entry) => `<li>${esc(entry)}</li>`).join('')}</ul></div><div><h3>production HOLD를 푸는 증거</h3><ul>${summary.backendDecision.productionHoldReasons.map((entry) => `<li>${esc(entry)}</li>`).join('')}</ul></div></div>
    <div class="callout"><strong>산출물 계약:</strong> Snapshot + SourceEvidence + Flow/Item + Projection + gate 결과 + publication state. 저장·공개 상태는 생성 본문과 분리한다.</div>`),
  slide(15, '다음 목표는 “실비와 사람 수정량”을 재는 것', `
    <div class="grid-2"><div><p class="decision">같은 10개를 실제 API telemetry + 사람 편집으로 한 번 더 돈다.</p><ol><li>모델별 request ID·input/output token·재시도·wall latency 기록</li><li>블라인드 사람 리뷰 2인 이상과 보류 정답 포함</li><li>원시 후보 → 승인본의 실제 편집 시간·연산·사유 기록</li><li>accepted Flow당 비용과 민감/권리 queue 시간을 계산</li></ol></div><div><div class="card"><span class="eyebrow">다음 GO 기준</span><h3>정확 근거 gate를 유지하면서</h3><ul><li>사람이 고른 실행 품질</li><li>허용 가능한 accepted-Flow 원가</li><li>허용 가능한 p95 latency</li><li>예측 가능한 편집·보류율</li></ul></div><p class="muted tiny">임계값은 운영·가격 정책과 함께 사전 등록해야 한다. 이번 세션은 값을 만들지 않았다.</p></div></div>`),
];

const reportHtml = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"> <title>URL → Flow P0 10-URL benchmark</title><style>${reportCss}</style></head><body><a class="skip" href="#slide-1">본문으로 건너뛰기</a><aside class="rail"><div class="brand">FLOW</div><nav class="rail-nav" aria-label="슬라이드">${slideTitles.map((title, index) => `<button type="button" data-slide="${index}" aria-label="${index + 1}. ${attr(title)}">${String(index + 1).padStart(2, '0')}</button>`).join('')}</nav><div class="rail-foot">← → 키<br>이동</div></aside><main class="deck">${slides.join('')}</main><script>
const deck=document.querySelector('.deck');const slides=[...document.querySelectorAll('.slide')];const buttons=[...document.querySelectorAll('[data-slide]')];let active=0;let ticking=false;
function mark(index){active=index;buttons.forEach((button,i)=>button.setAttribute('aria-current',i===index?'true':'false'));const nav=buttons[index]?.parentElement;if(nav&&innerWidth<=900)nav.scrollTo({left:Math.max(0,buttons[index].offsetLeft-nav.clientWidth/2),behavior:'smooth'});}
function go(index){const next=Math.max(0,Math.min(slides.length-1,index));mark(next);slides[next].scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});location.hash='slide-'+(next+1);}
buttons.forEach((button,index)=>button.addEventListener('click',()=>go(index)));
function updateFromScroll(){ticking=false;const desktop=innerWidth>900;const probe=(desktop?deck.scrollTop:scrollY)+(desktop?deck.clientHeight:innerHeight)*.32;let index=0;slides.forEach((slide,i)=>{if(slide.offsetTop<=probe)index=i});mark(index);}
function scheduleMark(){if(!ticking){ticking=true;requestAnimationFrame(updateFromScroll)}}
deck.addEventListener('scroll',scheduleMark,{passive:true});addEventListener('scroll',scheduleMark,{passive:true});addEventListener('resize',scheduleMark);
addEventListener('keydown',event=>{if(['ArrowRight','ArrowDown','PageDown',' '].includes(event.key)){event.preventDefault();go(active+1)}if(['ArrowLeft','ArrowUp','PageUp'].includes(event.key)){event.preventDefault();go(active-1)}if(event.key==='Home'){event.preventDefault();go(0)}if(event.key==='End'){event.preventDefault();go(slides.length-1)}});
const requested=Number((location.hash.match(/slide-(\d+)/)||[])[1]);mark(Number.isFinite(requested)&&requested>0?requested-1:0);setTimeout(scheduleMark,0);
</script></body></html>`;

const galleryCss = `${commonCss}
body{background:linear-gradient(180deg,#e7eceb 0,#f4f1e9 18rem)}.topbar{position:sticky;top:0;z-index:10;background:rgba(18,48,71,.96);color:#fff;padding:.8rem clamp(1rem,4vw,3rem);display:flex;justify-content:space-between;align-items:center;gap:1rem}.topbar a{color:#fff}.gallery{max-width:1280px;margin:auto;padding:clamp(2rem,5vw,5rem) clamp(1rem,3vw,2rem)}.gallery-hero{max-width:900px;margin-bottom:2rem}.case-index{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.5rem;margin:1.5rem 0}.case-index a{display:block;background:#fff;border:1px solid var(--line);padding:.65rem;border-radius:.7rem;text-decoration:none;font-weight:800}.case-card{background:rgba(255,253,248,.96);border:1px solid var(--line);border-radius:1.4rem;padding:clamp(1rem,3vw,2rem);box-shadow:var(--shadow);margin:0 0 2rem;scroll-margin-top:5rem}.case-head{display:grid;grid-template-columns:1fr auto;gap:1rem;border-bottom:1px solid var(--line);padding-bottom:1rem;margin-bottom:1rem}.case-head h2{font-size:clamp(1.6rem,3vw,2.7rem);margin:.25rem 0}.section-label{font-size:.72rem;font-weight:900;letter-spacing:.08em;color:var(--coral);text-transform:uppercase;margin:1.2rem 0 .5rem}.gate-grid{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}.gate{border:1px solid var(--line);border-radius:.8rem;padding:.8rem}.gate.pass{border-color:#b9d9c8;background:#eff8f3}.gate.fail{border-color:#e8bbc1;background:#fff2f3}.review-vote{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid var(--line);padding:.45rem 0}.projection{border:1px solid var(--line);border-radius:.8rem;padding:.8rem;margin:.6rem 0}.projection summary{cursor:pointer;font-weight:800}.publication{font-size:1rem;font-weight:900}.backtop{display:inline-block;margin-top:1rem}@media(max-width:800px){.case-index{grid-template-columns:repeat(2,1fr)}.case-head,.gate-grid{grid-template-columns:1fr}.topbar{align-items:flex-start;flex-direction:column}}
.case-card,.case-head>*,.projection{min-width:0}.case-head{grid-template-columns:minmax(0,1fr) auto}.case-head h2,.projection summary{overflow-wrap:anywhere}@media(max-width:800px){.case-index{grid-template-columns:repeat(2,minmax(0,1fr))}.case-head,.gate-grid{grid-template-columns:minmax(0,1fr)}}
@media print{.topbar,.case-index,.backtop{display:none}.gallery{padding:0}.case-card{box-shadow:none;break-before:page;margin:0;border:0}.case-card:first-of-type{break-before:auto}details{display:block}details>*{display:block!important}}
`;

const galleryCases = selected.cases.map((entry) => {
  const cand = entry.candidate;
  const flow = cand.flow;
  const hold = !flow;
  const sourceUrl = cand.sourceAssessment.sourceUrl;
  const projectionHtml = (cand.projections || []).map((projection) => `<details class="projection" open><summary>${esc(label(projection.target))} · source Items ${esc(projection.sourceItemRefs.join(', '))}</summary>${code(projection.payload)}${projection.lossLedger.length ? `<p class="tiny"><strong>Loss ledger:</strong> ${projection.lossLedger.map(esc).join(' · ')}</p>` : ''}</details>`).join('');
  const artifactHtml = Object.entries(cand.renderedArtifacts || {}).map(([name, value]) => renderedCard(name, value)).join('');
  const repairsHtml = entry.editProxy.operations.length ? entry.editProxy.operations.map((op) => `<div class="repair"><strong>${esc(op.operationId)} · ${op.weight}점 · ${esc(op.path)}</strong><small>${esc(op.reason)}</small><details><summary>before / after</summary>${code({before:op.before,after:op.after})}</details></div>`).join('') : '<p class="muted">편집 proxy 연산 없음 — raw model output을 그대로 선택.</p>';
  const reviewHtml = entry.blindReviews.map((review) => `<div class="review-vote"><span>${esc(review.reviewerId)} · ${esc(review.reviewerProxy.model)} <small>(모델 proxy)</small></span><strong>${esc(label(review.laneChoice))}</strong></div>`).join('');
  const gate = (lane, value) => `<div class="gate ${value.passed ? 'pass' : 'fail'}"><strong>${esc(lane)} · ${value.passed ? 'PASS' : 'FAIL'}</strong><p class="tiny">${value.errors.length ? value.errors.map(esc).join('<br>') : 'hard error 0'}</p></div>`;
  return `<article class="case-card" id="${attr(entry.caseId)}">
    <header class="case-head"><div><span class="eyebrow">${esc(entry.caseId)} · ${esc(label(flow?.planningPattern || cand.decision.disposition))}</span><h2>${esc(entry.title)}</h2><a class="source-link" href="${attr(sourceUrl)}">${esc(sourceUrl)}</a></div><div class="cluster">${hold ? badge('0 Items','warn') : badge(`${flow.items.length} Items`,'good')}${badge(label(entry.selection.lane),'dark')}${entry.editProxy.operations.length ? badge(`${entry.editProxy.operations.length} repairs`,'warn') : ''}</div></header>
    <div class="grid-2"><section><h3 class="section-label">선택 결과</h3><p><strong>${esc(cand.decision.disposition)}</strong> — ${esc(cand.decision.reason)}</p>${flow ? `<p>${esc(flow.userJob)}</p><div class="cluster">${badge(label(flow.primaryArtifact),'good')}${badge(label(flow.publicationState),flow.publicationState==='rights_review_required'?'warn':'bad')}</div>` : `<div class="callout warn"><strong>재추출 항목</strong><ul>${cand.decision.requiredReExtraction.map((x)=>`<li>${esc(x)}</li>`).join('')}</ul></div>`}</section><section><h3 class="section-label">원시 레인 hard gate</h3><div class="gate-grid">${gate('저비용',entry.rawGate.lowerCost)}${gate('고성능',entry.rawGate.higherCapability)}</div><h3 class="section-label">블라인드 선택</h3>${reviewHtml}</section></div>
    <h3 class="section-label">SourceEvidence</h3><div class="grid-2">${evidenceCards(cand)}</div>
    <h3 class="section-label">Flow Items + doneWhen</h3>${flow ? `<ol class="item-list">${itemRows(cand)}</ol>` : '<div class="callout warn">원문으로 완료 기준을 만들 수 없어 Item을 생성하지 않았다.</div>'}
    <div class="grid-2"><section><h3 class="section-label">Projections</h3>${projectionHtml || '<p class="muted">투영 없음</p>'}</section><section><h3 class="section-label">Rendered artifacts</h3>${artifactHtml || '<p class="muted">렌더링 산출물 없음</p>'}</section></div>
    <h3 class="section-label">Editorial repair log</h3>${repairsHtml}
    <footer style="margin-top:1.2rem;padding-top:1rem;border-top:1px solid var(--line)"><span class="publication">공개 상태: ${esc(label(flow?.publicationState || 'hold'))}</span><span class="tiny muted"> · 선택본 strict validation ${entry.selectedValidation.passed ? 'PASS' : 'FAIL'} · unsupportedClaims ${(cand.unsupportedClaims || []).length}</span><br><a class="backtop" href="#top">↑ 목차로</a></footer>
  </article>`;
}).join('');

const assets = [
  ['benchmark-summary.json','요약'],['selected-flows.json','선택본'],['selected-validation.json','선택 검증'],['source-snapshots.json','원문 snapshot'],['model-runs/lower-cost.json','저비용 raw'],['model-runs/higher-capability.json','고성능 raw'],['review-results/reviewer-a.json','reviewer A'],['review-results/reviewer-b.json','reviewer B'],['editorial-repairs/lower-cost-repaired.json','repair 원본']
];
const galleryHtml = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"> <title>URL → Flow 10개 상세 갤러리</title><style>${galleryCss}</style></head><body id="top"><a class="skip" href="#case-01">첫 사례로 건너뛰기</a><nav class="topbar"><strong>FLOW · 10 URL CASE GALLERY</strong><div><a href="report.html">15장 보고서</a> · <a href="selected-flows.json">선택본 JSON</a></div></nav><main class="gallery"><header class="gallery-hero"><span class="eyebrow">SOURCE-GROUNDED REVIEW SURFACE</span><h1>원문 기준으로<br>무엇이 나왔나</h1><p class="lede">점수보다 먼저 10개 모두의 근거·Item·완료 기준·투영·raw gate·수정·공개 상태를 확인하는 상세판이다.</p><div class="asset-links">${assets.map(([href,name])=>`<a href="${attr(href)}">${esc(name)} ↗</a>`).join('')}</div><nav class="case-index" aria-label="사례 바로가기">${selected.cases.map((entry)=>`<a href="#${attr(entry.caseId)}"><span class="eyebrow">${esc(entry.caseId)}</span><br>${esc(entry.title)}</a>`).join('')}</nav><div class="callout warn"><strong>비교의 한계:</strong> reviewer 2명은 모델 proxy이고, 48 edit points는 에이전트 proxy다. 실제 provider 비용·latency·사람 편집량은 측정하지 않았다.</div></header>${galleryCases}</main></body></html>`;

if (slides.length !== 15) throw new Error(`Expected 15 slides, received ${slides.length}`);
if (selected.cases.length !== 10) throw new Error(`Expected 10 cases, received ${selected.cases.length}`);
if (!validation.passed || validation.passedCaseCount !== 10) throw new Error('Selected validation must pass all ten cases before report generation.');
if (!reviewerA || !reviewerB || !repairs || !lower || !higher) throw new Error('Required benchmark evidence is missing.');

fs.writeFileSync(path.join(auditDir, 'report.html'), reportHtml, 'utf8');
fs.writeFileSync(path.join(auditDir, 'case-gallery.html'), galleryHtml, 'utf8');
console.log(JSON.stringify({
  report: path.join(auditDir, 'report.html'),
  gallery: path.join(auditDir, 'case-gallery.html'),
  slideCount: (reportHtml.match(/<section class="slide"/g) || []).length,
  caseCount: (galleryHtml.match(/<article class="case-card"/g) || []).length,
  replacementCharacters: (reportHtml.match(/\uFFFD/g) || []).length + (galleryHtml.match(/\uFFFD/g) || []).length,
}, null, 2));
