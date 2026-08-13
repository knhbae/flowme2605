import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const ROUTE_TRANSITION_TIMEOUT_MS = 15_000;
const LONG_ITEM_COUNT = 38;

const LONG_SOURCE = [
  "# 긴 체크리스트",
  "## 확인",
  ...Array.from({ length: LONG_ITEM_COUNT }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    const lines = [
      `- [ ] 항목 ${number}`,
      `  - 설명: 항목 ${number} 설명입니다.`,
    ];
    if (index === LONG_ITEM_COUNT - 1) {
      lines.push("  - 날짜: 8월 3일");
    }
    return lines;
  }).flat(),
].join("\n");

const SEMANTIC_SOURCE = [
  "# 일정 준비",
  "## 실행",
  "- [ ] 준비하기",
  "  - 설명: 필요한 내용을 먼저 확인합니다.",
  "  - 날짜: 2026-08-03",
  "  - [ ] 준비물 확인",
  "  - [x] 장소 확인",
  "- [ ] 마무리하기",
  "  - 날짜: 2026-08-10",
].join("\n");

async function clearAuthoringStorage(page: Page) {
  await page.goto("/icon.svg");
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("flow:text-authoring:")) localStorage.removeItem(key);
    }
  });
}

async function openCleanProduct(
  page: Page,
  viewport: { width: number; height: number },
  path = "/flows/new",
) {
  await page.setViewportSize(viewport);
  await clearAuthoringStorage(page);
  await page.goto(path);
  await expect(page.getByTestId("text-authoring-workspace")).toBeVisible();
}

async function enterProductSource(page: Page, title: string, source: string) {
  await page.getByTestId("ta-authoring-title").fill(title);
  await page.getByTestId("ta-authoring-source").fill(source);
  await expect
    .poll(() =>
      page
        .getByTestId("ta-authoring-result-slot-todo")
        .getAttribute("data-eligible"),
    )
    .toBe("true");
}

async function expectLocatorInViewport(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => {
      const box = await locator.boundingBox();
      if (!box) return false;
      const viewport = page.viewportSize();
      if (!viewport) return false;
      return (
        box.y < viewport.height &&
        box.y + box.height > 0 &&
        box.x < viewport.width &&
        box.x + box.width > 0
      );
    })
    .toBe(true);
}

async function expectNoHorizontalOverflow(locator: Locator, context: string) {
  await expect
    .poll(
      () =>
        locator.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      { message: `${context} must not have horizontal overflow` },
    )
    .toBe(true);
}

async function expectFullyInViewport(
  page: Page,
  locator: Locator,
  context: string,
) {
  await locator.scrollIntoViewIfNeeded();
  await expect
    .poll(
      async () => {
        const box = await locator.boundingBox();
        const viewport = page.viewportSize();
        if (!box || !viewport) return null;
        return {
          left: box.x,
          top: box.y,
          right: box.x + box.width,
          bottom: box.y + box.height,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
        };
      },
      { message: `${context} must be fully reachable in the viewport` },
    )
    .toMatchObject({
      left: expect.any(Number),
      top: expect.any(Number),
      right: expect.any(Number),
      bottom: expect.any(Number),
    });

  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box, `${context} must have a rendered box`).not.toBeNull();
  expect(viewport, `${context} must have a viewport`).not.toBeNull();
  expect(box?.x ?? -1, `${context} left edge`).toBeGreaterThanOrEqual(-1);
  expect(box?.y ?? -1, `${context} top edge`).toBeGreaterThanOrEqual(-1);
  expect(
    (box?.x ?? 0) + (box?.width ?? 0),
    `${context} right edge`,
  ).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);
  expect(
    (box?.y ?? 0) + (box?.height ?? 0),
    `${context} bottom edge`,
  ).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);
}

async function expectVisibleTargetsAtLeast44(
  workspace: Locator,
  context: string,
) {
  const targetSelector = [
    "button:not([disabled])",
    "a[href]",
    "select:not([disabled])",
    "textarea:not([disabled])",
    'input:not([disabled]):not([type="checkbox"]):not([type="radio"])',
    "summary",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  const undersized = await workspace
    .locator(targetSelector)
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const htmlElement = element as HTMLElement;
        const style = getComputedStyle(htmlElement);
        const rect = htmlElement.getBoundingClientRect();
        const visible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0 &&
          htmlElement.getClientRects().length > 0;
        if (!visible || (rect.width >= 44 && rect.height >= 44)) return [];
        return [
          {
            tag: htmlElement.tagName.toLowerCase(),
            testId: htmlElement.dataset.testid ?? "",
            name:
              htmlElement.getAttribute("aria-label") ??
              htmlElement.textContent
                ?.trim()
                .replace(/\s+/gu, " ")
                .slice(0, 80) ??
              "",
            width: Math.round(rect.width * 10) / 10,
            height: Math.round(rect.height * 10) / 10,
          },
        ];
      }),
    );
  expect(
    undersized,
    `${context} has interactive targets smaller than 44x44: ${JSON.stringify(undersized)}`,
  ).toEqual([]);
}

