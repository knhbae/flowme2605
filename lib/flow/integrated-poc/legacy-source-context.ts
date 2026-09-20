import type { PersonalWorkspacePocAuthoringItemContext, PersonalWorkspacePocResultSourceAttributes } from '../personal-workspace-poc-source-attributes-contract';
import type { ProgramStructuredMapRecurrenceContext } from './legacy-map-recurrence';

/** Program read contract only. A saved structured Step is not an authored line. */
export type ProgramLegacyItemContext = PersonalWorkspacePocAuthoringItemContext | {
  sourceLine?: never;
  structuredRecurrence: ProgramStructuredMapRecurrenceContext;
  attributes: PersonalWorkspacePocResultSourceAttributes;
};
export function programStructuredRecurrence(context: ProgramLegacyItemContext | undefined) {
  return context && 'structuredRecurrence' in context ? context.structuredRecurrence : undefined;
}
export function programStructuredItemContext(context: ProgramStructuredMapRecurrenceContext): ProgramLegacyItemContext {
  return { structuredRecurrence: context, attributes: { recurrence: context.sourceRepeatRule,
    resolvedDate: context.startDate, ...(context.endDate ? { recurrenceEnd: context.endDate } : {}) } };
}
