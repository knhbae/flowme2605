import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { schemaErrors } from "./url-to-flow-strict-v2-core.mjs";
import {
  assertFreezeIntegrity,
  auditDir,
  buildBlindReviewTask,
  buildV3CaseSet,
  canonicalSha256,
  compileStrictCase,
  compilerVersion,
  expectedFrozenFiles,
  exists,
  laneId,
  loadCases,
  loadProtocol,
  loadRules,
  loadSchema,
  proposalFingerprint,
  readJson,
  readText,
  relativePath,
  repoRoot,
  sha256,
  specDir,
  v2AuditDir,
  v2SpecDir,
  writeOnceOrVerify,
} from "./url-to-flow-strict-v3-hybrid-core.mjs";

const processStartedAtMs = Math.round(Date.now() - process.uptime() * 1000);
const processInstanceRef = sha256(
  `${process.pid}|${processStartedAtMs}|${laneId}`,
);

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!["freeze", "run", "compare", "build-review"].includes(command)) {
    throw new Error("Use freeze | run --round round-1|round-2 | compare | build-review");
  }
  if (command !== "run" && rest.length !== 0) throw new Error(`${command} takes no arguments`);
  if (command === "run") {
    if (rest.length !== 2 || rest[0] !== "--round" || !["round-1", "round-2"].includes(rest[1])) {
      throw new Error("run requires --round round-1|round-2");
    }
    return { command, round: rest[1] };
  }
  return { command, round: null };
}

function assertRuleProtocolParity(rules, protocol) {
  if (
    canonicalSha256(rules.checkLexicon?.priority ?? null) !==
    canonicalSha256(["decision", "explicit_action", "inspection", "noun_label"])
  ) {
    throw new Error("check classification priority differs from the compiler");
  }
  if (
    protocol.laneId !== laneId ||
    protocol.evidenceClass !== "deterministic_controller_replay" ||
    protocol.execution?.modelInvocation !== false ||
    canonicalSha256(protocol.execution?.runs ?? null) !==
      canonicalSha256(["round-1", "round-2"]) ||
    protocol.inputBinding?.sourceCaseCount !== 12 ||
    protocol.inputBinding?.positiveCount !== 10 ||
    protocol.inputBinding?.negativeCount !== 2 ||
    protocol.inputBinding?.eligiblePrimaryRows !== 15 ||
    protocol.inputBinding?.supportingOrReferenceRows !== 1
  ) {
    throw new Error("protocol execution and input contract differ from the v3 lane");
  }
  const expectedGates = {
    schemaValidRate: 1,
    sourceRowAccountingRate: 1,
    compilerFieldOwnershipRate: 1,
    compilerTraceIntegrityRate: 1,
    literalMemoScheduleRate: 1,
    unsupportedActionDateRepeatFactCount: 0,
    negativeExactCount: 2,
    positiveItemCount: 15,
    crossRunProposalStabilityRate: 1,
    itemKeepRateMinimum: 0.8,
    sevenAxisAverageMinimum: 3.5,
    executionClarityMinimum: 4,
    contentFidelityCoverageMinimum: 4,
    sourceSafetySeparationMinimum: 4,
    reviewFailedCaseCount: 0,
    reviewRemoveVerdictCount: 0,
  };
  if (canonicalSha256(protocol.gates ?? null) !== canonicalSha256(expectedGates)) {
    throw new Error("protocol gates differ from the implemented v3 lane");
  }
  const expectedArtifactPolicy = {
    literalSchedulePresent: rules.artifactPolicy.literalSchedule,
    allTableRows: rules.artifactPolicy.allTableRows,
    oneResource: rules.artifactPolicy.oneResource,
    multipleResources: rules.artifactPolicy.multipleResources,
    oneOtherEligibleRow: rules.artifactPolicy.oneOther,
    multipleOtherEligibleRows: rules.artifactPolicy.multipleOther,
  };
  if (
    canonicalSha256(expectedArtifactPolicy) !==
    canonicalSha256(protocol.strictArtifactPolicy)
  ) {
    throw new Error("rules artifactPolicy and protocol strictArtifactPolicy differ");
  }
  const requiredMarkers = [
    "resource_contents_unseen",
    "missing_date_value",
    "supporting_source_not_structural",
  ];
  if (
    !requiredMarkers.every((value) =>
      Object.values(rules.reviewMarkerPolicy).includes(value),
    )
  ) {
    throw new Error("review marker policy is incomplete");
  }
}

async function directoryHasFiles(directory) {
  if (!(await exists(directory))) return false;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.isFile()) return true;
    if (entry.isDirectory() && (await directoryHasFiles(child))) return true;
  }
  return false;
}

