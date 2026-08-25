export type FlowEditorLineEnding = "\n" | "\r\n" | "\r";

export type FlowEditorOffsetAffinity = "before" | "after";

export type FlowEditorSelection = Readonly<{
  anchor: number;
  head: number;
}>;

export type FlowEditorChange = Readonly<{
  /** Start offset in the original, LF-normalized CodeMirror document. */
  fromA: number;
  /** End offset in the original, LF-normalized CodeMirror document. */
  toA: number;
  /** CodeMirror change text. Every supported line ending is contextualized. */
  insertedText: string;
}>;

export type FlowEditorSourceAdapter = Readonly<{
  rawTextLength: number;
  editorText: string;
  preferredLineEnding: FlowEditorLineEnding;
  /**
   * Maps a raw JS-string offset to the LF-normalized editor document.
   * Only the position between CR and LF is ambiguous. Affinity controls which
   * side of that single editor newline receives such a non-canonical offset.
   */
  rawToEditorOffset: (
    rawOffset: number,
    affinity?: FlowEditorOffsetAffinity,
  ) => number;
  /** Maps an LF-normalized editor offset back to an exact raw offset. */
  editorToRawOffset: (editorOffset: number) => number;
}>;

export type FlowEditorRawSnapshot = Readonly<{
  rawText: string;
  selection: FlowEditorSelection;
}>;

type SourceIndex = {
  editorText: string;
  preferredLineEnding: FlowEditorLineEnding;
  rawToEditorBefore: number[];
  rawToEditorAfter: number[];
  editorToRaw: number[];
};

const ADAPTER_RAW_SOURCE = new WeakMap<FlowEditorSourceAdapter, string>();

function assertOffset(value: number, maximum: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > maximum) {
    throw new RangeError(`${label} must be an integer from 0 to ${maximum}.`);
  }
}

function lineEndingAt(
  rawText: string,
  offset: number,
): FlowEditorLineEnding | null {
  const character = rawText[offset];
  if (character === "\r") {
    return rawText[offset + 1] === "\n" ? "\r\n" : "\r";
  }
  return character === "\n" ? "\n" : null;
}

function buildSourceIndex(rawText: string): SourceIndex {
  const rawToEditorBefore = new Array<number>(rawText.length + 1);
  const rawToEditorAfter = new Array<number>(rawText.length + 1);
  const editorToRaw: number[] = [0];
  const editorParts: string[] = [];
  const endingCounts = new Map<FlowEditorLineEnding, number>();
  const endingFirstSeen = new Map<FlowEditorLineEnding, number>();
  let endingOrder = 0;
  let rawOffset = 0;
  let editorOffset = 0;

  rawToEditorBefore[0] = 0;
  rawToEditorAfter[0] = 0;

  while (rawOffset < rawText.length) {
    const ending = lineEndingAt(rawText, rawOffset);
    if (ending) {
      if (!endingFirstSeen.has(ending)) {
        endingFirstSeen.set(ending, endingOrder);
      }
      endingOrder += 1;
      endingCounts.set(ending, (endingCounts.get(ending) ?? 0) + 1);

      const rawLength = ending.length;
      editorParts.push("\n");
      if (rawLength === 2) {
        rawToEditorBefore[rawOffset + 1] = editorOffset;
        rawToEditorAfter[rawOffset + 1] = editorOffset + 1;
      }
      rawOffset += rawLength;
      editorOffset += 1;
      rawToEditorBefore[rawOffset] = editorOffset;
      rawToEditorAfter[rawOffset] = editorOffset;
      editorToRaw[editorOffset] = rawOffset;
      continue;
    }

    editorParts.push(rawText[rawOffset]);
    rawOffset += 1;
    editorOffset += 1;
    rawToEditorBefore[rawOffset] = editorOffset;
    rawToEditorAfter[rawOffset] = editorOffset;
    editorToRaw[editorOffset] = rawOffset;
  }

  let preferredLineEnding: FlowEditorLineEnding = "\n";
  let preferredCount = 0;
  let preferredFirstSeen = Number.POSITIVE_INFINITY;
  for (const ending of ["\n", "\r\n", "\r"] as const) {
    const count = endingCounts.get(ending) ?? 0;
    const firstSeen = endingFirstSeen.get(ending) ?? Number.POSITIVE_INFINITY;
    if (
      count > preferredCount ||
      (count === preferredCount && firstSeen < preferredFirstSeen)
    ) {
      preferredLineEnding = ending;
      preferredCount = count;
      preferredFirstSeen = firstSeen;
    }
  }

  return {
    editorText: editorParts.join(""),
    preferredLineEnding,
    rawToEditorBefore,
    rawToEditorAfter,
    editorToRaw,
  };
}

