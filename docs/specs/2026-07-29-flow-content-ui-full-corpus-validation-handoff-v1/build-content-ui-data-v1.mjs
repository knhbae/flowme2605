import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  byOrder,
  normalizeText,
  normalizeUrl,
  sha256,
  slug,
  unique,
} from "./lib/utils-v1.mjs";
import { generateProjectionCells, PROJECTIONS } from "./lib/projection-engine-v1.mjs";
import { scheduleItems } from "./lib/pacing-engine-v1.mjs";
import { activateEventIntent } from "./lib/event-intent-engine-v1.mjs";
import { makeInitialReviewState } from "./lib/review-state-v1.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const rel = (...parts) => path.join(...parts);

const inputPaths = {
  canonical: rel(
    "docs/specs/2026-07-28-flow-canonical-structure-corpus-expansion-v1/canonical-corpus-v1.json",
  ),
  events: rel(
    "docs/specs/2026-07-29-flow-projection-semantics-scheduling-event-corpus-v1/event-schedule-corpus-v1.json",
  ),
  preapp: rel("docs/content-audit/2026-07-11-content-portfolio-preapp-v1.json"),
  round2: rel(
    "docs/content-audit/2026-07-11-content-portfolio-expansion-round2-v1.json",
  ),
  generalizationGold: rel(
    "docs/specs/2026-07-21-flow-content-generalization-benchmark-v1/gold-source-contract-v1.json",
  ),
  generalizationManifest: rel(
    "docs/specs/2026-07-21-flow-content-generalization-benchmark-v1/source-manifest-v1.json",
  ),
  generalizationPackets: rel(
    "docs/specs/2026-07-21-flow-content-generalization-benchmark-v1/blind-source-packets-v1.json",
  ),
  additions: rel(
    "docs/specs/2026-07-29-flow-content-ui-full-corpus-validation-handoff-v1/new-source-verification-v1.json",
  ),
  historical: rel(
    "docs/content-audit/reference-260601-preview-structure.json",
  ),
};

function absolute(relativePath) {
  return path.join(repoRoot, relativePath);
}

function readJson(relativePath, fallback = null) {
  const file = absolute(relativePath);
  if (!fs.existsSync(file)) {
    if (fallback !== null) return fallback;
    throw new Error(`Missing input: ${relativePath}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function fileLineage(relativePath) {
  const file = absolute(relativePath);
  if (!fs.existsSync(file)) return null;
  const data = fs.readFileSync(file);
  return {
    path: relativePath.replaceAll("\\", "/"),
    sha256: `sha256:${awaitableHash(data)}`,
    bytes: data.length,
  };
}

function awaitableHash(buffer) {
  return sha256(buffer.toString("binary")).replace("sha256:", "");
}

function writeJson(name, value) {
  fs.writeFileSync(path.join(here, name), `${JSON.stringify(value, null, 2)}\n`);
}

function inferSourceFormat(url = "", explicit = "") {
  if (explicit) {
    const value = normalizeText(explicit);
    if (value.includes("pdf")) return "pdf";
    if (value.includes("csv")) return "csv";
    if (value.includes("video") || value.includes("youtube")) return "video";
    if (value.includes("table")) return "table";
  }
  const lower = url.toLowerCase();
  if (lower.includes(".pdf")) return "pdf";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "video";
  if (lower.includes(".csv")) return "csv";
  return "html";
}

function inferLifeArea(title = "", userJob = "") {
  const text = `${title} ${userJob}`;
  if (/여행|관광|축제|공연|전시|관람|박물관|공원|트레일/.test(text)) return "travel_outings";
  if (/아이|아동|영유아|출생|가족|부모|생일|돌잔치|고양이/.test(text)) return "family_parenting";
  if (/건강|운동|달리기|체력|소방|안전|식품 보관/.test(text)) return "health_fitness";
  if (/학습|강의|코딩|문제|교육|독서|과정|로드맵/.test(text)) return "study_reading";
  if (/취업|면접|구직|사업자|팟캐스트|콘텐츠 발행|프로젝트/.test(text)) return "work_career";
  if (/식단|요리|레시피|반찬|케이크|김밥/.test(text)) return "meals_grocery";
  if (/여권|신고|신청|세금|계약|면허|검사|구매|견적|지원/.test(text)) {
    return "money_admin_purchase";
  }
  if (/수리|청소|정리|세탁|에어컨|필터|수납|인테리어|이사/.test(text)) return "home_living";
  return "hobby_pet";
}

function canonicalSourceShape(value = "") {
  const text = normalizeText(value);
  if (text.includes("single")) return "single_action";
  if (text.includes("date") || text.includes("d-day") || text.includes("offset")) {
    return "date_offsets";
  }
  if (text.includes("lesson") || text.includes("curriculum") || text.includes("course")) {
    return "lesson_rows";
  }
  if (text.includes("resource") || text.includes("collection") || text.includes("project")) {
    return "resource_collection";
  }
  if (text.includes("procedure") || text.includes("ordered") || text.includes("step")) {
    return "procedure_rows";
  }
  if (text.includes("table") || text.includes("chart") || text.includes("field")) {
    return "table_rows";
  }
  if (text.includes("checklist") || text.includes("packing")) return "checklist_rows";
  if (text.includes("narrative") || text.includes("article")) return "narrative_guidance";
  return "checklist_rows";
}

function executionPatternFor(primaryProjection, sourceShape, temporalIntent) {
  if (temporalIntent && temporalIntent !== "no_schedule") return "date_preparation";
  if (sourceShape === "procedure_rows") return "ordered_procedure";
  if (sourceShape === "lesson_rows") return "progress_tracking";
  if (sourceShape === "resource_collection") return "resource_queue";
  if (primaryProjection === "sheet") return "progress_tracking";
  if (primaryProjection === "todo") return "resource_queue";
  return "ordered_procedure";
}

function mapProjection(value = "") {
  const normalized = normalizeText(value).replaceAll(" ", "_");
  if (normalized.includes("calendar")) return "calendar";
  if (normalized.includes("todo")) return "todo";
  if (normalized.includes("sheet")) return "sheet";
  if (normalized.includes("memo")) return "memo";
  return "checklist";
}

function makeReadiness({
  logic = "not_assessed",
  publicState = "not_assessed",
  rights = "not_assessed",
  personal = "available",
  sourceCompleteness = "complete",
  safety = "not_assessed",
  locale = "not_assessed",
  privacy = "not_assessed",
  promotion = "research_only",
} = {}) {
  return {
    architectureFit: "go",
    logicReadiness: logic,
    publicReadiness: publicState,
    rightsStatus: rights,
    personalConversionAvailability: personal,
    sourceCompleteness,
    safetyReview: safety,
    localeReview: locale,
    privacyReview: privacy,
    promotionState: promotion,
  };
}

function minimumInputsFromCanonical(fixture) {
  const explicit = [
    ...(fixture.inputs?.required ?? []),
    ...(fixture.inputs?.optional ?? []),
  ];
  if (explicit.length) {
    return explicit.map((input) => ({
      key: input.key,
      label: input.label,
      type: input.type,
      required: Boolean(input.required),
      purposes: input.purposes ?? (input.type === "date" ? ["schedule"] : ["execution"]),
      source: "user_overlay",
    }));
  }
  return (fixture.canonicalContent.fields ?? []).map((field) => ({
    key: field.key,
    label: field.label,
    type: field.valueType,
    required: field.required,
    purposes: field.purposes,
    source: field.valueSource === "source" ? "source" : "user_overlay",
  }));
}

function normalizeCanonicalFixture(fixture) {
  const canonical = structuredClone(fixture.canonicalContent);
  const userJob =
    (typeof fixture.userNeed === "string" ? fixture.userNeed : null) ??
    canonical.flows?.[0]?.userNeed ??
    canonical.bundle?.summary ??
    fixture.source.title;
  const source = canonical.sources?.[0] ?? {};
  const primaryProjection = mapProjection(
    fixture.taxonomy.primaryArtifact ?? fixture.projectionEvaluation.primaryArtifact,
  );
  const secondaryProjections = unique(
    (fixture.taxonomy.secondaryArtifacts ?? []).map(mapProjection),
  ).filter((value) => value !== primaryProjection);
  const itemCount = canonical.items?.length ?? 0;
  const scheduledCount = (canonical.items ?? []).filter((item) => item.schedule).length;
  const productBatches = new Set(["qualified_v2_baseline", "value_qualified_gold"]);
  const corpusTier = productBatches.has(fixture.batch)
    ? "product_candidate"
    : "structure_probe";
  const contentMode =
    itemCount > 0
      ? "flow_content"
      : (canonical.fields?.length ?? 0) > 0
        ? "field_template_probe"
        : "boundary_control";
  const content = {
    contentId: `canonical:${fixture.fixtureId}`,
    userJobId: sha256({ url: normalizeUrl(fixture.source.canonicalUrl), userJob }).slice(7, 23),
    displayTitle: canonical.bundle?.title ?? fixture.source.title,
    title: canonical.bundle?.title ?? fixture.source.title,
    saveReason: userJob,
    userJob,
    contentMode,
    corpusTier,
    source: {
      sourceId: fixture.source.sourceId,
      title: fixture.source.title,
      provider: fixture.source.provider ?? source.publisher ?? "unknown",
      url: fixture.source.url,
      canonicalUrl: fixture.source.canonicalUrl,
      locale: fixture.source.locale ?? source.locale ?? "unknown",
      sourceFormat: inferSourceFormat(fixture.source.canonicalUrl),
      observedAt: fixture.source.observedAt,
      accessStatus: fixture.source.accessStatus,
      evidenceMethod: "frozen_canonical_fixture",
    },
    taxonomy: {
      version: "1.1",
      primaryLifeArea: fixture.taxonomy.primaryLifeArea,
      secondaryLifeAreas: fixture.taxonomy.secondaryLifeAreas ?? [],
      topicTags: fixture.taxonomy.topicTags ?? [],
      sourceShape: fixture.taxonomy.sourceShape,
      sourceShapeMetadata: null,
      primaryExecutionPattern: fixture.taxonomy.primaryExecutionPattern,
      secondaryExecutionPatterns: fixture.taxonomy.secondaryExecutionPatterns ?? [],
      temporalIntent: scheduledCount ? "anchor_offset" : "no_schedule",
    },
    readiness: makeReadiness({
      logic: "go",
      publicState: fixture.researchReview?.publicReadiness ?? "not_assessed",
      rights: source.rightsStatus ?? "not_assessed",
      personal: "available",
      sourceCompleteness: "complete",
      safety: source.riskLevel === "high" ? "required" : "not_assessed",
      locale: "not_assessed",
      privacy: "not_assessed",
    }),
    minimumInputs: minimumInputsFromCanonical(fixture),
    primaryProjection,
    secondaryProjections,
    calendarGroupingPolicy:
      fixture.projectionEvaluation?.calendarPolicy ??
      (primaryProjection === "calendar" ? "per_item" : "none"),
    pacingEligible: itemCount > 1 && scheduledCount === 0,
    canonical,
    eventSource: null,
    lineage: {
      datasetId: "canonical-corpus-v1",
      originArtifacts: [inputPaths.canonical.replaceAll("\\", "/")],
      originRecordRef: `#/fixtures/${fixture.fixtureId}`,
      canonicalContentHash: canonical.contentHash ?? sha256(canonical),
      sourcePacketHash: fixture.source.snapshotContentHash ?? null,
      relation: "frozen_canonical",
    },
    evidenceNotes: [
      fixture.researchReview?.claimBoundary ??
        "구조·변환 검토용 fixture이며 실제 사용자 검증이 아니다.",
    ],
    userReviewStatus: "not_reviewed",
  };
  return content;
}

