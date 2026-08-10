import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  gotoLegacySavedPlanLibraryRoute,
  installLegacySavedPlanLibraryNavigation,
} from './helpers/my-flow-library';

const SOURCE_FLOW_SLUG = 'moving-d30-basic';
const SOURCE_ROUTE = `/f/${SOURCE_FLOW_SLUG}`;
const SAVED_RECORD_PREFIX = 'flow:saved:';
const ITEM_DRAFTS_STORAGE_KEY = 'flow:my-flow:item-drafts';
const DATE_OVERRIDES_STORAGE_KEY = 'flow:my-flow:date-overrides';
const RECOVERY_JOURNAL_HISTORY_KEY = 'flowPublicSaveRecoveryJournal';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

type BrowserSavedCopy = {
  storageKey: string;
  raw: string;
  record: {
    schemaVersion?: number;
    slug?: string;
    personalCopyKey?: string;
    sourceFlowKey?: string;
    sourceFlowSlug?: string;
    sourceVersion?: string;
    lastSaveRequestId?: string;
    savedItemCount?: number;
    anchor?: string;
  };
};

type BrowserRecoveryJournal = {
  schemaVersion: number;
  sourceFlowSlug: string;
  intent: {
    idempotencyKey: string;
    personalCopyKey: string;
  };
  choice: {
    kind: 'create' | 'overwrite' | 'copy';
    personalCopyKey: string;
  };
  rawBackup: {
    keys: string[];
    values: Record<string, string | null>;
  };
  expectedPostSaveRaw: {
    keys: string[];
    values: Record<string, string | null>;
  };
  sessionDraft: {
    titleDraft: string;
    anchor: string;
    anchorMode: 'custom' | 'undated' | 'example';
    itemStates: Record<string, unknown>;
    itemPersonalizations: Record<string, unknown>;
    weekdaySelection: string[];
    routineDefinition: Record<string, unknown>;
  };
};

async function resetAndOpenSource(page: Page): Promise<void> {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, SOURCE_ROUTE);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await expect(
    page.locator('main[data-p35-p004-save-lifecycle="on"]'),
  ).toBeVisible();
  await expect(page.getByTestId('public-flow-anchor-input')).toBeVisible();
}

async function localStorageRawSnapshot(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const keys = Array.from({ length: window.localStorage.length }, (_, index) => (
      window.localStorage.key(index)
    )).filter((key): key is string => Boolean(key)).sort();
    return Object.fromEntries(keys.map((key) => [key, window.localStorage.getItem(key) ?? '']));
  });
}

async function savedCopiesForSource(page: Page): Promise<BrowserSavedCopy[]> {
  return page.evaluate(({ prefix, sourceSlug }) => {
    const records: BrowserSavedCopy[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const storageKey = window.localStorage.key(index);
      if (!storageKey?.startsWith(prefix)) continue;
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) continue;
      try {
        const record = JSON.parse(raw) as BrowserSavedCopy['record'];
        if (record.schemaVersion !== 2 || record.sourceFlowSlug !== sourceSlug) continue;
        records.push({ storageKey, raw, record });
      } catch {
        // A malformed record is not a valid personal identity for this assertion.
      }
    }
    return records.sort((left, right) => left.storageKey.localeCompare(right.storageKey));
  }, { prefix: SAVED_RECORD_PREFIX, sourceSlug: SOURCE_FLOW_SLUG });
}

async function rawStorageValue(page: Page, key: string): Promise<string | null> {
  return page.evaluate((storageKey) => window.localStorage.getItem(storageKey), key);
}

async function rawStorageValues(
  page: Page,
  keys: readonly string[],
): Promise<Record<string, string | null>> {
  return page.evaluate((storageKeys) => Object.fromEntries(
    storageKeys.map((key) => [key, window.localStorage.getItem(key)]),
  ), [...keys]);
}

async function historyRecoveryJournal(page: Page): Promise<BrowserRecoveryJournal | null> {
  return page.evaluate((historyKey) => {
    const state = window.history.state as Record<string, unknown> | null;
    return (state?.[historyKey] ?? null) as BrowserRecoveryJournal | null;
  }, RECOVERY_JOURNAL_HISTORY_KEY);
}

async function installIncompleteRollbackFailure(page: Page): Promise<void> {
  await page.evaluate(({ rollbackFailureKey }) => {
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    let localMutationCount = 0;
    let forwardFailed = false;
    let rollbackFailed = false;
    Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
      if (this === window.localStorage && !forwardFailed) {
        localMutationCount += 1;
        if (localMutationCount === 3) {
          forwardFailed = true;
          throw new Error('simulated durable-recovery forward failure');
        }
      }
      return originalSetItem.call(this, key, value);
    };
    Storage.prototype.removeItem = function patchedRemoveItem(key: string) {
      if (
        this === window.localStorage
        && forwardFailed
        && !rollbackFailed
        && key === rollbackFailureKey
      ) {
        rollbackFailed = true;
        throw new Error('simulated durable-recovery rollback failure');
      }
      return originalRemoveItem.call(this, key);
    };
  }, { rollbackFailureKey: DATE_OVERRIDES_STORAGE_KEY });
}

async function applyRecoveryJournalPostSaveBytes(page: Page): Promise<BrowserRecoveryJournal> {
  return page.evaluate((historyKey) => {
    const state = window.history.state as Record<string, unknown> | null;
    const journal = state?.[historyKey] as BrowserRecoveryJournal | undefined;
    if (!journal) throw new Error('missing recovery journal fixture');
    journal.expectedPostSaveRaw.keys.forEach((key) => {
      const raw = journal.expectedPostSaveRaw.values[key];
      if (raw === null || raw === undefined) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, raw);
    });
    return journal;
  }, RECOVERY_JOURNAL_HISTORY_KEY);
}

