import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const WORKSPACE_URL = '/my?personalWorkspacePoc=v1';
const AUTHORING_URL = '/flows/new?personalWorkspacePoc=v1';
const POC_PREFIX = 'flow:poc:personal-workspace:v1:';
const POC_STATE_KEY = `${POC_PREFIX}state`;
const POC_RECOVERY_KEY = `${POC_PREFIX}editor-storage-recovery:v1`;
const FIXED_CLOCK = '2026-09-10T09:00:00+09:00';
const OPERATING_SENTINEL = '  stage-3 operating bytes \r\n 그대로 보존 🙂  ';
const AUTHORED_SOURCE = [
  '# Stage 3 작성 Flow',
  '- 기준일: 2026-09-10',
  '',
  '## 준비',
  '- [ ] 작성 결과 검증',
  '  - 날짜: 2026-09-10',
].join('\n');
const EDITED_PLAN_TITLE = 'Stage 3 개인 Flow 제목 🙂';
const EDITED_ITEM_TITLE = 'Stage 3 개인 Item 제목';
const EDITED_ITEM_MEMO = '첫 줄\n둘째 줄';
const EDITED_ITEM_DATE = '2026-09-12';
const VIEWPORTS = [
  { label: '320x700', width: 320, height: 700 },
  { label: '375x812', width: 375, height: 812 },
  { label: '390x844', width: 390, height: 844 },
  { label: '844x390', width: 844, height: 390 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '1440x900', width: 1440, height: 900 },
] as const;

const SAVED_ORIGINS = [
  'source-backed-map',
  'personal-draft',
  'canonical-personal-copy',
  'legacy-saved-plan',
] as const;

type StorageMutation = Readonly<{
  sequence: number;
  method: 'setItem' | 'removeItem' | 'clear';
  key?: string;
  before?: string | null;
  value?: string;
  outcome: 'success' | 'throw';
}>;

type RuntimePocState = Readonly<{
  revision: number;
  quickItems: readonly Readonly<{
    quickItemId: string;
    title: string;
    memo: string;
    status: 'open' | 'completed';
  }>[];
  placements: Readonly<Record<string, Readonly<{
    scheduleMode: string;
    date?: string;
  }>>>;
  completions: Readonly<Record<string, Readonly<{ status: 'open' | 'completed' }>>>;
  authoredFlows?: readonly Readonly<{
    ref: string;
    origin: 'authoring-handoff';
    title: string;
    authoring: Readonly<{ rawText: string }>;
  }>[];
  personalPlanOverlays?: Readonly<Record<string, Readonly<{
    flowRef: string;
    title?: string;
    orderedItemRefs?: readonly string[];
    items: Readonly<Record<string, Readonly<{
      title?: string;
      memo?: string;
      schedule?: Readonly<{ mode: string; date?: string }>;
    }>>>;
  }>>>;
}>;

type ResultItemMetadata = Readonly<{
  ref: string;
  effectiveDate: string;
  completed: string;
  planOrder: string;
}>;

async function installStage3FixtureAndAudit(page: Page): Promise<void> {
  await page.addInitScript(({ pocStateKey, operatingSentinel }) => {
    const nativeSetItem = Storage.prototype.setItem;
    const nativeRemoveItem = Storage.prototype.removeItem;
    const nativeClear = Storage.prototype.clear;
    const savedAt = '2026-09-02T00:00:00.000Z';
    const anchor = '2026-09-10';
    const makeBundle = (
      slug: string,
      flowId: string,
      title: string,
      options: Readonly<{
        status?: 'draft' | 'published';
        sourceUrl: string;
        dayOffsets?: readonly number[];
      }>,
    ) => ({
      flow: {
        id: flowId,
        slug,
        title,
        category: 'Stage 3 통합 검증',
        structure_type: 'timeline',
        anchor_type: 'start_date',
        status: options.status ?? 'published',
        source_url: options.sourceUrl,
        created_at: savedAt,
        updated_at: savedAt,
        ...(options.status === 'draft'
          ? { source_title: `${title} 원문`, tags: ['개인 초안'] }
          : {}),
      },
      sections: [{ id: `${flowId}-section`, flow_id: flowId, title: '준비', order: 0 }],
      items: (options.dayOffsets ?? [0, 0, 1]).map((dayOffset, index) => ({
        id: `${slug}-item-${index + 1}`,
        flow_id: flowId,
        section_id: `${flowId}-section`,
        title: `${title} 실행 ${index + 1}`,
        description: `${title} 원본 설명 ${index + 1}`,
        type: 'calendar',
        day_offset: dayOffset,
        order: index,
      })),
    });
    const savedRecord = (slug: string, personalTitle?: string) => ({
      slug,
      savedAt,
      selectedArtifactMode: 'calendar',
      dateIntent: 'custom',
      anchor,
      ...(personalTitle ? { personalTitle } : {}),
    });
    const bundles = [
      makeBundle('stage3-map', 'flow:stage3-map', 'Stage 3 지도 Flow', {
        sourceUrl: 'https://www.example.com/stage-3/map?source=fixture',
      }),
      makeBundle('url-draft-stage3', 'flow:url-draft-stage3', 'Stage 3 개인 초안 Flow', {
        status: 'draft',
        sourceUrl: 'https://www.example.com/stage-3/draft?source=fixture',
      }),
      makeBundle('stage3-copy-source', 'flow:stage3-copy-source', 'Stage 3 개인 사본 Flow', {
        sourceUrl: 'https://www.example.com/stage-3/copy?source=fixture',
        dayOffsets: [0, 0, 1, 2, 3, 4, 5, 6],
      }),
      makeBundle('stage3-legacy', 'flow:stage3-legacy', 'Stage 3 기존 저장 Flow', {
        sourceUrl: 'https://www.example.com/stage-3/legacy?source=fixture',
      }),
    ];
    const fixtures: Array<[string, string]> = [
      ['flow_builder_mvp_bundles_v11', JSON.stringify(bundles)],
      ['flow:operational:stage-3-sentinel', operatingSentinel],
      ['flow:map:saved:stage3-map', JSON.stringify({
        mapId: 'stage3-map',
        title: 'Stage 3 지도',
        version: 'v1',
        savedAt,
        anchor,
        flowSlugs: ['stage3-map'],
      })],
      ['flow:saved:stage3-map', JSON.stringify(savedRecord('stage3-map'))],
      ['flow:saved:url-draft-stage3', JSON.stringify(savedRecord('url-draft-stage3'))],
      ['flow:saved:copy:stage3', JSON.stringify({
        schemaVersion: 2,
        slug: 'copy:stage3',
        savedAt,
        personalCopyKey: 'copy:stage3',
        sourceFlowKey: 'flow:stage3-copy-source',
        sourceFlowSlug: 'stage3-copy-source',
        sourceVersion: 'source-v1',
        lastSaveRequestId: 'request:copy:stage3',
        savedItemCount: 8,
        selectedArtifactMode: 'calendar',
        dateIntent: 'custom',
        anchor,
      })],
      ['flow:saved:stage3-legacy', JSON.stringify(
        savedRecord('stage3-legacy', 'Stage 3 기존 저장 개인 제목'),
      )],
    ];
    for (const [key, value] of fixtures) {
      nativeSetItem.call(window.localStorage, key, value);
    }

    type MutableMutation = {
      sequence: number;
      method: 'setItem' | 'removeItem' | 'clear';
      key?: string;
      before?: string | null;
      value?: string;
      outcome: 'success' | 'throw';
    };
    type AuditWindow = Window & typeof globalThis & {
      __personalWorkspaceStage3StorageAudit: {
        mutations: MutableMutation[];
        failNextStateWrite: boolean;
        reset: () => void;
        seedRaw: (key: string, value: string | null) => void;
      };
    };
    const auditWindow = window as AuditWindow;
    let sequence = 0;
    const mutations: MutableMutation[] = [];
    auditWindow.__personalWorkspaceStage3StorageAudit = {
      mutations,
      failNextStateWrite: false,
      reset: () => mutations.splice(0, mutations.length),
      seedRaw: (key, value) => {
        if (value === null) nativeRemoveItem.call(window.localStorage, key);
        else nativeSetItem.call(window.localStorage, key, value);
      },
    };

    Storage.prototype.setItem = function auditedSetItem(key: string, value: string) {
      if (this !== window.localStorage) return nativeSetItem.call(this, key, value);
      const mutation: MutableMutation = {
        sequence: sequence += 1,
        method: 'setItem',
        key,
        before: window.localStorage.getItem(key),
        value,
        outcome: 'success',
      };
      if (
        auditWindow.__personalWorkspaceStage3StorageAudit.failNextStateWrite
        && key === pocStateKey
      ) {
        auditWindow.__personalWorkspaceStage3StorageAudit.failNextStateWrite = false;
        mutation.outcome = 'throw';
        mutations.push(mutation);
        throw new DOMException('simulated stage-3 quota failure', 'QuotaExceededError');
      }
      try {
        nativeSetItem.call(this, key, value);
        mutations.push(mutation);
      } catch (error) {
        mutation.outcome = 'throw';
        mutations.push(mutation);
        throw error;
      }
    };
    Storage.prototype.removeItem = function auditedRemoveItem(key: string) {
      if (this !== window.localStorage) return nativeRemoveItem.call(this, key);
      const mutation: MutableMutation = {
        sequence: sequence += 1,
        method: 'removeItem',
        key,
        before: window.localStorage.getItem(key),
        outcome: 'success',
      };
      try {
        nativeRemoveItem.call(this, key);
        mutations.push(mutation);
      } catch (error) {
        mutation.outcome = 'throw';
        mutations.push(mutation);
        throw error;
      }
    };
    Storage.prototype.clear = function auditedClear() {
      if (this !== window.localStorage) return nativeClear.call(this);
      const mutation: MutableMutation = {
        sequence: sequence += 1,
        method: 'clear',
        outcome: 'success',
      };
      try {
        nativeClear.call(this);
        mutations.push(mutation);
      } catch (error) {
        mutation.outcome = 'throw';
        mutations.push(mutation);
        throw error;
      }
    };
  }, { pocStateKey: POC_STATE_KEY, operatingSentinel: OPERATING_SENTINEL });
}

