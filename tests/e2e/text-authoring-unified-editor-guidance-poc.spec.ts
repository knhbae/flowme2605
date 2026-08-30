import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

const DEFAULT_ARTIFACT =
  "/docs/content-audit/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc-results/flowme-text-authoring-unified-editor-guidance-poc.html";
const ARTIFACT = process.env.FLOWME_UNIFIED_EDITOR_GUIDANCE_POC_ARTIFACT?.trim()
  || DEFAULT_ARTIFACT;

const CONTENT = '[data-testid="ta-authoring-flow-editor-content"]';
const MOUNT = '[data-testid="ta-authoring-flow-editor-mount"]';
const FLOW_EDITOR = '[data-testid="ta-authoring-flow-editor"][data-editor-mode="flow"]';
const SCROLLER = `${FLOW_EDITOR} .cm-scroller`;
const TRIGGER = '[data-testid="ta-authoring-stable-inline-trigger"]';
const INHERITED_MENU = '[data-testid="ta-authoring-stable-inline-menu"]';
const STRUCTURE_MENU = '[data-testid="ta-authoring-unified-structure-menu"]';
const TEMPLATE_ENTRY = '[data-testid="ta-authoring-unified-template-entry"]';
const TEMPLATE_PICKER = '[data-testid="ta-authoring-unified-template-picker"]';
const EXAMPLE_TOGGLE = '[data-testid="ta-authoring-unified-example-toggle"]';
const GHOST_LAYER = '[data-testid="ta-authoring-unified-ghost-layer"]';
const GHOST = `${GHOST_LAYER} .ueg-ghost`;

const TEMPLATE_SCAFFOLDS = new Map<string, string>([
  [
    "exercise-phased-4w-v1",
    "# \n- 기준일: \n\n## \n- [ ] \n  - 반복: \n  - 반복 종료: ",
  ],
  [
    "exercise-weekly-repeat-v1",
    "# \n- 기준일: \n\n## \n- [ ] \n  - 반복: \n  - 반복 종료: ",
  ],
  [
    "moving-dday-v1",
    "# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: ",
  ],
  [
    "wedding-dday-v1",
    "# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: \n  - 자료: ",
  ],
  [
    "travel-itinerary-prep-v1",
    [
      "# ",
      "- 기준일: ",
      "",
      "## ",
      "- [ ] ",
      "  - 상대 날짜: ",
      "",
      "## ",
      "- [ ] ",
      "  - 날짜: ",
      "  - 시간: ",
      "  - 시간대: ",
      "  - 장소: ",
    ].join("\n"),
  ],
  [
    "exam-dday-study-v1",
    [
      "# ",
      "- 기준일: ",
      "",
      "- [ ] ",
      "  - 반복: ",
      "  - 반복 종료: ",
      "  - 완료 기준: ",
      "",
      "- [ ] ",
      "  - 날짜: ",
    ].join("\n"),
  ],
]);

type ContinuousState = {
  dispatchCount: number;
  documentText: string;
  selection: { from: number; to: number; head: number } | null;
};

type UnifiedState = {
  pickerOpen: boolean;
  examplesVisible: boolean;
  insertionCount: number;
  blockedCount: number;
  blockedReason: string | null;
  lastResult: { status?: string; reason?: string; templateId?: string } | null;
  templateId: string | null;
  hintCount: number;
  hintTexts: string[];
  documentText: string;
  selection: { from: number; to: number; head: number } | null;
  continuousDispatchCount: number;
};

type UnifiedApi = {
  getState: () => UnifiedState;
  openTemplatePicker: () => unknown;
  selectTemplate: (templateId: string) => unknown;
  refreshExamples: () => unknown;
  toggleExamples: () => unknown;
};

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
});

async function continuousState(page: Page): Promise<ContinuousState> {
  return page.evaluate(() => {
    const api = (window as typeof window & {
      __FLOWME_CONTINUOUS_LIVE_EDITOR_POC__?: { getState: () => ContinuousState };
    }).__FLOWME_CONTINUOUS_LIVE_EDITOR_POC__;
    if (!api) throw new Error("continuous editor API is missing");
    return api.getState();
  });
}

