import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

const DRAFTS_STORAGE_KEY = "flow:text-authoring:drafts:v1";
const SAVE_RECEIPT_HANDOFF_KEY = "flow:text-authoring:save-receipt-handoff:v1";
const ROUTE_TRANSITION_TIMEOUT_MS = 15_000;
const CANDIDATE_SESSION_KEY_PREFIX =
  "flowme:text-authoring:source-candidate-session:v1";
const SOURCE_CANDIDATE_EVENT = "flowme:text-authoring-source-candidate";
const VIEWPORT_WIDTHS = [320, 360, 390, 899, 900, 1024, 1280, 1440] as const;

const BASE_SOURCE = [
  "# 주간 자료 준비",
  "- [ ] 자료 확인",
  "  - 설명: 기존 안내를 확인합니다.",
  "  - 날짜: 2026-08-20",
].join("\n");

const INCOMING_SOURCE = [
  "# 주간 자료 준비",
  "- [ ] 자료 확인",
  "  - 설명: 새 안내를 확인합니다.",
  "  - 날짜: 2026-08-22",
  "- [ ] 공유 전 최종 점검",
  "  - 날짜: 2026-08-23",
].join("\n");

type SyntheticCandidateOptions = {
  rawText?: string;
  externalVersion?: string;
  collectedAt?: string;
  receivedAt?: string;
  providedBy?: string;
  sourceOwnerClaim?: string;
  creatorPermission?: boolean;
  injectFailure?: "before-domain-apply" | "before-commit";
  selectedChangeId?: string;
  scrollTop?: number;
};

async function clearAuthoringStorage(page: Page): Promise<void> {
  await page.goto("/icon.svg");
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (
        key.startsWith("flow:text-authoring:") ||
        key.startsWith("flowme:text-authoring:")
      ) {
        localStorage.removeItem(key);
      }
    }
    sessionStorage.clear();
  });
}

async function openProduct(
  page: Page,
  options: { width?: number; height?: number; path?: string } = {},
): Promise<void> {
  await page.setViewportSize({
    width: options.width ?? 1440,
    height: options.height ?? 900,
  });
  await clearAuthoringStorage(page);
  await page.goto(options.path ?? "/flows/new");
  await expect(page.getByTestId("text-authoring-workspace")).toBeVisible();
}

function saveDraftButton(page: Page): Locator {
  return page.getByTestId(
    (page.viewportSize()?.width ?? 1440) >= 900
      ? "ta-authoring-save-desktop"
      : "ta-authoring-save",
  );
}

async function enterAndSaveBase(page: Page): Promise<void> {
  await page.getByTestId("ta-authoring-title").fill("주간 자료 준비");
  await page.getByTestId("ta-authoring-source").fill(BASE_SOURCE);
  await expect
    .poll(() =>
      page
        .getByTestId("ta-authoring-result-slot-todo")
        .getAttribute("data-eligible"),
    )
    .toBe("true");
  if ((page.viewportSize()?.width ?? 1440) < 900) {
    await page.getByTestId("ta-authoring-stage-result").click();
  }
  await saveDraftButton(page).click();
  const receipt = page.getByTestId("ta-authoring-receipt");
  await expect(receipt).toContainText("초안을 저장했어요");
  await expect(page).toHaveURL(/\/flows\/authoring\/[^/]+$/u, {
    timeout: ROUTE_TRANSITION_TIMEOUT_MS,
  });
  await expect
    .poll(() =>
      page.evaluate(
        (key) => sessionStorage.getItem(key),
        SAVE_RECEIPT_HANDOFF_KEY,
      ),
    )
    .toBeNull();
  await receipt.getByRole("button", { name: "계속 편집" }).click();
  await expect(receipt).toHaveCount(0);
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    BASE_SOURCE,
  );
  const draftId = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error(`Missing Text Authoring storage: ${key}`);
    const state = JSON.parse(raw) as {
      drafts?: Record<
        string,
        {
          ownership?: string;
          document?: { ownership?: string };
        }
      >;
    };
    const records = Object.entries(state.drafts ?? {});
    if (records.length !== 1 || !records[0]?.[1].document) {
      throw new Error("Expected one saved Text Authoring draft to promote");
    }
    const [draftId, record] = records[0];
    record.ownership = "creator";
    record.document!.ownership = "creator";
    localStorage.setItem(key, JSON.stringify(state));
    return draftId;
  }, DRAFTS_STORAGE_KEY);
  await page.goto(`/flows/authoring/${encodeURIComponent(draftId)}`);
  await expect(page.getByTestId("text-authoring-workspace")).toBeVisible();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    BASE_SOURCE,
  );
}

