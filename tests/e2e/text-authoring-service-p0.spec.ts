import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const STORAGE_KEY = "flow:text-authoring:drafts:v1";

const THREE_RUN_SOURCE = [
  "# 주간 점검",
  "## 실행",
  "- [ ] 정기 자료 확인",
  "  - 설명: 이번 주 자료를 확인합니다.",
  "  - 날짜: 2026-08-03",
  "  - 반복: 매주 월요일",
  "  - 반복 종료: 3회",
  "  - 자료: [자료 문서](https://example.com/resource)",
  "  - 출처: [공식 출처](https://example.com/source)",
  "  - [ ] 링크가 열리는지 확인",
  "  - [ ] 확인 내용을 메모",
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
  path = "/flows/new",
  width = 1440,
  height = 900,
) {
  await page.setViewportSize({ width, height });
  await clearAuthoringStorage(page);
  await page.goto(path);
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

test("product entry starts blank, keeps QA data out, and preserves prose in TXT", async ({
  page,
}) => {
  await openProduct(page);

  const source = page.getByTestId("ta-authoring-source");
  await expect(source).toBeFocused();
  await expect(source).toHaveValue("");
  await expect(page.getByTestId("ta-authoring-title")).toHaveValue("");
  await expect(page.getByTestId("ta-authoring-example-count")).toHaveCount(0);
  await expect(page.getByText("전체 예시 보기", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByTestId("ta-authoring-ownership")).toHaveCount(0);
  const productMarkup = await page
    .getByTestId("text-authoring-workspace")
    .evaluate((element) => element.innerHTML);
  expect(productMarkup).not.toMatch(
    /data-scenario-id|fixtureVersion|\bparser\b|\brevision\b|예외 처리|전체 검토 예시/iu,
  );

  const prose = "회의에서 확인한 내용입니다.\n다음 주에 다시 읽습니다.";
  await enterSource(page, "회의 메모", prose);
  await page.getByTestId("ta-authoring-result-slot-memo").click();
  const textPreview = page.getByTestId("ta-authoring-structured-text-preview");
  await expect(textPreview).toContainText("회의에서 확인한 내용입니다.");
  await expect
    .poll(async () => {
      const value = (await textPreview.textContent()) ?? "";
      return value.split("회의에서 확인한 내용입니다.").length - 1;
    })
    .toBe(1);
  await expect(
    page.getByTestId("ta-authoring-item-review-summary"),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("ta-authoring-result-slot-calendar"),
  ).toHaveAttribute("data-eligible", "false");
  await expect(
    page.getByTestId("ta-authoring-result-slot-todo"),
  ).toHaveAttribute("data-eligible", "false");
  await expect(
    page.getByTestId("ta-authoring-result-slot-sheet"),
  ).toHaveAttribute("data-eligible", "false");
});

test("one recurring Todo projects three occurrences into all four result surfaces", async ({
  page,
}) => {
  await openProduct(page);
  await enterSource(page, "주간 점검", THREE_RUN_SOURCE);

  for (const artifact of ["calendar", "todo", "sheet", "memo"] as const) {
    const slot = page.getByTestId(`ta-authoring-result-slot-${artifact}`);
    await expect(slot).toHaveAttribute("data-eligible", "true");
    await slot.click();
    if (artifact === "calendar") {
      await expect(
        page.locator(
          '[data-testid="ta-authoring-calendar-day"][data-event-count="1"]',
        ),
      ).toHaveCount(3);
    } else if (artifact === "todo") {
      await expect(
        page
          .getByTestId("flow-artifact-checklist-preview")
          .locator("[data-occurrence-id]"),
      ).toHaveCount(3);
    } else if (artifact === "sheet") {
      await expect(
        page
          .getByTestId("flow-artifact-sheet-preview")
          .locator("tr[data-occurrence-id]"),
      ).toHaveCount(3);
    } else {
      const preview = page.getByTestId("ta-authoring-structured-text-preview");
      await expect(preview).toContainText("정기 자료 확인 · 1회차");
      await expect(preview).toContainText("정기 자료 확인 · 2회차");
      await expect(preview).toContainText("정기 자료 확인 · 3회차");
    }
  }

  await page.getByTestId("ta-authoring-result-slot-calendar").click();
  await expect(
    page.locator(
      '[data-testid="ta-authoring-calendar-day"][data-event-count="1"]',
    ),
  ).toHaveCount(3);

  await page.getByTestId("ta-authoring-result-slot-todo").click();
  await expect(
    page.getByText("링크가 열리는지 확인", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("확인 내용을 메모", { exact: true }),
  ).toBeVisible();
});

test("explicit save, route re-entry, and ready status use one coherent revision", async ({
  page,
}) => {
  await openProduct(page, "/flows/authoring");
  await page.getByRole("button", { name: "새 콘텐츠", exact: true }).click();
  await enterSource(page, "주간 점검", THREE_RUN_SOURCE);

  await page.getByTestId("ta-authoring-save-desktop").click();
  const receipt = page.getByTestId("ta-authoring-receipt");
  await expect(receipt).toContainText("초안을 저장했어요");

  const storedAfterSave = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) ?? "{}") as {
      drafts: Record<string, Record<string, unknown>>;
    };
    const [draftId, record] = Object.entries(state.drafts)[0] ?? [];
    return { draftId, record };
  }, STORAGE_KEY);
  expect(storedAfterSave.draftId).toBeTruthy();
  expect(storedAfterSave.record).toMatchObject({
    coherentRevisionPair: expect.any(Object),
    explicitSaveReceipt: expect.any(Object),
  });

  await receipt.getByRole("button", { name: "내 콘텐츠" }).click();
  const row = page.getByTestId("ta-authoring-library-row").first();
  await expect(row).toContainText("주간 점검");
  await row.getByRole("button", { name: "열기" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/flows/authoring/${storedAfterSave.draftId}$`, "u"),
  );
  await page.goBack();
  await expect(page).toHaveURL(/\/flows\/authoring$/u);
  await expect(page.getByTestId("ta-authoring-library-row")).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(
    new RegExp(`/flows/authoring/${storedAfterSave.draftId}$`, "u"),
  );

  const ready = page.getByTestId("ta-authoring-mark-ready");
  await expect(ready).toBeEnabled();
  await ready.click();
  await expect(ready).toHaveText("준비 완료");
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key) ?? "{}") as {
          drafts: Record<
            string,
            { status?: string; readyReceipt?: { sideEffects?: unknown } }
          >;
        };
        return Object.values(state.drafts)[0];
      }, STORAGE_KEY),
    )
    .toMatchObject({
      status: "ready",
      readyReceipt: {
        sideEffects: { publish: 0, network: 0, p35: 0 },
      },
    });

  await page
    .getByTestId("ta-authoring-source")
    .fill(`${THREE_RUN_SOURCE}\n수정한 메모입니다.`);
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key) ?? "{}") as {
          drafts: Record<string, { status?: string; readyReceipt?: unknown }>;
        };
        const record = Object.values(state.drafts)[0];
        return {
          status: record?.status,
          hasReady: Boolean(record?.readyReceipt),
        };
      }, STORAGE_KEY),
    )
    .toEqual({ status: "previewed", hasReady: false });
});

test("product library renames, duplicates, archives, and restores without search or history", async ({
  page,
}) => {
  await openProduct(page, "/flows/authoring");
  await page.getByRole("button", { name: "새 콘텐츠", exact: true }).click();
  await enterSource(page, "원본 콘텐츠", "# 원본\n- [ ] 확인하기");
  await page.getByTestId("ta-authoring-save-desktop").click();
  await page
    .getByTestId("ta-authoring-receipt")
    .getByRole("button", { name: "내 콘텐츠" })
    .click();

  let row = page.getByTestId("ta-authoring-library-row").first();
  await row.locator("summary").click();
  await row.getByRole("button", { name: "이름 변경" }).click();
  await row.getByLabel("콘텐츠 이름").fill("바꾼 콘텐츠");
  await row.getByRole("button", { name: "이름 저장" }).click();
  await expect(row).toContainText("바꾼 콘텐츠");

  await row.locator("summary").click();
  await row.getByRole("button", { name: "복제" }).click();
  await expect(page.getByTestId("ta-authoring-library-row")).toHaveCount(2);
  await expect(
    page.getByText("사본 1 · 바꾼 콘텐츠", { exact: true }),
  ).toBeVisible();

  row = page
    .getByTestId("ta-authoring-library-row")
    .filter({ hasText: "바꾼 콘텐츠" })
    .filter({ hasNotText: "사본 1" });
  await row.locator("summary").click();
  await row.getByRole("button", { name: "보관" }).click();
  await expect(page.getByText("되돌리기", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(
    page.getByText("콘텐츠 목록으로 되돌렸습니다", { exact: false }),
  ).toBeVisible();

  await expect(page.getByTestId("ta-authoring-search")).toHaveCount(0);
  await expect(page.getByText("저장 기록", { exact: true })).toHaveCount(0);
});

test("safe right-side edit rewrites the working source while factual tables stay Sheet and TXT only", async ({
  page,
}) => {
  await openProduct(page);
  await enterSource(
    page,
    "수정 확인",
    "# 수정 확인\n- [ ] 원래 제목\n  - 설명: 원래 설명",
  );
  await page.getByTestId("ta-authoring-result-slot-todo").click();
  await page
    .getByTestId("ta-authoring-artifact-row")
    .first()
    .getByTestId("public-flow-artifact-preview-row-edit")
    .click();
  const inspector = page.getByTestId("ta-authoring-inspector");
  await inspector.getByLabel("제목").fill("바뀐 제목");
  await inspector.getByRole("button", { name: "원문과 결과에 적용" }).click();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    /- \[ \] 바뀐 제목/u,
  );
  await expect(
    page.getByTestId("ta-authoring-artifact-row").first(),
  ).toContainText("바뀐 제목");

  const compareTrigger = page.getByTestId(
    "ta-authoring-open-source-comparison",
  );
  await compareTrigger.click();
  const comparison = page.getByTestId("ta-authoring-source-comparison");
  await expect(comparison).toContainText("- [ ] 원래 제목");
  await expect(comparison).toContainText("- [ ] 바뀐 제목");
  await expect(
    comparison.getByTestId("ta-authoring-source-comparison-block"),
  ).toHaveCount(1);
  await comparison.getByRole("button", { name: "확인 완료" }).click();
  await expect(compareTrigger).toBeFocused();

  const table = [
    "# 가격 비교",
    "| 후보 | 가격 |",
    "| --- | --- |",
    "| A | 10,000원 |",
    "| B | 12,000원 |",
  ].join("\n");
  await page.getByTestId("ta-authoring-source").fill(table);
  await expect(
    page.getByTestId("ta-authoring-result-slot-sheet"),
  ).toHaveAttribute("data-eligible", "true");
  await expect(
    page.getByTestId("ta-authoring-result-slot-memo"),
  ).toHaveAttribute("data-eligible", "true");
  await expect(
    page.getByTestId("ta-authoring-result-slot-todo"),
  ).toHaveAttribute("data-eligible", "false");
  await expect(
    page.getByTestId("ta-authoring-result-slot-calendar"),
  ).toHaveAttribute("data-eligible", "false");
  await page.getByTestId("ta-authoring-result-slot-sheet").click();
  await expect(
    page.getByTestId("public-flow-artifact-preview-row-edit"),
  ).toHaveCount(0);
});

test("calendar display sorting rewrites source only after confirmation and supports one undo", async ({
  page,
}) => {
  const source = [
    "# 날짜 정렬",
    "## 실행",
    "- [x] 늦은 항목",
    "  - 날짜: 2026-08-10",
    "- [ ] 이른 항목",
    "  - 날짜: 2026-08-03",
  ].join("\n");
  const sorted = [
    "# 날짜 정렬",
    "## 실행",
    "- [ ] 이른 항목",
    "  - 날짜: 2026-08-03",
    "- [x] 늦은 항목",
    "  - 날짜: 2026-08-10",
  ].join("\n");

  await openProduct(page);
  await enterSource(page, "날짜 정렬", source);
  await page.getByTestId("ta-authoring-result-slot-calendar").click();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(source);
  await page.getByTestId("ta-authoring-align-source-order").click();
  const dialog = page.getByTestId("ta-authoring-align-confirm");
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(source);
  await dialog.getByTestId("ta-authoring-align-apply").click();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(sorted);
  await page.getByTestId("ta-authoring-align-source-order-undo").click();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(source);
});

test("eight P0 widths keep the active pane reachable without horizontal overflow", async ({
  page,
}) => {
  await openProduct(page);
  await enterSource(page, "반응형 확인", THREE_RUN_SOURCE);
  await expectMinimumTargetHeight(
    page.getByTestId("ta-authoring-example-select"),
  );
  await page.getByTestId("ta-authoring-result-slot-todo").click();
  await expectMinimumTargetHeight(
    page.getByTestId("ta-authoring-preview-links").locator("a").first(),
  );
  await page.getByTestId("ta-authoring-result-slot-sheet").click();
  await expectMinimumTargetHeight(
    page.getByTestId("flow-artifact-sheet-preview").locator("a").first(),
  );

  for (const width of [320, 360, 390, 899, 900, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 700 });
    await expectNoHorizontalOverflow(page);
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
    await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
      THREE_RUN_SOURCE,
    );
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await expect(page.getByTestId("ta-authoring-source")).toBeVisible();
});

test("composition changes preserve result selection, source selection, and a dirty Inspector", async ({
  page,
}) => {
  await openProduct(page, "/flows/new", 1024, 800);
  await enterSource(page, "구성 전환", THREE_RUN_SOURCE);
  const source = page.getByTestId("ta-authoring-source");
  const selectedSourceText = "정기 자료 확인";
  const selectionStart = THREE_RUN_SOURCE.indexOf(selectedSourceText);
  expect(selectionStart).toBeGreaterThanOrEqual(0);
  await source.evaluate(
    (element, selection) => {
      const textarea = element as HTMLTextAreaElement;
      textarea.focus();
      textarea.setSelectionRange(
        selection.start,
        selection.start + selection.length,
      );
    },
    { start: selectionStart, length: selectedSourceText.length },
  );

  await page.getByTestId("ta-authoring-result-slot-todo").click();
  await page
    .getByTestId("public-flow-artifact-preview-row-edit")
    .first()
    .click();
  const inspector = page.getByTestId("ta-authoring-inspector");
  await expect(inspector).toBeVisible();
  const title = inspector.getByRole("textbox", { name: "제목" });
  await title.fill("구성 전환 중인 제목");

  for (const width of [899, 900, 390, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(inspector).toBeVisible();
    await expect(title).toHaveValue("구성 전환 중인 제목");
    await expect(
      page.getByTestId("ta-authoring-result-slot-todo"),
    ).toHaveAttribute("data-selected", "true");
    await expectNoHorizontalOverflow(page);
  }

  await inspector.getByRole("button", { name: "닫기" }).click();
  await expect(source).toBeVisible();
  await expect
    .poll(() =>
      source.evaluate((element) => {
        const textarea = element as HTMLTextAreaElement;
        return [textarea.selectionStart, textarea.selectionEnd];
      }),
    )
    .toEqual([selectionStart, selectionStart + selectedSourceText.length]);
});

test("a crash before the first explicit save offers the exact working recovery", async ({
  page,
}) => {
  await openProduct(page);
  await enterSource(
    page,
    "첫 저장 전 복구",
    "첫 저장 전에 작성한 평문 메모입니다.",
  );
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key) ?? "{}") as {
          recoveries?: Record<string, unknown>;
        };
        return Object.keys(state.recoveries ?? {}).length;
      }, STORAGE_KEY),
    )
    .toBe(1);

  await page.reload();
  const recovery = page.getByRole("region", {
    name: "작성 중이던 초안이 있습니다",
  });
  await expect(recovery).toBeVisible();
  await recovery.getByRole("button", { name: "이어서 편집" }).click();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    "첫 저장 전에 작성한 평문 메모입니다.",
  );
});

test("keyboard-only plain text journey reaches result and explicit save", async ({
  page,
}) => {
  await openProduct(page, "/flows/new", 390, 844);
  await expect(page.getByTestId("ta-authoring-source")).toBeFocused();
  await page.keyboard.type("키보드로 작성한 평문 메모입니다.");
  await expect(
    page.getByTestId("ta-authoring-result-slot-memo"),
  ).toHaveAttribute("data-eligible", "true");

  await page.keyboard.press("Control+Enter");
  await expect(page.getByTestId("ta02-390-result")).toHaveAttribute(
    "data-stage-active",
    "true",
  );
  await expect(page.getByTestId("ta-authoring-result-slot-memo")).toBeFocused();
  await page.keyboard.press("Control+Enter");
  await expect(page.getByTestId("ta-authoring-receipt")).toContainText(
    "초안을 저장했어요",
  );
});
