import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  extname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

import { chromium, type Locator, type Page } from "playwright";

type Viewport = {
  width: number;
  height: number;
};

type MatrixCaseDefinition = {
  id: `V${string}`;
  exampleId: "simple" | "jeju" | "moving" | "course" | "allblanc";
  viewport: Viewport;
};

type RuntimeEvidence = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  badResponses: string[];
  externalRequests: string[];
  replacementCharacters: number;
};

type RectEvidence = {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type SurfaceEvidence = {
  target: "route" | "standalone";
  url: string;
  source: Record<string, unknown>;
  flow: Record<string, unknown>;
  structure: Record<string, unknown>;
  responsiveLayout: Record<string, unknown>;
  resultSlots: Array<Record<string, unknown>>;
  selectedResult: Record<string, unknown>;
  reachability: Record<string, unknown>;
  runtime: RuntimeEvidence;
  screenshot: string;
  passed: boolean;
  failures: string[];
};

const REPO_ROOT = process.cwd();
const OUTPUT_DIR = join(
  REPO_ROOT,
  "docs",
  "content-audit",
  "2026-08-04-flowme-text-authoring-v2-round2-results",
);
const SCREENSHOT_DIR = join(OUTPUT_DIR, "round2-visual-evidence");
const MATRIX_PATH = join(OUTPUT_DIR, "round2-visual-behavior-matrix.json");
const CLAUDE_PATH = join(OUTPUT_DIR, "claude-structure-reference.json");
const STANDALONE_PATH = join(
  REPO_ROOT,
  "docs",
  "content-audit",
  "2026-08-04-flowme-text-authoring-grammar-ux-improvement-results",
  "flowme-text-authoring-v2-test.html",
);
const CLAUDE_WORK_DIR = resolve(REPO_ROOT, "..", "flow-mvp", "claude_work");

const ROUTE_ORIGIN = "http://127.0.0.1:3127";
const ROUTE_URL = `${ROUTE_ORIGIN}/flows/new`;
const STATIC_ORIGIN = "http://127.0.0.1:4191";
const STANDALONE_URL = `${STATIC_ORIGIN}/standalone/flowme-text-authoring-v2-test.html`;
const CHROMIUM_EXECUTABLE = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
  { width: 390, height: 600 },
] as const satisfies readonly Viewport[];

const EXAMPLES = [
  { id: "simple", expectedItems: 3 },
  { id: "jeju", expectedItems: 5 },
  { id: "moving", expectedItems: 27 },
  { id: "course", expectedItems: 14 },
  { id: "allblanc", expectedItems: 7 },
] as const;

const MATRIX_CASES: MatrixCaseDefinition[] = EXAMPLES.flatMap(
  (example, exampleIndex) => VIEWPORTS.map((viewport, viewportIndex) => ({
    id: `V${String(exampleIndex * VIEWPORTS.length + viewportIndex + 1).padStart(2, "0")}`,
    exampleId: example.id,
    viewport,
  } as MatrixCaseDefinition)),
);

const EXPECTED_SLOT_ORDER = ["calendar", "todo", "sheet", "memo"];

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function viewportLabel(viewport: Viewport): string {
  return `${viewport.width}x${viewport.height}`;
}

function normalizedPath(path: string): string {
  return path.replaceAll("\\", "/");
}

function outputRelative(path: string): string {
  return normalizedPath(relative(REPO_ROOT, path));
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
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

function walkFiles(root: string): string[] {
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const target = join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile()) files.push(target);
    }
  };
  visit(root);
  return files;
}

function locateClaudeZip(): string {
  const candidates = readdirSync(CLAUDE_WORK_DIR)
    .filter((name) => name.toLowerCase().endsWith(".zip"))
    .filter((name) => name.includes("v2_260804_1617"));
  requireCondition(
    candidates.length === 1,
    "Expected exactly one Claude v2_260804_1617 ZIP",
    candidates,
  );
  return join(CLAUDE_WORK_DIR, candidates[0]);
}

function extractClaudeZip(zipPath: string): string {
  const extractionRoot = mkdtempSync(join(tmpdir(), "flowme-claude-round2-"));
  const result = spawnSync(
    "tar.exe",
    ["-xf", zipPath, "-C", extractionRoot],
    { encoding: "utf8", windowsHide: true },
  );
  if (result.status !== 0) {
    rmSync(extractionRoot, { recursive: true, force: true });
    throw new Error(
      `Claude ZIP extraction failed: ${result.stderr || result.stdout}`,
    );
  }
  return extractionRoot;
}

function safeResolve(root: string, requestPath: string): string | null {
  const candidate = resolve(root, `.${requestPath}`);
  const normalizedRoot = resolve(root);
  if (
    candidate === normalizedRoot
    || candidate.startsWith(`${normalizedRoot}${sep}`)
    || candidate.startsWith(`${normalizedRoot}/`)
  ) {
    return candidate;
  }
  return null;
}

