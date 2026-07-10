import assert from 'node:assert/strict';
import test from 'node:test';
import curatedSourceAppSeed from '../../docs/content-audit/2026-07-01-curated-source-app-seed-v1.json';
import {
  cloneSeedBundles,
  clearFlowLocalProgress,
  getActiveFlowProgress,
  getBundles,
  getMyFlowCompletionFeedback,
  getMyFlowStepItemChecks,
  getSavedFlowMapIndexByFlowSlug,
  mergeSeedBundles,
  normalizeMyFlowCompletionFeedback,
  normalizeSavedFlowMapSnapshot,
  normalizeSavedFlowRecord,
  saveMyFlowCompletionFeedback,
  saveMyFlowStepItemChecks,
} from './storage';
import { FlowBundle } from './types';

const curatedSourceAppSeedFlowSlugs = curatedSourceAppSeed.contentBundles.flatMap((bundle) =>
  bundle.flows.map((flow) => flow.slug),
);

function bundle(id: string, slug: string, title: string): FlowBundle {
  return {
    flow: {
      id,
      slug,
      title,
      description: title,
      category: 'test',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      created_at: '2026-05-21T00:00:00.000Z',
      updated_at: '2026-05-21T00:00:00.000Z',
    },
    sections: [],
    items: [],
  };
}

test('storage merge keeps local drafts while adding newly shipped seed flows', () => {
  const oldSeed = bundle('flow-old-seed', 'old-seed', 'Old seed from local storage');
  const editedLocalDraft = bundle('flow-local-draft', 'my-draft', 'My local draft');
  const latestOldSeed = bundle('flow-old-seed', 'old-seed', 'Updated seed from deployment');
  const newCreatorSeed = bundle(
    'flow-real-thankyou-bubu-video-full-body-no-jump',
    'real-thankyou-bubu-video-full-body-no-jump',
    'ThankyouBUBU exact video flow',
  );

  const merged = mergeSeedBundles([oldSeed, editedLocalDraft], [latestOldSeed, newCreatorSeed]);

  assert.deepEqual(
    merged.map((entry) => entry.flow.id),
    ['flow-old-seed', 'flow-real-thankyou-bubu-video-full-body-no-jump', 'flow-local-draft'],
  );
  assert.equal(merged[0].flow.title, 'Updated seed from deployment');
  assert.equal(merged[2].flow.title, 'My local draft');
});

test('getBundles migrates curated source app seed flows into existing local storage', () => {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  });

  try {
    localStorage.setItem(
      'flow_builder_mvp_bundles_v11',
      JSON.stringify([bundle('flow-local-draft', 'my-draft', 'My local draft')]),
    );

    const migrated = getBundles();
    const migratedSlugs = new Set(migrated.map((entry) => entry.flow.slug));
    assert.deepEqual(
      curatedSourceAppSeedFlowSlugs.filter((slug) => !migratedSlugs.has(slug)),
      [],
    );
    assert.ok(migratedSlugs.has('my-draft'));

    const persisted = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]') as FlowBundle[];
    const persistedSlugs = new Set(persisted.map((entry) => entry.flow.slug));
    assert.deepEqual(
      curatedSourceAppSeedFlowSlugs.filter((slug) => !persistedSlugs.has(slug)),
      [],
    );
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test('cloneSeedBundles includes curated source app seed flows without source-backed merge', () => {
  const clonedSlugs = new Set(cloneSeedBundles().map((entry) => entry.flow.slug));
  assert.deepEqual(
    curatedSourceAppSeedFlowSlugs.filter((slug) => !clonedSlugs.has(slug)),
    [],
  );
});

test('saved flow record normalization keeps explicit save metadata', () => {
  assert.deepEqual(normalizeSavedFlowRecord(null), undefined);
  assert.deepEqual(normalizeSavedFlowRecord({ savedAt: 123 }), undefined);
  assert.deepEqual(
    normalizeSavedFlowRecord({
      slug: 'moving-d30-basic',
      savedAt: '2026-05-27T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2026-06-26',
    }),
    {
      slug: 'moving-d30-basic',
      savedAt: '2026-05-27T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2026-06-26',
    },
  );
  assert.deepEqual(
    normalizeSavedFlowRecord({
      slug: 'moving-d30-basic',
      savedAt: '2026-05-27T00:00:00.000Z',
      selectedArtifactMode: 'bad-mode',
    }),
    {
      slug: 'moving-d30-basic',
      savedAt: '2026-05-27T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
    },
  );
});

