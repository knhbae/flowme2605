import {
  fingerprintPersonalWorkspacePocAuthoringSource,
  type PersonalWorkspacePocAuthoringTemplateId,
} from './personal-workspace-poc-authoring';
import {
  getPersonalWorkspacePocAuthoringGuideTemplate,
  getPersonalWorkspacePocAuthoringMenuAction,
  matchPersonalWorkspacePocAuthoringGhost,
  PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG,
  type PersonalWorkspacePocAuthoringGhostDescriptor,
  type PersonalWorkspacePocAuthoringGuideTarget,
  type PersonalWorkspacePocAuthoringMenuActionId,
} from './personal-workspace-poc-authoring-guide';
import {
  analyzePersonalWorkspacePocAuthoringFidelity,
  isPersonalWorkspacePocAuthoringFidelityManifestForSource,
  type PersonalWorkspacePocAuthoringFidelityManifest,
  type PersonalWorkspacePocAuthoringSourceLine,
} from './personal-workspace-poc-authoring-fidelity';

export const PERSONAL_WORKSPACE_POC_SOURCE_EDITOR_VERSION = 1 as const;

export type PersonalWorkspacePocSourceEditorSnapshot = Readonly<{
  editorId: string;
  documentId: string;
  sourceFingerprint: string;
  rawText: string;
  selectionStart: number;
  selectionEnd: number;
  selectionDirection: 'forward' | 'backward' | 'none';
  scrollTop: number;
  scrollLeft: number;
  dispatchCount: number;
  composing: boolean;
}>;

export type PersonalWorkspacePocSourceEditorTransactionKind =
  | 'template'
  | 'helper';

export type PersonalWorkspacePocSourceEditorTicket = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_SOURCE_EDITOR_VERSION;
  transactionId: string;
  kind: PersonalWorkspacePocSourceEditorTransactionKind;
  expected: PersonalWorkspacePocSourceEditorSnapshot;
  requireEmptySource: boolean;
  guideCatalogFingerprint: string;
}>;

export type PersonalWorkspacePocSourceEditorTransactionFailureReason =
  | 'invalid-transaction-id'
  | 'already-applied'
  | 'composing'
  | 'stale-editor'
  | 'stale-document'
  | 'invalid-source-fingerprint'
  | 'stale-source'
  | 'stale-dispatch'
  | 'stale-selection'
  | 'stale-scroll'
  | 'source-not-empty'
  | 'invalid-replace-range'
  | 'invalid-next-selection'
  | 'empty-insert'
  | 'wrong-transaction-kind'
  | 'unknown-template'
  | 'stale-guide-catalog'
  | 'stale-guide-target'
  | 'unknown-action'
  | 'action-not-allowed'
  | 'unsupported-action';

export type PersonalWorkspacePocSourceEditorReplacement = Readonly<{
  replaceStart: number;
  replaceEnd: number;
  insertedText: string;
  nextSelectionStart: number;
  nextSelectionEnd: number;
  nextSelectionDirection?: PersonalWorkspacePocSourceEditorSnapshot['selectionDirection'];
}>;

export type PersonalWorkspacePocSourceEditorTransactionPlan = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_SOURCE_EDITOR_VERSION;
  transactionId: string;
  kind: PersonalWorkspacePocSourceEditorTransactionKind;
  replaceOperationCount: 1;
  sourceMutationCount: 1;
  draftMutationMaximum: 1;
  workspaceMutationCount: 0;
  operatingMutationCount: 0;
  replacement: PersonalWorkspacePocSourceEditorReplacement;
  nextSnapshot: PersonalWorkspacePocSourceEditorSnapshot;
}>;

export type PersonalWorkspacePocSourceEditorTransactionResult =
  | Readonly<{
    ok: false;
    reason: PersonalWorkspacePocSourceEditorTransactionFailureReason;
    sourceMutationCount: 0;
    draftMutationCount: 0;
    workspaceMutationCount: 0;
    operatingMutationCount: 0;
  }>
  | Readonly<{
    ok: true;
    plan: PersonalWorkspacePocSourceEditorTransactionPlan;
  }>;

