'use client';

import { createPersonalWorkspacePocEntryNavigationMemory,
  type PersonalWorkspacePocEntryNavigationBinding as Binding,
  type PersonalWorkspacePocEntryNavigationPresentation as Presentation } from './personal-workspace-poc-entry-navigation';
import { PERSONAL_WORKSPACE_POC_STATE_KEY } from './personal-workspace-poc-contract';
import { PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY } from './personal-workspace-poc-source-candidates';
import { PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY } from './personal-workspace-poc-storage';
import { PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY } from './personal-workspace-poc-creator-drafts';
import { PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY } from './personal-workspace-poc-storage-transaction';
import { PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY } from './personal-workspace-poc-creator-draft-storage-transaction';
import { buildPersonalWorkspacePocReadModel } from './personal-workspace-poc-read-model';
import { mergeSourceBackedMyFlowBundles } from './source-backed-my-flow';
import { readBundles } from './storage';

// History contains only an opaque id. No DTO, query, source text, or draft is persisted.
const HISTORY_FIELD = '__flowmePocEntryNavigationV1';
let browserSession: { memory: ReturnType<typeof createPersonalWorkspacePocEntryNavigationMemory>; epoch: number; lastBinding?: Binding } | undefined;
function invalidate() {
  if (browserSession) { browserSession.epoch += 1; browserSession.memory.invalidate(); }
}
function observeBinding(binding: Binding) {
  if (!browserSession) return;
  if (browserSession.lastBinding && (Object.keys(binding) as (keyof Binding)[])
    .some(key => browserSession!.lastBinding![key] !== binding[key])) invalidate();
  browserSession.lastBinding = binding;
}
function isEntryLocation() {
  const query = new URLSearchParams(window.location.search);
  return window.location.pathname === '/flows/new' && [...query.keys()].length === 1
    && query.get('personalWorkspacePoc') === 'v1' && !window.location.hash;
}
/** Explicit browser-only installation, one observer for the document's lifetime, including route absence. */
export function observePersonalWorkspacePocEntryNavigation(): number {
  if (typeof window === 'undefined') return -1;
  if (!browserSession) {
    const session = { memory: createPersonalWorkspacePocEntryNavigationMemory(), epoch: 0 };
    browserSession = session;
    window.addEventListener('storage', event => {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      if (event.key === null || event.key.startsWith('flow:') || event.key.startsWith('flow_builder_mvp_')) {
        invalidate();
      }
    });
  }
  return browserSession.epoch;
}
export function isPersonalWorkspacePocEntryNavigationEpoch(epoch: number): boolean {
  return browserSession !== undefined && browserSession.epoch === epoch;
}
/** Current read only. Recovery is the route's job; a pending journal cannot authorize a cached preview. */
export function readPersonalWorkspacePocEntryNavigationBinding(): Binding | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const storage = window.localStorage;
    if (storage.getItem(PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY) !== null
      || storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY) !== null) { invalidate(); return undefined; }
    const model = buildPersonalWorkspacePocReadModel(storage, mergeSourceBackedMyFlowBundles(readBundles()));
    if (!model.ok) { invalidate(); return undefined; }
    const binding = { stateRaw: storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY),
      sourceRaw: storage.getItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY), modelJson: JSON.stringify(model.model),
      draftRaw: storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY),
      libraryRaw: storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY) };
    observeBinding(binding);
    return binding;
  } catch { invalidate(); return undefined; }
}
export function isPersonalWorkspacePocEntryNavigationBindingCurrent(binding: Binding, epoch: number): boolean {
  if (!isPersonalWorkspacePocEntryNavigationEpoch(epoch)) return false;
  const current = readPersonalWorkspacePocEntryNavigationBinding();
  const valid = current !== undefined && isPersonalWorkspacePocEntryNavigationEpoch(epoch)
    && (Object.keys(binding) as (keyof Binding)[]).every(key => binding[key] === current[key]);
  if (!valid && isPersonalWorkspacePocEntryNavigationEpoch(epoch)) invalidate();
  return valid;
}
export function capturePersonalWorkspacePocEntryNavigation(binding: Binding, epoch: number, presentation: Presentation): boolean {
  if (typeof window === 'undefined' || !isEntryLocation()
    || !isPersonalWorkspacePocEntryNavigationBindingCurrent(binding, epoch) || !browserSession) return false;
  let id: string | undefined;
  try {
    id = window.crypto.randomUUID();
    if (!browserSession.memory.capture({ id, binding, presentation })) return false;
    window.history.replaceState({ ...window.history.state, [HISTORY_FIELD]: id }, '', window.location.href);
    return true;
  } catch {
    if (id) browserSession.memory.discard(id);
    return false;
  }
}
export function restorePersonalWorkspacePocEntryNavigation(binding: Binding): Presentation | undefined {
  if (typeof window === 'undefined' || !isEntryLocation() || !browserSession) return undefined;
  try {
    observeBinding(binding);
    const id = window.history.state?.[HISTORY_FIELD];
    return typeof id === 'string' ? browserSession.memory.restore(id, binding) : undefined;
  } catch { return undefined; }
}
