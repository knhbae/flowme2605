import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
const helpers = source.slice(source.indexOf('    function scrollSurface() {'), source.indexOf('    function applyFoldView() {'));

function fixture() {
  const raw = '[2026-10-07]\n    - [ ] 가상😀제목확인';
  const start = raw.indexOf('    -');
  const nativeNode = { nodeType: 3, textContent: raw.slice(start), top: 194 };
  const titleNode = { nodeType: 3, textContent: '가상😀제목확인', top: 150 };
  const title = { contains: (node: unknown) => node === titleNode };
  const row = { hidden: false, offsetTop: 100, offsetHeight: 132, dataset: { lineIndex: '1', taskPrefixLength: '10' },
    querySelector: () => title, firstChild: titleNode };
  const viewport = { scrollTop: 80 };
  const textarea = { value: raw, scrollTop: 80, selectionStart: 0, selectionEnd: 0,
    setSelectionRange(a: number, b: number) { this.selectionStart = a; this.selectionEnd = b; },
    focus() { context.doc.activeElement = textarea; } };
  const context = vm.createContext({ readingView: true, readingPointerAt: null, foldedIds: new Set(), viewport, textarea,
    rows: [{ hidden: false, offsetTop: 20, offsetHeight: 44, dataset: {lineIndex:'0'} }, row],
    composing: false, gesture: null, moveState: null, global: { getSelection: () => ({ isCollapsed: true }) },
    mirror: { contains: (element: unknown) => element === row },
    doc: { activeElement: {}, caretPositionFromPoint: () => ({offsetNode:titleNode,offset:4}),
      createRange: () => ({startContainer:null as any,startOffset:0,
        setStart(node: any, offset: number) { this.startContainer=node;this.startOffset=offset; },
        collapse() {}, getBoundingClientRect() { return {top:this.startContainer.top}; } }) },
    rangeOfLine: () => ({start,end:raw.length,index:1,text:raw.slice(start)}),
    remember() {}, render() { context.readingView=false; context.rows[1]={...row,firstChild:nativeNode}; },
    syncCount:0, syncGeometry() { context.syncCount++; } });
  vm.runInContext(helpers, context);
  let prevented = false;
  const event = {target:{closest:()=>row},clientX:130,clientY:160,defaultPrevented:false,preventDefault(){prevented=true;}};
  return { context, raw, start, textarea, viewport, row, event, prevented:()=>prevented };
}

test('reading to native restores the same visible row position after row heights change', () => {
  const f=fixture(); vm.runInContext('saved=viewAnchor()',f.context);
  f.context.readingView=false; f.context.rows[1].offsetTop=64;
  vm.runInContext('restoreViewAnchor(saved)',f.context);
  assert.equal(f.textarea.scrollTop,44);
  assert.equal(f.viewport.scrollTop,80);
  assert.equal(f.textarea.value,f.raw);
});

test('a displayed title tap maps its UTF-16 offset through the unchanged RAW prefix and keeps screen height', () => {
  const f=fixture(); f.context.event=f.event; vm.runInContext('editReadingPoint(event)',f.context);
  assert.equal(f.textarea.selectionStart,f.start+10+4);
  assert.equal(f.textarea.selectionEnd,f.textarea.selectionStart);
  assert.equal(f.textarea.scrollTop,124);
  assert.equal(f.textarea.value,f.raw);
  assert.equal(f.context.doc.activeElement,f.textarea);
  assert.equal(f.context.readingView,false);
  assert(f.prevented());
});

test('display selection, composition, folding or movement cannot become a native edit tap', () => {
  for (const patch of [{composing:true},{foldedIds:new Set(['folder'])},{gesture:{}},{moveState:{}},
    {global:{getSelection:()=>({isCollapsed:false})}},{readingView:false}]) {
    const f=fixture();Object.assign(f.context,patch);f.context.event=f.event;
    vm.runInContext('editReadingPoint(event)',f.context);
    assert.equal(f.textarea.selectionStart,0);assert.equal(f.textarea.scrollTop,80);
    assert.equal(f.textarea.value,f.raw);assert(!f.prevented());
  }
});

test('a transformed date/scope label retains the existing end-of-row native fallback', () => {
  const f=fixture();f.row.querySelector=()=>null as any;
  f.row.firstChild={nodeType:3,textContent:'[2026-10-07]',top:150};f.context.event=f.event;
  vm.runInContext('editReadingPoint(event)',f.context);
  assert.equal(f.textarea.selectionStart,f.raw.length);assert.equal(f.textarea.value,f.raw);
  assert.equal(f.textarea.scrollTop,80);
});

