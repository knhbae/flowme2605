import { expect, test, type Locator, type Page } from "@playwright/test";

const DEFAULT_ARTIFACT =
  "/docs/content-audit/2026-08-29-flowme-text-authoring-property-reentry-simplicity-poc-results/flowme-text-authoring-property-reentry-simplicity-poc.html";
const ARTIFACT =
  process.env.FLOWME_PROPERTY_REENTRY_SIMPLICITY_POC_ARTIFACT?.trim()
  || DEFAULT_ARTIFACT;
const CONTENT = '[data-testid="ta-authoring-flow-editor-content"]';
const FLOW_EDITOR = '[data-testid="ta-authoring-flow-editor"][data-editor-mode="flow"]';
const TRIGGER = '[data-testid="ta-authoring-stable-inline-trigger"]';
const MENU = '[data-testid="ta-authoring-stable-inline-menu"]';

type ContinuousState = {
  dispatchCount: number;
  documentText: string;
  selection: { from: number; to: number; head: number } | null;
};

const browserErrors: string[] = [];

test.beforeEach(({ page }) => {
  browserErrors.length = 0;
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
});

test.afterEach(() => {
  expect(browserErrors).toEqual([]);
});

async function openEditor(
  page: Page,
  options: { width?: number; height?: number; textScale?: boolean } = {},
): Promise<void> {
  await page.setViewportSize({ width: options.width ?? 1024, height: options.height ?? 900 });
  await page.goto(`${ARTIFACT}${options.textScale ? "?stableInlineScale=200" : ""}`);
  await expect(page.getByTestId("text-authoring-workspace")).toBeVisible();
  await page.getByTestId("ta-authoring-example-select").selectOption("product:simple");
  const flow = page.getByTestId("ta-authoring-view-flow");
  if ((await flow.getAttribute("aria-pressed")) !== "true") await flow.click();
  await expect(flow).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-property-reentry-simplicity-poc", "true");
  await expect(page.locator(CONTENT)).toBeVisible();
}

async function continuousState(page: Page): Promise<ContinuousState> {
  return page.evaluate(() => {
    const api = (window as typeof window & {
      __FLOWME_CONTINUOUS_LIVE_EDITOR_POC__?: { getState: () => ContinuousState };
    }).__FLOWME_CONTINUOUS_LIVE_EDITOR_POC__;
    if (!api) throw new Error("continuous editor API is missing");
    return api.getState();
  });
}

async function successorState(page: Page): Promise<{ reentryCount: number; lastPlan: { key?: string; reason?: string } | null }> {
  return page.evaluate(() => {
    const api = (window as typeof window & {
      __FLOWME_PROPERTY_REENTRY_SIMPLICITY_POC__?: {
        getState: () => { reentryCount: number; lastPlan: { key?: string; reason?: string } | null };
      };
    }).__FLOWME_PROPERTY_REENTRY_SIMPLICITY_POC__;
    if (!api) throw new Error("property re-entry API is missing");
    return api.getState();
  });
}

async function readSource(page: Page): Promise<string> {
  return (await continuousState(page)).documentText;
}

async function dispatchDocument(page: Page, text: string, anchor = text.length): Promise<void> {
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
  await expect.poll(() => readSource(page)).toBe(text);
  await expect(page.locator(FLOW_EDITOR)).toHaveAttribute("aria-busy", "false");
}

