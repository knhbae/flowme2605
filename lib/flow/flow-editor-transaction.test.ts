import assert from 'node:assert/strict';
import test from 'node:test';

import {
  areFlowEditorDraftsEqual,
  createFlowEditorSession,
  executeFlowEditorCommit,
  getActiveFlowEditorTransaction,
  getFlowEditorCommitRole,
  reduceFlowEditorSession,
  selectFlowEditorAdapter,
  type FlowEditorCloseEvent,
  type FlowEditorCommitEffect,
  type FlowEditorCommitHandlers,
  type FlowEditorContext,
  type FlowEditorFailure,
  type FlowEditorLevel,
  type FlowEditorReturnPoint,
  type FlowEditorSession,
  type FlowEditorStatus,
} from './flow-editor-transaction';

type PlanDraft = {
  title: string;
  items: Array<{ id: string; title: string }>;
};

type ItemDraft = {
  id: string;
  title: string;
};

const planBaseline: PlanDraft = {
  title: '이사 계획',
  items: [{ id: 'item-1', title: '주소 변경' }],
};

const itemBaseline: ItemDraft = {
  id: 'item-1',
  title: '주소 변경',
};

const planReturnPoint: FlowEditorReturnPoint = {
  location: {
    route: '/flows/moving-d30',
    query: '?view=preview',
    hash: '#result',
    historyEntryKey: 'public-result-1',
  },
  scroll: [
    { targetKey: 'window', left: 0, top: 640 },
    { targetKey: 'result-list', left: 0, top: 120 },
  ],
  focus: {
    targetKey: 'edit-plan-button',
    fallbackSelector: '[data-testid="public-flow-adjust"]',
  },
};

const itemReturnPoint: FlowEditorReturnPoint = {
  location: {
    route: '/flows/moving-d30',
    query: '?view=preview',
    hash: '#result',
    historyEntryKey: 'public-item-1',
  },
  scroll: [
    { targetKey: 'window', left: 0, top: 640 },
    { targetKey: 'plan-editor', left: 0, top: 280 },
  ],
  focus: {
    targetKey: 'item-1-edit-button',
    fallbackSelector: '[data-item-id="item-1"]',
  },
};

function createSession(context: FlowEditorContext): FlowEditorSession<PlanDraft, ItemDraft> {
  return createFlowEditorSession<PlanDraft, ItemDraft>({
    id: `${context}:plan:1`,
    context,
    draft: planBaseline,
    returnPoint: planReturnPoint,
  });
}

function openItem(
  state: FlowEditorSession<PlanDraft, ItemDraft>,
): FlowEditorSession<PlanDraft, ItemDraft> {
  return reduceFlowEditorSession(state, {
    type: 'open-item',
    input: {
      id: `${state.context}:item:1`,
      draft: itemBaseline,
      returnPoint: itemReturnPoint,
    },
  }).state;
}

function editActive(
  state: FlowEditorSession<PlanDraft, ItemDraft>,
  validation: { valid: true } | { valid: false; firstErrorFocus: string } = { valid: true },
): FlowEditorSession<PlanDraft, ItemDraft> {
  if (state.item) {
    return reduceFlowEditorSession(state, {
      type: 'replace-item-draft',
      draft: { ...itemBaseline, title: '새 주소 변경' },
      validation,
    }).state;
  }
  return reduceFlowEditorSession(state, {
    type: 'replace-plan-draft',
    draft: { ...planBaseline, title: '내 이사 계획' },
    validation,
  }).state;
}

function moveActiveToStatus(
  state: FlowEditorSession<PlanDraft, ItemDraft>,
  status: Exclude<FlowEditorStatus, 'success'>,
): FlowEditorSession<PlanDraft, ItemDraft> {
  if (status === 'clean') return state;
  if (status === 'dirty-invalid') {
    return editActive(state, {
      valid: false,
      firstErrorFocus: '[data-testid="editor-title"]',
    });
  }
  const dirty = editActive(state);
  if (status === 'dirty-valid') return dirty;
  const submitting = reduceFlowEditorSession(dirty, {
    type: 'request-commit',
    requestId: 'commit-1',
  }).state;
  if (status === 'submitting') return submitting;
  const active = getActiveFlowEditorTransaction(submitting);
  assert.ok(active?.submission);
  if (status === 'recovery-required') {
    return reduceFlowEditorSession(submitting, {
      type: 'commit-recovery-required',
      transactionId: active.id,
      requestId: active.submission.requestId,
      revision: active.submission.revision,
      failure: {
        kind: 'storage',
        code: 'rollback_incomplete',
        message: '저장 전 상태를 완전히 복구하지 못했습니다.',
        firstErrorFocus: '[data-editor-error-summary]',
      },
    }).state;
  }
  return reduceFlowEditorSession(submitting, {
    type: 'commit-failed',
    transactionId: active.id,
    requestId: active.submission.requestId,
    revision: active.submission.revision,
    failure: {
      kind: 'storage',
      code: 'quota_exceeded',
      message: '저장 공간을 확인해 주세요.',
      firstErrorFocus: '[data-editor-error-summary]',
    },
  }).state;
}

