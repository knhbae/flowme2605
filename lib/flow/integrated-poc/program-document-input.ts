import {registerOwnedWritingSource} from './writing-ack';
import {textWorkspaceModel as M,projectTextEditorRows,type TextWorkspaceState,type TextRow,type TextEditorRowMeta,type TextInputSplice,type TextTaskSplitIntent,type TextTask} from './text-workspace';

type Input={inputType:string;inputSplice?:TextInputSplice;taskSplit?:TextTaskSplitIntent};
type Frame={workspace:TextWorkspaceState;raw:string;rows:TextRow[];paint:TextEditorRowMeta[];literalSafe:boolean};
type Proof={before:Frame;next:Frame};
/** Private immutable owner. No borrowed workspace is frozen and no global cache
 * is installed. A local proof changes one existing line's text only. */
function own<T>(value:T):T{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(own);Object.freeze(value);}
  return value;
}
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
export function createProgramDocumentInput(source:TextWorkspaceState,docId:string){
  const proofs=new WeakSet<object>();let revision=0;
  function frame(workspace:TextWorkspaceState):Frame{
    registerOwnedWritingSource(workspace,docId);
    const rows=M.rowMeta(workspace,docId),raw=M.raw(M.getDocument(workspace,docId));
    return own({workspace,raw,rows:own(rows),paint:own(projectTextEditorRows(workspace,rows)),literalSafe:!(/<!--\s*flowme-folder/i.test(raw))});
  }
  const initial=own(clone(source));if(!M.validate(initial)||!M.getDocument(initial,docId))throw Error('DOCUMENT_INPUT_BASELINE_INVALID');
  let current=frame(initial);
  // Pure eligibility and the actual transition share one exact predicate.
  // This allocates no workspace/proof and changes no owner revision.
  function checkTarget(before:TextWorkspaceState,lineId:string,date:string){
      if(before!==current.workspace||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00.000Z'))
        ||new Date(date+'T00:00:00.000Z').toISOString().slice(0,10)!==date)return null;
      const index=current.rows.findIndex(r=>r.id===lineId),row=current.rows[index],meta=current.paint[index],doc=M.getDocument(before,docId);
      // A native leaf directly under a folder scope has the same single-line
      // check transition as a root task. Nested task trees keep model admission.
      const folderLeaf=!!row&&row.depth===1&&row.isCanonical&&row.parentKind==='scope'
        &&row.parentTaskId===null&&!row.ancestorItemIds?.length&&row.scopeKind==='folder'&&!row.scopeMismatch
        &&row.task?.subchecks.length===0&&current.literalSafe
        &&current.rows.slice(index+1,row.subtreeEndIndex).every(child=>child.kind==='blank'
          ||child.kind==='property'&&child.taskId===lineId&&!child.progressTargetId)
        &&before.documents.some(d=>d===doc)&&current.rows.some(parent=>parent.id===row.parentLineId
          &&parent.kind==='scope'&&parent.depth===0&&parent.scopeKind==='folder'&&parent.binding?.kind==='scope');
      if(!doc||!row||row.kind!=='task'||row.depth!==0&&!folderLeaf||row.isReference||row.progressTargetId!==lineId
        ||!meta||![0,100].includes(meta.progressPercent!)||(meta.progressDate??'')>date
        ||before.bindings.some(b=>b.lineId===lineId||b.kind==='task'&&b.taskId===lineId))return null;
      const line=doc.lines[index],parts=/^( *-\s+\[)([ xX])(\](?:\s+|$))(.*?)(\s*)$/.exec(line.text);
      if(!parts||!parts[4].trim())return null;
      const percent=meta.progressPercent===100?0:100,at=before.progressRecords.findIndex(r=>r.taskId===lineId&&r.date===date);
      // Match the model's existing record cap; all other global invariants are
      // inherited from this private immutable frame and unchanged by this proof.
      if(at<0&&before.progressRecords.length>=10000)return null;
      return {index,meta,doc,line,parts,percent,at};
  }
  return{
    initial,revision:()=>revision,
    rows:(state:TextWorkspaceState)=>current.workspace===state?current.rows:null,
    paint:(state:TextWorkspaceState)=>current.workspace===state?current.paint:null,
    install(next:TextWorkspaceState){
      if(next===current.workspace)return next;
      // Eager model/explicit-command validation precedes this ownership handoff.
      current=frame(own(clone(next)));revision++;return current.workspace;
    },
    canPrepareCheck:(before:TextWorkspaceState,lineId:string,date:string)=>!!checkTarget(before,lineId,date),
    prepareCheck(before:TextWorkspaceState,lineId:string,date:string):Proof|null{
      const target=checkTarget(before,lineId,date);if(!target)return null;
      const {index,meta,doc,line,parts,percent,at}=target;
      const records=before.progressRecords.slice(),record={taskId:lineId,date,percent};if(at<0)records.push(record);else records[at]=record;
      const text=parts[1]+(percent===100?'x':' ')+parts[3]+parts[4]+parts[5],lines=doc.lines.slice();lines[index]=own({...line,text});
      const nextDoc=own({...doc,lines}),workspace=own({...before,progressRecords:records,
        documents:before.documents.map(d=>d.id===docId?nextDoc:d),flows:before.flows.map(d=>d.id===docId?nextDoc as typeof d:d)});
      const tasks=new WeakMap<TextTask,TextTask>(),update=(task:TextTask):TextTask=>{
        const prior=tasks.get(task);if(prior)return prior;const children=Array.isArray(task.subchecks)?task.subchecks:null,subchecks=children?.map(update);
        const changed=task.id===lineId||!!subchecks?.some((s,i)=>s!==children![i]);const next=changed?own({...task,...(task.id===lineId?{done:percent===100}:{}),...(subchecks?{subchecks}:{})}):task;tasks.set(task,next);return next;
      };
      const rows=current.rows.map((r,i)=>own({...r,...(i===index?{text,done:percent===100}:{}),...(r.task?{task:update(r.task)}:{})}));
      const paint=current.paint.slice();paint[index]=own({...meta,progressPercent:percent,progressDate:date,progressTracked:true,lastRecordedPercent:percent});
      const proof:Proof=own({before:current,next:{workspace,raw:M.raw(nextDoc),rows:own(rows),paint:own(paint),literalSafe:current.literalSafe}});proofs.add(proof);return proof;
    },
    prepare(before:TextWorkspaceState,raw:string,input?:Input):Proof|null{
      if(current.workspace!==before||!current.literalSafe||raw.length>100000||/[\r]/.test(raw)||input?.inputSplice||input?.taskSplit
        ||!input||!['insertText','insertCompositionText','deleteContentBackward','deleteContentForward'].includes(input.inputType)||raw===current.raw)return null;
      const a=current.raw;let start=0;while(start<a.length&&start<raw.length&&a[start]===raw[start])start++;
      let oldEnd=a.length,newEnd=raw.length;while(oldEnd>start&&newEnd>start&&a[oldEnd-1]===raw[newEnd-1]){oldEnd--;newEnd--;}
      if(a.slice(start,oldEnd).includes('\n')||raw.slice(start,newEnd).includes('\n'))return null;
      const index=a.slice(0,start).split('\n').length-1,doc=M.getDocument(before,docId)!;
      const line=doc.lines[index],row=current.rows[index];if(!line||!row||row.id!==line.id)return null;
      const lineStart=a.lastIndexOf('\n',Math.max(0,start-1))+1,end=a.indexOf('\n',start),lineEnd=end<0?a.length:end;
      if(oldEnd>lineEnd)return null;
      const text=a.slice(lineStart,start)+raw.slice(start,newEnd)+a.slice(oldEnd,lineEnd);
      if(/<!--\s*flowme-folder/i.test(text))return null;
      let title:string|null=null,memoOwner:string|null=null,note:string|null=null;
      if(row.kind==='note'){
        const oldIndent=/^ */.exec(line.text)![0],newIndent=/^ */.exec(text)![0];
        if(oldIndent!==newIndent||!line.text.trim()||!text.trim()
          ||/^[\s\-+*#>`~\[]/.test(line.text.slice(oldIndent.length))||/^[\s\-+*#>`~\[]/.test(text.slice(newIndent.length)))return null;
      }else if((row.kind==='task'||row.kind==='subcheck')&&!row.isReference
        &&!before.bindings.some(b=>b.lineId===line.id||b.kind==='task'&&b.taskId===line.id)){
        const pattern=/^( *-\s+\[[^\]\r\n]*\](?:\s+|$))(.*?)(\s*)$/;
        const old=pattern.exec(line.text),next=pattern.exec(text);
        if(!old||!next||old[1]!==next[1]||!old[2].trim()||!next[2].trim())return null;
        title=next[2].trim();
      }else if(row.kind==='property'&&row.taskId){
        const old=/^( *-\s+메모:\s*)(.*)$/.exec(line.text),next=/^( *-\s+메모:\s*)(.*)$/.exec(text);
        const parent=current.rows.find(r=>r.id===row.taskId);
        if(!old||!next||old[1]!==next[1]||!parent?.isCanonical||parent.isReference
          ||before.bindings.some(b=>b.kind==='task'&&(b.lineId===row.taskId||b.taskId===row.taskId)))return null;
        memoOwner=row.taskId;note='';
        for(const property of current.rows){
          if(property.kind!=='property'||property.taskId!==memoOwner)continue;
          const value=/^ *-\s+메모:\s*(.*)$/.exec(property.id===line.id?text:property.text)?.[1];
          if(value!==undefined)note=note?note+'\n'+value:value;
        }
      }else return null;
      const lines=doc.lines.slice();lines[index]=own({...line,text});
      const nextDoc=own({...doc,lines}),workspace=own({...before,
        documents:before.documents.map(d=>d.id===docId?nextDoc:d),flows:before.flows.map(d=>d.id===docId?nextDoc as typeof d:d)});
      const tasks=new WeakMap<TextTask,TextTask>();
      const retitle=(task:TextTask):TextTask=>{
        const prior=tasks.get(task);if(prior)return prior;
        const children=Array.isArray(task.subchecks)?task.subchecks:null,subchecks=children?.map(retitle);
        const changed=title!==null&&task.id===line.id||memoOwner===task.id||!!subchecks?.some((s,i)=>s!==children![i]);
        const next=changed?own({...task,...(title!==null&&task.id===line.id?{title}:{}),...(memoOwner===task.id?{note:note!}:{}),...(subchecks?{subchecks}:{})}):task;tasks.set(task,next);return next;
      };
      const rows=current.rows.map((r,i)=>{
        let changed=i===index?{...r,text,...(title!==null?{title,progressTitle:title}:{})}:r;
        if(memoOwner===r.progressTargetId)changed={...changed,note:note!};
        if((title!==null||memoOwner!==null)&&r.task)changed={...changed,task:retitle(r.task)};
        return own(changed);
      });
      const paint=current.paint.map((meta,i)=>{
        const r=rows[i],label=r.scopeTitle||r.title||r.task?.title||r.text;
        return label===meta.label?meta:own({...meta,label});
      });
      const proof:Proof=own({before:current,next:{workspace,raw,rows:own(rows),paint:own(paint),literalSafe:true}});
      proofs.add(proof);return proof;
    },
    accept(proof:Proof,before:TextWorkspaceState){
      if(!proofs.has(proof)||proof.before!==current||before!==current.workspace)return null;
      proofs.delete(proof);current=proof.next;registerOwnedWritingSource(current.workspace,docId);revision++;return current.workspace;
    },
  };
}
export type ProgramDocumentInput=ReturnType<typeof createProgramDocumentInput>;
