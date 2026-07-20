import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FLOW_MOBILE_LAYER_ORDER,
  FLOW_WORKSPACE_MIN_TARGET_PX,
  hasValidFlowMobileLayerOrder,
  resolveFlowWorkspaceComposition,
} from './responsive-execution-workspace';

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

test('mobile layers and minimum target keep one stable interaction contract', () => {
  assert.equal(FLOW_WORKSPACE_MIN_TARGET_PX, 44);
  assert.equal(hasValidFlowMobileLayerOrder(), true);
  assert.deepEqual(FLOW_MOBILE_LAYER_ORDER, {
    navigation: 40,
    workbar: 50,
    notice: 60,
    dialog: 80,
  });
});
