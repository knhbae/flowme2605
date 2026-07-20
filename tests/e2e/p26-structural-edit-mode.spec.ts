import fs from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

async function openFlowView(page: Page) {
  const postSave = page.getByTestId('my-flow-post-save-panel');
  if (await postSave.isVisible().catch(() => false)) {
    await postSave.getByTestId('my-flow-post-save-view-flow').click();
  }
  await page.getByTestId('my-flow-view-flow').click();
}

function getDraftFlow(page: Page) {
  return page.locator(
    '[data-testid="my-flow-mobile-structure-row"][data-flow-slug^="url-draft-"]:visible, [data-testid="my-flow-overview-card"][data-flow-slug^="url-draft-"]:visible',
  ).first();
}

async function openDraftFlow(flow: Locator) {
  const open = flow.getByTestId('my-flow-mobile-structure-open');
  if (await open.isVisible().catch(() => false)) {
    if ((await open.getAttribute('aria-expanded')) !== 'true') await open.click();
  }
}

async function setStructureMode(flow: Locator, open: boolean) {
  const toggle = flow.getByTestId('my-flow-batch-mode-toggle').first();
  const active = (await toggle.getAttribute('aria-pressed')) === 'true';
  if (active !== open) await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', open ? 'true' : 'false');
}

test.use({ timezoneId: 'Asia/Seoul' });

