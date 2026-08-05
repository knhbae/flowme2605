import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';
import { register } from 'tsx/esm/api';

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, '..', '..', '..');

// Re-exec through tsx so this evidence-only collector can use the production
// TypeScript codecs instead of reproducing their behavior in the script.
if (!process.env.FLOWME_P35_R2_S17_S23_TSX) {
  const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const child = spawnSync(process.execPath, [tsxCli, scriptPath], {
    cwd: repoRoot,
    env: { ...process.env, FLOWME_P35_R2_S17_S23_TSX: '1' },
    stdio: 'inherit',
    windowsHide: true,
  });
  if (child.error) throw child.error;
  process.exit(child.status ?? 1);
}

const tsxRuntime = register({ namespace: 'p35-round2-s17-s23-evidence' });

async function importProductionModule(relativePath) {
  const imported = await tsxRuntime.import(
    pathToFileURL(path.join(repoRoot, relativePath)).href,
    import.meta.url,
  );
  return imported.default ?? imported;
}

const artifactCodec = await importProductionModule(
  path.join('lib', 'flow', 'effective-flow-artifact-codec.ts'),
);
const listExport = await importProductionModule(
  path.join('lib', 'flow', 'personal-structural-list-export.ts'),
);
const stepExport = await importProductionModule(
  path.join('lib', 'flow', 'my-flow-step-export.ts'),
);
const round2Flags = await importProductionModule(
  path.join('lib', 'flow', 'p35-round2-flags.ts'),
);
const myFlowLibrary = await importProductionModule(
  path.join('tests', 'e2e', 'helpers', 'my-flow-library.ts'),
);
await tsxRuntime.unregister();

const {
  parseEffectiveFlowTsv,
} = artifactCodec;
const {
  buildPersonalStructuralListExportArtifactsFromRows,
  PERSONAL_STRUCTURAL_SHEET_HEADERS,
} = listExport;
const {
  buildMyFlowMultiStepIcs,
  buildMyFlowStepIcs,
} = stepExport;
const { openMyFlowLibraryFlow } = myFlowLibrary;

const baseURL = process.env.FLOWME_EVIDENCE_BASE_URL ?? 'http://127.0.0.1:3114';
const outputRoot = path.resolve(
  repoRoot,
  process.env.FLOWME_P35_R2_REVIEW_EVIDENCE_DIR
    ?? path.join('output', 'playwright', 'p35-round2-review-rehearsal'),
);
const manifestPath = path.join(outputRoot, 'group-manifest-s17-s23.json');
const scenarioIds = ['S17', 'S18', 'S19', 'S20', 'S21', 'S22', 'S23'];
const generatedAt = new Date().toISOString();
const mobileViewport = { width: 390, height: 844 };
const tabletViewport = { width: 1024, height: 768 };
const fixedGeneratedAt = '2026-08-05T03:00:00.000Z';
const routineSlug = 'washer-tub-clean-monthly';

const head = gitOutput(['rev-parse', 'HEAD']) || 'NOT_AVAILABLE';
const shortHead = gitOutput(['rev-parse', '--short=12', 'HEAD']) || 'NOT_AVAILABLE';
const branch = gitOutput(['branch', '--show-current']) || 'DETACHED_OR_UNKNOWN';
const porcelain = gitOutput(['status', '--porcelain=v1', '--untracked-files=all'], false);
const dirty = porcelain.trim().length > 0;
const gitStatus = gitOutput(['status', '--short', '--branch'], false);
const buildId = readUtf8(path.join(repoRoot, '.next', 'BUILD_ID'))?.trim()
  || 'NOT_AVAILABLE';
const evidenceClass = dirty ? 'LOCAL_REHEARSAL_NOT_FINAL' : 'CANDIDATE_BOUND_LOCAL_CAPTURE';
const sourceSnapshot = {
  head,
  shortHead,
  branch,
  buildId,
  dirty,
  evidenceClass,
  gitStatusSha256: sha256(Buffer.from(gitStatus, 'utf8')),
};

const scenarioRecords = new Map();
const collectorErrors = [];

await main();

async function main() {
  prepareOwnedOutput();

  const serverProbe = await probeServer();
  let browser;
  if (serverProbe.reachable) {
    try {
      browser = await chromium.launch(getLaunchOptions());
    } catch (error) {
      collectorErrors.push({ stage: 'browser-launch', error: errorText(error) });
    }
  } else {
    collectorErrors.push({
      stage: 'server-probe',
      error: `Current app was not reachable at ${baseURL}.`,
      detail: serverProbe,
    });
  }

  let s18Artifacts;
  let s19Artifacts;
  let s20Artifacts;
  let transportEvidence;

  try {
    await captureS17(browser, serverProbe);
    s18Artifacts = await captureS18();
    s19Artifacts = await captureS19(browser, serverProbe);
    s20Artifacts = buildS20DeterministicArtifacts();
    transportEvidence = await captureCurrentTransport(browser, serverProbe);
    await captureS20(s20Artifacts, transportEvidence);
    await captureS21(transportEvidence, s18Artifacts, s20Artifacts);
    await captureS22(serverProbe);
    await captureS23();
  } finally {
    await browser?.close().catch(() => undefined);
  }

  writeRootManifest(serverProbe);
  console.log(JSON.stringify({
    manifest: relativeToRepo(manifestPath),
    evidenceClass,
    scenarios: [...scenarioRecords.keys()],
    collectorErrors: collectorErrors.length,
  }, null, 2));
  if (collectorErrors.length > 0) process.exitCode = 1;
}

function prepareOwnedOutput() {
  fs.mkdirSync(outputRoot, { recursive: true });
  for (const scenarioId of scenarioIds) {
    const target = path.join(outputRoot, scenarioId);
    assertWithinOutputRoot(target);
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(target, { recursive: true });
  }
  assertWithinOutputRoot(manifestPath);
  fs.rmSync(manifestPath, { force: true });
}

