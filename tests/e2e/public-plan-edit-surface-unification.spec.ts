import { expect, test, type Locator, type Page } from '@playwright/test';

const FLOW_ROUTE = '/f/curated-allblanc-no-jump-cardio';
const MAP_ID = 'middle-school-math-1';
const MAP_ROUTE = `/flow-maps/${MAP_ID}`;
const DATED_MAP_ROUTE = '/flow-maps/postal-address-transfer';
const MAP_FLOW_SLUG = 'source-backed-middle-school-math-1';

const VIEWPORTS = [
  { label: '390', width: 390, height: 844 },
  { label: '1024', width: 1024, height: 900 },
  { label: '1440', width: 1440, height: 1000 },
] as const;

type EditorContract = Readonly<{
  context: string | null;
  level: string | null;
  frame: string | null;
  adapter: string | null;
  transaction: string | null;
  semanticRole: string | null;
  commitRole: string | null;
  schemaFields: string[];
  commitLabel: string;
  cancelLabel: string;
}>;

async function clearBrowserStorage(page: Page) {
  await page.goto('/flows');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

async function readRawBrowserStorage(page: Page) {
  return page.evaluate(() => ({
    local: Object.keys(window.localStorage)
      .sort()
      .map((key) => [key, window.localStorage.getItem(key)]),
    session: Object.keys(window.sessionStorage)
      .sort()
      .map((key) => [key, window.sessionStorage.getItem(key)]),
  }));
}

async function readEditorContract(
  editor: Locator,
  commitTestId: string,
  cancelTestId: string,
): Promise<EditorContract> {
  const attributes = await editor.evaluate((element) => ({
    context: element.getAttribute('data-editor-context'),
    level: element.getAttribute('data-editor-level'),
    frame: element.getAttribute('data-editor-frame'),
    adapter: element.getAttribute('data-editor-adapter'),
    transaction: element.getAttribute('data-editor-transaction'),
    semanticRole: element.getAttribute('data-editor-semantic-role'),
    commitRole: element.getAttribute('data-editor-commit-role'),
    schemaFields: (element.getAttribute('data-editor-schema-fields') ?? '')
      .split(',')
      .filter(Boolean),
  }));
  return {
    ...attributes,
    commitLabel: (await editor.getByTestId(commitTestId).innerText()).trim(),
    cancelLabel: (await editor.getByTestId(cancelTestId).innerText()).trim(),
  };
}

async function expectSharedPlanEditor(editor: Locator) {
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute('data-editor-context', 'public-draft');
  await expect(editor).toHaveAttribute('data-editor-level', 'plan');
  await expect(editor).toHaveAttribute('data-editor-frame', 'shared');
  await expect(editor).toHaveAttribute('data-editor-adapter', 'shared');
  await expect(editor).toHaveAttribute('data-editor-transaction', 'atomic');
  await expect(editor).toHaveAttribute('data-editor-commit-role', 'apply-public-draft');
  await expect(editor.getByTestId('public-flow-adjustment-apply')).toHaveText('변경 반영');
  await expect(editor.getByTestId('public-flow-adjustment-cancel')).toHaveText('취소');
}

async function expectSharedItemEditor(editor: Locator) {
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute('data-editor-context', 'public-draft');
  await expect(editor).toHaveAttribute('data-editor-level', 'item');
  await expect(editor).toHaveAttribute('data-editor-frame', 'shared');
  await expect(editor).toHaveAttribute('data-editor-adapter', 'shared');
  await expect(editor).toHaveAttribute('data-editor-transaction', 'atomic-child');
  await expect(editor).toHaveAttribute(
    'data-editor-commit-role',
    'apply-item-to-parent-public-draft',
  );
  await expect(editor.getByTestId('public-flow-item-editor-save')).toHaveText('변경 반영');
  await expect(editor.getByTestId('public-flow-item-editor-cancel')).toHaveText('취소');
}

function mapEditTrigger(page: Page, viewportWidth: number) {
  return page.getByTestId(
    viewportWidth < 640 ? 'flow-map-adjust-save-mobile' : 'flow-map-adjust-save',
  );
}

async function openMapPlanEditor(page: Page, viewportWidth: number) {
  const trigger = mapEditTrigger(page, viewportWidth);
  await trigger.focus();
  await trigger.click();
  const editor = page.getByTestId('public-flow-personal-adjustment');
  await expectSharedPlanEditor(editor);
  return { trigger, editor };
}

async function expectNoHorizontalOverflow(page: Page, editor?: Locator) {
  const geometry = await page.evaluate(() => ({
    documentOverflow: Math.max(
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      document.body.scrollWidth - document.body.clientWidth,
    ),
  }));
  expect(geometry.documentOverflow).toBeLessThanOrEqual(1);

  if (editor) {
    const editorOverflow = await editor.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(editorOverflow.scrollWidth).toBeLessThanOrEqual(editorOverflow.clientWidth + 1);
  }
}

async function expectEditorGeometry(
  page: Page,
  editor: Locator,
  viewport: { width: number; height: number },
) {
  const box = await editor.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.y + box!.height).toBeGreaterThanOrEqual(viewport.height - 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);

  if (viewport.width < 768) {
    expect(box!.x).toBeLessThanOrEqual(1);
    expect(box!.width).toBeGreaterThanOrEqual(viewport.width - 1);
  } else {
    expect(box!.x + box!.width).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(box!.width).toBeLessThanOrEqual(673);
  }

  const actionButtons = editor.locator('[data-editor-actions-sticky="true"] button');
  const actionCount = await actionButtons.count();
  expect(actionCount).toBeGreaterThan(0);
  for (let index = 0; index < actionCount; index += 1) {
    const actionBox = await actionButtons.nth(index).boundingBox();
    expect(actionBox).not.toBeNull();
    expect(actionBox!.height).toBeGreaterThanOrEqual(47.5);
  }
  await expectNoHorizontalOverflow(page, editor);
}

