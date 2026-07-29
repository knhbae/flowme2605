import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const dataPath = path.join(here, "content-ui-view-model-v1.json");
const outputPath = path.join(
  repoRoot,
  "docs/content-audit/2026-07-29-flow-content-ui-full-corpus-gallery-v1-ko.html",
);
const data = fs.readFileSync(dataPath, "utf8").replaceAll("<", "\\u003c");

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>FlowMe Full-Corpus 검토 Gallery</title>
<style>
:root{
  --canvas:#fafaf8;--surface:#fff;--surface2:#f5f6f8;--text:#1b1a17;--muted:#6e6b64;
  --border:#e7e4dd;--blue:#3654ff;--blueSoft:#edf1ff;--green:#1f8a5b;--greenSoft:#eaf7f0;
  --purple:#7357d9;--purpleSoft:#f0edff;--amber:#9a6812;--amberSoft:#fff7e8;--red:#c34343;
  --redSoft:#fff0f0;--shadow:0 10px 30px rgba(34,38,50,.08);--radius:14px;
  --header:64px;--rail:64px;--list:318px;--inspector:360px;
}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--canvas);color:var(--text);
  font-family:Pretendard,"Noto Sans KR",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
button,input,select,textarea{font:inherit;color:inherit}button{cursor:pointer}.hidden{display:none!important}
.app-header{position:fixed;z-index:50;inset:0 0 auto 0;height:var(--header);display:flex;align-items:center;
  gap:16px;padding:0 18px;background:rgba(255,255,255,.96);border-bottom:1px solid var(--border);backdrop-filter:blur(12px)}
.brand{font-weight:850;font-size:22px;letter-spacing:-.04em;white-space:nowrap}.brand span{color:var(--blue)}
.header-search{flex:1;max-width:560px;position:relative}.header-search input{width:100%;height:40px;border:1px solid var(--border);
  border-radius:10px;padding:0 42px 0 14px;background:var(--canvas)}.header-search button{position:absolute;right:4px;top:4px;width:32px;height:32px;border:0;background:none}
