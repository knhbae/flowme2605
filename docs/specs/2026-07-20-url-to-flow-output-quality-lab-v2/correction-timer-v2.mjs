#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultLedgerFile = path.join(here, "correction-timing-v2.json");
const manifestFile = path.join(here, "case-manifest-v2.json");
const ledgerType = "flowme_correction_timing_ledger";
const ledgerVersion = "flowme-correction-timing-ledger-v2";
const measuredKind = "measured_independent_agent_review";
const measurementMethod = "wall_clock_cli_start_stop";
const editLevels = new Set([
  "none",
  "minor",
  "major",
  "full_regeneration",
]);

class TimerError extends Error {
  constructor(message) {
    super(message);
    this.name = "TimerError";
  }
}

function assert(condition, message) {
  if (!condition) throw new TimerError(message);
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new TimerError(`${label}을 읽을 수 없습니다: ${error.message}`);
  }
}

function writeJsonAtomic(file, document) {
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, file);
}

function loadManifest() {
  const manifest = readJson(manifestFile, "case manifest");
  assert(Array.isArray(manifest.cases), "case manifest에 cases 배열이 없습니다.");
  return manifest;
}

function loadLedger(ledgerFile, manifest) {
  const ledger = readJson(ledgerFile, "correction timing ledger");
  assert(ledger.documentType === ledgerType, "ledger documentType이 올바르지 않습니다.");
  assert(ledger.schemaVersion === ledgerVersion, "ledger schemaVersion이 올바르지 않습니다.");
  assert(
    ledger.caseSetVersion === manifest.caseSetVersion,
    "ledger caseSetVersion이 현재 manifest와 다릅니다.",
  );
  assert(Array.isArray(ledger.entries), "ledger entries는 배열이어야 합니다.");
  assert(
    ledger.activeSession === null ||
      (ledger.activeSession && typeof ledger.activeSession === "object"),
    "ledger activeSession은 null 또는 객체여야 합니다.",
  );
  const keys = ledger.entries.map((entry) => `${entry.roundId}:${entry.caseId}`);
  assert(new Set(keys).size === keys.length, "ledger에 같은 round/case 측정이 중복되어 있습니다.");
  return ledger;
}

function validateIdentity(manifest, roundId, caseId, reviewerId = null) {
  assert(/^round-[1-4]$/.test(roundId ?? ""), "roundId는 round-1..round-4여야 합니다.");
  assert(
    manifest.cases.some((entry) => entry.caseId === caseId),
    `manifest에 없는 caseId입니다: ${caseId}`,
  );
  if (reviewerId !== null) {
    assert(typeof reviewerId === "string" && reviewerId.trim(), "reviewerId가 필요합니다.");
  }
}

function completedEntryExists(ledger, roundId, caseId) {
  return ledger.entries.some(
    (entry) => entry.roundId === roundId && entry.caseId === caseId,
  );
}

export function startTimer({
  ledgerFile = defaultLedgerFile,
  roundId,
  caseId,
  reviewerId,
  now = () => new Date(),
}) {
  const manifest = loadManifest();
  validateIdentity(manifest, roundId, caseId, reviewerId);
  const ledger = loadLedger(ledgerFile, manifest);
  assert(
    ledger.activeSession === null,
    `이미 측정 중입니다: ${ledger.activeSession?.roundId}/${ledger.activeSession?.caseId}`,
  );
  assert(
    !completedEntryExists(ledger, roundId, caseId),
    `${roundId}/${caseId}의 완료 측정이 이미 있습니다. 중복 측정은 허용하지 않습니다.`,
  );
  const startedAt = now().toISOString();
  ledger.activeSession = {
    roundId,
    caseId,
    reviewerId: reviewerId.trim(),
    startedAt,
  };
  writeJsonAtomic(ledgerFile, ledger);
  return { roundId, caseId, reviewerId: reviewerId.trim(), startedAt };
}

export function stopTimer({
  ledgerFile = defaultLedgerFile,
  roundId,
  caseId,
  editLevel,
  notes = "",
  now = () => new Date(),
}) {
  const manifest = loadManifest();
  validateIdentity(manifest, roundId, caseId);
  assert(editLevels.has(editLevel), "editLevel은 none, minor, major, full_regeneration 중 하나여야 합니다.");
  const ledger = loadLedger(ledgerFile, manifest);
  const active = ledger.activeSession;
  assert(active !== null, "현재 측정 중인 correction session이 없습니다.");
  assert(
    active.roundId === roundId && active.caseId === caseId,
    `활성 session은 ${active.roundId}/${active.caseId}입니다. 다른 case를 stop할 수 없습니다.`,
  );
  assert(
    !completedEntryExists(ledger, roundId, caseId),
    `${roundId}/${caseId}의 완료 측정이 이미 있습니다.`,
  );
  const endedAt = now().toISOString();
  const elapsedSeconds =
    (Date.parse(endedAt) - Date.parse(active.startedAt)) / 1000;
  assert(
    Number.isFinite(elapsedSeconds) && elapsedSeconds >= 0,
    "종료 시간이 시작 시간보다 앞서거나 유효하지 않습니다.",
  );
  const entry = {
    roundId,
    caseId,
    kind: measuredKind,
    startedAt: active.startedAt,
    endedAt,
    elapsedSeconds,
    reviewerId: active.reviewerId,
    measurementMethod,
    editLevel,
    notes: String(notes ?? "").trim(),
  };
  ledger.entries.push(entry);
  ledger.activeSession = null;
  writeJsonAtomic(ledgerFile, ledger);
  return entry;
}

function status(ledgerFile = defaultLedgerFile) {
  const manifest = loadManifest();
  const ledger = loadLedger(ledgerFile, manifest);
  return {
    activeSession: ledger.activeSession,
    completedEntryCount: ledger.entries.length,
  };
}

function usage() {
  return [
    "Usage:",
    "  node correction-timer-v2.mjs start <roundId> <caseId> <reviewerId>",
    "  node correction-timer-v2.mjs stop <roundId> <caseId> <editLevel> [note]",
    "  node correction-timer-v2.mjs status",
    "",
    "start/stop timestamps come directly from the wall clock. Completed round/case measurements cannot be overwritten or duplicated.",
  ].join("\n");
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || ["--help", "help"].includes(command)) {
    console.log(usage());
    process.exitCode = command ? 0 : 1;
    return;
  }
  try {
    let result;
    if (command === "start") {
      assert(args.length === 3, "start에는 roundId, caseId, reviewerId가 정확히 필요합니다.");
      result = startTimer({
        roundId: args[0],
        caseId: args[1],
        reviewerId: args[2],
      });
    } else if (command === "stop") {
      assert(args.length >= 3, "stop에는 roundId, caseId, editLevel이 필요합니다.");
      result = stopTimer({
        roundId: args[0],
        caseId: args[1],
        editLevel: args[2],
        notes: args.slice(3).join(" "),
      });
    } else if (command === "status") {
      assert(args.length === 0, "status에는 추가 인자가 없습니다.");
      result = status();
    } else {
      throw new TimerError(`지원하지 않는 command입니다: ${command}`);
    }
    console.log(JSON.stringify({ ok: true, command, ...result }, null, 2));
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}

const isDirect =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) await main();
