'use client';

import {
  MyFlowRouteSurface,
  type MyFlowRouteSurfaceProps,
} from './MyFlowRouteSurface';

/**
 * Compatibility branch for the established My Flow surface. R3A keeps this
 * adapter deliberately transparent so classic receives no extra DOM wrapper.
 */
export function MyFlowClassicExperienceAdapter<TFlow>(
  props: MyFlowRouteSurfaceProps<TFlow>,
) {
  return <MyFlowRouteSurface {...props} />;
}
