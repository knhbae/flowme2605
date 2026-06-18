import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = path.join(root, "docs/content-audit/2026-06-01-korean-flow-content-30-review.md");
const outputPath = path.join(root, "docs/content-audit/2026-06-01-korean-flow-content-30-review.html");
const reviewsPath = path.join(root, "docs/content-audit/original-source-review/2026-06-01-korean-flow-content-30-notes.json");

const md = fs.readFileSync(sourcePath, "utf8");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/^-|-$/g, "");

const tableScores = new Map();
for (const line of md.split(/\r?\n/)) {
  const match = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|/);
  if (match) {
    tableScores.set(Number(match[1]), Number(match[3]));
  }
}

const fieldLabels = [
  "제작자/출처",
  "원문",
  "원문 실행 신호",
  "Flow 제목",
  "CTA",
  "입력",
  "캘린더/루틴",
  "캘린더",
  "체크리스트",
  "시트",
  "메모",
  "완료 기준",
  "평가 메모",
];

const extractField = (section, label) => {
  const lines = section.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(`- ${label}:`));
  if (start < 0) return "";

  const first = lines[start].slice(`- ${label}:`.length).trim();
  const collected = first ? [first] : [];
  for (const line of lines.slice(start + 1)) {
    const knownFieldStarts = fieldLabels.some((fieldLabel) => line.startsWith(`- ${fieldLabel}:`));
    if (knownFieldStarts) break;
    collected.push(line);
  }
  return collected.join("\n").trim();
};

const extractListField = (section, labels) => {
  for (const label of labels) {
    const value = extractField(section, label);
    if (value) {
      return { label, value };
    }
  }
  return { label: "실행 항목", value: "" };
};

const markdownInline = (value = "") =>
  escapeHtml(value)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>");

const blockToHtml = (value = "") => {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return "";
  const listItems = lines.filter((line) => line.startsWith("- "));
  if (listItems.length === lines.length) {
    return `<ul>${listItems.map((line) => `<li>${markdownInline(line.slice(2).trim())}</li>`).join("")}</ul>`;
  }
  return lines.map((line) => `<p>${markdownInline(line.replace(/^- /, ""))}</p>`).join("");
};

const sourceFromOriginal = (original = "") => {
  const match = original.match(/\[([^\]]+)\]\(([^)]+)\)/);
  return {
    title: match ? match[1] : original,
    url: match ? match[2] : "",
  };
};

const inferCategory = (title = "") => {
  if (/한글|수 |놀이|독서|초등|누리|이유식|유아|영아|그림책|보육/.test(title)) return "유아/학습";
  if (/에어컨|공기청정기|로봇청소기|가습기|정수기|세탁기/.test(title)) return "가전 관리";
  if (/몬스테라|식물|스투키/.test(title)) return "식물 관리";
  if (/결혼|이사|전입|면허|여행/.test(title)) return "생활 이벤트";
  if (/중고차|차량|운전/.test(title)) return "차량";
  if (/컴활|공부/.test(title)) return "공부/자격증";
  return "기타";
};

const inferDestination = (section = "") => {
  if (/캘린더\/루틴|캘린더.*체크|루틴/.test(section)) return "캘린더/루틴";
  if (/체크리스트/.test(section)) return "체크리스트";
  if (/시트/.test(section)) return "시트";
  return "캘린더/메모";
};

