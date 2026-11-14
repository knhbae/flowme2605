import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

// Execute the real component/effects, including a callback already running when input or a new ACK arrives.
const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTaskRecall.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function host() {
  let now = 0, serial = 0, cursor = 0, clean = true, hostComposing = false, validQuery = true, stateWrites = 0, frames = 0, geometry = 0, posts = 0, disposals = 0;
  const tasks = new Map<number, { at: number; fn: Function }>(), hooks: any[] = [], effects: Function[] = [], listeners = new Map<string, Function>();
  const attrs = new Map<string, string>(), area = { setAttribute: (n: string, v: string) => attrs.set(n,v), removeAttribute: (n: string) => attrs.delete(n), getAttribute: (n: string) => attrs.get(n) ?? null, getBoundingClientRect: () => { geometry++;return { left: 20, top: 30 }; } };
  const target = { addEventListener: (n: string, fn: Function) => listeners.set(n,fn), removeEventListener: (n: string) => listeners.delete(n) };
  const jobs: { source: any; resolve: (rows: any[]) => void }[] = [];
  const computer = { run: (source: any) => { posts++; return new Promise<any[]>(resolve => jobs.push({source,resolve})); }, cancel: () => {}, dispose: () => {disposals++;} };
  const react = { useId: () => 'quiet-panel', useRef: (v: any) => { const n=cursor++; return hooks[n] ??= {current:v}; },
    useState: (v: any) => { const n=cursor++; hooks[n] ??= {value:v};return [hooks[n].value,(v: any)=>{hooks[n].value=v;stateWrites++;}]; },
    useEffect: (fn: Function, deps: any[]) => { const n=cursor++,old=hooks[n];if(!old||deps.some((v,i)=>!Object.is(v,old.deps[i])))effects.push(()=>{old?.cleanup?.();hooks[n]={deps,cleanup:fn()};}); } };
  const timeout = (fn: Function, delay=0) => {const id=++serial;tasks.set(id,{at:now+delay,fn});return id;};
  const jsx = (type: any, props: any) => ({type,props}); const exports: any = {};
  const context: any = { exports, performance:{now:()=>now}, setTimeout:timeout, clearTimeout:(id:number)=>tasks.delete(id),
    document:{...target,activeElement:area}, localStorage:{getItem:()=>null}, Element:class {},
    window:{...target,innerWidth:1280,innerHeight:800,visualViewport:null,matchMedia:()=>({matches:false}),requestIdleCallback:(fn:Function)=>timeout(fn),cancelIdleCallback:(id:number)=>tasks.delete(id)},
    require:(name:string)=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='react-dom'?{createPortal:(node:any)=>node}:name.endsWith('task-recall-compute')?{createProgramRecallComputer:()=>computer}:name.endsWith('task-recall')?{programRecallChoices:()=>[row],programRecallKey:()=>({kind:'none'})}:name.endsWith('date-label')?{}:{default:{}} };
  const row = {lineId:'old-line',documentId:'old-document',title:'합성 할 일',folder:'/',done:false,percent:0};
  const frame = {line:{lineId:'line',query:'합성',start:0,folder:'/'},raw:'- [ ] 합성',documentId:'document',owner:{},generation:1};
  let props: any = {active:true,settled:true,source:{ownerId:'synthetic-a',space:{revision:1},today:'2026-11-14'},port:{surface:()=>area,isComposing:()=>hostComposing,
    settled:(saved:any)=>clean&&saved.space===props.source.space&&saved.ownerId===props.source.ownerId,frame:()=>{frames++;return validQuery ? frame : null;},caret:()=>{geometry++;return{left:20,bottom:100};},choose:()=>{},coverBar:()=>{}}};
  vm.runInNewContext(code,context);
  const render=(patch:any={})=>{props={...props,...patch};cursor=0;exports.ProgramTaskRecall(props);while(effects.length)effects.shift()!();};
  const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
  const advance=async(ms:number)=>{const end=now+ms;for(;;){const next=[...tasks].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;tasks.delete(next[0]);now=next[1].at;next[1].fn();await flush();}now=end;await flush();};
  const event=(name:string)=>listeners.get(name)?.({target:area});
  render();return {render,advance,event,flush,jobs,resolve:(n:number)=>jobs[n].resolve([row]),reply:async(n:number)=>{jobs[n].resolve([row]);await flush();await advance(0);},get counts(){return{stateWrites,frames,geometry,posts,disposals};},
    set validQuery(v:boolean){validQuery=v;},set clean(v:boolean){clean=v;},set composing(v:boolean){hostComposing=v;},get source(){return props.source;},get pending(){return tasks.size;},
    unmount:()=>{for(const hook of hooks)hook?.cleanup?.();} };
}

