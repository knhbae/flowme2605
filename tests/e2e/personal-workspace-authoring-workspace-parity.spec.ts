import { expect, test, type Browser, type Page } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES } from '../../lib/flow/personal-workspace-poc-authoring';

const AUTHORING_URL = '/flows/new?personalWorkspacePoc=v1';
const POC_PREFIX = 'flow:poc:personal-workspace:v1:';
const OPERATING_SENTINEL_KEY = 'flow:operational:authoring-workspace-parity-sentinel';
const OPERATING_SENTINEL_BYTES = '  authoring parity sentinel \r\n exact bytes  ';
const STANDALONE_HTML_URL = pathToFileURL(path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html',
)).href;

const VALID_SOURCE = [
  '# 작성 연결 검증',
  '- 기준일: 2026-09-10',
  '',
  '## 준비',
  '- [ ] 개인공간에서 확인할 일',
  '  - 날짜: 2026-09-10',
].join('\n');

type StorageMutation = Readonly<{
  method: 'setItem' | 'removeItem' | 'clear';
  key?: string;
}>;

async function installStorageBoundaryAudit(
  page: Page,
  calls: StorageMutation[],
  marker: string,
): Promise<void> {
  await page.exposeFunction(
    '__recordAuthoringWorkspaceParityMutation',
    (mutation: StorageMutation) => calls.push(mutation),
  );
  await page.addInitScript(({ prefix, sentinelKey, sentinelBytes, pageMarker }) => {
    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;

    if (window.name !== pageMarker) {
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        if (key?.startsWith(prefix)) originalRemove.call(window.localStorage, key);
      }
      originalSet.call(window.localStorage, sentinelKey, sentinelBytes);
      window.name = pageMarker;
    }

    type AuditWindow = Window & typeof globalThis & {
      __recordAuthoringWorkspaceParityMutation: (mutation: StorageMutation) => Promise<void>;
    };
    const auditWindow = window as AuditWindow;
    Storage.prototype.setItem = function auditedSetItem(key: string, value: string) {
      if (this === window.localStorage) {
        void auditWindow.__recordAuthoringWorkspaceParityMutation({ method: 'setItem', key });
      }
      return originalSet.call(this, key, value);
    };
    Storage.prototype.removeItem = function auditedRemoveItem(key: string) {
      if (this === window.localStorage) {
        void auditWindow.__recordAuthoringWorkspaceParityMutation({ method: 'removeItem', key });
      }
      return originalRemove.call(this, key);
    };
    Storage.prototype.clear = function auditedClear() {
      if (this === window.localStorage) {
        void auditWindow.__recordAuthoringWorkspaceParityMutation({ method: 'clear' });
      }
      return originalClear.call(this);
    };
  }, {
    prefix: POC_PREFIX,
    sentinelKey: OPERATING_SENTINEL_KEY,
    sentinelBytes: OPERATING_SENTINEL_BYTES,
    pageMarker: marker,
  });
}

async function readOperatingStorage(page: Page): Promise<Record<string, string>> {
  return page.evaluate((prefix) => {
    const keys = Array.from(
      { length: window.localStorage.length },
      (_, index) => window.localStorage.key(index),
    )
      .filter((key): key is string => key !== null && !key.startsWith(prefix))
      .sort();
    return Object.fromEntries(
      keys.map((key) => [key, window.localStorage.getItem(key) ?? '']),
    );
  }, POC_PREFIX);
}

async function expectPocOnlyStorageWrites(
  page: Page,
  calls: StorageMutation[],
  operatingBefore: Record<string, string>,
): Promise<void> {
  await expect.poll(() => calls.length).toBeGreaterThan(0);
  expect(calls.filter((call) => call.method === 'clear')).toEqual([]);
  expect(calls.filter((call) => (
    (call.method === 'setItem' || call.method === 'removeItem')
    && !call.key?.startsWith(POC_PREFIX)
  ))).toEqual([]);
  expect(await readOperatingStorage(page)).toEqual(operatingBefore);
  expect(await page.evaluate(
    (key) => window.localStorage.getItem(key),
    OPERATING_SENTINEL_KEY,
  )).toBe(OPERATING_SENTINEL_BYTES);
}

async function expectCompactTwoStateContract(page: Page): Promise<void> {
  const stateNavigation = page.getByRole('navigation', { name: '작성 화면' });
  await expect(stateNavigation.getByRole('button')).toHaveCount(2);
  await expect(stateNavigation.getByRole('button').nth(0)).toHaveText('입력');
  await expect(stateNavigation.getByRole('button').nth(1)).toHaveText('결과');
  await expect(page.locator('body')).not.toContainText('1 작성');
  await expect(page.locator('body')).not.toContainText('2 구조 확인');
  await expect(page.locator('body')).not.toContainText('3 저장');
  await expect(page.locator('#source-confirmed')).toHaveCount(0);
  await expect(page.getByTestId('personal-workspace-authoring-source-confirm')).toHaveCount(0);
}

