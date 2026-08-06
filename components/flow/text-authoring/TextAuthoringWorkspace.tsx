"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from "@/components/flow/flow-ui";
import { buildXlsxBuffer } from "@/lib/flow/export";
import {
  buildArtifactPreflight,
  buildAuthoringArtifactProjection,
  type AuthoringArtifactKind,
  type AuthoringArtifactPreflight,
  type AuthoringArtifactScope,
} from "@/lib/flow/text-authoring/artifact-projection";
import {
  buildAuthoringSheetExportTable,
  serializeAuthoringIcs,
  serializeAuthoringPlainText,
} from "@/lib/flow/text-authoring/file-export";
import {
  extractMarkdownFlowTitle,
  replaceMarkdownFlowTitle,
} from "@/lib/flow/text-authoring/authoring-grammar";
import {
  checkMarkdownRoundTrip,
  exportTextAuthoringMarkdown,
} from "@/lib/flow/text-authoring/markdown-roundtrip";
import { applyAuthoringOperation } from "@/lib/flow/text-authoring/operations";
import { createTextAuthoringDocument } from "@/lib/flow/text-authoring/parser";
import {
  deriveAuthoringLifecycleStatus,
  evaluateAuthoringWritePolicy,
  forkAuthoringDocumentToPersonal,
} from "@/lib/flow/text-authoring/review-policy";
import {
  assertPreflightReceiptParity,
  createExportReceipt,
  createSaveReceipt,
} from "@/lib/flow/text-authoring/receipt";
import {
  createAuthoringSourceUpdateCandidate,
} from "@/lib/flow/text-authoring/source-update";
import {
  TextAuthoringStorageWriteError,
  createTextAuthoringDraftRepository,
  getDefaultTextAuthoringStorage,
  type TextAuthoringDraftHistoryEntry,
  type TextAuthoringDraftRecord,
  type TextAuthoringDraftRepository,
  type TextAuthoringRecoveryRecord,
} from "@/lib/flow/text-authoring/storage";
import type {
  AuthoringCorrectionOperation,
  AuthoringIssueOutcome,
  AuthoringReviewGateStatus,
  AuthoringReviewRequirement,
  AuthoringSourceUpdateResolution,
  CanonicalAuthoringItem,
  TextAuthoringDocument,
  TextAuthoringOwnership,
} from "@/lib/flow/text-authoring/types";

import {
  AuthoringExampleSwitcher,
  AuthoringStageNavigation,
  AuthoringWorkspaceHeader,
  RecoveryBanner,
} from "./AuthoringChrome";
import { AuthoringDialog } from "./AuthoringDialog";
import { AuthoringReviewDialog } from "./AuthoringReviewDialog";
import {
  ExportPreflightDialog,
  HistoryDialog,
  ResetAuthoringDialog,
  RoundTripDialog,
  SaveReceiptDialog,
  type AuthoringExportReceiptView,
  type AuthoringRoundTripView,
} from "./AuthoringOverlays";
import { DraftLibrary, type AuthoringLibraryFilter } from "./DraftLibrary";
import { InputPane } from "./InputPane";
import { ItemInspector } from "./ItemInspector";
import { ResultPane } from "./ResultPane";
import { SourceUpdateDialog } from "./SourceUpdateDialog";
import { StructurePane } from "./StructurePane";
import type {
  AuthoringItemPatch,
  PersistedAuthoringStage,
  AuthoringRole,
  AuthoringStage,
} from "./authoring-ui-types";
import {
  SIMPLE_TEXT_AUTHORING_EXAMPLE,
  TEXT_AUTHORING_EXAMPLES,
  VALIDATED_TEXT_AUTHORING_EXAMPLES,
  type TextAuthoringExample,
} from "./examples";
import {
  buildAuthoringOutlineView,
  formatKoreanDateTime,
  normalizeArtifactKind,
  toDraftView,
  toSaveReceiptView,
} from "./view-model";

const ARTIFACT_LABEL: Record<AuthoringArtifactKind, string> = {
  calendar: "캘린더",
  todo: "체크/할 일",
  sheet: "표/엑셀",
  memo: "텍스트",
};

const ROLE_VALUES: CanonicalAuthoringItem["role"][] = [
  "item",
  "resource",
  "guide",
  "caution",
  "completion",
];

let fallbackDraftSequence = 0;

function createLocalDraftId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return `draft-${randomUuid}`;
  fallbackDraftSequence += 1;
  return `draft-${Date.now().toString(36)}-${fallbackDraftSequence.toString(36)}`;
}

function isWebUrl(value: string): boolean {
  return /^https?:\/\/\S+$/iu.test(value.trim());
}

const AUTHORING_ANCHOR_LINE_PATTERN =
  /^\s*(?:-\s+)?기준일\s*:\s*(\d{4}-\d{2}-\d{2})\s*$/u;

function sourceAnchorDate(rawText: string): string {
  for (const line of rawText.split(/\r?\n/u)) {
    const match = AUTHORING_ANCHOR_LINE_PATTERN.exec(line);
    if (match) return match[1];
  }
  return "";
}

