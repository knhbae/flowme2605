const ACTION_SUFFIXES = ["확인하기", "완료하기", "열어보기"];
const SENSITIVE_RISK = /(medical|health|legal|financial|privacy|safety|sensitive)/i;
const TEMPORAL_VALUE = /(\d+\s*(일|주|주차|개월|달|년|시간|분)|D[+-]?\d+|매일|매주|매월|매년|전|후|까지|이내)/i;
const CONDITION_OR_CONTEXT = /(맞는|적으면|많으면|중에서|여부|상태|이유|방법|범위|날짜|링크|번호|제출|등록|건조|세척|촬영|방문|신청|선택|결정|보류|기록|남기)/;
const ACTION_VERB = /(고르|선택|정하|청소|제거|세척|건조|촬영|방문|신청|제출|등록|열|읽|연습|복습|기록|적|남기|확인|판단|준비|챙기|완료)/;

const unique = (values) => [...new Set(values)];

export function lintActionTitle(title) {
  const normalized = String(title ?? "").trim();
  const suffixOnly = ACTION_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
  const opaqueResource = /^(Day\s*\d+\s*prompt)(\s+열어보기)?$/i.test(normalized)
    || /^선택한\s+.+(영상|링크|자료)\s+열어보기$/i.test(normalized);
  const tooShortGeneric = normalized.length < 12 && /(확인|준비|관리|진행|체크|기록|검토|알아보기)/.test(normalized);
  const hasAction = ACTION_VERB.test(normalized);
  const hasContext = CONDITION_OR_CONTEXT.test(normalized) || TEMPORAL_VALUE.test(normalized);
  const generic = !hasAction || opaqueResource || (suffixOnly && !hasContext) || tooShortGeneric;

  return {
    passed: !generic,
    reasonCode: generic
      ? opaqueResource
        ? "opaque_resource_title"
        : !hasAction
          ? "missing_action_verb"
          : "generic_action_without_context"
      : null,
  };
}

export function auditLegacySourceCase(sourceCase, enrichedPacket = null) {
  const caseId = sourceCase.caseId ?? sourceCase.auditCaseId;
  if (enrichedPacket?.auditCaseId === caseId) {
    const sourceGate = validateSourcePacket(enrichedPacket);
    return {
      auditCaseId: caseId,
      title: enrichedPacket.source.title,
      originalUserJob: sourceCase.userJob,
      disposition: sourceGate.passed ? "compile_candidate" : "reextract_required",
      reasonCodes: sourceGate.reasonCodes,
      neededEvidence: sourceGate.passed ? [] : sourceGate.neededEvidence,
      sourceRowCount: enrichedPacket.sourceEvidence.length,
      evidencePacket: "enriched-case-02-v4.json",
    };
  }

  const primary = sourceCase.source?.primary ?? {};
  const rows = sourceCase.sourceRows ?? [];
  const reasons = [];
  const needed = [];
  const targetCountry = String(sourceCase.targetLocale ?? "ko-KR").split("-")[1] ?? "KR";

  if (primary.accessStatus === "unavailable") {
    return {
      auditCaseId: caseId,
      title: primary.title ?? sourceCase.userJob,
      originalUserJob: sourceCase.userJob,
      disposition: "blocked",
      reasonCodes: ["source_access_unavailable"],
      neededEvidence: ["원본 파일 또는 읽을 수 있는 본문"],
      sourceRowCount: rows.length,
    };
  }

  if (
    SENSITIVE_RISK.test(primary.riskLevel ?? "") &&
    primary.countryContext &&
    primary.countryContext !== targetCountry
  ) {
    return {
      auditCaseId: caseId,
      title: primary.title ?? sourceCase.userJob,
      originalUserJob: sourceCase.userJob,
      disposition: "blocked",
      reasonCodes: ["sensitive_locale_unverified"],
      neededEvidence: ["한국 적용성이 확인된 1차 출처와 민감 영역 검토"],
      sourceRowCount: rows.length,
    };
  }

  if (rows.length === 0) {
    reasons.push("missing_source_rows");
    needed.push("사용자 job을 지지하는 실제 본문 행");
  }

  if (/제공된\s*\d+개\s*SourceRow\s*범위만/.test(sourceCase.claimedScope ?? "")) {
    reasons.push("source_scope_unverified");
    needed.push("원문 전체 또는 명시적으로 닫힌 소범위의 coverage 선언");
  }

  if (rows.length > 0 && rows.every((row) => !String(row.detail ?? "").trim())) {
    reasons.push("insufficient_action_context");
    needed.push("행별 대상, 조건, 방법, 완료 또는 판단 단서");
  }

  for (const row of rows) {
    const combined = `${row.title ?? ""} ${row.detail ?? ""}`.trim();
    if (row.rowType === "resource" && !row.url && !row.resourceUrl && !row.detail) {
      reasons.push("opaque_resource_without_locator");
      needed.push("실제 리소스 제목, URL, 리소스로 할 행동");
    }
    if (row.rowType === "date" && !TEMPORAL_VALUE.test(combined)) {
      reasons.push("date_label_without_value_or_user_anchor");
      needed.push("실제 날짜·기간·반복 또는 계산 가능한 사용자 anchor");
    }
    if (row.rowType === "table_row" && !row.detail) {
      reasons.push("table_row_without_payload");
      needed.push("표 행의 실제 셀 값과 관리할 열");
    }
    if (row.rowType === "reference") {
      reasons.push("supporting_reference_not_user_action");
      needed.push("보조 출처가 지지하는 사용자 행동 또는 명시적 memo/hold 매핑");
    }
    if (/(확인한 뒤.*판단|예약과.*준비)/.test(row.title ?? "") && !row.detail) {
      reasons.push("collapsed_decision_or_preparation");
      needed.push("판단 기준, 선택 상태, 준비 완료 조건");
    }
  }

  if (primary.rightsStatus === "needs_review") {
    reasons.push("rights_review_required");
    needed.push("스냅샷 보관·요약·링크 사용 범위 검토");
  }

  const reasonPriority = {
    opaque_resource_without_locator: 1,
    date_label_without_value_or_user_anchor: 1,
    table_row_without_payload: 1,
    collapsed_decision_or_preparation: 1,
    supporting_reference_not_user_action: 2,
    insufficient_action_context: 3,
    source_scope_unverified: 4,
    rights_review_required: 5,
  };
  const orderedReasons = unique(reasons.length ? reasons : ["source_scope_unverified"])
    .sort((a, b) => (reasonPriority[a] ?? 99) - (reasonPriority[b] ?? 99));

  return {
    auditCaseId: caseId,
    title: primary.title ?? sourceCase.userJob,
    originalUserJob: sourceCase.userJob,
    disposition: "reextract_required",
    reasonCodes: orderedReasons,
    neededEvidence: unique(needed.length ? needed : ["닫힌 source scope와 실행·완료 근거"]),
    sourceRowCount: rows.length,
  };
}

