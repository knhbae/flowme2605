import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join, normalize, relative, resolve } from "node:path";

import { chromium, type Locator, type Page } from "playwright";

type UiCheckId =
  | "U01"
  | "U02"
  | "U03"
  | "U04"
  | "U05"
  | "U06"
  | "U07"
  | "U08";

type UiCheck = {
  id: UiCheckId;
  target: "route" | "standalone" | "both";
  viewport: string;
  action: string;
  expected: string;
  observed: string;
  passed: boolean;
};

type Viewport = {
  width: number;
  height: number;
};

type ScreenshotEvidence = {
  label: string;
  file: string;
  viewport: string;
  checkId: UiCheckId;
};

type StageName = "input" | "structure" | "result";

const EXPECTED_CHECK_IDS: UiCheckId[] = [
  "U01",
  "U02",
  "U03",
  "U04",
  "U05",
  "U06",
  "U07",
  "U08",
];

const REPO_ROOT = process.cwd();
const OUTPUT_DIR = join(
  REPO_ROOT,
  "docs",
  "content-audit",
  "2026-08-04-flowme-text-authoring-grammar-ux-improvement-results",
);
const EVIDENCE_PATH = join(OUTPUT_DIR, "ui-simulation-evidence.json");
const ROUTE_ORIGIN = "http://127.0.0.1:3104";
const ROUTE_URL = `${ROUTE_ORIGIN}/flows/new`;
const ROUTE_QA_URL = `${ROUTE_URL}?authoringQa=1`;
const STATIC_ORIGIN = "http://127.0.0.1:4178";
const STANDALONE_RELATIVE_PATH = [
  "docs",
  "content-audit",
  "2026-08-04-flowme-text-authoring-grammar-ux-improvement-results",
  "flowme-text-authoring-v2-test.html",
].join("/");
const STANDALONE_URL = `${STATIC_ORIGIN}/${STANDALONE_RELATIVE_PATH}`;
const STANDALONE_QA_URL = `${STANDALONE_URL}?authoringQa=1`;

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
  shortMobile: { width: 390, height: 600 },
  narrowMobile: { width: 360, height: 640 },
  landscapeMobile: { width: 844, height: 390 },
  // 1440x900 화면을 브라우저 200% 확대했을 때와 같은 CSS viewport.
  // 자동화 환경의 브라우저 chrome 배율 대신 동일한 reflow 경계를 검증한다.
  zoom200Equivalent: { width: 720, height: 450 },
} as const satisfies Record<string, Viewport>;

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function viewportLabel(viewport: Viewport): string {
  return `${viewport.width}x${viewport.height}`;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function requireCondition(
  condition: unknown,
  message: string,
  details?: unknown,
): asserts condition {
  if (condition) return;
  throw new Error(
    details === undefined ? message : `${message}: ${JSON.stringify(details)}`,
  );
}

async function reachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForUrl(url: string, timeoutMs = 60_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await reachable(url)) return;
    await sleep(400);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startNextServer(): ChildProcess {
  return spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", "3104"],
    {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
}

function startStaticServer(): Promise<Server> {
  const server = createServer((request, response) => {
    try {
      const requestPath = decodeURIComponent(
        new URL(request.url ?? "/", STATIC_ORIGIN).pathname,
      );
      const target = resolve(REPO_ROOT, `.${normalize(requestPath)}`);
      if (
        target !== REPO_ROOT
        && !target.startsWith(`${REPO_ROOT}\\`)
        && !target.startsWith(`${REPO_ROOT}/`)
      ) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      if (!existsSync(target) || !statSync(target).isFile()) {
        response.writeHead(404).end("Not found");
        return;
      }
      response.writeHead(200, {
        "content-type": MIME[extname(target).toLowerCase()]
          ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(readFileSync(target));
    } catch (error) {
      response
        .writeHead(500)
        .end(error instanceof Error ? error.message : String(error));
    }
  });
  return new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(4178, "127.0.0.1", () => resolvePromise(server));
  });
}

async function resetAuthoring(
  page: Page,
  url: string,
  viewport: Viewport,
): Promise<void> {
  await page.setViewportSize(viewport);
  // Let the first navigation settle before clearing storage. Reloading while
  // route chunks are still in flight produces navigation-induced ERR_ABORTED
  // noise that is indistinguishable from a real failed asset request later.
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("flow:text-authoring:")) localStorage.removeItem(key);
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("text-authoring-workspace").waitFor({
    state: "visible",
  });
}

async function count(page: Page, testId: string): Promise<number> {
  return page.getByTestId(testId).count();
}

async function waitForCount(
  page: Page,
  testId: string,
  expected: number,
): Promise<void> {
  await page.waitForFunction(
    ({ id, value }) => (
      document.querySelectorAll(`[data-testid="${id}"]`).length === value
    ),
    { id: testId, value: expected },
  );
}

async function dataCount(page: Page): Promise<number> {
  return Number(
    await page.getByTestId("ta-authoring-preflight").getAttribute("data-count"),
  );
}

async function semanticSnapshot(page: Page): Promise<Record<string, unknown>> {
  const itemTitles = await page
    .getByTestId("ta-authoring-item")
    .evaluateAll((elements) => elements.map((element) => (
      element.querySelector("span.block")?.textContent?.trim()
        ?? element.textContent?.trim()
        ?? ""
    )));
  const slots = await page
    .locator('[data-testid^="ta-authoring-result-slot-"]')
    .evaluateAll((elements) => elements.map((element) => ({
      id: element.getAttribute("data-testid"),
      eligible: element.getAttribute("data-eligible"),
      selected: element.getAttribute("aria-pressed"),
    })));
  return {
    title: await page.getByTestId("ta-authoring-title").inputValue(),
    itemTitles,
    resultRows: await count(page, "ta-authoring-artifact-row"),
    preflight: await dataCount(page),
    resultKind: await page
      .locator("[data-authoring-result-kind]")
      .getAttribute("data-authoring-result-kind"),
    slots,
  };
}

async function ensureNoHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => (
    document.documentElement.scrollWidth
      <= document.documentElement.clientWidth + 1
  ));
}

