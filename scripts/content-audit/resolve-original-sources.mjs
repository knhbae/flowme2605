import fs from "node:fs";

const base = "docs/content-audit/original-source-review";
const queuePath = `${base}/2026-05-31-original-source-review-queue.json`;
const outPath = `${base}/2026-05-31-resolved-original-candidates.json`;

const reviews = JSON.parse(fs.readFileSync(queuePath, "utf8"));
const unresolved = reviews.filter((r) => r.reviewStatus === "needs_original_source_selection");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function queryFromUrl(url) {
  const parsed = new URL(url);
  return parsed.searchParams.get("search_query") || parsed.searchParams.get("query") || parsed.searchParams.get("q") || "";
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\u003C/g, "<")
    .replace(/\\u003E/g, ">")
    .replace(/\\u0026/g, "&")
    .replace(/\\"/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeJsString(value) {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`);
  } catch {
    return value;
  }
}

function decodeDuckUrl(url) {
  try {
    const parsed = new URL(url, "https://duckduckgo.com");
    const uddg = parsed.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : parsed.href;
  } catch {
    return url;
  }
}

function isBadCandidate(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    return [
      "google.com",
      "bing.com",
      "duckduckgo.com",
      "search.naver.com",
      "academic.naver.com",
      "in.naver.com",
      "keep.naver.com",
      "help.naver.com",
      "youtube.com",
      "m.youtube.com",
    ].includes(host) && !parsed.pathname.startsWith("/watch");
  } catch {
    return true;
  }
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    if (!candidate.url || isBadCandidate(candidate.url)) return false;
    const key = candidate.url.replace(/[#?].*$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    },
  });
  const text = await response.text();
  return { status: response.status, text };
}

async function searchDuckDuckGo(query) {
  const { text, status } = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
  const candidates = [];
  const pattern = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  for (const match of text.matchAll(pattern)) {
    candidates.push({
      url: decodeDuckUrl(match[1]),
      title: cleanText(match[2]),
      snippet: cleanText(match[3]),
      resolver: "duckduckgo",
      status,
    });
  }
  if (!candidates.length) {
    const simple = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    for (const match of text.matchAll(simple)) {
      candidates.push({
        url: decodeDuckUrl(match[1]),
        title: cleanText(match[2]),
        snippet: "",
        resolver: "duckduckgo",
        status,
      });
    }
  }
  return uniqueCandidates(candidates).slice(0, 5);
}

async function searchBing(query) {
  const { text, status } = await fetchText(`https://www.bing.com/search?q=${encodeURIComponent(query)}`);
  const candidates = [];
  const pattern = /<li class="b_algo"[\s\S]*?<h2[^>]*>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<p[^>]*>([\s\S]*?)<\/p>)?/g;
  for (const match of text.matchAll(pattern)) {
    candidates.push({
      url: match[1],
      title: cleanText(match[2]),
      snippet: cleanText(match[3] || ""),
      resolver: "bing",
      status,
    });
  }
  return uniqueCandidates(candidates).slice(0, 5);
}

