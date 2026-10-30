import type { TextWorkspaceState, TextLine, TextBinding } from './text-workspace';
import type { PersonalWorkspacePocCreatorDraftRecord } from '../personal-workspace-poc-creator-drafts';
import type { ProgramCreatorWorkspaceState } from './creator-workspace-contract';
import type { ProgramRecurrenceExecutionState } from './recurrence-state-contract';
import type { ProgramRecurrencePlans } from './program-recurrence-plan-state-contract';
import type { ProgramPublicRecurringScheduleV1, ProgramPublicationRecurrenceDraft } from './public-recurrence-contract';
import type { ProgramOrdinaryTiming, ProgramOrdinaryTimingDraft } from './public-ordinary-time';

/** Local simulation contracts, never operating FlowMe schemas or authentication. */
export const PROGRAM_PREFIX = 'flow:poc:personal-workspace:v1:program:';
export const PROGRAM_STATE_KEY = `${PROGRAM_PREFIX}state`;
export const PROGRAM_SCHEMA = 'flowme-integrated-product-poc/1' as const;
export const PROGRAM_LIMITS = Object.freeze({ history: 80, rawBytes: 30_000_000, mediaBytes: 2_000_000, bodyChars: 30_000, titleChars: 240, actors: 8, entries: 2000 });
/** Replaceable local retention limit; never truncate old choices to accept a new one. */
export const PROGRAM_COPY_SCHEDULE_RETENTION = Object.freeze({ version: 1 as const, entries: 200 });
export const PROGRAM_COPY_KIND_HANDOFF = Object.freeze({ version: 1 as const, entries: 200 });
export const PROGRAM_COPY_CHECK_RESOLUTION = Object.freeze({ version: 1 as const, entries: 200 });

export type ProgramActor = { id: string; name: string; simulated: true };
export type PublicSchedule = (({ kind: 'undated' } | { kind: 'fixed'; date: string } | { kind: 'relative'; days: number }) & { timing?: ProgramOrdinaryTiming }) | ProgramPublicRecurringScheduleV1;
export type PublicSubcheck = { id: string; title: string };
export type ProgramPublicItem = {
  id: string;
  title: string;
  description: string;
  completionCriteria: string;
  sourceUrl: string | null;
  schedule: PublicSchedule;
  subchecks: PublicSubcheck[];
};
export type ProgramSource = {
  kind: 'repository-source' | 'user-text' | 'simulated-example';
  label: string;
  url: string | null;
  checkedAt: string | null;
};
export type ProgramPublicVersion = {
  id: string;
  flowId: string;
  number: number;
  parentVersionId: string | null;
  title: string;
  summary: string;
  items: ProgramPublicItem[];
  source: ProgramSource;
  createdBy: string;
  createdAt: string;
};
export type ProgramPublicFlow = {
  id: string;
  ownerId: string;
  currentVersionId: string;
  category: string;
  situations: string[];
  derivedFrom: { flowId: string; versionId: string } | null;
  archived: boolean;
};
/** dataUrl is inline local imagery or an opaque flowme-media: registry reference. */
export type ProgramMedia = { id: string; dataUrl: string; alt: string; synthetic: boolean };
export type ProgramPost = {
  id: string;
  authorId: string;
  kind: 'experience' | 'question' | 'knowledge';
  title: string;
  body: string;
  topic: string;
  flowId: string | null;
  versionId: string | null;
  itemId: string | null;
  evidencePostIds: string[];
  media: ProgramMedia[];
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
};
export type ProgramReply = {
  id: string; postId: string; parentReplyId: string | null; authorId: string;
  body: string; createdAt: string; updatedAt: string; deleted: boolean;
};
export type ProgramReaction = { actorId: string; targetKind: 'post' | 'reply'; targetId: string };
export type ProgramItemPatch = Partial<Pick<ProgramPublicItem, 'title' | 'description' | 'completionCriteria' | 'schedule' | 'subchecks'>>;
export type ProgramProposal = {
  id: string; authorId: string; flowId: string; baseVersionId: string; itemId: string;
  reason: string; patch: ProgramItemPatch;
  status: 'submitted' | 'held' | 'rejected' | 'accepted';
  reviewNote: string; reviewedBy: string | null; resultVersionId: string | null;
  createdAt: string; updatedAt: string;
};
export type ProgramPublicRepository = {
  flows: ProgramPublicFlow[];
  versions: ProgramPublicVersion[];
  posts: ProgramPost[];
  replies: ProgramReply[];
  reactions: ProgramReaction[];
  proposals: ProgramProposal[];
};
export type ProgramCopyField = 'title' | 'description' | 'completionCriteria' | 'sourceUrl' | 'schedule' | 'subchecks';
export type ProgramCopy = {
  id: string; flowId: string; baseVersionId: string; documentId: string;
  itemLines: Record<string, string>;
  subcheckLines: Record<string, Record<string, string>>;
  inheritedDates: Record<string, string | null>;
  includedItemIds: string[];
  anchor: string | null;
  /** Explicit personal choices, separate from source schedule and execution records. */
  itemOverrides: Record<string, { title?: string; date?: string | null; included?: boolean }>;
  /** Partial adoption never advances the baseline of untouched fields. */
  appliedFields: Record<string, Partial<Record<ProgramCopyField, string>>>;
  /** Explicit reintroduced-check choices; private wording never changes public source facts. */
  checkResolutions?: { version: 1; entries: ProgramCopyCheckResolutionEntry[] };
  /** Two distinct private execution forms; inactive rows remain in the retention document. */
  kindHandoffs?: { version: 1; items: Record<string, { ordinary: ProgramCopyKindSlot; recurring: ProgramCopyKindSlot }>;
    entries: { id: string; itemId: string; fromVersionId: string; toVersionId: string; at: string; personalPlanOwnerIds: string[] }[] };
  /** Private versioned index; validated against the accepted public schedule, never a copied rule. */
  recurrence?: { version: 1; itemIds: string[];
    /** Explicit personal starts only for public schedules whose start is undated. */
    starts?: Record<string, string | null>;
    /** References share the canonical series; they never create another execution owner. */
    references?: { itemId: string; documentId: string; lineId: string }[];
    /** Explicit schedule cutovers preserve prior private choices, not duplicate public rules. */
    retainedChoices?: { version: 1; entries: ProgramCopyRetainedScheduleChoice[] } };
};
export type ProgramCopyRetainedScheduleChoice = { id: string; itemId: string; fromVersionId: string; toVersionId: string;
  previousStart: { present: boolean; date: string | null }; personalPlanOwnerIds: string[]; at: string };
