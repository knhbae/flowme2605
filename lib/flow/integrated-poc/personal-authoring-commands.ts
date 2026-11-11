import {programClone,programFailure,programId,programResult,type ProgramData,type ProgramTransition,type ProgramPrivateSpace} from './contract';
import {validateProgramData} from './program-data';
import {textWorkspaceModel as M,type TextWorkspaceState,type TextDocument} from './text-workspace';
import {calculatePersonalRounds,resolvePersonalTaskDate,planPersonalExecutionAnchorChange,type PersonalAuthoringV1,type PersonalFlowVersion,type PersonalFlowNode,type PersonalTaskDate,type PersonalRepeatRule,type PersonalRepeatSource} from './personal-authoring';
import {programReferenceExecutionAccess} from './reference-execution-guard';

const metadata=(space:ProgramPrivateSpace):PersonalAuthoringV1=>programClone(space.personalAuthoring??{version:1,flows:[],series:[]});
function complete(data:ProgramData,space:ProgramPrivateSpace,result:string):ProgramTransition<string>{const next={...data,spaces:{...data.spaces,[data.activeActorId]:space}};return validateProgramData(next)?programResult(data,next,result):programFailure(data,'invalid');}
function safeTask(space:ProgramPrivateSpace,id:string){const task=M.tasks(space.text).find(t=>t.id===id),access=programReferenceExecutionAccess(space,id);return task&&access.kind==='active'&&!access.reason?task:null;}

