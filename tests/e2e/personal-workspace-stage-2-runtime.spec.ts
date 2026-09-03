import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES } from '../../lib/flow/personal-workspace-poc-authoring';
import { PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG } from '../../lib/flow/personal-workspace-poc-authoring-guide';

const WORKSPACE_URL = '/my?personalWorkspacePoc=v1';
const AUTHORING_URL = '/flows/new?personalWorkspacePoc=v1';
const POC_PREFIX = 'flow:poc:personal-workspace:v1:';
const POC_STATE_KEY = `${POC_PREFIX}state`;
const POC_AUTHORING_DRAFT_KEY = `${POC_PREFIX}authoring-draft`;
const KNOWN_SOURCE_URL = 'https://www.example.com/stage-2/known/?utm_source=e2e&b=2&a=1#part';
const KNOWN_SOURCE_URL_EQUIVALENT = 'https://www.example.com/stage-2/known?a=1&b=2';
const SENTINEL_VALUE = '  stage-2 operating sentinel \r\n exact bytes  ';

const VALID_SOURCE = [
  '# Stage 2 저장 검증',
  '- 기준일: 2026-09-10',
  '',
  '## 준비',
  '- [ ] 브라우저 검증',
  '  - 날짜: 2026-09-10',
].join('\n');

type StorageMutation = Readonly<{
  method: 'setItem' | 'removeItem' | 'clear';
  key?: string;
}>;

type RuntimePocState = Readonly<{
  revision: number;
  authoredFlows?: readonly Readonly<{
    ref: string;
    title: string;
    authoring: Readonly<{ rawText: string }>;
  }>[];
}>;

type EditorSnapshot = Readonly<{
  value: string;
  selectionStart: number;
  selectionEnd: number;
  selectionDirection: string;
  scrollTop: number;
  scrollLeft: number;
}>;

type ElementRect = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}>;

async function installFixturesAndAudit(
  page: Page,
  calls: StorageMutation[],
): Promise<void> {
  await page.exposeFunction(
    '__recordPersonalWorkspaceStage2Mutation',
    (mutation: StorageMutation) => calls.push(mutation),
  );
  await page.addInitScript(({ knownSourceUrl, sentinelValue }) => {
    const storageSet = Storage.prototype.setItem;
    const storageRemove = Storage.prototype.removeItem;
    const storageClear = Storage.prototype.clear;
    const savedAt = '2026-09-02T00:00:00.000Z';
    const anchor = '2026-09-10';
    const makeBundle = (
      slug: string,
      id: string,
      title: string,
      options: Readonly<{
        status?: 'draft' | 'published';
        sourceUrl?: string;
        itemCount?: number;
      }> = {},
    ) => ({
      flow: {
        id,
        slug,
        title,
        category: 'Stage 2 통합 검증',
        structure_type: 'timeline',
        anchor_type: 'start_date',
        status: options.status ?? 'published',
        created_at: savedAt,
        updated_at: savedAt,
        ...(options.status === 'draft'
          ? { source_title: '통합 개인 초안 원본', tags: ['내 초안'] }
          : {}),
        ...(options.sourceUrl ? { source_url: options.sourceUrl } : {}),
      },
      sections: [{ id: `${id}-section`, flow_id: id, title: '준비', order: 0 }],
      items: Array.from({ length: options.itemCount ?? 1 }, (_, index) => ({
        id: `${slug}-item-${index + 1}`,
        flow_id: id,
        section_id: `${id}-section`,
        title: `${title} 실행 ${index + 1}`,
        description: `${title} 상세 ${index + 1}`,
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
      anchor,
    });

    const bundles = [
      makeBundle(
        'stage2-map-single',
        'flow:stage2-map-single',
        '통합 단일 지도 Flow',
        { sourceUrl: knownSourceUrl, itemCount: 2 },
      ),
      makeBundle('stage2-map-multi-a', 'flow:stage2-map-multi-a', '통합 다중 A', { itemCount: 2 }),
      makeBundle('stage2-map-multi-b', 'flow:stage2-map-multi-b', '통합 다중 B', { itemCount: 2 }),
      makeBundle('stage2-draft', 'flow:stage2-draft', '통합 개인 초안 Flow', { status: 'draft' }),
      makeBundle('stage2-copy-source', 'flow:stage2-copy-source', '통합 개인 사본 Flow'),
      makeBundle('stage2-legacy', 'flow:stage2-legacy', '통합 기존 저장 Flow'),
    ];
    const fixtures: Array<[string, string]> = [
      ['flow_builder_mvp_bundles_v11', JSON.stringify(bundles)],
      ['flow:operational:sentinel', sentinelValue],
      ['flow:map:saved:stage2-single-map', JSON.stringify({
        mapId: 'stage2-single-map',
        title: '화면에 나오면 안 되는 단일 Map 제목',
        version: 'v1',
        savedAt,
        anchor,
        flowSlugs: ['stage2-map-single'],
      })],
      ['flow:map:saved:stage2-multi-map', JSON.stringify({
        mapId: 'stage2-multi-map',
        title: '통합 다중 Map',
        version: 'v1',
        savedAt,
        anchor,
        flowSlugs: ['stage2-map-multi-a', 'stage2-map-multi-b'],
      })],
      ['flow:saved:stage2-map-single', JSON.stringify(legacyRecord('stage2-map-single'))],
      ['flow:saved:stage2-map-multi-a', JSON.stringify(legacyRecord('stage2-map-multi-a'))],
      ['flow:saved:stage2-map-multi-b', JSON.stringify(legacyRecord('stage2-map-multi-b'))],
      ['flow:saved:stage2-draft', JSON.stringify(legacyRecord('stage2-draft'))],
      ['flow:saved:copy:stage2', JSON.stringify({
        schemaVersion: 2,
        slug: 'copy:stage2',
        savedAt,
        personalCopyKey: 'copy:stage2',
        sourceFlowKey: 'flow:stage2-copy-source',
        sourceFlowSlug: 'stage2-copy-source',
        sourceVersion: 'source-v1',
        lastSaveRequestId: 'request:stage2-copy',
        savedItemCount: 1,
        selectedArtifactMode: 'calendar',
        dateIntent: 'custom',
        anchor,
      })],
      ['flow:saved:stage2-legacy', JSON.stringify(legacyRecord('stage2-legacy'))],
    ];
    for (const [key, value] of fixtures) {
      storageSet.call(window.localStorage, key, value);
    }

    type AuditWindow = Window & typeof globalThis & {
      __recordPersonalWorkspaceStage2Mutation: (mutation: StorageMutation) => Promise<void>;
      __personalWorkspaceStage2Mutations: StorageMutation[];
      __personalWorkspaceStage2InputTypes?: string[];
    };
    const auditWindow = window as AuditWindow;
    auditWindow.__personalWorkspaceStage2Mutations = [];
    Storage.prototype.setItem = function auditedSetItem(key: string, value: string) {
      if (this === window.localStorage) {
        const mutation: StorageMutation = { method: 'setItem', key };
        auditWindow.__personalWorkspaceStage2Mutations.push(mutation);
        void auditWindow.__recordPersonalWorkspaceStage2Mutation(mutation);
      }
      return storageSet.call(this, key, value);
    };
    Storage.prototype.removeItem = function auditedRemoveItem(key: string) {
      if (this === window.localStorage) {
        const mutation: StorageMutation = { method: 'removeItem', key };
        auditWindow.__personalWorkspaceStage2Mutations.push(mutation);
        void auditWindow.__recordPersonalWorkspaceStage2Mutation(mutation);
      }
      return storageRemove.call(this, key);
    };
    Storage.prototype.clear = function auditedClear() {
      if (this === window.localStorage) {
        const mutation: StorageMutation = { method: 'clear' };
        auditWindow.__personalWorkspaceStage2Mutations.push(mutation);
        void auditWindow.__recordPersonalWorkspaceStage2Mutation(mutation);
      }
      return storageClear.call(this);
    };
  }, { knownSourceUrl: KNOWN_SOURCE_URL, sentinelValue: SENTINEL_VALUE });
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

async function readDocumentMutations(page: Page): Promise<StorageMutation[]> {
  return page.evaluate(() => (
    window as Window & typeof globalThis & {
      __personalWorkspaceStage2Mutations?: StorageMutation[];
    }
  ).__personalWorkspaceStage2Mutations ?? []);
}

async function readPocState(page: Page): Promise<RuntimePocState | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  }, POC_STATE_KEY);
}

async function readDraftRaw(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), POC_AUTHORING_DRAFT_KEY);
}

