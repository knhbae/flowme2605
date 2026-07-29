import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

const BASE_URL = process.env.FLOWME_REVIEW_BASE_URL || 'https://flowme2605.vercel.app';
const OUTPUT_DIR = path.resolve(
  'docs/content-audit/2026-07-24-flowme-p31-independent-my-flow-review-codex',
);
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'screenshots');
const VIEWPORT = { width: 390, height: 844 };

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function isVisible(locator) {
  return locator.isVisible().catch(() => false);
}

async function text(locator) {
  return clean(await locator.textContent().catch(() => ''));
}

async function firstVisible(...locators) {
  for (const locator of locators) {
    if (await isVisible(locator)) return locator;
  }
  return null;
}

async function createProbe(browser, id) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    timezoneId: 'Asia/Seoul',
    locale: 'ko-KR',
    colorScheme: 'light',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(6_000);
  const probe = {
    id,
    viewport: VIEWPORT,
    evidenceKind: 'current_browser_automation',
    actions: [],
    assertions: [],
    consoleErrors: [],
    pageErrors: [],
    screenshots: [],
    status: 'completed',
  };
  page.on('console', (message) => {
    if (message.type() === 'error') probe.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => probe.pageErrors.push(error.message));
  return { context, page, probe };
}

async function go(page, probe, route, options = {}) {
  const response = await page.goto(`${BASE_URL}${route}`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  probe.actions.push({ action: 'navigate', route, httpStatus: response?.status() });
  if (options.clearStorage) {
    await page.evaluate(() => window.localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    probe.actions.push({ action: 'clear_storage_and_reload', route });
  }
  await page.waitForTimeout(300);
  return response?.status();
}

async function act(probe, name, callback) {
  const started = Date.now();
  try {
    await callback();
    probe.actions.push({ action: name, ok: true, elapsedMs: Date.now() - started });
    return true;
  } catch (error) {
    probe.actions.push({
      action: name,
      ok: false,
      elapsedMs: Date.now() - started,
      error: clean(error?.message || error),
    });
    probe.status = 'partial';
    return false;
  }
}

function check(probe, name, actual, expected = true) {
  const pass = actual === expected;
  probe.assertions.push({ name, pass, expected, actual });
  if (!pass && probe.status === 'completed') probe.status = 'partial';
  return pass;
}

async function screenshot(page, probe, name) {
  const filename = `probe-${probe.id}-${name}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: true });
  probe.screenshots.push(filename);
}

async function savePublicFlow(page, probe, route, options = {}) {
  await go(page, probe, route, { clearStorage: options.clearStorage ?? true });
  if (options.anchor) {
    await act(probe, 'fill_anchor', async () => {
      await page.getByTestId('public-flow-anchor-input').fill(options.anchor);
    });
  }
  if (options.undated) {
    await act(probe, 'choose_undated', async () => {
      await page.getByTestId('public-flow-date-intent-undated').click();
    });
  }
  if (options.expandPreview) {
    const expand = page.getByTestId('public-flow-artifact-preview-expand');
    if (await isVisible(expand)) {
      await act(probe, 'expand_whole_preview', () => expand.click());
    }
  }
  const beforeCount = await page.getByTestId('flow-artifact-preview-row').count();
  check(probe, 'save_before_has_real_rows', beforeCount > 0, true);
  const save = await firstVisible(
    page.getByTestId('public-flow-save-primary-mobile'),
    page.getByTestId('public-flow-mobile-save-cta').getByRole('button'),
  );
  await act(probe, 'save_public_flow', async () => {
    if (!save) throw new Error('save action not visible');
    await save.click();
    await page.getByTestId('public-flow-saved-receipt').waitFor({ state: 'visible' });
  });
  check(
    probe,
    'receipt_is_distinct',
    await page.getByTestId('public-flow-saved-receipt').getAttribute('data-p29-marker'),
    'P29-SAVED-RECEIPT-DISTINCT',
  );
  return {
    beforeCount,
    receiptText: await text(page.getByTestId('public-flow-saved-receipt')),
  };
}

async function enterSavedWorkspace(page, probe, slug) {
  const receiptPrimary = page.getByTestId('public-flow-saved-receipt-primary');
  if (await isVisible(receiptPrimary)) {
    await act(probe, 'receipt_to_my_flow', async () => {
      await receiptPrimary.click();
      await page.waitForURL(/\/my/);
      await page.waitForLoadState('networkidle');
      await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'visible' });
      await page.waitForTimeout(500);
    });
  }
  const postSaveView = page.getByTestId('my-flow-post-save-view-flow');
  if (await isVisible(postSaveView)) {
    await act(probe, 'receipt_open_whole_flow', async () => {
      await postSaveView.click();
      await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'hidden' });
      await page.getByTestId('my-flow-workspace').waitFor({ state: 'visible' });
    });
  }
  await page.waitForTimeout(300);
  let workspace = page.locator(
    `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${slug}"]`,
  );
  if (!(await isVisible(workspace))) {
    const flowTab = page.getByTestId('my-flow-view-flow');
    if (await isVisible(flowTab)) await act(probe, 'open_flow_list', () => flowTab.click());
    const row = page.locator(
      `[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${slug}"]`,
    );
    await act(probe, 'open_flow_workspace', async () => {
      await row.getByTestId('my-flow-mobile-structure-open').click();
    });
  }
  workspace = page.locator(
    `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${slug}"]`,
  );
  if (!(await isVisible(workspace))) {
    probe.workspaceDebug = {
      url: page.url(),
      bodyText: clean(await page.locator('body').textContent()).slice(0, 4000),
      testIds: await page.locator('[data-testid]').evaluateAll((nodes) =>
        Array.from(new Set(nodes.map((node) => node.getAttribute('data-testid')).filter(Boolean))),
      ),
      failedActions: probe.actions.filter((entry) => entry.ok === false),
    };
    const error = new Error(`workspace not visible for ${slug}`);
    error.probe = probe;
    throw error;
  }
  return workspace;
}

async function probeMoving(browser) {
  const { context, page, probe } = await createProbe(browser, 'moving');
  try {
    const save = await savePublicFlow(page, probe, '/f/moving-d30-basic', {
      anchor: '2030-08-15',
      expandPreview: true,
    });
    check(probe, 'receipt_names_saved_scope', /24/.test(save.receiptText), true);
    let workspace = await enterSavedWorkspace(page, probe, 'moving-d30-basic');
    check(
      probe,
      'dedicated_workspace_marker',
      await workspace.getAttribute('data-p31-marker'),
      'P31-03-DEDICATED-MOBILE-WORKSPACE',
    );
    await screenshot(page, probe, 'workspace');

    await act(probe, 'open_plan_tab', () =>
      workspace.getByTestId('my-flow-workspace-tab-plan').click());
    const directAnchorEntry = workspace.getByTestId('my-flow-direct-anchor-settings-open');
    const personalSettingsEntry = workspace.getByTestId('my-flow-personal-copy-settings-open');
    const anchorEntry = await firstVisible(directAnchorEntry, personalSettingsEntry);
    check(probe, 'whole_anchor_adjustment_reachable', Boolean(anchorEntry), true);
    probe.anchorAdjustmentKind = anchorEntry === directAnchorEntry ? 'direct_anchor' : 'personal_copy';
    if (anchorEntry) {
      await act(probe, 'open_anchor_adjustment', () => anchorEntry.click());
      await act(probe, 'change_anchor_and_save', async () => {
        const personalForm = workspace.getByTestId('my-flow-personal-copy-settings');
        if (await isVisible(personalForm)) {
          await personalForm.getByTestId('my-flow-personal-copy-start-date-input').fill('2030-08-20');
          await personalForm.locator('button[type="submit"]').click();
          return;
        }
        const form = workspace.getByTestId('my-flow-direct-anchor-settings');
        await form.getByTestId('my-flow-direct-anchor-input').fill('2030-08-20');
        await form.getByRole('button', { name: '일정 다시 맞추기' }).click();
      });
    }

    const outline = workspace.getByTestId('my-flow-whole-flow-outline');
    const firstRow = outline.getByTestId('my-flow-execution-row-shell').first();
    await act(probe, 'open_first_item', async () => {
      const open = firstRow.getByRole('button', { name: /열기/ }).first();
      await open.click();
      await page.getByTestId('my-flow-item-detail-sheet').waitFor({ state: 'visible' });
    });
    const detail = page.getByTestId('my-flow-item-detail-sheet').getByTestId('my-flow-item-detail');
    const readSummary = detail.getByTestId('my-flow-detail-read-summary');
    if ((await readSummary.getAttribute('open').catch(() => null)) === null) {
      await act(probe, 'expand_item_read_summary', () => readSummary.locator('summary').click());
    }
    await act(probe, 'enter_item_edit', () =>
      readSummary.getByTestId('my-flow-detail-edit-toggle').click());
    check(probe, 'item_edit_mode', await detail.getAttribute('data-detail-mode'), 'edit');
    await act(probe, 'save_personal_item_values', async () => {
      const titleInput = detail.getByTestId('my-flow-detail-title-input');
      if (await isVisible(titleInput)) await titleInput.fill('개인 이사 방식 정하기');
      await detail.getByTestId('my-flow-detail-date-input').fill('2030-08-03');
      const memo = detail.getByTestId('my-flow-detail-memo');
      if (await isVisible(memo)) await memo.fill('오전 중 확인');
      await detail.getByTestId('my-flow-detail-save-changes').click();
    });
    await page.keyboard.press('Escape');

    workspace = page.locator(
      '[data-testid="my-flow-mobile-workspace"][data-flow-slug="moving-d30-basic"]',
    );
    await act(probe, 'open_record_tab', () =>
      workspace.getByTestId('my-flow-workspace-tab-record').click());
    const advanced = workspace.getByTestId('my-flow-workspace-advanced-actions');
    await act(probe, 'open_advanced_actions', () => advanced.locator('summary').click());
    const exportEntry = workspace.getByTestId('my-flow-export-entry');
    await act(probe, 'open_whole_export', () => exportEntry.click());
    const exportPanel = workspace.getByTestId('my-flow-export-panel');
    check(probe, 'whole_export_preflight_visible', await isVisible(exportPanel), true);
    probe.exportPreflight = {
      scope: await exportPanel.getAttribute('data-export-scope'),
      includedCount: await exportPanel.getAttribute('data-export-included-count'),
      summary: await text(exportPanel.getByTestId('my-flow-export-scope-summary')),
      calendarSummary: await text(exportPanel.getByTestId('my-flow-export-calendar-summary')),
    };
    await screenshot(page, probe, 'export');

    await page.goto(`${BASE_URL}/my?view=flows`, { waitUntil: 'networkidle' });
    const flowTab = page.getByTestId('my-flow-view-flow');
    if (await isVisible(flowTab)) await act(probe, 'archive_flow_tab', () => flowTab.click());
    const row = page.locator(
      '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="moving-d30-basic"]',
    );
    await act(probe, 'archive_open_workspace', () =>
      row.getByTestId('my-flow-mobile-structure-open').click());
    workspace = page.locator(
      '[data-testid="my-flow-mobile-workspace"][data-flow-slug="moving-d30-basic"]',
    );
    const menu = workspace.getByTestId('my-flow-workspace-management-menu');
    await act(probe, 'open_management_menu', () => menu.locator('summary').click());
    await act(probe, 'archive_flow', () => menu.getByTestId('my-flow-archive-toggle').click());
    check(
      probe,
      'archive_immediate_undo_visible',
      await isVisible(page.getByTestId('my-flow-lifecycle-undo')),
      true,
    );
    await page.reload({ waitUntil: 'networkidle' });
    const archivedFilter = page.getByTestId('my-flow-list-filter-archived');
    const archivedShortcut = page.getByTestId('my-flow-open-archived');
    if (await isVisible(archivedShortcut)) {
      await act(probe, 'open_archived_after_reload', () => archivedShortcut.click());
    } else {
      if (await isVisible(page.getByTestId('my-flow-view-flow'))) {
        await act(probe, 'restore_flow_tab', () => page.getByTestId('my-flow-view-flow').click());
      }
      await act(probe, 'open_archived_filter', () => archivedFilter.click());
    }
    const archivedRow = page.locator(
      '[data-testid="my-flow-mobile-archived-row"][data-flow-slug="moving-d30-basic"]',
    );
    check(probe, 'archived_row_persisted', await isVisible(archivedRow), true);
    await act(probe, 'restore_archived_flow', () =>
      archivedRow.getByTestId('my-flow-archived-direct-restore').click());
    check(probe, 'restored_row_visible', await isVisible(row), true);
    probe.depths = {
      saveToWorkspace: 5,
      itemEditFromMyFlow: 7,
      wholeExportFromMyFlow: 6,
      archiveReloadRestore: 6,
    };
  } finally {
    await context.close();
  }
  return probe;
}

async function probeVehicle(browser) {
  const { context, page, probe } = await createProbe(browser, 'vehicle');
  try {
    const save = await savePublicFlow(page, probe, '/f/vehicle-inspection-prep', {
      undated: true,
    });
    check(probe, 'undated_receipt_keeps_item_count', /10/.test(save.receiptText), true);
    let workspace = await enterSavedWorkspace(page, probe, 'vehicle-inspection-prep');
    check(probe, 'undated_workspace_visible', await isVisible(workspace), true);
    await act(probe, 'complete_one_undated_item', async () => {
      const control = workspace.getByTestId('my-flow-task-complete-control').first();
      await control.click();
    });
    check(
      probe,
      'completion_undo_visible',
      await isVisible(page.getByTestId('my-flow-completion-undo')),
      true,
    );
    if (await isVisible(page.getByTestId('my-flow-completion-undo'))) {
      await act(probe, 'undo_completion', () =>
        page.getByTestId('my-flow-completion-undo').click());
    }

    await go(page, probe, '/calendar');
    const tray = page.getByTestId('my-flow-calendar-unscheduled-tray');
    check(probe, 'calendar_undated_tray_visible', await isVisible(tray), true);
    await act(probe, 'open_undated_tray', () =>
      tray.getByTestId('my-flow-calendar-unscheduled-toggle').click());
    const sheet = page.getByTestId('my-flow-calendar-unscheduled-sheet');
    check(probe, 'undated_sheet_visible', await isVisible(sheet), true);
    await act(probe, 'select_undated_item', async () => {
      const item = sheet.getByTestId('my-flow-calendar-unscheduled-item').first();
      await item.locator('input[type="checkbox"]').check();
    });
    await act(probe, 'set_undated_target_date', () =>
      sheet.getByTestId('my-flow-calendar-unscheduled-date').fill('2030-08-10'));
    await act(probe, 'apply_calendar_placement', () =>
      sheet.getByTestId('my-flow-calendar-unscheduled-apply').click());
    check(
      probe,
      'calendar_placement_undo_visible',
      await isVisible(page.getByTestId('my-flow-calendar-unscheduled-undo-action')),
      true,
    );
    if (await isVisible(page.getByTestId('my-flow-calendar-unscheduled-undo-action'))) {
      await act(probe, 'undo_calendar_placement', () =>
        page.getByTestId('my-flow-calendar-unscheduled-undo-action').click());
    }
    await screenshot(page, probe, 'undated-calendar');

    await page.goto(`${BASE_URL}/my?view=flows`, { waitUntil: 'networkidle' });
    const flowTab = page.getByTestId('my-flow-view-flow');
    if (await isVisible(flowTab)) await flowTab.click();
    const row = page.locator(
      '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="vehicle-inspection-prep"]',
    );
    await row.getByTestId('my-flow-mobile-structure-open').click();
    workspace = page.locator(
      '[data-testid="my-flow-mobile-workspace"][data-flow-slug="vehicle-inspection-prep"]',
    );
    await workspace.getByTestId('my-flow-workspace-tab-record').click();
    await workspace.getByTestId('my-flow-workspace-advanced-actions').locator('summary').click();
    await workspace.getByTestId('my-flow-export-entry').click();
    const panel = workspace.getByTestId('my-flow-export-panel');
    probe.exportPreflight = {
      summary: await text(panel.getByTestId('my-flow-export-scope-summary')),
      eligibility: await text(panel.getByTestId('my-flow-export-eligibility-summary')),
      calendarSummary: await text(panel.getByTestId('my-flow-export-calendar-summary')),
    };
  } finally {
    await context.close();
  }
  return probe;
}

async function probeRoutine(browser) {
  const { context, page, probe } = await createProbe(browser, 'routine');
  try {
    await go(page, probe, '/f/curated-allblanc-morning-workout', { clearStorage: true });
    await act(probe, 'set_routine_start', () =>
      page.getByTestId('public-flow-anchor-input').fill('2030-08-15'));
    const summary = page.getByTestId('public-routine-schedule-summary');
    check(probe, 'compact_routine_summary_visible', await isVisible(summary), true);
    check(
      probe,
      'three_occurrence_preview',
      await summary.getByRole('listitem').count(),
      3,
    );
    await act(probe, 'open_routine_settings', () =>
      summary.getByTestId('public-routine-schedule-summary-toggle').click());
    const editor = summary.getByTestId('public-routine-schedule-editor');
    await act(probe, 'set_routine_count', async () => {
      await editor.getByTestId('public-routine-schedule-editor-end-mode').selectOption('count');
      await editor.getByTestId('public-routine-schedule-editor-occurrence-count').fill('8');
    });
    await act(probe, 'save_routine', async () => {
      await page.getByTestId('public-flow-save-primary-mobile').click();
      await page.getByTestId('public-flow-saved-receipt').waitFor({ state: 'visible' });
    });
    const workspace = await enterSavedWorkspace(
      page,
      probe,
      'curated-allblanc-morning-workout',
    );
    check(probe, 'routine_workspace_visible', await isVisible(workspace), true);
    const executionLevels = await workspace
      .locator('[data-execution-level]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-execution-level')));
    probe.executionLevels = Array.from(new Set(executionLevels));
    const control = workspace.getByTestId('my-flow-task-complete-control').first();
    if (await isVisible(control)) {
      await act(probe, 'complete_occurrence', () => control.click());
      check(
        probe,
        'routine_completion_undo',
        await isVisible(page.getByTestId('my-flow-completion-undo')),
        true,
      );
      if (await isVisible(page.getByTestId('my-flow-completion-undo'))) {
        await act(probe, 'reopen_occurrence_with_undo', () =>
          page.getByTestId('my-flow-completion-undo').click());
      }
    } else {
      check(probe, 'routine_occurrence_control_visible', false, true);
    }
    await act(probe, 'routine_record_tab', () =>
      workspace.getByTestId('my-flow-workspace-tab-record').click());
    await act(probe, 'routine_advanced_actions', () =>
      workspace.getByTestId('my-flow-workspace-advanced-actions').locator('summary').click());
    await act(probe, 'routine_export_open', () =>
      workspace.getByTestId('my-flow-export-entry').click());
    const panel = workspace.getByTestId('my-flow-export-panel');
    probe.exportPreflight = {
      summary: await text(panel.getByTestId('my-flow-export-scope-summary')),
      calendarSummary: await text(panel.getByTestId('my-flow-export-calendar-summary')),
    };
    await screenshot(page, probe, 'record-export');
  } finally {
    await context.close();
  }
  return probe;
}