async function expectFocusedPersonalCopyRoute(page: Page): Promise<string> {
  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      pathname: url.pathname,
      view: url.searchParams.get('view'),
      flow: url.searchParams.get('flow'),
      hasReceipt: url.searchParams.has('saveReceipt'),
    };
  }).toEqual({
    pathname: '/my',
    view: 'flows',
    flow: expect.stringMatching(/^personal-copy:/u),
    hasReceipt: false,
  });
  return new URL(page.url()).searchParams.get('flow') ?? '';
}

function selectedMobileWorkspace(page: Page, personalCopyKey: string): Locator {
  return page.locator(
    `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${personalCopyKey}"]`,
  );
}

async function createFirstPersonalCopy(
  page: Page,
  anchor = '2031-01-10',
): Promise<string> {
  await resetAndOpenSource(page);
  await page.getByTestId('public-flow-anchor-input').fill(anchor);
  await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
  await page.getByTestId('public-flow-save-primary-mobile').click();
  const personalCopyKey = await expectFocusedPersonalCopyRoute(page);
  await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
  await expect(selectedMobileWorkspace(page, personalCopyKey)).toBeVisible();
  return personalCopyKey;
}

async function openExistingCopyDialog(
  page: Page,
  anchor = '2031-02-10',
): Promise<Locator> {
  await gotoLegacySavedPlanLibraryRoute(page, SOURCE_ROUTE);
  await page.getByTestId('public-flow-anchor-input').fill(anchor);
  await page.getByTestId('public-flow-save-primary-mobile').click();
  const dialog = page.getByTestId('public-flow-existing-copy-dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function chooseNewCopy(dialog: Locator, useSynchronousDoubleClick = false): Promise<void> {
  await dialog.getByTestId('public-flow-existing-copy-choice-copy').check();
  const confirm = dialog.getByTestId('public-flow-existing-copy-confirm');
  await expect(confirm).toBeEnabled();
  if (useSynchronousDoubleClick) {
    await confirm.evaluate((element) => {
      const button = element as HTMLButtonElement;
      button.click();
      button.click();
    });
    return;
  }
  await confirm.click();
}

test.describe('P35 P0 public save lifecycle', () => {
  test('first save opens selected detail directly, keeps one v2 identity, and does not repeat its banner', async ({ page }) => {
    const personalCopyKey = await createFirstPersonalCopy(page);
    const savedRecordKey = `${SAVED_RECORD_PREFIX}${personalCopyKey}`;

    await expect(page.getByTestId('my-flow-save-banner')).toHaveAttribute(
      'data-personal-copy-key',
      personalCopyKey,
    );
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    const selectedDetail = selectedMobileWorkspace(page, personalCopyKey);
    await expect(selectedDetail).toBeVisible();
    await expect(selectedDetail.getByTestId('my-flow-workspace-execute')).toBeVisible();

    const copies = await savedCopiesForSource(page);
    expect(copies).toHaveLength(1);
    expect(copies[0]?.storageKey).toBe(savedRecordKey);
    expect(copies[0]?.record).toMatchObject({
      schemaVersion: 2,
      slug: personalCopyKey,
      personalCopyKey,
      sourceFlowSlug: SOURCE_FLOW_SLUG,
      savedItemCount: 24,
      anchor: '2031-01-10',
    });
    expect(copies[0]?.record.sourceFlowKey).toMatch(/\S/u);
    expect(copies[0]?.record.sourceVersion).toMatch(/\S/u);
    expect(copies[0]?.record.lastSaveRequestId).toMatch(/^save-request:/u);
    expect(await rawStorageValue(page, `${SAVED_RECORD_PREFIX}${SOURCE_FLOW_SLUG}`)).toBeNull();

    await page.reload();
    expect(await expectFocusedPersonalCopyRoute(page)).toBe(personalCopyKey);
    await expect(page.getByTestId('my-flow-save-banner')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    await expect(selectedMobileWorkspace(page, personalCopyKey)).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${SOURCE_ROUTE}(?:\\?.*)?$`, 'u'));
    const copiesAfterBack = await savedCopiesForSource(page);
    expect(copiesAfterBack.map((copy) => copy.storageKey)).toEqual([savedRecordKey]);
  });

  test('browser Back after save restores usable public actions without creating a duplicate', async ({ page }) => {
    const personalCopyKey = await createFirstPersonalCopy(page, '2031-02-01');
    const savedRecordKey = `${SAVED_RECORD_PREFIX}${personalCopyKey}`;
    const savedRecordRaw = await rawStorageValue(page, savedRecordKey);

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${SOURCE_ROUTE}(?:\\?.*)?$`, 'u'));
    const editAction = page.getByTestId('public-flow-adjust-entry-mobile');
    const saveAction = page.getByTestId('public-flow-save-primary-mobile');
    await expect(editAction).toBeVisible();
    await expect(editAction).toBeEnabled();
    await expect(saveAction).toBeVisible();
    await expect(saveAction).toBeEnabled();
    await expect(saveAction).not.toHaveAttribute('aria-busy', 'true');

    await editAction.click();
    const adjustment = page.getByTestId('public-flow-personal-adjustment');
    await expect(adjustment).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(adjustment).toHaveCount(0);
    await expect(editAction).toBeFocused();

    await page.getByTestId('public-flow-anchor-input').fill('2031-02-02');
    await saveAction.click();
    const dialog = page.getByTestId('public-flow-existing-copy-dialog');
    await expect(dialog).toBeVisible();
    expect((await savedCopiesForSource(page)).map((copy) => copy.storageKey)).toEqual([
      savedRecordKey,
    ]);
    expect(await rawStorageValue(page, savedRecordKey)).toBe(savedRecordRaw);
    await dialog.getByTestId('public-flow-existing-copy-cancel').click();
    await expect(dialog).toHaveCount(0);
  });

  test('existing-copy dialog and both cancellation paths write nothing and preserve the public draft', async ({ page }) => {
    await createFirstPersonalCopy(page);
    await gotoLegacySavedPlanLibraryRoute(page, SOURCE_ROUTE);
    const draftAnchor = '2031-03-15';
    const anchorInput = page.getByTestId('public-flow-anchor-input');
    await anchorInput.fill(draftAnchor);
    const beforeOpen = await localStorageRawSnapshot(page);

    await page.getByTestId('public-flow-save-primary-mobile').click();
    let dialog = page.getByTestId('public-flow-existing-copy-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('public-flow-existing-copy-confirm')).toBeDisabled();
    expect(await localStorageRawSnapshot(page)).toEqual(beforeOpen);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toBeFocused();
    expect(await localStorageRawSnapshot(page)).toEqual(beforeOpen);
    await expect(anchorInput).toHaveValue(draftAnchor);

    await page.getByTestId('public-flow-save-primary-mobile').click();
    dialog = page.getByTestId('public-flow-existing-copy-dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('public-flow-existing-copy-cancel').click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toBeFocused();
    expect(await localStorageRawSnapshot(page)).toEqual(beforeOpen);
    await expect(anchorInput).toHaveValue(draftAnchor);
  });

  test('explicit overwrite changes only the selected saved identity', async ({ page }) => {
    const targetCopyKey = await createFirstPersonalCopy(page);
    const targetRecordKey = `${SAVED_RECORD_PREFIX}${targetCopyKey}`;
    const targetRawBefore = await rawStorageValue(page, targetRecordKey);
    expect(targetRawBefore).not.toBeNull();
    const targetExecutionKey = `flow_builder_mvp_item_state_${targetCopyKey}`;
    const targetExecutionRaw = JSON.stringify({
      'e2e-execution-sentinel': {
        skipped: true,
        note: 'keep this target execution note',
      },
    }, null, 2);
    await page.evaluate(({ key, raw }) => window.localStorage.setItem(key, raw), {
      key: targetExecutionKey,
      raw: targetExecutionRaw,
    });
    const peerCopyKey = 'personal-copy:e2e-overwrite-peer';
    const peerRecordKey = `${SAVED_RECORD_PREFIX}${peerCopyKey}`;
    const peerRaw = await page.evaluate(({ targetKey, peerKey }) => {
      const targetRaw = window.localStorage.getItem(targetKey);
      if (!targetRaw) throw new Error('missing target fixture');
      const record = JSON.parse(targetRaw) as Record<string, unknown>;
      const raw = JSON.stringify({
        ...record,
        slug: peerKey,
        personalCopyKey: peerKey,
        personalTitle: 'peer byte sentinel',
        lastSaveRequestId: 'peer-request-before-overwrite',
        savedAt: '2030-12-01T00:00:00.000Z',
      }, null, 2);
      window.localStorage.setItem(`flow:saved:${peerKey}`, raw);
      return raw;
    }, { targetKey: targetRecordKey, peerKey: peerCopyKey });

    const identitiesBefore = await savedCopiesForSource(page);
    expect(identitiesBefore).toHaveLength(2);
    const dialog = await openExistingCopyDialog(page, '2031-04-20');
    const confirm = dialog.getByTestId('public-flow-existing-copy-confirm');
    await dialog.getByTestId('public-flow-existing-copy-choice-overwrite').check();
    await expect(confirm).toBeDisabled();
    const targetChoice = dialog.locator(
      `[data-testid="public-flow-existing-copy-overwrite-target"][data-personal-copy-key="${targetCopyKey}"]`,
    );
    await targetChoice.check();
    await expect(confirm).toBeEnabled();
    await confirm.click();

    expect(await expectFocusedPersonalCopyRoute(page)).toBe(targetCopyKey);
    await expect(page.getByTestId('my-flow-save-banner')).toHaveAttribute(
      'data-personal-copy-key',
      targetCopyKey,
    );
    await expect(selectedMobileWorkspace(page, targetCopyKey)).toBeVisible();
    const identitiesAfter = await savedCopiesForSource(page);
    expect(identitiesAfter).toHaveLength(identitiesBefore.length);
    expect(identitiesAfter.map((copy) => copy.record.personalCopyKey).sort()).toEqual(
      [targetCopyKey, peerCopyKey].sort(),
    );
    expect(await rawStorageValue(page, targetRecordKey)).not.toBe(targetRawBefore);
    expect(await rawStorageValue(page, peerRecordKey)).toBe(peerRaw);
    expect(JSON.parse(await rawStorageValue(page, targetExecutionKey) ?? '{}')).toEqual({
      'e2e-execution-sentinel': {
        skipped: true,
        note: 'keep this target execution note',
      },
    });

    await page.getByTestId('my-flow-save-undo').click();
    await expect(page.getByTestId('my-flow-save-banner')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-save-undo-status')).toContainText('되돌렸어요');
    expect(await rawStorageValue(page, targetRecordKey)).toBe(targetRawBefore);
    expect(await rawStorageValue(page, targetExecutionKey)).toBe(targetExecutionRaw);
    expect(await rawStorageValue(page, peerRecordKey)).toBe(peerRaw);
  });

  test('a failed overwrite locks its original target and retries only that identity', async ({ page }) => {
    const targetCopyKey = await createFirstPersonalCopy(page);
    const targetRecordKey = `${SAVED_RECORD_PREFIX}${targetCopyKey}`;
    const targetRawBefore = await rawStorageValue(page, targetRecordKey);
    const peerCopyKey = 'personal-copy:e2e-retry-peer';
    const peerRecordKey = `${SAVED_RECORD_PREFIX}${peerCopyKey}`;
    const peerRaw = await page.evaluate(({ targetKey, peerKey }) => {
      const targetRaw = window.localStorage.getItem(targetKey);
      if (!targetRaw) throw new Error('missing retry target fixture');
      const record = JSON.parse(targetRaw) as Record<string, unknown>;
      const raw = JSON.stringify({
        ...record,
        slug: peerKey,
        personalCopyKey: peerKey,
        personalTitle: 'retry peer sentinel',
        lastSaveRequestId: 'peer-request-before-retry',
        savedAt: '2030-12-02T00:00:00.000Z',
      }, null, 2);
      window.localStorage.setItem(`flow:saved:${peerKey}`, raw);
      return raw;
    }, { targetKey: targetRecordKey, peerKey: peerCopyKey });

    const dialog = await openExistingCopyDialog(page, '2031-04-30');
    await dialog.getByTestId('public-flow-existing-copy-choice-overwrite').check();
    const targetChoice = dialog.locator(
      `[data-testid="public-flow-existing-copy-overwrite-target"][data-personal-copy-key="${targetCopyKey}"]`,
    );
    const peerChoice = dialog.locator(
      `[data-testid="public-flow-existing-copy-overwrite-target"][data-personal-copy-key="${peerCopyKey}"]`,
    );
    await targetChoice.check();
    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      let localMutationCount = 0;
      let injected = false;
      Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
        if (this === window.localStorage && !injected) {
          localMutationCount += 1;
          if (localMutationCount === 3) {
            injected = true;
            throw new Error('simulated overwrite failure');
          }
        }
        return originalSetItem.call(this, key, value);
      };
    });
    await dialog.getByTestId('public-flow-existing-copy-confirm').click();

    const failure = dialog.getByTestId('public-flow-save-error');
    await expect(failure).toBeVisible();
    await expect(failure).toContainText('같은 방식으로 다시 저장');
    await expect(dialog.getByTestId('public-flow-existing-copy-choice-copy')).toBeDisabled();
    await expect(targetChoice).toBeDisabled();
    await expect(targetChoice).toBeChecked();
    await expect(peerChoice).toBeDisabled();
    expect(await rawStorageValue(page, targetRecordKey)).toBe(targetRawBefore);
    expect(await rawStorageValue(page, peerRecordKey)).toBe(peerRaw);

    await dialog.getByTestId('public-flow-save-retry').click();
    expect(await expectFocusedPersonalCopyRoute(page)).toBe(targetCopyKey);
    expect(await rawStorageValue(page, targetRecordKey)).not.toBe(targetRawBefore);
    expect(await rawStorageValue(page, peerRecordKey)).toBe(peerRaw);
  });

  test('new-copy confirmation adds exactly one identity even when its button receives two clicks', async ({ page }) => {
    const originalCopyKey = await createFirstPersonalCopy(page);
    const originalRecordKey = `${SAVED_RECORD_PREFIX}${originalCopyKey}`;
    const originalRaw = await rawStorageValue(page, originalRecordKey);
    const before = await savedCopiesForSource(page);
    expect(before).toHaveLength(1);

    const dialog = await openExistingCopyDialog(page, '2031-05-25');
    await chooseNewCopy(dialog, true);
    const newCopyKey = await expectFocusedPersonalCopyRoute(page);
    expect(newCopyKey).not.toBe(originalCopyKey);

    const after = await savedCopiesForSource(page);
    expect(after).toHaveLength(before.length + 1);
    const addedKeys = after
      .map((copy) => copy.record.personalCopyKey ?? '')
      .filter((copyKey) => !before.some((copy) => copy.record.personalCopyKey === copyKey));
    expect(addedKeys).toEqual([newCopyKey]);
    expect(new Set(after.map((copy) => copy.record.personalCopyKey)).size).toBe(2);
    expect(await rawStorageValue(page, originalRecordKey)).toBe(originalRaw);
    await expect(page.getByTestId('my-flow-save-banner')).toHaveAttribute(
      'data-personal-copy-key',
      newCopyKey,
    );
  });

  test('semantically invalid overwrite item state remains byte-exact and leaves the dialog cancelable', async ({ page }) => {
    const targetCopyKey = await createFirstPersonalCopy(page, '2031-06-02');
    const targetRecordKey = `${SAVED_RECORD_PREFIX}${targetCopyKey}`;
    const targetItemStateKey = `flow_builder_mvp_item_state_${targetCopyKey}`;
    const invalidItemStateRaw = '{"x":null}';
    await page.evaluate(({ key, raw }) => window.localStorage.setItem(key, raw), {
      key: targetItemStateKey,
      raw: invalidItemStateRaw,
    });

    const dialog = await openExistingCopyDialog(page, '2031-06-03');
    await dialog.getByTestId('public-flow-existing-copy-choice-overwrite').check();
    await dialog.locator(
      `[data-testid="public-flow-existing-copy-overwrite-target"][data-personal-copy-key="${targetCopyKey}"]`,
    ).check();
    const beforeConfirm = await localStorageRawSnapshot(page);
    const targetRecordRaw = await rawStorageValue(page, targetRecordKey);

    await dialog.getByTestId('public-flow-existing-copy-confirm').click();

    const failure = dialog.getByTestId('public-flow-save-error');
    await expect(failure).toBeVisible();
    await expect(failure).toContainText('저장된 개인 설정을 안전하게 읽지 못해');
    await expect(dialog).not.toHaveAttribute('aria-busy', 'true');
    await expect(dialog.getByTestId('public-flow-existing-copy-cancel')).toBeEnabled();
    await expect(dialog.getByTestId('public-flow-save-retry')).toBeEnabled();
    expect(await rawStorageValue(page, targetItemStateKey)).toBe(invalidItemStateRaw);
    expect(await rawStorageValue(page, targetRecordKey)).toBe(targetRecordRaw);
    expect(await localStorageRawSnapshot(page)).toEqual(beforeConfirm);
    expect((await savedCopiesForSource(page)).map((copy) => copy.storageKey)).toEqual([
      targetRecordKey,
    ]);
  });

  test('malformed shared item drafts stop save before every mutation and preserve the exact raw value', async ({ page }) => {
    await resetAndOpenSource(page);
    const malformedItemDraftsRaw = '{"broken":';
    await page.evaluate(({ key, raw }) => window.localStorage.setItem(key, raw), {
      key: ITEM_DRAFTS_STORAGE_KEY,
      raw: malformedItemDraftsRaw,
    });
    await page.getByTestId('public-flow-anchor-input').fill('2031-06-05');
    const beforeSave = await localStorageRawSnapshot(page);

    await page.getByTestId('public-flow-save-primary-mobile').click();

    const failure = page.getByTestId('public-flow-save-error-mobile');
    await expect(failure).toBeVisible();
    await expect(failure).toContainText('저장된 개인 설정을 안전하게 읽지 못해');
    await expect(failure).toContainText('기존 내용은 바꾸지 않았습니다');
    expect(await rawStorageValue(page, ITEM_DRAFTS_STORAGE_KEY)).toBe(
      malformedItemDraftsRaw,
    );
    expect(await localStorageRawSnapshot(page)).toEqual(beforeSave);
    expect(await savedCopiesForSource(page)).toHaveLength(0);
    expect(await page.evaluate((historyKey) => {
      const state = window.history.state as Record<string, unknown> | null;
      return state?.[historyKey] ?? null;
    }, RECOVERY_JOURNAL_HISTORY_KEY)).toBeNull();
  });

  test('an incomplete rollback keeps a history recovery journal across reload and restores exact original bytes', async ({ page }) => {
    await resetAndOpenSource(page);
    await page.getByTestId('public-flow-anchor-input').fill('2031-06-09');
    const beforeSave = await localStorageRawSnapshot(page);
    await installIncompleteRollbackFailure(page);

    await page.getByTestId('public-flow-save-primary-mobile').click();

    const failure = page.getByTestId('public-flow-save-error-mobile');
    await expect(failure).toBeVisible();
    await expect(failure).toContainText('완전히 복구하지 못했어요');
    await expect(failure.getByTestId('public-flow-save-recovery-mobile')).toBeVisible();
    expect(await rawStorageValue(page, DATE_OVERRIDES_STORAGE_KEY)).not.toBeNull();
    expect(await localStorageRawSnapshot(page)).not.toEqual(beforeSave);
    expect(await savedCopiesForSource(page)).toHaveLength(0);

    const journalBeforeReload = await historyRecoveryJournal(page);
    expect(journalBeforeReload).toMatchObject({
      schemaVersion: 3,
      sourceFlowSlug: SOURCE_FLOW_SLUG,
      rawBackup: {
        keys: expect.arrayContaining([
          ITEM_DRAFTS_STORAGE_KEY,
          DATE_OVERRIDES_STORAGE_KEY,
        ]),
      },
    });

    page.once('dialog', (dialog) => {
      void dialog.accept();
    });
    await page.reload();
    await expect(
      page.locator('main[data-p35-p004-save-lifecycle="on"]'),
    ).toBeVisible();
    await expect(page.getByTestId('public-flow-save-error-mobile')).toContainText(
      '중단된 저장을 취소하고 저장 전 상태로 복구했어요',
    );
    expect(await localStorageRawSnapshot(page)).toEqual(beforeSave);
    expect(await savedCopiesForSource(page)).toHaveLength(0);
    expect(await page.evaluate((historyKey) => {
      const state = window.history.state as Record<string, unknown> | null;
      return state?.[historyKey] ?? null;
    }, RECOVERY_JOURNAL_HISTORY_KEY)).toBeNull();
  });

  test('forced reload after incomplete rollback restores storage and reapplies the public title and anchor draft', async ({ page }) => {
    await resetAndOpenSource(page);
    const titleDraft = '복구해야 할 우리 집 이사 계획';
    const anchorDraft = '2031-06-09';
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const adjustment = page.getByTestId('public-flow-personal-adjustment');
    await adjustment.getByTestId('public-flow-adjustment-name-input').fill(titleDraft);
    await adjustment.getByTestId('public-flow-adjustment-apply').click();
    await expect(page.locator('[data-flow-identity-slot="title"]')).toHaveText(titleDraft);
    await page.getByTestId('public-flow-anchor-input').fill(anchorDraft);
    const beforeSave = await localStorageRawSnapshot(page);
    await installIncompleteRollbackFailure(page);

    await page.getByTestId('public-flow-save-primary-mobile').click();
    await expect(page.getByTestId('public-flow-save-error-mobile')).toContainText(
      '완전히 복구하지 못했어요',
    );
    expect(await historyRecoveryJournal(page)).toMatchObject({
      schemaVersion: 3,
      sessionDraft: {
        titleDraft,
        anchor: anchorDraft,
        anchorMode: 'custom',
      },
    });

    page.once('dialog', (dialog) => {
      void dialog.accept();
    });
    await page.reload();
    await expect(
      page.locator('main[data-p35-p004-save-lifecycle="on"]'),
    ).toBeVisible();
    await expect(page.getByTestId('public-flow-save-error-mobile')).toContainText(
      '중단된 저장을 취소하고 저장 전 상태로 복구했어요',
    );
    await expect(page.getByTestId('public-flow-anchor-input')).toHaveValue(anchorDraft);
    await expect(page.locator('[data-flow-identity-slot="title"]')).toHaveText(titleDraft);
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toBeEnabled();
    expect(await localStorageRawSnapshot(page)).toEqual(beforeSave);
    expect(await historyRecoveryJournal(page)).toBeNull();
    expect(await savedCopiesForSource(page)).toHaveLength(0);
  });

  test('reload recovery detects a newer shared value and performs zero recovery writes', async ({ page }) => {
    await resetAndOpenSource(page);
    await page.getByTestId('public-flow-anchor-input').fill('2031-06-09');
    await installIncompleteRollbackFailure(page);
    await page.getByTestId('public-flow-save-primary-mobile').click();
    const initialFailure = page.getByTestId('public-flow-save-error-mobile');
    await expect(initialFailure).toContainText('완전히 복구하지 못했어요');

    const newerSharedRaw = JSON.stringify({
      'external:later-edit': '2044-01-01',
    });
    await page.evaluate(({ key, raw }) => window.localStorage.setItem(key, raw), {
      key: DATE_OVERRIDES_STORAGE_KEY,
      raw: newerSharedRaw,
    });
    const journalBeforeReload = await historyRecoveryJournal(page);
    expect(journalBeforeReload).not.toBeNull();
    const journalKeys = journalBeforeReload?.rawBackup.keys ?? [];
    const relevantBeforeReload = await rawStorageValues(page, journalKeys);

    page.once('dialog', (dialog) => {
      void dialog.accept();
    });
    await page.reload();
    await expect(
      page.locator('main[data-p35-p004-save-lifecycle="on"]'),
    ).toBeVisible();
    const failure = page.getByTestId('public-flow-save-error-mobile');
    await expect(failure).toContainText('다른 변경이 생겨 자동 복구를 멈췄어요');
    await expect(failure).toContainText('현재 변경은 건드리지 않았습니다');
    await expect(failure.getByTestId('public-flow-save-recovery-mobile')).toBeVisible();
    expect(await rawStorageValue(page, DATE_OVERRIDES_STORAGE_KEY)).toBe(newerSharedRaw);
    expect(await rawStorageValues(page, journalKeys)).toEqual(relevantBeforeReload);
    expect(await historyRecoveryJournal(page)).toEqual(journalBeforeReload);
    expect(await savedCopiesForSource(page)).toHaveLength(0);
  });

  test('a matching committed recovery journal routes to its selected My Flow without rewriting it', async ({ page }) => {
    await resetAndOpenSource(page);
    await page.getByTestId('public-flow-anchor-input').fill('2031-06-10');
    await installIncompleteRollbackFailure(page);
    await page.getByTestId('public-flow-save-primary-mobile').click();
    await expect(page.getByTestId('public-flow-save-error-mobile')).toContainText(
      '완전히 복구하지 못했어요',
    );

    const journal = await applyRecoveryJournalPostSaveBytes(page);
    const personalCopyKey = journal.choice.personalCopyKey;
    const savedRecordKey = `${SAVED_RECORD_PREFIX}${personalCopyKey}`;
    const committedRecordRaw = await rawStorageValue(page, savedRecordKey);
    expect(committedRecordRaw).not.toBeNull();
    expect(await savedCopiesForSource(page)).toHaveLength(1);

    page.once('dialog', (dialog) => {
      void dialog.accept();
    });
    await page.reload();

    expect(await expectFocusedPersonalCopyRoute(page)).toBe(personalCopyKey);
    await expect(selectedMobileWorkspace(page, personalCopyKey)).toBeVisible();
    expect(await rawStorageValue(page, savedRecordKey)).toBe(committedRecordRaw);
    expect((await savedCopiesForSource(page)).map((copy) => copy.storageKey)).toEqual([
      savedRecordKey,
    ]);
    expect(await historyRecoveryJournal(page)).toBeNull();
  });

  test('a transient committed-marker read failure blocks recovery writes and retry routes to the committed copy', async ({ page }) => {
    await resetAndOpenSource(page);
    await page.getByTestId('public-flow-anchor-input').fill('2031-06-10');
    await installIncompleteRollbackFailure(page);
    await page.getByTestId('public-flow-save-primary-mobile').click();
    await expect(page.getByTestId('public-flow-save-error-mobile')).toContainText(
      '완전히 복구하지 못했어요',
    );

    const journal = await applyRecoveryJournalPostSaveBytes(page);
    const personalCopyKey = journal.choice.personalCopyKey;
    const savedRecordKey = `${SAVED_RECORD_PREFIX}${personalCopyKey}`;
    const journalKeys = journal.rawBackup.keys;
    const committedValues = await rawStorageValues(page, journalKeys);
    const committedRecordRaw = await rawStorageValue(page, savedRecordKey);
    await page.addInitScript(({ sourcePath, targetKey, onceKey }) => {
      if (window.location.pathname !== sourcePath) return;
      if (window.sessionStorage.getItem(onceKey) === 'done') return;
      const originalGetItem = Storage.prototype.getItem;
      let injected = false;
      Storage.prototype.getItem = function patchedGetItem(key: string) {
        if (this === window.localStorage && key === targetKey && !injected) {
          injected = true;
          window.sessionStorage.setItem(onceKey, 'done');
          throw new Error('simulated transient committed-marker read failure');
        }
        return originalGetItem.call(this, key);
      };
    }, {
      sourcePath: SOURCE_ROUTE,
      targetKey: savedRecordKey,
      onceKey: 'e2e:p004:committed-marker-read-failed',
    });

    page.once('dialog', (dialog) => {
      void dialog.accept();
    });
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${SOURCE_ROUTE}(?:\\?.*)?$`, 'u'));
    const failure = page.getByTestId('public-flow-save-error-mobile');
    await expect(failure).toContainText('저장 성공 여부를 안전하게 확인하지 못해');
    await expect(failure).toContainText('현재 저장값은 건드리지 않았습니다');
    await expect(failure.getByTestId('public-flow-save-recovery-mobile')).toBeVisible();
    expect(await rawStorageValues(page, journalKeys)).toEqual(committedValues);
    expect(await rawStorageValue(page, savedRecordKey)).toBe(committedRecordRaw);
    expect(await historyRecoveryJournal(page)).toEqual(journal);
    expect(await savedCopiesForSource(page)).toHaveLength(1);

    page.once('dialog', (dialog) => {
      void dialog.accept();
    });
    await failure.getByTestId('public-flow-save-recovery-mobile').click();
    expect(await expectFocusedPersonalCopyRoute(page)).toBe(personalCopyKey);
    expect(await rawStorageValue(page, savedRecordKey)).toBe(committedRecordRaw);
    expect((await savedCopiesForSource(page)).map((copy) => copy.storageKey)).toEqual([
      savedRecordKey,
    ]);
  });

  test('undo aborts without any write when a saved key changed after save', async ({ page }) => {
    const personalCopyKey = await createFirstPersonalCopy(page, '2031-06-11');
    const savedRecordKey = `${SAVED_RECORD_PREFIX}${personalCopyKey}`;
    const followUpRaw = await page.evaluate((storageKey) => {
      const savedRaw = window.localStorage.getItem(storageKey);
      if (!savedRaw) throw new Error('missing saved record for undo conflict fixture');
      const nextRaw = JSON.stringify({
        ...(JSON.parse(savedRaw) as Record<string, unknown>),
        e2eFollowUpEdit: 'must survive stale undo',
      }, null, 2);
      window.localStorage.setItem(storageKey, nextRaw);
      return nextRaw;
    }, savedRecordKey);
    const afterFollowUpEdit = await localStorageRawSnapshot(page);

    await page.getByTestId('my-flow-save-undo').click();

    await expect(page.getByTestId('my-flow-save-banner')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-save-undo-status')).toContainText(
      '저장 후 다른 변경이 생겨 되돌리기를 중단했어요',
    );
    await expect(page.getByTestId('my-flow-save-undo-status')).toContainText(
      '현재 변경은 그대로 유지됩니다',
    );
    expect(await localStorageRawSnapshot(page)).toEqual(afterFollowUpEdit);
    expect(await rawStorageValue(page, savedRecordKey)).toBe(followUpRaw);
    expect((await savedCopiesForSource(page)).map((copy) => copy.storageKey)).toEqual([
      savedRecordKey,
    ]);
    await expect(page.getByTestId('my-flow-save-undo')).toHaveCount(0);
  });

  test('identical existing-copy title and saved time still expose unique copy labels', async ({ page }) => {
    const firstCopyKey = await createFirstPersonalCopy(page, '2031-06-13');
    const firstRecordKey = `${SAVED_RECORD_PREFIX}${firstCopyKey}`;
    const secondCopyKey = 'personal-copy:e2e-identical-label-peer';
    await page.evaluate(({ firstKey, secondKey }) => {
      const firstRaw = window.localStorage.getItem(firstKey);
      if (!firstRaw) throw new Error('missing first copy for identical-label fixture');
      const firstRecord = {
        ...(JSON.parse(firstRaw) as Record<string, unknown>),
        personalTitle: '동일한 저장본',
        savedAt: '2031-06-13T08:09:10.000Z',
      };
      window.localStorage.setItem(firstKey, JSON.stringify(firstRecord, null, 2));
      window.localStorage.setItem(`flow:saved:${secondKey}`, JSON.stringify({
        ...firstRecord,
        slug: secondKey,
        personalCopyKey: secondKey,
        lastSaveRequestId: 'peer-request-identical-label',
      }, null, 2));
    }, { firstKey: firstRecordKey, secondKey: secondCopyKey });

    const dialog = await openExistingCopyDialog(page, '2031-06-14');
    await dialog.getByTestId('public-flow-existing-copy-choice-overwrite').check();
    const targets = dialog.getByTestId('public-flow-existing-copy-overwrite-target');
    await expect(targets).toHaveCount(2);
    await expect(targets.nth(0)).toHaveAccessibleName(/동일한 저장본\s+사본 1\s+·/u);
    await expect(targets.nth(1)).toHaveAccessibleName(/동일한 저장본\s+사본 2\s+·/u);
  });

  test('storage failure rolls every key back, keeps the draft, and retries with one identity', async ({ page }) => {
    await resetAndOpenSource(page);
    const draftAnchor = '2031-06-12';
    const anchorInput = page.getByTestId('public-flow-anchor-input');
    await anchorInput.fill(draftAnchor);
    const before = await localStorageRawSnapshot(page);
    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      let localMutationCount = 0;
      let injected = false;
      Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
        if (this === window.localStorage && !injected) {
          localMutationCount += 1;
          if (localMutationCount === 3) {
            injected = true;
            const error = new Error('simulated local quota failure');
            error.name = 'QuotaExceededError';
            throw error;
          }
        }
        return originalSetItem.call(this, key, value);
      };
    });

    await page.getByTestId('public-flow-save-primary-mobile').click();
    const failure = page.getByTestId('public-flow-save-error-mobile');
    await expect(failure).toBeVisible();
    await expect(failure).toBeFocused();
    const failureBox = await failure.boundingBox();
    expect(failureBox).not.toBeNull();
    expect((failureBox?.y ?? -1) >= 0).toBe(true);
    expect((failureBox?.y ?? 0) + (failureBox?.height ?? 0)).toBeLessThanOrEqual(
      MOBILE_VIEWPORT.height,
    );
    await expect(failure).toContainText('수정 내용은 그대로 남아 있습니다');
    await expect(anchorInput).toHaveValue(draftAnchor);
    expect(await localStorageRawSnapshot(page)).toEqual(before);
    expect(await savedCopiesForSource(page)).toHaveLength(0);

    await failure.getByTestId('public-flow-save-retry-mobile').click();
    const personalCopyKey = await expectFocusedPersonalCopyRoute(page);
    const copies = await savedCopiesForSource(page);
    expect(copies).toHaveLength(1);
    expect(copies[0]?.record.personalCopyKey).toBe(personalCopyKey);
    expect(copies[0]?.record.anchor).toBe(draftAnchor);
  });

  test('an incomplete rollback must recover original bytes before save retry or cancel', async ({ page }) => {
    await resetAndOpenSource(page);
    const draftAnchor = '2031-06-18';
    await page.getByTestId('public-flow-anchor-input').fill(draftAnchor);
    const before = await localStorageRawSnapshot(page);
    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      const originalRemoveItem = Storage.prototype.removeItem;
      let localMutationCount = 0;
      let forwardFailed = false;
      let rollbackFailed = false;
      Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
        if (this === window.localStorage && !forwardFailed) {
          localMutationCount += 1;
          if (localMutationCount === 3) {
            forwardFailed = true;
            throw new Error('simulated forward storage failure');
          }
        }
        return originalSetItem.call(this, key, value);
      };
      Storage.prototype.removeItem = function patchedRemoveItem(key: string) {
        if (this === window.localStorage && forwardFailed && !rollbackFailed) {
          rollbackFailed = true;
          throw new Error('simulated first rollback failure');
        }
        return originalRemoveItem.call(this, key);
      };
    });

    await page.getByTestId('public-flow-save-primary-mobile').click();
    const failure = page.getByTestId('public-flow-save-error-mobile');
    await expect(failure).toBeVisible();
    await expect(failure).toContainText('완전히 복구하지 못했어요');
    await expect(failure.getByTestId('public-flow-save-recovery-mobile')).toBeVisible();
    await expect(failure.getByTestId('public-flow-save-error-cancel-mobile')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toBeDisabled();

    await failure.getByTestId('public-flow-save-recovery-mobile').click();
    await expect(failure).toContainText('저장 전 상태로 복구했어요');
    expect(await localStorageRawSnapshot(page)).toEqual(before);
    await expect(failure.getByTestId('public-flow-save-retry-mobile')).toBeVisible();
    await expect(failure.getByTestId('public-flow-save-error-cancel-mobile')).toBeVisible();

    await failure.getByTestId('public-flow-save-retry-mobile').click();
    const personalCopyKey = await expectFocusedPersonalCopyRoute(page);
    const copies = await savedCopiesForSource(page);
    expect(copies).toHaveLength(1);
    expect(copies[0]?.record.personalCopyKey).toBe(personalCopyKey);
    expect(copies[0]?.record.anchor).toBe(draftAnchor);
  });

  test('session handoff failure falls back to one history receipt with undo', async ({ page }) => {
    await resetAndOpenSource(page);
    const draftAnchor = '2031-06-24';
    await page.getByTestId('public-flow-anchor-input').fill(draftAnchor);
    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
        if (this === window.sessionStorage) {
          const error = new Error('simulated disabled session storage');
          error.name = 'QuotaExceededError';
          throw error;
        }
        return originalSetItem.call(this, key, value);
      };
    });

    await page.getByTestId('public-flow-save-primary-mobile').click();
    const personalCopyKey = await expectFocusedPersonalCopyRoute(page);
    const banner = page.getByTestId('my-flow-save-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('data-personal-copy-key', personalCopyKey);
    await expect(banner.getByTestId('my-flow-save-banner-summary')).toHaveText('저장됨 · 24개');
    await page.getByTestId('my-flow-save-undo').click();
    await expect(page.getByTestId('my-flow-save-banner')).toHaveCount(0);
    expect(await rawStorageValue(page, `${SAVED_RECORD_PREFIX}${personalCopyKey}`)).toBeNull();
  });

  test('a throwing sessionStorage getter also falls back to one history receipt', async ({ page }) => {
    await resetAndOpenSource(page);
    await page.getByTestId('public-flow-anchor-input').fill('2031-06-25');
    await page.evaluate(() => {
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        get() {
          throw new DOMException('simulated denied session storage getter', 'SecurityError');
        },
      });
    });

    await page.getByTestId('public-flow-save-primary-mobile').click();
    const personalCopyKey = await expectFocusedPersonalCopyRoute(page);
    await expect(page.getByTestId('my-flow-save-banner')).toHaveAttribute(
      'data-personal-copy-key',
      personalCopyKey,
    );
    await page.getByTestId('my-flow-save-undo').click();
    await expect(page.getByTestId('my-flow-save-banner')).toHaveCount(0);
    expect(await rawStorageValue(page, `${SAVED_RECORD_PREFIX}${personalCopyKey}`)).toBeNull();
  });

  test('undo removes a newly created copy while preserving the first identity and public source', async ({ page }) => {
    const originalCopyKey = await createFirstPersonalCopy(page);
    const originalRecordKey = `${SAVED_RECORD_PREFIX}${originalCopyKey}`;
    const originalRaw = await rawStorageValue(page, originalRecordKey);
    const dialog = await openExistingCopyDialog(page, '2031-06-30');
    await chooseNewCopy(dialog);
    const newCopyKey = await expectFocusedPersonalCopyRoute(page);
    const newRecordKey = `${SAVED_RECORD_PREFIX}${newCopyKey}`;
    expect((await savedCopiesForSource(page)).length).toBe(2);
    await expect(page.getByTestId('my-flow-save-banner')).toHaveAttribute(
      'data-personal-copy-key',
      newCopyKey,
    );

    await page.getByTestId('my-flow-save-undo').click();
    await expect.poll(() => {
      const url = new URL(page.url());
      return `${url.pathname}${url.search}`;
    }).toBe('/my?view=flows&savedPlanLibrary=off');
    await expect(page.getByTestId('my-flow-save-banner')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-save-undo-status')).toBeVisible();
    expect(await rawStorageValue(page, newRecordKey)).toBeNull();
    expect(await rawStorageValue(page, `flow:${newCopyKey}:anchorDate`)).toBeNull();
    expect(await rawStorageValue(
      page,
      `flow_builder_mvp_item_state_${newCopyKey}`,
    )).toBeNull();
    expect(await rawStorageValue(page, originalRecordKey)).toBe(originalRaw);
    expect(await rawStorageValue(page, `${SAVED_RECORD_PREFIX}${SOURCE_FLOW_SLUG}`)).toBeNull();
    const remainingCopies = await savedCopiesForSource(page);
    expect(remainingCopies.map((copy) => copy.record.personalCopyKey)).toEqual([
      originalCopyKey,
    ]);

    await gotoLegacySavedPlanLibraryRoute(page, SOURCE_ROUTE);
    await expect(
      page.locator('main[data-p35-p004-save-lifecycle="on"]'),
    ).toBeVisible();
    await expect(page.getByTestId('public-flow-hero')).toBeVisible();
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toBeVisible();
    expect(await rawStorageValue(page, originalRecordKey)).toBe(originalRaw);
  });
});
