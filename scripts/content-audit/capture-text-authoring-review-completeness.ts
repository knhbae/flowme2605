import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, type Page } from "@playwright/test";

const BASE_URL =
  process.env.FLOWME_TEXT_AUTHORING_REVIEW_URL ??
  "http://127.0.0.1:4184/flowme-text-authoring-v2-test.html";
const OUTPUT_DIR = path.resolve(
  process.env.FLOWME_TEXT_AUTHORING_QA_OUTPUT_DIR ??
    "docs/content-audit/2026-08-11-flowme-text-authoring-exception-coverage-v5-results",
);

const viewports = [
  { id: "1440x1000", width: 1440, height: 1000 },
  { id: "900x700", width: 900, height: 700 },
  { id: "899x700", width: 899, height: 700 },
  { id: "390x600", width: 390, height: 600 },
  { id: "390x844", width: 390, height: 844 },
] as const;

type BrowserError = {
  viewport: string;
  kind: "console" | "page" | "request";
  message: string;
};

async function scrollPaneToEnd(page: Page, paneTestId: string) {
  return page.getByTestId(paneTestId).evaluate((pane) => {
    const scroller = pane.querySelector<HTMLElement>(
      "[data-authoring-pane-scroll]",
    );
    if (!scroller) return null;
    scroller.scrollTop = scroller.scrollHeight;
    return {
      clientHeight: scroller.clientHeight,
      scrollHeight: scroller.scrollHeight,
      scrollTop: scroller.scrollTop,
      reachedEnd:
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2,
    };
  });
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ??
      (process.platform === "win32"
        ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
        : undefined),
  });
  const errors: BrowserError[] = [];
  const results: Array<Record<string, unknown>> = [];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.on("console", (message) => {
        if (message.type() === "error") {
          errors.push({
            viewport: viewport.id,
            kind: "console",
            message: message.text(),
          });
        }
      });
      page.on("pageerror", (error) => {
        errors.push({
          viewport: viewport.id,
          kind: "page",
          message: error.message,
        });
      });
      page.on("requestfailed", (request) => {
        errors.push({
          viewport: viewport.id,
          kind: "request",
          message: `${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`,
        });
      });

      const response = await page.goto(BASE_URL, { waitUntil: "networkidle" });
      assert.equal(response?.status(), 200, `${viewport.id}: HTTP 200`);

      const select = page.getByTestId("ta-authoring-example-select");
      await select.waitFor({ state: "visible" });
      const basicCount = await select.locator("[data-example-id]").count();
      const validatedCount = await select
        .locator("[data-example-scenario-id]")
        .count();
      assert.equal(basicCount, 1, `${viewport.id}: basic syntax count`);
      assert.equal(validatedCount, 30, `${viewport.id}: validated count`);
      assert.equal(
        await page.getByTestId("ta-authoring-example-count").textContent(),
        "전체 예시 31개",
      );

      const groupCounts = {
        existingContent: await page
          .getByTestId("ta-authoring-example-category-existing_content")
          .locator("[data-example-scenario-id]")
          .count(),
        change: await page
          .getByTestId("ta-authoring-example-category-condition_change")
          .locator("[data-example-scenario-id]")
          .count(),
        inputFormat: await page
          .getByTestId("ta-authoring-example-category-compatibility")
          .locator("[data-example-scenario-id]")
          .count(),
        handledException: await page
          .getByTestId("ta-authoring-example-category-exception_handling")
          .locator("[data-example-scenario-id]")
          .count(),
        reviewNeeded: await page
          .getByTestId("ta-authoring-example-category-review_needed")
          .count(),
      };
      assert.deepEqual(Object.values(groupCounts), [8, 11, 6, 5, 0]);

      for (const [testId, label] of [
        ["ta-authoring-result-slot-memo", "TXT"],
        ["ta-authoring-result-slot-todo", "할 일"],
        ["ta-authoring-result-slot-calendar", "캘린더"],
        ["ta-authoring-result-slot-sheet", "표·Excel"],
      ] as const) {
        assert.ok(
          ((await page.getByTestId(testId).textContent()) ?? "").includes(
            label,
          ),
          `${viewport.id}: ${label} result slot`,
        );
      }

      let sourceSyncUndoChecked = false;
      let leftToRightSyncChecked = false;
      let sourceOnlyTextChecked = false;
      let copyFallbackChecked = false;
      let recurrenceAndChecklistChecked = false;
      let calendarUiChecked = false;
      let occurrenceParityChecked = false;
      let broaderCoverageChecked = false;
      let sourceFaithfulExampleChecked = false;
      let invalidUrlRepairChecked = false;
      let calendarScreenshot: string | null = null;
      if (viewport.id === "1440x1000") {
        await select.selectOption("qa:change-latest-grammar-showcase");
        const calendarSlot = page.getByTestId(
          "ta-authoring-result-slot-calendar",
        );
        const todoSlot = page.getByTestId("ta-authoring-result-slot-todo");
        const sheetSlot = page.getByTestId("ta-authoring-result-slot-sheet");
        const txtSlot = page.getByTestId("ta-authoring-result-slot-memo");

        await todoSlot.click();
        assert.equal(
          await page.getByTestId("ta-authoring-artifact-row").count(),
          3,
          "todo renders all three finite occurrences",
        );
        assert.match(
          (await page
            .getByTestId("ta-authoring-recurrence-preview-summary")
            .textContent()) ?? "",
          /3\/3회/u,
        );
        assert.equal(
          await page.getByTestId("ta-authoring-preview-subchecks").count(),
          3,
          "each todo occurrence keeps its checklist",
        );
        recurrenceAndChecklistChecked = true;

        await calendarSlot.click();
        assert.equal(
          await page
            .getByTestId("ta-authoring-calendar-month-label")
            .textContent(),
          "2026년 8월",
        );
        assert.equal(
          await page
            .locator(
              '[data-testid="ta-authoring-calendar-day"][data-event-count="1"]',
            )
            .count(),
          3,
          "calendar grid renders all three occurrence dates",
        );
        await page
          .locator(
            '[data-testid="ta-authoring-calendar-day"][data-date="2026-08-10"]',
          )
          .click();
        assert.equal(
          await page
            .getByTestId("ta-authoring-calendar-selected-date")
            .getAttribute("data-date"),
          "2026-08-10",
        );
        assert.equal(
          await page
            .getByTestId("ta-authoring-calendar-selected-list")
            .getByTestId("ta-authoring-artifact-row")
            .count(),
          1,
          "calendar selected day renders its occurrence detail",
        );
        await page.getByTestId("ta-authoring-calendar-next-month").click();
        assert.equal(
          await page
            .getByTestId("ta-authoring-calendar-month-label")
            .textContent(),
          "2026년 9월",
        );
        await page.getByTestId("ta-authoring-calendar-prev-month").click();
        assert.equal(
          await page
            .getByTestId("ta-authoring-calendar-month-label")
            .textContent(),
          "2026년 8월",
        );
        calendarUiChecked = true;
        calendarScreenshot = "browser-calendar-1440x1000.png";
        await page.screenshot({
          path: path.join(OUTPUT_DIR, calendarScreenshot),
          fullPage: false,
        });

        await sheetSlot.click();
        assert.equal(
          await page
            .getByTestId("flow-artifact-sheet-preview")
            .getByTestId("ta-authoring-artifact-row")
            .count(),
          3,
          "sheet renders all three finite occurrences",
        );
        await txtSlot.click();
        const recurrenceText = await page
          .getByTestId("ta-authoring-structured-text-preview")
          .inputValue();
        assert.equal(
          recurrenceText.match(/☐ 정기 자료 확인 · [123]회차/gmu)?.length,
          3,
          "TXT renders all three finite occurrences",
        );
        occurrenceParityChecked = true;

        await select.selectOption("qa:change-daily-repeat-until-date");
        for (const slot of [calendarSlot, todoSlot, sheetSlot, txtSlot]) {
          assert.match((await slot.textContent()) ?? "", /5/u);
        }
        await calendarSlot.click();
        assert.equal(
          await page
            .locator(
              '[data-testid="ta-authoring-calendar-day"][data-event-count="1"]',
            )
            .count(),
          5,
          "daily-until example renders five occurrence dates",
        );

        await select.selectOption("qa:change-same-day-timed-agenda");
        await calendarSlot.click();
        await page
          .locator(
            '[data-testid="ta-authoring-calendar-day"][data-date="2026-08-20"]',
          )
          .click();
        const agendaTexts = await page
          .getByTestId("ta-authoring-calendar-selected-list")
          .getByTestId("ta-authoring-artifact-row")
          .allTextContents();
        assert.deepEqual(
          agendaTexts.map((value) =>
            [
              "행사 안내 확인",
              "참가 등록",
              "발표 세션 참여",
              "네트워킹 메모 정리",
            ].find((title) => value.includes(title)),
          ),
          [
            "행사 안내 확인",
            "참가 등록",
            "발표 세션 참여",
            "네트워킹 메모 정리",
          ],
        );
        broaderCoverageChecked = true;

        await select.selectOption("qa:content-kmooc-14");
        assert.equal(
          await page.getByTestId("ta-authoring-title").inputValue(),
          "Introduction to Data Analysis",
        );
        const kmoocSource = await page
          .getByTestId("ta-authoring-source")
          .inputValue();
        assert.match(kmoocSource, /^# Introduction to Data Analysis/mu);
        assert.doesNotMatch(kmoocSource, /\t/u);
        assert.equal(
          kmoocSource.match(/^- \[ \] /gmu)?.length,
          14,
          "K-MOOC source uses 14 root Flow Items",
        );
        assert.match(kmoocSource, /^  - 주차: /mu);
        assert.match(kmoocSource, /^  - 주차 활동: /mu);
        await page.getByTestId("ta-authoring-result-slot-sheet").click();
        const sheetHead = page
          .getByTestId("flow-artifact-sheet-preview")
          .first()
          .locator("thead");
        assert.match((await sheetHead.textContent()) ?? "", /항목/u);
        assert.match((await sheetHead.textContent()) ?? "", /설명/u);
        assert.doesNotMatch((await sheetHead.textContent()) ?? "", /출처/u);
        assert.equal(
          await page
            .getByTestId("flow-artifact-sheet-preview")
            .getByRole("link")
            .count(),
          0,
        );
        sourceFaithfulExampleChecked = true;
        await select.selectOption("product:simple");
        await page.getByTestId("ta-authoring-result-slot-todo").click();

        const workingSource = page.getByTestId("ta-authoring-source");
        await page
          .getByTestId("public-flow-artifact-preview-row-edit")
          .first()
          .click();
        const inspector = page.getByTestId("ta-authoring-inspector");
        await inspector.getByLabel("제목").fill("브라우저 확인용 제목입니다");
        await inspector
          .getByRole("button", { name: "원문과 결과에 적용" })
          .click();
        assert.match(
          await workingSource.inputValue(),
          /브라우저 확인용 제목입니다/u,
        );
        await workingSource.fill(
          (await workingSource.inputValue()).replace(
            "브라우저 확인용 제목입니다",
            "브라우저 재편집 제목입니다",
          ),
        );
        await page
          .getByTestId("ta-authoring-status")
          .filter({ hasText: "자동 반영했습니다" })
          .waitFor({ state: "attached" });
        assert.match(
          (await page
            .getByTestId("ta-authoring-artifact-row")
            .first()
            .textContent()) ?? "",
          /브라우저 재편집 제목입니다/u,
        );
        leftToRightSyncChecked = true;
        await page
          .getByRole("button", { name: "최근 원문 수정 되돌리기" })
          .click();
        assert.match(
          await workingSource.inputValue(),
          /브라우저 확인용 제목입니다/u,
        );
        sourceSyncUndoChecked = true;
        const txtResult = page.getByTestId("ta-authoring-result-slot-memo");
        await txtResult.click();
        await workingSource.fill(
          [
            "# 브라우저 원문 메모",
            "설명으로 남길 일반 문장입니다.",
            "## 준비",
            "- [ ] 항공권 확인",
            "  - 설명: 출발 시간을 확인합니다.",
          ].join("\n"),
        );
        await page
          .getByTestId("ta-authoring-status")
          .filter({ hasText: "자동 반영했습니다" })
          .waitFor({ state: "attached" });
        assert.equal(await txtResult.getAttribute("aria-pressed"), "true");
        const txt = page.getByTestId("ta-authoring-structured-text-preview");
        await txt.waitFor({ state: "visible" });
        assert.ok(
          (await txt.inputValue()).trim().length > 0,
          "TXT preview is non-empty",
        );
        assert.match(await txt.inputValue(), /\[원문 메모\]/u);
        assert.match(await txt.inputValue(), /1\. ☐ 항공권 확인/u);
        assert.match(
          await txt.inputValue(),
          /설명으로 남길 일반 문장입니다\./u,
        );
        sourceOnlyTextChecked = true;
        await page.evaluate(`
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
              writeText: () => Promise.reject(
                new DOMException("browser QA denial", "NotAllowedError"),
              ),
            },
          });
          Object.defineProperty(document, "execCommand", {
            configurable: true,
            value: (command) => command === "copy",
          });
        `);
        await page.getByTestId("ta-authoring-copy-structured-text").click();
        await page
          .getByText("TXT 전체를 복사했습니다.", { exact: true })
          .waitFor({ state: "visible" });
        copyFallbackChecked = true;

        await workingSource.fill(
          [
            "# URL 확인",
            "## 실행",
            "- [ ] 링크 확인",
            "  - 출처: [잘못된 링크](not-a-url)",
          ].join("\n"),
        );
        await page
          .getByTestId("ta-authoring-memo-validations")
          .waitFor({ state: "visible" });
        assert.equal(
          await page.getByTestId("ta-authoring-result-slot-todo").isDisabled(),
          true,
        );
        await page
          .getByTestId("ta-authoring-memo-validations")
          .getByRole("button", { name: "원문에서 수정" })
          .click();
        await page.waitForFunction(() => {
          const textarea = document.querySelector<HTMLTextAreaElement>(
            '[data-testid="ta-authoring-source"]',
          );
          return Boolean(
            textarea && textarea.selectionEnd > textarea.selectionStart,
          );
        });
        const selectedSource = await workingSource.evaluate((element) => {
          const textarea = element as HTMLTextAreaElement;
          return textarea.value.slice(
            textarea.selectionStart,
            textarea.selectionEnd,
          );
        });
        assert.match(selectedSource, /출처: \[잘못된 링크\]\(not-a-url\)/u);
        invalidUrlRepairChecked = true;
      }

      let inputScroll;
      let resultScroll;
      let mobileFlowSourceChecked = false;
      let lastOperationReachable = false;
      if (viewport.width < 900) {
        await select.selectOption("qa:content-librivox-38");
        const librivoxSource = await page
          .getByTestId("ta-authoring-source")
          .inputValue();
        assert.doesNotMatch(librivoxSource, /\t/u);
        assert.equal(
          librivoxSource.match(/^- \[ \] /gmu)?.length,
          38,
          `${viewport.id}: LibriVox source uses 38 root Flow Items`,
        );
        assert.match(librivoxSource, /^  - 순서: /mu);
        assert.match(librivoxSource, /^  - 재생시간: /mu);
        mobileFlowSourceChecked = true;
        await page.getByTestId("ta-authoring-stage-input").click();
        inputScroll = await scrollPaneToEnd(page, "ta02-390-input");
        await page.getByTestId("ta-authoring-stage-result").click();
        await page.getByTestId("ta-authoring-result-slot-sheet").click();
        resultScroll = await scrollPaneToEnd(page, "ta02-390-result");
        const footer = page.locator(".ta-workspace-footer");
        const primaryAction = footer.locator(".ta-primary-action");
        await primaryAction.waitFor({ state: "visible" });
        const footerBox = await footer.boundingBox();
        const viewportHeight = await page.evaluate(() => window.innerHeight);
        assert.ok(
          footerBox && footerBox.y + footerBox.height <= viewportHeight + 1,
          `${viewport.id}: last primary operation remains reachable`,
        );
        lastOperationReachable = true;
      } else {
        inputScroll = await scrollPaneToEnd(page, "ta02-390-input");
        resultScroll = await scrollPaneToEnd(page, "ta02-390-result");
      }
      assert.equal(
        inputScroll?.reachedEnd,
        true,
        `${viewport.id}: input reaches end`,
      );
      assert.equal(
        resultScroll?.reachedEnd,
        true,
        `${viewport.id}: result reaches end`,
      );

      const overflow = await page.evaluate(() => ({
        body: document.body.scrollWidth - window.innerWidth,
        document: document.documentElement.scrollWidth - window.innerWidth,
      }));
      assert.ok(overflow.body <= 1, `${viewport.id}: body horizontal overflow`);
      assert.ok(
        overflow.document <= 1,
        `${viewport.id}: document horizontal overflow`,
      );

      const screenshot = `browser-${viewport.id}.png`;
      await page.screenshot({
        path: path.join(OUTPUT_DIR, screenshot),
        fullPage: false,
      });
      let mobileCalendarScreenshot: string | null = null;
      let mobileCalendarDetailScreenshot: string | null = null;
      if (viewport.id === "390x844") {
        await select.selectOption("qa:change-latest-grammar-showcase");
        await page.getByTestId("ta-authoring-stage-result").click();
        await page.getByTestId("ta-authoring-result-slot-calendar").click();
        assert.equal(
          await page
            .locator(
              '[data-testid="ta-authoring-calendar-day"][data-event-count="1"]',
            )
            .count(),
          3,
          "390x844: mobile calendar renders all three occurrence dates",
        );
        await page
          .locator(
            '[data-testid="ta-authoring-calendar-day"][data-date="2026-08-10"]',
          )
          .click();
        assert.equal(
          await page
            .getByTestId("ta-authoring-calendar-selected-date")
            .getAttribute("data-date"),
          "2026-08-10",
          "390x844: mobile calendar selects an occurrence date",
        );
        assert.equal(
          await page
            .getByTestId("ta-authoring-calendar-selected-list")
            .getByTestId("ta-authoring-artifact-row")
            .count(),
          1,
          "390x844: mobile selected date renders its occurrence detail",
        );
        mobileCalendarScreenshot = "browser-calendar-390x844.png";
        await page.screenshot({
          path: path.join(OUTPUT_DIR, mobileCalendarScreenshot),
          fullPage: false,
        });
        const calendarDetailScroll = await scrollPaneToEnd(
          page,
          "ta02-390-result",
        );
        assert.equal(
          calendarDetailScroll?.reachedEnd,
          true,
          "390x844: mobile calendar selected-day detail reaches the end",
        );
        mobileCalendarDetailScreenshot = "browser-calendar-detail-390x844.png";
        await page.screenshot({
          path: path.join(OUTPUT_DIR, mobileCalendarDetailScreenshot),
          fullPage: false,
        });
      }
      results.push({
        viewport,
        httpStatus: response?.status(),
        exampleCount: basicCount + validatedCount,
        groupCounts,
        overflow,
        inputScroll,
        resultScroll,
        sourceSyncUndoChecked,
        leftToRightSyncChecked,
        sourceOnlyTextChecked,
        copyFallbackChecked,
        recurrenceAndChecklistChecked,
        calendarUiChecked,
        occurrenceParityChecked,
        broaderCoverageChecked,
        sourceFaithfulExampleChecked,
        invalidUrlRepairChecked,
        calendarScreenshot,
        mobileFlowSourceChecked,
        lastOperationReachable,
        screenshot,
        mobileCalendarScreenshot,
        mobileCalendarDetailScreenshot,
      });
      await context.close();
    }

    const productContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const productPage = await productContext.newPage();
    await productPage.goto(`${BASE_URL}?authoringQa=0`, {
      waitUntil: "networkidle",
    });
    const productSelect = productPage.getByTestId(
      "ta-authoring-example-select",
    );
    const productCount = await productSelect
      .locator("[data-example-id]")
      .count();
    const productQaCount = await productSelect
      .locator("[data-example-scenario-id]")
      .count();
    assert.equal(productCount, 5);
    assert.equal(productQaCount, 0);
    await productContext.close();

    assert.deepEqual(errors, [], "browser errors");
    await writeFile(
      path.join(OUTPUT_DIR, "browser-qa.json"),
      `${JSON.stringify(
        {
          status: "PASS",
          kind: "internal_browser_qa",
          observedUserSessions: 0,
          url: BASE_URL,
          checkedAt: new Date().toISOString(),
          results,
          productEscape: { productCount, validatedCount: productQaCount },
          errors,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  } finally {
    await browser.close();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