function synthesizeEventCanonical(fixture) {
  const prefix = `events:${fixture.fixtureId}`;
  const sourceRows = (fixture.sourceRows ?? []).map((row) => ({
    sourceRowId: `${prefix}:${row.sourceRowId}`,
    sourceId: `${prefix}:source`,
    snapshotId: `${prefix}:snapshot`,
    rowType: row.kind ?? "reference",
    title: row.title,
    detail: row.detail ?? row.title,
    locator: `${fixture.title} · ${row.order + 1}`,
    order: row.order,
    original: row,
  }));
  const rowIdMap = new Map(
    (fixture.sourceRows ?? []).map((row) => [
      row.sourceRowId,
      `${prefix}:${row.sourceRowId}`,
    ]),
  );
  const steps = (fixture.steps ?? []).map((step) => ({
    stepId: `${prefix}:${step.stepId}`,
    flowId: `${prefix}:flow`,
    title: step.title,
    order: step.order,
    itemIds: (step.itemIds ?? []).map((id) => `${prefix}:${id}`),
    sourceRefIds: [],
  }));
  const items = (fixture.items ?? []).map((item) => ({
    itemId: `${prefix}:${item.itemId}`,
    stepId: `${prefix}:${item.stepId}`,
    title: item.title,
    description: item.description ?? "",
    intent: item.intent ?? "act",
    order: item.order,
    completion: item.completion ?? { mode: "check", doneWhen: null },
    schedule: item.schedule ?? null,
    fieldIds: [],
    memoIds: [],
    cautionMemoIds: [],
    sourceRefIds: [],
    sourceRowIds: (item.sourceRowIds ?? []).map((id) => rowIdMap.get(id) ?? `${prefix}:${id}`),
    optional: false,
    dependsOnItemIds: (item.dependsOnItemIds ?? []).map((id) => `${prefix}:${id}`),
  }));
  return {
    schemaVersion: "flow-content-ui-derived-canonical-v1",
    contentId: prefix,
    contentHash: sha256({ fixtureId: fixture.fixtureId, sourceRows, items }),
    bundle: {
      bundleId: `${prefix}:bundle`,
      title: fixture.title,
      summary: fixture.userJob,
      lifeArea: inferLifeArea(fixture.title, fixture.userJob),
      topicTags: [],
      flowIds: [`${prefix}:flow`],
    },
    flows: [
      {
        flowId: `${prefix}:flow`,
        title: fixture.title,
        summary: fixture.userJob,
        userNeed: fixture.userJob,
        stepIds: steps.map((step) => step.stepId),
        primaryArtifact: mapProjection(fixture.primaryProjection),
      },
    ],
    steps,
    items,
    fields: [],
    memos: [],
    sources: [
      {
        sourceId: `${prefix}:source`,
        title: fixture.title,
        originalUrl: fixture.url,
        canonicalUrl: fixture.canonicalUrl,
        locale: fixture.locale,
        publisher: fixture.provider,
        rightsStatus: "not_assessed",
      },
    ],
    sourceSnapshots: [],
    sourceRows,
    sourceRefs: [],
  };
}

function rowIdsForOccurrence(fixture, occurrence) {
  const exact = (fixture.sourceRows ?? []).filter((row) => {
    if (row.start && occurrence.start && row.start === occurrence.start) return true;
    if (row.startDate && occurrence.startDate && row.startDate === occurrence.startDate) {
      return true;
    }
    if (
      row.startDate &&
      occurrence.start &&
      occurrence.start.slice(0, 10) >= row.startDate &&
      (!row.endDate || occurrence.start.slice(0, 10) <= row.endDate)
    ) {
      return true;
    }
    if (row.occurrenceId && row.occurrenceId === occurrence.occurrenceId) return true;
    return false;
  });
  const candidates = exact.length
    ? exact
    : (fixture.sourceRows ?? []).filter((row) =>
        [
          "fixed_occurrence",
          "occurrence",
          "showtime",
          "all_day_occurrence",
          "festival_edition",
          "cancelled_occurrence",
          "reschedule_notice",
        ].includes(row.kind),
      );
  return candidates.map(
    (row) => `events:${fixture.fixtureId}:${row.sourceRowId}`,
  );
}

function normalizeEventFixture(fixture) {
  const canonical = synthesizeEventCanonical(fixture);
  const eventModel = fixture.eventModel;
  const eventSource = eventModel
    ? {
        eventSourceShape: fixture.sourceShape,
        series: eventModel.seriesId
          ? { seriesId: eventModel.seriesId, title: fixture.title }
          : null,
        edition: eventModel.editionId
          ? {
              editionId: eventModel.editionId,
              seriesId: eventModel.seriesId ?? null,
              title: fixture.title,
              recurrencePolicy: eventModel.recurrencePolicy ?? null,
              freshnessStatus: eventModel.freshnessStatus ?? "observed_snapshot",
            }
          : null,
        occurrences: (eventModel.occurrences ?? []).map((occurrence) => ({
          ...occurrence,
          sourceRowIds: rowIdsForOccurrence(fixture, occurrence),
        })),
        windows: [
          ...(eventModel.availabilityWindows ?? []),
          ...(eventModel.applicationWindows ?? []),
        ].map((window) => ({
          ...window,
          sourceRowIds: (fixture.sourceRows ?? [])
            .filter(
              (row) =>
                (row.start && row.start === window.start) ||
                row.kind === "application_window" ||
                row.kind === "availability_window",
            )
            .map((row) => `events:${fixture.fixtureId}:${row.sourceRowId}`),
        })),
        milestones: (eventModel.milestones ?? []).map((milestone) => ({
          ...milestone,
          sourceRowIds: (fixture.sourceRows ?? [])
            .filter(
              (row) =>
                (row.start && row.start === milestone.start) ||
                row.kind === milestone.kind ||
                row.kind === "milestone",
            )
            .map((row) => `events:${fixture.fixtureId}:${row.sourceRowId}`),
        })),
        itemActivation: eventModel.itemActivation,
        recurrenceRule: eventModel.recurrenceRule ?? null,
        recurrencePolicy: eventModel.recurrencePolicy ?? null,
        scheduleVersion: eventModel.scheduleVersion ?? null,
        supersedes: eventModel.supersedes ?? null,
      }
    : null;
  const isEventNative = fixture.fixtureGroup === "event_native";
  const primaryProjection = mapProjection(fixture.primaryProjection);
  return {
    contentId: `events:${fixture.fixtureId}`,
    userJobId: sha256({
      url: normalizeUrl(fixture.canonicalUrl),
      userJob: fixture.userJob,
    }).slice(7, 23),
    displayTitle: fixture.title,
    title: fixture.title,
    saveReason: fixture.userJob,
    userJob: fixture.userJob,
    contentMode: isEventNative
      ? "event_source_before_user_intent"
      : "flow_content",
    corpusTier: "structure_probe",
    source: {
      sourceId: `events:${fixture.fixtureId}:source`,
      title: fixture.title,
      provider: fixture.provider,
      url: fixture.url,
      canonicalUrl: fixture.canonicalUrl,
      locale: fixture.locale,
      sourceFormat: inferSourceFormat(fixture.canonicalUrl),
      observedAt: fixture.observedAt,
      accessStatus: fixture.accessStatus,
      evidenceMethod: fixture.evidenceMethod,
    },
    taxonomy: {
      version: "1.1",
      primaryLifeArea: inferLifeArea(fixture.title, fixture.userJob),
      secondaryLifeAreas: [],
      topicTags: [],
      sourceShape: isEventNative
        ? "table_rows"
        : canonicalSourceShape(fixture.sourceShape),
      sourceShapeMetadata: isEventNative ? fixture.sourceShape : null,
      primaryExecutionPattern: executionPatternFor(
        primaryProjection,
        canonicalSourceShape(fixture.sourceShape),
        fixture.sourceSchedulePresent ? "fixed_occurrence" : "no_schedule",
      ),
      secondaryExecutionPatterns: [],
      temporalIntent: fixture.sourceSchedulePresent
        ? eventSource?.windows?.length
          ? "date_window"
          : "fixed_occurrence"
        : "no_schedule",
    },
    readiness: makeReadiness({
      logic: "go",
      publicState: "not_assessed",
      rights: "not_assessed",
      personal: "available",
      sourceCompleteness: "complete",
      safety: "not_assessed",
      locale: "not_assessed",
      privacy: "not_assessed",
    }),
    minimumInputs: isEventNative
      ? [
          {
            key: "eventIntent",
            label: "저장·예약·참석 의도",
            type: "choice",
            required: true,
            purposes: ["item_activation"],
            source: "user_overlay",
          },
          {
            key: "selectedOccurrence",
            label: "회차",
            type: "choice",
            required: Boolean(eventSource?.occurrences?.length),
            purposes: ["schedule"],
            source: "user_overlay",
          },
        ]
      : [],
    primaryProjection,
    secondaryProjections: primaryProjection === "calendar" ? ["sheet", "memo"] : ["sheet", "memo"],
    calendarGroupingPolicy: "per_item",
    pacingEligible: Boolean(fixture.pacingEligible),
    canonical,
    eventSource,
    lineage: {
      datasetId: "event-schedule-corpus-v1",
      originArtifacts: [inputPaths.events.replaceAll("\\", "/")],
      originRecordRef: `#/fixtures/${fixture.fixtureId}`,
      canonicalContentHash: canonical.contentHash,
      sourcePacketHash: sha256(fixture.sourceRows ?? []),
      relation: "event_or_boundary_fixture",
    },
    evidenceNotes: fixture.sourceNotes ?? [],
    userReviewStatus: "not_reviewed",
  };
}

