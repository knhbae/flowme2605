import { addDays, formatDate, getRangeEnd } from './date';
import { timingLabel } from './parser';
import { FlowBundle, FlowItem, MealSlot, ReactionLog } from './types';

const anchorLabelByType = {
  start_date: '시작일',
  end_date: '이사일',
  baby_age_month: '기준 월령',
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
};

const executionColumns = [
  '상태',
  '시점',
  '날짜',
  '섹션',
  '실행 내용',
  '완료 기준',
  '바로가기',
];

const detailColumns = ['실행 내용', '섹션', '왜 필요한가', '실행 방법', '주의', '출처/링크'];

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

const weekdayColumns = ['월', '화', '수', '목', '금', '토', '일'];
const weeklyColumns = ['주', ...weekdayColumns];
const monthlyColumns = ['월/주', ...weekdayColumns];

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
  return {
    startDate,
    endDate:
      item.duration_days && item.duration_days > 1
        ? formatDate(getRangeEnd(new Date(startDate), item.duration_days))
        : '',
  };
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

function getExecutableIds(bundle: FlowBundle): string[] {
  return bundle.flow.content_type === 'meal_plan'
    ? (bundle.mealSlots ?? []).map((slot) => slot.id)
    : bundle.items.map((item) => item.id);
}

function getProgressLabel(bundle: FlowBundle, checks: Record<string, boolean>): string {
  const ids = getExecutableIds(bundle);
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

function buildCalendarRows(bundle: FlowBundle, checks: Record<string, boolean>, anchor?: string): CalendarExportRow[] {
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
          timing: timingLabel(item.day_offset, item.duration_days),
          section: section.title,
          title: duration > 1 ? `${item.title} ${index + 1}일차` : item.title,
          status: doneLabel(Boolean(checks[item.id])),
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
        status: doneLabel(Boolean(checks[slot.id])),
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

export function buildText(
  bundle: FlowBundle,
  checks: Record<string, boolean>,
  anchor?: string,
): string {
  const lines = [bundle.flow.title];
  const anchorLabel = anchorLabelByType[bundle.flow.anchor_type];
  lines.push(`${anchorLabel}: ${anchor || (bundle.flow.anchor_type === 'none' ? '없음' : '')}`);

  if (bundle.flow.content_type === 'meal_plan') {
    for (const section of bundle.sections) {
      lines.push('', `[${section.title}]`);
      for (const slot of (bundle.mealSlots ?? []).filter((meal) => meal.section_id === section.id)) {
        const { startDate, endDate } = getMealDates(slot, anchor);
        const timing = timingLabel(slot.day_offset, slot.duration_days);
        const recipe = bundle.recipes?.find((item) => item.id === slot.recipe_id);
        lines.push(`[${timing}${startDate ? ` / ${startDate} ~ ${endDate}` : ''}]`);
        lines.push(`- ${slot.menu_title}${checks[slot.id] ? ' (완료)' : ''}`);
        lines.push(`  새 재료: ${slot.new_ingredients.join(', ')}`);
        if (recipe) lines.push(`  레시피: ${recipe.title}`);
      }
    }
    return lines.join('\n').trim();
  }

  for (const section of bundle.sections) {
    lines.push('', `[${section.title}]`);
    for (const item of bundle.items.filter((entry) => entry.section_id === section.id)) {
      const timing = timingLabel(item.day_offset, item.duration_days);
      const date = getItemDate(item, anchor);
      if (timing || date) lines.push(`[${timing}${date ? ` / ${date}` : ''}]`);
      lines.push(`- ${item.title}${checks[item.id] ? ' (완료)' : ''}`);
    }
  }

  return lines.join('\n').trim();
}

function formatIcsDate(date: Date): string {
  return formatDate(date).replaceAll('-', '');
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll(/\r?\n/g, '\\n');
}

function foldIcsLine(line: string): string {
  const limit = 74;
  if (line.length <= limit) return line;
  const chunks = [];
  let cursor = line;
  while (cursor.length > limit) {
    chunks.push(cursor.slice(0, limit));
    cursor = ` ${cursor.slice(limit)}`;
  }
  chunks.push(cursor);
  return chunks.join('\r\n');
}

function buildIcsDescription(
  bundle: FlowBundle,
  sectionTitle: string,
  timing: string,
  completionCriteria?: string,
  links?: string,
): string {
  return [
    bundle.flow.description,
    sectionTitle ? `Section: ${sectionTitle}` : '',
    timing ? `Timing: ${timing}` : '',
    completionCriteria ? `Done when: ${completionCriteria}` : '',
    bundle.flow.warning ? `Caution: ${bundle.flow.warning}` : '',
    links ? `Links:\n${links}` : '',
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
  completionCriteria?: string;
  links?: string;
};

function buildIcsEntries(bundle: FlowBundle, anchor?: string): IcsEntry[] {
  if (!anchor) return [];

  const entries: IcsEntry[] = [];
  for (const item of bundle.items.filter((entry) => entry.day_offset !== undefined)) {
    const detail = getItemDetail(bundle, item.id);
    entries.push({
      id: item.id,
      title: item.title,
      sectionTitle: getSectionTitle(bundle, item.section_id),
      start: addDays(new Date(anchor), item.day_offset ?? 0),
      durationDays: Math.max(item.duration_days ?? 1, 1),
      timing: timingLabel(item.day_offset, item.duration_days),
      completionCriteria: detail?.completion_criteria,
      links: linkList(detail),
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

  for (const entry of buildIcsEntries(bundle, anchor)) {
    const end = addDays(entry.start, entry.durationDays);
    const summary = `${bundle.flow.title} - ${entry.title}`;
    const description = buildIcsDescription(
      bundle,
      entry.sectionTitle,
      entry.timing,
      entry.completionCriteria,
      entry.links,
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
  return lines.map(foldIcsLine).join('\r\n');
}

export function buildWorkbookSheets(
  bundle: FlowBundle,
  checks: Record<string, boolean>,
  anchor?: string,
  options: WorkbookExportOptions = {},
): WorkbookSheet[] {
  const accentColor = getAccentColor(bundle);
  const typeLabel = getTypeLabel(bundle);
  const anchorLabel = anchorLabelByType[bundle.flow.anchor_type];

  const summaryRows: WorkbookCell[][] = [
    ['FLOW', bundle.flow.title],
    ['카테고리', bundle.flow.category],
    ['진행률', getProgressLabel(bundle, checks)],
    ['기준값', bundle.flow.anchor_type === 'none' ? '기준값 없음' : `${anchorLabel}: ${anchor || '미입력'}`],
    ['구조', typeLabel],
    ['상태', bundle.flow.status === 'published' ? '공개 Flow' : '초안 Flow'],
    ['위험도', bundle.flow.risk_level ? riskLabels[bundle.flow.risk_level] : ''],
  ];

  if (bundle.flow.description) summaryRows.push(['설명', bundle.flow.description]);
  if (bundle.flow.warning) summaryRows.push(['주의', bundle.flow.warning]);
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
      executionRows.push([
        doneLabel(Boolean(checks[item.id])),
        timingLabel(item.day_offset, item.duration_days),
        endDate ? `${startDate} ~ ${endDate}` : startDate,
        section.title,
        item.title,
        detail?.completion_criteria ?? '',
        linkLabelList(detail),
      ]);
      if (detail?.why || detail?.how || detail?.caution || detail?.links?.length || item.description) {
        detailRows.push([
          item.title,
          section.title,
          detail?.why ?? item.description ?? '',
          detail?.how ?? '',
          detail?.caution ?? '',
          [sourceNote(bundle, item.risk_level), linkList(detail)].filter(Boolean).join('\n'),
        ]);
      }
    }
  }

  for (const slot of bundle.mealSlots ?? []) {
    const recipe = bundle.recipes?.find((item) => item.id === slot.recipe_id);
    const { startDate, endDate } = getMealDates(slot, anchor);
    executionRows.push([
      doneLabel(Boolean(checks[slot.id])),
      timingLabel(slot.day_offset, slot.duration_days),
      startDate && endDate ? `${startDate} ~ ${endDate}` : '',
      getSectionTitle(bundle, slot.section_id),
      slot.menu_title,
      slot.new_ingredients.length ? `새 재료: ${slot.new_ingredients.join(', ')}` : '',
      recipe ? `레시피: ${recipe.title}` : '',
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

  const calendarRows = buildCalendarRows(bundle, checks, anchor);
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

  if (calendarRows.length) {
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

  return sheets;
}

function columnWidth(columnName: string): number {
  if (['실행 내용', '왜 필요한가', '실행 방법', '완료 기준', '바로가기', '출처/링크', '재료', '조리 순서'].includes(columnName)) return 34;
  if (['내용', '주의', '다운로드 메모'].includes(columnName)) return 48;
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
