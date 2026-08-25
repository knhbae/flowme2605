import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

const FLOW_VIEW_STORAGE_PREFIX = "flow:text-authoring:flow-view-ui:v1";
const DESKTOP_EVIDENCE_PATH =
  "docs/content-audit/2026-08-25-flowme-text-authoring-live-editor-examples-hierarchy-results/flow-live-editor-after-1024.png";
const MOBILE_EVIDENCE_PATH =
  "docs/content-audit/2026-08-25-flowme-text-authoring-live-editor-examples-hierarchy-results/flow-live-editor-after-390.png";

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
});

const HAPPY_SOURCE = [
  "# 주간 점검",
  "배경 메모입니다.",
  "## 실행",
  "- [ ] 정기 자료 확인",
  "  - 설명: 이번 주 자료를 확인합니다.",
  "  - 날짜: 2026-08-03",
  "  - 반복: 매주 월요일",
  "  - 반복 종료: 3회",
  "  - [ ] 링크가 열리는지 확인",
].join("\n");

const PLAIN_SOURCE = [
  "회의에서 확인한 일반 메모입니다.",
  "다음 회의 전에 다시 읽습니다.",
].join("\n");

const INVALID_SOURCE = [
  "# 날짜 확인",
  "## 실행",
  "- [ ] 예약일을 확인합니다.",
  "  - 날짜: 8월 3일",
].join("\n");

const LONG_SOURCE = [
  "# 긴 Flow 편집",
  "## 실행",
  ...Array.from({ length: 42 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return [
      `- [ ] 항목 ${number}을 확인합니다.`,
      `  - 설명: 항목 ${number}의 세부 내용을 기록합니다.`,
    ].join("\n");
  }),
  "마지막 일반 원문 문장입니다.",
].join("\n");

async function openStandalone(
  page: Page,
  viewport: { width: number; height: number } = { width: 1024, height: 900 },
) {
  await page.setViewportSize(viewport);
  await page.goto("/");
  await expect(page).toHaveTitle("FlowMe Text Authoring 인라인 Flow 편집 PoC");
  await expect(page.getByTestId("text-authoring-workspace")).toBeVisible();
  await expect(page.getByRole("group", { name: "편집 방식" })).toBeVisible();
  await expect(page.getByTestId("ta-authoring-view-text")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
}

async function enterSource(
  page: Page,
  title: string,
  rawText: string,
  expectedStatus: RegExp,
) {
  const textMode = page.getByTestId("ta-authoring-view-text");
  if ((await textMode.getAttribute("aria-pressed")) !== "true") {
    await textMode.click();
  }
  await page.getByTestId("ta-authoring-title").fill(title);
  const editor = page.getByTestId("ta-authoring-flow-editor-content");
  await editor.focus();
  await page.keyboard.press("Control+A");
  await editor.evaluate((element, source) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", source);
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
  }, rawText);
  await expect.poll(() => readRawSource(page)).toBe(rawText);
  await page.keyboard.press("Control+Home");
  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    expectedStatus,
  );
  await expect(page.getByTestId("ta-authoring-flow-editor")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}

async function switchToFlow(page: Page) {
  await page.getByTestId("ta-authoring-view-flow").click();
  await expect(page.getByTestId("ta-authoring-view-flow")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("ta-authoring-flow-editor")).toBeVisible();
  const editor = page.getByTestId("ta-authoring-flow-editor-content");
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute("aria-label", "Flow 텍스트 편집기");
  await expect(editor).toBeFocused();
  return editor;
}

