import type { PersonalWorkspacePocEntryNavigationBinding as Binding } from './personal-workspace-poc-entry-navigation';

/** React-local, replaceable PoC contract. No storage, clock, navigation or recovery
 * authority. Unlike the preview epoch, own draft writes do not change the external
 * generation. The caller initializes from bootstrap's verified packet, never from
 * a fresh read after a conflict. Only exact successful writer output can advance
 * draft/library/state ownership. Source/model cannot be adopted by this bridge.
 */
export const PERSONAL_WORKSPACE_POC_ENTRY_AUTHORING_BRIDGE_VERSION = 1 as const;
export type PersonalWorkspacePocEntryOwnWriteTicket = Readonly<{ version: 1 }>;
type Updates = Partial<Pick<Binding, 'draftRaw' | 'libraryRaw' | 'stateRaw'>>;
const keys = ['stateRaw', 'sourceRaw', 'modelJson', 'draftRaw', 'libraryRaw'] as const;
const mutable = ['draftRaw', 'libraryRaw', 'stateRaw'] as const;
function data(value: unknown, allowed: readonly string[], required: boolean): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return;
  if (Object.getOwnPropertySymbols(value).length) return;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (required && Object.keys(descriptors).length !== allowed.length) return;
  const output: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!allowed.includes(key) || !('value' in descriptor) || !descriptor.enumerable
      || (descriptor.value !== null && typeof descriptor.value !== 'string')
      || (key === 'modelJson' && typeof descriptor.value !== 'string')) return;
    output[key] = descriptor.value;
  }
  return output;
}
function packet(value: unknown): Binding | undefined {
  return data(value, keys, true) as Binding | undefined;
}
function same(a: Binding, b: Binding, fields: readonly (keyof Binding)[] = keys) {
  return fields.every(key => a[key] === b[key]);
}

export function createPersonalWorkspacePocEntryAuthoringBridge(initial: unknown) {
  let owned = packet(initial);
  let locked = !owned;
  let generation = 0;
  let revision = 0;
  const tickets = new WeakMap<object, { before: Binding; revision: number; generation: number }>();
  function invalidate() { locked = true; generation += 1; }
  function inspect(current: unknown) {
    const next = packet(current);
    if (locked || !owned || !next) return undefined;
    if (!same(owned, next)) { invalidate(); return undefined; }
    return Object.freeze({ ...owned });
  }
  function scope(current: unknown, documentId: string) {
    const next = packet(current);
    if (locked || !owned || !next || typeof documentId !== 'string' || !documentId) return undefined;
    // The transition adapter separately checks exact draft bytes before/after its
    // candidate. Requiring the old draft here would reject every real own write.
    if (!same(owned, next, ['stateRaw', 'sourceRaw', 'modelJson', 'libraryRaw'])) {
      invalidate(); return undefined;
    }
    return Object.freeze({ ok: true as const, documentId, draftRaw: next.draftRaw,
      scopeBinding: JSON.stringify([owned.stateRaw, owned.sourceRaw, owned.modelJson, owned.libraryRaw, generation]) });
  }
  function begin(current: unknown): PersonalWorkspacePocEntryOwnWriteTicket | undefined {
    const before = inspect(current);
    if (!before) return;
    const ticket = Object.freeze({ version: 1 as const });
    tickets.set(ticket, { before, revision, generation });
    return ticket;
  }
  function abandon(ticket: unknown) {
    return Boolean(ticket && typeof ticket === 'object' && tickets.delete(ticket));
  }
  function finish(ticket: unknown, current: unknown, updates: Updates): boolean {
    if (!ticket || typeof ticket !== 'object') return false;
    const record = tickets.get(ticket);
    if (!record) return false;
    tickets.delete(ticket);
    if (locked || record.generation !== generation || record.revision !== revision) return false;
    const change = data(updates, mutable, false);
    const next = packet(current);
    if (!change || !next || !same({ ...record.before, ...change } as Binding, next)) {
      invalidate(); return false;
    }
    owned = next;
    revision += 1;
    return true;
  }
  return Object.freeze({ inspect, scope, begin, finish, abandon, invalidate, isLocked: () => locked });
}
