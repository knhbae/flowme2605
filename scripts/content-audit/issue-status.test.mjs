import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";

const htmlUrl = "file:///D:/flowme2605/flow-mvp/docs/content-audit/2026-05-31-online-source-catalog-200.html";

test("catalog cards persist issue status separately from memo text", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(htmlUrl);
    await page.waitForSelector(".card");

    await page.locator('.issue-status-input[data-value="issue"]').first().check();

    const state = await page.evaluate(() => ({
      controls: document.querySelectorAll(".issue-status-control").length,
      checked: document.querySelector(".issue-status-input:checked")?.getAttribute("data-value"),
      saved: JSON.parse(localStorage.getItem("flowme-source-catalog-200-issue-status-v1") || "{}"),
      hint: document.getElementById("memoHint")?.textContent,
    }));

    assert.equal(state.controls, 200);
    assert.equal(state.checked, "issue");
    assert.equal(Object.values(state.saved)[0], "issue");
    assert.match(state.hint || "", /검토 상태 1개/);
  } finally {
    await browser.close();
  }
});
