import type { AlphaPrivateCommand } from '../alpha-persistence/contract';
import { validateAlphaCommand } from '../alpha-persistence/fake-server';
export const ALPHA_M3_FIELDS = Object.freeze(['text', 'archivedDocumentIds', 'documentTrash', 'position', 'timelineOrders', 'executionTimelineOrders', 'legacySnapshot', 'legacyQuickItemLines', 'legacyTimelinePolicies', 'retentionDocuments', 'recurrenceExecution', 'recurrencePlans', 'savedBindings'] as const);
export function isM3Command(value: unknown): value is AlphaPrivateCommand {
  return validateAlphaCommand(value) && (value.kind === 'undo-private' || value.changes.every(change => (ALPHA_M3_FIELDS as readonly string[]).includes(change.field)));
}
