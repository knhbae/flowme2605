import { programClone, programId, type ProgramPrivateSpace } from './contract';
import { materializePersonalWorkspacePocAuthoring, type PersonalWorkspacePocAuthoringTemplateId } from '../personal-workspace-poc-authoring';
import { textWorkspaceModel as M, type TextLine } from './text-workspace';
import { creatorSourceSame, currentCreatorExecutionRevision } from './creator-execution-source';
import type { ProgramCreatorExecutionRevision, ProgramCreatorExecutionSource } from './creator-execution-contract';
import { moveProgramPersonalTaskText } from './task-document-move';
import { creatorSourceIdentity, validCreatorSourceIdentity, type ProgramCreatorSourceIdentity } from './creator-source-order';
import { applyProgramLinePermutation } from './line-permutation';

/** Only exact text and a single bounded replacement inherit native row identity.
 * Duplicate/ambiguous rewritten blocks get new identities, never title/index matches. */
export function reconcileCreatorSourceLines(previous: readonly TextLine[], raw: string): TextLine[] {
  const texts = raw.replace(/\r\n?/gu, '\n').split('\n');
  if (previous.map(l => l.text).join('\n') === texts.join('\n')) return programClone(previous) as TextLine[];
  const result = texts.map(text => ({ id: programId('creator-source-line'), text }));
  const used = new Set<string>();
  for (let i = 0; i < result.length; i++) {
    const matches = previous.filter(l => l.text === result[i].text);
    if (matches.length === 1 && texts.filter(t => t === result[i].text).length === 1) { result[i].id = matches[0].id; used.add(matches[0].id); }
  }
  const keepNonTask = (oldIndex:number,newIndex:number) => {
    const before=previous[oldIndex],after=result[newIndex];
    if (before && after && before.text===after.text && !/^\s*- \[[^\]]*\]/u.test(before.text) && !used.has(before.id)) { after.id=before.id;used.add(before.id); }
  };
  let prefix=0; while(prefix<previous.length && prefix<result.length && previous[prefix].text===result[prefix].text){keepNonTask(prefix,prefix);prefix++;}
  let suffix=0; while(previous.length-1-suffix>=prefix && result.length-1-suffix>=prefix && previous[previous.length-1-suffix].text===result[result.length-1-suffix].text){keepNonTask(previous.length-1-suffix,result.length-1-suffix);suffix++;}
  const oldMissing = previous.filter(l => !used.has(l.id)), newMissing = result.filter(l => !used.has(l.id));
  // A one-line edit between unchanged neighbours is an edit, not a positional remap.
  if (oldMissing.length === 1 && newMissing.length === 1) {
    const before = previous.indexOf(oldMissing[0]), after = result.indexOf(newMissing[0]);
    if ((previous[before-1]?.id ?? null) === (result[after-1]?.id ?? null) && (previous[before+1]?.id ?? null) === (result[after+1]?.id ?? null)) newMissing[0].id = oldMissing[0].id;
  }
  return result;
}

