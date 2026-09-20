import type { ProgramData, ProgramPublicVersion } from './contract';
import { validateProgramData } from './program-data';
import { textWorkspaceModel as M, type TextAnalysis } from './text-workspace';
import { programExecutionTasks } from './execution';
import { classifyProgramUrl, makeProgramOutput, type ProgramOutput, type ProgramOutputFormat } from './output';
import { foldIcsContentLine } from '../ics';
import { createProgramCreatorTaskSourceFactsReader } from './execution-source';
import { inspectPrivateOutputOccurrences, type PrivateOutputOccurrenceRange } from './private-output-occurrences';
import { programTextExecutionKey } from './recurrence-order';
import { programOutputReturnUrl, type ProgramOutputReturnTarget } from './output-return';
import { programCalendarDateTime } from './public-output-recurrence';

export type PrivateOutputRow = { id: string; kind: 'task' | 'occurrence'; title: string; date: string | null; progress: number; note: string; time: string | null;
  /** Planned occurrence slot, not a date authored in the source and not an execution override. */
  planDate?: string | null;
  returnTarget?: ProgramOutputReturnTarget;
  sourceDate: string | null; sourceTime: string | null; timeZone: string | null; resourceUrl: string | null;
  sourceUrl: string | null; subchecks: { id: string; title: string; done?: boolean }[] };
export type PrivateOutputInspection = { ok: true; title: string; raw: string; rows: PrivateOutputRow[]; hasRecurrences: boolean; warnings: string[]; fingerprint: string } | { ok: false; reason: 'invalid-data' | 'forbidden' | 'missing-document' | 'invalid-occurrence-range' | 'occurrence-source-unavailable' };
export type PrivateOutputOptions = { actorId: string; documentId: string; mode: 'raw' | 'tasks'; selectedItemIds: readonly string[]; format: ProgramOutputFormat; occurrenceRange?: PrivateOutputOccurrenceRange; returnPageUrl?: string };
export type PrivateOutputResult = ProgramOutput | Extract<PrivateOutputInspection, { ok: false }> | { ok: false; reason: 'raw-requires-txt' | 'empty-document' };

