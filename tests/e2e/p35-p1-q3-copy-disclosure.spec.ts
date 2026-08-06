import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { openMyFlowLibraryFlow } from './helpers/my-flow-library';

const viewports = [
  { name: '390', width: 390, height: 844 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 1000 },
] as const;

const phase = process.env.FLOWME_P1_Q3_PHASE === 'before' ? 'before' : 'after';
const captureEnabled = Boolean(process.env.FLOWME_P1_Q3_PHASE);
const evidenceDirectory = path.resolve(
  process.cwd(),
  'docs/specs/2026-08-04-p35-round2-bounded-ux-correction/evidence/p1-02',
);

function routeForPhase(route: string): string {
  if (phase !== 'before') return route;
  return `${route}${route.includes('?') ? '&' : '?'}q3Copy=off`;
}

async function relativeDate(page: Page, dayOffset: number): Promise<string> {
  return page.evaluate((offset) => {
    const value = new Date();
    value.setDate(value.getDate() + offset);
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');
  }, dayOffset);
}

async function lookupOwnedCopy(
  page: Page,
  input: string,
  q3CopyEnabled: boolean,
): Promise<Locator> {
  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('URL 또는 메모').fill(input);
  await lookup.getByRole('button', {
    name: q3CopyEnabled ? '계획 찾기' : 'Flow 찾기',
  }).click();
  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toBeVisible();
  return result;
}

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown';
    if (failure !== 'net::ERR_ABORTED') {
      errors.push(`requestfailed: ${request.url()} (${failure})`);
    }
  });
  return errors;
}

async function capture(page: Page, name: string): Promise<void> {
  if (!captureEnabled) return;
  await page.screenshot({
    path: path.join(evidenceDirectory, `${phase}-${name}.png`),
    fullPage: false,
  });
}

async function expectSurfaceHealth(page: Page, surface: Locator): Promise<void> {
  await expect(surface).toBeVisible();
  expect(await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBe(0);
  const unnamedVisibleInteractiveCount = await surface
    .locator('button,a[href],input,textarea,select')
    .evaluateAll((elements) => elements.filter((element) => {
      const target = element as HTMLElement;
      const input = element as HTMLInputElement;
      const style = window.getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) {
        return false;
      }
      return ![
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
        element.textContent,
        input.value,
        input.placeholder,
      ].find((candidate) => candidate?.trim());
    }).length);
  expect(unnamedVisibleInteractiveCount).toBe(0);
}

const legacyOwnedCopyPattern =
  /Flow를 찾을 수 없습니다|저장할 Flow|저장 가능한 기존 Flow|Flow화되지 않은|이미 만들어진 Flow|바로 시작할 Flow|새 실행 Flow|Flow 찾기|내 Flow|My Flow|Flow 미리보기|Flow 수정|Flow 편집|Flow 목록|Flow 검색|저장한 Flow|Flow 관리|Flow 이름|Flow 기준|Flow에서 제외|Flow에서 뺐어요|이번 Flow는|Flow별 옮기기|반복 Flow|일정 Flow|현재 Flow 도구|영향 Flow|Flow 정리|이 Flow가 만들어주는 것|이 Flow는 날짜 입력이 필요 없는 체크리스트입니다|저장될 Flow|Flow에 포함|Flow로 돌아/u;

async function expectNoLegacyOwnedCopy(surface: Locator): Promise<void> {
  const ownedCopy = await surface
    .locator('h1,h2,h3,p,span,li,dt,dd,[role="tab"],[role="menuitem"],button,summary,label,input,select,option,[aria-label]')
    .evaluateAll((elements) => {
      const authoredContentSelector = [
        '[data-flow-identity-slot="title"]',
        '[data-flow-outline-row="true"]',
        '[data-testid*="artifact-preview-row"]',
        '[data-testid*="execution-row"]',
        '[data-testid*="item-row"]',
        '[data-testid*="library-row"]',
        '[data-testid*="structure-row"]',
        '[data-testid*="archived-row"]',
      ].join(',');
      return elements.flatMap((element) => {
        const target = element as HTMLElement;
        const style = window.getComputedStyle(target);
        const rect = target.getBoundingClientRect();
        if (
          style.display === 'none'
          || style.visibility === 'hidden'
          || rect.width === 0
          || rect.height === 0
          || element.closest(authoredContentSelector)
        ) {
          return [];
        }
        return [
          element.textContent,
          element.getAttribute('aria-label'),
          element.getAttribute('title'),
          element.getAttribute('placeholder'),
        ].filter((value): value is string => Boolean(value?.trim()));
      });
    });
  expect(ownedCopy.join('\n')).not.toMatch(legacyOwnedCopyPattern);
}

