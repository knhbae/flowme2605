import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const base = "docs/content-audit/original-source-review";
const queuePath = `${base}/2026-05-31-original-source-review-queue.json`;
const repairedPath = `${base}/2026-05-31-remaining-source-repairs.json`;

const pdfjsPath =
  "C:/Users/HUBERT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pdfjs-dist/legacy/build/pdf.mjs";
globalThis.DOMMatrix ||= class DOMMatrix {};
globalThis.ImageData ||= class ImageData {};
globalThis.Path2D ||= class Path2D {};
const pdfjs = await import(pathToFileURL(pdfjsPath).href);

const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
const remaining = queue.filter((item) => item.reviewStatus !== "original_readable");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const compact = (text) => String(text || "").replace(/\s+/g, " ").trim();

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    },
    redirect: "follow",
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    finalUrl: response.url,
    buffer,
  };
}

async function pdfText(buffer) {
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableWorker: true,
  });
  const doc = await loadingTask.promise;
  const chunks = [];
  for (let pageNo = 1; pageNo <= Math.min(doc.numPages, 6); pageNo += 1) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    chunks.push(content.items.map((item) => item.str).join(" "));
  }
  return compact(chunks.join("\n"));
}

async function browserText(context, item) {
  const page = await context.newPage();
  const url = item.resolvedOriginalUrl || item.url;
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await sleep(1000);
    const body = compact(await page.locator("body").innerText({ timeout: 5000 }).catch(() => ""));
    const result = {
      id: item.id,
      repaired: body.length > 250,
      method: "browser-ignore-https",
      httpStatus: response?.status() || null,
      finalUrl: page.url(),
      pageTitle: compact(await page.title()),
      headings: await page
        .locator("h1,h2,h3")
        .evaluateAll((nodes) => nodes.map((n) => n.textContent.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 12))
        .catch(() => []),
      textSample: body.slice(0, 5000),
      error: "",
    };
    await page.close();
    return result;
  } catch (error) {
    await page.close().catch(() => {});
    return { id: item.id, repaired: false, method: "browser-ignore-https", error: error.message };
  }
}

async function repairItem(context, item) {
  const url = item.resolvedOriginalUrl || item.url;
  try {
    const fetched = await fetchBuffer(url);
    const looksPdf =
      fetched.contentType.includes("pdf") ||
      url.toLowerCase().includes(".pdf") ||
      fetched.buffer.subarray(0, 4).toString() === "%PDF";
    if (looksPdf) {
      const text = await pdfText(fetched.buffer);
      return {
        id: item.id,
        repaired: text.length > 200,
        method: "fetch-pdfjs",
        httpStatus: fetched.status,
        finalUrl: fetched.finalUrl,
        pageTitle: item.pageTitle || item.title,
        headings: [],
        textSample: text.slice(0, 5000),
        error: "",
      };
    }
    const body = compact(fetched.buffer.toString("utf8"));
    if (fetched.contentType.includes("text/html") && body.length > 250) {
      return {
        id: item.id,
        repaired: true,
        method: "fetch-html",
        httpStatus: fetched.status,
        finalUrl: fetched.finalUrl,
        pageTitle: compact(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || item.title),
        headings: [...body.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((m) => compact(m[1].replace(/<[^>]+>/g, " "))).slice(0, 12),
        textSample: compact(body.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).slice(0, 5000),
        error: "",
      };
    }
  } catch {
    // Continue with browser fallback.
  }
  return browserText(context, item);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  locale: "ko-KR",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
});

const repairs = [];
for (const item of remaining) {
  const repaired = await repairItem(context, item);
  repairs.push(repaired);
  fs.writeFileSync(repairedPath, JSON.stringify(repairs, null, 2), "utf8");
  console.log(`${item.id} ${repaired.repaired ? "repaired" : "unrepaired"} ${repaired.method} ${repaired.pageTitle || repaired.error || ""}`);
}

await browser.close();

const queueById = Object.fromEntries(queue.map((item) => [item.id, item]));
for (const repair of repairs.filter((item) => item.repaired)) {
  const item = queueById[repair.id];
  item.reviewStatus = "original_readable";
  item.reviewStatusLabel = "원문 확인됨(별도 처리)";
  item.pageTitle = repair.pageTitle || item.pageTitle || item.title;
  item.originalSummary = `원문 "${item.pageTitle}"를 별도 방식(${repair.method})으로 확인했다. 본문에서 확인 가능한 주요 단서는 ${(repair.headings || []).slice(0, 4).join(", ") || item.title}이며, Flow 변환 시 원문 링크와 사용자 입력값(${item.inputs || "기준일/대상"})을 함께 보존해야 한다.`;
  item.extraction = {
    accessStatus: "readable",
    httpStatus: repair.httpStatus || null,
    finalUrl: repair.finalUrl || item.resolvedOriginalUrl || item.url,
    headings: repair.headings || [],
    error: "",
  };
  item.resolvedOriginalUrl ||= repair.finalUrl || item.url;
}

fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2), "utf8");
console.log(JSON.stringify({ repaired: repairs.filter((item) => item.repaired).length, total: repairs.length }, null, 2));
