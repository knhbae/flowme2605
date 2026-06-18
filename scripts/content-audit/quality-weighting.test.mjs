import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const reviewPath = "docs/content-audit/original-source-review/2026-05-31-original-source-review-queue.json";
const reviews = JSON.parse(fs.readFileSync(reviewPath, "utf8"));

const expectedWeights = {
  sourceFidelity: 25,
  executionTransfer: 25,
  demandRepeatImpact: 20,
  inputSimplicity: 15,
  flowmeDifferentiation: 10,
  sensitivityRisk: 5,
};

test("real flow quality uses weighted product-fit dimensions", () => {
  for (const row of reviews) {
    const quality = row.realFlowDraft?.quality;
    assert.ok(quality, `${row.id} missing quality`);
    assert.deepEqual(quality.weights, expectedWeights, `${row.id} has stale quality weights`);
    assert.deepEqual(Object.keys(quality.scores), Object.keys(expectedWeights), `${row.id} has stale score dimensions`);
    assert.equal(quality.weightedScore, quality.average, `${row.id} should expose weighted score as average`);
  }
});

test("unverified source extraction is penalized more than sensitivity risk", () => {
  const sourceText = reviews.find((row) => row.realFlowDraft?.sourceVerification?.level === "source_text");
  const searchIndex = reviews.find((row) => row.realFlowDraft?.sourceVerification?.level === "search_index_only");

  assert.ok(sourceText, "need a source-text sample");
  assert.ok(searchIndex, "need a search-index sample");

  assert.equal(sourceText.realFlowDraft.quality.scores.sourceFidelity >= 4, true);
  assert.equal(searchIndex.realFlowDraft.quality.scores.sourceFidelity <= 2, true);
  assert.equal(searchIndex.realFlowDraft.quality.weights.sensitivityRisk, 5);
  assert.equal(searchIndex.realFlowDraft.quality.weights.sourceFidelity, 25);
});

test("priority labels are capped so P0 remains a real shortlist", () => {
  const p0 = reviews.filter((row) => row.realFlowDraft?.quality?.priority === "P0");
  const recheck = reviews.filter((row) => row.realFlowDraft?.sourceVerification?.level !== "source_text");

  assert.equal(p0.length <= 30, true, "P0 should be a shortlist, not most of the catalog");
  assert.equal(p0.every((row) => row.realFlowDraft.quality.label === "P0 Flow 적합"), true);
  assert.equal(recheck.every((row) => row.realFlowDraft.quality.priority === "RECHECK"), true);
});

test("fit scores are nuanced enough to support ranking", () => {
  const fitRows = reviews.filter((row) => row.realFlowDraft?.flowFit?.level === "fit");
  const scores = [...new Set(fitRows.map((row) => row.realFlowDraft.quality.average))];
  const ranked = fitRows
    .slice()
    .sort((a, b) => a.realFlowDraft.quality.rank - b.realFlowDraft.quality.rank);

  assert.equal(scores.length >= 3, true, "fit rows should not all collapse into one score bucket");
  assert.equal(ranked.every((row, index) => row.realFlowDraft.quality.rank === index + 1), true);
  assert.equal(ranked[0].realFlowDraft.quality.average >= ranked.at(-1).realFlowDraft.quality.average, true);
});