async function openReactBlankAuthoring(page: Page): Promise<void> {
  await page.goto(AUTHORING_URL);
  await expect(page.getByTestId('personal-workspace-authoring-shell')).toBeVisible();
  await page.getByTestId('personal-workspace-entry-start-template').click();
  await expect(page.getByTestId('personal-workspace-authoring-template-picker')).toBeVisible();
  await expectCompactTwoStateContract(page);
}

async function openStandaloneAuthoring(page: Page): Promise<void> {
  await page.goto(STANDALONE_HTML_URL);
  await expect(page.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();
  await page.locator('button[data-action="go-authoring"]').first().click();
  await expect(page.getByRole('heading', { name: '새 Flow 만들기', exact: true })).toBeVisible();
  await expectCompactTwoStateContract(page);
}

async function verifyReactTemplateCatalog(page: Page): Promise<string[][]> {
  const editor = page.getByTestId('personal-workspace-live-editor-textarea');
  const ghostSets: string[][] = [];
  await expect(editor).toHaveValue('');

  for (const [index, template] of PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.entries()) {
    const card = page.getByTestId(`personal-workspace-authoring-template-${template.templateId}`);
    await expect(card).toContainText(template.label);
    await expect(card).toContainText(`예: ${template.exampleLabel}`);
    await card.focus();
    await expect(page.getByTestId('personal-workspace-authoring-template-example-source'))
      .toHaveText(template.exampleSource);
    await expect(editor).toHaveValue('');

    await card.click();
    await expect(editor).toHaveValue(template.scaffold);
    expect(await editor.inputValue()).not.toBe(template.exampleSource);
    await expect(page.getByTestId('personal-workspace-live-editor-ghost-toggle'))
      .toHaveAttribute('aria-pressed', 'true');
    const ghosts = page.locator('[data-testid^="personal-workspace-live-editor-ghost-line-"]');
    await expect(ghosts).not.toHaveCount(0);
    ghostSets.push(await ghosts.allTextContents());

    if (index < PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.length - 1) {
      await editor.press('Control+z');
      await expect(editor).toHaveValue('');
      await page.getByTestId('personal-workspace-authoring-template-picker-toggle').click();
      await expect(page.getByTestId('personal-workspace-authoring-template-picker')).toBeVisible();
    }
  }
  return ghostSets;
}

async function verifyStandaloneTemplateCatalog(page: Page): Promise<string[][]> {
  const editor = page.locator('#flow-editor');
  const ghostSets: string[][] = [];
  await page.locator('#template-picker-opener').click();
  await expect(page.locator('.template-option')).toHaveCount(6);
  await expect(editor).toHaveValue('');

  for (const [index, template] of PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.entries()) {
    const option = page.locator('.template-option').filter({
      has: page.locator(`button[data-template-id="${template.templateId}"]`),
    });
    const card = option.locator('.template-choice');
    await expect(card).toContainText(template.label);
    await expect(card).toContainText(`예: ${template.exampleLabel}`);
    await card.focus();
    await expect(page.locator('#template-example-source')).toHaveText(template.exampleSource);
    await expect(editor).toHaveValue('');

    await card.click();
    await expect(editor).toHaveValue(template.scaffold);
    expect(await editor.inputValue()).not.toBe(template.exampleSource);
    await expect(page.locator('#authoring-ghost-toggle')).toHaveAttribute('aria-pressed', 'true');
    const ghosts = page.locator('.authoring-ghost');
    await expect(ghosts).not.toHaveCount(0);
    ghostSets.push(await ghosts.allTextContents());

    if (index < PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.length - 1) {
      await editor.press('Control+z');
      await expect(editor).toHaveValue('');
      await page.locator('#template-picker-opener').click();
      await expect(page.locator('#template-picker-panel')).toBeVisible();
    }
  }
  return ghostSets;
}

async function verifyReactSaveJourney(browser: Browser): Promise<void> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const calls: StorageMutation[] = [];
  await installStorageBoundaryAudit(page, calls, 'react-authoring-workspace-parity');
  try {
    await page.goto(AUTHORING_URL);
    await expect(page.getByTestId('personal-workspace-authoring-shell')).toBeVisible();
    const operatingBefore = await readOperatingStorage(page);

    await page.getByTestId('personal-workspace-entry-input').fill(VALID_SOURCE);
    await page.getByTestId('personal-workspace-entry-start-authoring').click();
    await expectCompactTwoStateContract(page);
    await expect(page.getByTestId('personal-workspace-live-editor-textarea')).toHaveValue(VALID_SOURCE);
    await expect(page.getByTestId('personal-workspace-authoring-review')).toHaveCount(0);

    await page.getByTestId('personal-workspace-authoring-tab-result').click();
    await expect(page.getByTestId('personal-workspace-authoring-artifact-result')).toBeVisible();
    await expect(page.getByTestId('personal-workspace-authoring-review-open'))
      .toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('personal-workspace-authoring-review')).toHaveCount(0);
    await expect(page.getByTestId('personal-workspace-authoring-loss-confirm')).toHaveCount(0);
    await page.getByTestId('personal-workspace-authoring-save').click();
    const receipt = page.getByTestId('personal-workspace-authoring-receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt).toHaveAttribute('data-product-receipt-only', 'true');
    await expect(receipt).toContainText('저장했어요');
    await expect(receipt).toContainText('작성 연결 검증');
    await expect(receipt).toContainText('1개 할 일');
    await expect(page.locator('#personal-workspace-authoring-receipt-title'))
      .toHaveText('작성 연결 검증');
    await expect(page.locator('#personal-workspace-authoring-receipt-title')).toBeFocused();
    await expect(page.getByTestId('personal-workspace-authoring-mobile-stage-nav')).toHaveCount(0);
    await expect(page.getByTestId('personal-workspace-authoring-save')).toHaveCount(0);
    await expect(receipt.locator('[data-product-primary]')).toHaveCount(1);
    await expect(page.getByTestId('personal-workspace-authoring-status'))
      .toHaveAttribute('data-status', 'success');
    await expect(page.getByTestId('personal-workspace-authoring-status'))
      .toHaveAttribute('aria-hidden', 'true');

    await page.getByTestId('personal-workspace-authoring-open').click();
    await page.waitForURL((url) => (
      url.pathname === '/my' && url.search === '?personalWorkspacePoc=v1'
    ));
    await expect(page.getByTestId('personal-workspace-flow-detail')).toBeVisible();
    await expect(page.locator('#personal-workspace-flow-detail-heading'))
      .toHaveText('작성 연결 검증');
    await expectPocOnlyStorageWrites(page, calls, operatingBefore);
  } finally {
    await context.close();
  }
}