function startStaticServer(claudeRoot: string): Promise<Server> {
  const server = createServer((request, response) => {
    try {
      const requestPath = decodeURIComponent(
        new URL(request.url ?? "/", STATIC_ORIGIN).pathname,
      );
      let target: string | null = null;
      if (requestPath === "/standalone/flowme-text-authoring-v2-test.html") {
        target = STANDALONE_PATH;
      } else if (requestPath.startsWith("/claude/")) {
        target = safeResolve(claudeRoot, requestPath.slice("/claude".length));
      }
      if (!target || !existsSync(target) || !statSync(target).isFile()) {
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
    server.listen(4191, "127.0.0.1", () => resolvePromise(server));
  });
}

function startNextServer(): ChildProcess {
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", "3127"],
    {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  child.stdout?.on("data", () => {
    // Consume the pipe so a long evidence run cannot block the server.
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(`[round2-next] ${String(chunk)}`);
  });
  return child;
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
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await reachable(url)) return;
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function emptyRuntimeEvidence(): RuntimeEvidence {
  return {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
    externalRequests: [],
    replacementCharacters: 0,
  };
}

function attachRuntimeRecorder(
  page: Page,
  runtimeByKey: Map<string, RuntimeEvidence>,
  activeKey: { value: string },
  allowedOrigins: Set<string>,
): void {
  const active = () => {
    if (!runtimeByKey.has(activeKey.value)) {
      runtimeByKey.set(activeKey.value, emptyRuntimeEvidence());
    }
    return runtimeByKey.get(activeKey.value)!;
  };
  page.on("console", (message) => {
    if (message.type() === "error") active().consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    active().pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    active().failedRequests.push(
      `${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "unknown"}`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      active().badResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("request", (request) => {
    try {
      const url = new URL(request.url());
      if (
        (url.protocol === "http:" || url.protocol === "https:")
        && !allowedOrigins.has(url.origin)
      ) {
        active().externalRequests.push(request.url());
      }
    } catch {
      // data:, blob:, and browser-internal URLs are intentionally ignored.
    }
  });
}

async function resetProductPage(
  page: Page,
  url: string,
  viewport: Viewport,
): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByTestId("text-authoring-workspace").waitFor({ state: "visible" });
}

async function activateStage(
  page: Page,
  stage: "input" | "structure" | "result",
  viewport: Viewport,
): Promise<void> {
  if (viewport.width < 1280) {
    const button = page.getByTestId(`ta-authoring-stage-${stage}`);
    await button.click();
    await page
      .locator(`[data-authoring-pane="${stage}"][data-stage-active="true"]`)
      .waitFor({ state: "visible" });
  } else {
    await page.locator(`[data-authoring-pane="${stage}"]`).waitFor({
      state: "visible",
    });
  }
}

async function rectEvidence(locator: Locator): Promise<RectEvidence> {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.x * 100) / 100,
      y: Math.round(rect.y * 100) / 100,
      width: Math.round(rect.width * 100) / 100,
      height: Math.round(rect.height * 100) / 100,
      top: Math.round(rect.top * 100) / 100,
      right: Math.round(rect.right * 100) / 100,
      bottom: Math.round(rect.bottom * 100) / 100,
      left: Math.round(rect.left * 100) / 100,
    };
  });
}

async function scrollStageToActualEnd(
  page: Page,
  stage: "input" | "structure" | "result",
  viewport: Viewport,
): Promise<Record<string, unknown>> {
  await activateStage(page, stage, viewport);
  const pane = page.locator(`[data-authoring-pane="${stage}"]`);
  const scroller = pane.locator("[data-authoring-pane-scroll]").first();
  const lastTarget = stage === "input"
    ? pane.getByTestId("ta-authoring-source-settings").locator("summary")
    : stage === "structure"
      ? pane.locator(
        '[data-testid="ta-authoring-item"], [data-testid="ta-authoring-excluded-item"]',
      ).last()
      : pane.getByTestId("ta-authoring-result-more").locator("summary");

  requireCondition(await lastTarget.count() === 1, `${stage} actual last target missing`);
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.waitForTimeout(40);

  const scroll = await scroller.evaluate((element) => ({
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  const maxScrollTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
  const targetRect = await rectEvidence(lastTarget);
  const targetVisible = await lastTarget.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none"
      && style.visibility !== "hidden"
      && rect.width > 0
      && rect.height > 0
      && rect.bottom > 0
      && rect.top < window.innerHeight;
  });

  const footer = page.locator(".ta-workspace-footer");
  const footerVisible = await footer.isVisible().catch(() => false);
  const footerRect = footerVisible ? await rectEvidence(footer) : null;
  const overlapsFooter = footerRect
    ? targetRect.bottom > footerRect.top + 1
    : false;

  let action: Record<string, unknown> | null = null;
  const actionTestId = viewport.width >= 1280
    ? stage === "result" ? "ta-authoring-save-desktop" : null
    : stage === "input"
      ? "ta-authoring-parse"
      : stage === "structure"
        ? "ta-authoring-result-next"
        : "ta-authoring-save";
  if (actionTestId) {
    const actionLocator = page.getByTestId(actionTestId);
    const visible = await actionLocator.isVisible().catch(() => false);
    action = {
      testId: actionTestId,
      visible,
      enabled: visible ? await actionLocator.isEnabled() : false,
      label: visible ? (await actionLocator.innerText()).trim() : "",
      rect: visible ? await rectEvidence(actionLocator) : null,
    };
  }

  const pageOverflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    horizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));

  return {
    stage,
    lastTargetContract: stage === "input"
      ? "visible source settings summary"
      : stage === "structure"
        ? "last visible Item"
        : "visible additional-check summary and save behavior",
    scrollTop: rounded(scroll.scrollTop),
    maxScrollTop: rounded(maxScrollTop),
    reachedEnd: Math.abs(scroll.scrollTop - maxScrollTop) <= 1,
    targetVisible,
    targetRect,
    footerVisible,
    footerRect,
    overlapsFooter,
    paneHorizontalOverflow: scroll.scrollWidth > scroll.clientWidth + 1,
    pageOverflow,
    action,
  };
}