async function readRawSource(page: Page): Promise<string> {
  const editor = page.getByTestId("ta-authoring-flow-editor-content");
  await editor.focus();
  await page.keyboard.press("Control+A");
  return editor.evaluate((element) => {
    const clipboardData = new DataTransfer();
    element.dispatchEvent(
      new ClipboardEvent("copy", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
    return clipboardData.getData("text/plain");
  });
}

async function expectNoHorizontalOverflow(locator: Locator, context: string) {
  const metrics = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(
    metrics.scrollWidth,
    `${context} must not overflow horizontally`,
  ).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

test("LIVE-H01 · the text editor itself becomes one in-place Flow editor", async ({
  page,
}) => {
  await openStandalone(page);
  await enterSource(page, "주간 점검", HAPPY_SOURCE, /1단계 · 1개 항목/u);

  const resultPane = page.getByTestId("ta02-390-result");
  const resultBefore = await resultPane.evaluate(
    (element) => element.innerHTML,
  );
  const editor = await switchToFlow(page);
  const flow = page.getByTestId("ta-authoring-flow-editor");

  await expect(page.getByTestId("ta-authoring-title")).toBeHidden();
  await expect(flow.locator(".cm-editor")).toHaveCount(1);
  await expect(flow.locator("article, [role='tabpanel']")).toHaveCount(0);
  await expect(flow.getByText(/미리보기|변환|적용/u)).toHaveCount(0);
  // The current first line stays raw; the other valid blocks render in place.
  await expect(editor).toContainText("# 주간 점검");
  await expect(
    flow.locator('[data-flow-block-kind="heading-2"]'),
  ).toContainText("실행");
  await expect(flow.locator('[data-flow-block-kind^="action"]')).toHaveCount(2);
  await expect(flow.locator('[data-flow-block-kind="property"]')).toHaveCount(
    4,
  );
  await expect(flow).toContainText("배경 메모입니다.");
  await expect(page.getByRole("button", { name: /변환|적용/u })).toHaveCount(0);

  expect(await resultPane.evaluate((element) => element.innerHTML)).toBe(
    resultBefore,
  );
  for (const artifact of ["calendar", "todo", "sheet", "memo"] as const) {
    await expect(
      page.getByTestId(`ta-authoring-result-slot-${artifact}`),
    ).toHaveAttribute("data-eligible", "true");
  }

  await page.screenshot({ path: DESKTOP_EVIDENCE_PATH, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(flow).toBeVisible();
  await page.screenshot({ path: MOBILE_EVIDENCE_PATH, fullPage: true });
});

test("LIVE-P01 · view, selection, and scroll stay presentation-only", async ({
  page,
}) => {
  await openStandalone(page);
  await enterSource(page, "표현 상태 분리", LONG_SOURCE, /1단계 · 42개 항목/u);
  await page.waitForTimeout(850);

  const resultPane = page.getByTestId("ta02-390-result");
  const resultBefore = await resultPane.evaluate(
    (element) => element.innerHTML,
  );
  const durableBefore = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("flow:text-authoring:"))
      .sort()
      .map((key) => [key, localStorage.getItem(key)]),
  );

  await switchToFlow(page);
  const flow = page.getByTestId("ta-authoring-flow-editor");
  await flow
    .locator('[data-flow-block-kind="action-checkbox"]')
    .first()
    .click();
  const scroller = flow.locator(".cm-scroller");
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);

  expect(await readRawSource(page)).toBe(LONG_SOURCE);
  expect(await resultPane.evaluate((element) => element.innerHTML)).toBe(
    resultBefore,
  );
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage)
        .filter((key) => key.startsWith("flow:text-authoring:"))
        .sort()
        .map((key) => [key, localStorage.getItem(key)]),
    ),
  ).toEqual(durableBefore);

  const sidecars = await page.evaluate(
    (prefix) =>
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith(prefix))
        .map((key) => JSON.parse(sessionStorage.getItem(key) ?? "{}")),
    FLOW_VIEW_STORAGE_PREFIX,
  );
  const currentSidecars = sidecars.filter((sidecar) => sidecar.mode === "flow");
  expect(currentSidecars).toHaveLength(1);
  expect(currentSidecars[0].selectionEnd).toBeGreaterThan(0);
  expect(currentSidecars[0].flowScrollTop).toBeGreaterThan(0);
});