export function validateSourcePacket(packet) {
  const reasons = [];
  const needed = [];
  const evidence = packet.sourceEvidence ?? [];
  const coverageStatus = packet.coverage?.status;

  if (!packet.source?.url) {
    reasons.push("missing_source_locator");
    needed.push("원문 URL 또는 파일 snapshot reference");
  }
  if (!['full', 'bounded_complete'].includes(coverageStatus)) {
    reasons.push("source_scope_unverified");
    needed.push("full 또는 bounded_complete coverage 선언");
  }
  if (!packet.userJob) {
    reasons.push("missing_user_job");
    needed.push("하나의 닫힌 사용자 job");
  }
  if (!packet.naturalArtifact) {
    reasons.push("missing_natural_artifact");
    needed.push("원문 밖에서 사용자가 자연스럽게 만들 산출물");
  }
  if (evidence.length === 0) {
    reasons.push("missing_source_evidence");
    needed.push("행동·조건·시간·완료·주의 근거");
  }

  const kinds = new Set(evidence.map((entry) => entry.kind));
  if (![...kinds].some((kind) => /action/.test(kind))) {
    reasons.push("missing_action_evidence");
    needed.push("사용자가 실제로 할 행동 근거");
  }
  if (!kinds.has("finish_action") && !kinds.has("decision") && !kinds.has("record")) {
    reasons.push("missing_finish_evidence");
    needed.push("완료·판단·기록 상태를 만들 근거");
  }

  return {
    passed: reasons.length === 0,
    reasonCodes: unique(reasons),
    neededEvidence: unique(needed),
    evidenceCount: evidence.length,
  };
}