async function unifiedState(page: Page): Promise<UnifiedState> {
  return page.evaluate(() => {
    const api = (window as typeof window & {
      __FLOWME_UNIFIED_EDITOR_GUIDANCE_POC__?: UnifiedApi;
    }).__FLOWME_UNIFIED_EDITOR_GUIDANCE_POC__;
    if (!api) throw new Error("unified editor API is missing");
    return api.getState();
  });
}

async function replaceDocument(page: Page, text: string, anchor = text.length): Promise<void> {
  await page.evaluate(
    ({ text, anchor, selector }) => {
      const content = document.querySelector(selector) as
        | (HTMLElement & {
            cmTile?: {
              view?: {
                state: { doc: { length: number } };
                focus: () => void;
                dispatch: (transaction: unknown) => void;
              };
            };
          })
        | null;
      const view = content?.cmTile?.view;
      if (!view) throw new Error("CodeMirror view is missing");
      view.focus();
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
        selection: { anchor },
        scrollIntoView: true,
        userEvent: "input.paste",
      });
    },
    { text, anchor, selector: CONTENT },
  );
  await expect.poll(async () => (await continuousState(page)).documentText).toBe(text);
  await expect(page.locator(FLOW_EDITOR)).toHaveAttribute("aria-busy", "false");
}

async function setSelection(page: Page, anchor: number, head = anchor): Promise<void> {
  await page.evaluate(
    ({ anchor, head, selector }) => {
      const content = document.querySelector(selector) as
        | (HTMLElement & {
            cmTile?: {
              view?: { focus: () => void; dispatch: (transaction: unknown) => void };
            };
          })
        | null;
      const view = content?.cmTile?.view;
      if (!view) throw new Error("CodeMirror view is missing");
      view.focus();
      view.dispatch({ selection: { anchor, head }, scrollIntoView: true, userEvent: "select" });
    },
    { anchor, head, selector: CONTENT },
  );
  await expect.poll(async () => (await continuousState(page)).selection?.head).toBe(head);
}