const contexts: readonly FlowEditorContext[] = ['public-draft', 'saved-overlay'];
const levels: readonly FlowEditorLevel[] = ['plan', 'item'];
const closeEvents: readonly FlowEditorCloseEvent[] = [
  'cancel',
  'x',
  'backdrop',
  'escape',
  'browser-back',
];

test('draft equality is structural, key-order independent, and supports reverting to baseline', () => {
  assert.equal(
    areFlowEditorDraftsEqual(
      { title: '같음', nested: { count: 1 }, rows: ['a', 'b'] },
      { rows: ['a', 'b'], nested: { count: 1 }, title: '같음' },
    ),
    true,
  );
  assert.equal(areFlowEditorDraftsEqual({ rows: ['a'] }, { rows: ['b'] }), false);

  const dirty = editActive(createSession('public-draft'));
  assert.equal(dirty.plan?.status, 'dirty-valid');
  const reverted = reduceFlowEditorSession(dirty, {
    type: 'replace-plan-draft',
    draft: structuredClone(planBaseline),
    validation: { valid: true },
  }).state;
  assert.equal(reverted.plan?.status, 'clean');
});

test('the exact four context-level combinations map to one commit-role matrix', () => {
  assert.equal(getFlowEditorCommitRole('public-draft', 'plan'), 'apply-public-draft');
  assert.equal(
    getFlowEditorCommitRole('public-draft', 'item'),
    'apply-item-to-parent-public-draft',
  );
  assert.equal(getFlowEditorCommitRole('saved-overlay', 'plan'), 'save-personal-overlay');
  assert.equal(
    getFlowEditorCommitRole('saved-overlay', 'item'),
    'apply-item-to-parent-personal-draft',
  );
});

for (const context of contexts) {
  for (const level of levels) {
    test(`${context} ${level} reuses the full close-event matrix`, async (t) => {
      for (const status of [
        'clean',
        'dirty-valid',
        'dirty-invalid',
        'submitting',
        'recoverable-error',
        'recovery-required',
      ] as const) {
        for (const closeEvent of closeEvents) {
          await t.test(`${status} x ${closeEvent}`, () => {
            let state = createSession(context);
            if (level === 'item') state = openItem(state);
            state = moveActiveToStatus(state, status);
            const activeBefore = getActiveFlowEditorTransaction(state);
            const parentBefore = state.plan;
            assert.ok(activeBefore);

            const close = reduceFlowEditorSession(state, {
              type: 'request-close',
              event: closeEvent,
            });

            if (status === 'clean') {
              assert.equal(close.effects.length, 1);
              assert.equal(close.effects[0]?.type, 'restore-return-point');
              if (close.effects[0]?.type === 'restore-return-point') {
                assert.deepEqual(close.effects[0].returnPoint, activeBefore.returnPoint);
                assert.equal(close.effects[0].cause, closeEvent);
              }
              if (level === 'item') {
                assert.equal(close.state.item, null);
                assert.deepEqual(close.state.plan, parentBefore);
              } else {
                assert.equal(close.state.plan, null);
              }
              return;
            }

            if (status === 'submitting' || status === 'recovery-required') {
              assert.equal(close.state, state);
              assert.equal(
                close.effects.some((effect) => effect.type === 'announce-close-blocked'),
                true,
              );
              assert.equal(
                close.effects.some((effect) => effect.type === 'rearm-history-boundary'),
                closeEvent === 'browser-back',
              );
              return;
            }

            const prompt = close.effects.find(
              (effect) => effect.type === 'show-discard-confirmation',
            );
            assert.ok(prompt && prompt.type === 'show-discard-confirmation');
            assert.deepEqual(prompt.actions, ['continue-editing', 'discard-changes']);
            assert.deepEqual(prompt.labels, ['계속 수정', '변경 버리기']);
            assert.deepEqual(prompt.returnPoint, activeBefore.returnPoint);
            assert.equal(prompt.rearmHistoryBoundary, closeEvent === 'browser-back');

            const continued = reduceFlowEditorSession(close.state, {
              type: 'continue-editing',
            });
            const continuedActive = getActiveFlowEditorTransaction(continued.state);
            assert.deepEqual(continuedActive?.draft, activeBefore.draft);
            assert.equal(continuedActive?.status, activeBefore.status);
            assert.equal(continuedActive?.pendingClose, undefined);

            const promptedAgain = reduceFlowEditorSession(continued.state, {
              type: 'request-close',
              event: closeEvent,
            });
            const discarded = reduceFlowEditorSession(promptedAgain.state, {
              type: 'discard-changes',
            });
            assert.equal(discarded.effects[0]?.type, 'restore-return-point');
            if (level === 'item') {
              assert.equal(discarded.state.item, null);
              assert.deepEqual(discarded.state.plan, parentBefore);
            } else {
              assert.equal(discarded.state.plan, null);
            }
          });
        }
      }
    });
  }
}

