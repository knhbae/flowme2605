import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const playwright = (() => {
  try {
    return require("playwright");
  } catch (error) {
    const sharedPath = process.env.FLOWME_PLAYWRIGHT_PATH
      ?? path.join(path.dirname(path.dirname(repoRoot)), "flow-mvp/node_modules/playwright");
    return require(sharedPath);
  }
})();
const { chromium } = playwright;
const v4DataPath = path.join(
  repoRoot,
  "docs/content-audit/2026-07-18-url-to-flow-value-uplift-v4/report-data.json",
);
const outDir = path.join(
  repoRoot,
  "docs/content-audit/2026-07-19-url-to-flow-p0-ten-url-benchmark",
);
const outPath = path.join(outDir, "source-snapshots.json");

const focusTermsByCase = {
  "case-01": ["검진 절차", "대상자 선정", "검진항목", "결과통보", "검진기간"],
  "case-02": ["먼지거름 필터 청소 방법", "4주에 1회", "진공청소기", "중성세제", "그늘"],
  "case-03": ["준비물 리스트 미리보기", "필수 준비물", "있으면 유용한 준비물", "숙소에 체크", "짐싸는 팁"],
  "case-04": ["구직자 취업지원 서비스", "지원대상", "지원 내용", "신청", "취업지원"],
  "case-05": ["강좌 운영 계획", "주차명", "학습목표", "운영방법", "퀴즈"],
  "case-06": ["백종원의 요리비책", "동영상", "재생목록"],
  "case-07": ["구매계획수립", "매물 검색", "차량직접 확인", "계약 / 이전", "이전 완료 여부"],
  "case-08": ["검진 절차", "대상자 선정", "검진시기", "문진", "발달평가"],
  "case-09": ["30-Day Photo Challenge", "Day 1", "Day 30", "challenge"],
  "case-10": ["정기검사", "검사 유효기간", "검사기간", "과태료", "검사항목"],
};

const compact = (value) => String(value ?? "").replace(/\r/g, "").replace(/[\t ]+/g, " ").trim();
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");

function selectEvidenceWindows(lines, terms, radius = 3) {
  const indexes = new Set();
  for (const term of terms) {
    const needle = term.toLocaleLowerCase("ko-KR");
    lines.forEach((line, index) => {
      if (line.toLocaleLowerCase("ko-KR").includes(needle)) {
        for (let i = Math.max(0, index - radius); i <= Math.min(lines.length - 1, index + radius); i += 1) {
          indexes.add(i);
        }
      }
    });
  }
  return [...indexes]
    .sort((a, b) => a - b)
    .slice(0, 180)
    .map((index) => ({ line: index + 1, text: lines[index] }));
}

async function collectPage(page, sourceCase) {
  const url = sourceCase.source.url;
  const startedAt = Date.now();
  let response = null;
  let error = null;
  try {
    response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 35_000 });
    await page.waitForTimeout(1_800);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  const finalUrl = page.url();
  const pageTitle = compact(await page.title().catch(() => ""));
  let headings = await page
    .locator("h1,h2,h3,h4,[role='heading']")
    .evaluateAll((nodes) => nodes.map((node) => node.textContent?.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 120))
    .catch(() => []);
  let imageAlts = await page
    .locator("img[alt]")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("alt")?.trim()).filter(Boolean).slice(0, 160))
    .catch(() => []);
  let bodyText = compact(await page.locator("body").innerText({ timeout: 8_000 }).catch(() => ""));
  let htmlFallback = null;
  if (bodyText.length < 500) {
    try {
      const fallbackResponse = await fetch(url, {
        headers: {
          "accept-language": "ko-KR,ko;q=0.9,en;q=0.7",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        },
      });
      const html = await fallbackResponse.text();
      htmlFallback = { httpStatus: fallbackResponse.status, htmlLength: html.length };
      if (html.length > 1_000) {
        const staticHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
        await page.setContent(staticHtml, { waitUntil: "domcontentloaded", timeout: 20_000 });
        const fallbackInnerText = await page.locator("body").innerText({ timeout: 8_000 }).catch(() => "");
        const fallbackTextContent = await page.locator("body").textContent({ timeout: 8_000 }).catch(() => "");
        bodyText = compact(fallbackInnerText || fallbackTextContent || bodyText);
        headings = await page
          .locator("h1,h2,h3,h4,[role='heading']")
          .evaluateAll((nodes) => nodes.map((node) => node.textContent?.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 120))
          .catch(() => headings);
        imageAlts = await page
          .locator("img[alt]")
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("alt")?.trim()).filter(Boolean).slice(0, 160))
          .catch(() => imageAlts);
      }
    } catch (fallbackError) {
      htmlFallback = {
        httpStatus: null,
        htmlLength: 0,
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      };
    }
  }
  const bodyLines = bodyText.split("\n").map(compact).filter(Boolean);

  let playlistItems = [];
  if (sourceCase.caseId === "case-06") {
    playlistItems = await page
      .locator("ytd-playlist-video-renderer a#video-title")
      .evaluateAll((nodes) => nodes.slice(0, 40).map((node) => ({
        title: node.textContent?.replace(/\s+/g, " ").trim() ?? "",
        url: node.href ?? "",
      })).filter((entry) => entry.title))
      .catch(() => []);
  }

  const selectedLines = selectEvidenceWindows(bodyLines, focusTermsByCase[sourceCase.caseId] ?? []);
  const accessDenied = /access denied|you don't have permission to access/i.test(bodyText);
  const accessStatus = accessDenied
    ? "blocked_by_source"
    : error
    ? "error"
    : bodyText.length >= 500 || playlistItems.length > 0
      ? "readable"
      : bodyText.length > 0
        ? "thin_or_scripted"
        : "unusable";

  return {
    caseId: sourceCase.caseId,
    title: sourceCase.title,
    source: sourceCase.source,
    requestedUrl: url,
    finalUrl,
    capturedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    httpStatus: response?.status() ?? null,
    accessStatus,
    error,
    htmlFallback,
    pageTitle,
    headings,
    imageAlts,
    playlistItems,
    selectedLines,
    bodyTextSample: bodyText.slice(0, 24_000),
    bodyTextLength: bodyText.length,
    bodyTextSha256: sha256(bodyText),
    extractionNote: "Browser text snapshot only; model lanes must quote exact selected/body text and may hold when the page is incomplete.",
  };
}

const reportData = JSON.parse(await fs.readFile(v4DataPath, "utf8"));
const cases = reportData.extractedContent.cases
  .filter((entry) => /^case-(0[1-9]|10)$/.test(entry.auditCaseId))
  .map((entry) => ({
    caseId: entry.auditCaseId,
    title: entry.title,
    userJob: entry.userJob,
    source: entry.source,
  }));

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: "ko-KR",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();
const snapshots = [];

for (const sourceCase of cases) {
  const snapshot = await collectPage(page, sourceCase);
  snapshots.push(snapshot);
  process.stdout.write(`${snapshot.caseId} ${snapshot.accessStatus} ${snapshot.httpStatus ?? "-"} ${snapshot.bodyTextLength}\n`);
}

await browser.close();
const output = {
  schemaVersion: "flowme-url-source-snapshots-v1.0",
  capturedAt: new Date().toISOString(),
  captureMethod: "Playwright Chromium DOM text, headings, image alt text, focused line windows",
  caseCount: snapshots.length,
  snapshotOrExplicitFailureCount: snapshots.filter((entry) => entry.accessStatus).length,
  snapshots,
};
await fs.writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
process.stdout.write(`${outPath}\n`);
