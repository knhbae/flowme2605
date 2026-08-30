import { defineConfig, devices } from "@playwright/test";

const port = Number.parseInt(
  process.env.FLOWME_KEYBOARD_PROPERTY_TRAY_RELIABILITY_POC_PORT ?? "4377",
  10,
);

const artifact =
  "/docs/content-audit/2026-08-29-flowme-text-authoring-keyboard-property-tray-reliability-poc-results/flowme-text-authoring-keyboard-property-tray-reliability-poc.html";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "text-authoring-keyboard-property-tray-reliability-poc.spec.ts",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1,
  reporter: "list",
  outputDir: "output/playwright/keyboard-property-tray-reliability-poc",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ??
        (process.platform === "win32"
          ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
          : undefined),
    },
  },
  webServer: {
    command: `python -m http.server ${port} --bind 127.0.0.1 --directory .`,
    url: `http://127.0.0.1:${port}${artifact}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
