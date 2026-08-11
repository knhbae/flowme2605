import type { RoundTripReceipt, TextAuthoringDocument } from './types';
import {
  TEXT_AUTHORING_CANONICAL_LABELS,
  formatCanonicalMarkdownLink,
  isCanonicalAuthoringDate,
  normalizeCanonicalMarkdownLinkValue,
  parseCanonicalMarkdownLink,
} from './authoring-grammar';

export const TEXT_AUTHORING_MARKDOWN_FORMAT = 'flowme-supported-markdown-v2' as const;
export const TEXT_AUTHORING_LEGACY_MARKDOWN_FORMAT =
  'flowme-supported-markdown-v1' as const;

export const TEXT_AUTHORING_MARKDOWN_SUPPORTED_FIELDS = [
  'flow.title',
  'step.title',
  'item.id',
  'item.title',
  'item.sourceChecked',
  'item.detail',
  'item.completion',
  'item.included',
  'item.schedule.raw',
  'item.schedule.time',
  'item.schedule.timezone',
  'item.schedule.durationMinutes',
  'item.schedule.repeat',
  'item.properties.repeat_end',
  'item.properties.place',
  'item.properties.condition',
  'item.subchecks',
  'item.sourceRowIds',
  'item.resources',
  'item.guides',
  'item.cautions',
  'item.sources',
] as const;

export type SupportedMarkdownItem = {
  itemId?: string;
  stepId?: string;
  title: string;
  sourceChecked: boolean;
  detail?: string;
  completion?: string;
  included: boolean;
  scheduleRaw?: string;
  time?: string;
  timezone?: string;
  durationMinutes?: number;
  repeat?: string;
  repeatEnd?: string;
  place?: string;
  condition?: string;
  subchecks: Array<{ title: string; sourceChecked: boolean }>;
  sourceRowIds: string[];
  resources: Array<{ label: string; url: string }>;
  guides: string[];
  cautions: string[];
  sources: Array<{ label: string; url: string }>;
};

export type SupportedTextAuthoringMarkdown = {
  documentId?: string;
  flowTitle?: string;
  anchor?: string;
  stepTitles: Record<string, string>;
  items: SupportedMarkdownItem[];
};

export type MarkdownRoundTripReceipt = RoundTripReceipt & {
  dialect: typeof TEXT_AUTHORING_MARKDOWN_FORMAT;
  sourcePreserved: boolean;
};

export type CheckMarkdownRoundTripOptions = {
  markdown?: string;
  receiptId?: string;
  checkedAt?: string;
  reparse?: (
    markdown: string,
  ) => TextAuthoringDocument | SupportedTextAuthoringMarkdown;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === 'string' && entry.trim()) return [entry.trim()];
    if (!isRecord(entry)) return [];
    const text = stringValue(entry.text)
      ?? stringValue(entry.label)
      ?? stringValue(entry.title)
      ?? stringValue(entry.value);
    return text ? [text] : [];
  });
}

function propertyValue(item: UnknownRecord, key: string): string | undefined {
  const properties = Array.isArray(item.properties)
    ? item.properties.filter(isRecord)
    : [];
  for (let index = properties.length - 1; index >= 0; index -= 1) {
    if (stringValue(properties[index].key) !== key) continue;
    return stringValue(properties[index].value);
  }
  return undefined;
}

function encodeMetadata(value: string): string {
  return encodeURIComponent(value).replace(/--/gu, '%2D%2D');
}

function decodeMetadata(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function metadataLine(key: string, value: string): string {
  return `  <!-- flowme:${key}=${encodeMetadata(value)} -->`;
}

function firstDisplayLine(value: string): string {
  return value.replace(/\r?\n/gu, ' / ').trim();
}

function v2PropertyLine(label: string, value: string): string {
  return `  - ${label}: ${firstDisplayLine(value)}`;
}

function completionText(value: unknown): string | undefined {
  if (typeof value === 'string') return stringValue(value);
  if (!isRecord(value)) return undefined;
  return stringValue(value.doneWhen)
    ?? stringValue(value.text)
    ?? stringValue(value.label);
}

function links(value: unknown): Array<{ label: string; url: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (typeof entry === 'string' && /^https?:\/\//iu.test(entry)) {
      return [{ label: `링크 ${index + 1}`, url: entry }];
    }
    if (!isRecord(entry)) return [];
    const url = stringValue(entry.url) ?? stringValue(entry.href);
    if (!url) return [];
    return [{
      label: stringValue(entry.label) ?? stringValue(entry.title) ?? `링크 ${index + 1}`,
      url,
    }];
  });
}

