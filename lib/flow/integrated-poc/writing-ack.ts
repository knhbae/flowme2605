import {textWorkspaceModel as M,type TextWorkspaceState} from './text-workspace';
import {canonicalJson} from './alpha-persistence/json';
import {finishedFolderDeclarations} from './folder-line-hold';
import type {ProgramData} from './contract';
import type {AlphaCommand,AlphaReceipt} from './alpha-persistence/contract';
import type {WritingIdentity} from './writing-compute';

/** Fixed-name measures retain only the latest sample per phase. No observer is installed. */
export function noteWritingPhase(phase:string,start:number,identity?:Readonly<WritingIdentity>){
 try{const end=performance.now(),name='flowme-writing:'+phase;performance.clearMeasures(name);performance.measure(name,{start,duration:Math.max(0,end-start),detail:identity?{...identity}:null});}catch{/* Diagnostics never own a commit. */}
}
export function freezeWritingView<T>(value:T):T{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const part of Object.values(value))freezeWritingView(part);Object.freeze(value);}return value;
}
export type WritingAckInput=Readonly<{documentId:string;generation:number;expected:TextWorkspaceState;next:TextWorkspaceState}>;
export type OwnedWritingAck=Readonly<{identity:Readonly<WritingIdentity>;input:WritingAckInput}>;
const ownedSources=new WeakMap<TextWorkspaceState,string>();
/** Called only after the private document owner freezes/adopts its own graph. */
export function registerOwnedWritingSource(workspace:TextWorkspaceState,documentId:string){if(Object.isFrozen(workspace))ownedSources.set(workspace,documentId);}
type Frame=object;
type View={frame:Frame;ownerId:string;revision:number;publicRevision:number|null};
const views=new WeakMap<ProgramData,View>();
const proofs=new WeakMap<OwnedWritingAck,{before:Frame;after:Frame;current:()=>boolean;phase:'issued'|'claimed'}>();
/** Only the controller's immutable materialized view is marked, never an external snapshot. */
export function registerWritingView(data:ProgramData,view:View){if(Object.isFrozen(data))views.set(data,{...view});}
export function createWritingAckIssuer(){
 let issued:OwnedWritingAck|null=null;
 return {
  clear(){if(issued)proofs.delete(issued);issued=null;},
  issue(identity:WritingIdentity,input:WritingAckInput,before:Frame,after:Frame,current:()=>boolean){
   if(issued)proofs.delete(issued);issued=null;
   if(input.documentId!==identity.docId||input.generation!==identity.workingGeneration
    ||ownedSources.get(input.expected)!==input.documentId||ownedSources.get(input.next)!==input.documentId||!current())return null;
   const token=Object.freeze({identity:Object.freeze({...identity}),input:Object.freeze({...input})});
   proofs.set(token,{before,after,current,phase:'issued'});issued=token;return token;
  },
  read(){return issued&&proofs.get(issued)?.current()?issued:null;}
 };
}
export function claimOwnedWritingAck(token:OwnedWritingAck,ownerId:string,before:ProgramData,next:ProgramData,pending:AlphaCommand|null|undefined,receipt:AlphaReceipt|null|undefined){
 const p=proofs.get(token),a=views.get(before),b=views.get(next),i=token.identity;
 if(!p||p.phase!=='issued'||!p.current()||!a||!b||a.frame!==p.before||b.frame!==p.after
  ||before.activeActorId!==ownerId||next.activeActorId!==ownerId||!before.spaces[ownerId]||!next.spaces[ownerId]
  ||a.ownerId!==ownerId||b.ownerId!==ownerId||i.ownerId!==ownerId||a.revision!==i.baseRevision||b.revision!==i.baseRevision+1
  ||a.publicRevision!==b.publicRevision||pending?.kind!=='change-private'||pending.requestId!==i.requestId||pending.expectedRevision!==i.baseRevision
  ||receipt?.requestId!==i.requestId||receipt.kind!=='change-private'||!receipt.changed||receipt.revision!==b.revision)return false;
 p.phase='claimed';return true;
}
export function consumeOwnedWritingAck(token:OwnedWritingAck,input:WritingAckInput,currentGeneration:number){
 const p=proofs.get(token),source=token.input;
 if(!p||p.phase!=='claimed'||!p.current()||input.documentId!==source.documentId||input.generation!==source.generation
  ||currentGeneration<source.generation||input.expected!==source.expected||input.next!==source.next)return false;
 proofs.delete(token);return true;
}

