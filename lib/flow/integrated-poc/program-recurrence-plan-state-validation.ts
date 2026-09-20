import type { ProgramRecurrencePlans } from './program-recurrence-plan-state-contract';
import { validateProgramRecurrencePlanOwner } from './program-recurrence-plan';
import { stableAuthoringJson } from './native-creator-vendor/text-authoring/identity';
export function validateProgramRecurrencePlans(value: unknown): value is ProgramRecurrencePlans {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string,unknown>;
  if (Object.keys(row).sort().join(',') !== 'owners,version' || row.version !== 1 || !row.owners || typeof row.owners !== 'object' || Array.isArray(row.owners)) return false;
  const descriptors = Object.getOwnPropertyDescriptors(row.owners);
  if (![Object.prototype,null].includes(Object.getPrototypeOf(row.owners)) || Object.getOwnPropertySymbols(row.owners).length
    || Object.entries(descriptors).some(([k,d])=>['__proto__','constructor','prototype'].includes(k)||!('value' in d)) || Object.keys(row.owners).length > 200) return false;
  const seen = new Set<string>();
  return Object.entries(row.owners).every(([id,owner])=>{
    if (!validateProgramRecurrencePlanOwner(owner) || owner.ownerId!==id || !owner.operations.length) return false;
    const key = owner.source.publicOwner ? stableAuthoringJson([owner.actorId,owner.source.publicOwner,owner.source.sourceRule])
      : JSON.stringify([owner.actorId,owner.source.sourceWorkspaceId,owner.source.sourceItemRef,owner.source.sourceRevisionToken]);
    if(seen.has(key)) return false; seen.add(key); return true;
  });
}