async function freezeLane() {
  if (await directoryHasFiles(auditDir)) {
    throw new Error(
      `v3 execution evidence already exists before freeze: ${relativePath(auditDir)}`,
    );
  }
  const caseSet = await buildV3CaseSet();
  const [rules, protocol] = await Promise.all([loadRules(), loadProtocol()]);
  assertRuleProtocolParity(rules, protocol);
  const casesPath = path.join(specDir, "cases-v3.json");
  await writeOnceOrVerify(casesPath, `${JSON.stringify(caseSet, null, 2)}\n`);

  const frozenFiles = [];
  for (const file of expectedFrozenFiles) {
    const absolute = path.join(repoRoot, file);
    if (!(await exists(absolute))) throw new Error(`Freeze source missing: ${file}`);
    frozenFiles.push({ file, sha256: sha256(await fs.readFile(absolute)) });
  }
  const round1ValidationPath = path.join(v2AuditDir, "runs", "round-1", "validation.json");
  const round2ValidationPath = path.join(v2AuditDir, "runs", "round-2", "validation.json");
  const round1Validation = (await readJson(round1ValidationPath)).value;
  const round2Validation = (await readJson(round2ValidationPath)).value;
  for (const [label, validation] of [
    ["round-1", round1Validation],
    ["round-2", round2Validation],
  ]) {
    if (
      validation.passed !== false ||
      validation.summary?.outputCount !== 12 ||
      validation.summary?.passedOutputCount !== 11 ||
      validation.summary?.failedOutputCount !== 1
    ) {
      throw new Error(`v2 ${label} is not the preregistered 11/12 No-Go evidence`);
    }
  }
  for (const directory of [
    path.join(v2AuditDir, "raw", "round-3"),
    path.join(v2AuditDir, "runs", "round-3"),
    path.join(v2AuditDir, "review-raw", "round-3"),
    path.join(v2AuditDir, "reviews", "round-3"),
  ]) {
    if (await directoryHasFiles(directory)) {
      throw new Error(
        `v2 Round 3 evidence must remain absent: ${relativePath(directory)}`,
      );
    }
  }
  const manifest = {
    freezeVersion: "flowme-url-to-flow-v3-hybrid-freeze",
    laneId,
    frozenBeforeExecution: true,
    evidenceClass: "deterministic_controller_replay",
    compilerVersion,
    caseCount: caseSet.cases.length,
    positiveCount: caseSet.cases.filter((entry) => entry.generatorInput).length,
    negativeCount: caseSet.cases.filter((entry) => !entry.generatorInput).length,
    semanticCaseSetSha256: caseSet.semanticCaseSetSha256,
    v2NoGoBinding: {
      round1ValidationFile: relativePath(
        path.join(v2AuditDir, "runs", "round-1", "validation.json"),
      ),
      round1ValidationSha256: sha256(
        await readText(round1ValidationPath),
      ),
      round1Passed: round1Validation.passed,
      round1PassedOutputCount: round1Validation.summary.passedOutputCount,
      round2ValidationFile: relativePath(
        round2ValidationPath,
      ),
      round2ValidationSha256: sha256(
        await readText(round2ValidationPath),
      ),
      round2Passed: round2Validation.passed,
      round2PassedOutputCount: round2Validation.summary.passedOutputCount,
      round3Disposition: "not_run_gate_forbidden",
    },
    frozenFiles,
  };
  const freezePath = path.join(specDir, "freeze-manifest.json");
  await writeOnceOrVerify(freezePath, `${JSON.stringify(manifest, null, 2)}\n`);
  const integrity = await assertFreezeIntegrity();
  return {
    freezePath: relativePath(freezePath),
    freezeSha256: integrity.freezeSha256,
    caseCount: manifest.caseCount,
    frozenFileCount: frozenFiles.length,
  };
}

function metricsForCase(strictCase, proposal) {
  const rows = strictCase.generatorInput?.sourceRows ?? [];
  const supporting = new Set(
    strictCase.generatorInput?.sourceOwnership?.supportingSourceRefs ?? [],
  );
  const eligible = rows.filter(
    (row) => row.rowType !== "reference" && !supporting.has(row.sourceRef),
  );
  const itemRefList = (Array.isArray(proposal?.items) ? proposal.items : []).flatMap(
    (item) => (Array.isArray(item?.sourceRowRefs) ? item.sourceRowRefs : []),
  );
  const omittedRefList = (Array.isArray(proposal?.omittedRows) ? proposal.omittedRows : []).map(
    (entry) => entry?.sourceRowRef,
  );
  const itemRefs = new Set(itemRefList);
  const omittedRefs = new Set(omittedRefList);
  const exactlyOnce = rows.filter(
    (row) =>
      itemRefList.filter((value) => value === row.sourceRowRef).length +
        omittedRefList.filter((value) => value === row.sourceRowRef).length ===
      1,
  ).length;
  return {
    receivedRows: rows.length,
    exactlyOnceRows: exactlyOnce,
    eligibleRows: eligible.length,
    eligibleRowsMappedToItems: eligible.filter((row) => itemRefs.has(row.sourceRowRef)).length,
    itemCount: Array.isArray(proposal?.items) ? proposal.items.length : 0,
    deterministicNegative: !strictCase.generatorInput,
  };
}

function addInvariantError(errors, code, pathValue, detail = undefined) {
  errors.push({
    code,
    path: pathValue,
    ...(detail === undefined ? {} : { detail }),
  });
}

function exactKeySet(value, expectedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key) => expectedKeys.includes(key))
  );
}

function includesAnyIndependent(value, terms) {
  return terms.some((term) => value.includes(term));
}

function independentRowRule(row, rules) {
  if (row.rowType === "check") {
    let classification = "noun_label";
    if (includesAnyIndependent(row.title, rules.checkLexicon.decisionTerms)) {
      classification = "decision";
    } else if (
      includesAnyIndependent(row.title, rules.checkLexicon.explicitActionTerms)
    ) {
      classification = "explicit_action";
    } else if (includesAnyIndependent(row.title, rules.checkLexicon.inspectionTerms)) {
      classification = "inspection";
    }
    return rules.rowTypeRules.check[classification] ?? null;
  }
  if (row.rowType === "date") {
    const classification = includesAnyIndependent(
      row.title,
      rules.dateLexicon.explicitActionTerms,
    )
      ? "explicit_action"
      : "value_label";
    return rules.rowTypeRules.date[classification] ?? null;
  }
  return rules.rowTypeRules[row.rowType] ?? null;
}

