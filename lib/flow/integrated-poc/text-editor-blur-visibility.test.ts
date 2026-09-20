import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
// Execute the shipped closure functions with explicit geometry. Real browser layout
// and native undo remain a separate browser gate; no duplicated geometry algorithm.
function fixture(top = 358, rowHeight = 44) {
  const start = source.indexOf('    function captureBlurReveal(event) {');
  const end = source.indexOf('    function makeSpan(', start);
  assert(start >= 0 && end > start, 'vendor must provide the one-shot blur geometry path');
  const textarea = { value: '- [ ] task', selectionStart: 3, selectionEnd: 3, selectionDirection: 'none', scrollTop: 278, scrollLeft: 7, clientHeight: 390, clientWidth: 600 };
  const row = { offsetTop: textarea.scrollTop + top, offsetHeight: rowHeight, hidden: false };
  const button = { dataset: { lineIndex: '0' }, classList: { contains: (name: string) => name === 'tle-progress-hit' } };
  const context = vm.createContext({ textarea, doc: { activeElement: {} }, destroyed: false, composing: false, gesture: null, moveState: null,
    foldedIds: new Set(), activePointers: new Set(), pointerInsideEditorControl: false, root: {contains:()=>false}, mode: 'live', selection: { start: 3, end: 3 }, pendingBlurReveal: null,
    rows: [row], checkButtons: [{ row, button }], syncCount: 0, lineAt: () => 0,
    scrollSurface: () => textarea, syncGeometry: () => { context.syncCount++; } });
  vm.runInContext(source.slice(start, end), context);
  return { context, textarea, row, capture: () => vm.runInContext('captureBlurReveal()', context), reveal: () => vm.runInContext('revealBlurredProgress()', context) };
}

test('S05 lower clipping scrolls only the missing 12px once, without focus/input changes', () => {
  const f = fixture(), before = { ...f.textarea }, active = f.context.doc.activeElement;
  f.capture(); f.reveal(); assert.equal(f.textarea.scrollTop, 290); assert.equal(f.context.syncCount, 1);
  assert.deepEqual({ ...f.textarea, scrollTop: before.scrollTop }, before);
  assert.equal(f.context.doc.activeElement, active);
  f.textarea.scrollTop = 278; f.reveal(); assert.equal(f.textarea.scrollTop, 278); assert.equal(f.context.syncCount, 1);
});
test('upper partial clipping gets the nearest correction; full/offscreen/tall rows stay put', () => {
  const f = fixture(-12); f.capture(); f.reveal(); assert.equal(f.textarea.scrollTop, 266);
  for (const [top, height] of [[0,44],[346,44],[390,44],[-44,44],[358,88]]) {
    const f = fixture(top, height); f.capture(); f.reveal(); assert.equal(f.textarea.scrollTop,278); assert.equal(f.context.syncCount,0);
  }
});
test('raw, composition, gesture, move, folded, noncollapsed and hidden row never auto-scroll', () => {
  for (const patch of [{mode:'text'},{composing:true},{gesture:{}},{moveState:{}},{foldedIds:new Set(['a'])},{selection:{start:1,end:5}},{destroyed:true}]) {
    const f = fixture(); Object.assign(f.context,patch); f.capture(); f.reveal(); assert.equal(f.textarea.scrollTop,278);
  }
  const f = fixture(); f.row.hidden = true; f.capture(); f.reveal(); assert.equal(f.textarea.scrollTop,278);
});
test('scroll, selection, value, viewport or mode changes before frame invalidate the captured intent', () => {
  const changes: ((f: ReturnType<typeof fixture>) => void)[] = [f=>{f.textarea.scrollTop=200;},f=>{f.textarea.scrollLeft=15;},f=>{f.textarea.value+='!';},f=>{f.textarea.selectionStart=4;},f=>{f.textarea.clientHeight=400;},f=>{f.context.mode='text';},f=>{f.context.doc.activeElement=f.textarea;},f=>{f.context.composing=true;},f=>{f.context.gesture={};}];
  for (const change of changes) {
    const f=fixture(); f.capture(); change(f); const before=f.textarea.scrollTop; f.reveal(); assert.equal(f.textarea.scrollTop,before); assert.equal(f.context.syncCount,0);
  }
});
test('actual blur event wiring defers until render; intervening wheel or pointer intent cancels', () => {
  for (const interrupt of [null, 'wheel', 'pointerdown', 'touchstart']) {
    const f=fixture(), events=new Map<string,()=>void>(); let frame: (()=>void)|undefined;
    Object.assign(f.context,{root:{},renderFrame:0,global:{requestAnimationFrame:(cb:()=>void)=>{frame=cb;return 1;}},
      render:()=>{assert.equal(f.textarea.scrollTop,278);},remember:()=>{},listen:(_target:unknown,name:string,handler:()=>void)=>events.set(name,handler)});
    vm.runInContext(source.slice(source.indexOf('    function scheduleRender() {'),source.indexOf('    function captureBlurReveal(event) {')),f.context);
    const wiring=source.slice(source.indexOf("    listen(textarea, 'blur',"),source.indexOf("    listen(textarea, 'scroll',"));
    vm.runInContext(wiring,f.context);
    events.get('blur')!(); assert.equal(f.textarea.scrollTop,278); assert(frame);
    if(interrupt)events.get(interrupt)!(); frame();
    assert.equal(f.textarea.scrollTop,interrupt?278:290);
  }
});
test('ordinary checkbox or missing control does not trigger progress correction', () => {
  for(const missing of [false,true]) { const f=fixture(); if(missing)f.context.checkButtons=[]; else f.context.checkButtons[0].button.classList.contains=()=>false; f.capture();f.reveal();assert.equal(f.textarea.scrollTop,278); }
});
test('one-shot runs after scheduled render, only blur captures, manual gestures cancel, no API/focus writer', () => {
  assert.match(source,/render\(\); revealBlurredProgress\(\);/);
  assert.match(source,/'blur', \(event\) => \{ remember\(\); captureBlurReveal\(event\); scheduleRender\(\); \}/);
  assert.match(source,/\['wheel', 'pointerdown', 'touchstart'\].*pendingBlurReveal = null/);
  const code=source.slice(source.indexOf('    function captureBlurReveal(event) {'),source.indexOf('    function makeSpan('));
  assert.doesNotMatch(code,/\.focus\(|\.blur\(|setSelectionRange|publish\(|onChange|execCommand|setValue|localStorage/);
});
test('internal control focus or active internal pointer suppresses correction, external handoff still corrects',()=>{
  for(const internalFocus of [true,false]) {
    const f=fixture(); f.context.root={contains:()=>internalFocus};
    f.context.activePointers=new Set(internalFocus?[]:[1]);f.context.pointerInsideEditorControl=!internalFocus;
    vm.runInContext('captureBlurReveal({relatedTarget:{}})',f.context);f.reveal();assert.equal(f.textarea.scrollTop,278);
  }
  const f=fixture();f.context.activePointers=new Set([1]);f.context.pointerInsideEditorControl=false;
  vm.runInContext('captureBlurReveal({relatedTarget:{}})',f.context);f.reveal();assert.equal(f.textarea.scrollTop,290);
  assert.match(source,/pointerInsideEditorControl = event.target !== textarea && root.contains\(event.target\)/);
});
