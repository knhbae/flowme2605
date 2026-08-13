import {
  TEXT_AUTHORING_PARSER_VERSION,
  TEXT_AUTHORING_SCHEMA_VERSION,
  type AuthoringArtifact,
  type AuthoringArtifactEligibility,
  type AuthoringBlock,
  type AuthoringCanonicalContent,
  type AuthoringCompletion,
  type AuthoringField,
  type AuthoringInputKind,
  type AuthoringItemIntent,
  type AuthoringLink,
  type AuthoringMemo,
  type AuthoringParseResult,
  type AuthoringProperty,
  type AuthoringSchedule,
  type AuthoringSourceRange,
  type AuthoringSourceReference,
  type AuthoringSourceRow,
  type AuthoringSubcheck,
  type AuthoringTargetKind,
  type BlockToCanonicalMapping,
  type CanonicalAuthoringFlow,
  type CanonicalAuthoringItem,
  type CanonicalAuthoringStep,
  type CreateTextAuthoringDocumentOptions,
  type DraftRevision,
  type TextAuthoringDocument,
  type UnresolvedAuthoringIssue,
} from './types';
import {
  isValidAuthoringDate,
  parseAuthoringRecurrenceRule,
  resolveAuthoringScheduleDate,
} from './recurrence';
import {
  cloneAuthoringValue,
  normalizeAuthoringText,
  stableAuthoringId,
} from './identity';
import {
  extractMarkdownFlowTitle,
  parseCanonicalMarkdownLink,
} from './authoring-grammar';
import {
  createAuthoringReviewGates,
  deriveAuthoringLifecycleStatus,
} from './review-policy';
import { ensureAuthoringSourceState } from './source-update';
import {
  analyzeAuthoringLongDocument,
  withAuthoringLongDocumentTrace,
} from './long-document-table';
import { resolveTextAuthoringP1LongDocumentTableGate } from './text-authoring-feature-flags';

type SourceRowType = AuthoringSourceRow['rowType'];

type ParsedLine = {
  raw: string;
  startOffset: number;
  endOffset: number;
  line: number;
};

type ParsedProperty = {
  label: string;
  key: string;
  value: string;
  targetKind: Extract<
    AuthoringTargetKind,
    'detail' | 'completion' | 'field' | 'resource' | 'guide' | 'caution' | 'source'
  >;
};

type SourceUnit = {
  row: AuthoringSourceRow;
  block: AuthoringBlock;
};

type MutableParseState = {
  documentId: string;
  fixtureVersion: string;
  options: CreateTextAuthoringDocumentOptions;
  blocks: AuthoringBlock[];
  mappings: BlockToCanonicalMapping[];
  issues: UnresolvedAuthoringIssue[];
  canonical: AuthoringCanonicalContent;
  currentStep?: CanonicalAuthoringStep;
  currentStepBlockId?: string;
  currentStepSchedule?: AuthoringSchedule;
  currentStepScheduleRowId?: string;
  anchorLabel?: string;
  currentItem?: CanonicalAuthoringItem;
  currentItemBlockId?: string;
  explicitFlowTitle: boolean;
};

const URL_PATTERN = /https?:\/\/[^\s<>()\]]+/giu;
const MARKDOWN_LINE_PATTERN =
  /^(?:#{1,6}\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+|```|~~~|>\s+|!\[[^\]]*\]\()/u;

const PROPERTY_LABELS: Record<string, ParsedProperty['targetKind']> = {
  detail: 'detail',
  description: 'detail',
  why: 'detail',
  how: 'detail',
  설명: 'detail',
  상세: 'detail',
  자세히: 'detail',
  방법: 'detail',
  done: 'completion',
  completion: 'completion',
  완료: 'completion',
  완료기준: 'completion',
  resource: 'resource',
  resources: 'resource',
  link: 'resource',
  video: 'resource',
  자료: 'resource',
  링크: 'resource',
  영상: 'resource',
  guide: 'guide',
  안내: 'guide',
  가이드: 'guide',
  caution: 'caution',
  warning: 'caution',
  주의: 'caution',
  경고: 'caution',
  source: 'source',
  출처: 'source',
};

const FIELD_LABEL_KEYS: Record<string, string> = {
  date: 'date',
  날짜: 'date',
  relativedate: 'relative_date',
  상대날짜: 'relative_date',
  상대일: 'relative_date',
  time: 'time',
  시간: 'time',
  timezone: 'timezone',
  시간대: 'timezone',
  place: 'place',
  location: 'place',
  장소: 'place',
  duration: 'duration',
  소요시간: 'duration',
  예상시간: 'duration',
  repeat: 'repeat',
  반복: 'repeat',
  repeatend: 'repeat_end',
  recurrenceend: 'repeat_end',
  반복종료: 'repeat_end',
  condition: 'condition',
  executioncondition: 'condition',
  조건: 'condition',
  실행조건: 'condition',
  anchor: 'anchor',
  기준일: 'anchor',
};

function compactLabel(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s_-]+/gu, '');
}

function indentationWidth(value: string): number {
  return value.replace(/\t/gu, '  ').length;
}

function importAssistEnabled(state: MutableParseState): boolean {
  if (state.options.importAssist != null) return state.options.importAssist;
  return /(?:^|[-_])v1(?:$|[-_])/iu.test(state.fixtureVersion);
}

function splitSourceLines(rawText: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  const matcher = /([^\r\n]*)(\r\n|\r|\n|$)/gu;
  let match: RegExpExecArray | null;
  let line = 1;
  while ((match = matcher.exec(rawText)) !== null) {
    if (match[0] === '') break;
    const startOffset = match.index;
    const raw = match[1];
    lines.push({
      raw,
      startOffset,
      endOffset: startOffset + raw.length,
      line,
    });
    line += 1;
    if (match[2] === '') break;
  }
  if (rawText === '') {
    lines.push({ raw: '', startOffset: 0, endOffset: 0, line: 1 });
  }
  return lines;
}

function rangeForLine(line: ParsedLine): AuthoringSourceRange {
  return {
    startOffset: line.startOffset,
    endOffset: line.endOffset,
    startLine: line.line,
    endLine: line.line,
  };
}

function rangeForFragment(
  line: ParsedLine,
  startInLine: number,
  endInLine: number,
): AuthoringSourceRange {
  return {
    startOffset: line.startOffset + startInLine,
    endOffset: line.startOffset + endInLine,
    startLine: line.line,
    endLine: line.line,
  };
}

function validIsoDate(value: string): boolean {
  return isValidAuthoringDate(value);
}

