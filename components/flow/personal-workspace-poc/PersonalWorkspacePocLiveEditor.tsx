'use client';

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import { fingerprintPersonalWorkspacePocAuthoringSource } from '@/lib/flow/personal-workspace-poc-authoring';

export type PersonalWorkspacePocLiveEditorLineKind =
  | 'safe'
  | 'incomplete'
  | 'protected'
  | 'unsupported';

export type PersonalWorkspacePocLiveEditorLineRole =
  | 'title'
  | 'section'
  | 'task'
  | 'property'
  | 'prose';

export type PersonalWorkspacePocLiveEditorLineGuide = Readonly<{
  /** One-based source line. */
  line: number;
  kind: PersonalWorkspacePocLiveEditorLineKind;
  role?: PersonalWorkspacePocLiveEditorLineRole;
  hierarchyDepth?: 0 | 1;
  showHierarchyGuide?: boolean;
  /**
   * A decorative representation of this exact source line. It is accepted only
   * when its UTF-16 length matches the raw line, so soft wrapping and caret
   * geometry stay aligned. Otherwise the raw line is used.
   */
  presentationText?: string;
  reviewMessage?: string;
  ghost?: Readonly<{
    /** UTF-16 offsets within this line. Both ends must point to the same blank value. */
    valueStart: number;
    valueEnd: number;
    expectedValue: '';
    text: string;
  }>;
}>;

export type PersonalWorkspacePocLiveEditorSnapshot = Readonly<{
  editorId: string;
  documentId: string;
  rawText: string;
  sourceFingerprint: string;
  selectionStart: number;
  selectionEnd: number;
  selectionDirection: 'forward' | 'backward' | 'none';
  scrollTop: number;
  scrollLeft: number;
  dispatchCount: number;
  composing: boolean;
}>;

export type PersonalWorkspacePocNativeReplacementRequest = Readonly<{
  expected: PersonalWorkspacePocLiveEditorSnapshot;
  replacement: string;
  range?: Readonly<{
    start: number;
    end: number;
    direction?: 'forward' | 'backward' | 'none';
  }>;
}>;

export type PersonalWorkspacePocNativeReplacementFailureReason =
  | 'editor-unavailable'
  | 'stale-snapshot'
  | 'composition-active'
  | 'invalid-range'
  | 'replacement-no-op'
  | 'native-transaction-in-progress'
  | 'native-command-unavailable'
  | 'native-command-rejected'
  | 'native-transaction-diverged';

export type PersonalWorkspacePocNativeReplacementResult =
  | Readonly<{
    ok: true;
    snapshot: PersonalWorkspacePocLiveEditorSnapshot;
  }>
  | Readonly<{
    ok: false;
    reason: PersonalWorkspacePocNativeReplacementFailureReason;
    snapshot: PersonalWorkspacePocLiveEditorSnapshot | null;
  }>;

export type PersonalWorkspacePocLiveEditorHandle = Readonly<{
  readSnapshot: () => PersonalWorkspacePocLiveEditorSnapshot | null;
  focusRange: (
    start: number,
    end?: number,
    direction?: 'forward' | 'backward' | 'none',
  ) => boolean;
  applyNativeReplacement: (
    request: PersonalWorkspacePocNativeReplacementRequest,
  ) => Promise<PersonalWorkspacePocNativeReplacementResult>;
}>;

