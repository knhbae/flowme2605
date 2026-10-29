'use strict';

// Injected-model boundary. No storage, UI or account access; F05 uses the
// model's existing temporary ID allocation and rebinds it to the core reservation.
const clone = value => structuredClone(value);
function canonical(value) {
  const seen = new Set();
  function visit(v) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
    if (!v || typeof v !== 'object' || seen.has(v)) throw Error('NON_JSON_VALUE');
    seen.add(v);
    const names = Reflect.ownKeys(v);
    if (names.some(k => typeof k !== 'string')) throw Error('NON_JSON_KEY');
    if (Array.isArray(v)) {
      if (names.length !== v.length + 1 || Array.from({length:v.length},(_,i)=>i).some(i => !Object.hasOwn(v,i))) throw Error('NON_JSON_ARRAY');
    } else if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) throw Error('NON_JSON_OBJECT');
    const keys = names.filter(k => k !== 'length' || !Array.isArray(v));
    if (keys.some(k => { const d=Object.getOwnPropertyDescriptor(v,k);return !d.enumerable || !Object.hasOwn(d,'value'); })) throw Error('NON_JSON_DESCRIPTOR');
    const result = Array.isArray(v) ? '['+v.map(visit).join(',')+']' : '{'+keys.sort().map(k => JSON.stringify(k)+':'+visit(v[k])).join(',')+'}';
    seen.delete(v); // Only ancestor cycles are invalid; shared JSON values are supported.
    return result;
  }
  return visit(value);
}
const freeze = value => { if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value; };
const same = (a,b) => canonical(a) === canonical(b);
const docs = state => [...state.documents,...state.flows];
const exactKeys = (v,keys) => !!v && typeof v==='object' && !Array.isArray(v) && Object.keys(v).length===keys.length && keys.every(k=>Object.hasOwn(v,k));
const frame = text => /^( *-\s+\[)([^\]\r\n]*)(\](?:\s+|$))(.*?)(\s*)$/.exec(text);

// Ranges point into the unchanged raw UTF-16 string. Only known UI framing
// is separated; rowMeta remains the authority for each row's meaning.
function readonlyPresentation(raw,row,parts,docId) {
  if(row.kind==='date'){
    const title=row.date===null?'미정':row.date;
    if(row.valid!==true || typeof title!=='string' || raw.trim()!=='['+title+']')return null;
    const bodyFrom=raw.length-raw.trimStart().length+1;
    return {bodyFrom,bodyTo:bodyFrom+title.length};
  }
  if(row.kind==='scope'){
    const binding=row.binding;
    if(!binding || binding.kind!=='scope' || binding.docId!==docId || binding.lineId!==row.id || binding.scopeId!==row.scopeId ||
      !['folder','flow'].includes(row.scopeKind) || !Number.isInteger(row.depth) || row.depth<0 || typeof row.scopeTitle!=='string' || !row.scopeTitle.trim())return null;
    const prefix='  '.repeat(row.depth)+'- '+(row.scopeKind==='folder'?'/':'');
    return raw===prefix+row.scopeTitle?{bodyFrom:prefix.length,bodyTo:raw.length}:null;
  }
  if(row.kind==='task' || row.kind==='subcheck'){
    if(!parts || typeof row.title!=='string' || !row.title || parts[4]!==row.title)return null;
    const bodyFrom=parts[1].length+parts[2].length+parts[3].length;
    return {bodyFrom,bodyTo:bodyFrom+parts[4].length};
  }
  if(row.kind==='heading'){
    const prefix=/^ *#{1,6}\s+/.exec(raw);
    return prefix && raw.slice(prefix[0].length).trim()?{bodyFrom:prefix[0].length,bodyTo:raw.length}:null;
  }
  return null;
}

