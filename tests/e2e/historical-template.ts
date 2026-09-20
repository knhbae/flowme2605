import { expect, type Page } from '@playwright/test';
import { PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES } from '../../lib/flow/personal-workspace-poc-authoring';
import { findPersonalWorkspacePocStructureTemplatePreview } from '../../lib/flow/personal-workspace-poc-structure-template';

// Current K3A preview/apply contract; not evidence that original D2-049's
// immediate-insertion requirement has been reconciled (alpha M4 remains open).
export async function previewHistoricalTemplate(page: Page, templateId: string) {
  const template = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.find((entry) => entry.templateId === templateId)!;
  const structure = findPersonalWorkspacePocStructureTemplatePreview(templateId)!;
  expect(template).toBeTruthy();
  expect(structure).toBeTruthy();
  const editor = page.getByTestId('personal-workspace-live-editor-textarea');
  const raw = await editor.inputValue();
  const stored = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.getByTestId(`personal-workspace-authoring-template-${templateId}`).click();
  await expect(editor).toHaveValue(raw);
  await expect(page.getByTestId('personal-workspace-authoring-template-scaffold-source')).toHaveText(template.scaffold);
  expect(await page.getByTestId('personal-workspace-authoring-template-example-source').textContent()).toBe(structure.expectedRawText);
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(stored);
}

export async function applyHistoricalTemplate(page: Page, templateId: string) {
  await previewHistoricalTemplate(page, templateId);
  await page.getByTestId('personal-workspace-authoring-template-apply').click();
}
