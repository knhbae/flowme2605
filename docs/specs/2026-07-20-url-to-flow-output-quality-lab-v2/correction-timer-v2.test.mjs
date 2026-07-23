import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { startTimer, stopTimer } from "./correction-timer-v2.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  fs.readFileSync(path.join(here, "case-manifest-v2.json"), "utf8"),
);

function makeLedger() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "flowme-timer-v2-"));
  const ledgerFile = path.join(directory, "ledger.json");
  fs.writeFileSync(
    ledgerFile,
    `${JSON.stringify(
      {
        documentType: "flowme_correction_timing_ledger",
        schemaVersion: "flowme-correction-timing-ledger-v2",
        caseSetVersion: manifest.caseSetVersion,
        activeSession: null,
        entries: [],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return { directory, ledgerFile };
}

test("Round 4 stopwatch accepts a real start/stop pair and reconciles elapsed time", () => {
  const { directory, ledgerFile } = makeLedger();
  try {
    startTimer({
      ledgerFile,
      roundId: "round-4",
      caseId: manifest.cases[0].caseId,
      reviewerId: "timer-contract-test",
      now: () => new Date("2026-07-20T00:00:00.000Z"),
    });
    const entry = stopTimer({
      ledgerFile,
      roundId: "round-4",
      caseId: manifest.cases[0].caseId,
      editLevel: "none",
      notes: "contract test",
      now: () => new Date("2026-07-20T00:00:42.500Z"),
    });
    assert.equal(entry.elapsedSeconds, 42.5);
    const saved = JSON.parse(fs.readFileSync(ledgerFile, "utf8"));
    assert.equal(saved.activeSession, null);
    assert.equal(saved.entries.length, 1);
    assert.equal(saved.entries[0].roundId, "round-4");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("Round 5 stopwatch remains outside the bounded stability contract", () => {
  const { directory, ledgerFile } = makeLedger();
  try {
    assert.throws(
      () =>
        startTimer({
          ledgerFile,
          roundId: "round-5",
          caseId: manifest.cases[0].caseId,
          reviewerId: "timer-contract-test",
        }),
      /round-1\.\.round-4/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
