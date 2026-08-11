import { readFile } from "node:fs/promises";

import { expect, test, type Locator, type Page } from "@playwright/test";
import { SIMPLE_TEXT_AUTHORING_EXAMPLE } from "../../components/flow/text-authoring/examples";
import type { TextAuthoringDocument } from "../../lib/flow/text-authoring/types";

test.describe.configure({ timeout: 90_000 });

const LEGACY_BUNDLES_STORAGE_KEY = "flow_builder_mvp_bundles_v11";
const TEXT_AUTHORING_DRAFTS_STORAGE_KEY = "flow:text-authoring:drafts:v1";
const JEJU_MEMO = [
  "# 제주 여행 준비",
  "## 할 일",
  "- [ ] 항공권 확인",
  "- [ ] 숙소 예약번호 정리",
  "- [ ] 렌터카 예약",
  "- [ ] 준비물 체크",
  "- [ ] 출발 전날 온라인 체크인",
].join("\n");
const JEJU_EXPORT_MEMO = [
  "# 제주 여행 준비",
  "## 할 일",
  "- [ ] 항공권 확인",
  "  - 설명: 예약 정보를 확인합니다.",
  "  - 완료 기준: 확인 내용을 기록했습니다.",
  "- [ ] 숙소 예약번호 정리",
  "  - 설명: 예약번호를 한곳에 정리합니다.",
  "  - 완료 기준: 예약번호를 저장했습니다.",
  "- [ ] 렌터카 예약",
  "  - 설명: 이용 조건을 확인합니다.",
  "  - 완료 기준: 예약을 마쳤습니다.",
  "- [ ] 준비물 체크",
  "  - 설명: 필요한 물건을 확인합니다.",
  "  - 완료 기준: 준비물 확인을 마쳤습니다.",
  "- [ ] 출발 전날 온라인 체크인",
  "  - 설명: 항공사 안내를 확인합니다.",
  "  - 완료 기준: 체크인을 마쳤습니다.",
].join("\n");
const SYNTAX_EXAMPLE = SIMPLE_TEXT_AUTHORING_EXAMPLE.rawText;
const REVIEWABLE_UNSUPPORTED_MEMO = [
  "# 제주 여행 준비",
  "## 예약",
  "- [ ] 항공권 확인",
  "- [ ] 숙소 예약",
  "> 여행은 여름에 사람이 많습니다.",
].join("\n");

type StoredAuthoringDraft = {
  draftId: string;
  ownership: string;
  status: string;
  revisionId: string;
  activeStage?: "input" | "structure" | "result";
  document: TextAuthoringDocument;
  history: Array<{ kind: string }>;
};

type StoredAuthoringState = {
  schemaVersion: number;
  drafts: Record<string, StoredAuthoringDraft>;
  recoveries: Record<string, unknown>;
};

async function openAuthoring(
  page: Page,
  width: number,
  height: number,
  path = "/flows/new",
) {
  await page.setViewportSize({ width, height });
  await page.goto("/icon.svg");
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("flow:text-authoring:")) localStorage.removeItem(key);
    }
  });
  await page.goto(path);
  await expect(page.getByTestId("text-authoring-workspace")).toBeVisible();
}

async function selectProductExample(page: Page, id: string) {
  const select = page.getByTestId("ta-authoring-example-select");
  const value = `product:${id}`;
  await select.selectOption(value);
  await expect(select).toHaveValue(value);
}

async function openSourceSettings(page: Page) {
  const settings = page.getByTestId("ta-authoring-source-settings");
  if ((await settings.getAttribute("open")) === null) {
    await settings.locator("summary").click();
  }
  await expect(settings).toHaveAttribute("open", "");
}

async function selectOwnership(
  page: Page,
  label: "개인 초안" | "제작자 초안" | "수정 제안",
) {
  await openSourceSettings(page);
  const ownership = page.getByTestId("ta-authoring-ownership");
  const visibleOption = ownership.locator("label").filter({ hasText: label });
  await expect(visibleOption).toHaveCount(1);
  await visibleOption.click();
  await expect(ownership.getByRole("radio", { name: label })).toBeChecked();
}

function saveDraftButton(page: Page): Locator {
  return page.getByTestId(
    page.viewportSize()?.width && page.viewportSize()!.width >= 900
      ? "ta-authoring-save-desktop"
      : "ta-authoring-save",
  );
}

function usesCompactAuthoringFlow(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1440) < 900;
}

async function applyCurrentDraft(page: Page) {
  await expect
    .poll(() => page.getByTestId("ta-authoring-item").count())
    .toBeGreaterThan(0);
  if (!usesCompactAuthoringFlow(page)) return;
  const parseButton = page.getByTestId("ta-authoring-parse");
  await expect(parseButton).toBeVisible();
  await parseButton.click();
  await expect(page.getByTestId("ta-authoring-stage-result")).toHaveAttribute(
    "aria-current",
    "step",
  );
}

async function showResults(page: Page) {
  if (!usesCompactAuthoringFlow(page)) return;
  const resultStage = page.getByTestId("ta-authoring-stage-result");
  if ((await resultStage.getAttribute("aria-current")) !== "step") {
    await resultStage.click();
  }
  await expect(page.getByTestId("ta-authoring-stage-result")).toHaveAttribute(
    "aria-current",
    "step",
  );
}

async function openItemReview(page: Page) {
  const trigger = page.getByTestId("ta-authoring-item-review-open");
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByTestId("ta-authoring-item-review")).toBeVisible();
}

async function openStructureEditor(page: Page) {
  const editor = page.getByTestId("ta-authoring-structure-editor");
  if (!(await editor.isVisible())) {
    await page.getByTestId("ta-authoring-structure-edit-toggle").click();
  }
  await expect(editor).toBeVisible();
  return editor;
}

async function parseJeju(page: Page, rawText = JEJU_MEMO) {
  await page.getByTestId("ta-authoring-title").fill("제주 여행 준비");
  await openSourceSettings(page);
  await page.getByTestId("ta-authoring-source-meta").fill("개인 여행 메모");
  await page.getByTestId("ta-authoring-source").fill(rawText);
  await applyCurrentDraft(page);
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(5);
}

async function readStoredAuthoringState(
  page: Page,
): Promise<StoredAuthoringState> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error(`Missing text authoring state: ${key}`);
    return JSON.parse(raw) as StoredAuthoringState;
  }, TEXT_AUTHORING_DRAFTS_STORAGE_KEY);
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

async function scrollToEnd(locator: Locator) {
  await expect
    .poll(() =>
      locator.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
        return Math.abs(
          element.scrollTop - (element.scrollHeight - element.clientHeight),
        );
      }),
    )
    .toBeLessThanOrEqual(1);
}

async function expectReachableAboveFooter(page: Page, target: Locator) {
  await expect(target).toBeInViewport();
  const metrics = await target.evaluate((element) => {
    const footer = document.querySelector(".ta-workspace-footer");
    if (!(footer instanceof HTMLElement)) {
      throw new Error("Missing text-authoring workspace footer");
    }
    const targetRect = element.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    return {
      targetTop: targetRect.top,
      targetBottom: targetRect.bottom,
      footerTop: footerRect.top,
      footerBottom: footerRect.bottom,
      viewportHeight: window.innerHeight,
    };
  });

  expect(metrics.targetTop).toBeGreaterThanOrEqual(-1);
  expect(metrics.targetBottom).toBeLessThanOrEqual(metrics.footerTop + 1);
  expect(metrics.footerTop).toBeLessThan(metrics.viewportHeight);
  expect(metrics.footerBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
}

test("TA keeps every supported syntax available on demand, switches top examples, and reflects edits without a parse click", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);

  const exampleSwitcher = page.getByTestId("ta-authoring-example-switcher");
  await expect(exampleSwitcher).toBeVisible();
  await expect(page.getByText("예시 불러오기")).toHaveCount(0);
  const exampleSelect = page.getByTestId("ta-authoring-example-select");
  await expect(exampleSelect).toHaveValue("product:simple");
  await expect(page.getByTestId("ta-authoring-title")).toHaveValue(
    "제목입니다.",
  );
  await expect(page.getByTestId("ta-authoring-source-meta")).toHaveValue(
    "작성 형식 예시",
  );
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    SYNTAX_EXAMPLE,
  );
  await expect(page.getByTestId("ta-authoring-source")).not.toHaveValue(
    /(?:상세|자세히|예상 시간):/u,
  );
  const syntaxHelp = page.getByTestId("ta-authoring-syntax-guide");
  await expect(syntaxHelp).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("ta-authoring-syntax-key")).toHaveCount(0);
  await syntaxHelp.click();
  await expect(syntaxHelp).toHaveAttribute("aria-expanded", "true");
  const syntaxPanel = page.getByTestId("ta-authoring-syntax-help-panel");
  await expect(page.getByTestId("ta-authoring-syntax-key")).toContainText(
    "- [ ] 항목",
  );
  await expect(page.getByTestId("ta-authoring-syntax-key")).toContainText(
    "두 칸 들여쓴 - 키: 값은 바로 위 항목의 정보",
  );
  await expect(syntaxPanel).toContainText(
    "항목을 새 묶음으로 나눌 때는 ## 단계를 하나 더 만드세요",
  );
  await expect(syntaxPanel).toContainText("날짜: 2026-08-03");
  await expect(syntaxPanel).toContainText("상대 날짜: D-3");
  await expect(syntaxPanel).toContainText(
    "날짜가 있는 반복 항목은 캘린더·할 일·표·Excel·TXT 결과에 같은 회차로 보여 줍니다",
  );
  await expect(syntaxPanel).toContainText(
    "자료: [참고 자료](https://example.com)",
  );
  await expect(syntaxPanel).not.toContainText("탭·CSV·Markdown 표");
  await expect(syntaxHelp).toHaveAttribute("aria-controls", /authoring-help-/u);
  await syntaxHelp.press("Escape");
  await expect(syntaxHelp).toHaveAttribute("aria-expanded", "false");
  await expect(syntaxPanel).toHaveCount(0);

  await expect(page.getByTestId("ta-authoring-source-help")).toHaveCount(0);
  const sourceSettings = page.getByTestId("ta-authoring-source-settings");
  await expect(sourceSettings).not.toHaveAttribute("open", "");
  await sourceSettings.locator("summary").click();
  await expect(sourceSettings).toHaveAttribute("open", "");
  await expect(page.getByTestId("ta-authoring-source-boundary")).toContainText(
    "직접 붙여 넣은 내용만 해석",
  );
  const simpleItems = page.getByTestId("ta-authoring-item");
  await expect(simpleItems).toHaveCount(3);
  await expect(page.getByTestId("ta-authoring-item-marker")).toHaveCount(3);
  await expect(
    simpleItems.nth(0).getByTestId("ta-authoring-item-marker"),
  ).toHaveText("- [ ]");
  await expect(page.getByRole("button", { name: "항목 들여쓰기" })).toHaveCount(
    0,
  );
  await expect(simpleItems.nth(0)).toContainText("첫 번째 항목입니다");
  await expect(simpleItems.nth(0)).toContainText("2026-08-03");
  await expect(simpleItems.nth(0)).toContainText("09:00");
  await expect(simpleItems.nth(0)).toContainText("반복 매주 월요일");
  await expect(simpleItems.nth(1)).toContainText("두 번째 항목입니다");
  await expect(simpleItems.nth(1)).toContainText("D-3");
  await expect(simpleItems.nth(2)).toContainText("날짜 없는 항목입니다");
  await expect(page.getByTestId("ta-authoring-preflight")).toHaveAttribute(
    "data-count",
    "5",
  );
  const simpleResultRows = page.getByTestId("ta-authoring-artifact-row");
  await expect(simpleResultRows).toHaveCount(5);
  await expect(simpleResultRows.nth(0)).toContainText("첫 번째 항목입니다");
  await expect(simpleResultRows.nth(3)).toContainText("두 번째 항목입니다");
  await expect(simpleResultRows.nth(4)).toContainText("날짜 없는 항목입니다");
  await expect(
    simpleResultRows.nth(0).getByTestId("ta-authoring-preview-subchecks"),
  ).toContainText("첫 번째 확인입니다");
  await expect(page.getByTestId("ta-authoring-preflight")).toContainText(
    "가져갈 내용 5개",
  );
  await expect(page.getByRole("button", { name: "캘린더 4" })).toBeVisible();
  await expect(
    page.getByTestId("ta-authoring-recurrence-preview-summary"),
  ).toContainText("첫 번째 항목입니다. · 매주 월요일 · 3/3회");
  await expect(page.getByTestId("ta-authoring-stage-input")).toHaveAttribute(
    "aria-current",
    "step",
  );
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      TEXT_AUTHORING_DRAFTS_STORAGE_KEY,
    ),
  ).toBeNull();

  await selectProductExample(page, "jeju");
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(JEJU_MEMO);
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(5);
  await expect(page.getByTestId("ta-authoring-preflight")).toHaveAttribute(
    "data-count",
    "5",
  );
  await expect(exampleSelect).toHaveValue("product:jeju");
  await expect(page.getByTestId("ta-authoring-stage-input")).toHaveAttribute(
    "aria-current",
    "step",
  );
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      TEXT_AUTHORING_DRAFTS_STORAGE_KEY,
    ),
  ).toBeNull();

  await selectProductExample(page, "simple");
  const liveText = `${SYNTAX_EXAMPLE}\n- [ ] 자동 반영 항목입니다.`;
  await page.getByTestId("ta-authoring-source").fill(liveText);
  await expect(exampleSelect).toHaveValue("");
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(4);
  await expect(page.getByTestId("ta-authoring-preflight")).toHaveAttribute(
    "data-count",
    "6",
  );
  await expect(page.getByTestId("ta-authoring-stage-input")).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    "자동 반영했습니다",
  );
  await exampleSelect.selectOption("product:course");
  const exampleResetDialog = page.getByTestId("ta-authoring-reset-dialog");
  await expect(exampleResetDialog).toContainText(
    "K-MOOC 14주 학습 할 일 예시로 바꿀까요?",
  );
  await exampleResetDialog.getByRole("button", { name: "계속 작성" }).click();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(liveText);
  await expectNoHorizontalOverflow(page);
});

