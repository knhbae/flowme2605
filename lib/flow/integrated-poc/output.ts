import { foldIcsContentLine } from '../ics';
import { canonicalizeFlowSourceUrl } from '../url-first-lookup';
import type { ProgramPublicItem, ProgramPublicVersion } from './contract';
import { programOrdinaryTimingLabel } from './public-ordinary-time';
import { programLocation } from './navigation';
import { programPublicOutputBase, resolveProgramPublicOutputReturn } from './public-output-return';
import { programDate, programIdentifier, programShape, programString, safeProgramUrl, validateProgramPublicItem } from './program-data';
import { inspectProgramOutputSeries, isProgramOutputRecurrenceWindow, validProgramOutputRecurrenceStarts, programCalendarDateTime,
  type ProgramOutputRecurrenceWindow, type ProgramOutputSeries } from './public-output-recurrence';

export type ProgramOutputFormat = 'txt' | 'csv' | 'ics';
export type ProgramOutputFailure = 'invalid-version' | 'invalid-selection' | 'duplicate-item' | 'unknown-item'
  | 'no-items' | 'invalid-date' | 'missing-anchor' | 'invalid-format' | 'invalid-now' | 'no-dated-items' | 'invalid-return-context'
  | 'missing-recurrence-window' | 'invalid-recurrence-window' | 'invalid-recurrence-start' | 'missing-recurrence-start' | 'empty-recurrence-window';
export type ProgramOutput =
  | { ok: true; filename: string; mime: string; payload: string; itemIds: string[]; undatedItemIds: string[]; series?: ProgramOutputSeries[] }
  | { ok: false; reason: ProgramOutputFailure };
export type ProgramUrlClassification =
  | { kind: 'invalid'; reason: 'invalid-url' | 'unsafe-scheme' | 'credentials' | 'unsafe-host' | 'sensitive-parameters' | 'unsupported-port' }
  | { kind: 'known-source'; url: string; version: ProgramPublicVersion }
  | { kind: 'unsupported'; url: string };

const encoder = new TextEncoder();
const normalizedLines = (text: string) => text.replace(/\r\n|\r/g, '\n');
const compactDate = (date: string) => date.replaceAll('-', '');

function nextDate(date: string, days: number): string | undefined {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  const value = result.toISOString().slice(0, 10);
  return programDate(value) ? value : undefined;
}

function timestamp(now: string | Date): string | undefined {
  if (now instanceof Date) return Number.isFinite(now.getTime()) && now.getUTCFullYear() >= 0 && now.getUTCFullYear() <= 9999
    ? now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z') : undefined;
  if (typeof now !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(now)
    || !programDate(now.slice(0, 10))) return undefined;
  const date = new Date(now);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== now.slice(0, 19)) return undefined;
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function validVersion(value: unknown): value is ProgramPublicVersion {
  if (!programShape(value, ['id', 'flowId', 'number', 'parentVersionId', 'title', 'summary', 'items', 'source', 'createdBy', 'createdAt'])) return false;
  return programIdentifier(value.id) && programIdentifier(value.flowId) && programIdentifier(value.createdBy)
    && (value.parentVersionId === null || programIdentifier(value.parentVersionId))
    && Number.isSafeInteger(value.number) && (value.number as number) > 0
    && programString(value.title, 240, true) && programString(value.summary)
    && Array.isArray(value.items) && value.items.length <= 1200 && value.items.every(validateProgramPublicItem)
    && new Set(value.items.map(item => item.id)).size === value.items.length
    && programShape(value.source, ['kind', 'label', 'url', 'checkedAt'])
    && ['repository-source', 'user-text', 'simulated-example'].includes(value.source.kind as string)
    && programString(value.source.label, 500, true) && (value.source.url === null || safeProgramUrl(value.source.url))
    && (value.source.checkedAt === null || programDate(value.source.checkedAt)) && timestamp(value.createdAt as string) !== undefined
    && [value.title, value.summary, value.source.label,
      ...value.items.flatMap(item => [item.title, item.description, item.completionCriteria, ...item.subchecks.map(check => check.title)])]
      .every(text => typeof text === 'string' && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)
        && Array.from(text).every(character => character.length !== 1 || character.charCodeAt(0) < 0xd800 || character.charCodeAt(0) > 0xdfff));
}

