import type {TextAuthoringDocument,AuthoringCorrectionOperation} from './native-creator-vendor/text-authoring/types';
import type {AuthoringArtifactProjection,BuildAuthoringArtifactProjectionOptions} from './native-creator-vendor/text-authoring/artifact-projection';
import type {AuthoringRecurrenceRule,AuthoringSourceUpdateCandidate,AuthoringSubcheck} from './native-creator-vendor/text-authoring/types';

/** Replaceable Program-only owner; not an original D2 storage schema. */
export const NATIVE_CREATOR_DOCUMENT_VERSION=1 as const;
export const NATIVE_CREATOR_DOCUMENT_JSON_LIMIT=2_000_000;
export const NATIVE_CREATOR_OWNER_JSON_LIMIT=16_000_000;
export const NATIVE_CREATOR_ACTION_LIMIT=128;
export type NativeCreatorDocumentSource={storageKey:'flow:text-authoring:drafts:v1';draftId:string;versionId:string;revisionId:string;documentJson:string};
/** Recovery is never a saved version. Full original recovery/optional durable
 * comparison are retained, while the outer revision names the working source. */
export type NativeCreatorRecoverySource={kind:'legacy-recovery';version:1;storageKey:'flow:text-authoring:drafts:v1';draftId:string;recoveryId:string;revisionId:string;recoveredAt:string;documentJson:string;recoveryJson:string;durableRecordJson:string|null};
export type NativeCreatorDocumentProvenance=NativeCreatorDocumentSource|NativeCreatorRecoverySource;
export const isNativeCreatorRecoverySource=(source:NativeCreatorDocumentProvenance):source is NativeCreatorRecoverySource=>'kind' in source&&source.kind==='legacy-recovery';
export const nativeCreatorSourceIdentity=(source:NativeCreatorDocumentProvenance)=>JSON.stringify([source.storageKey,source.draftId,isNativeCreatorRecoverySource(source)?'legacy-recovery':'saved-version',isNativeCreatorRecoverySource(source)?source.recoveryId:source.versionId]);
export const nativeCreatorSourcePreviewIdentity=(source:NativeCreatorDocumentProvenance):{sourceVersionId:string|null;sourceRecoveryId?:string}=>isNativeCreatorRecoverySource(source)?{sourceVersionId:null,sourceRecoveryId:source.recoveryId}:{sourceVersionId:source.versionId};
export type NativeCreatorRecordUi={activeStage?:'input'|'structure'|'result';focusTarget?:string;selectedItemId?:string;primaryArtifact?:'calendar'|'todo'|'sheet'|'memo'};
export type NativeCreatorSourceDecision={decisionVersion:1;changeId:string;decision:'keep_working'|'use_incoming'};
export type NativeCreatorEffectiveAbsences={version:1;entries:{itemId:string;field:'completion'|'schedule';sourceSnapshotId:string}[]};
export type NativeCreatorRecurrenceChange={kind:'changed';field:'recurrence';changeId:string;activeItemId:string;incomingItemId:string;oldSourceValue:AuthoringRecurrenceRule|null;userValue:AuthoringRecurrenceRule|null;incomingSourceValue:AuthoringRecurrenceRule|null;workingFingerprint:string;userOwner:'creator';state:'open'|'resolved';resolution?:'keep_user'|'use_incoming';actorLane?:'creator';decidedAt?:string};
export type NativeCreatorSourceRecurrences={version:1;sourceRules:{itemId:string;sourceSnapshotId:string;rule:AuthoringRecurrenceRule|null;workingRule?:AuthoringRecurrenceRule|null}[];pending?:{candidateSnapshotId:string;changes:NativeCreatorRecurrenceChange[]}};
export type NativeCreatorSubcheckChange={kind:'changed';field:'subchecks';changeId:string;activeItemId:string;incomingItemId:string;oldSourceValue:AuthoringSubcheck[]|null;userValue:AuthoringSubcheck[]|null;incomingSourceValue:AuthoringSubcheck[]|null;workingFingerprint:string;userOwner:'creator';state:'open'|'resolved';resolution?:'keep_user'|'use_incoming';actorLane?:'creator';decidedAt?:string};
export type NativeCreatorSourceSubchecks={version:1;sourceLists:{itemId:string;sourceSnapshotId:string;checks:AuthoringSubcheck[]|null}[];pending?:{candidateSnapshotId:string;changes:NativeCreatorSubcheckChange[]}};
export type NativeCreatorActionPayload={kind:'operation';operation:AuthoringCorrectionOperation}|{kind:'restore';source:NativeCreatorDocumentSource}|{kind:'ui';recordUi:NativeCreatorRecordUi}|({kind:'source-decision'}&NativeCreatorSourceDecision)|{kind:'source-apply';applyVersion:1|2}|{kind:'source-absence-upgrade';upgradeVersion:1}|{kind:'source-stage';stageVersion:1|2;candidate:AuthoringSourceUpdateCandidate};
export type NativeCreatorDocumentAction=NativeCreatorActionPayload&{requestId:string;at:string};
export type NativeCreatorDocumentOwner={
 version:typeof NATIVE_CREATOR_DOCUMENT_VERSION;id:string;revision:number;createdAt:string;updatedAt:string;
 /** Actual immutable saved/recovery snapshot. Saved-version restores stay in the journal. */
 source:NativeCreatorDocumentProvenance;initialRecordUi:NativeCreatorRecordUi;
 document:TextAuthoringDocument;recordUi:NativeCreatorRecordUi;actions:NativeCreatorDocumentAction[];
 /** Derived Program-only intent. Never inserted into the original native DTO. */
 effectiveAbsences?:NativeCreatorEffectiveAbsences;
 /** Exact source facts and explicit working choices, derived only by replay. */
 sourceRecurrences?:NativeCreatorSourceRecurrences;
 /** Full, genuine source check lists. No child identity is inferred from titles. */
 sourceSubchecks?:NativeCreatorSourceSubchecks;
};
export type NativeCreatorDocumentFailure='invalid'|'unsupported-codec'|'conflict'|'unsupported-operation'|'history-capacity'|'invalid-projection-options';
export type NativeCreatorDocumentResult={ok:true;owner:NativeCreatorDocumentOwner;changed:boolean}|{ok:false;reason:NativeCreatorDocumentFailure};
export type NativeCreatorDocumentRead={ok:true;document:TextAuthoringDocument;recordUi:NativeCreatorRecordUi;projection:AuthoringArtifactProjection}|{ok:false;reason:NativeCreatorDocumentFailure};
export type {TextAuthoringDocument,AuthoringCorrectionOperation,BuildAuthoringArtifactProjectionOptions};
