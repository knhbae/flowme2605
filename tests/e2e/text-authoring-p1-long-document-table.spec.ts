import { readFile } from "node:fs/promises";

import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

const STORAGE_KEY = "flow:text-authoring:drafts:v1";
const STRUCTURED_BUDGET_BYTES = 1024 * 1024;
const ROUTE_TRANSITION_TIMEOUT_MS = 15_000;

async function captureClipboardWrites(page: Page): Promise<void> {
  await page.evaluate(() => {
    const clipboard = navigator.clipboard;
    const originalWriteText = clipboard.writeText.bind(clipboard);
    Object.defineProperty(clipboard, "writeText", {
      configurable: true,
      value: async (value: string) => {
        Object.defineProperty(window, "__flowmeLastClipboardWrite", {
          configurable: true,
          writable: true,
          value,
        });
        await originalWriteText(value);
      },
    });
  });
}

async function expectExactClipboardWrite(
  page: Page,
  expected: string,
): Promise<void> {
  const writtenValue = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __flowmeLastClipboardWrite?: string;
        }
      ).__flowmeLastClipboardWrite ?? "",
  );
  expect(writtenValue).toBe(expected);

  // Windows exposes text clipboard line endings as CRLF even when the app wrote
  // exact LF bytes. The captured write argument proves the app boundary is exact.
  const platformValue = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(platformValue.replaceAll("\r\n", "\n")).toBe(
    expected.replaceAll("\r\n", "\n"),
  );
}

const MIXED_LONG_SOURCE = [
  "# 장문 원문 보존 점검",
  "",
  "이 문장은 표식 없는 원문 메모입니다.",
  "둘째 문장도 행동으로 만들지 않습니다.",
  "",
  "> 인용문의 들여쓰기와 기호를 그대로 둡니다.",
  "> 둘째 인용 줄입니다.",
  "",
  "```ts",
  "const total = price | fee;",
  "console.log(total);",
  "```",
  "",
  "<!-- 이 주석은 원문에만 남습니다. -->",
  '<section data-kind="note">',
  "  <p>HTML 안쪽 공백도 보존합니다.</p>",
  "</section>",
  "",
  "## 참고",
  "가격 10,000원",
  "자료 https://example.com/reference?a=1&b=2",
  "",
  "## 실행",
  "- [ ] 계약서 확인",
  "  - 설명: 서명 전에 최종 문구를 읽습니다.",
  "  - 날짜: 2026-08-20",
  "",
  "마지막 표식 없는 문장입니다.",
].join("\n");

const SAFE_TABLE_CASES = [
  {
    name: "CSV",
    source: [
      "상품,가격,메모,링크,비고",
      'A,"10,000원","첫 줄',
      '둘째 줄",https://example.com/item?a=1&b=2,',
      'B,"12,000원","따옴표 ""포함""",https://example.com/item?c=3,배송',
    ].join("\n"),
    expectedRows: 2,
    expectedFirstRowRaw: [
      'A,"10,000원","첫 줄',
      '둘째 줄",https://example.com/item?a=1&b=2,',
    ].join("\n"),
    expectedCells: [
      "A",
      "10,000원",
      "첫 줄\n둘째 줄",
      "https://example.com/item?a=1&b=2",
      '따옴표 "포함"',
    ],
  },
  {
    name: "TSV",
    source: [
      "상품\t가격\t메모\t링크\t비고",
      'A\t10,000원\t"첫 줄',
      '둘째 줄"\thttps://example.com/item?a=1&b=2\t',
      "B\t12,000원\t배송 전 확인\thttps://example.com/item?c=3\t배송",
    ].join("\n"),
    expectedRows: 2,
    expectedFirstRowRaw: [
      'A\t10,000원\t"첫 줄',
      '둘째 줄"\thttps://example.com/item?a=1&b=2\t',
    ].join("\n"),
    expectedCells: [
      "A",
      "10,000원",
      "첫 줄\n둘째 줄",
      "https://example.com/item?a=1&b=2",
      "배송 전 확인",
    ],
  },
  {
    name: "Markdown",
    source: [
      "| 상품 | 가격 | 메모 | 링크 | 비고 |",
      "| --- | ---: | --- | --- | --- |",
      "| A | 10,000원 | 경로 \\| 포함 | https://example.com/item?a=1&b=2 | |",
      "| B | 12,000원 | 배송 전 확인 | https://example.com/item?c=3 | 배송 |",
    ].join("\n"),
    expectedRows: 2,
    expectedFirstRowRaw:
      "| A | 10,000원 | 경로 \\| 포함 | https://example.com/item?a=1&b=2 | |",
    expectedCells: [
      "A",
      "10,000원",
      "경로 | 포함",
      "https://example.com/item?a=1&b=2",
      "배송 전 확인",
    ],
  },
] as const;

