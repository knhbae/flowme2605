import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addMovingRestartItem,
  buildMovingRestartChecklistText,
  buildMovingRestartIcs,
  buildMovingRestartSheets,
  deleteMovingRestartItem,
  generateMovingRestartItems,
  moveMovingRestartItem,
  updateMovingRestartItem,
} from './moving-d30-restart';

test('moving restart generates dated items from move date offsets', () => {
  const items = generateMovingRestartItems('2026-06-27');

  assert.equal(items[0].id, 'moving-restart-method');
  assert.equal(items[0].date, '2026-05-28');
  assert.equal(items[0].offsetLabel, 'D-30');
  assert.equal(items.find((item) => item.id === 'moving-restart-final-call')?.date, '2026-06-26');
  assert.equal(items.find((item) => item.id === 'moving-restart-moving-day-settlement')?.date, '2026-06-27');
  assert.equal(items.find((item) => item.id === 'moving-restart-gov24-result')?.date, '2026-06-28');
});

test('moving restart edit helpers preserve user changes before export', () => {
  const original = generateMovingRestartItems('2026-06-27');
  const moved = moveMovingRestartItem(original, 'moving-restart-address-change', '2026-06-18');
  const edited = updateMovingRestartItem(moved, 'moving-restart-address-change', {
    title: '주소 변경과 인터넷 이전 설치 예약',
    memo: '인터넷 이전 설치는 오전 시간으로 예약',
  });
  const added = addMovingRestartItem(edited, {
    title: '관리사무소 엘리베이터 예약',
    date: '2026-06-20',
    memo: '오전 9시부터 12시까지',
  });
  const deleted = deleteMovingRestartItem(added, 'moving-restart-declutter');

  const changed = deleted.find((item) => item.id === 'moving-restart-address-change');
  assert.equal(changed?.date, '2026-06-18');
  assert.equal(changed?.title, '주소 변경과 인터넷 이전 설치 예약');
  assert.equal(changed?.memo, '인터넷 이전 설치는 오전 시간으로 예약');
  assert.equal(deleted.some((item) => item.title === '관리사무소 엘리베이터 예약'), true);
  assert.equal(deleted.some((item) => item.id === 'moving-restart-declutter'), false);
});

test('moving restart exports use edited item state', () => {
  const items = addMovingRestartItem(
    updateMovingRestartItem(
      moveMovingRestartItem(generateMovingRestartItems('2026-06-27'), 'moving-restart-address-change', '2026-06-18'),
      'moving-restart-address-change',
      { memo: '인터넷 이전 설치는 오전 시간으로 예약' },
    ),
    { title: '관리사무소 엘리베이터 예약', date: '2026-06-20' },
  );

  const checklist = buildMovingRestartChecklistText(items);
  assert.match(checklist, /2026-06-18/);
  assert.match(checklist, /인터넷 이전 설치는 오전 시간으로 예약/);
  assert.match(checklist, /관리사무소 엘리베이터 예약/);

  const ics = buildMovingRestartIcs(items);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260618/);
  assert.match(ics, /SUMMARY:주소 변경과 정기 서비스 정리/);
  assert.doesNotMatch(ics, /SUMMARY:D-10/);
  assert.match(ics, /DESCRIPTION:시점 D-10/);

  const sheets = buildMovingRestartSheets(items);
  assert.deepEqual(sheets[0].columns, ['상태', '시점', '날짜', '실행 내용', '메모', '출처']);
  assert.equal(sheets[0].rows.some((row) => row.includes('관리사무소 엘리베이터 예약')), true);
});
