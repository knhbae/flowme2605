import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES } from '../../lib/flow/personal-workspace-poc-authoring';

const WORKSPACE_URL = '/my?personalWorkspacePoc=v1';
const AUTHORING_URL = '/flows/new?personalWorkspacePoc=v1';
const POC_PREFIX = 'flow:poc:personal-workspace:v1:';
const POC_STATE_KEY = `${POC_PREFIX}state`;
const POC_AUTHORING_DRAFT_KEY = `${POC_PREFIX}authoring-draft`;
const MOVING_TEMPLATE = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.find(
  (template) => template.templateId === 'moving-dday-v1',
);

const VALID_SOURCE = [
  '# 이사 준비',
  '- 기준일: 2026-09-10',
  '',
  '## 행정 준비',
  '- [ ] 전입 신고 준비',
  '  - 상대 날짜: D-2',
  '  - 장소: 주민센터',
  '  - 완료 기준: 전입 신고 접수를 마쳤다',
].join('\n');

const INVALID_DATE_SOURCE = [
  '# 이사 준비',
  '- 기준일: 2026-02-30',
  '',
  '## 행정 준비',
  '- [ ] 전입 신고 준비',
  '  - 상대 날짜: D-2',
].join('\n');

type StorageMutation = {
  method: 'setItem' | 'removeItem' | 'clear';
  key?: string;
};

type PocStateShape = {
  revision: number;
  memberships: Array<{
    member: 'saved_flow' | 'quick_item';
    memberRef: string;
    folderId?: string;
  }>;
  placements: Record<string, { scheduleMode: string; date?: string }>;
  completions: Record<string, { status: 'open' | 'completed' }>;
  authoredFlows?: Array<{
    ref: string;
    title: string;
    origin: 'authoring-handoff';
    items: Array<{ ref: string; title: string; sourceDate?: string }>;
    authoring: {
      handoffId: string;
      rawText: string;
      sourceFingerprint: string;
      parsedItems?: Array<{
        place?: string;
        completionCriteria?: string;
      }>;
    };
  }>;
  authoringReceipts?: Array<{
    handoffId: string;
    flowRef: string;
  }>;
  undo?: unknown;
};

type PocAuthoringDraftShape = {
  version: 1;
  rawText: string;
  templateId?: string;
};

function taskRow(page: Page, title: string) {
  return page.getByTestId('personal-workspace-task-row').filter({ hasText: title }).first();
}

async function readPocState(page: Page): Promise<PocStateShape> {
  return page.evaluate(
    (key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'),
    POC_STATE_KEY,
  );
}

async function readPocRaw(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), POC_STATE_KEY);
}

async function readAuthoringDraft(page: Page): Promise<PocAuthoringDraftShape | null> {
  return page.evaluate(
    (key) => {
      const raw = window.localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    },
    POC_AUTHORING_DRAFT_KEY,
  );
}

async function readNonPocStorage(page: Page): Promise<Record<string, string>> {
  return page.evaluate((prefix) => {
    const keys = Array.from(
      { length: window.localStorage.length },
      (_, index) => window.localStorage.key(index),
    )
      .filter((key): key is string => Boolean(key) && !key!.startsWith(prefix))
      .sort();
    return Object.fromEntries(
      keys.map((key) => [key, window.localStorage.getItem(key) ?? '']),
    );
  }, POC_PREFIX);
}

async function readDocumentMutationCount(page: Page): Promise<number> {
  return page.evaluate(() => (
    window as Window & typeof globalThis & {
      __personalWorkspacePocStorageMutations?: StorageMutation[];
    }
  ).__personalWorkspacePocStorageMutations?.length ?? 0);
}

async function expectPocStateUnchanged(
  page: Page,
  raw: string | null,
  revision: number,
): Promise<void> {
  const currentRaw = await readPocRaw(page);
  expect(currentRaw).toBe(raw);
  const currentRevision = currentRaw === null
    ? 0
    : (JSON.parse(currentRaw) as PocStateShape).revision;
  expect(currentRevision).toBe(revision);
}

async function expectSaved(page: Page): Promise<void> {
  await expect(page.getByTestId('personal-workspace-transaction-status'))
    .toHaveAttribute('data-status', 'success');
}

async function openToday(page: Page): Promise<void> {
  await page.locator('button:visible').filter({ hasText: /^오늘$/u }).first().click();
  await expect(page.getByTestId('personal-workspace-today-surface')).toBeVisible();
}

async function startAuthoringWithSource(page: Page, rawText: string): Promise<Locator> {
  const source = page.getByTestId('personal-workspace-live-editor-textarea');
  if (await source.count()) {
    await source.fill(rawText);
    return source;
  }
  await page.getByTestId('personal-workspace-entry-input').fill(rawText);
  await page.getByTestId('personal-workspace-entry-start-authoring').click();
  await expect(source).toHaveValue(rawText);
  return source;
}

async function expectPrimaryActionUsable(action: Locator): Promise<void> {
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeVisible();
  await expect(action).toBeEnabled();
  const result = await action.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(centerX, centerY);
    return {
      inside:
        rect.left >= 0
        && rect.top >= 0
        && rect.right <= window.innerWidth
        && rect.bottom <= window.innerHeight,
      clickable: hit === element || element.contains(hit),
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      },
      hit: hit instanceof HTMLElement ? {
        tag: hit.tagName.toLowerCase(),
        testId: hit.dataset.testid ?? null,
        text: hit.textContent?.trim().slice(0, 80) ?? '',
      } : null,
    };
  });
  expect(result.inside, JSON.stringify(result)).toBe(true);
  expect(result.clickable, JSON.stringify(result)).toBe(true);
}