async function readEditorSnapshot(textarea: Locator): Promise<EditorSnapshot> {
  return textarea.evaluate((element) => {
    const input = element as HTMLTextAreaElement;
    return {
      value: input.value,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd,
      selectionDirection: input.selectionDirection,
      scrollTop: input.scrollTop,
      scrollLeft: input.scrollLeft,
    };
  });
}

async function assertStorageBoundary(
  page: Page,
  calls: StorageMutation[],
  operatingBefore: Record<string, string>,
): Promise<void> {
  await expect.poll(async () => readNonPocStorage(page)).toEqual(operatingBefore);
  expect(calls.filter((call) => call.method === 'clear')).toEqual([]);
  expect(calls.filter((call) => (
    (call.method === 'setItem' || call.method === 'removeItem')
    && !call.key?.startsWith(POC_PREFIX)
  ))).toEqual([]);
  expect(await page.evaluate(() => window.localStorage.getItem('flow:operational:sentinel')))
    .toBe(SENTINEL_VALUE);
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

async function readElementRect(locator: Locator): Promise<ElementRect> {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  });
}

function intersectionArea(left: ElementRect, right: ElementRect): number {
  const width = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
  const height = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
  return width * height;
}

async function openBlankAuthoring(page: Page): Promise<Locator> {
  await page.goto(AUTHORING_URL);
  await expect(page.getByTestId('personal-workspace-authoring-shell')).toBeVisible();
  await page.getByTestId('personal-workspace-entry-start-template').click();
  await expect(page.getByTestId('personal-workspace-authoring-template-picker')).toBeVisible();
  return page.getByTestId('personal-workspace-live-editor-textarea');
}

async function newAuditedPage(
  browser: Browser,
  viewport: Readonly<{ width: number; height: number }>,
): Promise<Readonly<{ page: Page; calls: StorageMutation[] }>> {
  const page = await browser.newPage({ viewport });
  const calls: StorageMutation[] = [];
  await installFixturesAndAudit(page, calls);
  return { page, calls };
}