export type PersonalWorkspacePocLiveEditorProps = Readonly<{
  /**
   * These two IDs identify one mounted native editing host. Mount a new keyed
   * component for a different document; view-option changes must reuse it.
   */
  editorId: string;
  documentId: string;
  /** Mount-time source bytes, loaded only after draft recovery has completed. */
  initialValue: string;
  lineGuides?: readonly PersonalWorkspacePocLiveEditorLineGuide[];
  label?: string;
  disabled?: boolean;
  rows?: number;
  defaultFlowViewVisible?: boolean;
  defaultGhostVisible?: boolean;
  defaultReviewVisible?: boolean;
  /** The integrated surface owns the single optional review drawer. */
  showReviewControl?: boolean;
  contextAction?: Readonly<{
    sourceLine: number;
    owner: 'blank-line' | 'root-item';
    expanded: boolean;
    controlsId: string;
    onOpen: (opener: HTMLButtonElement) => void;
  }>;
  /** Non-floating controls owned by the currently active source Item. */
  inlinePanel?: ReactNode;
  onNativeInput?: (
    snapshot: PersonalWorkspacePocLiveEditorSnapshot,
    inputType: string,
  ) => void;
  /** Selection-only updates let the parent re-project the previously active line. */
  onSelectionChange?: (snapshot: PersonalWorkspacePocLiveEditorSnapshot) => void;
}>;

export type PersonalWorkspacePocLiveEditorPresentationLine = Readonly<{
  line: number;
  rawText: string;
  displayText: string;
  mode: 'raw' | 'presented';
  role: PersonalWorkspacePocLiveEditorLineRole;
  hierarchyDepth: 0 | 1;
  showHierarchyGuide: boolean;
  ghost?: Readonly<{
    offset: number;
    text: string;
  }>;
}>;

type SelectionMirror = Readonly<{
  start: number;
  end: number;
}>;

type PendingNativeInputObservation = {
  eventCount: number;
  lastInputType: string;
  quietTimer?: number;
  resolve: () => void;
};

const EMPTY_SELECTION: SelectionMirror = Object.freeze({ start: 0, end: 0 });

function clampOffset(value: string, offset: number): number {
  if (!Number.isInteger(offset)) return 0;
  return Math.max(0, Math.min(offset, value.length));
}

type LogicalSourceLine = Readonly<{
  line: number;
  start: number;
  contentEnd: number;
  end: number;
  rawText: string;
  terminator: '\r\n' | '\r' | '\n' | '';
}>;

/** Splits logical lines without ever folding terminator bytes into rawText. */
function splitLogicalSourceLines(value: string): readonly LogicalSourceLine[] {
  const lines: LogicalSourceLine[] = [];
  let start = 0;
  let cursor = 0;

  while (cursor < value.length) {
    const character = value[cursor];
    if (character !== '\r' && character !== '\n') {
      cursor += 1;
      continue;
    }

    const terminator = character === '\r' && value[cursor + 1] === '\n'
      ? '\r\n'
      : character;
    const end = cursor + terminator.length;
    lines.push({
      line: lines.length + 1,
      start,
      contentEnd: cursor,
      end,
      rawText: value.slice(start, cursor),
      terminator,
    });
    start = end;
    cursor = end;
  }

  lines.push({
    line: lines.length + 1,
    start,
    contentEnd: value.length,
    end: value.length,
    rawText: value.slice(start),
    terminator: '',
  });
  return lines;
}

function sourceLineAt(value: string, offset: number): number {
  const safeOffset = clampOffset(value, offset);
  const lines = splitLogicalSourceLines(value);
  for (const line of lines) {
    // A caret inside CRLF still belongs to the preceding logical line. Once it
    // passes the complete terminator it belongs to the next line.
    if (safeOffset < line.end || line.terminator === '') return line.line;
  }
  return lines.length;
}

function selectedSourceLineRange(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): Readonly<{ first: number; last: number }> {
  const start = clampOffset(value, selectionStart);
  const end = clampOffset(value, Math.max(selectionStart, selectionEnd));
  const lastTouchedOffset = end > start ? end - 1 : end;
  return {
    first: sourceLineAt(value, start),
    last: sourceLineAt(value, lastTouchedOffset),
  };
}

function isSameLengthSingleLine(rawText: string, presentationText: string): boolean {
  return rawText.length === presentationText.length
    && !presentationText.includes('\n')
    && !presentationText.includes('\r');
}

