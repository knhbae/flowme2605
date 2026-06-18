import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const reviews = JSON.parse(
  fs.readFileSync("docs/content-audit/original-source-review/2026-05-31-original-source-review-queue.json", "utf8"),
);

const byId = new Map(reviews.map((row) => [row.id, row]));

test("strict Flow fit classification exists for every catalog row", () => {
  for (const row of reviews) {
    const fit = row.realFlowDraft?.flowFit;
    assert.ok(fit, `${row.id} missing flowFit`);
    assert.match(fit.verdict, /^(Flow 적합|조건부|탈락|원문 재확인)$/);
    assert.ok(Array.isArray(fit.reasons), `${row.id} missing reasons`);
    assert.ok(fit.reasons.length > 0, `${row.id} needs a decision reason`);
  }
});

test("strict Flow fit leaves only a small executable shortlist", () => {
  const counts = reviews.reduce((acc, row) => {
    const verdict = row.realFlowDraft.flowFit.verdict;
    acc[verdict] = (acc[verdict] || 0) + 1;
    return acc;
  }, {});

  assert.equal((counts["Flow 적합"] || 0) <= 35, true, "Flow 적합 should be a shortlist");
  assert.equal((counts["탈락"] || 0) >= 70, true, "Weak content should be rejected, not left as candidates");
  assert.equal((counts["원문 재확인"] || 0) >= 4, true, "Unverified extraction should remain separated");
});

test("obvious FlowMe-fit examples stay fit", () => {
  for (const id of ["001", "024", "041", "053", "081", "121", "122", "181", "186"]) {
    assert.equal(byId.get(id).realFlowDraft.flowFit.verdict, "Flow 적합", `${id} should be fit`);
  }
});

test("read-only, advice, recommendation, and generic creator content is rejected", () => {
  for (const id of ["098", "099", "141", "146", "163", "177", "180"]) {
    assert.equal(byId.get(id).realFlowDraft.flowFit.verdict, "탈락", `${id} should be rejected`);
    assert.equal(byId.get(id).realFlowDraft.quality.average <= 2, true, `${id} rejected content should have low displayed score`);
  }
});

test("search-index-only or summary-only rows are not treated as fit", () => {
  for (const id of ["010", "044", "061", "102"]) {
    assert.equal(byId.get(id).realFlowDraft.flowFit.verdict, "원문 재확인", `${id} should require source recheck`);
    assert.equal(byId.get(id).realFlowDraft.quality.average <= 2.5, true, `${id} recheck content should not display as high scoring`);
  }
});
