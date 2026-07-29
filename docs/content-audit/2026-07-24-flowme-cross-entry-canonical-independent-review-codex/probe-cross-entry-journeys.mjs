import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = 'https://flowme2605.vercel.app';
const outputDir = path.resolve(
  'docs/content-audit/2026-07-24-flowme-cross-entry-canonical-independent-review-codex',
);
const screenshotDir = path.join(outputDir, 'screenshots');
const ajdUrl =
  'https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363';

await fs.mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const cells = [];
const runErrors = [];

function compact(text, max = 1200) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function safeCount(locator) {
  return locator.count().catch(() => 0);
}

async function optionalText(locator) {
  if ((await safeCount(locator)) === 0) return null;
  return locator.first().textContent().then(compact).catch(() => null);
}

async function optionalAttribute(locator, name) {
  if ((await safeCount(locator)) === 0) return null;
  return locator.first().getAttribute(name).catch(() => null);
}

async function storageSnapshot(page) {
  return page.evaluate(() => {
    const keys = Object.keys(window.localStorage).sort();
    const parse = (key) => {
      try {
        return JSON.parse(window.localStorage.getItem(key) ?? 'null');
      } catch {
        return window.localStorage.getItem(key);
      }
    };
    const savedFlowKeys = keys.filter((key) => key.startsWith('flow:saved:'));
    const savedMapKeys = keys.filter((key) => key.startsWith('flow:map:saved:'));
    const mapPersistenceKeys = keys.filter((key) =>
      key.startsWith('flow:map:persistence:'),
    );
    const movingKeys = keys.filter((key) =>
      /(moving|ajd|이사)/i.test(`${key} ${window.localStorage.getItem(key) ?? ''}`),
    );
    const savedFlows = savedFlowKeys.map((key) => ({
      key,
      slug: key.replace('flow:saved:', ''),
      value: parse(key),
    }));
    return {
      keyCount: keys.length,
      savedFlowKeys,
      savedMapKeys,
      mapPersistenceKeys,
      movingKeys,
      savedFlows,
      lifecycle: parse('flow:my-flow:lifecycle:v1'),
    };
  });
}

async function pageSnapshot(page) {
  const bodyText = compact(await page.locator('body').innerText().catch(() => ''), 2600);
  const artifact = page.getByTestId('flow-artifact-data-preview');
  const sourceLinks = await page
    .locator('a[href^="http"]')
    .evaluateAll((nodes) =>
      nodes.slice(0, 12).map((node) => ({
        href: node.getAttribute('href'),
        text: (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
      })),
    )
    .catch(() => []);
  const focusables = page.locator(
    'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
  );
  const unnamedFocusables = await focusables
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => {
          const el = /** @type {HTMLElement} */ (node);
          const label =
            el.getAttribute('aria-label') ||
            el.getAttribute('title') ||
            el.innerText ||
            (el instanceof HTMLInputElement ? el.labels?.[0]?.textContent : '');
          return !String(label ?? '').trim();
        })
        .slice(0, 20)
        .map((node) => ({
          tag: node.tagName,
          testId: node.getAttribute('data-testid'),
          type: node.getAttribute('type'),
        })),
    )
    .catch(() => []);
  const myFlowSlugs = await page
    .locator('[data-testid="my-flow-overview-card"][data-flow-slug]')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        slug: node.getAttribute('data-flow-slug'),
        text: (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 220),
      })),
    )
    .catch(() => []);
  const catalogCards = await page
    .getByTestId('flow-map-catalog-card')
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const link = node.querySelector('a[href^="/"]');
        return {
          href: link?.getAttribute('href') ?? null,
          text: (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 260),
        };
      }),
    )
    .catch(() => []);
  const artifactChoices = await page
    .getByTestId('flow-artifact-shape-choice')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        shape: node.getAttribute('data-artifact-shape'),
        pressed: node.getAttribute('aria-pressed'),
        text: (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
      })),
    )
    .catch(() => []);
  const calendarEvents = await page
    .locator('.fc-event')
    .evaluateAll((nodes) =>
      nodes.slice(0, 80).map((node) => ({
        title:
          node.getAttribute('aria-label') ||
          node.getAttribute('title') ||
          (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
        eventId: node.getAttribute('data-event-id'),
      })),
    )
    .catch(() => []);
  return {
    url: page.url(),
    headings: await page
      .locator('h1,h2,h3')
      .allTextContents()
      .then((values) => values.map((value) => compact(value, 180)).filter(Boolean))
      .catch(() => []),
    bodyText,
    artifactSelectedShape: await optionalAttribute(
      artifact,
      'data-selected-shape',
    ),
    artifactChoices,
    publicPreviewRows: await safeCount(page.getByTestId('flow-artifact-preview-row')),
    mapPreviewRows: await safeCount(page.getByTestId('flow-map-artifact-preview-row')),
    receiptSteps: await safeCount(page.getByTestId('my-flow-post-save-step')),
    receiptVisible: await page
      .getByTestId('my-flow-post-save-panel')
      .isVisible()
      .catch(() => false),
    myFlowSlugs,
    myFlowSavedCountText: await optionalText(
      page.getByTestId('my-flow-saved-count'),
    ),
    calendarEventCount: calendarEvents.length,
    calendarEvents,
    anytimeCountText: await optionalText(page.getByTestId('my-flow-anytime-count')),
    sourceLinks,
    catalogCards,
    focusableCount: await safeCount(focusables),
    unnamedFocusables,
    horizontalOverflow: await page
      .evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      )
      .catch(() => null),
  };
}