async function readMapStorage(page: Page) {
  return page.evaluate(({ mapId, flowSlug }) => ({
    snapshotRaw: window.localStorage.getItem(`flow:map:saved:${mapId}`),
    persistenceRaw: window.localStorage.getItem(`flow:map:persistence:${mapId}`),
    snapshot: JSON.parse(window.localStorage.getItem(`flow:map:saved:${mapId}`) ?? 'null'),
    persistence: JSON.parse(
      window.localStorage.getItem(`flow:map:persistence:${mapId}`) ?? 'null',
    ),
    savedFlow: JSON.parse(window.localStorage.getItem(`flow:saved:${flowSlug}`) ?? 'null'),
  }), { mapId: MAP_ID, flowSlug: MAP_FLOW_SLUG });
}

test.describe('public Plan edit surface unification', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserStorage(page);
  });

  test('ordinary Flow and executable Map share the public Plan/Item frame, semantics, and CTAs', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });

    await page.goto(FLOW_ROUTE);
    await page.getByTestId('public-flow-adjust-entry').click();
    const flowPlan = page.getByTestId('public-flow-personal-adjustment');
    await expectSharedPlanEditor(flowPlan);
    const flowPlanContract = await readEditorContract(
      flowPlan,
      'public-flow-adjustment-apply',
      'public-flow-adjustment-cancel',
    );
    await flowPlan.getByTestId('public-flow-adjustment-kind-items').click();
    await flowPlan.getByTestId('public-flow-adjustment-item-edit').first().click();
    const flowItem = page.getByTestId('public-flow-item-editor');
    await expectSharedItemEditor(flowItem);
    const flowItemContract = await readEditorContract(
      flowItem,
      'public-flow-item-editor-save',
      'public-flow-item-editor-cancel',
    );
    await flowItem.getByTestId('public-flow-item-editor-cancel').click();
    await flowPlan.getByTestId('public-flow-adjustment-cancel').click();

    await page.goto(MAP_ROUTE);
    const { editor: mapPlan } = await openMapPlanEditor(page, 1024);
    const mapPlanContract = await readEditorContract(
      mapPlan,
      'public-flow-adjustment-apply',
      'public-flow-adjustment-cancel',
    );
    await mapPlan.getByTestId('public-flow-adjustment-kind-items').click();
    await mapPlan.getByTestId('public-flow-adjustment-item-edit').first().click();
    const mapItem = page.getByTestId('public-flow-item-editor');
    await expectSharedItemEditor(mapItem);
    const mapItemContract = await readEditorContract(
      mapItem,
      'public-flow-item-editor-save',
      'public-flow-item-editor-cancel',
    );

    expect({ ...mapPlanContract, schemaFields: undefined }).toEqual({
      ...flowPlanContract,
      schemaFields: undefined,
    });
    expect({ ...mapItemContract, schemaFields: undefined }).toEqual({
      ...flowItemContract,
      schemaFields: undefined,
    });
    expect(mapPlanContract.schemaFields).toEqual(expect.arrayContaining([
      'plan-title',
      'plan-items',
      'source-and-safety',
    ]));
    expect(mapItemContract.schemaFields).toEqual([
      'item-title',
      'item-detail',
      'item-date',
      'source-and-safety',
    ]);
    expect(mapItemContract.schemaFields).toEqual(flowItemContract.schemaFields);
    await expect(mapItem.getByTestId('public-flow-item-editor-date-input')).toBeVisible();
  });

  test('Map Item apply without a semantic change keeps the parent Plan clean', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(MAP_ROUTE);
    const storageBefore = await readRawBrowserStorage(page);

    const { trigger, editor: plan } = await openMapPlanEditor(page, 390);
    await plan.getByTestId('public-flow-adjustment-kind-items').click();
    await plan.getByTestId('public-flow-adjustment-item-edit').first().click();
    const item = page.getByTestId('public-flow-item-editor');
    await expectSharedItemEditor(item);
    await item.getByTestId('public-flow-item-editor-save').click();

    await expect(item).toHaveCount(0);
    await expect(plan).toBeVisible();
    await plan.getByTestId('public-flow-adjustment-cancel').click();
    await expect(plan.getByTestId('flow-editor-discard-prompt')).toHaveCount(0);
    await expect(plan).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);
  });

  test('removing an existing Map date immediately restores the source baseline inside the same Plan session', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(MAP_ROUTE);

    const storageBefore = await readRawBrowserStorage(page);
    const { trigger, editor: firstPlan } = await openMapPlanEditor(page, 390);
    await firstPlan.getByTestId('public-flow-adjustment-kind-items').click();
    const firstRow = firstPlan.getByTestId('public-flow-adjustment-item-row').first();
    const itemId = await firstRow.getAttribute('data-item-id');
    expect(itemId).toBeTruthy();
    await firstRow.getByTestId('public-flow-adjustment-item-edit').click();

    const itemEditor = page.getByTestId('public-flow-item-editor');
    const dateInput = itemEditor.getByTestId('public-flow-item-editor-date-input');
    await dateInput.fill('2026-08-24');
    await itemEditor.getByTestId('public-flow-item-editor-save').click();
    await firstPlan.getByTestId('public-flow-adjustment-apply').click();
    await expect(firstPlan).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);

    await trigger.click();
    const secondPlan = page.getByTestId('public-flow-personal-adjustment');
    await secondPlan.getByTestId('public-flow-adjustment-kind-items').click();
    const resetRow = secondPlan.locator(
      `[data-testid="public-flow-adjustment-item-row"][data-item-id="${itemId!}"]`,
    );
    await expect(resetRow).toContainText('8월 24일');
    await resetRow.getByTestId('public-flow-adjustment-item-edit').click();
    await expect(dateInput).toHaveValue('2026-08-24');
    await itemEditor.getByTestId('public-flow-item-editor-date-clear').click();
    await expect(dateInput).toHaveValue('');
    await itemEditor.getByTestId('public-flow-item-editor-save').click();

    await expect(itemEditor).toHaveCount(0);
    await expect(resetRow).toContainText('날짜 없음');
    await resetRow.getByTestId('public-flow-adjustment-item-edit').click();
    await expect(dateInput).toHaveValue('');
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);
  });

  test('a source-dated Map uses the same date field and resets a private date to its actual source date', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(DATED_MAP_ROUTE);

    const storageBefore = await readRawBrowserStorage(page);
    const { trigger, editor: firstPlan } = await openMapPlanEditor(page, 390);
    await firstPlan.getByTestId('public-flow-adjustment-kind-items').click();
    const row = firstPlan.getByTestId('public-flow-adjustment-item-row').first();
    await expect(row).toContainText('7월 2일');
    await row.getByTestId('public-flow-adjustment-item-edit').click();

    const itemEditor = page.getByTestId('public-flow-item-editor');
    const dateInput = itemEditor.getByTestId('public-flow-item-editor-date-input');
    await expect(dateInput).toHaveValue('2026-07-02');
    await expect(itemEditor.getByTestId('public-flow-item-editor-date-clear')).toHaveCount(0);
    await dateInput.fill('2026-07-10');
    await itemEditor.getByTestId('public-flow-item-editor-save').click();
    await firstPlan.getByTestId('public-flow-adjustment-apply').click();
    await expect(firstPlan).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);

    await trigger.click();
    const secondPlan = page.getByTestId('public-flow-personal-adjustment');
    await secondPlan.getByTestId('public-flow-adjustment-kind-items').click();
    const resetRow = secondPlan.getByTestId('public-flow-adjustment-item-row').first();
    await expect(resetRow).toContainText('7월 10일');
    await resetRow.getByTestId('public-flow-adjustment-item-edit').click();
    await expect(dateInput).toHaveValue('2026-07-10');
    const resetDate = itemEditor.getByTestId('public-flow-item-editor-date-clear');
    await expect(resetDate).toHaveText('원래 날짜로');
    await resetDate.click();
    await expect(dateInput).toHaveValue('2026-07-02');
    await itemEditor.getByTestId('public-flow-item-editor-save').click();

    await expect(itemEditor).toHaveCount(0);
    await expect(resetRow).toContainText('7월 2일');
    await resetRow.getByTestId('public-flow-adjustment-item-edit').click();
    await expect(dateInput).toHaveValue('2026-07-02');
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);
  });

  test('Map Item dates follow the uncommitted Plan anchor and a source-equal fixed pin can be explicitly reset', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(DATED_MAP_ROUTE);
    await page
      .getByTestId('public-flow-capability-result')
      .getByRole('button', { name: 'Calendar' })
      .click();

    const storageBefore = await readRawBrowserStorage(page);
    const { editor: firstPlan } = await openMapPlanEditor(page, 390);
    await firstPlan.getByTestId('public-flow-adjustment-kind-anchor').click();
    await firstPlan.getByTestId('public-flow-adjustment-anchor-input').fill('2026-07-08');
    await firstPlan.getByTestId('public-flow-adjustment-kind-items').click();
    const firstRow = firstPlan.getByTestId('public-flow-adjustment-item-row').first();
    await expect(firstRow).toContainText('7월 9일');
    await firstRow.getByTestId('public-flow-adjustment-item-edit').click();

    const itemEditor = page.getByTestId('public-flow-item-editor');
    const dateInput = itemEditor.getByTestId('public-flow-item-editor-date-input');
    await expect(dateInput).toHaveValue('2026-07-09');
    await expect(itemEditor.getByTestId('public-flow-item-editor-date-clear')).toHaveCount(0);
    await dateInput.fill('2026-07-02');
    await itemEditor.getByTestId('public-flow-item-editor-save').click();
    await firstPlan.getByTestId('public-flow-adjustment-apply').click();
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);

    const { editor: secondPlan } = await openMapPlanEditor(page, 390);
    await secondPlan.getByTestId('public-flow-adjustment-kind-anchor').click();
    await secondPlan.getByTestId('public-flow-adjustment-anchor-input').fill('2026-07-01');
    await secondPlan.getByTestId('public-flow-adjustment-kind-items').click();
    const resetRow = secondPlan.getByTestId('public-flow-adjustment-item-row').first();
    await expect(resetRow).toContainText('7월 2일');
    await resetRow.getByTestId('public-flow-adjustment-item-edit').click();
    await expect(dateInput).toHaveValue('2026-07-02');
    const resetDate = itemEditor.getByTestId('public-flow-item-editor-date-clear');
    await expect(resetDate).toHaveText('원래 날짜로');
    await resetDate.click();
    await expect(dateInput).toHaveValue('2026-07-02');
    await itemEditor.getByTestId('public-flow-item-editor-save').click();
    await expect(resetRow).toContainText('7월 2일');
    await secondPlan.getByTestId('public-flow-adjustment-apply').click();
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);

    await page.getByTestId('flow-map-save-all-mobile').click();
    await expect(page).toHaveURL('/my?savedMap=postal-address-transfer&sort=next');
    const storedOverride = await page.evaluate(() => {
      const snapshot = JSON.parse(
        window.localStorage.getItem('flow:map:saved:postal-address-transfer') ?? 'null',
      );
      const persistence = JSON.parse(
        window.localStorage.getItem('flow:map:persistence:postal-address-transfer') ?? 'null',
      );
      const flowSlug = 'source-backed-postal-address-transfer';
      const stepId = 'postal-next-day-check';
      return {
        snapshot: snapshot?.personalCopy?.stepOverridesByFlow?.[flowSlug]?.[stepId],
        persistence: persistence?.personalCopy?.stepOverridesByFlow?.[flowSlug]?.[stepId],
      };
    });
    expect(storedOverride).toEqual({ snapshot: undefined, persistence: undefined });
  });

  test('Map Item edits stay session-only until Plan apply and final save preserves order, memo, date, and identity', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(MAP_ROUTE);

    const effective = page.getByTestId('flow-map-effective-snapshot');
    const sourceIdentity = await effective.evaluate((element) => ({
      mapId: element.getAttribute('data-public-result-owner-id'),
      version: element.getAttribute('data-public-result-owner-version'),
    }));
    expect(sourceIdentity.mapId).toBe(MAP_ID);
    expect(sourceIdentity.version).toBeTruthy();
    const storageBefore = await readRawBrowserStorage(page);

    const { trigger, editor: plan } = await openMapPlanEditor(page, 390);
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);
    await plan.getByTestId('public-flow-adjustment-kind-items').click();
    const itemList = plan.getByTestId('public-flow-adjustment-item-list');
    let rows = plan.getByTestId('public-flow-adjustment-item-row');
    await expect(rows).toHaveCount(8);
    const canonicalItemIds = await rows.evaluateAll((elements) => elements.map((element) => {
      const itemId = element.getAttribute('data-item-id');
      if (!itemId) throw new Error('Map editor row is missing data-item-id.');
      return itemId;
    }));

    await rows.first().getByTestId('public-flow-adjustment-item-move-down').click();
    rows = plan.getByTestId('public-flow-adjustment-item-row');
    const editedRow = rows.nth(5);
    const itemOpener = editedRow.getByTestId('public-flow-adjustment-item-edit');
    const editedItemId = await itemOpener.getAttribute('data-item-id');
    expect(editedItemId).toBeTruthy();
    await itemOpener.focus();
    await itemOpener.click();

    const itemEditor = page.getByTestId('public-flow-item-editor');
    await expectSharedItemEditor(itemEditor);
    const editedTitle = '시험 전에 오답 유형 다시 정리하기';
    const editedMemo = '틀린 이유와 다시 풀 순서를 내 메모로 남긴다.';
    const editedDate = '2026-08-24';
    const dateInput = itemEditor.getByTestId('public-flow-item-editor-date-input');
    await expect(dateInput).toBeVisible();
    await expect(dateInput).toHaveValue('');
    await itemEditor.getByTestId('public-flow-item-editor-title-input').fill(editedTitle);
    await itemEditor.getByTestId('public-flow-item-editor-detail-input').fill(editedMemo);
    await dateInput.fill(editedDate);
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);
    await itemEditor.getByTestId('public-flow-item-editor-save').click();

    await expect(itemEditor).toHaveCount(0);
    await expect(plan).toBeVisible();
    const returnedRow = plan.locator(
      `[data-testid="public-flow-adjustment-item-row"][data-item-id="${editedItemId!}"]`,
    );
    await expect(returnedRow).toContainText(editedTitle);
    await expect(returnedRow).toContainText('8월 24일');
    await expect(returnedRow.getByTestId('public-flow-adjustment-item-edit')).toBeFocused();
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);

    await returnedRow.getByTestId('public-flow-adjustment-item-edit').click();
    await expect(dateInput).toHaveValue(editedDate);
    const dateClear = itemEditor.getByTestId('public-flow-item-editor-date-clear');
    await expect(dateClear).toHaveText('날짜 없애기');
    await dateClear.click();
    await expect(dateInput).toHaveValue('');
    await itemEditor.getByTestId('public-flow-item-editor-save').click();
    await expect(itemEditor).toHaveCount(0);
    await expect(returnedRow).toContainText('날짜 없음');
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);

    await returnedRow.getByTestId('public-flow-adjustment-item-edit').click();
    await expect(dateInput).toHaveValue('');
    await dateInput.fill(editedDate);
    await itemEditor.getByTestId('public-flow-item-editor-save').click();
    await expect(itemEditor).toHaveCount(0);
    await expect(returnedRow).toContainText('8월 24일');
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);

    rows = plan.getByTestId('public-flow-adjustment-item-row');
    await rows.last().getByRole('checkbox').uncheck();
    const requestedItemIds = await rows.evaluateAll((elements) => elements.flatMap((element) => {
      const checkbox = element.querySelector<HTMLInputElement>('input[type="checkbox"]');
      const itemId = element.getAttribute('data-item-id');
      return checkbox?.checked && itemId ? [itemId] : [];
    }));
    expect(requestedItemIds).toHaveLength(7);
    expect(requestedItemIds.slice(0, 2)).toEqual([
      canonicalItemIds[1],
      canonicalItemIds[0],
    ]);

    const editedPlanTitle = '시험 전 오답 중심 수학 계획';
    await plan.getByTestId('public-flow-adjustment-kind-name').click();
    await plan.getByTestId('public-flow-adjustment-name-input').fill(editedPlanTitle);
    await plan.getByTestId('public-flow-adjustment-apply').click();
    await expect(plan).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);

    await expect(effective).toHaveAttribute('data-flow-map-title', editedPlanTitle);
    await expect(effective).toHaveAttribute('data-flow-map-item-count', '7');
    expect(JSON.parse(await effective.getAttribute('data-flow-map-item-ids') ?? '[]')).toEqual(
      requestedItemIds,
    );
    const previewRow = page
      .getByTestId('public-flow-capability-result')
      .locator(
        `[data-testid="flow-capability-artifact-preview-row"][data-item-id="${editedItemId!}"]`,
      );
    await expect(previewRow).toContainText(editedTitle);
    await expect(previewRow).toContainText('8월 24일');

    await page.getByTestId('flow-map-save-all-mobile').click();
    await expect(page).toHaveURL(`/my?savedMap=${MAP_ID}&sort=next`);

    const stored = await readMapStorage(page);
    expect(stored.snapshot.mapId).toBe(sourceIdentity.mapId);
    expect(stored.snapshot.version).toBe(sourceIdentity.version);
    expect(stored.persistence.map.id).toBe(sourceIdentity.mapId);
    expect(stored.persistence.map.version).toBe(sourceIdentity.version);
    expect(stored.persistence.bridgeStorageKey).toBe(`flow:map:saved:${MAP_ID}`);
    expect(stored.snapshot.flowSlugs).toEqual([MAP_FLOW_SLUG]);
    expect(stored.snapshot.title).toBe(editedPlanTitle);
    expect(stored.persistence.map.title).toBe(editedPlanTitle);

    const requestedStepIds = requestedItemIds.map((itemId) => itemId.split('::')[1]);
    expect(stored.snapshot.personalCopy.includedStepIdsByFlow[MAP_FLOW_SLUG]).toEqual(
      requestedStepIds,
    );
    expect(stored.persistence.personalCopy.includedStepIdsByFlow[MAP_FLOW_SLUG]).toEqual(
      requestedStepIds,
    );
    const persistedChild = stored.persistence.childFlows.find(
      (child: { slug: string }) => child.slug === MAP_FLOW_SLUG,
    );
    expect(persistedChild.stepIds).toEqual(requestedStepIds);
    expect(persistedChild.steps.map((step: { stepId: string }) => step.stepId)).toEqual(
      requestedStepIds,
    );

    const editedStepId = editedItemId!.split('::')[1];
    expect(
      stored.snapshot.personalCopy.stepOverridesByFlow[MAP_FLOW_SLUG][editedStepId],
    ).toEqual({
      title: editedTitle,
      userMemo: editedMemo,
      schedule: { mode: 'fixed_date', date: editedDate },
    });
    expect(
      stored.persistence.personalCopy.stepOverridesByFlow[MAP_FLOW_SLUG][editedStepId],
    ).toEqual({
      title: editedTitle,
      userMemo: editedMemo,
      schedule: { mode: 'fixed_date', date: editedDate },
    });
    expect(JSON.stringify(stored.persistence.personalCopy)).toBe(
      JSON.stringify(stored.snapshot.personalCopy),
    );
    expect(stored.savedFlow.selectedArtifactMode).toBe('memo');

    const mapBytesBeforeReload = {
      snapshot: stored.snapshotRaw,
      persistence: stored.persistenceRaw,
    };
    await page.reload();
    const afterReload = await readMapStorage(page);
    expect({
      snapshot: afterReload.snapshotRaw,
      persistence: afterReload.persistenceRaw,
    }).toEqual(mapBytesBeforeReload);
    expect(
      afterReload.snapshot.personalCopy.stepOverridesByFlow[MAP_FLOW_SLUG][editedStepId]
        .schedule,
    ).toEqual({ mode: 'fixed_date', date: editedDate });
    expect(
      afterReload.persistence.personalCopy.stepOverridesByFlow[MAP_FLOW_SLUG][editedStepId]
        .schedule,
    ).toEqual({ mode: 'fixed_date', date: editedDate });
  });

  test('dirty cancel, Escape, and browser Back all protect drafts and restore Plan/Item openers', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto(MAP_ROUTE);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const windowScrollBefore = await page.evaluate(() => window.scrollY);
    const storageBefore = await readRawBrowserStorage(page);

    const { trigger, editor: plan } = await openMapPlanEditor(page, 390);
    const titleInput = plan.getByTestId('public-flow-adjustment-name-input');
    await titleInput.fill('닫기 보호가 필요한 계획');

    await page.keyboard.press('Escape');
    let prompt = plan.getByTestId('flow-editor-discard-prompt');
    await expect(prompt).toBeVisible();
    await plan.getByTestId('public-flow-personal-adjustment-continue-editing').click();
    await expect(prompt).toHaveCount(0);
    await expect(titleInput).toBeFocused();

    await plan.getByTestId('public-flow-adjustment-cancel').click();
    prompt = plan.getByTestId('flow-editor-discard-prompt');
    await expect(prompt).toBeVisible();
    await plan.getByTestId('public-flow-personal-adjustment-continue-editing').click();
    await expect(prompt).toHaveCount(0);
    await titleInput.focus();

    await page.goBack();
    await expect(page).toHaveURL(MAP_ROUTE);
    prompt = plan.getByTestId('flow-editor-discard-prompt');
    await expect(prompt).toBeVisible();
    await expect.poll(() => page.evaluate(() => (
      window.history.state?.flowMapPublicEditor?.level ?? null
    ))).toBe('plan');
    await plan.getByTestId('public-flow-personal-adjustment-continue-editing').click();
    await expect(prompt).toHaveCount(0);

    await page.goBack();
    await expect(plan.getByTestId('flow-editor-discard-prompt')).toBeVisible();
    await plan.getByTestId('public-flow-personal-adjustment-discard-changes').click();
    await expect(plan).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(windowScrollBefore);
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);

    const reopened = await openMapPlanEditor(page, 390);
    await reopened.editor.getByTestId('public-flow-adjustment-kind-items').click();
    const itemList = reopened.editor.getByTestId('public-flow-adjustment-item-list');
    await itemList.evaluate((element) => element.scrollTo(0, element.scrollHeight));
    const itemListScrollBefore = await itemList.evaluate((element) => element.scrollTop);
    expect(itemListScrollBefore).toBeGreaterThan(0);
    const itemOpener = reopened.editor
      .getByTestId('public-flow-adjustment-item-row')
      .nth(6)
      .getByTestId('public-flow-adjustment-item-edit');
    await itemOpener.click();
    const itemEditor = page.getByTestId('public-flow-item-editor');
    const itemTitle = itemEditor.getByTestId('public-flow-item-editor-title-input');
    await itemTitle.fill('브라우저 뒤로가기로 버릴 항목');

    await page.goBack();
    await expect(itemEditor.getByTestId('flow-editor-discard-prompt')).toBeVisible();
    await expect.poll(() => page.evaluate(() => (
      window.history.state?.flowMapPublicEditor?.level ?? null
    ))).toBe('item');
    await itemEditor.getByTestId('public-flow-item-editor-continue-editing').click();
    await expect(itemEditor.getByTestId('flow-editor-discard-prompt')).toHaveCount(0);
    await expect(itemTitle).toBeFocused();

    await page.goBack();
    await expect(itemEditor.getByTestId('flow-editor-discard-prompt')).toBeVisible();
    await itemEditor.getByTestId('public-flow-item-editor-discard-changes').click();
    await expect(itemEditor).toHaveCount(0);
    await expect(reopened.editor).toBeVisible();
    await expect(itemOpener).toBeFocused();
    await expect.poll(() => itemList.evaluate((element) => element.scrollTop)).toBe(
      itemListScrollBefore,
    );
    expect(await readRawBrowserStorage(page)).toEqual(storageBefore);

    await reopened.editor.getByTestId('public-flow-adjustment-cancel').click();
    await expect(reopened.editor).toHaveCount(0);
    await expect(reopened.trigger).toBeFocused();
  });

  for (const viewport of VIEWPORTS) {
    test(`Map shared Plan and Item fit the viewport without horizontal overflow at ${viewport.label}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(MAP_ROUTE);
      const { editor: plan } = await openMapPlanEditor(page, viewport.width);
      await expectEditorGeometry(page, plan, viewport);
      await plan.getByTestId('public-flow-adjustment-kind-items').click();
      await plan.getByTestId('public-flow-adjustment-item-edit').first().click();
      const item = page.getByTestId('public-flow-item-editor');
      await expectSharedItemEditor(item);
      await expectEditorGeometry(page, item, viewport);
      await item.getByTestId('public-flow-item-editor-cancel').click();
      await plan.getByTestId('public-flow-adjustment-cancel').click();
    });
  }

  test('choose-child and review-hold Maps never mount a Map or shared public editor', async ({ page }) => {
    for (const route of [
      '/flow-maps/curated-opic-mock-course',
      '/flow-maps/curated-allblanc-workout-park',
      '/flow-maps/curated-wedding-checklist-family',
      '/flow-maps/baby-food-map',
    ]) {
      await page.goto(route);
      await expect(page.getByTestId('public-flow-personal-adjustment')).toHaveCount(0);
      await expect(page.getByTestId('public-flow-item-editor')).toHaveCount(0);
      await expect(page.getByTestId('flow-map-adjust-panel')).toHaveCount(0);
      await expect(page.getByTestId('flow-map-adjust-save')).toHaveCount(0);
      await expect(page.getByTestId('flow-map-adjust-save-mobile')).toHaveCount(0);
    }
  });
});
