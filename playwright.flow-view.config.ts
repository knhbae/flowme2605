import { defineConfig, devices } from "@playwright/test";

const requestedPort = Number.parseInt(
  process.env.FLOWME_FLOW_VIEW_POC_PORT ?? "4178",
  10,
);
const port = Number.isFinite(requestedPort) ? requestedPort : 4178;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: [
    "text-authoring-flow-view-poc.spec.ts",
    "text-authoring-flow-view-catalog.spec.ts",
    "text-authoring-flow-view-hierarchy.spec.ts",
  ],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: 0,
  reporter: "list",
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
    command:
      "npm run build:text-authoring-flow-view-poc && npm run serve:text-authoring-flow-view-poc",
    url: `http://127.0.0.1:${port}/health`,
    reuseExistingServer: true,
    timeout: 90_000,
  },
});
