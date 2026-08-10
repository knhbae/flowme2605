export const FLOW_WORKSPACE_BREAKPOINTS = {
  mobileMax: 767,
  stackedMin: 768,
  stackedMax: 1023,
  wideMin: 1024,
  desktopCompactMin: 1024,
  desktopCompactMax: 1279,
  desktopFullMin: 1280,
} as const;

export const FLOW_WORKSPACE_MIN_TARGET_PX = 44;
export const PLAN_EXECUTION_WORKSPACE_MIN_TARGET_PX = 48;

export const FLOW_MOBILE_LAYER_ORDER = {
  navigation: 40,
  workbar: 50,
  notice: 60,
  dialog: 80,
} as const;

export type FlowWorkspaceSurface = 'my_flow' | 'calendar';
export type FlowWorkspaceComposition =
  | 'mobile_drill_in'
  | 'outline_detail'
  | 'rail_outline_detail'
  | 'calendar_grid_agenda'
  | 'calendar_tray_grid_agenda';

export type PlanExecutionWorkspaceComposition =
  | 'mobile'
  | 'stacked'
  | 'desktop_compact'
  | 'desktop_full';

/**
 * Resolves the approved plan-execution surface without changing the older
 * workspace resolver used by existing My Flow and Calendar callers.
 */
export function resolvePlanExecutionWorkspaceComposition(
  viewportWidth: number,
): PlanExecutionWorkspaceComposition {
  if (viewportWidth <= FLOW_WORKSPACE_BREAKPOINTS.mobileMax) return 'mobile';
  if (viewportWidth <= FLOW_WORKSPACE_BREAKPOINTS.stackedMax) return 'stacked';
  if (viewportWidth <= FLOW_WORKSPACE_BREAKPOINTS.desktopCompactMax) return 'desktop_compact';
  return 'desktop_full';
}

export function resolveFlowWorkspaceComposition(input: {
  surface: FlowWorkspaceSurface;
  viewportWidth: number;
  flowCount: number;
  hasUndatedTray?: boolean;
}): FlowWorkspaceComposition {
  if (input.viewportWidth < FLOW_WORKSPACE_BREAKPOINTS.wideMin) return 'mobile_drill_in';
  if (input.surface === 'calendar') {
    return input.hasUndatedTray ? 'calendar_tray_grid_agenda' : 'calendar_grid_agenda';
  }
  return input.flowCount > 1 ? 'rail_outline_detail' : 'outline_detail';
}

export function hasValidFlowMobileLayerOrder(
  order: typeof FLOW_MOBILE_LAYER_ORDER = FLOW_MOBILE_LAYER_ORDER,
): boolean {
  return order.navigation < order.workbar && order.workbar < order.notice && order.notice < order.dialog;
}
