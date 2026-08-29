import { expect, test, type Locator, type Page } from "@playwright/test";

const ARTIFACT =
  "/docs/content-audit/2026-08-29-flowme-text-authoring-keyboard-property-tray-reliability-poc-results/flowme-text-authoring-keyboard-property-tray-reliability-poc.html";
const CONTENT = '[data-testid="ta-authoring-flow-editor-content"]';
const FLOW_EDITOR = '[data-testid="ta-authoring-flow-editor"][data-editor-mode="flow"]';
const TRIGGER = '[data-testid="ta-authoring-stable-inline-trigger"]';
const MENU = '[data-testid="ta-authoring-stable-inline-menu"]';
const ASSIST = '[data-testid="ta-authoring-stable-inline-assist"]';
const EXAMPLE = '[data-testid="ta-authoring-stable-inline-example"]';
const STATUS = '[data-testid="ta-authoring-stable-inline-status"]';
const VIEWPORTS = [320, 360, 390, 899, 900, 1024, 1280, 1440] as const;

type ContinuousState = {
  dispatchCount: number;
  documentText: string;
  selection: { from: number; to: number; head: number } | null;
};

type ReliabilityState = {
  open: boolean;
  mode: string;
  activeIndex: number;
  ownerLabel: string;
  continuous: ContinuousState | null;
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
  await expect(page.locator("html")).toHaveAttribute(
    "data-keyboard-property-tray-reliability-poc",
    "true",
  );
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

async function reliabilityState(page: Page): Promise<ReliabilityState> {
  return page.evaluate(() => {
    const api = (window as typeof window & {
      __FLOWME_KEYBOARD_PROPERTY_TRAY_RELIABILITY_POC__?: {
        getState: () => ReliabilityState;
      };
    }).__FLOWME_KEYBOARD_PROPERTY_TRAY_RELIABILITY_POC__;
    if (!api) throw new Error("reliability API is missing");
    return api.getState();
  });
}

async function readSource(page: Page): Promise<string> {
  return (await continuousState(page)).documentText;
}

async function dispatchDocument(
  page: Page,
  text: string,
  anchor = text.length,
  waitForReady = true,
): Promise<void> {
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
  if (waitForReady) await expect(page.locator(FLOW_EDITOR)).toHaveAttribute("aria-busy", "false");
}

async function setSelection(page: Page, anchor: number, head = anchor): Promise<void> {
  await page.evaluate(
    ({ anchor, head, selector }) => {
      const content = document.querySelector(selector) as
        | (HTMLElement & {
            cmTile?: { view?: { focus: () => void; dispatch: (transaction: unknown) => void } };
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

function action(page: Page, name: string): Locator {
  return page.locator(`${MENU} [data-stable-inline-action="${name}"]`);
}

async function openAt(page: Page, source: string, needle: string): Promise<void> {
  const anchor = source.indexOf(needle);
  expect(anchor, `missing needle: ${needle}`).toBeGreaterThanOrEqual(0);
  await dispatchDocument(page, source, anchor);
  await expect(page.locator(TRIGGER)).toBeVisible();
  await page.locator(TRIGGER).click();
  await expect(page.locator(MENU)).toBeVisible();
}

async function openProperties(page: Page, source: string, needle: string): Promise<void> {
  await openAt(page, source, needle);
  if ((await reliabilityState(page)).mode === "structure") {
    await action(page, "properties").click();
  }
  await expect(page.locator(MENU)).toHaveAttribute("data-mode", /property-(?:core|more)/u);
}

async function waitReady(page: Page): Promise<void> {
  await expect(page.locator(FLOW_EDITOR)).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(TRIGGER)).toHaveAttribute("aria-disabled", "false");
}

test("RELIABILITY-K01 · Alt+/ → 정보 → Enter는 source를 바꾸지 않고 한 controller만 처리한다", async ({ page }) => {
  await openEditor(page);
  const source = "# 여행\n## 예약\n- [ ] 숙소 예약";
  await dispatchDocument(page, source, source.indexOf("숙소"));
  const before = await continuousState(page);
  await page.locator(CONTENT).focus();
  await page.keyboard.press("Alt+/");
  await expect(page.locator(MENU)).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator(MENU)).toHaveAttribute("data-mode", "property-core");
  const after = await continuousState(page);
  expect(after.documentText).toBe(source);
  expect(after.dispatchCount).toBe(before.dispatchCount);
  await expect(page.locator(CONTENT)).toBeFocused();
  const activeId = await page.locator(CONTENT).getAttribute("aria-activedescendant");
  expect(activeId).toBeTruthy();
  await expect(page.locator(`#${activeId}`)).toBeVisible();
});

test("RELIABILITY-F01 · pointer와 keyboard 전환 모두 CM focus·active action·Escape 원위치를 보존한다", async ({ page }) => {
  await openEditor(page, { width: 390, height: 844 });
  const source = "# 여행\n## 예약\n- [ ] 숙소 예약";
  const anchor = source.indexOf("숙소");
  await dispatchDocument(page, source, anchor);
  await page.locator(TRIGGER).click();
  await action(page, "properties").click();
  await expect(page.locator(CONTENT)).toBeFocused();
  await action(page, "property-more").click();
  await expect(page.locator(CONTENT)).toBeFocused();
  await action(page, "back-property").click();
  await expect(page.locator(CONTENT)).toBeFocused();
  await action(page, "back-structure").click();
  await expect(page.locator(CONTENT)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(MENU)).toBeHidden();
  await expect(page.locator(CONTENT)).toBeFocused();
  expect((await continuousState(page)).selection?.head).toBe(anchor);
  expect(await readSource(page)).toBe(source);
});

test("RELIABILITY-F02 · + 자체 focus는 두 animation frame 뒤에도 사라지지 않고 닫기로 복귀한다", async ({ page }) => {
  await openEditor(page);
  const source = "- [ ] 숙소 예약";
  const anchor = source.indexOf("숙소");
  await dispatchDocument(page, source, anchor);
  await page.locator(TRIGGER).focus();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.locator(TRIGGER)).toBeVisible();
  await expect(page.locator(TRIGGER)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(MENU)).toBeVisible();
  await expect(action(page, "close-menu")).toHaveAccessibleName("이어 쓰기 메뉴 닫기");
  await action(page, "close-menu").click();
  await expect(page.locator(MENU)).toBeHidden();
  await expect(page.locator(CONTENT)).toBeFocused();
  expect((await continuousState(page)).selection?.head).toBe(anchor);
  expect(await readSource(page)).toBe(source);
});

test("RELIABILITY-B01 · 0·20·50·100·200·400ms busy matrix는 stale owner write 없이 재시도된다", async ({ page }) => {
  await openEditor(page);
  for (const delay of [0, 20, 50, 100, 200, 400]) {
    const source = `- [ ] 기존 항목\n- [ ] 새 항목 ${delay}`;
    const anchor = source.lastIndexOf("새 항목");
    await dispatchDocument(page, source, anchor, false);
    if (delay > 0) await page.waitForTimeout(delay);
    const opened = await page.evaluate(() => {
      const api = (window as typeof window & {
        __FLOWME_KEYBOARD_PROPERTY_TRAY_RELIABILITY_POC__?: {
          open: () => boolean;
          close: () => void;
        };
      }).__FLOWME_KEYBOARD_PROPERTY_TRAY_RELIABILITY_POC__;
      if (!api) throw new Error("reliability API is missing");
      const result = api.open();
      if (result) api.close();
      return result;
    });
    expect(await readSource(page), `${delay}ms source`).toBe(source);
    const statusText = await page.locator(STATUS).textContent().catch(() => "");
    expect(statusText ?? "", `${delay}ms status`).not.toContain("상위 할 일을 다시 선택");
    if (!opened) await expect(page.locator(MENU)).toBeHidden();

    await waitReady(page);
    await setSelection(page, anchor);
    await page.locator(TRIGGER).click();
    await action(page, "properties").click();
    await action(page, "place").click();
    await expect.poll(() => readSource(page)).toBe(`${source}\n  - 장소: `);
    expect((await readSource(page)).match(/장소:/gu)?.length).toBe(1);
  }
});

test("RELIABILITY-A01 · menu 안의 모든 command는 menuitem이며 owner 이름과 닫기를 노출한다", async ({ page }) => {
  await openEditor(page);
  const source = "# 여행\n## 예약\n- [ ] 숙소 예약";
  await openProperties(page, source, "숙소");
  await expect(page.locator(MENU)).toHaveAttribute("role", "menu");
  await expect(page.locator(`${MENU} .tsi-menu-heading > span`)).toHaveText("숙소 예약");
  await expect(page.locator(MENU)).toHaveAccessibleName("숙소 예약 · 정보 넣기");
  const commands = page.locator(`${MENU} [data-stable-inline-action]`);
  expect(await commands.count()).toBeGreaterThanOrEqual(7);
  for (let index = 0; index < await commands.count(); index += 1) {
    await expect(commands.nth(index)).toHaveAttribute("role", "menuitem");
  }
  const closeBox = await action(page, "close-menu").boundingBox();
  expect(closeBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(closeBox?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test("RELIABILITY-P01 · 충돌·선행 조건·기존 값은 선택 전에 상태가 구분된다", async ({ page }) => {
  await openEditor(page);
  const relative = "- [ ] 숙소 예약\n  - 상대 날짜: D-3\n  - 장소: 제주공항";
  await openProperties(page, relative, "숙소");
  await expect(action(page, "date")).toHaveAttribute("aria-disabled", "true");
  await expect(action(page, "date")).toContainText("날짜와 상대 날짜 중 하나만");
  await expect(action(page, "time")).toHaveAttribute("aria-disabled", "true");
  await expect(action(page, "time")).toContainText("날짜를 먼저");
  await expect(action(page, "place")).toHaveAttribute("data-property-state", "existing");
  const before = await readSource(page);
  await page.keyboard.press("Enter");
  await expect(page.locator(STATUS)).toContainText("날짜와 상대 날짜 중 하나만");
  expect(await readSource(page)).toBe(before);
  await expect(page.locator(MENU)).toBeVisible();
});

test("RELIABILITY-P02 · 날짜·시간·장소·완료 기준·자료를 같은 Item에 exact하게 연속 추가한다", async ({ page }) => {
  await openEditor(page);
  const base = "# 여행\n## 예약\n- [ ] 숙소 예약";
  await openProperties(page, base, "숙소");
  await action(page, "date").click();
  await page.keyboard.insertText("2026-09-01");
  await waitReady(page);

  await page.locator(TRIGGER).click();
  await action(page, "time").click();
  await page.keyboard.insertText("09:30");
  await waitReady(page);

  await page.locator(TRIGGER).click();
  await action(page, "place").click();
  await page.keyboard.insertText("제주공항 1층");
  await waitReady(page);

  await page.locator(TRIGGER).click();
  await action(page, "completion").click();
  await page.keyboard.insertText("예약 번호를 기록하면 완료");
  await waitReady(page);

  await page.locator(TRIGGER).click();
  await action(page, "property-more").click();
  await action(page, "resource").click();
  await page.keyboard.insertText("[예약 페이지](https://example.com)");
  await waitReady(page);

  expect(await readSource(page)).toBe([
    base,
    "  - 날짜: 2026-09-01",
    "  - 시간: 09:30",
    "  - 장소: 제주공항 1층",
    "  - 완료 기준: 예약 번호를 기록하면 완료",
    "  - 자료: [예약 페이지](https://example.com)",
  ].join("\n"));
});

test("RELIABILITY-P03 · 같은 정보를 다시 고르면 중복 없이 기존 값만 선택한다", async ({ page }) => {
  await openEditor(page);
  const source = "- [ ] 숙소 예약\n  - 장소: 제주공항";
  await openProperties(page, source, "장소");
  const before = await continuousState(page);
  await action(page, "place").click();
  const after = await continuousState(page);
  expect(after.documentText).toBe(source);
  expect(after.dispatchCount).toBe(before.dispatchCount);
  expect(after.documentText.match(/장소:/gu)?.length).toBe(1);
  expect(after.selection?.from).toBe(source.indexOf("제주공항"));
});

test("RELIABILITY-R01 · 반복 값 뒤에도 종료를 추가하고 한 번만 다시 연다", async ({ page }) => {
  await openEditor(page);
  const base = "- [ ] 스트레칭\n  - 날짜: 2026-09-01";
  await openProperties(page, base, "스트레칭");
  await action(page, "property-more").click();
  await action(page, "repeat").click();
  await page.keyboard.insertText("매일");
  await waitReady(page);
  await expect(page.locator(ASSIST)).toHaveAttribute("data-assist-key", "repeat");
  await expect(page.getByRole("button", { name: "현재 할 일에 반복 종료 추가" })).toBeVisible();
  await page.getByRole("button", { name: "현재 할 일에 반복 종료 추가" }).click();
  await page.keyboard.insertText("6회");
  await waitReady(page);
  const expected = `${base}\n  - 반복: 매일\n  - 반복 종료: 6회`;
  expect(await readSource(page)).toBe(expected);
  await setSelection(page, expected.indexOf("반복:"));
  await expect(page.locator(ASSIST)).toHaveAttribute("data-assist-key", "repeat");
  await page.getByRole("button", { name: "현재 할 일에 반복 종료 추가" }).click();
  expect(await readSource(page)).toBe(expected);
  expect((await readSource(page)).match(/반복 종료:/gu)?.length).toBe(1);
});

test("RELIABILITY-R02 · 종료가 먼저 있는 원문은 종료 bytes를 보존하며 반복만 복구한다", async ({ page }) => {
  await openEditor(page);
  const source = "- [ ] 스트레칭\n  - 날짜: 2026-09-01\n  - 반복 종료: 6회";
  await openProperties(page, source, "반복 종료");
  await action(page, "repeat").click();
  await page.keyboard.insertText("매일");
  await waitReady(page);
  const result = await readSource(page);
  expect(result).toContain("  - 반복 종료: 6회");
  expect(result).toContain("  - 반복: 매일");
  expect(result.match(/반복 종료:/gu)?.length).toBe(1);
});

test("RELIABILITY-V01 · 390px·430~220px 가시 높이에서 owner·닫기와 core 선택이 보인다", async ({ page }) => {
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
    Object.defineProperty(window, "__setReliabilityViewport", {
      configurable: true,
      value: (height: number) => {
        visibleHeight = height;
        events.dispatchEvent(new Event("resize"));
        events.dispatchEvent(new Event("scroll"));
      },
    });
  });
  await openEditor(page, { width: 390, height: 844 });
  const source = "# 여행\n## 예약\n- [ ] 숙소 예약";
  const anchor = source.indexOf("숙소");
  await dispatchDocument(page, source, anchor);
  for (const visibleHeight of [430, 360, 300, 260, 220]) {
    await page.evaluate((height) => {
      (window as typeof window & { __setReliabilityViewport: (value: number) => void })
        .__setReliabilityViewport(height);
    }, visibleHeight);
    await setSelection(page, anchor);
    await page.locator(TRIGGER).click();
    await action(page, "properties").click();
    const geometry = await page.evaluate(({ menuSelector, firstSelector }) => {
      const menu = document.querySelector(menuSelector) as HTMLElement | null;
      const heading = menu?.querySelector(".tsi-menu-heading") as HTMLElement | null;
      const first = document.querySelector(firstSelector) as HTMLElement | null;
      if (!menu || !heading || !first) throw new Error("menu geometry missing");
      const menuRect = menu.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const firstRect = first.getBoundingClientRect();
      const visibleBottom = (window.visualViewport?.offsetTop ?? 0) + (window.visualViewport?.height ?? innerHeight);
      return {
        menuTop: menuRect.top,
        menuBottom: menuRect.bottom,
        visibleBottom,
        firstTop: firstRect.top,
        firstBottom: firstRect.bottom,
        headingBottom: headingRect.bottom,
      };
    }, { menuSelector: MENU, firstSelector: `${MENU} [data-stable-inline-action="date"]` });
    expect(geometry.menuTop, `${visibleHeight}px`).toBeGreaterThanOrEqual(0);
    expect(geometry.menuBottom, `${visibleHeight}px`).toBeLessThanOrEqual(geometry.visibleBottom + 1);
    expect(geometry.firstTop, `${visibleHeight}px`).toBeGreaterThanOrEqual(geometry.headingBottom + 3);
    expect(geometry.firstBottom, `${visibleHeight}px`).toBeLessThanOrEqual(geometry.menuBottom - 3);
    await expect(page.locator(`${MENU} .tsi-menu-heading`)).toContainText("숙소 예약");
    await expect(action(page, "close-menu")).toBeVisible();
    await expect(action(page, "property-more")).toBeVisible();
    await expect(page.locator(`${MENU} .tsi-overflow-cue`)).toHaveCount(0);
    await action(page, "completion").scrollIntoViewIfNeeded();
    const lastIsReadable = await page.evaluate(({ menuSelector, lastSelector }) => {
      const menu = document.querySelector(menuSelector)?.getBoundingClientRect();
      const option = document.querySelector(lastSelector)?.getBoundingClientRect();
      return Boolean(menu && option && option.top >= menu.top && option.bottom <= menu.bottom);
    }, { menuSelector: MENU, lastSelector: `${MENU} [data-stable-inline-action="completion"]` });
    expect(lastIsReadable, `${visibleHeight}px completion`).toBe(true);
    await action(page, "close-menu").click();
  }
});

test("RELIABILITY-V02 · 320px·200%에서도 한 core 항목을 완전히 읽고 마지막 항목에 도달한다", async ({ page }) => {
  await openEditor(page, { width: 320, height: 844, textScale: true });
  const source = "# 여행\n## 예약\n- [ ] 숙소 예약";
  await openProperties(page, source, "숙소");
  const first = action(page, "date");
  const metrics = await page.evaluate(({ menuSelector, firstSelector }) => {
    const menu = document.querySelector(menuSelector)?.getBoundingClientRect();
    const owner = document.querySelector(`${menuSelector} .tsi-menu-heading > span`) as HTMLElement | null;
    const heading = document.querySelector(`${menuSelector} .tsi-menu-heading`)?.getBoundingClientRect();
    const option = document.querySelector(firstSelector)?.getBoundingClientRect();
    return {
      firstVisible: Boolean(menu && heading && option && option.top >= heading.bottom + 3 && option.bottom <= menu.bottom - 3),
      ownerText: owner?.textContent ?? "",
      ownerFits: Boolean(owner && owner.scrollWidth <= owner.clientWidth + 1),
    };
  }, { menuSelector: MENU, firstSelector: `${MENU} [data-stable-inline-action="date"]` });
  expect(metrics.firstVisible).toBe(true);
  expect(metrics.ownerText).toBe("숙소 예약");
  expect(metrics.ownerFits).toBe(true);
  await action(page, "completion").scrollIntoViewIfNeeded();
  await expect(action(page, "completion")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("RELIABILITY-V03 · 899↔900 메뉴 폭 비율은 1.25 이하이고 8개 폭에 가로 넘침이 없다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const widths: number[] = [];
  for (const width of VIEWPORTS) {
    await openEditor(page, { width, height: width <= 390 ? 844 : 900 });
    const source = "# 여행\n## 예약\n- [ ] 숙소 예약";
    await openProperties(page, source, "숙소");
    const metrics = await page.evaluate(({ menuSelector, triggerSelector }) => {
      const menu = document.querySelector(menuSelector) as HTMLElement | null;
      const trigger = document.querySelector(triggerSelector) as HTMLElement | null;
      const visual = trigger?.querySelector("span") as HTMLElement | null;
      if (!menu || !trigger || !visual) throw new Error("viewport controls missing");
      const triggerRect = trigger.getBoundingClientRect();
      const visualRect = visual.getBoundingClientRect();
      return {
        width: menu.getBoundingClientRect().width,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        triggerWidth: triggerRect.width,
        triggerHeight: triggerRect.height,
        visualWidth: visualRect.width,
        transitionDuration: getComputedStyle(menu).transitionDuration,
      };
    }, { menuSelector: MENU, triggerSelector: TRIGGER });
    expect(metrics.overflow, `${width}px`).toBeLessThanOrEqual(1);
    expect(metrics.triggerWidth, `${width}px`).toBeGreaterThanOrEqual(44);
    expect(metrics.triggerHeight, `${width}px`).toBeGreaterThanOrEqual(44);
    expect(metrics.visualWidth, `${width}px`).toBeGreaterThanOrEqual(32);
    expect(["0s", "0.00001s", "1e-05s"]).toContain(metrics.transitionDuration);
    if (width === 899 || width === 900) widths.push(metrics.width);
  }
  expect(widths).toHaveLength(2);
  expect(Math.max(...widths) / Math.min(...widths)).toBeLessThanOrEqual(1.25);
});

test("RELIABILITY-V04 · 빈 property 예시는 같은 line에 연결되고 대비 4.5:1 이상이다", async ({ page }) => {
  await openEditor(page);
  const source = "- [ ] 숙소 예약\n  - 장소: ";
  await dispatchDocument(page, source);
  await expect(page.locator(EXAMPLE)).toContainText("서울역 2번 출구");
  const metrics = await page.locator(EXAMPLE).evaluate((example) => {
    const parse = (value: string) => {
      const channels = value.match(/[\d.]+/gu)?.slice(0, 3).map(Number) ?? [0, 0, 0];
      return channels.map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
    };
    const luminance = (channels: number[]) => channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    const style = getComputedStyle(example);
    const foreground = luminance(parse(style.color));
    const background = 1;
    const contrast = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    const line = example.closest('[data-testid="ta-authoring-flow-editor"]')
      ?.querySelector(`.cm-line[aria-describedby~="${example.id}"]`);
    const exampleRect = example.getBoundingClientRect();
    const lineRect = line?.getBoundingClientRect();
    return {
      contrast,
      described: Boolean(line),
      exampleId: example.id,
      lines: [...document.querySelectorAll(".cm-line")].map((candidate) => ({
        text: candidate.textContent,
        describedby: candidate.getAttribute("aria-describedby"),
      })),
      exampleTop: exampleRect.top,
      exampleBottom: exampleRect.bottom,
      lineTop: lineRect?.top ?? -1,
      lineBottom: lineRect?.bottom ?? -1,
    };
  });
  expect(metrics.described, JSON.stringify(metrics)).toBe(true);
  expect(metrics.contrast).toBeGreaterThanOrEqual(4.5);
  expect(metrics.exampleTop).toBeGreaterThanOrEqual(metrics.lineTop - 1);
  expect(metrics.exampleBottom).toBeLessThanOrEqual(metrics.lineBottom + 1);
});

test("RELIABILITY-S01 · 짧은 연속 입력 중 같은 owner의 +와 다음 Item은 1px 넘게 흔들리지 않는다", async ({ page }) => {
  await openEditor(page);
  const base = "- [ ] 첫 항목\n  - 설명: \n- [ ] 다음 항목";
  const valueStart = base.indexOf("설명: ") + "설명: ".length;
  await dispatchDocument(page, base, valueStart);
  const measure = () => page.evaluate(({ triggerSelector }) => {
    const trigger = document.querySelector(triggerSelector)?.getBoundingClientRect();
    const roots = [...document.querySelectorAll('.cm-line[data-flow-hierarchy-role="root-action"]')];
    const next = roots.at(-1)?.getBoundingClientRect();
    return { triggerTop: trigger?.top ?? -1, nextTop: next?.top ?? -1 };
  }, { triggerSelector: TRIGGER });
  const baseline = await measure();
  let maximumTriggerDelta = 0;
  let maximumNextDelta = 0;
  for (const character of ["예", "약", "확", "인", "함"]) {
    await page.keyboard.insertText(character);
    await waitReady(page);
    const current = await measure();
    maximumTriggerDelta = Math.max(maximumTriggerDelta, Math.abs(current.triggerTop - baseline.triggerTop));
    maximumNextDelta = Math.max(maximumNextDelta, Math.abs(current.nextTop - baseline.nextTop));
  }
  expect(maximumTriggerDelta).toBeLessThanOrEqual(1);
  expect(maximumNextDelta).toBeLessThanOrEqual(1);
  expect(await readSource(page)).toBe("- [ ] 첫 항목\n  - 설명: 예약확인함\n- [ ] 다음 항목");
});

test("RELIABILITY-U01 · property 추가는 한 번 undo되고 mode 재진입·보호 source는 exact하다", async ({ page }) => {
  await openEditor(page);
  const base = "# 여행\n## 예약\n- [ ] 숙소 예약";
  await openProperties(page, base, "숙소");
  await action(page, "place").click();
  await expect.poll(() => readSource(page)).toBe(`${base}\n  - 장소: `);
  await page.keyboard.press("Control+z");
  await expect.poll(() => readSource(page)).toBe(base);
  await page.getByTestId("ta-authoring-view-text").click();
  await page.getByTestId("ta-authoring-view-flow").click();
  await expect.poll(() => readSource(page)).toBe(base);

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
