import { foldIcsContentLine } from './ics';
import { buildPersonalStructuralRecurrenceIcs } from './personal-structural-recurrence-ics';
import type { PersonalStructuralRepeat } from './personal-structural-recurrence';
import {
  PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES,
  PERSONAL_STRUCTURAL_MAX_DURATION_MINUTES,
  PERSONAL_STRUCTURAL_MIN_DURATION_MINUTES,
  isPersonalStructuralIanaTimeZone,
  type PersonalStructuralScheduleProjection,
} from './personal-structural-schedule';
import { normalizeCompletionCriterion } from './completion-criterion';

export type MyFlowStepRepeatPreset = '' | 'daily' | 'weekly' | 'monthly';

export type MyFlowPortableExecutionStatus =
  | 'pending'
  | 'done'
  | 'reopened'
  | 'skipped'
  | 'held';

export type MyFlowPortableResource = {
  label?: string;
  url: string;
};

export type MyFlowPortableStepExportInput = {
  flowTitle: string;
  stepId: string;
  stepTitle: string;
  sectionTitle?: string;
  date?: string;
  time?: string;
  durationMinutes?: number;
  timeZone?: string;
  stableEventIdentitySeed?: string;
  personalRecurrence?: PersonalStructuralRepeat;
  personalRecurrenceIdentityNamespace?: string;
  repeatPreset?: MyFlowStepRepeatPreset | string;
  location?: string;
  description?: string;
  /**
   * Canonical Item memo text. It may contain Markdown checklist rows such as
   * `- [ ]` and `- [x]`. When supplied, Calendar/Todo DESCRIPTION uses this
   * raw text instead of the legacy, presentation-oriented portable summary.
   */
  rawMemoText?: string;
  memo?: string;
  executionMemo?: string;
  executionStatus?: MyFlowPortableExecutionStatus;
  flowWarning?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  resources?: MyFlowPortableResource[];
  items?: string[];
  checkedItems?: Record<string, boolean>;
  completionCriteria?: string;
  caution?: string;
  generatedAt?: string;
};

export type MyFlowPortableScheduleFields = Pick<
  MyFlowPortableStepExportInput,
  'time' | 'durationMinutes' | 'timeZone' | 'stableEventIdentitySeed'
>;

/**
 * Adapts a committed personal-structure schedule to the portable Step export.
 * An all-day projection intentionally returns no timed fields, so an older
 * editor draft cannot leak a stale time back into Calendar or list exports.
 */
export function buildPersonalStructuralPortableScheduleFields(
  projection?: PersonalStructuralScheduleProjection,
): MyFlowPortableScheduleFields {
  if (!projection) return {};
  const identity = {
    stableEventIdentitySeed: projection.stableEventIdentitySeed,
  };
  if (projection.scheduleState !== 'timed' || !projection.startTime) {
    return identity;
  }
  return {
    ...identity,
    time: projection.startTime,
    ...(projection.durationMinutes !== undefined
      ? { durationMinutes: projection.durationMinutes }
      : {}),
    ...(projection.timeZone ? { timeZone: projection.timeZone } : {}),
  };
}

const repeatLabels: Record<string, string> = {
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
};

const repeatRules: Record<string, string> = {
  daily: 'FREQ=DAILY',
  weekly: 'FREQ=WEEKLY',
  monthly: 'FREQ=MONTHLY',
};

function clean(value?: string): string {
  return (value ?? '').trim();
}

function normalizeRawMemoText(value?: string): string {
  return (value ?? '')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .trim();
}

function appendCompletionCriterion(lines: string[], value?: string): void {
  const criterion = normalizeCompletionCriterion(value);
  if (!criterion) return;
  const [first, ...rest] = criterion.split('\n');
  lines.push('', `완료 기준: ${first}`);
  rest.forEach((line) => lines.push(`  ${line}`));
}

function appendLabeledMultiline(lines: string[], label: string, value?: string): void {
  const normalized = (value ?? '')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .trim();
  if (!normalized) return;
  const [first, ...rest] = normalized.split('\n');
  lines.push('', `${label}: ${first}`);
  rest.forEach((line) => lines.push(`  ${line}`));
}

function executionStatusLabel(status?: MyFlowPortableExecutionStatus): string {
  if (status === 'done') return '완료';
  if (status === 'skipped') return '스킵';
  if (status === 'held') return '보류';
  if (status === 'reopened') return '다시 진행';
  return status === 'pending' ? '미완료' : '';
}

