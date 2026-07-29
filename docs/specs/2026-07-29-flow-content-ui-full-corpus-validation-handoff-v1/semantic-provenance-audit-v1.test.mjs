import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const audit = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "semantic-provenance-audit-v1.json"),
    "utf8",
  ),
);
const fields = ["title", "detail", "completion", "schedule", "recurrence"];

test("semantic provenance audit covers the full normal and structure corpus", () => {
  assert.equal(audit.scope.contentCount, 110);
  assert.equal(audit.scope.itemCount, 893);
  assert.equal(audit.itemAudits.length, 893);
  assert.equal(audit.contentAudits.length, 110);
  assert.equal(audit.validatorSummary.allItemsHaveResolvableSourceRows, true);
  assert.equal(audit.validatorSummary.allSourceReferencesResolve, true);
});

test("each field status distribution accounts for every Item", () => {
  for (const field of fields) {
    const finalTotal = Object.values(
      audit.summary.finalStatusByField[field],
    ).reduce((sum, count) => sum + count, 0);
    const semanticTotal = Object.values(
      audit.summary.semanticBasisByField[field],
    ).reduce((sum, count) => sum + count, 0);
    assert.equal(finalTotal, audit.scope.itemCount, `${field} final status total`);
    assert.equal(
      semanticTotal,
      audit.scope.itemCount,
      `${field} semantic basis total`,
    );
  }
});

test("the artifact does not overclaim zero invention", () => {
  assert.equal(audit.validatorSummary.inventionZeroProven, false);
  assert.equal(audit.claimBoundary.zeroInventionClaim, "NOT_PROVEN");
  assert.ok(audit.summary.traceOnlySemanticFieldCount > 0);
  assert.ok(audit.summary.ownerOrProvenanceMissingFieldCount > 0);
  assert.equal(audit.claimBoundary.observedUserValidation, "NOT_RUN");
  assert.equal(audit.claimBoundary.externalCalendarRoundTrip, "NOT_RUN");
});

test("manual review queues agree with summary counters", () => {
  assert.equal(
    audit.manualReviewQueue.suspectedInvention.length,
    audit.summary.suspectedInventionFieldCount,
  );
  assert.equal(
    audit.manualReviewQueue.traceOnlySemantics.length,
    audit.summary.traceOnlySemanticFieldCount,
  );
  assert.equal(
    audit.manualReviewQueue.ownerOrProvenanceMissing.length,
    audit.summary.ownerOrProvenanceMissingFieldCount,
  );
});