async function scrollToEnd(locator: Locator): Promise<{
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}> {
  await locator.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await locator.page().waitForTimeout(30);
  return locator.evaluate((element) => ({
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
}

async function footerReachability(
  page: Page,
  target: Locator,
): Promise<Record<string, number | boolean>> {
  await target.scrollIntoViewIfNeeded();
  return target.evaluate((element) => {
    const footer = document.querySelector(".ta-workspace-footer");
    const primary = footer?.querySelector(".ta-primary-action");
    if (!(footer instanceof HTMLElement) || !(primary instanceof HTMLElement)) {
      throw new Error("Missing workspace footer or primary action");
    }
    const targetRect = element.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const primaryRect = primary.getBoundingClientRect();
    return {
      targetTop: targetRect.top,
      targetBottom: targetRect.bottom,
      footerTop: footerRect.top,
      footerBottom: footerRect.bottom,
      primaryTop: primaryRect.top,
      primaryBottom: primaryRect.bottom,
      viewportHeight: window.innerHeight,
      targetAboveFooter: targetRect.bottom <= footerRect.top + 1,
      footerInsideViewport:
        footerRect.top < window.innerHeight
        && footerRect.bottom <= window.innerHeight + 1,
      primaryInsideViewport:
        primaryRect.top >= -1
        && primaryRect.bottom <= window.innerHeight + 1,
    };
  });
}

async function screenshot(
  page: Page,
  screenshots: ScreenshotEvidence[],
  checkId: UiCheckId,
  label: string,
  file: string,
  viewport: Viewport,
): Promise<void> {
  await page.screenshot({
    path: join(OUTPUT_DIR, file),
  });
  screenshots.push({
    label,
    file,
    viewport: viewportLabel(viewport),
    checkId,
  });
}

async function stageScrollAudit(
  page: Page,
  url: string,
  viewport: Viewport,
): Promise<Record<string, unknown>> {
  await resetAuthoring(page, url, viewport);
  const results: Array<Record<string, unknown>> = [];
  const lastTarget = (stage: StageName): Locator => {
    // 출처·저장 상세는 기본 닫힘이다. 스크롤 도달성은 숨은 fieldset이
    // 아니라 사용자가 실제로 볼 수 있는 disclosure 자체로 판정한다.
    if (stage === "input") return page.getByTestId("ta-authoring-source-settings");
    if (stage === "structure") return page.getByTestId("ta-authoring-item").last();
    return page.getByTestId("ta-authoring-result-more");
  };

  for (const stage of ["input", "structure", "result"] as const) {
    const stageButton = page.getByTestId(`ta-authoring-stage-${stage}`);
    await stageButton.click();
    const pane = page.locator(`[data-authoring-pane="${stage}"]`);
    await pane.waitFor({ state: "visible" });
    const scroller = pane.locator("[data-authoring-pane-scroll]");
    const scroll = await scrollToEnd(scroller);
    const maxScrollTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
    const reachability = await footerReachability(page, lastTarget(stage));
    const shellScrollTop = await page
      .getByTestId("text-authoring-workspace")
      .evaluate((element) => element.scrollTop);
    const noHorizontalOverflow = await ensureNoHorizontalOverflow(page);
    const primaryText = (await page
      .locator(".ta-workspace-footer .ta-primary-action")
      .innerText()).trim();

    requireCondition(
      Math.abs(scroll.scrollTop - maxScrollTop) <= 1,
      `${viewportLabel(viewport)} ${stage} scroll did not reach the end`,
      { scroll, maxScrollTop },
    );
    requireCondition(
      reachability.targetAboveFooter === true,
      `${viewportLabel(viewport)} ${stage} last target overlaps the footer`,
      reachability,
    );
    requireCondition(
      reachability.footerInsideViewport === true
        && reachability.primaryInsideViewport === true,
      `${viewportLabel(viewport)} ${stage} footer action is clipped`,
      reachability,
    );
    requireCondition(
      shellScrollTop === 0,
      `${viewportLabel(viewport)} ${stage} created an outer scroll trap`,
      { shellScrollTop },
    );
    requireCondition(
      noHorizontalOverflow,
      `${viewportLabel(viewport)} ${stage} has horizontal overflow`,
    );
    results.push({
      stage,
      scrollTop: scroll.scrollTop,
      maxScrollTop,
      lastTargetAboveFooter: reachability.targetAboveFooter,
      primaryText,
      noHorizontalOverflow,
      shellScrollTop,
    });
  }

  return {
    viewport: viewportLabel(viewport),
    stages: results,
  };
}

async function panelInsideViewport(panel: Locator): Promise<boolean> {
  return panel.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left >= -1
      && rect.top >= -1
      && rect.right <= window.innerWidth + 1
      && rect.bottom <= window.innerHeight + 1;
  });
}

async function keyboardHelpAudit(
  page: Page,
  url: string,
  viewport: Viewport,
): Promise<Record<string, unknown>> {
  await resetAuthoring(page, url, viewport);
  const auditTrigger = async (
    triggerTestId: string,
    panelTestId: string,
  ): Promise<Record<string, unknown>> => {
    const trigger = page.getByTestId(triggerTestId);
    const panel = page.getByTestId(panelTestId);
    requireCondition(
      await trigger.getAttribute("aria-expanded") === "false",
      `${triggerTestId} must start collapsed`,
    );
    requireCondition(await panel.count() === 0, `${panelTestId} must start absent`);
    await trigger.focus();
    await trigger.press("Enter");
    await panel.waitFor({ state: "visible" });
    const opened = await trigger.getAttribute("aria-expanded");
    const insideViewport = await panelInsideViewport(panel);
    await page.keyboard.press("Escape");
    await panel.waitFor({ state: "detached" });
    const closed = await trigger.getAttribute("aria-expanded");
    const focusReturned = await trigger.evaluate(
      (element) => document.activeElement === element,
    );
    requireCondition(opened === "true", `${triggerTestId} did not open by keyboard`);
    requireCondition(insideViewport, `${panelTestId} extends outside viewport`);
    requireCondition(closed === "false", `${triggerTestId} did not close with Escape`);
    requireCondition(focusReturned, `${triggerTestId} did not retain keyboard focus`);
    return { opened, insideViewport, closed, focusReturned };
  };

  const syntax = await auditTrigger(
    "ta-authoring-syntax-guide",
    "ta-authoring-syntax-help-panel",
  );
  if (viewport.width < 1280) {
    await page.getByTestId("ta-authoring-stage-result").click();
  }
  const result = await auditTrigger(
    "ta-authoring-result-shape-help",
    "ta-authoring-result-shape-help-panel",
  );
  requireCondition(await ensureNoHorizontalOverflow(page), "help created overflow");
  return { syntax, result, noHorizontalOverflow: true };
}

type SlotGeometry = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

async function slotGeometry(page: Page): Promise<SlotGeometry[]> {
  return page
    .locator('[data-testid^="ta-authoring-result-slot-"]')
    .evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        id: element.getAttribute("data-testid") ?? "",
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    }));
}

