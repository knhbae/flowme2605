import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const specDir = path.join(root, "docs", "specs", "2026-07-22-flow-content-value-qualified-benchmark-v1");
const reportFile = path.join(root, "docs", "content-audit", "2026-07-22-flow-content-value-qualified-benchmark-v1-ko.html");

const read = (name) => JSON.parse(fs.readFileSync(path.join(specDir, name), "utf8"));
const candidatePool = read("candidate-pool-v1.json").candidates;
const selected = read("selected-positive-set-v1.json").candidates;
const rejected = read("rejected-candidates-v1.json").candidates;
const adjudication = read("final-adjudication-v1.json");
const metrics = read("value-and-conversion-metrics-v1.json");
const comparison = read("model-comparison-v1.json");
const prior = read("prior-benchmark-reinterpretation-v1.json");
const seal = read("seal-v1.json");

const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");
const pct = (value) => `${Math.round(Number(value || 0) * 100)}%`;
const candidateById = Object.fromEntries(candidatePool.map((candidate) => [candidate.candidateId, candidate]));
const artifactKo = { calendar: "Calendar", checklist: "Checklist", todo: "Todo", sheet: "Sheet", memo: "Memo" };
const roleKo = { rules: "규칙 기반", "low-cost": "저비용 역할", "high-capability": "고성능 역할" };

function lane(candidate) {
  if (candidate.evidenceLane === "official_high_intent") return "official";
  if (candidate.providerType?.includes("community") || candidate.evidenceLane === "creator_community") return "creator";
  return "community";
}

function evidenceLine(candidate, type) {
  return candidate.evidence.find((entry) => entry.type === type)?.claim || "직접 확인 가능한 근거 없음";
}

function roleCard(row, role) {
  const result = row.results[role];
  const evaluation = row.evaluations[role];
  const ok = evaluation.directlyUsable;
  return `<article class="role-card" data-role="${role}">
    <div class="role-head"><strong>${roleKo[role]}</strong><span class="dot ${ok ? "ok" : "warn"}"></span></div>
    <dl>
      <div><dt>판정</dt><dd>${result.flowPossible ? "Flow 생성" : esc(result.status)}</dd></div>
      <div><dt>주 결과물</dt><dd>${artifactKo[result.primaryProjection] || "생성 안 함"}</dd></div>
      <div><dt>행 보존</dt><dd>${pct(evaluation.sourceRowMeaningPreservation)}</dd></div>
      <div><dt>출처 추적</dt><dd>${pct(evaluation.itemProvenanceRate)}</dd></div>
    </dl>
    <p>${esc(result.reason)}</p>
    <small>${ok ? "바로 사용 가능 판정" : "공통 규칙 보완 또는 확인 필요"}</small>
    <details><summary>실제 출력 ${result.items.length}개 Item · 입력 ${(result.minimumInputs || []).length}개</summary>
      <ul>${result.items.length ? result.items.map((item) => `<li><b>${esc(item.title)}</b><span>${esc(item.completion)} · ${esc((item.sourceRefs || []).join(", "))}</span></li>`).join("") : `<li><b>${esc(result.status)}</b><span>실행 Item을 만들지 않음</span></li>`}</ul>
    </details>
  </article>`;
}

function sourceRows(gold, max = 9) {
  if (!gold.sourceRows.length) return `<div class="empty">확보한 실행행이 없어 여기서 멈췄습니다.</div>`;
  const list = gold.sourceRows.slice(0, max).map((row) => `<li><span>${String(row.order).padStart(2, "0")}</span><div><strong>${esc(row.title)}</strong><small>${esc(row.detail)}</small></div></li>`).join("");
  const remaining = gold.sourceRows.slice(max);
  const rest = remaining.length;
  return `<ol class="rows">${list}</ol>${rest > 0 ? `<details class="all-rows"><summary>나머지 ${rest}개 SourceRow 모두 보기</summary><ol class="rows">${remaining.map((row) => `<li><span>${String(row.order).padStart(2, "0")}</span><div><strong>${esc(row.title)}</strong><small>${esc(row.detail)}</small></div></li>`).join("")}</ol></details>` : ""}`;
}