.header-stats{font-size:13px;color:var(--muted);white-space:nowrap}.header-stats strong{color:var(--text)}
.header-actions{margin-left:auto;display:flex;gap:8px}.btn{border:1px solid var(--border);background:var(--surface);border-radius:9px;
  min-height:38px;padding:0 13px;font-weight:700}.btn:hover{border-color:#b9c2ff}.btn.primary{background:var(--blue);border-color:var(--blue);color:white}
.btn.ghost{background:transparent}.btn.danger{color:var(--red)}.icon-btn{width:40px;padding:0;display:grid;place-items:center}
.shell{padding-top:var(--header);min-height:100vh}.nav-rail{position:fixed;z-index:30;left:0;top:var(--header);bottom:0;width:var(--rail);
  background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;padding:12px 7px;gap:8px}
.rail-btn{width:50px;min-height:52px;border:0;border-radius:10px;background:transparent;font-size:11px;color:var(--muted);
  display:grid;place-items:center;gap:2px}.rail-btn .ico{font-size:19px}.rail-btn.active{background:var(--blueSoft);color:var(--blue);font-weight:800}
.rail-bottom{margin-top:auto}.explorer{position:fixed;z-index:25;left:var(--rail);top:var(--header);bottom:0;width:var(--list);
  background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column}
.explorer-head{padding:14px;border-bottom:1px solid var(--border)}.explorer-title{display:flex;align-items:center;justify-content:space-between;font-weight:800}
.mini{font-size:12px;color:var(--muted)}.filter-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.filter-grid select,.filter-grid input{min-width:0;width:100%;height:36px;border:1px solid var(--border);border-radius:8px;background:white;padding:0 9px;font-size:12px}
.result-bar{display:flex;align-items:center;justify-content:space-between;margin-top:10px}.seg{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden}
.seg button{height:30px;border:0;border-right:1px solid var(--border);background:white;padding:0 9px;font-size:11px}.seg button:last-child{border-right:0}.seg button.active{background:var(--blueSoft);color:var(--blue)}
.content-list{overflow:auto;flex:1;padding:8px}.list-item{width:100%;text-align:left;border:1px solid transparent;border-radius:10px;background:transparent;padding:11px;margin:2px 0}
.list-item:hover{background:var(--surface2)}.list-item.active{border-color:var(--blue);background:var(--blueSoft)}
.list-title{font-weight:800;font-size:13px;line-height:1.35}.list-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;color:var(--muted);font-size:11px}
.workspace{margin-left:calc(var(--rail) + var(--list));margin-right:var(--inspector);min-height:calc(100vh - var(--header));padding:24px 24px 120px}
.inspector{position:fixed;z-index:24;right:0;top:var(--header);bottom:0;width:var(--inspector);background:var(--surface);border-left:1px solid var(--border);overflow:auto}
.inspector-tabs{position:sticky;top:0;z-index:2;background:white;display:flex;border-bottom:1px solid var(--border)}
.inspector-tabs button{flex:1;height:48px;border:0;background:white;font-weight:800;color:var(--muted)}.inspector-tabs button.active{color:var(--blue);box-shadow:inset 0 -2px var(--blue)}
.inspector-body{padding:18px}.section{margin-bottom:26px}.section h3{font-size:15px;margin:0 0 12px}.kv{display:grid;grid-template-columns:105px 1fr;gap:8px;font-size:12px;margin:8px 0}.kv dt{color:var(--muted)}.kv dd{margin:0;word-break:break-word}
.badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:750;background:var(--surface2);color:var(--muted)}
.badge.blue{background:var(--blueSoft);color:var(--blue)}.badge.green{background:var(--greenSoft);color:var(--green)}
.badge.amber{background:var(--amberSoft);color:var(--amber)}.badge.red{background:var(--redSoft);color:var(--red)}.badge.purple{background:var(--purpleSoft);color:var(--purple)}
.badge-row{display:flex;flex-wrap:wrap;gap:6px}.hero{background:white;border:1px solid var(--border);border-radius:18px;padding:24px;box-shadow:0 4px 18px rgba(38,43,60,.05)}
.eyebrow{font-size:12px;font-weight:800;color:var(--blue);letter-spacing:.08em;text-transform:uppercase}.hero h1{font-size:30px;line-height:1.2;letter-spacing:-.04em;margin:7px 0 10px}
.hero p{margin:0;color:var(--muted);line-height:1.65}.hero-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.metric-row{display:grid;grid-template-columns:repeat(5,minmax(100px,1fr));gap:10px;margin-top:18px}
.metric{background:var(--surface2);border-radius:11px;padding:12px}.metric strong{display:block;font-size:20px}.metric span{font-size:11px;color:var(--muted)}
.gallery-head{display:flex;align-items:end;justify-content:space-between;margin:28px 0 14px}.gallery-head h2{margin:0;font-size:22px}.gallery-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.content-card{border:1px solid var(--border);border-radius:14px;background:white;padding:17px;text-align:left;min-height:205px;display:flex;flex-direction:column;transition:.15s}
.content-card:hover{transform:translateY(-2px);box-shadow:var(--shadow);border-color:#bec6ff}.content-card h3{font-size:17px;line-height:1.35;margin:10px 0 7px}
.content-card p{font-size:13px;color:var(--muted);line-height:1.55;margin:0}.card-footer{margin-top:auto;padding-top:14px;display:flex;justify-content:space-between;color:var(--muted);font-size:11px}
.load-more{display:flex;justify-content:center;margin:22px}.detail-hero{padding:4px 4px 18px;border-bottom:1px solid var(--border)}.detail-top{display:flex;gap:16px;align-items:flex-start;justify-content:space-between}
.detail-hero h1{font-size:30px;letter-spacing:-.04em;margin:6px 0 10px}.detail-hero p{font-size:15px;color:var(--muted);line-height:1.65;max-width:780px;margin:0}
.detail-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px}.meta-box{border-left:2px solid var(--border);padding-left:11px}.meta-box label{display:block;color:var(--muted);font-size:11px;margin-bottom:5px}.meta-box strong{font-size:13px;word-break:break-word}
.mode-tabs{position:sticky;top:var(--header);z-index:10;background:var(--canvas);display:flex;gap:4px;overflow:auto;padding:12px 0 10px;border-bottom:1px solid var(--border)}
.mode-tabs button{white-space:nowrap;border:0;background:transparent;border-radius:8px;padding:9px 12px;color:var(--muted);font-weight:750}.mode-tabs button.active{background:var(--blue);color:white}
.panel{background:white;border:1px solid var(--border);border-radius:var(--radius);margin-top:16px}.panel-head{padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px}
.panel-head h2,.panel-head h3{margin:0;font-size:17px}.panel-body{padding:18px}.info-banner{border-radius:11px;padding:13px 14px;background:var(--blueSoft);color:#243ca3;font-size:13px;line-height:1.55}
.info-banner.warning{background:var(--amberSoft);color:#75520c}.info-banner.danger{background:var(--redSoft);color:#9d3333}.step-card{border:1px solid var(--border);border-radius:12px;margin-bottom:12px;overflow:hidden}
.step-card summary{list-style:none;display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:var(--surface2);font-weight:800;cursor:pointer}.step-card summary::-webkit-details-marker{display:none}
.item-row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:10px;padding:13px 15px;border-top:1px solid var(--border)}.check-circle{width:22px;height:22px;border:1.5px solid #a9aaa8;border-radius:50%;background:white}
.item-title{font-weight:760;font-size:14px}.item-detail{font-size:12px;color:var(--muted);line-height:1.55;margin-top:4px}.item-submeta{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.projection-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}.summary-box{background:var(--surface2);border-radius:10px;padding:12px}.summary-box span{font-size:11px;color:var(--muted)}.summary-box strong{display:block;margin-top:4px;font-size:14px}
.loss-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.loss-box{border:1px solid var(--border);border-radius:11px;padding:13px}.loss-box h4{font-size:12px;margin:0 0 8px}.loss-box ul{margin:0;padding-left:18px;font-size:12px;color:var(--muted);line-height:1.6}
.agenda{display:grid;gap:10px}.agenda-row{border:1px solid var(--border);border-radius:11px;padding:13px;display:grid;grid-template-columns:140px 1fr;gap:12px}.agenda-date{font-weight:800;color:var(--blue)}
.check-group{border:1px solid var(--border);border-radius:12px;margin-bottom:12px}.check-group h3{font-size:14px;margin:0;padding:12px 14px;background:var(--surface2)}.check-group .item-row{border-top:1px solid var(--border)}
.todo-parent{border:1px solid var(--border);border-radius:12px;margin-bottom:12px;overflow:hidden}.todo-parent>h3{margin:0;padding:12px 14px;background:#f3f5ff;font-size:14px}.todo-task{padding:11px 14px;border-top:1px solid var(--border);display:flex;gap:10px}.todo-task.sub{padding-left:32px}
.sheet-wrap{overflow:auto;border:1px solid var(--border);border-radius:10px}.sheet{width:100%;border-collapse:collapse;font-size:12px;min-width:760px}.sheet th{position:sticky;top:0;background:var(--surface2);text-align:left}.sheet th,.sheet td{padding:10px;border-bottom:1px solid var(--border);vertical-align:top}.sheet td{max-width:300px;word-break:break-word}
.memo{margin:0;white-space:pre-wrap;background:#fbfbfc;border:1px solid var(--border);border-radius:10px;padding:18px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.65}
.pacing-grid{display:grid;grid-template-columns:330px 1fr;gap:16px}.form-card{border:1px solid var(--border);border-radius:12px;padding:16px}.field{margin-bottom:13px}.field label{display:block;font-size:12px;font-weight:750;margin-bottom:6px}
.field input,.field select,.field textarea{width:100%;border:1px solid var(--border);border-radius:8px;padding:9px;background:white}.weekday-row{display:flex;gap:4px}.weekday-row button{flex:1;border:1px solid var(--border);background:white;border-radius:7px;padding:7px 0}.weekday-row button.active{background:var(--blue);color:white}
.schedule-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.schedule-card{border:1px solid var(--border);border-radius:9px;padding:11px}.schedule-card strong{display:block;font-size:13px}.schedule-card span{font-size:11px;color:var(--muted)}
.event-layout{display:grid;grid-template-columns:1fr 1fr;gap:14px}.event-card{border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px}.event-card.selected{border-color:var(--blue);background:var(--blueSoft)}
.lineage-flow{display:flex;gap:8px;overflow:auto;padding:10px 0 18px}.node-chip{min-width:128px;border:1px solid var(--border);background:white;border-radius:10px;padding:11px;text-align:left}.node-chip.active{border-color:var(--blue);background:var(--blueSoft)}
.json-view{max-height:440px;overflow:auto;white-space:pre-wrap;background:#151821;color:#d9e0ef;padding:16px;border-radius:10px;font-size:11px;line-height:1.6}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.empty{padding:44px 20px;text-align:center;color:var(--muted)}.empty strong{display:block;color:var(--text);font-size:17px;margin-bottom:8px}
.review-question{margin-bottom:14px}.review-question>label{font-size:12px;font-weight:800;display:block;margin-bottom:7px}.choice-row{display:flex;gap:6px;flex-wrap:wrap}
.choice-row label{border:1px solid var(--border);border-radius:8px;padding:7px 9px;font-size:12px}.choice-row input{margin-right:4px}.review-status{display:flex;gap:7px;margin-bottom:14px}.review-status label{flex:1;border:1px solid var(--border);border-radius:9px;padding:9px;text-align:center;font-weight:800;font-size:12px}
.review-status .go:has(input:checked){background:var(--greenSoft);border-color:var(--green)}.review-status .modify:has(input:checked){background:var(--amberSoft);border-color:#d99d2b}.review-status .hold:has(input:checked){background:var(--redSoft);border-color:var(--red)}
.review-status input{position:absolute;opacity:0}.mobile-only{display:none}.mobile-bar{display:none}.toast{position:fixed;z-index:100;left:50%;bottom:24px;transform:translateX(-50%);background:#151821;color:white;padding:10px 14px;border-radius:9px;box-shadow:var(--shadow);font-size:13px}
dialog{border:0;border-radius:14px;padding:0;box-shadow:var(--shadow);max-width:min(620px,calc(100vw - 28px));width:100%}dialog::backdrop{background:rgba(15,18,25,.35)}.dialog-head{padding:16px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}.dialog-body{padding:18px}.dialog-actions{padding:14px 18px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px}
@media(max-width:1180px){:root{--list:280px;--inspector:320px}.gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.metric-row{grid-template-columns:repeat(3,1fr)}}
@media(max-width:900px){.header-stats{display:none}.explorer{left:0;transform:translateX(-100%);transition:.2s;z-index:80;width:min(360px,88vw);top:0;padding-top:64px}.explorer.open{transform:none;box-shadow:var(--shadow)}
  .nav-rail{display:none}.workspace{margin-left:0;margin-right:0;padding:18px 18px 110px}.inspector{display:none}.header-actions .desktop-only{display:none}.mobile-only{display:inline-flex}
  .detail-meta{grid-template-columns:repeat(2,1fr)}.pacing-grid,.event-layout{grid-template-columns:1fr}.mobile-bar{display:flex;position:fixed;z-index:40;left:0;right:0;bottom:0;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.98);border-top:1px solid var(--border);gap:8px}.mobile-bar .btn{flex:1}
  .mobile-review{display:block!important}.gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){:root{--header:58px}.app-header{padding:0 12px;gap:9px}.brand{font-size:19px}.header-search{display:none}.header-actions .btn:not(.icon-btn){display:none}
  .workspace{padding:14px 12px 110px}.hero{padding:18px}.hero h1,.detail-hero h1{font-size:24px}.metric-row{grid-template-columns:repeat(2,1fr)}.gallery-grid{grid-template-columns:1fr}.content-card{min-height:175px}
  .detail-top{display:block}.detail-meta{grid-template-columns:1fr 1fr}.mode-tabs{top:var(--header);margin:0 -12px;padding:9px 12px}.panel-body{padding:14px}.projection-summary{grid-template-columns:1fr}.loss-grid,.two-col{grid-template-columns:1fr}
  .agenda-row{grid-template-columns:1fr}.schedule-list{grid-template-columns:1fr}.item-row{grid-template-columns:25px minmax(0,1fr)}.item-row>.badge{grid-column:2}.gallery-head{align-items:start;gap:8px}
  .header-actions{gap:4px}.mobile-bar{padding-left:12px;padding-right:12px}.sheet-card-list{display:grid!important}.sheet-wrap.mobile-hide{display:none}}
</style>
</head>
<body>
<header class="app-header">
  <button class="btn icon-btn mobile-only" id="openExplorer" aria-label="콘텐츠 목록 열기">☰</button>
  <div class="brand">FLOW<span>Me</span> <small class="mini">Lab</small></div>
  <div class="header-search"><input id="globalSearch" placeholder="콘텐츠 제목, 사용자 job, 제공자 검색" aria-label="전체 콘텐츠 검색"><button aria-label="검색">⌕</button></div>
  <div class="header-stats" id="headerStats"></div>
  <div class="header-actions">
    <button class="btn desktop-only" data-action="copy-link">직접 링크</button>
    <button class="btn desktop-only" data-action="export-review">검토 JSON</button>
    <button class="btn icon-btn" data-action="open-import" aria-label="검토 JSON 가져오기">⇧</button>
  </div>
</header>
<div class="shell">
  <nav class="nav-rail" aria-label="주요 화면">
    <button class="rail-btn active" data-route="#gallery"><span class="ico">▦</span>전체</button>
    <button class="rail-btn" data-action="next-unreviewed"><span class="ico">◌</span>다음</button>
    <button class="rail-btn" data-route="#coverage"><span class="ico">◎</span>커버리지</button>
    <div class="rail-bottom"><button class="rail-btn" data-action="open-import"><span class="ico">⇅</span>백업</button></div>
  </nav>
  <aside class="explorer" id="explorer" aria-label="콘텐츠 탐색">
    <div class="explorer-head">
      <div class="explorer-title"><span>콘텐츠 목록</span><button class="btn icon-btn mobile-only" id="closeExplorer" aria-label="목록 닫기">×</button></div>
      <div class="filter-grid">
        <select id="tierFilter" aria-label="corpus tier"></select>
        <select id="lifeFilter" aria-label="카테고리"></select>
        <select id="projectionFilter" aria-label="기본 결과물"></select>
        <select id="reviewFilter" aria-label="검토 상태"></select>
        <select id="sourceFilter" aria-label="원문 형식"></select>
        <select id="temporalFilter" aria-label="일정 유형"></select>
      </div>
      <div class="result-bar"><span class="mini" id="filterCount"></span><span class="seg"><button data-view="card" class="active">카드</button><button data-view="list">목록</button></span></div>
    </div>
    <div class="content-list" id="contentList"></div>
  </aside>
  <main class="workspace" id="workspace"></main>
  <aside class="inspector" id="inspector" aria-label="출처와 검토">
    <div class="inspector-tabs"><button class="active" data-inspector="source">출처·손실</button><button data-inspector="review">내 검토</button></div>
    <div class="inspector-body" id="inspectorBody"></div>
  </aside>
</div>
<div class="mobile-bar" id="mobileBar"><button class="btn" data-action="open-mobile-review">검토하기</button><button class="btn primary" data-action="next-unreviewed">다음 미검토</button></div>
<dialog id="importDialog">
  <div class="dialog-head"><strong>검토 JSON 가져오기</strong><button class="btn icon-btn" data-action="close-import">×</button></div>
  <div class="dialog-body">
    <p class="mini">현재 corpus fingerprint와 contentId를 검증합니다. 교체 전에는 자동 백업하며 오류 시 기존 상태를 유지합니다.</p>
    <div class="field"><label for="importFile">JSON 파일</label><input id="importFile" type="file" accept="application/json"></div>
    <div class="field"><label for="importMode">가져오기 방식</label><select id="importMode"><option value="merge">현재 검토와 병합</option><option value="replace">현재 검토를 교체</option></select></div>
    <div id="importResult" class="mini"></div>
  </div>
  <div class="dialog-actions"><button class="btn" data-action="close-import">취소</button><button class="btn primary" data-action="run-import">가져오기</button></div>
</dialog>
<dialog id="mobileReviewDialog">
  <div class="dialog-head"><strong>이 콘텐츠 검토</strong><button class="btn icon-btn" data-action="close-mobile-review">×</button></div>
  <div class="dialog-body" id="mobileReviewBody"></div>
</dialog>
<div id="toast" class="toast hidden" role="status" aria-live="polite"></div>
<script id="corpusData" type="application/json">${data}</script>
<script>
const DATA=JSON.parse(document.getElementById("corpusData").textContent);
const CONTENTS=DATA.contents;
const BY_ID=new Map(CONTENTS.map(c=>[c.contentId,c]));
const STORAGE_KEY="flowme-full-corpus-review-v1";
const PROJECTIONS=["calendar","checklist","todo","sheet","memo"];
const LABEL={calendar:"Calendar",checklist:"Checklist",todo:"Todo",sheet:"Sheet",memo:"Memo"};
const LIFE={home_living:"집·생활",family_parenting:"가족·육아",study_reading:"학습·독서",work_career:"일·커리어",health_fitness:"건강·운동",meals_grocery:"식사·장보기",money_admin_purchase:"돈·행정·구매",travel_outings:"여행·외출",hobby_pet:"취미·반려"};
const TIER={product_candidate:"Product candidate",structure_probe:"Structure probe",boundary_control:"Boundary",historical_preview:"Historical"};
const state={search:"",tier:"product_candidate",life:"all",projection:"all",review:"all",source:"all",temporal:"all",view:"card",limit:24,inspector:"source",nodeId:null,pacing:{},selectedOccurrence:{},todoCapability:true};
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[m]))}
function safeJson(v){return esc(JSON.stringify(v,null,2))}
function options(values,labels,allLabel){return '<option value="all">'+allLabel+'</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(labels?.[v]??v)+'</option>').join("")}
function reviewState(){
  try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY));if(p?.schemaVersion===1&&p.corpusFingerprint===DATA.corpusFingerprint)return p}catch{}
  return {schemaVersion:1,corpusFingerprint:DATA.corpusFingerprint,exportedAt:null,reviewsByContentId:Object.fromEntries(CONTENTS.map(c=>[c.contentId,{userReviewStatus:"not_reviewed",verdict:null,answers:{},comment:"",updatedAt:null}])),pacingByContentId:{},lastRoute:"#gallery"}
}
let reviews=reviewState();
function saveState(){reviews.lastRoute=location.hash||"#gallery";localStorage.setItem(STORAGE_KEY,JSON.stringify(reviews))}
function reviewFor(id){return reviews.reviewsByContentId[id]??{userReviewStatus:"not_reviewed",verdict:null,answers:{},comment:"",updatedAt:null}}
function isReviewed(id){return reviewFor(id).userReviewStatus==="reviewed"}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.add("hidden"),2300)}
function badge(text,tone=""){return '<span class="badge '+tone+'">'+esc(text)+'</span>'}
function toneFor(value){if(["go","available_now","generated","primary","lossless_or_low_loss"].includes(value))return"green";if(["modify","preview_requires_overlay","available_after_user_overlay","secondary","bounded_loss"].includes(value))return"amber";if(["hold","prohibited","unavailable","misleading_or_prohibited"].includes(value))return"red";return"blue"}
function getFiltered(){
  const q=state.search.trim().toLowerCase();
  return CONTENTS.filter(c=>{
    const r=reviewFor(c.contentId);
    return(!q||[c.title,c.userJob,c.source.provider,c.source.title].join(" ").toLowerCase().includes(q))
      &&(state.tier==="all"||c.corpusTier===state.tier)
      &&(state.life==="all"||c.taxonomy.primaryLifeArea===state.life)
      &&(state.projection==="all"||c.primaryProjection===state.projection)
      &&(state.review==="all"||(state.review==="reviewed"?r.userReviewStatus==="reviewed":r.userReviewStatus!=="reviewed"))
      &&(state.source==="all"||c.source.sourceFormat===state.source)
      &&(state.temporal==="all"||c.taxonomy.temporalIntent===state.temporal)
  })}