/** Read-only personal projection. Public records supply no titles, dates or notes. */
export function inspectProgramPrivateOutput(data: ProgramData, input: { actorId: string; documentId: string; occurrenceRange?: PrivateOutputOccurrenceRange }): PrivateOutputInspection {
  try {
    if (!validateProgramData(data)) return { ok: false, reason: 'invalid-data' };
    if (data.activeActorId !== input.actorId || !data.spaces[input.actorId]) return { ok: false, reason: 'forbidden' };
    const space = data.spaces[input.actorId], doc = M.getDocument(space.text, input.documentId);
    if (!doc || space.archivedDocumentIds.includes(doc.id) || space.documentTrash?.[doc.id]) return { ok: false, reason: 'missing-document' };
    const analysis = M.parseDocument(doc, space.text);
    const members = new Set(analysis.items.map(item => item.id));
    const scopes = M.scopes(space.text), selectedScopes = new Set<string>();
    for (const binding of space.text.bindings.filter(binding => binding.docId === doc.id)) {
      if (binding.kind === 'task') members.add(binding.taskId);
      else selectedScopes.add(binding.scopeId);
    }
    for (let pass = 0; pass < scopes.length; pass++) for (const scope of scopes) {
      if (scope.parentId && selectedScopes.has(scope.parentId)) selectedScopes.add(scope.id);
    }
    const parsed = new Map<string, TextAnalysis>([[doc.id, analysis]]), notes = new Map<string, Map<string, string[]>>();
    const sourceFacts = createProgramCreatorTaskSourceFactsReader(space, data.public);
    const warnings = ['실행 항목 출력에는 포함된 할 일과 연결된 메모만 담습니다. 독립 메모와 실행에서 제외한 원문은 문서 원문 TXT에 남습니다.'];
    const rows: PrivateOutputRow[] = programExecutionTasks(space).filter(task => !space.documentTrash?.[task.docId]
      && (task.docId === doc.id || members.has(task.id) || selectedScopes.has(task.scopeId))).map(task => {
      const ownerDoc = M.getDocument(space.text, task.docId)!;
      if (!parsed.has(ownerDoc.id)) parsed.set(ownerDoc.id, M.parseDocument(ownerDoc, space.text));
      if (!notes.has(ownerDoc.id)) {
        const ownerRows = parsed.get(ownerDoc.id)!.rows, byId = new Map(ownerRows.map(row => [row.id, row]));
        const byTask = new Map<string, string[]>();
        for (const row of ownerRows) {
          if (row.kind !== 'note' && row.kind !== 'heading') continue;
          let parent = row.parentLineId ? byId.get(row.parentLineId) : undefined;
          while (parent && parent.kind !== 'task' && parent.kind !== 'subcheck') parent = parent.parentLineId ? byId.get(parent.parentLineId) : undefined;
          if (parent) byTask.set(parent.id, [...(byTask.get(parent.id) ?? []), row.text.trimStart()]);
        }
        notes.set(ownerDoc.id, byTask);
      }
      const facts = sourceFacts(task.docId, task.id);
      // Only omit exact structured source properties already projected below.
      // Personal memo, different/unknown values and raw TXT remain untouched.
      const prose = (notes.get(ownerDoc.id)!.get(task.id) ?? []).filter(text => {
        const property = /^-\s+(시간대|자료):\s*(.*?)\s*$/.exec(text);
        return !property || !(property[1] === '시간대' ? facts?.timeZone : facts?.resourceUrl)
          || property[2] !== (property[1] === '시간대' ? facts?.timeZone : facts?.resourceUrl)
          || property[1] === '자료' && classifyProgramUrl(property[2], []).kind === 'invalid';
      });
      const note = [task.note, ...prose].filter(Boolean).join('\n');
      const source = /^(?:출처|항목 출처|sourceUrl):\s*(\S+)\s*$/mi.exec(note)?.[1] ?? facts?.sourceUrl ?? null;
      const sourceUrl = source && classifyProgramUrl(source, []).kind !== 'invalid' ? source : null;
      if (source && !sourceUrl) warnings.push(`${task.title}: 출처 링크로 사용할 수 없는 주소는 링크 필드에서 제외했습니다. 메모 원문은 유지합니다.`);
      return { id: task.id, kind: 'task', title: task.title, date: task.date, progress: M.latestProgress(space.text, task.id)?.percent ?? (task.done ? 100 : task.inputPercent ?? 0), note, time: task.time, sourceUrl,
        returnTarget: { documentId: task.docId, executionKey: programTextExecutionKey(task) },
        sourceDate: facts?.sourceDate ?? null, sourceTime: facts?.wallTime ?? null, timeZone: facts?.timeZone ?? null,
        resourceUrl: facts?.resourceUrl && classifyProgramUrl(facts.resourceUrl, []).kind !== 'invalid' ? facts.resourceUrl : null,
        subchecks: task.subchecks.map(check => ({ id: check.id, title: check.title, done: check.done })) };
    });
    const occurrences = inspectPrivateOutputOccurrences(data, input, members, selectedScopes); if (!occurrences.ok) return occurrences;
    rows.push(...occurrences.rows); warnings.push(...occurrences.warnings);
    if (rows.some(row => row.time || row.sourceTime || row.timeZone)) warnings.push('ICS는 실행 시간이 있으면 그 시각으로, 없으면 종일로 출력합니다. 시간대 없는 시각은 가져오는 캘린더의 현지 시각이며, 명시 시간대는 회차별 UTC로 변환합니다.');
    const result = { title: doc.title, raw: M.raw(doc), rows, hasRecurrences: occurrences.hasRecurrences, warnings };
    return { ok: true, ...result, fingerprint: JSON.stringify(result) };
  } catch { return { ok: false, reason: 'invalid-data' }; }
}

/** Remove the public serializer's version column without decoding/re-escaping protected CSV cells. */
function withoutVersionColumn(payload: string): string {
  let quoted = false, column = 0, result = '\uFEFF';
  for (let i = payload.charCodeAt(0) === 0xfeff ? 1 : 0; i < payload.length; i++) {
    const char = payload[i];
    if (char === '"') {
      if (quoted && payload[i + 1] === '"') { if (column !== 1) result += '""'; i++; continue; }
      quoted = !quoted;
    }
    if (!quoted && char === ',') { if (column !== 0) result += char; column++; continue; }
    if (!quoted && char === '\r' && payload[i + 1] === '\n') { result += '\r\n'; i++; column = 0; continue; }
    if (column !== 1) result += char;
  }
  return result;
}

function withoutIcsPublicVersion(payload: string, title: string, timing: Map<string, string>): string {
  const text = title.replace(/\r\n|\r/g, '\n').replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
  const prefix = `DESCRIPTION:${text}\\n판본: 1\\n`;
  let eventTime: string | undefined;
  return payload.replace(/\r\n[ \t]/g, '').split('\r\n').flatMap(line => {
    if (line === 'BEGIN:VEVENT' || line === 'END:VEVENT') eventTime = undefined;
    if (line.startsWith('UID:')) eventTime = timing.get(line.slice(4));
    if (eventTime && line.startsWith('DTEND;VALUE=DATE:')) return [];
    const effective = eventTime && line.startsWith('DTSTART;VALUE=DATE:') ? `DTSTART:${eventTime}`
      : line.startsWith(prefix) ? `DESCRIPTION:${text}\\n${line.slice(prefix.length)}` : line;
    const folded = foldIcsContentLine(effective), encoder = new TextEncoder();
    if (folded.split('\r\n').every(part => encoder.encode(part).length <= 75) && folded.replace(/\r\n[ \t]/g, '') === effective) return folded;
    let physical = ''; const parts: string[] = [];
    for (const character of effective) { if (encoder.encode(physical + character).length > 75) { parts.push(physical); physical = ' '; } physical += character; }
    parts.push(physical); return parts.join('\r\n');
  }).join('\r\n');
}