test("LIVE-E01 · clicking rendered content reveals syntax in place and typing updates right results", async ({
  page,
}) => {
  await openStandalone(page);
  await enterSource(
    page,
    "바로 편집",
    "# 바로 편집\n## 실행\n- [ ] 첫 번째 항목",
    /1단계 · 1개 항목/u,
  );
  const editor = await switchToFlow(page);
  const action = page
    .getByTestId("ta-authoring-flow-editor")
    .locator('[data-flow-block-kind="action-checkbox"]');
  await action.click();
  await expect(editor).toContainText("- [ ] 첫 번째 항목");
  await page.keyboard.press("End");
  await page.keyboard.type(" 수정");
  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    /1단계 · 1개 항목/u,
  );
  await expect(page.getByTestId("ta02-390-result")).toContainText(
    "첫 번째 항목 수정",
  );

  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("- [ ] 두 번째 항목");
  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    /1단계 · 2개 항목/u,
  );
  const sourceAfterEnter = await readRawSource(page);
  expect(sourceAfterEnter).toContain(
    "- [ ] 첫 번째 항목 수정\n- [ ] 두 번째 항목",
  );

  await switchToFlow(page);
  await page.keyboard.press("Home");
  await page.keyboard.press("Backspace");
  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    /1단계 · 1개 항목/u,
  );
  const sourceAfterJoin = await readRawSource(page);
  expect(sourceAfterJoin).toContain(
    "- [ ] 첫 번째 항목 수정- [ ] 두 번째 항목",
  );
});

test("LIVE-T01 · select-all copy, exact paste transaction, and editor undo preserve source authority", async ({
  page,
  context,
}) => {
  await openStandalone(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: new URL(page.url()).origin,
  });
  await enterSource(
    page,
    "복사와 실행 취소",
    HAPPY_SOURCE,
    /1단계 · 1개 항목/u,
  );
  await switchToFlow(page);

  await page.getByTestId("ta-authoring-view-text").click();
  const textEditor = page.getByTestId("ta-authoring-flow-editor-content");
  await expect(textEditor).toHaveAttribute("aria-label", "작업 원문");
  const selectedText = "정기 자료 확인";
  const selectionStart = HAPPY_SOURCE.indexOf(selectedText);
  const selectionEnd = selectionStart + selectedText.length;
  await textEditor.focus();
  await page.keyboard.press("Control+Home");
  for (let line = 0; line < 3; line += 1) {
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Home");
  for (let column = 0; column < 6; column += 1) {
    await page.keyboard.press("ArrowRight");
  }
  await page.keyboard.press("Shift+End");
  await expect
    .poll(() =>
      page.evaluate(
        ({ prefix, start, end }) => {
          return Object.keys(sessionStorage)
            .filter((key) => key.startsWith(prefix))
            .map((key) => JSON.parse(sessionStorage.getItem(key) ?? "{}"))
            .some(
              (candidate) =>
                candidate.mode === "text" &&
                candidate.selectionStart === start &&
                candidate.selectionEnd === end,
            );
        },
        {
          prefix: FLOW_VIEW_STORAGE_PREFIX,
          start: selectionStart,
          end: selectionEnd,
        },
      ),
    )
    .toBe(true);
  const editor = await switchToFlow(page);
  await expect(editor).toContainText("- [ ] 정기 자료 확인");
  await page.getByTestId("ta-authoring-view-text").click();
  const copiedSelection = await textEditor.evaluate((element) => {
    const clipboardData = new DataTransfer();
    element.dispatchEvent(
      new ClipboardEvent("copy", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
    return clipboardData.getData("text/plain");
  });
  expect(copiedSelection).toBe(selectedText);
  await switchToFlow(page);

  await page.keyboard.press("Control+A");
  await page.keyboard.press("Control+C");
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(HAPPY_SOURCE);

  const selectedAfterFileOnlyPaste = await editor.evaluate((element) => {
    const fileOnlyClipboard = new DataTransfer();
    fileOnlyClipboard.items.add(
      new File(["not source text"], "attachment.png", {
        type: "image/png",
      }),
    );
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: fileOnlyClipboard,
      }),
    );

    const copiedSelection = new DataTransfer();
    element.dispatchEvent(
      new ClipboardEvent("copy", {
        bubbles: true,
        cancelable: true,
        clipboardData: copiedSelection,
      }),
    );
    return copiedSelection.getData("text/plain");
  });
  expect(await readRawSource(page)).toBe(HAPPY_SOURCE);
  expect(selectedAfterFileOnlyPaste).toBe(HAPPY_SOURCE);

  const replacement = "# 교체 문서\n## 실행\n- [ ] 붙여 넣은 항목";
  await editor.evaluate((element, value) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", value);
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
  }, replacement);
  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    /1단계 · 1개 항목/u,
  );
  expect(await readRawSource(page)).toBe(replacement);

  await switchToFlow(page);
  await page.keyboard.press("Control+Z");
  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    /1단계 · 1개 항목/u,
  );
  expect(await readRawSource(page)).toBe(HAPPY_SOURCE);

  const mixedEndings = "# 혼합\r\n## 실행\r- [ ] 항목\n";
  await editor.focus();
  await page.keyboard.press("Control+A");
  await editor.evaluate((element, value) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", value);
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
  }, mixedEndings);
  await expect.poll(() => readRawSource(page)).toBe(mixedEndings);
  await page.keyboard.press("Control+Home");
  await switchToFlow(page);
  const mixedAction = page
    .getByTestId("ta-authoring-flow-editor")
    .locator('[data-flow-block-kind="action-checkbox"]');
  await mixedAction.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" 수정");
  await expect
    .poll(() => readRawSource(page))
    .toBe("# 혼합\r\n## 실행\r- [ ] 항목 수정\n");
  await switchToFlow(page);
  await page.keyboard.press("Control+Z");
  await expect.poll(() => readRawSource(page)).toBe(mixedEndings);

  await page.getByTestId("ta-authoring-view-text").click();
  await editor.focus();
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.press("Shift+Control+ArrowLeft");
  const cutText = await editor.evaluate((element) => {
    const clipboardData = new DataTransfer();
    element.dispatchEvent(
      new ClipboardEvent("cut", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
    return clipboardData.getData("text/plain");
  });
  expect(cutText).toBe("항목");
  const cutSource = "# 혼합\r\n## 실행\r- [ ] \n";
  await expect.poll(() => readRawSource(page)).toBe(cutSource);
  await page.keyboard.press("Control+Z");
  await expect.poll(() => readRawSource(page)).toBe(mixedEndings);
  await page.keyboard.press("Control+Shift+Z");
  await expect.poll(() => readRawSource(page)).toBe(cutSource);
  await page.keyboard.press("Control+Z");
  await expect.poll(() => readRawSource(page)).toBe(mixedEndings);
  await page.keyboard.press("Control+Y");
  await expect.poll(() => readRawSource(page)).toBe(cutSource);
  await page.keyboard.press("Control+Z");
  await expect.poll(() => readRawSource(page)).toBe(mixedEndings);
});

