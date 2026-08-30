import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repositoryRoot = process.cwd();
const artifactPath = path.join(
  repositoryRoot,
  "docs",
  "content-audit",
  "2026-08-30-flowme-text-authoring-unified-editor-guidance-poc-results",
  "flowme-text-authoring-unified-editor-guidance-poc.html",
);
const artifactUrl = pathToFileURL(artifactPath).href;

process.env.FLOWME_UNIFIED_EDITOR_GUIDANCE_POC_ARTIFACT ??= artifactUrl;
process.env.FLOWME_PROPERTY_REENTRY_SIMPLICITY_POC_ARTIFACT ??= artifactUrl;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: [
    "text-authoring-unified-editor-guidance-poc.spec.ts",
    "text-authoring-property-reentry-simplicity-poc.spec.ts",
  ],
  timeout: 120_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  outputDir: "output/playwright/text-authoring-unified-editor-guidance-poc",
  use: {
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
        ?? (process.platform === "win32"
          ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
          : undefined),
    },
  },
});
