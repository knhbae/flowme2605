import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPublicFlowExperienceItemOverrides,
  promotePublicItemPersonalizations,
} from './public-item-personalization';
import {
  getMyFlowDateOverrideKey,
  MY_FLOW_DATE_REMOVED_OVERRIDE,
} from './my-flow-personal-state';
import { getPersonalDraftProjectionValueKey } from './personal-draft-projection-state';

test('public item draft becomes a projection override without mutating source', () => {
  const source = {
    itemId: 'move-contract',
    title: '이사업체 계약',
    detail: '계약서를 확인합니다.',
    date: '2030-07-16',
  };
  const sourceBefore = structuredClone(source);
  const overrides = buildPublicFlowExperienceItemOverrides({
    [source.itemId]: {
      title: '우리 집 이사업체 계약',
      detail: '예약번호를 함께 확인합니다.',
      date: '2030-07-18',
    },
  });

  assert.deepEqual(overrides[source.itemId], {
    title: '우리 집 이사업체 계약',
    memo: '예약번호를 함께 확인합니다.',
    date: '2030-07-18',
  });
  assert.deepEqual(source, sourceBefore);
});

test('save promotion reuses My Flow item draft and fixed-date override storage', () => {
  const flowSlug = 'moving-d30-basic';
  const itemId = 'move-contract';
  const sourceDate = '2030-07-16';
  const valueKey = getPersonalDraftProjectionValueKey(flowSlug, itemId);
  const dateKey = getMyFlowDateOverrideKey(flowSlug, itemId, sourceDate);
  const promotion = promotePublicItemPersonalizations({
    flowSlug,
    sources: [{
      itemId,
      title: '이사업체 계약',
      detail: '계약서를 확인합니다.',
      date: sourceDate,
    }],
    personalizations: {
      [itemId]: {
        title: '우리 집 이사업체 계약',
        detail: '예약번호를 함께 확인합니다.',
        date: '2030-07-18',
      },
    },
    itemDrafts: {
      [valueKey]: { location: '서울' },
    },
    dateOverrides: {
      [dateKey]: MY_FLOW_DATE_REMOVED_OVERRIDE,
    },
  });

  assert.deepEqual(promotion.itemDrafts[valueKey], {
    location: '서울',
    title: '우리 집 이사업체 계약',
    memo: '예약번호를 함께 확인합니다.',
    date: '2030-07-18',
  });
  assert.equal(promotion.dateOverrides[dateKey], undefined);
  assert.equal(promotion.promotedItemCount, 1);
  assert.equal(promotion.sourceMutationCount, 0);
});

test('explicit date removal keeps the item and records the existing unscheduled sentinel', () => {
  const flowSlug = 'moving-d30-basic';
  const itemId = 'move-contract';
  const sourceDate = '2030-07-16';
  const valueKey = getPersonalDraftProjectionValueKey(flowSlug, itemId);
  const dateKey = getMyFlowDateOverrideKey(flowSlug, itemId, sourceDate);
  const promotion = promotePublicItemPersonalizations({
    flowSlug,
    sources: [{ itemId, title: '이사업체 계약', date: sourceDate }],
    personalizations: {
      [itemId]: {
        title: '이사업체 계약',
        date: null,
      },
    },
    itemDrafts: {
      [valueKey]: { date: '2030-07-18', memo: '내 메모' },
    },
    dateOverrides: {},
  });

  assert.deepEqual(promotion.itemDrafts[valueKey], { memo: '내 메모' });
  assert.equal(promotion.dateOverrides[dateKey], MY_FLOW_DATE_REMOVED_OVERRIDE);
  assert.equal(promotion.sourceMutationCount, 0);
});
