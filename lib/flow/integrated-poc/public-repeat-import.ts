import type { ProgramPrivateSpace, ProgramPublicItem, ProgramPublicVersion } from './contract';
import { programDate } from './program-data';
import { textWorkspaceModel as M, type TextLine } from './text-workspace';
import { parseProgramRepeatWords, programRepeatFirstDate, programRepeatFixed, programRepeatLabel, programRepeatTitle, readProgramRepeatMarker, type ProgramRepeatRule } from './repeat-line';

/** 공식 반복 Flow 가져오기 (11/5 결정 1·2): a public item that is one repeat line — undated, nothing under it, its title
 *  ending in a marker (`@매주 월 목`) or in `@?개월마다` (the months are chosen when importing) — is written into my
 *  document as a line of my own, not linked as a copy item, so it repeats as any line I wrote. One whose words a repeat
 *  line of mine already has is not written again, whatever its rule. */
export const PROGRAM_PICK_MONTHS = /\s@\?개월마다$/;
export const PROGRAM_PICK_MONTHS_MAX = 24;
export type ProgramImportRepeat = {
  itemId: string;
  /** The words without the marker; the marker as published (null for months to choose). */
  title: string; marker: string | null; rule: ProgramRepeatRule | null; pick: boolean;
  /** A repeat line of mine with these words: where, its marker, and whether the rule is the same. */
  existing: { documentTitle: string; marker: string; same: boolean } | null;
};

export function programImportRepeatOf(item: ProgramPublicItem): Omit<ProgramImportRepeat, 'itemId' | 'existing'> | null {
  if (item.schedule.kind !== 'undated' || item.subchecks.length) return null;
  if (PROGRAM_PICK_MONTHS.test(item.title)) {
    const title = item.title.replace(PROGRAM_PICK_MONTHS, '').trim();
    return title ? { title, marker: null, rule: null, pick: true } : null;
  }
  const marker = readProgramRepeatMarker(item.title);
  return marker ? { title: programRepeatTitle(item.title).trim(), marker: marker.text, rule: marker.rule, pick: false } : null;
}

/** PROPOSAL 5-5: the same words whatever the spaces and case ('근력운동하기' is '근력 운동 하기'). */
const words = (title: string) => title.replace(/\s+/g, '').toLocaleLowerCase('ko-KR');
/** The version's repeat items (those listed in `itemIds`, when given), each with a repeat line of mine it would repeat:
 *  one in any document or copy document, not finished, not trashed or archived, not a copy's own item. */
export function programImportRepeats(space: ProgramPrivateSpace | undefined, version: ProgramPublicVersion, itemIds?: readonly string[]): ProgramImportRepeat[] {
  const copied = new Set(space?.copies.flatMap(copy => Object.values(copy.itemLines)) ?? []);
  const mine = space ? M.tasks(space.text).filter(task => !task.done && !copied.has(task.id) && !space.documentTrash?.[task.docId]
    && !space.archivedDocumentIds.includes(task.docId) && readProgramRepeatMarker(task.title)) : [];
  const titleOf = (docId: string) => space ? [...space.text.documents, ...space.text.flows].find(doc => doc.id === docId)?.title ?? '' : '';
  return version.items.filter(item => !itemIds || itemIds.includes(item.id)).flatMap(item => {
    const repeat = programImportRepeatOf(item);
    if (!repeat) return [];
    const found = mine.find(task => words(programRepeatTitle(task.title)) === words(repeat.title)), theirs = found && readProgramRepeatMarker(found.title);
    return [{ itemId: item.id, ...repeat, existing: found && theirs
      ? { documentTitle: titleOf(found.docId), marker: theirs.text, same: !!repeat.rule && programRepeatLabel(theirs.rule) === programRepeatLabel(repeat.rule) } : null }];
  });
}

/** The rule a line gets: as published, or `@{n}개월마다` for the months chosen; null with no months chosen. */
export function programImportRepeatRule(repeat: Pick<ProgramImportRepeat, 'rule' | 'pick'>, months?: number | null): ProgramRepeatRule | null {
  return repeat.pick ? programImportMonths(months) ? parseProgramRepeatWords(`${months}개월마다`) : null : repeat.rule;
}
export const programImportMonths = (months: unknown): months is number => Number.isInteger(months) && (months as number) >= 1 && (months as number) <= PROGRAM_PICK_MONTHS_MAX;
/** The first date when none is chosen: N10's first round from today (today or the next named day; today plus the
 *  interval for an interval rule). */
