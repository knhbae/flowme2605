import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const catalog = JSON.parse(
  fs.readFileSync("docs/content-audit/original-source-review/2026-05-31-creator-flow-source-catalog.json", "utf8"),
);

test("creator flow catalog has source-backed candidates", () => {
  assert.equal(catalog.candidates.length >= 50, true);
  for (const row of catalog.candidates) {
    assert.match(row.id, /^C\d{3}$/);
    assert.match(row.sourceUrl, /^https?:\/\//);
    assert.ok(row.originalSummary.length > 30, `${row.id} needs source summary`);
    assert.ok(row.creatorShareReason.length > 20, `${row.id} needs creator reason`);
    assert.ok(row.flowContent.inputs.length <= 4, `${row.id} should keep inputs simple`);
    assert.equal(row.flowContent.actions.length <= 5, true, `${row.id} should keep visible actions compact`);
    assert.ok(row.flowContent.completion.length > 15, `${row.id} needs completion signal`);
    assert.ok(row.exampleFlow, `${row.id} needs source-backed example flow content`);
    assert.ok(row.exampleFlow.sourceBasis.length >= 2, `${row.id} needs source basis for example flow`);
    assert.equal(row.exampleFlow.visibleItems.length, row.flowContent.actions.length, `${row.id} should convert each action into an example item`);
    for (const item of row.exampleFlow.visibleItems) {
      assert.ok(item.when && item.type && item.title && item.visibleIn, `${row.id} example item needs calendar/checklist shape`);
      assert.ok(item.detailMemo.includes("원문 근거"), `${row.id} example item should cite source basis`);
      assert.ok(item.completionSignal.length > 10, `${row.id} example item needs completion signal`);
    }
  }
});

test("creator flow catalog covers creator and lifestyle execution categories", () => {
  const ids = new Set(catalog.candidates.map((row) => row.id));
  for (const id of ["C033", "C034", "C036", "C037", "C039", "C040", "C042", "C045", "C049", "C050"]) {
    assert.equal(ids.has(id), true, `${id} should remain in the creator/lifestyle coverage set`);
  }
});

test("creator flow catalog exposes product-level fit findings", () => {
  assert.equal(catalog.insights.length, 4);
  assert.ok(catalog.insights.some((row) => row.title === "반복/챌린지 Flow" && row.count >= 30));
  assert.ok(catalog.weakFitSignals.length >= 4);
});

test("creator candidates keep source evidence boundaries", () => {
  const evidenceRows = catalog.candidates.filter((row) => row.sourceEvidence);
  assert.equal(evidenceRows.length, catalog.candidates.length);
  for (const row of evidenceRows) {
    assert.ok(["source_checked", "source_summary"].includes(row.sourceEvidence.evidenceLevel), `${row.id} needs evidence level`);
    assert.ok(row.sourceEvidence.sourceSignals.length >= 3, `${row.id} needs concrete source signals`);
    assert.ok(row.sourceEvidence.flowBoundary.length > 30, `${row.id} needs conversion boundary`);
  }
  assert.equal(
    evidenceRows.every((row) => row.sourceEvidence.evidenceLevel === "source_checked"),
    true,
    "all creator candidates should be checked against original sources before demo seeding",
  );
  for (const id of [
    "C001",
    "C002",
    "C003",
    "C004",
    "C005",
    "C009",
    "C010",
    "C011",
    "C012",
    "C014",
    "C015",
    "C018",
    "C020",
    "C021",
    "C026",
    "C033",
    "C036",
    "C037",
    "C039",
    "C040",
    "C042",
    "C043",
    "C045",
    "C049",
    "C050",
  ]) {
    const row = catalog.candidates.find((candidate) => candidate.id === id);
    assert.equal(row?.sourceEvidence?.evidenceLevel, "source_checked", `${id} should remain source checked`);
  }
});

test("creator flow scoring is weighted and ranked", () => {
  const expectedWeights = {
    creatorShareIntent: 25,
    executableSequence: 25,
    repeatOrCohortUse: 20,
    audiencePortability: 15,
    sourceRiskBoundary: 10,
    inputSimplicity: 5,
  };
  assert.deepEqual(catalog.weights, expectedWeights);

  const rows = catalog.candidates;
  assert.equal(rows.some((row) => row.verdict === "P0 제작자 Flow"), true);
  for (let index = 0; index < rows.length; index += 1) {
    assert.equal(rows[index].rank, index + 1);
    if (index > 0) assert.equal(rows[index - 1].score >= rows[index].score, true);
  }
});

test("creator flow catalog renders html and markdown artifacts", () => {
  const html = fs.readFileSync("docs/content-audit/2026-05-31-creator-flow-source-catalog.html", "utf8");
  const md = fs.readFileSync("docs/content-audit/2026-05-31-creator-flow-source-catalog.md", "utf8");
  assert.match(html, /예시 Flow 콘텐츠/);
  assert.match(html, /제작자 공유형 Flow 후보 카탈로그/);
  assert.match(html, /제작자 Flow 유형 요약/);
  assert.match(html, /약한 후보 신호/);
  assert.match(html, /원문 근거/);
  assert.match(html, /Flow화/);
  assert.match(md, /제작자 공유형 Flow 후보 카탈로그/);
  assert.match(md, /제작자 Flow 유형 요약/);
  assert.match(md, /제작자 공유 이유/);
});