function geometryMatches(
  baseline: SlotGeometry[],
  candidate: SlotGeometry[],
): boolean {
  return baseline.length === candidate.length
    && baseline.every((before, index) => {
      const after = candidate[index];
      return before.id === after.id
        && Math.abs(before.x - after.x) <= 1
        && Math.abs(before.y - after.y) <= 1
        && Math.abs(before.width - after.width) <= 1
        && Math.abs(before.height - after.height) <= 1;
    });
}

async function liveReflectionAudit(
  page: Page,
  url: string,
): Promise<Record<string, unknown>> {
  await resetAuthoring(page, url, VIEWPORTS.desktop);
  const title = page.getByTestId("ta-authoring-title");
  const source = page.getByTestId("ta-authoring-source");
  const baselineGeometry = await slotGeometry(page);
  const geometries: SlotGeometry[][] = [baselineGeometry];

  await title.fill("실시간 반영 확인");
  await page.waitForFunction(() => (
    (document.querySelector('[data-testid="ta-authoring-source"]') as HTMLTextAreaElement)
      ?.value.startsWith("# 실시간 반영 확인")
  ));
  geometries.push(await slotGeometry(page));

  const rawWithItem = `${await source.inputValue()}\n\n## 실시간 단계\n- [ ] 실시간 반영 항목`;
  await source.fill(rawWithItem);
  await waitForCount(page, "ta-authoring-item", 4);
  await waitForCount(page, "ta-authoring-artifact-row", 4);
  geometries.push(await slotGeometry(page));

  const rawWithDate = `${rawWithItem}\n  - 날짜: 2026-08-06`;
  await source.fill(rawWithDate);
  await page.waitForFunction(() => {
    const slot = document.querySelector(
      '[data-testid="ta-authoring-result-slot-calendar"]',
    );
    return slot?.getAttribute("aria-label")?.startsWith("캘린더 3") ?? false;
  });
  geometries.push(await slotGeometry(page));

  const rawWithLink = `${rawWithDate}\n  - 자료: [실시간 자료](https://example.com/live)`;
  await source.fill(rawWithLink);
  await page.waitForFunction(() => (
    document.querySelectorAll('[data-testid="ta-authoring-item"]').length === 4
  ));
  const focusAndCursor = await source.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    return {
      focused: document.activeElement === textarea,
      selectionStart: textarea.selectionStart,
      length: textarea.value.length,
    };
  });
  geometries.push(await slotGeometry(page));

  await page.getByTestId("ta-authoring-result-slot-calendar").click();
  const liveRow = page
    .getByTestId("ta-authoring-artifact-row")
    .filter({ hasText: "실시간 반영 항목" });
  await liveRow.waitFor({ state: "visible" });
  const liveRowText = (await liveRow.innerText()).replace(/\s+/gu, " ").trim();
  const link = liveRow.getByRole("link", { name: "실시간 자료" });
  await link.waitFor({ state: "visible" });
  const linkHref = await link.getAttribute("href");
  geometries.push(await slotGeometry(page));

  const geometryStable = geometries.every((value) => (
    geometryMatches(baselineGeometry, value)
  ));
  const titleSynchronized = (await source.inputValue()).startsWith(
    "# 실시간 반영 확인",
  );
  requireCondition(titleSynchronized, "title did not synchronize to source H1");
  requireCondition(
    focusAndCursor.focused && focusAndCursor.selectionStart === focusAndCursor.length,
    "source focus or cursor was lost during live update",
    focusAndCursor,
  );
  requireCondition(geometryStable, "result slot geometry moved during live update", {
    baselineGeometry,
    geometries,
  });
  requireCondition(liveRowText.includes("2026"), "live date was not rendered", {
    liveRowText,
  });
  requireCondition(
    linkHref === "https://example.com/live",
    "live Markdown link was not rendered",
    { linkHref },
  );
  return {
    title: await title.inputValue(),
    itemCount: await count(page, "ta-authoring-item"),
    calendarCount: Number(
      (await page
        .getByTestId("ta-authoring-result-slot-calendar")
        .getAttribute("aria-label"))
        ?.match(/\d+/u)?.[0] ?? 0,
    ),
    liveRowText,
    linkHref,
    focusAndCursor,
    geometryStable,
    slotIds: baselineGeometry.map((slot) => slot.id),
  };
}

