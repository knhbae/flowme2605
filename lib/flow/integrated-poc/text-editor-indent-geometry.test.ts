import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source=readFileSync(new URL('./vendor/text-editor.cjs',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('    function syncRowIndent(row) {'),source.indexOf('    function syncGeometry() {'));
function run(text:string,options:{wrapped?:boolean;space?:number;guides?:number[]}={}){
 const properties=new Map(),guides=(options.guides??[]).map(columns=>({dataset:{indentColumns:String(columns)},style:{left:''}}));
 const node={nodeType:3,textContent:text},row={firstChild:options.wrapped?{firstChild:node}:node,style:{setProperty:(key:string,value:string)=>properties.set(key,value)},querySelectorAll:()=>guides};
 const offsets:number[]=[];
 const context=vm.createContext({row,indentation:(value:string)=>({prefix:/^[ \t]*/.exec(value)![0]}),doc:{createRange(){let start=0,end=0;return{setStart(actual:unknown,offset:number){assert.equal(actual,node);start=offset;},setEnd(actual:unknown,offset:number){assert.equal(actual,node);end=offset;offsets.push(offset);},getBoundingClientRect(){const width=text.slice(start,end).split('').reduce((sum,c)=>sum+(c==='\t'?18:options.space??4.5),0);return{width};}};}}});
 vm.runInContext(helper+'\nsyncRowIndent(row)',context);
 return{properties,guides,offsets,node,row};
}
test('nested checkbox indent measures existing RAW spaces, not the zero-glyph ch width',()=>{
 const a=run('    - [ ] 질문');assert.equal(a.properties.get('--tle-indent'),'18px');assert.equal(a.node.textContent,'    - [ ] 질문');
 const b=run('        - [ ] 깊은 질문',{wrapped:true,space:5.5});assert.equal(b.properties.get('--tle-indent'),'44px');
});
test('RAW tabs and mixed whitespace use the DOM range without synthetic font substitution',()=>{
 assert.equal(run('\t\t- [ ] 탭',{wrapped:true}).properties.get('--tle-indent'),'36px');
 assert.equal(run(' \t - [x] 혼합').properties.get('--tle-indent'),'27px');
});
test('guide levels share the measured prefix while retaining the existing nine-pixel decoration inset',()=>{
 const a=run('      - [ ] 하위',{wrapped:true,guides:[0,2,4]});assert.deepEqual(a.guides.map(g=>g.style.left),['9px','18px','27px']);
 const b=run('\t\t- [ ] 하위',{guides:[2]});assert.equal(b.guides[0].style.left,'27px');
});
test('zero indent and non-text decoration do not fabricate raw content',()=>{
 const a=run('- [ ] 처음');assert.equal(a.properties.get('--tle-indent'),'0px');assert.equal(a.offsets.length,0);
 const context=vm.createContext({row:{firstChild:{nodeType:1,firstChild:null}},doc:{createRange(){throw Error('unexpected');}}});
 vm.runInContext(helper+'\nsyncRowIndent(row)',context);
});
test('the geometry sync reads only presentation and runs before checkbox controls are positioned',()=>{
 assert(source.indexOf('rows.forEach(syncRowIndent);')<source.indexOf('checkButtons.forEach(({ button, row: checkRow, glyph })'));
 for(const mutation of ['textarea.value =','setSelectionRange','focus(','replaceChildren','dispatchEvent','onChange'])assert(!helper.includes(mutation),mutation);
 assert(!source.includes('`${rawIndent.columns}ch`'));assert(source.includes('guide.dataset.indentColumns = String(depth * 2)'));
});

test('reading titles clear the full 44px hit without shrinking its target or changing the native ruler',()=>{
 const reading=source.slice(source.indexOf('    function syncReadingTaskInset(row) {'),source.indexOf('    function syncGeometry() {'));
 function inset(prefixWidth:number,glyphRight:number,controls=true,width=200){
  const properties=new Map(),prefix={getBoundingClientRect:()=>({width:prefixWidth})},glyph={getBoundingClientRect:()=>({right:glyphRight})};
  const row={clientWidth:width,getBoundingClientRect:()=>({left:10}),querySelector:(selector:string)=>selector==='.tle-hidden-syntax'?prefix:glyph,style:{setProperty:(key:string,value:string)=>properties.set(key,value)}};
  vm.runInContext(reading+'\nsyncReadingTaskInset(row)',vm.createContext({row,config:{controls}}));return properties.get('--tle-task-prefix');
 }
 assert.equal(inset(38.796875,36.96875),'40.96875px');
 assert.equal(inset(47.75,45.921875),'49.921875px');
 assert.equal(inset(60,36.96875),'60px');
 assert.equal(inset(38.796875,36.96875,false),'38.796875px');
 assert.equal(inset(180,170,true,200),'156px');
 assert(source.includes('if (readingView || foldedIds.size) rows.forEach(syncReadingTaskInset);'));
 assert(!reading.includes('textarea'));assert(!reading.includes('focus('));assert(!reading.includes('setSelectionRange'));
});