const sections = md.split(/^## (?=\d+\. )/m).slice(1).map((section) => {
  const [headingLine, ...bodyLines] = section.split(/\r?\n/);
  const heading = headingLine.trim();
  const headingMatch = heading.match(/^(\d+)\.\s*(.+)$/);
  const no = Number(headingMatch?.[1] || 0);
  const title = headingMatch?.[2] || heading;
  const body = bodyLines.join("\n");
  const original = extractField(body, "원문");
  const source = sourceFromOriginal(original);
  const actionBlock = extractListField(body, ["캘린더/루틴", "캘린더", "체크리스트", "시트"]);

  return {
    id: `flow-${String(no).padStart(2, "0")}-${slugify(title)}`,
    no,
    title,
    category: inferCategory(title),
    destination: inferDestination(body),
    expectedScore: tableScores.get(no) || null,
    creator: extractField(body, "제작자/출처"),
    originalTitle: source.title,
    originalUrl: source.url,
    sourceSignal: extractField(body, "원문 실행 신호"),
    flowTitle: extractField(body, "Flow 제목").replace(/^`|`$/g, ""),
    cta: extractField(body, "CTA").replace(/^`|`$/g, ""),
    inputs: extractField(body, "입력"),
    actionLabel: actionBlock.label,
    actions: actionBlock.value,
    memo: extractField(body, "메모"),
    completion: extractField(body, "완료 기준"),
    reviewMemo: extractField(body, "평가 메모"),
  };
});

