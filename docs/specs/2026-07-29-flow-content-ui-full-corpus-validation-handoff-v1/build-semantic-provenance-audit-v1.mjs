import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viewModelPath = path.join(__dirname, "content-ui-view-model-v1.json");
const lineagePath = path.join(__dirname, "corpus-lineage-v1.json");
const outputJsonPath = path.join(__dirname, "semantic-provenance-audit-v1.json");
const outputMarkdownPath = path.join(__dirname, "semantic-provenance-audit-v1.md");

const viewModel = JSON.parse(fs.readFileSync(viewModelPath, "utf8"));
const lineage = JSON.parse(fs.readFileSync(lineagePath, "utf8"));

const NORMAL_TIERS = new Set(["product_candidate", "structure_probe"]);
const FIELD_NAMES = ["title", "detail", "completion", "schedule", "recurrence"];
const STATUS_ORDER = [
  "suspected_invention",
  "owner_or_provenance_missing",
  "trace_only_semantics_unverified",
  "rule_normalized",
  "direct_source_supported",
  "not_applicable",
];

const GENERIC_COMPLETION_ENDINGS = [
  "내용을 확인하고 실행 상태를 남겼다",
  "실행을 마치고 완료 상태를 기록했다",
  "작업을 원문 설명대로 마쳤다",
  "항목을 원문 기준으로 확인했다",
  "학습 또는 자료 사용을 마쳤다",
  "결과를 확인하고 상태를 남겼다",
  "자료를 확인하고 진도 상태를 남겼다",
  "공식 원문 구간을 보호자와 함께 확인함",
  "장소로 코스에 보존함",
  "학습 완료 상태로 표시했다",
  "점검 결과와 필요한 후속 상태를 기록했다",
  "공식 조건을 확인하고 적용 여부를 기록했다",
  "공식 결과를 확인하고 현재 상태를 기록했다",
  "선택과 근거를 기록했다",
  "이 차시를 완료하고 진행 상태를 기록했다",
  "이 기준을 후보에 적용하고 판단 근거를 기록했다",
  "원문 기준으로 확인했다",
];

const GENERIC_DETAIL_FRAGMENTS = [
  "개인 메모를 사용한다",
  "같은 메모에 적는다",
  "원문 강의:",
  "원문 레시피:",
  "영상:",
  "길이:",
  "조회",
  "좋아요",
  "댓글",
];

function sha256(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return `sha256:${crypto.createHash("sha256").update(buffer).digest("hex")}`;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function tokens(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2);
}

function tokenCoverage(value, evidence) {
  const valueTokens = tokens(value);
  const evidenceTokens = tokens(evidence);
  if (!valueTokens.length) return 1;
  return (
    valueTokens.filter((token) =>
      evidenceTokens.some(
        (candidate) =>
          candidate === token ||
          (candidate.length >= 2 && token.includes(candidate)) ||
          (token.length >= 2 && candidate.includes(token)),
      ),
    ).length / valueTokens.length
  );
}

function flattenPrimitiveStrings(value, output = []) {
  if (typeof value === "string" || typeof value === "number") {
    output.push(String(value));
    return output;
  }
  if (Array.isArray(value)) {
    for (const entry of value) flattenPrimitiveStrings(entry, output);
    return output;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) flattenPrimitiveStrings(entry, output);
  }
  return output;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function urls(value) {
  return unique(String(value ?? "").match(/https?:\/\/[^\s·),]+/g) ?? []);
}

function numericClaims(value) {
  return unique(
    (String(value ?? "").match(/\d+(?::\d+)?(?:[./-]\d+)*/g) ?? []).filter(
      (candidate) => candidate.length > 0,
    ),
  );
}

function directTextMatch(value, evidenceStrings) {
  const rawValue = String(value ?? "").trim();
  if (
    rawValue &&
    evidenceStrings.some((candidate) =>
      String(candidate ?? "").trim().includes(rawValue),
    )
  ) {
    return true;
  }
  const normalizedValue = normalize(value);
  if (!normalizedValue) return false;
  return evidenceStrings.some((candidate) => {
    const normalizedCandidate = normalize(candidate);
    if (!normalizedCandidate) return false;
    return (
      normalizedCandidate === normalizedValue ||
      normalizedCandidate.includes(normalizedValue)
    );
  });
}

function sourceFragmentInValue(value, evidenceStrings) {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return false;
  return evidenceStrings.some((candidate) => {
    const normalizedCandidate = normalize(candidate);
    return normalizedCandidate.length >= 2 && normalizedValue.includes(normalizedCandidate);
  });
}

