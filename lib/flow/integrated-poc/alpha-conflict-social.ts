import type { AlphaCommand } from './alpha-persistence/contract';
import type { ProgramPublicRepository } from './contract';

/** UX B8 (11/7): a refused public or participation request is shown as a person wrote it, never as its command. A post
 *  or review: its title, a blank line, its body, and "연결: {Flow 제목}" when it names a Flow. Cursor, edit target and
 *  evidence ids are not shown and not copied. Any other public request: one sentence, no text box. */
export type AlphaSocialConflictIntent = Extract<AlphaCommand, { kind: 'social' }>['intent'];
const verbs: Partial<Record<AlphaSocialConflictIntent['type'], string>> = {
  'copy-import': '가져오기', 'copy-update': '버전 반영', 'proposal-create': '제안', 'publication-save': '공개 초안 저장',
  'publication-submit': '공개', 'publication-resolve': '공개', 'publication-archive': '공개 철회', 'review-save': '제안 검토 저장',
  'review-submit': '제안 검토', 'reaction-set': '반응', 'post-delete': '글 삭제', 'reply-delete': '답글 삭제',
};
function flowTitle(publicRepository: ProgramPublicRepository | null | undefined, ids: { versionId?: string | null; flowId?: string | null }): string | null {
  if (!publicRepository) return null;
  const versions = publicRepository.versions, flow = ids.flowId ? publicRepository.flows.find(row => row.id === ids.flowId) : undefined;
  return (ids.versionId && versions.find(row => row.id === ids.versionId)?.title) || (flow && versions.find(row => row.id === flow.currentVersionId)?.title) || null;
}
export function alphaSocialConflictView(intent: AlphaSocialConflictIntent, publicRepository?: ProgramPublicRepository | null): { text: string | null; note: string } {
  if (intent.type === 'participation-save' || intent.type === 'participation-submit') {
    const draft = intent.draft, linked = flowTitle(publicRepository, draft);
    const text = [draft.title.trim(), draft.title.trim() ? '' : null, draft.body, linked ? `\n연결: ${linked}` : null].filter(part => part !== null).join('\n').trim();
    return { text, note: '이 글은 공개되지 않았습니다. 내용을 복사해 두고, 최신 화면에서 다시 공개해 주세요.' };
  }
  const title = 'draft' in intent && intent.draft && 'title' in intent.draft && typeof intent.draft.title === 'string' && intent.draft.title.trim() ? intent.draft.title.trim()
    : flowTitle(publicRepository, { versionId: 'versionId' in intent ? intent.versionId : 'baseVersionId' in intent ? intent.baseVersionId : null, flowId: 'flowId' in intent ? intent.flowId : null });
  const verb = verbs[intent.type];
  return { text: null, note: `${title ? `‘${title}’ ` : ''}${verb ? `${verb} ` : ''}요청이 저장되지 않았습니다.` };
}