function getPortableResources(input: MyFlowPortableStepExportInput): MyFlowPortableResource[] {
  const seen = new Set<string>();
  return (input.resources ?? []).flatMap((resource) => {
    const label = clean(resource.label);
    const url = clean(resource.url);
    if (!url) return [];
    const key = `${label}\u0000${url}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ ...(label ? { label } : {}), url }];
  });
}

function compactDate(date: string): string {
  return date.replaceAll('-', '');
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(/\r?\n/g, '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');
}

function formatTimedIcsDate(date: string, time: string): string {
  return `${compactDate(date)}T${time.replace(':', '')}00`;
}

function addDaysToPlainDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(year, month - 1, day);
  value.setDate(value.getDate() + days);
  const yyyy = String(value.getFullYear()).padStart(4, '0');
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addMinutes(date: string, time: string, minutes: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, hour, minute + minutes));
  const yyyy = String(value.getUTCFullYear()).padStart(4, '0');
  const mm = String(value.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(value.getUTCDate()).padStart(2, '0');
  const hh = String(value.getUTCHours()).padStart(2, '0');
  const min = String(value.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}00`;
}

function normalizeDurationMinutes(value?: number): number {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= PERSONAL_STRUCTURAL_MIN_DURATION_MINUTES &&
    value <= PERSONAL_STRUCTURAL_MAX_DURATION_MINUTES
    ? value
    : PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES;
}

function formatDurationLabel(value?: number): string {
  if (!value) return '';
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (!hours) return `${minutes}분`;
  if (!minutes) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

function getRepeatLabel(repeatPreset?: string): string {
  const value = clean(repeatPreset);
  return repeatLabels[value] ?? value;
}

function formatSchedule(date?: string, time?: string, durationMinutes?: number): string {
  const dateTime = [clean(date), clean(time)].filter(Boolean).join(' ');
  const duration = time && durationMinutes
    ? `예상 ${formatDurationLabel(durationMinutes)}`
    : '';
  return [dateTime, duration].filter(Boolean).join(' · ');
}

function formatChecklistItems(input: MyFlowPortableStepExportInput): string[] {
  const items = (input.items ?? []).map(clean).filter(Boolean);
  if (items.length === 0) {
    return [`- [${input.executionStatus === 'done' ? 'x' : ' '}] ${clean(input.stepTitle) || '할 일'}`];
  }
  return items.map((item, index) => `- [${input.checkedItems?.[String(index)] ? 'x' : ' '}] ${item}`);
}

function formatChildChecklistItems(input: MyFlowPortableStepExportInput): string[] {
  return (input.items ?? [])
    .map(clean)
    .filter(Boolean)
    .map((item, index) => `- [${input.checkedItems?.[String(index)] ? 'x' : ' '}] ${item}`);
}

function hasMarkdownChecklistRow(value: string): boolean {
  return value.split('\n').some((line) => /^\s*-\s*\[[ xX]\]\s+\S/u.test(line));
}

/**
 * Builds the canonical DESCRIPTION body shared by VEVENT and VTODO.
 *
 * The memo remains one raw TXT value. If that value already contains
 * Markdown checklist rows, the legacy `items` projection is deliberately not
 * appended, preventing one checklist entry from becoming a second calendar
 * or Todo component (or a duplicated DESCRIPTION row).
 */
export function buildMyFlowItemDescriptionText(
  input: MyFlowPortableStepExportInput,
): string {
  const rawMemo = normalizeRawMemoText(input.rawMemoText ?? input.memo);
  const sections: string[] = [];
  if (rawMemo) sections.push(rawMemo);

  if (!hasMarkdownChecklistRow(rawMemo)) {
    const checklist = formatChildChecklistItems(input);
    if (checklist.length > 0) sections.push(checklist.join('\n'));
  }

  const criterion = normalizeCompletionCriterion(input.completionCriteria);
  if (criterion) sections.push(`완료 기준: ${criterion}`);
  return sections.join('\n\n');
}

function escapeTsvCell(value?: string): string {
  return clean(value).replaceAll(/\s*\r?\n\s*/g, ' / ').replaceAll('\t', ' ');
}

export function canBuildMyFlowStepIcs(input: MyFlowPortableStepExportInput): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(clean(input.date));
}

export function buildMyFlowStepChecklistText(input: MyFlowPortableStepExportInput): string {
  const title = clean(input.stepTitle) || '할 일';
  const flowTitle = clean(input.flowTitle);
  const schedule = formatSchedule(input.date, input.time, input.durationMinutes);
  const location = clean(input.location);
  const sourceLabel = clean(input.sourceLabel);
  const sourceUrl = clean(input.sourceUrl);
  const executionStatus = executionStatusLabel(input.executionStatus);
  const resources = getPortableResources(input);
  const lines = [title];

  if (flowTitle) lines.push(`계획: ${flowTitle}`);
  if (schedule) lines.push(`일정: ${schedule}`);
  if (location) lines.push(`장소: ${location}`);
  appendLabeledMultiline(lines, '설명', input.description);
  if (executionStatus) lines.push(`실행 상태: ${executionStatus}`);
  lines.push('', '체크리스트:', ...formatChecklistItems(input));
  appendCompletionCriterion(lines, input.completionCriteria);
  appendLabeledMultiline(lines, '개인 메모', input.memo);
  appendLabeledMultiline(lines, '실행 메모', input.executionMemo);
  appendLabeledMultiline(lines, '주의', input.caution);
  appendLabeledMultiline(lines, '계획 주의', input.flowWarning);
  if (resources.length > 0) {
    lines.push('');
    resources.forEach((resource) => {
      lines.push(`자료: ${[resource.label, resource.url].filter(Boolean).join(' - ')}`);
    });
  }
  if (sourceLabel || sourceUrl) lines.push('', `원문: ${[sourceLabel, sourceUrl].filter(Boolean).join(' ')}`);

  return `${lines.join('\n')}\n`;
}

export function buildMyFlowStepSheetTsv(input: MyFlowPortableStepExportInput): string {
  const checklist = formatChecklistItems(input).map((line) => line.replace(/^- /, '')).join(' | ');
  const source = [clean(input.sourceLabel), clean(input.sourceUrl)].filter(Boolean).join(' ');
  const completionCriteria = normalizeCompletionCriterion(input.completionCriteria) ?? '';
  const includeDuration = input.durationMinutes !== undefined;
  const header = ['계획', '할 일', '구간', '날짜', '시간', ...(includeDuration ? ['예상 시간'] : []), '반복', '장소', '체크리스트', '메모', '완료 기준', '주의', '원문'];
  const row = [
    input.flowTitle,
    input.stepTitle,
    input.sectionTitle,
    input.date,
    input.time,
    ...(includeDuration ? [formatDurationLabel(input.durationMinutes)] : []),
    getRepeatLabel(input.repeatPreset),
    input.location,
    checklist,
    input.memo,
    completionCriteria,
    input.caution,
    source,
  ].map(escapeTsvCell);

  return `${header.join('\t')}\n${row.join('\t')}\n`;
}

export function buildMyFlowStepPortableText(input: MyFlowPortableStepExportInput): string {
  const title = clean(input.stepTitle) || '할 일';
  const flowTitle = clean(input.flowTitle);
  const sectionTitle = clean(input.sectionTitle);
  const date = clean(input.date);
  const time = clean(input.time);
  const repeatPreset = clean(input.repeatPreset);
  const location = clean(input.location);
  const description = clean(input.description);
  const memo = clean(input.memo);
  const executionMemo = clean(input.executionMemo);
  const executionStatus = executionStatusLabel(input.executionStatus);
  const completionCriteria = normalizeCompletionCriterion(input.completionCriteria) ?? '';
  const caution = clean(input.caution);
  const flowWarning = clean(input.flowWarning);
  const sourceLabel = clean(input.sourceLabel);
  const sourceUrl = clean(input.sourceUrl);
  const resources = getPortableResources(input);
  const items = (input.items ?? []).map(clean).filter(Boolean);

  const lines = [title];
  if (flowTitle) lines.push(`계획: ${flowTitle}`);
  if (sectionTitle) lines.push(`구간: ${sectionTitle}`);
  if (date || time) lines.push(`일정: ${formatSchedule(date, time, input.durationMinutes)}`);
  if (repeatPreset && repeatLabels[repeatPreset]) lines.push(`반복: ${getRepeatLabel(repeatPreset)}`);
  if (location) lines.push(`장소: ${location}`);
  if (description) appendLabeledMultiline(lines, '설명', description);
  if (executionStatus) lines.push(`실행 상태: ${executionStatus}`);
  if (items.length > 0) {
    lines.push('', '체크:');
    items.forEach((item, index) => {
      lines.push(`- [${input.checkedItems?.[String(index)] ? 'x' : ' '}] ${item}`);
    });
  }
  if (completionCriteria) lines.push('', `완료 기준: ${completionCriteria}`);
  if (memo) appendLabeledMultiline(lines, '개인 메모', memo);
  if (executionMemo) appendLabeledMultiline(lines, '실행 메모', executionMemo);
  if (caution) appendLabeledMultiline(lines, '주의', caution);
  if (flowWarning) appendLabeledMultiline(lines, '계획 주의', flowWarning);
  if (resources.length > 0) {
    lines.push('');
    resources.forEach((resource) => {
      lines.push(`자료: ${[resource.label, resource.url].filter(Boolean).join(' - ')}`);
    });
  }
  if (sourceLabel || sourceUrl) lines.push('', `원문: ${[sourceLabel, sourceUrl].filter(Boolean).join(' ')}`);

  return `${lines.join('\n')}\n`;
}

export function buildMyFlowStepIcs(input: MyFlowPortableStepExportInput): string {
  if (!canBuildMyFlowStepIcs(input)) {
    throw new Error('A yyyy-mm-dd date is required to build a Step calendar export.');
  }

  const date = clean(input.date);
  const time = clean(input.time);
  const repeatPreset = clean(input.repeatPreset);
  if (input.personalRecurrence) {
    return buildPersonalStructuralRecurrenceIcs({
      identityNamespace:
        clean(input.personalRecurrenceIdentityNamespace) ||
        clean(input.stableEventIdentitySeed) ||
        clean(input.flowTitle) ||
        'personal-flow',
      itemId: clean(input.stableEventIdentitySeed) || clean(input.stepId) || 'personal-item',
      title: clean(input.stepTitle) || '할 일',
      description: input.rawMemoText !== undefined
        ? buildMyFlowItemDescriptionText(input)
        : buildMyFlowStepPortableText(input),
      date,
      ...(time ? { time } : {}),
      ...(time && input.durationMinutes !== undefined
        ? { durationMinutes: input.durationMinutes }
        : {}),
      ...(time && clean(input.timeZone) ? { timeZone: clean(input.timeZone) } : {}),
      repeat: input.personalRecurrence,
      location: input.location,
      sourceUrl: input.sourceUrl,
      generatedAt: input.generatedAt,
      status: input.executionStatus === 'done'
        ? 'CONFIRMED'
        : input.executionStatus === 'skipped' || input.executionStatus === 'held'
          ? 'CANCELLED'
          : 'TENTATIVE',
    }).ics;
  }
  const generatedDate = input.generatedAt && Number.isFinite(Date.parse(input.generatedAt))
    ? new Date(input.generatedAt)
    : new Date();
  const nowStamp = generatedDate.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FLOW MVP//My Flow Step Export//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(clean(input.stableEventIdentitySeed)
      ? `${clean(input.stableEventIdentitySeed)}@flowme.local`
      : `${input.stepId}-${date}-${time || 'all-day'}@flowme.local`)}`,
    `DTSTAMP:${nowStamp}`,
  ];

  if (time) {
    const durationMinutes = normalizeDurationMinutes(input.durationMinutes);
    const timeZone = isPersonalStructuralIanaTimeZone(input.timeZone)
      ? input.timeZone.trim()
      : '';
    const parameter = timeZone ? `;TZID=${timeZone}` : '';
    lines.push(
      `DTSTART${parameter}:${formatTimedIcsDate(date, time)}`,
      `DTEND${parameter}:${addMinutes(date, time, durationMinutes)}`,
    );
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(date)}`, `DTEND;VALUE=DATE:${compactDate(addDaysToPlainDate(date, 1))}`);
  }

  lines.push(
    `SUMMARY:${escapeIcsText(clean(input.stepTitle) || '할 일')}`,
    `DESCRIPTION:${escapeIcsText(input.rawMemoText !== undefined
      ? buildMyFlowItemDescriptionText(input)
      : buildMyFlowStepPortableText(input))}`,
    `STATUS:${input.executionStatus === 'done'
      ? 'CONFIRMED'
      : input.executionStatus === 'skipped' || input.executionStatus === 'held'
        ? 'CANCELLED'
        : 'TENTATIVE'}`,
    'TRANSP:TRANSPARENT',
  );

  const location = clean(input.location);
  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`);
  if (repeatRules[repeatPreset]) lines.push(`RRULE:${repeatRules[repeatPreset]}`);
  if (clean(input.sourceUrl)) lines.push(`URL:${clean(input.sourceUrl)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return `${lines.map(foldIcsContentLine).join('\r\n')}\r\n`;
}

