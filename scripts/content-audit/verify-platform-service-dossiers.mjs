import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { platformVisuals } from "./platform-service-dossier-visual-data.mjs";

const root = path.resolve(".");
const reportPath = path.join(
  root,
  "docs/content-audit/2026-07-21-flowme-platform-service-dossiers-ceo-ko.html"
);
const reportUrl = new URL(`file:///${reportPath.replaceAll("\\", "/")}`).href;
const outputDir = path.join(root, "output/playwright/platform-dossiers-2026-07-21");
const expectedSlides = 2 + Object.keys(platformVisuals).length * 3 + 1;
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const targets = [
  ["cover", "cover"],
  ["index", "platform-index"],
  ["github-overview", "platform-github-overview"],
  ["github-lesson", "platform-github-lesson"],
  ["github-wireframe", "platform-github-wireframe"],
  ["product-hunt-overview", "platform-product-hunt-overview"],
  ["today-house-overview", "platform-today-house-overview"],
  ["youtube-overview", "platform-youtube-overview"],
  ["youtube-wireframe", "platform-youtube-wireframe"],
  ["naver-cafe-wireframe", "platform-naver-cafe-wireframe"],
  ["conclusion", "cross-platform-conclusion"]
];
const mobileTargets = new Set([
  "cover",
  "github-overview",
  "github-wireframe",
  "today-house-overview",
  "naver-cafe-wireframe",
  "conclusion"
]);
const results = [];
let failed = false;

for (const config of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 }
]) {
  const page = await browser.newPage({
    viewport: { width: config.width, height: config.height },
    deviceScaleFactor: 1
  });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(reportUrl, { waitUntil: "load" });
  await page.waitForFunction(
    () => [...document.images].every((image) => image.complete),
    null,
    { timeout: 30000 }
  );

  const audit = await page.evaluate(({ expectedSlides, platformSlugs }) => {
    const slides = [...document.querySelectorAll(".slide")];
    const ids = slides.map((slide) => slide.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const brokenImages = [...document.images]
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.getAttribute("src"));
    const overflow = [];

    for (const slide of slides) {
      for (const element of slide.querySelectorAll("*")) {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") continue;
        if (
          element.scrollWidth > element.clientWidth + 2 &&
          style.overflowX !== "auto" &&
          style.overflowX !== "scroll"
        ) {
          overflow.push({
            slide: slide.id,
            tag: element.tagName.toLowerCase(),
            className: String(element.className || "").slice(0, 80),
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 90)
          });
        }
      }
    }

    const platformStructure = platformSlugs.map((slug) => ({
      slug,
      overview: Boolean(document.querySelector(`#platform-${slug}-overview`)),
      lesson: Boolean(document.querySelector(`#platform-${slug}-lesson`)),
      wireframe: Boolean(document.querySelector(`#platform-${slug}-wireframe`))
    }));
    const missingPlatformSlides = platformStructure.filter(
      (entry) => !entry.overview || !entry.lesson || !entry.wireframe
    );
    const sourceLinks = [...document.querySelectorAll(".source-strip a")];
    const serviceScreens = [...document.querySelectorAll(".service-screen img")];
    const replacementCharacters = (document.body.innerText.match(/�/g) ?? []).length;

    return {
      expectedSlides,
      slideCount: slides.length,
      documentWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      brokenImages,
      overflow: overflow.slice(0, 80),
      duplicateIds: [...new Set(duplicateIds)],
      missingPlatformSlides,
      sourceLinkCount: sourceLinks.length,
      serviceScreenCount: serviceScreens.length,
      replacementCharacters,
      slideHeights: slides.map((slide) => ({
        id: slide.id,
        height: Math.round(slide.getBoundingClientRect().height),
        scrollHeight: slide.scrollHeight
      }))
    };
  }, {
    expectedSlides,
    platformSlugs: Object.values(platformVisuals).map((visual) => visual.slug)
  });

  const summary = {
    viewport: config,
    ...audit,
    consoleErrors,
    pageErrors
  };
  results.push(summary);

  if (
    audit.slideCount !== expectedSlides ||
    audit.brokenImages.length ||
    audit.overflow.length ||
    audit.duplicateIds.length ||
    audit.missingPlatformSlides.length ||
    audit.sourceLinkCount !== Object.keys(platformVisuals).length ||
    audit.serviceScreenCount !== Object.keys(platformVisuals).length ||
    audit.replacementCharacters ||
    audit.documentScrollWidth - audit.documentWidth > 1 ||
    consoleErrors.length ||
    pageErrors.length
  ) {
    failed = true;
  }

  for (const [name, id] of targets) {
    if (config.name === "mobile" && !mobileTargets.has(name)) continue;
    const locator = page.locator(`#${id}`);
    if ((await locator.count()) !== 1) {
      failed = true;
      continue;
    }
    await locator.screenshot({
      path: path.join(outputDir, `${config.name}-${name}-element.png`)
    });
  }
  await page.close();
}

await browser.close();
const resultPath = path.join(outputDir, "render-audit.json");
fs.writeFileSync(resultPath, JSON.stringify(results, null, 2), "utf8");

console.log(JSON.stringify(results.map((result) => ({
  viewport: result.viewport.name,
  slideCount: result.slideCount,
  documentOverflow: result.documentScrollWidth - result.documentWidth,
  brokenImages: result.brokenImages.length,
  overflowNodes: result.overflow.length,
  duplicateIds: result.duplicateIds.length,
  missingPlatformSlides: result.missingPlatformSlides.length,
  sourceLinks: result.sourceLinkCount,
  serviceScreens: result.serviceScreenCount,
  consoleErrors: result.consoleErrors.length,
  pageErrors: result.pageErrors.length,
  minSlideHeight: Math.min(...result.slideHeights.map((slide) => slide.height)),
  maxSlideHeight: Math.max(...result.slideHeights.map((slide) => slide.height))
})), null, 2));

if (failed) process.exitCode = 1;
