import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const OUTPUT_ROOT = path.resolve(
  process.cwd(),
  "docs/content-audit/2026-08-04-flowme-text-authoring-optional-structure-review-results",
);
const VISUAL_ROOT = path.join(OUTPUT_ROOT, "visual-evidence");

const AMBIGUOUS_MEMO = [
  "# 제주 여행 준비",
  "## 예약",
  "- [ ] 항공권 확인",
  "- [ ] 숙소 예약",
  "여행은 여름에 사람이 많습니다.",
].join("\n");

test.describe.configure({ timeout: 120_000 });

async function openCleanAuthoring(
  page: Page,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport);
  await page.goto("/icon.svg");
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("flow:text-authoring:")) localStorage.removeItem(key);
    }
  });
  await page.goto("/flows/new");
  await expect(page.getByTestId("text-authoring-workspace")).toBeVisible();
}

async function capture(page: Page, fileName: string) {
  const filePath = path.join(VISUAL_ROOT, fileName);
  await page.screenshot({
    path: filePath,
    fullPage: false,
    animations: "disabled",
  });
  return path.relative(OUTPUT_ROOT, filePath).replaceAll("\\", "/");
}

test("OSR visual evidence covers two-pane, two-stage, optional review, warning, and scroll", async ({
  page,
}) => {
  await mkdir(VISUAL_ROOT, { recursive: true });
  const runtimeErrors: string[] = [];
  const consoleErrors: string[] = [];
  const consoleErrorDetails: Array<{ text: string; url: string }> = [];
  const failedRequests: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
      consoleErrorDetails.push({
        text: message.text(),
        url: message.location().url,
      });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedRequests.push(`${response.status()} ${response.url()}`);
    }
  });

  const screenshots: string[] = [];
  const checkpoints: Record<string, unknown> = {};

  await openCleanAuthoring(page, { width: 1440, height: 900 });
  await expect(page.getByTestId("ta-osr-1440-two-pane")).toBeVisible();
  await expect(page.getByTestId("ta02-390-input")).toBeVisible();
  await expect(page.getByTestId("ta02-390-result")).toBeVisible();
  await expect(page.getByTestId("ta-authoring-stage-structure")).toHaveCount(0);
  await expect(page.getByTestId("ta-authoring-item-review")).toBeHidden();
  screenshots.push(await capture(page, "osr-01-1440-two-pane.png"));

  const desktopReviewTrigger = page.getByTestId("ta-authoring-item-review-open");
  await desktopReviewTrigger.click();
  const desktopReview = page.getByTestId("ta-authoring-item-review");
  await expect(desktopReview).toBeVisible();
  await expect(desktopReview).toContainText("해석된 항목");
  screenshots.push(await capture(page, "osr-02-1440-item-review-drawer.png"));
  await page.keyboard.press("Escape");
  await expect(desktopReview).toBeHidden();
  await expect(desktopReviewTrigger).toBeFocused();

  await openCleanAuthoring(page, { width: 1024, height: 768 });
  await expect(page.getByTestId("ta-osr-1024-two-pane")).toBeVisible();
  await expect(page.getByTestId("ta02-390-input")).toBeVisible();
  await expect(page.getByTestId("ta02-390-result")).toBeVisible();
  screenshots.push(await capture(page, "osr-03-1024-two-pane.png"));

  await openCleanAuthoring(page, { width: 390, height: 844 });
  await expect(page.getByTestId("ta-authoring-stage-input")).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(page.getByTestId("ta-authoring-stage-structure")).toHaveCount(0);
  screenshots.push(await capture(page, "osr-04-390-input-stage.png"));

  await page.getByTestId("ta-authoring-stage-result").click();
  await expect(page.getByTestId("ta02-390-result")).toBeVisible();
  screenshots.push(await capture(page, "osr-05-390-result-stage.png"));

  const mobileReviewTrigger = page.getByTestId("ta-authoring-item-review-open");
  await mobileReviewTrigger.click();
  const mobileReview = page.getByTestId("ta-authoring-item-review");
  await expect(mobileReview).toBeVisible();
  screenshots.push(await capture(page, "osr-06-390-item-review-sheet.png"));

  await page.getByTestId("ta-authoring-item-review-close").click();
  await expect(mobileReviewTrigger).toBeFocused();
  await page
    .getByTestId("ta-authoring-example-select")
    .selectOption("product:moving");
  await expect(page.getByTestId("ta-authoring-example-select")).toHaveValue(
    "product:moving",
  );
  await mobileReviewTrigger.click();
  await expect(mobileReview).toBeVisible();
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(27);
  const reviewScroller = mobileReview.locator("[data-authoring-dialog-scroll]");
  const reviewScroll = await reviewScroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    };
  });
  expect(reviewScroll.scrollHeight).toBeGreaterThan(reviewScroll.clientHeight);
  expect(reviewScroll.scrollTop).toBeGreaterThan(0);
  await expect(page.getByTestId("ta-authoring-item").last()).toBeVisible();
  screenshots.push(await capture(page, "osr-07-390-item-review-scroll-end.png"));
  await page.getByTestId("ta-authoring-item-review-close").click();
  await expect(mobileReviewTrigger).toBeFocused();

  await page.getByTestId("ta-authoring-stage-input").click();
  await page.getByTestId("ta-authoring-source").fill(AMBIGUOUS_MEMO);
  await expect(page.getByTestId("ta-authoring-issue-card")).toHaveCount(1);
  await page.getByTestId("ta-authoring-stage-result").click();
  const warningSummary = page.getByTestId("ta-authoring-item-review-summary");
  await expect(warningSummary).toHaveAttribute("data-review-needed", "true");
  await expect(page.getByTestId("ta-authoring-item-review-open")).toContainText(
    "확인이 필요한 문장 1개",
  );
  screenshots.push(await capture(page, "osr-08-390-review-warning.png"));
  await page.getByTestId("ta-authoring-item-review-open").click();
  await expect(page.getByTestId("ta-authoring-item-review")).toBeVisible();
  const focusedTestId = await page.evaluate(
    () => document.activeElement?.getAttribute("data-testid") ?? "",
  );
  screenshots.push(await capture(page, "osr-09-390-warning-review-sheet.png"));

  checkpoints.desktop = {
    visiblePaneCount: 2,
    structureStageCount: 0,
    itemReviewDefaultOpen: false,
  };
  checkpoints.tablet = {
    visiblePaneCount: 2,
    marker: "ta-osr-1024-two-pane",
  };
  checkpoints.mobile = {
    stages: ["input", "result"],
    reviewScroll,
    warningReviewNeeded: true,
    initialIssueFocusTestId: focusedTestId,
  };
  checkpoints.viewport = await page.evaluate(() => ({
    horizontalOverflow:
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
    shellScrollTop:
      document.querySelector<HTMLElement>(
        '[data-testid="text-authoring-workspace"]',
      )?.scrollTop ?? 0,
  }));

  const unexpectedFailedRequests = failedRequests.filter(
    (entry) => !entry.endsWith("/favicon.ico"),
  );
  const actionableConsoleErrors = consoleErrors.filter(
    (entry, index) =>
      !(
        entry.includes("Failed to load resource") &&
        (failedRequests.some((request) => request.endsWith("/favicon.ico")) ||
          consoleErrorDetails[index]?.url.endsWith("/favicon.ico"))
      ),
  );
  const evidence = {
    generatedAt: new Date().toISOString(),
    evidenceKind: "internal-browser-qa",
    observedUserSessions: 0,
    route: "/flows/new",
    screenshots,
    checkpoints,
    runtimeErrors,
    consoleErrors,
    consoleErrorDetails,
    failedRequests,
    actionableConsoleErrors,
    unexpectedFailedRequests,
    pass:
      runtimeErrors.length === 0 &&
      actionableConsoleErrors.length === 0 &&
      unexpectedFailedRequests.length === 0 &&
      focusedTestId.startsWith("ta-authoring-issue-"),
  };
  await writeFile(
    path.join(OUTPUT_ROOT, "optional-structure-review-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );

  expect(runtimeErrors).toEqual([]);
  expect(actionableConsoleErrors).toEqual([]);
  expect(unexpectedFailedRequests).toEqual([]);
  expect(focusedTestId).toMatch(/^ta-authoring-issue-/u);
});
