import type {NativeCreatorDocumentOwner,TextAuthoringDocument,BuildAuthoringArtifactProjectionOptions,NativeCreatorRecurrenceChange,NativeCreatorSubcheckChange} from './native-creator-document-contract';
import type {AuthoringSourceItemMatch,AuthoringSourceUpdateChange} from './native-creator-vendor/text-authoring/types';

export const CREATOR_NATIVE_SOURCE_SESSION_VERSION=1 as const;
export const CREATOR_NATIVE_SOURCE_SESSION_LIMIT=40_000_000;
export const CREATOR_NATIVE_SOURCE_EVENT_LIMIT=512;
export type ProgramNativeSourceChange=AuthoringSourceUpdateChange|NativeCreatorRecurrenceChange|NativeCreatorSubcheckChange;
export type CreatorNativeSourceEnvelope={
 envelopeVersion:1;adapter:'LOCAL_SYNTHETIC_HOST_ADAPTER';collectorKind:'local_synthetic';
 eventId:string;candidateId:string;contentId:string;sourceId:string;externalVersion:string;baseSnapshotId:string;baseWorkingRevisionId:string;
 rawText:string;rawByteLength:number;rawByteHash:string;contentHash:string;mediaType:'text/plain'|'text/markdown';charset:'utf-8';
 collectedAt:string;receivedAt:string;providedBy:string;sourceOwnerClaim:string;idempotencyKey:string;
};
/** A fresh host assertion, never persisted as permission. */
export type CreatorNativeSourceAuthority={actorId:string;draftId:string;lane:'creator'|'personal'|'suggestion';permission:boolean;archived:boolean};
export type CreatorNativeSourceDecision='keep_working'|'use_incoming'|'later';
export type CreatorNativeSourceReceipt={
 receiptVersion:1;receiptId:string;sessionId:string;candidateId:string;eventId:string;idempotencyKey:string;
 baseSnapshotId:string;appliedCandidateSnapshotId:string;baseWorkingRevisionId:string;resultWorkingRevisionId:string;
 baseOwnerHash:string;resultOwnerHash:string;resultCanonicalHash:string;resultProjectionHash:string;
 decisionSetHash:string;projectionOptions:BuildAuthoringArtifactProjectionOptions;projectionOptionsHash:string;appliedAt:string;
 sideEffects:{publish:0;network:0;operatingWrite:0;privateExecutionWrite:0};
};
export type CreatorNativeSourceEvent=({kind:'decision';changeId:string;decision:CreatorNativeSourceDecision}|{kind:'focus';selectedChangeId:string|null;scrollTop:number}|{kind:'defer'}|{kind:'reject'}|{kind:'apply';receipt:CreatorNativeSourceReceipt;applyVersion?:2}|{kind:'undo'})&{requestId:string;at:string};
/** Versioned Program-only state. Absent owner never causes automatic migration. */
export type CreatorNativeSourceSession={
 version:1|2;sessionId:string;actorId:string;draftId:string;revision:number;createdAt:string;
 /** Explicit import binding. Historical actor, IDs and event receipts stay unchanged. */
 ownerMapping?:{version:1;targetActorId:string;sourceRevision:number;sourceHash:string};
 authorityConstraint:'creator_required'|'denied';baseOwner:NativeCreatorDocumentOwner;
 envelope:CreatorNativeSourceEnvelope;candidateDocument:TextAuthoringDocument;matches:AuthoringSourceItemMatch[];
 projectionOptions:BuildAuthoringArtifactProjectionOptions;events:CreatorNativeSourceEvent[];
};
export type CreatorNativeSourceView={
 status:'comparing'|'conflict'|'deferred'|'rejected'|'undo-available'|'reverted'|'stale-candidate';creatorCanApply:boolean;
 changes:ProgramNativeSourceChange[];decisions:{changeId:string;decision:CreatorNativeSourceDecision;at:string}[];
 selectedChangeId:string|null;scrollTop:number;unresolvedCount:number;
 comparison:{baseRawText:string|null;workingRawText:string;candidateRawText:string};receipt?:CreatorNativeSourceReceipt;
 workingAbsences:{changeId:string;itemId:string;field:'completion'|'schedule';effectiveValue:null}[];
 stagedOwner:NativeCreatorDocumentOwner;resultOwner:NativeCreatorDocumentOwner;
};
export type CreatorNativeSourceFailure='invalid'|'invalid-envelope'|'invalid-candidate'|'forbidden'|'conflict'|'stale-candidate'|'unresolved'|'terminal-session'|'no-new-source'|'history-capacity'|'document-capacity'|'injected-failure'|'explicit-absence-upgrade-required';
export type CreatorNativeSourceResult<T>={ok:true;value:T}|{ok:false;reason:CreatorNativeSourceFailure};
export type CreatorNativeSourceMutation={session:CreatorNativeSourceSession;owner:NativeCreatorDocumentOwner;changed:boolean;ownerChanged:boolean;replayed:boolean};