function scheduleFromLegacy(value, anchorFieldId) {
  if (!value) return null;
  if (value.type === "day_offset") {
    return {
      mode: "anchor_offset",
      anchorFieldId: anchorFieldId ?? "userStartDate",
      dayOffset: value.dayOffset,
      allDay: value.allDay ?? true,
      timezone: "Asia/Seoul",
      scheduleOwner: "user_overlay",
      derivation: "anchor_resolution",
    };
  }
  if (value.type === "date_window") {
    return {
      mode: "date_window",
      anchorFieldId: anchorFieldId ?? "userTargetDate",
      startDayOffset: value.startDayOffset,
      endDayOffset: value.endDayOffset,
      allDay: true,
      timezone: "Asia/Seoul",
      scheduleOwner: "user_overlay",
      derivation: "anchor_resolution",
    };
  }
  return null;
}

function normalizeLegacyFlow(bundle, flow, datasetId, originPath) {
  const prefix = `${datasetId}:${flow.flowId}`;
  const manifest =
    bundle.sourceManifest?.find((source) => source.sourceId === flow.sourceId) ??
    bundle.sourceManifest?.[0] ??
    {};
  const sourceRowsById = new Map(
    (bundle.sourceRows ?? []).map((row) => [row.sourceRowId, row]),
  );
  const scopedLocalRowIds = unique(
    (flow.steps ?? []).flatMap((step) => [
      ...(step.sourceRowIds ?? []),
      ...(step.items ?? []).flatMap((item) => item.sourceRowIds ?? []),
    ]),
  );
  const sourceRows = scopedLocalRowIds
    .map((id, index) => {
      const row = sourceRowsById.get(id);
      if (!row) return null;
      return {
        sourceRowId: `${prefix}:${id}`,
        sourceId: `${prefix}:source`,
        snapshotId: `${prefix}:snapshot`,
        rowType: "reference",
        title: row.title,
        detail: row.detail ?? row.title,
        locator: row.sourceTrace ?? `${flow.title} · ${index + 1}`,
        order: index,
      };
    })
    .filter(Boolean);
  const anchorFieldId =
    (flow.setupFields ?? []).find((field) => /date/i.test(field.type))?.key ?? null;
  const steps = (flow.steps ?? []).map((step) => ({
    stepId: `${prefix}:${step.stepId}`,
    flowId: `${prefix}:flow`,
    title: step.stepTitle,
    order: Number(step.order ?? 0) - 1,
    itemIds: (step.items ?? []).map((item) => `${prefix}:${item.itemId}`),
    sourceRefIds: [],
    groupingHint: flow.pattern,
  }));
  const items = (flow.steps ?? []).flatMap((step) =>
    (step.items ?? []).map((item) => ({
      itemId: `${prefix}:${item.itemId}`,
      stepId: `${prefix}:${step.stepId}`,
      title: item.itemTitle,
      description: item.detail ?? "",
      intent: "act",
      order: Number(item.order ?? 0) - 1,
      completion: {
        mode: "check",
        doneWhen: null,
        provenance: "legacy_item_state_only",
      },
      schedule: scheduleFromLegacy(item.schedule, anchorFieldId),
      fieldIds: [],
      memoIds: [],
      cautionMemoIds: [],
      sourceRefIds: [],
      sourceRowIds: (item.sourceRowIds ?? []).map((id) => `${prefix}:${id}`),
      optional: false,
      dependsOnItemIds: [],
    })),
  );
  const primaryProjection = mapProjection(
    flow.primaryDestination ?? flow.structureType,
  );
  const sourceShape = canonicalSourceShape(
    manifest.sourceShape ?? flow.pattern ?? flow.structureType,
  );
  const scheduledCount = items.filter((item) => item.schedule).length;
  const corpusTier =
    bundle.status === "ready_for_internal_canary"
      ? "product_candidate"
      : "structure_probe";
  const canonical = {
    schemaVersion: "flow-content-ui-derived-canonical-v1",
    contentId: prefix,
    contentHash: sha256({ bundleId: bundle.bundleId, flowId: flow.flowId, sourceRows, items }),
    bundle: {
      bundleId: `${datasetId}:${bundle.bundleId}`,
      title: bundle.title,
      summary: flow.userNeed,
      lifeArea: bundle.lifeArea ?? inferLifeArea(flow.title, flow.userNeed),
      topicTags: [],
      flowIds: [`${prefix}:flow`],
    },
    flows: [
      {
        flowId: `${prefix}:flow`,
        title: flow.title,
        summary: flow.userNeed,
        userNeed: flow.userNeed,
        stepIds: steps.map((step) => step.stepId),
        primaryArtifact: primaryProjection,
      },
    ],
    steps,
    items,
    fields: (flow.setupFields ?? []).map((field) => ({
      fieldId: `${prefix}:field:${field.key}`,
      owner: { type: "flow", id: `${prefix}:flow` },
      key: field.key,
      label: field.label,
      valueType: field.type,
      purposes: /date/i.test(field.type) ? ["schedule"] : ["execution"],
      valueSource: "user",
      required: field.required,
    })),
    memos: flow.flowMemo
      ? [
          {
            memoId: `${prefix}:memo`,
            owner: { type: "flow", id: `${prefix}:flow` },
            kind: "flow_note",
            text: flow.flowMemo,
          },
        ]
      : [],
    sources: [
      {
        sourceId: `${prefix}:source`,
        title: manifest.title ?? flow.title,
        originalUrl: manifest.sourceUrl ?? flow.sourceUrl ?? bundle.sourceUrls?.[0],
        canonicalUrl: manifest.sourceUrl ?? flow.sourceUrl ?? bundle.sourceUrls?.[0],
        locale: "ko-KR",
        publisher: manifest.sourceType ?? "unknown",
        rightsStatus: "not_assessed",
      },
    ],
    sourceSnapshots: [],
    sourceRows,
    sourceRefs: [],
  };
  const sourceUrl =
    manifest.sourceUrl ??
    flow.sourceUrl ??
    (Array.isArray(flow.urls) ? flow.urls[0] : null) ??
    bundle.sourceUrls?.[0] ??
    "";
  return {
    contentId: prefix,
    userJobId: sha256({ url: normalizeUrl(sourceUrl), userJob: flow.userNeed }).slice(7, 23),
    displayTitle: flow.title,
    title: flow.title,
    saveReason: flow.userNeed,
    userJob: flow.userNeed,
    contentMode: items.length ? "flow_content" : "field_template_probe",
    corpusTier,
    source: {
      sourceId: `${prefix}:source`,
      title: manifest.title ?? flow.title,
      provider: manifest.sourceType ?? "unknown",
      url: sourceUrl,
      canonicalUrl: sourceUrl,
      locale: "ko-KR",
      sourceFormat: inferSourceFormat(sourceUrl, manifest.sourceShape),
      observedAt: manifest.checkedAt ?? "2026-07-11",
      accessStatus: "frozen_source_packet",
      evidenceMethod: "existing_machine_readable_source_rows",
    },
    taxonomy: {
      version: "1.1-adapter",
      primaryLifeArea: bundle.lifeArea ?? inferLifeArea(flow.title, flow.userNeed),
      secondaryLifeAreas: [],
      topicTags: [],
      sourceShape,
      sourceShapeMetadata: manifest.sourceShape ?? null,
      primaryExecutionPattern: executionPatternFor(
        primaryProjection,
        sourceShape,
        scheduledCount ? "anchor_offset" : "no_schedule",
      ),
      secondaryExecutionPatterns: [],
      temporalIntent: scheduledCount ? "anchor_offset" : "no_schedule",
    },
    readiness: makeReadiness({
      logic: corpusTier === "product_candidate" ? "go" : "modify",
      publicState: "not_assessed",
      rights: "not_assessed",
      personal: "available",
      sourceCompleteness: "complete",
    }),
    minimumInputs: (flow.setupFields ?? []).map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required,
      purposes: /date/i.test(field.type) ? ["schedule"] : ["execution"],
      source: "user_overlay",
    })),
    primaryProjection,
    secondaryProjections: unique(
      ["sheet", "memo", primaryProjection === "checklist" ? "todo" : "checklist"],
    ).filter((projection) => projection !== primaryProjection),
    calendarGroupingPolicy:
      primaryProjection === "calendar" && steps.length < items.length
        ? "step_bundle"
        : "per_item",
    pacingEligible: items.length > 1 && scheduledCount === 0,
    canonical,
    eventSource: null,
    lineage: {
      datasetId,
      originArtifacts: [originPath.replaceAll("\\", "/")],
      originRecordRef: `#/contentBundles/${bundle.bundleId}/flows/${flow.flowId}`,
      canonicalContentHash: canonical.contentHash,
      sourcePacketHash: sha256(sourceRows),
      relation: "legacy_adapter",
    },
    evidenceNotes: [
      "July 11 legacy structureType/primaryDestination은 v1.1 projection adapter를 거쳤다.",
      "완료 기준이 원문에 없으면 generic doneWhen을 발명하지 않고 null로 유지한다.",
    ],
    userReviewStatus: "not_reviewed",
  };
}