async function openEmptyEditor(
  page: Page,
  options: { width?: number; height?: number; textScale?: boolean } = {},
): Promise<void> {
  await page.setViewportSize({ width: options.width ?? 390, height: options.height ?? 844 });
  const separator = ARTIFACT.includes("?") ? "&" : "?";
  await page.goto(`${ARTIFACT}${options.textScale ? `${separator}stableInlineScale=200` : ""}`);
  await expect(page.getByTestId("text-authoring-workspace")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-unified-editor-guidance-poc", "true");
  await page.getByTestId("ta-authoring-example-select").selectOption("product:simple");
  const flow = page.getByTestId("ta-authoring-view-flow");
  if ((await flow.getAttribute("aria-pressed")) !== "true") await flow.click();
  await expect(flow).toHaveAttribute("aria-pressed", "true");
  await replaceDocument(page, "", 0);
  await expect(page.locator(TRIGGER)).toBeVisible();
  await expect(page.locator(EXAMPLE_TOGGLE)).toBeVisible();
}

async function openStructureMenu(page: Page): Promise<Locator> {
  await page.locator(TRIGGER).click();
  const menu = page.locator(STRUCTURE_MENU);
  await expect(menu).toBeVisible();
  await expect(page.locator(INHERITED_MENU)).toBeVisible();
  await expect(page.locator(TEMPLATE_ENTRY)).toBeVisible();
  return menu;
}

async function openTemplatePicker(page: Page): Promise<Locator> {
  await openStructureMenu(page);
  await page.locator(TEMPLATE_ENTRY).click();
  const picker = page.locator(TEMPLATE_PICKER);
  await expect(picker).toBeVisible();
  await expect.poll(async () => (await unifiedState(page)).pickerOpen).toBe(true);
  for (const templateId of TEMPLATE_SCAFFOLDS.keys()) {
    await expect(page.getByTestId(`ta-authoring-unified-template-option-${templateId}`)).toBeVisible();
  }
  return picker;
}

async function insertTemplate(page: Page, templateId: string): Promise<void> {
  await openTemplatePicker(page);
  await page.getByTestId(`ta-authoring-unified-template-option-${templateId}`).click();
  await expect.poll(async () => (await continuousState(page)).documentText)
    .toBe(TEMPLATE_SCAFFOLDS.get(templateId));
}

async function expectNoHorizontalOverflow(locator: Locator, context: string): Promise<void> {
  const metrics = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(metrics.scrollWidth, context).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

async function expectEditorFocused(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate((selector) => {
    const content = document.querySelector(selector) as
      | (HTMLElement & { cmTile?: { view?: { hasFocus: boolean } } })
      | null;
    return content?.cmTile?.view?.hasFocus ?? false;
  }, CONTENT)).toBe(true);
}

for (const [templateId, scaffold] of TEMPLATE_SCAFFOLDS) {
  test(`UEG-TPL · ${templateId}는 같은 CodeMirror에 exact scaffold를 한 transaction으로 넣는다`, async ({
    page,
  }) => {
    await openEmptyEditor(page);
    const before = await unifiedState(page);
    await insertTemplate(page, templateId);

    const inserted = await unifiedState(page);
    expect(inserted.documentText).toBe(scaffold);
    expect(inserted.selection).toMatchObject({ from: 2, to: 2, head: 2 });
    expect(inserted.insertionCount).toBe(before.insertionCount + 1);
    expect(inserted.templateId).toBe(templateId);
    expect(inserted.lastResult).toMatchObject({ status: "ready", templateId });
    await expectEditorFocused(page);
    await expect(page.locator('[data-testid="ta-authoring-single-buffer-textarea"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="ta-authoring-single-buffer-materialize"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Flow로 확인|초안 보관/u })).toHaveCount(0);

    await page.keyboard.press("Control+z");
    await expect.poll(async () => (await continuousState(page)).documentText).toBe("");
    await page.keyboard.press("Control+y");
    await expect.poll(async () => (await continuousState(page)).documentText).toBe(scaffold);
  });
}

test("UEG-PARSE · 빈 골격은 phantom Step·Item·issue 0이고 유효한 형제만 해석한다", async ({ page }) => {
  await openEmptyEditor(page, { width: 390, height: 844 });
  await insertTemplate(page, "moving-dday-v1");
  await expect(page.getByTestId("ta-authoring-parse")).toContainText("결과 보기 · 0개");
  await expect(page.getByTestId("ta-authoring-status")).toContainText(/0단계 · 0개 항목/u);
  await page.getByTestId("ta-authoring-parse").click();
  await expect(page.getByTestId("ta-authoring-product-issue")).toHaveCount(0);

  await page.getByRole("button", { name: "입력 수정" }).click();
  const partial = [
    "# ",
    "## ",
    "- [ ] ",
    "  - 날짜: ",
    "# 실제 Flow",
    "## 실제 단계",
    "- [ ] 실제 할 일",
    "  - 장소: 서울역",
    "  - [ ] ",
  ].join("\n");
  await replaceDocument(page, partial, partial.length);
  await expect(page.getByTestId("ta-authoring-parse")).toContainText("결과 보기 · 1개");
  await expect(page.getByTestId("ta-authoring-status")).toContainText(/1단계 · 1개 항목/u);
  await page.getByTestId("ta-authoring-parse").click();
  await expect(page.getByTestId("ta-authoring-product-issue")).toHaveCount(0);
  const resultSurface = page.getByTestId("ta02-390-result");
  await expect(resultSurface.getByRole("heading", {
    name: "원문에서 미체크: 실제 할 일",
    exact: true,
  })).toBeVisible();
  await expect(resultSurface.getByRole("heading", {
    name: "원문에서 미체크: 할 일",
    exact: true,
  })).toHaveCount(0);
});

test("UEG-EXAMPLE · 편집기 전체 예시 토글은 origin과 bytes·selection·scroll·dispatch·clipboard·undo를 건드리지 않는다", async ({
  page,
}) => {
  await openEmptyEditor(page, { width: 390, height: 844 });
  const direct = [
    "# ",
    "## ",
    "- [ ] ",
    ...Array.from({ length: 28 }, (_, index) => `  - 설명: ${index + 1}줄 직접 입력`),
    "  - 장소: ",
  ].join("\n");
  await replaceDocument(page, direct, direct.length);
  await setSelection(page, direct.length, direct.length);
  await expect.poll(async () => (await unifiedState(page)).hintCount).toBeGreaterThan(0);
  const visibleHintCount = (await unifiedState(page)).hintCount;
  await expect(page.locator(GHOST_LAYER)).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(GHOST_LAYER)).toHaveCSS("pointer-events", "none");
  await expect(page.locator(EXAMPLE_TOGGLE)).toHaveAttribute("aria-pressed", "true");

  const before = await continuousState(page);
  const scrollBefore = await page.locator(SCROLLER).evaluate((element) => element.scrollTop);
  await page.locator(EXAMPLE_TOGGLE).click();
  await expect(page.locator(EXAMPLE_TOGGLE)).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(GHOST)).toHaveCount(0);
  await page.locator(EXAMPLE_TOGGLE).click();
  await expect(page.locator(GHOST)).toHaveCount(visibleHintCount);
  const after = await continuousState(page);
  const scrollAfter = await page.locator(SCROLLER).evaluate((element) => element.scrollTop);
  expect(after.documentText).toBe(before.documentText);
  expect(after.selection).toEqual(before.selection);
  expect(after.dispatchCount).toBe(before.dispatchCount);
  expect(scrollAfter).toBe(scrollBefore);

  await setSelection(page, 0, direct.length);
  const copied = await page.locator(CONTENT).evaluate((element) => {
    const data = new DataTransfer();
    element.dispatchEvent(new ClipboardEvent("copy", {
      bubbles: true,
      cancelable: true,
      clipboardData: data,
    }));
    return data.getData("text/plain");
  });
  expect(copied).toBe(direct);
  expect(copied).not.toContain("예:");

  await setSelection(page, direct.length);
  await page.keyboard.insertText("X");
  await expect.poll(async () => (await continuousState(page)).documentText).toBe(`${direct}X`);
  await page.locator(EXAMPLE_TOGGLE).click();
  await page.locator(EXAMPLE_TOGGLE).click();
  await page.locator(CONTENT).focus();
  await page.keyboard.press("Control+z");
  await expect.poll(async () => (await continuousState(page)).documentText).toBe(direct);

  await replaceDocument(page, "", 0);
  await insertTemplate(page, "travel-itinerary-prep-v1");
  await expect(page.locator(GHOST, { hasText: "예: 첫 도쿄 여행" })).toBeVisible();
  await page.locator(SCROLLER).evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(page.locator(GHOST, { hasText: "예: 하네다공항" })).toBeVisible();
});

test("UEG-MODE · 예시는 직접 입력·기존 문서에서 같고 순수 텍스트에서는 UI만 숨는다", async ({ page }) => {
  await openEmptyEditor(page);
  const existing = "# \n## 실행\n- [ ] \n  - 완료 기준: ";
  await replaceDocument(page, existing, 2);
  await expect(page.locator(GHOST)).toHaveCount(3);
  await page.locator(EXAMPLE_TOGGLE).click();
  await expect(page.locator(EXAMPLE_TOGGLE)).toHaveAttribute("aria-pressed", "false");
  const before = await continuousState(page);

  await page.getByTestId("ta-authoring-view-text").click();
  await expect(page.locator(EXAMPLE_TOGGLE)).toBeHidden();
  await expect(page.locator(TRIGGER)).toBeHidden();
  await expect(page.locator(GHOST)).toHaveCount(0);
  expect((await continuousState(page)).documentText).toBe(existing);

  await page.getByTestId("ta-authoring-view-flow").click();
  await expect(page.locator(EXAMPLE_TOGGLE)).toBeVisible();
  await expect(page.locator(EXAMPLE_TOGGLE)).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(GHOST)).toHaveCount(0);
  const reentered = await continuousState(page);
  expect(reentered.documentText).toBe(before.documentText);
  expect(reentered.dispatchCount).toBe(before.dispatchCount);

  await page.locator(EXAMPLE_TOGGLE).click();
  await expect(page.locator(GHOST)).toHaveCount(3);
  expect((await unifiedState(page)).hintTexts.every((value) => value.startsWith("예:"))).toBe(true);
});