const MALFORMED_TABLE_SOURCE = [
  "# 손실 가능 표와 안전한 일정",
  "## 실행",
  "- [ ] 안전한 일정 확인",
  "  - 날짜: 2026-08-20",
  "",
  "상품,가격,메모",
  'A,"10,000원","닫히지 않은 셀',
  "둘째 줄",
  "B,12,000원,배송",
].join("\n");

async function clearAuthoringStorage(page: Page) {
  await page.goto("/icon.svg");
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("flow:text-authoring:")) localStorage.removeItem(key);
    }
  });
}

async function openProduct(
  page: Page,
  options: { width?: number; height?: number; path?: string } = {},
) {
  await page.setViewportSize({
    width: options.width ?? 1440,
    height: options.height ?? 900,
  });
  await clearAuthoringStorage(page);
  await page.goto(options.path ?? "/flows/new");
  await expect(page.getByTestId("text-authoring-workspace")).toBeVisible();
}

async function enterSource(page: Page, title: string, rawText: string) {
  await page.getByTestId("ta-authoring-title").fill(title);
  await page.getByTestId("ta-authoring-source").fill(rawText);
  await expect
    .poll(async () =>
      page
        .getByTestId("ta-authoring-result-slot-memo")
        .getAttribute("data-eligible"),
    )
    .toBe("true");
}

async function continueSavedDraftAndReload(page: Page, receipt: Locator) {
  await expect(page).toHaveURL(/\/flows\/authoring\/[^/]+$/u, {
    timeout: ROUTE_TRANSITION_TIMEOUT_MS,
  });
  await receipt.getByRole("button", { name: "계속 편집" }).click();
  await expect(receipt).toHaveCount(0);
  await page.reload();
}

async function openNavigator(page: Page) {
  const trigger = page.getByTestId("ta-authoring-document-navigator-open");
  await expect(trigger).toBeVisible();
  await trigger.click();
  const navigator = page.getByTestId("ta-authoring-document-navigator");
  await expect(navigator).toBeVisible();
  return { navigator, trigger };
}

async function expectSelectedSourceBytes(source: Locator, expected: string) {
  await expect
    .poll(() =>
      source.evaluate((element) => {
        const textarea = element as HTMLTextAreaElement;
        return textarea.value.slice(
          textarea.selectionStart,
          textarea.selectionEnd,
        );
      }),
    )
    .toBe(expected);
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true);
}

async function expectMinimumTargetHeight(locator: Locator, minimum = 44) {
  const box = await locator.boundingBox();
  expect(box, "interactive target must have a rendered box").not.toBeNull();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(minimum);
}

async function settledAuthoringStorage(page: Page) {
  let previous = "";
  let stableReads = 0;
  await expect
    .poll(async () => {
      const current = await page.evaluate(
        (key) => localStorage.getItem(key) ?? "",
        STORAGE_KEY,
      );
      stableReads = current && current === previous ? stableReads + 1 : 0;
      previous = current;
      return stableReads;
    })
    .toBeGreaterThanOrEqual(3);
  return previous;
}

async function authoringContentSnapshot(page: Page) {
  await settledAuthoringStorage(page);
  return page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) ?? "{}") as {
      drafts?: Record<
        string,
        {
          document?: {
            rawText?: string;
            revision?: { revisionId?: string };
            parseResult?: { parseResultId?: string };
          };
          revisionId?: string;
        }
      >;
      recoveries?: Record<
        string,
        {
          document?: {
            rawText?: string;
            revision?: { revisionId?: string };
            parseResult?: { parseResultId?: string };
          };
          revisionId?: string;
        }
      >;
    };
    const summarize = (
      records:
        | Record<
            string,
            {
              document?: {
                rawText?: string;
                revision?: { revisionId?: string };
                parseResult?: { parseResultId?: string };
              };
              revisionId?: string;
            }
          >
        | undefined,
    ) =>
      Object.entries(records ?? {})
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([id, record]) => ({
          id,
          rawText: record.document?.rawText,
          storedRevisionId: record.revisionId,
          documentRevisionId: record.document?.revision?.revisionId,
          parseResultId: record.document?.parseResult?.parseResultId,
        }));
    return {
      drafts: summarize(state.drafts),
      recoveries: summarize(state.recoveries),
    };
  }, STORAGE_KEY);
}