test('a nested Item Back/discard preserves the parent draft, revision, location, focus, and scroll', () => {
  const dirtyParent = editActive(createSession('saved-overlay'));
  const parentBefore = dirtyParent.plan;
  assert.ok(parentBefore);
  const dirtyItem = editActive(openItem(dirtyParent));

  const prompted = reduceFlowEditorSession(dirtyItem, {
    type: 'request-close',
    event: 'browser-back',
  });
  assert.equal(
    prompted.effects.some((effect) => effect.type === 'rearm-history-boundary'),
    true,
  );
  const discarded = reduceFlowEditorSession(prompted.state, {
    type: 'discard-changes',
  });

  assert.equal(discarded.state.item, null);
  assert.deepEqual(discarded.state.plan, parentBefore);
  assert.deepEqual(discarded.state.plan?.returnPoint, planReturnPoint);
  assert.equal(discarded.state.plan?.revision, parentBefore.revision);
  const restore = discarded.effects[0];
  assert.ok(restore?.type === 'restore-return-point');
  if (restore?.type === 'restore-return-point') {
    assert.deepEqual(restore.returnPoint, itemReturnPoint);
  }
});

test('invalid commit emits only first-error focus and preserves the draft', () => {
  const invalid = editActive(createSession('public-draft'), {
    valid: false,
    firstErrorFocus: '[data-testid="title-error"]',
  });
  const draftBefore = invalid.plan?.draft;
  const attempted = reduceFlowEditorSession(invalid, {
    type: 'request-commit',
    requestId: 'invalid-commit',
  });

  assert.equal(attempted.state, invalid);
  assert.equal(attempted.effects.length, 1);
  assert.deepEqual(attempted.effects[0], {
    type: 'focus-target',
    reason: 'validation',
    transactionId: 'public-draft:plan:1',
    target: '[data-testid="title-error"]',
  });
  assert.deepEqual(attempted.state.plan?.draft, draftBefore);
});

test('submitting rejects double commit, edits, close, and stale completion without partial state', () => {
  const dirty = editActive(createSession('saved-overlay'));
  const first = reduceFlowEditorSession(dirty, {
    type: 'request-commit',
    requestId: 'save-overlay-1',
  });
  assert.equal(first.state.plan?.status, 'submitting');
  assert.equal(first.effects.filter((effect) => effect.type === 'commit').length, 1);

  const duplicate = reduceFlowEditorSession(first.state, {
    type: 'request-commit',
    requestId: 'save-overlay-2',
  });
  assert.equal(duplicate.state, first.state);
  assert.deepEqual(duplicate.effects, []);

  const edited = reduceFlowEditorSession(first.state, {
    type: 'replace-plan-draft',
    draft: { ...planBaseline, title: '저장 중 변조' },
    validation: { valid: true },
  });
  assert.equal(edited.state, first.state);

  const stale = reduceFlowEditorSession(first.state, {
    type: 'commit-succeeded',
    transactionId: first.state.plan?.id ?? '',
    requestId: 'stale-request',
    revision: first.state.plan?.revision ?? -1,
    result: { kind: 'plan' },
  });
  assert.equal(stale.state, first.state);

  const active = first.state.plan;
  assert.ok(active?.submission);
  const wrongTransaction = reduceFlowEditorSession(first.state, {
    type: 'commit-succeeded',
    transactionId: 'another-plan-transaction',
    requestId: active.submission.requestId,
    revision: active.submission.revision,
    result: { kind: 'plan' },
  });
  assert.equal(wrongTransaction.state, first.state);

  const succeeded = reduceFlowEditorSession(first.state, {
    type: 'commit-succeeded',
    transactionId: active.id,
    requestId: active.submission.requestId,
    revision: active.submission.revision,
    result: { kind: 'plan' },
  });
  assert.equal(succeeded.state.plan?.status, 'success');
  assert.deepEqual(
    reduceFlowEditorSession(succeeded.state, {
      type: 'request-commit',
      requestId: 'save-overlay-3',
    }).effects,
    [],
  );
});