function safeFilename(title: string, format: ProgramOutputFormat): string {
  const value = Array.from(title.normalize('NFKC').replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, '-').replace(/^[. -]+|[. -]+$/g, '')).slice(0, 70).join('');
  return `flowme-${value || 'output'}.${format}`;
}

function csvCell(value: string): string {
  const original = normalizedLines(value);
  // Human spreadsheet output: mitigate leading formula/control characters,
  // including full-width variants, while retaining the original text after the
  // marker. This is not a universal safe re-save/import promise (OWASP).
  const dangerous = /^[\s\uFEFF]*[=+\-@＝＋－＠]/u.test(original) || /^[\t\r\n]/.test(original);
  return `"${(dangerous ? `\t${original}` : original).replaceAll('"', '""')}"`;
}

function icsText(text: string): string {
  return normalizedLines(text).replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
}

function foldLine(line: string): string {
  const folded = foldIcsContentLine(line);
  if (folded.split('\r\n').every(part => encoder.encode(part).length <= 75)
    && folded.replace(/\r\n[ \t]/g, '') === line) return folded;
  // The shared legacy helper preserves trailing whitespace by carrying it.
  // An unusually long whitespace run can exceed its budget; strict fallback
  // folds by Unicode code point while preserving every whitespace byte.
  let physical = ''; const parts: string[] = [];
  for (const character of line) {
    if (encoder.encode(physical + character).length > 75) { parts.push(physical); physical = ' '; }
    physical += character;
  }
  parts.push(physical);
  return parts.join('\r\n');
}

function itemDescription(version: ProgramPublicVersion, item: ProgramPublicItem): string {
  return [version.title, `판본: ${version.number}`, version.summary, item.description,
    item.completionCriteria ? `완료 기준: ${item.completionCriteria}` : '',
    ...item.subchecks.map(check => `하위 확인: ${check.title}`),
    `출처: ${version.source.label}`, version.source.url ?? '',
    item.sourceUrl && item.sourceUrl !== version.source.url ? `항목 출처: ${item.sourceUrl}` : ''].filter(Boolean).join('\n');
}