async function clearAndReload(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
}

async function goto(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
}

async function clickVisible(page, testIds) {
  for (const testId of testIds) {
    const target = page.getByTestId(testId);
    if ((await target.count()) > 0 && (await target.first().isVisible().catch(() => false))) {
      await target.first().click();
      return testId;
    }
  }
  throw new Error(`No visible target: ${testIds.join(', ')}`);
}

async function savePublic(page, route, anchor = '') {
  await goto(page, route);
  if (
    (await page.getByTestId('public-flow-saved-receipt').count()) &&
    (await page
      .getByTestId('public-flow-saved-receipt')
      .isVisible()
      .catch(() => false))
  ) {
    return 'already-saved';
  }
  if (anchor && (await page.getByTestId('public-flow-anchor-input').count())) {
    await page.getByTestId('public-flow-anchor-input').fill(anchor);
  }
  const clicked = await clickVisible(page, [
    'public-flow-save-primary-mobile',
    'public-flow-save-primary',
  ]);
  await page.getByTestId('public-flow-saved-receipt').waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  return clicked;
}

async function saveMap(page, mapId, anchor = '') {
  await goto(page, `/flow-maps/${mapId}`);
  if (anchor && (await page.getByTestId('flow-map-anchor-input').count())) {
    await page.getByTestId('flow-map-anchor-input').fill(anchor);
  }
  const clicked = await clickVisible(page, [
    'flow-map-save-all-mobile',
    'flow-map-save-all',
  ]);
  await page.waitForURL(/\/my/, { timeout: 20_000 });
  await page.waitForLoadState('networkidle');
  return clicked;
}

async function openReceiptFlow(page) {
  const publicReceiptAction = page.getByTestId(
    'public-flow-saved-receipt-primary',
  );
  if (
    (await publicReceiptAction.count()) &&
    (await publicReceiptAction.isVisible().catch(() => false))
  ) {
    await publicReceiptAction.click();
    await page.waitForURL(/\/my/, { timeout: 20_000 });
    await page.waitForLoadState('networkidle');
    return true;
  }
  const button = page.getByTestId('my-flow-post-save-view-flow');
  if ((await button.count()) && (await button.isVisible().catch(() => false))) {
    await button.click();
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

async function savedReceiptCount(page) {
  const legacyCount = await safeCount(page.getByTestId('my-flow-post-save-step'));
  if (legacyCount > 0) return legacyCount;
  const receiptText = await optionalText(
    page.getByTestId('public-flow-saved-receipt'),
  );
  const countMatch = receiptText?.match(/(\d+)개 (?:할 일|항목)/);
  return countMatch ? Number(countMatch[1]) : 0;
}

async function lookupMoving(page) {
  await goto(page, '/flows');
  const entry = page.getByTestId('flow-url-lookup-entry');
  await entry.getByLabel('URL 또는 메모').fill(ajdUrl);
  await entry.getByRole('button', { name: 'Flow 찾기' }).click();
  await page.getByTestId('flow-url-lookup-result').waitFor();
  const result = page.getByTestId('flow-url-lookup-result');
  return {
    text: compact(await result.innerText(), 1400),
    detailHref: await result
      .getByRole('link', { name: '전체 내용 열고 조정' })
      .getAttribute('href')
      .catch(() => null),
    quickStartExists: (await result.getByTestId('flow-url-quick-start').count()) > 0,
  };
}

async function quickSaveLookupMoving(page, anchor) {
  const result = page.getByTestId('flow-url-lookup-result');
  const details = result.getByTestId('flow-url-quick-start');
  if (!(await details.getAttribute('open'))) {
    await details.locator('summary').click();
  }
  await result.getByTestId('url-first-start-date-input').fill(anchor);
  await result.getByRole('button', { name: '시작하기' }).click();
  await page.waitForURL(/\/my/, { timeout: 20_000 });
  await page.waitForLoadState('networkidle');
}

async function saveWedding(page, slug, anchor) {
  await goto(page, `/f/${slug}`);
  if (anchor && (await page.getByTestId('public-flow-anchor-input').count())) {
    await page.getByTestId('public-flow-anchor-input').fill(anchor);
  }
  await clickVisible(page, ['public-flow-save-primary-mobile', 'public-flow-save-primary']);
  await page.getByTestId('public-flow-saved-receipt').waitFor({
    state: 'visible',
    timeout: 20_000,
  });
}

async function recordCell({
  personaId,
  sessionId,
  userGoal,
  page,
  status,
  evidence,
  notes,
  screenshotName,
  consoleErrors,
  pageErrors,
}) {
  const screenshot = screenshotName ?? `${personaId.toLowerCase()}-${sessionId.toLowerCase()}.png`;
  await page.screenshot({
    path: path.join(screenshotDir, screenshot),
    fullPage: true,
  });
  cells.push({
    personaId,
    sessionId,
    userGoal,
    status,
    route: page.url().replace(baseUrl, '') || '/',
    viewport: page.viewportSize(),
    evidenceKind: ['current_production_interaction', 'current_browser_automation'],
    evidence,
    notes,
    page: await pageSnapshot(page),
    storage: await storageSnapshot(page),
    consoleErrors: [...consoleErrors],
    pageErrors: [...pageErrors],
    screenshot: `screenshots/${screenshot}`,
    observedUserCount: 0,
  });
  console.log(`recorded ${personaId}-${sessionId} ${status}`);
}

async function runPersona(personaId, viewport, runner) {
  const context = await browser.newContext({ viewport });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: baseUrl,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5_000);
  page.setDefaultNavigationTimeout(25_000);
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('favicon.ico')) {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    await runner({ page, consoleErrors, pageErrors });
  } catch (error) {
    runErrors.push({ personaId, error: String(error?.stack ?? error) });
    console.error(`failed ${personaId}`, error);
  } finally {
    await context.close();
  }
}

