import { isPersonalWorkspacePocDate } from './personal-workspace-poc-state';

export const PERSONAL_WORKSPACE_POC_ENTRY_NAVIGATION_CONTRACT = 'flowme-personal-workspace-entry-navigation-v1' as const;
export const PERSONAL_WORKSPACE_POC_ENTRY_NAVIGATION_VERSION = 1 as const;
/** Temporary PoC display contract, not a persistence or product retention policy. */
export const PERSONAL_WORKSPACE_POC_ENTRY_NAVIGATION_MAX_ENTRIES = 8 as const;

export type PersonalWorkspacePocEntryNavigationBinding = Readonly<{
  stateRaw: string | null;
  sourceRaw: string | null;
  modelJson: string;
  draftRaw: string | null;
  libraryRaw: string | null;
}>;
export type PersonalWorkspacePocEntryNavigationPresentation = Readonly<{
  entryInput: string;
  groupRef?: string;
  flowRef?: string;
  panel: 'list' | 'preview';
  preview: Readonly<{
    owner: 'personal-copy' | 'source';
    resultView: 'text' | 'todo' | 'calendar' | 'sheet';
    baseDate?: string;
    selectedDate?: string;
    openItemRef?: string;
  }>;
  scroll: Readonly<{ documentY: number; inputY: number; resultY: number }>;
  /** The list's earlier position, separate from the current preview departure scroll. */
  listReturn?: Readonly<{ documentY: number; inputY: number }>;
  focus: 'input' | 'result' | 'workspace-link';
}>;
export type PersonalWorkspacePocEntryNavigationCapture = Readonly<{
  id: string;
  binding: PersonalWorkspacePocEntryNavigationBinding;
  presentation: PersonalWorkspacePocEntryNavigationPresentation;
}>;
export type PersonalWorkspacePocEntryNavigationMemory = Readonly<{
  capture(input: PersonalWorkspacePocEntryNavigationCapture): boolean;
  restore(id: string, binding: PersonalWorkspacePocEntryNavigationBinding): PersonalWorkspacePocEntryNavigationPresentation | undefined;
  invalidate(): void;
  discard(id: string): void;
}>;

type DataRecord = Record<string, unknown>;
type Captured = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_ENTRY_NAVIGATION_VERSION;
  contract: typeof PERSONAL_WORKSPACE_POC_ENTRY_NAVIGATION_CONTRACT;
  binding: PersonalWorkspacePocEntryNavigationBinding;
  presentation: PersonalWorkspacePocEntryNavigationPresentation;
}>;
function invalid(): never { throw new TypeError('invalid-entry-navigation-data'); }

