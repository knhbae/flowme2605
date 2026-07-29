import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const repoRoot = process.cwd();
const auditDir = path.join(repoRoot, 'docs', 'content-audit');
const assetDir = path.join(
  auditDir,
  '2026-07-27-creator-portfolio-qualified-assets',
);
const dataPath = path.join(
  auditDir,
  '2026-07-27-creator-portfolio-qualified-v2.json',
);
const manifestPath = path.join(assetDir, 'source-screenshot-manifest-v2.json');
const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));

const markerOverrides = {
  'home-ajd': ['이사 체크 리스트', 'D-30'],
  'family-babyfood016': ['초기이유식 식단표', '식단표'],
  'study-mansour': ['오픽 모의고사 공부 방법', '계획표'],
  'study-opentutorials': ['토픽 목록', '수업의 저작권 정책'],
  'money-getcha': ['신차 구매', '차량 구매'],
  'health-allblanc': ['7 Days Abs Challenge', 'Day 1'],
  'meals-wtable': ['여름 반찬', '레시피'],
  'work-andstudio': ['자소서 지원동기', '6단계'],
};

function normalizeCaptureUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'blog.naver.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
        return `https://blog.naver.com/PostView.naver?blogId=${encodeURIComponent(parts[0])}&logNo=${encodeURIComponent(parts[1])}`;
      }
    }
  } catch {
    return url;
  }
  return url;
}

async function dismissOverlays(page) {
  const labels = [
    '동의',
    '모두 수락',
    'Accept all',
    'Accept',
    '확인',
    '닫기',
    '나중에',
  ];
  for (const label of labels) {
    const button = page.getByRole('button', { name: label, exact: true }).first();
    try {
      if (await button.isVisible({ timeout: 250 })) {
        await button.click({ timeout: 700 });
      }
    } catch {
      // The source sites do not share one overlay implementation.
    }
  }
}

async function positionAtEvidence(page, creatorId, sourceUrl) {
  if (sourceUrl.includes('youtube.com')) {
    await page.waitForTimeout(1_200);
    const title = page.locator('h1').first();
    try {
      if (await title.isVisible({ timeout: 1_000 })) {
        await title.scrollIntoViewIfNeeded();
        return 'youtube_title';
      }
    } catch {
      return 'youtube_top';
    }
    return 'youtube_top';
  }
  for (const marker of markerOverrides[creatorId] || []) {
    const locator = page.getByText(marker, { exact: false }).first();
    try {
      if (await locator.isVisible({ timeout: 800 })) {
        await locator.scrollIntoViewIfNeeded();
        await page.mouse.wheel(0, -110);
        await page.waitForTimeout(350);
        return `text:${marker}`;
      }
    } catch {
      // Try the next source-specific marker.
    }
  }
  await page.mouse.wheel(0, 640);
  await page.waitForTimeout(400);
  return 'scroll_fallback';
}

await fs.mkdir(assetDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: 'ko-KR',
  colorScheme: 'light',
});

const captures = [];
const failures = [];

for (const selection of data.logicHandoffSelections) {
  const bundle = data.userContentBundles.find(
    (candidate) => candidate.bundleId === selection.bundleId,
  );
  const sourceUrl = bundle.sourceUrls[0];
  const captureUrl = normalizeCaptureUrl(sourceUrl);
  const filename = `creator-${selection.creatorId}-source.png`;
  const outputPath = path.join(assetDir, filename);
  const page = await context.newPage();
  try {
    const response = await page.goto(captureUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 35_000,
    });
    await page.waitForTimeout(1_000);
    await dismissOverlays(page);
    const positionedBy = await positionAtEvidence(
      page,
      selection.creatorId,
      sourceUrl,
    );
    await page.screenshot({ path: outputPath, fullPage: false });
    captures.push({
      creatorId: selection.creatorId,
      bundleId: selection.bundleId,
      evidenceRole: 'representative_source_structure',
      observedAt: data.observedAt,
      sourceUrl,
      captureUrl,
      finalUrl: page.url(),
      status: response?.status() || null,
      pageTitle: await page.title(),
      positionedBy,
      filename,
      absolutePath: outputPath,
    });
  } catch (error) {
    failures.push({
      creatorId: selection.creatorId,
      sourceUrl,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await page.close();
  }
}

await browser.close();

const manifest = {
  schemaVersion: 'flowme-creator-portfolio-source-screenshot-manifest-v2',
  generatedAt: new Date().toISOString(),
  observedAt: data.observedAt,
  evidenceBoundary: [
    '캡처는 원문 제목·구조·목록을 확인하기 위한 일부 화면이며 원문 전체 복제본이 아니다.',
    '캡처 성공은 공개 이용 허가나 사용자 검증을 뜻하지 않는다.',
  ],
  summary: {
    expected: data.logicHandoffSelections.length,
    captured: captures.length,
    failed: failures.length,
  },
  captures,
  failures,
};

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ manifestPath, summary: manifest.summary, failures }, null, 2));
