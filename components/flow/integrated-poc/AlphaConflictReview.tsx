'use client';

import React from 'react';
import type { AlphaAccount, AlphaCommand, AlphaPrivateField } from '@/lib/flow/integrated-poc/alpha-persistence/contract';
import type { ProgramPublicRepository } from '@/lib/flow/integrated-poc/contract';
import { validateAlphaCommand } from '@/lib/flow/integrated-poc/alpha-persistence/fake-server';
import { isAlphaWireCommand } from '@/lib/flow/integrated-poc/alpha-sync/wire';
import { canonicalJson, detached } from '@/lib/flow/integrated-poc/alpha-persistence/json';
import { textWorkspaceModel as M, type TextWorkspaceState, type TextDocument } from '@/lib/flow/integrated-poc/text-workspace';
import { alphaSocialConflictView } from '@/lib/flow/integrated-poc/alpha-conflict-social';
import styles from './AlphaConflictReview.module.css';

export type AlphaConflictReviewProps = {
  draft: AlphaCommand;
  account: AlphaAccount | null;
  /** UX B8: the public rows, to name the Flow a post or request was about. */
  publicRepository?: ProgramPublicRepository | null;
  /** Copy only. The parent owns clipboard feedback; no repository action is available here. */
  onCopy?: (raw: string) => void | Promise<void>;
};
type DocumentText = { title: string; raw: string };
export type AlphaConflictDocument = { id: string; server: DocumentText | null; mine: DocumentText | null };
export type AlphaConflictComparison = {
  kind: 'invalid' | 'undo' | 'change' | 'social';
  serverAvailable: boolean;
  documents: AlphaConflictDocument[];
  summaries: string[];
  /** UX B8: one sentence for a public or creator request (no raw command is shown). */
  note?: string;
};
const fieldLabels: Record<Exclude<AlphaPrivateField, 'text'>, string> = {
  personalAuthoring:'내 Flow의 버전·실행·반복',
  archivedDocumentIds: '문서 보관 상태', documentTrash: '휴지통', copies: '개인 계획과 원본 연결',
  savedBindings: '개인 계획의 문서 연결', draftRevisions: '문서 저장본', participationDrafts: '질문·경험 입력',
  publicationDrafts: '공개 초안', publications: '공개한 내용의 연결', position: '작성 위치',
  timelineOrders: '같은 날짜의 항목 순서', executionTimelineOrders: '같은 날짜의 항목 순서',
  legacySnapshot: '저장한 계획의 상세 내용', legacyQuickItemLines: '빠른 할 일 연결', legacyTimelinePolicies: '기간 목록의 포함 범위',
  retentionDocuments: '복구 중 보관한 문서', creatorDraftImports: '가져온 제작 초안', creatorWorkspace: '제작 초안', catalogLibrary: '기존 Flow 콘텐츠',
  proposalReviewDrafts: '변경 제안 검토', recurrenceExecution: '반복 회차의 완료·진행 기록', recurrencePlans: '반복 일정',
};
function safeText(value: unknown): TextWorkspaceState | null {
  try { const text = detached(value); return M.validate(text) ? text : null; } catch { return null; }
}
const documents = (text: TextWorkspaceState) => [...text.documents, ...text.flows];
const content = (doc: TextDocument | undefined): DocumentText | null => doc ? { title: doc.title, raw: M.raw(doc) } : null;
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);

/** Read-only comparison by the original document identity, never title or array position. */
export function inspectAlphaConflict(draft: AlphaCommand, account: AlphaAccount | null, publicRepository?: ProgramPublicRepository | null): AlphaConflictComparison {
  const fallback: AlphaConflictComparison = { kind: 'invalid', serverAvailable: false, documents: [], summaries: [] };
  try {
    if (!validateAlphaCommand(draft) && !isAlphaWireCommand(draft)) return fallback;
    const command = detached(draft);
    if (command.kind === 'undo-private' || command.kind === 'undo-creator' || command.kind === 'undo-social') return { ...fallback, kind: 'undo' };
    if (command.kind === 'social') {
      const view = alphaSocialConflictView(command.intent, publicRepository);
      return { kind: 'social', serverAvailable: !!account, documents: view.text !== null ? [{ id: command.requestId, server: null,
        mine: { title: '아직 공개되지 않은 글', raw: view.text } }] : [], summaries: [], note: view.note };
    }
    if (command.kind === 'creator') {
      const mine = command.intent.type === 'working' ? command.intent.working : null;
      const server = account?.space.creatorWorkspace?.working;
      return { kind: 'change', serverAvailable: !!account, documents: mine ? [{ id: mine.draftId,
        server: server?.draftId === mine.draftId ? { title: server.title, raw: server.nativePendingRawText ?? server.rawText } : null,
        mine: { title: mine.title, raw: mine.nativePendingRawText ?? mine.rawText } }] : [],
        summaries: [], note: '만들던 Flow는 자동으로 합치지 않습니다. 내용을 복사해 두고 최신 화면에서 확인해 주세요.' };
    }
    const server = safeText(account?.space?.text), textChange = command.changes.find(change => change.field === 'text');
    const mine = textChange?.present ? safeText(textChange.value) : null;
    if (textChange && !mine) return fallback;
    const summaries = new Set<string>();
    for (const change of command.changes) if (change.field !== 'text') summaries.add(fieldLabels[change.field]);
    let rows: AlphaConflictDocument[] = [];
    if (mine) {
      const current = new Map((server ? documents(server) : []).map(doc => [doc.id, doc]));
      const proposed = new Map(documents(mine).map(doc => [doc.id, doc]));
      rows = [...new Set([...proposed.keys(), ...current.keys()])].map(id => ({ id, server: content(current.get(id)), mine: content(proposed.get(id)) }))
        .filter(row => !same(row.server, row.mine));
      if (server && (!same(server.folders, mine.folders)
        || documents(mine).some(doc => current.has(doc.id) && current.get(doc.id)!.folderId !== doc.folderId))) summaries.add('폴더와 문서 위치');
      if (server && !same(server.progressRecords, mine.progressRecords)) summaries.add('날짜별 진행 기록');
      if (server && (!same(server.bindings, mine.bindings) || !same(server.taskScopes, mine.taskScopes) || !same(server.itemScopes, mine.itemScopes))) summaries.add('할 일과 문서 연결');
      if (server && !rows.length && documents(mine).some(doc => current.has(doc.id) && !same(current.get(doc.id)!.lines, doc.lines))) summaries.add('항목 연결과 순서');
    }
    return { kind: 'change', serverAvailable: !!server, documents: rows, summaries: [...summaries] };
  } catch { return fallback; }
}

