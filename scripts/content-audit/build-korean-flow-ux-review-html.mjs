import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = path.join(root, "docs/content-audit/2026-06-02-korean-flow-content-ux-review.md");
const outputPath = path.join(root, "docs/content-audit/2026-06-02-korean-flow-content-ux-review.html");
const candidatePath = path.join(root, "lib/flow/korean-flow-content-candidates.ts");

const markdown = fs.readFileSync(sourcePath, "utf8");
const candidateSource = fs.readFileSync(candidatePath, "utf8");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const inline = (value = "") =>
  escapeHtml(value)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

const isTableSeparator = (line) => /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());

const renderTable = (lines) => {
  const rows = lines
    .filter((line) => !isTableSeparator(line))
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    );

  const [head, ...body] = rows;
  const isReviewTable = head?.includes("Flow 후보") || head?.includes("판정");
  return [
    `<div class="table-wrap${isReviewTable ? " review-table-wrap" : ""}">`,
    `<table${isReviewTable ? ' id="review-table"' : ""}>`,
    "<thead><tr>",
    ...(head ?? []).map((cell) => `<th>${inline(cell)}</th>`),
    "</tr></thead>",
    "<tbody>",
    ...body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`),
    "</tbody></table></div>",
  ].join("");
};

const renderMarkdown = (source) => {
  const lines = source.split(/\r?\n/);
  const chunks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      chunks.push(`<h1>${inline(line.slice(2).trim())}</h1>`);
      i += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      const text = line.slice(3).trim();
      chunks.push(`<h2 id="${slug(text)}">${inline(text)}</h2>`);
      i += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      const text = line.slice(4).trim();
      chunks.push(`<h3 id="${slug(text)}">${inline(text)}</h3>`);
      i += 1;
      continue;
    }

    if (line.trim().startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i += 1;
      }
      chunks.push(renderTable(tableLines));
      continue;
    }

    if (/^\d+\.\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      chunks.push(`<ol>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ol>`);
      continue;
    }

    if (line.trim().startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i += 1;
      }
      chunks.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (line.trim().startsWith("```")) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      chunks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const paragraph = [line.trim()];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].trim().startsWith("|") &&
      !lines[i].trim().startsWith("- ") &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("```")
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    chunks.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }

  return chunks.join("\n");
};

const slug = (value) =>
  encodeURIComponent(
    String(value)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w가-힣-]/g, ""),
  );