export function validateValueUpliftProposal(packet, contract, liveBaseline) {
  const proposal = packet.proposal;
  const evidenceIds = new Set((packet.sourceEvidence ?? []).map((entry) => entry.evidenceId));
  const itemIds = new Set((proposal.items ?? []).map((entry) => entry.itemId));
  const referencedEvidence = [];
  const invalidEvidenceRefs = [];
  const genericItems = [];
  const missingCompletionItems = [];

  for (const item of proposal.items ?? []) {
    for (const ref of item.sourceEvidenceRefs ?? []) {
      referencedEvidence.push(ref);
      if (!evidenceIds.has(ref)) invalidEvidenceRefs.push(`${item.itemId}:${ref}`);
    }
    const lint = lintActionTitle(item.title);
    if (!lint.passed) genericItems.push({ itemId: item.itemId, title: item.title, reasonCode: lint.reasonCode });
    if (!item.completion?.criterion || /^(완료|확인|체크)(했다|함)?[.]?$/.test(item.completion.criterion.trim())) {
      missingCompletionItems.push(item.itemId);
    }
  }

  for (const caution of proposal.cautions ?? []) {
    for (const ref of caution.sourceEvidenceRefs ?? []) {
      referencedEvidence.push(ref);
      if (!evidenceIds.has(ref)) invalidEvidenceRefs.push(`${caution.cautionId}:${ref}`);
    }
  }

  const accountedEvidence = new Set([
    ...referencedEvidence,
    ...(proposal.sourceTrace?.evidenceRefs ?? []),
  ]);
  const unaccountedEvidence = [...evidenceIds].filter((id) => !accountedEvidence.has(id));
  const projections = proposal.projections ?? [];
  const firstActionExists = itemIds.has(proposal.flow?.firstActionRef);
  const projectionPayloadsValid = projections.length > 0 && projections.every((entry) => entry.payload && Array.isArray(entry.lossLedger));
  const unsupportedClaimCount = proposal.unsupportedClaims?.length ?? 0;
  const sourceGate = validateSourcePacket(packet);

  const capabilities = {
    job_title: Boolean(proposal.flow?.title && proposal.flow?.userJob),
    input_choice_or_no_input: Boolean(proposal.flow?.inputRule),
    named_result_bundle: (proposal.flow?.resultBundle?.length ?? 0) >= 2,
    first_action_preview: firstActionExists,
    item_count_and_destination: (proposal.items?.length ?? 0) > 0 && projections.length > 0,
    observable_completion_or_decision: missingCompletionItems.length === 0 && (proposal.items?.length ?? 0) > 0,
    source_trace_and_conversion_note: Boolean(proposal.sourceTrace?.sourceUrl && proposal.flow?.conversionNote),
    return_reuse_or_export_state: Boolean(proposal.flow?.returnState && projectionPayloadsValid),
  };

  const requiredCapabilities = contract.liveBaselineCapabilities ?? liveBaseline.requiredCapabilities ?? [];
  const capabilityPassCount = requiredCapabilities.filter((name) => capabilities[name]).length;
  const capabilityRate = requiredCapabilities.length ? capabilityPassCount / requiredCapabilities.length : 0;
  const completionRate = proposal.items?.length
    ? (proposal.items.length - missingCompletionItems.length) / proposal.items.length
    : 0;
  const genericActionRate = proposal.items?.length ? genericItems.length / proposal.items.length : 1;
  const accountingRate = evidenceIds.size
    ? (evidenceIds.size - unaccountedEvidence.length) / evidenceIds.size
    : 0;

  const hardGates = {
    sourcePacketSufficient: sourceGate.passed,
    sourceEvidenceAccounting: accountingRate === contract.absoluteGate.sourceEvidenceAccountingRate,
    sourceEvidenceReferencesValid: invalidEvidenceRefs.length === 0,
    unsupportedClaims: unsupportedClaimCount === contract.absoluteGate.unsupportedClaimCount,
    genericActions: genericActionRate === contract.absoluteGate.genericActionRate,
    observableCompletion: completionRate === contract.absoluteGate.observableCompletionRate,
    liveBaselineCapabilities: capabilityRate === contract.absoluteGate.requiredLiveBaselineCapabilityRate,
    projectionPayloads: projectionPayloadsValid,
  };

  const passed = Object.values(hardGates).every(Boolean);
  return {
    passed,
    status: passed ? "ready_for_pairwise_review" : "hold_quality",
    hardGates,
    metrics: {
      evidenceCount: evidenceIds.size,
      itemCount: proposal.items?.length ?? 0,
      projectionCount: projections.length,
      sourceEvidenceAccountingRate: accountingRate,
      unsupportedClaimCount,
      genericActionRate,
      observableCompletionRate: completionRate,
      liveBaselineCapabilityRate: capabilityRate,
    },
    capabilities,
    defects: {
      invalidEvidenceRefs,
      unaccountedEvidence,
      genericItems,
      missingCompletionItems,
    },
    scoreState: "withheld_until_independent_pairwise_review",
  };
}