test("TA keeps an imported Markdown H1 and the title field synchronized", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);
  const source = page.getByTestId("ta-authoring-source");
  const title = page.getByTestId("ta-authoring-title");

  await source.fill(
    [
      "# 붙여 넣은 제목",
      "## 첫 번째 단계",
      "- [ ] 첫 번째 항목",
      "  설명: 설명입니다.",
    ].join("\n"),
  );
  await expect(title).toHaveValue("붙여 넣은 제목");
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(1);

  await title.fill("제목란에서 바꾼 제목");
  await expect(source).toHaveValue(/^# 제목란에서 바꾼 제목$/mu);
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(1);
});

test("TA normalizes a legacy draft whose stored title disagrees with its Markdown H1", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);
  const source = page.getByTestId("ta-authoring-source");

  await source.fill(
    [
      "# 원문에 저장된 제목",
      "## 단계",
      "- [ ] 첫 번째 항목",
      "  설명: 설명입니다.",
    ].join("\n"),
  );
  await expect(page.getByTestId("ta-authoring-title")).toHaveValue(
    "원문에 저장된 제목",
  );
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(1);

  await applyCurrentDraft(page);
  await showResults(page);
  await saveDraftButton(page).click();
  const receipt = page.getByTestId("ta-authoring-receipt");
  await expect(receipt).toBeVisible();

  await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error("Missing saved legacy-draft fixture");
    const state = JSON.parse(raw) as StoredAuthoringState;
    const draft = Object.values(state.drafts)[0];
    draft.document.title = "제목란에 저장된 옛 제목";
    draft.document.parseResult.canonical.flow.title = "제목란에 저장된 옛 제목";
    localStorage.setItem(key, JSON.stringify(state));
  }, TEXT_AUTHORING_DRAFTS_STORAGE_KEY);

  await receipt.getByTestId("ta-authoring-library-toggle").click();
  const draftRow = page.getByTestId("ta-authoring-library-row").first();
  await draftRow.getByRole("button", { name: "이어서 작성" }).click();

  await expect(page.getByTestId("ta-authoring-title")).toHaveValue(
    "원문에 저장된 제목",
  );
  await expect(source).toHaveValue(/^# 원문에 저장된 제목$/mu);

  await saveDraftButton(page).click();
  const stored = await readStoredAuthoringState(page);
  const normalizedDraft = Object.values(stored.drafts)[0];
  expect(normalizedDraft.document.title).toBe("원문에 저장된 제목");
  expect(normalizedDraft.document.parseResult.canonical.flow.title).toBe(
    "원문에 저장된 제목",
  );
});

test("TA top examples expose the real input and converted result for moving, K-MOOC, and Allblanc", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);

  await selectProductExample(page, "moving");
  await expect(page.getByTestId("ta-authoring-title")).toHaveValue(
    "이사 D-30 체크리스트",
  );
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    /상대 날짜: D-Day/u,
  );
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    /상대 날짜: D-30/u,
  );
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(27);
  await expect(page.getByRole("button", { name: "캘린더 27" })).toBeVisible();
  await expect(page.getByTestId("ta-authoring-preflight")).toHaveAttribute(
    "data-count",
    "27",
  );

  await selectProductExample(page, "course");
  await expect(page.getByTestId("ta-authoring-title")).toHaveValue(
    "Introduction to Data Analysis",
  );
  await expect(page.getByTestId("ta-authoring-source-meta")).toHaveValue(
    "https://www.kmooc.kr/view/course/detail/20097",
  );
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(14);
  const courseSource = await page
    .getByTestId("ta-authoring-source")
    .inputValue();
  expect(courseSource).toMatch(/^# Introduction to Data Analysis/mu);
  expect(courseSource).not.toContain("\t");
  expect(courseSource.match(/^- \[ \] /gmu)).toHaveLength(14);
  expect(courseSource).toMatch(/^  - 주차: /mu);
  expect(courseSource).toMatch(/^  - 주차 활동: /mu);
  await expect(page.getByRole("button", { name: "표·Excel 14" })).toBeVisible();
  await expect(page.getByTestId("ta-authoring-preflight")).toHaveAttribute(
    "data-count",
    "14",
  );

  await selectProductExample(page, "allblanc");
  await expect(page.getByTestId("ta-authoring-title")).toHaveValue(
    "Allblanc 7일 복근 챌린지",
  );
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    /https:\/\/www\.youtube\.com\/watch\?v=W2fS4TqeWCc/u,
  );
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(7);
  await expect(page.getByRole("button", { name: "캘린더 7" })).toBeVisible();
  await expect(page.getByTestId("ta-authoring-preflight")).toHaveAttribute(
    "data-count",
    "7",
  );
  await expect(page.getByTestId("ta-authoring-example-select")).toHaveValue(
    "product:allblanc",
  );

  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      TEXT_AUTHORING_DRAFTS_STORAGE_KEY,
    ),
  ).toBeNull();
  await expectNoHorizontalOverflow(page);
});

test("TA product selector exposes five representative examples and four fixed result slots", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);

  const exampleSelect = page.getByTestId("ta-authoring-example-select");
  await expect(exampleSelect).toBeVisible();
  await expect(page.getByTestId("ta-authoring-example-count")).toHaveText(
    "대표 5개",
  );
  await expect(exampleSelect.locator("[data-example-id]")).toHaveCount(5);
  await expect(exampleSelect.locator("[data-example-scenario-id]")).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("link", { name: "전체 예시 보기" }),
  ).toBeVisible();
  const resultSlots = page.locator(
    '[data-testid^="ta-authoring-result-slot-"]',
  );
  await expect(resultSlots).toHaveCount(4);
  await expect(
    page.getByTestId("ta-authoring-result-slot-calendar"),
  ).toContainText("캘린더");
  await expect(page.getByTestId("ta-authoring-result-slot-todo")).toContainText(
    "할 일",
  );
  await expect(
    page.getByTestId("ta-authoring-result-slot-sheet"),
  ).toContainText("표·Excel");
  await expect(page.getByTestId("ta-authoring-result-slot-memo")).toContainText(
    "TXT",
  );
  expect(
    await resultSlots.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-testid")),
    ),
  ).toEqual([
    "ta-authoring-result-slot-calendar",
    "ta-authoring-result-slot-todo",
    "ta-authoring-result-slot-sheet",
    "ta-authoring-result-slot-memo",
  ]);
  const beforeGeometry = await resultSlots.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return [Math.round(rect.x), Math.round(rect.width)];
    }),
  );
  const recommendedBefore = await resultSlots.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-recommended")),
  );
  await page.getByTestId("ta-authoring-result-slot-memo").click();
  expect(
    await resultSlots.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return [Math.round(rect.x), Math.round(rect.width)];
      }),
    ),
  ).toEqual(beforeGeometry);
  expect(
    await resultSlots.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-recommended")),
    ),
  ).toEqual(recommendedBefore);
  await expect(page.getByText("내부 QA", { exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("TA review dropdown exposes one basic syntax example plus every validated example", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900, "/flows/new?authoringQa=1");

  const exampleSelect = page.getByTestId("ta-authoring-example-select");
  await expect(exampleSelect).toBeVisible();
  await expect(page.getByTestId("ta-authoring-example-count")).toHaveText(
    "전체 예시 31개",
  );
  await expect(exampleSelect.locator('option[value=""]')).toHaveText(
    "전체 검토 예시 선택",
  );
  await expect(
    exampleSelect.locator('optgroup[label="작성 문법 · 1개"]'),
  ).toHaveCount(1);
  await expect(exampleSelect.locator("[data-example-id]")).toHaveCount(1);
  await expect(
    page
      .getByTestId("ta-authoring-example-category-existing_content")
      .locator("[data-example-scenario-id]"),
  ).toHaveCount(8);
  await expect(
    page
      .getByTestId("ta-authoring-example-category-condition_change")
      .locator("[data-example-scenario-id]"),
  ).toHaveCount(11);
  await expect(
    page
      .getByTestId("ta-authoring-example-category-compatibility")
      .locator("[data-example-scenario-id]"),
  ).toHaveCount(6);
  await expect(
    page
      .getByTestId("ta-authoring-example-category-exception_handling")
      .locator("[data-example-scenario-id]"),
  ).toHaveCount(5);
  await expect(
    page.getByTestId("ta-authoring-example-category-review_needed"),
  ).toHaveCount(0);
  await expect(exampleSelect.locator("[data-example-scenario-id]")).toHaveCount(
    30,
  );
  await expect(
    exampleSelect.locator("[data-example-id], [data-example-scenario-id]"),
  ).toHaveCount(31);
  await expect(page.getByRole("link", { name: "대표 5개 비교" })).toBeVisible();

  await exampleSelect.selectOption("qa:change-relative-anchor-aug");
  await expect(exampleSelect).toHaveValue("qa:change-relative-anchor-aug");
  await expect(page.getByTestId("ta-authoring-preview-anchor")).toHaveValue(
    "2026-08-10",
  );
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "캘린더 2" })).toBeVisible();

  await exampleSelect.selectOption("qa:change-relative-anchor-sep");
  await expect(exampleSelect).toHaveValue("qa:change-relative-anchor-sep");
  await expect(page.getByTestId("ta-authoring-preview-anchor")).toHaveValue(
    "2026-09-10",
  );
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "캘린더 2" })).toBeVisible();

  await exampleSelect.selectOption("qa:content-librivox-38");
  await expect(exampleSelect).toHaveValue("qa:content-librivox-38");
  await expect(page.getByTestId("ta-authoring-preview-anchor")).toHaveCount(0);
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(38);
  const librivoxSource = await page
    .getByTestId("ta-authoring-source")
    .inputValue();
  expect(librivoxSource).toMatch(/^# Anne of Green Gables, Version 5/mu);
  expect(librivoxSource).not.toContain("\t");
  expect(librivoxSource.match(/^- \[ \] /gmu)).toHaveLength(38);
  expect(librivoxSource).toMatch(/^  - 순서: /mu);
  expect(librivoxSource).toMatch(/^  - 재생시간: /mu);
  await expect(page.getByRole("button", { name: "표·Excel 38" })).toBeVisible();
  await expect(page.getByTestId("ta-authoring-preflight")).toHaveAttribute(
    "data-count",
    "38",
  );

  await exampleSelect.selectOption("qa:error-ambiguous-date");
  await expect(exampleSelect).toHaveValue("qa:error-ambiguous-date");
  await expect(page.getByTestId("ta-authoring-issue-card")).toHaveCount(1);
  const calendarSlot = page.getByTestId("ta-authoring-result-slot-calendar");
  await expect(calendarSlot).toBeDisabled();
  await expect(calendarSlot).toHaveAttribute("title", /날짜|캘린더/u);
  const source = page.getByTestId("ta-authoring-source");
  await source.fill(
    (await source.inputValue()).replace("8월 3일", "2026-08-03"),
  );
  await expect(page.getByTestId("ta-authoring-issue-card")).toHaveCount(0);
  await expect(calendarSlot).toBeEnabled();

  await source.fill(
    [
      "# URL 확인",
      "## 실행",
      "- [ ] 링크 확인",
      "  - 출처: [잘못된 링크](not-a-url)",
    ].join("\n"),
  );
  await expect(page.getByTestId("ta-authoring-issue-card")).toHaveCount(1);
  await expect(calendarSlot).toBeDisabled();
  await expect(
    page.getByTestId("ta-authoring-result-slot-todo"),
  ).toBeDisabled();
  await expect(
    page.getByTestId("ta-authoring-result-slot-sheet"),
  ).toBeDisabled();
  await page.getByTestId("ta-authoring-result-slot-memo").click();
  const memoValidations = page.getByTestId("ta-authoring-memo-validations");
  await expect(memoValidations).toContainText("URL 입력 확인 필요");
  await memoValidations.getByRole("button", { name: "원문에서 수정" }).click();
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
    .toContain("출처: [잘못된 링크](not-a-url)");
  await expectNoHorizontalOverflow(page);
});

