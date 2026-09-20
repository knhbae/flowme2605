import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { setup, verifySourcePins } from './PersonalWorkspacePocSourcePractice.test-support';
import { PersonalWorkspacePocSourceUpdateReview, type PersonalWorkspacePocSourceUpdateReviewProps } from './PersonalWorkspacePocSourceUpdateReview';
import {
  PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY as KEY, createPersonalWorkspacePocSourceCandidateStore,
  applyPersonalWorkspacePocSourceCandidate, resolvePersonalWorkspacePocSourceCandidateChange,
  isPersonalWorkspacePocSourceCandidateStore,
} from '../../../lib/flow/personal-workspace-poc-source-candidates';

// Actual AST closures and real model/writer modules. Isolated frame/lock/event
// delivery is test controlled; no React mount, browser reload or actual tab claim.
const T = '2026-09-06T00:00:00.000Z';
const successes = (f: ReturnType<typeof setup>) => f.publications.filter(p => p.name === 'status' && (p.value as {kind?:string})?.kind === 'success');
function fresh() {
  const f = setup(), empty = createPersonalWorkspacePocSourceCandidateStore(T);
  f.actual.deferSourceUpdateReview();
  f.data.delete(KEY); f.values.sourceCandidateRawRef.current = null;
  f.values.sourceCandidateStoreRef.current = empty; f.values.sourcePracticeBaseStore.current = empty;
  f.values.planObservedSource.current = null; f.values.sourcePracticeSelections = {};
  f.values.sourceUpdateEnvelope = undefined; f.publications.length = 0;
  return f;
}
function observe(f: ReturnType<typeof setup>, raw: string) {
  const before = f.storage.getItem(KEY);
  f.data.set(KEY, raw); // external fixture mutation, never a product API
  f.listeners.get('storage')!({ key: KEY, storageArea: f.storage, oldValue: before, newValue: raw });
}
test('C2-U01 actual catalog render reads neither generate nor stage; empty remains empty', () => {
  const f = fresh(); let generates = 0, stages = 0;
  const generate = f.values.createPersonalWorkspacePocLocalFixtureEnvelope, stage = f.values.stagePersonalWorkspacePocSourceCandidate;
  f.values.createPersonalWorkspacePocLocalFixtureEnvelope = (...a: unknown[]) => { generates++; return generate(...a); };
  f.values.stagePersonalWorkspacePocSourceCandidate = (...a: unknown[]) => { stages++; return stage(...a); };
  for (let i = 0; i < 3; i++) assert.deepEqual(f.actual.inspectSourcePractice(f.values.sourceCandidateStoreRef.current, f.materialized.flow.ref).catalog.candidates, []);
  assert.equal(generates, 0); assert.equal(stages, 0); assert.deepEqual(f.calls, []);
  assert.equal(f.storage.getItem(KEY), null); f.cleanup();
});
test('C2-U02 actual explicit start/resolve/defer/reopen retains exact choice, source-only mine and zero writes', () => {
  const f = fresh(); assert.equal(f.actual.startSourcePractice(), true);
  const id = f.values.sourcePracticeSelections[f.materialized.flow.ref];
  const envelope = f.values.sourceCandidateStoreRef.current.envelopes[id];
  assert.equal(envelope.mine.rawText, f.materialized.flow.authoring.rawText);
  f.values.sourceUpdateEnvelope = envelope;
  const change = envelope.changes[0]; assert.ok(change);
  f.actual.resolveSourceUpdateChange(change.changeId, 'keep-working');
  f.actual.deferSourceUpdateReview();
  assert.equal(f.values.sourceCandidateStoreRef.current.reviews[id].status, 'deferred');
  f.actual.openSourceUpdateReview(id);
  assert.equal(f.values.sourceCandidateStoreRef.current.reviews[id].resolutions[change.changeId], 'keep-mine');
  assert.equal(f.values.sourcePracticeOwner.current.candidateId, id);
  assert.equal(f.storage.getItem(KEY), null); assert.deepEqual(f.calls, []); f.cleanup();
});
test('C2-U03 actual three-way unchanged working follows durable applied; conflicting local decisions fail closed', () => {
  const f = setup(), base = f.store;
  const applied = applyPersonalWorkspacePocSourceCandidate(base, { candidateId: f.envelope.envelope.candidateId, current: f.envelope.current, now: T });
  assert.equal(applied.changed, true);
  assert.deepEqual(f.actual.mergePersonalWorkspacePocSourcePracticeMemory(applied.store, base, base), applied.store);
  const changed = resolvePersonalWorkspacePocSourceCandidateChange(base, {
    candidateId: f.envelope.envelope.candidateId, changeId: f.envelope.envelope.changes[0].changeId, resolution: 'keep-mine', now: T,
  }).store;
  assert.notDeepEqual(changed, base);
  assert.equal(f.actual.mergePersonalWorkspacePocSourcePracticeMemory(applied.store, changed, base), undefined);
  assert.equal(isPersonalWorkspacePocSourceCandidateStore(base), true); assert.deepEqual(f.calls, []); f.cleanup();
});
test('C2-U04 observed source ABA cannot gain authority through ordinary close/open; explicit refresh is required', async () => {
  const f = setup();
  observe(f, JSON.stringify(createPersonalWorkspacePocSourceCandidateStore(T))); observe(f, f.initialRaw);
  await f.actual.applySourceUpdate(); assert.deepEqual(f.calls, []);
  f.actual.deferSourceUpdateReview(); f.actual.openSourceUpdateReview(f.envelope.envelope.candidateId);
  assert.equal(f.values.sourcePracticeOwner.current, undefined);
  await f.actual.applySourceUpdate(); assert.deepEqual(f.calls, []);
  const beforeReview = JSON.stringify(f.values.sourceCandidateStoreRef.current.reviews[f.envelope.envelope.candidateId]);
  assert.equal(f.actual.startSourcePractice(true), true);
  assert.equal(f.values.sourcePracticeOwner.current.stale, false);
  assert.equal(JSON.stringify(f.values.sourceCandidateStoreRef.current.reviews[f.envelope.envelope.candidateId]), beforeReview);
  assert.deepEqual(f.calls, []); f.cleanup();
});
test('C2-U05 queued apply observes source ABA before lock and writes zero', async () => {
  const f = setup(), promise = f.start();
  observe(f, JSON.stringify(createPersonalWorkspacePocSourceCandidateStore(T))); observe(f, f.initialRaw);
  await f.finish(promise); assert.equal(f.facts().writerCalls, 0); assert.deepEqual(f.calls, []);
  assert.equal(successes(f).length, 0); assert.equal(f.pending.current, false); f.cleanup();
});
test('C2-U06 actual lock callback rechecks ended route after lock acquisition', async () => {
  const f = setup();
  f.values.withFlowUserDataWriteLock = async (callback: () => unknown) => { f.cleanup(); return {ok: true, value: await callback()}; };
  const promise = f.start(), before = f.publications.length; await f.finish(promise);
  assert.deepEqual(f.calls, []); assert.deepEqual(f.publications.slice(before), []); assert.equal(f.pending.current, false);
});
test('C2-U07 actual foreign readback is preserved and recovery-required blocks retry even if old bytes return', async () => {
  const f = setup(), read = f.storage.getItem;
  const foreign = JSON.stringify(createPersonalWorkspacePocSourceCandidateStore(T));
  let injected = false;
  f.storage.getItem = key => {
    if (key === KEY && f.calls.length === 1 && !injected) { injected = true; f.data.set(KEY, foreign); }
    return read(key);
  };
  await f.finish(f.start());
  assert.equal(injected, true); assert.equal(f.storage.getItem(KEY), foreign); assert.equal(f.calls.length, 1);
  assert.equal(f.values.sourcePracticeRecovery.current, true); assert.equal(successes(f).length, 0);
  assert.match(String(f.publications.findLast(p => p.name === 'source-error')?.value), /확정하지 못/);
  f.data.set(KEY, f.initialRaw); await f.actual.applySourceUpdate();
  assert.equal(f.actual.startSourcePractice(true), false); assert.equal(f.calls.length, 1); f.cleanup();
});
test('C2-U08 owner ending after committed write suppresses late presentation but never rolls back own success', async () => {
  const f = setup(), writer = f.values.savePersonalWorkspacePocSourceCandidateStore;
  f.values.savePersonalWorkspacePocSourceCandidateStore = (input: unknown) => { const saved = writer(input); assert.equal(saved.ok, true); f.cleanup(); return saved; };
  const promise = f.start(), before = f.publications.length; await f.finish(promise);
  assert.equal(f.calls.length, 1); assert.notEqual(f.storage.getItem(KEY), f.initialRaw);
  assert.deepEqual(f.publications.slice(before), []); assert.equal(f.pending.current, false);
});
test('C2-U09 post-write source epoch drift reports saved-but-unlinked and disables repeated writes', async () => {
  const f = setup(), writer = f.values.savePersonalWorkspacePocSourceCandidateStore;
  f.values.savePersonalWorkspacePocSourceCandidateStore = (input: unknown) => { const saved = writer(input); f.values.planSourceEpoch.current++; return saved; };
  await f.finish(f.start()); assert.equal(f.calls.length, 1); assert.equal(successes(f).length, 0);
  assert.match(String(f.publications.findLast(p => p.name === 'source-error')?.value), /원문은 저장됐지만/);
  assert.equal(f.values.sourcePracticeRecovery.current, true); await f.actual.applySourceUpdate(); assert.equal(f.calls.length, 1); f.cleanup();
});
test('C2-U10 malformed durable source cannot be replaced by a retained valid working store', () => {
  const f = setup(); f.actual.deferSourceUpdateReview(); f.data.set(KEY, '{broken');
  assert.equal(f.actual.startSourcePractice(true), false); assert.equal(f.storage.getItem(KEY), '{broken');
  assert.deepEqual(f.calls, []); f.cleanup();
});

