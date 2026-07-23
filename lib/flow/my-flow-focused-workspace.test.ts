import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canEditDirectMyFlowAnchor,
  isFocusedMyFlowWorkspaceState,
} from './my-flow-focused-workspace';

test('focused workspace only activates for one explicitly selected My Flow', () => {
  assert.equal(isFocusedMyFlowWorkspaceState({
    isCalendarSurface: false,
    savedView: 'flow',
    selectedFlowSlug: 'moving-d30-basic',
    visibleFlowCount: 1,
    showPostSavePanel: false,
  }), true);
  assert.equal(isFocusedMyFlowWorkspaceState({
    isCalendarSurface: false,
    savedView: 'flow',
    selectedFlowSlug: 'all',
    visibleFlowCount: 20,
    showPostSavePanel: false,
  }), false);
  assert.equal(isFocusedMyFlowWorkspaceState({
    isCalendarSurface: true,
    savedView: 'flow',
    selectedFlowSlug: 'moving-d30-basic',
    visibleFlowCount: 1,
    showPostSavePanel: false,
  }), false);
});

test('direct anchored public Flow is editable without a saved map', () => {
  assert.equal(canEditDirectMyFlowAnchor({
    isPersonalCopy: false,
    isUrlDraft: false,
    hasSavedMap: false,
    isPrimaryMapFlow: true,
    hasMapSetupInput: false,
    anchorType: 'D_day',
    hasStoredAnchor: true,
  }), true);
});

test('direct anchor editing rejects draft, personal copy, and unanchored Flow', () => {
  const base = {
    isPersonalCopy: false,
    isUrlDraft: false,
    hasSavedMap: false,
    isPrimaryMapFlow: true,
    hasMapSetupInput: false,
    anchorType: 'none',
    hasStoredAnchor: false,
  };
  assert.equal(canEditDirectMyFlowAnchor(base), false);
  assert.equal(canEditDirectMyFlowAnchor({ ...base, isUrlDraft: true, anchorType: 'D_day' }), false);
  assert.equal(canEditDirectMyFlowAnchor({ ...base, isPersonalCopy: true, anchorType: 'D_day' }), false);
});

test('map anchor editing remains limited to the primary map Flow', () => {
  const base = {
    isPersonalCopy: false,
    isUrlDraft: false,
    hasSavedMap: true,
    isPrimaryMapFlow: false,
    hasMapSetupInput: true,
    anchorType: 'D_day',
    hasStoredAnchor: true,
  };
  assert.equal(canEditDirectMyFlowAnchor(base), false);
  assert.equal(canEditDirectMyFlowAnchor({ ...base, isPrimaryMapFlow: true }), true);
});