test("UEG-HIERARCHY · + 메뉴는 same·child/detail·section 계층과 항목 정보 범위를 실제 문법으로 보인다", async ({ page }) => {
  await openEmptyEditor(page);
  const source = "# 여행\n## 예약\n- [ ] 숙소 예약";
  await replaceDocument(page, source, source.indexOf("숙소"));
  await page.locator(TRIGGER).click();
  await expect(page.locator(STRUCTURE_MENU)).toBeVisible();

  const order = await page.locator(
    ["item", "subcheck", "properties", "step"]
      .map((action) => `[data-testid="ta-authoring-unified-structure-action-${action}"]`)
      .join(","),
  ).evaluateAll((elements) => elements.map((element) => element.getAttribute("data-unified-action")));
  expect(order).toEqual(["item", "subcheck", "properties", "step"]);
  const item = page.getByTestId("ta-authoring-unified-structure-action-item");
  const subcheck = page.getByTestId("ta-authoring-unified-structure-action-subcheck");
  const properties = page.getByTestId("ta-authoring-unified-structure-action-properties");
  const step = page.getByTestId("ta-authoring-unified-structure-action-step");
  await expect(item).toContainText("현재 단계에");
  await expect(item).toContainText("- [ ]");
  await expect(item).toContainText("다음 할 일");
  await expect(subcheck).toContainText("현재 할 일 아래");
  await expect(subcheck).toContainText("  - [ ]");
  await expect(properties).toContainText("현재 할 일 안에");
  await expect(properties).toContainText("항목 정보");
  await expect(properties).toContainText("날짜 · 시간 · 장소 · 반복 · 자료 · 완료 기준");
  await expect(properties).not.toContainText("날짜 · 장소 · 완료 기준", { useInnerText: true });
  await expect(step).toContainText("새 구간으로");
  await expect(step).toContainText("##");

  const geometry = await Promise.all([item, subcheck, properties, step].map(async (action) => action.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      left: box.left,
      height: box.height,
      group: element.getAttribute("data-unified-group"),
      indent: Number(element.getAttribute("data-unified-indent")),
    };
  })));
  expect(geometry.map(({ group }) => group)).toEqual([
    "current-step",
    "current-item",
    "current-item",
    "new-section",
  ]);
  expect(geometry.map(({ indent }) => indent)).toEqual([0, 1, 1, 0]);
  expect(geometry[1].left).toBeGreaterThan(geometry[0].left);
  expect(geometry[2].left).toBeCloseTo(geometry[1].left, 0);
  expect(geometry[3].left).toBeLessThan(geometry[1].left);
  for (const target of geometry) expect(target.height).toBeGreaterThanOrEqual(44);

  await item.click();
  await expect.poll(async () => (await continuousState(page)).documentText)
    .toBe(`${source}\n- [ ] `);
  await expect(page.locator(GHOST, { hasText: "예: 예약 확인" })).toBeVisible();
});

