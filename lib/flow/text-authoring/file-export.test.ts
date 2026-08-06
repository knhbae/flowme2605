import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAuthoringArtifactProjection,
  type AuthoringArtifactRow,
} from './artifact-projection';
import {
  AUTHORING_TABLE_COLUMNS,
  buildAuthoringSheetExportTable,
  buildAuthoringTableRows,
  serializeAuthoringIcs,
  serializeAuthoringMarkdown,
  serializeAuthoringPlainText,
} from './file-export';
import { createTextAuthoringDocument } from './parser';

const ROW = {
  itemId: 'item-1',
  stepId: 'step-1',
  stepTitle: '예약',
  title: '항공권 확인',
  sourceChecked: true,
  detail: '출발 시간을 다시 확인합니다.',
  completion: '예약번호를 남김',
  date: '2026-08-01',
  sourceExpression: '출발 3일 전',
  place: '제주공항',
  repeat: '매주 월요일',
  condition: '운항 상태가 정상일 때',
  order: 0,
  resources: [
    {
      label: '항공사 예약',
      url: 'https://example.com/booking',
      type: 'link',
    },
  ],
  links: [
    {
      label: '항공사 예약',
      url: 'https://example.com/booking',
      type: 'link',
    },
  ],
  caution: '여권 영문명을 확인합니다.',
} as AuthoringArtifactRow;

