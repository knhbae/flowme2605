import {createTextAuthoringDocument} from './native-creator-vendor/text-authoring/parser';
import {createCreatorNativeSourceEnvelope} from './creator-native-source-update';
import {validateNativeCreatorDocumentOwner} from './native-creator-document';
import type {NativeCreatorDocumentOwner} from './native-creator-document-contract';
import type {AuthoringSourceItemMatch} from './native-creator-vendor/text-authoring/types';

/** Explicit local paste, not a fetch result or a claimed publisher revision. */
export function prepareProgramNativeSourceInput(owner:NativeCreatorDocumentOwner,input:{rawText:string;version:string;actorId:string},now:string){
  if(!validateNativeCreatorDocumentOwner(owner)||!input.rawText.trim()||input.rawText.length>100000||!input.version.trim()||input.version.length>200)return null;
  try{
    const envelope=createCreatorNativeSourceEnvelope(owner,{rawText:input.rawText,externalVersion:input.version.trim(),providedBy:input.actorId,
      sourceOwnerClaim:'local-user-provided-unverified',collectedAt:now,receivedAt:now});
    if(!envelope.ok)return null;
    const candidateDocument=createTextAuthoringDocument(input.rawText,{documentId:owner.document.documentId,ownership:'creator',
      sourceTitle:owner.document.sourceTitle,sourceUrl:owner.document.sourceUrl,sourceExternalVersion:input.version.trim(),now});
    return {owner:structuredClone(owner),envelope:envelope.value,candidateDocument};
  }catch{return null;}
}
export type ProgramNativeSourcePrepared=NonNullable<ReturnType<typeof prepareProgramNativeSourceInput>>;
/** Only exact entity identity or the user's explicit selection establishes a match. */
export function programNativeSourceMatches(prepared:ProgramNativeSourcePrepared,selection:Record<string,string>):AuthoringSourceItemMatch[]|null{
  const active=new Set(prepared.owner.document.parseResult.canonical.items.map(item=>item.itemId));
  const incoming=new Set(prepared.candidateDocument.parseResult.canonical.items.map(item=>item.itemId)),used=new Set<string>(),matches:AuthoringSourceItemMatch[]=[];
  for(const [activeItemId,incomingItemId] of Object.entries(selection)){
    if(!active.has(activeItemId))return null;
    if(!incomingItemId)continue;
    if(!incoming.has(incomingItemId)||used.has(incomingItemId))return null;
    used.add(incomingItemId);matches.push({activeItemId,incomingItemId,basis:activeItemId===incomingItemId?'stable_entity_id':'explicit'});
  }
  return matches;
}
export function programNativeSourceDefaultMatches(prepared:ProgramNativeSourcePrepared):Record<string,string>{
  const incoming=new Set(prepared.candidateDocument.parseResult.canonical.items.map(item=>item.itemId));
  return Object.fromEntries(prepared.owner.document.parseResult.canonical.items.map(item=>[item.itemId,incoming.has(item.itemId)?item.itemId:'']));
}
