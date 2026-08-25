import { expect, test, type Page } from "@playwright/test";

import {
  SIMPLE_TEXT_AUTHORING_EXAMPLE,
  TEXT_AUTHORING_EXAMPLE_GROUPS,
  TEXT_AUTHORING_EXAMPLES,
  VALIDATED_TEXT_AUTHORING_EXAMPLES,
  type TextAuthoringExample,
} from "../../components/flow/text-authoring/examples";
import {
  buildAuthoringArtifactProjection,
  type AuthoringArtifactKind,
} from "../../lib/flow/text-authoring/artifact-projection";
import { createTextAuthoringDocument } from "../../lib/flow/text-authoring/parser";

test.describe.configure({ timeout: 120_000 });

const ARTIFACTS = ["calendar", "todo", "sheet", "memo"] as const;

async function openStandalone(
  page: Page,
  path = "/",
  viewport = { width: 1024, height: 900 },
) {
  await page.setViewportSize(viewport);
  await page.goto(path);
  await expect(page).toHaveTitle("FlowMe Text Authoring 인라인 Flow 편집 PoC");
  await expect(page.getByTestId("text-authoring-workspace")).toBeVisible();
}

async function readRawSource(page: Page): Promise<string> {
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

function expectedArtifactEligibility(example: TextAuthoringExample) {
  const document = createTextAuthoringDocument(example.rawText, {
    ownership: example.ownership ?? "personal",
    title: example.title,
  });
  const projection = buildAuthoringArtifactProjection(document, {
    ...(example.previewAnchor ? { anchor: example.previewAnchor } : {}),
  });
  return Object.fromEntries(
    ARTIFACTS.map((artifact) => [
      artifact,
      projection.artifacts[artifact].eligible,
    ]),
  ) as Record<AuthoringArtifactKind, boolean>;
}

async function readResultSlotSnapshot(page: Page) {
  return Object.fromEntries(
    await Promise.all(
      ARTIFACTS.map(async (artifact) => {
        const slot = page.getByTestId(`ta-authoring-result-slot-${artifact}`);
        await expect(slot).toBeVisible();
        return [
          artifact,
          await slot.evaluate((element) => ({
            eligible: element.getAttribute("data-eligible"),
            state: element.getAttribute("data-state"),
            selected: element.getAttribute("data-selected"),
            recommended: element.getAttribute("data-recommended"),
            text: element.textContent?.replace(/\s+/gu, " ").trim() ?? "",
          })),
        ] as const;
      }),
    ),
  );
}

test("LIVE-CATALOG-01 · the isolated PoC exposes the complete reviewed catalog in canonical order", async ({
  page,
}) => {
  await openStandalone(page);

  const select = page.getByTestId("ta-authoring-example-select");
  const expectedValidatedOptions = TEXT_AUTHORING_EXAMPLE_GROUPS.flatMap(
    (group) =>
      VALIDATED_TEXT_AUTHORING_EXAMPLES.filter(
        (example) => example.group === group.id,
      ).map((example) => ({
        value: `qa:${example.scenarioId ?? example.id}`,
        label: `${example.label} · ${example.expectedResultLabel ?? example.resultLabel}`,
        example,
      })),
  );
  const expectedOptions = [
    {
      value: `product:${SIMPLE_TEXT_AUTHORING_EXAMPLE.id}`,
      label: `${SIMPLE_TEXT_AUTHORING_EXAMPLE.label} · ${SIMPLE_TEXT_AUTHORING_EXAMPLE.resultLabel}`,
      example: SIMPLE_TEXT_AUTHORING_EXAMPLE,
    },
    ...expectedValidatedOptions,
  ];
  const expectedGroupLabels = [
    "작성 문법 · 1개",
    ...TEXT_AUTHORING_EXAMPLE_GROUPS.flatMap((group) => {
      const count = VALIDATED_TEXT_AUTHORING_EXAMPLES.filter(
        (example) => example.group === group.id,
      ).length;
      return count > 0 ? [`${group.label} · ${count}개`] : [];
    }),
  ];

  await expect(page.getByTestId("ta-authoring-example-count")).toHaveText(
    "전체 예시 31개",
  );
  await expect(select.locator('option[value=""]')).toHaveText(
    "전체 검토 예시 선택",
  );
  await expect(select.locator("option")).toHaveCount(32);
  await expect(select.locator("[data-example-id]")).toHaveCount(1);
  await expect(select.locator("[data-example-scenario-id]")).toHaveCount(30);
  await expect(
    page.getByRole("link", { name: "대표 5개 비교" }),
  ).toBeVisible();

  expect(
    await select.locator("optgroup").evaluateAll((groups) =>
      groups.map((group) => group.getAttribute("label")),
    ),
  ).toEqual(expectedGroupLabels);
  expect(
    await select.locator("option:not([value=''])").evaluateAll((options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: option.textContent ?? "",
      })),
    ),
  ).toEqual(
    expectedOptions.map(({ value, label }) => ({
      value,
      label,
    })),
  );

  const resultSnapshots: string[] = [];
  for (const option of expectedOptions) {
    await select.selectOption(option.value);
    await expect(select).toHaveValue(option.value);
    await expect(page.getByTestId("ta-authoring-status")).toContainText(
      option.label.split(" · ", 1)[0],
    );
    await expect.poll(() => readRawSource(page)).toBe(option.example.rawText);

    const expectedEligibility = expectedArtifactEligibility(option.example);
    for (const artifact of ARTIFACTS) {
      await expect(
        page.getByTestId(`ta-authoring-result-slot-${artifact}`),
      ).toHaveAttribute(
        "data-eligible",
        String(expectedEligibility[artifact]),
      );
    }
    resultSnapshots.push(JSON.stringify(await readResultSlotSnapshot(page)));
  }

  expect(new Set(resultSnapshots).size).toBeGreaterThan(1);
  const firstOption = expectedOptions[0];
  await select.selectOption(firstOption.value);
  await expect(select).toHaveValue(firstOption.value);
  await expect.poll(() => readRawSource(page)).toBe(firstOption.example.rawText);
  expect(JSON.stringify(await readResultSlotSnapshot(page))).toBe(
    resultSnapshots[0],
  );
});

