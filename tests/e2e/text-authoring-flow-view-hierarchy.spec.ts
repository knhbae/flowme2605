import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe.configure({ timeout: 180_000 });

const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 899, height: 900 },
  { width: 900, height: 900 },
  { width: 1024, height: 900 },
  { width: 1280, height: 900 },
  { width: 1440, height: 900 },
] as const;

const HIERARCHY_SOURCE = [
  "# 이사 D-30 체크리스트",
  "## D-30 · 큰 결정과 예약",
  "- [ ] 이사 방식과 이사업체 정하기",
  "  - 설명: 포장이사·반포장이사·일반이사 중 방식을 고르고 여러 업체의 견적과 포함 범위를 비교한 뒤 예약 내용을 남깁니다. 긴 설명도 글머리 기호 아래로 돌아가지 않고 같은 본문 시작선에서 계속 읽혀야 합니다.",
  "  - [ ] 계약서에 예약 날짜와 포함 서비스를 기록하기",
  "- [x] 새집 상태 확인하고 필요한 수리 잡기",
  "  - 완료 기준: 수리가 필요한 위치와 방문 일정을 메모했습니다.",
  "- 준비 과정에서 확인한 참고 메모",
  "7. 이사 전날 최종 순서 확인",
].join("\r\n");

async function copyExactSource(page: Page): Promise<string> {
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

async function enterHierarchySource(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByTestId("text-authoring-workspace")).toBeVisible();
  const textMode = page.getByTestId("ta-authoring-view-text");
  if ((await textMode.getAttribute("aria-pressed")) !== "true") {
    await textMode.click();
  }
  await page
    .getByTestId("ta-authoring-title")
    .fill("들여쓰기 표현 검증");
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
  }, HIERARCHY_SOURCE);
  await expect.poll(() => copyExactSource(page)).toBe(HIERARCHY_SOURCE);
  await page.keyboard.press("Control+Home");
  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    /1단계 · 4개 항목/u,
  );
  await expect(page.getByTestId("ta-authoring-flow-editor")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}