export type PersonalWorkspacePocAuthoringLinePresentation = Readonly<{
  line: number;
  rawLine: string;
  source: PersonalWorkspacePocAuthoringSourceLine['locator'];
  mode: 'raw' | 'rendered';
  reason:
    | 'pure-text-view'
    | 'active-selection'
    | 'incomplete'
    | 'protected'
    | 'unsupported'
    | 'source-only'
    | 'supported-inactive';
  /** UTF-16 length-compatible text used by the geometry-locked overlay. */
  presentationText?: string;
  /** Prefix-free meaning for a separate, non-geometry accessibility label. */
  semanticText?: string;
  hierarchyDepth: 0 | 1;
  showHierarchyGuide: boolean;
  ghost?: PersonalWorkspacePocAuthoringGhostDescriptor;
}>;

export type PersonalWorkspacePocAuthoringSourceProjection = Readonly<{
  sourceFingerprint: string;
  view: 'text' | 'flow';
  failSafeRaw: boolean;
  activeLineNumbers: readonly number[];
  lines: readonly PersonalWorkspacePocAuthoringLinePresentation[];
}>;

function failure(
  reason: PersonalWorkspacePocSourceEditorTransactionFailureReason,
): PersonalWorkspacePocSourceEditorTransactionResult {
  return {
    ok: false,
    reason,
    sourceMutationCount: 0,
    draftMutationCount: 0,
    workspaceMutationCount: 0,
    operatingMutationCount: 0,
  };
}

function snapshotIsInternallyValid(
  snapshot: PersonalWorkspacePocSourceEditorSnapshot,
): boolean {
  return (
    snapshot.editorId.trim().length > 0
    && snapshot.documentId.trim().length > 0
    && snapshot.sourceFingerprint
      === fingerprintPersonalWorkspacePocAuthoringSource(snapshot.rawText)
    && Number.isInteger(snapshot.selectionStart)
    && Number.isInteger(snapshot.selectionEnd)
    && snapshot.selectionStart >= 0
    && snapshot.selectionEnd >= snapshot.selectionStart
    && snapshot.selectionEnd <= snapshot.rawText.length
    && Number.isFinite(snapshot.scrollTop)
    && snapshot.scrollTop >= 0
    && Number.isFinite(snapshot.scrollLeft)
    && snapshot.scrollLeft >= 0
    && Number.isSafeInteger(snapshot.dispatchCount)
    && snapshot.dispatchCount >= 0
  );
}

export function createPersonalWorkspacePocSourceEditorTicket(input: Readonly<{
  transactionId: string;
  kind: PersonalWorkspacePocSourceEditorTransactionKind;
  snapshot: PersonalWorkspacePocSourceEditorSnapshot;
  requireEmptySource?: boolean;
}>): PersonalWorkspacePocSourceEditorTicket {
  return {
    version: PERSONAL_WORKSPACE_POC_SOURCE_EDITOR_VERSION,
    transactionId: input.transactionId,
    kind: input.kind,
    expected: { ...input.snapshot },
    requireEmptySource: input.requireEmptySource ?? input.kind === 'template',
    guideCatalogFingerprint:
      PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG.catalogFingerprint,
  };
}

