import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { programSeoulDate, programStampLabel } from './date-label';

// int4 QA P3 (11/10): saved/published days in Seoul time, the arrival notice's menu name, the 1280 rail's current tab on hover.
const component = (name: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('P3-INT4-1: a stored UTC time reads as its Seoul day, with the weekday; another year shows the year; no ISO date', () => {
  assert.equal(programSeoulDate('2026-11-09T14:59:59.000Z'), '2026-11-09');
  assert.equal(programSeoulDate('2026-11-09T15:00:00.000Z'), '2026-11-10', 'midnight in Seoul is the next day');
  assert.equal(programSeoulDate('not a time'), null);
  assert.equal(programStampLabel('2026-11-09T00:30:00.000Z', '2026-11-10'), '11월 9일 (월)');
  assert.equal(programStampLabel('2026-11-09T16:30:00.000Z', '2026-11-10'), '11월 10일 (화)', 'saved at 1:30 a.m. in Seoul is not the day before');
  assert.equal(programStampLabel('2025-06-01T00:00:00.000Z', '2026-11-10'), '2025년 6월 1일');
  const management = component('ProgramPublicationManagement.tsx'), community = component('ProgramCommunity.tsx');
  assert(management.includes("{flow.archived ? '공개 철회됨' : '공개 중'} · {programStampLabel(version.createdAt)}") && !/At\.slice\(0, 10\)/.test(management));
  assert(community.includes('function stamp(value: string) { return programStampLabel(value); }') && community.includes('작성 중 초안 · {stamp(entry.updatedAt)} 저장'));
});

test('P3-INT4-2 and 3: the arrival notice names 공개하기; the current rail tab keeps 18% under the pointer', () => {
  const workspace = component('AlphaWorkspace.tsx');
  assert(workspace.includes('글 메뉴의 ‘공개하기’를 누르면 출처 칸이 채워져 있습니다.') && !workspace.includes('선택해서 공개'));
  assert(component('AlphaWorkspace.module.css').includes('  .page[data-alpha-frame="b"] .globalNavigation button[aria-current]:hover:not(:disabled) { background: var(--flowme-b-nav-active); color: #fff; }'));
});