function independentlyLicensedTitle(row, rules) {
  const rowPolicy = independentRowRule(row, rules);
  const operation = rules.titleOperations[rowPolicy?.titleOp];
  if (operation?.kind === "copy" && operation.suffix === "") return row.title;
  if (operation?.kind === "append" && typeof operation.suffix === "string") {
    return `${row.title}${operation.suffix}`;
  }
  return null;
}

function independentScheduleCandidates(row, rules) {
  const sourceValues = [row.title, row.detail].filter(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  return rules.schedulePatterns.flatMap((entry) => {
    const expression = new RegExp(entry.pattern, "iu");
    return sourceValues.flatMap((sourceValue) => {
      const match = sourceValue.match(expression)?.[0];
      return match ? [{ kind: entry.kind, sourceText: match, sourceValue }] : [];
    });
  });
}

function independentPrimaryArtifact(items, eligibleRows, rules) {
  if (items.some((item) => item?.scheduleEvidence !== null)) {
    return rules.artifactPolicy.literalSchedule;
  }
  if (eligibleRows.every((row) => row.rowType === "table_row")) {
    return rules.artifactPolicy.allTableRows;
  }
  if (eligibleRows.every((row) => row.rowType === "resource")) {
    return eligibleRows.length === 1
      ? rules.artifactPolicy.oneResource
      : rules.artifactPolicy.multipleResources;
  }
  return eligibleRows.length === 1
    ? rules.artifactPolicy.oneOther
    : rules.artifactPolicy.multipleOther;
}

function validateIndependentSourceFidelity(strictCase, output, rules) {
  const errors = [];
  const proposal = output?.proposal;
  if (output?.modelInvoked !== false) {
    addInvariantError(
      errors,
      "model_invocation_forbidden",
      "$.modelInvoked",
      output?.modelInvoked,
    );
  }
  if (output?.compileTrace?.modelInvoked !== false) {
    addInvariantError(
      errors,
      "trace_model_invocation_forbidden",
      "$.compileTrace.modelInvoked",
      output?.compileTrace?.modelInvoked,
    );
  }
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    addInvariantError(errors, "proposal_object_required", "$.proposal");
    return errors;
  }
  if (proposal.requestRef !== strictCase.requestRef) {
    addInvariantError(errors, "request_ref_mismatch", "$.proposal.requestRef");
  }
  if (proposal.sampleRef !== strictCase.sampleRef) {
    addInvariantError(errors, "proposal_sample_ref_mismatch", "$.proposal.sampleRef");
  }

  if (!strictCase.generatorInput) {
    const expectedBlocked = {
      schemaVersion: "flowme-semantic-proposal-v2",
      promptVersion: "deterministic-preflight-v2",
      requestRef: strictCase.requestRef,
      sampleRef: strictCase.sampleRef,
      result: {
        state: "blocked",
        reasonCode: strictCase.preflightResult.errorCode,
        disposition: strictCase.preflightResult.recommendedDisposition,
        primaryArtifact: null,
      },
      items: [],
      omittedRows: [],
      projections: [],
      review: { uncertaintyCodes: [], humanCheckRowRefs: [] },
    };
    if (canonicalSha256(proposal) !== canonicalSha256(expectedBlocked)) {
      addInvariantError(errors, "negative_preflight_mismatch", "$.proposal");
    }
    return errors;
  }

  const input = strictCase.generatorInput;
  const supportingRefs = new Set(input.sourceOwnership.supportingSourceRefs);
  const excludedRows = input.sourceRows.filter(
    (row) => row.rowType === "reference" || supportingRefs.has(row.sourceRef),
  );
  const eligibleRows = input.sourceRows.filter(
    (row) => row.rowType !== "reference" && !supportingRefs.has(row.sourceRef),
  );
  const items = Array.isArray(proposal.items) ? proposal.items : [];
  const omissions = Array.isArray(proposal.omittedRows) ? proposal.omittedRows : [];
  const itemRowRefs = items.flatMap((item) =>
    Array.isArray(item?.sourceRowRefs) ? item.sourceRowRefs : [],
  );
  const omittedRowRefs = omissions.map((entry) => entry?.sourceRowRef);
  for (const row of input.sourceRows) {
    const occurrenceCount =
      itemRowRefs.filter((value) => value === row.sourceRowRef).length +
      omittedRowRefs.filter((value) => value === row.sourceRowRef).length;
    if (occurrenceCount !== 1) {
      addInvariantError(errors, "source_row_accounting_mismatch", "$.proposal", {
        sourceRowRef: row.sourceRowRef,
        occurrenceCount,
      });
    }
  }
  const knownRowRefs = new Set(input.sourceRows.map((row) => row.sourceRowRef));
  for (const rowRef of [...itemRowRefs, ...omittedRowRefs]) {
    if (!knownRowRefs.has(rowRef)) {
      addInvariantError(errors, "unknown_source_row_ref", "$.proposal", rowRef);
    }
  }
  if (items.length !== eligibleRows.length) {
    addInvariantError(errors, "eligible_item_count_mismatch", "$.proposal.items", {
      expected: eligibleRows.length,
      actual: items.length,
    });
  }

  for (const [eligibleIndex, row] of eligibleRows.entries()) {
    const matchingItems = items.filter(
      (item) =>
        Array.isArray(item?.sourceRowRefs) &&
        item.sourceRowRefs.length === 1 &&
        item.sourceRowRefs[0] === row.sourceRowRef,
    );
    if (matchingItems.length !== 1) {
      addInvariantError(
        errors,
        "eligible_row_item_mapping_mismatch",
        "$.proposal.items",
        row.sourceRowRef,
      );
      continue;
    }
    const item = matchingItems[0];
    const itemIndex = items.indexOf(item);
    const itemPath = `$.proposal.items[${itemIndex}]`;
    const rowPolicy = independentRowRule(row, rules);
    const licensedTitle = independentlyLicensedTitle(row, rules);
    if (item.itemRef !== `item-${String(eligibleIndex + 1).padStart(2, "0")}`) {
      addInvariantError(errors, "item_ref_order_mismatch", `${itemPath}.itemRef`);
    }
    if (licensedTitle === null || item.title !== licensedTitle) {
      addInvariantError(errors, "item_title_outside_row_license", `${itemPath}.title`, {
        sourceRowRef: row.sourceRowRef,
        expected: licensedTitle,
        actual: item.title,
      });
    }
    if (item.intent !== rowPolicy?.intent) {
      addInvariantError(errors, "item_intent_mismatch", `${itemPath}.intent`);
    }
    if (item.completionMode !== rowPolicy?.completionMode) {
      addInvariantError(
        errors,
        "item_completion_mismatch",
        `${itemPath}.completionMode`,
      );
    }
    const expectedMemo =
      row.rowType === "procedure" && typeof row.detail === "string" ? row.detail : null;
    if (item.memo !== expectedMemo) {
      addInvariantError(errors, "memo_not_literal_source_text", `${itemPath}.memo`);
    }
    const schedule = item.scheduleEvidence;
    const candidates = independentScheduleCandidates(row, rules);
    if (schedule === null) {
      if (candidates.length > 0) {
        addInvariantError(errors, "schedule_value_missing", `${itemPath}.scheduleEvidence`);
      }
    } else if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
      addInvariantError(errors, "schedule_evidence_shape", `${itemPath}.scheduleEvidence`);
    } else {
      if (
        !Array.isArray(schedule.sourceRowRefs) ||
        schedule.sourceRowRefs.length !== 1 ||
        schedule.sourceRowRefs[0] !== row.sourceRowRef
      ) {
        addInvariantError(
          errors,
          "schedule_source_row_mismatch",
          `${itemPath}.scheduleEvidence.sourceRowRefs`,
        );
      }
      const literalCandidate = candidates.find(
        (candidate) =>
          candidate.sourceText === schedule.sourceText && candidate.kind === schedule.kind,
      );
      if (!literalCandidate) {
        const literalInRow = [row.title, row.detail].some(
          (value) =>
            typeof value === "string" &&
            typeof schedule.sourceText === "string" &&
            value.includes(schedule.sourceText),
        );
        addInvariantError(
          errors,
          literalInRow ? "schedule_kind_mismatch" : "schedule_source_text_not_literal",
          `${itemPath}.scheduleEvidence`,
        );
      }
    }
  }

  const expectedOmissions = excludedRows.map((row) => ({
    sourceRowRef: row.sourceRowRef,
    reasonCode: supportingRefs.has(row.sourceRef)
      ? "supporting_source_boundary"
      : "reference_only",
  }));
  if (canonicalSha256(omissions) !== canonicalSha256(expectedOmissions)) {
    addInvariantError(errors, "omission_policy_mismatch", "$.proposal.omittedRows");
  }
  const expectedArtifact = independentPrimaryArtifact(items, eligibleRows, rules);
  if (
    proposal.result?.state !== "proposal" ||
    proposal.result?.reasonCode !== null ||
    proposal.result?.disposition !== "review" ||
    proposal.result?.primaryArtifact !== expectedArtifact
  ) {
    addInvariantError(errors, "artifact_policy_mismatch", "$.proposal.result");
  }
  const expectedProjection = [
    { target: expectedArtifact, itemRefs: items.map((item) => item?.itemRef) },
  ];
  if (
    canonicalSha256(proposal.projections ?? null) !==
    canonicalSha256(expectedProjection)
  ) {
    addInvariantError(errors, "projection_policy_mismatch", "$.proposal.projections");
  }
  const expectedUncertaintyCodes = [];
  const expectedHumanChecks = [];
  const addExpectedMarker = (code, rowRef) => {
    if (!expectedUncertaintyCodes.includes(code)) expectedUncertaintyCodes.push(code);
    if (!expectedHumanChecks.includes(rowRef)) expectedHumanChecks.push(rowRef);
  };
  for (const row of input.sourceRows) {
    if (supportingRefs.has(row.sourceRef)) {
      addExpectedMarker(rules.reviewMarkerPolicy.supportingSource, row.sourceRowRef);
      continue;
    }
    if (row.rowType === "reference") continue;
    const item = items.find((candidate) => candidate?.sourceRowRefs?.[0] === row.sourceRowRef);
    if (row.rowType === "resource") {
      addExpectedMarker(rules.reviewMarkerPolicy.resource, row.sourceRowRef);
    }
    if (row.rowType === "date" && item?.scheduleEvidence === null) {
      addExpectedMarker(rules.reviewMarkerPolicy.dateWithoutValue, row.sourceRowRef);
    }
  }
  if (
    canonicalSha256(proposal.review?.uncertaintyCodes ?? null) !==
      canonicalSha256(expectedUncertaintyCodes) ||
    canonicalSha256(proposal.review?.humanCheckRowRefs ?? null) !==
      canonicalSha256(expectedHumanChecks)
  ) {
    addInvariantError(errors, "review_marker_policy_mismatch", "$.proposal.review");
  }
  return errors;
}