const props: PersonalWorkspacePocSourceUpdateReviewProps = {
  candidate: {changeCount: 1}, changes: [{changeId: 'title', kind: 'changed', label: '제목', baseValue: 'A', workingValue: 'A', incomingValue: '<B>'}],
  resolutions: {}, status: 'pending', open: false,
  onOpen(){}, onDefer(){}, onSelectChange(){}, onResolve(){}, onApply(){}, onRetry(){}, onRefreshCandidate(){}, onUndo(){},
};
const rendered = (extra: Partial<PersonalWorkspacePocSourceUpdateReviewProps>) => renderToStaticMarkup(<PersonalWorkspacePocSourceUpdateReview {...props} {...extra}/>);
function focusFixture() {
  const raw = fs.readFileSync('components/flow/personal-workspace-poc/PersonalWorkspacePocSourceUpdateReview.tsx','utf8');
  const ast = ts.createSourceFile('review.tsx',raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'focusAfterPaint');
  assert.ok(fn);
  const code = ts.transpileModule(fn.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const frames: (()=>void)[] = [], calls: string[] = [];
  const document: {activeElement: object; querySelector?: (selector:string)=>unknown} = {activeElement:{body:true}};
  const makeTarget = (name:string, extra: Record<string,unknown> = {}) => {
    const target = {isConnected:true, getClientRects:()=>[{}], closest:()=>null,
      parentElement:null, tagName:'BUTTON', style:{display:'inline-block',visibility:'visible'},
      focus:()=>{calls.push(name); document.activeElement=target;}, ...extra};
    return target;
  };
  const fallback = makeTarget('heading', {tagName:'H2'});
  document.querySelector=selector=>{assert.equal(selector,'#heading');return fallback;};
  const focus = new Function('window','document',code+';return focusAfterPaint;')(
    {requestAnimationFrame:(f:()=>void)=>{frames.push(f);},getComputedStyle:(element:{style:unknown})=>element.style},document);
  return {focus, frames, calls, document, makeTarget, fallback};
}
test('C2-U11 no-prop presenter output matches exact pre-C2 component for all six states and open/closed', () => {
  const before = readPocSourceBaseline('c2-review');
  const code = ts.transpileModule(before, {compilerOptions:{jsx:ts.JsxEmit.React, target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  const module = {exports:{} as {PersonalWorkspacePocSourceUpdateReview: React.ComponentType<PersonalWorkspacePocSourceUpdateReviewProps>}};
  new Function('require','module','exports',code)((name:string)=>{assert.equal(name,'react');return React;},module,module.exports);
  for (const status of ['pending','applying','applied','undoing','failed','stale'] as const) for (const open of [true,false]) {
    const expected = renderToStaticMarkup(React.createElement(module.exports.PersonalWorkspacePocSourceUpdateReview,{...props,status,open}));
    assert.equal(rendered({status,open}), expected, status + '/' + open);
  }
});
test('C2-U12 local practice SSR has explicit labels, escaped content and no unowned applied Undo', () => {
  const html = rendered({open:true,practice:{locked:false,canUndo:false}});
  assert.match(html,/로컬 원문 비교 연습/); assert.match(html,/예시 원문/); assert.match(html,/현재 원문/); assert.match(html,/&lt;B&gt;/);
  assert.doesNotMatch(rendered({status:'applied',practice:{locked:false,canUndo:false}}),/source-update-banner-undo/);
});
test('C2-U13 recovery lock SSR retains comparison/error but locks choices/apply/refresh without invoking callbacks', () => {
  let calls = 0;
  const html = rendered({open:true,status:'failed',errorMessage:'확정하지 못했어요',practice:{locked:true,canUndo:false},
    onApply:()=>{calls++}, onRetry:()=>{calls++}, onResolve:()=>{calls++}});
  assert.match(html,/확정하지 못했어요/); assert.match(html,/data-testid="personal-workspace-source-update-choice-keep-working"[^>]*disabled/);
  assert.match(html,/data-testid="personal-workspace-source-update-apply"[^>]*disabled/); assert.equal(calls,0);
  const stale = rendered({open:true,status:'stale',practice:{locked:true,canUndo:false}});
  assert.match(stale,/현재 원문으로 다시 비교/); assert.match(stale,/data-testid="personal-workspace-source-update-refresh"[^>]*disabled/);
});
test('C2-U14 local workspace observed state ABA invalidates old source owner even after close/reopen', async () => {
  const f = setup();
  f.values.state = {...f.state, revision: f.state.revision + 1}; f.actual.observeState();
  f.values.state = f.state; f.actual.observeState();
  assert.equal(f.values.sourcePracticeWorkspaceEpoch.current, 2);
  f.actual.deferSourceUpdateReview(); f.actual.openSourceUpdateReview(f.envelope.envelope.candidateId);
  assert.equal(f.values.sourcePracticeOwner.current, undefined);
  await f.actual.applySourceUpdate(); assert.deepEqual(f.calls, []); f.cleanup();
});
test('C2-U15 actual focus callback uses visible opener or Flow heading fallback and ignores obsolete epoch', () => {
  const f=focusFixture(); let live=true;
  f.focus(null,'#heading',()=>live); f.frames.shift()!(); assert.equal(f.document.activeElement,f.fallback);
  const target=f.makeTarget('opener');
  f.focus(target,'#heading',()=>live); f.frames.shift()!(); assert.equal(f.document.activeElement,target);
  f.focus(f.makeTarget('hidden',{getClientRects:()=>[]}),'#heading',()=>live); f.frames.shift()!(); assert.equal(f.document.activeElement,f.fallback);
  const calls=f.calls.length;
  f.focus(target,'#heading',()=>live); live=false; f.frames.shift()!(); assert.equal(f.document.activeElement,f.fallback); assert.equal(f.calls.length,calls);
});
test('C2-U16 actual merge refuses a local deletion instead of restoring durable records', () => {
  const f = setup(), local = createPersonalWorkspacePocSourceCandidateStore(T);
  assert.equal(isPersonalWorkspacePocSourceCandidateStore(local), true);
  assert.equal(f.actual.mergePersonalWorkspacePocSourcePracticeMemory(f.store, local, f.store), undefined);
  assert.deepEqual(f.calls, []); f.cleanup();
});
test('C2-U17 actual practice focus effect must not steal focus moved after its queued frame', () => {
  const raw = fs.readFileSync('components/flow/personal-workspace-poc/PersonalWorkspacePocSourceUpdateReview.tsx','utf8');
  const ast = ts.createSourceFile('review.tsx',raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const effects: ts.ArrowFunction[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'useEffect'
      && ts.isArrowFunction(node.arguments[0]) && node.arguments[0].getText(ast).includes('const choice = activeChangeRef')) effects.push(node.arguments[0]);
    ts.forEachChild(node,visit);
  }; visit(ast); assert.equal(effects.length,1);
  const code = ts.transpileModule('const effect = '+effects[0].getText(ast)+';',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  let focusCalls=0; const frames:(()=>void)[]=[]; const document={activeElement:{}};
  const choice={focus:()=>{focusCalls++;}};
  const dialogRef={current:{isConnected:true,querySelector:()=>choice}};
  const env={open:true,status:'failed',practice:{locked:false,canUndo:false},practiceMode:true,document,dialogRef,
    activeChangeRef:{current:{querySelector:()=>choice}},FOCUSABLE_SELECTOR:'button',
    window:{requestAnimationFrame:(f:()=>void)=>{frames.push(f);return 1;},cancelAnimationFrame:()=>{}}};
  const effect = new Function('env','with(env){'+code+';return effect;}')(env);
  effect(); document.activeElement={userMoved:true}; frames.shift()!();
  assert.equal(focusCalls,0,'A later user focus move owns focus; do not redirect it to the first choice');
});
test('C2-U18 actual practice return skips closed-details or hidden owners and falls back after a failed focus', () => {
  const f=focusFixture();
  const details={tagName:'DETAILS',open:false,hasAttribute:()=>false,parentElement:null,
    children:[{tagName:'SUMMARY',contains:()=>false}]};
  const closed=f.makeTarget('closed-start',{parentElement:details,focus:()=>{f.calls.push('closed-start');}});
  assert.equal(closed.getClientRects().length,1,'Reproduce actual RC08: a closed descendant can still report a rect');
  f.focus(closed,'#heading',()=>true); f.frames.shift()!();
  assert.equal(f.document.activeElement,f.fallback); assert.deepEqual(f.calls,['heading']);
  for(const owner of ['hidden','inert','aria-hidden']) {
    const before=f.calls.length, target=f.makeTarget(owner,{closest:()=>({owner})});
    f.focus(target,'#heading',()=>true);f.frames.shift()!();
    assert.deepEqual(f.calls.slice(before),['heading']);
  }
  f.document.activeElement={body:true};
  const unfocusable=f.makeTarget('unfocusable',{focus:()=>{f.calls.push('attempt');}});
  f.focus(unfocusable,'#heading',()=>true);f.frames.shift()!();
  assert.deepEqual(f.calls.slice(-2),['attempt','heading']);assert.equal(f.document.activeElement,f.fallback);
  const summary=f.makeTarget('summary',{tagName:'SUMMARY',parentElement:details});
  details.children=[{tagName:'SUMMARY',contains:(element?:unknown)=>element===summary}];
  f.focus(summary,'#heading',()=>true);f.frames.shift()!();assert.equal(f.document.activeElement,summary);
});
test('C2-U19 actual failed practice focuses and nearest-scrolls error before choices; no-practice keeps original focus', () => {
  const raw=fs.readFileSync('components/flow/personal-workspace-poc/PersonalWorkspacePocSourceUpdateReview.tsx','utf8');
  const ast=ts.createSourceFile('review.tsx',raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const effects:ts.ArrowFunction[]=[];
  const visit=(node:ts.Node)=>{if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='useEffect'
    &&ts.isArrowFunction(node.arguments[0])&&node.arguments[0].getText(ast).includes('const choice = activeChangeRef'))effects.push(node.arguments[0]);ts.forEachChild(node,visit);};visit(ast);assert.equal(effects.length,1);
  const code=ts.transpileModule('const effect='+effects[0].getText(ast)+';',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  for(const practiceMode of [true,false]) {
    const frames:(()=>void)[]=[], calls:unknown[]=[];const document:{activeElement:unknown}={activeElement:{}};
    const choice={focus:()=>{calls.push('choice');document.activeElement=choice;}};
    const error={isConnected:true,focus:()=>{calls.push('error');document.activeElement=error;},scrollIntoView:(options:unknown)=>calls.push(options)};
    const dialogRef={current:{isConnected:true,querySelector:(selector:string)=>selector.includes('source-update-error')?error:choice}};
    const env={open:true,status:'failed',practiceMode,document,dialogRef,activeChangeRef:{current:{querySelector:()=>choice}},FOCUSABLE_SELECTOR:'button',
      window:{requestAnimationFrame:(callback:()=>void)=>{frames.push(callback);return 1;},cancelAnimationFrame:()=>{}}};
    const effect=new Function('env','with(env){'+code+';return effect;}')(env);effect();frames.shift()!();
    assert.deepEqual(calls,practiceMode?['error',{block:'nearest',inline:'nearest'}]:['choice']);
  }
  assert.match(rendered({open:true,status:'failed',practice:{locked:false,canUndo:false}}),/data-testid="personal-workspace-source-update-error"[^>]*tabindex="-1"|tabindex="-1"[^>]*data-testid="personal-workspace-source-update-error"/);
  assert.doesNotMatch(rendered({open:true,status:'failed'}),/data-testid="personal-workspace-source-update-error"[^>]*tabindex/);
});
test.after(verifySourcePins);
import { readPocSourceBaseline } from '../../../tests/fixtures/poc-source-baselines/read';