test('310ms pause cannot index or measure dirty input; clean ACK wakes one quiet task', async()=>{
  const h=host();h.clean=false;h.event('input');h.render({settled:false});await h.advance(450);assert.deepEqual(h.counts,{stateWrites:0,frames:0,geometry:0,posts:0,disposals:0});
  h.clean=true;h.render({settled:true});await h.advance(299);assert.equal(h.counts.posts,0);await h.advance(1);assert.equal(h.counts.posts,1);await h.reply(0);assert.equal(h.counts.frames,2);assert.equal(h.counts.stateWrites,1);h.unmount();
});
test('running index reply after fresh typing caches only; it never renders, measures, or replaces the new quiet timer',async()=>{
  const h=host();await h.advance(300);h.event('input');h.clean=false;h.render({settled:false});await h.reply(0);assert.equal(h.counts.frames,1);assert.equal(h.counts.stateWrites,0);assert.equal(h.counts.geometry,0);await h.advance(600);assert.equal(h.counts.posts,1);
  h.clean=true;h.render({settled:true});await h.advance(300);assert.equal(h.counts.posts,1);assert.equal(h.counts.frames,2);h.unmount();
});
test('two quiet readers of one in-flight source share one post; only newest input ticket presents',async()=>{
  const h=host();await h.advance(300);h.event('input');await h.advance(300);assert.equal(h.counts.posts,1);await h.reply(0);assert.equal(h.counts.frames,3);assert.equal(h.counts.stateWrites,1);h.unmount();
});
test('late ACK1 index cannot overwrite ACK2 even when RAW is unchanged; latest scope/record source gets its own index',async()=>{
  const h=host();await h.advance(300);h.render({source:{...h.source,space:{revision:2,changedScope:true}}});await h.advance(300);assert.equal(h.counts.posts,2);await h.reply(0);assert.equal(h.counts.frames,2);await h.reply(1);assert.equal(h.counts.frames,3);h.unmount();
});
test('OFF and owner changes cannot revive an old panel from an already-running reply',async()=>{
  for(const kind of ['off','owner']){const h=host();await h.advance(300);h.render(kind==='off'?{active:false}:{source:{...h.source,ownerId:'synthetic-b',space:{revision:1}}});await h.reply(0);assert.equal(h.counts.frames,1);assert.equal(h.counts.stateWrites,0);h.unmount();}
});
test('native composition suppresses both a queued task and a late reply, then resumes after compositionend',async()=>{
  const h=host();await h.advance(300);h.composing=true;h.event('compositionstart');await h.reply(0);assert.equal(h.counts.frames,1);assert.equal(h.counts.stateWrites,0);await h.advance(500);h.composing=false;h.event('compositionend');await h.advance(300);assert.equal(h.counts.frames,2);h.unmount();
});
test('host still dirty with a clean render snapshot fails closed without polling or frame reconstruction',async()=>{
  const h=host();h.clean=false;await h.advance(3000);assert.equal(h.counts.posts,0);assert.equal(h.counts.frames,0);assert.equal(h.pending,0);h.unmount();
});
test('Undo returning to the same saved source wakes from dirty without serializing or posting again',async()=>{
  const h=host();await h.advance(300);await h.reply(0);h.clean=false;h.event('input');h.render({settled:false});const before=h.counts;h.clean=true;h.render({settled:true});await h.advance(300);assert.equal(h.counts.posts,1);assert.equal(h.counts.frames,before.frames+1);h.unmount();
});

test('ineligible blank Enter/query never starts an index or measures a panel',async()=>{const h=host();h.validQuery=false;await h.advance(3000);assert.equal(h.counts.posts,0);assert.equal(h.counts.stateWrites,0);assert.equal(h.counts.geometry,0);assert.equal(h.counts.frames,1);assert.equal(h.pending,0);h.unmount();});

test("queued worker continuation yields to a fresh key before its idle callback",async()=>{const h=host();await h.advance(300);h.resolve(0);await h.flush();h.event("input");h.clean=false;h.render({settled:false});await h.advance(0);assert.equal(h.counts.frames,1);assert.equal(h.counts.stateWrites,0);assert.equal(h.counts.geometry,0);h.unmount();});