async function readStorageMutations(page: Page): Promise<StorageMutation[]> {
  return page.evaluate(() => (
    window as Window & typeof globalThis & {
      __personalWorkspaceStage3StorageAudit?: { mutations: StorageMutation[] };
    }
  ).__personalWorkspaceStage3StorageAudit?.mutations ?? []);
}

async function resetStorageMutations(page: Page): Promise<void> {
  await page.evaluate(() => (
    window as Window & typeof globalThis & {
      __personalWorkspaceStage3StorageAudit: { reset: () => void };
    }
  ).__personalWorkspaceStage3StorageAudit.reset());
}

async function failNextStateWrite(page: Page): Promise<void> {
  await page.evaluate(() => {
    (
      window as Window & typeof globalThis & {
        __personalWorkspaceStage3StorageAudit: { failNextStateWrite: boolean };
      }
    ).__personalWorkspaceStage3StorageAudit.failNextStateWrite = true;
  });
}

async function seedRawStorage(
  page: Page,
  key: string,
  value: string | null,
): Promise<void> {
  await page.evaluate(({ storageKey, rawValue }) => (
    window as Window & typeof globalThis & {
      __personalWorkspaceStage3StorageAudit: {
        seedRaw: (targetKey: string, targetValue: string | null) => void;
      };
    }
  ).__personalWorkspaceStage3StorageAudit.seedRaw(storageKey, rawValue), {
    storageKey: key,
    rawValue: value,
  });
}

async function readStorageSnapshot(
  page: Page,
  include: (key: string) => boolean,
): Promise<Record<string, string>> {
  const keys = await page.evaluate(() => Array.from(
    { length: window.localStorage.length },
    (_, index) => window.localStorage.key(index),
  ).filter((key): key is string => Boolean(key)).sort());
  const selected = keys.filter(include);
  return page.evaluate((storageKeys) => Object.fromEntries(storageKeys.map((key) => [
    key,
    window.localStorage.getItem(key) ?? '',
  ])), selected);
}

async function readOperatingStorage(page: Page): Promise<Record<string, string>> {
  return readStorageSnapshot(page, (key) => !key.startsWith(POC_PREFIX));
}

async function readPocState(page: Page): Promise<RuntimePocState | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw) as RuntimePocState;
  }, POC_STATE_KEY);
}

async function readRawStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((storageKey) => window.localStorage.getItem(storageKey), key);
}

async function initializeAuditedPage(
  page: Page,
  viewport: Readonly<{ width: number; height: number }>,
): Promise<void> {
  await page.clock.install({ time: new Date(FIXED_CLOCK) });
  await installStage3FixtureAndAudit(page);
  await page.setViewportSize(viewport);
}

async function bootWorkspace(
  page: Page,
  viewport: Readonly<{ width: number; height: number }> = { width: 390, height: 844 },
): Promise<void> {
  await initializeAuditedPage(page, viewport);
  await page.goto(WORKSPACE_URL);
  await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
}

async function newAuditedPage(
  browser: Browser,
  viewport: Readonly<{ width: number; height: number }>,
): Promise<Page> {
  const page = await browser.newPage({ viewport });
  await initializeAuditedPage(page, viewport);
  return page;
}

async function createAuthoringHandoff(page: Page): Promise<Readonly<{
  flowRef: string;
  rawText: string;
}>> {
  await page.goto(AUTHORING_URL);
  await expect(page.getByTestId('personal-workspace-authoring-shell')).toBeVisible();
  await page.getByTestId('personal-workspace-entry-input').fill(AUTHORED_SOURCE);
  await page.getByTestId('personal-workspace-entry-start-authoring').click();
  await expect(page.getByTestId('personal-workspace-live-editor-textarea'))
    .toHaveValue(AUTHORED_SOURCE);
  const resultTab = page.getByTestId('personal-workspace-authoring-tab-result');
  if (await resultTab.isVisible()) await resultTab.click();
  await page.getByTestId('personal-workspace-authoring-save').click();
  await expect(page.getByTestId('personal-workspace-authoring-status'))
    .toHaveAttribute('data-status', 'success');
  const authored = (await readPocState(page))?.authoredFlows?.at(-1);
  expect(authored?.origin).toBe('authoring-handoff');
  expect(authored?.authoring.rawText).toBe(AUTHORED_SOURCE);
  return { flowRef: authored?.ref ?? '', rawText: authored?.authoring.rawText ?? '' };
}