function knownTitleNormalization(value, evidenceStrings) {
  if (sourceFragmentInValue(value, evidenceStrings)) return true;
  const stripped = String(value ?? "")
    .replace(/[「」『』“”‘’"'`]/g, "")
    .replace(
      /(학습하기|시청하기|읽기|만들기|준비하기|확인하기|방문하기|예약하기|기록하기|실행하기|진행하기|완료하기|풀기|찍기|제공|정하기|처리하기|시작하기|마치기)$/u,
      "",
    )
    .trim();
  return directTextMatch(stripped, evidenceStrings);
}

function knownDetailNormalization(value, evidenceStrings, snapshotUrls) {
  if (sourceFragmentInValue(value, evidenceStrings)) return true;
  const valueUrls = urls(value);
  if (
    valueUrls.length &&
    valueUrls.every((url) => snapshotUrls.includes(url))
  ) {
    return true;
  }
  return GENERIC_DETAIL_FRAGMENTS.some((fragment) => String(value ?? "").includes(fragment));
}

function knownCompletionNormalization(completion, item, evidenceStrings) {
  const doneWhen = completion?.doneWhen;
  if (!doneWhen) return false;
  if (
    GENERIC_COMPLETION_ENDINGS.some((ending) => doneWhen.includes(ending))
  ) {
    return true;
  }
  if (
    (item.title && normalize(doneWhen).includes(normalize(item.title))) ||
    (item.description &&
      normalize(item.description).length >= 3 &&
      normalize(doneWhen).includes(normalize(item.description)))
  ) {
    return true;
  }
  return sourceFragmentInValue(doneWhen, evidenceStrings);
}

function dateParts(value) {
  if (!value) return [];
  return unique(
    String(value)
      .replace(/[+-]\d{2}:\d{2}$/u, "")
      .match(/\d{4}-\d{2}-\d{2}|\d{2}:\d{2}/g) ?? [],
  );
}

function scheduleEvidenceSupported(schedule, evidenceStrings) {
  const evidence = evidenceStrings.join(" ");
  const normalizedEvidence = normalize(evidence);
  if (!schedule) return false;

  if (schedule.mode === "absolute") {
    const parts = dateParts(schedule.start);
    return parts.length > 0 && parts.every((part) => evidence.includes(part));
  }

  if (schedule.mode === "date_window" && schedule.basis === "absolute") {
    const parts = [...dateParts(schedule.startDate), ...dateParts(schedule.endDate)];
    return parts.length > 0 && parts.every((part) => evidence.includes(part));
  }

  if (schedule.mode === "anchor_offset") {
    const offset = Number(schedule.dayOffset);
    if (!Number.isFinite(offset)) return false;
    const absolute = Math.abs(offset);
    const explicitPatterns = [
      new RegExp(`d\\s*[+＋]?\\s*${absolute}(?!\\d)`, "iu"),
      new RegExp(`d\\s*[-−]\\s*${absolute}(?!\\d)`, "iu"),
      new RegExp(`day\\s*${offset + 1}(?!\\d)`, "iu"),
    ];
    if (explicitPatterns.some((pattern) => pattern.test(evidence))) return true;

    const koreanWeekdays = [
      ["월요일", 0],
      ["화요일", 1],
      ["수요일", 2],
      ["목요일", 3],
      ["금요일", 4],
      ["토요일", 5],
      ["일요일", 6],
    ];
    for (const [weekday, index] of koreanWeekdays) {
      if (!evidence.includes(weekday)) continue;
      const weekMatch = evidence.match(/(\d+)\s*주차/u);
      const derived = (Number(weekMatch?.[1] ?? 1) - 1) * 7 + index;
      if (derived === offset) return true;
    }
    const englishWeekdays = [
      ["monday", 0],
      ["tuesday", 1],
      ["wednesday", 2],
      ["thursday", 3],
      ["friday", 4],
      ["saturday", 5],
      ["sunday", 6],
    ];
    for (const [weekday, index] of englishWeekdays) {
      if (evidence.toLowerCase().includes(weekday) && offset % 7 === index) return true;
    }
    if (offset === 0 && /(시작|첫날|당일|day\s*1|1일차)/iu.test(evidence)) return true;
    return false;
  }

  if (schedule.mode === "date_window") {
    const start = Number(schedule.startDayOffset);
    const end = Number(schedule.endDayOffset);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    const numbers = numericClaims(evidence).map(Number);
    return numbers.includes(Math.abs(start)) && numbers.includes(Math.abs(end));
  }

  return normalizedEvidence.length > 0;
}

function recurrenceEvidenceSupported(recurrence, evidenceStrings) {
  if (!recurrence) return false;
  const evidence = evidenceStrings.join(" ").toLowerCase();
  if (recurrence.frequency === "monthly") {
    return /(월\s*1\s*회|매월|monthly|once\s+a\s+month)/iu.test(evidence);
  }
  if (recurrence.frequency === "weekly") {
    return /(매주|주\s*\d+\s*회|weekly)/iu.test(evidence);
  }
  if (recurrence.frequency === "daily") {
    return /(매일|daily|every\s+day)/iu.test(evidence);
  }
  return normalize(evidence).includes(normalize(recurrence.frequency));
}

function makeFieldAudit({
  field,
  value,
  semanticBasis,
  provenanceEncoded,
  applicable = true,
  sourceRowIds,
  matchedSourceRowIds,
  evidenceExcerpt,
  tokenCoverageScore = null,
  ruleId = null,
  issues = [],
  note,
}) {
  let status = semanticBasis;
  if (!applicable) status = "not_applicable";
  else if (semanticBasis === "suspected_invention") status = "suspected_invention";
  else if (!provenanceEncoded) status = "owner_or_provenance_missing";

  return {
    field,
    applicable,
    status,
    semanticBasis,
    provenanceEncoded,
    value,
    sourceRowIds,
    matchedSourceRowIds,
    evidenceExcerpt,
    tokenCoverage:
      tokenCoverageScore === null ? null : Number(tokenCoverageScore.toFixed(4)),
    ruleId,
    issues: unique(issues),
    note,
  };
}

function resolveItemEvidence(content, item) {
  const rowsById = new Map(
    (content.canonical.sourceRows ?? []).map((row) => [row.sourceRowId, row]),
  );
  const refsById = new Map(
    (content.canonical.sourceRefs ?? []).map((ref) => [ref.sourceRefId, ref]),
  );
  const sourceRowIds = unique([
    ...(item.sourceRowIds ?? []),
    ...(item.sourceTrace ?? []).flatMap((trace) => trace.sourceRowIds ?? []),
    ...(item.sourceRefIds ?? []).flatMap(
      (sourceRefId) => refsById.get(sourceRefId)?.sourceRowIds ?? [],
    ),
  ]);
  const missingSourceRowIds = sourceRowIds.filter((id) => !rowsById.has(id));
  const sourceRows = sourceRowIds.map((id) => rowsById.get(id)).filter(Boolean);
  const evidenceStrings = sourceRows.flatMap((row) => [
    row.title,
    row.detail,
    row.locator,
    ...flattenPrimitiveStrings(row.original),
  ]);
  const snapshotUrls = unique(
    (content.canonical.sourceSnapshots ?? []).flatMap((snapshot) => [
      snapshot.finalUrl,
    ]),
  );
  const sourceRefIds = unique([
    ...(item.sourceRefIds ?? []),
    ...(item.sourceTrace ?? []).map((trace) => trace.sourceRefId),
  ]);
  const missingSourceRefIds = sourceRefIds.filter((id) => !refsById.has(id));
  return {
    sourceRowIds,
    sourceRows,
    evidenceStrings,
    snapshotUrls,
    sourceRefIds,
    missingSourceRowIds,
    missingSourceRefIds,
  };
}

function textFieldAudit(field, value, evidence, item) {
  const {
    sourceRowIds,
    sourceRows,
    evidenceStrings,
    snapshotUrls,
  } = evidence;
  const valueText = String(value ?? "");
  const direct = directTextMatch(valueText, evidenceStrings);
  const coverage = tokenCoverage(valueText, evidenceStrings.join(" "));
  const matchedSourceRowIds = sourceRows
    .filter((row) =>
      directTextMatch(valueText, [
        row.title,
        row.detail,
        row.locator,
        ...flattenPrimitiveStrings(row.original),
      ]),
    )
    .map((row) => row.sourceRowId);

  let semanticBasis = "trace_only_semantics_unverified";
  let ruleId = null;
  if (!valueText) {
    return makeFieldAudit({
      field,
      value,
      semanticBasis: "not_applicable",
      provenanceEncoded: true,
      applicable: false,
      sourceRowIds,
      matchedSourceRowIds: [],
      evidenceExcerpt: [],
      note: `${field} 값이 비어 있어 주장 자체가 없다.`,
    });
  }
  if (!sourceRowIds.length) {
    semanticBasis = "owner_or_provenance_missing";
  } else if (direct) {
    semanticBasis = "direct_source_supported";
  } else if (
    field === "title"
      ? knownTitleNormalization(valueText, evidenceStrings)
      : knownDetailNormalization(valueText, evidenceStrings, snapshotUrls)
  ) {
    semanticBasis = "rule_normalized";
    ruleId =
      field === "title"
        ? "action_title_wrapper_or_source_fragment"
        : "source_detail_plus_execution_affordance_or_snapshot_url";
  }

  const evidenceNumbers = numericClaims(
    [...evidenceStrings, ...snapshotUrls].join(" "),
  );
  const unexplainedNumbers = numericClaims(valueText).filter(
    (number) => !evidenceNumbers.includes(number),
  );
  const valueUrls = urls(valueText);
  const unexplainedUrls = valueUrls.filter(
    (url) =>
      !snapshotUrls.includes(url) &&
      !evidenceStrings.some((candidate) => String(candidate).includes(url)),
  );

  // A number or URL mismatch is a review signal, not automatically an invention.
  // It becomes a suspicion only when there is also no source/rule semantic bridge.
  if (
    semanticBasis === "trace_only_semantics_unverified" &&
    (unexplainedNumbers.length || unexplainedUrls.length)
  ) {
    semanticBasis = "suspected_invention";
  }

  return makeFieldAudit({
    field,
    value,
    semanticBasis,
    provenanceEncoded: sourceRowIds.length > 0,
    sourceRowIds,
    matchedSourceRowIds,
    evidenceExcerpt: sourceRows.slice(0, 3).map((row) => ({
      sourceRowId: row.sourceRowId,
      title: row.title,
      detail: row.detail,
      locator: row.locator,
    })),
    tokenCoverageScore: coverage,
    ruleId,
    issues: [
      ...(semanticBasis === "trace_only_semantics_unverified"
        ? ["semantic_equivalence_not_machine_verified"]
        : []),
      ...(unexplainedNumbers.length
        ? [`unexplained_numeric_tokens:${unexplainedNumbers.join(",")}`]
        : []),
      ...(unexplainedUrls.length
        ? [`unexplained_urls:${unexplainedUrls.join(",")}`]
        : []),
    ],
    note:
      semanticBasis === "direct_source_supported"
        ? "인용 SourceRow의 구조화 텍스트에서 이 값을 직접 대조할 수 있다."
        : semanticBasis === "rule_normalized"
          ? "SourceRow 값에 실행형 제목, 링크, 개인 메모 안내 같은 정규화 규칙이 더해졌다."
          : semanticBasis === "suspected_invention"
            ? "인용 행과 알려진 정규화 규칙만으로 숫자·URL 또는 의미를 설명하기 어려워 수동 확인이 필요하다."
            : "SourceRow 연결은 유효하지만 자동 텍스트 대조만으로 의미 동등성을 확인하지 못했다.",
  });
}

function completionFieldAudit(item, evidence) {
  const completion = item.completion ?? null;
  const doneWhen = completion?.doneWhen ?? null;
  const {
    sourceRowIds,
    sourceRows,
    evidenceStrings,
  } = evidence;
  if (!doneWhen) {
    return makeFieldAudit({
      field: "completion",
      value: completion,
      semanticBasis: "not_applicable",
      provenanceEncoded: Boolean(completion?.provenance),
      applicable: false,
      sourceRowIds,
      matchedSourceRowIds: [],
      evidenceExcerpt: sourceRows.slice(0, 2).map((row) => ({
        sourceRowId: row.sourceRowId,
        title: row.title,
        detail: row.detail,
      })),
      ruleId: completion?.provenance ?? "no_completion_claim",
      note:
        "완료 가능 상태만 있고 완료 기준 문장은 없다. null을 유지한 것은 발명 방지 규칙과 일치한다.",
    });
  }

  const direct = directTextMatch(doneWhen, evidenceStrings);
  const normalizedRule = knownCompletionNormalization(
    completion,
    item,
    evidenceStrings,
  );
  let semanticBasis = direct
    ? "direct_source_supported"
    : normalizedRule
      ? "rule_normalized"
      : "suspected_invention";
  const provenanceEncoded =
    completion?.provenance === "source" ||
    completion?.provenance === "user_overlay" ||
    completion?.provenance === "system_derived";
  if (completion?.provenance === "source" && !direct) {
    semanticBasis = "trace_only_semantics_unverified";
  }

  return makeFieldAudit({
    field: "completion",
    value: completion,
    semanticBasis,
    provenanceEncoded,
    sourceRowIds,
    matchedSourceRowIds: direct
      ? sourceRows
          .filter((row) =>
            directTextMatch(doneWhen, [
              row.title,
              row.detail,
              ...flattenPrimitiveStrings(row.original),
            ]),
          )
          .map((row) => row.sourceRowId)
      : [],
    evidenceExcerpt: sourceRows.slice(0, 2).map((row) => ({
      sourceRowId: row.sourceRowId,
      title: row.title,
      detail: row.detail,
    })),
    tokenCoverageScore: tokenCoverage(doneWhen, evidenceStrings.join(" ")),
    ruleId: normalizedRule ? "canonical_completion_display_template" : null,
    issues: [
      ...(!provenanceEncoded ? ["completion_provenance_not_encoded"] : []),
      ...(semanticBasis === "suspected_invention"
        ? ["completion_not_source_matched_or_known_template"]
        : []),
    ],
    note: direct
      ? "완료 기준을 SourceRow 구조화 값에서 직접 대조할 수 있다."
      : normalizedRule
        ? "완료 상태를 UI에서 기록하기 위한 생성 템플릿으로 설명된다. 다만 completion.provenance가 없으면 계약 보강이 필요하다."
        : "원문 또는 알려진 완료 템플릿으로 설명되지 않아 실제 발명 여부를 수동 확인해야 한다.",
  });
}

function scheduleFieldAudit(item, evidence) {
  const schedule = item.schedule ?? null;
  const {
    sourceRowIds,
    sourceRows,
    evidenceStrings,
  } = evidence;
  if (!schedule) {
    return makeFieldAudit({
      field: "schedule",
      value: null,
      semanticBasis: "not_applicable",
      provenanceEncoded: true,
      applicable: false,
      sourceRowIds,
      matchedSourceRowIds: [],
      evidenceExcerpt: [],
      note: "canonical Item에 일정 주장이 없다.",
    });
  }

  const owner = schedule.scheduleOwner ?? null;
  const derivation = schedule.derivation ?? null;
  const isOverlay = owner === "user_overlay" || owner === "system_derived";
  const sourceSupported = scheduleEvidenceSupported(schedule, evidenceStrings);
  let semanticBasis = isOverlay
    ? "rule_normalized"
    : sourceSupported
      ? "direct_source_supported"
      : "trace_only_semantics_unverified";
  if (
    ["absolute", "date_window"].includes(schedule.mode) &&
    !isOverlay &&
    !sourceSupported
  ) {
    semanticBasis = "suspected_invention";
  }
  const provenanceEncoded = isOverlay || owner === "source";

  return makeFieldAudit({
    field: "schedule",
    value: schedule,
    semanticBasis,
    provenanceEncoded,
    sourceRowIds,
    matchedSourceRowIds: sourceSupported ? sourceRowIds : [],
    evidenceExcerpt: sourceRows.slice(0, 3).map((row) => ({
      sourceRowId: row.sourceRowId,
      title: row.title,
      detail: row.detail,
      locator: row.locator,
    })),
    ruleId: isOverlay ? derivation ?? "user_overlay_schedule" : null,
    issues: [
      ...(!owner ? ["schedule_owner_missing"] : []),
      ...(!derivation && owner !== "source"
        ? ["schedule_derivation_missing"]
        : []),
      ...(!sourceSupported && !isOverlay
        ? ["temporal_value_not_directly_machine_verified"]
        : []),
    ],
    note: isOverlay
      ? "source fact가 아니라 명시된 user/system overlay와 derivation 규칙으로 생성된다."
      : sourceSupported
        ? "인용 SourceRow의 날짜·D-day·요일 구조와 대조된다. scheduleOwner/derivation이 없으면 계약상 provenance는 불완전하다."
        : "SourceRow 연결은 있으나 자동 대조로 시간값을 확인하지 못했다. owner가 없으면 source fact로 간주하면 안 된다.",
  });
}

function recurrenceFieldAudit(item, evidence) {
  const recurrence = item.schedule?.recurrence ?? null;
  const {
    sourceRowIds,
    sourceRows,
    evidenceStrings,
  } = evidence;
  if (!recurrence) {
    return makeFieldAudit({
      field: "recurrence",
      value: null,
      semanticBasis: "not_applicable",
      provenanceEncoded: true,
      applicable: false,
      sourceRowIds,
      matchedSourceRowIds: [],
      evidenceExcerpt: [],
      note: "반복 규칙이 없다.",
    });
  }

  const sourceSupported = recurrenceEvidenceSupported(
    recurrence,
    evidenceStrings,
  );
  const provenanceEncoded =
    recurrence.sourceDefined === true ||
    ["source", "user_overlay", "system_derived"].includes(recurrence.owner);
  let semanticBasis = sourceSupported
    ? "direct_source_supported"
    : recurrence.owner === "user_overlay" ||
        recurrence.owner === "system_derived"
      ? "rule_normalized"
      : recurrence.sourceDefined
        ? "suspected_invention"
        : "trace_only_semantics_unverified";

  return makeFieldAudit({
    field: "recurrence",
    value: recurrence,
    semanticBasis,
    provenanceEncoded,
    sourceRowIds,
    matchedSourceRowIds: sourceSupported ? sourceRowIds : [],
    evidenceExcerpt: sourceRows.slice(0, 3).map((row) => ({
      sourceRowId: row.sourceRowId,
      title: row.title,
      detail: row.detail,
    })),
    ruleId:
      semanticBasis === "rule_normalized"
        ? recurrence.derivation ?? "overlay_recurrence"
        : null,
    issues: [
      ...(recurrence.sourceDefined && !sourceSupported
        ? ["source_defined_recurrence_not_machine_verified"]
        : []),
    ],
    note: sourceSupported
      ? "반복 빈도와 간격을 인용 SourceRow에서 직접 확인할 수 있다."
      : semanticBasis === "rule_normalized"
        ? "명시된 overlay 반복 정책으로 정당화된다."
        : "sourceDefined 표기 또는 연결만으로 반복값 자체를 확인할 수 없어 수동 검토가 필요하다.",
  });
}

function aggregateFieldStatuses(itemAudits) {
  const fields = Object.fromEntries(
    FIELD_NAMES.map((field) => [
      field,
      Object.fromEntries(STATUS_ORDER.map((status) => [status, 0])),
    ]),
  );
  const semanticBases = Object.fromEntries(
    FIELD_NAMES.map((field) => [
      field,
      Object.fromEntries(STATUS_ORDER.map((status) => [status, 0])),
    ]),
  );
  for (const item of itemAudits) {
    for (const field of FIELD_NAMES) {
      const audit = item.fields[field];
      fields[field][audit.status] = (fields[field][audit.status] ?? 0) + 1;
      semanticBases[field][audit.semanticBasis] =
        (semanticBases[field][audit.semanticBasis] ?? 0) + 1;
    }
  }
  return { finalStatuses: fields, semanticBases };
}

const contents = viewModel.contents.filter((content) =>
  NORMAL_TIERS.has(content.corpusTier),
);
const lineageByContentId = new Map(
  lineage.recordLineage.map((record) => [record.contentId, record]),
);
const itemAudits = [];
const contentAudits = [];
const integrityIssues = [];

for (const content of contents) {
  const currentItems = [];
  for (const item of content.canonical.items ?? []) {
    const evidence = resolveItemEvidence(content, item);
    if (!evidence.sourceRowIds.length) {
      integrityIssues.push({
        severity: "error",
        code: "ITEM_WITHOUT_SOURCE_ROW_LINK",
        contentId: content.contentId,
        itemId: item.itemId,
      });
    }
    for (const sourceRowId of evidence.missingSourceRowIds) {
      integrityIssues.push({
        severity: "error",
        code: "BROKEN_SOURCE_ROW_REFERENCE",
        contentId: content.contentId,
        itemId: item.itemId,
        sourceRowId,
      });
    }
    for (const sourceRefId of evidence.missingSourceRefIds) {
      integrityIssues.push({
        severity: "error",
        code: "BROKEN_SOURCE_REF_REFERENCE",
        contentId: content.contentId,
        itemId: item.itemId,
        sourceRefId,
      });
    }
    const fields = {
      title: textFieldAudit("title", item.title, evidence, item),
      detail: textFieldAudit("detail", item.description, evidence, item),
      completion: completionFieldAudit(item, evidence),
      schedule: scheduleFieldAudit(item, evidence),
      recurrence: recurrenceFieldAudit(item, evidence),
    };
    const audit = {
      contentId: content.contentId,
      itemId: item.itemId,
      stepId: item.stepId,
      corpusTier: content.corpusTier,
      datasetId: content.lineage.datasetId,
      itemIntent: item.intent,
      provenanceLinkContract: item.sourceTrace?.length
        ? "sourceTrace_and_sourceRefs"
        : item.sourceRowIds?.length
          ? "sourceRowIds"
          : "missing",
      sourceRowIds: evidence.sourceRowIds,
      fields,
      overallStatus:
        STATUS_ORDER.find((status) =>
          Object.values(fields).some((field) => field.status === status),
        ) ?? "not_applicable",
    };
    itemAudits.push(audit);
    currentItems.push(audit);
  }
  const statusCounts = {};
  for (const status of STATUS_ORDER) {
    statusCounts[status] = currentItems.filter(
      (item) => item.overallStatus === status,
    ).length;
  }
  contentAudits.push({
    contentId: content.contentId,
    title: content.title,
    corpusTier: content.corpusTier,
    datasetId: content.lineage.datasetId,
    itemCount: currentItems.length,
    sourceRowCount: content.canonical.sourceRows?.length ?? 0,
    lineageRecordPresent: lineageByContentId.has(content.contentId),
    itemStatusCounts: statusCounts,
    manualReviewItemIds: currentItems
      .filter((item) =>
        ["suspected_invention", "trace_only_semantics_unverified"].includes(
          item.overallStatus,
        ),
      )
      .map((item) => item.itemId),
  });
}

const aggregated = aggregateFieldStatuses(itemAudits);
const allFieldAudits = itemAudits.flatMap((item) =>
  FIELD_NAMES.map((field) => ({
    contentId: item.contentId,
    itemId: item.itemId,
    ...item.fields[field],
  })),
);
const issueCounts = {};
for (const field of allFieldAudits) {
  for (const issue of field.issues) {
    const code = issue.split(":")[0];
    issueCounts[code] = (issueCounts[code] ?? 0) + 1;
  }
}

const eventRecurrenceAudits = contents
  .filter(
    (content) =>
      content.eventSource?.recurrenceRule ||
      content.eventSource?.recurrencePolicy ||
      content.eventSource?.edition?.recurrencePolicy,
  )
  .map((content) => {
    const rows = content.canonical.sourceRows ?? [];
    const evidenceStrings = rows.flatMap((row) => [
      row.title,
      row.detail,
      row.locator,
      ...flattenPrimitiveStrings(row.original),
    ]);
    const recurrenceRule = content.eventSource?.recurrenceRule ?? null;
    const recurrencePolicy =
      content.eventSource?.recurrencePolicy ??
      content.eventSource?.edition?.recurrencePolicy ??
      null;
    let status = "rule_normalized";
    let note =
      "edition_occurrences_not_yearly_rrule은 원문 반복 사실이 아니라 거짓 yearly RRULE을 막는 모델 정책이다.";
    if (recurrenceRule) {
      const byDay =
        recurrenceRule.match(/BYDAY=([^;]+)/)?.[1]?.split(",") ?? [];
      const originalByDay = unique(
        rows.flatMap((row) => row.original?.byDay ?? []),
      );
      const supported =
        byDay.length > 0 &&
        byDay.every((day) => originalByDay.includes(day)) &&
        rows.some((row) => row.original?.startDate && row.original?.endDate);
      status = supported
        ? "direct_source_supported"
        : "suspected_invention";
      note = supported
        ? "BYDAY와 기간을 SourceRow.original에서 대조했다."
        : "RRULE의 BYDAY/기간을 SourceRow.original에서 대조하지 못했다.";
    }
    return {
      contentId: content.contentId,
      recurrenceRule,
      recurrencePolicy,
      status,
      sourceRowIds: rows.map((row) => row.sourceRowId),
      note,
    };
  });

const sourceArtifactHashes = {
  "content-ui-view-model-v1.json": sha256(fs.readFileSync(viewModelPath)),
  "corpus-lineage-v1.json": sha256(fs.readFileSync(lineagePath)),
};
const suspectedFieldClaims = allFieldAudits.filter(
  (field) => field.status === "suspected_invention",
);
const traceOnlyFieldClaims = allFieldAudits.filter(
  (field) => field.status === "trace_only_semantics_unverified",
);
const missingProvenanceFieldClaims = allFieldAudits.filter(
  (field) => field.status === "owner_or_provenance_missing",
);
const titleByContentId = new Map(
  contents.map((content) => [content.contentId, content.title]),
);
const manualReviewByContent = [
  ...traceOnlyFieldClaims,
  ...suspectedFieldClaims,
].reduce((records, field) => {
  const record = records.get(field.contentId) ?? {
    contentId: field.contentId,
    title: titleByContentId.get(field.contentId) ?? field.contentId,
    fieldCount: 0,
    byField: {},
    suspectedInventionFieldCount: 0,
    traceOnlySemanticFieldCount: 0,
  };
  record.fieldCount += 1;
  record.byField[field.field] = (record.byField[field.field] ?? 0) + 1;
  if (field.status === "suspected_invention") {
    record.suspectedInventionFieldCount += 1;
  } else {
    record.traceOnlySemanticFieldCount += 1;
  }
  records.set(field.contentId, record);
  return records;
}, new Map());
const rankedManualReviewContents = [...manualReviewByContent.values()].sort(
  (left, right) =>
    right.suspectedInventionFieldCount -
      left.suspectedInventionFieldCount ||
    right.fieldCount - left.fieldCount ||
    left.contentId.localeCompare(right.contentId),
);
const itemsWithResolvableRows = itemAudits.filter(
  (item) => item.sourceRowIds.length > 0,
).length;
const totalItems = itemAudits.length;
const status =
  integrityIssues.some((issue) => issue.severity === "error") ||
  suspectedFieldClaims.length
    ? "REVIEW_REQUIRED"
    : missingProvenanceFieldClaims.length || traceOnlyFieldClaims.length
      ? "PARTIAL_EVIDENCE"
      : "PASS";

const audit = {
  schemaVersion: "flowme-semantic-provenance-audit-v1",
  generatedAt: viewModel.generatedAt,
  corpusFingerprint: viewModel.corpusFingerprint,
  inputArtifacts: sourceArtifactHashes,
  scope: {
    includedCorpusTiers: [...NORMAL_TIERS],
    contentCount: contents.length,
    itemCount: totalItems,
    auditedFieldsPerItem: FIELD_NAMES,
    fieldClaimCount: totalItems * FIELD_NAMES.length,
    eventRecurrenceRecordCount: eventRecurrenceAudits.length,
  },
  claimBoundary: {
    auditType: "deterministic_internal_semantic_provenance_audit",
    canEstablish: [
      "Item-to-SourceRow reference integrity in the frozen corpus",
      "exact or contained text and structured temporal-value matches",
      "known display/completion/schedule normalization patterns",
      "missing owner, derivation, and provenance metadata",
      "claims that require manual source adjudication",
    ],
    cannotEstablish: [
      "that frozen SourceRows faithfully reproduce every live source page",
      "semantic equivalence of every Korean paraphrase",
      "rights, locale, safety, or freshness approval",
      "observed-user validation",
      "a universal proof that invention count is zero",
    ],
    liveSourceReinspection: "NOT_RUN_IN_THIS_AUDIT",
    observedUserValidation: "NOT_RUN",
    externalCalendarRoundTrip: "NOT_RUN",
    zeroInventionClaim:
      suspectedFieldClaims.length === 0 &&
      traceOnlyFieldClaims.length === 0
        ? "NO_SUSPECT_FOUND_WITHIN_AUTOMATED_PROOF_SCOPE"
        : "NOT_PROVEN",
  },
  status,
  summary: {
    contents: contents.length,
    items: totalItems,
    itemSourceRowLinkCoverage: {
      numerator: itemsWithResolvableRows,
      denominator: totalItems,
      rate:
        totalItems > 0
          ? Number((itemsWithResolvableRows / totalItems).toFixed(4))
          : 0,
    },
    brokenReferenceCount: integrityIssues.length,
    finalStatusByField: aggregated.finalStatuses,
    semanticBasisByField: aggregated.semanticBases,
    ownerOrProvenanceMissingFieldCount:
      missingProvenanceFieldClaims.length,
    traceOnlySemanticFieldCount: traceOnlyFieldClaims.length,
    suspectedInventionFieldCount: suspectedFieldClaims.length,
    issueCounts,
    eventRecurrenceStatusCounts: eventRecurrenceAudits.reduce(
      (counts, record) => {
        counts[record.status] = (counts[record.status] ?? 0) + 1;
        return counts;
      },
      {},
    ),
    manualReviewContentCount: rankedManualReviewContents.length,
    topManualReviewContents: rankedManualReviewContents.slice(0, 20),
  },
  validatorSummary: {
    status,
    corpusFingerprint: viewModel.corpusFingerprint,
    expectedContentCount: 110,
    actualContentCount: contents.length,
    expectedItemCount: 893,
    actualItemCount: totalItems,
    allItemsHaveResolvableSourceRows:
      itemsWithResolvableRows === totalItems,
    allSourceReferencesResolve: integrityIssues.length === 0,
    inventionZeroProven: false,
    suspectedInventionFieldCount: suspectedFieldClaims.length,
    traceOnlySemanticFieldCount: traceOnlyFieldClaims.length,
    ownerOrProvenanceMissingFieldCount:
      missingProvenanceFieldClaims.length,
    requiredFollowUp:
      suspectedFieldClaims.length || traceOnlyFieldClaims.length
        ? "manual_semantic_adjudication"
        : missingProvenanceFieldClaims.length
          ? "encode_owner_and_derivation"
          : "none",
  },
  integrityIssues,
  eventRecurrenceAudits,
  contentAudits,
  itemAudits,
  manualReviewQueue: {
    byContent: rankedManualReviewContents,
    suspectedInvention: suspectedFieldClaims,
    traceOnlySemantics: traceOnlyFieldClaims,
    ownerOrProvenanceMissing: missingProvenanceFieldClaims,
  },
};
audit.auditHash = sha256(stableJson(audit));

fs.writeFileSync(outputJsonPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");

function countFor(field, statusName, basis = false) {
  const bucket = basis
    ? aggregated.semanticBases[field]
    : aggregated.finalStatuses[field];
  return bucket[statusName] ?? 0;
}

const traceExamples = traceOnlyFieldClaims.slice(0, 10);
const suspectExamples = suspectedFieldClaims.slice(0, 10);
const markdown = `# Semantic provenance audit v1

## 결론

이 감사는 정상·구조 corpus ${contents.length}개, Item ${totalItems}개, Item 필드 ${totalItems * FIELD_NAMES.length}개를 전수 검사했다.

- 모든 Item ${itemsWithResolvableRows}/${totalItems}은 현재 frozen corpus 안의 SourceRow에 연결되며 깨진 참조는 ${integrityIssues.length}개다.
- 그러나 SourceRow 연결률 100%는 title·detail·completion·schedule·recurrence의 의미가 모두 원문과 같다는 증명이 아니다.
- 자동 대조가 실제 발명 가능성을 제기한 필드는 ${suspectedFieldClaims.length}개, SourceRow 연결은 있지만 의미 동등성을 자동 확인하지 못한 필드는 ${traceOnlyFieldClaims.length}개다.
- owner 또는 provenance 필드가 빠진 결과는 ${missingProvenanceFieldClaims.length}개다.
- 따라서 현재 corpus에 대해 **“원문에 없는 행동·날짜·반복·완료 기준 발명 0”을 증명했다고 표현하면 안 된다.** 현재 판정은 \`${status}\`이며, 직접 원문 재확인과 수동 의미 판정 전까지 invention 0은 \`NOT_PROVEN\`이다.

## 필드별 최종 상태

| 필드 | 직접 원문 대조 | 규칙 정규화 | trace만 있고 의미 미확인 | owner/provenance 누락 | 발명 의심 | 해당 없음 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${FIELD_NAMES.map(
  (field) =>
    `| ${field} | ${countFor(field, "direct_source_supported")} | ${countFor(field, "rule_normalized")} | ${countFor(field, "trace_only_semantics_unverified")} | ${countFor(field, "owner_or_provenance_missing")} | ${countFor(field, "suspected_invention")} | ${countFor(field, "not_applicable")} |`,
).join("\n")}

최종 상태는 provenance 누락을 우선 표시한다. 예를 들어 completion 문장이 알려진 UI 템플릿으로 설명되더라도 \`completion.provenance\`가 없으면 최종 상태는 \`owner_or_provenance_missing\`이고, 별도 \`semanticBasis\`에는 \`rule_normalized\`가 남는다.

## 의미 기반만 따로 본 결과

| 필드 | 직접 원문 대조 | 규칙 정규화 | trace만 있고 의미 미확인 | 발명 의심 | 해당 없음 |
| --- | ---: | ---: | ---: | ---: | ---: |
${FIELD_NAMES.map(
  (field) =>
    `| ${field} | ${countFor(field, "direct_source_supported", true)} | ${countFor(field, "rule_normalized", true)} | ${countFor(field, "trace_only_semantics_unverified", true)} | ${countFor(field, "suspected_invention", true)} | ${countFor(field, "not_applicable", true)} |`,
).join("\n")}

## 확인된 계약 보강점

1. 현재 893개 Item은 모두 SourceRow로 추적되지만, canonical corpus 368개와 adapter corpus 525개가 각각 \`sourceTrace/sourceRefs\`와 \`sourceRowIds\`라는 다른 연결 계약을 사용한다.
2. 비어 있지 않은 completion 다수는 UI 완료 문장 템플릿으로 설명되지만 명시적 \`completion.provenance\`가 없다. source fact가 아니라 UI 생성 규칙임을 필드에 저장해야 한다.
3. source 일정의 일부는 D-day·요일·절대 날짜와 대조되지만 \`scheduleOwner\`와 \`derivation\`이 없다. source schedule, user overlay, system-derived schedule을 계약에서 강제해야 한다.
4. null completion과 일정 없음은 결측치가 아니라 “원문에 없는 완료 기준·날짜를 만들지 않음”으로 구분했다.
5. event edition의 \`edition_occurrences_not_yearly_rrule\`은 원문 반복 사실이 아니라 거짓 yearly RRULE을 막는 정책이다. source recurrence와 모델 정책을 같은 필드처럼 취급하면 안 된다.

## 수동 재검토가 필요한 예시

### 발명 의심

${
  suspectExamples.length
    ? suspectExamples
        .map(
          (record) =>
            `- \`${record.contentId}\` / \`${record.itemId}\` / ${record.field}: ${record.note}`,
        )
        .join("\n")
    : "- 자동 규칙이 고신뢰 발명 의심으로 분류한 필드는 없었다. 이것은 invention 0 증명이 아니라 현재 휴리스틱의 탐지 결과다."
}

### SourceRow trace는 있으나 의미 동등성 미확인

${
  traceExamples.length
    ? traceExamples
        .map(
          (record) =>
            `- \`${record.contentId}\` / \`${record.itemId}\` / ${record.field}: ${record.note}`,
        )
        .join("\n")
    : "- 없음"
}

전체 큐는 \`semantic-provenance-audit-v1.json#/manualReviewQueue\`에 있다.

### 수동 의미 판정 우선순위

| 콘텐츠 | 미확인 필드 | 필드 구성 |
| --- | ---: | --- |
${rankedManualReviewContents
  .slice(0, 12)
  .map(
    (record) =>
      `| ${record.title} (\`${record.contentId}\`) | ${record.fieldCount} | ${Object.entries(record.byField)
        .map(([field, count]) => `${field} ${count}`)
        .join(", ")} |`,
  )
  .join("\n")}

