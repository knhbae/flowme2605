import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';
import { seedBundles } from '../../lib/flow/seed-flows';
import type { FlowBundle } from '../../lib/flow/types';

import { openMyFlowLibraryFlow } from './helpers/my-flow-library';

const SOURCE_FLOW_SLUG = 'moving-d30-basic';
const SOURCE_ROUTE = `/f/${SOURCE_FLOW_SLUG}`;
const LEGACY_ITEM_STORAGE_KEY = `flow_builder_mvp_item_state_${SOURCE_FLOW_SLUG}`;
const SAVED_FLOW_STORAGE_KEY = `flow:saved:${SOURCE_FLOW_SLUG}`;
const BUNDLES_STORAGE_KEY = 'flow_builder_mvp_bundles_v11';
const FIFTY_ITEM_FLOW_SLUG = 'personal-copy:p1-04-fifty-items';
const FIFTY_ITEM_FLOW_ID = 'flow-p1-04-fifty-items';
const FIFTY_ITEM_SECTION_ID = 'section-p1-04-fifty-items';
const FIRST_SOURCE_ITEM_TITLE = '원본 이사 준비 항목';
const FIRST_SOURCE_ITEM_DETAIL = '원본에 포함된 짧은 참고 내용';
const LONG_ITEM_TITLE = '이사 전 계약서·사진·열쇠·계량기 기록을 가족과 함께 마지막으로 아주 길게 확인하기 😀';
const LONG_ITEM_MEMO = [
  '첫째 줄: 계약서의 "특약"과 사진 #1을 확인합니다. 😀',
  '둘째 줄:\t탭 뒤의 값과 쉼표, 세미콜론; 역슬래시 \\ 를 그대로 둡니다.',
  '셋째 줄: <완료>라고 적기 전까지 원문과 개인 기록을 분리합니다.',
].join('\n');
const LONG_COMPLETION_CRITERION = [
  `계약서·사진·열쇠 3종을 대조하고 가족 확인을 받았습니다 — ${'가'.repeat(96)}`,
  '둘째 줄: [필수] #1 & #2, 탭\t유지, 따옴표 "완료", emoji 😀',
].join('\n');
const PRESERVED_LOCAL_STORAGE_KEYS = [
  LEGACY_ITEM_STORAGE_KEY,
  'flow:p1-04:malformed',
  'flow:p1-04:sentinel',
] as const;
const PRESERVED_SESSION_STORAGE_KEYS = ['flow:p1-04:session-sentinel'] as const;
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const REFLOW_200_VIEWPORT = { width: 720, height: 500 } as const;
const EVIDENCE_DIR = path.join(
  process.cwd(),
  'docs',
  'specs',
  '2026-08-04-p35-round2-bounded-ux-correction',
  'evidence',
  'p1-04',
  'screenshots',
);

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

type P104TestWindow = Window & {
  __p104ClipboardText?: string;
  __p104ClipboardWrites?: number;
  __p104StorageWrites?: Array<{
    operation: 'setItem' | 'removeItem' | 'clear';
    area: 'localStorage' | 'sessionStorage' | 'unknown';
    key?: string;
  }>;
};

type RawStorageSnapshot = Readonly<{
  local: Readonly<Record<string, string>>;
  session: Readonly<Record<string, string>>;
}>;

function buildFiftyItemBundle(): FlowBundle {
  const source = seedBundles.find((bundle) => bundle.flow.slug === SOURCE_FLOW_SLUG);
  if (!source || source.items.length === 0) {
    throw new Error(`Missing ${SOURCE_FLOW_SLUG} seed fixture.`);
  }

  const items = Array.from({ length: 50 }, (_, index) => {
    const sourceItem = source.items[index % source.items.length]!;
    return {
      ...sourceItem,
      id: `${FIFTY_ITEM_FLOW_SLUG}-item-${String(index + 1).padStart(2, '0')}`,
      flow_id: FIFTY_ITEM_FLOW_ID,
      section_id: FIFTY_ITEM_SECTION_ID,
      title: index === 0 ? FIRST_SOURCE_ITEM_TITLE : `${String(index + 1).padStart(2, '0')}번째 실제 저장 할 일`,
      description: index === 0 ? FIRST_SOURCE_ITEM_DETAIL : `${index + 1}번째 저장·재열기 확인 항목`,
      type: 'todo' as const,
      order: index,
      day_offset: undefined,
      duration_days: undefined,
      date_window: undefined,
      repeat_rule: undefined,
    };
  });

  const itemDetails = items.map((item, index) => {
    const sourceItem = source.items[index % source.items.length]!;
    const sourceDetail = source.itemDetails?.find((detail) => detail.item_id === sourceItem.id);
    return {
      ...sourceDetail,
      item_id: item.id,
      why: index === 0 ? FIRST_SOURCE_ITEM_DETAIL : sourceDetail?.why,
      how: index === 0 ? FIRST_SOURCE_ITEM_DETAIL : sourceDetail?.how,
      completion_criteria: index === 0
        ? LONG_COMPLETION_CRITERION
        : sourceDetail?.completion_criteria ?? `${index + 1}번째 항목을 확인했습니다.`,
    };
  });

  return {
    ...source,
    flow: {
      ...source.flow,
      id: FIFTY_ITEM_FLOW_ID,
      slug: FIFTY_ITEM_FLOW_SLUG,
      title: '실제 저장·재열기용 50개 할 일 계획',
      description: 'DOM 복제가 아닌 저장 데이터 50개로 projection과 artifact를 확인합니다.',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'draft',
      primary_destination: 'internal_check',
      source_status: 'real',
      source_precision: 'exact',
      updated_at: '2031-08-05T00:00:00.000Z',
    },
    sections: [{
      id: FIFTY_ITEM_SECTION_ID,
      flow_id: FIFTY_ITEM_FLOW_ID,
      title: '실제 저장 항목 50개',
      description: 'P1-04 final internal gate fixture',
      order: 0,
    }],
    items,
    itemDetails,
    repeatRules: [],
  };
}