async function openFlowByOrigin(
  page: Page,
  origin: (typeof SAVED_ORIGINS)[number] | 'authoring-handoff',
): Promise<Readonly<{ flowRef: string; opener: Locator }>> {
  const card = page.locator(
    `[data-testid="personal-workspace-flow-card"][data-origin="${origin}"]`,
  );
  await expect(card).toHaveCount(1);
  const opener = card.locator('[data-personal-workspace-flow-open-trigger]');
  const encodedRef = await opener.getAttribute('data-personal-workspace-flow-open-trigger');
  expect(encodedRef).toBeTruthy();
  const flowRef = decodeURIComponent(encodedRef ?? '');
  await opener.click();
  await expect(page.getByTestId('personal-workspace-flow-detail')).toBeVisible();
  return { flowRef, opener };
}

async function openAlternateResultsByKeyboard(page: Page): Promise<Locator> {
  const details = page.getByTestId('personal-workspace-alternate-results');
  const summary = details.locator('summary');
  await expect(details).toHaveJSProperty('open', false);
  await summary.focus();
  await expect(summary).toBeFocused();
  await summary.press('Enter');
  await expect(details).toHaveJSProperty('open', true);
  const result = page.getByTestId('personal-workspace-result-surface');
  await expect(result).toBeVisible();
  return result;
}

async function openPlanEditor(page: Page): Promise<Locator> {
  await page.getByTestId('my-plan-edit').click();
  const editor = page.getByTestId('personal-workspace-plan-editor');
  await expect(editor).toBeVisible();
  return editor;
}

async function openPlanItemEditor(
  page: Page,
  row: Locator = page.getByTestId('personal-workspace-plan-item-row').first(),
): Promise<Readonly<{ editor: Locator; itemRef: string; opener: Locator }>> {
  const opener = row.getByTestId('personal-workspace-plan-item-open');
  const itemRef = await row.getAttribute('data-item-ref');
  expect(itemRef).toBeTruthy();
  await opener.click();
  const editor = page.getByTestId('personal-workspace-item-editor');
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute('data-item-ref', itemRef ?? '');
  return { editor, itemRef: itemRef ?? '', opener };
}

async function changePlanItemDraft(page: Page): Promise<void> {
  await page.getByTestId('personal-workspace-item-title-mode').selectOption('override');
  await page.getByTestId('personal-workspace-item-title-input').fill(EDITED_ITEM_TITLE);
  await page.getByTestId('personal-workspace-item-memo-mode').selectOption('override');
  await page.getByTestId('personal-workspace-item-memo').fill(EDITED_ITEM_MEMO);
  await page.getByTestId('personal-workspace-item-schedule-mode').selectOption('fixed_date');
  await page.getByTestId('personal-workspace-item-schedule-date').fill(EDITED_ITEM_DATE);
}

async function applyItemDraftToPlan(page: Page): Promise<void> {
  await page.getByTestId('personal-workspace-poc-item-editor-commit').click();
  await expect(page.getByTestId('personal-workspace-item-editor')).toHaveCount(0);
  await expect(page.getByTestId('personal-workspace-plan-editor')).toBeVisible();
}

async function changePlanTitle(page: Page, title = EDITED_PLAN_TITLE): Promise<void> {
  await page.getByTestId('personal-workspace-plan-title-mode').selectOption('override');
  await page.getByTestId('personal-workspace-plan-title').fill(title);
}

async function readEditorSignature(editor: Locator): Promise<Readonly<{
  schema: string | null;
  persistence: string | null;
  sections: readonly string[];
  sourceControlCount: number;
}>> {
  return {
    schema: await editor.getAttribute('data-editor-schema-fields'),
    persistence: await editor.getAttribute('data-editor-persistence-scope'),
    sections: await editor.locator('[data-personal-plan-section]').evaluateAll((elements) => (
      elements.map((element) => element.getAttribute('data-personal-plan-section') ?? '')
    )),
    sourceControlCount: await editor.locator(
      '[data-personal-plan-section="source"] input, '
      + '[data-personal-plan-section="source"] textarea, '
      + '[data-personal-plan-section="source"] select',
    ).count(),
  };
}

async function readResultManifest(page: Page): Promise<readonly string[]> {
  const raw = await page.getByTestId('personal-workspace-result-surface')
    .getAttribute('data-result-item-refs');
  return JSON.parse(raw ?? '[]') as readonly string[];
}

async function readVisibleResultMetadata(page: Page): Promise<readonly ResultItemMetadata[]> {
  const values = await page.getByTestId('personal-workspace-result-item-row')
    .evaluateAll((rows) => rows.map((row) => ({
      ref: row.getAttribute('data-item-ref') ?? '',
      effectiveDate: row.getAttribute('data-effective-date') ?? '',
      completed: row.getAttribute('data-completed') ?? '',
      planOrder: row.getAttribute('data-plan-order') ?? '',
    })));
  return values.sort((left, right) => left.ref.localeCompare(right.ref));
}

function successfulStateWrites(
  mutations: readonly StorageMutation[],
): readonly StorageMutation[] {
  return mutations.filter((mutation) => (
    mutation.method === 'setItem'
    && mutation.key === POC_STATE_KEY
    && mutation.outcome === 'success'
  ));
}

async function expectNoOwnedHorizontalOverflow(page: Page): Promise<void> {
  await expectNoPageOverflow(page);
  const overflows = await page.locator(
    '[data-flow-editor-surface="true"], [data-testid="personal-workspace-result-surface"]',
  ).evaluateAll((elements) => elements.flatMap((element) => (
    element.scrollWidth <= element.clientWidth + 1
      ? []
      : [{
          testId: element.getAttribute('data-testid'),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        }]
  )));
  expect(overflows).toEqual([]);
}

function mutationCursor(mutations: readonly StorageMutation[]): number {
  return mutations.length;
}

function mutationsAfter(
  mutations: readonly StorageMutation[],
  cursor: number,
): readonly StorageMutation[] {
  return mutations.slice(cursor);
}

async function assertOperatingBoundary(
  page: Page,
  before: Record<string, string>,
): Promise<void> {
  expect(await readOperatingStorage(page)).toEqual(before);
  const mutations = await readStorageMutations(page);
  expect(mutations.filter((mutation) => mutation.method === 'clear')).toEqual([]);
  expect(mutations.filter((mutation) => (
    mutation.method !== 'clear' && !mutation.key?.startsWith(POC_PREFIX)
  ))).toEqual([]);
  expect(await page.evaluate(() => (
    window.localStorage.getItem('flow:operational:stage-3-sentinel')
  ))).toBe(OPERATING_SENTINEL);
}

async function expectReachableAction(action: Locator): Promise<void> {
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeVisible();
  await expect(action).toBeEnabled();
  const geometry = await action.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return {
      height: rect.height,
      inside: rect.left >= 0
        && rect.top >= 0
        && rect.right <= window.innerWidth
        && rect.bottom <= window.innerHeight,
      hit: hit === element || element.contains(hit),
    };
  });
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.inside).toBe(true);
  expect(geometry.hit).toBe(true);
}

async function expectNoPageOverflow(page: Page): Promise<void> {
  expect(await page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true);
}

// These helpers are intentionally retained before the Stage 3 UI lands. They
// are page-independent and let the later editor/result scenarios count exact
// target writes, inject one recoverable failure, and seed malformed PoC bytes
// without weakening the operating-data audit.
void resetStorageMutations;
void failNextStateWrite;
void seedRawStorage;
void mutationCursor;
void mutationsAfter;
void expectReachableAction;
void expectNoPageOverflow;

