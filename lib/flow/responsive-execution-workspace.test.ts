import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FLOW_MOBILE_LAYER_ORDER,
  FLOW_WORKSPACE_BREAKPOINTS,
  FLOW_WORKSPACE_MIN_TARGET_PX,
  hasValidFlowMobileLayerOrder,
  PLAN_EXECUTION_WORKSPACE_MIN_TARGET_PX,
  resolvePlanExecutionWorkspaceComposition,
  resolveFlowWorkspaceComposition,
} from './responsive-execution-workspace';

test('approved plan execution workspace switches composition at every documented boundary', () => {
  assert.equal(resolvePlanExecutionWorkspaceComposition(0), 'mobile');
  assert.equal(resolvePlanExecutionWorkspaceComposition(767), 'mobile');
  assert.equal(resolvePlanExecutionWorkspaceComposition(768), 'stacked');
  assert.equal(resolvePlanExecutionWorkspaceComposition(1023), 'stacked');
  assert.equal(resolvePlanExecutionWorkspaceComposition(1024), 'desktop_compact');
  assert.equal(resolvePlanExecutionWorkspaceComposition(1279), 'desktop_compact');
  assert.equal(resolvePlanExecutionWorkspaceComposition(1280), 'desktop_full');

  assert.deepEqual(FLOW_WORKSPACE_BREAKPOINTS, {
    mobileMax: 767,
    stackedMin: 768,
    stackedMax: 1023,
    wideMin: 1024,
    desktopCompactMin: 1024,
    desktopCompactMax: 1279,
    desktopFullMin: 1280,
  });
});

test('responsive workspace uses drill-in below wide and task-focused panes at 1024', () => {
  assert.equal(resolveFlowWorkspaceComposition({
    surface: 'my_flow',
    viewportWidth: 390,
    flowCount: 3,
  }), 'mobile_drill_in');
  assert.equal(resolveFlowWorkspaceComposition({
    surface: 'my_flow',
    viewportWidth: 1024,
    flowCount: 1,
  }), 'outline_detail');
  assert.equal(resolveFlowWorkspaceComposition({
    surface: 'my_flow',
    viewportWidth: 1024,
    flowCount: 3,
  }), 'rail_outline_detail');
});

test('calendar adds the undated tray only to the wide three-pane composition', () => {
  assert.equal(resolveFlowWorkspaceComposition({
    surface: 'calendar',
    viewportWidth: 390,
    flowCount: 2,
    hasUndatedTray: true,
  }), 'mobile_drill_in');
  assert.equal(resolveFlowWorkspaceComposition({
    surface: 'calendar',
    viewportWidth: 1024,
    flowCount: 2,
    hasUndatedTray: false,
  }), 'calendar_grid_agenda');
  assert.equal(resolveFlowWorkspaceComposition({
    surface: 'calendar',
    viewportWidth: 1024,
    flowCount: 2,
    hasUndatedTray: true,
  }), 'calendar_tray_grid_agenda');
});

test('legacy and approved minimum targets remain separate interaction contracts', () => {
  assert.equal(FLOW_WORKSPACE_MIN_TARGET_PX, 44);
  assert.equal(PLAN_EXECUTION_WORKSPACE_MIN_TARGET_PX, 48);
  assert.equal(hasValidFlowMobileLayerOrder(), true);
  assert.deepEqual(FLOW_MOBILE_LAYER_ORDER, {
    navigation: 40,
    workbar: 50,
    notice: 60,
    dialog: 80,
  });
});