async function collectSourceAndFlow(page: Page): Promise<{
  source: Record<string, unknown>;
  flow: Record<string, unknown>;
}> {
  const rawText = await page.getByTestId("ta-authoring-source").inputValue();
  const title = await page.getByTestId("ta-authoring-title").inputValue();
  const exampleSelect = page.getByTestId("ta-authoring-example-select");
  const selectedValue = await exampleSelect.inputValue();
  const selectedLabel = await exampleSelect.locator("option:checked").innerText();
  return {
    source: {
      exampleSelection: selectedValue,
      exampleId: selectedValue.replace(/^product:/u, ""),
      exampleLabel: selectedLabel.trim(),
      rawTextSha256: sha256(rawText),
      rawTextUtf8Bytes: Buffer.byteLength(rawText, "utf8"),
      rawTextCharacters: [...rawText].length,
      firstLine: rawText.split(/\r?\n/u)[0] ?? "",
      lastLine: rawText.split(/\r?\n/u).at(-1) ?? "",
    },
    flow: { title },
  };
}

async function collectStructure(
  page: Page,
  viewport: Viewport,
): Promise<Record<string, unknown>> {
  await activateStage(page, "structure", viewport);
  const pane = page.locator('[data-authoring-pane="structure"]');
  return pane.evaluate((element) => {
    const itemElements = [...element.querySelectorAll<HTMLElement>(
      '[data-testid="ta-authoring-item"], [data-testid="ta-authoring-excluded-item"]',
    )];
    const stepsById = new Map<string, {
      stepId: string;
      title: string;
      itemIds: string[];
      items: Array<{
        itemId: string;
        included: boolean;
        title: string;
      }>;
    }>();
    itemElements.forEach((item) => {
      const section = item.closest<HTMLElement>(
        'section[aria-labelledby^="text-authoring-"]',
      );
      const labelledBy = section?.getAttribute("aria-labelledby") ?? "";
      const stepId = labelledBy.replace(/^text-authoring-/u, "");
      if (!stepsById.has(stepId)) {
        const heading = labelledBy ? document.getElementById(labelledBy) : null;
        stepsById.set(stepId, {
          stepId,
          title: heading?.textContent?.trim() ?? "",
          itemIds: [],
          items: [],
        });
      }
      const itemValue = {
        itemId: item.dataset.taItemId ?? "",
        included: item.dataset.testid === "ta-authoring-item",
        title: item.querySelector("span.block")?.textContent?.trim()
          ?? item.textContent?.trim()
          ?? "",
      };
      stepsById.get(stepId)!.items.push(itemValue);
      stepsById.get(stepId)!.itemIds.push(itemValue.itemId);
    });
    const steps = [...stepsById.values()];
    const allItems = steps.flatMap((step) => step.items);
    return {
      stepCount: steps.length,
      stepIds: steps.map((step) => step.stepId),
      steps,
      itemCount: allItems.length,
      includedItemCount: allItems.filter((item) => item.included).length,
      itemIds: allItems.map((item) => item.itemId),
      representativeItemTitles: [
        ...allItems.slice(0, 3).map((item) => item.title),
        ...allItems.slice(-2).map((item) => item.title),
      ].filter((title, index, titles) => title && titles.indexOf(title) === index),
    };
  });
}

async function collectResultSlots(
  page: Page,
  viewport: Viewport,
): Promise<Array<Record<string, unknown>>> {
  await activateStage(page, "result", viewport);
  const slots = page.locator('[data-testid^="ta-authoring-result-slot-"]');
  const count = await slots.count();
  const result: Array<Record<string, unknown>> = [];
  for (let index = 0; index < count; index += 1) {
    const slot = slots.nth(index);
    const testId = await slot.getAttribute("data-testid") ?? "";
    result.push({
      index,
      kind: testId.replace("ta-authoring-result-slot-", ""),
      eligible: await slot.getAttribute("data-eligible") === "true",
      selected: await slot.getAttribute("aria-pressed") === "true",
      recommended: await slot.getAttribute("data-recommended") === "true",
      disabled: await slot.isDisabled(),
      ariaLabel: await slot.getAttribute("aria-label"),
      text: (await slot.innerText()).trim(),
      geometry: await rectEvidence(slot),
    });
  }
  return result;
}

async function collectResponsiveLayout(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => {
    const paneKeys = ["input", "structure", "result"];
    const panes = paneKeys.map((key) => {
      const element = document.querySelector<HTMLElement>(
        `[data-authoring-pane="${key}"]`,
      );
      if (!element) return { key, present: false, visible: false, rect: null };
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        key,
        present: true,
        visible: style.display !== "none" && rect.width > 0 && rect.height > 0,
        active: element.dataset.stageActive === "true",
        rect: {
          x: Math.round(rect.x * 100) / 100,
          y: Math.round(rect.y * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        },
      };
    });
    const stageNavigation = document.querySelector<HTMLElement>(
      ".ta-stage-navigation",
    );
    const stageRect = stageNavigation?.getBoundingClientRect();
    const footer = document.querySelector<HTMLElement>(".ta-workspace-footer");
    const footerRect = footer?.getBoundingClientRect();
    return {
      mode: window.innerWidth >= 1280
        ? "three-pane"
        : window.innerWidth >= 768
          ? "two-pane"
          : "single-stage",
      panes,
      visiblePaneKeys: panes.filter((pane) => pane.visible).map((pane) => pane.key),
      stageNavigation: {
        visible: Boolean(
          stageNavigation
          && getComputedStyle(stageNavigation).display !== "none"
          && stageRect
          && stageRect.width > 0
          && stageRect.height > 0
        ),
        rect: stageRect ? {
          x: Math.round(stageRect.x * 100) / 100,
          y: Math.round(stageRect.y * 100) / 100,
          width: Math.round(stageRect.width * 100) / 100,
          height: Math.round(stageRect.height * 100) / 100,
        } : null,
      },
      stickyFooter: {
        visible: Boolean(
          footer
          && getComputedStyle(footer).display !== "none"
          && footerRect
          && footerRect.width > 0
          && footerRect.height > 0
        ),
        rect: footerRect ? {
          x: Math.round(footerRect.x * 100) / 100,
          y: Math.round(footerRect.y * 100) / 100,
          width: Math.round(footerRect.width * 100) / 100,
          height: Math.round(footerRect.height * 100) / 100,
        } : null,
      },
    };
  });
}

