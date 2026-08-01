import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEffectiveFlowSnapshot } from './effective-flow-snapshot';
import {
  buildCalendarIcs,
  buildIcsCalendar,
  buildText,
  buildWorkbookSheets,
} from './export';
import { resolvePublicDateIntent } from './public-date-intent';
import { seedBundles } from './seed-flows';
import type { EffectiveFlowResult } from './effective-flow-snapshot';
import type { FlowBundle, FlowItemState } from './types';

const bundle: FlowBundle = {
  flow: {
    id: 'effective-export-flow',
    slug: 'effective-export-flow',
    title: '원본 이사 Flow',
    description: '원본 Flow 설명',
    category: '이사',
    structure_type: 'timeline',
    content_type: 'default',
    anchor_type: 'start_date',
    status: 'published',
    primary_destination: 'calendar',
    source_title: '공식 이사 안내',
    source_url: 'https://example.com/moving',
    source_status: 'real',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  },
  sections: [{
    id: 'section-main',
    flow_id: 'effective-export-flow',
    title: '이사 준비',
    order: 0,
  }],
  items: [
    {
      id: 'item-a',
      flow_id: 'effective-export-flow',
      section_id: 'section-main',
      title: '원본 A',
      description: '원본 설명 A',
      type: 'calendar',
      day_offset: 0,
      duration_days: 1,
      order: 0,
    },
    {
      id: 'item-b',
      flow_id: 'effective-export-flow',
      section_id: 'section-main',
      title: '제외할 B',
      description: '원본 설명 B',
      type: 'calendar',
      day_offset: 1,
      duration_days: 1,
      order: 1,
    },
    {
      id: 'item-c',
      flow_id: 'effective-export-flow',
      section_id: 'section-main',
      title: '원본 C',
      description: '원본 설명 C',
      type: 'calendar',
      day_offset: 2,
      duration_days: 1,
      order: 2,
    },
  ],
  itemDetails: [
    {
      item_id: 'item-a',
      why: '원본 필요 이유 A',
      how: '원본 실행 방법 A',
      completion_criteria: 'A 확인서를 저장했다.',
      caution: 'A 계약 조건을 다시 확인한다.',
      links: [{
        label: '공식 A 링크',
        url: 'https://example.com/moving/a',
        type: 'official',
      }],
    },
  ],
  warnings: [],
};

const itemStates: Record<string, FlowItemState> = {
  'item-a': { note: '실행 메모 A' },
  'item-b': { personalExcluded: true },
};

function customDateIntent(anchor = '2030-09-01') {
  return resolvePublicDateIntent({
    anchorType: bundle.flow.anchor_type,
    mode: 'custom',
    customAnchor: anchor,
    exampleAnchor: '',
  });
}

function buildResult(): EffectiveFlowResult {
  return buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: '내 맞춤 이사 Flow',
    dateIntent: customDateIntent(),
    itemStates,
    orderOverride: ['item-c', 'item-a', 'item-b'],
    publicItemPersonalizations: {
      'item-a': {
        title: '개인화 A',
        detail: '개인 메모 A',
        date: '2030-09-05',
      },
      'item-c': {
        title: '개인화 C',
        date: '2030-09-06',
      },
    },
  }).committed;
}

function unfoldIcs(value: string): string {
  return value.replaceAll('\r\n ', '');
}

function positionOf(value: string, pattern: string): number {
  const position = value.indexOf(pattern);
  assert.notEqual(position, -1, `missing ${pattern}`);
  return position;
}

