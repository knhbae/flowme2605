import { inferPrimaryDestination } from './destination';
import { FlowBundle, PrimaryDestination } from './types';

export type FlowSurfaceType =
  | 'calendar_routine'
  | 'daily_check'
  | 'dday_timeline'
  | 'single_action'
  | 'sheet_tracker';

export type SurfaceExportKind = 'calendar' | 'sheet' | 'memo' | 'checklist';

export type SurfaceSetting = {
  id: 'start_date' | 'target_date' | 'repeat_days' | 'duration' | 'missed_day' | 'daily_label' | 'columns' | 'proof_note';
  label: string;
  value: string;
};

export type SurfacePreviewEntry = {
  id: string;
  date?: string;
  day?: string;
  phase?: string;
  label: string;
  title: string;
  note?: string;
};

export type FlowSurfaceModel = {
  type: FlowSurfaceType;
  primaryToolLabel: string;
  rhythmLabel: string;
  firstAction: string;
  primaryExport: SurfaceExportKind;
  secondaryExports: SurfaceExportKind[];
  settings: SurfaceSetting[];
  previewEntries: SurfacePreviewEntry[];
};

export type SurfaceModelOptions = {
  anchorDate?: string;
  weekdays?: string[];
};

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

export function inferFlowSurfaceType(bundle: FlowBundle): FlowSurfaceType {
  const slug = bundle.flow.slug;
  const destination = inferPrimaryDestination(bundle);

  if (bundle.flow.content_type === 'meal_plan') return 'daily_check';
  if (slug.startsWith('real-thankyou-bubu-video-')) return 'calendar_routine';
  if (slug.startsWith('real-fitvely-video-')) {
    return destination === 'calendar' ? 'calendar_routine' : 'daily_check';
  }
  if (bundle.flow.structure_type === 'timeline' || bundle.flow.anchor_type === 'end_date') return 'dday_timeline';
  if (destination === 'sheet') return 'sheet_tracker';
  if (bundle.items.length <= 2 && bundle.flow.anchor_type === 'none') return 'single_action';
  if (bundle.flow.structure_type === 'routine') return 'calendar_routine';
  if (bundle.flow.structure_type === 'checklist') return 'daily_check';
  return 'single_action';
}

export function getFlowSurfaceModel(bundle: FlowBundle, options: SurfaceModelOptions = {}): FlowSurfaceModel {
  const type = inferFlowSurfaceType(bundle);
  const anchorDate = normalizeAnchorDate(options.anchorDate);
  const weekdays = normalizeWeekdays(type, options.weekdays);
  const firstAction = getFirstAction(bundle);

  if (type === 'calendar_routine') {
    return {
      type,
      primaryToolLabel: '캘린더',
      rhythmLabel: `주 ${weekdays.length}회`,
      firstAction,
      primaryExport: 'calendar',
      secondaryExports: ['sheet', 'memo'],
      settings: [
        { id: 'start_date', label: '시작일', value: anchorDate },
        { id: 'repeat_days', label: '반복 요일', value: weekdays.join(', ') },
        { id: 'duration', label: '기간', value: '4주' },
        { id: 'missed_day', label: '놓친 날 처리', value: '건너뛰기' },
      ],
      previewEntries: makeRecurringEntries(bundle, anchorDate, weekdays, 3, '캘린더 일정'),
    };
  }

  if (type === 'daily_check') {
    return {
      type,
      primaryToolLabel: '체크표',
      rhythmLabel: weekdays.length >= 7 ? '매일' : `주 ${weekdays.length}회`,
      firstAction,
      primaryExport: 'sheet',
      secondaryExports: ['memo', 'calendar'],
      settings: [
        { id: 'start_date', label: '시작일', value: anchorDate },
        { id: 'repeat_days', label: '적용 요일', value: weekdays.join(', ') },
        { id: 'daily_label', label: '체크 문구', value: firstAction },
      ],
      previewEntries: makeRecurringEntries(bundle, anchorDate, weekdays, 7, '적용 체크'),
    };
  }

  if (type === 'dday_timeline') {
    return {
      type,
      primaryToolLabel: 'D-Day 표',
      rhythmLabel: bundle.flow.anchor_type === 'end_date' ? '목표일 기준' : '시작일 기준',
      firstAction,
      primaryExport: 'sheet',
      secondaryExports: ['calendar', 'memo'],
      settings: [
        { id: bundle.flow.anchor_type === 'end_date' ? 'target_date' : 'start_date', label: bundle.flow.anchor_type === 'end_date' ? '목표일' : '시작일', value: anchorDate },
        { id: 'duration', label: '표시 범위', value: `${bundle.sections.length}단계` },
      ],
      previewEntries: bundle.sections.slice(0, 6).map((section) => ({
        id: section.id,
        phase: section.title,
        label: section.title,
        title: bundle.items.find((item) => item.section_id === section.id)?.title ?? section.description ?? section.title,
      })),
    };
  }

  if (type === 'sheet_tracker') {
    return {
      type,
      primaryToolLabel: '시트',
      rhythmLabel: '기록형',
      firstAction,
      primaryExport: 'sheet',
      secondaryExports: ['memo'],
      settings: [
        { id: 'columns', label: '열 구성', value: '날짜, 항목, 상태, 메모' },
        { id: 'start_date', label: '시작일', value: anchorDate },
      ],
      previewEntries: bundle.items.slice(0, 5).map((item, index) => ({
        id: item.id,
        date: addDaysToDateOnly(anchorDate, item.day_offset ?? index),
        label: '시트 행',
        title: item.title,
        note: item.description,
      })),
    };
  }

  return {
    type,
    primaryToolLabel: '메모',
    rhythmLabel: '한 번 실행',
    firstAction,
    primaryExport: 'memo',
    secondaryExports: ['checklist', 'calendar'],
    settings: [
      { id: 'start_date', label: '실행일', value: anchorDate },
      { id: 'proof_note', label: '완료 기록', value: '완료 여부와 확인 메모 남기기' },
    ],
    previewEntries: bundle.items.slice(0, 3).map((item) => ({
      id: item.id,
      label: '오늘 할 일',
      title: item.title,
      note: item.description,
    })),
  };
}

