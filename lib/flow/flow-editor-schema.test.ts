import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getFlowEditorFieldOrder,
  getFlowEditorSurfaceContract,
} from './flow-editor-schema';

test('the four contexts share two deterministic field orders and keep different semantic roles', () => {
  const publicPlan = getFlowEditorSurfaceContract({
    context: 'public-draft',
    level: 'plan',
    capabilities: { title: true, anchor: true, items: true, routine: true, sourceOrSafety: true },
  });
  const savedPlan = getFlowEditorSurfaceContract({
    context: 'saved-overlay',
    level: 'plan',
    capabilities: { title: true, anchor: true, items: true, routine: true, sourceOrSafety: true },
  });
  const publicItem = getFlowEditorSurfaceContract({
    context: 'public-draft',
    level: 'item',
    capabilities: { title: true, detail: true, date: true, completionCriterion: true, sourceOrSafety: true },
  });
  const savedItem = getFlowEditorSurfaceContract({
    context: 'saved-overlay',
    level: 'item',
    capabilities: { title: true, detail: true, date: true, completionCriterion: true, sourceOrSafety: true },
  });

  assert.deepEqual(publicPlan.fields.map((field) => field.id), savedPlan.fields.map((field) => field.id));
  assert.deepEqual(publicItem.fields.map((field) => field.id), savedItem.fields.map((field) => field.id));
  assert.equal(publicPlan.semanticRole, 'unsaved-public-draft');
  assert.equal(publicItem.semanticRole, 'pending-parent-apply');
  assert.equal(savedPlan.semanticRole, 'saved-personal-copy');
  assert.equal(savedItem.semanticRole, 'pending-saved-plan-save');
  assert.equal(publicPlan.commitRole, 'apply-public-draft');
  assert.equal(publicItem.commitRole, 'apply-item-to-parent-public-draft');
  assert.equal(savedPlan.commitRole, 'save-personal-overlay');
  assert.equal(savedItem.commitRole, 'apply-item-to-parent-personal-draft');
});

test('capability filtering never reorders fields and keeps completion/source read-only', () => {
  const item = getFlowEditorSurfaceContract({
    context: 'saved-overlay',
    level: 'item',
    capabilities: {
      title: true,
      detail: false,
      date: true,
      completionCriterion: true,
      sourceOrSafety: true,
    },
  });
  assert.deepEqual(item.fields, [
    { id: 'item-title', mode: 'editable' },
    { id: 'item-date', mode: 'editable' },
    { id: 'item-completion-criterion', mode: 'read-only' },
    { id: 'source-and-safety', mode: 'read-only' },
  ]);
  assert.deepEqual(getFlowEditorFieldOrder('plan'), [
    'plan-title',
    'plan-anchor',
    'plan-items',
    'plan-routine',
    'source-and-safety',
  ]);
});

test('editor commit labels never use completion language', () => {
  for (const context of ['public-draft', 'saved-overlay'] as const) {
    for (const level of ['plan', 'item'] as const) {
      const contract = getFlowEditorSurfaceContract({ context, level });
      assert.equal(contract.commitLabel.includes('완료'), false);
    }
  }
});