function extractIcsEventComponents(ics: string): string[][] {
  const components: string[][] = [];
  let current: string[] | undefined;
  ics.split(/\r?\n/u).forEach((line) => {
    if (line === 'BEGIN:VEVENT') {
      current = [line];
      return;
    }
    if (!current) return;
    current.push(line);
    if (line === 'END:VEVENT') {
      components.push(current);
      current = undefined;
    }
  });
  return components;
}

export function buildMyFlowMultiStepIcs(inputs: MyFlowPortableStepExportInput[]): string {
  const seenInputs = new Set<string>();
  const eventComponents = inputs.flatMap((input) => {
    if (!canBuildMyFlowStepIcs(input)) return [];
    const identity = clean(input.stableEventIdentitySeed) || clean(input.stepId);
    if (!identity || seenInputs.has(identity)) return [];
    seenInputs.add(identity);
    return extractIcsEventComponents(buildMyFlowStepIcs(input));
  });

  return `${[
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FlowMe//Scoped Flow Export//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...eventComponents.flat(),
    'END:VCALENDAR',
  ].join('\r\n')}\r\n`;
}

export function canBuildMyFlowStepVtodo(input: MyFlowPortableStepExportInput): boolean {
  return Boolean(clean(input.stableEventIdentitySeed) || clean(input.stepId));
}

