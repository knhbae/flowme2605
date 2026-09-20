import {decodeLegacyCreatorRecoveries,LEGACY_CREATOR_RECOVERY_CONTRACT,type LegacyCreatorRecoveryCandidate} from './legacy-creator-recovery-codec';
import type {NativeCreatorRecoverySource} from './native-creator-document-contract';

/** Revalidate the complete retained entry and durable relationship. The temporary
 * wrapper is a decode envelope, not a generated document or saved identity. */
export function readNativeCreatorRecoverySource(source:unknown):LegacyCreatorRecoveryCandidate|null {
 try {
  if(!source||typeof source!=='object'||Array.isArray(source))return null;
  const value=source as Record<string,unknown>,keys=['kind','version','storageKey','draftId','recoveryId','revisionId','recoveredAt','documentJson','recoveryJson','durableRecordJson'];
  if(Object.keys(value).length!==keys.length||!keys.every(key=>Object.hasOwn(value,key))||value.kind!=='legacy-recovery'||value.version!==1||value.storageKey!=='flow:text-authoring:drafts:v1'
   ||typeof value.draftId!=='string'||typeof value.recoveryJson!=='string'||value.recoveryJson.length>LEGACY_CREATOR_RECOVERY_CONTRACT.wire||typeof value.documentJson!=='string'||value.documentJson.length>LEGACY_CREATOR_RECOVERY_CONTRACT.document
   ||value.durableRecordJson!==null&&(typeof value.durableRecordJson!=='string'||value.durableRecordJson.length>LEGACY_CREATOR_RECOVERY_CONTRACT.wire))return null;
  const key=JSON.stringify(value.draftId),wire=`{"schemaVersion":1,"drafts":{${value.durableRecordJson===null?'':`${key}:${value.durableRecordJson}`}},"recoveries":{${key}:${value.recoveryJson}}}`;
  const read=decodeLegacyCreatorRecoveries(wire);if(read.kind!=='ready'||read.issues.length||read.candidates.length!==1)return null;
  const candidate=read.candidates[0];
  if(candidate.recoveryId!==value.recoveryId||candidate.revisionId!==value.revisionId||candidate.recoveredAt!==value.recoveredAt||candidate.documentJson!==value.documentJson)return null;
  return candidate;
 }catch{return null;}
}
export function createNativeCreatorRecoverySource(candidate:LegacyCreatorRecoveryCandidate):NativeCreatorRecoverySource|null {
 const source:NativeCreatorRecoverySource={kind:'legacy-recovery',version:1,storageKey:candidate.storageKey,draftId:candidate.draftId,recoveryId:candidate.recoveryId,revisionId:candidate.revisionId,recoveredAt:candidate.recoveredAt,documentJson:candidate.documentJson,recoveryJson:candidate.recoveryJson,durableRecordJson:candidate.durableRecordJson};
 return readNativeCreatorRecoverySource(source)?source:null;
}
