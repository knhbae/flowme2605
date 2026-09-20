import type { FlowBundle } from '../../lib/flow/types';

export const K3B_MEMO_DATE = '2026-09-05';
export const K3B_MEMO_NOW = '2026-09-05T01:00:00.000Z';
export const K3B_MEMO_SOURCE = '원문 설명은 내 메모와 별도로 보존한다.';
export const K3B_MEMO_CRITERION = '접수 번호와 준비물을 모두 확인했다.';
export const K3B_IMPORTED_MEMOS = ['  기존 개인 메모\r\n다음 줄도 그대로  ', '', ' \t  ', K3B_MEMO_SOURCE, undefined] as const;
export const K3B_MEMO_ORIGINS = ['source-backed-map', 'personal-draft', 'canonical-personal-copy', 'legacy-saved-plan'] as const;
export type K3bMemoOrigin = typeof K3B_MEMO_ORIGINS[number];

export function k3bImportedMemoFixture(options: { strictMap?: boolean; firstMemo?: string } = {}) {
  const memos: readonly (string | undefined)[] = [options.firstMemo ?? K3B_IMPORTED_MEMOS[0], ...K3B_IMPORTED_MEMOS.slice(1)];
  const slugs = ['k3b-memo-map', 'url-draft-k3b-memo', 'k3b-memo-copy-source', 'k3b-memo-legacy'];
  const owners = [slugs[0], slugs[1], 'copy:k3b-memo', slugs[3]];
  const mapOwns = (memo: string | undefined, index: number) => memo !== undefined && Boolean(memo.trim()) && (!options.strictMap || index === 3);
  const bundles: FlowBundle[] = slugs.map((slug, originIndex) => ({
    flow: { id: `flow:${slug}`, slug, title: `기존 메모 ${K3B_MEMO_ORIGINS[originIndex]}`, category: '격리 fixture',
      structure_type: 'timeline', anchor_type: 'start_date', status: originIndex === 1 ? 'draft' : 'published',
      source_title: originIndex === 1 ? '내 메모' : '원문 출처', source_url: `https://example.com/k3b/${slug}`,
      created_at: K3B_MEMO_NOW, updated_at: K3B_MEMO_NOW, ...(originIndex === 1 ? { tags: ['내 초안'] } : {}) },
    sections: [{ id: `${slug}-section`, flow_id: `flow:${slug}`, title: '준비', order: 0 }],
    items: memos.map((_, index) => ({ id: `memo-item-${index}`, flow_id: `flow:${slug}`, section_id: `${slug}-section`,
      title: `원문 할 일 ${index + 1}`, description: K3B_MEMO_SOURCE, type: 'calendar', day_offset: 0, order: index })),
    itemDetails: memos.map((_, index) => ({ item_id: `memo-item-${index}`, completion_criteria: K3B_MEMO_CRITERION })),
  }));
  const saved = (slug: string) => ({ slug, savedAt: K3B_MEMO_NOW, selectedArtifactMode: 'calendar', dateIntent: 'custom', anchor: K3B_MEMO_DATE });
  const itemDrafts: Record<string, { memo: string }> = {};
  owners.forEach((owner, originIndex) => memos.forEach((memo, itemIndex) => {
    if (memo !== undefined) itemDrafts[`${owner}::memo-item-${itemIndex}::draft-overlay`] = {
      // Map userMemo rejects blank values under its existing strict contract.
      // Blank memos use the valid item-draft owner; nonblank Map values win.
      memo: originIndex === 0 && mapOwns(memo, itemIndex) ? '낮은 우선순위 item draft' : memo,
    };
  }));
  const mapSlug = slugs[0];
  const personalCopy = { source: 'personal_edit',
    includedStepIdsByFlow: { [mapSlug]: memos.map((_, index) => `memo-item-${index}`) },
    excludedStepIdsByFlow: { [mapSlug]: [] },
    stepOverridesByFlow: { [mapSlug]: Object.fromEntries(memos.flatMap((memo, index) => !mapOwns(memo, index) ? [] : [[`memo-item-${index}`, { userMemo: memo }]])) },
  };
  const snapshot = { mapId: 'k3b-memo-map-owner', title: '기존 메모 지도', version: 'v1', savedAt: K3B_MEMO_NOW,
    anchor: K3B_MEMO_DATE, flowSlugs: [mapSlug], stepCountsByFlow: { [mapSlug]: memos.length }, personalCopy };
  const entries: Array<[string, string]> = [
    ['flow_builder_mvp_bundles_v11', JSON.stringify(bundles)],
    ['flow:map:saved:k3b-memo-map-owner', JSON.stringify(snapshot)],
    [`flow:saved:${mapSlug}`, JSON.stringify(saved(mapSlug))],
    [`flow:saved:${slugs[1]}`, JSON.stringify(saved(slugs[1]))],
    ['flow:saved:copy:k3b-memo', JSON.stringify({ ...saved(owners[2]), schemaVersion: 2,
      personalCopyKey: owners[2], sourceFlowKey: `flow:${slugs[2]}`, sourceFlowSlug: slugs[2], sourceVersion: 'source-v1',
      lastSaveRequestId: 'request:k3b-memo', savedItemCount: memos.length })],
    [`flow:saved:${slugs[3]}`, JSON.stringify(saved(slugs[3]))],
    ['flow:my-flow:item-drafts', JSON.stringify(itemDrafts)],
  ];
  if (options.strictMap) entries.push(['flow:map:persistence:k3b-memo-map-owner', JSON.stringify({
    schemaVersion: 1, recordType: 'saved_source_backed_flow_map', bridgeStorageKey: 'flow:map:saved:k3b-memo-map-owner',
    map: { id: snapshot.mapId, title: snapshot.title, userLabel: '내 지도', version: 'v1', updatedAt: K3B_MEMO_NOW,
      updatePolicy: 'review_before_apply', sourceTitle: '원문 출처', sourceUrl: 'https://example.com/k3b/map' },
    saved: { savedAt: K3B_MEMO_NOW, sourceSurface: 'public_save', anchor: K3B_MEMO_DATE },
    readiness: { content: 'ready_for_my_flow', update: 'up_to_date', reasons: [] },
    childFlows: [{ slug: mapSlug, flowId: `flow:${mapSlug}`, title: bundles[0].flow.title, category: '격리 fixture',
      structureType: 'timeline', anchorType: 'start_date', primaryDestination: 'calendar', stepCount: memos.length,
      itemFallbackCount: 0, stepIds: memos.map((_, index) => `memo-item-${index}`),
      steps: memos.map((_, index) => ({ stepId: `memo-item-${index}`, title: `원문 할 일 ${index + 1}`, destination: 'calendar',
        calendar: { mode: 'anchor_offset', anchorType: 'start_date', dayOffset: 0, allDay: true },
        textFallback: { title: `원문 할 일 ${index + 1}`, description: K3B_MEMO_SOURCE, doneWhen: K3B_MEMO_CRITERION } })) }],
    updateAssessment: { status: 'up_to_date', userAction: 'none', canApplyAutomatically: false, savedVersion: 'v1', reasons: [], affectedFlows: [] },
    personalCopy,
  })]);
  return { bundles, entries, memos, owners };
}