async function collectSelectedResult(page: Page): Promise<Record<string, unknown>> {
  const resultPane = page.locator('[data-authoring-pane="result"]');
  const resultKind = await resultPane
    .locator("[data-authoring-result-kind]")
    .getAttribute("data-authoring-result-kind");
  const preflight = resultPane.getByTestId("ta-authoring-preflight");
  const preflightCount = Number(await preflight.getAttribute("data-count"));
  const preflightSummary = (await preflight.locator("summary").first().innerText()).trim();
  const lossReasons = await preflight.locator("li").evaluateAll((elements) => (
    elements.map((element) => element.textContent?.trim() ?? "").filter(Boolean)
  ));
  const rows = await resultPane
    .getByTestId("ta-authoring-artifact-row")
    .evaluateAll((elements) => elements.map((element) => {
      const fields = [...element.querySelectorAll<HTMLElement>(
        "[data-authoring-preview-field]",
      )].map((field) => ({
        key: field.dataset.authoringPreviewField ?? "",
        label: field.querySelector("dt")?.textContent?.trim() ?? "",
        value: field.querySelector("dd")?.textContent?.trim() ?? "",
      }));
      const links = [...element.querySelectorAll<HTMLAnchorElement>(
        '[data-testid="ta-authoring-preview-links"] a',
      )].map((link) => ({
        kind: link.closest<HTMLElement>("[data-link-kind]")?.dataset.linkKind ?? "",
        href: link.href,
        text: link.textContent?.trim() ?? "",
      }));
      const sheetCells = [...element.querySelectorAll<HTMLElement>(
        "[data-authoring-sheet-cell]",
      )].map((cell) => ({
        key: cell.dataset.authoringSheetCell ?? "",
        value: cell.textContent?.trim() ?? "",
        links: [...cell.querySelectorAll<HTMLAnchorElement>("a")].map((link) => link.href),
      }));
      return {
        rowId: element.getAttribute("data-item-id") ?? "",
        artifactKind: element.getAttribute("data-artifact-kind") ?? "",
        sourceChecked: element.getAttribute("data-source-checked"),
        title: element.querySelector("h3")?.textContent?.trim() ?? "",
        fields,
        links,
        sheetCells,
      };
    }));
  const sheetColumns = await resultPane
    .locator("[data-authoring-sheet-column]")
    .evaluateAll((elements) => elements.map((element) => ({
      key: (element as HTMLElement).dataset.authoringSheetColumn ?? "",
      label: element.textContent?.trim() ?? "",
    })));
  const previewTitle = (await resultPane
    .locator("#ta-authoring-artifact-preview-title")
    .innerText()).trim();
  const previewCountMatch = previewTitle.match(/(\d+)/u);
  return {
    kind: resultKind,
    rowIds: rows.map((row) => row.rowId),
    rowCount: rows.length,
    advertisedCount: previewCountMatch ? Number(previewCountMatch[1]) : null,
    preflightCount,
    preflightSummary,
    rows,
    sheetColumns,
    lossReasons,
    lossCountShown: lossReasons.length,
    detailFieldCount: rows.reduce((sum, row) => sum + row.fields.length, 0),
    linkCount: rows.reduce(
      (sum, row) => sum + row.links.length
        + row.sheetCells.reduce((cellSum, cell) => cellSum + cell.links.length, 0),
      0,
    ),
  };
}

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function surfaceFailures(
  evidence: Omit<SurfaceEvidence, "passed" | "failures">,
  expectedItems: number,
): string[] {
  const failures: string[] = [];
  const source = evidence.source as {
    exampleId?: string;
    rawTextSha256?: string;
  };
  const structure = evidence.structure as {
    itemCount: number;
    itemIds: string[];
    stepIds: string[];
  };
  const selectedResult = evidence.selectedResult as {
    rowCount: number;
    advertisedCount: number;
    preflightCount: number;
    rowIds: string[];
  };
  if (!source.rawTextSha256) failures.push("source fingerprint missing");
  if (structure.itemCount !== expectedItems) {
    failures.push(`item count ${structure.itemCount} != ${expectedItems}`);
  }
  if (!unique(structure.itemIds) || !unique(structure.stepIds)) {
    failures.push("Step or Item IDs are not unique");
  }
  if (evidence.resultSlots.length !== 4) failures.push("result slot count is not four");
  if (!sameJson(
    evidence.resultSlots.map((slot) => slot.kind),
    EXPECTED_SLOT_ORDER,
  )) failures.push("result slot order drifted");
  if (evidence.resultSlots.filter((slot) => slot.selected).length !== 1) {
    failures.push("exactly one result slot is not selected");
  }
  if (selectedResult.rowCount !== selectedResult.advertisedCount) {
    failures.push("rendered result row count differs from advertised count");
  }
  if (selectedResult.rowCount !== selectedResult.preflightCount) {
    failures.push("result row count differs from preflight count");
  }
  if (!unique(selectedResult.rowIds)) failures.push("result row IDs are not unique");

  const stages = (evidence.reachability as {
    stages: Array<{
      stage: string;
      reachedEnd: boolean;
      targetVisible: boolean;
      overlapsFooter: boolean;
      pageOverflow: { horizontalOverflow: boolean };
      action: { visible: boolean; enabled: boolean } | null;
    }>;
  }).stages;
  for (const stage of stages) {
    if (!stage.reachedEnd) failures.push(`${stage.stage} did not reach scroll end`);
    if (!stage.targetVisible) failures.push(`${stage.stage} last target is not visible`);
    if (stage.overlapsFooter) failures.push(`${stage.stage} last target overlaps footer`);
    if (stage.pageOverflow.horizontalOverflow) {
      failures.push(`${stage.stage} creates document horizontal overflow`);
    }
    if (stage.action && (!stage.action.visible || !stage.action.enabled)) {
      failures.push(`${stage.stage} primary/save action is not reachable and enabled`);
    }
  }
  const runtime = evidence.runtime;
  if (runtime.consoleErrors.length > 0) failures.push("console errors recorded");
  if (runtime.pageErrors.length > 0) failures.push("page errors recorded");
  if (runtime.failedRequests.length > 0) failures.push("failed requests recorded");
  if (runtime.badResponses.length > 0) failures.push("HTTP error responses recorded");
  if (runtime.externalRequests.length > 0) failures.push("external requests recorded");
  if (runtime.replacementCharacters > 0) failures.push("replacement characters recorded");
  return failures;
}