test('plain-text export contains the scoped row fields without Markdown syntax', () => {
  const output = serializeAuthoringPlainText('제주 여행 준비', [ROW]);

  assert.match(output, /제목: 제주 여행 준비/u);
  assert.match(output, /완료 기준: 예약번호를 남김/u);
  assert.match(output, /원문 체크: 완료/u);
  assert.match(output, /원문 일정: 출발 3일 전/u);
  assert.match(output, /장소: 제주공항/u);
  assert.match(output, /반복: 매주 월요일/u);
  assert.match(output, /조건: 운항 상태가 정상일 때/u);
  assert.match(output, /항공사 예약: https:\/\/example\.com\/booking/u);
  assert.match(output, /주의: 여권 영문명을 확인합니다/u);
  assert.doesNotMatch(output, /<!-- flowme:/u);
  assert.doesNotMatch(output, /- \[ \]/u);
  assert.doesNotMatch(output, /^#/mu);
});

test('Markdown export preserves detail, completion, schedule, resources, and caution', () => {
  const output = serializeAuthoringMarkdown('제주 여행 준비', [ROW]);

  assert.match(output, /^# 제주 여행 준비/mu);
  assert.match(output, /^## 예약$/mu);
  assert.match(output, /- \[x\] 항공권 확인/u);
  assert.match(output, /^  - 설명: 출발 시간을 다시 확인합니다/mu);
  assert.match(output, /^  - 완료 기준: 예약번호를 남김/mu);
  assert.match(output, /^  - 장소: 제주공항/mu);
  assert.match(output, /^  - 반복: 매주 월요일/mu);
  assert.match(output, /^  - 조건: 운항 상태가 정상일 때/mu);
  assert.match(output, /^  - 안내: 원문 일정 · 출발 3일 전/mu);
  assert.match(
    output,
    /\[항공사 예약\]\(https:\/\/example\.com\/booking\)/u,
  );
  assert.match(output, /주의: 여권 영문명을 확인합니다/u);
});

test('tabular export keeps the same field contract used by CSV, TSV, and XLSX', () => {
  assert.deepEqual(AUTHORING_TABLE_COLUMNS, [
    'Step',
    '항목',
    '원문 체크',
    '설명',
    '날짜',
    '시간',
    '시간대',
    '장소',
    '소요 시간(분)',
    '반복',
    '조건',
    '완료 기준',
    '원문 일정',
    '자료',
    '출처',
    '주의',
  ]);
  assert.deepEqual(buildAuthoringTableRows([ROW]), [[
    '예약',
    '항공권 확인',
    '완료',
    '출발 시간을 다시 확인합니다.',
    '2026-08-01',
    '',
    '',
    '제주공항',
    '',
    '매주 월요일',
    '운항 상태가 정상일 때',
    '예약번호를 남김',
    '출발 3일 전',
    '항공사 예약: https://example.com/booking',
    '',
    '여권 영문명을 확인합니다.',
  ]]);
});

test('resource and source links keep separate labels in text and table exports', () => {
  const row: AuthoringArtifactRow = {
    ...ROW,
    sources: [{
      label: '공식 안내',
      url: 'https://example.com/official',
      type: 'official',
    }],
    links: [
      ...ROW.resources,
      {
        label: '공식 안내',
        url: 'https://example.com/official',
        type: 'official',
      },
    ],
  };
  const plain = serializeAuthoringPlainText('링크 구분', [row]);
  const markdown = serializeAuthoringMarkdown('링크 구분', [row]);
  const table = buildAuthoringTableRows([row])[0];

  assert.match(plain, /자료: 항공사 예약: https:\/\/example\.com\/booking/u);
  assert.match(plain, /출처: 공식 안내: https:\/\/example\.com\/official/u);
  assert.match(markdown, /^  - 자료: \[항공사 예약\]/mu);
  assert.match(markdown, /^  - 출처: \[공식 안내\]/mu);
  assert.equal(table[13], '항공사 예약: https://example.com/booking');
  assert.equal(table[14], '공식 안내: https://example.com/official');
});

test('Sheet export uses the exact original table columns and scoped preview cells', () => {
  const document = createTextAuthoringDocument([
    '활동\t담당\t자료',
    '예약 확인\t민지\thttps://example.com/booking',
    '짐 점검\t현우\t체크리스트',
  ].join('\n'));
  const view = buildAuthoringArtifactProjection(document).artifacts.sheet;
  const scopedId = view.rows[1].itemId;

  assert.deepEqual(
    buildAuthoringSheetExportTable(view, new Set([scopedId])),
    {
      columns: ['활동', '담당', '자료'],
      rows: [['짐 점검', '현우', '체크리스트']],
    },
  );
});

test('Sheet export uses the exact structured preview columns and cells', () => {
  const document = createTextAuthoringDocument([
    '# 반복 필드',
    '## 실행',
    '- [ ] 첫 항목',
    '  - 설명: 첫 설명',
    '  - 장소: 서울',
    '- [ ] 둘째 항목',
    '  - 설명: 둘째 설명',
    '  - 장소: 부산',
  ].join('\n'));
  const view = buildAuthoringArtifactProjection(document).artifacts.sheet;

  assert.deepEqual(buildAuthoringSheetExportTable(view), {
    columns: ['항목', '설명', '장소'],
    rows: [
      ['첫 항목', '첫 설명', '서울'],
      ['둘째 항목', '둘째 설명', '부산'],
    ],
  });
});

test('ICS export emits one VEVENT with the edited absolute date, time, timezone, and duration', () => {
  const output = serializeAuthoringIcs(
    '제주 여행 준비',
    [{
      ...ROW,
      time: '09:30',
      timezone: 'Asia/Seoul',
      durationMinutes: 45,
    }],
    '2026-07-29T00:00:00.000Z',
  );
  const unfolded = output.replace(/\r\n[ \t]/gu, '');

  assert.equal((output.match(/BEGIN:VEVENT/gu) ?? []).length, 1);
  assert.match(output, /DTSTART;TZID=Asia\/Seoul:20260801T093000/u);
  assert.match(output, /DURATION:PT45M/u);
  assert.match(output, /LOCATION:제주공항/u);
  assert.match(unfolded, /완료 기준: 예약번호를 남김/u);
  assert.match(unfolded, /원문 체크: 완료/u);
  assert.match(unfolded, /반복: 매주 월요일/u);
  assert.match(unfolded, /조건: 운항 상태가 정상일 때/u);
  assert.match(output, /END:VCALENDAR\r\n$/u);
});

test('ICS orders resolved dates ascending and uses source order for equal dates without mutating input rows', () => {
  const rows: AuthoringArtifactRow[] = [
    { ...ROW, itemId: 'late', title: '늦은 항목', date: '2026-08-10', order: 0 },
    { ...ROW, itemId: 'same-first', title: '같은 날 첫 항목', date: '2026-08-03', order: 1 },
    { ...ROW, itemId: 'same-second', title: '같은 날 둘째 항목', date: '2026-08-03', order: 2 },
  ];
  const originalOrder = rows.map((row) => row.itemId);

  const output = serializeAuthoringIcs(
    '정렬 확인',
    rows,
    '2026-08-04T00:00:00.000Z',
  );
  const exportedOrder = [...output.matchAll(/^UID:([^@]+)@flowme\.local$/gmu)]
    .map((match) => match[1]);

  assert.deepEqual(exportedOrder, ['same-first', 'same-second', 'late']);
  assert.deepEqual(rows.map((row) => row.itemId), originalOrder);
});