const headings = Array.from(markdown.matchAll(/^##\s+(.+)$/gm)).map((match) => match[1].trim());
const reviewRows = (markdown.match(/^\|\s*\d+\s*\|/gm) || []).length;
const sourceRecords = Array.from(
  candidateSource.matchAll(/title: '([^']+)'[\s\S]*?sourceTitle: '([^']+)'[\s\S]*?sourceUrl: '([^']+)'/g),
).map((match, index) => ({
  no: index + 1,
  title: match[1],
  sourceTitle: match[2],
  sourceUrl: match[3],
}));
const sourceLinks = sourceRecords.length;
const generatedAt = new Date().toISOString();

const body = renderMarkdown(markdown);
const sourceAppendix = `
  <h2 id="${slug("원문 링크 목록")}">원문 링크 목록</h2>
  <p>각 Flow 후보의 원본 콘텐츠를 바로 열어 비교할 수 있도록 후보 데이터에서 원문 링크를 함께 렌더링했다.</p>
  <div class="table-wrap">
    <table>
      <thead><tr><th>No</th><th>Flow 후보</th><th>원문</th></tr></thead>
      <tbody>
        ${sourceRecords
          .map(
            (record) =>
              `<tr><td>${record.no}</td><td>${inline(record.title)}</td><td><a href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noreferrer">${inline(record.sourceTitle)}</a></td></tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </div>
`;

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>한국어 Flow 콘텐츠 31개 원문-UX 적합성 리뷰</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f7fb;
      --panel: #ffffff;
      --ink: #0f172a;
      --muted: #5b6472;
      --line: #dfe5ee;
      --soft: #f1f5f9;
      --blue: #1d4ed8;
      --green: #047857;
      --amber: #b45309;
      --red: #b91c1c;
      --shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 12px 32px rgba(15, 23, 42, 0.07);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.65;
      letter-spacing: 0;
    }
    a { color: var(--blue); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .page {
      max-width: 1240px;
      margin: 0 auto;
      padding: 26px 18px 80px;
    }
    .hero {
      display: grid;
      gap: 18px;
      grid-template-columns: minmax(0, 1fr) 360px;
      align-items: end;
      margin-bottom: 18px;
    }
    .hero h1 {
      margin: 0;
      font-size: clamp(30px, 4.5vw, 54px);
      line-height: 1.08;
      letter-spacing: 0;
    }
    .hero p {
      margin: 12px 0 0;
      max-width: 780px;
      color: var(--muted);
      font-size: 15px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 13px;
      box-shadow: var(--shadow);
    }
    .metric span {
      display: block;
      color: var(--muted);
      font-size: 12px;
    }
    .metric strong {
      display: block;
      margin-top: 4px;
      font-size: 26px;
      line-height: 1.1;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid var(--line);
      background: rgba(245, 247, 251, 0.94);
      backdrop-filter: blur(10px);
    }
    .toolbar input,
    .toolbar button {
      min-height: 42px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      padding: 9px 12px;
      font: inherit;
    }
    .toolbar button {
      cursor: pointer;
      font-weight: 700;
    }
    .layout {
      display: grid;
      grid-template-columns: 260px minmax(0, 1fr);
      gap: 18px;
      align-items: start;
      margin-top: 16px;
    }
    .toc {
      position: sticky;
      top: 74px;
      display: grid;
      gap: 10px;
    }
    .toc-card,
    .content {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
    }
    .toc-card {
      padding: 14px;
    }
    .toc-card h2 {
      margin: 0 0 8px;
      font-size: 15px;
    }
    .toc-card a {
      display: block;
      border-radius: 6px;
      padding: 6px 7px;
      color: #334155;
      font-size: 13px;
    }
    .toc-card a:hover {
      background: var(--soft);
      text-decoration: none;
    }
    .content {
      padding: 24px;
      overflow: hidden;
    }
    .content h1 {
      display: none;
    }
    .content h2 {
      margin: 34px 0 12px;
      padding-top: 6px;
      border-top: 1px solid var(--line);
      font-size: 24px;
      letter-spacing: 0;
    }
    .content h2:first-child,
    .content h2:first-of-type {
      margin-top: 0;
      border-top: 0;
    }
    .content h3 {
      margin: 24px 0 8px;
      font-size: 18px;
    }
    .content p,
    .content li {
      color: #334155;
      font-size: 14px;
    }
    .content code {
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      background: #f8fafc;
      padding: 1px 5px;
      font-size: 0.92em;
    }
    .content pre {
      overflow: auto;
      border: 1px solid #dbeafe;
      border-radius: 8px;
      background: #f8fbff;
      padding: 14px;
    }
    .content pre code {
      border: 0;
      background: transparent;
      padding: 0;
      white-space: pre-wrap;
    }
    .table-wrap {
      overflow: auto;
      margin: 14px 0 22px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 760px;
    }
    th,
    td {
      border-bottom: 1px solid #e5eaf1;
      padding: 10px 11px;
      text-align: left;
      vertical-align: top;
      font-size: 13px;
    }
    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #f8fafc;
      color: #0f172a;
      font-weight: 800;
      white-space: nowrap;
    }
    td {
      color: #334155;
    }
    #review-table th:nth-child(1),
    #review-table td:nth-child(1) {
      width: 48px;
      text-align: right;
      color: #64748b;
      font-weight: 700;
    }
    #review-table th:nth-child(2),
    #review-table td:nth-child(2) {
      min-width: 190px;
      font-weight: 800;
      color: #0f172a;
    }
    #review-table th:nth-child(6),
    #review-table td:nth-child(6) {
      min-width: 170px;
    }
    .hidden-row { display: none; }
    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 12px 0 0;
    }
    .pill {
      border: 1px solid #dbeafe;
      border-radius: 999px;
      background: #eff6ff;
      color: #1d4ed8;
      padding: 4px 9px;
      font-size: 12px;
      font-weight: 700;
    }
    @media (max-width: 920px) {
      .hero { grid-template-columns: 1fr; }
      .layout { grid-template-columns: 1fr; }
      .toc { position: static; }
      .toolbar { position: static; grid-template-columns: 1fr; }
      .content { padding: 16px; }
      .metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 560px) {
      .page { padding: 18px 10px 64px; }
      .hero h1 { font-size: 31px; }
      .metrics { grid-template-columns: 1fr; }
      .content h2 { font-size: 21px; }
      table { min-width: 980px; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div>
        <p class="pill">UX Review HTML</p>
        <h1>한국어 Flow 콘텐츠 31개 원문-UX 적합성 리뷰</h1>
        <p>각 원본 콘텐츠가 Flow 콘텐츠로 어울리는지, 현재 UX/UI가 평가와 저장 맥락을 충분히 보여주는지 디자이너와 사용자 관점에서 정리한 리뷰입니다.</p>
        <div class="pill-row">
          <span class="pill">원문-Flow 적합성</span>
          <span class="pill">사용자 실행성</span>
          <span class="pill">My Flow 적용성</span>
        </div>
      </div>
      <div class="metrics" aria-label="리뷰 요약">
        <div class="metric"><span>리뷰 항목</span><strong>${reviewRows}</strong></div>
        <div class="metric"><span>원문 링크</span><strong>${sourceLinks}</strong></div>
        <div class="metric"><span>생성일</span><strong>6/2</strong></div>
      </div>
    </section>

    <section class="toolbar" aria-label="문서 검색">
      <input id="review-search" type="search" placeholder="Flow 후보, UX 문제, 판정 검색" />
      <button id="clear-search" type="button">검색 초기화</button>
    </section>

    <section class="layout">
      <aside class="toc">
        <div class="toc-card">
          <h2>목차</h2>
          ${headings.map((heading) => `<a href="#${slug(heading)}">${inline(heading)}</a>`).join("")}
        </div>
      </aside>
      <article class="content">
        ${body}
        ${sourceAppendix}
      </article>
    </section>
  </main>
  <script>
    const input = document.querySelector("#review-search");
    const clearButton = document.querySelector("#clear-search");
    const table = document.querySelector("#review-table");
    const rows = table ? Array.from(table.querySelectorAll("tbody tr")) : [];

    function filterRows() {
      const query = input.value.trim().toLowerCase();
      rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        row.classList.toggle("hidden-row", Boolean(query) && !text.includes(query));
      });
    }

    input.addEventListener("input", filterRows);
    clearButton.addEventListener("click", () => {
      input.value = "";
      filterRows();
      input.focus();
    });
  </script>
  <!-- Source: ${escapeHtml(path.relative(root, sourcePath))}; generated: ${escapeHtml(generatedAt)} -->
</body>
</html>
`;

fs.writeFileSync(outputPath, html, "utf8");
console.log(`Wrote ${path.relative(root, outputPath)}`);
