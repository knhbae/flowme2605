import { materializePersonalWorkspacePocAuthoring, type PersonalWorkspacePocAuthoringTemplateId } from '../personal-workspace-poc-authoring';
import type { ProgramCreatorExecutionSources, ProgramCreatorExecutionRevision } from './creator-execution-contract';
import { isProgramCreatorDraftJson } from './creator-draft-provenance';
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 1200 && !['__proto__','constructor','prototype'].includes(v);
const shape = (v: Record<string, unknown>, keys: string) => Object.keys(v).sort().join(',') === keys.split(',').sort().join(',');
function canonical(v: unknown): unknown { return Array.isArray(v) ? v.map(canonical) : obj(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v; }
export const creatorSourceSame = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export const currentCreatorExecutionRevision = (source: { currentRevisionId: string; revisions: ProgramCreatorExecutionRevision[] }) => source.revisions.find(r => r.id === source.currentRevisionId)!;
/** Pure validator: no ProgramData, storage or fabricated legacy payload. */
export function validateProgramCreatorExecutionSources(value: unknown, space: { text: { documents: readonly { id: string; lines?: readonly { id: string }[] }[]; flows: readonly { id: string; lines?: readonly { id: string }[] }[] } }, records: Record<string, { recordRevision: number }>): value is ProgramCreatorExecutionSources {
  try {
    if (!isProgramCreatorDraftJson(value) || !obj(value) || Object.keys(value).length > 200 || JSON.stringify(value).length > 10000000) return false;
    const owners = new Set<string>(), documentIds = new Set<string>(), currentLines = new Set<string>();
    for (const [draftId, source] of Object.entries(value)) {
      if (!obj(source) || !shape(Object.fromEntries(Object.entries(source).filter(([key])=>key!=='adoption')), 'id,draftId,documentId,currentRevisionId,revisions') || !id(source.id) || owners.has(source.id) || source.draftId !== draftId || !records[draftId]
        || !id(source.documentId) || !Array.isArray(source.revisions) || !source.revisions.length || source.revisions.length > 100 || !id(source.currentRevisionId)) return false;
      if (documentIds.has(source.documentId)) return false;
      owners.add(source.id); documentIds.add(source.documentId);
      const doc = [...space.text.documents, ...space.text.flows].find(d => d.id === source.documentId); if (!doc) return false;
      const revisions = new Set<string>(), rowOwners = new Map<string,string>(), nativeOwners = new Map<string,string>(); let prior = 0;
      for (const rev of source.revisions) {
        if (!obj(rev) || !shape(rev, 'id,recordRevision,committedAt,raw,sourceLines,flow,rows,protectedLineIds') || !id(rev.id) || revisions.has(rev.id)
          || !Number.isSafeInteger(rev.recordRevision) || (rev.recordRevision as number) <= prior || (rev.recordRevision as number) > records[draftId].recordRevision
          || typeof rev.raw !== 'string' || rev.raw.length > 100000 || typeof rev.committedAt !== 'string' || new Date(rev.committedAt).toISOString() !== rev.committedAt
          || !Array.isArray(rev.sourceLines) || !Array.isArray(rev.rows) || !obj(rev.flow) || !Array.isArray(rev.protectedLineIds)
          || rev.protectedLineIds.some(value => !id(value)) || new Set(rev.protectedLineIds).size !== rev.protectedLineIds.length) return false;
        revisions.add(rev.id); prior = rev.recordRevision as number;
        if (rev.sourceLines.some(line => !obj(line) || !shape(line, 'id,text') || !id(line.id) || typeof line.text !== 'string' || /[\r\n]/u.test(line.text))
          || new Set(rev.sourceLines.map(line => line.id)).size !== rev.sourceLines.length || rev.sourceLines.map(line => line.text).join('\n') !== rev.raw.replace(/\r\n?/gu, '\n')) return false;
        const templateId = obj(rev.flow.authoring) ? rev.flow.authoring.templateId : undefined;
        if (templateId !== undefined && typeof templateId !== 'string') return false;
        const materialized = materializePersonalWorkspacePocAuthoring({ handoffId: `creator-handoff:${draftId}`, documentId: draftId, revisionId: `creator-revision:${rev.recordRevision}`, rawText: rev.raw, committedAt: rev.committedAt,
          ...(templateId ? { templateId: templateId as PersonalWorkspacePocAuthoringTemplateId } : {}) });
        if (!materialized.ok || !creatorSourceSame(materialized.flow, rev.flow) || rev.rows.length !== materialized.flow.items.length) return false;
        const sourceLines = rev.sourceLines, protectedLineIds = rev.protectedLineIds;
        const rowIds = new Set<string>(), refs = new Set<string>();
        for (const row of rev.rows) {
          if (!obj(row) || !shape(row, 'rowId,sourceLineId,sourceLine,itemRef,documentLineId,kind') || !id(row.rowId) || rowIds.has(row.rowId) || !id(row.sourceLineId) || !id(row.documentLineId)
            || !Number.isSafeInteger(row.sourceLine) || !id(row.itemRef) || refs.has(row.itemRef)) return false;
          const parsed = materialized.parseResult.items.find(item => item.sourceLine === row.sourceLine);
          if (!parsed || rev.sourceLines[(row.sourceLine as number) - 1]?.id !== row.sourceLineId || materialized.flow.authoring.sourceLineItemIdentityMap?.[String(row.sourceLine)]?.itemRef !== row.itemRef
            || row.kind !== (parsed.recurrence ? 'series' : 'ordinary')) return false;
          // Ordinary personal blocks may move to another private document; their
          // canonical native ID remains the binding. Series metadata stays in its owner document.
          if (!source.adoption && rev.id === source.currentRevisionId && doc.lines && !(row.kind === 'series' ? [doc] : [...space.text.documents,...space.text.flows]).some(d => d.lines?.some(line => line.id === row.documentLineId))) return false;
          if (!source.adoption && rev.id === source.currentRevisionId) { if (currentLines.has(row.documentLineId)) return false; currentLines.add(row.documentLineId); }
          if (rowOwners.has(row.rowId) && rowOwners.get(row.rowId) !== row.sourceLineId || nativeOwners.has(row.sourceLineId) && nativeOwners.get(row.sourceLineId) !== row.rowId) return false;
          rowOwners.set(row.rowId,row.sourceLineId); nativeOwners.set(row.sourceLineId,row.rowId);
          if (row.kind === 'series' && !rev.protectedLineIds.includes(row.documentLineId)) return false;
          rowIds.add(row.rowId); refs.add(row.itemRef);
        }
        const expectedProtected = sourceLines.flatMap((line,index) => {
          const item = [...materialized.parseResult.items].reverse().find(item => item.sourceLine <= index + 1);
          if (!item?.recurrence || sourceLines.slice(item.sourceLine,index+1).some(row => /^\s*#{1,6}\s/u.test(row.text))) return [];
          return [line.text.replace(/- \[[ xX]\]\s*/u, item.sourceLine === index+1 ? '반복 규칙: ' : '세부 확인: ')];
        });
        if (rev.protectedLineIds.length !== expectedProtected.length) return false;
        if (!source.adoption && rev.id === source.currentRevisionId && doc.lines) {
          const withText = doc.lines as readonly { id: string; text?: string }[];
          const selected = withText.filter(line => protectedLineIds.includes(line.id));
          if (selected.length !== expectedProtected.length || selected.some(line => line.text !== undefined) && !creatorSourceSame(selected.map(line => line.text),expectedProtected)) return false;
        }
      }
      if (!revisions.has(source.currentRevisionId) || source.revisions.at(-1)!.id !== source.currentRevisionId) return false;
      if(source.adoption !== undefined){
        const adoption=source.adoption;
        if(!obj(adoption)||!shape(adoption,'version,selections')||adoption.version!==1||!obj(adoption.selections))return false;
        const allRows=new Set(source.revisions.flatMap(rev=>(rev as unknown as ProgramCreatorExecutionRevision).rows.map(row=>row.rowId)));
        if(Object.keys(adoption.selections).length!==allRows.size)return false;
        for(const[rowId,choice]of Object.entries(adoption.selections)){
          if(!allRows.has(rowId)||!obj(choice)||!shape(choice,'revisionId,disposition')||!['active','retained','ignored'].includes(String(choice.disposition)))return false;
          const revision=(source.revisions as unknown as ProgramCreatorExecutionRevision[]).find(rev=>rev.id===choice.revisionId),row=revision?.rows.find(row=>row.rowId===rowId);
          if(!revision||!row)return false;
          if(choice.disposition==='ignored')continue;
          const target=[...space.text.documents,...space.text.flows].find(d=>d.lines?.some(line=>line.id===row.documentLineId));
          if(!target && doc.lines)return false;
          if(currentLines.has(row.documentLineId))return false;currentLines.add(row.documentLineId);
          if(choice.disposition==='active'&&row.kind==='series'&&target?.id!==source.documentId)return false;
          if(row.kind==='series'&&target?.lines){
            const first=revision.protectedLineIds.indexOf(row.documentLineId),next=revision.rows.filter(r=>r.kind==='series'&&r.sourceLine>row.sourceLine).sort((a,b)=>a.sourceLine-b.sourceLine)[0];
            const protectedIds=revision.protectedLineIds.slice(first,next?revision.protectedLineIds.indexOf(next.documentLineId):undefined);
            const end=revision.sourceLines.findIndex((line,index)=>index>=row.sourceLine&&(/^- \[[ xX]\]/u.test(line.text)||/^\s*#{1,6}\s/u.test(line.text)));
            const expected=revision.sourceLines.slice(row.sourceLine-1,end<0?undefined:end).map((line,index)=>line.text.replace(/- \[[ xX]\]\s*/u,index===0?'반복 규칙: ':'세부 확인: '));
            const actual=(target.lines as readonly {id:string;text?:string}[]).filter(l=>protectedIds.includes(l.id));
            if(actual.length!==expected.length||actual.some(l=>l.text!==undefined)&&!creatorSourceSame(actual.map(l=>l.text),expected))return false;
          }
        }
      }
    }
    return true;
  } catch { return false; }
}
