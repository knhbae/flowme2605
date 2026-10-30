'use client';

import React from 'react';
import type { AlphaAccount, AlphaCommand, AlphaPrivateField } from '@/lib/flow/integrated-poc/alpha-persistence/contract';
import { validateAlphaCommand } from '@/lib/flow/integrated-poc/alpha-persistence/fake-server';
import { isAlphaWireCommand } from '@/lib/flow/integrated-poc/alpha-sync/wire';
import { canonicalJson, detached } from '@/lib/flow/integrated-poc/alpha-persistence/json';
import { textWorkspaceModel as M, type TextWorkspaceState, type TextDocument } from '@/lib/flow/integrated-poc/text-workspace';
import styles from './AlphaConflictReview.module.css';

export type AlphaConflictReviewProps = {
  draft: AlphaCommand;
  account: AlphaAccount | null;
  /** Copy only. The parent owns clipboard feedback; no repository action is available here. */
  onCopy?: (raw: string) => void | Promise<void>;
};
type DocumentText = { title: string; raw: string };
export type AlphaConflictDocument = { id: string; server: DocumentText | null; mine: DocumentText | null };
export type AlphaConflictComparison = {
  kind: 'invalid' | 'undo' | 'change';
  serverAvailable: boolean;
  documents: AlphaConflictDocument[];
  summaries: string[];
};
const fieldLabels: Record<Exclude<AlphaPrivateField, 'text'>, string> = {
  archivedDocumentIds: '문서 보관 상태', documentTrash: '휴지통', copies: '개인 계획과 원본 연결',
  savedBindings: '개인 계획의 문서 연결', draftRevisions: '문서 저장판본', participationDrafts: '질문·경험 입력',
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
export function inspectAlphaConflict(draft: AlphaCommand, account: AlphaAccount | null): AlphaConflictComparison {
  const fallback: AlphaConflictComparison = { kind: 'invalid', serverAvailable: false, documents: [], summaries: [] };
  try {
    if (!validateAlphaCommand(draft) && !isAlphaWireCommand(draft)) return fallback;
    const command = detached(draft);
    if (command.kind === 'undo-private' || command.kind === 'undo-creator' || command.kind === 'undo-social') return { ...fallback, kind: 'undo' };
    if (command.kind === 'social') {
      return { kind: 'change', serverAvailable: !!account, documents: [{ id: command.requestId, server: null,
        mine: { title: '공개·참여 작업 보관본', raw: JSON.stringify(command.intent, null, 2) } }],
        summaries: ['공개 판본·제안·답글은 자동으로 다시 적용하지 않습니다. 보관한 작업과 최신 내용을 확인한 뒤 다시 선택해 주세요.'] };
    }
    if (command.kind === 'creator') {
      const mine = command.intent.type === 'working' ? command.intent.working : null;
      const server = account?.space.creatorWorkspace?.working;
      return { kind: 'change', serverAvailable: !!account, documents: mine ? [{ id: mine.draftId,
        server: server?.draftId === mine.draftId ? { title: server.title, raw: server.nativePendingRawText ?? server.rawText } : null,
        mine: { title: mine.title, raw: mine.nativePendingRawText ?? mine.rawText } }] : [],
        summaries: ['제작 작업본·저장 판본·개인 인계는 자동으로 합치지 않습니다. 보관한 제작 입력과 최신 상태를 확인해 주세요.'] };
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

export function AlphaConflictReview({ draft, account, onCopy }: AlphaConflictReviewProps) {
  const comparison = inspectAlphaConflict(draft, account);
  if (comparison.kind === 'invalid') return <p role="alert">저장하려던 내용을 안전하게 비교하지 못했습니다. 작성 중인 원문을 보관해 주세요.</p>;
  if (comparison.kind === 'undo') return <p>되돌리려던 변경 뒤에 다른 내용이 저장되었습니다. 그 내용을 지우지 않도록 되돌리기를 멈췄습니다. 최신 내용을 확인해 주세요.</p>;
  return <section className={styles.review} aria-label="서버 내용과 내 변경 비교">
    {!comparison.serverAvailable && <p role="status">서버의 현재 내용을 아직 확인하지 못했습니다. 저장하려던 원문만 표시합니다.</p>}
    {comparison.documents.map((row, index) => {
      const title = row.mine?.title || row.server?.title || '제목 없는 문서';
      return <section className={styles.document} key={row.id} aria-label={`${title} 비교`}>
        <h3>{title}</h3>
        <div className={styles.columns}>
          <div className={styles.side}><label>서버 현재 원문
            {row.server && <>{row.mine && row.server.title !== row.mine.title && <span className={styles.title}>{row.server.title || '제목 없는 문서'}</span>}<textarea readOnly rows={8} aria-label={`${index + 1}. ${title} 서버 현재 원문`} value={row.server.raw} /></>}
          </label>{!row.server && <p>{comparison.serverAvailable ? '추가 차이 · 서버에 없는 문서입니다.' : '서버 내용을 확인한 뒤 비교할 수 있습니다.'}</p>}</div>
          <div className={styles.side}><label>저장하려던 원문
            {row.mine && <>{row.server && row.server.title !== row.mine.title && <span className={styles.title}>{row.mine.title || '제목 없는 문서'}</span>}<textarea readOnly rows={8} aria-label={`${index + 1}. ${title} 저장하려던 원문`} value={row.mine.raw} /></>}
          </label>{!row.mine && <p>삭제 차이 · 저장하려던 내용에는 이 문서가 없습니다.</p>}
            {row.mine && onCopy && <button type="button" onClick={() => { void onCopy(row.mine!.raw); }}>내 원문 복사</button>}
          </div>
        </div>
      </section>;
    })}
    {comparison.summaries.length > 0 && <div className={styles.summary}><p>함께 확인할 변경</p><ul>{comparison.summaries.map(label => <li key={label}>{label}</li>)}</ul></div>}
    {!comparison.documents.length && !comparison.summaries.length && <p>서버와 원문 차이가 없습니다. 최신 저장 상태를 다시 확인해 주세요.</p>}
  </section>;
}
