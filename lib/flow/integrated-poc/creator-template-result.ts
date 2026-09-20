import { loadBundledStructureTemplateCatalog } from '../personal-workspace-poc-structure-template/catalog';
import type { PersonalWorkspacePocResultNavigationState, PersonalWorkspacePocResultView } from '../personal-workspace-poc-result-projection';
import { validateProgramCreatorStructureSidecar } from './creator-structure-validation';
import type { ProgramCreatorWorking } from './creator-workspace-contract';
import { createTextAuthoringDocument } from './native-creator-vendor/text-authoring/parser';
import { buildAuthoringArtifactProjection, type AuthoringArtifactKind, type AuthoringArtifactProjection } from './native-creator-vendor/text-authoring/artifact-projection';
import type { TextAuthoringDocument } from './native-creator-document-contract';

export type ProgramTemplateResultPolicy = Readonly<{
  context: string;
  primary: 'calendar' | 'todo';
  artifacts: readonly AuthoringArtifactKind[];
  firstDate?: string;
}>;

function definitionFor(structure: unknown, draftId: string) {
  if (!validateProgramCreatorStructureSidecar(structure, draftId) || !structure.materialization) return null;
  const definition = loadBundledStructureTemplateCatalog().templates.find(t => t.templateId === structure.draft.templateId && t.version === structure.draft.templateVersion);
  return definition ? { definition, structure } : null;
}

/** Presentation only. Native canonical inclusion/roles are never reconstructed from raw. */
export function programTemplateResultPolicy(structure: unknown, draftId: string,
  document: TextAuthoringDocument, projection: AuthoringArtifactProjection): ProgramTemplateResultPolicy | null {
  const bound = definitionFor(structure, draftId);
  if (!bound) return null;
  const policy = bound.definition.projectionPolicy;
  const items = document.parseResult.canonical.items.filter(item => item.included && (item.role === 'item' || item.role === 'completion'));
  const scheduled = new Set(projection.artifacts.calendar.rows.filter(row => !!row.date).map(row => row.itemId));
  const primary = items.length > 0 && items.every(item => scheduled.has(item.itemId)) ? 'calendar' : 'todo';
  const artifacts = (['calendar', 'todo', 'memo', 'sheet'] as const).filter(kind => !policy.notOffered.includes(kind)
    && (policy.offeredArtifacts.includes(kind) || policy.optionalWhenEligible.includes(kind) && projection.artifacts[kind].eligible));
  const firstDate = projection.artifacts.calendar.rows.flatMap(row => row.date ? [row.date] : []).sort()[0];
  return { context: JSON.stringify([bound.structure.catalogVersion, bound.definition.templateId, bound.definition.version, bound.structure.materialization!.transactionId]),
    primary, artifacts, ...(firstDate ? { firstDate } : {}) };
}

/** Only raw-only documents are parsed; no fixture values or saved IDs are materialized here. */
export function programRawTemplateResultPolicy(working: ProgramCreatorWorking, now: string): ProgramTemplateResultPolicy | null {
  if (working.nativeDocument || !definitionFor(working.structure, working.draftId)) return null;
  const document = createTextAuthoringDocument(working.rawText, { documentId: working.draftId, now, ownership: 'creator' });
  return programTemplateResultPolicy(working.structure, working.draftId, document, buildAuthoringArtifactProjection(document));
}

export function programCreatorResultScope(actorId: string, working: ProgramCreatorWorking | null): string {
  return JSON.stringify([actorId, working?.draftId ?? null, working?.structure?.materialization?.transactionId ?? null]);
}

export function programTemplateResultViews(policy: ProgramTemplateResultPolicy): readonly PersonalWorkspacePocResultView[] {
  return policy.artifacts.map(kind => kind === 'memo' ? 'text' : kind);
}

/** Omitted choices follow the current source; explicit choices remain within this scope. */
export function programCreatorResultNavigation(policy: ProgramTemplateResultPolicy | null,
  choice?: Partial<PersonalWorkspacePocResultNavigationState>): PersonalWorkspacePocResultNavigationState {
  const allowed = policy ? programTemplateResultViews(policy) : null;
  const resultView = choice?.resultView && (!allowed || allowed.includes(choice.resultView)) ? choice.resultView : policy?.primary ?? 'text';
  return { ...choice, resultView,
    ...(policy?.firstDate ? { baseDate: choice?.baseDate ?? policy.firstDate, selectedDate: choice?.selectedDate ?? policy.firstDate } : {}) };
}
