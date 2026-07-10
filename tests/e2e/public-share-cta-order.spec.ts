import { expect, test, type Page } from '@playwright/test';

type FocusableEntry = {
  text: string;
  href: string;
  testId: string;
};

type StickyPrimaryEntry = {
  text: string;
  accessibleName: string;
  testId: string;
};

const PUBLIC_SHARE_ROUTES = [
  '/f/vehicle-inspection-prep',
  '/f/moving-d30-basic',
  '/f/fridge-cleanout-weekly-plan',
  '/f/washer-tub-clean-monthly',
  '/f/new-car-delivery-check',
  '/f/used-car-buying-check',
];

async function collectFocusableEntries(page: Page) {
  return page.evaluate<FocusableEntry[]>(() => {
    const selector = [
      'a[href]',
      'button',
      'input',
      'textarea',
      'select',
      '[tabindex]',
    ].join(',');

    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const ariaHidden = element.getAttribute('aria-hidden') === 'true';
        const disabled =
          element.hasAttribute('disabled') ||
          element.getAttribute('aria-disabled') === 'true';
        const tabIndex = element.getAttribute('tabindex');

        return (
          !ariaHidden &&
          !disabled &&
          tabIndex !== '-1' &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .map((element) => ({
        text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
        href: element instanceof HTMLAnchorElement ? element.getAttribute('href') ?? '' : '',
        testId: element.dataset.testid ?? element.closest<HTMLElement>('[data-testid]')?.dataset.testid ?? '',
      }));
  });
}

async function collectVisibleMobileStickyPrimaryEntries(page: Page) {
  return page.evaluate<StickyPrimaryEntry[]>(() => {
    const isVisibleInteractive = (element: Element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const disabled =
        element.hasAttribute('disabled') ||
        element.getAttribute('aria-disabled') === 'true';

      return (
        !disabled &&
        element.getAttribute('aria-hidden') !== 'true' &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    return Array.from(
      document.querySelectorAll<HTMLElement>(
        [
          '[data-testid="public-flow-mobile-save-cta"] a',
          '[data-testid="public-flow-mobile-save-cta"] button',
          '[data-testid="mobile-export-bar"] a',
          '[data-testid="mobile-export-bar"] button',
        ].join(','),
      ),
    )
      .filter(isVisibleInteractive)
      .map((element) => ({
        text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
        accessibleName:
          element.getAttribute('aria-label') ??
          (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
        testId:
          element.dataset.testid ??
          element.closest<HTMLElement>('[data-testid]')?.dataset.testid ??
          '',
      }));
  });
}

type PublicFlowUnitHierarchy = {
  exportSecondaryEntryCount: number;
  exportFormatOptionCount: number;
  itemLevelExportLikeLabelCount: number;
  preSaveCheckboxCount: number;
  preSaveCheckboxCompletionLikeLabelCount: number;
  preSaveCheckboxPreviewLabelCount: number;
  preSaveItemCheckboxPreviewCount: number;
  preSavePreviewControlCount: number;
  exportSecondaryEntryLabels: string[];
  itemLevelExportLikeLabels: string[];
  preSaveCheckboxLabels: string[];
};

async function collectPublicFlowUnitHierarchy(page: Page) {
  return page.evaluate<PublicFlowUnitHierarchy>(() => {
    const isVisible = (element: Element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const visibleText = (element: Element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    const exportLikePattern = /(받기|복사|파일|시트|캘린더|문서|내보내기|가져가기)/;

    const secondaryEntries = Array.from(document.querySelectorAll('[data-testid="public-flow-export-secondary-entry"]'))
      .filter(isVisible);
    const formatOptions = Array.from(document.querySelectorAll('[data-testid="public-flow-export-format-option"]'))
      .filter(isVisible);
    const itemLevelExportLikeLabels = Array.from(document.querySelectorAll('[data-testid^="mobile-artifact-export-"]'))
      .filter(isVisible)
      .map(visibleText)
      .filter((label) => exportLikePattern.test(label));
    const previewCheckboxes = Array.from(document.querySelectorAll('[data-testid="artifact-list-card"] input[type="checkbox"]'))
      .filter(isVisible);
    const publicPreSaveCheckboxes = Array.from(document.querySelectorAll('[aria-label="Flow artifact workbench"] input[type="checkbox"]'))
      .filter(isVisible);
    const publicPreSaveCheckboxLabels = publicPreSaveCheckboxes
      .map((element) => element.getAttribute('aria-label') ?? '')
      .filter(Boolean);
    const completionLikeCheckboxLabelPattern =
      /(완료|완료 체크|완료 취소|실행판 체크|회차 완료|이유식 완료|관리일 완료|관리 체크|전체 보기 체크|선택 일정 체크|단계 체크)/u;
    const previewCheckboxLabelPattern = /(미리보기|저장 전|선택|포함 표시|확인 표시)/u;
    const previewControls = Array.from(document.querySelectorAll('[aria-label="Flow artifact workbench"] input, [aria-label="Flow artifact workbench"] textarea, [aria-label="Flow artifact workbench"] select, [aria-label="Flow artifact workbench"] button'))
      .filter(isVisible)
      .filter((element) => !element.closest('[data-testid="public-flow-export-secondary-entry"]'));

    return {
      exportSecondaryEntryCount: secondaryEntries.length,
      exportFormatOptionCount: formatOptions.length,
      itemLevelExportLikeLabelCount: itemLevelExportLikeLabels.length,
      preSaveCheckboxCount: publicPreSaveCheckboxes.length,
      preSaveCheckboxCompletionLikeLabelCount: publicPreSaveCheckboxLabels
        .filter((label) => completionLikeCheckboxLabelPattern.test(label))
        .length,
      preSaveCheckboxPreviewLabelCount: publicPreSaveCheckboxLabels
        .filter((label) => previewCheckboxLabelPattern.test(label))
        .length,
      preSaveItemCheckboxPreviewCount: previewCheckboxes.length,
      preSavePreviewControlCount: previewControls.length,
      exportSecondaryEntryLabels: secondaryEntries.map(visibleText),
      itemLevelExportLikeLabels,
      preSaveCheckboxLabels: publicPreSaveCheckboxLabels,
    };
  });
}

test.describe('public share shell secondary browse order', () => {
  for (const route of PUBLIC_SHARE_ROUTES) {
    test(`${route} keeps browse navigation reachable after the save path`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);

      const shell = page.getByTestId('flow-public-shell');
      const browseLink = page.getByTestId('flow-public-secondary-browse-link');

      await expect(shell).toBeVisible();
      await expect(browseLink).toBeVisible();
      await expect(browseLink).toHaveText('콘텐츠 더 보기');
      await expect(browseLink).toHaveAttribute('href', '/flows');
      await expect(browseLink).not.toHaveAttribute('tabindex', '-1');
      await expect(browseLink).not.toHaveAttribute('aria-hidden', 'true');

      const focusableEntries = await collectFocusableEntries(page);
      const browseIndex = focusableEntries.findIndex(
        (entry) => entry.testId === 'flow-public-secondary-browse-link',
      );
      const primaryIndex = focusableEntries.findIndex(
        (entry) =>
          entry.testId === 'public-flow-primary-setup' ||
          entry.testId === 'public-flow-mobile-save-cta' ||
          entry.testId === 'public-flow-save-actions' ||
          entry.testId === 'moving-save-actions' ||
          entry.text.includes('내 Flow에 저장'),
      );

      expect(browseIndex).toBeGreaterThanOrEqual(0);
      expect(primaryIndex).toBeGreaterThanOrEqual(0);
      expect(browseIndex).toBeGreaterThan(primaryIndex);
    });

    test(`${route} keeps the mobile sticky primary action save-oriented`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);
      await page.evaluate(() => window.scrollTo(0, 720));
      await page.waitForTimeout(250);

      const stickyPrimaryEntries = await collectVisibleMobileStickyPrimaryEntries(page);
      expect(stickyPrimaryEntries.length).toBeGreaterThan(0);

      const [primaryEntry] = stickyPrimaryEntries;
      expect(primaryEntry.text).toMatch(/내 Flow에 저장|내 Flow에서 보기/);
      expect(primaryEntry.text).not.toMatch(/도구|파일|받기|복사|시트|캘린더|xlsx|ics/i);
    });
  }

  for (const route of PUBLIC_SHARE_ROUTES) {
    test(`${route} keeps export as a flow-level secondary action`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);

      const hierarchy = await collectPublicFlowUnitHierarchy(page);
      expect(hierarchy.exportSecondaryEntryCount).toBe(1);
      expect(hierarchy.exportSecondaryEntryLabels[0]).toMatch(/Flow|파일|가져가기/);
      expect(hierarchy.exportFormatOptionCount).toBeGreaterThanOrEqual(2);
      expect(hierarchy.itemLevelExportLikeLabelCount).toBe(0);
      expect(hierarchy.preSavePreviewControlCount).toBeGreaterThan(0);
    });
  }

  for (const route of PUBLIC_SHARE_ROUTES) {
    test(`${route} treats pre-save item checkboxes as preview selection, not completion`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);

      const hierarchy = await collectPublicFlowUnitHierarchy(page);
      expect(hierarchy.preSaveCheckboxCompletionLikeLabelCount).toBe(0);
      if (hierarchy.preSaveCheckboxCount > 0) {
        expect(hierarchy.preSaveCheckboxPreviewLabelCount).toBe(hierarchy.preSaveCheckboxCount);
      }
    });
  }

  test('input-free workbench save path remains keyboard reachable and leads to My Flow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/new-car-delivery-check');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    const setup = page.getByTestId('public-flow-primary-setup');
    await expect(setup).toBeVisible();
    await expect(setup.locator('input[type="date"]')).toHaveCount(0);

    const saveButton = setup.getByRole('button', { name: '내 Flow에 저장' });
    await expect(saveButton).toBeVisible();
    await saveButton.focus();
    await expect(saveButton).toBeFocused();
    await saveButton.click();

    const myFlowLink = setup.getByRole('link', { name: '내 Flow에서 보기' });
    await expect(myFlowLink).toBeVisible();
    await myFlowLink.click();
    await expect(page).toHaveURL(/\/my/);
    await expect(page.getByTestId('my-flow-workspace')).toBeVisible();

    const nowSection = page.getByTestId('my-flow-now-section');
    await expect(nowSection).toBeVisible();

    const postSaveComplete = nowSection.getByTestId('my-flow-task-complete-control').first();
    await expect(postSaveComplete).toBeVisible();
    await expect(postSaveComplete).toHaveAttribute('type', 'checkbox');
    await expect(postSaveComplete).toHaveAttribute('aria-label', /완료/);
    await expect(nowSection.getByRole('button', { name: /^완료$/ })).toHaveCount(0);

    await postSaveComplete.click();
    await expect.poll(() => page.evaluate(() =>
      Object.values(JSON.parse(window.localStorage.getItem('flow_builder_mvp_checks_new-car-delivery-check') || '{}')).some(Boolean),
    )).toBe(true);
  });
});