test("P1C-H01 · mixed raw blocks keep exact bytes, locator, and save re-entry", async ({
  page,
}) => {
  await openProduct(page);
  await enterSource(page, "장문 원문", MIXED_LONG_SOURCE);

  const source = page.getByTestId("ta-authoring-source");
  const { navigator } = await openNavigator(page);
  const codeEntry = navigator
    .getByTestId("ta-authoring-document-entry")
    .filter({ hasText: "코드" });
  await expect(codeEntry).toHaveCount(1);
  await expect(codeEntry).toHaveAttribute("data-source-start-line", "9");
  await expect(codeEntry).toHaveAttribute("data-source-end-line", "12");
  const locatorId = await codeEntry.getAttribute("data-locator-id");
  expect(locatorId).toBeTruthy();

  await codeEntry.click();
  await navigator.getByTestId("ta-authoring-document-locate").click();
  await expectSelectedSourceBytes(
    source,
    `${[
      "```ts",
      "const total = price | fee;",
      "console.log(total);",
      "```",
    ].join("\n")}\n`,
  );
  await expect(source).toHaveValue(MIXED_LONG_SOURCE);

  await page.getByTestId("ta-authoring-result-slot-memo").click();
  await expect(
    page.getByTestId("ta-authoring-structured-text-preview"),
  ).toContainText("const total = price | fee;");
  await page.getByTestId("ta-authoring-save-desktop").click();
  const receipt = page.getByTestId("ta-authoring-receipt");
  await expect(receipt).toContainText("초안을 저장했어요");
  await continueSavedDraftAndReload(page, receipt);
  await expect(source).toHaveValue(MIXED_LONG_SOURCE);

  const reopened = await openNavigator(page);
  const reopenedCode = reopened.navigator
    .getByTestId("ta-authoring-document-entry")
    .filter({ hasText: "코드" });
  await expect(reopenedCode).toHaveAttribute(
    "data-locator-id",
    locatorId ?? "",
  );
});

for (const scenario of SAFE_TABLE_CASES) {
  test(`P1C-H02/F03 · safe ${scenario.name} preserves cells and creates no false Todo`, async ({
    page,
  }) => {
    await openProduct(page);
    await enterSource(page, `${scenario.name} 표`, scenario.source);

    await expect(
      page.getByTestId("ta-authoring-result-slot-calendar"),
    ).toHaveAttribute("data-eligible", "false");
    await expect(
      page.getByTestId("ta-authoring-result-slot-todo"),
    ).toHaveAttribute("data-eligible", "false");
    const sheetSlot = page.getByTestId("ta-authoring-result-slot-sheet");
    await expect(sheetSlot).toHaveAttribute("data-state", "active");
    await sheetSlot.click();

    const table = page.getByTestId("ta-authoring-long-table");
    await expect(table).toBeVisible();
    await expect(table.getByRole("row")).toHaveCount(scenario.expectedRows + 1);
    await expect(table.getByTestId("ta-authoring-long-table-cell")).toHaveCount(
      scenario.expectedRows * 5,
    );
    for (const value of scenario.expectedCells) {
      await expect(table).toContainText(value);
    }
    await expect(table.locator("thead th")).toHaveCount(7);
    for (const heading of ["상품", "가격", "메모", "링크", "비고"]) {
      await expect(
        table.getByRole("columnheader", { name: heading, exact: true }),
      ).toBeVisible();
    }
    await expect(table.locator("tbody tr")).toHaveCount(scenario.expectedRows);
    const firstCell = table.getByTestId("ta-authoring-long-table-cell").first();
    await expect(firstCell).toHaveAttribute("data-source-start-offset", /\d+/u);
    await expect(firstCell).toHaveAttribute("data-source-end-offset", /\d+/u);
    await expect(
      page.getByTestId("public-flow-artifact-preview-row-edit"),
    ).toHaveCount(0);

    await table
      .getByTestId("ta-authoring-long-table-row-source")
      .first()
      .click();
    await expectSelectedSourceBytes(
      page.getByTestId("ta-authoring-source"),
      scenario.expectedFirstRowRaw,
    );
  });
}

test("P1C-F01 · malformed table blocks only affected result and preserves raw copy/download", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openProduct(page);
  await enterSource(page, "손실 가능 표", MALFORMED_TABLE_SOURCE);

  await expect(
    page.getByTestId("ta-authoring-result-slot-calendar"),
  ).toHaveAttribute("data-state", "active");
  await expect(
    page.getByTestId("ta-authoring-result-slot-todo"),
  ).toHaveAttribute("data-state", "active");
  await expect(
    page.getByTestId("ta-authoring-result-slot-sheet"),
  ).toHaveAttribute("data-state", "blocked");
  await expect(
    page.getByTestId("ta-authoring-result-slot-memo"),
  ).toHaveAttribute("data-state", "active");

  const blockedSheet = page.getByTestId("ta-authoring-result-slot-sheet");
  await blockedSheet.focus();
  const slotDescription = page.getByTestId(
    "ta-authoring-result-slot-description",
  );
  await expect(slotDescription).toContainText(/표|Excel/u);
  await expect(slotDescription).toContainText(/원문|TXT/u);
  await page.getByTestId("ta-authoring-result-slot-source").click();
  await expectSelectedSourceBytes(
    page.getByTestId("ta-authoring-source"),
    [
      "상품,가격,메모",
      'A,"10,000원","닫히지 않은 셀',
      "둘째 줄",
      "B,12,000원,배송",
    ].join("\n"),
  );

  await page.getByTestId("ta-authoring-result-slot-memo").click();
  await captureClipboardWrites(page);
  await page.getByTestId("ta-authoring-raw-source-copy").click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __flowmeLastClipboardWrite?: string;
            }
          ).__flowmeLastClipboardWrite ?? "",
      ),
    )
    .toBe(MALFORMED_TABLE_SOURCE);
  await expectExactClipboardWrite(page, MALFORMED_TABLE_SOURCE);

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("ta-authoring-raw-source-download").click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  expect(await readFile(downloadPath ?? "", "utf8")).toBe(
    MALFORMED_TABLE_SOURCE,
  );
  await expect(
    page.getByRole("button", { name: /Excel.*(완료|저장|받)/u }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({
      hasText: /Excel.*(완료|저장|받)/u,
    }),
  ).toHaveCount(0);
});

test("P1C-F02 · structured budget fails closed without truncating raw source", async ({
  page,
  context,
}) => {
  test.slow();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openProduct(page);

  const line = "원문 보존을 확인하는 합성 장문입니다.\n";
  const repeats = Math.ceil(STRUCTURED_BUDGET_BYTES / Buffer.byteLength(line));
  const oversizedSource = `# 구조 처리 한도 초과\n${line.repeat(repeats)}`;
  expect(Buffer.byteLength(oversizedSource)).toBeGreaterThan(
    STRUCTURED_BUDGET_BYTES,
  );
  await page.getByTestId("ta-authoring-title").fill("구조 처리 한도");
  const source = page.getByTestId("ta-authoring-source");
  await page.evaluate(
    (value) => navigator.clipboard.writeText(value),
    oversizedSource,
  );
  await source.focus();
  await page.keyboard.press("Control+V");
  await expect
    .poll(async () =>
      page
        .getByTestId("ta-authoring-result-slot-memo")
        .getAttribute("data-eligible"),
    )
    .toBe("true");
  await expect(source).toHaveValue(oversizedSource);
  for (const artifact of ["calendar", "todo", "sheet"] as const) {
    await expect(
      page.getByTestId(`ta-authoring-result-slot-${artifact}`),
    ).toHaveAttribute("data-state", "blocked");
  }
  await expect(
    page.getByTestId("ta-authoring-result-slot-memo"),
  ).toHaveAttribute("data-state", "active");
  await page.getByTestId("ta-authoring-result-slot-memo").click();
  await expect(page.getByText(/원문.*그대로|구조 결과/u).first()).toBeVisible();

  await captureClipboardWrites(page);
  await page.getByTestId("ta-authoring-raw-source-copy").click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __flowmeLastClipboardWrite?: string;
            }
          ).__flowmeLastClipboardWrite ?? "",
      ),
    )
    .toBe(oversizedSource);
  await expectExactClipboardWrite(page, oversizedSource);

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("ta-authoring-raw-source-download").click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  expect(await readFile(downloadPath ?? "", "utf8")).toBe(oversizedSource);

  const save = page.getByTestId("ta-authoring-save-desktop");
  await expect(save).toBeEnabled();
  await save.click();
  const receipt = page.getByTestId("ta-authoring-receipt");
  await expect(receipt).toContainText("초안을 저장했어요");
  const storedRawText = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) ?? "{}") as {
      drafts?: Record<string, { document?: { rawText?: string } }>;
    };
    return Object.values(state.drafts ?? {})[0]?.document?.rawText ?? "";
  }, STORAGE_KEY);
  expect(storedRawText).toBe(oversizedSource);
  await continueSavedDraftAndReload(page, receipt);
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    oversizedSource,
  );
});

