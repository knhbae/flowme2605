"use client";

import { insertNewline, standardKeymap } from "@codemirror/commands";
import {
  Annotation,
  EditorSelection,
  EditorState,
  StateEffect,
  StateField,
  Transaction,
  type SelectionRange,
  type Text,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  keymap,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { useEffect, useRef } from "react";
import type { Ref } from "react";

import {
  applyFlowEditorChangesToRaw,
  createFlowEditorSourceAdapter,
  replaceFlowEditorRawRange,
} from "@/lib/flow/text-authoring/flow-live-editor-adapter";
import { getAuthoringFlowViewHierarchy } from "@/lib/flow/text-authoring/flow-view-model";
import type {
  AuthoringFlowViewBlock,
  AuthoringFlowViewHierarchy,
  AuthoringFlowViewModel,
} from "@/lib/flow/text-authoring/flow-view-model";

export type FlowLiveEditorSelection = {
  start: number;
  end: number;
  direction: "forward" | "backward" | "none";
  activeBlockId: string | null;
};

type FlowLiveEditorProps = {
  model: AuthoringFlowViewModel;
  rawText: string;
  editorIdentity?: string;
  renderFlow?: boolean;
  busy?: boolean;
  active?: boolean;
  selectionStart?: number;
  selectionEnd?: number;
  selectionDirection?: "forward" | "backward" | "none";
  describedById?: string;
  errorMessageId?: string;
  invalid?: boolean;
  scrollContainerRef?: Ref<HTMLDivElement>;
  onRawTextChange: (value: string) => void;
  onSelectionChange?: (selection: FlowLiveEditorSelection) => void;
  onCompositionChange?: (composing: boolean) => void;
};

type FlowDecorationContext = {
  model: AuthoringFlowViewModel;
  rawText: string;
  sourceVersion: number;
  renderFlow: boolean;
  rawToEditorOffset: (offset: number) => number;
};

type RawSnapshot = {
  rawText: string;
  selection: FlowLiveEditorSelection;
};

type RawHistory = {
  past: RawSnapshot[];
  future: RawSnapshot[];
};

const FLOW_CONTEXT_EFFECT = StateEffect.define<FlowDecorationContext>();
const FLOW_COMPOSING_EFFECT = StateEffect.define<boolean>();
const SOURCE_SYNC_ANNOTATION = Annotation.define<boolean>();
const RAW_HISTORY_LIMIT = 160;
const RAW_HISTORY_CHARACTER_BUDGET = 2_000_000;

const SAFE_STANDARD_KEYMAP = standardKeymap.filter(
  (binding) => binding.key !== "Enter" && binding.key !== "Mod-Enter",
);

function pushHistorySnapshot(
  stack: RawSnapshot[],
  snapshot: RawSnapshot,
): void {
  if (snapshot.rawText.length > RAW_HISTORY_CHARACTER_BUDGET) {
    stack.length = 0;
    return;
  }
  stack.push(snapshot);
  let characterCount = stack.reduce(
    (total, entry) => total + entry.rawText.length,
    0,
  );
  while (
    stack.length > 0 &&
    (stack.length > RAW_HISTORY_LIMIT ||
      characterCount > RAW_HISTORY_CHARACTER_BUDGET)
  ) {
    characterCount -= stack.shift()?.rawText.length ?? 0;
  }
}

function safeOffset(value: number, length: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.trunc(value), 0), length);
}

function rawSelectionFromEditor(
  selection: SelectionRange,
  rawText: string,
  editorToRawOffset: (offset: number) => number,
  model: AuthoringFlowViewModel,
): FlowLiveEditorSelection {
  const anchor = safeOffset(
    editorToRawOffset(selection.anchor),
    rawText.length,
  );
  const head = safeOffset(editorToRawOffset(selection.head), rawText.length);
  const start = Math.min(anchor, head);
  const end = Math.max(anchor, head);
  const direction =
    anchor === head ? "none" : anchor > head ? "backward" : "forward";
  const activeBlock =
    model.blocks.find(
      (block) =>
        start >= block.selectionRange.startOffset &&
        start <= block.selectionRange.endOffset,
    ) ?? model.blocks.at(-1);
  return {
    start,
    end,
    direction,
    activeBlockId: activeBlock?.blockId ?? null,
  };
}

function editorSelectionFromRaw(
  selection: Pick<FlowLiveEditorSelection, "start" | "end" | "direction">,
  rawToEditorOffset: (offset: number) => number,
): EditorSelection {
  const start = rawToEditorOffset(selection.start);
  const end = rawToEditorOffset(selection.end);
  if (selection.direction === "backward") {
    return EditorSelection.create([EditorSelection.range(end, start)]);
  }
  return EditorSelection.create([EditorSelection.range(start, end)]);
}

function selectedBlock(
  block: AuthoringFlowViewBlock,
  selection: EditorSelection,
  rawToEditorOffset: (offset: number) => number,
): boolean {
  const from = rawToEditorOffset(block.selectionRange.startOffset);
  const to = rawToEditorOffset(block.selectionRange.endOffset);
  return selection.ranges.some((range) => {
    if (range.empty) return range.head >= from && range.head <= to;
    return range.from <= to && range.to >= from;
  });
}