test("TA projects the latest three-run example into a month calendar, todo, sheet, and TXT with the same three occurrences", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900, "/flows/new?authoringQa=1");
  const exampleSelect = page.getByTestId("ta-authoring-example-select");
  await exampleSelect.selectOption("qa:change-latest-grammar-showcase");
  await expect(exampleSelect).toHaveValue("qa:change-latest-grammar-showcase");
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(1);

  const calendarSlot = page.getByTestId("ta-authoring-result-slot-calendar");
  const todoSlot = page.getByTestId("ta-authoring-result-slot-todo");
  const sheetSlot = page.getByTestId("ta-authoring-result-slot-sheet");
  const txtSlot = page.getByTestId("ta-authoring-result-slot-memo");
  await expect(calendarSlot).toContainText("3");
  await expect(todoSlot).toContainText("3");
  await expect(sheetSlot).toContainText("3");
  await expect(txtSlot).toContainText("3");

  await calendarSlot.click();
  await expect(
    page.getByTestId("flow-artifact-calendar-preview"),
  ).toBeVisible();
  await expect(
    page.getByTestId("ta-authoring-calendar-month-label"),
  ).toHaveText("2026년 8월");
  await expect(
    page.getByTestId("ta-authoring-calendar-month-grid"),
  ).toBeVisible();
  const datedCalendarCells = page.locator(
    '[data-testid="ta-authoring-calendar-day"][data-event-count="1"]',
  );
  await expect(datedCalendarCells).toHaveCount(3);
  for (const date of ["2026-08-03", "2026-08-10", "2026-08-17"]) {
    await expect(
      page.locator(
        `[data-testid="ta-authoring-calendar-day"][data-date="${date}"]`,
      ),
    ).toHaveAttribute("data-event-count", "1");
  }
  await page
    .locator(
      '[data-testid="ta-authoring-calendar-day"][data-date="2026-08-10"]',
    )
    .click();
  await expect(
    page.getByTestId("ta-authoring-calendar-selected-date"),
  ).toHaveAttribute("data-date", "2026-08-10");
  await expect(
    page
      .getByTestId("ta-authoring-calendar-selected-list")
      .getByTestId("ta-authoring-artifact-row"),
  ).toHaveCount(1);
  await expect(
    page.getByTestId("ta-authoring-calendar-selected-list"),
  ).toContainText("정기 자료 확인");
  await page.getByTestId("ta-authoring-calendar-next-month").click();
  await expect(
    page.getByTestId("ta-authoring-calendar-month-label"),
  ).toHaveText("2026년 9월");
  await page.getByTestId("ta-authoring-calendar-prev-month").click();
  await expect(
    page.getByTestId("ta-authoring-calendar-month-label"),
  ).toHaveText("2026년 8월");

  await todoSlot.click();
  const todoRows = page.getByTestId("ta-authoring-artifact-row");
  await expect(todoRows).toHaveCount(3);
  await expect(page.getByTestId("ta-authoring-preview-subchecks")).toHaveCount(
    3,
  );

  await sheetSlot.click();
  const sheetRows = page
    .getByTestId("flow-artifact-sheet-preview")
    .getByTestId("ta-authoring-artifact-row");
  await expect(sheetRows).toHaveCount(3);
  await expect(
    page.getByTestId("flow-artifact-sheet-preview").locator("thead"),
  ).toContainText("회차");
  await expect(
    page.getByTestId("flow-artifact-sheet-preview").locator("thead"),
  ).toContainText("날짜");
  const sheetOccurrenceIds = await sheetRows.evaluateAll((rows) =>
    rows.map((row) => row.getAttribute("data-occurrence-id")),
  );
  expect(sheetOccurrenceIds.every(Boolean)).toBe(true);
  expect(new Set(sheetOccurrenceIds).size).toBe(3);

  await txtSlot.click();
  const portableText = await page
    .getByTestId("ta-authoring-structured-text-preview")
    .inputValue();
  expect(portableText.match(/☐ 정기 자료 확인 · [123]회차/gmu)).toHaveLength(3);
  for (const date of ["2026-08-03", "2026-08-10", "2026-08-17"]) {
    expect(portableText).toContain(`날짜: ${date}`);
  }
  await expectNoHorizontalOverflow(page);
});

test("TA covers a daily-until routine and same-day calendar time order", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900, "/flows/new?authoringQa=1");
  const exampleSelect = page.getByTestId("ta-authoring-example-select");

  await exampleSelect.selectOption("qa:change-daily-repeat-until-date");
  await expect(exampleSelect).toHaveValue("qa:change-daily-repeat-until-date");
  for (const testId of [
    "ta-authoring-result-slot-calendar",
    "ta-authoring-result-slot-todo",
    "ta-authoring-result-slot-sheet",
    "ta-authoring-result-slot-memo",
  ]) {
    await expect(page.getByTestId(testId)).toContainText("5");
  }
  await page.getByTestId("ta-authoring-result-slot-calendar").click();
  for (const date of [
    "2026-08-11",
    "2026-08-12",
    "2026-08-13",
    "2026-08-14",
    "2026-08-15",
  ]) {
    await expect(
      page.locator(
        `[data-testid="ta-authoring-calendar-day"][data-date="${date}"]`,
      ),
    ).toHaveAttribute("data-event-count", "1");
  }

  await exampleSelect.selectOption("qa:change-same-day-timed-agenda");
  await expect(exampleSelect).toHaveValue("qa:change-same-day-timed-agenda");
  await page.getByTestId("ta-authoring-result-slot-calendar").click();
  await page
    .locator(
      '[data-testid="ta-authoring-calendar-day"][data-date="2026-08-20"]',
    )
    .click();
  const agendaRows = page
    .getByTestId("ta-authoring-calendar-selected-list")
    .getByTestId("ta-authoring-artifact-row");
  await expect(agendaRows).toHaveCount(4);
  const agendaTexts = await agendaRows.allTextContents();
  expect(agendaTexts[0]).toContain("행사 안내 확인");
  expect(agendaTexts[1]).toContain("참가 등록");
  expect(agendaTexts[1]).toContain("09:00");
  expect(agendaTexts[2]).toContain("발표 세션 참여");
  expect(agendaTexts[2]).toContain("10:00");
  expect(agendaTexts[3]).toContain("네트워킹 메모 정리");
  expect(agendaTexts[3]).toContain("16:30");
  await expectNoHorizontalOverflow(page);
});

test("TA mobile QA dropdown reaches every group and opens the 38-row Flow example without overflow", async ({
  page,
}) => {
  await openAuthoring(page, 390, 600, "/flows/new?authoringQa=1");
  const exampleSelect = page.getByTestId("ta-authoring-example-select");
  await expect(exampleSelect).toBeVisible();
  await expect(
    page.getByTestId("ta-authoring-example-category-exception_handling"),
  ).toBeAttached();
  await expect(
    page.getByTestId("ta-authoring-example-category-review_needed"),
  ).toHaveCount(0);
  await exampleSelect.selectOption("qa:content-librivox-38");
  await expect(exampleSelect).toHaveValue("qa:content-librivox-38");
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(38);
  const sourceText = await page.getByTestId("ta-authoring-source").inputValue();
  expect(sourceText).not.toContain("\t");
  expect(sourceText.match(/^- \[ \] /gmu)).toHaveLength(38);

  await showResults(page);
  await openItemReview(page);
  const reviewDialog = page.getByTestId("ta-authoring-item-review");
  await scrollToEnd(reviewDialog.locator("[data-authoring-dialog-scroll]"));
  await expect(page.getByTestId("ta-authoring-item").last()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("TA dropdown can reapply the same validated example after a structure-only edit", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900, "/flows/new?authoringQa=1");
  const exampleSelect = page.getByTestId("ta-authoring-example-select");
  await exampleSelect.selectOption("qa:content-new-car-14");
  await expect(exampleSelect).toHaveValue("qa:content-new-car-14");

  await openItemReview(page);
  await page.getByTestId("ta-authoring-structure-edit-toggle").click();
  const structureEditor = page.getByTestId("ta-authoring-structure-editor");
  const roleSelect = structureEditor.getByLabel("선택 항목 역할");
  await roleSelect.selectOption("guide");
  await expect(exampleSelect).toHaveValue("");
  await structureEditor.getByRole("button", { name: "수정 닫기" }).click();
  await page
    .getByTestId("ta-authoring-item-review")
    .getByRole("button", { name: "검토 닫기" })
    .click();

  await exampleSelect.selectOption("qa:content-new-car-14");
  const resetDialog = page.getByTestId("ta-authoring-reset-dialog");
  await expect(resetDialog).toContainText("신차 구매 8단계 예시로 바꿀까요?");
  await resetDialog.getByRole("button", { name: "계속 작성" }).click();
  await expect(exampleSelect).toHaveValue("");
  await openItemReview(page);
  await page.getByTestId("ta-authoring-structure-edit-toggle").click();
  await expect(
    page
      .getByTestId("ta-authoring-structure-editor")
      .getByLabel("선택 항목 역할"),
  ).toHaveValue("guide");
  await page
    .getByTestId("ta-authoring-structure-editor")
    .getByRole("button", { name: "수정 닫기" })
    .click();
  await page
    .getByTestId("ta-authoring-item-review")
    .getByRole("button", { name: "검토 닫기" })
    .click();

  await exampleSelect.selectOption("qa:content-new-car-14");
  await resetDialog
    .getByRole("button", { name: "변경사항 버리고 예시 보기" })
    .click();
  await expect(exampleSelect).toHaveValue("qa:content-new-car-14");
  await openItemReview(page);
  await page.getByTestId("ta-authoring-structure-edit-toggle").click();
  await expect(
    page
      .getByTestId("ta-authoring-structure-editor")
      .getByLabel("선택 항목 역할"),
  ).toHaveValue("item");
  await expectNoHorizontalOverflow(page);
});

test("TA makes portable structured TXT primary and keeps working source and Markdown secondary", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);
  const source = page.getByTestId("ta-authoring-source");
  const originalSource = await source.inputValue();

  const resultHelp = page.getByTestId("ta-authoring-result-shape-help");
  await expect(resultHelp).toHaveAttribute("aria-expanded", "false");
  await resultHelp.click();
  await expect(
    page.getByTestId("ta-authoring-result-shape-help-panel"),
  ).toContainText("네 버튼의 위치는 바뀌지 않습니다");
  await resultHelp.click();
  await page.getByTestId("ta-authoring-result-slot-memo").click();
  const textBoundary = page.getByTestId("ta-authoring-text-result-boundary");
  await expect(textBoundary).toBeVisible();
  await expect(
    textBoundary.getByText("복사할 TXT", { exact: true }),
  ).toBeVisible();

  const portableText = page.getByTestId("ta-authoring-structured-text-preview");
  await expect(portableText).toBeVisible();
  await expect(portableText).toHaveJSProperty("readOnly", true);
  await expect(portableText).toHaveValue(/제목입니다\.\n={3,}/u);
  await expect(portableText).toHaveValue(/1\. ☐ 첫 번째 항목입니다\./u);
  await expect(portableText).toHaveValue(
    /참고 자료: https:\/\/example\.com\/resource/u,
  );
  const portableValue = await portableText.inputValue();
  await portableText.focus();
  await expect
    .poll(() =>
      portableText.evaluate((element) => {
        const textarea = element as HTMLTextAreaElement;
        return [
          textarea.selectionStart,
          textarea.selectionEnd,
          textarea.value.length,
        ];
      }),
    )
    .toEqual([0, portableValue.length, portableValue.length]);

  await expect(
    page.getByTestId("ta-authoring-copy-structured-text"),
  ).toBeEnabled();
  await expect(
    textBoundary.getByRole("button", { name: "TXT 파일 만들기" }),
  ).toBeEnabled();
  await expect(page.getByTestId("ta-authoring-copy-raw-text")).toBeHidden();
  await expect(
    page.getByTestId("ta-authoring-copy-structured-markdown"),
  ).toBeHidden();

  const otherFormats = textBoundary.getByText("작업 원문·Markdown 복사", {
    exact: true,
  });
  await expect(otherFormats).toBeVisible();
  await otherFormats.click();
  await expect(page.getByTestId("ta-authoring-copy-raw-text")).toBeEnabled();
  await expect(page.getByTestId("ta-authoring-copy-raw-text")).toHaveText(
    "현재 작업 원문 복사",
  );
  await expect(
    page.getByTestId("ta-authoring-copy-structured-markdown"),
  ).toBeEnabled();
  await expect(
    page.getByTestId("ta-authoring-copy-structured-markdown"),
  ).toHaveText("문법 포함 Markdown 복사");
  await expect(page.getByTestId("flow-artifact-memo-preview")).toHaveCount(0);

  await resultHelp.click();
  await expect(page.getByTestId("ta-authoring-memo-boundary")).toContainText(
    "항목별 읽기 문서",
  );
  await resultHelp.click();

  await textBoundary.getByRole("button", { name: "TXT 파일 만들기" }).click();
  const exportDialog = page.getByTestId("ta-authoring-export-dialog");
  const formatSelect = exportDialog.getByLabel("형식");
  await expect(formatSelect.locator('option[value="raw_source"]')).toHaveText(
    "현재 작업 원문 (.txt)",
  );
  await expect(formatSelect.locator('option[value="plain_text"]')).toHaveText(
    "항목별 TXT",
  );
  await expect(formatSelect.locator('option[value="markdown"]')).toHaveText(
    "정리된 Markdown",
  );
  await exportDialog.getByText("취소", { exact: true }).click();
  await expect(source).toHaveValue(originalSource);
  await expectNoHorizontalOverflow(page);
});

