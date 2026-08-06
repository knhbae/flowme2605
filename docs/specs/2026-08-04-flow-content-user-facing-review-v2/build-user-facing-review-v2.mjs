import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const specDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(specDirectory, "../../..");
const dataPath = path.join(specDirectory, "content-v2.json");
const outputDirectory = path.join(
  repoRoot,
  "docs",
  "content-audit",
  "2026-08-04-flow-content-user-facing-review-v2-ko",
);
const htmlPath = path.join(outputDirectory, "review.html");
const manifestPath = path.join(outputDirectory, "manifest.json");

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const dataBytes = fs.readFileSync(dataPath);
const data = JSON.parse(dataBytes.toString("utf8"));
const bundleIds = new Set(data.contentBundles.map((bundle) => bundle.id));
const reviewIds = new Set(data.reviewRecords.map((record) => record.contentId));

if (data.contentBundles.length !== 4 || bundleIds.size !== 4) {
  throw new Error("V2 requires exactly four unique content bundles.");
}
if (
  reviewIds.size !== bundleIds.size ||
  [...bundleIds].some((contentId) => !reviewIds.has(contentId))
) {
  throw new Error("Every content bundle requires one separate review record.");
}
for (const bundle of data.contentBundles) {
  if (!bundle.source?.url || !/^https:\/\//.test(bundle.source.url)) {
    throw new Error(`Visible source URL missing for ${bundle.id}.`);
  }
}