/** Pure transient output: no personal copy, document, storage, download or network side effects. */
export function makeProgramOutput(version: ProgramPublicVersion, options: {
  selectedItemIds: readonly string[]; anchor?: string | null; format: ProgramOutputFormat;
  recurrenceWindow?: ProgramOutputRecurrenceWindow; recurrenceStarts?: Record<string, string>;
  returnContext?: { baseUrl: string };
}, now: string | Date): ProgramOutput {
  try {
    if (!options || !['txt', 'csv', 'ics'].includes(options.format)) return { ok: false, reason: 'invalid-format' };
    if (!validVersion(version)) return { ok: false, reason: 'invalid-version' };
    if (!Array.isArray(options.selectedItemIds) || !options.selectedItemIds.every(programIdentifier)) return { ok: false, reason: 'invalid-selection' };
    if (!options.selectedItemIds.length) return { ok: false, reason: 'no-items' };
    if (new Set(options.selectedItemIds).size !== options.selectedItemIds.length) return { ok: false, reason: 'duplicate-item' };
    if (options.selectedItemIds.some(id => !version.items.some(item => item.id === id))) return { ok: false, reason: 'unknown-item' };
    if (options.anchor !== undefined && options.anchor !== null && !programDate(options.anchor)) return { ok: false, reason: 'invalid-date' };
    if (options.recurrenceWindow !== undefined && !isProgramOutputRecurrenceWindow(options.recurrenceWindow)) return { ok: false, reason: 'invalid-recurrence-window' };
    if (options.recurrenceStarts !== undefined && !validProgramOutputRecurrenceStarts(options.recurrenceStarts, version.items)) return { ok: false, reason: 'invalid-recurrence-start' };
    const stamp = timestamp(now); if (!stamp) return { ok: false, reason: 'invalid-now' };
    // Selection is membership, not a command to reorder the source.
    const selected = new Set(options.selectedItemIds);
    const rows: { item: ProgramPublicItem; date: string | null; series?: ProgramOutputSeries }[] = [];
    for (const item of version.items.filter(item => selected.has(item.id))) {
      if (item.schedule.kind === 'recurring') {
        if (item.schedule.start.kind === 'relative' && !options.anchor) return { ok: false, reason: 'missing-anchor' };
        const series = inspectProgramOutputSeries({ ...item, schedule: item.schedule }, options.anchor ?? null, options.recurrenceStarts?.[item.id], options.recurrenceWindow);
        if (!series) return { ok: false, reason: 'invalid-date' };
        if (options.format === 'ics') {
          if (!series.startDate) return { ok: false, reason: 'missing-recurrence-start' };
          if (!options.recurrenceWindow) return { ok: false, reason: 'missing-recurrence-window' };
          if (!series.dates.length) return { ok: false, reason: 'empty-recurrence-window' };
        }
        rows.push({ item, date: series.startDate, series }); continue;
      }
      if (item.schedule.kind === 'relative' && !options.anchor) return { ok: false, reason: 'missing-anchor' };
      const date = item.schedule.kind === 'fixed' ? item.schedule.date : item.schedule.kind === 'relative' ? nextDate(options.anchor!, item.schedule.days) : null;
      if (date === undefined) return { ok: false, reason: 'invalid-date' };
      rows.push({ item, date });
    }
    const undatedItemIds = rows.filter(row => row.date === null).map(row => row.item.id);
    const series = rows.flatMap(row => row.series ? [row.series] : []);
    const returnLinks = new Map<string, string>();
    if (options.returnContext !== undefined) {
      const base = programShape(options.returnContext, ['baseUrl']) && typeof options.returnContext.baseUrl === 'string' ? programPublicOutputBase(options.returnContext.baseUrl) : null;
      if (!base) return { ok: false, reason: 'invalid-return-context' };
      const detail = { selectedItemIds: [...options.selectedItemIds], anchor: options.anchor ?? '', format: options.format,
        ...(options.recurrenceWindow ? { recurrenceWindow: options.recurrenceWindow } : {}), ...(options.recurrenceStarts ? { recurrenceStarts: options.recurrenceStarts } : {}) };
      for (const {item} of rows) {
        const token = JSON.stringify({version:1, origin:new URL(base).origin, flowId:version.flowId, versionId:version.id, itemId:item.id, detail});
        if (!resolveProgramPublicOutputReturn(token, base, version, item.id)) return { ok:false, reason:'invalid-return-context' };
        const hash = programLocation({view:'flow', id:version.flowId, versionId:version.id, itemId:item.id, publicOutputReturn:token});
        if (hash.length > 35000 || hash === '#flowme/space') return {ok:false, reason:'invalid-return-context'};
        returnLinks.set(item.id, base + hash);
      }
    }
    const hasOrdinaryTiming = rows.some(row => row.item.schedule.kind !== 'recurring' && !!programOrdinaryTimingLabel(row.item.schedule.timing));
    const result = (payload: string, itemIds: string[], mime: string): ProgramOutput => ({ ok: true, filename: safeFilename(version.title, options.format), mime, payload, itemIds, undatedItemIds,
      ...(series.length ? { series } : {}) });
    if (options.format === 'txt') {
      const lines = [version.title, `판본: ${version.number}`, version.summary, `출처: ${version.source.label}`,
        ...(version.source.url ? [version.source.url] : []), '',
        ...rows.flatMap(({ item, date, series }, index) => [`${index + 1}. ${item.title}`, `날짜: ${date ?? '미정'}`,
          ...(item.schedule.kind !== 'recurring' && item.schedule.timing ? [item.schedule.timing.time ? `시간: ${item.schedule.timing.time}` : '', item.schedule.timing.timeZone ? `시간대: ${item.schedule.timing.timeZone}` : ''].filter(Boolean) : []),
          ...(series ? [`원래 반복: ${series.label}`, `출력 시작일: ${series.startDate ?? '미정'}`,
            ...(series.scope ? [`출력 범위: ${series.scope}`, ...series.dates.map((day, i) => `  ${series.indices[i]}회차: ${day}${series.time ? ` ${series.time}` : ''}`)] : [])] : []),
          ...(item.description ? [item.description] : []), ...(item.completionCriteria ? [`완료 기준: ${item.completionCriteria}`] : []),
          ...item.subchecks.map(check => `  [ ] ${check.title}`), ...(item.sourceUrl ? [`항목 출처: ${item.sourceUrl}`] : []), ...(returnLinks.has(item.id) ? [`이 기기의 같은 공개판본·항목으로 돌아오기: ${returnLinks.get(item.id)}`] : []), ''])];
      return result(`${normalizedLines(lines.join('\n')).replace(/\n*$/, '')}\n`, rows.map(row => row.item.id), 'text/plain;charset=utf-8');
    }
    if (options.format === 'csv') {
      const lines = [['Flow', '판본', '순서', '항목 ID', '제목', '날짜', '설명', '완료 기준', '하위 확인', '출처', '출처 URL', '항목 출처 URL', 'Flow 설명',
        ...(series.length || hasOrdinaryTiming ? ['원래 반복', '시간', '시간대', '출력 범위', '회차 날짜'] : []), ...(returnLinks.size ? ['이 기기의 같은 공개판본·항목으로 돌아오기'] : [])],
        ...rows.map(({ item, date, series: recurring }, index) => [version.title, String(version.number), String(index + 1), item.id, item.title, date ?? '',
          item.description, item.completionCriteria, item.subchecks.map(check => check.title).join('\n'), version.source.label, version.source.url ?? '', item.sourceUrl ?? '', version.summary,
          ...(series.length || hasOrdinaryTiming ? [recurring?.label ?? '', recurring?.time ?? (item.schedule.kind !== 'recurring' ? item.schedule.timing?.time : null) ?? '', recurring?.timeZone ?? (item.schedule.kind !== 'recurring' ? item.schedule.timing?.timeZone : null) ?? '', recurring?.scope ?? '',
            recurring?.dates.map((day, i) => `${recurring.indices[i]}회차: ${day}`).join('\n') ?? ''] : []), ...(returnLinks.size ? [returnLinks.get(item.id)!] : [])])];
      return result(`\uFEFF${lines.map(line => line.map(csvCell).join(',')).join('\r\n')}\r\n`, rows.map(row => row.item.id), 'text/csv;charset=utf-8');
    }
    const dated = rows.filter((row): row is { item: ProgramPublicItem; date: string; series?: ProgramOutputSeries } => row.date !== null);
    if (!dated.length) return { ok: false, reason: 'no-dated-items' };
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FlowMe//Local PoC Output//KO', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${icsText(version.title)}`];
    for (const { item, date, series: recurring } of dated) {
      if (recurring) {
        const values = recurring.dates.map(day => programCalendarDateTime(day, recurring.time, recurring.timeZone));
        if (values.some(value => value === null)) return { ok: false, reason: 'invalid-date' };
        const uid = `flowme-${encodeURIComponent(JSON.stringify([version.flowId, version.id, item.id, 'recurrence-output/1', recurring.startDate,
          recurring.dates[0], recurring.dates.at(-1)]))}@local.flowme`;
        const parameter = recurring.time ? '' : ';VALUE=DATE';
        lines.push('BEGIN:VEVENT', `UID:${uid}`, ...(returnLinks.has(item.id) ? [`URL:${returnLinks.get(item.id)}`] : []), `DTSTAMP:${stamp}`, `DTSTART${parameter}:${values[0]}`,
          ...(values.length > 1 ? [`RDATE${parameter}:${values.slice(1).join(',')}`] : []),
          `X-FLOWME-RECURRENCE-CONTRACT:authoring-v1`, `X-FLOWME-OUTPUT-SCOPE:${icsText(recurring.scope!)}`,
          `SUMMARY:${icsText(item.title)}`, `DESCRIPTION:${icsText(`${itemDescription(version, item)}\n원래 반복: ${recurring.label}\n출력 시작일: ${recurring.startDate}\n출력 범위: ${recurring.scope}\n선택한 회차만 담은 반복 묶음입니다. 원래 반복의 종료 조건을 바꾸지 않습니다.`)}`, 'END:VEVENT');
        continue;
      }
      // A version's event identity remains stable across anchor changes/export
      // times. Distinct public versions intentionally have distinct UIDs.
      const uid = `flowme-${encodeURIComponent(JSON.stringify([version.flowId, version.id, item.id]))}@local.flowme`;
      if (item.schedule.kind !== 'recurring' && item.schedule.timing?.time) {
        const timing = item.schedule.timing, value = programCalendarDateTime(date, timing.time, timing.timeZone);
        if (!value) return { ok: false, reason: 'invalid-date' };
        lines.push('BEGIN:VEVENT', `UID:${uid}`, ...(returnLinks.has(item.id) ? [`URL:${returnLinks.get(item.id)}`] : []), `DTSTAMP:${stamp}`, `DTSTART:${value}`, `SUMMARY:${icsText(item.title)}`,
          `DESCRIPTION:${icsText(`${itemDescription(version, item)}\n원문 시간: ${programOrdinaryTimingLabel(timing)}`)}`, 'END:VEVENT');
        continue;
      }
      const end = nextDate(date, 1); if (!end) return { ok: false, reason: 'invalid-date' };
      const sourceTiming = item.schedule.kind !== 'recurring' ? programOrdinaryTimingLabel(item.schedule.timing) : '';
      lines.push('BEGIN:VEVENT', `UID:${uid}`, ...(returnLinks.has(item.id) ? [`URL:${returnLinks.get(item.id)}`] : []), `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${compactDate(date)}`,
        `DTEND;VALUE=DATE:${compactDate(end)}`, `SUMMARY:${icsText(item.title)}`, `DESCRIPTION:${icsText(itemDescription(version, item) + (sourceTiming ? `\n원문 시간: ${sourceTiming}` : ''))}`, 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return result(`${lines.map(foldLine).join('\r\n')}\r\n`, dated.map(row => row.item.id), 'text/calendar;charset=utf-8');
  } catch { return { ok: false, reason: 'invalid-version' }; }
}

function unsafeHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (!host.includes('.') || /(?:^|\.)(?:localhost|local|internal|lan|home|invalid)$/.test(host) || host.startsWith('[')) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31
      || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127 || a === 198 && (b === 18 || b === 19);
  }
  return false;
}

