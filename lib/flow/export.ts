import { addDays, formatDate, formatLocalDate, getRangeEnd } from './date';
import { getArtifactPlan } from './artifact-plan';
import { getComparisonConfig, getComparisonRows, getHoldMemoFields, getLogTables, getMemoCardFields } from './artifact-fields';
import { foldIcsContentLine } from './ics';
import { timingLabel } from './parser';
import { FlowBundle, FlowComparisonState, FlowItem, FlowItemState, FlowWorkbenchState, MealSlot, ReactionLog } from './types';

const anchorLabelByType = {
  start_date: '시작일',
  end_date: '목표일',
  baby_age_month: '기준 월령',
  baby_birth_date: '아이 생년월일',
  none: '기준값 없음',
};

const structureLabels: Record<string, string> = {
  timeline: 'timeline',
  phase: 'phase',
  routine: 'routine',
  checklist: 'checklist',
  meal_plan: 'meal_plan',
};

const riskLabels: Record<string, string> = {
  low: '낮은 위험',
  medium: '주의 필요',
  medical_sensitive: '의료 주의',
  financial_sensitive: '재정 주의',
};

const categoryAccentColors: Record<string, string> = {
  이사: '1264F0',
  '육아/이유식': 'A16207',
  '운동/홈트': 'B91C1C',
  '커리어/이직': '0F766E',
  '여행/해외': '7C3AED',
  '세금/연말정산': '4B5563',
};

export type WorkbookCell = string | number | boolean;

export type WorkbookSheet = {
  name: string;
  columns: string[];
  rows: WorkbookCell[][];
  accentColor?: string;
  note?: string;
};

export type WorkbookExportOptions = {
  weekdays?: string[];
  reactionLogs?: Record<string, ReactionLog>;
  itemStates?: Record<string, FlowItemState>;
  comparisonState?: FlowComparisonState;
  workbenchState?: FlowWorkbenchState;
};

const icsWeekdays: Record<string, string> = {
  월: 'MO',
  화: 'TU',
  수: 'WE',
  목: 'TH',
  금: 'FR',
  토: 'SA',
  일: 'SU',
};

const executionColumns = [
  '상태',
  '시점',
  '날짜',
  '섹션',
  '실행 내용',
  '완료 기준',
  '바로가기',
  '내 메모',
];

const detailColumns = ['실행 내용', '섹션', '왜 필요한가', '실행 방법', '주의', '출처/링크'];
const comparisonFirstColumn = '비교 항목';

const reactionColumns = [
  '시점',
  '날짜 범위',
  '메뉴',
  '새 재료',
  '먹은 양',
  '먹인 시간',
  '피부 반응',
  '구토/설사 여부',
  '변 상태',
  '수면 변화',
  '거부/선호 메모',
];

const mealCalendarOnlySlugs = new Set(['baby-food-menu-recipe']);
const staleLogStateIgnoredSlugs = new Set(['computer-skills-d30-study']);

const weekdayColumns = ['월', '화', '수', '목', '금', '토', '일'];
const weeklyColumns = ['주', ...weekdayColumns];
const monthlyColumns = ['월/주', ...weekdayColumns];
const genericCompletionCriteria = '이 항목을 완료했어요.';

function getItemDate(item: FlowItem, anchor?: string): string {
  if (!anchor || item.day_offset === undefined) return '';
  return formatDate(addDays(new Date(anchor), item.day_offset));
}

function getItemDates(
  item: FlowItem,
  anchor?: string,
): { startDate: string; endDate: string } {
  const startDate = getItemDate(item, anchor);
  if (!startDate) return { startDate: '', endDate: '' };
  if (item.date_window) {
    const anchorDate = new Date(anchor ?? startDate);
    return {
      startDate: formatDate(addDays(anchorDate, item.date_window.start_day_offset)),
      endDate: formatDate(addDays(anchorDate, item.date_window.end_day_offset)),
    };
  }
  return {
    startDate,
    endDate:
      item.duration_days && item.duration_days > 1
        ? formatDate(getRangeEnd(new Date(startDate), item.duration_days))
        : '',
  };
}

function getItemTimingLabel(item: FlowItem): string {
  return item.date_window?.label ?? timingLabel(item.day_offset, item.duration_days);
}

function getMealDates(
  slot: MealSlot,
  anchor?: string,
): { startDate: string; endDate: string } {
  if (!anchor) return { startDate: '', endDate: '' };
  const start = addDays(new Date(anchor), slot.day_offset);
  return {
    startDate: formatDate(start),
    endDate: formatDate(getRangeEnd(start, slot.duration_days)),
  };
}

function doneLabel(done: boolean): string {
  return done ? '완료' : '미완료';
}

function itemStatusLabel(done: boolean, state?: FlowItemState): string {
  if (state?.skipped) return '스킵';
  return doneLabel(done);
}

function getTypeLabel(bundle: FlowBundle): string {
  return bundle.flow.content_type === 'meal_plan'
    ? structureLabels.meal_plan
    : structureLabels[bundle.flow.structure_type];
}

function getAccentColor(bundle: FlowBundle): string {
  return categoryAccentColors[bundle.flow.category] ?? '2563EB';
}

function getSectionTitle(bundle: FlowBundle, sectionId?: string): string {
  return bundle.sections.find((section) => section.id === sectionId)?.title ?? '';
}

function sourceNote(bundle: FlowBundle, itemRisk?: string): string {
  const notes = [];
  const risk = itemRisk ?? bundle.flow.risk_level;
  if (risk) notes.push(riskLabels[risk] ?? risk);
  if (bundle.flow.source_title) notes.push(bundle.flow.source_title);
  return notes.filter(Boolean).join(' / ');
}

