import {textWorkspaceModel as M,type TextWorkspaceState} from './text-workspace';

export type WritingChildInput={docId:string;parentId:string;kind:'memo'|'task';text:string;expectedRaw:string;date?:string|null;scopeId?:string};
export type WritingChildResult={ok:true;workspace:TextWorkspaceState;lineId:string;parentId:string;offset:number}|{ok:false;reason:string};
/** Explicit command only. No input listeners, store, network or per-keystroke work. */
export function prepareWritingChild(before:TextWorkspaceState,input:WritingChildInput,newId:()=>string=()=>`authoring-${crypto.randomUUID()}`):WritingChildResult{
 const fail=(reason:string):WritingChildResult=>({ok:false,reason});
 if(!M.validate(before)||typeof input.text!=='string'||!input.text.trim())return fail('내용을 입력해 주세요.');
 const doc=M.getDocument(before,input.docId);if(!doc||M.raw(doc)!==input.expectedRaw)return fail('문서가 바뀌었습니다. 현재 항목에서 다시 열어 주세요.');
 const parsed=M.parseDocument(doc,before),parent=parsed.rows.find(r=>r.id===input.parentId),task=M.tasks(before).find(t=>t.id===input.parentId);
 if(!parent||!task||task.docId!==doc.id||parent.isReference||!parent.isCanonical)return fail('원래 할 일에서 추가해 주세요.');
 if(input.kind==='task'&&task.parentTaskId)return fail('새 하위 할 일은 첫 단계까지만 추가합니다. 기존 깊은 구조는 유지합니다.');
 if(parent.depth>=12)return fail('더 깊게 추가할 수 없습니다.');
 if(input.kind==='memo'){
  const next=M.updateTask(before,task.id,{note:input.text});if(next===before&&task.note!==input.text)return fail('메모를 적용하지 못했습니다.');
  const updated=M.getDocument(next,doc.id)!,rows=M.parseDocument(updated,next).rows;
  const memo=rows.find(row=>row.kind==='property'&&row.taskId===task.id&&/^ *- 메모:/.test(row.text));
  const lineId=memo?.id??task.id,index=updated.lines.findIndex(l=>l.id===lineId),offset=updated.lines.slice(0,index).reduce((n,l)=>n+l.text.length+1,0)+updated.lines[index].text.length;
  return{ok:true,workspace:next,lineId,parentId:task.id,offset};
 }
 const scope=input.scopeId??before.taskScopes[task.id];if(!scope||!M.scopes(before).some(s=>s.id===scope))return fail('분류를 확인해 주세요.');
 const date=input.date===undefined?task.date:input.date;if(date!==null&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date))return fail('날짜를 확인해 주세요.');
 // Existing properties stay before the new child. Existing children keep order.
 const firstChild=parsed.rows.find(row=>row.index>parent.index&&row.index<parent.subtreeEndIndex&&['task','subcheck'].includes(row.kind)),at=firstChild?.index??parent.subtreeEndIndex;
 const id=newId(),title=input.text.replace(/\r\n/g,'\n').split('\n')[0].trim();if(!title||/[\r\n]/.test(id)||doc.lines.some(l=>l.id===id))return fail('하위 항목을 확인해 주세요.');
 const line={id,text:'  '.repeat(parent.depth+1)+'- [ ] '+title},lines=doc.lines.slice();lines.splice(at,0,line);
 const changed={...doc,lines};let next:TextWorkspaceState={...before,documents:before.documents.map(d=>d.id===doc.id?changed:d),flows:before.flows.map(d=>d.id===doc.id?{...changed,private:true as const,sourceVersion:d.sourceVersion}:d),taskScopes:{...before.taskScopes,[id]:scope},itemScopes:{...before.itemScopes,[id]:scope}};
 if(!M.validate(next))return fail('하위 할 일의 소속을 확인하지 못했습니다.');
 // 11/10 decision: the date line only when the child would read another day without it — a child reads its own
 // section's day, not its parent's — so under a parent of its own section no '- 날짜:' is added, while under a moved
 // parent or in an undated part it keeps the parent's day.
 const sectionDate=M.tasks(next).find(t=>t.id===id)?.date??null;
 next=M.updateTask(next,id,{...(sectionDate!==date?{date}:{}),note:input.text.split('\n').slice(1).join('\n')});
 const child=M.tasks(next).find(t=>t.id===id);if(!child||child.parentTaskId!==parent.id||child.date!==date||!M.validate(next))return fail('하위 할 일의 날짜·소속을 적용하지 못했습니다.');
 if(next.progressRecords.some(r=>r.taskId===id))return fail('새 하위 항목에 기존 기록을 연결하지 않았습니다.');
 const after=M.getDocument(next,doc.id)!,index=after.lines.findIndex(l=>l.id===id),offset=after.lines.slice(0,index).reduce((n,l)=>n+l.text.length+1,0)+after.lines[index].text.length;
 return{ok:true,workspace:next,lineId:id,parentId:task.id,offset};
}