test('active flow progress can use an injected bundle list for source-backed records', () => {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  });

  try {
    const sourceBacked = {
      ...bundle('flow-source-backed-middle-school-math-1', 'source-backed-middle-school-math-1', '중1 수학 목차 진도'),
      items: [
        {
          id: 'math-prime-factorization',
          flow_id: 'flow-source-backed-middle-school-math-1',
          title: '소인수분해',
          type: 'todo' as const,
          order: 0,
        },
      ],
    };
    localStorage.setItem(
      'flow:saved:source-backed-middle-school-math-1',
      JSON.stringify({
        slug: 'source-backed-middle-school-math-1',
        savedAt: '2026-06-23T00:00:00.000Z',
        selectedArtifactMode: 'sheet',
      }),
    );

    const progress = getActiveFlowProgress([sourceBacked]);

    assert.deepEqual(progress.map((entry) => entry.slug), ['source-backed-middle-school-math-1']);
    assert.equal(progress[0].title, '중1 수학 목차 진도');
    assert.equal(progress[0].total, 1);
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test('saved flow map snapshots index child flows back to their parent map', () => {
  assert.deepEqual(normalizeSavedFlowMapSnapshot(null), undefined);
  assert.deepEqual(
    normalizeSavedFlowMapSnapshot({
      mapId: 'baby-health-schedule',
      title: '영유아 검진·접종 일정 지도',
      version: '2026-06-23.1',
      savedAt: '2026-06-23T00:00:00.000Z',
      anchor: '2026-01-15',
      flowSlugs: ['source-backed-baby-health-checkups', 'source-backed-baby-vaccination-schedule'],
      stepCountsByFlow: {
        'source-backed-baby-health-checkups': 12,
        'source-backed-baby-vaccination-schedule': 6,
      },
    }),
    {
      mapId: 'baby-health-schedule',
      title: '영유아 검진·접종 일정 지도',
      version: '2026-06-23.1',
      savedAt: '2026-06-23T00:00:00.000Z',
      anchor: '2026-01-15',
      flowSlugs: ['source-backed-baby-health-checkups', 'source-backed-baby-vaccination-schedule'],
      stepCountsByFlow: {
        'source-backed-baby-health-checkups': 12,
        'source-backed-baby-vaccination-schedule': 6,
      },
    },
  );

  assert.deepEqual(
    normalizeSavedFlowMapSnapshot({
      mapId: 'middle-school-math-1',
      title: 'personal-only',
      version: '2026-06-24.1',
      savedAt: '2026-07-05T00:00:00.000Z',
      anchor: '2026-07-15',
      flowSlugs: ['source-backed-middle-school-math-1'],
      stepCountsByFlow: {
        'source-backed-middle-school-math-1': 1,
      },
      personalCopy: {
        source: 'url_first_custom_start',
        originalTitle: 'Middle school math',
        includedStepIdsByFlow: {
          'source-backed-middle-school-math-1': ['math-prime-factorization'],
        },
        excludedStepIdsByFlow: {
          'source-backed-middle-school-math-1': ['math-integers-rationals'],
        },
        stepOverridesByFlow: {
          'source-backed-middle-school-math-1': {
            'math-prime-factorization': {
              title: 'Prime factorization for my test',
              schedule: { mode: 'fixed_date', date: '2026-08-03' },
              userMemo: 'Use the worksheet examples first.',
            },
          },
        },
      },
    })?.personalCopy,
    {
      source: 'url_first_custom_start',
      originalTitle: 'Middle school math',
      includedStepIdsByFlow: {
        'source-backed-middle-school-math-1': ['math-prime-factorization'],
      },
      excludedStepIdsByFlow: {
        'source-backed-middle-school-math-1': ['math-integers-rationals'],
      },
      stepOverridesByFlow: {
        'source-backed-middle-school-math-1': {
          'math-prime-factorization': {
            title: 'Prime factorization for my test',
            schedule: { mode: 'fixed_date', date: '2026-08-03' },
            userMemo: 'Use the worksheet examples first.',
          },
        },
      },
    },
  );

  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  });

  try {
    localStorage.setItem(
      'flow:map:saved:baby-health-schedule',
      JSON.stringify({
        mapId: 'baby-health-schedule',
        title: '영유아 검진·접종 일정 지도',
        version: '2026-06-23.1',
        savedAt: '2026-06-23T00:00:00.000Z',
        flowSlugs: ['source-backed-baby-health-checkups', 'source-backed-baby-vaccination-schedule'],
      }),
    );

    const index = getSavedFlowMapIndexByFlowSlug();
    assert.equal(index['source-backed-baby-health-checkups'].title, '영유아 검진·접종 일정 지도');
    assert.equal(index['source-backed-baby-vaccination-schedule'].mapId, 'baby-health-schedule');
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test('clear flow local progress removes saved and per-flow state keys', () => {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  });

  try {
    const keys = [
      'flow:saved:moving-d30-basic',
      'flow_builder_mvp_checks_moving-d30-basic',
      'flow:moving-d30-basic:anchorDate',
      'flow_builder_mvp_item_state_moving-d30-basic',
      'flow_builder_mvp_comparison_moving-d30-basic',
      'flow_builder_mvp_workbench_moving-d30-basic',
      'flow_builder_mvp_reactions_moving-d30-basic',
      'flow:my-flow:completion-feedback:moving-d30-basic',
    ];
    keys.forEach((key) => localStorage.setItem(key, 'value'));
    localStorage.setItem('flow:my-flow:step-item-checks', JSON.stringify({
      'moving-d30-basic::moving-method-quotes::2026-05-28': { '0': true },
      'other-flow::first::none': { '0': true },
    }));

    clearFlowLocalProgress('moving-d30-basic');

    keys.forEach((key) => assert.equal(localStorage.getItem(key), null));
    assert.deepEqual(JSON.parse(localStorage.getItem('flow:my-flow:step-item-checks') || '{}'), {
      'other-flow::first::none': { '0': true },
    });
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test('completion feedback keeps private reflection separate from an unsent source correction draft', () => {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  });

  try {
    assert.equal(normalizeMyFlowCompletionFeedback({ flowSlug: 'moving-d30-basic' }), undefined);
    assert.equal(
      normalizeMyFlowCompletionFeedback({
        flowSlug: 'moving-d30-basic',
        sourceCorrectionDraft: {
          scope: 'item',
          note: '날짜가 잘못됐어요.',
          updatedAt: '2026-07-11T00:00:00.000Z',
        },
      }),
      undefined,
    );

    const saved = saveMyFlowCompletionFeedback('moving-d30-basic', {
      reflection: {
        outcome: 'helpful',
        note: '이사 당일 확인 순서가 유용했어요.',
        updatedAt: '2026-07-11T00:00:00.000Z',
      },
      sourceCorrectionDraft: {
        scope: 'item',
        itemId: 'moving-address-change',
        itemTitle: '주소 이전 신청하기',
        note: '신청 가능 시간을 함께 알려주세요.',
        sourceUrl: 'https://example.com/moving',
        updatedAt: '2026-07-11T00:01:00.000Z',
      },
    });

    assert.deepEqual(saved, {
      flowSlug: 'moving-d30-basic',
      reflection: {
        outcome: 'helpful',
        note: '이사 당일 확인 순서가 유용했어요.',
        updatedAt: '2026-07-11T00:00:00.000Z',
      },
      sourceCorrectionDraft: {
        scope: 'item',
        itemId: 'moving-address-change',
        itemTitle: '주소 이전 신청하기',
        note: '신청 가능 시간을 함께 알려주세요.',
        sourceUrl: 'https://example.com/moving',
        updatedAt: '2026-07-11T00:01:00.000Z',
      },
    });
    assert.deepEqual(getMyFlowCompletionFeedback('moving-d30-basic'), saved);
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test('my flow step item checks are persisted separately from step completion', () => {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  });

  try {
    saveMyFlowStepItemChecks({
      'source-backed-middle-school-math-1::math-prime-factorization::none': { '0': true, '2': true },
    });

    assert.deepEqual(getMyFlowStepItemChecks(), {
      'source-backed-middle-school-math-1::math-prime-factorization::none': { '0': true, '2': true },
    });
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});