async function expectProductDomFreeOfInternalJargon(
  page: Page,
  context: string,
) {
  const workspace = page.getByTestId("text-authoring-workspace");
  await expect(workspace, `${context} workspace`).toBeVisible();
  await expect(
    workspace.locator(
      "[data-scenario-id], [data-fixture-id], [data-fixture-version], [data-parser-version], [data-revision-id]",
    ),
    `${context} internal data attributes`,
  ).toHaveCount(0);
  await expect(
    workspace.getByTestId("ta-authoring-example-count"),
    `${context} QA example count`,
  ).toHaveCount(0);

  const markup = await workspace.evaluate((element) => element.innerHTML);
  expect(markup, `${context} internal markup`).not.toMatch(
    /data-scenario-id|data-fixture-id|fixtureVersion|parserVersion|revisionId/iu,
  );
  const visibleText = await workspace.innerText();
  expect(visibleText, `${context} visible internal jargon`).not.toMatch(
    /\b(?:fixture|parser|revision|scenario|stage)\b|내부 QA|전체 검토 예시|검증 카탈로그/iu,
  );
}

test("390x600 product Todo reaches item 01, item 19, item 38, and selects the last source block", async ({
  page,
}) => {
  await openCleanProduct(page, { width: 390, height: 600 });
  await enterProductSource(page, "긴 체크리스트", LONG_SOURCE);

  const source = page.getByTestId("ta-authoring-source");
  await expect(source).toHaveAttribute("aria-invalid", "true");
  await expect(source).toHaveAttribute(
    "aria-errormessage",
    "text-authoring-source-error",
  );
  await expect(page.locator("#text-authoring-source-error")).toContainText(
    "79행",
  );

  await page.getByTestId("ta-authoring-stage-result").click();
  await expect(page.getByTestId("ta02-390-result")).toHaveAttribute(
    "data-stage-active",
    "true",
  );
  await page.getByTestId("ta-authoring-result-slot-todo").click();

  const rows = page.getByTestId("ta-authoring-artifact-row");
  await expect(rows).toHaveCount(LONG_ITEM_COUNT);
  await expectLocatorInViewport(page, rows.nth(0));
  await expect(rows.nth(0)).toContainText("항목 01");
  const remainingRows = page.getByText(`나머지 ${LONG_ITEM_COUNT - 8}개 보기`, {
    exact: true,
  });
  await expect(remainingRows).toBeVisible();
  await remainingRows.click();
  await expectLocatorInViewport(page, rows.nth(18));
  await expect(rows.nth(18)).toContainText("항목 19");
  await expectLocatorInViewport(page, rows.nth(37));
  await expect(rows.nth(37)).toContainText("항목 38");

  const lastSourceJump = rows
    .nth(37)
    .getByTestId("ta-authoring-preview-source-edit");
  await expectLocatorInViewport(page, lastSourceJump);
  await lastSourceJump.click();

  await expect(page.getByTestId("ta02-390-input")).toHaveAttribute(
    "data-stage-active",
    "true",
  );
  await expect(source).toBeFocused();
  const selectedSource = await source.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
  });
  expect(selectedSource).toContain("- [ ] 항목 38");
  expect(selectedSource).toContain("- 날짜: 8월 3일");
  expect(selectedSource).not.toContain("- [ ] 항목 37");
});

