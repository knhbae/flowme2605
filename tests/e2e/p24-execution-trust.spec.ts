import fs from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { seedBundles } from '../../lib/flow/seed-flows';
import {
  closeOpenMyFlowItemDetail,
  expandMyFlowWholePlan,
  getFirstSavedPersonalDraftSlug,
  getMyFlowVisibleExecutionRows,
  getOpenMyFlowItemDetail,
  openMyFlowCalendarSelectedDay,
  openMyFlowLibraryFlow,
  openPersonalDraftListExport,
} from './helpers/my-flow-library';
import { openSavedPublicFlow, savePublicFlow } from './helpers/public-flow-save';

async function enterMyFlowDetailEditMode(detail: Locator) {
  const quickEdit = detail.getByTestId('my-flow-quick-item-edit');
  if (await quickEdit.isVisible().catch(() => false)) {
    await quickEdit.click();
    await expect(detail).toHaveAttribute('data-detail-mode', 'edit');
    return;
  }
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
    await tools.locator(':scope > summary').click();
  }
  return tools;
}

async function completeSavedClipboardTransfer(page: Page, action: Locator) {
  await action.click();
  const confirmation = page.getByTestId('my-flow-transfer-confirmation');
  await expect(confirmation).toHaveAttribute('data-transfer-route', 'saved_transfer');
  await confirmation.getByTestId('my-flow-transfer-confirm').click();
  const receipt = page.getByTestId('my-flow-transfer-receipt');
  await expect(receipt).toHaveAttribute(
    'data-transfer-state',
    'succeeded',
  );
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  await receipt.getByTestId('flow-transfer-success-close').click();
  return copied;
}

