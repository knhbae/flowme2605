import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const dataPath = path.join(here, "content-ui-view-model-v1.json");
const reviewComparisonPath = path.join(here, "independent-ui-review-v1.json");
const valueReadjudicationPath = path.join(here, "content-value-readjudication-v1.json");
const inclusionPath = path.join(here, "corpus-inclusion-exclusion-v1.json");
const outputPath = path.join(
  repoRoot,
  "docs/content-audit/2026-07-29-flow-content-ui-full-corpus-gallery-v1-ko.html",
);
const viewModel = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const reviewComparison = JSON.parse(fs.readFileSync(reviewComparisonPath, "utf8"));
const valueReadjudication = JSON.parse(fs.readFileSync(valueReadjudicationPath, "utf8"));
const inclusion = JSON.parse(fs.readFileSync(inclusionPath, "utf8"));
const comparisonById = new Map(
  reviewComparison.comparisons.map((record) => [record.contentId, record]),
);
const valueById = new Map(
  valueReadjudication.records.map((record) => [record.contentId, record]),
);
viewModel.contents = viewModel.contents.map((content) => ({
  ...content,
  internalReview: comparisonById.get(content.contentId) ?? null,
  valueReadjudication: valueById.get(content.contentId) ?? null,
}));
viewModel.internalReviewMetrics = reviewComparison.metrics;
viewModel.excludedRecords = inclusion.records.filter((record) =>
  String(record.inclusionStatus).startsWith("excluded"),
);
const data = JSON.stringify(viewModel).replaceAll("<", "\\u003c");

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
.gallery-grid.list-mode{grid-template-columns:1fr}.gallery-grid.list-mode .content-card{min-height:0;display:grid;grid-template-columns:minmax(190px,.7fr) minmax(260px,1.5fr) minmax(190px,.8fr);gap:16px;align-items:center}.gallery-grid.list-mode .content-card .badge-row{grid-column:1}.gallery-grid.list-mode .content-card h3{grid-column:1;margin:4px 0}.gallery-grid.list-mode .content-card p{grid-column:2;grid-row:1 / span 2}.gallery-grid.list-mode .content-card .card-footer{grid-column:3;grid-row:1 / span 2;margin:0;padding:0;flex-direction:column;align-items:flex-end;gap:6px}
.load-more{display:flex;justify-content:center;margin:22px}.detail-hero{padding:4px 4px 18px;border-bottom:1px solid var(--border)}.detail-top{display:flex;gap:16px;align-items:flex-start;justify-content:space-between}
.detail-hero h1{font-size:30px;letter-spacing:-.04em;margin:6px 0 10px}.detail-hero p{font-size:15px;color:var(--muted);line-height:1.65;max-width:780px;margin:0}
.detail-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px}.meta-box{border-left:2px solid var(--border);padding-left:11px}.meta-box label{display:block;color:var(--muted);font-size:11px;margin-bottom:5px}.meta-box strong{font-size:13px;word-break:break-word}
.mode-tabs{position:sticky;top:var(--header);z-index:10;background:var(--canvas);display:flex;gap:4px;overflow:auto;padding:12px 0 10px;border-bottom:1px solid var(--border)}
.mode-tabs button{white-space:nowrap;border:0;background:transparent;border-radius:8px;padding:9px 12px;color:var(--muted);font-weight:750}.mode-tabs button.active{background:var(--blue);color:white}
.panel{background:white;border:1px solid var(--border);border-radius:var(--radius);margin-top:16px}.panel-head{padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px}
.panel-head h2,.panel-head h3{margin:0;font-size:17px}.panel-body{padding:18px}.info-banner{border-radius:11px;padding:13px 14px;background:var(--blueSoft);color:#243ca3;font-size:13px;line-height:1.55}
.info-banner.warning{background:var(--amberSoft);color:#75520c}.info-banner.danger{background:var(--redSoft);color:#9d3333}.step-card{border:1px solid var(--border);border-radius:12px;margin-bottom:12px;overflow:hidden}
.step-card summary{list-style:none;display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:var(--surface2);font-weight:800;cursor:pointer}.step-card summary::-webkit-details-marker{display:none}
.item-row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:10px;padding:13px 15px;border-top:1px solid var(--border)}.check-circle{width:22px;height:22px;border:1.5px solid #a9aaa8;border-radius:50%;background:white;display:grid;place-items:center;flex:0 0 22px}.check-circle.active{background:var(--green);border-color:var(--green);color:white}.check-circle.active::after{content:"✓";font-size:13px;font-weight:900}
.item-title{font-weight:760;font-size:14px}.item-detail{font-size:12px;color:var(--muted);line-height:1.55;margin-top:4px}.item-submeta{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.item-facts{margin-top:10px;padding:10px 11px;border:1px solid var(--border);border-radius:9px;background:#fbfbfc}.item-facts summary{cursor:pointer;font-size:12px;font-weight:800}.item-facts .kv{grid-template-columns:118px 1fr}.source-provided{border-left:3px solid var(--purple);background:var(--purpleSoft)}.user-overlay{border-left:3px solid var(--amber);background:var(--amberSoft)}
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
.excluded-row{border:1px solid var(--border);border-radius:12px;background:white;padding:15px;margin-bottom:10px}.excluded-row h3{margin:0 0 7px;font-size:15px}.excluded-row p{margin:0;color:var(--muted);font-size:12px;line-height:1.6}.review-required{color:var(--red);font-size:11px}
.review-status input:focus-visible+span,.choice-row input:focus-visible+span{outline:3px solid #9aa8ff;outline-offset:2px}.weekday-row button:focus-visible,.mode-tabs button:focus-visible,.inspector-tabs button:focus-visible{outline:3px solid #9aa8ff;outline-offset:2px}
dialog{border:0;border-radius:14px;padding:0;box-shadow:var(--shadow);max-width:min(620px,calc(100vw - 28px));width:100%}dialog::backdrop{background:rgba(15,18,25,.35)}.dialog-head{padding:16px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}.dialog-body{padding:18px}.dialog-actions{padding:14px 18px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px}
@media(max-width:1180px){:root{--list:280px;--inspector:320px}.gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.metric-row{grid-template-columns:repeat(3,1fr)}}
@media(max-width:1180px){.gallery-grid.list-mode .content-card{grid-template-columns:minmax(170px,.8fr) minmax(220px,1.2fr)}.gallery-grid.list-mode .content-card .card-footer{grid-column:1 / -1;grid-row:auto;flex-direction:row;align-items:center}}
@media(max-width:900px){.header-stats{display:none}.explorer{left:0;transform:translateX(-100%);transition:.2s;z-index:80;width:min(360px,88vw);top:0;padding-top:64px}.explorer.open{transform:none;box-shadow:var(--shadow)}
  .nav-rail{display:none}.workspace{margin-left:0;margin-right:0;padding:18px 18px 110px}.inspector{display:none}.header-actions .desktop-only{display:none}.mobile-only{display:inline-flex}
  .detail-meta{grid-template-columns:repeat(2,1fr)}.pacing-grid,.event-layout{grid-template-columns:1fr}.mobile-bar{display:flex;position:fixed;z-index:40;left:0;right:0;bottom:0;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.98);border-top:1px solid var(--border);gap:8px}.mobile-bar .btn{flex:1}
  .mobile-review{display:block!important}.gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gallery-grid.list-mode .content-card{display:flex}}
@media(max-width:560px){:root{--header:58px}.app-header{padding:0 12px;gap:9px}.brand{font-size:19px}.header-search{display:none}.header-actions .btn:not(.icon-btn){display:none}
  .workspace{padding:14px 12px 110px}.hero{padding:18px}.hero h1,.detail-hero h1{font-size:24px}.metric-row{grid-template-columns:repeat(2,1fr)}.gallery-grid{grid-template-columns:1fr}.content-card{min-height:175px}
  .detail-top{display:block}.detail-meta{grid-template-columns:1fr 1fr}.mode-tabs{top:var(--header);margin:0 -12px;padding:9px 12px}.panel-body{padding:14px}.projection-summary{grid-template-columns:1fr}.loss-grid,.two-col{grid-template-columns:1fr}
  .agenda-row{grid-template-columns:1fr}.schedule-list{grid-template-columns:1fr}.item-row{grid-template-columns:25px minmax(0,1fr)}.item-row>.badge{grid-column:2}.gallery-head{align-items:start;gap:8px}
  .header-actions{gap:4px}.mobile-bar{padding-left:12px;padding-right:12px}.sheet-card-list{display:grid!important}.sheet-wrap.mobile-hide{display:none}}
</style>
</head>
<body>
<header class="app-header">
  <button class="btn icon-btn mobile-only" id="openExplorer" aria-label="콘텐츠 목록 열기" aria-expanded="false">☰</button>
  <div class="brand">FLOW<span>Me</span> <small class="mini">Lab</small></div>
  <div class="header-search"><input id="globalSearch" placeholder="콘텐츠 제목, 사용자 job, 제공자 검색" aria-label="전체 콘텐츠 검색"><button aria-label="검색">⌕</button></div>
  <div class="header-stats" id="headerStats"></div>
  <div class="header-actions">
    <button class="btn desktop-only" data-action="download-corpus">Corpus JSON</button>
    <button class="btn desktop-only" data-action="copy-link">직접 링크</button>
    <button class="btn desktop-only" data-action="export-review">검토 JSON</button>
    <button class="btn icon-btn mobile-only" data-action="download-corpus" aria-label="전체 corpus JSON 내려받기">⤓</button>
    <button class="btn icon-btn mobile-only" data-action="export-review" aria-label="검토 JSON 내보내기">⇩</button>
    <button class="btn icon-btn" data-action="open-import" aria-label="검토 JSON 가져오기">⇧</button>
  </div>
</header>
<div class="shell">
  <nav class="nav-rail" aria-label="주요 화면">
    <button class="rail-btn active" data-route="#gallery"><span class="ico">▦</span>전체</button>
    <button class="rail-btn" data-action="next-unreviewed"><span class="ico">◌</span>다음</button>
    <button class="rail-btn" data-route="#coverage"><span class="ico">◎</span>커버리지</button>
    <button class="rail-btn" data-route="#exclusions"><span class="ico">⊘</span>제외</button>
    <div class="rail-bottom"><button class="rail-btn" data-action="open-import"><span class="ico">⇅</span>백업</button></div>
  </nav>
  <aside class="explorer" id="explorer" aria-label="콘텐츠 탐색">
    <div class="explorer-head">
      <div class="explorer-title"><span>콘텐츠 목록</span><button class="btn icon-btn mobile-only" id="closeExplorer" aria-label="목록 닫기">×</button></div>
      <div class="field mobile-only"><label for="mobileSearch">콘텐츠 검색</label><input id="mobileSearch" placeholder="제목, user job, 제공자"></div>
      <div class="filter-grid">
        <select id="tierFilter" aria-label="corpus tier"></select>
        <select id="lifeFilter" aria-label="카테고리"></select>
        <select id="executionFilter" aria-label="실행 패턴"></select>
        <select id="projectionFilter" aria-label="기본 결과물"></select>
        <select id="logicFilter" aria-label="Logic Go Modify Hold"></select>
        <select id="agreementFilter" aria-label="독립 검토 일치 여부"></select>
        <select id="reviewFilter" aria-label="검토 상태"></select>
        <select id="userVerdictFilter" aria-label="사용자 Go Modify Hold"></select>
        <select id="sourceFilter" aria-label="원문 형식"></select>
        <select id="temporalFilter" aria-label="일정 유형"></select>
        <select id="sortFilter" aria-label="정렬"></select>
      </div>
      <div class="result-bar"><span class="mini" id="filterCount"></span><span class="seg"><button data-view="card" class="active">카드</button><button data-view="list">목록</button></span></div>
    </div>
    <div class="content-list" id="contentList"></div>
  </aside>
  <main class="workspace" id="workspace"></main>
  <aside class="inspector" id="inspector" aria-label="출처와 검토">
    <div class="inspector-tabs" role="tablist"><button class="active" role="tab" aria-selected="true" data-inspector="source">출처·손실</button><button role="tab" aria-selected="false" data-inspector="review">내 검토</button></div>
    <div class="inspector-body" id="inspectorBody"></div>
  </aside>
</div>
<div class="mobile-bar" id="mobileBar"></div>
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
<dialog id="mobileSourceDialog">
  <div class="dialog-head"><strong>출처·상태·손실</strong><button class="btn icon-btn" data-action="close-mobile-source">×</button></div>
  <div class="dialog-body" id="mobileSourceBody"></div>
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
const state={search:"",tier:"product_candidate",life:"all",execution:"all",projection:"all",logic:"all",agreement:"all",review:"all",userVerdict:"all",source:"all",temporal:"all",sort:"default",view:"card",limit:24,inspector:"source",nodeId:null,pacing:{},selectedOccurrence:{},selectedEventIntent:{},eventDrafts:{},completedItems:{},todoCapability:true};
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[m]))}
function safeJson(v){return esc(JSON.stringify(v,null,2))}
function options(values,labels,allLabel){return '<option value="all">'+allLabel+'</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(labels?.[v]??v)+'</option>').join("")}
function emptyReviewState(){
  return {schemaVersion:1,corpusFingerprint:DATA.corpusFingerprint,exportedAt:null,reviewsByContentId:Object.fromEntries(CONTENTS.map(c=>[c.contentId,{userReviewStatus:"not_reviewed",verdict:null,answers:{},comment:"",updatedAt:null}])),pacingByContentId:{},lastRoute:"#gallery"}
}
function reviewState(){
  try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY));if(p?.schemaVersion===1&&p.corpusFingerprint===DATA.corpusFingerprint)return p}catch{}
  return emptyReviewState()
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
  const filtered=CONTENTS.filter(c=>{
    const r=reviewFor(c.contentId);
    return(!q||[c.title,c.userJob,c.source.provider,c.source.title].join(" ").toLowerCase().includes(q))
      &&(state.tier==="all"||c.corpusTier===state.tier)
      &&(state.life==="all"||c.taxonomy.primaryLifeArea===state.life)
      &&(state.execution==="all"||c.taxonomy.primaryExecutionPattern===state.execution)
      &&(state.projection==="all"||c.primaryProjection===state.projection)
      &&(state.logic==="all"||c.readiness.logicReadiness===state.logic)
      &&(state.agreement==="all"||(state.agreement==="agree"?c.internalReview?.exactAgreement===true:state.agreement==="disagree"?c.internalReview?.exactAgreement===false:!c.internalReview))
      &&(state.review==="all"||(state.review==="reviewed"?r.userReviewStatus==="reviewed":r.userReviewStatus!=="reviewed"))
      &&(state.userVerdict==="all"||r.verdict===state.userVerdict)
      &&(state.source==="all"||c.source.sourceFormat===state.source)
      &&(state.temporal==="all"||c.taxonomy.temporalIntent===state.temporal)
  });
  if(state.sort==="title")filtered.sort((a,b)=>a.title.localeCompare(b.title,"ko"));
  if(state.sort==="items_desc")filtered.sort((a,b)=>(b.canonical.items?.length??0)-(a.canonical.items?.length??0)||a.title.localeCompare(b.title,"ko"));
  if(state.sort==="rows_desc")filtered.sort((a,b)=>(b.canonical.sourceRows?.length??0)-(a.canonical.sourceRows?.length??0)||a.title.localeCompare(b.title,"ko"));
  if(state.sort==="disagreement")filtered.sort((a,b)=>(b.internalReview?.disagreeingAxes?.length??-1)-(a.internalReview?.disagreeingAxes?.length??-1)||a.title.localeCompare(b.title,"ko"));
  return filtered
}
function route(){
  const h=location.hash||reviews.lastRoute||"#gallery";
  if(h==="#gallery")return{kind:"gallery"};
  if(h==="#coverage")return{kind:"coverage"};
  if(h==="#exclusions")return{kind:"exclusions"};
  const m=h.match(/^#content\\/([^/]+)(?:\\/(projection)\\/([^/]+)|\\/(pacing|event|lineage|review))?$/);
  if(!m)return{kind:"gallery"};
  return{kind:"content",contentId:decodeURIComponent(m[1]),mode:m[2]==="projection"?(m[3]||"calendar"):(m[4]||"flow")}
}
function setRoute(hash){location.hash=hash}
function contentHash(c,mode="flow"){const base="#content/"+encodeURIComponent(c.contentId);return mode==="flow"?base:PROJECTIONS.includes(mode)?base+"/projection/"+mode:base+"/"+mode}
function initFilters(){
  tierFilter.innerHTML=options(DATA.filters.corpusTier,TIER,"전체 tier");tierFilter.value=state.tier;
  lifeFilter.innerHTML=options(DATA.filters.lifeArea,LIFE,"전체 카테고리");
  executionFilter.innerHTML=options(DATA.filters.executionPattern,null,"전체 실행 패턴");
  projectionFilter.innerHTML=options(PROJECTIONS,LABEL,"전체 결과물");
  logicFilter.innerHTML='<option value="all">전체 Logic 상태</option><option value="go">Logic Go</option><option value="modify">Logic Modify</option><option value="hold">Logic Hold</option><option value="not_assessed">Logic 미판정</option>';
  agreementFilter.innerHTML='<option value="all">전체 독립 검토</option><option value="agree">6축 완전 일치</option><option value="disagree">의견 불일치</option><option value="not_reviewed">내부 검토 없음</option>';
  reviewFilter.innerHTML='<option value="all">전체 검토</option><option value="not_reviewed">미검토</option><option value="reviewed">검토 완료</option>';
  userVerdictFilter.innerHTML='<option value="all">전체 사용자 판정</option><option value="go">내 Go</option><option value="modify">내 Modify</option><option value="hold">내 Hold</option>';
  sourceFilter.innerHTML=options(DATA.filters.sourceFormat,null,"전체 원문");
  temporalFilter.innerHTML=options(DATA.filters.temporalIntent,null,"전체 일정");
  sortFilter.innerHTML='<option value="default">기본 순서</option><option value="title">제목순</option><option value="items_desc">Item 많은 순</option><option value="rows_desc">SourceRow 많은 순</option><option value="disagreement">불일치 많은 순</option>';
  [tierFilter,lifeFilter,executionFilter,projectionFilter,logicFilter,agreementFilter,reviewFilter,userVerdictFilter,sourceFilter,temporalFilter,sortFilter].forEach(el=>{el.value=state[el.id.replace("Filter","")];el.addEventListener("change",()=>{state[el.id.replace("Filter","")]=el.value;state.limit=24;render()})});
  globalSearch.addEventListener("input",e=>{state.search=e.target.value;state.limit=24;render()});
  mobileSearch.addEventListener("input",e=>{state.search=e.target.value;globalSearch.value=e.target.value;state.limit=24;render()});
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
function card(c){const items=c.canonical.items?.length??0,rows=c.canonical.sourceRows?.length??0,ir=c.internalReview;return '<button class="content-card" data-content="'+esc(c.contentId)+'"><div class="badge-row">'+badge(TIER[c.corpusTier],c.corpusTier==="product_candidate"?"blue":c.corpusTier==="structure_probe"?"purple":c.corpusTier==="boundary_control"?"red":"amber")+badge(LABEL[c.primaryProjection],toneFor("primary"))+(ir?badge(ir.exactAgreement?"내부 6축 일치":"내부 불일치 "+ir.disagreeingAxes.length,ir.exactAgreement?"green":"amber"):"")+(isReviewed(c.contentId)?badge("사용자 "+reviewFor(c.contentId).verdict,"green"):badge("미검토"))+'</div><h3>'+esc(c.title)+'</h3><p>'+esc(c.saveReason)+'</p><div class="card-footer"><span>SourceRow '+rows+' · Item '+items+'</span><span>'+esc(c.source.provider)+'</span></div></button>'}
function renderGallery(){
  const filtered=getFiltered(),visible=filtered.slice(0,state.limit),reviewed=CONTENTS.filter(c=>isReviewed(c.contentId)).length,reviewMetric=reviewed?reviewed+" / "+CONTENTS.length:"NOT REVIEWED",disagreements=DATA.internalReviewMetrics?.anyDisagreement??0;
  return '<section class="hero"><div class="eyebrow">Full-Corpus Validation Workbench</div><h1>설명보다 실제 Flow '+DATA.counts.normal+'개를 먼저 봅니다</h1><p>원문에서 나온 모든 Item과 다섯 projection을 한 건씩 열어보고, 일정화·행사 회차·데이터 provenance까지 직접 판단하는 내부 검토 환경입니다. 자동·에이전트 QA는 사용자 검토가 아닙니다.</p><div class="metric-row"><div class="metric"><strong>'+DATA.counts.normal+'</strong><span>정상·구조 콘텐츠</span></div><div class="metric"><strong>'+DATA.counts.item.toLocaleString()+'</strong><span>전체 Item</span></div><div class="metric"><strong>'+DATA.counts.sourceRow.toLocaleString()+'</strong><span>전체 SourceRow</span></div><div class="metric"><strong>'+DATA.counts.projectionCell+'</strong><span>5-format 조합</span></div><div class="metric"><strong>'+reviewMetric+'</strong><span>실제 사용자 검토</span></div><div class="metric"><strong>'+disagreements+'</strong><span>내부 검토 불일치</span></div></div><div class="hero-actions"><button class="btn primary" data-action="next-unreviewed">첫 미검토 열기</button><button class="btn" data-content="canonical:base-opentutorials-web1-progress">WEB1 일정화 보기</button><button class="btn" data-content="canonical:base-moving-d30">이사 Checklist 보기</button><button class="btn" data-content="events:event-kr-sokcho-summer">진행 예정 행사 보기</button></div></section><div class="gallery-head"><div><div class="eyebrow">현재 필터</div><h2>'+filtered.length+'개 콘텐츠</h2></div><span class="mini">기본 화면은 Product candidate입니다</span></div><section class="gallery-grid '+(state.view==="list"?"list-mode":"")+'">'+visible.map(card).join("")+'</section>'+(visible.length<filtered.length?'<div class="load-more"><button class="btn" data-action="load-more">다음 24개 보기</button></div>':'')+'<section class="panel"><div class="panel-head"><h2>증거 tier를 섞지 않습니다</h2></div><div class="panel-body two-col"><div><h3>정상 count</h3><p class="mini">Product candidate '+DATA.counts.productCandidate+'개와 Structure probe '+DATA.counts.structureProbe+'개만 구조 검증 수에 포함됩니다.</p></div><div><h3>별도 보기</h3><p class="mini">Boundary '+DATA.counts.boundary+'개와 Historical '+DATA.counts.historical+'개는 멈춤·과거 UI 참고용이며 정상 수를 채우지 않습니다. 제외된 variant '+DATA.excludedRecords.length+'개도 별도 화면에 보존합니다.</p></div></div></section>'
}
function modeTabs(c,mode){const tabs=[["flow","Flow"],...PROJECTIONS.map(p=>[p,LABEL[p]]),["pacing","일정화"],["event","행사"],["lineage","데이터 구조"]];return '<nav class="mode-tabs" role="tablist" aria-label="콘텐츠 보기">'+tabs.map(([id,label])=>'<button role="tab" aria-selected="'+(mode===id)+'" class="'+(mode===id?"active":"")+'" data-mode="'+id+'" data-id="'+esc(c.contentId)+'">'+label+'</button>').join("")+'</nav>'}
function itemHtml(c,item){
  const sourceRows=unique([...(item.sourceRowIds??[]),...(item.sourceTrace??[]).flatMap(trace=>trace.sourceRowIds??[])]);
  const sourceRefs=unique(item.sourceRefIds??[]);
  const schedule=item.schedule?item.schedule.mode??item.schedule.type:"날짜 없음";
  const key=c.contentId+"|"+item.itemId,done=Boolean(state.completedItems[key]);
  const location=item.location??item.venue??null;
  const conditions=item.conditions??item.conditionMemoIds??[];
  const facts=[
    ["완료 기준",esc(item.completion?.doneWhen??"별도 완료 기준 문장 없음")],
    ["일정",item.schedule?safeJson(item.schedule):"날짜 없음 · source VEVENT 생성 안 함"],
    ["장소",location?safeJson(location):"없음"],
    ["조건",conditions?.length?safeJson(conditions):"없음"],
    ["SourceRow",esc(sourceRows.length?sourceRows.join(", "):"없음")],
    ["sourceRefs",esc(sourceRefs.length?sourceRefs.join(", "):"없음")],
    ["dependency",esc((item.dependsOnItemIds??[]).length?item.dependsOnItemIds.join(", "):"없음")],
  ];
  return '<div class="item-row"><button class="check-circle '+(done?"active":"")+'" data-action="toggle-complete" data-key="'+esc(key)+'" aria-label="'+esc(item.title)+' '+(done?"완료 취소":"완료 표시")+'" aria-pressed="'+done+'"></button><div><div class="item-title">'+esc(item.title)+'</div>'+(item.description?'<div class="item-detail">'+esc(item.description)+'</div>':'')+'<div class="item-submeta">'+badge(schedule,item.schedule?"blue":"")+badge("근거 "+sourceRows.length+"행","purple")+(item.completion?.doneWhen?badge("완료 기준 있음","green"):badge("완료 기준 확인 필요","amber"))+'</div><details class="item-facts"><summary>완료·일정·장소·근거 전체 보기</summary><dl class="kv">'+facts.map(([label,value])=>'<dt>'+label+'</dt><dd>'+value+'</dd>').join("")+'</dl></details></div><span class="badge">'+esc(item.intent??"act")+'</span></div>'
}
function renderFlow(c){
  if(c.contentMode==="event_source_before_user_intent")return '<div class="panel"><div class="panel-body"><div class="info-banner">이 콘텐츠는 행사 source fact입니다. 아직 Item이 없는 것이 정상이며, 회차를 고르고 저장·예약·참석 의도를 정하면 개인 Item이 생깁니다.</div><button class="btn primary" style="margin-top:14px" data-mode="event" data-id="'+esc(c.contentId)+'">행사 회차 선택하기</button></div></div>';
  if(c.contentMode==="field_template_probe")return '<div class="panel"><div class="panel-head"><h2>Field template</h2>'+badge("Item 0이 정상","amber")+'</div><div class="panel-body"><div class="info-banner warning">표의 모든 행을 곧바로 할 일로 만들지 않습니다. 사용자가 대상 행과 기준값을 선택한 뒤에만 실행 Item을 활성화합니다.</div>'+renderSheetLike(c.canonical.sourceRows.map(r=>({recordType:"source_row",id:r.sourceRowId,title:r.title,detail:r.detail,parentId:r.group??"",sourceRowIds:[r.sourceRowId]})))+'</div></div>';
  if(c.contentMode==="historical_preview")return renderHistorical(c);
  if(c.contentMode==="boundary_control")return '<div class="panel"><div class="panel-body"><div class="info-banner danger">정상 Flow 생성을 중지했습니다. '+esc(c.evidenceNotes.join(" "))+'</div></div></div>';
  const itemMap=new Map(c.canonical.items.map(i=>[i.itemId,i]));
  const userInputs=(c.minimumInputs??[]).filter(input=>input.source!=="source");
  const sourceProvided=[...(c.sourceProvidedFields??[]),...(c.minimumInputs??[]).filter(input=>input.source==="source")];
  const inputPanel='<section class="panel"><div class="panel-head"><h2>시작에 필요한 사용자 입력</h2>'+badge(userInputs.length+"개","amber")+'</div><div class="panel-body">'+(userInputs.length?userInputs.map(i=>'<div class="item-row user-overlay"><span class="badge '+(i.required?"red":"")+'">'+(i.required?"필수":"선택")+'</span><div><div class="item-title">'+esc(i.label)+'</div><div class="item-detail">'+esc(i.type)+' · user_overlay · 원문 사실을 덮어쓰지 않음</div></div></div>').join(""):'<div class="info-banner">원문 값을 다시 입력하지 않고 0개 입력으로 시작할 수 있습니다.</div>')+'</div></section>';
  const providedPanel=sourceProvided.length?'<section class="panel"><div class="panel-head"><h2>원문에서 자동 채운 값</h2>'+badge(sourceProvided.length+"개","purple")+'</div><div class="panel-body"><div class="info-banner source-provided">이 값은 사용자가 다시 입력하지 않습니다. 확인 또는 수정이 필요하면 personal overlay로 별도 저장합니다.</div>'+sourceProvided.map(i=>'<div class="item-row"><span class="badge purple">source</span><div><div class="item-title">'+esc(i.label??i.key)+'</div><div class="item-detail">'+esc(i.type??"source fact")+' · read-only source value</div></div></div>').join("")+'</div></section>':"";
  return '<section class="panel"><div class="panel-head"><h2>전체 Step과 Item</h2><div class="badge-row">'+badge(c.canonical.steps.length+" Step","blue")+badge(c.canonical.items.length+" Item","green")+'</div></div><div class="panel-body">'+c.canonical.steps.sort((a,b)=>(a.order??0)-(b.order??0)).map((step,idx)=>'<details class="step-card" '+(idx<2?"open":"")+'><summary><span>'+esc(step.title)+'</span>'+badge((step.itemIds??[]).length+"개")+'</summary>'+(step.itemIds??[]).map(id=>itemMap.get(id)).filter(Boolean).map(item=>itemHtml(c,item)).join("")+'</details>').join("")+'</div></section>'+inputPanel+providedPanel
}
function projectionCell(c,p){return c.projectionCells.find(x=>x.projection===p)}
function projectionCellForUi(c,p){
  const base=projectionCell(c,p),confirmed=reviews.pacingByContentId[c.contentId];
  if(!confirmed?.assignments?.length)return base;
  const policy=confirmed.policy??{},assignments=confirmed.assignments;
  if(p==="calendar"&&policy.output==="calendar"){
    let records=[];
    const scheduleFor=(date)=>({start:policy.allDay===false&&policy.preferredTime?date+"T"+policy.preferredTime+":00+09:00":date,allDay:policy.allDay!==false,timezone:"Asia/Seoul",scheduleOwner:"user_overlay"});
    if(policy.bundle==="session_bundle"){
      const byDate=new Map();
      for(const a of assignments){const rows=byDate.get(a.date)??[];rows.push(a);byDate.set(a.date,rows)}
      records=[...byDate.entries()].map(([date,rows])=>({
        recordType:"event",
        component:"VEVENT",
        title:c.title+" · "+rows.length+"개",
        detail:"사용자가 확정한 pacing policy로 묶은 개인 학습 세션",
        schedule:scheduleFor(date),
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
        schedule:scheduleFor(a.date),
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
  return (cell.generationState==="preview_requires_overlay"?'<div class="info-banner warning">확정 일정이 아니라 '+esc(cell.minimumUserInputs.join(", ")||"사용자 intent")+' 뒤에 생성 가능한 draft preview입니다. 원문의 상대 규칙과 사용자의 기준일을 섞어 source fact로 표시하지 않습니다.</div>':'')+'<div class="agenda" style="margin-top:14px">'+(records.length?records.map(r=>{const owner=r.schedule?.mode==="anchor_offset"?"source_rule + user_anchor":r.schedule?.scheduleOwner??r.scheduleOwner??"source";return'<div class="agenda-row"><div class="agenda-date">'+esc(r.schedule?.start??(r.schedule?.dayOffset!=null?"D"+(r.schedule.dayOffset>=0?"+":"")+r.schedule.dayOffset:"기준일 필요"))+'</div><div><strong>'+esc(r.title)+'</strong><div class="item-detail">'+esc(r.detail??"")+'</div><div class="item-submeta">'+badge((r.childItemIds??[]).length+" Item")+badge(r.component??"VEVENT","blue")+badge(owner,owner.includes("user")?"amber":"green")+badge(r.derivation??r.suggestionStatus??"direct","purple")+'</div></div></div>'}).join(""):'<div class="empty"><strong>아직 event record가 없습니다</strong>일정화 Playground에서 preview를 만들어보세요.</div>')+'</div>'
}
function completionButton(c,itemId,title){const key=c.contentId+"|"+itemId,done=Boolean(state.completedItems[key]);return'<button class="check-circle '+(done?"active":"")+'" data-action="toggle-complete" data-key="'+esc(key)+'" aria-label="'+esc(title)+' '+(done?"완료 취소":"완료 표시")+'" aria-pressed="'+done+'"></button>'}
function renderChecklist(c,cell){const groups=cell.output?.groups??[];if(!groups.length)return'<div class="empty"><strong>Checklist 없음</strong>'+esc(cell.prohibitionReason)+'</div>';return groups.map(g=>'<section class="check-group"><h3>'+esc(g.title)+' · '+g.entries.length+'개 · bounded set</h3>'+g.entries.map(item=>'<div class="item-row">'+completionButton(c,item.itemId,item.title)+'<div><div class="item-title">'+esc(item.title)+'</div><div class="item-detail">'+esc(item.detail??"")+'</div><div class="item-submeta">'+badge((item.sourceRowIds??[]).length+" source rows","purple")+badge("원문 순서 보존","blue")+'</div></div></div>').join("")+'</section>').join("")}
function renderTodo(c,cell){const out=cell.output;if(!out)return'<div class="empty"><strong>Todo 없음</strong>'+esc(cell.prohibitionReason)+'</div>';const grouped=state.todoCapability&&out.parents?.length;const due=t=>t.due?'<div class="item-submeta">'+badge("due "+t.due,"amber")+badge(t.scheduleOwner??"source","purple")+'</div>':"";const button=t=>completionButton(c,t.canonicalItemId??t.itemId??t.taskId,t.title);return '<div class="info-banner">Todo는 재정렬·연기가 가능한 독립 queue입니다. <button class="btn" data-action="toggle-todo-capability">'+(grouped?"flat fallback 보기":"parent/subtask 보기")+'</button></div><div style="margin-top:14px">'+(grouped?out.parents.map(p=>'<section class="todo-parent"><h3>'+esc(p.title)+'</h3>'+out.tasks.filter(t=>t.parentTaskId===p.taskId).map(t=>'<div class="todo-task sub">'+button(t)+'<div><strong>'+esc(t.title)+'</strong><div class="item-detail">'+esc(t.detail??"")+'</div>'+due(t)+'</div></div>').join("")+'</section>').join(""):out.flatFallback.map(t=>'<div class="todo-task">'+button(t)+'<div><strong>'+esc(t.title)+'</strong>'+due(t)+'</div></div>').join(""))+'</div>'}
function renderSheetLike(rows){if(!rows.length)return'<div class="empty"><strong>표시할 행 없음</strong></div>';const cols=unique(rows.flatMap(r=>Object.keys(r))).filter(k=>!["original"].includes(k)).slice(0,9);const value=v=>Array.isArray(v)?v.join(", "):typeof v==="object"&&v!=null?JSON.stringify(v):v??"";return '<div class="sheet-wrap mobile-hide"><table class="sheet"><thead><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join("")+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(c=>'<td>'+esc(value(r[c]))+'</td>').join("")+'</tr>').join("")+'</tbody></table></div><div class="sheet-card-list hidden">'+rows.map(r=>'<div class="schedule-card"><strong>'+esc(r.title??r.id??"행")+'</strong>'+cols.filter(c=>c!=="title"&&r[c]!=null&&value(r[c])!=="").slice(0,6).map(c=>'<span><b>'+esc(c)+'</b> · '+esc(value(r[c]))+'</span>').join("")+'</div>').join("")+'</div>'}
function unique(a){return[...new Set(a)]}
function renderProjection(c,p){const cell=projectionCellForUi(c,p);let body="";if(p==="calendar")body=renderCalendar(cell);if(p==="checklist")body=renderChecklist(c,cell);if(p==="todo")body=renderTodo(c,cell);if(p==="sheet")body=renderSheetLike(cell.output?.rows??[]);if(p==="memo")body='<pre class="memo">'+esc(cell.output?.markdown??cell.prohibitionReason??"")+'</pre>';return '<section class="panel"><div class="panel-head"><div><div class="eyebrow">'+esc(cell.generationState)+'</div><h2>'+LABEL[p]+' 실제 결과</h2></div><div class="badge-row">'+badge(cell.counts.destinationRecordCount+" destination records","blue")+badge(cell.counts.childEntryCount+" child entries")+'</div></div><div class="panel-body">'+projectionHeader(cell)+'<div style="margin-top:18px">'+body+'</div>'+(cell.fallback?'<div class="info-banner" style="margin-top:16px"><strong>Fallback</strong><br>'+esc(cell.fallback)+'</div>':'')+'</div></section>'}
function copyPolicy(policy){return{...policy,weekdays:unique([...(policy?.weekdays??[1,2,3,4,5])].map(Number)).sort(),restDates:unique([...(policy?.restDates??[])].map(String)).sort(),targetEndDate:policy?.targetEndDate??"",preferredTime:policy?.preferredTime??"19:00",allDay:policy?.allDay!==false}}
function pacingPolicy(c){return copyPolicy(state.pacing[c.contentId]??reviews.pacingByContentId[c.contentId]?.policy??{startDate:"2026-08-03",targetEndDate:"",mode:"items_per_day",rate:2,weekdays:[1,2,3,4,5],restDates:[],preferredTime:"19:00",allDay:true,output:"todo_due",bundle:"per_item"})}
function calculatePacing(c,pol,suggestionStatus="draft"){
  const errors=[],rate=Number(pol.rate),weekdays=unique((pol.weekdays??[]).map(Number)).sort(),restDates=new Set(pol.restDates??[]),start=new Date((pol.startDate??"")+"T00:00:00.000Z");
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(pol.startDate??"")||Number.isNaN(start.getTime()))errors.push("시작일을 확인하세요.");
  if(!["items_per_day","items_per_week","target_end"].includes(pol.mode))errors.push("배치 방식을 확인하세요.");
  if(pol.mode!=="target_end"&&(!Number.isInteger(rate)||rate<1||rate>20))errors.push("N개는 1~20 사이의 정수여야 합니다.");
  if(!weekdays.length||weekdays.some(d=>d<0||d>6))errors.push("허용 요일을 하나 이상 선택하세요.");
  if(!["todo_due","calendar"].includes(pol.output))errors.push("출력 형식을 확인하세요.");
  if(!["per_item","session_bundle"].includes(pol.bundle))errors.push("묶기 방식을 확인하세요.");
  if(pol.allDay===false&&!/^\\d{2}:\\d{2}$/.test(pol.preferredTime??""))errors.push("선호 시간을 HH:MM으로 입력하세요.");
  if([...restDates].some(date=>!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)))errors.push("쉬는 날은 YYYY-MM-DD 형식으로 입력하세요.");
  let targetEnd=null;
  if(pol.mode==="target_end"){
    targetEnd=new Date((pol.targetEndDate??"")+"T00:00:00.000Z");
    if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(pol.targetEndDate??"")||Number.isNaN(targetEnd.getTime()))errors.push("목표 종료일을 확인하세요.");
    else if(!Number.isNaN(start.getTime())&&targetEnd<start)errors.push("목표 종료일은 시작일보다 빠를 수 없습니다.");
  }
  if(errors.length)return{ok:false,errors,assignments:[],targetItemIds:[]};
  const items=c.canonical.items.filter(i=>!i.schedule),days=["일","월","화","수","목","금","토"],assignments=[];
  if(!items.length)return{ok:false,errors:["일정화할 날짜 없는 Item이 없습니다."],assignments:[],targetItemIds:[]};
  if(pol.mode==="target_end"){
    const eligibleDates=[];
    for(let cursor=new Date(start);cursor<=targetEnd;cursor=new Date(cursor.getTime()+86400000)){
      const date=cursor.toISOString().slice(0,10);
      if(weekdays.includes(cursor.getUTCDay())&&!restDates.has(date))eligibleDates.push(new Date(cursor));
    }
    if(!eligibleDates.length)return{ok:false,errors:["선택한 기간과 요일 안에 배치 가능한 날짜가 없습니다."],assignments:[],targetItemIds:items.map(i=>i.itemId)};
    const daily=Math.ceil(items.length/eligibleDates.length);
    items.forEach((item,index)=>{
      const cursor=eligibleDates[Math.min(eligibleDates.length-1,Math.floor(index/daily))],date=cursor.toISOString().slice(0,10);
      assignments.push({assignmentId:item.itemId+"-"+date,itemId:item.itemId,title:item.title,date,day:days[cursor.getUTCDay()],preferredTime:pol.allDay===false?pol.preferredTime:null,allDay:pol.allDay!==false,outputMode:pol.output,bundleMode:pol.bundle,scheduleOwner:"user_overlay",derivation:"pacing_policy",suggestionStatus});
    });
    return{ok:true,errors:[],assignments,targetItemIds:items.map(i=>i.itemId),derivedDailyCap:daily}
  }
  let cursor=new Date(start),usedOnDate=0,usedThisWeek=0;
  const daily=pol.mode==="items_per_week"?Math.max(1,Math.ceil(rate/weekdays.length)):rate;
  const weeklyCap=pol.mode==="items_per_week"?rate:Infinity;
  for(const item of items){
    let guard=0;
    while(!weekdays.includes(cursor.getUTCDay())||restDates.has(cursor.toISOString().slice(0,10))||usedOnDate>=daily||usedThisWeek>=weeklyCap){
      const previousWeekday=cursor.getUTCDay();
      cursor=new Date(cursor.getTime()+86400000);
      usedOnDate=0;
      if(cursor.getUTCDay()<=previousWeekday)usedThisWeek=0;
      if(++guard>3660)return{ok:false,errors:["선택한 조건 안에서 배치 가능한 날짜를 찾지 못했습니다."],assignments:[],targetItemIds:items.map(i=>i.itemId)}
    }
    const date=cursor.toISOString().slice(0,10);
    assignments.push({assignmentId:item.itemId+"-"+date,itemId:item.itemId,title:item.title,date,day:days[cursor.getUTCDay()],preferredTime:pol.allDay===false?pol.preferredTime:null,allDay:pol.allDay!==false,outputMode:pol.output,bundleMode:pol.bundle,scheduleOwner:"user_overlay",derivation:"pacing_policy",suggestionStatus});
    usedOnDate++;usedThisWeek++
  }
  return{ok:true,errors:[],assignments,targetItemIds:items.map(i=>i.itemId)}
}
function samePacingPolicy(a,b){return JSON.stringify(copyPolicy(a??{}))===JSON.stringify(copyPolicy(b??{}))}
function renderPacing(c){
  if(!c.pacingEligible)return'<section class="panel"><div class="panel-body"><div class="empty"><strong>개인 일정화 대상이 아닙니다</strong>원문 일정이 이미 있거나, pacing을 만들 Item queue가 없습니다.</div></div></section>';
  const pol=pacingPolicy(c),draft=calculatePacing(c,pol),confirmed=reviews.pacingByContentId[c.contentId],confirmedCurrent=confirmed&&samePacingPolicy(confirmed.policy,pol);
  const status=confirmedCurrent?["confirmed overlay","green"]:confirmed?["수정 중 · 적용 전","amber"]:["draft preview","amber"];
  const targetEnd='<div class="field"><label>목표 종료일</label><input type="date" id="paceTargetEnd" value="'+esc(pol.targetEndDate)+'" '+(pol.mode==="target_end"?"":"disabled")+'></div>';
  return '<section class="panel"><div class="panel-head"><h2>날짜 없는 Item을 내 일정으로</h2>'+badge(status[0],status[1])+'</div><div class="panel-body pacing-grid"><div class="form-card"><div class="field"><label>시작일</label><input type="date" id="paceStart" value="'+esc(pol.startDate)+'"></div><div class="field"><label>배치 방식</label><select id="paceMode"><option value="items_per_day" '+(pol.mode==="items_per_day"?"selected":"")+'>하루 N개</option><option value="items_per_week" '+(pol.mode==="items_per_week"?"selected":"")+'>주 N개</option><option value="target_end" '+(pol.mode==="target_end"?"selected":"")+'>목표 종료일까지 균등 배치</option></select></div><div class="field"><label>N개</label><input type="number" min="1" max="20" id="paceRate" value="'+esc(pol.rate)+'" '+(pol.mode==="target_end"?"disabled":"")+'></div>'+targetEnd+'<div class="field"><label>허용 요일</label><div class="weekday-row">'+["일","월","화","수","목","금","토"].map((d,i)=>'<button type="button" data-weekday="'+i+'" aria-pressed="'+pol.weekdays.includes(i)+'" class="'+(pol.weekdays.includes(i)?"active":"")+'">'+d+'</button>').join("")+'</div></div><div class="field"><label>쉬는 날 · 쉼표로 구분</label><input id="paceRestDates" placeholder="2026-08-15, 2026-08-22" value="'+esc(pol.restDates.join(", "))+'"></div><div class="field"><label>선호 시간</label><input type="time" id="paceTime" value="'+esc(pol.preferredTime)+'" '+(pol.allDay?"disabled":"")+'></div><div class="field"><label><input type="checkbox" id="paceAllDay" '+(pol.allDay?"checked":"")+'> 종일 일정</label></div><div class="field"><label>출력</label><select id="paceOutput"><option value="todo_due" '+(pol.output==="todo_due"?"selected":"")+'>Todo due</option><option value="calendar" '+(pol.output==="calendar"?"selected":"")+'>Calendar</option></select></div><div class="field"><label>묶기</label><select id="paceBundle"><option value="per_item" '+(pol.bundle==="per_item"?"selected":"")+'>Item별</option><option value="session_bundle" '+(pol.bundle==="session_bundle"?"selected":"")+'>같은 날 session 묶음</option></select></div><button class="btn primary" data-action="apply-pacing" data-id="'+esc(c.contentId)+'" '+(draft.ok?"":"disabled")+'>이 개인 일정 적용</button>'+(confirmed?'<button class="btn" data-action="clear-pacing" data-id="'+esc(c.contentId)+'">적용 취소</button>':'')+'</div><div><div class="info-banner warning">이 날짜는 원문 사실이 아닙니다. 확인 전에는 draft이고, 적용 뒤에도 UserFlowCopy의 개인 overlay로만 저장됩니다. 정책을 바꿔도 원문 일정과 완료된 과거 occurrence는 건드리지 않습니다.</div>'+(draft.ok?'<div class="schedule-list" style="margin-top:12px">'+draft.assignments.map(a=>'<div class="schedule-card"><strong>'+esc(a.date)+' ('+a.day+')'+(a.allDay?"":" "+esc(a.preferredTime))+'</strong><span>'+esc(a.title)+'</span><span>user_overlay · '+esc(a.derivation)+'</span></div>').join("")+'</div>':'<div class="info-banner danger" style="margin-top:12px">'+draft.errors.map(esc).join("<br>")+'</div>')+'</div></div></section>'
}
function eventIntentEligibility(c,occurrence,intent){
  const errors=[],ev=c.eventSource;
  if(!occurrence)errors.push("회차를 먼저 선택하세요.");
  if(!["save","book","attend","result_check"].includes(intent))errors.push("사용자 intent를 선택하세요.");
  if(occurrence?.status==="cancelled")errors.push("취소된 회차는 저장·내보내기 할 수 없습니다.");
  if(occurrence?.status==="ended")errors.push("종료된 회차는 구조 확인만 가능하며 새 일정으로 만들지 않습니다.");
  if(occurrence?.status==="rescheduled")errors.push("변경된 확정 회차를 다시 확보하기 전에는 생성하지 않습니다.");
  if(ev?.itemActivation==="none_until_replacement_details_confirmed")errors.push("변경된 실제 일시·장소가 확인될 때까지 생성하지 않습니다.");
  const start=occurrence?.start??(occurrence?.allDay&&occurrence?.startDate?occurrence.startDate:null);
  const endMoment=occurrence?.end??start,observedMoment=DATA.generatedAt;
  if(start&&observedMoment&&Date.parse(endMoment)<Date.parse(observedMoment)&&!["ended","cancelled","rescheduled"].includes(occurrence?.status))errors.push("관찰 시점에 이미 지난 회차라 새 일정으로 만들지 않습니다.");
  if(occurrence&&!start)errors.push("확정된 시작 일시가 없습니다.");
  if(occurrence&&!(occurrence.sourceRowIds??[]).length)errors.push("이 회차를 뒷받침하는 SourceRow가 없습니다.");
  return{ok:errors.length===0,errors,start}
}
function activateEventIntentUi(c,occurrence,intent){
  const eligible=eventIntentEligibility(c,occurrence,intent);
  if(!eligible.ok)return{ok:false,errors:eligible.errors,item:null,projectionPlan:null};
  const itemId=c.contentId+"-"+intent+"-"+occurrence.occurrenceId,title=intent==="attend"?c.title+" 참석하기":intent==="book"?c.title+" 예약하기":intent==="result_check"?c.title+" 결과 확인하기":c.title+" 관심 일정으로 저장하기";
  const item={itemId,stepId:c.contentId+"-event-intent",title,description:occurrence.label??"",intent:intent==="save"?"record":"act",completion:{mode:"check",doneWhen:intent==="attend"?"선택한 회차 참석 상태를 남겼다.":"선택한 의도를 실행하고 상태를 남겼다."},schedule:{mode:"absolute",start:eligible.start,end:occurrence.end??null,timezone:occurrence.timezone??"Asia/Seoul",allDay:occurrence.allDay??false},sourceRowIds:occurrence.sourceRowIds,occurrenceId:occurrence.occurrenceId,scheduleOwner:"source",derivation:"direct"};
  const calendar=["attend","save"].includes(intent),relevantWindow=(c.eventSource?.windows??[]).find(window=>["booking","application","registration","ticket_open"].includes(window.kind)),projectionPlan={primary:calendar?"calendar":"todo",component:calendar?"VEVENT":"VTODO",nestedComponentCount:0,due:calendar?null:(relevantWindow?.end??null),dueMeaning:calendar?null:(relevantWindow?.end?"source window deadline":"no invented due")};
  return{ok:true,errors:[],item,projectionPlan}
}
function renderEvent(c){
  const ev=c.eventSource;if(!ev)return'<section class="panel"><div class="panel-body"><div class="empty"><strong>Event source가 아닙니다</strong>이 콘텐츠에는 Series·Edition·Occurrence 원문 구조가 없습니다.</div></div></section>';
  const defaultIntent=String(ev.itemActivation??"").includes("book")||String(ev.itemActivation??"").includes("application")?"book":String(ev.itemActivation??"").includes("interest")?"save":"attend";
  const occ=ev.occurrences??[],sel=state.selectedOccurrence[c.contentId]??occ.find(o=>o.status==="scheduled")?.occurrenceId??occ.find(o=>o.status!=="cancelled")?.occurrenceId??occ[0]?.occurrenceId,selected=occ.find(o=>o.occurrenceId===sel),intent=state.selectedEventIntent[c.contentId]??defaultIntent,eligibility=eventIntentEligibility(c,selected,intent),draft=state.eventDrafts[c.contentId],statusTone=s=>s==="cancelled"?"red":s==="ended"||s==="rescheduled"?"amber":"green";
  const draftHtml=draft?.ok&&draft.item?.occurrenceId===selected?.occurrenceId&&draft.intent===intent?'<div class="event-card selected"><div class="badge-row">'+badge("personal Item preview","green")+badge(draft.projectionPlan.component,"blue")+'</div><h3>'+esc(draft.item.title)+'</h3><dl class="kv"><dt>Item ID</dt><dd>'+esc(draft.item.itemId)+'</dd><dt>scheduleOwner</dt><dd>source occurrence</dd><dt>intent owner</dt><dd>user_overlay</dd><dt>derivation</dt><dd>direct</dd><dt>source rows</dt><dd>'+esc(draft.item.sourceRowIds.join(", "))+'</dd><dt>due</dt><dd>'+esc(draft.projectionPlan.due??draft.projectionPlan.dueMeaning??"VEVENT time")+'</dd><dt>canonical 반영</dt><dd>아직 아님 · preview only</dd></dl></div>':"";
  const selectedHtml=selected?'<div class="event-card selected"><div class="badge-row">'+badge("source occurrence","purple")+badge(selected.status??"scheduled",statusTone(selected.status))+'</div><h3>'+esc(c.title)+'</h3><p class="mini">'+esc(selected.start??selected.startDate??"일시 미확정")+' · '+esc(selected.locationName??"장소 미확정")+'</p><div class="field"><label>내 의도</label><select id="eventIntent"><option value="attend" '+(intent==="attend"?"selected":"")+'>참석</option><option value="save" '+(intent==="save"?"selected":"")+'>관심 일정 저장</option><option value="book" '+(intent==="book"?"selected":"")+'>예약하기</option><option value="result_check" '+(intent==="result_check"?"selected":"")+'>결과 확인</option></select></div><dl class="kv"><dt>scheduleOwner</dt><dd>source</dd><dt>derivation</dt><dd>direct</dd><dt>완료 상태</dt><dd>intent 뒤 FlowMe Item</dd><dt>취소·종료 시</dt><dd>새 export 금지</dd></dl>'+(eligibility.ok?'<button class="btn primary" data-action="preview-event">개인 Item preview 만들기</button>':'<div class="info-banner danger">'+eligibility.errors.map(esc).join("<br>")+'</div>')+draftHtml+'</div>':'<div class="empty"><strong>회차를 선택하세요</strong>기간·접수창만 있는 원문에는 확정 회차를 발명하지 않습니다.</div>';
  const occurrenceHtml=occ.length?occ.map(o=>'<button class="event-card '+(o.occurrenceId===sel?"selected":"")+'" data-occurrence="'+esc(o.occurrenceId)+'" data-id="'+esc(c.contentId)+'"><strong>'+esc(o.start??o.startDate??"날짜 미정")+'</strong><div class="item-detail">'+esc(o.locationName??o.label??"")+'</div><div class="badge-row" style="margin-top:8px">'+badge(o.status??"scheduled",statusTone(o.status))+badge((o.sourceRowIds??[]).length+" source rows","purple")+'</div></button>').join(""):'<div class="info-banner warning">고정 occurrence가 없고 기간/규칙만 있습니다. 거짓 회차를 만들지 않습니다.</div>';
  const windowHtml=(ev.windows??[]).map(w=>'<div class="event-card"><strong>'+esc(w.start??w.startDate??"시작 미확정")+' → '+esc(w.end??w.endDate??"종료 미확정")+'</strong><div class="item-detail">window · '+esc(w.kind??w.temporalIntent??"availability")+' · '+esc((w.sourceRowIds??[]).length)+' source rows</div></div>').join("");
  const milestoneHtml=(ev.milestones??[]).map(m=>'<div class="event-card"><strong>'+esc(m.at??m.date??"시점 미확정")+'</strong><div class="item-detail">milestone · '+esc(m.action??m.temporalIntent??"status")+' · '+esc((m.sourceRowIds??[]).length)+' source rows'+((m.sourceRowIds??[]).length?"":" · projection blocked")+'</div></div>').join("");
  return '<section class="panel"><div class="panel-head"><div><div class="eyebrow">Series → Edition → Occurrence</div><h2>'+esc(c.title)+'</h2></div>'+badge((ev.edition?.editionId??"edition 없음"),"purple")+'</div><div class="panel-body event-layout"><div><h3>회차·기간</h3>'+occurrenceHtml+windowHtml+milestoneHtml+'</div><div><h3>사용자 intent 뒤 생성</h3>'+selectedHtml+'<div class="info-banner">매년 날짜가 다시 발표되는 행사는 Series로 묶고 edition별 실제 날짜를 저장합니다. yearly RRULE을 추정하지 않습니다.</div></div></div></section>'
}
function effectiveGraph(c){
  const graph=structuredClone(c.dataGraph),confirmed=reviews.pacingByContentId[c.contentId],eventDraft=state.eventDrafts[c.contentId];
  if(confirmed?.assignments?.length){
    const copyId="user-flow-copy:"+c.contentId;
    graph.nodes.push({nodeId:copyId,type:"user_flow_copy",label:"확정된 개인 일정 정책",data:{scheduleOwner:"user_overlay",derivation:"pacing_policy",suggestionStatus:"confirmed",policy:confirmed.policy}});
    for(const assignment of confirmed.assignments){
      const occurrenceId="user-occurrence:"+assignment.assignmentId;
      graph.nodes.push({nodeId:occurrenceId,type:"occurrence",label:assignment.date+" · "+assignment.title,data:assignment});
      graph.edges.push({from:copyId,to:occurrenceId,relation:"generates"});
      graph.edges.push({from:assignment.itemId,to:occurrenceId,relation:"scheduled_as_user_overlay"});
    }
  }
  if(eventDraft?.ok){
    const copyId="user-flow-copy:"+c.contentId+":event",itemId=eventDraft.item.itemId,projectionId="projection:"+itemId;
    graph.nodes.push({nodeId:copyId,type:"user_flow_copy",label:"선택한 행사 intent",data:{intent:eventDraft.intent,owner:"user_overlay",previewOnly:true}});
    graph.nodes.push({nodeId:itemId,type:"item",label:eventDraft.item.title,data:eventDraft.item});
    graph.nodes.push({nodeId:projectionId,type:"projection",label:eventDraft.projectionPlan.component+" preview",data:eventDraft.projectionPlan});
    graph.edges.push({from:copyId,to:itemId,relation:"activates"});
    graph.edges.push({from:itemId,to:projectionId,relation:"projects_as"});
    for(const rowId of eventDraft.item.sourceRowIds??[])graph.edges.push({from:rowId,to:itemId,relation:"supports"});
  }
  return graph
}
function renderLineage(c){const graph=effectiveGraph(c);const types=["source","source_row","item","step","flow","bundle","user_flow_copy","occurrence","projection"];let node=graph.nodes.find(n=>n.nodeId===state.nodeId);if(!node){node=graph.nodes.find(n=>n.type==="item")??graph.nodes[0];state.nodeId=node?.nodeId}return '<section class="panel"><div class="panel-head"><div><div class="eyebrow">현재 콘텐츠의 실제 데이터</div><h2>원문 → SourceRow → Item → Projection</h2></div>'+badge(graph.nodes.length+" nodes","blue")+'</div><div class="panel-body"><div class="lineage-flow">'+types.map(t=>{const count=graph.nodes.filter(n=>n.type===t).length;return'<button class="node-chip '+(node?.type===t?"active":"")+'" data-node-type="'+t+'" data-id="'+esc(c.contentId)+'"><strong>'+esc(t)+'</strong><div class="mini">'+count+'개</div></button>'}).join('<span style="align-self:center">→</span>')+'</div><div class="two-col"><div><h3>'+esc(node?.label??"노드 없음")+'</h3><div class="content-list" style="max-height:420px;border:1px solid var(--border);border-radius:10px">'+graph.nodes.filter(n=>n.type===node?.type).map(n=>'<button class="list-item '+(n.nodeId===node.nodeId?"active":"")+'" data-node="'+esc(n.nodeId)+'" data-id="'+esc(c.contentId)+'"><div class="list-title">'+esc(n.label)+'</div><div class="list-meta">'+esc(n.nodeId)+'</div></button>').join("")+'</div></div><div><h3>실제 JSON 필드</h3><pre class="json-view">'+safeJson(node?.data??{})+'</pre><h3>연결</h3><div class="mini">'+graph.edges.filter(e=>e.from===node?.nodeId||e.to===node?.nodeId).map(e=>esc(e.from+" → "+e.relation+" → "+e.to)).join("<br>")+'</div></div></div></div></section>'}
function renderHistorical(c){const h=c.historicalPreview;return '<section class="panel"><div class="panel-head"><h2>Historical preview</h2>'+badge("정상 count 제외","amber")+'</div><div class="panel-body"><div class="info-banner warning">과거 UI 구조는 남아 있지만 최신 SourceRow provenance가 없어 정상 변환 결과처럼 보이지 않습니다.</div><dl class="kv"><dt>원문</dt><dd>'+esc(c.source.title)+'</dd><dt>카드</dt><dd>'+esc(h?.cardCount??0)+'</dd><dt>입력</dt><dd>'+esc(h?.inputCount??0)+'</dd><dt>체크박스</dt><dd>'+esc(h?.checkboxCount??0)+'</dd></dl>'+(h?.localPreviewPath?'<a class="btn" href="'+esc(pathToRelative(h.localPreviewPath))+'">기존 미리보기 열기</a>':'')+'</div></section>'}
function pathToRelative(p){return p.startsWith("docs/content-audit/")?p.replace("docs/content-audit/",""):p}
function renderDetail(c,mode){
  const body=mode==="flow"?renderFlow(c):PROJECTIONS.includes(mode)?renderProjection(c,mode):mode==="pacing"?renderPacing(c):mode==="event"?renderEvent(c):mode==="review"?'<section class="panel"><div class="panel-head"><h2>콘텐츠 검토</h2>'+badge(isReviewed(c.contentId)?"REVIEWED_BY_USER":"NOT_REVIEWED_BY_USER",isReviewed(c.contentId)?"green":"amber")+'</div><div class="panel-body">'+reviewForm(c)+'</div></section>':renderLineage(c);
  return '<header class="detail-hero"><div class="detail-top"><div><div class="badge-row">'+badge(TIER[c.corpusTier],c.corpusTier==="product_candidate"?"blue":c.corpusTier==="structure_probe"?"purple":c.corpusTier==="boundary_control"?"red":"amber")+badge(c.readiness.logicReadiness,toneFor(c.readiness.logicReadiness))+badge("사용자 "+(isReviewed(c.contentId)?"검토 완료":"미검토"),isReviewed(c.contentId)?"green":"")+'</div><h1>'+esc(c.title)+'</h1><p>'+esc(c.saveReason)+'</p></div><button class="btn" data-action="copy-link">직접 링크 복사</button></div><div class="detail-meta"><div class="meta-box"><label>원문 제공자</label><strong>'+esc(c.source.provider)+'</strong></div><div class="meta-box"><label>원문 형태</label><strong>'+esc(c.taxonomy.sourceShape)+'</strong></div><div class="meta-box"><label>Item / SourceRow</label><strong>'+(c.canonical.items?.length??0)+' / '+(c.canonical.sourceRows?.length??0)+'</strong></div><div class="meta-box"><label>기본 결과물</label><strong>'+esc(LABEL[c.primaryProjection])+'</strong></div></div></header>'+modeTabs(c,mode)+body
}
function reviewForm(c){
  const r=reviewFor(c.contentId),answers=r.answers??{};
  const q=(key,label,opts,required=false)=>'<div class="review-question"><label>'+label+(required?' <span class="review-required">필수</span>':'')+'</label><div class="choice-row">'+opts.map(o=>'<label><input type="radio" name="'+key+'" value="'+o+'" '+(answers[key]===o?"checked":"")+'><span>'+o+'</span></label>').join("")+'</div></div>';
  return '<section class="section"><h3>내 검토 · 실제 사용자 입력</h3><div class="info-banner warning">현재 상태: '+(r.userReviewStatus==="reviewed"?"REVIEWED_BY_USER":"NOT_REVIEWED_BY_USER")+'. 내부 agent 판정은 이 응답을 대신하지 않습니다.</div></section><form class="review-form" data-id="'+esc(c.contentId)+'"><div class="review-question"><label>최종 판정 <span class="review-required">필수</span></label><div class="review-status"><label class="go"><input type="radio" name="verdict" value="go" '+(r.verdict==="go"?"checked":"")+'><span>Go</span></label><label class="modify"><input type="radio" name="verdict" value="modify" '+(r.verdict==="modify"?"checked":"")+'><span>Modify</span></label><label class="hold"><input type="radio" name="verdict" value="hold" '+(r.verdict==="hold"?"checked":"")+'><span>Hold</span></label></div></div>'+q("useful","전체적으로 쓸 만한가?",["yes","partly","no"],true)+q("saveReason","원문 링크만 저장하는 것보다 저장할 이유가 있는가?",["clear","weak","none"])+q("itemSize","Item 크기가 적절한가?",["appropriate","too_small","too_large","mixed"],true)+q("detailEnough","상세 설명과 완료 기준이 충분한가?",["yes","partly","no"])+q("firstAction","첫 행동이 명확한가?",["yes","partly","no"])+q("projection","기본 projection이 맞는가?",["yes","change","unsure"],true)+q("checklistTodo","Checklist와 Todo 구분이 자연스러운가?",["yes","change","not_applicable"])+q("schedule","일정화가 자연스러운가?",["yes","too_much","too_little","not_applicable"])+q("calendarLoad","Calendar가 부담스럽지 않은가?",["helpful","too_many","too_few","not_applicable"])+q("modificationDegree","직접 수정해야 할 정도",["none","minor","major","rebuild"])+'<div class="field"><label>빠진 Item</label><textarea name="missingItems" rows="2" maxlength="600">'+esc(r.missingItems??"")+'</textarea></div><div class="field"><label>삭제하고 싶은 Item</label><textarea name="deleteItems" rows="2" maxlength="600">'+esc(r.deleteItems??"")+'</textarea></div><div class="field"><label>자유 의견</label><textarea name="comment" rows="5" maxlength="1200">'+esc(r.comment??"")+'</textarea></div><button class="btn primary" type="submit">이 검토 저장</button></form>'
}
function inspectorSourceHtml(c){
  const current=route(),cell=PROJECTIONS.includes(current.mode)?projectionCellForUi(c,current.mode):null,userStatus=isReviewed(c.contentId)?"REVIEWED_BY_USER":"NOT_REVIEWED_BY_USER";
  return '<section class="section"><h3>출처와 provenance</h3><dl class="kv"><dt>제공자</dt><dd>'+esc(c.source.provider)+'</dd><dt>원문</dt><dd><a href="'+esc(c.source.canonicalUrl)+'" target="_blank" rel="noreferrer">'+esc(c.source.title??c.title)+'</a></dd><dt>확인일</dt><dd>'+esc(c.source.observedAt)+'</dd><dt>접근</dt><dd>'+esc(c.source.accessStatus)+'</dd><dt>Dataset</dt><dd>'+esc(c.lineage.datasetId)+'</dd><dt>Hash</dt><dd>'+esc(c.lineage.canonicalContentHash)+'</dd></dl></section><section class="section"><h3>상태 축</h3><div class="badge-row">'+badge("Logic "+c.readiness.logicReadiness,toneFor(c.readiness.logicReadiness))+badge("Public "+c.readiness.publicReadiness,toneFor(c.readiness.publicReadiness))+badge("Rights "+c.readiness.rightsStatus,"purple")+badge("Personal "+c.readiness.personalConversionAvailability,"blue")+'</div></section>'+(cell?'<section class="section"><h3>'+LABEL[cell.projection]+' 손실</h3><p class="mini">'+esc(cell.lossManifest.map(x=>x.reason).join(" ")||"명시된 property-level 손실 없음")+'</p><dl class="kv"><dt>record</dt><dd>'+cell.counts.destinationRecordCount+'</dd><dt>child entry</dt><dd>'+cell.counts.childEntryCount+'</dd><dt>component</dt><dd>'+cell.counts.componentCount+'</dd></dl></section>':'')+'<section class="section"><h3>Claim boundary</h3><p class="mini">콘텐츠별 사용자 검토: '+userStatus+'<br>관찰 사용자 검증: NOT_RUN<br>외부 Calendar/VTODO 왕복: NOT_RUN<br>production runtime: 변경 없음</p></section>'
}
function renderInspector(c){if(!c){inspectorBody.innerHTML='<div class="empty"><strong>콘텐츠를 선택하세요</strong></div>';return}if(state.inspector==="review"){inspectorBody.innerHTML=reviewForm(c);bindReview();return}inspectorBody.innerHTML=inspectorSourceHtml(c)}
function renderCoverage(){const counts={};for(const c of CONTENTS.filter(c=>["product_candidate","structure_probe"].includes(c.corpusTier))){const k=c.taxonomy.primaryLifeArea;counts[k]=(counts[k]||0)+1}return '<section class="hero"><div class="eyebrow">Coverage</div><h1>'+DATA.counts.normal+'개 정상·구조 콘텐츠의 분포</h1><p>숫자는 machine-readable view model에서 계산됩니다. Historical과 Boundary는 정상 count에서 빠집니다.</p></section><section class="panel"><div class="panel-head"><h2>lifeArea</h2></div><div class="panel-body">'+Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<div class="agenda-row"><strong>'+esc(LIFE[k]??k)+'</strong><div><div style="height:10px;background:var(--blueSoft);border-radius:9px"><div style="height:100%;width:'+Math.max(5,v/Math.max(...Object.values(counts))*100)+'%;background:var(--blue);border-radius:9px"></div></div><span class="mini">'+v+'개</span></div></div>').join("")+'</div></section><section class="panel"><div class="panel-head"><h2>검증 경계</h2></div><div class="panel-body two-col"><div class="info-banner">Projection 조합: '+DATA.counts.projectionCell+'개<br>모든 정상 콘텐츠 × 5개</div><div class="info-banner warning">사용자 검토: '+CONTENTS.filter(c=>isReviewed(c.contentId)).length+'개<br>나머지는 NOT_REVIEWED_BY_USER</div></div></section>'}
function renderExclusions(){const rows=DATA.excludedRecords??[];return '<section class="hero"><div class="eyebrow">Inclusion lineage</div><h1>제외된 variant도 이유와 함께 남깁니다</h1><p>동일 URL의 단순 제목 변경·복제는 별도 user job으로 세지 않습니다. 아래 기록은 정상 '+DATA.counts.normal+'개 수치에서 제외됩니다.</p><div class="metric-row"><div class="metric"><strong>'+rows.length+'</strong><span>제외 기록</span></div><div class="metric"><strong>'+rows.filter(r=>r.duplicateOf).length+'</strong><span>중복 연결</span></div></div></section><section class="panel"><div class="panel-head"><h2>전체 제외 사유</h2></div><div class="panel-body">'+(rows.length?rows.map(r=>'<article class="excluded-row"><div class="badge-row">'+badge(r.inclusionStatus??"excluded","amber")+(r.duplicateOf?badge("duplicate","purple"):"")+'</div><h3>'+esc(r.title??r.contentId)+'</h3><p>'+esc(r.exclusionReason??r.reason??"제외 사유 기록 없음")+'</p>'+(r.duplicateOf?'<p><strong>대표 콘텐츠:</strong> '+esc(r.duplicateOf)+'</p>':'')+'</article>').join(""):'<div class="empty"><strong>제외 기록 없음</strong></div>')+'</div></section>'}
function renderMobileBar(c,r){if(c)return'<button class="btn" data-action="open-mobile-source">출처</button><button class="btn" data-action="open-mobile-review">검토</button><button class="btn primary" data-action="next-unreviewed">다음</button>';return'<button class="btn" data-action="open-explorer">검색·필터</button><button class="btn primary" data-action="next-unreviewed">다음 미검토</button>'}
function render(){
  renderHeader();renderList();const r=route();let c=null;if(r.kind==="gallery")workspace.innerHTML=renderGallery();else if(r.kind==="coverage")workspace.innerHTML=renderCoverage();else if(r.kind==="exclusions")workspace.innerHTML=renderExclusions();else{c=BY_ID.get(r.contentId);if(!c){setRoute("#gallery");return}workspace.innerHTML=renderDetail(c,r.mode)}renderInspector(c);mobileBar.innerHTML=renderMobileBar(c,r);document.querySelectorAll(".rail-btn[data-route]").forEach(button=>button.classList.toggle("active",button.dataset.route==="#"+r.kind));saveState();document.title=(c?c.title+" · ":"")+"FlowMe Full-Corpus Lab";bindReview();globalSearch.value=state.search;mobileSearch.value=state.search}
function bindReview(){document.querySelectorAll(".review-form").forEach(form=>form.onsubmit=e=>{e.preventDefault();const id=form.dataset.id,fd=new FormData(form),required=["verdict","useful","itemSize","projection"],missing=required.filter(key=>!fd.get(key));if(missing.length){toast("필수 항목을 먼저 선택하세요");return}const old=reviewFor(id),answerKeys=["useful","saveReason","itemSize","detailEnough","firstAction","projection","checklistTodo","schedule","calendarLoad","modificationDegree"];reviews.reviewsByContentId[id]={...old,userReviewStatus:"reviewed",verdict:fd.get("verdict"),answers:Object.fromEntries(answerKeys.map(key=>[key,fd.get(key)])),missingItems:String(fd.get("missingItems")??""),deleteItems:String(fd.get("deleteItems")??""),comment:String(fd.get("comment")??""),updatedAt:new Date().toISOString()};saveState();toast("검토를 로컬에 저장했습니다");if(mobileReviewDialog.open)mobileReviewDialog.close();render()})}
function nextUnreviewed(){const list=getFiltered().filter(c=>!isReviewed(c.contentId));const c=list[0]??CONTENTS.find(c=>!isReviewed(c.contentId));if(c)setRoute(contentHash(c));else toast("모든 콘텐츠를 검토했습니다")}
function downloadJson(filename,payload,message){const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),500);toast(message)}
document.addEventListener("click",e=>{const b=e.target.closest("button,[data-route]");if(!b)return;
  if(b.dataset.content){setRoute(contentHash(BY_ID.get(b.dataset.content)));closeExplorerDrawer()}
  if(b.dataset.route)setRoute(b.dataset.route);
  if(b.dataset.mode){setRoute(contentHash(BY_ID.get(b.dataset.id),b.dataset.mode))}
  if(b.dataset.view){state.view=b.dataset.view;document.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===state.view));render()}
  if(b.dataset.inspector){state.inspector=b.dataset.inspector;document.querySelectorAll("[data-inspector]").forEach(x=>{const selected=x.dataset.inspector===state.inspector;x.classList.toggle("active",selected);x.setAttribute("aria-selected",selected)});renderInspector(BY_ID.get(route().contentId))}
  const a=b.dataset.action;if(a==="load-more"){state.limit+=24;render()}if(a==="next-unreviewed")nextUnreviewed();
  if(a==="copy-link"){navigator.clipboard?.writeText(location.href).then(()=>toast("직접 링크를 복사했습니다")).catch(()=>toast(location.href))}
  if(a==="download-corpus")downloadJson("flowme-full-corpus-ui-view-model-v1.json",DATA,"전체 corpus JSON을 내보냈습니다");
  if(a==="export-review")downloadJson("flowme-full-corpus-review-v1.json",{...reviews,exportedAt:new Date().toISOString()},"검토 JSON을 내보냈습니다");
  if(a==="open-import")importDialog.showModal();if(a==="close-import")importDialog.close();
  if(a==="run-import")runImport();
  if(a==="open-mobile-review"){const c=BY_ID.get(route().contentId);if(c){mobileReviewBody.innerHTML=reviewForm(c);mobileReviewDialog.showModal();bindReview()}}
  if(a==="close-mobile-review")mobileReviewDialog.close();
  if(a==="open-mobile-source"){const c=BY_ID.get(route().contentId);if(c){mobileSourceBody.innerHTML=inspectorSourceHtml(c);mobileSourceDialog.showModal()}}
  if(a==="close-mobile-source")mobileSourceDialog.close();
  if(a==="open-explorer")openExplorerDrawer(b);
  if(a==="toggle-todo-capability"){state.todoCapability=!state.todoCapability;render()}
  if(b.dataset.weekday!=null){const c=BY_ID.get(route().contentId),p=pacingPolicy(c),d=Number(b.dataset.weekday);p.weekdays=p.weekdays.includes(d)?p.weekdays.filter(x=>x!==d):[...p.weekdays,d].sort();state.pacing[c.contentId]=p;render()}
  if(a==="apply-pacing"){const c=BY_ID.get(b.dataset.id),p=readPacing(c),result=calculatePacing(c,p,"confirmed");if(!result.ok){toast(result.errors[0]??"일정화 조건을 확인하세요");render();return}reviews.pacingByContentId[c.contentId]={policy:copyPolicy(p),assignments:result.assignments,suggestionStatus:"confirmed",scheduleOwner:"user_overlay",derivation:"pacing_policy",updatedAt:new Date().toISOString()};saveState();toast("개인 일정 overlay를 적용했습니다");render()}
  if(a==="clear-pacing"){delete reviews.pacingByContentId[b.dataset.id];saveState();render()}
  if(b.dataset.occurrence){state.selectedOccurrence[b.dataset.id]=b.dataset.occurrence;delete state.eventDrafts[b.dataset.id];render()}
  if(a==="preview-event"){const c=BY_ID.get(route().contentId),occurrence=c?.eventSource?.occurrences?.find(o=>o.occurrenceId===(state.selectedOccurrence[c.contentId]??c.eventSource.occurrences.find(x=>x.status==="scheduled")?.occurrenceId??c.eventSource.occurrences[0]?.occurrenceId)),intent=document.getElementById("eventIntent")?.value??state.selectedEventIntent[c.contentId]??"attend",result=activateEventIntentUi(c,occurrence,intent);state.selectedEventIntent[c.contentId]=intent;state.eventDrafts[c.contentId]={...result,intent};toast(result.ok?"개인 Item과 projection preview를 만들었습니다":result.errors[0]??"preview를 만들 수 없습니다");render()}
  if(a==="toggle-complete"){state.completedItems[b.dataset.key]=!state.completedItems[b.dataset.key];render()}
  if(b.dataset.node){state.nodeId=b.dataset.node;render()}
  if(b.dataset.nodeType){const c=BY_ID.get(b.dataset.id),n=c.dataGraph.nodes.find(x=>x.type===b.dataset.nodeType);if(n)state.nodeId=n.nodeId;render()}
});
function readPacing(c){const p=pacingPolicy(c);p.startDate=document.getElementById("paceStart")?.value??p.startDate;p.targetEndDate=document.getElementById("paceTargetEnd")?.value??p.targetEndDate;p.mode=document.getElementById("paceMode")?.value??p.mode;p.rate=Number(document.getElementById("paceRate")?.value??p.rate);p.restDates=(document.getElementById("paceRestDates")?.value??"").split(",").map(x=>x.trim()).filter(Boolean);p.preferredTime=document.getElementById("paceTime")?.value??p.preferredTime;p.allDay=document.getElementById("paceAllDay")?.checked??p.allDay;p.output=document.getElementById("paceOutput")?.value??p.output;p.bundle=document.getElementById("paceBundle")?.value??p.bundle;state.pacing[c.contentId]=copyPolicy(p);return p}
document.addEventListener("change",e=>{
  if(["paceStart","paceTargetEnd","paceMode","paceRate","paceRestDates","paceTime","paceAllDay","paceOutput","paceBundle"].includes(e.target.id)){const c=BY_ID.get(route().contentId);readPacing(c);render()}
  if(e.target.id==="eventIntent"){const c=BY_ID.get(route().contentId);if(c){state.selectedEventIntent[c.contentId]=e.target.value;delete state.eventDrafts[c.contentId];render()}}
});
function sanitizeReviewEntry(value){
  const verdicts=new Set(["go","modify","hold"]),allowed={useful:["yes","partly","no"],saveReason:["clear","weak","none"],itemSize:["appropriate","too_small","too_large","mixed"],detailEnough:["yes","partly","no"],firstAction:["yes","partly","no"],projection:["yes","change","unsure"],checklistTodo:["yes","change","not_applicable"],schedule:["yes","too_much","too_little","not_applicable"],calendarLoad:["helpful","too_many","too_few","not_applicable"],modificationDegree:["none","minor","major","rebuild"]};
  const answers={};for(const[key,values]of Object.entries(allowed))if(values.includes(value?.answers?.[key]))answers[key]=value.answers[key];
  const verdict=verdicts.has(value?.verdict)?value.verdict:null,userReviewStatus=value?.userReviewStatus==="reviewed"&&verdict&&answers.useful&&answers.itemSize&&answers.projection?"reviewed":"not_reviewed";
  return{userReviewStatus,verdict:userReviewStatus==="reviewed"?verdict:null,answers:userReviewStatus==="reviewed"?answers:{},missingItems:String(value?.missingItems??"").slice(0,600),deleteItems:String(value?.deleteItems??"").slice(0,600),comment:String(value?.comment??"").slice(0,1200),updatedAt:userReviewStatus==="reviewed"?String(value?.updatedAt??new Date().toISOString()):null}
}
function runImport(){const file=importFile.files[0];if(!file){importResult.textContent="파일을 선택하세요";return}const reader=new FileReader();reader.onload=()=>{try{const incoming=JSON.parse(reader.result);if(incoming.schemaVersion!==1)throw Error("schemaVersion 불일치");const warning=incoming.corpusFingerprint!==DATA.corpusFingerprint,known=new Set(CONTENTS.map(c=>c.contentId)),unknown=unique([...Object.keys(incoming.reviewsByContentId??{}),...Object.keys(incoming.pacingByContentId??{})].filter(id=>!known.has(id))),backup=JSON.stringify(reviews),mode=importMode.value,next=mode==="replace"?emptyReviewState():structuredClone(reviews);let rejectedPacing=0;
    for(const[id,value]of Object.entries(incoming.reviewsByContentId??{}))if(known.has(id))next.reviewsByContentId[id]=sanitizeReviewEntry(value);
    if(mode==="replace")next.pacingByContentId={};
    for(const[id,value]of Object.entries(incoming.pacingByContentId??{})){if(!known.has(id))continue;const c=BY_ID.get(id);if(!c.pacingEligible){rejectedPacing++;continue}const policy=copyPolicy(value?.policy??{}),result=calculatePacing(c,policy,"confirmed");if(!result.ok){rejectedPacing++;continue}next.pacingByContentId[id]={policy,assignments:result.assignments,suggestionStatus:"confirmed",scheduleOwner:"user_overlay",derivation:"pacing_policy",updatedAt:new Date().toISOString()}}
    next.corpusFingerprint=DATA.corpusFingerprint;next.schemaVersion=1;
    try{reviews=next;saveState()}catch(err){reviews=JSON.parse(backup);saveState();throw err}
    importResult.textContent=(warning?"fingerprint 경고 · ":"")+(unknown.length?unknown.length+"개 알 수 없는 contentId 제외 · ":"")+(rejectedPacing?rejectedPacing+"개 pacing policy 거부 · ":"")+"가져오기 완료";toast("검토 JSON을 검증해 가져왔습니다");render()
  }catch(err){importResult.textContent="가져오기 실패: "+err.message}};reader.readAsText(file)}
let explorerReturnFocus=null;
function openExplorerDrawer(trigger){explorerReturnFocus=trigger??document.activeElement;explorer.classList.add("open");openExplorer.setAttribute("aria-expanded","true");setTimeout(()=>mobileSearch.focus(),0)}
function closeExplorerDrawer(){explorer.classList.remove("open");openExplorer.setAttribute("aria-expanded","false");explorerReturnFocus?.focus?.()}
openExplorer.onclick=()=>openExplorerDrawer(openExplorer);closeExplorer.onclick=closeExplorerDrawer;
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&explorer.classList.contains("open")){event.preventDefault();closeExplorerDrawer()}})
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
