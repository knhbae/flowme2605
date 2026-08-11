import {
  buildFlowExperienceProjection,
  type FlowExperienceProjection,
  type FlowExperienceProjectionRow,
} from "../flow-experience-projection";
import {
  parseAuthoringRecurrenceRule,
  projectAuthoringRecurrenceDates,
  resolveAuthoringScheduleDate,
} from "./recurrence";
import type {
  AuthoringRecurrenceRule,
  AuthoringSchedule,
  TextAuthoringDocument,
} from "./types";
import {
  adaptTextAuthoringDocumentToFlowBundle,
  type AuthoringAdapterLossManifest,
} from "./flow-bundle-adapter";

export type AuthoringArtifactKind = "calendar" | "todo" | "sheet" | "memo";

export type AuthoringArtifactLossReason =
  | "undated_item"
  | "relative_anchor_required"
  | "invalid_schedule"
  | "invalid_url"
  | "invalid_recurrence"
  | "non_completable_role"
  | "non_row_role"
  | "insufficient_tabular_structure"
  | "compatibility_loss";

export type AuthoringArtifactLoss = {
  lossId: string;
  artifact: AuthoringArtifactKind;
  reason: AuthoringArtifactLossReason;
  message: string;
  itemId?: string;
  sourcePreserved: true;
};

export type AuthoringArtifactValidation = {
  type: "invalid_date" | "invalid_url" | "invalid_recurrence";
  label: string;
  message: string;
  input?: string;
  expected?: string;
  blocking: boolean;
};

export type AuthoringArtifactSubcheck = {
  subcheckId: string;
  title: string;
  sourceChecked: boolean;
};

export type AuthoringRecurrencePreviewSummary = {
  itemId: string;
  label: string;
  mode: "finite_count" | "finite_until" | "open_ended";
  visibleCount: number;
  totalCount?: number;
  visibleWeeks?: number;
  hasMore: boolean;
  nextOccurrenceLimit?: number;
  nextPreviewWeeks?: number;
};

export type AuthoringArtifactRow = {
  /** Stable row identity. Occurrences use their occurrence ID here. */
  rowId: string;
  itemId: string;
  /** Present only for a derived recurring occurrence. */
  occurrenceId?: string;
  occurrenceIndex?: number;
  stepId?: string;
  stepTitle?: string;
  title: string;
  /** Authored checkbox marker; separate from personal execution state. */
  sourceChecked?: boolean;
  description?: string;
  /** @deprecated Use `description`; retained for existing consumers. */
  detail?: string;
  completion?: string;
  date?: string;
  sourceExpression?: string;
  time?: string;
  timezone?: string;
  place?: string;
  durationMinutes?: number;
  repeat?: string;
  recurrenceSummary?: string;
  condition?: string;
  subchecks: AuthoringArtifactSubcheck[];
  validations: AuthoringArtifactValidation[];
  order: number;
  resources: FlowExperienceProjectionRow["resources"];
  sources?: FlowExperienceProjectionRow["resources"];
  /** @deprecated Use `resources` and `sources` when the distinction matters. */
  links: FlowExperienceProjectionRow["resources"];
  sheetCells?: Record<string, string>;
  caution?: string;
  experienceRow: FlowExperienceProjectionRow;
};

export type AuthoringSheetColumn = {
  key: string;
  label: string;
};

export type AuthoringArtifactView = {
  artifact: AuthoringArtifactKind;
  label: string;
  eligible: boolean;
  count: number;
  rows: AuthoringArtifactRow[];
  sheetColumns?: AuthoringSheetColumn[];
  losses: AuthoringArtifactLoss[];
  recurrenceSummaries: AuthoringRecurrencePreviewSummary[];
  hasMoreOccurrences: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
};

export type AuthoringArtifactRecommendation = {
  artifact: AuthoringArtifactKind;
  role: "primary" | "secondary";
  count: number;
  reason: string;
};

export type AuthoringArtifactProjection = {
  documentId: string;
  title: string;
  primaryArtifact: AuthoringArtifactKind;
  secondaryArtifacts: AuthoringArtifactKind[];
  recommendations: AuthoringArtifactRecommendation[];
  artifacts: Record<AuthoringArtifactKind, AuthoringArtifactView>;
  counts: {
    interpreted: number;
    included: number;
    excluded: number;
    dated: number;
    undated: number;
  };
  lossManifest: {
    entries: AuthoringArtifactLoss[];
    lossCount: number;
    sourcePreserved: true;
    adapter: AuthoringAdapterLossManifest;
  };
  flowExperienceProjection: FlowExperienceProjection;
  sourceMutationCount: 0;
};

export type BuildAuthoringArtifactProjectionOptions = {
  anchor?: string;
  primaryArtifact?: AuthoringArtifactKind;
  secondaryArtifacts?: AuthoringArtifactKind[];
  /** Number of finite occurrences to show. Defaults to 30. */
  finiteOccurrenceLimit?: number;
  /** Alias kept convenient for result-pane pagination. */
  occurrenceLimit?: number;
  /** Number of weeks to show for an open-ended recurrence. Defaults to 4. */
  openEndedOccurrenceWeeks?: number;
  /** Alias kept convenient for result-pane pagination. */
  recurrencePreviewWeeks?: number;
};

export type AuthoringArtifactScope = "whole" | "selected" | "current_step";

export type BuildArtifactPreflightOptions = {
  artifact: AuthoringArtifactKind;
  scope?: AuthoringArtifactScope;
  selectedItemIds?: string[];
  currentStepId?: string;
};

export type AuthoringArtifactPreflight = {
  preflightId: string;
  documentId: string;
  artifact: AuthoringArtifactKind;
  scope: AuthoringArtifactScope;
  eligible: boolean;
  formats: string[];
  sourceItemCount: number;
  count: number;
  omittedCount: number;
  itemIds: string[];
  firstItems: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  losses: AuthoringArtifactLoss[];
  lossCount: number;
  sourcePreserved: true;
};