function isRecognizedBlankGhost(
  rawText: string,
  guide: PersonalWorkspacePocLiveEditorLineGuide,
): guide is PersonalWorkspacePocLiveEditorLineGuide & {
  ghost: NonNullable<PersonalWorkspacePocLiveEditorLineGuide['ghost']>;
} {
  const ghost = guide.ghost;
  if (!ghost || ghost.expectedValue !== '' || ghost.text.trim().length === 0) return false;
  if (ghost.text.includes('\n') || ghost.text.includes('\r')) return false;
  if (!Number.isInteger(ghost.valueStart) || !Number.isInteger(ghost.valueEnd)) return false;
  if (ghost.valueStart < 0 || ghost.valueEnd !== ghost.valueStart || ghost.valueEnd > rawText.length) {
    return false;
  }
  return rawText.slice(ghost.valueStart, ghost.valueEnd) === '';
}

/**
 * Builds presentation-only lines. Any ambiguous geometry or unsupported source
 * fails back to the exact raw line.
 */
export function buildPersonalWorkspacePocLiveEditorPresentation(
  value: string,
  lineGuides: readonly PersonalWorkspacePocLiveEditorLineGuide[],
  selection: SelectionMirror,
  options: Readonly<{
    flowViewVisible: boolean;
    ghostVisible: boolean;
  }>,
): readonly PersonalWorkspacePocLiveEditorPresentationLine[] {
  const guides = new Map<number, PersonalWorkspacePocLiveEditorLineGuide>();
  for (const guide of lineGuides) {
    if (!Number.isInteger(guide.line) || guide.line < 1 || guides.has(guide.line)) continue;
    guides.set(guide.line, guide);
  }

  const selected = selectedSourceLineRange(value, selection.start, selection.end);
  const lines = splitLogicalSourceLines(value);

  return lines.map((sourceLine) => {
    const { line, rawText } = sourceLine;
    const guide = guides.get(line);
    const lineSelected = line >= selected.first && line <= selected.last;
    const canPresent = options.flowViewVisible
      && !lineSelected
      && guide?.kind === 'safe'
      && typeof guide.presentationText === 'string'
      && isSameLengthSingleLine(rawText, guide.presentationText);
    const allowsBlankGhost = guide?.kind === 'safe' || guide?.kind === 'incomplete';
    const ghost = options.flowViewVisible
      && options.ghostVisible
      && allowsBlankGhost
      && isRecognizedBlankGhost(rawText, guide)
      ? { offset: guide.ghost.valueStart, text: guide.ghost.text }
      : undefined;

    return {
      line,
      rawText,
      displayText: canPresent ? guide.presentationText! : rawText,
      mode: canPresent ? 'presented' : 'raw',
      role: guide?.role ?? 'prose',
      hierarchyDepth: guide?.hierarchyDepth ?? 0,
      showHierarchyGuide: Boolean(canPresent && guide?.showHierarchyGuide),
      ...(ghost ? { ghost } : {}),
    };
  });
}

function snapshotsMatch(
  expected: PersonalWorkspacePocLiveEditorSnapshot,
  current: PersonalWorkspacePocLiveEditorSnapshot,
): boolean {
  return expected.editorId === current.editorId
    && expected.documentId === current.documentId
    && expected.rawText === current.rawText
    && expected.sourceFingerprint === current.sourceFingerprint
    && expected.selectionStart === current.selectionStart
    && expected.selectionEnd === current.selectionEnd
    && expected.selectionDirection === current.selectionDirection
    && expected.scrollTop === current.scrollTop
    && expected.scrollLeft === current.scrollLeft
    && expected.dispatchCount === current.dispatchCount
    && expected.composing === current.composing;
}

/**
 * Chromium may return false from the legacy command even after completing the
 * edit. A single multiline command can also emit several native input events
 * while still occupying one browser Undo history step. Exact DOM bytes, one
 * logical source revision, and at least one observed native event are therefore
 * the authoritative receipt; neither the command boolean nor raw event count
 * alone is sufficient.
 */
