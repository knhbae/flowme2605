import { loadBundledStructureTemplateCatalog } from '../personal-workspace-poc-structure-template/catalog';
import { createStructureDraft, reduceStructureDraft, type StructureDraftAction } from '../personal-workspace-poc-structure-template/draft';
import { createStructureTemplateMaterializationCommand, fingerprintStructureTemplateRawText as fingerprint, planStructureTemplateMaterialization } from '../personal-workspace-poc-structure-template/materialization';
import { stableAuthoringJson } from '../personal-workspace-poc-structure-template/runtime-adapter';
import type { StructureDraft, SourceMaterializationPlan, StructureTemplateMaterializationCommand, StructureTemplateIssue, StructureTemplateReadinessProblem } from '../personal-workspace-poc-structure-template/types';
import { validateProgramCreatorStructureSidecar } from './creator-structure-validation';

export type ProgramCreatorStructureSidecar = Readonly<{
  catalogVersion: string;
  draft: StructureDraft;
  materialization?: Readonly<{ transactionId: string; beforeSourceFingerprint: string; afterSourceFingerprint: string }>;
}>;
export type ProgramCreatorStructurePrepared = Readonly<{
  draftId: string; beforeRawText: string; before: ProgramCreatorStructureSidecar; after: ProgramCreatorStructureSidecar;
  command: StructureTemplateMaterializationCommand; plan: SourceMaterializationPlan;
}>;
export type ProgramCreatorStructureResult<T> = { ok: true; value: T } | { ok: false; reason: string };
const no = (reason: string) => ({ ok: false as const, reason });
const same = (a: unknown, b: unknown) => stableAuthoringJson(a) === stableAuthoringJson(b);
export const programCreatorStructureTemplates = () => loadBundledStructureTemplateCatalog().templates;

export function createProgramCreatorStructure(input: { draftId: string; templateId: string; rawText: string; now: string }): ProgramCreatorStructureResult<ProgramCreatorStructureSidecar> {
  if (input.rawText.trim() !== '') return no('nonempty-source');
  const catalog = loadBundledStructureTemplateCatalog(), definition = catalog.templates.find(t => t.templateId === input.templateId);
  if (!definition) return no('unknown-template');
  try { const value = { catalogVersion: catalog.catalogVersion, draft: createStructureDraft(definition, { draftId: input.draftId, sourceFingerprint: fingerprint(input.rawText), updatedAt: input.now }) };
    return validateProgramCreatorStructureSidecar(value, input.draftId) ? { ok: true, value } : no('invalid-sidecar');
  } catch { return no('invalid-sidecar'); }
}

export function programCreatorStructureConnection(sidecar: ProgramCreatorStructureSidecar, rawText: string): 'unmaterialized' | 'materialized' | 'stale' {
  if (!validateProgramCreatorStructureSidecar(sidecar)) return 'stale';
  const current = fingerprint(rawText);
  return sidecar.materialization ? current === sidecar.materialization.afterSourceFingerprint ? 'materialized' : 'stale'
    : current === sidecar.draft.sourceFingerprint ? 'unmaterialized' : 'stale';
}

export function reduceProgramCreatorStructure(sidecar: ProgramCreatorStructureSidecar, action: Exclude<StructureDraftAction, { type: 'mark_materialized' }>, now: string): ProgramCreatorStructureResult<ProgramCreatorStructureSidecar> {
  if (!validateProgramCreatorStructureSidecar(sidecar)) return no('invalid-sidecar');
  if (sidecar.draft.materialized !== false) return no('already-materialized');
  try { const value = { catalogVersion: sidecar.catalogVersion, draft: reduceStructureDraft(sidecar.draft, action, now) };
    return validateProgramCreatorStructureSidecar(value, sidecar.draft.draftId) ? { ok: true, value } : no('invalid-action');
  } catch { return no('invalid-action'); }
}

export function programCreatorStructureHasValues(sidecar: ProgramCreatorStructureSidecar): boolean {
  const has = (value: unknown): boolean => value !== null && value !== '' && value !== undefined && (Array.isArray(value) ? value.some(has) : typeof value === 'object' ? Object.values(value).some(has) : true);
  const group = (g: StructureDraft['groups'][number]): boolean => has(g.values) || g.children.some(group);
  return has(sidecar.draft.values) || sidecar.draft.groups.some(group);
}

/** Caller retains previous sidecar for one local switch Undo. Neither path receives a writer. */
export function switchProgramCreatorStructure(current: ProgramCreatorStructureSidecar | null, input: Parameters<typeof createProgramCreatorStructure>[0] & { confirmed: boolean }): ProgramCreatorStructureResult<ProgramCreatorStructureSidecar> {
  if (current && (!validateProgramCreatorStructureSidecar(current, input.draftId) || current.draft.materialized !== false)) return no('already-materialized');
  if (current?.draft.templateId === input.templateId) return { ok: true, value: current };
  if (current && programCreatorStructureHasValues(current) && !input.confirmed) return no('confirmation-required');
  return createProgramCreatorStructure(input);
}

