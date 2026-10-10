import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { programSame } from '../../../lib/flow/integrated-poc/controller';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { newProgramParticipationDraft } from '../../../lib/flow/integrated-poc/participation-editor';
import { executeAlphaSocialIntent } from '../../../lib/flow/integrated-poc/alpha-social/dispatch';
const actorId = 'local-user';
function load(kind: 'community' | 'publisher' | 'review', environment: Record<string, unknown>) {
  const file = kind === 'community' ? 'ProgramCommunity.tsx' : kind === 'publisher' ? 'ProgramPublisher.tsx' : 'ProgramProposalReview.tsx';
  const source = readFileSync(new URL(`./${file}`,import.meta.url),'utf8');
  const ast = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let callback: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'acceptConfirmedSocialDrafts') callback = node.initializer;
    ts.forEachChild(node,visit);
  }; visit(ast); assert(callback,`${file} registers exact acknowledgement`);
  const output = ts.transpileModule(`module.exports = ${callback.getText(ast)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const context = vm.createContext({ ...environment,module:{exports:null},programSame,same:programSame,programClone:structuredClone });
  vm.runInContext(output,context);
  return (context.module as {exports:(next:any)=>boolean}).exports;
}
function fixture(kind:'community'|'publisher'|'review') {
  const baseline={current:null as any}, input={current:{id:'draft',note:'confirmed',expectedProposalToken:'token',body:'confirmed'}};
  const count={current:0}, composing={current:kind==='publisher'?new Set():false}, lock={current:0}, busy={current:false}, flight={current:null};
  const setters:string[]=[]; const data:any={activeActorId:actorId,spaces:{[actorId]:{participationDrafts:[structuredClone(input.current)],publicationDrafts:[structuredClone(input.current)],proposalReviewDrafts:{p:structuredClone(input.current)}}}};
  const env={actorId,composing,mediaPending:{current:false},saveFlights:count,lockCount:lock,locks:lock,busyRef:busy,publishingRef:busy,flight,
    currentDraft:()=>input.current,read:()=>input.current,current:()=>input.current,
    savedDraftRef:baseline,savedRef:baseline,saved:baseline,reviewPorts:{current:new Map()},proposal:{id:'p'},touched:{current:true},
    readProgramProposalReviewDraft:(next:any,actor:string,id:string)=>next.spaces[actor].proposalReviewDrafts[id],
    storageScope:'account',setDraftConflict:()=>setters.push('conflict'),setSaveState:()=>setters.push('saved'),setError:()=>setters.push('error'),setMessage:()=>setters.push('message'),render:()=>setters.push('render')};
  return {ack:load(kind,env),data,baseline,input,count,composing,lock,busy,flight,setters,env};
}
for(const kind of ['community','publisher','review'] as const){
  test(`${kind} exact confirmed draft advances only baseline, preserving current input identity`,()=>{
    const f=fixture(kind), original=f.input.current; assert.equal(f.ack(f.data),true); assert.deepEqual(structuredClone(f.baseline.current),original); assert.notEqual(f.baseline.current,original);
    assert.equal(f.input.current,original); const writes=f.setters.length; assert.equal(f.ack(f.data),false); assert.equal(f.setters.length,writes);
  });
  test(`${kind} acknowledgement refuses foreign account, newer input, composition and in-flight work`,()=>{
    for(const scenario of ['foreign','newer','ime','flight','locked'] as const){
      const f=fixture(kind); if(scenario==='foreign')f.data.activeActorId='other';
      if(scenario==='newer')f.input.current={...f.input.current,note:'new input',body:'new input'};
      if(scenario==='ime')f.composing.current=kind==='publisher'?new Set(['native']):true;
      if(scenario==='flight'){if(kind==='publisher')f.flight.current=Promise.resolve(true) as any;else f.count.current=1;}
      if(scenario==='locked')f.lock.current=1;
      assert.equal(f.ack(f.data),false,scenario); assert.equal(f.baseline.current,null); assert.equal(f.setters.length,0);
    }
  });
}
test('community lost save response then exact lookup acknowledgement allows next guarded edit',()=>{
  const data=createProgramData(), draft={...newProgramParticipationDraft(),title:'Question',body:'Saved text'};
  const first=executeAlphaSocialIntent(data,actorId,{type:'participation-save',draft,expected:null},'first','2026-09-21T14:00:00.000Z'); assert(first.ok);
  const next={...draft,body:'Next text',requestId:'next-content'};
  const stale=executeAlphaSocialIntent(first.data,actorId,{type:'participation-save',draft:next,expected:null},'next','2026-09-21T14:00:01.000Z'); assert(!stale.ok&&stale.reason==='conflict');
  const f=fixture('community'); f.input.current=draft as any; assert(f.ack(first.data));
  const resumed=executeAlphaSocialIntent(first.data,actorId,{type:'participation-save',draft:next,expected:f.baseline.current},'next','2026-09-21T14:00:01.000Z');
  assert(resumed.ok); assert.equal(resumed.data.spaces[actorId].participationDrafts[0].body,'Next text');
});