test("UEG-GUARD · nonempty·stale source/host·composition은 틀 source write를 0으로 막는다", async ({ page }) => {
  await openEmptyEditor(page);
  await replaceDocument(page, "기존 일반 문장", 7);
  const opened = await page.evaluate(() => {
    const api = (window as typeof window & {
      __FLOWME_UNIFIED_EDITOR_GUIDANCE_POC__: UnifiedApi;
    }).__FLOWME_UNIFIED_EDITOR_GUIDANCE_POC__;
    return api.openTemplatePicker();
  });
  expect(opened).toBe(false);
  await expect(page.locator(TEMPLATE_ENTRY)).toHaveCount(0);
  expect((await continuousState(page)).documentText).toBe("기존 일반 문장");

  await replaceDocument(page, "", 0);
  await openTemplatePicker(page);
  await replaceDocument(page, "picker 뒤 바뀐 원문", 5);
  await page.evaluate((templateId) => {
    const api = (window as typeof window & {
      __FLOWME_UNIFIED_EDITOR_GUIDANCE_POC__: UnifiedApi;
    }).__FLOWME_UNIFIED_EDITOR_GUIDANCE_POC__;
    api.selectTemplate(templateId);
  }, "moving-dday-v1");
  expect((await continuousState(page)).documentText).toBe("picker 뒤 바뀐 원문");
  expect((await unifiedState(page)).blockedReason).toMatch(/host|source|fingerprint/u);

  await openEmptyEditor(page);
  await openTemplatePicker(page);
  await page.locator(CONTENT).dispatchEvent("compositionstart", { data: "ㅎ" });
  await page.evaluate((templateId) => {
    const api = (window as typeof window & {
      __FLOWME_UNIFIED_EDITOR_GUIDANCE_POC__: UnifiedApi;
    }).__FLOWME_UNIFIED_EDITOR_GUIDANCE_POC__;
    api.selectTemplate(templateId);
  }, "moving-dday-v1");
  expect((await continuousState(page)).documentText).toBe("");
  expect((await unifiedState(page)).blockedReason).toBe("active-composition");
  await page.locator(CONTENT).dispatchEvent("compositionend", { data: "ㅎ" });

  await openEmptyEditor(page);
  await openTemplatePicker(page);
  await page.getByTestId("ta-authoring-view-text").click();
  await page.getByTestId("ta-authoring-view-flow").click();
  await page.evaluate((templateId) => {
    const api = (window as typeof window & {
      __FLOWME_UNIFIED_EDITOR_GUIDANCE_POC__: UnifiedApi;
    }).__FLOWME_UNIFIED_EDITOR_GUIDANCE_POC__;
    api.selectTemplate(templateId);
  }, "moving-dday-v1");
  expect((await continuousState(page)).documentText).toBe("");
  expect((await unifiedState(page)).pickerOpen).toBe(false);
});