async function exampleBoundaryAudit(
  page: Page,
  productUrl: string,
  qaUrl: string,
): Promise<Record<string, unknown>> {
  await resetAuthoring(page, productUrl, VIEWPORTS.tablet);
  const productSelect = page.getByTestId("ta-authoring-example-select");
  const product = {
    countLabel: (await page.getByTestId("ta-authoring-example-count").innerText()).trim(),
    productOptions: await productSelect.locator("[data-example-id]").count(),
    qaOptions: await productSelect.locator("[data-example-scenario-id]").count(),
    internalQaLabel: await page.getByText("내부 QA", { exact: true }).count(),
    twoPane: await page.getByTestId("ta02-1024-two-pane").isVisible(),
    noHorizontalOverflow: await ensureNoHorizontalOverflow(page),
    semantic: await semanticSnapshot(page),
  };

  await resetAuthoring(page, qaUrl, VIEWPORTS.tablet);
  const qaSelect = page.getByTestId("ta-authoring-example-select");
  const qaCounts = {
    countLabel: (await page.getByTestId("ta-authoring-example-count").innerText()).trim(),
    productOptions: await qaSelect.locator("[data-example-id]").count(),
    qaOptions: await qaSelect.locator("[data-example-scenario-id]").count(),
    groups: {
      existing: await page
        .getByTestId("ta-authoring-example-category-existing_content")
        .locator("[data-example-scenario-id]")
        .count(),
      condition: await page
        .getByTestId("ta-authoring-example-category-condition_change")
        .locator("[data-example-scenario-id]")
        .count(),
      compatibility: await page
        .getByTestId("ta-authoring-example-category-compatibility")
        .locator("[data-example-scenario-id]")
        .count(),
      error: await page
        .getByTestId("ta-authoring-example-category-error_boundary")
        .locator("[data-example-scenario-id]")
        .count(),
    },
    internalQaLabel: await page.getByText("내부 QA", { exact: true }).count(),
    twoPane: await page.getByTestId("ta02-1024-two-pane").isVisible(),
    noHorizontalOverflow: await ensureNoHorizontalOverflow(page),
  };
  await qaSelect.selectOption("qa:change-relative-anchor-aug");
  await waitForCount(page, "ta-authoring-item", 2);
  const applied = await semanticSnapshot(page);

  requireCondition(product.countLabel === "대표 5개", "product example count label mismatch", product);
  requireCondition(
    product.productOptions === 5 && product.qaOptions === 0,
    "product surface exposes the wrong catalog",
    product,
  );
  requireCondition(product.internalQaLabel === 0, "product surface exposes internal QA");
  requireCondition(
    product.twoPane && product.noHorizontalOverflow,
    "tablet product composition failed",
    product,
  );
  requireCondition(qaCounts.countLabel === "QA 전체 27개", "QA count label mismatch", qaCounts);
  requireCondition(
    qaCounts.productOptions === 5 && qaCounts.qaOptions === 27,
    "QA catalog size mismatch",
    qaCounts,
  );
  requireCondition(
    sameJson(qaCounts.groups, {
      existing: 8,
      condition: 8,
      compatibility: 6,
      error: 5,
    }),
    "QA group counts mismatch",
    qaCounts.groups,
  );
  requireCondition(
    qaCounts.internalQaLabel === 1
      && qaCounts.twoPane
      && qaCounts.noHorizontalOverflow,
    "QA tablet composition failed",
    qaCounts,
  );
  return { product, qa: qaCounts, applied };
}