function publicSourceUrl(input: unknown): { ok: true; url: string } | { ok: false; reason: Extract<ProgramUrlClassification, { kind: 'invalid' }>['reason'] } {
  if (typeof input !== 'string' || !input.trim() || input.length > 3000 || /[\u0000-\u0020\u007f\\]/.test(input.trim())) return { ok: false, reason: 'invalid-url' };
  let url: URL;
  try { url = new URL(input.trim()); } catch { return { ok: false, reason: 'invalid-url' }; }
  if (!['http:', 'https:'].includes(url.protocol)) return { ok: false, reason: 'unsafe-scheme' };
  if (url.username || url.password) return { ok: false, reason: 'credentials' };
  if (unsafeHost(url.hostname)) return { ok: false, reason: 'unsafe-host' };
  if (url.port) return { ok: false, reason: 'unsupported-port' };
  const sensitiveKey = /(?:token|password|passwd|secret|authorization|credential|signature|session|api.?key|^auth$|^code$)/i;
  if ([...url.searchParams.keys()].some(key => sensitiveKey.test(key))
    || [...new URLSearchParams(url.hash.slice(1)).keys()].some(key => sensitiveKey.test(key))) return { ok: false, reason: 'sensitive-parameters' };
  try { return { ok: true, url: canonicalizeFlowSourceUrl(url.href) }; }
  catch { return { ok: false, reason: 'invalid-url' }; }
}

/** Matches only provided local source records. Never fetches or claims extraction succeeded. */
export function classifyProgramUrl(input: string, knownSources: readonly { url: string; version: ProgramPublicVersion }[]): ProgramUrlClassification {
  const parsed = publicSourceUrl(input);
  if (!parsed.ok) return { kind: 'invalid', reason: parsed.reason };
  for (const known of knownSources) {
    const candidate = publicSourceUrl(known.url);
    if (candidate.ok && candidate.url === parsed.url && validVersion(known.version)) return { kind: 'known-source', url: parsed.url, version: known.version };
  }
  return { kind: 'unsupported', url: parsed.url };
}