test("TA keeps unmarked prose in TXT and preserves the selected result while the left source updates", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);
  const source = page.getByTestId("ta-authoring-source");
  const txtButton = page.getByTestId("ta-authoring-result-slot-memo");
  await txtButton.click();
  await expect(txtButton).toHaveAttribute("aria-pressed", "true");

  await source.fill(
    [
      "# 여행 준비",
      "여행 전에 참고할 설명입니다.",
      "## 예약",
      "- [ ] 항공권 확인",
      "  - 설명: 출발 시간을 확인합니다.",
    ].join("\n"),
  );

  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    "자동 반영했습니다",
  );
  await expect(txtButton).toHaveAttribute("aria-pressed", "true");
  const portableText = page.getByTestId("ta-authoring-structured-text-preview");
  await expect(portableText).toHaveValue(/1\. ☐ 항공권 확인/u);
  await expect(portableText).toHaveValue(/\[원문 메모\]/u);
  await expect(portableText).toHaveValue(/여행 전에 참고할 설명입니다\./u);
  await expect(page.getByTestId("ta-authoring-issue-card")).toHaveCount(0);
  expect(
    (await portableText.inputValue()).match(/여행 전에 참고할 설명입니다\./gu),
  ).toHaveLength(1);

  await source.fill(
    [
      "# 마커 없는 메모",
      "항목 표식이 없는 문장입니다.",
      "설명도 일반 문장으로 남깁니다.",
    ].join("\n"),
  );
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(0);
  await expect(txtButton).toHaveAttribute("aria-pressed", "true");
  await expect(portableText).toHaveValue(/항목 표식이 없는 문장입니다\./u);
  await expect(portableText).toHaveValue(/설명도 일반 문장으로 남깁니다\./u);
  await expect(portableText).not.toHaveValue(/1\. ☐/u);
  await expect(page.getByTestId("ta-authoring-issue-card")).toHaveCount(0);

  await source.fill("");
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(0);
  await expect(portableText).not.toHaveValue(/항목 표식이 없는 문장입니다/u);
  await expect(page.getByTestId("ta-authoring-stage-result")).toBeEnabled();
});

test("TA authoring preview exposes calendar details, todo subfields, sheet columns, and links", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);

  await page.getByTestId("ta-authoring-result-slot-todo").click();
  let firstRow = page.getByTestId("ta-authoring-artifact-row").first();
  await expect(firstRow).toContainText("설명입니다.");
  await expect(firstRow).toContainText("완료 기준입니다.");
  await expect(firstRow).toContainText("장소입니다.");
  await expect(firstRow).toContainText("매주 월요일");
  await expect(firstRow).toContainText("사용 중인 경우에 실행합니다.");
  await expect(
    firstRow.getByRole("link", { name: /참고 자료/u }),
  ).toHaveAttribute("href", "https://example.com/resource");

  await page.getByTestId("ta-authoring-result-slot-calendar").click();
  await expect(
    page.getByTestId("flow-artifact-calendar-preview"),
  ).toBeVisible();
  await expect(
    page.getByTestId("ta-authoring-calendar-month-grid"),
  ).toBeVisible();
  firstRow = page
    .getByTestId("ta-authoring-calendar-selected-list")
    .getByTestId("ta-authoring-artifact-row")
    .first();
  await expect(
    firstRow.locator('[data-authoring-preview-field="date"]'),
  ).toContainText("2026-08-03");
  await expect(
    firstRow.locator('[data-authoring-preview-field="time"]'),
  ).toContainText("09:00");
  await expect(
    firstRow.locator('[data-authoring-preview-field="timezone"]'),
  ).toContainText("Asia/Seoul");

  await selectProductExample(page, "course");
  await page.getByTestId("ta-authoring-result-slot-sheet").click();
  const sheetPreview = page.getByTestId("flow-artifact-sheet-preview");
  await expect(sheetPreview.first().locator("thead")).toContainText("항목");
  await expect(sheetPreview.first().locator("thead")).toContainText("설명");
  await expect(sheetPreview.first().locator("thead")).not.toContainText("출처");
  await expect(sheetPreview.getByRole("link")).toHaveCount(0);

  await selectProductExample(page, "simple");
  await page.getByTestId("ta-authoring-result-slot-memo").click();
  await expect(
    page.getByTestId("ta-authoring-structured-text-preview"),
  ).toHaveValue(/참고 자료: https:\/\/example\.com\/resource/u);
  await expect(page.getByTestId("flow-artifact-memo-preview")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("TA expands finite and open-ended recurrence without hiding the bounded occurrence window", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);
  const source = page.getByTestId("ta-authoring-source");

  await source.fill(
    [
      "# 31회 반복",
      "## 실행",
      "- [ ] 주간 확인",
      "  - 날짜: 2026-08-03",
      "  - 반복: 매주 월요일",
      "  - 반복 종료: 31회",
    ].join("\n"),
  );
  await page.getByTestId("ta-authoring-result-slot-todo").click();
  const rows = page.getByTestId("ta-authoring-artifact-row");
  await expect(rows).toHaveCount(30);
  const firstWindowIds = await rows.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-row-id")),
  );
  await expect(
    page.getByTestId("ta-authoring-recurrence-preview-summary"),
  ).toContainText("30/31회");
  await page.getByTestId("ta-authoring-recurrence-more-finite").click();
  await expect(rows).toHaveCount(31);
  const expandedIds = await rows.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-row-id")),
  );
  expect(expandedIds.slice(0, 30)).toEqual(firstWindowIds);
  expect(new Set(expandedIds).size).toBe(31);
  await expect(
    page.getByTestId("ta-authoring-recurrence-more-finite"),
  ).toHaveCount(0);

  await source.fill(
    [
      "# 종료 없는 반복",
      "## 실행",
      "- [ ] 주간 확인",
      "  - 날짜: 2026-08-03",
      "  - 반복: 매주 월요일",
    ].join("\n"),
  );
  await expect(rows).toHaveCount(4);
  const fourWeekIds = await rows.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-row-id")),
  );
  await expect(
    page.getByTestId("ta-authoring-recurrence-preview-summary"),
  ).toContainText("4주 · 4회");
  await page.getByTestId("ta-authoring-recurrence-more-open-ended").click();
  await expect(rows).toHaveCount(8);
  const eightWeekIds = await rows.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-row-id")),
  );
  expect(eightWeekIds.slice(0, 4)).toEqual(fourWeekIds);
  expect(new Set(eightWeekIds).size).toBe(8);
  await expectNoHorizontalOverflow(page);
});

test("TA resets input scroll on example switch and briefly confirms a mobile live parse", async ({
  page,
}) => {
  await openAuthoring(page, 390, 844);
  await selectProductExample(page, "moving");

  const source = page.getByTestId("ta-authoring-source");
  const inputScroller = page.getByTestId("ta-authoring-input-scroll");
  await openSourceSettings(page);
  await source.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await inputScroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(() => source.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await expect
    .poll(() => inputScroller.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);

  await page.getByTestId("ta-authoring-stage-result").click();
  await expect(page.getByTestId("ta-authoring-stage-result")).toHaveAttribute(
    "aria-current",
    "step",
  );
  await selectProductExample(page, "simple");
  await expect(page.getByTestId("ta-authoring-stage-result")).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect
    .poll(() => source.evaluate((element) => element.scrollTop))
    .toBe(0);
  await expect
    .poll(() => inputScroller.evaluate((element) => element.scrollTop))
    .toBe(0);

  await page.getByTestId("ta-authoring-stage-input").click();
  await source.fill(`${SYNTAX_EXAMPLE}\n- [ ] 자동 반영 항목입니다.`);
  const liveStatus = page.getByTestId("ta-authoring-live-status");
  await expect(liveStatus).toHaveText("4개 항목 반영됨");
  await expect(liveStatus.locator("..")).toHaveAttribute("aria-live", "polite");
  await expect(page.getByTestId("ta-authoring-stage-input")).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(liveStatus).toHaveCount(0, { timeout: 3000 });
});

test("TA keeps initial-example edits recoverable and saves them into one draft", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);
  const workingSource = page.getByTestId("ta-authoring-source");
  const initialWorkingSource = await workingSource.inputValue();

  await page
    .getByTestId("public-flow-artifact-preview-row-edit")
    .first()
    .click();
  const inspector = page.getByTestId("ta-authoring-inspector");
  await inspector.getByLabel("제목").fill("수정한 첫 번째 항목입니다");
  await inspector.getByRole("button", { name: "원문과 결과에 적용" }).click();
  await expect(page.getByTestId("ta-authoring-item").first()).toContainText(
    "수정한 첫 번째 항목입니다",
  );
  await expect(workingSource).toHaveValue(/- \[ \] 수정한 첫 번째 항목입니다/u);
  expect(await workingSource.inputValue()).not.toBe(initialWorkingSource);
  await page.getByTestId("ta-authoring-result-slot-memo").click();
  await page.getByText("작업 원문·Markdown 복사", { exact: true }).click();
  await expect(
    page.getByTestId("ta-authoring-copy-source-snapshot"),
  ).toBeVisible();
  await page.getByTestId("ta-authoring-result-slot-todo").click();
  await expect(
    page.getByTestId("ta-authoring-working-text-sync-undo"),
  ).toBeVisible();
  await page.getByRole("button", { name: "최근 원문 수정 되돌리기" }).click();
  await expect(workingSource).toHaveValue(initialWorkingSource);
  await expect(page.getByTestId("ta-authoring-item").first()).not.toContainText(
    "수정한 첫 번째 항목입니다",
  );
  await expect(
    page.getByTestId("ta-authoring-working-text-sync-undo"),
  ).toHaveCount(0);
  await page
    .getByTestId("public-flow-artifact-preview-row-edit")
    .first()
    .click();
  const reopenedInspector = page.getByTestId("ta-authoring-inspector");
  await reopenedInspector.getByLabel("제목").fill("수정한 첫 번째 항목입니다");
  await reopenedInspector
    .getByRole("button", { name: "원문과 결과에 적용" })
    .click();
  await expect(workingSource).toHaveValue(/- \[ \] 수정한 첫 번째 항목입니다/u);
  await expect
    .poll(async () => {
      const raw = await page.evaluate(
        (key) => localStorage.getItem(key),
        TEXT_AUTHORING_DRAFTS_STORAGE_KEY,
      );
      if (!raw) return 0;
      const state = JSON.parse(raw) as StoredAuthoringState;
      return Object.keys(state.recoveries).length;
    })
    .toBe(1);

  await expect(page.getByTestId("ta-authoring-item-review")).toBeHidden();
  await showResults(page);
  await expect(
    page.getByTestId("ta-authoring-artifact-row").first(),
  ).toContainText("수정한 첫 번째 항목입니다");
  await saveDraftButton(page).click();
  const receipt = page.getByTestId("ta-authoring-receipt");
  await expect(receipt).toBeVisible();
  let stored = await readStoredAuthoringState(page);
  expect(Object.values(stored.drafts)).toHaveLength(1);
  expect(stored.recoveries).toEqual({});
  const firstDraftId = Object.values(stored.drafts)[0].draftId;

  await receipt.getByRole("button", { name: "계속 편집" }).click();
  await page.getByTestId("ta-authoring-title").fill("고친 제목입니다.");
  await expect(
    page.getByTestId("ta-authoring-artifact-row").first(),
  ).toContainText("수정한 첫 번째 항목입니다");
  await saveDraftButton(page).click();

  stored = await readStoredAuthoringState(page);
  expect(Object.values(stored.drafts)).toHaveLength(1);
  expect(Object.values(stored.drafts)[0].draftId).toBe(firstDraftId);
});