test("LIVE-K01 · Enter stays literal and Ctrl+Enter runs the workspace action without mutating source", async ({
  page,
}) => {
  await openStandalone(page);
  await enterSource(
    page,
    "키보드 계약",
    "# 키보드 계약\n## 실행\n- [ ] 첫 항목\n  - 설명: 원래 설명",
    /1단계 · 1개 항목/u,
  );
  const editor = await switchToFlow(page);
  const property = page
    .getByTestId("ta-authoring-flow-editor")
    .locator('[data-flow-block-kind="property"]');
  await property.click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("새 줄");
  await expect
    .poll(() => readRawSource(page))
    .toBe("# 키보드 계약\n## 실행\n- [ ] 첫 항목\n  - 설명: 원래 설명\n새 줄");
  await expect(page.getByTestId("ta-authoring-flow-editor")).toHaveAttribute(
    "aria-busy",
    "false",
  );

  const sourceBeforeShortcut = await readRawSource(page);
  await switchToFlow(page);
  await page.keyboard.press("Control+Enter");
  await expect(page.getByTestId("ta02-390-result")).toHaveAttribute(
    "data-stage-active",
    "true",
  );
  expect(await readRawSource(page)).toBe(sourceBeforeShortcut);
});

test("LIVE-F01 · plain, URL-only, and invalid text never invent new Todo", async ({
  page,
}) => {
  await openStandalone(page);
  for (const scenario of [
    {
      source: PLAIN_SOURCE,
      status: /0단계 · 0개 항목/u,
      actions: 0,
      todoEligible: false,
    },
    {
      source: "https://example.com/source-only",
      status: /0단계 · 0개 항목/u,
      actions: 0,
      todoEligible: false,
    },
    // The explicit action remains an action; only the invalid property stays
    // raw. The editor never invents an additional Todo from the warning.
    {
      source: INVALID_SOURCE,
      status: /1단계 · 1개 항목/u,
      actions: 1,
      todoEligible: true,
    },
  ] as const) {
    await enterSource(page, "안전한 원문", scenario.source, scenario.status);
    await switchToFlow(page);
    const flow = page.getByTestId("ta-authoring-flow-editor");
    await expect(flow).toContainText(scenario.source.split("\n").at(-1) ?? "");
    await expect(flow.locator('[data-flow-block-kind^="action"]')).toHaveCount(
      scenario.actions,
    );
    await expect(flow.getByText(/원문 그대로|확인 필요/u)).toHaveCount(0);
    await expect(
      page.getByTestId("ta-authoring-result-slot-todo"),
    ).toHaveAttribute(
      "data-eligible",
      scenario.todoEligible ? "true" : "false",
    );
    if (scenario.source === INVALID_SOURCE) {
      await page.getByTestId("ta-authoring-product-issue-source").click();
      const editor = page.getByTestId("ta-authoring-flow-editor-content");
      await expect(editor).toBeFocused();
      await expect(editor).toContainText("  - 날짜: 8월 3일");
      await expect(
        page.getByTestId("ta-authoring-source-location-return"),
      ).toBeVisible();
    }
    expect(await readRawSource(page)).toBe(scenario.source);
  }
});