test("UEG-A11Y · keyboard-only 선택과 두 단계 Escape가 focus origin을 복원한다", async ({ page }) => {
  await openEmptyEditor(page);
  const trigger = page.locator(TRIGGER);
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(STRUCTURE_MENU)).toBeVisible();
  const entry = page.locator(TEMPLATE_ENTRY);
  await entry.focus();
  const activeIndexBeforeRoving = await page.evaluate(() => (
    window as typeof window & {
      __FLOWME_KEYBOARD_PROPERTY_TRAY_RELIABILITY_POC__: { getState: () => { activeIndex: number } };
    }
  ).__FLOWME_KEYBOARD_PROPERTY_TRAY_RELIABILITY_POC__.getState().activeIndex);
  await page.keyboard.press("ArrowDown");
  await expect.poll(async () => page.evaluate(() => (
    window as typeof window & {
      __FLOWME_KEYBOARD_PROPERTY_TRAY_RELIABILITY_POC__: { getState: () => { activeIndex: number } };
    }
  ).__FLOWME_KEYBOARD_PROPERTY_TRAY_RELIABILITY_POC__.getState().activeIndex))
    .not.toBe(activeIndexBeforeRoving);
  await page.keyboard.press("ArrowUp");
  await expect.poll(async () => page.evaluate(() => (
    window as typeof window & {
      __FLOWME_KEYBOARD_PROPERTY_TRAY_RELIABILITY_POC__: { getState: () => { activeIndex: number } };
    }
  ).__FLOWME_KEYBOARD_PROPERTY_TRAY_RELIABILITY_POC__.getState().activeIndex))
    .toBe(activeIndexBeforeRoving);
  await page.keyboard.press("Enter");
  const picker = page.locator(TEMPLATE_PICKER);
  await expect(picker).toBeVisible();
  const first = page.getByTestId("ta-authoring-unified-template-option-exercise-phased-4w-v1");
  await expect(first).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
  await expect(entry).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(STRUCTURE_MENU)).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Enter");
  await entry.focus();
  await page.keyboard.press("Enter");
  await expect(first).toBeFocused();
  const nativeTabTarget = page.getByTestId("ta-authoring-unified-native-tab-target");
  await picker.evaluate((pickerElement) => {
    const menu = pickerElement.parentElement;
    if (!(menu instanceof HTMLElement)) throw new Error("template picker menu is missing");
    const target = document.createElement("button");
    target.type = "button";
    target.dataset.testid = "ta-authoring-unified-native-tab-target";
    target.textContent = "native tab target";
    menu.after(target);
    const trackTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      target.dataset.tabDefaultPrevented = String(event.defaultPrevented);
      document.removeEventListener("keydown", trackTab);
    };
    document.addEventListener("keydown", trackTab);
  });
  await page.keyboard.press("Tab");
  await expect(picker).toBeHidden();
  await expect(nativeTabTarget).toBeFocused();
  await expect(nativeTabTarget).toHaveAttribute("data-tab-default-prevented", "false");

  await trigger.focus();
  await page.keyboard.press("Enter");
  await entry.focus();
  await page.keyboard.press("Enter");
  await expect(first).toBeFocused();
  const nativeShiftTabTarget = page.getByTestId("ta-authoring-unified-native-shift-tab-target");
  await picker.evaluate((pickerElement) => {
    const menu = pickerElement.parentElement;
    if (!(menu instanceof HTMLElement)) throw new Error("template picker menu is missing");
    const target = document.createElement("button");
    target.type = "button";
    target.dataset.testid = "ta-authoring-unified-native-shift-tab-target";
    target.textContent = "native shift tab target";
    menu.before(target);
    const trackTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      target.dataset.tabDefaultPrevented = String(event.defaultPrevented);
      document.removeEventListener("keydown", trackTab);
    };
    document.addEventListener("keydown", trackTab);
  });
  await page.keyboard.press("Shift+Tab");
  await expect(picker).toBeHidden();
  await expect(nativeShiftTabTarget).toBeFocused();
  await expect(nativeShiftTabTarget).toHaveAttribute("data-tab-default-prevented", "false");

  await trigger.focus();
  await page.keyboard.press("Enter");
  await entry.focus();
  await page.keyboard.press("Enter");
  await expect(first).toBeFocused();
  await page.keyboard.press("Enter");
  await expectEditorFocused(page);
  expect((await continuousState(page)).selection).toMatchObject({ from: 2, to: 2, head: 2 });
  await expect(page.locator(EXAMPLE_TOGGLE)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(EXAMPLE_TOGGLE)).toHaveAttribute("aria-controls", /.+/u);
});