/** Exact sidecar CAS for host Program transitions; null means detach only. */
export function compareProgramCreatorStructure(current: ProgramCreatorStructureSidecar | null, expected: ProgramCreatorStructureSidecar | null, next: ProgramCreatorStructureSidecar | null, draftId: string): ProgramCreatorStructureResult<ProgramCreatorStructureSidecar | null> {
  if ((current && !validateProgramCreatorStructureSidecar(current, draftId)) || (next && !validateProgramCreatorStructureSidecar(next, draftId))) return no('invalid-sidecar');
  return same(current, expected) ? { ok: true, value: next } : no('stale-sidecar');
}

export type ProgramCreatorStructurePreparation = { ok: true; value: ProgramCreatorStructurePrepared } | { ok: false; reason: string; issues?: readonly (StructureTemplateIssue | StructureTemplateReadinessProblem)[] };
export function prepareProgramCreatorStructure(sidecar: ProgramCreatorStructureSidecar, input: { draftId: string; rawText: string; now: string; composing?: boolean }): ProgramCreatorStructurePreparation {
  if (!validateProgramCreatorStructureSidecar(sidecar, input.draftId)) return no('invalid-sidecar');
  if (input.composing) return no('composing');
  if (sidecar.draft.materialized !== false) return no('already-materialized');
  if (programCreatorStructureConnection(sidecar, input.rawText) === 'stale') return no('stale-source');
  if (input.rawText.trim() !== '') return no('nonempty-source');
  const definition = programCreatorStructureTemplates().find(t => t.templateId === sidecar.draft.templateId)!;
  const result = planStructureTemplateMaterialization({ definition, draft: sidecar.draft, currentRawText: input.rawText });
  if (result.status !== 'ready') return { ok: false, reason: result.status, issues: result.status === 'blocked' ? result.issues : result.problems };
  const command = createStructureTemplateMaterializationCommand(sidecar.draft, result.plan);
  const after: ProgramCreatorStructureSidecar = { catalogVersion: sidecar.catalogVersion,
    draft: reduceStructureDraft(sidecar.draft, { type: 'mark_materialized', materialization: { transactionId: command.transactionId, at: input.now, sourceRevisionId: command.transactionId, insertedRange: command.insertedRange } }, input.now),
    materialization: { transactionId: command.transactionId, beforeSourceFingerprint: command.expectedSourceFingerprint, afterSourceFingerprint: fingerprint(command.nextRawText) } };
  if (!validateProgramCreatorStructureSidecar(after, input.draftId)) return no('invalid-sidecar');
  return { ok: true, value: { draftId: input.draftId, beforeRawText: input.rawText, before: sidecar, after, command, plan: result.plan } };
}

/** Verify after the native command, then persist returned pair in ONE Program transaction.
 * On failure host keeps its paired local buffer; this function has no side effects. */
export function commitProgramCreatorStructure(prepared: ProgramCreatorStructurePrepared, current: { draftId: string; rawText: string; sidecar: ProgramCreatorStructureSidecar | null; nativeRawText: string; composing?: boolean }): ProgramCreatorStructureResult<{ rawText: string; sidecar: ProgramCreatorStructureSidecar }> {
  if (current.composing) return no('composing');
  if (current.draftId !== prepared.draftId || current.rawText !== prepared.beforeRawText || !same(current.sidecar, prepared.before)) return no('stale-source');
  const verified = prepareProgramCreatorStructure(prepared.before, { draftId: current.draftId, rawText: current.rawText, now: prepared.after.draft.updatedAt });
  if (!verified.ok || !same(verified.value, prepared)) return no('invalid-command');
  if (current.nativeRawText !== prepared.command.nextRawText) return no('native-command-diverged');
  return { ok: true, value: { rawText: prepared.command.nextRawText, sidecar: prepared.after } };
}

/** Host must provide an actual native history event AND its owned transaction id.
 * Identical text typed through an ordinary input event is never treated as Undo. */
export function restoreProgramCreatorStructureHistory(prepared: ProgramCreatorStructurePrepared, event: { transactionId: string; inputType: string; beforeRawText: string; rawText: string; sidecar: ProgramCreatorStructureSidecar | null }): ProgramCreatorStructureResult<{ rawText: string; sidecar: ProgramCreatorStructureSidecar }> {
  if (event.transactionId !== prepared.command.transactionId) return no('unrelated-history');
  const undo = event.inputType === 'historyUndo', redo = event.inputType === 'historyRedo';
  if (!undo && !redo) return no('unrelated-history');
  const fromRaw = undo ? prepared.command.nextRawText : prepared.beforeRawText, toRaw = undo ? prepared.beforeRawText : prepared.command.nextRawText;
  const fromSidecar = undo ? prepared.after : prepared.before, toSidecar = undo ? prepared.before : prepared.after;
  if (event.beforeRawText !== fromRaw || event.rawText !== toRaw || !same(event.sidecar, fromSidecar)) return no('stale-history');
  return { ok: true, value: { rawText: toRaw, sidecar: toSidecar } };
}
