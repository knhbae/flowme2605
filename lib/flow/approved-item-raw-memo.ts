export type ApprovedItemRawMemoChecklistInput = {
  text: string;
  completed?: boolean;
};

export type ApprovedItemRawMemoChecklistEntry = {
  text: string;
  completed: boolean;
  lineIndex: number;
};

export type ApprovedItemRawMemoParseResult = {
  /** The editable source, normalized to LF line endings. */
  memoText: string;
  /** Non-checklist, non-completion text derived from the editable source. */
  description: string;
  checklistEntries: ApprovedItemRawMemoChecklistEntry[];
  /** Empty when the editable source has no completion criterion line. */
  completionCriterion: string;
};

export type ComposeApprovedItemRawMemoOptions = {
  /** The current editable memo. It takes precedence over the source description. */
  memoText?: string | null;
  /** Source-backed fallback used only when memoText is blank. */
  description?: string | null;
  /** Legacy/derived checklist entries used when the memo has no Markdown checklist rows. */
  checklistEntries?: readonly ApprovedItemRawMemoChecklistInput[];
  /** Legacy/derived fallback used when the memo has no `완료 기준:` row. */
  completionCriterion?: string | null;
};

const CHECKLIST_LINE_PATTERN = /^\s*-\s+\[([ xX])\](?:\s+(.*?))?\s*$/u;
const COMPLETION_CRITERION_LINE_PATTERN = /^\s*완료\s*기준\s*:\s*(.*?)\s*$/u;

export function normalizeApprovedItemRawMemoLineEndings(value: string): string {
  return value.replace(/\r\n?/gu, '\n');
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start]?.trim()) start += 1;
  while (end > start && !lines[end - 1]?.trim()) end -= 1;
  return lines.slice(start, end);
}

function normalizeEditableSource(value: string): string {
  return trimBlankEdges(normalizeApprovedItemRawMemoLineEndings(value).split('\n')).join('\n');
}

function normalizeCompletionCriterion(value: string | null | undefined): string {
  const normalized = normalizeApprovedItemRawMemoLineEndings(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
  return normalized.replace(/^완료\s*기준\s*:\s*/u, '').trim();
}

/**
 * Parses the one editable Item memo. Checklist and completion data are derived
 * from this text; callers can persist `memoText` and rebuild the derived fields.
 */
export function parseApprovedItemRawMemoText(
  value: string,
): ApprovedItemRawMemoParseResult {
  const memoText = normalizeEditableSource(value);
  const descriptionLines: string[] = [];
  const checklistEntries: ApprovedItemRawMemoChecklistEntry[] = [];
  let completionCriterion = '';

  memoText.split('\n').forEach((line, lineIndex) => {
    const checklistMatch = CHECKLIST_LINE_PATTERN.exec(line);
    if (checklistMatch) {
      const text = (checklistMatch[2] ?? '').trim();
      if (text) {
        checklistEntries.push({
          text,
          completed: checklistMatch[1]?.toLowerCase() === 'x',
          lineIndex,
        });
      }
      return;
    }

    const completionMatch = COMPLETION_CRITERION_LINE_PATTERN.exec(line);
    if (completionMatch) {
      if (!completionCriterion) {
        completionCriterion = (completionMatch[1] ?? '').trim();
      }
      return;
    }

    descriptionLines.push(line);
  });

  return {
    memoText,
    description: trimBlankEdges(descriptionLines).join('\n'),
    checklistEntries,
    completionCriterion,
  };
}

function normalizeChecklistInputs(
  entries: readonly ApprovedItemRawMemoChecklistInput[],
): ApprovedItemRawMemoChecklistInput[] {
  const seen = new Set<string>();
  return entries.flatMap((entry) => {
    const text = normalizeApprovedItemRawMemoLineEndings(entry.text)
      .replace(/\s+/gu, ' ')
      .trim();
    if (!text) return [];
    const key = text.toLocaleLowerCase('ko-KR');
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ text, completed: entry.completed === true }];
  });
}

/**
 * Builds the canonical editable memo in the approved order:
 * description, Markdown checklist rows, then `완료 기준:`. Existing embedded
 * rows win over legacy derived fields so the same content is never appended twice.
 */
export function composeApprovedItemRawMemoText(
  options: ComposeApprovedItemRawMemoOptions,
): string {
  const preferredMemo = normalizeEditableSource(options.memoText ?? '');
  const source = preferredMemo || normalizeEditableSource(options.description ?? '');
  const parsed = parseApprovedItemRawMemoText(source);
  const checklistEntries = parsed.checklistEntries.length > 0
    ? parsed.checklistEntries
    : normalizeChecklistInputs(options.checklistEntries ?? []);
  const completionCriterion = parsed.completionCriterion
    || normalizeCompletionCriterion(options.completionCriterion);

  const blocks = [
    parsed.description,
    checklistEntries
      .map((entry) => `- [${entry.completed ? 'x' : ' '}] ${entry.text}`)
      .join('\n'),
    completionCriterion ? `완료 기준: ${completionCriterion}` : '',
  ].filter(Boolean);

  return blocks.join('\n\n');
}