test('effective result keeps one personalized truth across text, workbook, and ICS', () => {
  const sourceBefore = JSON.stringify(bundle);
  const effectiveResult = buildResult();
  const checks = { 'item-c': true };
  const text = buildText(
    bundle,
    checks,
    '2030-09-01',
    itemStates,
    undefined,
    undefined,
    effectiveResult,
  );
  const sheets = buildWorkbookSheets(bundle, checks, '2030-09-01', {
    itemStates,
    effectiveResult,
  });
  const rawIcs = buildIcsCalendar(
    bundle,
    checks,
    '2030-09-01',
    itemStates,
    effectiveResult,
  );
  const ics = unfoldIcs(rawIcs);

  assert.match(text, /^내 맞춤 이사 Flow/m);
  assert.ok(positionOf(text, '개인화 C') < positionOf(text, '개인화 A'));
  assert.doesNotMatch(text, /제외할 B/);
  assert.match(text, /2030-09-05/);
  assert.match(text, /설명: 원본 설명 A/);
  assert.match(text, /개인 메모: 개인 메모 A/);
  assert.match(text, /실행 메모: 실행 메모 A/);
  assert.match(text, /완료 기준: A 확인서를 저장했다\./);
  assert.match(text, /주의: A 계약 조건을 다시 확인한다\./);
  assert.match(text, /링크: 공식 A 링크 - https:\/\/example\.com\/moving\/a/);

  const summary = sheets.find((sheet) => sheet.name === '실행 요약');
  const execution = sheets.find((sheet) => sheet.name === '실행표');
  const detail = sheets.find((sheet) => sheet.name === '상세');
  assert.ok(summary && execution && detail);
  assert.deepEqual(summary.rows[0], ['FLOW', '내 맞춤 이사 Flow']);
  assert.deepEqual(execution.rows.map((row) => row[4]), ['개인화 C', '개인화 A']);
  assert.equal(execution.rows[1]?.[2], '2030-09-05');
  assert.match(String(execution.rows[1]?.[7]), /개인 메모: 개인 메모 A/);
  assert.match(String(execution.rows[1]?.[7]), /실행 메모: 실행 메모 A/);
  const detailA = detail.rows.find((row) => row[0] === '개인화 A');
  assert.ok(detailA);
  assert.match(String(detailA[2]), /설명: 원본 설명 A/);
  assert.match(String(detailA[2]), /왜 필요한가: 원본 필요 이유 A/);
  assert.match(String(detailA[4]), /A 계약 조건을 다시 확인한다\./);
  assert.match(String(detailA[5]), /공식 A 링크: https:\/\/example\.com\/moving\/a/);

  assert.match(ics, /X-WR-CALNAME:내 맞춤 이사 Flow/);
  assert.ok(positionOf(ics, 'UID:effective-export-flow-item-a@flow-mvp')
    < positionOf(ics, 'UID:effective-export-flow-item-c@flow-mvp'));
  assert.match(ics, /DTSTART;VALUE=DATE:20300905/);
  assert.match(ics, /SUMMARY:내 맞춤 이사 Flow - 개인화 A/);
  assert.match(ics, /설명: 원본 설명 A/);
  assert.match(ics, /개인 메모: 개인 메모 A/);
  assert.match(ics, /실행 메모: 실행 메모 A/);
  assert.match(ics, /완료 기준: A 확인서를 저장했다\./);
  assert.match(ics, /항목 주의: A 계약 조건을 다시 확인한다\./);
  assert.match(ics, /공식 A 링크: https:\/\/example\.com\/moving\/a/);
  assert.doesNotMatch(ics, /제외할 B|effective-export-flow-item-b@flow-mvp/);
  for (const line of rawIcs.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `ICS line exceeds 75 bytes: ${line}`);
  }
  assert.equal(JSON.stringify(bundle), sourceBefore);
});

