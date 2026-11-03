import { buildCatalogContent } from './catalog-content';
import { createNativeCreatorDocumentOwner } from './native-creator-document';
import { isNativeCreatorCatalogContentSource, type NativeCreatorCatalogContentSource } from './native-creator-document-contract';
import { createProgramCreatorWorkspace } from './creator-workspace';
import type { ProgramCreatorWorkspaceState } from './creator-workspace-contract';
import { captureProgramCreatorSavedRevision } from './creator-history-snapshot';
import { transitionPersonalWorkspacePocCreatorDraftLibrary } from '../personal-workspace-poc-creator-drafts';
import { fingerprintPersonalWorkspacePocAuthoringSource } from '../personal-workspace-poc-authoring';
import { canonicalJson, detached } from './alpha-persistence/json';
import type { CatalogLibrarySnapshot } from './catalog-library';

export type CatalogContentImportInput = { draftId: string; sourceSlug: string; sourceVersionId: string; now: string };
type Result = { ok: true; workspace: ProgramCreatorWorkspaceState; draftId: string; changed: boolean }
  | { ok: false; reason: 'invalid' | 'conflict' | 'limit' };

/** Server and client compile the same explicit locator. No submitted source
 * bytes, arbitrary native DTO, legacy actor, or whole-account restore is accepted. */
export function importCatalogContentWorkspace(before: ProgramCreatorWorkspaceState | undefined, input: CatalogContentImportInput, library: CatalogLibrarySnapshot): Result {
  try {
    const projected = buildCatalogContent(input.sourceSlug, library);
    if (!projected.ok || projected.content.versionId !== input.sourceVersionId) return { ok: false, reason: 'conflict' };
    const contentJson = canonicalJson(projected.content);
    for (const [draftId, context] of Object.entries(before?.structureDrafts ?? {})) {
      const source = context.nativeDocument?.source;
      if (!source || !isNativeCreatorCatalogContentSource(source) || source.sourceSlug !== input.sourceSlug) continue;
      if (source.contentJson !== contentJson || source.versionId !== input.sourceVersionId || before!.library.records[draftId]?.status !== 'active') return { ok: false, reason: 'conflict' };
      return { ok: true, workspace: before!, draftId, changed: false };
    }
    if (before?.library.records[input.draftId] || before?.working?.draftId === input.draftId) return { ok: false, reason: 'conflict' };
    if (Object.keys(before?.library.records ?? {}).length >= 200) return { ok: false, reason: 'limit' };
    const source: NativeCreatorCatalogContentSource = { kind: 'catalog-content', version: 1, storageKey: 'flow:catalog-content:v1',
      draftId: `catalog-content:${input.sourceSlug}`, sourceSlug: input.sourceSlug, versionId: input.sourceVersionId,
      revisionId: projected.document.revision.revisionId, contentJson, documentJson: canonicalJson(projected.document) };
    const native = createNativeCreatorDocumentOwner({ id: input.draftId, source }, input.now);
    if (!native.ok) return { ok: false, reason: 'invalid' };
    const workspace = before ? detached(before) : createProgramCreatorWorkspace(input.now);
    const saved = transitionPersonalWorkspacePocCreatorDraftLibrary(workspace.library, { type: 'save', draftId: input.draftId,
      expectedLibraryRevision: workspace.library.revision, title: projected.document.title, rawText: projected.document.rawText,
      sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(projected.document.rawText), now: input.now });
    if (!saved.changed) return { ok: false, reason: 'invalid' };
    workspace.library = saved.library;
    workspace.structureDrafts ??= {};
    workspace.structureDrafts[input.draftId] = { version: 1, recordRevision: workspace.library.records[input.draftId].recordRevision,
      contextRevision: 1, savedAt: input.now, nativeDocument: native.owner, nativeSelection: source };
    captureProgramCreatorSavedRevision(workspace, workspace.library.records[input.draftId]);
    // Existing working input, personal handoffs and all execution state remain untouched.
    return { ok: true, workspace, draftId: input.draftId, changed: true };
  } catch { return { ok: false, reason: 'invalid' }; }
}
