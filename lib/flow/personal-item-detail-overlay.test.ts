import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addPersonalDetailResource,
  addPersonalDetailSubcheck,
  movePersonalDetailEntry,
  removePersonalDetailResource,
  removePersonalDetailSubcheck,
  resolvePersonalItemDetail,
  restorePersonalDetailResource,
  restorePersonalDetailSubcheck,
  updatePersonalDetailSubcheck,
} from './personal-item-detail-overlay';

const base = {
  itemId: 'workout-1',
  sourceSubchecks: ['매트 준비', '통증 확인'],
  sourceResources: [{ label: '원본 영상', url: 'https://example.com/video' }],
};

test('personal detail overlay preserves source while adding and reordering personal subchecks', () => {
  const initial = resolvePersonalItemDetail(base);
  const withUser = addPersonalDetailSubcheck(initial.overlay, { id: 'personal-check-1', text: '물 준비' });
  const moved = movePersonalDetailEntry(
    withUser,
    'subcheck',
    [...initial.subchecks.map((entry) => entry.id), 'personal-check-1'],
    'personal-check-1',
    -1,
  );
  const resolved = resolvePersonalItemDetail({ ...base, overlay: moved });

  assert.deepEqual(resolved.subchecks.map((entry) => entry.text), ['매트 준비', '물 준비', '통증 확인']);
  assert.deepEqual(base.sourceSubchecks, ['매트 준비', '통증 확인']);
});

test('source subcheck deletion is a reversible personal tombstone', () => {
  const initial = resolvePersonalItemDetail(base);
  const sourceEntry = initial.subchecks[0];
  const removed = removePersonalDetailSubcheck(initial.overlay, sourceEntry);
  const hidden = resolvePersonalItemDetail({ ...base, overlay: removed });
  assert.deepEqual(hidden.subchecks.map((entry) => entry.text), ['통증 확인']);
  assert.equal(hidden.hiddenSourceSubchecks[0].id, sourceEntry.id);

  const restored = restorePersonalDetailSubcheck(removed, sourceEntry.id);
  assert.deepEqual(resolvePersonalItemDetail({ ...base, overlay: restored }).subchecks.map((entry) => entry.text), [
    '매트 준비',
    '통증 확인',
  ]);
});

test('source text edits and personal resources stay in the overlay', () => {
  const initial = resolvePersonalItemDetail(base);
  const changed = updatePersonalDetailSubcheck(initial.overlay, { ...initial.subchecks[0], text: '요가 매트 준비' });
  const withResource = addPersonalDetailResource(changed, {
    id: 'personal-resource-1',
    label: '내 자세 메모',
    url: 'https://example.com/note',
  });
  const resolved = resolvePersonalItemDetail({ ...base, overlay: withResource });

  assert.equal(resolved.subchecks[0].text, '요가 매트 준비');
  assert.equal(resolved.resources.length, 2);
  assert.equal(resolved.resources[1].origin, 'user_created');
});

test('source resource deletion can be restored without losing its URL', () => {
  const initial = resolvePersonalItemDetail(base);
  const sourceResource = initial.resources[0];
  const removed = removePersonalDetailResource(initial.overlay, sourceResource);
  const hidden = resolvePersonalItemDetail({ ...base, overlay: removed });
  assert.equal(hidden.resources.length, 0);
  assert.equal(hidden.hiddenSourceResources[0].url, 'https://example.com/video');

  const restored = restorePersonalDetailResource(removed, sourceResource.id);
  assert.equal(resolvePersonalItemDetail({ ...base, overlay: restored }).resources[0].url, 'https://example.com/video');
});

test('malformed overlay cannot remove valid source details', () => {
  const resolved = resolvePersonalItemDetail({
    ...base,
    overlay: {
      schemaVersion: 999,
      userSubchecks: [{ id: '', text: '' }, { id: 'duplicate', text: '첫째' }, { id: 'duplicate', text: '둘째' }],
      userResources: [{ id: 'bad', label: 'bad', url: 'javascript:alert(1)' }],
      subcheckOrder: ['unknown'],
    },
  });

  assert.deepEqual(resolved.subchecks.map((entry) => entry.text), ['매트 준비', '통증 확인', '첫째']);
  assert.deepEqual(resolved.resources.map((entry) => entry.label), ['원본 영상']);
});