test("product Todo exposes parent and child lists while Calendar days keep chronological accessible labels", async ({
  page,
}) => {
  await openCleanProduct(page, { width: 1024, height: 900 });
  await enterProductSource(page, "일정 준비", SEMANTIC_SOURCE);

  await page.getByTestId("ta-authoring-result-slot-todo").click();
  const todoList = page.getByRole("list", {
    name: "할 일과 하위 확인 항목",
  });
  await expect(todoList).toBeVisible();
  const todoParents = todoList.locator(":scope > li");
  await expect(todoParents).toHaveCount(2);
  await expect(todoParents.nth(0)).toContainText("준비하기");
  const childList = todoParents
    .nth(0)
    .getByTestId("ta-authoring-preview-subchecks")
    .getByRole("list");
  await expect(childList).toBeVisible();
  await expect(childList.getByRole("listitem")).toHaveCount(2);
  await expect(childList.getByRole("listitem").nth(0)).toContainText(
    "준비물 확인",
  );
  await expect(childList.getByRole("listitem").nth(1)).toContainText(
    "장소 확인",
  );

  await page.getByTestId("ta-authoring-result-slot-calendar").click();
  const calendar = page.getByRole("region", {
    name: "월간 캘린더 미리보기",
  });
  await expect(calendar).toBeVisible();
  await expect(
    calendar.getByTestId("ta-authoring-calendar-month-label"),
  ).toHaveText("2026년 8월");
  const monthGrid = calendar.getByRole("group", { name: "2026년 8월" });
  await expect(monthGrid).toBeVisible();

  const augustThird = monthGrid.locator(
    '[data-testid="ta-authoring-calendar-day"][data-date="2026-08-03"]',
  );
  const augustTenth = monthGrid.locator(
    '[data-testid="ta-authoring-calendar-day"][data-date="2026-08-10"]',
  );
  await expect(augustThird).toHaveAccessibleName(
    "8월 3일, 일정 1개, 종일 준비하기",
  );
  await expect(augustTenth).toHaveAccessibleName(
    "8월 10일, 일정 1개, 종일 마무리하기",
  );
  const chronologicalOrder = await monthGrid
    .getByTestId("ta-authoring-calendar-day")
    .evaluateAll((days) =>
      days
        .map((day) => day.getAttribute("data-date"))
        .filter((date): date is string => Boolean(date)),
    );
  expect(chronologicalOrder.indexOf("2026-08-03")).toBeLessThan(
    chronologicalOrder.indexOf("2026-08-10"),
  );
});

test("200% text keeps all eight P0 widths reflowed and both panes and save actions fully reachable", async ({
  page,
}) => {
  test.setTimeout(180_000);

  for (const width of [320, 360, 390, 899, 900, 1024, 1280, 1440]) {
    await test.step(`${width}px at 200% text`, async () => {
      await openCleanProduct(page, {
        width,
        height: width < 900 ? 700 : 900,
      });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
      await enterProductSource(page, "확대 확인", SEMANTIC_SOURCE);

      const documentRoot = page.locator("html");
      const inputPane = page.getByTestId("ta02-390-input");
      const resultPane = page.getByTestId("ta02-390-result");
      await expectNoHorizontalOverflow(documentRoot, `${width}px document`);
      await expectNoHorizontalOverflow(
        inputPane.getByTestId("ta-authoring-input-scroll"),
        `${width}px input pane`,
      );

      if (width < 900) {
        await expect(inputPane).toHaveAttribute("data-stage-active", "true");
        await page.getByTestId("ta-authoring-stage-result").click();
        await expect(resultPane).toHaveAttribute("data-stage-active", "true");
      } else {
        await expect(inputPane).toBeVisible();
        await expect(resultPane).toBeVisible();
      }

      await page
        .getByTestId("ta-authoring-result-slot-todo")
        .click({ timeout: 10_000 });
      const resultScroller = resultPane
        .locator("[data-authoring-pane-scroll]")
        .first();
      await expectNoHorizontalOverflow(
        resultScroller,
        `${width}px result pane`,
      );
      await expectNoHorizontalOverflow(documentRoot, `${width}px document`);

      const saveAction = page.getByTestId(
        width < 900 ? "ta-authoring-save" : "ta-authoring-save-desktop",
      );
      await expectFullyInViewport(page, saveAction, `${width}px save action`);

      if (width < 900) {
        await page.getByTestId("ta-authoring-stage-input").click();
        await expect(inputPane).toHaveAttribute("data-stage-active", "true");
      }
      await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
        SEMANTIC_SOURCE,
      );
    });
  }
});

test("reduced motion limits computed motion to 0.01ms and keeps scrolling automatic", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openCleanProduct(page, { width: 390, height: 844 });
  await enterProductSource(page, "움직임 줄이기", SEMANTIC_SOURCE);
  await page.getByTestId("ta-authoring-stage-result").click();
  await page.getByTestId("ta-authoring-result-slot-todo").click();

  const motionViolations = await page
    .getByTestId("text-authoring-workspace")
    .locator("*")
    .evaluateAll((elements) => {
      const durationToMs = (duration: string) => {
        const value = Number.parseFloat(duration);
        if (!Number.isFinite(value)) return 0;
        return duration.endsWith("ms") ? value : value * 1000;
      };
      const maxDuration = (value: string) =>
        Math.max(
          0,
          ...value.split(",").map((part) => durationToMs(part.trim())),
        );

      return elements.flatMap((element) => {
        const htmlElement = element as HTMLElement;
        const rect = htmlElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return [];
        const style = getComputedStyle(htmlElement);
        const transitionMs = maxDuration(style.transitionDuration);
        const animationMs = maxDuration(style.animationDuration);
        if (transitionMs <= 0.0101 && animationMs <= 0.0101) return [];
        return [
          {
            tag: htmlElement.tagName.toLowerCase(),
            testId: htmlElement.dataset.testid ?? "",
            transitionMs,
            animationMs,
          },
        ];
      });
    });
  expect(
    motionViolations,
    `reduced-motion duration violations: ${JSON.stringify(motionViolations)}`,
  ).toEqual([]);

  const scrollBehaviors = await page.evaluate(() => {
    const scrollers = [
      document.documentElement,
      ...document.querySelectorAll<HTMLElement>(
        '[data-testid="text-authoring-workspace"] [data-authoring-pane-scroll]',
      ),
    ];
    return scrollers
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => ({
        testId: element.getAttribute("data-testid") ?? element.tagName,
        behavior: getComputedStyle(element).scrollBehavior,
      }));
  });
  expect(
    scrollBehaviors.filter(({ behavior }) => behavior !== "auto"),
    `reduced-motion scrollers must use auto: ${JSON.stringify(scrollBehaviors)}`,
  ).toEqual([]);
});

