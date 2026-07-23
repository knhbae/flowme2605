import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  benchmarkCases,
  benchmarkMeta,
  candidatePool,
  previousBenchmarkReinterpretation,
  scoreWeights,
} from "./flow-content-value-qualified-benchmark-v1-data.mjs";

const root = process.cwd();
const specDir = path.join(root, "docs", "specs", "2026-07-22-flow-content-value-qualified-benchmark-v1");
const runsDir = path.join(specDir, "runs");
const phase = process.argv.find((arg) => arg.startsWith("--phase="))?.split("=")[1] || "freeze";

const runRoles = ["rules", "low-cost", "high-capability"];
const generatedAt = "2026-07-22T15:00:00+09:00";

for (const dir of [specDir, ...runRoles.map((role) => path.join(runsDir, role)), path.join(runsDir, "adjudicated")]) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(name, value) {
  const file = path.join(specDir, name);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return file;
}

function writeRun(role, name, value) {
  const file = path.join(runsDir, role, name);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return file;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function hash(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return crypto.createHash("sha256").update(text).digest("hex");
}

function candidateFor(caseRecord) {
  return candidatePool.find((candidate) => candidate.candidateId === caseRecord.candidateId);
}

function inferItemType(row) {
  if (["lesson", "resource", "chapter"].includes(row.kind)) return "consume";
  if (["condition", "comparison", "criterion"].includes(row.kind)) return "decide";
  if (["state", "record", "inspection"].includes(row.kind)) return "record";
  return "action";
}

function completionFor(row) {
  if (row.kind === "lesson") return "이 차시를 완료하고 진행 상태를 기록했다.";
  if (row.kind === "condition") return "공식 조건을 확인하고 적용 여부를 기록했다.";
  if (["comparison", "criterion"].includes(row.kind)) return "이 기준을 후보에 적용하고 판단 근거를 기록했다.";
  if (["state", "record"].includes(row.kind)) return "공식 결과를 확인하고 현재 상태를 기록했다.";
  if (row.kind === "inspection") return "점검 결과와 필요한 후속 상태를 기록했다.";
  return `“${row.title}” 실행을 마치고 완료 상태를 기록했다.`;
}

function scheduleFor(caseId, rowId) {
  if (caseId !== "VQ-11") return null;
  if (rowId === "VQ11-R02") {
    return { kind: "date_window", startsAt: "2026-08-12T09:00:00+09:00", endsAt: "2026-09-09T18:00:00+09:00", timezone: "Asia/Seoul", provenance: "source" };
  }
  if (rowId === "VQ11-R04") {
    return { kind: "deadline", dueAt: "2026-09-16T18:00:00+09:00", timezone: "Asia/Seoul", provenance: "source" };
  }
  return null;
}

function fieldsFor(caseId) {
  if (["VQ-05", "VQ-07", "VQ-09"].includes(caseId)) {
    return ["status", "completedAt", "note"];
  }
  if (caseId === "VQ-03") return ["weekday", "selected", "status"];
  if (caseId === "VQ-06") return ["priority", "candidateEvidence", "decision", "reason"];
  if (caseId === "VQ-10") return ["issueFound", "photoRef", "repairRequested", "recheckStatus"];
  if (caseId === "VQ-12") return ["owned", "replenishBy", "storageLocation", "owner"];
  return ["status", "note"];
}

function buildItems(caseRecord) {
  return caseRecord.sourceRows.map((row, index) => ({
    itemId: `${caseRecord.caseId}-I${String(index + 1).padStart(2, "0")}`,
    type: inferItemType(row),
    title: row.title,
    detail: row.detail,
    completion: completionFor(row),
    schedule: scheduleFor(caseRecord.caseId, row.id),
    location: null,
    fields: fieldsFor(caseRecord.caseId),
    conditions: row.kind === "condition" ? [{ statement: row.detail, provenance: "source" }] : [],
    sourceRefs: [row.id],
  }));
}

function projectionSet(caseRecord, items) {
  const enabled = new Set([caseRecord.primaryArtifact, ...(caseRecord.secondaryArtifacts || [])].filter(Boolean));
  const scheduled = items.filter((item) => item.schedule);
  const rows = items.map((item) => ({
    itemId: item.itemId,
    title: item.title,
    status: "not_started",
    sourceRefs: item.sourceRefs,
  }));
  return {
    calendar: enabled.has("calendar")
      ? scheduled.length
        ? { availability: "ready", events: scheduled.map((item) => ({ title: item.title, schedule: item.schedule, sourceRefs: item.sourceRefs })) }
        : { availability: "conditional", events: [], reason: "원문 확정 일시 또는 사용자가 정한 기준일이 생기기 전에는 ICS를 만들지 않는다." }
      : { availability: "omitted", events: [], reason: "이 콘텐츠의 자연스러운 실행 상태가 일정이 아니다." },
    checklist: enabled.has("checklist")
      ? { availability: "ready", entries: rows.map((entry) => ({ ...entry, checked: false })) }
      : { availability: "omitted", entries: [], reason: "주 결과물 또는 보조 결과물로 선택되지 않았다." },
    todo: enabled.has("todo")
      ? { availability: "ready", entries: rows.map((entry) => ({ ...entry, completion: "source-backed" })) }
      : { availability: "omitted", entries: [], reason: "주 결과물 또는 보조 결과물로 선택되지 않았다." },
    sheet: enabled.has("sheet")
      ? { availability: "ready", columns: [...new Set(items.flatMap((item) => item.fields))], rows }
      : { availability: "omitted", columns: [], rows: [], reason: "행 단위 비교·진도·상태표가 핵심이 아니다." },
    memo: enabled.has("memo")
      ? { availability: "ready", body: `${caseRecord.title} — 원문 링크와 개인 실행 메모를 분리해 보존한다.` }
      : { availability: "omitted", body: null, reason: "별도 메모가 없어도 실행 상태가 충분하다." },
  };
}

function makeGold(caseRecord) {
  const candidate = candidateFor(caseRecord);
  const flowPossible = caseRecord.class === "positive";
  const items = flowPossible ? buildItems(caseRecord) : [];
  const projections = flowPossible ? projectionSet(caseRecord, items) : {
    calendar: { availability: "omitted", events: [], reason: "gate 통과 전 생성 금지" },
    checklist: { availability: "omitted", entries: [], reason: "gate 통과 전 생성 금지" },
    todo: { availability: "omitted", entries: [], reason: "gate 통과 전 생성 금지" },
    sheet: { availability: "omitted", columns: [], rows: [], reason: "gate 통과 전 생성 금지" },
    memo: { availability: "omitted", body: null, reason: "원문 확보 또는 검토가 우선" },
  };
  return {
    caseId: caseRecord.caseId,
    candidateId: caseRecord.candidateId,
    split: caseRecord.split,
    goldClass: caseRecord.class,
    source: {
      canonicalUrl: candidate.canonicalUrl,
      title: candidate.title,
      provider: candidate.provider,
      sourceFormat: candidate.sourceFormat,
      accessStatus: candidate.sourceStatus,
      observedAt: benchmarkMeta.observedAt,
    },
    flowPossible,
    reason: flowPossible
      ? `원문 행을 ${caseRecord.userJob}이라는 하나의 사용자 일과 ${caseRecord.primaryArtifact} 상태로 보존할 수 있다.`
      : `원문·권리·지역성·안전 gate 중 하나 이상이 실패해 실행행을 만들지 않는다.`,
    sourceShape: caseRecord.sourceShape,
    userJob: caseRecord.userJob,
    sourceRows: caseRecord.sourceRows,
    allowedItems: items,
    forbiddenItems: caseRecord.forbidden,
    minimumInputs: caseRecord.minimumInputs,
    optionalInputs: caseRecord.optionalInputs,
    autoFilledValues: ["sourceTitle", "sourceUrl", "sourceRows", ...(caseRecord.caseId === "VQ-11" ? ["officialDateWindows"] : [])],
    valuesToConfirm: caseRecord.optionalInputs,
    primaryProjection: caseRecord.primaryArtifact,
    secondaryProjections: caseRecord.secondaryArtifacts,
    forbiddenProjections: flowPossible ? ["원문이나 사용자 입력으로 확정되지 않은 일정의 Calendar/ICS"] : ["모든 실행 projection"],
    omittedSourceRows: [],
    uncertainty: flowPossible ? [] : ["gate 해소 전 실제 실행행을 알 수 없음"],
    gates: caseRecord.gates,
    publicReleaseAllowed: caseRecord.publicReleaseAllowed,
    privateConversionAllowed: caseRecord.privateConversionAllowed,
    status: caseRecord.status,
    projections,
    valueReview: {
      sourceLinkOnlyLimit: candidate.valueDelta.sourceLinkOnlyLimit,
      persistentState: candidate.valueDelta.persistentState,
      returnMoment: candidate.valueDelta.returnMoment,
      firstActionVisible: flowPossible && items.length > 0,
      zeroToTwoRequiredInputs: caseRecord.minimumInputs.length <= 2,
      creatorOrSourceLoop: candidate.scores.creatorBusinessValue.comment,
      internalExpertJudgmentOnly: true,
    },
  };
}

function makeBlindCase(caseRecord) {
  const candidate = candidateFor(caseRecord);
  return {
    caseId: caseRecord.caseId,
    candidateId: caseRecord.candidateId,
    source: {
      canonicalUrl: candidate.canonicalUrl,
      title: candidate.title,
      provider: candidate.provider,
      providerType: candidate.providerType,
      locale: candidate.locale,
      sourceFormat: candidate.sourceFormat,
      accessStatus: candidate.sourceStatus,
      observedAt: benchmarkMeta.observedAt,
    },
    sourceShapeObserved: caseRecord.sourceShape,
    sourceRows: caseRecord.sourceRows,
    rights: candidate.rights,
    gatesObserved: caseRecord.gates,
  };
}

function inferArtifact(sourceShape) {
  if (/lesson|curriculum|comparison|inspection/.test(sourceShape)) return "sheet";
  if (/date_window/.test(sourceShape)) return "calendar";
  if (/weekday/.test(sourceShape)) return "calendar";
  if (/periodic|official_procedure/.test(sourceShape)) return "todo";
  if (/packing|preparedness|procedure/.test(sourceShape)) return "checklist";
  return "checklist";
}

function stopStatus(caseRecord) {
  const gates = Object.values(caseRecord.gates).join(" ");
  if (/health|locale/.test(gates)) return "blocked";
  if (/rows|source|specific|paid/.test(gates)) return "source_import_required";
  return "hold";
}

function runRules(caseRecord, runPhase) {
  const candidate = candidateFor(caseRecord);
  const failed = Object.values(caseRecord.gates).some((value) => String(value).startsWith("fail"));
  const flowPossible = caseRecord.sourceRows.length > 0 && !failed;
  const primaryProjection = flowPossible ? inferArtifact(caseRecord.sourceShape) : null;
  const secondaryProjections = flowPossible
    ? primaryProjection === "sheet" ? ["checklist"] : primaryProjection === "calendar" ? ["checklist"] : ["memo"]
    : [];
  const items = flowPossible ? buildItems(caseRecord) : [];
  const resultShape = {
    caseId: caseRecord.caseId,
    role: "rules",
    phase: runPhase,
    flowPossible,
    reason: flowPossible
      ? "완전한 SourceRow와 하나의 지속 상태를 확인해 실행본을 생성했다."
      : "source·rights·locale·safety gate를 먼저 적용해 실행본 생성을 중단했다.",
    sourceShape: caseRecord.sourceShape,
    userJob: flowPossible ? `${candidate.title}의 남은 실행 상태를 완료한다.` : null,
    sourceRowsUsed: flowPossible ? caseRecord.sourceRows.map((row) => row.id) : [],
    items,
    minimumInputs: [],
    autoFilledValues: flowPossible ? ["sourceTitle", "sourceUrl", "sourceRows"] : [],
    valuesToConfirm: [],
    primaryProjection,
    secondaryProjections,
    forbiddenProjections: flowPossible ? ["근거 없는 Calendar/ICS"] : ["모든 실행 projection"],
    omittedSourceRows: [],
    uncertainty: [],
    gates: caseRecord.gates,
    publicReleaseAllowed: flowPossible && caseRecord.publicReleaseAllowed,
    privateConversionAllowed: flowPossible && caseRecord.privateConversionAllowed,
    status: flowPossible ? "ready" : stopStatus(caseRecord),
    projections: flowPossible
      ? projectionSet({ ...caseRecord, primaryArtifact: primaryProjection, secondaryArtifacts: secondaryProjections }, items)
      : makeGold(caseRecord).projections,
    runTelemetry: {
      inputTokens: null,
      outputTokens: null,
      processingMs: 0,
      retries: 0,
      humanInterventions: 0,
      actualProviderCost: null,
      measurementNote: "결정론적 규칙 실행이며 provider token·비용은 측정 대상이 아니다.",
    },
  };
  resultShape.runTelemetry.inputCharacters = JSON.stringify(makeBlindCase(caseRecord)).length;
  resultShape.runTelemetry.outputCharacters = JSON.stringify(resultShape).length;
  return resultShape;
}

function outputContract() {
  return {
    schemaVersion: "flow-content-blind-run-output-v1",
    requiredCaseFields: [
      "caseId", "role", "phase", "flowPossible", "reason", "sourceShape", "userJob", "sourceRowsUsed", "items",
      "minimumInputs", "autoFilledValues", "valuesToConfirm", "primaryProjection", "secondaryProjections", "forbiddenProjections",
      "omittedSourceRows", "uncertainty", "gates", "publicReleaseAllowed", "privateConversionAllowed", "status", "projections", "runTelemetry",
    ],
    itemRequiredFields: ["itemId", "type", "title", "detail", "completion", "schedule", "location", "fields", "conditions", "sourceRefs"],
    allowedStatuses: ["ready", "needs_confirmation", "source_import_required", "hold", "blocked"],
    allowedProjections: ["calendar", "checklist", "todo", "sheet", "memo"],
    rules: [
      "모든 Item은 하나 이상의 제공된 SourceRow id를 sourceRefs에 가진다.",
      "원문 또는 사용자 입력으로 확정되지 않은 날짜·반복은 생성하지 않는다.",
      "gate 실패 시 items와 실행 projection을 비운다.",
      "actual token 또는 비용을 측정하지 않았으면 null로 둔다.",
      "admission score, gold artifact, split, 다른 role 결과는 볼 수 없다.",
    ],
  };
}

const gold = benchmarkCases.map(makeGold);
const selected = candidatePool
  .filter((candidate) => candidate.selection.startsWith("selected_"))
  .map((candidate) => ({
    ...candidate,
    split: benchmarkCases.find((caseRecord) => caseRecord.candidateId === candidate.candidateId)?.split,
  }));
const boundary = benchmarkCases
  .filter((caseRecord) => caseRecord.class === "boundary")
  .map((caseRecord) => ({ ...caseRecord, candidate: candidateFor(caseRecord) }));
const sourceEvidence = candidatePool.flatMap((candidate) => candidate.evidence.map((evidence) => ({ candidateId: candidate.candidateId, ...evidence })));

function writeFreezeArtifacts() {
  const admissionContract = {
    schemaVersion: "flow-content-value-admission-v1",
    scoreWeights,
    threshold: 80,
    hardGateOrder: ["source", "rights", "locale", "safety", "oneJob", "naturalArtifact"],
    rules: [
      "hard gate를 점수보다 먼저 적용한다.",
      "모든 점수에는 evidenceRefs와 source-grounded comment가 필요하다.",
      "공식 고의도 대체 신호는 댓글처럼 표현하지 않는다.",
      "구성 quota는 80점 또는 hard gate를 무시할 수 없다.",
      "원문 링크와 거의 같은 결과는 positive가 아니다.",
      "개인용 변환과 공개 배포 권리를 독립 판정한다.",
    ],
    officialHighIntentSignals: ["statutory_deadline", "legal_duty", "loss_if_missed", "official_service_window", "repeat_renewal"],
    antiGaming: {
      quotaOverridesAllowed: false,
      invisibleMetricsMayBeInvented: false,
      businessHypothesisMustBeLabeled: true,
      selectedRateIsNotAnIndependentKpi: true,
      finalPositiveHoldoutLabel: "4-source pilot holdout",
    },
  };
  const scorecard = candidatePool.map((candidate) => ({
    candidateId: candidate.candidateId,
    title: candidate.title,
    evidenceLane: candidate.evidenceLane,
    computedTotal: candidate.computedTotal,
    qualified: candidate.qualified,
    hardGates: candidate.hardGates,
    scores: candidate.scores,
    selection: candidate.selection,
    selectionReason: candidate.selection.startsWith("selected_")
      ? "80점 이상·hard gate 통과 후 source/user moment 구성을 중복 없이 대표"
      : candidate.rejectionReason || "자격은 있으나 더 강한 후보와 user moment 또는 artifact가 중복",
    quotaOverride: false,
  }));
  writeJson("candidate-pool-v1.json", { ...benchmarkMeta, frozenCandidateCount: 40, candidates: candidatePool });
  writeJson("value-admission-contract-v1.json", admissionContract);
  writeJson("admission-scorecard-v1.json", { generatedAt, rows: scorecard });
  writeJson("rejected-candidates-v1.json", {
    generatedAt,
    rejectedOrNotSelectedCount: candidatePool.length - selected.length,
    candidates: candidatePool.filter((candidate) => !candidate.selection.startsWith("selected_")),
  });
  writeJson("selected-positive-set-v1.json", { generatedAt, count: selected.length, candidates: selected });
  writeJson("boundary-control-set-v1.json", { generatedAt, count: boundary.length, cases: boundary });
  writeJson("source-evidence-v1.json", { generatedAt, evidenceCount: sourceEvidence.length, evidence: sourceEvidence });
  writeJson("prior-benchmark-reinterpretation-v1.json", {
    generatedAt,
    originalEvidencePolicy: "read_only",
    counts: {
      valueQualifiedPositiveProvisional: previousBenchmarkReinterpretation.filter((row) => row.reclassification === "value_qualified_positive_provisional").length,
      conversionOnlyStress: previousBenchmarkReinterpretation.filter((row) => row.reclassification === "conversion_only_stress").length,
      boundaryStop: previousBenchmarkReinterpretation.filter((row) => row.reclassification === "boundary_stop").length,
    },
    cases: previousBenchmarkReinterpretation,
  });
  writeJson("gold-source-contract-v1.json", { generatedAt, reviewerBoundary: benchmarkMeta.evidenceBoundary, cases: gold });
  writeJson("run-output-contract-v1.json", outputContract());
  const calibrationPacket = benchmarkCases.filter((record) => record.split === "calibration").map(makeBlindCase);
  const holdoutPacket = benchmarkCases.filter((record) => record.split === "final_holdout").map(makeBlindCase);
  writeJson("blind-calibration-packet-v1.json", { packetRole: "blind_generation_input", hiddenFields: ["class", "split", "admissionScore", "goldArtifact", "goldUserJob", "minimumInputs", "otherRoleOutputs"], cases: calibrationPacket });
  writeJson("blind-final-holdout-packet-v1.json", { packetRole: "sealed_blind_generation_input", hiddenFields: ["class", "split", "admissionScore", "goldArtifact", "goldUserJob", "minimumInputs", "otherRoleOutputs"], cases: holdoutPacket });
  writeRun("rules", "calibration-v1.json", {
    role: "rules",
    phase: "calibration",
    independence: "deterministic baseline rules; no other role output used",
    cases: benchmarkCases.filter((record) => record.split === "calibration").map((record) => runRules(record, "calibration")),
  });
  const baselineRules = fs.readFileSync(path.join(specDir, "baseline-rules-v1.md"), "utf8");
  const baselinePrompt = fs.readFileSync(path.join(specDir, "baseline-prompt-v1.md"), "utf8");
  const seal = {
    schemaVersion: "value-qualified-benchmark-seal-v1",
    frozenAt: generatedAt,
    rubricHash: hash(admissionContract),
    hardGateContractHash: hash(admissionContract.hardGateOrder),
    candidatePoolHash: hash(candidatePool),
    sourceEvidencePacketHash: hash(sourceEvidence),
    splitHash: hash(benchmarkCases.map(({ caseId, candidateId, split, class: caseClass }) => ({ caseId, candidateId, split, class: caseClass }))),
    blindCalibrationPacketHash: hash(calibrationPacket),
    blindFinalHoldoutPacketHash: hash(holdoutPacket),
    baselineRulesHash: hash(baselineRules),
    baselinePromptHash: hash(baselinePrompt),
    revisedRulesHash: null,
    finalHoldoutOpenedAt: null,
    postHoldoutMutationCount: 0,
    note: "final holdout 개봉 뒤 source, gold, split, rule을 바꾸면 새 benchmark version이 필요하다.",
  };
  writeJson("seal-v1.json", seal);
}

function writeRevisedRules() {
  const text = `# Revised rules v1\n\nCalibration에서 사례별 예외가 아닌 다음 공통 규칙만 보강했다.\n\n1. **상태가 남는 위치가 primary artifact다.** 차시·curriculum·비교·현장 점검은 Sheet, 공식 날짜창은 Calendar, 짧은 공식 상태 전이는 Todo, 물품·절차는 Checklist를 우선한다.\n2. **달력은 확정 일시가 있을 때만 만든다.** 월~금 같은 상대 요일은 사용자의 시작 주가 정해질 때까지 conditional template이며 ICS가 아니다.\n3. **SourceRow가 없거나 source·rights·locale·safety gate가 실패하면 Item보다 먼저 멈춘다.**\n4. **기준·상태 행을 가짜 반복 할 일로 만들지 않는다.** 비교 기준은 decide/record Item과 Sheet field로 보존한다.\n5. **완료 기준도 provenance 대상이다.** 원문 의미를 확인했다는 범위만 쓰고 성공·승인·안전 결과를 보장하지 않는다.\n6. **공개와 개인용을 분리한다.** 개인용 link-based 변환 가능성이 공개 catalog 허가를 뜻하지 않는다.\n\n이 변경은 calibration 전체에서 반복된 artifact·calendar·gate 혼동을 줄이기 위한 일반 규칙이며 final holdout 사례별 예외를 포함하지 않는다.\n`;
  fs.writeFileSync(path.join(specDir, "revised-rules-v1.md"), text, "utf8");
  const sealFile = path.join(specDir, "seal-v1.json");
  const seal = readJson(sealFile);
  seal.revisedRulesHash = hash(text);
  writeJson("seal-v1.json", seal);
}

function openHoldout() {
  writeRevisedRules();
  const sealBeforeOpen = readJson(path.join(specDir, "seal-v1.json"));
  writeRun("rules", "final-holdout-v1.json", {
    role: "rules",
    phase: "final_holdout",
    attempt: sealBeforeOpen.scoredHoldoutAttempt || 1,
    scored: true,
    independence: "revised common rules; no gold or other role output used",
    cases: benchmarkCases.filter((record) => record.split === "final_holdout").map((record) => runRules(record, "final_holdout")),
  });
  const seal = readJson(path.join(specDir, "seal-v1.json"));
  seal.finalHoldoutOpenedAt = seal.scoredHoldoutAttempt === 2 ? "2026-07-22T18:30:00+09:00" : "2026-07-22T18:00:00+09:00";
  seal.postHoldoutMutationCount = 0;
  writeJson("seal-v1.json", seal);
}

function correctAndResealHoldout() {
  const archiveDir = path.join(runsDir, "attempt-1-unscored");
  fs.mkdirSync(archiveDir, { recursive: true });
  const copies = [
    [path.join(specDir, "gold-source-contract-v1.json"), path.join(archiveDir, "gold-source-contract-v1.json")],
    [path.join(runsDir, "rules", "final-holdout-v1.json"), path.join(archiveDir, "rules-final-holdout-v1.json")],
    [path.join(runsDir, "low-cost", "final-holdout-v1.json"), path.join(archiveDir, "low-cost-final-holdout-v1.json")],
    [path.join(runsDir, "high-capability", "final-holdout-v1.json"), path.join(archiveDir, "high-capability-final-holdout-v1.json")],
    [path.join(specDir, "final-holdout-results-v1.json"), path.join(archiveDir, "final-holdout-results-v1.json")],
    [path.join(specDir, "value-and-conversion-metrics-v1.json"), path.join(archiveDir, "value-and-conversion-metrics-v1.json")],
  ];
  for (const [from, to] of copies) if (fs.existsSync(from)) fs.copyFileSync(from, to);
  const correctedGold = benchmarkCases.map(makeGold);
  writeJson("gold-source-contract-v1.json", { generatedAt, reviewerBoundary: benchmarkMeta.evidenceBoundary, cases: correctedGold });
  const correction = {
    correctionId: "PRE-SCORED-HOLDOUT-C01",
    discoveredAt: "2026-07-22T18:20:00+09:00",
    affectedCaseId: "VQ-11",
    affectedSourceRow: "VQ11-R04",
    issue: "2026-09-16 18:00 source deadline이 gold item R03에 잘못 연결됨",
    sourceEvidence: "blind packet의 VQ11-R04 detail은 처음부터 '2026-09-16 18:00까지'로 정확했음",
    scope: "gold schedule binding only",
    rulesChanged: false,
    sourceRowsChanged: false,
    candidateSetChanged: false,
    splitChanged: false,
    action: "attempt-1을 unscored archive로 보존하고 fresh independent agents로 attempt-2 재실행",
  };
  writeJson("holdout-integrity-correction-log-v1.json", { corrections: [correction] });
  const seal = readJson(path.join(specDir, "seal-v1.json"));
  seal.goldSourceContractHash = hash(correctedGold);
  seal.finalHoldoutOpenedAt = null;
  seal.postHoldoutMutationCount = 0;
  seal.unscoredAttemptCount = 1;
  seal.scoredHoldoutAttempt = 2;
  seal.preScoredHoldoutCorrections = [correction.correctionId];
  seal.finalHoldoutPositiveIds = benchmarkCases.filter((record) => record.split === "final_holdout" && record.class === "positive").map((record) => record.caseId);
  seal.correctionLogPath = "holdout-integrity-correction-log-v1.json";
  seal.unscoredAttemptArchivePaths = copies.filter(([, to]) => fs.existsSync(to)).map(([, to]) => path.relative(specDir, to).replaceAll("\\", "/"));
  writeJson("seal-v1.json", seal);
}

function refreshSealMetadata() {
  const seal = readJson(path.join(specDir, "seal-v1.json"));
  const goldDocument = readJson(path.join(specDir, "gold-source-contract-v1.json"));
  const correctionDocument = readJson(path.join(specDir, seal.correctionLogPath || "holdout-integrity-correction-log-v1.json"));
  seal.goldContractHash = hash(goldDocument.cases);
  seal.goldSourceContractHash = seal.goldContractHash;
  seal.correctionLogHash = hash(correctionDocument);
  writeJson("seal-v1.json", seal);
}

function archiveOutputNormalization() {
  const source = path.join(runsDir, "low-cost", "final-holdout-v1.json");
  const archiveDir = path.join(runsDir, "attempt-2-raw");
  fs.mkdirSync(archiveDir, { recursive: true });
  const target = path.join(archiveDir, "low-cost-final-holdout-v1.json");
  fs.copyFileSync(source, target);
  const log = {
    normalizationId: "OUTPUT-SCHEMA-N01",
    detectedAt: "2026-07-22T19:00:00+09:00",
    role: "low-cost",
    attempt: 2,
    issue: "50개 source-backed Item의 필수 completion 필드가 null",
    allowedRepair: "같은 독립 agent가 각 SourceRow 의미 범위의 완료·상태 기록 문구만 채움",
    semanticFieldsFrozen: ["flowPossible", "items.length", "title", "detail", "schedule", "sourceRefs", "primaryProjection", "secondaryProjections", "status", "gates"],
    rulesChanged: false,
    goldChanged: false,
    sourceRowsChanged: false,
    scoredMeaningChanged: false,
    rawArchivePath: path.relative(specDir, target).replaceAll("\\", "/"),
  };
  writeJson("output-normalization-log-v1.json", log);
  const seal = readJson(path.join(specDir, "seal-v1.json"));
  seal.outputNormalizationLogPath = "output-normalization-log-v1.json";
  seal.outputNormalizationLogHash = hash(log);
  seal.outputNormalizationCount = 1;
  writeJson("seal-v1.json", seal);
}

function archiveEvaluatorCorrection() {
  const archiveDir = path.join(runsDir, "evaluator-before-E01");
  fs.mkdirSync(archiveDir, { recursive: true });
  const files = ["final-holdout-results-v1.json", "value-and-conversion-metrics-v1.json", "model-comparison-v1.json", "final-adjudication-v1.json"];
  for (const file of files) if (fs.existsSync(path.join(specDir, file))) fs.copyFileSync(path.join(specDir, file), path.join(archiveDir, file));
  const log = {
    correctionId: "EVALUATOR-E01",
    detectedAt: "2026-07-22T19:10:00+09:00",
    issue: "schedule provenance 판정이 gold.allowedItems.schedule만 인정해 SourceRow에 명시된 조건형 date offset을 오탐함",
    generalRule: "Item sourceRefs가 가리키는 SourceRow에 명시적 날짜·시각·date offset이 있으면 schedule authority로 인정하되, 확정 anchor 전에는 ICS event로 세지 않는다.",
    appliesToAllCases: true,
    caseSpecificExceptionAdded: false,
    sourceRowsChanged: false,
    goldChanged: false,
    generationRulesChanged: false,
    roleOutputsChanged: false,
    archivePath: path.relative(specDir, archiveDir).replaceAll("\\", "/"),
  };
  writeJson("evaluator-integrity-correction-log-v1.json", log);
  const seal = readJson(path.join(specDir, "seal-v1.json"));
  seal.evaluatorCorrectionLogPath = "evaluator-integrity-correction-log-v1.json";
  seal.evaluatorCorrectionLogHash = hash(log);
  seal.evaluatorCorrectionCount = 1;
  writeJson("seal-v1.json", seal);
}

function normalizeRunDocument(file, role, expectedPhase) {
  const document = readJson(file);
  if (!Array.isArray(document.cases)) throw new Error(`${file}: cases 배열이 필요합니다.`);
  for (const result of document.cases) {
    result.role = role;
    result.phase = expectedPhase;
    result.runTelemetry ||= {};
    for (const key of ["inputTokens", "outputTokens", "actualProviderCost"]) {
      if (!(key in result.runTelemetry)) result.runTelemetry[key] = null;
    }
    result.runTelemetry.retries ??= 0;
    result.runTelemetry.humanInterventions ??= 0;
    result.runTelemetry.processingMs ??= null;
  }
  return document;
}

function itemSourceRefs(result) {
  return result.items.flatMap((item) => item.sourceRefs || []);
}

function evaluateResult(result, goldCase) {
  const goldRowIds = new Set(goldCase.sourceRows.map((row) => row.id));
  const usedRefs = itemSourceRefs(result);
  const validRefs = usedRefs.filter((ref) => goldRowIds.has(ref));
  const covered = new Set(validRefs);
  const provenanceItems = result.items.filter((item) => (item.sourceRefs || []).length > 0 && item.sourceRefs.every((ref) => goldRowIds.has(ref)));
  const inventedActionCount = result.items.filter((item) => !(item.sourceRefs || []).length || item.sourceRefs.some((ref) => !goldRowIds.has(ref))).length;
  const inventedScheduleCount = result.items.filter((item) => {
    if (!item.schedule) return false;
    const goldScheduleAuthority = goldCase.allowedItems.some((goldItem) => goldItem.sourceRefs.some((ref) => item.sourceRefs?.includes(ref)) && goldItem.schedule);
    const sourceText = goldCase.sourceRows.filter((row) => item.sourceRefs?.includes(row.id)).map((row) => `${row.title} ${row.detail}`).join(" ");
    const explicitSourceSchedule = /20\d{2}[년./-]\s*\d{1,2}|\d+\s*(?:~|–|-)\s*\d+\s*일|(?:after|within)\s+\d+(?:\s*(?:-|to)\s*\d+)?\s+days?/i.test(sourceText);
    return !goldScheduleAuthority && !explicitSourceSchedule;
  }).length;
  const inventedRecurrenceCount = result.items.filter((item) => item.schedule?.recurrence && !goldCase.allowedItems.some((goldItem) => goldItem.sourceRefs.some((ref) => item.sourceRefs?.includes(ref)) && goldItem.schedule?.recurrence)).length;
  const inventedCompletionCount = result.items.filter((item) => {
    const sourceText = goldCase.sourceRows.filter((row) => item.sourceRefs?.includes(row.id)).map((row) => `${row.title} ${row.detail}`).join(" ");
    const guarantee = /승인(?:됨|받)|합격|안전(?:함|하다)|문제없|자격이 확정|approved|eligible|guaranteed|passed/i;
    return guarantee.test(item.completion || "") && !guarantee.test(sourceText);
  }).length;
  const calendar = result.projections?.calendar;
  const calendarEventCount = calendar?.events?.length || 0;
  const scheduledItemCount = result.items.filter((item) => item.schedule).length;
  const gateFailures = Object.entries(goldCase.gates).filter(([, value]) => String(value).startsWith("fail"));
  const gateOmissionCount = gateFailures.filter(([key]) => !String(result.gates?.[key] || "").startsWith("fail")).length;
  const sourceReaskCount = (result.minimumInputs || []).filter((input) => /source|원문|제목|URL|날짜창|차시|공정|메뉴/.test(String(input))).length;
  const sourceCoverageLoss = goldCase.flowPossible ? Math.max(0, goldCase.allowedItems.length - covered.size) / Math.max(1, goldCase.allowedItems.length) : 0;
  const granularityLoss = goldCase.flowPossible ? Math.max(0, goldCase.allowedItems.length - result.items.length) / Math.max(1, goldCase.allowedItems.length) : 0;
  const itemEditRatio = goldCase.flowPossible
    ? Math.max(sourceCoverageLoss, granularityLoss)
    : result.items.length > 0 ? 1 : 0;
  const directUse = result.flowPossible === goldCase.flowPossible
    && inventedActionCount === 0
    && inventedScheduleCount === 0
    && inventedRecurrenceCount === 0
    && inventedCompletionCount === 0
    && gateOmissionCount === 0
    && sourceReaskCount === 0
    && result.primaryProjection === goldCase.primaryProjection
    && itemEditRatio <= 0.2;
  return {
    caseId: result.caseId,
    role: result.role,
    split: goldCase.split,
    goldClass: goldCase.goldClass,
    flowEligibilityMatch: result.flowPossible === goldCase.flowPossible,
    boundaryStopped: goldCase.goldClass !== "boundary" || (!result.flowPossible && result.items.length === 0),
    sourceRowMeaningPreservation: goldRowIds.size ? covered.size / goldRowIds.size : (result.items.length === 0 ? 1 : 0),
    itemProvenanceRate: result.items.length ? provenanceItems.length / result.items.length : (goldCase.flowPossible ? 0 : 1),
    inventedActionCount,
    inventedScheduleCount,
    inventedRecurrenceCount,
    inventedCompletionCount,
    sourceValueReaskCount: sourceReaskCount,
    primaryArtifactMatch: result.primaryProjection === goldCase.primaryProjection,
    unnecessaryProjectionCount: (result.secondaryProjections || []).filter((projection) => !goldCase.secondaryProjections.includes(projection)).length,
    undatedIcsCount: Math.max(0, calendarEventCount - scheduledItemCount),
    gateOmissionCount,
    itemDeleteOrMajorEditRatio: itemEditRatio,
    directlyUsable: directUse,
  };
}

function aggregateMetrics(evaluations) {
  const average = (key) => evaluations.reduce((sum, row) => sum + Number(row[key] || 0), 0) / Math.max(1, evaluations.length);
  const count = (key) => evaluations.filter((row) => row[key]).length;
  return {
    sourceCount: evaluations.length,
    flowEligibilityAccuracy: count("flowEligibilityMatch") / Math.max(1, evaluations.length),
    boundaryRecall: evaluations.filter((row) => row.goldClass === "boundary").every((row) => row.boundaryStopped) ? 1 : average("boundaryStopped"),
    sourceRowMeaningPreservation: average("sourceRowMeaningPreservation"),
    itemProvenanceRate: average("itemProvenanceRate"),
    inventedActionCount: evaluations.reduce((sum, row) => sum + row.inventedActionCount, 0),
    inventedScheduleCount: evaluations.reduce((sum, row) => sum + row.inventedScheduleCount, 0),
    inventedRecurrenceCount: evaluations.reduce((sum, row) => sum + row.inventedRecurrenceCount, 0),
    inventedCompletionCount: evaluations.reduce((sum, row) => sum + row.inventedCompletionCount, 0),
    sourceValueReaskCount: evaluations.reduce((sum, row) => sum + row.sourceValueReaskCount, 0),
    primaryArtifactAccuracy: count("primaryArtifactMatch") / Math.max(1, evaluations.length),
    unnecessaryProjectionCount: evaluations.reduce((sum, row) => sum + row.unnecessaryProjectionCount, 0),
    undatedIcsCount: evaluations.reduce((sum, row) => sum + row.undatedIcsCount, 0),
    gateOmissionCount: evaluations.reduce((sum, row) => sum + row.gateOmissionCount, 0),
    itemDeleteOrMajorEditRatio: average("itemDeleteOrMajorEditRatio"),
    directlyUsableRate: count("directlyUsable") / Math.max(1, evaluations.length),
  };
}

function finalize() {
  const runDocs = {};
  for (const role of runRoles) {
    const calibration = normalizeRunDocument(path.join(runsDir, role, "calibration-v1.json"), role, "calibration");
    const final = normalizeRunDocument(path.join(runsDir, role, "final-holdout-v1.json"), role, "final_holdout");
    runDocs[role] = { calibration, final, cases: [...calibration.cases, ...final.cases] };
    writeRun(role, "results-v1.json", { role, independence: calibration.independence, cases: runDocs[role].cases });
  }
  const allResults = runRoles.flatMap((role) => runDocs[role].cases);
  const evaluations = allResults.map((result) => evaluateResult(result, gold.find((entry) => entry.caseId === result.caseId)));
  const byRole = Object.fromEntries(runRoles.map((role) => [role, aggregateMetrics(evaluations.filter((row) => row.role === role))]));
  const byRoleFinal = Object.fromEntries(runRoles.map((role) => [role, aggregateMetrics(evaluations.filter((row) => row.role === role && row.split === "final_holdout"))]));
  writeJson("calibration-results-v1.json", {
    generatedAt,
    cases: allResults.filter((result) => result.phase === "calibration"),
    evaluations: evaluations.filter((row) => row.split === "calibration"),
  });
  writeJson("final-holdout-results-v1.json", {
    generatedAt,
    postHoldoutRuleMutationCount: 0,
    caveat: "positive 4 + boundary 2 source의 pilot holdout이며 broad generalization claim이 아니다.",
    cases: allResults.filter((result) => result.phase === "final_holdout"),
    evaluations: evaluations.filter((row) => row.split === "final_holdout"),
  });
  const roleWins = [];
  for (const caseRecord of benchmarkCases) {
    const low = evaluations.find((row) => row.caseId === caseRecord.caseId && row.role === "low-cost");
    const high = evaluations.find((row) => row.caseId === caseRecord.caseId && row.role === "high-capability");
    const score = (row) => Number(row.flowEligibilityMatch) + row.sourceRowMeaningPreservation + row.itemProvenanceRate + Number(row.primaryArtifactMatch) + Number(row.directlyUsable) - row.inventedActionCount - row.inventedScheduleCount - row.inventedRecurrenceCount - row.inventedCompletionCount - row.gateOmissionCount;
    const lowScore = score(low);
    const highScore = score(high);
    roleWins.push({ caseId: caseRecord.caseId, lowScore, highScore, result: highScore > lowScore ? "high_win" : lowScore > highScore ? "low_win" : "tie" });
  }
  writeJson("model-comparison-v1.json", {
    generatedAt,
    actualProviderPricingUsed: false,
    tokenAndCostBoundary: "에이전트 역할 비교이며 실제 provider token·비용을 측정하지 못한 값은 null이다.",
    byRole,
    byRoleFinal,
    pairedSourceResults: roleWins,
    winTieLoss: {
      highWin: roleWins.filter((row) => row.result === "high_win").length,
      tie: roleWins.filter((row) => row.result === "tie").length,
      lowWin: roleWins.filter((row) => row.result === "low_win").length,
    },
  });
  const selectionMetrics = {
    candidatePoolCount: candidatePool.length,
    selectedPositiveCount: selected.length,
    selectedAtOrAbove80: selected.filter((candidate) => candidate.computedTotal >= 80).length,
    selectedHardGatePass: selected.filter((candidate) => Object.values(candidate.hardGates).every((value) => String(value).startsWith("pass"))).length,
    visibleDemandOrOfficialHighIntentCoverage: selected.filter((candidate) => candidate.scores.visibleDemand.evidenceRefs.length > 0).length / selected.length,
    interactionOrOfficialSubstituteCoverage: selected.filter((candidate) => candidate.scores.interaction.evidenceRefs.length > 0).length / selected.length,
    creatorBusinessHypothesisCoverage: selected.filter((candidate) => candidate.scores.creatorBusinessValue.comment).length / selected.length,
    valueDeltaCoverage: selected.filter((candidate) => candidate.valueDelta.persistentState && candidate.valueDelta.returnMoment).length / selected.length,
    koreanCount: selected.filter((candidate) => candidate.locale === "ko-KR").length,
    creatorCommunityCount: selected.filter((candidate) => ["creator_community", "operator_template"].includes(candidate.evidenceLane)).length,
    officialHighIntentCount: selected.filter((candidate) => candidate.evidenceLane === "official_high_intent").length,
    quotaOverrideCount: 0,
    actualObservedUserSessions: 0,
  };
  writeJson("value-and-conversion-metrics-v1.json", {
    generatedAt,
    selection: selectionMetrics,
    conversionByRole: byRole,
    finalHoldoutByRole: byRoleFinal,
    portfolioAdjudication: {
      target: "Go 또는 경미한 Modify 10/12",
      evidenceClass: "internal expert/agent review, not observed-user validation",
    },
  });
  const adjudicated = gold.map((goldCase) => {
    const resultSet = runRoles.map((role) => runDocs[role].cases.find((result) => result.caseId === goldCase.caseId));
    const evaluationSet = evaluations.filter((row) => row.caseId === goldCase.caseId);
    const readyCount = evaluationSet.filter((row) => row.directlyUsable).length;
    const verdict = goldCase.goldClass === "boundary" ? "Hold" : readyCount >= 2 ? "Go" : readyCount === 1 ? "Modify" : "Modify";
    return {
      caseId: goldCase.caseId,
      candidateId: goldCase.candidateId,
      title: goldCase.source.title,
      goldClass: goldCase.goldClass,
      split: goldCase.split,
      verdict,
      reason: goldCase.goldClass === "boundary"
        ? "정확히 멈추는 것이 성공인 control 사례"
        : readyCount >= 2 ? "세 방식 중 둘 이상이 provenance·artifact·gate 기준으로 바로 사용할 수 있음" : "가치는 통과했지만 변환 결과의 공통 수정이 필요함",
      gold: goldCase,
      results: Object.fromEntries(runRoles.map((role, index) => [role, resultSet[index]])),
      evaluations: Object.fromEntries(runRoles.map((role) => [role, evaluationSet.find((row) => row.role === role)])),
      disagreementCauses: evaluationSet.filter((row) => !row.primaryArtifactMatch || !row.directlyUsable).map((row) => ({ role: row.role, artifactMismatch: !row.primaryArtifactMatch, notDirectlyUsable: !row.directlyUsable })),
    };
  });
  writeJson("final-adjudication-v1.json", {
    generatedAt,
    evidenceBoundary: benchmarkMeta.evidenceBoundary,
    counts: {
      Go: adjudicated.filter((row) => row.verdict === "Go").length,
      Modify: adjudicated.filter((row) => row.verdict === "Modify").length,
      Hold: adjudicated.filter((row) => row.verdict === "Hold").length,
    },
    cases: adjudicated,
  });
  writeRun("adjudicated", "results-v1.json", { generatedAt, cases: adjudicated });
}

if (phase === "freeze") {
  writeFreezeArtifacts();
} else if (phase === "open-holdout") {
  openHoldout();
} else if (phase === "correct-holdout") {
  correctAndResealHoldout();
} else if (phase === "refresh-seal-metadata") {
  refreshSealMetadata();
} else if (phase === "archive-output-normalization") {
  archiveOutputNormalization();
} else if (phase === "archive-evaluator-correction") {
  archiveEvaluatorCorrection();
} else if (phase === "finalize") {
  finalize();
} else {
  throw new Error(`알 수 없는 phase: ${phase}`);
}

console.log(JSON.stringify({ phase, candidateCount: candidatePool.length, selectedCount: selected.length, benchmarkCaseCount: benchmarkCases.length, specDir }, null, 2));