test("TA desktop turns the Jeju memo into five canonical Items and saves a personal receipt", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);
  await expect(page.getByTestId("ta-osr-1440-two-pane")).toBeVisible();
  await expect(page.getByTestId("ta02-390-input")).toBeVisible();
  await expect(page.getByTestId("ta02-390-result")).toBeVisible();
  await expect(page.getByTestId("ta-authoring-item-review")).toBeHidden();

  const legacySentinel = '[{"sentinel":"text-authoring-must-not-touch"}]';
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: LEGACY_BUNDLES_STORAGE_KEY,
    value: legacySentinel,
  });
  await parseJeju(page);

  await showResults(page);
  await expect(page.getByTestId("ta-authoring-preflight")).toHaveAttribute(
    "data-count",
    "5",
  );
  await saveDraftButton(page).click();
  const receipt = page.getByTestId("ta-authoring-receipt");
  await expect(receipt).toBeVisible();
  await expect(receipt).toContainText("개인 초안을 저장했습니다");
  await expect(receipt).toContainText("포함 항목");
  await expect(receipt).toContainText("5개");
  await expect(receipt).toContainText("원문 연결");
  await expect(receipt).toContainText("보존");

  await expect
    .poll(() =>
      page.evaluate(
        (key) => localStorage.getItem(key),
        LEGACY_BUNDLES_STORAGE_KEY,
      ),
    )
    .toBe(legacySentinel);

  const stored = await readStoredAuthoringState(page);
  const drafts = Object.values(stored.drafts);
  expect(stored.schemaVersion).toBe(1);
  expect(drafts).toHaveLength(1);
  expect(drafts[0].ownership).toBe("personal");
  expect(drafts[0].status).toBe("previewed");
  expect(drafts[0].document.rawText).toBe(JEJU_MEMO);
  expect(drafts[0].document.parseResult.canonical.items).toHaveLength(5);
  expect(drafts[0].history.at(-1)?.kind).toBe("saved");
  expect(stored.recoveries).toEqual({});
  await receipt.getByRole("button", { name: "계속 편집" }).click();
  await page
    .getByTestId("ta-authoring-source")
    .fill(`${JEJU_MEMO}\n- [ ] 추가 항목`);
  await expect(page.getByRole("radio", { name: /개인 초안/u })).toBeDisabled();
  await expectNoHorizontalOverflow(page);
});

test("TA opens a legacy structure-stage draft as result with optional item review", async ({
  page,
}) => {
  await openAuthoring(page, 390, 844);
  await parseJeju(page);
  await saveDraftButton(page).click();
  const receipt = page.getByTestId("ta-authoring-receipt");
  await expect(receipt).toBeVisible();

  await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error("Missing saved legacy-stage fixture");
    const state = JSON.parse(raw) as StoredAuthoringState;
    const draft = Object.values(state.drafts)[0];
    draft.activeStage = "structure";
    draft.document.uiState = {
      ...draft.document.uiState,
      stage: "structure",
    };
    localStorage.setItem(key, JSON.stringify(state));
  }, TEXT_AUTHORING_DRAFTS_STORAGE_KEY);

  await receipt.getByTestId("ta-authoring-library-toggle").click();
  await page
    .getByTestId("ta-authoring-library-row")
    .first()
    .getByRole("button", { name: "이어서 작성" })
    .click();

  await expect(page.getByTestId("ta-authoring-stage-result")).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(page.getByTestId("ta02-390-result")).toBeVisible();
  await expect(page.getByTestId("ta-authoring-item-review")).toBeVisible();
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(5);
  await expect(page.getByTestId("ta-authoring-stage-structure")).toHaveCount(0);
});

test("TA mobile keeps one active stage and restores focus after closing the Item inspector", async ({
  page,
}) => {
  await openAuthoring(page, 390, 844);
  await expect(page.getByTestId("ta02-390-input")).toBeVisible();
  await expect(page.getByTestId("ta-authoring-stage-structure")).toHaveCount(0);
  await expect(page.getByTestId("ta02-390-result")).toBeHidden();
  const exampleSelectMetrics = await page
    .getByTestId("ta-authoring-example-select")
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
      };
    });
  expect(exampleSelectMetrics.left).toBeGreaterThanOrEqual(0);
  expect(exampleSelectMetrics.right).toBeLessThanOrEqual(390);
  await openSourceSettings(page);
  const composerBox = await page
    .getByTestId("ta-authoring-source")
    .boundingBox();
  const ownershipBox = await page
    .getByTestId("ta-authoring-ownership")
    .boundingBox();
  expect(composerBox).not.toBeNull();
  expect(ownershipBox).not.toBeNull();
  expect((composerBox as { y: number }).y).toBeLessThan(
    (ownershipBox as { y: number }).y,
  );
  await parseJeju(page);
  await expect(page.getByTestId("ta02-390-input")).toBeHidden();
  await expect(page.getByTestId("ta02-390-result")).toBeVisible();
  await expect(page.getByTestId("ta-authoring-item-review")).toBeHidden();
  await openItemReview(page);

  const itemRows = page.getByTestId("ta-authoring-item");
  const selectionLabels = page.getByTestId("ta-authoring-item-selection");
  await expect(selectionLabels.first()).toHaveText("✓");
  await expect(selectionLabels.nth(1)).toHaveText("");
  await itemRows.nth(1).click();
  const inspector = page.getByTestId("ta-authoring-inspector");
  await expect(inspector).toBeVisible();
  await expect(selectionLabels.first()).toHaveText("");
  await expect(selectionLabels.nth(1)).toHaveText("✓");
  await expect(inspector.getByLabel("제목")).toHaveValue("숙소 예약번호 정리");
  await expect(page.getByTestId("ta-authoring-item-edit")).toBeHidden();
  const closeButton = inspector.getByRole("button", { name: "닫기" });
  const applyButton = inspector.getByRole("button", {
    name: "원문과 결과에 적용",
  });
  await closeButton.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(applyButton).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("ta-authoring-inspector")).toHaveCount(0);
  await expect(page.getByTestId("ta-authoring-item-review-open")).toBeFocused();

  await openItemReview(page);
  const reviewDialog = page.getByTestId("ta-authoring-item-review");
  const structureScroller = reviewDialog.locator(
    "[data-authoring-dialog-scroll]",
  );
  const structureMetrics = await structureScroller.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(structureMetrics.scrollHeight).toBeGreaterThanOrEqual(
    structureMetrics.clientHeight,
  );
  if (structureMetrics.scrollHeight > structureMetrics.clientHeight) {
    await structureScroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect
      .poll(() => structureScroller.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
  } else {
    await expect(itemRows.last()).toBeVisible();
  }

  await reviewDialog.getByRole("button", { name: "검토 닫기" }).click();
  await expect(page.getByTestId("ta02-390-input")).toBeHidden();
  await expect(page.getByTestId("ta02-390-result")).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByTestId("ta02-390-result")
        .locator("[data-authoring-pane-scroll]")
        .evaluate((element) => element.scrollTop),
    )
    .toBe(0);

  await page.getByTestId("ta-authoring-stage-input").click();
  await expect(page.getByTestId("ta02-390-input")).toBeVisible();
  await page.getByTestId("ta-authoring-stage-result").click();
  await expect(page.getByTestId("ta02-390-result")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("TA undoes one right-side edit in both the working source and result", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);
  await parseJeju(page);
  const workingSource = page.getByTestId("ta-authoring-source");
  const initialWorkingSource = await workingSource.inputValue();

  await page
    .getByTestId("public-flow-artifact-preview-row-edit")
    .first()
    .click();
  const inspector = page.getByTestId("ta-authoring-inspector");
  await inspector.getByLabel("제목").fill("항공권 최종 확인하기");
  await inspector.getByRole("button", { name: "원문과 결과에 적용" }).click();
  await expect(page.getByTestId("ta-authoring-item").first()).toContainText(
    "항공권 최종 확인하기",
  );
  await expect(workingSource).toHaveValue(/- \[ \] 항공권 최종 확인하기/u);

  await page.getByRole("button", { name: "최근 원문 수정 되돌리기" }).click();
  await expect(workingSource).toHaveValue(initialWorkingSource);
  await expect(page.getByTestId("ta-authoring-item").first()).toContainText(
    "항공권 확인",
  );
  await expect(page.getByTestId("ta-authoring-item").first()).not.toContainText(
    "항공권 최종 확인하기",
  );

  await expect(
    page.getByTestId("ta-authoring-working-text-sync-undo"),
  ).toHaveCount(0);
});

test("TA mobile holds, converts, undoes, and keeps one unsupported quote without losing the source", async ({
  page,
}) => {
  await openAuthoring(page, 390, 844);
  await page.getByTestId("ta-authoring-title").fill("제주 여행 준비");
  await page
    .getByTestId("ta-authoring-source")
    .fill(REVIEWABLE_UNSUPPORTED_MEMO);
  await applyCurrentDraft(page);

  const reviewSummary = page.getByTestId("ta-authoring-item-review-summary");
  await expect(reviewSummary).toHaveAttribute("data-review-needed", "true");
  await expect(page.getByTestId("ta-authoring-item-review-open")).toContainText(
    "확인이 필요한 문장 1개",
  );
  await openItemReview(page);
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(2);
  const issueSection = page.getByTestId("ta-authoring-issue-section");
  await expect(issueSection).toBeVisible();
  await expect(page.getByTestId("ta-authoring-issue-source")).toHaveText(
    "> 여행은 여름에 사람이 많습니다.",
  );
  await expect(issueSection).toContainText("결정이 필요한 문장 1개");

  const holdButton = page.getByTestId("ta-authoring-issue-hold");
  await holdButton.focus();
  await page.keyboard.press("Enter");
  const heldSummary = page.getByTestId("ta-authoring-held-issues-summary");
  await expect(heldSummary).toBeVisible();
  await expect(heldSummary).toBeFocused();
  await expect(heldSummary).toContainText("나중에 정할 문장 1개");
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(2);
  await expect(issueSection).toContainText("결정이 필요한 문장 1개");

  await heldSummary.click();
  await page.getByTestId("ta-authoring-issue-convert-item").click();
  await expect(issueSection).toHaveCount(0);
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(3);
  const convertedItem = page
    .getByTestId("ta-authoring-item")
    .filter({ hasText: "여행은 여름에 사람이 많습니다." });
  await expect(convertedItem).toHaveCount(1);
  await expect(convertedItem).toBeFocused();
  await expect(page.getByTestId("ta-authoring-inspector")).toHaveCount(0);

  await page.getByTestId("ta-authoring-item-review-close").click();
  await showResults(page);
  await expect(page.getByTestId("ta-authoring-preflight")).toHaveAttribute(
    "data-count",
    "3",
  );
  await expect(
    page
      .getByTestId("ta-authoring-artifact-row")
      .filter({ hasText: "여행은 여름에 사람이 많습니다." }),
  ).toHaveCount(1);

  await openItemReview(page);
  await page.getByTestId("ta-authoring-structure-edit-toggle").click();
  await page
    .getByTestId("ta-authoring-structure-editor")
    .getByRole("button", { name: "되돌리기" })
    .click();
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(2);
  await expect(heldSummary).toBeVisible();
  await page
    .getByTestId("ta-authoring-structure-editor")
    .getByRole("button", { name: "수정 닫기" })
    .click();

  await heldSummary.click();
  const keepSourceButton = page.getByTestId("ta-authoring-issue-keep-source");
  await keepSourceButton.click();
  await expect(issueSection).toHaveCount(0);
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(2);
  await expect(
    page.getByTestId("ta-authoring-item-review-close"),
  ).toBeFocused();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    REVIEWABLE_UNSUPPORTED_MEMO,
  );

  await page.getByTestId("ta-authoring-item-review-close").click();
  await showResults(page);
  await expect(page.getByTestId("ta-authoring-preflight")).toHaveAttribute(
    "data-count",
    "2",
  );
  await expectNoHorizontalOverflow(page);
});

