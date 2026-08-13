import { expect, test, type Page } from "@playwright/test";

const ROUTE_TRANSITION_TIMEOUT_MS = 15_000;

test.describe.configure({ timeout: 90_000 });

async function openDirtyNewContent(page: Page) {
  await page.goto("/icon.svg");
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("flow:text-authoring:")) localStorage.removeItem(key);
    }
  });
  await page.goto("/flows/authoring");
  await page
    .getByTestId("ta-authoring-library")
    .getByRole("button", { name: "새 콘텐츠", exact: true })
    .click();
  await expect(page).toHaveURL(/\/flows\/new$/u, {
    timeout: ROUTE_TRANSITION_TIMEOUT_MS,
  });
  await expect(page.getByTestId("text-authoring-workspace")).toBeVisible();

  const source = page.getByTestId("ta-authoring-source");
  await source.fill("저장하지 않은 메모입니다.");
  return source;
}

test("product authoring prevents silent loss on browser and library exit", async ({
  page,
}) => {
  test.slow();
  const source = await openDirtyNewContent(page);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const event = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      }),
    )
    .toBe(true);

  await page.evaluate(() => window.history.back());
  const historyDialog = page.getByTestId("ta-authoring-reset-dialog");
  await expect(historyDialog).toBeVisible();
  await expect(page).toHaveURL(/\/flows\/new$/u, {
    timeout: ROUTE_TRANSITION_TIMEOUT_MS,
  });
  await historyDialog.getByRole("button", { name: "계속 작성" }).click();
  await expect(source).toHaveValue("저장하지 않은 메모입니다.");

  await page.getByTestId("ta-authoring-library-toggle").click();
  const dialog = page.getByTestId("ta-authoring-reset-dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("text-authoring-workspace")).toHaveAttribute(
    "data-library-open",
    "false",
  );

  await dialog.getByRole("button", { name: "계속 작성" }).click();
  await expect(dialog).toBeHidden();
  await expect(source).toHaveValue("저장하지 않은 메모입니다.");

  await page.getByTestId("ta-authoring-library-toggle").click();
  await dialog
    .getByRole("button", { name: "저장하지 않고 내 콘텐츠로 이동" })
    .click();
  await expect(page.getByTestId("text-authoring-workspace")).toHaveAttribute(
    "data-library-open",
    "true",
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const event = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      }),
    )
    .toBe(false);
});

test("browser Back discard reaches the exact prior route without losing source before confirmation", async ({
  page,
}) => {
  const source = await openDirtyNewContent(page);

  await page.evaluate(() => window.history.back());
  const dialog = page.getByTestId("ta-authoring-reset-dialog");
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/flows\/new$/u, {
    timeout: ROUTE_TRANSITION_TIMEOUT_MS,
  });
  await expect(source).toHaveValue("저장하지 않은 메모입니다.");

  await dialog.getByRole("button", { name: "저장하지 않고 이동" }).click();
  await expect(page).toHaveURL(/\/flows\/authoring$/u);
  await expect(page.getByTestId("ta-authoring-library")).toBeVisible();
});

test("explicit save replaces the new route and leaves Back and Forward free of guard entries", async ({
  page,
}) => {
  await page.goto("/icon.svg");
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("flow:text-authoring:")) localStorage.removeItem(key);
    }
  });
  await page.goto("/flows/authoring");
  await page
    .getByTestId("ta-authoring-library")
    .getByRole("button", { name: "새 콘텐츠", exact: true })
    .click();
  await expect(page).toHaveURL(/\/flows\/new$/u, {
    timeout: ROUTE_TRANSITION_TIMEOUT_MS,
  });
  const historyLengthBeforeSave = await page.evaluate(
    () => window.history.length,
  );

  await page.getByTestId("ta-authoring-title").fill("저장 후 이동 확인");
  await page
    .getByTestId("ta-authoring-source")
    .fill("저장한 원문이 그대로 다시 열립니다.");
  await page.getByTestId("ta-authoring-save-desktop").click();
  const receipt = page.getByTestId("ta-authoring-receipt");
  await expect(receipt).toContainText("초안을 저장했어요");
  await expect(page).toHaveURL(/\/flows\/authoring\/[^/]+$/u);
  const savedUrl = page.url();
  expect(await page.evaluate(() => window.history.length)).toBe(
    historyLengthBeforeSave,
  );
  await receipt.getByRole("button", { name: "계속 편집" }).click();

  await page.evaluate(() => window.history.back());
  await expect(page).toHaveURL(/\/flows\/authoring$/u);
  await expect(page.getByTestId("ta-authoring-library")).toBeVisible();

  await page.evaluate(() => window.history.forward());
  await expect(page).toHaveURL(savedUrl);
  await expect(page.getByTestId("ta-authoring-title")).toHaveValue(
    "저장 후 이동 확인",
  );
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    "저장한 원문이 그대로 다시 열립니다.",
  );
  await expect(page.getByTestId("ta-authoring-reset-dialog")).toHaveCount(0);
});
