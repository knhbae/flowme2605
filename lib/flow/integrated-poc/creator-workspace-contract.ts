import type { PersonalWorkspacePocCreatorDraftLibrary, PersonalWorkspacePocCreatorDraftRecord } from '../personal-workspace-poc-creator-drafts';
import type { PersonalWorkspacePocAuthoringTemplateId } from '../personal-workspace-poc-authoring';
import type { ProgramCreatorExecutionSources } from './creator-execution-contract';
import type { ProgramCreatorSourceIdentity } from './creator-source-order';
import type { ProgramCreatorSavedHistory, ProgramCreatorSavedContext } from './creator-history-contract';
import type { ProgramCreatorStructureSidecar } from './creator-structure-sidecar';
import type { NativeCreatorDocumentOwner, NativeCreatorDocumentProvenance } from './native-creator-document-contract';
import type {ProgramNativeExecutionSources} from './creator-native-execution-contract';
import type {CreatorNativeSourceSession} from './creator-native-source-update-contract';

/** Mutable Program-owned authoring is distinct from immutable imported provenance,
 * public publication bindings, and personal execution documents. */
export type ProgramCreatorWorking = {
  draftId: string; rawText: string; title: string;
  templateId?: PersonalWorkspacePocAuthoringTemplateId;
  baseRecordRevision: number | null;
  sourceIdentity?: ProgramCreatorSourceIdentity;
  structure?: ProgramCreatorStructureSidecar;
  /** Selected full native document/context. Original saved IDs stay inside source. */
  nativeDocument?: NativeCreatorDocumentOwner;
  nativeSelection?: NativeCreatorDocumentProvenance;
  /** Unsynchronized input recovery; never a saved canonical document. */
  nativePendingRawText?: string;
};
export type ProgramCreatorWorkspaceState = {
  version: 1;
  library: PersonalWorkspacePocCreatorDraftLibrary;
  origins: Record<string, { creatorDraftId: string; libraryRevision: number;
    current: PersonalWorkspacePocCreatorDraftRecord; undo: PersonalWorkspacePocCreatorDraftRecord | null }>;
  /** Last explicit source handoff baseline. Never the latest personal raw. */
  handoffs: Record<string, { documentId: string; recordRevision: number; raw: string; title: string }>;
  working: ProgramCreatorWorking | null;
  executionSources?: ProgramCreatorExecutionSources;
  nativeExecutionSources?: ProgramNativeExecutionSources;
  /** Private candidate decisions; never a published source or implicit saved draft. */
  sourceUpdateSessions?: Record<string, {version:1;session:CreatorNativeSourceSession;baseSourceIdentity:ProgramCreatorSourceIdentity|null}>;
  /** Current saved draft identities. Whole-Program history owns previous versions. */
  sourceIdentities?: Record<string, { recordRevision: number; identity: ProgramCreatorSourceIdentity }>;
  savedHistory?: ProgramCreatorSavedHistory;
  /** Explicit saves only; unfinished/blank forms live solely in working.structure. */
  structureDrafts?: Record<string, ProgramCreatorSavedContext>;
};
