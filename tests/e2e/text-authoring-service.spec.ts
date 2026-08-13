import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const ROUTE_TRANSITION_TIMEOUT_MS = 15_000;

async function openCleanProductAuthoring(
  page: Page,
  viewport: { width: number; height: number },
  path = "/flows/authoring",
) {
  await page.setViewportSize(viewport);
  await page.goto("/icon.svg");
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("flow:text-authoring:")) localStorage.removeItem(key);
    }
  });
  await page.goto(path);
  await expect(page.getByTestId("text-authoring-workspace")).toBeVisible();
}

async function startNewProductContent(page: Page) {
  await page
    .getByTestId("ta-authoring-library")
    .getByRole("button", { name: "새 콘텐츠" })
    .click();
  await expect(page).toHaveURL(/\/flows\/new$/u, {
    timeout: ROUTE_TRANSITION_TIMEOUT_MS,
  });
}

test("390 product entry starts from a quiet library and focuses plain text input", async ({
  page,
}) => {
  await openCleanProductAuthoring(page, { width: 390, height: 844 });

  const library = page.getByTestId("ta-authoring-library");
  await expect(library).toBeVisible();
  await expect(
    library.getByRole("heading", { name: "콘텐츠", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("ta-authoring-search")).toHaveCount(0);
  await expect(page.getByTestId("ta-authoring-filters")).toHaveCount(0);
  await expect(page.getByTestId("ta-authoring-example-select")).toHaveCount(0);
  await expect(page.getByText("저장 기록", { exact: true })).toHaveCount(0);

  await startNewProductContent(page);

  const source = page.getByTestId("ta-authoring-source");
  await expect(source).toBeVisible();
  await expect(source).toBeFocused();
  await expect(page).toHaveURL(/\/flows\/new$/u);
});

test("1024 explicit save keeps route identity through rename, duplicate, archive, and recovery", async ({
  page,
}) => {
  await openCleanProductAuthoring(page, { width: 1024, height: 900 });

  await startNewProductContent(page);
  await page.getByTestId("ta-authoring-title").fill("주간 메모");
  await page.getByTestId("ta-authoring-source").fill("설명입니다.");

  const save = page.getByTestId("ta-authoring-save-desktop");
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByTestId("ta-authoring-receipt")).toBeVisible();
  await expect(page).toHaveURL(/\/flows\/authoring\/[^/]+$/u);

  await page
    .getByTestId("ta-authoring-receipt")
    .getByRole("button", { name: "내 콘텐츠" })
    .click();
  await expect(page).toHaveURL(/\/flows\/authoring$/u);

  const library = page.getByTestId("ta-authoring-library");
  const originalRow = library.getByTestId("ta-authoring-library-row").first();
  const draftId = await originalRow.getAttribute("data-draft-id");
  expect(draftId).toBeTruthy();

  await originalRow.locator("summary").click();
  await originalRow.getByRole("button", { name: "이름 변경" }).click();
  await originalRow
    .getByRole("textbox", { name: "콘텐츠 이름" })
    .fill("주간 기록");
  await originalRow.getByRole("button", { name: "이름 저장" }).click();
  await expect(
    originalRow.getByRole("heading", { name: "주간 기록" }),
  ).toBeVisible();

  await originalRow.getByRole("button", { name: "열기" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/flows/authoring/${encodeURIComponent(draftId!)}`),
  );
  await expect(page.getByTestId("ta-authoring-title")).toHaveValue("주간 기록");
  await page.reload();
  await expect(page.getByTestId("ta-authoring-title")).toHaveValue("주간 기록");

  await page.getByTestId("ta-authoring-library-toggle").click();
  await expect(page).toHaveURL(/\/flows\/authoring$/u);

  const restoredOriginal = library.locator(
    `[data-testid="ta-authoring-library-row"][data-draft-id="${draftId}"]`,
  );
  await restoredOriginal.locator("summary").click();
  await restoredOriginal.getByRole("button", { name: "복제" }).click();
  await expect(library.getByTestId("ta-authoring-library-row")).toHaveCount(2);

  await restoredOriginal.locator("summary").click();
  await restoredOriginal.getByRole("button", { name: "보관" }).click();
  await expect(library.getByTestId("ta-authoring-library-row")).toHaveCount(1);
  await library.getByRole("button", { name: "되돌리기" }).click();
  await expect(library.getByTestId("ta-authoring-library-row")).toHaveCount(2);

  await restoredOriginal.locator("summary").click();
  await restoredOriginal.getByRole("button", { name: "보관" }).click();
  await library.getByTestId("ta-authoring-archive-view").click();
  await expect(restoredOriginal).toBeVisible();
  await restoredOriginal.getByRole("button", { name: "복구" }).click();
  await expect(restoredOriginal).toHaveCount(0);

  await library.getByTestId("ta-authoring-archive-view").click();
  await expect(
    library.locator(
      `[data-testid="ta-authoring-library-row"][data-draft-id="${draftId}"]`,
    ),
  ).toBeVisible();
});