async function inspectProductSurface(
  page: Page,
  runtimeByKey: Map<string, RuntimeEvidence>,
  activeKey: { value: string },
  definition: MatrixCaseDefinition,
  target: "route" | "standalone",
): Promise<SurfaceEvidence> {
  const url = target === "route" ? ROUTE_URL : STANDALONE_URL;
  const runtimeKey = `${definition.id}:${target}`;
  activeKey.value = runtimeKey;
  runtimeByKey.set(runtimeKey, emptyRuntimeEvidence());
  await resetProductPage(page, url, definition.viewport);

  const select = page.getByTestId("ta-authoring-example-select");
  const desiredValue = `product:${definition.exampleId}`;
  if (await select.inputValue() !== desiredValue) {
    await select.selectOption(desiredValue);
  }
  await page.waitForFunction(
    (value) => (
      (document.querySelector('[data-testid="ta-authoring-example-select"]') as HTMLSelectElement | null)?.value
        === value
    ),
    desiredValue,
  );
  await page.waitForTimeout(80);

  const { source, flow } = await collectSourceAndFlow(page);
  const structure = await collectStructure(page, definition.viewport);
  const resultSlots = await collectResultSlots(page, definition.viewport);
  const selectedResult = await collectSelectedResult(page);
  const responsiveLayout = await collectResponsiveLayout(page);

  const stageReachability: Array<Record<string, unknown>> = [];
  for (const stage of ["input", "structure", "result"] as const) {
    stageReachability.push(
      await scrollStageToActualEnd(page, stage, definition.viewport),
    );
  }
  await activateStage(page, "result", definition.viewport);
  const resultScroller = page
    .locator('[data-authoring-pane="result"] [data-authoring-pane-scroll]')
    .first();
  await resultScroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.waitForTimeout(40);

  const screenshotPath = join(
    SCREENSHOT_DIR,
    `${definition.id}-${target}-${definition.exampleId}-${viewportLabel(definition.viewport)}.png`,
  );
  await page.screenshot({ path: screenshotPath });

  const runtime = runtimeByKey.get(runtimeKey) ?? emptyRuntimeEvidence();
  const bodyText = await page.locator("body").innerText();
  runtime.replacementCharacters = [...bodyText]
    .filter((character) => character === "\uFFFD").length;
  runtime.externalRequests = [...new Set(runtime.externalRequests)];
  runtime.badResponses = [...new Set(runtime.badResponses)];

  const withoutPass = {
    target,
    url,
    source,
    flow,
    structure,
    responsiveLayout,
    resultSlots,
    selectedResult,
    reachability: {
      stages: stageReachability,
      actualResultLastTarget: "visible additional-check summary",
      actualSaveBehavior: definition.viewport.width >= 1280
        ? "desktop save button"
        : "sticky footer save button",
    },
    runtime,
    screenshot: outputRelative(screenshotPath),
  } satisfies Omit<SurfaceEvidence, "passed" | "failures">;
  const expectedItems = EXAMPLES.find((example) => example.id === definition.exampleId)!
    .expectedItems;
  const failures = surfaceFailures(withoutPass, expectedItems);
  return {
    ...withoutPass,
    passed: failures.length === 0,
    failures,
  };
}

function semanticSurface(evidence: SurfaceEvidence): Record<string, unknown> {
  return {
    source: evidence.source,
    flow: evidence.flow,
    structure: evidence.structure,
    resultSlots: evidence.resultSlots.map((slot) => ({
      index: slot.index,
      kind: slot.kind,
      eligible: slot.eligible,
      selected: slot.selected,
      recommended: slot.recommended,
      disabled: slot.disabled,
    })),
    selectedResult: evidence.selectedResult,
  };
}

function layoutSurface(evidence: SurfaceEvidence): Record<string, unknown> {
  return {
    responsiveLayout: evidence.responsiveLayout,
    resultSlotGeometry: geometrySignature(evidence),
  };
}

function semanticParity(
  route: SurfaceEvidence,
  standalone: SurfaceEvidence,
): Record<string, unknown> {
  const routeValue = semanticSurface(route);
  const standaloneValue = semanticSurface(standalone);
  const comparedFields = Object.keys(routeValue);
  const differingFields = comparedFields.filter((field) => !sameJson(
    routeValue[field],
    standaloneValue[field],
  ));
  return {
    comparedFields,
    differingFields,
    equal: differingFields.length === 0,
  };
}

