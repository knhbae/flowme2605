import fs from "node:fs";
import { chromium } from "playwright";

const base = "docs/content-audit/original-source-review";
const resolvedPath = `${base}/2026-05-31-resolved-original-candidates.json`;
const outPath = `${base}/2026-05-31-resolved-source-extracts.json`;

const resolved = JSON.parse(fs.readFileSync(resolvedPath, "utf8")).filter((item) => item.selected?.url);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function compact(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function mobileNaverBlogUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "blog.naver.com") return url;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return `https://m.blog.naver.com/${parts[0]}/${parts[1]}`;
    return url;
  } catch {
    return url;
  }
}

async function fetchYouTube(item) {
  const url = item.selected.url;
  const response = await fetch(url, {
    headers: {
      "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    },
  });
  const html = await response.text();
  const jsonMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});/);
  let title = "";
  let description = "";
  let author = "";
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      title = data.videoDetails?.title || "";
      description = data.videoDetails?.shortDescription || "";
      author = data.videoDetails?.author || "";
    } catch {
      // Fall back to meta tags below.
    }
  }
  title ||= compact(html.match(/<meta name="title" content="([^"]+)"/)?.[1] || item.selected.title);
  description ||= compact(html.match(/<meta name="description" content="([^"]+)"/)?.[1] || item.selected.snippet);
  return {
    id: item.id,
    category: item.category,
    title: item.title,
    originalUrl: url,
    resolvedTitle: item.selected.title || title,
    accessStatus: title || description ? "readable" : "thin_or_scripted",
    httpStatus: response.status,
    finalUrl: url,
    pageTitle: title,
    h1: title,
    headings: [title, author].filter(Boolean),
    textSample: compact([title, author, description].filter(Boolean).join("\n")).slice(0, 5000),
    resolver: item.selected.resolver,
    searchQuery: item.searchQuery,
    error: "",
  };
}

async function fetchPage(page, item) {
  const url = item.selected.url;
  const targetUrl = url.includes("blog.naver.com/") ? mobileNaverBlogUrl(url) : url;
  const extract = {
    id: item.id,
    category: item.category,
    title: item.title,
    originalUrl: url,
    resolvedTitle: item.selected.title || "",
    accessStatus: "unknown",
    httpStatus: null,
    finalUrl: "",
    pageTitle: "",
    h1: "",
    headings: [],
    textSample: "",
    resolver: item.selected.resolver,
    searchQuery: item.searchQuery,
    error: "",
  };
  try {
    const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await sleep(900);
    extract.httpStatus = response ? response.status() : null;
    extract.finalUrl = page.url();
    extract.pageTitle = compact(await page.title());
    extract.h1 = compact(await page.locator("h1").first().textContent({ timeout: 1200 }).catch(() => ""));
    extract.headings = await page
      .locator("h1,h2,h3")
      .evaluateAll((nodes) => nodes.map((n) => n.textContent.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 12))
      .catch(() => []);
    const bodyText = compact(await page.locator("body").innerText({ timeout: 5000 }).catch(() => ""));
    extract.textSample = bodyText.slice(0, 5000);
    extract.accessStatus = bodyText.length > 250 ? "readable" : "thin_or_scripted";
  } catch (error) {
    extract.accessStatus = "error";
    extract.error = error.message;
  }
  return extract;
}

const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : [];
const done = new Set(existing.map((item) => item.id));
const next = resolved.filter((item) => !done.has(item.id));
const limitArg = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || next.length);
const batch = next.slice(0, limitArg);
const results = [...existing];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: "ko-KR",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
});
const page = await context.newPage();

for (const item of batch) {
  let extract;
  if (item.selected.url.includes("youtube.com/watch")) {
    extract = await fetchYouTube(item).catch((error) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      originalUrl: item.selected.url,
      resolvedTitle: item.selected.title || "",
      accessStatus: "error",
      error: error.message,
    }));
  } else {
    extract = await fetchPage(page, item);
  }
  results.push(extract);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`${extract.id} ${extract.accessStatus} ${extract.httpStatus || ""} ${extract.pageTitle || extract.resolvedTitle || extract.originalUrl}`);
  await sleep(400);
}

await browser.close();

console.log(JSON.stringify({ extractFile: outPath, processed: batch.length, total: results.length }, null, 2));