/*
 * Stage 3 activation plan (do not turn these into executable locators before
 * PersonalWorkspacePocSurface wires the corresponding product surfaces):
 *
 *  1. Open every saved origin and one Stage 2 authoring handoff through the
 *     same plan -> item editor grammar. Assert identical section order,
 *     read-only source fields, clean close focus/scroll restoration, write 0.
 *  2. Edit one item's title/memo/plan date. Applying to its parent plan must
 *     leave raw storage untouched. Reorder items and change the plan title,
 *     then commit once: one successful POC_STATE_KEY setItem, one target write
 *     in the receipt, and no second intent from a double click.
 *  3. Exercise dirty Cancel: continue keeps exact draft/focus/editor scroll;
 *     item discard removes only child changes; plan discard removes all staged
 *     changes and restores the outer opener/window and list scroll, write 0.
 *  4. Repeat the dirty guard contract through Escape.
 *  5. Repeat it through the synthetic browser-Back boundary while keeping the
 *     exact WORKSPACE_URL rather than navigating into an operating route.
 *  6. Cover no-op/canceled/failure/retry/Undo receipts. A simulated target
 *     failure must restore exact raw bytes and retain the draft/error focus;
 *     retry reuses intentId. Count recovery support writes separately from the
 *     single successful state target write.
 *  7. Compare Text/Todo/Calendar/TXT manifests after the commit: identical
 *     refs/order/effective dates/completion. View/date navigation writes 0;
 *     selecting a new flow resets Text/base date/selected date/open item.
 *  8. Open the same ref from a period row and all result views, then restore
 *     exact result view/date/opener/scroll on close, write 0.
 *  9. Today complete -> detail -> Todo -> Calendar -> reopen must update the
 *     same ref everywhere. Each execution intent targets one state write and
 *     leaves source/personal-plan dates unchanged.
 * 10. Reload restores the successful overlay and projections. Malformed state
 *     and recovery journal each fail closed to plain /my, with no repair write
 *     and exact operating bytes.
 * 11. Capture 320x700, 375x812, 390x844, 844x390, 1024x768, and 1440x900.
 *     Assert no page or owned-scroll overflow, console/page error, or covered
 *     primary action; action targets are at least 44 CSS px.
 *
 * Existing editor hooks to use:
 *   personal-workspace-plan-editor / personal-workspace-item-editor
 *   personal-workspace-poc-{plan,item}-editor-{cancel,commit,retry}
 *   personal-workspace-plan-item-{list,row,open}
 *   personal-workspace-{plan,item}-{title-mode,title|title-input}
 *   personal-workspace-item-{memo-mode,memo,schedule-mode,schedule-date}
 *   personal-workspace-poc-editor-discard-confirmation
 *   personal-workspace-editor-receipt (+ receipt data attributes)
 *
 * Surface hooks still required:
 *   a stable editor body scroll key; result tab/root/view hooks; per-result-row
 *   data-item-ref/effective-date/completed; a canonical TXT item manifest;
 *   outer opener/result scroll return anchors; receipt change owner/field.
 */

