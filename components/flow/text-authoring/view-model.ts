import type {
  AuthoringArtifactKind,
  AuthoringArtifactPreflight,
} from "@/lib/flow/text-authoring/artifact-projection";
import type { TextAuthoringSaveReceipt } from "@/lib/flow/text-authoring/receipt";
import type { TextAuthoringDraftRecord } from "@/lib/flow/text-authoring/storage";
import type {
  AuthoringInputKind,
  AuthoringIssueOutcome,
  AuthoringProperty,
  CanonicalAuthoringItem,
  TextAuthoringDocument,
  UnresolvedAuthoringIssue,
} from "@/lib/flow/text-authoring/types";
import {
  allowedAuthoringIssueOutcomes,
  authoringIssueState,
  isAuthoringIssueOutstanding,
} from "@/lib/flow/text-authoring/issue-state";

import type {
  AuthoringCounts,
  AuthoringDraftStatus,
  AuthoringDraftView,
  AuthoringIssueView,
  AuthoringItemView,
  AuthoringPreflightView,
  AuthoringReceiptView,
  AuthoringRole,
  AuthoringStepView,
} from "./authoring-ui-types";

const INPUT_KIND_LABEL: Record<AuthoringInputKind, string> = {
  plain_text: "일반 메모",
  markdown: "Markdown",
  table: "표",
  url: "URL",
  mixed: "혼합 입력",
};

const ARTIFACT_LABEL: Record<AuthoringArtifactKind, string> = {
  calendar: "캘린더",
  todo: "할 일",
  sheet: "표·Excel",
  memo: "TXT",
};

const DRAFT_STATUS_LABEL: Record<
  TextAuthoringDraftRecord["status"],
  AuthoringDraftStatus
> = {
  draft: "작성 중",
  needs_review: "확인 필요",
  previewed: "결과 확인 완료",
  ready: "준비 완료",
  archived: "보관됨",
};

function propertyValue(properties: AuthoringProperty[], key: string): string {
  return (
    [...properties].reverse().find((property) => property.key === key)?.value ??
    ""
  );
}

function roleForItem(item: CanonicalAuthoringItem): AuthoringRole {
  return item.role;
}

function sourceLineLabel(
  document: TextAuthoringDocument,
  sourceRowIds: string[],
): string {
  const lines = document.parseResult.canonical.sourceRows
    .filter((row) => sourceRowIds.includes(row.sourceRowId))
    .flatMap((row) => [row.sourceRange.startLine, row.sourceRange.endLine]);
  if (lines.length === 0) return "원문 연결";
  const start = Math.min(...lines);
  const end = Math.max(...lines);
  return start === end ? `원문 ${start}행` : `원문 ${start}~${end}행`;
}

function rawTextForItem(
  document: TextAuthoringDocument,
  sourceRowIds: string[],
): string {
  return document.parseResult.canonical.sourceRows
    .filter((row) => sourceRowIds.includes(row.sourceRowId))
    .sort((left, right) => left.order - right.order)
    .map((row) => row.rawText)
    .join("\n");
}

function rawTextForIssue(
  document: TextAuthoringDocument,
  issue: UnresolvedAuthoringIssue,
): string {
  return document.parseResult.canonical.sourceRows
    .filter((row) => issue.sourceRowIds.includes(row.sourceRowId))
    .sort((left, right) => left.order - right.order)
    .map((row) => row.rawText)
    .join("\n");
}

function itemPropertySourceValue(
  document: TextAuthoringDocument,
  item: CanonicalAuthoringItem,
  labels: string[],
): string {
  return document.parseResult.canonical.sourceRows
    .filter(
      (row) =>
        item.sourceRowIds.includes(row.sourceRowId) &&
        row.state !== "tombstone",
    )
    .sort((left, right) => left.order - right.order)
    .flatMap((row) => {
      const match = /^ {2}- ([^:：]+)[:：]\s*(.*)$/u.exec(row.rawText);
      return match && labels.includes(match[1].trim()) ? [match[2].trim()] : [];
    })
    .join("\n");
}

const INSPECTOR_STRUCTURAL_PROPERTY_KEYS = new Set([
  "date",
  "relative_date",
  "time",
  "timezone",
  "place",
  "duration",
  "repeat",
  "repeat_end",
  "condition",
  "resource",
  "source",
]);