export function privateTextChangeIsolatedToDocument(before: TextWorkspaceState, next: TextWorkspaceState, documentId: string): boolean {
  try {
    if (!M.validate(before) || !M.validate(next) || !M.getDocument(before, documentId) || !M.getDocument(next, documentId)) return false;
    const ids = new Set([...before.documents, ...before.flows, ...next.documents, ...next.flows].map(doc => doc.id));
    const changed = [...ids].filter(id => canonicalJson(M.getDocument(before, id) ?? null) !== canonicalJson(M.getDocument(next, id) ?? null));
    if (changed.length > 1) {
      // A linked title edit may synchronize its canonical source or references. Preserve
      // all identities/metadata and the exact non-title task frame, then let
      // the real model prove the complete propagation rather than an ID list.
      const withoutText = (state: TextWorkspaceState) => ({ ...state,
        documents: state.documents.map(doc => ({ ...doc, lines: doc.lines.map(line => ({ ...line, text: '' })) })),
        flows: state.flows.map(doc => ({ ...doc, lines: doc.lines.map(line => ({ ...line, text: '' })) })),
      });
      if (canonicalJson(withoutText(before)) !== canonicalJson(withoutText(next))) return false;
      const source = M.getDocument(before, documentId)!, submitted = M.getDocument(next, documentId)!;
      const rows = M.rowMeta(before, documentId), submittedRows = M.rowMeta(next, documentId);
      let titles = 0;
      for (let index = 0; index < source.lines.length; index++) {
        const oldLine = source.lines[index], newLine = submitted.lines[index];
        if (oldLine.text === newLine.text) continue;
        const bindings = before.bindings.filter(binding => binding.kind === 'task' && binding.docId === documentId && binding.lineId === oldLine.id);
        const oldRow = rows.find(row => row.id === oldLine.id), newRow = submittedRows.find(row => row.id === newLine.id);
        const reference = bindings.length === 1 && oldRow?.isReference === true && newRow?.isReference === true;
        const canonical = bindings.length === 0 && oldRow?.isCanonical === true && oldRow.isReference === false
          && oldRow.progressTargetId === oldLine.id && newRow?.isCanonical === true && newRow.isReference === false
          && newRow.progressTargetId === newLine.id;
        if (!reference && !canonical) return false;
        // Same lexical frame as model.taskParts; parsing/replay below remains
        // authoritative. Only its title capture may differ, never token/indent.
        const frame = /^( *-\s+\[)([^\]\r\n]*)(\](?:\s+|$))(.*?)(\s*)$/;
        const oldParts = frame.exec(oldLine.text), newParts = frame.exec(newLine.text);
        if (!oldParts || !newParts || [1, 2, 3, 5].some(part => oldParts[part] !== newParts[part]) || oldParts[4] === newParts[4]) return false;
        titles++;
      }
      if (!titles) return false;
      const replay = M.editTextResult(before, documentId, M.raw(submitted), { folderText: true, folderDeclare: finishedFolderDeclarations(before, next, documentId) });
      return replay.reason === null && canonicalJson(replay.state) === canonicalJson(next);
    }
    if (changed.length === 1 && changed[0] !== documentId) return false;
    const records = (state: TextWorkspaceState) => new Map(state.progressRecords.map(record => [JSON.stringify([record.taskId, record.date]), record]));
    const oldRecords = records(before), newRecords = records(next);
    const changedRecords = [...new Set([...oldRecords.keys(), ...newRecords.keys()])]
      .filter(key => canonicalJson(oldRecords.get(key) ?? null) !== canonicalJson(newRecords.get(key) ?? null));
    const owned = (state: TextWorkspaceState, targetId: string) => {
      const owners = [...state.documents, ...state.flows].flatMap(doc => M.rowMeta(state, doc.id)
        .filter(row => row.id === targetId && row.progressTargetId === targetId && !row.isReference).map(() => doc.id));
      return owners.length === 1 && owners[0] === documentId;
    };
    if (changedRecords.some(key => {
      const target = (oldRecords.get(key) ?? newRecords.get(key))!.taskId;
      return !owned(before, target) || !owned(next, target);
    })) return false;
    if (changed.length === 1) return true;
    // Empty document deltas are safe only when the whole remaining difference
    // consists of nonempty records owned by that same dirty source document.
    return changedRecords.length > 0
      && canonicalJson({ ...before, progressRecords: [] }) === canonicalJson({ ...next, progressRecords: [] });
  } catch { return false; }
}