export function parseExplicitAuthoringSchedule(
  value: string,
): AuthoringSchedule | undefined {
  const relative = /(?:^|[\s([{:·])D\s*(?:(-|\+)\s*(\d+)|-?\s*DAY)(?=$|[\s)\]},:·])/iu.exec(
    value,
  );
  if (relative) {
    const raw = relative[0].trim().replace(/^[([{:{·]\s*/u, '');
    const dayOffset = relative[2]
      ? (relative[1] === '-' ? -Number(relative[2]) : Number(relative[2]))
      : 0;
    return {
      kind: 'relative',
      raw,
      dayOffset,
    };
  }

  const absolute = /\b(\d{4}-\d{2}-\d{2})\b/u.exec(value);
  if (absolute && validIsoDate(absolute[1])) {
    return {
      kind: 'absolute',
      raw: absolute[1],
      date: absolute[1],
    };
  }
  return undefined;
}

function extractUrls(value: string): string[] {
  return [...value.matchAll(URL_PATTERN)].map((match) => (
    match[0].replace(/[.,;:!?]+$/u, '')
  ));
}

function parseProperty(value: string): ParsedProperty | undefined {
  if (/^https?:\/\//iu.test(value.trim())) return undefined;
  const match = /^([^:：]{1,32})[:：]\s*(.*)$/u.exec(value.trim());
  if (!match) return undefined;
  const label = match[1].trim();
  const compact = compactLabel(label);
  const targetKind = PROPERTY_LABELS[compact];
  if (targetKind) {
    return { label, key: compact, value: match[2].trim(), targetKind };
  }
  const fieldKey = FIELD_LABEL_KEYS[compact];
  if (fieldKey) {
    return {
      label,
      key: fieldKey,
      value: match[2].trim(),
      targetKind: 'field',
    };
  }
  return undefined;
}

function sourceUnit(
  state: MutableParseState,
  rawText: string,
  sourceRange: AuthoringSourceRange,
  rowType: SourceRowType,
  role: AuthoringTargetKind,
  confidence: AuthoringBlock['confidenceBand'],
  depth = 0,
  parentBlockId?: string,
): SourceUnit {
  const identity = [
    state.documentId,
    state.fixtureVersion,
    TEXT_AUTHORING_PARSER_VERSION,
    sourceRange.startOffset,
    sourceRange.endOffset,
    rawText,
  ];
  const row: AuthoringSourceRow = {
    sourceRowId: stableAuthoringId('source-row', ...identity),
    documentId: state.documentId,
    rowType,
    rawText,
    sourceRange: { ...sourceRange },
    order: state.canonical.sourceRows.length,
  };
  const block: AuthoringBlock = {
    blockId: stableAuthoringId('block', ...identity, role),
    documentId: state.documentId,
    ...(parentBlockId ? { parentBlockId } : {}),
    order: state.blocks.length,
    depth,
    sourceRange: { ...sourceRange },
    rawText,
    normalizedText: rawText.trim(),
    interpretedRole: role,
    confidenceBand: confidence,
    included: true,
  };
  state.canonical.sourceRows.push(row);
  state.blocks.push(block);
  return { row, block };
}

function addMapping(
  state: MutableParseState,
  unit: SourceUnit,
  targetKind: AuthoringTargetKind,
  targetDraftId: string,
): BlockToCanonicalMapping {
  const mapping: BlockToCanonicalMapping = {
    mappingId: stableAuthoringId(
      'mapping',
      state.documentId,
      unit.block.blockId,
      targetKind,
      targetDraftId,
    ),
    blockIds: [unit.block.blockId],
    targetKind,
    targetDraftId,
    sourceLineage: [unit.row.sourceRowId],
    userCorrected: false,
  };
  state.mappings.push(mapping);
  return mapping;
}

function addSourceReference(
  state: MutableParseState,
  entityType: AuthoringSourceReference['entityType'],
  entityId: string,
  sourceRowIds: string[],
  relation: AuthoringSourceReference['relation'] = 'derived_from',
): void {
  state.canonical.sourceRefs.push({
    sourceRefId: stableAuthoringId(
      'source-ref',
      state.documentId,
      entityType,
      entityId,
      sourceRowIds.join(','),
      relation,
    ),
    entityType,
    entityId,
    sourceRowIds: [...sourceRowIds],
    relation,
    supportLevel: 'direct',
  });
}

function addIssue(
  state: MutableParseState,
  unit: SourceUnit,
  type: UnresolvedAuthoringIssue['type'],
  messageKey: string,
  options: AuthoringTargetKind[],
  blocking = false,
): UnresolvedAuthoringIssue {
  const issue: UnresolvedAuthoringIssue = {
    issueId: stableAuthoringId(
      'issue',
      state.documentId,
      unit.row.sourceRowId,
      type,
    ),
    type,
    sourceRange: { ...unit.row.sourceRange },
    sourceRowIds: [unit.row.sourceRowId],
    messageKey,
    options: [...options],
    blocking,
  };
  state.issues.push(issue);
  addMapping(state, unit, 'unresolved', issue.issueId);
  return issue;
}

function ensureStep(state: MutableParseState): CanonicalAuthoringStep {
  if (state.currentStep) return state.currentStep;
  const stepId = stableAuthoringId(
    'step',
    state.documentId,
    'generated-default',
  );
  const step: CanonicalAuthoringStep = {
    stepId,
    flowId: state.canonical.flow.flowId,
    title: '할 일',
    order: state.canonical.steps.length,
    itemIds: [],
    sourceRowIds: [],
    generated: true,
  };
  state.canonical.steps.push(step);
  state.canonical.flow.stepIds.push(stepId);
  state.currentStep = step;
  state.currentStepBlockId = undefined;
  state.currentStepSchedule = undefined;
  state.currentStepScheduleRowId = undefined;
  return step;
}

function inferIntent(title: string): AuthoringItemIntent {
  if (/(결정|선택|비교|고르)/u.test(title)) return 'decide';
  if (/(확인|점검|검토|살펴|체크)/u.test(title)) return 'inspect';
  if (/https?:\/\//iu.test(title)) return 'use_resource';
  return 'act';
}

function addItem(
  state: MutableParseState,
  title: string,
  rawText: string,
  sourceRange: AuthoringSourceRange,
  rowType: SourceRowType,
  depth = 0,
  sourceChecked?: boolean,
): CanonicalAuthoringItem {
  const step = ensureStep(state);
  const unit = sourceUnit(
    state,
    rawText,
    sourceRange,
    rowType,
    'item',
    'high',
    depth,
    state.currentStepBlockId,
  );
  const itemId = stableAuthoringId(
    'item',
    state.documentId,
    unit.row.sourceRowId,
  );
  const sourceRowIds = [unit.row.sourceRowId];
  if (
    state.currentStepScheduleRowId
    && !sourceRowIds.includes(state.currentStepScheduleRowId)
  ) {
    sourceRowIds.push(state.currentStepScheduleRowId);
  }
  const sourceTitle = title.trim();
  const inlineUrls = extractUrls(sourceTitle);
  const resources: AuthoringLink[] = inlineUrls.map((url, index) => ({
    label: `자료 ${index + 1}`,
    url,
    type: 'reference',
    sourceRowIds: [unit.row.sourceRowId],
  }));
  const item: CanonicalAuthoringItem = {
    itemId,
    stepId: step.stepId,
    ...(sourceChecked !== undefined ? { sourceChecked } : {}),
    title: sourceTitle,
    sourceTitle,
    intent: inferIntent(sourceTitle),
    role: 'item',
    order: state.canonical.items.length,
    nestingLevel: depth,
    included: true,
    properties: [],
    resources,
    sources: [],
    guides: [],
    cautions: [],
    sourceRowIds,
    ...(state.currentStepSchedule
      ? { schedule: { ...state.currentStepSchedule } }
      : {}),
  };
  state.canonical.items.push(item);
  step.itemIds.push(itemId);
  addMapping(state, unit, 'item', itemId);
  addSourceReference(state, 'item', itemId, [unit.row.sourceRowId]);
  state.currentItem = item;
  state.currentItemBlockId = unit.block.blockId;
  return item;
}

function addField(
  state: MutableParseState,
  owner: AuthoringField['owner'],
  key: string,
  label: string,
  value: string,
  sourceRowIds: string[],
): AuthoringField {
  const field: AuthoringField = {
    fieldId: stableAuthoringId(
      'field',
      state.documentId,
      owner.type,
      owner.id,
      key,
      sourceRowIds.join(','),
    ),
    owner: { ...owner },
    key,
    label,
    value,
    sourceRowIds: [...sourceRowIds],
  };
  state.canonical.fields.push(field);
  addSourceReference(state, 'field', field.fieldId, sourceRowIds);
  return field;
}

function addMemo(
  state: MutableParseState,
  scope: AuthoringMemo['scope'],
  kind: AuthoringMemo['kind'],
  text: string,
  sourceRowIds: string[],
): AuthoringMemo {
  const memo: AuthoringMemo = {
    memoId: stableAuthoringId(
      'memo',
      state.documentId,
      scope.type,
      scope.id,
      kind,
      sourceRowIds.join(','),
    ),
    scope: { ...scope },
    kind,
    text,
    sourceRowIds: [...sourceRowIds],
  };
  state.canonical.memos.push(memo);
  addSourceReference(
    state,
    'memo',
    memo.memoId,
    sourceRowIds,
    kind === 'caution' ? 'caution' : 'supports',
  );
  return memo;
}

function appendUnique(values: string[], value: string): void {
  if (value && !values.includes(value)) values.push(value);
}

function appendItemSourceRow(
  item: CanonicalAuthoringItem,
  sourceRowId: string,
): void {
  appendUnique(item.sourceRowIds, sourceRowId);
}

function mergeText(existing: string | undefined, value: string): string {
  return existing ? `${existing}\n${value}` : value;
}

function linkFromProperty(
  property: ParsedProperty,
  sourceRowId: string,
): AuthoringLink | undefined {
  const markdownLink = parseCanonicalMarkdownLink(property.value);
  if (markdownLink && validHttpUrl(markdownLink.url)) {
    return {
      ...markdownLink,
      type: property.targetKind === 'source' ? 'official' : 'reference',
      sourceRowIds: [sourceRowId],
    };
  }
  if (/^\s*\[/u.test(property.value) || property.value.includes('](')) {
    return undefined;
  }
  const trimmedValue = property.value.trim();
  const urls = /^https?:\/\//iu.test(trimmedValue) && validHttpUrl(trimmedValue)
    ? [trimmedValue]
    : extractUrls(property.value).filter(validHttpUrl);
  if (urls.length !== 1) return undefined;
  const [url] = urls;
  const beforeUrl = property.value.slice(0, property.value.indexOf(url));
  const label = beforeUrl.trim().replace(/[|·-]+$/u, '').trim()
    || property.label;
  return {
    label,
    url,
    type: property.targetKind === 'source' ? 'official' : 'reference',
    sourceRowIds: [sourceRowId],
  };
}

function validHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function propertyRowType(property: ParsedProperty): SourceRowType {
  if (property.targetKind === 'resource') return 'resource';
  if (property.targetKind === 'source') return 'reference';
  return 'property';
}

function addInvalidDateIssue(
  state: MutableParseState,
  unit: SourceUnit,
  item?: CanonicalAuthoringItem,
  inputValue?: string,
  messageKey = 'authoring.invalid_explicit_date',
): void {
  const issue: UnresolvedAuthoringIssue = {
    issueId: stableAuthoringId(
      'issue',
      state.documentId,
      unit.row.sourceRowId,
      'invalid_date',
    ),
    type: 'invalid_date',
    sourceRange: { ...unit.row.sourceRange },
    sourceRowIds: [unit.row.sourceRowId],
    messageKey,
    options: ['field', 'unresolved'],
    blocking: false,
    ...(item ? { itemId: item.itemId } : {}),
    ...(inputValue !== undefined ? { inputValue } : {}),
    expectedFormat: messageKey === 'authoring.invalid_explicit_relative_date'
      ? 'D-Day, D-3, D+7'
      : 'YYYY-MM-DD',
  };
  state.issues.push(issue);
}

function addInvalidUrlIssue(
  state: MutableParseState,
  unit: SourceUnit,
  property: ParsedProperty,
  item?: CanonicalAuthoringItem,
): void {
  const issue: UnresolvedAuthoringIssue = {
    issueId: stableAuthoringId(
      'issue',
      state.documentId,
      unit.row.sourceRowId,
      'invalid_url',
    ),
    type: 'invalid_url',
    sourceRange: { ...unit.row.sourceRange },
    sourceRowIds: [unit.row.sourceRowId],
    messageKey: 'authoring.invalid_url',
    options: [property.targetKind, 'unresolved'],
    blocking: true,
    ...(item ? { itemId: item.itemId } : {}),
    inputValue: property.value,
    expectedFormat: 'https://… 또는 [이름](https://…)',
  };
  state.issues.push(issue);
  addMapping(state, unit, 'unresolved', issue.issueId);
}

function setAnchorValue(state: MutableParseState, value: string): void {
  state.anchorLabel = value;
  state.canonical.items.forEach((item) => {
    if (item.schedule?.kind !== 'relative') return;
    item.schedule = { ...item.schedule, anchorLabel: value };
  });
}

function applyScheduleDetailProperty(
  item: CanonicalAuthoringItem,
  property: Pick<ParsedProperty, 'key' | 'value'>,
): void {
  if (!item.schedule) return;
  if (property.key === 'time') {
    const time = /\b([01]\d|2[0-3]):([0-5]\d)\b/u.exec(property.value);
    if (time) item.schedule = { ...item.schedule, time: time[0] };
  } else if (property.key === 'timezone') {
    item.schedule = { ...item.schedule, timezone: property.value };
  } else if (property.key === 'repeat') {
    item.schedule = { ...item.schedule, repeat: property.value };
  } else if (property.key === 'duration') {
    const duration = /(\d+)\s*(분|시간|minutes?|hours?)/iu.exec(property.value);
    if (duration) {
      const amount = Number(duration[1]);
      const durationMinutes = /시간|hours?/iu.test(duration[2])
        ? amount * 60
        : amount;
      item.schedule = { ...item.schedule, durationMinutes };
    }
  }
}

function reapplyScheduleDetails(item: CanonicalAuthoringItem): void {
  item.properties.forEach((property) => {
    applyScheduleDetailProperty(item, property);
  });
}

function applyScheduleProperty(
  state: MutableParseState,
  item: CanonicalAuthoringItem,
  property: ParsedProperty,
  unit: SourceUnit,
): void {
  if (property.key === 'date') {
    const schedule = parseExplicitAuthoringSchedule(property.value);
    if (schedule?.kind === 'absolute') {
      item.schedule = schedule;
      reapplyScheduleDetails(item);
    } else {
      addInvalidDateIssue(state, unit, item, property.value);
    }
    return;
  }
  if (property.key === 'relative_date') {
    const schedule = parseExplicitAuthoringSchedule(property.value);
    if (schedule?.kind === 'relative') {
      item.schedule = {
        ...schedule,
        ...(state.anchorLabel ? { anchorLabel: state.anchorLabel } : {}),
      };
      reapplyScheduleDetails(item);
    } else {
      addInvalidDateIssue(
        state,
        unit,
        item,
        property.value,
        'authoring.invalid_explicit_relative_date',
      );
    }
    return;
  }
  if (property.key === 'anchor') {
    setAnchorValue(state, property.value);
    if (item.schedule?.kind === 'relative') {
      item.schedule = { ...item.schedule, anchorLabel: property.value };
    }
    return;
  }
  applyScheduleDetailProperty(item, property);
}

function applyProperty(
  state: MutableParseState,
  line: ParsedLine,
  property: ParsedProperty,
  depth: number,
): void {
  const parentBlockId = state.currentItemBlockId ?? state.currentStepBlockId;
  const unit = sourceUnit(
    state,
    line.raw,
    rangeForLine(line),
    propertyRowType(property),
    property.targetKind,
    'high',
    depth,
    parentBlockId,
  );
  const item = state.currentItem;

  if (!item) {
    if (property.targetKind === 'detail') {
      state.canonical.flow.summary = mergeText(
        state.canonical.flow.summary,
        property.value,
      );
      state.canonical.flow.sourceRowIds.push(unit.row.sourceRowId);
      addMapping(state, unit, 'detail', state.canonical.flow.flowId);
      addMemo(
        state,
        { type: 'flow', id: state.canonical.flow.flowId },
        'source_detail',
        property.value,
        [unit.row.sourceRowId],
      );
      return;
    }
    if (property.targetKind === 'source' || property.targetKind === 'resource') {
      const link = linkFromProperty(property, unit.row.sourceRowId);
      state.canonical.flow.sourceRowIds.push(unit.row.sourceRowId);
      if (link) {
        const field = addField(
          state,
          { type: 'flow', id: state.canonical.flow.flowId },
          property.targetKind,
          property.label,
          property.value,
          [unit.row.sourceRowId],
        );
        addMapping(state, unit, property.targetKind, field.fieldId);
      } else {
        addInvalidUrlIssue(state, unit, property);
      }
      if (link && property.targetKind === 'source' && !state.options.sourceUrl) {
        state.options.sourceUrl = link.url;
        state.options.sourceTitle = link.label;
      }
      return;
    }

    const field = addField(
      state,
      { type: 'flow', id: state.canonical.flow.flowId },
      property.key,
      property.label,
      property.value,
      [unit.row.sourceRowId],
    );
    if (
      property.key === 'anchor'
    ) {
      setAnchorValue(state, property.value);
    }
    state.canonical.flow.sourceRowIds.push(unit.row.sourceRowId);
    addMapping(state, unit, 'field', field.fieldId);
    return;
  }

  appendItemSourceRow(item, unit.row.sourceRowId);
  if (property.targetKind === 'detail') {
    item.sourceDetail = mergeText(item.sourceDetail, property.value);
    item.detail = item.sourceDetail;
    addMapping(state, unit, 'detail', item.itemId);
    addMemo(
      state,
      { type: 'item', id: item.itemId },
      'source_detail',
      property.value,
      [unit.row.sourceRowId],
    );
  } else if (property.targetKind === 'completion') {
    const completion: AuthoringCompletion = {
      mode: item.intent === 'decide'
        ? 'decision'
        : item.intent === 'record'
          ? 'record'
          : 'check',
      doneWhen: property.value,
      sourceRowIds: [unit.row.sourceRowId],
      owner: 'source',
    };
    item.completion = completion;
    addMapping(state, unit, 'completion', item.itemId);
  } else if (property.targetKind === 'resource') {
    const link = linkFromProperty(property, unit.row.sourceRowId);
    if (link) {
      item.resources.push(link);
      addMapping(state, unit, 'resource', item.itemId);
    } else {
      addInvalidUrlIssue(state, unit, property, item);
    }
    addMemo(
      state,
      { type: 'item', id: item.itemId },
      'resource',
      property.value,
      [unit.row.sourceRowId],
    );
  } else if (property.targetKind === 'source') {
    const link = linkFromProperty(property, unit.row.sourceRowId);
    if (link) {
      item.sources.push(link);
      addMapping(state, unit, 'source', item.itemId);
    } else {
      addInvalidUrlIssue(state, unit, property, item);
    }
  } else if (property.targetKind === 'guide') {
    appendUnique(item.guides, property.value);
    addMapping(state, unit, 'guide', item.itemId);
    addMemo(
      state,
      { type: 'item', id: item.itemId },
      'guide',
      property.value,
      [unit.row.sourceRowId],
    );
  } else if (property.targetKind === 'caution') {
    appendUnique(item.cautions, property.value);
    addMapping(state, unit, 'caution', item.itemId);
    addMemo(
      state,
      { type: 'item', id: item.itemId },
      'caution',
      property.value,
      [unit.row.sourceRowId],
    );
  } else {
    const authoringProperty: AuthoringProperty = {
      propertyId: stableAuthoringId(
        'property',
        state.documentId,
        item.itemId,
        property.key,
        unit.row.sourceRowId,
      ),
      key: property.key,
      label: property.label,
      value: property.value,
      sourceRowIds: [unit.row.sourceRowId],
      owner: 'source',
    };
    item.properties.push(authoringProperty);
    const field = addField(
      state,
      { type: 'item', id: item.itemId },
      property.key,
      property.label,
      property.value,
      [unit.row.sourceRowId],
    );
    applyScheduleProperty(state, item, property, unit);
    addMapping(state, unit, 'field', field.fieldId);
  }
}

function applyCanonicalFlowAnchor(
  state: MutableParseState,
  line: ParsedLine,
  value: string,
): void {
  const unit = sourceUnit(
    state,
    line.raw,
    rangeForLine(line),
    'property',
    'field',
    'high',
  );
  const normalized = value.trim();
  if (!validIsoDate(normalized)) {
    addIssue(
      state,
      unit,
      'invalid_date',
      'authoring.invalid_anchor_date',
      ['field', 'unresolved'],
    );
    return;
  }
  const field = addField(
    state,
    { type: 'flow', id: state.canonical.flow.flowId },
    'anchor',
    '기준일',
    normalized,
    [unit.row.sourceRowId],
  );
  setAnchorValue(state, normalized);
  state.canonical.flow.sourceRowIds.push(unit.row.sourceRowId);
  addMapping(state, unit, 'field', field.fieldId);
}

function addFlowHeading(
  state: MutableParseState,
  line: ParsedLine,
  title: string,
  level: number,
): void {
  if (level === 1 && !state.explicitFlowTitle) {
    const unit = sourceUnit(
      state,
      line.raw,
      rangeForLine(line),
      'heading',
      'flow',
      'high',
    );
    state.canonical.flow.title = title;
    state.canonical.flow.sourceRowIds.push(unit.row.sourceRowId);
    state.explicitFlowTitle = true;
    addMapping(state, unit, 'flow', state.canonical.flow.flowId);
    addSourceReference(
      state,
      'flow',
      state.canonical.flow.flowId,
      [unit.row.sourceRowId],
    );
    state.currentItem = undefined;
    state.currentItemBlockId = undefined;
    return;
  }

  const unit = sourceUnit(
    state,
    line.raw,
    rangeForLine(line),
    'heading',
    'step',
    'high',
    Math.max(0, level - 2),
  );
  const stepId = stableAuthoringId(
    'step',
    state.documentId,
    unit.row.sourceRowId,
  );
  const step: CanonicalAuthoringStep = {
    stepId,
    flowId: state.canonical.flow.flowId,
    title,
    order: state.canonical.steps.length,
    itemIds: [],
    sourceRowIds: [unit.row.sourceRowId],
  };
  const schedule = parseExplicitAuthoringSchedule(title);
  if (schedule?.kind === 'relative' && state.anchorLabel) {
    state.currentStepSchedule = {
      ...schedule,
      anchorLabel: state.anchorLabel,
    };
  } else {
    state.currentStepSchedule = schedule;
  }
  state.currentStepScheduleRowId = schedule
    ? unit.row.sourceRowId
    : undefined;
  state.canonical.steps.push(step);
  state.canonical.flow.stepIds.push(stepId);
  state.currentStep = step;
  state.currentStepBlockId = unit.block.blockId;
  state.currentItem = undefined;
  state.currentItemBlockId = undefined;
  addMapping(state, unit, 'step', stepId);
  addSourceReference(state, 'step', stepId, [unit.row.sourceRowId]);
}

function markdownTableCells(raw: string): string[] {
  let value = raw.trim();
  if (value.startsWith('|')) value = value.slice(1);
  if (value.endsWith('|')) value = value.slice(0, -1);
  return value.split('|').map((cell) => cell.trim());
}

type TableDelimiter = 'markdown' | 'tab' | 'csv';

function csvTableCells(raw: string): string[] {
  const cells: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (character === '"') {
      if (quoted && raw[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      cells.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }
  cells.push(value.trim());
  return cells;
}

function tableCells(raw: string, delimiter: TableDelimiter): string[] {
  if (delimiter === 'markdown') return markdownTableCells(raw);
  if (delimiter === 'csv') return csvTableCells(raw);
  return raw.split('\t').map((cell) => cell.trim());
}

function isMarkdownTableSeparator(raw: string): boolean {
  const cells = markdownTableCells(raw);
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

function isCsvTableStart(lines: ParsedLine[], startIndex: number): boolean {
  const first = lines[startIndex];
  const second = lines[startIndex + 1];
  if (!first || !second || !first.raw.includes(',')) return false;
  const headers = csvTableCells(first.raw);
  const secondCells = csvTableCells(second.raw);
  if (headers.length < 2 || headers.length !== secondCells.length) return false;
  if (
    !headers.some((header) => (
      /(순서|번호|제목|이름|주제|활동|자료|주차|날짜|설명|작품|도서|콘텐츠|title|name|date|url|link|item|task|action)/iu
        .test(header)
    ))
  ) {
    return false;
  }
  return (
    headers.every((header) => header.length > 0 && header.length <= 40)
    && headers.every((header) => !/^https?:\/\//iu.test(header))
  );
}

function tableActionColumn(headers: string[], cells: string[]): number {
  const explicitActionIndex = headers.findIndex((header) => (
    /^(?:실행\s*항목|할\s*일|action|task|item)$/iu.test(header.trim())
  ));
  if (explicitActionIndex >= 0 && cells[explicitActionIndex]) {
    return explicitActionIndex;
  }
  const titleIndex = headers.findIndex((header) => (
    /(제목|작품|주제|이름|도서|콘텐츠|title|name)/iu.test(header)
  ));
  if (titleIndex >= 0 && cells[titleIndex]) return titleIndex;
  const genericActionIndex = headers.findIndex((header) => (
    /(활동|실행)/iu.test(header)
  ));
  if (genericActionIndex >= 0 && cells[genericActionIndex]) {
    return genericActionIndex;
  }
  const descriptiveIndex = cells.findIndex((cell) => (
    Boolean(cell)
    && !/^\d+(?:[.)]|주|회|장)?$/u.test(cell.trim())
    && !/^https?:\/\//iu.test(cell.trim())
  ));
  if (descriptiveIndex >= 0) return descriptiveIndex;
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    if (cells[index]) return index;
  }
  return Math.max(0, cells.length - 1);
}

function addTableMetadata(
  state: MutableParseState,
  line: ParsedLine,
  key: 'table_headers' | 'table_separator',
  value: string,
): void {
  const unit = sourceUnit(
    state,
    line.raw,
    rangeForLine(line),
    'property',
    'field',
    'high',
  );
  const field = addField(
    state,
    { type: 'flow', id: state.canonical.flow.flowId },
    key,
    key === 'table_headers' ? '표 머리글' : '표 구분선',
    value,
    [unit.row.sourceRowId],
  );
  state.canonical.flow.sourceRowIds.push(unit.row.sourceRowId);
  addMapping(state, unit, 'field', field.fieldId);
}

function addTableItem(
  state: MutableParseState,
  line: ParsedLine,
  headers: string[],
  cells: string[],
): void {
  const actionIndex = tableActionColumn(headers, cells);
  const title = cells[actionIndex]?.trim();
  if (!title) {
    const unit = sourceUnit(
      state,
      line.raw,
      rangeForLine(line),
      'unsupported',
      'unresolved',
      'low',
    );
    addIssue(
      state,
      unit,
      'ambiguous_role',
      'authoring.table_row_without_action',
      ['item', 'detail', 'unresolved'],
    );
    return;
  }
  const item = addItem(
    state,
    title,
    line.raw,
    rangeForLine(line),
    'table_row',
  );
  const sourceRowId = item.sourceRowIds[0];
  const details: string[] = [];
  cells.forEach((value, index) => {
    if (!value) return;
    const label = headers[index] || `열 ${index + 1}`;
    item.properties.push({
      propertyId: stableAuthoringId(
        'property',
        state.documentId,
        item.itemId,
        label,
        index,
        sourceRowId,
      ),
      key: compactLabel(label) || `column_${index + 1}`,
      label,
      value,
      sourceRowIds: [sourceRowId],
      owner: 'source',
    });
    if (index !== actionIndex) details.push(`${label}: ${value}`);
  });
  if (details.length > 0) {
    item.sourceDetail = details.join('\n');
    item.detail = item.sourceDetail;
  }
  const schedule = cells
    .map((cell) => parseExplicitAuthoringSchedule(cell))
    .find((candidate): candidate is AuthoringSchedule => Boolean(candidate));
  if (schedule) item.schedule = schedule;
}

function consumeTable(
  state: MutableParseState,
  lines: ParsedLine[],
  startIndex: number,
  delimiter: TableDelimiter,
): number {
  const first = lines[startIndex];
  const firstCells = tableCells(first.raw, delimiter);
  const next = lines[startIndex + 1];
  const markdownHeader = delimiter === 'markdown'
    && Boolean(next)
    && isMarkdownTableSeparator(next.raw);
  const tabRows = delimiter === 'tab'
    ? lines.slice(startIndex).filter((line) => line.raw.includes('\t'))
    : [];
  const csvHeader = delimiter === 'csv' && isCsvTableStart(lines, startIndex);
  const hasHeader = markdownHeader || tabRows.length >= 2 || csvHeader;
  const headers = hasHeader
    ? firstCells
    : firstCells.map((_, index) => `열 ${index + 1}`);
  let index = startIndex;

  if (hasHeader) {
    addTableMetadata(state, first, 'table_headers', firstCells.join('\t'));
    index += 1;
    if (markdownHeader) {
      addTableMetadata(
        state,
        lines[index],
        'table_separator',
        lines[index].raw.trim(),
      );
      index += 1;
    }
  }

  for (; index < lines.length; index += 1) {
    const line = lines[index];
    const isTableLine = delimiter === 'markdown'
      ? line.raw.includes('|') && markdownTableCells(line.raw).length >= 2
      : delimiter === 'tab'
        ? line.raw.includes('\t')
        : line.raw.includes(',') && csvTableCells(line.raw).length === headers.length;
    if (!isTableLine) break;
    addTableItem(state, line, headers, tableCells(line.raw, delimiter));
  }
  return index - 1;
}

type PlainFragment = {
  raw: string;
  title: string;
  range: AuthoringSourceRange;
};

function splitPlainFragments(
  line: ParsedLine,
  startInLine: number,
  value: string,
): PlainFragment[] {
  const fragments: PlainFragment[] = [];
  const delimiter = /[,，]|(?:\s+그리고\s+)/gu;
  let cursor = 0;
  let match: RegExpExecArray | null;

  const push = (end: number): void => {
    const rawSlice = value.slice(cursor, end);
    const leading = rawSlice.search(/\S/u);
    if (leading < 0) {
      cursor = end;
      return;
    }
    const trailingTrimmed = rawSlice.trimEnd();
    const fragmentStart = cursor + leading;
    const fragmentEnd = cursor + trailingTrimmed.length;
    const raw = value.slice(fragmentStart, fragmentEnd);
    const title = raw.replace(/[.!?。]+$/u, '').trim();
    if (title) {
      fragments.push({
        raw,
        title,
        range: rangeForFragment(
          line,
          startInLine + fragmentStart,
          startInLine + fragmentEnd,
        ),
      });
    }
    cursor = end;
  };

  while ((match = delimiter.exec(value)) !== null) {
    push(match.index);
    cursor = match.index + match[0].length;
  }
  push(value.length);
  return fragments;
}

function looksLikePlainAction(title: string): boolean {
  return /(?:확인|점검|검토|체크|체크인|예약|정리|준비|저장|공유|신청|제출|작성|구매|비교|선택|결정|기록|연락|방문|설치|등록|취소|변경|완료|시작|읽기|듣기|보기|챙기기|따라\s*하기|해야\s*(?:함|한다)|할\s*것)$/u
    .test(title.trim());
}

function addUnresolvedPlainFragment(
  state: MutableParseState,
  fragment: PlainFragment,
): void {
  const unit = sourceUnit(
    state,
    fragment.raw,
    fragment.range,
    'unsupported',
    'unresolved',
    'low',
    0,
    state.currentItemBlockId ?? state.currentStepBlockId,
  );
  addIssue(
    state,
    unit,
    'ambiguous_role',
    'authoring.ambiguous_plain_sentence',
    ['detail', 'item', 'guide', 'caution', 'unresolved'],
  );
}

function preservePlainLine(
  state: MutableParseState,
  line: ParsedLine,
): void {
  const trimmed = line.raw.trim();
  addUnresolvedPlainFragment(state, {
    raw: line.raw,
    title: trimmed,
    range: rangeForLine(line),
  });
}

function consumePlainLine(state: MutableParseState, line: ParsedLine): void {
  const trimmed = line.raw.trim();
  const trimStart = line.raw.indexOf(trimmed);
  const topicMatch = /^(.{2,100}?[.!?。])\s*(.+)$/u.exec(trimmed);
  if (topicMatch) {
    const tailStart = trimmed.indexOf(topicMatch[2]);
    const fragments = splitPlainFragments(
      line,
      trimStart + tailStart,
      topicMatch[2],
    );
    if (fragments.length >= 2) {
      const topicRaw = topicMatch[1];
      const topicTitle = topicRaw.replace(/[.!?。]+$/u, '').trim();
      const topicEnd = trimStart + topicRaw.length;
      const unit = sourceUnit(
        state,
        topicRaw,
        rangeForFragment(line, trimStart, topicEnd),
        'heading',
        'flow',
        'high',
      );
      if (!state.options.title) state.canonical.flow.title = topicTitle;
      state.explicitFlowTitle = true;
      state.canonical.flow.sourceRowIds.push(unit.row.sourceRowId);
      addMapping(state, unit, 'flow', state.canonical.flow.flowId);
      addSourceReference(
        state,
        'flow',
        state.canonical.flow.flowId,
        [unit.row.sourceRowId],
      );
      fragments.forEach((fragment) => {
        if (looksLikePlainAction(fragment.title)) {
          addItem(
            state,
            fragment.title,
            fragment.raw,
            fragment.range,
            'procedure',
          );
        } else {
          addUnresolvedPlainFragment(state, fragment);
        }
      });
      return;
    }
  }

  const fragments = splitPlainFragments(line, trimStart, trimmed);
  if (fragments.length > 1) {
    fragments.forEach((fragment) => {
      if (looksLikePlainAction(fragment.title)) {
        addItem(
          state,
          fragment.title,
          fragment.raw,
          fragment.range,
          'procedure',
        );
      } else {
        addUnresolvedPlainFragment(state, fragment);
      }
    });
    return;
  }

  const fragment = fragments[0];
  if (fragment && looksLikePlainAction(fragment.title)) {
    addItem(
      state,
      fragment.title,
      fragment.raw,
      fragment.range,
      'procedure',
    );
    return;
  }
  if (fragment) addUnresolvedPlainFragment(state, fragment);
}

function consumePlainTopicOnlyLine(
  state: MutableParseState,
  line: ParsedLine,
): void {
  const trimmed = line.raw.trim();
  const start = line.raw.indexOf(trimmed);
  const title = trimmed.replace(/[.!?。]+$/u, '').trim();
  const unit = sourceUnit(
    state,
    trimmed,
    rangeForFragment(line, start, start + trimmed.length),
    'heading',
    'flow',
    'high',
  );
  if (!state.options.title) state.canonical.flow.title = title;
  state.explicitFlowTitle = true;
  state.canonical.flow.sourceRowIds.push(unit.row.sourceRowId);
  addMapping(state, unit, 'flow', state.canonical.flow.flowId);
  addSourceReference(
    state,
    'flow',
    state.canonical.flow.flowId,
    [unit.row.sourceRowId],
  );
}

function addUnsupportedLine(
  state: MutableParseState,
  line: ParsedLine,
  messageKey = 'authoring.unsupported_syntax',
  type: UnresolvedAuthoringIssue['type'] = 'unsupported_syntax',
): void {
  const unit = sourceUnit(
    state,
    line.raw,
    rangeForLine(line),
    'unsupported',
    'unresolved',
    'low',
    0,
    state.currentItemBlockId ?? state.currentStepBlockId,
  );
  addIssue(
    state,
    unit,
    type,
    messageKey,
    ['detail', 'item', 'guide', 'caution', 'unresolved'],
  );
}

function preserveRawTableLine(
  state: MutableParseState,
  line: ParsedLine,
): void {
  const unit = sourceUnit(
    state,
    line.raw,
    rangeForLine(line),
    'table_row',
    'flow',
    'high',
    0,
    state.currentItemBlockId ?? state.currentStepBlockId,
  );
  addMemo(
    state,
    { type: 'flow', id: state.canonical.flow.flowId },
    'source_detail',
    line.raw,
    [unit.row.sourceRowId],
  );
  state.canonical.flow.sourceRowIds.push(unit.row.sourceRowId);
  addMapping(state, unit, 'flow', state.canonical.flow.flowId);
}

function addAuthoringSubcheck(
  state: MutableParseState,
  line: ParsedLine,
  item: CanonicalAuthoringItem,
  title: string,
  sourceChecked: boolean,
  depth: number,
): void {
  const unit = sourceUnit(
    state,
    line.raw,
    rangeForLine(line),
    'check',
    'detail',
    'high',
    depth,
    state.currentItemBlockId,
  );
  const subchecks = item.subchecks ?? [];
  const subcheck: AuthoringSubcheck = {
    subcheckId: stableAuthoringId(
      'authoring-subcheck',
      state.documentId,
      item.itemId,
      unit.row.sourceRowId,
    ),
    title: title.trim(),
    sourceChecked,
    order: subchecks.length,
    sourceRowIds: [unit.row.sourceRowId],
    owner: 'source',
  };
  item.subchecks = [...subchecks, subcheck];
  appendItemSourceRow(item, unit.row.sourceRowId);
  addMapping(state, unit, 'detail', item.itemId);
  addSourceReference(state, 'item', item.itemId, [unit.row.sourceRowId]);
}

function addUnknownItemPropertyDetail(
  state: MutableParseState,
  line: ParsedLine,
  item: CanonicalAuthoringItem,
  value: string,
  depth: number,
): void {
  const unit = sourceUnit(
    state,
    line.raw,
    rangeForLine(line),
    'property',
    'detail',
    'high',
    depth,
    state.currentItemBlockId,
  );
  const preserved = value.trim();
  appendItemSourceRow(item, unit.row.sourceRowId);
  item.sourceDetail = mergeText(item.sourceDetail, preserved);
  item.detail = item.sourceDetail;
  addMapping(state, unit, 'detail', item.itemId);
  addMemo(
    state,
    { type: 'item', id: item.itemId },
    'source_detail',
    preserved,
    [unit.row.sourceRowId],
  );
}

function addFlowmeMetadataLine(
  state: MutableParseState,
  line: ParsedLine,
): void {
  const unit = sourceUnit(
    state,
    line.raw,
    rangeForLine(line),
    'reference',
    'flow',
    'high',
    0,
    state.currentItemBlockId ?? state.currentStepBlockId,
  );
  state.canonical.flow.sourceRowIds.push(unit.row.sourceRowId);
  addMapping(state, unit, 'flow', state.canonical.flow.flowId);
  addSourceReference(
    state,
    'flow',
    state.canonical.flow.flowId,
    [unit.row.sourceRowId],
  );
}

function looksLikeUnknownProperty(value: string): boolean {
  if (/^https?:\/\//iu.test(value.trim())) return false;
  return /^([^:：]{1,32})[:：]\s*(.*)$/u.test(value.trim());
}

function addImplicitDetail(
  state: MutableParseState,
  line: ParsedLine,
  depth: number,
): void {
  const unit = sourceUnit(
    state,
    line.raw,
    rangeForLine(line),
    'procedure',
    'detail',
    'medium',
    depth,
    state.currentItemBlockId ?? state.currentStepBlockId,
  );
  const value = line.raw.trim();
  if (state.currentItem) {
    const item = state.currentItem;
    appendItemSourceRow(item, unit.row.sourceRowId);
    item.sourceDetail = mergeText(item.sourceDetail, value);
    item.detail = item.sourceDetail;
    addMapping(state, unit, 'detail', item.itemId);
    addMemo(
      state,
      { type: 'item', id: item.itemId },
      'source_detail',
      value,
      [unit.row.sourceRowId],
    );
    return;
  }
  if (state.currentStep) {
    state.currentStep.description = mergeText(
      state.currentStep.description,
      value,
    );
    state.currentStep.sourceRowIds.push(unit.row.sourceRowId);
    addMapping(state, unit, 'detail', state.currentStep.stepId);
    addMemo(
      state,
      { type: 'step', id: state.currentStep.stepId },
      'source_detail',
      value,
      [unit.row.sourceRowId],
    );
    return;
  }
  state.canonical.flow.summary = mergeText(
    state.canonical.flow.summary,
    value,
  );
  state.canonical.flow.sourceRowIds.push(unit.row.sourceRowId);
  addMapping(state, unit, 'detail', state.canonical.flow.flowId);
  addMemo(
    state,
    { type: 'flow', id: state.canonical.flow.flowId },
    'source_detail',
    value,
    [unit.row.sourceRowId],
  );
}

function addBareUrl(
  state: MutableParseState,
  line: ParsedLine,
  urlOnlyInput: boolean,
): void {
  const unit = sourceUnit(
    state,
    line.raw,
    rangeForLine(line),
    'reference',
    state.currentItem ? 'resource' : 'source',
    'high',
    0,
    state.currentItemBlockId ?? state.currentStepBlockId,
  );
  const url = extractUrls(line.raw)[0] ?? line.raw.trim();
  if (state.currentItem) {
    state.currentItem.resources.push({
      label: '자료',
      url,
      type: 'reference',
      sourceRowIds: [unit.row.sourceRowId],
    });
    appendItemSourceRow(state.currentItem, unit.row.sourceRowId);
    addMapping(state, unit, 'resource', state.currentItem.itemId);
    addMemo(
      state,
      { type: 'item', id: state.currentItem.itemId },
      'resource',
      url,
      [unit.row.sourceRowId],
    );
    return;
  }
  const field = addField(
    state,
    { type: 'flow', id: state.canonical.flow.flowId },
    'source',
    '출처',
    url,
    [unit.row.sourceRowId],
  );
  state.canonical.flow.sourceRowIds.push(unit.row.sourceRowId);
  addMapping(state, unit, 'source', field.fieldId);
  if (urlOnlyInput) {
    const issue: UnresolvedAuthoringIssue = {
      issueId: stableAuthoringId(
        'issue',
        state.documentId,
        unit.row.sourceRowId,
        'source_import_required',
      ),
      type: 'source_import_required',
      sourceRange: { ...unit.row.sourceRange },
      sourceRowIds: [unit.row.sourceRowId],
      messageKey: 'authoring.source_import_required',
      options: ['source', 'unresolved'],
      blocking: true,
    };
    state.issues.push(issue);
  }
}

export function detectInputKinds(rawText: string): AuthoringInputKind[] {
  const lines = splitSourceLines(rawText).filter((line) => line.raw.trim());
  if (lines.length === 0) return ['plain_text'];
  const hasTable = lines.some((line, index) => (
    line.raw.includes('\t')
    || (
      line.raw.includes('|')
      && Boolean(lines[index + 1])
      && isMarkdownTableSeparator(lines[index + 1].raw)
    )
    || isCsvTableStart(lines, index)
  ));
  const hasMarkdown = lines.some((line) => (
    MARKDOWN_LINE_PATTERN.test(line.raw.trimStart())
    && !isMarkdownTableSeparator(line.raw)
  ));
  const hasUrl = lines.some((line) => extractUrls(line.raw).length > 0);
  const hasPlain = !hasMarkdown && !hasTable && lines.some((line) => (
    !/^https?:\/\/\S+$/iu.test(line.raw.trim())
  ));
  const kinds: AuthoringInputKind[] = [];
  if (hasTable) kinds.push('table');
  if (hasMarkdown) kinds.push('markdown');
  if (hasUrl) kinds.push('url');
  if (hasPlain || kinds.length === 0) kinds.push('plain_text');
  if (kinds.length > 1) kinds.push('mixed');
  return kinds;
}

function primaryInputKind(
  kinds: AuthoringInputKind[],
): Exclude<AuthoringInputKind, 'mixed'> {
  return (
    (['table', 'markdown', 'url', 'plain_text'] as const)
      .find((kind) => kinds.includes(kind))
    ?? 'plain_text'
  );
}

function addInvalidRecurrenceIssue(
  state: MutableParseState,
  item: CanonicalAuthoringItem,
  sourceRowIds: string[],
  inputValue: string,
  messageKey: string,
): void {
  const sourceRows = sourceRowIds.flatMap((sourceRowId) => {
    const row = state.canonical.sourceRows.find(
      (candidate) => candidate.sourceRowId === sourceRowId,
    );
    return row ? [row] : [];
  });
  const primaryRow = sourceRows[0]
    ?? state.canonical.sourceRows.find(
      (candidate) => item.sourceRowIds.includes(candidate.sourceRowId),
    );
  if (!primaryRow) return;
  state.issues.push({
    issueId: stableAuthoringId(
      'issue',
      state.documentId,
      item.itemId,
      sourceRowIds.join(','),
      'invalid_recurrence',
      messageKey,
    ),
    type: 'invalid_recurrence',
    sourceRange: { ...primaryRow.sourceRange },
    sourceRowIds: sourceRows.length > 0
      ? sourceRows.map((row) => row.sourceRowId)
      : [primaryRow.sourceRowId],
    messageKey,
    options: ['field', 'unresolved'],
    blocking: false,
    itemId: item.itemId,
    inputValue,
    expectedFormat: '매일, N일마다, 매주 요일, N주마다 요일, 매월 N일',
  });
}

function finalizeItemRecurrences(state: MutableParseState): void {
  state.canonical.items.forEach((item) => {
    const repeats = item.properties.filter((property) => property.key === 'repeat');
    const repeatEnds = item.properties.filter(
      (property) => property.key === 'repeat_end',
    );
    if (repeats.length === 0 && repeatEnds.length === 0) return;
    const sourceRowIds = Array.from(new Set([
      ...repeats.flatMap((property) => property.sourceRowIds),
      ...repeatEnds.flatMap((property) => property.sourceRowIds),
    ]));
    const inputValue = [
      ...repeats.map((property) => property.value),
      ...repeatEnds.map((property) => property.value),
    ].join(' / ');

    if (repeats.length !== 1 || repeatEnds.length > 1) {
      addInvalidRecurrenceIssue(
        state,
        item,
        sourceRowIds,
        inputValue,
        'authoring.conflicting_recurrence_fields',
      );
      return;
    }

    const condition = [...item.properties].reverse().find(
      (property) => property.key === 'condition',
    );
    const recurrenceSourceRowIds = Array.from(new Set([
      ...sourceRowIds,
      ...(condition?.sourceRowIds ?? []),
    ]));
    const parsed = parseAuthoringRecurrenceRule({
      raw: repeats[0].value,
      repeatEnd: repeatEnds[0]?.value,
      executionCondition: condition?.value,
      sourceRowIds: recurrenceSourceRowIds,
    });
    if (!parsed.ok) {
      addInvalidRecurrenceIssue(
        state,
        item,
        sourceRowIds,
        inputValue,
        parsed.reason === 'invalid_end'
          ? 'authoring.invalid_recurrence_end'
          : 'authoring.invalid_recurrence',
      );
      return;
    }

    const startDate = resolveAuthoringScheduleDate(item.schedule);
    if (!startDate) {
      addInvalidRecurrenceIssue(
        state,
        item,
        sourceRowIds,
        inputValue,
        'authoring.recurrence_requires_start_date',
      );
      return;
    }
    if (parsed.rule.end?.mode === 'until' && parsed.rule.end.date < startDate) {
      addInvalidRecurrenceIssue(
        state,
        item,
        sourceRowIds,
        inputValue,
        'authoring.recurrence_until_before_start',
      );
      return;
    }
    item.recurrence = parsed.rule;
  });
}

const STRUCTURED_SHEET_SIGNAL_KEYS = new Set([
  'description',
  'completion',
  'date',
  'time',
  'timezone',
  'place',
  'durationMinutes',
  'repeat',
  'condition',
  'resources',
  'sources',
]);

function structuredSheetSignals(item: CanonicalAuthoringItem): Set<string> {
  const signals = new Set<string>();
  if (item.detail) signals.add('description');
  if (item.completion) signals.add('completion');
  if (item.schedule) {
    signals.add('date');
    if (item.schedule.time) signals.add('time');
    if (item.schedule.timezone) signals.add('timezone');
    if (item.schedule.durationMinutes != null) signals.add('durationMinutes');
    if (item.schedule.repeat) signals.add('repeat');
  }
  for (const property of item.properties) {
    const normalizedKey = property.key === 'duration'
      ? 'durationMinutes'
      : property.key === 'resource'
        ? 'resources'
        : property.key === 'source'
          ? 'sources'
        : property.key === 'relative_date'
          ? 'date'
          : property.key;
    if (property.value.trim() && STRUCTURED_SHEET_SIGNAL_KEYS.has(normalizedKey)) {
      signals.add(normalizedKey);
    }
  }
  if (item.resources.length > 0) signals.add('resources');
  if (item.sources.length > 0) signals.add('sources');
  return signals;
}

function hasStructuredSheetContract(items: CanonicalAuthoringItem[]): boolean {
  if (items.length < 2) return false;
  const occurrences = new Map<string, number>();
  for (const item of items) {
    for (const key of structuredSheetSignals(item)) {
      occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
    }
  }
  return [...occurrences.values()].filter((count) => count >= 2).length >= 2;
}

export function deriveAuthoringArtifactEligibility(
  canonical: AuthoringCanonicalContent,
): AuthoringArtifactEligibility {
  const included = canonical.items.filter((item) => item.included);
  const todoItems = included.filter((item) => (
    item.role === 'item' || item.role === 'completion'
  ));
  const calendarItems = included.filter((item) => Boolean(item.schedule));
  const sheetItems = included.filter((item) => (
    item.role === 'item' || item.role === 'completion'
  ));
  const memoItems = included;
  const hasTable = canonical.sourceRows.some((row) => row.rowType === 'table_row');
  const sheetEligible = hasTable
    ? sheetItems.length > 0
    : hasStructuredSheetContract(sheetItems);
  const primary: AuthoringArtifact = hasTable
    ? 'sheet'
    : calendarItems.length > 0 && calendarItems.length === todoItems.length
      ? 'calendar'
      : todoItems.length > 0
        ? 'todo'
        : 'memo';
  const candidateSecondary: AuthoringArtifact[] = primary === 'calendar'
    ? ['todo', 'memo']
    : primary === 'sheet'
      ? ['todo', 'memo']
      : primary === 'todo'
        ? calendarItems.length > 0
          ? ['calendar', 'memo']
          : ['memo', 'sheet']
        : ['todo', 'sheet'];
  const counts: Record<AuthoringArtifact, number> = {
    calendar: calendarItems.length,
    checklist: todoItems.length,
    todo: todoItems.length,
    sheet: sheetEligible ? sheetItems.length : 0,
    memo: memoItems.length,
  };
  const secondary = candidateSecondary
    .filter((artifact) => counts[artifact] > 0)
    .slice(0, 2);
  const loss: AuthoringArtifactEligibility['loss'] = {};
  const undated = included.filter((item) => !item.schedule);
  if (undated.length > 0) {
    loss.calendar = undated.map((item) => (
      `${item.itemId}:undated_item_preserved`
    ));
  }
  const nonCompletable = included.filter((item) => (
    item.role === 'resource' || item.role === 'guide' || item.role === 'caution'
  ));
  if (nonCompletable.length > 0) {
    loss.todo = nonCompletable.map((item) => (
      `${item.itemId}:non_completable_role_preserved`
    ));
    loss.checklist = [...loss.todo];
    loss.sheet = nonCompletable.map((item) => (
      `${item.itemId}:non_row_role_preserved`
    ));
  }
  canonical.flow.primaryArtifact = primary;
  canonical.flow.secondaryArtifacts = [...secondary];
  return {
    primary,
    secondary,
    counts,
    loss,
  };
}

export function parseTextAuthoringDocument(
  rawText: string,
  options: CreateTextAuthoringDocumentOptions = {},
): AuthoringParseResult {
  const fixtureVersion = options.fixtureVersion ?? 'authoring-fixture-v2';
  const normalized = normalizeAuthoringText(rawText);
  const documentId = options.documentId ?? stableAuthoringId(
    'authoring-document',
    fixtureVersion,
    normalized,
    options.sourceTitle,
    options.sourceUrl,
  );
  const flowId = stableAuthoringId('flow', documentId, fixtureVersion);
  const flow: CanonicalAuthoringFlow = {
    flowId,
    title: options.title ?? options.sourceTitle ?? '제목 없는 Flow',
    primaryArtifact: 'todo',
    secondaryArtifacts: [],
    stepIds: [],
    sourceRowIds: [],
  };
  const canonical: AuthoringCanonicalContent = {
    flow,
    steps: [],
    items: [],
    fields: [],
    memos: [],
    sourceRows: [],
    sourceRefs: [],
  };
  const state: MutableParseState = {
    documentId,
    fixtureVersion,
    options: { ...options, documentId },
    blocks: [],
    mappings: [],
    issues: [],
    canonical,
    explicitFlowTitle: false,
  };
  const longDocumentGate = resolveTextAuthoringP1LongDocumentTableGate({
    enabled: options.longDocumentTable?.enabled,
  });
  const longDocument = analyzeAuthoringLongDocument(rawText, {
    enabled: longDocumentGate.enabled,
    safeFallbackWhenDisabled:
      longDocumentGate.configured && !longDocumentGate.enabled,
    limits: options.longDocumentTable?.limits,
    documentId,
  });
  const safeDisabledFallbackRequested =
    longDocumentGate.configured && !longDocumentGate.enabled;
  if (
    longDocument.status === 'txt-only' &&
    (longDocument.featureEnabled ||
      (safeDisabledFallbackRequested &&
        longDocument.budget.exceeded.length > 0))
  ) {
    if (safeDisabledFallbackRequested) longDocument.fallbackActive = true;
    const artifactEligibility = deriveAuthoringArtifactEligibility(canonical);
    return {
      parseResultId: stableAuthoringId(
        'parse-result',
        documentId,
        fixtureVersion,
        TEXT_AUTHORING_PARSER_VERSION,
        normalized,
      ),
      parserVersion: TEXT_AUTHORING_PARSER_VERSION,
      fixtureVersion,
      blocks: [],
      mappings: [],
      issues: [],
      canonical,
      artifactEligibility,
      longDocument,
    };
  }
  const inputKinds = detectInputKinds(rawText);
  const safeDisabledTableFallback =
    safeDisabledFallbackRequested && inputKinds.includes('table');
  if (safeDisabledTableFallback) {
    longDocument.fallbackActive = true;
    const artifactEligibility = deriveAuthoringArtifactEligibility(canonical);
    return {
      parseResultId: stableAuthoringId(
        'parse-result',
        documentId,
        fixtureVersion,
        TEXT_AUTHORING_PARSER_VERSION,
        normalized,
      ),
      parserVersion: TEXT_AUTHORING_PARSER_VERSION,
      fixtureVersion,
      blocks: [],
      mappings: [],
      issues: [],
      canonical,
      artifactEligibility,
      longDocument,
    };
  }
  const lines = splitSourceLines(rawText);
  const structuredInput = (
    inputKinds.includes('markdown') || inputKinds.includes('table')
  );
  const urlOnlyInput = inputKinds.length === 1 && inputKinds[0] === 'url';
  let insideFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.raw.trim();
    if (!trimmed) continue;

    const preservedTable = longDocument.featureEnabled
      ? longDocument.tables.find((table) => (
          line.startOffset >= table.locator.startOffset &&
          line.startOffset < table.locator.endOffset
        ))
      : undefined;
    if (preservedTable) {
      preserveRawTableLine(state, line);
      continue;
    }

    if (/^<!--\s*flowme:[\s\S]*-->\s*$/u.test(trimmed)) {
      addFlowmeMetadataLine(state, line);
      continue;
    }
    if (/^(?:```|~~~)/u.test(trimmed)) {
      insideFence = !insideFence;
      addUnsupportedLine(state, line, 'authoring.code_fence_not_interpreted');
      continue;
    }
    if (insideFence) {
      addUnsupportedLine(state, line, 'authoring.code_fence_not_interpreted');
      continue;
    }
    if (/^(?:>|!\[|<[^>]+>|-{3,}$)/u.test(trimmed)) {
      addUnsupportedLine(state, line);
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/u.exec(trimmed);
    if (heading) {
      addFlowHeading(state, line, heading[2].trim(), heading[1].length);
      continue;
    }

    if (
      line.raw.includes('|')
      && Boolean(lines[index + 1])
      && isMarkdownTableSeparator(lines[index + 1].raw)
    ) {
      index = consumeTable(state, lines, index, 'markdown');
      continue;
    }
    if (line.raw.includes('\t')) {
      index = consumeTable(state, lines, index, 'tab');
      continue;
    }
    if (isCsvTableStart(lines, index)) {
      index = consumeTable(state, lines, index, 'csv');
      continue;
    }

    const flowAnchor = /^(?: {0,3})[-*+]\s+기준일\s*[:：]\s*(.*)$/u.exec(
      line.raw,
    );
    if (flowAnchor) {
      applyCanonicalFlowAnchor(state, line, flowAnchor[1]);
      continue;
    }

    const indentedBullet = /^([ \t]+)[-*+]\s+(.+)$/u.exec(line.raw);
    if (indentedBullet && indentationWidth(indentedBullet[1]) >= 2) {
      const bulletValue = indentedBullet[2].trim();
      const indentation = indentationWidth(indentedBullet[1]);
      const depth = Math.floor(indentation / 2);
      const nestedCheckbox = /^\[([ xX])\]\s+(.+)$/u.exec(bulletValue);
      if (nestedCheckbox) {
        if (!state.currentItem) {
          addUnsupportedLine(
            state,
            line,
            'authoring.nested_item_requires_parent',
            'missing_parent',
          );
        } else if (
          indentation !== (state.currentItem.nestingLevel + 1) * 2
        ) {
          addUnsupportedLine(
            state,
            line,
            'authoring.unsupported_nested_item',
            'unsupported_nested_item',
          );
        } else {
          addAuthoringSubcheck(
            state,
            line,
            state.currentItem,
            nestedCheckbox[2],
            nestedCheckbox[1].toLocaleLowerCase() === 'x',
            depth,
          );
        }
        continue;
      } else if (looksLikeUnknownProperty(bulletValue)) {
        const property = parseProperty(bulletValue);
        if (property && property.key !== 'anchor') {
          if (state.currentItem) {
            applyProperty(
              state,
              line,
              property,
              depth,
            );
          } else {
            addUnsupportedLine(
              state,
              line,
              'authoring.property_requires_item',
              'missing_parent',
            );
          }
        } else if (
          !property
          && state.currentItem
          && indentation === (state.currentItem.nestingLevel + 1) * 2
        ) {
          addUnknownItemPropertyDetail(
            state,
            line,
            state.currentItem,
            bulletValue,
            depth,
          );
        } else {
          addUnsupportedLine(
            state,
            line,
            property
              ? 'authoring.property_requires_item'
              : 'authoring.unknown_property',
            property ? 'missing_parent' : 'unknown_property',
          );
        }
        continue;
      }
    }

    const checkboxList = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.+)$/u.exec(line.raw);
    if (checkboxList) {
      const item = addItem(
        state,
        checkboxList[3].trim(),
        line.raw,
        rangeForLine(line),
        'check',
        Math.floor(checkboxList[1].replace(/\t/gu, '  ').length / 2),
        checkboxList[2].toLocaleLowerCase() === 'x',
      );
      const inlineSchedule = parseExplicitAuthoringSchedule(item.sourceTitle);
      if (inlineSchedule) {
        item.schedule = inlineSchedule.kind === 'relative' && state.anchorLabel
          ? { ...inlineSchedule, anchorLabel: state.anchorLabel }
          : inlineSchedule;
      }
      continue;
    }

    const list = /^(\s*)(?:[-*+]\s+|\d+[.)]\s+)(.+)$/u.exec(line.raw);
    if (list) {
      const item = addItem(
        state,
        list[2].trim(),
        line.raw,
        rangeForLine(line),
        'procedure',
        Math.floor(list[1].replace(/\t/gu, '  ').length / 2),
      );
      const inlineSchedule = parseExplicitAuthoringSchedule(item.sourceTitle);
      if (inlineSchedule) {
        item.schedule = inlineSchedule.kind === 'relative' && state.anchorLabel
          ? { ...inlineSchedule, anchorLabel: state.anchorLabel }
          : inlineSchedule;
      }
      continue;
    }

    const property = parseProperty(trimmed);
    if (property) {
      const depth = Math.floor(
        line.raw.slice(0, line.raw.indexOf(trimmed)).replace(/\t/gu, '  ').length / 2,
      );
      applyProperty(state, line, property, depth);
      continue;
    }
    if (structuredInput && looksLikeUnknownProperty(trimmed)) {
      addUnsupportedLine(
        state,
        line,
        'authoring.unknown_property',
        'unknown_property',
      );
      continue;
    }

    if (/^https?:\/\/\S+$/iu.test(trimmed)) {
      addBareUrl(state, line, urlOnlyInput);
      continue;
    }

    if (!importAssistEnabled(state)) {
      preservePlainLine(state, line);
      continue;
    }
    if (structuredInput) {
      addImplicitDetail(
        state,
        line,
        Math.floor(
          line.raw.slice(0, line.raw.indexOf(trimmed)).replace(/\t/gu, '  ').length / 2,
        ),
      );
      continue;
    }
    const nextPlainLine = lines[index + 1];
    if (
      !state.explicitFlowTitle
      && /^[^,，]{2,100}[.!?。]$/u.test(trimmed)
      && nextPlainLine
      && splitPlainFragments(
        nextPlainLine,
        nextPlainLine.raw.indexOf(nextPlainLine.raw.trim()),
        nextPlainLine.raw.trim(),
      ).length >= 2
    ) {
      consumePlainTopicOnlyLine(state, line);
      continue;
    }
    consumePlainLine(state, line);
  }

  finalizeItemRecurrences(state);
  const artifactEligibility = deriveAuthoringArtifactEligibility(canonical);
  return {
    parseResultId: stableAuthoringId(
      'parse-result',
      documentId,
      fixtureVersion,
      TEXT_AUTHORING_PARSER_VERSION,
      normalized,
    ),
    parserVersion: TEXT_AUTHORING_PARSER_VERSION,
    fixtureVersion,
    blocks: state.blocks,
    mappings: state.mappings,
    issues: state.issues,
    canonical,
    artifactEligibility,
    longDocument,
  };
}

export function createTextAuthoringDocument(
  rawText: string,
  options: CreateTextAuthoringDocumentOptions = {},
): TextAuthoringDocument {
  const fixtureVersion = options.fixtureVersion ?? 'authoring-fixture-v2';
  const documentId = options.documentId ?? stableAuthoringId(
    'authoring-document',
    fixtureVersion,
    normalizeAuthoringText(rawText),
    options.sourceTitle,
    options.sourceUrl,
  );
  const now = options.now ?? new Date().toISOString();
  const parseResult = parseTextAuthoringDocument(rawText, {
    ...options,
    fixtureVersion,
    documentId,
  });
  const revision: DraftRevision = {
    revisionId: stableAuthoringId(
      'revision',
      documentId,
      parseResult.parseResultId,
      'initial',
    ),
    kind: 'initial',
    operations: [],
    actorLane: options.ownership ?? 'personal',
    timestamp: now,
  };
  if (
    parseResult.longDocument?.featureEnabled ||
    parseResult.longDocument?.fallbackActive
  ) {
    parseResult.longDocument = withAuthoringLongDocumentTrace(
      parseResult.longDocument,
      { documentId, workingRevisionId: revision.revisionId },
    );
  }
  const inputKinds = detectInputKinds(rawText);
  const document: TextAuthoringDocument = {
    schemaVersion: TEXT_AUTHORING_SCHEMA_VERSION,
    documentId,
    ownership: options.ownership ?? 'personal',
    title: extractMarkdownFlowTitle(rawText)
      ?? parseResult.canonical.flow.title
      ?? options.title,
    rawText,
    inputKinds,
    primaryInputKind: primaryInputKind(inputKinds),
    ...(options.sourceTitle ? { sourceTitle: options.sourceTitle } : {}),
    ...(options.sourceUrl ? { sourceUrl: options.sourceUrl } : {}),
    parseResult,
    reviewGates: [],
    revision,
    revisionHistory: [revision],
    lifecycleStatus: 'draft',
    ...(options.longDocumentTable?.enabled !== undefined
      ? { features: { longDocumentTable: options.longDocumentTable.enabled } }
      : parseResult.longDocument?.featureEnabled
        ? { features: { longDocumentTable: true } }
        : {}),
    createdAt: now,
    updatedAt: now,
    uiState: {
      stage: 'input',
    },
  };
  ensureAuthoringSourceState(document, {
    capturedAt: now,
    externalVersion: options.sourceExternalVersion,
  });
  document.reviewGates = createAuthoringReviewGates(
    document,
    options.reviewRequirements,
  );
  document.lifecycleStatus = deriveAuthoringLifecycleStatus(document, 'draft');
  return document;
}

/**
 * Derives a runtime-only view for a persisted P1-C document. A disabled gate
 * removes structured table projections without mutating the stored document,
 * raw bytes, feature record, or revision history.
 */
export function buildTextAuthoringLongDocumentRuntimeView(
  document: TextAuthoringDocument,
  enabled: boolean,
): TextAuthoringDocument {
  const runtime = createTextAuthoringDocument(document.rawText, {
    documentId: document.documentId,
    fixtureVersion: document.parseResult.fixtureVersion,
    ownership: document.ownership,
    title: document.title,
    ...(document.sourceTitle ? { sourceTitle: document.sourceTitle } : {}),
    ...(document.sourceUrl ? { sourceUrl: document.sourceUrl } : {}),
    longDocumentTable: { enabled },
    now: document.createdAt,
  });
  if (!enabled && runtime.parseResult.longDocument) {
    runtime.parseResult.longDocument.fallbackActive = true;
  }
  runtime.revision = cloneAuthoringValue(document.revision);
  runtime.revisionHistory = cloneAuthoringValue(document.revisionHistory);
  runtime.createdAt = document.createdAt;
  runtime.updatedAt = document.updatedAt;
  runtime.lifecycleStatus = document.lifecycleStatus;
  runtime.features = cloneAuthoringValue(document.features);
  runtime.uiState = cloneAuthoringValue(document.uiState);
  return runtime;
}
