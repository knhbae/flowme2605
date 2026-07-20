export const FLOW_WORKSPACE_BREAKPOINTS = {
  mobileMax: 767,
  wideMin: 1024,
} as const;

export const FLOW_WORKSPACE_MIN_TARGET_PX = 44;

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