function recipeTextList(values: string[]): string {
  return values.filter(Boolean).join('\n');
}

function getItemDetail(bundle: FlowBundle, itemId: string) {
  return bundle.itemDetails?.find((detail) => detail.item_id === itemId);
}

function linkList(detail: ReturnType<typeof getItemDetail>): string {
  return (detail?.links ?? []).map((link) => `${link.label}: ${link.url}`).join('\n');
}

function linkLabelList(detail: ReturnType<typeof getItemDetail>): string {
  return (detail?.links ?? []).map((link) => link.label).join(', ');
}

function completionCriteria(detail: ReturnType<typeof getItemDetail>): string {
  if (!detail?.completion_criteria || detail.completion_criteria === genericCompletionCriteria) return '';
  return detail.completion_criteria;
}

function userFacingExportSourceText(value?: string): string {
  if (!value) return '';
  return value
    .split(/\r?\n/u)
    .filter((line) => !/^\s*(?:sourceTrace|source\s+trace|원문\s*근거)\s*[:：]/iu.test(line))
    .join('\n')
    .replace(/\bsource-backed\b/giu, '원문 기반')
    .replace(/\bCanonical\s+URL\b/giu, '원문 주소')
    .replace(/\bhandoff\b/giu, '전달')
    .replace(/\bMarkdown\b/giu, '메모 문서')
    .replace(/\bStep으로/gu, '할 일로')
    .replace(/\bStep을/gu, '할 일을')
    .replace(/\bStep이/gu, '할 일이')
    .replace(/\bStep은/gu, '할 일은')
    .replace(/\bStep과/gu, '할 일과')
    .replace(/\bStep에서/gu, '할 일에서')
    .replace(/\bItem으로/gu, '확인 항목으로')
    .replace(/\bItem을/gu, '확인 항목을')
    .replace(/\bItem이/gu, '확인 항목이')
    .replace(/\bStep\b/gu, '할 일')
    .replace(/\bItem\b/gu, '확인 항목')
    .trim();
}

function getExecutableIds(bundle: FlowBundle): string[] {
  return bundle.flow.content_type === 'meal_plan'
    ? (bundle.mealSlots ?? []).map((slot) => slot.id)
    : bundle.items.map((item) => item.id);
}

function isExactVideoFlow(bundle: FlowBundle): boolean {
  return Boolean(bundle.flow.tags?.includes('exact-video') && bundle.flow.source_url?.includes('youtube.com/watch'));
}

function getProgressLabel(
  bundle: FlowBundle,
  checks: Record<string, boolean>,
  itemStates: Record<string, FlowItemState> = {},
): string {
  const ids = getExecutableIds(bundle).filter((id) => !itemStates[id]?.skipped);
  const done = ids.filter((id) => checks[id]).length;
  const total = ids.length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return `${done} / ${total} (${percent}%)`;
}

function getWeekStart(date: string): string {
  const value = new Date(date);
  const day = value.getDay();
  return formatDate(addDays(value, day === 0 ? -6 : 1 - day));
}

type CalendarExportRow = {
  id: string;
  date: string;
  timing: string;
  section: string;
  title: string;
  status: string;
};