async function dispatchSyntheticCandidate(
  page: Page,
  options: SyntheticCandidateOptions = {},
): Promise<void> {
  await page.evaluate(
    ({ eventName, detail }) => {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    },
    {
      eventName: SOURCE_CANDIDATE_EVENT,
      detail: {
        localSynthetic: {
          rawText: options.rawText ?? INCOMING_SOURCE,
          externalVersion: options.externalVersion ?? "fixture-v2",
          collectedAt: options.collectedAt ?? "2026-08-13T05:00:00.000Z",
          receivedAt: options.receivedAt ?? "2026-08-13T05:00:00.000Z",
          providedBy: options.providedBy ?? "P1-E browser fixture",
          sourceOwnerClaim: options.sourceOwnerClaim ?? "fixture-owner",
        },
        creatorPermission: options.creatorPermission ?? true,
        ...(options.injectFailure
          ? { injectFailure: options.injectFailure }
          : {}),
        ...(options.selectedChangeId
          ? { selectedChangeId: options.selectedChangeId }
          : {}),
        ...(options.scrollTop === undefined
          ? {}
          : { scrollTop: options.scrollTop }),
      },
    },
  );
}

async function dispatchExactEnvelope(
  page: Page,
  envelope: unknown,
): Promise<void> {
  await page.evaluate(
    ({ eventName, detail }) => {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    },
    { eventName: SOURCE_CANDIDATE_EVENT, detail: { envelope } },
  );
}

async function durableDraftSnapshot(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error(`Missing Text Authoring storage: ${key}`);
    const state = JSON.parse(raw) as {
      drafts?: Record<
        string,
        {
          revisionId?: string;
          document?: {
            rawText?: string;
            revision?: { revisionId?: string };
            parseResult?: { parseResultId?: string };
          };
          history?: Array<{ revisionId?: string }>;
          coherentRevisionPair?: unknown;
          sourceSnapshot?: { snapshotId?: string };
          workingSource?: { revisionId?: string; rawText?: string };
          explicitSaveReceipt?: { receiptId?: string };
        }
      >;
    };
    return Object.entries(state.drafts ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([draftId, record]) => ({
        draftId,
        revisionId: record.revisionId,
        rawText: record.document?.rawText,
        documentRevisionId: record.document?.revision?.revisionId,
        parseResultId: record.document?.parseResult?.parseResultId,
        historyRevisionIds: (record.history ?? []).map(
          (entry) => entry.revisionId,
        ),
        coherentRevisionPair: record.coherentRevisionPair,
        sourceSnapshotId: record.sourceSnapshot?.snapshotId,
        workingRevisionId: record.workingSource?.revisionId,
        workingRawText: record.workingSource?.rawText,
        explicitSaveReceiptId: record.explicitSaveReceipt?.receiptId,
      }));
  }, DRAFTS_STORAGE_KEY);
}

async function sourceCandidateSession(page: Page) {
  return page.evaluate((prefix) => {
    const key = Object.keys(localStorage).find((candidate) =>
      candidate.startsWith(`${prefix}:`),
    );
    const raw = key ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  }, CANDIDATE_SESSION_KEY_PREFIX);
}

async function expectCandidateSessionStatus(
  page: Page,
  expected: string,
): Promise<void> {
  await expect
    .poll(async () => (await sourceCandidateSession(page))?.status)
    .toBe(expected);
}

async function openCandidateDialog(page: Page): Promise<Locator> {
  const banner = page.getByTestId("ta-authoring-source-candidate-banner");
  await expect(banner).toBeVisible();
  const dialog = page.getByTestId("ta-authoring-source-candidate-dialog");
  if (!(await dialog.isVisible())) {
    await page.getByTestId("ta-authoring-source-candidate-open").click();
  }
  await expect(dialog).toBeVisible();
  return dialog;
}

async function resolveEveryChange(
  page: Page,
  decision: "keep_working" | "use_incoming",
): Promise<void> {
  const dialog = page.getByTestId("ta-authoring-source-candidate-dialog");
  const navigation = dialog.getByTestId(
    "ta-authoring-source-candidate-change-nav",
  );
  const count = await navigation.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    await navigation.nth(index).click();
    await dialog
      .getByTestId(`ta-authoring-source-candidate-choice-${decision}`)
      .check();
  }
  await expect(
    dialog.getByTestId("ta-authoring-source-candidate-apply"),
  ).toBeEnabled();
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
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