## 판정 규칙

- \`direct_source_supported\`: 인용 SourceRow의 title/detail/original 구조화 값에서 해당 문구 또는 시간값을 직접 대조했다.
- \`rule_normalized\`: 원문 값을 실행형 제목, UI 완료 문장, 사용자 overlay 일정 또는 anti-fake-recurrence 정책으로 변환하는 알려진 규칙으로 설명된다.
- \`trace_only_semantics_unverified\`: 유효한 SourceRow 연결은 있지만 자동 텍스트·시간 대조로 의미 동등성을 확인하지 못했다.
- \`owner_or_provenance_missing\`: 의미 기반은 설명되더라도 source/user/system owner 또는 derivation/provenance가 데이터에 없다.
- \`suspected_invention\`: 인용 행이나 알려진 정규화 규칙으로 숫자·URL·시간·완료 의미를 설명하기 어려워 직접 원문 확인이 필요하다.
- \`not_applicable\`: 해당 주장이 없다. 특히 null completion, 일정 없음, 반복 없음은 발명이 아니다.

## 증명 범위

이 감사는 frozen SourceRow와 lineage 산출물을 대상으로 한 deterministic internal audit다. 실제 URL을 다시 열어 frozen row가 원문 전체를 충실히 반영하는지 검증하지 않았고, 한국어 paraphrase의 의미 동등성을 전부 판정하지 않았다. rights·locale·safety·freshness 승인, 실제 사용자 검증, 외부 Calendar/VTODO 왕복도 수행하지 않았다.

- live source reinspection: \`NOT_RUN_IN_THIS_AUDIT\`
- observed-user validation: \`NOT_RUN\`
- external Calendar/VTODO round-trip: \`NOT_RUN\`
- invention zero: \`NOT_PROVEN\`

## 재현

\`\`\`powershell
node docs/specs/2026-07-29-flow-content-ui-full-corpus-validation-handoff-v1/build-semantic-provenance-audit-v1.mjs
\`\`\`

입력 hash와 validator용 요약은 JSON의 \`inputArtifacts\`, \`validatorSummary\`에 기록된다.
`;

fs.writeFileSync(outputMarkdownPath, `${markdown.trim()}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      outputJsonPath,
      outputMarkdownPath,
      status,
      contents: contents.length,
      items: totalItems,
      suspectedInventionFieldCount: suspectedFieldClaims.length,
      traceOnlySemanticFieldCount: traceOnlyFieldClaims.length,
      ownerOrProvenanceMissingFieldCount:
        missingProvenanceFieldClaims.length,
      brokenReferenceCount: integrityIssues.length,
    },
    null,
    2,
  ),
);
