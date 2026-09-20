import { isProgramCreatorDraftJson } from './creator-draft-provenance';
import { PROGRAM_CREATOR_HISTORY_DOCUMENT_LIMIT, TEXT_AUTHORING_HISTORY_KEY, type ProgramCreatorSavedRevision } from './creator-history-contract';

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && v.length <= 1200 && !['__proto__','constructor','prototype'].includes(v);
const instant = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const supportedDocument=(v:Record<string,unknown>)=>v.schemaVersion==='flowme-text-authoring-v1'||v.schemaVersion==='flowme-text-authoring-v2';
export type NativeCreatorHistoryRecord = { draftId: string; title: string; status: string; currentRaw: string; currentRevisionId: string; history: ProgramCreatorSavedRevision[] };
export type NativeCreatorHistoryRead = { kind: 'ready'; raw: string; records: NativeCreatorHistoryRecord[] } | { kind: 'empty'; raw: null } | { kind: 'corrupt'|'unsupported'|'unavailable'; raw: string|null };

/** Read-port snapshot of D2 storage.ts v1. No repository construction, normalization,
 * migration, recovery merge or writer: full historical documents remain opaque. */
export function decodeNativeCreatorHistory(raw: string|null): NativeCreatorHistoryRead {
  if (raw === null) return {kind:'empty',raw};
  try {
    if (raw.length > 10_000_000) return {kind:'unsupported',raw};
    const value: unknown = JSON.parse(raw);
    if (!object(value) || value.schemaVersion !== 1) return {kind:'unsupported',raw};
    if (!isProgramCreatorDraftJson(value) || !object(value.drafts) || !object(value.recoveries) || Object.keys(value.drafts).length > 200) return {kind:'corrupt',raw};
    const records: NativeCreatorHistoryRecord[] = [];
    for (const [draftId,record] of Object.entries(value.drafts)) {
      if (!object(record)) return {kind:'corrupt',raw};
      // A local personal/suggestion document is not a creator record.
      if (record.ownership !== 'creator') continue;
      if (!id(draftId) || record.draftId !== draftId || !id(record.title) || record.title.length>200 || /[\r\n]/u.test(record.title)
        || !['draft','needs_review','previewed','ready','archived'].includes(record.status as string) || !object(record.document)
        || !supportedDocument(record.document) || record.document.ownership !== 'creator' || !id(record.document.documentId) || typeof record.document.rawText !== 'string' || record.document.rawText.length>100000
        || !object(record.document.revision) || !id(record.revisionId) || record.document.revision.revisionId !== record.revisionId
        || !Array.isArray(record.history) || record.history.length>5) return {kind:'corrupt',raw};
      const history: ProgramCreatorSavedRevision[] = [], seen=new Set<string>();
      for (const entry of record.history) {
        if (!object(entry) || !id(entry.versionId) || seen.has(entry.versionId) || !id(entry.revisionId) || !instant(entry.savedAt)
          || !['saved','duplicated','archived','restored'].includes(entry.kind as string) || !object(entry.document)
          || !supportedDocument(entry.document) || entry.document.documentId !== record.document.documentId || entry.document.ownership !== 'creator'
          || typeof entry.document.rawText !== 'string' || entry.document.rawText.length>100000 || !object(entry.document.revision)
          || entry.document.revision.revisionId !== entry.revisionId) return {kind:'corrupt',raw};
        const documentJson=JSON.stringify(entry.document);
        if (documentJson.length>PROGRAM_CREATOR_HISTORY_DOCUMENT_LIMIT) return {kind:'unsupported',raw};
        seen.add(entry.versionId);
        history.push({id:`native:${draftId}:${entry.versionId}`,kind:'text-authoring-v1',savedAt:entry.savedAt,title:record.title,rawText:entry.document.rawText,
          origin:{storageKey:TEXT_AUTHORING_HISTORY_KEY,draftId,versionId:entry.versionId,revisionId:entry.revisionId,documentJson}});
      }
      records.push({draftId,title:record.title,status:record.status as string,currentRaw:record.document.rawText,currentRevisionId:record.revisionId,history});
    }
    return {kind:'ready',raw,records};
  } catch { return {kind:'corrupt',raw}; }
}
export function readNativeCreatorHistory(storage: Pick<Storage,'getItem'>): NativeCreatorHistoryRead {
  try { return decodeNativeCreatorHistory(storage.getItem(TEXT_AUTHORING_HISTORY_KEY)); } catch { return {kind:'unavailable',raw:null}; }
}

export function validNativeCreatorHistoryRevision(value: ProgramCreatorSavedRevision): boolean {
  if(value.kind !== 'text-authoring-v1')return false;
  try {
    const o=value.origin;
    if (!object(o) || Object.keys(o).sort().join(',') !== 'documentJson,draftId,revisionId,storageKey,versionId' || o.storageKey!==TEXT_AUTHORING_HISTORY_KEY
      || !id(o.draftId)||!id(o.versionId)||!id(o.revisionId)||typeof o.documentJson!=='string'||o.documentJson.length>PROGRAM_CREATOR_HISTORY_DOCUMENT_LIMIT)return false;
    const doc:unknown=JSON.parse(o.documentJson);
    return isProgramCreatorDraftJson(doc)&&object(doc)&&supportedDocument(doc)&&id(doc.documentId)&&doc.ownership==='creator'&&doc.rawText===value.rawText
      &&object(doc.revision)&&doc.revision.revisionId===o.revisionId;
  } catch{return false;}
}