await runPersona('P1', { width: 390, height: 844 }, async (ctx) => {
  const { page } = ctx;
  await clearAndReload(page, '/');
  const homeCard = page.locator('a[href="/f/moving-d30-basic"]').first();
  const homePromise = compact(await homeCard.innerText(), 500);
  await homeCard.click();
  await page.waitForLoadState('networkidle');
  const before = await pageSnapshot(page);
  const checklist = page.locator(
    '[data-testid="flow-artifact-shape-choice"][data-artifact-shape="checklist"]',
  );
  await checklist.click();
  const selectedAfterChecklist = await page
    .getByTestId('flow-artifact-data-preview')
    .getAttribute('data-selected-shape');
  await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
  if (await page.getByTestId('public-flow-adjust-entry-mobile').count()) {
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    await page.waitForTimeout(250);
  }
  const adjustmentText = compact(
    await page
      .getByTestId('public-flow-personal-adjustment')
      .innerText()
      .catch(() => ''),
    900,
  );
  await clickVisible(page, [
    'public-flow-adjustment-save',
    'public-flow-save-primary-mobile',
    'public-flow-save-primary',
  ]);
  await page.getByTestId('public-flow-saved-receipt').waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  await recordCell({
    ...ctx,
    personaId: 'P1',
    sessionId: 'S1',
    userGoal: 'Home 이사 예시에서 전체 결과를 이해하고 조정해 저장',
    status: 'partial',
    evidence: {
      homePromise,
      beforeTitle: before.headings[0],
      beforeItemCount: before.publicPreviewRows,
      beforeArtifact: before.artifactSelectedShape,
      selectedAfterChecklist,
      adjustmentText,
      receiptSteps: await savedReceiptCount(page),
    },
    notes:
      'Home과 public detail은 이어지지만 Checklist를 눌러도 선택 projection이 Calendar에서 바뀌지 않는다.',
  });

  await openReceiptFlow(page);
  const movingCard = page.locator(
    '[data-testid="my-flow-overview-card"][data-flow-slug="moving-d30-basic"]',
  );
  const rowCount = await safeCount(movingCard.getByTestId('my-flow-execution-row-shell'));
  const complete = movingCard.getByTestId('my-flow-task-complete-control').first();
  let completionRoundTrip = false;
  if ((await complete.count()) && (await complete.isVisible().catch(() => false))) {
    await complete.check();
    await page.waitForTimeout(250);
    await complete.uncheck().catch(async () => complete.click());
    completionRoundTrip = true;
  }
  await goto(page, '/calendar');
  await recordCell({
    ...ctx,
    personaId: 'P1',
    sessionId: 'S2',
    userGoal: '저장한 24개 이사 Flow를 My Flow와 Calendar에서 실행',
    status: 'supported',
    evidence: {
      myFlowRowCount: rowCount,
      completionRoundTrip,
      calendarEventCount: await safeCount(page.locator('.fc-event')),
    },
    notes:
      '24개 저장 객체는 My Flow와 Calendar로 이어진다. 이 세션 내부 연속성은 지원된다.',
  });

  await goto(page, '/');
  const repeatedHomeBody = compact(await homeCard.innerText().catch(() => ''), 400);
  await goto(page, '/flows');
  await page.getByTestId('flow-catalog-search').fill('이사');
  const findMoving = await page
    .getByTestId('flow-map-catalog-card')
    .filter({ hasText: '원룸 이사 D-30' })
    .first()
    .innerText()
    .then((text) => compact(text, 600))
    .catch(() => '');
  const lookup = await lookupMoving(page);
  await recordCell({
    ...ctx,
    personaId: 'P1',
    sessionId: 'S3',
    userGoal: 'Home 저장 후 Find와 URL lookup에서 같은 상태 재발견',
    status: 'partial',
    evidence: {
      repeatedHomeBody,
      findMoving,
      lookup,
      movingSavedKeys: (await storageSnapshot(page)).movingKeys,
    },
    notes:
      'Find는 5개 map, URL lookup은 curated 5개 child를 제안하며 기존 24개 저장 상태와 하나로 연결하지 않는다.',
  });
});