test.describe('개인공간 통합 PoC Stage 3 런타임', () => {
  test('fixture는 네 saved-plan origin을 읽기만 하고 운영 byte와 mutation 경계를 보존한다', async ({ page }) => {
    await bootWorkspace(page);
    const operatingBefore = await readOperatingStorage(page);

    await expect(page.getByTestId('personal-workspace-flow-card')).toHaveCount(4);
    for (const origin of SAVED_ORIGINS) {
      await expect(page.locator(
        `[data-testid="personal-workspace-flow-card"][data-origin="${origin}"]`,
      )).toHaveCount(1);
    }

    expect(await readStorageMutations(page)).toEqual([]);
    await assertOperatingBoundary(page, operatingBefore);
  });

  test('네 origin과 작성 handoff는 같은 Plan→Item 편집 문법을 쓰고 clean close는 write 0이다', async ({ page }) => {
    test.setTimeout(120_000);
    await initializeAuditedPage(page, { width: 1024, height: 768 });
    const authored = await createAuthoringHandoff(page);
    await page.goto(WORKSPACE_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operatingBefore = await readOperatingStorage(page);
    const origins = [...SAVED_ORIGINS, 'authoring-handoff'] as const;
    const planSignatures: unknown[] = [];
    const itemSignatures: unknown[] = [];

    for (const origin of origins) {
      const { flowRef, opener } = await openFlowByOrigin(page, origin);
      const plan = await openPlanEditor(page);
      await expect(plan).toHaveAttribute('data-flow-ref', flowRef);
      await expect(plan).toHaveAttribute('data-origin', origin);
      const planSignature = await readEditorSignature(plan);
      expect(planSignature.sourceControlCount).toBe(0);
      planSignatures.push(planSignature);

      const item = await openPlanItemEditor(page);
      await expect(item.editor).toHaveAttribute('data-parent-flow-ref', flowRef);
      const itemSignature = await readEditorSignature(item.editor);
      expect(itemSignature.sourceControlCount).toBe(0);
      itemSignatures.push(itemSignature);

      await page.getByTestId('personal-workspace-poc-item-editor-cancel').click();
      await expect(item.editor).toHaveCount(0);
      await expect(item.opener).toBeFocused();
      await page.getByTestId('personal-workspace-poc-plan-editor-cancel').click();
      await expect(plan).toHaveCount(0);
      await expect(page.getByTestId('my-plan-edit')).toBeFocused();
      await page.getByTestId('my-plan-library-back').click();
      await expect(opener).toBeFocused();
    }

    expect(planSignatures).toEqual(Array.from({ length: origins.length }, () => ({
      schema: 'source-read-only,personal-title,plan-items,impact-summary',
      persistence: 'poc-shadow-only',
      sections: ['identity', 'source', 'personal', 'items', 'warnings', 'impact'],
      sourceControlCount: 0,
    })));
    expect(itemSignatures).toEqual(Array.from({ length: origins.length }, () => ({
      schema: 'source-read-only,personal-title,personal-memo,plan-schedule,execution-read-only,impact-summary',
      persistence: 'parent-draft-only',
      sections: ['identity', 'source', 'personal', 'execution', 'impact'],
      sourceControlCount: 0,
    })));
    expect((await readPocState(page))?.authoredFlows?.find((flow) => flow.ref === authored.flowRef)
      ?.authoring.rawText).toBe(AUTHORED_SOURCE);
    expect(await readStorageMutations(page)).toEqual([]);
    await assertOperatingBoundary(page, operatingBefore);
  });

  test('Item apply는 write 0, Plan commit은 state target 1이고 접힌 결과를 키보드로 연 네 view의 ref/date/completion이 같다', async ({ page }) => {
    test.setTimeout(120_000);
    await bootWorkspace(page, { width: 1024, height: 768 });
    const operatingBefore = await readOperatingStorage(page);
    const { flowRef } = await openFlowByOrigin(page, 'source-backed-map');
    await openPlanEditor(page);
    const firstRow = page.getByTestId('personal-workspace-plan-item-row').first();
    const { itemRef } = await openPlanItemEditor(page, firstRow);
    const rawBefore = await readRawStorage(page, POC_STATE_KEY);
    const sourceBytesBefore = await readOperatingStorage(page);

    await changePlanItemDraft(page);
    expect(await readRawStorage(page, POC_STATE_KEY)).toBe(rawBefore);
    expect(await readStorageMutations(page)).toEqual([]);
    await applyItemDraftToPlan(page);
    expect(await readRawStorage(page, POC_STATE_KEY)).toBe(rawBefore);
    expect(await readStorageMutations(page)).toEqual([]);
    await expect(page.locator(
      `[data-testid="personal-workspace-plan-item-row"][data-item-ref="${itemRef}"]`,
    )).toContainText(EDITED_ITEM_TITLE);
    await expect(page.locator(
      `[data-testid="personal-workspace-plan-item-row"][data-item-ref="${itemRef}"]`,
    )).toContainText(EDITED_ITEM_DATE);

    await changePlanTitle(page);
    const editedRow = page.locator(
      `[data-testid="personal-workspace-plan-item-row"][data-item-ref="${itemRef}"]`,
    );
    await editedRow.getByRole('button', { name: /아래로 이동$/u }).click();
    const expectedOrder = await page.getByTestId('personal-workspace-plan-item-row')
      .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-item-ref') ?? ''));

    const commit = page.getByTestId('personal-workspace-poc-plan-editor-commit');
    await commit.evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
    await expect(page.getByTestId('personal-workspace-plan-editor')).toHaveCount(0);
    const receipt = page.getByTestId('personal-workspace-editor-receipt');
    await expect(receipt).toHaveAttribute('data-receipt-status', 'success');
    await expect(receipt).toHaveAttribute('data-operation', 'commit-personal-plan');
    await expect(receipt).toHaveAttribute('data-target-write-count', '1');
    await expect(receipt).toHaveAttribute('data-support-write-count', '4');
    const mutations = await readStorageMutations(page);
    expect(successfulStateWrites(mutations)).toHaveLength(1);
    expect(mutations.filter((mutation) => mutation.method === 'clear')).toEqual([]);

    const state = await readPocState(page);
    const overlay = state?.personalPlanOverlays?.[flowRef];
    expect(overlay?.title).toBe(EDITED_PLAN_TITLE);
    expect(overlay?.orderedItemRefs).toEqual(expectedOrder);
    expect(overlay?.items[itemRef]).toEqual({
      itemRef,
      title: EDITED_ITEM_TITLE,
      memo: EDITED_ITEM_MEMO,
      schedule: { mode: 'fixed_date', date: EDITED_ITEM_DATE },
    });
    expect(await readOperatingStorage(page)).toEqual(sourceBytesBefore);

    const result = await openAlternateResultsByKeyboard(page);
    await expect(result).toHaveAttribute('data-flow-ref', flowRef);
    await expect(result).toContainText(EDITED_PLAN_TITLE);
    const manifest = await readResultManifest(page);
    expect(manifest).toEqual(expectedOrder);
    const perView = new Map<string, readonly ResultItemMetadata[]>();
    for (const view of ['text', 'todo', 'txt'] as const) {
      await page.getByTestId(`personal-workspace-result-view-${view}`).click();
      await expect(result).toHaveAttribute('data-result-view', view);
      expect(await readResultManifest(page)).toEqual(manifest);
      perView.set(view, await readVisibleResultMetadata(page));
    }
    expect(perView.get('todo')).toEqual(perView.get('text'));
    expect(perView.get('txt')).toEqual(perView.get('text'));
    const referenceMetadata = perView.get('text') ?? [];
    expect(referenceMetadata.find((item) => item.ref === itemRef)?.effectiveDate)
      .toBe(EDITED_ITEM_DATE);
    expect(referenceMetadata.every((item) => item.completed === 'false')).toBe(true);

    await page.getByTestId('personal-workspace-result-view-calendar').click();
    expect(await readResultManifest(page)).toEqual(manifest);
    const calendarMetadata = new Map<string, ResultItemMetadata>();
    const dates = [...new Set(referenceMetadata
      .map((item) => item.effectiveDate)
      .filter((date) => date !== 'undated'))];
    for (const date of dates) {
      await page.locator(`[data-calendar-date="${date}"]`).click();
      for (const item of await readVisibleResultMetadata(page)) calendarMetadata.set(item.ref, item);
    }
    expect([...calendarMetadata.values()].sort((left, right) => left.ref.localeCompare(right.ref)))
      .toEqual(referenceMetadata);
    await assertOperatingBoundary(page, operatingBefore);
  });

  test('원본과 같은 날짜를 개인 계획으로 지정해도 owner override를 state target 1로 보존한다', async ({ page }) => {
    await bootWorkspace(page, { width: 1024, height: 768 });
    const operatingBefore = await readOperatingStorage(page);
    const { flowRef } = await openFlowByOrigin(page, 'source-backed-map');
    await openPlanEditor(page);
    const { itemRef } = await openPlanItemEditor(page);
    await page.getByTestId('personal-workspace-item-schedule-mode').selectOption('fixed_date');
    await page.getByTestId('personal-workspace-item-schedule-date').fill('2026-09-10');
    await applyItemDraftToPlan(page);
    expect(await readStorageMutations(page)).toEqual([]);
    await page.getByTestId('personal-workspace-poc-plan-editor-commit').click();
    const receipt = page.getByTestId('personal-workspace-editor-receipt');
    await expect(receipt).toHaveAttribute('data-receipt-status', 'success');
    await expect(receipt).toHaveAttribute('data-target-write-count', '1');
    expect(successfulStateWrites(await readStorageMutations(page))).toHaveLength(1);
    expect((await readPocState(page))?.personalPlanOverlays?.[flowRef]?.items[itemRef]?.schedule)
      .toEqual({ mode: 'fixed_date', date: '2026-09-10' });
    const row = page.locator(
      `[data-testid="personal-workspace-result-item-row"][data-item-ref="${itemRef}"]`,
    );
    await expect(row).toHaveAttribute('data-effective-date', '2026-09-10');
    await assertOperatingBoundary(page, operatingBefore);
  });

  test('편집 중 external raw drift는 stale로 거부하고 target write 0·draft 유지다', async ({ page }) => {
    await bootWorkspace(page, { width: 1024, height: 768 });
    const operatingBefore = await readOperatingStorage(page);
    await page.getByTestId('personal-workspace-quick-toggle').click();
    await page.locator('[name="quick-title"]').fill('stale guard seed');
    await page.getByTestId('personal-workspace-quick-form')
      .getByRole('button', { name: '추가', exact: true }).click();
    await resetStorageMutations(page);
    await openFlowByOrigin(page, 'legacy-saved-plan');
    await openPlanEditor(page);
    await changePlanTitle(page, 'stale에서 유지할 draft');
    const capturedRaw = await readRawStorage(page, POC_STATE_KEY);
    expect(capturedRaw).toBeTruthy();
    const equivalentButDifferentRaw = JSON.stringify(JSON.parse(capturedRaw ?? '{}'), null, 2);
    expect(equivalentButDifferentRaw).not.toBe(capturedRaw);
    await seedRawStorage(page, POC_STATE_KEY, equivalentButDifferentRaw);
    await page.getByTestId('personal-workspace-poc-plan-editor-commit').click();
    const editor = page.getByTestId('personal-workspace-plan-editor');
    await expect(editor).toHaveAttribute('data-editor-status', 'recoverable-error');
    await expect(page.getByTestId('personal-workspace-editor-receipt'))
      .toHaveAttribute('data-receipt-status', 'failure');
    await expect(page.getByTestId('personal-workspace-editor-receipt'))
      .toHaveAttribute('data-target-write-count', '0');
    await expect(page.getByTestId('personal-workspace-plan-title'))
      .toHaveValue('stale에서 유지할 draft');
    expect(await readRawStorage(page, POC_STATE_KEY)).toBe(equivalentButDifferentRaw);
    expect(await readStorageMutations(page)).toEqual([]);
    await assertOperatingBoundary(page, operatingBefore);
  });

  test('QuickItem root editor는 Flow identity 없이 개인 내용과 실행일을 state target 1로 저장한다', async ({ page }) => {
    await bootWorkspace(page);
    const operatingBefore = await readOperatingStorage(page);
    await page.getByTestId('personal-workspace-quick-toggle').click();
    await page.locator('[name="quick-title"]').fill('Stage 3 빠른 할 일');
    await page.getByTestId('personal-workspace-quick-form')
      .getByRole('button', { name: '추가', exact: true }).click();
    const task = page.getByTestId('personal-workspace-task-row')
      .filter({ hasText: 'Stage 3 빠른 할 일' });
    await expect(task).toHaveCount(1);
    const itemRef = await task.getAttribute('data-item-ref');
    expect(itemRef).toBeTruthy();
    await resetStorageMutations(page);
    await task.locator('[data-personal-workspace-task-open-trigger]').click();
    const editor = page.getByTestId('personal-workspace-item-editor');
    await expect(editor).toHaveAttribute('data-personal-workspace-editor-kind', 'quick-item-root');
    await expect(editor).toHaveAttribute('data-editor-persistence-scope', 'poc-shadow-only');
    expect(await editor.getAttribute('data-parent-flow-ref')).toBeNull();
    await page.getByTestId('personal-workspace-poc-quick-item-title').fill('Stage 3 Quick 수정');
    await page.getByTestId('personal-workspace-poc-quick-item-memo').fill('개인 메모 🙂');
    await page.getByTestId('personal-workspace-poc-quick-item-date').fill('2026-09-13');
    await page.getByTestId('personal-workspace-poc-item-editor-commit').click();
    await expect(editor).toHaveCount(0);
    const receipt = page.getByTestId('personal-workspace-editor-receipt');
    await expect(receipt).toHaveAttribute('data-receipt-status', 'success');
    await expect(receipt).toHaveAttribute('data-operation', 'commit-quick-item-root');
    await expect(receipt).toHaveAttribute('data-target-write-count', '1');
    const mutations = await readStorageMutations(page);
    expect(successfulStateWrites(mutations)).toHaveLength(1);
    const state = await readPocState(page);
    expect(state?.quickItems.find((item) => item.title === 'Stage 3 Quick 수정')).toMatchObject({
      memo: '개인 메모 🙂',
      status: 'open',
    });
    expect(state?.placements[itemRef ?? '']).toMatchObject({
      scheduleMode: 'fixed_date',
      date: '2026-09-13',
    });
    await assertOperatingBoundary(page, operatingBefore);
  });

  test('QuickItem 편집 중 external raw drift는 target write 0·draft 유지·failure receipt이다', async ({ page }) => {
    await bootWorkspace(page);
    const operatingBefore = await readOperatingStorage(page);
    await page.getByTestId('personal-workspace-quick-toggle').click();
    await page.locator('[name="quick-title"]').fill('Quick stale seed');
    await page.getByTestId('personal-workspace-quick-form')
      .getByRole('button', { name: '추가', exact: true }).click();
    const task = page.getByTestId('personal-workspace-task-row')
      .filter({ hasText: 'Quick stale seed' });
    await expect(task).toHaveCount(1);
    await resetStorageMutations(page);
    await task.locator('[data-personal-workspace-task-open-trigger]').click();
    const editor = page.getByTestId('personal-workspace-item-editor');
    await expect(editor).toHaveAttribute('data-personal-workspace-editor-kind', 'quick-item-root');
    const title = page.getByTestId('personal-workspace-poc-quick-item-title');
    await title.fill('Quick stale에서 유지할 draft');
    const capturedRaw = await readRawStorage(page, POC_STATE_KEY);
    expect(capturedRaw).toBeTruthy();
    const equivalentButDifferentRaw = JSON.stringify(JSON.parse(capturedRaw ?? '{}'), null, 2);
    expect(equivalentButDifferentRaw).not.toBe(capturedRaw);
    await seedRawStorage(page, POC_STATE_KEY, equivalentButDifferentRaw);
    await page.getByTestId('personal-workspace-poc-item-editor-commit').click();
    await expect(editor).toHaveAttribute('data-editor-status', 'recoverable-error');
    const receipt = page.getByTestId('personal-workspace-editor-receipt');
    await expect(receipt).toHaveAttribute('data-receipt-status', 'failure');
    await expect(receipt).toHaveAttribute('data-operation', 'commit-quick-item-root');
    await expect(receipt).toHaveAttribute('data-target-write-count', '0');
    await expect(title).toHaveValue('Quick stale에서 유지할 draft');
    expect(await readRawStorage(page, POC_STATE_KEY)).toBe(equivalentButDifferentRaw);
    expect(await readStorageMutations(page)).toEqual([]);
    await assertOperatingBoundary(page, operatingBefore);
  });

  test('성공 영수증 직후 상단 Undo도 같은 변경을 undone receipt로 전환한다', async ({ page }) => {
    await bootWorkspace(page, { width: 1024, height: 768 });
    const operatingBefore = await readOperatingStorage(page);
    await openFlowByOrigin(page, 'personal-draft');
    await openPlanEditor(page);
    await changePlanTitle(page, '상단 Undo 검증 제목');
    await page.getByTestId('personal-workspace-poc-plan-editor-commit').click();
    const receipt = page.getByTestId('personal-workspace-editor-receipt');
    await expect(receipt).toHaveAttribute('data-receipt-status', 'success');
    const intentId = await receipt.getAttribute('data-intent-id');
    await expect(page.getByTestId('personal-workspace-undo')).toBeEnabled();
    const undoCursor = mutationCursor(await readStorageMutations(page));
    await page.getByTestId('personal-workspace-undo').click();
    await expect(receipt).toHaveAttribute('data-receipt-status', 'undone');
    await expect(receipt).toHaveAttribute('data-intent-id', intentId ?? '');
    await expect(receipt).toHaveAttribute('data-target-write-count', '1');
    await expect(receipt).toHaveAttribute('data-support-write-count', '4');
    expect(successfulStateWrites(mutationsAfter(
      await readStorageMutations(page),
      undoCursor,
    ))).toHaveLength(1);
    expect(successfulStateWrites(await readStorageMutations(page))).toHaveLength(2);
    await expect(page.getByTestId('personal-workspace-result-surface'))
      .not.toContainText('상단 Undo 검증 제목');
    await assertOperatingBoundary(page, operatingBefore);
  });

  test('no-op·dirty Cancel·Escape·Back은 draft/focus/scroll을 보존하고 discard는 write 0이다', async ({ page }) => {
    test.setTimeout(120_000);
    await bootWorkspace(page);
    const operatingBefore = await readOperatingStorage(page);
    await openFlowByOrigin(page, 'canonical-personal-copy');
    await openPlanEditor(page);

    await page.getByTestId('personal-workspace-poc-plan-editor-commit').click();
    await expect(page.getByTestId('personal-workspace-editor-receipt'))
      .toHaveAttribute('data-receipt-status', 'noop');
    await expect(page.getByTestId('personal-workspace-editor-receipt'))
      .toHaveAttribute('data-target-write-count', '0');
    expect(successfulStateWrites(await readStorageMutations(page))).toHaveLength(0);

    await openPlanEditor(page);
    const list = page.getByTestId('personal-workspace-plan-item-list');
    await list.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    const lowerRow = page.getByTestId('personal-workspace-plan-item-row').nth(6);
    const originalLowerTitle = (await lowerRow.getByTestId('personal-workspace-plan-item-open')
      .innerText()).trim();
    await lowerRow.getByTestId('personal-workspace-plan-item-open').click();
    await page.getByTestId('personal-workspace-item-title-mode').selectOption('override');
    const itemTitle = page.getByTestId('personal-workspace-item-title-input');
    await itemTitle.fill('버릴 Item 변경');
    await itemTitle.press('Escape');
    await expect(page.getByTestId('personal-workspace-poc-editor-discard-confirmation')).toBeVisible();
    await page.getByTestId('personal-workspace-item-editor-continue-editing').click();
    await expect(itemTitle).toHaveValue('버릴 Item 변경');
    await expect(itemTitle).toBeFocused();
    await itemTitle.press('Escape');
    await page.getByTestId('personal-workspace-item-editor-discard-changes').click();
    await expect(page.getByTestId('personal-workspace-plan-editor')).toBeVisible();
    await expect(lowerRow.getByTestId('personal-workspace-plan-item-open'))
      .toContainText(originalLowerTitle.split('\n')[0] ?? originalLowerTitle);
    expect(await list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await page.getByTestId('personal-workspace-poc-plan-editor-cancel').click();
    await expect(page.getByTestId('personal-workspace-plan-editor')).toHaveCount(0);

    await openPlanEditor(page);
    await changePlanTitle(page, '취소할 Plan 변경');
    await page.getByTestId('personal-workspace-poc-plan-editor-cancel').click();
    await expect(page.getByTestId('personal-workspace-poc-editor-discard-confirmation')).toBeVisible();
    await page.getByTestId('personal-workspace-plan-editor-continue-editing').click();
    await expect(page.getByTestId('personal-workspace-plan-title')).toHaveValue('취소할 Plan 변경');
    const planTitle = page.getByTestId('personal-workspace-plan-title');
    await planTitle.focus();
    await planTitle.press('Escape');
    await page.getByTestId('personal-workspace-plan-editor-discard-changes').click();
    await expect(page.getByTestId('personal-workspace-plan-editor')).toHaveCount(0);
    await expect(page.getByTestId('my-plan-edit')).toBeFocused();
    await expect(page.getByTestId('personal-workspace-editor-receipt'))
      .toHaveAttribute('data-receipt-status', 'canceled');

    await openPlanEditor(page);
    await changePlanTitle(page, 'Back으로 버릴 Plan 변경');
    const backTitle = page.getByTestId('personal-workspace-plan-title');
    await backTitle.focus();
    await page.evaluate(() => window.history.back());
    await expect(page.getByTestId('personal-workspace-poc-editor-discard-confirmation')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${WORKSPACE_URL.replace('?', '\\?')}$`, 'u'));
    await page.getByTestId('personal-workspace-plan-editor-continue-editing').click();
    await expect(backTitle).toHaveValue('Back으로 버릴 Plan 변경');
    await expect(backTitle).toBeFocused();
    await page.evaluate(() => window.history.back());
    await expect(page.getByTestId('personal-workspace-poc-editor-discard-confirmation')).toBeVisible();
    await page.getByTestId('personal-workspace-plan-editor-discard-changes').click();
    await expect(page.getByTestId('personal-workspace-plan-editor')).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${WORKSPACE_URL.replace('?', '\\?')}$`, 'u'));

    expect(await readStorageMutations(page)).toEqual([]);
    await assertOperatingBoundary(page, operatingBefore);
  });

  test('저장 실패는 exact rollback과 draft를 유지하고 same-intent retry 후 Undo한다', async ({ page }) => {
    test.setTimeout(120_000);
    await bootWorkspace(page, { width: 1024, height: 768 });
    const operatingBefore = await readOperatingStorage(page);
    await openFlowByOrigin(page, 'legacy-saved-plan');
    await openPlanEditor(page);
    await changePlanTitle(page, '실패 후 복구할 제목');
    const rawBefore = await readRawStorage(page, POC_STATE_KEY);
    await failNextStateWrite(page);
    await page.getByTestId('personal-workspace-poc-plan-editor-commit').click();

    const editor = page.getByTestId('personal-workspace-plan-editor');
    await expect(editor).toHaveAttribute('data-editor-status', 'recoverable-error');
    const receipt = page.getByTestId('personal-workspace-editor-receipt');
    await expect(receipt).toHaveAttribute('data-receipt-status', 'failure');
    await expect(receipt).toHaveAttribute('data-target-write-count', '0');
    const intentId = await receipt.getAttribute('data-intent-id');
    expect(intentId).toBeTruthy();
    expect(await readRawStorage(page, POC_STATE_KEY)).toBe(rawBefore);
    await expect(page.getByTestId('personal-workspace-plan-title'))
      .toHaveValue('실패 후 복구할 제목');
    await expect(page.getByTestId('personal-workspace-poc-editor-error')).toBeFocused();
    let mutations = await readStorageMutations(page);
    expect(mutations.filter((mutation) => (
      mutation.method === 'setItem'
      && mutation.key === POC_STATE_KEY
      && mutation.outcome === 'throw'
    ))).toHaveLength(1);
    expect(successfulStateWrites(mutations)).toHaveLength(0);

    await page.getByTestId('personal-workspace-poc-plan-editor-retry').click();
    await expect(editor).toHaveCount(0);
    await expect(receipt).toHaveAttribute('data-receipt-status', 'success');
    await expect(receipt).toHaveAttribute('data-intent-id', intentId ?? '');
    await expect(receipt).toHaveAttribute('data-target-write-count', '1');
    mutations = await readStorageMutations(page);
    expect(successfulStateWrites(mutations)).toHaveLength(1);
    await expect(page.getByTestId('personal-workspace-result-surface'))
      .toContainText('실패 후 복구할 제목');

    const undoCursor = mutationCursor(mutations);
    await page.getByTestId('personal-workspace-editor-receipt-undo').click();
    await expect(receipt).toHaveAttribute('data-receipt-status', 'undone');
    await expect(receipt).toHaveAttribute('data-target-write-count', '1');
    await expect(receipt).toHaveAttribute('data-support-write-count', '4');
    mutations = await readStorageMutations(page);
    expect(successfulStateWrites(mutationsAfter(mutations, undoCursor))).toHaveLength(1);
    expect(successfulStateWrites(mutations)).toHaveLength(2);
    await expect(page.getByTestId('personal-workspace-result-surface'))
      .not.toContainText('실패 후 복구할 제목');
    await assertOperatingBoundary(page, operatingBefore);
  });

  test('오늘 완료는 상세·Todo·Calendar의 같은 ref에 보이고 다시 열린다', async ({ page }) => {
    test.setTimeout(120_000);
    await bootWorkspace(page);
    const operatingBefore = await readOperatingStorage(page);
    await page.locator('nav[aria-label="개인공간 보기"] button')
      .filter({ hasText: /^오늘$/u }).click();
    const task = page.getByTestId('personal-workspace-task-row')
      .filter({ hasText: 'Stage 3 지도 Flow 실행 1' }).first();
    await expect(task).toBeVisible();
    const itemRef = await task.getAttribute('data-item-ref');
    expect(itemRef).toBeTruthy();
    let cursor = mutationCursor(await readStorageMutations(page));
    await task.getByTestId('personal-workspace-complete').click();
    await expect(task.getByTestId('personal-workspace-complete')).toHaveAttribute('aria-pressed', 'true');
    let delta = mutationsAfter(await readStorageMutations(page), cursor);
    expect(successfulStateWrites(delta)).toHaveLength(1);

    await task.locator('[data-personal-workspace-task-open-trigger]').click();
    const detail = page.getByTestId('personal-workspace-flow-item-detail');
    await expect(detail).toBeVisible();
    await expect(detail.getByRole('button', { name: '다시 열기', exact: true })).toBeVisible();
    await expect(page.getByTestId('personal-workspace-flow-item-edit')).toBeVisible();
    const sheetClose = page.getByTestId('personal-workspace-item-sheet-close');
    if (await sheetClose.count()) await sheetClose.click();

    await openAlternateResultsByKeyboard(page);
    await page.getByTestId('personal-workspace-result-view-todo').click();
    const todoRow = page.locator(
      `[data-testid="personal-workspace-result-item-row"][data-item-ref="${itemRef}"]`,
    );
    await expect(todoRow).toHaveAttribute('data-completed', 'true');
    await page.getByTestId('personal-workspace-result-view-calendar').click();
    await page.locator('[data-calendar-date="2026-09-10"]').click();
    const calendarRow = page.locator(
      `[data-testid="personal-workspace-result-item-row"][data-item-ref="${itemRef}"]`,
    );
    await expect(calendarRow).toHaveAttribute('data-completed', 'true');

    await page.getByTestId('my-plan-library-back').click();
    const reopenedTask = page.locator(
      `[data-testid="personal-workspace-task-row"][data-item-ref="${itemRef}"]`,
    );
    await expect(reopenedTask.getByTestId('personal-workspace-complete'))
      .toHaveAttribute('aria-pressed', 'true');
    cursor = mutationCursor(await readStorageMutations(page));
    await reopenedTask.getByTestId('personal-workspace-complete').click();
    await expect(reopenedTask.getByTestId('personal-workspace-complete'))
      .toHaveAttribute('aria-pressed', 'false');
    delta = mutationsAfter(await readStorageMutations(page), cursor);
    expect(successfulStateWrites(delta)).toHaveLength(1);
    expect((await readPocState(page))?.completions[itemRef ?? '']?.status ?? 'open').toBe('open');
    await assertOperatingBoundary(page, operatingBefore);
  });

  test('reload는 마지막 성공 overlay를 복원하고 corrupt state/recovery는 운영 byte를 보존하며 fail-closed한다', async ({ browser }) => {
    test.setTimeout(150_000);
    const persisted = await newAuditedPage(browser, { width: 390, height: 844 });
    try {
      await persisted.goto(WORKSPACE_URL);
      await expect(persisted.getByTestId('personal-workspace-poc-shell')).toBeVisible();
      const operatingBefore = await readOperatingStorage(persisted);
      const { flowRef } = await openFlowByOrigin(persisted, 'personal-draft');
      await openPlanEditor(persisted);
      await changePlanTitle(persisted, 'Reload 복원 제목');
      await persisted.getByTestId('personal-workspace-poc-plan-editor-commit').click();
      await expect(persisted.getByTestId('personal-workspace-editor-receipt'))
        .toHaveAttribute('data-receipt-status', 'success');
      const exactStateRaw = await readRawStorage(persisted, POC_STATE_KEY);
      expect(exactStateRaw).toBeTruthy();
      await persisted.reload();
      await expect(persisted.getByTestId('personal-workspace-poc-shell')).toBeVisible();
      expect(await readRawStorage(persisted, POC_STATE_KEY)).toBe(exactStateRaw);
      await openFlowByOrigin(persisted, 'personal-draft');
      await expect(persisted.getByTestId('personal-workspace-result-surface'))
        .toHaveAttribute('data-flow-ref', flowRef);
      await expect(persisted.getByTestId('personal-workspace-result-surface'))
        .toContainText('Reload 복원 제목');
      await openPlanEditor(persisted);
      await expect(persisted.getByTestId('personal-workspace-plan-title-mode'))
        .toHaveValue('override');
      await expect(persisted.getByTestId('personal-workspace-plan-title'))
        .toHaveValue('Reload 복원 제목');
      await assertOperatingBoundary(persisted, operatingBefore);
    } finally {
      await persisted.close();
    }

    for (const corruption of [
      { key: POC_STATE_KEY, raw: '{malformed-stage-3-state' },
      { key: POC_RECOVERY_KEY, raw: '{malformed-stage-3-recovery' },
    ] as const) {
      const malformed = await newAuditedPage(browser, { width: 390, height: 844 });
      try {
        await malformed.goto('/my');
        const operatingBefore = await readOperatingStorage(malformed);
        await seedRawStorage(malformed, POC_STATE_KEY, null);
        await seedRawStorage(malformed, POC_RECOVERY_KEY, null);
        await seedRawStorage(malformed, corruption.key, corruption.raw);
        await malformed.goto(WORKSPACE_URL);
        await malformed.waitForURL((url) => (
          url.pathname === '/my' && !url.searchParams.has('personalWorkspacePoc')
        ));
        await expect(malformed.getByTestId('personal-workspace-poc-shell')).toHaveCount(0);
        expect(await readRawStorage(malformed, corruption.key)).toBe(corruption.raw);
        expect(await readStorageMutations(malformed)).toEqual([]);
        await assertOperatingBoundary(malformed, operatingBefore);
      } finally {
        await malformed.close();
      }
    }
  });

  test('6개 viewport의 workspace·result·Plan·Item에 overflow, console/page error, 가려진 CTA가 없다', async ({ browser }) => {
    test.setTimeout(240_000);
    const screenshotDir = path.join(
      process.cwd(),
      'docs',
      'content-audit',
      '2026-09-02-flowme-integrated-poc-stage-3-runtime-assets',
    );
    mkdirSync(screenshotDir, { recursive: true });

    for (const viewport of VIEWPORTS) {
      const page = await newAuditedPage(browser, viewport);
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        await page.goto(WORKSPACE_URL);
        await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
        const operatingBefore = await readOperatingStorage(page);
        await expectReachableAction(page.getByTestId('personal-workspace-create-flow'));
        await expectNoOwnedHorizontalOverflow(page);
        await page.screenshot({
          path: path.join(screenshotDir, `workspace-${viewport.label}.png`),
          fullPage: false,
        });

        await openFlowByOrigin(page, 'canonical-personal-copy');
        await expectReachableAction(page.getByTestId('my-plan-edit'));
        await openAlternateResultsByKeyboard(page);
        await expectReachableAction(page.getByTestId('personal-workspace-result-view-calendar'));
        await expectNoOwnedHorizontalOverflow(page);
        await page.screenshot({
          path: path.join(screenshotDir, `result-${viewport.label}.png`),
          fullPage: false,
        });

        await openPlanEditor(page);
        await expectReachableAction(page.getByTestId('personal-workspace-poc-plan-editor-commit'));
        await expectNoOwnedHorizontalOverflow(page);
        await page.screenshot({
          path: path.join(screenshotDir, `plan-${viewport.label}.png`),
          fullPage: false,
        });

        await openPlanItemEditor(page);
        await expectReachableAction(page.getByTestId('personal-workspace-poc-item-editor-commit'));
        await expectNoOwnedHorizontalOverflow(page);
        await page.screenshot({
          path: path.join(screenshotDir, `item-${viewport.label}.png`),
          fullPage: false,
        });
        expect(errors).toEqual([]);
        expect(await readStorageMutations(page)).toEqual([]);
        await assertOperatingBoundary(page, operatingBefore);
      } finally {
        await page.close();
      }
    }
  });
});