test('all four commit roles call exactly one matching adapter target', async () => {
  for (const context of contexts) {
    for (const level of levels) {
      let state = createSession(context);
      if (level === 'item') state = openItem(state);
      state = editActive(state);
      const requested = reduceFlowEditorSession(state, {
        type: 'request-commit',
        requestId: `${context}:${level}:commit`,
      });
      const effect = requested.effects.find(
        (candidate): candidate is FlowEditorCommitEffect<PlanDraft, ItemDraft> =>
          candidate.type === 'commit',
      );
      assert.ok(effect);

      const calls = {
        publicPlan: 0,
        publicItem: 0,
        savedPlan: 0,
        savedItem: 0,
      };
      const handlers: FlowEditorCommitHandlers<PlanDraft, ItemDraft> = {
        preparePublicDraft: () => ({
          commit: () => {
            calls.publicPlan += 1;
          },
          rollbackAndVerify: () => true,
        }),
        applyItemToParentPublicDraft: ({ parentDraft, itemDraft }) => {
          calls.publicItem += 1;
          return {
            draft: {
              ...parentDraft,
              items: parentDraft.items.map((item) =>
                item.id === itemDraft.id ? { ...item, title: itemDraft.title } : item),
            },
            validation: { valid: true },
          };
        },
        preparePersonalOverlay: () => ({
          commit: () => {
            calls.savedPlan += 1;
          },
          rollbackAndVerify: () => true,
        }),
        applyItemToParentPersonalDraft: ({ parentDraft, itemDraft }) => {
          calls.savedItem += 1;
          return {
            draft: {
              ...parentDraft,
              items: parentDraft.items.map((item) =>
                item.id === itemDraft.id ? { ...item, title: itemDraft.title } : item),
            },
            validation: { valid: true },
          };
        },
      };

      const resultEvent = await executeFlowEditorCommit(effect, handlers);
      const settled = reduceFlowEditorSession(requested.state, resultEvent);
      const expectedRole = getFlowEditorCommitRole(context, level);
      assert.equal(effect.role, expectedRole);
      assert.equal(Object.values(calls).reduce((sum, value) => sum + value, 0), 1);
      assert.deepEqual(calls, {
        publicPlan: expectedRole === 'apply-public-draft' ? 1 : 0,
        publicItem: expectedRole === 'apply-item-to-parent-public-draft' ? 1 : 0,
        savedPlan: expectedRole === 'save-personal-overlay' ? 1 : 0,
        savedItem: expectedRole === 'apply-item-to-parent-personal-draft' ? 1 : 0,
      });
      assert.equal(getActiveFlowEditorTransaction(settled.state)?.status, 'success');

      if (level === 'item') {
        assert.equal(settled.state.plan?.draft.items[0]?.title, '새 주소 변경');
        assert.equal(settled.state.plan?.status, 'dirty-valid');
        assert.equal(calls.savedPlan, 0);
        assert.equal(calls.publicPlan, 0);
      }

      const closed = reduceFlowEditorSession(settled.state, { type: 'settle-success' });
      assert.equal(closed.effects[0]?.type, 'restore-return-point');
      if (level === 'item') {
        assert.equal(closed.state.item, null);
        assert.ok(closed.state.plan);
      } else {
        assert.equal(closed.state.plan, null);
      }
    }
  }
});