test('native focus cancels pending movement before synchronously restoring the RAW ruler', () => {
  const at=source.indexOf("    listen(textarea, 'focus',");
  const handler=source.slice(at,source.indexOf('\n',at));
  const order:string[]=[];
  const context=vm.createContext({textarea:{},gesture:{phase:'pending'},moveState:null,
    cancelMove(){order.push('cancel');context.gesture=null;},remember(){order.push('remember');},render(){order.push('render');},revealFocusedCaret(){order.push('reveal');},
    listen(_target:unknown,_name:string,run:()=>void){run();}});
  vm.runInContext(handler,context);
  assert.deepEqual(order,['cancel','remember','render','reveal']);
});

test('only passive reading refresh preserves a DOM range; explicit RAW, fold and movement transitions rebuild', () => {
  const at=source.indexOf('    function render() {');
  const end=source.indexOf('      if ((gesture && gesture.source',at);
  const guard=source.slice(at,end)+'      rebuilt++;\n    }';
  for (const [patch, preserve] of [
    [{},true], [{mode:'text'},false], [{foldedIds:new Set(['folder'])},false],
    [{root:{classList:{contains:()=>true}}},false], [{gesture:{}},false], [{moveState:{}},false],
    [{textarea:{value:'changed'}},false],
  ] as const) {
    const node={};
    const context=vm.createContext({destroyed:false,readingView:true,mode:'live',foldedIds:new Set(),
      root:{classList:{contains:()=>false}},gesture:null,moveState:null,textarea:{value:'same'},renderedValue:'same',
      doc:{activeElement:{}},global:{getSelection:()=>({isCollapsed:false,anchorNode:node,focusNode:node})},
      mirror:{contains:(candidate:unknown)=>candidate===node},syncCount:0,rebuilt:0,
      syncGeometry(){context.syncCount++;},...patch});
    vm.runInContext(guard+'\nrender()',context);
    assert.equal(context.syncCount,preserve?1:0);assert.equal(context.rebuilt,preserve?0:1);
  }
});

test('touch long press keeps reading while a completed short tap enters the exact native position', () => {
  for (const [elapsed,edit] of [[800,false],[120,true]] as const) {
    const f=fixture();f.context.readingPointerAt=100;f.context.event={...f.event,timeStamp:100+elapsed};
    vm.runInContext('editReadingPoint(event)',f.context);
    assert.equal(f.context.doc.activeElement===f.textarea,edit);
    assert.equal(f.textarea.value,f.raw);assert.equal(f.context.readingPointerAt,null);
  }
});

test('native painting clears the reading scroll layer while reading and folding keep their scroll surface', () => {
  const at=source.indexOf('    function syncGeometry() {');
  const start=source.indexOf('      const surface = scrollSurface();',at);
  const code=source.slice(start,source.indexOf('      const textStyle',start));
  for(const [reading,folded,keep] of [[false,false,false],[true,false,true],[false,true,true]] as const){
    const viewport={scrollTop:135,scrollLeft:4};
    const context=vm.createContext({readingView:reading,foldedIds:new Set(folded?['folder']:[]),viewport,scrollSurface:()=>({})});
    vm.runInContext(code,context);
    assert.equal(viewport.scrollTop,keep?135:0);assert.equal(viewport.scrollLeft,keep?4:0);
  }
});

test('keyboard entry reveals the remembered native caret without changing its RAW position', () => {
  for(const [top,bottom,expected] of [[-400,-380,100],[700,720,870],[300,320,700]]) {
    const node={nodeType:3};
    const textarea={scrollTop:700,clientHeight:350,getBoundingClientRect:()=>({top:200})};
    const selection={start:4,end:4,direction:'none'};
    const context=vm.createContext({foldedIds:new Set(),doc:{activeElement:textarea,createRange:()=>({setStart(){},collapse(){},getBoundingClientRect:()=>({top,bottom})})},
      textarea,selection,rows:[{firstChild:node}],lineAt:()=>0,rangeOfLine:()=>({start:0,index:0}),syncGeometry(){}});
    vm.runInContext(helpers+'\nrevealFocusedCaret()',context);
    assert.equal(textarea.scrollTop,expected);assert.deepEqual(selection,{start:4,end:4,direction:'none'});
  }
});