async function probeArtifactAndMixed(browser) {
  const { context, page, probe } = await createProbe(browser, 'artifact-mixed');
  try {
    await go(page, probe, '/f/curated-wedding-naver-timeline', { clearStorage: true });
    const choices = page.getByTestId('flow-artifact-shape-choice');
    check(probe, 'wedding_artifact_choice_count', await choices.count(), 3);
    const preview = page.getByTestId('flow-artifact-data-preview');
    probe.artifactSelections = [];
    for (const shape of ['calendar', 'checklist', 'memo']) {
      const choice = preview.locator(
        `[data-testid="flow-artifact-shape-choice"][data-artifact-shape="${shape}"]`,
      );
      await act(probe, `choose_${shape}`, () => choice.click());
      probe.artifactSelections.push({
        shape,
        selectedShape: await preview.getAttribute('data-selected-shape'),
        rowCount: await preview.getByTestId('flow-artifact-preview-row').count(),
        setupVisible: await isVisible(page.getByTestId('public-flow-primary-setup')),
        saveLabel: await text(page.getByTestId('public-flow-save-primary-mobile')),
      });
    }
    await screenshot(page, probe, 'wedding-artifacts');
    const closedStatus = await go(page, probe, '/f/real-mofa-overseas-travel-prep');
    check(probe, 'handoff_mixed_route_is_open', closedStatus, 200);
    const replacementStatus = await go(page, probe, '/f/overseas-safety-register');
    check(probe, 'replacement_mixed_route_is_open', replacementStatus, 200);
    check(
      probe,
      'replacement_is_memo_first',
      await page.getByTestId('flow-artifact-data-preview').getAttribute('data-selected-shape'),
      'memo',
    );
    probe.routeReconciliation = {
      requestedRouteStatus: closedStatus,
      replacementRouteStatus: replacementStatus,
    };
  } finally {
    await context.close();
  }
  return probe;
}

