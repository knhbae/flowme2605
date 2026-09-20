import React from 'react';
import { getPersonalWorkspacePocFlowItemFieldOwnership, type PersonalWorkspacePocFlow, type PersonalWorkspacePocFlowItem } from '@/lib/flow/personal-workspace-poc-contract';

/** Read the source layer, never relabel an existing personal edit as the source. */
export function programLegacyMapItemEvidence(item: PersonalWorkspacePocFlowItem, flow: PersonalWorkspacePocFlow) {
  const fields = getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow);
  const schedule = fields.dateDerivation.sourceSchedule;
  const timing = schedule.mode === 'absolute' ? schedule.date ?? '원문에 날짜가 없습니다'
    : schedule.mode === 'day-offset' ? schedule.dayOffset === 0 ? '기준일 당일'
      : `기준일에서 ${Math.abs(schedule.dayOffset)}일 ${schedule.dayOffset < 0 ? '전' : '후'}`
    : schedule.mode === 'unsupported' ? `원문 일정 해석이 필요합니다 (${schedule.sourceMode})`
    : '원문에 날짜가 없습니다';
  return { title: fields.title.source.value, description: fields.description.source.value,
    timing, completionCriterion: item.completionCriterion };
}

export function ProgramLegacyMapItemEvidence({ item, flow, className }: {
  item: PersonalWorkspacePocFlowItem; flow: PersonalWorkspacePocFlow; className?: string;
}) {
  const evidence = programLegacyMapItemEvidence(item, flow);
  return <div className={className}>
    <dl>
      {evidence.title && evidence.title !== item.title && <><dt>원문 항목 이름</dt><dd>{evidence.title}</dd></>}
      <dt>원문 내용</dt><dd>{evidence.description || '저장된 원문 설명이 없습니다. 아래 출처에서 내용을 확인하세요.'}</dd>
      <dt>원문 일정</dt><dd>{evidence.timing}</dd>
      {evidence.completionCriterion && <><dt>완료 기준</dt><dd>{evidence.completionCriterion}</dd></>}
    </dl>
    <details><summary>저장된 연결 정보 자세히 보기</summary><pre>{JSON.stringify(item, null, 2)}</pre></details>
  </div>;
}