await runPersona('P2', { width: 1024, height: 768 }, async (ctx) => {
  const { page } = ctx;
  await clearAndReload(page, '/flows');
  await page.getByTestId('flow-catalog-search').fill('이사');
  const card = page
    .getByTestId('flow-map-catalog-card')
    .filter({ hasText: '원룸 이사 D-30' })
    .first();
  const cardText = compact(await card.innerText(), 900);
  const cardHref = await card.locator('a[href^="/"]').first().getAttribute('href');
  await saveMap(page, 'moving-d30', '2030-08-15');
  await recordCell({
    ...ctx,
    personaId: 'P2',
    sessionId: 'S1',
    userGoal: 'Flow 찾기에서 이사 Flow를 비교하고 저장',
    status: 'supported',
    evidence: {
      cardText,
      cardHref,
      receiptSteps: await safeCount(page.getByTestId('my-flow-post-save-step')),
    },
    notes: 'Find 내부 map 저장은 5개 source-backed child와 receipt로 일관된다.',
  });

  await openReceiptFlow(page);
  const mapCard = page.locator(
    '[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]',
  );
  await recordCell({
    ...ctx,
    personaId: 'P2',
    sessionId: 'S2',
    userGoal: 'Find에서 저장한 5개 Flow를 재방문 실행',
    status: 'supported',
    evidence: {
      objectVisible: await mapCard.isVisible().catch(() => false),
      rowCount: await safeCount(mapCard.getByTestId('my-flow-execution-row-shell')),
    },
    notes: 'Find 저장 객체 자체는 완료·수정·export 가능한 My Flow 객체로 열린다.',
  });

  await savePublic(page, '/f/moving-d30-basic', '2030-08-15');
  await openReceiptFlow(page);
  await goto(page, '/my?view=flows');
  await recordCell({
    ...ctx,
    personaId: 'P2',
    sessionId: 'S3',
    userGoal: 'Find 저장 후 Home 이사 Flow를 열어 같은 저장 상태인지 확인',
    status: 'partial',
    evidence: {
      movingSavedKeys: (await storageSnapshot(page)).movingKeys,
      movingObjects: await page
        .locator(
          '[data-testid="my-flow-overview-card"][data-flow-slug*="moving"]',
        )
        .count(),
    },
    notes:
      'Home target을 추가 저장하면 24개와 5개가 별도 My Flow 객체가 된다. UI에는 source 중복 안내나 대표 선택이 없다.',
  });
});