test("LIVE-CATALOG-02 · authoringQa=0 preserves the five product quick examples", async ({
  page,
}) => {
  await openStandalone(page, "/?authoringQa=0");

  const select = page.getByTestId("ta-authoring-example-select");
  const expectedLabels = TEXT_AUTHORING_EXAMPLES.slice(0, 5).map(
    (example) => example.label,
  );

  await expect(select.locator("option")).toHaveCount(6);
  await expect(select.locator('[value^="qa:"]')).toHaveCount(0);
  await expect(select.locator("[data-example-scenario-id]")).toHaveCount(0);
  await expect(page.getByTestId("ta-authoring-example-count")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /전체 예시|대표 5개/u }),
  ).toHaveCount(0);
  expect(
    await select.locator("option:not([value=''])").evaluateAll((options) =>
      options.map((option) => option.textContent ?? ""),
    ),
  ).toEqual(expectedLabels);
  expect(
    await select.locator("option:not([value=''])").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    ),
  ).toEqual(expectedLabels.map((_, index) => `example:${index}`));
});

test("LIVE-CATALOG-03 · the complete catalog remains reachable in the 390px mobile workspace", async ({
  page,
}) => {
  await openStandalone(page, "/", { width: 390, height: 844 });

  const select = page.getByTestId("ta-authoring-example-select");
  await expect(page.getByTestId("ta-authoring-example-count")).toHaveText(
    "전체 예시 31개",
  );
  await expect(select.locator("[data-example-scenario-id]")).toHaveCount(30);
  await select.selectOption("qa:content-librivox-38");
  await expect(select).toHaveValue("qa:content-librivox-38");
  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    "LibriVox",
  );
  await expect.poll(() => readRawSource(page)).not.toBe("");

  const switcherBox = await page
    .getByTestId("ta-authoring-example-switcher")
    .boundingBox();
  expect(switcherBox).not.toBeNull();
  expect(switcherBox?.x ?? 0).toBeGreaterThanOrEqual(0);
  expect((switcherBox?.x ?? 0) + (switcherBox?.width ?? 0)).toBeLessThanOrEqual(
    390,
  );
});