export function prepareProgramCreatorExecution(raw: string, draftId: string, recordRevision: number, now: string, templateId?: PersonalWorkspacePocAuthoringTemplateId, previous?: ProgramCreatorExecutionSource, identity?: ProgramCreatorSourceIdentity) {
  if (identity && !validCreatorSourceIdentity(identity, raw)) return null;
  const materialized = materializePersonalWorkspacePocAuthoring({ handoffId: `creator-handoff:${draftId}`, documentId: draftId, revisionId: `creator-revision:${recordRevision}`,
    rawText: raw, committedAt: now, ...(templateId ? { templateId } : {}) });
  if (!materialized.ok || materialized.parseResult.items.some(item => item.relativeDate && !item.resolvedDate)) return null;
  const prior = previous ? currentCreatorExecutionRevision(previous) : undefined;
  const sourceLines = identity ? programClone(identity.lines) : reconcileCreatorSourceLines(prior?.sourceLines ?? [], raw), output: { text: string; sourceLine: number | null; series: boolean }[] = [];
  const parsed = materialized.parseResult.items;
  for (let index = 0; index < sourceLines.length; index++) {
    const exact = parsed.find(item => item.sourceLine === index + 1);
    const item = [...parsed].reverse().find(item => item.sourceLine <= index + 1);
    // Bound a series block by the next Item or source section heading.
    const insideSeries = !!item?.recurrence && !sourceLines.slice(item.sourceLine, index + 1).some(line => /^\s*#{1,6}\s/u.test(line.text));
    let text = sourceLines[index].text;
    if (insideSeries && /^\s*- \[[ xX]\]/u.test(text)) text = text.replace(/- \[[ xX]\]\s*/u, exact ? '반복 규칙: ' : '세부 확인: ');
    else text = text.replace(/^(\s*- )\[[xX]\]/u, '$1[ ]');
    output.push({ text, sourceLine: index + 1, series: insideSeries });
    if (exact?.relativeDate && exact.resolvedDate && !exact.recurrence) output.push({ text: `  - 날짜: ${exact.resolvedDate}`, sourceLine: null, series: false });
  }
  return { materialized, sourceLines, output, raw: output.map(l => l.text).join('\n') };
}

/** One Program-private transaction; caller owns request/CAS/envelope validation. */
export function applyProgramCreatorExecutionHandoff(space: ProgramPrivateSpace, input: { draftId: string; recordRevision: number; title: string; raw: string; templateId?: PersonalWorkspacePocAuthoringTemplateId; sourceIdentity?: ProgramCreatorSourceIdentity }, now: string) {
  const workspace = space.creatorWorkspace!, previous = workspace.executionSources?.[input.draftId], priorLink = workspace.handoffs[input.draftId];
  const plan = prepareProgramCreatorExecution(input.raw, input.draftId, input.recordRevision, now, input.templateId, previous, input.sourceIdentity); if (!plan) return null;
  if (previous && currentCreatorExecutionRevision(previous).recordRevision === input.recordRevision) return { documentId: previous.documentId, changed: false };
  if (previous && previous.revisions.length >= 100) return null;
  let text = priorLink ? programClone(space.text) : M.addDocument(space.text, { title: input.title, folderId: 'folder-unfiled' });
  const documentId = priorLink?.documentId ?? text.documents.at(-1)!.id;
  const beforeDoc = M.getDocument(text, documentId); if (!beforeDoc) return null;
  // Retain old ordinary targets that no longer exist as ordinary source Items.
  // This is a private archived document, not a new source or an automatic new run.
  const currentRevision = previous ? currentCreatorExecutionRevision(previous) : null;
  const survivingNative = new Set(plan.sourceLines.map(l => l.id));
  const removed = currentRevision?.rows.filter(row => row.kind === 'ordinary' && (!survivingNative.has(row.sourceLineId)
    || plan.materialized.parseResult.items.some(item => plan.sourceLines[item.sourceLine - 1].id === row.sourceLineId && !!item.recurrence))) ?? [];
  if (removed.length) {
    let retainedId = space.retentionDocuments?.[documentId];
    if (!retainedId) { text = M.addDocument(text, { title: `${input.title} · 이전 제작 항목`, folderId: beforeDoc.folderId }); retainedId = text.documents.at(-1)!.id; }
    for (const row of removed) {
      const moved = moveProgramPersonalTaskText(text, row.documentLineId, retainedId); if (!moved) return null; text = moved;
    }
    space.retentionDocuments ??= {}; space.retentionDocuments[documentId] = retainedId;
    if (!space.archivedDocumentIds.includes(retainedId)) space.archivedDocumentIds.push(retainedId);
  }
  let edited;
  const isExplicitPermutation = !!input.sourceIdentity && !!currentRevision && plan.sourceLines.length===currentRevision.sourceLines.length
    && plan.sourceLines.every(line=>currentRevision.sourceLines.some(old=>old.id===line.id && old.text===line.text));
  if (isExplicitPermutation && currentRevision) {
    const priorPlan=prepareProgramCreatorExecution(currentRevision.raw,input.draftId,currentRevision.recordRevision,currentRevision.committedAt,currentRevision.flow.authoring.templateId as PersonalWorkspacePocAuthoringTemplateId | undefined,undefined,creatorSourceIdentity(currentRevision.raw,currentRevision.sourceLines));
    if(!priorPlan || priorPlan.raw!==M.raw(M.getDocument(text,documentId)))return null;
    const keys=(projection:typeof plan)=>{let sourceId='',extra=0;return projection.output.map(line=>{
      if(line.sourceLine!==null){sourceId=projection.sourceLines[line.sourceLine-1].id;extra=0;}else extra++;
      return JSON.stringify([sourceId,extra]);
    });};
    const oldKeys=keys(priorPlan),nextKeys=keys(plan),native=M.getDocument(text,documentId)!;
    const byKey=new Map(oldKeys.map((key,index)=>[key,native.lines[index].id]));
    const ids=nextKeys.map(key=>byKey.get(key));if(ids.some(id=>!id))return null;
    edited=applyProgramLinePermutation(text,documentId,ids as string[]);if(!edited)return null;
  } else edited = M.editText(text, documentId, plan.raw);
  if (M.raw(M.getDocument(edited, documentId)) !== plan.raw) return null;
  const doc = M.getDocument(edited, documentId)!;
  // Preserve personal native IDs; the immutable source/native map records their real assignment.
  const rows = plan.materialized.parseResult.items.map(item => {
    const sourceLineId = plan.sourceLines[item.sourceLine - 1].id, old = currentRevision?.rows.find(r => r.sourceLineId === sourceLineId);
    const index = plan.output.findIndex(line => line.sourceLine === item.sourceLine), line = doc.lines[index];
    return { rowId: old?.rowId ?? programId('creator-row'), sourceLineId, sourceLine: item.sourceLine,
      itemRef: plan.materialized.flow.authoring.sourceLineItemIdentityMap![String(item.sourceLine)].itemRef,
      documentLineId: line.id, kind: item.recurrence ? 'series' as const : 'ordinary' as const };
  });
  if (!creatorSourceSame(edited.progressRecords, space.text.progressRecords)) return null;
  const retainedTargets = [...edited.documents, ...edited.flows].flatMap(d => d.lines.map(l => l.id));
  if (M.tasks(space.text).some(task => task.docId === documentId && !retainedTargets.includes(task.id))) return null;
  doc.title = input.title;
  const revision: ProgramCreatorExecutionRevision = { id: programId('creator-source-revision'), recordRevision: input.recordRevision, committedAt: now, raw: input.raw,
    sourceLines: plan.sourceLines, flow: programClone(plan.materialized.flow), rows, protectedLineIds: plan.output.flatMap((line,index) => line.series ? [doc.lines[index].id] : []) };
  const owner: ProgramCreatorExecutionSource = { id: previous?.id ?? programId('creator-execution'), draftId: input.draftId, documentId, currentRevisionId: revision.id, revisions: [...(previous?.revisions ?? []), revision] };
  space.text = edited; workspace.executionSources ??= {}; workspace.executionSources[input.draftId] = owner;
  workspace.handoffs[input.draftId] = { documentId, recordRevision: input.recordRevision, raw: plan.raw, title: input.title };
  return { documentId, changed: true };
}