async function focusVisible(locator: Locator): Promise<Record<string, unknown>> {
  await locator.focus();
  await locator.page().keyboard.press("Tab");
  await locator.page().keyboard.press("Shift+Tab");
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const active = document.activeElement === element;
    const visible = style.boxShadow !== "none"
      || (style.outlineStyle !== "none" && style.outlineWidth !== "0px");
    return {
      active,
      visible,
      boxShadow: style.boxShadow,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  let nextServer: ChildProcess | undefined;
  let staticServer: Server | undefined;
  const routeAlreadyRunning = await reachable(ROUTE_URL);
  if (!routeAlreadyRunning) {
    nextServer = startNextServer();
    let serverError = "";
    nextServer.stderr?.on("data", (chunk) => {
      serverError += String(chunk);
    });
    try {
      await waitForUrl(ROUTE_URL);
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\n${serverError}`,
      );
    }
  }
  staticServer = await startStaticServer();
  await waitForUrl(STANDALONE_URL);

  const executablePath = process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : undefined;
  const browser = await chromium.launch({
    ...(executablePath && existsSync(executablePath) ? { executablePath } : {}),
    headless: true,
  });
  const browserVersion = browser.version();
  const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const externalRequests = new Set<string>();
  const replacementCharacters: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    failedRequests.push(
      `${request.method()} ${request.url()} · ${request.failure()?.errorText ?? "unknown"}`,
    );
  });
  page.on("request", (request) => {
    const url = request.url();
    if (
      !url.startsWith(ROUTE_ORIGIN)
      && !url.startsWith(STATIC_ORIGIN)
      && !url.startsWith("data:")
      && !url.startsWith("blob:")
    ) {
      externalRequests.add(url);
    }
  });

  const checks: UiCheck[] = [];
  const screenshots: ScreenshotEvidence[] = [];

  async function record(
    metadata: Omit<UiCheck, "observed" | "passed">,
    run: () => Promise<Record<string, unknown>>,
  ): Promise<void> {
    try {
      const observed = await run();
      checks.push({
        ...metadata,
        observed: JSON.stringify(observed),
        passed: true,
      });
    } catch (error) {
      checks.push({
        ...metadata,
        observed: error instanceof Error ? error.message : String(error),
        passed: false,
      });
    }
  }

  try {
    await record(
      {
        id: "U01",
        target: "both",
        viewport: "1440x900",
        action: "항목 구조 기본 상태와 구조 수정 dialog 확인",
        expected: "항목 구조는 읽기 요약 · 수정 도구는 구조 수정 dialog 안에서만 표시 · route/standalone 동일",
      },
      async () => {
        const inspect = async (
          url: string,
          capture: boolean,
        ): Promise<Record<string, unknown>> => {
          await resetAuthoring(page, url, VIEWPORTS.desktop);
          const heading = page.getByRole("heading", { name: "항목 구조" });
          await heading.waitFor({ state: "visible" });
          const initial = {
            heading: (await heading.innerText()).trim(),
            itemCount: await count(page, "ta-authoring-item"),
            editorCount: await count(page, "ta-authoring-structure-editor"),
            inlineToolbarCount: await page
              .getByRole("toolbar", { name: "선택한 항목의 구조 고치기" })
              .count(),
            threePane: await page.getByTestId("ta02-1440-three-pane").isVisible(),
            noHorizontalOverflow: await ensureNoHorizontalOverflow(page),
          };
          requireCondition(
            initial.heading === "항목 구조"
              && initial.itemCount === 3
              && initial.editorCount === 0
              && initial.inlineToolbarCount === 0
              && initial.threePane
              && initial.noHorizontalOverflow,
            "default structure is not the read-only summary",
            initial,
          );

          await page.getByTestId("ta-authoring-structure-edit-toggle").click();
          const dialog = page.getByTestId("ta-authoring-structure-editor");
          await dialog.waitFor({ state: "visible" });
          const dialogState = {
            title: (await dialog.getByRole("heading", { name: "구조 수정" }).innerText()).trim(),
            selectedItem: await dialog.getByText("선택한 항목", { exact: true }).count(),
            toolbarCount: await dialog
              .getByRole("toolbar", { name: "선택한 항목의 구조 고치기" })
              .count(),
            moveUp: await dialog.getByRole("button", { name: "항목을 위로 이동" }).count(),
            merge: await dialog.getByRole("button", { name: "다음과 합치기" }).count(),
            roleSelect: await dialog.getByLabel("선택 항목 역할").count(),
          };
          requireCondition(
            dialogState.title === "구조 수정"
              && dialogState.selectedItem === 1
              && dialogState.toolbarCount === 1
              && dialogState.moveUp === 1
              && dialogState.merge === 1
              && dialogState.roleSelect === 1,
            "structure edit controls are not contained in the dialog",
            dialogState,
          );
          if (capture) {
            await screenshot(
              page,
              screenshots,
              "U01",
              "Route 구조 수정 dialog",
              "ui-u01-structure-dialog-1440x900.png",
              VIEWPORTS.desktop,
            );
          }
          await dialog.getByRole("button", { name: "수정 닫기" }).click();
          requireCondition(await dialog.count() === 0, "structure dialog did not close");
          return { initial, dialog: dialogState };
        };

        const route = await inspect(ROUTE_URL, true);
        const standalone = await inspect(STANDALONE_URL, false);
        requireCondition(sameJson(route, standalone), "route/standalone U01 parity failed", {
          route,
          standalone,
        });
        return { route, standalone, parity: true };
      },
    );

    await record(
      {
        id: "U02",
        target: "both",
        viewport: "1440x900 · 390x844",
        action: "? 도움말을 키보드로 열고 Escape로 닫기",
        expected: "긴 설명은 기본 숨김 · Enter로 열림 · Escape로 닫힘 · focus 유지 · viewport 안에 표시",
      },
      async () => {
        const desktop = await keyboardHelpAudit(page, ROUTE_URL, VIEWPORTS.desktop);
        const routeMobile = await keyboardHelpAudit(page, ROUTE_URL, VIEWPORTS.mobile);
        await screenshot(
          page,
          screenshots,
          "U02",
          "Route 모바일 도움말 닫힘 상태",
          "ui-u02-help-keyboard-390x844.png",
          VIEWPORTS.mobile,
        );
        const standaloneMobile = await keyboardHelpAudit(
          page,
          STANDALONE_URL,
          VIEWPORTS.mobile,
        );
        requireCondition(
          sameJson(routeMobile, standaloneMobile),
          "route/standalone U02 parity failed",
          { routeMobile, standaloneMobile },
        );
        return { desktop, routeMobile, standaloneMobile, parity: true };
      },
    );

    await record(
      {
        id: "U03",
        target: "route",
        viewport: "390x844",
        action: "입력·구조·결과 stage 끝까지 스크롤",
        expected: "각 stage 마지막 요소와 하단 행동 도달 · footer 겹침/가로 overflow/scroll trap 0",
      },
      async () => {
        const observed = await stageScrollAudit(page, ROUTE_URL, VIEWPORTS.mobile);
        await page.getByTestId("ta-authoring-stage-result").click();
        await scrollToEnd(
          page
            .getByTestId("ta02-390-result")
            .locator("[data-authoring-pane-scroll]"),
        );
        await screenshot(
          page,
          screenshots,
          "U03",
          "Route 390x844 결과 하단",
          "ui-u03-stage-scroll-390x844.png",
          VIEWPORTS.mobile,
        );
        return observed;
      },
    );

    await record(
      {
        id: "U04",
        target: "route",
        viewport: "390x600 · 360x640",
        action: "짧은 모바일 화면의 세 stage와 마지막 행동 확인",
        expected: "두 viewport 모두 stage 끝 도달 · 네 결과 슬롯/저장 행동 접근 · footer 겹침/문구 잘림/overflow 0",
      },
      async () => {
        const results: Record<string, unknown>[] = [];
        for (const [viewport, file] of [
          [VIEWPORTS.shortMobile, "ui-u04-short-390x600.png"],
          [VIEWPORTS.narrowMobile, "ui-u04-short-360x640.png"],
        ] as const) {
          results.push(await stageScrollAudit(page, ROUTE_URL, viewport));
          await page.getByTestId("ta-authoring-stage-result").click();
          await scrollToEnd(
            page
              .getByTestId("ta02-390-result")
              .locator("[data-authoring-pane-scroll]"),
          );
          const slots = await page
            .locator('[data-testid^="ta-authoring-result-slot-"]')
            .count();
          const saveText = (await page
            .getByTestId("ta-authoring-save")
            .innerText()).trim();
          requireCondition(slots === 4, `${viewportLabel(viewport)} cannot reach four result slots`);
          requireCondition(saveText.length > 0, `${viewportLabel(viewport)} save action is blank`);
          await screenshot(
            page,
            screenshots,
            "U04",
            `Route ${viewportLabel(viewport)} 결과 하단`,
            file,
            viewport,
          );
        }
        return { viewports: results };
      },
    );

    await record(
      {
        id: "U05",
        target: "route",
        viewport: "844x390",
        action: "가로 모바일에서 세 stage와 마지막 행동 확인",
        expected: "탭·본문 겹침 0 · 세로 스크롤로 마지막 요소 도달 · 가로 overflow/footer 겹침 0",
      },
      async () => {
        const observed = await stageScrollAudit(
          page,
          ROUTE_URL,
          VIEWPORTS.landscapeMobile,
        );
        await page.getByTestId("ta-authoring-stage-result").click();
        await scrollToEnd(
          page
            .getByTestId("ta02-390-result")
            .locator("[data-authoring-pane-scroll]"),
        );
        await screenshot(
          page,
          screenshots,
          "U05",
          "Route 가로 모바일 결과 하단",
          "ui-u05-landscape-844x390.png",
          VIEWPORTS.landscapeMobile,
        );
        return observed;
      },
    );

    await record(
      {
        id: "U06",
        target: "both",
        viewport: "1440x900",
        action: "제목·Item·날짜·Markdown 링크를 저장 없이 순차 수정",
        expected: "구조와 결과 즉시 반영 · focus/cursor 유지 · 고정 결과 슬롯 geometry 이동 0 · route/standalone 동일",
      },
      async () => {
        const route = await liveReflectionAudit(page, ROUTE_URL);
        await screenshot(
          page,
          screenshots,
          "U06",
          "Route 실시간 제목·Item·날짜·링크 반영",
          "ui-u06-live-reflection-1440x900.png",
          VIEWPORTS.desktop,
        );
        const standalone = await liveReflectionAudit(page, STANDALONE_URL);
        requireCondition(
          sameJson(route, standalone),
          "route/standalone U06 parity failed",
          { route, standalone },
        );
        return { route, standalone, parity: true };
      },
    );

    await record(
      {
        id: "U07",
        target: "both",
        viewport: "1024x768",
        action: "제품 대표 5개와 QA 27개 카탈로그 경계 및 동일 예시 적용 비교",
        expected: "제품은 대표 5개만 · QA mode는 27개와 4개 그룹 · route/standalone semantic parity · tablet overflow 0",
      },
      async () => {
        const route = await exampleBoundaryAudit(page, ROUTE_URL, ROUTE_QA_URL);
        await screenshot(
          page,
          screenshots,
          "U07",
          "Route QA 27개 카탈로그",
          "ui-u07-product-qa-boundary-1024x768.png",
          VIEWPORTS.tablet,
        );
        const standalone = await exampleBoundaryAudit(
          page,
          STANDALONE_URL,
          STANDALONE_QA_URL,
        );
        requireCondition(
          sameJson(route, standalone),
          "route/standalone U07 parity failed",
          { route, standalone },
        );
        return { route, standalone, parity: true };
      },
    );

    await record(
      {
        id: "U08",
        target: "both",
        viewport: "1440x900 · 1024x768 · 390x844 · 390x600 · 360x640 · 844x390 · 1440x900@200%(720x450 CSS)",
        action: "키보드 focus-visible과 런타임·문자·요청 오류 기본선 확인",
        expected: "주요 조작 focus-visible · keyboard stage/결과 조작 · console/page/request/replacement/external request 0",
      },
      async () => {
        const focusResults: Array<Record<string, unknown>> = [];
        for (const url of [ROUTE_URL, STANDALONE_URL]) {
          await resetAuthoring(page, url, VIEWPORTS.mobile);
          const stageStructure = page.getByTestId("ta-authoring-stage-structure");
          await stageStructure.focus();
          await stageStructure.press("Enter");
          requireCondition(
            await stageStructure.getAttribute("aria-current") === "step",
            "keyboard could not activate the structure stage",
          );
          const stageFocus = await focusVisible(stageStructure);
          const exampleFocus = await focusVisible(
            page.getByTestId("ta-authoring-example-select"),
          );
          await page.getByTestId("ta-authoring-stage-result").click();
          const todoSlot = page.getByTestId("ta-authoring-result-slot-todo");
          await todoSlot.focus();
          await todoSlot.press("Enter");
          requireCondition(
            await todoSlot.getAttribute("aria-pressed") === "true",
            "keyboard could not activate a result slot",
          );
          const slotFocus = await focusVisible(todoSlot);
          const primaryFocus = await focusVisible(
            page.locator(".ta-workspace-footer .ta-primary-action"),
          );
          for (const [name, value] of Object.entries({
            stageFocus,
            exampleFocus,
            slotFocus,
            primaryFocus,
          })) {
            requireCondition(
              value.active === true && value.visible === true,
              `${name} is missing focus-visible`,
              value,
            );
          }
          focusResults.push({
            target: url.startsWith(ROUTE_ORIGIN) ? "route" : "standalone",
            stageFocus,
            exampleFocus,
            slotFocus,
            primaryFocus,
          });
        }

        for (const viewport of Object.values(VIEWPORTS)) {
          await resetAuthoring(page, ROUTE_URL, viewport);
          const bodyText = await page.locator("body").innerText();
          if (bodyText.includes("\uFFFD")) {
            replacementCharacters.push(`route ${viewportLabel(viewport)}`);
          }
          requireCondition(
            await ensureNoHorizontalOverflow(page),
            `route ${viewportLabel(viewport)} horizontal overflow`,
          );
        }
        await screenshot(
          page,
          screenshots,
          "U08",
          "Route 1440x900의 200% 확대 reflow 동등 화면",
          "ui-u08-zoom-200-equivalent-720x450.png",
          VIEWPORTS.zoom200Equivalent,
        );
        await resetAuthoring(page, STANDALONE_URL, VIEWPORTS.desktop);
        const standaloneText = await page.locator("body").innerText();
        if (standaloneText.includes("\uFFFD")) {
          replacementCharacters.push("standalone 1440x900");
        }
        requireCondition(replacementCharacters.length === 0, "replacement character found", {
          replacementCharacters,
        });
        requireCondition(consoleErrors.length === 0, "console errors found", consoleErrors);
        requireCondition(pageErrors.length === 0, "page errors found", pageErrors);
        requireCondition(failedRequests.length === 0, "failed requests found", failedRequests);
        requireCondition(externalRequests.size === 0, "external requests found", [
          ...externalRequests,
        ]);
        await screenshot(
          page,
          screenshots,
          "U08",
          "Standalone 런타임 기본선",
          "ui-u08-runtime-a11y-1440x900.png",
          VIEWPORTS.desktop,
        );
        return {
          focusResults,
          viewports: Object.values(VIEWPORTS).map(viewportLabel),
          consoleErrors: consoleErrors.length,
          pageErrors: pageErrors.length,
          failedRequests: failedRequests.length,
          replacementCharacters: replacementCharacters.length,
          externalRequests: externalRequests.size,
        };
      },
    );
  } finally {
    await browser.close();
    if (staticServer) {
      await new Promise<void>((resolvePromise) => {
        staticServer?.close(() => resolvePromise());
      });
    }
    if (nextServer && !nextServer.killed) nextServer.kill();
  }

  const checkIds = checks.map((check) => check.id);
  requireCondition(
    sameJson(checkIds, EXPECTED_CHECK_IDS),
    "UI evidence must contain exactly U01-U08 once and in matrix order",
    { checkIds, expected: EXPECTED_CHECK_IDS },
  );
  requireCondition(
    checks.every((check) => typeof check.passed === "boolean"),
    "every UI evidence check must have boolean passed",
  );

  const evidence = {
    schemaVersion: "flowme-text-authoring-ui-simulation-v2",
    executedAt: new Date().toISOString(),
    browser: browserVersion,
    routeUrl: ROUTE_URL,
    routeQaUrl: ROUTE_QA_URL,
    standaloneUrl: STANDALONE_URL,
    standaloneQaUrl: STANDALONE_QA_URL,
    viewports: Object.values(VIEWPORTS).map(viewportLabel),
    commands: [
      "npm.cmd run build",
      "npm.cmd run build:text-authoring-html",
      "npx.cmd tsx scripts/content-audit/capture-text-authoring-grammar-ui.ts",
    ],
    checks,
    consoleErrors,
    pageErrors,
    failedRequests,
    replacementCharacters,
    externalRequests: [...externalRequests],
    screenshots,
    note: "자동화된 내부 브라우저 QA이며 사용자 관찰 검증이 아니다. route와 standalone parity, 여섯 viewport, keyboard·scroll·runtime 기본선을 U01~U08로 기록했다.",
  };
  writeFileSync(
    EVIDENCE_PATH,
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );

  const failed = checks.filter((check) => !check.passed);
  console.log(JSON.stringify({
    evidence: relative(REPO_ROOT, EVIDENCE_PATH).replaceAll("\\", "/"),
    passed: checks.length - failed.length,
    total: checks.length,
    ids: checkIds,
    consoleErrors: consoleErrors.length,
    pageErrors: pageErrors.length,
    failedRequests: failedRequests.length,
    replacementCharacters: replacementCharacters.length,
    externalRequests: externalRequests.size,
    screenshots: screenshots.length,
  }, null, 2));
  if (failed.length > 0) {
    console.error(JSON.stringify(failed, null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