async function installFixturesAndAudit(
  page: Page,
  calls: StorageMutation[],
): Promise<void> {
  await page.exposeFunction(
    '__recordPersonalWorkspacePocStorageMutation',
    (mutation: StorageMutation) => {
      calls.push(mutation);
    },
  );
  await page.addInitScript(({ stateKey }) => {
    const storageSet = Storage.prototype.setItem;
    const storageRemove = Storage.prototype.removeItem;
    const storageClear = Storage.prototype.clear;
    const localDate = (value = new Date()) => [
      String(value.getFullYear()).padStart(4, '0'),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');
    const savedAt = `${localDate()}T00:00:00.000Z`;
    const makeBundle = (
      slug: string,
      id: string,
      title: string,
      status: 'draft' | 'published' = 'published',
      itemCount = 1,
    ) => ({
      flow: {
        id,
        slug,
        title,
        category: 'PoC 검증',
        structure_type: 'timeline',
        anchor_type: 'start_date',
        status,
        created_at: savedAt,
        updated_at: savedAt,
        ...(status === 'draft'
          ? { source_title: '내 메모', tags: ['내 초안'] }
          : {}),
      },
      sections: [{
        id: `${id}-section`,
        flow_id: id,
        title: '실행',
        order: 0,
      }],
      items: Array.from({ length: itemCount }, (_, index) => ({
        id: `${slug}-item-${index + 1}`,
        flow_id: id,
        section_id: `${id}-section`,
        title: `${title} 실행 ${index + 1}`,
        type: 'calendar',
        day_offset: index,
        order: index,
      })),
    });
    const legacyRecord = (slug: string) => ({
      slug,
      savedAt,
      selectedArtifactMode: 'calendar',
      dateIntent: 'custom',
      anchor: localDate(),
    });
    const bundles = [
      makeBundle('map-child', 'flow:map-child', '지도 저장 Flow', 'published', 2),
      makeBundle('url-draft-note', 'flow:draft', '개인 초안 Flow', 'draft'),
      makeBundle('canonical-source', 'flow:canonical-source', '개인 사본 Flow'),
      makeBundle('legacy-plan', 'flow:legacy', '기존 저장 Flow'),
    ];
    const fixtureEntries: Array<[string, string]> = [
      ['flow_builder_mvp_bundles_v11', JSON.stringify(bundles)],
      ['flow:operational:sentinel', '  byte-for-byte sentinel  '],
      ['flow:map:saved:map-one', JSON.stringify({
        mapId: 'map-one',
        title: '검증 지도',
        version: 'v1',
        savedAt,
        anchor: localDate(),
        flowSlugs: ['map-child'],
      })],
      ['flow:saved:map-child', JSON.stringify(legacyRecord('map-child'))],
      ['flow:saved:url-draft-note', JSON.stringify(legacyRecord('url-draft-note'))],
      ['flow:saved:copy:one', JSON.stringify({
        schemaVersion: 2,
        slug: 'copy:one',
        savedAt,
        personalCopyKey: 'copy:one',
        sourceFlowKey: 'flow:canonical-source',
        sourceFlowSlug: 'canonical-source',
        sourceVersion: 'source-v1',
        lastSaveRequestId: 'request:copy:one',
        savedItemCount: 1,
        selectedArtifactMode: 'calendar',
        dateIntent: 'custom',
        anchor: localDate(),
      })],
      ['flow:saved:copy:two', JSON.stringify({
        schemaVersion: 2,
        slug: 'copy:two',
        savedAt,
        personalCopyKey: 'copy:two',
        sourceFlowKey: 'flow:canonical-source',
        sourceFlowSlug: 'canonical-source',
        sourceVersion: 'source-v1',
        lastSaveRequestId: 'request:copy:two',
        savedItemCount: 1,
        selectedArtifactMode: 'calendar',
        dateIntent: 'custom',
        anchor: localDate(),
      })],
      ['flow:saved:legacy-plan', JSON.stringify(legacyRecord('legacy-plan'))],
    ];
    for (const [key, value] of fixtureEntries) {
      storageSet.call(window.localStorage, key, value);
    }

    type AuditWindow = Window & typeof globalThis & {
      __recordPersonalWorkspacePocStorageMutation: (
        mutation: StorageMutation,
      ) => Promise<void>;
      __personalWorkspacePocStorageMutations: StorageMutation[];
      __personalWorkspacePocFailNextWrite?: boolean;
    };
    const auditWindow = window as AuditWindow;
    auditWindow.__personalWorkspacePocStorageMutations = [];
    Storage.prototype.setItem = function auditedSetItem(key: string, value: string) {
      if (this === window.localStorage) {
        const mutation: StorageMutation = { method: 'setItem', key };
        auditWindow.__personalWorkspacePocStorageMutations.push(mutation);
        void auditWindow.__recordPersonalWorkspacePocStorageMutation(mutation);
        if (auditWindow.__personalWorkspacePocFailNextWrite && key === stateKey) {
          auditWindow.__personalWorkspacePocFailNextWrite = false;
          throw new DOMException('simulated quota failure', 'QuotaExceededError');
        }
      }
      return storageSet.call(this, key, value);
    };
    Storage.prototype.removeItem = function auditedRemoveItem(key: string) {
      if (this === window.localStorage) {
        const mutation: StorageMutation = { method: 'removeItem', key };
        auditWindow.__personalWorkspacePocStorageMutations.push(mutation);
        void auditWindow.__recordPersonalWorkspacePocStorageMutation(mutation);
      }
      return storageRemove.call(this, key);
    };
    Storage.prototype.clear = function auditedClear() {
      if (this === window.localStorage) {
        const mutation: StorageMutation = { method: 'clear' };
        auditWindow.__personalWorkspacePocStorageMutations.push(mutation);
        void auditWindow.__recordPersonalWorkspacePocStorageMutation(mutation);
      }
      return storageClear.call(this);
    };
  }, { stateKey: POC_STATE_KEY });
}

async function assertStorageBoundary(
  page: Page,
  calls: StorageMutation[],
  before: Record<string, string>,
): Promise<void> {
  await expect.poll(() => calls.length).toBeGreaterThanOrEqual(1);
  expect(await readNonPocStorage(page)).toEqual(before);
  expect(calls.filter((call) => call.method === 'clear')).toEqual([]);
  expect(calls.filter((call) => (
    (call.method === 'setItem' || call.method === 'removeItem')
    && !call.key?.startsWith(POC_PREFIX)
  ))).toEqual([]);
}

function expectOnlyPocStorageMutations(calls: StorageMutation[]): void {
  expect(calls.filter((call) => call.method === 'clear')).toEqual([]);
  expect(calls.filter((call) => (
    (call.method === 'setItem' || call.method === 'removeItem')
    && !call.key?.startsWith(POC_PREFIX)
  ))).toEqual([]);
}

test.describe('FlowMe Text Authoring -> 개인공간 통합 흐름 PoC', () => {
  test('P2-C 개인 소유 구간 제목은 shadow로 저장·복구·Undo되고 운영 bundle은 그대로다', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(WORKSPACE_URL);
    const operatingBefore = await readNonPocStorage(page);
    const card = page.locator('[data-testid="personal-workspace-flow-card"][data-origin="personal-draft"]');
    await card.locator('button[data-personal-workspace-flow-open-trigger]').click();
    await expect(page.getByTestId('personal-workspace-flow-detail')).toContainText('개인 초안 Flow');
    await page.getByTestId('my-plan-edit').click();
    const sectionMode = page.locator('[data-testid^="personal-workspace-plan-section-title-mode-"]');
    await expect(sectionMode).toHaveCount(1);
    await expect(page.getByTestId('personal-workspace-plan-section-title-list')).toContainText('개인 소유 구간만');
    await sectionMode.selectOption('override');
    const sectionInput = page.locator('input[data-testid^="personal-workspace-plan-section-title-"]');
    await sectionInput.fill('내 실행 구간');
    await page.getByTestId('personal-workspace-poc-plan-editor-commit').click();
    await expectSaved(page);
    const stateAfter = await readPocState(page) as PocStateShape & {
      personalPlanOverlays?: Record<string, { sectionTitles?: Record<string, string> }>;
    };
    const sectionAliases = Object.values(stateAfter.personalPlanOverlays ?? {})
      .flatMap((overlay) => Object.values(overlay.sectionTitles ?? {}));
    expect(sectionAliases).toContain('내 실행 구간');
    expect(await readNonPocStorage(page)).toEqual(operatingBefore);

    await page.reload();
    await expect(page.getByTestId('personal-workspace-transaction-status')).toContainText('복원');
    const restoredCard = page.locator('[data-testid="personal-workspace-flow-card"][data-origin="personal-draft"]');
    await restoredCard.locator('button[data-personal-workspace-flow-open-trigger]').click();
    await expect(page.getByTestId('personal-workspace-flow-detail')).toContainText('내 실행 구간');
    await page.getByTestId('personal-workspace-poc-manage').click();
    await page.getByTestId('personal-workspace-undo-mobile').click();
    await expectSaved(page);
    const afterUndo = await readPocState(page) as PocStateShape & {
      personalPlanOverlays?: Record<string, { sectionTitles?: Record<string, string> }>;
    };
    expect(Object.values(afterUndo.personalPlanOverlays ?? {})
      .flatMap((overlay) => Object.values(overlay.sectionTitles ?? {}))).not.toContain('내 실행 구간');
    expect(await readNonPocStorage(page)).toEqual(operatingBefore);
    expectOnlyPocStorageMutations(calls);
  });

  test('작성 원문을 개인 Flow로 저장하고 배치, 완료, 다시 열기, reload까지 복구한다', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(WORKSPACE_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operatingBefore = await readNonPocStorage(page);

    const origins = [
      'source-backed-map',
      'personal-draft',
      'canonical-personal-copy',
      'legacy-saved-plan',
    ] as const;
    await expect(page.getByTestId('personal-workspace-flow-card')).toHaveCount(5);
    for (const origin of origins) {
      await expect(page.locator(
        `[data-testid="personal-workspace-flow-card"][data-origin="${origin}"]`,
      )).toHaveCount(origin === 'canonical-personal-copy' ? 2 : 1);
    }
    await expect(page.getByTestId('personal-workspace-flow-card').filter({ hasText: '사본 1 · 개인 사본 Flow' })).toHaveCount(1);
    await expect(page.getByTestId('personal-workspace-flow-card').filter({ hasText: '사본 2 · 개인 사본 Flow' })).toHaveCount(1);

    await page.getByTestId('personal-workspace-create-flow').click();
    await page.waitForURL(AUTHORING_URL);
    await expect(page.getByTestId('personal-workspace-authoring-shell')).toBeVisible();
    expect(MOVING_TEMPLATE).toBeTruthy();
    if (!MOVING_TEMPLATE) throw new Error('moving-dday-v1 작성 틀을 찾지 못했습니다.');
    await page.getByTestId('personal-workspace-entry-start-template').click();
    await expect(page.getByTestId('personal-workspace-authoring-template-picker')).toBeVisible();
    await page.getByTestId('personal-workspace-authoring-template-moving-dday-v1').click();
    const source = page.getByTestId('personal-workspace-live-editor-textarea');
    await expect(source).toHaveValue(MOVING_TEMPLATE.scaffold);
    expect(await readAuthoringDraft(page)).toEqual({
      version: 1,
      rawText: MOVING_TEMPLATE.scaffold,
      templateId: MOVING_TEMPLATE.templateId,
    });
    await source.press('Control+z');
    await expect(source).toHaveValue('');
    expect(await readAuthoringDraft(page)).toBeNull();
    await source.press('Control+y');
    await expect(source).toHaveValue(MOVING_TEMPLATE.scaffold);
    expect(await readAuthoringDraft(page)).toEqual({
      version: 1,
      rawText: MOVING_TEMPLATE.scaffold,
      templateId: MOVING_TEMPLATE.templateId,
    });
    await source.press('Control+z');
    await expect(source).toHaveValue('');
    expect(await readAuthoringDraft(page)).toBeNull();
    await source.fill(VALID_SOURCE);
    await expect.poll(() => readAuthoringDraft(page)).toEqual(expect.objectContaining({
      version: 1,
      rawText: VALID_SOURCE,
    }));
    await page.getByTestId('personal-workspace-authoring-tab-result').click();
    await expect(page.getByTestId('personal-workspace-authoring-artifact-result')).toBeVisible();
    await page.getByTestId('personal-workspace-authoring-review-open').click();
    const review = page.getByTestId('personal-workspace-authoring-review');
    await expect(review).toBeVisible();
    await expect(review.getByTestId('personal-workspace-authoring-preview')).toContainText('행정 준비');
    await expect(review.getByTestId('personal-workspace-authoring-preview')).toContainText('전입 신고 준비');
    await review.getByRole('button', { name: '닫기', exact: true }).click();
    await expect(review).toHaveCount(0);
    const lossConfirm = page.getByTestId('personal-workspace-authoring-loss-confirm');
    if (await lossConfirm.count()) await lossConfirm.check();
    await page.getByTestId('personal-workspace-authoring-folder').selectOption({ label: '미분류' });
    await page.getByTestId('personal-workspace-authoring-save').click();
    await expect(page.getByTestId('personal-workspace-authoring-status'))
      .toHaveAttribute('data-status', 'success');
    const receipt = page.getByTestId('personal-workspace-authoring-receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt).toHaveAttribute('data-product-receipt-only', 'true');
    await expect(receipt).toContainText('저장했어요');
    await expect(receipt).toContainText('1개 할 일');
    await expect(receipt).toContainText('개인공간에 저장했습니다');
    await expect(receipt).toContainText('입력한 그대로 보관');
    await expect(page.locator('#personal-workspace-authoring-receipt-title'))
      .toHaveText('이사 준비');
    await expect(page.locator('#personal-workspace-authoring-receipt-title')).toBeFocused();
    await expect(page.getByTestId('personal-workspace-authoring-mobile-stage-nav')).toHaveCount(0);
    await expect(page.getByTestId('personal-workspace-authoring-save')).toHaveCount(0);
    await expect(receipt.locator('[data-product-primary]')).toHaveCount(1);
    await expect.poll(() => readAuthoringDraft(page)).toBeNull();

    const committedState = await readPocState(page);
    expect(committedState.revision).toBe(1);
    expect(committedState.authoredFlows).toHaveLength(1);
    const authoredFlow = committedState.authoredFlows?.[0];
    expect(authoredFlow).toBeTruthy();
    if (!authoredFlow) throw new Error('작성 Flow가 state에 없습니다.');
    expect(authoredFlow.origin).toBe('authoring-handoff');
    expect(authoredFlow.title).toBe('이사 준비');
    expect(authoredFlow.authoring.rawText).toBe(VALID_SOURCE);
    expect(authoredFlow.authoring.sourceFingerprint).toMatch(/^raw-v1:/u);
    expect(authoredFlow.authoring.parsedItems?.[0]).toEqual(expect.objectContaining({
      place: '주민센터',
      completionCriteria: '전입 신고 접수를 마쳤다',
    }));
    expect(committedState.authoringReceipts).toEqual([
      expect.objectContaining({ flowRef: authoredFlow.ref }),
    ]);
    const authoredMembership = committedState.memberships.find(
      (entry) => entry.member === 'saved_flow' && entry.memberRef === authoredFlow.ref,
    );
    expect(authoredMembership).toBeTruthy();
    expect(authoredMembership?.folderId).toBeUndefined();

    await page.getByTestId('personal-workspace-authoring-open').click();
    await page.waitForURL((url) => (
      url.pathname === '/my' && url.search === '?personalWorkspacePoc=v1'
    ));
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    await expect(page.getByTestId('personal-workspace-flow-detail')).toBeVisible();
    await page.getByTestId('personal-workspace-authored-source').locator('summary').click();
    await expect(page.getByTestId('personal-workspace-authored-source')).toContainText(VALID_SOURCE);
    await page.getByTestId('my-plan-library-back').click();
    const authoredCard = page.locator(
      '[data-testid="personal-workspace-flow-card"][data-origin="authoring-handoff"]',
    );
    await expect(authoredCard).toHaveCount(1);
    await expect(authoredCard).toContainText('이사 준비');
    await authoredCard.locator('[data-personal-workspace-flow-open-trigger]').click();
    await expect(page.getByTestId('personal-workspace-flow-detail')).toBeVisible();

    await page.getByTestId('my-plan-todo-detail-link')
      .filter({ hasText: '전입 신고 준비' })
      .click();
    const itemDetail = page.getByTestId('personal-workspace-flow-item-detail');
    await expect(itemDetail).toContainText('전입 신고 준비');
    await expect(itemDetail).toContainText('원문 일정');
    await itemDetail.getByRole('button', { name: '이동', exact: true }).click();
    await page.getByTestId('personal-workspace-date-target-0').click();
    await expectSaved(page);
    await page.getByTestId('my-plan-library-back').click();

    await openToday(page);
    let row = taskRow(page, '전입 신고 준비');
    await expect(row).toBeVisible();
    await row.getByTestId('personal-workspace-complete').click();
    await expectSaved(page);
    await expect(row.getByTestId('personal-workspace-complete'))
      .toHaveAttribute('aria-pressed', 'true');
    await row.getByText('전입 신고 준비', { exact: true }).click();
    const completionSheet = page.getByTestId('personal-workspace-item-sheet');
    await expect(completionSheet).toBeVisible();
    await completionSheet.getByRole('button', { name: '다시 열기', exact: true }).click();
    await expectSaved(page);
    await expect(page.getByTestId('my-plan-todo-row').filter({ hasText: '전입 신고 준비' })
      .getByTestId('my-plan-todo-checkbox'))
      .toHaveAttribute('aria-checked', 'false');
    await page.getByTestId('personal-workspace-item-sheet-close').click();
    await page.getByTestId('my-plan-library-back').click();
    row = taskRow(page, '전입 신고 준비');
    await expect(row.getByTestId('personal-workspace-complete'))
      .toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('personal-workspace-undo')).toBeEnabled();

    const successfulRaw = await readPocRaw(page);
    const successfulState = await readPocState(page);
    const authoredItemRef = authoredFlow.items[0]?.ref;
    expect(authoredItemRef).toBeTruthy();
    if (!authoredItemRef) throw new Error('작성 Flow의 실행 항목이 없습니다.');
    expect(successfulState.placements[authoredItemRef]?.scheduleMode)
      .toBe('fixed_date');
    expect(successfulState.completions[authoredItemRef]).toBeUndefined();
    expect(successfulState.undo).toBeTruthy();

    await page.reload();
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    await expect(page.getByTestId('personal-workspace-transaction-status')).toContainText('복원');
    expect(await readPocRaw(page)).toBe(successfulRaw);
    expect((await readPocState(page)).authoredFlows?.[0]?.authoring.rawText).toBe(VALID_SOURCE);
    await expect(page.getByTestId('personal-workspace-flow-detail')).toContainText('이사 준비');
    await expect(page.getByTestId('personal-workspace-authored-source')).toContainText(VALID_SOURCE);

    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('P2-C 네 결과와 16속성 inline 편집, 정확 재진입, 의존 pair, near-miss가 한 원문에서 동작한다', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(AUTHORING_URL);
    await expect(page.getByTestId('personal-workspace-authoring-shell')).toBeVisible();
    const operatingBefore = await readNonPocStorage(page);
    const stateBefore = await readPocRaw(page);
    const sourceText = [
      '# 기차 여행',
      '## 예약',
      '- [ ] 기차 예약',
      '  - 날짜: 2026-09-10',
      '  - 장소: 서울역',
      '  - 완료 기준: 예약 번호를 확인했다',
      '  - 자료: https://example.com/train',
    ].join('\n');
    const source = await startAuthoringWithSource(page, sourceText);

    await page.getByTestId('personal-workspace-authoring-tab-result').click();
    for (const view of ['text', 'todo', 'calendar', 'sheet'] as const) {
      const tab = page.getByTestId(`personal-workspace-result-view-${view}`);
      await expect(tab).toBeVisible();
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
    }
    await expect(page.getByTestId('personal-workspace-result-sheet-panel')).toBeVisible();
    await expect(page.getByTestId('personal-workspace-result-sheet-panel')).toContainText('기차 예약');
    await page.getByTestId('personal-workspace-result-view-text').click();
    await expect(page.getByTestId('personal-workspace-result-txt-copy')).toBeVisible();

    await page.getByTestId('personal-workspace-authoring-tab-input').click();
    const openRootHelper = async () => {
      await source.focus();
      await source.press('Control+Home');
      await source.press('ArrowDown');
      await source.press('ArrowDown');
      const anchor = page.getByTestId('personal-workspace-authoring-helper-anchor');
      await expect(anchor).toBeVisible();
      await anchor.click();
      await expect(page.getByTestId('personal-workspace-authoring-helper-menu')).toBeVisible();
    };

    await openRootHelper();
    await expect(page.locator('[data-property-support]')).toHaveCount(16);
    await expect(page.locator('[data-property-support="editable"]')).toHaveCount(16);
    await expect(page.getByTestId('personal-workspace-authoring-property-time')).toHaveAttribute('data-property-editor', 'native-time');
    await expect(page.getByTestId('personal-workspace-authoring-property-duration')).toHaveAttribute('data-property-support', 'editable');
    await page.getByTestId('personal-workspace-authoring-property-focus-date').click();
    await expect(page.getByTestId('personal-workspace-authoring-helper-menu')).toHaveCount(0);
    expect(await source.evaluate((element) => {
      const textarea = element as HTMLTextAreaElement;
      return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
    })).toBe('2026-09-10');

    await openRootHelper();
    await page.getByTestId('personal-workspace-authoring-property-edit-time').click();
    const propertyInput = page.getByTestId('personal-workspace-authoring-property-input');
    await expect(page.getByTestId('personal-workspace-live-editor-inline-panel').getByTestId('personal-workspace-authoring-property-editor')).toBeVisible();
    await expect(propertyInput).toHaveAttribute('type', 'time');
    await expect(propertyInput).toHaveValue('');
    await propertyInput.fill('10:30');
    await page.getByTestId('personal-workspace-authoring-property-apply').click();
    await expect(source).toHaveValue(`${sourceText}\n  - 시간: 10:30`);
    await source.press('Control+z');
    await expect(source).toHaveValue(sourceText);

    await openRootHelper();
    await page.getByTestId('personal-workspace-authoring-property-edit-timezone').click();
    await expect(page.getByTestId('personal-workspace-authoring-dependent-property-surface')).toBeVisible();
    await expect(page.getByTestId('personal-workspace-authoring-property-time')).toHaveValue('');
    await expect(page.getByTestId('personal-workspace-authoring-property-timezone')).toHaveValue('Asia/Seoul');
    await page.getByTestId('personal-workspace-authoring-property-apply').click();
    await expect(source).toHaveValue(sourceText);
    await expect(page.getByTestId('personal-workspace-authoring-status')).toContainText('입력 형식');
    await page.getByTestId('personal-workspace-authoring-property-cancel').click();
    await openRootHelper();
    await page.getByTestId('personal-workspace-authoring-property-edit-time').click();
    await propertyInput.fill('09:00');
    await page.getByTestId('personal-workspace-authoring-property-apply').click();
    await openRootHelper();
    await page.getByTestId('personal-workspace-authoring-property-edit-timezone').click();
    await page.getByTestId('personal-workspace-authoring-property-timezone').fill('Asia/Seoul');
    await page.getByTestId('personal-workspace-authoring-property-apply').click();
    await expect(source).toHaveValue(`${sourceText}\n  - 시간: 09:00\n  - 시간대: Asia/Seoul`);

    await openRootHelper();
    await page.getByTestId('personal-workspace-authoring-property-edit-subcheck').click();
    await propertyInput.fill('표 확인하기');
    await page.getByTestId('personal-workspace-authoring-property-apply').click();
    await expect(source).toHaveValue(/  - \[ \] 표 확인하기/u);
    await openRootHelper();
    await page.getByTestId('personal-workspace-authoring-subcheck-focus-4').click();
    expect(await source.evaluate((element) => {
      const textarea = element as HTMLTextAreaElement;
      return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
    })).toBe('표 확인하기');

    const nearMissSource = `${sourceText}\n- [] 짐 챙기기`;
    await source.fill(nearMissSource);
    await page.getByTestId('personal-workspace-authoring-tab-result').click();
    await page.getByTestId('personal-workspace-authoring-issues').click();
    const review = page.getByTestId('personal-workspace-authoring-review');
    await expect(review.getByTestId('personal-workspace-authoring-near-miss-recovery')).toContainText('짐 챙기기');
    const rawBeforeCancel = await readAuthoringDraft(page);
    const callsBeforeCancel = await readDocumentMutationCount(page);
    await page.keyboard.press('Escape');
    await expect(source).toHaveValue(nearMissSource);
    expect(await readAuthoringDraft(page)).toEqual(rawBeforeCancel);
    expect(await readDocumentMutationCount(page)).toBe(callsBeforeCancel);

    await page.getByTestId('personal-workspace-authoring-review-open').click();
    await page.getByTestId('personal-workspace-authoring-near-miss-repair-8').click();
    await expect(source).toHaveValue(`${sourceText}\n- [ ] 짐 챙기기`);
    await source.press('Control+z');
    await expect(source).toHaveValue(nearMissSource);

    expect(await readPocRaw(page)).toBe(stateBefore);
    expect(await readNonPocStorage(page)).toEqual(operatingBefore);
    expectOnlyPocStorageMutations(calls);
    expect(calls.filter((call) => call.key === POC_STATE_KEY)).toEqual([]);
  });

  test('P2-C inline·dependent 속성 surface가 지정 5개 viewport에서 넘침과 가림 없이 취소된다', async ({ page }) => {
    test.setTimeout(120_000);
    const calls: StorageMutation[] = [];
    const errors: string[] = [];
    await installFixturesAndAudit(page, calls);
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    const operatingBefore = await page.goto(AUTHORING_URL).then(() => readNonPocStorage(page));
    const viewports = [
      { label: '390x844', width: 390, height: 844 },
      { label: '375x812', width: 375, height: 812 },
      { label: '844x390', width: 844, height: 390 },
      { label: '1024x768', width: 1024, height: 768 },
      { label: '1440x900', width: 1440, height: 900 },
    ] as const;
    const screenshotDir = path.join(process.cwd(), 'docs', 'content-audit', '2026-09-03-flowme-integrated-poc-p2c-evidence-assets');
    mkdirSync(screenshotDir, { recursive: true });

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(AUTHORING_URL);
      const sourceText = '# 여행\n## 예약\n- [ ] 기차 예약\n  - 날짜: 2026-09-10';
      const source = await startAuthoringWithSource(page, sourceText);
      const openRootHelper = async () => {
        if (viewport.width < 1024 && await page.getByTestId('personal-workspace-authoring-tab-input').count()) {
          await page.getByTestId('personal-workspace-authoring-tab-input').click();
        }
        await source.focus();
        await source.press('Control+Home');
        await source.press('ArrowDown');
        await source.press('ArrowDown');
        await page.getByTestId('personal-workspace-authoring-helper-anchor').click();
      };

      await openRootHelper();
      await page.getByTestId('personal-workspace-authoring-property-edit-duration').click();
      const inline = page.getByTestId('personal-workspace-live-editor-inline-panel');
      await expect(inline).toBeVisible();
      await inline.scrollIntoViewIfNeeded();
      expect(await inline.evaluate((element) => getComputedStyle(element).position)).toBe('static');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.keyboard.press('Escape');
      await expect(inline).toHaveCount(0);
      await expect(source).toHaveValue(sourceText);

      await openRootHelper();
      await page.getByTestId('personal-workspace-authoring-property-edit-timezone').click();
      const dependent = page.getByTestId('personal-workspace-authoring-dependent-property-surface');
      await expect(dependent).toBeVisible();
      const rect = await dependent.evaluate((element) => {
        const value = element.getBoundingClientRect();
        return { left: value.left, top: value.top, right: value.right, bottom: value.bottom };
      });
      expect(rect.left, viewport.label).toBeGreaterThanOrEqual(0);
      expect(rect.top, viewport.label).toBeGreaterThanOrEqual(0);
      expect(rect.right, viewport.label).toBeLessThanOrEqual(viewport.width);
      expect(rect.bottom, viewport.label).toBeLessThanOrEqual(viewport.height);
      await page.screenshot({ path: path.join(screenshotDir, `authoring-property-${viewport.label}.png`), fullPage: false });
      await page.keyboard.press('Escape');
      await expect(dependent).toHaveCount(0);
      await expect(source).toHaveValue(sourceText);
    }

    expect(errors).toEqual([]);
    expect(await readNonPocStorage(page)).toEqual(operatingBefore);
    expectOnlyPocStorageMutations(calls);
    expect(calls.filter((call) => call.key === POC_STATE_KEY)).toEqual([]);
  });

  test('잘못된 날짜, 취소, Escape, 비어 있지 않은 원문의 템플릿, 저장 실패는 state를 바꾸지 않고 손상 payload는 닫힌다', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(WORKSPACE_URL);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
    const operatingBefore = await readNonPocStorage(page);
    await page.getByTestId('personal-workspace-create-flow').click();
    await page.waitForURL(AUTHORING_URL);
    await expect(page.getByTestId('personal-workspace-authoring-shell')).toBeVisible();

    const baselineRaw = await readPocRaw(page);
    const baselineRevision = baselineRaw === null
      ? 0
      : (JSON.parse(baselineRaw) as PocStateShape).revision;

    let source = await startAuthoringWithSource(page, '내비게이션으로 취소할 원문');
    await page.getByRole('link', { name: '돌아가기', exact: true }).click();
    await page.waitForURL((url) => (
      url.pathname === '/my' && url.search === '?personalWorkspacePoc=v1'
    ));
    await expectPocStateUnchanged(page, baselineRaw, baselineRevision);
    await page.getByTestId('personal-workspace-create-flow').click();
    await page.waitForURL((url) => (
      url.pathname === '/flows/new' && url.search === '?personalWorkspacePoc=v1'
    ));
    source = page.getByTestId('personal-workspace-live-editor-textarea');
    await expect(source).toHaveValue('내비게이션으로 취소할 원문');
    await expect(page.getByTestId('personal-workspace-authoring-status'))
      .toHaveAttribute('data-status', 'success');
    expect(await readAuthoringDraft(page)).toEqual(expect.objectContaining({
      version: 1,
      rawText: '내비게이션으로 취소할 원문',
    }));
    await expectPocStateUnchanged(page, baselineRaw, baselineRevision);

    await source.fill(INVALID_DATE_SOURCE);
    await page.getByTestId('personal-workspace-authoring-tab-result').click();
    const issues = page.getByTestId('personal-workspace-authoring-issues');
    await expect(issues).toBeVisible();
    await issues.click();
    const review = page.getByTestId('personal-workspace-authoring-review');
    await expect(review).toBeVisible();
    await expect(review).toContainText('기준일');
    expect(await readAuthoringDraft(page)).toEqual(expect.objectContaining({
      rawText: INVALID_DATE_SOURCE,
    }));
    await expectPocStateUnchanged(page, baselineRaw, baselineRevision);

    const callsBeforeEscape = await readDocumentMutationCount(page);
    await page.keyboard.press('Escape');
    await expect(review).toHaveCount(0);
    await expect(page.getByTestId('personal-workspace-authoring-status'))
      .toHaveAttribute('data-status', 'canceled');
    await page.getByTestId('personal-workspace-authoring-tab-input').click();
    await expect(source).toHaveValue(INVALID_DATE_SOURCE);
    expect(await readDocumentMutationCount(page)).toBe(callsBeforeEscape);

    await source.fill('취소해도 남아야 하는 원문');
    const callsBeforeTemplateAttempt = await readDocumentMutationCount(page);
    await page.getByTestId('personal-workspace-authoring-template-picker-toggle').click();
    await expect(page.getByTestId('personal-workspace-authoring-template-picker')).toHaveCount(0);
    await expect(page.getByTestId('personal-workspace-authoring-status'))
      .toHaveAttribute('data-status', 'canceled');
    await expect(source).toHaveValue('취소해도 남아야 하는 원문');
    expect(await readAuthoringDraft(page)).toEqual(expect.objectContaining({
      rawText: '취소해도 남아야 하는 원문',
    }));
    expect(await readDocumentMutationCount(page)).toBe(callsBeforeTemplateAttempt);
    await expectPocStateUnchanged(page, baselineRaw, baselineRevision);

    await source.fill(VALID_SOURCE);
    await page.getByTestId('personal-workspace-authoring-tab-result').click();
    await expect(page.getByTestId('personal-workspace-authoring-artifact-result')).toBeVisible();
    const lossConfirm = page.getByTestId('personal-workspace-authoring-loss-confirm');
    if (await lossConfirm.count()) await lossConfirm.check();
    await page.getByTestId('personal-workspace-authoring-folder').selectOption({ label: '미분류' });
    await page.evaluate(() => {
      (
        window as Window & typeof globalThis & {
          __personalWorkspacePocFailNextWrite?: boolean;
        }
      ).__personalWorkspacePocFailNextWrite = true;
    });
    await page.getByTestId('personal-workspace-authoring-save').click();
    await expect(page.getByTestId('personal-workspace-authoring-status'))
      .toHaveAttribute('data-status', 'failure');
    await expectPocStateUnchanged(page, baselineRaw, baselineRevision);
    expect(await readAuthoringDraft(page)).toEqual(expect.objectContaining({
      rawText: VALID_SOURCE,
    }));
    await expect(page.getByTestId('personal-workspace-authoring-receipt')).toHaveCount(0);

    await page.evaluate(
      (key) => window.localStorage.setItem(key, '{broken'),
      POC_AUTHORING_DRAFT_KEY,
    );
    await page.reload();
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        pathname: url.pathname,
        hasPocGate: url.searchParams.has('personalWorkspacePoc'),
      };
    }).toEqual({ pathname: '/my', hasPocGate: false });
    await expect(page.getByTestId('personal-workspace-authoring-shell')).toHaveCount(0);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toHaveCount(0);
    expect(await page.evaluate(
      (key) => window.localStorage.getItem(key),
      POC_AUTHORING_DRAFT_KEY,
    )).toBe('{broken');

    await page.evaluate(
      ([draftKey, stateKey]) => {
        window.localStorage.removeItem(draftKey);
        window.localStorage.setItem(stateKey, '{broken');
      },
      [POC_AUTHORING_DRAFT_KEY, POC_STATE_KEY],
    );
    await page.goto(AUTHORING_URL);
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        pathname: url.pathname,
        hasPocGate: url.searchParams.has('personalWorkspacePoc'),
      };
    }).toEqual({ pathname: '/my', hasPocGate: false });
    await expect(page.getByTestId('personal-workspace-authoring-shell')).toHaveCount(0);
    await expect(page.getByTestId('personal-workspace-poc-shell')).toHaveCount(0);
    expect(await page.evaluate(
      (key) => window.localStorage.getItem(key),
      POC_STATE_KEY,
    )).toBe('{broken');
    expect(await readNonPocStorage(page)).toEqual(operatingBefore);
    expect(calls.filter((call) => call.method === 'clear')).toEqual([]);
    expect(calls.filter((call) => (
      (call.method === 'setItem' || call.method === 'removeItem')
      && !call.key?.startsWith(POC_PREFIX)
    ))).toEqual([]);
  });

  test('P2-A 복수 사본, 월간 결과, TXT와 CSV 다운로드는 표시만 바꾸고 운영 bytes를 보존한다', async ({ page }) => {
    test.setTimeout(120_000);
    const calls: StorageMutation[] = [];
    const errors: string[] = [];
    await installFixturesAndAudit(page, calls);
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    const viewports = [
      { label: '320x700', width: 320, height: 700 },
      { label: '390x844', width: 390, height: 844 },
      { label: '375x812', width: 375, height: 812 },
      { label: '844x390', width: 844, height: 390 },
      { label: '1024x768', width: 1024, height: 768 },
      { label: '1440x900', width: 1440, height: 900 },
    ] as const;
    const screenshotDir = path.join(
      process.cwd(),
      'docs',
      'content-audit',
      '2026-09-03-flowme-integrated-poc-p2a-evidence-assets',
    );
    mkdirSync(screenshotDir, { recursive: true });
    let operatingBefore: Record<string, string> | undefined;

    for (const [index, viewport] of viewports.entries()) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(WORKSPACE_URL);
      await expect(page.getByTestId('personal-workspace-poc-shell')).toBeVisible();
      operatingBefore ??= await readNonPocStorage(page);

      const copies = page.locator(
        '[data-testid="personal-workspace-flow-card"][data-origin="canonical-personal-copy"]',
      );
      await expect(copies).toHaveCount(2);
      await expect(page.getByTestId('personal-workspace-flow-card').filter({ hasText: '사본 1 · 개인 사본 Flow' })).toHaveCount(1);
      await expect(page.getByTestId('personal-workspace-flow-card').filter({ hasText: '사본 2 · 개인 사본 Flow' })).toHaveCount(1);

      const firstCopy = page.getByTestId('personal-workspace-flow-card')
        .filter({ hasText: '사본 1 · 개인 사본 Flow' });
      await firstCopy.locator('button[data-personal-workspace-flow-open-trigger]').click();
      const detail = page.getByTestId('personal-workspace-flow-detail');
      await expect(detail.getByRole('heading', { name: '사본 1 · 개인 사본 Flow' })).toBeVisible();
      await detail.getByTestId('personal-workspace-alternate-results').locator('summary').click();
      const result = detail.getByTestId('personal-workspace-result-surface');
      await expect(result).toBeVisible();

      if (index === 0) {
        const txtDownloadPromise = page.waitForEvent('download');
        await result.getByTestId('personal-workspace-result-txt-download').click();
        const txtDownload = await txtDownloadPromise;
        const txtPath = await txtDownload.path();
        expect(txtPath).toBeTruthy();
        const txtBytes = readFileSync(txtPath!);
        const txt = txtBytes.toString('utf8');
        expect([...txtBytes.subarray(0, 3)]).not.toEqual([0xef, 0xbb, 0xbf]);
        expect(txt).not.toContain('\r');
        expect(txt.endsWith('\n')).toBe(true);
        expect(txt.endsWith('\n\n')).toBe(false);
        await expect(result.getByTestId('personal-workspace-result-txt-copy-status')).toContainText('데이터는 바뀌지 않았어요');
      }

      await result.getByTestId('personal-workspace-result-view-calendar').click();
      const calendar = result.getByTestId('personal-workspace-result-calendar-panel');
      await expect(calendar).toHaveAttribute('data-calendar-date-policy', 'effective-date-execution-first');
      await expect(calendar.locator('[aria-label$="날짜 선택"] > *')).toHaveCount(42);
      const monthBefore = await calendar.getByRole('heading', { level: 3 }).first().textContent();
      await calendar.getByRole('button', { name: '다음 달' }).click();
      await expect(calendar.getByRole('heading', { level: 3 }).first()).not.toHaveText(monthBefore ?? '');

      await result.getByTestId('personal-workspace-result-view-sheet').click();
      if (index === 0) {
        const csvDownloadPromise = page.waitForEvent('download');
        await result.getByTestId('personal-workspace-result-csv-download').click();
        const csvDownload = await csvDownloadPromise;
        const csvPath = await csvDownload.path();
        expect(csvPath).toBeTruthy();
        const csvBytes = readFileSync(csvPath!);
        expect([...csvBytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
        const csv = csvBytes.subarray(3).toString('utf8');
        expect(csv).toContain('\r\n');
        expect(csv.replaceAll('\r\n', '')).not.toContain('\n');
        expect(csv.endsWith('\r\n')).toBe(true);
        expect(csv.endsWith('\r\n\r\n')).toBe(false);
        await expect(result.getByTestId('personal-workspace-result-csv-download-status')).toContainText('데이터는 바뀌지 않았어요');
      }

      expect(await page.evaluate(() => (
        document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )), viewport.label).toBe(true);
      await page.screenshot({
        path: path.join(screenshotDir, `react-result-${viewport.label}.png`),
        fullPage: false,
      });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(AUTHORING_URL);
    const entryInput = page.getByTestId('personal-workspace-entry-input');
    await entryInput.fill('개인 사본 Flow');
    const entryResults = page.getByTestId('personal-workspace-entry-result');
    await expect(entryResults).toHaveCount(2);
    await expect(entryResults.filter({ hasText: '사본 1 · 개인 사본 Flow' })).toHaveCount(1);
    await expect(entryResults.filter({ hasText: '사본 2 · 개인 사본 Flow' })).toHaveCount(1);
    await entryResults.filter({ hasText: '사본 1 · 개인 사본 Flow' }).click();
    await expect(page.getByRole('heading', { name: '사본 1 · 개인 사본 Flow' })).toBeVisible();
    await expect(page.getByTestId('personal-workspace-entry-open-flow')).toHaveAttribute(
      'href',
      /personalWorkspacePoc=v1#flow=saved-flow%3Acopy%253Aone/u,
    );

    expect(operatingBefore).toBeDefined();
    expect(await readNonPocStorage(page)).toEqual(operatingBefore);
    expectOnlyPocStorageMutations(calls);
    expect(errors).toEqual([]);
  });

  test('P2-A 표와 위험한 장문 입력은 SourceRow 또는 원문 fallback으로만 보이며 실행 항목을 만들지 않는다', async ({ page }) => {
    test.setTimeout(120_000);
    const calls: StorageMutation[] = [];
    const errors: string[] = [];
    await installFixturesAndAudit(page, calls);
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    const safeTable = '순서\t작품\t자료\n1\t어린 왕자\thttps://example.com/1\n2\t오만과 편견\thttps://example.com/2';
    const viewports = [
      { label: '320x700', width: 320, height: 700 },
      { label: '390x844', width: 390, height: 844 },
      { label: '375x812', width: 375, height: 812 },
      { label: '844x390', width: 844, height: 390 },
      { label: '1024x768', width: 1024, height: 768 },
      { label: '1440x900', width: 1440, height: 900 },
    ] as const;
    const screenshotDir = path.join(
      process.cwd(),
      'docs',
      'content-audit',
      '2026-09-03-flowme-integrated-poc-p2a-evidence-assets',
    );
    mkdirSync(screenshotDir, { recursive: true });
    let operatingBefore: Record<string, string> | undefined;
    let mainStateBefore: string | null | undefined;

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(AUTHORING_URL);
      operatingBefore ??= await readNonPocStorage(page);
      if (mainStateBefore === undefined) mainStateBefore = await readPocRaw(page);
      await startAuthoringWithSource(page, safeTable);
      if (viewport.width < 1024) await page.getByTestId('personal-workspace-authoring-tab-result').click();
      const adapter = page.getByTestId('personal-workspace-authoring-lossless-table');
      await expect(adapter).toBeVisible();
      await expect(adapter).toHaveAttribute('data-source-mutation-count', '0');
      await expect(adapter).toContainText('2개 SourceRow');
      await expect(adapter).toContainText('표 행은 자료로만 유지됩니다');
      await expect(adapter.locator('tbody tr')).toHaveCount(2);
      expect(await page.evaluate(() => (
        document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )), viewport.label).toBe(true);
      await page.screenshot({
        path: path.join(screenshotDir, `react-lossless-table-${viewport.label}.png`),
        fullPage: false,
      });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(AUTHORING_URL);
    const source = await startAuthoringWithSource(page, '열1,열2\n1,=SUM(A1)');
    await expect(source).toHaveValue('열1,열2\n1,=SUM(A1)');
    await page.getByTestId('personal-workspace-authoring-tab-result').click();
    const fallback = page.getByTestId('personal-workspace-authoring-lossless-raw');
    await expect(fallback).toBeVisible();
    await expect(fallback).toHaveAttribute('data-lossless-status', 'raw-fallback');
    await expect(fallback).toHaveAttribute('data-source-mutation-count', '0');
    await expect(fallback).toContainText('구조를 추측하지 않고 원문으로 유지');

    expect(await readPocRaw(page)).toBe(mainStateBefore);
    expect(calls.filter((call) => call.key === POC_STATE_KEY)).toEqual([]);
    expect(calls.some((call) => call.key === POC_AUTHORING_DRAFT_KEY)).toBe(true);
    expect(await readNonPocStorage(page)).toEqual(operatingBefore);
    expectOnlyPocStorageMutations(calls);
    expect(errors).toEqual([]);
  });

  test('작성 앱 6개 viewport에서 overflow, 오류, 가려진 주행동이 없다', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    const viewports = [
      { label: '320x700', width: 320, height: 700 },
      { label: '390x844', width: 390, height: 844 },
      { label: '375x812', width: 375, height: 812 },
      { label: '844x390', width: 844, height: 390 },
      { label: '1024x768', width: 1024, height: 768 },
      { label: '1440x900', width: 1440, height: 900 },
    ] as const;
    const screenshotDir = path.join(
      process.cwd(),
      'docs',
      'content-audit',
      '2026-09-02-flowme-integrated-flow-poc-local-validation-assets',
    );
    mkdirSync(screenshotDir, { recursive: true });
    let operatingBefore: Record<string, string> | undefined;
    let mainStateBefore: string | null | undefined;

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(AUTHORING_URL);
      await expect(page.getByTestId('personal-workspace-authoring-shell')).toBeVisible();
      operatingBefore ??= await readNonPocStorage(page);
      if (mainStateBefore === undefined) mainStateBefore = await readPocRaw(page);
      await startAuthoringWithSource(page, VALID_SOURCE);

      if (viewport.width < 1024) {
        const resultTab = page.getByTestId('personal-workspace-authoring-tab-result');
        await expectPrimaryActionUsable(resultTab);
        await resultTab.click();
      }

      await expect(page.getByTestId('personal-workspace-authoring-artifact-result')).toBeVisible();
      const lossConfirm = page.getByTestId('personal-workspace-authoring-loss-confirm');
      if (await lossConfirm.count()) await lossConfirm.check();
      const saveAction = page.getByTestId('personal-workspace-authoring-save');
      await expectPrimaryActionUsable(saveAction);
      expect(await page.evaluate(() => (
        document.documentElement.scrollWidth <= document.documentElement.clientWidth
      ))).toBe(true);
      await page.screenshot({
        path: path.join(screenshotDir, `authoring-${viewport.label}.png`),
        fullPage: false,
      });
    }

    expect(errors).toEqual([]);
    expectOnlyPocStorageMutations(calls);
    expect(await readPocRaw(page)).toBe(mainStateBefore);
    expect(calls.filter((call) => call.key === POC_STATE_KEY)).toEqual([]);
    expect(calls.some((call) => call.key === POC_AUTHORING_DRAFT_KEY)).toBe(true);
    expect(await readNonPocStorage(page)).toEqual(operatingBefore);
  });

  test('P2-B 반복 3회가 네 결과를 공유하고 한 회차 이동·완료·Undo·reload만 shadow state에 남는다', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(AUTHORING_URL);
    const operatingBefore = await readNonPocStorage(page);
    const source = [
      '# P2-B 반복 검증',
      '',
      '## 아침',
      '- [ ] 스트레칭',
      '  - 설명: 몸을 천천히 깨운다',
      '  - 날짜: 2026-09-03',
      '  - 시간: 07:30',
      '  - 시간대: Asia/Seoul',
      '  - 장소: 거실',
      '  - 소요 시간: 15분',
      '  - 반복: 매일',
      '  - 반복 종료: 3회',
      '  - 실행 조건: 기상 직후',
      '  - 완료 기준: 세 동작 완료',
      '  - 자료: [안내](https://example.com/stretch)',
      '  - 출처: [기록](https://example.com/source)',
      '  - 주의: 통증이 나면 중단',
      '  - [ ] 목 돌리기',
      '일반 문장은 원문 메모로 보존한다.',
    ].join('\n');
    await startAuthoringWithSource(page, source);
    await page.getByTestId('personal-workspace-authoring-tab-result').click();
    const preview = page.getByTestId('personal-workspace-authoring-artifact-result');
    await expect(preview).toBeVisible();
    await expect(preview.getByTestId('personal-workspace-result-surface'))
      .toHaveAttribute('data-result-item-refs', /poc-occurrence-series:v1/u);
    await preview.getByTestId('personal-workspace-result-view-todo').click();
    await expect(preview.getByTestId('personal-workspace-result-item-row')).toHaveCount(3);
    await preview.getByTestId('personal-workspace-result-view-calendar').click();
    await expect(preview.getByTestId('personal-workspace-result-calendar-panel').locator('[aria-label$="날짜 선택"] > *')).toHaveCount(42);
    await preview.getByTestId('personal-workspace-result-view-sheet').click();
    await expect(preview.locator('[data-sheet-row-id^="poc-occurrence-series:v1:"]')).toHaveCount(3);
    await preview.getByTestId('personal-workspace-result-view-text').click();
    await expect(preview.getByTestId('personal-workspace-result-text-panel')).toContainText('3. ☐ 스트레칭 · 3회차');
    await expect(preview.getByTestId('personal-workspace-result-text-panel')).toContainText('[원문 메모]');

    const lossConfirm = page.getByTestId('personal-workspace-authoring-loss-confirm');
    if (await lossConfirm.count()) await lossConfirm.check();
    await page.getByTestId('personal-workspace-authoring-folder').selectOption({ label: '미분류' });
    await page.getByTestId('personal-workspace-authoring-save').click();
    await expect(page.getByTestId('personal-workspace-authoring-status')).toHaveAttribute('data-status', 'success');
    await page.getByTestId('personal-workspace-authoring-open').click();
    await page.waitForURL(
      (url) => url.pathname === '/my' && url.search === '?personalWorkspacePoc=v1',
    );
    const detail = page.getByTestId('personal-workspace-flow-detail');
    await expect(detail).toContainText('P2-B 반복 검증');
    await detail.getByTestId('personal-workspace-alternate-results').locator('summary').click();
    const result = detail.getByTestId('personal-workspace-result-surface');
    await result.getByTestId('personal-workspace-result-view-todo').click();
    const manifest = JSON.parse(await result.getAttribute('data-result-item-refs') ?? '[]') as string[];
    expect(manifest).toHaveLength(3);
    const second = result.locator(`[data-testid="personal-workspace-result-item-row"][data-item-ref="${manifest[1]}"]`);
    await second.locator('input[type="date"]').fill('2026-09-08');
    await expectSaved(page);
    await second.getByRole('button', { name: '이 회차 완료' }).click();
    await expectSaved(page);
    await result.getByTestId('personal-workspace-result-view-text').click();
    await expect(result.getByTestId('personal-workspace-result-text-panel')).toContainText('2. ☑ 스트레칭 · 2회차');
    await expect(result.getByTestId('personal-workspace-result-text-panel')).toContainText('날짜: 2026-09-08');
    const successfulRaw = await readPocRaw(page);
    const successful = await readPocState(page) as PocStateShape & {
      occurrencePlacements?: Record<string, { date?: string }>;
      occurrenceCompletions?: Record<string, { status: string }>;
    };
    expect(successful.occurrencePlacements?.[manifest[1]]?.date).toBe('2026-09-08');
    expect(successful.occurrenceCompletions?.[manifest[1]]?.status).toBe('completed');
    expect(successful.placements[manifest[1]]).toBeUndefined();
    expect(successful.completions[manifest[1]]).toBeUndefined();

    await page.reload();
    await expect(page.getByTestId('personal-workspace-transaction-status')).toContainText('복원');
    expect(await readPocRaw(page)).toBe(successfulRaw);
    await page.getByTestId('personal-workspace-poc-manage').click();
    await page.getByTestId('personal-workspace-undo-mobile').click();
    await expectSaved(page);
    const undone = await readPocState(page) as PocStateShape & {
      occurrencePlacements?: Record<string, { date?: string }>;
      occurrenceCompletions?: Record<string, { status: string }>;
    };
    expect(undone.occurrencePlacements?.[manifest[1]]?.date).toBe('2026-09-08');
    expect(undone.occurrenceCompletions?.[manifest[1]]).toBeUndefined();
    expect(await readNonPocStorage(page)).toEqual(operatingBefore);
    expectOnlyPocStorageMutations(calls);
  });
});
