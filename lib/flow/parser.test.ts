import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDayOffset, parseDayRange, parseTextFlow, serializeTextFlow } from './parser';

test('parseDayOffset supports D-minus, D-Day, and D-plus syntax', () => {
  assert.equal(parseDayOffset('D-30'), -30);
  assert.equal(parseDayOffset('D-3'), -3);
  assert.equal(parseDayOffset('D-Day'), 0);
  assert.equal(parseDayOffset('D+3'), 3);
  assert.equal(parseDayOffset('D+0~D+2'), null);
});

test('parseDayRange returns inclusive start offset and duration', () => {
  assert.deepEqual(parseDayRange('D+0~D+2'), {
    day_offset: 0,
    duration_days: 3,
  });
  assert.deepEqual(parseDayRange('D+30~D+32'), {
    day_offset: 30,
    duration_days: 3,
  });
  assert.equal(parseDayRange('D+5~D+3'), null);
});

test('parseTextFlow extracts sections, items, repeat rules, warnings, and timings', () => {
  const parsed = parseTextFlow(
    [
      '# 테스트 이사 Flow',
      '',
      '@주 3회',
      '! 통증이 있으면 중단하세요.',
      '## D-30',
      '- 이사업체 견적 받기 D-30',
      '## D-Day',
      '- 이사 당일 확인 D-Day',
      '- 시작 구간 D+0~D+2',
    ].join('\n'),
    'flow-test',
  );

  assert.deepEqual(
    parsed.sections.map((section) => section.title),
    ['D-30', 'D-Day'],
  );
  assert.deepEqual(parsed.repeatRules, ['주 3회']);
  assert.deepEqual(parsed.warnings, ['통증이 있으면 중단하세요.']);
  assert.equal(parsed.items[0].title, '이사업체 견적 받기');
  assert.equal(parsed.items[0].day_offset, -30);
  assert.equal(parsed.items[1].day_offset, 0);
  assert.equal(parsed.items[2].day_offset, 0);
  assert.equal(parsed.items[2].duration_days, 3);
});

test('parseTextFlow extracts item details and serializeTextFlow writes them back', () => {
  const parsed = parseTextFlow(
    [
      '## D-Day',
      '- 전입신고와 확정일자 확인하기 D-Day',
      '  why: 보증금 보호와 주소 이전 처리를 위해 필요합니다.',
      '  how: 정부24와 인터넷등기소에서 처리 상태를 확인합니다.',
      '  done: 접수 상태와 확정일자 부여 여부를 확인했다.',
      '  link: 정부24 | https://www.gov.kr | official',
    ].join('\n'),
    'flow-detail',
  );

  assert.equal(parsed.itemDetails?.[0].item_id, 'flow-detail-item-0');
  assert.equal(parsed.itemDetails?.[0].why, '보증금 보호와 주소 이전 처리를 위해 필요합니다.');
  assert.equal(parsed.itemDetails?.[0].links?.[0].label, '정부24');

  const text = serializeTextFlow(parsed.sections, parsed.items, parsed.itemDetails);

  assert.match(text, /why: 보증금 보호와 주소 이전 처리를 위해 필요합니다\./);
  assert.match(text, /done: 접수 상태와 확정일자 부여 여부를 확인했다\./);
  assert.match(text, /link: 정부24 \| https:\/\/www\.gov\.kr \| official/);
});