async function expectNoHorizontalOverflow(
  locator: Locator,
  context: string,
): Promise<void> {
  const metrics = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(
    metrics.scrollWidth,
    `${context} must not overflow horizontally`,
  ).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

for (const viewport of VIEWPORTS) {
  test(`LIVE-HIERARCHY · ${viewport.width}px preserves hierarchy, wrap, source, and reflow`, async ({
    page,
  }) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) =>
      browserErrors.push(`pageerror: ${error.message}`),
    );
    page.on("console", (message) => {
      if (message.type() === "error") {
        browserErrors.push(`console: ${message.text()}`);
      }
    });
    await page.setViewportSize(viewport);
    await enterHierarchySource(page);

    const resultPane = page.getByTestId("ta02-390-result");
    const resultBefore = await resultPane.evaluate(
      (element) => element.innerHTML,
    );
    await page.getByTestId("ta-authoring-view-flow").click();
    const editor = page.getByTestId("ta-authoring-flow-editor-content");
    const flow = page.getByTestId("ta-authoring-flow-editor");
    await expect(editor).toHaveAttribute("aria-label", "Flow 텍스트 편집기");
    await expect(editor).toBeFocused();

    const rootActions = flow.locator(
      '.ta-flow-live-widget[data-flow-hierarchy-role="root-action"]',
    );
    const itemProperties = flow.locator(
      '.ta-flow-live-widget[data-flow-hierarchy-role="item-property"]',
    );
    const childActions = flow.locator(
      '.ta-flow-live-widget[data-flow-hierarchy-role="child-action"]',
    );
    await expect(rootActions).toHaveCount(4);
    await expect(itemProperties).toHaveCount(2);
    await expect(childActions).toHaveCount(1);
    await expect(rootActions.first()).toHaveAttribute(
      "aria-label",
      /^미완료 체크 항목,/u,
    );
    await expect(rootActions.nth(1)).toHaveAttribute(
      "aria-label",
      /^완료된 체크 항목,/u,
    );
    await expect(rootActions.nth(2)).toHaveAttribute(
      "aria-label",
      /^글머리표 항목,/u,
    );
    await expect(rootActions.nth(3)).toHaveAttribute(
      "aria-label",
      /^7번 목록 항목,/u,
    );
    await expect(itemProperties.first()).toHaveAttribute(
      "aria-label",
      /^항목 정보,/u,
    );
    await expect(childActions.first()).toHaveAttribute(
      "aria-label",
      /^하위 미완료 체크 항목,/u,
    );

    const geometry = await flow.evaluate((element) => {
      const root = element.querySelector<HTMLElement>(
        '.ta-flow-live-widget[data-flow-hierarchy-role="root-action"]',
      );
      const property = element.querySelector<HTMLElement>(
        '.ta-flow-live-widget[data-flow-hierarchy-role="item-property"]',
      );
      const child = element.querySelector<HTMLElement>(
        '.ta-flow-live-widget[data-flow-hierarchy-role="child-action"]',
      );
      const propertyText = property?.querySelector<HTMLElement>(
        ".ta-flow-live-text",
      );
      const propertyLine = property?.closest<HTMLElement>(".cm-line");
      const nextRootLine = element.querySelector<HTMLElement>(
        '.cm-line.ta-flow-live-line-root-group[data-flow-hierarchy-role="root-action"]',
      );
      if (!root || !property || !child || !propertyText || !propertyLine) {
        return null;
      }
      const range = document.createRange();
      range.selectNodeContents(propertyText);
      const textRects = [...range.getClientRects()].map((rect) => ({
        left: rect.left,
        top: rect.top,
        width: rect.width,
      }));
      const guide = getComputedStyle(propertyLine, "::before");
      return {
        rootLeft: root.getBoundingClientRect().left,
        propertyLeft: property.getBoundingClientRect().left,
        childLeft: child.getBoundingClientRect().left,
        rootDisplay: getComputedStyle(root).display,
        rootColumns: getComputedStyle(root).gridTemplateColumns,
        textRects,
        guideContent: guide.content,
        guideWidth: guide.borderInlineStartWidth,
        nextRootPaddingTop: nextRootLine
          ? Number.parseFloat(getComputedStyle(nextRootLine).paddingTop)
          : 0,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.propertyLeft).toBeGreaterThan(geometry!.rootLeft);
    expect(geometry!.childLeft).toBeGreaterThan(geometry!.rootLeft);
    expect(geometry!.rootDisplay).toBe("inline-grid");
    expect(geometry!.rootColumns.split(" ")).toHaveLength(2);
    expect(geometry!.textRects.length).toBeGreaterThan(1);
    const wrappedLineLefts = new Map<number, number>();
    for (const rect of geometry!.textRects.filter((entry) => entry.width > 1)) {
      const lineTop = Math.round(rect.top);
      wrappedLineLefts.set(
        lineTop,
        Math.min(wrappedLineLefts.get(lineTop) ?? rect.left, rect.left),
      );
    }
    const wrappedLefts = [...wrappedLineLefts.values()];
    expect(wrappedLefts.length).toBeGreaterThan(1);
    expect(Math.max(...wrappedLefts) - Math.min(...wrappedLefts)).toBeLessThan(
      2,
    );
    expect(geometry!.guideContent).not.toBe("none");
    expect(geometry!.guideWidth).toBe("1px");
    expect(geometry!.nextRootPaddingTop).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(
      flow.locator(".cm-scroller"),
      `${viewport.width}px hierarchy editor`,
    );

    const firstProperty = itemProperties.first();
    await firstProperty.click();
    const activeRawLine = flow.locator(
      '.cm-line[data-flow-hierarchy-role="item-property"][data-flow-editor-state="raw"]',
    );
    await expect(activeRawLine).toHaveAttribute("data-flow-hierarchy-depth", "1");
    await expect(activeRawLine).toContainText("  - 설명:");
    expect(
      await activeRawLine.evaluate(
        (element) =>
          getComputedStyle(element, "::before").borderInlineStartWidth,
      ),
    ).toBe("1px");

    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect(rootActions.first()).toBeVisible();
    await expectNoHorizontalOverflow(
      flow.locator(".cm-scroller"),
      `${viewport.width}px hierarchy editor at 200% text size`,
    );
    expect(await copyExactSource(page)).toBe(HIERARCHY_SOURCE);
    expect(await resultPane.evaluate((element) => element.innerHTML)).toBe(
      resultBefore,
    );
    expect(browserErrors).toEqual([]);
  });
}