/** Exact bytes for explicit local transfer; no mutation, storage, repository or network access. */
export function makeProgramPrivateOutput(data: ProgramData, options: PrivateOutputOptions, now: string | Date): PrivateOutputResult {
  const inspected = inspectProgramPrivateOutput(data, options.mode === 'raw' ? { actorId: options.actorId, documentId: options.documentId } : options); if (!inspected.ok) return inspected;
  if (options.mode !== 'raw' && options.mode !== 'tasks') return { ok: false, reason: 'invalid-selection' };
  // Stable synthetic serializer identity is per actor and canonical target, independent of document references/date/export time.
  const version: ProgramPublicVersion = { id: 'private-effective-output', flowId: options.actorId, number: 1, parentVersionId: null,
    title: inspected.title, summary: '개인 실행 내용 출력 · 공개 판본이 아닙니다.', source: { kind: 'user-text', label: '내 문서', url: null, checkedAt: null },
    createdBy: options.actorId, createdAt: '2026-01-01T00:00:00.000Z', items: inspected.rows.map(row => ({ id: row.id, title: row.title,
      description: [`진행: ${row.progress}%`, `실행 날짜: ${row.date ?? '미정'}`, row.time ? `시간: ${row.time}` : '', row.sourceDate ? `원문 날짜: ${row.sourceDate}` : '',
        row.planDate ? `개인 계획 날짜: ${row.planDate}` : '',
        row.sourceTime && row.sourceTime !== row.time ? `원문 시간: ${row.sourceTime}` : '', row.timeZone ? `원문 시간대: ${row.timeZone}` : '',
        row.resourceUrl ? `자료: ${row.resourceUrl}` : '', row.note,
        options.mode === 'tasks' && programOutputReturnUrl(options.returnPageUrl, options.actorId, row.returnTarget)
          ? `FlowMe에서 이 항목 열기: ${programOutputReturnUrl(options.returnPageUrl, options.actorId, row.returnTarget)}\n같은 로컬 PoC·브라우저 프로필에서만 열 수 있습니다. 계정 동기화 링크가 아닙니다.` : ''].filter(Boolean).join('\n'),
      completionCriteria: '', sourceUrl: row.sourceUrl, subchecks: row.subchecks.map(check => ({ id: check.id,
        title: check.done === undefined ? check.title : `${check.done ? '[x]' : '[ ]'} ${check.title}` })),
      schedule: row.date ? { kind: 'fixed', date: row.date } : { kind: 'undated' } })) };
  if (options.mode === 'raw') {
    if (options.format !== 'txt') return { ok: false, reason: 'raw-requires-txt' };
    if (!inspected.raw.length) return { ok: false, reason: 'empty-document' };
    // Reuse filename and timestamp validation, while retaining every original source byte in the payload.
    const encoded = makeProgramOutput({ ...version, items: [{ id: 'raw', title: inspected.title, description: '', completionCriteria: '', sourceUrl: null, subchecks: [], schedule: { kind: 'undated' } }] }, { format: 'txt', selectedItemIds: ['raw'] }, now);
    return encoded.ok ? { ...encoded, payload: inspected.raw, itemIds: [], undatedItemIds: [] } : encoded;
  }
  const encoded = makeProgramOutput(version, { selectedItemIds: options.selectedItemIds, format: options.format }, now);
  if (!encoded.ok) return encoded;
  if (options.format === 'txt') {
    // Shared serializer validates selection/text and owns filenames. Private
    // checklist state is a separate value, never inferred from title syntax.
    const selected = new Set(encoded.itemIds), items = new Map(version.items.map(item => [item.id, item]));
    const lines = [inspected.title, version.summary, `출처: ${version.source.label}`, '',
      ...inspected.rows.filter(row => selected.has(row.id)).flatMap((row, index) => [
        `${index + 1}. ${row.title}`, items.get(row.id)!.description,
        ...row.subchecks.map(check => `  ${check.done ? '[x]' : '[ ]'} ${check.title}`),
        ...(row.sourceUrl ? [`항목 출처: ${row.sourceUrl}`] : []), ''])];
    return { ...encoded, payload: `${lines.join('\n').replace(/\r\n|\r/g, '\n').replace(/\n*$/, '')}\n` };
  }
  if (options.format === 'csv') return { ...encoded, payload: withoutVersionColumn(encoded.payload) };
  const timing = new Map<string, string>();
  for (const row of inspected.rows.filter(row => encoded.itemIds.includes(row.id) && row.time && row.date)) {
    const value = programCalendarDateTime(row.date!, row.time, row.timeZone); if (!value) return { ok: false, reason: 'invalid-date' };
    timing.set(`flowme-${encodeURIComponent(JSON.stringify([version.flowId, version.id, row.id]))}@local.flowme`, value);
  }
  return { ...encoded, payload: withoutIcsPublicVersion(encoded.payload, inspected.title, timing) };
}
