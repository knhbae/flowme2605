/** Shared K3-A display-only projection. No editor, storage, or transaction ownership. */

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