export function planPersonalWorkspacePocSourceEditorTransaction(input: Readonly<{
  ticket: PersonalWorkspacePocSourceEditorTicket;
  current: PersonalWorkspacePocSourceEditorSnapshot;
  replacement: PersonalWorkspacePocSourceEditorReplacement;
  consumedTransactionIds?: readonly string[];
}>): PersonalWorkspacePocSourceEditorTransactionResult {
  const { ticket, current, replacement } = input;
  if (!ticket.transactionId.trim()) return failure('invalid-transaction-id');
  if (input.consumedTransactionIds?.includes(ticket.transactionId)) {
    return failure('already-applied');
  }
  if (ticket.expected.composing || current.composing) return failure('composing');
  if (ticket.expected.editorId !== current.editorId) return failure('stale-editor');
  if (ticket.expected.documentId !== current.documentId) return failure('stale-document');
  if (!snapshotIsInternallyValid(ticket.expected) || !snapshotIsInternallyValid(current)) {
    return failure('invalid-source-fingerprint');
  }
  if (
    ticket.expected.sourceFingerprint !== current.sourceFingerprint
    || ticket.expected.rawText !== current.rawText
  ) {
    return failure('stale-source');
  }
  if (ticket.expected.dispatchCount !== current.dispatchCount) {
    return failure('stale-dispatch');
  }
  if (
    ticket.expected.selectionStart !== current.selectionStart
    || ticket.expected.selectionEnd !== current.selectionEnd
    || ticket.expected.selectionDirection !== current.selectionDirection
  ) {
    return failure('stale-selection');
  }
  if (
    ticket.expected.scrollTop !== current.scrollTop
    || ticket.expected.scrollLeft !== current.scrollLeft
  ) {
    return failure('stale-scroll');
  }
  if (ticket.requireEmptySource && current.rawText.length > 0) {
    return failure('source-not-empty');
  }
  if (
    !Number.isInteger(replacement.replaceStart)
    || !Number.isInteger(replacement.replaceEnd)
    || replacement.replaceStart < 0
    || replacement.replaceEnd < replacement.replaceStart
    || replacement.replaceEnd > current.rawText.length
  ) {
    return failure('invalid-replace-range');
  }
  if (replacement.insertedText.length === 0) return failure('empty-insert');

  const nextRawText = `${current.rawText.slice(0, replacement.replaceStart)}${replacement.insertedText}${current.rawText.slice(replacement.replaceEnd)}`;
  if (
    !Number.isInteger(replacement.nextSelectionStart)
    || !Number.isInteger(replacement.nextSelectionEnd)
    || replacement.nextSelectionStart < 0
    || replacement.nextSelectionEnd < replacement.nextSelectionStart
    || replacement.nextSelectionEnd > nextRawText.length
  ) {
    return failure('invalid-next-selection');
  }

  const nextSnapshot: PersonalWorkspacePocSourceEditorSnapshot = {
    ...current,
    rawText: nextRawText,
    sourceFingerprint:
      fingerprintPersonalWorkspacePocAuthoringSource(nextRawText),
    selectionStart: replacement.nextSelectionStart,
    selectionEnd: replacement.nextSelectionEnd,
    selectionDirection: replacement.nextSelectionDirection ?? 'none',
    dispatchCount: current.dispatchCount + 1,
    composing: false,
  };
  return {
    ok: true,
    plan: {
      version: PERSONAL_WORKSPACE_POC_SOURCE_EDITOR_VERSION,
      transactionId: ticket.transactionId,
      kind: ticket.kind,
      replaceOperationCount: 1,
      sourceMutationCount: 1,
      draftMutationMaximum: 1,
      workspaceMutationCount: 0,
      operatingMutationCount: 0,
      replacement: { ...replacement },
      nextSnapshot,
    },
  };
}

export function planPersonalWorkspacePocTemplateTransaction(input: Readonly<{
  ticket: PersonalWorkspacePocSourceEditorTicket;
  current: PersonalWorkspacePocSourceEditorSnapshot;
  templateId: PersonalWorkspacePocAuthoringTemplateId;
  consumedTransactionIds?: readonly string[];
}>): PersonalWorkspacePocSourceEditorTransactionResult {
  if (input.ticket.kind !== 'template') return failure('wrong-transaction-kind');
  if (
    input.ticket.guideCatalogFingerprint
      !== PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG.catalogFingerprint
  ) {
    return failure('stale-guide-catalog');
  }
  const template = getPersonalWorkspacePocAuthoringGuideTemplate(input.templateId);
  if (!template) return failure('unknown-template');
  const caret = template.firstBlankValue.valueStartOffset;
  return planPersonalWorkspacePocSourceEditorTransaction({
    ticket: input.ticket,
    current: input.current,
    consumedTransactionIds: input.consumedTransactionIds,
    replacement: {
      replaceStart: 0,
      replaceEnd: input.current.rawText.length,
      insertedText: template.scaffold,
      nextSelectionStart: caret,
      nextSelectionEnd: caret,
      nextSelectionDirection: 'none',
    },
  });
}

