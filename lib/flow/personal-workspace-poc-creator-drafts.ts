import {
  fingerprintPersonalWorkspacePocAuthoringSource,
  getPersonalWorkspacePocAuthoringTemplate,
  type PersonalWorkspacePocAuthoringTemplateId,
} from './personal-workspace-poc-authoring';
import { PERSONAL_WORKSPACE_POC_STORAGE_PREFIX } from './personal-workspace-poc-contract';

export const PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_VERSION = 1 as const;
export const PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY =
  `${PERSONAL_WORKSPACE_POC_STORAGE_PREFIX}creator-drafts`;

export type PersonalWorkspacePocCreatorDraftStatus = 'active' | 'archived';

export type PersonalWorkspacePocCreatorDraftRecord = Readonly<{
  draftId: string;
  owner: 'creator';
  title: string;
  rawText: string;
  templateId?: PersonalWorkspacePocAuthoringTemplateId;
  sourceFingerprint: string;
  status: PersonalWorkspacePocCreatorDraftStatus;
  recordRevision: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  clonedFrom?: Readonly<{
    draftId: string;
    recordRevision: number;
  }>;
}>;

export type PersonalWorkspacePocCreatorDraftLibrarySnapshot = Readonly<{
  revision: number;
  records: Readonly<Record<string, PersonalWorkspacePocCreatorDraftRecord>>;
  updatedAt: string;
}>;

export type PersonalWorkspacePocCreatorDraftLibrary =
  PersonalWorkspacePocCreatorDraftLibrarySnapshot & Readonly<{
    version: typeof PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_VERSION;
    undo?: Readonly<{
      label: string;
      snapshot: PersonalWorkspacePocCreatorDraftLibrarySnapshot;
    }>;
  }>;

type ExpectedRecordRevision = Readonly<{
  expectedRecordRevision: number;
}>;

export type PersonalWorkspacePocCreatorDraftAction =
  | Readonly<{
      type: 'save';
      expectedLibraryRevision: number;
      expectedRecordRevision?: number;
      draftId: string;
      title?: string;
      rawText: string;
      templateId?: PersonalWorkspacePocAuthoringTemplateId;
      sourceFingerprint: string;
      now: string;
    }>
  | (ExpectedRecordRevision & Readonly<{
      type: 'rename';
      expectedLibraryRevision: number;
      draftId: string;
      title: string;
      now: string;
    }>)
  | Readonly<{
      type: 'duplicate';
      expectedLibraryRevision: number;
      expectedSourceRecordRevision: number;
      sourceDraftId: string;
      newDraftId: string;
      now: string;
    }>
  | (ExpectedRecordRevision & Readonly<{
      type: 'archive' | 'restore';
      expectedLibraryRevision: number;
      draftId: string;
      now: string;
    }>)
  | Readonly<{
      type: 'undo';
      expectedLibraryRevision: number;
      now: string;
    }>
  | Readonly<{
      type: 'cancel';
      reason?: string;
    }>;

export type PersonalWorkspacePocCreatorDraftTransitionCode =
  | 'saved'
  | 'renamed'
  | 'duplicated'
  | 'archived'
  | 'restored'
  | 'undone'
  | 'no-op'
  | 'cancelled'
  | 'invalid-library'
  | 'invalid-action'
  | 'blank-source'
  | 'stale-library'
  | 'stale-record'
  | 'not-found'
  | 'already-exists'
  | 'record-archived'
  | 'nothing-to-undo';

export type PersonalWorkspacePocCreatorDraftTransitionResult = Readonly<{
  library: PersonalWorkspacePocCreatorDraftLibrary;
  changed: boolean;
  code: PersonalWorkspacePocCreatorDraftTransitionCode;
}>;

export type PersonalWorkspacePocCreatorDraftListOptions = Readonly<{
  query?: string;
  status?: PersonalWorkspacePocCreatorDraftStatus | 'all';
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const keys = Object.keys(value);
  return required.every((key) => keys.includes(key))
    && keys.every((key) => required.includes(key) || optional.includes(key));
}