test("TA short viewports can reach the bottom of input, structure, and result", async ({
  page,
}) => {
  const viewports = [
    { width: 390, height: 600 },
    { width: 360, height: 640 },
    { width: 844, height: 390 },
  ];

  for (const viewport of viewports) {
    await test.step(`${viewport.width}x${viewport.height}`, async () => {
      await openAuthoring(page, viewport.width, viewport.height);
      await openSourceSettings(page);

      const shell = page.getByTestId("text-authoring-workspace");
      const footer = page.locator(".ta-workspace-footer");
      const primaryAction = footer.locator(".ta-primary-action");

      await scrollToEnd(page.getByTestId("ta-authoring-input-scroll"));
      await expect
        .poll(() => shell.evaluate((element) => element.scrollTop))
        .toBe(0);
      await expectReachableAboveFooter(
        page,
        page.getByTestId("ta-authoring-ownership"),
      );
      await expect(primaryAction).toBeInViewport();

      await applyCurrentDraft(page);
      await openItemReview(page);
      const reviewDialog = page.getByTestId("ta-authoring-item-review");
      const reviewScroller = reviewDialog.locator(
        "[data-authoring-dialog-scroll]",
      );
      await scrollToEnd(reviewScroller);
      await expect
        .poll(() => shell.evaluate((element) => element.scrollTop))
        .toBe(0);
      await expect(page.getByTestId("ta-authoring-item").last()).toBeVisible();
      await expect(
        page.getByTestId("ta-authoring-item-review-close"),
      ).toBeInViewport();
      await page.getByTestId("ta-authoring-item-review-close").click();

      await showResults(page);
      const resultScroller = page
        .getByTestId("ta02-390-result")
        .locator("[data-authoring-pane-scroll]");
      await scrollToEnd(resultScroller);
      await expect
        .poll(() => shell.evaluate((element) => element.scrollTop))
        .toBe(0);
      await expectReachableAboveFooter(
        page,
        page.getByTestId("ta-authoring-result-more"),
      );
      await expect(primaryAction).toBeInViewport();
      await expectNoHorizontalOverflow(page);
    });
  }
});

test("TA tablet uses the two-pane composition without overflow", async ({
  page,
}) => {
  await openAuthoring(page, 1024, 768);
  await parseJeju(page);
  await expect(page.getByTestId("ta-osr-1024-two-pane")).toBeVisible();
  await expect(page.getByTestId("ta-osr-1440-two-pane")).toBeHidden();
  await expect(page.getByTestId("ta02-390-input")).toBeVisible();
  await expect(page.getByTestId("ta02-390-result")).toBeVisible();
  await expect(page.getByTestId("ta-authoring-item-review")).toBeHidden();
  await expectNoHorizontalOverflow(page);
});

test("TA switches cleanly between staged and two-pane layout at 900px", async ({
  page,
}) => {
  await openAuthoring(page, 899, 720);
  await expect(page.getByTestId("ta-authoring-stage-input")).toBeVisible();
  await expect(page.getByTestId("ta-authoring-stage-result")).toBeVisible();
  await expect(page.getByTestId("ta02-390-input")).toBeVisible();
  await expect(page.getByTestId("ta02-390-result")).toBeHidden();
  await expect(page.locator(".ta-workspace-footer")).toBeVisible();
  await page.getByTestId("ta-authoring-stage-result").click();
  await expect(page.getByTestId("ta02-390-input")).toBeHidden();
  await expect(page.getByTestId("ta02-390-result")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await openAuthoring(page, 900, 720);
  await expect(page.getByTestId("ta-authoring-stage-input")).toBeHidden();
  await expect(page.getByTestId("ta-authoring-stage-result")).toBeHidden();
  await expect(page.getByTestId("ta02-390-input")).toBeVisible();
  await expect(page.getByTestId("ta02-390-result")).toBeVisible();
  await expect(page.locator(".ta-workspace-footer")).toBeHidden();
  await expect(page.getByTestId("ta-osr-1024-two-pane")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("TA draft library can find, duplicate, archive, and restore a personal draft", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);
  await parseJeju(page);
  await showResults(page);
  await saveDraftButton(page).click();
  const receipt = page.getByTestId("ta-authoring-receipt");
  await expect(receipt).toBeVisible();

  await receipt.getByTestId("ta-authoring-library-toggle").click();
  await expect(page.getByTestId("ta-authoring-library")).toBeVisible();
  await expect(page.getByTestId("ta-authoring-library")).not.toContainText(
    "Flow drafts",
  );
  await expect(page.getByTestId("ta-authoring-library")).not.toContainText(
    /revision-/u,
  );
  await expect(page.getByTestId("ta-authoring-library")).toContainText(
    "단계 · 5개 항목",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  const filterMetrics = await page
    .getByTestId("ta-authoring-filters")
    .evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      buttonRects: Array.from(element.querySelectorAll("button")).map(
        (button) => {
          const rect = button.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        },
      ),
    }));
  expect(filterMetrics.scrollWidth).toBeLessThanOrEqual(
    filterMetrics.clientWidth + 1,
  );
  expect(
    filterMetrics.buttonRects.every(
      (rect) => rect.left >= 0 && rect.right <= 390,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByTestId("ta-authoring-search").fill("제주");
  await expect(page.getByTestId("ta-authoring-library-row")).toHaveCount(1);

  await page.getByTestId("ta-authoring-duplicate").first().click();
  const activeRows = page.getByTestId("ta-authoring-library-row");
  await expect(activeRows).toHaveCount(2);
  const draftIds = await activeRows.evaluateAll((rows) =>
    rows.map((row) => row.getAttribute("data-draft-id")),
  );
  expect(draftIds.every(Boolean)).toBe(true);
  expect(new Set(draftIds).size).toBe(2);

  const archivedDraftId = draftIds[0] as string;
  await activeRows.first().getByTestId("ta-authoring-archive").click();
  await expect(page.getByTestId("ta-authoring-library-row")).toHaveCount(1);

  await page.getByTestId("ta-authoring-show-archived").click();
  await expect(page.getByTestId("ta-authoring-library-row")).toHaveCount(2);
  const archivedRow = page
    .getByTestId("ta-authoring-library-row")
    .filter({ has: page.getByTestId("ta-authoring-restore") });
  await expect(archivedRow).toHaveCount(1);
  await expect(archivedRow).toHaveAttribute("data-draft-id", archivedDraftId);
  await archivedRow.getByTestId("ta-authoring-restore").click();
  await expect(page.getByTestId("ta-authoring-library-row")).toHaveCount(2);
  await expect(page.getByTestId("ta-authoring-restore")).toHaveCount(0);

  const stored = await readStoredAuthoringState(page);
  const drafts = Object.values(stored.drafts);
  expect(drafts).toHaveLength(2);
  expect(new Set(drafts.map((draft) => draft.draftId)).size).toBe(2);
  expect(new Set(drafts.map((draft) => draft.document.documentId)).size).toBe(
    2,
  );
  expect(new Set(drafts.map((draft) => draft.revisionId)).size).toBe(2);
  expect(drafts.every((draft) => draft.status !== "archived")).toBe(true);
  expect(
    drafts.some((draft) =>
      draft.history.some((entry) => entry.kind === "restored"),
    ),
  ).toBe(true);
});

test("TA keeps personal ownership in the receipt and downloads real XLSX and plain text files", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);
  await page.getByTestId("ta-authoring-title").fill("개인 초안 준비");
  await openSourceSettings(page);
  await expect(page.getByRole("radio", { name: /개인 초안/u })).toBeEnabled();
  await selectOwnership(page, "개인 초안");
  await expect(page.getByRole("radio", { name: /개인 초안/u })).toBeChecked();
  await parseJeju(page, JEJU_EXPORT_MEMO);
  await expect(page.getByRole("radio", { name: /개인 초안/u })).toBeEnabled();
  await showResults(page);
  await saveDraftButton(page).click();

  const saveReceipt = page.getByTestId("ta-authoring-receipt");
  await expect(saveReceipt).toBeVisible();
  await expect(saveReceipt).toContainText("개인 초안을 저장했습니다");
  await expect(saveReceipt).not.toContainText("제작자 초안을 저장했습니다");
  await expect(saveReceipt).toContainText("이 기기의 개인 초안에 저장했습니다");

  const stored = await readStoredAuthoringState(page);
  expect(Object.values(stored.drafts)).toHaveLength(1);
  expect(Object.values(stored.drafts)[0].ownership).toBe("personal");
  await saveReceipt.getByRole("button", { name: "계속 편집" }).click();

  await page.getByRole("button", { name: /^표·Excel 5$/u }).click();
  await page.getByTestId("ta-authoring-export-open").click();
  const exportDialog = page.getByTestId("ta-authoring-export-dialog");
  await exportDialog.getByLabel("형식").selectOption("xlsx");
  const [xlsxDownload] = await Promise.all([
    page.waitForEvent("download"),
    exportDialog.getByRole("button", { name: "5개 가져가기 확정" }).click(),
  ]);
  expect(xlsxDownload.suggestedFilename()).toMatch(/\.xlsx$/u);
  const xlsxPath = await xlsxDownload.path();
  expect(xlsxPath).not.toBeNull();
  const xlsxBytes = await readFile(xlsxPath as string);
  expect([...xlsxBytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  await expect(exportDialog).toContainText("표·Excel · 5개 · Excel(XLSX)");
  await exportDialog.getByText("닫기", { exact: true }).click();

  await page.getByRole("button", { name: /^할 일 5$/u }).click();
  await page.getByTestId("ta-authoring-export-open").click();
  await exportDialog.getByLabel("형식").selectOption("plain_text");
  const [textDownload] = await Promise.all([
    page.waitForEvent("download"),
    exportDialog.getByRole("button", { name: "5개 가져가기 확정" }).click(),
  ]);
  expect(textDownload.suggestedFilename()).toMatch(/\.txt$/u);
  const textPath = await textDownload.path();
  expect(textPath).not.toBeNull();
  const text = await readFile(textPath as string, "utf8");
  expect(text).toContain("제주 여행 준비\n========");
  expect(text).toContain("1. ☐ 항공권 확인");
  expect(text).not.toContain("<!-- flowme:");
  expect(text).not.toContain("- [ ]");
  await expect(exportDialog).toContainText("할 일 · 5개 · TXT");
  await expectNoHorizontalOverflow(page);
});

test("TA reparses changed source, keeps same-text ownership drafts separate, and confirms destructive reset", async ({
  page,
}) => {
  const updatedMemo = `${JEJU_MEMO}\n- [ ] 여행자 보험 확인`;
  await openAuthoring(page, 1440, 900);
  await openSourceSettings(page);
  await selectOwnership(page, "제작자 초안");
  await parseJeju(page);
  await showResults(page);

  await page.getByTestId("ta-authoring-source").fill(updatedMemo);
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(6);
  await expect(page.getByTestId("ta-authoring-preflight")).toHaveAttribute(
    "data-count",
    "6",
  );
  await saveDraftButton(page).click();
  await page
    .getByTestId("ta-authoring-receipt")
    .getByRole("button", { name: "계속 편집" })
    .click();

  let stored = await readStoredAuthoringState(page);
  expect(Object.values(stored.drafts)).toHaveLength(1);
  expect(Object.values(stored.drafts)[0].document.rawText).toBe(updatedMemo);
  expect(
    Object.values(stored.drafts)[0].document.parseResult.canonical.items,
  ).toHaveLength(6);

  await page.getByRole("button", { name: "새 Flow 시작" }).click();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue("");
  await openSourceSettings(page);
  await selectOwnership(page, "개인 초안");
  await page.getByTestId("ta-authoring-title").fill("제주 여행 준비");
  await page.getByTestId("ta-authoring-source").fill(updatedMemo);
  await applyCurrentDraft(page);
  await showResults(page);
  await saveDraftButton(page).click();
  await page
    .getByTestId("ta-authoring-receipt")
    .getByRole("button", { name: "계속 편집" })
    .click();

  stored = await readStoredAuthoringState(page);
  expect(Object.values(stored.drafts)).toHaveLength(2);
  expect(
    new Set(Object.values(stored.drafts).map((draft) => draft.ownership)),
  ).toEqual(new Set(["creator", "personal"]));

  await page
    .getByTestId("ta-authoring-source")
    .fill(`${updatedMemo}\n- [ ] 환전 확인`);
  await expect
    .poll(async () => {
      const state = await readStoredAuthoringState(page);
      return Object.keys(state.recoveries).length;
    })
    .toBe(1);
  await page.getByRole("button", { name: "새 Flow 시작" }).click();
  const resetDialog = page.getByTestId("ta-authoring-reset-dialog");
  await expect(resetDialog).toBeVisible();
  await resetDialog.getByRole("button", { name: "계속 작성" }).click();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    `${updatedMemo}\n- [ ] 환전 확인`,
  );

  await page.getByRole("button", { name: "새 Flow 시작" }).click();
  await resetDialog
    .getByRole("button", { name: "변경사항 버리고 새로 시작" })
    .click();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue("");
  stored = await readStoredAuthoringState(page);
  expect(Object.values(stored.drafts)).toHaveLength(2);
  expect(stored.recoveries).toEqual({});
});

test("TA exports bounded recurring ICS events and blocks background save shortcuts while export is open", async ({
  page,
}) => {
  const timedMarkdown = [
    "# 병원 예약",
    "- [ ] 예약 시간 확인",
    "  날짜: 2026-08-01",
    "  시간: 09:30",
    "  시간대: Asia/Seoul",
    "  소요 시간: 45분",
    "  반복: 매주 토요일",
  ].join("\n");
  await openAuthoring(page, 1440, 900);
  await page.getByTestId("ta-authoring-source").fill(timedMarkdown);
  await applyCurrentDraft(page);
  await showResults(page);
  await expect(page.getByTestId("ta-authoring-preflight")).toHaveAttribute(
    "data-count",
    "4",
  );
  const calendarResult = page.getByTestId("ta-authoring-result-slot-calendar");
  await calendarResult.click();
  await expect(calendarResult).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("ta-authoring-export-open").click();
  const exportDialog = page.getByTestId("ta-authoring-export-dialog");
  await expect(exportDialog).toBeVisible();

  await page.keyboard.press("Control+Enter");
  await expect(exportDialog).toBeVisible();
  await expect(page.getByTestId("ta-authoring-receipt")).toHaveCount(0);
  const persistedDraftCount = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const value = JSON.parse(raw) as StoredAuthoringState;
    return Object.keys(value.drafts).length;
  }, TEXT_AUTHORING_DRAFTS_STORAGE_KEY);
  expect(persistedDraftCount).toBe(0);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    exportDialog.getByRole("button", { name: "4개 가져가기 확정" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.ics$/u);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const ics = await readFile(downloadPath as string, "utf8");
  const unfoldedIcs = ics.replace(/\r\n[ \t]/gu, "");
  expect(ics.match(/BEGIN:VEVENT/gu) ?? []).toHaveLength(4);
  expect(ics).toContain("DTSTART;TZID=Asia/Seoul:20260801T093000");
  expect(ics).toContain("DURATION:PT45M");
  expect(unfoldedIcs).toContain("반복: 매주 토요일");
  expect(ics).not.toContain("RRULE");
  await expect(exportDialog).toContainText("캘린더 · 4개 · 캘린더 파일(ICS)");
});

