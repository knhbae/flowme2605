import type { ProgramPrivateSpace } from './contract';
import { programSame } from './controller';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { programLegacyTaskQualityHold } from './legacy-map-review';
import { programLegacyPlanExcludedTargets } from './program-legacy-plan-target';
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
  return referenceExecutionAccess(space,taskId);
}
function referenceExecutionAccess(space: ProgramPrivateSpace, taskId: string, excluded?: Set<string>): ProgramReferenceAccess {
  const doc = [...space.text.documents, ...space.text.flows].find(doc => doc.lines.some(line => line.id === taskId));
  if (!doc) return { documentId: null, lineId: taskId, kind: 'missing', reason: reasons.missing };
  let kind = programDocumentContentLock(space, doc.id);
  if (kind === 'active' && programLegacyTaskQualityHold(space, taskId)) kind = 'quality-hold';
  if (kind === 'active' && (excluded??programLegacyPlanExcludedTargets(space)).has(taskId)) kind = 'excluded';
  if(kind==='active')for(const owner of Object.values(space.creatorWorkspace?.nativeExecutionSources??{})){
    const selected=programNativeSelectedRows(owner).find(s=>s.row.lines.some(l=>l.id===taskId));if(!selected)continue;
    if(selected.disposition!=='active')kind='excluded';else if(programNativeSelectionHeld(owner,selected.selection))kind='quality-hold';
  }
  return { documentId: doc.id, lineId: taskId, kind, reason: kind === 'active' ? null : reasons[kind] };
}
/** One host-policy owner. Current private frames supply structure, never policy.
 * Replaced policy/text/actor owners create a new reader in ProgramSpace. */
export function createProgramReferenceExecutionAccess(space:ProgramPrivateSpace,ownerId:string){
  const baseline=space.text,excluded=programLegacyPlanExcludedTargets(space),rights=new Map<string,ProgramReferenceAccess>();
  const baselineIds=new Set([...baseline.documents,...baseline.flows].flatMap(doc=>doc.lines.map(line=>line.id)));
  const policyKeys=['savedBindings','copies','creatorWorkspace','archivedDocumentIds','documentTrash','retentionDocuments','legacySnapshot'] as const;
  const policy=policyKeys.map(key=>space[key]),legacyRaw=space.legacySnapshot?.raw;
  const scopes=new Set([...baseline.folders.map(f=>f.id),...baseline.flows.map(f=>f.id)]);
  const frames=new WeakMap<TextWorkspaceState,Map<string,Map<string,ProgramReferenceAccess>>>();
  const missing=(id:string):ProgramReferenceAccess=>({documentId:null,lineId:id,kind:'missing',reason:reasons.missing});
  return (taskId:string,current:TextWorkspaceState=baseline):ProgramReferenceAccess=>{
    if(!ownerId||space.text!==baseline||space.legacySnapshot?.raw!==legacyRaw||policyKeys.some((key,i)=>space[key]!==policy[i]))return missing(taskId);
    const doc=[...current.documents,...current.flows].find(d=>d.lines.some(l=>l.id===taskId));if(!doc)return missing(taskId);
    let known=rights.get(taskId);
    if(!known){known=referenceExecutionAccess(space,taskId,excluded);rights.set(taskId,known);}
    if(known.kind!=='missing')return known.documentId===doc.id?known:missing(taskId);
    // Only a frozen, validated local frame in an existing active personal doc
    // can introduce a line before its submitted snapshot is acknowledged.
    if(current===baseline||!Object.isFrozen(current)||!baseline.documents.some(d=>d.id===doc.id)
      ||!current.documents.some(d=>d===doc)||programDocumentContentLock(space,doc.id)!=='active')return missing(taskId);
    let documents=frames.get(current);if(!documents){documents=new Map();frames.set(current,documents);}
    let local=documents.get(doc.id);
    if(!local){
      local=new Map();documents.set(doc.id,local);
      if(M.validate(current))for(const item of M.parseDocument(doc,current).items){
        if(baselineIds.has(item.id)||!item.isCanonical||!scopes.has(current.itemScopes[item.id])||current.taskScopes[item.id]!==current.itemScopes[item.id]
          ||current.bindings.some(b=>b.kind==='task'&&(b.lineId===item.id||b.taskId===item.id)))continue;
        if(item.parentTaskId){const parent=local.get(item.parentTaskId)??referenceExecutionAccess(space,item.parentTaskId,excluded);if(parent.kind!=='active'||parent.documentId!==doc.id)continue;}
        local.set(item.id,{documentId:doc.id,lineId:item.id,kind:'active',reason:null});
      }
    }
    return local.get(taskId)??missing(taskId);
  };
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