function geometrySignature(evidence: SurfaceEvidence): unknown {
  return evidence.resultSlots.map((slot) => {
    const geometry = slot.geometry as RectEvidence;
    return {
      kind: slot.kind,
      x: geometry.x,
      y: geometry.y,
      width: geometry.width,
      height: geometry.height,
    };
  });
}

function claudeVisibleStructure(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(String.raw`(() => {
    const visible = (element) => {
      const value = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== "none"
        && style.visibility !== "hidden"
        && value.width > 0
        && value.height > 0
        && value.bottom > 0
        && value.top < window.innerHeight;
    };
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return {
        x: Math.round(value.x * 100) / 100,
        y: Math.round(value.y * 100) / 100,
        width: Math.round(value.width * 100) / 100,
        height: Math.round(value.height * 100) / 100,
      };
    };
    const landmarks = [...document.querySelectorAll(
      "header, nav, main, aside, [role=dialog], dialog"
    )].filter(visible).map((element) => ({
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role"),
      ariaLabel: element.getAttribute("aria-label"),
      text: (element.textContent || "").replace(/\s+/gu, " ").trim().slice(0, 120),
      rect: rect(element),
    }));
    const controls = [...document.querySelectorAll(
      'button, [role="tab"], select, summary'
    )].filter(visible).map((element) => ({
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role"),
      text: (element.textContent || "").replace(/\s+/gu, " ").trim().slice(0, 100),
      ariaLabel: element.getAttribute("aria-label"),
      ariaPressed: element.getAttribute("aria-pressed"),
      ariaSelected: element.getAttribute("aria-selected"),
      rect: rect(element),
    }));
    const root = document.querySelector("#root") || document.body;
    const largestRootRegions = [...root.children]
      .filter(visible)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === "string"
          ? element.className.slice(0, 160)
          : "",
        text: (element.textContent || "").replace(/\s+/gu, " ").trim().slice(0, 120),
        rect: rect(element),
      }))
      .sort((left, right) => (
        right.rect.width * right.rect.height - left.rect.width * left.rect.height
      ))
      .slice(0, 12);
    const resultRailCandidates = controls.filter((control) => (
      /^(?:calendar|todo|sheet|memo|캘린더|체크\/할 일|표\/엑셀|텍스트)(?:\s|\d|$)/iu
        .test(control.text)
    ));
    const stageCandidates = controls.filter((control) => (
      control.role === "tab"
      || /01|02|03|input|structure|result|입력|구조|결과/iu.test(
        control.text + " " + (control.ariaLabel || "")
      )
    ));
    const helpCandidates = controls.filter((control) => (
      /help|syntax|문법|도움|\?/iu.test(
        control.text + " " + (control.ariaLabel || "")
      )
    ));
    return {
      document: {
        title: document.title,
        lang: document.documentElement.lang,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        horizontalOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      },
      visibleLandmarks: landmarks,
      largestRootRegions,
      visibleControlCount: controls.length,
      stageCandidates,
      resultRailCandidates,
      helpCandidates,
      visibleDialogCount: landmarks.filter((item) => (
        item.role === "dialog" || item.tag === "dialog"
      )).length,
    };
  })()`) as Promise<Record<string, unknown>>;
}

