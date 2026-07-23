import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  deepCreatorProfiles,
  observedAt,
  topCreatorIds,
} from './creator-flow-portfolio-v1-data.mjs';

const repoRoot = process.cwd();
const assetDir = path.join(repoRoot, 'docs', 'content-audit', '2026-07-23-creator-flow-portfolio-assets');
const ledgerPath = path.join(assetDir, 'opened-creator-url-ledger-v1.json');
const manifestPath = path.join(assetDir, 'screenshot-evidence-v1.json');
const ledger = JSON.parse(await fs.readFile(ledgerPath, 'utf8'));
const deepEvidenceById = new Map(ledger.deepCreatorEvidence.map((entry) => [entry.creatorId, entry]));
const topSet = new Set(topCreatorIds);

const captureOverrides = {
  'health-allblanc': 'https://www.youtube.com/playlist?list=PLhWr-n-L9kWj5NFTs11Yb8CpZeKC-edMq',
};

function safeFilePart(value) {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

async function dismissCommonOverlays(page) {
  const labels = ['동의', '모두 수락', 'Accept all', 'Accept', '확인', '닫기', '나중에'];
  for (const label of labels) {
    const button = page.getByRole('button', { name: label, exact: true }).first();
    try {
      if (await button.isVisible({ timeout: 250 })) await button.click({ timeout: 600 });
    } catch {
      // The same script covers many unrelated sites, so missing buttons are expected.
    }
  }
}

async function navigate(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1_200);
  await dismissCommonOverlays(page);
}

async function captureViewport(page, url, filename) {
  const outputPath = path.join(assetDir, filename);
  await navigate(page, url);
  await page.screenshot({ path: outputPath, fullPage: false });
  return {
    filename,
    absolutePath: outputPath,
    url,
    pageTitle: await page.title(),
  };
}

async function captureSourceArea(page, url, filename) {
  const outputPath = path.join(assetDir, filename);
  await navigate(page, url);

  if (url.includes('youtube.com/watch')) {
    const expand = page.locator('#expand').first();
    try {
      if (await expand.isVisible({ timeout: 800 })) await expand.click();
    } catch {
      // Description expansion is optional.
    }
    await page.mouse.wheel(0, 620);
    await page.waitForTimeout(600);
  } else {
    const sourceMarkers = [
      '체크리스트', '계획표', '준비물', '예방 접종 순서', '주차', '단계',
      '주요 재료', '커리큘럼', '강의', '리스트',
    ];
    let positioned = false;
    for (const marker of sourceMarkers) {
      const locator = page.getByText(marker, { exact: false }).first();
      try {
        if (await locator.isVisible({ timeout: 300 })) {
          await locator.scrollIntoViewIfNeeded();
          positioned = true;
          break;
        }
      } catch {
        // Try the next marker.
      }
    }
    if (!positioned) await page.mouse.wheel(0, 520);
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: outputPath, fullPage: false });
  return {
    filename,
    absolutePath: outputPath,
    url,
    pageTitle: await page.title(),
  };
}

async function captureCommunicationArea(page, url, filename) {
  const outputPath = path.join(assetDir, filename);
  await navigate(page, url);

  let positioned = false;
  if (url.includes('youtube.com/watch')) {
    const comments = page.locator('#comments').first();
    try {
      await comments.scrollIntoViewIfNeeded({ timeout: 8_000 });
      await page.waitForTimeout(1_500);
      positioned = true;
    } catch {
      // Fall back to a lower viewport where the comments header usually appears.
    }
  } else {
    const communicationMarkers = [
      '댓글', '리뷰', '저장', '의견 보내기', '질문', '후기', '공동공부', '커뮤니티',
    ];
    for (const marker of communicationMarkers) {
      const locator = page.getByText(marker, { exact: false }).last();
      try {
        if (await locator.isVisible({ timeout: 350 })) {
          await locator.scrollIntoViewIfNeeded();
          positioned = true;
          break;
        }
      } catch {
        // Try the next marker.
      }
    }
  }
  if (!positioned) {
    await page.evaluate(() => window.scrollTo(0, Math.min(document.body.scrollHeight * 0.72, 5_500)));
    await page.waitForTimeout(700);
  }

  await page.screenshot({ path: outputPath, fullPage: false });
  return {
    filename,
    absolutePath: outputPath,
    url,
    pageTitle: await page.title(),
  };
}

await fs.mkdir(assetDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: 'ko-KR',
  colorScheme: 'light',
});

const manifest = [];
const failures = [];

for (const creator of deepCreatorProfiles) {
  const creatorId = creator.candidateId;
  const page = await context.newPage();
  try {
    const profileFilename = `creator-${safeFilePart(creatorId)}-profile.png`;
    const profileCapture = await captureViewport(page, creator.profileUrl, profileFilename);
    manifest.push({
      creatorId,
      evidenceRole: topSet.has(creatorId) ? 'creator_profile_and_demand' : 'creator_profile',
      observedAt,
      ...profileCapture,
    });

    if (topSet.has(creatorId)) {
      const deepEvidence = deepEvidenceById.get(creatorId);
      const firstOpenedContent = deepEvidence?.contents.find((entry) => entry.opened);
      const contentUrl = captureOverrides[creatorId] || firstOpenedContent?.requestedUrl;
      if (contentUrl) {
        const sourceCapture = await captureSourceArea(
          page,
          contentUrl,
          `creator-${safeFilePart(creatorId)}-source.png`,
        );
        manifest.push({
          creatorId,
          evidenceRole: 'flow_conversion_source_rows',
          observedAt,
          ...sourceCapture,
        });

        const communicationCapture = await captureCommunicationArea(
          page,
          contentUrl,
          `creator-${safeFilePart(creatorId)}-communication.png`,
        );
        manifest.push({
          creatorId,
          evidenceRole: 'user_communication',
          observedAt,
          ...communicationCapture,
        });
      }
    }
  } catch (error) {
    failures.push({
      creatorId,
      url: page.url() || creator.profileUrl,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await page.close();
  }
}

await browser.close();

const output = {
  schemaVersion: 'creator-flow-portfolio-screenshot-evidence-v1',
  generatedAt: new Date().toISOString(),
  observedAt,
  expectedDeepCreatorProfiles: deepCreatorProfiles.length,
  expectedTopCreatorTriplets: topCreatorIds.length,
  screenshots: manifest,
  failures,
  summary: {
    screenshotCount: manifest.length,
    creatorProfileCount: manifest.filter((entry) => entry.evidenceRole.includes('creator_profile')).length,
    topDemandCount: manifest.filter((entry) => entry.evidenceRole === 'creator_profile_and_demand').length,
    topCommunicationCount: manifest.filter((entry) => entry.evidenceRole === 'user_communication').length,
    topSourceRowCount: manifest.filter((entry) => entry.evidenceRole === 'flow_conversion_source_rows').length,
    failureCount: failures.length,
  },
};

await fs.writeFile(manifestPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ manifestPath, summary: output.summary, failures }, null, 2));

\n
