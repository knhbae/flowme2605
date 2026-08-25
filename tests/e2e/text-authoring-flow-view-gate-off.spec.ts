import { expect, test, type Page } from "@playwright/test";

const FLOW_VIEW_STORAGE_PREFIX = "flow:text-authoring:flow-view-ui:v1";

async function clearAuthoringStorage(page: Page) {
  await page.goto("/icon.svg");
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("flow:text-authoring:")) localStorage.removeItem(key);
    }
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("flow:text-authoring:"))
        sessionStorage.removeItem(key);
    }
  });
}

test("LIVE-G01 · the product route stays on the existing textarea when the isolated PoC gate is off", async ({
  page,
}) => {
  await clearAuthoringStorage(page);
  await page.goto("/flows/new");
  await expect(page.getByTestId("text-authoring-workspace")).toBeVisible();

  const source = page.getByTestId("ta-authoring-source");
  await expect(source).toHaveCount(1);
  await expect(source).toHaveJSProperty("tagName", "TEXTAREA");
  await expect(
    page.locator('label[for="text-authoring-source"]'),
  ).toContainText("작업 원문");
  await expect(page.getByRole("group", { name: "편집 방식" })).toHaveCount(0);
  await expect(page.getByTestId("ta-authoring-flow-editor")).toHaveCount(0);
  await expect(page.locator(".cm-editor")).toHaveCount(0);
  await expect(page.locator('option[value^="qa:"]')).toHaveCount(0);
  await expect(
    page.locator('[data-testid^="ta-authoring-example-category-"]'),
  ).toHaveCount(0);
  await expect(page.getByTestId("ta-authoring-example-count")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /전체 예시|대표 5개/u }),
  ).toHaveCount(0);

  const rawSource = [
    "# 기존 제품 경계",
    "일반 문장은 TXT 원문입니다.",
    "## 실행",
    "- [ ] 명시한 항목만 Todo입니다.",
  ].join("\n");
  await page.getByTestId("ta-authoring-title").fill("게이트 꺼짐 확인");
  await source.fill(rawSource);
  await expect(
    page.getByTestId("ta-authoring-result-slot-todo"),
  ).toHaveAttribute("data-eligible", "true");
  await expect(
    page.getByTestId("ta-authoring-result-slot-memo"),
  ).toHaveAttribute("data-eligible", "true");
  await page.getByTestId("ta-authoring-result-slot-memo").click();
  await expect(
    page.getByTestId("ta-authoring-structured-text-preview"),
  ).toContainText("일반 문장은 TXT 원문입니다.");
  await expect(source).toHaveValue(rawSource);

  const flowViewKeys = await page.evaluate((prefix) => {
    return Object.keys(sessionStorage).filter((key) => key.startsWith(prefix));
  }, FLOW_VIEW_STORAGE_PREFIX);
  expect(flowViewKeys).toEqual([]);
});