function itemRows(gold, max = 7) {
  if (!gold.allowedItems.length) return `<div class="stop-card"><b>${esc(gold.status)}</b><span>가짜 Item을 만들지 않았습니다.</span></div>`;
  const card = (item, index) => `<article class="flow-item">
    <span class="check">${index + 1}</span><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p><small>완료: ${esc(item.completion)} · 출처 ${esc(item.sourceRefs.join(", "))}</small></div>
  </article>`;
  const first = gold.allowedItems.slice(0, max).map(card).join("");
  const remaining = gold.allowedItems.slice(max);
  return `<div class="item-stack">${first}</div>${remaining.length ? `<details class="all-rows"><summary>나머지 ${remaining.length}개 Item 모두 보기</summary><div class="item-stack">${remaining.map((item, index) => card(item, index + max)).join("")}</div></details>` : ""}`;
}

function projectionTiles(gold) {
  return `<div class="projection-grid">${Object.entries(gold.projections).map(([name, projection]) => {
    const enabled = projection.availability !== "omitted";
    const amount = projection.events?.length ?? projection.entries?.length ?? projection.rows?.length ?? (projection.body ? 1 : 0);
    return `<div class="projection ${enabled ? "enabled" : "disabled"}"><b>${artifactKo[name]}</b><span>${projection.availability === "ready" ? `${amount}개 준비` : projection.availability === "conditional" ? "입력 후 생성" : "생성 안 함"}</span></div>`;
  }).join("")}</div>`;
}

function caseSlide(row, index) {
  const candidate = candidateById[row.candidateId];
  const gold = row.gold;
  const disagreement = row.disagreementCauses.length ? "disagreement" : "agreement";
  const success = Object.values(row.evaluations).filter((entry) => entry.directlyUsable).length >= 2 ? "success" : "fail";
  const evidence = candidate.evidenceLane === "official_high_intent" ? "official-intent" : "interaction";
  return `<section class="slide case-slide case-record" id="case-${esc(row.caseId)}"
    data-verdict="${row.verdict.toLowerCase()}" data-class="${row.goldClass}" data-provider="${lane(candidate)}"
    data-format="${esc(candidate.sourceFormat)}" data-artifact="${esc(gold.primaryProjection || "none")}" data-evidence="${evidence}"
    data-result="${success}" data-agreement="${disagreement}">
    <header class="slide-head">
      <div><span class="eyebrow">${row.goldClass === "boundary" ? "BOUNDARY CONTROL" : `VALUE CASE ${String(index + 1).padStart(2, "0")}`}</span><h2>${esc(row.title)}</h2></div>
      <div class="verdict ${row.verdict.toLowerCase()}">${row.verdict}</div>
    </header>
    <div class="source-strip"><a href="${esc(gold.source.canonicalUrl)}" target="_blank" rel="noreferrer">${esc(gold.source.provider)} 원문 ↗</a><span>${esc(candidate.sourceFormat)}</span><span>${esc(candidate.locale)}</span><span>${gold.publicReleaseAllowed ? "공개 가능" : gold.privateConversionAllowed ? "개인용만" : "변환 중지"}</span></div>
    <div class="why-grid">
      <article><span>사람이 저장할 이유</span><strong>${esc(candidate.valueDelta.returnMoment)}</strong><p>${esc(evidenceLine(candidate, "demand"))}</p></article>
      <article><span>링크만 저장하면</span><strong>실행 상태가 남지 않음</strong><p>${esc(candidate.valueDelta.sourceLinkOnlyLimit)}</p></article>
      <article class="accent"><span>Flow가 더하는 것</span><strong>${esc(candidate.valueDelta.persistentState)}</strong><p>${artifactKo[gold.primaryProjection] || "Stop gate"} · 필수 입력 ${gold.minimumInputs.length}개</p></article>
    </div>
    <div class="content-grid">
      <article class="panel"><div class="panel-title"><span>01</span><h3>원문에서 확보한 SourceRow</h3><b>${gold.sourceRows.length}</b></div>${sourceRows(gold)}</article>
      <article class="panel"><div class="panel-title"><span>02</span><h3>실제 Flow Item</h3><b>${gold.allowedItems.length}</b></div>${itemRows(gold)}</article>
    </div>
    <div class="use-grid">
      <article class="panel compact"><div class="panel-title"><span>03</span><h3>사용자 입력</h3></div>
        <div class="input-summary"><b>${gold.minimumInputs.length === 0 ? "바로 시작" : `필수 ${gold.minimumInputs.length}개`}</b><span>${gold.minimumInputs.length ? esc(gold.minimumInputs.join(" · ")) : "원문 값을 다시 묻지 않음"}</span><small>선택: ${gold.optionalInputs.length ? esc(gold.optionalInputs.join(" · ")) : "없음"}</small></div>
      </article>
      <article class="panel compact"><div class="panel-title"><span>04</span><h3>기존 도구로 보내기</h3></div>${projectionTiles(gold)}</article>
    </div>
    <div class="role-grid">${roleCard(row, "rules")}${roleCard(row, "low-cost")}${roleCard(row, "high-capability")}</div>
    <footer class="case-foot"><span>제작자/원문 경로: ${esc(candidate.scores.creatorBusinessValue.comment)}</span><span>내부 판정 · 실제 사용자 검증 아님</span></footer>
  </section>`;
}