/** Explicit configuration checkpoint, not a body input transformation. */
export function personalTaskClosure(text:TextWorkspaceState,ids:readonly string[]):string[]{
 const tasks=M.tasks(text),selected=new Set(ids);let changed=true;while(changed){changed=false;for(const task of tasks)if(task.parentTaskId&&selected.has(task.parentTaskId)&&!selected.has(task.id)){selected.add(task.id);changed=true;}}
 return tasks.filter(task=>selected.has(task.id)).map(task=>task.id);
}
export function capturePersonalVersion(text:TextWorkspaceState,documentId:string,dates:Record<string,PersonalTaskDate>={},selectedIds?:readonly string[],versionId?:string,includeLayout=selectedIds===undefined):PersonalFlowVersion|null{
 const doc=M.getDocument(text,documentId);if(!doc)return null;
 const all=M.tasks(text),tasks=new Map(all.map(t=>[t.id,t])),rows=M.rowMeta(text,documentId);
 const sourceId=(row:typeof rows[number])=>row.isReference?row.taskId:row.id;
 const seeds=selectedIds??rows.flatMap(row=>row.kind==='task'&&sourceId(row)?[sourceId(row)!]:[]),selected=new Set(personalTaskClosure(text,seeds));
 if(!selected.size)return null;const nodes:PersonalFlowNode[]=[],taskRefs:PersonalFlowVersion['taskRefs']=[],seen=new Set<string>();let step:string|null=null;
 function action(id:string){const task=tasks.get(id);if(!task||seen.has(id)||!selected.has(id))return;seen.add(id);
  const parentTaskId=task.parentTaskId&&selected.has(task.parentTaskId)?task.parentTaskId:null,analysis=M.parseDocument(M.getDocument(text,task.docId)!,text);
  taskRefs.push({taskId:id,parentTaskId,date:programClone(dates[id]??(task.date?{kind:'fixed',date:task.date}:{kind:'undated'}))});
  nodes.push({id:'action-'+id,parentId:parentTaskId?'action-'+parentTaskId:step,kind:'action',taskId:id,title:task.title,memo:task.note,time:task.time,scopeId:task.scopeId,
   subchecks:analysis.items.filter(c=>!c.isCanonical&&c.parentTaskId===id).map(c=>({id:'check-'+c.id,parentId:c.parentItemId&&c.parentItemId!==id?'check-'+c.parentItemId:null,title:c.title,memo:c.note,time:c.time,scopeId:text.itemScopes[c.id]??task.scopeId,date:!c.explicitDate?{kind:'inherit' as const}:c.date?{kind:'fixed' as const,date:c.date}:{kind:'undated' as const}}))});
  for(const child of all)if(child.parentTaskId===id)action(child.id);
 }
 for(const row of rows){const id=sourceId(row);if(row.kind==='task'&&id&&selected.has(id)){action(id);continue;}
  if(!includeLayout)continue;if(row.kind==='heading'&&/^ *#+\s/.test(row.text)){step='step-'+row.id;nodes.push({id:step,parentId:null,kind:'step',text:row.text.replace(/^ *#+\s+/,'')});}
  else if(row.kind==='note'&&!row.parentTaskId&&row.text.trim()&&!/^ *- (?:메모|날짜|시간):/.test(row.text))nodes.push({id:'description-'+row.id,parentId:step,kind:'description',text:row.text.trimStart()});
 }
 for(const id of seeds)action(id);return{id:versionId??programId('personal-version'),taskRefs,nodes};
}

/** Native placements retain outline order; bindings share the canonical task and its live memo/checks. */
function placePersonalVersion(before:TextWorkspaceState,documentId:string,version:PersonalFlowVersion):TextWorkspaceState|null{
 const doc=M.getDocument(before,documentId);if(!doc)return null;const tasks=new Map(M.tasks(before).map(t=>[t.id,t])),lines=[...doc.lines],bindings=[...before.bindings],depths=new Map<string,number>();
 for(const node of version.nodes){const depth=node.parentId===null?0:(depths.get(node.parentId)??-1)+1;depths.set(node.id,depth);const pad='  '.repeat(depth);
  if(node.kind==='action'){const task=tasks.get(node.taskId);if(!task)return null;const lineId=programId('personal-placement');lines.push({id:lineId,text:pad+'- ['+(task.done?'x':' ')+'] '+task.title});bindings.push({kind:'task',docId:documentId,lineId,taskId:task.id,dateMode:'keep'});}
  else for(const line of node.text.split('\n'))lines.push({id:programId('personal-layout'),text:pad+(node.kind==='step'?'## ':'')+line});
 }
 const changed={...doc,lines},next={...before,documents:before.documents.map(d=>d.id===documentId?changed:d),flows:before.flows.map(d=>d.id===documentId?{...d,lines}:d),bindings};return M.validate(next)?next:null;
}

export function createPersonalFlow(data:ProgramData,input:{title:string;documentId:string;taskIds:string[];newTaskTitle?:string;description?:string}):ProgramTransition<string>{
 const original=data.spaces[data.activeActorId];if(!input.title.trim()||!M.getDocument(original.text,input.documentId)||!input.taskIds.length&&!input.newTaskTitle?.trim())return programFailure(data,'invalid');
 const selected=personalTaskClosure(original.text,input.taskIds);if(selected.some(id=>!safeTask(original,id)))return programFailure(data,'forbidden');
 let text=programClone(original.text);const flowId=programId('personal-flow'),versionId=programId('personal-version'),folder=text.folders.find(f=>f.id==='folder-unfiled')??text.folders[0];if(!folder)return programFailure(data,'missing');
 text.flows.push({id:flowId,title:input.title.trim(),folder:folder.title,folderId:folder.id,private:true,sourceVersion:versionId,lines:[{id:programId('personal-step'),text:'## 첫 단계'},...(input.description?input.description.split(/\r?\n/).map(line=>({id:programId('personal-description'),text:line})):[])]});
 if(selected.length){const snapshot=capturePersonalVersion(original.text,input.documentId,{},selected,versionId,true);if(!snapshot)return programFailure(data,'invalid');const placed=placePersonalVersion(text,flowId,snapshot);if(!placed)return programFailure(data,'invalid');text=placed;}
 if(input.newTaskTitle?.trim())text=M.addTask(text,{docId:flowId,title:input.newTaskTitle.trim(),date:null,scopeId:flowId});
 const version=capturePersonalVersion(text,flowId);if(!version)return programFailure(data,'invalid');version.id=versionId;
 const owner=metadata(original);owner.flows.push({flowId,currentVersionId:versionId,versions:[version]});return complete(data,{...original,text,personalAuthoring:owner},flowId);
}
export function savePersonalVersion(data:ProgramData,flowId:string,dates:Record<string,PersonalTaskDate>):ProgramTransition<string>{const space=data.spaces[data.activeActorId],owner=metadata(space),flow=owner.flows.find(f=>f.flowId===flowId),doc=M.getDocument(space.text,flowId);if(!flow||!doc)return programFailure(data,'missing');const version=capturePersonalVersion(space.text,flowId,dates);if(!version)return programFailure(data,'invalid');flow.versions.push(version);flow.currentVersionId=version.id;const text={...space.text,flows:space.text.flows.map(d=>d.id===flowId?{...d,sourceVersion:version.id}:d)};return complete(data,{...space,text,personalAuthoring:owner},version.id);}

/** A new placement only. Resolve references to the same canonical task IDs. */
export function connectPersonalFlow(data:ProgramData,input:{flowId:string;documentId:string}):ProgramTransition<string>{const space=data.spaces[data.activeActorId],flow=space.personalAuthoring?.flows.find(f=>f.flowId===input.flowId),version=flow?.versions.find(v=>v.id===flow.currentVersionId),doc=M.getDocument(space.text,input.documentId);if(!flow||!version||!doc||doc.id===flow.flowId)return programFailure(data,'invalid');if(version.taskRefs.some(ref=>!safeTask(space,ref.taskId)))return programFailure(data,'forbidden');const text=placePersonalVersion(space.text,doc.id,version);return text?complete(data,{...space,text},doc.id):programFailure(data,'invalid');}

/** Restore only frozen content with fresh native identities, zero current progress and no new records. */
export function materializePersonalContent(before:TextWorkspaceState,input:{title:string;version:PersonalFlowVersion;nodes:PersonalFlowNode[];dates:Map<string,string|null>;anchorDate:string}):{text:TextWorkspaceState;documentId:string;taskIds:Record<string,string>}|null{
 const folder=before.folders.find(f=>f.id==='folder-unfiled')??before.folders[0];if(!folder)return null;const id=programId('personal-execution'),lines:TextDocument['lines']=[],taskIds:Record<string,string>={},depths=new Map<string,number>(),taskScopes={...before.taskScopes},itemScopes={...before.itemScopes};
 for(const node of input.nodes)if(node.kind==='action')taskIds[node.taskId]=programId('personal-task');
 const add=(text:string,lineId=programId('personal-line'))=>{lines.push({id:lineId,text});};
 for(const node of input.nodes){const depth=node.parentId===null?0:(depths.get(node.parentId)??-1)+1;depths.set(node.id,depth);const pad='  '.repeat(Math.min(depth,12));if(node.kind!=='action'){for(const line of node.text.split('\n'))add(pad+(node.kind==='step'?'## ':'')+line);continue;}
  const taskId=taskIds[node.taskId];add(pad+'- [ ] '+node.title,taskId);taskScopes[taskId]=node.scopeId;itemScopes[taskId]=node.scopeId;const property=(key:string,value:string|null)=>{if(value!==null)for(const line of value.split('\n'))add(pad+'  - '+key+': '+line);};
  property('날짜',input.dates.get(node.taskId)??'미정');if(node.memo)property('메모',node.memo);if(node.time)property('시간',node.time);
  const checkDepth=new Map<string,number>();for(const check of node.subchecks){const d=check.parentId===null?depth+1:(checkDepth.get(check.parentId)??depth)+1;checkDepth.set(check.id,d);const checkId=programId('personal-check'),cp='  '.repeat(Math.min(d,12));add(cp+'- [ ] '+check.title,checkId);itemScopes[checkId]=check.scopeId;if(check.date.kind!=='inherit'){const date=resolvePersonalTaskDate(check.date,input.anchorDate);if(!date.ok)return null;add(cp+'  - 날짜: '+(date.value??'미정'));}if(check.memo)for(const line of check.memo.split('\n'))add(cp+'  - 메모: '+line);if(check.time)add(cp+'  - 시간: '+check.time);}
 }
 if(!lines.length)return null;const document={id,title:input.title,folder:folder.title,folderId:folder.id,lines};const text={...before,documents:[...before.documents,document],taskScopes,itemScopes};return M.validate(text)?{text,documentId:id,taskIds}:null;
}

export function setPersonalRepeat(data:ProgramData,input:{flowId?:string;taskId?:string;seriesId?:string;versionId?:string;rule:PersonalRepeatRule}):ProgramTransition<string>{
 const space=data.spaces[data.activeActorId],owner=metadata(space);let series=input.seriesId?owner.series.find(s=>s.id===input.seriesId):undefined;
 if(series){const source=series.source;const version=source.kind==='flow'?owner.flows.find(f=>f.flowId===source.flowId)?.versions.find(v=>v.id===source.versionId):source.version;if(!version)return programFailure(data,'missing');const calculation=calculatePersonalRounds(version,{rule:input.rule,materialized:series.rounds,targetKind:series.source.kind});if(!calculation.ok)return programFailure(data,'invalid');const revision={id:programId('personal-rule'),rule:input.rule};series.ruleVersions.push(revision);series.currentRuleVersionId=revision.id;series.stopped=false;}
 else{let source:PersonalRepeatSource;if(input.flowId){const flow=owner.flows.find(f=>f.flowId===input.flowId);if(!flow)return programFailure(data,'missing');source={kind:'flow',flowId:flow.flowId,versionId:input.versionId??flow.currentVersionId};}else{const task=input.taskId&&safeTask(space,input.taskId);if(!task)return programFailure(data,'missing');const version=capturePersonalVersion(space.text,task.docId,{},[task.id]);if(!version)return programFailure(data,'invalid');source={kind:'task',taskId:task.id,version};}const version=source.kind==='flow'?owner.flows.find(f=>f.flowId===source.flowId)!.versions.find(v=>v.id===source.versionId)!:source.version;if(!calculatePersonalRounds(version,{rule:input.rule,targetKind:source.kind}).ok)return programFailure(data,'invalid');const ruleId=programId('personal-rule');series={id:programId('personal-series'),source,currentRuleVersionId:ruleId,ruleVersions:[{id:ruleId,rule:input.rule}],stopped:false,rounds:[]};owner.series.push(series);}
 return complete(data,{...space,personalAuthoring:owner},series.id);
}
export function stopPersonalRepeat(data:ProgramData,seriesId:string):ProgramTransition<string>{const space=data.spaces[data.activeActorId],owner=metadata(space),series=owner.series.find(s=>s.id===seriesId);if(!series)return programFailure(data,'missing');series.stopped=true;return complete(data,{...space,personalAuthoring:owner},seriesId);}
/** F12 2차 (W-FLOW-01, 목업 C2): runName is the run's name, kept as its document's title after the Flow's name (no other
 *  data); left out, the title is 'Flow 이름 · 기준일' as before. */
export function startPersonalFlow(data:ProgramData,input:{flowId:string;versionId:string;anchorDate:string;runName?:string}):ProgramTransition<string>{
 const space=data.spaces[data.activeActorId],owner=metadata(space),flow=owner.flows.find(f=>f.flowId===input.flowId),version=flow?.versions.find(v=>v.id===input.versionId);
 if(!flow||!version)return programFailure(data,'missing');const dates=new Map<string,string|null>();
 for(const ref of version.taskRefs){const date=resolvePersonalTaskDate(ref.date,input.anchorDate);if(!date.ok)return programFailure(data,'invalid');dates.set(ref.taskId,date.value);}
 const flowTitle=M.getDocument(space.text,flow.flowId)?.title??'개인 Flow',runName=typeof input.runName==='string'?input.runName.replace(/\s+/g,' ').trim().slice(0,80):'';
 const result=materializePersonalContent(space.text,{title:runName?`${flowTitle} ${runName}`:flowTitle+' · '+input.anchorDate,version,nodes:version.nodes,dates,anchorDate:input.anchorDate});if(!result)return programFailure(data,'invalid');
 (owner.executions??=[]).push({id:programId('personal-start'),flowId:flow.flowId,versionId:version.id,anchorDate:input.anchorDate,executionDocumentId:result.documentId,taskIds:result.taskIds});return complete(data,{...space,text:result.text,personalAuthoring:owner},result.documentId);
}
export function changePersonalAnchor(data:ProgramData,executionId:string,anchorDate:string):ProgramTransition<string>{
 const space=data.spaces[data.activeActorId],owner=metadata(space),plan=planPersonalExecutionAnchorChange(owner,executionId,anchorDate,space.text);if(!plan.ok)return programFailure(data,'invalid');let text=space.text;
 for(const change of plan.value.changes)text=M.updateTask(text,change.taskId,{date:change.afterDate});owner.executions=owner.executions!.map(e=>e.id===executionId?plan.value.execution:e);return complete(data,{...space,text,personalAuthoring:owner},plan.value.execution.executionDocumentId);
}
export function startPersonalRound(data:ProgramData,input:{seriesId:string;anchorDate:string}):ProgramTransition<string>{
 const space=data.spaces[data.activeActorId],owner=metadata(space),series=owner.series.find(s=>s.id===input.seriesId);if(!series)return programFailure(data,'missing');const existing=series.rounds.find(r=>r.anchorDate===input.anchorDate);if(existing)return programResult(data,data,existing.executionDocumentId);
 if(series.stopped)return programFailure(data,'unresolved');const source=series.source;const version=source.kind==='flow'?owner.flows.find(f=>f.flowId===source.flowId)!.versions.find(v=>v.id===source.versionId)!:source.version,rule=series.ruleVersions.find(v=>v.id===series.currentRuleVersionId)!.rule;
 const calculation=calculatePersonalRounds(version,{rule,materialized:series.rounds,targetKind:series.source.kind});if(!calculation.ok)return programFailure(data,'invalid');const round=calculation.value.rounds.find(r=>r.anchorDate===input.anchorDate);if(!round)return programFailure(data,'missing');const result=materializePersonalContent(space.text,{title:`${series.source.kind==='flow'?M.getDocument(space.text,series.source.flowId)?.title??'개인 Flow':'할 일'} · ${round.anchorDate}`,version,nodes:round.nodes,anchorDate:round.anchorDate,dates:new Map(round.items.map(i=>[i.taskId,i.date]))});if(!result)return programFailure(data,'invalid');series.rounds.push({id:programId('personal-round'),index:round.index,anchorDate:round.anchorDate,ruleVersionId:series.currentRuleVersionId,executionDocumentId:result.documentId,taskIds:result.taskIds});return complete(data,{...space,text:result.text,personalAuthoring:owner},result.documentId);
}