async function expectCapabilityHeader(
  capability: Locator,
  lifecycle: 'public' | 'saved',
  q3CopyEnabled: boolean,
): Promise<void> {
  await expect(capability).toBeVisible();
  const header = capability.locator(':scope > header');
  const state = header.locator(':scope > p').first();
  const scope = header.locator(':scope > h2');
  if (q3CopyEnabled) {
    await expect(state).toHaveText(lifecycle === 'public' ? '결과 미리보기' : '옮기기 전 미리보기');
    await expect(scope).toHaveText(
      lifecycle === 'public' ? /^현재 계획 · \d+개$/u : /^저장한 계획 · \d+개$/u,
    );
    await expect(header.locator(':scope > p, :scope > h2')).toHaveCount(2);
    await expect(capability).toHaveAttribute('data-capability-receipt', '');
    return;
  }
  await expect(state).toHaveText(lifecycle === 'public' ? '저장 전 미리보기' : '저장한 Flow 결과');
  await expect(scope).toHaveText(
    lifecycle === 'public' ? /^현재 공개 초안 · \d+개$/u : /^저장한 전체 Flow · \d+개$/u,
  );
  await expect(header.locator(':scope > p, :scope > h2')).toHaveCount(3);
}

async function rawStorageSnapshot(page: Page) {
  return page.evaluate(() => {
    const read = (storage: Storage) => Object.fromEntries(
      Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => Boolean(key))
        .sort()
        .map((key) => [key, storage.getItem(key) ?? '']),
    );
    return { local: read(window.localStorage), session: read(window.sessionStorage) };
  });
}

async function seedSavedMovingPlan(page: Page): Promise<void> {
  await page.goto('/flows');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt: '2031-08-01T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2031-09-01',
      dateIntent: 'custom',
    }));
    window.localStorage.setItem(
      'flow:moving-d30-basic:anchorDate',
      JSON.stringify({ mode: 'custom', anchor: '2031-09-01' }),
    );
  });
}

async function seedUndatedSavedPlan(page: Page, flowSlug: string): Promise<void> {
  await page.goto('/flows');
  await page.evaluate((slug) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
      slug,
      savedAt: '2031-08-01T00:00:00.000Z',
      selectedArtifactMode: 'checklist',
      dateIntent: 'none',
    }));
  }, flowSlug);
}

async function seedArchivedSavedPlan(page: Page, flowSlug: string): Promise<void> {
  await seedUndatedSavedPlan(page, flowSlug);
  await page.evaluate((slug) => {
    window.localStorage.setItem('flow:my-flow:lifecycle:v1', JSON.stringify({
      schemaVersion: 1,
      archivedFlowSlugs: [slug],
      updatedAt: '2031-08-01T00:00:00.000Z',
    }));
    window.localStorage.setItem('flow:my-flow:hidden-flows', JSON.stringify([slug]));
  }, flowSlug);
}

async function openChecklistTransfer(page: Page, q3CopyEnabled = true): Promise<Locator> {
  const suffix = q3CopyEnabled ? '' : '&q3Copy=off';
  await page.goto(`/my?flow=moving-d30-basic${suffix}`);
  const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'record');
  await workspace.getByTestId('my-flow-export-entry').click();
  const panel = workspace.getByTestId('my-flow-export-panel');
  await expect(panel).toBeVisible();
  const checklist = panel.getByTestId('my-flow-export-checklist');
  if (!await checklist.isVisible().catch(() => false)) {
    const more = panel.getByTestId('my-flow-export-more-formats');
    if ((await more.getAttribute('open')) === null) await more.locator(':scope > summary').click();
  }
  await checklist.click();
  const confirmation = panel.getByTestId('my-flow-transfer-confirmation');
  await expect(confirmation).toBeVisible();
  return confirmation;
}