function createV11Codec(model) {
  const proposals = new WeakMap();
  function open(input) {
    let baseline;
    try { canonical(input);baseline=JSON.parse(JSON.stringify(input));if(!model.validate(baseline))throw Error('INVALID_V11'); }
    catch { return {ok:false,reason:'UNSUPPORTED_V11_INPUT',preservedInput:input}; }
    freeze(baseline);
    function support(doc,row,state=baseline) {
      if (!state.documents.some(d=>d.id===doc.id)) return 'FLOW_READ_ONLY';
      if (row.depth!==0) return 'NESTED_ROW_UNSUPPORTED';
      if(row.parentLineId!==null){
        const parent=row.kind==='blank'?model.rowMeta(state,doc.id).find(r=>r.id===row.parentLineId):null;
        if(!parent||parent.kind!=='note'||parent.depth!==0||parent.parentLineId!==null)return 'NESTED_ROW_UNSUPPORTED';
      }
      if (row.kind==='note' || row.kind==='blank') return null;
      if (row.kind!=='task' || row.isReference || !row.isCanonical || row.progressTargetId!==row.id) return 'STRUCTURAL_OR_REFERENCE_UNSUPPORTED';
      if (row.subtreeEndIndex>row.index+1 || state.bindings.some(b=>b.kind==='task' && b.taskId===row.id)) return 'RELATED_ROWS_UNSUPPORTED';
      return null;
    }
    function projection(state=baseline) {
      return {schema:'rea-v11-codec-view/1',documents:docs(state).map(doc=>{
        const rows=model.rowMeta(state,doc.id);
        return {id:doc.id,title:doc.title,source:state.documents.some(d=>d.id===doc.id)?'document':'flow',rows:doc.lines.map(line=>{
          const row=rows.find(r=>r.id===line.id),parts=frame(line.text),target=row?.progressTargetId??null;
          const records=target?state.progressRecords.filter(r=>r.taskId===target):[];
          const latest=records.reduce((a,b)=>!a || b.date>a.date?b:a,null);
          const editableReason=row?support(doc,row,state):'OPAQUE_ROW';
          const task=target?{title:row.title??row.task?.title??'',exactToken:parts?.[2]??null,currentPercent:model.currentProgress(state,target),latestRecorded:latest?clone(latest):null,history:clone(records)}:null;
          // Display metadata only. Classification and editability remain owned by
          // the existing v11 model; raw notes never acquire folder semantics here.
          let semantic=null;
          if(row&&editableReason!==null&&['date','scope','task','subcheck','property','heading'].includes(row.kind)){
            const check=row.kind==='task'||row.kind==='subcheck',scopeKind=row.kind==='scope'?row.scopeKind:null;
            const label=row.isReference?'연결':row.kind==='scope'?(scopeKind==='flow'?'Flow':'폴더'):({date:'날짜',task:'할 일',subcheck:'하위 체크',property:'속성',heading:'제목'})[row.kind];
            semantic={kind:row.kind,label,title:row.kind==='date'?(row.date??'미정'):row.scopeTitle??row.title??row.task?.title??'',
              depth:row.depth,reference:!!row.isReference,scopeKind:scopeKind??null,date:row.kind==='date'?row.date??null:null,dateValid:row.kind==='date'?row.valid:null,
              checked:check?!!row.done:null,currentPercent:check?(task?.currentPercent??row.progressPercent??(row.done?100:0)):null,
              presentation:readonlyPresentation(line.text,row,parts,doc.id)};
          }
          return {id:line.id,raw:line.text,kind:row?.kind??'opaque',entityId:target,editableReason,task,semantic};
        })};
      })};
    }
    const reject = (reason,operation) => ({ok:false,reason,preservedInput:operation,unchangedSnapshot:clone(baseline)});
    function finish(next,operation) {
      if(!model.validate(next))return reject('INVALID_V11_PROPOSAL',operation);
      const proposal=freeze({ok:true,schema:'rea-v11-proposal/1',changed:!same(next,baseline),snapshot:clone(next)});
      proposals.set(proposal,freeze({expectedSnapshot:clone(baseline),proposedSnapshot:clone(next),operation:clone(operation)}));return proposal;
    }
    function prepareProgress(operation) {
      const correction=Object.hasOwn(operation,'correctionAsOfDate');
      if(!exactKeys(operation,['kind','documentId','lineId','expectedText','date','percent',...(correction?['correctionAsOfDate']:[])]))return reject('UNSUPPORTED_OPERATION_SHAPE',operation);
      const validDate=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00.000Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;};
      if(!validDate(operation.date)||!Number.isInteger(operation.percent)||operation.percent<0||operation.percent>100)return reject('INVALID_PROGRESS',operation);
      const doc=baseline.documents.find(d=>d.id===operation.documentId),line=doc?.lines.find(l=>l.id===operation.lineId);
      if(!line||line.text!==operation.expectedText)return reject('STALE_OR_MISSING_TARGET',operation);
      const row=model.rowMeta(baseline,doc.id).find(r=>r.id===line.id),unsupported=row?support(doc,row):'OPAQUE_ROW';
      if(unsupported)return reject(unsupported,operation);if(row.kind!=='task')return reject('TASK_REQUIRED',operation);
      const parts=frame(line.text);if(!parts)return reject('UNKNOWN_TASK_FRAME',operation);
      const numeric=model.parseProgressToken(parts[2]),at=baseline.progressRecords.findIndex(r=>r.taskId===line.id&&r.date===operation.date);
      if(correction&&(!validDate(operation.correctionAsOfDate)||operation.date>=operation.correctionAsOfDate||!numeric.ok||at<0))return reject('INVALID_PAST_CORRECTION',operation);
      const next=correction?model.correctProgressRecord(clone(baseline),line.id,operation.date,operation.percent,operation.correctionAsOfDate):model.recordProgress(clone(baseline),line.id,operation.date,operation.percent);
      const expected=clone(baseline),record={taskId:line.id,date:operation.date,percent:operation.percent};
      if(at<0)expected.progressRecords.push(record);else expected.progressRecords[at]=record;
      if(!correction){
        let token=parts[2];
        if(numeric.ok)token=numeric.percent===operation.percent?parts[2]:String(operation.percent)+'%';
        else{const latest=expected.progressRecords.filter(r=>r.taskId===line.id).reduce((a,b)=>!a||b.date>a.date?b:a,null);if(row.done!==(latest.percent===100))token=latest.percent===100?'x':' ';}
        expected.documents.find(d=>d.id===doc.id).lines.find(l=>l.id===line.id).text=parts[1]+token+parts[3]+parts[4]+parts[5];
      }
      if(!same(next,expected))return reject('PROGRESS_RESULT_UNSUPPORTED',operation);
      return finish(next,operation);
    }
    function prepareMemoLines(operation) {
      if(!exactKeys(operation,['kind','documentId','lineId','expectedText','lines'])||!Array.isArray(operation.lines)||operation.lines.length<2)return reject('UNSUPPORTED_ENTER_SHAPE',operation);
      const doc=baseline.documents.find(d=>d.id===operation.documentId),index=doc?.lines.findIndex(l=>l.id===operation.lineId);
      if(!doc||index<0||doc.lines[index].text!==operation.expectedText)return reject('STALE_OR_MISSING_TARGET',operation);
      const row=model.rowMeta(baseline,doc.id).find(r=>r.id===operation.lineId);
      if(!row||support(doc,row)||!['note','blank'].includes(row.kind))return reject('ENTER_TARGET_UNSUPPORTED',operation);
      const used=new Set([...docs(baseline).flatMap(d=>[d.id,...d.lines.map(l=>l.id)]),...baseline.folders.map(f=>f.id)]),added=new Set();
      for(let i=0;i<operation.lines.length;i++){
        const line=operation.lines[i];
        if(!exactKeys(line,['id','text'])||typeof line.id!=='string'||!line.id.trim()||['__proto__','constructor','prototype'].includes(line.id)||typeof line.text!=='string'||/[\r\n]/.test(line.text)||added.has(line.id)||i===0&&line.id!==operation.lineId||i>0&&used.has(line.id))return reject('ENTER_ID_OR_TEXT_UNSUPPORTED',operation);
        added.add(line.id);
      }
      const next=clone(baseline);next.documents.find(d=>d.id===doc.id).lines.splice(index,1,...clone(operation.lines));
      if(!model.validate(next))return reject('INVALID_V11_PROPOSAL',operation);
      const after=model.rowMeta(next,doc.id);
      if(operation.lines.some(line=>{const row=after.find(r=>r.id===line.id);return!row||support(doc,row,next)||!['note','blank'].includes(row.kind);}))return reject('ENTER_SEMANTIC_CHANGE_UNSUPPORTED',operation);
      return finish(next,operation);
    }
    function prepareTaskLines(operation){
      if(!exactKeys(operation,['kind','documentId','lineId','expectedText','lines'])||!Array.isArray(operation.lines)||operation.lines.length<2)return reject('UNSUPPORTED_ENTER_SHAPE',operation);
      const doc=baseline.documents.find(d=>d.id===operation.documentId),index=doc?.lines.findIndex(l=>l.id===operation.lineId),source=doc?.lines[index];
      if(!source||source.text!==operation.expectedText)return reject('STALE_OR_MISSING_TARGET',operation);
      const row=model.rowMeta(baseline,doc.id).find(r=>r.id===source.id);
      if(!row||support(doc,row)||row.kind!=='task'||!/^\- \[ \] (.+)$/.test(source.text))return reject('ENTER_TASK_FRAME_UNSUPPORTED',operation);
      const used=new Set([...docs(baseline).flatMap(d=>[d.id,...d.lines.map(l=>l.id)]),...baseline.folders.map(f=>f.id)]),added=new Set();
      for(let i=0;i<operation.lines.length;i++){
        const line=operation.lines[i];
        if(!exactKeys(line,['id','text'])||typeof line.id!=='string'||!line.id.trim()||['__proto__','constructor','prototype'].includes(line.id)||added.has(line.id)||i===0&&line.id!==source.id||i>0&&used.has(line.id))return reject('ENTER_TASK_ID_UNSUPPORTED',operation);
        if(typeof line.text!=='string'||!line.text.trim()||line.text!==line.text.trim()||/[\r\n]/.test(line.text)||line.text.length>240)return reject('TITLE_UNSUPPORTED',operation);
        added.add(line.id);
      }
      if(operation.lines.reduce((sum,line)=>sum+line.text.length,0)>240)return reject('TITLE_UNSUPPORTED',operation);
      // Reuse the existing explicit F05 model path, then bind its one fresh ID
      // to the core reservation. Never copy a record onto a new suffix task.
      let next=model.updateTask(clone(baseline),source.id,{title:operation.lines.map(l=>l.text).join('')});
      for(let i=1;i<operation.lines.length;i++){
        const ownerId=operation.lines[i-1].id,current=next.documents.find(d=>d.id===doc.id),owner=current.lines.find(l=>l.id===ownerId),raw=current.lines.map(l=>l.text).join('\n');
        const ownerIndex=current.lines.indexOf(owner),start=current.lines.slice(0,ownerIndex).reduce((n,l)=>n+l.text.length+1,0)+6+operation.lines[i-1].text.length;
        const changed=model.editTextResult(next,doc.id,raw.slice(0,start)+'\n- [ ] '+raw.slice(start),{inputSplice:{start,end:start,text:'\n- [ ] '},taskSplit:{kind:'task-title-split',sourceLineId:ownerId,sourceRaw:raw}});
        if(changed.reason)return reject('ENTER_TASK_MODEL_REJECTED',operation);
        next=changed.state;const lines=next.documents.find(d=>d.id===doc.id).lines,newLine=lines[ownerIndex+1],generated=newLine?.id;
        if(!generated||generated===ownerId||newLine.text!=='- [ ] '+operation.lines.slice(i).map(l=>l.text).join(''))return reject('ENTER_TASK_MODEL_MISMATCH',operation);
        newLine.id=operation.lines[i].id;
        for(const field of ['taskScopes','itemScopes'])if(Object.hasOwn(next[field],generated)){next[field][newLine.id]=next[field][generated];delete next[field][generated];}
      }
      if(!model.validate(next)||!same(next.progressRecords,baseline.progressRecords))return reject('ENTER_TASK_RECORDS_MUST_BE_PRESERVED',operation);
      const expected=clone(baseline);expected.documents.find(d=>d.id===doc.id).lines.splice(index,1,...operation.lines.map(l=>({id:l.id,text:'- [ ] '+l.text})));
      for(const part of operation.lines.slice(1))for(const field of ['taskScopes','itemScopes'])if(Object.hasOwn(expected[field],source.id))expected[field][part.id]=clone(expected[field][source.id]);
      if(!same(next,expected))return reject('ENTER_TASK_MODEL_MISMATCH',operation);
      return finish(next,operation);
    }
    function prepare(operation={kind:'noop'}) {
      try { canonical(operation); } catch { return reject('UNSUPPORTED_OPERATION_VALUE',operation); }
      if (!operation || typeof operation!=='object' || Array.isArray(operation)) return reject('UNSUPPORTED_OPERATION_SHAPE',operation);
      if(operation.kind==='splitMemoLines')return prepareMemoLines(operation);
      if(operation.kind==='splitTaskLines')return prepareTaskLines(operation);
      if(operation.kind==='recordProgress')return prepareProgress(operation);
      let next=clone(baseline);
      if (!exactKeys(operation,['kind']) || operation.kind!=='noop') {
        const rename=operation.kind==='renameTask',memo=operation.kind==='replaceMemo';
        if (!rename && !memo) return reject('UNSUPPORTED_OPERATION',operation);
        if (!exactKeys(operation,['kind','documentId','lineId','expectedText',rename?'title':'text'])) return reject('UNSUPPORTED_OPERATION_SHAPE',operation);
        const doc=baseline.documents.find(d=>d.id===operation.documentId),line=doc?.lines.find(l=>l.id===operation.lineId);
        if (!line || line.text!==operation.expectedText) return reject('STALE_OR_MISSING_TARGET',operation);
        const row=model.rowMeta(baseline,doc.id).find(r=>r.id===line.id),unsupported=row?support(doc,row):'OPAQUE_ROW';
        if (unsupported) return reject(unsupported,operation);
        const value=rename?operation.title:operation.text;
        if (typeof value!=='string' || /[\r\n]/.test(value)) return reject('MULTILINE_UNSUPPORTED',operation);
        if (rename) {
          if (row.kind!=='task' || !value.trim() || value!==value.trim() || value.length>240) return reject('TITLE_UNSUPPORTED',operation);
          const parts=frame(line.text);if(!parts)return reject('UNKNOWN_TASK_FRAME',operation);
          next=model.updateTask(clone(baseline),line.id,{title:value});
          const expected=clone(baseline);expected.documents.find(d=>d.id===doc.id).lines.find(l=>l.id===line.id).text=parts[1]+parts[2]+parts[3]+value+parts[5];
          if(!same(next,expected))return reject('MODEL_SIDE_EFFECT_UNSUPPORTED',operation);
        } else {
          if (!['note','blank'].includes(row.kind)) return reject('MEMO_TARGET_REQUIRED',operation);
          next.documents.find(d=>d.id===doc.id).lines.find(l=>l.id===line.id).text=value;
        }
        if (!model.validate(next)) return reject('INVALID_V11_PROPOSAL',operation);
        const after=model.rowMeta(next,doc.id).find(r=>r.id===line.id);
        if (!after || support(doc,after) || (memo?!['note','blank'].includes(after.kind):after.kind!=='task')) return reject('SEMANTIC_CHANGE_UNSUPPORTED',operation);
        if (memo) {const expected=clone(baseline);expected.documents.find(d=>d.id===doc.id).lines.find(l=>l.id===line.id).text=value;if(!same(next,expected))return reject('UNRELATED_CHANGE_UNSUPPORTED',operation);}
      }
      if(!model.validate(next))return reject('INVALID_V11_PROPOSAL',operation);
      const proposal=freeze({ok:true,schema:'rea-v11-proposal/1',changed:!same(next,baseline),snapshot:clone(next)});
      proposals.set(proposal,freeze({expectedSnapshot:clone(baseline),proposedSnapshot:clone(next),operation:clone(operation)}));
      return proposal;
    }
    return {ok:true,view:()=>clone(projection()),roundTrip:()=>clone(baseline),prepare};
  }
  return {open,inspectProposal:proposal=>proposals.has(proposal)?clone(proposals.get(proposal)):null};
}
module.exports={createV11Codec,canonical};
