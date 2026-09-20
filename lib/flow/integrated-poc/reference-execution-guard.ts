import type { ProgramPrivateSpace } from './contract';
import { programSame } from './controller';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { programLegacyTaskQualityHold } from './legacy-map-review';
import { programLegacyPlanTaskExcluded } from './program-legacy-plan-target';
import {programNativeSelectedRows,programNativeSelectionHeld} from './creator-native-execution-validation';

export type ProgramReferenceAccess = { documentId: string | null; lineId: string; reason: string | null; kind: 'active' | 'archived' | 'trash' | 'retention' | 'quality-hold' | 'excluded' | 'missing' };
/** Filing scopes are not canonical document identities. Find the actual stable line. */
export function programDocumentContentLock(space: ProgramPrivateSpace, documentId: string): ProgramReferenceAccess['kind'] {
  if (space.documentTrash?.[documentId]) return 'trash';
  if (Object.values(space.retentionDocuments ?? {}).includes(documentId)) return 'retention';
  if (space.archivedDocumentIds.includes(documentId)) return 'archived';
  return 'active';
}
const reasons: Record<Exclude<ProgramReferenceAccess['kind'], 'active'>, string> = {
  archived: '원래 문서가 보관되어 있습니다. 보관에서 꺼낸 뒤 날짜와 진행을 바꿀 수 있습니다.',
  trash: '원래 문서가 휴지통에 있습니다. 문서를 복원한 뒤 이어서 실행할 수 있습니다.',
  retention: '판본 복구 중 보관된 내용입니다. 원래 문서에서 복구 상태를 확인해 주세요.',
  'quality-hold': '원본 확인이 필요한 항목입니다. 원래 문서에서 보류 이유를 확인해 주세요.',
  excluded: '현재 실행에서 제외한 항목입니다. 원래 계획의 포함 선택을 확인해 주세요.',
  missing: '원래 항목을 찾을 수 없습니다. 이 연결은 남겨 두거나 해제할 수 있습니다.',
};
export function programReferenceExecutionAccess(space: ProgramPrivateSpace, taskId: string): ProgramReferenceAccess {
  const doc = [...space.text.documents, ...space.text.flows].find(doc => doc.lines.some(line => line.id === taskId));
  if (!doc) return { documentId: null, lineId: taskId, kind: 'missing', reason: reasons.missing };
  let kind = programDocumentContentLock(space, doc.id);
  if (kind === 'active' && programLegacyTaskQualityHold(space, taskId)) kind = 'quality-hold';
  if (kind === 'active' && programLegacyPlanTaskExcluded(space, taskId)) kind = 'excluded';
  if(kind==='active')for(const owner of Object.values(space.creatorWorkspace?.nativeExecutionSources??{})){
    const selected=programNativeSelectedRows(owner).find(s=>s.row.lines.some(l=>l.id===taskId));if(!selected)continue;
    if(selected.disposition!=='active')kind='excluded';else if(programNativeSelectionHeld(owner,selected.selection))kind='quality-hold';
  }
  return { documentId: doc.id, lineId: taskId, kind, reason: kind === 'active' ? null : reasons[kind] };
}
/** Editor writes cannot change a locked canonical document through an active reference.
 * Document name/folder metadata and unlinking a reference in another document are
 * deliberately outside this guard. Explicit lifecycle transitions own those fields.
 */
export function programPreservesLockedDocumentContent(space: ProgramPrivateSpace, next: TextWorkspaceState): boolean {
  for(const owner of Object.values(space.creatorWorkspace?.nativeExecutionSources??{}))for(const selected of programNativeSelectedRows(owner)){
    if(programReferenceExecutionAccess(space,selected.row.lineId).kind==='active')continue;
    const beforeDoc=[...space.text.documents,...space.text.flows].find(d=>d.lines.some(l=>l.id===selected.row.lineId));if(!beforeDoc)continue;
    const selection=M.selectionForMove(space.text,beforeDoc.id,selected.row.lineId),ids=new Set(selection?beforeDoc.lines.slice(selection.startIndex,selection.endIndex).map(l=>l.id):selected.row.lines.map(l=>l.id));
    const facts=(text:TextWorkspaceState)=>({lines:[...text.documents,...text.flows].flatMap(d=>d.lines.filter(l=>ids.has(l.id))),records:text.progressRecords.filter(r=>ids.has(r.taskId))});if(!programSame(facts(space.text),facts(next)))return false;
  }
  const protectedDocs = [...space.text.documents, ...space.text.flows].filter(doc => programDocumentContentLock(space, doc.id) !== 'active');
  if (!protectedDocs.length) return true;
  const ids = new Set(protectedDocs.map(doc => doc.id)), lineIds = new Set(protectedDocs.flatMap(doc => doc.lines.map(line => line.id)));
  const facts = (text: TextWorkspaceState) => ({
    documents: [...text.documents, ...text.flows].filter(doc => ids.has(doc.id)).map(doc => ({ id: doc.id, lines: doc.lines })),
    bindings: text.bindings.filter(binding => ids.has(binding.docId)),
    records: text.progressRecords.filter(record => lineIds.has(record.taskId)),
  });
  return programSame(facts(space.text), facts(next));
}