async function expectMinimumTargetHeight(
  locator: Locator,
  minimum = 44,
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, "interactive target must have a rendered box").not.toBeNull();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(minimum);
}

test("P1E-H01/F02 · complete candidate stages a three-way, write-zero comparison", async ({
  page,
}) => {
  await openProduct(page);
  await enterAndSaveBase(page);
  const before = await durableDraftSnapshot(page);
  const beforeProjection = await page
    .getByTestId("ta-authoring-artifact-row")
    .allTextContents();

  await dispatchSyntheticCandidate(page);
  const dialog = await openCandidateDialog(page);
  await expect(dialog.getByText("기준 원문").first()).toBeVisible();
  await expect(dialog.getByText("내 작업").first()).toBeVisible();
  await expect(dialog.getByText("새 원문").first()).toBeVisible();
  await expect(
    dialog.getByTestId("ta-authoring-source-candidate-base"),
  ).toBeVisible();
  await expect(
    dialog.getByTestId("ta-authoring-source-candidate-working"),
  ).toBeVisible();
  await expect(
    dialog.getByTestId("ta-authoring-source-candidate-incoming"),
  ).toBeVisible();
  await expect(
    dialog.getByTestId("ta-authoring-source-candidate-apply"),
  ).toBeDisabled();
  expect(await durableDraftSnapshot(page)).toEqual(before);
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    BASE_SOURCE,
  );
  expect(
    await page.getByTestId("ta-authoring-artifact-row").allTextContents(),
  ).toEqual(beforeProjection);

  const decideLater = dialog.getByTestId(
    "ta-authoring-source-candidate-choice-later",
  );
  await decideLater.click();
  await expect(decideLater).not.toBeChecked();
  await expect(
    dialog.getByTestId("ta-authoring-source-candidate-apply"),
  ).toBeDisabled();
  expect(await durableDraftSnapshot(page)).toEqual(before);
});

test("P1E-H02 · explicit decisions apply atomically, emit one local receipt, then save coherently", async ({
  page,
}) => {
  await openProduct(page);
  await enterAndSaveBase(page);
  const before = await durableDraftSnapshot(page);
  const beforeHistory = before[0]?.historyRevisionIds.length ?? 0;

  await dispatchSyntheticCandidate(page);
  await openCandidateDialog(page);
  await resolveEveryChange(page, "use_incoming");
  await page.getByTestId("ta-authoring-source-candidate-apply").click();

  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    INCOMING_SOURCE,
  );
  await expect(
    page.getByTestId("ta-authoring-artifact-row").first(),
  ).toContainText("2026-08-22");
  const banner = page.getByTestId("ta-authoring-source-candidate-banner");
  await expect(banner).toHaveAttribute(
    "data-source-candidate-state",
    "undo-available",
  );
  await expectCandidateSessionStatus(page, "undo-available");
  const appliedSession = await sourceCandidateSession(page);
  expect(appliedSession?.status).toBe("undo-available");
  expect(appliedSession?.receipt).toMatchObject({
    creatorRevisionDelta: 0,
    sideEffects: { publish: 0, network: 0, p35: 0, externalWrite: 0 },
  });
  const durableBeforeSave = await durableDraftSnapshot(page);
  expect(durableBeforeSave[0]?.rawText).toBe(BASE_SOURCE);
  expect(durableBeforeSave[0]?.historyRevisionIds).toHaveLength(beforeHistory);

  await saveDraftButton(page).click();
  const receipt = page.getByTestId("ta-authoring-receipt");
  await expect(receipt).toContainText("초안을 저장했어요");
  await receipt.getByRole("button", { name: "계속 편집" }).click();
  const saved = await durableDraftSnapshot(page);
  expect(saved[0]?.rawText).toBe(INCOMING_SOURCE);
  expect(saved[0]?.workingRawText).toBe(INCOMING_SOURCE);
  expect(saved[0]?.sourceSnapshotId).toBe(before[0]?.sourceSnapshotId);
  expect(saved[0]?.historyRevisionIds).toHaveLength(beforeHistory + 1);
  await page.reload();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    INCOMING_SOURCE,
  );
});