async function setSelection(page: Page, anchor: number, head = anchor): Promise<void> {
  await page.evaluate(
    ({ anchor, head, selector }) => {
      const content = document.querySelector(selector) as
        | (HTMLElement & { cmTile?: { view?: { focus: () => void; dispatch: (value: unknown) => void } } })
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

async function renderedProperty(page: Page, label: string): Promise<Locator> {
  const blocks = page.locator('[data-testid="ta-authoring-flow-live-rendered-block"][data-flow-block-kind="property"]');
  await expect.poll(async () => blocks.count()).toBeGreaterThan(0);
  const count = await blocks.count();
  for (let index = 0; index < count; index += 1) {
    const text = ((await blocks.nth(index).locator(".ta-flow-live-text").textContent()) ?? "").trimStart();
    if (text === label || text.startsWith(`${label}  `)) return blocks.nth(index);
  }
  throw new Error(`rendered property not found: ${label}`);
}

function action(page: Page, name: string): Locator {
  return page.locator(`${MENU} [data-stable-inline-action="${name}"]`);
}

async function openProperties(page: Page, source: string, needle: string): Promise<void> {
  const anchor = source.indexOf(needle);
  expect(anchor, `missing needle: ${needle}`).toBeGreaterThanOrEqual(0);
  await dispatchDocument(page, source, anchor);
  await expect(page.locator(TRIGGER)).toBeVisible();
  await page.locator(TRIGGER).click();
  await expect(page.locator(MENU)).toBeVisible();
  if ((await page.locator(MENU).getAttribute("data-mode")) === "structure") {
    await action(page, "properties").click();
  }
  await expect(page.locator(MENU)).toHaveAttribute("data-mode", /property-(?:core|more)/u);
}

test("REENTRY-P01 · 빈 장소를 재탭하면 콜론 뒤에서 한글 입력되고 prefix가 보존된다", async ({ page }) => {
  await openEditor(page);
  const source = "# 여행\n## 예약\n- [ ] 숙소 예약\n  - 장소: ";
  const valueStart = source.indexOf("장소: ") + "장소: ".length;
  await dispatchDocument(page, source, source.indexOf("숙소"));
  const property = await renderedProperty(page, "장소");
  const before = await continuousState(page);
  await property.click({ position: { x: 6, y: 8 } });
  const selected = await continuousState(page);
  expect(selected.documentText).toBe(source);
  expect(selected.dispatchCount).toBe(before.dispatchCount);
  expect(selected.selection).toMatchObject({ from: valueStart, to: valueStart, head: valueStart });
  await page.keyboard.insertText("서울역");
  await expect.poll(() => readSource(page)).toBe(`${source}서울역`);
  expect(await readSource(page)).not.toContain("서울역장소:");
  expect((await successorState(page)).lastPlan).toMatchObject({ key: "place", reason: "empty-value" });
});

test("REENTRY-P02 · 기존 장소 label 탭은 실제 값만 선택하고 undo·redo가 exact하다", async ({ page }) => {
  await openEditor(page);
  const source = "# 여행\n## 예약\n- [ ] 숙소 예약\n  - 장소: 제주공항  ";
  const valueStart = source.indexOf("장소: ") + "장소: ".length;
  const valueEnd = valueStart + "제주공항".length;
  await dispatchDocument(page, source, source.indexOf("숙소"));
  const before = await continuousState(page);
  await (await renderedProperty(page, "장소")).click({ position: { x: 6, y: 8 } });
  const selected = await continuousState(page);
  expect(selected.documentText).toBe(source);
  expect(selected.dispatchCount).toBe(before.dispatchCount);
  expect(selected.selection).toMatchObject({ from: valueStart, to: valueEnd, head: valueEnd });
  await page.keyboard.insertText("서울역");
  const changed = source.slice(0, valueStart) + "서울역" + source.slice(valueEnd);
  await expect.poll(() => readSource(page)).toBe(changed);
  await page.keyboard.press("Control+z");
  await expect.poll(() => readSource(page)).toBe(source);
  await page.keyboard.press("Control+y");
  await expect.poll(() => readSource(page)).toBe(changed);
});

test("REENTRY-C01 · 15종 rendered property label은 모두 prefix 밖 실제 값 범위로 진입한다", async ({ page }) => {
  await openEditor(page);
  const fixtures = [
    { key: "date", label: "날짜", value: "2026-09-01", before: [] },
    { key: "time", label: "시간", value: "09:30", before: ["  - 날짜: 2026-09-01"] },
    { key: "place", label: "장소", value: "서울역", before: [] },
    { key: "completion", label: "완료 기준", value: "예약 번호 기록", before: [] },
    { key: "relativeDate", label: "상대 날짜", value: "D-3", before: [] },
    { key: "duration", label: "소요 시간", value: "30분", before: ["  - 날짜: 2026-09-01"] },
    { key: "repeat", label: "반복", value: "매주 월", before: ["  - 날짜: 2026-09-01"] },
    { key: "detail", label: "설명", value: "예약 메일 확인", before: [] },
    { key: "condition", label: "실행 조건", value: "승인 뒤", before: [] },
    { key: "resource", label: "자료", value: "[예약](https://example.com)", before: [] },
    { key: "guide", label: "안내", value: "신분증 준비", before: [] },
    { key: "caution", label: "주의", value: "수수료 확인", before: [] },
    { key: "source", label: "출처", value: "[공식](https://example.com)", before: [] },
    { key: "timezone", label: "시간대", value: "Asia/Seoul", before: ["  - 날짜: 2026-09-01", "  - 시간: 09:30"] },
    { key: "repeatEnd", label: "반복 종료", value: "6회", before: ["  - 날짜: 2026-09-01", "  - 반복: 매일"] },
  ];
  for (const fixture of fixtures) {
    const target = `  - ${fixture.label}: ${fixture.value}`;
    const source = ["# 테스트", "## 실행", "- [ ] 확인", ...fixture.before, target].join("\n");
    const valueStart = source.lastIndexOf(`${fixture.label}: `) + `${fixture.label}: `.length;
    await dispatchDocument(page, source, source.indexOf("확인"));
    await (await renderedProperty(page, fixture.label)).click({ position: { x: 5, y: 8 } });
    const state = await continuousState(page);
    expect(state.documentText, fixture.key).toBe(source);
    expect(state.selection, fixture.key).toMatchObject({
      from: valueStart,
      to: valueStart + fixture.value.length,
    });
    expect((await successorState(page)).lastPlan?.key, fixture.key).toBe(fixture.key);
  }
});

test("REENTRY-M01 · 정보 tray는 실제 값, 입력 전, 기본 4개와 같은 패널의 3개 그룹을 보인다", async ({ page }) => {
  await openEditor(page);
  const source = [
    "# 여행",
    "## 예약",
    "- [ ] 숙소 예약",
    "  - 장소: 제주공항 1층",
    "  - 설명: ",
  ].join("\n");
  await openProperties(page, source, "숙소");
  await expect(action(page, "place").locator("code")).toHaveText("장소: 제주공항 1층");
  await expect(action(page, "place")).not.toContainText("서울역 2번 출구");
  await action(page, "property-more").click();
  await expect(page.locator(MENU)).toHaveAttribute("data-property-reentry-presentation", "expanded");
  for (const key of ["date", "time", "place", "completion", "relativeDate", "duration", "repeat", "detail", "condition", "resource", "guide", "caution", "source"]) {
    await expect(action(page, key), key).toHaveCount(1);
  }
  await expect(action(page, "detail").locator("code")).toHaveText("설명: 입력 전");
  await expect(page.locator(`${MENU} [data-property-reentry-group-kind="more"]`)).toHaveText([
    "일정",
    "실행 내용",
    "참고·출처",
  ]);
  await expect(page.locator(`${MENU} .tsi-scroll-hint`)).toHaveCount(0);
  await expect(page.locator(MENU)).not.toContainText("9개 더");
  await expect(page.locator(MENU)).not.toContainText("빈 입력 자리를 원문에 추가합니다");
  expect(await readSource(page)).toBe(source);
  await action(page, "back-property").click();
  await expect(page.locator(MENU)).toHaveAttribute("data-property-reentry-presentation", "collapsed");
  await expect(action(page, "relativeDate")).toHaveCount(0);
});

test("REENTRY-M02 · keyboard disclosure·active option·Escape는 source와 editor focus를 보존한다", async ({ page }) => {
  await openEditor(page, { width: 390, height: 844 });
  const source = "# 여행\n## 예약\n- [ ] 숙소 예약";
  await openProperties(page, source, "숙소");
  await expect(page.locator(CONTENT)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.locator(MENU)).toHaveAttribute("data-property-reentry-presentation", "expanded");
  await expect(page.locator(CONTENT)).toBeFocused();
  const activeId = await page.locator(CONTENT).getAttribute("aria-activedescendant");
  expect(activeId).toBeTruthy();
  await expect(page.locator(`#${activeId}`)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(MENU)).toBeHidden();
  await expect(page.locator(CONTENT)).toBeFocused();
  expect(await readSource(page)).toBe(source);
});

test("REENTRY-M03 · 다른 Item으로 이동해도 이전 owner의 실제 값이 tray에 남지 않는다", async ({ page }) => {
  await openEditor(page);
  const source = [
    "# 여행",
    "## 예약",
    "- [ ] 첫 숙소",
    "  - 장소: 제주공항 1층",
    "- [ ] 둘째 숙소",
    "  - 설명: 예약 확인",
  ].join("\n");
  await openProperties(page, source, "첫 숙소");
  await expect(action(page, "place").locator("code")).toHaveText("장소: 제주공항 1층");
  await action(page, "close-menu").click();

  const second = source.indexOf("둘째 숙소");
  await setSelection(page, second);
  await page.locator(TRIGGER).click();
  await action(page, "properties").click();
  await action(page, "property-more").click();
  await expect(action(page, "place")).not.toContainText("제주공항 1층");
  await expect(action(page, "place")).toHaveAttribute("data-property-state", "available");
  expect(await readSource(page)).toBe(source);
});

test("REENTRY-V01 · 320·360·390px keyboard-open proxy에서 재진입 caret과 tray가 보이는 범위에 남는다", async ({ page }) => {
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
    Object.defineProperty(window, "__setPropertyReentryViewport", {
      configurable: true,
      value: (height: number) => {
        visibleHeight = height;
        events.dispatchEvent(new Event("resize"));
        events.dispatchEvent(new Event("scroll"));
      },
    });
  });
  for (const width of [320, 360, 390]) {
    await openEditor(page, { width, height: 844 });
    const source = "# 여행\n## 예약\n- [ ] 숙소 예약\n  - 장소: ";
    await dispatchDocument(page, source, source.indexOf("숙소"));
    await (await renderedProperty(page, "장소")).click({ position: { x: 5, y: 8 } });
    await page.keyboard.insertText("서");
    await page.evaluate(() => {
      (window as typeof window & { __setPropertyReentryViewport: (height: number) => void })
        .__setPropertyReentryViewport(300);
    });
    await page.waitForTimeout(140);
    const geometry = await page.evaluate((selector) => {
      const content = document.querySelector(selector) as
        | (HTMLElement & { cmTile?: { view?: { state: { selection: { main: { head: number } } }; coordsAtPos: (position: number) => DOMRect | null } } })
        | null;
      const view = content?.cmTile?.view;
      const caret = view?.coordsAtPos(view.state.selection.main.head);
      const visibleBottom = (window.visualViewport?.offsetTop ?? 0) + (window.visualViewport?.height ?? innerHeight);
      return {
        caretTop: caret?.top ?? -1,
        caretBottom: caret?.bottom ?? -1,
        visibleBottom,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    }, CONTENT);
    expect(geometry.caretTop, `${width}px`).toBeGreaterThanOrEqual(0);
    expect(geometry.caretBottom, `${width}px`).toBeLessThanOrEqual(geometry.visibleBottom + 1);
    expect(geometry.overflow, `${width}px`).toBeLessThanOrEqual(1);
  }
});

test("REENTRY-V02 · 320px·200% expanded tray는 한 열로 reflow되고 모든 option에 도달한다", async ({ page }) => {
  await openEditor(page, { width: 320, height: 844, textScale: true });
  const source = "# 여행\n## 예약\n- [ ] 숙소 예약\n  - 장소: 제주공항";
  await openProperties(page, source, "숙소");
  await action(page, "property-more").click();
  await action(page, "source").scrollIntoViewIfNeeded();
  await expect(action(page, "source")).toBeVisible();
  const metrics = await page.evaluate((menuSelector) => {
    const menu = document.querySelector(menuSelector) as HTMLElement | null;
    const controls = [...(menu?.querySelectorAll("button") ?? [])].map((button) => button.getBoundingClientRect());
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      minimumWidth: Math.min(...controls.map((rect) => rect.width)),
      minimumHeight: Math.min(...controls.map((rect) => rect.height)),
    };
  }, MENU);
  expect(metrics.overflow).toBeLessThanOrEqual(1);
  expect(metrics.minimumWidth).toBeGreaterThanOrEqual(44);
  expect(metrics.minimumHeight).toBeGreaterThanOrEqual(44);
});

test("REENTRY-S01 · unknown property와 보호 원문은 successor source write가 0이다", async ({ page }) => {
  await openEditor(page);
  const unknown = "# 여행\n## 예약\n- [ ] 숙소 예약\n  - 담당자: 홍길동";
  await dispatchDocument(page, unknown, unknown.indexOf("숙소"));
  const before = await continuousState(page);
  const block = page.locator('[data-flow-block-kind="property"]').filter({ hasText: "담당자" });
  if (await block.count()) await block.first().click({ position: { x: 5, y: 8 } });
  expect(await readSource(page)).toBe(unknown);
  expect((await continuousState(page)).dispatchCount).toBe(before.dispatchCount);

  const protectedSource = [
    "# 구매 메모",
    "<!-- 가격은 확인 시점 기준 -->",
    "| 품목 | 가격 | 링크 |",
    "| --- | ---: | --- |",
    "| 가방 | 89,000원 | https://example.com/bag |",
    "```text",
    "- [ ] 이 줄은 literal",
    "```",
  ].join("\n");
  await dispatchDocument(page, protectedSource, protectedSource.indexOf("가방"));
  await expect(page.locator(TRIGGER)).toBeHidden();
  await page.keyboard.press("Alt+/");
  await expect(page.locator(MENU)).toBeHidden();
  expect(await readSource(page)).toBe(protectedSource);
});
