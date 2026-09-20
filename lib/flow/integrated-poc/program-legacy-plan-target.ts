import type { ProgramPrivateSpace } from './contract';
import { programSame } from './controller';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { programLegacyPlanItemIncluded, type ProgramLegacyPlanSelections } from './program-legacy-plan-contract';
import { programLegacyMapMembershipChildRetained, type ProgramLegacyMapMembershipStore } from './legacy-map-membership-state';
function membership(space: Pick<ProgramPrivateSpace,'legacySnapshot'>): ProgramLegacyMapMembershipStore | undefined {
  try { return space.legacySnapshot ? JSON.parse(space.legacySnapshot.raw).mapMembership : undefined; } catch { return undefined; }
}
export function programLegacyPlanSelections(space: Pick<ProgramPrivateSpace,'legacySnapshot'>): ProgramLegacyPlanSelections | undefined {
  try { return space.legacySnapshot ? JSON.parse(space.legacySnapshot.raw).planSelections : undefined; } catch { return undefined; }
}
export function programLegacyPlanSourceIncluded(space: Pick<ProgramPrivateSpace,'legacySnapshot'>, flowRef: string, itemRef: string): boolean {
  return !programLegacyMapMembershipChildRetained(membership(space),flowRef)
    && programLegacyPlanItemIncluded(programLegacyPlanSelections(space)?.flows[flowRef], itemRef);
}
export function programLegacyPlanExcludedTargets(space: ProgramPrivateSpace): Set<string> {
  const selections = programLegacyPlanSelections(space), mapMembership = membership(space), roots = new Set<string>();
  if (!selections && !mapMembership) return roots;
  for (const binding of space.savedBindings) for (const [ref,lineId] of Object.entries(binding.itemLines)) {
    if (programLegacyMapMembershipChildRetained(mapMembership,binding.flowRef)
      || !programLegacyPlanItemIncluded(selections?.flows[binding.flowRef],ref)) roots.add(lineId);
  }
  const ids = new Set(roots);
  for (const doc of [...space.text.documents,...space.text.flows]) for (const row of M.rowMeta(space.text,doc.id)) {
    if (roots.has(row.progressTargetId ?? '') || row.ancestorItemIds?.some(id=>roots.has(id))) ids.add(row.id);
  }
  return ids;
}
export function programLegacyPlanTaskExcluded(space: ProgramPrivateSpace, taskId: string): boolean { return programLegacyPlanExcludedTargets(space).has(taskId); }
/** Keep excluded source blocks and execution records readable, but not writable through a reference checkbox. */
export function programPreservesLegacyPlanExcluded(space: ProgramPrivateSpace, next: TextWorkspaceState): boolean {
  const ids = programLegacyPlanExcludedTargets(space);
  if (!ids.size) return true;
  const facts = (text: TextWorkspaceState) => {
    const protectedIds = new Set(ids);
    for (const doc of [...text.documents,...text.flows]) {
      for (const row of M.rowMeta(text,doc.id)) if (row.ancestorItemIds?.some(id=>protectedIds.has(id))) protectedIds.add(row.id);
      for (const row of M.parseDocument(doc,text).rows) if (protectedIds.has(row.taskId ?? '') || protectedIds.has(row.parentLineId ?? '')) protectedIds.add(row.id);
    }
    return {
      lines: [...text.documents,...text.flows].flatMap(doc => doc.lines.filter(line=>protectedIds.has(line.id)).map(line=>({docId:doc.id,...line}))),
      tasks: M.tasks(text).filter(task=>protectedIds.has(task.id)).map(task=>({ id:task.id,date:task.date,done:task.done,title:task.title,note:task.note,time:task.time })),
      records: text.progressRecords.filter(record=>protectedIds.has(record.taskId)) };
  };
  return programSame(facts(space.text),facts(next));
}
