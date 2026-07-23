import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { platformVisuals } from "./platform-service-dossier-visual-data.mjs";

const root = path.resolve(".");
const assetDir = path.join(
  root,
  "docs/content-audit/assets/2026-07-21-flowme-platform-service-dossiers"
);
const logPath = path.join(assetDir, "capture-log.json");
fs.mkdirSync(assetDir, { recursive: true });

const blockedPatterns = [
  /access denied/i,
  /just a moment/i,
  /too many requests/i,
  /unusual traffic/i,
  /enable javascript and cookies/i,
  /this site can.?t be reached/i,
  /페이지를 찾을 수 없습니다/,
  /요청하신 페이지를 찾을 수 없습니다/
];

async function dismissCommonOverlays(page) {
  const buttonPatterns = [
    /accept all/i,
    /accept cookies/i,
    /allow all/i,
    /agree/i,
    /모두 허용/,
    /모두 동의/,
    /동의하고 계속/,
    /^확인$/,
    /^닫기$/,
    /나중에/
  ];
  for (const pattern of buttonPatterns) {
    try {
      const button = page.getByRole("button", { name: pattern }).first();
      if (await button.isVisible({ timeout: 450 })) {
        await button.click({ timeout: 900 });
        await page.waitForTimeout(250);
      }
    } catch {
      // A missing or covered consent control should not block the capture.
    }
  }
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText?.replace(/\s+/g, " ").trim() ?? "";
    const images = [...document.images].filter((image) => image.naturalWidth >= 120 && image.naturalHeight >= 80);
    const links = document.querySelectorAll("a").length;
    const buttons = document.querySelectorAll("button").length;
    return {
      title: document.title,
      textSample: text.slice(0, 500),
      textLength: text.length,
      substantialImages: images.length,
      links,
      buttons
    };
  });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: "ko-KR",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
});

const captureLog = {
  generatedAt: new Date().toISOString(),
  viewport: "1440x900",
  entries: []
};

const onlyName = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1]
  : null;
const previousLog = fs.existsSync(logPath)
  ? JSON.parse(fs.readFileSync(logPath, "utf8"))
  : null;
const selectedVisuals = Object.entries(platformVisuals).filter(
  ([name]) => !onlyName || name === onlyName
);

for (const [name, visual] of selectedVisuals) {
  const page = await context.newPage();
  const entry = {
    name,
    slug: visual.slug,
    requestedUrls: visual.screenUrls,
    status: "failed",
    capturedAt: new Date().toISOString(),
    sourceUrl: visual.screenUrls[0],
    finalUrl: null,
    title: null,
    imagePath: null,
    limitation: null
  };

  if (visual.preferFallback && visual.fallbackAsset) {
    const fallbackPath = path.join(root, "docs/content-audit", visual.fallbackAsset);
    if (fs.existsSync(fallbackPath)) {
      entry.status = "fallback";
      entry.sourceUrl = visual.fallbackSourceUrl ?? entry.sourceUrl;
      entry.finalUrl = entry.sourceUrl;
      entry.title = `${name} 기존 원자료 화면`;
      entry.imagePath = visual.fallbackAsset;
      entry.limitation = "공개 홈의 내용이 비어 있는 환경이라 지정된 원자료 화면 사용";
    }
  }

  if (entry.status === "fallback") {
    captureLog.entries.push(entry);
    console.log(`${entry.status.padEnd(8)} ${name} -> ${entry.imagePath}`);
    await page.close();
    continue;
  }

  for (const url of visual.screenUrls) {
    try {
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });
      await page.waitForTimeout(2800);
      await dismissCommonOverlays(page);
      await page.waitForTimeout(700);

      const inspection = await inspectPage(page);
      const combined = `${inspection.title} ${inspection.textSample}`;
      const blocked = blockedPatterns.some((pattern) => pattern.test(combined));
      const sparse = inspection.textLength < 80 && inspection.substantialImages < 1;

      if (blocked || sparse || (response && response.status() >= 400)) {
        entry.limitation = blocked
          ? `접근 차단 화면 감지: ${inspection.title || url}`
          : `공개 화면의 내용이 충분하지 않음: HTTP ${response?.status() ?? "unknown"}`;
        continue;
      }

      const imageName = `${visual.slug}.jpg`;
      const imagePath = path.join(assetDir, imageName);
      await page.screenshot({
        path: imagePath,
        type: "jpeg",
        quality: 84,
        fullPage: false,
        animations: "disabled"
      });

      entry.status = "captured";
      entry.sourceUrl = url;
      entry.finalUrl = page.url();
      entry.title = inspection.title;
      entry.imagePath = `./assets/2026-07-21-flowme-platform-service-dossiers/${imageName}`;
      entry.pageSignals = {
        textLength: inspection.textLength,
        substantialImages: inspection.substantialImages,
        links: inspection.links,
        buttons: inspection.buttons
      };
      entry.limitation = null;
      break;
    } catch (error) {
      entry.limitation = `${error.name}: ${String(error.message).split("\n")[0]}`;
    }
  }

  if (entry.status !== "captured" && visual.fallbackAsset) {
    const fallbackPath = path.join(root, "docs/content-audit", visual.fallbackAsset);
    if (fs.existsSync(fallbackPath)) {
      entry.status = "fallback";
      entry.imagePath = visual.fallbackAsset;
      entry.sourceUrl = visual.fallbackSourceUrl ?? entry.sourceUrl;
      entry.finalUrl = entry.sourceUrl;
      entry.title = `${name} 기존 원자료 화면`;
      entry.limitation = `${entry.limitation ?? "공개 화면 캡처 실패"}; 기존 공식 근거 화면 사용`;
    }
  }

  captureLog.entries.push(entry);
  console.log(`${entry.status.padEnd(8)} ${name} -> ${entry.imagePath ?? entry.limitation}`);
  await page.close();
}

await context.close();
await browser.close();
if (onlyName && previousLog?.entries) {
  const replacement = captureLog.entries[0];
  captureLog.entries = Object.keys(platformVisuals).map((name) =>
    name === onlyName
      ? replacement
      : previousLog.entries.find((entry) => entry.name === name)
  ).filter(Boolean);
}
fs.writeFileSync(logPath, JSON.stringify(captureLog, null, 2), "utf8");

const summary = captureLog.entries.reduce((counts, entry) => {
  counts[entry.status] = (counts[entry.status] ?? 0) + 1;
  return counts;
}, {});
console.log(JSON.stringify({ logPath: path.relative(root, logPath), summary }, null, 2));
