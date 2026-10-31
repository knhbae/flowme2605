import type { ProgramCopy, ProgramPrivateSpace, ProgramPublicFlow, ProgramPublicItem, ProgramPublicVersion, ProgramSource } from './contract';
import { resolveProgramItemDate } from './private-space';
import { programRecurringScheduleLabel } from './public-recurrence-contract';
import { programOrdinaryTimingLabel } from './public-ordinary-time';

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

export type ProgramFlowCardLines = { title: string; badge: ProgramFlowBadge | null; summary: string; firstItem: string | null; meta: string; source: string };
/** The six card lines (390px): title + badge, two summary lines, first task, counts and tags, source. */
export function programFlowCardLines(flow: ProgramPublicFlow, version: ProgramPublicVersion, context: { needsReview: boolean; inMyDocuments: boolean }): ProgramFlowCardLines {
  return {
    title: version.title,
    badge: programFlowBadge({ flowId: flow.id, ...context }),
    summary: version.summary.replace(/\s+/g, ' ').trim(),
    firstItem: version.items[0] ? `첫 할 일 ${version.items[0].title}` : null,
    meta: [`할 일 ${version.items.length}개`, programVersionScheduleShape(version), flow.category, ...flow.situations.slice(0, 2)].filter(Boolean).join(' · '),
    source: programSourceLine(version.source),
  };
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

export const PROGRAM_IMPORT_GENERIC_FAILURE = '저장하지 못했습니다. 입력과 선택은 유지됩니다. 다시 시도해 주세요.';
/** D1 failure texts for the import sheet. A reason only counts when the screen shows its cause: 'conflict' is the
 *  copy conflict only when a copy with another version or anchor exists (the host also reports an external change
 *  as 'conflict'), and 'unresolved' is the source hold only while the Flow is held. */
export function programImportFailure(reason: string, context: { copyConflict: boolean; onHold: boolean }): { text: string; continueCopy: boolean } {
  if (reason === 'limit') return { text: 'Flow 문서가 100개라 더 가져올 수 없습니다. 휴지통과 보관함의 문서, 직접 만든 Flow도 함께 셉니다.', continueCopy: false };
  if (reason === 'conflict' && context.copyConflict) return { text: '이미 다른 판본(또는 기준일)으로 가져온 사본이 있습니다.', continueCopy: true };
  if (reason === 'unresolved' && context.onHold) return { text: '출처를 다시 확인하는 중이라 지금은 새로 가져올 수 없습니다.', continueCopy: false };
  return { text: PROGRAM_IMPORT_GENERIC_FAILURE, continueCopy: false };
}
/** 을 or 를 after a word: by the last Hangul syllable's final consonant; other endings read 을(를). */
export function programObjectParticle(word: string): string {
  const last = word.trim().slice(-1), code = last.charCodeAt(0) - 0xAC00;
  return code >= 0 && code <= 11171 ? code % 28 ? '을' : '를' : '을(를)';
}
/** The arrival notice on the copy document; an account whose server undo is held gets the trash route instead. */
export function programImportArrivalNotice(title: string, undoHeld: boolean): string {
  return `‘${title}’${programObjectParticle(title)} 가져왔습니다. 날짜가 있는 할 일은 오늘에도 보입니다. ${undoHeld
    ? '필요 없으면 문서를 휴지통으로 옮길 수 있습니다. 다시 쓰려면 휴지통에서 복원합니다.'
    : '필요 없으면 더보기 › 되돌리기로 취소할 수 있습니다.'}`;
}
