import type { ProgramPublicItem, ProgramPublicVersion } from './contract';
import { programDate } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';
import { classifyProgramUrl, makeProgramOutput, type ProgramOutput, type ProgramOutputFormat } from './output';

export type TransientOutputRow = Omit<ProgramPublicItem, 'schedule'> & {
  selected: boolean; kind: 'task' | 'memo'; sourceText: string;
  scheduleKind: 'undated' | 'fixed' | 'relative'; scheduleValue: string;
};
export type TransientOutputDraft = {
  id: string; raw: string; title: string; sourceUrl: string; sourceLabel: string; createdAt: string;
  rows: TransientOutputRow[]; warnings: string[]; anchor: string; format: ProgramOutputFormat;
  confirmed: { fingerprint: string; output: Extract<ProgramOutput, { ok: true }> } | null;
};
export type TransientOutputResult = ProgramOutput | { ok: false; reason: 'confirmation-required' | 'empty-source' | 'source-limit' | 'invalid-source-url' | 'unsupported-schedule' };
/** Parser-only projection. No workspace, public repository, storage or fetch is created. */
export function createTransientOutputDraft(raw: string, options: { id: string; title: string; sourceUrl: string }, now: string):
  { ok: true; draft: TransientOutputDraft } | { ok: false; reason: 'empty-source' | 'source-limit' } {
  if (!raw.trim()) return { ok: false, reason: 'empty-source' };
  if (raw.length > 30000 || raw.split(/\r\n|\r|\n/).length > 1200) return { ok: false, reason: 'source-limit' };
  const lines = raw.replace(/\r\n|\r/g, '\n').split('\n');
  const doc = { id: options.id, title: options.title || '붙여넣은 원문', folder: '', folderId: 'folder-unfiled', lines: lines.map((text, i) => ({ id: `${options.id}-line-${i}`, text })) };
  const analysis = M.parseDocument(doc);
  const tasks = analysis.rows.filter(row => row.kind === 'task' && row.isCanonical);
  const rows: TransientOutputRow[] = [];
  const append = (start: number, end: number, task?: typeof tasks[number]) => {
    const sourceText = lines.slice(start, end).join('\n'); if (!sourceText.trim()) return;
    const modelTask = task && analysis.tasks.find(item => item.id === task.id);
    rows.push({ id: `${options.id}-item-${start}`, kind: task ? 'task' : 'memo', selected: true, sourceText,
      title: (task?.title || options.title.trim() || lines[start].trim() || '붙여넣은 원문').slice(0, 500), description: sourceText,
      completionCriteria: '', sourceUrl: null, scheduleKind: task?.date && programDate(task.date) ? 'fixed' : 'undated', scheduleValue: task?.date && programDate(task.date) ? task.date : '',
      subchecks: (modelTask?.subchecks ?? []).map(check => ({ id: check.id, title: check.title })) });
  };
  if (!tasks.length) append(0, lines.length);
  else { if (tasks[0].index > 0) append(0, tasks[0].index); tasks.forEach((task, index) => append(task.index, tasks[index + 1]?.index ?? lines.length, task)); }
  const url = options.sourceUrl.trim(); const safe = !url || classifyProgramUrl(url, []).kind !== 'invalid';
  const warnings = ['웹에서 수집하거나 의미를 추론한 결과가 아닙니다. 일반 글은 메모로, 명시된 할 일은 원문 순서로 옮겼습니다.'];
  if (!safe) warnings.push('입력 URL은 안전한 출처 주소로 사용할 수 없어 제외했습니다. 원문 내용은 유지했습니다.');
  if (analysis.issues.length) warnings.push(`원문 구조에서 ${analysis.issues.length}개 확인할 부분이 있습니다. 해석하지 못한 내용도 설명에 남겼습니다.`);
  if (analysis.rows.some(row => row.time || row.progressPercent !== undefined || row.done)) warnings.push('시간·진행 상태는 실행 기록으로 옮기지 않습니다. 원문 설명에서 확인할 수 있습니다. 캘린더는 종일 일정입니다.');
  return { ok: true, draft: { id: options.id, raw, title: (options.title.trim() || '붙여넣은 원문').slice(0, 240), sourceUrl: safe ? url : '', sourceLabel: '사용자가 붙여넣고 확인한 원문', createdAt: now, rows, warnings, anchor: '', format: 'txt', confirmed: null } };
}
export function transientOutputFingerprint(draft: TransientOutputDraft): string {
  const { confirmed: _confirmed, ...content } = draft; return JSON.stringify(content);
}
export function previewTransientOutput(draft: TransientOutputDraft, now: string | Date): TransientOutputResult {
  if (!draft.raw.trim()) return { ok: false, reason: 'empty-source' };
  if (draft.sourceUrl.trim() && classifyProgramUrl(draft.sourceUrl.trim(), []).kind === 'invalid') return { ok: false, reason: 'invalid-source-url' };
  const items: ProgramPublicItem[] = [];
  for (const row of draft.rows) {
    if (!row.selected) continue;
    if (!['undated', 'fixed', 'relative'].includes(row.scheduleKind)) return { ok: false, reason: 'unsupported-schedule' };
    if (row.sourceUrl && classifyProgramUrl(row.sourceUrl, []).kind === 'invalid') return { ok: false, reason: 'invalid-source-url' };
    if (row.scheduleKind === 'fixed' && !programDate(row.scheduleValue)) return { ok: false, reason: 'invalid-date' };
    if (row.scheduleKind === 'relative' && (!/^[+-]?\d+$/.test(row.scheduleValue) || !Number.isSafeInteger(Number(row.scheduleValue)) || Math.abs(Number(row.scheduleValue)) > 36600)) return { ok: false, reason: 'invalid-date' };
    items.push({ id: row.id, title: row.title, description: row.description, completionCriteria: row.completionCriteria, sourceUrl: row.sourceUrl,
      schedule: row.scheduleKind === 'fixed' ? { kind: 'fixed', date: row.scheduleValue } : row.scheduleKind === 'relative' ? { kind: 'relative', days: Number(row.scheduleValue) } : { kind: 'undated' },
      subchecks: row.subchecks.map(check => ({ id: check.id, title: check.title })) });
  }
  const version: ProgramPublicVersion = { id: `${draft.id}-preview`, flowId: draft.id, number: 1, parentVersionId: null, title: draft.title,
    summary: '사용자가 확인한 임시 출력 · 공개하거나 개인 문서에 저장한 판본이 아닙니다.', items,
    source: { kind: 'user-text', label: draft.sourceLabel, url: draft.sourceUrl.trim() || null, checkedAt: null }, createdBy: 'transient-output', createdAt: draft.createdAt };
  return makeProgramOutput(version, { selectedItemIds: items.map(row => row.id), anchor: draft.anchor || null, format: draft.format }, now);
}
export function confirmTransientOutput(draft: TransientOutputDraft, now: string | Date): { ok: true; draft: TransientOutputDraft } | { ok: false; reason: string } {
  const output = previewTransientOutput(draft, now); if (!output.ok) return output;
  return { ok: true, draft: { ...draft, confirmed: { fingerprint: transientOutputFingerprint(draft), output } } };
}
export function confirmedTransientOutput(draft: TransientOutputDraft): TransientOutputResult {
  return draft.confirmed?.fingerprint === transientOutputFingerprint(draft) ? draft.confirmed.output : { ok: false, reason: 'confirmation-required' };
}