export function programImportFirstDate(rule: ProgramRepeatRule, today: string): string | null {
  const date = programRepeatFirstDate(rule, today);
  return programDate(date) ? date : null;
}

/** The detail row of a repeat item: its words without the marker and its chip, or '가져올 때 주기 고름'. */
export function programImportItemView(item: ProgramPublicItem): { title: string; label: string } | null {
  const repeat = programImportRepeatOf(item);
  return repeat ? { title: repeat.title, label: repeat.rule ? `↻ ${programRepeatLabel(repeat.rule)}` : '가져올 때 주기 고름' } : null;
}
/** What the sheet sends: every line it writes with a rule gets its first date (the one chosen; N10's from today when
 *  left empty), and the months typed. null while a months box holds anything but 1-24. */
export function programImportRepeatChoice(repeats: readonly ProgramImportRepeat[], chosen: { starts: Record<string, string>; months: Record<string, string> }, today: string):
  { repeatStarts?: Record<string, string>; repeatMonths?: Record<string, number> } | null {
  const repeatStarts: Record<string, string> = {}, repeatMonths: Record<string, number> = {};
  for (const repeat of repeats.filter(row => !row.existing)) {
    const typed = repeat.pick ? (chosen.months[repeat.itemId] ?? '').trim() : '';
    if (typed && !(/^\d{1,2}$/.test(typed) && programImportMonths(Number(typed)))) return null;
    if (typed) repeatMonths[repeat.itemId] = Number(typed);
    const rule = programImportRepeatRule(repeat, typed ? Number(typed) : null);
    if (!rule) continue;
    const start = !programRepeatFixed(rule) && programDate(chosen.starts[repeat.itemId]) ? chosen.starts[repeat.itemId] : programImportFirstDate(rule, today);
    if (!start) return null;
    repeatStarts[repeat.itemId] = start;
  }
  return { ...(Object.keys(repeatStarts).length ? { repeatStarts } : {}), ...(Object.keys(repeatMonths).length ? { repeatMonths } : {}) };
}

export const programImportSentence = (text: string) => {
  const line = text.replace(/\s+/g, ' ').trim(), match = /^(.+?[.!?])(?:\s|$)/.exec(line);
  return (match ? match[1] : line).slice(0, 200);
};
/** P3 (11/6): a description's caution lines (`주의(FlowMe 안내): …`, `주의: …`), each whole on one line. */
export const programImportCautions = (text: string) => text.split('\n').map(line => line.replace(/\s+/g, ' ').trim())
  .filter(line => /^주의\s*[(:：]/.test(line)).map(line => line.slice(0, 300));
/** The lines one repeat item becomes: the task with its marker (`@{n}개월마다` for the months chosen, none when none
 *  were: then a plain task in 날짜 미정), its first date, a memo naming the Flow with the description's first
 *  sentence, and a memo for each caution line, so its safety words come along (the rest stays in the copy's source
 *  view). */
export function programImportRepeatLines(item: ProgramPublicItem, repeat: ProgramImportRepeat, flowTitle: string, lineId: string, months: number | null, start: string | null): TextLine[] {
  const title = repeat.pick ? months ? `${repeat.title} @${months}개월마다` : repeat.title : item.title.trim(), sentence = programImportSentence(item.description);
  const cautions = programImportCautions(item.description).filter(line => line !== sentence);
  return [{ id: lineId, text: `- [ ] ${title}` }, { id: `${lineId}:date`, text: `  - 날짜: ${start ?? '미정'}` },
    { id: `${lineId}:memo`, text: `  - 메모: ‘${flowTitle.trim()}’에서${sentence ? ` · ${sentence}` : ''}` },
    ...cautions.map((line, index) => ({ id: `${lineId}:caution${index ? `-${index}` : ''}`, text: `  - 메모: ${line}` }))];
}
/** Lines an import wrote are named so: its 되돌리기 finds them again (and what was written under them). */
export const PROGRAM_IMPORT_REPEAT_LINE = 'repeat-line';