/**
 * Creates an immutable offset adapter around one exact source string.
 * Offsets use JS UTF-16 string units, matching CodeMirror and parser ranges.
 */
export function createFlowEditorSourceAdapter(
  rawText: string,
): FlowEditorSourceAdapter {
  const index = buildSourceIndex(rawText);
  const adapter: FlowEditorSourceAdapter = Object.freeze({
    rawTextLength: rawText.length,
    editorText: index.editorText,
    preferredLineEnding: index.preferredLineEnding,
    rawToEditorOffset: (
      rawOffset: number,
      affinity: FlowEditorOffsetAffinity = "before",
    ): number => {
      assertOffset(rawOffset, rawText.length, "rawOffset");
      return affinity === "after"
        ? index.rawToEditorAfter[rawOffset]
        : index.rawToEditorBefore[rawOffset];
    },
    editorToRawOffset: (editorOffset: number): number => {
      assertOffset(editorOffset, index.editorText.length, "editorOffset");
      return index.editorToRaw[editorOffset];
    },
  });
  ADAPTER_RAW_SOURCE.set(adapter, rawText);
  return adapter;
}

function previousLineEnding(
  rawText: string,
  offset: number,
): FlowEditorLineEnding | null {
  for (let cursor = Math.min(offset - 1, rawText.length - 1); cursor >= 0;) {
    if (rawText[cursor] === "\n") {
      return cursor > 0 && rawText[cursor - 1] === "\r" ? "\r\n" : "\n";
    }
    if (rawText[cursor] === "\r") return "\r";
    cursor -= 1;
  }
  return null;
}

function contextualLineEnding(
  rawText: string,
  rawOffset: number,
  fallback: FlowEditorLineEnding,
): FlowEditorLineEnding {
  for (let cursor = rawOffset; cursor < rawText.length; cursor += 1) {
    const ending = lineEndingAt(rawText, cursor);
    if (ending) return ending;
  }
  return previousLineEnding(rawText, rawOffset) ?? fallback;
}

function contextualizeInsertedText(
  insertedText: string,
  lineEnding: FlowEditorLineEnding,
): string {
  return insertedText.replace(/\r\n|\r|\n/gu, lineEnding);
}

/** Exact raw replacement. No line-ending or Unicode normalization occurs. */
export function replaceFlowEditorRawRange(
  rawText: string,
  fromRaw: number,
  toRaw: number,
  insertedRaw: string,
): string {
  assertOffset(fromRaw, rawText.length, "fromRaw");
  assertOffset(toRaw, rawText.length, "toRaw");
  if (toRaw < fromRaw) {
    throw new RangeError("toRaw must not be smaller than fromRaw.");
  }
  return rawText.slice(0, fromRaw) + insertedRaw + rawText.slice(toRaw);
}

function validateEditorChanges(
  editorLength: number,
  changes: readonly FlowEditorChange[],
): FlowEditorChange[] {
  const sorted = [...changes].sort(
    (left, right) => left.fromA - right.fromA || left.toA - right.toA,
  );
  sorted.forEach((change, index) => {
    assertOffset(change.fromA, editorLength, `changes[${index}].fromA`);
    assertOffset(change.toA, editorLength, `changes[${index}].toA`);
    if (change.toA < change.fromA) {
      throw new RangeError(`changes[${index}].toA must not precede fromA.`);
    }
    const previous = sorted[index - 1];
    if (
      previous &&
      (change.fromA < previous.toA ||
        (change.fromA === previous.fromA &&
          change.toA === previous.toA &&
          change.fromA === change.toA))
    ) {
      throw new RangeError("Editor changes must be non-overlapping.");
    }
  });
  return sorted;
}