test("P1E-F01 · incomplete and tampered envelopes fail closed with no source or durable write", async ({
  page,
}) => {
  await openProduct(page);
  await enterAndSaveBase(page);
  const before = await durableDraftSnapshot(page);

  await dispatchExactEnvelope(page, { envelopeVersion: 1 });
  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    /완전하지|맞지 않아/u,
  );
  await expect(
    page.getByTestId("ta-authoring-source-candidate-dialog"),
  ).toHaveCount(0);
  expect(await durableDraftSnapshot(page)).toEqual(before);

  await dispatchSyntheticCandidate(page);
  await openCandidateDialog(page);
  const validSession = await sourceCandidateSession(page);
  const envelope = structuredClone(
    validSession?.envelope as Record<string, unknown>,
  );
  await page.keyboard.press("Escape");
  envelope.rawByteHash = "tampered";
  await dispatchExactEnvelope(page, envelope);
  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    /맞지 않아/u,
  );
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    BASE_SOURCE,
  );
  expect(await durableDraftSnapshot(page)).toEqual(before);
});

test("P1E-P01/F02 · denied creator and unresolved changes cannot apply", async ({
  page,
}) => {
  await openProduct(page);
  await enterAndSaveBase(page);
  const before = await durableDraftSnapshot(page);

  await dispatchSyntheticCandidate(page, { creatorPermission: false });
  const dialog = await openCandidateDialog(page);
  await expect(
    dialog.getByTestId("ta-authoring-source-candidate-error"),
  ).toContainText(/권한/u);
  await expect(
    dialog.getByTestId("ta-authoring-source-candidate-apply"),
  ).toBeDisabled();
  await expect(
    dialog.getByTestId("ta-authoring-source-candidate-choice-use_incoming"),
  ).toBeDisabled();
  await dialog.getByTestId("ta-authoring-source-candidate-later").click();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    BASE_SOURCE,
  );
  expect(await durableDraftSnapshot(page)).toEqual(before);
});

test("P1E-F03 · stale work preserves the current source, projections, and focus", async ({
  page,
}) => {
  await openProduct(page);
  await enterAndSaveBase(page);
  const before = await durableDraftSnapshot(page);

  await dispatchSyntheticCandidate(page, { externalVersion: "stale-v2" });
  const staleDialog = await openCandidateDialog(page);
  await resolveEveryChange(page, "use_incoming");
  await staleDialog.getByTestId("ta-authoring-source-candidate-later").click();
  const locallyChanged = `${BASE_SOURCE}\n\n로컬 메모는 보존합니다.`;
  await page.getByTestId("ta-authoring-source").fill(locallyChanged);
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    locallyChanged,
  );
  await expect(page.getByTestId("ta-authoring-status")).toContainText(
    "자동 반영했습니다",
  );
  await page.getByTestId("ta-authoring-source-candidate-open").click();
  await page.getByTestId("ta-authoring-source-candidate-apply").click();
  await expect(
    page.getByTestId("ta-authoring-source-candidate-banner"),
  ).toHaveAttribute("data-source-candidate-state", /stale|failed/u);
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    locallyChanged,
  );
  expect((await durableDraftSnapshot(page))[0]?.rawText).toBe(BASE_SOURCE);
});

test("P1E-F03 · injected commit failure rolls back the complete local transaction", async ({
  page,
}) => {
  await openProduct(page);
  await enterAndSaveBase(page);
  const before = await durableDraftSnapshot(page);
  await dispatchSyntheticCandidate(page, {
    externalVersion: "failure-v3",
    injectFailure: "before-commit",
  });
  const failureDialog = await openCandidateDialog(page);
  await resolveEveryChange(page, "use_incoming");
  const focusedChoice = failureDialog.getByTestId(
    "ta-authoring-source-candidate-choice-use_incoming",
  );
  await focusedChoice.focus();
  const failureApply = failureDialog.getByTestId(
    "ta-authoring-source-candidate-apply",
  );
  await failureApply.click();
  await expect(
    page.getByTestId("ta-authoring-source-candidate-banner"),
  ).toHaveAttribute("data-source-candidate-state", "failed");
  await expect(failureDialog).toBeVisible();
  await expect(failureApply).toBeFocused();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    BASE_SOURCE,
  );
  expect(await durableDraftSnapshot(page)).toEqual(before);
});

