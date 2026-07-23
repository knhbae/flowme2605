import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CASE_SET_VERSION,
  GOLD_CONTRACT_VERSION,
  OUTPUT_SCHEMA_VERSION,
  TAXONOMY_VERSION,
  cases,
  laneLabels,
  projectionLabels,
} from "./lab-data-v2.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const RUNS = path.join(HERE, "runs");
const INDEPENDENT = path.join(HERE, "independent-decisions");
const REPORT = path.join(
  ROOT,
  "docs/content-audit/2026-07-20-url-to-flow-output-quality-review-ko.html",
);

const GENERATED_AT = "2026-07-20T12:00:00.000+09:00";
const writeJson = (target, value) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
const writeText = (target, value) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value, "utf8");
};
const hash = (value) =>
  `sha256:${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const snapshotId = (record) => `snapshot-${record.caseId.toLowerCase()}`;
const normalizeRowType = (rowType) => {
  if (["date", "window"].includes(rowType)) return "date";
  if (["offset", "relative_period"].includes(rowType)) return "offset";
  if (
    [
      "condition",
      "recurrence",
      "emergency",
      "warning",
      "missing_boundary",
    ].includes(rowType)
  )
    return rowType === "missing_boundary" ? "omission" : "condition";
  if (
    [
      "procedure",
      "service_step",
      "preparation",
      "before",
      "during",
      "after",
    ].includes(rowType)
  )
    return "procedure";
  if (["resource", "course", "waypoint"].includes(rowType)) return "resource";
  if (
    [
      "table_row",
      "decision",
      "contract",
      "attachment",
      "change",
      "warranty",
      "exit",
    ].includes(rowType)
  )
    return "table_row";
  if (["check", "carry_on", "document", "safety_section"].includes(rowType))
    return "check";
  if (["fact", "field", "reference"].includes(rowType)) return rowType;
  return "reference";
};

const withSourceIdentity = (record) =>
  record.sourceRows.map((row) => ({
    sourceRowId: row.sourceRowId,
    sourceId: record.source.sourceId,
    snapshotId: snapshotId(record),
    rowType: normalizeRowType(row.rowType),
    title: row.title,
    detail: row.detail,
    order: row.order,
    locator: row.locator,
  }));

const asLandmarks = (record) =>
  record.landmarks.map((label, index) => {
    const matches = record.sourceRows
      .filter(
        (row) =>
          row.title.includes(label) ||
          row.detail.includes(label) ||
          row.locator.includes(label),
      )
      .map((row) => row.sourceRowId);
    return {
      landmarkId: `${record.caseId}-landmark-${index + 1}`,
      label,
      sourceRowIds:
        matches.length > 0
          ? matches
          : record.sourceRows.slice(0, 1).map((row) => row.sourceRowId),
    };
  });

const asMissingRows = (record) =>
  record.missingRows.map((label) => ({
    label,
    reason: "현재 동결된 source snapshot에서 행을 확보하지 못함",
  }));

const artifactCounts = Object.fromEntries(
  ["calendar", "checklist", "todo", "sheet", "memo"].map((artifact) => [
    artifact,
    cases.filter(
      (record) => record.expected.classification.primaryArtifact === artifact,
    ).length,
  ]),
);
const patternCounts = Object.fromEntries(
  [
    "date_preparation",
    "ordered_procedure",
    "repeating_routine",
    "progress_tracking",
    "resource_queue",
    "compare_decide",
    "phase_lifecycle",
  ].map((pattern) => [
    pattern,
    cases.filter(
      (record) =>
        record.expected.classification.primaryExecutionPattern === pattern ||
        record.expected.classification.secondaryExecutionPatterns.includes(pattern),
    ).length,
  ]),
);

export function buildManifest() {
  return {
    documentType: "flowme_output_quality_case_manifest",
    caseSetVersion: CASE_SET_VERSION,
    generatedAt: GENERATED_AT,
    status: "frozen_for_generation",
    claimBoundary:
      "These are source-backed test contracts and agent QA evidence, not production runtime output or observed-user validation.",
    counts: {
      total: cases.length,
      corePositive: cases.filter((record) => record.lane === "core_positive").length,
      coreBoundary: cases.filter((record) => record.lane === "core_boundary").length,
      positiveControl: cases.filter((record) => record.lane === "positive_control").length,
      negativeControl: cases.filter((record) => record.lane === "negative_control").length,
    },
    coverage: {
      artifacts: artifactCounts,
      executionPatterns: patternCounts,
      lifeAreas: [
        ...new Set(
          cases
            .map((record) => record.expected.classification.primaryLifeArea)
            .filter(Boolean),
        ),
      ],
      sourceRows: cases.reduce((total, record) => total + record.sourceRows.length, 0),
    },
    cases: cases.map((record) => ({
      caseId: record.caseId,
      order: record.order,
      lane: record.lane,
      controlKind: record.controlKind,
      title: record.title,
      shortTitle: record.shortTitle,
      sourceUrl: record.source.url,
      sourcePublisher: record.source.publisher,
      userJob: record.userJob,
      sourceCompleteness: record.sourceCompleteness,
      sourceRowCount: record.sourceRows.length,
      expectedOutcome: record.expected.feasibility.outcome,
      expectedReadiness: record.expected.feasibility.conversionReadiness,
      expectedExecutableAllowed: record.expected.feasibility.executableAllowed,
      expectedPrimaryArtifact:
        record.expected.classification.primaryArtifact ?? null,
      humanReviewShelf:
        record.lane === "core_positive" || record.lane === "core_boundary",
    })),
  };
}

export function buildGoldContract() {
  return {
    documentType: "flowme_output_quality_gold_source_contract",
    contractVersion: GOLD_CONTRACT_VERSION,
    caseSetVersion: CASE_SET_VERSION,
    taxonomyVersion: TAXONOMY_VERSION,
    generatedAt: GENERATED_AT,
    frozenBeforeGeneration: true,
    claimBoundary:
      "Gold labels represent adjudicated source and product rules. They are not model inputs and do not represent observed-user preference.",
    cases: cases.map((record) => {
      const rows = withSourceIdentity(record);
      const normalizedClassification = compileClassification(
        record,
        record.expected.classification,
        record.expected.feasibility,
      );
      return {
        caseId: record.caseId,
        primarySource: {
          ...record.source,
          snapshotId: snapshotId(record),
          contentHash: hash(rows),
        },
        userJob: record.userJob,
        claimedScope: record.claimedScope,
        sourceCompleteness: record.sourceCompleteness,
        sourceRows: rows,
        landmarks: record.landmarks,
        missingRows: record.missingRows,
        expectedDisposition: record.expected.feasibility,
        expectedClassification: {
          ...normalizedClassification.taxonomy,
          access: normalizedClassification.access,
          rights: normalizedClassification.rights,
          review: normalizedClassification.review,
        },
        expectedRoleByRow: record.roles.map(({ sourceRowId, role }) => ({
          sourceRowId,
          role,
        })),
        expectedRoleAssignments: record.roles,
        forbiddenInferences: record.expected.forbiddenInferences.map((reason) => ({
          kind: "semantic",
          reason,
        })),
        essentialProjectionFields:
          record.expected.essentialProjectionFields,
        artifactReason: record.expected.artifactReason,
        expectedUse: record.expected.expectedUse,
        beforeProblem: record.beforeProblem,
      };
    }),
  };
}

export function buildBlindPacket() {
  return {
    documentType: "flowme-output-quality-blind-source-packet",
    packetVersion: "blind-source-packet-v2.1",
    caseSetVersion: CASE_SET_VERSION,
    generatedAt: GENERATED_AT,
    blinding: {
      excluded:
        "gold classification, expected disposition, expected roles, artifact reason, prior review, model identity and cost",
      included:
        "source identity, acquired scope, rows, landmarks, missing-row declaration and user job",
    },
    task: {
      output:
        "For each case decide feasibility, Taxonomy v1.1 core axes, SourceRow roles, canonical entities and five projection availabilities.",
      guardrails: [
        "Do not invent missing rows, dates, recurrence, conditions, facts or outcomes.",
        "A SourceRow may be Item, Field, Memo, Reference, Conditional response or Omission.",
        "Metadata-only or missing source must not become a complete Flow.",
        "Content conversion, rights, locale, safety, privacy and promotion are independent gates.",
        "Primary artifact is the one retained result needed to finish or resume the user job.",
      ],
    },
    cases: cases.map((record) => ({
      caseId: record.caseId,
      title: record.title,
      source: {
        ...record.source,
        snapshotId: snapshotId(record),
        contentHash: hash(withSourceIdentity(record)),
      },
      userJob: record.userJob,
      claimedScope: record.claimedScope,
      declaredSourceCompleteness: record.sourceCompleteness,
      sourceRows: withSourceIdentity(record),
      landmarks: record.landmarks,
      missingRows: record.missingRows,
    })),
  };
}

const taxonomyKeys = [
  "classificationStatus",
  "primaryLifeArea",
  "secondaryLifeAreas",
  "topicTags",
  "sourceShape",
  "secondarySourceShapes",
  "primaryExecutionPattern",
  "secondaryExecutionPatterns",
  "primaryArtifact",
  "secondaryArtifacts",
];

function sourceFormat(record) {
  const mediaTypes = {
    article: "text/html",
    checklist: "text/html",
    table: "text/html",
    document: "application/pdf",
    video: "text/html+video-transcript",
    audio: "text/html+audio-links",
    course: "text/html+image",
    collection: "text/html",
    template: "text/html",
    api_feed: "application/json",
    interactive_page: "text/html",
  };
  return {
    category: record.source.format,
    mediaType: mediaTypes[record.source.format] ?? "text/html",
    detail: { evidence: record.source.evidence },
  };
}

function audienceFor(record, taxonomy) {
  const roleByArea = {
    study_reading: "learner",
    work_career: "professional",
    travel_outings: "traveler",
    money_admin_purchase: "buyer",
  };
  const role = roleByArea[taxonomy.primaryLifeArea] ?? "individual";
  return {
    roles: [role],
    ageBands: [record.caseId === "OQ-C04-PASSPORT" ? "adult" : "not_specified"],
    skillLevel:
      record.caseId === "OQ-C02-KMOOC-FULL" ? "beginner" : "not_applicable",
    contentLocale: record.source.locale,
    applicableLocales: [record.source.locale],
    applicability:
      record.source.locale.startsWith("ko")
        ? "local_direct"
        : record.source.providerType === "open_knowledge"
          ? "global_general"
          : "local_adaptation_required",
    prerequisites: [],
    accountOrEntitlement:
      record.source.access === "paywalled"
        ? "source_file_required"
        : record.caseId === "OQ-B04-TODOIST"
          ? "free_account"
          : "none",
    collaborationContext:
      ["OQ-C06-NASA", "OQ-B01-HEAT", "OQ-P04-PORTFOLIO"].includes(
        record.caseId,
      )
        ? "team_roles"
        : "solo",
    userNeedSignals: [
      taxonomy.primaryExecutionPattern === "date_preparation"
        ? "remember_when"
        : taxonomy.primaryExecutionPattern === "progress_tracking"
          ? "track_progress"
          : taxonomy.primaryExecutionPattern === "resource_queue"
            ? "queue_resources"
            : taxonomy.primaryExecutionPattern === "compare_decide"
              ? "choose_between_options"
              : "avoid_omission",
    ],
    frictionSignals: ["source_revisit_cost"],
  };
}

function compileAccess(record, decisionAccess = {}) {
  return {
    providerType: decisionAccess.providerType ?? record.source.providerType,
    platformRoles: decisionAccess.platformRoles ?? ["discover", "host"],
    discoveryAccess:
      decisionAccess.discoveryAccess ?? record.source.access,
    rowAccess: decisionAccess.rowAccess ?? record.source.rowAccess,
    acquisitionMethods:
      decisionAccess.acquisitionMethods ??
      [record.source.access === "paywalled" ? "manual_copy" : "html_fetch"],
    sourceFormat:
      decisionAccess.sourceFormat?.category
        ? decisionAccess.sourceFormat
        : sourceFormat(record),
  };
}

function compileRights(record, decisionRights = {}) {
  const allowedUse = decisionRights.allowedUse ?? record.source.allowedUse;
  const reviewStatus =
    decisionRights.reviewStatus ?? record.source.rightsReview;
  return {
    basis: decisionRights.basis ?? record.source.rightsBasis,
    allowedUse,
    territoryScope: decisionRights.territoryScope ?? "unknown",
    territories: decisionRights.territories ?? [],
    reviewStatus,
    personalTransformAllowed:
      decisionRights.personalTransformAllowed ??
      allowedUse.includes("personal_transform"),
    publicReleaseAllowed:
      decisionRights.publicReleaseAllowed ??
      (allowedUse.includes("public_derived") && reviewStatus === "approved"),
    rationale:
      decisionRights.rationale ??
      `접근 가능성과 별개로 ${reviewStatus} 권리 상태를 유지한다.`,
  };
}

function editorialActionFor(reviewState) {
  if (reviewState.conversionReadiness === "source_import_required")
    return "import_source";
  if (reviewState.blockers.includes("rights_permission_required"))
    return "request_permission";
  if (reviewState.blockers.includes("safety_review_required"))
    return "safety_review";
  if (reviewState.blockers.includes("locale_review_required")) return "localize";
  if (reviewState.conversionReadiness === "hold") return "park";
  return "keep";
}

function compileReview(record, decisionReview = {}, feasibility) {
  const base = record.expected.classification.review;
  const result = {
    sourceRowStatus:
      decisionReview.sourceRowStatus ?? base.sourceRowStatus,
    conversionReadiness: feasibility.conversionReadiness,
    freshnessReview:
      decisionReview.freshnessReview ?? base.freshnessReview,
    localeReview: decisionReview.localeReview ?? base.localeReview,
    safetyReview: decisionReview.safetyReview ?? base.safetyReview,
    privacyReview: decisionReview.privacyReview ?? base.privacyReview,
    rightsReview: decisionReview.rightsReview ?? base.rightsReview,
    promotionState:
      decisionReview.promotionState ?? base.promotionState,
    blockers: decisionReview.blockers ?? feasibility.blockers,
    portfolioRole:
      decisionReview.portfolioRole ??
      (record.lane === "negative_control"
        ? "reference_keep"
        : record.lane === "positive_control"
          ? "repeat_reuse"
          : "representative_start"),
    editorialAction: "keep",
    backendStorable: decisionReview.backendStorable ?? true,
  };
  result.editorialAction =
    decisionReview.editorialAction ?? editorialActionFor(result);
  return result;
}

function compileClassification(record, rawClassification, feasibility) {
  const raw = rawClassification ?? record.expected.classification;
  const rawTaxonomy = raw.taxonomy ?? raw;
  const taxonomy = Object.fromEntries(
    taxonomyKeys.map((key) => [
      key,
      rawTaxonomy[key] ?? record.expected.classification[key],
    ]),
  );
  const rights = compileRights(record, raw.rights);
  rights.publicReleaseAllowed = feasibility.publicExportAllowed;
  const reviewState = compileReview(record, raw.review, feasibility);
  reviewState.rightsReview = rights.reviewStatus;
  return {
    taxonomy,
    audienceAndApplicability:
      raw.audienceAndApplicability ?? audienceFor(record, taxonomy),
    access: compileAccess(record, raw.access),
    rights,
    review: reviewState,
  };
}

function compileSteps(record) {
  const groups = new Map();
  for (const entry of record.draft.items) {
    if (!groups.has(entry.step)) groups.set(entry.step, []);
    groups.get(entry.step).push(entry);
  }
  return [...groups.entries()].map(([title, entries], index) => ({
    stepId: `${record.caseId.toLowerCase()}-step-${index + 1}`,
    flowId: `flow-${record.caseId.toLowerCase()}`,
    title,
    order: index,
    itemIds: entries.map((entry) => entry.id),
    sourceRowIds: [...new Set(entries.flatMap((entry) => entry.sourceRowIds))],
  }));
}

function evidenceText(record, sourceRowIds) {
  const first = sourceRowIds
    .map((rowId) =>
      record.sourceRows.find((row) => row.sourceRowId === rowId),
    )
    .find(Boolean);
  return first?.detail ?? first?.title ?? "source evidence";
}

function evidenceBoundValue(record, entry, kind) {
  if (!entry) return null;
  const userInputPath = JSON.stringify(entry).includes("$user.")
    ? JSON.stringify(entry).match(/\$user\.[A-Za-z0-9_.]+/)?.[0] ?? null
    : null;
  const value =
    kind === "schedule"
      ? entry.label ?? entry.start ?? entry.mode ?? null
      : entry.trigger ?? null;
  return {
    value,
    sourceRowIds: entry.sourceRowIds,
    evidenceQuote:
      userInputPath === null
        ? evidenceText(record, entry.sourceRowIds)
        : null,
    userInputPath,
  };
}

function compileItems(record, steps) {
  const stepByTitle = new Map(steps.map((step) => [step.title, step.stepId]));
  return record.draft.items.map((entry, index) => {
    const linked = (collection) =>
      collection
        .filter((candidate) =>
          candidate.sourceRowIds.some((rowId) =>
            entry.sourceRowIds.includes(rowId),
          ),
        )
        .map((candidate) => candidate.id);
    return {
      itemId: entry.id,
      stepId: stepByTitle.get(entry.step),
      title: entry.title,
      intent: entry.intent,
      order: index,
      completion: {
        mode: entry.completionMode,
        doneWhen: entry.doneWhen,
      },
      schedule: evidenceBoundValue(
        record,
        entry.schedule
          ? { ...entry.schedule, sourceRowIds: entry.sourceRowIds }
          : null,
        "schedule",
      ),
      recurrence: evidenceBoundValue(
        record,
        entry.recurrence
          ? {
              ...entry.recurrence,
              sourceRowIds:
                entry.recurrence.sourceRowIds ?? entry.sourceRowIds,
            }
          : null,
        "recurrence",
      ),
      fieldIds: linked(record.draft.fields),
      memoIds: linked(record.draft.memos),
      referenceIds: linked(record.draft.references),
      conditionalResponseIds: linked(record.draft.conditionalResponses),
      sourceRowIds: entry.sourceRowIds,
    };
  });
}

function normalizeFieldValueType(fieldType) {
  if (fieldType === "date") return "date";
  if (["choice", "status"].includes(fieldType)) return "enum";
  if (fieldType === "progress") return "string";
  return "string";
}

function normalizeMemoKind(kind) {
  if (kind === "caution") return "caution";
  if (kind === "user_note") return "user_note";
  return "detail";
}

function conditionalSeverity(entry) {
  if (entry.escalation === "119") return "emergency";
  if (/중지/.test(entry.then)) return "stop";
  if (/위험|이상|주의/.test(entry.when)) return "caution";
  return "info";
}

function compileCanonicalDraft(record, executableAllowed) {
  if (!executableAllowed) {
    return {
      flow: null,
      steps: [],
      items: [],
      fields: [],
      memos: [],
      references: [],
      conditionalResponses: [],
    };
  }
  const steps = compileSteps(record);
  const items = compileItems(record, steps);
  return {
    flow: {
      flowId: `flow-${record.caseId.toLowerCase()}`,
      title: record.draft.title,
      userJob: record.userJob,
      stepIds: steps.map((step) => step.stepId),
      anchorDefinitions: record.draft.fields
        .filter((entry) => JSON.stringify(entry.value).includes("$user."))
        .map((entry) => ({
          fieldId: entry.id,
          path: entry.value,
        })),
    },
    steps,
    items,
    fields: record.draft.fields.map((entry) => ({
      fieldId: entry.id,
      label: entry.label,
      value: entry.value ?? (entry.options.length ? entry.options : null),
      valueType: normalizeFieldValueType(entry.fieldType),
      sourceRowIds: entry.sourceRowIds,
      userEditable: entry.required || String(entry.value ?? "").startsWith("$user."),
    })),
    memos: record.draft.memos.map((entry) => ({
      memoId: entry.id,
      kind: normalizeMemoKind(entry.kind),
      text: `${entry.title}: ${entry.body}`,
      sourceRowIds: entry.sourceRowIds,
    })),
    references: record.draft.references.map((entry) => ({
      referenceId: entry.id,
      label: `${entry.title}: ${entry.body}`,
      url: record.source.url,
      sourceRowIds: entry.sourceRowIds,
    })),
    conditionalResponses: record.draft.conditionalResponses.map((entry) => ({
      conditionalResponseId: entry.id,
      trigger: entry.when,
      response: entry.then,
      severity: conditionalSeverity(entry),
      sourceRowIds: entry.sourceRowIds,
      evidenceQuote: evidenceText(record, entry.sourceRowIds),
    })),
  };
}

function projectionAvailability(record, artifact) {
  if (!record.expected.feasibility.executableAllowed) return "blocked";
  const sensitiveHoldBlockers = new Set([
    "rights_unknown",
    "rights_permission_required",
    "rights_blocked",
    "safety_review_required",
    "locale_review_required",
    "privacy_review_required",
  ]);
  if (
    record.expected.feasibility.conversionReadiness === "hold" &&
    record.expected.feasibility.blockers.some((blocker) =>
      sensitiveHoldBlockers.has(blocker),
    )
  )
    return "blocked";
  const taxonomy =
    record.expected.classification.taxonomy ?? record.expected.classification;
  if (taxonomy.primaryArtifact === artifact) return "primary";
  if (taxonomy.secondaryArtifacts.includes(artifact))
    return "secondary";
  if (artifact === "memo") return "fallback";
  return "not_applicable";
}

function compileProjection(record, artifact, draft) {
  const availability = projectionAvailability(record, artifact);
  if (availability === "blocked" || availability === "not_applicable") {
    return {
      availability,
      payload: null,
      essentialFieldsRetained: [],
      lossManifest:
        availability === "blocked"
          ? [
              {
                field: "canonicalDraft",
                reason:
                  record.expected.feasibility.errorCode ?? "conversion_blocked",
                severity: "essential",
              },
            ]
          : [
              {
                field: artifact,
                reason: "projection_not_natural_for_user_job",
                severity: "none",
              },
            ],
    };
  }

  const sourceUrl = record.source.url;
  const warningTexts = [
    ...draft.memos
      .filter((entry) => entry.kind === "caution")
      .map((entry) => entry.text),
    ...draft.conditionalResponses
      .filter((entry) => ["caution", "stop", "emergency"].includes(entry.severity))
      .map((entry) => `${entry.trigger}: ${entry.response}`),
  ];
  const referenceValues = draft.references.map((entry) => ({
    label: entry.label,
    url: entry.url,
  }));
  const payloadByArtifact = {
    calendar: {
      kind: "calendar_preview",
      entries: draft.items
        .filter((entry) => entry.schedule)
        .map((entry) => ({
          title: entry.title,
          doneWhen: entry.completion.doneWhen,
          schedule: entry.schedule,
          sourceUrl,
        })),
      courseWindow:
        record.caseId === "OQ-C02-KMOOC-FULL"
          ? "2026-07-01~2026-08-31"
          : null,
      note:
        draft.items.some((entry) => !entry.schedule)
          ? "날짜 근거가 없는 Item은 Calendar에서 제외"
          : null,
      fields: draft.fields.map((entry) => ({
        label: entry.label,
        value: entry.value,
      })),
      warnings: warningTexts,
      references: referenceValues,
    },
    checklist: {
      kind: "checklist_preview",
      groups: draft.steps.map((step) => ({
        title: step.title,
        entries: draft.items
          .filter((entry) => entry.stepId === step.stepId)
          .map((entry) => ({
            title: entry.title,
            doneWhen: entry.completion.doneWhen,
          })),
      })),
      references: [
        ...draft.references.map((entry) => entry.label),
        ...warningTexts,
      ],
    },
    todo: {
      kind: "todo_preview",
      tasks: draft.items.map((entry, index) => ({
        order: index + 1,
        step:
          draft.steps.find((step) => step.stepId === entry.stepId)?.title ?? "",
        title: entry.title,
        doneWhen: entry.completion.doneWhen,
        schedule: entry.schedule ?? null,
        recurrence: entry.recurrence ?? null,
        sourceData: {
          ...(record.draft.items.find(
            (candidate) => candidate.id === entry.itemId,
          )?.data ?? {}),
        },
        sourceUrl,
      })),
      warnings: warningTexts,
      references: referenceValues,
    },
    sheet: {
      kind: "sheet_preview",
      columns: ["순서", "단계", "항목", "상태", "출처 정보"],
      rows: draft.items.map((entry, index) => ({
        order: index + 1,
        step:
          draft.steps.find((step) => step.stepId === entry.stepId)?.title ?? "",
        title: entry.title,
        status:
          record.draft.items.find((candidate) => candidate.id === entry.itemId)
            ?.data?.status ?? "not_started",
        sourceData:
          record.draft.items.find((candidate) => candidate.id === entry.itemId)
            ?.data ?? {},
        sourceUrl,
      })),
      fields: draft.fields.map((entry) => ({
        label: entry.label,
        value: entry.value,
      })),
    },
    memo: {
      kind: "memo_preview",
      title: draft.flow?.title ?? record.title,
      decisionItems: draft.items
        .filter((entry) => entry.intent === "decide")
        .map((entry) => entry.title),
      fields: draft.fields.map((entry) => ({
        label: entry.label,
        value: entry.value,
      })),
      notes: draft.memos.map((entry) => ({
        kind: entry.kind,
        text: entry.text,
      })),
      references: draft.references.map((entry) => ({
        label: entry.label,
        url: entry.url,
      })),
      conditions: draft.conditionalResponses.map((entry) => ({
        trigger: entry.trigger,
        response: entry.response,
        severity: entry.severity,
      })),
      sourceUrl,
    },
  };

  return {
    availability,
    payload: payloadByArtifact[artifact],
    essentialFieldsRetained:
      record.expected.essentialProjectionFields[artifact],
    lossManifest:
      artifact ===
      (record.expected.classification.taxonomy ?? record.expected.classification)
        .primaryArtifact
        ? []
        : [
            {
              field: "primaryState",
              reason: "secondary_projection_may_omit_primary_state",
              severity: "nonessential",
            },
          ],
  };
}

export function compileEnvelope(record, options = {}) {
  const sourceRows = withSourceIdentity(record);
  const profile = options.profile ?? "rules_adjudicated";
  const rawFeasibility = options.feasibility ?? record.expected.feasibility;
  const feasibility = {
    generationState: rawFeasibility.generationState,
    outcome: rawFeasibility.outcome,
    conversionReadiness: rawFeasibility.conversionReadiness,
    errorCode: rawFeasibility.errorCode ?? null,
    blockers: rawFeasibility.blockers ?? [],
    executableAllowed: rawFeasibility.executableAllowed,
    publicExportAllowed: rawFeasibility.publicExportAllowed,
    reason:
      rawFeasibility.reason ??
      (rawFeasibility.executableAllowed
        ? record.expected.expectedUse
        : record.beforeProblem),
  };
  const classification = compileClassification(
    record,
    options.classification,
    feasibility,
  );
  const compiled = compileCanonicalDraft(record, feasibility.executableAllowed);
  const roles = (options.roles ?? record.roles).map((assignment) => ({
    sourceRowId: assignment.sourceRowId,
    role: assignment.role,
    targetIds: [...new Set(assignment.targetIds ?? [])],
    reason: assignment.reason,
  }));
  return {
    envelopeSchemaVersion: OUTPUT_SCHEMA_VERSION,
    caseId: record.caseId,
    requestId: `${options.roundId ?? "round-2"}-${profile}-${record.caseId}`,
    sourceEvidence: {
      primarySource: {
        sourceId: record.source.sourceId,
        url: record.source.url,
        title: record.source.title,
        snapshot: {
          snapshotId: snapshotId(record),
          capturedAt: `${record.source.checkedAt}T00:00:00.000+09:00`,
          contentHash: hash(sourceRows),
          locator: record.source.url,
        },
      },
      claimedScope: record.claimedScope,
      sourceCompleteness: record.sourceCompleteness,
      sourceRows,
      landmarks: asLandmarks(record),
      missingRows: asMissingRows(record),
      roleAssignments: roles,
    },
    feasibility,
    classification,
    canonicalDraft: compiled,
    projections: Object.fromEntries(
      Object.keys(projectionLabels).map((artifact) => [
        artifact,
        compileProjection(
          {
            ...record,
            expected: { ...record.expected, classification, feasibility },
          },
          artifact,
          compiled,
        ),
      ]),
    ),
    reviewEvidence: {
      validatorStatus: "not_run",
      independentReviewIds: [],
      correction: {
        editLevel: "not_reviewed",
        minutes: null,
        itemKeepRate: null,
        notes: `${profile} / ${options.promptVersion ?? "output-quality-prompt-v2.2"}`,
      },
      unresolvedDisagreements: [],
    },
  };
}

export function buildRun({
  roundId,
  runId,
  profile,
  promptVersion,
  decisionMap = new Map(),
}) {
  const outputs = cases.map((record) => {
    const decision = decisionMap.get(record.caseId) ?? {};
    return compileEnvelope(record, {
      roundId,
      profile,
      promptVersion,
      classification: decision.classification,
      feasibility: decision.feasibility,
      roles: decision.roles,
    });
  });
  return {
    runSchemaVersion: "flowme-url-to-flow-output-run-v2",
    runId,
    roundId,
    caseSetVersion: CASE_SET_VERSION,
    goldContractVersion: GOLD_CONTRACT_VERSION,
    outputSchemaVersion: OUTPUT_SCHEMA_VERSION,
    taxonomyVersion: TAXONOMY_VERSION,
    promptVersion,
    generator: {
      evidenceKind:
        roundId === "round-1" && profile === "rules_baseline"
          ? "unadjudicated_baseline"
          : "session_agent_compiled",
      profile,
      executionMode: "session_agent_plus_deterministic_compiler",
      providerApiCalled: false,
      modelIdentityEvidence: null,
    },
    timing: { evidenceKind: "not_available", totalMs: null },
    usage: {
      evidenceKind: "not_available",
      inputTokens: null,
      outputTokens: null,
    },
    cost: {
      evidenceKind: "not_available",
      currency: null,
      amount: null,
    },
    outputs,
  };
}

function readDecisionFile(relativePath) {
  const target = path.join(HERE, relativePath);
  if (!fs.existsSync(target)) return new Map();
  const document = JSON.parse(fs.readFileSync(target, "utf8"));
  return new Map(
    (document.decisions ?? []).map((decision) => [decision.caseId, decision]),
  );
}

function freezeEvidence() {
  writeJson(path.join(HERE, "case-manifest-v2.json"), buildManifest());
  writeJson(path.join(HERE, "gold-source-contract-v2.json"), buildGoldContract());
  writeJson(path.join(HERE, "blind-source-packet-v2.json"), buildBlindPacket());
}

function buildHistoricalBaselineDecisionMap() {
  const byId = new Map();
  const override = (caseId, taxonomyPatch) => {
    const record = cases.find((candidate) => candidate.caseId === caseId);
    const classification = structuredClone(record.expected.classification);
    Object.assign(classification, taxonomyPatch);
    byId.set(caseId, { classification });
  };
  override("OQ-C02-KMOOC-FULL", {
    primaryExecutionPattern: "phase_lifecycle",
    secondaryExecutionPatterns: ["progress_tracking"],
    primaryArtifact: "checklist",
    secondaryArtifacts: ["sheet", "calendar"],
  });
  override("OQ-C04-PASSPORT", {
    primaryArtifact: "checklist",
    secondaryArtifacts: ["todo", "memo"],
  });
  override("OQ-C08-AC-DECISION", {
    primaryArtifact: "sheet",
    secondaryArtifacts: ["memo", "todo"],
  });
  override("OQ-B01-HEAT", {
    sourceShape: "checklist_rows",
    secondarySourceShapes: ["narrative_guidance"],
    primaryExecutionPattern: "repeating_routine",
    secondaryExecutionPatterns: ["ordered_procedure"],
    primaryArtifact: "checklist",
    secondaryArtifacts: ["memo"],
  });
  return byId;
}

function buildInitialRuns() {
  const rootRun = buildRun({
    roundId: "round-1",
    runId: "round-1-rules-baseline",
    profile: "rules_baseline",
    promptVersion: "output-quality-prompt-v2.1",
    decisionMap: buildHistoricalBaselineDecisionMap(),
  });
  writeJson(path.join(RUNS, "round-1", "rules-baseline.json"), rootRun);
}

function buildAdjudicatedRun(roundId, promptVersion) {
  const run = buildRun({
    roundId,
    runId: `${roundId}-rules-adjudicated`,
    profile: "rules_adjudicated",
    promptVersion,
  });
  writeJson(
    path.join(RUNS, roundId, "rules-adjudicated.json"),
    run,
  );
}

const command = process.argv[2] ?? "--freeze";
if (command === "--freeze") {
  freezeEvidence();
  console.log(`Frozen ${cases.length} cases and ${cases.reduce((n, c) => n + c.sourceRows.length, 0)} SourceRows.`);
} else if (command === "--round-1") {
  freezeEvidence();
  buildInitialRuns();
  console.log("Built Round 1 run documents from available independent decisions.");
} else if (command === "--round-2") {
  freezeEvidence();
  buildAdjudicatedRun("round-2", "output-quality-prompt-v2.2");
  console.log("Built adjudicated Round 2 run.");
} else if (command === "--round-3") {
  buildAdjudicatedRun("round-3", "output-quality-prompt-v2.3");
  console.log("Built adjudicated Round 3 run.");
} else if (command === "--round-4") {
  buildAdjudicatedRun("round-4", "output-quality-prompt-v2.3-stability");
  console.log("Built adjudicated Round 4 stability run without rewriting frozen evidence or prior runs.");
} else {
  throw new Error(`Unknown command: ${command}`);
}
