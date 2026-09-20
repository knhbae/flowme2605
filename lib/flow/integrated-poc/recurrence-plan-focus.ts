import type { ProgramData } from './contract';
import type { ProgramRecurrencePlanOwner } from './program-recurrence-plan-contract';
import { programPersonalOccurrenceKey } from './program-recurrence-plan-contract';
import { programPersonalOccurrenceIdentity, readProgramRecurrencePlan } from './program-recurrence-plan';

/** Ephemeral UI intent only. Never persisted as execution or navigation data. */
export type ProgramRecurrencePlanFocusRequest = {
  actorId: string; ownerId: string; date: string; operationCount: number; operationAt: string;
};
export const programRecurrenceFocusId = (key: string) => `program-recurrence-focus-${encodeURIComponent(key)}`;
export function programRecurrencePlanFocusRequest(owner: ProgramRecurrencePlanOwner, date: string): ProgramRecurrencePlanFocusRequest {
  return { actorId: owner.actorId, ownerId: owner.ownerId, date, operationCount: owner.operations.length, operationAt: owner.operations.at(-1)?.at ?? '' };
}
export function resolveProgramRecurrencePlanFocus(data: ProgramData, request: ProgramRecurrencePlanFocusRequest): { key: string; date: string } | null {
  if (request.actorId !== data.activeActorId) return null;
  const owner = data.spaces[request.actorId]?.recurrencePlans?.owners[request.ownerId];
  if (!owner || owner.operations.length !== request.operationCount || owner.operations.at(-1)?.at !== request.operationAt) return null;
  const read = readProgramRecurrencePlan(owner, { start: request.date, end: request.date });
  if (!read.ok) return null;
  const rows = read.value.personalOccurrences.filter(row => row.localDate === request.date);
  // Do not send keyboard users to a guessed first row or another source version.
  if (rows.length !== 1) return null;
  return { key: programPersonalOccurrenceKey(programPersonalOccurrenceIdentity(owner, rows[0])), date: request.date };
}