async function probeDraft(browser) {
  const { context, page, probe } = await createProbe(browser, 'personal-draft');
  try {
    await go(page, probe, '/flows', { clearStorage: true });
    const memo =
      '8월 제주 여행 준비. 항공권 확인, 숙소 예약번호 정리, 렌터카 예약, 준비물 체크, 출발 전날 온라인 체크인';
    await act(probe, 'submit_personal_memo', async () => {
      await page.getByTestId('flow-url-lookup-input').fill(memo);
      await page.getByTestId('flow-url-lookup-entry').getByRole('button', { name: 'Flow 찾기' }).click();
      await page.getByTestId('flow-memo-draft-editor').waitFor({ state: 'visible' });
    });
    const suggestions = page.getByTestId('flow-memo-draft-item');
    probe.suggestionCount = await suggestions.count();
    check(probe, 'memo_split_into_multiple_items', probe.suggestionCount >= 4, true);
    await act(probe, 'save_personal_draft', async () => {
      await page.getByTestId('flow-memo-draft-save').click();
      await page.waitForURL(/\/my/);
    });
    const savedKey = await page.evaluate(
      () => Object.keys(window.localStorage).find((key) => key.startsWith('flow:saved:url-draft-')) || '',
    );
    const slug = savedKey.replace('flow:saved:', '');
    check(probe, 'draft_stable_slug_created', Boolean(slug), true);
    let workspace = await enterSavedWorkspace(page, probe, slug);
    await act(probe, 'draft_plan_tab', () =>
      workspace.getByTestId('my-flow-workspace-tab-plan').click());
    const structureMode = workspace.getByTestId('my-flow-batch-mode-toggle').first();
    await act(probe, 'enter_draft_structure_mode', () => structureMode.click());
    const controls = workspace.getByTestId('personal-draft-structural-controls');
    check(probe, 'draft_structural_controls_visible', await isVisible(controls), true);
    await act(probe, 'add_draft_item', async () => {
      await controls.getByTestId('personal-draft-add-entry').click();
      await controls.getByTestId('personal-draft-add-title').fill('여행자 보험 확인');
      await controls.getByTestId('personal-draft-add-save').click();
    });
    const outline = workspace.getByTestId('my-flow-whole-flow-outline');
    const effectiveBeforeDelete = await outline.getByTestId('my-flow-batch-selectable-row').count();
    const firstEffective = outline.getByTestId('my-flow-batch-selectable-row').first();
    await act(probe, 'select_draft_item', () =>
      firstEffective.getByTestId('my-flow-batch-item-checkbox').check());
    page.once('dialog', (dialog) => void dialog.accept());
    await act(probe, 'delete_draft_item', () =>
      outline
        .getByTestId('my-flow-batch-toolbar')
        .getByTestId('my-flow-batch-remove-selected')
        .click());
    const undo = outline.getByTestId('my-flow-batch-undo-action');
    check(probe, 'draft_delete_undo_visible', await isVisible(undo), true);
    if (await isVisible(undo)) await act(probe, 'undo_draft_delete', () => undo.click());
    const effectiveAfterUndo = await outline.getByTestId('my-flow-batch-selectable-row').count();
    check(probe, 'draft_item_count_restored', effectiveAfterUndo, effectiveBeforeDelete);
    await screenshot(page, probe, 'structure');

    await page.reload({ waitUntil: 'networkidle' });
    workspace = await enterSavedWorkspace(page, probe, slug);
    check(probe, 'draft_persists_after_reload', await isVisible(workspace), true);
    probe.draftCounts = {
      suggestions: probe.suggestionCount,
      effectiveBeforeDelete,
      effectiveAfterUndo,
    };
  } finally {
    await context.close();
  }
  return probe;
}