export async function validateCompiledRun(envelope, cases, rules, schema) {
  const freeze = await assertFreezeIntegrity();
  const envelopeErrors = [];
  const outputs = Array.isArray(envelope?.outputs) ? envelope.outputs : [];
  if (!Array.isArray(envelope?.outputs)) {
    envelopeErrors.push({ code: "outputs_array_required", path: "$.outputs" });
  }
  if (outputs.length !== cases.length) {
    envelopeErrors.push({
      code: "exact_output_count_required",
      path: "$.outputs",
      detail: { expected: cases.length, actual: outputs.length },
    });
  }
  if (
    envelope?.runVersion !== "flowme-url-to-flow-v3-hybrid-run" ||
    envelope?.laneId !== laneId ||
    !["round-1", "round-2"].includes(envelope?.round) ||
    envelope?.evidenceClass !== "deterministic_controller_replay"
  ) {
    envelopeErrors.push({ code: "run_envelope_contract_mismatch", path: "$" });
  }
  if (
    !exactKeySet(envelope, [
      "runVersion",
      "laneId",
      "round",
      "evidenceClass",
      "executor",
      "bindings",
      "measurement",
      "outputs",
    ])
  ) {
    envelopeErrors.push({ code: "run_envelope_keys_mismatch", path: "$" });
  }
  if (
    !exactKeySet(envelope?.executor, [
      "type",
      "executorId",
      "compilerVersion",
      "processId",
      "processStartedAtMs",
      "processInstanceRef",
    ]) ||
    envelope.executor.type !== "fresh_node_process" ||
    envelope.executor.executorId !== `v3-hybrid-${envelope.round}` ||
    envelope.executor.compilerVersion !== compilerVersion ||
    !Number.isInteger(envelope.executor.processId) ||
    envelope.executor.processId <= 0 ||
    !Number.isInteger(envelope.executor.processStartedAtMs) ||
    envelope.executor.processStartedAtMs <= 0 ||
    envelope.executor.processInstanceRef !==
      sha256(
        `${envelope.executor.processId}|${envelope.executor.processStartedAtMs}|${laneId}`,
      )
  ) {
    envelopeErrors.push({ code: "run_executor_contract_mismatch", path: "$.executor" });
  }
  const measurementKeys = [
    "provider",
    "model",
    "tier",
    "inputTokens",
    "outputTokens",
    "latencyMs",
    "cost",
    "currency",
  ];
  if (
    !exactKeySet(envelope?.measurement, measurementKeys) ||
    measurementKeys.some((key) => envelope.measurement[key] !== null)
  ) {
    envelopeErrors.push({ code: "run_measurement_must_be_unknown", path: "$.measurement" });
  }
  const expectedBindings = {
    freezeSha256: freeze.freezeSha256,
    caseSetSha256: sha256(await readText(path.join(specDir, "cases-v3.json"))),
    rulesSha256: sha256(await readText(path.join(specDir, "row-license-rules-v3.json"))),
    protocolSha256: sha256(await readText(path.join(specDir, "protocol-v3.json"))),
    schemaSha256: sha256(
      await readText(path.join(v2SpecDir, "proposal-schema-v2.json")),
    ),
  };
  if (
    !exactKeySet(envelope?.bindings, Object.keys(expectedBindings)) ||
    canonicalSha256(envelope.bindings ?? null) !== canonicalSha256(expectedBindings)
  ) {
    envelopeErrors.push({ code: "run_frozen_binding_mismatch", path: "$.bindings" });
  }
  if (
    new Set(outputs.map((entry) => entry?.auditCaseId)).size !== outputs.length ||
    new Set(outputs.map((entry) => entry?.sampleRef)).size !== outputs.length
  ) {
    envelopeErrors.push({ code: "duplicate_case_or_sample", path: "$.outputs" });
  }
  const results = [];
  for (let index = 0; index < cases.length; index += 1) {
    const strictCase = cases[index];
    const output = outputs[index] ?? {};
    const expected = compileStrictCase(strictCase, rules);
    const errors = schemaErrors(output.proposal, schema, schema);
    const schemaPassed = errors.length === 0;
    if (
      !exactKeySet(output, [
        "auditCaseId",
        "sampleRef",
        "modelInvoked",
        "proposal",
        "compileTrace",
      ])
    ) {
      errors.push({ code: "compiled_output_keys_mismatch", path: `$.outputs[${index}]` });
    }
    if (output.auditCaseId !== strictCase.auditCaseId) {
      errors.push({
        code: "audit_case_order_or_membership_mismatch",
        path: `$.outputs[${index}].auditCaseId`,
        detail: { expected: strictCase.auditCaseId, actual: output.auditCaseId },
      });
    }
    if (output.sampleRef !== strictCase.sampleRef) {
      errors.push({
        code: "sample_order_or_membership_mismatch",
        path: `$.outputs[${index}].sampleRef`,
        detail: { expected: strictCase.sampleRef, actual: output.sampleRef },
      });
    }
    errors.push(...validateIndependentSourceFidelity(strictCase, output, rules));
    if (canonicalSha256(output.proposal ?? null) !== canonicalSha256(expected.proposal)) {
      errors.push({ code: "compiler_output_recompute_mismatch", path: "$.proposal" });
    }
    if (canonicalSha256(output.compileTrace ?? null) !== canonicalSha256(expected.trace)) {
      errors.push({ code: "compiler_trace_recompute_mismatch", path: "$.compileTrace" });
    }
    results.push({
      auditCaseId: output.auditCaseId ?? null,
      sampleRef: output.sampleRef ?? null,
      expectedAuditCaseId: strictCase.auditCaseId,
      expectedSampleRef: strictCase.sampleRef,
      schemaPassed,
      passed: errors.length === 0,
      errors,
      metrics: metricsForCase(strictCase, output.proposal),
      proposalFingerprint: proposalFingerprint(output.proposal ?? null),
    });
  }
  const totals = results.reduce(
    (acc, entry) => {
      acc.receivedRows += entry.metrics.receivedRows;
      acc.exactlyOnceRows += entry.metrics.exactlyOnceRows;
      acc.eligibleRows += entry.metrics.eligibleRows;
      acc.eligibleRowsMappedToItems += entry.metrics.eligibleRowsMappedToItems;
      acc.itemCount += entry.metrics.itemCount;
      acc.deterministicNegativeCount += Number(entry.metrics.deterministicNegative);
      return acc;
    },
    {
      receivedRows: 0,
      exactlyOnceRows: 0,
      eligibleRows: 0,
      eligibleRowsMappedToItems: 0,
      itemCount: 0,
      deterministicNegativeCount: 0,
    },
  );
  const unsupportedCodes = new Set([
    "item_title_outside_row_license",
    "item_intent_mismatch",
    "item_completion_mismatch",
    "memo_not_literal_source_text",
    "schedule_source_text_not_literal",
    "schedule_value_missing",
    "schedule_kind_mismatch",
    "schedule_evidence_shape",
    "schedule_source_row_mismatch",
    "artifact_policy_mismatch",
    "projection_policy_mismatch",
    "review_marker_policy_mismatch",
  ]);
  const unsupportedCount = results.flatMap((entry) => entry.errors).filter((error) =>
    unsupportedCodes.has(error.code),
  ).length;
  const gates = {
    exactCaseCoverage:
      envelopeErrors.length === 0 &&
      outputs.length === cases.length &&
      results.every(
        (entry, index) =>
          entry.auditCaseId === cases[index].auditCaseId &&
          entry.sampleRef === cases[index].sampleRef,
      ),
    schemaValid: results.every((entry) => entry.schemaPassed),
    sourceRowAccounting:
      totals.receivedRows === 16 && totals.exactlyOnceRows === totals.receivedRows,
    compilerFieldOwnership: results.every(
      (entry) => !entry.errors.some((error) => error.code === "compiler_output_recompute_mismatch"),
    ),
    compilerTraceIntegrity: results.every(
      (entry) => !entry.errors.some((error) => error.code === "compiler_trace_recompute_mismatch"),
    ),
    literalMemoSchedule: results.every(
      (entry) =>
        !entry.errors.some((error) =>
          [
            "memo_not_literal_source_text",
            "schedule_source_text_not_literal",
            "schedule_value_missing",
            "schedule_kind_mismatch",
            "schedule_evidence_shape",
            "schedule_source_row_mismatch",
          ].includes(error.code),
        ),
    ),
    unsupportedZero: unsupportedCount === 0,
    negativeExact:
      totals.deterministicNegativeCount === 2 &&
      cases
        .map((entry, index) => ({ entry, result: results[index] }))
        .filter(({ entry }) => !entry.generatorInput)
        .every(({ result }) => result.passed),
    positiveItemCount: totals.itemCount === 15,
    allCasesPassed: results.length === cases.length && results.every((entry) => entry.passed),
  };
  return {
    validationVersion: "flowme-url-to-flow-v3-hybrid-validation",
    laneId,
    round: envelope.round,
    passed:
      envelopeErrors.length === 0 &&
      results.length === cases.length &&
      results.every((entry) => entry.passed) &&
      Object.values(gates).every(Boolean),
    envelopeErrors,
    gates,
    summary: {
      outputCount: results.length,
      passedOutputCount: results.filter((entry) => entry.passed).length,
      failedOutputCount: results.filter((entry) => !entry.passed).length,
      ...totals,
      sourceRowAccountingRate:
        totals.receivedRows === 0 ? 1 : totals.exactlyOnceRows / totals.receivedRows,
      eligibleRowItemizationRate:
        totals.eligibleRows === 0
          ? 1
          : totals.eligibleRowsMappedToItems / totals.eligibleRows,
      unsupportedCount,
    },
    results,
  };
}

