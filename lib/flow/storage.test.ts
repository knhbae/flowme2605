import assert from 'node:assert/strict';
import test from 'node:test';
import { clearFlowLocalProgress, getActiveFlowProgress, mergeSeedBundles, normalizeSavedFlowRecord } from './storage';
import { FlowBundle } from './types';

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

test('clear flow local progress removes saved and per-flow state keys', () => {
  const store = new Map<string, string>();
  const localStorage = {
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
    ];
    keys.forEach((key) => localStorage.setItem(key, 'value'));

    clearFlowLocalProgress('moving-d30-basic');

    keys.forEach((key) => assert.equal(localStorage.getItem(key), null));
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