type UnknownRecord = Record<string, unknown>;

const ARTIFACT_LABELS: Record<AuthoringArtifactKind, string> = {
  calendar: "캘린더",
  todo: "할 일",
  sheet: "표·Excel",
  memo: "TXT",
};

export const AUTHORING_ARTIFACT_FORMATS: Record<
  AuthoringArtifactKind,
  string[]
> = {
  calendar: ["ics"],
  todo: ["markdown", "plain_text"],
  sheet: ["csv", "tsv", "xlsx"],
  memo: ["raw_source", "plain_text", "markdown"],
};

const SECONDARY_ORDER: Record<AuthoringArtifactKind, AuthoringArtifactKind[]> =
  {
    calendar: ["todo", "memo", "sheet"],
    todo: ["memo", "sheet", "calendar"],
    sheet: ["todo", "memo", "calendar"],
    memo: ["todo", "sheet", "calendar"],
  };

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isPlainDate(value: string | undefined): value is string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return false;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
  );
}

function rawAnchorDate(document: TextAuthoringDocument): string | undefined {
  for (const line of document.rawText.split(/\r?\n/u)) {
    const match = /^(?:-\s+)?기준일:\s*(\d{4}-\d{2}-\d{2})\s*$/u.exec(line);
    if (match && isPlainDate(match[1])) return match[1];
  }
  return undefined;
}

function itemProperties(item: UnknownRecord | undefined): UnknownRecord[] {
  return item && Array.isArray(item.properties)
    ? item.properties.filter(isRecord)
    : [];
}

function propertyValue(
  item: UnknownRecord | undefined,
  key: string,
): string | undefined {
  const property = [...itemProperties(item)]
    .reverse()
    .find((candidate) => stringValue(candidate.key) === key);
  return property ? stringValue(property.value) : undefined;
}

const STRUCTURAL_PROPERTY_KEYS = new Set([
  "date",
  "relative_date",
  "anchor",
  "time",
  "timezone",
  "place",
  "duration",
  "repeat",
  "repeat_end",
  "recurrence_end",
  "condition",
  "completion",
  "resource",
  "source",
  "execution_condition",
]);

const STRUCTURAL_DESCRIPTION_LABEL_PATTERN = new RegExp(
  String.raw`^\s*(?:[-*+]\s*)?(?:날짜|상대\s*날짜|기준일|시간|시간대|장소|소요\s*시간|반복|반복\s*종료|실행\s*조건|조건|완료\s*기준|자료|출처)\s*[:：]`,
  "u",
);

function cleanDescriptionText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const lines = value
    .split(/\r?\n/u)
    .filter((line) => !STRUCTURAL_DESCRIPTION_LABEL_PATTERN.test(line));
  const cleaned = lines.join("\n").trim();
  return cleaned || undefined;
}

function unknownPropertyDescription(item: UnknownRecord | undefined): string[] {
  return itemProperties(item).flatMap((property) => {
    const key = stringValue(property.key);
    const label = stringValue(property.label) ?? key;
    const value = stringValue(property.value);
    if (!key || !label || !value || STRUCTURAL_PROPERTY_KEYS.has(key))
      return [];
    return [`${label}: ${value}`];
  });
}

function mergeUniqueDescriptionParts(
  parts: Array<string | undefined>,
): string | undefined {
  const seen = new Set<string>();
  const lines = parts
    .flatMap((part) =>
      part
        ? part
            .split(/\r?\n/u)
            .map((line) => line.trim())
            .filter(Boolean)
        : [],
    )
    .filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    });
  return lines.length > 0 ? lines.join("\n") : undefined;
}

function itemSubchecks(
  item: UnknownRecord | undefined,
): AuthoringArtifactSubcheck[] {
  if (!item || !Array.isArray(item.subchecks)) return [];
  return item.subchecks.flatMap((entry, index) => {
    if (typeof entry === "string" && entry.trim()) {
      return [
        {
          subcheckId: `${stringValue(item.itemId) ?? "item"}:subcheck:${index + 1}`,
          title: entry.trim(),
          sourceChecked: false,
        },
      ];
    }
    if (!isRecord(entry)) return [];
    const title =
      stringValue(entry.title) ??
      stringValue(entry.text) ??
      stringValue(entry.label);
    if (!title) return [];
    return [
      {
        subcheckId:
          stringValue(entry.subcheckId) ??
          stringValue(entry.id) ??
          `${stringValue(item.itemId) ?? "item"}:subcheck:${index + 1}`,
        title,
        sourceChecked: entry.sourceChecked === true || entry.checked === true,
      },
    ];
  });
}

function itemIssues(
  document: TextAuthoringDocument,
  item: UnknownRecord,
): UnknownRecord[] {
  const itemId = stringValue(item.itemId);
  const sourceRowIds = new Set(
    Array.isArray(item.sourceRowIds)
      ? item.sourceRowIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
  );
  return (document.parseResult.issues as unknown as UnknownRecord[]).filter(
    (issue) =>
      (itemId && stringValue(issue.itemId) === itemId) ||
      (Array.isArray(issue.sourceRowIds) &&
        issue.sourceRowIds.some(
          (sourceRowId) =>
            typeof sourceRowId === "string" && sourceRowIds.has(sourceRowId),
        )),
  );
}

function propertyHasValidUrl(value: string): boolean {
  const trimmed = value.trim();
  return (
    /^https?:\/\/[^\s<>()]+$/iu.test(trimmed) ||
    /^\[[^\]]+\]\(https?:\/\/[^\s)]+\)$/iu.test(trimmed)
  );
}

function invalidUrlInput(item: UnknownRecord | undefined): string | undefined {
  for (const property of itemProperties(item)) {
    const key = stringValue(property.key);
    const value = stringValue(property.value);
    if (
      (key === "resource" || key === "source") &&
      value &&
      !propertyHasValidUrl(value)
    ) {
      const links =
        key === "resource"
          ? Array.isArray(item?.resources)
            ? item.resources
            : []
          : Array.isArray(item?.sources)
            ? item.sources
            : [];
      const parsedFromValue = links.some(
        (entry) =>
          isRecord(entry) &&
          Boolean(stringValue(entry.url)) &&
          value.includes(stringValue(entry.url) as string),
      );
      if (!parsedFromValue) return value;
    }
  }
  return undefined;
}