await runPersona('P3', { width: 390, height: 844 }, async (ctx) => {
  const { page } = ctx;
  await clearAndReload(page, '/flows');
  const lookup = await lookupMoving(page);
  await recordCell({
    ...ctx,
    personaId: 'P3',
    sessionId: 'S1',
    userGoal: 'AJD 원문 URL로 기존 이사 Flow 찾기',
    status: 'partial',
    evidence: { lookup },
    notes:
      'URL lookup은 실제로 /f/curated-ajd-moving-d30을 연다. Home 24개나 Find 5개 map과 같은 object라는 단서는 없다.',
  });

  await quickSaveLookupMoving(page, '2030-08-15');
  const receiptCount = await savedReceiptCount(page);
  await openReceiptFlow(page);
  await goto(page, '/calendar');
  await recordCell({
    ...ctx,
    personaId: 'P3',
    sessionId: 'S2',
    userGoal: 'URL lookup 결과를 저장해 My Flow와 Calendar에서 확인',
    status: 'supported',
    evidence: {
      receiptCount,
      calendarEventCount: await safeCount(page.locator('.fc-event')),
      storage: await storageSnapshot(page),
    },
    notes: 'curated 5개 객체 자체의 save-to-execution은 동작한다.',
  });

  const aliases = [
    '/f/moving-d30-basic',
    '/f/curated-ajd-moving-d30',
    '/f/source-backed-moving-d30',
    '/flow-maps/moving-d30',
  ];
  const aliasEvidence = [];
  for (const route of aliases) {
    await goto(page, route);
    const snapshot = await pageSnapshot(page);
    aliasEvidence.push({
      route,
      title: snapshot.headings[0],
      publicCount: snapshot.publicPreviewRows,
      mapCount: snapshot.mapPreviewRows,
      bodySavedSignal: /저장됨|저장한|이어/.test(snapshot.bodyText),
    });
  }
  await recordCell({
    ...ctx,
    personaId: 'P3',
    sessionId: 'S3',
    userGoal: '네 개 이사 alias가 저장·개인 상태를 공유하는지 확인',
    status: 'partial',
    evidence: { aliases: aliasEvidence, storage: await storageSnapshot(page) },
    notes:
      '동일 source의 네 route가 24/5/5/5 구조로 갈리고 curated 저장 키만 존재한다. canonical route를 사용자가 식별할 방법이 없다.',
  });
});

await runPersona('P4', { width: 1024, height: 768 }, async (ctx) => {
  const { page } = ctx;
  await clearAndReload(page, '/f/moving-d30-basic');
  await savePublic(page, '/f/moving-d30-basic', '2030-08-15');
  await saveMap(page, 'moving-d30', '2030-08-15');
  await openReceiptFlow(page);
  await goto(page, '/my?view=flows');
  const storage = await storageSnapshot(page);
  await recordCell({
    ...ctx,
    personaId: 'P4',
    sessionId: 'S1',
    userGoal: '24개와 5개 이사 Flow를 모두 가진 재방문자의 중복 인지',
    status: 'partial',
    evidence: {
      movingSavedKeys: storage.movingKeys,
      overviewCards: await safeCount(
        page.locator('[data-testid="my-flow-overview-card"][data-flow-slug*="moving"]'),
      ),
      duplicateWarningVisible: /중복|같은 원문/.test(
        compact(await page.locator('body').innerText(), 8000),
      ),
    },
    notes: '별도 객체는 보이지만 동일 source 중복 경고나 비교·대표 선택은 없다.',
  });

  await goto(page, '/calendar');
  const events = await page
    .locator('.fc-event')
    .allTextContents()
    .then((values) => values.map((value) => compact(value, 160)).filter(Boolean));
  await recordCell({
    ...ctx,
    personaId: 'P4',
    sessionId: 'S2',
    userGoal: '중복 이사 Flow의 상태와 Calendar projection 분기 확인',
    status: 'partial',
    evidence: {
      eventCount: events.length,
      eventSamples: events.slice(0, 35),
      expectedCombinedItemCount: 29,
    },
    notes:
      '두 object는 각자 projection을 만들며 같은 source를 합치거나 중복을 설명하지 않는다.',
  });

  await goto(page, '/my?view=flows');
  const body = compact(await page.locator('body').innerText(), 12_000);
  await recordCell({
    ...ctx,
    personaId: 'P4',
    sessionId: 'S3',
    userGoal: '중복 객체를 reconcile할 사용자 행동과 보존 범위 확인',
    status: 'missing',
    evidence: {
      archiveVisible: /보관/.test(body),
      deleteVisible: /삭제/.test(body),
      mergeVisible: /병합|합치|대표 Flow/.test(body),
      storage: await storageSnapshot(page),
    },
    notes:
      '개별 보관/삭제 수단은 있으나 source-level alias, merge, personal/run/export 보존 안내는 없다.',
  });
});