function isCanonicalIsoInstant(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function isPersonalWorkspacePocCreatorDraftId(value: unknown): value is string {
  return typeof value === 'string'
    && /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/u.test(value);
}

function isCanonicalTitle(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 200
    && value === value.trim();
}

function isValidTemplateId(value: unknown): value is PersonalWorkspacePocAuthoringTemplateId {
  return typeof value === 'string'
    && getPersonalWorkspacePocAuthoringTemplate(value) !== null;
}

function isValidClonedFrom(value: unknown, ownDraftId: string): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, ['draftId', 'recordRevision'])) return false;
  return isPersonalWorkspacePocCreatorDraftId(value.draftId)
    && value.draftId !== ownDraftId
    && isPositiveInteger(value.recordRevision);
}

export function isPersonalWorkspacePocCreatorDraftRecord(
  value: unknown,
): value is PersonalWorkspacePocCreatorDraftRecord {
  if (!isRecord(value) || !hasOnlyKeys(
    value,
    [
      'draftId',
      'owner',
      'title',
      'rawText',
      'sourceFingerprint',
      'status',
      'recordRevision',
      'createdAt',
      'updatedAt',
    ],
    ['templateId', 'archivedAt', 'clonedFrom'],
  )) return false;

  if (
    !isPersonalWorkspacePocCreatorDraftId(value.draftId)
    || value.owner !== 'creator'
    || !isCanonicalTitle(value.title)
    || typeof value.rawText !== 'string'
    || !value.rawText.trim()
    || typeof value.sourceFingerprint !== 'string'
    || value.sourceFingerprint !== fingerprintPersonalWorkspacePocAuthoringSource(value.rawText)
    || (value.status !== 'active' && value.status !== 'archived')
    || !isPositiveInteger(value.recordRevision)
    || !isCanonicalIsoInstant(value.createdAt)
    || !isCanonicalIsoInstant(value.updatedAt)
    || value.createdAt > value.updatedAt
    || (value.templateId !== undefined && !isValidTemplateId(value.templateId))
    || (value.clonedFrom !== undefined && !isValidClonedFrom(value.clonedFrom, value.draftId))
  ) return false;

  if (value.status === 'active') return value.archivedAt === undefined;
  return isCanonicalIsoInstant(value.archivedAt) && value.archivedAt <= value.updatedAt;
}

function isPersonalWorkspacePocCreatorDraftLibrarySnapshot(
  value: unknown,
): value is PersonalWorkspacePocCreatorDraftLibrarySnapshot {
  if (!isRecord(value) || !hasOnlyKeys(value, ['revision', 'records', 'updatedAt'])) return false;
  if (
    !isNonNegativeInteger(value.revision)
    || !isRecord(value.records)
    || !isCanonicalIsoInstant(value.updatedAt)
  ) return false;

  const records = value.records;
  for (const [draftId, candidate] of Object.entries(records)) {
    if (
      !isPersonalWorkspacePocCreatorDraftRecord(candidate)
      || candidate.draftId !== draftId
      || candidate.updatedAt > value.updatedAt
    ) return false;
  }
  for (const candidate of Object.values(records)) {
    const validated = candidate as PersonalWorkspacePocCreatorDraftRecord;
    if (validated.clonedFrom && records[validated.clonedFrom.draftId] === undefined) return false;
  }
  return true;
}

export function isPersonalWorkspacePocCreatorDraftLibrary(
  value: unknown,
): value is PersonalWorkspacePocCreatorDraftLibrary {
  if (!isRecord(value) || !hasOnlyKeys(
    value,
    ['version', 'revision', 'records', 'updatedAt'],
    ['undo'],
  )) return false;
  if (
    value.version !== PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_VERSION
    || !isPersonalWorkspacePocCreatorDraftLibrarySnapshot({
      revision: value.revision,
      records: value.records,
      updatedAt: value.updatedAt,
    })
  ) return false;
  if (value.undo === undefined) return true;
  if (!isRecord(value.undo) || !hasOnlyKeys(value.undo, ['label', 'snapshot'])) return false;
  const snapshot = value.undo.snapshot;
  if (!isPersonalWorkspacePocCreatorDraftLibrarySnapshot(snapshot)) return false;
  return typeof value.undo.label === 'string'
    && Boolean(value.undo.label.trim())
    && snapshot.revision < (value.revision as number);
}