test('runtime/storage failure keeps baseline and draft and returns first-error focus', async () => {
  let fakePersistedState = structuredClone(planBaseline);
  const dirty = editActive(createSession('saved-overlay'));
  const requested = reduceFlowEditorSession(dirty, {
    type: 'request-commit',
    requestId: 'failing-save',
  });
  const effect = requested.effects.find(
    (candidate): candidate is FlowEditorCommitEffect<PlanDraft, ItemDraft> =>
      candidate.type === 'commit',
  );
  assert.ok(effect);
  const failure: FlowEditorFailure = {
    kind: 'storage',
    code: 'quota_exceeded',
    message: '저장 공간이 부족합니다.',
    firstErrorFocus: '[data-testid="save-error"]',
  };
  const resultEvent = await executeFlowEditorCommit(effect, {
    preparePublicDraft: () => ({
      commit: () => undefined,
      rollbackAndVerify: () => true,
    }),
    applyItemToParentPublicDraft: () => ({ draft: planBaseline, validation: { valid: true } }),
    preparePersonalOverlay: ({ draft }) => {
      const exactBackup = structuredClone(fakePersistedState);
      return {
        commit: () => {
          fakePersistedState = structuredClone(draft) as PlanDraft;
          fakePersistedState.items[0]!.title = '부분 저장 뒤 실패';
          throw failure;
        },
        rollbackAndVerify: () => {
          fakePersistedState = structuredClone(exactBackup);
          return areFlowEditorDraftsEqual(fakePersistedState, exactBackup);
        },
      };
    },
    applyItemToParentPersonalDraft: () => ({ draft: planBaseline, validation: { valid: true } }),
  });
  assert.equal(resultEvent.type, 'commit-failed');

  const failed = reduceFlowEditorSession(requested.state, resultEvent);
  assert.equal(failed.state.plan?.status, 'recoverable-error');
  assert.equal(failed.state.plan?.submission?.attempt, 1);
  assert.deepEqual(failed.state.plan?.baseline, planBaseline);
  assert.deepEqual(failed.state.plan?.draft, dirty.plan?.draft);
  assert.deepEqual(fakePersistedState, planBaseline);
  assert.deepEqual(failed.effects, [{
    type: 'focus-target',
    reason: 'commit-error',
    transactionId: 'saved-overlay:plan:1',
    target: '[data-testid="save-error"]',
  }]);

  const editedAfterError = reduceFlowEditorSession(failed.state, {
    type: 'replace-plan-draft',
    draft: { ...planBaseline, title: '오류 뒤 수정' },
    validation: { valid: true },
  }).state;
  assert.equal(editedAfterError.plan?.status, 'dirty-valid');
  assert.equal(editedAfterError.plan?.failure, undefined);
  assert.equal(editedAfterError.plan?.submission, undefined);
});

for (const rollbackMode of ['returns-false', 'throws'] as const) {
  test(`incomplete rollback (${rollbackMode}) locks the transaction until external recovery`, async () => {
    let fakePersistedState = structuredClone(planBaseline);
    const dirty = editActive(createSession('saved-overlay'));
    const requested = reduceFlowEditorSession(dirty, {
      type: 'request-commit',
      requestId: `rollback-${rollbackMode}`,
    });
    const effect = requested.effects.find(
      (candidate): candidate is FlowEditorCommitEffect<PlanDraft, ItemDraft> =>
        candidate.type === 'commit',
    );
    assert.ok(effect);

    const resultEvent = await executeFlowEditorCommit(effect, {
      preparePublicDraft: () => ({
        commit: () => undefined,
        rollbackAndVerify: () => true,
      }),
      applyItemToParentPublicDraft: () => ({ draft: planBaseline, validation: { valid: true } }),
      preparePersonalOverlay: ({ draft }) => ({
        commit: () => {
          fakePersistedState = structuredClone(draft) as PlanDraft;
          fakePersistedState.items[0]!.title = '부분 저장이 남음';
          throw new Error('commit failed after a partial write');
        },
        rollbackAndVerify: () => {
          if (rollbackMode === 'throws') throw new Error('rollback verification failed');
          return false;
        },
      }),
      applyItemToParentPersonalDraft: () => ({ draft: planBaseline, validation: { valid: true } }),
    });

    assert.equal(resultEvent.type, 'commit-recovery-required');
    if (resultEvent.type === 'commit-recovery-required') {
      assert.equal(resultEvent.failure.kind, 'storage');
      assert.equal(resultEvent.failure.code, 'rollback_incomplete');
    }

    const locked = reduceFlowEditorSession(requested.state, resultEvent);
    assert.equal(locked.state.plan?.status, 'recovery-required');
    assert.deepEqual(locked.state.plan?.baseline, planBaseline);
    assert.deepEqual(locked.state.plan?.draft, dirty.plan?.draft);
    assert.notDeepEqual(fakePersistedState, planBaseline);

    const editAttempt = reduceFlowEditorSession(locked.state, {
      type: 'replace-plan-draft',
      draft: { ...planBaseline, title: '잠긴 뒤 수정 시도' },
      validation: { valid: true },
    });
    assert.equal(editAttempt.state, locked.state);

    const retryAttempt = reduceFlowEditorSession(locked.state, {
      type: 'request-commit',
      requestId: `retry-${rollbackMode}`,
    });
    assert.equal(retryAttempt.state, locked.state);
    assert.deepEqual(retryAttempt.effects, []);

    const closeAttempt = reduceFlowEditorSession(locked.state, {
      type: 'request-close',
      event: 'browser-back',
    });
    assert.equal(closeAttempt.state, locked.state);
    assert.equal(
      closeAttempt.effects.some((candidate) => candidate.type === 'rearm-history-boundary'),
      true,
    );
    assert.equal(
      closeAttempt.effects.some((candidate) => candidate.type === 'announce-close-blocked'),
      true,
    );
    assert.equal(
      closeAttempt.effects.some((candidate) => candidate.type === 'show-discard-confirmation'),
      false,
    );
    assert.equal(
      reduceFlowEditorSession(locked.state, { type: 'discard-changes' }).state,
      locked.state,
    );
  });
}

