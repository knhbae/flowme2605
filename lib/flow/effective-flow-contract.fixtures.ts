import type { FlowBundle } from './types';

const FIXTURE_TIMESTAMP = '2026-08-04T00:00:00.000Z';

export const P0_CONTRACT_FLOW_ITEM_IDS = [
  'p0-contract-item-a',
  'p0-contract-item-b',
  'p0-contract-item-c',
] as const;

export const P0_CONTRACT_FLOW_BUNDLE: FlowBundle = {
  flow: {
    id: 'p0-contract-flow',
    slug: 'p0-contract-flow',
    title: 'P0 결과 계약 계획',
    description: '날짜, 순서, 완료 기준, 메모와 출처가 같은 Item ID로 이동하는지 확인합니다.',
    category: '테스트',
    structure_type: 'timeline',
    content_type: 'default',
    anchor_type: 'start_date',
    status: 'published',
    primary_destination: 'calendar',
    source_title: 'P0 계약 원문',
    source_url: 'https://example.com/p0-contract-source',
    source_status: 'real',
    created_at: FIXTURE_TIMESTAMP,
    updated_at: FIXTURE_TIMESTAMP,
  },
  sections: [{
    id: 'p0-contract-section',
    flow_id: 'p0-contract-flow',
    title: '실행 순서',
    order: 0,
  }],
  items: P0_CONTRACT_FLOW_ITEM_IDS.map((id, order) => ({
    id,
    flow_id: 'p0-contract-flow',
    section_id: 'p0-contract-section',
    title: `계약 항목 ${String.fromCharCode(65 + order)}`,
    description: `계약 설명 ${String.fromCharCode(65 + order)}`,
    type: 'calendar' as const,
    day_offset: order * 2,
    duration_days: 1,
    role: 'action' as const,
    order,
  })),
  itemDetails: [{
    item_id: 'p0-contract-item-a',
    why: '결과 계약의 풍부한 필드가 한 항목에 모여 있는지 확인합니다.',
    how: '완료 기준, 메모, 주의, 리소스와 출처를 각각 비교합니다.',
    completion_criteria: '확인 결과를 저장하고 담당자에게 공유했습니다.',
    caution: '결과 생성 전 날짜와 대상 범위를 다시 확인하세요.',
    links: [{
      label: '공식 확인 링크',
      url: 'https://example.com/p0-contract-source/item-a',
      type: 'official',
    }],
  }],
  warnings: [],
};

export const P0_ROLE_RICH_ITEM_IDS = [
  'p0-rich-action',
  'p0-rich-warning',
  'p0-rich-resource',
] as const;

export const P0_ROLE_RICH_FLOW_BUNDLE: FlowBundle = {
  flow: {
    id: 'p0-role-rich-flow',
    slug: 'p0-role-rich-flow',
    title: 'P0 역할별 결과 계약',
    description: '실행 항목, 주의, 리소스가 형식별로 다르게 처리되는지 확인합니다.',
    category: '테스트',
    structure_type: 'checklist',
    content_type: 'default',
    anchor_type: 'start_date',
    status: 'published',
    primary_destination: 'internal_check',
    source_title: 'P0 역할 원문',
    source_url: 'https://example.com/p0-role-source',
    source_status: 'real',
    warning: '안전 관련 주의는 도움말 아이콘 뒤로만 숨기지 않습니다.',
    created_at: FIXTURE_TIMESTAMP,
    updated_at: FIXTURE_TIMESTAMP,
  },
  sections: [{
    id: 'p0-rich-section',
    flow_id: 'p0-role-rich-flow',
    title: '역할별 항목',
    order: 0,
  }],
  items: [
    {
      id: 'p0-rich-action',
      flow_id: 'p0-role-rich-flow',
      section_id: 'p0-rich-section',
      title: '실행 결과 남기기',
      description: '개인 메모와 완료 기준을 분리합니다.',
      type: 'calendar',
      day_offset: 0,
      duration_days: 1,
      role: 'action',
      order: 0,
    },
    {
      id: 'p0-rich-warning',
      flow_id: 'p0-role-rich-flow',
      section_id: 'p0-rich-section',
      title: '중요 주의 확인',
      description: '이 항목은 독립 일정으로 만들지 않습니다.',
      type: 'todo',
      role: 'warning',
      order: 1,
    },
    {
      id: 'p0-rich-resource',
      flow_id: 'p0-role-rich-flow',
      section_id: 'p0-rich-section',
      title: '공식 자료 열기',
      description: '이 항목은 직접 원문 링크를 제공합니다.',
      type: 'todo',
      role: 'resource',
      order: 2,
    },
  ],
  itemDetails: [
    {
      item_id: 'p0-rich-action',
      completion_criteria: '검토 결과와 다음 행동을 기록했습니다.',
      caution: '제출 전에 원문을 다시 확인하세요.',
      links: [{
        label: '공식 제출 안내',
        url: 'https://example.com/p0-role-source/action',
        type: 'official',
      }],
    },
    {
      item_id: 'p0-rich-warning',
      caution: '조건이 맞지 않으면 실행을 중단하세요.',
    },
    {
      item_id: 'p0-rich-resource',
      links: [{
        label: '공식 자료',
        url: 'https://example.com/p0-role-source/resource',
        type: 'official',
      }],
    },
  ],
  warnings: [],
};

