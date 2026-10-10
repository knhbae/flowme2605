import type { ProgramData } from './contract';
import type { TextTask } from './text-workspace';
import { creatorAdoptedRows } from './creator-adoption';
import { programNativeSelectedRows } from './creator-native-execution-validation';
import { programCreatorTaskSourceFacts, resolveProgramExecutionSource } from './execution-source';

type TaskOrigin = { label: string; sourceUrl: string | null };
const documentItem = (): TaskOrigin => ({ label: '문서 항목', sourceUrl: null });
const direct = (): TaskOrigin => ({ label: '직접 작성', sourceUrl: null });
function safeSourceUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch { return null; }
}

/** Presentation only. Filing scopes and matching titles never establish provenance. */
export function readProgramTaskOrigin(data: ProgramData, task: Pick<TextTask, 'id' | 'docId'>): TaskOrigin {
  try {
    const space = data.spaces[data.activeActorId];
    if (!space) return documentItem();
    const documents = [...space.text.documents, ...space.text.flows];
    const positions = documents.flatMap(doc => doc.lines.filter(line => line.id === task.id).map(() => doc));
    if (positions.length !== 1 || positions[0].id !== task.docId
      || !Object.hasOwn(space.text.taskScopes, task.id)) return documentItem();

    const copies = space.copies.flatMap(copy => Object.entries(copy.itemLines)
      .filter(([, lineId]) => lineId === task.id).map(([itemId]) => ({ copy, itemId })));
    const saved = space.savedBindings.flatMap(binding => Object.entries(binding.itemLines)
      .filter(([, lineId]) => lineId === task.id).map(([itemRef]) => ({ binding, itemRef })));
    const creatorOwners = Object.values(space.creatorWorkspace?.executionSources ?? {});
    const nativeOwners = Object.values(space.creatorWorkspace?.nativeExecutionSources ?? {});
    const creator = creatorOwners.flatMap(owner => creatorAdoptedRows(owner)
      .filter(entry => entry.disposition === 'active' && entry.row.documentLineId === task.id));
    const native = nativeOwners.flatMap(owner => programNativeSelectedRows(owner)
      .filter(entry => entry.disposition === 'active' && entry.row.lineId === task.id));
    const quick = Object.values(space.legacyQuickItemLines).filter(lineId => lineId === task.id);
    if (copies.length + saved.length + creator.length + native.length + quick.length > 1) return documentItem();

    if (copies.length === 1) {
      const { copy, itemId } = copies[0];
      const versionId = copy.appliedFields[itemId]?.sourceUrl ?? copy.baseVersionId;
      const versions = data.public.versions.filter(version => version.id === versionId && version.flowId === copy.flowId);
      const items = versions.length === 1 ? versions[0].items.filter(item => item.id === itemId) : [];
      return items.length === 1 ? { label: 'Flow에서 가져옴', sourceUrl: safeSourceUrl(items[0].sourceUrl) } : documentItem();
    }
    if (creator.length === 1 || native.length === 1) {
      // This reader validates the retained source revisions and accepted Item mapping,
      // including native sourceItemId and independently selected revision fields.
      const facts = programCreatorTaskSourceFacts(space, task.docId, task.id);
      return facts ? { label: '제작 문서에서 가져옴', sourceUrl: safeSourceUrl(facts.sourceUrl) } : documentItem();
    }
    if (saved.length === 1) {
      const { binding, itemRef } = saved[0];
      const source = resolveProgramExecutionSource(space, binding.flowRef);
      if (!source.ok || source.kind !== 'legacy') return documentItem();
      const items = source.flow.items.filter(item => item.ref === itemRef
        && item.savedCopyId === binding.savedCopyId && item.flowId === binding.flowId);
      if (items.length !== 1) return documentItem();
      const url = source.contexts.get(itemRef)?.attributes.sourceUrl;
      return { label: source.flow.origin === 'authoring-handoff' ? '제작 문서에서 가져옴' : 'Flow에서 가져옴', sourceUrl: safeSourceUrl(url) };
    }
    if (quick.length === 1) return direct();

    // A retained source row or an unmapped imported document cannot be called
    // directly authored merely because its current source lookup failed.
    const knownSourceLine = space.copies.some(copy => Object.values(copy.subcheckLines).some(children => Object.values(children).includes(task.id))
      || Object.values(copy.kindHandoffs?.items ?? {}).some(slots => [slots.ordinary, slots.recurring]
        .some(slot => slot.lineId === task.id || Object.values(slot.subcheckLines).includes(task.id))))
      || creatorOwners.some(owner => owner.revisions.some(revision => revision.rows.some(row => row.documentLineId === task.id)))
      || nativeOwners.some(owner => owner.revisions.some(revision => revision.rows.some(row => row.lines.some(line => line.id === task.id)))
        || Object.values(owner.selections).some(selection => selection.execution?.lines.some(line => line.id === task.id)));
    const importedDocument = space.savedBindings.some(binding => binding.documentId === task.docId)
      || space.creatorDraftImports?.some(binding => binding.documentId === task.docId)
      || Object.values(space.creatorWorkspace?.handoffs ?? {}).some(binding => binding.documentId === task.docId)
      || creatorOwners.some(owner => owner.documentId === task.docId)
      || nativeOwners.some(owner => owner.documentId === task.docId)
      || Object.values(space.retentionDocuments ?? {}).includes(task.docId);
    if (knownSourceLine || importedDocument) return documentItem();
    if (space.text.documents.some(doc => doc.id === task.docId)) return direct();
    const documentCopies = space.copies.filter(copy => copy.documentId === task.docId);
    return documentCopies.length === 1 ? direct() : documentItem();
  } catch { return documentItem(); }
}