export function AlphaConflictReview({ draft, account, publicRepository, onCopy }: AlphaConflictReviewProps) {
  const comparison = inspectAlphaConflict(draft, account, publicRepository);
  if (comparison.kind === 'invalid') return <p role="alert">내가 쓴 내용과 저장된 내용을 비교하지 못했습니다. 지금 쓴 내용을 복사해 두세요.</p>;
  if (comparison.kind === 'undo') return <p>되돌리려던 변경 뒤에 다른 내용이 저장되었습니다. 그 내용을 지우지 않도록 되돌리기를 멈췄습니다. 최신 내용을 확인해 주세요.</p>;
  // UX B8: a post or a public request is not a document comparison: what was written, and what to do with it.
  if (comparison.kind === 'social') return <section className={styles.review} aria-label="공개되지 않은 글">
    {comparison.note && <p>{comparison.note}</p>}
    {comparison.documents.map(row => row.mine && <section className={styles.document} key={row.id} aria-label={row.mine.title}>
      <h3>{row.mine.title}</h3>
      <div className={styles.side}><textarea readOnly rows={6} aria-label={`${row.mine.title} 내용`} value={row.mine.raw} />
        {onCopy && <button type="button" onClick={() => { void onCopy(row.mine!.raw); }}>내 내용 복사</button>}</div>
    </section>)}
  </section>;
  return <section className={styles.review} aria-label="저장된 내용과 내가 쓴 내용 비교">
    {!comparison.serverAvailable && <p role="status">저장된 내용을 아직 불러오지 못해 내가 쓴 내용만 보입니다.</p>}
    {comparison.note && <p>{comparison.note}</p>}
    {comparison.documents.map((row, index) => {
      const title = row.mine?.title || row.server?.title || '제목 없는 문서';
      return <section className={styles.document} key={row.id} aria-label={`${title} 비교`}>
        <h3>{title}</h3>
        <div className={styles.columns}>
          <div className={styles.side}><label>지금 저장된 내용
            {row.server && <>{row.mine && row.server.title !== row.mine.title && <span className={styles.title}>{row.server.title || '제목 없는 문서'}</span>}<textarea readOnly rows={8} aria-label={`${index + 1}. ${title} 지금 저장된 내용`} value={row.server.raw} /></>}
          </label>{!row.server && <p>{comparison.serverAvailable ? '저장된 쪽에는 이 문서가 없습니다.' : '저장된 내용을 아직 불러오지 못했습니다.'}</p>}</div>
          <div className={styles.side}><label>내가 쓴 내용
            {row.mine && <>{row.server && row.server.title !== row.mine.title && <span className={styles.title}>{row.mine.title || '제목 없는 문서'}</span>}<textarea readOnly rows={8} aria-label={`${index + 1}. ${title} 내가 쓴 내용`} value={row.mine.raw} /></>}
          </label>{!row.mine && <p>내가 쓴 쪽에는 이 문서가 없습니다.</p>}
            {row.mine && onCopy && <button type="button" onClick={() => { void onCopy(row.mine!.raw); }}>내 내용 복사</button>}
          </div>
        </div>
      </section>;
    })}
    {comparison.summaries.length > 0 && <div className={styles.summary}><p>함께 바뀐 것</p><ul>{comparison.summaries.map(label => <li key={label}>{label}</li>)}</ul></div>}
    {!comparison.documents.length && !comparison.summaries.length && !comparison.note && <p>달라진 내용이 없습니다. [최신 내용 열기]를 눌러 주세요.</p>}
  </section>;
}
