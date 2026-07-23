import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(here, 'input-composer-scenarios-v1.json');
const outPath = path.resolve(here, '../../content-audit/2026-07-20-flowme-input-composer-lab-v1-ko.html');
const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const dataJson = JSON.stringify(data).replaceAll('</script>', '<\\/script>');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>FlowMe 입력 실험 · 8개 사용 미리보기</title>
  <style>
    :root{
      --bg:#fafaf8;--surface:#fff;--ink:#1b1a17;--muted:#6e6b64;--line:#e7e4dd;--soft:#f3f1ec;
      --blue:#3654ff;--blue-soft:#eef1ff;--green:#1f8a5b;--green-soft:#edf8f2;--warn:#a16207;--warn-soft:#fff7df;
      --danger:#a33a32;--danger-soft:#fff0ed;--shadow:0 14px 38px rgba(29,31,25,.08);
      font-family:Inter,Pretendard,"Noto Sans KR",system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--bg)
    }
    *{box-sizing:border-box}html{scroll-behavior:smooth;scroll-snap-type:y proximity;scroll-padding-top:58px}body{margin:0;background:var(--bg);color:var(--ink)}button,input,textarea,select{font:inherit}button{color:inherit}a{color:inherit}h1,h2,h3,p{margin-top:0}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid rgba(54,84,255,.24);outline-offset:2px}
    .topbar{height:58px;position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:16px;padding:0 20px;background:rgba(250,250,248,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}
    .brand{font-size:19px;font-weight:900;letter-spacing:-.03em}.brand b{color:var(--blue)}.topbar .sub{font-size:13px;color:var(--muted);padding-left:15px;border-left:1px solid var(--line)}.topbar nav{margin-left:auto;display:flex;gap:4px}.topbar nav a{text-decoration:none;font-size:13px;color:var(--muted);padding:8px 10px;border-radius:8px}.topbar nav a:hover{background:var(--soft);color:var(--ink)}
    .page{min-height:calc(100vh - 58px);scroll-snap-align:start;position:relative;border-bottom:1px solid var(--line)}.page-number{position:absolute;right:24px;bottom:18px;font-size:12px;color:#9a978f;letter-spacing:.08em}.lab-page{background:var(--surface)}
    .workspace{height:calc(100vh - 58px);min-height:690px;display:grid;grid-template-columns:238px minmax(430px,1fr) minmax(430px,1.04fr);overflow:hidden}
    .rail,.composer,.preview-column{min-width:0;overflow-y:auto}.rail{background:#fbfbf9;border-right:1px solid var(--line);padding:22px 14px}.composer{padding:28px 32px;border-right:1px solid var(--line)}.preview-column{padding:22px;background:#f7f7f4}
    .rail-title{font-size:12px;font-weight:800;color:var(--muted);margin:0 8px 9px}.route-list{display:grid;gap:4px}.route-button,.case-button{width:100%;border:0;background:transparent;text-align:left;border-radius:9px;cursor:pointer}.route-button{padding:10px 11px;font-size:14px;display:flex;gap:10px;align-items:center}.route-button:hover,.route-button.active{background:var(--blue-soft);color:var(--blue)}.route-icon{width:24px;height:24px;border:1px solid currentColor;border-radius:7px;display:grid;place-items:center;font-size:11px;font-weight:900;flex:0 0 auto}.rail-divider{height:1px;background:var(--line);margin:18px 8px}.case-list{display:grid;gap:3px}.case-button{padding:9px 10px;display:grid;grid-template-columns:24px 1fr;gap:7px;align-items:start}.case-button:hover,.case-button.active{background:var(--soft)}.case-button.active{box-shadow:inset 3px 0 var(--blue);background:var(--blue-soft)}.case-number{font-size:11px;color:var(--muted);padding-top:2px}.case-name{font-size:13px;font-weight:750;line-height:1.25}.case-outcome{display:block;font-size:10px;color:var(--muted);margin-top:3px;font-weight:500}.boundary-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--warn);margin-right:5px}
    .composer-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:18px}.composer h1{font-size:clamp(25px,2.1vw,34px);letter-spacing:-.045em;line-height:1.08;margin-bottom:7px}.job{color:var(--muted);font-size:13px;line-height:1.5;max-width:600px}.stage-switch{display:flex;border:1px solid var(--line);border-radius:10px;padding:3px;background:var(--soft);flex:0 0 auto}.stage-button{border:0;background:transparent;padding:7px 10px;border-radius:7px;font-size:12px;cursor:pointer}.stage-button.active{background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.08);font-weight:800}.stage-help{font-size:11px;color:var(--muted);margin:-6px 0 14px}
    .source-lock{display:grid;grid-template-columns:23px minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid #b7dcc9;background:var(--green-soft);border-radius:10px;padding:11px 12px;margin-bottom:15px}.source-lock>div{min-width:0}.source-check{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--green);color:#fff;font-size:12px;font-weight:900}.source-lock strong{display:block;font-size:12px}.source-lock a{display:block;max-width:480px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--green);font-size:11px;margin-top:2px}.source-count{font-size:11px;color:var(--green);font-weight:800;text-align:right;white-space:nowrap}.boundary-source{border-color:#edc47f;background:var(--warn-soft)}.boundary-source .source-check{background:var(--warn)}.boundary-source .source-count,.boundary-source a{color:var(--warn)}
    .input-panel{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:15px 0}.input-panel h2{font-size:14px;margin-bottom:12px}.field{margin-bottom:13px}.field:last-child{margin-bottom:0}.field label,.field-label{display:flex;justify-content:space-between;gap:10px;font-size:12px;font-weight:800;margin-bottom:6px}.required-note{color:var(--blue);font-weight:700}.field input[type=text],.field input[type=url],.field input[type=date],.field input[type=file],.field textarea,.field select{width:100%;border:1px solid #cbc8c0;border-radius:9px;background:#fff;padding:11px 12px;color:var(--ink)}.field textarea{min-height:124px;resize:vertical;line-height:1.5}.field-help{font-size:11px;color:var(--muted);margin:6px 0 0;line-height:1.45}.file-shell{border:1px dashed #aaa79f;border-radius:10px;padding:14px;background:#fff}.file-shell input{border:0!important;padding:0!important}.file-result{font-size:11px;color:var(--green);margin-top:7px}.choice-row{display:flex;gap:7px;flex-wrap:wrap}.choice-button{border:1px solid var(--line);background:#fff;border-radius:8px;padding:9px 12px;cursor:pointer;font-size:12px}.choice-button.active{border-color:var(--blue);color:var(--blue);background:var(--blue-soft)}
    details.more-inputs{margin-top:12px;border-top:1px dashed var(--line);padding-top:10px}details.more-inputs summary{cursor:pointer;color:var(--muted);font-size:12px;font-weight:700}details.more-inputs[open] summary{margin-bottom:12px;color:var(--ink)}.no-input{padding:14px;background:var(--green-soft);border-radius:9px;color:#176c47;font-size:13px}.import-sample{margin-top:8px;border:0;background:transparent;color:var(--blue);font-size:12px;text-decoration:underline;cursor:pointer;padding:0}
    .derived{margin-top:16px}.derived-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}.derived h2{font-size:14px;margin:0}.source-basis{font-size:11px;color:var(--green);font-weight:700}.derived-list{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff}.derived-row{display:grid;grid-template-columns:82px 1fr;gap:10px;padding:9px 11px;border-bottom:1px solid var(--line);font-size:12px}.derived-row:last-child{border-bottom:0}.derived-row b{color:var(--muted);font-size:11px}.derived-row span{line-height:1.4}.derived-more{padding:8px 11px;background:var(--soft);font-size:11px;color:var(--muted)}
    .journey{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:16px 0 12px}.journey-step{font-size:11px;color:var(--muted)}.journey-arrow{color:#aaa79f}.composer-actions{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:14px}.input-cost{font-size:11px;color:var(--muted);line-height:1.45}.primary-action{border:0;background:var(--blue);color:white;border-radius:9px;padding:11px 18px;font-weight:800;cursor:pointer;box-shadow:0 7px 16px rgba(54,84,255,.22)}.primary-action:hover{background:#2945e8}.primary-action.boundary{background:var(--warn);box-shadow:none}
    .preview-shell{background:#fff;border:1px solid var(--line);border-radius:12px;height:calc(100vh - 104px);min-height:620px;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow)}.artifact-tabs{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid var(--line);background:#fff}.artifact-button{border:0;border-right:1px solid var(--line);background:transparent;padding:12px 4px 10px;cursor:pointer;font-size:12px;color:var(--muted);position:relative}.artifact-button:last-child{border-right:0}.artifact-button.active{color:var(--blue);font-weight:900}.artifact-button.active:after{content:"";position:absolute;left:17%;right:17%;bottom:-1px;height:3px;background:var(--blue)}.artifact-button.unavailable{color:#aaa79f}.preview-head{display:flex;justify-content:space-between;gap:18px;padding:17px 18px 12px}.preview-head h2{font-size:20px;letter-spacing:-.03em;margin:0}.preview-head p{font-size:11px;color:var(--muted);margin:4px 0 0}.preview-state{font-size:11px;color:var(--green);font-weight:800;text-align:right}.preview-body{padding:0 18px 18px;overflow:auto;flex:1;min-height:0}.preview-summary{display:flex;gap:18px;padding:12px 18px;border-top:1px solid var(--line);background:#fbfbf9;font-size:11px;color:var(--muted);flex:0 0 auto}.preview-summary b{color:var(--ink)}
    .calendar-list{border:1px solid var(--line);border-radius:10px;overflow:hidden}.calendar-group{display:grid;grid-template-columns:98px 1fr;border-bottom:1px solid var(--line)}.calendar-group:last-child{border-bottom:0}.calendar-date{padding:12px;background:#fafaf7;border-right:1px solid var(--line)}.calendar-date b{display:block;font-size:14px;color:var(--blue)}.calendar-date small{color:var(--muted)}.calendar-events{padding:6px 12px}.calendar-event{display:grid;grid-template-columns:8px 1fr;gap:8px;padding:7px 0;border-bottom:1px dotted var(--line);font-size:12px}.calendar-event:last-child{border-bottom:0}.event-dot{width:7px;height:7px;border-radius:50%;background:var(--green);margin-top:5px}
    .task-list{display:grid;gap:7px}.task{display:grid;grid-template-columns:20px 1fr;gap:10px;border:1px solid var(--line);border-radius:9px;padding:10px;background:#fff}.task input{width:17px;height:17px;accent-color:var(--blue);margin:1px 0 0}.task b{display:block;font-size:12px}.task small{display:block;color:var(--muted);font-size:10px;margin-top:3px;line-height:1.35}.task.done b{text-decoration:line-through;color:var(--muted)}.condition-box,.warning-box,.reference-box{margin:0 0 10px;padding:11px;border-radius:9px;font-size:11px;line-height:1.5}.condition-box{background:var(--blue-soft);color:#2945b8}.warning-box{margin-top:10px;margin-bottom:0;background:var(--warn-soft);color:#74520f}.reference-box{margin-top:10px;margin-bottom:0;background:var(--green-soft);color:#176c47}
    .sheet-wrap{border:1px solid var(--line);border-radius:10px;overflow:auto}.sheet{width:100%;border-collapse:collapse;font-size:11px}.sheet th,.sheet td{padding:8px 9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.sheet th{position:sticky;top:0;background:#f4f4f0;color:var(--muted);font-size:10px}.sheet td:first-child{color:var(--muted);width:38px}.sheet .status-cell{white-space:nowrap}.status-control{border:0;background:transparent;color:var(--green);font-size:10px;cursor:pointer;padding:0}.expand-button{width:100%;border:0;border-top:1px solid var(--line);background:#fafaf7;color:var(--blue);padding:9px;cursor:pointer;font-size:11px}
    .memo-card{border:1px solid #e1d39f;background:#fffdf5;border-radius:10px;padding:16px}.memo-card h3{font-size:17px;margin-bottom:13px}.memo-grid{display:grid;grid-template-columns:110px 1fr;gap:8px 12px;margin:0;font-size:12px}.memo-grid dt{font-weight:800;color:var(--muted)}.memo-grid dd{margin:0;line-height:1.45}.memo-note{border-top:1px dashed #dfd2a4;margin-top:12px;padding-top:10px;font-size:11px;line-height:1.5}.response-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px}.response-card{border:1px solid var(--line);border-radius:9px;padding:11px;background:#fff;font-size:11px}.response-card strong{display:block;margin-bottom:4px}.response-card.stop,.response-card.emergency{border-color:#e3aaa3;background:var(--danger-soft);color:#7d3029}.boundary-card{border:1px solid #e1bd6f;background:var(--warn-soft);border-radius:11px;padding:18px}.boundary-card.danger{border-color:#dba49d;background:var(--danger-soft)}.boundary-card h3{font-size:18px;margin-bottom:8px}.boundary-card p{font-size:12px;line-height:1.55;color:#655535}.boundary-card.danger p{color:#703b34}.boundary-list{margin:12px 0 0;padding-left:18px;font-size:11px;line-height:1.55}.empty-artifact{display:grid;place-items:center;text-align:center;min-height:320px;border:1px dashed #cbc8c0;border-radius:10px;color:var(--muted);padding:30px}.empty-artifact b{display:block;color:var(--ink);margin-bottom:6px}.pulse{animation:pulse .42s ease}@keyframes pulse{50%{box-shadow:0 0 0 5px rgba(54,84,255,.14)}}
    .deck-page{padding:clamp(38px,5vw,74px) clamp(22px,6vw,90px);display:flex;flex-direction:column;justify-content:center}.deck-inner{width:min(1240px,100%);margin:0 auto}.deck-kicker{font-size:12px;color:var(--blue);font-weight:900;margin-bottom:9px}.deck-page h2{font-size:clamp(30px,4vw,54px);line-height:1.08;letter-spacing:-.055em;max-width:920px;margin-bottom:14px}.deck-lead{font-size:clamp(15px,1.45vw,20px);line-height:1.55;color:#4f4d47;max-width:880px}.example-table{width:100%;border-collapse:collapse;margin-top:24px;background:#fff;border:1px solid var(--line);font-size:12px}.example-table th,.example-table td{padding:11px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.example-table th{background:#f3f2ed;color:var(--muted);font-size:11px}.example-table tr:last-child td{border-bottom:0}.example-link{border:0;background:transparent;color:var(--blue);text-align:left;padding:0;cursor:pointer;font-weight:800}.result-name{font-weight:800}.boundary-text{color:var(--warn)}
    .item-formula{margin:30px 0 24px;border:1px solid var(--line);background:#fff;display:grid;grid-template-columns:repeat(4,1fr);box-shadow:var(--shadow)}.formula-cell{padding:20px;border-right:1px solid var(--line)}.formula-cell:last-child{border-right:0}.formula-cell strong{display:block;font-size:18px;margin-bottom:6px}.formula-cell span{font-size:12px;color:var(--muted);line-height:1.5}.formula-plus{color:var(--blue)}.optional-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:9px}.optional-cell{border-top:3px solid var(--line);background:#fff;padding:14px}.optional-cell.active{border-color:var(--green)}.optional-cell b{font-size:13px}.optional-cell small{display:block;color:var(--muted);margin-top:5px;line-height:1.4}.rule-note{margin-top:18px;border-left:4px solid var(--green);padding:12px 15px;background:var(--green-soft);font-size:13px;line-height:1.55}
    .ownership-flow{display:grid;grid-template-columns:1fr 58px 1fr 58px 1fr;align-items:stretch;margin-top:30px}.owner-panel{background:#fff;border:1px solid var(--line);padding:22px}.owner-panel h3{font-size:20px}.owner-panel ul{padding-left:18px;font-size:13px;line-height:1.65;color:#4f4d47}.owner-arrow{display:grid;place-items:center;font-size:24px;color:var(--blue)}.do-not-ask{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:12px}.do-not-ask article{padding:16px;border:1px solid var(--line);background:#fff}.do-not-ask h3{font-size:14px}.do-not-ask p{font-size:12px;color:var(--muted);line-height:1.55;margin-bottom:0}
    .metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:26px}.metric{background:#fff;border:1px solid var(--line);padding:18px}.metric strong{font-size:32px;letter-spacing:-.045em;display:block}.metric span{font-size:11px;color:var(--muted);line-height:1.4}.gate-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:18px}.gate{border:1px solid var(--line);background:#fff;padding:16px}.gate.pass{border-left:4px solid var(--green)}.gate.boundary{border-left:4px solid var(--warn)}.gate h3{font-size:14px;margin-bottom:5px}.gate p{font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:0}.claim-box{margin-top:20px;padding:15px 17px;background:#f0efeb;border:1px solid var(--line);font-size:12px;line-height:1.55}.artifact-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.artifact-links a{text-decoration:none;border:1px solid var(--line);background:#fff;padding:9px 11px;border-radius:8px;font-size:11px}.artifact-links a:hover{border-color:var(--blue);color:var(--blue)}
    @media(max-width:1180px){.workspace{grid-template-columns:210px minmax(380px,1fr) minmax(390px,1fr)}.composer{padding:24px 22px}.optional-grid{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:900px){html{scroll-snap-type:none}.topbar nav{display:none}.lab-page,.workspace{max-width:100%;overflow-x:hidden}.workspace{height:auto;min-height:0;display:block}.rail,.composer,.preview-column{min-width:0;overflow:visible}.rail{border-right:0;border-bottom:1px solid var(--line);padding:14px;overflow:hidden}.route-list,.case-list{display:flex;max-width:100%;min-width:0;overflow-x:auto;overflow-y:hidden;overscroll-behavior-inline:contain;scrollbar-width:thin}.route-button{flex:0 0 150px}.case-button{flex:0 0 155px}.rail-divider{margin:12px 0}.composer{border-right:0;border-bottom:1px solid var(--line)}.preview-column{padding:16px}.preview-shell{height:auto;min-height:620px}.page{min-height:auto}.deck-page{min-height:auto;padding:56px 20px}.item-formula{grid-template-columns:1fr 1fr}.formula-cell:nth-child(2){border-right:0}.formula-cell:nth-child(-n+2){border-bottom:1px solid var(--line)}.optional-grid,.metric-grid{grid-template-columns:repeat(2,1fr)}.ownership-flow{grid-template-columns:1fr}.owner-arrow{height:42px;transform:rotate(90deg)}.example-table{min-width:780px}.table-scroll{overflow:auto}}
    @media(max-width:560px){.topbar{padding:0 12px}.topbar .sub{display:none}.workspace{display:block}.rail{padding:12px}.route-button{flex-basis:150px}.case-button{flex-basis:158px}.composer{padding:22px 14px}.composer-head{display:block}.stage-switch{width:max-content;margin-top:14px}.source-lock{grid-template-columns:23px 1fr}.source-count{grid-column:2;text-align:left}.preview-column{padding:12px}.artifact-button{font-size:10px;padding:11px 2px}.preview-head{padding:15px 13px 10px}.preview-body{padding:0 13px 13px}.calendar-group{grid-template-columns:78px 1fr}.response-grid{grid-template-columns:1fr}.composer-actions{align-items:flex-end}.primary-action{white-space:nowrap}.deck-page h2{font-size:34px}.item-formula,.optional-grid,.metric-grid,.gate-grid,.do-not-ask{grid-template-columns:1fr}.formula-cell{border-right:0;border-bottom:1px solid var(--line)}.formula-cell:last-child{border-bottom:0}.memo-grid{grid-template-columns:1fr}.memo-grid dt{margin-top:5px}.page-number{display:none}}
    @media print{.topbar{display:none}.page{min-height:100vh;break-after:page}.workspace{height:auto;min-height:100vh}.rail{display:none}.workspace{grid-template-columns:1fr 1fr}.composer,.preview-column{overflow:visible}.preview-shell{min-height:0}.primary-action,.stage-switch{display:none}}
  </style>
</head>
<body>
  <header class="topbar">
    <div class="brand"><b>Flow</b>Me</div>
    <div class="sub">입력 실험 · 판단용 시제품</div>
    <nav aria-label="보고서 페이지">
      <a href="#lab">직접 보기</a><a href="#examples">8개 사례</a><a href="#unit">저장 단위</a><a href="#ownership">입력 분리</a><a href="#evidence">점검 결과</a>
    </nav>
  </header>
  <main>
    <section class="page lab-page" id="lab" aria-label="Flow 콘텐츠 입력과 결과물 미리보기">
      <div class="workspace">
        <aside class="rail">
          <p class="rail-title">입력 경로</p>
          <div class="route-list" id="routeList"></div>
          <div class="rail-divider"></div>
          <p class="rail-title">실제 예시 8개</p>
          <div class="case-list" id="caseList"></div>
        </aside>
        <section class="composer" aria-label="최소 입력 영역">
          <div class="composer-head">
            <div><h1 id="composerTitle"></h1><p class="job" id="userJob"></p></div>
            <div class="stage-switch" role="group" aria-label="입력 단계">
              <button class="stage-button" data-stage="creator">콘텐츠 만들기</button>
              <button class="stage-button" data-stage="user">내 것으로 쓰기</button>
            </div>
          </div>
          <p class="stage-help" id="stageHelp"></p>
          <div id="sourceLock"></div>
          <div class="input-panel" id="inputPanel"></div>
          <div class="derived" id="derived"></div>
          <div class="journey" id="journey"></div>
          <div class="composer-actions">
            <div class="input-cost" id="inputCost"></div>
            <button class="primary-action" id="previewAction">결과 미리보기</button>
          </div>
        </section>
        <section class="preview-column" aria-label="결과물 미리보기">
          <div class="preview-shell" id="previewShell">
            <div class="artifact-tabs" id="artifactTabs"></div>
            <div class="preview-head"><div><h2 id="previewTitle"></h2><p id="previewSubtitle"></p></div><div class="preview-state" id="previewState"></div></div>
            <div class="preview-body" id="previewBody"></div>
            <div class="preview-summary" id="previewSummary"></div>
          </div>
        </section>
      </div>
      <span class="page-number">01 / 05</span>
    </section>

    <section class="page deck-page" id="examples">
      <div class="deck-inner">
        <p class="deck-kicker">실제 원문 기반 8개</p>
        <h2>같은 입력 화면이 아니라,<br>각 내용에 필요한 만큼만 묻습니다.</h2>
        <p class="deck-lead">K-MOOC는 14주 진도표, 오디오북은 38장 재생 큐, 폭염 가이드는 조건 대응 카드입니다. 표의 한 행을 입력 한 번으로 세며, 원문에서 찾은 값은 다시 묻지 않습니다.</p>
        <div class="table-scroll"><table class="example-table"><thead><tr><th>콘텐츠</th><th>입력</th><th>첫 결과까지</th><th>사용 결과</th><th>지켜야 할 경계</th></tr></thead><tbody id="exampleRows"></tbody></table></div>
      </div>
      <span class="page-number">02 / 05</span>
    </section>

    <section class="page deck-page" id="unit">
      <div class="deck-inner">
        <p class="deck-kicker">저장 단위</p>
        <h2>기본은 체크할 수 있는 한 항목.<br>설명과 완료 기준이 항상 붙습니다.</h2>
        <p class="deck-lead">달력 파일이 최소 단위가 아닙니다. 하나의 실행 항목이 먼저 있고, 일정이 있을 때만 Calendar로, 진행 행이 있을 때는 Sheet로, 비교가 핵심이면 Memo로 보냅니다.</p>
        <div class="item-formula" aria-label="실행 항목의 기본 구성">
          <div class="formula-cell"><strong>할 일·결정·기록·자료</strong><span>사용자가 실제로 상태를 바꾸는 한 건</span></div>
          <div class="formula-cell"><strong><span class="formula-plus">+</span> 상세 설명</strong><span>방법, 맥락, 주의, 원문 링크</span></div>
          <div class="formula-cell"><strong><span class="formula-plus">+</span> 완료 기준</strong><span>언제 끝난 것으로 볼지 명확히</span></div>
          <div class="formula-cell"><strong><span class="formula-plus">+</span> 출처 연결</strong><span>원문 기반이면 근거 행까지 보존</span></div>
        </div>
        <div class="optional-grid">
          <div class="optional-cell active"><b>일정</b><small>이사일처럼 실제 날짜가 계산될 때만</small></div>
          <div class="optional-cell active"><b>장소</b><small>여권 방문을 고른 뒤에만</small></div>
          <div class="optional-cell active"><b>기록값</b><small>14주 상태·마지막 재생 위치</small></div>
          <div class="optional-cell active"><b>조건</b><small>기기 알림·중지·응급 대응</small></div>
          <div class="optional-cell"><b>달력 파일</b><small>일정 없는 항목에는 만들지 않음</small></div>
        </div>
        <div class="rule-note"><b>폭염 예시의 핵심:</b> 물 마시기, 중지, 119를 매번 완료하는 체크박스로 만들지 않습니다. 작업 전·후 행동은 실행 항목으로, 상황별 대응은 항상 보이는 조건 카드로 나눕니다.</div>
      </div>
      <span class="page-number">03 / 05</span>
    </section>

    <section class="page deck-page" id="ownership">
      <div class="deck-inner">
        <p class="deck-kicker">입력 소유권</p>
        <h2>원문을 확정하는 일과<br>내 날짜를 넣는 일을 한 폼에 섞지 않습니다.</h2>
        <div class="ownership-flow">
          <article class="owner-panel"><h3>콘텐츠 만드는 사람</h3><ul><li>원문 하나 입력</li><li>읽은 범위와 빠진 행 확인</li><li>실행 항목·설명·주의 연결 확인</li><li>공개 여부는 별도 검토</li></ul></article>
          <div class="owner-arrow" aria-hidden="true">→</div>
          <article class="owner-panel"><h3>Flow 콘텐츠</h3><ul><li>출처 기반 행동·결정·기록</li><li>상세 설명과 완료 기준</li><li>자연스러운 결과물 기본값</li><li>원문 버전은 그대로 보존</li></ul></article>
          <div class="owner-arrow" aria-hidden="true">→</div>
          <article class="owner-panel"><h3>실제로 쓰는 사람</h3><ul><li>이사일 같은 내 값만 입력</li><li>현재 주차·마지막 위치 기록</li><li>방문/온라인, 비교 결과 선택</li><li>원문을 덮지 않고 내 값만 추가</li></ul></article>
        </div>
        <div class="do-not-ask"><article><h3>다시 묻지 않는 것</h3><p>14개 주차, 38개 장, 사진 6개월 조건, 40회/알림 조건, 서비스 범위, 응급 기준.</p></article><article><h3>필요할 때만 묻는 것</h3><p>이사일, 방문을 고른 뒤의 장소, 이어 듣기 위치, 비교 뒤의 선택과 실제 견적.</p></article></div>
      </div>
      <span class="page-number">04 / 05</span>
    </section>

    <section class="page deck-page" id="evidence">
      <div class="deck-inner">
        <p class="deck-kicker">자동 점검 결과</p>
        <h2>판단 가능한 수준까지<br>입력 비용과 의미 손실을 수치로 묶었습니다.</h2>
        <div class="metric-grid" id="metricGrid"></div>
        <div class="gate-grid">
          <article class="gate pass"><h3>원문 없는 행동 0건</h3><p>8개 결과의 행동 제목·완료 기준·근거 연결을 동결된 원문 기반 결과와 다시 비교했습니다.</p></article>
          <article class="gate pass"><h3>일정 없는 달력 파일 0건</h3><p>이사 24건만 날짜 예시를 만들고, 조건형 세탁조·강의 진도·오디오북에는 만들지 않았습니다.</p></article>
          <article class="gate boundary"><h3>안전 검토 대기 1건</h3><p>폭염 대응은 조건 카드를 보존하지만 안전·편집 검토 전에는 결과물 내보내기를 막습니다.</p></article>
          <article class="gate boundary"><h3>원문 확보 필요 1건</h3><p>Todoist는 공개 단계명만으로 할 일을 채우지 않고 권한 있는 파일 가져오기를 안내합니다.</p></article>
        </div>
        <div class="claim-box"><b>검증 경계:</b> 자동·에이전트 점검으로 데이터 연결, 입력 수, 손실, 화면 동작을 확인했습니다. 사용자 관찰은 아직 진행하지 않았고, 실제 모델 호출·주소 수집·비용·지연·공개 권리도 이 결과로 증명하지 않습니다.</div>
        <div class="artifact-links">
          <a href="../specs/2026-07-20-flowme-input-composer-lab-v1/input-composer-scenarios-v1.json">8개 사례 데이터</a>
          <a href="../specs/2026-07-20-flowme-input-composer-lab-v1/input-composer-contract-v1.json">입력·저장 계약</a>
          <a href="../specs/2026-07-20-flowme-input-composer-lab-v1/input-composer-metrics-v1.json">자동 점검 지표</a>
          <a href="../specs/2026-07-20-flowme-input-composer-lab-v1/spec.md">설계 문서</a>
          <a href="../specs/2026-07-20-flowme-input-composer-lab-v1/concept-desktop.png">화면 구성 초안</a>
        </div>
      </div>
      <span class="page-number">05 / 05</span>
    </section>
  </main>
  <script type="application/json" id="labData">${dataJson}</script>
  <script>
    (function(){
      'use strict';
      var DATA=JSON.parse(document.getElementById('labData').textContent);
      var artifactLabels={calendar:'Calendar',checklist:'Checklist',todo:'Todo',sheet:'Sheet',memo:'Memo'};
      var routeLabels={quick_line:'한 줄 빠른 추가',multiline_paste:'여러 줄 붙여넣기',url_confirm:'URL로 만들기',table_curriculum_import:'표·강의계획 가져오기'};
      var routeIcons={quick_line:'1',multiline_paste:'≡',url_confirm:'↗',table_curriculum_import:'▦'};
      var routeOutcome={quick_line:'한 문장 → 기존 Flow 찾기',multiline_paste:'여러 행 → 구조 확인',url_confirm:'주소 → 원문 범위 확인',table_curriculum_import:'표 → 전체 행 유지'};
      var state={caseId:'IC-C01-MOVING',stage:'user',artifact:'calendar',expanded:false,values:{},done:{},fileInfo:{}};
      restore();

      function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});}
      function current(){return DATA.cases.find(function(c){return c.caseId===state.caseId;});}
      function caseValues(){state.values[state.caseId]=state.values[state.caseId]||{};return state.values[state.caseId];}
      function defaultStage(c){return c.caseId==='IC-C01-MOVING'||c.caseId==='IC-C05-WASHER'?'user':'creator';}
      function inputValue(c,input){var values=caseValues();if(values[input.inputId]!=null)return values[input.inputId];if(input.exampleValue!=null)return input.exampleValue;if(input.control==='url')return c.source.url;if(input.control==='multiline')return pasteSample(c);return '';}
      function pasteSample(c){var rows=c.canonical.items.map(function(i){return i.title;}).concat(c.canonical.flowMemos.map(function(m){return m.text;}));return rows.join('\\n');}
      function save(){try{localStorage.setItem('flowme-input-lab-v1',JSON.stringify({values:state.values,done:state.done}));}catch(error){}}
      function restore(){try{var saved=JSON.parse(localStorage.getItem('flowme-input-lab-v1')||'null');if(saved){state.values=saved.values||{};state.done=saved.done||{};}}catch(error){}}

      function render(){renderRoutes();renderCases();renderComposer();renderPreview();renderExampleRows();renderMetrics();}
      function renderRoutes(){
        var c=current();
        document.getElementById('routeList').innerHTML=Object.keys(routeLabels).map(function(key){return '<button class="route-button '+(c.inputRoute===key?'active':'')+'" data-route="'+key+'"><span class="route-icon">'+routeIcons[key]+'</span><span><b>'+routeLabels[key]+'</b><small class="case-outcome">'+routeOutcome[key]+'</small></span></button>';}).join('');
      }
      function renderCases(){
        document.getElementById('caseList').innerHTML=DATA.cases.map(function(c,index){var artifact=c.defaultArtifact?artifactLabels[c.defaultArtifact]:'내용 확인';return '<button class="case-button '+(c.caseId===state.caseId?'active':'')+'" data-case="'+c.caseId+'"><span class="case-number">'+String(index+1).padStart(2,'0')+'</span><span class="case-name">'+(c.lane==='boundary'?'<i class="boundary-dot"></i>':'')+esc(c.shortTitle)+'<small class="case-outcome">'+artifact+' · 입력 '+c.inputJourney.requiredPayloadCount+'</small></span></button>';}).join('');
      }
      function renderComposer(){
        var c=current();
        document.getElementById('composerTitle').textContent=c.shortTitle+' Flow 만들기';
        document.getElementById('userJob').textContent=c.userJob;
        document.querySelectorAll('.stage-button').forEach(function(button){button.classList.toggle('active',button.dataset.stage===state.stage);});
        document.getElementById('stageHelp').textContent=state.stage==='creator'?'원문을 넣고, 읽은 범위와 빠진 내용을 한 번 확인합니다.':'원문 값은 그대로 두고, 내 날짜·장소·진행점만 더합니다.';
        var boundary=c.firstPreviewKind==='boundary';
        document.getElementById('sourceLock').innerHTML='<div class="source-lock '+(boundary?'boundary-source':'')+'"><span class="source-check">'+(boundary?'!':'✓')+'</span><div><strong>'+esc(c.source.title)+'</strong><a href="'+esc(c.source.url)+'" target="_blank" rel="noreferrer">'+esc(c.source.url)+'</a></div><span class="source-count">'+c.source.sourceRowCount+'개 확인'+(c.source.missingRows.length?' · '+c.source.missingRows.length+'개 누락':'')+'</span></div>';
        renderInputs(c);
        renderDerived(c);
        document.getElementById('journey').innerHTML=c.inputJourney.flow.map(function(step,index){return '<span class="journey-step">'+(index+1)+'. '+esc(step)+'</span>'+(index<c.inputJourney.flow.length-1?'<span class="journey-arrow">→</span>':'');}).join('');
        document.getElementById('inputCost').innerHTML='<b>첫 결과까지 입력 '+c.inputJourney.requiredPayloadCount+'개</b><br>조작 '+c.inputJourney.interactionStepsToFirstPreview+'단계 · 원문에서 '+c.source.sourceRowCount+'행 채움';
        var action=document.getElementById('previewAction');action.textContent=boundary?'읽은 범위 보기':'결과 미리보기';action.classList.toggle('boundary',boundary);
      }
      function renderInputs(c){
        var all=c.inputJourney.inputs.filter(function(input){return input.actor===(state.stage==='creator'?'creator':'user');});
        var first=all.filter(function(input){return input.requiredBeforeFirstPreview||input.visibleStage==='initial'||input.visibleStage==='after_source_preview';});
        var later=all.filter(function(input){return first.indexOf(input)<0;});
        var title=state.stage==='creator'?'원문을 넣어주세요':'쓸 때 정할 것';
        var html='<h2>'+title+'</h2>';
        if(!first.length)html+='<div class="no-input">지금 입력할 값이 없습니다. 결과를 먼저 보고 바로 시작할 수 있어요.</div>';
        else html+=first.map(function(input){return renderField(c,input);}).join('');
        if(later.length){var keepOpen=later.some(function(input){return caseValues()[input.inputId]!=null;});var laterSummary=later.every(function(input){return input.actor==='creator';})?'권한 있는 원문 더 가져오기':'사용하면서 기록할 값 보기';html+='<details class="more-inputs" '+(keepOpen?'open':'')+'><summary>'+laterSummary+'</summary>'+later.map(function(input){return renderField(c,input);}).join('')+'</details>';}
        document.getElementById('inputPanel').innerHTML=html;
      }
      function renderField(c,input){
        var values=caseValues();
        if(input.visibleWhen&&input.inputId==='passport-location'&&values['passport-route-choice']!=='visit')return '';
        var value=inputValue(c,input);var required=input.requiredBeforeFirstPreview?'<span class="required-note">첫 결과에 필요</span>':'';var control='';var domId='input-'+input.inputId;
        if(input.control==='multiline')control='<textarea id="'+domId+'" data-input="'+input.inputId+'">'+esc(value)+'</textarea>';
        else if(input.control==='url')control='<input id="'+domId+'" type="url" data-input="'+input.inputId+'" value="'+esc(value)+'">';
        else if(input.control==='date')control='<input id="'+domId+'" type="date" data-input="'+input.inputId+'" value="'+esc(value||'2026-08-28')+'">';
        else if(input.control==='file'||input.control==='table')control='<div class="file-shell"><input id="'+domId+'" type="file" data-file="'+input.inputId+'" accept=".csv,.tsv,.txt,.json,.xlsx"><div class="file-result">'+esc(state.fileInfo[input.inputId]||tableFixtureText(c))+'</div><button class="import-sample" data-sample="'+input.inputId+'">동결된 샘플 표 사용</button></div>';
        else if(input.control==='choice')control=choiceControl(c,input,value);
        else if(input.control==='boolean')control='<label class="choice-button"><input type="checkbox" data-input="'+input.inputId+'" '+(value?'checked':'')+'> '+esc(input.label)+'</label>';
        else if(input.control==='select')control='<select id="'+domId+'" data-input="'+input.inputId+'"><option value="">미시작</option><option value="doing">진행 중</option><option value="done">완료</option></select>';
        else control='<input id="'+domId+'" type="text" data-input="'+input.inputId+'" value="'+esc(value)+'" placeholder="'+esc(input.label)+'">';
        var fieldLabel=(input.control==='choice'||input.control==='boolean')?'<div class="field-label">'+esc(input.label)+required+'</div>':'<label for="'+domId+'">'+esc(input.label)+required+'</label>';
        return '<div class="field">'+fieldLabel+control+(input.help?'<p class="field-help">'+esc(input.help)+'</p>':'')+'</div>';
      }
      function choiceControl(c,input,value){
        var options=input.inputId==='passport-route-choice'?[['undecided','아직 정하지 않음'],['visit','방문'],['online','온라인']]:input.inputId==='ac-choice'?[['undecided','아직 결정 안 함'],['professional','전문세척'],['general','일반세척']]:[['undecided','아직 정하지 않음'],['yes','선택'],['no','보류']];
        return '<div class="choice-row" role="group" aria-label="'+esc(input.label)+'">'+options.map(function(option){return '<button class="choice-button '+(value===option[0]?'active':'')+'" data-choice-input="'+input.inputId+'" data-choice-value="'+option[0]+'">'+option[1]+'</button>';}).join('')+'</div>';
      }
      function tableFixtureText(c){if(c.caseId==='IC-C02-KMOOC')return '샘플: 14주 · 주차/주제/활동 열';if(c.caseId==='IC-C03-LIBRIVOX')return '샘플: 38장 · 순서/제목/재생시간 열';return '파일을 고르면 행 수를 확인합니다.';}
      function renderDerived(c){
        var items=c.canonical.items;var shown=items.slice(0,6);var rows=shown.map(function(item){return '<div class="derived-row"><b>'+(item.schedule?esc(item.schedule.label):intentLabel(item.intent))+'</b><span>'+esc(item.title)+'</span></div>';}).join('');
        if(!rows&&c.firstPreviewKind==='boundary')rows='<div class="derived-row"><b>현재 범위</b><span>'+esc(c.sourceRiskBoundary.userFacingNote)+'</span></div>';
        document.getElementById('derived').innerHTML='<div class="derived-head"><h2>원문에서 정리한 항목</h2><span class="source-basis">출처 기반</span></div><div class="derived-list">'+rows+(items.length>shown.length?'<div class="derived-more">외 '+(items.length-shown.length)+'개 · 결과물에는 전체 보존</div>':'')+'</div>';
      }
      function intentLabel(intent){return {action:'할 일',decision:'결정',record:'기록',consume:'자료'}[intent]||'항목';}
      function renderPreview(){
        var c=current();
        renderArtifactTabs(c);
        var target=state.artifact;
        document.getElementById('previewTitle').textContent=c.firstPreviewKind==='boundary'?'지금 확인할 수 있는 범위':artifactLabels[target]+' 미리보기';
        document.getElementById('previewSubtitle').textContent=c.shortTitle+' · '+(c.firstPreviewKind==='boundary'?'가짜 결과를 만들지 않습니다':'내보내기 전 사용 모습');
        document.getElementById('previewState').textContent=c.firstPreviewKind==='boundary'?'검토 또는 원문 필요':availabilityLabel(c.projections[target].availability);
        document.getElementById('previewBody').innerHTML=c.firstPreviewKind==='boundary'?renderBoundary(c):renderArtifact(c,target);
        var filled=c.inputJourney.automaticValues.length;var personal=c.inputJourney.inputs.filter(function(input){return input.actor==='user'&&input.requiredBeforeFirstPreview;}).length;
        document.getElementById('previewSummary').innerHTML='<span>내가 입력 <b>'+personal+'</b></span><span>원문에서 채움 <b>'+filled+'묶음</b></span><span>실행 항목 <b>'+c.canonical.items.length+'</b></span>';
      }
      function renderArtifactTabs(c){
        document.getElementById('artifactTabs').innerHTML=Object.keys(artifactLabels).map(function(key){var p=c.projections[key];var unavailable=p.availability==='not_applicable'||p.availability==='blocked';return '<button class="artifact-button '+(state.artifact===key?'active ':'')+(unavailable?'unavailable':'')+'" data-artifact="'+key+'">'+artifactLabels[key]+'</button>';}).join('');
      }
      function availabilityLabel(value){return {primary:'가장 자연스러운 결과',secondary:'함께 쓸 수 있음',fallback:'내용 보관용',not_applicable:'이 내용에는 필요 없음',blocked:'현재 만들 수 없음'}[value]||'';}
      function renderArtifact(c,target){
        if(c.caseId==='IC-C01-MOVING'&&target==='calendar')return renderMovingCalendar(c);
        var p=c.projections[target];
        if(!p.preview)return '<div class="empty-artifact"><div><b>'+artifactLabels[target]+'로 만들 필요가 없습니다.</b>날짜나 행을 억지로 더하지 않고 가장 자연스러운 결과만 제공합니다.</div></div>';
        if(p.preview.kind==='calendar_preview')return renderCalendarEntries(p.preview.entries,c);
        if(p.preview.kind==='sheet_preview')return renderSheet(p.preview.rows,c);
        if(p.preview.kind==='todo_preview')return renderTasks(p.preview.tasks,p.preview.warnings,p.preview.references,c);
        if(p.preview.kind==='checklist_preview')return renderChecklist(p.preview,c);
        if(p.preview.kind==='memo_preview')return renderMemo(p.preview,c);
        return '<div class="empty-artifact"><div><b>내용은 보존했습니다.</b>이 화면 모양은 다음 제품 단계에서 정합니다.</div></div>';
      }
      function renderMovingCalendar(c){
        var date=caseValues()['moving-date']||'2026-08-28';
        var groups={};c.canonical.items.forEach(function(item){var resolved=resolveDate(date,item.schedule&&item.schedule.label);if(!resolved)return;(groups[resolved]=groups[resolved]||[]).push(item);});
        return '<div class="calendar-list">'+Object.keys(groups).sort().map(function(day){return '<div class="calendar-group"><div class="calendar-date"><b>'+formatDate(day)+'</b><small>'+weekday(day)+'</small></div><div class="calendar-events">'+groups[day].map(function(item){return '<div class="calendar-event"><i class="event-dot"></i><span>'+esc(item.title)+'</span></div>';}).join('')+'</div></div>';}).join('')+'</div>';
      }
      function renderCalendarEntries(entries,c){var groups={};entries.forEach(function(item){var label=item.schedule&&item.schedule.value||'날짜창';(groups[label]=groups[label]||[]).push(item);});return '<div class="calendar-list">'+Object.keys(groups).map(function(label){return '<div class="calendar-group"><div class="calendar-date"><b>'+esc(label)+'</b></div><div class="calendar-events">'+groups[label].map(function(item){return '<div class="calendar-event"><i class="event-dot"></i><span>'+esc(item.title)+'</span></div>';}).join('')+'</div></div>';}).join('')+'</div>';}
      function renderTasks(tasks,warnings,references,c){
        var key=c.caseId+'-tasks';state.done[key]=state.done[key]||{};
        var triggers=[...new Set(tasks.map(function(task){return task.recurrence&&task.recurrence.value;}).filter(Boolean))];var body=triggers.length?'<div class="condition-box"><b>실행 조건</b><br>'+triggers.map(esc).join('<br>')+'</div>':'';body+='<div class="task-list">'+tasks.map(function(task,index){var done=!!state.done[key][index];return '<label class="task '+(done?'done':'')+'"><input type="checkbox" data-task="'+index+'" '+(done?'checked':'')+'><span><b>'+esc(task.title)+'</b><small>'+esc(task.doneWhen)+'</small></span></label>';}).join('')+'</div>';
        if(warnings&&warnings.length)body+='<div class="warning-box"><b>꼭 확인</b><br>'+warnings.map(esc).join('<br>')+'</div>';
        if(references&&references.length)body+='<div class="reference-box"><b>원문·설명서</b><br>'+references.map(function(r){return esc(r.label);}).join('<br>')+'</div>';
        return body;
      }
      function renderChecklist(preview,c){var entries=[];(preview.groups||[]).forEach(function(group){(group.entries||[]).forEach(function(item){entries.push({title:item.title,doneWhen:item.doneWhen||group.title});});});return renderTasks(entries,preview.warnings,preview.references,c);}
      function renderSheet(rows,c){
        var limit=state.expanded?rows.length:Math.min(8,rows.length);var shown=rows.slice(0,limit);var statusKey=c.caseId+'-row-status';state.done[statusKey]=state.done[statusKey]||{};
        var html='<div class="sheet-wrap"><table class="sheet"><thead><tr><th>#</th><th>항목</th><th>활동·시간</th><th>상태</th></tr></thead><tbody>'+shown.map(function(row){var extra=row.sourceData&&(row.sourceData.activity||row.sourceData.duration)||'';var rowStatus=state.done[statusKey][row.order]||row.status;return '<tr><td>'+esc(row.order)+'</td><td><b>'+esc(row.title)+'</b></td><td>'+esc(extra)+'</td><td class="status-cell"><button class="status-control" data-row-status="'+row.order+'">'+statusLabel(rowStatus)+'</button></td></tr>';}).join('')+'</tbody></table>'+(rows.length>8?'<button class="expand-button" data-expand="1">'+(state.expanded?'처음 8개만 보기':rows.length+'개 모두 펼치기')+'</button>':'')+'</div>';
        return html;
      }
      function statusLabel(value){return {not_started:'미시작',queued:'대기',doing:'진행 중',done:'완료'}[value]||'미시작';}
      function renderMemo(preview,c){
        var fields=preview.fields||[];var notes=preview.notes||[];
        var choice=caseValues()['ac-choice'];var choiceText=choice==='professional'?'전문세척':choice==='general'?'일반세척':choice==='undecided'?'아직 결정 안 함':'';var choiceRow=choiceText?'<dt>내 선택</dt><dd><b>'+choiceText+'</b></dd>':'';
        return '<div class="memo-card"><h3>'+esc(preview.title||c.shortTitle)+'</h3><dl class="memo-grid">'+fields.map(function(field){return '<dt>'+esc(field.label)+'</dt><dd>'+esc(field.value)+'</dd>';}).join('')+choiceRow+'</dl>'+notes.map(function(note){return '<div class="memo-note">'+esc(note.text)+'</div>';}).join('')+'</div>';
      }
      function renderBoundary(c){
        var heat=c.caseId==='IC-B01-HEAT';var missing=c.source.missingRows.map(function(row){return row.label;});
        var body='<div class="boundary-card '+(heat?'danger':'')+'"><h3>'+(heat?'안전 검토 전에는 내보내지 않습니다':'실제 할 일을 더 가져와야 합니다')+'</h3><p>'+esc(c.sourceRiskBoundary.userFacingNote)+'</p>';
        if(missing.length)body+='<ul class="boundary-list">'+missing.map(function(value){return '<li>'+esc(value)+'</li>';}).join('')+'</ul>';
        body+='</div>';
        if(heat){body+='<div class="response-grid">'+c.canonical.responseCards.map(function(card){return '<div class="response-card '+esc(card.severity)+'"><strong>'+esc(card.trigger)+'</strong>'+esc(card.response)+'</div>';}).join('')+'</div>';}
        return body;
      }
      function resolveDate(anchor,label){if(!anchor||!label)return null;var parts=anchor.split('-').map(Number);var date=new Date(parts[0],parts[1]-1,parts[2],12);var days=label==='2주 전'?-14:label==='1주 전'?-7:label==='2~4일 전'?-3:label==='전날'?-1:label==='당일'?0:1;date.setDate(date.getDate()+days);return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
      function formatDate(value){var parts=value.split('-');return Number(parts[1])+'/'+Number(parts[2]);}
      function weekday(value){return ['일','월','화','수','목','금','토'][new Date(value+'T12:00:00').getDay()]+'요일';}
      function renderExampleRows(){
        document.getElementById('exampleRows').innerHTML=DATA.cases.map(function(c){var result=c.defaultArtifact?artifactLabels[c.defaultArtifact]:'내용 확인';var boundary=c.lane==='boundary';return '<tr><td><button class="example-link" data-open-case="'+c.caseId+'">'+esc(c.shortTitle)+'</button></td><td>'+routeLabels[c.inputRoute]+'</td><td>입력 '+c.inputJourney.requiredPayloadCount+' · '+c.inputJourney.interactionStepsToFirstPreview+'단계</td><td class="result-name '+(boundary?'boundary-text':'')+'">'+result+(c.defaultArtifact==='sheet'?' · '+c.canonical.items.length+'행':'')+'</td><td>'+esc(c.sourceRiskBoundary.userFacingNote)+'</td></tr>';}).join('');
      }
      function renderMetrics(){var m=DATA.metrics;var values=[['2개', '일반 사례 최대 필수 입력'],['4 / 4','입력 경로 적용'],['100%','8개 사례 의미 보존'],['0건','불필요 입력'],['0건','일정 없는 달력 파일'],['0건','원문 없는 행동']];document.getElementById('metricGrid').innerHTML=values.map(function(value){return '<div class="metric"><strong>'+value[0]+'</strong><span>'+value[1]+'</span></div>';}).join('');}

      document.addEventListener('click',function(event){
        var caseButton=event.target.closest('[data-case]');if(caseButton){selectCase(caseButton.dataset.case);return;}
        var routeButton=event.target.closest('[data-route]');if(routeButton){var match=DATA.cases.find(function(c){return c.inputRoute===routeButton.dataset.route;});if(match)selectCase(match.caseId);return;}
        var stageButton=event.target.closest('[data-stage]');if(stageButton){state.stage=stageButton.dataset.stage;renderComposer();return;}
        var artifactButton=event.target.closest('[data-artifact]');if(artifactButton){state.artifact=artifactButton.dataset.artifact;renderPreview();return;}
        var choice=event.target.closest('[data-choice-input]');if(choice){caseValues()[choice.dataset.choiceInput]=choice.dataset.choiceValue;save();renderComposer();renderPreview();return;}
        var sample=event.target.closest('[data-sample]');if(sample){state.fileInfo[sample.dataset.sample]=tableFixtureText(current())+' · 준비됨';renderComposer();return;}
        var expand=event.target.closest('[data-expand]');if(expand){state.expanded=!state.expanded;renderPreview();return;}
        var task=event.target.closest('[data-task]');if(task){var key=state.caseId+'-tasks';state.done[key]=state.done[key]||{};state.done[key][task.dataset.task]=task.checked;save();renderPreview();return;}
        var rowStatus=event.target.closest('[data-row-status]');if(rowStatus){var statusKey=state.caseId+'-row-status';state.done[statusKey]=state.done[statusKey]||{};var currentStatus=state.done[statusKey][rowStatus.dataset.rowStatus]||'not_started';state.done[statusKey][rowStatus.dataset.rowStatus]=currentStatus==='not_started'||currentStatus==='queued'?'doing':currentStatus==='doing'?'done':'not_started';save();renderPreview();return;}
        var open=event.target.closest('[data-open-case]');if(open){selectCase(open.dataset.openCase);document.getElementById('lab').scrollIntoView();return;}
        if(event.target.id==='previewAction'){var shell=document.getElementById('previewShell');shell.classList.remove('pulse');void shell.offsetWidth;shell.classList.add('pulse');}
      });
      document.addEventListener('input',function(event){
        var id=event.target.dataset&&event.target.dataset.input;if(!id)return;caseValues()[id]=event.target.type==='checkbox'?event.target.checked:event.target.value;save();if(id==='moving-date')renderPreview();
      });
      document.addEventListener('change',function(event){
        var id=event.target.dataset&&event.target.dataset.file;if(!id||!event.target.files||!event.target.files[0])return;var file=event.target.files[0];var reader=new FileReader();reader.onload=function(){var rows=String(reader.result||'').split(/\\r?\\n/).filter(Boolean).length;state.fileInfo[id]=file.name+' · '+rows+'행 읽음 · 비교 미리보기는 동결본 사용';renderComposer();};reader.readAsText(file);
      });
      function selectCase(caseId){state.caseId=caseId;var c=current();state.stage=defaultStage(c);state.artifact=c.defaultArtifact||'memo';state.expanded=false;renderRoutes();renderCases();renderComposer();renderPreview();}
      render();
    })();
  </script>
</body>
</html>`;

fs.writeFileSync(outPath, html, 'utf8');
console.log(`Built ${path.relative(process.cwd(), outPath)} (${data.cases.length} cases)`);