function assertWithinOutputRoot(target) {
  const relative = path.relative(outputRoot, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing an output mutation outside the owned scenario paths: ${target}`);
  }
}

async function captureS17(browser, serverProbe) {
  const scenarioId = 'S17';
  const cases = [
    {
      id: 'public-default',
      surface: 'public',
      route: `/f/moving-d30-basic`,
      queryMode: 'default-on',
    },
    {
      id: 'public-exact-off',
      surface: 'public',
      route: `/f/moving-d30-basic?saveLifecycle=off&editorTransaction=off&capabilityResult=off&quickLocalResult=off&visualSubtraction=off&q3Copy=off`,
      queryMode: 'exact-lowercase-off',
    },
    {
      id: 'public-uppercase-off',
      surface: 'public',
      route: `/f/moving-d30-basic?saveLifecycle=OFF&editorTransaction=OFF&capabilityResult=OFF&quickLocalResult=OFF&visualSubtraction=OFF&q3Copy=OFF`,
      queryMode: 'uppercase-control',
    },
    {
      id: 'my-default',
      surface: 'my',
      route: `/my?flow=moving-d30-basic`,
      queryMode: 'default-on',
    },
    {
      id: 'my-exact-off',
      surface: 'my',
      route: `/my?flow=moving-d30-basic&savedTransfer=off&savedPlanLibrary=off&visualSubtraction=off&q3Copy=off`,
      queryMode: 'exact-lowercase-off',
    },
    {
      id: 'my-uppercase-off',
      surface: 'my',
      route: `/my?flow=moving-d30-basic&savedTransfer=OFF&savedPlanLibrary=OFF&visualSubtraction=OFF&q3Copy=OFF`,
      queryMode: 'uppercase-control',
    },
  ];

  const runtimeCases = [];
  if (browser && serverProbe.reachable) {
    for (const testCase of cases) {
      const seed = {
        local: {
          'flow:evidence:s17:sentinel': 'preserve-local',
          ...(testCase.surface === 'my'
            ? {
                'flow:saved:moving-d30-basic': JSON.stringify({
                  slug: 'moving-d30-basic',
                  savedAt: fixedGeneratedAt,
                  selectedArtifactMode: 'calendar',
                  anchor: '2031-09-01',
                  dateIntent: 'custom',
                }),
                'flow:moving-d30-basic:anchorDate': JSON.stringify({
                  mode: 'custom',
                  anchor: '2031-09-01',
                }),
              }
            : {}),
        },
        session: { 'flow:evidence:s17:session-sentinel': 'preserve-session' },
      };
      const context = await browser.newContext({
        baseURL,
        viewport: mobileViewport,
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul',
      });
      await context.addInitScript(installStorageWriteJournal, seed);
      const page = await context.newPage();
      const browserErrors = collectBrowserErrors(page);
      const startedAt = new Date().toISOString();
      try {
        const response = await page.goto(testCase.route, { waitUntil: 'domcontentloaded' });
        await settle(page);
        const rawState = await page.evaluate(() => {
          const main = document.querySelector('main');
          const attributes = main
            ? Object.fromEntries(
                [...main.attributes]
                  .filter((attribute) => (
                    attribute.name.startsWith('data-p35-')
                    || attribute.name === 'data-saved-library-flag'
                  ))
                  .map((attribute) => [attribute.name, attribute.value]),
              )
            : {};
          const readStorage = (storage) => Object.fromEntries(
            Array.from({ length: storage.length }, (_, index) => storage.key(index))
              .filter(Boolean)
              .sort()
              .map((key) => [key, storage.getItem(key)]),
          );
          return {
            href: window.location.href,
            pathname: window.location.pathname,
            search: window.location.search,
            title: document.title,
            mainAttributes: attributes,
            mainTextExcerpt: (main?.innerText ?? '').replace(/\s+/gu, ' ').trim().slice(0, 1200),
            storageAfter: {
              local: readStorage(window.localStorage),
              session: readStorage(window.sessionStorage),
            },
            storageWrites: window.__flowmeEvidenceStorageWrites ?? [],
          };
        });
        const state = {
          ...rawState,
          storageAfter: summarizeStorageSnapshot(rawState.storageAfter),
          storageWrites: rawState.storageWrites.map(summarizeStorageWrite),
        };
        const seedPreserved = Object.entries(seed.local).every(
          ([key, value]) => rawState.storageAfter.local[key] === value,
        ) && Object.entries(seed.session).every(
          ([key, value]) => rawState.storageAfter.session[key] === value,
        );
        const unexpectedLocalKeys = Object.keys(rawState.storageAfter.local)
          .filter((key) => !Object.hasOwn(seed.local, key));
        const unexpectedSessionKeys = Object.keys(rawState.storageAfter.session)
          .filter((key) => !Object.hasOwn(seed.session, key));
        const noPersistentWritesObserved = state.storageWrites.length === 0;
        const screenshotName = `${testCase.id}.png`;
        await page.screenshot({
          path: scenarioPath(scenarioId, screenshotName),
          fullPage: true,
        });
        runtimeCases.push({
          ...testCase,
          startedAt,
          finishedAt: new Date().toISOString(),
          httpStatus: response?.status() ?? null,
          expectedFlagEvaluation: expectedS17Flags(testCase.route),
          expectedSeed: seed,
          ...state,
          persistentWriteCount: state.storageWrites.length,
          noPersistentWritesObserved,
          seedPreserved,
          unexpectedLocalKeys,
          unexpectedSessionKeys,
          initialRenderStorageContract: (
            noPersistentWritesObserved
            && seedPreserved
            && unexpectedLocalKeys.length === 0
            && unexpectedSessionKeys.length === 0
          ) ? 'PASS' : 'FAIL',
          screenshot: screenshotName,
          browserErrors,
          captureStatus: 'CAPTURED_CURRENT_RUNTIME',
        });
      } catch (error) {
        runtimeCases.push({
          ...testCase,
          startedAt,
          finishedAt: new Date().toISOString(),
          captureStatus: 'NOT_OBTAINED',
          error: errorText(error),
          browserErrors,
        });
      } finally {
        await context.close();
      }
    }
  } else {
    runtimeCases.push(...cases.map((testCase) => ({
      ...testCase,
      captureStatus: 'NOT_OBTAINED',
      reason: 'Current runtime or browser was unavailable.',
      expectedFlagEvaluation: expectedS17Flags(testCase.route),
    })));
  }

  const captured = runtimeCases.filter((entry) => entry.captureStatus === 'CAPTURED_CURRENT_RUNTIME');
  const storageContractFailures = captured
    .filter((entry) => entry.initialRenderStorageContract !== 'PASS')
    .map((entry) => ({
      caseId: entry.id,
      persistentWriteCount: entry.persistentWriteCount,
      seedPreserved: entry.seedPreserved,
      unexpectedLocalKeys: entry.unexpectedLocalKeys,
      unexpectedSessionKeys: entry.unexpectedSessionKeys,
    }));
  if (storageContractFailures.length > 0) {
    collectorErrors.push({
      stage: 'S17-initial-render-storage-contract',
      error: 'Initial render must preserve seeded bytes and perform zero storage mutations.',
      failures: storageContractFailures,
    });
  }
  const record = scenarioRecord(scenarioId, {
    title: 'Current runtime rollback flags, route state, and persistent-write trace',
    owner: 'CODEX_ONLY',
    claudeDesignStatus: 'NOT_RUN_CODEX_ONLY',
    reviewerStatus: captured.length === cases.length
      ? 'CODEX_EXECUTED_LOCAL_REHEARSAL'
      : 'PARTIAL_CURRENT_RUNTIME_CAPTURE',
    scope: {
      assessed: [
        'exact lowercase off semantics',
        'uppercase OFF control semantics',
        'route and rendered main data attributes',
        'localStorage/sessionStorage mutation journal during initial render',
      ],
      notAssessed: [
        'migration safety against real historical production accounts',
        'Claude Design execution',
      ],
    },
    capturedCaseCount: captured.length,
    expectedCaseCount: cases.length,
    noWriteCaseCount: captured.filter((entry) => entry.noPersistentWritesObserved).length,
    storageContractFailureCount: storageContractFailures.length,
    storageContractFailures,
    cases: runtimeCases,
  });
  writeJson(scenarioId, 'runtime-route-storage-trace.json', record);
  scenarioRecords.set(scenarioId, record);
}

function expectedS17Flags(route) {
  const search = new URL(route, baseURL).search;
  return {
    saveLifecycle: round2Flags.isP35PublicSaveLifecycleEnabled(search),
    editorTransaction: round2Flags.isP35EditorTransactionEnabled(search),
    capabilityResult: round2Flags.isP35CapabilityResultEnabled(search),
    quickLocalResult: round2Flags.isP35QuickLocalResultEnabled(search),
    savedTransfer: round2Flags.isP35SavedTransferEnabled(search),
    savedPlanLibrary: round2Flags.isP35SavedPlanLibraryEnabled(search),
    visualSubtraction: round2Flags.isP35VisualSubtractionEnabled(search),
    q3Copy: round2Flags.isP35Q3CopyEnabled(search),
  };
}

function installStorageWriteJournal(seed) {
  const native = {
    setItem: Storage.prototype.setItem,
    removeItem: Storage.prototype.removeItem,
    clear: Storage.prototype.clear,
  };
  for (const [key, value] of Object.entries(seed.local ?? {})) {
    native.setItem.call(window.localStorage, key, value);
  }
  for (const [key, value] of Object.entries(seed.session ?? {})) {
    native.setItem.call(window.sessionStorage, key, value);
  }
  window.__flowmeEvidenceStorageWrites = [];
  const areaName = (storage) => {
    try {
      if (storage === window.localStorage) return 'localStorage';
      if (storage === window.sessionStorage) return 'sessionStorage';
    } catch {
      return 'unknown';
    }
    return 'unknown';
  };
  Storage.prototype.setItem = function setItem(key, value) {
    window.__flowmeEvidenceStorageWrites.push({
      operation: 'setItem',
      area: areaName(this),
      key: String(key),
      value: String(value),
      observedAt: new Date().toISOString(),
    });
    return native.setItem.call(this, key, value);
  };
  Storage.prototype.removeItem = function removeItem(key) {
    window.__flowmeEvidenceStorageWrites.push({
      operation: 'removeItem',
      area: areaName(this),
      key: String(key),
      observedAt: new Date().toISOString(),
    });
    return native.removeItem.call(this, key);
  };
  Storage.prototype.clear = function clear() {
    window.__flowmeEvidenceStorageWrites.push({
      operation: 'clear',
      area: areaName(this),
      observedAt: new Date().toISOString(),
    });
    return native.clear.call(this);
  };
}

async function captureS18() {
  const scenarioId = 'S18';
  const edgeRow = {
    itemId: 's18-edge-item',
    title: '긴 제목\t탭과 "인용부호", 역슬래시 \\ 및 이모지 🧭✨',
    date: '2031-09-01',
    scheduleState: 'timed',
    time: '09:15',
    durationMinutes: 75,
    timeZone: 'Asia/Seoul',
    repeatLabel: '매주 월요일',
    description: '첫 줄\r\n둘째 줄에는\t탭과 "따옴표"가 있습니다.\n셋째 줄은 이모지 🚚',
    memo: '메모 "A"\r\n메모 B\t끝',
    executionMemo: '실행 기록: 경로 C:\\temp\\flow',
    completionCriteria: '체크 결과를 저장하고 담당자에게 공유',
    itemWarning: '주의: 줄바꿈\r\n유지',
    flowWarning: '전체 주의 "원문 확인"',
    resources: [
      { label: '공식 "자료" 🧪', url: 'https://example.com/a?x=1&y=탭' },
      { label: '두 번째\t자료', url: 'https://example.com/b' },
    ],
    status: 'pending',
    personalOrderRank: 1,
    sourceRef: '원문 "S18" https://example.com/source',
  };
  const artifacts = buildPersonalStructuralListExportArtifactsFromRows({
    flowTitle: 'S18 TSV 경계값 검증 🧪',
    rows: [edgeRow],
    sourceLabel: '검토 원문 "탭/줄바꿈"',
    sourceUrl: 'https://example.com/source?case=s18',
  });
  const rawTsv = normalizeCrLf(artifacts.sheetTsv);
  const rawBuffer = Buffer.from(rawTsv, 'utf8');
  const parsed = parseEffectiveFlowTsv(rawTsv);
  const header = parsed[0] ?? [];
  const dataRows = parsed.slice(1);
  const expectedColumnCount = PERSONAL_STRUCTURAL_SHEET_HEADERS.length;
  const parserChecks = {
    parsedRowCount: parsed.length,
    parsedDataRowCount: dataRows.length,
    headerColumnCount: header.length,
    expectedColumnCount,
    everyRowHasExpectedColumns: parsed.every((row) => row.length === expectedColumnCount),
    headerMatchesProductionHeaders:
      JSON.stringify(header) === JSON.stringify([...PERSONAL_STRUCTURAL_SHEET_HEADERS]),
    titleRoundTripExact: dataRows[0]?.[2] === edgeRow.title,
    descriptionRoundTripWithCrLf:
      dataRows[0]?.[10] === normalizeCrLf(edgeRow.description),
    memoRoundTripWithCrLf: dataRows[0]?.[8] === normalizeCrLf(edgeRow.memo),
    containsLiteralTabInsideParsedTitle: dataRows[0]?.[2]?.includes('\t') === true,
    containsLiteralQuoteInsideParsedTitle: dataRows[0]?.[2]?.includes('"') === true,
    containsEmojiAfterParse: dataRows[0]?.some((cell) => cell.includes('🧭')) === true,
  };
  const edgeSignals = {
    utf8ByteLength: rawBuffer.byteLength,
    unicodeCodePointLength: [...rawTsv].length,
    hasUtf8Bom: rawBuffer.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])),
    crlfCount: (rawTsv.match(/\r\n/gu) ?? []).length,
    bareLfCount: (rawTsv.match(/(?<!\r)\n/gu) ?? []).length,
    bareCrCount: (rawTsv.match(/\r(?!\n)/gu) ?? []).length,
    tabByteCount: rawBuffer.filter((byte) => byte === 0x09).length,
    quoteByteCount: rawBuffer.filter((byte) => byte === 0x22).length,
    containsDoubledQuoteEscape: rawTsv.includes('""'),
    containsBackslash: rawTsv.includes('\\'),
    containsEmoji: rawTsv.includes('🧭') && rawTsv.includes('✨'),
    endsWithCrLf: rawTsv.endsWith('\r\n'),
  };

  writeBuffer(scenarioId, 'edge-cases-crlf-utf8.tsv', rawBuffer);
  writeText(scenarioId, 'edge-cases-raw-hex.txt', `${rawBuffer.toString('hex')}\n`);
  const record = scenarioRecord(scenarioId, {
    title: 'Deterministic TSV raw-byte and parser edge rehearsal',
    reviewerStatus: 'CODEX_EXECUTED_LOCAL_REHEARSAL',
    generator: 'buildPersonalStructuralListExportArtifactsFromRows',
    parser: 'parseEffectiveFlowTsv',
    artifact: {
      filename: 'edge-cases-crlf-utf8.tsv',
      mediaType: 'text/tab-separated-values;charset=utf-8',
      charset: 'utf-8',
      newlinePolicy: 'CRLF for row separators and embedded line breaks',
      bytes: rawBuffer.byteLength,
      sha256: sha256(rawBuffer),
    },
    edgeSignals,
    parserChecks,
    parserStatus: Object.values(parserChecks).every(Boolean) ? 'ROUND_TRIP_CONFIRMED' : 'ROUND_TRIP_MISMATCH',
    parsedRows: parsed,
    expectedInput: edgeRow,
  });
  writeJson(scenarioId, 'parser-result.json', record);
  scenarioRecords.set(scenarioId, record);
  return { rawTsv, rawBuffer, record };
}

async function captureS19(browser, serverProbe) {
  const scenarioId = 'S19';
  const inputs = [
    {
      flowTitle: 'S19 DST wall-clock fixture',
      stepId: 'before-spring-forward',
      stepTitle: 'DST 전날 같은 현지 시각',
      date: '2026-03-07',
      time: '09:15',
      durationMinutes: 30,
      timeZone: 'America/New_York',
      stableEventIdentitySeed: 's19-before-spring-forward',
      generatedAt: fixedGeneratedAt,
      executionStatus: 'pending',
    },
    {
      flowTitle: 'S19 DST wall-clock fixture',
      stepId: 'after-spring-forward',
      stepTitle: 'DST 다음날 같은 현지 시각',
      date: '2026-03-09',
      time: '09:15',
      durationMinutes: 30,
      timeZone: 'America/New_York',
      stableEventIdentitySeed: 's19-after-spring-forward',
      generatedAt: fixedGeneratedAt,
      executionStatus: 'pending',
    },
  ];
  const ics = buildMyFlowMultiStepIcs(inputs);
  const icsBuffer = Buffer.from(ics, 'utf8');
  const parsed = parseIcs(ics);
  const fixture = {
    now: '2026-08-05T12:00:00+09:00',
    rows: [
      { itemId: 'dated-future', date: '2026-08-06', scheduleState: 'all_day', expectedBucket: 'dated' },
      { itemId: 'undated', date: null, scheduleState: 'unscheduled', expectedBucket: 'undated', calendarProjection: 'OMITTED' },
      { itemId: 'overdue', date: '2026-08-03', scheduleState: 'all_day', completionState: 'pending', expectedBucket: 'overdue' },
      { itemId: 'mixed-timed', date: '2026-08-05', time: '17:30', timeZone: 'Asia/Seoul', scheduleState: 'timed', expectedBucket: 'dated' },
    ],
    rule: 'An undated Item remains undated and is not invented into VEVENT.',
  };
  let currentUi = {
    status: 'NOT_OBTAINED',
    reason: browser && serverProbe.reachable ? 'Capture did not run.' : 'Current runtime or browser unavailable.',
  };
  if (browser && serverProbe.reachable) {
    const context = await browser.newContext({
      baseURL,
      viewport: mobileViewport,
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
    });
    const page = await context.newPage();
    const browserErrors = collectBrowserErrors(page);
    try {
      const response = await page.goto('/my?demo=ux20', { waitUntil: 'domcontentloaded' });
      await settle(page);
      const screenshotName = 'current-my-overdue-mixed-state.png';
      await page.screenshot({ path: scenarioPath(scenarioId, screenshotName), fullPage: true });
      currentUi = {
        status: 'CAPTURED_CURRENT_RUNTIME',
        route: page.url(),
        httpStatus: response?.status() ?? null,
        screenshot: screenshotName,
        viewport: mobileViewport,
        timezoneId: 'Asia/Seoul',
        textExcerpt: await page.locator('main').innerText().catch(() => '').then((value) => value.replace(/\s+/gu, ' ').slice(0, 1600)),
        browserErrors,
        limitation: 'This current UI capture is not a browser DST-offset test.',
      };
    } catch (error) {
      currentUi = { status: 'NOT_OBTAINED', error: errorText(error), browserErrors };
    } finally {
      await context.close();
    }
  }
  writeText(scenarioId, 'new-york-dst-wall-clock.ics', ics);
  writeJson(scenarioId, 'dated-undated-overdue-fixture.json', fixture);
  const localStarts = parsed.events.map((event) => event.DTSTART ?? null);
  const record = scenarioRecord(scenarioId, {
    title: 'Timezone, DST wall-clock, undated, and overdue boundary rehearsal',
    reviewerStatus: 'CODEX_EXECUTED_LOCAL_REHEARSAL_WITH_EXPLICIT_GAPS',
    deterministicIcs: {
      filename: 'new-york-dst-wall-clock.ics',
      mediaType: 'text/calendar;charset=utf-8',
      bytes: icsBuffer.byteLength,
      sha256: sha256(icsBuffer),
      veventCount: parsed.events.length,
      localStarts,
      bothUseNewYorkTzid: localStarts.every((value) => value?.startsWith('DTSTART;TZID=America/New_York:')),
      bothPreserve0915WallClock: localStarts.every((value) => value?.endsWith('T091500')),
      parser: parsed,
    },
    fixture,
    currentUi,
    assessmentBoundary: {
      deterministicIcsGeneration: 'ASSESSED',
      currentAsiaSeoulUiState: currentUi.status,
      actualBrowserDstTransitionBehavior: 'NOT_ASSESSED',
      actualDownloadedFileUtcOffsetSemantics: 'NOT_ASSESSED',
      reason: 'The collector does not change the host/browser clock across a DST transition and therefore makes no browser-DST claim.',
    },
  });
  writeJson(scenarioId, 'timezone-dst-parser-result.json', record);
  scenarioRecords.set(scenarioId, record);
  return { ics, icsBuffer, record };
}

function buildS20DeterministicArtifacts() {
  const input = {
    flowTitle: '세탁조 월간 관리',
    stepId: 'washer-tub-monthly-item',
    stepTitle: '세탁조 클리너로 통세척 실행',
    date: '2031-09-01',
    time: '10:00',
    durationMinutes: 90,
    timeZone: 'Asia/Seoul',
    stableEventIdentitySeed: 'washer-tub-monthly-series',
    repeatPreset: 'monthly',
    generatedAt: fixedGeneratedAt,
    executionStatus: 'pending',
    sourceLabel: 'S20 deterministic routine fixture',
    sourceUrl: 'https://example.com/routine-source',
  };
  const ics = buildMyFlowStepIcs(input);
  const buffer = Buffer.from(ics, 'utf8');
  const parsed = parseIcs(ics);
  return {
    input,
    ics,
    buffer,
    parsed,
    unitCounts: {
      itemCount: 1,
      recurrenceSeriesCount: parsed.events.filter((event) => Boolean(event.RRULE)).length,
      veventCount: parsed.events.length,
      projectionOutputCount: 1,
      artifactOutputCount: parsed.events.length,
    },
  };
}

async function captureS20(artifacts, transportEvidence) {
  const scenarioId = 'S20';
  writeBuffer(scenarioId, 'routine-monthly-unit-separated.ics', artifacts.buffer);
  const actualDownload = transportEvidence.download.status === 'CAPTURED_CURRENT_RUNTIME'
    ? {
        status: transportEvidence.download.status,
        filename: transportEvidence.download.suggestedFilename,
        itemCount: transportEvidence.download.attributes['data-transfer-item-count'] ?? null,
        seriesCount: transportEvidence.download.attributes['data-projection-output-count'] ?? null,
        veventCount: transportEvidence.download.veventCount,
        rawSha256: transportEvidence.download.sha256,
      }
    : {
        status: 'NOT_OBTAINED',
        reason: transportEvidence.download.error ?? transportEvidence.download.reason,
      };
  const record = scenarioRecord(scenarioId, {
    title: 'Routine projection with Item, recurrence-series, and VEVENT units kept separate',
    reviewerStatus: 'CODEX_EXECUTED_LOCAL_REHEARSAL',
    deterministicArtifact: {
      filename: 'routine-monthly-unit-separated.ics',
      mediaType: 'text/calendar;charset=utf-8',
      bytes: artifacts.buffer.byteLength,
      sha256: sha256(artifacts.buffer),
      unitCounts: artifacts.unitCounts,
      hasMonthlyRrule: artifacts.ics.includes('RRULE:FREQ=MONTHLY'),
      parser: artifacts.parsed,
    },
    currentUiDownloadCrossCheck: actualDownload,
    unitSemantics: {
      item: 'One effective user action.',
      recurrenceSeries: 'One recurrence rule governing occurrences.',
      vevent: 'One serialized calendar VEVENT component in this artifact.',
      warning: 'These units are intentionally not interchangeable.',
    },
  });
  writeJson(scenarioId, 'routine-unit-counts.json', record);
  scenarioRecords.set(scenarioId, record);
}

async function captureCurrentTransport(browser, serverProbe) {
  const unavailable = (reason) => ({ status: 'NOT_OBTAINED', reason });
  const result = {
    download: unavailable('Current runtime or browser unavailable.'),
    clipboard: unavailable('Current runtime or browser unavailable.'),
  };
  if (!browser || !serverProbe.reachable) return result;

  result.download = await captureBrowserDownload(browser);
  result.clipboard = await captureBrowserClipboard(browser);
  return result;
}

async function captureBrowserDownload(browser) {
  const context = await browser.newContext({
    baseURL,
    viewport: tabletViewport,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const browserErrors = collectBrowserErrors(page);
  try {
    await seedSavedFlow(page, routineSlug, '2031-09-01');
    const panel = await openSavedTransferPanel(page, routineSlug);
    const confirmation = await openTransferConfirmation(panel, 'calendar');
    const attributes = await dataAttributes(confirmation);
    await page.screenshot({
      path: scenarioPath('S21', 'calendar-download-confirmation.png'),
      fullPage: true,
    });
    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await confirmation.getByTestId('my-flow-transfer-confirm').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    if (!downloadPath) throw new Error('Browser download completed without a readable local path.');
    const buffer = fs.readFileSync(downloadPath);
    const text = buffer.toString('utf8');
    const receipt = panel.getByTestId('my-flow-transfer-receipt');
    await receipt.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
    const receiptAttributes = await dataAttributes(receipt);
    const storage = await storageSnapshot(page);
    return {
      status: 'CAPTURED_CURRENT_RUNTIME',
      route: page.url(),
      transport: 'browser_download',
      suggestedFilename: download.suggestedFilename(),
      mediaType: attributes['data-transfer-media-type']
        ?? attributes['data-media-type']
        ?? 'text/calendar;charset=utf-8',
      bytes: buffer.byteLength,
      sha256: sha256(buffer),
      veventCount: (text.match(/BEGIN:VEVENT/gu) ?? []).length,
      hasMonthlyRrule: text.includes('RRULE:FREQ=MONTHLY'),
      rawBufferBase64: buffer.toString('base64'),
      attributes,
      receiptAttributes,
      receiptRegistry: parseReceiptRegistry(storage.local['flow:export-receipts:v1']),
      browserErrors,
    };
  } catch (error) {
    return { status: 'NOT_OBTAINED', error: errorText(error), browserErrors };
  } finally {
    await context.close();
  }
}

async function captureBrowserClipboard(browser) {
  const context = await browser.newContext({
    baseURL,
    viewport: tabletViewport,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });
  const page = await context.newPage();
  const browserErrors = collectBrowserErrors(page);
  try {
    await seedSavedFlow(page, routineSlug, '2031-09-01');
    const panel = await openSavedTransferPanel(page, routineSlug);
    await installClipboardCapture(page);
    const confirmation = await openTransferConfirmation(panel, 'sheet');
    const attributes = await dataAttributes(confirmation);
    await page.screenshot({
      path: scenarioPath('S21', 'sheet-clipboard-confirmation.png'),
      fullPage: true,
    });
    await confirmation.getByTestId('my-flow-transfer-confirm').click();
    const receipt = panel.getByTestId('my-flow-transfer-receipt');
    await receipt.waitFor({ state: 'visible', timeout: 10_000 });
    const receiptAttributes = await dataAttributes(receipt);
    const clipboard = await page.evaluate(() => ({
      attempts: window.__flowmeEvidenceClipboardAttempts ?? 0,
      successes: window.__flowmeEvidenceClipboardSuccesses ?? 0,
      text: window.__flowmeEvidenceClipboardText ?? '',
    }));
    if (!clipboard.text) throw new Error('Clipboard transfer produced no captured text.');
    const buffer = Buffer.from(clipboard.text, 'utf8');
    const parsedRows = parseEffectiveFlowTsv(clipboard.text);
    const storage = await storageSnapshot(page);
    return {
      status: 'CAPTURED_CURRENT_RUNTIME',
      route: page.url(),
      transport: 'navigator.clipboard.writeText',
      filename: null,
      mediaType: attributes['data-transfer-media-type']
        ?? attributes['data-media-type']
        ?? 'text/tab-separated-values;charset=utf-8',
      bytes: buffer.byteLength,
      sha256: sha256(buffer),
      attempts: clipboard.attempts,
      successes: clipboard.successes,
      parsedRowCount: parsedRows.length,
      parsedColumnCounts: parsedRows.map((row) => row.length),
      rawText: clipboard.text,
      attributes,
      receiptAttributes,
      receiptRegistry: parseReceiptRegistry(storage.local['flow:export-receipts:v1']),
      browserErrors,
    };
  } catch (error) {
    return { status: 'NOT_OBTAINED', error: errorText(error), browserErrors };
  } finally {
    await context.close();
  }
}

async function captureS21(transportEvidence, s18Artifacts, s20Artifacts) {
  const scenarioId = 'S21';
  let downloadedArtifact;
  let clipboardArtifact;
  if (transportEvidence.download.status === 'CAPTURED_CURRENT_RUNTIME') {
    const filename = safeFilename(transportEvidence.download.suggestedFilename || 'calendar-download.ics');
    const buffer = Buffer.from(transportEvidence.download.rawBufferBase64, 'base64');
    writeBuffer(scenarioId, path.join('browser-download', filename), buffer);
    downloadedArtifact = {
      status: 'CAPTURED_CURRENT_RUNTIME',
      filename,
      suggestedFilename: transportEvidence.download.suggestedFilename,
      transport: transportEvidence.download.transport,
      mediaType: transportEvidence.download.mediaType,
      bytes: buffer.byteLength,
      sha256: sha256(buffer),
      veventCount: transportEvidence.download.veventCount,
      hasMonthlyRrule: transportEvidence.download.hasMonthlyRrule,
      confirmationAttributes: transportEvidence.download.attributes,
      receiptAttributes: transportEvidence.download.receiptAttributes,
      receiptRegistry: transportEvidence.download.receiptRegistry,
      browserErrors: transportEvidence.download.browserErrors,
    };
  } else {
    writeBuffer(scenarioId, 'fallback-generated-calendar.ics', s20Artifacts.buffer);
    downloadedArtifact = {
      status: 'NOT_OBTAINED_CURRENT_UI',
      reason: transportEvidence.download.error ?? transportEvidence.download.reason,
      fallback: {
        filename: 'fallback-generated-calendar.ics',
        transport: 'rehearsal_generated_not_downloaded',
        mediaType: 'text/calendar;charset=utf-8',
        bytes: s20Artifacts.buffer.byteLength,
        sha256: sha256(s20Artifacts.buffer),
      },
      browserErrors: transportEvidence.download.browserErrors ?? [],
    };
  }

  if (transportEvidence.clipboard.status === 'CAPTURED_CURRENT_RUNTIME') {
    const buffer = Buffer.from(transportEvidence.clipboard.rawText, 'utf8');
    writeBuffer(scenarioId, path.join('browser-clipboard', 'sheet.tsv'), buffer);
    clipboardArtifact = {
      status: 'CAPTURED_CURRENT_RUNTIME',
      filename: null,
      storedEvidenceFilename: 'browser-clipboard/sheet.tsv',
      transport: transportEvidence.clipboard.transport,
      mediaType: transportEvidence.clipboard.mediaType,
      bytes: buffer.byteLength,
      sha256: sha256(buffer),
      attempts: transportEvidence.clipboard.attempts,
      successes: transportEvidence.clipboard.successes,
      parsedRowCount: transportEvidence.clipboard.parsedRowCount,
      parsedColumnCounts: transportEvidence.clipboard.parsedColumnCounts,
      confirmationAttributes: transportEvidence.clipboard.attributes,
      receiptAttributes: transportEvidence.clipboard.receiptAttributes,
      receiptRegistry: transportEvidence.clipboard.receiptRegistry,
      browserErrors: transportEvidence.clipboard.browserErrors,
    };
  } else {
    writeBuffer(scenarioId, 'fallback-generated-sheet.tsv', s18Artifacts.rawBuffer);
    clipboardArtifact = {
      status: 'NOT_OBTAINED_CURRENT_UI',
      reason: transportEvidence.clipboard.error ?? transportEvidence.clipboard.reason,
      fallback: {
        filename: 'fallback-generated-sheet.tsv',
        transport: 'rehearsal_generated_not_copied',
        mediaType: 'text/tab-separated-values;charset=utf-8',
        bytes: s18Artifacts.rawBuffer.byteLength,
        sha256: sha256(s18Artifacts.rawBuffer),
      },
      browserErrors: transportEvidence.clipboard.browserErrors ?? [],
    };
  }

  const bothCurrent = downloadedArtifact.status === 'CAPTURED_CURRENT_RUNTIME'
    && clipboardArtifact.status === 'CAPTURED_CURRENT_RUNTIME';
  const record = scenarioRecord(scenarioId, {
    title: 'Filename, MIME, transport, clipboard, download, and raw-hash evidence',
    reviewerStatus: bothCurrent
      ? 'CODEX_EXECUTED_CURRENT_RUNTIME_LOCAL_REHEARSAL'
      : 'PARTIAL_CURRENT_RUNTIME_WITH_LABELED_FALLBACK',
    download: downloadedArtifact,
    clipboard: clipboardArtifact,
    transportBoundary: {
      currentRuntimeDownloadCaptured: downloadedArtifact.status === 'CAPTURED_CURRENT_RUNTIME',
      currentRuntimeClipboardCaptured: clipboardArtifact.status === 'CAPTURED_CURRENT_RUNTIME',
      fallbackArtifactsAreActualTransportEvidence: false,
    },
  });
  writeJson(scenarioId, 'transport-manifest.json', record);
  scenarioRecords.set(scenarioId, record);
}

async function captureS22(serverProbe) {
  const scenarioId = 'S22';
  const record = scenarioRecord(scenarioId, {
    title: 'Explicit out-of-scope and not-assessed register',
    reviewerStatus: 'NOT_ASSESSED',
    assessments: [
      {
        topic: 'performance budgets, Web Vitals, and throttled-device latency',
        status: 'NOT_ASSESSED',
        requiredFutureEvidence: 'Agreed budgets plus repeatable mobile throttling run on an immutable candidate.',
      },
      {
        topic: 'actual-browser 200 percent zoom and reflow',
        status: 'NOT_ASSESSED',
        requiredFutureEvidence: 'Reviewer-controlled browser zoom capture and keyboard path.',
      },
      {
        topic: 'screen reader speech output',
        status: 'NOT_ASSESSED',
        requiredFutureEvidence: 'NVDA, VoiceOver, or equivalent reviewer log/audio on the candidate.',
      },
      {
        topic: 'actual-browser DST transition and UTC-offset download behavior',
        status: 'NOT_ASSESSED',
        requiredFutureEvidence: 'Browser clock/timezone run spanning a real DST transition.',
      },
      {
        topic: 'observed-user validation',
        status: 'NOT_ASSESSED',
        observedUsers: 0,
        reason: 'Only the user, Claude Design, and Codex are in this review loop.',
      },
      {
        topic: 'immutable candidate and production publication',
        status: 'NOT_ASSESSED',
        reason: dirty ? 'The current worktree is dirty.' : 'This collector does not publish or deploy.',
      },
    ],
    runtimeReachabilityAtCollection: serverProbe,
    noPassClaim: true,
  });
  writeJson(scenarioId, 'not-assessed-manifest.json', record);
  scenarioRecords.set(scenarioId, record);
}

async function captureS23() {
  const scenarioId = 'S23';
  const record = scenarioRecord(scenarioId, {
    title: 'Reviewer-chosen free exploration placeholder',
    reviewerStatus: 'AWAITING_REVIEWER_SELECTION',
    reviewerChosen: {
      route: null,
      seed: null,
      viewport: null,
      actionSequence: null,
      expectedOutcome: null,
      observedOutcome: null,
      finding: null,
      evidenceFiles: [],
    },
    instructions: [
      'Reviewer chooses the route, seed, viewport, and action sequence after opening the package.',
      'Record the choice before execution.',
      'Do not infer a pass, fail, or likely finding from this placeholder.',
    ],
    preClaim: 'NONE',
  });
  writeJson(scenarioId, 'reviewer-choice-placeholder.json', record);
  scenarioRecords.set(scenarioId, record);
}

function writeRootManifest(serverProbe) {
  const files = collectOwnedScenarioFiles().map((file) => {
    const scenarioId = file.relativePath.split('/')[0];
    const scenario = scenarioRecords.get(scenarioId);
    return {
      scenarioId,
      path: file.relativePath,
      bytes: file.bytes,
      sha256: file.sha256,
      mediaType: file.mediaType,
      head,
      buildId,
      dirty,
      evidenceClass,
      scenarioStatus: scenario?.reviewerStatus ?? 'UNKNOWN',
    };
  });
  const scenarios = scenarioIds.map((scenarioId) => {
    const record = scenarioRecords.get(scenarioId);
    return {
      scenarioId,
      title: record?.title ?? 'NOT_GENERATED',
      evidenceClass,
      reviewerStatus: record?.reviewerStatus ?? 'NOT_GENERATED',
      fileCount: files.filter((file) => file.scenarioId === scenarioId).length,
      files: files.filter((file) => file.scenarioId === scenarioId).map((file) => file.path),
    };
  });
  const payloadForIntegrity = {
    schemaVersion: 1,
    generatedAt,
    sourceSnapshot,
    scenarios,
    files,
  };
  const manifest = {
    schemaVersion: 1,
    manifestName: 'group-manifest-s17-s23.json',
    generatedAt,
    baseUrl: baseURL,
    evidenceClass,
    publicationState: dirty
      ? 'NOT_PUBLISHED_REHEARSAL'
      : 'CANDIDATE_BOUND_CAPTURE_AWAITING_PUBLICATION',
    productionReleaseClaim: 'NONE',
    observedUsers: 0,
    sourceSnapshot: {
      ...sourceSnapshot,
      gitStatus,
    },
    serverProbe,
    scenarios,
    files,
    collectorErrors,
    integrity: {
      algorithm: 'SHA-256',
      payloadSha256: sha256(Buffer.from(stableJson(payloadForIntegrity), 'utf8')),
      manifestSelfInventory: 'EXCLUDED_TO_AVOID_RECURSIVE_SELF_HASH',
      note: 'Every owned S17-S23 artifact is inventoried. This root manifest does not claim a hash of itself.',
    },
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function scenarioRecord(scenarioId, body) {
  return {
    schemaVersion: 1,
    scenarioId,
    generatedAt,
    baseUrl: baseURL,
    evidenceClass,
    observedUsers: 0,
    sourceSnapshot,
    ...body,
  };
}

async function seedSavedFlow(page, slug, anchor) {
  await page.goto('/flows', { waitUntil: 'domcontentloaded' });
  await settle(page);
  await page.evaluate(({ flowSlug, anchorDate, savedAt }) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(`flow:saved:${flowSlug}`, JSON.stringify({
      slug: flowSlug,
      savedAt,
      selectedArtifactMode: 'calendar',
      anchor: anchorDate,
      dateIntent: 'custom',
    }));
    window.localStorage.setItem(
      `flow:${flowSlug}:anchorDate`,
      JSON.stringify({ mode: 'custom', anchor: anchorDate }),
    );
  }, { flowSlug: slug, anchorDate: anchor, savedAt: fixedGeneratedAt });
}

async function openSavedTransferPanel(page, slug) {
  await page.goto(`/my?flow=${encodeURIComponent(slug)}`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  await page.locator('main[data-p35-q1-saved-transfer="on"]').waitFor({
    state: 'visible',
    timeout: 15_000,
  });
  const workspace = await openMyFlowLibraryFlow(page, slug, 'record');
  const entry = workspace.getByTestId('my-flow-export-entry');
  await entry.waitFor({ state: 'visible', timeout: 15_000 });
  await entry.click();
  const panel = workspace.getByTestId('my-flow-export-panel');
  await panel.waitFor({ state: 'visible', timeout: 15_000 });
  return panel;
}

async function openTransferConfirmation(panel, destination) {
  const button = panel.getByTestId(`my-flow-export-${destination}`);
  if (!(await button.isVisible().catch(() => false))) {
    const more = panel.getByTestId('my-flow-export-more-formats');
    await more.waitFor({ state: 'visible', timeout: 10_000 });
    if ((await more.getAttribute('open')) === null) {
      await more.locator(':scope > summary').click();
    }
  }
  await button.waitFor({ state: 'visible', timeout: 10_000 });
  await button.click();
  const confirmation = panel.getByTestId('my-flow-transfer-confirmation');
  await confirmation.waitFor({ state: 'visible', timeout: 10_000 });
  return confirmation;
}

async function installClipboardCapture(page) {
  await page.evaluate(() => {
    window.__flowmeEvidenceClipboardAttempts = 0;
    window.__flowmeEvidenceClipboardSuccesses = 0;
    window.__flowmeEvidenceClipboardText = '';
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__flowmeEvidenceClipboardAttempts += 1;
          window.__flowmeEvidenceClipboardSuccesses += 1;
          window.__flowmeEvidenceClipboardText = String(value);
        },
        readText: async () => window.__flowmeEvidenceClipboardText,
      },
    });
  });
}

async function storageSnapshot(page) {
  return page.evaluate(() => {
    const read = (storage) => Object.fromEntries(
      Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter(Boolean)
        .sort()
        .map((key) => [key, storage.getItem(key)]),
    );
    return { local: read(window.localStorage), session: read(window.sessionStorage) };
  });
}

function parseReceiptRegistry(raw) {
  if (!raw) return [];
  try {
    return JSON.parse(raw).receipts ?? [];
  } catch (error) {
    return [{ parseError: errorText(error), raw }];
  }
}

function summarizeStorageSnapshot(snapshot) {
  return Object.fromEntries(Object.entries(snapshot).map(([area, values]) => [
    area,
    Object.fromEntries(Object.entries(values).map(([key, value]) => {
      const buffer = Buffer.from(value ?? '', 'utf8');
      return [key, {
        bytes: buffer.byteLength,
        sha256: sha256(buffer),
        valueExcerpt: String(value ?? '').slice(0, 240),
      }];
    })),
  ]));
}

function summarizeStorageWrite(write) {
  if (write.operation !== 'setItem') return write;
  const buffer = Buffer.from(write.value ?? '', 'utf8');
  const { value: _omitted, ...rest } = write;
  return {
    ...rest,
    valueBytes: buffer.byteLength,
    valueSha256: sha256(buffer),
    valueExcerpt: String(write.value ?? '').slice(0, 240),
  };
}

async function dataAttributes(locator) {
  return locator.evaluate((element) => Object.fromEntries(
    [...element.attributes]
      .filter((attribute) => attribute.name.startsWith('data-'))
      .map((attribute) => [attribute.name, attribute.value]),
  ));
}

function parseIcs(ics) {
  const unfolded = ics.replaceAll(/\r?\n[ \t]/gu, '');
  const lines = unfolded.split(/\r\n|\n|\r/gu).filter(Boolean);
  const events = [];
  let current;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = undefined;
      continue;
    }
    if (!current) continue;
    const separator = line.indexOf(':');
    const key = separator >= 0 ? line.slice(0, separator).split(';')[0] : line;
    if (['UID', 'DTSTART', 'DTEND', 'RRULE', 'SUMMARY', 'STATUS'].includes(key)) {
      current[key] = line;
    }
  }
  return {
    lineEnding: ics.includes('\r\n') ? 'CRLF' : 'LF_OR_OTHER',
    endsWithCrLf: ics.endsWith('\r\n'),
    calendarCount: (unfolded.match(/BEGIN:VCALENDAR/gu) ?? []).length,
    eventCount: events.length,
    events,
  };
}

function normalizeCrLf(value) {
  return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').replaceAll('\n', '\r\n');
}

function safeFilename(value) {
  return path.basename(value).replaceAll(/[^\p{L}\p{N}._()-]+/gu, '-').slice(0, 160)
    || 'artifact.bin';
}

function collectBrowserErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push({ type: 'console', text: message.text() });
  });
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => errors.push({
    type: 'requestfailed',
    url: request.url(),
    text: request.failure()?.errorText ?? 'unknown',
  }));
  return errors;
}

async function settle(page) {
  await page.locator('body').waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(250);
}

async function probeServer() {
  const startedAt = Date.now();
  try {
    const response = await fetch(new URL('/flows', baseURL), {
      signal: AbortSignal.timeout(8_000),
    });
    return {
      reachable: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      reachable: false,
      error: errorText(error),
      url: new URL('/flows', baseURL).href,
      durationMs: Date.now() - startedAt,
    };
  }
}

function getLaunchOptions() {
  const configured = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH;
  const installedChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const executablePath = configured
    || (process.platform === 'win32' && fs.existsSync(installedChrome)
      ? installedChrome
      : undefined);
  return executablePath ? { executablePath } : {};
}

function scenarioPath(scenarioId, relativePath) {
  if (!scenarioIds.includes(scenarioId)) throw new Error(`Unknown scenario: ${scenarioId}`);
  const target = path.resolve(outputRoot, scenarioId, relativePath);
  const scenarioRoot = path.resolve(outputRoot, scenarioId);
  const relative = path.relative(scenarioRoot, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside ${scenarioId}: ${target}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  return target;
}

function writeJson(scenarioId, relativePath, value) {
  fs.writeFileSync(
    scenarioPath(scenarioId, relativePath),
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8',
  );
}

function writeText(scenarioId, relativePath, value) {
  fs.writeFileSync(scenarioPath(scenarioId, relativePath), value, 'utf8');
}

function writeBuffer(scenarioId, relativePath, value) {
  fs.writeFileSync(scenarioPath(scenarioId, relativePath), value);
}

function collectOwnedScenarioFiles() {
  return scenarioIds.flatMap((scenarioId) => {
    const scenarioRoot = path.join(outputRoot, scenarioId);
    return walkFiles(scenarioRoot).map((absolutePath) => {
      const buffer = fs.readFileSync(absolutePath);
      const relativePath = path.relative(outputRoot, absolutePath).replaceAll('\\', '/');
      return {
        relativePath,
        bytes: buffer.byteLength,
        sha256: sha256(buffer),
        mediaType: mimeTypeFor(absolutePath),
      };
    });
  }).sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(target) : [target];
  });
}

function mimeTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.json') return 'application/json;charset=utf-8';
  if (extension === '.png') return 'image/png';
  if (extension === '.ics') return 'text/calendar;charset=utf-8';
  if (extension === '.tsv') return 'text/tab-separated-values;charset=utf-8';
  if (extension === '.txt') return 'text/plain;charset=utf-8';
  return 'application/octet-stream';
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function gitOutput(args, trim = true) {
  try {
    const value = execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return trim ? value.trim() : value;
  } catch {
    return '';
  }
}

function readUtf8(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return undefined;
  }
}

function errorText(error) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function relativeToRepo(filePath) {
  return path.relative(repoRoot, filePath).replaceAll('\\', '/');
}