async function completeSavedFileTransfer(page: Page, action: Locator) {
  await action.click();
  const confirmation = page.getByTestId('my-flow-transfer-confirmation');
  await expect(confirmation).toHaveAttribute('data-transfer-route', 'saved_transfer');
  const downloadPromise = page.waitForEvent('download');
  await confirmation.getByTestId('my-flow-transfer-confirm').click();
  const download = await downloadPromise;
  const receipt = page.getByTestId('my-flow-transfer-receipt');
  await expect(receipt).toHaveAttribute(
    'data-transfer-state',
    'succeeded',
  );
  await receipt.getByTestId('flow-transfer-success-close').click();
  return download;
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

async function openPostSaveWorkspaceIfPresent(page: Page) {
  const panel = page.getByTestId('my-flow-post-save-panel');
  await expect(
    page.locator(
      [
        '[data-testid="my-flow-post-save-panel"]:visible',
        '[data-testid="my-flow-overview-card"]:visible',
        '[data-testid="my-flow-mobile-workspace"]:visible',
        '[data-testid="my-flow-mobile-structure-row"]:visible',
        '[data-testid="my-flow-library-workspace"]:visible',
      ].join(', '),
    ).first(),
  ).toBeVisible({ timeout: 10_000 });
  if (await panel.isVisible().catch(() => false)) {
    await panel.getByTestId('my-flow-post-save-view-flow').click();
    await expect(panel).toHaveCount(0);
  }
}

async function openSavedDraftFlow(
  page: Page,
  draftSlug: string,
  mobileSection: 'execute' | 'plan' | 'record' = 'plan',
) {
  const currentTarget = new URL(page.url()).searchParams.get('flow');
  if (currentTarget !== draftSlug) {
    await page.goto(`/my?view=flows&flow=${encodeURIComponent(draftSlug)}`);
  }
  return openMyFlowLibraryFlow(page, draftSlug, mobileSection);
}

async function setPersonalDraftStructureEditMode(flow: Locator, open: boolean) {
  const toggle = flow.getByTestId('my-flow-batch-mode-toggle').first();
  await expect(toggle).toBeVisible();
  const active = (await toggle.getAttribute('aria-pressed')) === 'true';
  if (active !== open) await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', open ? 'true' : 'false');
}

async function addPersonalDraftItem(flow: Locator, title: string) {
  await setPersonalDraftStructureEditMode(flow, true);
  await flow.getByTestId('personal-draft-add-entry').click();
  await flow.getByTestId('personal-draft-add-title').fill(title);
  await flow.getByTestId('personal-draft-add-title').press('Enter');
  await setPersonalDraftStructureEditMode(flow, false);
}

async function captureWithoutPlatformChrome(
  page: Page,
  locator: Locator,
  path: string,
) {
  const chrome = page.locator('[data-testid="platform-nav"], [data-testid="platform-mobile-tabs"]');
  await chrome.evaluateAll((nodes) => {
    nodes.forEach((node) => {
      (node as HTMLElement).dataset.evidenceVisibility = (node as HTMLElement).style.visibility;
      (node as HTMLElement).style.visibility = 'hidden';
    });
  });
  await locator.screenshot({ path });
  await chrome.evaluateAll((nodes) => {
    nodes.forEach((node) => {
      const element = node as HTMLElement;
      element.style.visibility = element.dataset.evidenceVisibility ?? '';
      delete element.dataset.evidenceVisibility;
    });
  });
}

test.describe('P24 execution trust regressions', () => {
  test.use({ timezoneId: 'Asia/Seoul' });

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
    await lookup.getByRole('button', { name: '계획 찾기' }).click();
    const result = page.getByTestId('flow-url-lookup-result');
    await result.getByLabel('계획 이름').fill('아침 준비 초안');
    await result.getByLabel('원하는 결과').fill('오늘 할 일을 정리해서 시작하기');
    await result.getByRole('button', { name: '초안 준비하기' }).click();

    const candidate = page.getByTestId('flow-url-supply-candidate-list').locator('article').first();
    await candidate.getByTestId('flow-url-miss-draft-open').click();
    await candidate.getByTestId('flow-url-miss-draft-flow-title').fill('아침 준비');
    await candidate.getByTestId('flow-url-miss-draft-save').click();

    await expect(page).toHaveURL(/\/my/);
    await openPostSaveWorkspaceIfPresent(page);
    const draftSlug = await getFirstSavedPersonalDraftSlug(page);
    const draftFlow = await openMyFlowLibraryFlow(page, draftSlug);
    await addPersonalDraftItem(draftFlow, '오늘 확인할 일');

    await (await getMyFlowVisibleExecutionRows(draftFlow))
      .filter({ hasText: '오늘 확인할 일' })
      .first()
      .getByRole('button', { name: /오늘 확인할 일 열기/ })
      .click();
    const detail = getOpenMyFlowItemDetail(page);
    await enterMyFlowDetailEditMode(detail);
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

  test('a personal date override is identical in the focused plan, Calendar, and ICS', async ({ page }) => {
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

    let flow = await openMyFlowLibraryFlow(page, 'travel-packing-list');
    const firstStep = flow.getByTestId('my-flow-execution-row-shell').first();
    await firstStep.getByRole('button', { name: /열기/ }).click();
    let detail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
    await enterMyFlowDetailEditMode(detail);
    await detail.getByTestId('my-flow-detail-date-input').fill('2026-07-24');
    await detail.getByTestId('my-flow-detail-save-changes').click();

    const evidenceDir = process.env.FLOWME_P24_F2A_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      fs.mkdirSync(`${evidenceDir}/downloads`, { recursive: true });
      await page.screenshot({
        path: `${evidenceDir}/screenshots/00-effective-date-focused-plan-mobile.png`,
        fullPage: true,
      });
    }

    flow = await openMyFlowLibraryFlow(page, 'travel-packing-list');
    const movedStep = flow.getByTestId('my-flow-execution-row-shell').first();
    await expect(movedStep).toContainText('7월 24일');
    await movedStep.getByRole('button', { name: /열기/ }).click();
    detail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
    const tools = await openMyFlowDetailTools(detail);
    const download = await completeSavedFileTransfer(
      page,
      tools.getByTestId('my-flow-detail-download-ics'),
    );
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
    let flow = await openMyFlowLibraryFlow(page, flowSlug, 'record');
    const feedback = flow.getByTestId('my-flow-completion-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback.getByTestId('my-flow-reuse-open')).toHaveText('새 이사일로 다시 쓰기');
    await feedback.getByTestId('my-flow-reuse-open').click();
    const reusePanel = feedback.getByTestId('my-flow-reuse-panel');
    await reusePanel.getByTestId('my-flow-reuse-anchor-input').fill(nextAnchor);
    await reusePanel.getByLabel('내가 바꾼 날짜 유지').check();
    await expect(reusePanel.getByTestId('my-flow-reuse-current-anchor')).toHaveText('8월 10일');
    await expect(reusePanel.getByTestId('my-flow-reuse-next-anchor')).toHaveText('10월 20일');
    await expect(reusePanel.getByTestId('my-flow-reuse-fixed-date-result')).toHaveText('1개 유지');
    const evidenceDir = process.env.FLOWME_P24_F2B_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await page.screenshot({
        path: `${evidenceDir}/screenshots/00-reuse-keep-policy-mobile.png`,
        fullPage: true,
      });
    }
    await reusePanel.getByTestId('my-flow-reuse-start').click();

    flow = await openMyFlowLibraryFlow(page, flowSlug, 'record');
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

    const plan = await openMyFlowLibraryFlow(page, flowSlug, 'plan');
    await expandMyFlowWholePlan(plan);
    const fixedRow = plan
      .locator(`article[data-item-id="${firstItem?.id}"]`)
      .first();
    await expect(fixedRow.getByRole('button', { name: /열기/ })).toHaveAccessibleName(/7월 15일/);
    await expect(fixedRow.locator('xpath=ancestor::*[@data-testid="my-flow-temporal-next-group"][1]')).toHaveAttribute(
      'data-temporal-date',
      fixedDate,
    );
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/01-reuse-fixed-date-plan-mobile.png`,
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
    const exportEvidenceDir = process.env.FLOWME_P24_S2_EVIDENCE_DIR;
    if (exportEvidenceDir) {
      fs.mkdirSync(`${exportEvidenceDir}/screenshots`, { recursive: true });
      fs.mkdirSync(`${exportEvidenceDir}/downloads`, { recursive: true });
    }
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
      '이사 견적을 비교한다. 관리사무소에 연락한다. 주소 변경 대상을 확인한다.',
    );
    await lookup.getByRole('button', { name: '계획 찾기' }).click();
    const editor = page.getByTestId('flow-memo-draft-editor');
    await expect(editor.getByTestId('flow-memo-draft-item')).toHaveCount(3);
    const preview = editor.getByTestId('flow-memo-draft-artifact-preview');
    await preview.getByTestId('public-flow-artifact-preview-row-edit').first().click();
    const itemEditor = page.getByTestId('public-flow-item-editor');
    await itemEditor.getByTestId('public-flow-item-editor-title-input').fill('이사 업체 견적 비교하기');
    await itemEditor.getByTestId('public-flow-item-editor-save').click();
    await editor
      .getByTestId('flow-memo-draft-structure-disclosure')
      .locator(':scope > summary')
      .click();
    await editor.getByRole('checkbox', { name: '관리사무소에 연락하기 저장에 포함' }).uncheck();
    await expect(editor.getByText('2/3개 선택')).toBeVisible();
    if (exportEvidenceDir) {
      await editor.screenshot({
        path: `${exportEvidenceDir}/screenshots/00-memo-split-acceptance-mobile.png`,
      });
    }
    await editor.getByLabel('메모 초안 제목').fill('이사 전 확인할 일');
    await editor.getByLabel('메모 초안 첫 할 일 날짜').fill('2026-08-30');
    await editor.getByTestId('flow-memo-draft-save').click();

    await expect(page).toHaveURL(/\/my/);
    const draftSlug = new URL(page.url()).searchParams.get('savedFlow') ?? '';
    expect(draftSlug).toMatch(/^url-draft-/u);
    await openPostSaveWorkspaceIfPresent(page);
    let draftFlow = await openSavedDraftFlow(page, draftSlug);
    let draftItemRows = draftFlow
      .getByTestId('my-flow-whole-flow-outline')
      .getByTestId('my-flow-execution-row-shell');
    const effectiveItems = draftItemRows;
    await expect(effectiveItems).toHaveCount(2);
    await expect(draftFlow).toContainText('이사 업체 견적 비교하기');
    await expect(draftFlow).toContainText('주소 변경 대상을 확인하기');
    await expect(draftFlow).not.toContainText('관리사무소에 연락하기');
    await expect(draftFlow).not.toContainText('할 일을 실행할 순서 정하기');
    const savedItemIds = await page.evaluate(() => {
      const bundles = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]') as Array<{
        flow?: { slug?: string };
        items?: Array<{ id?: string }>;
      }>;
      return bundles.find((bundle) => bundle.flow?.slug?.startsWith('url-draft-'))?.items?.map((item) => item.id) ?? [];
    });
    expect(savedItemIds).toHaveLength(2);

    const exportPanel = await openPersonalDraftListExport(draftFlow);
    await expect(exportPanel.getByTestId('my-flow-export-scope-flow')).toHaveAttribute('aria-pressed', 'true');
    await expect(exportPanel.getByTestId('my-flow-export-scope-flow')).toHaveText('계획 전체 · 2개');
    await expect(exportPanel.getByTestId('my-flow-export-scope-summary')).toHaveText('계획 전체 · 2개');
    await expect(exportPanel.getByTestId('my-flow-export-panel')).toHaveAttribute('data-export-included-count', '2');
    await expect(exportPanel.getByTestId('my-flow-export-calendar')).toHaveAttribute('data-export-count', '1');
    await expect(exportPanel.getByTestId('personal-draft-copy-checklist')).toHaveAttribute('data-export-count', '2');
    await expect(exportPanel.getByTestId('personal-draft-copy-sheet')).toHaveAttribute('data-export-count', '2');
    await expect(exportPanel.getByTestId('personal-draft-copy-memo')).toHaveAttribute('data-export-count', '2');
    const memoAction = exportPanel.getByTestId('personal-draft-copy-memo');
    if (!(await memoAction.isVisible().catch(() => false))) {
      await exportPanel
        .getByTestId('my-flow-export-more-formats')
        .locator(':scope > summary')
        .click();
    }
    const copiedMemo = await completeSavedClipboardTransfer(page, memoAction);
    expect(copiedMemo).toContain('할 일 2개');
    expect(copiedMemo).toContain('이사 업체 견적 비교하기');
    expect(copiedMemo).toContain('주소 변경 대상을 확인하기');
    expect(copiedMemo).not.toContain('관리사무소에 연락하기');
    expect(copiedMemo).not.toContain('할 일을 실행할 순서 정하기');

    await exportPanel.getByTestId('my-flow-export-scope-selected').click();
    await exportPanel.getByRole('checkbox', { name: '이사 업체 견적 비교하기 옮길 항목으로 선택' }).check();
    await exportPanel.getByRole('checkbox', { name: '주소 변경 대상을 확인하기 옮길 항목으로 선택' }).check();
    await expect(exportPanel.getByTestId('my-flow-export-scope-summary')).toHaveText('직접 선택 · 2개');
    await expect(exportPanel.getByTestId('my-flow-export-calendar')).toHaveAccessibleName(/캘린더 파일 1개$/);
    const calendarDownload = await completeSavedFileTransfer(
      page,
      exportPanel.getByTestId('my-flow-export-calendar'),
    );
    expect(calendarDownload.suggestedFilename()).toMatch(/selected-calendar\.ics$/u);
    const calendarDownloadPath = await calendarDownload.path();
    expect(calendarDownloadPath).toBeTruthy();
    const selectedCalendar = fs.readFileSync(calendarDownloadPath!, 'utf8').replaceAll('\r\n ', '');
    expect(selectedCalendar.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(selectedCalendar).toContain('SUMMARY:이사 업체 견적 비교하기');
    expect(selectedCalendar).not.toContain('주소 변경 대상을 확인하기');
    if (exportEvidenceDir) {
      await calendarDownload.saveAs(`${exportEvidenceDir}/downloads/personal-draft-selected-calendar.ics`);
      await captureWithoutPlatformChrome(
        page,
        exportPanel,
        `${exportEvidenceDir}/screenshots/00-personal-draft-selected-export-mobile.png`,
      );
    }
    const selectedChecklist = await completeSavedClipboardTransfer(
      page,
      exportPanel.getByTestId('personal-draft-copy-checklist'),
    );
    expect(selectedChecklist).toContain('이사 업체 견적 비교하기');
    expect(selectedChecklist).toContain('주소 변경 대상을 확인하기');
    expect(selectedChecklist).not.toContain('할 일을 실행할 순서 정하기');

    const evidenceDir = process.env.FLOWME_P24_F3B_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await draftFlow.screenshot({
        path: `${evidenceDir}/screenshots/00-memo-split-items-mobile.png`,
      });
    }
    await page.reload();
    draftFlow = await openSavedDraftFlow(page, draftSlug);
    draftItemRows = draftFlow
      .getByTestId('my-flow-whole-flow-outline')
      .getByTestId('my-flow-execution-row-shell');
    await expect(draftItemRows).toHaveCount(2);
    const reloadedItemIds = await page.evaluate(() => {
      const bundles = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]') as Array<{
        flow?: { slug?: string };
        items?: Array<{ id?: string }>;
      }>;
      return bundles.find((bundle) => bundle.flow?.slug?.startsWith('url-draft-'))?.items?.map((item) => item.id) ?? [];
    });
    expect(reloadedItemIds).toEqual(savedItemIds);

    await page.goto('/calendar');
    await page.getByTestId('my-flow-month-picker').fill('2026-08');
    await expect(page.locator('.fc-daygrid-day[data-date="2026-08-30"] .fc-event')).toHaveCount(1);
    await expect(
      page.locator('.fc-event').filter({ hasText: '주소 변경 대상을 확인하기' }),
    ).toHaveCount(0);
    await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my');
    const wideDraftFlow = await openSavedDraftFlow(page, draftSlug);
    await expect(wideDraftFlow).toContainText('전체 0/2 완료');
    if (exportEvidenceDir) {
      await wideDraftFlow.getByTestId('personal-draft-list-export-toggle').click();
      await captureWithoutPlatformChrome(
        page,
        wideDraftFlow.getByTestId('personal-draft-list-export'),
        `${exportEvidenceDir}/screenshots/02-personal-draft-whole-export-wide.png`,
      );
    }
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

  test('source-backed Flow export chooses whole or selected scope before format', async ({ page }) => {
    test.setTimeout(120_000);
    const exportEvidenceDir = process.env.FLOWME_P24_S2_EVIDENCE_DIR;
    if (exportEvidenceDir) fs.mkdirSync(`${exportEvidenceDir}/screenshots`, { recursive: true });
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=source-backed');

    const flow = await openMyFlowLibraryFlow(page, 'source-backed-moving-d30', 'record');
    const exportSurface = flow.getByTestId('my-flow-export-surface');
    await expect(exportSurface.getByTestId('my-flow-export-entry')).toContainText(/내 도구로 옮기기 · \d+개/);
    await exportSurface.getByTestId('my-flow-export-entry').click();
    await expect(exportSurface.getByTestId('my-flow-export-scope-flow')).toHaveAttribute('aria-pressed', 'true');
    await expect(exportSurface.getByTestId('my-flow-export-scope-flow')).toHaveText('계획 전체 · 5개');
    await expect(exportSurface.getByTestId('my-flow-export-scope-summary')).toHaveText('계획 전체 · 5개');
    await expect(exportSurface.getByTestId('my-flow-export-panel')).toHaveAttribute('data-export-included-count', '5');
    await expect(exportSurface.getByTestId('my-flow-export-checklist')).toBeEnabled();

    await exportSurface.getByTestId('my-flow-export-scope-selected').click();
    const choices = exportSurface.getByTestId('my-flow-export-selectable-item');
    await expect(choices).toHaveCount(5);
    const selectedTitles = await choices.locator('span > span:first-child').evaluateAll((nodes) =>
      nodes.slice(0, 2).map((node) => node.textContent?.trim() ?? ''),
    );
    await choices.nth(0).getByRole('checkbox').check();
    await choices.nth(1).getByRole('checkbox').check();
    await expect(exportSurface.getByTestId('my-flow-export-scope-summary')).toHaveText('직접 선택 · 2개');
    await expect(exportSurface.getByTestId('my-flow-export-calendar')).toHaveAttribute('data-export-count', '2');
    await expect(exportSurface.getByTestId('my-flow-export-checklist')).toHaveAttribute('data-export-count', '2');
    await expect(exportSurface.getByTestId('my-flow-export-sheet')).toHaveAttribute('data-export-count', '2');
    await expect(exportSurface.getByTestId('my-flow-export-memo')).toHaveAttribute('data-export-count', '2');
    const copied = await completeSavedClipboardTransfer(
      page,
      exportSurface.getByTestId('my-flow-export-memo'),
    );
    expect(copied).toContain(selectedTitles[0]);
    expect(copied).toContain(selectedTitles[1]);
    const unselectedTitle = await choices.nth(2).locator('span > span:first-child').textContent();
    expect(copied).not.toContain(unselectedTitle?.trim() ?? '');
    if (exportEvidenceDir) {
      await captureWithoutPlatformChrome(
        page,
        exportSurface,
        `${exportEvidenceDir}/screenshots/01-source-backed-selected-export-mobile.png`,
      );
    }

    const selectedFlow = await openMyFlowLibraryFlow(page, 'source-backed-moving-d30', 'plan');
    const firstExecutionRow = selectedFlow.getByTestId('my-flow-execution-row-shell').first();
    await firstExecutionRow.getByRole('button', { name: /열기/ }).click();
    const detail = getOpenMyFlowItemDetail(page);
    await expect(
      detail.getByTestId('my-flow-detail-portable-export').locator(':scope > summary'),
    ).toHaveText(
      '현재 항목 1개 옮기기',
    );
    await expect(detail.getByTestId('my-flow-detail-portable-export')).toHaveAttribute('data-export-scope', 'item');
    await expect(detail.getByTestId('my-flow-detail-portable-export')).toHaveAttribute('data-export-included-count', '1');
    await detail
      .getByTestId('my-flow-detail-portable-export')
      .locator(':scope > summary')
      .click();
    await expect(detail.getByTestId('my-flow-detail-copy-portable-text')).toContainText('1개');
    await expect(detail.getByTestId('my-flow-detail-copy-checklist-text')).toContainText('1개');
    await expect(detail.getByTestId('my-flow-detail-copy-sheet-row')).toContainText('1행');
    await expect(detail.getByTestId('my-flow-detail-download-ics')).toContainText('1개');
    if (exportEvidenceDir) {
      await captureWithoutPlatformChrome(
        page,
        detail,
        `${exportEvidenceDir}/screenshots/03-source-backed-item-export-mobile.png`,
      );
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
    await lookup.getByRole('button', { name: '계획 찾기' }).click();
    const result = page.getByTestId('flow-url-lookup-result');
    await result.getByRole('button', { name: '초안 준비하기' }).click();
    await expect(result.getByRole('status')).toHaveText(
      '계획 이름이나 원하는 결과 중 하나를 입력해 주세요.',
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
    await expect(candidate).not.toContainText('바로 시작할 계획을 찾지 못했어요');
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('flow:url-first:supply-candidates') || '[]'),
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe('여행 전에 여권과 환전 준비를 확인하고 싶어요');
    await candidate.getByTestId('flow-url-miss-draft-open').click();
    await expect(candidate.getByTestId('flow-url-miss-draft-suggestion-list')).not.toContainText(
      '바로 시작할 계획을 찾지 못했어요',
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

  test('focused Flow completion stays reversible through one Item-detail control', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date('2026-06-03T09:00:00+09:00') });
    await page.addInitScript(() => {
      if (sessionStorage.getItem('flowme:p25:completion-seeded') === 'true') return;
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
      sessionStorage.setItem('flowme:p25:completion-seeded', 'true');
    });

    await page.goto('/my?view=flows');
    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
    const runnable = workspace
      .getByTestId('my-flow-temporal-next-group')
      .getByTestId('my-flow-execution-row-shell')
      .first();
    const executionRow = runnable.locator('article[data-row-key]');
    const rowKey = await executionRow.getAttribute('data-row-key');
    const itemId = await executionRow.getAttribute('data-item-id');
    const title = (await runnable.getByTestId('my-flow-row-title').innerText()).trim();
    expect(rowKey).toBeTruthy();
    expect(itemId).toBeTruthy();
    await expect(runnable.getByTestId('my-flow-task-complete-control')).toHaveCount(0);

    await runnable.getByRole('button', { name: /열기/ }).click();
    const itemDetail = getOpenMyFlowItemDetail(page);
    await expect(itemDetail).toBeVisible();
    const detailCompletion = itemDetail.getByTestId('my-flow-task-complete-control');
    await expect(detailCompletion).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);

    await detailCompletion.click();
    const snackbar = page.getByTestId('my-flow-completion-snackbar');
    await expect(snackbar).toBeVisible();
    await expect(snackbar).toHaveAttribute('aria-live', 'polite');
    await expect(snackbar).toHaveAttribute('data-completion-result', 'completed');
    await expect(snackbar).toContainText(title);
    await expect(snackbar.getByTestId('my-flow-completion-undo')).toHaveText('되돌리기');
    await expect(snackbar.getByTestId('my-flow-completion-undo')).toBeFocused();
    const snackbarBox = await snackbar.boundingBox();
    const mobileTabsBox = await page.getByTestId('platform-mobile-tabs').boundingBox();
    expect((snackbarBox?.y ?? 0) + (snackbarBox?.height ?? 0)).toBeLessThanOrEqual((mobileTabsBox?.y ?? 0) + 2);
    const evidenceDir = process.env.FLOWME_P26_12_EVIDENCE_DIR ?? process.env.FLOWME_P25_05A_EVIDENCE_DIR ?? process.env.FLOWME_P24_U1_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await page.screenshot({
        path: `${evidenceDir}/screenshots/00-focused-completion-undo-mobile.png`,
        fullPage: true,
      });
    }

    await snackbar.getByTestId('my-flow-completion-undo').press('Enter');
    await expect(snackbar).toHaveCount(0);
    await expect(detailCompletion).not.toBeChecked();
    await expect(detailCompletion).toBeFocused();

    await detailCompletion.click();
    await expect(detailCompletion).toBeChecked();
    await closeOpenMyFlowItemDetail(page);
    await page.reload();
    const reloadedWorkspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
    const reloadedOutline = reloadedWorkspace.getByTestId('my-flow-whole-flow-outline');
    const completedRow = reloadedOutline.locator(`article[data-row-key="${rowKey}"]`);
    await expect(completedRow).toBeVisible();
    await expect(completedRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await completedRow.getByRole('button', { name: /열기/ }).click();
    const completedDetail = getOpenMyFlowItemDetail(page);
    const completedControl = completedDetail.getByTestId('my-flow-task-complete-control');
    await expect(completedControl).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await expect(completedControl).toBeChecked();
    await expect(completedControl).toHaveAccessibleName(/다시 열기$/);
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/01-persistent-completed-mobile.png`,
        fullPage: true,
      });
    }
    await completedControl.click();
    const reopenNotice = page.getByTestId('my-flow-completion-snackbar');
    await expect(reopenNotice).toHaveAttribute('data-completion-result', 'reopened');
    await expect(reopenNotice).toContainText('다시 열림');
    await expect(reopenNotice.getByTestId('my-flow-completion-open')).toHaveText('항목 보기');
    await expect(reopenNotice.getByTestId('my-flow-completion-open')).toBeFocused();

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.reload();
    const wideFlow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
    await expandMyFlowWholePlan(wideFlow);
    const wideRow = wideFlow
      .getByTestId('my-flow-shape-aware-execution')
      .locator(`article[data-row-key="${rowKey}"]:visible`)
      .first();
    await expect(wideRow).toBeVisible();
    await expect(wideRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    const wideDetailPane = wideFlow.getByTestId('my-flow-workspace-detail-pane');
    await expect(wideDetailPane).toBeVisible();
    const wideDetail = wideDetailPane.locator(
      `[data-testid="my-flow-item-detail"][data-item-id="${itemId}"]:visible`,
    );
    if (!(await wideDetail.isVisible().catch(() => false))) {
      await wideRow.getByRole('button', { name: /열기/ }).click();
    }
    await expect(wideDetail).toHaveCount(1);
    const wideCompletion = wideDetail.getByTestId('my-flow-task-complete-control');
    await expect(wideCompletion).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await expect(wideCompletion).not.toBeChecked();
    await wideCompletion.focus();
    await wideCompletion.click();
    const wideNotice = page.getByTestId('my-flow-completion-snackbar');
    await expect(wideNotice.getByTestId('my-flow-completion-undo')).toHaveCount(0);
    await wideCompletion.click();
    await expect(wideCompletion).not.toBeChecked();
    await expect(wideNotice).toHaveAttribute('data-completion-result', 'reopened');
    await expect(wideNotice.getByTestId('my-flow-completion-open')).toBeFocused();
    await expect(wideDetail).toBeVisible();
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/05-wide-completion-undo-focus.png`,
        fullPage: true,
      });
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
  });

  test('focused Flow separates one next date group from the full future plan on mobile and wide', async ({ page }) => {
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
      await page.goto('/my?view=flows');
      const flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
      if (width < 900) {
        const execute = flow.getByTestId('my-flow-workspace-execute');
        const nextDateGroup = execute.getByTestId('my-flow-temporal-next-group');
        const nextDateRows = nextDateGroup.getByTestId('my-flow-execution-row-shell');
        const nextDateRowCount = await nextDateRows.count();
        expect(nextDateRowCount).toBeGreaterThan(1);
        expect(nextDateRowCount).toBe(3);
        await expect(nextDateGroup.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
      }
      const planToggle = flow.getByTestId('my-flow-workspace-plan-toggle');
      if (
        await planToggle.isVisible().catch(() => false) &&
        (await planToggle.getAttribute('aria-expanded')) === 'false'
      ) {
        await planToggle.click();
      }
      const plan = flow.getByTestId('my-flow-whole-flow-outline');
      await expect(plan).toBeVisible();
      const planRows = plan.locator('article[data-row-key]');
      expect(await planRows.count()).toBeGreaterThan(1);
      const rowKeys = await planRows.evaluateAll(
        (nodes) => nodes.map((node) => node.getAttribute('data-row-key')).filter(Boolean),
      );
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

    await checkViewport(390, 844, '01-focused-next-and-plan-mobile.png');
    await checkViewport(1024, 768, '02-focused-next-and-plan-wide.png');
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
      const primarySave = saveArea.locator('button[data-action-priority="primary"]');
      await expect(primarySave).toBeVisible();
      await expect(primarySave).toHaveAccessibleName('내 계획에 저장');
      const saveBanner = await savePublicFlow(page, primarySave);
      const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
      expect(personalCopyKey).toMatch(/^personal-copy:/u);
      await expect.poll(() => page.evaluate((copyKey) =>
        Boolean(localStorage.getItem(`flow:saved:${copyKey}`)),
      personalCopyKey)).toBe(true);
      await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
      await openSavedPublicFlow(page, saveBanner);
      const savedFlow = await openMyFlowLibraryFlow(
        page,
        'new-car-delivery-check',
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

  test('My Flow uses the shared saved Item editor for common personal fields only', async ({ page }) => {
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
    await expect(page).toHaveURL('/f/moving-d30-basic');
    await page.getByLabel('이사일').fill('2026-07-22');
    await savePublicFlow(page, page.getByTestId('public-flow-save-primary-mobile'));
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
    expect(personalCopyKey).toMatch(/^personal-copy:/u);

    const openMovingEditor = async () => {
      const flow = await openMyFlowLibraryFlow(
        page,
        personalCopyKey,
        'plan',
      );
      const outline = flow.getByTestId('my-flow-whole-flow-outline');
      if ((await outline.getByTestId('my-flow-execution-row-shell').count()) === 0) {
        await outline.getByTestId('my-flow-whole-flow-section-toggle').first().click();
      }
      const firstRow = outline.getByTestId('my-flow-execution-row-shell').first();
      await expect(firstRow).toBeVisible({ timeout: 10_000 });
      await firstRow.locator('button').first().click();
      const detail = getOpenMyFlowItemDetail(page);
      await detail.getByTestId('my-flow-quick-item-edit').click();
      const editor = page.getByTestId('saved-flow-editor-item');
      await expect(editor).toBeVisible();
      return { detail, editor };
    };

    let opened = await openMovingEditor();
    let editor = opened.editor;
    await expect(editor).toHaveAttribute('data-editor-frame', 'shared');
    await expect(editor).toHaveAttribute('data-editor-level', 'item');
    await expect(editor.getByTestId('saved-flow-editor-item-title-input')).toBeVisible();
    await expect(editor.getByTestId('saved-flow-editor-item-date-input')).toBeVisible();
    await expect(editor.getByTestId('saved-flow-editor-item-detail-input')).toBeVisible();
    await expect(editor.locator('input[type="time"]')).toHaveCount(0);
    await expect(editor.locator('input[placeholder="장소 없음"]')).toHaveCount(0);
    await expect(editor.getByTestId('my-flow-detail-repeat-input')).toHaveCount(0);
    await expect(editor.getByTestId('my-flow-editor-advanced-toggle')).toHaveCount(0);
    const evidenceDir = process.env.FLOWME_P25_PROGRESSIVE_ADJUSTMENT_EVIDENCE_DIR
      ?? process.env.FLOWME_P24_U2_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await editor.screenshot({
        path: `${evidenceDir}/screenshots/00-shared-saved-item-editor-mobile.png`,
      });
    }

    const personalMemo = '세 업체 견적과 가능한 이사 날짜를 비교';
    const personalDate = '2026-07-25';
    await editor.getByTestId('saved-flow-editor-item-detail-input').fill(personalMemo);
    await editor.getByTestId('saved-flow-editor-item-date-input').fill(personalDate);
    await editor.getByTestId('my-flow-detail-save-changes').click();
    const planEditor = page.getByTestId('saved-flow-editor-plan');
    await expect(planEditor).toBeVisible();
    await planEditor.getByTestId('saved-flow-editor-save').click();
    await expect(planEditor).toHaveCount(0);

    await closeOpenMyFlowItemDetail(page);
    await page.reload();
    opened = await openMovingEditor();
    editor = opened.editor;
    await expect(editor.getByTestId('saved-flow-editor-item-detail-input')).toHaveValue(personalMemo);
    await expect(editor.getByTestId('saved-flow-editor-item-date-input')).toHaveValue(personalDate);
    await editor.getByTestId('saved-flow-editor-item-cancel').click();
    await expect(page.getByTestId('saved-flow-editor-item')).toHaveCount(0);
    await page.getByTestId('saved-flow-editor-cancel').click();
    await expect(page.getByTestId('saved-flow-editor-plan')).toHaveCount(0);
    await closeOpenMyFlowItemDetail(page);

    await page.setViewportSize({ width: 1024, height: 768 });
    opened = await openMovingEditor();
    editor = opened.editor;
    await expect(editor).toHaveAttribute('data-editor-layout', 'responsive');
    await expect(editor.getByTestId('saved-flow-editor-item-detail-input')).toHaveValue(personalMemo);
    await expect(editor.getByTestId('saved-flow-editor-item-date-input')).toHaveValue(personalDate);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/01-shared-saved-item-editor-revisit-wide.png`,
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
    const flow = await openMyFlowLibraryFlow(page, 'used-car-buying-check', 'plan');
    const outline = flow.getByTestId('my-flow-whole-flow-outline');
    const decisionGroup = outline.getByRole('button', { name: /계약 전 확인/ });
    if ((await decisionGroup.getAttribute('aria-expanded')) !== 'true') await decisionGroup.click();
    const decisionRow = outline
      .getByTestId('my-flow-execution-row-shell')
      .filter({ hasText: '최종 구매/보류/거절' });
    await decisionRow.getByRole('button', { name: /열기/ }).click();
    const detail = getOpenMyFlowItemDetail(page);
    await enterMyFlowDetailEditMode(detail);
    const toggle = detail.getByTestId('my-flow-editor-advanced-toggle');
    await expect(toggle).toContainText('결정');
    await expect(detail.getByTestId('my-flow-decision-fields')).toHaveCount(0);
    await expandMyFlowAdvancedEditor(detail);
    await expect(detail.getByTestId('my-flow-decision-fields')).toBeVisible();
    await expect(detail.getByTestId('my-flow-decision-status')).toBeVisible();
    const evidenceDir = process.env.FLOWME_P25_PROGRESSIVE_ADJUSTMENT_EVIDENCE_DIR
      ?? process.env.FLOWME_P24_U2_EVIDENCE_DIR;
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

  test('whole Flow batch mode moves, clears, exports, removes, and restores selected draft items', async ({ page }) => {
    test.setTimeout(180_000);
    page.setDefaultTimeout(15_000);
    const evidenceDir = process.env.FLOWME_P25_BATCH_ADJUSTMENT_EVIDENCE_DIR;
    if (evidenceDir) fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flows');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const lookup = page.getByTestId('flow-url-lookup-entry');
    await lookup.getByLabel('URL 또는 메모').fill(
      '여권을 확인한다. 보험 서류를 챙긴다. 숙소 주소를 적는다.',
    );
    await lookup.getByRole('button', { name: '계획 찾기' }).click();
    const editor = page.getByTestId('flow-memo-draft-editor');
    await expect(editor.getByTestId('flow-memo-draft-item')).toHaveCount(3);
    await editor.getByLabel('메모 초안 제목').fill('여행 출발 준비');
    await editor.getByTestId('flow-memo-draft-save').click();

    await expect(page).toHaveURL(/\/my/);
    await openPostSaveWorkspaceIfPresent(page);
    const draftSlug = await getFirstSavedPersonalDraftSlug(page);
    const draftFlow = await openMyFlowLibraryFlow(page, draftSlug, 'plan');
    await expect(draftFlow).toBeVisible();
    const batchToggle = draftFlow.getByTestId('my-flow-batch-mode-toggle');
    await batchToggle.click();
    const outline = draftFlow.getByTestId('my-flow-whole-flow-outline');
    await expect(outline).toBeVisible();
    await expect(outline.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    const batchRows = outline.getByTestId('my-flow-batch-selectable-row');
    await expect(batchRows).toHaveCount(3);
    await batchRows.nth(0).getByTestId('my-flow-batch-item-checkbox').check();
    await batchRows.nth(1).getByTestId('my-flow-batch-item-checkbox').check();
    const toolbar = outline.getByTestId('my-flow-batch-toolbar');
    await expect(toolbar.getByTestId('my-flow-batch-selected-count')).toHaveText('2개 선택');
    await toolbar.getByTestId('my-flow-batch-open-date-tool').click();
    await toolbar.getByTestId('my-flow-batch-target-date').fill('2026-09-02');
    await expect(toolbar.getByTestId('my-flow-batch-impact-preview')).toContainText('2개가 바뀝니다');
    if (evidenceDir) {
      await captureWithoutPlatformChrome(
        page,
        outline,
        `${evidenceDir}/screenshots/00-batch-date-preview-mobile.png`,
      );
    }
    await toolbar.getByTestId('my-flow-batch-apply-date').click();
    await expect(draftFlow.getByTestId('my-flow-batch-undo')).toContainText('2개 날짜');
    const movedOverrideCount = await page.evaluate(() => {
      const values = Object.values(JSON.parse(localStorage.getItem('flow:my-flow:date-overrides') || '{}'));
      return values.filter((value) => value === '2026-09-02').length;
    });
    expect(movedOverrideCount).toBe(2);
    await draftFlow.getByTestId('my-flow-batch-undo-action').click();
    await expect(draftFlow.getByTestId('my-flow-batch-undo')).toHaveCount(0);

    await outline.getByTestId('my-flow-batch-selectable-row').nth(0).getByTestId('my-flow-batch-item-checkbox').check();
    await outline.getByTestId('my-flow-batch-selectable-row').nth(1).getByTestId('my-flow-batch-item-checkbox').check();
    await outline.getByTestId('my-flow-batch-export-selected').click();
    const exportSurface = await openPersonalDraftListExport(draftFlow);
    const exportPanel = exportSurface.getByTestId('my-flow-export-panel');
    await expect(exportPanel.getByTestId('my-flow-export-scope-selected')).toHaveAttribute('aria-pressed', 'true');
    await expect(exportPanel.getByTestId('my-flow-export-scope-selected')).toHaveText('직접 선택 · 2개');
    await expect(exportPanel.getByTestId('my-flow-export-scope-summary')).toHaveText('직접 선택 · 2개');
    await expect(exportPanel.getByTestId('my-flow-export-selectable-item')).toHaveCount(3);
    await expect(exportPanel.getByTestId('my-flow-export-selectable-item').locator('input:checked')).toHaveCount(2);
    await exportPanel.getByRole('button', { name: /옮기기 닫기/ }).click();

    await batchToggle.click();
    await outline.getByTestId('my-flow-batch-selectable-row').nth(0).getByTestId('my-flow-batch-item-checkbox').check();
    await outline.getByTestId('my-flow-batch-open-date-tool').click();
    await outline.getByTestId('my-flow-batch-target-date').fill('2026-09-03');
    await outline.getByTestId('my-flow-batch-apply-date').click();
    await expect(draftFlow.getByTestId('my-flow-batch-undo')).toBeVisible();
    await outline.getByTestId('my-flow-batch-selectable-row').nth(0).getByTestId('my-flow-batch-item-checkbox').check();
    await outline.getByTestId('my-flow-batch-open-date-tool').click();
    await outline.getByTestId('my-flow-batch-operation-remove-date').click();
    await expect(outline.getByTestId('my-flow-batch-impact-preview')).toContainText('1개가 바뀝니다');
    await outline.getByTestId('my-flow-batch-apply-date').click();
    await expect.poll(() => page.evaluate(() => {
      const values = Object.values(JSON.parse(localStorage.getItem('flow:my-flow:date-overrides') || '{}'));
      return {
        removedCount: values.filter((value) => value === '__flowme_unscheduled__').length,
        staleMovedDateCount: values.filter((value) => value === '2026-09-03').length,
      };
    })).toEqual({ removedCount: 1, staleMovedDateCount: 0 });
    await draftFlow.getByTestId('my-flow-batch-undo-action').click();
    await expect(draftFlow.getByTestId('my-flow-batch-undo')).toHaveCount(0);

    await outline.getByTestId('my-flow-batch-selectable-row').nth(0).getByTestId('my-flow-batch-item-checkbox').check();
    page.once('dialog', (dialog) => dialog.accept());
    await outline.getByTestId('my-flow-batch-remove-selected').click();
    await expect(draftFlow.getByTestId('my-flow-batch-undo')).toContainText('1개를 계획에서 뺐어요');
    await expect(outline.getByTestId('my-flow-batch-selectable-row')).toHaveCount(2);
    await draftFlow.getByTestId('my-flow-batch-undo-action').click();
    await expect(outline.getByTestId('my-flow-batch-selectable-row')).toHaveCount(3);

    await page.setViewportSize({ width: 1024, height: 768 });
    const wideDraftFlow = page
      .getByTestId('my-flow-overview-card')
      .filter({ hasText: '여행 출발 준비' });
    await expect(wideDraftFlow).toBeVisible();
    const wideOutline = wideDraftFlow.getByTestId('my-flow-whole-flow-outline');
    const wideToggle = wideOutline.getByTestId('my-flow-batch-mode-toggle');
    if ((await wideToggle.getAttribute('aria-pressed')) !== 'true') await wideToggle.click();
    await wideOutline.getByTestId('my-flow-batch-select-all').click();
    await expect(wideOutline.getByTestId('my-flow-batch-selected-count')).toHaveText('3개 선택');
    if (evidenceDir) {
      await captureWithoutPlatformChrome(
        page,
        wideDraftFlow,
        `${evidenceDir}/screenshots/01-batch-selection-wide.png`,
      );
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);

    await page.goto('/my?demo=source-backed');
    const sourceBackedFlow = await openMyFlowLibraryFlow(page, 'source-backed-moving-d30');
    const sourceBackedOutline = sourceBackedFlow.getByTestId('my-flow-whole-flow-outline');
    await sourceBackedOutline.getByTestId('my-flow-batch-mode-toggle').click();
    await sourceBackedOutline.getByTestId('my-flow-batch-item-checkbox').first().check();
    await expect(sourceBackedOutline.getByTestId('my-flow-batch-remove-selected')).toHaveCount(0);
    if (evidenceDir) {
      await captureWithoutPlatformChrome(
        page,
        sourceBackedOutline,
        `${evidenceDir}/screenshots/02-source-backed-selection-without-remove.png`,
      );
    }

    await page.goto('/my?demo=ux12');
    const routineFlow = await openMyFlowLibraryFlow(page, 'washer-tub-clean-monthly');
    const routineOutline = routineFlow.getByTestId('my-flow-whole-flow-outline');
    await routineOutline.getByTestId('my-flow-batch-mode-toggle').click();
    await routineOutline.getByTestId('my-flow-batch-item-checkbox').first().check();
    await routineOutline.getByTestId('my-flow-batch-open-date-tool').click();
    await expect(routineOutline.getByTestId('my-flow-batch-impact-preview')).toContainText('이번 회차·이후·전체 범위를 먼저 고르세요');
    await expect(routineOutline.getByTestId('my-flow-batch-apply-date')).toBeDisabled();
    if (evidenceDir) {
      await captureWithoutPlatformChrome(
        page,
        routineOutline,
        `${evidenceDir}/screenshots/03-routine-batch-scope-block.png`,
      );
    }
  });

  test('My Flow schedules an undated draft item and Calendar projects dated execution only', async ({ page }) => {
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
    await lookup.getByRole('button', { name: '계획 찾기' }).click();
    const result = page.getByTestId('flow-url-lookup-result');
    await result.getByLabel('계획 이름').fill('캘린더 배치 초안');
    await result.getByLabel('원하는 결과').fill('날짜 없는 준비를 캘린더에 놓기');
    await result.getByRole('button', { name: '초안 준비하기' }).click();

    const candidate = page.getByTestId('flow-url-supply-candidate-list').locator('article').first();
    await candidate.getByTestId('flow-url-miss-draft-open').click();
    await candidate.getByTestId('flow-url-miss-draft-flow-title').fill('캘린더 배치 초안');
    await candidate.getByTestId('flow-url-miss-draft-save').click();

    await expect(page).toHaveURL(/\/my/);
    await openPostSaveWorkspaceIfPresent(page);
    const draftSlug = await getFirstSavedPersonalDraftSlug(page);
    const draftFlow = await openMyFlowLibraryFlow(page, draftSlug, 'plan');
    await addPersonalDraftItem(draftFlow, '충전기 챙기기');
    await expect(draftFlow).toContainText('충전기 챙기기');

    const evidenceDir = process.env.FLOWME_P24_U3_EVIDENCE_DIR;
    const draftRow = (await getMyFlowVisibleExecutionRows(draftFlow))
      .filter({ hasText: '충전기 챙기기' })
      .first();
    await expect(draftRow).toBeVisible();
    await expect(draftRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await draftRow.getByRole('button', { name: /충전기 챙기기 열기/ }).click();
    let detail = getOpenMyFlowItemDetail(page);
    const completion = detail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await completion.click();
    await expect(page.getByTestId('my-flow-completion-undo')).toHaveCount(0);
    await expect(completion).toBeChecked();
    await completion.click();
    await expect(completion).not.toBeChecked();

    await enterMyFlowDetailEditMode(detail);
    await expect(detail.getByTestId('my-flow-detail-date-input')).toHaveCount(0);
    await detail.getByTestId('personal-draft-date-mode-fixed').click();
    await detail.getByTestId('my-flow-detail-date-input').fill('2026-07-21');
    await detail.getByTestId('my-flow-detail-save-changes').click();

    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await captureWithoutPlatformChrome(
        page,
        draftFlow,
        `${evidenceDir}/screenshots/00-my-flow-date-placement-mobile.png`,
      );
    }

    await page.goto('/calendar');
    await page.getByTestId('my-flow-month-picker').fill('2026-07');
    await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
    await expect(page.locator('.fc-daygrid-day[data-date="2026-07-21"] .fc-event')).toHaveCount(1);
    await page.locator('.fc-daygrid-day[data-date="2026-07-21"]')
      .getByTestId('my-flow-calendar-date-button')
      .click();
    let selectedDay = await openMyFlowCalendarSelectedDay(page);
    let scheduledRow = selectedDay
      .getByTestId('my-flow-execution-row-shell')
      .filter({ hasText: '충전기 챙기기' });
    await expect(scheduledRow).toBeVisible();
    await expect(scheduledRow.getByRole('button', { name: /계획에서 열기/ })).toBeVisible();
    await expect(page.getByTestId('my-flow-item-detail-sheet')).toHaveCount(0);
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/01-calendar-dated-execution-mobile.png`,
        fullPage: true,
      });
    }

    await page.reload();
    await page.getByTestId('my-flow-month-picker').fill('2026-07');
    await expect(page.locator('.fc-daygrid-day[data-date="2026-07-21"] .fc-event')).toHaveCount(1);
    await page.locator('.fc-daygrid-day[data-date="2026-07-21"]')
      .getByTestId('my-flow-calendar-date-button')
      .click();
    selectedDay = await openMyFlowCalendarSelectedDay(page);
    scheduledRow = selectedDay
      .getByTestId('my-flow-execution-row-shell')
      .filter({ hasText: '충전기 챙기기' });
    await scheduledRow.getByRole('button', { name: /계획에서 열기/ }).click();
    await expect(page).toHaveURL(/\/my\?view=flows&flow=/);
    detail = getOpenMyFlowItemDetail(page);
    await expect(detail).toBeVisible();
    await enterMyFlowDetailEditMode(detail);
    await detail.getByTestId('personal-draft-date-mode-none').click();
    await detail.getByTestId('my-flow-detail-save-changes').click();

    await page.goto('/calendar');
    await page.getByTestId('my-flow-month-picker').fill('2026-07');
    await expect(page.locator('.fc-daygrid-day[data-date="2026-07-21"] .fc-event')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.reload();
    await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
    await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/02-calendar-execution-lens-wide.png`,
        fullPage: true,
      });
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
  });

  test('Item memo stays in detail without a second execution-note surface', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    const flowSlug = 'moving-d30-basic';
    const flowBundle = seedBundles.find((bundle) => bundle.flow.slug === flowSlug);
    const checks = Object.fromEntries(
      (flowBundle?.items ?? []).map((item, index) => [item.id, index !== 0]),
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(({ slug, initialChecks }) => {
      if (sessionStorage.getItem('flow-p24-u4-seeded') === 'true') return;
      sessionStorage.setItem('flow-p24-u4-seeded', 'true');
      localStorage.clear();
      localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
        slug,
        savedAt: '2026-07-14T00:00:00.000Z',
        selectedArtifactMode: 'calendar',
        anchor: '2026-08-15',
      }));
      localStorage.setItem(`flow:${slug}:anchorDate`, JSON.stringify({
        mode: 'custom',
        anchor: '2026-08-15',
      }));
      localStorage.setItem(`flow_builder_mvp_checks_${slug}`, JSON.stringify(initialChecks));
    }, { slug: flowSlug, initialChecks: checks });

    await page.goto('/my');
    const selectedMobileFlow = await openMyFlowLibraryFlow(page, flowSlug, 'execute');
    const execution = selectedMobileFlow.getByTestId('my-flow-shape-aware-execution');
    await expect(execution.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await expect(execution.getByTestId('my-flow-inline-note-open')).toHaveCount(0);
    const firstRow = execution.getByTestId('my-flow-execution-row-shell').first();
    const itemId = await firstRow.locator('article[data-item-id]').getAttribute('data-item-id');
    expect(itemId).toBeTruthy();
    await firstRow.getByRole('button', { name: /열기/ }).click();
    const detail = getOpenMyFlowItemDetail(page);
    await expect(detail).toBeVisible();
    await expect(detail.getByTestId('my-flow-detail-execution-note')).toHaveCount(0);
    await expect(detail.getByTestId('my-flow-inline-note-open')).toHaveCount(0);
    await expect(detail.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await enterMyFlowDetailEditMode(detail);
    const memo = '업체에 전화하기 전에 비교 기준과 견적 유효 기간을 확인한다.';
    await detail.getByTestId('my-flow-detail-memo').fill(memo);

    const evidenceDir = process.env.FLOWME_P24_U4_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await captureWithoutPlatformChrome(
        page,
        detail,
        `${evidenceDir}/screenshots/00-item-memo-detail-mobile.png`,
      );
    }
    await detail.getByTestId('my-flow-detail-save-changes').click();
    await expect(page.getByTestId('my-flow-item-detail-sheet')).toHaveCount(0);
    const persisted = await page.evaluate(({ slug, id }) => ({
      draft: JSON.parse(localStorage.getItem('flow:my-flow:item-drafts') || '{}')[
        `${slug}::${id}::draft-overlay`
      ],
      legacyExecutionNotes: JSON.parse(
        localStorage.getItem(`flow:my-flow:execution-notes:${slug}`) || '[]',
      ),
    }), { slug: flowSlug, id: itemId });
    expect(persisted.draft?.memo).toBe(memo);
    expect(persisted.legacyExecutionNotes).toEqual([]);

    const rowAfterSave = execution.locator(`article[data-item-id="${itemId}"]`).first();
    await rowAfterSave.getByRole('button', { name: /열기/ }).click();
    const completionDetail = getOpenMyFlowItemDetail(page);
    const completion = completionDetail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await completion.click();
    await expect(completion).toBeChecked();
    await closeOpenMyFlowItemDetail(page);
    await expect(selectedMobileFlow.getByTestId('my-flow-completion-private-notes')).toHaveCount(0);
    await expect(selectedMobileFlow.getByTestId('my-flow-completion-correction-notes')).toHaveCount(0);

    await page.reload();
    const reloadedMobileFlow = await openMyFlowLibraryFlow(page, flowSlug, 'plan');
    const persistedRow = reloadedMobileFlow.locator(`article[data-item-id="${itemId}"]:visible`).first();
    await persistedRow.getByRole('button', { name: /열기/ }).click();
    const persistedDetail = getOpenMyFlowItemDetail(page);
    await enterMyFlowDetailEditMode(persistedDetail);
    await expect(persistedDetail.getByTestId('my-flow-detail-memo')).toHaveValue(memo);
    if (evidenceDir) {
      await captureWithoutPlatformChrome(
        page,
        persistedDetail,
        `${evidenceDir}/screenshots/01-item-memo-persisted-mobile.png`,
      );
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
  });
});
