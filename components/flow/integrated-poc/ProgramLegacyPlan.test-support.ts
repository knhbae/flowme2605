import {readFileSync,existsSync} from 'node:fs';import {createRequire} from 'node:module';import {resolve,dirname} from 'node:path';import vm from 'node:vm';import ts from 'typescript';
/** Real child modules, with CSS and React hooks supplied by the handler harness. */
export function loadProgramPlanUi(path:string,hooks:unknown):any {
 const cache=new Map<string,any>();const root=resolve(dirname(path),'../../..');
 function load(file:string):any{if(cache.has(file))return cache.get(file);const req=createRequire(file),module={exports:{}};cache.set(file,module.exports);
  const output=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  vm.runInThisContext(`(function(module,exports,require){${output}\n})`)(module,module.exports,(id:string)=>{if(id==='react')return hooks;if(id.endsWith('.css'))return{__esModule:true,default:{}};const p=id.startsWith('@/')?resolve(root,id.slice(2)):id.startsWith('.')?resolve(dirname(file),id):null;return p&&existsSync(p+'.tsx')?load(p+'.tsx'):req(p??id);});return module.exports;
 }return load(path);
}
