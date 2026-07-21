import type { Page } from '@playwright/test';

/**
 * Legacy deep-contract specs still inspect the detailed artifact workbench.
 * P28 keeps that workbench behind a disclosure by default, so these specs open
 * it without changing the production hierarchy. P28's own specs verify the
 * collapsed default separately.
 */
export async function openPublicDetailWorkspaceForDeepInspection(page: Page) {
  await page.addInitScript(() => {
    const openWorkspace = () => {
      document
        .querySelectorAll<HTMLDetailsElement>('details[data-testid="public-flow-detail-workspace"]')
        .forEach((details) => {
          details.open = true;
        });
    };

    window.addEventListener('DOMContentLoaded', () => {
      openWorkspace();
      new MutationObserver(openWorkspace).observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    });
  });
}