const dataJson = JSON.stringify(sections).replace(/</g, "\\u003c");
const generatedAt = new Date().toISOString();

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>한글 원문 기반 Flow 후보 30개 리뷰</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --panel: #ffffff;
      --ink: #111827;
      --muted: #5b6472;
      --line: #dfe4eb;
      --soft: #f1f5f9;
      --blue: #1d4ed8;
      --blue-soft: #eff6ff;
      --green: #047857;
      --green-soft: #ecfdf5;
      --amber: #b45309;
      --amber-soft: #fffbeb;
      --red: #b91c1c;
      --red-soft: #fef2f2;
      --shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 10px 28px rgba(15, 23, 42, 0.06);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.55;
      letter-spacing: 0;
    }
    a { color: var(--blue); text-decoration: none; }
    a:hover { text-decoration: underline; }
    button, input, textarea, select { font: inherit; }
    .page {
      max-width: 1180px;
      margin: 0 auto;
      padding: 24px 18px 80px;
    }
    .hero {
      display: grid;
      gap: 16px;
      grid-template-columns: minmax(0, 1fr);
      margin-bottom: 18px;
    }
    .hero h1 {
      margin: 0;
      font-size: clamp(26px, 4vw, 44px);
      line-height: 1.12;
      letter-spacing: 0;
    }
    .hero p {
      margin: 0;
      max-width: 780px;
      color: var(--muted);
      font-size: 15px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin: 18px 0;
    }
    .metric {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      min-height: 82px;
    }
    .metric span {
      display: block;
      color: var(--muted);
      font-size: 12px;
    }
    .metric strong {
      display: block;
      margin-top: 5px;
      font-size: 24px;
      line-height: 1.1;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: grid;
      grid-template-columns: 1.4fr repeat(3, minmax(130px, 0.55fr));
      gap: 8px;
      align-items: center;
      background: rgba(246, 247, 249, 0.92);
      border-bottom: 1px solid var(--line);
      padding: 10px 0;
      backdrop-filter: blur(12px);
    }
    .toolbar input,
    .toolbar select {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      padding: 10px 11px;
      min-height: 42px;
    }
    .toolbar button,
    .review-actions button,
    .source-open,
    .utility-button {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      padding: 9px 11px;
      min-height: 38px;
      cursor: pointer;
    }
    .toolbar button.primary,
    .review-actions button.primary {
      border-color: #1d4ed8;
      background: #2563eb;
      color: #fff;
    }
    .layout {
      display: grid;
      grid-template-columns: 250px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
      margin-top: 16px;
    }
    .side {
      position: sticky;
      top: 78px;
      display: grid;
      gap: 10px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 13px;
      box-shadow: var(--shadow);
    }
    .panel h2 {
      margin: 0 0 8px;
      font-size: 15px;
    }
    .score-guide {
      display: grid;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
      color: var(--muted);
      font-size: 12px;
    }
    .score-guide li {
      display: grid;
      grid-template-columns: 28px minmax(0, 1fr);
      gap: 7px;
      align-items: baseline;
    }
    .toc {
      display: grid;
      gap: 4px;
      max-height: 48vh;
      overflow: auto;
      padding-right: 4px;
    }
    .toc a {
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr) 32px;
      gap: 6px;
      align-items: center;
      border-radius: 6px;
      color: #334155;
      padding: 6px;
      font-size: 12px;
    }
    .toc a:hover { background: var(--soft); text-decoration: none; }
    .toc .toc-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cards {
      display: grid;
      gap: 14px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .card-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: start;
      padding: 16px 16px 12px;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, #fff, #fafbfc);
    }
    .eyebrow {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--soft);
      color: #334155;
      padding: 3px 8px;
      font-size: 12px;
      line-height: 1.35;
      white-space: nowrap;
    }
    .pill.score-5 { border-color: #bbf7d0; background: var(--green-soft); color: var(--green); }
    .pill.score-4 { border-color: #bfdbfe; background: var(--blue-soft); color: var(--blue); }
    .pill.score-3 { border-color: #fde68a; background: var(--amber-soft); color: var(--amber); }
    .card h2 {
      margin: 0;
      font-size: 22px;
      line-height: 1.25;
      letter-spacing: 0;
    }
    .flow-title {
      margin: 7px 0 0;
      color: var(--muted);
      font-size: 14px;
    }
    .source-open {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
    }
    .card-body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 14px;
      padding: 15px 16px 16px;
    }
    .section-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .block {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 11px;
      min-width: 0;
    }
    .block.wide { grid-column: 1 / -1; }
    .block h3 {
      margin: 0 0 6px;
      color: #0f172a;
      font-size: 13px;
    }
    .block p,
    .block li {
      color: #334155;
      font-size: 13px;
    }
    .block p { margin: 0; }
    .block ul {
      margin: 0;
      padding-left: 18px;
    }
    .review-box {
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      background: #f8fbff;
      padding: 12px;
      align-self: start;
    }
    .review-box h3 {
      margin: 0 0 8px;
      font-size: 14px;
    }
    .rating {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 5px;
      margin-bottom: 8px;
    }
    .rating button {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #fff;
      color: #334155;
      padding: 8px 0;
      cursor: pointer;
      font-weight: 700;
    }
    .rating button.active {
      border-color: #1d4ed8;
      background: #2563eb;
      color: #fff;
    }
    .flags {
      display: grid;
      gap: 6px;
      margin: 8px 0;
      color: #334155;
      font-size: 13px;
    }
    .flags label {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    textarea {
      width: 100%;
      min-height: 96px;
      resize: vertical;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      padding: 9px;
    }
    .review-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
      margin-top: 8px;
    }
    .save-state {
      min-height: 18px;
      margin-top: 7px;
      color: var(--muted);
      font-size: 12px;
    }
    .hidden { display: none !important; }
    .empty {
      display: none;
      border: 1px dashed var(--line);
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      color: var(--muted);
      background: #fff;
    }
    .empty.show { display: block; }
    code {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 5px;
      padding: 1px 5px;
      font-size: 0.92em;
    }
    @media (max-width: 920px) {
      .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .toolbar { grid-template-columns: 1fr 1fr; }
      .layout { grid-template-columns: 1fr; }
      .side { position: static; }
      .toc { max-height: none; }
      .card-body { grid-template-columns: 1fr; }
    }
    @media (max-width: 620px) {
      .page { padding: 18px 10px 72px; }
      .summary { grid-template-columns: 1fr 1fr; gap: 8px; }
      .toolbar {
        position: static;
        grid-template-columns: 1fr;
        background: transparent;
        border: 0;
      }
      .side { order: 2; }
      .results { order: 1; }
      .card-head { grid-template-columns: 1fr; padding: 14px 12px 10px; }
      .card-body { padding: 12px; }
      .section-grid { grid-template-columns: 1fr; }
      .block.wide { grid-column: auto; }
      .review-actions { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <h1>한글 원문 기반 Flow 후보 30개 리뷰</h1>
      <p>원문에서 실제 실행 가능한 일정, 루틴, 체크리스트만 얇게 뽑아 Flow 콘텐츠로 만들었을 때 감이 오는지 확인하는 페이지입니다. 점수와 메모는 서버로 열면 저장소의 JSON/MD로 저장되고, 파일로 열면 브라우저에 임시 저장됩니다.</p>
    </section>

    <section class="summary" aria-label="요약">
      <div class="metric"><span>전체 후보</span><strong id="metric-total">30</strong></div>
      <div class="metric"><span>5점 예상 후보</span><strong id="metric-score5">0</strong></div>
      <div class="metric"><span>내 평가 완료</span><strong id="metric-reviewed">0</strong></div>
      <div class="metric"><span>문제 있음 체크</span><strong id="metric-issues">0</strong></div>
    </section>

    <section class="toolbar" aria-label="필터">
      <input id="search" type="search" placeholder="제목, 카테고리, 원문, 실행 항목 검색" />
      <select id="category-filter" aria-label="카테고리 필터"></select>
      <select id="score-filter" aria-label="예상 점수 필터">
        <option value="all">예상 점수 전체</option>
        <option value="5">예상 5점</option>
        <option value="4">예상 4점</option>
        <option value="3">예상 3점</option>
      </select>
      <button id="export-json" type="button">평가 JSON 복사</button>
    </section>

    <section class="layout">
      <aside class="side" aria-label="리뷰 기준">
        <div class="panel">
          <h2>점수 기준</h2>
          <ul class="score-guide">
            <li><strong>5</strong><span>바로 seed/demo Flow 가능</span></li>
            <li><strong>4</strong><span>좋지만 단순화 필요</span></li>
            <li><strong>3</strong><span>주제는 좋지만 구조 보강 필요</span></li>
            <li><strong>2</strong><span>원문 묶음 재구성 필요</span></li>
            <li><strong>1</strong><span>FlowMe에 맞지 않음</span></li>
          </ul>
        </div>
        <div class="panel">
          <h2>후보 바로가기</h2>
          <nav class="toc" id="toc"></nav>
        </div>
      </aside>

      <section class="results">
        <div class="empty" id="empty">조건에 맞는 후보가 없습니다.</div>
        <div class="cards" id="cards"></div>
      </section>
    </section>
  </main>

  <script>
    const FLOW_CANDIDATES = ${dataJson};
    const REVIEW_STORAGE_KEY = "flowme:korean-flow-review-30:v1";
    let reviews = {};
    let canUseApi = location.protocol.startsWith("http");

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const esc = (value = "") => String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const inline = (value = "") => esc(value)
      .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/\\\`([^\\\`]+)\\\`/g, "<code>$1</code>");
    const block = (value = "") => {
      const lines = String(value).split(/\\r?\\n/).map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return "<p>원문에서 확인한 실행 단서가 부족합니다.</p>";
      const listItems = lines.filter((line) => line.startsWith("- "));
      if (listItems.length === lines.length) {
        return "<ul>" + listItems.map((line) => "<li>" + inline(line.slice(2)) + "</li>").join("") + "</ul>";
      }
      return lines.map((line) => "<p>" + inline(line.replace(/^- /, "")) + "</p>").join("");
    };

    const loadLocalReviews = () => {
      try {
        return JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || "{}");
      } catch {
        return {};
      }
    };

    const persistLocalReviews = () => {
      localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews));
    };

    const fetchServerReviews = async () => {
      if (!canUseApi) return;
      try {
        const response = await fetch("/api/reviews", { cache: "no-store" });
        if (!response.ok) throw new Error("server review load failed");
        const data = await response.json();
        reviews = data.reviews || {};
      } catch {
        canUseApi = false;
        reviews = loadLocalReviews();
      }
    };

    const reviewPayloadFromCard = (card) => {
      const flowId = card.dataset.id;
      const candidate = FLOW_CANDIDATES.find((item) => item.id === flowId);
      return {
        flowId,
        title: candidate?.title || flowId,
        rating: Number(card.dataset.rating || 0) || null,
        hasIssue: $(".issue-checkbox", card).checked,
        keepCandidate: $(".keep-checkbox", card).checked,
        memo: $(".memo-input", card).value.trim(),
      };
    };

    const saveReview = async (card) => {
      const payload = reviewPayloadFromCard(card);
      const state = $(".save-state", card);
      reviews[payload.flowId] = { ...payload, updatedAt: new Date().toISOString() };
      persistLocalReviews();
      updateMetrics();
      state.textContent = canUseApi ? "저장 중..." : "브라우저에 임시 저장됨";

      if (!canUseApi) return;
      try {
        const response = await fetch("/api/reviews", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(await response.text());
        state.textContent = "저장소에 저장됨";
      } catch {
        canUseApi = false;
        state.textContent = "서버 저장 실패. 브라우저에 임시 저장됨";
      }
    };

    const renderCard = (candidate) => {
      const review = reviews[candidate.id] || {};
      const card = document.createElement("article");
      card.className = "card";
      card.id = candidate.id;
      card.dataset.id = candidate.id;
      card.dataset.title = candidate.title;
      card.dataset.category = candidate.category;
      card.dataset.score = candidate.expectedScore || "";
      card.dataset.rating = review.rating || "";
      card.innerHTML = \`
        <header class="card-head">
          <div>
            <div class="eyebrow">
              <span class="pill">#\${candidate.no}</span>
              <span class="pill">\${esc(candidate.category)}</span>
              <span class="pill">\${esc(candidate.destination)}</span>
              <span class="pill score-\${candidate.expectedScore}">예상 \${candidate.expectedScore}점</span>
            </div>
            <h2>\${esc(candidate.title)}</h2>
            <p class="flow-title">Flow: \${esc(candidate.flowTitle || candidate.title)} · CTA: \${esc(candidate.cta || "저장하기")}</p>
          </div>
          \${candidate.originalUrl ? \`<a class="source-open" href="\${candidate.originalUrl}" target="_blank" rel="noreferrer">원문 열기</a>\` : ""}
        </header>
        <div class="card-body">
          <div class="section-grid">
            <section class="block">
              <h3>원문/제작자</h3>
              <p>\${inline(candidate.creator || "")}</p>
              <p>\${candidate.originalUrl ? \`<a href="\${candidate.originalUrl}" target="_blank" rel="noreferrer">\${esc(candidate.originalTitle || "원문")}</a>\` : esc(candidate.originalTitle || "")}</p>
            </section>
            <section class="block">
              <h3>원문 실행 신호</h3>
              \${block(candidate.sourceSignal)}
            </section>
            <section class="block wide">
              <h3>\${esc(candidate.actionLabel || "실행 항목")}</h3>
              \${block(candidate.actions)}
            </section>
            <section class="block">
              <h3>입력</h3>
              \${block(candidate.inputs)}
            </section>
            <section class="block">
              <h3>메모에 둘 내용</h3>
              \${block(candidate.memo)}
            </section>
            <section class="block">
              <h3>완료 기준</h3>
              \${block(candidate.completion)}
            </section>
            <section class="block">
              <h3>1차 평가 메모</h3>
              \${block(candidate.reviewMemo || "직접 평가 필요")}
            </section>
          </div>
          <aside class="review-box">
            <h3>내 평가</h3>
            <div class="rating" role="group" aria-label="\${esc(candidate.title)} 점수">
              \${[1, 2, 3, 4, 5].map((score) => \`<button type="button" data-score="\${score}" class="\${Number(review.rating) === score ? "active" : ""}">\${score}</button>\`).join("")}
            </div>
            <div class="flags">
              <label><input class="keep-checkbox" type="checkbox" \${review.keepCandidate ? "checked" : ""} /> 계속 후보로 본다</label>
              <label><input class="issue-checkbox" type="checkbox" \${review.hasIssue ? "checked" : ""} /> 문제 있음</label>
            </div>
            <textarea class="memo-input" placeholder="왜 좋거나 별로인지, 어떤 Flow 형태가 맞는지 적어두기">\${esc(review.memo || "")}</textarea>
            <div class="review-actions">
              <button type="button" class="primary save-button">저장</button>
              <button type="button" class="clear-button">초기화</button>
            </div>
            <div class="save-state">\${review.updatedAt ? "이전 평가 불러옴" : ""}</div>
          </aside>
        </div>
      \`;

      $$(".rating button", card).forEach((button) => {
        button.addEventListener("click", () => {
          card.dataset.rating = button.dataset.score;
          $$(".rating button", card).forEach((item) => item.classList.toggle("active", item === button));
          saveReview(card);
        });
      });
      $(".save-button", card).addEventListener("click", () => saveReview(card));
      $(".clear-button", card).addEventListener("click", () => {
        delete reviews[candidate.id];
        persistLocalReviews();
        card.dataset.rating = "";
        $$(".rating button", card).forEach((item) => item.classList.remove("active"));
        $(".issue-checkbox", card).checked = false;
        $(".keep-checkbox", card).checked = false;
        $(".memo-input", card).value = "";
        $(".save-state", card).textContent = "초기화됨";
        updateMetrics();
      });
      return card;
    };

    const render = () => {
      const cards = $("#cards");
      const toc = $("#toc");
      cards.textContent = "";
      toc.textContent = "";

      const categories = ["all", ...Array.from(new Set(FLOW_CANDIDATES.map((item) => item.category))).sort()];
      $("#category-filter").innerHTML = categories.map((category) => \`<option value="\${category}">\${category === "all" ? "카테고리 전체" : esc(category)}</option>\`).join("");

      FLOW_CANDIDATES.forEach((candidate) => {
        cards.appendChild(renderCard(candidate));
        const link = document.createElement("a");
        link.href = "#" + candidate.id;
        link.innerHTML = \`<span>\${candidate.no}</span><span class="toc-title">\${esc(candidate.title)}</span><span>\${candidate.expectedScore}</span>\`;
        toc.appendChild(link);
      });
      updateMetrics();
      applyFilters();
    };

    const updateMetrics = () => {
      const reviewValues = Object.values(reviews);
      $("#metric-total").textContent = FLOW_CANDIDATES.length;
      $("#metric-score5").textContent = FLOW_CANDIDATES.filter((item) => item.expectedScore === 5).length;
      $("#metric-reviewed").textContent = reviewValues.filter((item) => item.rating || item.memo).length;
      $("#metric-issues").textContent = reviewValues.filter((item) => item.hasIssue).length;
    };

    const applyFilters = () => {
      const query = $("#search").value.trim().toLowerCase();
      const category = $("#category-filter").value;
      const score = $("#score-filter").value;
      let visible = 0;
      $$(".card").forEach((card) => {
        const candidate = FLOW_CANDIDATES.find((item) => item.id === card.dataset.id);
        const haystack = JSON.stringify(candidate).toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const matchesCategory = category === "all" || card.dataset.category === category;
        const matchesScore = score === "all" || card.dataset.score === score;
        const show = matchesQuery && matchesCategory && matchesScore;
        card.classList.toggle("hidden", !show);
        visible += show ? 1 : 0;
      });
      $("#empty").classList.toggle("show", visible === 0);
    };

    const exportReviews = async () => {
      const payload = {
        generatedAt: new Date().toISOString(),
        reviews,
      };
      const text = JSON.stringify(payload, null, 2);
      try {
        await navigator.clipboard.writeText(text);
        $("#export-json").textContent = "복사됨";
        setTimeout(() => ($("#export-json").textContent = "평가 JSON 복사"), 1200);
      } catch {
        const blob = new Blob([text], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "flowme-korean-flow-review-notes.json";
        link.click();
        URL.revokeObjectURL(url);
      }
    };

    $("#search").addEventListener("input", applyFilters);
    $("#category-filter").addEventListener("change", applyFilters);
    $("#score-filter").addEventListener("change", applyFilters);
    $("#export-json").addEventListener("click", exportReviews);

    fetchServerReviews().then(render);
  </script>
  <!-- Source: ${escapeHtml(path.relative(root, sourcePath))}; generated: ${escapeHtml(generatedAt)}; notes: ${escapeHtml(path.relative(root, reviewsPath))} -->
</body>
</html>
`;

fs.writeFileSync(outputPath, html, "utf8");
console.log(`Wrote ${path.relative(root, outputPath)}`);
