import test from 'node:test';
import assert from 'node:assert/strict';
import { seedBundles } from './seed-flows';
import {
  getCreatorCardSurfaceMeta,
  getFlowSurfaceModel,
  hasGenericInternalTitle,
  inferFlowSurfaceType,
} from './surface';

function bySlug(slug: string) {
  const bundle = seedBundles.find((item) => item.flow.slug === slug);
  assert.ok(bundle, `missing seed bundle ${slug}`);
  return bundle;
}

test('representative flows map to a primary tool surface', () => {
  assert.equal(inferFlowSurfaceType(bySlug('real-thankyou-bubu-video-full-body-no-jump')), 'calendar_routine');
  assert.equal(inferFlowSurfaceType(bySlug('real-fitvely-video-body-fat-6kg-method')), 'daily_check');
  assert.equal(inferFlowSurfaceType(bySlug('moving-d30-basic')), 'dday_timeline');
  assert.equal(inferFlowSurfaceType(bySlug('real-qnet-application-examday-check')), 'dday_timeline');
});

test('surface model exposes first-screen recognition fields', () => {
  const model = getFlowSurfaceModel(bySlug('real-thankyou-bubu-video-full-body-no-jump'), {
    anchorDate: '2026-05-25',
    weekdays: ['월', '수', '금'],
  });

  assert.equal(model.type, 'calendar_routine');
  assert.equal(model.primaryToolLabel, '캘린더');
  assert.equal(model.rhythmLabel, '주 3회');
  assert.match(model.firstAction, /운동|영상/);
  assert.ok(model.previewEntries.length >= 3);
  assert.equal(model.primaryExport, 'calendar');
  assert.deepEqual(model.settings.map((setting) => setting.id), ['start_date', 'repeat_days', 'duration', 'missed_day']);
});

test('daily check model behaves like a checklist instead of workout calendar copy', () => {
  const model = getFlowSurfaceModel(bySlug('real-fitvely-video-body-fat-6kg-method'), {
    anchorDate: '2026-05-25',
    weekdays: ['월', '화', '수', '목', '금', '토', '일'],
  });

  assert.equal(model.type, 'daily_check');
  assert.equal(model.primaryToolLabel, '체크표');
  assert.equal(model.rhythmLabel, '매일');
  assert.equal(model.primaryExport, 'sheet');
  assert.ok(model.previewEntries.length >= 7);
  assert.ok(model.previewEntries.every((entry) => entry.label.includes('적용') || entry.label.includes('체크')));
});

test('creator card metadata exposes source task rhythm and tool', () => {
  const meta = getCreatorCardSurfaceMeta(bySlug('real-thankyou-bubu-video-full-body-no-jump'));

  assert.equal(meta.sourceKind, '정확한 출처');
  assert.match(meta.task, /운동|영상/);
  assert.equal(meta.rhythm, '주 3회');
  assert.equal(meta.tool, '캘린더');
  assert.match(meta.firstSetting, /시작일|요일/);
});

test('title quality helper catches internal abstraction titles', () => {
  assert.equal(hasGenericInternalTitle('FITVELY 탄수화물 기준 Flow'), true);
  assert.equal(hasGenericInternalTitle('운동/홈트 목표와 기준 정하기'), true);
  assert.equal(hasGenericInternalTitle('ThankyouBUBU 전신운동을 주 3회 캘린더에 넣기'), false);
});
