import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('./program-browser-record.mjs',import.meta.url),'utf8');
const template=source.match(/const buildReader = (`[\s\S]*?`);/)[1];
const reader=vm.runInNewContext(template);
const entry=id=>[1,`0:${JSON.stringify({b:id})}\n`];
const inline=id=>({textContent:`self.__next_f.push(${JSON.stringify(entry(id))});`});
const inspect=(entries,scripts)=>vm.runInNewContext(`(${reader})()`,{self:{__next_f:entries},document:{scripts}});

test('live Flight buffer and document script agree on the actual build',()=>assert.equal(inspect([entry('build-one')],[inline('build-one')]),'build-one'));
test('consumed Flight buffer falls back to the same document payload, not local build metadata',()=>assert.equal(inspect([[0]],[inline('build-two')]),'build-two'));
test('conflicting build evidence fails closed',()=>assert.equal(inspect([entry('old')],[inline('new')]),null));
test('malformed and executable-looking script contents are not executed',()=>assert.equal(inspect([], [{textContent:'self.__next_f.push((()=>{throw new Error("executed")})())'},{textContent:'self.__next_f.push([invalid])'}]),null));

const routeSource=source.match(/function matchesRouteAsset\(value, expectedRouteChunk\) \{[\s\S]*?\n\}/)[0];
const route=vm.runInNewContext(`(${routeSource})`,{URL});
test('empty inline-script and malformed resource entries cannot crash evidence recording',()=>{
  for(const value of ['',null,undefined,42,'not-a-url'])assert.equal(route(value,'static/chunks/app/my/page-test.js'),false);
});
test('runtime asset evidence still requires exact route pathname',()=>{
  const chunk='static/chunks/app/my/page-test.js';
  assert.equal(route('http://127.0.0.1:3641/_next/'+chunk,chunk),true);
  assert.equal(route('http://127.0.0.1:3641/_next/'+chunk+'-old',chunk),false);
  assert.equal(route('http://127.0.0.1:3641/_next/'+chunk,undefined),false);
});