function itemValidations(
  document: TextAuthoringDocument,
  item: UnknownRecord | undefined,
): AuthoringArtifactValidation[] {
  if (!item) return [];
  const issues = itemIssues(document, item);
  const issueTypes = new Set(issues.map((issue) => stringValue(issue.type)));
  const issueFor = (type: string) =>
    issues.find((issue) => stringValue(issue.type) === type);
  const validations: AuthoringArtifactValidation[] = [];
  const invalidDateProperty = [...itemProperties(item)]
    .reverse()
    .find((property) => {
      const key = stringValue(property.key);
      return key === "date" || key === "relative_date";
    });
  if (issueTypes.has("invalid_date") && invalidDateProperty) {
    const issue = issueFor("invalid_date");
    validations.push({
      type: "invalid_date",
      label: "날짜 입력 확인 필요",
      message: "날짜를 계산하지 않았습니다.",
      ...((stringValue(issue?.inputValue) ??
      stringValue(invalidDateProperty.value))
        ? {
            input:
              stringValue(issue?.inputValue) ??
              stringValue(invalidDateProperty.value),
          }
        : {}),
      expected:
        stringValue(issue?.expectedFormat) ??
        (stringValue(invalidDateProperty.key) === "relative_date"
          ? "D-Day, D-3, D+7"
          : "YYYY-MM-DD"),
      blocking: false,
    });
  }
  const invalidUrl = invalidUrlInput(item);
  if (issueTypes.has("invalid_url") || invalidUrl) {
    const issue = issueFor("invalid_url");
    validations.push({
      type: "invalid_url",
      label: "URL 입력 확인 필요",
      message: "자료·출처 URL을 확인하기 전에는 구조 결과에 포함하지 않습니다.",
      ...((stringValue(issue?.inputValue) ?? invalidUrl)
        ? { input: stringValue(issue?.inputValue) ?? invalidUrl }
        : {}),
      expected:
        stringValue(issue?.expectedFormat) ??
        "https://… 또는 [이름](https://…)",
      blocking: true,
    });
  }
  if (issueTypes.has("invalid_recurrence")) {
    const issue = issueFor("invalid_recurrence");
    validations.push({
      type: "invalid_recurrence",
      label: "반복 입력 확인 필요",
      message: "지원하는 반복 규칙과 시작 날짜를 확인해 주세요.",
      ...((stringValue(issue?.inputValue) ?? propertyValue(item, "repeat"))
        ? {
            input:
              stringValue(issue?.inputValue) ?? propertyValue(item, "repeat"),
          }
        : {}),
      expected:
        stringValue(issue?.expectedFormat) ??
        "매일, N일마다, 매주 요일, N주마다 요일, 매월 N일",
      blocking: false,
    });
  }
  return validations;
}