export const P0_MATH_FLOW_SLUG = 'source-backed-middle-school-math-1';

export const P0_MATH_ITEM_IDS = [
  'math-prime-factorization',
  'math-integers-rationals',
  'math-letter-expression',
  'math-coordinate-graph',
  'math-basic-geometry',
  'math-plane-figures',
  'math-solid-figures',
  'math-data-analysis',
] as const;

export const P0_MATH_CANONICAL_KEYS = P0_MATH_ITEM_IDS.map(
  (itemId) => `${P0_MATH_FLOW_SLUG}::${itemId}`,
);

const P0_MATH_SELECTED_SEVEN_KEYS = P0_MATH_CANONICAL_KEYS.slice(0, 7);

export const P0_FLOW_MAP_CONTRACT_FIXTURES = {
  saveAll: {
    mapId: 'middle-school-math-1',
    mode: 'save_all' as const,
    executionState: 'executable' as const,
    canonicalItemIds: P0_MATH_CANONICAL_KEYS,
    selectedItemIds: P0_MATH_CANONICAL_KEYS,
    appliedItemIds: P0_MATH_CANONICAL_KEYS,
    previewItemIds: P0_MATH_CANONICAL_KEYS,
    savedItemIds: P0_MATH_CANONICAL_KEYS,
    exportItemIds: P0_MATH_CANONICAL_KEYS,
  },
  chooseChild: {
    mapId: 'round2-curated-choice-fixture',
    mode: 'choose_child' as const,
    executionState: 'executable' as const,
    canonicalItemIds: ['child-a::item-a', 'child-b::item-b'],
    selectedItemIds: ['child-a::item-a'],
    appliedItemIds: ['child-a::item-a'],
    previewItemIds: ['child-a::item-a'],
    savedItemIds: ['child-a::item-a'],
    exportItemIds: ['child-a::item-a'],
  },
  reviewHold: {
    mapId: 'round2-review-hold-fixture',
    mode: 'save_all' as const,
    executionState: 'review_hold' as const,
    canonicalItemIds: ['held-flow::held-a', 'held-flow::held-b'],
    selectedItemIds: ['held-flow::held-a', 'held-flow::held-b'],
    appliedItemIds: [],
    previewItemIds: [],
    savedItemIds: [],
    exportItemIds: [],
    heldItemIds: ['held-flow::held-a', 'held-flow::held-b'],
  },
  sevenOfEight: {
    mapId: 'middle-school-math-1',
    mode: 'save_all' as const,
    executionState: 'executable' as const,
    canonicalItemIds: P0_MATH_CANONICAL_KEYS,
    selectedItemIds: P0_MATH_SELECTED_SEVEN_KEYS,
    appliedItemIds: P0_MATH_SELECTED_SEVEN_KEYS,
    expectedPreviewItemIds: P0_MATH_SELECTED_SEVEN_KEYS,
    legacyPreviewItemIds: P0_MATH_CANONICAL_KEYS,
    savedItemIds: P0_MATH_SELECTED_SEVEN_KEYS,
    exportItemIds: P0_MATH_SELECTED_SEVEN_KEYS,
  },
} as const;

export const P0_LEGACY_SAVED_FLOW_FIXTURES = {
  readableUnversioned: {
    storageKey: 'flow:saved:p0-contract-flow',
    baseFlowSlug: 'p0-contract-flow',
    baseExists: true,
    raw: JSON.stringify({
      slug: 'p0-contract-flow',
      savedAt: '2026-07-01T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2030-09-01',
    }),
    expectedState: 'legacy_unversioned' as const,
  },
  missingBase: {
    storageKey: 'flow:saved:removed-p0-base',
    baseFlowSlug: 'removed-p0-base',
    baseExists: false,
    raw: JSON.stringify({
      slug: 'removed-p0-base',
      savedAt: '2026-07-01T00:00:00.000Z',
      selectedArtifactMode: 'checklist',
      dateIntent: 'undated',
    }),
    expectedState: 'held_missing_base' as const,
  },
  unsupportedSchema: {
    storageKey: 'flow:map:persistence:future-map',
    baseFlowSlug: 'future-map',
    baseExists: true,
    raw: JSON.stringify({
      schemaVersion: 2,
      recordType: 'saved_source_backed_flow_map',
      map: { id: 'future-map' },
    }),
    expectedState: 'held_unsupported_schema' as const,
  },
  malformed: {
    storageKey: 'flow:saved:malformed-p0',
    baseFlowSlug: 'malformed-p0',
    baseExists: true,
    raw: '{not-json',
    expectedState: 'held_malformed' as const,
  },
} as const;