async function rawStorageSnapshot(page: Page): Promise<RawStorageSnapshot> {
  return page.evaluate(() => {
    const read = (storage: Storage): Record<string, string> => Object.fromEntries(
      Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => Boolean(key))
        .sort()
        .map((key) => [key, storage.getItem(key) ?? ''] as const),
    );
    return {
      local: read(window.localStorage),
      session: read(window.sessionStorage),
    };
  });
}

async function installStorageWriteCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as P104TestWindow;
    const nativeSetItem = Storage.prototype.setItem;
    const nativeRemoveItem = Storage.prototype.removeItem;
    const nativeClear = Storage.prototype.clear;
    target.__p104StorageWrites = [];
    const area = (storage: Storage) => {
      if (storage === window.localStorage) return 'localStorage' as const;
      if (storage === window.sessionStorage) return 'sessionStorage' as const;
      return 'unknown' as const;
    };
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      target.__p104StorageWrites?.push({
        operation: 'setItem',
        area: area(this),
        key,
      });
      return nativeSetItem.call(this, key, value);
    };
    Storage.prototype.removeItem = function removeItem(key: string) {
      target.__p104StorageWrites?.push({
        operation: 'removeItem',
        area: area(this),
        key,
      });
      return nativeRemoveItem.call(this, key);
    };
    Storage.prototype.clear = function clear() {
      target.__p104StorageWrites?.push({ operation: 'clear', area: area(this) });
      return nativeClear.call(this);
    };
  });
}

async function storageWrites(page: Page) {
  return page.evaluate(() => (window as P104TestWindow).__p104StorageWrites ?? []);
}

async function resetStorageWrites(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as P104TestWindow).__p104StorageWrites = [];
  });
}

async function seedFiftyItemSavedPlan(page: Page): Promise<void> {
  const bundle = buildFiftyItemBundle();
  await page.goto('/my');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await expect(page.getByTestId('my-flow-saved-library-shell')).toBeVisible();
  await page.evaluate(({ bundlesStorageKey, customBundle, flowSlug, sourceFlowSlug }) => {
    const bundles = JSON.parse(window.localStorage.getItem(bundlesStorageKey) || '[]') as FlowBundle[];
    window.localStorage.setItem(
      bundlesStorageKey,
      JSON.stringify([...bundles.filter((entry) => entry.flow.slug !== flowSlug), customBundle]),
    );
    window.localStorage.setItem(`flow:saved:${flowSlug}`, JSON.stringify({
      schemaVersion: 2,
      slug: flowSlug,
      personalCopyKey: flowSlug,
      sourceFlowKey: flowSlug,
      sourceFlowSlug,
      sourceVersion: 'p1-04-fifty-v1',
      lastSaveRequestId: 'p1-04-fifty-save-request',
      savedAt: '2031-08-05T00:00:00.000Z',
      savedItemCount: 50,
      selectedArtifactMode: 'checklist',
      dateIntent: 'undated',
    }));
  }, {
    bundlesStorageKey: BUNDLES_STORAGE_KEY,
    customBundle: bundle,
    flowSlug: FIFTY_ITEM_FLOW_SLUG,
    sourceFlowSlug: SOURCE_FLOW_SLUG,
  });
  await page.goto(`/my?flow=${FIFTY_ITEM_FLOW_SLUG}`);
}

async function installClipboardCapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as P104TestWindow;
    target.__p104ClipboardText = '';
    target.__p104ClipboardWrites = 0;
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          target.__p104ClipboardWrites = (target.__p104ClipboardWrites ?? 0) + 1;
          target.__p104ClipboardText = value;
        },
        readText: async () => target.__p104ClipboardText ?? '',
      },
    });
  });
}