test.describe('개인공간 통합 PoC Stage 2 런타임', () => {
  test('한 입력은 네 origin, known URL, invalid URL, memo를 분기하고 Map 선택은 read-only 한 transition으로 닫힌다', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(AUTHORING_URL);
    await expect(page.getByTestId('personal-workspace-authoring-shell')).toBeVisible();
    const operatingBefore = await readNonPocStorage(page);
    const input = page.getByTestId('personal-workspace-entry-input');

    await input.fill('통합');
    const results = page.getByTestId('personal-workspace-entry-result');
    await expect(results).toHaveCount(5);
    await expect(results.filter({ hasText: '통합 단일 지도 Flow' })).toHaveCount(1);
    await expect(results.filter({ hasText: '통합 다중 Map' })).toHaveCount(1);
    await expect(results.filter({ hasText: '통합 개인 초안 Flow' })).toHaveCount(1);
    await expect(results.filter({ hasText: '통합 개인 사본 Flow' })).toHaveCount(1);
    await expect(results.filter({ hasText: '통합 기존 저장 Flow' })).toHaveCount(1);
    await expect(page.getByText('화면에 나오면 안 되는 단일 Map 제목')).toHaveCount(0);
    expect(await readDocumentMutations(page)).toEqual([]);

    await input.fill(KNOWN_SOURCE_URL_EQUIVALENT);
    await expect(results).toHaveCount(1);
    await expect(results.first()).toContainText('통합 단일 지도 Flow');
    await expect(page.getByTestId('personal-workspace-entry-resolution')).not.toContainText('찾지 못했어요');
    expect(await readDocumentMutations(page)).toEqual([]);

    await input.fill('https://');
    await expect(page.getByTestId('personal-workspace-entry-resolution')).toContainText('링크 형식을 확인');
    await expect(results).toHaveCount(0);
    expect(await readDocumentMutations(page)).toEqual([]);

    await input.fill('통합 단일 지도 Flow');
    await results.first().click();
    await expect(page.locator('#personal-workspace-entry-result-heading')).toHaveText('통합 단일 지도 Flow');
    await expect(page.getByTestId('personal-workspace-entry-map-child')).toHaveCount(0);
    expect(await readDocumentMutations(page)).toEqual([]);

    await input.fill('통합 다중');
    await results.filter({ hasText: '통합 다중 Map' }).click();
    const mapSelect = page.getByTestId('personal-workspace-entry-map-child');
    await expect(mapSelect).toBeVisible();
    await expect(mapSelect).toHaveValue(/stage2-map-multi-a/u);
    await page.getByTestId('personal-workspace-entry-view-todo').click();
    await expect(page.getByTestId('personal-workspace-entry-view-todo')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('personal-workspace-entry-flow-items').locator('button').first().click();
    await expect(page.getByTestId('personal-workspace-entry-item-detail')).toBeVisible();
    const stateBeforeChildChange = await page.evaluate((key) => window.localStorage.getItem(key), POC_STATE_KEY);
    const mutationsBeforeChildChange = await readDocumentMutations(page);
    await mapSelect.selectOption({ label: '통합 다중 B' });
    await expect(page.locator('#personal-workspace-entry-result-heading')).toHaveText('통합 다중 B');
    await expect(page.locator('#personal-workspace-entry-result-heading')).toBeFocused();
    await expect(page.getByTestId('personal-workspace-entry-view-text')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('personal-workspace-entry-item-detail')).toHaveCount(0);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), POC_STATE_KEY))
      .toBe(stateBeforeChildChange);
    expect(await readDocumentMutations(page)).toEqual(mutationsBeforeChildChange);

    const exactMemo = '\t이번 주말 캠핑 준비 🙂\n준비물을 확인한다.\n';
    await input.fill(exactMemo);
    await expect(page.getByTestId('personal-workspace-entry-resolution')).toContainText('그대로 새 원문');
    await page.getByTestId('personal-workspace-entry-start-authoring').click();
    const source = page.getByTestId('personal-workspace-live-editor-textarea');
    await expect(source).toHaveValue(exactMemo);
    expect(await readDraftRaw(page)).toBe(JSON.stringify({ version: 1, rawText: exactMemo }));
    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('multi Map의 한 child만 exact hit이면 그 child를 최초 결과로 열고 write는 0건이다', async ({ page }) => {
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(AUTHORING_URL);
    const operatingBefore = await readNonPocStorage(page);
    await page.getByTestId('personal-workspace-entry-input').fill('통합 다중 B');
    const mapResult = page.getByTestId('personal-workspace-entry-result')
      .filter({ hasText: '통합 다중 Map' });
    await expect(mapResult).toHaveCount(1);
    expect(await readDocumentMutations(page)).toEqual([]);
    await mapResult.click();
    await expect(page.locator('#personal-workspace-entry-result-heading')).toHaveText('통합 다중 B');
    await expect(page.getByTestId('personal-workspace-entry-map-child')).toHaveValue(/stage2-map-multi-b/u);
    expect(await readDocumentMutations(page)).toEqual([]);
    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('정상 원문은 입력에서 결과로 바로 이동해 별도 구조 확인 없이 exact source로 저장된다', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(AUTHORING_URL);
    const operatingBefore = await readNonPocStorage(page);
    await page.getByTestId('personal-workspace-entry-input').fill(VALID_SOURCE);
    await page.getByTestId('personal-workspace-entry-start-authoring').click();
    const source = page.getByTestId('personal-workspace-live-editor-textarea');
    await expect(source).toHaveValue(VALID_SOURCE);
    await expect(page.getByTestId('personal-workspace-authoring-source-confirm')).toHaveCount(0);
    await expect(page.getByTestId('personal-workspace-live-editor-review')).toHaveCount(0);

    await page.getByTestId('personal-workspace-authoring-tab-result').click();
    await expect(page.getByTestId('personal-workspace-authoring-artifact-result')).toBeVisible();
    await expect(page.getByTestId('personal-workspace-authoring-save')).toBeEnabled();
    await page.getByTestId('personal-workspace-authoring-save').click();
    await expect(page.getByTestId('personal-workspace-authoring-status'))
      .toHaveAttribute('data-status', 'success');
    await expect(page.getByTestId('personal-workspace-authoring-receipt')).toBeVisible();
    const authored = (await readPocState(page))?.authoredFlows?.[0];
    expect(authored?.authoring.rawText).toBe(VALID_SOURCE);
    expect(await readDraftRaw(page)).toBeNull();
    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('한 source에서 현재 행만 raw이고 다른 안전한 행은 Flow 표현이며 보기 전환은 source를 바꾸지 않는다', async ({ page }) => {
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(AUTHORING_URL);
    const operatingBefore = await readNonPocStorage(page);
    await page.getByTestId('personal-workspace-entry-input').fill(VALID_SOURCE);
    await page.getByTestId('personal-workspace-entry-start-authoring').click();
    const source = page.getByTestId('personal-workspace-live-editor-textarea');
    const mutationsBeforeViewChanges = await readDocumentMutations(page);
    await expect(page.locator('[data-line="1"]')).toHaveAttribute('data-presentation-mode', 'raw');
    await expect(page.locator('[data-line="4"]')).toHaveAttribute('data-presentation-mode', 'presented');

    await source.focus();
    await page.keyboard.press('Control+Home');
    for (let index = 0; index < 4; index += 1) {
      await page.keyboard.press('ArrowDown');
    }
    const movedSelection = await readEditorSnapshot(source);
    const itemLineStart = VALID_SOURCE.indexOf('- [ ] 브라우저 검증');
    expect(movedSelection.selectionStart).toBeGreaterThanOrEqual(itemLineStart);
    expect(movedSelection.selectionStart).toBeLessThan(itemLineStart + '- [ ] 브라우저 검증'.length);
    expect(movedSelection.selectionEnd).toBe(movedSelection.selectionStart);
    await expect(page.locator('[data-line="5"]')).toHaveAttribute('data-presentation-mode', 'raw');
    await expect(page.locator('[data-line="1"]')).toHaveAttribute('data-presentation-mode', 'presented');
    await page.getByTestId('personal-workspace-live-editor-text-view-toggle').click();
    await expect(page.getByTestId('personal-workspace-live-editor-presentation-overlay')).toHaveCount(0);
    await expect(source).toHaveValue(VALID_SOURCE);
    await page.getByTestId('personal-workspace-live-editor-flow-view-toggle').click();
    await expect(page.locator('[data-line="5"]')).toHaveAttribute('data-presentation-mode', 'raw');
    expect(await readDocumentMutations(page)).toEqual(mutationsBeforeViewChanges);
    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('여섯 작성 틀은 같은 편집기에 exact bytes로 한 번 들어가고 브라우저 native Undo/Redo로 왕복한다', async ({ browser }) => {
    test.setTimeout(180_000);
    for (const template of PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES) {
      const guide = PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG.templates.find(
        (candidate) => candidate.templateId === template.templateId,
      );
      expect(guide).toBeTruthy();
      if (!guide) throw new Error(`${template.templateId}의 first blank locator가 없습니다.`);
      const { page, calls } = await newAuditedPage(browser, { width: 390, height: 844 });
      try {
        const source = await openBlankAuthoring(page);
        const operatingBefore = await readNonPocStorage(page);
        await page.evaluate(() => {
          type InputAuditWindow = Window & typeof globalThis & {
            __personalWorkspaceStage2InputTypes: string[];
            __personalWorkspaceStage2ExecCommandCount: number;
          };
          const auditWindow = window as InputAuditWindow;
          auditWindow.__personalWorkspaceStage2InputTypes = [];
          auditWindow.__personalWorkspaceStage2ExecCommandCount = 0;
          const textarea = document.querySelector<HTMLTextAreaElement>('[data-testid="personal-workspace-live-editor-textarea"]');
          textarea?.addEventListener('input', (event) => {
            auditWindow.__personalWorkspaceStage2InputTypes.push((event as InputEvent).inputType);
          });
          const originalExecCommand = document.execCommand.bind(document);
          document.execCommand = (commandId: string, showUI?: boolean, value?: string) => {
            if (commandId === 'insertText') auditWindow.__personalWorkspaceStage2ExecCommandCount += 1;
            return originalExecCommand(commandId, showUI, value);
          };
        });

        const mutationsBeforeTemplate = await readDocumentMutations(page);
        const templateCard = page.getByTestId(`personal-workspace-authoring-template-${template.templateId}`);
        const sourceBeforePreview = await readEditorSnapshot(source);
        await templateCard.hover();
        await expect(templateCard).toContainText(`예: ${template.exampleLabel}`);
        await expect(page.getByTestId('personal-workspace-authoring-template-example-preview'))
          .toContainText(template.exampleLabel);
        expect(await page.getByTestId('personal-workspace-authoring-template-example-source').textContent())
          .toBe(template.exampleSource);
        await templateCard.focus();
        expect(await page.getByTestId('personal-workspace-authoring-template-example-source').textContent())
          .toBe(template.exampleSource);
        expect(await readEditorSnapshot(source)).toEqual(sourceBeforePreview);
        expect(await readDocumentMutations(page)).toEqual(mutationsBeforeTemplate);
        await templateCard.click();
        await expect(source).toHaveValue(template.scaffold);
        expect(await page.evaluate(() => (
          window as Window & typeof globalThis & {
            __personalWorkspaceStage2ExecCommandCount?: number;
          }
        ).__personalWorkspaceStage2ExecCommandCount ?? 0)).toBe(1);
        expect((await readDocumentMutations(page)).slice(mutationsBeforeTemplate.length)).toEqual([
          { method: 'setItem', key: POC_AUTHORING_DRAFT_KEY },
        ]);
        const inserted = await readEditorSnapshot(source);
        expect(inserted.selectionStart).toBe(guide.firstBlankValue.valueStartOffset);
        expect(inserted.selectionEnd).toBe(guide.firstBlankValue.valueEndOffset);
        await expect(source).toBeFocused();
        expect(await readDraftRaw(page)).toBe(JSON.stringify({
          version: 1,
          rawText: template.scaffold,
          templateId: template.templateId,
        }));

        const mutationsBeforeSecondAttempt = await readDocumentMutations(page);
        await page.getByTestId('personal-workspace-authoring-template-picker-toggle').click();
        await expect(page.getByTestId('personal-workspace-authoring-status'))
          .toHaveAttribute('data-status', 'canceled');
        expect(await readDocumentMutations(page)).toEqual(mutationsBeforeSecondAttempt);
        await source.focus();
        const mutationsBeforeUndo = await readDocumentMutations(page);
        await page.keyboard.press('Control+z');
        await expect(source).toHaveValue('');
        expect(await readDraftRaw(page)).toBeNull();
        expect((await readDocumentMutations(page)).slice(mutationsBeforeUndo.length)).toEqual([
          { method: 'removeItem', key: POC_AUTHORING_DRAFT_KEY },
        ]);
        const mutationsBeforeRedo = await readDocumentMutations(page);
        await page.keyboard.press('Control+y');
        await expect(source).toHaveValue(template.scaffold);
        expect(await readDraftRaw(page)).toBe(JSON.stringify({
          version: 1,
          rawText: template.scaffold,
          templateId: template.templateId,
        }));
        expect((await readDocumentMutations(page)).slice(mutationsBeforeRedo.length)).toEqual([
          { method: 'setItem', key: POC_AUTHORING_DRAFT_KEY },
        ]);
        const inputTypes = await page.evaluate(() => (
          window as Window & typeof globalThis & {
            __personalWorkspaceStage2InputTypes?: string[];
          }
        ).__personalWorkspaceStage2InputTypes ?? []);
        expect(inputTypes).toContain('insertText');
        expect(inputTypes).toContain('historyUndo');
        expect(inputTypes).toContain('historyRedo');
        await assertStorageBoundary(page, calls, operatingBefore);
      } finally {
        await page.close();
      }
    }
  });

  test('stale helper, IME, picker 취소와 Escape는 사용자 입력 외 mutation을 만들지 않는다', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    const source = await openBlankAuthoring(page);
    const operatingBefore = await readNonPocStorage(page);
    const emptyMutations = await readDocumentMutations(page);
    await page.getByTestId('personal-workspace-authoring-template-picker-toggle').click();
    await expect(page.getByTestId('personal-workspace-authoring-template-picker')).toHaveCount(0);
    expect(await readDocumentMutations(page)).toEqual(emptyMutations);
    await page.getByTestId('personal-workspace-authoring-template-picker-toggle').click();
    await expect(page.getByTestId('personal-workspace-authoring-template-picker')).toBeVisible();
    const beforeEscape = await readDocumentMutations(page);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('personal-workspace-authoring-template-picker')).toHaveCount(0);
    expect(await readDocumentMutations(page)).toEqual(beforeEscape);

    await source.fill('# Guard\n\n');
    await source.evaluate((element) => {
      const input = element as HTMLTextAreaElement;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      input.dispatchEvent(new Event('select', { bubbles: true }));
    });
    await source.dispatchEvent('compositionstart', { data: 'ㅎ' });
    const beforeIme = await readDocumentMutations(page);
    await page.getByTestId('personal-workspace-authoring-helper-anchor').click();
    await expect(page.getByTestId('personal-workspace-authoring-helper-menu')).toHaveCount(0);
    expect(await readDocumentMutations(page)).toEqual(beforeIme);
    await source.dispatchEvent('compositionend', { data: 'ㅎ' });

    await page.getByTestId('personal-workspace-authoring-helper-anchor').click();
    await expect(page.getByTestId('personal-workspace-authoring-helper-menu')).toBeVisible();
    const beforeHelperEscape = await readDocumentMutations(page);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('personal-workspace-authoring-helper-menu')).toHaveCount(0);
    expect(await readDocumentMutations(page)).toEqual(beforeHelperEscape);

    await page.getByTestId('personal-workspace-authoring-helper-anchor').click();
    await expect(page.getByTestId('personal-workspace-authoring-helper-menu')).toBeVisible();
    await source.press('x');
    const bytesAfterUserEdit = await source.inputValue();
    const mutationsAfterUserEdit = await readDocumentMutations(page);
    await page.getByTestId('personal-workspace-authoring-helper-first-step').click();
    await expect(page.getByTestId('personal-workspace-authoring-status'))
      .toHaveAttribute('data-status', 'canceled');
    expect(await source.inputValue()).toBe(bytesAfterUserEdit);
    expect(await readDocumentMutations(page)).toEqual(mutationsAfterUserEdit);
    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('ghost는 장식에만 남고 source, selection, scroll, storage와 browser history를 바꾸지 않는다', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    const source = await openBlankAuthoring(page);
    const operatingBefore = await readNonPocStorage(page);
    await page.getByTestId('personal-workspace-authoring-template-travel-itinerary-prep-v1').click();
    const template = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.find(
      (candidate) => candidate.templateId === 'travel-itinerary-prep-v1',
    );
    expect(template).toBeTruthy();
    if (!template) throw new Error('여행 작성 틀을 찾지 못했습니다.');
    const expectedGhostCount = template.scaffold
      .split(/\r\n|\r|\n/u)
      .filter((line) => PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG.ghostHints.some(
        (hint) => line === hint.syntaxPrefix,
      )).length;
    const ghostLines = page.locator('[data-testid^="personal-workspace-live-editor-ghost-line-"]');
    expect(expectedGhostCount).toBeGreaterThan(1);
    await expect(ghostLines).toHaveCount(expectedGhostCount);
    await expect(page.getByTestId('personal-workspace-live-editor-ghost-line-1')).toBeVisible();
    await source.evaluate((element) => {
      const input = element as HTMLTextAreaElement;
      input.scrollTop = 20;
      input.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    const before = await readEditorSnapshot(source);
    const draftBefore = await readDraftRaw(page);
    const mutationsBefore = await readDocumentMutations(page);
    const overlay = page.getByTestId('personal-workspace-live-editor-presentation-overlay');
    await expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(await overlay.evaluate((element) => {
      const style = getComputedStyle(element);
      return { pointerEvents: style.pointerEvents, userSelect: style.userSelect };
    })).toEqual({ pointerEvents: 'none', userSelect: 'none' });
    await page.getByTestId('personal-workspace-live-editor-text-view-toggle').click();
    await expect(ghostLines).toHaveCount(0);
    await page.getByTestId('personal-workspace-live-editor-flow-view-toggle').click();
    await expect(ghostLines).toHaveCount(expectedGhostCount);
    await page.getByTestId('personal-workspace-live-editor-ghost-toggle').click();
    await expect(ghostLines).toHaveCount(0);
    await page.getByTestId('personal-workspace-live-editor-ghost-toggle').click();
    await expect(ghostLines).toHaveCount(expectedGhostCount);
    expect(await readEditorSnapshot(source)).toEqual(before);
    expect(await readDraftRaw(page)).toBe(draftBefore);
    expect(await readDocumentMutations(page)).toEqual(mutationsBefore);

    await source.focus();
    await page.keyboard.press('Control+z');
    await expect(source).toHaveValue('');
    await page.keyboard.press('Control+y');
    await expect(source).toHaveValue(template.scaffold);
    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('문맥 도움은 exact syntax를 한 native transaction으로 넣고 Undo하며 검토 항목은 exact line으로 돌아간다', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(AUTHORING_URL);
    const operatingBefore = await readNonPocStorage(page);
    const helperBase = '# Helper\n\n## 준비\n- [ ] 확인';
    await page.getByTestId('personal-workspace-entry-input').fill(helperBase);
    await page.getByTestId('personal-workspace-entry-start-authoring').click();
    const source = page.getByTestId('personal-workspace-live-editor-textarea');
    await source.focus();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('ArrowLeft');
    await page.getByTestId('personal-workspace-authoring-helper-anchor').click();
    await expect(page.getByTestId('personal-workspace-authoring-helper-child-check')).toBeDisabled();
    const dateAction = page.getByTestId('personal-workspace-authoring-helper-item-date');
    await expect(dateAction).toContainText('날짜');
    await expect(dateAction.locator('span').first()).toHaveText('  - 날짜: ');
    await dateAction.click();
    const withDateSyntax = `${helperBase}\n  - 날짜: `;
    await expect(source).toHaveValue(withDateSyntax);
    await source.focus();
    await page.keyboard.press('Control+z');
    await expect(source).toHaveValue(helperBase);
    await page.keyboard.press('Control+y');
    await expect(source).toHaveValue(withDateSyntax);

    const invalidSource = '# Review\n\n## 준비\n- [ ] 확인\n  - 날짜: 2026-99-99';
    await source.fill(invalidSource);
    await page.getByTestId('personal-workspace-authoring-tab-result').click();
    await page.getByTestId('personal-workspace-authoring-review-open').click();
    const issueButton = page.getByTestId('personal-workspace-authoring-review')
      .getByRole('button', { name: /5행/u });
    await expect(issueButton).toBeVisible();
    await issueButton.click();
    await expect(source).toBeFocused();
    const lineText = '  - 날짜: 2026-99-99';
    const lineStart = invalidSource.indexOf(lineText);
    const focused = await readEditorSnapshot(source);
    expect(focused.selectionStart).toBe(lineStart);
    expect(focused.selectionEnd).toBe(lineStart + lineText.length);
    expect(focused.value).toBe(invalidSource);
    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('작성 틀, 문맥 도움, 검토는 keyboard와 outside close에서 한 overlay와 focus return, mutation 0을 지킨다', async ({ page }) => {
    test.setTimeout(90_000);
    const calls: StorageMutation[] = [];
    await installFixturesAndAudit(page, calls);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(AUTHORING_URL);
    const operatingBefore = await readNonPocStorage(page);
    const startTemplate = page.getByTestId('personal-workspace-entry-start-template');
    await startTemplate.focus();
    await startTemplate.press('Enter');

    const templateToggle = page.getByTestId('personal-workspace-authoring-template-picker-toggle');
    const templatePicker = page.getByTestId('personal-workspace-authoring-template-picker');
    await expect(templatePicker).toBeVisible();
    await expect(templateToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(templateToggle).toHaveAttribute('aria-controls', 'personal-workspace-authoring-template-picker');
    const mutationsBeforeTemplateCancel = await readDocumentMutations(page);
    await page.keyboard.press('Escape');
    await expect(templatePicker).toHaveCount(0);
    await expect(templateToggle).toBeFocused();
    expect(await readDocumentMutations(page)).toEqual(mutationsBeforeTemplateCancel);

    await templateToggle.press('Space');
    await expect(templatePicker).toBeVisible();
    await expect(templateToggle).toHaveAttribute('aria-expanded', 'true');
    const mutationsBeforeTemplateOutside = await readDocumentMutations(page);
    await page.getByRole('heading', { name: '새 Flow 만들기' }).click();
    await expect(templatePicker).toHaveCount(0);
    expect(await readDocumentMutations(page)).toEqual(mutationsBeforeTemplateOutside);

    const source = page.getByTestId('personal-workspace-live-editor-textarea');
    await source.fill('# Overlay\n\n');
    await source.focus();
    await page.keyboard.press('Control+Home');
    await expect(page.getByTestId('personal-workspace-authoring-helper-anchor')).toHaveCount(0);
    await page.keyboard.press('Control+End');
    const helperAnchor = page.getByTestId('personal-workspace-authoring-helper-anchor');
    await expect(helperAnchor).toBeVisible();
    await expect(helperAnchor).toHaveAttribute('data-source-line', '3');
    await expect(helperAnchor).toHaveAttribute('data-owner', 'blank-line');
    await expect(helperAnchor).toHaveAttribute('aria-expanded', 'false');
    await expect(helperAnchor).toHaveAttribute('aria-controls', 'personal-workspace-authoring-helper-menu');

    const mutationsBeforeHelperOpen = await readDocumentMutations(page);
    await helperAnchor.focus();
    await helperAnchor.press('Enter');
    const helperMenu = page.getByTestId('personal-workspace-authoring-helper-menu');
    await expect(helperMenu).toBeVisible();
    await expect(page.locator('[data-authoring-overlay]')).toHaveCount(1);
    await expect(page.locator('#personal-workspace-authoring-helper-heading')).toBeFocused();
    expect(await readDocumentMutations(page)).toEqual(mutationsBeforeHelperOpen);
    await page.keyboard.press('Tab');
    await expect(helperMenu.getByRole('button', { name: '닫기' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(helperMenu).toHaveCount(0);
    await expect(helperAnchor).toBeFocused();
    expect(await readDocumentMutations(page)).toEqual(mutationsBeforeHelperOpen);

    await helperAnchor.press('Space');
    await expect(helperMenu).toBeVisible();
    const mutationsBeforeHelperOutside = await readDocumentMutations(page);
    await page.getByRole('heading', { name: '새 Flow 만들기' }).click();
    await expect(helperMenu).toHaveCount(0);
    expect(await readDocumentMutations(page)).toEqual(mutationsBeforeHelperOutside);

    await helperAnchor.focus();
    await helperAnchor.press('Enter');
    await expect(helperMenu).toBeVisible();
    const reviewOpen = page.getByTestId('personal-workspace-authoring-review-open');
    await reviewOpen.click();
    const review = page.getByTestId('personal-workspace-authoring-review');
    await expect(helperMenu).toHaveCount(0);
    await expect(review).toBeVisible();
    await expect(page.locator('[data-authoring-overlay]')).toHaveCount(1);
    await expect(page.locator('#personal-workspace-authoring-review-heading')).toBeFocused();
    const mutationsBeforeReviewEscape = await readDocumentMutations(page);
    await page.keyboard.press('Escape');
    await expect(review).toHaveCount(0);
    await expect(reviewOpen).toBeFocused();
    expect(await readDocumentMutations(page)).toEqual(mutationsBeforeReviewEscape);
    await assertStorageBoundary(page, calls, operatingBefore);
  });

  test('작성 초안은 reload 후 exact 복원되고 malformed draft는 운영 key를 건드리지 않고 /my로 닫힌다', async ({ browser }) => {
    test.setTimeout(90_000);
    const restored = await newAuditedPage(browser, { width: 390, height: 844 });
    try {
      await restored.page.goto(AUTHORING_URL);
      const operatingBefore = await readNonPocStorage(restored.page);
      const rawDraft = '# Reload 🙂\n\n## 확인\n- [ ] exact bytes\n';
      await restored.page.getByTestId('personal-workspace-entry-input').fill(rawDraft);
      await restored.page.getByTestId('personal-workspace-entry-start-authoring').click();
      expect(await readDraftRaw(restored.page)).toBe(JSON.stringify({ version: 1, rawText: rawDraft }));
      await restored.page.reload();
      await expect(restored.page.getByTestId('personal-workspace-live-editor-textarea')).toHaveValue(rawDraft);
      expect(await readDraftRaw(restored.page)).toBe(JSON.stringify({ version: 1, rawText: rawDraft }));
      await assertStorageBoundary(restored.page, restored.calls, operatingBefore);
    } finally {
      await restored.page.close();
    }

    const malformed = await newAuditedPage(browser, { width: 390, height: 844 });
    try {
      await malformed.page.goto('/my');
      const operatingBefore = await readNonPocStorage(malformed.page);
      await malformed.page.evaluate(
        ([key, value]) => window.localStorage.setItem(key, value),
        [POC_AUTHORING_DRAFT_KEY, '{malformed-stage-2'],
      );
      await malformed.page.goto(AUTHORING_URL);
      await malformed.page.waitForURL((url) => (
        url.pathname === '/my' && !url.searchParams.has('personalWorkspacePoc')
      ));
      await expect(malformed.page.getByTestId('personal-workspace-authoring-shell')).toHaveCount(0);
      expect(await readDraftRaw(malformed.page)).toBe('{malformed-stage-2');
      await assertStorageBoundary(malformed.page, malformed.calls, operatingBefore);
    } finally {
      await malformed.page.close();
    }
  });

  test('지정 화면과 200% 등가 reflow에서 overflow, console/page error, 가려진 핵심 행동이 없다', async ({ browser }) => {
    test.setTimeout(240_000);
    const screenshotDir = path.join(
      process.cwd(),
      'docs',
      'content-audit',
      '2026-09-02-flowme-integrated-poc-stage-2-runtime-assets',
    );
    mkdirSync(screenshotDir, { recursive: true });
    const viewports = [
      { label: '320x700', width: 320, height: 700 },
      { label: '375x812', width: 375, height: 812 },
      { label: '390x844', width: 390, height: 844 },
      { label: '844x390', width: 844, height: 390 },
      { label: '1024x768', width: 1024, height: 768 },
      { label: '1440x900', width: 1440, height: 900 },
    ] as const;

    for (const viewport of viewports) {
      const { page } = await newAuditedPage(browser, viewport);
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        await page.goto(AUTHORING_URL);
        await expect(page.getByTestId('personal-workspace-authoring-shell')).toBeVisible();
        await expectReachableAction(page.getByTestId('personal-workspace-entry-start-template'));
        expect(await page.evaluate(() => (
          document.documentElement.scrollWidth <= document.documentElement.clientWidth
        ))).toBe(true);
        await page.screenshot({
          path: path.join(screenshotDir, `entry-${viewport.label}.png`),
          fullPage: false,
        });

        await page.getByTestId('personal-workspace-entry-start-template').click();
        await page.getByTestId('personal-workspace-authoring-template-moving-dday-v1').click();
        await expect(page.getByTestId('personal-workspace-live-editor-textarea')).toBeVisible();
        expect(await page.evaluate(() => (
          document.documentElement.scrollWidth <= document.documentElement.clientWidth
        ))).toBe(true);
        await page.screenshot({
          path: path.join(screenshotDir, `authoring-${viewport.label}.png`),
          fullPage: false,
        });
        if (viewport.width < 1024) {
          const headingRect = await readElementRect(page.locator('#personal-workspace-authoring-write-heading'));
          const guidanceRect = await readElementRect(page.getByTestId('personal-workspace-authoring-input-guidance'));
          const editorRect = await readElementRect(page.getByTestId('personal-workspace-live-editor-frame'));
          const ctaRect = await readElementRect(page.getByTestId('personal-workspace-authoring-result-cta'));
          const visibleEditorHeight = Math.max(
            0,
            Math.min(editorRect.bottom, viewport.height) - Math.max(editorRect.top, 0),
          );
          expect(headingRect.bottom).toBeGreaterThan(0);
          expect(headingRect.top).toBeLessThan(viewport.height);
          expect(guidanceRect.bottom).toBeGreaterThan(0);
          expect(guidanceRect.top).toBeLessThan(viewport.height);
          expect(visibleEditorHeight).toBeGreaterThanOrEqual(96);
          expect(intersectionArea(editorRect, ctaRect)).toBe(0);
          await page.getByTestId('personal-workspace-authoring-tab-result').click();
        }
        await expectReachableAction(page.getByTestId('personal-workspace-authoring-save'));
        expect(await page.evaluate(() => (
          document.documentElement.scrollWidth <= document.documentElement.clientWidth
        ))).toBe(true);
        expect(errors).toEqual([]);
      } finally {
        await page.close();
      }
    }

    const zoom = await newAuditedPage(browser, { width: 1440, height: 900 });
    const zoomErrors: string[] = [];
    zoom.page.on('console', (message) => {
      if (message.type() === 'error') zoomErrors.push(message.text());
    });
    zoom.page.on('pageerror', (error) => zoomErrors.push(error.message));
    try {
      const session = await zoom.page.context().newCDPSession(zoom.page);
      await session.send('Emulation.setDeviceMetricsOverride', {
        width: 720,
        height: 450,
        screenWidth: 1440,
        screenHeight: 900,
        deviceScaleFactor: 2,
        mobile: false,
      });
      await zoom.page.goto(AUTHORING_URL);
      expect(await zoom.page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio })))
        .toEqual({ width: 720, dpr: 2 });
      await expectReachableAction(zoom.page.getByTestId('personal-workspace-entry-start-template'));
      expect(await zoom.page.evaluate(() => (
        document.documentElement.scrollWidth <= document.documentElement.clientWidth
      ))).toBe(true);
      await zoom.page.screenshot({
        path: path.join(screenshotDir, 'entry-200-percent-equivalent.png'),
        fullPage: false,
      });
      await zoom.page.getByTestId('personal-workspace-entry-start-template').click();
      await zoom.page.getByTestId('personal-workspace-authoring-template-moving-dday-v1').click();
      await expect(zoom.page.getByTestId('personal-workspace-live-editor-textarea')).toBeVisible();
      expect(await zoom.page.evaluate(() => (
        document.documentElement.scrollWidth <= document.documentElement.clientWidth
      ))).toBe(true);
      await zoom.page.screenshot({
        path: path.join(screenshotDir, 'authoring-200-percent-equivalent.png'),
        fullPage: false,
      });
      await expectReachableAction(zoom.page.getByTestId('personal-workspace-authoring-save'));
      expect(await zoom.page.evaluate(() => (
        document.documentElement.scrollWidth <= document.documentElement.clientWidth
      ))).toBe(true);
      expect(zoomErrors).toEqual([]);
      await session.send('Emulation.clearDeviceMetricsOverride');
    } finally {
      await zoom.page.close();
    }
  });
});