test("UEG-VIEWPORT · 320·390·landscape·200%에서 메뉴와 편집기가 reflow되고 44px target을 지킨다", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 640, textScale: false },
    { width: 390, height: 844, textScale: false },
    { width: 844, height: 390, textScale: false },
    { width: 320, height: 640, textScale: true },
  ]) {
    await openEmptyEditor(page, viewport);
    const picker = await openTemplatePicker(page);
    await expectNoHorizontalOverflow(page.locator(MOUNT), `${viewport.width} editor mount`);
    await expectNoHorizontalOverflow(picker, `${viewport.width} template picker`);
    const metrics = await page.evaluate(() => {
      const visibleTargets = [...document.querySelectorAll<HTMLElement>(
        '[data-testid="ta-authoring-unified-template-picker"] button',
      )].filter((target) => {
        const style = getComputedStyle(target);
        const box = target.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && box.height > 0;
      });
      return {
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        targets: visibleTargets.map((target) => {
          const box = target.getBoundingClientRect();
          return { width: box.width, height: box.height, right: box.right };
        }),
      };
    });
    expect(metrics.documentOverflow, JSON.stringify(viewport)).toBeLessThanOrEqual(1);
    for (const target of metrics.targets) {
      expect(target.width, JSON.stringify(viewport)).toBeGreaterThanOrEqual(44);
      expect(target.height, JSON.stringify(viewport)).toBeGreaterThanOrEqual(44);
      expect(target.right, JSON.stringify(viewport)).toBeLessThanOrEqual(viewport.width + 1);
    }
  }
});

