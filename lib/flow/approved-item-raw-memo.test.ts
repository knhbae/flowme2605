import assert from 'node:assert/strict';
import test from 'node:test';

import {
  composeApprovedItemRawMemoText,
  parseApprovedItemRawMemoText,
} from './approved-item-raw-memo';

const FIXTURE_RAW_MEMO = [
  '현관, 욕실, 주방, 창문, 콘센트, 보일러 주변을 사진과 짧은 메모로 남깁니다.',
  '',
  '- [ ] 현관과 창문 사진 남기기',
  '- [ ] 욕실과 주방 하자 적기',
  '- [x] 집주인 또는 중개인에게 공유하기',
  '',
  '완료 기준: 주요 공간 사진과 하자 목록을 공유했다.',
].join('\n');

test('compose creates the approved LF-normalized raw memo order', () => {
  const memoText = composeApprovedItemRawMemoText({
    description: '현관, 욕실, 주방, 창문, 콘센트, 보일러 주변을 사진과 짧은 메모로 남깁니다.\r\n',
    checklistEntries: [
      { text: '현관과 창문 사진 남기기' },
      { text: '욕실과 주방 하자 적기' },
      { text: '집주인 또는 중개인에게 공유하기', completed: true },
    ],
    completionCriterion: '완료 기준: 주요 공간 사진과 하자 목록을 공유했다.',
  });

  assert.equal(memoText, FIXTURE_RAW_MEMO);
  assert.doesNotMatch(memoText, /\r/u);
});

test('embedded checklist and completion lines win without being duplicated', () => {
  const memoText = composeApprovedItemRawMemoText({
    memoText: FIXTURE_RAW_MEMO.replace(/\n/gu, '\r\n'),
    description: '사용하지 않을 설명',
    checklistEntries: [
      { text: '현관과 창문 사진 남기기' },
      { text: '별도 필드에만 남은 오래된 항목' },
    ],
    completionCriterion: '별도 필드에만 남은 오래된 기준',
  });

  assert.equal(memoText, FIXTURE_RAW_MEMO);
  assert.equal(memoText.match(/현관과 창문 사진 남기기/gu)?.length, 1);
  assert.equal(memoText.match(/완료 기준:/gu)?.length, 1);
  assert.doesNotMatch(memoText, /오래된/u);
});

test('parse derives updated description, checklist markers, and completion criterion', () => {
  const parsed = parseApprovedItemRawMemoText(`\r\n첫 문장\r\n둘째 문장\r\n\r\n- [x] 첫 확인\r\n- [ ] 둘째 확인\r\n\r\n완료 기준: 결과를 공유했다.\r\n`);

  assert.equal(parsed.memoText, [
    '첫 문장',
    '둘째 문장',
    '',
    '- [x] 첫 확인',
    '- [ ] 둘째 확인',
    '',
    '완료 기준: 결과를 공유했다.',
  ].join('\n'));
  assert.equal(parsed.description, '첫 문장\n둘째 문장');
  assert.deepEqual(parsed.checklistEntries, [
    { text: '첫 확인', completed: true, lineIndex: 3 },
    { text: '둘째 확인', completed: false, lineIndex: 4 },
  ]);
  assert.equal(parsed.completionCriterion, '결과를 공유했다.');
});

test('compose falls back to description and removes duplicate legacy checklist entries', () => {
  const memoText = composeApprovedItemRawMemoText({
    memoText: '   ',
    description: '설명',
    checklistEntries: [
      { text: '같은 항목' },
      { text: ' 같은   항목 ' },
      { text: '다른 항목', completed: true },
    ],
  });

  assert.equal(memoText, '설명\n\n- [ ] 같은 항목\n- [x] 다른 항목');
});