function inspectorDetail(
  document: TextAuthoringDocument,
  item: CanonicalAuthoringItem,
): string {
  if (!item.detail) return "";
  const preservedPropertyLines = new Set<string>();
  for (const property of item.properties) {
    if (INSPECTOR_STRUCTURAL_PROPERTY_KEYS.has(property.key)) continue;
    preservedPropertyLines.add(`${property.label}: ${property.value}`.trim());
  }
  for (const row of document.parseResult.canonical.sourceRows) {
    if (
      row.rowType !== "property" ||
      !item.sourceRowIds.includes(row.sourceRowId)
    ) {
      continue;
    }
    const normalized = row.rawText
      .trim()
      .replace(/^[-*+]\s+/u, "")
      .trim();
    if (/^[^:：]{1,32}[:：]\s*.*$/u.test(normalized)) {
      preservedPropertyLines.add(normalized);
    }
  }
  return item.detail
    .split(/\r?\n/u)
    .filter((line) => !preservedPropertyLines.has(line.trim()))
    .join("\n")
    .trim();
}

function issueReason(issue: UnresolvedAuthoringIssue): string {
  const reasons: Partial<Record<UnresolvedAuthoringIssue["type"], string>> = {
    ambiguous_role: "할 일인지 설명인지 판단하지 못했어요.",
    unsupported_syntax: "이 문법을 자동으로 구조화하지 못했어요.",
    unknown_property: "지원하는 속성 이름인지 확인해 주세요.",
    unsupported_nested_item:
      "한 단계보다 깊은 하위 체크는 아직 지원하지 않아요.",
    missing_parent: "어느 항목에 이어지는 문장인지 확인이 필요해요.",
    invalid_date: "날짜는 YYYY-MM-DD 형식으로 입력해 주세요.",
    invalid_url:
      "자료나 출처 링크는 https:// 주소나 Markdown 링크 형식으로 입력해 주세요.",
    invalid_recurrence: "반복 규칙과 종료 조건을 확인해 주세요.",
    source_import_required: "링크 본문이 없어 원문을 가져와야 해요.",
    rights_review_required: "공개 전에 원문 사용 권리를 확인해야 해요.",
    safety_review_required: "공개 전에 안전 관련 근거를 확인해야 해요.",
  };
  return reasons[issue.type] ?? "이 문장을 자동으로 분류하지 못했어요.";
}

function issueExpectedInput(issue: UnresolvedAuthoringIssue): string {
  if (issue.expectedFormat) return issue.expectedFormat;
  const expected: Partial<Record<UnresolvedAuthoringIssue["type"], string>> = {
    ambiguous_role: "일반 문장은 TXT로 두고, 할 일이면 - [ ] 제목으로 시작",
    unsupported_syntax: "할 일은 - [ ] 제목, 속성은 두 칸 들여쓴 - 속성: 값",
    unknown_property: "정의된 속성명을 쓰거나 일반 설명 문장으로 입력",
    unsupported_nested_item:
      "하위 확인은 부모 할 일 바로 아래에 두 칸 들여쓴 - [ ] 제목",
    missing_parent: "먼저 - [ ] 부모 할 일을 입력한 뒤 하위 확인을 추가",
    invalid_date: "YYYY-MM-DD",
    invalid_url: "https://로 시작하는 링크 1개",
    invalid_recurrence: "예: 매주 월요일 + 반복 종료: 3회",
    source_import_required: "URL과 함께 확인할 원문을 입력",
    rights_review_required: "공개 전 출처와 사용 범위를 확인",
    safety_review_required: "공개 전 주의 근거와 중단 조건을 확인",
  };
  return expected[issue.type] ?? "원문 형식을 다시 확인";
}

function issueBlockedResult(issue: UnresolvedAuthoringIssue): string {
  const impact: Partial<Record<UnresolvedAuthoringIssue["type"], string>> = {
    ambiguous_role: "할 일·캘린더·표 포함 여부를 정할 수 없음",
    unsupported_syntax: "할 일·캘린더·표 결과를 만들 수 없음",
    unknown_property: "해당 속성을 결과에 표시할 수 없음",
    unsupported_nested_item: "하위 확인 항목을 할 일에 연결할 수 없음",
    missing_parent: "하위 확인 항목을 할 일에 연결할 수 없음",
    invalid_date: "해당 항목을 캘린더에 표시할 수 없음",
    invalid_url: "해당 링크를 결과에서 열 수 없음",
    invalid_recurrence: "반복 회차를 만들 수 없음",
    source_import_required: "URL 원문을 결과로 만들 수 없음",
    rights_review_required: "공개 준비를 완료할 수 없음",
    safety_review_required: "공개 준비를 완료할 수 없음",
  };
  return impact[issue.type] ?? "해당 내용을 결과에 반영할 수 없음";
}

function issueSortRank(
  state: "open" | "held",
  outcomes: AuthoringIssueOutcome[],
): number {
  if (state === "held") return 2;
  return outcomes.length > 0 ? 0 : 1;
}