test("UEG-KEYBOARD · 축소 visual viewport에서도 caret과 활성 메뉴 항목이 키보드 위에 남는다", async ({ page }) => {
  await page.addInitScript(() => {
    let visibleHeight = 844;
    const events = new EventTarget();
    const viewport = {
      get width() { return window.innerWidth; },
      get height() { return visibleHeight; },
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      scale: 1,
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events),
    };
    Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
    Object.defineProperty(window, "__setUnifiedViewport", {
      configurable: true,
      value: (height: number) => {
        visibleHeight = height;
        events.dispatchEvent(new Event("resize"));
        events.dispatchEvent(new Event("scroll"));
      },
    });
  });
  await openEmptyEditor(page, { width: 390, height: 844 });
  const longSource = [
    "# 키보드 확인",
    "## 긴 단계",
    "- [ ] 현재 할 일",
    ...Array.from({ length: 28 }, (_, index) => `  - 설명: ${index + 1}줄 직접 입력`),
    "  - 장소: ",
  ].join("\n");
  await replaceDocument(page, longSource, longSource.length);
  await page.evaluate(() => {
    (window as typeof window & { __setUnifiedViewport: (height: number) => void })
      .__setUnifiedViewport(360);
  });
  await page.waitForTimeout(150);
  const caretGeometry = await page.evaluate((selector) => {
    const content = document.querySelector(selector) as
      | (HTMLElement & {
          cmTile?: {
            view?: {
              state: { selection: { main: { head: number } } };
              coordsAtPos: (position: number) => DOMRect | null;
            };
          };
        })
      | null;
    const view = content?.cmTile?.view;
    const caret = view?.coordsAtPos(view.state.selection.main.head);
    const visibleBottom = (window.visualViewport?.offsetTop ?? 0)
      + (window.visualViewport?.height ?? innerHeight);
    return { top: caret?.top ?? -1, bottom: caret?.bottom ?? -1, visibleBottom };
  }, CONTENT);
  expect(caretGeometry.top).toBeGreaterThanOrEqual(0);
  expect(caretGeometry.bottom).toBeLessThanOrEqual(caretGeometry.visibleBottom + 1);

  await page.locator(TRIGGER).click();
  const active = page.locator(
    `${INHERITED_MENU} [data-stable-inline-action][data-active="true"]`,
  ).first();
  await expect(active).toBeVisible();
  await active.focus();
  const menuGeometry = await active.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      top: box.top,
      bottom: box.bottom,
      visibleBottom: (window.visualViewport?.offsetTop ?? 0)
        + (window.visualViewport?.height ?? window.innerHeight),
    };
  });
  expect(menuGeometry.top).toBeGreaterThanOrEqual(0);
  expect(menuGeometry.bottom).toBeLessThanOrEqual(menuGeometry.visibleBottom + 1);
  await expectNoHorizontalOverflow(page.locator(MOUNT), "keyboard-open editor");
  await page.keyboard.press("Escape");
  await page.getByTestId("ta-authoring-view-text").click();
  await expect.poll(async () => page.evaluate(() => ({
    open: document.documentElement.dataset.unifiedKeyboardOpen,
    inset: document.documentElement.style.getPropertyValue("--ueg-visual-keyboard-inset"),
  }))).toEqual({ open: "false", inset: "0px" });
});
