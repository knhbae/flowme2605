import { programDate } from './program-data';
import type { ProgramTaskDatePresentation } from './execution-presentation';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

export type ProgramMemoContext = {
  itemId: string;
  title: string;
  kind: 'task' | 'subcheck';
  label: string;
  continuation: string;
};

/** Read the direct owner, not a nearby root task. This grants no edit authority. */
export function readProgramMemoContext(state: TextWorkspaceState, documentId: string,
  lineId: string | null): ProgramMemoContext | null {
  if (!lineId) return null;
  const document = M.getDocument(state, documentId);
  if (!document) return null;
  const analysis = M.parseDocument(document, state);
  const row = analysis.rows.find(entry => entry.id === lineId);
  if (!row || row.kind !== 'property' || !/^ *-\s+메모:/.test(row.text) || !row.taskId) return null;
  const owner = analysis.items.find(item => item.id === row.taskId);
  const ownerRow = owner && analysis.rows.find(entry => entry.id === owner.id);
  if (!owner || !ownerRow || !owner.title.trim() || row.parentLineId !== owner.id
    || row.depth !== owner.depth + 1 || ownerRow.isReference
    || state.bindings.some(binding => binding.kind === 'task' && binding.docId === documentId && binding.lineId === owner.id)
    || analysis.issues.some(issue => issue.lineId === row.id && issue.code === 'orphan-property')) return null;
  const kind = ownerRow.kind === 'subcheck' ? 'subcheck' : 'task';
  return { itemId: owner.id, title: owner.title, kind, label: `메모 · ${owner.title}`,
    continuation: `메모 줄 끝에서 Enter를 누르면 같은 ${kind === 'subcheck' ? '하위 체크' : '할 일'}의 메모를 이어 씁니다.` };
}

/** Explain the existing handler's date effect, without changing that handler. */
export function programTaskDateChangeHint(presentation: ProgramTaskDatePresentation | null,
  dateDraft: string, timeEdit?: { current: string; draft: string }): string | null {
  if (!presentation || typeof dateDraft !== 'string' || dateDraft !== '' && !programDate(dateDraft)) return null;
  const date = dateDraft || null;
  if (date === presentation.effectiveDate) {
    const validTime = (value: unknown) => typeof value === 'string' && (value === '' || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value));
    if (presentation.source === 'individual' || !timeEdit || !validTime(timeEdit.current) || !validTime(timeEdit.draft)
      || timeEdit.current === timeEdit.draft) return null;
    return `시간을 바꾸면 실행 날짜도 ${date ?? '미정'}으로 개별 지정됩니다. 원문 위치와 구획 날짜는 그대로입니다.`;
  }
  return `실행 날짜를 ${date ?? '미정'}으로 개별 지정합니다. 원문 위치와 구획 날짜는 그대로입니다.`;
}