test("TA-05 creator review keeps a local draft but blocks export until the user records rights and safety evidence", async ({
  page,
}) => {
  const safetySource = [
    "# 해외여행 안전정보 확인",
    "- [ ] 출발 전 여행경보와 현지 공지 확인하기",
    "  출처: https://www.0404.go.kr/",
    "  완료 기준: 공식 원문에서 현재 공지를 직접 확인했다.",
    "  주의: 현지 상황이 바뀌면 공식 공지를 다시 확인하고 필요한 경우 일정을 중단한다.",
  ].join("\n");

  await openAuthoring(page, 390, 844);
  await openSourceSettings(page);
  await selectOwnership(page, "제작자 초안");
  await page
    .getByTestId("ta-authoring-source-meta")
    .fill("https://www.0404.go.kr/");
  await page.getByTestId("ta-authoring-source").fill(safetySource);
  await applyCurrentDraft(page);
  await showResults(page);

  const summary = page.getByTestId("ta-authoring-review-summary");
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("확인 전 2개");
  await expect(
    page.getByTestId("ta-authoring-export-review-required"),
  ).toContainText("파일로 가져가기 전 2개 확인");

  await saveDraftButton(page).click();
  const firstReceipt = page.getByTestId("ta-authoring-receipt");
  await expect(firstReceipt).toContainText("제작자 초안을 저장했습니다");
  await expect(firstReceipt).toContainText("확인 전 2개");
  await expect(firstReceipt).toContainText("외부 파일은 만들지 않았습니다");
  await firstReceipt.getByRole("button", { name: "계속 편집" }).click();

  await page.getByTestId("ta-authoring-export-review-required").click();
  const reviewDialog = page.getByTestId("ta-authoring-review-dialog");
  await expect(reviewDialog).toBeVisible();
  await expect(
    reviewDialog.getByRole("radio", { name: "내가 만든 원문" }),
  ).toBeFocused();
  await page.keyboard.press("Control+Enter");
  await expect(reviewDialog).toBeVisible();
  await expect(page.getByTestId("ta-authoring-receipt")).toHaveCount(0);

  await reviewDialog.getByRole("radio", { name: "내가 만든 원문" }).check();
  await reviewDialog
    .getByTestId("ta-authoring-review-evidence")
    .fill("본인 작성 원문과 사용 범위를 직접 확인함");
  await reviewDialog.getByTestId("ta-authoring-review-record").click();

  await expect(reviewDialog).toHaveAttribute(
    "data-testid",
    "ta-authoring-review-dialog",
  );
  await expect(reviewDialog).toContainText("안전 검토가 필요한 내용인가요?");
  await reviewDialog
    .getByRole("radio", { name: "공식·원문 근거를 연결함" })
    .check();
  await reviewDialog
    .getByTestId("ta-authoring-review-evidence")
    .fill("외교부 해외안전여행 원문과 중단 기준을 확인함");
  await reviewDialog.getByTestId("ta-authoring-review-record").click();
  await expect(reviewDialog).toHaveCount(0);

  await expect(summary).toContainText("확인 기록 있음");
  await saveDraftButton(page).click();
  const finalReceipt = page.getByTestId("ta-authoring-receipt");
  await expect(finalReceipt).toContainText("사용자가 근거 기록 2개");
  await finalReceipt.getByRole("button", { name: "계속 편집" }).click();

  await page.getByTestId("ta-authoring-export-open").click();
  await expect(page.getByTestId("ta-authoring-export-dialog")).toBeVisible();
  await page
    .getByTestId("ta-authoring-export-dialog")
    .getByRole("button", { name: "취소" })
    .click();

  const stored = await readStoredAuthoringState(page);
  const savedDocument = Object.values(stored.drafts)[0].document;
  expect(savedDocument.reviewGates?.map((gate) => gate.status)).toEqual([
    "evidence_recorded",
    "evidence_recorded",
  ]);
  await expectNoHorizontalOverflow(page);
});

test("TA-05 creator without source metadata still requires review and personal-only creates a separate personal fork", async ({
  page,
}) => {
  await openAuthoring(page, 390, 844);
  await openSourceSettings(page);
  await selectOwnership(page, "제작자 초안");
  await page.getByTestId("ta-authoring-title").fill("출처 미입력 제작자 초안");
  await page.getByTestId("ta-authoring-source-meta").fill("");
  await page.getByTestId("ta-authoring-source").fill("- [ ] 공개 전 확인하기");
  await applyCurrentDraft(page);
  await showResults(page);

  const summary = page.getByTestId("ta-authoring-review-summary");
  await expect(summary).toContainText("권리·안전");
  await expect(summary).toContainText("확인 전 2개");
  await saveDraftButton(page).click();
  const creatorReceipt = page.getByTestId("ta-authoring-receipt");
  await expect(creatorReceipt).toContainText("제작자 초안을 저장했습니다");
  const creatorBeforeFork = Object.values(
    (await readStoredAuthoringState(page)).drafts,
  )[0];
  await creatorReceipt.getByRole("button", { name: "계속 편집" }).click();
  await page.getByTestId("ta-authoring-export-review-required").click();
  const reviewDialog = page.getByTestId("ta-authoring-review-dialog");
  await expect(reviewDialog).toContainText(
    "이 원문을 제작자 초안에 사용할 근거가 있나요?",
  );
  await reviewDialog.getByRole("radio", { name: "개인용으로만 남김" }).check();
  await expect(reviewDialog).toContainText("새 개인 초안으로 전환");
  await reviewDialog.getByTestId("ta-authoring-review-record").click();

  await expect(reviewDialog).toHaveCount(0);
  await expect(page.getByTestId("ta-authoring-save")).toContainText(
    "개인 초안 저장",
  );
  await saveDraftButton(page).click();
  await expect(page.getByTestId("ta-authoring-receipt")).toContainText(
    "개인 초안을 저장했습니다",
  );

  const stored = await readStoredAuthoringState(page);
  expect(Object.values(stored.drafts)).toHaveLength(2);
  const creatorRecord = Object.values(stored.drafts).find(
    (record) => record.ownership === "creator",
  );
  const personalRecord = Object.values(stored.drafts).find(
    (record) => record.ownership === "personal",
  );
  expect(creatorRecord?.document).toEqual(creatorBeforeFork.document);
  expect(personalRecord?.document.ownership).toBe("personal");
  expect(personalRecord?.document.forkedFrom?.documentId).toBe(
    creatorBeforeFork.document.documentId,
  );
  expect(personalRecord?.document.forkedFrom?.documentId).not.toBe(
    personalRecord?.document.documentId,
  );
  expect(
    personalRecord?.document.reviewGates?.find((gate) => gate.kind === "rights")
      ?.status,
  ).toBe("personal_only");
  await expectNoHorizontalOverflow(page);
});

test("TA-05 correction suggestion keeps a distinct local receipt and shows the supported Markdown boundary", async ({
  page,
}) => {
  await openAuthoring(page, 1440, 900);
  await openSourceSettings(page);
  await selectOwnership(page, "수정 제안");
  await page.getByTestId("ta-authoring-title").fill("수정 제안 초안");
  await page.getByTestId("ta-authoring-source-meta").fill("");
  await page.getByTestId("ta-authoring-source").fill("- [ ] 수정할 항목 확인");
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(1);

  await expect(saveDraftButton(page)).toContainText("수정 제안 저장");
  await saveDraftButton(page).click();
  const receipt = page.getByTestId("ta-authoring-receipt");
  await expect(receipt).toContainText("수정 제안 초안을 저장했습니다");
  await expect(receipt).not.toContainText("개인 초안을 저장했습니다");
  await receipt.getByRole("button", { name: "계속 편집" }).click();

  await page.getByTestId("ta-authoring-result-more").locator("summary").click();
  await page.getByRole("button", { name: "문법 변환 비교" }).click();
  const roundTrip = page.getByTestId("ta-authoring-roundtrip");
  await expect(roundTrip).toBeVisible();
  await expect(roundTrip).toContainText(
    "지원하는 Markdown 범위로 내보낸 뒤 다시 읽었을 때",
  );
  await expect(roundTrip).toContainText(
    "유지되지 않는 실행 상태: 완료, 재실행, 회차별 기록",
  );
  await roundTrip.getByRole("button", { name: "확인 완료" }).click();

  const stored = await readStoredAuthoringState(page);
  expect(Object.values(stored.drafts)[0].ownership).toBe("suggestion");
  await expectNoHorizontalOverflow(page);
});

