import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMyFlowStepIcs,
  buildMyFlowStepPortableText,
  canBuildMyFlowStepIcs,
  type MyFlowPortableStepExportInput,
} from './my-flow-step-export';

const baseInput: MyFlowPortableStepExportInput = {
  flowTitle: '원룸 이사 D-30 준비',
  stepId: 'moving-quote',
  stepTitle: '이사 방식과 견적 후보 정하기',
  sectionTitle: 'D-30 범위 쪼개기',
  date: '2026-06-24',
  time: '09:30',
  repeatPreset: 'weekly',
  location: '집',
  memo: '견적 후보 3곳과 포함 범위만 메모',
  sourceLabel: 'AJD 이사 체크리스트',
  sourceUrl: 'https://example.com/moving',
  items: ['포장/반포장/용달 중 하나 정하기', '견적 후보 2~3곳 열기'],
  checkedItems: { '0': true },
  completionCriteria: '이사 방식과 견적 후보가 정해졌다.',
  caution: '계약 전 포함 범위를 다시 확인한다.',
};

test('portable Step text carries edited schedule fields and checked items', () => {
  const text = buildMyFlowStepPortableText(baseInput);

  assert.match(text, /^이사 방식과 견적 후보 정하기/);
  assert.match(text, /Flow: 원룸 이사 D-30 준비/);
  assert.match(text, /구간: D-30 범위 쪼개기/);
  assert.match(text, /일정: 2026-06-24 09:30/);
  assert.match(text, /반복: 매주/);
  assert.match(text, /장소: 집/);
  assert.match(text, /- \[x\] 포장\/반포장\/용달 중 하나 정하기/);
  assert.match(text, /- \[ \] 견적 후보 2~3곳 열기/);
  assert.match(text, /완료 기준: 이사 방식과 견적 후보가 정해졌다\./);
  assert.match(text, /메모: 견적 후보 3곳과 포함 범위만 메모/);
  assert.match(text, /원문: AJD 이사 체크리스트 https:\/\/example\.com\/moving/);
});

test('Step ICS uses edited date time repeat location memo and source URL', () => {
  const ics = buildMyFlowStepIcs(baseInput);

  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /PRODID:-\/\/FLOW MVP\/\/My Flow Step Export\/\/KO/);
  assert.match(ics, /SUMMARY:이사 방식과 견적 후보 정하기/);
  assert.match(ics, /DTSTART:20260624T093000/);
  assert.match(ics, /DTEND:20260624T100000/);
  assert.match(ics, /RRULE:FREQ=WEEKLY/);
  assert.match(ics, /LOCATION:집/);
  assert.match(ics, /DESCRIPTION:.*견적 후보 3곳과 포함 범위만 메모/s);
  assert.match(ics, /URL:https:\/\/example\.com\/moving/);
  assert.match(ics, /END:VCALENDAR/);
});

test('Step ICS creates all-day event when time is empty', () => {
  const ics = buildMyFlowStepIcs({ ...baseInput, time: '' });

  assert.equal(canBuildMyFlowStepIcs({ ...baseInput, date: '' }), false);
  assert.match(ics, /DTSTART;VALUE=DATE:20260624/);
  assert.match(ics, /DTEND;VALUE=DATE:20260625/);
  assert.doesNotMatch(ics, /DTSTART:20260624T/);
});