function blockIdForItem(
  document: TextAuthoringDocument,
  itemId: string,
): string {
  return (
    document.parseResult.mappings.find(
      (mapping) =>
        mapping.targetKind === "item" && mapping.targetDraftId === itemId,
    )?.blockIds[0] ?? itemId
  );
}

export function toAuthoringItemView(
  document: TextAuthoringDocument,
  item: CanonicalAuthoringItem,
): AuthoringItemView {
  const schedule = item.schedule;
  const duration =
    schedule?.durationMinutes != null
      ? `${schedule.durationMinutes}분`
      : propertyValue(item.properties, "duration");
  return {
    itemId: item.itemId,
    blockId: blockIdForItem(document, item.itemId),
    stepId: item.stepId,
    title: item.title,
    rawText: rawTextForItem(document, item.sourceRowIds),
    sourceLineLabel: sourceLineLabel(document, item.sourceRowIds),
    role: roleForItem(item),
    included: item.included,
    detail: inspectorDetail(document, item),
    completion: item.completion?.doneWhen ?? "",
    date:
      schedule?.kind === "absolute"
        ? schedule.date
        : propertyValue(item.properties, "date"),
    relativeDate:
      schedule?.kind === "relative"
        ? schedule.raw
        : propertyValue(item.properties, "relative_date"),
    time: schedule?.time ?? propertyValue(item.properties, "time"),
    timezone: schedule?.timezone ?? propertyValue(item.properties, "timezone"),
    place: propertyValue(item.properties, "place"),
    duration,
    repeat: schedule?.repeat ?? propertyValue(item.properties, "repeat"),
    repeatEnd: propertyValue(item.properties, "repeat_end"),
    condition: propertyValue(item.properties, "condition"),
    resource:
      itemPropertySourceValue(document, item, ["자료"]) ||
      propertyValue(item.properties, "resource") ||
      item.resources
        .map((resource) => resource.url || resource.label)
        .join(", "),
    source:
      itemPropertySourceValue(document, item, ["출처"]) ||
      propertyValue(item.properties, "source") ||
      item.sources.map((source) => source.url || source.label).join(", "),
    guide:
      itemPropertySourceValue(document, item, ["안내", "가이드"]) ||
      item.guides.join("\n"),
    caution:
      itemPropertySourceValue(document, item, ["주의", "경고"]) ||
      item.cautions.join("\n"),
    userCorrected:
      Boolean(
        item.creatorTitle ||
        item.creatorDetail ||
        Object.keys(item.titleOverrides ?? {}).length ||
        Object.keys(item.detailOverrides ?? {}).length ||
        Object.keys(item.completionOverrides ?? {}).length ||
        Object.keys(item.scheduleOverrides ?? {}).length,
      ) ||
      item.properties.some((property) => property.owner !== "source") ||
      Boolean(item.completion && item.completion.owner !== "source") ||
      document.parseResult.mappings.some(
        (mapping) =>
          mapping.targetDraftId === item.itemId && mapping.userCorrected,
      ),
  };
}

export function buildAuthoringOutlineView(
  document: TextAuthoringDocument | null,
): {
  steps: AuthoringStepView[];
  items: AuthoringItemView[];
  counts: AuthoringCounts;
  issues: AuthoringIssueView[];
} {
  if (!document) {
    return {
      steps: [],
      items: [],
      counts: {
        steps: 0,
        items: 0,
        included: 0,
        unresolved: 0,
        resources: 0,
      },
      issues: [],
    };
  }
  const canonical = document.parseResult.canonical;
  const items = canonical.items
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((item) => toAuthoringItemView(document, item));
  const steps = canonical.steps
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((step) => ({
      stepId: step.stepId,
      title: step.title,
      items: step.itemIds
        .map((itemId) => items.find((item) => item.itemId === itemId))
        .filter((item): item is AuthoringItemView => Boolean(item)),
    }));
  const mappedItemIds = new Set(
    steps.flatMap((step) => step.items.map((item) => item.itemId)),
  );
  const ungrouped = items.filter((item) => !mappedItemIds.has(item.itemId));
  if (ungrouped.length > 0) {
    steps.push({
      stepId: "ungrouped",
      title: "분류되지 않은 항목",
      items: ungrouped,
    });
  }
  const unresolvedIssues = document.parseResult.issues.filter(
    isAuthoringIssueOutstanding,
  );
  const issues = unresolvedIssues
    .map((issue): AuthoringIssueView => {
      const state = authoringIssueState(issue);
      const availableOutcomes = allowedAuthoringIssueOutcomes(issue);
      return {
        issueId: issue.issueId,
        type: issue.type,
        sourceLineLabel: sourceLineLabel(document, issue.sourceRowIds),
        rawText: rawTextForIssue(document, issue),
        reason: issueReason(issue),
        expectedInput: issueExpectedInput(issue),
        blockedResult: issueBlockedResult(issue),
        sourceRowIds: [...issue.sourceRowIds],
        ...(issue.itemId ? { itemId: issue.itemId } : {}),
        state: state === "held" ? "held" : "open",
        blocking: issue.blocking,
        availableOutcomes,
      };
    })
    .sort(
      (left, right) =>
        issueSortRank(left.state, left.availableOutcomes) -
        issueSortRank(right.state, right.availableOutcomes),
    );
  return {
    steps,
    items,
    counts: {
      steps: steps.length,
      items: items.length,
      included: items.filter(
        (item) => item.included && ["item", "completion"].includes(item.role),
      ).length,
      unresolved: unresolvedIssues.length,
      resources: items.filter((item) => item.role === "resource").length,
    },
    issues,
  };
}

