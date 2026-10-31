import type { ProgramData } from './contract';
import { compareProgramCopyVersion } from './private-space';
export type ProgramCopyHeader = { copyId: string; flowId: string; kind: 'unverified' | 'withdrawn' | 'changed' | 'current'; text: string; action: 'source' | 'inspect' | null };
/** Display only. The explicit private actor is never inferred from a public member alias. */
export function programCopyHeader(data: ProgramData, actorId: string, documentId: string): ProgramCopyHeader | null {
  const copy = data.spaces[actorId]?.copies.find(row => row.documentId === documentId);
  if (!copy) return null;
  const flow = data.public.flows.find(row => row.id === copy.flowId), base = data.public.versions.find(row => row.id === copy.baseVersionId);
  const common = { copyId: copy.id, flowId: copy.flowId };
  if (copy.flowId.startsWith('catalog-')) return { ...common, kind: 'unverified', text: '미확인 콘텐츠에서 가져옴 · 시험용', action: 'source' };
  if (!flow) return { ...common, kind: 'current', text: '원본을 확인할 수 없습니다. 내 문서는 그대로입니다.', action: null };
  if (flow.archived) return { ...common, kind: 'withdrawn', text: '원본이 공개 목록에서 내려갔습니다. 내 문서는 그대로입니다.', action: null };
  const target = data.public.versions.find(row => row.id === flow.currentVersionId);
  if (target && target.id !== copy.baseVersionId) {
    const compared = compareProgramCopyVersion(data, { actorId, copyId: copy.id, versionId: target.id });
    if (compared.ok && compared.result.items.some(item => item.fields.some(field => field.sourceChanged && !field.alreadyApplied)))
      return { ...common, kind: 'changed', text: '원본에 판본 ' + target.number + '이 있습니다', action: 'inspect' };
  }
  return { ...common, kind: 'current', text: 'Flow에서 가져옴' + (base ? ' · 판본 ' + base.number : ''), action: 'source' };
}