export function planPersonalWorkspacePocHelperTransaction(input: Readonly<{
  ticket: PersonalWorkspacePocSourceEditorTicket;
  current: PersonalWorkspacePocSourceEditorSnapshot;
  target: PersonalWorkspacePocAuthoringGuideTarget;
  actionId: PersonalWorkspacePocAuthoringMenuActionId;
  consumedTransactionIds?: readonly string[];
}>): PersonalWorkspacePocSourceEditorTransactionResult {
  if (input.ticket.kind !== 'helper') return failure('wrong-transaction-kind');
  if (
    input.ticket.guideCatalogFingerprint
      !== PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG.catalogFingerprint
  ) {
    return failure('stale-guide-catalog');
  }
  if (input.target.sourceFingerprint !== input.current.sourceFingerprint) {
    return failure('stale-guide-target');
  }
  const action = getPersonalWorkspacePocAuthoringMenuAction(input.actionId);
  if (!action) return failure('unknown-action');
  if (!input.target.allowedActionIds.includes(action.actionId)) {
    return failure('action-not-allowed');
  }
  if (
    action.availability !== 'enabled'
    || !action.targetKinds.includes(input.target.kind)
  ) {
    return failure('unsupported-action');
  }
  const insertedText = `${input.target.insertionPrefix}${action.syntax}${input.target.insertionSuffix}`;
  const caret = input.target.replaceStart
    + input.target.insertionPrefix.length
    + action.syntax.length;
  return planPersonalWorkspacePocSourceEditorTransaction({
    ticket: input.ticket,
    current: input.current,
    consumedTransactionIds: input.consumedTransactionIds,
    replacement: {
      replaceStart: input.target.replaceStart,
      replaceEnd: input.target.replaceEnd,
      insertedText,
      nextSelectionStart: caret,
      nextSelectionEnd: caret,
      nextSelectionDirection: 'none',
    },
  });
}

function lineForCollapsedCaret(
  lines: readonly PersonalWorkspacePocAuthoringSourceLine[],
  caret: number,
  sourceLength: number,
): PersonalWorkspacePocAuthoringSourceLine | null {
  const lineStartingAtCaret = [...lines].reverse().find(
    (line) => line.locator.startOffset === caret,
  );
  if (lineStartingAtCaret) return lineStartingAtCaret;
  for (const line of lines) {
    if (
      caret >= line.locator.startOffset
      && (caret < line.locator.endOffset || (
        caret === line.locator.endOffset && caret === sourceLength
      ))
    ) {
      return line;
    }
  }
  return lines.at(-1) ?? null;
}

function selectedLineNumbers(
  lines: readonly PersonalWorkspacePocAuthoringSourceLine[],
  selectionStart: number,
  selectionEnd: number,
  sourceLength: number,
): Set<number> {
  if (selectionStart === selectionEnd) {
    const line = lineForCollapsedCaret(lines, selectionStart, sourceLength);
    return new Set(line ? [line.line] : []);
  }
  return new Set(
    lines.filter((line) => (
      line.locator.startOffset < selectionEnd
      && line.locator.endOffset > selectionStart
    )).map((line) => line.line),
  );
}