export function auditV3Outputs(v3Report) {
  const positives = (v3Report.cases ?? []).filter((entry) => entry.proposal?.result?.state === "proposal");
  const perCase = [];
  const items = [];
  let exactCopies = 0;
  let suffixCopies = 0;
  let memoCount = 0;
  let scheduleCount = 0;
  let sourceLocatorCount = 0;
  let observableCompletionCount = 0;
  let projectionPayloadCount = 0;

  for (const entry of positives) {
    const rowTitles = new Set((entry.sourceRows ?? []).map((row) => row.title));
    const localItems = entry.proposal?.items ?? [];
    let localExact = 0;
    let localSuffix = 0;
    for (const item of localItems) {
      items.push(item);
      if (rowTitles.has(item.title)) {
        exactCopies += 1;
        localExact += 1;
      } else if ([...rowTitles].some((title) => ACTION_SUFFIXES.some((suffix) => item.title === `${title} ${suffix}`))) {
        suffixCopies += 1;
        localSuffix += 1;
      }
      if (item.memo) memoCount += 1;
      if (item.scheduleEvidence) scheduleCount += 1;
      if (item.url || item.resourceUrl || item.tool || item.place) sourceLocatorCount += 1;
      if (item.completion?.criterion || item.doneWhen) observableCompletionCount += 1;
    }
    const projections = entry.proposal?.projections ?? [];
    projectionPayloadCount += projections.filter((projection) => projection.payload || projection.fields || projection.rows || projection.events).length;
    const partial = entry.auditCaseId === "case-02";
    perCase.push({
      auditCaseId: entry.auditCaseId,
      label: entry.label,
      itemCount: localItems.length,
      exactCopies: localExact,
      suffixCopies: localSuffix,
      verdict: partial ? "partial_execution" : "label_only",
      primaryDefect: partial
        ? "start anchor, observable completion, source link, and export payload are missing"
        : "source labels were preserved but no complete execution artifact was produced",
    });
  }

  return {
    caseCount: positives.length,
    itemCount: items.length,
    exactCopyCount: exactCopies,
    suffixCopyCount: suffixCopies,
    memoCount,
    scheduleEvidenceCount: scheduleCount,
    sourceLocatorCount,
    observableCompletionCount,
    projectionPayloadCount,
    labelOnlyCaseCount: perCase.filter((entry) => entry.verdict === "label_only").length,
    partialExecutionCaseCount: perCase.filter((entry) => entry.verdict === "partial_execution").length,
    productReadyCaseCount: 0,
    priorModelProxyScore: v3Report.evidence?.blindModelProxy?.sevenAxisAverage ?? null,
    scoreInterpretation: "source_row_fidelity_controller_only",
    perCase,
  };
}

export function buildPairwiseViews(packet, v3Case) {
  const source = {
    userSituation: packet.userJob,
    sourceTitle: packet.source.title,
    sourceUrl: packet.source.url,
    boundedScope: packet.coverage.scope,
    sourceEvidence: packet.sourceEvidence.map((entry) => ({ kind: entry.kind, text: entry.text })),
  };

  const minimal = {
    title: "극세 필터 청소",
    inputRule: null,
    resultBundle: ["캘린더"],
    firstAction: v3Case.proposal.items[0]?.title ?? null,
    items: v3Case.proposal.items.map((item) => ({
      title: item.title,
      memo: item.memo,
      completion: item.completionMode,
      schedule: item.scheduleEvidence?.sourceText ?? null,
    })),
    projections: v3Case.proposal.projections,
    sourceTrace: v3Case.proposal.items.flatMap((item) => item.sourceRowRefs ?? []),
    returnState: null,
  };

  const candidate = {
    title: packet.proposal.flow.title,
    inputRule: packet.proposal.flow.inputRule,
    resultBundle: packet.proposal.flow.resultBundle,
    firstAction: packet.proposal.items.find((item) => item.itemId === packet.proposal.flow.firstActionRef)?.title,
    items: packet.proposal.items.map((item) => ({
      title: item.title,
      memo: item.memo ?? null,
      completion: item.completion,
      sourceEvidenceRefs: item.sourceEvidenceRefs,
    })),
    projections: packet.proposal.projections,
    sourceTrace: packet.proposal.sourceTrace,
    cautions: packet.proposal.cautions,
    returnState: packet.proposal.flow.returnState,
  };

  return { source, minimal, candidate };
}
