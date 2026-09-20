import type {NativeCreatorDocumentOwner} from './native-creator-document-contract';
import type {ProgramNativeExecutionRevision,ProgramNativeExecutionRow} from './creator-native-execution-contract';

/** Execution lineage and genuine native source identity are separate. Older
 * rows have the same ID in both roles and need no migration. */
export const programNativeSourceItemId=(row:Pick<ProgramNativeExecutionRow,'itemId'|'sourceItemId'>)=>row.sourceItemId??row.itemId;

/** Inputs are replay-validated native owners. Only completed native source
 * updates supply cross-ID edges; a staged/rejected candidate or a matching
 * title/position never establishes identity. Full native DTOs stay untouched. */
export function programNativeExecutionIdentity(prior:readonly ProgramNativeExecutionRevision[],next:NativeCreatorDocumentOwner):Map<string,string>{
 const graph=new Map<string,Set<string>>(),node=(snapshot:string,item:string)=>JSON.stringify([snapshot,item]);
 const connect=(a:string,b:string)=>{if(!graph.has(a))graph.set(a,new Set());if(!graph.has(b))graph.set(b,new Set());graph.get(a)!.add(b);graph.get(b)!.add(a);};
 const owners=[...prior.map(r=>r.nativeDocument),next];
 for(const owner of owners){
  if(owner.id!==next.id||owner.source.draftId!==next.source.draftId||owner.source.storageKey!==next.source.storageKey||owner.document.documentId!==next.document.documentId)throw Error('foreign-native-execution-lineage');
  for(const revision of owner.document.revisionHistory){
   const state=revision.before?.sourceState;
   if(!state||state.status==='current'||!revision.operations.some(o=>o.type==='apply_source_update'))continue;
   for(const match of state.incoming.matches)connect(node(state.active.snapshotId,match.activeItemId),node(state.incoming.snapshot.snapshotId,match.incomingItemId));
   for(const change of state.changes)if(change.kind==='removed'&&change.resolution==='keep_previous')connect(node(state.active.snapshotId,change.activeItemId),node(state.incoming.snapshot.snapshotId,change.activeItemId));
  }
 }
 const currentSnapshot=next.document.sourceState?.active.snapshotId,result=new Map<string,string>(),used=new Set<string>();
 for(const item of next.document.parseResult.canonical.items){
  const reachable=new Set<string>();if(currentSnapshot){const queue=[node(currentSnapshot,item.itemId)];while(queue.length){const n=queue.pop()!;if(reachable.has(n))continue;reachable.add(n);for(const adjacent of graph.get(n)??[])queue.push(adjacent);}}
  const candidates=new Set<string>();
  for(const revision of prior)for(const row of revision.rows){const sourceId=programNativeSourceItemId(row),snapshot=revision.nativeDocument.document.sourceState?.active.snapshotId;
   if(sourceId===item.itemId||snapshot&&reachable.has(node(snapshot,sourceId)))candidates.add(row.itemId);
  }
  if(candidates.size>1)throw Error('ambiguous-native-execution-lineage');
  const identity=candidates.values().next().value??item.itemId;if(used.has(identity))throw Error('duplicate-native-execution-lineage');used.add(identity);result.set(item.itemId,identity);
 }
 return result;
}
