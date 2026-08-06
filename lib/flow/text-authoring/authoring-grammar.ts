export const TEXT_AUTHORING_GRAMMAR_VERSION =
  'flowme-authoring-markdown-v2' as const;

export const TEXT_AUTHORING_LEGACY_GRAMMAR_VERSION =
  'flowme-authoring-markdown-v1' as const;

export const TEXT_AUTHORING_CANONICAL_LABELS = {
  detail: '설명',
  completion: '완료 기준',
  date: '날짜',
  relativeDate: '상대 날짜',
  anchor: '기준일',
  time: '시간',
  timezone: '시간대',
  duration: '소요 시간',
  repeat: '반복',
  place: '장소',
  condition: '조건',
  resource: '자료',
  guide: '안내',
  caution: '주의',
  source: '출처',
} as const;

const CANONICAL_ITEM_PROPERTY_LABELS = new Set<string>([
  TEXT_AUTHORING_CANONICAL_LABELS.detail,
  TEXT_AUTHORING_CANONICAL_LABELS.completion,
  TEXT_AUTHORING_CANONICAL_LABELS.date,
  TEXT_AUTHORING_CANONICAL_LABELS.relativeDate,
  TEXT_AUTHORING_CANONICAL_LABELS.time,
  TEXT_AUTHORING_CANONICAL_LABELS.timezone,
  TEXT_AUTHORING_CANONICAL_LABELS.duration,
  TEXT_AUTHORING_CANONICAL_LABELS.repeat,
  TEXT_AUTHORING_CANONICAL_LABELS.place,
  TEXT_AUTHORING_CANONICAL_LABELS.condition,
  TEXT_AUTHORING_CANONICAL_LABELS.resource,
  TEXT_AUTHORING_CANONICAL_LABELS.guide,
  TEXT_AUTHORING_CANONICAL_LABELS.caution,
  TEXT_AUTHORING_CANONICAL_LABELS.source,
]);

export function isCanonicalAuthoringItemPropertyLabel(value: string): boolean {
  return CANONICAL_ITEM_PROPERTY_LABELS.has(value.trim());
}

export function isCanonicalAuthoringDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

const MARKDOWN_FLOW_TITLE_PATTERN =
  /^( {0,3})#(?!#)(?:[ \t]+(.*?)[ \t]*|[ \t]*)$/u;

function normalizeMarkdownHeadingText(value: string): string {
  return value
    .replace(/[ \t]+#+[ \t]*$/u, '')
    .trim();
}

export function extractMarkdownFlowTitle(rawText: string): string | undefined {
  for (const line of rawText.split(/\r?\n/u)) {
    const match = MARKDOWN_FLOW_TITLE_PATTERN.exec(line);
    if (!match) continue;
    const title = normalizeMarkdownHeadingText(match[2] ?? '');
    return title || undefined;
  }
  return undefined;
}

export function replaceMarkdownFlowTitle(
  rawText: string,
  nextTitle: string,
): string {
  const newline = rawText.includes('\r\n') ? '\r\n' : '\n';
  const lines = rawText.split(/\r?\n/u);
  const index = lines.findIndex((line) => MARKDOWN_FLOW_TITLE_PATTERN.test(line));
  if (index < 0) return rawText;

  const title = nextTitle.trim();
  if (!title) {
    lines.splice(index, 1);
    if (lines[index] === '' && lines[index - 1] === '') lines.splice(index, 1);
  } else {
    const indent = MARKDOWN_FLOW_TITLE_PATTERN.exec(lines[index])?.[1] ?? '';
    lines[index] = `${indent}# ${title}`;
  }
  return lines.join(newline);
}

export function parseCanonicalMarkdownLink(
  value: string,
): { label: string; url: string } | undefined {
  const match = /^\s*\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s*$/iu.exec(value);
  if (!match) return undefined;
  return {
    label: match[1].trim(),
    url: match[2].trim(),
  };
}

export function formatCanonicalMarkdownLink(
  label: string,
  url: string,
): string {
  const safeLabel = label.trim().replaceAll(']', '\\]') || url;
  return `[${safeLabel}](${url})`;
}

export function normalizeCanonicalMarkdownLinkValue(
  value: string,
  fallbackLabel: string,
): string {
  const markdownLink = parseCanonicalMarkdownLink(value);
  if (markdownLink) {
    return formatCanonicalMarkdownLink(markdownLink.label, markdownLink.url);
  }
  const url = /https?:\/\/[^\s<>()\]]+/iu.exec(value)?.[0]
    ?.replace(/[.,;:!?]+$/u, '');
  if (!url) return value.trim();
  const beforeUrl = value.slice(0, value.indexOf(url));
  const label = beforeUrl.trim().replace(/[|·-]+$/u, '').trim()
    || fallbackLabel;
  return formatCanonicalMarkdownLink(label, url);
}
