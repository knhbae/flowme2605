import type { ProgramCreatorDraftImport, ProgramPrivateSpace } from './contract';
import { isPersonalWorkspacePocCreatorDraftRecord } from '../personal-workspace-poc-creator-drafts';

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const shape = (value: unknown, keys: string[]): value is Record<string, unknown> => record(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const instant = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const id = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 1200;
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const normalize = (raw: string) => raw.replace(/\r\n?/gu, '\n');

/** Descriptor-safe gate before the pre-existing CreatorDraft record predicate. */
export function isProgramCreatorDraftJson(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value) || Object.getOwnPropertySymbols(value).length || !Array.isArray(value) && !record(value)) return false;
  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value), keys = Object.keys(descriptors).filter(key => !Array.isArray(value) || key !== 'length');
  if (Array.isArray(value) && (keys.length !== value.length || keys.some((key, index) => key !== String(index)))) return false;
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (['__proto__', 'prototype', 'constructor'].includes(key) || !descriptor.enumerable || !('value' in descriptor)
      || !isProgramCreatorDraftJson(descriptor.value, ancestors)) return false;
  }
  ancestors.delete(value); return true;
}

/** No runtime dependency on ProgramData validation or bridge transitions. */
export function validateProgramCreatorDraftImports(value: unknown, space: Pick<ProgramPrivateSpace, 'text' | 'draftRevisions'>): value is ProgramCreatorDraftImport[] {
  try {
    if (!isProgramCreatorDraftJson(value) || !Array.isArray(value) || value.length > 1000) return false;
    const creators = new Set<string>(), documents = new Set<string>(), revisions = new Set<string>();
    return value.every(entry => {
      if (!shape(entry, ['creatorDraftId', 'documentId', 'importedAt', 'undoRevisionId', 'source'])
        || !id(entry.creatorDraftId) || !id(entry.documentId) || !instant(entry.importedAt)
        || !shape(entry.source, ['libraryRevision', 'libraryUpdatedAt', 'current', 'undo'])) return false;
      const source = entry.source;
      if (!integer(source.libraryRevision) || !instant(source.libraryUpdatedAt) || !isPersonalWorkspacePocCreatorDraftRecord(source.current)
        || source.current.draftId !== entry.creatorDraftId || source.current.updatedAt > source.libraryUpdatedAt || source.libraryUpdatedAt > entry.importedAt
        || creators.has(entry.creatorDraftId) || documents.has(entry.documentId)
        || !space.text.documents.some(document => document.id === entry.documentId)) return false;
      creators.add(entry.creatorDraftId); documents.add(entry.documentId);
      if (source.undo === null) return entry.undoRevisionId === null;
      const previous = source.undo;
      if (!shape(previous, ['label', 'libraryRevision', 'libraryUpdatedAt', 'record']) || !id(previous.label) || !integer(previous.libraryRevision)
        || previous.libraryRevision >= source.libraryRevision || !instant(previous.libraryUpdatedAt) || previous.libraryUpdatedAt > source.libraryUpdatedAt
        || !isPersonalWorkspacePocCreatorDraftRecord(previous.record) || previous.record.draftId !== entry.creatorDraftId
        || previous.record.updatedAt > previous.libraryUpdatedAt) return false;
      const contentChanged = previous.record.rawText !== source.current.rawText || previous.record.title !== source.current.title;
      if (!contentChanged) return entry.undoRevisionId === null;
      if (!id(entry.undoRevisionId) || revisions.has(entry.undoRevisionId)) return false;
      revisions.add(entry.undoRevisionId);
      const revision = space.draftRevisions.find(revision => revision.id === entry.undoRevisionId);
      return !!revision && revision.documentId === entry.documentId && revision.identity === null
        && revision.raw === normalize(previous.record.rawText) && revision.title === previous.record.title && revision.createdAt === previous.record.updatedAt;
    });
  } catch { return false; }
}