function sourceContent(block: AuthoringFlowViewBlock): string {
  const length =
    block.selectionRange.endOffset - block.selectionRange.startOffset;
  return block.rawText.slice(0, Math.max(0, length));
}

function stripInlineLink(value: string): string {
  return value.replace(/\[([^\]]+)\]\((?:https?:\/\/[^\s)]+)\)/giu, "$1");
}

function blockDisplayText(block: AuthoringFlowViewBlock): string {
  if (block.kind === "heading") return stripInlineLink(block.text);
  if (block.kind === "action") return stripInlineLink(block.text);
  if (block.kind === "property")
    return `${block.label}  ${stripInlineLink(block.value)}`;
  if (block.kind === "text" && block.style === "blockquote") {
    return stripInlineLink(sourceContent(block).replace(/^\s*>\s?/u, ""));
  }
  if (block.kind === "text" && block.style === "link") {
    return stripInlineLink(block.text);
  }
  return block.text;
}

function blockWidgetKind(block: AuthoringFlowViewBlock): string | null {
  if (block.attention || block.kind === "blank") return null;
  if (block.kind === "heading") return `heading-${block.level}`;
  if (block.kind === "action") return `action-${block.marker.kind}`;
  if (block.kind === "property") return "property";
  if (block.kind !== "text") return null;
  if (block.style === "blockquote" || block.style === "link") {
    return block.style;
  }
  return null;
}

function blockAccessibleLabel(block: AuthoringFlowViewBlock): string {
  const text = blockDisplayText(block) || "빈 줄";
  const hierarchy = getAuthoringFlowViewHierarchy(block);
  const actionKind =
    block.kind !== "action"
      ? null
      : block.marker.kind === "checkbox"
        ? block.marker.checked
          ? "완료된 체크 항목"
          : "미완료 체크 항목"
        : block.marker.kind === "ordered"
          ? `${block.marker.ordinal}번 목록 항목`
          : "글머리표 항목";
  switch (hierarchy.role) {
    case "root-action":
      return `${actionKind ?? "항목"}, ${text}`;
    case "child-action":
      return `하위 ${actionKind ?? "체크 항목"}, ${text}`;
    case "item-property":
      return `항목 정보, ${text}`;
    case "step-property":
      return `단계 정보, ${text}`;
    case "flow-property":
      return `Flow 정보, ${text}`;
    default:
      return text;
  }
}

class FlowBlockWidget extends WidgetType {
  constructor(
    readonly kind: string,
    readonly text: string,
    readonly rawContent: string,
    readonly from: number,
    readonly to: number,
    readonly marker?: string,
    readonly hierarchy: AuthoringFlowViewHierarchy = {
      depth: 0,
      role: "none",
    },
    readonly reserveMarkerColumn = false,
    readonly accessibleLabel = text || "빈 줄",
  ) {
    super();
  }

  eq(other: FlowBlockWidget): boolean {
    return (
      other.kind === this.kind &&
      other.text === this.text &&
      other.rawContent === this.rawContent &&
      other.from === this.from &&
      other.to === this.to &&
      other.marker === this.marker &&
      other.hierarchy.depth === this.hierarchy.depth &&
      other.hierarchy.role === this.hierarchy.role &&
      other.reserveMarkerColumn === this.reserveMarkerColumn &&
      other.accessibleLabel === this.accessibleLabel
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const root = window.document.createElement("span");
    root.className = `ta-flow-live-widget ta-flow-live-widget-${this.kind}`;
    root.dataset.testid = "ta-authoring-flow-live-rendered-block";
    root.dataset.flowBlockKind = this.kind;
    root.setAttribute("aria-label", this.accessibleLabel);

    if (this.hierarchy.role !== "none") {
      root.classList.add(
        "ta-flow-live-widget-hierarchy",
        `ta-flow-live-widget-depth-${this.hierarchy.depth}`,
      );
      root.dataset.flowHierarchyDepth = String(this.hierarchy.depth);
      root.dataset.flowHierarchyRole = this.hierarchy.role;
    }

    if (this.marker || this.reserveMarkerColumn) {
      const marker = window.document.createElement("span");
      marker.className = "ta-flow-live-marker";
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = this.marker ?? "";
      root.append(marker);
    }
    const text = window.document.createElement("span");
    text.className = "ta-flow-live-text";
    text.textContent = this.text;
    root.append(text);

    root.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      // A rendered label can wrap or use proportional glyphs, so a visual
      // x-ratio cannot safely name a raw-source offset. Reveal the exact raw
      // block at its text start; the next click then uses CodeMirror's native
      // caret mapping against visible source characters.
      const displaySource = this.text.trim();
      const contentIndex = displaySource
        ? this.rawContent.indexOf(displaySource)
        : -1;
      const head = Math.min(this.from + Math.max(contentIndex, 0), this.to);
      const anchor = event.shiftKey ? view.state.selection.main.anchor : head;
      view.dispatch({
        selection: EditorSelection.single(anchor, head),
        scrollIntoView: true,
      });
      view.focus();
    });

