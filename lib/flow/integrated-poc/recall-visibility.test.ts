import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
const recall = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTaskRecall.tsx', import.meta.url), 'utf8');
const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');

test('hidden execution rows never reconstruct continuation chains; every visible period uses the exact saved text', () => {
  const body = /const continuationStarts = useMemo\(\(\) => (.*), \[period, space\.text\]\);/.exec(space)![1];
  const js = ts.transpileModule(`result = ${body}`, {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const text = { marker: 'saved snapshot' }, expected = new Map([['line', '2026-11-01']]);
  for (const period of ['documents', 'today', 'week', 'month', 'all', 'undated']) {
    let calls = 0;
    const context = { result:null as unknown, period, space:{text}, programContinuationStarts:(actual:unknown) => {calls++;assert.equal(actual,text);return expected;} };
    vm.runInNewContext(js,context);
    assert.equal(calls,period === 'documents' ? 0 : 1);
    if (period === 'documents') assert.equal((context.result as Map<string,string>).size,0);
    else assert.equal(context.result,expected);
  }
  assert(space.includes('hidden={period === \'documents\'}'));
});
test('only the active native writing surface installs recall listeners; dismissal refs survive inactive views', () => {
  const expression = /const recallActive = (.*);/.exec(editor)![1];
  assert(editor.includes('{props.recallSource && props.onTaskRecall && <ProgramTaskRecall'));
  const effect = recall.indexOf('  useEffect(() => {\n    if (!active) return;'.replace(/\n/g, recall.includes('\r\n') ? '\r\n' : '\n'));
  assert(effect > 0);
  const body = recall.slice(effect + '  useEffect(() => {'.length, recall.indexOf('    const isSurface', effect));
  for (const active of [false, true]) assert.equal(vm.runInNewContext(`(() => {${body} return true;})()`, { active, composing:{current:false}, portRef:{current:{isComposing:()=>false}} }), active ? true : undefined);
  assert(recall.includes('}, [active]);'));
  for (const active of [undefined, false, true]) for (const authoringMode of [false, true])
    for (const folderId of ['', 'folder']) for (const readOnly of [false, true]) {
      const props = { active, authoringMode, folderId, readOnly };
      assert.equal(vm.runInNewContext(expression, { props }), active !== false && authoringMode && !folderId && !readOnly);
    }
});

test('lost compositionend across inactive views cannot leave recall stuck; a still-composing host remains protected', () => {
  const a = recall.indexOf('  useEffect(() => {\n    if (!active) return;'.replace(/\n/g, recall.includes('\r\n')?'\r\n':'\n'));
  const b = recall.indexOf('  useEffect(() => { if (!active) hide(); }', a);
  assert(a > 0 && b > a);
  const code = ts.transpileModule(recall.slice(a,b).replace('useEffect(', '__effect('), {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const events = new Map<string, Function>(), area={getAttribute:()=>null}, composing={current:false}, scheduled:number[]=[];
  let hostComposing=false, cleanup:Function=()=>{};
  const target={addEventListener:(n:string,fn:Function)=>events.set(n,fn),removeEventListener:(n:string)=>events.delete(n)};
  const ctx:any={__effect:(fn:Function)=>{cleanup=fn();}, active:true,portRef:{current:{surface:()=>area,isComposing:()=>hostComposing,coverBar:()=>{}}},
    composing,inputAt:{current:0},current:{current:null},suppressed:{current:false},performance:{now:()=>0},id:'recall',
    cancel:()=>{},hide:()=>{},schedule:(n=300)=>scheduled.push(n),document:target,window:{...target,visualViewport:null},localStorage:{getItem:()=>null}};
  const mount=()=>vm.runInNewContext(code,ctx);
  mount();hostComposing=true;events.get('compositionstart')!({target:area});assert.equal(composing.current,true);
  cleanup();assert.equal(composing.current,false);assert.equal(events.has('compositionend'),false);
  hostComposing=false;mount();assert.equal(composing.current,false);events.get('input')!({target:area});assert.deepEqual(scheduled,[300]);
  cleanup();hostComposing=true;mount();assert.equal(composing.current,true);
  hostComposing=false;events.get('compositionend')!({target:area});assert.equal(composing.current,false);assert.deepEqual(scheduled,[300,300]);cleanup();
});
test('the real composition-end handler schedules the existing300ms quiet window without measuring or choosing', () => {
  const expression = /const end = (\(event: Event\) => \{.*\});/.exec(recall)![1].replace('(event: Event)', '(event)');
  const calls: number[] = [], composing = { current: true }, fn = vm.runInNewContext(expression, { isSurface: () => true, composing, schedule: (n: number) => calls.push(n) });
  fn({}); assert.equal(composing.current, false); assert.deepEqual(calls, [300]);
});
test('phone placement never asks for caret geometry; desktop placement still does', () => {
  const a = recall.indexOf('const box = phone ?'), b = recall.indexOf('present({ frame, rows, navigation:', a);
  assert(a > 0 && b > a); const code = `(() => { ${recall.slice(a, b)} return {left,top,width}; })()`;
  for (const phone of [true, false]) { let measured = 0;
    const frame = { line: { start: 3 } }, rows = [1,2,3], width = 360;
    const actual = vm.runInNewContext(code, { phone, frame, rows, width, window: { innerWidth:390, innerHeight:844, visualViewport:null }, portRef:{ current:{ caret:()=>{measured++;return{left:20,bottom:200};} } }, area:{getBoundingClientRect:()=>{throw Error('unexpected fallback');}} });
    assert.equal(measured, phone ? 0 : 1); assert.equal(actual.left, phone ? 15 : 20); assert.equal(actual.top, phone ? 623 : 208);
  }
});
test('deadline calculation and render share exactly the previous visibility condition across hidden states', () => {
  const expression = /const todayUnfiltered = (.*);/.exec(space)![1];
  const visible = /const todayHere = \(\) => (.*);/.exec(space)![1];
  assert(space.includes('useMemo(() => todayUnfiltered ? programDueSoonTasks(space, today) : []'));
  assert.equal(expression, 'todayHere()');
  for (const period of ['today','documents','month','all']) for (const date of ['2026-11-14','2026-11-13'])
    for (const folderTab of [false,true]) for (const selecting of [null,{}]) for (const monthGrid of [false,true])
      for (const folderId of ['', 'folder']) for (const query of ['', '찾기']) {
        const today='2026-11-14', expected=period==='today'&&date===today&&!folderTab&&!selecting&&!monthGrid&&!folderId&&!query;
        assert.equal(vm.runInNewContext(`(() => {const todayHere=()=>${visible};return ${expression};})()`,{period,date,today,folderTab,selecting,monthGrid,folderId,query}),expected);
      }
});