const embeddedData = JSON.stringify(data).replaceAll("<", "\\u003c");
const generatedAt = new Date().toISOString();

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>원문에서 바로 쓰는 FLOW 4개</title>
<link rel="icon" href="data:,">
<style>
:root{--bg:#fff;--ink:#111318;--muted:#596173;--line:#dfe3ea;--soft:#f7f8fb;--accent:#3157f5;--accent-soft:#eef2ff;--warn:#805b10;--warn-soft:#fff8e8;--max:1040px;--radius:16px;color-scheme:light}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo","Segoe UI",sans-serif;word-break:keep-all}
button,input,textarea{font:inherit}
button,a{outline-offset:3px}
a{color:var(--accent);text-decoration-thickness:1px;text-underline-offset:3px}
button{cursor:pointer}
.site-header{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}
.header-inner{max-width:var(--max);min-height:64px;margin:auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand{font-size:18px;font-weight:850;letter-spacing:-.04em}.brand span{color:var(--accent)}
.utility{min-height:42px;padding:0 15px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink);font-size:14px;font-weight:720}
main{max-width:var(--max);margin:auto;padding:46px 20px 80px}
.hero{max-width:760px;margin-bottom:44px}.hero h1{margin:0 0 14px;font-size:clamp(34px,5vw,56px);line-height:1.08;letter-spacing:-.055em}.hero p{margin:0;color:var(--muted);font-size:18px;line-height:1.72}.hero .date{margin-top:16px;font-size:13px;color:var(--muted)}
.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:0 0 16px}.section-heading h2{margin:0;font-size:22px;letter-spacing:-.035em}.progress{font-size:13px;color:var(--muted)}
.flow-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.flow-card{border:1px solid var(--line);border-radius:var(--radius);padding:22px;background:#fff;display:flex;flex-direction:column;min-height:240px}
.source-mini{margin:0 0 18px;color:var(--muted);font-size:13px}.flow-card h3{margin:0 0 10px;font-size:22px;line-height:1.3;letter-spacing:-.035em}.flow-card p{margin:0;color:var(--muted);line-height:1.65}.flow-card-footer{margin-top:auto;padding-top:20px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--line)}
.destination{color:var(--accent);font-size:14px;font-weight:750}.open-flow{min-height:40px;padding:0 14px;border:0;border-radius:9px;background:var(--ink);color:#fff;font-size:14px;font-weight:760}
.detail-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:28px}.back{min-height:42px;padding:0 14px;border:1px solid var(--line);border-radius:10px;background:#fff;font-size:14px;font-weight:720}.position{color:var(--muted);font-size:13px}
.flow-head{max-width:780px;margin-bottom:38px}.source-line{display:flex;align-items:center;flex-wrap:wrap;gap:8px 14px;margin-bottom:20px;color:var(--muted);font-size:13px}.source-line a{font-weight:760}.flow-head h1{margin:0 0 14px;font-size:clamp(34px,5vw,52px);line-height:1.12;letter-spacing:-.055em}.flow-head .summary{margin:0 0 14px;color:var(--muted);font-size:18px;line-height:1.7}.need{margin:0;padding-left:14px;border-left:3px solid var(--accent);font-size:14px;line-height:1.65;color:#303747}
.flow-layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,.9fr);gap:36px;align-items:start}.content-column h2,.artifact-column h2,.source-notes h2{margin:0 0 16px;font-size:22px;letter-spacing:-.035em}
.input-row{margin:0 0 28px;padding:18px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:18px}.input-row label{font-weight:760}.input-row input{min-height:44px;padding:0 12px;border:1px solid #c8ced8;border-radius:9px;background:#fff;color:var(--ink)}
.content-list{border-top:1px solid var(--line)}.content-row{padding:22px 0;border-bottom:1px solid var(--line)}.row-top{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:10px}.content-row h3{margin:0;font-size:19px;line-height:1.4;letter-spacing:-.025em}.row-date{flex:none;color:var(--accent);font-size:13px;font-weight:760}.route,.menu{margin:0 0 12px;color:#303747;font-weight:700;line-height:1.6}.fact{display:grid;grid-template-columns:72px 1fr;gap:12px;margin:8px 0;color:var(--muted);font-size:14px;line-height:1.65}.fact strong{color:var(--ink);font-size:13px}.completion{margin:12px 0 0;font-size:13px;color:var(--muted)}
.artifact-column{position:sticky;top:92px;padding:22px;border:1px solid var(--line);border-radius:var(--radius);background:var(--soft)}.artifact-lead{margin:-6px 0 16px;color:var(--muted);font-size:14px;line-height:1.6}.calendar-list,.check-list,.study-list{display:grid;gap:9px}.calendar-row,.check-row,.study-row{padding:14px;border:1px solid var(--line);border-radius:11px;background:#fff}.calendar-date{margin-bottom:5px;color:var(--accent);font-size:12px;font-weight:760}.calendar-title,.check-title,.study-title{font-weight:780;line-height:1.45}.calendar-row p,.check-row p,.study-row p{margin:6px 0 0;color:var(--muted);font-size:13px;line-height:1.55}.check-row{display:grid;grid-template-columns:22px 1fr;gap:10px}.check-box{width:18px;height:18px;margin-top:2px;border:1.5px solid #9ea6b4;border-radius:5px;background:#fff}.study-row{display:grid;grid-template-columns:28px 1fr;gap:10px}.study-order{color:var(--accent);font-size:13px;font-weight:800}.selection-note{margin:0 0 14px;padding:12px;border-radius:10px;background:var(--accent-soft);color:#294095;font-size:13px;line-height:1.55}
.primary,.secondary{width:100%;min-height:50px;margin-top:16px;padding:0 16px;border-radius:11px;font-weight:800}.primary{border:0;background:var(--accent);color:#fff}.secondary{margin-top:9px;border:1px solid var(--line);background:#fff;color:var(--ink)}.primary:active,.secondary:active{transform:translateY(1px)}
.source-notes{margin-top:46px;padding-top:32px;border-top:1px solid var(--line)}.source-notes ul{margin:0;padding-left:20px;color:var(--muted)}.source-notes li{margin:9px 0;line-height:1.65}.source-links{display:flex;flex-wrap:wrap;gap:10px 18px;margin-top:16px;font-size:14px;font-weight:720}
.review-zone{margin-top:58px;padding:26px;border:1px dashed #abb2bf;border-radius:var(--radius);background:#fafafa}.review-label{margin:0 0 8px;color:var(--muted);font-size:12px;font-weight:800;letter-spacing:.06em}.review-zone h2{max-width:760px;margin:0 0 18px;font-size:21px;line-height:1.5}.verdicts{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}.verdict{min-height:42px;padding:0 14px;border:1px solid var(--line);border-radius:9px;background:#fff;font-weight:720}.verdict.selected{border-color:var(--accent);background:var(--accent-soft);color:#294095}.review-zone textarea{display:block;width:100%;min-height:90px;padding:12px;border:1px solid var(--line);border-radius:10px;resize:vertical;line-height:1.55}.save-review{min-height:42px;margin-top:12px;padding:0 14px;border:0;border-radius:9px;background:var(--ink);color:#fff;font-weight:760}
.detail-nav{display:flex;justify-content:space-between;gap:10px;margin-top:24px}.detail-nav button{min-height:42px;padding:0 14px;border:1px solid var(--line);border-radius:9px;background:#fff;font-weight:720}.detail-nav button:disabled{opacity:.35;cursor:default}
.toast{position:fixed;left:50%;bottom:28px;z-index:30;transform:translate(-50%,20px);padding:11px 16px;border-radius:10px;background:#111318;color:#fff;font-size:14px;opacity:0;pointer-events:none;transition:.18s ease}.toast.show{opacity:1;transform:translate(-50%,0)}
.notice{margin:18px 0 0;padding:14px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font-size:13px;line-height:1.6}
@media(max-width:899px){.flow-layout{grid-template-columns:1fr}.artifact-column{position:static;order:-1}.flow-grid{grid-template-columns:1fr}.flow-card{min-height:210px}}
@media(max-width:560px){main{padding:30px 18px 60px}.header-inner{padding:0 18px}.hero{margin-bottom:34px}.hero h1{font-size:38px}.hero p,.flow-head .summary{font-size:16px}.utility{padding:0 11px}.flow-card{padding:18px}.flow-head h1{font-size:36px}.source-line{align-items:flex-start}.input-row{align-items:stretch;flex-direction:column}.input-row input{width:100%}.artifact-column{padding:18px}.fact{grid-template-columns:1fr;gap:2px}.review-zone{padding:20px}.verdicts{display:grid;grid-template-columns:1fr}.verdict{width:100%}.detail-nav button{flex:1}.row-top{align-items:flex-start;flex-direction:column;gap:4px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.toast{transition:none}}
</style>
</head>
<body>
<header class="site-header"><div class="header-inner"><div class="brand">FLOW<span>Me</span></div><button class="utility" type="button" data-export-review>검토 메모 받기</button></div></header>
<main id="app"></main>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<script id="contentData" type="application/json">${embeddedData}</script>
<script>
const DATA=JSON.parse(document.getElementById("contentData").textContent);
const BUNDLES=DATA.contentBundles;
const BY_ID=new Map(BUNDLES.map(bundle=>[bundle.id,bundle]));
const REVIEWS=new Map(DATA.reviewRecords.map(record=>[record.contentId,record]));
const STORAGE_KEY="flowme-user-facing-content-review-v2";
const DEFAULT_STATE={inputs:{},reviews:{}};
let state=loadState();

function loadState(){
  try{return {...DEFAULT_STATE,...JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}}
  catch{return structuredClone(DEFAULT_STATE)}
}
function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch{}}
function esc(value){return String(value??"").replace(/[&<>\"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"})[char])}
function toast(message){const node=document.getElementById("toast");node.textContent=message;node.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove("show"),1700)}
function routeTo(hash){location.hash=hash}
function currentRoute(){
  if(!location.hash.startsWith("#flow/"))return{view:"home"};
  const id=decodeURIComponent(location.hash.slice(6));
  return BY_ID.has(id)?{view:"flow",id}:{view:"home"}
}
function formatDate(ymd){if(!ymd)return"날짜 선택 필요";const [y,m,d]=ymd.split("-").map(Number);return new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",weekday:"short"}).format(new Date(y,m-1,d))}
function addDays(ymd,offset){const [y,m,d]=ymd.split("-").map(Number);const date=new Date(Date.UTC(y,m-1,d+offset));return date.toISOString().slice(0,10)}
function inputValue(bundle){return state.inputs[bundle.id]||bundle.artifact.input?.defaultValue||""}
function verdictLabel(value){return value==="good"?"좋음":value==="fix"?"보완 필요":value==="exclude"?"제외": "미검토"}
function sourceLinks(source){
  return [[source.procedureUrl,"신청 절차"],[source.eligibilityUrl,"공식 자격 확인"],[source.syllabusUrl,"수업계획서"]].filter(([url])=>url).map(([url,label])=>'<a href="'+esc(url)+'" target="_blank" rel="noreferrer">'+esc(label)+'</a>').join("")
}
function renderHome(){
  const reviewed=BUNDLES.filter(bundle=>state.reviews[bundle.id]?.verdict).length;
  return '<section class="hero"><h1>원문에서 바로 쓰는 FLOW 4개</h1><p>원문 링크, 실제 실행 내용, 도구에 저장될 결과를 한 흐름에서 확인하세요.</p><p class="date">원문 확인 · 2026. 08. 04.</p></section>'+ 
    '<div class="section-heading"><h2>이번 검토 4개</h2><span class="progress">'+reviewed+' / 4 검토</span></div>'+ 
    '<section class="flow-grid">'+BUNDLES.map((bundle,index)=>'<article class="flow-card"><p class="source-mini">'+(index+1)+' · '+esc(bundle.source.provider)+' · '+esc(verdictLabel(state.reviews[bundle.id]?.verdict))+'</p><h3>'+esc(bundle.title)+'</h3><p>'+esc(bundle.summary)+'</p><div class="flow-card-footer"><span class="destination">'+esc(bundle.destinationLabel)+'</span><button class="open-flow" type="button" data-open="'+esc(bundle.id)+'">사용 화면 보기</button></div></article>').join("")+'</section>'
}
function renderFlow(bundle){
  const index=BUNDLES.indexOf(bundle),source=bundle.source,review=state.reviews[bundle.id]||{};
  const author=source.author&&source.author!==source.provider?'<span>'+esc(source.author)+'</span>':"";
  return '<div class="detail-top"><button class="back" type="button" data-home>목록으로</button><span class="position">'+(index+1)+' / '+BUNDLES.length+'</span></div>'+ 
    '<header class="flow-head"><div class="source-line"><span>'+esc(source.provider)+'</span>'+author+(source.publishedAt?'<span>'+esc(source.publishedAt)+'</span>':"")+'<span>'+esc(source.observedAt)+' 확인</span><a href="'+esc(source.url)+'" target="_blank" rel="noreferrer">원문 열기</a></div><h1>'+esc(bundle.title)+'</h1><p class="summary">'+esc(bundle.summary)+'</p><p class="need">'+esc(bundle.userNeed)+'</p></header>'+ 
    '<div class="flow-layout"><section class="content-column">'+renderInput(bundle)+'<h2>이 FLOW에 담긴 내용</h2>'+renderContent(bundle)+'</section><aside class="artifact-column"><h2>내 도구에서 보이는 결과</h2>'+renderArtifact(bundle)+'</aside></div>'+ 
    renderSourceNotes(bundle)+renderReviewZone(bundle,review)+renderDetailNav(index)
}
function renderInput(bundle){
  const input=bundle.artifact.input;if(!input)return"";
  return '<div class="input-row"><label for="flow-date">'+esc(input.label)+'</label><input id="flow-date" type="date" value="'+esc(inputValue(bundle))+'" data-date-input="'+esc(bundle.id)+'"></div>'
}
function renderContent(bundle){
  if(bundle.artifact.kind==="anchored_calendar")return '<div class="content-list">'+bundle.artifact.items.map(item=>renderAnchoredContentRow(bundle,item)).join("")+'</div>';
  if(bundle.artifact.kind==="fixed_calendar_checklist")return renderFixedContent(bundle);
  return renderStudyContent(bundle)
}
function renderAnchoredContentRow(bundle,item){
  const date=addDays(inputValue(bundle),item.dayOffset),primary=item.menu||item.route||"";
  const label=item.menu?"재료":"장소 특징",detail=item.ingredients||item.method;
  return '<article class="content-row"><div class="row-top"><h3>'+esc(item.title)+'</h3><span class="row-date">'+esc(formatDate(date))+'</span></div><p class="'+(item.menu?"menu":"route")+'">'+esc(primary)+'</p>'+(item.ingredients?'<p class="fact"><strong>'+label+'</strong><span>'+esc(item.ingredients)+'</span></p>':"")+'<p class="fact"><strong>'+(item.menu?"조리":"메모")+'</strong><span>'+esc(item.method)+'</span></p><p class="completion">완료 · '+esc(item.completion)+'</p></article>'
}
function renderFixedContent(bundle){
  return '<div class="content-list">'+bundle.artifact.checklist.map((item,index)=>'<article class="content-row"><div class="row-top"><h3>'+(index+1)+'. '+esc(item.title)+'</h3></div><p class="fact"><strong>상세</strong><span>'+esc(item.detail)+'</span></p></article>').join("")+'</div>'
}
function renderStudyContent(bundle){
  return '<p class="selection-note">'+esc(bundle.artifact.selectionNote)+' CSV에는 각 차시의 상태·목표일·메모 칸이 함께 들어갑니다.</p><div class="content-list">'+bundle.artifact.rows.map(row=>'<article class="content-row"><div class="row-top"><h3>'+row.order+'. '+esc(row.title)+'</h3></div><p class="fact"><strong>학습 내용</strong><span>'+esc(row.detail)+'</span></p></article>').join("")+'</div>'
}
function renderArtifact(bundle){
  if(bundle.artifact.kind==="anchored_calendar")return renderCalendarArtifact(bundle);
  if(bundle.artifact.kind==="fixed_calendar_checklist")return renderFixedArtifact(bundle);
  return renderStudyArtifact(bundle)
}
function renderCalendarArtifact(bundle){
  const previewItems=bundle.artifact.items.slice(0,3),remaining=bundle.artifact.items.length-previewItems.length;
  return '<p class="artifact-lead">'+esc(bundle.destinationLabel)+'에 아래 제목과 상세가 함께 저장됩니다.</p><div class="calendar-list">'+previewItems.map(item=>'<article class="calendar-row"><div class="calendar-date">'+esc(formatDate(addDays(inputValue(bundle),item.dayOffset)))+'</div><div class="calendar-title">'+esc(item.title)+'</div><p>'+esc(item.menu||item.route)+'</p></article>').join("")+'</div>'+(remaining?'<p class="completion" style="margin-top:12px">외 '+remaining+'개 일정 · 전체 내용은 아래와 캘린더 파일에서 확인</p>':"")+'<button class="primary" type="button" data-download="'+esc(bundle.id)+'">'+esc(bundle.artifact.downloadLabel)+'</button>'
}
function renderFixedArtifact(bundle){
  return '<p class="artifact-lead">공식 기한은 캘린더로, 대학별·개인별 조건은 할 일로 분리합니다.</p><div class="calendar-list">'+bundle.artifact.events.map(event=>'<article class="calendar-row"><div class="calendar-date">'+esc(formatDate(event.startDate))+(event.startTime?' '+esc(event.startTime):"")+(event.endDateInclusive!==event.startDate?' ~ '+esc(formatDate(event.endDateInclusive))+(event.endTime?' '+esc(event.endTime):""):"")+'</div><div class="calendar-title">'+esc(event.title)+'</div><p>'+esc(event.detail)+'</p></article>').join("")+'</div><div class="check-list" style="margin-top:12px">'+bundle.artifact.checklist.map(item=>'<article class="check-row"><span class="check-box" aria-hidden="true"></span><div><div class="check-title">'+esc(item.title)+'</div></div></article>').join("")+'</div><button class="primary" type="button" data-download="'+esc(bundle.id)+'">'+esc(bundle.artifact.downloadLabel)+'</button><button class="secondary" type="button" data-download-todo="'+esc(bundle.id)+'">'+esc(bundle.artifact.todoDownloadLabel)+'</button>'
}
function renderStudyArtifact(bundle){
  const previewRows=bundle.artifact.rows.slice(0,3),remaining=bundle.artifact.rows.length-previewRows.length;
  return '<p class="artifact-lead">차시·공식 설명은 채워지고, 상태·목표일·메모만 사용자가 입력하는 '+bundle.artifact.rows.length+'행 CSV입니다.</p><div class="study-list">'+previewRows.map(row=>'<article class="study-row"><span class="study-order">'+row.order+'</span><div><div class="study-title">'+esc(row.title)+'</div></div></article>').join("")+'</div>'+(remaining?'<p class="completion" style="margin-top:12px">외 '+remaining+'개 차시 · 전체 내용은 왼쪽과 CSV에서 확인</p>':"")+'<button class="primary" type="button" data-download="'+esc(bundle.id)+'">'+esc(bundle.artifact.downloadLabel)+'</button>'
}
function renderSourceNotes(bundle){
  const links=sourceLinks(bundle.source);
  return '<section class="source-notes"><h2>출처와 주의</h2><ul>'+bundle.sourceNotes.map(note=>'<li>'+esc(note)+'</li>').join("")+'</ul>'+(links?'<div class="source-links">'+links+'</div>':"")+'</section>'
}
function renderReviewZone(bundle,review){
  const record=REVIEWS.get(bundle.id),labels=[["good","좋음"],["fix","보완 필요"],["exclude","제외"]];
  return '<section class="review-zone"><p class="review-label">검토자 메모 · 서비스 화면과 별도</p><h2>'+esc(record.question)+'</h2><div class="verdicts">'+labels.map(([value,label])=>'<button class="verdict '+(review.verdict===value?"selected":"")+'" type="button" data-verdict="'+value+'" data-content="'+esc(bundle.id)+'">'+label+'</button>').join("")+'</div><textarea data-comment="'+esc(bundle.id)+'" placeholder="필요한 보완점을 적어 주세요.">'+esc(review.comment||"")+'</textarea><button class="save-review" type="button" data-save-review="'+esc(bundle.id)+'">검토 메모 저장</button></section>'
}
function renderDetailNav(index){
  return '<div class="detail-nav"><button type="button" data-adjacent="'+(index-1)+'" '+(index===0?"disabled":"")+'>이전</button><button type="button" data-adjacent="'+(index+1)+'" '+(index===BUNDLES.length-1?"disabled":"")+'>다음</button></div>'
}
function render(){
  const route=currentRoute(),app=document.getElementById("app");
  app.innerHTML=route.view==="home"?renderHome():renderFlow(BY_ID.get(route.id));
  window.scrollTo({top:0,behavior:"auto"})
}
function icsEscape(value){const slash=String.fromCharCode(92),newline=String.fromCharCode(10);return String(value??"").split(slash).join(slash+slash).split(newline).join(slash+"n").split(",").join(slash+",").split(";").join(slash+";")}
function compactDate(ymd){return ymd.replaceAll("-","")}
function foldIcsLine(line){
  const encoder=new TextEncoder(),parts=[];let current="";
  for(const character of line){const next=current+character;if(current&&encoder.encode(next).length>73){parts.push(current);current=character}else current=next}
  parts.push(current);return parts.join(String.fromCharCode(13,10)+" ")
}
function eventDescription(bundle,item){
  const sections=[];
  if(item.menu)sections.push("메뉴: "+item.menu);
  if(item.route)sections.push("순서: "+item.route);
  if(item.ingredients)sections.push("재료: "+item.ingredients);
  if(item.method)sections.push((item.menu?"조리: ":"메모: ")+item.method);
  if(item.detail)sections.push(item.detail);
  if(item.completion)sections.push("완료: "+item.completion);
  if(bundle.sourceNotes?.length)sections.push("주의: "+bundle.sourceNotes.join(" / "));
  if(bundle.artifact.checklist?.length)sections.push("조건부 할 일: "+bundle.artifact.checklist.map(entry=>entry.title+" — "+entry.detail).join(" / "));
  if(bundle.source.procedureUrl)sections.push("신청 절차: "+bundle.source.procedureUrl);
  if(bundle.source.eligibilityUrl)sections.push("공식 자격 확인: "+bundle.source.eligibilityUrl);
  if(bundle.source.syllabusUrl)sections.push("수업계획서: "+bundle.source.syllabusUrl);
  sections.push("원문: "+bundle.source.url);
  return sections.join(String.fromCharCode(10))
}
function utcDateTime(ymd,hm){return new Date(ymd+"T"+hm+":00+09:00").toISOString().slice(0,19).replaceAll("-","").replaceAll(":","")+"Z"}
function buildIcs(bundle){
  const events=bundle.artifact.kind==="anchored_calendar"?bundle.artifact.items.map((item,index)=>({title:item.title,startDate:addDays(inputValue(bundle),item.dayOffset),endDateInclusive:addDays(inputValue(bundle),item.dayOffset),description:eventDescription(bundle,item),index})):bundle.artifact.events.map((event,index)=>({...event,description:eventDescription(bundle,event),index}));
  const iso=new Date().toISOString(),stamp=iso.slice(0,19).replaceAll("-","").replaceAll(":","")+"Z";
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//FlowMe//User-facing Content Review V2//KO","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  for(const event of events){
    const timing=event.startTime?["DTSTART:"+utcDateTime(event.startDate,event.startTime),...(event.endTime?["DTEND:"+utcDateTime(event.endDate||event.endDateInclusive||event.startDate,event.endTime)]:[])]:["DTSTART;VALUE=DATE:"+compactDate(event.startDate),"DTEND;VALUE=DATE:"+compactDate(addDays(event.endDateInclusive,1))];
    lines.push("BEGIN:VEVENT","UID:"+bundle.id+"-"+event.index+"@flowme.local","DTSTAMP:"+stamp,...timing,"SUMMARY:"+icsEscape(event.title),"DESCRIPTION:"+icsEscape(event.description),"URL:"+bundle.source.url,"END:VEVENT")
  }
  const crlf=String.fromCharCode(13,10);lines.push("END:VCALENDAR");return lines.map(foldIcsLine).join(crlf)+crlf
}
function csvCell(value){const text=String(value??""),newline=String.fromCharCode(10);return text.includes('"')||text.includes(",")||text.includes(newline)?'"'+text.replaceAll('"','""')+'"':text}
function buildCsv(bundle){
  const header=["순서","차시","공식 설명","상태","목표일","메모","원문"];
  const rows=bundle.artifact.rows.map(row=>[row.order,row.title,row.detail,"시작 전","","",bundle.source.url]);
  const crlf=String.fromCharCode(13,10);return "\uFEFF"+[header,...rows].map(row=>row.map(csvCell).join(",")).join(crlf)+crlf
}
function buildTodoText(bundle){
  const lines=[bundle.title,"",...bundle.artifact.checklist.flatMap(item=>["- [ ] "+item.title,"  "+item.detail]),"","신청 절차: "+bundle.source.procedureUrl,"공식 자격 확인: "+bundle.source.eligibilityUrl,"원문: "+bundle.source.url];
  return lines.join(String.fromCharCode(13,10))+String.fromCharCode(13,10)
}
function downloadText(text,mime,fileName){const blob=new Blob([text],{type:mime}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url)}
function downloadArtifact(bundle){
  if(bundle.artifact.kind==="progress_sheet")downloadText(buildCsv(bundle),"text/csv;charset=utf-8",bundle.artifact.fileName);
  else downloadText(buildIcs(bundle),"text/calendar;charset=utf-8",bundle.artifact.fileName);
  toast("도구 파일을 받았습니다")
}
function exportReviews(){
  const textarea=document.querySelector("[data-comment]");if(textarea){const id=textarea.dataset.comment;state.reviews[id]={...(state.reviews[id]||{}),comment:textarea.value,updatedAt:new Date().toISOString()};saveState()}
  const payload={schemaVersion:"flowme-user-facing-content-review-v2-result",exportedAt:new Date().toISOString(),inputs:state.inputs,reviews:state.reviews};
  downloadText(JSON.stringify(payload,null,2)+String.fromCharCode(10),"application/json;charset=utf-8","flowme-user-facing-content-review-v2-result.json");toast("검토 메모를 받았습니다")
}
document.addEventListener("click",event=>{
  const open=event.target.closest("[data-open]");if(open){routeTo("#flow/"+encodeURIComponent(open.dataset.open));return}
  if(event.target.closest("[data-home]")){routeTo("#home");return}
  const adjacent=event.target.closest("[data-adjacent]");if(adjacent&&!adjacent.disabled){const index=Number(adjacent.dataset.adjacent);routeTo("#flow/"+encodeURIComponent(BUNDLES[index].id));return}
  const download=event.target.closest("[data-download]");if(download){downloadArtifact(BY_ID.get(download.dataset.download));return}
  const todo=event.target.closest("[data-download-todo]");if(todo){const bundle=BY_ID.get(todo.dataset.downloadTodo);downloadText(buildTodoText(bundle),"text/plain;charset=utf-8",bundle.artifact.todoFileName);toast("조건부 할 일 메모를 받았습니다");return}
  const verdict=event.target.closest("[data-verdict]");if(verdict){const id=verdict.dataset.content,textarea=document.querySelector('[data-comment="'+CSS.escape(id)+'"]');state.reviews[id]={...(state.reviews[id]||{}),verdict:verdict.dataset.verdict,comment:textarea?.value||state.reviews[id]?.comment||"",updatedAt:new Date().toISOString()};saveState();document.querySelectorAll('[data-verdict][data-content="'+CSS.escape(id)+'"]').forEach(button=>button.classList.toggle("selected",button.dataset.verdict===verdict.dataset.verdict));toast("선택과 메모를 저장했습니다");return}
  const save=event.target.closest("[data-save-review]");if(save){const id=save.dataset.saveReview,textarea=document.querySelector('[data-comment="'+CSS.escape(id)+'"]');state.reviews[id]={...(state.reviews[id]||{}),comment:textarea?.value||"",updatedAt:new Date().toISOString()};saveState();toast("검토 메모를 저장했습니다");return}
  if(event.target.closest("[data-export-review]")){exportReviews()}
});
document.addEventListener("change",event=>{
  const input=event.target.closest("[data-date-input]");if(!input)return;const bundle=BY_ID.get(input.dataset.dateInput),required=bundle.artifact.input?.requiredWeekday;if(required!==undefined&&new Date(input.value+"T00:00:00").getDay()!==required){input.value=inputValue(bundle);toast("월요일 날짜를 선택해 주세요");return}state.inputs[input.dataset.dateInput]=input.value;saveState();render()
});
window.addEventListener("hashchange",render);
render();
</script>
</body>
</html>`;

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(htmlPath, html, "utf8");

const qualitySummary = Object.fromEntries(
  data.reviewRecords.map((record) => {
    const scores = Object.values(record.quality).map((entry) => entry.score);
    return [
      record.contentId,
      Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2)),
    ];
  }),
);

const htmlBytes = fs.readFileSync(htmlPath);
const manifest = {
  schemaVersion: "flowme-user-facing-content-review-v2-manifest",
  generatedAt,
  reviewDate: data.reviewDate,
  sourceData: {
    path: path.relative(repoRoot, dataPath).replaceAll("\\", "/"),
    bytes: dataBytes.length,
    sha256: `sha256:${sha256(dataBytes)}`,
  },
  output: {
    path: path.relative(repoRoot, htmlPath).replaceAll("\\", "/"),
    bytes: htmlBytes.length,
    sha256: `sha256:${sha256(htmlBytes)}`,
  },
  policy: {
    contentCount: data.contentBundles.length,
    originalV1Preserved: true,
    sourceLinksVisibleNearTitle: true,
    sourceDetailsAndMemoVisible: true,
    userFacingContentSeparatedFromReviewRecords: true,
    workingIcsDownloads: 3,
    workingCsvDownloads: 1,
    workingTodoTextDownloads: 1,
    sourceRowGapsNotInvented: true,
    observedUserValidation: "NOT_RUN",
  },
  contentIds: data.contentBundles.map((bundle) => bundle.id),
  qualityAverages: qualitySummary,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      output: manifest.output.path,
      bytes: manifest.output.bytes,
      sha256: manifest.output.sha256,
      contentCount: manifest.policy.contentCount,
      manifest: path.relative(repoRoot, manifestPath).replaceAll("\\", "/"),
    },
    null,
    2,
  ),
);
