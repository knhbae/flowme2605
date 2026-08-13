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
import { locateAuthoringSource } from "@/lib/flow/text-authoring/long-document-table";
import { isTextAuthoringP1LongDocumentTableEnabled } from "@/lib/flow/text-authoring/text-authoring-feature-flags";
import {
  extractMarkdownFlowTitle,
  replaceMarkdownFlowTitle,
} from "@/lib/flow/text-authoring/authoring-grammar";
import {
  checkMarkdownRoundTrip,
  exportTextAuthoringMarkdown,
} from "@/lib/flow/text-authoring/markdown-roundtrip";
import { applyAuthoringOperation } from "@/lib/flow/text-authoring/operations";
import {
  buildTextAuthoringLongDocumentRuntimeView,
  createTextAuthoringDocument,
} from "@/lib/flow/text-authoring/parser";
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
import { createAuthoringSourceUpdateCandidate } from "@/lib/flow/text-authoring/source-update";
import { compareTextAuthoringSources } from "@/lib/flow/text-authoring/source-comparison";
import { createTextAuthoringServiceStateFromDocument } from "@/lib/flow/text-authoring/service-state";
import {
  TextAuthoringStorageReadError,
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
  SourceComparisonDialog,
  type AuthoringExportReceiptView,
  type AuthoringRoundTripView,
} from "./AuthoringOverlays";
import { DraftLibrary, type AuthoringLibraryFilter } from "./DraftLibrary";
import { InputPane } from "./InputPane";
import { ItemInspector } from "./ItemInspector";
import { LongDocumentNavigator } from "./LongDocumentNavigator";
import { ResultPane } from "./ResultPane";
import { SourceUpdateDialog } from "./SourceUpdateDialog";
import { StructurePane } from "./StructurePane";
import type {
  AuthoringItemPatch,
  AuthoringLongDocumentFocusView,
  AuthoringReceiptView,
  AuthoringSourceLocatorView,
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
  composeRawPreservedTextResult,
  buildAuthoringLongDocumentLossLocatorViews,
  buildAuthoringSourceLocatorViews,
  buildAuthoringTableRowLocatorViews,
  buildAuthoringTableLossView,
  formatKoreanDateTime,
  normalizeArtifactKind,
  parseAuthoringLongDocumentFocus,
  resolveAuthoringSourceLocatorView,
  serializeAuthoringLongDocumentFocus,
  shouldUseRawPreservedTextResult,
  toDraftView,
  toSaveReceiptView,
} from "./view-model";

const ARTIFACT_LABEL: Record<AuthoringArtifactKind, string> = {
  calendar: "캘린더",
  todo: "할 일",
  sheet: "표·Excel",
  memo: "TXT",
};

const ROLE_VALUES: CanonicalAuthoringItem["role"][] = [
  "item",
  "resource",
  "guide",
  "caution",
  "completion",
];