test('retry leaves the draft untouched and increments the submission attempt', () => {
  const dirty = editActive(createSession('saved-overlay'));
  const first = reduceFlowEditorSession(dirty, {
    type: 'request-commit',
    requestId: 'attempt-1',
  }).state;
  assert.ok(first.plan?.submission);
  const failed = reduceFlowEditorSession(first, {
    type: 'commit-failed',
    transactionId: first.plan.id,
    requestId: first.plan.submission.requestId,
    revision: first.plan.submission.revision,
    failure: {
      kind: 'runtime',
      code: 'temporary_failure',
      message: '다시 시도해 주세요.',
      firstErrorFocus: '[data-editor-error-summary]',
    },
  }).state;
  const draftBeforeRetry = failed.plan?.draft;
  const retried = reduceFlowEditorSession(failed, {
    type: 'request-commit',
    requestId: 'attempt-2',
  });
  assert.equal(retried.state.plan?.status, 'submitting');
  assert.equal(retried.state.plan?.submission?.attempt, 2);
  assert.deepEqual(retried.state.plan?.draft, draftBeforeRetry);
  assert.equal(retried.effects.filter((effect) => effect.type === 'commit').length, 1);
});

test('return points and commit snapshots are copied instead of exposing mutable caller data', () => {
  const mutableReturnPoint = structuredClone(planReturnPoint) as {
    location: { route: string; query: string };
    scroll: Array<{ targetKey: string; left: number; top: number }>;
    focus: { targetKey: string };
  };
  const mutableDraft = structuredClone(planBaseline);
  let state = createFlowEditorSession<PlanDraft, ItemDraft>({
    id: 'copy-contract',
    context: 'public-draft',
    draft: mutableDraft,
    returnPoint: mutableReturnPoint,
  });
  mutableDraft.title = '외부에서 바꿈';
  mutableReturnPoint.scroll[0]!.top = 9999;
  assert.equal(state.plan?.draft.title, '이사 계획');
  assert.equal(state.plan?.returnPoint.scroll[0]?.top, 640);

  state = editActive(state);
  const requested = reduceFlowEditorSession(state, {
    type: 'request-commit',
    requestId: 'copy-effect',
  });
  const effect = requested.effects.find(
    (candidate): candidate is FlowEditorCommitEffect<PlanDraft, ItemDraft> =>
      candidate.type === 'commit',
  );
  assert.ok(effect && effect.level === 'plan');
  (effect.draft as PlanDraft).title = 'effect를 바꿈';
  assert.equal(requested.state.plan?.draft.title, '내 이사 계획');
});

test('adapter selection keeps an explicit legacy rollback path', () => {
  const shared = () => 'shared';
  const legacy = () => 'legacy';
  assert.equal(selectFlowEditorAdapter({ enabled: true, shared, legacy }), shared);
  assert.equal(selectFlowEditorAdapter({ enabled: false, shared, legacy }), legacy);
});