async function verifyStandaloneSaveJourney(browser: Browser): Promise<void> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const calls: StorageMutation[] = [];
  await installStorageBoundaryAudit(page, calls, 'standalone-authoring-workspace-parity');
  try {
    await openStandaloneAuthoring(page);
    const operatingBefore = await readOperatingStorage(page);
    await page.locator('#flow-editor').fill(VALID_SOURCE);
    await expectCompactTwoStateContract(page);
    await expect(page.locator('#authoring-review')).toBeHidden();
    await expect(page.locator('#authoring-review-opener')).toHaveAttribute('aria-expanded', 'false');

    await page.locator('#authoring-tab-result').click();
    await expect(page.locator('#authoring-artifact-result')).toBeVisible();
    await expect(page.locator('#authoring-review')).toBeHidden();
    await page.locator('#commit-authoring').click();
    const receipt = page.locator('.receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt.getByRole('heading', { name: '개인 Flow로 저장했어요' })).toBeVisible();
    await expect(receipt).toContainText('작성 연결 검증');
    await expect(receipt).toContainText('1개');
    await expect(receipt.locator('.button.primary')).toHaveCount(1);
    await expect(receipt.locator('.button.primary')).toHaveText('개인공간에서 열기');

    await page.locator('button[data-action="open-receipt-flow"]').click();
    await expect(page.getByRole('heading', { name: '작성 연결 검증', exact: true })).toBeVisible();
    await expect(page.locator('.detail-header')).toContainText('직접 작성');
    await expectPocOnlyStorageWrites(page, calls, operatingBefore);
  } finally {
    await context.close();
  }
}

test.describe('Text Authoring → 개인공간 UX parity', () => {
  test('React exact gate와 single HTML은 compact 입력/결과 2-state와 같은 여섯 작성 틀을 쓴다', async ({ browser }) => {
    test.setTimeout(120_000);

    const gateContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const gatePage = await gateContext.newPage();
    await gatePage.goto('/flows/new?personalWorkspacePoc=v1&unexpected=1');
    await gatePage.waitForURL((url) => url.pathname === '/my' && url.search === '');
    await gateContext.close();

    const reactContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const reactPage = await reactContext.newPage();
    await openReactBlankAuthoring(reactPage);
    const reactGhostSets = await verifyReactTemplateCatalog(reactPage);
    await reactContext.close();

    const standaloneContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const standalonePage = await standaloneContext.newPage();
    await openStandaloneAuthoring(standalonePage);
    const standaloneGhostSets = await verifyStandaloneTemplateCatalog(standalonePage);
    expect(standaloneGhostSets).toEqual(reactGhostSets);
    await standaloneContext.close();
  });

  test('정상 원문은 두 구현 모두 선택형 검토 없이 저장되어 개인공간 상세로 이어지고 운영 bytes를 보존한다', async ({ browser }) => {
    test.setTimeout(120_000);
    await verifyReactSaveJourney(browser);
    await verifyStandaloneSaveJourney(browser);
  });
});