test('date removal stays removed and source-based UID survives title, date, and order changes', () => {
  const removedResult = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: '날짜 제거 Flow',
    dateIntent: customDateIntent(),
    orderOverride: ['item-a', 'item-c', 'item-b'],
    publicItemPersonalizations: {
      'item-a': { title: '날짜 없는 A', date: null },
      'item-c': { date: '2030-09-10' },
    },
  }).committed;
  const text = buildText(
    bundle,
    {},
    '2030-09-01',
    {},
    undefined,
    undefined,
    removedResult,
  );
  const execution = buildWorkbookSheets(bundle, {}, '2030-09-01', {
    effectiveResult: removedResult,
  }).find((sheet) => sheet.name === '실행표');
  const removedIcs = unfoldIcs(buildIcsCalendar(
    bundle,
    {},
    '2030-09-01',
    {},
    removedResult,
  ));

  const removedTextItem = text.slice(
    positionOf(text, '날짜 없는 A'),
    positionOf(text, '원본 C'),
  );
  assert.doesNotMatch(removedTextItem, /2030-09-01/);
  assert.ok(execution);
  assert.equal(execution.rows.find((row) => row[4] === '날짜 없는 A')?.[2], '');
  assert.doesNotMatch(removedIcs, /날짜 없는 A|effective-export-flow-item-a@flow-mvp/);

  const firstResult = buildResult();
  const changedResult: EffectiveFlowResult = {
    ...firstResult,
    projection: {
      ...firstResult.projection,
      title: '다시 이름 붙인 Flow',
    },
    rows: firstResult.rows.map((row) => row.sourceItemId === 'item-a'
      ? {
          ...row,
          title: '다시 이름 붙인 A',
          orderRank: 99,
          schedule: { ...row.schedule, date: '2030-12-24' },
        }
      : row),
  };
  const firstIcs = unfoldIcs(buildIcsCalendar(bundle, {}, undefined, {}, firstResult));
  const changedIcs = unfoldIcs(buildIcsCalendar(bundle, {}, undefined, {}, changedResult));
  assert.match(firstIcs, /UID:effective-export-flow-item-a@flow-mvp/);
  assert.match(changedIcs, /UID:effective-export-flow-item-a@flow-mvp/);
  assert.match(changedIcs, /SUMMARY:다시 이름 붙인 Flow - 다시 이름 붙인 A/);
  assert.match(changedIcs, /DTSTART;VALUE=DATE:20301224/);

  const tiedResult: EffectiveFlowResult = {
    ...firstResult,
    rows: firstResult.rows.map((row) => ({
      ...row,
      orderRank: 0,
      schedule: { ...row.schedule, date: '2030-10-10' },
    })),
  };
  const tiedIcs = unfoldIcs(buildIcsCalendar(bundle, {}, undefined, {}, tiedResult));
  assert.ok(positionOf(tiedIcs, 'UID:effective-export-flow-item-a@flow-mvp')
    < positionOf(tiedIcs, 'UID:effective-export-flow-item-c@flow-mvp'));
});

test('meal plan effective rows keep personalization and meal metadata across specialized exports', () => {
  const mealBundle = seedBundles.find((entry) => entry.flow.slug === 'baby-food-menu-recipe');
  assert.ok(mealBundle);
  const [first, excluded, movedFirst] = mealBundle.mealSlots ?? [];
  assert.ok(first && excluded && movedFirst);
  const recipe = mealBundle.recipes?.find((entry) => entry.id === first.recipe_id);
  assert.ok(recipe);
  const sourceBefore = JSON.stringify(mealBundle);
  const mealItemStates: Record<string, FlowItemState> = {
    [first.id]: { note: '실제 섭취량을 기록함' },
    [excluded.id]: { personalExcluded: true },
  };
  const effectiveResult = buildEffectiveFlowSnapshot({
    bundle: mealBundle,
    effectiveTitle: '우리 아이 이유식 Flow',
    dateIntent: resolvePublicDateIntent({
      anchorType: mealBundle.flow.anchor_type,
      mode: 'custom',
      customAnchor: '2030-09-01',
      exampleAnchor: '',
    }),
    itemStates: mealItemStates,
    orderOverride: [movedFirst.id, first.id, excluded.id],
    publicItemPersonalizations: {
      [first.id]: {
        title: '첫 쌀미음',
        detail: '첫 섭취 반응을 기록합니다.',
        date: '2030-10-10',
      },
    },
  }).committed;
  const checks = { [movedFirst.id]: true };
  const text = buildText(
    mealBundle,
    checks,
    '2030-09-01',
    mealItemStates,
    undefined,
    undefined,
    effectiveResult,
  );
  const sheets = buildWorkbookSheets(mealBundle, checks, '2030-09-01', {
    itemStates: mealItemStates,
    effectiveResult,
  });
  const rawIcs = buildIcsCalendar(
    mealBundle,
    checks,
    '2030-09-01',
    mealItemStates,
    effectiveResult,
  );
  const ics = unfoldIcs(rawIcs);

  assert.match(text, /^우리 아이 이유식 Flow/m);
  assert.ok(positionOf(text, movedFirst.menu_title) < positionOf(text, '첫 쌀미음'));
  assert.doesNotMatch(text, new RegExp(excluded.menu_title));
  assert.match(text, /2030-10-10 ~ 2030-10-12/);
  assert.match(text, new RegExp(`새 재료: ${first.new_ingredients.join(', ')}`));
  assert.match(text, /개인 메모: 첫 섭취 반응을 기록합니다\./);
  assert.match(text, /실행 메모: 실제 섭취량을 기록함/);
  assert.match(text, new RegExp(`레시피: ${recipe.title}`));

  const summary = sheets.find((sheet) => sheet.name === '실행 요약');
  const execution = sheets.find((sheet) => sheet.name === '실행표');
  const detail = sheets.find((sheet) => sheet.name === '상세');
  const recipes = sheets.find((sheet) => sheet.name === '레시피');
  assert.ok(summary && execution && detail && recipes);
  assert.deepEqual(summary.rows[0], ['FLOW', '우리 아이 이유식 Flow']);
  assert.match(String(summary.rows.find((row) => row[0] === '진행률')?.[1]), /^1 \/ 10/);
  assert.deepEqual(execution.rows.slice(0, 2).map((row) => row[4]), [
    movedFirst.menu_title,
    '첫 쌀미음',
  ]);
  assert.equal(execution.rows.find((row) => row[4] === '첫 쌀미음')?.[2], '2030-10-10 ~ 2030-10-12');
  assert.equal(execution.rows.some((row) => row[4] === excluded.menu_title), false);
  assert.match(String(execution.rows.find((row) => row[4] === '첫 쌀미음')?.[5]), /새 재료/);
  assert.match(String(detail.rows.find((row) => row[0] === '첫 쌀미음')?.[4]), new RegExp(recipe.caution_note ?? ''));
  assert.equal(recipes.rows.length, mealBundle.recipes?.length);

  assert.match(ics, /X-WR-CALNAME:우리 아이 이유식 Flow/);
  assert.match(ics, new RegExp(`UID:${mealBundle.flow.id}-${first.id}@flow-mvp`));
  assert.match(ics, /DTSTART;VALUE=DATE:20301010/);
  assert.match(ics, /SUMMARY:우리 아이 이유식 Flow - 첫 쌀미음/);
  assert.match(ics, new RegExp(`새 재료: ${first.new_ingredients.join(', ')}`));
  assert.match(ics, /개인 메모: 첫 섭취 반응을 기록합니다\./);
  assert.doesNotMatch(ics, new RegExp(`${excluded.id}@flow-mvp|${excluded.menu_title}`));
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 10);
  for (const line of rawIcs.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `ICS line exceeds 75 bytes: ${line}`);
  }
  assert.equal(JSON.stringify(mealBundle), sourceBefore);
});

