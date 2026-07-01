export type MyFlowStepRepeatPreset = '' | 'daily' | 'weekly' | 'monthly';

export type MyFlowPortableStepExportInput = {
  flowTitle: string;
  stepId: string;
  stepTitle: string;
  sectionTitle?: string;
  date?: string;
  time?: string;
  repeatPreset?: MyFlowStepRepeatPreset | string;
  location?: string;
  memo?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  items?: string[];
  checkedItems?: Record<string, boolean>;
  completionCriteria?: string;
  caution?: string;
};

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

function foldIcsLine(line: string): string {
  const limit = 74;
  if (line.length <= limit) return line;
  const chunks = [];
  let cursor = line;
  while (cursor.length > limit) {
    chunks.push(cursor.slice(0, limit));
    cursor = ` ${cursor.slice(limit)}`;
  }
  chunks.push(cursor);
  return chunks.join('\r\n');
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
  const value = new Date(`${date}T${time}:00`);
  value.setMinutes(value.getMinutes() + minutes);
  const yyyy = String(value.getFullYear()).padStart(4, '0');
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  const hh = String(value.getHours()).padStart(2, '0');
  const min = String(value.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}00`;
}

export function canBuildMyFlowStepIcs(input: MyFlowPortableStepExportInput): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(clean(input.date));
}

export function buildMyFlowStepPortableText(input: MyFlowPortableStepExportInput): string {
  const title = clean(input.stepTitle) || 'Flow Step';
  const flowTitle = clean(input.flowTitle);
  const sectionTitle = clean(input.sectionTitle);
  const date = clean(input.date);
  const time = clean(input.time);
  const repeatPreset = clean(input.repeatPreset);
  const location = clean(input.location);
  const memo = clean(input.memo);
  const completionCriteria = clean(input.completionCriteria);
  const caution = clean(input.caution);
  const sourceLabel = clean(input.sourceLabel);
  const sourceUrl = clean(input.sourceUrl);
  const items = (input.items ?? []).map(clean).filter(Boolean);

  const lines = [title];
  if (flowTitle) lines.push(`Flow: ${flowTitle}`);
  if (sectionTitle) lines.push(`구간: ${sectionTitle}`);
  if (date || time) lines.push(`일정: ${[date, time].filter(Boolean).join(' ')}`);
  if (repeatPreset && repeatLabels[repeatPreset]) lines.push(`반복: ${repeatLabels[repeatPreset]}`);
  if (location) lines.push(`장소: ${location}`);
  if (items.length > 0) {
    lines.push('', '체크:');
    items.forEach((item, index) => {
      lines.push(`- [${input.checkedItems?.[String(index)] ? 'x' : ' '}] ${item}`);
    });
  }
  if (completionCriteria) lines.push('', `완료 기준: ${completionCriteria}`);
  if (memo) lines.push('', `메모: ${memo}`);
  if (caution) lines.push('', `주의: ${caution}`);
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
  const nowStamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FLOW MVP//My Flow Step Export//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(`${input.stepId}-${date}-${time || 'all-day'}@flowme.local`)}`,
    `DTSTAMP:${nowStamp}`,
  ];

  if (time) {
    lines.push(`DTSTART:${formatTimedIcsDate(date, time)}`, `DTEND:${addMinutes(date, time, 30)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(date)}`, `DTEND;VALUE=DATE:${compactDate(addDaysToPlainDate(date, 1))}`);
  }

  lines.push(
    `SUMMARY:${escapeIcsText(clean(input.stepTitle) || 'Flow Step')}`,
    `DESCRIPTION:${escapeIcsText(buildMyFlowStepPortableText(input))}`,
  );

  const location = clean(input.location);
  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`);
  if (repeatRules[repeatPreset]) lines.push(`RRULE:${repeatRules[repeatPreset]}`);
  if (clean(input.sourceUrl)) lines.push(`URL:${clean(input.sourceUrl)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