function route(){
  const h=location.hash||reviews.lastRoute||"#gallery";
  if(h==="#gallery")return{kind:"gallery"};
  if(h==="#coverage")return{kind:"coverage"};
  const m=h.match(/^#content\\/([^/]+)(?:\\/(projection)\\/([^/]+)|\\/(pacing|event|lineage|review))?$/);
  if(!m)return{kind:"gallery"};
  return{kind:"content",contentId:decodeURIComponent(m[1]),mode:m[2]==="projection"?(m[3]||"calendar"):(m[4]||"flow")}
}
function setRoute(hash){location.hash=hash}
function contentHash(c,mode="flow"){const base="#content/"+encodeURIComponent(c.contentId);return mode==="flow"?base:PROJECTIONS.includes(mode)?base+"/projection/"+mode:base+"/"+mode}
function initFilters(){
  tierFilter.innerHTML=options(DATA.filters.corpusTier,TIER,"전체 tier");tierFilter.value=state.tier;
  lifeFilter.innerHTML=options(DATA.filters.lifeArea,LIFE,"전체 카테고리");
  projectionFilter.innerHTML=options(PROJECTIONS,LABEL,"전체 결과물");
  reviewFilter.innerHTML='<option value="all">전체 검토</option><option value="not_reviewed">미검토</option><option value="reviewed">검토 완료</option>';
  sourceFilter.innerHTML=options(DATA.filters.sourceFormat,null,"전체 원문");
  temporalFilter.innerHTML=options(DATA.filters.temporalIntent,null,"전체 일정");
  [tierFilter,lifeFilter,projectionFilter,reviewFilter,sourceFilter,temporalFilter].forEach(el=>el.addEventListener("change",()=>{state[el.id.replace("Filter","")]=el.value;state.limit=24;render()}));
  globalSearch.addEventListener("input",e=>{state.search=e.target.value;state.limit=24;render()});
}
function renderList(){
  const filtered=getFiltered();filterCount.textContent=filtered.length+"개";
  const current=route().contentId;
  contentList.innerHTML=filtered.map(c=>'<button class="list-item '+(c.contentId===current?"active":"")+'" data-content="'+esc(c.contentId)+'"><div class="list-title">'+esc(c.title)+'</div><div class="list-meta"><span>'+esc(LIFE[c.taxonomy.primaryLifeArea]??c.taxonomy.primaryLifeArea)+'</span><span>·</span><span>'+esc(LABEL[c.primaryProjection])+'</span><span>·</span><span class="'+(isReviewed(c.contentId)?"":"")+'">'+(isReviewed(c.contentId)?"검토 완료":"미검토")+'</span></div></button>').join("");
}
function renderHeader(){
  const normal=DATA.counts.normal;const done=CONTENTS.filter(c=>isReviewed(c.contentId)).length;
  headerStats.innerHTML='<strong>정상·구조 '+normal+'개</strong> · 전체 '+DATA.counts.gallery+'개 · 사용자 검토 '+done+'개';
}
function card(c){const items=c.canonical.items?.length??0,rows=c.canonical.sourceRows?.length??0;return '<button class="content-card" data-content="'+esc(c.contentId)+'"><div class="badge-row">'+badge(TIER[c.corpusTier],c.corpusTier==="product_candidate"?"blue":c.corpusTier==="structure_probe"?"purple":c.corpusTier==="boundary_control"?"red":"amber")+badge(LABEL[c.primaryProjection],toneFor("primary"))+(isReviewed(c.contentId)?badge("검토 완료","green"):badge("미검토"))+'</div><h3>'+esc(c.title)+'</h3><p>'+esc(c.saveReason)+'</p><div class="card-footer"><span>SourceRow '+rows+' · Item '+items+'</span><span>'+esc(c.source.provider)+'</span></div></button>'}
function renderGallery(){
  const filtered=getFiltered();const visible=filtered.slice(0,state.limit);
  return '<section class="hero"><div class="eyebrow">Full-Corpus Validation Workbench</div><h1>설명보다 실제 Flow '+DATA.counts.normal+'개를 먼저 봅니다</h1><p>원문에서 나온 모든 Item과 다섯 projection을 한 건씩 열어보고, 일정화·행사 회차·데이터 provenance까지 직접 판단하는 내부 검토 환경입니다. 자동·에이전트 QA는 사용자 검토가 아닙니다.</p><div class="metric-row"><div class="metric"><strong>'+DATA.counts.normal+'</strong><span>정상·구조 콘텐츠</span></div><div class="metric"><strong>'+DATA.counts.item.toLocaleString()+'</strong><span>전체 Item</span></div><div class="metric"><strong>'+DATA.counts.sourceRow.toLocaleString()+'</strong><span>전체 SourceRow</span></div><div class="metric"><strong>'+DATA.counts.projectionCell+'</strong><span>5-format 조합</span></div><div class="metric"><strong>NOT REVIEWED</strong><span>실제 사용자 검토</span></div></div><div class="hero-actions"><button class="btn primary" data-action="next-unreviewed">첫 미검토 열기</button><button class="btn" data-content="canonical:base-opentutorials-web1-progress">WEB1 일정화 보기</button><button class="btn" data-content="canonical:base-moving-d30">이사 Checklist 보기</button><button class="btn" data-content="events:event-kr-multi-show-choir">다회차 행사 보기</button></div></section><div class="gallery-head"><div><div class="eyebrow">현재 필터</div><h2>'+filtered.length+'개 콘텐츠</h2></div><span class="mini">기본 화면은 Product candidate입니다</span></div><section class="gallery-grid '+(state.view==="list"?"list-mode":"")+'">'+visible.map(card).join("")+'</section>'+(visible.length<filtered.length?'<div class="load-more"><button class="btn" data-action="load-more">다음 24개 보기</button></div>':'')+'<section class="panel"><div class="panel-head"><h2>증거 tier를 섞지 않습니다</h2></div><div class="panel-body two-col"><div><h3>정상 count</h3><p class="mini">Product candidate '+DATA.counts.productCandidate+'개와 Structure probe '+DATA.counts.structureProbe+'개만 구조 검증 수에 포함됩니다.</p></div><div><h3>별도 보기</h3><p class="mini">Boundary '+DATA.counts.boundary+'개와 Historical '+DATA.counts.historical+'개는 멈춤·과거 UI 참고용이며 정상 수를 채우지 않습니다.</p></div></div></section>'
}
function modeTabs(c,mode){const tabs=[["flow","Flow"],...PROJECTIONS.map(p=>[p,LABEL[p]]),["pacing","일정화"],["event","행사"],["lineage","데이터 구조"]];return '<nav class="mode-tabs" aria-label="콘텐츠 보기">'+tabs.map(([id,label])=>'<button class="'+(mode===id?"active":"")+'" data-mode="'+id+'" data-id="'+esc(c.contentId)+'">'+label+'</button>').join("")+'</nav>'}
function itemHtml(item){const sourceCount=(item.sourceRowIds??item.sourceRefIds??[]).length;const schedule=item.schedule?item.schedule.mode??item.schedule.type:"날짜 없음";return '<div class="item-row"><button class="check-circle" aria-label="완료 상태 예시"></button><div><div class="item-title">'+esc(item.title)+'</div>'+(item.description?'<div class="item-detail">'+esc(item.description)+'</div>':'')+'<div class="item-submeta">'+badge(schedule,item.schedule?"blue":"")+badge("근거 "+sourceCount+"행","purple")+(item.completion?.doneWhen?badge("완료 기준 있음","green"):badge("완료 상태만","amber"))+'</div></div><span class="badge">'+esc(item.intent??"act")+'</span></div>'}
function renderFlow(c){
  if(c.contentMode==="event_source_before_user_intent")return '<div class="panel"><div class="panel-body"><div class="info-banner">이 콘텐츠는 행사 source fact입니다. 아직 Item이 없는 것이 정상이며, 회차를 고르고 저장·예약·참석 의도를 정하면 개인 Item이 생깁니다.</div><button class="btn primary" style="margin-top:14px" data-mode="event" data-id="'+esc(c.contentId)+'">행사 회차 선택하기</button></div></div>';
  if(c.contentMode==="field_template_probe")return '<div class="panel"><div class="panel-head"><h2>Field template</h2>'+badge("Item 0이 정상","amber")+'</div><div class="panel-body"><div class="info-banner warning">표의 모든 행을 곧바로 할 일로 만들지 않습니다. 사용자가 대상 행과 기준값을 선택한 뒤에만 실행 Item을 활성화합니다.</div>'+renderSheetLike(c.canonical.sourceRows.map(r=>({recordType:"source_row",id:r.sourceRowId,title:r.title,detail:r.detail,parentId:r.group??"",sourceRowIds:[r.sourceRowId]})))+'</div></div>';
  if(c.contentMode==="historical_preview")return renderHistorical(c);
  if(c.contentMode==="boundary_control")return '<div class="panel"><div class="panel-body"><div class="info-banner danger">정상 Flow 생성을 중지했습니다. '+esc(c.evidenceNotes.join(" "))+'</div></div></div>';
  const stepMap=new Map(c.canonical.steps.map(s=>[s.stepId,s]));const itemMap=new Map(c.canonical.items.map(i=>[i.itemId,i]));
  return '<section class="panel"><div class="panel-head"><h2>전체 Step과 Item</h2><div class="badge-row">'+badge(c.canonical.steps.length+" Step","blue")+badge(c.canonical.items.length+" Item","green")+'</div></div><div class="panel-body">'+c.canonical.steps.sort((a,b)=>(a.order??0)-(b.order??0)).map((step,idx)=>'<details class="step-card" '+(idx<2?"open":"")+'><summary><span>'+esc(step.title)+'</span>'+badge((step.itemIds??[]).length+"개")+'</summary>'+(step.itemIds??[]).map(id=>itemMap.get(id)).filter(Boolean).map(itemHtml).join("")+'</details>').join("")+'</div></section><section class="panel"><div class="panel-head"><h2>시작에 필요한 입력</h2></div><div class="panel-body">'+(c.minimumInputs.length?c.minimumInputs.map(i=>'<div class="item-row"><span class="badge '+(i.required?"red":"")+'">'+(i.required?"필수":"선택")+'</span><div><div class="item-title">'+esc(i.label)+'</div><div class="item-detail">'+esc(i.type)+' · '+esc(i.source)+'</div></div></div>').join(""):'<div class="info-banner">원문을 다시 입력할 필요 없이 0개 입력으로 시작할 수 있습니다.</div>')+'</div></section>'
}
function projectionCell(c,p){return c.projectionCells.find(x=>x.projection===p)}
function projectionCellForUi(c,p){
  const base=projectionCell(c,p),confirmed=reviews.pacingByContentId[c.contentId];
  if(!confirmed?.assignments?.length)return base;
  const policy=confirmed.policy??{},assignments=confirmed.assignments;
  if(p==="calendar"&&policy.output==="calendar"){
    let records=[];
    if(policy.bundle==="session_bundle"){
      const byDate=new Map();
      for(const a of assignments){const rows=byDate.get(a.date)??[];rows.push(a);byDate.set(a.date,rows)}
      records=[...byDate.entries()].map(([date,rows])=>({
        recordType:"event",
        component:"VEVENT",
        title:c.title+" · "+rows.length+"개",
        detail:"사용자가 확정한 pacing policy로 묶은 개인 학습 세션",
        schedule:{start:date,allDay:true,scheduleOwner:"user_overlay"},
        childItemIds:rows.map(a=>a.itemId),
        derivation:"pacing_policy",
        suggestionStatus:"confirmed"
      }))
    }else{
      records=assignments.map(a=>({
        recordType:"event",
        component:"VEVENT",
        title:a.title,
        detail:"사용자가 확정한 pacing policy로 배정한 개인 일정",
        schedule:{start:a.date,allDay:true,scheduleOwner:"user_overlay"},
        childItemIds:[a.itemId],
        derivation:"pacing_policy",
        suggestionStatus:"confirmed"
      }))
    }
    return {...base,availability:"available_now",generationState:"generated",minimumUserInputs:[],output:{kind:"calendar",records,scheduleOwner:"user_overlay",derivation:"pacing_policy"},preview:null,counts:{...base.counts,destinationRecordCount:records.length,groupCount:policy.bundle==="session_bundle"?records.length:0,childEntryCount:assignments.length,componentCount:records.length}}
  }
  if(p==="todo"&&policy.output==="todo_due"&&base.output){
    const dueByItem=new Map(assignments.map(a=>[a.itemId,a.date]));
    const addDue=t=>({...t,due:dueByItem.get(t.canonicalItemId)??t.due??null,scheduleOwner:dueByItem.has(t.canonicalItemId)?"user_overlay":t.scheduleOwner??null,derivation:dueByItem.has(t.canonicalItemId)?"pacing_policy":t.derivation??null});
    return {...base,availability:"available_now",generationState:"generated",minimumUserInputs:[],output:{...base.output,tasks:(base.output.tasks??[]).map(addDue),flatFallback:(base.output.flatFallback??[]).map(addDue),scheduleOwner:"user_overlay",derivation:"pacing_policy"}}
  }
  return base
}
function projectionHeader(cell){return '<div class="projection-summary"><div class="summary-box"><span>추천도</span><strong>'+badge(cell.recommendation,toneFor(cell.recommendation))+'</strong></div><div class="summary-box"><span>생성 가능</span><strong>'+badge(cell.availability,toneFor(cell.availability))+'</strong></div><div class="summary-box"><span>정보 보존</span><strong>'+badge(cell.fidelity,toneFor(cell.fidelity))+'</strong></div></div><div class="loss-grid"><div class="loss-box"><h4>보존</h4><ul>'+(cell.preservedPaths.length?cell.preservedPaths.map(x=>'<li>'+esc(x)+'</li>').join(""):'<li>없음</li>')+'</ul></div><div class="loss-box"><h4>손실·생략</h4><ul>'+(cell.lossManifest.length?cell.lossManifest.map(x=>'<li>'+esc(x.reason)+'</li>').join(""):(cell.omittedPaths.length?cell.omittedPaths.map(x=>'<li>'+esc(x)+'</li>').join(""):'<li>명시된 손실 없음</li>'))+'</ul></div></div>'}
function renderCalendar(cell){
  const payload=cell.output??cell.preview;const records=payload?.records??[];
  if(cell.generationState==="prohibited")return '<div class="empty"><strong>Calendar를 만들지 않습니다</strong>'+esc(cell.prohibitionReason)+'</div>';
  return (cell.generationState==="preview_requires_overlay"?'<div class="info-banner warning">확정 일정이 아니라 '+esc(cell.minimumUserInputs.join(", ")||"사용자 intent")+' 뒤에 생성 가능한 draft preview입니다.</div>':'')+'<div class="agenda" style="margin-top:14px">'+(records.length?records.map(r=>'<div class="agenda-row"><div class="agenda-date">'+esc(r.schedule?.start??(r.schedule?.dayOffset!=null?"D"+(r.schedule.dayOffset>=0?"+":"")+r.schedule.dayOffset:"기준일 필요"))+'</div><div><strong>'+esc(r.title)+'</strong><div class="item-detail">'+esc(r.detail??"")+'</div><div class="item-submeta">'+badge((r.childItemIds??[]).length+" Item")+badge(r.component??"VEVENT","blue")+badge(r.schedule?.scheduleOwner??r.scheduleOwner??"source",r.schedule?.scheduleOwner==="user_overlay"||r.scheduleOwner==="user_overlay"?"amber":"green")+badge(r.derivation??r.suggestionStatus??"direct","purple")+'</div></div></div>').join(""):'<div class="empty"><strong>아직 event record가 없습니다</strong>일정화 Playground에서 preview를 만들어보세요.</div>')+'</div>'
}
function renderChecklist(cell){const groups=cell.output?.groups??[];if(!groups.length)return'<div class="empty"><strong>Checklist 없음</strong>'+esc(cell.prohibitionReason)+'</div>';return groups.map(g=>'<section class="check-group"><h3>'+esc(g.title)+' · '+g.entries.length+'개</h3>'+g.entries.map(item=>'<div class="item-row"><button class="check-circle"></button><div><div class="item-title">'+esc(item.title)+'</div><div class="item-detail">'+esc(item.detail??"")+'</div></div></div>').join("")+'</section>').join("")}
function renderTodo(cell){const out=cell.output;if(!out)return'<div class="empty"><strong>Todo 없음</strong>'+esc(cell.prohibitionReason)+'</div>';const grouped=state.todoCapability&&out.parents?.length;const due=t=>t.due?'<div class="item-submeta">'+badge("due "+t.due,"amber")+badge(t.scheduleOwner??"source","purple")+'</div>':"";return '<div class="info-banner">Todo는 재정렬·연기가 가능한 독립 queue입니다. <button class="btn" data-action="toggle-todo-capability">'+(grouped?"flat fallback 보기":"parent/subtask 보기")+'</button></div><div style="margin-top:14px">'+(grouped?out.parents.map(p=>'<section class="todo-parent"><h3>'+esc(p.title)+'</h3>'+out.tasks.filter(t=>t.parentTaskId===p.taskId).map(t=>'<div class="todo-task sub"><button class="check-circle"></button><div><strong>'+esc(t.title)+'</strong><div class="item-detail">'+esc(t.detail??"")+'</div>'+due(t)+'</div></div>').join("")+'</section>').join(""):out.flatFallback.map(t=>'<div class="todo-task"><button class="check-circle"></button><div><strong>'+esc(t.title)+'</strong>'+due(t)+'</div></div>').join(""))+'</div>'}
function renderSheetLike(rows){if(!rows.length)return'<div class="empty"><strong>표시할 행 없음</strong></div>';const cols=unique(rows.flatMap(r=>Object.keys(r))).filter(k=>!["original"].includes(k)).slice(0,9);return '<div class="sheet-wrap mobile-hide"><table class="sheet"><thead><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join("")+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(c=>'<td>'+esc(Array.isArray(r[c])?r[c].join(", "):typeof r[c]==="object"?JSON.stringify(r[c]):r[c]??"")+'</td>').join("")+'</tr>').join("")+'</tbody></table></div><div class="sheet-card-list hidden">'+rows.map(r=>'<div class="schedule-card"><strong>'+esc(r.title??r.id??"행")+'</strong><span>'+esc(r.detail??r.start??"")+'</span></div>').join("")+'</div>'}
function unique(a){return[...new Set(a)]}
function renderProjection(c,p){const cell=projectionCellForUi(c,p);let body="";if(p==="calendar")body=renderCalendar(cell);if(p==="checklist")body=renderChecklist(cell);if(p==="todo")body=renderTodo(cell);if(p==="sheet")body=renderSheetLike(cell.output?.rows??[]);if(p==="memo")body='<pre class="memo">'+esc(cell.output?.markdown??cell.prohibitionReason??"")+'</pre>';return '<section class="panel"><div class="panel-head"><div><div class="eyebrow">'+esc(cell.generationState)+'</div><h2>'+LABEL[p]+' 실제 결과</h2></div><div class="badge-row">'+badge(cell.counts.destinationRecordCount+" destination records","blue")+badge(cell.counts.childEntryCount+" child entries")+'</div></div><div class="panel-body">'+projectionHeader(cell)+'<div style="margin-top:18px">'+body+'</div>'+(cell.fallback?'<div class="info-banner" style="margin-top:16px"><strong>Fallback</strong><br>'+esc(cell.fallback)+'</div>':'')+'</div></section>'}
function pacingPolicy(c){return state.pacing[c.contentId]??{startDate:"2026-08-03",mode:"items_per_day",rate:2,weekdays:[1,2,3,4,5],output:"todo_due",bundle:"per_item"}}
function makePacing(c,pol){const items=c.canonical.items.filter(i=>!i.schedule);const days=["일","월","화","수","목","금","토"];let date=new Date(pol.startDate+"T00:00:00Z"),used=0,weekUsed=0;const result=[];const daily=pol.mode==="items_per_week"?Math.max(1,Math.ceil(pol.rate/pol.weekdays.length)):pol.rate;for(const item of items){let guard=0;while(!pol.weekdays.includes(date.getUTCDay())||used>=daily||(pol.mode==="items_per_week"&&weekUsed>=pol.rate)){const old=date.getUTCDay();date=new Date(date.getTime()+86400000);used=0;if(date.getUTCDay()<=old)weekUsed=0;if(++guard>1000)break}result.push({itemId:item.itemId,title:item.title,date:date.toISOString().slice(0,10),day:days[date.getUTCDay()]});used++;weekUsed++}return result}
function renderPacing(c){if(!c.pacingEligible)return'<section class="panel"><div class="panel-body"><div class="empty"><strong>개인 일정화 대상이 아닙니다</strong>원문 일정이 이미 있거나, pacing을 만들 Item queue가 없습니다.</div></div></section>';const pol=pacingPolicy(c),assign=makePacing(c,pol),confirmed=reviews.pacingByContentId[c.contentId];return '<section class="panel"><div class="panel-head"><h2>날짜 없는 Item을 내 일정으로</h2>'+badge(confirmed?"confirmed overlay":"draft preview",confirmed?"green":"amber")+'</div><div class="panel-body pacing-grid"><div class="form-card"><div class="field"><label>시작일</label><input type="date" id="paceStart" value="'+esc(pol.startDate)+'"></div><div class="field"><label>배치 방식</label><select id="paceMode"><option value="items_per_day" '+(pol.mode==="items_per_day"?"selected":"")+'>하루 N개</option><option value="items_per_week" '+(pol.mode==="items_per_week"?"selected":"")+'>주 N개</option></select></div><div class="field"><label>N개</label><input type="number" min="1" max="20" id="paceRate" value="'+pol.rate+'"></div><div class="field"><label>허용 요일</label><div class="weekday-row">'+["일","월","화","수","목","금","토"].map((d,i)=>'<button data-weekday="'+i+'" class="'+(pol.weekdays.includes(i)?"active":"")+'">'+d+'</button>').join("")+'</div></div><div class="field"><label>출력</label><select id="paceOutput"><option value="todo_due" '+(pol.output==="todo_due"?"selected":"")+'>Todo due</option><option value="calendar" '+(pol.output==="calendar"?"selected":"")+'>Calendar all-day</option></select></div><div class="field"><label>묶기</label><select id="paceBundle"><option value="per_item">Item별</option><option value="session_bundle" '+(pol.bundle==="session_bundle"?"selected":"")+'>같은 날 session 묶음</option></select></div><button class="btn primary" data-action="apply-pacing" data-id="'+esc(c.contentId)+'">이 개인 일정 적용</button>'+(confirmed?'<button class="btn" data-action="clear-pacing" data-id="'+esc(c.contentId)+'">적용 취소</button>':'')+'</div><div><div class="info-banner warning">이 날짜는 원문 사실이 아닙니다. 확인 전에는 draft이고, 적용 뒤에도 UserFlowCopy의 개인 overlay로만 저장됩니다.</div><div class="schedule-list" style="margin-top:12px">'+assign.map(a=>'<div class="schedule-card"><strong>'+esc(a.date)+' ('+a.day+')</strong><span>'+esc(a.title)+'</span></div>').join("")+'</div></div></div></section>'}
function renderEvent(c){const ev=c.eventSource;if(!ev)return'<section class="panel"><div class="panel-body"><div class="empty"><strong>Event source가 아닙니다</strong>이 콘텐츠에는 Series·Edition·Occurrence 원문 구조가 없습니다.</div></div></section>';const occ=ev.occurrences??[],sel=state.selectedOccurrence[c.contentId]??occ.find(o=>o.status!=="cancelled")?.occurrenceId;const selected=occ.find(o=>o.occurrenceId===sel);return '<section class="panel"><div class="panel-head"><div><div class="eyebrow">Series → Edition → Occurrence</div><h2>'+esc(c.title)+'</h2></div>'+badge((ev.edition?.editionId??"edition 없음"),"purple")+'</div><div class="panel-body event-layout"><div><h3>회차·기간</h3>'+(occ.length?occ.map(o=>'<button class="event-card '+(o.occurrenceId===sel?"selected":"")+'" data-occurrence="'+esc(o.occurrenceId)+'" data-id="'+esc(c.contentId)+'"><strong>'+esc(o.start??"날짜 미정")+'</strong><div class="item-detail">'+esc(o.locationName??o.label??"")+'</div><div class="badge-row" style="margin-top:8px">'+badge(o.status??"scheduled",o.status==="cancelled"?"red":"green")+badge((o.sourceRowIds??[]).length+" source rows","purple")+'</div></button>').join(""):'<div class="info-banner warning">고정 occurrence가 없고 기간/규칙만 있습니다. 거짓 회차를 만들지 않습니다.</div>')+(ev.windows??[]).map(w=>'<div class="event-card"><strong>'+esc(w.start??"")+" → "+esc(w.end??"")+'</strong><div class="item-detail">window · '+esc(w.kind??"availability")+'</div></div>').join("")+'</div><div><h3>사용자 intent 뒤 생성</h3>'+(selected?'<div class="event-card selected"><div class="badge-row">'+badge("draft user Item","amber")+badge("VEVENT","blue")+'</div><h3>'+esc(c.title)+' 참석하기</h3><p class="mini">'+esc(selected.start)+' · '+esc(selected.locationName??"")+'</p><dl class="kv"><dt>scheduleOwner</dt><dd>source</dd><dt>derivation</dt><dd>direct</dd><dt>완료 상태</dt><dd>FlowMe Item</dd><dt>취소 시</dt><dd>export 금지</dd></dl><button class="btn primary" data-action="preview-event">이 회차 저장 preview</button></div>':'<div class="empty"><strong>회차를 선택하세요</strong></div>')+'<div class="info-banner">매년 날짜가 다시 발표되는 행사는 Series로 묶고 edition별 실제 날짜를 저장합니다. yearly RRULE을 추정하지 않습니다.</div></div></div></section>'}
function renderLineage(c){const graph=c.dataGraph;const types=["source","source_row","item","step","flow","bundle","user_flow_copy","occurrence","projection"];let node=graph.nodes.find(n=>n.nodeId===state.nodeId);if(!node){node=graph.nodes.find(n=>n.type==="item")??graph.nodes[0];state.nodeId=node?.nodeId}return '<section class="panel"><div class="panel-head"><div><div class="eyebrow">현재 콘텐츠의 실제 데이터</div><h2>원문 → SourceRow → Item → Projection</h2></div>'+badge(graph.nodes.length+" nodes","blue")+'</div><div class="panel-body"><div class="lineage-flow">'+types.map(t=>{const count=graph.nodes.filter(n=>n.type===t).length;return'<button class="node-chip '+(node?.type===t?"active":"")+'" data-node-type="'+t+'" data-id="'+esc(c.contentId)+'"><strong>'+esc(t)+'</strong><div class="mini">'+count+'개</div></button>'}).join('<span style="align-self:center">→</span>')+'</div><div class="two-col"><div><h3>'+esc(node?.label??"노드 없음")+'</h3><div class="content-list" style="max-height:420px;border:1px solid var(--border);border-radius:10px">'+graph.nodes.filter(n=>n.type===node?.type).map(n=>'<button class="list-item '+(n.nodeId===node.nodeId?"active":"")+'" data-node="'+esc(n.nodeId)+'" data-id="'+esc(c.contentId)+'"><div class="list-title">'+esc(n.label)+'</div><div class="list-meta">'+esc(n.nodeId)+'</div></button>').join("")+'</div></div><div><h3>실제 JSON 필드</h3><pre class="json-view">'+safeJson(node?.data??{})+'</pre><h3>연결</h3><div class="mini">'+graph.edges.filter(e=>e.from===node?.nodeId||e.to===node?.nodeId).map(e=>esc(e.from+" → "+e.relation+" → "+e.to)).join("<br>")+'</div></div></div></div></section>'}
function renderHistorical(c){const h=c.historicalPreview;return '<section class="panel"><div class="panel-head"><h2>Historical preview</h2>'+badge("정상 count 제외","amber")+'</div><div class="panel-body"><div class="info-banner warning">과거 UI 구조는 남아 있지만 최신 SourceRow provenance가 없어 정상 변환 결과처럼 보이지 않습니다.</div><dl class="kv"><dt>원문</dt><dd>'+esc(c.source.title)+'</dd><dt>카드</dt><dd>'+esc(h?.cardCount??0)+'</dd><dt>입력</dt><dd>'+esc(h?.inputCount??0)+'</dd><dt>체크박스</dt><dd>'+esc(h?.checkboxCount??0)+'</dd></dl>'+(h?.localPreviewPath?'<a class="btn" href="'+esc(pathToRelative(h.localPreviewPath))+'">기존 미리보기 열기</a>':'')+'</div></section>'}
function pathToRelative(p){return p.startsWith("docs/content-audit/")?p.replace("docs/content-audit/",""):p}
function renderDetail(c,mode){return '<header class="detail-hero"><div class="detail-top"><div><div class="badge-row">'+badge(TIER[c.corpusTier],c.corpusTier==="product_candidate"?"blue":c.corpusTier==="structure_probe"?"purple":c.corpusTier==="boundary_control"?"red":"amber")+badge(c.readiness.logicReadiness,toneFor(c.readiness.logicReadiness))+badge("사용자 "+(isReviewed(c.contentId)?"검토 완료":"미검토"),isReviewed(c.contentId)?"green":"")+'</div><h1>'+esc(c.title)+'</h1><p>'+esc(c.saveReason)+'</p></div><button class="btn" data-action="copy-link">직접 링크 복사</button></div><div class="detail-meta"><div class="meta-box"><label>원문 제공자</label><strong>'+esc(c.source.provider)+'</strong></div><div class="meta-box"><label>원문 형태</label><strong>'+esc(c.taxonomy.sourceShape)+'</strong></div><div class="meta-box"><label>Item / SourceRow</label><strong>'+(c.canonical.items?.length??0)+' / '+(c.canonical.sourceRows?.length??0)+'</strong></div><div class="meta-box"><label>기본 결과물</label><strong>'+esc(LABEL[c.primaryProjection])+'</strong></div></div></header>'+modeTabs(c,mode)+(mode==="flow"?renderFlow(c):PROJECTIONS.includes(mode)?renderProjection(c,mode):mode==="pacing"?renderPacing(c):mode==="event"?renderEvent(c):renderLineage(c))+'<div class="mobile-review hidden">'+reviewForm(c)+'</div>'}
function reviewForm(c){const r=reviewFor(c.contentId);const q=(key,label,opts)=>'<div class="review-question"><label>'+label+'</label><div class="choice-row">'+opts.map(o=>'<label><input type="radio" name="'+key+'" value="'+o+'" '+(r.answers?.[key]===o?"checked":"")+'>'+o+'</label>').join("")+'</div></div>';return '<section class="section"><h3>내 검토 · 실제 사용자 입력</h3><div class="info-banner warning">현재 상태: '+(r.userReviewStatus==="reviewed"?"REVIEWED_BY_USER":"NOT_REVIEWED_BY_USER")+'. 내부 agent 판정은 여기에 채워지지 않습니다.</div></section><form id="reviewForm" data-id="'+esc(c.contentId)+'"><div class="review-status"><label class="go"><input type="radio" name="verdict" value="go" '+(r.verdict==="go"?"checked":"")+'>Go</label><label class="modify"><input type="radio" name="verdict" value="modify" '+(r.verdict==="modify"?"checked":"")+'>Modify</label><label class="hold"><input type="radio" name="verdict" value="hold" '+(r.verdict==="hold"?"checked":"")+'>Hold</label></div>'+q("useful","전체적으로 쓸 만한가?",["yes","partly","no"])+q("itemSize","Item 크기가 적절한가?",["appropriate","too_small","too_large","mixed"])+q("projection","기본 projection이 맞는가?",["yes","change","unsure"])+q("schedule","일정화가 자연스러운가?",["yes","too_much","too_little","not_applicable"])+'<div class="field"><label>수정·누락·삭제 의견</label><textarea name="comment" rows="5" maxlength="1200">'+esc(r.comment??"")+'</textarea></div><button class="btn primary" type="submit">이 검토 저장</button></form>'}
function renderInspector(c){if(!c){inspectorBody.innerHTML='<div class="empty"><strong>콘텐츠를 선택하세요</strong></div>';return}if(state.inspector==="review"){inspectorBody.innerHTML=reviewForm(c);bindReview();return}const current=route();const cell=PROJECTIONS.includes(current.mode)?projectionCell(c,current.mode):null;inspectorBody.innerHTML='<section class="section"><h3>출처와 provenance</h3><dl class="kv"><dt>제공자</dt><dd>'+esc(c.source.provider)+'</dd><dt>원문</dt><dd><a href="'+esc(c.source.canonicalUrl)+'" target="_blank" rel="noreferrer">'+esc(c.source.title??c.title)+'</a></dd><dt>확인일</dt><dd>'+esc(c.source.observedAt)+'</dd><dt>접근</dt><dd>'+esc(c.source.accessStatus)+'</dd><dt>Dataset</dt><dd>'+esc(c.lineage.datasetId)+'</dd><dt>Hash</dt><dd>'+esc(c.lineage.canonicalContentHash)+'</dd></dl></section><section class="section"><h3>상태 축</h3><div class="badge-row">'+badge("Logic "+c.readiness.logicReadiness,toneFor(c.readiness.logicReadiness))+badge("Public "+c.readiness.publicReadiness,toneFor(c.readiness.publicReadiness))+badge("Rights "+c.readiness.rightsStatus,"purple")+badge("Personal "+c.readiness.personalConversionAvailability,"blue")+'</div></section>'+(cell?'<section class="section"><h3>'+LABEL[cell.projection]+' 손실</h3><p class="mini">'+esc(cell.lossManifest.map(x=>x.reason).join(" ")||"명시된 property-level 손실 없음")+'</p><dl class="kv"><dt>record</dt><dd>'+cell.counts.destinationRecordCount+'</dd><dt>child entry</dt><dd>'+cell.counts.childEntryCount+'</dd><dt>component</dt><dd>'+cell.counts.componentCount+'</dd></dl></section>':'')+'<section class="section"><h3>Claim boundary</h3><p class="mini">실제 사용자 검토: NOT_REVIEWED_BY_USER<br>외부 Calendar/VTODO 왕복: NOT_RUN<br>production runtime: 변경 없음</p></section>'}
function renderCoverage(){const counts={};for(const c of CONTENTS.filter(c=>["product_candidate","structure_probe"].includes(c.corpusTier))){const k=c.taxonomy.primaryLifeArea;counts[k]=(counts[k]||0)+1}return '<section class="hero"><div class="eyebrow">Coverage</div><h1>110개 정상·구조 콘텐츠의 분포</h1><p>숫자는 machine-readable view model에서 계산됩니다. Historical과 Boundary는 정상 count에서 빠집니다.</p></section><section class="panel"><div class="panel-head"><h2>lifeArea</h2></div><div class="panel-body">'+Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<div class="agenda-row"><strong>'+esc(LIFE[k]??k)+'</strong><div><div style="height:10px;background:var(--blueSoft);border-radius:9px"><div style="height:100%;width:'+Math.max(5,v/Math.max(...Object.values(counts))*100)+'%;background:var(--blue);border-radius:9px"></div></div><span class="mini">'+v+'개</span></div></div>').join("")+'</div></section><section class="panel"><div class="panel-head"><h2>검증 경계</h2></div><div class="panel-body two-col"><div class="info-banner">Projection 조합: '+DATA.counts.projectionCell+'개<br>모든 정상 콘텐츠 × 5개</div><div class="info-banner warning">사용자 검토: '+CONTENTS.filter(c=>isReviewed(c.contentId)).length+'개<br>나머지는 NOT_REVIEWED_BY_USER</div></div></section>'}
function render(){
  renderHeader();renderList();const r=route();let c=null;if(r.kind==="gallery")workspace.innerHTML=renderGallery();else if(r.kind==="coverage")workspace.innerHTML=renderCoverage();else{c=BY_ID.get(r.contentId);if(!c){setRoute("#gallery");return}workspace.innerHTML=renderDetail(c,r.mode)}renderInspector(c);saveState();document.title=(c?c.title+" · ":"")+"FlowMe Full-Corpus Lab";bindReview()}
function bindReview(){document.querySelectorAll("#reviewForm").forEach(form=>form.onsubmit=e=>{e.preventDefault();const id=form.dataset.id,fd=new FormData(form),old=reviewFor(id);reviews.reviewsByContentId[id]={...old,userReviewStatus:"reviewed",verdict:fd.get("verdict"),answers:{useful:fd.get("useful"),itemSize:fd.get("itemSize"),projection:fd.get("projection"),schedule:fd.get("schedule")},comment:String(fd.get("comment")??""),updatedAt:new Date().toISOString()};saveState();toast("검토를 로컬에 저장했습니다");render()})}
function nextUnreviewed(){const list=getFiltered().filter(c=>!isReviewed(c.contentId));const c=list[0]??CONTENTS.find(c=>!isReviewed(c.contentId));if(c)setRoute(contentHash(c));else toast("모든 콘텐츠를 검토했습니다")}
document.addEventListener("click",e=>{const b=e.target.closest("button,[data-route]");if(!b)return;
  if(b.dataset.content){setRoute(contentHash(BY_ID.get(b.dataset.content)));explorer.classList.remove("open")}
  if(b.dataset.route)setRoute(b.dataset.route);
  if(b.dataset.mode){setRoute(contentHash(BY_ID.get(b.dataset.id),b.dataset.mode))}
  if(b.dataset.view){state.view=b.dataset.view;document.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===state.view));render()}
  if(b.dataset.inspector){state.inspector=b.dataset.inspector;document.querySelectorAll("[data-inspector]").forEach(x=>x.classList.toggle("active",x.dataset.inspector===state.inspector));renderInspector(BY_ID.get(route().contentId))}
  const a=b.dataset.action;if(a==="load-more"){state.limit+=24;render()}if(a==="next-unreviewed")nextUnreviewed();
  if(a==="copy-link"){navigator.clipboard?.writeText(location.href).then(()=>toast("직접 링크를 복사했습니다")).catch(()=>toast(location.href))}
  if(a==="export-review"){const payload={...reviews,exportedAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="flowme-full-corpus-review-v1.json";link.click();URL.revokeObjectURL(url)}
  if(a==="open-import")importDialog.showModal();if(a==="close-import")importDialog.close();
  if(a==="run-import")runImport();
  if(a==="open-mobile-review"){const c=BY_ID.get(route().contentId);if(c){mobileReviewBody.innerHTML=reviewForm(c);mobileReviewDialog.showModal();bindReview()}}
  if(a==="close-mobile-review")mobileReviewDialog.close();
  if(a==="toggle-todo-capability"){state.todoCapability=!state.todoCapability;render()}
  if(b.dataset.weekday!=null){const c=BY_ID.get(route().contentId),p=pacingPolicy(c),d=Number(b.dataset.weekday);p.weekdays=p.weekdays.includes(d)?p.weekdays.filter(x=>x!==d):[...p.weekdays,d].sort();state.pacing[c.contentId]=p;render()}
  if(a==="apply-pacing"){const c=BY_ID.get(b.dataset.id),p=readPacing(c);const assign=makePacing(c,p);reviews.pacingByContentId[c.contentId]={policy:p,assignments:assign,suggestionStatus:"confirmed",scheduleOwner:"user_overlay",updatedAt:new Date().toISOString()};saveState();toast("개인 일정 overlay를 적용했습니다");render()}
  if(a==="clear-pacing"){delete reviews.pacingByContentId[b.dataset.id];saveState();render()}
  if(b.dataset.occurrence){state.selectedOccurrence[b.dataset.id]=b.dataset.occurrence;render()}
  if(b.dataset.node){state.nodeId=b.dataset.node;render()}
  if(b.dataset.nodeType){const c=BY_ID.get(b.dataset.id),n=c.dataGraph.nodes.find(x=>x.type===b.dataset.nodeType);if(n)state.nodeId=n.nodeId;render()}
});
function readPacing(c){const p=pacingPolicy(c);p.startDate=document.getElementById("paceStart")?.value??p.startDate;p.mode=document.getElementById("paceMode")?.value??p.mode;p.rate=Number(document.getElementById("paceRate")?.value??p.rate);p.output=document.getElementById("paceOutput")?.value??p.output;p.bundle=document.getElementById("paceBundle")?.value??p.bundle;state.pacing[c.contentId]=p;return p}
document.addEventListener("change",e=>{if(["paceStart","paceMode","paceRate","paceOutput","paceBundle"].includes(e.target.id)){const c=BY_ID.get(route().contentId);readPacing(c);render()}});
function runImport(){const file=importFile.files[0];if(!file){importResult.textContent="파일을 선택하세요";return}const reader=new FileReader();reader.onload=()=>{try{const incoming=JSON.parse(reader.result);if(incoming.schemaVersion!==1)throw Error("schemaVersion 불일치");const warning=incoming.corpusFingerprint!==DATA.corpusFingerprint;const known=new Set(CONTENTS.map(c=>c.contentId));const unknown=Object.keys(incoming.reviewsByContentId??{}).filter(id=>!known.has(id));const backup=JSON.stringify(reviews);const mode=importMode.value;const next=mode==="replace"?reviewState():structuredClone(reviews);for(const[id,v]of Object.entries(incoming.reviewsByContentId??{}))if(known.has(id))next.reviewsByContentId[id]=v;next.pacingByContentId={...(mode==="merge"?next.pacingByContentId:{}),...(incoming.pacingByContentId??{})};try{reviews=next;saveState()}catch(err){reviews=JSON.parse(backup);saveState();throw err}importResult.textContent=(warning?"fingerprint 경고 · ":"")+(unknown.length?unknown.length+"개 알 수 없는 contentId 제외 · ":"")+"가져오기 완료";toast("검토 JSON을 가져왔습니다");render()}catch(err){importResult.textContent="가져오기 실패: "+err.message}};reader.readAsText(file)}
openExplorer.onclick=()=>explorer.classList.add("open");closeExplorer.onclick=()=>explorer.classList.remove("open");
window.addEventListener("hashchange",render);
initFilters();render();
</script>
</body>
</html>`;

fs.writeFileSync(outputPath, html);
console.log(
  JSON.stringify(
    {
      output: path.relative(repoRoot, outputPath).replaceAll("\\", "/"),
      bytes: Buffer.byteLength(html),
      contents: JSON.parse(fs.readFileSync(dataPath, "utf8")).contents.length,
    },
    null,
    2,
  ),
);