test('routine recurrence keeps its explicit series anchor instead of an item fixed date', () => {
  const routineBundle: FlowBundle = {
    ...bundle,
    flow: {
      ...bundle.flow,
      id: 'routine-export-flow',
      slug: 'routine-export-flow',
      title: '매주 점검 Flow',
      structure_type: 'routine',
      anchor_type: 'start_date',
    },
    sections: bundle.sections.map((section) => ({
      ...section,
      flow_id: 'routine-export-flow',
    })),
    items: [{
      ...bundle.items[0],
      id: 'routine-item',
      flow_id: 'routine-export-flow',
      repeat_rule: 'FREQ=WEEKLY',
    }],
    itemDetails: [],
  };
  const fixedDateSnapshot = buildEffectiveFlowSnapshot({
    bundle: routineBundle,
    effectiveTitle: '내 매주 점검 Flow',
    dateIntent: resolvePublicDateIntent({
      anchorType: routineBundle.flow.anchor_type,
      mode: 'custom',
      customAnchor: '2030-09-01',
      exampleAnchor: '',
    }),
    publicItemPersonalizations: {
      'routine-item': { date: '2030-12-24' },
    },
  });
  assert.equal(
    fixedDateSnapshot.committed.rows[0]?.schedule.date,
    '2030-12-24',
  );
  assert.deepEqual(
    fixedDateSnapshot.committed.exportPlan.formats.calendar.omittedFields.map(
      (omission) => omission.field,
    ),
    ['item_title', 'item_detail', 'item_date', 'item_inclusion', 'item_order'],
  );

  const recurrence = unfoldIcs(buildCalendarIcs(
    routineBundle,
    '2030-09-01',
    ['월'],
    undefined,
    fixedDateSnapshot.committed,
  ));
  assert.match(recurrence, /DTSTART;VALUE=DATE:20300901/);
  assert.doesNotMatch(recurrence, /20301224/);
  assert.match(recurrence, /RRULE:FREQ=WEEKLY/);
  assert.match(recurrence, /SUMMARY:내 매주 점검 Flow/);
});
