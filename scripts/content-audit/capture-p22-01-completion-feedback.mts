import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const seedFlowModule = await import('../../lib/flow/seed-flows.ts');
const seedBundles =
  (seedFlowModule as { seedBundles?: typeof seedFlowModule.seedBundles }).seedBundles ??
  (seedFlowModule as unknown as { default: { seedBundles: typeof seedFlowModule.seedBundles } }).default.seedBundles;

const baseUrl = process.env.P22_CAPTURE_BASE_URL ?? 'http://127.0.0.1:3106';
const outputDir = path.resolve(
  'docs/content-audit/2026-07-11-claude-design-p22-01-completion-feedback-evidence/screenshots',
);
fs.mkdirSync(outputDir, { recursive: true });

const moving = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
if (!moving) throw new Error('moving-d30-basic seed flow is missing');
const checks = Object.fromEntries(moving.items.map((item) => [item.id, true]));

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ??
    (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined),
});

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await context.addInitScript(({ completedChecks }) => {
    if (window.sessionStorage.getItem('p22-feedback-capture-seeded') === 'true') return;
    window.sessionStorage.setItem('p22-feedback-capture-seeded', 'true');
    window.localStorage.clear();
    window.localStorage.setItem(
      'flow:saved:moving-d30-basic',
      JSON.stringify({
        slug: 'moving-d30-basic',
        savedAt: '2026-07-11T00:00:00.000Z',
        selectedArtifactMode: 'checklist',
      }),
    );
    window.localStorage.setItem('flow_builder_mvp_checks_moving-d30-basic', JSON.stringify(completedChecks));
  }, { completedChecks: checks });

  const page = await context.newPage();
  await page.goto(`${baseUrl}/my`, { waitUntil: 'networkidle' });
  await page.getByTestId('my-flow-view-flow').click();
  await page.getByTestId('my-flow-completion-feedback').waitFor();
  await page.screenshot({
    path: path.join(outputDir, '01-completed-flow-feedback-entry-mobile.png'),
    fullPage: true,
  });

  const feedback = page.getByTestId('my-flow-completion-feedback');
  await feedback.getByTestId('my-flow-reflection-open').click();
  await feedback.getByTestId('my-flow-reflection-note').fill('다음 이사에도 같은 순서로 확인하고 싶어요.');
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await feedback.screenshot({
    path: path.join(outputDir, '02-private-reflection-mobile.png'),
  });
  await feedback.getByTestId('my-flow-reflection-save').click();

  await feedback.getByTestId('my-flow-source-correction-open').click();
  await feedback.getByTestId('my-flow-source-correction-scope').selectOption({ index: 1 });
  await feedback.getByTestId('my-flow-source-correction-note').fill('이 단계는 관리사무소 운영 시간을 먼저 확인해야 해요.');
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await feedback.screenshot({
    path: path.join(outputDir, '03-unsent-source-correction-mobile.png'),
  });
  await feedback.getByTestId('my-flow-source-correction-save').click();
  await feedback.getByRole('button', { name: '닫기' }).click();

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('my-flow-view-flow').click();
  await page.getByTestId('my-flow-completion-feedback-saved-summary').waitFor();
  await page.screenshot({
    path: path.join(outputDir, '04-completed-flow-feedback-saved-wide.png'),
    fullPage: true,
  });

  const measurements = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    feedbackPanelCount: document.querySelectorAll('[data-testid="my-flow-completion-feedback"]').length,
    publicReviewTextCount: (document.body.innerText.match(/공개 리뷰|별점|제작자에게 전송됨/g) || []).length,
  }));
  process.stdout.write(`${JSON.stringify(measurements)}\n`);
} finally {
  await browser.close();
}
