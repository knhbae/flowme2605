import fs from 'node:fs';
import { expect, test, type Locator } from '@playwright/test';
import { seedBundles } from '../../lib/flow/seed-flows';

async function enterMyFlowDetailEditMode(detail: Locator) {
  const readSummary = detail.getByTestId('my-flow-detail-read-summary');
  await expect(readSummary).toBeVisible();
  if ((await readSummary.getAttribute('open')) === null) {
    await readSummary.locator('summary').click();
  }
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  await expect(detail).toHaveAttribute('data-detail-mode', 'edit');
}

async function openMyFlowDetailTools(detail: Locator) {
  const tools = detail.getByTestId('my-flow-detail-portable-export');
  await expect(tools).toBeVisible();
  if ((await tools.getAttribute('open')) === null) {
    await tools.locator('summary').click();
  }
  return tools;
}

async function expandMyFlowAdvancedEditor(detail: Locator) {
  const toggle = detail.getByTestId('my-flow-editor-advanced-toggle');
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  return toggle;
}

test.describe('P24 execution trust regressions', () => {
  test('KST morning uses the local calendar day for a new schedule default', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date('2026-07-14T07:05:00+09:00') });
    await page.goto('/flows');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const lookup = page.getByTestId('flow-url-lookup-entry');
    await lookup.getByLabel('URL 또는 메모').fill('https://example.com/p24-local-date');
    await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
    const result = page.getByTestId('flow-url-lookup-result');
    await result.getByLabel('Flow 이름').fill('아침 준비 초안');
    await result.getByLabel('원하는 결과').fill('오늘 할 일을 정리해서 시작하기');
    await result.getByRole('button', { name: '초안 준비하기' }).click();

    const candidate = page.getByTestId('flow-url-supply-candidate-list').locator('article').first();
    await candidate.getByTestId('flow-url-miss-draft-open').click();
    await candidate.getByTestId('flow-url-miss-draft-flow-title').fill('아침 준비');
    await candidate.getByTestId('flow-url-miss-draft-save').click();

    await expect(page).toHaveURL(/\/my/);
    await page.getByTestId('my-flow-view-flow').click();
    const draftFlow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug^="url-draft-"]');
    await draftFlow.getByTestId('my-flow-mobile-structure-open').click();
    await draftFlow.getByTestId('personal-draft-add-entry').click();
    await draftFlow.getByTestId('personal-draft-add-title').fill('오늘 확인할 일');
    await draftFlow.getByTestId('personal-draft-add-title').press('Enter');

    const item = draftFlow.getByTestId('personal-draft-effective-item').filter({ hasText: '오늘 확인할 일' });
    await item.getByTestId('my-flow-mobile-structure-step-row').click();
    const detail = draftFlow
      .getByTestId('my-flow-mobile-structure-inline-detail')
      .getByTestId('my-flow-item-detail');
    const readSummary = detail.getByTestId('my-flow-detail-read-summary');
    await readSummary.locator('summary').click();
    await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
    await detail.getByTestId('personal-draft-date-mode-fixed').click();

    await expect(detail.getByTestId('my-flow-detail-date-input')).toHaveValue('2026-07-14');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
    expect(consoleErrors).toEqual([]);
    const evidenceDir = process.env.FLOWME_P24_F1_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await detail.screenshot({ path: `${evidenceDir}/screenshots/00-kst-local-date-mobile.png` });
    }
  });

  test('a personal date override is identical in Today, the full list, Calendar, and ICS', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date('2026-07-14T10:00:00+09:00') });
    await page.goto('/flows');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('flow:saved:travel-packing-list', JSON.stringify({
        slug: 'travel-packing-list',
        savedAt: '2026-07-14T01:00:00.000Z',
        selectedArtifactMode: 'checklist',
      }));
    });
    await page.goto('/my');
    await page.getByTestId('my-flow-view-flow').click();

    let flow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="travel-packing-list"]');
    if ((await flow.getByTestId('my-flow-mobile-structure-step-row').count()) === 0) {
      await flow.getByTestId('my-flow-mobile-structure-open').click();
    }
    const firstStep = flow.getByTestId('my-flow-mobile-structure-step-row').first();
    await firstStep.click();
    let detail = flow
      .getByTestId('my-flow-mobile-structure-inline-detail')
      .getByTestId('my-flow-item-detail');
    await enterMyFlowDetailEditMode(detail);
    await detail.getByTestId('my-flow-detail-date-input').fill('2026-07-24');
    await detail.getByTestId('my-flow-detail-save-changes').click();

    await page.getByTestId('my-flow-view-today').click();
    const nowSection = page.getByTestId('my-flow-now-section');
    await expect(nowSection).toContainText('7월 24일');
    const evidenceDir = process.env.FLOWME_P24_F2A_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      fs.mkdirSync(`${evidenceDir}/downloads`, { recursive: true });
      await page.screenshot({
        path: `${evidenceDir}/screenshots/00-effective-date-today-mobile.png`,
        fullPage: true,
      });
    }

    await page.getByTestId('my-flow-view-flow').click();
    flow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="travel-packing-list"]');
    if ((await flow.getByTestId('my-flow-mobile-structure-step-row').count()) === 0) {
      await flow.getByTestId('my-flow-mobile-structure-open').click();
    }
    const movedStep = flow.getByTestId('my-flow-mobile-structure-step-row').first();
    await expect(movedStep).toContainText('7월 24일');
    await movedStep.click();
    detail = flow
      .getByTestId('my-flow-mobile-structure-inline-detail')
      .getByTestId('my-flow-item-detail');
    const tools = await openMyFlowDetailTools(detail);
    const downloadPromise = page.waitForEvent('download');
    await tools.getByTestId('my-flow-detail-download-ics').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const ics = fs.readFileSync(downloadPath!, 'utf8');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260724');
    if (evidenceDir) {
      fs.writeFileSync(`${evidenceDir}/downloads/effective-date-parity.ics`, ics, 'utf8');
    }

    await page.goto('/calendar');
    await page.getByTestId('my-flow-month-picker').fill('2026-07');
    await expect(page.locator('.fc-daygrid-day[data-date="2026-07-24"] .fc-event')).toHaveCount(1);
    await expect(page.locator('.fc-daygrid-day[data-date="2026-07-23"] .fc-event')).toHaveCount(0);
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/01-effective-date-calendar-mobile.png`,
        fullPage: true,
      });
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
  });

  test('reuse keeps a fixed personal date while rekeying it to the new anchor schedule', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    const flowSlug = 'moving-d30-basic';
    const flowBundle = seedBundles.find((bundle) => bundle.flow.slug === flowSlug);
    const firstItem = flowBundle?.items[0];
    expect(firstItem).toBeTruthy();
    const initialAnchor = '2026-08-10';
    const nextAnchor = '2026-10-20';
    const getItemDate = (anchor: string) => {
      const date = new Date(`${anchor}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + Number(firstItem?.day_offset ?? 0));
      return date.toISOString().slice(0, 10);
    };
    const previousSourceDate = getItemDate(initialAnchor);
    const nextSourceDate = getItemDate(nextAnchor);
    const previousOverrideKey = `${flowSlug}::${firstItem?.id}::${previousSourceDate}`;
    const nextOverrideKey = `${flowSlug}::${firstItem?.id}::${nextSourceDate}`;
    const fixedDate = '2026-07-15';
    const completedChecks = Object.fromEntries(
      (flowBundle?.items ?? []).map((item) => [item.id, true]),
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date('2026-07-14T10:00:00+09:00') });
    await page.addInitScript(({ slug, anchor, checks, overrideKey, overrideDate }) => {
      if (sessionStorage.getItem('flow-p24-f2b-seeded') === 'true') return;
      sessionStorage.setItem('flow-p24-f2b-seeded', 'true');
      localStorage.clear();
      localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
        slug,
        savedAt: '2026-07-14T01:00:00.000Z',
        selectedArtifactMode: 'calendar',
        anchor,
      }));
      localStorage.setItem(
        `flow:${slug}:anchorDate`,
        JSON.stringify({ mode: 'custom', anchor }),
      );
      localStorage.setItem(`flow_builder_mvp_checks_${slug}`, JSON.stringify(checks));
      localStorage.setItem(
        'flow:my-flow:date-overrides',
        JSON.stringify({ [overrideKey]: overrideDate }),
      );
    }, {
      slug: flowSlug,
      anchor: initialAnchor,
      checks: completedChecks,
      overrideKey: previousOverrideKey,
      overrideDate: fixedDate,
    });

    await page.goto('/my');
    await page.getByTestId('my-flow-view-flow').click();
    const flow = page.locator(
      `[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${flowSlug}"]`,
    );
    const feedback = flow.getByTestId('my-flow-completion-feedback');
    await expect(feedback).toBeVisible();
    await feedback.getByTestId('my-flow-reuse-open').click();
    const reusePanel = feedback.getByTestId('my-flow-reuse-panel');
    await reusePanel.getByTestId('my-flow-reuse-anchor-input').fill(nextAnchor);
    await reusePanel.getByLabel('내가 바꾼 날짜 유지').check();
    const evidenceDir = process.env.FLOWME_P24_F2B_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await page.screenshot({
        path: `${evidenceDir}/screenshots/00-reuse-keep-policy-mobile.png`,
        fullPage: true,
      });
    }
    await reusePanel.getByTestId('my-flow-reuse-start').click();

    await page.getByTestId('my-flow-view-flow').click();
    await expect(flow.getByTestId('my-flow-reuse-status')).toContainText(
      '새 이사일 10월 20일로 시작했어요',
    );
    const state = await page.evaluate(({ slug }) => ({
      dateOverrides: JSON.parse(localStorage.getItem('flow:my-flow:date-overrides') || '{}'),
      registry: JSON.parse(localStorage.getItem(`flow:run-registry:${slug}`) || 'null'),
    }), { slug: flowSlug });
    const activeRun = state.registry.runs.find((run: { status: string }) => run.status === 'active');
    const completedRun = state.registry.runs.find((run: { status: string }) => run.status === 'completed');
    expect(activeRun.fixedDatePolicy).toBe('keep_fixed_dates');
    expect(activeRun.personalExecutionStateSnapshot.dateOverrides[nextOverrideKey]).toBe(fixedDate);
    expect(activeRun.personalExecutionStateSnapshot.dateOverrides[previousOverrideKey]).toBeUndefined();
    expect(state.dateOverrides[nextOverrideKey]).toBe(fixedDate);
    expect(state.dateOverrides[previousOverrideKey]).toBeUndefined();
    expect(completedRun.personalExecutionStateSnapshot.dateOverrides[previousOverrideKey]).toBe(fixedDate);

    await page.getByTestId('my-flow-view-today').click();
    await expect(page.getByTestId('my-flow-now-section')).toContainText('7월 15일');
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/01-reuse-fixed-date-today-mobile.png`,
        fullPage: true,
      });
    }
    await page.goto('/calendar');
    await page.getByTestId('my-flow-month-picker').fill('2026-07');
    await expect(page.locator('.fc-daygrid-day[data-date="2026-07-15"] .fc-event')).toHaveCount(1);
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/02-reuse-fixed-date-calendar-mobile.png`,
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.locator('.fc-daygrid-day[data-date="2026-07-15"] .fc-event')).toHaveCount(1);
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/03-reuse-fixed-date-calendar-wide.png`,
        fullPage: true,
      });
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
  });

  test('a dated memo draft keeps every split item in My Flow and the whole-flow export', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flows');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const lookup = page.getByTestId('flow-url-lookup-entry');
    await lookup.getByLabel('URL 또는 메모').fill(
      '이사 견적을 비교한다. 관리사무소에 연락한다.',
    );
    await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
    const editor = page.getByTestId('flow-memo-draft-editor');
    await expect(editor.getByTestId('flow-memo-draft-item')).toHaveCount(3);
    await editor.getByLabel('메모 초안 제목').fill('이사 전 확인할 일');
    await editor.getByLabel('메모 초안 첫 할 일 날짜').fill('2026-08-30');
    await editor.getByRole('button', { name: '내 Flow에 초안 저장' }).click();

    await expect(page).toHaveURL(/\/my/);
    await page.getByTestId('my-flow-view-flow').click();
    let draftFlow = page.locator(
      '[data-testid="my-flow-mobile-structure-row"][data-flow-slug^="url-draft-"]',
    );
    if ((await draftFlow.getByTestId('personal-draft-effective-item').count()) === 0) {
      await draftFlow.getByTestId('my-flow-mobile-structure-open').click();
    }
    const effectiveItems = draftFlow.getByTestId('personal-draft-effective-item');
    await expect(effectiveItems).toHaveCount(3);
    await expect(draftFlow).toContainText('이사 견적을 비교하기');
    await expect(draftFlow).toContainText('관리사무소에 연락하기');
    await expect(draftFlow).toContainText('할 일을 실행할 순서 정하기');

    const exportPanel = draftFlow.getByTestId('personal-draft-list-export');
    await expect(exportPanel.getByTestId('personal-draft-list-export-toggle')).toContainText(
      '이 Flow 가져가기 · 3개',
    );
    await exportPanel.getByTestId('personal-draft-list-export-toggle').click();
    await exportPanel.getByTestId('personal-draft-copy-memo').click();
    const copiedMemo = await page.evaluate(() => navigator.clipboard.readText());
    expect(copiedMemo).toContain('할 일 3개');
    expect(copiedMemo).toContain('이사 견적을 비교하기');
    expect(copiedMemo).toContain('관리사무소에 연락하기');
    expect(copiedMemo).toContain('할 일을 실행할 순서 정하기');

    const evidenceDir = process.env.FLOWME_P24_F3B_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await draftFlow.screenshot({
        path: `${evidenceDir}/screenshots/00-memo-split-items-mobile.png`,
      });
    }
    await page.reload();
    await page.getByTestId('my-flow-view-flow').click();
    draftFlow = page.locator(
      '[data-testid="my-flow-mobile-structure-row"][data-flow-slug^="url-draft-"]',
    );
    if ((await draftFlow.getByTestId('personal-draft-effective-item').count()) === 0) {
      await draftFlow.getByTestId('my-flow-mobile-structure-open').click();
    }
    await expect(draftFlow.getByTestId('personal-draft-effective-item')).toHaveCount(3);

    await page.goto('/calendar');
    await page.getByTestId('my-flow-month-picker').fill('2026-08');
    await expect(page.locator('.fc-daygrid-day[data-date="2026-08-30"] .fc-event')).toHaveCount(1);
    await expect(
      page.locator('.fc-event').filter({ hasText: '관리사무소에 연락하기' }),
    ).toHaveCount(0);
    await expect(
      page.getByTestId('my-flow-calendar-unscheduled-tray').getByText('관리사무소에 연락하기'),
    ).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my');
    await page.getByTestId('my-flow-view-flow').click();
    const wideDraftFlow = page.locator(
      '[data-testid="my-flow-overview-card"][data-flow-slug^="url-draft-"]',
    );
    await expect(wideDraftFlow).toContainText('전체 0/3 완료');
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/01-memo-split-items-wide.png`,
        fullPage: true,
      });
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
  });

  test('an empty URL miss request stays unsaved and a memo-only request uses user copy', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flows');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const lookup = page.getByTestId('flow-url-lookup-entry');
    await lookup.getByLabel('URL 또는 메모').fill('https://example.com/p24-empty-draft');
    await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
    const result = page.getByTestId('flow-url-lookup-result');
    await result.getByRole('button', { name: '초안 준비하기' }).click();
    await expect(result.getByRole('status')).toHaveText(
      'Flow 이름이나 원하는 결과 중 하나를 입력해 주세요.',
    );
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('flow:url-first:supply-candidates') || '[]'),
      ),
    ).toEqual([]);

    await result.getByLabel('원하는 결과').fill(
      '여행 전에 여권과 환전 준비를 확인하고 싶어요.',
    );
    await result.getByRole('button', { name: '초안 준비하기' }).click();
    const candidateList = page.getByTestId('flow-url-supply-candidate-list');
    const candidate = candidateList.locator('article').first();
    await expect(candidate).toContainText('여행 전에 여권과 환전 준비를 확인하고 싶어요');
    await expect(candidate).not.toContainText('바로 시작할 Flow를 찾지 못했어요');
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('flow:url-first:supply-candidates') || '[]'),
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe('여행 전에 여권과 환전 준비를 확인하고 싶어요');
    await candidate.getByTestId('flow-url-miss-draft-open').click();
    await expect(candidate.getByTestId('flow-url-miss-draft-suggestion-list')).not.toContainText(
      '바로 시작할 Flow를 찾지 못했어요',
    );

    const evidenceDir = process.env.FLOWME_P24_F3B_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await candidate.screenshot({
        path: `${evidenceDir}/screenshots/02-memo-only-draft-mobile.png`,
      });
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
  });

  test('Today completion stays reversible in place with one control per visible task', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date('2026-06-03T09:00:00+09:00') });
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
        slug: 'moving-d30-basic',
        savedAt: '2026-06-03T00:00:00.000Z',
        selectedArtifactMode: 'calendar',
        anchor: '2026-06-02',
      }));
      localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({
        mode: 'custom',
        anchor: '2026-06-02',
      }));
    });

    await page.goto('/my');
    const nowSection = page.getByTestId('my-flow-now-section');
    const runnable = nowSection.getByTestId('my-flow-mobile-continuation-card').first();
    const rowKey = await runnable.getAttribute('data-row-key');
    const itemId = rowKey?.split('::')[1];
    const title = (await runnable.getByTestId('my-flow-mobile-continuation-title').innerText()).trim();
    expect(rowKey).toBeTruthy();
    expect(itemId).toBeTruthy();
    await expect(runnable.getByTestId('my-flow-task-complete-control')).toHaveCount(1);

    await runnable.getByTestId('my-flow-mobile-continuation-open').click();
    const inlineDetail = runnable.getByTestId('my-flow-inline-detail');
    await expect(inlineDetail).toBeVisible();
    await expect(inlineDetail.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await runnable.getByTestId('my-flow-mobile-continuation-open').click();

    await runnable.getByTestId('my-flow-task-complete-control').click();
    const snackbar = page.getByTestId('my-flow-completion-snackbar');
    await expect(snackbar).toBeVisible();
    await expect(snackbar).toContainText(title);
    await expect(snackbar.getByTestId('my-flow-completion-undo')).toHaveText('실행 취소');
    const evidenceDir = process.env.FLOWME_P24_U1_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await page.screenshot({
        path: `${evidenceDir}/screenshots/00-today-completion-undo-mobile.png`,
        fullPage: true,
      });
    }

    await snackbar.getByTestId('my-flow-completion-undo').click();
    await expect(snackbar).toHaveCount(0);
    const restored = nowSection.locator(`[data-testid="my-flow-mobile-continuation-card"][data-row-key="${rowKey}"]`);
    await expect(restored).toBeVisible();
    await expect(restored.getByTestId('my-flow-task-complete-control')).not.toBeChecked();

    await restored.getByTestId('my-flow-task-complete-control').click();
    const completedSection = page.getByTestId('my-flow-today-completed-list');
    await expect(completedSection).toBeVisible();
    await completedSection.getByTestId('my-flow-today-completed-toggle').click();
    const completedRow = completedSection.locator(`article[data-item-id="${itemId}"]`);
    await expect(completedRow).toBeVisible();
    await expect(completedRow.getByTestId('my-flow-task-complete-control')).toBeChecked();
    await completedRow.getByTestId('my-flow-task-complete-control').click();
    await expect(nowSection.locator(`[data-row-key="${rowKey}"]`)).toBeVisible();
    await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
  });

  test('Today renders future queue items as control-free previews on mobile and wide', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.clock.install({ time: new Date('2026-05-28T09:00:00+09:00') });
    await page.addInitScript(() => {
      localStorage.clear();
      const savedAt = '2026-05-28T00:00:00.000Z';
      const saveFlow = (slug: string, anchor?: string) => {
        localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
          slug,
          savedAt,
          selectedArtifactMode: 'calendar',
          ...(anchor ? { anchor } : {}),
        }));
        if (anchor) {
          localStorage.setItem(`flow:${slug}:anchorDate`, JSON.stringify({ mode: 'custom', anchor }));
        }
      };
      saveFlow('moving-d30-basic', '2026-06-26');
      saveFlow('computer-skills-d30-study', '2026-06-27');
      saveFlow('used-car-buying-check');
    });

    const checkViewport = async (width: number, height: number, screenshotName: string) => {
      await page.setViewportSize({ width, height });
      await page.goto('/my');
      const nowSection = page.getByTestId('my-flow-now-section');
      const upcoming = page.getByTestId('my-flow-upcoming-list');
      await expect(nowSection.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
      await expect(upcoming).toContainText('다음 예정');
      await expect(upcoming.getByTestId('my-flow-upcoming-preview').first()).toBeVisible();
      await expect(upcoming.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
      await expect(upcoming.getByTestId('my-flow-mobile-continuation-card')).toHaveCount(0);
      const rowKeys = await page.locator(
        '[data-testid="my-flow-now-section"] [data-row-key], [data-testid="my-flow-upcoming-list"] [data-row-key]',
      ).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-row-key')).filter(Boolean));
      expect(new Set(rowKeys).size).toBe(rowKeys.length);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      ).toBeLessThanOrEqual(1);
      const evidenceDir = process.env.FLOWME_P24_U1_EVIDENCE_DIR;
      if (evidenceDir) {
        fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
        await page.screenshot({
          path: `${evidenceDir}/screenshots/${screenshotName}`,
          fullPage: true,
        });
      }
    };

    await checkViewport(390, 844, '01-today-next-preview-mobile.png');
    await checkViewport(1024, 768, '02-today-next-preview-wide.png');
    expect(consoleErrors).toEqual([]);
  });

  test('the Flow finder resolves after repeated hard navigation and reloads', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });

    for (let iteration = 0; iteration < 6; iteration += 1) {
      if (iteration === 0) {
        await page.goto('/flows', { waitUntil: 'domcontentloaded' });
      } else {
        await page.reload({ waitUntil: 'domcontentloaded' });
      }
      await expect(page.getByTestId('flow-url-lookup-entry')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('Flow를 불러오는 중입니다.')).toHaveCount(0);
      await expect(page.getByLabel('URL 또는 메모')).toBeEnabled();
    }

    const evidenceDir = process.env.FLOWME_P24_F4_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await page.screenshot({
        path: `${evidenceDir}/screenshots/00-flows-hard-navigation-mobile.png`,
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('flow-url-lookup-entry')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Flow를 불러오는 중입니다.')).toHaveCount(0);
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/01-flows-hard-navigation-wide.png`,
        fullPage: true,
      });
    }
    expect(consoleErrors).toEqual([]);
  });

  test('public saves hydrate the matching My Flow immediately across repeated clean sessions', async ({ page }) => {
    test.setTimeout(180_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });

    for (let iteration = 0; iteration < 5; iteration += 1) {
      await page.goto('/f/new-car-delivery-check');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      const saveArea = page.getByTestId('public-flow-mobile-save-cta');
      await saveArea.getByRole('button', { name: '내 Flow에 저장' }).click();
      await expect.poll(() => page.evaluate(() =>
        Boolean(localStorage.getItem('flow:saved:new-car-delivery-check')),
      )).toBe(true);
      const myFlowLink = saveArea.getByRole('link', { name: '내 Flow에서 보기' });
      await expect(myFlowLink).toBeVisible();
      await Promise.all([
        page.waitForURL(/\/my/, { timeout: 15_000 }),
        myFlowLink.click(),
      ]);
      await expect(page.getByTestId('my-flow-workspace')).toBeVisible({ timeout: 10_000 });
      await page.getByTestId('my-flow-view-flow').click();
      const savedFlow = page.locator(
        '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="new-car-delivery-check"]',
      );
      await expect(savedFlow).toBeVisible({ timeout: 10_000 });
      await expect(savedFlow).toContainText('신차 인수');
      await expect(page.getByTestId('my-flow-empty-state')).toHaveCount(0);
    }

    const evidenceDir = process.env.FLOWME_P24_F4_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await page.screenshot({
        path: `${evidenceDir}/screenshots/02-post-save-hydration-mobile.png`,
        fullPage: true,
      });
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
  });

  test('My Flow keeps common item edits visible and intent-specific settings progressive', async ({ page }) => {
    test.setTimeout(180_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flow-maps/moving-d30');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByLabel('이사일').fill('2026-07-22');
    await page.getByRole('button', { name: '저장하고 시작' }).click();
    await expect(page).toHaveURL('/my?savedMap=moving-d30');
    await page.getByTestId('my-flow-post-save-panel').getByTestId('my-flow-post-save-view-flow').click();
    await page.getByTestId('my-flow-view-flow').click();

    const openMovingEditor = async () => {
      const flow = page.locator(
        '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="source-backed-moving-d30"]',
      );
      if ((await flow.getByTestId('my-flow-mobile-structure-step-row').count()) === 0) {
        await flow.getByTestId('my-flow-mobile-structure-open').click();
      }
      await flow.getByTestId('my-flow-mobile-structure-step-row').first().click();
      const detail = flow
        .getByTestId('my-flow-mobile-structure-inline-detail')
        .getByTestId('my-flow-item-detail');
      await enterMyFlowDetailEditMode(detail);
      return detail;
    };

    let detail = await openMovingEditor();
    await expect(detail.getByTestId('my-flow-detail-title-input')).toBeVisible();
    await expect(detail.getByTestId('my-flow-detail-date-input')).toBeVisible();
    await expect(detail.locator('input[type="time"]')).toBeVisible();
    await expect(detail.getByTestId('my-flow-detail-memo')).toBeVisible();
    const advancedToggle = detail.getByTestId('my-flow-editor-advanced-toggle');
    await expect(advancedToggle).toContainText('세부 설정');
    await expect(advancedToggle).toContainText('장소');
    await expect(advancedToggle).toContainText('반복');
    await expect(advancedToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(detail.locator('input[placeholder="장소 없음"]')).toHaveCount(0);
    await expect(detail.getByTestId('my-flow-detail-repeat-input')).toHaveCount(0);
    await expect(detail.getByTestId('my-flow-editor-intent-fields')).toHaveCount(0);
    const evidenceDir = process.env.FLOWME_P24_U2_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await detail.screenshot({
        path: `${evidenceDir}/screenshots/00-progressive-editor-basic-mobile.png`,
      });
    }

    await expandMyFlowAdvancedEditor(detail);
    await expect(detail.locator('input[placeholder="장소 없음"]')).toBeVisible();
    await expect(detail.getByTestId('my-flow-detail-repeat-input')).toBeVisible();
    await expect(detail.getByTestId('my-flow-decision-fields')).toHaveCount(0);
    await expect(detail.getByTestId('my-flow-log-fields')).toHaveCount(0);
    await detail.locator('input[placeholder="장소 없음"]').fill('집');
    await detail.getByTestId('my-flow-detail-repeat-input').selectOption('weekly');
    if (evidenceDir) {
      await detail.screenshot({
        path: `${evidenceDir}/screenshots/01-progressive-editor-advanced-mobile.png`,
      });
    }
    await detail.getByTestId('my-flow-detail-save-changes').click();

    await page.reload();
    await page.getByTestId('my-flow-view-flow').click();
    detail = await openMovingEditor();
    await expect(detail).toHaveAttribute('data-editor-advanced-expanded', 'true');
    await expect(detail.locator('input[placeholder="장소 없음"]')).toHaveValue('집');
    await expect(detail.getByTestId('my-flow-detail-repeat-input')).toHaveValue('weekly');
    await page.setViewportSize({ width: 1024, height: 768 });
    const wideCard = page.locator(
      '[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]',
    );
    if ((await page.locator('[data-testid="my-flow-item-detail"]:visible').count()) === 0) {
      await wideCard.getByTestId('my-flow-next-action-open').click();
    }
    const wideDetail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
    await expect(wideDetail).toBeVisible();
    if ((await wideDetail.getByTestId('my-flow-editor-advanced-toggle').count()) === 0) {
      await enterMyFlowDetailEditMode(wideDetail);
    }
    await expect(wideDetail).toHaveAttribute('data-editor-advanced-expanded', 'true');
    await expect(wideDetail.getByTestId('my-flow-editor-advanced-toggle')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/02-progressive-editor-revisit-wide.png`,
        fullPage: true,
      });
    }
    expect(consoleErrors).toEqual([]);
  });

  test('decision fields appear only for an eligible decision item', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('flow:saved:used-car-buying-check', JSON.stringify({
        slug: 'used-car-buying-check',
        savedAt: '2026-07-14T04:00:00.000Z',
        selectedArtifactMode: 'checklist',
      }));
    });
    await page.reload();
    await page.getByTestId('my-flow-view-flow').click();
    const flow = page.locator(
      '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="used-car-buying-check"]',
    );
    if ((await flow.getByTestId('my-flow-mobile-structure-step-row').count()) === 0) {
      await flow.getByTestId('my-flow-mobile-structure-open').click();
    }
    const showAllSteps = flow.getByRole('button', { name: /전체 단계 보기/ });
    if ((await showAllSteps.count()) > 0) await showAllSteps.click();
    const decisionRow = flow
      .getByTestId('my-flow-mobile-structure-step-row')
      .filter({ hasText: '최종 구매/보류/거절' });
    await decisionRow.click();
    const detail = flow
      .getByTestId('my-flow-mobile-structure-inline-detail')
      .getByTestId('my-flow-item-detail');
    await enterMyFlowDetailEditMode(detail);
    const toggle = detail.getByTestId('my-flow-editor-advanced-toggle');
    await expect(toggle).toContainText('결정');
    await expect(detail.getByTestId('my-flow-decision-fields')).toHaveCount(0);
    await expandMyFlowAdvancedEditor(detail);
    await expect(detail.getByTestId('my-flow-decision-fields')).toBeVisible();
    await expect(detail.getByTestId('my-flow-decision-status')).toBeVisible();
    const evidenceDir = process.env.FLOWME_P24_U2_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await detail.screenshot({
        path: `${evidenceDir}/screenshots/03-intent-aware-decision-mobile.png`,
      });
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
  });

  test('Calendar schedules an undated personal draft item with preview, undo, and reload persistence', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date('2026-07-14T10:00:00+09:00') });
    await page.goto('/flows');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const lookup = page.getByTestId('flow-url-lookup-entry');
    await lookup.getByLabel('URL 또는 메모').fill('https://example.com/p24-calendar-tray');
    await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
    const result = page.getByTestId('flow-url-lookup-result');
    await result.getByLabel('Flow 이름').fill('캘린더 배치 초안');
    await result.getByLabel('원하는 결과').fill('날짜 없는 준비를 캘린더에 놓기');
    await result.getByRole('button', { name: '초안 준비하기' }).click();

    const candidate = page.getByTestId('flow-url-supply-candidate-list').locator('article').first();
    await candidate.getByTestId('flow-url-miss-draft-open').click();
    await candidate.getByTestId('flow-url-miss-draft-flow-title').fill('캘린더 배치 초안');
    await candidate.getByTestId('flow-url-miss-draft-save').click();

    await expect(page).toHaveURL(/\/my/);
    await page.getByTestId('my-flow-view-flow').click();
    const draftFlow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug^="url-draft-"]');
    await draftFlow.getByTestId('my-flow-mobile-structure-open').click();
    await draftFlow.getByTestId('personal-draft-add-entry').click();
    await draftFlow.getByTestId('personal-draft-add-title').fill('충전기 챙기기');
    await draftFlow.getByTestId('personal-draft-add-title').press('Enter');
    await expect(
      draftFlow.getByTestId('personal-draft-effective-item').filter({ hasText: '충전기 챙기기' }),
    ).toBeVisible();

    await page.goto('/calendar');
    const tray = page.getByTestId('my-flow-calendar-unscheduled-tray');
    await expect(tray).toBeVisible();
    const evidenceDir = process.env.FLOWME_P24_U3_EVIDENCE_DIR;
    const trayItem = tray.getByTestId('my-flow-calendar-unscheduled-item').filter({ hasText: '충전기 챙기기' });
    const itemCheckbox = trayItem.getByRole('checkbox', { name: '충전기 챙기기 날짜 지정 대상으로 선택' });
    await itemCheckbox.focus();
    await itemCheckbox.press('Space');
    await tray.getByTestId('my-flow-calendar-unscheduled-date').fill('2026-07-21');
    await expect(tray.getByTestId('my-flow-calendar-unscheduled-preview')).toContainText('1개');
    await expect(tray.getByTestId('my-flow-calendar-unscheduled-apply')).toBeEnabled();
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await tray.screenshot({
        path: `${evidenceDir}/screenshots/00-calendar-unscheduled-selection-mobile.png`,
      });
    }
    await tray.getByTestId('my-flow-calendar-unscheduled-apply').click();

    await expect(tray.getByTestId('my-flow-calendar-unscheduled-undo')).toBeVisible();
    await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('충전기 챙기기');
    await expect(trayItem).toHaveCount(0);
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/01-calendar-unscheduled-applied-mobile.png`,
      });
    }

    await tray.getByTestId('my-flow-calendar-unscheduled-undo-action').click();
    await expect(
      tray.getByTestId('my-flow-calendar-unscheduled-item').filter({ hasText: '충전기 챙기기' }),
    ).toBeVisible();
    await expect(page.getByTestId('my-flow-calendar-selected-day')).not.toContainText('충전기 챙기기');

    const restoredTrayItem = tray.getByTestId('my-flow-calendar-unscheduled-item').filter({ hasText: '충전기 챙기기' });
    await restoredTrayItem.getByRole('checkbox', { name: '충전기 챙기기 날짜 지정 대상으로 선택' }).check();
    await tray.getByTestId('my-flow-calendar-unscheduled-apply').click();
    await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('충전기 챙기기');
    await page.reload();
    await expect(
      page.getByTestId('my-flow-calendar-unscheduled-item').filter({ hasText: '충전기 챙기기' }),
    ).toHaveCount(0);

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.reload();
    await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/02-calendar-unscheduled-wide.png`,
        fullPage: true,
      });
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
  });
});