async function probeCompletedAndKeyboard(browser) {
  const { context, page, probe } = await createProbe(browser, 'completed-keyboard');
  try {
    await savePublicFlow(page, probe, '/f/curated-allblanc-morning-workout', {
      anchor: '2030-08-15',
    });
    let workspace = await enterSavedWorkspace(
      page,
      probe,
      'curated-allblanc-morning-workout',
    );
    const control = workspace.getByTestId('my-flow-task-complete-control').first();
    if (await isVisible(control)) {
      await act(probe, 'complete_short_flow', () => control.click());
      if (await isVisible(page.getByTestId('my-flow-completion-undo'))) {
        await act(probe, 'immediate_undo', () =>
          page.getByTestId('my-flow-completion-undo').click());
        await act(probe, 'complete_short_flow_again', () => control.click());
      }
    }
    const recordTab = workspace.getByTestId('my-flow-workspace-tab-record');
    await act(probe, 'open_completed_record', () => recordTab.click());
    check(
      probe,
      'reuse_action_after_completion',
      await isVisible(workspace.getByTestId('my-flow-reuse-open')),
      true,
    );
    if (await isVisible(workspace.getByTestId('my-flow-reuse-open'))) {
      await act(probe, 'open_reuse_preview', () =>
        workspace.getByTestId('my-flow-reuse-open').click());
      check(
        probe,
        'reuse_preview_preserves_previous_run',
        /그대로 보관/.test(await text(workspace.getByTestId('my-flow-reuse-preview'))),
        true,
      );
      await act(probe, 'cancel_reuse', () =>
        workspace.getByTestId('my-flow-reuse-cancel').click());
    }

    await go(page, probe, '/calendar?demo=ux12');
    await page.getByTestId('my-flow-month-picker').fill('2026-05');
    const event = page.locator('.fc-event').first();
    const eventDate = await event.evaluate((node) =>
      node.closest('.fc-daygrid-day')?.getAttribute('data-date') || '');
    await act(probe, 'select_calendar_event_date', () =>
      page
        .locator(`.fc-daygrid-day[data-date="${eventDate}"]`)
        .getByTestId('my-flow-calendar-date-button')
        .click());
    const agendaOpen = page
      .getByTestId('my-flow-calendar-selected-day')
      .getByRole('button', { name: /열기/ })
      .first();
    await act(probe, 'open_calendar_item_sheet', () => agendaOpen.click());
    const sheet = page.getByTestId('my-flow-item-detail-sheet');
    check(probe, 'calendar_sheet_visible', await isVisible(sheet), true);
    const triggerName = await agendaOpen.getAttribute('aria-label').catch(() => '');
    await page.keyboard.press('Escape');
    check(probe, 'calendar_sheet_escape_closes', await sheet.count(), 0);
    check(probe, 'calendar_focus_returns', await agendaOpen.evaluate((node) => node === document.activeElement), true);
    probe.focusReturnTrigger = triggerName;

    const a11y = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const focusables = Array.from(
        document.querySelectorAll(
          'a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])',
        ),
      ).filter(visible);
      const name = (element) =>
        (
          element.getAttribute('aria-label') ||
          element.getAttribute('title') ||
          element.getAttribute('placeholder') ||
          element.textContent ||
          ''
        ).replace(/\s+/g, ' ').trim();
      return {
        focusableCount: focusables.length,
        unnamedFocusableCount: focusables.filter((element) => !name(element)).length,
        overflowPx: Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      };
    });
    probe.accessibility = a11y;
    check(probe, 'no_unnamed_focusable', a11y.unnamedFocusableCount, 0);
    check(probe, 'no_horizontal_overflow', a11y.overflowPx, 0);
    await screenshot(page, probe, 'calendar-focus');
  } finally {
    await context.close();
  }
  return probe;
}