function presentSupportedLine(
  line: PersonalWorkspacePocAuthoringSourceLine,
): Readonly<{ presentationText: string; semanticText: string }> {
  switch (line.kind) {
    case 'title':
      return {
        presentationText: line.rawLine.replace(/^#/u, ' '),
        semanticText: line.rawLine.replace(/^# /u, ''),
      };
    case 'section':
      return {
        presentationText: line.rawLine.replace(/^##/u, '  '),
        semanticText: line.rawLine.replace(/^## /u, ''),
      };
    case 'item':
      return {
        presentationText: line.rawLine.replace(/^- \[ \] /u, '☐     '),
        semanticText: line.rawLine.replace(/^- \[ \] /u, ''),
      };
    case 'property': {
      const property = /^\s*- ([^:]+):\s*(.*)$/u.exec(line.rawLine);
      return {
        presentationText: line.rawLine.replace(/^(\s*)- /u, '$1  '),
        semanticText: property ? `${property[1]}: ${property[2]}` : line.rawLine,
      };
    }
    default:
      return { presentationText: line.rawLine, semanticText: line.rawLine };
  }
}

function hierarchyDepthForLine(
  line: PersonalWorkspacePocAuthoringSourceLine,
): 0 | 1 {
  return line.kind === 'property' && line.owner === 'item' ? 1 : 0;
}

function rawReasonForLine(
  line: PersonalWorkspacePocAuthoringSourceLine,
): PersonalWorkspacePocAuthoringLinePresentation['reason'] {
  if (line.support === 'unsupported') return 'unsupported';
  if (line.kind === 'fenced-code' || line.kind === 'table') return 'protected';
  if (
    line.reason.startsWith('blank-')
    || line.rawLine.trim().length === 0
  ) {
    return 'incomplete';
  }
  return 'source-only';
}

export function projectPersonalWorkspacePocAuthoringSourceLines(input: Readonly<{
  rawText: string;
  sourceFingerprint: string;
  view: 'text' | 'flow';
  selectionStart: number;
  selectionEnd: number;
  ghostEnabled: boolean;
  fidelityManifest?: PersonalWorkspacePocAuthoringFidelityManifest;
}>): PersonalWorkspacePocAuthoringSourceProjection {
  const sourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(
    input.rawText,
  );
  const freshManifest = analyzePersonalWorkspacePocAuthoringFidelity({
    rawText: input.rawText,
    sourceFingerprint,
  }).manifest;
  const suppliedManifestIsFresh = !input.fidelityManifest
    || isPersonalWorkspacePocAuthoringFidelityManifestForSource(
      input.fidelityManifest,
      { rawText: input.rawText, sourceFingerprint },
    );
  const validSelection = Number.isInteger(input.selectionStart)
    && Number.isInteger(input.selectionEnd)
    && input.selectionStart >= 0
    && input.selectionEnd >= input.selectionStart
    && input.selectionEnd <= input.rawText.length;
  const failSafeRaw = (
    input.sourceFingerprint !== sourceFingerprint
    || !suppliedManifestIsFresh
    || !validSelection
  );
  const manifest = failSafeRaw ? freshManifest : input.fidelityManifest ?? freshManifest;
  const active = validSelection
    ? selectedLineNumbers(
      manifest.sourceLines,
      input.selectionStart,
      input.selectionEnd,
      input.rawText.length,
    )
    : new Set<number>();

  const lines = manifest.sourceLines.map((line): PersonalWorkspacePocAuthoringLinePresentation => {
    const ghost = !failSafeRaw
      && input.view === 'flow'
      && input.ghostEnabled
      ? matchPersonalWorkspacePocAuthoringGhost({
        rawText: input.rawText,
        sourceFingerprint,
        line,
      }) ?? undefined
      : undefined;
    const depth = hierarchyDepthForLine(line);
    if (failSafeRaw || input.view === 'text') {
      return {
        line: line.line,
        rawLine: line.rawLine,
        source: line.locator,
        mode: 'raw',
        reason: 'pure-text-view',
        hierarchyDepth: depth,
        showHierarchyGuide: false,
      };
    }
    if (active.has(line.line)) {
      return {
        line: line.line,
        rawLine: line.rawLine,
        source: line.locator,
        mode: 'raw',
        reason: 'active-selection',
        hierarchyDepth: depth,
        showHierarchyGuide: false,
        ...(ghost ? { ghost } : {}),
      };
    }
    if (line.support !== 'supported') {
      return {
        line: line.line,
        rawLine: line.rawLine,
        source: line.locator,
        mode: 'raw',
        reason: rawReasonForLine(line),
        hierarchyDepth: depth,
        showHierarchyGuide: false,
        ...(ghost ? { ghost } : {}),
      };
    }
    const rendered = presentSupportedLine(line);
    return {
      line: line.line,
      rawLine: line.rawLine,
      source: line.locator,
      mode: 'rendered',
      reason: 'supported-inactive',
      presentationText: rendered.presentationText,
      semanticText: rendered.semanticText,
      hierarchyDepth: depth,
      showHierarchyGuide: depth === 1,
      ...(ghost ? { ghost } : {}),
    };
  });
  return {
    sourceFingerprint,
    view: input.view,
    failSafeRaw,
    activeLineNumbers: [...active],
    lines,
  };
}