async function captureClaudeStructureReference(
  page: Page,
  runtimeByKey: Map<string, RuntimeEvidence>,
  activeKey: { value: string },
  claudeRoot: string,
  claudeZip: string,
  productCases: Array<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  const htmlFiles = walkFiles(claudeRoot).filter((file) => (
    file.toLowerCase().endsWith(".dc.html")
  ));
  requireCondition(htmlFiles.length === 1, "Expected one Claude .dc.html", htmlFiles);
  const htmlRelative = normalizedPath(relative(claudeRoot, htmlFiles[0]));
  const claudeUrl = `${STATIC_ORIGIN}/claude/${htmlRelative
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const captures: Array<Record<string, unknown>> = [];

  for (const viewport of VIEWPORTS) {
    const key = `claude:${viewportLabel(viewport)}`;
    activeKey.value = key;
    runtimeByKey.set(key, emptyRuntimeEvidence());
    await page.setViewportSize(viewport);
    await page.goto(claudeUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(150);
    const screenshotPath = join(
      SCREENSHOT_DIR,
      `claude-structure-${viewportLabel(viewport)}.png`,
    );
    await page.screenshot({ path: screenshotPath });
    const structure = await claudeVisibleStructure(page);

    let resultStageInteraction: Record<string, unknown> = {
      controlFound: false,
      structure: null,
    };
    const resultControls = page.locator("button").filter({ hasText: /03\s*결과/u });
    for (let index = 0; index < await resultControls.count(); index += 1) {
      const control = resultControls.nth(index);
      if (!await control.isVisible()) continue;
      await control.click();
      await page.waitForTimeout(80);
      resultStageInteraction = {
        controlFound: true,
        controlText: (await control.innerText()).trim(),
        structure: await claudeVisibleStructure(page),
      };
      break;
    }

    let helpDisclosure: Record<string, unknown> = {
      triggerFound: false,
      openStructure: null,
    };
    const helpControls = page.locator("button").filter({ hasText: /문법/u });
    for (let index = 0; index < await helpControls.count(); index += 1) {
      const control = helpControls.nth(index);
      if (!await control.isVisible()) continue;
      await control.click();
      await page.waitForTimeout(80);
      helpDisclosure = {
        triggerFound: true,
        triggerText: (await control.innerText()).trim(),
        openStructure: await claudeVisibleStructure(page),
      };
      await page.keyboard.press("Escape");
      break;
    }

    const bodyText = await page.locator("body").innerText();
    const runtime = runtimeByKey.get(key) ?? emptyRuntimeEvidence();
    runtime.replacementCharacters = [...bodyText]
      .filter((character) => character === "\uFFFD").length;
    runtime.externalRequests = [...new Set(runtime.externalRequests)];
    runtime.badResponses = [...new Set(runtime.badResponses)];
    captures.push({
      viewport: viewportLabel(viewport),
      structure,
      resultStageInteraction,
      helpDisclosure,
      runtime,
      screenshot: outputRelative(screenshotPath),
    });
  }

  const structureComparison = captures.map((capture) => {
    const productCase = productCases.find((entry) => (
      entry.exampleId === "simple" && entry.viewport === capture.viewport
    ));
    requireCondition(productCase, `Missing product structure case for ${capture.viewport}`);
    const route = productCase.route as SurfaceEvidence;
    const resultInteraction = capture.resultStageInteraction as {
      controlFound: boolean;
      structure: null | {
        resultRailCandidates?: unknown[];
        stageCandidates?: unknown[];
      };
    };
    const initialStructure = capture.structure as {
      document: { horizontalOverflow: boolean };
      resultRailCandidates: unknown[];
      stageCandidates: unknown[];
      helpCandidates: unknown[];
    };
    return {
      viewport: capture.viewport,
      comparisonAxes: [
        "region layout",
        "mobile stage controls",
        "result rail visibility",
        "help disclosure boundary",
        "viewport overflow",
      ],
      product: {
        sourceCase: productCase.id,
        layout: route.responsiveLayout,
        resultSlots: route.resultSlots.map((slot) => ({
          kind: slot.kind,
          geometry: slot.geometry,
          eligible: slot.eligible,
          selected: slot.selected,
        })),
        screenshot: route.screenshot,
      },
      claude: {
        initialStageControlCount: initialStructure.stageCandidates.length,
        initialResultRailCandidateCount: initialStructure.resultRailCandidates.length,
        resultStageControlFound: resultInteraction.controlFound,
        resultStageRailCandidateCount:
          resultInteraction.structure?.resultRailCandidates?.length ?? null,
        resultStageCandidateCount:
          resultInteraction.structure?.stageCandidates?.length ?? null,
        helpCandidateCount: initialStructure.helpCandidates.length,
        helpDisclosure: capture.helpDisclosure,
        horizontalOverflow: initialStructure.document.horizontalOverflow,
        screenshot: capture.screenshot,
      },
      semanticParityCompared: false,
      interpretation:
        "Only visible hierarchy and interaction boundaries are compared; product data semantics remain authoritative.",
    };
  });

  return {
    schemaVersion: "flowme-claude-structure-reference-v1",
    capturedAt: new Date().toISOString(),
    source: {
      zip: normalizedPath(claudeZip),
      zipSha256: sha256(readFileSync(claudeZip)),
      extractedToTemporaryDirectory: true,
      originalModified: false,
      htmlEntry: htmlRelative,
    },
    comparisonContract: {
      scope: [
        "desktop region proportions",
        "mobile input-structure-result stage controls",
        "fixed result rail placement",
        "help and dialog disclosure boundaries",
      ],
      excluded: [
        "parser behavior",
        "canonical IDs",
        "Item or row count parity",
        "route or standalone semantic parity",
      ],
      semanticParityClaimed: false,
      note: "Claude Design is captured only as a structural reference, never as product truth.",
    },
    structureComparison,
    browser: {
      engine: "Chromium",
      version: await page.context().browser()?.version(),
    },
    viewports: captures,
  };
}

async function closeServer(server: Server | null): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolvePromise) => {
    server.close(() => resolvePromise());
  });
}

async function main(): Promise<void> {
  requireCondition(
    existsSync(join(REPO_ROOT, ".next", "BUILD_ID")),
    "Production build is missing. Run npm.cmd run build first.",
  );
  requireCondition(
    existsSync(STANDALONE_PATH),
    "Standalone HTML is missing. Run npm.cmd run build:text-authoring-html first.",
  );
  requireCondition(
    existsSync(CHROMIUM_EXECUTABLE),
    `Chromium executable is missing: ${CHROMIUM_EXECUTABLE}`,
  );
  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const claudeZip = locateClaudeZip();
  const claudeRoot = extractClaudeZip(claudeZip);
  let nextServer: ChildProcess | null = null;
  let staticServer: Server | null = null;
  const runtimeByKey = new Map<string, RuntimeEvidence>();
  const activeKey = { value: "startup" };
  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE,
    headless: true,
  });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("flow:text-authoring:")) localStorage.removeItem(key);
    }
  });
  attachRuntimeRecorder(
    page,
    runtimeByKey,
    activeKey,
    new Set([ROUTE_ORIGIN, STATIC_ORIGIN]),
  );

  try {
    nextServer = startNextServer();
    staticServer = await startStaticServer(claudeRoot);
    await waitForUrl(ROUTE_URL);
    await waitForUrl(STANDALONE_URL);

    const ensureRouteServer = async (forceRestart = false): Promise<void> => {
      if (!forceRestart && await reachable(ROUTE_URL)) return;
      if (nextServer && !nextServer.killed) nextServer.kill();
      await sleep(200);
      nextServer = startNextServer();
      await waitForUrl(ROUTE_URL);
    };

    const cases: Array<Record<string, unknown>> = [];
    for (const definition of MATRIX_CASES) {
      await ensureRouteServer();
      let route: SurfaceEvidence;
      try {
        route = await inspectProductSurface(
          page,
          runtimeByKey,
          activeKey,
          definition,
          "route",
        );
      } catch (error) {
        if (!String(error).includes("ERR_CONNECTION_REFUSED")) throw error;
        await ensureRouteServer(true);
        route = await inspectProductSurface(
          page,
          runtimeByKey,
          activeKey,
          definition,
          "route",
        );
      }
      const standalone = await inspectProductSurface(
        page,
        runtimeByKey,
        activeKey,
        definition,
        "standalone",
      );
      const parity = semanticParity(route, standalone);
      cases.push({
        id: definition.id,
        exampleId: definition.exampleId,
        viewport: viewportLabel(definition.viewport),
        route,
        standalone,
        semanticParity: parity,
        responsiveLayoutParity: {
          equal: sameJson(layoutSurface(route), layoutSurface(standalone)),
        },
        fixedSlotGeometry: {
          route: null,
          standalone: null,
          routeStandaloneSame: sameJson(
            geometrySignature(route),
            geometrySignature(standalone),
          ),
        },
        passed: false,
        failures: [],
      });
      process.stdout.write(`${definition.id} captured\n`);
    }

    for (const target of ["route", "standalone"] as const) {
      for (const viewport of VIEWPORTS) {
        const viewportCases = cases.filter((entry) => (
          entry.viewport === viewportLabel(viewport)
        ));
        const baseline = geometrySignature(
          viewportCases[0][target] as SurfaceEvidence,
        );
        for (const entry of viewportCases) {
          const fixed = sameJson(
            geometrySignature(entry[target] as SurfaceEvidence),
            baseline,
          );
          (entry.fixedSlotGeometry as Record<string, unknown>)[target] = fixed;
        }
      }
    }

    for (const entry of cases) {
      const failures: string[] = [];
      if (!(entry.route as SurfaceEvidence).passed) {
        failures.push(...(entry.route as SurfaceEvidence).failures.map(
          (failure) => `route: ${failure}`,
        ));
      }
      if (!(entry.standalone as SurfaceEvidence).passed) {
        failures.push(...(entry.standalone as SurfaceEvidence).failures.map(
          (failure) => `standalone: ${failure}`,
        ));
      }
      if (!(entry.semanticParity as { equal: boolean }).equal) {
        failures.push("route/standalone semantic parity failed");
      }
      if (!(entry.responsiveLayoutParity as { equal: boolean }).equal) {
        failures.push("route/standalone responsive layout parity failed");
      }
      if (!Object.values(entry.fixedSlotGeometry as Record<string, unknown>)
        .every((value) => value === true)) {
        failures.push("fixed four-slot geometry parity failed");
      }
      entry.failures = failures;
      entry.passed = failures.length === 0;
    }

    const passedCases = cases.filter((entry) => entry.passed).length;
    const matrix = {
      schemaVersion: "flowme-text-authoring-round2-visual-behavior-v1",
      executedAt: new Date().toISOString(),
      execution: {
        browser: { engine: "Chromium", version: browser.version() },
        browserExecutable: CHROMIUM_EXECUTABLE,
        routeUrl: ROUTE_URL,
        standaloneUrl: STANDALONE_URL,
        routePort: 3127,
        staticPort: 4191,
        realBrowserExecution: true,
        observedUserValidation: false,
        commands: [
          "npm.cmd run build",
          "npm.cmd run build:text-authoring-html",
          "npm.cmd run capture:text-authoring-round2",
        ],
      },
      contract: {
        examples: EXAMPLES.map((example) => example.id),
        viewports: VIEWPORTS.map(viewportLabel),
        surfaces: ["route", "standalone"],
        requiredCaseIds: MATRIX_CASES.map((entry) => entry.id),
        commonFields: [
          "source fingerprint and example ID",
          "Flow title, Step and Item IDs/count",
          "fixed four-slot geometry and state",
          "selected result row IDs/count/detail/links/loss",
          "actual last visible content, save behavior, overflow, footer overlap",
          "route/standalone semantic parity",
          "console/page/request/replacement/external request evidence",
        ],
      },
      summary: {
        passed: passedCases,
        total: cases.length,
        status: passedCases === cases.length ? "PASS" : "FAIL",
        screenshotCount: cases.length * 2,
      },
      cases,
    };
    writeFileSync(MATRIX_PATH, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");

    const claudeReference = await captureClaudeStructureReference(
      page,
      runtimeByKey,
      activeKey,
      claudeRoot,
      claudeZip,
      cases,
    );
    writeFileSync(
      CLAUDE_PATH,
      `${JSON.stringify(claudeReference, null, 2)}\n`,
      "utf8",
    );

    console.log(JSON.stringify({
      matrix: outputRelative(MATRIX_PATH),
      claudeReference: outputRelative(CLAUDE_PATH),
      passed: passedCases,
      total: cases.length,
      productScreenshots: cases.length * 2,
      claudeScreenshots: VIEWPORTS.length,
      browser: browser.version(),
    }, null, 2));
    if (passedCases !== cases.length) process.exitCode = 1;
  } finally {
    await browser.close();
    await closeServer(staticServer);
    if (nextServer && !nextServer.killed) nextServer.kill();
    const resolvedTemp = resolve(claudeRoot);
    const resolvedSystemTemp = resolve(tmpdir());
    if (
      resolvedTemp.startsWith(`${resolvedSystemTemp}${sep}`)
      && resolvedTemp.includes("flowme-claude-round2-")
    ) {
      rmSync(resolvedTemp, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