function bindValidationToRun(validation, runPath, runRaw, envelope) {
  return {
    ...validation,
    evidenceBindings: {
      compiledRunFile: relativePath(runPath),
      compiledRunSha256: sha256(runRaw),
      compiledRunCanonicalSha256: canonicalSha256(envelope),
    },
  };
}

async function runCompiler(round) {
  const freeze = await assertFreezeIntegrity();
  const [{ cases }, rules, protocol, schema] = await Promise.all([
    loadCases(),
    loadRules(),
    loadProtocol(),
    loadSchema(),
  ]);
  assertRuleProtocolParity(rules, protocol);
  const outputs = cases.map((strictCase) => {
    const compiled = compileStrictCase(strictCase, rules);
    return {
      auditCaseId: strictCase.auditCaseId,
      sampleRef: strictCase.sampleRef,
      modelInvoked: false,
      proposal: compiled.proposal,
      compileTrace: compiled.trace,
    };
  });
  const envelope = {
    runVersion: "flowme-url-to-flow-v3-hybrid-run",
    laneId,
    round,
    evidenceClass: "deterministic_controller_replay",
    executor: {
      type: "fresh_node_process",
      executorId: `v3-hybrid-${round}`,
      compilerVersion,
      processId: process.pid,
      processStartedAtMs,
      processInstanceRef,
    },
    bindings: {
      freezeSha256: freeze.freezeSha256,
      caseSetSha256: sha256(await readText(path.join(specDir, "cases-v3.json"))),
      rulesSha256: sha256(
        await readText(path.join(specDir, "row-license-rules-v3.json")),
      ),
      protocolSha256: sha256(await readText(path.join(specDir, "protocol-v3.json"))),
      schemaSha256: sha256(
        await readText(path.join(v2SpecDir, "proposal-schema-v2.json")),
      ),
    },
    measurement: {
      provider: null,
      model: null,
      tier: null,
      inputTokens: null,
      outputTokens: null,
      latencyMs: null,
      cost: null,
      currency: null,
    },
    outputs,
  };
  const runPath = path.join(auditDir, "runs", round, "compiled-run.json");
  const validationPath = path.join(auditDir, "runs", round, "validation.json");
  const runRaw = `${JSON.stringify(envelope, null, 2)}\n`;
  const validation = bindValidationToRun(
    await validateCompiledRun(envelope, cases, rules, schema),
    runPath,
    runRaw,
    envelope,
  );
  await writeOnceOrVerify(runPath, runRaw);
  await writeOnceOrVerify(
    validationPath,
    `${JSON.stringify(validation, null, 2)}\n`,
  );
  return {
    round,
    passed: validation.passed,
    outputCount: outputs.length,
    itemCount: validation.summary.itemCount,
    runPath: relativePath(runPath),
    validationPath: relativePath(validationPath),
  };
}

