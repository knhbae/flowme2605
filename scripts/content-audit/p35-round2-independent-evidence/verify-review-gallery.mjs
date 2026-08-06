import { createHash } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const outputRoot = path.resolve(
  repoRoot,
  process.env.FLOWME_P35_R2_REVIEW_EVIDENCE_DIR
    ?? path.join('output', 'playwright', 'p35-round2-review-rehearsal'),
);
const manifestBuffer = await readFile(path.join(outputRoot, 'master-manifest.json'));
const manifest = JSON.parse(manifestBuffer.toString('utf8'));
const hashFailures = [];
const linkFailures = [];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

for (const scenario of manifest.scenarios) {
  for (const file of scenario.files) {
    const absolute = path.resolve(outputRoot, file.relativePath);
    if (!absolute.startsWith(`${outputRoot}${path.sep}`)) {
      hashFailures.push({ relativePath: file.relativePath, reason: 'outside_output_root' });
      continue;
    }
    try {
      const buffer = await readFile(absolute);
      const actualHash = sha256(buffer);
      if (buffer.length !== file.byteLength || actualHash !== file.sha256) {
        hashFailures.push({
          relativePath: file.relativePath,
          expectedBytes: file.byteLength,
          actualBytes: buffer.length,
          expectedSha256: file.sha256,
          actualSha256: actualHash,
        });
      }
    } catch (error) {
      hashFailures.push({ relativePath: file.relativePath, reason: String(error) });
    }
  }
}

for (const file of manifest.candidateArtifacts ?? []) {
  const absolute = path.resolve(outputRoot, file.relativePath);
  if (!absolute.startsWith(`${outputRoot}${path.sep}`)) {
    hashFailures.push({ relativePath: file.relativePath, reason: 'outside_output_root' });
    continue;
  }
  try {
    const buffer = await readFile(absolute);
    const actualHash = sha256(buffer);
    if (buffer.length !== file.byteLength || actualHash !== file.sha256) {
      hashFailures.push({
        relativePath: file.relativePath,
        expectedBytes: file.byteLength,
        actualBytes: buffer.length,
        expectedSha256: file.sha256,
        actualSha256: actualHash,
      });
    }
  } catch (error) {
    hashFailures.push({ relativePath: file.relativePath, reason: String(error) });
  }
}

const htmlPath = path.join(outputRoot, 'index.html');
const htmlSource = await readFile(htmlPath, 'utf8');
for (const match of htmlSource.matchAll(/\s(?:href|src)="([^"]+)"/gu)) {
  const value = match[1];
  if (value.startsWith('#') || /^(?:https?:|mailto:)/u.test(value)) continue;
  const target = path.resolve(outputRoot, value.split('#', 1)[0]);
  try {
    await access(target);
  } catch {
    linkFailures.push({ value, target });
  }
}

const launchOptions = {};
const chromePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
try {
  await access(chromePath);
  launchOptions.executablePath = chromePath;
} catch {
  // Playwright-managed Chromium remains the fallback.
}
const browser = await chromium.launch({ headless: true, ...launchOptions });
const checks = [];
try {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1024, height: 768 },
    { width: 1440, height: 1000 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    const quality = await page.evaluate(() => ({
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
      brokenImages: Array.from(document.images).filter(
        (image) => !image.complete || image.naturalWidth === 0,
      ).length,
      replacementCharacters: (document.body.innerText.match(/�/gu) ?? []).length,
      scenarioSectionCount: document.querySelectorAll('section[id^="S"]').length,
      emptyScenarioSectionCount: Array.from(document.querySelectorAll('section[id^="S"]')).filter(
        (section) => section.querySelectorAll('img, li').length === 0,
      ).length,
    }));
    checks.push({ viewport: `${viewport.width}x${viewport.height}`, ...quality, errors });
    await context.close();
  }
} finally {
  await browser.close();
}

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  evidenceClass: manifest.evidenceClass,
  observedUsers: 0,
  scenarioCount: manifest.scenarios.length,
  candidateArtifactCount: manifest.candidateArtifacts?.length ?? 0,
  masterManifestByteLength: manifestBuffer.length,
  masterManifestSha256: sha256(manifestBuffer),
  hashFailureCount: hashFailures.length,
  localLinkFailureCount: linkFailures.length,
  horizontalOverflowCount: checks.filter((check) => check.horizontalOverflow > 0).length,
  brokenImageCount: checks.reduce((sum, check) => sum + check.brokenImages, 0),
  replacementCharacterCount: checks.reduce((sum, check) => sum + check.replacementCharacters, 0),
  consoleAndPageErrorCount: checks.reduce((sum, check) => sum + check.errors.length, 0),
  hashFailures,
  linkFailures,
  checks,
};
await writeFile(
  path.join(outputRoot, 'gallery-verification.json'),
  `${JSON.stringify(result, null, 2)}\n`,
  'utf8',
);
console.log(JSON.stringify(result, null, 2));

if (
  result.scenarioCount !== 23
  || result.hashFailureCount > 0
  || result.localLinkFailureCount > 0
  || result.horizontalOverflowCount > 0
  || result.brokenImageCount > 0
  || result.replacementCharacterCount > 0
  || result.consoleAndPageErrorCount > 0
) {
  process.exitCode = 1;
}