async function openSavedChecklistTransfer(page: Page, workspace: Locator): Promise<Locator> {
  await workspace.getByTestId('my-flow-export-entry').click();
  const panel = workspace.getByTestId('my-flow-export-panel');
  await expect(panel).toBeVisible();
  const checklist = panel.getByTestId('my-flow-export-checklist');
  if (!(await checklist.isVisible().catch(() => false))) {
    const more = panel.getByTestId('my-flow-export-more-formats');
    if ((await more.getAttribute('open')) === null) await more.locator(':scope > summary').click();
  }
  await checklist.click();
  const confirmation = panel.getByTestId('my-flow-transfer-confirmation');
  await expect(confirmation).toBeVisible();
  return confirmation;
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

async function preservedStorageSnapshot(
  page: Page,
  localKeys: readonly string[] = PRESERVED_LOCAL_STORAGE_KEYS,
) {
  return page.evaluate(({ trackedLocalKeys, trackedSessionKeys }) => {
    return {
      local: Object.fromEntries(
        trackedLocalKeys.map((key) => [key, window.localStorage.getItem(key)]),
      ),
      session: Object.fromEntries(
        trackedSessionKeys.map((key) => [key, window.sessionStorage.getItem(key)]),
      ),
    };
  }, {
    trackedLocalKeys: [...localKeys],
    trackedSessionKeys: [...PRESERVED_SESSION_STORAGE_KEYS],
  });
}

async function inspectVisiblePageQuality(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const target = element as HTMLElement;
      const style = window.getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    };
    const controls = Array.from(document.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
    )).filter(visible);
    const unnamed = controls.filter((element) => {
      const labels = 'labels' in element && element.labels
        ? Array.from(element.labels as NodeListOf<HTMLLabelElement>)
        : [];
      return [
        element.getAttribute('aria-label'),
        element.getAttribute('aria-labelledby'),
        element.getAttribute('title'),
        labels.map((label) => label.textContent?.trim() ?? '').join(' '),
        element.textContent?.trim(),
      ].filter(Boolean).join(' ').trim().length === 0;
    });
    const clipped = controls.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left < -1 || rect.right > window.innerWidth + 1;
    });
    const ids = Array.from(document.querySelectorAll<HTMLElement>('[id]'))
      .map((element) => element.id)
      .filter(Boolean);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const brokenRelations = Array.from(document.querySelectorAll<HTMLElement>(
      '[aria-labelledby], [aria-describedby], [aria-controls]',
    )).filter(visible).flatMap((element) => (
      ['aria-labelledby', 'aria-describedby', 'aria-controls'].flatMap((attribute) => (
        (element.getAttribute(attribute) ?? '')
          .split(/\s+/u)
          .filter(Boolean)
          // FlowContextDisclosure intentionally lazy-mounts its controlled
          // dialog while collapsed. The IDREF must resolve once expanded.
          .filter(() => attribute !== 'aria-controls' || element.getAttribute('aria-expanded') !== 'false')
          .filter((id) => !document.getElementById(id))
          .map((id) => `${attribute}:${id}`)
      ))
    ));
    return {
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      unnamedInteractiveCount: unnamed.length,
      horizontallyClippedInteractiveCount: clipped.length,
      duplicateIds: Array.from(new Set(duplicateIds)).sort(),
      brokenRelations: Array.from(new Set(brokenRelations)).sort(),
      replacementCharacterCount: (document.body.innerText.match(/�/gu) ?? []).length,
    };
  });
}

async function expectCleanVisiblePage(page: Page): Promise<void> {
  expect(await inspectVisiblePageQuality(page)).toEqual({
    horizontalOverflow: 0,
    unnamedInteractiveCount: 0,
    horizontallyClippedInteractiveCount: 0,
    duplicateIds: [],
    brokenRelations: [],
    replacementCharacterCount: 0,
  });
}

async function capture(page: Page, filename: string): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => (
      requestAnimationFrame(() => resolve())
    )));
  });
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, filename),
    animations: 'disabled',
    fullPage: false,
  });
}

async function visibleFocusable(dialog: Locator): Promise<Locator> {
  const selector = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  const focusable = dialog.locator(selector).filter({ visible: true });
  expect(await focusable.count()).toBeGreaterThan(1);
  return focusable;
}