function getMyFlowPortableIdentity(input: MyFlowPortableStepExportInput): string {
  return clean(input.stableEventIdentitySeed) || clean(input.stepId);
}

function getMyFlowPortableGeneratedStamp(input: MyFlowPortableStepExportInput): string {
  const generatedDate = input.generatedAt && Number.isFinite(Date.parse(input.generatedAt))
    ? new Date(input.generatedAt)
    : new Date();
  return generatedDate.toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Creates one RFC 5545 VTODO for one canonical Item. Checklist rows remain
 * ordinary DESCRIPTION text and therefore never become sibling VTODOs.
 */
export function buildMyFlowStepVtodo(input: MyFlowPortableStepExportInput): string {
  if (!canBuildMyFlowStepVtodo(input)) {
    throw new Error('A stable Step identity is required to build a VTODO export.');
  }

  const identity = getMyFlowPortableIdentity(input);
  const date = clean(input.date);
  const time = clean(input.time);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FLOW MVP//My Flow Todo Export//KO',
    'CALSCALE:GREGORIAN',
    'BEGIN:VTODO',
    `UID:${escapeIcsText(`${identity}@flowme.local`)}`,
    `DTSTAMP:${getMyFlowPortableGeneratedStamp(input)}`,
  ];

  if (/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    if (/^\d{2}:\d{2}$/u.test(time)) {
      const timeZone = isPersonalStructuralIanaTimeZone(input.timeZone)
        ? input.timeZone.trim()
        : '';
      const parameter = timeZone ? `;TZID=${timeZone}` : '';
      lines.push(`DUE${parameter}:${formatTimedIcsDate(date, time)}`);
    } else {
      lines.push(`DUE;VALUE=DATE:${compactDate(date)}`);
    }
  }

  lines.push(`SUMMARY:${escapeIcsText(clean(input.stepTitle) || '할 일')}`);
  const description = buildMyFlowItemDescriptionText(input);
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  lines.push(
    `STATUS:${input.executionStatus === 'done' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
    `PERCENT-COMPLETE:${input.executionStatus === 'done' ? '100' : '0'}`,
  );

  if (repeatRules[clean(input.repeatPreset)]) {
    lines.push(`RRULE:${repeatRules[clean(input.repeatPreset)]}`);
  }
  if (clean(input.sourceUrl)) lines.push(`URL:${clean(input.sourceUrl)}`);
  lines.push('END:VTODO', 'END:VCALENDAR');
  return `${lines.map(foldIcsContentLine).join('\r\n')}\r\n`;
}

function extractIcsTodoComponents(ics: string): string[][] {
  const components: string[][] = [];
  let current: string[] | undefined;
  ics.split(/\r?\n/u).forEach((line) => {
    if (line === 'BEGIN:VTODO') {
      current = [line];
      return;
    }
    if (!current) return;
    current.push(line);
    if (line === 'END:VTODO') {
      components.push(current);
      current = undefined;
    }
  });
  return components;
}

export function buildMyFlowMultiStepVtodo(inputs: MyFlowPortableStepExportInput[]): string {
  const seenInputs = new Set<string>();
  const todoComponents = inputs.flatMap((input) => {
    if (!canBuildMyFlowStepVtodo(input)) return [];
    const identity = getMyFlowPortableIdentity(input);
    if (seenInputs.has(identity)) return [];
    seenInputs.add(identity);
    return extractIcsTodoComponents(buildMyFlowStepVtodo(input));
  });

  return `${[
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FlowMe//Scoped Todo Export//KO',
    'CALSCALE:GREGORIAN',
    ...todoComponents.flat(),
    'END:VCALENDAR',
  ].join('\r\n')}\r\n`;
}