export function createPersonalWorkspacePocCreatorDraftLibrary(
  now: string,
): PersonalWorkspacePocCreatorDraftLibrary {
  if (!isCanonicalIsoInstant(now)) throw new TypeError('invalid-creator-draft-timestamp');
  return {
    version: PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_VERSION,
    revision: 0,
    records: {},
    updatedAt: now,
  };
}

export function derivePersonalWorkspacePocCreatorDraftTitle(rawText: string): string {
  const firstLine = rawText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return '제목 없는 Flow';
  const title = firstLine
    .replace(/^#{1,6}\s+/u, '')
    .replace(/^[-*+]\s+(?:\[[ xX]\]\s*)?/u, '')
    .trim() || '제목 없는 Flow';
  return title.length <= 80 ? title : `${title.slice(0, 79)}…`;
}

/**
 * Replaceable display projection only: it does not create a persisted source
 * owner or source-reference schema. The first valid http(s) URL is preserved
 * exactly as authored, apart from surrounding Markdown punctuation.
 */
export function derivePersonalWorkspacePocCreatorDraftSourceLabel(rawText: string): string {
  const candidates = rawText.match(/https?:\/\/[^\s<>"'`)\]}]+/giu) ?? [];
  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return candidate;
    } catch {
      // Continue to the next exact-text URL candidate.
    }
  }
  return '직접 작성한 원문';
}

function snapshotLibrary(
  library: PersonalWorkspacePocCreatorDraftLibrary,
): PersonalWorkspacePocCreatorDraftLibrarySnapshot {
  return {
    revision: library.revision,
    records: library.records,
    updatedAt: library.updatedAt,
  };
}

function unchanged(
  library: PersonalWorkspacePocCreatorDraftLibrary,
  code: PersonalWorkspacePocCreatorDraftTransitionCode,
): PersonalWorkspacePocCreatorDraftTransitionResult {
  return { library, changed: false, code };
}

function changed(
  before: PersonalWorkspacePocCreatorDraftLibrary,
  records: Readonly<Record<string, PersonalWorkspacePocCreatorDraftRecord>>,
  now: string,
  label: string,
  code: PersonalWorkspacePocCreatorDraftTransitionCode,
): PersonalWorkspacePocCreatorDraftTransitionResult {
  return {
    changed: true,
    code,
    library: {
      version: PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_VERSION,
      revision: before.revision + 1,
      records,
      updatedAt: now,
      undo: { label, snapshot: snapshotLibrary(before) },
    },
  };
}

function canonicalActionTitle(title: string | undefined, rawText: string): string | null {
  const candidate = title === undefined ? derivePersonalWorkspacePocCreatorDraftTitle(rawText) : title.trim();
  return isCanonicalTitle(candidate) ? candidate : null;
}

function isValidActionTime(now: unknown, library: PersonalWorkspacePocCreatorDraftLibrary): now is string {
  return isCanonicalIsoInstant(now) && now >= library.updatedAt;
}

function copyTitle(
  records: Readonly<Record<string, PersonalWorkspacePocCreatorDraftRecord>>,
  sourceTitle: string,
): string {
  const baseTitle = sourceTitle.replace(/^사본 \d+ · /u, '');
  const existingTitles = new Set(Object.values(records).map((record) => record.title));
  let ordinal = 1;
  while (true) {
    const prefix = `사본 ${ordinal} · `;
    const candidate = `${prefix}${baseTitle.slice(0, 200 - prefix.length)}`;
    if (!existingTitles.has(candidate)) return candidate;
    ordinal += 1;
  }
}

export function transitionPersonalWorkspacePocCreatorDraftLibrary(
  library: PersonalWorkspacePocCreatorDraftLibrary,
  action: PersonalWorkspacePocCreatorDraftAction,
): PersonalWorkspacePocCreatorDraftTransitionResult {
  if (!isPersonalWorkspacePocCreatorDraftLibrary(library)) {
    return unchanged(library, 'invalid-library');
  }
  if (action.type === 'cancel') return unchanged(library, 'cancelled');
  if (!isNonNegativeInteger(action.expectedLibraryRevision)) {
    return unchanged(library, 'invalid-action');
  }
  if (action.expectedLibraryRevision !== library.revision) {
    return unchanged(library, 'stale-library');
  }
  if (!isValidActionTime(action.now, library)) return unchanged(library, 'invalid-action');

  if (action.type === 'undo') {
    if (!library.undo) return unchanged(library, 'nothing-to-undo');
    return {
      changed: true,
      code: 'undone',
      library: {
        version: PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_VERSION,
        revision: library.revision + 1,
        records: library.undo.snapshot.records,
        updatedAt: action.now,
      },
    };
  }

  if (action.type === 'save') {
    if (
      !isPersonalWorkspacePocCreatorDraftId(action.draftId)
      || typeof action.rawText !== 'string'
      || (action.templateId !== undefined && !isValidTemplateId(action.templateId))
      || action.sourceFingerprint !== fingerprintPersonalWorkspacePocAuthoringSource(action.rawText)
    ) return unchanged(library, 'invalid-action');
    if (!action.rawText.trim()) return unchanged(library, 'blank-source');
    const title = canonicalActionTitle(action.title, action.rawText);
    if (!title) return unchanged(library, 'invalid-action');
    const current = library.records[action.draftId];
    if (current) {
      if (action.expectedRecordRevision !== current.recordRevision) {
        return unchanged(library, 'stale-record');
      }
      if (current.status === 'archived') return unchanged(library, 'record-archived');
      if (
        current.title === title
        && current.rawText === action.rawText
        && current.templateId === action.templateId
        && current.sourceFingerprint === action.sourceFingerprint
      ) return unchanged(library, 'no-op');
      const { templateId: _previousTemplateId, ...currentWithoutTemplate } = current;
      const nextRecord: PersonalWorkspacePocCreatorDraftRecord = {
        ...currentWithoutTemplate,
        title,
        rawText: action.rawText,
        ...(action.templateId === undefined ? {} : { templateId: action.templateId }),
        sourceFingerprint: action.sourceFingerprint,
        recordRevision: current.recordRevision + 1,
        updatedAt: action.now,
      };
      return changed(
        library,
        { ...library.records, [current.draftId]: nextRecord },
        action.now,
        `제작 초안 “${title}” 저장`,
        'saved',
      );
    }
    if (action.expectedRecordRevision !== undefined) return unchanged(library, 'stale-record');
    const nextRecord: PersonalWorkspacePocCreatorDraftRecord = {
      draftId: action.draftId,
      owner: 'creator',
      title,
      rawText: action.rawText,
      ...(action.templateId === undefined ? {} : { templateId: action.templateId }),
      sourceFingerprint: action.sourceFingerprint,
      status: 'active',
      recordRevision: 1,
      createdAt: action.now,
      updatedAt: action.now,
    };
    return changed(
      library,
      { ...library.records, [nextRecord.draftId]: nextRecord },
      action.now,
      `제작 초안 “${title}” 저장`,
      'saved',
    );
  }

  if (action.type === 'duplicate') {
    if (
      !isPersonalWorkspacePocCreatorDraftId(action.sourceDraftId)
      || !isPersonalWorkspacePocCreatorDraftId(action.newDraftId)
      || action.sourceDraftId === action.newDraftId
      || !isPositiveInteger(action.expectedSourceRecordRevision)
    ) return unchanged(library, 'invalid-action');
    const source = library.records[action.sourceDraftId];
    if (!source) return unchanged(library, 'not-found');
    if (source.recordRevision !== action.expectedSourceRecordRevision) {
      return unchanged(library, 'stale-record');
    }
    if (source.status === 'archived') return unchanged(library, 'record-archived');
    if (library.records[action.newDraftId]) return unchanged(library, 'already-exists');
    const duplicate: PersonalWorkspacePocCreatorDraftRecord = {
      draftId: action.newDraftId,
      owner: 'creator',
      title: copyTitle(library.records, source.title),
      rawText: source.rawText,
      ...(source.templateId === undefined ? {} : { templateId: source.templateId }),
      sourceFingerprint: source.sourceFingerprint,
      status: 'active',
      recordRevision: 1,
      createdAt: action.now,
      updatedAt: action.now,
      clonedFrom: {
        draftId: source.draftId,
        recordRevision: source.recordRevision,
      },
    };
    return changed(
      library,
      { ...library.records, [duplicate.draftId]: duplicate },
      action.now,
      `제작 초안 “${source.title}” 복제`,
      'duplicated',
    );
  }

  if (!isPersonalWorkspacePocCreatorDraftId(action.draftId)) {
    return unchanged(library, 'invalid-action');
  }
  const current = library.records[action.draftId];
  if (!current) return unchanged(library, 'not-found');
  if (!isPositiveInteger(action.expectedRecordRevision)) {
    return unchanged(library, 'invalid-action');
  }
  if (current.recordRevision !== action.expectedRecordRevision) {
    return unchanged(library, 'stale-record');
  }

  if (action.type === 'rename') {
    if (current.status === 'archived') return unchanged(library, 'record-archived');
    const title = action.title.trim();
    if (!isCanonicalTitle(title)) return unchanged(library, 'invalid-action');
    if (current.title === title) return unchanged(library, 'no-op');
    const renamed: PersonalWorkspacePocCreatorDraftRecord = {
      ...current,
      title,
      recordRevision: current.recordRevision + 1,
      updatedAt: action.now,
    };
    return changed(
      library,
      { ...library.records, [current.draftId]: renamed },
      action.now,
      `제작 초안 “${title}” 이름 변경`,
      'renamed',
    );
  }

  if (action.type === 'archive') {
    if (current.status === 'archived') return unchanged(library, 'no-op');
    const archived: PersonalWorkspacePocCreatorDraftRecord = {
      ...current,
      status: 'archived',
      archivedAt: action.now,
      recordRevision: current.recordRevision + 1,
      updatedAt: action.now,
    };
    return changed(
      library,
      { ...library.records, [current.draftId]: archived },
      action.now,
      `제작 초안 “${current.title}” 보관`,
      'archived',
    );
  }

  if (current.status === 'active') return unchanged(library, 'no-op');
  const { archivedAt: _archivedAt, ...restoredRecord } = current;
  const restored: PersonalWorkspacePocCreatorDraftRecord = {
    ...restoredRecord,
    status: 'active',
    recordRevision: current.recordRevision + 1,
    updatedAt: action.now,
  };
  return changed(
    library,
    { ...library.records, [current.draftId]: restored },
    action.now,
    `제작 초안 “${current.title}” 복원`,
    'restored',
  );
}

function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('ko').replace(/\s+/gu, ' ');
}

export function listPersonalWorkspacePocCreatorDrafts(
  library: PersonalWorkspacePocCreatorDraftLibrary,
  options: PersonalWorkspacePocCreatorDraftListOptions = {},
): readonly PersonalWorkspacePocCreatorDraftRecord[] {
  if (!isPersonalWorkspacePocCreatorDraftLibrary(library)) return [];
  const status = options.status ?? 'active';
  const query = normalizeSearchText(options.query ?? '');
  return Object.values(library.records)
    .filter((record) => status === 'all' || record.status === status)
    .filter((record) => {
      if (!query) return true;
      return normalizeSearchText(`${record.title}\n${record.rawText}`).includes(query);
    })
    .sort((left, right) => {
      if (left.updatedAt !== right.updatedAt) return left.updatedAt > right.updatedAt ? -1 : 1;
      if (left.draftId === right.draftId) return 0;
      return left.draftId < right.draftId ? -1 : 1;
    });
}