test('personal draft structure mode separates execution from add, reorder, remove, restore, and export order', async ({ page }) => {
  test.setTimeout(180_000);
  const evidenceDir = process.env.FLOWME_P26_11_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('URL 또는 메모').fill(
    '여권 만료일을 확인한다. 숙소 주소를 저장한다. 보험 서류를 챙긴다.',
  );
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
  const editor = page.getByTestId('flow-memo-draft-editor');
  await expect(editor.getByTestId('flow-memo-draft-item')).toHaveCount(3);
  await editor.getByLabel('메모 초안 제목').fill('여행 준비 구성');
  await editor.getByRole('button', { name: '내 Flow에 초안 저장' }).click();

  await expect(page).toHaveURL(/\/my/);
  await openFlowView(page);
  let flow = getDraftFlow(page);
  await openDraftFlow(flow);

  await expect(flow.getByTestId('personal-draft-structural-controls')).toHaveCount(0);
  await expect(flow.getByTestId('personal-draft-reorder-controls')).toHaveCount(0);
  await expect(flow.getByTestId('personal-draft-delete-item')).toHaveCount(0);
  await expect(flow.getByTestId('my-flow-task-complete-control').first()).toBeVisible();

  await setStructureMode(flow, true);
  const outline = flow.getByTestId('my-flow-whole-flow-outline');
  await expect(outline).toHaveAttribute('data-structure-edit-mode', 'true');
  await expect(outline.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await expect(outline.getByTestId('personal-draft-add-entry')).toBeVisible();
  await expect(outline.getByTestId('my-flow-batch-selectable-row')).toHaveCount(3);
  const toolbar = outline.getByTestId('my-flow-batch-toolbar');
  await expect(toolbar).toHaveAttribute('data-toolbar-layout', 'fixed-above-nav');
  await expect(toolbar.getByTestId('my-flow-batch-selected-count')).toHaveText('0개 선택');

  const toolbarBox = await toolbar.boundingBox();
  const mobileTabsBox = await page.getByTestId('platform-mobile-tabs').boundingBox();
  expect(toolbarBox).not.toBeNull();
  expect(mobileTabsBox).not.toBeNull();
  expect((toolbarBox?.y ?? 0) + (toolbarBox?.height ?? 0)).toBeLessThanOrEqual((mobileTabsBox?.y ?? 0) + 2);

  await outline.getByTestId('personal-draft-add-entry').click();
  await outline.getByTestId('personal-draft-add-title').fill('충전기 위치 확인');
  await outline.getByTestId('personal-draft-add-title').press('Enter');
  let rows = outline.getByTestId('my-flow-batch-selectable-row');
  await expect(rows).toHaveCount(4);
  let addedRow = rows.filter({ hasText: '충전기 위치 확인' });
  const addedStableId = await addedRow.getAttribute('data-item-id');
  expect(addedStableId).toMatch(/^personal-item-/);
  await expect(addedRow).toHaveAttribute('data-structural-ownership', 'user_created');

  const orderBefore = await rows.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-item-id')));
  const moveUp = addedRow.getByTestId('personal-draft-move-up');
  await moveUp.focus();
  await page.keyboard.press('Enter');
  rows = outline.getByTestId('my-flow-batch-selectable-row');
  const orderAfter = await rows.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-item-id')));
  expect(orderAfter.indexOf(addedStableId)).toBe(orderBefore.indexOf(addedStableId) - 1);
  await expect(rows.first().getByTestId('personal-draft-move-up')).toBeDisabled();
  await expect(rows.last().getByTestId('personal-draft-move-down')).toBeDisabled();

  addedRow = rows.filter({ hasText: '충전기 위치 확인' });
  await addedRow.getByTestId('my-flow-batch-item-checkbox').check();
  await expect(toolbar.getByTestId('my-flow-batch-selected-count')).toHaveText('1개 선택');
  await toolbar.getByTestId('my-flow-batch-open-date-tool').click();
  await expect(toolbar.getByTestId('my-flow-batch-date-tool')).toBeVisible();
  await toolbar.getByTestId('my-flow-batch-date-tool-back').click();
  page.once('dialog', (dialog) => {
    expect(dialog.message()).toContain('나중에 구성 편집에서 복구');
    void dialog.accept();
  });
  await toolbar.getByTestId('my-flow-batch-remove-selected').click();
  await expect(rows.filter({ hasText: '충전기 위치 확인' })).toHaveCount(0);
  const undo = outline.getByTestId('my-flow-batch-undo');
  await expect(undo).toContainText('1개를 Flow에서 뺐어요');
  await undo.getByTestId('my-flow-batch-undo-action').click();
  addedRow = outline.getByTestId('my-flow-batch-selectable-row').filter({ hasText: '충전기 위치 확인' });
  await expect(addedRow).toHaveAttribute('data-item-id', addedStableId ?? '');

  const sourceRow = outline.locator('[data-testid="my-flow-batch-selectable-row"][data-structural-ownership="source"]').first();
  const sourceStableId = await sourceRow.getAttribute('data-item-id');
  const sourceTitle = (await sourceRow.locator('span.block.break-keep').first().innerText()).trim();
  await sourceRow.getByTestId('my-flow-batch-item-checkbox').check();
  page.once('dialog', (dialog) => void dialog.accept());
  await toolbar.getByTestId('my-flow-batch-remove-selected').click();

  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/screenshots/01-mobile-structure-edit.png` });
  }

  await page.reload();
  await openFlowView(page);
  flow = getDraftFlow(page);
  await openDraftFlow(flow);
  await expect(flow.getByTestId('personal-draft-persistent-recovery')).toHaveCount(0);
  await setStructureMode(flow, true);
  const recovery = flow.getByTestId('personal-draft-persistent-recovery');
  await recovery.getByTestId('personal-draft-persistent-recovery-entry').click();
  const recoverable = recovery.getByTestId('personal-draft-recoverable-item').filter({ hasText: sourceTitle });
  await expect(recoverable).toHaveAttribute('data-item-id', sourceStableId ?? '');
  await recoverable.getByTestId('personal-draft-restore-item').focus();
  await page.keyboard.press('Space');
  await expect(flow.getByTestId('my-flow-batch-selectable-row').filter({ hasText: sourceTitle })).toHaveAttribute(
    'data-item-id',
    sourceStableId ?? '',
  );

  await setStructureMode(flow, false);
  await flow.getByTestId('personal-draft-list-export-toggle').click();
  const exportPanel = flow.getByTestId('my-flow-export-panel');
  await exportPanel.getByTestId('personal-draft-copy-checklist').click();
  const checklist = await page.evaluate(() => navigator.clipboard.readText());
  const addedIndex = checklist.indexOf('충전기 위치 확인');
  expect(addedIndex).toBeGreaterThanOrEqual(0);
  const effectiveItems = flow.getByTestId('personal-draft-effective-item');
  const itemOrder = await effectiveItems.evaluateAll(
    (nodes) => nodes.map((node) => node.getAttribute('data-item-id')),
  );
  expect(itemOrder).toEqual(orderAfter);
  const orderedTitles = await effectiveItems.evaluateAll((nodes) => nodes.map((node) => {
    const row = node.querySelector<HTMLElement>('[data-testid="my-flow-mobile-structure-step-row"]');
    return (row?.innerText ?? '')
      .split(/\n+/u)
      .map((line) => line.replace(/\s+/gu, ' ').trim())
      .find((line) => !/^단계 \d+$/u.test(line) && !/^(열기|열림|완료)$/u.test(line)) ?? '';
  }));
  const exportTitleOffsets = orderedTitles.map((title) => checklist.indexOf(title));
  expect(exportTitleOffsets.every((offset) => offset >= 0)).toBe(true);
  expect(exportTitleOffsets).toEqual(exportTitleOffsets.slice().sort((left, right) => left - right));

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  await openFlowView(page);
  flow = getDraftFlow(page);
  await setStructureMode(flow, true);
  const wideOutline = flow.getByTestId('my-flow-whole-flow-outline');
  await expect(wideOutline.getByTestId('my-flow-batch-toolbar')).toHaveAttribute('data-toolbar-layout', 'inline');
  await expect(wideOutline.getByTestId('personal-draft-move-up')).toHaveCount(4);
  await expect(wideOutline.getByTestId('personal-draft-move-down')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/screenshots/02-wide-structure-edit.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=source-backed');
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.locator('[data-structure-edit-toggle="true"]')).toHaveCount(0);
  await expect(page.getByTestId('personal-draft-structural-controls')).toHaveCount(0);
  await expect(page.getByTestId('personal-draft-reorder-controls')).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});