const featuredIds = ["NEW-WEB1", "NEW-OHOUSE-DEFECT", "NEW-KOSAF-WORK"];
const featured = featuredIds.map((id) => selected.find((candidate) => candidate.candidateId === id));
const featuredCards = featured.map((candidate, index) => {
  const row = adjudication.cases.find((entry) => entry.candidateId === candidate.candidateId);
  return `<a class="featured-card tone-${index + 1}" href="#case-${row.caseId}"><span>0${index + 1} · ${artifactKo[row.gold.primaryProjection]}</span><h3>${esc(candidate.title)}</h3><p>${esc(candidate.valueDelta.sourceLinkOnlyLimit)}</p><strong>${esc(candidate.valueDelta.persistentState)} →</strong></a>`;
}).join("");

const selectedRows = selected.map((candidate) => {
  const row = adjudication.cases.find((entry) => entry.candidateId === candidate.candidateId);
  return `<tr><td><a href="#case-${row.caseId}">${esc(candidate.title)}</a><small>${esc(candidate.provider)}</small></td><td><b>${candidate.computedTotal}</b></td><td>${esc(candidate.valueDelta.returnMoment)}</td><td>${artifactKo[candidate.valueDelta.naturalArtifact]}</td><td><span class="mini-verdict ${row.verdict.toLowerCase()}">${row.verdict}</span></td></tr>`;
}).join("");

const rejectedRows = rejected.map((candidate) => `<tr><td>${esc(candidate.title)}<small>${esc(candidate.provider)}</small></td><td>${candidate.computedTotal}</td><td>${candidate.qualified ? "점수 통과·구성 미선정" : "admission 실패"}</td><td>${esc(candidate.rejectionReason || "더 강한 후보와 중복")}</td></tr>`).join("");

const positiveSlides = adjudication.cases.filter((row) => row.goldClass === "positive").map(caseSlide).join("\n");
const boundarySlides = adjudication.cases.filter((row) => row.goldClass === "boundary").map((row, index) => caseSlide(row, index + 12)).join("\n");

