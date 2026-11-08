import type { ProgramCopy, ProgramPrivateSpace, ProgramPublicFlow, ProgramPublicItem, ProgramPublicVersion, ProgramSource } from './contract';
import { resolveProgramItemDate } from './private-space';
import { programRecurringScheduleLabel } from './public-recurrence-contract';
import { programOrdinaryTimingLabel } from './public-ordinary-time';
import { programImportItemView } from './public-repeat-import';
import { programDateLabel } from './date-label';
import type { ProgramImportSpan } from './import-preview';

// Flow 찾기 FC1·FC2 (planning/flow-content-20261030/FC-SPEC.md). Pure display values shared by the card, the
// detail and the import sheet; nothing here is stored and no version or flow field is added.

const FREQUENCY = { daily: '매일', weekly: '매주', monthly: '매월' } as const;

/** D2: one schedule shape per version, computed from its items. Recurring wins, then relative, then fixed. */
export function programVersionScheduleShape(version: Pick<ProgramPublicVersion, 'items'>): string {
  const recurring = version.items.flatMap(item => item.schedule.kind === 'recurring' ? [item.schedule.rule.frequency] : []);
  if (recurring.length) {
    const frequencies = new Set(recurring);
    return frequencies.size === 1 ? `${FREQUENCY[recurring[0]]} 반복 포함` : '반복 포함';
  }
  // 2차 리허설 (11/6): items that go in as repeat lines (공식 반복 Flow) read as repeating, not '날짜 미정': one is its
  // chip, more are '반복 할 일', and among one-time items '반복 포함'.
  const repeats = version.items.flatMap(item => { const view = programImportItemView(item); return view ? [view.label] : []; });
  if (repeats.length) return repeats.length < version.items.length ? '반복 포함' : repeats.length === 1 && repeats[0].startsWith('↻') ? repeats[0] : '반복 할 일';
  if (version.items.some(item => item.schedule.kind === 'relative')) return '기준일부터';
  if (version.items.some(item => item.schedule.kind === 'fixed')) return '날짜 지정';
  return '날짜 미정';
}

/** The copy of this Flow the user can open: its document exists and is not in the trash. */
export function programLiveCopy(space: ProgramPrivateSpace | undefined, flowId: string): ProgramCopy | undefined {
  if (!space) return undefined;
  return space.copies.find(copy => copy.flowId === flowId && !space.documentTrash?.[copy.documentId]
    && [...space.text.documents, ...space.text.flows].some(doc => doc.id === copy.documentId));
}
/** One map per render for the list: flowId → live copy. */
export function programLiveCopies(space: ProgramPrivateSpace | undefined): Map<string, ProgramCopy> {
  const result = new Map<string, ProgramCopy>();
  if (!space) return result;
  const live = new Set([...space.text.documents, ...space.text.flows].map(doc => doc.id));
  for (const copy of space.copies) if (!result.has(copy.flowId) && live.has(copy.documentId) && !space.documentTrash?.[copy.documentId]) result.set(copy.flowId, copy);
  return result;
}

export type ProgramFlowBadge = '미확인' | '출처 재검토 필요' | '내 문서에 있음';
/** One badge per card: unverified > source review > in my documents. D5: unverified is a `catalog-` Flow ID. */
export function programFlowBadge(input: { flowId: string; needsReview: boolean; inMyDocuments: boolean }): ProgramFlowBadge | null {
  if (input.flowId.startsWith('catalog-')) return '미확인';
  if (input.needsReview) return '출처 재검토 필요';
  return input.inMyDocuments ? '내 문서에 있음' : null;
}

/** "M/D" for a check date that starts with YYYY-MM-DD; anything else is shown as written. */
export function programCheckedDate(checkedAt: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(checkedAt.trim());
  return match ? `${Number(match[2])}/${Number(match[3])}` : checkedAt.trim();
}
/** S-a: the check date is shown only when the source records one. The label is never shortened here. */
export function programSourceLine(source: Pick<ProgramSource, 'kind' | 'label' | 'checkedAt'>): string {
  return [`출처 ${source.label}`, source.checkedAt?.trim() ? `${programCheckedDate(source.checkedAt)} 확인` : '',
    source.kind === 'simulated-example' ? '합성 예시' : ''].filter(Boolean).join(' · ');
}

