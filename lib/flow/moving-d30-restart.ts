import { addDays, formatDate } from './date';
import type { WorkbookSheet } from './export';

export type MovingRestartSourceType = 'checklist' | 'official';

export type MovingRestartItem = {
  id: string;
  title: string;
  date: string;
  offset: number;
  offsetLabel: string;
  memo: string;
  sourceType: MovingRestartSourceType;
  sourceLabel: string;
  done: boolean;
  userCreated?: boolean;
};

export type MovingRestartItemInput = {
  title: string;
  date: string;
  memo?: string;
};

const CHECKLIST_SOURCE = '아정당 이사 준비 체크리스트';
const OFFICIAL_SOURCE = '정부24 전입신고 안내';

const seedItems: Array<Omit<MovingRestartItem, 'date' | 'done'>> = [
  {
    id: 'moving-restart-method',
    title: '이사 방식과 업체 후보 정하기',
    offset: -30,
    offsetLabel: 'D-30',
    memo: '포장, 반포장, 직접 운반 중 하나를 정하고 견적 후보를 남깁니다.',
    sourceType: 'checklist',
    sourceLabel: CHECKLIST_SOURCE,
  },
  {
    id: 'moving-restart-house-check',
    title: '이사할 집 하자 사진 남기기',
    offset: -30,
    offsetLabel: 'D-30',
    memo: '입주 전 벽, 바닥, 창문, 수도, 전기 상태를 사진으로 남깁니다.',
    sourceType: 'checklist',
    sourceLabel: CHECKLIST_SOURCE,
  },
  {
    id: 'moving-restart-declutter',
    title: '버릴 물건과 대형폐기물 정리',
    offset: -30,
    offsetLabel: 'D-30',
    memo: '대형폐기물 신고가 필요한 물건을 먼저 분리합니다.',
    sourceType: 'checklist',
    sourceLabel: CHECKLIST_SOURCE,
  },
  {
    id: 'moving-restart-address-change',
    title: '주소 변경과 정기 서비스 정리',
    offset: -10,
    offsetLabel: 'D-10',
    memo: '우편물, 카드, 은행, 정기 배송, 인터넷 이전 설치를 확인합니다.',
    sourceType: 'checklist',
    sourceLabel: CHECKLIST_SOURCE,
  },
  {
    id: 'moving-restart-final-call',
    title: '업체 일정과 이체 한도 확인',
    offset: -1,
    offsetLabel: 'D-1',
    memo: '이사 시간, 차량 동선, 결제/잔금 준비를 마지막으로 확인합니다.',
    sourceType: 'checklist',
    sourceLabel: CHECKLIST_SOURCE,
  },
  {
    id: 'moving-restart-moving-day-settlement',
    title: '공과금 정산과 집 상태 기록',
    offset: 0,
    offsetLabel: 'D-Day',
    memo: '전기, 가스, 수도, 관리비 정산과 계량기/집 상태 사진을 남깁니다.',
    sourceType: 'checklist',
    sourceLabel: CHECKLIST_SOURCE,
  },
  {
    id: 'moving-restart-gov24-result',
    title: '전입신고 처리 결과 확인',
    offset: 1,
    offsetLabel: 'D+1',
    memo: '정부24 공식 안내를 별도 확인하고 처리 결과를 기록합니다.',
    sourceType: 'official',
    sourceLabel: OFFICIAL_SOURCE,
  },
];

function normalizeDate(value: string): string {
  return formatDate(new Date(`${value}T00:00:00.000Z`));
}

function dateToIcs(value: string): string {
  return value.replaceAll('-', '');
}

export function generateMovingRestartItems(moveDate: string): MovingRestartItem[] {
  const anchor = new Date(`${normalizeDate(moveDate)}T00:00:00.000Z`);
  return seedItems.map((item) => ({
    ...item,
    date: formatDate(addDays(anchor, item.offset)),
    done: false,
  }));
}

export function moveMovingRestartItem(
  items: MovingRestartItem[],
  id: string,
  date: string,
): MovingRestartItem[] {
  return items.map((item) => (item.id === id ? { ...item, date: normalizeDate(date) } : item));
}

export function updateMovingRestartItem(
  items: MovingRestartItem[],
  id: string,
  patch: Partial<Pick<MovingRestartItem, 'title' | 'date' | 'memo' | 'done'>>,
): MovingRestartItem[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      ...patch,
      date: patch.date ? normalizeDate(patch.date) : item.date,
    };
  });
}

export function addMovingRestartItem(
  items: MovingRestartItem[],
  input: MovingRestartItemInput,
): MovingRestartItem[] {
  const nextIndex = items.filter((item) => item.userCreated).length + 1;
  return [
    ...items,
    {
      id: `moving-restart-custom-${nextIndex}`,
      title: input.title.trim(),
      date: normalizeDate(input.date),
      offset: 0,
      offsetLabel: '추가',
      memo: input.memo?.trim() ?? '',
      sourceType: 'checklist',
      sourceLabel: '사용자 추가 항목',
      done: false,
      userCreated: true,
    },
  ];
}

export function deleteMovingRestartItem(items: MovingRestartItem[], id: string): MovingRestartItem[] {
  return items.filter((item) => item.id !== id);
}

export function buildMovingRestartChecklistText(items: MovingRestartItem[]): string {
  return items
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (item) =>
        `- [${item.done ? 'x' : ' '}] ${item.date} ${item.offsetLabel} ${item.title}${item.memo ? `\n  - 메모: ${item.memo}` : ''}\n  - 출처: ${item.sourceLabel}`,
    )
    .join('\n');
}

export function buildMovingRestartIcs(items: MovingRestartItem[]): string {
  const events = items.map((item) =>
    [
      'BEGIN:VEVENT',
      `UID:${item.id}@flowme-moving-d30`,
      `DTSTART;VALUE=DATE:${dateToIcs(item.date)}`,
      `SUMMARY:${item.title}`,
      `DESCRIPTION:${item.memo} / 출처: ${item.sourceLabel}`,
      'END:VEVENT',
    ].join('\n'),
  );

  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FLOW//Moving D-30 Restart//KO', ...events, 'END:VCALENDAR'].join('\n');
}

export function buildMovingRestartSheets(items: MovingRestartItem[]): WorkbookSheet[] {
  return [
    {
      name: '이사 D-30 실행표',
      columns: ['상태', '시점', '날짜', '실행 내용', '메모', '출처'],
      rows: items
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((item) => [item.done ? '완료' : '미완료', item.offsetLabel, item.date, item.title, item.memo, item.sourceLabel]),
      accentColor: '1264F0',
    },
  ];
}