async function run() {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const probes = [];
  const startedAt = new Date().toISOString();
  try {
    const runners = [
      probeMoving,
      probeVehicle,
      probeRoutine,
      probeArtifactAndMixed,
      probeDraft,
      probeCompletedAndKeyboard,
    ];
    const only = process.env.FLOWME_PROBE_ONLY;
    for (const runner of runners.filter((candidate) => !only || candidate.name === only)) {
      process.stdout.write(`probe:start:${runner.name}\n`);
      try {
        const result = await runner(browser);
        probes.push(result);
        process.stdout.write(`probe:done:${result.id}:${result.status}\n`);
      } catch (error) {
        const failedProbe = error?.probe || {
          id: runner.name,
          evidenceKind: 'current_browser_automation',
        };
        failedProbe.status = 'failed';
        failedProbe.error = clean(error?.stack || error);
        probes.push(failedProbe);
        process.stdout.write(`probe:failed:${runner.name}\n`);
      }
    }
  } finally {
    await browser.close();
  }
  const result = {
    schemaVersion: 1,
    reviewerRole: 'codex_independent',
    baseUrl: BASE_URL,
    startedAt,
    completedAt: new Date().toISOString(),
    observedUserCount: 0,
    probes,
  };
  const output = path.join(OUTPUT_DIR, 'current-journey-probes.json');
  await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(
    `${JSON.stringify({
      output,
      probes: probes.map((probe) => ({
        id: probe.id,
        status: probe.status,
        failedAssertions: probe.assertions?.filter((item) => !item.pass).length || 0,
        failedActions: probe.actions?.filter((item) => item.ok === false).length || 0,
        consoleErrors:
          (probe.consoleErrors?.length || 0) + (probe.pageErrors?.length || 0),
      })),
    })}\n`,
  );
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
