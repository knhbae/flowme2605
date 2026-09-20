import type {NativeCreatorDocumentOwner,NativeCreatorDocumentProvenance} from './native-creator-document-contract';
import type {AuthoringRecurrenceRule} from './native-creator-vendor/text-authoring/types';
import type {TextLine} from './text-workspace';
import type {ProgramNativeRawLineage} from './creator-native-lineage-contract';
export type ProgramNativeExecutionRow={itemId:string;sourceItemId?:string;sourceRowIds:string[];rowId:string;lineId:string;kind:'ordinary'|'series'|'note';lines:TextLine[]};
export type ProgramNativeExecutionRevision={id:string;recordRevision:number;contextRevision:number;committedAt:string;nativeDocument:NativeCreatorDocumentOwner;nativeSelection:NativeCreatorDocumentProvenance;anchor:string|null;rows:ProgramNativeExecutionRow[]};
/** Physical execution bindings are mutable selections, not rewritten source revisions. */
export type ProgramNativeExecutionSelection={revisionId:string;disposition:'active'|'retained'|'ignored';
 execution?:{lineId:string;lines:TextLine[]};dateRevisionId?:string;timeRevisionId?:string;childrenRevisionId?:string};
export type ProgramNativeExecutionOwner={version:1;id:string;draftId:string;documentId:string;currentRevisionId:string;revisions:ProgramNativeExecutionRevision[];selections:Record<string,ProgramNativeExecutionSelection>;rawLineage?:ProgramNativeRawLineage};
export type ProgramNativeExecutionSources=Record<string,ProgramNativeExecutionOwner>;
export type ProgramNativeOccurrenceOwner={kind:'native-creator';ownerId:string;rowId:string;itemId:string;rule:AuthoringRecurrenceRule};
export const programNativeExecutionRef=(ownerId:string)=>`program-native-execution:${encodeURIComponent(ownerId)}`;
export const programNativeItemRef=(ownerId:string,itemId:string)=>`${programNativeExecutionRef(ownerId)}:item:${encodeURIComponent(itemId)}`;