test.describe('P1-02 Q3 copy and contextual disclosure', () => {
  test('discovery uses one plan vocabulary profile at 390/1024/1440', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(routeForPhase('/flows'));
      const root = page.locator('main[data-p35-q3-copy]');
      await expect(root).toHaveAttribute('data-p35-q3-copy', phase === 'before' ? 'off' : 'on');
      await expectSurfaceHealth(page, root);
      if (phase === 'before') {
        await expect(page.getByRole('heading', { name: 'URL·메모로 Flow 찾기' })).toBeVisible();
        await expect(root.getByText('내 Flow', { exact: true }).filter({ visible: true }).first()).toBeVisible();
      } else {
        await expect(page.getByRole('heading', { name: 'URL·메모로 계획 찾기' })).toBeVisible();
        await expect(root.getByText('내 계획', { exact: true }).filter({ visible: true }).first()).toBeVisible();
        await expectNoLegacyOwnedCopy(root);
      }
      console.log(`P1-02 DISCOVERY ${phase} ${viewport.name} aria=${(await root.ariaSnapshot()).split('\n').length}`);
      await capture(page, `discovery-${viewport.name}`);
    }
    expect(errors).toEqual([]);
  });

  test('URL and memo lookup states use the same owned plan vocabulary', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    const q3CopyEnabled = phase !== 'before';
    await page.setViewportSize(viewports[0]);
    await page.goto(routeForPhase('/flows'));

    let result = await lookupOwnedCopy(
      page,
      'https://mathbang.net/13?utm_source=q3-owned-copy',
      q3CopyEnabled,
    );
    await expect(result).toContainText(
      q3CopyEnabled ? '이미 만들어진 계획이 있어요' : '이미 만들어진 Flow가 있어요',
    );
    if (q3CopyEnabled) await expectNoLegacyOwnedCopy(result);

    result = await lookupOwnedCopy(
      page,
      'https://flowme.local/f/vehicle-inspection-prep?utm_campaign=q3-owned-copy',
      q3CopyEnabled,
    );
    await expect(result).toContainText(
      q3CopyEnabled
        ? '원문 확인 전에는 내 계획 저장이 열리지 않습니다.'
        : '원문 확인 전에는 내 Flow 저장이 열리지 않습니다.',
    );
    if (q3CopyEnabled) await expectNoLegacyOwnedCopy(result);

    result = await lookupOwnedCopy(
      page,
      'https://example.com/q3-owned-copy-miss?utm_source=review',
      q3CopyEnabled,
    );
    await expect(result).toContainText(
      q3CopyEnabled ? '바로 시작할 계획을 찾지 못했어요' : '바로 시작할 Flow를 찾지 못했어요',
    );
    if (q3CopyEnabled) await expectNoLegacyOwnedCopy(result);

    result = await lookupOwnedCopy(page, '주말 집 정리 순서 메모', q3CopyEnabled);
    await expect(result.getByText(q3CopyEnabled ? '계획 이름' : 'Flow 이름', { exact: true })).toBeVisible();
    if (q3CopyEnabled) await expectNoLegacyOwnedCopy(result);
    expect(errors).toEqual([]);
  });

  test('route metadata and date-free public copy honor exact Q3 rollback', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    const q3CopyEnabled = phase !== 'before';
    await page.setViewportSize(viewports[0]);

    await page.goto(routeForPhase('/my'));
    await expect(page).toHaveTitle(q3CopyEnabled ? '내 계획' : 'My Flow');

    await page.goto(routeForPhase('/f/travel-packing-list'));
    const dateFreeRoot = page.locator('main[data-p35-q3-copy]');
    await expect(dateFreeRoot).toHaveAttribute('data-p35-q3-copy', q3CopyEnabled ? 'on' : 'off');
    await expect(dateFreeRoot.getByText(q3CopyEnabled ? '계획 미리보기' : 'Flow 미리보기', { exact: true })).toBeVisible();
    if (q3CopyEnabled) await expectNoLegacyOwnedCopy(dateFreeRoot);

    const missingResponse = await page.goto(routeForPhase('/f/q3-missing-plan'));
    expect(missingResponse?.status()).toBe(404);
    await expect(page).toHaveTitle(
      q3CopyEnabled
        ? '계획을 찾을 수 없습니다 | FlowMe'
        : 'Flow를 찾을 수 없습니다 | FlowMe',
    );
    expect(errors.filter((message) => (
      message !== 'console: Failed to load resource: the server responded with a status of 404 (Not Found)'
    ))).toEqual([]);
  });

  test('public preview separates edit, date setup, and save effects at three viewports', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(routeForPhase('/f/moving-d30-basic'));
      const root = page.locator('main[data-p35-q3-copy]');
      await expect(root).toHaveAttribute('data-p35-q3-copy', phase === 'before' ? 'off' : 'on');
      await expectSurfaceHealth(page, root);
      await page.getByTestId('public-flow-anchor-input').fill(await relativeDate(page, 365));
      const edit = page.locator('[data-testid="public-flow-adjust-entry"]:visible, [data-testid="public-flow-adjust-entry-mobile"]:visible');
      const save = page.locator('[data-testid="public-flow-save-primary"]:visible, [data-testid="public-flow-save-primary-mobile"]:visible');
      if (phase === 'before') {
        await expect(root.getByText('Flow 미리보기', { exact: true })).toBeVisible();
        await expect(save).toHaveText(/개로 시작/u);
      } else {
        await expect(root.getByText('계획 미리보기', { exact: true })).toBeVisible();
        await expect(edit).toHaveText('계획 수정');
        await expect(save).toHaveText('내 계획에 저장');
        await expectCapabilityHeader(root.getByTestId('public-flow-capability-result'), 'public', true);
        await expectNoLegacyOwnedCopy(root);
      }
      console.log(`P1-02 PUBLIC ${phase} ${viewport.name} aria=${(await root.ariaSnapshot()).split('\n').length}`);
      await capture(page, `public-${viewport.name}`);
    }
    expect(errors).toEqual([]);
  });

  test('public plan editor uses plan labels in visible and accessible copy', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize(viewports[0]);
    await page.goto(routeForPhase('/f/moving-d30-basic'));
    const editorEntry = page.locator(
      '[data-testid="public-flow-adjust-entry"]:visible, [data-testid="public-flow-adjust-entry-mobile"]:visible',
    ).first();
    await expect(editorEntry).toBeVisible();
    const storageBefore = await rawStorageSnapshot(page);
    expect(storageBefore.local).not.toHaveProperty('flow_builder_mvp_bundles_v11');
    await editorEntry.click();
    const editor = page.getByTestId('public-flow-personal-adjustment');
    await expect(editor).toBeVisible();
    expect(await rawStorageSnapshot(page)).toEqual(storageBefore);

    if (phase === 'before') {
      await expect(editor.getByRole('heading', { name: 'Flow 편집' })).toBeVisible();
      await expect(editor.getByLabel('내 Flow 이름')).toBeVisible();
    } else {
      await expect(editor.getByRole('heading', { name: '계획 수정' })).toBeVisible();
      await expect(editor.getByLabel('내 계획 이름')).toBeVisible();
      await expect(editor.getByLabel('내 Flow 이름')).toHaveCount(0);
    }

    await editor.getByTestId('public-flow-adjustment-kind-items').click();
    const inclusionLabels = await editor
      .getByTestId('public-flow-adjustment-item-row')
      .locator('input[type="checkbox"]')
      .evaluateAll((inputs) => inputs.map((input) => input.getAttribute('aria-label') ?? ''));
    expect(inclusionLabels.length).toBeGreaterThan(0);
    inclusionLabels.forEach((label) => {
      expect(label).toMatch(phase === 'before' ? / Flow에 포함$/u : / 계획에 포함$/u);
    });
    if (phase === 'after') await expectNoLegacyOwnedCopy(editor);

    await editor.getByRole('button', { name: '닫기', exact: true }).click();
    await expect(editor).toHaveCount(0);
    expect(await rawStorageSnapshot(page)).toEqual(storageBefore);
    expect(errors).toEqual([]);
  });

  test('saved library uses plan language without changing the saved identity', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(routeForPhase('/my?demo=ux20'));
      const root = page.locator('main[data-p35-q3-copy]');
      await expect(root).toHaveAttribute('data-p35-q3-copy', phase === 'before' ? 'off' : 'on');
      await expectSurfaceHealth(page, root);
      if (phase === 'before') {
        await expect(root.getByRole('heading', { name: 'My Flow' })).toBeVisible();
        await expect(root.getByText('저장한 Flow', { exact: true }).filter({ visible: true }).first()).toBeVisible();
      } else {
        await expect(root.getByRole('heading', { name: '내 계획' })).toBeVisible();
        await expect(root.getByText('저장한 계획', { exact: true }).filter({ visible: true }).first()).toBeVisible();
        await expectNoLegacyOwnedCopy(root);
      }
      await expect(root.locator('[data-saved-identity="moving-d30-basic"]').filter({ visible: true }).first()).toBeVisible();
      console.log(`P1-02 MY ${phase} ${viewport.name} aria=${(await root.ariaSnapshot()).split('\n').length}`);
      await capture(page, `my-${viewport.name}`);
    }
    expect(errors).toEqual([]);
  });

  test('saved plan management and capability preview use plan-owned accessible copy', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize(viewports[1]);
    await page.goto(routeForPhase('/my?demo=ux5&view=flows&flow=moving-d30-basic'));
    const selectedPlan = page.locator(
      '[data-testid="my-flow-overview-card"][data-flow-slug="moving-d30-basic"]',
    );
    await expect(selectedPlan).toBeVisible();
    const storageBefore = await rawStorageSnapshot(page);
    const managementTrigger = selectedPlan.getByTestId('my-flow-management-menu-trigger');

    if (phase === 'before') {
      await expect(managementTrigger).toHaveText('Flow 관리');
      await expect(managementTrigger).toHaveAccessibleName(/ Flow 관리$/u);
    } else {
      await expect(managementTrigger).toHaveText('계획 관리');
      await expect(managementTrigger).toHaveAccessibleName(/ 계획 관리$/u);
    }
    await managementTrigger.click();
    const managementMenu = selectedPlan.getByTestId('my-flow-management-menu').getByRole('menu');
    await expect(managementMenu).toHaveAccessibleName(
      phase === 'before' ? / Flow 관리$/u : / 계획 관리$/u,
    );
    await expect(selectedPlan.getByTestId('my-flow-management-adjust')).toHaveText(
      phase === 'before' ? 'Flow 편집' : '계획 수정',
    );
    if (phase === 'after') await expectNoLegacyOwnedCopy(managementMenu);
    await page.keyboard.press('Escape');
    await expect(managementTrigger).toBeFocused();

    await selectedPlan.getByTestId('my-flow-export-entry').click();
    await expectCapabilityHeader(
      selectedPlan.getByTestId('my-flow-capability-result'),
      'saved',
      phase === 'after',
    );
    expect(await rawStorageSnapshot(page)).toEqual(storageBefore);
    expect(errors).toEqual([]);
  });

  test('empty, search-no-result, and archived states keep one plan vocabulary', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize(viewports[1]);
    await page.goto('/flows');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto(routeForPhase('/my'));
    const empty = page.getByTestId('my-flow-empty-state');
    await expect(empty).toBeVisible();
    await expect(empty.getByRole('heading')).toHaveText(
      phase === 'before' ? '저장한 Flow가 없습니다' : '저장한 계획이 없습니다',
    );
    if (phase === 'after') await expectNoLegacyOwnedCopy(empty);

    await page.goto(routeForPhase('/my?demo=ux20'));
    const search = page.getByTestId('my-flow-library-rail-search');
    await expect(search).toHaveAttribute(
      'placeholder',
      phase === 'before' ? 'Flow 검색' : '계획 검색',
    );
    await expect(search).toHaveAccessibleName(
      phase === 'before' ? '저장한 Flow 검색' : '저장한 계획 검색',
    );
    await search.fill('존재하지-않는-Q3-계획');
    await expect(page.getByTestId('my-flow-library-detail')).toContainText(
      phase === 'before' ? '조건에 맞는 Flow가 없습니다.' : '조건에 맞는 계획이 없습니다.',
    );

    await seedArchivedSavedPlan(page, 'used-car-buying-check');
    await page.goto(routeForPhase('/my'));
    const archivedEntry = page.getByTestId('my-flow-open-archived');
    await expect(archivedEntry).toHaveText(
      phase === 'before' ? '보관된 Flow 1개 보기' : '보관한 계획 1개 보기',
    );
    await archivedEntry.click();
    const archivedRow = page.locator(
      '[data-testid="my-flow-library-archived-row"][data-flow-slug="used-car-buying-check"]',
    );
    await expect(archivedRow).toBeVisible();
    await expect(archivedRow.getByTestId('my-flow-archived-management-trigger')).toHaveAccessibleName(
      phase === 'before' ? / Flow 관리$/u : / 계획 관리$/u,
    );
    if (phase === 'after') await expectNoLegacyOwnedCopy(page.getByTestId('my-flow-saved-library-shell'));
    expect(errors).toEqual([]);
  });

  test('Flow Map actions use the same semantic labels at three viewports', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(routeForPhase('/flow-maps/middle-school-math-1'));
      const root = page.getByTestId('flow-map-public');
      const controller = page.getByTestId('flow-map-action-controller');
      await expect(controller).toHaveAttribute('data-p35-q3-copy', phase === 'before' ? 'off' : 'on');
      await expectSurfaceHealth(page, root);
      if (phase === 'before') {
        await expect(root.getByText('Flow 미리보기', { exact: true })).toBeVisible();
        await expect(root.getByRole('button', { name: '전체 저장하고 시작' }).filter({ visible: true })).toBeVisible();
      } else {
        await expect(root.getByText('계획 미리보기', { exact: true })).toBeVisible();
        await expect(root.getByRole('button', { name: '내 계획에 저장' }).filter({ visible: true })).toBeVisible();
        await expect(root.getByRole('button', { name: '계획 수정' }).filter({ visible: true })).toBeVisible();
        const savePreview = root.getByTestId('flow-map-artifact-preview');
        await expect(savePreview).toHaveAccessibleName('저장될 계획 요약');
        await expect(savePreview).toContainText('저장될 전체 계획');
        await expect(savePreview).not.toContainText('저장될 Flow');
        await expectNoLegacyOwnedCopy(root);
      }
      if (phase === 'before') {
        const savePreview = root.getByTestId('flow-map-artifact-preview');
        await expect(savePreview).toHaveAccessibleName('저장될 Flow 요약');
        await expect(savePreview).toContainText('저장될 전체 Flow');
      }
      console.log(`P1-02 MAP ${phase} ${viewport.name} aria=${(await root.ariaSnapshot()).split('\n').length}`);
      await capture(page, `map-${viewport.name}`);
    }
    expect(errors).toEqual([]);
  });

  test('undated export recovery points back to the plan, not a legacy Flow label', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize(viewports[1]);
    await seedUndatedSavedPlan(page, 'vehicle-inspection-prep');
    await page.goto(routeForPhase('/my?view=flows&flow=vehicle-inspection-prep'));
    const plan = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep', 'record');
    await plan.getByTestId('my-flow-export-entry').click();
    const panel = plan.getByTestId('my-flow-export-panel');
    const recovery = panel.getByTestId('my-flow-export-calendar-recovery');
    await expect(recovery).toHaveText(
      phase === 'before'
        ? '캘린더 파일은 날짜를 정한 항목만 만들 수 있어요. Flow로 돌아가 날짜를 정해 주세요.'
        : '캘린더 파일은 날짜를 정한 항목만 만들 수 있어요. 계획으로 돌아가 날짜를 정해 주세요.',
    );
    if (phase === 'after') await expectNoLegacyOwnedCopy(panel);
    expect(errors).toEqual([]);
  });

  test('help and caution disclosures support keyboard, Escape, names, and focus return', async ({ page }) => {
    test.skip(phase === 'before', 'Q3 rollback intentionally removes the new optional disclosure icons.');
    const errors = collectBrowserErrors(page);
    await page.setViewportSize(viewports[0]);
    await page.goto('/flow-maps/curated-wedding-checklist-family');
    const help = page.getByTestId('flow-map-choice-help-trigger');
    await expect(help).toHaveAccessibleName('계획 선택 도움말');
    await expect(help).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(help).toHaveAttribute('aria-expanded', 'false');
    await help.focus();
    await page.keyboard.press('Enter');
    await expect(help).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('flow-map-choice-help-sheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('flow-map-choice-help-sheet')).toHaveCount(0);
    await expect(help).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('flow-map-choice-help-sheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(help).toBeFocused();

    await seedSavedMovingPlan(page);
    await page.setViewportSize(viewports[1]);
    const confirmation = await openChecklistTransfer(page);
    await expect(confirmation.getByTestId('flow-transfer-one-way-warning')).toContainText('일방향 결과예요');
    const caution = confirmation.getByTestId('flow-transfer-one-way-help-trigger');
    await expect(caution).toHaveAccessibleName('일방향 결과 상세 보기');
    await caution.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('flow-transfer-one-way-help-sheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(caution).toBeFocused();
    await expect(confirmation.getByTestId('flow-transfer-one-way-warning')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('exact q3Copy rollback changes copy only and preserves URL and raw storage', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize(viewports[0]);
    await page.goto('/flows');
    await expect(page.locator('main[data-p35-q3-copy="on"]')).toBeVisible();
    const before = await rawStorageSnapshot(page);

    await page.goto('/flows?q3Copy=off');
    await expect(page.locator('main[data-p35-q3-copy="off"]')).toBeVisible();
    await expect(page).toHaveURL(/q3Copy=off/u);
    await expect(page.getByRole('heading', { name: 'URL·메모로 Flow 찾기' })).toBeVisible();
    expect(await rawStorageSnapshot(page)).toEqual(before);

    await page.goto('/flows?q3Copy=OFF');
    await expect(page.locator('main[data-p35-q3-copy="on"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'URL·메모로 계획 찾기' })).toBeVisible();
    expect(await rawStorageSnapshot(page)).toEqual(before);

    await page.goto('/flow-maps/curated-wedding-checklist-family?q3Copy=off');
    await expect(page.getByTestId('flow-map-choice-help-trigger')).toHaveCount(0);

    await page.goto('/f/moving-d30-basic?q3Copy=off');
    const publicStorageBefore = await rawStorageSnapshot(page);
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const publicEditor = page.getByTestId('public-flow-personal-adjustment');
    await expect(publicEditor.getByRole('heading', { name: 'Flow 편집' })).toBeVisible();
    await expect(publicEditor.getByLabel('내 Flow 이름')).toBeVisible();
    await publicEditor.getByRole('button', { name: '닫기', exact: true }).click();
    expect(await rawStorageSnapshot(page)).toEqual(publicStorageBefore);

    await seedSavedMovingPlan(page);
    await page.setViewportSize(viewports[1]);
    await page.goto('/my?view=flows&flow=moving-d30-basic&q3Copy=off');
    const selectedPlan = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'record');
    const savedStorageBefore = await rawStorageSnapshot(page);
    const managementTrigger = selectedPlan.getByTestId('my-flow-management-menu-trigger');
    await expect(managementTrigger).toHaveText('Flow 관리');
    await managementTrigger.click();
    await expect(selectedPlan.getByTestId('my-flow-management-adjust')).toHaveText('Flow 편집');
    expect(await rawStorageSnapshot(page)).toEqual(savedStorageBefore);
    expect(errors).toEqual([]);
  });
});