test("P1E-I01/R01 · one receipt is idempotent and undo restores source, canonical, and projection", async ({
  page,
}) => {
  await openProduct(page);
  await enterAndSaveBase(page);
  const before = await durableDraftSnapshot(page);

  await dispatchSyntheticCandidate(page, { externalVersion: "undo-v2" });
  await openCandidateDialog(page);
  await resolveEveryChange(page, "use_incoming");
  const apply = page.getByTestId("ta-authoring-source-candidate-apply");
  await apply.evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    INCOMING_SOURCE,
  );
  const applied = await sourceCandidateSession(page);
  expect(applied?.receipt).toBeTruthy();
  expect(applied).not.toHaveProperty("receipts");

  await page.getByTestId("ta-authoring-source-candidate-undo").click();
  await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
    BASE_SOURCE,
  );
  await expect(
    page.getByTestId("ta-authoring-artifact-row").first(),
  ).toContainText("2026-08-20");
  const reverted = await sourceCandidateSession(page);
  expect(reverted?.status).toBe("reverted");
  expect(await durableDraftSnapshot(page)).toEqual(before);
});

test("P1E-R02 · deferred comparison, active change, focus, and layout survive re-entry and eight widths", async ({
  page,
}) => {
  await openProduct(page, { width: 899, height: 700 });
  await enterAndSaveBase(page);
  await dispatchSyntheticCandidate(page, {
    externalVersion: "reentry-v2",
    scrollTop: 48,
  });
  const dialog = await openCandidateDialog(page);
  const navigation = dialog.getByTestId(
    "ta-authoring-source-candidate-change-nav",
  );
  const last = navigation.last();
  await last.click();
  const selectedChangeId = await last.getAttribute("data-change-id");
  expect(selectedChangeId).toBeTruthy();
  await dialog
    .getByTestId("ta-authoring-source-candidate-choice-keep_working")
    .check();
  await dialog.getByTestId("ta-authoring-source-candidate-later").click();
  await expect(
    page.getByTestId("ta-authoring-source-candidate-banner"),
  ).toHaveAttribute("data-source-candidate-state", "deferred");
  await expectCandidateSessionStatus(page, "deferred");

  await page.reload();
  await page.getByTestId("ta-authoring-stage-result").click();
  await page.getByTestId("ta-authoring-source-candidate-open").click();
  const restoredDialog = page.getByTestId(
    "ta-authoring-source-candidate-dialog",
  );
  await expect(
    restoredDialog.locator(
      `[data-testid="ta-authoring-source-candidate-change-nav"][data-change-id="${selectedChangeId}"]`,
    ),
  ).toHaveAttribute("aria-current", "step");
  await page.keyboard.press("Escape");
  await expect(
    page.getByTestId("ta-authoring-source-candidate-open"),
  ).toBeFocused();

  for (const width of VIEWPORT_WIDTHS) {
    await page.setViewportSize({ width, height: 700 });
    await expectNoHorizontalOverflow(page);
    await expect(page.getByTestId("ta-authoring-source")).toHaveValue(
      BASE_SOURCE,
    );
    if (width < 900) {
      await expect(page.getByTestId("ta-authoring-stage-result")).toBeVisible();
    } else {
      await expect(page.getByTestId("ta02-390-input")).toBeVisible();
      await expect(page.getByTestId("ta02-390-result")).toBeVisible();
    }
    await expectMinimumTargetHeight(
      page.getByTestId("ta-authoring-source-candidate-open"),
    );
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.setViewportSize({ width: 390, height: 600 });
  await expectNoHorizontalOverflow(page);
  await page.getByTestId("ta-authoring-source-candidate-open").click();
  await expect(restoredDialog).toBeVisible();
  await expectMinimumTargetHeight(
    restoredDialog.getByTestId("ta-authoring-source-candidate-later"),
  );
});

test("P1E-G01 · gate-off QA surface ignores host candidate and keeps P0 authoring available", async ({
  page,
}) => {
  await openProduct(page, { path: "/flows/new?authoringQa=1" });
  const source = page.getByTestId("ta-authoring-source");
  const before = await source.inputValue();
  await dispatchSyntheticCandidate(page, { externalVersion: "gate-off-v2" });
  await expect(
    page.getByTestId("ta-authoring-source-candidate-banner"),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("ta-authoring-source-candidate-dialog"),
  ).toHaveCount(0);
  await expect(source).toHaveValue(before);
  await source.fill(BASE_SOURCE);
  await expect(source).toHaveValue(BASE_SOURCE);
  await expect(
    page.getByTestId("ta-authoring-result-slot-todo"),
  ).toHaveAttribute("data-eligible", "true");
});