export type ProgramFlowCardLines = { title: string; badge: ProgramFlowBadge | null; summary: string; firstItem: string | null; meta: string; source: string;
  /** Core3 P2 (11/8) three-line card: the tag beside the title, one summary line, and "할 일 n · 일정 모양 · 분야". */
  tag: ProgramFlowBadge | '공식' | null; oneLine: string; brief: string };
/** The card lines: the three-line card's (tag, oneLine, brief), and the longer ones the empty-account cards still use. */
export function programFlowCardLines(flow: ProgramPublicFlow, version: ProgramPublicVersion, context: { needsReview: boolean; inMyDocuments: boolean; official?: boolean; anchorLabel?: string | null }): ProgramFlowCardLines {
  const badge = programFlowBadge({ flowId: flow.id, needsReview: context.needsReview, inMyDocuments: context.inMyDocuments });
  return {
    title: version.title,
    badge,
    summary: version.summary.replace(/\s+/g, ' ').trim(),
    // P3 (11/6): a repeat item reads as on the detail, its words and then its chip, never the `@…` marker.
    firstItem: version.items[0] ? `첫 할 일 ${(view => view ? `${view.title} · ${view.label}` : version.items[0].title)(programImportItemView(version.items[0]))}` : null,
    meta: [`할 일 ${version.items.length}개`, programVersionScheduleShape(version), flow.category, ...flow.situations.slice(0, 2)].filter(Boolean).join(' · '),
    source: programSourceLine(version.source),
    tag: badge ?? (context.official ? '공식' : null),
    oneLine: programSummaryLine(version.summary),
    brief: [`할 일 ${version.items.length}`, programCardShape(version, context.anchorLabel ?? programSummaryAnchor(version.summary)), flow.category].filter(Boolean).join(' · '),
  };
}
/** Stage 2 writes a Flow's 기준일 name as its summary's first line ("기준일: 이사일"); the card's line is the rest. */
export function programSummaryAnchor(summary: string): string | null {
  return /^기준일: (.+)$/.exec(summary.split('\n')[0]?.trim() ?? '')?.[1]?.trim() || null;
}
export function programSummaryLine(summary: string): string {
  const lines = summary.split('\n');
  return (programSummaryAnchor(summary) ? lines.slice(1) : lines).join(' ').replace(/\s+/g, ' ').trim();
}
/** The card's schedule shape, as the approved mockup orders it: "↻ 반복" (every item repeats), "{기준일 이름} 기준"
 * (a 기준일 Flow, even with a repeat line in it), "반복 포함", "날짜 고정", "날짜 미정". */
export function programCardShape(version: Pick<ProgramPublicVersion, 'items'>, anchorLabel: string | null): string {
  const repeats = version.items.filter(item => item.schedule.kind === 'recurring' || !!programImportItemView(item)).length;
  if (repeats && repeats === version.items.length) return '↻ 반복';
  if (version.items.some(item => item.schedule.kind === 'relative')) return `${anchorLabel?.trim() || '기준일'} 기준`;
  if (repeats) return '반복 포함';
  if (version.items.some(item => item.schedule.kind === 'fixed')) return '날짜 고정';
  return '날짜 미정';
}