/**
 * Applies CodeMirror changes, whose ranges all address the original normalized
 * document. Descending raw application prevents earlier offsets from moving.
 * Unchanged raw slices are copied verbatim; only inserted newlines adopt the
 * line ending of their source-line context.
 */
export function applyFlowEditorChangesToRaw(
  rawText: string,
  changes: readonly FlowEditorChange[],
  sourceAdapter?: FlowEditorSourceAdapter,
): Readonly<{ rawText: string }> {
  if (changes.length === 0) return Object.freeze({ rawText });

  const adapter = sourceAdapter ?? createFlowEditorSourceAdapter(rawText);
  if (ADAPTER_RAW_SOURCE.get(adapter) !== rawText) {
    throw new RangeError("sourceAdapter does not match the exact raw source.");
  }
  const sorted = validateEditorChanges(adapter.editorText.length, changes);
  const rawChanges = sorted.map((change) => {
    const fromRaw = adapter.editorToRawOffset(change.fromA);
    const toRaw = adapter.editorToRawOffset(change.toA);
    const lineEnding = contextualLineEnding(
      rawText,
      fromRaw,
      adapter.preferredLineEnding,
    );
    return {
      fromRaw,
      toRaw,
      insertedRaw: contextualizeInsertedText(change.insertedText, lineEnding),
    };
  });

  let nextRawText = rawText;
  for (let index = rawChanges.length - 1; index >= 0; index -= 1) {
    const change = rawChanges[index];
    nextRawText = replaceFlowEditorRawRange(
      nextRawText,
      change.fromRaw,
      change.toRaw,
      change.insertedRaw,
    );
  }
  return Object.freeze({ rawText: nextRawText });
}

export function clampFlowEditorSelection(
  selection: FlowEditorSelection,
  documentLength: number,
): FlowEditorSelection {
  if (!Number.isInteger(documentLength) || documentLength < 0) {
    throw new RangeError("documentLength must be a non-negative integer.");
  }
  const clamp = (value: number): number =>
    Number.isFinite(value)
      ? Math.min(documentLength, Math.max(0, Math.trunc(value)))
      : 0;
  return Object.freeze({
    anchor: clamp(selection.anchor),
    head: clamp(selection.head),
  });
}

export function mapFlowEditorSelectionToRaw(
  adapter: FlowEditorSourceAdapter,
  selection: FlowEditorSelection,
): FlowEditorSelection {
  const clamped = clampFlowEditorSelection(
    selection,
    adapter.editorText.length,
  );
  return Object.freeze({
    anchor: adapter.editorToRawOffset(clamped.anchor),
    head: adapter.editorToRawOffset(clamped.head),
  });
}

export function mapFlowRawSelectionToEditor(
  adapter: FlowEditorSourceAdapter,
  selection: FlowEditorSelection,
  affinity: FlowEditorOffsetAffinity = "before",
): FlowEditorSelection {
  const clamped = clampFlowEditorSelection(selection, adapter.rawTextLength);
  return Object.freeze({
    anchor: adapter.rawToEditorOffset(clamped.anchor, affinity),
    head: adapter.rawToEditorOffset(clamped.head, affinity),
  });
}

/** Stores exact source and raw selection for an editor-local undo entry. */
export function createFlowEditorRawSnapshot(
  rawText: string,
  selection: FlowEditorSelection,
): FlowEditorRawSnapshot {
  assertOffset(selection.anchor, rawText.length, "selection.anchor");
  assertOffset(selection.head, rawText.length, "selection.head");
  return Object.freeze({
    rawText,
    selection: Object.freeze({
      anchor: selection.anchor,
      head: selection.head,
    }),
  });
}

/** Returns a fresh immutable value suitable for restoring an undo snapshot. */
export function restoreFlowEditorRawSnapshot(
  snapshot: FlowEditorRawSnapshot,
): FlowEditorRawSnapshot {
  return createFlowEditorRawSnapshot(snapshot.rawText, snapshot.selection);
}
