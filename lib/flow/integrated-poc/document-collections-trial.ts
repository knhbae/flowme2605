import { createProgramData, validateProgramData } from './program-data';
import { buildProgramCatalog } from './catalog';
import { completeProgramTask, createProgramDocument, importProgramPublicVersion, updateProgramTask } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import type { ProgramData, ProgramTransition } from './contract';

export const COLLECTION_TRIAL_TODAY = '2026-10-06';
export const COLLECTION_TRIAL_DATA_KEY = 'flowme:document-collections:trial-data:v1';
export const COLLECTION_TRIAL_LINK_KEY = 'flowme:document-collections:trial-links:v1';
/** Pure, private test data only. No account, request, persisted profile or live source is loaded. */
export function createDocumentCollectionsTrialData(): ProgramData {
  let data = createProgramData();
  const accept = (result: ProgramTransition<string>) => {
    if (!result.ok || !validateProgramData(result.data)) throw new Error('invalid-collection-trial');
    data = result.data; return result.result;
  };
  const base = () => ({ actorId: data.activeActorId, expectedSpace: data.spaces[data.activeActorId] });
  accept(createProgramDocument(data, { ...base(), requestId: 'trial-other-document', title: '개인 업무', raw: '보존할 글\n- [ ] 11시 회의 참석\n  - 날짜: 2026-10-06\n  - 메모: 가상 업무 메모\n- [ ] 제출 자료 최종 확인\n  - 날짜: 2026-10-06\n- [ ] 고객 회신 보내기\n  - 날짜: 2026-10-07' }));
  accept(createProgramDocument(data, { ...base(), requestId: 'trial-quick-document', title: '빠른 메모' }));
  const catalog = buildProgramCatalog('creator-minji');
  const version = catalog.versions.find(row => row.flowId === 'catalog-moving-d30-basic');
  const flow = catalog.flows.find(row => row.id === version?.flowId);
  if (!version || !flow) throw new Error('missing-collection-trial-source');
  data.public.flows = [flow]; data.public.versions = [version];
  const item = version.items.find(row => row.schedule.kind !== 'recurring');
  if (!item) throw new Error('missing-collection-trial-item');
  accept(importProgramPublicVersion(data, { ...base(), requestId: 'trial-source-copy', versionId: version.id, itemIds: [item.id], anchor: COLLECTION_TRIAL_TODAY }));
  const task = M.tasks(data.spaces[data.activeActorId].text).find(row => row.docId === data.spaces[data.activeActorId].copies[0].documentId);
  if (!task) throw new Error('missing-collection-trial-canonical-item');
  accept(updateProgramTask(data, { ...base(), requestId: 'trial-source-note', taskId: task.id, patch: { date: '2026-10-07', note: '가상 기존 개인 메모' } }));
  accept(completeProgramTask(data, { ...base(), requestId: 'trial-source-complete', taskId: task.id, date: '2026-10-07', done: true }));
  return data;
}
