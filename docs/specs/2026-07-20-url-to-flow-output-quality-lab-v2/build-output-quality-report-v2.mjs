import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..");
const target = path.join(
  root,
  "docs",
  "content-audit",
  "2026-07-20-url-to-flow-output-quality-review-ko.html",
);

const read = (name) => JSON.parse(fs.readFileSync(path.join(here, name), "utf8"));
const manifest = read("case-manifest-v2.json");
const gold = read("gold-source-contract-v2.json");
const finalRun = read(path.join("runs", "round-4", "rules-adjudicated.json"));
const comparison = fs.existsSync(path.join(here, "comparison-v2.json"))
  ? read("comparison-v2.json")
  : null;

const byGold = new Map(gold.cases.map((entry) => [entry.caseId, entry]));
const byOutput = new Map(finalRun.outputs.map((entry) => [entry.caseId, entry]));
const data = {
  generatedAt: new Date().toISOString(),
  manifest,
  comparison,
  cases: manifest.cases.map((entry) => ({
    ...entry,
    gold: byGold.get(entry.caseId),
    output: byOutput.get(entry.caseId),
  })),
};

const safeJson = JSON.stringify(data).replaceAll("</script", "<\\/script");
const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="#">
  <title>FlowMe URL-to-Flow 출력 품질 갤러리 v2</title>
  <style>
    :root{--ink:#18231f;--muted:#68736e;--paper:#f4f1e9;--panel:#fffdf8;--line:#d8d5ca;--green:#176b4f;--mint:#dff3e9;--orange:#ec7c32;--amber:#f7e4b3;--red:#a8453a;--blue:#4169a4;--shadow:0 18px 50px rgba(38,50,43,.11);font-family:Inter,Pretendard,"Noto Sans KR",system-ui,sans-serif;color:var(--ink);background:var(--paper)}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 80% 0,#e2f1e9 0,transparent 28rem),var(--paper)}button,a{font:inherit}.topbar{position:fixed;z-index:20;inset:0 0 auto 0;height:56px;background:rgba(244,241,233,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px;padding:0 22px}.brand{font-weight:900;letter-spacing:-.03em}.topbar nav{display:flex;gap:5px;overflow:auto;margin-left:auto}.topbar a{color:var(--muted);text-decoration:none;padding:8px 10px;border-radius:999px;white-space:nowrap;font-size:13px}.topbar a:hover{background:white;color:var(--ink)}
    main{padding-top:56px}.slide{min-height:calc(100vh - 56px);padding:clamp(34px,6vw,84px) clamp(20px,7vw,110px);display:flex;flex-direction:column;justify-content:center;border-bottom:1px solid var(--line);position:relative}.slide.no-min{min-height:auto}.eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:900;color:var(--green)}h1,h2,h3,p{margin-top:0}h1,h2,h3{word-break:keep-all}h1{font-size:clamp(42px,6.2vw,88px);line-height:.96;letter-spacing:-.065em;max-width:1100px;margin-bottom:24px}h2{font-size:clamp(31px,4.2vw,58px);line-height:1.04;letter-spacing:-.05em;margin-bottom:16px}h3{letter-spacing:-.03em}.lead{font-size:clamp(17px,1.6vw,24px);line-height:1.55;color:#44504b;max-width:920px}.hero-note{margin-top:16px;font-size:13px;color:var(--muted)}
    .grid{display:grid;gap:18px}.grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.card{background:rgba(255,253,248,.94);border:1px solid var(--line);border-radius:20px;padding:20px;box-shadow:var(--shadow);min-width:0}.card.flat{box-shadow:none}.example-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.badge,.chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 9px;font-size:12px;font-weight:800;background:#eef0eb;color:#46514c}.badge.good{background:var(--mint);color:var(--green)}.badge.warn{background:var(--amber);color:#77500b}.badge.block{background:#f3d8d4;color:var(--red)}.chip{font-weight:700;margin:2px}.artifact{background:var(--ink);color:white}.arrow{font-size:22px;color:var(--orange);font-weight:900}.before{border-left:4px solid #c9a076;padding-left:13px;color:#675e55}.after{border-left:4px solid var(--green);padding-left:13px}.small{font-size:13px;color:var(--muted);line-height:1.55}.micro{font-size:11px;color:var(--muted)}
    .mini-sheet,.data-table{width:100%;border-collapse:collapse;font-size:12px}.mini-sheet th,.mini-sheet td,.data-table th,.data-table td{border-bottom:1px solid var(--line);padding:8px;text-align:left;vertical-align:top}.mini-sheet th,.data-table th{color:var(--muted);font-weight:800;background:#f4f4ee}.status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#c5c8c3;margin-right:6px}.response-card{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.response-card div{padding:10px;border-radius:12px;background:#f3f3ed}.response-card .danger{background:#f8dfda;color:#7f322b}.response-card strong{display:block;margin-bottom:4px}.pipeline{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:30px}.pipeline .card{position:relative;box-shadow:none}.pipeline .card:not(:last-child):after{content:"→";position:absolute;right:-13px;top:44%;z-index:2;color:var(--orange);font-weight:900;font-size:22px}.num{display:inline-grid;place-items:center;width:31px;height:31px;border-radius:50%;background:var(--green);color:white;font-weight:900;margin-bottom:14px}
    .artifact-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-top:24px}.artifact-tile{border-top:5px solid var(--green)}.artifact-tile strong{display:block;font-size:18px;margin-bottom:6px}.artifact-tile span{font-size:12px;color:var(--muted)}
    .gallery-shell{display:grid;grid-template-columns:260px minmax(0,1fr);gap:20px;align-items:start}.case-nav{position:sticky;top:75px;max-height:calc(100vh - 95px);overflow:auto;padding:10px;background:rgba(255,253,248,.9);border:1px solid var(--line);border-radius:16px}.swipe-hint{display:none}.case-btn{display:block;width:100%;border:0;background:transparent;text-align:left;padding:10px;border-radius:10px;cursor:pointer;color:var(--ink)}.case-btn:hover,.case-btn.active{background:var(--mint);color:var(--green)}.case-btn small{display:block;color:var(--muted);margin-top:3px}.case-stage{min-width:0}.case-hero{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.case-meta{display:flex;gap:5px;flex-wrap:wrap}.four-axis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:16px 0}.axis{padding:12px;background:#f1f2ec;border-radius:12px}.axis label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:5px}.axis strong{font-size:13px;overflow-wrap:anywhere}.source-box{padding:14px;border-radius:14px;background:#f7f5ef;border:1px dashed #c9c6bc;margin:12px 0}.source-box a{color:var(--green);overflow-wrap:anywhere}.preview{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:white}.preview-title{padding:13px 15px;background:var(--ink);color:white;display:flex;justify-content:space-between;align-items:center}.preview-body{padding:14px;max-height:520px;overflow:auto}.list{display:grid;gap:8px}.list-item{padding:10px 12px;background:#f4f5f0;border-radius:11px;display:flex;gap:10px;align-items:flex-start}.check{width:17px;height:17px;border:2px solid #9ca59f;border-radius:5px;flex:0 0 auto}.todo-mark{width:7px;height:7px;border-radius:50%;background:var(--orange);margin:7px 5px 0}.calendar-row{display:grid;grid-template-columns:76px 1fr;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)}.calendar-row time{color:var(--green);font-weight:900;font-size:12px}.memo{background:#fff8dd;border:1px solid #ecd495;padding:15px;border-radius:13px}.memo dl{display:grid;grid-template-columns:100px 1fr;gap:7px;margin:0}.memo dt{font-weight:900}.memo dd{margin:0}.role-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.role-col{padding:11px;background:#f4f4ee;border-radius:11px}.role-col strong{font-size:12px}.role-col ul{padding-left:16px;margin:7px 0 0;font-size:12px}.blocked-panel{padding:16px;border-radius:13px;background:#f7e5e1;color:#6f322b}.blocked-panel strong{display:block;margin-bottom:7px}.fold{margin-top:14px}.fold summary{cursor:pointer;font-weight:800;color:var(--green)}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#1e2925;color:#e9f2ed;border-radius:12px;padding:14px;max-height:360px;overflow:auto;font-size:11px}
    .quick-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin-top:20px}.quick-case{min-height:98px;padding:12px;border:1px solid var(--line);border-radius:14px;background:rgba(255,253,248,.9)}.quick-case b{display:block;font-size:13px;line-height:1.3;margin:7px 0 4px}.quick-case small{display:block;color:var(--muted);font-size:11px;line-height:1.35}.quick-case.warn{border-color:#d6b75b;background:#fff8dc}.quick-case.block{border-color:#d3a19b;background:#fff3f1}.projection-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin:12px 0}.projection-state{padding:9px;border:1px solid var(--line);border-radius:11px;background:#f7f6f0;min-width:0}.projection-state b{display:block;font-size:12px}.projection-state small{display:block;margin-top:3px;color:var(--muted);font-size:10px;overflow-wrap:anywhere}.projection-state.primary{border-color:#65a88e;background:#eaf7f1}.projection-state.secondary{border-color:#8ba6cc;background:#eef4fb}.projection-state.blocked{border-color:#d3a19b;background:#fff3f1}.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:22px}.metric{padding:18px;border-radius:16px;background:var(--panel);border:1px solid var(--line)}.metric strong{font-size:32px;letter-spacing:-.04em;display:block}.metric span{font-size:12px;color:var(--muted)}.bar{height:8px;background:#e4e4de;border-radius:99px;overflow:hidden;margin-top:10px}.bar i{display:block;height:100%;background:var(--green)}.boundary{padding:15px;border:1px solid #c9a94a;background:#fff5ce;border-radius:13px;color:#67501b}.footer-links{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}.footer-links a{color:var(--green);background:white;border:1px solid var(--line);border-radius:999px;padding:9px 12px;text-decoration:none;font-size:13px}
    @media(max-width:900px){.grid.two,.grid.three,.pipeline,.artifact-strip,.four-axis,.metric-grid{grid-template-columns:1fr 1fr}.quick-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.pipeline .card:after{display:none}.gallery-shell{grid-template-columns:1fr}.case-nav{position:static;display:flex;overflow:auto;max-height:none}.swipe-hint{display:grid;place-items:center;min-width:112px;padding:9px;color:var(--green);font-size:11px;font-weight:800}.case-btn{min-width:175px}.slide{min-height:auto;padding:54px 18px}.role-board{grid-template-columns:1fr 1fr}}
    @media(max-width:560px){.topbar{padding:0 12px}.topbar nav a:nth-child(-n+2){display:none}h1{font-size:43px}.grid.two,.grid.three,.pipeline,.artifact-strip,.four-axis,.metric-grid,.response-card,.role-board{grid-template-columns:1fr}.quick-grid{grid-template-columns:1fr 1fr}.quick-case{min-height:90px}.projection-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.card{padding:16px}.case-hero{display:block}.preview-body{max-height:none}.mini-sheet{font-size:10px;table-layout:fixed}.mini-sheet th,.mini-sheet td{padding:5px;overflow-wrap:anywhere}.table-scroll{overflow:auto}.slide{padding:44px 14px}}
    @media print{.topbar{display:none}main{padding:0}.slide{min-height:100vh;break-after:page}.case-nav{display:none}.gallery-shell{display:block}.case-stage{break-inside:avoid}}
  </style>
</head>
<body>
  <header class="topbar"><div class="brand">FLOWME · OUTPUT LAB</div><nav><a href="#examples">실제 예시</a><a href="#pipeline">산출물</a><a href="#gallery">18개 갤러리</a><a href="#evidence">검증</a></nav></header>
  <main>
    <section class="slide" id="examples">
      <div class="eyebrow">URL-to-Flow output quality lab · review draft</div>
      <h1>주소 하나가<br>쓸 수 있는 상태로 바뀌는가?</h1>
      <p class="lead">첫 화면부터 답을 보여줍니다. 강의는 <b>14주 진도표</b>로 펼치고, 폭염 가이드는 매일 체크하는 목록이 아니라 <b>상황별 대응 카드</b>로 보존했습니다.</p>
      <div class="quick-grid" aria-label="첫 화면 대표 여섯 사례">
        <div class="quick-case"><span class="badge good">강한 예시 1</span><b>이사 D-day</b><small>날짜 역산 → Calendar</small></div>
        <div class="quick-case"><span class="badge good">강한 예시 2</span><b>K-MOOC 14주</b><small>진도 행 유지 → Sheet</small></div>
        <div class="quick-case"><span class="badge good">강한 예시 3</span><b>오디오북 38장</b><small>자료별 상태 → Sheet</small></div>
        <div class="quick-case"><span class="badge good">강한 예시 4</span><b>여권 갱신</b><small>완료 기준 → Todo</small></div>
        <div class="quick-case warn"><span class="badge warn">논쟁 예시 1</span><b>폭염 농작업</b><small>조건·응급 분리 → 내부 Memo</small></div>
        <div class="quick-case block"><span class="badge block">논쟁 예시 2</span><b>로그인 원문</b><small>행 미확보 → 생성 중지</small></div>
      </div>
      <div class="grid two" style="margin-top:26px">
        <article class="card">
          <div class="example-head"><div><span class="badge good">K-MOOC · complete</span><h3 style="margin:10px 0 6px">14주 데이터 분석 진도</h3></div><span class="chip artifact">Sheet</span></div>
          <p class="before small"><b>이전 위험</b><br>과정 기간만 보고 하나의 장기 프로젝트나 체크리스트로 축약</p>
          <p class="after small"><b>v2.3 결과</b><br>강의계획 14행을 각각 펼쳐 주차·활동·상태를 계속 기록</p>
          <div class="table-scroll"><table class="mini-sheet"><thead><tr><th>주차</th><th>주제</th><th>활동</th><th>상태</th></tr></thead><tbody><tr><td>1</td><td>데이터 리터러시</td><td>퀴즈</td><td><i class="status-dot"></i>시작 전</td></tr><tr><td>2</td><td>생성형 AI 활용 분석</td><td>과제</td><td><i class="status-dot"></i>시작 전</td></tr><tr><td>3</td><td>데이터 분석</td><td>토론</td><td><i class="status-dot"></i>시작 전</td></tr></tbody></table></div>
        </article>
        <article class="card">
          <div class="example-head"><div><span class="badge warn">농사로 · safety hold</span><h3 style="margin:10px 0 6px">폭염 농작업 대응</h3></div><span class="chip artifact">Memo</span></div>
          <p class="before small"><b>이전 위험</b><br>물 마시기·중지·119까지 매번 완료하는 반복 체크리스트로 오해</p>
          <p class="after small"><b>v2.3 결과</b><br>평상시 SourceRow 4개를 작업 전·후 Item 2개로 묶고 조건·중지·응급 반응은 따로 보존</p>
          <div class="response-card"><div><strong>작업 전</strong><span class="small">체감온도 확인 · 준비</span></div><div><strong>작업 후</strong><span class="small">회복 상태 확인</span></div><div><strong>조건부</strong><span class="small">20분 수분 · 위험 단계 중지</span></div><div class="danger"><strong>응급</strong><span class="small">의식 없으면 즉시 119</span></div></div>
        </article>
      </div>
      <p class="hero-note">이 문서는 18개 원문 스냅샷에 대한 자동·독립 에이전트 QA입니다. 실제 사용자 관찰 검증은 아직 아닙니다.</p>
    </section>

    <section class="slide" id="pipeline">
      <div class="eyebrow">What the backend must return</div>
      <h2>산출물은 3개가 아니라<br>검증 가능한 4층입니다.</h2>
      <p class="lead">“가능 여부 → 분류 → Flow 콘텐츠화”가 중심이고, 그 모든 판단을 다시 확인할 수 있는 출처·게이트 증거가 같은 응답에 붙습니다.</p>
      <div class="pipeline">
        <article class="card"><span class="num">1</span><h3>가능 여부</h3><p class="small">complete / partial / metadata / missing, proposal / import / hold / reject</p></article>
        <article class="card"><span class="num">2</span><h3>분류</h3><p class="small">생활영역 · 원문 모양 · 실행 패턴 · 주 결과물을 서로 독립 판정</p></article>
        <article class="card"><span class="num">3</span><h3>Flow 콘텐츠화</h3><p class="small">SourceRow마다 Item · Field · Memo · Reference · Conditional 역할을 고정</p></article>
        <article class="card"><span class="num">4</span><h3>도구별 투영</h3><p class="small">Calendar · Checklist · Todo · Sheet · Memo의 사용 가능/손실/차단 상태</p></article>
      </div>
      <div class="artifact-strip">
        <div class="card flat artifact-tile"><strong>Calendar</strong><span>이사 D-day · 날짜 기준이 핵심</span></div>
        <div class="card flat artifact-tile"><strong>Checklist</strong><span>NASA 크레인 · 한 묶음을 순서대로 완료</span></div>
        <div class="card flat artifact-tile"><strong>Todo</strong><span>성인 여권 · 다음 행동을 따로 실행</span></div>
        <div class="card flat artifact-tile"><strong>Sheet</strong><span>K-MOOC · 14개 행별 진도가 계속 남음</span></div>
        <div class="card flat artifact-tile"><strong>Memo</strong><span>에어컨 세척 · 비교 이유와 연락처가 함께 남음</span></div>
      </div>
    </section>

    <section class="slide no-min" id="gallery">
      <div class="eyebrow">18 source-backed cases</div>
      <h2>실제 사용 미리보기</h2>
      <p class="lead">왼쪽에서 사례를 바꾸면 원문 범위, 네 축 분류, SourceRow 역할, 실제 주 결과물과 공개 차단 이유를 한 화면에서 볼 수 있습니다.</p>
      <div class="gallery-shell"><aside class="case-nav" id="caseNav"></aside><div class="case-stage" id="caseStage"></div></div>
    </section>

    <section class="slide" id="evidence">
      <div class="eyebrow">Evidence, not a launch claim</div>
      <h2>좋아 보이는 화면보다<br>먼저 통과할 기준</h2>
      <div class="metric-grid" id="metricGrid"></div>
      <div class="card flat" style="margin-top:18px"><h3>라운드별 변화</h3><div class="table-scroll" id="roundTimeline"></div></div>
      <div class="boundary" style="margin-top:22px"><b>검증 경계</b><br>schema, SourceRow accounting, 독립 분류 일치율, 발명 탐지, projection 보존율, 실제 stopwatch 교정시간을 확인합니다. 이것은 자동·에이전트 QA이며 사용자 검증이 아닙니다.</div>
      <div class="boundary" style="margin-top:10px"><b>비용 경계</b><br>저비용·고성능은 서로 독립된 판정 프로필을 뜻합니다. 실제 LLM provider, token, latency, 원화 비용은 호출하지 않았으므로 이번 결과로 모델 가격 대비 성능을 주장하지 않습니다.</div>
      <div class="footer-links">
        <a href="../specs/2026-07-20-url-to-flow-output-quality-lab-v2/case-manifest-v2.json">18개 manifest JSON</a>
        <a href="../specs/2026-07-20-url-to-flow-output-quality-lab-v2/gold-source-contract-v2.json">Gold source contract</a>
        <a href="../specs/2026-07-20-url-to-flow-output-quality-lab-v2/review-results-v2.json">독립 검토 결과</a>
        <a href="../specs/2026-07-20-url-to-flow-output-quality-lab-v2/comparison-v2.json">라운드 비교</a>
      </div>
    </section>
  </main>
  <script type="application/json" id="reportData">${safeJson}</script>
  <script>
    const DATA=JSON.parse(document.getElementById('reportData').textContent);
    const artifactKo={calendar:'Calendar',checklist:'Checklist',todo:'Todo',sheet:'Sheet',memo:'Memo'};
    const patternKo={date_preparation:'날짜 역산',ordered_procedure:'순서형 절차',repeating_routine:'조건 반복',progress_tracking:'진도 관리',resource_queue:'자료 큐',compare_decide:'비교·결정',phase_lifecycle:'단계 전환'};
    const laneKo={core_positive:'핵심 사용',core_boundary:'경계 사례',positive_control:'양성 대조',negative_control:'음성 대조'};
    const navLane=(c)=>c.lane==='core_boundary'&&c.shortTitle.includes('경계')?'원문 접근':laneKo[c.lane];
    const esc=(v)=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const pct=(v)=>typeof v==='number'?Math.round(v*100)+'%':'측정 대기';
    function preview(output){
      const tax=output.classification.taxonomy, artifact=tax.primaryArtifact;
      const projection=artifact?output.projections[artifact]:null;
      if(!output.feasibility.executableAllowed||!output.canonicalDraft){
        return '<div class="blocked-panel"><strong>Flow 생성 중지 · '+esc(output.feasibility.conversionReadiness)+'</strong>'+esc(output.feasibility.reason)+'<br><span class="micro">검증된 실행 행이 확보되기 전에는 제목·기간·phase만으로 내용을 채우지 않습니다.</span></div>';
      }
      if(!projection||projection.availability==='blocked') return internalPreview(output);
      const p=projection.payload||{};
      if(p.kind==='calendar_preview') return '<div class="list">'+p.entries.slice(0,8).map(x=>'<div class="calendar-row"><time>'+esc(x.schedule?.value)+'</time><div>'+esc(x.title)+'</div></div>').join('')+more(p.entries,8)+'</div>';
      if(p.kind==='sheet_preview') return '<div class="table-scroll"><table class="data-table"><thead><tr><th>#</th><th>단계</th><th>항목</th><th>상태</th></tr></thead><tbody>'+p.rows.slice(0,14).map(x=>'<tr><td>'+esc(x.order)+'</td><td>'+esc(x.step)+'</td><td>'+esc(x.title)+'</td><td>'+esc(x.status)+'</td></tr>').join('')+'</tbody></table>'+more(p.rows,14)+'</div>';
      if(p.kind==='todo_preview') return '<div class="list">'+p.tasks.slice(0,9).map(x=>'<div class="list-item"><i class="todo-mark"></i><div><b>'+esc(x.title)+'</b><div class="micro">완료: '+esc(x.doneWhen)+'</div></div></div>').join('')+more(p.tasks,9)+'</div>';
      if(p.kind==='checklist_preview') return '<div class="list">'+p.groups.flatMap(g=>g.entries.map(x=>'<div class="list-item"><i class="check"></i><div><b>'+esc(x.title)+'</b><div class="micro">'+esc(g.title)+' · '+esc(x.doneWhen)+'</div></div></div>')).slice(0,10).join('')+((p.references||[]).length?'<div class="source-box"><b>Reference</b><br>'+p.references.map(esc).join('<br>')+'</div>':'')+'</div>';
      if(p.kind==='memo_preview') return '<div class="memo"><h3>'+esc(p.title)+'</h3><dl>'+(p.fields||[]).map(x=>'<dt>'+esc(x.label)+'</dt><dd>'+esc(x.value)+'</dd>').join('')+'</dl>'+(p.notes||[]).map(x=>'<p class="small">'+esc(x.text)+'</p>').join('')+'</div>';
      return '<pre>'+esc(JSON.stringify(p,null,2))+'</pre>';
    }
    function more(list,n){return list.length>n?'<p class="micro">외 '+(list.length-n)+'행 · 원문 전체는 JSON에 보존</p>':''}
    function internalPreview(output){
      const roles=Object.groupBy?Object.groupBy(output.sourceEvidence.roleAssignments,x=>x.role):output.sourceEvidence.roleAssignments.reduce((a,x)=>((a[x.role]??=[]).push(x),a),{});
      const rows=new Map(output.sourceEvidence.sourceRows.map(x=>[x.sourceRowId,x]));
      const keys=['item','conditional_response','reference','memo','field'];
      const blocked='<div class="blocked-panel"><strong>외부 projection 차단 · 내부 canonical draft만 보존</strong>'+esc(output.feasibility.blockers.join(' · '))+'</div>';
      const artifact=output.classification.taxonomy.primaryArtifact,draft=output.canonicalDraft;
      if(artifact==='memo'&&(draft.conditionalResponses.length||draft.references.length)){
        return blocked+'<div class="memo" style="margin-top:10px"><h3>'+esc(draft.flow?.title)+'</h3>'+
          (draft.items.length?'<p class="small"><b>평상시 실행</b><br>'+draft.items.map(x=>'□ '+esc(x.title)).join('<br>')+'</p>':'')+
          '<div class="response-card">'+draft.conditionalResponses.map(x=>'<div class="'+(x.severity==='emergency'||x.severity==='stop'?'danger':'')+'"><strong>'+esc(x.trigger)+'</strong><span class="small">'+esc(x.response)+'</span></div>').join('')+'</div>'+
          (draft.references.length?'<p class="small" style="margin-top:10px"><b>판단 참고</b><br>'+draft.references.map(x=>esc(x.label)).join('<br>')+'</p>':'')+'</div>';
      }
      if(artifact==='sheet'&&draft.items.length){
        return blocked+'<div class="table-scroll" style="margin-top:10px"><table class="data-table"><thead><tr><th>#</th><th>단계</th><th>항목</th><th>내부 상태</th></tr></thead><tbody>'+draft.items.slice(0,14).map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(draft.steps.find(s=>s.stepId===x.stepId)?.title)+'</td><td>'+esc(x.title)+'</td><td>not_started</td></tr>').join('')+'</tbody></table>'+more(draft.items,14)+'</div>';
      }
      return blocked+'<div class="role-board" style="margin-top:10px">'+keys.filter(k=>roles[k]?.length).map(k=>'<div class="role-col"><strong>'+esc(k)+' · '+roles[k].length+'</strong><ul>'+roles[k].slice(0,5).map(x=>'<li>'+esc(rows.get(x.sourceRowId)?.title)+'</li>').join('')+'</ul></div>').join('')+'</div>';
    }
    function renderCase(caseId){
      const c=DATA.cases.find(x=>x.caseId===caseId),g=c.gold,o=c.output,t=o.classification.taxonomy;
      document.querySelectorAll('.case-btn').forEach(x=>x.classList.toggle('active',x.dataset.id===caseId));
      document.getElementById('caseStage').innerHTML='<article class="card">'+
        '<div class="case-hero"><div><span class="badge '+(o.feasibility.conversionReadiness==='hold'?'warn':o.feasibility.executableAllowed?'good':'block')+'">'+esc(laneKo[c.lane])+' · '+esc(o.feasibility.conversionReadiness)+'</span><h3 style="font-size:28px;margin:12px 0 6px">'+esc(c.title)+'</h3><p class="small">'+esc(c.userJob)+'</p></div><span class="chip artifact">'+esc(artifactKo[t.primaryArtifact]||'No Flow')+'</span></div>'+
        '<div class="source-box"><b>확보한 원문</b> · '+esc(o.sourceEvidence.claimedScope)+' · SourceRow '+o.sourceEvidence.sourceRows.length+'개<br><a href="'+esc(c.sourceUrl)+'" target="_blank" rel="noreferrer">'+esc(c.sourcePublisher)+' 원문 열기 ↗</a></div>'+
        '<div class="grid two"><p class="before small"><b>기존 방식의 문제</b><br>'+esc(g.beforeProblem)+'</p><p class="after small"><b>v2.3 판단</b><br>'+esc(g.artifactReason)+'</p></div>'+
        '<div class="four-axis"><div class="axis"><label>생활 영역</label><strong>'+esc(t.primaryLifeArea)+'</strong></div><div class="axis"><label>원문 모양</label><strong>'+esc(t.sourceShape)+'</strong></div><div class="axis"><label>실행 패턴</label><strong>'+esc(patternKo[t.primaryExecutionPattern]||t.primaryExecutionPattern)+'</strong></div><div class="axis"><label>주 결과물</label><strong>'+esc(artifactKo[t.primaryArtifact]||'생성 안 함')+'</strong></div></div>'+projectionSummary(o)+
        '<div class="preview"><div class="preview-title"><b>실제 사용 미리보기</b><span class="micro" style="color:#d7e6df">'+esc(o.feasibility.publicExportAllowed?'공개 가능':'공개 전 gate 필요')+'</span></div><div class="preview-body">'+preview(o)+'</div></div>'+
        '<details class="fold"><summary>SourceRow 역할과 canonical DTO 보기</summary><div class="role-board" style="margin-top:10px">'+roleSummary(o)+'</div><pre>'+esc(JSON.stringify({feasibility:o.feasibility,classification:o.classification,canonicalDraft:o.canonicalDraft,projections:o.projections},null,2))+'</pre></details></article>';
    }
    function projectionSummary(o){return '<div class="projection-strip" aria-label="도구별 projection 상태">'+['calendar','checklist','todo','sheet','memo'].map(k=>{const p=o.projections[k];return '<div class="projection-state '+esc(p.availability)+'"><b>'+esc(artifactKo[k])+'</b><small>'+esc(p.availability)+(p.lossManifest?.length?' · 손실 '+p.lossManifest.length:'')+'</small></div>'}).join('')+'</div>'}
    function roleSummary(o){const rows=new Map(o.sourceEvidence.sourceRows.map(x=>[x.sourceRowId,x]));const groups=o.sourceEvidence.roleAssignments.reduce((a,x)=>((a[x.role]??=[]).push(x),a),{});return Object.entries(groups).map(([k,v])=>'<div class="role-col"><strong>'+esc(k)+' · '+v.length+'</strong><ul>'+v.slice(0,6).map(x=>'<li>'+esc(rows.get(x.sourceRowId)?.title)+'</li>').join('')+'</ul></div>').join('')||'<div class="role-col">SourceRow 0개</div>'}
    const nav=document.getElementById('caseNav');nav.innerHTML='<div class="swipe-hint">← 좌우로<br>사례 선택 →</div>'+DATA.cases.map(c=>'<button class="case-btn" data-id="'+esc(c.caseId)+'"><b>'+String(c.order).padStart(2,'0')+'. '+esc(c.shortTitle)+'</b><small>'+esc(navLane(c))+' · '+esc(artifactKo[c.expectedPrimaryArtifact]||c.expectedOutcome)+'</small></button>').join('');nav.addEventListener('click',e=>{const b=e.target.closest('.case-btn');if(b)renderCase(b.dataset.id)});renderCase(DATA.cases[0].caseId);
    const final=DATA.comparison?.finalMetrics;const metrics=[['SourceRow accounting',final?.sourceRoleAccountingRate],['발명 없는 Item',final?1-(final.unsupportedInferenceCount>0):null],['4축 독립 일치',final?.threeWayExactMatchRate],['Item keep rate',final?.medianItemKeepRate],['Projection 보존',final?.essentialProjectionRetentionRate],['조건형 안전 정밀도',final?.safetyCheckabilityPrecision],['분류 gold 일치',final?.coreTaxonomyGoldMatchRate],['Gate 독립 일치',final?.threeWayGateExactMatchRate]];document.getElementById('metricGrid').innerHTML=metrics.map(([k,v])=>'<div class="metric"><strong>'+pct(v)+'</strong><span>'+esc(k)+'</span><div class="bar"><i style="width:'+((v||0)*100)+'%"></i></div></div>').join('');
    const rounds=DATA.comparison?.rounds||[];document.getElementById('roundTimeline').innerHTML=rounds.length?'<table class="data-table"><thead><tr><th>Round</th><th>4축 3자 일치</th><th>Gate 3자 일치</th><th>Gold 분류</th><th>실측 교정 중앙값</th></tr></thead><tbody>'+rounds.map(x=>'<tr><td><b>'+esc(x.roundId)+'</b></td><td>'+pct(x.metrics.threeWayExactMatchRate)+'</td><td>'+pct(x.metrics.threeWayGateExactMatchRate)+'</td><td>'+pct(x.metrics.coreTaxonomyGoldMatchRate)+'</td><td>'+(typeof x.metrics.medianCorrectionMinutes==='number'?x.metrics.medianCorrectionMinutes.toFixed(2)+'분':'—')+'</td></tr>').join('')+'</tbody></table>':'<p class="small">Round 3 독립 검토·실측 연결 대기</p>';
  </script>
</body>
</html>`;

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, html, "utf8");
console.log(`Wrote ${path.relative(root, target)} (${data.cases.length} cases).`);