test("LIVE-R01 · reload recovery restores Flow mode, source, selection sidecar, and scroll", async ({
  page,
}) => {
  await openStandalone(page, { width: 1024, height: 760 });
  await enterSource(page, "긴 Flow 편집", LONG_SOURCE, /1단계 · 42개 항목/u);
  await switchToFlow(page);
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Shift+Control+ArrowLeft");
  const editorBeforeReload = page.getByTestId(
    "ta-authoring-flow-editor-content",
  );
  const selectionBeforeReload = await editorBeforeReload.evaluate((element) => {
    const clipboardData = new DataTransfer();
    element.dispatchEvent(
      new ClipboardEvent("copy", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
    return clipboardData.getData("text/plain");
  });
  expect(selectionBeforeReload.length).toBeGreaterThan(0);
  const scroller = page
    .getByTestId("ta-authoring-flow-editor")
    .locator(".cm-scroller");
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect
    .poll(() =>
      page.evaluate(
        (prefix) =>
          Object.keys(sessionStorage)
            .filter((key) => key.startsWith(prefix))
            .map((key) => JSON.parse(sessionStorage.getItem(key) ?? "{}"))
            .some(
              (state) =>
                state.mode === "flow" &&
                state.selectionStart > 0 &&
                state.selectionDirection === "backward" &&
                state.flowScrollTop > 0,
            ),
        FLOW_VIEW_STORAGE_PREFIX,
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const key = Object.keys(localStorage).find((candidate) =>
          candidate.startsWith("flow:text-authoring:drafts:"),
        );
        if (!key) return 0;
        const state = JSON.parse(localStorage.getItem(key) ?? "{}");
        return Object.keys(state.recoveries ?? {}).length;
      }),
    )
    .toBeGreaterThan(0);

  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  const recovery = page.getByRole("region", {
    name: "작성 중이던 초안이 있습니다",
  });
  await expect(recovery).toBeVisible();
  await recovery.getByRole("button", { name: "이어서 편집" }).click();
  await expect(page.getByTestId("ta-authoring-view-flow")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByTestId("ta-authoring-flow-editor-content"),
  ).toBeVisible();
  const restoredSelection = await page
    .getByTestId("ta-authoring-flow-editor-content")
    .evaluate((element) => {
      const clipboardData = new DataTransfer();
      element.dispatchEvent(
        new ClipboardEvent("copy", {
          bubbles: true,
          cancelable: true,
          clipboardData,
        }),
      );
      return clipboardData.getData("text/plain");
    });
  expect(restoredSelection).toBe(selectionBeforeReload);
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  expect(await readRawSource(page)).toBe(LONG_SOURCE);
});

test("LIVE-S01 · explicit save, reload, and draft reopen preserve source and Flow mode", async ({
  page,
}) => {
  await openStandalone(page);
  await enterSource(
    page,
    "저장 후 다시 열기",
    HAPPY_SOURCE,
    /1단계 · 1개 항목/u,
  );
  await switchToFlow(page);
  await page.keyboard.press("Control+End");
  await page.getByTestId("ta-authoring-save-desktop").click();
  const receipt = page.getByTestId("ta-authoring-receipt");
  await expect(receipt).toContainText("초안을 저장했어요");
  await receipt.getByRole("button", { name: "내 콘텐츠" }).click();
  await expect(
    page.getByTestId("ta-authoring-library-row").filter({
      hasText: "저장 후 다시 열기",
    }),
  ).toBeVisible();

  await page.reload();
  await page.getByTestId("ta-authoring-library-toggle").click();
  const savedRow = page.getByTestId("ta-authoring-library-row").filter({
    hasText: "저장 후 다시 열기",
  });
  await expect(savedRow).toBeVisible();
  await savedRow.getByRole("button", { name: "열기" }).click();
  await expect(page.getByTestId("ta-authoring-view-flow")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await readRawSource(page)).toBe(HAPPY_SOURCE);
});

test("LIVE-X01 · equal-source drafts never share editor undo history", async ({
  page,
}) => {
  const sameSource = "# 같은 원문\n## 실행\n- [ ] 같은 항목";
  await openStandalone(page);

  await enterSource(page, "동일 초안 A", sameSource, /1단계 · 1개 항목/u);
  await page.getByTestId("ta-authoring-save-desktop").click();
  await page
    .getByTestId("ta-authoring-receipt")
    .getByRole("button", { name: "내 콘텐츠" })
    .click();
  await page.getByRole("button", { name: "새 콘텐츠" }).click();

  await enterSource(page, "동일 초안 B", sameSource, /1단계 · 1개 항목/u);
  await page.getByTestId("ta-authoring-save-desktop").click();
  await page
    .getByTestId("ta-authoring-receipt")
    .getByRole("button", { name: "내 콘텐츠" })
    .click();

  const draftA = page.getByTestId("ta-authoring-library-row").filter({
    hasText: "동일 초안 A",
  });
  await draftA.getByRole("button", { name: "열기" }).click();
  await page.keyboard.press("Control+Home");
  const editor = await switchToFlow(page);
  const action = page
    .getByTestId("ta-authoring-flow-editor")
    .locator('[data-flow-block-kind="action-checkbox"]');
  await action.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" A흔적");
  for (let index = 0; index < 4; index += 1) {
    await page.keyboard.press("Backspace");
  }
  await expect.poll(() => readRawSource(page)).toBe(sameSource);
  await page.getByTestId("ta-authoring-save-desktop").click();
  await page
    .getByTestId("ta-authoring-receipt")
    .getByRole("button", { name: "내 콘텐츠" })
    .click();

  const draftB = page.getByTestId("ta-authoring-library-row").filter({
    hasText: "동일 초안 B",
  });
  await draftB.getByRole("button", { name: "열기" }).click();
  await switchToFlow(page);
  await page.keyboard.press("Control+Z");
  expect(await readRawSource(page)).toBe(sameSource);
  await page.keyboard.press("Control+Y");
  expect(await readRawSource(page)).toBe(sameSource);
  await expect(editor).toHaveCount(1);
});