export type ProgramCopyCheckChoice = 'keep-private' | 'accept-source';
export type ProgramCopyCheckResolutionEntry = { id: string; itemId: string; fromVersionId: string; toVersionId: string; at: string;
  decisions: { childId: string; lineId: string; previousTitle: string; incomingTitle: string; choice: ProgramCopyCheckChoice }[] };
export type ProgramCopyKindSlot = {
  lineId: string; subcheckLines: Record<string, string>; fieldVersions: Record<ProgramCopyField, string>;
  inheritedDate: string | null; dateChoice: { present: boolean; value: string | null }; startChoice: { present: boolean; value: string | null };
};
export type ProgramSavedBinding = {
  savedCopyId: string; flowId: string; flowRef: string; documentId: string;
  itemLines: Record<string, string>; sourceRevision: string;
};
export type ProgramWritingPosition = { documentId: string | null; lineId: string | null; start: number; end: number; scrollTop: number };
export type ProgramRevisionIdentity = { lines: TextLine[]; bindings: TextBinding[]; taskScopes: Record<string, string>; itemScopes: Record<string, string> };
export type ProgramDraftRevision = { id: string; documentId: string; title: string; raw: string; createdAt: string; identity?: ProgramRevisionIdentity | null };
export type ProgramCreatorDraftImport = {
  creatorDraftId: string; documentId: string; importedAt: string; undoRevisionId: string | null;
  source: {
    libraryRevision: number; libraryUpdatedAt: string; current: PersonalWorkspacePocCreatorDraftRecord;
    undo: null | { label: string; libraryRevision: number; libraryUpdatedAt: string; record: PersonalWorkspacePocCreatorDraftRecord };
  };
};
export type ProgramParticipationDraft = {
  id: string; kind: 'experience' | 'question' | 'knowledge' | 'reply';
  title: string; body: string; topic: string; postId: string | null;
  flowId: string | null; versionId: string | null; itemId: string | null;
  media: ProgramMedia[];
  parentReplyId: string | null;
  editTargetId: string | null;
  expectedUpdatedAt: string | null;
  expectedContent: string | null;
  requestId: string;
  evidencePostIds: string[];
  cursor: { start: number; end: number };
};
export type ProgramPublicationDraftRow = {
  rowId: string | null; origin: 'task' | 'note' | 'previous-public' | 'series'; itemId: string; selected: boolean;
  title: string; description: string; completionCriteria: string; sourceUrl: string;
  scheduleKind: 'undated' | 'fixed' | 'relative' | 'recurring'; scheduleValue: string;
  recurrence?: ProgramPublicationRecurrenceDraft;
  timing?: ProgramOrdinaryTimingDraft;
  seriesSource?: { version: 1; key: string; revisionId: string; fingerprint: string };
  subchecks: { id: string; title: string }[];
};
export type ProgramPublicationDraft = {
  id: string; documentId: string; requestId: string; flowId: string | null; expectedVersionId: string | null;
  sourceDocumentFingerprint: string; title: string; summary: string; category: string; situationsText: string;
  sourceKind: 'user-text' | 'simulated-example'; sourceLabel: string; sourceUrl: string;
  derivedFrom: { flowId: string; versionId: string } | null;
  rows: ProgramPublicationDraftRow[]; updatedAt: string;
};
export type ProgramPrivateSpace = {
  text: TextWorkspaceState;
  archivedDocumentIds: string[];
  /** Recoverable private deletion, preserving document/line IDs and all history. */
  documentTrash?: Record<string, { trashedAt: string; wasArchived: boolean }>;
  copies: ProgramCopy[];
  savedBindings: ProgramSavedBinding[];
  draftRevisions: ProgramDraftRevision[];
  participationDrafts: ProgramParticipationDraft[];
  publicationDrafts: ProgramPublicationDraft[];
  publications: { flowId: string; documentId: string | null; creatorDraftId: string | null;
    /** Private stable mapping, not exposed in a public item ID or public payload. */
    seriesBindings?: { version: 1; items: { key: string; itemId: string }[] } }[];
  position: ProgramWritingPosition;
  timelineOrders: Record<string, string[]>;
  /** Program-only v1 extension: explicit mixed task/occurrence execution order. */
  executionTimelineOrders?: Record<string, string[]>;
  legacySnapshot: { workspaceId: string; revision: number; raw: string } | null;
  legacyQuickItemLines: Record<string, string>;
  legacyTimelinePolicies: Record<string, 'auto' | 'included' | 'excluded'>;
  /** Optional v1 extension; older PoC payloads have no retained document yet. */
  retentionDocuments?: Record<string, string>;
  /** Explicit private import only; the creator library remains read-only. */
  creatorDraftImports?: ProgramCreatorDraftImport[];
  /** Optional Program-owned authoring; never writes back to the imported library. */
  creatorWorkspace?: ProgramCreatorWorkspaceState;
  /** Private immutable source collection; no execution state or public grant. */
  catalogLibrary?: import('./catalog-library').CatalogLibrarySnapshot;
  /** Private reviewer input; only an explicit decision exposes its note. */
  proposalReviewDrafts?: Record<string, { note: string; expectedProposalToken: string }>;
  recurrenceExecution?: ProgramRecurrenceExecutionState;
  recurrencePlans?: ProgramRecurrencePlans;
};
export type ProgramRequestReceipt = { id: string; actorId: string; fingerprint: string; resultId: string; kind: string };
export type ProgramData = {
  /** Ephemeral Alpha adapter marker; the local PoC envelope never persists it. */
  projection?: 'alpha-social-v1';
  actors: ProgramActor[];
  activeActorId: string;
  spaces: Record<string, ProgramPrivateSpace>;
  public: ProgramPublicRepository;
  receipts: ProgramRequestReceipt[];
};
export type ProgramHistory = { label: string; groupId: string | null; workspace: ProgramPrivateSpace };
export type ProgramEnvelope = {
  schema: typeof PROGRAM_SCHEMA;
  revision: number;
  data: ProgramData;
  undo: Record<string, ProgramHistory[]>;
};
export type ProgramFailure = 'invalid' | 'missing' | 'forbidden' | 'conflict' | 'duplicate-request' | 'limit' | 'unresolved';
export type ProgramTransition<T = string> =
  | { ok: true; data: ProgramData; changed: boolean; result: T }
  | { ok: false; data: ProgramData; reason: ProgramFailure };

export function programId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}
export function programClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function programFailure<T = string>(data: ProgramData, reason: ProgramFailure): ProgramTransition<T> {
  return { ok: false, data, reason };
}
export function programResult<T>(before: ProgramData, next: ProgramData, result: T): ProgramTransition<T> {
  const changed = JSON.stringify(before) !== JSON.stringify(next);
  return { ok: true, data: changed ? next : before, changed, result };
}
