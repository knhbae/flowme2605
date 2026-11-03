import { readNativeCreatorSourceDocument, validateNativeCreatorDocumentOwner } from './native-creator-document';
import {isNativeCreatorRecoverySource,isNativeCreatorCatalogContentSource,nativeCreatorSourceIdentity,type NativeCreatorDocumentOwner,type NativeCreatorDocumentProvenance} from './native-creator-document-contract';
import {stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';

/** Original saved identity, not a Program revision number. Same-document versions
 * can be selected even when the native owner correctly emits no operation. */
export function programCreatorNativeSelection(owner: NativeCreatorDocumentOwner, explicit?: NativeCreatorDocumentProvenance): NativeCreatorDocumentProvenance {
  if (explicit) return explicit;
  const restored = [...owner.actions].reverse().find(a => a.kind === 'restore');
  return restored?.kind === 'restore' ? restored.source : owner.source;
}
export function validateProgramCreatorNativeContext(owner: unknown, selection: unknown, draftId: string, rawText?: string): boolean {
  if (owner === undefined) return selection === undefined;
  if (!validateNativeCreatorDocumentOwner(owner) || owner.id !== draftId || rawText !== undefined && owner.document.rawText !== rawText) return false;
  if (selection === undefined) return true;
  const document = readNativeCreatorSourceDocument(selection);
  if (!document) return false;
  const s = selection as NativeCreatorDocumentProvenance;
  const known=[owner.source,...owner.actions.flatMap(action=>action.kind==='restore'?[action.source]:[])];
  if(known.some(source=>nativeCreatorSourceIdentity(source)===nativeCreatorSourceIdentity(s)&&source.documentJson!==s.documentJson))return false;
  // Recovery selection must be the actual immutable imported recovery, not a
  // freshly forged sibling or a saved version with the same string identifier.
  if((isNativeCreatorRecoverySource(s)||isNativeCreatorCatalogContentSource(s))&&!known.some(source=>stableAuthoringJson(source)===stableAuthoringJson(s)))return false;
  return s.storageKey === owner.source.storageKey && s.draftId === owner.source.draftId && document.documentId === owner.document.documentId;
}