test("TA-05 reload restores a held unsaved draft and discarding a later recovery keeps the explicit save", async ({
  page,
}) => {
  await openAuthoring(page, 390, 844);
  await page.getByTestId("ta-authoring-title").fill("복구할 제주 초안");
  await page
    .getByTestId("ta-authoring-source")
    .fill(REVIEWABLE_UNSUPPORTED_MEMO);
  await applyCurrentDraft(page);
  await openItemReview(page);
  await page.getByTestId("ta-authoring-issue-hold").click();
  await expect(
    page.getByTestId("ta-authoring-held-issues-summary"),
  ).toBeVisible();
  await expect
    .poll(async () => {
      return page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return 0;
        const stored = JSON.parse(raw) as StoredAuthoringState;
        return Object.keys(stored.recoveries).length;
      }, TEXT_AUTHORING_DRAFTS_STORAGE_KEY);
    })
    .toBe(1);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "작성 중이던 초안이 있습니다" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "이어서 편집" }).click();
  await expect(page.getByTestId("ta-authoring-stage-result")).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(page.getByTestId("ta-authoring-item-review")).toBeHidden();
  await expect(page.getByTestId("ta-authoring-item-review-open")).toContainText(
    "확인이 필요한 문장 1개",
  );
  await openItemReview(page);
  await expect(
    page.getByTestId("ta-authoring-held-issues-summary"),
  ).toContainText("나중에 정할 문장 1개");

  await page.getByTestId("ta-authoring-item-review-close").click();
  await showResults(page);
  await saveDraftButton(page).click();
  await page
    .getByTestId("ta-authoring-receipt")
    .getByRole("button", { name: "계속 편집" })
    .click();
  const savedBeforeDiscard = await readStoredAuthoringState(page);
  const savedDraftId = Object.values(savedBeforeDiscard.drafts)[0].draftId;

  await page.getByTestId("ta-authoring-stage-input").click();
  await page.getByTestId("ta-authoring-title").fill("버릴 임시 제목");
  await expect
    .poll(async () => {
      return page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return 0;
        const stored = JSON.parse(raw) as StoredAuthoringState;
        return Object.keys(stored.recoveries).length;
      }, TEXT_AUTHORING_DRAFTS_STORAGE_KEY);
    })
    .toBe(1);
  await page.reload();
  await page.getByRole("button", { name: "복구본 버리기" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "작성 중이던 초안이 있습니다" }),
  ).toHaveCount(0);
  const savedAfterDiscard = await readStoredAuthoringState(page);
  expect(Object.keys(savedAfterDiscard.recoveries)).toHaveLength(0);
  expect(Object.values(savedAfterDiscard.drafts)[0].draftId).toBe(savedDraftId);
  expect(Object.values(savedAfterDiscard.drafts)[0].document.title).toBe(
    "제주 여행 준비",
  );
  await expectNoHorizontalOverflow(page);
});

test("MVP PoC merge stays inside the selected Step", async ({ page }) => {
  await openAuthoring(page, 1024, 768);
  await page
    .getByTestId("ta-authoring-source")
    .fill(
      [
        "# Plan",
        "## Step A",
        "- [ ] A1",
        "- [ ] A2",
        "## Step B",
        "- [ ] B1",
      ].join("\n"),
    );
  await applyCurrentDraft(page);

  await openItemReview(page);
  const items = page.getByTestId("ta-authoring-item");
  await expect(items).toHaveCount(3);
  await expect(items.nth(1)).toContainText("A2");
  await items.nth(1).click();
  await expect(items.nth(1)).toHaveAttribute("aria-pressed", "true");
  let structureEditor = await openStructureEditor(page);
  let mergeButton = structureEditor.getByRole("button", {
    name: "다음과 합치기",
  });
  await expect(mergeButton).toBeDisabled();
  await structureEditor.getByRole("button", { name: "수정 닫기" }).click();

  await items.nth(0).click();
  structureEditor = await openStructureEditor(page);
  mergeButton = structureEditor.getByRole("button", {
    name: "다음과 합치기",
  });
  await expect(mergeButton).toBeEnabled();
  await mergeButton.click();
  const mergeDialog = page.getByTestId("ta-authoring-merge-confirm");
  await expect(mergeDialog).toContainText("A1");
  await expect(mergeDialog).toContainText("A2");
  await mergeDialog.getByTestId("ta-authoring-merge-apply").click();

  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("A1 · A2");
  await expect(items.nth(1)).toContainText("B1");
});

test("TA previews authored check state and confirms source-order alignment before rewriting input", async ({
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

  await openAuthoring(page, 1440, 900);
  await page.getByTestId("ta-authoring-source").fill(source);
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(2);

  await page.getByTestId("ta-authoring-result-slot-todo").click();
  const checkedRow = page
    .getByTestId("ta-authoring-artifact-row")
    .filter({ hasText: "늦은 항목" });
  await expect(checkedRow).toHaveAttribute("data-source-checked", "true");
  await expect(checkedRow.locator("h3")).toHaveClass(/line-through/u);

  await page.getByTestId("ta-authoring-result-slot-calendar").click();
  await page.getByRole("button", { name: "날짜순을 원문에도 적용" }).click();
  const alignDialog = page.getByTestId("ta-authoring-align-confirm");
  await expect(alignDialog).toContainText("현재 입력 순서");
  await expect(alignDialog).toContainText("적용할 날짜순");
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(source);
  await alignDialog.getByTestId("ta-authoring-align-apply").click();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(sorted);
  await expect(page.getByTestId("ta-authoring-item").first()).toContainText(
    "이른 항목",
  );

  await page.getByTestId("ta-authoring-result-slot-memo").click();
  await page.getByText("작업 원문·Markdown 복사", { exact: true }).click();
  await expect(
    page.getByTestId("ta-authoring-copy-source-snapshot"),
  ).toBeVisible();
  await page.getByTestId("ta-authoring-result-slot-calendar").click();
  await page.getByRole("button", { name: "순서 변경 되돌리기" }).click();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(source);
});

test("TA confirms split boundaries and blocks a conflicting merge without mutation", async ({
  page,
}) => {
  await openAuthoring(page, 1024, 768);
  await page
    .getByTestId("ta-authoring-source")
    .fill(
      [
        "# 구조 확인",
        "## 실행",
        "- [ ] 오전 준비 확인",
        "  - 날짜: 2026-08-01",
        "- [ ] 오후 준비 확인",
        "  - 날짜: 2026-08-02",
      ].join("\n"),
    );
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(2);

  await openItemReview(page);
  await page.getByTestId("ta-authoring-structure-edit-toggle").click();
  let editor = page.getByTestId("ta-authoring-structure-editor");
  await editor.getByRole("button", { name: "다음과 합치기" }).click();
  const mergeDialog = page.getByTestId("ta-authoring-merge-confirm");
  await expect(mergeDialog).toContainText(
    "값이 다른 속성은 임의로 고르지 않습니다",
  );
  await mergeDialog.getByTestId("ta-authoring-merge-apply").click();
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(2);
  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    "서로 달라 자동으로 합치지 않았습니다",
  );

  await openItemReview(page);
  editor = await openStructureEditor(page);
  await editor.getByRole("button", { name: "나누기" }).click();
  const splitDialog = page.getByTestId("ta-authoring-split-confirm");
  await expect(
    splitDialog.getByTestId("ta-authoring-split-boundary"),
  ).toBeVisible();
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(2);
  await splitDialog.getByTestId("ta-authoring-split-apply").click();
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(3);
  await openItemReview(page);
  editor = await openStructureEditor(page);
  await editor.getByRole("button", { name: "되돌리기" }).click();
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(2);
});

test("MVP PoC keeps the current draft when browser storage rejects a save", async ({
  page,
}) => {
  await openAuthoring(page, 390, 844);
  await parseJeju(page);
  await showResults(page);

  await expect
    .poll(async () => {
      const state = await page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      }, TEXT_AUTHORING_DRAFTS_STORAGE_KEY);
      if (!state) return 0;
      return Object.keys(state.recoveries).length;
    })
    .toBe(1);
  const storedBeforeFailure = await page.evaluate(
    (key) => localStorage.getItem(key),
    TEXT_AUTHORING_DRAFTS_STORAGE_KEY,
  );

  await page.evaluate((key) => {
    const originalSetItem = Storage.prototype.setItem;
    Object.defineProperty(Storage.prototype, "setItem", {
      configurable: true,
      writable: true,
      value: function setItem(
        this: Storage,
        storageKey: string,
        value: string,
      ) {
        if (storageKey === key) {
          throw new DOMException("PoC quota test", "QuotaExceededError");
        }
        return originalSetItem.call(this, storageKey, value);
      },
    });
  }, TEXT_AUTHORING_DRAFTS_STORAGE_KEY);

  await saveDraftButton(page).click();

  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    "초안 저장하지 못했습니다",
  );
  await expect(page.getByTestId("ta-authoring-receipt")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        (key) => localStorage.getItem(key),
        TEXT_AUTHORING_DRAFTS_STORAGE_KEY,
      ),
    )
    .toBe(storedBeforeFailure);
});

test("TA keeps a saved right-side edit live when the left working source is edited again", async ({
  page,
}) => {
  const sourceA = [
    "# 항공권 일정",
    "- [ ] 항공권 예약하기",
    "  - 날짜: 2026-08-01",
    "  - 자료: 예약 안내 | https://example.com/old",
    "  - 주의: 기존 취소 조건을 확인한다.",
  ].join("\n");
  const sourceB = [
    "# 항공권 일정",
    "- [ ] 항공권 예약하기",
    "  - 날짜: 2026-08-03",
    "  - 자료: 예약 안내 | https://example.com/new",
    "  - 주의: 새 취소 조건을 확인한다.",
  ].join("\n");

  await openAuthoring(page, 1440, 900);
  await openSourceSettings(page);
  await page.getByTestId("ta-authoring-title").fill("항공권 일정");
  await page.getByTestId("ta-authoring-source-meta").fill("개인 메모");
  await page.getByTestId("ta-authoring-source").fill(sourceA);
  await expect(page.getByTestId("ta-authoring-item")).toHaveCount(1);

  await page
    .getByTestId("public-flow-artifact-preview-row-edit")
    .first()
    .click();
  const inspector = page.getByTestId("ta-authoring-inspector");
  await inspector.getByRole("button", { name: "일정과 속성" }).click();
  await inspector.getByTestId("ta-authoring-inspector-date").fill("2026-08-05");
  await inspector.getByRole("button", { name: "원문과 결과에 적용" }).click();
  await saveDraftButton(page).click();
  await page
    .getByTestId("ta-authoring-receipt")
    .getByRole("button", { name: "계속 편집" })
    .click();

  await page.getByTestId("ta-authoring-source").fill(sourceB);

  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    "자동 반영했습니다",
  );
  await expect(
    page.getByTestId("ta-authoring-source-update-banner"),
  ).toHaveCount(0);
  await expect(saveDraftButton(page)).toBeEnabled();
  await expect(
    page.getByTestId("ta-authoring-artifact-row").first(),
  ).toContainText("2026-08-03");
  await expect(
    page.getByTestId("ta-authoring-artifact-row").first(),
  ).toContainText("https://example.com/new");
  await expect(
    page.getByTestId("ta-authoring-working-text-sync-undo"),
  ).toBeVisible();
  await saveDraftButton(page).click();
  const stored = await readStoredAuthoringState(page);
  const savedDocument = Object.values(stored.drafts)[0].document;
  expect(savedDocument.rawText).toBe(sourceB);
  expect(savedDocument.sourceState?.status).toBe("current");
  expect(savedDocument.sourceState?.active.rawText).toBe(sourceA);
  expect(savedDocument.parseResult.canonical.items[0]?.schedule).toMatchObject({
    kind: "absolute",
    date: "2026-08-03",
  });
  expect(
    savedDocument.parseResult.canonical.items[0]?.resources?.[0]?.url,
  ).toBe("https://example.com/new");
  expect(savedDocument.parseResult.canonical.items[0]?.cautions).toEqual([
    "새 취소 조건을 확인한다.",
  ]);
  await expectNoHorizontalOverflow(page);
});