test("390 and 1024 product result states keep every visible non-toggle target at least 44x44", async ({
  page,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1024, height: 900 },
  ]) {
    await test.step(`${viewport.width}px targets`, async () => {
      await openCleanProduct(page, viewport);
      await enterProductSource(page, "조작 크기 확인", SEMANTIC_SOURCE);
      if (viewport.width < 900) {
        await page.getByTestId("ta-authoring-stage-result").click();
      }
      await page.getByTestId("ta-authoring-result-slot-todo").click();
      await expectVisibleTargetsAtLeast44(
        page.getByTestId("text-authoring-workspace"),
        `${viewport.width}px product result`,
      );

      if (viewport.width < 900) {
        await page.getByTestId("ta-authoring-stage-input").click();
      }
      await page.getByTestId("ta-authoring-syntax-guide").click();
      await expect(
        page.getByTestId("ta-authoring-syntax-help-panel"),
      ).toBeVisible();
      await expectVisibleTargetsAtLeast44(
        page.getByTestId("text-authoring-workspace"),
        `${viewport.width}px open syntax help`,
      );
    });
  }
});

test("library, editor, saved draft, receipt, Inspector, and reset dialog keep internal QA jargon out of visible product copy", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openCleanProduct(
    page,
    { width: 1440, height: 900 },
    "/flows/authoring",
  );
  await expectProductDomFreeOfInternalJargon(page, "empty library");

  await page.getByRole("button", { name: "새 콘텐츠", exact: true }).click();
  await expect(page).toHaveURL(/\/flows\/new$/u, {
    timeout: ROUTE_TRANSITION_TIMEOUT_MS,
  });
  await expectProductDomFreeOfInternalJargon(page, "blank editor");

  await enterProductSource(page, "제품 DOM 확인", SEMANTIC_SOURCE);
  await page.getByTestId("ta-authoring-result-slot-todo").click();
  await expectProductDomFreeOfInternalJargon(page, "result editor");

  await page
    .getByTestId("ta-authoring-artifact-row")
    .first()
    .getByTestId("public-flow-artifact-preview-row-edit")
    .click();
  await expect(page.getByTestId("ta-authoring-inspector")).toBeVisible();
  await expectProductDomFreeOfInternalJargon(page, "Inspector");
  await page
    .getByTestId("ta-authoring-inspector")
    .getByRole("button", { name: "닫기" })
    .click();

  await page.getByTestId("ta-authoring-library-toggle").click();
  const resetDialog = page.getByTestId("ta-authoring-reset-dialog");
  await expect(resetDialog).toBeVisible();
  await expectProductDomFreeOfInternalJargon(page, "unsaved reset dialog");
  await resetDialog
    .getByRole("button", { name: "계속 작성", exact: true })
    .click();

  await page.getByTestId("ta-authoring-save-desktop").click();
  const receipt = page.getByTestId("ta-authoring-receipt");
  await expect(receipt).toBeVisible();
  await expect(page).toHaveURL(/\/flows\/authoring\/[^/]+$/u);
  await expectProductDomFreeOfInternalJargon(page, "save receipt");

  await receipt.getByRole("button", { name: "계속 편집", exact: true }).click();
  await expectProductDomFreeOfInternalJargon(page, "saved draft editor");
  await page.getByTestId("ta-authoring-library-toggle").click();
  await expect(page).toHaveURL(/\/flows\/authoring$/u);
  await expectProductDomFreeOfInternalJargon(page, "populated library");

  // Automation-only `data-testid="ta-authoring-stage-*"`,
  // `data-stage-active`, and `data-authoring-pane` are an explicit allowlist.
  // Their English implementation terms still must never appear in visible copy.
});