async function searchBrave(query) {
  const { text, status } = await fetchText(`https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`);
  const candidates = [];
  const pattern =
    /title:"((?:\\.|[^"\\])*)",url:"(https?:\/\/(?:\\.|[^"\\])*)",full_title:(?:void 0|"((?:\\.|[^"\\])*)"),description:"((?:\\.|[^"\\])*)"/g;
  for (const match of text.matchAll(pattern)) {
    candidates.push({
      url: decodeJsString(match[2]),
      title: cleanText(decodeJsString(match[3] || match[1])),
      snippet: cleanText(decodeJsString(match[4] || "")),
      resolver: "brave",
      status,
    });
  }
  return uniqueCandidates(candidates).slice(0, 5);
}

async function searchNaver(query, where = "web") {
  const { text, status } = await fetchText(
    `https://search.naver.com/search.naver?where=${where}&query=${encodeURIComponent(query)}`,
  );
  const candidates = [];
  const urlPattern = /https:\/\/blog\.naver\.com\/[A-Za-z0-9_.-]+\/\d+/g;
  for (const match of text.matchAll(urlPattern)) {
    candidates.push({
      url: match[0],
      title: "",
      snippet: "",
      resolver: `naver_${where}`,
      status,
    });
  }
  const webPattern = /href="(https?:\/\/(?!search\.naver\.com|ssl\.pstatic\.net|search\.pstatic\.net)[^"]+)"[^>]*>[\s\S]{0,500}?<span[^>]*>([\s\S]*?)<\/span>/g;
  for (const match of text.matchAll(webPattern)) {
    candidates.push({
      url: match[1].replace(/&amp;/g, "&"),
      title: cleanText(match[2]),
      snippet: "",
      resolver: `naver_${where}`,
      status,
    });
  }
  return uniqueCandidates(candidates).slice(0, 5);
}

function extractTextRuns(node) {
  if (!node) return "";
  if (typeof node.simpleText === "string") return node.simpleText;
  if (Array.isArray(node.runs)) return node.runs.map((run) => run.text || "").join("");
  return "";
}

function walkVideoRenderers(node, results = []) {
  if (!node || typeof node !== "object") return results;
  if (node.videoRenderer?.videoId) {
    const renderer = node.videoRenderer;
    results.push({
      url: `https://www.youtube.com/watch?v=${renderer.videoId}`,
      title: extractTextRuns(renderer.title),
      snippet: extractTextRuns(renderer.detailedMetadataSnippets?.[0]?.snippet) || extractTextRuns(renderer.descriptionSnippet),
      channel: extractTextRuns(renderer.ownerText),
      resolver: "youtube",
    });
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === "object") walkVideoRenderers(value, results);
  }
  return results;
}

async function searchYouTube(query) {
  const { text, status } = await fetchText(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
  const jsonMatch = text.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
  if (!jsonMatch) return [];
  try {
    const data = JSON.parse(jsonMatch[1]);
    return uniqueCandidates(walkVideoRenderers(data).map((x) => ({ ...x, status }))).slice(0, 5);
  } catch {
    return [];
  }
}

async function resolveReview(review) {
  const query = queryFromUrl(review.url);
  const candidates = [];
  if (review.sourceKind === "youtube_search_candidate") {
    candidates.push(...(await searchYouTube(query)));
    if (!candidates.length) candidates.push(...(await searchBrave(`site:youtube.com/watch ${query}`)));
    if (!candidates.length) candidates.push(...(await searchDuckDuckGo(`site:youtube.com/watch ${query}`)));
  } else if (review.sourceKind === "naver_blog_search_candidate") {
    candidates.push(...(await searchNaver(query, "blog")));
    if (!candidates.length) candidates.push(...(await searchBrave(`site:blog.naver.com ${query}`)));
    if (!candidates.length) candidates.push(...(await searchDuckDuckGo(`site:blog.naver.com ${query}`)));
  } else {
    candidates.push(...(await searchBrave(query)));
    if (!candidates.length) candidates.push(...(await searchNaver(query, "web")));
    if (!candidates.length) candidates.push(...(await searchDuckDuckGo(query)));
    if (!candidates.length) candidates.push(...(await searchBing(query)));
  }
  const unique = uniqueCandidates(candidates).slice(0, 5);
  return {
    id: review.id,
    category: review.category,
    title: review.title,
    sourceKind: review.sourceKind,
    searchQuery: query,
    searchUrl: review.url,
    selected: unique[0] || null,
    candidates: unique,
  };
}

const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : [];
const done = new Set(existing.map((item) => item.id));
const next = unresolved.filter((item) => !done.has(item.id));
const limitArg = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || next.length);
const batch = next.slice(0, limitArg);
const results = [...existing];

for (const review of batch) {
  try {
    const resolved = await resolveReview(review);
    results.push(resolved);
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
    console.log(`${review.id} ${resolved.selected ? "resolved" : "no_result"} ${resolved.selected?.url || ""}`);
  } catch (error) {
    const failed = {
      id: review.id,
      category: review.category,
      title: review.title,
      sourceKind: review.sourceKind,
      searchQuery: queryFromUrl(review.url),
      searchUrl: review.url,
      selected: null,
      candidates: [],
      error: error.message,
    };
    results.push(failed);
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
    console.log(`${review.id} error ${error.message}`);
  }
  await sleep(700);
}

console.log(JSON.stringify({ resolvedFile: outPath, processed: batch.length, total: results.length }, null, 2));
