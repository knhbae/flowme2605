import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import ts from 'typescript';
import {createProgramData,validateProgramData} from './program-data';
import {programClone,programFailure,programResult,type ProgramWritingPosition} from './contract';
import {programSame} from './controller';
import {textWorkspaceModel as M} from './text-workspace';
import {moveProgramPersonalTaskText} from './task-document-move';
import {normalizeProgramWritingPosition} from './writing-position';
import {programCheckpointForWritingTarget} from './writing-navigation';
function fixture(){const data=createProgramData(),actorId=data.activeActorId,s=data.spaces[actorId];s.text=M.addDocument(s.text,{title:'출발'});const from=s.text.documents.at(-1)!.id;s.text=M.editText(s.text,from,'자유 메모\n- [ ] 이동할 일\n  - 메모: 개인\n  - [ ] 하위');const task=M.tasks(s.text)[0];s.text=M.recordProgress(s.text,task.id,'2026-09-12',20);s.text=M.addDocument(s.text,{title:'도착'});const to=s.text.documents.at(-1)!.id;s.text=moveProgramPersonalTaskText(s.text,task.id,to)!;return{data,actorId,from,to,task};}
test('moved/deleted anchors normalize only presentation without following foreign documents',()=>{
  const{data,actorId,from,task}=fixture(),text=data.spaces[actorId].text,before=programClone(text);
  const cached={documentId:from,lineId:task.id,start:6,end:10,scrollTop:99};const oldWriter=programClone(data);oldWriter.spaces[actorId].position=cached;assert.equal(validateProgramData(oldWriter),false);assert.deepEqual(normalizeProgramWritingPosition(text,cached),{documentId:from,lineId:null,start:0,end:0,scrollTop:0});
  assert.deepEqual(normalizeProgramWritingPosition(text,{...cached,documentId:'deleted'}),{documentId:null,lineId:null,start:0,end:0,scrollTop:0});assert.deepEqual(text,before);
});
const source=readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx',import.meta.url),'utf8'),ast=ts.createSourceFile('Space.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let handler:ts.FunctionDeclaration|undefined;function visit(node:ts.Node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='openDocument')handler=node;ts.forEachChild(node,visit);}visit(ast);assert(handler);
const code=ts.transpileModule(`const value=${handler.getText(ast)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
test('actual openDocument handler normalizes moved cache without mutation and hands exact focus to App history',async()=>{
  const{data,actorId,from,to,task}=fixture();let live=data,focused:number[]|null=null,navigated:any=null;const records=programClone(data.spaces[actorId].text.progressRecords),positions={current:{[from]:{documentId:from,lineId:task.id,start:6,end:10,scrollTop:40}} as Record<string,ProgramWritingPosition>};
  const context={actorId,selected:from,positions,programClone,programFailure,programResult,programSame,normalizeProgramWritingPosition,M,
    setTaskNotice:(value:unknown)=>assert.equal(value,null),
    inputLockCount:{current:0},dirty:{current:{}},recurrencePorts:{current:{}},setFolderId:(value:string)=>{assert.equal(value,'');},
    run:async(_label:string,build:any)=>{const result=build(live);if(result.ok){assert(validateProgramData(result.data));assert.equal(result.changed,false);assert.equal(result.data,live);live=result.data;}return result;},setSelected:()=>{},setLibraryOpen:()=>{},setOpened:()=>{},setPeriod:()=>{},props:{onRegisterNavigation:()=>{},navigate:(value:any,options:any)=>{navigated=value;const checkpoint=programCheckpointForWritingTarget(live,value,options.writingLineId,null);assert(checkpoint);assert.equal(checkpoint.focus,`program-text-${encodeURIComponent(value.id)}`);const position=checkpoint.writing![value.id];focused=[position.start,position.end];}},requestAnimationFrame:()=>{throw Error('Space must not race App focus');}};
  const open=new Function(...Object.keys(context),`${code};return value;`)(...Object.values(context));await open(to,task.id);assert.equal(navigated.id,to);assert.equal(live.spaces[actorId].position.lineId,null);assert.deepEqual(live.spaces[actorId].text.progressRecords,records);assert.deepEqual(live.spaces[actorId].text,data.spaces[actorId].text);
  const doc=M.getDocument(live.spaces[actorId].text,to)!,index=doc.lines.findIndex(line=>line.id===task.id),offset=doc.lines.slice(0,index).reduce((sum,line)=>sum+line.text.length+1,0);assert.deepEqual(focused,[offset,offset]);
  assert.equal(live,data);assert.equal(positions.current[from].lineId,null);
  navigated=null;focused=null;const beforeMissing=programClone(live);await open(from,task.id);assert.equal(navigated,null);assert.equal(focused,null);assert.deepEqual(live,beforeMissing);
  await open(to,'deleted-line');assert.equal(navigated,null);assert.equal(focused,null);assert.deepEqual(live,beforeMissing);
  navigated=null;live=programClone(live);live.activeActorId='creator-minji';await open(to,task.id);assert.equal(navigated,null);
});

function restorationHarness(owner: 'app' | 'alpha', timing: 'during-navigation' | 'after-navigation' = 'after-navigation') {
  const f = fixture(), { data, actorId, from, to, task } = f;
  const before = JSON.stringify(data), frames: (() => void)[] = [], calls: string[] = [];
  const positions = { current: {} as Record<string, ProgramWritingPosition> };
  const selectedRef = { current: from }, presentation = { current: { period: 'week' } };
  const documentsRef = { current: [...data.spaces[actorId].text.documents, ...data.spaces[actorId].text.flows] };
  const doc = M.getDocument(data.spaces[actorId].text, to)!;
  const renderedLine = { offsetTop: 800, offsetHeight: 44 };
  const textarea = { value: M.raw(doc), readOnly: false, selectionStart: 17, selectionEnd: 17, scrollTop: 123, clientHeight: 240,
    getClientRects: () => [{}], setSelectionRange(start: number, end: number) { this.selectionStart = start; this.selectionEnd = end; },
    closest: () => ({ querySelectorAll: () => doc.lines.map(() => renderedLine) }), scrollIntoView: () => calls.push('reveal') };
  let appRestore: (() => void) | undefined;
  const context = { actorId, selected: from, positions, programFailure, programResult, normalizeProgramWritingPosition, M,
    setTaskNotice: (value: unknown) => assert.equal(value, null),
    inputLockCount: { current: 0 }, dirty: { current: {} }, recurrencePorts: { current: {} }, setFolderId: (value: string) => { assert.equal(value, ''); },
    selectedRef, presentation, documentsRef, root: { current: { contains: (node: unknown) => node === textarea } },
    document: { getElementById: (id: string) => id === `program-text-${encodeURIComponent(to)}` ? textarea : null },
    sourceFocusPorts: { current: { [to]: (target: { documentId: string; lineId: string; raw: string }) => {
      assert.deepEqual(target, { documentId: to, lineId: task.id, raw: textarea.value }); calls.push('native-focus'); return true;
    } } },
    run: async (_label: string, build: any, history: boolean) => {
      assert.equal(history, false); const result = build(data); assert(result.ok); assert.equal(result.data, data); assert.equal(result.changed, false); return result;
    }, setMessage: () => calls.push('message'), setLibraryOpen() {}, setOpened() {},
    setSelected: (id: string) => { selectedRef.current = id; }, setPeriod: (period: string) => { presentation.current.period = period; },
    props: { onRegisterNavigation: owner === 'app' ? () => {} : undefined,
      navigate: (destination: any, options?: { writingLineId: string }) => {
        calls.push('navigate'); if (owner !== 'app' || !options?.writingLineId) return;
        const checkpoint = programCheckpointForWritingTarget(data, destination, options.writingLineId, null); assert(checkpoint);
        appRestore = () => {
          // Simulate the two App restore stages using its actual checkpoint.
          const writing = checkpoint.writing![to];
          positions.current[to] = { documentId: to, lineId: task.id, ...writing };
          textarea.setSelectionRange(writing.start, writing.end); textarea.scrollTop = writing.scrollTop;
          calls.push('app-checkpoint-focus');
        };
        if (timing === 'during-navigation') appRestore();
      } }, requestAnimationFrame: (callback: () => void) => { frames.push(callback); return frames.length; },
  };
  const open = new Function(...Object.keys(context), `${code};return value;`)(...Object.values(context));
  return { ...f, before, frames, calls, textarea, open,
    finishApp: () => { if (timing === 'after-navigation') appRestore?.(); },
    flush: () => { frames.splice(0).forEach(callback => callback()); } };
}

test('ordinary document opening schedules no Space focus frame in either shell', async () => {
  for (const owner of ['app', 'alpha'] as const) {
    const h = restorationHarness(owner); await h.open(h.to); h.finishApp(); h.flush();
    assert.equal(h.frames.length, 0); assert.deepEqual(h.calls, ['navigate']);
    assert.equal(h.textarea.selectionStart, 17); assert.equal(h.textarea.scrollTop, 123);
    assert.equal(JSON.stringify(h.data), h.before);
  }
});

test('App explicit origin retains sole checkpoint focus whether its restoration runs before or after navigation settles', async () => {
  for (const timing of ['during-navigation', 'after-navigation'] as const) {
    const h = restorationHarness('app', timing); await h.open(h.to, h.task.id);
    // No Space callback exists to reset an earlier App restore or race a later one.
    assert.equal(h.frames.length, 0, timing); h.finishApp(); h.flush();
    assert.deepEqual(h.calls, ['navigate', 'app-checkpoint-focus']);
    const doc = M.getDocument(h.data.spaces[h.actorId].text, h.to)!;
    const index = doc.lines.findIndex(line => line.id === h.task.id);
    const offset = doc.lines.slice(0, index).reduce((sum, line) => sum + line.text.length + 1, 0);
    assert.equal(h.textarea.selectionStart, offset); assert.equal(h.textarea.selectionEnd, offset);
    assert.equal(h.textarea.scrollTop, 0); assert.equal(JSON.stringify(h.data), h.before);
  }
});

test('Alpha explicit origin schedules exactly one native restore without adding a checkpoint writer', async () => {
  const h = restorationHarness('alpha'); await h.open(h.to, h.task.id);
  assert.equal(h.frames.length, 1); h.flush();
  assert.deepEqual(h.calls, ['navigate', 'native-focus', 'reveal']);
  // Retain context above the target while placing its row above the viewport's
  // 44px bottom inset, using the same explicit geometry as a real textarea.
  assert.equal(h.textarea.scrollTop, 648);
  assert.equal(800 + 44 - h.textarea.scrollTop, h.textarea.clientHeight - 44);
  assert.equal(JSON.stringify(h.data), h.before);
});
