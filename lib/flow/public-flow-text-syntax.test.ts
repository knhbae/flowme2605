import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFlowExperienceProjection } from './flow-experience-projection';
import { buildPublicFlowTextSyntaxModel } from './public-flow-text-syntax';
import type { PublicItemPersonalization } from './public-item-personalization';
import type { FlowBundle } from './types';

const CREATED_AT = '2026-08-20T00:00:00.000Z';

const bundle: FlowBundle = {
  flow: {
    id: 'text-syntax-flow',
    slug: 'text-syntax-flow',
    title: '원본 계획',
    category: '테스트',
    structure_type: 'timeline',
    anchor_type: 'start_date',
    warning: '진행 전 조건을 확인하세요.',
    status: 'published',
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
  },
  sections: [{
    id: 'section-a',
    flow_id: 'text-syntax-flow',
    title: '준비',
    order: 0,
  }],
  items: [
    {
      id: 'relative',
      flow_id: 'text-syntax-flow',
      section_id: 'section-a',
      title: '상대 일정',
      description: '원본 설명은 how가 아닙니다.',
      type: 'calendar',
      day_offset: -30,
      order: 0,
    },
    {
      id: 'range',
      flow_id: 'text-syntax-flow',
      section_id: 'section-a',
      title: '기간 일정',
      type: 'calendar',
      day_offset: 2,
      duration_days: 3,
      order: 1,
    },
    {
      id: 'fixed',
      flow_id: 'text-syntax-flow',
      section_id: 'section-a',
      title: '고정 일정',
      type: 'calendar',
      day_offset: 5,
      duration_days: 2,
      order: 2,
    },
    {
      id: 'undated',
      flow_id: 'text-syntax-flow',
      section_id: 'section-a',
      title: '날짜 제거 일정',
      type: 'calendar',
      day_offset: 7,
      order: 3,
    },
    {
      id: 'excluded',
      flow_id: 'text-syntax-flow',
      section_id: 'section-a',
      title: '제외한 일정',
      type: 'todo',
      order: 4,
    },
  ],
  itemDetails: [{
    item_id: 'relative',
    why: '이유 원문',
    how: '실행 방법 원문',
    completion_criteria: '실행 결과를 남겼다.',
    caution: '조건을 다시 확인한다.',
    links: [{
      label: '공식 자료',
      url: 'https://example.com/official',
      type: 'official',
    }],
  }],
  warnings: ['진행 전 조건을 확인하세요.', '개인 상황에 맞게 조정하세요.'],
};

test('builds full effective Text syntax without deriving D offsets from projected dates', () => {
  const personalizations: Record<string, PublicItemPersonalization> = {
    fixed: { title: '수정한 고정 일정', detail: '개인 실행 메모', date: '2031-01-02' },
    undated: { date: null },
  };
  const baseProjection = buildFlowExperienceProjection(bundle, {
    anchor: '2030-09-01',
    orderOverride: ['fixed', 'relative', 'range', 'undated', 'excluded'],
    excludedItemIds: ['excluded'],
    itemOverrides: {
      fixed: { title: '수정한 고정 일정', memo: '개인 실행 메모', date: '2031-01-02' },
      undated: { date: null },
    },
  });
  const projection = { ...baseProjection, title: '수정한 계획' };
  const model = buildPublicFlowTextSyntaxModel({ bundle, projection, itemPersonalizations: personalizations });
  const rows = model.groups.flatMap((group) => group.rows);

  assert.equal(model.title, '수정한 계획');
  assert.deepEqual(model.warnings, [
    '진행 전 조건을 확인하세요.',
    '개인 상황에 맞게 조정하세요.',
  ]);
  assert.deepEqual(rows.map((row) => row.id), ['fixed', 'relative', 'range', 'undated']);
  assert.equal(rows[0].title, '수정한 고정 일정');
  assert.equal(rows[0].scheduleMode, 'fixed_override');
  assert.equal(rows[0].fixedDate, '2031-01-02');
  assert.equal(rows[0].durationDays, 2);
  assert.equal(rows[0].timing, undefined);
  assert.equal(rows[0].personalDetail, '개인 실행 메모');
  assert.equal(rows[1].scheduleMode, 'source_relative');
  assert.equal(rows[1].timing, 'D-30');
  assert.equal(rows[1].description, '원본 설명은 how가 아닙니다.');
  assert.equal(rows[1].why, '이유 원문');
  assert.equal(rows[1].how, '실행 방법 원문');
  assert.equal(rows[1].done, '실행 결과를 남겼다.');
  assert.equal(rows[1].caution, '조건을 다시 확인한다.');
  assert.deepEqual(rows[1].resources, [{
    label: '공식 자료',
    url: 'https://example.com/official',
    type: 'official',
  }]);
  assert.equal(rows[2].timing, 'D+2~D+4');
  assert.equal(rows[3].scheduleMode, 'explicit_undated');
  assert.equal(rows[3].timing, undefined);
  assert.ok(!rows.some((row) => row.id === 'excluded'));
});

test('preserves meal-slot relative timing when a meal plan has no Flow items', () => {
  const mealBundle: FlowBundle = {
    flow: {
      id: 'meal-text-syntax',
      slug: 'meal-text-syntax',
      title: '식단 계획',
      category: '식단',
      structure_type: 'timeline',
      content_type: 'meal_plan',
      anchor_type: 'start_date',
      status: 'published',
      created_at: CREATED_AT,
      updated_at: CREATED_AT,
    },
    sections: [{
      id: 'meal-section',
      flow_id: 'meal-text-syntax',
      title: '첫 주',
      order: 0,
    }],
    items: [],
    mealSlots: [{
      id: 'meal-slot-a',
      flow_id: 'meal-text-syntax',
      section_id: 'meal-section',
      recipe_id: 'recipe-a',
      day_offset: 3,
      duration_days: 2,
      menu_title: '첫 식단',
      new_ingredients: ['감자'],
      order: 0,
    }],
  };
  const projection = buildFlowExperienceProjection(mealBundle, { anchor: '2030-09-01' });
  const model = buildPublicFlowTextSyntaxModel({ bundle: mealBundle, projection });

  assert.equal(model.groups[0].rows[0].timing, 'D+3~D+4');
  assert.equal(model.groups[0].rows[0].scheduleMode, 'source_relative');
});