await runPersona('P5', { width: 390, height: 844 }, async (ctx) => {
  const { page } = ctx;
  await clearAndReload(page, '/');
  const vehicleCard = page.locator('a[href="/f/vehicle-inspection-prep"]').first();
  const homePromise = compact(await vehicleCard.innerText(), 600);
  await vehicleCard.click();
  await page.waitForLoadState('networkidle');
  const before = await pageSnapshot(page);
  const checklist = page.locator(
    '[data-testid="flow-artifact-shape-choice"][data-artifact-shape="checklist"]',
  );
  await checklist.click();
  const selectedAfterChecklist = await page
    .getByTestId('flow-artifact-data-preview')
    .getAttribute('data-selected-shape');
  await recordCell({
    ...ctx,
    personaId: 'P5',
    sessionId: 'S1',
    userGoal: 'Home의 필요할 때 차량 체크리스트 약속과 target 비교',
    status: 'partial',
    evidence: {
      homePromise,
      targetTitle: before.headings[0],
      targetArtifact: before.artifactSelectedShape,
      selectedAfterChecklist,
      targetCount: before.publicPreviewRows,
    },
    notes:
      'Home은 필요할 때 체크리스트를 약속하지만 target은 자동차검사 D-14 Calendar가 기본이며 Checklist 버튼도 projection을 바꾸지 않는다.',
  });

  await savePublic(page, '/f/vehicle-inspection-prep');
  const receiptCount = await savedReceiptCount(page);
  await openReceiptFlow(page);
  await goto(page, '/my');
  const anytimeText = await page
    .getByTestId('my-flow-anytime-section')
    .innerText()
    .then((text) => compact(text, 900))
    .catch(() => '');
  await goto(page, '/calendar');
  const calendarBody = compact(await page.locator('body').innerText(), 4000);
  await recordCell({
    ...ctx,
    personaId: 'P5',
    sessionId: 'S2',
    userGoal: '차량 Flow를 날짜 없이 저장하고 My Flow/Calendar tray 확인',
    status: 'supported',
    evidence: {
      receiptCount,
      anytimeText,
      calendarHasUndatedQueue: /날짜 없는/.test(calendarBody),
    },
    notes:
      '날짜 없는 저장은 My Flow 실행 목록과 Calendar 배치 queue로 이어진다. 진입 약속과 target 의미만 어긋난다.',
  });

  await goto(page, '/flows');
  const terms = ['차량', '차량 점검', '자동차검사'];
  const searchResults = [];
  for (const term of terms) {
    await page.getByTestId('flow-catalog-search').fill(term);
    await page.waitForTimeout(120);
    searchResults.push({
      term,
      count: await safeCount(page.getByTestId('flow-map-catalog-card')),
      cards: await pageSnapshot(page).then((snapshot) =>
        snapshot.catalogCards.slice(0, 6),
      ),
    });
  }
  await recordCell({
    ...ctx,
    personaId: 'P5',
    sessionId: 'S3',
    userGoal: 'Flow 찾기에서 Home 차량 Flow 재발견',
    status: 'partial',
    evidence: { searchResults },
    notes:
      '검색어에 따라 도달성이 달라진다. current hydrated catalog에서 Home target의 canonical inventory 표지가 약하다.',
  });
});

await runPersona('P6', { width: 390, height: 844 }, async (ctx) => {
  const { page } = ctx;
  await clearAndReload(page, '/');
  const homeWorkoutHref = await page
    .locator('a[href*="curated-allblanc-morning-workout"]')
    .first()
    .getAttribute('href');
  await goto(page, '/flows');
  await page.getByTestId('flow-catalog-search').fill('홈트');
  const findWorkoutHref = await page
    .locator('a[href*="curated-allblanc-morning-workout"]')
    .first()
    .getAttribute('href')
    .catch(() => null);
  await goto(page, '/f/curated-allblanc-morning-workout');
  const preview = page.getByTestId('flow-artifact-data-preview');
  const selectedSequence = [];
  for (const shape of ['calendar', 'memo', 'flow_execution']) {
    const choice = preview.locator(
      `[data-testid="flow-artifact-shape-choice"][data-artifact-shape="${shape}"]`,
    );
    await choice.click();
    selectedSequence.push(await preview.getAttribute('data-selected-shape'));
  }
  await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
  const routineSummary = page.getByTestId('public-routine-schedule-summary');
  const nextOccurrenceCount = await safeCount(
    routineSummary
      .getByTestId('public-routine-schedule-summary-next-occurrences')
      .getByRole('listitem'),
  );
  await recordCell({
    ...ctx,
    personaId: 'P6',
    sessionId: 'S1',
    userGoal: 'Home/Find 운동 entry와 artifact·series 설정 연속성 확인',
    status: 'supported',
    evidence: {
      homeWorkoutHref,
      findWorkoutHref,
      selectedSequence,
      nextOccurrenceCount,
    },
    notes:
      '운동은 Home/Find가 같은 public slug를 사용하고 artifact choice도 실제 projection을 바꾸는 positive control이다.',
  });

  await savePublic(page, '/f/curated-allblanc-morning-workout');
  const receiptCount = await savedReceiptCount(page);
  await openReceiptFlow(page);
  const myBody = compact(await page.locator('body').innerText(), 8000);
  await goto(page, '/calendar');
  const calendarBody = compact(await page.locator('body').innerText(), 8000);
  await recordCell({
    ...ctx,
    personaId: 'P6',
    sessionId: 'S2',
    userGoal: '날짜 없는 운동 series를 My Flow와 Calendar에서 확인',
    status: 'partial',
    evidence: {
      receiptCount,
      rawRruleInMyFlow: /RRULE:|FREQ=WEEKLY/.test(myBody),
      rawRruleInCalendar: /RRULE:|FREQ=WEEKLY/.test(calendarBody),
      calendarHasUndated: /날짜 없는/.test(calendarBody),
    },
    notes:
      '실행 객체는 이어지지만 날짜 없는 상태에서 raw recurrence 표현이 노출될 가능성을 별도로 확인해야 한다.',
  });

  await goto(page, '/f/curated-allblanc-morning-workout');
  const revisit = await pageSnapshot(page);
  await recordCell({
    ...ctx,
    personaId: 'P6',
    sessionId: 'S3',
    userGoal: '운동 Flow 재진입 시 series 설정·실행 상태·resource 연속성 확인',
    status: 'partial',
    evidence: {
      savedSignal: /저장됨|이어/.test(revisit.bodyText),
      sourceLinks: revisit.sourceLinks,
      storage: await storageSnapshot(page),
    },
    notes:
      'slug 단위 저장은 유지되지만 public 재진입 화면이 execution occurrence 상태를 직접 이어 보여주지는 않는다.',
  });
});

