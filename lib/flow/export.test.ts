import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIcsCalendar, buildText, buildWorkbookSheets, buildXlsxBuffer } from './export';
import { seedBundles } from './seed-flows';

test('timeline text export includes calculated dates when anchor exists', () => {
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
  assert.ok(moving);

  const text = buildText(moving, {}, '2026-07-15');

  assert.match(text, /이사 D-30 준비 Flow/);
  assert.match(text, /이사일: 2026-07-15/);
  assert.match(text, /\[D-30 \/ 2026-06-15\]/);
  assert.match(text, /이사 방식 정하기/);
});

test('workbook export uses user-facing Korean columns instead of raw db fields', () => {
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
  assert.ok(moving);

  const sheets = buildWorkbookSheets(moving, { 'flow-moving-item-0': true }, '2026-07-15');
  const summary = sheets.find((sheet) => sheet.name === '실행 요약');
  assert.ok(summary);
  assert.deepEqual(summary.rows[0], ['FLOW', '이사 D-30 준비 Flow']);
  assert.deepEqual(summary.rows[2], ['진행률', '1 / 24 (4%)']);
  assert.ok(summary.rows.some((row) => row.includes('오늘/기준일 항목')));

  const execution = sheets.find((sheet) => sheet.name === '실행표');
  assert.ok(execution);

  assert.deepEqual(execution.columns, ['상태', '시점', '날짜', '섹션', '실행 내용', '완료 기준', '바로가기']);
  assert.doesNotMatch(execution.columns.join(','), /flow_title|structure_type|day_offset|done|why|how/);
  assert.deepEqual(execution.rows[0], [
    '완료',
    'D-30',
    '2026-06-15',
    'D-30 큰 준비',
    '이사 방식 정하기',
    '',
    '',
  ]);
  const moveInRow = execution.rows.find((row) => row.includes('전입신고와 확정일자 확인하기'));
  assert.ok(moveInRow);
  assert.match(String(moveInRow[5]), /전입신고 접수 상태/);
  assert.match(String(moveInRow[6]), /정부24 전입신고/);

  const detail = sheets.find((sheet) => sheet.name === '상세');
  assert.ok(detail);
  assert.deepEqual(detail.columns, ['실행 내용', '섹션', '왜 필요한가', '실행 방법', '주의', '출처/링크']);
  const detailRow = detail.rows.find((row) => row.includes('전입신고와 확정일자 확인하기'));
  assert.ok(detailRow);
  assert.match(String(detailRow[2]), /주소 이전/);
  assert.match(String(detailRow[3]), /정부24/);
});

test('meal plan workbook includes execution, recipe, and reaction log sheets', () => {
  const baby = seedBundles.find((bundle) => bundle.flow.slug === 'baby-food-menu-recipe');
  assert.ok(baby);

  const sheets = buildWorkbookSheets(
    baby,
    { 'meal-rice-0': true },
    '2026-06-01',
    {
      reactionLogs: {
        'meal-rice-0': {
          amount: '30ml',
          fedAt: '08:30',
          skin: '없음',
        },
      },
    },
  );

  assert.deepEqual(sheets.map((sheet) => sheet.name), ['실행 요약', '실행표', '주간 보기', '월간 보기', '상세', '레시피', '반응기록']);

  const execution = sheets.find((sheet) => sheet.name === '실행표');
  assert.ok(execution);
  assert.deepEqual(execution.rows[0], [
    '완료',
    'D+0~D+2',
    '2026-06-01 ~ 2026-06-03',
    '초기 1단계',
    '쌀미음',
    '새 재료: 쌀',
    '레시피: 쌀미음',
  ]);

  const recipes = sheets.find((sheet) => sheet.name === '레시피');
  assert.ok(recipes);
  assert.match(String(recipes.rows[0][1]), /쌀 또는 쌀가루/);
  assert.match(String(recipes.rows[0][2]), /1\. 쌀 또는 쌀가루를 준비한다/);

  const reaction = sheets.find((sheet) => sheet.name === '반응기록');
  assert.ok(reaction);
  assert.deepEqual(reaction.rows[0].slice(0, 7), [
    'D+0~D+2',
    '2026-06-01 ~ 2026-06-03',
    '쌀미음',
    '쌀',
    '30ml',
    '08:30',
    '없음',
  ]);

  const weekly = sheets.find((sheet) => sheet.name === '주간 보기');
  assert.ok(weekly);
  assert.deepEqual(weekly.columns, ['주', '월', '화', '수', '목', '금', '토', '일']);
  assert.ok(weekly.rows.some((row) => String(row[1]).includes('쌀미음 1일차')));
  assert.ok(weekly.rows.some((row) => String(row[2]).includes('쌀미음 2일차')));
  assert.ok(weekly.rows.some((row) => String(row[3]).includes('쌀미음 3일차')));

  const monthly = sheets.find((sheet) => sheet.name === '월간 보기');
  assert.ok(monthly);
  assert.deepEqual(monthly.columns, ['월/주', '월', '화', '수', '목', '금', '토', '일']);
  assert.ok(monthly.rows.some((row) => row[0] === '2026-06'));
  assert.ok(monthly.rows.some((row) => String(row[1]).includes('쌀미음 1일차')));
  assert.ok(monthly.rows.some((row) => String(row[2]).includes('쌀미음 2일차')));
  assert.ok(monthly.rows.some((row) => String(row[3]).includes('쌀미음 3일차')));
});

test('xlsx export builds a valid workbook archive', async () => {
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
  assert.ok(moving);

  const buffer = await buildXlsxBuffer(buildWorkbookSheets(moving, {}, '2026-07-15'));
  const bytes = Buffer.from(buffer);

  assert.ok(bytes.byteLength > 1000);
  assert.equal(bytes.subarray(0, 2).toString('utf8'), 'PK');
});

test('ics export creates all-day calendar events from dated flow items', () => {
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
  assert.ok(moving);

  const ics = buildIcsCalendar(moving, {}, '2026-07-15');

  assert.match(ics, /^BEGIN:VCALENDAR/m);
  assert.match(ics, /VERSION:2.0/);
  assert.match(ics, /PRODID:-\/\/FLOW MVP\/\/KO/);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /SUMMARY:이사 D-30 준비 Flow - 이사 방식 정하기/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260615/);
  assert.match(ics, /DTEND;VALUE=DATE:20260616/);
  assert.match(ics, /DESCRIPTION:/);
  assert.match(ics, /END:VCALENDAR$/);
});

test('ics export expands multi-day meal slots into calendar ranges', () => {
  const baby = seedBundles.find((bundle) => bundle.flow.slug === 'baby-food-menu-recipe');
  assert.ok(baby);

  const ics = buildIcsCalendar(baby, { 'meal-rice-0': true }, '2026-06-01');

  assert.match(ics, /SUMMARY:초기 이유식 메뉴·레시피 Flow - 쌀미음/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260601/);
  assert.match(ics, /DTEND;VALUE=DATE:20260604/);
  assert.match(ics, /STATUS:CONFIRMED/);
});