test("LIVE-A01 · keyboard mode switching and seven responsive widths keep the live editor reachable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openStandalone(page, { width: 390, height: 844 });
  const textMode = page.getByRole("button", { name: "순수 텍스트" });
  const flowMode = page.getByRole("button", { name: "Flow 편집" });
  await textMode.focus();
  await textMode.press("ArrowRight");
  await expect(flowMode).toHaveAttribute("aria-pressed", "true");
  await expect(flowMode).toBeFocused();
  await flowMode.press("Home");
  await expect(textMode).toBeFocused();
  await expect(textMode).toHaveAttribute("aria-pressed", "true");

  await enterSource(page, "긴 Flow 편집", LONG_SOURCE, /1단계 · 42개 항목/u);
  const liveEditor = await switchToFlow(page);
  const firstRenderedAction = page
    .getByTestId("ta-authoring-flow-editor")
    .locator('[data-flow-block-kind="action-checkbox"]')
    .first();
  const actionBox = await firstRenderedAction.boundingBox();
  expect(actionBox).not.toBeNull();
  const touchSession = await page.context().newCDPSession(page);
  const touchPoint = {
    x: (actionBox?.x ?? 0) + Math.min((actionBox?.width ?? 1) / 2, 24),
    y: (actionBox?.y ?? 0) + (actionBox?.height ?? 1) / 2,
  };
  await touchSession.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touchPoint],
  });
  await touchSession.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(liveEditor).toContainText("- [ ] 항목 01을 확인합니다.");

  const baseEditorFontSize = await liveEditor.evaluate((element) =>
    Number.parseFloat(window.getComputedStyle(element).fontSize),
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect
    .poll(() =>
      liveEditor.evaluate((element) =>
        Number.parseFloat(window.getComputedStyle(element).fontSize),
      ),
    )
    .toBeGreaterThanOrEqual(baseEditorFontSize * 1.9);

  for (const width of [320, 390, 899, 900, 1024, 1280, 1440]) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: width < 900 ? 700 : 900 });
      const flow = page.getByTestId("ta-authoring-flow-editor");
      const scroller = flow.locator(".cm-scroller");
      await expect(flow).toBeVisible();
      await expectNoHorizontalOverflow(page.locator("html"), `${width}px page`);
      await expectNoHorizontalOverflow(scroller, `${width}px editor`);
      const buttonBox = await flowMode.boundingBox();
      expect(buttonBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      await scroller.scrollIntoViewIfNeeded();
      const finalLine = flow.getByText("마지막 일반 원문 문장입니다.", {
        exact: true,
      });
      await liveEditor.focus();
      await page.keyboard.press("Control+End");
      await expect
        .poll(
          async () => {
            const inputBox = await page
              .getByTestId("ta02-390-input")
              .boundingBox();
            const finalLineBox = await finalLine.boundingBox();
            const footerBox = await page
              .locator("footer.ta-workspace-footer")
              .boundingBox();
            if (!inputBox || !finalLineBox) return false;
            const visibleBottom = Math.min(
              inputBox.y + inputBox.height,
              footerBox?.y ?? Number.POSITIVE_INFINITY,
            );
            return (
              finalLineBox.y >= inputBox.y - 1 &&
              finalLineBox.y + finalLineBox.height <= visibleBottom + 1
            );
          },
          {
            message: `${width}px keyboard End must reveal the exact final source line inside the unclipped pane`,
          },
        )
        .toBe(true);
      if (width < 900) {
        await expect(page.getByTestId("ta02-390-input")).toHaveAttribute(
          "data-stage-active",
          "true",
        );
      } else {
        await expect(page.getByTestId("ta02-390-result")).toBeVisible();
      }
    });
  }
});