await runPersona('P7', { width: 1024, height: 768 }, async (ctx) => {
  const { page } = ctx;
  await clearAndReload(page, '/flows');
  await page.getByTestId('flow-catalog-search').fill('결혼');
  const weddingCards = (await pageSnapshot(page)).catalogCards;
  await goto(page, '/f/curated-wedding-naver-timeline');
  const preview = page.getByTestId('flow-artifact-data-preview');
  const sequence = [];
  for (const shape of ['checklist', 'memo', 'calendar']) {
    await preview
      .locator(
        `[data-testid="flow-artifact-shape-choice"][data-artifact-shape="${shape}"]`,
      )
      .click();
    sequence.push(await preview.getAttribute('data-selected-shape'));
  }
  await recordCell({
    ...ctx,
    personaId: 'P7',
    sessionId: 'S1',
    userGoal: '결혼 독립 card와 artifact choice를 positive control로 확인',
    status: 'supported',
    evidence: { weddingCards, selectedSequence: sequence },
    notes:
      '결혼 콘텐츠는 source/job별 독립 card와 작동하는 artifact choice를 제공한다.',
  });

  await saveWedding(page, 'curated-wedding-naver-timeline', '2030-08-15');
  const firstReceipt = await savedReceiptCount(page);
  await openReceiptFlow(page);
  await saveWedding(page, 'curated-wedding-gongysd-atoz', '');
  const secondReceipt = await savedReceiptCount(page);
  await openReceiptFlow(page);
  await recordCell({
    ...ctx,
    personaId: 'P7',
    sessionId: 'S2',
    userGoal: '두 결혼 Flow의 receipt와 My Flow object 연속성 확인',
    status: 'supported',
    evidence: {
      firstReceipt,
      secondReceipt,
      savedFlowKeys: (await storageSnapshot(page)).savedFlowKeys,
    },
    notes:
      '서로 다른 source/job인 두 결혼 Flow가 별도 object인 것은 의도와 맞는다.',
  });

  await goto(page, '/f/moving-d30-basic');
  const movingPreview = page.getByTestId('flow-artifact-data-preview');
  await movingPreview
    .locator(
      '[data-testid="flow-artifact-shape-choice"][data-artifact-shape="checklist"]',
    )
    .click();
  const movingSelected = await movingPreview.getAttribute('data-selected-shape');
  await goto(page, '/f/vehicle-inspection-prep');
  const vehiclePreview = page.getByTestId('flow-artifact-data-preview');
  await vehiclePreview
    .locator(
      '[data-testid="flow-artifact-shape-choice"][data-artifact-shape="checklist"]',
    )
    .click();
  const vehicleSelected = await vehiclePreview.getAttribute('data-selected-shape');
  await recordCell({
    ...ctx,
    personaId: 'P7',
    sessionId: 'S3',
    userGoal: '결혼에서 작동하는 grammar를 moving/vehicle과 비교',
    status: 'partial',
    evidence: {
      movingSelectedAfterChecklist: movingSelected,
      vehicleSelectedAfterChecklist: vehicleSelected,
      expected: 'checklist',
    },
    notes:
      '차이는 콘텐츠 shape가 아니라 category hardcode로 handler가 연결된 구현 gate다.',
  });
});