    return root;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function markerForBlock(block: AuthoringFlowViewBlock): string | undefined {
  if (block.kind !== "action") return undefined;
  if (block.marker.kind === "checkbox") {
    return block.marker.checked ? "☑" : "☐";
  }
  if (block.marker.kind === "ordered") return `${block.marker.ordinal}.`;
  return "•";
}

function hierarchyLineAttributes(
  block: AuthoringFlowViewBlock,
  blockIndex: number,
  blocks: readonly AuthoringFlowViewBlock[],
  activeRaw: boolean,
): Record<string, string> | null {
  const hierarchy = getAuthoringFlowViewHierarchy(block);
  if (hierarchy.role === "none") return null;

  const previous = blocks[blockIndex - 1];
  const rootGroupStart =
    hierarchy.role === "root-action" &&
    (previous?.kind === "action" || previous?.kind === "property");
  const classNames = [
    "ta-flow-live-line-hierarchy",
    hierarchy.depth === 1
      ? "ta-flow-live-line-child"
      : "ta-flow-live-line-root",
  ];
  if (rootGroupStart) classNames.push("ta-flow-live-line-root-group");
  if (activeRaw) classNames.push("ta-flow-live-line-active-raw");

  const ownerItemId =
    block.kind === "action"
      ? block.entity.ownerItemId
      : block.kind === "property" && block.owner.kind === "item"
        ? block.owner.id
        : undefined;
  return {
    class: classNames.join(" "),
    "data-flow-block-id": block.blockId,
    ...(ownerItemId ? { "data-flow-item-id": ownerItemId } : {}),
    "data-flow-hierarchy-depth": String(hierarchy.depth),
    "data-flow-hierarchy-role": hierarchy.role,
    "data-flow-editor-state": activeRaw ? "raw" : "rendered",
  };
}

function quietSourceLineKind(block: AuthoringFlowViewBlock): string | null {
  if (block.attention || block.kind !== "text") return null;
  if (
    block.style === "code" ||
    block.style === "html" ||
    block.style === "comment" ||
    block.style === "metadata" ||
    block.style === "table"
  ) {
    return block.style;
  }
  return null;
}

function buildFlowDecorations(
  doc: Text,
  selection: EditorSelection,
  context: FlowDecorationContext,
): DecorationSet {
  if (!context.renderFlow || context.model.status !== "current") {
    return Decoration.none;
  }
  const ranges: ReturnType<Decoration["range"]>[] = [];

  for (const [blockIndex, block] of context.model.blocks.entries()) {
    const from = context.rawToEditorOffset(block.selectionRange.startOffset);
    const to = context.rawToEditorOffset(block.selectionRange.endOffset);
    const activeRaw = selectedBlock(
      block,
      selection,
      context.rawToEditorOffset,
    );
    const lineAttributes = hierarchyLineAttributes(
      block,
      blockIndex,
      context.model.blocks,
      activeRaw,
    );
    if (lineAttributes) {
      const line = doc.lineAt(Math.min(from, doc.length));
      ranges.push(
        Decoration.line({ attributes: lineAttributes }).range(line.from),
      );
    }
    if (activeRaw) continue;
    const quietKind = quietSourceLineKind(block);
    if (quietKind) {
      const line = doc.lineAt(Math.min(from, doc.length));
      ranges.push(
        Decoration.line({ class: `ta-flow-live-source-${quietKind}` }).range(
          line.from,
        ),
      );
      continue;
    }
    const kind = blockWidgetKind(block);
    if (!kind || from >= to) continue;
    const text = blockDisplayText(block);
    const hierarchy = getAuthoringFlowViewHierarchy(block);
    ranges.push(
      Decoration.replace({
        widget: new FlowBlockWidget(
          kind,
          text,
          sourceContent(block),
          from,
          to,
          markerForBlock(block),
          hierarchy,
          block.kind === "action" || block.kind === "property",
          blockAccessibleLabel(block),
        ),
      }).range(from, to),
    );
  }
  return Decoration.set(ranges, true);
}

type FlowDecorationState = {
  context: FlowDecorationContext;
  contextCurrent: boolean;
  composing: boolean;
  decorations: DecorationSet;
};

function flowDecorations(
  initialContext: FlowDecorationContext,
): StateField<FlowDecorationState> {
  return StateField.define<FlowDecorationState>({
    create(state) {
      return {
        context: initialContext,
        contextCurrent: true,
        composing: false,
        decorations: buildFlowDecorations(
          state.doc,
          state.selection,
          initialContext,
        ),
      };
    },
    update(previous, transaction) {
      let context = previous.context;
      let contextCurrent = transaction.docChanged
        ? false
        : previous.contextCurrent;
      let composing = previous.composing;
      let contextChanged = false;
      let compositionChanged = false;
      for (const effect of transaction.effects) {
        if (effect.is(FLOW_CONTEXT_EFFECT)) {
          if (effect.value.sourceVersion >= context.sourceVersion) {
            context = effect.value;
            contextCurrent = true;
            contextChanged = true;
          }
        } else if (effect.is(FLOW_COMPOSING_EFFECT)) {
          composing = effect.value;
          compositionChanged = true;
        }
      }

      let decorations = previous.decorations;
      if (composing) {
        decorations = decorations.map(transaction.changes);
      } else if (!contextCurrent) {
        decorations = Decoration.none;
      } else if (
        contextChanged ||
        compositionChanged ||
        transaction.docChanged ||
        transaction.selection !== undefined
      ) {
        decorations = buildFlowDecorations(
          transaction.newDoc,
          transaction.newSelection,
          context,
        );
      }

      return { context, contextCurrent, composing, decorations };
    },
    provide: (field) =>
      EditorView.decorations.from(field, (value) => value.decorations),
  });
}

const FLOW_EDITOR_THEME = EditorView.theme({
  "&": {
    height: "100%",
    minHeight: "300px",
    backgroundColor: "transparent",
    color: "var(--flowme-text)",
    fontSize: "0.875rem",
  },
  "&.cm-focused": {
    outline: "2px solid var(--flowme-focus)",
    outlineOffset: "-2px",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "inherit",
    overscrollBehavior: "contain",
  },
  ".cm-content": {
    width: "100%",
    maxWidth: "68ch",
    minHeight: "100%",
    margin: "0 auto",
    padding: "1.5rem 1rem 6rem",
    caretColor: "var(--flowme-action)",
    overflowWrap: "anywhere",
  },
  ".cm-line": {
    minHeight: "1.5rem",
    padding: "0",
    lineHeight: "1.5rem",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor:
      "color-mix(in srgb, var(--flowme-action) 18%, transparent)",
  },
  ".cm-cursor": { borderLeftColor: "var(--flowme-action)" },
  ".ta-flow-live-widget": {
    display: "inline",
    cursor: "text",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  ".cm-line.ta-flow-live-line-hierarchy": {
    position: "relative",
    boxSizing: "border-box",
  },
  ".cm-line.ta-flow-live-line-child": {
    paddingInlineStart: "0.75rem",
  },
  ".cm-line.ta-flow-live-line-child::before": {
    content: '""',
    position: "absolute",
    insetInlineStart: "0.25rem",
    insetBlock: "0",
    borderInlineStart: "1px solid var(--flowme-border-strong)",
    pointerEvents: "none",
  },
  ".cm-line.ta-flow-live-line-root-group": {
    paddingTop: "0.5rem",
  },
  ".ta-flow-live-widget-hierarchy": {
    display: "inline-grid",
    width: "100%",
    minWidth: "0",
    maxWidth: "100%",
    gridTemplateColumns: "1.375rem minmax(0, 1fr)",
    columnGap: "0.125rem",
    alignItems: "start",
    verticalAlign: "top",
    boxSizing: "border-box",
  },
  ".ta-flow-live-widget-hierarchy .ta-flow-live-text": {
    minWidth: "0",
    overflowWrap: "anywhere",
  },
  ".ta-flow-live-widget-heading-1": {
    fontSize: "1.5rem",
    fontWeight: "650",
    lineHeight: "2.25rem",
    letterSpacing: "-0.02em",
  },
  ".ta-flow-live-widget-heading-2": {
    fontSize: "1.125rem",
    fontWeight: "650",
    lineHeight: "1.875rem",
    letterSpacing: "-0.01em",
  },
  ".ta-flow-live-widget-heading-3, .ta-flow-live-widget-heading-4, .ta-flow-live-widget-heading-5, .ta-flow-live-widget-heading-6":
    {
      fontSize: "1rem",
      fontWeight: "650",
      lineHeight: "1.75rem",
    },
  ".ta-flow-live-marker": {
    display: "block",
    width: "auto",
    color: "var(--flowme-text-secondary)",
    textAlign: "center",
    lineHeight: "inherit",
  },
  ".ta-flow-live-widget-property": {
    fontSize: "0.8125rem",
    color: "var(--flowme-text-secondary)",
  },
  ".ta-flow-live-widget-blockquote": {
    borderLeft: "2px solid var(--flowme-border-strong)",
    paddingLeft: "0.75rem",
    color: "var(--flowme-text-secondary)",
  },
  ".ta-flow-live-widget-link": {
    color: "var(--flowme-action)",
    textDecoration: "underline",
    textUnderlineOffset: "4px",
  },
  ".ta-flow-live-source-code, .ta-flow-live-source-html, .ta-flow-live-source-comment, .ta-flow-live-source-metadata, .ta-flow-live-source-table":
    {
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: "0.75rem",
    },
  ".ta-flow-live-source-comment, .ta-flow-live-source-metadata": {
    color: "var(--flowme-text-tertiary)",
  },
  "@media (min-width: 640px)": {
    ".cm-content": { paddingLeft: "1.5rem", paddingRight: "1.5rem" },
  },
  "@media (max-width: 390px)": {
    ".cm-line.ta-flow-live-line-child": { paddingInlineStart: "0.625rem" },
    ".cm-line.ta-flow-live-line-child::before": {
      insetInlineStart: "0.1875rem",
    },
    ".ta-flow-live-widget-hierarchy": {
      gridTemplateColumns: "1.25rem minmax(0, 1fr)",
      columnGap: "0.0625rem",
    },
  },
  "@media (prefers-reduced-motion: reduce)": {
    ".cm-scroller": { scrollBehavior: "auto" },
  },
});

function hasSyncAnnotation(update: ViewUpdate): boolean {
  return update.transactions.some(
    (transaction) => transaction.annotation(SOURCE_SYNC_ANNOTATION) === true,
  );
}

export function FlowLiveEditor({
  model,
  rawText,
  editorIdentity = "unsaved-text-authoring-document",
  renderFlow = true,
  busy = false,
  active = true,
  selectionStart = 0,
  selectionEnd = selectionStart,
  selectionDirection = "none",
  describedById,
  errorMessageId,
  invalid = false,
  scrollContainerRef,
  onRawTextChange,
  onSelectionChange,
  onCompositionChange,
}: FlowLiveEditorProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const rawTextRef = useRef(rawText);
  const modelRef = useRef(model);
  const adapterRef = useRef<ReturnType<
    typeof createFlowEditorSourceAdapter
  > | null>(null);
  adapterRef.current ??= createFlowEditorSourceAdapter(rawText);
  const pendingRawTextRef = useRef<string | null>(null);
  const sourceVersionRef = useRef(0);
  const callbacksRef = useRef({
    onRawTextChange,
    onSelectionChange,
    onCompositionChange,
  });
  const historyRef = useRef<RawHistory>({ past: [], future: [] });
  const historyGroupRef = useRef<{ key: string | null; at: number }>({
    key: null,
    at: 0,
  });
  const compositionSnapshotRef = useRef<RawSnapshot | null>(null);
  const editorIdentityRef = useRef(editorIdentity);
  const activeRef = useRef(active);
  const externalSelectionRef = useRef({
    start: selectionStart,
    end: selectionEnd,
    direction: selectionDirection,
  });

  callbacksRef.current = {
    onRawTextChange,
    onSelectionChange,
    onCompositionChange,
  };
  modelRef.current = model;
  activeRef.current = active;
  externalSelectionRef.current = {
    start: selectionStart,
    end: selectionEnd,
    direction: selectionDirection,
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || viewRef.current) return;
    const adapter = adapterRef.current!;
    const initialSelection = editorSelectionFromRaw(
      {
        start: safeOffset(selectionStart, rawText.length),
        end: safeOffset(selectionEnd, rawText.length),
        direction: selectionDirection,
      },
      adapter.rawToEditorOffset,
    );
    const initialContext: FlowDecorationContext = {
      model: modelRef.current,
      rawText: rawTextRef.current,
      sourceVersion: sourceVersionRef.current,
      renderFlow,
      rawToEditorOffset: adapter.rawToEditorOffset,
    };

    const currentSnapshot = (view: EditorView): RawSnapshot => {
      const currentAdapter = adapterRef.current!;
      return {
        rawText: rawTextRef.current,
        selection: rawSelectionFromEditor(
          view.state.selection.main,
          rawTextRef.current,
          currentAdapter.editorToRawOffset,
          modelRef.current,
        ),
      };
    };

    const reportSelection = (view: EditorView) => {
      const currentAdapter = adapterRef.current!;
      callbacksRef.current.onSelectionChange?.(
        rawSelectionFromEditor(
          view.state.selection.main,
          rawTextRef.current,
          currentAdapter.editorToRawOffset,
          modelRef.current,
        ),
      );
    };

    const dispatchRawSnapshot = (
      view: EditorView,
      snapshot: RawSnapshot,
      options: { focus?: boolean } = {},
    ) => {
      const nextAdapter = createFlowEditorSourceAdapter(snapshot.rawText);
      rawTextRef.current = snapshot.rawText;
      adapterRef.current = nextAdapter;
      pendingRawTextRef.current = snapshot.rawText;
      sourceVersionRef.current += 1;
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: nextAdapter.editorText,
        },
        selection: editorSelectionFromRaw(
          snapshot.selection,
          nextAdapter.rawToEditorOffset,
        ),
        annotations: [
          SOURCE_SYNC_ANNOTATION.of(true),
          Transaction.addToHistory.of(false),
        ],
      });
      callbacksRef.current.onRawTextChange(snapshot.rawText);
      callbacksRef.current.onSelectionChange?.(snapshot.selection);
      if (options.focus) view.focus();
    };

    const restoreRawHistory = (
      view: EditorView,
      direction: "undo" | "redo",
    ) => {
      const history = historyRef.current;
      const source = direction === "undo" ? history.past : history.future;
      const target = source.pop();
      if (!target) return false;
      historyGroupRef.current = { key: null, at: 0 };
      const destination = direction === "undo" ? history.future : history.past;
      pushHistorySnapshot(destination, currentSnapshot(view));
      dispatchRawSnapshot(view, target, { focus: true });
      return true;
    };

    const recordSnapshot = (snapshot: RawSnapshot, groupKey?: string) => {
      const history = historyRef.current;
      const now = Date.now();
      const previousGroup = historyGroupRef.current;
      if (
        groupKey &&
        previousGroup.key === groupKey &&
        now - previousGroup.at <= 1_000
      ) {
        historyGroupRef.current = { key: groupKey, at: now };
        return;
      }
      pushHistorySnapshot(history.past, snapshot);
      history.future = [];
      historyGroupRef.current = { key: groupKey ?? null, at: now };
    };

    const revealDocumentBoundary = (
      editor: EditorView,
      boundary: "start" | "end",
    ) => {
      const position = boundary === "end" ? editor.state.doc.length : 0;
      const reveal = () => {
        if (viewRef.current !== editor || !editor.dom.isConnected) return;
        editor.requestMeasure();
        editor.dispatch({
          effects: EditorView.scrollIntoView(position, { y: boundary }),
          annotations: Transaction.addToHistory.of(false),
        });
        editor.scrollDOM.scrollTop =
          boundary === "end" ? editor.scrollDOM.scrollHeight : 0;
        const outerPane = editor.dom.closest<HTMLElement>(
          "[data-authoring-pane-scroll]",
        );
        if (outerPane) {
          outerPane.scrollTop =
            boundary === "end" ? outerPane.scrollHeight : 0;
        }
      };

      editor.dispatch({
        selection: EditorSelection.cursor(position),
        effects: EditorView.scrollIntoView(position, { y: boundary }),
        annotations: Transaction.addToHistory.of(false),
      });
      // CodeMirror virtualizes long wrapped documents. A browser zoom or
      // root-font reflow can refine the estimated height over several frames,
      // so keep the requested boundary and its clipping pane aligned while
      // those measurements settle.
      let remainingFrames = 12;
      const settle = () => {
        reveal();
        remainingFrames -= 1;
        if (remainingFrames > 0 && viewRef.current === editor) {
          window.requestAnimationFrame(settle);
        }
      };
      window.requestAnimationFrame(settle);
      return true;
    };

    const replaceRawSelection = (
      view: EditorView,
      insertedRaw: string,
      options: { clipboard?: DataTransfer | null } = {},
    ) => {
      const currentAdapter = adapterRef.current!;
      const selection = view.state.selection.main;
      const rawFrom = currentAdapter.editorToRawOffset(selection.from);
      const rawTo = currentAdapter.editorToRawOffset(selection.to);
      const previous = currentSnapshot(view);
      const nextRawText = replaceFlowEditorRawRange(
        rawTextRef.current,
        rawFrom,
        rawTo,
        insertedRaw,
      );
      const nextCaret = rawFrom + insertedRaw.length;
      recordSnapshot(previous);
      dispatchRawSnapshot(
        view,
        {
          rawText: nextRawText,
          selection: {
            start: nextCaret,
            end: nextCaret,
            direction: "none",
            activeBlockId: null,
          },
        },
        { focus: true },
      );
      void options;
      return true;
    };

    const view = new EditorView({
      parent: mount,
      state: EditorState.create({
        doc: adapter.editorText,
        selection: initialSelection,
        extensions: [
          EditorView.lineWrapping,
          FLOW_EDITOR_THEME,
          flowDecorations(initialContext),
          EditorView.contentAttributes.of({
            "aria-label": "텍스트 편집기",
            "aria-multiline": "true",
            "data-testid": "ta-authoring-flow-editor-content",
            spellcheck: "false",
          }),
          keymap.of([
            {
              key: "Mod-Home",
              preventDefault: true,
              run: (editor) => revealDocumentBoundary(editor, "start"),
            },
            {
              key: "Mod-End",
              preventDefault: true,
              run: (editor) => revealDocumentBoundary(editor, "end"),
            },
            {
              key: "Mod-z",
              preventDefault: true,
              run: (editor) => restoreRawHistory(editor, "undo"),
            },
            {
              key: "Mod-Shift-z",
              preventDefault: true,
              run: (editor) => restoreRawHistory(editor, "redo"),
            },
            {
              key: "Mod-y",
              preventDefault: true,
              run: (editor) => restoreRawHistory(editor, "redo"),
            },
            {
              key: "Enter",
              preventDefault: true,
              run: insertNewline,
              shift: insertNewline,
            },
            ...SAFE_STANDARD_KEYMAP,
          ]),
          EditorView.domEventHandlers({
            compositionstart(_event, editor) {
              if (!compositionSnapshotRef.current) {
                compositionSnapshotRef.current = currentSnapshot(editor);
              }
              callbacksRef.current.onCompositionChange?.(true);
              editor.dispatch({
                effects: FLOW_COMPOSING_EFFECT.of(true),
                annotations: Transaction.addToHistory.of(false),
              });
              return false;
            },
            compositionend(_event, editor) {
              window.requestAnimationFrame(() => {
                if (viewRef.current !== editor) return;
                const snapshot = compositionSnapshotRef.current;
                compositionSnapshotRef.current = null;
                if (snapshot && snapshot.rawText !== rawTextRef.current) {
                  recordSnapshot(snapshot);
                }
                callbacksRef.current.onCompositionChange?.(false);
                editor.dispatch({
                  effects: FLOW_COMPOSING_EFFECT.of(false),
                  annotations: Transaction.addToHistory.of(false),
                });
              });
              return false;
            },
            copy(event, editor) {
              const selection = editor.state.selection.main;
              if (selection.empty || !event.clipboardData) return false;
              const currentAdapter = adapterRef.current!;
              const from = currentAdapter.editorToRawOffset(selection.from);
              const to = currentAdapter.editorToRawOffset(selection.to);
              event.clipboardData.setData(
                "text/plain",
                rawTextRef.current.slice(from, to),
              );
              event.preventDefault();
              return true;
            },
            cut(event, editor) {
              const selection = editor.state.selection.main;
              if (selection.empty || !event.clipboardData) return false;
              const currentAdapter = adapterRef.current!;
              const from = currentAdapter.editorToRawOffset(selection.from);
              const to = currentAdapter.editorToRawOffset(selection.to);
              event.clipboardData.setData(
                "text/plain",
                rawTextRef.current.slice(from, to),
              );
              event.preventDefault();
              return replaceRawSelection(editor, "");
            },
            paste(event, editor) {
              if (!event.clipboardData) return false;
              if (
                !Array.from(event.clipboardData.types).includes("text/plain")
              ) {
                // A file/image-only paste must never replace selected source
                // bytes with an implicit empty string.
                event.preventDefault();
                return true;
              }
              const insertedRaw = event.clipboardData.getData("text/plain");
              event.preventDefault();
              return replaceRawSelection(editor, insertedRaw, {
                clipboard: event.clipboardData,
              });
            },
          }),
          EditorView.updateListener.of((update) => {
            const sourceSync = hasSyncAnnotation(update);
            if (update.docChanged && !sourceSync) {
              const previous = {
                rawText: rawTextRef.current,
                selection: rawSelectionFromEditor(
                  update.startState.selection.main,
                  rawTextRef.current,
                  adapterRef.current!.editorToRawOffset,
                  modelRef.current,
                ),
              } satisfies RawSnapshot;
              const changes: Array<{
                fromA: number;
                toA: number;
                insertedText: string;
              }> = [];
              update.changes.iterChanges(
                (fromA, toA, _fromB, _toB, inserted) => {
                  changes.push({
                    fromA,
                    toA,
                    insertedText: inserted.toString(),
                  });
                },
              );
              const next = applyFlowEditorChangesToRaw(
                rawTextRef.current,
                changes,
                adapterRef.current!,
              );
              if (!compositionSnapshotRef.current && !update.view.composing) {
                const userEvent = update.transactions
                  .map((transaction) =>
                    transaction.annotation(Transaction.userEvent),
                  )
                  .find((value): value is string => Boolean(value));
                const groupKey =
                  userEvent && /^(?:input\.type|delete\.)/u.test(userEvent)
                    ? userEvent
                    : undefined;
                recordSnapshot(previous, groupKey);
              }
              sourceVersionRef.current += 1;
              rawTextRef.current = next.rawText;
              adapterRef.current = createFlowEditorSourceAdapter(next.rawText);
              pendingRawTextRef.current = next.rawText;
              callbacksRef.current.onRawTextChange(next.rawText);
            }
            if (update.selectionSet || update.docChanged) {
              // Selection reporting below uses the exact raw adapter after any
              // document change, including mixed line endings.
            }
            if (
              activeRef.current &&
              !sourceSync &&
              (update.selectionSet || update.docChanged)
            ) {
              reportSelection(update.view);
            }
            if (update.selectionSet && !update.docChanged) {
              historyGroupRef.current = { key: null, at: 0 };
            }
          }),
        ],
      }),
    });
    viewRef.current = view;
    if (activeRef.current) {
      window.requestAnimationFrame(() => view.focus());
    }

    return () => {
      if (compositionSnapshotRef.current) {
        compositionSnapshotRef.current = null;
        callbacksRef.current.onCompositionChange?.(false);
      }
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (editorIdentityRef.current === editorIdentity) return;
    editorIdentityRef.current = editorIdentity;
    const ownIdentityTransition =
      pendingRawTextRef.current === rawTextRef.current;
    if (!ownIdentityTransition) {
      historyRef.current = { past: [], future: [] };
      historyGroupRef.current = { key: null, at: 0 };
    }
    compositionSnapshotRef.current = null;
    if (!ownIdentityTransition) pendingRawTextRef.current = null;
  }, [editorIdentity]);

  useEffect(() => {
    const content = viewRef.current?.contentDOM;
    if (!content) return;
    content.setAttribute(
      "aria-label",
      renderFlow ? "Flow 텍스트 편집기" : "작업 원문",
    );
    if (describedById) content.setAttribute("aria-describedby", describedById);
    else content.removeAttribute("aria-describedby");
    if (invalid) content.setAttribute("aria-invalid", "true");
    else content.removeAttribute("aria-invalid");
    if (invalid && errorMessageId) {
      content.setAttribute("aria-errormessage", errorMessageId);
    } else {
      content.removeAttribute("aria-errormessage");
    }
  }, [describedById, errorMessageId, invalid, renderFlow]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    let nextAdapter = adapterRef.current!;
    const isOwnChange = pendingRawTextRef.current === rawText;
    if (isOwnChange) pendingRawTextRef.current = null;
    const externalSelection = externalSelectionRef.current;
    const nextSelection = {
      start: safeOffset(externalSelection.start, rawText.length),
      end: safeOffset(externalSelection.end, rawText.length),
      direction: externalSelection.direction,
      activeBlockId: null,
    } satisfies FlowLiveEditorSelection;

    if (rawTextRef.current !== rawText) {
      nextAdapter = createFlowEditorSourceAdapter(rawText);
      sourceVersionRef.current += 1;
      rawTextRef.current = rawText;
      adapterRef.current = nextAdapter;
      if (!isOwnChange) historyRef.current = { past: [], future: [] };
      if (!isOwnChange) historyGroupRef.current = { key: null, at: 0 };
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: nextAdapter.editorText,
        },
        selection: editorSelectionFromRaw(
          nextSelection,
          nextAdapter.rawToEditorOffset,
        ),
        annotations: [
          SOURCE_SYNC_ANNOTATION.of(true),
          Transaction.addToHistory.of(false),
        ],
      });
    }

    view.dispatch({
      effects: FLOW_CONTEXT_EFFECT.of({
        model,
        rawText,
        sourceVersion: sourceVersionRef.current,
        renderFlow,
        rawToEditorOffset: nextAdapter.rawToEditorOffset,
      }),
      annotations: Transaction.addToHistory.of(false),
    });
  }, [model, rawText, renderFlow]);

  useEffect(() => {
    if (!active) return;
    const view = viewRef.current;
    if (!view) return;
    const adapter = adapterRef.current!;
    const desiredSelection = editorSelectionFromRaw(
      {
        start: safeOffset(selectionStart, rawTextRef.current.length),
        end: safeOffset(selectionEnd, rawTextRef.current.length),
        direction: selectionDirection,
      },
      adapter.rawToEditorOffset,
    ).main;
    const currentSelection = view.state.selection.main;
    if (
      desiredSelection.anchor !== currentSelection.anchor ||
      desiredSelection.head !== currentSelection.head
    ) {
      view.dispatch({
        selection: EditorSelection.create([desiredSelection]),
        scrollIntoView: true,
        annotations: Transaction.addToHistory.of(false),
      });
    }
  }, [active, selectionDirection, selectionEnd, selectionStart]);

  useEffect(() => {
    if (!active) return;
    const frame = window.requestAnimationFrame(() => viewRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [active]);

  useEffect(() => {
    const scroller = viewRef.current?.scrollDOM;
    if (!scroller || !scrollContainerRef) return;
    if (typeof scrollContainerRef === "function") {
      scrollContainerRef(scroller as HTMLDivElement);
      return () => {
        scrollContainerRef(null);
      };
    }
    scrollContainerRef.current = scroller as HTMLDivElement;
    return () => {
      scrollContainerRef.current = null;
    };
  }, [scrollContainerRef]);

  const fallbackCopy =
    model.status === "raw-only-too-large"
      ? "문서가 길어 구조 표현을 줄이고 원문 편집을 유지합니다."
      : model.status === "raw-only-stale"
        ? "현재 원문을 안전하게 다시 확인하는 중입니다."
        : null;

  return (
    <section
      data-testid="ta-authoring-flow-editor"
      data-editor-mode={renderFlow ? "flow" : "text"}
      className="flex h-full min-h-0 min-w-0 flex-col bg-[var(--flowme-surface)]"
      aria-label={renderFlow ? "Flow 편집" : "순수 텍스트 편집"}
      aria-busy={busy}
    >
      {busy ? (
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          data-testid="ta-authoring-flow-editor-updating"
        >
          오른쪽 결과를 갱신하고 있습니다.
        </p>
      ) : null}
      {fallbackCopy ? (
        <p
          role="status"
          className="shrink-0 px-4 pt-3 text-xs leading-5 text-[var(--flowme-text-secondary)]"
          data-testid="ta-authoring-flow-editor-fallback"
        >
          {fallbackCopy}
        </p>
      ) : null}
      <div
        ref={mountRef}
        data-testid="ta-authoring-flow-editor-mount"
        className="min-h-0 min-w-0 flex-1 overflow-hidden"
      />
    </section>
  );
}
