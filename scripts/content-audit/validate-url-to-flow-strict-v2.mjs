import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addError,
  auditDir,
  canonicalSha256,
  collectExecutorEvidence,
  exists,
  laneId,
  readJson,
  relativePath,
  repoRoot,
  sameSet,
  scheduleHasLiteralValue,
  schemaErrors,
  sha256,
  sourceText,
  specDir,
  verifyBaseFreezeIntegrity,
  verifyRevisionFreezeIntegrity,
  writeJson,
} from "./url-to-flow-strict-v2-core.mjs";
import { deriveDefectSelection } from "./record-url-to-flow-strict-v2-defect-selection.mjs";

const casesPath = path.join(specDir, "cases-v2.json");
const schemaPath = path.join(specDir, "proposal-schema-v2.json");
const protocolPath = path.join(specDir, "protocol-v2.json");
const freezePath = path.join(specDir, "freeze-manifest.json");

function parseArgs(argv) {
  const args = { all: false, round: null, file: null, proposal: null, out: null, json: false, expectedPromptVersion: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--all") args.all = true;
    else if (token === "--json") args.json = true;
    else if (["--round", "--file", "--proposal", "--out", "--expected-prompt-version"].includes(token)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${token} requires a value`);
      const key = token
        .slice(2)
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      args[key] = value;
      index += 1;
    } else throw new Error(`Unknown argument: ${token}`);
  }
  const modeCount = Number(args.all) + Number(Boolean(args.file)) + Number(Boolean(args.proposal));
  if (modeCount !== 1) throw new Error("Choose exactly one of --all, --file, or --proposal");
  if (args.round && !args.all) throw new Error("--round requires --all");
  if (args.round && !/^round-[123]$/.test(args.round)) throw new Error(`Invalid round: ${args.round}`);
  if (args.proposal && !/^url-to-flow-prompt-v2\.[01]$/.test(args.expectedPromptVersion ?? "")) {
    throw new Error("--proposal requires --expected-prompt-version url-to-flow-prompt-v2.0|v2.1");
  }
  return args;
}

function normalizeWords(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\s·,./()[\]{}:_-]+/gu, "")
    .toLowerCase();
}

function titleAllowed(row, title) {
  const source = normalizeWords(row.title);
  const candidate = normalizeWords(title);
  const explicitAction = /확인|판단|결정|선택|보류|준비|신청|등록|방문|청소|제출|수령|갱신/u.test(row.title);
  if (row.rowType === "check") {
    if (explicitAction) return candidate === source || candidate === `${source}${normalizeWords("하기")}`;
    return candidate === `${source}${normalizeWords("확인하기")}`;
  }
  if (row.rowType === "procedure") return candidate === source || candidate === `${source}${normalizeWords("하기")}`;
  if (row.rowType === "table_row") return candidate === `${source}${normalizeWords("완료하기")}`;
  if (row.rowType === "resource") return candidate === `${source}${normalizeWords("열어보기")}`;
  if (row.rowType === "date") {
    if (explicitAction) return candidate === source || candidate === `${source}${normalizeWords("하기")}`;
    return candidate === `${source}${normalizeWords("확인하기")}`;
  }
  return false;
}

function expectedIntentPairs(row) {
  if (row.rowType === "check") {
    if (/판단|결정|선택|보류/u.test(row.title)) return new Set(["decide|decision"]);
    if (/준비|신청|등록|방문|청소|제출|수령|갱신/u.test(row.title)) return new Set(["act|check"]);
    return new Set(["inspect|check"]);
  }
  if (row.rowType === "procedure") return new Set(["act|check"]);
  if (row.rowType === "table_row") return new Set(["act|check"]);
  if (row.rowType === "resource") return new Set(["open_resource|check"]);
  if (row.rowType === "date") {
    return /방문|신청|제출|예약|참석|수령|갱신|검사하기|진행/u.test(row.title)
      ? new Set(["act|check"])
      : new Set(["inspect|check"]);
  }
  return new Set();
}

function classifyScheduleKind(sourceValue) {
  if (typeof sourceValue !== "string") return null;
  const value = sourceValue.trim();
  if (!value) return null;
  if (
    /\d+\s*(?:일|주|개월|달|년)\s*(?:에\s*)?(?:한\s*번|마다|간격|주기|회)/u.test(value) ||
    /(?:매일|매주|매월|매년|격주|격월)/u.test(value)
  ) {
    return "recurrence";
  }

  const offsetMatches = value.match(/D[+-]\d+/giu) ?? [];
  const dateMatches = [
    ...(value.match(/\d{4}[./-]\d{1,2}(?:[./-]\d{1,2})?/gu) ?? []),
    ...(value.match(/\d{1,2}\s*월\s*\d{1,2}\s*일/gu) ?? []),
  ];
  const scheduleAtomCount = offsetMatches.length + dateMatches.length;
  const hasRangeBoundary = /(?:~|〜|–|—|\s-\s|부터|까지)/u.test(value);
  if (scheduleAtomCount >= 2 && hasRangeBoundary) return "window";
  if (offsetMatches.length > 0) return "offset";
  if (dateMatches.length > 0) return "date";
  return null;
}

function expectedArtifactForCase(protocol, eligibleRows) {
  const policy = protocol?.strictArtifactPolicy;
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    return { artifact: null, policyKey: null, error: "strict_artifact_policy_missing" };
  }
  if (!Array.isArray(eligibleRows) || eligibleRows.length === 0) {
    return { artifact: null, policyKey: null, error: "eligible_rows_missing_for_artifact" };
  }

  const literalSchedulePresent = eligibleRows.some((row) => scheduleHasLiteralValue(sourceText(row)));
  let policyKey;
  if (literalSchedulePresent) policyKey = "literalSchedulePresent";
  else if (eligibleRows.every((row) => row.rowType === "table_row")) policyKey = "allTableRows";
  else if (eligibleRows.every((row) => row.rowType === "resource")) {
    policyKey = eligibleRows.length === 1 ? "oneResource" : "multipleResources";
  } else {
    policyKey = eligibleRows.length === 1 ? "oneOtherEligibleRow" : "multipleOtherEligibleRows";
  }

  const artifact = policy[policyKey];
  if (!["calendar", "checklist", "todo", "sheet", "memo"].includes(artifact)) {
    return { artifact: null, policyKey, error: "strict_artifact_policy_value_invalid" };
  }
  return { artifact, policyKey, error: null };
}

function sameOrderedArray(actual, expected) {
  return (
    Array.isArray(actual) &&
    Array.isArray(expected) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function resolveSimplePath(root, pathValue) {
  if (typeof pathValue !== "string" || !/^\$(?:\.[A-Za-z0-9_-]+|\[[0-9]+\])+$/.test(pathValue)) {
    return { found: false, value: undefined };
  }
  const tokens = pathValue
    .slice(1)
    .match(/\.[A-Za-z0-9_-]+|\[[0-9]+\]/g)
    ?.map((token) => (token.startsWith(".") ? token.slice(1) : Number(token.slice(1, -1)))) ?? [];
  let current = root;
  for (const token of tokens) {
    if (current === null || current === undefined || !Object.hasOwn(current, token)) {
      return { found: false, value: undefined };
    }
    current = current[token];
  }
  return { found: true, value: current };
}

export function validateStrictProposal({ proposal, strictCase, schema, protocol, expectedPromptVersion }) {
  const errors = schemaErrors(proposal, schema, schema);
  const input = strictCase.generatorInput;
  const rows = input?.sourceRows ?? [];
  const rowByRef = new Map(rows.map((row) => [row.sourceRowRef, row]));
  const supportingRefs = new Set(input?.sourceOwnership.supportingSourceRefs ?? []);
  const eligibleRows = rows.filter(
    (row) => !supportingRefs.has(row.sourceRef) && row.rowType !== "reference",
  );
  const referenceRows = rows.filter(
    (row) => supportingRefs.has(row.sourceRef) || row.rowType === "reference",
  );
  const proposalItems = Array.isArray(proposal?.items) ? proposal.items : [];
  const proposalOmissions = Array.isArray(proposal?.omittedRows) ? proposal.omittedRows : [];
  const proposalProjections = Array.isArray(proposal?.projections) ? proposal.projections : [];
  const reviewUncertaintyCodes = Array.isArray(proposal?.review?.uncertaintyCodes)
    ? proposal.review.uncertaintyCodes
    : [];
  const reviewHumanRefs = Array.isArray(proposal?.review?.humanCheckRowRefs)
    ? proposal.review.humanCheckRowRefs
    : [];

  if (proposal?.schemaVersion !== "flowme-semantic-proposal-v2") {
    addError(errors, "schema_version_mismatch", "$.schemaVersion");
  }
  if (proposal?.requestRef !== strictCase.requestRef) {
    addError(errors, "request_ref_mismatch", "$.requestRef", {
      expected: strictCase.requestRef,
      actual: proposal?.requestRef,
    });
  }
  if (proposal?.sampleRef !== strictCase.sampleRef) {
    addError(errors, "sample_ref_mismatch", "$.sampleRef", {
      expected: strictCase.sampleRef,
      actual: proposal?.sampleRef,
    });
  }

  if (!input) {
    const expected = strictCase.preflightResult;
    if (proposal?.promptVersion !== "deterministic-preflight-v2") {
      addError(errors, "negative_prompt_version_mismatch", "$.promptVersion");
    }
    if (
      proposal?.result?.state !== "blocked" ||
      proposal?.result?.reasonCode !== expected.errorCode ||
      proposal?.result?.disposition !== expected.recommendedDisposition
    ) {
      addError(errors, "negative_disposition_mismatch", "$.result", {
        expected: {
          state: "blocked",
          reasonCode: expected.errorCode,
          disposition: expected.recommendedDisposition,
        },
        actual: proposal?.result,
      });
    }
    if (proposal?.result?.primaryArtifact !== null) {
      addError(errors, "negative_primary_artifact_present", "$.result.primaryArtifact");
    }
    if (proposalItems.length !== 0) addError(errors, "negative_items_present", "$.items");
    if (proposalOmissions.length !== 0) addError(errors, "negative_omissions_present", "$.omittedRows");
    if (proposalProjections.length !== 0) addError(errors, "negative_projections_present", "$.projections");
    if (reviewUncertaintyCodes.length !== 0) {
      addError(errors, "negative_uncertainty_present", "$.review.uncertaintyCodes");
    }
    if (reviewHumanRefs.length !== 0) {
      addError(errors, "negative_human_refs_present", "$.review.humanCheckRowRefs");
    }
    return {
      sampleRef: strictCase.sampleRef,
      auditCaseId: strictCase.auditCaseId,
      passed: errors.length === 0,
      errors,
      metrics: {
        receivedRows: 0,
        exactlyOnceRows: 0,
        eligibleRows: 0,
        eligibleRowsMappedToItems: 0,
        itemCount: 0,
        deterministicNegative: true,
      },
      proposalFingerprint: proposal === undefined ? null : canonicalSha256(proposal),
    };
  }

  if (proposal?.promptVersion !== expectedPromptVersion) {
    addError(errors, "prompt_version_mismatch", "$.promptVersion", {
      expected: expectedPromptVersion,
      actual: proposal?.promptVersion,
    });
  }
  const state = proposal?.result?.state;
  if (state !== "proposal") addError(errors, "frozen_positive_state_must_be_proposal", "$.result.state", state);
  if (proposal?.result?.reasonCode !== null) addError(errors, "proposal_reason_must_be_null", "$.result.reasonCode");
  if (proposal?.result?.disposition !== "review") addError(errors, "proposal_disposition_must_be_review", "$.result.disposition");

  const accounting = new Map(rows.map((row) => [row.sourceRowRef, 0]));
  const itemRefs = new Set();
  const itemByRef = new Map();
  for (const [index, item] of proposalItems.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      addError(errors, "malformed_item", `$.items[${index}]`);
      continue;
    }
    if (itemRefs.has(item.itemRef)) addError(errors, "duplicate_item_ref", `$.items[${index}].itemRef`, item.itemRef);
    itemRefs.add(item.itemRef);
    itemByRef.set(item.itemRef, item);
    const itemSourceRowRefs = Array.isArray(item.sourceRowRefs) ? item.sourceRowRefs : [];
    if (itemSourceRowRefs.length !== 1) {
      addError(errors, "strict_profile_one_row_per_item", `$.items[${index}].sourceRowRefs`);
    }
    for (const rowRef of itemSourceRowRefs) {
      const row = rowByRef.get(rowRef);
      if (!row) {
        addError(errors, "unknown_item_source_row", `$.items[${index}].sourceRowRefs`, rowRef);
        continue;
      }
      accounting.set(rowRef, (accounting.get(rowRef) ?? 0) + 1);
      if (supportingRefs.has(row.sourceRef)) {
        addError(errors, "supporting_source_controls_item", `$.items[${index}].sourceRowRefs`, rowRef);
      }
      if (row.rowType === "reference") {
        addError(errors, "reference_row_controls_item", `$.items[${index}].sourceRowRefs`, rowRef);
      }
      if (!titleAllowed(row, item.title)) {
        addError(errors, "item_title_outside_row_license", `$.items[${index}].title`, {
          sourceTitle: row.title,
          actual: item.title,
        });
      }
      const pair = `${item.intent}|${item.completionMode}`;
      if (!expectedIntentPairs(row).has(pair)) {
        addError(errors, "row_type_intent_completion_mismatch", `$.items[${index}]`, {
          rowType: row.rowType,
          pair,
        });
      }
      if (item.memo !== null && !sourceText(row).includes(item.memo)) {
        addError(errors, "memo_not_literal_source_text", `$.items[${index}].memo`, item.memo);
      }
    }
    const schedule = item.scheduleEvidence;
    if (schedule !== null && schedule !== undefined) {
      if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
        addError(errors, "malformed_schedule_evidence", `$.items[${index}].scheduleEvidence`);
        continue;
      }
      const scheduleSourceRowRefs = Array.isArray(schedule.sourceRowRefs)
        ? schedule.sourceRowRefs
        : [];
      if (!sameSet(scheduleSourceRowRefs, itemSourceRowRefs)) {
        addError(errors, "schedule_row_not_owned_by_item", `$.items[${index}].scheduleEvidence.sourceRowRefs`);
      }
      let literal = false;
      for (const rowRef of scheduleSourceRowRefs) {
        const row = rowByRef.get(rowRef);
        if (row && sourceText(row).includes(schedule.sourceText ?? "")) literal = true;
      }
      if (!literal || !schedule.sourceText) {
        addError(errors, "schedule_source_text_not_literal", `$.items[${index}].scheduleEvidence.sourceText`);
      }
      if (!scheduleHasLiteralValue(schedule.sourceText)) {
        addError(errors, "schedule_value_not_supported", `$.items[${index}].scheduleEvidence.sourceText`, schedule.sourceText);
      }
      const expectedScheduleKind = classifyScheduleKind(schedule.sourceText);
      if (!expectedScheduleKind) {
        addError(errors, "schedule_kind_unclassifiable", `$.items[${index}].scheduleEvidence.kind`, schedule.sourceText);
      } else if (schedule.kind !== expectedScheduleKind) {
        addError(errors, "schedule_kind_mismatch", `$.items[${index}].scheduleEvidence.kind`, {
          expected: expectedScheduleKind,
          actual: schedule.kind,
        });
      }
    }
  }

  for (const [index, omission] of proposalOmissions.entries()) {
    if (!omission || typeof omission !== "object" || Array.isArray(omission)) {
      addError(errors, "malformed_omission", `$.omittedRows[${index}]`);
      continue;
    }
    const row = rowByRef.get(omission.sourceRowRef);
    if (!row) {
      addError(errors, "unknown_omitted_source_row", `$.omittedRows[${index}].sourceRowRef`, omission.sourceRowRef);
      continue;
    }
    accounting.set(omission.sourceRowRef, (accounting.get(omission.sourceRowRef) ?? 0) + 1);
    if (supportingRefs.has(row.sourceRef) && omission.reasonCode !== "supporting_source_boundary") {
      addError(errors, "supporting_row_wrong_omission_reason", `$.omittedRows[${index}].reasonCode`);
    }
    if (!supportingRefs.has(row.sourceRef) && row.rowType === "reference" && omission.reasonCode !== "reference_only") {
      addError(errors, "reference_row_wrong_omission_reason", `$.omittedRows[${index}].reasonCode`);
    }
  }

  for (const [rowRef, count] of accounting.entries()) {
    if (count !== 1) addError(errors, "source_row_accounting_not_exactly_once", "$", { rowRef, count });
  }
  for (const row of eligibleRows) {
    const mapped = proposalItems.some((item) => item?.sourceRowRefs?.includes?.(row.sourceRowRef));
    if (!mapped) addError(errors, "eligible_source_row_not_itemized", "$", row.sourceRowRef);
  }
  for (const row of referenceRows) {
    const omitted = proposalOmissions.some((entry) => entry?.sourceRowRef === row.sourceRowRef);
    if (!omitted) addError(errors, "reference_or_supporting_row_not_omitted", "$", row.sourceRowRef);
  }
  if (proposalItems.length > input.maxItems) addError(errors, "max_items_exceeded", "$.items");

  const artifactDecision = expectedArtifactForCase(protocol, eligibleRows);
  if (artifactDecision.error) {
    addError(errors, artifactDecision.error, "$.result.primaryArtifact", artifactDecision.policyKey);
  }
  if (proposal?.result?.primaryArtifact === "hybrid") {
    addError(errors, "hybrid_artifact_forbidden", "$.result.primaryArtifact");
  }
  if (artifactDecision.artifact && proposal?.result?.primaryArtifact !== artifactDecision.artifact) {
    addError(errors, "primary_artifact_policy_mismatch", "$.result.primaryArtifact", {
      policyKey: artifactDecision.policyKey,
      expected: artifactDecision.artifact,
      actual: proposal?.result?.primaryArtifact,
    });
  }

  const projections = proposalProjections;
  if (projections.length !== 1) {
    addError(errors, "exactly_one_projection_required", "$.projections", projections.length);
  }
  const projectionTargets = new Set();
  for (const [index, projection] of projections.entries()) {
    if (!projection || typeof projection !== "object" || Array.isArray(projection)) {
      addError(errors, "malformed_projection", `$.projections[${index}]`);
      continue;
    }
    if (projectionTargets.has(projection.target)) {
      addError(errors, "duplicate_projection_target", `$.projections[${index}].target`, projection.target);
    }
    projectionTargets.add(projection.target);
    const projectionItemRefs = Array.isArray(projection.itemRefs) ? projection.itemRefs : [];
    for (const itemRef of projectionItemRefs) {
      if (!itemByRef.has(itemRef)) addError(errors, "unknown_projection_item", `$.projections[${index}].itemRefs`, itemRef);
    }
    if (!sameSet(projectionItemRefs, [...itemRefs]) || projectionItemRefs.length !== itemRefs.size) {
      addError(errors, "projection_item_refs_must_exactly_match_items", `$.projections[${index}].itemRefs`, {
        expected: [...itemRefs],
        actual: projection.itemRefs,
      });
    }
  }
  if (artifactDecision.artifact && projections.length === 1 && projections[0]?.target !== artifactDecision.artifact) {
    addError(errors, "projection_target_policy_mismatch", "$.projections[0].target", {
      expected: artifactDecision.artifact,
      actual: projections[0]?.target,
    });
  }
  const hasSchedule = proposalItems.some((item) => item?.scheduleEvidence !== null && item?.scheduleEvidence !== undefined);
  if (projectionTargets.has("calendar") && !hasSchedule) {
    addError(errors, "calendar_without_schedule_evidence", "$.projections");
  }
  if (proposal?.result?.primaryArtifact === "calendar" && !hasSchedule) {
    addError(errors, "scheduled_artifact_without_schedule_evidence", "$.result.primaryArtifact");
  }

  const humanRefs = reviewHumanRefs;
  for (const rowRef of humanRefs) {
    if (!rowByRef.has(rowRef)) addError(errors, "unknown_human_check_row", "$.review.humanCheckRowRefs", rowRef);
  }
  const requiredUncertaintyCodes = new Set();
  const requiredHumanRefs = new Set();
  for (const row of rows) {
    if (row.rowType === "resource") {
      requiredUncertaintyCodes.add("resource_contents_unseen");
      requiredHumanRefs.add(row.sourceRowRef);
    }
    if (row.rowType === "date" && !scheduleHasLiteralValue(sourceText(row))) {
      requiredUncertaintyCodes.add("missing_date_value");
      requiredHumanRefs.add(row.sourceRowRef);
    }
    if (supportingRefs.has(row.sourceRef)) {
      requiredUncertaintyCodes.add("supporting_source_not_structural");
      requiredHumanRefs.add(row.sourceRowRef);
    }
  }
  const uncertaintyCodes = reviewUncertaintyCodes;
  if (!sameSet(uncertaintyCodes, [...requiredUncertaintyCodes]) || uncertaintyCodes.length !== requiredUncertaintyCodes.size) {
    addError(errors, "uncertainty_codes_not_exact_required_set", "$.review.uncertaintyCodes", {
      expected: [...requiredUncertaintyCodes],
      actual: uncertaintyCodes,
    });
  }
  if (!sameSet(humanRefs, [...requiredHumanRefs]) || humanRefs.length !== requiredHumanRefs.size) {
    addError(errors, "human_check_rows_not_exact_required_set", "$.review.humanCheckRowRefs", {
      expected: [...requiredHumanRefs],
      actual: humanRefs,
    });
  }

  return {
    sampleRef: strictCase.sampleRef,
    auditCaseId: strictCase.auditCaseId,
    passed: errors.length === 0,
    errors,
    metrics: {
      receivedRows: rows.length,
      exactlyOnceRows: [...accounting.values()].filter((count) => count === 1).length,
      eligibleRows: eligibleRows.length,
      eligibleRowsMappedToItems: eligibleRows.filter((row) =>
        proposalItems.some((item) => item?.sourceRowRefs?.includes?.(row.sourceRowRef)),
      ).length,
      itemCount: proposalItems.length,
      deterministicNegative: false,
    },
    proposalFingerprint: proposal === undefined ? null : canonicalSha256(proposal),
  };
}

function expectedBindings({
  freeze,
  taskEntry,
  promptVersion,
  revisionFreeze,
  defectSelectionSha256,
  baseFreezeSha256,
  revisionFreezeSha256,
  round2ReviewValidationSha256,
}) {
  const revised = promptVersion === "url-to-flow-prompt-v2.1";
  return {
    baseFreezeSha256,
    revisionFreezeSha256: revised ? revisionFreezeSha256 : null,
    protocolSha256: freeze.bindings.protocolSha256,
    caseSetSha256: freeze.bindings.caseSetSha256,
    caseSetSemanticSha256: freeze.bindings.caseSetSemanticSha256,
    opaqueMapSha256: freeze.bindings.opaqueMapSha256,
    promptTemplateSha256: revised ? revisionFreeze?.promptTemplateSha256 : freeze.bindings.promptTemplateSha256,
    schemaSha256: freeze.bindings.schemaSha256,
    rubricSha256: freeze.bindings.rubricSha256,
    packetManifestSha256: freeze.bindings.packetManifestSha256,
    taskPayloadManifestSha256: revised ? revisionFreeze?.taskPayloadManifestSha256 : freeze.bindings.taskPayloadManifestSha256,
    exactTaskPayloadSha256: taskEntry.taskPayloadSha256,
    defectSelectionSha256,
    round2ReviewValidationSha256,
  };
}

async function validateRunEnvelope({
  filePath,
  envelope,
  casesByAuditId,
  schema,
  protocol,
  freeze,
  taskByKey,
  revisionFreeze,
  selection,
  selectionSha256,
  expectedRound,
  baseFreezeSha256,
  revisionFreezeSha256,
  round2ReviewEvidence,
}) {
  const errors = [];
  if (envelope?.runEnvelopeVersion !== "flowme-url-to-flow-strict-run-v2") addError(errors, "run_envelope_version", "$.runEnvelopeVersion");
  if (envelope?.laneId !== laneId) addError(errors, "lane_id_mismatch", "$.laneId");
  if (!/^round-[123]$/.test(envelope?.round ?? "")) addError(errors, "invalid_round", "$.round");
  if (expectedRound && envelope?.round !== expectedRound) {
    addError(errors, "round_mismatch", "$.round", { expected: expectedRound, actual: envelope?.round });
  }
  if (path.basename(filePath) !== `${envelope?.batchRef}.json`) {
    addError(errors, "batch_filename_mismatch", "$.batchRef", {
      expected: path.basename(filePath, ".json"),
      actual: envelope?.batchRef,
    });
  }
  const expectedAuditIds = protocol.batchAssignment[envelope?.batchRef];
  const expectedSampleRefs = expectedAuditIds?.map((auditCaseId) => casesByAuditId.get(auditCaseId)?.sampleRef);
  const taskEntry = taskByKey.get(`${envelope?.promptVersion}|${envelope?.batchRef}`);
  if (!expectedAuditIds || !taskEntry) addError(errors, "unknown_batch", "$.batchRef", envelope?.batchRef);
  if (envelope?.evidenceClass !== "current_session_model_proxy") addError(errors, "evidence_class_mismatch", "$.evidenceClass");
  if (envelope?.executor?.forkTurns !== "none") addError(errors, "fresh_context_fork_turns_required", "$.executor.forkTurns");
  if (envelope?.executor?.freshContextMethod !== "spawn_agent_fork_none") {
    addError(errors, "fresh_context_method_mismatch", "$.executor.freshContextMethod");
  }
  if (!envelope?.executor?.agentTaskId) addError(errors, "agent_task_id_required", "$.executor.agentTaskId");
  if (!envelope?.executor?.taskName) addError(errors, "agent_task_name_required", "$.executor.taskName");
  if (!Array.isArray(envelope?.assemblyIssues)) {
    addError(errors, "assembly_issues_array_required", "$.assemblyIssues");
  } else if (envelope.assemblyIssues.length > 0) {
    addError(errors, "assembly_issues_present", "$.assemblyIssues", envelope.assemblyIssues);
  }
  if (envelope?.protocolState?.assemblyPassed !== true) {
    addError(errors, "assembly_pass_required", "$.protocolState.assemblyPassed", envelope?.protocolState?.assemblyPassed);
  }
  for (const key of ["provider", "model", "tier", "sampling", "inputTokens", "outputTokens", "latencyMs", "cost", "currency"]) {
    if (envelope?.measurement?.[key] !== null) addError(errors, "unmeasured_field_must_be_null", `$.measurement.${key}`);
  }
  if (taskEntry) {
    if (!sameOrderedArray(taskEntry.auditCaseIds, expectedAuditIds)) {
      addError(errors, "task_audit_case_order_mismatch", "$.batchRef", {
        expected: expectedAuditIds,
        actual: taskEntry.auditCaseIds,
      });
    }
    if (!sameOrderedArray(taskEntry.sampleRefs, expectedSampleRefs)) {
      addError(errors, "task_sample_ref_order_mismatch", "$.batchRef", {
        expected: expectedSampleRefs,
        actual: taskEntry.sampleRefs,
      });
    }
    const expected = expectedBindings({
      freeze,
      taskEntry,
      promptVersion: envelope.promptVersion,
      revisionFreeze,
      defectSelectionSha256: envelope.round === "round-1" ? null : selectionSha256,
      baseFreezeSha256,
      revisionFreezeSha256,
      round2ReviewValidationSha256:
        envelope.round === "round-3" ? round2ReviewEvidence?.sha256 ?? null : null,
    });
    for (const [key, value] of Object.entries(expected)) {
      if (envelope?.bindings?.[key] !== value) addError(errors, "binding_mismatch", `$.bindings.${key}`, { expected: value, actual: envelope?.bindings?.[key] });
    }
  }
  if (envelope?.round === "round-1") {
    if (envelope.promptVersion !== "url-to-flow-prompt-v2.0") addError(errors, "round1_prompt_must_be_v2_0", "$.promptVersion");
    if (envelope?.protocolState?.revisionClass !== null) addError(errors, "round1_revision_class_must_be_null", "$.protocolState.revisionClass");
  } else {
    const expectedPrompt =
      selection?.action === "unchanged_confirmation"
        ? "url-to-flow-prompt-v2.0"
        : selection?.action === "prompt_one_defect_revision"
          ? "url-to-flow-prompt-v2.1"
          : null;
    if (!expectedPrompt || envelope?.promptVersion !== expectedPrompt) addError(errors, "round_prompt_selection_mismatch", "$.promptVersion");
    if ((selection?.revisionClass ?? null) !== (envelope?.protocolState?.revisionClass ?? null)) addError(errors, "revision_class_selection_mismatch", "$.protocolState.revisionClass");
  }
  if (envelope?.round === "round-3") {
    if (!round2ReviewEvidence) {
      addError(errors, "round2_review_validation_missing", "$.bindings.round2ReviewValidationSha256");
    } else {
      const review = round2ReviewEvidence.value;
      const requiredGateKeys = [
        "automatedValidation",
        "reviewEvidenceIntegrityRecomputed",
        "exactReviewBatches",
        "reviewerEnvelopeIntegrity",
        "reviewerIsolation",
        "globalExecutorEvidence",
        "globalExecutorIdsUnique",
        "globalExecutorRolesDisjoint",
        "positiveReviewCoverage",
        "strictEligibleRowProfile",
        "negativeExact",
        "sourceRowAccounting",
        "unsupportedZero",
        "itemKeep",
        "sevenAxisAverage",
        "executionClarity",
        "contentFidelityCoverage",
        "sourceSafetySeparation",
      ];
      if (
        review?.reviewValidationVersion !== "flowme-url-to-flow-strict-review-validation-v2" ||
        review?.laneId !== laneId ||
        review?.round !== "round-2" ||
        review?.passed !== true ||
        !review?.gates ||
        !sameSet(Object.keys(review.gates), requiredGateKeys) ||
        Object.keys(review.gates).length !== requiredGateKeys.length ||
        !Object.values(review.gates).every((value) => value === true)
      ) {
        addError(errors, "round2_review_validation_not_independently_passing", "$.bindings.round2ReviewValidationSha256");
      }
      if (
        !round2ReviewEvidence.automatedValidationSha256 ||
        review?.evidenceBindings?.automatedValidationFile !==
          round2ReviewEvidence.automatedValidationFile ||
        review?.evidenceBindings?.automatedValidationSha256 !==
          round2ReviewEvidence.automatedValidationSha256
      ) {
        addError(
          errors,
          "round2_review_automated_validation_binding_mismatch",
          "$.bindings.round2ReviewValidationSha256",
        );
      }
      if (envelope?.bindings?.round2ReviewValidationSha256 !== round2ReviewEvidence.sha256) {
        addError(errors, "round2_review_validation_hash_mismatch", "$.bindings.round2ReviewValidationSha256", {
          expected: round2ReviewEvidence.sha256,
          actual: envelope?.bindings?.round2ReviewValidationSha256,
        });
      }
    }
  }
  if (typeof envelope?.rawResponse !== "string") {
    addError(errors, "raw_response_string_required", "$.rawResponse");
  } else if (sha256(envelope.rawResponse) !== envelope?.rawResponseSha256) {
    addError(errors, "raw_response_hash_mismatch", "$.rawResponseSha256");
  }
  const safeRawRound = typeof envelope?.round === "string" ? envelope.round : "invalid-round";
  const safeRawBatch =
    typeof envelope?.batchRef === "string" ? envelope.batchRef : "invalid-batch";
  const expectedRawPath = path.join(
    auditDir,
    "raw",
    safeRawRound,
    `${safeRawBatch}.txt`,
  );
  if (envelope?.rawResponseSource !== relativePath(expectedRawPath)) {
    addError(errors, "raw_response_source_path_mismatch", "$.rawResponseSource", {
      expected: relativePath(expectedRawPath),
      actual: envelope?.rawResponseSource,
    });
  }
  if (!(await exists(expectedRawPath))) {
    addError(errors, "raw_response_source_missing", "$.rawResponseSource", relativePath(expectedRawPath));
  } else {
    const currentRawBytes = await readFile(expectedRawPath);
    const currentRawResponse = currentRawBytes.toString("utf8");
    if (currentRawResponse !== envelope?.rawResponse) {
      addError(errors, "raw_response_source_bytes_mismatch", "$.rawResponse");
    }
    if (sha256(currentRawBytes) !== envelope?.rawResponseSha256) {
      addError(errors, "raw_response_source_hash_mismatch", "$.rawResponseSha256");
    }
  }

  let rawResults = null;
  try {
    rawResults = JSON.parse(envelope?.rawResponse ?? "");
    if (!Array.isArray(rawResults)) throw new Error("raw response must be array");
  } catch (error) {
    addError(errors, "raw_response_not_bare_json_array", "$.rawResponse", error.message);
  }
  if (rawResults && canonicalSha256(rawResults) !== envelope?.parsedModelResultsSha256) {
    addError(errors, "parsed_model_results_hash_mismatch", "$.parsedModelResultsSha256");
  }
  if (rawResults && taskEntry && rawResults.length !== taskEntry.modelInputCaseCount) {
    addError(errors, "model_result_count_mismatch", "$.rawResponse", { expected: taskEntry.modelInputCaseCount, actual: rawResults.length });
  }
  if (!Array.isArray(envelope?.outputs) || envelope.outputs.length !== 4) {
    addError(errors, "four_pipeline_outputs_required", "$.outputs", envelope?.outputs?.length);
  }
  const outputs = Array.isArray(envelope?.outputs) ? envelope.outputs : [];
  if (expectedAuditIds && !sameSet(outputs.map((entry) => entry?.auditCaseId), expectedAuditIds)) {
    addError(errors, "batch_case_membership_mismatch", "$.outputs");
  }
  if (expectedAuditIds) {
    for (let index = 0; index < expectedAuditIds.length; index += 1) {
      if (outputs[index]?.auditCaseId !== expectedAuditIds[index]) {
        addError(errors, "output_audit_case_order_mismatch", `$.outputs[${index}].auditCaseId`, {
          expected: expectedAuditIds[index],
          actual: outputs[index]?.auditCaseId,
        });
      }
      if (outputs[index]?.sampleRef !== expectedSampleRefs[index]) {
        addError(errors, "output_sample_ref_order_mismatch", `$.outputs[${index}].sampleRef`, {
          expected: expectedSampleRefs[index],
          actual: outputs[index]?.sampleRef,
        });
      }
    }
  }
  if (taskEntry) {
    if (envelope?.counts?.pipelineCaseCount !== 4) addError(errors, "pipeline_case_count_mismatch", "$.counts.pipelineCaseCount");
    if (envelope?.counts?.modelInputCaseCount !== taskEntry.modelInputCaseCount) addError(errors, "model_input_count_mismatch", "$.counts.modelInputCaseCount");
    if (envelope?.counts?.deterministicCaseCount !== taskEntry.deterministicCaseCount) addError(errors, "deterministic_count_mismatch", "$.counts.deterministicCaseCount");
    if (envelope?.counts?.outputCount !== 4) addError(errors, "output_count_mismatch", "$.counts.outputCount");
  }

  const results = [];
  const positiveOutputProposals = [];
  for (const [index, output] of outputs.entries()) {
    const strictCase = casesByAuditId.get(output?.auditCaseId);
    if (!strictCase) {
      addError(errors, "unknown_audit_case", `$.outputs[${index}].auditCaseId`, output?.auditCaseId);
      continue;
    }
    if (output?.sampleRef !== strictCase.sampleRef) addError(errors, "output_sample_ref_mismatch", `$.outputs[${index}].sampleRef`);
    const positive = Boolean(strictCase.generatorInput);
    if (output?.modelInvoked !== positive) addError(errors, "model_invoked_mismatch", `$.outputs[${index}].modelInvoked`);
    const expectedPacketHash = positive ? freeze.packetSha256BySampleRef[strictCase.sampleRef] : null;
    if (output?.packetSha256 !== expectedPacketHash) addError(errors, "output_packet_hash_mismatch", `$.outputs[${index}].packetSha256`);
    if (positive) positiveOutputProposals.push(output?.proposal);
    results.push(
      validateStrictProposal({
        proposal: output?.proposal,
        strictCase,
        schema,
        protocol,
        expectedPromptVersion: envelope?.promptVersion,
      }),
    );
  }
  if (rawResults && canonicalSha256(rawResults) !== canonicalSha256(positiveOutputProposals)) {
    addError(errors, "raw_results_do_not_match_positive_outputs", "$.outputs");
  }
  return {
    file: relativePath(filePath),
    round: envelope?.round ?? null,
    batchRef: envelope?.batchRef ?? null,
    passed: errors.length === 0 && results.every((entry) => entry.passed),
    envelopeErrors: errors,
    results,
  };
}

async function listRoundFiles(round) {
  const root = path.join(auditDir, "runs", round);
  const issues = [];
  if (!(await exists(root))) {
    issues.push({ code: "round_directory_missing", detail: relativePath(root) });
    return { files: [], issues };
  }
  const entries = await readdir(root, { withFileTypes: true });
  const expectedNames = ["batch-a.json", "batch-b.json", "batch-c.json"];
  const allowedJsonNames = new Set([
    ...expectedNames,
    "validation.json",
    ...(round === "round-1" ? ["defect-selection.json"] : []),
  ]);
  for (const entry of entries) {
    if (
      entry.name.toLowerCase().endsWith(".json") &&
      (!entry.isFile() || !allowedJsonNames.has(entry.name))
    ) {
      issues.push({
        code: "unexpected_round_json",
        detail: relativePath(path.join(root, entry.name)),
      });
    }
  }
  const files = [];
  for (const expectedName of expectedNames) {
    const entry = entries.find((candidate) => candidate.name === expectedName && candidate.isFile());
    const filePath = path.join(root, expectedName);
    if (entry) files.push(filePath);
    else issues.push({ code: "expected_batch_json_missing", detail: relativePath(filePath) });
  }
  return { files, issues };
}

export async function validateStrictV2(argv) {
  const args = parseArgs(argv);
  const validationRound = args.all ? args.round ?? "round-1" : null;
  const { value: cases } = await readJson(casesPath);
  const { value: schema } = await readJson(schemaPath);
  const { value: protocol } = await readJson(protocolPath);
  const { raw: freezeRaw, value: freeze } = await readJson(freezePath);
  const assemblyIssues = [];
  const baseFreezeSha256 = sha256(freezeRaw);
  try {
    const integrity = await verifyBaseFreezeIntegrity(freeze);
    if (!integrity.passed) {
      for (const error of integrity.errors) {
        assemblyIssues.push({ code: "base_freeze_integrity_failure", detail: error });
      }
    }
  } catch (error) {
    assemblyIssues.push({ code: "base_freeze_integrity_exception", detail: error.message });
  }
  const { raw: baseTaskManifestRaw, value: baseTaskManifest } = await readJson(
    path.join(auditDir, "task-payloads", "v2.0", "manifest.json"),
  );
  if (sha256(baseTaskManifestRaw) !== freeze.bindings.taskPayloadManifestSha256) {
    assemblyIssues.push({ code: "base_task_manifest_hash_mismatch" });
  }
  let revisionFreeze = null;
  let revisionFreezeSha256 = null;
  let revisionTaskManifest = null;
  const revisionFreezePath = path.join(specDir, "revision-freeze-v2.1.json");
  if (await exists(revisionFreezePath)) {
    const revisionDocument = await readJson(revisionFreezePath);
    revisionFreeze = revisionDocument.value;
    revisionFreezeSha256 = sha256(revisionDocument.raw);
    try {
      const integrity = await verifyRevisionFreezeIntegrity(revisionFreeze);
      if (!integrity.passed) {
        for (const error of integrity.errors) {
          assemblyIssues.push({ code: "revision_freeze_integrity_failure", detail: error });
        }
      }
    } catch (error) {
      assemblyIssues.push({ code: "revision_freeze_integrity_exception", detail: error.message });
    }
    const { raw, value } = await readJson(path.join(auditDir, "task-payloads", "v2.1", "manifest.json"));
    if (sha256(raw) !== revisionFreeze.taskPayloadManifestSha256) {
      assemblyIssues.push({ code: "revision_task_manifest_hash_mismatch" });
    }
    revisionTaskManifest = value;
  }
  let selection = null;
  let selectionSha256 = null;
  const selectionPath = path.join(auditDir, "runs", "round-1", "defect-selection.json");
  if (await exists(selectionPath)) {
    const selectionDocument = await readJson(selectionPath);
    selection = selectionDocument.value;
    selectionSha256 = sha256(selectionDocument.raw);
    const round1AutomatedPath = path.join(auditDir, "runs", "round-1", "validation.json");
    let round1Automated = null;
    if (await exists(round1AutomatedPath)) {
      round1Automated = await readJson(round1AutomatedPath);
      if (selection.round1AutomatedValidationSha256 !== sha256(round1Automated.raw)) {
        assemblyIssues.push({ code: "defect_selection_round1_automated_binding_mismatch" });
      }
    } else {
      assemblyIssues.push({ code: "defect_selection_round1_automated_validation_missing" });
    }
    const round1ReviewPath = path.join(auditDir, "reviews", "round-1", "validation.json");
    let round1Review = null;
    if (await exists(round1ReviewPath)) {
      round1Review = await readJson(round1ReviewPath);
      if (
        selection.round1ReviewValidationSha256 !== sha256(round1Review.raw) ||
        selection.round1PassedAllGates !== round1Review.value.passed
      ) {
        assemblyIssues.push({ code: "defect_selection_round1_review_binding_mismatch" });
      }
    } else if (
      round1Automated?.value?.passed !== false ||
      selection.round1ReviewValidationSha256 !== null ||
      selection.reviewNotRunReason !== "run_validation_failed" ||
      selection.round1PassedAllGates !== false
    ) {
      assemblyIssues.push({
        code: "defect_selection_review_not_run_state_mismatch",
        detail: {
          automatedPassed: round1Automated?.value?.passed ?? null,
          round1ReviewValidationSha256: selection.round1ReviewValidationSha256,
          reviewNotRunReason: selection.reviewNotRunReason,
          round1PassedAllGates: selection.round1PassedAllGates,
        },
      });
    }
    if (round1Automated) {
      try {
        const derivedSelection = deriveDefectSelection({
          protocol,
          automatedValidation: round1Automated.value,
          automatedRaw: round1Automated.raw,
          automatedValidationPath: round1AutomatedPath,
          reviewValidation: round1Review?.value ?? null,
          reviewRaw: round1Review?.raw ?? null,
        });
        if (canonicalSha256(selection) !== canonicalSha256(derivedSelection)) {
          assemblyIssues.push({ code: "defect_selection_not_deterministically_derived" });
        }
      } catch (error) {
        assemblyIssues.push({
          code: "defect_selection_derivation_failed",
          detail: error.message,
        });
      }
    }
  }
  let round2ReviewEvidence = null;
  const round2ReviewPath = path.join(auditDir, "reviews", "round-2", "validation.json");
  if (await exists(round2ReviewPath)) {
    const round2Review = await readJson(round2ReviewPath);
    const round2AutomatedPath = path.join(auditDir, "runs", "round-2", "validation.json");
    let round2AutomatedSha256 = null;
    if (await exists(round2AutomatedPath)) {
      const round2Automated = await readJson(round2AutomatedPath);
      round2AutomatedSha256 = sha256(round2Automated.raw);
    }
    round2ReviewEvidence = {
      value: round2Review.value,
      sha256: sha256(round2Review.raw),
      automatedValidationFile: relativePath(round2AutomatedPath),
      automatedValidationSha256: round2AutomatedSha256,
    };
  }
  const casesByAuditId = new Map(cases.cases.map((entry) => [entry.auditCaseId, entry]));
  const casesBySampleRef = new Map(cases.cases.map((entry) => [entry.sampleRef, entry]));
  const taskByKey = new Map(
    baseTaskManifest.taskPayloads.map((entry) => [`${baseTaskManifest.promptVersion}|${entry.batchRef}`, entry]),
  );
  if (revisionTaskManifest) {
    for (const entry of revisionTaskManifest.taskPayloads) {
      taskByKey.set(`${revisionTaskManifest.promptVersion}|${entry.batchRef}`, entry);
    }
  }
  const documents = [];

  if (args.proposal) {
    const filePath = path.resolve(repoRoot, args.proposal);
    const { value: proposal } = await readJson(filePath);
    const strictCase = casesBySampleRef.get(proposal.sampleRef);
    if (!strictCase) throw new Error(`Unknown bare proposal sampleRef: ${proposal.sampleRef}`);
    const result = validateStrictProposal({
      proposal,
      strictCase,
      schema,
      protocol,
      expectedPromptVersion: args.expectedPromptVersion,
    });
    documents.push({ file: relativePath(filePath), inputKind: "bare_proposal", passed: result.passed, envelopeErrors: [], results: [result] });
  } else {
    let files;
    if (args.file) {
      files = [path.resolve(repoRoot, args.file)];
    } else {
      const roundFiles = await listRoundFiles(validationRound);
      files = roundFiles.files;
      assemblyIssues.push(...roundFiles.issues);
    }
    for (const filePath of files) {
      const { value: envelope } = await readJson(filePath);
      documents.push(
        await validateRunEnvelope({
          filePath,
          envelope,
          casesByAuditId,
          schema,
          protocol,
          freeze,
          taskByKey,
          revisionFreeze,
          selection,
          selectionSha256,
          expectedRound: validationRound,
          baseFreezeSha256,
          revisionFreezeSha256,
          round2ReviewEvidence,
        }),
      );
    }
  }

  const executorEvidence = await collectExecutorEvidence();
  if (!executorEvidence.passed) {
    for (const file of executorEvidence.missingIds) {
      assemblyIssues.push({ code: "executor_agent_task_id_missing", detail: file });
    }
    for (const duplicate of executorEvidence.duplicates) {
      assemblyIssues.push({ code: "executor_agent_task_id_not_globally_unique", detail: duplicate });
    }
  }

  const results = documents.flatMap((document) => document.results);
  const receivedRows = results.reduce((sum, entry) => sum + entry.metrics.receivedRows, 0);
  const exactlyOnceRows = results.reduce((sum, entry) => sum + entry.metrics.exactlyOnceRows, 0);
  const eligibleRows = results.reduce((sum, entry) => sum + entry.metrics.eligibleRows, 0);
  const eligibleRowsMapped = results.reduce((sum, entry) => sum + entry.metrics.eligibleRowsMappedToItems, 0);
  const expectedDocumentCount = args.proposal || args.file ? documents.length : 3;
  const report = {
    validationVersion: "flowme-url-to-flow-strict-validation-v2",
    laneId,
    inputKind: args.proposal ? "bare_proposal" : args.file ? "run_envelope" : "round_envelopes",
    round: validationRound,
    passed:
      assemblyIssues.length === 0 &&
      documents.length === expectedDocumentCount &&
      documents.every((document) => document.passed),
    assemblyIssues,
    summary: {
      assemblyIssueCount: assemblyIssues.length,
      documentCount: documents.length,
      expectedDocumentCount,
      outputCount: results.length,
      passedOutputCount: results.filter((entry) => entry.passed).length,
      failedOutputCount: results.filter((entry) => !entry.passed).length,
      envelopeErrorCount: documents.reduce((sum, entry) => sum + entry.envelopeErrors.length, 0),
      proposalErrorCount: results.reduce((sum, entry) => sum + entry.errors.length, 0),
      receivedSourceRows: receivedRows,
      exactlyOnceSourceRows: exactlyOnceRows,
      sourceRowAccountingRate: receivedRows === 0 ? 1 : exactlyOnceRows / receivedRows,
      eligibleSourceRows: eligibleRows,
      eligibleRowsMappedToItems: eligibleRowsMapped,
      eligibleRowItemizationRate: eligibleRows === 0 ? 1 : eligibleRowsMapped / eligibleRows,
      deterministicNegativeCount: results.filter((entry) => entry.metrics.deterministicNegative).length,
    },
    documents,
  };
  if (args.out) await writeJson(path.resolve(repoRoot, args.out), report);
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  validateStrictV2(process.argv.slice(2))
    .then((report) => {
      process.stdout.write(
        process.argv.includes("--json")
          ? `${JSON.stringify(report, null, 2)}\n`
          : `${report.passed ? "PASS" : "FAIL"}: ${report.summary.passedOutputCount}/${report.summary.outputCount} outputs\n`,
      );
      if (!report.passed) process.exitCode = 1;
    })
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}

export { resolveSimplePath };