function writeSourceAnchorDate(rawText: string, date: string): string {
  const newline = rawText.includes("\r\n") ? "\r\n" : "\n";
  const lines = rawText.split(/\r?\n/u);
  const existingIndex = lines.findIndex((line) =>
    /^\s*(?:-\s+)?기준일\s*:/u.test(line),
  );
  if (!date) {
    if (existingIndex < 0) return rawText;
    lines.splice(existingIndex, 1);
    if (lines[existingIndex] === "" && lines[existingIndex - 1] === "") {
      lines.splice(existingIndex, 1);
    }
    return lines.join(newline);
  }
  const canonicalLine = `- 기준일: ${date}`;
  if (existingIndex >= 0) {
    lines[existingIndex] = canonicalLine;
    return lines.join(newline);
  }
  const titleIndex = lines.findIndex((line) => /^\s*#(?!#)\s+/u.test(line));
  const insertAt = titleIndex >= 0 ? titleIndex + 1 : 0;
  lines.splice(insertAt, 0, canonicalLine);
  return lines.join(newline);
}

function explicitReviewRequirements(
  ownership: TextAuthoringOwnership,
  source: string,
  rawText: string,
): AuthoringReviewRequirement[] {
  const requirements: AuthoringReviewRequirement[] = [];
  const trimmedSource = source.trim();
  if (ownership !== "personal") {
    requirements.push({
      kind: "rights",
      reasonKey: !trimmedSource
        ? "authoring.review.rights.source_unspecified"
        : isWebUrl(trimmedSource)
          ? "authoring.review.rights.source_url"
          : "authoring.review.rights.source_title",
    });
  }
  const hasExplicitSafetyBoundary =
    /^\s*(?:주의|중단\s*조건|caution)\s*:/imu.test(rawText);
  if (ownership !== "personal" || hasExplicitSafetyBoundary) {
    requirements.push({
      kind: "safety",
      reasonKey: hasExplicitSafetyBoundary
        ? "authoring.review.safety.explicit_caution"
        : "authoring.review.safety.outward_use",
    });
  }
  return requirements;
}

function withUiState(
  document: TextAuthoringDocument,
  stage: AuthoringStage,
  selectedItemId: string | null,
  title: string,
  ownership: TextAuthoringOwnership,
): TextAuthoringDocument {
  const effectiveTitle =
    extractMarkdownFlowTitle(document.rawText) ||
    title.trim() ||
    document.title ||
    document.parseResult.canonical.flow.title;
  return {
    ...document,
    title: effectiveTitle,
    ownership,
    parseResult: {
      ...document.parseResult,
      canonical: {
        ...document.parseResult.canonical,
        flow: {
          ...document.parseResult.canonical.flow,
          title: effectiveTitle,
        },
      },
    },
    uiState: {
      stage,
      ...(selectedItemId ? { selectedItemId } : {}),
      focusTarget: selectedItemId ? `item:${selectedItemId}` : "source",
    },
  };
}

const DEFAULT_EXAMPLE_TIMESTAMP = "2026-07-29T00:00:00.000Z";

function createExampleDocument(
  example: TextAuthoringExample,
  ownership: TextAuthoringOwnership,
  stage: AuthoringStage,
  now?: string,
): TextAuthoringDocument {
  const exampleOwnership = example.ownership ?? ownership;
  const exampleRawText = example.previewAnchor
    ? writeSourceAnchorDate(example.rawText, example.previewAnchor)
    : example.rawText;
  const sourceUrl =
    example.sourceUrl ??
    (isWebUrl(example.source) ? example.source : undefined);
  const sourceTitle =
    example.sourceTitle ??
    (!sourceUrl && example.source ? example.source : undefined);
  const document = createTextAuthoringDocument(exampleRawText, {
    fixtureVersion: `text-authoring-example-${example.scenarioId ?? example.id}-v4`,
    ownership: exampleOwnership,
    title: example.title,
    reviewRequirements: explicitReviewRequirements(
      exampleOwnership,
      example.source,
      exampleRawText,
    ),
    ...(sourceTitle ? { sourceTitle } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(now ? { now } : {}),
  });
  const selectedItemId =
    document.parseResult.canonical.items[0]?.itemId ?? null;
  return withUiState(
    document,
    stage,
    selectedItemId,
    example.title,
    exampleOwnership,
  );
}

const DEFAULT_EXAMPLE_DOCUMENT = createExampleDocument(
  SIMPLE_TEXT_AUTHORING_EXAMPLE,
  "personal",
  "input",
  DEFAULT_EXAMPLE_TIMESTAMP,
);
const DEFAULT_EXAMPLE_ITEM_ID =
  DEFAULT_EXAMPLE_DOCUMENT.parseResult.canonical.items[0]?.itemId ?? null;

type SplitBoundary = {
  at: number;
  left: string;
  right: string;
};

type PendingCorrection =
  | {
      type: "merge";
      firstItemId: string;
      firstTitle: string;
      secondItemId: string;
      secondTitle: string;
    }
  | {
      type: "split";
      itemId: string;
      title: string;
      boundaries: SplitBoundary[];
      at: number;
    }
  | {
      type: "align";
      orderedItemIds: string[];
      beforeTitles: string[];
      afterTitles: string[];
    };

function splitBoundaries(value: string): SplitBoundary[] {
  const positions = new Set<number>();
  for (const match of value.matchAll(/\s+/gu)) {
    if (match.index == null) continue;
    positions.add(match.index + match[0].length);
  }
  return [...positions]
    .sort((left, right) => left - right)
    .map((at) => ({
      at,
      left: value.slice(0, at).trim(),
      right: value.slice(at).trim(),
    }))
    .filter((boundary) => boundary.left && boundary.right);
}

function safeFileName(value: string): string {
  return (
    value
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "-")
      .replace(/\s+/gu, "-")
      .slice(0, 80) || "flowme-authoring"
  );
}

function csvCell(value: string, separator: "," | "\t"): string {
  if (separator === "\t")
    return value.replace(/\t/gu, " ").replace(/\r?\n/gu, " ");
  return `"${value.replace(/"/gu, '""')}"`;
}

function downloadFile(name: string, content: BlobPart, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = name;
  window.document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function savedDraftStatus(
  ownership: TextAuthoringOwnership,
  reviewCount = 0,
): string {
  const reviewSuffix =
    reviewCount > 0
      ? ` 권리·안전 확인 ${reviewCount}개는 남아 있어 외부 파일은 만들지 않았습니다.`
      : "";
  if (ownership === "personal") {
    return `개인 초안을 이 기기에 저장했습니다.${reviewSuffix}`;
  }
  if (ownership === "suggestion") {
    return `수정 제안 초안을 이 기기에 저장했습니다. 아직 전송하지 않았습니다.${reviewSuffix}`;
  }
  return `제작자 초안을 이 기기에 저장했습니다.${reviewSuffix}`;
}

function storageWriteFailureMessage(
  action: string,
  error: unknown,
): string {
  const detail = error instanceof Error
    ? `${error.name} ${error.message}`
    : String(error);
  const reason = /quota|exceed|storage.*full/iu.test(detail)
    ? "브라우저 저장 공간이 부족합니다."
    : "브라우저 저장소에 쓰지 못했습니다.";
  const savedValueStatus =
    error instanceof TextAuthoringStorageWriteError
      ? error.previousValuePreserved
        ? "기존 저장본은 보존했습니다."
        : "기존 저장본의 보존 여부는 확인하지 못했습니다."
      : "";
  return `${action}하지 못했습니다. ${reason} ${savedValueStatus} 원문과 현재 화면은 그대로 유지합니다.`;
}

function isUnsupportedSourceSemanticError(error: unknown): boolean {
  return error instanceof Error
    && /unsupported semantic changes/iu.test(error.message);
}

function scopeDocumentForMarkdownExport(
  document: TextAuthoringDocument,
  includedIds: Set<string>,
): TextAuthoringDocument {
  const scoped = structuredClone(document);
  const items = scoped.parseResult.canonical.items.filter((item) =>
    includedIds.has(item.itemId),
  );
  const includedStepIds = new Set(items.map((item) => item.stepId));
  const steps = scoped.parseResult.canonical.steps
    .filter((step) => includedStepIds.has(step.stepId))
    .map((step) => ({
      ...step,
      itemIds: step.itemIds.filter((itemId) => includedIds.has(itemId)),
    }));
  scoped.parseResult.canonical.items = items;
  scoped.parseResult.canonical.steps = steps;
  scoped.parseResult.canonical.flow.stepIds = steps.map((step) => step.stepId);
  return scoped;
}

function primaryLabel(
  stage: AuthoringStage,
  document: TextAuthoringDocument | null,
  itemCount: number,
  parsePending: boolean,
  liveUpdateBlocked: boolean,
  reviewCount: number,
): string {
  if (parsePending && document) {
    return liveUpdateBlocked ? "원문 변경 확인" : "지금 반영";
  }
  if (stage === "input") return `결과 보기 · ${itemCount}개`;
  const ownership = document?.ownership;
  const reviewSuffix = reviewCount > 0 ? ` · 확인 ${reviewCount}개 남음` : "";
  if (ownership === "personal")
    return `개인 초안 저장 · ${itemCount}개${reviewSuffix}`;
  if (ownership === "suggestion")
    return `수정 제안 저장 · ${itemCount}개${reviewSuffix}`;
  return `제작자 초안 저장 · ${itemCount}개${reviewSuffix}`;
}

function normalizeVisibleAuthoringStage(
  stage: PersistedAuthoringStage | undefined,
): AuthoringStage {
  return stage === "input" ? "input" : "result";
}

export function TextAuthoringWorkspace({
  showQaCatalog = false,
}: {
  showQaCatalog?: boolean;
} = {}) {
  const [repository, setRepository] =
    useState<TextAuthoringDraftRepository | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [draftRecords, setDraftRecords] = useState<TextAuthoringDraftRecord[]>(
    [],
  );
  const [document, setDocument] = useState<TextAuthoringDocument | null>(
    DEFAULT_EXAMPLE_DOCUMENT,
  );
  const [title, setTitle] = useState(SIMPLE_TEXT_AUTHORING_EXAMPLE.title);
  const [source, setSource] = useState(SIMPLE_TEXT_AUTHORING_EXAMPLE.source);
  const [rawText, setRawText] = useState(SIMPLE_TEXT_AUTHORING_EXAMPLE.rawText);
  const anchor = useMemo(() => sourceAnchorDate(rawText), [rawText]);
  const [ownership, setOwnership] = useState<TextAuthoringOwnership>("personal");
  const [ownershipLocked, setOwnershipLocked] = useState(false);
  const [stage, setStage] = useState<AuthoringStage>("input");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    DEFAULT_EXAMPLE_ITEM_ID,
  );
  const [selectedArtifact, setSelectedArtifact] =
    useState<AuthoringArtifactKind>(
      normalizeArtifactKind(
        DEFAULT_EXAMPLE_DOCUMENT.parseResult.canonical.flow.primaryArtifact,
      ),
    );
  const [parsePending, setParsePending] = useState(false);
  const [liveApplyReceipt, setLiveApplyReceipt] = useState<{
    itemCount: number;
  } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryFilter, setLibraryFilter] =
    useState<AuthoringLibraryFilter>("all");
  const [recovery, setRecovery] = useState<TextAuthoringRecoveryRecord | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [saveReceipt, setSaveReceipt] = useState<ReturnType<
    typeof toSaveReceiptView
  > | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] =
    useState<AuthoringArtifactScope>("whole");
  const [exportFormat, setExportFormat] = useState("markdown");
  const [exportReceipt, setExportReceipt] =
    useState<AuthoringExportReceiptView | null>(null);
  const [roundTripOpen, setRoundTripOpen] = useState(false);
  const [roundTrip, setRoundTrip] = useState<AuthoringRoundTripView | null>(
    null,
  );
  const [reviewOpen, setReviewOpen] = useState(false);
  const [itemReviewOpen, setItemReviewOpen] = useState(false);
  const [sourceUpdateOpen, setSourceUpdateOpen] = useState(false);
  const [historyDraftId, setHistoryDraftId] = useState<string | null>(null);
  const [history, setHistory] = useState<TextAuthoringDraftHistoryEntry[]>([]);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [pendingExample, setPendingExample] =
    useState<TextAuthoringExample | null>(null);
  const [pendingCorrection, setPendingCorrection] =
    useState<PendingCorrection | null>(null);
  const inspectorReturnFocusRef = useRef<HTMLElement | null>(null);
  const workspaceGridRef = useRef<HTMLDivElement | null>(null);
  const inputPaneScrollRef = useRef<HTMLDivElement | null>(null);
  const sourceTextAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const resetInputScroll = useCallback(() => {
    const reset = () => {
      if (inputPaneScrollRef.current) {
        inputPaneScrollRef.current.scrollTop = 0;
        inputPaneScrollRef.current.scrollLeft = 0;
      }
      if (sourceTextAreaRef.current) {
        sourceTextAreaRef.current.scrollTop = 0;
        sourceTextAreaRef.current.scrollLeft = 0;
      }
    };

    reset();
    window.requestAnimationFrame(reset);
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 899px)").matches) return;

    const frame = window.requestAnimationFrame(() => {
      const grid = workspaceGridRef.current;
      const activePane = grid?.querySelector<HTMLElement>(
        `[data-authoring-pane="${stage}"]`,
      );
      const activeScroller = activePane?.querySelector<HTMLElement>(
        "[data-authoring-pane-scroll]",
      );

      grid?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      activePane?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      activeScroller?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [stage]);

  useEffect(() => {
    if (!liveApplyReceipt) return;
    const timer = window.setTimeout(() => setLiveApplyReceipt(null), 1600);
    return () => window.clearTimeout(timer);
  }, [liveApplyReceipt]);

  const refreshDrafts = useCallback(
    (nextRepository: TextAuthoringDraftRepository | null = repository) => {
      if (!nextRepository) return;
      setDraftRecords(nextRepository.listRecords({ includeArchived: true }));
    },
    [repository],
  );

  useEffect(() => {
    const storage = getDefaultTextAuthoringStorage();
    if (!storage) return;
    const nextRepository = createTextAuthoringDraftRepository(storage);
    setRepository(nextRepository);
    setDraftRecords(nextRepository.listRecords({ includeArchived: true }));
    setRecovery(nextRepository.loadRecovery() ?? null);
  }, []);

  const outline = useMemo(
    () => buildAuthoringOutlineView(document),
    [document],
  );
  const reviewGates = document?.reviewGates ?? [];
  const outstandingReviewCount = reviewGates.filter(
    (gate) => gate.status !== "evidence_recorded",
  ).length;
  const exportPolicy = document
    ? evaluateAuthoringWritePolicy(document, "export_file")
    : null;
  const pendingSourceState =
    document?.sourceState?.status === "source_updated" ||
    document?.sourceState?.status === "conflict_source_vs_user"
      ? document.sourceState
      : null;
  const matchesCurrentExample = (example: TextAuthoringExample) =>
    example.title === title &&
    example.source === source &&
    (example.previewAnchor
      ? writeSourceAnchorDate(example.rawText, example.previewAnchor)
      : example.rawText) === rawText &&
    (example.ownership ?? ownership) === ownership;
  const activeExampleId =
    TEXT_AUTHORING_EXAMPLES.find(matchesCurrentExample)?.id ?? null;
  const activeScenarioId =
    VALIDATED_TEXT_AUTHORING_EXAMPLES.find(matchesCurrentExample)?.scenarioId ??
    null;
  const hasPersistedActiveDraft = Boolean(
    activeDraftId &&
      draftRecords.some((record) => record.draftId === activeDraftId),
  );
  const currentSourceMetadata =
    document?.sourceUrl || document?.sourceTitle || "";
  const sourceInputChanged = Boolean(
    document &&
      (rawText !== document.rawText ||
        source.trim() !== currentSourceMetadata),
  );
  const sourceUpdateProtected = Boolean(
    sourceInputChanged &&
      (hasPersistedActiveDraft ||
        (document?.revisionHistory.length ?? 0) > 1),
  );
  const liveUpdateBlocked = Boolean(
    parsePending && (pendingSourceState || sourceUpdateProtected),
  );
  const parseStatusLabel = !parsePending
    ? null
    : !rawText.trim()
      ? "원문 필요"
      : liveUpdateBlocked
        ? "변경 확인 필요"
        : "반영 중";
  const userCorrectionCount = outline.items.filter(
    (item) => item.userCorrected,
  ).length;
  const selectedItem =
    outline.items.find((item) => item.itemId === selectedItemId) ?? null;
  const selectedCanonicalItem = document?.parseResult.canonical.items.find(
    (item) => item.itemId === selectedItemId,
  );
  const selectedCanonicalStep = document?.parseResult.canonical.steps.find(
    (step) => step.stepId === selectedCanonicalItem?.stepId,
  );
  const selectedStepItemIndex =
    selectedCanonicalStep?.itemIds.findIndex(
      (itemId) => itemId === selectedItemId,
    ) ?? -1;
  const canMergeNext = Boolean(
    selectedCanonicalStep?.itemIds[selectedStepItemIndex + 1],
  );

  const projectionState = useMemo(() => {
    if (!document) {
      return { value: null, error: "" };
    }
    try {
      return {
        value: buildAuthoringArtifactProjection(document, {
          ...(anchor ? { anchor } : {}),
        }),
        error: "",
      };
    } catch {
      return {
        value: null,
        error:
          "원문은 보존되어 있지만 결과를 계산하지 못했습니다. 구조를 다시 확인해 주세요.",
      };
    }
  }, [anchor, document]);
  const projection = projectionState.value;

  const activeArtifact = projection?.artifacts[selectedArtifact]?.eligible
    ? selectedArtifact
    : (projection?.primaryArtifact ?? selectedArtifact);

  const calendarSourceAlignment = useMemo(() => {
    if (!document || !projection?.artifacts.calendar.eligible) {
      return {
        differs: false,
        orderedItemIds: [] as string[],
        beforeTitles: [] as string[],
        afterTitles: [] as string[],
      };
    }
    const calendarRank = new Map(
      projection.artifacts.calendar.rows.map((row, index) => [row.itemId, index]),
    );
    const itemById = new Map(
      document.parseResult.canonical.items.map((item) => [item.itemId, item]),
    );
    let differs = false;
    const beforeTitles: string[] = [];
    const afterTitles: string[] = [];
    const orderedItemIds = document.parseResult.canonical.steps
      .slice()
      .sort((left, right) => left.order - right.order)
      .flatMap((step) => {
        const sourceIds = step.itemIds.filter((itemId) => itemById.has(itemId));
        const desiredIds = sourceIds
          .map((itemId, sourceIndex) => ({
            itemId,
            sourceIndex,
            calendarIndex: calendarRank.get(itemId),
          }))
          .sort((left, right) => {
            if (left.calendarIndex == null && right.calendarIndex == null) {
              return left.sourceIndex - right.sourceIndex;
            }
            if (left.calendarIndex == null) return 1;
            if (right.calendarIndex == null) return -1;
            return left.calendarIndex - right.calendarIndex;
          })
          .map((entry) => entry.itemId);
        if (desiredIds.some((itemId, index) => itemId !== sourceIds[index])) {
          differs = true;
        }
        beforeTitles.push(
          ...sourceIds.map((itemId) => itemById.get(itemId)?.title ?? itemId),
        );
        afterTitles.push(
          ...desiredIds.map((itemId) => itemById.get(itemId)?.title ?? itemId),
        );
        return desiredIds;
      });
    return { differs, orderedItemIds, beforeTitles, afterTitles };
  }, [document, projection]);

  const preflightState = useMemo(() => {
    if (!projection) return { value: null, error: "" };
    try {
      return {
        value: buildArtifactPreflight(projection, {
          artifact: activeArtifact,
          scope: "whole",
        }),
        error: "",
      };
    } catch {
      return {
        value: null,
        error:
          "결과 범위를 확인하지 못했습니다. 구조로 돌아가 항목을 확인해 주세요.",
      };
    }
  }, [activeArtifact, projection]);
  const preflight = preflightState.value;

  const resultUnavailableMessage = parsePending
    ? "입력 반영 중입니다. 이전 결과를 잠시 보여 줍니다."
    : projectionState.error || preflightState.error || undefined;

  const scopedPreflight = useMemo(() => {
    if (!projection) return null;
    try {
      return buildArtifactPreflight(projection, {
        artifact: activeArtifact,
        scope: exportScope,
        ...(exportScope === "selected" && selectedItemId
          ? { selectedItemIds: [selectedItemId] }
          : {}),
        ...(exportScope === "current_step" && selectedItem
          ? { currentStepId: selectedItem.stepId }
          : {}),
      });
    } catch {
      return null;
    }
  }, [activeArtifact, exportScope, projection, selectedItem, selectedItemId]);

  useEffect(() => {
    if (!scopedPreflight || scopedPreflight.formats.includes(exportFormat))
      return;
    setExportFormat(scopedPreflight.formats[0] ?? "markdown");
  }, [exportFormat, scopedPreflight]);

  const createFromCurrentInput = useCallback(
    (documentId?: string) => {
      const trimmedSource = source.trim();
      return createTextAuthoringDocument(rawText, {
        ...(documentId ? { documentId } : {}),
        ownership,
        ...(title.trim() ? { title: title.trim() } : {}),
        reviewRequirements: explicitReviewRequirements(
          ownership,
          source,
          rawText,
        ),
        ...(trimmedSource && isWebUrl(trimmedSource)
          ? { sourceUrl: trimmedSource }
          : trimmedSource
            ? { sourceTitle: trimmedSource }
            : {}),
      });
    },
    [ownership, rawText, source, title],
  );

  useEffect(() => {
    if (!repository || !activeDraftId || !dirty || !rawText.trim()) return;
    const timer = window.setTimeout(() => {
      const recoveryDocument =
        document && !parsePending
          ? withUiState(document, stage, selectedItemId, title, ownership)
          : createFromCurrentInput(document?.documentId);
      try {
        repository.autosave(recoveryDocument, {
          draftId: activeDraftId,
          activeStage: stage,
          ...(selectedItemId ? { selectedItemId } : {}),
          primaryArtifact: activeArtifact,
        });
      } catch (error) {
        setStatusMessage(storageWriteFailureMessage("임시 저장", error));
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [
    activeArtifact,
    activeDraftId,
    createFromCurrentInput,
    dirty,
    document,
    ownership,
    parsePending,
    rawText,
    repository,
    selectedItemId,
    stage,
    title,
  ]);

  const applyCurrentInput = useCallback((mode: "live" | "manual") => {
    if (mode === "manual") setLiveApplyReceipt(null);
    if (!rawText.trim()) {
      setStatusMessage("Flow로 만들 원문이나 메모를 먼저 입력해 주세요.");
      if (mode === "manual") {
        window.document
          .querySelector<HTMLElement>('[data-testid="ta-authoring-source"]')
          ?.focus();
      }
      return;
    }
    if (pendingSourceState) {
      if (mode === "manual") setSourceUpdateOpen(true);
      setStatusMessage(
        "먼저 보존해 둔 원문 변경을 적용하거나 나중에 볼지 확인해 주세요.",
      );
      return;
    }
    const next = createFromCurrentInput(document?.documentId);
    if (document && sourceUpdateProtected) {
      try {
        const staged = applyAuthoringOperation(
          document,
          {
            type: "stage_source_update",
            candidate: createAuthoringSourceUpdateCandidate(next),
          },
          { actorLane: "system" },
        );
        if (staged !== document) {
          const nextStage = mode === "live" ? stage : "result";
          setDocument(
            withUiState(
              staged,
              nextStage,
              selectedItemId,
              title,
              ownership,
            ),
          );
          setParsePending(false);
          setDirty(true);
          setStage(nextStage);
          setLibraryOpen(false);
          setStatusMessage(
            "새 원문과 현재 결과를 따로 보존했습니다. 변경 내용을 확인해 주세요.",
          );
          return;
        }
      } catch (error) {
        setStatusMessage(
          isUnsupportedSourceSemanticError(error)
            ? "현재 비교가 지원하지 않는 원문 변경이 있어 기존 결과를 유지했습니다. 이 원문은 새 초안으로 시작하거나 변경 폭을 줄여 주세요."
            : "새 원문과 현재 결과를 비교하지 못했습니다. 원문은 바꾸지 않았습니다.",
        );
        return;
      }
    }
    setActiveDraftId((current) => current ?? createLocalDraftId());
    const nextSelectedItemId =
      next.parseResult.canonical.items.some(
        (item) => item.itemId === selectedItemId,
      )
        ? selectedItemId
        : next.parseResult.canonical.items[0]?.itemId ?? null;
    const nextStage = mode === "live" ? stage : "result";
    setDocument(
      withUiState(next, nextStage, nextSelectedItemId, title, ownership),
    );
    if (mode === "manual") setOwnershipLocked(true);
    setSelectedItemId(nextSelectedItemId);
    setSelectedArtifact(
      normalizeArtifactKind(next.parseResult.canonical.flow.primaryArtifact),
    );
    setParsePending(false);
    setLiveApplyReceipt(
      mode === "live"
        ? { itemCount: next.parseResult.canonical.items.length }
        : null,
    );
    setDirty(true);
    setStage(nextStage);
    setLibraryOpen(false);
    setStatusMessage(
      `${next.parseResult.canonical.steps.length}단계 · ${next.parseResult.canonical.items.length}개 항목을 ${mode === "live" ? "자동 반영했습니다." : "만들었습니다."}`,
    );
  }, [
    createFromCurrentInput,
    document,
    ownership,
    pendingSourceState,
    rawText,
    selectedItemId,
    sourceUpdateProtected,
    stage,
    title,
  ]);

  const handleParse = useCallback(
    () => applyCurrentInput("manual"),
    [applyCurrentInput],
  );

  const handleAnchorChange = useCallback((value: string) => {
    const nextRawText = writeSourceAnchorDate(rawText, value);
    if (nextRawText === rawText) return;
    setActiveDraftId((current) => current ?? createLocalDraftId());
    setRawText(nextRawText);
    setLiveApplyReceipt(null);
    setParsePending(true);
    setDirty(true);
    setStatusMessage(
      value
        ? `원문에 - 기준일: ${value} 줄을 반영했습니다.`
        : "원문에서 기준일 줄을 제거했습니다.",
    );
  }, [rawText]);

  useEffect(() => {
    if (!parsePending || pendingSourceState) return;
    const timer = window.setTimeout(() => {
      applyCurrentInput("live");
    }, 280);
    return () => window.clearTimeout(timer);
  }, [applyCurrentInput, parsePending, pendingSourceState]);

  const performOperation = useCallback(
    (operation: AuthoringCorrectionOperation, message: string) => {
      if (!document) return false;
      const next = applyAuthoringOperation(document, operation, {
        actorLane: ownership,
      });
      if (next === document) {
        setStatusMessage("적용하거나 되돌릴 변경이 없습니다.");
        return false;
      }
      const nextStage = stage;
      setActiveDraftId((current) => current ?? createLocalDraftId());
      setDocument(
        withUiState(next, nextStage, selectedItemId, title, ownership),
      );
      if (next.rawText !== rawText) {
        setRawText(next.rawText);
        setParsePending(false);
      }
      setOwnershipLocked(true);
      setStage(nextStage);
      setDirty(true);
      setStatusMessage(message);
      return true;
    },
    [document, ownership, rawText, selectedItemId, stage, title],
  );

  const handleAlignSourceToCalendar = useCallback(() => {
    if (!calendarSourceAlignment.differs) return;
    setPendingCorrection({
      type: "align",
      orderedItemIds: calendarSourceAlignment.orderedItemIds,
      beforeTitles: calendarSourceAlignment.beforeTitles,
      afterTitles: calendarSourceAlignment.afterTitles,
    });
  }, [calendarSourceAlignment]);

  const handleClassifyIssue = useCallback(
    (issueId: string, outcome: AuthoringIssueOutcome) => {
      if (!document) return;
      const next = applyAuthoringOperation(
        document,
        { type: "classify_issue", issueId, outcome },
        { actorLane: ownership },
      );
      if (next === document) {
        setStatusMessage("이 문장에는 해당 선택을 적용할 수 없습니다.");
        return;
      }
      const decision = next.parseResult.issues.find(
        (issue) => issue.issueId === issueId,
      )?.decision;
      const convertedItemId =
        decision?.outcome === "convert_to_item"
          ? decision.targetDraftId
          : null;
      const nextSelectedItemId = convertedItemId ?? selectedItemId;
      setActiveDraftId((current) => current ?? createLocalDraftId());
      setDocument(
        withUiState(
          next,
          stage,
          nextSelectedItemId,
          title,
          ownership,
        ),
      );
      setOwnershipLocked(true);
      setSelectedItemId(nextSelectedItemId);
      setDirty(true);

      const message =
        outcome === "keep_source_only"
          ? "원문에만 남겼습니다. 결과 항목은 바뀌지 않았습니다."
          : outcome === "convert_to_item"
            ? "할 일 1개로 만들었습니다. 구조와 결과 수에 반영했습니다."
            : "나중에 정할 문장으로 남겼습니다. 원문과 확인 필요 상태를 유지합니다.";
      setStatusMessage(message);

      window.requestAnimationFrame(() => {
        if (convertedItemId) {
          window.document
            .querySelector<HTMLElement>(
              `[data-ta-item-id="${CSS.escape(convertedItemId)}"]`,
            )
            ?.focus();
          return;
        }
        const nextOpenIssue = window.document.querySelector<HTMLElement>(
          '[data-testid="ta-authoring-issue-card"][data-issue-state="open"] button:not([disabled])',
        );
        if (nextOpenIssue) {
          nextOpenIssue.focus();
          return;
        }
        if (outcome === "hold") {
          const heldSummary = window.document.querySelector<HTMLElement>(
            '[data-testid="ta-authoring-held-issues-summary"]',
          );
          if (heldSummary) {
            heldSummary.focus();
            return;
          }
        }
        window.document
          .querySelector<HTMLElement>(
            '[data-testid="ta-authoring-item-review-close"]',
          )
          ?.focus();
      });
    },
    [document, ownership, selectedItemId, stage, title],
  );

  const handleMove = useCallback(
    (direction: -1 | 1) => {
      if (!document || !selectedItemId) return;
      const items = document.parseResult.canonical.items;
      const index = items.findIndex((item) => item.itemId === selectedItemId);
      if (index < 0) return;
      const toIndex = Math.max(
        0,
        Math.min(items.length - 1, index + direction),
      );
      if (toIndex === index) return;
      performOperation(
        { type: "reorder", itemId: selectedItemId, toIndex },
        direction < 0 ? "항목을 위로 옮겼습니다." : "항목을 아래로 옮겼습니다.",
      );
    },
    [document, performOperation, selectedItemId],
  );

  const handleMergeNext = useCallback(() => {
    if (!document || !selectedItemId) return;
    const items = document.parseResult.canonical.items;
    const selected = items.find((item) => item.itemId === selectedItemId);
    const step = document.parseResult.canonical.steps.find(
      (candidate) => candidate.stepId === selected?.stepId,
    );
    const index = step?.itemIds.indexOf(selectedItemId) ?? -1;
    const nextItemId = index >= 0 ? step?.itemIds[index + 1] : undefined;
    const next = nextItemId
      ? items.find((item) => item.itemId === nextItemId)
      : undefined;
    if (!next) {
      setStatusMessage("같은 단계 안에서 합칠 다음 항목이 없습니다.");
      return;
    }
    setPendingCorrection({
      type: "merge",
      firstItemId: selectedItemId,
      firstTitle: selected?.title ?? selectedItemId,
      secondItemId: next.itemId,
      secondTitle: next.title,
    });
  }, [document, selectedItemId]);

  const handleSplit = useCallback(() => {
    if (!selectedItem || !selectedItemId) return;
    const boundaries = splitBoundaries(selectedItem.title);
    if (boundaries.length === 0) {
      setStatusMessage(
        "제목에 나눌 수 있는 띄어쓰기가 없습니다. 제목을 먼저 고쳐 주세요.",
      );
      return;
    }
    const center = selectedItem.title.length / 2;
    const suggested = boundaries.reduce((best, candidate) =>
      Math.abs(candidate.at - center) < Math.abs(best.at - center)
        ? candidate
        : best,
    );
    setPendingCorrection({
      type: "split",
      itemId: selectedItemId,
      title: selectedItem.title,
      boundaries,
      at: suggested.at,
    });
  }, [selectedItem, selectedItemId]);

  const handleConfirmCorrection = useCallback(() => {
    const correction = pendingCorrection;
    if (!correction) return;
    setPendingCorrection(null);
    if (correction.type === "align") {
      const applied = performOperation(
        {
          type: "align_source_order",
          orderedItemIds: correction.orderedItemIds,
        },
        "같은 단계 안에서 입력과 결과를 날짜순으로 맞췄습니다. 한 번에 되돌릴 수 있습니다.",
      );
      if (!applied) {
        setStatusMessage(
          "원문 블록을 안전하게 구분할 수 없어 순서를 바꾸지 않았습니다.",
        );
      }
      return;
    }
    if (correction.type === "merge") {
      const applied = performOperation(
        {
          type: "merge",
          itemIds: [correction.firstItemId, correction.secondItemId],
        },
        "두 항목을 합쳤습니다. 연결된 원문은 모두 유지합니다.",
      );
      if (!applied) {
        setStatusMessage(
          "완료 기준·날짜·속성이 서로 달라 자동으로 합치지 않았습니다.",
        );
      }
      return;
    }
    const applied = performOperation(
      { type: "split", itemId: correction.itemId, at: correction.at },
      "확인한 위치에서 항목을 둘로 나눴습니다. 상세·날짜·자료는 두 항목에 함께 이어집니다.",
    );
    if (!applied) {
      setStatusMessage("선택한 위치에서는 항목을 나눌 수 없습니다.");
    }
  }, [pendingCorrection, performOperation]);

  const openInspector = useCallback((itemId: string) => {
    inspectorReturnFocusRef.current =
      window.document.activeElement instanceof HTMLElement
        ? window.document.activeElement
        : window.document.querySelector<HTMLElement>(
            `[data-ta-item-id="${CSS.escape(itemId)}"]`,
          );
    setSelectedItemId(itemId);
    setInspectorOpen(true);
  }, []);

  const handleStructureItemActivate = useCallback(
    (itemId: string) => {
      if (window.matchMedia("(max-width: 899px)").matches) {
        openInspector(itemId);
        return;
      }
      setSelectedItemId(itemId);
    },
    [openInspector],
  );

  const closeInspector = useCallback(() => {
    setInspectorOpen(false);
    window.requestAnimationFrame(() => {
      const returnTarget = inspectorReturnFocusRef.current;
      if (
        returnTarget?.isConnected &&
        returnTarget.offsetParent !== null &&
        !returnTarget.closest("[hidden]")
      ) {
        returnTarget.focus();
        return;
      }
      window.document
        .querySelector<HTMLElement>('[data-testid="ta-authoring-item-review-open"]')
        ?.focus();
    });
  }, []);

  const applyItemPatch = useCallback(
    (patch: AuthoringItemPatch) => {
      if (!document || !selectedItem) return;
      let next = document;
      if (patch.title.trim() && patch.title !== selectedItem.title) {
        next = applyAuthoringOperation(
          next,
          {
            type: "rename",
            itemId: selectedItem.itemId,
            title: patch.title.trim(),
          },
          { actorLane: ownership },
        );
      }
      const propertyPairs: Array<{
        key:
          | "detail"
          | "completion"
          | "date"
          | "relative_date"
          | "time"
          | "timezone"
          | "place"
          | "duration"
          | "repeat"
          | "condition"
          | "resource";
        before: string;
        after: string;
      }> = [
        { key: "detail", before: selectedItem.detail, after: patch.detail },
        {
          key: "completion",
          before: selectedItem.completion,
          after: patch.completion,
        },
        { key: "date", before: selectedItem.date, after: patch.date },
        {
          key: "relative_date",
          before: selectedItem.relativeDate,
          after: patch.relativeDate,
        },
        { key: "time", before: selectedItem.time, after: patch.time },
        {
          key: "timezone",
          before: selectedItem.timezone,
          after: patch.timezone,
        },
        { key: "place", before: selectedItem.place, after: patch.place },
        {
          key: "duration",
          before: selectedItem.duration,
          after: patch.duration,
        },
        { key: "repeat", before: selectedItem.repeat, after: patch.repeat },
        {
          key: "condition",
          before: selectedItem.condition,
          after: patch.condition,
        },
        {
          key: "resource",
          before: selectedItem.resource,
          after: patch.resource,
        },
      ];
      for (const property of propertyPairs) {
        if (property.after === property.before) continue;
        next = applyAuthoringOperation(
          next,
          {
            type: "set_property",
            itemId: selectedItem.itemId,
            key: property.key,
            value: property.after,
          },
          { actorLane: ownership },
        );
      }
      const nextStage = stage;
      setDocument(
        withUiState(next, nextStage, selectedItem.itemId, title, ownership),
      );
      setOwnershipLocked(true);
      setActiveDraftId((current) => current ?? createLocalDraftId());
      setStage(nextStage);
      setDirty(true);
      setStatusMessage("항목 변경을 revision에 기록했습니다.");
      closeInspector();
    },
    [closeInspector, document, ownership, selectedItem, stage, title],
  );

  const goToResult = useCallback(() => {
    if (!document) return;
    if (parsePending) {
      setStatusMessage("변경한 원문을 다시 해석한 뒤 결과를 확인해 주세요.");
      setStage("input");
      window.requestAnimationFrame(() => {
        window.document
          .querySelector<HTMLElement>('[data-testid="ta-authoring-source"]')
          ?.focus();
      });
      return;
    }
    setDocument(
      withUiState(
        {
          ...document,
          lifecycleStatus: deriveAuthoringLifecycleStatus(
            document,
            "previewed",
          ),
        },
        "result",
        selectedItemId,
        title,
        ownership,
      ),
    );
    setStage("result");
    setStatusMessage("실제 결과 수량과 빠지는 정보를 확인해 주세요.");
  }, [document, ownership, parsePending, selectedItemId, title]);

  const handleSave = useCallback(() => {
    if (parsePending) {
      setStatusMessage("변경한 원문을 다시 해석한 뒤 저장해 주세요.");
      return;
    }
    if (!repository || !document || !projection) {
      setStatusMessage("저장할 결과를 먼저 확인해 주세요.");
      return;
    }
    const savedDocument = withUiState(
      {
        ...document,
        lifecycleStatus: deriveAuthoringLifecycleStatus(
          document,
          "previewed",
        ),
      },
      "result",
      selectedItemId,
      title,
      ownership,
    );
    let record: TextAuthoringDraftRecord;
    try {
      record = repository.save(savedDocument, {
        draftId: activeDraftId ?? savedDocument.documentId,
        title: title.trim() || projection.title,
        status:
          savedDocument.lifecycleStatus === "needs_review"
            ? "needs_review"
            : "previewed",
        activeStage: "result",
        ...(selectedItemId ? { selectedItemId } : {}),
        primaryArtifact: activeArtifact,
      });
    } catch (error) {
      setDirty(true);
      setStatusMessage(storageWriteFailureMessage("초안 저장", error));
      return;
    }
    const persistedDocument = record.document;
    const receipt = createSaveReceipt(persistedDocument, projection, {
      draftId: record.draftId,
    });
    setActiveDraftId(record.draftId);
    setDocument(persistedDocument);
    setOwnershipLocked(true);
    setSaveReceipt(toSaveReceiptView(receipt));
    setDirty(false);
    setRecovery(null);
    refreshDrafts(repository);
    setStatusMessage(
      savedDraftStatus(
        ownership,
        (persistedDocument.reviewGates ?? []).filter(
          (gate) => gate.status !== "evidence_recorded",
        ).length,
      ),
    );
  }, [
    activeArtifact,
    activeDraftId,
    document,
    ownership,
    parsePending,
    projection,
    refreshDrafts,
    repository,
    selectedItemId,
    title,
  ]);

  const runPrimaryAction = useCallback(() => {
    if (parsePending || !document) {
      handleParse();
    } else if (stage === "input") {
      goToResult();
    } else {
      handleSave();
    }
  }, [document, goToResult, handleParse, handleSave, parsePending, stage]);

  const anyOverlayOpen =
    inspectorOpen ||
    Boolean(pendingCorrection) ||
    libraryOpen ||
    Boolean(saveReceipt) ||
    exportOpen ||
    roundTripOpen ||
    reviewOpen ||
    itemReviewOpen ||
    sourceUpdateOpen ||
    Boolean(historyDraftId) ||
    resetConfirmOpen;

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (anyOverlayOpen) return;
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        runPrimaryAction();
        return;
      }
      const target = event.target;
      const editing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (
        !editing &&
        event.altKey &&
        selectedItemId &&
        (event.key === "ArrowUp" || event.key === "ArrowDown")
      ) {
        event.preventDefault();
        handleMove(event.key === "ArrowUp" ? -1 : 1);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [anyOverlayOpen, handleMove, runPrimaryAction, selectedItemId]);

  const resetWorkspace = useCallback(() => {
    if (repository && activeDraftId) {
      try {
        repository.clearRecovery(activeDraftId);
      } catch (error) {
        setStatusMessage(storageWriteFailureMessage("복구본 정리", error));
        return;
      }
    }
    setActiveDraftId(null);
    setDocument(null);
    setTitle("");
    setSource("");
    setRawText("");
    setOwnership("personal");
    setOwnershipLocked(false);
    setStage("input");
    setSelectedItemId(null);
    setSelectedArtifact("todo");
    setParsePending(false);
    setDirty(false);
    setRecovery(null);
    setLibraryOpen(false);
    setSaveReceipt(null);
    setReviewOpen(false);
    setItemReviewOpen(false);
    setSourceUpdateOpen(false);
    setResetConfirmOpen(false);
    setPendingExample(null);
    setPendingCorrection(null);
    setStatusMessage("새 Flow를 시작합니다.");
  }, [activeDraftId, repository]);

  const requestResetWorkspace = useCallback(() => {
    setPendingExample(null);
    if (dirty) {
      setResetConfirmOpen(true);
      return;
    }
    resetWorkspace();
  }, [dirty, resetWorkspace]);

  const loadDocument = useCallback(
    (
      nextDocument: TextAuthoringDocument,
      options: {
        stage?: PersistedAuthoringStage;
        selectedItemId?: string;
        primaryArtifact?: string;
        draftId?: string;
      } = {},
    ) => {
      const resolvedTitle =
        extractMarkdownFlowTitle(nextDocument.rawText) ||
        nextDocument.title ||
        nextDocument.parseResult.canonical.flow.title;
      const persistedStage = options.stage ?? nextDocument.uiState?.stage;
      const resolvedStage = normalizeVisibleAuthoringStage(
        persistedStage,
      );
      const resolvedSelectedItemId =
        options.selectedItemId ??
        nextDocument.uiState?.selectedItemId ??
        nextDocument.parseResult.canonical.items[0]?.itemId ??
        null;
      const normalizedDocument = withUiState(
        nextDocument,
        resolvedStage,
        resolvedSelectedItemId,
        resolvedTitle,
        nextDocument.ownership,
      );

      setActiveDraftId(options.draftId ?? nextDocument.documentId);
      setDocument(normalizedDocument);
      setTitle(resolvedTitle);
      setSource(nextDocument.sourceUrl || nextDocument.sourceTitle || "");
      setRawText(nextDocument.rawText);
      setOwnership(nextDocument.ownership);
      setOwnershipLocked(true);
      setStage(resolvedStage);
      setSelectedItemId(resolvedSelectedItemId);
      setSelectedArtifact(
        normalizeArtifactKind(
          options.primaryArtifact ??
            nextDocument.parseResult.canonical.flow.primaryArtifact,
        ),
      );
      setParsePending(false);
      setDirty(false);
      setLibraryOpen(false);
      setSaveReceipt(null);
      setReviewOpen(false);
      setItemReviewOpen(persistedStage === "structure");
      setSourceUpdateOpen(false);
    },
    [],
  );

  const openDraft = useCallback(
    (draftId: string) => {
      const record = repository?.load(draftId);
      if (!record) return;
      loadDocument(record.document, {
        draftId: record.draftId,
        stage: record.activeStage,
        selectedItemId: record.selectedItemId,
        primaryArtifact: record.primaryArtifact,
      });
      setStatusMessage(`${record.title} 초안을 열었습니다.`);
    },
    [loadDocument, repository],
  );

  const filteredDrafts = useMemo(() => {
    const query = libraryQuery.trim().toLocaleLowerCase("ko-KR");
    return draftRecords.map(toDraftView).filter((draft) => {
      if (
        query &&
        !`${draft.title}\n${draft.source}`
          .toLocaleLowerCase("ko-KR")
          .includes(query)
      ) {
        return false;
      }
      if (libraryFilter === "archived") return true;
      if (draft.archived) return false;
      if (libraryFilter === "all") return true;
      if (libraryFilter === "draft") return draft.status === "작성 중";
      if (libraryFilter === "needs_review") return draft.status === "확인 필요";
      return draft.status === "결과 확인 완료";
    });
  }, [draftRecords, libraryFilter, libraryQuery]);

  const historyRecord = historyDraftId
    ? draftRecords.find((record) => record.draftId === historyDraftId)
    : undefined;

  const handleRecordReview = useCallback(
    (
      gateId: string,
      status: AuthoringReviewGateStatus,
      evidenceNote?: string,
    ) => {
      if (!document) return;
      if (status === "required") {
        const gate = document.reviewGates?.find(
          (candidate) => candidate.gateId === gateId,
        );
        if (gate?.status !== "required") {
          performOperation(
            { type: "reopen_review", gateId },
            "추가 검토가 필요한 상태로 되돌렸습니다.",
          );
        }
        setReviewOpen(false);
        setStatusMessage(
          "추가 검토가 필요한 상태로 남겼습니다. 로컬 초안과 원문은 보존됩니다.",
        );
        return;
      }
      const next = applyAuthoringOperation(
        document,
        {
          type: "record_review_decision",
          gateId,
          status,
          ...(evidenceNote ? { evidenceNote } : {}),
        },
        { actorLane: ownership },
      );
      if (next === document) {
        setStatusMessage("확인 기록을 적용하지 못했습니다.");
        return;
      }
      if (status === "personal_only" && ownership !== "personal") {
        const personalDocumentId = createLocalDraftId();
        const personal = forkAuthoringDocumentToPersonal(next, {
          documentId: personalDocumentId,
        });
        setDocument(
          withUiState(
            personal,
            stage,
            selectedItemId,
            title,
            "personal",
          ),
        );
        setOwnership("personal");
        setOwnershipLocked(true);
        setActiveDraftId(personalDocumentId);
        setReviewOpen(false);
        setDirty(true);
        setStatusMessage(
          "공개 원본과 분리한 새 개인 초안으로 전환했습니다. 로컬 저장은 가능하지만 제한된 외부 가져가기는 계속 막힙니다.",
        );
        return;
      }
      setDocument(withUiState(next, stage, selectedItemId, title, ownership));
      setDirty(true);
      const hasAnotherRequired = (next.reviewGates ?? []).some(
        (gate) => gate.status === "required",
      );
      if (!hasAnotherRequired) setReviewOpen(false);
      setStatusMessage(
        status === "evidence_recorded"
          ? "사용자가 확인한 근거를 기록했습니다. FlowMe의 검증이나 승인은 아닙니다."
          : "개인용 제한을 기록했습니다. 외부 파일과 다음 단계는 계속 제한됩니다.",
      );
    },
    [
      document,
      ownership,
      performOperation,
      selectedItemId,
      stage,
      title,
    ],
  );

  const handleResolveSourceUpdate = useCallback(
    (changeId: string, resolution: AuthoringSourceUpdateResolution) => {
      if (!document) return;
      try {
        const next = applyAuthoringOperation(
          document,
          {
            type: "resolve_source_conflict",
            changeId,
            resolution,
          },
          { actorLane: ownership },
        );
        if (next === document) return;
        setDocument(
          withUiState(next, "result", selectedItemId, title, ownership),
        );
        setDirty(true);
        setStatusMessage("이 변경에 사용할 값을 선택했습니다.");
      } catch {
        setStatusMessage(
          "이 변경에는 해당 선택을 적용할 수 없습니다. 값을 다시 확인해 주세요.",
        );
      }
    },
    [document, ownership, selectedItemId, title],
  );

  const handleApplySourceUpdate = useCallback(() => {
    if (!document || !pendingSourceState) return;
    try {
      const next = applyAuthoringOperation(
        document,
        { type: "apply_source_update" },
        { actorLane: ownership },
      );
      if (next === document) return;
      const firstItemId =
        next.parseResult.canonical.items.find((item) => item.included)?.itemId ??
        next.parseResult.canonical.items[0]?.itemId ??
        null;
      setDocument(withUiState(next, "result", firstItemId, title, ownership));
      setRawText(next.rawText);
      setSource(next.sourceUrl || next.sourceTitle || "");
      setSelectedItemId(firstItemId);
      setSelectedArtifact(
        normalizeArtifactKind(next.parseResult.canonical.flow.primaryArtifact),
      );
      setParsePending(false);
      setDirty(true);
      setSourceUpdateOpen(false);
      setStatusMessage(
        "선택한 원문 변경을 새 revision으로 적용했습니다. 권리·안전 근거는 새 원문 기준으로 다시 확인합니다.",
      );
    } catch (error) {
      setStatusMessage(
        isUnsupportedSourceSemanticError(error)
          ? "현재 비교가 지원하지 않는 원문 변경은 적용하지 않았습니다. 기존 결과와 저장본을 유지합니다."
          : "모든 변경에 사용할 값을 선택한 뒤 적용해 주세요.",
      );
    }
  }, [document, ownership, pendingSourceState, title]);

  const handleRejectSourceUpdate = useCallback(() => {
    if (!document || !pendingSourceState) return;
    const next = applyAuthoringOperation(
      document,
      { type: "reject_source_update" },
      { actorLane: ownership },
    );
    if (next === document) return;
    setDocument(
      withUiState(next, "result", selectedItemId, title, ownership),
    );
    setRawText(next.rawText);
    setSource(next.sourceUrl || next.sourceTitle || "");
    setParsePending(false);
    setDirty(true);
    setSourceUpdateOpen(false);
    setStatusMessage(
      "새 원문 후보를 사용하지 않고 이전 원문과 현재 결과를 유지했습니다.",
    );
  }, [
    document,
    ownership,
    pendingSourceState,
    selectedItemId,
    title,
  ]);

  const handleDeferSourceUpdate = useCallback(() => {
    setSourceUpdateOpen(false);
    setStatusMessage(
      "원문 변경은 적용하지 않았습니다. 이전 결과와 두 원문을 계속 보존합니다.",
    );
  }, []);

  const requestOpenExport = useCallback(() => {
    if (!document || !exportPolicy) return;
    const sourceBlocker = exportPolicy.blockers.some(
      (blocker) => blocker.kind === "source_update",
    );
    if (sourceBlocker) {
      setSourceUpdateOpen(true);
      setStatusMessage(
        "아직 파일을 만들지 않았습니다. 원문 변경을 먼저 확인해 주세요.",
      );
      return;
    }
    const reviewBlocker = exportPolicy.blockers.some(
      (blocker) => blocker.kind === "review_gate",
    );
    if (reviewBlocker) {
      setReviewOpen(true);
      setStatusMessage(
        "아직 파일을 만들지 않았습니다. 원문과 초안은 그대로 보존됩니다.",
      );
      return;
    }
    const issueBlocker = exportPolicy.blockers.some(
      (blocker) => blocker.kind === "authoring_issue",
    );
    if (issueBlocker) {
      setItemReviewOpen(true);
      setStatusMessage(
        "결정이 필요한 문장을 먼저 확인해 주세요. 아직 파일을 만들지 않았습니다.",
      );
      window.requestAnimationFrame(() =>
        window.document
          .querySelector<HTMLElement>(
            '[data-testid="ta-authoring-issue-card"][data-issue-state="open"] button:not([disabled])',
          )
          ?.focus(),
      );
      return;
    }
    setExportReceipt(null);
    setExportOpen(true);
  }, [document, exportPolicy]);

  const handleExportConfirm = useCallback(async () => {
    if (!document || !projection || !scopedPreflight) return;
    const currentPolicy = evaluateAuthoringWritePolicy(
      document,
      "export_file",
    );
    if (!currentPolicy.allowed) {
      setExportOpen(false);
      if (
        currentPolicy.blockers.some(
          (blocker) => blocker.kind === "source_update",
        )
      ) {
        setSourceUpdateOpen(true);
      } else if (
        currentPolicy.blockers.some(
          (blocker) => blocker.kind === "review_gate",
        )
      ) {
        setReviewOpen(true);
      }
      setStatusMessage(
        "확인하지 않은 상태에서는 파일을 만들지 않습니다. 원문과 초안은 보존됩니다.",
      );
      return;
    }
    const includedIds = new Set(scopedPreflight.itemIds);
    const rows = projection.artifacts[activeArtifact].rows.filter((row) =>
      includedIds.has(row.itemId),
    );
    let content: BlobPart = "";
    let extension = exportFormat;
    let mime = "text/plain;charset=utf-8";
    try {
      if (exportFormat === "ics") {
        content = serializeAuthoringIcs(projection.title, rows);
        mime = "text/calendar;charset=utf-8";
      } else if (exportFormat === "csv" || exportFormat === "tsv") {
        const separator = exportFormat === "csv" ? "," : "\t";
        const table = buildAuthoringSheetExportTable(
          projection.artifacts.sheet,
          includedIds,
        );
        if (table.columns.length === 0) {
          throw new Error("sheet_export_contract_missing");
        }
        content = [
          table.columns.map((value) =>
            csvCell(value, separator),
          ),
          ...table.rows.map((row) =>
            row.map((value) => csvCell(String(value), separator)),
          ),
        ]
          .map((row) => row.join(separator))
          .join("\n");
        mime =
          exportFormat === "csv"
            ? "text/csv;charset=utf-8"
            : "text/tab-separated-values;charset=utf-8";
      } else if (exportFormat === "xlsx") {
        const table = buildAuthoringSheetExportTable(
          projection.artifacts.sheet,
          includedIds,
        );
        if (table.columns.length === 0) {
          throw new Error("sheet_export_contract_missing");
        }
        content = await buildXlsxBuffer([
          {
            name: "실행표",
            columns: table.columns,
            rows: table.rows,
            accentColor: "0F766E",
            note: "가져가기 전 확인한 범위와 행만 포함합니다.",
          },
        ]);
        mime =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      } else if (exportFormat === "raw_source") {
        content = document.rawText;
        extension = "txt";
        mime = "text/plain;charset=utf-8";
      } else if (exportFormat === "plain_text") {
        content = serializeAuthoringPlainText(projection.title, rows);
        extension = "txt";
        mime = "text/plain;charset=utf-8";
      } else {
        content = exportTextAuthoringMarkdown(
          scopeDocumentForMarkdownExport(document, includedIds),
        );
        extension = "md";
        mime = "text/markdown;charset=utf-8";
      }
      downloadFile(
        `${safeFileName(projection.title)}.${extension}`,
        content,
        mime,
      );
    } catch {
      setStatusMessage(
        "파일을 만들지 못했습니다. 형식을 바꾸거나 다시 시도해 주세요.",
      );
      return;
    }
    const receipt = createExportReceipt(scopedPreflight, {
      format: exportFormat,
      document,
    });
    assertPreflightReceiptParity(scopedPreflight, receipt);
    setExportReceipt({
      receiptId: receipt.receiptId,
      artifact: receipt.artifact,
      scope: receipt.scope,
      format: receipt.format,
      count: receipt.count,
      omittedCount: receipt.omittedCount,
      reviewEvidenceCount:
        receipt.reviewState.evidenceRecordedGateIds.length,
      sourceState: receipt.sourceState.status,
      createdAtLabel: formatKoreanDateTime(receipt.exportedAt),
    });
    setStatusMessage(
      `${ARTIFACT_LABEL[receipt.artifact]} ${receipt.count}개를 파일로 만들었습니다.`,
    );
  }, [activeArtifact, document, exportFormat, projection, scopedPreflight]);

  const showRoundTrip = useCallback(() => {
    if (!document || parsePending) {
      setStatusMessage(
        "변경한 원문을 다시 해석한 뒤 Markdown을 비교해 주세요.",
      );
      return;
    }
    const markdown = exportTextAuthoringMarkdown(document);
    const receipt = checkMarkdownRoundTrip(document, { markdown });
    setRoundTrip({
      markdown,
      matchedCount: receipt.matchedCount,
      changedCount: receipt.changedCount,
      unresolvedCount: receipt.unresolvedCount,
      lossFields: receipt.lossFields,
    });
    setRoundTripOpen(true);
  }, [document, parsePending]);

  const copyTextResult = useCallback(async (
    kind: "raw" | "plain_text" | "markdown",
  ) => {
    if (!document || !projection) return;
    const content = kind === "raw"
      ? rawText
      : kind === "plain_text"
        ? serializeAuthoringPlainText(
            projection.title,
            projection.artifacts.memo.rows,
          )
        : exportTextAuthoringMarkdown(document);
    try {
      await navigator.clipboard.writeText(content);
      setStatusMessage(
        kind === "raw"
          ? "원문을 바꾸지 않고 그대로 복사했습니다."
          : kind === "plain_text"
            ? "항목과 상세를 정리한 TXT를 복사했습니다."
            : "v2 문법으로 정리한 Markdown을 복사했습니다.",
      );
    } catch {
      setStatusMessage("클립보드에 복사하지 못했습니다. 다시 시도해 주세요.");
      throw new Error("clipboard_write_failed");
    }
  }, [document, projection, rawText]);

  const copySourceSnapshot = useCallback(async () => {
    const snapshot = document?.sourceState?.active.rawText;
    if (!snapshot) {
      setStatusMessage("처음 붙여넣은 원문이 이 초안에 남아 있지 않습니다.");
      throw new Error("source_snapshot_missing");
    }
    try {
      await navigator.clipboard.writeText(snapshot);
      setStatusMessage("처음 붙여넣은 원문을 바꾸지 않고 복사했습니다.");
    } catch {
      setStatusMessage("클립보드에 복사하지 못했습니다. 다시 시도해 주세요.");
      throw new Error("clipboard_write_failed");
    }
  }, [document]);

  const closeSaveReceipt = useCallback(() => setSaveReceipt(null), []);
  const closeExportDialog = useCallback(() => setExportOpen(false), []);
  const closeRoundTripDialog = useCallback(() => setRoundTripOpen(false), []);
  const closeHistoryDialog = useCallback(() => setHistoryDraftId(null), []);
  const closeResetDialog = useCallback(() => {
    setResetConfirmOpen(false);
    setPendingExample(null);
  }, []);
  const openLibraryFromReceipt = useCallback(() => {
    setSaveReceipt(null);
    setLibraryOpen(true);
    refreshDrafts();
  }, [refreshDrafts]);

  const ensureActiveDraft = useCallback(() => {
    setActiveDraftId((current) => current ?? createLocalDraftId());
  }, []);

  const applyExample = useCallback(
    (example: TextAuthoringExample, clearRecovery: boolean) => {
      if (clearRecovery && repository && activeDraftId) {
        try {
          repository.clearRecovery(activeDraftId);
        } catch (error) {
          setStatusMessage(
            storageWriteFailureMessage("기존 복구본 정리", error),
          );
          return;
        }
      }
      setActiveDraftId(null);
      const next = createExampleDocument(example, ownership, stage);
      const firstItemId = next.parseResult.canonical.items[0]?.itemId ?? null;
      setDocument(next);
      setTitle(example.title);
      setSource(example.source);
      setRawText(
        example.previewAnchor
          ? writeSourceAnchorDate(example.rawText, example.previewAnchor)
          : example.rawText,
      );
      setOwnership(example.ownership ?? ownership);
      setOwnershipLocked(false);
      setSelectedItemId(firstItemId);
      setSelectedArtifact(
        normalizeArtifactKind(next.parseResult.canonical.flow.primaryArtifact),
      );
      setParsePending(false);
      setLiveApplyReceipt(null);
      setDirty(false);
      setLibraryOpen(false);
      setSaveReceipt(null);
      setExportOpen(false);
      setExportReceipt(null);
      setRoundTripOpen(false);
      setRoundTrip(null);
      setResetConfirmOpen(false);
      setPendingExample(null);
      resetInputScroll();
      setStatusMessage(
        `${example.label} 예시를 반영했습니다. ${example.inputLabel} 입력이 ${example.resultLabel} 결과로 바뀝니다.`,
      );
    },
    [activeDraftId, ownership, repository, resetInputScroll, stage],
  );

  const handleExampleSelect = useCallback(
    (example: TextAuthoringExample) => {
      if (dirty) {
        setPendingExample(example);
        setResetConfirmOpen(true);
        return;
      }
      applyExample(example, false);
    },
    [applyExample, dirty],
  );

  const inputPaneClass =
    stage === "input"
      ? "block h-full min-h-0 min-w-0 overflow-hidden"
      : "hidden h-full min-h-0 min-w-0 overflow-hidden min-[900px]:block";
  const resultPaneClass =
    stage === "input"
      ? "hidden h-full min-h-0 min-w-0 overflow-hidden min-[900px]:block"
      : "block h-full min-h-0 min-w-0 overflow-hidden";
  const workspaceGridClass = `grid min-h-[480px] grid-cols-1 grid-rows-[minmax(0,1fr)] overflow-hidden min-[900px]:grid-cols-[minmax(340px,0.9fr)_minmax(440px,1.35fr)] xl:min-h-[560px] xl:grid-cols-[minmax(380px,0.9fr)_minmax(560px,1.35fr)] ${
    stage === "result"
      ? "h-[calc(100dvh-16.75rem)] xl:h-[calc(100dvh-8rem)]"
      : "h-[calc(100dvh-15rem)] xl:h-[calc(100dvh-8rem)]"
  }`;
  const selectedSplitBoundary =
    pendingCorrection?.type === "split"
      ? pendingCorrection.boundaries.find(
          (boundary) => boundary.at === pendingCorrection.at,
        ) ?? null
      : null;
  const correctionDialogTitle =
    pendingCorrection?.type === "align"
      ? "입력 순서도 날짜순으로 맞출까요?"
      : pendingCorrection?.type === "merge"
        ? "두 항목을 합칠까요?"
        : "항목을 어디서 나눌까요?";
  const correctionDialogDescription =
    pendingCorrection?.type === "align"
      ? "미리보기뿐 아니라 왼쪽 원문의 항목 블록도 아래 순서로 바뀝니다. 한 번에 되돌릴 수 있습니다."
      : pendingCorrection?.type === "merge"
        ? "완료 기준·날짜·같은 속성의 값이 충돌하면 합치지 않습니다. 원문은 그대로 남습니다."
        : "선택한 경계를 확인한 뒤 적용합니다. 상세·날짜·자료는 두 항목에 함께 이어집니다.";
  const desktopSaveLabel = ownership === "personal"
    ? "개인 초안 저장"
    : ownership === "suggestion"
      ? "수정 제안 저장"
      : "제작자 초안 저장";

  return (
    <main
      data-testid="text-authoring-workspace"
      data-authoring-scope="namespaced-local-draft"
      data-library-open={libraryOpen}
      className="flowme-authoring-shell min-h-[100dvh] bg-[var(--flowme-bg)] text-[var(--flowme-text)]"
    >
      <div
        data-testid="text-authoring-root"
        className="mx-auto w-full max-w-[1440px] border-y border-[var(--flowme-border)] bg-[var(--flowme-surface)] xl:border-x"
      >
        <AuthoringWorkspaceHeader
          libraryOpen={libraryOpen}
          libraryToggleTestId={
            saveReceipt ? null : "ta-authoring-library-toggle"
          }
          onToggleLibrary={() => {
            setSaveReceipt(null);
            setLibraryOpen((current) => !current);
            refreshDrafts();
          }}
          onReset={requestResetWorkspace}
        />

        {libraryOpen ? (
          <DraftLibrary
            drafts={filteredDrafts}
            query={libraryQuery}
            filter={libraryFilter}
            onQueryChange={setLibraryQuery}
            onFilterChange={setLibraryFilter}
            onCreate={requestResetWorkspace}
            onOpen={openDraft}
            onDuplicate={(draftId) => {
              if (!repository) return;
              try {
                repository.duplicate(draftId);
              } catch (error) {
                setStatusMessage(storageWriteFailureMessage("초안 복사", error));
                return;
              }
              refreshDrafts(repository);
              setStatusMessage("원본과 분리된 복사본을 만들었습니다.");
            }}
            onArchive={(draftId) => {
              if (!repository) return;
              try {
                repository.archive(draftId);
              } catch (error) {
                setStatusMessage(storageWriteFailureMessage("초안 보관", error));
                return;
              }
              refreshDrafts(repository);
              setStatusMessage("초안을 보관했습니다. 삭제하지 않았습니다.");
            }}
            onRestore={(draftId) => {
              if (!repository) return;
              try {
                repository.restore(draftId);
              } catch (error) {
                setStatusMessage(storageWriteFailureMessage("초안 복원", error));
                return;
              }
              refreshDrafts(repository);
              setStatusMessage("보관한 초안을 복원했습니다.");
            }}
            onHistory={(draftId) => {
              if (!repository) return;
              setHistoryDraftId(draftId);
              setHistory(repository.getHistory(draftId));
            }}
          />
        ) : (
          <>
            <AuthoringStageNavigation
              stage={stage}
              canOpenResult={Boolean(document) && !parsePending}
              onStageChange={(nextStage) => {
                if (nextStage === "result") {
                  goToResult();
                } else {
                  setStage(nextStage);
                  if (document) {
                    setDocument(
                      withUiState(
                        document,
                        nextStage,
                        selectedItemId,
                        title,
                        ownership,
                      ),
                    );
                  }
                }
              }}
            />

            {recovery ? (
              <RecoveryBanner
                title={
                  recovery.document.title ||
                  recovery.document.parseResult.canonical.flow.title
                }
                onRecover={() => {
                  loadDocument(recovery.document, {
                    draftId: recovery.draftId,
                    stage: recovery.activeStage,
                    selectedItemId: recovery.selectedItemId,
                    primaryArtifact: recovery.primaryArtifact,
                  });
                  setDirty(true);
                  setRecovery(null);
                  setStatusMessage("작성 중이던 초안을 복구했습니다.");
                }}
                onDismiss={() => setRecovery(null)}
                onDiscard={() => {
                  if (repository) {
                    try {
                      repository.clearRecovery(recovery.draftId);
                    } catch (error) {
                      setStatusMessage(
                        storageWriteFailureMessage("복구본 삭제", error),
                      );
                      return;
                    }
                  }
                  setRecovery(null);
                  setStatusMessage(
                    "임시 복구본을 버렸습니다. 명시 저장한 초안은 그대로 남아 있습니다.",
                  );
                }}
              />
            ) : null}

            <AuthoringExampleSwitcher
              examples={TEXT_AUTHORING_EXAMPLES}
              validatedExamples={VALIDATED_TEXT_AUTHORING_EXAMPLES}
              activeExampleId={activeExampleId}
              activeScenarioId={dirty ? null : activeScenarioId}
              onSelect={handleExampleSelect}
              showQaCatalog={showQaCatalog}
            />

            <div className="relative overflow-hidden">
              <span
                data-testid="ta-osr-1024-two-pane"
                className="pointer-events-none absolute left-0 top-0 hidden h-px w-px min-[900px]:block xl:hidden"
                aria-hidden="true"
              />
              <span
                data-testid="ta-osr-1440-two-pane"
                className="pointer-events-none absolute left-0 top-0 hidden h-px w-px xl:block"
                aria-hidden="true"
              />
              <div
                ref={workspaceGridRef}
                className={workspaceGridClass}
              >
                <div
                  data-testid="ta02-390-input"
                  data-authoring-pane="input"
                  data-stage-active={stage === "input"}
                  className={inputPaneClass}
                >
                  <InputPane
                    title={title}
                    source={source}
                    rawText={rawText}
                    ownership={ownership}
                    ownershipLocked={ownershipLocked}
                    parsePending={parsePending}
                    liveUpdateBlocked={liveUpdateBlocked}
                    parseStatusLabel={parseStatusLabel}
                    liveAppliedItemCount={
                      liveApplyReceipt?.itemCount ?? null
                    }
                    scrollContainerRef={inputPaneScrollRef}
                    sourceTextAreaRef={sourceTextAreaRef}
                    onTitleChange={(value) => {
                      ensureActiveDraft();
                      const nextRawText = replaceMarkdownFlowTitle(
                        rawText,
                        value,
                      );
                      setTitle(value);
                      if (nextRawText !== rawText) {
                        setRawText(nextRawText);
                        setLiveApplyReceipt(null);
                        setParsePending(true);
                      }
                      setDocument((current) =>
                        current
                          ? withUiState(
                              nextRawText !== rawText
                                ? { ...current, rawText: nextRawText }
                                : current,
                              stage,
                              selectedItemId,
                              value,
                              ownership,
                            )
                          : current,
                      );
                      setDirty(true);
                    }}
                    onSourceChange={(value) => {
                      ensureActiveDraft();
                      setSource(value);
                      setLiveApplyReceipt(null);
                      setParsePending(true);
                      setDirty(true);
                    }}
                    onRawTextChange={(value) => {
                      ensureActiveDraft();
                      const markdownTitle = extractMarkdownFlowTitle(value);
                      if (markdownTitle) setTitle(markdownTitle);
                      setRawText(value);
                      setLiveApplyReceipt(null);
                      setParsePending(true);
                      setDirty(true);
                    }}
                    onOwnershipChange={(value) => {
                      if (ownershipLocked) {
                        setStatusMessage(
                          "구조를 만든 뒤에는 저장 성격을 바꿀 수 없습니다. 새 Flow에서 선택해 주세요.",
                        );
                        return;
                      }
                      ensureActiveDraft();
                      setOwnership(value);
                      if (document) {
                        setDocument(
                          withUiState(
                            document,
                            stage,
                            selectedItemId,
                            title,
                            value,
                          ),
                        );
                      }
                      setDirty(true);
                    }}
                  />
                </div>

                <div
                  data-testid="ta02-390-result"
                  data-authoring-pane="result"
                  data-stage-active={stage === "result"}
                  className={resultPaneClass}
                >
                  <ResultPane
                    projection={projection}
                    preflight={preflight}
                    unavailableMessage={resultUnavailableMessage}
                    repeatDefinitions={outline.items.flatMap((item) =>
                      item.included && item.repeat
                        ? [
                            {
                              itemId: item.itemId,
                              title: item.title,
                              repeat: item.repeat,
                            },
                          ]
                        : [],
                    )}
                    reviewGates={reviewGates}
                    sourceState={document?.sourceState}
                    userCorrectionCount={userCorrectionCount}
                    itemCount={outline.counts.included}
                    itemReviewCount={outline.issues.length}
                    selectedArtifact={activeArtifact}
                    anchor={anchor}
                    rawText={rawText}
                    sourceSnapshotText={document?.sourceState?.active.rawText}
                    canAlignSourceOrder={calendarSourceAlignment.differs}
                    hasUndo={Boolean(
                      document?.revision.operations.some(
                        (operation) => operation.type === "align_source_order",
                      ),
                    )}
                    onArtifactChange={setSelectedArtifact}
                    onAnchorChange={handleAnchorChange}
                    onAlignSourceOrder={handleAlignSourceToCalendar}
                    onCopyRawText={() => copyTextResult("raw")}
                    onCopySourceSnapshot={copySourceSnapshot}
                    onCopyStructuredText={() => copyTextResult("plain_text")}
                    onCopyStructuredMarkdown={() => copyTextResult("markdown")}
                    onUndo={() =>
                      performOperation(
                        { type: "undo" },
                        "바로 이전 변경을 되돌렸습니다.",
                      )
                    }
                    onEditItem={openInspector}
                    onOpenExport={requestOpenExport}
                    onOpenReview={() => setReviewOpen(true)}
                    onOpenSourceUpdate={() => setSourceUpdateOpen(true)}
                    onDeferSourceUpdate={handleDeferSourceUpdate}
                    onOpenRoundTrip={showRoundTrip}
                    onOpenItemReview={() => setItemReviewOpen(true)}
                    onReturnToInput={() => setStage("input")}
                    onSaveDraft={handleSave}
                    saveLabel={desktopSaveLabel}
                    saveDisabled={parsePending || !preflight?.eligible}
                  />
                </div>
              </div>
            </div>

            <footer className="ta-workspace-footer sticky bottom-0 z-30 border-t border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 min-[900px]:hidden">
              <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2">
                {stage === "result" ? (
                  <p className="basis-full text-center text-[10px] leading-4 text-[var(--flowme-text-tertiary)]">
                    이 기기에만 저장 · 공개되지 않음
                  </p>
                ) : null}
                {stage !== "input" ? (
                  <button
                    type="button"
                    className={FLOW_UI_SECONDARY_ACTION_CLASS}
                    onClick={() => setStage("input")}
                  >
                    입력 수정
                  </button>
                ) : null}
                <button
                  type="button"
                  data-testid={
                    stage === "input"
                      ? "ta-authoring-parse"
                      : "ta-authoring-save"
                  }
                  className={`${FLOW_UI_PRIMARY_ACTION_CLASS} ta-primary-action min-w-0 flex-1 justify-start text-left sm:ml-auto sm:max-w-xl`}
                  disabled={
                    parsePending
                      ? !rawText.trim()
                      : stage === "input"
                        ? !rawText.trim()
                        : !preflight?.eligible
                  }
                  onClick={runPrimaryAction}
                >
                  <span className="truncate">
                    {primaryLabel(
                      stage,
                      document,
                      outline.counts.included,
                      parsePending,
                      liveUpdateBlocked,
                      outstandingReviewCount,
                    )}
                  </span>
                </button>
              </div>
            </footer>
          </>
        )}
      </div>

      <p
        className="sr-only"
        aria-live="polite"
        data-testid="ta-authoring-status"
      >
        {statusMessage}
      </p>

      <ItemInspector
        item={selectedItem}
        open={inspectorOpen}
        onApply={applyItemPatch}
        onRestore={() => {
          if (!selectedItemId) return;
          const restored = performOperation(
            { type: "restore", itemId: selectedItemId },
            "선택 항목을 원문에서 처음 해석한 구조로 복구했습니다.",
          );
          if (restored) closeInspector();
        }}
        onClose={closeInspector}
      />

      <AuthoringDialog
        open={itemReviewOpen && Boolean(document)}
        testId="ta-authoring-item-review"
        title={
          outline.issues.length > 0
            ? `항목 검토 · 확인 ${outline.issues.length}개`
            : "항목 검토"
        }
        description={`${outline.counts.included}개 항목으로 해석했습니다. 필요할 때만 순서·묶음·역할을 고치세요.`}
        initialFocusSelector={
          outline.issues.length > 0
            ? '[data-testid="ta-authoring-issue-card"][data-issue-state="open"] button:not([disabled])'
            : undefined
        }
        size="wide"
        variant="drawer"
        keepMounted
        onClose={() => setItemReviewOpen(false)}
        footer={(
          <button
            type="button"
            data-testid="ta-authoring-item-review-close"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={() => setItemReviewOpen(false)}
          >
            검토 닫기
          </button>
        )}
      >
        <StructurePane
          embedded
          steps={outline.steps}
          counts={outline.counts}
          selectedItemId={selectedItemId}
          selectedItem={selectedItem}
          issues={outline.issues}
          stale={parsePending}
          hasUndo={Boolean(document && document.revisionHistory.length > 1)}
          canMergeNext={canMergeNext}
          onSelectItem={(itemId) => {
            if (window.matchMedia("(max-width: 899px)").matches) {
              setItemReviewOpen(false);
            }
            handleStructureItemActivate(itemId);
          }}
          onEditItem={(itemId) => {
            setItemReviewOpen(false);
            openInspector(itemId);
          }}
          onMove={handleMove}
          onMergeNext={() => {
            setItemReviewOpen(false);
            handleMergeNext();
          }}
          onSplit={() => {
            setItemReviewOpen(false);
            handleSplit();
          }}
          onRoleChange={(role: AuthoringRole) => {
            if (
              !selectedItemId ||
              !ROLE_VALUES.includes(role as CanonicalAuthoringItem["role"])
            ) {
              return;
            }
            performOperation(
              {
                type: "change_role",
                itemId: selectedItemId,
                role: role as CanonicalAuthoringItem["role"],
              },
              `${role} 역할로 바꿨습니다.`,
            );
          }}
          onToggleIncluded={() => {
            if (!selectedItemId || !selectedItem) return;
            performOperation(
              {
                type: selectedItem.included ? "exclude" : "include",
                itemId: selectedItemId,
              },
              selectedItem.included
                ? "현재 draft mapping에서 제외했습니다. 원문은 남아 있습니다."
                : "현재 draft mapping에 다시 포함했습니다.",
            );
          }}
          onResolveIssue={handleClassifyIssue}
          onUndo={() =>
            performOperation(
              { type: "undo" },
              "바로 이전 구조 변경을 되돌렸습니다.",
            )
          }
        />
      </AuthoringDialog>

      <AuthoringDialog
        open={Boolean(pendingCorrection)}
        testId={
          pendingCorrection
            ? `ta-authoring-${pendingCorrection.type}-confirm`
            : undefined
        }
        title={correctionDialogTitle}
        description={correctionDialogDescription}
        onClose={() => setPendingCorrection(null)}
        footer={(
          <>
            <button
              type="button"
              className={FLOW_UI_SECONDARY_ACTION_CLASS}
              onClick={() => setPendingCorrection(null)}
            >
              취소
            </button>
            <button
              type="button"
              data-testid={
                pendingCorrection
                  ? `ta-authoring-${pendingCorrection.type}-apply`
                  : undefined
              }
              className={FLOW_UI_PRIMARY_ACTION_CLASS}
              disabled={
                pendingCorrection?.type === "split" && !selectedSplitBoundary
              }
              onClick={handleConfirmCorrection}
            >
              {pendingCorrection?.type === "align"
                ? "이 순서로 적용"
                : pendingCorrection?.type === "merge"
                  ? "충돌 확인 후 합치기"
                  : "이 위치에서 나누기"}
            </button>
          </>
        )}
      >
        {pendingCorrection?.type === "align" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <section className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] p-3">
              <h3 className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
                현재 입력 순서
              </h3>
              <ol className="mt-2 space-y-1 text-sm">
                {pendingCorrection.beforeTitles.slice(0, 8).map((itemTitle, index) => (
                  <li key={`${itemTitle}-before-${index}`}>
                    {index + 1}. {itemTitle}
                  </li>
                ))}
              </ol>
            </section>
            <section className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-positive)] bg-[var(--flowme-positive-soft)] p-3">
              <h3 className="text-xs font-semibold text-[var(--flowme-positive-strong)]">
                적용할 날짜순
              </h3>
              <ol className="mt-2 space-y-1 text-sm">
                {pendingCorrection.afterTitles.slice(0, 8).map((itemTitle, index) => (
                  <li key={`${itemTitle}-after-${index}`}>
                    {index + 1}. {itemTitle}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        ) : pendingCorrection?.type === "merge" ? (
          <div className="space-y-2">
            <p className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] px-3 py-3 text-sm">
              1. {pendingCorrection.firstTitle}
            </p>
            <p className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] px-3 py-3 text-sm">
              2. {pendingCorrection.secondTitle}
            </p>
            <p className="text-xs leading-5 text-[var(--flowme-text-secondary)]">
              합친 제목은 두 제목을 순서대로 잇습니다. 값이 다른 속성은 임의로 고르지 않습니다.
            </p>
          </div>
        ) : pendingCorrection?.type === "split" ? (
          <div className="space-y-3">
            <label htmlFor="ta-authoring-split-boundary" className="block text-sm font-semibold">
              나눌 위치
            </label>
            <select
              id="ta-authoring-split-boundary"
              data-testid="ta-authoring-split-boundary"
              className={FLOW_UI_INPUT_CLASS}
              value={pendingCorrection.at}
              onChange={(event) => {
                const at = Number(event.target.value);
                setPendingCorrection((current) =>
                  current?.type === "split" ? { ...current, at } : current,
                );
              }}
            >
              {pendingCorrection.boundaries.map((boundary) => (
                <option key={boundary.at} value={boundary.at}>
                  {boundary.left} | {boundary.right}
                </option>
              ))}
            </select>
            {selectedSplitBoundary ? (
              <div className="grid gap-2 sm:grid-cols-2" aria-live="polite">
                <p className="rounded-[var(--flowme-radius-control)] bg-[var(--flowme-surface-subtle)] px-3 py-3 text-sm">
                  1. {selectedSplitBoundary.left}
                </p>
                <p className="rounded-[var(--flowme-radius-control)] bg-[var(--flowme-surface-subtle)] px-3 py-3 text-sm">
                  2. {selectedSplitBoundary.right}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </AuthoringDialog>

      <AuthoringReviewDialog
        open={reviewOpen && reviewGates.length > 0}
        gates={reviewGates}
        ownership={ownership}
        sourceLabel={source.trim() || "연결된 출처 이름 없음"}
        onRecord={handleRecordReview}
        onClose={() => setReviewOpen(false)}
      />

      <SourceUpdateDialog
        open={sourceUpdateOpen && Boolean(pendingSourceState)}
        state={pendingSourceState}
        userCorrectionCount={userCorrectionCount}
        onResolve={handleResolveSourceUpdate}
        onApply={handleApplySourceUpdate}
        onReject={handleRejectSourceUpdate}
        onLater={handleDeferSourceUpdate}
      />

      <SaveReceiptDialog
        open={Boolean(saveReceipt)}
        receipt={saveReceipt}
        onClose={closeSaveReceipt}
        onContinue={closeSaveReceipt}
        onOpenLibrary={openLibraryFromReceipt}
      />

      <ExportPreflightDialog
        open={exportOpen}
        preflight={scopedPreflight}
        scope={exportScope}
        format={exportFormat}
        receipt={exportReceipt}
        onScopeChange={(nextScope) => {
          setExportScope(nextScope);
          setExportReceipt(null);
        }}
        onFormatChange={(nextFormat) => {
          setExportFormat(nextFormat);
          setExportReceipt(null);
        }}
        onConfirm={handleExportConfirm}
        onClose={closeExportDialog}
      />

      <RoundTripDialog
        open={roundTripOpen}
        value={roundTrip}
        onClose={closeRoundTripDialog}
      />

      <HistoryDialog
        open={Boolean(historyDraftId)}
        title={historyRecord?.title ?? "Flow 초안"}
        history={history}
        onRestore={(versionId) => {
          if (!repository || !historyDraftId) return;
          let record: TextAuthoringDraftRecord;
          try {
            record = repository.restoreVersion(historyDraftId, versionId);
          } catch (error) {
            setStatusMessage(storageWriteFailureMessage("저장본 복원", error));
            return;
          }
          setHistory(repository.getHistory(historyDraftId));
          refreshDrafts(repository);
          loadDocument(record.document, {
            draftId: record.draftId,
            stage: record.activeStage,
            selectedItemId: record.selectedItemId,
            primaryArtifact: record.primaryArtifact,
          });
          setStatusMessage("선택한 revision을 새 저장본으로 복원했습니다.");
          setHistoryDraftId(null);
        }}
        onClose={closeHistoryDialog}
      />

      <ResetAuthoringDialog
        open={resetConfirmOpen}
        onClose={closeResetDialog}
        onDiscard={() => {
          if (pendingExample) {
            applyExample(pendingExample, true);
            return;
          }
          resetWorkspace();
        }}
        {...(pendingExample
          ? {
              title: `${pendingExample.label} 예시로 바꿀까요?`,
              description:
                "현재 작성 중인 원문·구조 수정은 버리고 선택한 예시를 엽니다. 이미 저장한 초안은 초안 목록에 남습니다.",
              confirmLabel: "변경사항 버리고 예시 보기",
              notice:
                "선택한 예시는 둘러보기 상태로 열립니다. 예시를 직접 수정하기 전에는 임시 초안을 만들지 않습니다.",
            }
          : {})}
      />
    </main>
  );
}
