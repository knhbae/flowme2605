import assert from 'node:assert/strict';
import test from 'node:test';
import { splitExecutionDetailContent } from './execution-detail-content';

test('video metadata and URLs stay resources instead of completion-like subchecks', () => {
  const content = splitExecutionDetailContent({
    item_id: 'workout',
    how: [
      '- 영상: 5 MIN HOME WORKOUT',
      '- URL: https://www.youtube.com/watch?v=example',
      '- 요약: 아침 5분 전신 홈트',
    ].join('\n'),
    links: [{ label: '원본 운동 영상', url: 'https://www.youtube.com/watch?v=example', type: 'creator' }],
  });

  assert.deepEqual(content.checklistItems, []);
  assert.equal(content.resources.length, 1);
  assert.equal(content.resources[0].url, 'https://www.youtube.com/watch?v=example');
  assert.equal(content.referenceNotes.length, 3);
});

test('action bullets remain subchecks while an inline URL becomes a resource', () => {
  const content = splitExecutionDetailContent({
    item_id: 'mixed',
    how: [
      '- 준비물을 확인합니다',
      '- 링크: https://example.com/guide',
      '- 실행 결과를 기록합니다',
    ].join('\n'),
  });

  assert.deepEqual(content.checklistItems, ['준비물을 확인합니다', '실행 결과를 기록합니다']);
  assert.deepEqual(content.resources, [{ label: '원본 자료', url: 'https://example.com/guide', type: 'reference' }]);
});