test.describe('P35 P1-04 final internal extremes and accessibility gate', () => {
  test('20 saved plans remain operable at 390px and at the 200% reflow equivalent', async ({ page }) => {
    const errors = collectBrowserErrors(page);

    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/my?demo=ux20');
    const mobileShell = page.getByTestId('my-flow-saved-library-shell');
    await expect(mobileShell).toHaveAttribute('data-library-count', '20');
    await expect(mobileShell).toHaveAttribute('data-library-size-state', 'searchable');
    await expect(mobileShell.getByTestId('my-flow-search')).toBeVisible();
    const more = mobileShell.getByTestId('my-flow-mobile-inventory-open');
    if (await more.isVisible().catch(() => false)) await more.click();
    await expect(mobileShell.getByTestId('my-flow-mobile-structure-row')).toHaveCount(20);
    await expectCleanVisiblePage(page);
    await capture(page, '01-twenty-plan-library-390x844.png');

    await page.setViewportSize(REFLOW_200_VIEWPORT);
    await page.goto('/my?demo=ux20');
    const reflowShell = page.getByTestId('my-flow-saved-library-shell');
    await expect(reflowShell).toHaveAttribute('data-library-count', '20');
    await expect(reflowShell.getByTestId('my-flow-search')).toBeVisible();
    await expectCleanVisiblePage(page);
    await capture(page, '02-twenty-plan-library-200pct-reflow-720x500.png');

    expect(errors).toEqual([]);
  });

  test('nested editor traps keyboard focus, resolves ARIA relations, returns focus, and honors reduced motion', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(SOURCE_ROUTE);
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();

    const planOpener = page.getByTestId('public-flow-adjust-entry-mobile');
    await planOpener.focus();
    await page.keyboard.press('Enter');
    const planEditor = page.getByTestId('public-flow-personal-adjustment');
    await expect(planEditor).toBeVisible();
    await expect(planEditor).toHaveAttribute('role', 'dialog');
    await expect(planEditor).toHaveAttribute('aria-modal', 'true');
    const planFocusable = await visibleFocusable(planEditor);
    await planFocusable.first().focus();
    await page.keyboard.press('Shift+Tab');
    expect(await planEditor.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
    await planFocusable.last().focus();
    await page.keyboard.press('Tab');
    expect(await planEditor.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);

    const itemKind = planEditor.getByTestId('public-flow-adjustment-kind-items');
    await itemKind.focus();
    await page.keyboard.press('Enter');
    const itemOpener = planEditor.getByTestId('public-flow-adjustment-item-edit').first();
    await itemOpener.focus();
    await page.keyboard.press('Enter');

    const itemEditor = page.getByTestId('public-flow-item-editor');
    await expect(itemEditor).toBeVisible();
    await expect(itemEditor).toHaveAttribute('role', 'dialog');
    await expect(itemEditor).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('[role="dialog"]:visible')).toHaveCount(1);

    const focusable = await visibleFocusable(itemEditor);
    await focusable.first().focus();
    await page.keyboard.press('Shift+Tab');
    expect(await itemEditor.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
    await focusable.last().focus();
    await page.keyboard.press('Tab');
    expect(await itemEditor.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);

    const reducedMotion = await itemEditor.evaluate((dialog) => {
      const parseDuration = (value: string) => value.split(',').map((entry) => {
        const normalized = entry.trim();
        if (normalized.endsWith('ms')) return Number.parseFloat(normalized) / 1000;
        if (normalized.endsWith('s')) return Number.parseFloat(normalized);
        return 0;
      });
      const values = [dialog, ...Array.from(dialog.querySelectorAll<HTMLElement>('*'))]
        .filter((element) => element.getClientRects().length > 0)
        .flatMap((element) => {
          const style = window.getComputedStyle(element);
          return [
            ...parseDuration(style.transitionDuration),
            ...parseDuration(style.animationDuration),
          ];
        });
      return {
        mediaMatches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        maxDurationSeconds: Math.max(0, ...values),
      };
    });
    expect(reducedMotion.mediaMatches).toBe(true);
    expect(reducedMotion.maxDurationSeconds).toBeLessThanOrEqual(0.001);
    await expectCleanVisiblePage(page);
    await capture(page, '03-nested-item-editor-reduced-motion-390x844.png');

    await page.keyboard.press('Escape');
    await expect(itemEditor).toHaveCount(0);
    await expect(itemOpener).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(planEditor).toHaveCount(0);
    await expect(planOpener).toBeFocused();
    expect(errors).toEqual([]);
  });

  test('real 50-Item saved data keeps IDs through edit and reload and creates one 50-item artifact at 390px', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = collectBrowserErrors(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await seedFiftyItemSavedPlan(page);

    let workspace = await openMyFlowLibraryFlow(page, FIFTY_ITEM_FLOW_SLUG, 'plan');
    await expect(workspace).toHaveAttribute('data-effective-result-count', '50');
    const planOpener = workspace.locator('[data-testid="my-flow-batch-mode-toggle"]:visible').first();
    await expect(planOpener).toBeVisible();
    await planOpener.click();

    let planEditor = page.getByTestId('saved-flow-editor-plan');
    await expect(planEditor).toBeVisible();
    const itemList = planEditor.getByTestId('saved-flow-editor-item-list');
    const initialRows = planEditor.getByTestId('saved-flow-editor-item-row');
    await expect(initialRows).toHaveCount(50);
    const initialIds = await initialRows.evaluateAll((rows) => rows.map((row) => (
      row.getAttribute('data-item-id') ?? ''
    )));
    expect(initialIds).toHaveLength(50);
    expect(new Set(initialIds).size).toBe(50);

    await itemList.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    const lastInitialRow = initialRows.last();
    await lastInitialRow.scrollIntoViewIfNeeded();
    const planGeometry = await page.evaluate(() => {
      const editor = document.querySelector<HTMLElement>('[data-testid="saved-flow-editor-plan"]');
      const list = document.querySelector<HTMLElement>('[data-testid="saved-flow-editor-item-list"]');
      const lastRow = list?.querySelector<HTMLElement>('[data-testid="saved-flow-editor-item-row"]:last-child');
      const footer = document.querySelector<HTMLElement>(
        '[data-testid="saved-flow-editor-plan"] [data-editor-actions-sticky="true"]',
      );
      const body = footer?.previousElementSibling instanceof HTMLElement
        ? footer.previousElementSibling
        : null;
      if (!editor || !body || !list || !lastRow || !footer) return null;
      const editorRect = editor.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      const lastRowRect = lastRow.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      return {
        editorTop: editorRect.top,
        bodyTop: bodyRect.top,
        bodyBottom: bodyRect.bottom,
        listBottom: listRect.bottom,
        lastRowTop: lastRowRect.top,
        lastRowBottom: lastRowRect.bottom,
        footerTop: footerRect.top,
        footerBottom: footerRect.bottom,
        viewportHeight: window.innerHeight,
        bodyOverflowY: getComputedStyle(body).overflowY,
      };
    });
    expect(planGeometry).not.toBeNull();
    expect(planGeometry!.bodyOverflowY).toBe('auto');
    expect(planGeometry!.bodyTop).toBeGreaterThanOrEqual(planGeometry!.editorTop);
    expect(planGeometry!.bodyBottom).toBeLessThanOrEqual(planGeometry!.footerTop + 1);
    expect(planGeometry!.lastRowTop).toBeGreaterThanOrEqual(planGeometry!.bodyTop - 1);
    expect(planGeometry!.lastRowBottom).toBeLessThanOrEqual(
      Math.min(planGeometry!.listBottom, planGeometry!.bodyBottom, planGeometry!.footerTop) + 1,
    );
    expect(planGeometry!.footerBottom).toBeLessThanOrEqual(planGeometry!.viewportHeight + 1);

    await itemList.evaluate((element) => { element.scrollTop = 0; });
    await initialRows.first().getByTestId('saved-flow-editor-item-open').click();
    let itemEditor = page.getByTestId('saved-flow-editor-item');
    await expect(itemEditor).toBeVisible();
    await itemEditor.getByTestId('saved-flow-editor-item-title-input').fill(LONG_ITEM_TITLE);
    await itemEditor.getByTestId('saved-flow-editor-item-detail-input').fill(LONG_ITEM_MEMO);
    await expect(itemEditor.getByTestId('saved-flow-editor-item-title-input')).toHaveValue(LONG_ITEM_TITLE);
    await expect(itemEditor.getByTestId('saved-flow-editor-item-detail-input')).toHaveValue(LONG_ITEM_MEMO);
    const criterion = itemEditor.locator('[data-editor-field="item-completion-criterion"]');
    await expect(criterion).toContainText(LONG_COMPLETION_CRITERION);
    await criterion.scrollIntoViewIfNeeded();
    const itemGeometry = await page.evaluate(() => {
      const editor = document.querySelector<HTMLElement>('[data-testid="saved-flow-editor-item"]');
      const completion = document.querySelector<HTMLElement>(
        '[data-testid="saved-flow-editor-item"] [data-editor-field="item-completion-criterion"]',
      );
      const footer = document.querySelector<HTMLElement>(
        '[data-testid="saved-flow-editor-item"] [data-editor-actions-sticky="true"]',
      );
      const body = footer?.previousElementSibling instanceof HTMLElement
        ? footer.previousElementSibling
        : null;
      if (!editor || !body || !completion || !footer) return null;
      const editorRect = editor.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const completionRect = completion.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      return {
        editorTop: editorRect.top,
        bodyTop: bodyRect.top,
        bodyBottom: bodyRect.bottom,
        completionTop: completionRect.top,
        completionBottom: completionRect.bottom,
        footerTop: footerRect.top,
        footerBottom: footerRect.bottom,
        viewportHeight: window.innerHeight,
        bodyOverflowY: getComputedStyle(body).overflowY,
      };
    });
    expect(itemGeometry).not.toBeNull();
    expect(itemGeometry!.bodyOverflowY).toBe('auto');
    expect(itemGeometry!.bodyTop).toBeGreaterThanOrEqual(itemGeometry!.editorTop);
    expect(itemGeometry!.bodyBottom).toBeLessThanOrEqual(itemGeometry!.footerTop + 1);
    expect(itemGeometry!.completionTop).toBeGreaterThanOrEqual(itemGeometry!.bodyTop - 1);
    expect(itemGeometry!.completionBottom).toBeLessThanOrEqual(
      Math.min(itemGeometry!.bodyBottom, itemGeometry!.footerTop) + 1,
    );
    expect(itemGeometry!.footerBottom).toBeLessThanOrEqual(itemGeometry!.viewportHeight + 1);
    await expectCleanVisiblePage(page);
    await capture(page, '05-real-fifty-item-long-editor-390x844.png');

    await itemEditor.getByTestId('my-flow-detail-save-changes').click();
    await expect(itemEditor).toHaveCount(0);
    await planEditor.getByTestId('saved-flow-editor-save').click();
    await expect(planEditor).toHaveCount(0);

    await page.reload();
    workspace = await openMyFlowLibraryFlow(page, FIFTY_ITEM_FLOW_SLUG, 'plan');
    await expect(workspace).toHaveAttribute('data-effective-result-count', '50');
    await workspace.locator('[data-testid="my-flow-batch-mode-toggle"]:visible').first().click();
    planEditor = page.getByTestId('saved-flow-editor-plan');
    const reloadedRows = planEditor.getByTestId('saved-flow-editor-item-row');
    await expect(reloadedRows).toHaveCount(50);
    const reloadedIds = await reloadedRows.evaluateAll((rows) => rows.map((row) => (
      row.getAttribute('data-item-id') ?? ''
    )));
    expect(reloadedIds).toEqual(initialIds);
    await reloadedRows.first().getByTestId('saved-flow-editor-item-open').click();
    itemEditor = page.getByTestId('saved-flow-editor-item');
    await expect(itemEditor.getByTestId('saved-flow-editor-item-title-input')).toHaveValue(LONG_ITEM_TITLE);
    await expect(itemEditor.getByTestId('saved-flow-editor-item-detail-input')).toHaveValue(LONG_ITEM_MEMO);
    await expect(itemEditor.locator('[data-editor-field="item-completion-criterion"]')).toContainText(
      LONG_COMPLETION_CRITERION,
    );
    await itemEditor.getByRole('button', { name: '닫기', exact: true }).click();
    await planEditor.getByRole('button', { name: '닫기', exact: true }).click();

    workspace = await openMyFlowLibraryFlow(page, FIFTY_ITEM_FLOW_SLUG, 'record');
    await installClipboardCapture(page);
    const confirmation = await openSavedChecklistTransfer(page, workspace);
    await expect(confirmation).toHaveAttribute('data-transfer-item-count', '50');
    await expect(confirmation).toHaveAttribute('data-transfer-projection-output-count', '50');
    await expect(confirmation).toHaveAttribute('data-transfer-output-count', '50');
    const artifactIds = (await confirmation.getAttribute('data-item-ids'))?.split(',').filter(Boolean) ?? [];
    expect(artifactIds).toEqual(initialIds);
    await expectCleanVisiblePage(page);
    await capture(page, '06-real-fifty-item-transfer-390x844.png');
    await confirmation.getByTestId('my-flow-transfer-confirm').click();
    const clipboard = await page.evaluate(() => ({
      text: (window as P104TestWindow).__p104ClipboardText ?? '',
      writes: (window as P104TestWindow).__p104ClipboardWrites ?? 0,
    }));
    expect(clipboard.writes).toBe(1);
    expect(clipboard.text.match(/^- \[[ x]\]/gmu) ?? []).toHaveLength(50);
    expect(clipboard.text).toContain(LONG_ITEM_TITLE);
    expect(clipboard.text).toContain('첫째 줄: 계약서의 "특약"과 사진 #1을 확인합니다. 😀');
    expect(clipboard.text).toContain('둘째 줄:\t탭 뒤의 값');
    expect(clipboard.text).toContain('둘째 줄: [필수] #1 & #2, 탭\t유지, 따옴표 "완료", emoji 😀');
    await expectCleanVisiblePage(page);
    expect(errors).toEqual([]);
  });

  test('source-backed, missing-base, and malformed saved records fail safe without changing any storage byte', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/my');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();
    await expect(page.getByTestId('my-flow-saved-library-shell')).toBeVisible();

    const records = {
      sourceBacked: {
        key: 'flow:saved:source-backed-moving-d30',
        raw: '{"slug":"source-backed-moving-d30","savedAt":"2031-08-05T00:00:00.000Z","selectedArtifactMode":"calendar","dateIntent":"undated"}',
      },
      missingBase: {
        key: 'flow:saved:p1-04-missing-base',
        raw: '{"slug":"p1-04-missing-base","savedAt":"2031-08-05T00:00:00.000Z","selectedArtifactMode":"checklist","dateIntent":"undated"}',
      },
      malformed: {
        key: 'flow:saved:p1-04-malformed',
        raw: '{not-json',
      },
    } as const;
    await page.evaluate(({ fixtures }) => {
      for (const fixture of Object.values(fixtures)) {
        window.localStorage.setItem(fixture.key, fixture.raw);
      }
      window.localStorage.setItem('flow:p1-04:legacy-matrix-sentinel', '  local exact bytes  ');
      window.sessionStorage.setItem('flow:p1-04:legacy-matrix-session', '  session exact bytes  ');
    }, { fixtures: records });
    const before = await rawStorageSnapshot(page);

    await page.goto('/my?flow=source-backed-moving-d30');
    await expect(page.getByTestId('my-flow-saved-library-shell')).toBeVisible();
    await expect(page.locator(
      '[data-flow-slug="source-backed-moving-d30"]:visible',
    ).first()).toBeVisible();
    expect(await rawStorageSnapshot(page)).toEqual(before);

    for (const flowSlug of ['p1-04-missing-base', 'p1-04-malformed']) {
      await page.goto(`/my?flow=${flowSlug}`);
      await expect(page.getByTestId('my-flow-saved-library-shell')).toBeVisible();
      await expect(page.locator(`[data-flow-slug="${flowSlug}"]`)).toHaveCount(0);
      await expect(page.locator('main').first()).toBeVisible();
      await expectCleanVisiblePage(page);
      expect(await rawStorageSnapshot(page), `${flowSlug} storage drift`).toEqual(before);
    }
    await capture(page, '07-legacy-read-only-fail-safe-390x844.png');
    expect(errors).toEqual([]);
  });

  test('public first render is storage read-only while an explicit legacy edit still persists', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await installStorageWriteCapture(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/flows');
    await page.evaluate(({ legacyItemStorageKey }) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem(
        legacyItemStorageKey,
        '{  "legacy-item" : { "note" : "keep exact bytes", "custom" : "sentinel" } }',
      );
      window.localStorage.setItem(
        'flow:moving-d30-basic:anchorDate',
        ' { "mode" : "custom", "anchor" : "2031-09-08" } ',
      );
      window.localStorage.setItem('flow:p1-04:sentinel', '  byte-for-byte sentinel  ');
      window.sessionStorage.setItem('flow:p1-04:session-sentinel', '  session byte sentinel  ');
    }, { legacyItemStorageKey: LEGACY_ITEM_STORAGE_KEY });
    const before = await rawStorageSnapshot(page);

    await page.goto(SOURCE_ROUTE);
    await expect(page.locator('main').first()).toHaveAttribute('data-p35-p004-save-lifecycle', 'on');
    expect(await storageWrites(page)).toEqual([]);
    expect(await rawStorageSnapshot(page)).toEqual(before);

    const publicExactOff = [
      'saveLifecycle=off',
      'editorTransaction=off',
      'capabilityResult=off',
      'quickLocalResult=off',
      'visualSubtraction=off',
      'q3Copy=off',
    ].join('&');
    await page.goto(`${SOURCE_ROUTE}?${publicExactOff}`);
    const publicOff = page.locator('main').first();
    await expect(publicOff).toHaveAttribute('data-p35-p004-save-lifecycle', 'off');
    await expect(publicOff).toHaveAttribute('data-p35-p007-capability-result', 'off');
    await expect(publicOff).toHaveAttribute('data-p35-q1-quick-local', 'off');
    await expect(publicOff).toHaveAttribute('data-p35-q3-copy', 'off');
    expect(await storageWrites(page)).toEqual([]);
    expect(await rawStorageSnapshot(page)).toEqual(before);

    const publicUppercase = publicExactOff.replaceAll('=off', '=OFF');
    await page.goto(`${SOURCE_ROUTE}?${publicUppercase}`);
    const publicOn = page.locator('main').first();
    await expect(publicOn).toHaveAttribute('data-p35-p004-save-lifecycle', 'on');
    await expect(publicOn).toHaveAttribute('data-p35-p007-capability-result', 'on');
    await expect(publicOn).toHaveAttribute('data-p35-q1-quick-local', 'on');
    await expect(publicOn).toHaveAttribute('data-p35-q3-copy', 'on');
    expect(await storageWrites(page)).toEqual([]);
    expect(await rawStorageSnapshot(page)).toEqual(before);

    await page.goto(`${SOURCE_ROUTE}?${publicExactOff}`);
    expect(await storageWrites(page)).toEqual([]);
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const editor = page.getByTestId('public-flow-personal-adjustment');
    await expect(editor).toBeVisible();
    await editor.getByTestId('public-flow-adjustment-kind-items').click();
    const firstRow = editor.getByTestId('public-flow-adjustment-item-row').first();
    const changedItemId = await firstRow.getAttribute('data-item-id');
    expect(changedItemId).toBeTruthy();
    const included = firstRow.getByRole('checkbox');
    await expect(included).toBeChecked();
    await resetStorageWrites(page);
    await included.uncheck();
    await editor.getByTestId('public-flow-adjustment-apply').click();
    await expect(editor).toHaveCount(0);

    await expect.poll(async () => page.evaluate(
      ({ storageKey, itemId }) => {
        const stored = JSON.parse(window.localStorage.getItem(storageKey) || '{}') as Record<
          string,
          { personalExcluded?: boolean; custom?: string }
        >;
        return {
          changedItemExcluded: stored[itemId]?.personalExcluded === true,
          legacySentinel: stored['legacy-item']?.custom,
        };
      },
      { storageKey: LEGACY_ITEM_STORAGE_KEY, itemId: changedItemId! },
    )).toEqual({ changedItemExcluded: true, legacySentinel: 'sentinel' });
    const explicitEditWrites = await storageWrites(page);
    expect(explicitEditWrites.map((write) => `${write.operation}:${write.area}:${write.key ?? ''}`)).toEqual([
      `setItem:localStorage:${LEGACY_ITEM_STORAGE_KEY}`,
      'setItem:localStorage:flow:meta:last-visit',
    ]);
    expect(explicitEditWrites.some((write) => write.key === BUNDLES_STORAGE_KEY)).toBe(false);

    await page.reload();
    expect(await storageWrites(page)).toEqual([]);
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const reloadedEditor = page.getByTestId('public-flow-personal-adjustment');
    await reloadedEditor.getByTestId('public-flow-adjustment-kind-items').click();
    await expect(
      reloadedEditor.locator(
        `[data-testid="public-flow-adjustment-item-row"][data-item-id="${changedItemId}"]`,
      ).getByRole('checkbox'),
    ).not.toBeChecked();
    await reloadedEditor.getByTestId('public-flow-adjustment-cancel').click();
    await expect(reloadedEditor).toHaveCount(0);

    await resetStorageWrites(page);
    const publicAnchor = page.locator('[data-testid="public-flow-anchor-input"]:visible').first();
    await expect(publicAnchor).toHaveValue('2031-09-08');
    await publicAnchor.fill('2031-09-10');
    await expect.poll(() => page.evaluate(() => (
      window.localStorage.getItem('flow:moving-d30-basic:anchorDate')
    ))).toBe('{"mode":"custom","anchor":"2031-09-10"}');
    expect((await storageWrites(page)).map(
      (write) => `${write.operation}:${write.area}:${write.key ?? ''}`,
    )).toEqual([
      'setItem:localStorage:flow:moving-d30-basic:anchorDate',
      'setItem:localStorage:flow:meta:last-visit',
    ]);
    expect(errors).toEqual([]);
  });

  test('all exact-off and uppercase controls keep eight rollback flags and raw storage byte-identical', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(SOURCE_ROUTE);
    await page.evaluate(({ legacyItemStorageKey }) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem(
        legacyItemStorageKey,
        '{"legacy-item":{"note":"keep exact bytes","custom":"sentinel"}}',
      );
      window.localStorage.setItem('flow:p1-04:malformed', '{broken-json');
      window.localStorage.setItem('flow:p1-04:sentinel', '  byte-for-byte sentinel  ');
      window.sessionStorage.setItem('flow:p1-04:session-sentinel', '  session byte sentinel  ');
    }, { legacyItemStorageKey: LEGACY_ITEM_STORAGE_KEY });
    await page.reload();
    await expect(page.locator('main').first()).toBeVisible();
    const beforePublic = await preservedStorageSnapshot(page);

    const publicExactOff = [
      'saveLifecycle=off',
      'editorTransaction=off',
      'capabilityResult=off',
      'quickLocalResult=off',
      'visualSubtraction=off',
      'q3Copy=off',
    ].join('&');
    await page.goto(`${SOURCE_ROUTE}?${publicExactOff}`);
    const publicOff = page.locator('main').first();
    await expect(publicOff).toHaveAttribute('data-p35-p004-save-lifecycle', 'off');
    await expect(publicOff).toHaveAttribute('data-p35-p007-capability-result', 'off');
    await expect(publicOff).toHaveAttribute('data-p35-q1-quick-local', 'off');
    await expect(publicOff).toHaveAttribute('data-p35-q3-copy', 'off');
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    await expect(page.getByTestId('public-flow-personal-adjustment')).toHaveAttribute(
      'data-editor-adapter',
      'legacy',
    );
    expect(await preservedStorageSnapshot(page)).toEqual(beforePublic);
    await capture(page, '04-all-exact-off-public-390x844.png');

    const publicUppercase = publicExactOff.replaceAll('=off', '=OFF');
    await page.goto(`${SOURCE_ROUTE}?${publicUppercase}`);
    const publicOn = page.locator('main').first();
    await expect(publicOn).toHaveAttribute('data-p35-p004-save-lifecycle', 'on');
    await expect(publicOn).toHaveAttribute('data-p35-p007-capability-result', 'on');
    await expect(publicOn).toHaveAttribute('data-p35-q1-quick-local', 'on');
    await expect(publicOn).toHaveAttribute('data-p35-q3-copy', 'on');
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    await expect(page.getByTestId('public-flow-personal-adjustment')).toHaveAttribute(
      'data-editor-adapter',
      'shared',
    );
    expect(await preservedStorageSnapshot(page)).toEqual(beforePublic);

    await page.evaluate(({ savedFlowStorageKey, flowSlug }) => {
      window.localStorage.setItem(savedFlowStorageKey, JSON.stringify({
        slug: flowSlug,
        savedAt: '2026-05-28T00:00:00.000Z',
        selectedArtifactMode: 'checklist',
        dateIntent: 'none',
      }));
    }, {
      savedFlowStorageKey: SAVED_FLOW_STORAGE_KEY,
      flowSlug: SOURCE_FLOW_SLUG,
    });
    await page.goto(`/my?flow=${SOURCE_FLOW_SLUG}`);
    await expect(page.locator('main').first()).toHaveAttribute('data-saved-library-flag', 'on');
    const myPreservedLocalKeys = [...PRESERVED_LOCAL_STORAGE_KEYS, SAVED_FLOW_STORAGE_KEY];
    const beforeMy = await preservedStorageSnapshot(page, myPreservedLocalKeys);

    const myExactOff = [
      'editorTransaction=off',
      'savedTransfer=off',
      'savedPlanLibrary=off',
      'visualSubtraction=off',
      'q3Copy=off',
    ].join('&');
    await page.goto(`/my?flow=${SOURCE_FLOW_SLUG}&${myExactOff}`);
    const myOff = page.locator('main').first();
    await expect(myOff).toHaveAttribute('data-saved-library-flag', 'off');
    await expect(myOff).toHaveAttribute('data-p35-q1-saved-transfer', 'off');
    await expect(myOff).toHaveAttribute('data-p35-q3-copy', 'off');
    expect(await preservedStorageSnapshot(page, myPreservedLocalKeys)).toEqual(beforeMy);

    const myUppercase = myExactOff.replaceAll('=off', '=OFF');
    await page.goto(`/my?flow=${SOURCE_FLOW_SLUG}&${myUppercase}`);
    const myOn = page.getByTestId('my-flow-saved-library-shell');
    await expect(myOn).toHaveAttribute('data-saved-library-flag', 'on');
    await expect(myOn).toHaveAttribute('data-p35-q1-saved-transfer', 'on');
    await expect(myOn).toHaveAttribute('data-p35-q3-copy', 'on');
    expect(await preservedStorageSnapshot(page, myPreservedLocalKeys)).toEqual(beforeMy);
    expect(errors).toEqual([]);
  });
});