/** Inspect descriptors before values, so property getters/toJSON never run. */
function cloneData<T>(value: T, ancestors = new WeakSet<object>()): T {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid();
  if (ancestors.has(value) || Object.getOwnPropertySymbols(value).length) invalid();
  ancestors.add(value);
  const output: DataRecord = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!('value' in descriptor) || !descriptor.enumerable
      || ['__proto__', 'prototype', 'constructor', 'toJSON'].includes(key)) invalid();
    Object.defineProperty(output, key, {
      value: cloneData(descriptor.value, ancestors), enumerable: true, writable: true, configurable: true,
    });
  }
  ancestors.delete(value);
  return output as T;
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function record(value: unknown, required: readonly string[], optional: readonly string[] = []): DataRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  const row = value as DataRecord;
  if (required.some(key => !Object.hasOwn(row, key))
    || Object.keys(row).some(key => !required.includes(key) && !optional.includes(key))) invalid();
  return row;
}
function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length === 36
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}
function nonblank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function validateBinding(value: unknown): asserts value is PersonalWorkspacePocEntryNavigationBinding {
  const row = record(value, ['stateRaw', 'sourceRaw', 'modelJson', 'draftRaw', 'libraryRaw']);
  if (typeof row.modelJson !== 'string') invalid();
  for (const key of ['stateRaw', 'sourceRaw', 'draftRaw', 'libraryRaw']) {
    if (row[key] !== null && typeof row[key] !== 'string') invalid();
  }
}
function validatePresentation(value: unknown): asserts value is PersonalWorkspacePocEntryNavigationPresentation {
  const row = record(value, ['entryInput', 'panel', 'preview', 'scroll', 'focus'], ['groupRef', 'flowRef', 'listReturn']);
  if (typeof row.entryInput !== 'string' || !['list', 'preview'].includes(row.panel as string)
    || !['input', 'result', 'workspace-link'].includes(row.focus as string)) invalid();
  const hasGroup = Object.hasOwn(row, 'groupRef'), hasFlow = Object.hasOwn(row, 'flowRef');
  if (hasGroup !== hasFlow || (row.panel === 'preview' && !hasGroup)) invalid();
  if (hasGroup && (!nonblank(row.groupRef) || !nonblank(row.flowRef))) invalid();
  const preview = record(row.preview, ['owner', 'resultView'], ['baseDate', 'selectedDate', 'openItemRef']);
  if (!['personal-copy', 'source'].includes(preview.owner as string)
    || !['text', 'todo', 'calendar', 'sheet'].includes(preview.resultView as string)) invalid();
  for (const key of ['baseDate', 'selectedDate']) {
    if (Object.hasOwn(preview, key) && !isPersonalWorkspacePocDate(preview[key])) invalid();
  }
  if (Object.hasOwn(preview, 'openItemRef') && !nonblank(preview.openItemRef)) invalid();
  const scroll = record(row.scroll, ['documentY', 'inputY', 'resultY']);
  for (const key of ['documentY', 'inputY', 'resultY']) {
    if (typeof scroll[key] !== 'number' || !Number.isFinite(scroll[key]) || (scroll[key] as number) < 0) invalid();
  }
  if (Object.hasOwn(row, 'listReturn')) {
    const listReturn = record(row.listReturn, ['documentY', 'inputY']);
    for (const key of ['documentY', 'inputY']) {
      if (typeof listReturn[key] !== 'number' || !Number.isFinite(listReturn[key]) || (listReturn[key] as number) < 0) invalid();
    }
  }
}
function sameBinding(left: PersonalWorkspacePocEntryNavigationBinding, right: PersonalWorkspacePocEntryNavigationBinding): boolean {
  return left.stateRaw === right.stateRaw && left.sourceRaw === right.sourceRaw
    && left.modelJson === right.modelJson && left.draftRaw === right.draftRaw && left.libraryRaw === right.libraryRaw;
}

/**
 * One isolated memory per caller boundary. No module-level mutable records or I/O.
 * Equality here is captured byte equality, not current source/membership permission.
 * The caller must validate membership and invalidate on every observed change,
 * including A→B→A; history and lifecycle event handling are outside this module.
 */
export function createPersonalWorkspacePocEntryNavigationMemory(): PersonalWorkspacePocEntryNavigationMemory {
  const entries = new Map<string, Captured>();
  return Object.freeze({
    capture(input: PersonalWorkspacePocEntryNavigationCapture): boolean {
      try {
        const cloned = cloneData(input);
        const row = record(cloned, ['id', 'binding', 'presentation']);
        if (!isId(row.id)) return false;
        validateBinding(row.binding); validatePresentation(row.presentation);
        const entry = freeze({
          version: PERSONAL_WORKSPACE_POC_ENTRY_NAVIGATION_VERSION,
          contract: PERSONAL_WORKSPACE_POC_ENTRY_NAVIGATION_CONTRACT,
          binding: row.binding, presentation: row.presentation,
        });
        // A successful recapture is newest; failed captures leave all prior data alone.
        entries.delete(row.id); entries.set(row.id, entry);
        if (entries.size > PERSONAL_WORKSPACE_POC_ENTRY_NAVIGATION_MAX_ENTRIES) {
          const oldest = entries.keys().next();
          if (!oldest.done) entries.delete(oldest.value);
        }
        return true;
      } catch { return false; }
    },
    restore(id: string, binding: PersonalWorkspacePocEntryNavigationBinding): PersonalWorkspacePocEntryNavigationPresentation | undefined {
      if (!isId(id)) return undefined;
      const entry = entries.get(id);
      if (!entry) return undefined;
      try {
        const checked = cloneData(binding); validateBinding(checked);
        if (!sameBinding(entry.binding, checked)) { entries.delete(id); return undefined; }
        // Restoring does not refresh capacity order or consume the successful capture.
        return freeze(cloneData(entry.presentation));
      } catch { entries.delete(id); return undefined; }
    },
    invalidate(): void { entries.clear(); },
    discard(id: string): void { if (isId(id)) entries.delete(id); },
  });
}