test("P1C-P01 · preview and navigator are write-zero and raw blocks expose no edit action", async ({
  page,
}) => {
  await openProduct(page);
  await enterSource(page, "읽기 전용 분석", MIXED_LONG_SOURCE);
  const before = await authoringContentSnapshot(page);

  const { navigator, trigger } = await openNavigator(page);
  await navigator
    .getByTestId("ta-authoring-document-entry")
    .filter({ hasText: "코드" })
    .click();
  await navigator.getByTestId("ta-authoring-document-locate").click();
  await expect(
    page.getByTestId("public-flow-artifact-preview-row-edit"),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /코드.*수정/u })).toHaveCount(
    0,
  );

  await page.getByTestId("ta-authoring-result-slot-memo").click();
  await openNavigator(page);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  const after = await authoringContentSnapshot(page);
  expect(after).toEqual(before);
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    MIXED_LONG_SOURCE,
  );
});

test("P1C-R01 · locate/return survives staged breakpoints and eight responsive widths", async ({
  page,
}) => {
  await openProduct(page, { width: 899, height: 700 });
  await enterSource(page, "재진입 확인", MALFORMED_TABLE_SOURCE);
  const source = page.getByTestId("ta-authoring-source");

  await page.getByTestId("ta-authoring-stage-result").click();
  await page.getByTestId("ta-authoring-result-slot-memo").click();
  const blockedSheet = page.getByTestId("ta-authoring-result-slot-sheet");
  await blockedSheet.focus();
  await page.getByTestId("ta-authoring-result-slot-source").click();
  await expect(page.getByTestId("ta02-390-input")).toHaveAttribute(
    "data-stage-active",
    "true",
  );
  await expectSelectedSourceBytes(
    source,
    [
      "상품,가격,메모",
      'A,"10,000원","닫히지 않은 셀',
      "둘째 줄",
      "B,12,000원,배송",
    ].join("\n"),
  );

  await page.getByTestId("ta-authoring-source-location-return").click();
  await expect(page.getByTestId("ta02-390-result")).toHaveAttribute(
    "data-stage-active",
    "true",
  );
  await expect(
    page.getByTestId("ta-authoring-result-slot-memo"),
  ).toHaveAttribute("data-selected", "true");
  await expect(
    page.getByTestId("ta-authoring-result-slot-source"),
  ).toBeFocused();

  await page.getByTestId("ta-authoring-stage-input").click();
  const opened = await openNavigator(page);
  await expectMinimumTargetHeight(opened.trigger);
  const tableEntry = opened.navigator
    .locator(
      '[data-testid="ta-authoring-document-entry"][data-block-kind="table"]',
    )
    .first();
  await tableEntry.click();
  await opened.navigator.getByTestId("ta-authoring-document-locate").click();
  await expectSelectedSourceBytes(
    source,
    [
      "상품,가격,메모",
      'A,"10,000원","닫히지 않은 셀',
      "둘째 줄",
      "B,12,000원,배송",
    ].join("\n"),
  );

  for (const width of [320, 360, 390, 899, 900, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 700 });
    await expectNoHorizontalOverflow(page);
    await expect(source).toHaveValue(MALFORMED_TABLE_SOURCE);
    if (width < 900) {
      await expect(page.getByTestId("ta-authoring-stage-input")).toBeVisible();
      await page.getByTestId("ta-authoring-stage-result").click();
      await expect(page.getByTestId("ta02-390-result")).toHaveAttribute(
        "data-stage-active",
        "true",
      );
      await page.getByTestId("ta-authoring-stage-input").click();
    } else {
      await expect(page.getByTestId("ta-authoring-stage-input")).toBeHidden();
      await expect(page.getByTestId("ta02-390-input")).toBeVisible();
      await expect(page.getByTestId("ta02-390-result")).toBeVisible();
    }
    const navigatorAtWidth = await openNavigator(page);
    await page.keyboard.press("Escape");
    await expect(navigatorAtWidth.trigger).toBeFocused();
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.setViewportSize({ width: 390, height: 600 });
  await expectNoHorizontalOverflow(page);
  await expect(source).toBeVisible();
  await expectMinimumTargetHeight(
    page.getByTestId("ta-authoring-document-navigator-open"),
  );
});