export function getCreatorCardSurfaceMeta(bundle: FlowBundle) {
  const model = getFlowSurfaceModel(bundle);
  return {
    sourceKind: bundle.flow.source_status === 'real' && bundle.flow.source_precision === 'exact' ? '정확한 출처' : bundle.flow.source_status === 'real' ? '출처 확인' : '샘플',
    task: model.firstAction,
    rhythm: model.rhythmLabel,
    tool: model.primaryToolLabel,
    firstSetting: model.settings[0]?.label ?? '바로 실행',
  };
}

export function hasGenericInternalTitle(title: string): boolean {
  return /(기준 Flow|적용 Flow|관리 Flow|목표와 기준 정하기|문제 발생 대응 순서|체크리스트 실행)/.test(title);
}

export function getSurfaceExportLabel(kind: SurfaceExportKind): string {
  if (kind === 'calendar') return '캘린더에 넣기';
  if (kind === 'sheet') return '엑셀 실행표 받기';
  if (kind === 'memo') return '메모/노션에 복사';
  return '체크리스트 복사';
}

export function exportKindFromDestination(destination: PrimaryDestination): SurfaceExportKind {
  if (destination === 'calendar') return 'calendar';
  if (destination === 'sheet') return 'sheet';
  if (destination === 'memo') return 'memo';
  return 'checklist';
}

function defaultWeekdays(type: FlowSurfaceType): string[] {
  if (type === 'calendar_routine') return ['월', '수', '금'];
  if (type === 'daily_check') return WEEKDAYS;
  return ['월'];
}

function normalizeWeekdays(type: FlowSurfaceType, weekdays?: string[]): string[] {
  const validWeekdays = weekdays?.filter((day) => WEEKDAYS.includes(day)) ?? [];
  return validWeekdays.length ? validWeekdays : defaultWeekdays(type);
}

function normalizeAnchorDate(anchorDate?: string): string {
  if (anchorDate && parseDateOnly(anchorDate)) return anchorDate;
  return formatLocalDate(new Date());
}

function parseDateOnly(value: string): { year: number; month: number; day: number } | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return { year, month, day };
}

function formatLocalDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatUtcDate(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function addDaysToDateOnly(dateValue: string, days: number): string {
  const parsed = parseDateOnly(dateValue) ?? parseDateOnly(formatLocalDate(new Date()));
  if (!parsed) return formatLocalDate(new Date());

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

function getWeekdayLabel(dateValue: string): string {
  const parsed = parseDateOnly(dateValue) ?? parseDateOnly(formatLocalDate(new Date()));
  if (!parsed) return WEEKDAYS[0];

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  return WEEKDAYS[(date.getUTCDay() + 6) % 7];
}

function getFirstAction(bundle: FlowBundle): string {
  return bundle.items[0]?.title ?? bundle.flow.description ?? bundle.flow.title;
}

function makeRecurringEntries(
  bundle: FlowBundle,
  anchorDate: string,
  weekdays: string[],
  count: number,
  label: string,
): SurfacePreviewEntry[] {
  const itemTitle = getFirstAction(bundle);
  const entries: SurfacePreviewEntry[] = [];

  for (let offset = 0; entries.length < count && offset < 60; offset += 1) {
    const date = addDaysToDateOnly(anchorDate, offset);
    const day = getWeekdayLabel(date);
    if (weekdays.includes(day)) {
      entries.push({
        id: `${bundle.flow.id}-${entries.length}`,
        date,
        day,
        label,
        title: itemTitle,
      });
    }
  }

  return entries;
}