export function didPersonalWorkspacePocNativeReplacementCommit(input: Readonly<{
  expectedRawText: string;
  beforeDispatchCount: number;
  observedNativeInputEventCount: number;
  after: PersonalWorkspacePocLiveEditorSnapshot | null;
}>): boolean {
  return input.after?.rawText === input.expectedRawText
    && input.after.dispatchCount - input.beforeDispatchCount === 1
    && input.observedNativeInputEventCount >= 1;
}

function roleClass(role: PersonalWorkspacePocLiveEditorLineRole): string {
  if (role === 'title') return 'font-bold text-slate-950';
  if (role === 'section') return 'font-semibold text-teal-900';
  if (role === 'task') return 'font-medium text-slate-900';
  if (role === 'property') return 'text-slate-600';
  return 'text-slate-800';
}

function preserveEditorSelectionOnPointerDown(event: ReactPointerEvent<HTMLButtonElement>): void {
  event.preventDefault();
}

export const PersonalWorkspacePocLiveEditor = forwardRef<
  PersonalWorkspacePocLiveEditorHandle,
  PersonalWorkspacePocLiveEditorProps
>(function PersonalWorkspacePocLiveEditor({
  editorId,
  documentId,
  initialValue,
  lineGuides = [],
  label = 'Flow 원문',
  disabled = false,
  rows = 15,
  defaultFlowViewVisible = true,
  defaultGhostVisible = true,
  defaultReviewVisible = false,
  showReviewControl = true,
  contextAction,
  inlinePanel,
  onNativeInput,
  onSelectionChange,
}, forwardedRef) {
  const identity = useRef(Object.freeze({ editorId, documentId }));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);
  const dispatchCountRef = useRef(0);
  const nativeReplacementPendingRef = useRef(false);
  const pendingNativeInputObservationRef = useRef<PendingNativeInputObservation | null>(null);
  const onNativeInputRef = useRef(onNativeInput);
  const onSelectionChangeRef = useRef(onSelectionChange);
  onNativeInputRef.current = onNativeInput;
  onSelectionChangeRef.current = onSelectionChange;
  const [mirrorValue, setMirrorValue] = useState(initialValue);
  const [mirrorSelection, setMirrorSelection] = useState<SelectionMirror>(EMPTY_SELECTION);
  const [mirrorScroll, setMirrorScroll] = useState({ top: 0, left: 0 });
  const [flowViewVisible, setFlowViewVisible] = useState(defaultFlowViewVisible);
  const [ghostVisible, setGhostVisible] = useState(defaultGhostVisible);
  const [reviewVisible, setReviewVisible] = useState(defaultReviewVisible);
  const frameRef = useRef<HTMLDivElement>(null);
  const presentationOverlayRef = useRef<HTMLDivElement>(null);
  const [contextActionTop, setContextActionTop] = useState<number | null>(null);

  const readSnapshot = useCallback((): PersonalWorkspacePocLiveEditorSnapshot | null => {
    const textarea = textareaRef.current;
    if (!textarea) return null;
    const rawText = textarea.value;
    return {
      editorId: identity.current.editorId,
      documentId: identity.current.documentId,
      rawText,
      sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(rawText),
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd,
      selectionDirection: textarea.selectionDirection,
      scrollTop: textarea.scrollTop,
      scrollLeft: textarea.scrollLeft,
      dispatchCount: dispatchCountRef.current,
      composing: composingRef.current,
    };
  }, []);

  const syncSelectionAndScroll = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    setMirrorSelection({ start: textarea.selectionStart, end: textarea.selectionEnd });
    setMirrorScroll({ top: textarea.scrollTop, left: textarea.scrollLeft });
    const snapshot = readSnapshot();
    if (snapshot) onSelectionChangeRef.current?.(snapshot);
  }, [readSnapshot]);

  const handleNativeInput = useCallback((event: Event) => {
    const textarea = event.currentTarget;
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    const inputType = event instanceof InputEvent && event.inputType.length > 0
      ? event.inputType
      : 'insertText';
    const observation = pendingNativeInputObservationRef.current;
    if (nativeReplacementPendingRef.current && observation) {
      observation.eventCount += 1;
      observation.lastInputType = inputType;
      const view = textarea.ownerDocument.defaultView;
      if (observation.quietTimer !== undefined) view?.clearTimeout(observation.quietTimer);
      observation.quietTimer = view?.setTimeout(observation.resolve, 0);
      if (observation.quietTimer === undefined) observation.resolve();
      return;
    }

    dispatchCountRef.current += 1;
    setMirrorValue(textarea.value);
    setMirrorSelection({ start: textarea.selectionStart, end: textarea.selectionEnd });
    setMirrorScroll({ top: textarea.scrollTop, left: textarea.scrollLeft });
    const snapshot = readSnapshot();
    if (!snapshot) return;
    onNativeInputRef.current?.(snapshot, inputType);
  }, [readSnapshot]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    // A direct DOM listener observes execCommand's native input synchronously.
    // React's delegated synthetic callback can run after the imperative call.
    textarea.addEventListener('input', handleNativeInput);
    return () => textarea.removeEventListener('input', handleNativeInput);
  }, [handleNativeInput]);

  useLayoutEffect(() => {
    syncSelectionAndScroll();
  }, [syncSelectionAndScroll]);

  const focusRange = useCallback((
    start: number,
    end = start,
    direction: 'forward' | 'backward' | 'none' = 'none',
  ): boolean => {
    const textarea = textareaRef.current;
    if (!textarea || disabled || composingRef.current) return false;
    if (!Number.isInteger(start) || !Number.isInteger(end)) return false;
    if (start < 0 || end < start || end > textarea.value.length) return false;
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(start, end, direction);
    textarea.scrollTop = scrollTop;
    textarea.scrollLeft = scrollLeft;
    syncSelectionAndScroll();
    return true;
  }, [disabled, syncSelectionAndScroll]);

  const applyNativeReplacement = useCallback(async (
    request: PersonalWorkspacePocNativeReplacementRequest,
  ): Promise<PersonalWorkspacePocNativeReplacementResult> => {
    const textarea = textareaRef.current;
    const current = readSnapshot();
    if (!textarea || !current || disabled) {
      return { ok: false, reason: 'editor-unavailable', snapshot: current };
    }
    if (composingRef.current || current.composing) {
      return { ok: false, reason: 'composition-active', snapshot: current };
    }
    if (nativeReplacementPendingRef.current) {
      return { ok: false, reason: 'native-transaction-in-progress', snapshot: current };
    }
    if (!snapshotsMatch(request.expected, current)) {
      return { ok: false, reason: 'stale-snapshot', snapshot: current };
    }

    const range = request.range ?? {
      start: current.selectionStart,
      end: current.selectionEnd,
      direction: current.selectionDirection,
    };
    if (!Number.isInteger(range.start)
      || !Number.isInteger(range.end)
      || range.start < 0
      || range.end < range.start
      || range.end > current.rawText.length) {
      return { ok: false, reason: 'invalid-range', snapshot: current };
    }
    const expectedValue = `${current.rawText.slice(0, range.start)}${request.replacement}${current.rawText.slice(range.end)}`;
    if (expectedValue === current.rawText) {
      return { ok: false, reason: 'replacement-no-op', snapshot: current };
    }

    const ownerDocument = textarea.ownerDocument;
    if (typeof ownerDocument.execCommand !== 'function') {
      return { ok: false, reason: 'native-command-unavailable', snapshot: current };
    }

    const previousActiveElement = ownerDocument.activeElement;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(range.start, range.end, range.direction ?? 'none');
    textarea.scrollTop = current.scrollTop;
    textarea.scrollLeft = current.scrollLeft;

    nativeReplacementPendingRef.current = true;
    let resolveObservedInput = () => {};
    const observedInput = new Promise<void>((resolve) => {
      resolveObservedInput = resolve;
    });
    const observation: PendingNativeInputObservation = {
      eventCount: 0,
      lastInputType: 'insertText',
      resolve: resolveObservedInput,
    };
    pendingNativeInputObservationRef.current = observation;

    let commandAccepted = false;
    try {
      // One browser-owned editing transaction. There is deliberately no value=
      // fallback because that would fabricate an undo history React cannot own.
      commandAccepted = ownerDocument.execCommand('insertText', false, request.replacement);
    } catch {
      commandAccepted = false;
    }

    const view = ownerDocument.defaultView;
    let timeoutId: number | undefined;
    const inputTimeout = new Promise<void>((resolve) => {
      timeoutId = view?.setTimeout(resolve, 120);
      if (timeoutId === undefined) resolve();
    });
    // Wait for one quiet task after the command's native event burst. Chromium
    // emits one trusted input event per inserted line for some multiline values,
    // even though the whole command is one Undo history entry.
    await Promise.race([observedInput, inputTimeout]);
    if (timeoutId !== undefined) view?.clearTimeout(timeoutId);
    if (observation.quietTimer !== undefined) view?.clearTimeout(observation.quietTimer);
    await Promise.resolve();

    let after = readSnapshot();
    const sourceChanged = Boolean(after && after.rawText !== current.rawText);
    if (sourceChanged && observation.eventCount > 0) {
      // Expose one logical source revision to the transaction model and parent
      // persistence, independently of the browser's raw input event count.
      dispatchCountRef.current += 1;
      after = readSnapshot();
      if (after) {
        setMirrorValue(after.rawText);
        setMirrorSelection({ start: after.selectionStart, end: after.selectionEnd });
        setMirrorScroll({ top: after.scrollTop, left: after.scrollLeft });
      }
    }
    const exactTransaction = didPersonalWorkspacePocNativeReplacementCommit({
      expectedRawText: expectedValue,
      beforeDispatchCount: current.dispatchCount,
      observedNativeInputEventCount: observation.eventCount,
      after,
    });

    if (pendingNativeInputObservationRef.current === observation) {
      pendingNativeInputObservationRef.current = null;
    }
    nativeReplacementPendingRef.current = false;
    const dispatchDelta = after ? after.dispatchCount - current.dispatchCount : -1;

    if (exactTransaction && after) {
      syncSelectionAndScroll();
      onNativeInputRef.current?.(after, observation.lastInputType);
      return { ok: true, snapshot: after };
    }

    if (after?.rawText !== current.rawText || dispatchDelta !== 0) {
      return { ok: false, reason: 'native-transaction-diverged', snapshot: after };
    }

    textarea.setSelectionRange(
      current.selectionStart,
      current.selectionEnd,
      current.selectionDirection,
    );
    textarea.scrollTop = current.scrollTop;
    textarea.scrollLeft = current.scrollLeft;
    if (previousActiveElement instanceof HTMLElement && previousActiveElement !== textarea) {
      previousActiveElement.focus({ preventScroll: true });
    }
    syncSelectionAndScroll();
    return {
      ok: false,
      reason: commandAccepted ? 'native-transaction-diverged' : 'native-command-rejected',
      snapshot: readSnapshot(),
    };
  }, [disabled, readSnapshot, syncSelectionAndScroll]);

  useImperativeHandle(forwardedRef, () => ({
    readSnapshot,
    focusRange,
    applyNativeReplacement,
  }), [applyNativeReplacement, focusRange, readSnapshot]);

  const presentationLines = useMemo(
    () => buildPersonalWorkspacePocLiveEditorPresentation(
      mirrorValue,
      lineGuides,
      mirrorSelection,
      { flowViewVisible, ghostVisible },
    ),
    [flowViewVisible, ghostVisible, lineGuides, mirrorSelection, mirrorValue],
  );
  const reviewEntries = useMemo(
    () => lineGuides.filter((guide) => guide.reviewMessage),
    [lineGuides],
  );

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const overlay = presentationOverlayRef.current;
    if (!contextAction || !flowViewVisible || !frame || !overlay) {
      setContextActionTop(null);
      return;
    }
    const line = overlay.querySelector<HTMLElement>(`[data-line="${contextAction.sourceLine}"]`);
    if (!line) {
      setContextActionTop(null);
      return;
    }
    const frameRect = frame.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    if (lineRect.bottom <= frameRect.top || lineRect.top >= frameRect.bottom) {
      setContextActionTop(null);
      return;
    }
    const nextTop = Math.max(4, Math.min(
      frameRect.height - 52,
      lineRect.top - frameRect.top + Math.max(0, (lineRect.height - 48) / 2),
    ));
    setContextActionTop((current) => current === nextTop ? current : nextTop);
  }, [contextAction, flowViewVisible, mirrorScroll, presentationLines]);

  const editorDomId = `personal-workspace-live-editor-${identity.current.editorId}`;
  const editorLabelId = `${editorDomId}-label`;

  return (
    <section
      data-testid="personal-workspace-live-editor"
      data-editor-id={identity.current.editorId}
      data-document-id={identity.current.documentId}
      className="min-w-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          id={editorLabelId}
          htmlFor={editorDomId}
          className="text-sm font-semibold text-slate-950"
        >
          {label}
        </label>
        <div
          data-testid="personal-workspace-live-editor-toolbar"
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="원문 보기 옵션"
        >
          <button
            type="button"
            data-testid="personal-workspace-live-editor-text-view-toggle"
            aria-pressed={!flowViewVisible}
            className={`min-h-12 rounded-md px-3 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 lg:min-h-11 ${!flowViewVisible ? 'bg-teal-50 text-teal-950' : 'text-slate-600 hover:bg-slate-50'}`}
            onPointerDown={preserveEditorSelectionOnPointerDown}
            onClick={() => setFlowViewVisible(false)}
          >
            순수 텍스트
          </button>
          <button
            type="button"
            data-testid="personal-workspace-live-editor-flow-view-toggle"
            aria-pressed={flowViewVisible}
            className={`min-h-12 rounded-md px-3 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 lg:min-h-11 ${flowViewVisible ? 'bg-teal-50 text-teal-950' : 'text-slate-600 hover:bg-slate-50'}`}
            onPointerDown={preserveEditorSelectionOnPointerDown}
            onClick={() => setFlowViewVisible(true)}
          >
            Flow 편집
          </button>
          <button
            type="button"
            data-testid="personal-workspace-live-editor-ghost-toggle"
            aria-pressed={ghostVisible}
            className={`min-h-12 rounded-md px-3 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 lg:min-h-11 ${ghostVisible ? 'bg-teal-50 text-teal-950' : 'text-slate-600 hover:bg-slate-50'}`}
            onPointerDown={preserveEditorSelectionOnPointerDown}
            onClick={() => setGhostVisible((visible) => !visible)}
          >
            입력 예시
          </button>
          {showReviewControl ? (
            <button
              type="button"
              data-testid="personal-workspace-live-editor-review-toggle"
              aria-pressed={reviewVisible}
              className="min-h-12 rounded-md px-3 text-xs font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 lg:min-h-11"
              onPointerDown={preserveEditorSelectionOnPointerDown}
              onClick={() => setReviewVisible((visible) => !visible)}
            >
              구조 확인
            </button>
          ) : null}
        </div>
      </div>

      <div
        ref={frameRef}
        data-testid="personal-workspace-live-editor-frame"
        className="relative mt-2 min-h-[18rem] min-w-0 overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-700/20"
      >
        {flowViewVisible ? (
          <div
            ref={presentationOverlayRef}
            data-testid="personal-workspace-live-editor-presentation-overlay"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none py-3 pl-4 pr-16 font-mono text-base leading-6"
            style={{ userSelect: 'none' }}
          >
            <div
              style={{
                transform: `translate(${-mirrorScroll.left}px, ${-mirrorScroll.top}px)`,
                tabSize: 2,
              }}
            >
              {presentationLines.map((line) => (
                <span
                  key={line.line}
                  data-line={line.line}
                  data-presentation-mode={line.mode}
                  data-hierarchy-depth={line.hierarchyDepth}
                  data-hierarchy-guide={line.showHierarchyGuide ? 'true' : 'false'}
                  data-hanging-indent={line.showHierarchyGuide ? '2ch' : '0'}
                  className={`relative block min-h-6 whitespace-pre-wrap break-words ${line.showHierarchyGuide ? 'pl-[2ch] -indent-[2ch] before:absolute before:inset-y-0 before:left-[.75ch] before:w-px before:bg-slate-300' : ''} ${roleClass(line.role)}`}
                >
                  {line.displayText.length > 0 ? line.displayText : '\u00a0'}
                  {line.ghost ? (
                    <span
                      data-testid={`personal-workspace-live-editor-ghost-line-${line.line}`}
                      className="absolute top-0 whitespace-pre text-slate-500"
                      style={{ left: `${line.ghost.offset}ch` }}
                    >
                      {line.ghost.text}
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <textarea
          id={editorDomId}
          data-testid="personal-workspace-live-editor-textarea"
          ref={textareaRef}
          defaultValue={initialValue}
          disabled={disabled}
          rows={rows}
          spellCheck="false"
          aria-labelledby={editorLabelId}
          className={`relative z-10 block min-h-[18rem] w-full min-w-0 resize-y border-0 bg-transparent py-3 pl-4 pr-16 font-mono text-base leading-6 outline-none placeholder:text-slate-400 disabled:opacity-60 ${flowViewVisible ? 'text-transparent selection:bg-teal-200/70' : 'text-slate-950'}`}
          style={{ caretColor: '#0f172a', tabSize: 2 }}
          placeholder="# 나의 Flow 제목"
          onSelect={syncSelectionAndScroll}
          onClick={syncSelectionAndScroll}
          onKeyUp={syncSelectionAndScroll}
          onScroll={syncSelectionAndScroll}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
            syncSelectionAndScroll();
          }}
        />
        {contextAction && flowViewVisible && contextActionTop !== null ? (
          <button
            type="button"
            data-testid="personal-workspace-authoring-helper-anchor"
            data-source-line={contextAction.sourceLine}
            data-owner={contextAction.owner}
            aria-label={`원문 ${contextAction.sourceLine}행에 내용 추가`}
            aria-expanded={contextAction.expanded}
            aria-controls={contextAction.controlsId}
            className="absolute right-2 z-20 flex h-12 w-12 items-center justify-center rounded-md border border-teal-700 bg-white text-xl font-semibold text-teal-800 shadow-sm hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            style={{ top: `${contextActionTop}px` }}
            onPointerDown={preserveEditorSelectionOnPointerDown}
            onClick={(event) => contextAction.onOpen(event.currentTarget)}
          >
            <span aria-hidden="true">＋</span>
          </button>
        ) : null}
      </div>

      {inlinePanel ? (
        <div data-testid="personal-workspace-live-editor-inline-panel">
          {inlinePanel}
        </div>
      ) : null}

      {showReviewControl && reviewVisible ? (
        <section
          data-testid="personal-workspace-live-editor-review"
          aria-label="원문 구조 확인"
          className="mt-3 border-l-2 border-teal-600 bg-teal-50 px-3 py-3"
        >
          {reviewEntries.length > 0 ? (
            <ul className="grid gap-1 text-sm leading-6 text-slate-800">
              {reviewEntries.map((entry) => (
                <li key={`${entry.line}-${entry.reviewMessage}`}>
                  {entry.line}행 · {entry.reviewMessage}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-700">현재 확인할 구조 안내가 없습니다.</p>
          )}
        </section>
      ) : null}
    </section>
  );
});