const DEFAULT_FINITE_OCCURRENCE_LIMIT = 30;
const DEFAULT_OPEN_ENDED_OCCURRENCE_WEEKS = 4;

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
  focusTargetOverride?: string,
): TextAuthoringDocument {
  const effectiveTitle =
    extractMarkdownFlowTitle(document.rawText) ||
    title.trim() ||
    document.title ||
    document.parseResult.canonical.flow.title;
  const longDocumentFocus = parseAuthoringLongDocumentFocus(
    focusTargetOverride ?? document.uiState?.focusTarget,
  );
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
      focusTarget: longDocumentFocus
        ? serializeAuthoringLongDocumentFocus(longDocumentFocus)
        : selectedItemId
          ? `item:${selectedItemId}`
          : "source",
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

type PendingWorkspaceExit =
  | { type: "library" }
  | { type: "draft"; draftId: string }
  | { type: "history"; href: string; navigationKey: string };

type BrowserNavigationEvent = Event & {
  navigationType: string;
  destination: {
    key: string;
    url: string;
  };
};

type BrowserNavigation = EventTarget & {
  traverseTo: (key: string) => {
    finished: Promise<unknown>;
  };
};

function getBrowserNavigation(): BrowserNavigation | null {
  return (
    (
      window as typeof window & {
        navigation?: BrowserNavigation;
      }
    ).navigation ?? null
  );
}

type SourceCorrectionReturnTarget = {
  artifact: AuthoringArtifactKind;
  itemId?: string;
  focusTestId?: string;
  focusLocatorId?: string;
  locatorId?: string;
  sourceScrollTop?: number;
  sourceTextBeforeEdit: string;
};

function resultSourceTargetSelector(
  focusTestId: string | undefined,
  focusLocatorId: string | undefined,
): string | null {
  if (!focusTestId) return null;
  return `[data-testid="${CSS.escape(focusTestId)}"]${
    focusLocatorId ? `[data-locator-id="${CSS.escape(focusLocatorId)}"]` : ""
  }`;
}

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

function storageWriteFailureMessage(action: string, error: unknown): string {
  if (error instanceof TextAuthoringStorageReadError) {
    const reason =
      error.code === "schema_mismatch"
        ? "저장 데이터의 버전이 현재 화면과 다릅니다."
        : error.code === "corrupted"
          ? "저장 데이터가 손상되어 안전하게 열 수 없습니다."
          : "브라우저 저장 데이터를 읽지 못했습니다.";
    return `${action}하지 못했습니다. ${reason} 기존 저장 데이터와 현재 화면은 그대로 유지합니다.`;
  }
  const detail =
    error instanceof Error ? `${error.name} ${error.message}` : String(error);
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
  return (
    error instanceof Error &&
    /unsupported semantic changes/iu.test(error.message)
  );
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

export function resolveTextAuthoringP1LongDocumentTableProductGate({
  productMode,
  override,
  environmentValue,
}: {
  productMode: boolean;
  override?: boolean;
  environmentValue?: string;
}): boolean {
  const normalizedEnvironment = environmentValue?.trim().toLowerCase();
  const environmentEnabled = !["0", "false", "off"].includes(
    normalizedEnvironment ?? "",
  );
  return isTextAuthoringP1LongDocumentTableEnabled({
    enabled: productMode && (override ?? environmentEnabled),
  });
}

export function resolveTextAuthoringLongDocumentRuntimeDocument(
  document: TextAuthoringDocument | null,
  {
    productMode,
    enabled,
  }: {
    productMode: boolean;
    enabled: boolean;
  },
): TextAuthoringDocument | null {
  if (
    !document ||
    !productMode ||
    enabled ||
    document.features?.longDocumentTable !== true
  ) {
    return document;
  }
  return buildTextAuthoringLongDocumentRuntimeView(document, false);
}

export type TextAuthoringWorkspaceProps = {
  showQaCatalog?: boolean;
  productMode?: boolean;
  initialView?: "library" | "editor";
  initialDraftId?: string;
  initialSaveReceipt?: AuthoringReceiptView | null;
  p1LongDocumentTableEnabled?: boolean;
  onNavigateDraft?: (
    draftId: string | null,
    options?: {
      replace?: boolean;
      preserveWorkspace?: boolean;
      saveReceipt?: AuthoringReceiptView;
    },
  ) => void;
  onNavigateNew?: () => void;
};

export function TextAuthoringWorkspace({
  showQaCatalog = false,
  productMode = false,
  initialView = "editor",
  initialDraftId,
  initialSaveReceipt,
  p1LongDocumentTableEnabled,
  onNavigateDraft,
  onNavigateNew,
}: TextAuthoringWorkspaceProps = {}) {
  const longDocumentTableGateEnabled =
    resolveTextAuthoringP1LongDocumentTableProductGate({
      productMode,
      override: p1LongDocumentTableEnabled,
      environmentValue:
        process.env.NEXT_PUBLIC_FLOWME_TEXT_AUTHORING_P1_LONG_DOCUMENT_TABLE,
    });
  const [repository, setRepository] =
    useState<TextAuthoringDraftRepository | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [draftRecords, setDraftRecords] = useState<TextAuthoringDraftRecord[]>(
    [],
  );
  const [document, setDocument] = useState<TextAuthoringDocument | null>(() =>
    productMode ? null : DEFAULT_EXAMPLE_DOCUMENT,
  );
  const [title, setTitle] = useState(() =>
    productMode ? "" : SIMPLE_TEXT_AUTHORING_EXAMPLE.title,
  );
  const [draftName, setDraftName] = useState(() =>
    productMode ? "" : SIMPLE_TEXT_AUTHORING_EXAMPLE.title,
  );
  const [source, setSource] = useState(() =>
    productMode ? "" : SIMPLE_TEXT_AUTHORING_EXAMPLE.source,
  );
  const [rawText, setRawText] = useState(() =>
    productMode ? "" : SIMPLE_TEXT_AUTHORING_EXAMPLE.rawText,
  );
  const anchor = useMemo(() => sourceAnchorDate(rawText), [rawText]);
  const [ownership, setOwnership] =
    useState<TextAuthoringOwnership>("personal");
  const [ownershipLocked, setOwnershipLocked] = useState(false);
  const [stage, setStage] = useState<AuthoringStage>("input");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    productMode ? null : DEFAULT_EXAMPLE_ITEM_ID,
  );
  const [selectedArtifact, setSelectedArtifact] =
    useState<AuthoringArtifactKind>(
      productMode
        ? "memo"
        : normalizeArtifactKind(
            DEFAULT_EXAMPLE_DOCUMENT.parseResult.canonical.flow.primaryArtifact,
          ),
    );
  const [finiteOccurrenceLimit, setFiniteOccurrenceLimit] = useState(
    DEFAULT_FINITE_OCCURRENCE_LIMIT,
  );
  const [openEndedOccurrenceWeeks, setOpenEndedOccurrenceWeeks] = useState(
    DEFAULT_OPEN_ENDED_OCCURRENCE_WEEKS,
  );
  const [parsePending, setParsePending] = useState(false);
  const [liveApplyReceipt, setLiveApplyReceipt] = useState<{
    itemCount: number;
  } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(
    productMode && initialView === "library",
  );
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
  const [sourceComparisonOpen, setSourceComparisonOpen] = useState(false);
  const [documentNavigatorOpen, setDocumentNavigatorOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [pendingExample, setPendingExample] =
    useState<TextAuthoringExample | null>(null);
  const [pendingWorkspaceExit, setPendingWorkspaceExit] =
    useState<PendingWorkspaceExit | null>(null);
  const [pendingCorrection, setPendingCorrection] =
    useState<PendingCorrection | null>(null);
  const [sourceCorrectionReturnTarget, setSourceCorrectionReturnTarget] =
    useState<SourceCorrectionReturnTarget | null>(null);
  const [pendingResultFocusTarget, setPendingResultFocusTarget] =
    useState<SourceCorrectionReturnTarget | null>(null);
  const [selectedSourceLocatorId, setSelectedSourceLocatorId] = useState<
    string | null
  >(null);
  const inspectorReturnFocusRef = useRef<HTMLElement | null>(null);
  const workspaceGridRef = useRef<HTMLDivElement | null>(null);
  const inputPaneScrollRef = useRef<HTMLDivElement | null>(null);
  const sourceTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const initialDraftOpenedRef = useRef<string | null>(null);
  const restoredSourceFocusRef = useRef<string | null>(null);
  const allowBrowserExitRef = useRef(false);

  useEffect(() => {
    setFiniteOccurrenceLimit(DEFAULT_FINITE_OCCURRENCE_LIMIT);
    setOpenEndedOccurrenceWeeks(DEFAULT_OPEN_ENDED_OCCURRENCE_WEEKS);
  }, [document?.documentId]);

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
    if (stage === "input" && selectedSourceLocatorId) return;

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
  }, [selectedSourceLocatorId, stage]);

  useEffect(() => {
    if (!liveApplyReceipt) return;
    const timer = window.setTimeout(() => setLiveApplyReceipt(null), 1600);
    return () => window.clearTimeout(timer);
  }, [liveApplyReceipt]);

  const refreshDrafts = useCallback(
    (nextRepository: TextAuthoringDraftRepository | null = repository) => {
      if (!nextRepository) return;
      try {
        setDraftRecords(nextRepository.listRecords({ includeArchived: true }));
      } catch (error) {
        setStatusMessage(storageWriteFailureMessage("저장 목록 확인", error));
      }
    },
    [repository],
  );

  useEffect(() => {
    const storage = getDefaultTextAuthoringStorage();
    if (!storage) return;
    const nextRepository = createTextAuthoringDraftRepository(storage);
    setRepository(nextRepository);
    try {
      setDraftRecords(nextRepository.listRecords({ includeArchived: true }));
      // A saved product draft selects only its own newer recovery when opened.
      // The blank /flows/new shell still exposes the latest orphan recovery so
      // a crash before the first explicit save does not strand the working text.
      setRecovery(
        productMode
          ? initialView === "editor" && !initialDraftId
            ? (nextRepository.loadRecovery() ?? null)
            : null
          : (nextRepository.loadRecovery() ?? null),
      );
    } catch (error) {
      setStatusMessage(storageWriteFailureMessage("저장 목록 확인", error));
    }
  }, [initialDraftId, initialView, productMode]);

  useEffect(() => {
    if (!dirty) return;
    const preventUnsavedExit = (event: BeforeUnloadEvent) => {
      if (allowBrowserExitRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventUnsavedExit);
    return () => window.removeEventListener("beforeunload", preventUnsavedExit);
  }, [dirty]);

  useEffect(() => {
    if (!productMode || !dirty) return;
    const browserNavigation = getBrowserNavigation();
    if (!browserNavigation) return;

    const preventSpaHistoryExit = (nativeEvent: Event) => {
      if (allowBrowserExitRef.current) return;
      const event = nativeEvent as BrowserNavigationEvent;
      if (event.navigationType !== "traverse" || !event.cancelable) return;
      if (!event.destination?.key || !event.destination.url) return;

      const destination = new URL(event.destination.url, window.location.href);
      if (destination.origin !== window.location.origin) return;

      event.preventDefault();
      if (!event.defaultPrevented) return;
      setPendingExample(null);
      setPendingWorkspaceExit({
        type: "history",
        href: destination.href,
        navigationKey: event.destination.key,
      });
      setResetConfirmOpen(true);
      setStatusMessage(
        "저장하지 않은 변경이 있어 이동을 멈췄습니다. 계속 작성하거나 변경을 버릴 수 있습니다.",
      );
    };
    browserNavigation.addEventListener("navigate", preventSpaHistoryExit);
    return () =>
      browserNavigation.removeEventListener("navigate", preventSpaHistoryExit);
  }, [dirty, productMode]);

  useEffect(() => {
    if (!dirty || !repository || !activeDraftId) return;
    const record = repository.load(activeDraftId);
    if (!record?.readyReceipt && record?.status !== "ready") return;
    try {
      repository.invalidateReady(activeDraftId);
      refreshDrafts(repository);
      setStatusMessage(
        "내용이 바뀌어 준비 완료 표시를 해제했습니다. 다시 저장한 뒤 표시할 수 있습니다.",
      );
    } catch (error) {
      setStatusMessage(storageWriteFailureMessage("준비 상태 갱신", error));
    }
  }, [activeDraftId, dirty, refreshDrafts, repository]);

  const effectiveDocument = useMemo(() => {
    return resolveTextAuthoringLongDocumentRuntimeDocument(document, {
      productMode,
      enabled: longDocumentTableGateEnabled,
    });
  }, [document, longDocumentTableGateEnabled, productMode]);
  const outline = useMemo(
    () => buildAuthoringOutlineView(effectiveDocument),
    [effectiveDocument],
  );
  const sourceLocatorViews = useMemo(
    () => buildAuthoringSourceLocatorViews(effectiveDocument, outline.issues),
    [effectiveDocument, outline.issues],
  );
  const longDocumentAnalysis = effectiveDocument?.parseResult.longDocument;
  const sourceFocusLocatorViews = useMemo(
    () => [
      ...sourceLocatorViews,
      ...buildAuthoringTableRowLocatorViews(longDocumentAnalysis),
      ...buildAuthoringLongDocumentLossLocatorViews(longDocumentAnalysis),
    ],
    [longDocumentAnalysis, sourceLocatorViews],
  );
  const runtimeRawFallbackActive = Boolean(
    productMode &&
    document?.features?.longDocumentTable === true &&
    !longDocumentTableGateEnabled &&
    (longDocumentAnalysis?.fallbackActive ||
      longDocumentAnalysis?.status === "txt-only"),
  );
  const rawPreservedTextResult = Boolean(
    productMode &&
    shouldUseRawPreservedTextResult(effectiveDocument, {
      runtimeFallbackActive: runtimeRawFallbackActive,
    }),
  );
  const tableLossView = useMemo(
    () =>
      longDocumentTableGateEnabled
        ? buildAuthoringTableLossView(longDocumentAnalysis)
        : null,
    [longDocumentAnalysis, longDocumentTableGateEnabled],
  );
  const showDocumentNavigator = Boolean(
    rawPreservedTextResult &&
    longDocumentTableGateEnabled &&
    sourceLocatorViews.length > 1 &&
    ((longDocumentAnalysis?.budget.lineCount ?? 0) >= 20 ||
      (longDocumentAnalysis?.blocks.length ?? 0) >= 3 ||
      (longDocumentAnalysis?.tables.length ?? 0) > 0 ||
      outline.issues.length > 0),
  );
  const firstSourceError = productMode ? outline.issues[0] : undefined;
  const sourceError = firstSourceError
    ? {
        id: "text-authoring-source-error",
        message: `${firstSourceError.sourceLineLabel}. ${firstSourceError.reason} ${firstSourceError.blockedResult}`,
      }
    : null;
  const sourceComparison = useMemo(() => {
    const firstSource = document?.sourceState?.active.rawText;
    if (firstSource === undefined) return null;
    return compareTextAuthoringSources(firstSource, rawText);
  }, [document?.sourceState?.active.rawText, rawText]);
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
  const activeDraftRecord = activeDraftId
    ? (draftRecords.find((record) => record.draftId === activeDraftId) ?? null)
    : null;
  const activeDraftReady = activeDraftRecord?.status === "ready";
  const hasBlockingReadyIssue = Boolean(
    document?.parseResult.issues.some(
      (issue) => issue.blocking && !issue.decision && !issue.resolution,
    ),
  );
  const readyBlockedReason = activeDraftReady
    ? "현재 저장본을 준비 완료로 표시했습니다."
    : !activeDraftRecord?.coherentRevisionPair ||
        !activeDraftRecord.explicitSaveReceipt
      ? "먼저 현재 결과를 초안으로 저장해 주세요."
      : dirty
        ? "저장되지 않은 변경을 먼저 초안으로 저장해 주세요."
        : parsePending
          ? "결과 계산이 끝난 뒤 준비 완료로 표시할 수 있습니다."
          : hasBlockingReadyIssue
            ? "차단된 입력을 수정한 뒤 다시 저장해 주세요."
            : "저장된 현재 결과를 준비 완료로 표시할 수 있습니다.";
  const canMarkReady = Boolean(
    activeDraftRecord?.coherentRevisionPair &&
    activeDraftRecord.explicitSaveReceipt &&
    !activeDraftReady &&
    !dirty &&
    !parsePending &&
    !hasBlockingReadyIssue,
  );
  const currentSourceMetadata =
    document?.sourceUrl || document?.sourceTitle || "";
  const workingTextInputChanged = Boolean(
    document && rawText !== document.rawText,
  );
  const sourceMetadataChanged = Boolean(
    document && source.trim() !== currentSourceMetadata,
  );
  const sourceUpdateProtected = Boolean(
    sourceMetadataChanged &&
    (hasPersistedActiveDraft || (document?.revisionHistory.length ?? 0) > 1),
  );
  const workingTextRequiresRevisionSync = Boolean(
    workingTextInputChanged &&
    (hasPersistedActiveDraft || (document?.revisionHistory.length ?? 0) > 1),
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
  const selectedCanonicalItem =
    effectiveDocument?.parseResult.canonical.items.find(
      (item) => item.itemId === selectedItemId,
    );
  const selectedCanonicalStep =
    effectiveDocument?.parseResult.canonical.steps.find(
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
    if (!effectiveDocument) {
      return { value: null, error: "" };
    }
    try {
      return {
        value: buildAuthoringArtifactProjection(effectiveDocument, {
          ...(anchor ? { anchor } : {}),
          finiteOccurrenceLimit,
          openEndedOccurrenceWeeks,
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
  }, [
    anchor,
    effectiveDocument,
    finiteOccurrenceLimit,
    openEndedOccurrenceWeeks,
  ]);
  const projection = projectionState.value;
  const sourceOnlyTextRows = useMemo(() => {
    if (!effectiveDocument) return [] as string[];
    const sourceOnlyRowIds = new Set(
      effectiveDocument.parseResult.issues
        .filter((issue) => issue.decision?.outcome !== "convert_to_item")
        .flatMap((issue) => issue.sourceRowIds),
    );
    return effectiveDocument.parseResult.canonical.sourceRows
      .filter(
        (row) =>
          row.state !== "tombstone" && sourceOnlyRowIds.has(row.sourceRowId),
      )
      .map((row) => row.rawText.trim())
      .filter(
        (value, index, values) =>
          Boolean(value) && values.indexOf(value) === index,
      );
  }, [effectiveDocument]);
  const textResultValues = useMemo(() => {
    if (!effectiveDocument || !projection) return undefined;
    return {
      raw: rawText,
      structured_plain_text: rawPreservedTextResult
        ? composeRawPreservedTextResult(rawText, projection.artifacts.memo.rows)
        : serializeAuthoringPlainText(
            projection.title,
            projection.artifacts.memo.rows,
            sourceOnlyTextRows,
          ),
      structured_markdown: exportTextAuthoringMarkdown(effectiveDocument),
    };
  }, [
    effectiveDocument,
    projection,
    rawPreservedTextResult,
    rawText,
    sourceOnlyTextRows,
  ]);

  const activeArtifact =
    projection?.artifacts[selectedArtifact]?.eligible ||
    (productMode && selectedArtifact === "sheet" && tableLossView)
      ? selectedArtifact
      : (projection?.primaryArtifact ?? selectedArtifact);

  const calendarSourceAlignment = useMemo(() => {
    if (!effectiveDocument || !projection?.artifacts.calendar.eligible) {
      return {
        differs: false,
        orderedItemIds: [] as string[],
        beforeTitles: [] as string[],
        afterTitles: [] as string[],
      };
    }
    const calendarRank = new Map<string, number>();
    projection.artifacts.calendar.rows.forEach((row, index) => {
      if (!calendarRank.has(row.itemId)) {
        calendarRank.set(row.itemId, index);
      }
    });
    const itemById = new Map(
      effectiveDocument.parseResult.canonical.items.map((item) => [
        item.itemId,
        item,
      ]),
    );
    let differs = false;
    const beforeTitles: string[] = [];
    const afterTitles: string[] = [];
    const orderedItemIds = effectiveDocument.parseResult.canonical.steps
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
  }, [effectiveDocument, projection]);

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
        ...(productMode
          ? {
              longDocumentTable: {
                enabled: longDocumentTableGateEnabled,
              },
            }
          : {}),
        ...(trimmedSource && isWebUrl(trimmedSource)
          ? { sourceUrl: trimmedSource }
          : trimmedSource
            ? { sourceTitle: trimmedSource }
            : {}),
      });
    },
    [
      longDocumentTableGateEnabled,
      ownership,
      productMode,
      rawText,
      source,
      title,
    ],
  );

  useEffect(() => {
    if (!repository || !activeDraftId || !dirty || !rawText.trim()) return;
    const timer = window.setTimeout(() => {
      const recoveryDocument =
        document && !parsePending
          ? withUiState(document, stage, selectedItemId, title, ownership)
          : withUiState(
              createFromCurrentInput(document?.documentId),
              stage,
              selectedItemId,
              title,
              ownership,
              document?.uiState?.focusTarget,
            );
      const recoveryDocumentWithSnapshot =
        document?.sourceState?.active &&
        recoveryDocument.sourceState &&
        parsePending
          ? {
              ...recoveryDocument,
              sourceState: {
                status: "current" as const,
                active: document.sourceState.active,
              },
            }
          : recoveryDocument;
      try {
        const recoveryServiceState =
          createTextAuthoringServiceStateFromDocument(
            recoveryDocumentWithSnapshot,
            {
              draftId: activeDraftId,
              projectionOptions: {
                ...(anchor ? { anchor } : {}),
                finiteOccurrenceLimit,
                openEndedOccurrenceWeeks,
              },
            },
          );
        repository.saveCoherentRecovery(recoveryServiceState, {
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
    anchor,
    createFromCurrentInput,
    dirty,
    document,
    finiteOccurrenceLimit,
    openEndedOccurrenceWeeks,
    ownership,
    parsePending,
    rawText,
    repository,
    selectedItemId,
    stage,
    title,
  ]);

  const applyCurrentInput = useCallback(
    (mode: "live" | "manual") => {
      if (mode === "manual") setLiveApplyReceipt(null);
      if (pendingSourceState) {
        if (mode === "manual") setSourceUpdateOpen(true);
        setStatusMessage(
          "먼저 보존해 둔 원문 변경을 적용하거나 나중에 볼지 확인해 주세요.",
        );
        return;
      }
      const next = createFromCurrentInput(document?.documentId);
      if (document && workingTextRequiresRevisionSync) {
        try {
          const trimmedSource = source.trim();
          const synced = applyAuthoringOperation(
            document,
            {
              type: "sync_working_text_from_input",
              rawText,
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
            },
            { actorLane: ownership },
          );
          if (synced === document) {
            setParsePending(false);
            setStatusMessage(
              "작업 원문을 다시 해석하지 못했습니다. 마지막으로 반영된 결과를 유지합니다.",
            );
            return;
          }
          const nextSelectedItemId = synced.parseResult.canonical.items.some(
            (item) => item.itemId === selectedItemId,
          )
            ? selectedItemId
            : (synced.parseResult.canonical.items[0]?.itemId ?? null);
          const nextStage = mode === "live" ? stage : "result";
          setActiveDraftId((current) => current ?? createLocalDraftId());
          setDocument(
            withUiState(
              synced,
              nextStage,
              nextSelectedItemId,
              title,
              ownership,
            ),
          );
          if (mode === "manual") setOwnershipLocked(true);
          setSelectedItemId(nextSelectedItemId);
          setParsePending(false);
          setLiveApplyReceipt(
            mode === "live"
              ? { itemCount: synced.parseResult.canonical.items.length }
              : null,
          );
          setDirty(true);
          setStage(nextStage);
          setLibraryOpen(false);
          setStatusMessage(
            `${synced.parseResult.canonical.steps.length}단계 · ${synced.parseResult.canonical.items.length}개 항목을 ${mode === "live" ? "자동 반영했습니다." : "만들었습니다."}`,
          );
          return;
        } catch {
          setParsePending(false);
          setStatusMessage(
            "작업 원문을 다시 해석하지 못했습니다. 마지막으로 반영된 결과를 유지합니다.",
          );
          return;
        }
      }
      if (!rawText.trim() && !workingTextInputChanged) {
        setStatusMessage("Flow로 만들 원문이나 메모를 먼저 입력해 주세요.");
        if (mode === "manual") {
          window.document
            .querySelector<HTMLElement>('[data-testid="ta-authoring-source"]')
            ?.focus();
        }
        setParsePending(false);
        return;
      }
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
              withUiState(staged, nextStage, selectedItemId, title, ownership),
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
          setParsePending(false);
          setStatusMessage(
            isUnsupportedSourceSemanticError(error)
              ? "현재 비교가 지원하지 않는 원문 변경이 있어 기존 결과를 유지했습니다. 이 원문은 새 초안으로 시작하거나 변경 폭을 줄여 주세요."
              : "새 원문과 현재 결과를 비교하지 못했습니다. 원문은 바꾸지 않았습니다.",
          );
          return;
        }
      }
      setActiveDraftId((current) => current ?? createLocalDraftId());
      const nextSelectedItemId = next.parseResult.canonical.items.some(
        (item) => item.itemId === selectedItemId,
      )
        ? selectedItemId
        : (next.parseResult.canonical.items[0]?.itemId ?? null);
      const nextStage = mode === "live" ? stage : "result";
      setDocument(
        withUiState(
          next,
          nextStage,
          nextSelectedItemId,
          title,
          ownership,
          document?.uiState?.focusTarget,
        ),
      );
      if (mode === "manual") setOwnershipLocked(true);
      setSelectedItemId(nextSelectedItemId);
      if (mode === "manual") {
        setSelectedArtifact(
          normalizeArtifactKind(
            next.parseResult.canonical.flow.primaryArtifact,
          ),
        );
      }
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
    },
    [
      createFromCurrentInput,
      document,
      ownership,
      pendingSourceState,
      rawText,
      selectedItemId,
      sourceUpdateProtected,
      stage,
      source,
      title,
      workingTextInputChanged,
      workingTextRequiresRevisionSync,
    ],
  );

  const handleParse = useCallback(
    () => applyCurrentInput("manual"),
    [applyCurrentInput],
  );

  const handleAnchorChange = useCallback(
    (value: string) => {
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
    },
    [rawText],
  );

  useEffect(() => {
    if (!parsePending || pendingSourceState) return;
    const timer = window.setTimeout(() => {
      applyCurrentInput("live");
    }, 180);
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
        setTitle(extractMarkdownFlowTitle(next.rawText) || next.title || title);
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
        decision?.outcome === "convert_to_item" ? decision.targetDraftId : null;
      const nextSelectedItemId = convertedItemId ?? selectedItemId;
      setActiveDraftId((current) => current ?? createLocalDraftId());
      setDocument(
        withUiState(next, stage, nextSelectedItemId, title, ownership),
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
        .querySelector<HTMLElement>(
          '[data-testid="ta-authoring-item-review-open"]',
        )
        ?.focus();
    });
  }, []);

  const applyItemPatch = useCallback(
    (patch: AuthoringItemPatch) => {
      if (!document || !selectedItem) return false;
      const applied = performOperation(
        {
          type: "sync_item_to_working_text",
          itemId: selectedItem.itemId,
          patch: {
            ...patch,
            title: patch.title.trim(),
          },
        },
        "작업 원문과 모든 결과에 함께 반영했습니다.",
      );
      if (!applied) {
        setStatusMessage(
          "이 항목은 우측에서 안전하게 바꿀 수 없습니다. 왼쪽 작업 원문에서 수정해 주세요.",
        );
        return false;
      }
      closeInspector();
      return true;
    },
    [closeInspector, document, performOperation, selectedItem],
  );

  const focusSourceRows = useCallback(
    (sourceRowIds: string[], itemId?: string) => {
      if (!document || sourceRowIds.length === 0) return;
      const rows = sourceRowIds
        .map((sourceRowId) =>
          document.parseResult.canonical.sourceRows.find(
            (row) => row.sourceRowId === sourceRowId,
          ),
        )
        .filter((row): row is NonNullable<typeof row> => Boolean(row));
      if (rows.length === 0) return;
      const startLine = Math.min(
        ...rows.map((row) => row.sourceRange.startLine),
      );
      const endLine = Math.max(...rows.map((row) => row.sourceRange.endLine));
      const selectionStart = Math.min(
        ...rows.map((row) => row.sourceRange.startOffset),
      );
      const selectionEnd = Math.max(
        ...rows.map((row) => row.sourceRange.endOffset),
      );

      setSourceCorrectionReturnTarget({
        artifact: activeArtifact,
        ...(itemId ? { itemId } : {}),
        focusTestId: itemId
          ? "ta-authoring-preview-source-edit"
          : "ta-authoring-product-issue-source",
        sourceTextBeforeEdit: rawText,
      });
      setInspectorOpen(false);
      setItemReviewOpen(false);
      setStage("input");
      setStatusMessage(
        `${startLine === endLine ? `${startLine}행` : `${startLine}~${endLine}행`}을 선택했습니다. 수정하면 보던 결과로 돌아갑니다.`,
      );
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          sourceTextAreaRef.current?.focus();
          sourceTextAreaRef.current?.setSelectionRange(
            selectionStart,
            selectionEnd,
          );
        });
      });
    },
    [activeArtifact, document, rawText],
  );

  const focusSourceLocator = useCallback(
    (
      locator: AuthoringSourceLocatorView,
      options: { returnToResult?: boolean; focusTestId?: string } = {},
    ) => {
      const sourceLocator = longDocumentAnalysis
        ? [
            ...longDocumentAnalysis.blocks.map((block) => block.locator),
            ...longDocumentAnalysis.tables.flatMap((table) => [
              table.locator,
              ...table.sourceRows.flatMap((row) => [
                row.locator,
                ...row.cells.map((cell) => cell.locator),
              ]),
            ]),
            ...longDocumentAnalysis.lossManifest.flatMap((loss) =>
              loss.locator ? [loss.locator] : [],
            ),
          ].find(
            (candidate) =>
              candidate.startOffset === locator.startOffset &&
              candidate.endOffset === locator.endOffset,
          )
        : undefined;
      const exactSource = sourceLocator
        ? locateAuthoringSource(rawText, sourceLocator)
        : null;
      const invalidLocator =
        locator.startOffset < 0 ||
        locator.endOffset < locator.startOffset ||
        locator.endOffset > rawText.length ||
        Boolean(exactSource && !exactSource.valid);
      const resolvedFallback = invalidLocator
        ? resolveAuthoringSourceLocatorView(sourceFocusLocatorViews, locator)
        : null;
      if (invalidLocator && !resolvedFallback) {
        setStatusMessage(
          "원문 위치가 바뀌어 가까운 범위를 찾지 못했습니다. 문서 찾기에서 다시 선택해 주세요.",
        );
        setDocumentNavigatorOpen(true);
        return;
      }
      const effectiveLocator = resolvedFallback?.entry ?? locator;
      const sourceScrollTop = Math.max(
        0,
        (effectiveLocator.startLine - 3) * 24,
      );
      const persistedFocus: AuthoringLongDocumentFocusView = {
        locatorId: effectiveLocator.locatorId,
        startOffset: effectiveLocator.startOffset,
        startLine: effectiveLocator.startLine,
        sourceScrollTop,
        ...(options.returnToResult
          ? {
              returnArtifact: activeArtifact,
              ...(options.focusTestId
                ? { focusTestId: options.focusTestId }
                : {}),
              focusLocatorId: effectiveLocator.locatorId,
            }
          : {}),
      };
      if (options.returnToResult) {
        setSourceCorrectionReturnTarget({
          artifact: activeArtifact,
          ...(options.focusTestId ? { focusTestId: options.focusTestId } : {}),
          focusLocatorId: effectiveLocator.locatorId,
          locatorId: effectiveLocator.locatorId,
          sourceScrollTop,
          sourceTextBeforeEdit: rawText,
        });
      } else {
        setSourceCorrectionReturnTarget(null);
      }
      setSelectedSourceLocatorId(effectiveLocator.locatorId);
      restoredSourceFocusRef.current =
        serializeAuthoringLongDocumentFocus(persistedFocus);
      setDocument((current) =>
        current
          ? {
              ...current,
              uiState: {
                stage: "input",
                ...(current.uiState?.selectedItemId
                  ? { selectedItemId: current.uiState.selectedItemId }
                  : {}),
                focusTarget:
                  serializeAuthoringLongDocumentFocus(persistedFocus),
              },
            }
          : current,
      );
      setDocumentNavigatorOpen(false);
      setInspectorOpen(false);
      setItemReviewOpen(false);
      setStage("input");
      setStatusMessage(
        resolvedFallback
          ? `원문 위치가 바뀌어 가까운 ${effectiveLocator.startLine === effectiveLocator.endLine ? `${effectiveLocator.startLine}행` : `${effectiveLocator.startLine}~${effectiveLocator.endLine}행`}을 선택했습니다.`
          : `${effectiveLocator.startLine === effectiveLocator.endLine ? `${effectiveLocator.startLine}행` : `${effectiveLocator.startLine}~${effectiveLocator.endLine}행`}을 선택했습니다.`,
      );
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const textarea = sourceTextAreaRef.current;
          textarea?.focus();
          textarea?.setSelectionRange(
            effectiveLocator.startOffset,
            effectiveLocator.endOffset,
          );
          if (textarea) {
            textarea.scrollTop = sourceScrollTop;
          }
        });
      });
    },
    [activeArtifact, longDocumentAnalysis, rawText, sourceFocusLocatorViews],
  );

  useEffect(() => {
    if (!document || stage !== "input" || parsePending) return;
    const persistedFocus = parseAuthoringLongDocumentFocus(
      document.uiState?.focusTarget,
    );
    if (!persistedFocus || sourceLocatorViews.length === 0) return;

    const resolved = resolveAuthoringSourceLocatorView(
      sourceFocusLocatorViews,
      persistedFocus,
    );
    if (!resolved) return;
    const nearestEntry = resolved.entry;
    const restoredFocus: AuthoringLongDocumentFocusView = {
      ...persistedFocus,
      locatorId: nearestEntry.locatorId,
      startOffset: nearestEntry.startOffset,
      startLine: nearestEntry.startLine,
      sourceScrollTop: !resolved.stale
        ? persistedFocus.sourceScrollTop
        : Math.max(0, (nearestEntry.startLine - 3) * 24),
      ...(persistedFocus.focusLocatorId
        ? { focusLocatorId: nearestEntry.locatorId }
        : {}),
    };
    const restoredKey = serializeAuthoringLongDocumentFocus(restoredFocus);
    if (restoredSourceFocusRef.current === restoredKey) return;
    restoredSourceFocusRef.current = restoredKey;
    setSelectedSourceLocatorId(nearestEntry.locatorId);

    if (resolved.stale) {
      setDocument((current) =>
        current
          ? {
              ...current,
              uiState: {
                stage: "input",
                ...(current.uiState?.selectedItemId
                  ? { selectedItemId: current.uiState.selectedItemId }
                  : {}),
                focusTarget: restoredKey,
              },
            }
          : current,
      );
      setSourceCorrectionReturnTarget((current) =>
        current
          ? {
              ...current,
              locatorId: nearestEntry.locatorId,
              ...(current.focusLocatorId
                ? { focusLocatorId: nearestEntry.locatorId }
                : {}),
              sourceScrollTop: restoredFocus.sourceScrollTop,
            }
          : current,
      );
      setStatusMessage(
        `저장한 원문 위치가 바뀌어 가까운 ${nearestEntry.startLine}행으로 이동했습니다.`,
      );
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const textarea = sourceTextAreaRef.current;
        if (!textarea) return;
        textarea.focus();
        textarea.setSelectionRange(
          nearestEntry.startOffset,
          nearestEntry.endOffset,
        );
        textarea.scrollTop = restoredFocus.sourceScrollTop;
      });
    });
  }, [document, parsePending, sourceFocusLocatorViews, stage]);

  const returnFromSourceLocation = useCallback(() => {
    const target = sourceCorrectionReturnTarget;
    if (!target) return;
    setSelectedArtifact(target.artifact);
    setPendingResultFocusTarget(target);
    setSourceCorrectionReturnTarget(null);
    setDocument((current) => {
      if (!current) return current;
      const focus = parseAuthoringLongDocumentFocus(
        current.uiState?.focusTarget,
      );
      if (!focus) {
        return withUiState(current, "result", selectedItemId, title, ownership);
      }
      const persistentSelection: AuthoringLongDocumentFocusView = {
        locatorId: focus.locatorId,
        startOffset: focus.startOffset,
        startLine: focus.startLine,
        sourceScrollTop: focus.sourceScrollTop,
      };
      return withUiState(
        current,
        "result",
        selectedItemId,
        title,
        ownership,
        serializeAuthoringLongDocumentFocus(persistentSelection),
      );
    });
    setStage("result");
    setStatusMessage("보던 결과로 돌아왔습니다.");
  }, [ownership, selectedItemId, sourceCorrectionReturnTarget, title]);

  useEffect(() => {
    if (stage !== "result" || !pendingResultFocusTarget) return;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const selector = resultSourceTargetSelector(
          pendingResultFocusTarget.focusTestId,
          pendingResultFocusTarget.focusLocatorId,
        );
        const exactTarget = selector
          ? window.document.querySelector<HTMLElement>(selector)
          : null;
        const itemTarget = pendingResultFocusTarget.itemId
          ? window.document.querySelector<HTMLElement>(
              `[data-testid="ta-authoring-preview-source-edit"][data-item-id="${CSS.escape(pendingResultFocusTarget.itemId)}"]`,
            )
          : null;
        const fallbackArtifact =
          pendingResultFocusTarget.focusTestId ===
          "ta-authoring-result-slot-source"
            ? "sheet"
            : pendingResultFocusTarget.artifact;
        const artifactTarget = window.document.querySelector<HTMLElement>(
          `[data-testid="ta-authoring-result-slot-${fallbackArtifact}"]`,
        );
        (itemTarget ?? exactTarget ?? artifactTarget)?.focus({
          preventScroll: true,
        });
        setPendingResultFocusTarget(null);
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [pendingResultFocusTarget, stage]);

  const focusItemInSource = useCallback(
    (itemId: string) => {
      if (!document) return;
      const item = document.parseResult.canonical.items.find(
        (candidate) => candidate.itemId === itemId,
      );
      if (!item) return;
      focusSourceRows(item.sourceRowIds, itemId);
    },
    [document, focusSourceRows],
  );

  const focusIssueInSource = useCallback(
    (issueId: string) => {
      const issue = document?.parseResult.issues.find(
        (candidate) => candidate.issueId === issueId,
      );
      if (!issue) return;
      focusSourceRows(issue.sourceRowIds, issue.itemId);
    },
    [document, focusSourceRows],
  );

  const editSelectedItemInSource = useCallback(() => {
    if (!selectedItemId) return;
    focusItemInSource(selectedItemId);
  }, [focusItemInSource, selectedItemId]);

  useEffect(() => {
    const target = sourceCorrectionReturnTarget;
    if (
      !target ||
      stage !== "input" ||
      parsePending ||
      rawText === target.sourceTextBeforeEdit ||
      !document ||
      document.rawText !== rawText
    ) {
      return;
    }

    const itemStillExists = Boolean(
      target.itemId &&
      document.parseResult.canonical.items.some(
        (item) => item.itemId === target.itemId,
      ),
    );
    setSelectedArtifact(target.artifact);
    if (itemStillExists && target.itemId) setSelectedItemId(target.itemId);
    setSourceCorrectionReturnTarget(null);
    setPendingResultFocusTarget(target);
    setDocument((current) => {
      if (!current) return current;
      const focus = parseAuthoringLongDocumentFocus(
        current.uiState?.focusTarget,
      );
      if (!focus) {
        return withUiState(
          current,
          "result",
          itemStillExists && target.itemId ? target.itemId : selectedItemId,
          title,
          ownership,
        );
      }
      const persistentSelection: AuthoringLongDocumentFocusView = {
        locatorId: focus.locatorId,
        startOffset: focus.startOffset,
        startLine: focus.startLine,
        sourceScrollTop: focus.sourceScrollTop,
      };
      return withUiState(
        current,
        "result",
        itemStillExists && target.itemId ? target.itemId : selectedItemId,
        title,
        ownership,
        serializeAuthoringLongDocumentFocus(persistentSelection),
      );
    });
    setStage("result");
    setStatusMessage(
      "원문 수정이 결과에 반영되었습니다. 보던 결과로 돌아왔습니다.",
    );
  }, [
    document,
    ownership,
    parsePending,
    rawText,
    selectedItemId,
    sourceCorrectionReturnTarget,
    stage,
    title,
  ]);

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
    const targetArtifact = selectedArtifact;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.document
          .querySelector<HTMLElement>(
            `[data-testid="ta-authoring-result-slot-${targetArtifact}"]`,
          )
          ?.focus();
      });
    });
  }, [
    document,
    ownership,
    parsePending,
    selectedArtifact,
    selectedItemId,
    title,
  ]);

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
        lifecycleStatus: deriveAuthoringLifecycleStatus(document, "previewed"),
      },
      "result",
      selectedItemId,
      title,
      ownership,
    );
    let record: TextAuthoringDraftRecord;
    try {
      const serviceState = createTextAuthoringServiceStateFromDocument(
        savedDocument,
        {
          draftId: activeDraftId ?? savedDocument.documentId,
          projectionOptions: {
            ...(anchor ? { anchor } : {}),
            finiteOccurrenceLimit,
            openEndedOccurrenceWeeks,
          },
        },
      );
      record = repository.saveCoherentDraft(serviceState, {
        draftId: activeDraftId ?? savedDocument.documentId,
        title:
          (productMode ? draftName.trim() : title.trim()) || projection.title,
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
    const receiptView = toSaveReceiptView(receipt);
    setActiveDraftId(record.draftId);
    setDocument(persistedDocument);
    setOwnershipLocked(true);
    setSaveReceipt(receiptView);
    setDirty(false);
    setRecovery(null);
    refreshDrafts(repository);
    if (productMode && initialDraftId !== record.draftId) {
      onNavigateDraft?.(record.draftId, {
        replace: true,
        preserveWorkspace: true,
        saveReceipt: receiptView,
      });
    }
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
    anchor,
    document,
    draftName,
    finiteOccurrenceLimit,
    initialDraftId,
    onNavigateDraft,
    openEndedOccurrenceWeeks,
    ownership,
    parsePending,
    projection,
    productMode,
    refreshDrafts,
    repository,
    selectedItemId,
    title,
  ]);

  const handleMarkReady = useCallback(() => {
    if (!repository || !activeDraftId || !canMarkReady) {
      setStatusMessage(readyBlockedReason);
      return;
    }
    try {
      repository.markReady(activeDraftId);
    } catch (error) {
      setStatusMessage(storageWriteFailureMessage("준비 완료 표시", error));
      return;
    }
    refreshDrafts(repository);
    setStatusMessage(
      "현재 저장본을 준비 완료로 표시했습니다. 공개하거나 전송하지는 않았습니다.",
    );
  }, [
    activeDraftId,
    canMarkReady,
    readyBlockedReason,
    refreshDrafts,
    repository,
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
    sourceComparisonOpen ||
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

  const resetWorkspace = useCallback(
    (options: { navigate?: "new" | "library" | "none" } = {}) => {
      if (repository && activeDraftId) {
        try {
          repository.clearRecovery(activeDraftId);
        } catch (error) {
          setStatusMessage(storageWriteFailureMessage("복구본 정리", error));
          return false;
        }
      }
      setActiveDraftId(null);
      setDocument(null);
      setTitle("");
      setDraftName("");
      setSource("");
      setRawText("");
      setOwnership("personal");
      setOwnershipLocked(false);
      setStage("input");
      setSelectedItemId(null);
      setSelectedArtifact(productMode ? "memo" : "todo");
      setParsePending(false);
      setDirty(false);
      setRecovery(null);
      setLibraryOpen(false);
      setSaveReceipt(null);
      setReviewOpen(false);
      setItemReviewOpen(false);
      setSourceUpdateOpen(false);
      setSourceComparisonOpen(false);
      setDocumentNavigatorOpen(false);
      setResetConfirmOpen(false);
      setPendingExample(null);
      setPendingWorkspaceExit(null);
      setPendingCorrection(null);
      setSourceCorrectionReturnTarget(null);
      setPendingResultFocusTarget(null);
      setSelectedSourceLocatorId(null);
      restoredSourceFocusRef.current = null;
      setStatusMessage(
        productMode ? "새 콘텐츠 작성을 시작합니다." : "새 Flow를 시작합니다.",
      );
      const navigate = options.navigate ?? "new";
      if (navigate === "new") {
        if (onNavigateNew) onNavigateNew();
        else onNavigateDraft?.(null);
      } else if (navigate === "library") {
        onNavigateDraft?.(null);
      }
      return true;
    },
    [activeDraftId, onNavigateDraft, onNavigateNew, productMode, repository],
  );

  const requestResetWorkspace = useCallback(() => {
    setPendingExample(null);
    setPendingWorkspaceExit(null);
    if (dirty) {
      setResetConfirmOpen(true);
      return;
    }
    if (productMode && libraryOpen && onNavigateNew) {
      onNavigateNew();
      return;
    }
    resetWorkspace();
  }, [dirty, libraryOpen, onNavigateNew, productMode, resetWorkspace]);

  const loadDocument = useCallback(
    (
      nextDocument: TextAuthoringDocument,
      options: {
        stage?: PersistedAuthoringStage;
        selectedItemId?: string;
        primaryArtifact?: string;
        draftId?: string;
        draftTitle?: string;
      } = {},
    ) => {
      const resolvedTitle =
        extractMarkdownFlowTitle(nextDocument.rawText) ||
        nextDocument.title ||
        nextDocument.parseResult.canonical.flow.title;
      const persistedStage = options.stage ?? nextDocument.uiState?.stage;
      const resolvedStage = normalizeVisibleAuthoringStage(persistedStage);
      const resolvedSelectedItemId =
        options.selectedItemId ??
        nextDocument.uiState?.selectedItemId ??
        nextDocument.parseResult.canonical.items[0]?.itemId ??
        null;
      const persistedLongDocumentFocus = parseAuthoringLongDocumentFocus(
        nextDocument.uiState?.focusTarget,
      );
      const normalizedDocument = withUiState(
        nextDocument,
        resolvedStage,
        resolvedSelectedItemId,
        resolvedTitle,
        nextDocument.ownership,
        nextDocument.uiState?.focusTarget,
      );

      setSelectedSourceLocatorId(persistedLongDocumentFocus?.locatorId ?? null);
      restoredSourceFocusRef.current = null;
      setSourceCorrectionReturnTarget(
        persistedLongDocumentFocus?.returnArtifact
          ? {
              artifact: persistedLongDocumentFocus.returnArtifact,
              ...(persistedLongDocumentFocus.focusTestId
                ? { focusTestId: persistedLongDocumentFocus.focusTestId }
                : {}),
              ...(persistedLongDocumentFocus.focusLocatorId
                ? {
                    focusLocatorId: persistedLongDocumentFocus.focusLocatorId,
                  }
                : {}),
              locatorId: persistedLongDocumentFocus.locatorId,
              sourceScrollTop: persistedLongDocumentFocus.sourceScrollTop,
              sourceTextBeforeEdit: nextDocument.rawText,
            }
          : null,
      );
      setPendingResultFocusTarget(null);
      setDocumentNavigatorOpen(false);
      setActiveDraftId(options.draftId ?? nextDocument.documentId);
      setDocument(normalizedDocument);
      setTitle(resolvedTitle);
      setDraftName(options.draftTitle ?? resolvedTitle);
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
      setSourceComparisonOpen(false);
    },
    [],
  );

  const openDraft = useCallback(
    (draftId: string, options: { navigate?: boolean } = {}) => {
      let record: TextAuthoringDraftRecord | undefined;
      try {
        record = repository?.load(draftId);
      } catch (error) {
        setStatusMessage(storageWriteFailureMessage("초안 열기", error));
        return null;
      }
      if (!record) return false;
      loadDocument(record.document, {
        draftId: record.draftId,
        stage: record.activeStage,
        selectedItemId: record.selectedItemId,
        primaryArtifact: record.primaryArtifact,
        draftTitle: record.title,
      });
      try {
        setRecovery(repository?.loadNewerRecovery(record.draftId) ?? null);
      } catch (error) {
        setRecovery(null);
        setStatusMessage(storageWriteFailureMessage("복구본 확인", error));
        return null;
      }
      setStatusMessage(`${record.title} 초안을 열었습니다.`);
      if (options.navigate !== false) onNavigateDraft?.(record.draftId);
      return true;
    },
    [loadDocument, onNavigateDraft, repository],
  );

  const requestOpenDraft = useCallback(
    (draftId: string) => {
      if (dirty && draftId !== activeDraftId) {
        setPendingExample(null);
        setPendingWorkspaceExit({ type: "draft", draftId });
        setResetConfirmOpen(true);
        return false;
      }
      return openDraft(draftId);
    },
    [activeDraftId, dirty, openDraft],
  );

  const requestToggleLibrary = useCallback(() => {
    setSaveReceipt(null);
    if (!libraryOpen && dirty) {
      setPendingExample(null);
      setPendingWorkspaceExit({ type: "library" });
      setResetConfirmOpen(true);
      return;
    }
    setLibraryOpen((current) => {
      const next = !current;
      onNavigateDraft?.(next ? null : activeDraftId);
      return next;
    });
    refreshDrafts();
  }, [activeDraftId, dirty, libraryOpen, onNavigateDraft, refreshDrafts]);

  useEffect(() => {
    if (!initialDraftId) {
      initialDraftOpenedRef.current = null;
      return;
    }
    if (!repository || initialDraftOpenedRef.current === initialDraftId) {
      return;
    }
    initialDraftOpenedRef.current = initialDraftId;
    const opened = openDraft(initialDraftId, { navigate: false });
    if (opened === false) {
      setLibraryOpen(true);
      onNavigateDraft?.(null, { replace: true });
      setStatusMessage(
        "요청한 콘텐츠를 찾지 못했습니다. 내 콘텐츠에서 다시 선택해 주세요.",
      );
    }
  }, [initialDraftId, onNavigateDraft, openDraft, repository]);

  useEffect(() => {
    if (!initialSaveReceipt) return;
    setSaveReceipt((current) =>
      current?.receiptId === initialSaveReceipt.receiptId
        ? current
        : initialSaveReceipt,
    );
  }, [initialSaveReceipt]);

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
          withUiState(personal, stage, selectedItemId, title, "personal"),
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
    [document, ownership, performOperation, selectedItemId, stage, title],
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
        next.parseResult.canonical.items.find((item) => item.included)
          ?.itemId ??
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
    setDocument(withUiState(next, "result", selectedItemId, title, ownership));
    setRawText(next.rawText);
    setSource(next.sourceUrl || next.sourceTitle || "");
    setParsePending(false);
    setDirty(true);
    setSourceUpdateOpen(false);
    setStatusMessage(
      "새 원문 후보를 사용하지 않고 이전 원문과 현재 결과를 유지했습니다.",
    );
  }, [document, ownership, pendingSourceState, selectedItemId, title]);

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
    const currentPolicy = evaluateAuthoringWritePolicy(document, "export_file");
    if (!currentPolicy.allowed) {
      setExportOpen(false);
      if (
        currentPolicy.blockers.some(
          (blocker) => blocker.kind === "source_update",
        )
      ) {
        setSourceUpdateOpen(true);
      } else if (
        currentPolicy.blockers.some((blocker) => blocker.kind === "review_gate")
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
          table.columns.map((value) => csvCell(value, separator)),
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
        content = serializeAuthoringPlainText(
          projection.title,
          rows,
          exportScope === "whole" ? sourceOnlyTextRows : [],
        );
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
      reviewEvidenceCount: receipt.reviewState.evidenceRecordedGateIds.length,
      sourceState: receipt.sourceState.status,
      createdAtLabel: formatKoreanDateTime(receipt.exportedAt),
    });
    setStatusMessage(
      `${ARTIFACT_LABEL[receipt.artifact]} ${receipt.count}개를 파일로 만들었습니다.`,
    );
  }, [
    activeArtifact,
    document,
    exportFormat,
    exportScope,
    projection,
    scopedPreflight,
    sourceOnlyTextRows,
  ]);

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

  const copyTextResult = useCallback(
    async (kind: "raw" | "plain_text" | "markdown") => {
      if (!document || !projection) return;
      const content =
        kind === "raw"
          ? rawText
          : kind === "plain_text"
            ? (textResultValues?.structured_plain_text ??
              serializeAuthoringPlainText(
                projection.title,
                projection.artifacts.memo.rows,
                sourceOnlyTextRows,
              ))
            : exportTextAuthoringMarkdown(document);
      try {
        await navigator.clipboard.writeText(content);
        setStatusMessage(
          kind === "raw"
            ? "원문을 바꾸지 않고 그대로 복사했습니다."
            : kind === "plain_text"
              ? rawPreservedTextResult
                ? "원문을 보존한 TXT를 복사했습니다."
                : "항목과 상세를 정리한 TXT를 복사했습니다."
              : "v2 문법으로 정리한 Markdown을 복사했습니다.",
        );
      } catch {
        setStatusMessage("클립보드에 복사하지 못했습니다. 다시 시도해 주세요.");
        throw new Error("clipboard_write_failed");
      }
    },
    [
      document,
      projection,
      rawPreservedTextResult,
      rawText,
      sourceOnlyTextRows,
      textResultValues?.structured_plain_text,
    ],
  );

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
    setPendingWorkspaceExit(null);
  }, []);
  const openLibraryFromReceipt = useCallback(() => {
    setSaveReceipt(null);
    setLibraryOpen(true);
    onNavigateDraft?.(null);
    refreshDrafts();
  }, [onNavigateDraft, refreshDrafts]);

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
      setDraftName(example.title);
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
      setSourceComparisonOpen(false);
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
        setPendingWorkspaceExit(null);
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
      ? (pendingCorrection.boundaries.find(
          (boundary) => boundary.at === pendingCorrection.at,
        ) ?? null)
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
  const desktopSaveLabel = productMode
    ? "초안 저장"
    : ownership === "personal"
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
          productMode={productMode}
          libraryToggleTestId={
            saveReceipt ? null : "ta-authoring-library-toggle"
          }
          onToggleLibrary={requestToggleLibrary}
          onReset={requestResetWorkspace}
        />

        {libraryOpen ? (
          <DraftLibrary
            drafts={filteredDrafts}
            productMode={productMode}
            query={libraryQuery}
            filter={libraryFilter}
            onQueryChange={setLibraryQuery}
            onFilterChange={setLibraryFilter}
            onCreate={requestResetWorkspace}
            onOpen={requestOpenDraft}
            onRename={(draftId, nextTitle) => {
              if (!repository) return;
              try {
                repository.rename(draftId, nextTitle);
              } catch (error) {
                setStatusMessage(
                  storageWriteFailureMessage("이름 변경", error),
                );
                return false;
              }
              if (draftId === activeDraftId) setDraftName(nextTitle);
              refreshDrafts(repository);
              setStatusMessage("콘텐츠 이름을 변경했습니다.");
              return true;
            }}
            onDuplicate={(draftId) => {
              if (!repository) return;
              try {
                repository.duplicate(draftId);
              } catch (error) {
                setStatusMessage(
                  storageWriteFailureMessage("초안 복사", error),
                );
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
                setStatusMessage(
                  storageWriteFailureMessage("초안 보관", error),
                );
                return false;
              }
              refreshDrafts(repository);
              setStatusMessage("초안을 보관했습니다. 삭제하지 않았습니다.");
              return true;
            }}
            onRestore={(draftId) => {
              if (!repository) return;
              try {
                repository.restore(draftId);
              } catch (error) {
                setStatusMessage(
                  storageWriteFailureMessage("초안 복원", error),
                );
                return false;
              }
              refreshDrafts(repository);
              setStatusMessage("보관한 초안을 복원했습니다.");
              return true;
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
                description={
                  activeDraftRecord
                    ? `${activeDraftRecord.title} · 마지막 저장 이후의 임시 작업입니다.`
                    : `${recovery.document.title || recovery.document.parseResult.canonical.flow.title} · 첫 저장 전 임시 작업입니다.`
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
              productMode={productMode}
              showQaCatalog={showQaCatalog && !productMode}
            />

            {productMode &&
            document &&
            stage === "result" &&
            (activeDraftReady || canMarkReady) ? (
              <section
                data-testid="ta-authoring-ready-status"
                className="flex flex-col gap-3 border-b border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                aria-label="준비 상태"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--flowme-text)]">
                    {activeDraftReady
                      ? "이 저장본은 준비 완료 상태예요."
                      : "결과를 확인한 뒤 준비 완료로 표시할 수 있어요."}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--flowme-text-secondary)]">
                    {readyBlockedReason} 공개하거나 다른 서비스로 전송하지는
                    않습니다.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="ta-authoring-mark-ready"
                  className={`${FLOW_UI_SECONDARY_ACTION_CLASS} min-h-11 shrink-0`}
                  disabled={!canMarkReady}
                  title={readyBlockedReason}
                  onClick={handleMarkReady}
                >
                  {activeDraftReady ? "준비 완료" : "준비 완료로 표시"}
                </button>
              </section>
            ) : null}

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
              <div ref={workspaceGridRef} className={workspaceGridClass}>
                <div
                  data-testid="ta02-390-input"
                  data-authoring-pane="input"
                  data-stage-active={stage === "input"}
                  className={inputPaneClass}
                >
                  <InputPane
                    title={productMode ? draftName : title}
                    source={source}
                    rawText={rawText}
                    ownership={ownership}
                    ownershipLocked={ownershipLocked}
                    parsePending={parsePending}
                    liveUpdateBlocked={liveUpdateBlocked}
                    parseStatusLabel={parseStatusLabel}
                    liveAppliedItemCount={liveApplyReceipt?.itemCount ?? null}
                    sourceError={sourceError}
                    scrollContainerRef={inputPaneScrollRef}
                    sourceTextAreaRef={sourceTextAreaRef}
                    showDocumentNavigator={showDocumentNavigator}
                    sourceLocationReturnLabel={
                      sourceCorrectionReturnTarget
                        ? "보던 결과로 돌아가기"
                        : undefined
                    }
                    productMode={productMode}
                    onOpenDocumentNavigator={() =>
                      setDocumentNavigatorOpen(true)
                    }
                    onReturnToSourceLocation={returnFromSourceLocation}
                    onTitleChange={(value) => {
                      ensureActiveDraft();
                      if (productMode) {
                        setDraftName(value);
                        setDirty(true);
                        return;
                      }
                      const nextRawText = replaceMarkdownFlowTitle(
                        rawText,
                        value,
                      );
                      setTitle(value);
                      if (nextRawText !== rawText) {
                        setRawText(nextRawText);
                        setLiveApplyReceipt(null);
                        setParsePending(true);
                      } else {
                        setDocument((current) =>
                          current
                            ? withUiState(
                                current,
                                stage,
                                selectedItemId,
                                value,
                                ownership,
                              )
                            : current,
                        );
                      }
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
                    reviewGates={reviewGates}
                    sourceState={document?.sourceState}
                    userCorrectionCount={userCorrectionCount}
                    itemCount={outline.counts.included}
                    itemReviewCount={outline.issues.length}
                    issues={outline.issues}
                    selectedArtifact={activeArtifact}
                    anchor={anchor}
                    rawText={rawText}
                    sourceSnapshotText={document?.sourceState?.active.rawText}
                    onOpenSourceComparison={() => setSourceComparisonOpen(true)}
                    textResultValues={textResultValues}
                    rawPreservedTextResult={rawPreservedTextResult}
                    canAlignSourceOrder={calendarSourceAlignment.differs}
                    hasUndo={Boolean(
                      document?.revision.operations.some(
                        (operation) => operation.type === "align_source_order",
                      ),
                    )}
                    hasWorkingTextSyncUndo={Boolean(
                      document?.revision.operations.some(
                        (operation) =>
                          operation.type === "sync_item_to_working_text" ||
                          operation.type === "sync_working_text_from_input",
                      ),
                    )}
                    onArtifactChange={setSelectedArtifact}
                    onAnchorChange={handleAnchorChange}
                    onAlignSourceOrder={handleAlignSourceToCalendar}
                    onCopyRawText={() => copyTextResult("raw")}
                    onCopySourceSnapshot={copySourceSnapshot}
                    onCopyStructuredText={() => copyTextResult("plain_text")}
                    onCopyStructuredMarkdown={() => copyTextResult("markdown")}
                    tableLoss={tableLossView}
                    onLocateTableLoss={(locator, origin) =>
                      focusSourceLocator(locator, {
                        returnToResult: true,
                        focusTestId:
                          origin === "slot"
                            ? "ta-authoring-result-slot-source"
                            : "ta-authoring-table-loss-source",
                      })
                    }
                    onLocateLongDocumentSource={(locator, origin) =>
                      focusSourceLocator(locator, {
                        returnToResult: true,
                        focusTestId:
                          origin === "row"
                            ? "ta-authoring-long-table-row-source"
                            : "ta-authoring-long-table-source",
                      })
                    }
                    onDownloadRawText={() => {
                      downloadFile(
                        `${safeFileName(draftName || title)}-원문.txt`,
                        rawText,
                        "text/plain;charset=utf-8",
                      );
                      setStatusMessage(
                        "원문을 바꾸지 않고 TXT 파일로 만들었습니다.",
                      );
                    }}
                    onUndo={() =>
                      performOperation(
                        { type: "undo" },
                        "바로 이전 변경을 되돌렸습니다.",
                      )
                    }
                    onUndoWorkingText={() =>
                      performOperation(
                        { type: "undo" },
                        "항목 수정 전 작업 원문과 결과로 되돌렸습니다.",
                      )
                    }
                    onExpandFiniteOccurrences={setFiniteOccurrenceLimit}
                    onExpandOpenEndedOccurrences={setOpenEndedOccurrenceWeeks}
                    onEditItem={openInspector}
                    onEditSourceItem={focusItemInSource}
                    onEditIssueSource={focusIssueInSource}
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
                    productMode={productMode}
                  />
                </div>
              </div>
            </div>

            <footer className="ta-workspace-footer border-t border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 min-[900px]:hidden">
              <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 max-[359px]:grid max-[359px]:grid-cols-1">
                {stage === "result" && !productMode ? (
                  <p className="basis-full text-center text-[10px] leading-4 text-[var(--flowme-text-tertiary)]">
                    이 기기에만 저장 · 공개되지 않음
                  </p>
                ) : null}
                {stage !== "input" ? (
                  <button
                    type="button"
                    className={`${FLOW_UI_SECONDARY_ACTION_CLASS} max-[359px]:w-full`}
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
                  className={`${FLOW_UI_PRIMARY_ACTION_CLASS} ta-primary-action min-w-0 flex-1 justify-start text-left max-[359px]:w-full max-[359px]:flex-none sm:ml-auto sm:max-w-xl`}
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
        key={selectedItem?.itemId ?? "no-selected-item"}
        item={selectedItem}
        open={inspectorOpen}
        onApply={applyItemPatch}
        onEditSource={editSelectedItemInSource}
        onClose={closeInspector}
        productMode={productMode}
      />

      <AuthoringDialog
        open={itemReviewOpen && Boolean(document)}
        testId="ta-authoring-item-review"
        title={
          productMode
            ? `원문 문제 ${outline.issues.length}건`
            : outline.issues.length > 0
              ? `항목 검토 · 확인 ${outline.issues.length}개`
              : "항목 검토"
        }
        description={
          productMode
            ? "문제가 있는 원문 위치와 결과 영향을 확인하고 원문을 수정하세요."
            : `${outline.counts.included}개 항목으로 해석했습니다. 필요할 때만 순서·묶음·역할을 고치세요.`
        }
        initialFocusSelector={
          outline.issues.length > 0
            ? '[data-testid="ta-authoring-issue-card"][data-issue-state="open"] button:not([disabled])'
            : undefined
        }
        size="wide"
        variant="drawer"
        keepMounted
        onClose={() => setItemReviewOpen(false)}
        footer={
          <button
            type="button"
            data-testid="ta-authoring-item-review-close"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={() => setItemReviewOpen(false)}
          >
            검토 닫기
          </button>
        }
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
          onEditIssueSource={focusIssueInSource}
          onUndo={() =>
            performOperation(
              { type: "undo" },
              "바로 이전 구조 변경을 되돌렸습니다.",
            )
          }
          productMode={productMode}
        />
      </AuthoringDialog>

      <AuthoringDialog
        open={documentNavigatorOpen}
        testId="ta-authoring-document-navigator-dialog"
        title="문서 찾기"
        description="제목·표·그대로 보존한 내용을 한곳에서 찾아 원문의 정확한 위치로 이동합니다."
        variant="drawer"
        initialFocusSelector='[data-testid="ta-authoring-document-search"]'
        onClose={() => setDocumentNavigatorOpen(false)}
      >
        <div className="max-h-[calc(88dvh-8rem)] overflow-y-auto">
          <LongDocumentNavigator
            entries={sourceLocatorViews}
            initialLocatorId={selectedSourceLocatorId ?? undefined}
            onLocate={(locator) => focusSourceLocator(locator)}
          />
        </div>
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
        footer={
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
        }
      >
        {pendingCorrection?.type === "align" ? (
          <div className="space-y-3">
            <p className="text-xs leading-5 text-[var(--flowme-text-secondary)]">
              항목은 각 단계 안에서만 날짜순으로 이동합니다. 설명과 하위 체크도
              해당 항목과 함께 이동합니다.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <section className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] p-3">
                <h3 className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
                  현재 입력 순서
                </h3>
                <ol className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-2 text-sm">
                  {pendingCorrection.beforeTitles.map((itemTitle, index) => (
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
                <ol className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-2 text-sm">
                  {pendingCorrection.afterTitles.map((itemTitle, index) => (
                    <li key={`${itemTitle}-after-${index}`}>
                      {index + 1}. {itemTitle}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
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
              합친 제목은 두 제목을 순서대로 잇습니다. 값이 다른 속성은 임의로
              고르지 않습니다.
            </p>
          </div>
        ) : pendingCorrection?.type === "split" ? (
          <div className="space-y-3">
            <label
              htmlFor="ta-authoring-split-boundary"
              className="block text-sm font-semibold"
            >
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

      <SourceComparisonDialog
        open={sourceComparisonOpen}
        comparison={sourceComparison}
        onClose={() => setSourceComparisonOpen(false)}
      />

      <SaveReceiptDialog
        open={Boolean(saveReceipt)}
        receipt={saveReceipt}
        productMode={productMode}
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
          if (pendingWorkspaceExit) {
            const nextExit = pendingWorkspaceExit;
            if (nextExit.type === "history") {
              allowBrowserExitRef.current = true;
              if (!resetWorkspace({ navigate: "none" })) {
                allowBrowserExitRef.current = false;
                return;
              }
              const browserNavigation = getBrowserNavigation();
              if (!browserNavigation) {
                window.location.assign(nextExit.href);
                return;
              }
              try {
                browserNavigation
                  .traverseTo(nextExit.navigationKey)
                  .finished.catch(() => {
                    window.location.assign(nextExit.href);
                  })
                  .finally(() => {
                    allowBrowserExitRef.current = false;
                  });
              } catch {
                window.location.assign(nextExit.href);
              }
              return;
            }
            if (
              !resetWorkspace({
                navigate: nextExit.type === "library" ? "library" : "none",
              })
            )
              return;
            if (nextExit.type === "library") {
              setLibraryOpen(true);
              refreshDrafts();
              setStatusMessage(
                "저장하지 않은 변경을 버리고 내 콘텐츠로 이동했습니다.",
              );
              return;
            }
            openDraft(nextExit.draftId);
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
          : pendingWorkspaceExit
            ? {
                title:
                  pendingWorkspaceExit.type === "library"
                    ? "저장하지 않은 변경을 버리고 내 콘텐츠로 이동할까요?"
                    : pendingWorkspaceExit.type === "draft"
                      ? "저장하지 않은 변경을 버리고 다른 콘텐츠를 열까요?"
                      : "저장하지 않은 변경을 버리고 이전 화면으로 이동할까요?",
                description:
                  "계속 작성을 누르면 현재 화면에 머뭅니다. 이동하면 명시 저장하지 않은 원문·결과와 이 기기의 임시 복구본을 버립니다.",
                confirmLabel:
                  pendingWorkspaceExit.type === "library"
                    ? "저장하지 않고 내 콘텐츠로 이동"
                    : pendingWorkspaceExit.type === "draft"
                      ? "저장하지 않고 다른 콘텐츠 열기"
                      : "저장하지 않고 이동",
                notice:
                  "이미 명시 저장한 초안은 그대로 보존됩니다. 지금 변경도 남기려면 계속 작성을 누른 뒤 먼저 초안 저장을 해주세요.",
              }
            : {})}
      />
    </main>
  );
}
