import { FlowBundle, PrimaryDestination } from './types';

export function inferPrimaryDestination(bundle: FlowBundle): PrimaryDestination {
  if (bundle.flow.primary_destination) return bundle.flow.primary_destination;
  if (bundle.flow.content_type === 'meal_plan') return 'hybrid';
  if (bundle.flow.structure_type === 'timeline') return 'hybrid';
  if (bundle.flow.structure_type === 'routine') return 'calendar';
  if (bundle.flow.structure_type === 'checklist') return 'internal_check';
  return 'internal_check';
}