test("LIVE-I01 · Korean composition commits in place without rebuilding the editor or losing source", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP IME composition is Chromium-only");
  await openStandalone(page);
  await enterSource(
    page,
    "한글 조합",
    "# 한글 조합\n## 실행\n- [ ] 입력",
    /1단계 · 1개 항목/u,
  );
  const editor = await switchToFlow(page);
  await editor.evaluate((element) => {
    element.dataset.imeInstance = "original";
  });
  const action = page
    .getByTestId("ta-authoring-flow-editor")
    .locator('[data-flow-block-kind="action-checkbox"]');
  await action.click();
  await page.keyboard.press("End");
  const session = await page.context().newCDPSession(page);
  await session.send("Input.imeSetComposition", {
    text: " 한글",
    selectionStart: 3,
    selectionEnd: 3,
  });
  await session.send("Input.insertText", { text: " 한글" });
  await expect(editor).toContainText("- [ ] 입력 한글");
  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    /1단계 · 1개 항목/u,
  );
  await expect(editor).toHaveAttribute("data-ime-instance", "original");
  expect(await readRawSource(page)).toContain("- [ ] 입력 한글");
  await switchToFlow(page);
  await page.keyboard.press("Control+Z");
  await expect
    .poll(() => readRawSource(page))
    .toBe("# 한글 조합\n## 실행\n- [ ] 입력");
});