export function inputKindLabels(
  document: TextAuthoringDocument | null,
): string[] {
  return document?.inputKinds.map((kind) => INPUT_KIND_LABEL[kind]) ?? [];
}

export function inputKindSummary(
  document: TextAuthoringDocument | null,
): string {
  if (!document) return "입력 전";
  return document.inputKinds.map((kind) => INPUT_KIND_LABEL[kind]).join(" + ");
}

export function normalizeArtifactKind(
  value: string | undefined,
): AuthoringArtifactKind {
  if (value === "calendar" || value === "sheet" || value === "memo")
    return value;
  return "todo";
}

export function toPreflightView(
  preflight: AuthoringArtifactPreflight | null,
): AuthoringPreflightView | null {
  if (!preflight) return null;
  return {
    artifact: ARTIFACT_LABEL[preflight.artifact],
    eligibleCount: preflight.count,
    excludedCount: preflight.omittedCount,
    undatedCount: preflight.losses.filter(
      (loss) => loss.reason === "undated_item",
    ).length,
    loss: preflight.losses.map((loss) => loss.message),
    dateRange: preflight.dateRange
      ? `${preflight.dateRange.start} ~ ${preflight.dateRange.end}`
      : "확정 날짜 없음",
  };
}

export function toDraftView(
  summary: TextAuthoringDraftRecord,
): AuthoringDraftView {
  const source =
    summary.document.sourceTitle ||
    summary.document.sourceUrl ||
    summary.document.rawText.split(/\r?\n/u).find(Boolean) ||
    "출처 이름 없음";
  return {
    draftId: summary.draftId,
    title: summary.title,
    source,
    ownership: summary.ownership,
    primaryArtifact: summary.primaryArtifact
      ? ARTIFACT_LABEL[normalizeArtifactKind(summary.primaryArtifact)]
      : ARTIFACT_LABEL[
          normalizeArtifactKind(
            summary.document.parseResult.canonical.flow.primaryArtifact,
          )
        ],
    stepCount: summary.document.parseResult.canonical.steps.length,
    itemCount: summary.document.parseResult.canonical.items.length,
    issueCount: summary.document.parseResult.issues.filter(
      isAuthoringIssueOutstanding,
    ).length,
    revisionLabel: summary.revisionId,
    updatedAtLabel: formatKoreanDateTime(summary.updatedAt),
    lastSavedAtLabel: formatKoreanDateTime(summary.lastSavedAt),
    archived: summary.status === "archived",
    status: DRAFT_STATUS_LABEL[summary.status],
  };
}

export function toSaveReceiptView(
  receipt: TextAuthoringSaveReceipt,
): AuthoringReceiptView {
  return {
    receiptId: receipt.receiptId,
    title: receipt.title,
    ownership: receipt.ownership,
    ownershipLabel:
      receipt.ownership === "creator"
        ? "제작자 초안"
        : receipt.ownership === "suggestion"
          ? "수정 제안"
          : "개인 초안",
    revisionLabel: receipt.revisionId,
    artifact: ARTIFACT_LABEL[receipt.artifact],
    stepCount: receipt.stepCount,
    itemCount: receipt.itemCount,
    sourcePreserved: receipt.sourcePreserved,
    reviewRequiredCount: receipt.reviewState.requiredGateIds.length,
    reviewEvidenceCount: receipt.reviewState.evidenceRecordedGateIds.length,
    reviewPersonalOnlyCount: receipt.reviewState.personalOnlyGateIds.length,
    sourceState: receipt.sourceState.status,
    sourceOpenChangeCount: receipt.sourceState.openChangeCount,
    savedAtLabel: formatKoreanDateTime(receipt.savedAt),
  };
}

export function formatKoreanDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