const goldTitles = {
  "GB-01": "출생신고 준비 및 제출",
  "GB-02": "Google 계정 2단계 인증 설정",
  "GB-03": "LG 가습기 필터 및 본체 반복 관리",
  "GB-04": "LG 코드제로 A9S 먼지통·필터 청소",
  "GB-05": "달걀말이 김밥 만들기",
  "GB-06": "가족 함께 읽기 추천 도서 10권",
  "GB-07": "iCloud 백업과 컴퓨터 백업 비교",
  "GB-08": "국립현대미술관 어린이 단체관람 예약 및 방문",
  "GB-13": "주민등록증 재발급 준비",
  "GB-14": "영유아 건강·구강검진 기간",
  "GB-15": "2026 국제정세 교육과정",
  "GB-16": "2주 소셜 미디어 콘텐츠 계획",
};

function normalizeGoldCase(goldCase, packet) {
  const prefix = `generalization:${goldCase.caseId}`;
  const title = goldTitles[goldCase.caseId] ?? goldCase.gold.userJob;
  const sourceRows = goldCase.sourceRows.map((row, index) => ({
    sourceRowId: `${prefix}:${row.sourceRowId}`,
    sourceId: `${prefix}:source`,
    snapshotId: `${prefix}:snapshot`,
    rowType: row.goldRole ?? "reference",
    title: row.meaning ?? row.text,
    detail: row.text,
    locator: `${goldCase.caseId} · ${index + 1}`,
    order: index,
  }));
  const rowMap = new Map(
    goldCase.sourceRows.map((row) => [row.sourceRowId, `${prefix}:${row.sourceRowId}`]),
  );
  const stepId = `${prefix}:step`;
  const items = (goldCase.gold.allowedItems ?? []).map((item, index) => ({
    itemId: `${prefix}:item:${item.itemKey}`,
    stepId,
    title: item.titleIntent,
    description: "",
    intent: "act",
    order: index,
    completion: {
      mode: "check",
      doneWhen: null,
      provenance: "gold_allowed_item_without_completion_fact",
    },
    schedule: null,
    fieldIds: [],
    memoIds: [],
    cautionMemoIds: [],
    sourceRefIds: [],
    sourceRowIds: (item.sourceRefs ?? []).map((id) => rowMap.get(id) ?? `${prefix}:${id}`),
    optional: false,
    dependsOnItemIds: [],
  }));
  const primaryProjection = mapProjection(goldCase.gold.naturalArtifact);
  const canonical = {
    schemaVersion: "flow-content-ui-derived-canonical-v1",
    contentId: prefix,
    contentHash: sha256({ goldCase, packet }),
    bundle: {
      bundleId: `${prefix}:bundle`,
      title,
      summary: goldCase.gold.userJob,
      lifeArea: inferLifeArea(title, goldCase.gold.userJob),
      topicTags: [],
      flowIds: [`${prefix}:flow`],
    },
    flows: [
      {
        flowId: `${prefix}:flow`,
        title,
        summary: goldCase.gold.userJob,
        userNeed: goldCase.gold.userJob,
        stepIds: [stepId],
        primaryArtifact: primaryProjection,
      },
    ],
    steps: [
      {
        stepId,
        flowId: `${prefix}:flow`,
        title: "원문 실행 항목",
        order: 0,
        itemIds: items.map((item) => item.itemId),
        sourceRefIds: [],
      },
    ],
    items,
    fields: [],
    memos: [],
    sources: [
      {
        sourceId: `${prefix}:source`,
        title: packet.sourceMetadata?.title,
        originalUrl: packet.sourceUrl,
        canonicalUrl: packet.sourceUrl,
        locale: packet.sourceMetadata?.localeHint ?? "unknown",
        publisher: packet.sourceMetadata?.provider ?? "unknown",
        rightsStatus: goldCase.gold.gates?.rights ?? "unknown",
      },
    ],
    sourceSnapshots: [],
    sourceRows,
    sourceRefs: [],
  };
  const temporalIntent =
    primaryProjection === "calendar" ? "anchor_offset" : "no_schedule";
  return {
    contentId: prefix,
    userJobId: sha256({
      url: normalizeUrl(packet.sourceUrl),
      userJob: goldCase.gold.userJob,
    }).slice(7, 23),
    displayTitle: title,
    title,
    saveReason: goldCase.gold.userJob,
    userJob: goldCase.gold.userJob,
    contentMode: "flow_content",
    corpusTier: "structure_probe",
    source: {
      sourceId: `${prefix}:source`,
      title: packet.sourceMetadata?.title,
      provider: packet.sourceMetadata?.provider ?? "unknown",
      url: packet.sourceUrl,
      canonicalUrl: packet.sourceUrl,
      locale: packet.sourceMetadata?.localeHint ?? "unknown",
      sourceFormat: inferSourceFormat(
        packet.sourceUrl,
        packet.sourceMetadata?.sourceFormat,
      ),
      observedAt: packet.sourceMetadata?.observedAt ?? "2026-07-21",
      accessStatus: packet.sourceMetadata?.accessStatus ?? "open",
      evidenceMethod: "blind_gold_source_packet",
    },
    taxonomy: {
      version: "1.1-adapter",
      primaryLifeArea: inferLifeArea(title, goldCase.gold.userJob),
      secondaryLifeAreas: [],
      topicTags: [],
      sourceShape: primaryProjection === "sheet" ? "table_rows" : "checklist_rows",
      sourceShapeMetadata: "generalization_gold",
      primaryExecutionPattern: executionPatternFor(
        primaryProjection,
        primaryProjection === "sheet" ? "table_rows" : "checklist_rows",
        temporalIntent,
      ),
      secondaryExecutionPatterns: [],
      temporalIntent,
    },
    readiness: makeReadiness({
      logic: goldCase.gold.state === "ready" ? "go" : "modify",
      publicState: goldCase.gold.gates?.publicExportAllowed ? "go" : "hold",
      rights: goldCase.gold.gates?.rights ?? "unknown",
      personal: goldCase.gold.gates?.personalPreviewAllowed
        ? "available"
        : "unavailable",
      sourceCompleteness: goldCase.gold.sourceCompleteness,
      safety: goldCase.gold.gates?.safety ?? "not_required",
      locale: goldCase.gold.gates?.locale ?? "not_assessed",
      privacy: goldCase.gold.gates?.privacy ?? "not_assessed",
    }),
    minimumInputs: (goldCase.gold.minimumInputs ?? []).map((input) => ({
      key: input.semanticKey,
      label: input.semanticKey,
      type: input.semanticKey.includes("date") ? "date" : "text",
      required: input.requiredBeforeFirstPreview,
      purposes: input.semanticKey.includes("date") ? ["schedule"] : ["execution"],
      source: "user_overlay",
    })),
    primaryProjection,
    secondaryProjections: (goldCase.gold.secondaryArtifacts ?? []).map(mapProjection),
    calendarGroupingPolicy: "per_item",
    pacingEligible: items.length > 1 && temporalIntent === "no_schedule",
    canonical,
    eventSource: null,
    lineage: {
      datasetId: "generalization-gold-v1",
      originArtifacts: [
        inputPaths.generalizationGold.replaceAll("\\", "/"),
        inputPaths.generalizationPackets.replaceAll("\\", "/"),
      ],
      originRecordRef: `#/cases/${goldCase.caseId}`,
      canonicalContentHash: canonical.contentHash,
      sourcePacketHash: sha256(packet),
      relation: "gold_allowed_item_adapter",
    },
    evidenceNotes: [
      "이전 Conversion Stress Test의 positive이며 Product candidate로 재해석하지 않는다.",
      ...(goldCase.gold.forbiddenItems ?? []).map((item) => `금지: ${item}`),
    ],
    userReviewStatus: "not_reviewed",
  };
}

