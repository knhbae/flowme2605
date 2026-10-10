import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source=readFileSync(new URL('./vendor/text-editor.cjs',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('    function presentationCopyPoint('),source.indexOf('    function copyPresentation('));
function point(raw:string,visible:string,kind:string,offset:number,first:boolean,wholeRow=false){
 const classes=new Set([kind]),span:any={textContent:visible,classList:{contains:(name:string)=>classes.has(name)}};
 const node:any={nodeType:3,parentElement:span,textContent:visible};span.firstChild=node;
 const row:any={hidden:false,dataset:{lineIndex:'0',taskPrefixLength:String(raw.indexOf(visible))},textContent:raw,childNodes:[span]};
 span.closest=(selector:string)=>selector==='.tle-line'?row:kind?span:null;
 const context=vm.createContext({node,offset,first,wholeRow,rows:[row],textarea:{value:raw},mirror:{contains:()=>true},rangeOfLine:()=>({start:0,end:raw.length,text:raw}),doc:{createRange(){let end=0;return{selectNodeContents(){},setEnd(_node:unknown,n:number){end=n;},toString(){return visible.slice(0,end);}};}}});
 return vm.runInContext(helper+'\npresentationCopyPoint(node,offset,first,wholeRow)',context);
}
test('reading folder copy includes source prefix, but not the decorative folder subtitle',()=>{
 assert.equal(point('  - 업무','업무','tle-scope-name',0,true,true),0);
 assert.equal(point('  - 업무','업무','tle-scope-name',2,false),6);
 assert.equal(point('  - 업무','업무','tle-scope-name',1,true),5);
 assert(!helper.includes('clipboardData')); // mapping itself neither reads nor writes clipboard
});
test('full reading checkbox copy includes indentation and marker; partial title copy does not',()=>{
 const raw='    - [ ] 질문 적기',prefix=raw.indexOf('질문');
 assert.equal(point(raw,'질문 적기','tle-task-title',0,true,true),0);
 assert.equal(point(raw,'질문 적기','tle-task-title',0,true,false),prefix);
 assert.equal(point(raw,'질문 적기','tle-task-title',2,false),prefix+2);
 assert.equal(point(raw,'질문 적기','tle-task-title-complete',5,false),raw.length);
});
test('whole human date label maps to raw source, while ambiguous partial labels fall back',()=>{
 assert.equal(point('[2026-10-09]','10월 9일','tle-date-label',0,true,true),0);
 assert.equal(point('[2026-10-09]','10월 9일','tle-date-label',6,false),12);
 assert.equal(point('[2026-10-09]','10월 9일','tle-date-label',2,true),null);
});
test('source mapping never focuses, mutates, normalizes or reparses the native buffer',()=>{
 for(const forbidden of ['textarea.value =','focus(','setSelectionRange','onChange','dispatchEvent'])assert(!helper.includes(forbidden));
 assert(source.includes("listen(doc, 'copy', copyPresentation)"));
 assert(source.includes("event.inputType === 'insertFromPaste' && source"));
});
