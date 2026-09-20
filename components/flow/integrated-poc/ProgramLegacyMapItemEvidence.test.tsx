import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProgramLegacyMapItemEvidence, programLegacyMapItemEvidence } from './ProgramLegacyMapItemEvidence';
import { getPersonalWorkspacePocFlowItemFieldOwnership, type PersonalWorkspacePocFlow, type PersonalWorkspacePocFlowItem } from '../../../lib/flow/personal-workspace-poc-contract';

const item: PersonalWorkspacePocFlowItem = { ref: 'exact-item', savedCopyId: 'exact-copy', flowId: 'exact-flow', itemId: 'source-item', title: '서류 확인', description: '원문 설명\n- 실제 확인 항목', completionCriterion: '접수 결과 확인', sourceOrder: 0, sourceDate: '2026-09-30' };
const flow: PersonalWorkspacePocFlow = { ref: 'exact-flow-ref', savedCopyId: item.savedCopyId, flowId: item.flowId, sourceSlug: 'original', title: '원문 계획', origin: 'source-backed-map', items: [item] };

test('Map source review shows meaningful source content and keeps exact metadata collapsed without mutating it', () => {
  const before = JSON.stringify({ item, flow });
  const html = renderToStaticMarkup(<ProgramLegacyMapItemEvidence item={item} flow={flow} />);
  assert.match(html, /<dt>원문 내용<\/dt><dd>원문 설명\n- 실제 확인 항목<\/dd>/);
  assert.match(html, /<dt>완료 기준<\/dt><dd>접수 결과 확인<\/dd>/);
  assert.match(html, /<details><summary>저장된 연결 정보 자세히 보기<\/summary><pre>/);
  assert.ok(html.indexOf('원문 설명') < html.indexOf('exact-copy'));
  assert.doesNotMatch(html, /<details open/);
  assert.equal(JSON.stringify({ item, flow }), before);
});

test('personal description and execution date never become displayed source facts', () => {
  const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow);
  const personal: PersonalWorkspacePocFlowItem = { ...item, title: '개인 이름', description: 'PRIVATE NOTE', sourceDate: '2027-01-01', fieldOwnership: {
    ...ownership, description: { ...ownership.description, existingPersonal: { value: 'PRIVATE NOTE', owner: 'existing-personal', provenance: 'saved-map-persistence' }, effective: { value: 'PRIVATE NOTE', owner: 'existing-personal', provenance: 'saved-map-persistence' } },
    dateDerivation: { ...ownership.dateDerivation, sourceSchedule: { mode: 'day-offset', dayOffset: -30, owner: 'source', provenance: 'saved-map-persistence' } },
  } };
  const visible = programLegacyMapItemEvidence(personal, flow);
  assert.equal(visible.description, item.description); assert.equal(visible.title, item.title);
  assert.equal(visible.timing, '기준일에서 30일 전');
  const html = renderToStaticMarkup(<ProgramLegacyMapItemEvidence item={personal} flow={flow} />);
  const primary = html.slice(0, html.indexOf('<details>'));
  assert.doesNotMatch(primary, /PRIVATE NOTE|2027-01-01/);
});

test('day offsets retain direction, fixed dates stay exact, and missing source is not invented', () => {
  const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow);
  for (const [offset, expected] of [[0, '기준일 당일'], [7, '기준일에서 7일 후'], [-7, '기준일에서 7일 전']] as const) {
    assert.equal(programLegacyMapItemEvidence({ ...item, fieldOwnership: { ...ownership, dateDerivation: { ...ownership.dateDerivation, sourceSchedule: { mode: 'day-offset', dayOffset: offset, owner: 'source', provenance: 'saved-map-persistence' } } } }, flow).timing, expected);
  }
  assert.equal(programLegacyMapItemEvidence(item, flow).timing, '2026-09-30');
  const empty = { ...item, description: undefined, sourceDate: undefined, completionCriterion: undefined };
  const html = renderToStaticMarkup(<ProgramLegacyMapItemEvidence item={empty} flow={flow} />);
  assert.match(html, /저장된 원문 설명이 없습니다/); assert.match(html, /원문에 날짜가 없습니다/);
  assert.doesNotMatch(html, /<dt>완료 기준/);
});

test('source HTML stays escaped and unsupported schedule remains a review condition', () => {
  const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow);
  const hostile = { ...item, fieldOwnership: { ...ownership, description: { ...ownership.description, source: { value: '<img src=x onerror=alert(1)>', owner: 'source' as const, provenance: 'saved-map-persistence' as const } }, dateDerivation: { ...ownership.dateDerivation, sourceSchedule: { mode: 'unsupported' as const, sourceMode: 'legacy-custom', owner: 'source' as const, provenance: 'saved-map-persistence' as const } } } };
  const html = renderToStaticMarkup(<ProgramLegacyMapItemEvidence item={hostile} flow={flow} />);
  assert.match(html, /&lt;img/); assert.doesNotMatch(html, /<img|<script/);
  assert.match(html, /원문 일정 해석이 필요합니다 \(legacy-custom\)/);
});