function itemSnapshot(item: UnknownRecord): SupportedMarkdownItem {
  const schedule = isRecord(item.schedule) ? item.schedule : undefined;
  return {
    ...(stringValue(item.itemId) ? { itemId: stringValue(item.itemId) } : {}),
    ...(stringValue(item.stepId) ? { stepId: stringValue(item.stepId) } : {}),
    title: stringValue(item.title) ?? '',
    sourceChecked: item.sourceChecked === true,
    ...(stringValue(item.detail) ? { detail: stringValue(item.detail) } : {}),
    ...(completionText(item.completion) ? { completion: completionText(item.completion) } : {}),
    included: item.included !== false,
    ...(schedule
      ? {
        scheduleRaw: stringValue(schedule.raw)
          ?? stringValue(schedule.expression)
          ?? stringValue(schedule.date),
        ...(stringValue(schedule.time)
          ? { time: stringValue(schedule.time) }
          : {}),
        ...(stringValue(schedule.timezone)
          ? { timezone: stringValue(schedule.timezone) }
          : {}),
        ...(typeof schedule.durationMinutes === 'number'
          ? { durationMinutes: schedule.durationMinutes }
          : {}),
        ...(stringValue(schedule.repeat)
          ? { repeat: stringValue(schedule.repeat) }
          : {}),
      }
      : {}),
    ...(propertyValue(item, 'place')
      ? { place: propertyValue(item, 'place') }
      : {}),
    ...(propertyValue(item, 'repeat_end')
      ? { repeatEnd: propertyValue(item, 'repeat_end') }
      : {}),
    ...(propertyValue(item, 'condition')
      ? { condition: propertyValue(item, 'condition') }
      : {}),
    subchecks: Array.isArray(item.subchecks)
      ? item.subchecks.filter(isRecord).flatMap((subcheck) => {
        const title = stringValue(subcheck.title);
        return title
          ? [{ title, sourceChecked: subcheck.sourceChecked === true }]
          : [];
      })
      : [],
    sourceRowIds: Array.isArray(item.sourceRowIds)
      ? item.sourceRowIds.filter((entry): entry is string => typeof entry === 'string')
      : [],
    resources: links(item.resources),
    guides: strings(item.guides),
    cautions: strings(item.cautions),
    sources: links(item.sources),
  };
}

function canonicalDocumentAnchor(
  document: TextAuthoringDocument,
): string | undefined {
  const canonical = document.parseResult.canonical;
  const flowId = stringValue((canonical.flow as unknown as UnknownRecord).flowId);
  const fieldAnchor = (canonical.fields as unknown as UnknownRecord[])
    .find((field) => {
      const owner = isRecord(field.owner) ? field.owner : undefined;
      return stringValue(field.key) === 'anchor'
        && stringValue(owner?.type) === 'flow'
        && (!flowId || stringValue(owner?.id) === flowId);
    });
  const fieldValue = fieldAnchor ? stringValue(fieldAnchor.value) : undefined;
  if (fieldValue && isCanonicalAuthoringDate(fieldValue)) return fieldValue;
  return undefined;
}

function documentSnapshot(
  document: TextAuthoringDocument,
): SupportedTextAuthoringMarkdown {
  const canonical = document.parseResult.canonical;
  const flow = canonical.flow as unknown as UnknownRecord;
  const steps = canonical.steps as unknown as UnknownRecord[];
  const items = canonical.items as unknown as UnknownRecord[];
  return {
    documentId: document.documentId,
    flowTitle: stringValue(flow.title),
    ...(canonicalDocumentAnchor(document)
      ? { anchor: canonicalDocumentAnchor(document) }
      : {}),
    stepTitles: Object.fromEntries(steps.map((step, index) => [
      stringValue(step.stepId) ?? `step-${index + 1}`,
      stringValue(step.title) ?? `Step ${index + 1}`,
    ])),
    items: items.map(itemSnapshot),
  };
}