async function compareRuns() {
  await assertFreezeIntegrity();
  const run1Path = path.join(auditDir, "runs", "round-1", "compiled-run.json");
  const run2Path = path.join(auditDir, "runs", "round-2", "compiled-run.json");
  const validation1Path = path.join(auditDir, "runs", "round-1", "validation.json");
  const validation2Path = path.join(auditDir, "runs", "round-2", "validation.json");
  const [run1Document, run2Document, validation1Document, validation2Document] =
    await Promise.all(
      [run1Path, run2Path, validation1Path, validation2Path].map((filePath) =>
        readJson(filePath),
      ),
    );
  const run1 = run1Document.value;
  const run2 = run2Document.value;
  const validation1 = validation1Document.value;
  const validation2 = validation2Document.value;
  const [{ cases }, rules, schema] = await Promise.all([
    loadCases(),
    loadRules(),
    loadSchema(),
  ]);
  const recomputedValidation1 = bindValidationToRun(
    await validateCompiledRun(run1, cases, rules, schema),
    run1Path,
    run1Document.raw,
    run1,
  );
  const recomputedValidation2 = bindValidationToRun(
    await validateCompiledRun(run2, cases, rules, schema),
    run2Path,
    run2Document.raw,
    run2,
  );
  if (
    canonicalSha256(recomputedValidation1) !== canonicalSha256(validation1) ||
    canonicalSha256(recomputedValidation2) !== canonicalSha256(validation2)
  ) {
    throw new Error("Stored v3 validation differs from current run recomputation");
  }
  const comparisons = cases.map((strictCase, index) => {
    const left = Array.isArray(run1.outputs) ? run1.outputs[index] : null;
    const right = Array.isArray(run2.outputs) ? run2.outputs[index] : null;
    return {
      auditCaseId: strictCase.auditCaseId,
      sampleRef: strictCase.sampleRef,
      exactMembership:
        left?.auditCaseId === strictCase.auditCaseId &&
        right?.auditCaseId === strictCase.auditCaseId &&
        left?.sampleRef === strictCase.sampleRef &&
        right?.sampleRef === strictCase.sampleRef,
      round1Fingerprint: proposalFingerprint(left?.proposal ?? null),
      round2Fingerprint: proposalFingerprint(right?.proposal ?? null),
      identical:
        canonicalSha256(left?.proposal ?? null) ===
        canonicalSha256(right?.proposal ?? null),
    };
  });
  const stableCount = comparisons.filter((entry) => entry.identical).length;
  const exactRoundBinding =
    run1.round === "round-1" &&
    run2.round === "round-2" &&
    validation1.round === "round-1" &&
    validation2.round === "round-2";
  const freshProcessSeparation =
    typeof run1.executor?.processInstanceRef === "string" &&
    typeof run2.executor?.processInstanceRef === "string" &&
    run1.executor.processInstanceRef !== run2.executor.processInstanceRef &&
    (run1.executor.processId !== run2.executor.processId ||
      run1.executor.processStartedAtMs !== run2.executor.processStartedAtMs);
  const report = {
    comparisonVersion: "flowme-url-to-flow-v3-hybrid-stability",
    laneId,
    passed:
      validation1.passed &&
      validation2.passed &&
      stableCount === comparisons.length &&
      comparisons.every((entry) => entry.exactMembership) &&
      exactRoundBinding &&
      freshProcessSeparation,
    round1ValidationSha256: sha256(await readText(validation1Path)),
    round2ValidationSha256: sha256(await readText(validation2Path)),
    round1RunSha256: sha256(await readText(run1Path)),
    round2RunSha256: sha256(await readText(run2Path)),
    outputCount: comparisons.length,
    stableCount,
    stabilityRate: stableCount / comparisons.length,
    exactRoundBinding,
    freshProcessSeparation,
    comparisons,
  };
  const outputPath = path.join(auditDir, "stability-comparison.json");
  await writeOnceOrVerify(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return { outputPath: relativePath(outputPath), ...report };
}

async function buildReviewInputs() {
  const freeze = await assertFreezeIntegrity();
  const comparisonPath = path.join(auditDir, "stability-comparison.json");
  const comparison = await compareRuns();
  if (!comparison.passed) throw new Error("Stable passing compiled runs required");
  const [{ cases }, run, protocol, rubric, reviewSchema] = await Promise.all([
    loadCases(),
    readJson(path.join(auditDir, "runs", "round-2", "compiled-run.json")).then(
      (entry) => entry.value,
    ),
    loadProtocol(),
    readText(path.join(specDir, "review-rubric-v3.md")),
    readJson(path.join(v2SpecDir, "review-result-schema-v2.json")).then(
      (entry) => entry.value,
    ),
  ]);
  const outputByCase = new Map(run.outputs.map((entry) => [entry.auditCaseId, entry]));
  const inputsByBatch = {};
  const inputManifest = {};
  for (const [batchRef, auditCaseIds] of Object.entries(protocol.batchAssignment)) {
    inputsByBatch[batchRef] = [];
    for (const auditCaseId of auditCaseIds) {
      const strictCase = cases.find((entry) => entry.auditCaseId === auditCaseId);
      if (!strictCase.generatorInput) continue;
      const output = outputByCase.get(auditCaseId);
      const base = {
        sampleRef: strictCase.sampleRef,
        sourceOwnership: strictCase.generatorInput?.sourceOwnership ?? null,
        sourceRows: strictCase.generatorInput?.sourceRows ?? [],
        compiledProposal: output.proposal,
        proposalFingerprint: proposalFingerprint(output.proposal),
      };
      const reviewInputSha256 = canonicalSha256(base);
      const input = { ...base, reviewInputSha256 };
      inputsByBatch[batchRef].push(input);
      const inputPath = path.join(auditDir, "review-inputs", `${strictCase.sampleRef}.json`);
      await writeOnceOrVerify(inputPath, `${JSON.stringify(input, null, 2)}\n`);
      inputManifest[strictCase.sampleRef] = {
        batchRef,
        file: relativePath(inputPath),
        reviewInputSha256,
        proposalFingerprint: base.proposalFingerprint,
      };
    }
  }

  const taskManifest = {};
  for (const [batchRef, inputs] of Object.entries(inputsByBatch)) {
    const task = buildBlindReviewTask(rubric, reviewSchema, inputs);
    const taskPath = path.join(auditDir, "review-task-payloads", `${batchRef}.txt`);
    await writeOnceOrVerify(taskPath, task);
    taskManifest[batchRef] = {
      file: relativePath(taskPath),
      sha256: sha256(task),
      inputCount: inputs.length,
      sampleRefs: inputs.map((entry) => entry.sampleRef),
    };
  }
  const manifest = {
    manifestVersion: "flowme-url-to-flow-v3-hybrid-review-inputs",
    laneId,
    freezeSha256: freeze.freezeSha256,
    stabilityComparisonSha256: sha256(await readText(comparisonPath)),
    compiledRunFile: relativePath(
      path.join(auditDir, "runs", "round-2", "compiled-run.json"),
    ),
    compiledRunSha256: sha256(
      await readText(path.join(auditDir, "runs", "round-2", "compiled-run.json")),
    ),
    automatedValidationFile: relativePath(
      path.join(auditDir, "runs", "round-2", "validation.json"),
    ),
    automatedValidationSha256: sha256(
      await readText(path.join(auditDir, "runs", "round-2", "validation.json")),
    ),
    rubricSha256: sha256(rubric),
    reviewSchemaSha256: sha256(
      await readText(path.join(v2SpecDir, "review-result-schema-v2.json")),
    ),
    inputs: inputManifest,
    tasks: taskManifest,
  };
  const manifestPath = path.join(auditDir, "review-inputs", "manifest.json");
  await writeOnceOrVerify(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return {
    manifestPath: relativePath(manifestPath),
    inputCount: Object.keys(inputManifest).length,
    taskCount: Object.keys(taskManifest).length,
  };
}

export async function main(argv) {
  const args = parseArgs(argv);
  if (args.command === "freeze") return freezeLane();
  if (args.command === "run") return runCompiler(args.round);
  if (args.command === "compare") return compareRuns();
  return buildReviewInputs();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2))
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (result.passed === false) process.exitCode = 1;
    })
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