function positiveInteger(value: unknown): number | undefined {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/u.test(value.trim())
        ? Number(value)
        : Number.NaN;
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function canonicalRecurrenceRule(
  item: UnknownRecord,
): AuthoringRecurrenceRule | undefined {
  if (isRecord(item.recurrence)) {
    const recurrence = item.recurrence;
    const frequency = stringValue(recurrence.frequency);
    const interval = positiveInteger(recurrence.interval);
    if (
      (frequency === "daily" ||
        frequency === "weekly" ||
        frequency === "monthly") &&
      interval &&
      stringValue(recurrence.raw)
    ) {
      return recurrence as unknown as AuthoringRecurrenceRule;
    }
    return undefined;
  }
  const raw =
    propertyValue(item, "repeat") ??
    (isRecord(item.schedule) ? stringValue(item.schedule.repeat) : undefined);
  if (!raw) return undefined;
  const parsed = parseAuthoringRecurrenceRule({
    raw,
    repeatEnd:
      propertyValue(item, "repeat_end") ??
      propertyValue(item, "recurrence_end"),
    executionCondition:
      propertyValue(item, "condition") ??
      propertyValue(item, "execution_condition"),
    sourceRowIds: Array.isArray(item.sourceRowIds)
      ? item.sourceRowIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
  });
  return parsed.ok ? parsed.rule : undefined;
}

function recurrenceLabel(recurrence: AuthoringRecurrenceRule): string {
  if (recurrence.end?.mode === "count") {
    return `${recurrence.raw} · ${recurrence.end.count}회`;
  }
  if (recurrence.end?.mode === "until") {
    return `${recurrence.raw} · ${recurrence.end.date}까지`;
  }
  return `${recurrence.raw} · 종료 없음`;
}

function hasRecurrenceIntent(item: UnknownRecord): boolean {
  if (isRecord(item.recurrence)) return true;
  const raw =
    propertyValue(item, "repeat") ??
    (isRecord(item.schedule) ? stringValue(item.schedule.repeat) : undefined);
  if (!raw) return false;
  return !/^(?:반복\s*)?(?:없음|안\s*함|하지\s*않음|none)$/iu.test(raw.trim());
}

function recurrenceStartDate(item: UnknownRecord): string | undefined {
  if (!isRecord(item.schedule)) return undefined;
  return resolveAuthoringScheduleDate(
    item.schedule as unknown as AuthoringSchedule,
  );
}

function recurrenceIsInvalid(
  document: TextAuthoringDocument,
  item: UnknownRecord,
): boolean {
  if (!hasRecurrenceIntent(item)) return false;
  if (
    itemIssues(document, item).some(
      (issue) => stringValue(issue.type) === "invalid_recurrence",
    )
  )
    return true;
  const recurrence = canonicalRecurrenceRule(item);
  const startDate = recurrenceStartDate(item);
  return (
    !recurrence ||
    !startDate ||
    (recurrence.end?.mode === "until" && recurrence.end.date < startDate)
  );
}

function appendValidation(
  row: AuthoringArtifactRow,
  validation: AuthoringArtifactValidation,
): AuthoringArtifactRow {
  return row.validations.some((entry) => entry.type === validation.type)
    ? row
    : { ...row, validations: [...row.validations, validation] };
}

function recurrenceValidation(row: AuthoringArtifactRow): AuthoringArtifactRow {
  return appendValidation(row, {
    type: "invalid_recurrence",
    label: "반복 입력 확인 필요",
    message: "지원하는 반복 규칙, 시작 날짜, 종료 기준을 확인해 주세요.",
    ...(row.repeat ? { input: row.repeat } : {}),
    expected: "매일, N일마다, 매주 요일, N주마다 요일, 매월 N일",
    blocking: false,
  });
}

function occurrenceRow(
  row: AuthoringArtifactRow,
  recurrence: AuthoringRecurrenceRule,
  occurrenceId: string,
  date: string,
  index: number,
): AuthoringArtifactRow {
  return {
    ...row,
    rowId: occurrenceId,
    occurrenceId,
    occurrenceIndex: index,
    date,
    repeat: recurrence.raw,
    recurrenceSummary: recurrenceLabel(recurrence),
    order: row.order + index / 10_000,
    subchecks: row.subchecks.map((subcheck) => ({ ...subcheck })),
    validations: row.validations.map((validation) => ({ ...validation })),
    experienceRow: {
      ...row.experienceRow,
      id: occurrenceId,
      schedule: {
        ...row.experienceRow.schedule,
        state: "recurring",
        date,
        repeatRule: recurrence.raw,
      },
      resources: row.experienceRow.resources.map((resource) => ({
        ...resource,
      })),
      eligibleShapes: [...row.experienceRow.eligibleShapes],
    },
  };
}

function recurrenceSummary(
  itemId: string,
  recurrence: AuthoringRecurrenceRule,
  visibleCount: number,
  totalCount: number,
  finiteLimit: number,
  openEndedWeeks: number,
): AuthoringRecurrencePreviewSummary {
  if (recurrence.end?.mode === "count") {
    const hasMore = visibleCount < totalCount;
    return {
      itemId,
      label: recurrenceLabel(recurrence),
      mode: "finite_count",
      visibleCount,
      totalCount,
      hasMore,
      ...(hasMore
        ? { nextOccurrenceLimit: Math.min(totalCount, finiteLimit + 30) }
        : {}),
    };
  }
  if (recurrence.end?.mode === "until") {
    const hasMore = visibleCount < totalCount;
    return {
      itemId,
      label: recurrenceLabel(recurrence),
      mode: "finite_until",
      visibleCount,
      totalCount,
      hasMore,
      ...(hasMore
        ? { nextOccurrenceLimit: Math.min(totalCount, finiteLimit + 30) }
        : {}),
    };
  }
  return {
    itemId,
    label: recurrenceLabel(recurrence),
    mode: "open_ended",
    visibleCount,
    visibleWeeks: openEndedWeeks,
    hasMore: true,
    nextPreviewWeeks: openEndedWeeks + 4,
  };
}

function projectRecurrenceRows(
  document: TextAuthoringDocument,
  artifact: AuthoringArtifactKind,
  rows: AuthoringArtifactRow[],
  itemById: Map<string, UnknownRecord>,
  options: BuildAuthoringArtifactProjectionOptions,
): {
  rows: AuthoringArtifactRow[];
  summaries: AuthoringRecurrencePreviewSummary[];
} {
  const finiteLimit = Math.min(
    Math.max(options.finiteOccurrenceLimit ?? options.occurrenceLimit ?? 30, 1),
    10_000,
  );
  const openEndedWeeks = Math.min(
    Math.max(
      options.openEndedOccurrenceWeeks ?? options.recurrencePreviewWeeks ?? 4,
      1,
    ),
    520,
  );
  const summaries: AuthoringRecurrencePreviewSummary[] = [];
  const projected = rows.flatMap((row) => {
    const item = itemById.get(row.itemId);
    if (!item || !hasRecurrenceIntent(item)) return [row];
    if (recurrenceIsInvalid(document, item)) {
      return artifact === "calendar" ? [] : [recurrenceValidation(row)];
    }
    const recurrence = canonicalRecurrenceRule(item) as AuthoringRecurrenceRule;
    const startDate = recurrenceStartDate(item) as string;
    const occurrenceProjection = projectAuthoringRecurrenceDates({
      itemId: row.itemId,
      startDate,
      rule: recurrence,
      limit: finiteLimit,
      openEndedWeeks,
    });
    const occurrences = occurrenceProjection.occurrences;
    summaries.push(
      recurrenceSummary(
        row.itemId,
        recurrence,
        occurrences.length,
        occurrenceProjection.totalCount ?? occurrences.length,
        finiteLimit,
        openEndedWeeks,
      ),
    );
    return occurrences.map((occurrence) =>
      occurrenceRow(
        row,
        recurrence,
        occurrence.occurrenceId,
        occurrence.date,
        occurrence.occurrenceIndex,
      ),
    );
  });
  return { rows: projected, summaries };
}

function canonicalLinkGroup(
  entries: unknown,
  fallback: FlowExperienceProjectionRow["resources"],
): FlowExperienceProjectionRow["resources"] {
  const values = Array.isArray(entries) ? entries.filter(isRecord) : [];
  const links = values.flatMap((entry) => {
    const url = stringValue(entry.url);
    if (!url) return [];
    return [
      {
        label: stringValue(entry.label) ?? url,
        url,
        type: stringValue(entry.type) ?? "link",
        owner: stringValue(entry.owner),
      },
    ];
  });
  const effectiveOwner = [...links]
    .reverse()
    .find((link) => link.owner && link.owner !== "source")?.owner;
  const owned = effectiveOwner
    ? links.filter((link) => link.owner === effectiveOwner)
    : [];
  const sourceOwned = links.filter(
    (link) => !link.owner || link.owner === "source",
  );
  const candidates =
    owned.length > 0
      ? owned
      : sourceOwned.length > 0
        ? sourceOwned
        : links.length > 0
          ? links
          : fallback.map((link) => ({ ...link, owner: undefined }));
  const seen = new Set<string>();
  return candidates
    .filter((link) => {
      const identity = `${link.label}\u0000${link.url}\u0000${link.type}`;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    })
    .map(({ owner: _owner, ...link }) => link);
}

function normalizedArtifact(value: unknown): AuthoringArtifactKind | undefined {
  if (
    value === "calendar" ||
    value === "sheet" ||
    value === "memo" ||
    value === "todo"
  ) {
    return value;
  }
  if (value === "checklist" || value === "internal_check") return "todo";
  return undefined;
}

function dateRange(
  rows: AuthoringArtifactRow[],
): AuthoringArtifactView["dateRange"] {
  const dates = rows
    .map((row) => row.date)
    .filter((date): date is string => Boolean(date))
    .sort();
  if (dates.length === 0) return undefined;
  return {
    start: dates[0],
    end: dates[dates.length - 1],
  };
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function getCanonicalItemMaps(document: TextAuthoringDocument) {
  const items = document.parseResult.canonical
    .items as unknown as UnknownRecord[];
  const steps = document.parseResult.canonical
    .steps as unknown as UnknownRecord[];
  const itemById = new Map(
    items.map((item, index) => [
      stringValue(item.itemId) ?? `authoring-item-${index + 1}`,
      item,
    ]),
  );
  const stepById = new Map(
    steps.map((step, index) => [
      stringValue(step.stepId) ?? `authoring-step-${index + 1}`,
      step,
    ]),
  );
  return { items, itemById, stepById };
}

function makeArtifactRow(
  document: TextAuthoringDocument,
  row: FlowExperienceProjectionRow,
  item: UnknownRecord | undefined,
  stepById: Map<string, UnknownRecord>,
): AuthoringArtifactRow {
  const stepId = item ? stringValue(item.stepId) : undefined;
  const step = stepId ? stepById.get(stepId) : undefined;
  const schedule = item && isRecord(item.schedule) ? item.schedule : undefined;
  const description = item
    ? mergeUniqueDescriptionParts([
        stringValue(item.detail),
        ...unknownPropertyDescription(item),
      ])
    : cleanDescriptionText(row.description);
  const completion = item
    ? (stringValue(item.completion) ??
      (isRecord(item.completion)
        ? (stringValue(item.completion.doneWhen) ??
          stringValue(item.completion.text))
        : undefined))
    : undefined;
  const resources = canonicalLinkGroup(
    item?.resources,
    item ? [] : row.resources,
  );
  const sources = canonicalLinkGroup(item?.sources, []);
  const links = [...resources, ...sources].filter(
    (link, index, values) =>
      values.findIndex(
        (candidate) =>
          candidate.label === link.label &&
          candidate.url === link.url &&
          candidate.type === link.type,
      ) === index,
  );
  const place = propertyValue(item, "place");
  const repeat = schedule
    ? (stringValue(schedule.repeat) ?? propertyValue(item, "repeat"))
    : propertyValue(item, "repeat");
  const condition =
    propertyValue(item, "condition") ??
    propertyValue(item, "execution_condition");
  const subchecks = itemSubchecks(item);
  const validations = itemValidations(document, item);
  return {
    rowId: row.sourceItemId,
    itemId: row.sourceItemId,
    ...(stepId ? { stepId } : {}),
    ...(step && stringValue(step.title)
      ? { stepTitle: stringValue(step.title) }
      : {}),
    title: row.title,
    ...(item && typeof item.sourceChecked === "boolean"
      ? { sourceChecked: item.sourceChecked }
      : {}),
    ...(description ? { description, detail: description } : {}),
    ...(completion ? { completion } : {}),
    ...(row.schedule.date ? { date: row.schedule.date } : {}),
    ...(schedule && stringValue(schedule.time)
      ? { time: stringValue(schedule.time) }
      : {}),
    ...(schedule && stringValue(schedule.timezone)
      ? { timezone: stringValue(schedule.timezone) }
      : {}),
    ...(place ? { place } : {}),
    ...(schedule && typeof schedule.durationMinutes === "number"
      ? { durationMinutes: schedule.durationMinutes }
      : {}),
    ...(repeat ? { repeat } : {}),
    ...(condition ? { condition } : {}),
    subchecks,
    validations,
    order: row.orderRank,
    resources: resources.map((link) => ({ ...link })),
    sources: sources.map((link) => ({ ...link })),
    links: links.map((link) => ({ ...link })),
    ...(row.caution ? { caution: row.caution } : {}),
    experienceRow: {
      ...row,
      schedule: { ...row.schedule },
      resources: row.resources.map((resource) => ({ ...resource })),
      eligibleShapes: [...row.eligibleShapes],
    },
  };
}

type SheetContract = {
  eligible: boolean;
  columns: AuthoringSheetColumn[];
  cellsByRowId: Map<string, Record<string, string>>;
};

const STRUCTURED_SHEET_FIELDS: Array<{
  key: string;
  label: string;
  value: (row: AuthoringArtifactRow) => string | undefined;
  includeWhenAny?: boolean;
}> = [
  { key: "description", label: "설명", value: (row) => row.description },
  { key: "completion", label: "완료 기준", value: (row) => row.completion },
  {
    key: "occurrenceIndex",
    label: "회차",
    value: (row) =>
      row.occurrenceIndex == null ? undefined : `${row.occurrenceIndex}회차`,
    includeWhenAny: true,
  },
  {
    key: "date",
    label: "날짜",
    value: (row) => row.date,
    includeWhenAny: true,
  },
  { key: "time", label: "시간", value: (row) => row.time },
  { key: "timezone", label: "시간대", value: (row) => row.timezone },
  { key: "place", label: "장소", value: (row) => row.place },
  {
    key: "durationMinutes",
    label: "소요 시간(분)",
    value: (row) =>
      row.durationMinutes == null ? undefined : String(row.durationMinutes),
  },
  {
    key: "repeat",
    label: "반복",
    value: (row) => row.recurrenceSummary ?? row.repeat,
    includeWhenAny: true,
  },
  {
    key: "condition",
    label: "실행 조건",
    value: (row) => row.condition,
    includeWhenAny: true,
  },
  {
    key: "subchecks",
    label: "체크리스트",
    value: (row) =>
      row.subchecks.length > 0
        ? row.subchecks
            .map(
              (subcheck) =>
                `${subcheck.sourceChecked ? "☑" : "☐"} ${subcheck.title}`,
            )
            .join("\n")
        : undefined,
    includeWhenAny: true,
  },
  {
    key: "resources",
    label: "자료",
    value: (row) =>
      row.resources.length > 0
        ? row.resources.map((link) => `${link.label}: ${link.url}`).join("\n")
        : undefined,
  },
  {
    key: "sources",
    label: "출처",
    value: (row) =>
      (row.sources?.length ?? 0) > 0
        ? row.sources?.map((link) => `${link.label}: ${link.url}`).join("\n")
        : undefined,
  },
];

function originalTableSheetContract(
  rows: AuthoringArtifactRow[],
  itemById: Map<string, UnknownRecord>,
): SheetContract {
  const columns: AuthoringSheetColumn[] = [];
  const columnKeys = new Set<string>();
  const cellsByRowId = new Map<string, Record<string, string>>();

  for (const row of rows) {
    const cells: Record<string, string> = {};
    for (const property of itemProperties(itemById.get(row.itemId))) {
      const label = stringValue(property.label) ?? stringValue(property.key);
      const value = stringValue(property.value);
      if (!label || !value) continue;
      if (!columnKeys.has(label)) {
        columnKeys.add(label);
        columns.push({ key: label, label });
      }
      cells[label] = value;
    }
    cellsByRowId.set(row.rowId, cells);
  }

  return {
    eligible: rows.length > 0,
    columns,
    cellsByRowId,
  };
}

function structuredSheetContract(rows: AuthoringArtifactRow[]): SheetContract {
  const sharedFields = STRUCTURED_SHEET_FIELDS.filter(
    (field) =>
      rows.filter((row) => Boolean(field.value(row))).length >=
      (field.includeWhenAny ? 1 : 2),
  );
  const eligible =
    (rows.length >= 2 &&
      (sharedFields.length >= 2 ||
        (sharedFields.length >= 1 &&
          (rows.every((row) => Boolean(row.date)) ||
            rows.every((row) => Boolean(row.description)))))) ||
    (rows.length === 1 && Boolean(rows[0].repeat) && sharedFields.length >= 2);
  const columns = eligible
    ? [
        { key: "title", label: "항목" },
        ...sharedFields.map(({ key, label }) => ({ key, label })),
      ]
    : [];
  const cellsByRowId = new Map(
    rows.map((row) => {
      const cells: Record<string, string> = { title: row.title };
      for (const field of sharedFields) {
        const value = field.value(row);
        if (value) cells[field.key] = value;
      }
      return [row.rowId, cells];
    }),
  );
  return { eligible, columns, cellsByRowId };
}

function buildSheetContract(
  document: TextAuthoringDocument,
  rows: AuthoringArtifactRow[],
  itemById: Map<string, UnknownRecord>,
): SheetContract {
  const originalTable =
    document.inputKinds.includes("table") ||
    document.parseResult.canonical.sourceRows.some(
      (row) => row.rowType === "table_row",
    );
  return originalTable
    ? originalTableSheetContract(rows, itemById)
    : structuredSheetContract(rows);
}

function calendarRowOrder(
  left: AuthoringArtifactRow,
  right: AuthoringArtifactRow,
): number {
  const leftTime = left.time?.trim() ?? "";
  const rightTime = right.time?.trim() ?? "";
  return (
    (left.date ?? "").localeCompare(right.date ?? "") ||
    Number(Boolean(leftTime)) - Number(Boolean(rightTime)) ||
    leftTime.localeCompare(rightTime) ||
    left.order - right.order ||
    left.itemId.localeCompare(right.itemId)
  );
}

function lossForMissingArtifactRow(
  artifact: AuthoringArtifactKind,
  itemId: string,
  item: UnknownRecord,
  anchor: string | undefined,
): AuthoringArtifactLoss {
  const schedule = isRecord(item.schedule) ? item.schedule : undefined;
  if (artifact === "calendar") {
    if (!schedule) {
      return {
        lossId: `calendar-undated-${itemId}`,
        artifact,
        reason: "undated_item",
        message: "날짜가 없는 항목은 캘린더 일정에 포함하지 않습니다.",
        itemId,
        sourcePreserved: true,
      };
    }
    if (schedule.kind === "relative" && !anchor) {
      return {
        lossId: `calendar-anchor-${itemId}`,
        artifact,
        reason: "relative_anchor_required",
        message: "상대 날짜는 기준일을 입력한 뒤에만 캘린더 날짜로 계산합니다.",
        itemId,
        sourcePreserved: true,
      };
    }
    return {
      lossId: `calendar-invalid-${itemId}`,
      artifact,
      reason: "invalid_schedule",
      message:
        "일정 원문은 보존했지만 캘린더에서 쓸 날짜로 해석되지 않았습니다.",
      itemId,
      sourcePreserved: true,
    };
  }
  if (artifact === "todo") {
    return {
      lossId: `todo-role-${itemId}`,
      artifact,
      reason: "non_completable_role",
      message:
        "자료·안내·주의는 별도 할 일로 만들지 않고 설명과 텍스트에 보존합니다.",
      itemId,
      sourcePreserved: true,
    };
  }
  return {
    lossId: `sheet-role-${itemId}`,
    artifact,
    reason: "non_row_role",
    message:
      "자료·안내·주의는 별도 표 행으로 만들지 않고 설명과 텍스트에 보존합니다.",
    itemId,
    sourcePreserved: true,
  };
}

function recommendationReason(
  artifact: AuthoringArtifactKind,
  count: number,
  role: "primary" | "secondary",
): string {
  if (artifact === "calendar") {
    return `${count}개 항목에 계산 가능한 날짜가 있어 캘린더 ${role === "primary" ? "결과" : "보조 결과"}로 적합합니다.`;
  }
  if (artifact === "sheet") {
    return `${count}개 항목의 순서와 내용을 행 단위로 유지합니다.`;
  }
  if (artifact === "memo") {
    return `${count}개 항목의 설명·자료·주의를 함께 보존합니다.`;
  }
  return `${count}개 실행 항목을 순서대로 확인할 수 있습니다.`;
}

export function buildAuthoringArtifactProjection(
  document: TextAuthoringDocument,
  options: BuildAuthoringArtifactProjectionOptions = {},
): AuthoringArtifactProjection {
  const anchor = rawAnchorDate(document);
  const adapter = adaptTextAuthoringDocumentToFlowBundle(document, { anchor });
  const experience = buildFlowExperienceProjection(
    adapter.bundle,
    adapter.projectionOptions,
  );
  const { items, itemById, stepById } = getCanonicalItemMaps(document);
  const flow = document.parseResult.canonical.flow as unknown as UnknownRecord;
  const includedItemIds = new Set(
    items.flatMap((item, index) => {
      if (item.included === false) return [];
      return [stringValue(item.itemId) ?? `authoring-item-${index + 1}`];
    }),
  );
  const invalidUrlItemIds = new Set(
    items.flatMap((item, index) => {
      if (item.included === false) return [];
      const itemId = stringValue(item.itemId) ?? `authoring-item-${index + 1}`;
      return itemValidations(document, item).some(
        (validation) => validation.type === "invalid_url",
      )
        ? [itemId]
        : [];
    }),
  );
  const invalidRecurrenceItemIds = new Set(
    items.flatMap((item, index) => {
      const itemId = stringValue(item.itemId) ?? `authoring-item-${index + 1}`;
      return recurrenceIsInvalid(document, item) ? [itemId] : [];
    }),
  );

  const shapeRows: Record<
    AuthoringArtifactKind,
    FlowExperienceProjectionRow[]
  > = {
    calendar: experience.shapes.calendar.rows,
    todo: experience.shapes.checklist.rows,
    sheet: experience.shapes.sheet.rows,
    memo: experience.shapes.memo.rows,
  };
  const artifacts = {} as Record<AuthoringArtifactKind, AuthoringArtifactView>;
  const allLosses: AuthoringArtifactLoss[] = [];

  for (const artifact of Object.keys(
    ARTIFACT_LABELS,
  ) as AuthoringArtifactKind[]) {
    let rows = shapeRows[artifact].map((row) =>
      makeArtifactRow(document, row, itemById.get(row.sourceItemId), stepById),
    );
    const blockedByInvalidUrl =
      artifact !== "memo" && invalidUrlItemIds.size > 0;
    if (blockedByInvalidUrl) rows = [];
    const recurrenceProjection = projectRecurrenceRows(
      document,
      artifact,
      rows,
      itemById,
      options,
    );
    rows = recurrenceProjection.rows;
    if (artifact === "calendar") rows = [...rows].sort(calendarRowOrder);
    const sheetContract =
      artifact === "sheet"
        ? buildSheetContract(document, rows, itemById)
        : undefined;
    if (sheetContract) {
      rows = sheetContract.eligible
        ? rows.map((row) => ({
            ...row,
            sheetCells: {
              ...(sheetContract.cellsByRowId.get(row.rowId) ?? {}),
            },
          }))
        : [];
    }
    const visibleItemIds = new Set(rows.map((row) => row.itemId));
    const losses =
      artifact === "memo"
        ? []
        : blockedByInvalidUrl
          ? [...invalidUrlItemIds].map((itemId) => ({
              lossId: `${artifact}-invalid-url-${itemId}`,
              artifact,
              reason: "invalid_url" as const,
              message:
                "자료·출처 URL을 확인하기 전에는 이 구조 결과와 내보내기를 사용할 수 없습니다.",
              itemId,
              sourcePreserved: true as const,
            }))
          : artifact === "sheet" && sheetContract && !sheetContract.eligible
            ? [
                {
                  lossId: "sheet-insufficient-tabular-structure",
                  artifact,
                  reason: "insufficient_tabular_structure" as const,
                  message:
                    "원본 표이거나 여러 항목이 날짜·설명을 일관되게 가지거나 의미 있는 필드 두 개 이상을 공유할 때만 표·Excel을 사용할 수 있습니다.",
                  sourcePreserved: true as const,
                },
              ]
            : [...includedItemIds].flatMap((itemId) => {
                if (visibleItemIds.has(itemId)) return [];
                const item = itemById.get(itemId);
                if (!item) return [];
                if (
                  artifact === "calendar" &&
                  invalidRecurrenceItemIds.has(itemId)
                ) {
                  return [
                    {
                      lossId: `calendar-invalid-recurrence-${itemId}`,
                      artifact,
                      reason: "invalid_recurrence" as const,
                      message:
                        "반복 규칙, 시작 날짜, 종료 기준을 확인하기 전에는 회차를 계산하지 않습니다.",
                      itemId,
                      sourcePreserved: true as const,
                    },
                  ];
                }
                return [
                  lossForMissingArtifactRow(artifact, itemId, item, anchor),
                ];
              });
    allLosses.push(...losses);
    artifacts[artifact] = {
      artifact,
      label: ARTIFACT_LABELS[artifact],
      eligible: rows.length > 0,
      count: rows.length,
      rows,
      ...(sheetContract ? { sheetColumns: sheetContract.columns } : {}),
      losses,
      recurrenceSummaries: recurrenceProjection.summaries,
      hasMoreOccurrences: recurrenceProjection.summaries.some(
        (summary) => summary.hasMore,
      ),
      ...(dateRange(rows) ? { dateRange: dateRange(rows) } : {}),
    };
  }

  for (const entry of adapter.lossManifest.entries) {
    if (entry.kind === "defaulted_legacy_field") continue;
    for (const artifact of Object.keys(
      ARTIFACT_LABELS,
    ) as AuthoringArtifactKind[]) {
      const loss: AuthoringArtifactLoss = {
        lossId: `compatibility-${artifact}-${entry.lossId}`,
        artifact,
        reason: "compatibility_loss",
        message: entry.message,
        ...(entry.itemId ? { itemId: entry.itemId } : {}),
        sourcePreserved: true,
      };
      artifacts[artifact].losses.push(loss);
      allLosses.push(loss);
    }
  }

  const requestedPrimary =
    options.primaryArtifact ??
    normalizedArtifact(flow.primaryArtifact) ??
    "todo";
  const primaryArtifact = artifacts[requestedPrimary].eligible
    ? requestedPrimary
    : ((["todo", "sheet", "memo", "calendar"] as AuthoringArtifactKind[]).find(
        (artifact) => artifacts[artifact].eligible,
      ) ?? requestedPrimary);

  const canonicalSecondary = Array.isArray(flow.secondaryArtifacts)
    ? flow.secondaryArtifacts.flatMap((artifact) => {
        const normalized = normalizedArtifact(artifact);
        return normalized ? [normalized] : [];
      })
    : [];
  const preferredSecondary = options.secondaryArtifacts ?? canonicalSecondary;
  const requestedSecondary = preferredSecondary.filter(
    (artifact, index, entries) =>
      artifact !== primaryArtifact &&
      entries.indexOf(artifact) === index &&
      artifacts[artifact].eligible,
  );
  const fallbackSecondary = SECONDARY_ORDER[primaryArtifact].filter(
    (artifact) =>
      artifacts[artifact].eligible && !requestedSecondary.includes(artifact),
  );
  const secondaryArtifacts = [
    ...requestedSecondary,
    ...fallbackSecondary,
  ].slice(0, 2);
  const recommendations: AuthoringArtifactRecommendation[] = [
    {
      artifact: primaryArtifact,
      role: "primary",
      count: artifacts[primaryArtifact].count,
      reason: recommendationReason(
        primaryArtifact,
        artifacts[primaryArtifact].count,
        "primary",
      ),
    },
    ...secondaryArtifacts.map((artifact): AuthoringArtifactRecommendation => ({
      artifact,
      role: "secondary",
      count: artifacts[artifact].count,
      reason: recommendationReason(
        artifact,
        artifacts[artifact].count,
        "secondary",
      ),
    })),
  ];

  const includedRows = experience.outlineRows;
  const dated = includedRows.filter(
    (row) => row.schedule.state !== "unscheduled",
  ).length;
  return {
    documentId: document.documentId,
    title: stringValue(flow.title) ?? "제목 없는 Flow",
    primaryArtifact,
    secondaryArtifacts,
    recommendations,
    artifacts,
    counts: {
      interpreted: items.length,
      included: includedRows.length,
      excluded: experience.excludedRows.length,
      dated,
      undated: includedRows.length - dated,
    },
    lossManifest: {
      entries: allLosses,
      lossCount: allLosses.length,
      sourcePreserved: true,
      adapter: adapter.lossManifest,
    },
    flowExperienceProjection: experience,
    sourceMutationCount: 0,
  };
}

function scopedRows(
  projection: AuthoringArtifactProjection,
  options: BuildArtifactPreflightOptions,
): {
  sourceItemIds: Set<string>;
  rows: AuthoringArtifactRow[];
} {
  const scope = options.scope ?? "whole";
  const includedRows = projection.flowExperienceProjection.outlineRows;
  let sourceItemIds: Set<string>;
  if (scope === "selected") {
    sourceItemIds = new Set(options.selectedItemIds ?? []);
  } else if (scope === "current_step") {
    const stepId = options.currentStepId;
    sourceItemIds = new Set(
      projection.artifacts.memo.rows
        .filter((row) => row.stepId === stepId)
        .map((row) => row.itemId),
    );
  } else {
    sourceItemIds = new Set(includedRows.map((row) => row.sourceItemId));
  }
  return {
    sourceItemIds,
    rows: projection.artifacts[options.artifact].rows.filter((row) =>
      sourceItemIds.has(row.itemId),
    ),
  };
}

export function buildArtifactPreflight(
  projection: AuthoringArtifactProjection,
  options: BuildArtifactPreflightOptions,
): AuthoringArtifactPreflight {
  const scope = options.scope ?? "whole";
  const { sourceItemIds, rows } = scopedRows(projection, options);
  const itemIds = rows.map((row) => row.itemId);
  const losses = projection.artifacts[options.artifact].losses.filter(
    (loss) => !loss.itemId || sourceItemIds.has(loss.itemId),
  );
  const range = dateRange(rows);
  const identity = [
    projection.documentId,
    options.artifact,
    scope,
    [...sourceItemIds].sort().join(","),
    itemIds.join(","),
  ].join("|");
  const formats = AUTHORING_ARTIFACT_FORMATS[options.artifact].filter(
    (format) =>
      !(
        options.artifact === "memo" &&
        scope !== "whole" &&
        format === "raw_source"
      ),
  );
  return {
    preflightId: `preflight-${stableHash(identity)}`,
    documentId: projection.documentId,
    artifact: options.artifact,
    scope,
    eligible: rows.length > 0,
    formats,
    sourceItemCount: sourceItemIds.size,
    count: rows.length,
    omittedCount: Math.max(0, sourceItemIds.size - rows.length),
    itemIds,
    firstItems: rows.slice(0, 3).map((row) => row.title),
    ...(range ? { dateRange: range } : {}),
    losses,
    lossCount: losses.length,
    sourcePreserved: true,
  };
}