/** Newest public version first (the current version's createdAt); ties keep the stored order. */
export function programSortFlowsByRecent<T extends { flow: ProgramPublicFlow; version: ProgramPublicVersion }>(rows: T[]): T[] {
  return rows.map((row, index) => ({ row, index }))
    .sort((a, b) => b.row.version.createdAt.localeCompare(a.row.version.createdAt) || a.index - b.index).map(entry => entry.row);
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
/** "11/2 (월)" for a calendar date. */
export function programShortDate(date: string): string {
  const day = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(day.getTime()) ? date : `${day.getUTCMonth() + 1}/${day.getUTCDate()} (${WEEKDAY[day.getUTCDay()]})`;
}
/** A relative schedule without an anchor reads like "기준일 30일 전". */
export function programRelativeLabel(days: number): string {
  return days === 0 ? '기준일 당일' : `기준일 ${Math.abs(days)}일 ${days < 0 ? '전' : '후'}`;
}
/** The right-hand date of a detail row: the date the import would write with this anchor, else the schedule as written. */
export function programItemDateLabel(item: ProgramPublicItem, anchor: string | null): string {
  if (item.schedule.kind === 'recurring') return programRecurringScheduleLabel(item.schedule);
  const timing = programOrdinaryTimingLabel(item.schedule.timing);
  const resolved = resolveProgramItemDate(item, anchor);
  const base = resolved ? programShortDate(resolved) : item.schedule.kind === 'relative' ? programRelativeLabel(item.schedule.days) : '날짜 미정';
  return [base, timing].filter(Boolean).join(' · ');
}
/** Whether the version needs an anchor: a relative item, or a recurrence that starts from the anchor. */
export function programVersionUsesAnchor(version: Pick<ProgramPublicVersion, 'items'>, itemIds?: readonly string[]): boolean {
  return version.items.some(item => (!itemIds || itemIds.includes(item.id))
    && (item.schedule.kind === 'relative' || item.schedule.kind === 'recurring' && item.schedule.start.kind === 'relative'));
}

type ProgramImportCheck = { ok: true } | { ok: false; reason: string };
/** The output check also guards the import, but an import may leave the anchor empty: its relative dates
 *  then go in as 미정 (FC-SPEC FC2 sheet, "비워 두면 날짜 미정으로 들어갑니다"). The check stops at its first
 *  failure, so when the whole selection stops at a missing anchor every item is checked on its own: an
 *  anchor is the only thing an item may lack, and any other failure (a recurrence start past its end, say)
 *  still blocks the import whatever the item order. */
export function programImportCheckPasses(itemIds: readonly string[], check: (itemIds: string[]) => ProgramImportCheck): boolean {
  const whole = check([...itemIds]);
  if (whole.ok || whole.reason !== 'missing-anchor') return whole.ok;
  return itemIds.every(id => { const one = check([id]); return one.ok || one.reason === 'missing-anchor'; });
}
export const PROGRAM_IMPORT_GENERIC_FAILURE = '저장하지 못했습니다. 입력과 선택은 유지됩니다. 다시 시도해 주세요.';
/** D1 failure texts for the import sheet. A reason only counts when the screen shows its cause: 'conflict' is the
 *  copy conflict only when a copy with another version or anchor exists (the host also reports an external change
 *  as 'conflict'), and 'unresolved' is the source hold only while the Flow is held. */
export function programImportFailure(reason: string, context: { copyConflict: boolean; onHold: boolean }): { text: string; continueCopy: boolean } {
  if (reason === 'limit') return { text: 'Flow 문서가 100개라 더 가져올 수 없습니다. 휴지통과 보관함의 문서, 직접 만든 Flow도 함께 셉니다.', continueCopy: false };
  if (reason === 'conflict' && context.copyConflict) return { text: '이미 다른 버전(또는 기준일)으로 가져온 사본이 있습니다.', continueCopy: true };
  if (reason === 'unresolved' && context.onHold) return { text: '출처를 다시 확인하는 중이라 지금은 새로 가져올 수 없습니다.', continueCopy: false };
  return { text: PROGRAM_IMPORT_GENERIC_FAILURE, continueCopy: false };
}
/** 을 or 를 after a word: by the last Hangul syllable's final consonant; other endings read 을(를). */
export function programObjectParticle(word: string): string {
  const last = word.trim().slice(-1), code = last.charCodeAt(0) - 0xAC00;
  return code >= 0 && code <= 11171 ? code % 28 ? '을' : '를' : '을(를)';
}
/** Core3 P2c (UX, 11/8): a scroll of more than one line of the writing body (28px) closes a Flow's arrival toast. */
export const PROGRAM_ARRIVAL_TOAST_SCROLL = 32;
/** The arrival notice on the copy document. UX B1 (11/6): its [되돌리기] button stands for the undo (the notice no longer
 *  sends the person to 더보기); an account whose server undo is held gets the trash route instead. */
export function programImportArrivalNotice(title: string, undoHeld: boolean, repeats = '', span?: ProgramImportSpan & { today: string }): string {
  return `‘${title}’${programObjectParticle(title)} 가져왔습니다.${span ? ` ${programImportSpanText(span)}` : ''}${repeats ? ` ${repeats}` : ''}${span ? '' : ' 날짜가 있는 할 일은 오늘에도 보입니다.'}${undoHeld
    ? ' 필요 없으면 문서를 휴지통으로 옮길 수 있습니다. 다시 쓰려면 휴지통에서 복원합니다.' : ''}`;
}
/** Flow pipeline S2: "오늘부터 11월 21일까지 5개, 날짜 미정 1개." One day: "11월 12일에 2개."; none dated: where they are. */
export function programImportSpanText(span: ProgramImportSpan & { today: string }): string {
  const label = (date: string) => programDateLabel(date, span.today, false), undated = span.undated ? `날짜 미정 ${span.undated}개` : '';
  if (!span.first || !span.last || !span.dated) return undated ? `${undated}는 오늘 › 날짜 미정에 있습니다.` : '';
  const dated = span.first === span.last ? `${label(span.first)}에 ${span.dated}개` : `${label(span.first)}부터 ${label(span.last)}까지 ${span.dated}개`;
  return `${[dated, undated].filter(Boolean).join(', ')}.`;
}
/** 공식 반복 Flow: '반복 2개를 넣었습니다. 이미 있던 반복 1개는 넣지 않았습니다.' ('' with neither). */
export function programImportRepeatNotice(written: number, existing: number): string {
  return [written ? `반복 ${written}개를 넣었습니다.` : '', existing ? `이미 있던 반복 ${existing}개는 넣지 않았습니다.` : ''].filter(Boolean).join(' ');
}
/** The notice on a document an import went into the end of: links made, repeat lines written, ones I already had. */
export function programImportTargetNotice(linked: number, written: number, existing: number): string {
  const parts = [linked ? `할 일 ${linked}개` : '', written ? `반복 ${written}개` : ''].filter(Boolean);
  const skipped = existing ? `이미 있던 반복 ${existing}개는 넣지 않았습니다.` : '';
  return parts.length ? `문서 끝에 ${parts.join('와 ')}를 넣었습니다.${skipped ? ` ${skipped}` : ''}` : `${skipped || '이미 연결한 할 일입니다.'} 새로 넣은 것은 없습니다.`;
}
/** After 이번 가져오기 취소: repeat lines checked or changed since stay, and are said apart. */
export function programImportCancelNotice(outcome: { total: number; remaining: number; kept?: number; reason?: string }): string {
  const kept = outcome.kept ?? 0, removed = outcome.total - outcome.remaining - kept, keptText = kept ? `체크하거나 고친 반복 ${kept}개는 남겼습니다.` : '';
  if (outcome.reason === 'pending-input') return '입력 중인 내용을 저장한 뒤 취소할 수 있습니다.';
  if (outcome.remaining) return `${removed}개를 뺐습니다. 남은 연결 ${outcome.remaining}개는 다시 취소할 수 있습니다.${keptText ? ` ${keptText}` : ''}`;
  if (!removed && kept) return `${keptText} 뺀 것은 없습니다.`;
  return `넣은 할 일을 뺐습니다.${keptText ? ` ${keptText}` : ''} 사본 문서와 원래 할 일·진행 기록은 그대로 남아 있습니다.`;
}
