import test from "node:test";
import assert from "node:assert/strict";
import { resolveReviewedEditLevel } from "./compile-review-results-v2.mjs";

const timing = (editLevel) => ({
  editLevel,
  elapsedSeconds: 42,
  notes: "independent review",
});

test("Round 4 accepts a measured copy-only minor over a structurally clean gold match", () => {
  const result = resolveReviewedEditLevel({
    roundId: "round-4",
    goldAdjudicatedEditLevel: "none",
    timingEntry: timing("minor"),
  });
  assert.equal(result.editLevel, "minor");
  assert.equal(result.copyOnlyMinor, true);
  assert.equal(result.historicalTimingConflict, false);
  assert.equal(result.acceptedTimingEntry.editLevel, "minor");
});

test("Round 4 still rejects a measured structural downgrade that gold cannot explain", () => {
  assert.throws(
    () =>
      resolveReviewedEditLevel({
        roundId: "round-4",
        goldAdjudicatedEditLevel: "none",
        timingEntry: timing("major"),
      }),
    /gold adjudication/,
  );
});

test("Round 2 preserves historical conflicts without fabricating accepted timing", () => {
  const result = resolveReviewedEditLevel({
    roundId: "round-2",
    goldAdjudicatedEditLevel: "major",
    timingEntry: timing("none"),
  });
  assert.equal(result.editLevel, "major");
  assert.equal(result.acceptedTimingEntry, null);
  assert.equal(result.historicalTimingConflict, true);
});