const roleMetricCards = Object.entries(metrics.conversionByRole).map(([role, value]) => `<article class="metric-card">
  <span>${roleKo[role]}</span><strong>${pct(value.directlyUsableRate)}</strong><p>바로 사용 가능</p>
  <dl><div><dt>행 의미 보존</dt><dd>${pct(value.sourceRowMeaningPreservation)}</dd></div><div><dt>artifact</dt><dd>${pct(value.primaryArtifactAccuracy)}</dd></div><div><dt>발명</dt><dd>${value.inventedActionCount + value.inventedScheduleCount}</dd></div></dl>
</article>`).join("");

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Flow Content Value-Qualified Benchmark v1</title>
<style>
:root{--ink:#151b19;--muted:#68706d;--paper:#f4f2eb;--card:#fffdf8;--line:#d9ddd8;--mint:#d7f3df;--green:#116346;--lime:#dff25e;--blue:#dbe9ff;--orange:#ffdcc1;--red:#a03e2e;--shadow:0 18px 55px rgba(20,31,26,.09)}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif;line-height:1.45}.toolbar{position:sticky;z-index:20;top:0;display:flex;align-items:center;gap:18px;padding:11px 24px;background:rgba(244,242,235,.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}.brand{display:flex;align-items:center;gap:8px;font-weight:900;white-space:nowrap}.brand i{width:24px;height:24px;border-radius:8px;background:var(--green);display:grid;place-items:center;color:white;font-style:normal}.filters{display:flex;gap:8px;overflow:auto;scrollbar-width:none}.filters select,.filters button{height:34px;border:1px solid var(--line);background:white;border-radius:999px;padding:0 13px;color:var(--ink);font-weight:700}.filters button.active{background:var(--ink);color:white}.toolbar small{margin-left:auto;color:var(--muted);white-space:nowrap}.slide{width:min(1440px,100%);min-height:900px;margin:0 auto;padding:62px 70px;border-bottom:1px solid var(--line);position:relative}.hero{background:radial-gradient(circle at 80% 18%,rgba(223,242,94,.55),transparent 30%),linear-gradient(135deg,#f8f7f2 0%,#eef5ef 100%)}.kicker,.eyebrow{font-size:12px;letter-spacing:.14em;font-weight:900;color:var(--green)}h1{font-size:clamp(48px,6vw,88px);line-height:.98;letter-spacing:-.065em;margin:22px 0 18px;max-width:1070px}.hero>p{font-size:21px;max-width:800px;color:#3f4945}.hero-metrics{display:flex;gap:12px;margin:32px 0}.hero-metrics div{padding:15px 20px;background:rgba(255,255,255,.72);border:1px solid rgba(17,99,70,.14);border-radius:16px}.hero-metrics strong{font-size:29px;display:block}.hero-metrics span{font-size:12px;color:var(--muted)}.featured-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:38px}.featured-card{min-height:240px;padding:24px;border-radius:24px;color:inherit;text-decoration:none;display:flex;flex-direction:column;border:1px solid rgba(21,27,25,.08);transition:.18s transform}.featured-card:hover{transform:translateY(-5px)}.featured-card span{font-size:12px;font-weight:900;letter-spacing:.08em}.featured-card h3{font-size:27px;letter-spacing:-.035em;margin:24px 0 10px}.featured-card p{font-size:14px;color:#39423e}.featured-card strong{margin-top:auto}.tone-1{background:var(--lime)}.tone-2{background:var(--blue)}.tone-3{background:var(--orange)}.hero-note{position:absolute;right:70px;bottom:24px;font-size:12px;color:var(--muted)}.slide-head{display:flex;align-items:flex-start;justify-content:space-between;gap:30px;margin-bottom:20px}.slide-head h2{font-size:43px;letter-spacing:-.05em;line-height:1.05;margin:8px 0 0}.verdict,.mini-verdict{font-weight:900;border-radius:999px}.verdict{padding:10px 18px;font-size:15px}.verdict.go,.mini-verdict.go{background:var(--mint);color:var(--green)}.verdict.modify,.mini-verdict.modify{background:var(--orange);color:#7a451f}.verdict.hold,.mini-verdict.hold{background:#eee;color:#555}.source-strip{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:11px 0 21px;border-bottom:1px solid var(--line)}.source-strip a{font-weight:900;color:var(--green)}.source-strip span{font-size:12px;background:white;border:1px solid var(--line);padding:5px 9px;border-radius:999px}.why-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.why-grid article{background:white;border:1px solid var(--line);border-radius:18px;padding:17px}.why-grid article.accent{background:#173b2e;color:white}.why-grid span{display:block;font-size:11px;font-weight:900;color:#728078;text-transform:uppercase;letter-spacing:.08em}.why-grid .accent span{color:#a8d2bd}.why-grid strong{display:block;font-size:18px;margin:8px 0}.why-grid p{font-size:12px;color:var(--muted);margin:0}.why-grid .accent p{color:#cfe1d8}.content-grid{display:grid;grid-template-columns:.92fr 1.08fr;gap:14px}.use-grid{display:grid;grid-template-columns:.65fr 1.35fr;gap:14px;margin-top:14px}.panel{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:18px}.panel-title{display:flex;align-items:center;gap:10px;margin-bottom:14px}.panel-title>span{width:26px;height:26px;display:grid;place-items:center;border-radius:8px;background:var(--ink);color:white;font-size:10px}.panel-title h3{font-size:15px;margin:0}.panel-title b{margin-left:auto;font-size:22px}.rows{margin:0;padding:0;list-style:none;display:grid;gap:7px}.rows li{display:flex;gap:11px;padding:8px;border-radius:12px;background:#f5f5f0}.rows li>span{font:800 10px/24px ui-monospace;color:var(--green)}.rows li div{display:flex;min-width:0;flex-direction:column}.rows strong{font-size:12px}.rows small{font-size:10px;color:var(--muted);white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.rows .more{background:#edf4ef}.item-stack{display:grid;gap:7px}.flow-item{display:flex;gap:10px;padding:9px 10px;border:1px solid #e3e6e1;border-radius:13px}.check{flex:0 0 25px;height:25px;border:1px solid #a7b3ac;border-radius:8px;display:grid;place-items:center;font-size:10px;font-weight:900}.flow-item strong{font-size:12px}.flow-item p{font-size:10px;color:var(--muted);margin:2px 0}.flow-item small{font-size:9px;color:#7d8581}.more-items{font-size:11px;padding:7px;color:var(--green);font-weight:900}.input-summary{display:flex;flex-direction:column;gap:5px}.input-summary b{font-size:24px}.input-summary span{font-size:13px}.input-summary small{color:var(--muted)}.projection-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.projection{border-radius:13px;padding:10px;display:flex;flex-direction:column;min-height:65px;border:1px solid var(--line)}.projection.enabled{background:var(--mint);border-color:#b5dcc5}.projection.disabled{opacity:.45}.projection b{font-size:11px}.projection span{margin-top:auto;font-size:9px}.role-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.role-card{background:#171c1a;color:white;border-radius:18px;padding:15px}.role-head{display:flex;align-items:center;justify-content:space-between}.dot{width:9px;height:9px;border-radius:50%}.dot.ok{background:#74df9f}.dot.warn{background:#ffb56e}.role-card dl{display:grid;grid-template-columns:repeat(4,1fr);margin:14px 0 8px;gap:5px}.role-card dl div{display:flex;flex-direction:column}.role-card dt{font-size:8px;color:#9eaaa4}.role-card dd{font-size:11px;font-weight:800;margin:2px 0}.role-card p{font-size:10px;color:#bdc8c2;margin:8px 0}.role-card small{font-size:9px;color:#83d6aa}.role-card details,.all-rows{margin-top:9px}.role-card summary,.all-rows summary{cursor:pointer;font-size:10px;font-weight:900;color:#8bdcad}.role-card details ul{max-height:180px;overflow:auto;margin:8px 0 0;padding:0;list-style:none}.role-card details li{display:flex;flex-direction:column;padding:6px 0;border-top:1px solid #34403a}.role-card details li b{font-size:9px}.role-card details li span{font-size:8px;color:#9eaaa4}.all-rows{padding:8px 2px}.all-rows summary{color:var(--green);margin-bottom:8px}.case-foot{display:flex;justify-content:space-between;gap:20px;color:var(--muted);font-size:9px;margin-top:10px}.empty,.stop-card{padding:24px;background:#f2f2ee;border-radius:15px;color:var(--muted)}.stop-card{display:flex;flex-direction:column;gap:7px}.stop-card b{font-size:18px;color:var(--red)}.section-title{font-size:52px;letter-spacing:-.055em;margin:10px 0}.section-copy{max-width:780px;font-size:18px;color:var(--muted)}.funnel{display:grid;grid-template-columns:1.4fr 60px 1fr 60px 1fr;align-items:stretch;gap:10px;margin:35px 0}.funnel article{background:white;border-radius:22px;padding:28px;border:1px solid var(--line)}.funnel strong{font-size:55px;display:block}.funnel span{font-size:13px;color:var(--muted)}.arrow{display:grid;place-items:center;font-size:28px;color:var(--green)}table{width:100%;border-collapse:collapse;background:white;border-radius:18px;overflow:hidden}th,td{text-align:left;padding:10px 13px;border-bottom:1px solid #e7e9e6;font-size:11px}th{background:#1c2521;color:white;position:sticky;top:56px}td a{color:var(--ink);font-weight:800}td small{display:block;color:var(--muted)}.mini-verdict{font-size:9px;padding:4px 7px}.table-wrap{max-height:500px;overflow:auto;border-radius:18px;border:1px solid var(--line)}.metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:30px}.metric-card{padding:25px;background:white;border:1px solid var(--line);border-radius:22px}.metric-card>span{font-size:12px;font-weight:900}.metric-card>strong{display:block;font-size:62px;letter-spacing:-.06em;margin:15px 0 0}.metric-card>p{margin:0;color:var(--muted)}.metric-card dl{margin-top:25px}.metric-card dl div{display:flex;justify-content:space-between;border-top:1px solid var(--line);padding:8px 0}.metric-card dt,.metric-card dd{font-size:11px;margin:0}.callout{margin-top:25px;padding:22px;border-radius:20px;background:#173b2e;color:white}.callout b{color:var(--lime)}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:28px}.big-card{background:white;border:1px solid var(--line);border-radius:24px;padding:25px}.big-card h3{font-size:25px;margin-top:0}.big-card li{margin:9px 0;color:#46504b}.note{padding:13px 16px;border-left:4px solid var(--green);background:#edf4ef;font-size:12px}.hidden{display:none!important}.footer-slide{background:#17211d;color:white}.footer-slide .section-copy{color:#bbc5c0}.footer-slide .big-card{background:#233029;border-color:#31433a}.footer-slide .big-card li{color:#d4ded8}.footer-slide a{color:var(--lime)}
@media(max-width:700px){.toolbar{padding:8px 10px;align-items:flex-start}.brand{padding-top:6px}.toolbar small{display:none}.filters{padding-bottom:2px}.filters select,.filters button{height:32px;font-size:11px}.slide{min-height:844px;padding:42px 17px}.hero{padding-top:60px}h1{font-size:49px}.hero>p{font-size:16px}.hero-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.hero-metrics div{padding:10px}.hero-metrics strong{font-size:22px}.featured-grid,.why-grid,.content-grid,.use-grid,.role-grid,.metric-grid,.two-col{grid-template-columns:1fr}.featured-card{min-height:165px;padding:18px}.featured-card h3{font-size:22px;margin:13px 0 6px}.hero-note{position:static;margin-top:20px}.slide-head h2{font-size:32px}.source-strip{gap:5px}.why-grid{gap:7px}.why-grid article{padding:13px}.content-grid{gap:9px}.panel{padding:13px}.role-card dl{grid-template-columns:repeat(2,1fr)}.projection-grid{grid-template-columns:repeat(3,1fr)}.case-foot{flex-direction:column}.funnel{grid-template-columns:1fr}.arrow{transform:rotate(90deg)}.section-title{font-size:38px}.table-wrap{overflow:auto}table{min-width:670px}.case-slide{padding-bottom:60px}.role-card[data-role]{display:block}.slide.case-record.hidden{display:none!important}}
</style></head><body>
<nav class="toolbar"><div class="brand"><i>F</i> Value Benchmark</div><div class="filters">
  <button class="active" data-filter-key="all" data-filter-value="all">전체</button>
  <button data-filter-key="class" data-filter-value="positive">가치 후보 12</button>
  <button data-filter-key="class" data-filter-value="boundary">멈춤 6</button>
  <select id="verdictFilter"><option value="all">Go / Modify / Hold</option><option value="go">Go</option><option value="modify">Modify</option><option value="hold">Hold</option></select>
  <select id="providerFilter"><option value="all">모든 제공자</option><option value="official">공식</option><option value="creator">제작자</option><option value="community">커뮤니티</option></select>
  <select id="artifactFilter"><option value="all">모든 결과물</option><option value="calendar">Calendar</option><option value="checklist">Checklist</option><option value="todo">Todo</option><option value="sheet">Sheet</option><option value="none">Stop</option></select>
  <select id="evidenceFilter"><option value="all">모든 수요 근거</option><option value="interaction">반응 확인</option><option value="official-intent">공식 고의도</option></select>
  <select id="resultFilter"><option value="all">성공 / 실패</option><option value="success">성공</option><option value="fail">수정 필요</option></select>
  <select id="agreementFilter"><option value="all">모델 의견</option><option value="agreement">일치</option><option value="disagreement">불일치</option></select>
  <select id="roleFilter"><option value="all">세 방식 모두</option><option value="rules">규칙 기반</option><option value="low-cost">저비용</option><option value="high-capability">고성능</option></select>
</div><small id="visibleCount">18개 결과</small></nav>

<main>
<section class="slide hero"><span class="kicker">FLOW CONTENT VALUE-QUALIFIED BENCHMARK v1 · 2026.07.22</span><h1>잘 변환되는 링크가 아니라,<br>다시 돌아올 이유가 있는 Flow.</h1><p>후보 40개를 먼저 가치로 걸렀습니다. 원문 링크보다 실행 상태가 분명해지는 12개만 변환했고, 만들면 안 되는 6개는 별도 멈춤 시험으로 분리했습니다.</p>
<div class="hero-metrics"><div><strong>40</strong><span>실제 URL 후보</span></div><div><strong>12</strong><span>80점+ 가치 후보</span></div><div><strong>6</strong><span>boundary control</span></div></div>
<div class="featured-grid">${featuredCards}</div><div class="hero-note">첫 화면의 3개는 모두 실제 원문 · 점수는 source evidence + 내부 전문가 판정 · 자동·에이전트 QA는 실제 사용자 검증이 아니다 · 관찰 사용자 0명</div></section>

<section class="slide"><span class="eyebrow">WHY THIS BENCHMARK CHANGED</span><h2 class="section-title">이전 18개는 변환 스트레스 시험이었다</h2><p class="section-copy">Google 2단계 인증, 단일 청소 영상, 단일 레시피처럼 “행은 뽑을 수 있지만 링크보다 꼭 낫지는 않은” 사례가 정상 후보에 섞였습니다. 그 결과를 지우지 않고 역할만 다시 붙였습니다.</p>
<div class="funnel"><article><strong>18</strong><span>기존 일반화 사례 · 원본 점수 보존</span></article><div class="arrow">→</div><article><strong>${prior.counts.valueQualifiedPositiveProvisional}</strong><span>가치 후보(잠정)</span></article><div class="arrow">+</div><article><strong>${prior.counts.conversionOnlyStress} / ${prior.counts.boundaryStop}</strong><span>stress / stop control</span></article></div>
<div class="two-col"><article class="big-card"><h3>기존 방식의 질문</h3><ul><li>원문 행을 뽑을 수 있는가?</li><li>형태별 projection을 만들 수 있는가?</li><li>부족한 원문에서 멈추는가?</li></ul></article><article class="big-card"><h3>이번에 먼저 묻는 질문</h3><ul><li>사용자가 왜 저장하고 다시 돌아오는가?</li><li>링크에 없던 어떤 상태가 남는가?</li><li>제작자·공식 source로 어떻게 되돌아가는가?</li></ul></article></div>
<p class="note">기존 benchmark JSON과 점수는 변경하지 않았습니다. 이 보고서의 재분류는 별도 파생 산출물입니다.</p></section>

<section class="slide"><span class="eyebrow">ADMISSION BEFORE DIVERSITY</span><h2 class="section-title">점수와 gate를 통과한 12개</h2><p class="section-copy">형태 슬롯을 채우기 위해 약한 후보를 살리지 않았습니다. 80점 이상, source·rights·locale·safety·one-job·natural-artifact gate 통과가 먼저입니다.</p>
<div class="table-wrap"><table><thead><tr><th>콘텐츠</th><th>점수</th><th>다시 돌아오는 순간</th><th>주 결과물</th><th>최종</th></tr></thead><tbody>${selectedRows}</tbody></table></div>
<div class="callout"><b>구성 결과</b> · 한국어 ${metrics.selection.koreanCount}/12 · 제작자/커뮤니티 ${metrics.selection.creatorCommunityCount}/12 · 공식 고의도 ${metrics.selection.officialHighIntentCount}/12 · quota override ${metrics.selection.quotaOverrideCount}건</div></section>

${positiveSlides}

<section class="slide"><span class="eyebrow">PAIRED BLIND CONVERSION</span><h2 class="section-title">저비용과 고성능 차이는 어디서 났나</h2><p class="section-copy">같은 source packet을 서로 보지 않고 변환했습니다. 실제 provider API 호출이 아니므로 token·가격을 사실처럼 추정하지 않았습니다.</p><div class="metric-grid">${roleMetricCards}</div>
<div class="callout"><b>고성능 win / tie / 저비용 win</b> · ${comparison.winTieLoss.highWin} / ${comparison.winTieLoss.tie} / ${comparison.winTieLoss.lowWin}. 평가는 source 단위 paired 비교이며 54개 결과를 54개 독립 원문처럼 세지 않았습니다.</div>
<div class="two-col"><article class="big-card"><h3>저비용으로 충분한 범위</h3><ul><li>행이 완전하고 artifact가 명확한 순서형·자료 준비형</li><li>source gate가 명시된 stop control</li><li>원문 날짜가 명시된 단순 날짜창</li></ul></article><article class="big-card"><h3>고성능 판단이 필요한 범위</h3><ul><li>비교 기준을 할 일로 만들지 않고 상태표로 보존할 때</li><li>진도·증거·재점검처럼 field 설계가 중요한 content</li><li>개인용 변환과 공개 권리를 동시에 분리할 때</li></ul></article></div></section>

<section class="slide"><span class="eyebrow">NOT SELECTED IS ALSO A RESULT</span><h2 class="section-title">탈락한 28개와 이유</h2><p class="section-copy">높은 조회수만으로 통과하지 않았습니다. multi-job, 유료 원문 미확보, 오래된 날짜창, 민감·지역성, 같은 user moment 중복을 별도로 남겼습니다.</p><div class="table-wrap"><table><thead><tr><th>후보</th><th>점수</th><th>상태</th><th>선정하지 않은 이유</th></tr></thead><tbody>${rejectedRows}</tbody></table></div></section>

<section class="slide"><span class="eyebrow">BOUNDARY APPENDIX</span><h2 class="section-title">예쁜 가짜 Flow보다 정확한 멈춤</h2><p class="section-copy">아래 6개는 positive 가치 점수와 섞지 않았습니다. 로그인·유료 파일·컬렉션·홍보문·해외 건강 기준에서 Item 0개가 정답입니다.</p><div class="callout"><b>목표</b> boundary recall 100% · source_import_required / hold / blocked를 원인별로 구분</div></section>
${boundarySlides}

<section class="slide footer-slide"><span class="eyebrow">BACKEND HANDOFF</span><h2 class="section-title">이제 백엔드는 “URL → Flow” 앞에<br>가치 admission을 둬야 한다</h2><p class="section-copy">다음 구현 목표는 crawler가 아니라, source snapshot과 gate를 받아 proposal DTO를 반환하는 평가 가능한 서비스 경계입니다.</p>
<div class="two-col"><article class="big-card"><h3>백엔드 전에 고정할 것</h3><ol><li>SourceRow provenance와 source snapshot hash</li><li>value-qualified / stress / stop routing</li><li>primary artifact를 남는 상태로 결정</li><li>확정 일시 없는 ICS 생성 금지</li><li>private conversion과 public promotion 분리</li></ol></article><article class="big-card"><h3>이번 증거가 말하지 않는 것</h3><ol><li>실제 사용자의 저장 의향이나 반복 사용</li><li>production LLM의 실제 token·비용·latency</li><li>crawler의 접근 성공률과 최신성</li><li>공개 배포에 필요한 개별 권리 승인</li><li>4-source holdout 이상의 광범위한 일반화</li></ol></article></div>
<div class="callout"><b>봉인 상태</b> final holdout 개봉 후 규칙 변경 ${seal.postHoldoutMutationCount}건 · 실제 사용자 관찰 ${metrics.selection.actualObservedUserSessions}명 · commit/push/deploy 없음</div></section>
</main>
<script>
const state={class:'all',verdict:'all',provider:'all',artifact:'all',evidence:'all',result:'all',agreement:'all',role:'all'};
const records=[...document.querySelectorAll('.case-record')];
function apply(){let count=0;records.forEach(el=>{const visible=Object.entries(state).filter(([key])=>key!=='role').every(([key,value])=>value==='all'||el.dataset[key]===value);el.classList.toggle('hidden',!visible);if(visible)count++});document.querySelectorAll('.role-card').forEach(el=>el.classList.toggle('hidden',state.role!=='all'&&el.dataset.role!==state.role));document.getElementById('visibleCount').textContent=count+'개 결과'}
document.querySelectorAll('[data-filter-key]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-filter-key]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');if(btn.dataset.filterKey==='all'){Object.keys(state).forEach(key=>state[key]='all');document.querySelectorAll('select').forEach(s=>s.value='all')}else state[btn.dataset.filterKey]=btn.dataset.filterValue;apply()}));
for(const [id,key] of [['verdictFilter','verdict'],['providerFilter','provider'],['artifactFilter','artifact'],['evidenceFilter','evidence'],['resultFilter','result'],['agreementFilter','agreement'],['roleFilter','role']])document.getElementById(id).addEventListener('change',e=>{state[key]=e.target.value;apply()});
apply();
</script></body></html>`;

fs.mkdirSync(path.dirname(reportFile), { recursive: true });
fs.writeFileSync(reportFile, html, "utf8");
console.log(JSON.stringify({ reportFile, size: Buffer.byteLength(html), positiveCases: adjudication.cases.filter((row) => row.goldClass === "positive").length, boundaryCases: adjudication.cases.filter((row) => row.goldClass === "boundary").length }, null, 2));