function normalizeNewSource(record) {
  const prefix = `new:${record.researchId}`;
  const sourceRows = (record.sourceRows ?? []).map((row, index) => ({
    sourceRowId: `${prefix}:${row.sourceRowId ?? `row-${index + 1}`}`,
    sourceId: `${prefix}:source`,
    snapshotId: `${prefix}:snapshot`,
    rowType: row.kind ?? "reference",
    title: row.title,
    detail: row.detail ?? row.title,
    locator: row.locator ?? `${record.title} · ${index + 1}`,
    order: index,
    group: row.group ?? null,
    original: row,
  }));
  const generationMode = record.generationMode ?? "flow_items";
  const groups = new Map();
  for (const row of sourceRows) {
    const key = row.group ?? "원문 항목";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const steps =
    generationMode === "flow_items"
      ? [...groups.entries()].map(([group, rows], index) => ({
          stepId: `${prefix}:step:${slug(group) || index + 1}`,
          flowId: `${prefix}:flow`,
          title: group,
          order: index,
          itemIds: rows.map((row) => `${prefix}:item:${row.sourceRowId.split(":").at(-1)}`),
          sourceRefIds: [],
        }))
      : [];
  const stepIdByRowId = new Map(
    steps.flatMap((step) =>
      step.itemIds.map((itemId) => [itemId.replace(":item:", ":"), step.stepId]),
    ),
  );
  const items =
    generationMode === "flow_items"
      ? sourceRows.map((row, index) => {
          const local = row.sourceRowId.split(":").at(-1);
          const itemId = `${prefix}:item:${local}`;
          const explicit = row.schedule ?? null;
          return {
            itemId,
            stepId:
              stepIdByRowId.get(row.sourceRowId) ??
              steps.find((step) => step.itemIds.includes(itemId))?.stepId ??
              steps[0]?.stepId,
            title: row.title,
            description: row.detail === row.title ? "" : row.detail,
            intent: row.intent ?? "act",
            order: index,
            completion: {
              mode: row.completionMode ?? "check",
              doneWhen: row.doneWhen ?? null,
              provenance: row.doneWhen ? "source" : "source_item_state_only",
            },
            schedule: explicit,
            fieldIds: [],
            memoIds: [],
            cautionMemoIds: [],
            sourceRefIds: [],
            sourceRowIds: [row.sourceRowId],
            optional: Boolean(row.optional),
            dependsOnItemIds: [],
          };
        })
      : [];
  const primaryProjection = mapProjection(record.taxonomy.primaryProjection);
  const canonical = {
    schemaVersion: "flow-content-ui-derived-canonical-v1",
    contentId: prefix,
    contentHash: sha256({ record, sourceRows, items }),
    bundle: {
      bundleId: `${prefix}:bundle`,
      title: record.title,
      summary: record.userJob,
      lifeArea: record.taxonomy.primaryLifeArea,
      topicTags: record.taxonomy.topicTags ?? [],
      flowIds: generationMode === "flow_items" ? [`${prefix}:flow`] : [],
    },
    flows:
      generationMode === "flow_items"
        ? [
            {
              flowId: `${prefix}:flow`,
              title: record.title,
              summary: record.userJob,
              userNeed: record.userJob,
              stepIds: steps.map((step) => step.stepId),
              primaryArtifact: primaryProjection,
            },
          ]
        : [],
    steps,
    items,
    fields: record.fieldContract ?? [],
    memos: [],
    sources: [
      {
        sourceId: `${prefix}:source`,
        title: record.source.title,
        originalUrl: record.source.url,
        canonicalUrl: record.source.canonicalUrl,
        locale: record.source.locale,
        publisher: record.source.provider,
        rightsStatus: record.readiness.rightsStatus,
      },
    ],
    sourceSnapshots: [],
    sourceRows,
    sourceRefs: [],
  };
  const contentMode =
    record.corpusTier === "boundary_control"
      ? "boundary_control"
      : record.corpusTier === "historical_preview"
        ? "historical_preview"
        : generationMode === "field_template"
          ? "field_template_probe"
          : generationMode === "event_source"
            ? "event_source_before_user_intent"
            : "flow_content";
  return {
    contentId: prefix,
    userJobId: sha256({
      url: normalizeUrl(record.source.canonicalUrl),
      userJob: record.userJob,
    }).slice(7, 23),
    displayTitle: record.title,
    title: record.title,
    saveReason: record.userJob,
    userJob: record.userJob,
    contentMode,
    corpusTier: record.corpusTier,
    source: {
      sourceId: `${prefix}:source`,
      title: record.source.title,
      provider: record.source.provider,
      url: record.source.url,
      canonicalUrl: record.source.canonicalUrl,
      locale: record.source.locale,
      sourceFormat: record.source.sourceFormat,
      observedAt: record.source.observedAt,
      accessStatus: record.source.accessStatus,
      evidenceMethod: "direct_source_inspection_2026-07-29",
    },
    taxonomy: {
      version: "1.1",
      primaryLifeArea: record.taxonomy.primaryLifeArea,
      secondaryLifeAreas: record.taxonomy.secondaryLifeAreas ?? [],
      topicTags: record.taxonomy.topicTags ?? [],
      sourceShape: canonicalSourceShape(record.taxonomy.sourceShape),
      sourceShapeMetadata: record.taxonomy.sourceShape,
      primaryExecutionPattern:
        record.taxonomy.primaryExecutionPattern ??
        executionPatternFor(
          primaryProjection,
          canonicalSourceShape(record.taxonomy.sourceShape),
          record.taxonomy.temporalIntent,
        ),
      secondaryExecutionPatterns: [],
      temporalIntent: record.taxonomy.temporalIntent,
    },
    readiness: record.readiness,
    minimumInputs: record.minimumInputs ?? [],
    primaryProjection,
    secondaryProjections: (record.taxonomy.secondaryProjections ?? []).map(mapProjection),
    calendarGroupingPolicy: record.calendarGroupingPolicy ?? "per_item",
    pacingEligible: Boolean(record.pacingEligible),
    canonical,
    eventSource: record.eventSource ?? null,
    lineage: {
      datasetId: "new-source-verification-v1",
      originArtifacts: [inputPaths.additions.replaceAll("\\", "/")],
      originRecordRef: `#/records/${record.researchId}`,
      canonicalContentHash: canonical.contentHash,
      sourcePacketHash: sha256(record.sourceRows ?? []),
      relation: record.duplicateOf ? "source_variant" : "directly_inspected_new_source",
    },
    evidenceNotes: [
      ...(record.evidenceNotes ?? []),
      `확인 원문 행 ${record.capturedSourceRowCount}/${record.confirmedSourceRowCount}`,
    ],
    duplicateOf: record.duplicateOf ?? null,
    userReviewStatus: "not_reviewed",
  };
}

function normalizeHistoricalPreview(record, index) {
  const contentId = `historical:${slug(record.previewFile ?? record.title)}:${index + 1}`;
  return {
    contentId,
    userJobId: sha256({
      url: normalizeUrl(record.sourceUrl),
      title: record.title,
    }).slice(7, 23),
    displayTitle: record.title,
    title: record.title,
    saveReason:
      "과거 UI preview가 있으나 최신 SourceRow 계약이 없어 정상 corpus에는 포함하지 않는다.",
    userJob: `과거 ${record.title} 미리보기 구조를 참고한다.`,
    contentMode: "historical_preview",
    corpusTier: "historical_preview",
    source: {
      sourceId: `${contentId}:source`,
      title: record.sourceTitle,
      provider: record.type,
      url: record.sourceUrl,
      canonicalUrl: record.sourceUrl,
      locale: "ko-KR",
      sourceFormat: inferSourceFormat(record.sourceUrl),
      observedAt: "2026-06-01",
      accessStatus: record.status === 200 ? "historical_snapshot_available" : "historical_snapshot_unavailable",
      evidenceMethod: "historical_preview_structure_only",
    },
    taxonomy: {
      version: "legacy_unmapped",
      primaryLifeArea: inferLifeArea(record.title, record.note),
      secondaryLifeAreas: [],
      topicTags: [],
      sourceShape: "narrative_guidance",
      sourceShapeMetadata: "historical_preview",
      primaryExecutionPattern: "ordered_procedure",
      secondaryExecutionPatterns: [],
      temporalIntent: "unknown",
    },
    readiness: makeReadiness({
      logic: "not_assessed",
      publicState: "not_assessed",
      rights: "not_assessed",
      personal: "unknown",
      sourceCompleteness: "historical_preview_only",
      promotion: "historical_reference",
    }),
    minimumInputs: [],
    primaryProjection: "memo",
    secondaryProjections: [],
    calendarGroupingPolicy: "none",
    pacingEligible: false,
    canonical: {
      schemaVersion: "historical-preview-reference-v1",
      contentId,
      contentHash: sha256(record),
      bundle: null,
      flows: [],
      steps: [],
      items: [],
      fields: [],
      memos: [],
      sources: [],
      sourceSnapshots: [],
      sourceRows: [],
      sourceRefs: [],
    },
    eventSource: null,
    historicalPreview: {
      previewFile: record.previewFile,
      previewUrl: record.previewUrl,
      localPreviewPath: record.previewFile
        ? `docs/content-audit/flow-content-ux-candidates-previews/${record.previewFile}`
        : null,
      headings: record.structure?.headings ?? [],
      buttons: record.structure?.buttons ?? [],
      labels: record.structure?.labels ?? [],
      cardCount: record.structure?.cardCount ?? 0,
      inputCount: record.structure?.inputCount ?? 0,
      checkboxCount: record.structure?.checkboxCount ?? 0,
      note: record.note,
    },
    lineage: {
      datasetId: "reference-260601-preview-structure",
      originArtifacts: [inputPaths.historical.replaceAll("\\", "/")],
      originRecordRef: `#/${index}`,
      canonicalContentHash: sha256(record),
      sourcePacketHash: null,
      relation: "historical_preview_only",
    },
    evidenceNotes: [
      "SourceRow provenance가 없어 Product/Structure 정상 count에서 제외한다.",
    ],
    userReviewStatus: "not_reviewed",
  };
}

function makeDataGraph(content) {
  const nodes = [];
  const edges = [];
  const sourceNodeId = `${content.contentId}:graph:source`;
  nodes.push({
    nodeId: sourceNodeId,
    type: "source",
    label: content.source.title ?? content.title,
    data: content.source,
  });
  for (const row of content.canonical.sourceRows ?? []) {
    nodes.push({
      nodeId: row.sourceRowId,
      type: "source_row",
      label: row.title,
      data: row,
    });
    edges.push({ from: sourceNodeId, to: row.sourceRowId, relation: "contains" });
  }
  const rowIdsByItem = new Map(
    (content.canonical.items ?? []).map((item) => [
      item.itemId,
      item.sourceRowIds ??
        unique(
          (item.sourceRefIds ?? []).flatMap((sourceRefId) => {
            const ref = (content.canonical.sourceRefs ?? []).find(
              (candidate) => candidate.sourceRefId === sourceRefId,
            );
            return ref?.sourceRowIds ?? [];
          }),
        ),
    ]),
  );
  for (const item of content.canonical.items ?? []) {
    nodes.push({ nodeId: item.itemId, type: "item", label: item.title, data: item });
    for (const rowId of rowIdsByItem.get(item.itemId) ?? []) {
      edges.push({ from: rowId, to: item.itemId, relation: "supports" });
    }
  }
  for (const step of content.canonical.steps ?? []) {
    nodes.push({ nodeId: step.stepId, type: "step", label: step.title, data: step });
    for (const itemId of step.itemIds ?? []) {
      edges.push({ from: itemId, to: step.stepId, relation: "grouped_in" });
    }
  }
  for (const flow of content.canonical.flows ?? []) {
    nodes.push({ nodeId: flow.flowId, type: "flow", label: flow.title, data: flow });
    for (const stepId of flow.stepIds ?? []) {
      edges.push({ from: stepId, to: flow.flowId, relation: "grouped_in" });
    }
  }
  if (content.canonical.bundle) {
    nodes.push({
      nodeId: content.canonical.bundle.bundleId,
      type: "bundle",
      label: content.canonical.bundle.title,
      data: content.canonical.bundle,
    });
    for (const flowId of content.canonical.bundle.flowIds ?? []) {
      edges.push({ from: flowId, to: content.canonical.bundle.bundleId, relation: "grouped_in" });
    }
  }
  const copyId = `${content.contentId}:user-flow-copy`;
  nodes.push({
    nodeId: copyId,
    type: "user_flow_copy",
    label: "개인 실행 복사본",
    data: { scheduleOwner: "user_overlay", status: "not_created" },
  });
  const parentId =
    content.canonical.bundle?.bundleId ??
    content.canonical.flows?.[0]?.flowId ??
    sourceNodeId;
  edges.push({ from: parentId, to: copyId, relation: "copied_as_overlay" });
  for (const occurrence of content.eventSource?.occurrences ?? []) {
    nodes.push({
      nodeId: occurrence.occurrenceId,
      type: "occurrence",
      label: occurrence.label ?? occurrence.start ?? "Occurrence",
      data: occurrence,
    });
    edges.push({ from: sourceNodeId, to: occurrence.occurrenceId, relation: "publishes" });
  }
  for (const projection of PROJECTIONS) {
    const projectionId = `${content.contentId}:projection:${projection}`;
    nodes.push({
      nodeId: projectionId,
      type: "projection",
      label: projection,
      data: { projection },
    });
    edges.push({ from: copyId, to: projectionId, relation: "projects_to" });
  }
  return { nodes, edges };
}

function duplicateCrosswalk() {
  return [
    ["legacy:round2:adult-passport-renewal", "canonical:oq-oq-c04-passport", "duplicate_same_url_same_job"],
    ["legacy:round2:vehicle-regular-inspection-flow", "canonical:oq-oq-p03-vehicle", "duplicate_same_anchor_url_same_job"],
    ["generalization:GB-14", "canonical:live-c01", "duplicate_semantic_job_different_official_url"],
    ["legacy:preapp:overseas-packing-check", "canonical:oq-oq-p02-packing", "source_variant_same_broad_job"],
    ["canonical:live-c10", "canonical:oq-oq-p02-packing", "source_variant_same_broad_job"],
    ["canonical:oq-oq-c01-moving", "canonical:base-moving-d30", "source_variant_same_job"],
    ["canonical:live-live-ifixit-washer-01", "canonical:oq-oq-c05-washer", "source_variant_same_job"],
    ["events:event-pattern-boryeong-programs", "events:event-pattern-boryeong-operations", "same_edition_section"],
    ["new:new-a04-birth-registration", "generalization:GB-01", "reverified_source_variant"],
    ["new:new-b02-kkday-packing", "legacy:preapp:overseas-packing-check", "reverified_same_source_job"],
    ["new:new-b01-trip-domestic-packing", "canonical:live-c10", "reverified_same_source_job"],
  ].map(([incomingId, existingId, relation]) => ({
    incomingId,
    existingId,
    relation,
    countAsNew: false,
  }));
}

function mergeEventVariant(primary, variant) {
  if (
    primary.contentMode !== "event_source_before_user_intent" ||
    variant.contentMode !== "event_source_before_user_intent"
  ) {
    return;
  }
  primary.eventSource.occurrences = [
    ...(primary.eventSource.occurrences ?? []),
    ...(variant.eventSource.occurrences ?? []),
  ];
  primary.eventSource.windows = [
    ...(primary.eventSource.windows ?? []),
    ...(variant.eventSource.windows ?? []),
  ];
  primary.evidenceNotes.push(`동일 edition section 병합: ${variant.contentId}`);
}

function makeCoverage(records) {
  const normal = records.filter((record) =>
    ["product_candidate", "structure_probe"].includes(record.corpusTier),
  );
  const countBy = (selector) =>
    Object.fromEntries(
      [...normal.reduce((map, record) => {
        const value = selector(record);
        map.set(value, (map.get(value) ?? 0) + 1);
        return map;
      }, new Map()).entries()].sort(([left], [right]) => String(left).localeCompare(String(right))),
    );
  return {
    schemaVersion: "flow-content-ui-coverage-v1",
    generatedAt: "2026-07-29T23:59:00+09:00",
    counts: {
      gallery: records.length,
      normal: normal.length,
      productCandidate: normal.filter((record) => record.corpusTier === "product_candidate").length,
      structureProbe: normal.filter((record) => record.corpusTier === "structure_probe").length,
      boundary: records.filter((record) => record.corpusTier === "boundary_control").length,
      historical: records.filter((record) => record.corpusTier === "historical_preview").length,
      item: normal.reduce((sum, record) => sum + (record.canonical.items?.length ?? 0), 0),
      sourceRow: normal.reduce(
        (sum, record) => sum + (record.canonical.sourceRows?.length ?? 0),
        0,
      ),
      projectionCell: normal.length * PROJECTIONS.length,
    },
    lifeArea: countBy((record) => record.taxonomy.primaryLifeArea),
    executionPattern: countBy((record) => record.taxonomy.primaryExecutionPattern),
    sourceShape: countBy((record) => record.taxonomy.sourceShape),
    temporalIntent: countBy((record) => record.taxonomy.temporalIntent),
    primaryProjection: countBy((record) => record.primaryProjection),
    sourceFormat: countBy((record) => record.source.sourceFormat),
    contentMode: countBy((record) => record.contentMode),
  };
}

const canonicalInput = readJson(inputPaths.canonical);
const eventInput = readJson(inputPaths.events);
const preappInput = readJson(inputPaths.preapp);
const round2Input = readJson(inputPaths.round2);
const goldInput = readJson(inputPaths.generalizationGold);
const packetInput = readJson(inputPaths.generalizationPackets);
const additionsInput = readJson(inputPaths.additions, { records: [] });
const historicalInput = readJson(inputPaths.historical);

const rawRecords = [];
for (const fixture of canonicalInput.fixtures) rawRecords.push(normalizeCanonicalFixture(fixture));
for (const fixture of eventInput.fixtures) rawRecords.push(normalizeEventFixture(fixture));
for (const bundle of preappInput.contentBundles) {
  for (const flow of bundle.flows) {
    rawRecords.push(
      normalizeLegacyFlow(bundle, flow, "legacy:preapp", inputPaths.preapp),
    );
  }
}
for (const bundle of round2Input.contentBundles) {
  for (const flow of bundle.flows) {
    rawRecords.push(
      normalizeLegacyFlow(bundle, flow, "legacy:round2", inputPaths.round2),
    );
  }
}
const packetById = new Map(packetInput.cases.map((packet) => [packet.caseId, packet]));
for (const goldCase of goldInput.cases.filter(
  (entry) => entry.gold?.admissionLabel === "positive",
)) {
  rawRecords.push(normalizeGoldCase(goldCase, packetById.get(goldCase.caseId)));
}
for (const addition of additionsInput.records) rawRecords.push(normalizeNewSource(addition));

const inventoryRecords = rawRecords.map((record) => ({
  contentId: record.contentId,
  displayTitle: record.displayTitle,
  canonicalUrl: record.source.canonicalUrl,
  userJob: record.userJob,
  proposedTier: record.corpusTier,
  sourceRowCount: record.canonical.sourceRows?.length ?? 0,
  itemCount: record.canonical.items?.length ?? 0,
  stepCount: record.canonical.steps?.length ?? 0,
  contentMode: record.contentMode,
  originArtifacts: record.lineage.originArtifacts,
  inclusionStatus: "included",
  inclusionReason: "source-backed record with a distinct user job",
  duplicateOf: null,
}));

const byContentId = new Map(rawRecords.map((record) => [record.contentId, record]));
for (const duplicate of duplicateCrosswalk()) {
  const variant = byContentId.get(duplicate.incomingId);
  const primary = byContentId.get(duplicate.existingId);
  if (!variant || !primary) continue;
  const inventory = inventoryRecords.find((record) => record.contentId === variant.contentId);
  inventory.inclusionStatus = "excluded_source_variant";
  inventory.inclusionReason = duplicate.relation;
  inventory.duplicateOf = primary.contentId;
  primary.sourceVariants = primary.sourceVariants ?? [];
  primary.sourceVariants.push({
    contentId: variant.contentId,
    title: variant.title,
    url: variant.source.canonicalUrl,
    relation: duplicate.relation,
    sourceRowCount: variant.canonical.sourceRows?.length ?? 0,
    itemCount: variant.canonical.items?.length ?? 0,
  });
  mergeEventVariant(primary, variant);
}

const exactKeys = new Map();
for (const record of rawRecords) {
  const inventory = inventoryRecords.find((entry) => entry.contentId === record.contentId);
  if (inventory.inclusionStatus !== "included") continue;
  const key = `${normalizeUrl(record.source.canonicalUrl)}::${normalizeText(record.userJob)}`;
  if (!exactKeys.has(key)) {
    exactKeys.set(key, record.contentId);
    continue;
  }
  const primaryId = exactKeys.get(key);
  inventory.inclusionStatus = "excluded_exact_duplicate";
  inventory.inclusionReason = "same normalized canonical URL and normalized user job";
  inventory.duplicateOf = primaryId;
  const primary = byContentId.get(primaryId);
  primary.sourceVariants = primary.sourceVariants ?? [];
  primary.sourceVariants.push({
    contentId: record.contentId,
    title: record.title,
    url: record.source.canonicalUrl,
    relation: "exact_duplicate",
    sourceRowCount: record.canonical.sourceRows?.length ?? 0,
    itemCount: record.canonical.items?.length ?? 0,
  });
}

const includedSourceBacked = rawRecords.filter((record) => {
  const inventory = inventoryRecords.find((entry) => entry.contentId === record.contentId);
  return inventory.inclusionStatus === "included";
});

const historicalRecords = historicalInput.map(normalizeHistoricalPreview);
const includedRecords = [...includedSourceBacked, ...historicalRecords];
for (const historical of historicalRecords) {
  inventoryRecords.push({
    contentId: historical.contentId,
    displayTitle: historical.displayTitle,
    canonicalUrl: historical.source.canonicalUrl,
    userJob: historical.userJob,
    proposedTier: historical.corpusTier,
    sourceRowCount: 0,
    itemCount: 0,
    stepCount: 0,
    contentMode: historical.contentMode,
    originArtifacts: historical.lineage.originArtifacts,
    inclusionStatus: "included_historical_only",
    inclusionReason: "historical UI reference; excluded from normal count",
    duplicateOf: null,
  });
}

for (const content of includedRecords) {
  content.projectionCells = generateProjectionCells(content);
  content.dataGraph = makeDataGraph(content);
}

const normalRecords = includedRecords.filter((record) =>
  ["product_candidate", "structure_probe"].includes(record.corpusTier),
);
const coverage = makeCoverage(includedRecords);
const corpusFingerprint = sha256(
  normalRecords.map((record) => ({
    contentId: record.contentId,
    hash: record.lineage.canonicalContentHash,
  })),
);

const pacingTargets = normalRecords
  .filter(
    (record) =>
      record.pacingEligible &&
      (record.canonical.items?.length ?? 0) >= 3,
  )
  .slice(0, 16)
  .map((record, index) => {
    const items = record.canonical.items;
    const policy =
      index % 2 === 0
        ? {
            mode: "items_per_day",
            startDate: "2026-08-03",
            itemsPerDay: 2,
            allowedWeekdays: [1, 2, 3, 4, 5],
            restDates: [],
            allDay: true,
            outputMode: "todo_due",
            bundleMode: "per_item",
          }
        : {
            mode: "items_per_week",
            startDate: "2026-08-03",
            itemsPerWeek: 3,
            allowedWeekdays: [1, 3, 5],
            restDates: [],
            allDay: true,
            outputMode: "calendar",
            bundleMode: "session_bundle",
          };
    return {
      contentId: record.contentId,
      title: record.title,
      policy,
      result: scheduleItems(items, policy),
    };
  });

const eventResults = normalRecords
  .filter((record) => record.contentMode === "event_source_before_user_intent")
  .map((record) => {
    const selectable = (record.eventSource?.occurrences ?? []).find(
      (occurrence) => occurrence.status !== "cancelled",
    );
    return {
      contentId: record.contentId,
      title: record.title,
      sourceState: {
        series: record.eventSource?.series ?? null,
        edition: record.eventSource?.edition ?? null,
        occurrences: record.eventSource?.occurrences ?? [],
        windows: record.eventSource?.windows ?? [],
        milestones: record.eventSource?.milestones ?? [],
      },
      defaultPreview: selectable
        ? activateEventIntent(record, {
            intent: "attend",
            selectedOccurrenceId: selectable.occurrenceId,
          })
        : {
            ok: false,
            errors: ["NO_SELECTABLE_FIXED_OCCURRENCE"],
            item: null,
            projectionPlan: null,
          },
    };
  });

const projectionResults = normalRecords.flatMap((record) =>
  record.projectionCells.map((cell) => ({
    contentId: record.contentId,
    title: record.title,
    corpusTier: record.corpusTier,
    ...cell,
  })),
);

const directLinks = includedRecords.flatMap((record) => {
  const base = `#content/${encodeURIComponent(record.contentId)}`;
  return [
    { contentId: record.contentId, mode: "detail", hash: base },
    ...PROJECTIONS.map((projection) => ({
      contentId: record.contentId,
      mode: `projection:${projection}`,
      hash: `${base}/projection/${projection}`,
    })),
    { contentId: record.contentId, mode: "lineage", hash: `${base}/lineage` },
    { contentId: record.contentId, mode: "review", hash: `${base}/review` },
  ];
});

const lineage = {
  schemaVersion: "flow-content-ui-lineage-v1",
  generatedAt: "2026-07-29T23:59:00+09:00",
  corpusFingerprint,
  inputArtifacts: Object.values(inputPaths)
    .map(fileLineage)
    .filter(Boolean),
  recordLineage: includedRecords.map((record) => ({
    contentId: record.contentId,
    ...record.lineage,
  })),
};

const inclusionExclusion = {
  schemaVersion: "flow-content-ui-inclusion-exclusion-v1",
  generatedAt: "2026-07-29T23:59:00+09:00",
  counts: {
    rawSourceBacked: rawRecords.length,
    includedSourceBacked: includedSourceBacked.length,
    normal: normalRecords.length,
    excludedVariantOrDuplicate: inventoryRecords.filter((record) =>
      record.inclusionStatus.startsWith("excluded"),
    ).length,
    historicalIncluded: historicalRecords.length,
  },
  duplicateKey: "normalizedCanonicalUrl + normalizedUserJob",
  relations: duplicateCrosswalk(),
  records: inventoryRecords.map((record) => ({
    contentId: record.contentId,
    inclusionStatus: record.inclusionStatus,
    inclusionReason: record.inclusionReason,
    duplicateOf: record.duplicateOf,
  })),
};

const viewModel = {
  schemaVersion: "flow-content-ui-view-model-v1",
  generatedAt: "2026-07-29T23:59:00+09:00",
  corpusFingerprint,
  claimBoundary: {
    observedUserValidation: "NOT_RUN",
    externalCalendarVtodoRoundTrip: "NOT_RUN",
    internalAgentReviewIsUserReview: false,
    productionRuntimeChanged: false,
  },
  counts: coverage.counts,
  filters: {
    corpusTier: unique(includedRecords.map((record) => record.corpusTier)),
    lifeArea: unique(includedRecords.map((record) => record.taxonomy.primaryLifeArea)),
    sourceFormat: unique(includedRecords.map((record) => record.source.sourceFormat)),
    executionPattern: unique(
      includedRecords.map((record) => record.taxonomy.primaryExecutionPattern),
    ),
    temporalIntent: unique(
      includedRecords.map((record) => record.taxonomy.temporalIntent),
    ),
    primaryProjection: PROJECTIONS,
    userReviewStatus: ["not_reviewed", "reviewed"],
  },
  contents: includedRecords,
};

const reviewStateContract = {
  schemaVersion: "flow-content-ui-review-state-contract-v1",
  storageKey: "flowme-full-corpus-review-v1",
  corpusFingerprint,
  initialState: makeInitialReviewState(
    includedRecords.map((record) => record.contentId),
    corpusFingerprint,
  ),
  importModes: ["merge", "replace"],
  validations: [
    "schemaVersion",
    "corpusFingerprint",
    "known contentId",
    "unknown contentId reporting",
    "pre-replace automatic backup",
    "rollback on error",
  ],
  userReviewStatusBoundary:
    "internal agent results never populate reviewsByContentId",
};

const gapRegister = {
  schemaVersion: "flow-content-ui-gap-register-v1",
  generatedAt: "2026-07-29T23:59:00+09:00",
  gaps: [
    {
      gapId: "GAP-TODO-RUNTIME",
      severity: "high",
      repeatedProblemCount: normalRecords.filter(
        (record) => record.primaryProjection === "todo",
      ).length,
      summary: "현재 runtime export에는 독립 Todo destination이 없다.",
      recommendation:
        "Backend DTO에서 Todo queue와 Checklist group을 분리하고 destination capability를 요청값으로 받는다.",
      affectedAreas: ["backend DTO", "export adapter", "planning"],
      userApprovalRequired: true,
    },
    {
      gapId: "GAP-OVERLAY-PREVIEW",
      severity: "high",
      repeatedProblemCount: projectionResults.filter(
        (cell) => cell.generationState === "preview_requires_overlay",
      ).length,
      summary: "일정화 가능한 것과 확정 생성된 일정의 상태를 분리해야 한다.",
      recommendation:
        "generationState, preview, output, suggestionStatus를 별도 필드로 유지한다.",
      affectedAreas: ["backend DTO", "Calendar UI", "pacing"],
      userApprovalRequired: false,
    },
    {
      gapId: "GAP-EVENT-INTENT",
      severity: "high",
      repeatedProblemCount: eventResults.length,
      summary: "행사 source fact와 사용자의 저장·예약·참석 Item은 서로 다른 생명주기를 가진다.",
      recommendation:
        "Event Series/Edition/Occurrence를 먼저 저장하고 intent 뒤에만 user-owned Item을 만든다.",
      affectedAreas: ["event ingestion", "canonical DTO", "event UI"],
      userApprovalRequired: true,
    },
    {
      gapId: "GAP-TAXONOMY-LEGACY-LIVE",
      severity: "medium",
      repeatedProblemCount: canonicalInput.fixtures.filter(
        (fixture) =>
          fixture.batch === "live_reverified_expansion" &&
          fixture.taxonomy.primaryLifeArea === "home_living",
      ).length,
      summary: "일부 live fixture가 home_living으로 일괄 분류된 흔적이 있다.",
      recommendation:
        "새 backend admission에서 Taxonomy v1.1 validator와 사람 검토 queue를 적용한다.",
      affectedAreas: ["taxonomy classifier", "portfolio filters"],
      userApprovalRequired: false,
    },
  ],
};

const planningHandoff = {
  schemaVersion: "flow-content-ui-planning-handoff-v1",
  generatedAt: "2026-07-29T23:59:00+09:00",
  status: "DRAFT_PENDING_USER_REVIEW",
  decisions: [
    {
      decisionId: "PD-ITEM-MINIMUM",
      question: "Item 최소 단위를 독립 완료·결정·기록 상태 단위로 유지할 것인가?",
      recommendation: "유지",
      alternative: "문장 내 동사를 모두 micro action으로 분리",
      evidenceContentIds: normalRecords
        .filter((record) => (record.canonical.items?.length ?? 0) > 1)
        .slice(0, 12)
        .map((record) => record.contentId),
      repeatedProblemCount: 0,
      affectedAreas: ["canonical DTO", "conversion prompt"],
      userApprovalRequired: true,
    },
    {
      decisionId: "PD-CHECKLIST-TODO",
      question: "Checklist와 Todo를 sibling projection으로 유지할 것인가?",
      recommendation:
        "유지하되 Checklist는 닫힌 Step group, Todo는 독립 queue와 parent/subtask fallback으로 실제 출력 스키마를 구분",
      alternative: "Action → Checklist → Todo의 고정 wrapper hierarchy",
      evidenceContentIds: normalRecords
        .filter((record) => ["checklist", "todo"].includes(record.primaryProjection))
        .slice(0, 16)
        .map((record) => record.contentId),
      repeatedProblemCount: gapRegister.gaps[0].repeatedProblemCount,
      affectedAreas: ["backend DTO", "projection engine", "UI"],
      userApprovalRequired: true,
    },
    {
      decisionId: "PD-PACING-DEFAULT",
      question: "날짜 없는 콘텐츠의 기본 시작 UI는 무엇인가?",
      recommendation:
        "원본은 날짜 없이 열고, '일정 만들기'에서 시작일 + 하루 2개 preview를 제안하되 확인 전 draft 유지",
      alternative: "저장 시 바로 Calendar 일정 자동 생성",
      evidenceContentIds: pacingTargets.map((target) => target.contentId),
      repeatedProblemCount: pacingTargets.length,
      affectedAreas: ["UserFlowCopy", "pacing UI", "Calendar adapter"],
      userApprovalRequired: true,
    },
    {
      decisionId: "PD-EVENT-CONTRACT",
      question: "Series·Edition·Occurrence와 user Item을 분리할 것인가?",
      recommendation: "분리",
      alternative: "모든 행사 SourceRow를 즉시 Todo/VEVENT Item으로 생성",
      evidenceContentIds: eventResults.map((result) => result.contentId),
      repeatedProblemCount: eventResults.length,
      affectedAreas: ["event source store", "canonical DTO", "calendar export"],
      userApprovalRequired: true,
    },
  ],
};

const valueReadjudication = {
  schemaVersion: "flow-content-ui-value-readjudication-v1",
  generatedAt: "2026-07-29T23:59:00+09:00",
  claimBoundary: "deterministic internal pre-screen; not user save intent",
  records: normalRecords.map((record) => {
    const itemCount = record.canonical.items?.length ?? 0;
    const eventCount = record.eventSource?.occurrences?.length ?? 0;
    const hasReturnState = itemCount > 1 || eventCount > 0;
    const verdict =
      !hasReturnState && record.primaryProjection === "memo"
        ? "modify"
        : record.readiness.logicReadiness === "hold"
          ? "hold"
          : "go";
    return {
      contentId: record.contentId,
      initialTier: record.corpusTier,
      deterministicVerdict: verdict,
      linkSaveValueDelta: hasReturnState ? "clear_execution_state" : "weak_or_reference_heavy",
      firstActionVisible: itemCount > 0 || record.contentMode === "event_source_before_user_intent",
      startInputCount: record.minimumInputs.filter((input) => input.required).length,
      returnStateExists: hasReturnState,
      userReviewStatus: "NOT_REVIEWED_BY_USER",
    };
  }),
};

writeJson("corpus-inventory-v1.json", {
  schemaVersion: "flow-content-ui-corpus-inventory-v1",
  generatedAt: "2026-07-29T23:59:00+09:00",
  counts: {
    raw: inventoryRecords.length,
    sourceBackedRaw: rawRecords.length,
    includedGallery: includedRecords.length,
    includedNormal: normalRecords.length,
  },
  records: inventoryRecords,
});
writeJson("corpus-lineage-v1.json", lineage);
writeJson("corpus-inclusion-exclusion-v1.json", inclusionExclusion);
writeJson("corpus-coverage-matrix-v1.json", coverage);
writeJson("content-ui-view-model-v1.json", viewModel);
writeJson("content-ui-fixtures-v1.json", {
  schemaVersion: "flow-content-ui-fixtures-v1",
  corpusFingerprint,
  counts: coverage.counts,
  contents: includedRecords.map((record) => ({
    contentId: record.contentId,
    contentMode: record.contentMode,
    corpusTier: record.corpusTier,
    source: record.source,
    taxonomy: record.taxonomy,
    readiness: record.readiness,
    canonical: record.canonical,
    eventSource: record.eventSource,
  })),
});
writeJson("projection-ui-results-v1.json", {
  schemaVersion: "flow-content-ui-projection-results-v1",
  corpusFingerprint,
  counts: {
    content: normalRecords.length,
    cells: projectionResults.length,
    generated: projectionResults.filter((cell) => cell.generationState === "generated").length,
    previewRequiresOverlay: projectionResults.filter(
      (cell) => cell.generationState === "preview_requires_overlay",
    ).length,
    prohibited: projectionResults.filter(
      (cell) => cell.generationState === "prohibited",
    ).length,
  },
  results: projectionResults,
});
writeJson("schedule-playground-results-v1.json", {
  schemaVersion: "flow-content-ui-schedule-playground-v1",
  corpusFingerprint,
  counts: {
    content: pacingTargets.length,
    targetItems: pacingTargets.reduce(
      (sum, target) => sum + target.result.targetItemIds.length,
      0,
    ),
    assignments: pacingTargets.reduce(
      (sum, target) => sum + target.result.assignments.length,
      0,
    ),
  },
  results: pacingTargets,
});
writeJson("event-ui-results-v1.json", {
  schemaVersion: "flow-content-ui-event-results-v1",
  corpusFingerprint,
  counts: {
    content: eventResults.length,
    occurrences: eventResults.reduce(
      (sum, result) => sum + result.sourceState.occurrences.length,
      0,
    ),
    windows: eventResults.reduce(
      (sum, result) => sum + result.sourceState.windows.length,
      0,
    ),
    milestones: eventResults.reduce(
      (sum, result) => sum + result.sourceState.milestones.length,
      0,
    ),
  },
  results: eventResults,
});
writeJson("review-state-contract-v1.json", reviewStateContract);
writeJson("content-value-readjudication-v1.json", valueReadjudication);
writeJson("content-and-logic-gap-register-v1.json", gapRegister);
writeJson("planning-decision-handoff-v1.json", planningHandoff);
writeJson("direct-link-manifest-v1.json", {
  schemaVersion: "flow-content-ui-direct-link-manifest-v1",
  corpusFingerprint,
  counts: { content: includedRecords.length, links: directLinks.length },
  links: directLinks,
});

console.log(
  JSON.stringify(
    {
      corpusFingerprint,
      rawSourceBacked: rawRecords.length,
      includedNormal: normalRecords.length,
      gallery: includedRecords.length,
      projectionCells: projectionResults.length,
      pacingTargets: pacingTargets.length,
      eventTargets: eventResults.length,
    },
    null,
    2,
  ),
);