function buildCalendarRows(
  bundle: FlowBundle,
  checks: Record<string, boolean>,
  anchor?: string,
  itemStates: Record<string, FlowItemState> = {},
): CalendarExportRow[] {
  if (!anchor) return [];
  const rows: CalendarExportRow[] = [];

  for (const section of bundle.sections) {
    for (const item of bundle.items.filter((entry) => entry.section_id === section.id && entry.day_offset !== undefined)) {
      const { startDate } = getItemDates(item, anchor);
      if (!startDate) continue;
      const duration = Math.max(item.duration_days ?? 1, 1);
      for (let index = 0; index < duration; index += 1) {
        rows.push({
          id: item.id,
          date: formatDate(addDays(new Date(startDate), index)),
          timing: getItemTimingLabel(item),
          section: section.title,
          title: duration > 1 ? `${item.title} ${index + 1}일차` : item.title,
          status: itemStatusLabel(Boolean(checks[item.id]), itemStates[item.id]),
        });
      }
    }
  }

  for (const slot of bundle.mealSlots ?? []) {
    const { startDate } = getMealDates(slot, anchor);
    if (!startDate) continue;
    for (let index = 0; index < slot.duration_days; index += 1) {
      rows.push({
        id: slot.id,
        date: formatDate(addDays(new Date(startDate), index)),
        timing: timingLabel(slot.day_offset, slot.duration_days),
        section: getSectionTitle(bundle, slot.section_id),
        title: slot.duration_days > 1 ? `${slot.menu_title} ${index + 1}일차` : slot.menu_title,
        status: itemStatusLabel(Boolean(checks[slot.id]), itemStates[slot.id]),
      });
    }
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

function getWeekdayIndex(date: string): number {
  const day = new Date(date).getDay();
  return day === 0 ? 6 : day - 1;
}

function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function groupCalendarRowsByDate(rows: CalendarExportRow[]): Map<string, CalendarExportRow[]> {
  const grouped = new Map<string, CalendarExportRow[]>();
  for (const row of rows) {
    const current = grouped.get(row.date) ?? [];
    current.push(row);
    grouped.set(row.date, current);
  }
  return grouped;
}

function calendarCell(date: string, rows: CalendarExportRow[] = []): string {
  const lines = [date.slice(5).replace('-', '.')];
  for (const row of rows) {
    const marker = row.status === '완료' ? '✓' : '□';
    lines.push(`${marker} ${row.timing} ${row.title}`);
  }
  return lines.join('\n');
}

function buildWeeklyGridRows(rows: CalendarExportRow[]): WorkbookCell[][] {
  const byDate = groupCalendarRowsByDate(rows);
  const weekStarts = Array.from(new Set(rows.map((row) => getWeekStart(row.date)))).sort();

  return weekStarts.map((weekStart) => [
    `${weekStart} 주`,
    ...weekdayColumns.map((_, index) => {
      const date = formatDate(addDays(new Date(weekStart), index));
      return calendarCell(date, byDate.get(date));
    }),
  ]);
}

function buildMonthlyGridRows(rows: CalendarExportRow[]): WorkbookCell[][] {
  const byDate = groupCalendarRowsByDate(rows);
  const months = Array.from(new Set(rows.map((row) => row.date.slice(0, 7)))).sort();
  const gridRows: WorkbookCell[][] = [];

  for (const month of months) {
    const firstDay = new Date(`${month}-01`);
    const lastDay = getMonthEnd(firstDay);
    let cursor = new Date(getWeekStart(formatDate(firstDay)));
    const gridEnd = addDays(new Date(getWeekStart(formatDate(lastDay))), 6);
    let weekNumber = 1;

    gridRows.push([month, '', '', '', '', '', '', '']);

    while (cursor <= gridEnd) {
      const weekRow: WorkbookCell[] = [`${weekNumber}주차`, '', '', '', '', '', '', ''];
      for (let index = 0; index < 7; index += 1) {
        const date = formatDate(addDays(cursor, index));
        if (date.slice(0, 7) === month) {
          weekRow[index + 1] = calendarCell(date, byDate.get(date));
        }
      }
      gridRows.push(weekRow);
      cursor = addDays(cursor, 7);
      weekNumber += 1;
    }
  }

  return gridRows;
}

function comparisonCandidates(comparisonState?: FlowComparisonState): { id: string; name: string }[] {
  return (comparisonState?.candidates ?? [])
    .map((candidate, index) => ({
      id: candidate.id,
      name: candidate.name.trim() || `후보 ${index + 1}`,
    }))
    .filter((candidate) => candidate.id);
}

function hasComparisonData(comparisonState?: FlowComparisonState): boolean {
  const candidates = comparisonCandidates(comparisonState);
  if (!candidates.length) return false;
  if (candidates.some((candidate) => candidate.name.trim())) return true;
  return Object.values(comparisonState?.notes ?? {}).some((row) =>
    Object.values(row).some((note) => note.trim()),
  );
}

function buildComparisonExport(
  bundle: FlowBundle,
  comparisonState?: FlowComparisonState,
): { columns: string[]; rows: WorkbookCell[][] } | undefined {
  if (!hasComparisonData(comparisonState)) return undefined;
  const plan = getArtifactPlan(bundle);
  if (plan.primarySurface !== 'decision_table' && !getComparisonConfig(bundle)) return undefined;

  const candidates = comparisonCandidates(comparisonState);
  const comparisonRows = getComparisonRows(bundle);
  return {
    columns: [comparisonFirstColumn, ...candidates.map((candidate) => candidate.name)],
    rows: comparisonRows.map((row, index) => {
      const legacyItemId = bundle.items[index]?.id;
      return [
        row.title,
        ...candidates.map((candidate) => (
          comparisonState?.notes?.[row.id]?.[candidate.id]?.trim()
          ?? (legacyItemId ? comparisonState?.notes?.[legacyItemId]?.[candidate.id]?.trim() : undefined)
          ?? ''
        )),
      ];
    }),
  };
}

function appendComparisonExport(
  lines: string[],
  comparison: { columns: string[]; rows: WorkbookCell[][] } | undefined,
) {
  if (!comparison) return;

  lines.push('', '[후보 비교표]');
  lines.push(comparison.columns.join(' | '));
  for (const row of comparison.rows) {
    lines.push(row.map((cell) => String(cell)).join(' | '));
  }
}

const workbenchColumns = ['유형', '날짜/회차', '항목', '값'];

function sortedEntries<T>(value: Record<string, T>): [string, T][] {
  return Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
}

function occurrenceLabel(key: string): { date: string; session: string } {
  const [date, session] = key.split(':');
  return {
    date: date || key,
    session: session ? `${session}회차` : key,
  };
}

function buildWorkbenchRows(bundle: FlowBundle, state?: FlowWorkbenchState): WorkbookCell[][] {
  if (!state) return [];
  const rows: WorkbookCell[][] = [];
  const logRowLabels = new Map<string, string>();
  const logFieldLabels = new Map<string, string>();
  const knownLogRows = new Set<string>();
  for (const table of getLogTables(bundle)) {
    for (const column of table.columns) logFieldLabels.set(column.id, column.label);
    for (const row of table.rows) {
      knownLogRows.add(row.id);
      logRowLabels.set(row.id, row.label);
      const userValues = { ...(state.logRows?.[row.id] ?? {}) };
      for (const columnId of table.readOnlyColumnIds ?? []) {
        delete userValues[columnId];
      }
      const mergedValues = {
        ...(row.defaultValues ?? {}),
        ...userValues,
      };
      for (const [field, value] of sortedEntries(mergedValues)) {
        if (!value.trim()) continue;
        rows.push(['기록', row.label, logFieldLabels.get(field) ?? field, value.trim()]);
      }
    }
  }

  for (const [key, entry] of sortedEntries(state.occurrences ?? {})) {
    const note = entry.note?.trim() ?? '';
    if (!entry.done && !note) continue;
    const label = occurrenceLabel(key);
    rows.push([
      '회차',
      label.date,
      label.session,
      [entry.done ? '완료' : '', note].filter(Boolean).join(' - '),
    ]);
  }

  if (!staleLogStateIgnoredSlugs.has(bundle.flow.slug)) {
    for (const [date, logRow] of sortedEntries(state.logRows ?? {})) {
      if (knownLogRows.has(date)) continue;
      for (const [field, value] of sortedEntries(logRow)) {
        if (!value.trim()) continue;
        rows.push(['기록', logRowLabels.get(date) ?? date, logFieldLabels.get(field) ?? field, value.trim()]);
      }
    }
  }

  for (const field of getMemoCardFieldsFromState(bundle, state)) {
    const value = state.memoCards?.[field.id]?.trim() ?? '';
    if (!value) continue;
    rows.push(['메모', '', field.label, value]);
  }

  if (state.weeklyReview?.trim()) {
    rows.push(['리뷰', '', '주간 리뷰', state.weeklyReview.trim()]);
  }

  return rows;
}

function getMemoCardFieldsFromState(bundle: FlowBundle, state: FlowWorkbenchState) {
  const fields = [...getMemoCardFields(bundle), ...getHoldMemoFields(bundle)];
  if (!fields.length) return [];
  const known = new Set(fields.map((field) => field.id));
  const dynamicFields = Object.keys(state.memoCards ?? {})
    .filter((id) => !known.has(id))
    .map((id) => ({ id, label: id, placeholder: '' }));
  return [...fields, ...dynamicFields];
}

function appendHoldSectionText(lines: string[], bundle: FlowBundle) {
  const section = bundle.flow.hold_section;
  if (!section) return;

  lines.push(`보류 기준: ${section.title}`);
  for (const reason of section.reasons) {
    lines.push(`- ${reason}`);
  }
  lines.push(`보류 메모 양식: ${section.memo_template}`);
}

function appendWorkbenchText(lines: string[], rows: WorkbookCell[][]) {
  if (!rows.length) return;
  lines.push('', '## 실행판 기록');
  for (const row of rows) {
    const [kind, dateOrSession, item, value] = row.map((cell) => String(cell));
    if (kind === '회차') {
      lines.push(`${item}: ${value}`);
    } else if (kind === '기록') {
      lines.push(`${dateOrSession} ${item}: ${value}`);
    } else {
      lines.push(`${item}: ${value}`);
    }
  }
}

export function buildText(
  bundle: FlowBundle,
  checks: Record<string, boolean>,
  anchor?: string,
  itemStates: Record<string, FlowItemState> = {},
  comparisonState?: FlowComparisonState,
  workbenchState?: FlowWorkbenchState,
): string {
  const lines = [bundle.flow.title];
  const anchorLabel = getExportAnchorLabel(bundle);
  lines.push(`${anchorLabel}: ${anchor || (bundle.flow.anchor_type === 'none' ? '없음' : '')}`);
  if (bundle.flow.warning) lines.push(`주의: ${userFacingExportSourceText(bundle.flow.warning)}`);
  appendHoldSectionText(lines, bundle);
  const artifactPlan = getArtifactPlan(bundle);
  const comparison = buildComparisonExport(bundle, comparisonState);
  const workbenchRows = buildWorkbenchRows(bundle, workbenchState);

  if (bundle.flow.content_type === 'meal_plan') {
    for (const section of bundle.sections) {
      lines.push('', `[${section.title}]`);
      for (const slot of (bundle.mealSlots ?? []).filter((meal) => meal.section_id === section.id)) {
        const { startDate, endDate } = getMealDates(slot, anchor);
        const timing = timingLabel(slot.day_offset, slot.duration_days);
        const recipe = bundle.recipes?.find((item) => item.id === slot.recipe_id);
        lines.push(`[${timing}${startDate ? ` / ${startDate} ~ ${endDate}` : ''}]`);
        const state = itemStates[slot.id];
        const checkbox = checks[slot.id] ? '[x]' : '[ ]';
        lines.push(`- ${checkbox} ${slot.menu_title}${state?.skipped ? ' (스킵)' : ''}`);
        lines.push(`  새 재료: ${slot.new_ingredients.join(', ')}`);
        if (state?.note?.trim()) lines.push(`  메모: ${state.note.trim()}`);
        if (recipe) lines.push(`  레시피: ${recipe.title}`);
      }
    }
    appendWorkbenchText(lines, workbenchRows);
    return lines.join('\n').trim();
  }

  if (artifactPlan.primarySurface === 'spreadsheet_log') {
    lines.push('', '## 기록표');
    lines.push('날짜별 식단, 운동, 측정, 컨디션을 기록하세요.');
  }

  if (artifactPlan.primarySurface === 'decision_table') {
    appendComparisonExport(lines, comparison);
  }

  for (const section of bundle.sections) {
    lines.push('', `[${section.title}]`);
    for (const item of bundle.items.filter((entry) => entry.section_id === section.id)) {
      const timing = getItemTimingLabel(item);
      const { startDate, endDate } = getItemDates(item, anchor);
      const date = endDate ? `${startDate} ~ ${endDate}` : startDate;
      if (timing || date) lines.push(`[${timing}${date ? ` / ${date}` : ''}]`);
      const state = itemStates[item.id];
      // Markdown checkbox so the pasted memo renders as a real checklist in
      // Notion / Obsidian / Apple Notes / Google Keep. Skipped items stay
      // unchecked with a (스킵) label since those apps have no skip state.
      const checkbox = checks[item.id] ? '[x]' : '[ ]';
      lines.push(`- ${checkbox} ${item.title}${state?.skipped ? ' (스킵)' : ''}`);
      if (item.description?.trim()) lines.push(`  설명: ${userFacingExportSourceText(item.description)}`);
      if (state?.note?.trim()) lines.push(`  메모: ${state.note.trim()}`);
      const detail = getItemDetail(bundle, item.id);
      const done = completionCriteria(detail);
      if (done) lines.push(`  완료 기준: ${userFacingExportSourceText(done)}`);
      // Carry the official handoff link into the memo — for a memo-destination
      // checklist this is the action target the user returns to (정부24, 복지로 등).
      for (const link of detail?.links ?? []) lines.push(`  링크: ${link.label} - ${link.url}`);
    }
  }

  if (artifactPlan.primarySurface !== 'decision_table') {
    appendComparisonExport(lines, comparison);
  }
  appendWorkbenchText(lines, workbenchRows);

  return lines.join('\n').trim();
}

function compactDate(value: string): string {
  return value.replaceAll('-', '');
}

function getExportAnchorLabel(bundle: FlowBundle): string {
  if (bundle.flow.anchor_type === 'none') return anchorLabelByType.none;
  if (bundle.flow.content_type === 'meal_plan') return '이유식 시작일';
  if (bundle.flow.category.includes('건강/검진')) return '검진일';
  if (bundle.flow.category.includes('여행')) return '출국일';
  if (bundle.flow.category.includes('결혼')) return '예식일';
  if (bundle.flow.category.includes('공부/시험') || bundle.flow.category.includes('시험') || bundle.flow.category.includes('자격증')) return '시험일';
  if (bundle.flow.category.includes('자동차/관리')) return '관리 시작일';
  if (bundle.flow.category.includes('이사')) return '이사일';
  if (bundle.flow.category.includes('운동') || bundle.flow.category.includes('러닝')) return '운동 시작일';
  return anchorLabelByType[bundle.flow.anchor_type];
}

function formatIcsDate(date: Date): string {
  return compactDate(formatDate(date));
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(/\r?\n/g, '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');
}

function buildIcsDescription(
  bundle: FlowBundle,
  sectionTitle = '',
  timing = '',
  actionGuide?: string,
  completionCriteria?: string,
  links?: string,
  dateWindow?: IcsEntry['dateWindow'],
  userMemo?: string,
): string {
  const exactVideoDetail = sectionTitle ? undefined : bundle.itemDetails?.[0];
  return [
    userFacingExportSourceText(bundle.flow.description),
    sectionTitle ? '' : bundle.items[0]?.title,
    userFacingExportSourceText(exactVideoDetail?.how),
    sectionTitle && actionGuide ? userFacingExportSourceText(actionGuide) : '',
    userFacingExportSourceText(exactVideoDetail?.completion_criteria),
    sectionTitle ? `구간: ${sectionTitle}` : '',
    timing ? `기준: ${timing}` : '',
    dateWindow ? `공식 기간: ${dateWindow.label}` : '',
    dateWindow ? `예상 기간: ${dateWindow.startDate} ~ ${dateWindow.endDate}` : '',
    completionCriteria ? `완료 기준: ${userFacingExportSourceText(completionCriteria)}` : '',
    userMemo?.trim() ? `내 메모: ${userMemo.trim()}` : '',
    bundle.flow.warning ? `주의: ${userFacingExportSourceText(bundle.flow.warning)}` : '',
    links ? `링크:\n${userFacingExportSourceText(links)}` : '',
    bundle.flow.source_url ? `원문: ${bundle.flow.source_url}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

type IcsEntry = {
  id: string;
  title: string;
  sectionTitle: string;
  start: Date;
  durationDays: number;
  timing: string;
  actionGuide?: string;
  completionCriteria?: string;
  links?: string;
  dateWindow?: {
    label: string;
    startDate: string;
    endDate: string;
  };
};

function buildIcsEntries(bundle: FlowBundle, anchor?: string): IcsEntry[] {
  if (!anchor) return [];

  const entries: IcsEntry[] = [];
  for (const item of bundle.items.filter((entry) => entry.day_offset !== undefined)) {
    const detail = getItemDetail(bundle, item.id);
    const { startDate, endDate } = getItemDates(item, anchor);
    entries.push({
      id: item.id,
      title: item.title,
      sectionTitle: getSectionTitle(bundle, item.section_id),
      start: addDays(new Date(anchor), item.day_offset ?? 0),
      durationDays: Math.max(item.duration_days ?? 1, 1),
      timing: getItemTimingLabel(item),
      actionGuide: [detail?.why, detail?.how].map(userFacingExportSourceText).filter(Boolean).join('\n'),
      completionCriteria: userFacingExportSourceText(detail?.completion_criteria),
      links: linkList(detail),
      dateWindow: item.date_window && startDate && endDate
        ? {
            label: item.date_window.label,
            startDate,
            endDate,
          }
        : undefined,
    });
  }

  for (const slot of bundle.mealSlots ?? []) {
    const recipe = bundle.recipes?.find((item) => item.id === slot.recipe_id);
    entries.push({
      id: slot.id,
      title: slot.menu_title,
      sectionTitle: getSectionTitle(bundle, slot.section_id),
      start: addDays(new Date(anchor), slot.day_offset),
      durationDays: Math.max(slot.duration_days, 1),
      timing: timingLabel(slot.day_offset, slot.duration_days),
      actionGuide: '',
      completionCriteria: slot.new_ingredients.length ? `New ingredients: ${slot.new_ingredients.join(', ')}` : '',
      links: recipe ? sourceNote(bundle, recipe.risk_level) : sourceNote(bundle),
    });
  }

  return entries.sort((a, b) => a.start.getTime() - b.start.getTime() || a.title.localeCompare(b.title));
}

export function buildIcsCalendar(
  bundle: FlowBundle,
  checks: Record<string, boolean>,
  anchor?: string,
  itemStates: Record<string, FlowItemState> = {},
): string {
  const nowStamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FLOW MVP//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(bundle.flow.title)}`,
  ];

  for (const entry of buildIcsEntries(bundle, anchor).filter((item) => !itemStates[item.id]?.skipped)) {
    const end = addDays(entry.start, entry.durationDays);
    const summary = `${bundle.flow.title} - ${entry.title}`;
    const description = buildIcsDescription(
      bundle,
      entry.sectionTitle,
      entry.timing,
      entry.actionGuide,
      entry.completionCriteria,
      entry.links,
      entry.dateWindow,
      itemStates[entry.id]?.note,
    );
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(`${bundle.flow.id}-${entry.id}@flow-mvp`)}`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;VALUE=DATE:${formatIcsDate(entry.start)}`,
      `DTEND;VALUE=DATE:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `STATUS:${checks[entry.id] ? 'CONFIRMED' : 'TENTATIVE'}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldIcsContentLine).join('\r\n');
}

export function buildCalendarIcs(bundle: FlowBundle, anchor: string, weekdays: string[] = []): string {
  const startDate = anchor || formatLocalDate(new Date());
  const byday = weekdays.map((day) => icsWeekdays[day]).filter(Boolean).join(',');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FLOW MVP//Personal Flow Export//KO',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${bundle.flow.slug}-${compactDate(startDate)}@flow.local`,
    `DTSTAMP:${compactDate(formatDate(new Date()))}T000000Z`,
    `DTSTART;VALUE=DATE:${compactDate(startDate)}`,
    `SUMMARY:${escapeIcsText(bundle.flow.title)}`,
    `DESCRIPTION:${escapeIcsText(buildIcsDescription(bundle))}`,
  ];
  if (byday) {
    const durationDays = bundle.flow.routine_duration_days;
    // Bound a fixed-length routine (e.g. a 30-day challenge) so it does not
    // recur forever in the calendar. UNTIL is date-based, so it stops after the
    // intended span regardless of how many weekdays the user selected. Open-ended
    // habits leave routine_duration_days undefined and keep recurring indefinitely.
    const until =
      durationDays && durationDays > 0
        ? `;UNTIL=${compactDate(formatDate(addDays(new Date(startDate), durationDays - 1)))}`
        : '';
    lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${byday}${until}`);
  }
  if (bundle.flow.source_url) lines.push(`URL:${bundle.flow.source_url}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.map(foldIcsContentLine).join('\r\n')}\r\n`;
}

export function buildWorkbookSheets(
  bundle: FlowBundle,
  checks: Record<string, boolean>,
  anchor?: string,
  options: WorkbookExportOptions = {},
): WorkbookSheet[] {
  const accentColor = getAccentColor(bundle);
  const typeLabel = getTypeLabel(bundle);
  const anchorLabel = getExportAnchorLabel(bundle);
  const itemStates = options.itemStates ?? {};
  const comparison = buildComparisonExport(bundle, options.comparisonState);
  const workbenchRows = buildWorkbenchRows(bundle, options.workbenchState);

  const summaryRows: WorkbookCell[][] = [
    ['FLOW', bundle.flow.title],
    ['카테고리', bundle.flow.category],
    ['진행률', getProgressLabel(bundle, checks, itemStates)],
    ['기준값', bundle.flow.anchor_type === 'none' ? '기준값 없음' : `${anchorLabel}: ${anchor || '미입력'}`],
    ['구조', typeLabel],
    ['상태', bundle.flow.status === 'published' ? '공개 Flow' : '초안 Flow'],
    ['위험도', bundle.flow.risk_level ? riskLabels[bundle.flow.risk_level] : ''],
  ];

  if (bundle.flow.description) summaryRows.push(['설명', userFacingExportSourceText(bundle.flow.description)]);
  if (bundle.flow.warning) summaryRows.push(['주의', userFacingExportSourceText(bundle.flow.warning)]);
  if (bundle.flow.hold_section) {
    summaryRows.push(['보류 기준', bundle.flow.hold_section.title]);
    summaryRows.push(['보류 사유', bundle.flow.hold_section.reasons.join('\n')]);
    summaryRows.push(['보류 메모 양식', bundle.flow.hold_section.memo_template]);
  }
  if (options.weekdays?.length) summaryRows.push(['선택 요일', options.weekdays.join(' / ')]);
  if (bundle.flow.source_title || bundle.flow.source_url) {
    summaryRows.push(['참고', [bundle.flow.source_title, bundle.flow.source_url].filter(Boolean).join(' - ')]);
  }
  summaryRows.push([
    '다운로드 메모',
    '이 파일은 FLOW MVP에서 테스트용으로 생성한 실행표입니다. 공식 조언이나 법률·의료·재무 판단을 대체하지 않습니다.',
  ]);

  const executionRows: WorkbookCell[][] = [];
  const detailRows: WorkbookCell[][] = [];

  for (const section of bundle.sections) {
    for (const item of bundle.items.filter((entry) => entry.section_id === section.id)) {
      const { startDate, endDate } = getItemDates(item, anchor);
      const detail = getItemDetail(bundle, item.id);
      const state = itemStates[item.id];
      executionRows.push([
        itemStatusLabel(Boolean(checks[item.id]), state),
        getItemTimingLabel(item),
        endDate ? `${startDate} ~ ${endDate}` : startDate,
        section.title,
        item.title,
        userFacingExportSourceText(completionCriteria(detail)),
        linkLabelList(detail),
        state?.note?.trim() ?? '',
      ]);
      if (detail?.why || detail?.how || detail?.caution || detail?.links?.length || item.description) {
        detailRows.push([
          item.title,
          section.title,
          userFacingExportSourceText(detail?.why ?? item.description),
          userFacingExportSourceText(detail?.how),
          userFacingExportSourceText(detail?.caution),
          [sourceNote(bundle, item.risk_level), linkList(detail)].filter(Boolean).join('\n'),
        ]);
      }
    }
  }

  for (const slot of bundle.mealSlots ?? []) {
    const recipe = bundle.recipes?.find((item) => item.id === slot.recipe_id);
    const { startDate, endDate } = getMealDates(slot, anchor);
    const state = itemStates[slot.id];
    executionRows.push([
      itemStatusLabel(Boolean(checks[slot.id]), state),
      timingLabel(slot.day_offset, slot.duration_days),
      startDate && endDate ? `${startDate} ~ ${endDate}` : '',
      getSectionTitle(bundle, slot.section_id),
      slot.menu_title,
      slot.new_ingredients.length ? `새 재료: ${slot.new_ingredients.join(', ')}` : '',
      recipe ? `레시피: ${recipe.title}` : '',
      state?.note?.trim() ?? '',
    ]);
    detailRows.push([
      slot.menu_title,
      getSectionTitle(bundle, slot.section_id),
      slot.allergy_watch_days ? `새 재료 반응 관찰: ${slot.allergy_watch_days}일` : '',
      recipe ? '레시피 시트에서 재료, 조리 순서, 보관 메모를 확인합니다.' : '',
      recipe?.caution_note ?? '',
      sourceNote(bundle, recipe?.risk_level),
    ]);
  }

  const referenceRows = executionRows.filter((row) => {
    const timing = String(row[1] ?? '');
    const date = String(row[2] ?? '');
    return timing === 'D-Day' || timing === 'D+0~D+2' || Boolean(anchor && date.includes(anchor));
  });
  summaryRows.splice(5, 0, [
    '오늘/기준일 항목',
    referenceRows.length
      ? referenceRows.map((row) => `${row[1]} ${row[2]} ${row[4]}`).join('\n')
      : '기준일과 직접 연결된 항목이 없습니다.',
  ]);

  const calendarRows = buildCalendarRows(bundle, checks, anchor, itemStates);
  const weeklyRows = buildWeeklyGridRows(calendarRows);
  const monthlyRows = buildMonthlyGridRows(calendarRows);

  const sheets: WorkbookSheet[] = [
    {
      name: '실행 요약',
      columns: ['구분', '내용'],
      rows: summaryRows,
      accentColor,
    },
    {
      name: '실행표',
      columns: executionColumns,
      rows: executionRows,
      accentColor,
    },
  ];

  if (calendarRows.length && !isExactVideoFlow(bundle)) {
    sheets.push(
      {
        name: '주간 보기',
        columns: weeklyColumns,
        rows: weeklyRows,
        accentColor,
        note: '주간 보기는 웹의 주별 보기와 동일하게 날짜별 실행 항목을 펼친 시트입니다. 기간형 식단은 매일 표시됩니다.',
      },
      {
        name: '월간 보기',
        columns: monthlyColumns,
        rows: monthlyRows,
        accentColor,
        note: '월간 보기는 웹의 달력 보기와 동일하게 날짜별 실행 항목을 펼친 시트입니다. 기간형 식단은 매일 표시됩니다.',
      },
    );
  }

  if (comparison) {
    sheets.push({
      name: '후보 비교',
      columns: comparison.columns,
      rows: comparison.rows,
      accentColor,
      note: '후보 비교표는 이 브라우저에 입력한 후보명과 항목별 메모를 백업한 시트입니다.',
    });
  }

  if (workbenchRows.length) {
    sheets.push({
      name: '실행판 기록',
      columns: workbenchColumns,
      rows: workbenchRows,
      accentColor,
      note: '첫 화면 실행판에서 입력한 회차 완료, 회차 메모, 기록표 값, 주간 리뷰를 백업합니다.',
    });
  }

  sheets.push({
    name: '상세',
    columns: detailColumns,
    rows: detailRows,
    accentColor,
  });

  if (bundle.flow.content_type === 'meal_plan') {
    sheets.push({
      name: '레시피',
      columns: ['레시피', '재료', '조리 순서', '분량/농도', '보관', '도구', '주의'],
      rows: (bundle.recipes ?? []).map((recipe) => [
        recipe.title,
        recipeTextList(
          recipe.ingredients.map((ingredient) =>
            [
              ingredient.name,
              ingredient.amount,
              ingredient.unit,
              ingredient.note,
              ingredient.is_new_for_baby ? '새 재료' : '',
              ingredient.allergy_watch ? '반응 관찰' : '',
            ]
              .filter(Boolean)
              .join(' '),
          ),
        ),
        recipeTextList(recipe.steps.map((step) => `${step.order}. ${step.text}`)),
        recipe.texture_note ?? recipe.ratio_note ?? '',
        recipe.storage_note ?? '',
        recipe.tool_note ?? '',
        recipe.caution_note ?? '',
      ]),
      accentColor,
    });

    if (!mealCalendarOnlySlugs.has(bundle.flow.slug)) {
      sheets.push({
        name: '반응기록',
        columns: reactionColumns,
        rows: (bundle.mealSlots ?? []).map((slot) => {
          const log = options.reactionLogs?.[slot.id] ?? {};
          const { startDate, endDate } = getMealDates(slot, anchor);
          return [
            timingLabel(slot.day_offset, slot.duration_days),
            startDate && endDate ? `${startDate} ~ ${endDate}` : '',
            slot.menu_title,
            slot.new_ingredients.join(', '),
            log.amount ?? '',
            log.fedAt ?? '',
            log.skin ?? '',
            log.vomitingOrDiarrhea ?? '',
            log.stool ?? '',
            log.sleep ?? '',
            log.preferenceNote ?? '',
          ];
        }),
        accentColor,
        note: '반응기록은 보호자가 직접 관찰해 입력한 메모용 영역입니다. 이상 반응이 의심되면 전문가 또는 공식 정보를 확인하세요.',
      });
    }
  }

  return sheets;
}

function columnWidth(columnName: string): number {
  if (['실행 내용', '왜 필요한가', '실행 방법', '완료 기준', '바로가기', '출처/링크', '재료', '조리 순서'].includes(columnName)) return 34;
  if (['내용', '주의', '다운로드 메모', '내 메모'].includes(columnName)) return 48;
  if (['구분'].includes(columnName)) return 18;
  if (['주 시작일', '날짜', '월'].includes(columnName)) return 14;
  if (['요일', '상태'].includes(columnName)) return 10;
  if (['날짜 범위', '시작일', '종료일'].includes(columnName)) return 18;
  return Math.max(12, Math.min(22, columnName.length * 2 + 8));
}

export async function buildXlsxBuffer(sheets: WorkbookSheet[]): Promise<ArrayBuffer> {
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = (
    (ExcelJSModule as unknown as { default?: typeof ExcelJSModule }).default ?? ExcelJSModule
  );
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'FLOW MVP';
  workbook.created = new Date();
  workbook.modified = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31), {
      views: [{ state: 'frozen', ySplit: 1 }],
      properties: { defaultRowHeight: 24 },
    });
    const accentColor = sheet.accentColor ?? '2563EB';
    const isCalendarGrid = sheet.name === '주간 보기' || sheet.name === '월간 보기';

    worksheet.columns = sheet.columns.map((header) => ({
      header,
      key: header,
      width: isCalendarGrid
        ? header === '주' || header === '월/주'
          ? 14
          : 28
        : columnWidth(header),
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${accentColor}` },
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });

    sheet.rows.forEach((row) => worksheet.addRow(row));

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.height = isCalendarGrid ? 88 : 30;
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'top', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
      const rowLabel = String(row.getCell(1).value ?? '');
      if (isCalendarGrid && /^\d{4}-\d{2}$/.test(rowLabel)) {
        row.height = 28;
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: `FF${accentColor}` },
          };
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        return;
      }
      if (rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F7F4' },
          };
        });
      }
    });

    const stateColumn = sheet.columns.indexOf('상태') + 1;
    if (stateColumn > 0) {
      worksheet.getColumn(stateColumn).eachCell((cell, rowNumber) => {
        if (rowNumber === 1) return;
        const value = String(cell.value ?? '');
        cell.font = {
          bold: true,
          color: { argb: value === '완료' ? 'FF15803D' : 'FF6B7280' },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: value === '완료' ? 'FFEAF7EE' : 'FFF3F4F6' },
        };
      });
    }

    const timingColumn = sheet.columns.indexOf('시점') + 1;
    if (timingColumn > 0) {
      worksheet.getColumn(timingColumn).eachCell((cell, rowNumber) => {
        if (rowNumber === 1) return;
        cell.font = { bold: true, color: { argb: 'FF2563EB' } };
      });
    }

    const cautionColumn = sheet.columns.indexOf('주의/출처') + 1;
    if (cautionColumn > 0) {
      worksheet.getColumn(cautionColumn).eachCell((cell, rowNumber) => {
        if (rowNumber === 1 || !cell.value) return;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF7ED' },
        };
        cell.font = { color: { argb: 'FFA16207' } };
      });
    }

    if (sheet.name === '실행 요약') {
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      worksheet.getRow(2).height = 38;
      worksheet.getRow(2).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${accentColor}` },
        };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
      worksheet.getCell('B2').font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 16 };

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return;
        const label = String(row.getCell(1).value ?? '');
        if (label === '진행률' || label === '오늘/기준일 항목') {
          row.height = 34;
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFEFF6FF' },
            };
            cell.font = { bold: true, color: { argb: 'FF1D4ED8' } };
          });
        }
        if (['위험도', '주의', '다운로드 메모'].includes(label)) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFBEB' },
            };
            cell.font = { color: { argb: 'FFA16207' }, bold: label === '위험도' };
          });
        }
      });
    }

    if (sheet.note) {
      const noteRow = worksheet.addRow([]);
      noteRow.height = 34;
      const noteCell = noteRow.getCell(1);
      noteCell.value = sheet.note;
      noteCell.alignment = { vertical: 'middle', wrapText: true };
      noteCell.font = { color: { argb: 'FFA16207' }, italic: true };
      worksheet.mergeCells(noteRow.number, 1, noteRow.number, sheet.columns.length);
    }

    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };
  }

  return workbook.xlsx.writeBuffer();
}
