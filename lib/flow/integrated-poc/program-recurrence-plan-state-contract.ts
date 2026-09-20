import type { ProgramRecurrencePlanOwner } from './program-recurrence-plan-contract';
/** Optional private extension. Absent is empty; no implicit owner creation or source migration. */
export type ProgramRecurrencePlans = { version: 1; owners: Record<string,ProgramRecurrencePlanOwner> };