export function exportTextAuthoringMarkdown(
  document: TextAuthoringDocument,
): string {
  const canonical = document.parseResult.canonical;
  const flow = canonical.flow as unknown as UnknownRecord;
  const steps = canonical.steps as unknown as UnknownRecord[];
  const items = canonical.items as unknown as UnknownRecord[];
  const fields = canonical.fields as unknown as UnknownRecord[];
  const itemsByStep = new Map<string, UnknownRecord[]>();
  for (const item of items) {
    const stepId = stringValue(item.stepId) ?? '';
    itemsByStep.set(stepId, [...(itemsByStep.get(stepId) ?? []), item]);
  }

  const lines = [
    `<!-- flowme:dialect=${TEXT_AUTHORING_MARKDOWN_FORMAT} -->`,
    `<!-- flowme:document-id=${encodeMetadata(document.documentId)} -->`,
    `# ${stringValue(flow.title) ?? '제목 없는 Flow'}`,
    '',
  ];
  const flowFields = fields.filter((field) => {
    const owner = isRecord(field.owner) ? field.owner : undefined;
    return stringValue(owner?.type) === 'flow';
  });
  const anchor = flowFields
    .map((field) => (
      stringValue(field.key) === 'anchor' ? stringValue(field.value) : undefined
    ))
    .find((value): value is string => (
      Boolean(value) && isCanonicalAuthoringDate(value as string)
    ));
  if (anchor) {
    lines.push(`- ${TEXT_AUTHORING_CANONICAL_LABELS.anchor}: ${anchor}`, '');
  }
  const flowSourceFields = flowFields.filter((field) => (
    ['source', '출처'].includes(stringValue(field.key) ?? '')
  ));
  const flowSourceUrls = new Set(flowSourceFields.flatMap((field) => {
    const value = stringValue(field.value);
    if (!value) return [];
    const markdownLink = parseCanonicalMarkdownLink(value);
    const url = markdownLink?.url
      ?? /https?:\/\/[^\s<>()\]]+/iu.exec(value)?.[0]
        ?.replace(/[.,;:!?]+$/u, '');
    return url ? [url] : [];
  }));
  for (const sourceField of flowSourceFields) {
    const value = stringValue(sourceField.value);
    if (!value) continue;
    lines.push(
      `${TEXT_AUTHORING_CANONICAL_LABELS.source}: ${
        normalizeCanonicalMarkdownLinkValue(
          value,
          TEXT_AUTHORING_CANONICAL_LABELS.source,
        )
      }`,
    );
  }
  if (
    flowSourceFields.length > 0
    && lines.at(-1) !== ''
  ) {
    lines.push('');
  }

  for (const [stepIndex, step] of steps.entries()) {
    const stepId = stringValue(step.stepId) ?? `step-${stepIndex + 1}`;
    lines.push(`## ${stringValue(step.title) ?? `Step ${stepIndex + 1}`}`);
    lines.push(metadataLine('step-id', stepId));
    for (const item of itemsByStep.get(stepId) ?? []) {
      const itemId = stringValue(item.itemId) ?? `item-${lines.length}`;
      const included = item.included !== false;
      lines.push(
        `- [${item.sourceChecked === true ? 'x' : ' '}] ${
          stringValue(item.title) ?? '제목 없는 Item'
        }`,
      );
      lines.push(metadataLine('item-id', itemId));
      lines.push(metadataLine('included', included ? 'true' : 'false'));

      const detail = stringValue(item.detail);
      if (detail) {
        lines.push(v2PropertyLine(TEXT_AUTHORING_CANONICAL_LABELS.detail, detail));
        lines.push(metadataLine('detail', detail));
      }
      const completion = completionText(item.completion);
      if (completion) {
        lines.push(v2PropertyLine(TEXT_AUTHORING_CANONICAL_LABELS.completion, completion));
        lines.push(metadataLine('completion', completion));
      }
      const schedule = isRecord(item.schedule) ? item.schedule : undefined;
      const scheduleRaw = schedule
        ? stringValue(schedule.raw)
          ?? stringValue(schedule.expression)
          ?? stringValue(schedule.date)
        : undefined;
      if (scheduleRaw) {
        const scheduleLabel = stringValue(schedule?.kind) === 'relative'
          ? TEXT_AUTHORING_CANONICAL_LABELS.relativeDate
          : TEXT_AUTHORING_CANONICAL_LABELS.date;
        lines.push(v2PropertyLine(scheduleLabel, scheduleRaw));
        lines.push(metadataLine('schedule-raw', scheduleRaw));
      }
      const time = stringValue(schedule?.time) ?? propertyValue(item, 'time');
      if (time) {
        lines.push(v2PropertyLine(TEXT_AUTHORING_CANONICAL_LABELS.time, time));
      }
      const timezone =
        stringValue(schedule?.timezone) ?? propertyValue(item, 'timezone');
      if (timezone) {
        lines.push(v2PropertyLine(TEXT_AUTHORING_CANONICAL_LABELS.timezone, timezone));
      }
      const durationMinutes =
        typeof schedule?.durationMinutes === 'number'
          ? schedule.durationMinutes
          : undefined;
      const duration = durationMinutes != null
        ? `${durationMinutes}분`
        : propertyValue(item, 'duration');
      if (duration) {
        lines.push(v2PropertyLine(TEXT_AUTHORING_CANONICAL_LABELS.duration, duration));
      }
      const repeat =
        stringValue(schedule?.repeat) ?? propertyValue(item, 'repeat');
      if (repeat) {
        lines.push(v2PropertyLine(TEXT_AUTHORING_CANONICAL_LABELS.repeat, repeat));
      }
      const repeatEnd = propertyValue(item, 'repeat_end');
      if (repeatEnd) {
        lines.push(v2PropertyLine(
          TEXT_AUTHORING_CANONICAL_LABELS.repeatEnd,
          repeatEnd,
        ));
      }
      for (const [key, label] of [
        ['place', TEXT_AUTHORING_CANONICAL_LABELS.place],
        ['condition', TEXT_AUTHORING_CANONICAL_LABELS.condition],
      ] as const) {
        const value = propertyValue(item, key);
        if (value) lines.push(v2PropertyLine(label, value));
      }
      const subchecks = Array.isArray(item.subchecks)
        ? item.subchecks.filter(isRecord)
        : [];
      for (const subcheck of subchecks) {
        const title = stringValue(subcheck.title);
        if (!title) continue;
        lines.push(
          `  - [${subcheck.sourceChecked === true ? 'x' : ' '}] ${firstDisplayLine(title)}`,
        );
      }
      const sourceRowIds = Array.isArray(item.sourceRowIds)
        ? item.sourceRowIds.filter((entry): entry is string => typeof entry === 'string')
        : [];
      if (sourceRowIds.length > 0) {
        lines.push(metadataLine('source-row-ids', JSON.stringify(sourceRowIds)));
      }
      for (const resource of links(item.resources)) {
        lines.push(v2PropertyLine(
          TEXT_AUTHORING_CANONICAL_LABELS.resource,
          formatCanonicalMarkdownLink(resource.label, resource.url),
        ));
      }
      const resourceLinks = links(item.resources);
      if (resourceLinks.length > 0) {
        lines.push(metadataLine('resources-json', JSON.stringify(resourceLinks)));
      }
      const guides = strings(item.guides);
      for (const guide of guides) {
        lines.push(v2PropertyLine(TEXT_AUTHORING_CANONICAL_LABELS.guide, guide));
      }
      if (guides.length > 0) lines.push(metadataLine('guides-json', JSON.stringify(guides)));
      const cautions = strings(item.cautions);
      for (const caution of cautions) {
        lines.push(v2PropertyLine(TEXT_AUTHORING_CANONICAL_LABELS.caution, caution));
      }
      if (cautions.length > 0) {
        lines.push(metadataLine('cautions-json', JSON.stringify(cautions)));
      }
      const sourceLinks = links(item.sources);
      const visibleSourceLinks = sourceLinks.filter(
        (source) => !flowSourceUrls.has(source.url),
      );
      for (const source of visibleSourceLinks) {
        lines.push(v2PropertyLine(
          TEXT_AUTHORING_CANONICAL_LABELS.source,
          formatCanonicalMarkdownLink(source.label, source.url),
        ));
      }
      if (sourceLinks.length > 0) {
        lines.push(metadataLine('sources-json', JSON.stringify(sourceLinks)));
      }
      lines.push('');
    }
  }

  const stepIds = new Set(steps.map((step) => stringValue(step.stepId) ?? ''));
  const ungrouped = items.filter((item) => !stepIds.has(stringValue(item.stepId) ?? ''));
  if (ungrouped.length > 0) {
    lines.push('## 분류되지 않은 항목');
    lines.push(metadataLine('step-id', 'unresolved-step'));
    for (const item of ungrouped) {
      lines.push(
        `- [${item.sourceChecked === true ? 'x' : ' '}] ${
          stringValue(item.title) ?? '제목 없는 Item'
        }`,
      );
      if (stringValue(item.itemId)) lines.push(metadataLine('item-id', stringValue(item.itemId) as string));
      lines.push('');
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export function parseSupportedTextAuthoringMarkdown(
  markdown: string,
): SupportedTextAuthoringMarkdown {
  const result: SupportedTextAuthoringMarkdown = {
    stepTitles: {},
    items: [],
  };
  let currentStepId: string | undefined;
  let pendingStepTitle: string | undefined;
  let currentItem: SupportedMarkdownItem | undefined;

  for (const line of markdown.split(/\r?\n/u)) {
    const documentMatch = line.match(/<!--\s*flowme:document-id=([^\s]+)\s*-->/u);
    if (documentMatch) {
      result.documentId = decodeMetadata(documentMatch[1]);
      continue;
    }
    const flowMatch = line.match(/^#\s+(.+)$/u);
    if (flowMatch) {
      result.flowTitle = flowMatch[1].trim();
      continue;
    }
    const anchorMatch = line.match(
      /^\s*(?:-\s+)?기준일\s*[:：]\s*(\d{4}-\d{2}-\d{2})\s*$/u,
    );
    if (anchorMatch && isCanonicalAuthoringDate(anchorMatch[1])) {
      result.anchor = anchorMatch[1];
      continue;
    }
    const stepMatch = line.match(/^##\s+(.+)$/u);
    if (stepMatch) {
      pendingStepTitle = stepMatch[1].trim();
      currentStepId = undefined;
      currentItem = undefined;
      continue;
    }
    const metadataMatch = line.match(/<!--\s*flowme:([a-z-]+)=([\s\S]*?)\s*-->/u);
    if (metadataMatch) {
      const key = metadataMatch[1];
      const value = decodeMetadata(metadataMatch[2].trim());
      if (key === 'step-id') {
        currentStepId = value;
        result.stepTitles[value] = pendingStepTitle ?? value;
      } else if (key === 'item-id' && currentItem) {
        currentItem.itemId = value;
      } else if (key === 'included' && currentItem) {
        currentItem.included = value !== 'false';
      } else if (key === 'detail' && currentItem) {
        currentItem.detail = value;
      } else if (key === 'completion' && currentItem) {
        currentItem.completion = value;
      } else if (key === 'schedule-raw' && currentItem) {
        currentItem.scheduleRaw = value;
      } else if (key === 'source-row-ids' && currentItem) {
        try {
          const parsed = JSON.parse(value) as unknown;
          currentItem.sourceRowIds = Array.isArray(parsed)
            ? parsed.filter((entry): entry is string => typeof entry === 'string')
            : [];
        } catch {
          currentItem.sourceRowIds = [];
        }
      } else if (
        currentItem
        && (
          key === 'resources-json'
          || key === 'guides-json'
          || key === 'cautions-json'
          || key === 'sources-json'
        )
      ) {
        try {
          const parsed = JSON.parse(value) as unknown;
          if (Array.isArray(parsed)) {
            if (key === 'resources-json') {
              currentItem.resources = parsed.filter((entry): entry is { label: string; url: string } => (
                isRecord(entry)
                && typeof entry.label === 'string'
                && typeof entry.url === 'string'
              ));
            } else if (key === 'sources-json') {
              currentItem.sources = parsed.filter((entry): entry is { label: string; url: string } => (
                isRecord(entry)
                && typeof entry.label === 'string'
                && typeof entry.url === 'string'
              ));
            } else if (key === 'guides-json') {
              currentItem.guides = parsed.filter((entry): entry is string => typeof entry === 'string');
            } else {
              currentItem.cautions = parsed.filter((entry): entry is string => typeof entry === 'string');
            }
          }
        } catch {
          // The visible Markdown lines remain available when hidden metadata is malformed.
        }
      }
      continue;
    }
    const subcheckMatch = line.match(/^ {2}-\s+\[([ xX])\]\s+(.+)$/u);
    if (subcheckMatch && currentItem) {
      currentItem.subchecks.push({
        title: subcheckMatch[2].trim(),
        sourceChecked: subcheckMatch[1].toLocaleLowerCase() === 'x',
      });
      continue;
    }
    const itemMatch = line.match(/^-\s+\[([ xX])\]\s+(.+)$/u);
    if (itemMatch) {
      currentItem = {
        ...(currentStepId ? { stepId: currentStepId } : {}),
        title: itemMatch[2].trim(),
        sourceChecked: itemMatch[1].toLocaleLowerCase() === 'x',
        included: true,
        sourceRowIds: [],
        resources: [],
        guides: [],
        cautions: [],
        sources: [],
        subchecks: [],
      };
      result.items.push(currentItem);
      continue;
    }
    const detailMatch = line.match(
      /^\s*(?:-\s+)?(?:설명|상세|자세히):\s+(.+)\s*$/u,
    );
    if (detailMatch && currentItem) {
      currentItem.detail = detailMatch[1].trim();
      continue;
    }
    const completionMatch = line.match(
      /^\s*(?:-\s+)?(?:완료\s*기준|완료):\s+(.+)\s*$/u,
    );
    if (completionMatch && currentItem) {
      currentItem.completion = completionMatch[1].trim();
      continue;
    }
    const scheduleMatch = line.match(
      /^\s*(?:-\s+)?(날짜|상대\s*날짜|상대일):\s+(.+)\s*$/u,
    );
    if (scheduleMatch && currentItem) {
      currentItem.scheduleRaw = scheduleMatch[2].trim();
      continue;
    }
    const fieldMatch = line.match(
      /^\s*(?:-\s+)?(시간|시간대|소요\s*시간|반복|반복\s*종료|장소|실행\s*조건|조건):\s+(.+)\s*$/u,
    );
    if (fieldMatch && currentItem) {
      const value = fieldMatch[2].trim();
      if (fieldMatch[1] === '시간') currentItem.time = value;
      else if (fieldMatch[1] === '시간대') currentItem.timezone = value;
      else if (/^소요\s*시간$/u.test(fieldMatch[1])) {
        const duration = /(\d+)\s*(분|시간)/u.exec(value);
        if (duration) {
          currentItem.durationMinutes =
            duration[2] === '시간'
              ? Number(duration[1]) * 60
              : Number(duration[1]);
        }
      } else if (fieldMatch[1] === '반복') currentItem.repeat = value;
      else if (/^반복\s*종료$/u.test(fieldMatch[1])) currentItem.repeatEnd = value;
      else if (fieldMatch[1] === '장소') currentItem.place = value;
      else if (/^(?:실행\s*)?조건$/u.test(fieldMatch[1])) currentItem.condition = value;
      continue;
    }
    const linkMatch = line.match(/^\s*(?:-\s+)?(자료|출처):\s+(.+)\s*$/u);
    const markdownLink = linkMatch
      ? parseCanonicalMarkdownLink(linkMatch[2])
      : undefined;
    if (linkMatch && markdownLink && currentItem) {
      const target = linkMatch[1] === '자료'
        ? currentItem.resources
        : currentItem.sources;
      target.push(markdownLink);
      continue;
    }
    const textMatch = line.match(/^\s*(?:-\s+)?(안내|주의):\s+(.+)\s*$/u);
    if (textMatch && currentItem) {
      const target = textMatch[1] === '안내'
        ? currentItem.guides
        : currentItem.cautions;
      target.push(textMatch[2].trim());
    }
  }
  return result;
}

function asSupportedSnapshot(
  value: TextAuthoringDocument | SupportedTextAuthoringMarkdown,
): SupportedTextAuthoringMarkdown {
  return 'parseResult' in value ? documentSnapshot(value) : value;
}

function roundTripLossFields(document: TextAuthoringDocument): string[] {
  const items = document.parseResult.canonical.items as unknown as UnknownRecord[];
  const losses = new Set<string>();
  for (const item of items) {
    if (
      typeof item.nestingLevel === 'number'
      && item.nestingLevel !== 0
    ) {
      losses.add('item.nestingLevel');
    }
    if (isRecord(item.properties) && Object.keys(item.properties).length > 0) {
      losses.add('item.properties.structured_value');
    } else if (Array.isArray(item.properties) && item.properties.length > 0) {
      losses.add('item.properties.structured_value');
    }
  }
  return [...losses];
}

export function checkMarkdownRoundTrip(
  document: TextAuthoringDocument,
  options: CheckMarkdownRoundTripOptions = {},
): MarkdownRoundTripReceipt {
  const markdown = options.markdown ?? exportTextAuthoringMarkdown(document);
  const before = documentSnapshot(document);
  const after = asSupportedSnapshot(
    options.reparse
      ? options.reparse(markdown)
      : parseSupportedTextAuthoringMarkdown(markdown),
  );
  const afterById = new Map(after.items.flatMap((item) => (
    item.itemId ? [[item.itemId, item] as const] : []
  )));

  let matchedCount = 0;
  let changedCount = 0;
  if (after.flowTitle !== before.flowTitle) changedCount += 1;
  if (after.anchor !== before.anchor) changedCount += 1;
  const stepIds = new Set([
    ...Object.keys(before.stepTitles),
    ...Object.keys(after.stepTitles),
  ]);
  for (const stepId of stepIds) {
    if (before.stepTitles[stepId] !== after.stepTitles[stepId]) {
      changedCount += 1;
    }
  }
  for (const [index, expected] of before.items.entries()) {
    const actual = expected.itemId
      ? afterById.get(expected.itemId)
      : after.items[index];
    if (!actual) continue;
    matchedCount += 1;
    if (
      actual.title !== expected.title
      || actual.stepId !== expected.stepId
      || actual.sourceChecked !== expected.sourceChecked
      || actual.detail !== expected.detail
      || actual.completion !== expected.completion
      || actual.included !== expected.included
      || actual.scheduleRaw !== expected.scheduleRaw
      || actual.time !== expected.time
      || actual.timezone !== expected.timezone
      || actual.durationMinutes !== expected.durationMinutes
      || actual.repeat !== expected.repeat
      || actual.repeatEnd !== expected.repeatEnd
      || actual.place !== expected.place
      || actual.condition !== expected.condition
      || JSON.stringify(actual.subchecks) !== JSON.stringify(expected.subchecks)
      || JSON.stringify(actual.sourceRowIds) !== JSON.stringify(expected.sourceRowIds)
      || JSON.stringify(actual.resources) !== JSON.stringify(expected.resources)
      || JSON.stringify(actual.guides) !== JSON.stringify(expected.guides)
      || JSON.stringify(actual.cautions) !== JSON.stringify(expected.cautions)
      || JSON.stringify(actual.sources) !== JSON.stringify(expected.sources)
    ) {
      changedCount += 1;
    }
  }
  const addedCount = Math.max(0, after.items.length - matchedCount);
  const unresolvedCount =
    Math.max(0, before.items.length - matchedCount)
    + addedCount
    + changedCount;
  const lossFields = roundTripLossFields(document);
  return {
    receiptId: options.receiptId
      ?? `roundtrip-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
    format: 'markdown',
    dialect: TEXT_AUTHORING_MARKDOWN_FORMAT,
    exportedCount: before.items.length,
    matchedCount,
    changedCount,
    unresolvedCount,
    lossFields,
    documentId: document.documentId,
    revisionId: document.revision.revisionId,
    createdAt: options.checkedAt ?? new Date().toISOString(),
    sourcePreserved: unresolvedCount === 0,
  };
}