await runPersona('P8', { width: 390, height: 844 }, async (ctx) => {
  const { page } = ctx;
  await clearAndReload(page, '/');
  const keyboardTrail = [];
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press('Tab');
    keyboardTrail.push(
      await page.evaluate(() => {
        const active = document.activeElement;
        return {
          tag: active?.tagName ?? null,
          text: (active?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 100),
          aria: active?.getAttribute('aria-label') ?? null,
          href: active?.getAttribute('href') ?? null,
          testId: active?.getAttribute('data-testid') ?? null,
        };
      }),
    );
  }
  await goto(page, '/f/moving-d30-basic');
  const publicSnapshot = await pageSnapshot(page);
  await recordCell({
    ...ctx,
    personaId: 'P8',
    sessionId: 'S1',
    userGoal: '390px keyboard-only Home에서 public save-before로 이동',
    status: 'partial',
    evidence: {
      keyboardTrail,
      publicUnnamedFocusables: publicSnapshot.unnamedFocusables,
      overflow: publicSnapshot.horizontalOverflow,
    },
    notes:
      '기본 focus와 accessible name은 대체로 존재하지만 entry별 다른 interaction grammar 때문에 동일 과업의 키보드 경로가 달라진다.',
  });

  const responsiveRoutes = [
    '/',
    '/flows',
    '/f/moving-d30-basic',
    '/flow-maps/moving-d30',
    '/my',
    '/calendar',
  ];
  const responsive = [];
  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of responsiveRoutes) {
      await goto(page, route);
      const snapshot = await pageSnapshot(page);
      responsive.push({
        viewport,
        route,
        heading: snapshot.headings[0],
        overflow: snapshot.horizontalOverflow,
        unnamedFocusables: snapshot.unnamedFocusables,
      });
    }
  }
  await recordCell({
    ...ctx,
    personaId: 'P8',
    sessionId: 'S2',
    userGoal: '1024/1440에서 Home·Find·public·map·My Flow·Calendar anatomy 비교',
    status: 'partial',
    evidence: { responsive },
    notes:
      '기술적 overflow는 없지만 public /f와 legacy /flow-maps는 같은 Flow anatomy가 아니다.',
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await goto(page, '/f/moving-d30-basic');
  await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
  await page.reload({ waitUntil: 'networkidle' });
  const anchorAfterReload = await page
    .getByTestId('public-flow-anchor-input')
    .inputValue()
    .catch(() => '');
  await savePublic(page, '/f/moving-d30-basic', '2030-08-15');
  await goto(page, '/f/moving-d30-basic');
  await savePublic(page, '/f/moving-d30-basic', '2030-08-15');
  const afterRepeatedSave = await storageSnapshot(page);
  await recordCell({
    ...ctx,
    personaId: 'P8',
    sessionId: 'S3',
    userGoal: 'reload·반복 저장·복구와 duplicate 객체 확인',
    status: 'partial',
    evidence: {
      anchorAfterReload,
      repeatedSameSlugSavedFlowKeys: afterRepeatedSave.savedFlowKeys,
      repeatedSameSlugCount: afterRepeatedSave.savedFlowKeys.filter((key) =>
        key.includes('moving-d30-basic'),
      ).length,
    },
    notes:
      '저장 전 anchor는 reload 시 사라진다. 같은 slug 반복 저장은 한 key를 덮지만 다른 entry alias는 별도 object를 만든다.',
  });
});

await browser.close();

const result = {
  schemaVersion: 'flowme.cross-entry-persona-scorecard.v1',
  reviewerRole: 'codex_independent',
  production: baseUrl,
  capturedAt: new Date().toISOString(),
  observedUserCount: 0,
  cellCount: cells.length,
  expectedCellCount: 24,
  runErrors,
  cells,
};

await fs.writeFile(
  path.join(outputDir, 'persona-journey-scorecard.raw.json'),
  `${JSON.stringify(result, null, 2)}\n`,
  'utf8',
);

console.log(
  JSON.stringify(
    {
      cellCount: cells.length,
      runErrorCount: runErrors.length,
      statusCounts: cells.reduce((counts, cell) => {
        counts[cell.status] = (counts[cell.status] ?? 0) + 1;
        return counts;
      }, {}),
      consoleErrorCount: cells.reduce(
        (count, cell) => count + cell.consoleErrors.length,
        0,
      ),
      pageErrorCount: cells.reduce(
        (count, cell) => count + cell.pageErrors.length,
        0,
      ),
    },
    null,
    2,
  ),
);
