import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root=resolve(import.meta.dirname,'../..'), run=process.argv[2]??'final';
assert(/^[a-z0-9-]{1,40}$/.test(run));
const output=resolve(root,`output/playwright/writing-artifacts-${run}`);
assert(!existsSync(resolve(output,'results.json')),'do not overwrite prior QA');mkdirSync(output,{recursive:true});
const report=resolve(root,'docs/content-audit/2026-10-01-flowme-writing-interactions-review-ko.html');
const lab=resolve(root,'docs/content-audit/2026-10-01-flowme-writing-interactions-lab-ko.html');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const before={report:hash(report),lab:hash(lab)}, results=[], errors=[], requests=[];
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
let outcome='failed', failure=null;
try{
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>{if(route.request().method()==='GET'&&route.request().url().startsWith('file:'))return route.continue();requests.push(route.request().url());return route.abort();});
  await context.routeWebSocket('**/*',socket=>{requests.push('websocket');socket.close();});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(`page:${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`console:${m.text()}`);});
  for(const [width,height] of [[390,844],[375,812],[844,390],[1024,768],[1440,900]]){
    await page.setViewportSize({width,height});await page.goto(pathToFileURL(report).href);
    const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
    for(const href of links)assert(existsSync(fileURLToPath(new URL(href,pathToFileURL(report)))),'missing local link');
    const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      outside:[...document.querySelectorAll('main,h1,h2,p,a,table,td')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&(r.left<-1||r.right>innerWidth+1);}).map(el=>el.tagName)}));
    assert(geometry.scrollWidth<=width);assert.deepEqual(geometry.outside,[]);
    const disclosures=[];
    for(const disclosure of await page.locator('details').all()){
      const summary=disclosure.locator('summary');await summary.focus();await summary.press('Enter');
      assert.equal(await disclosure.getAttribute('open'),'');
      const expanded=await disclosure.evaluate(el=>({rows:el.querySelectorAll('tbody tr').length,
        scrollWidth:document.documentElement.scrollWidth,
        outside:[...el.querySelectorAll('p,table,td')].filter(node=>{const r=node.getBoundingClientRect();return r.width&&(r.left<-1||r.right>innerWidth+1);}).map(node=>node.tagName)}));
      assert(expanded.scrollWidth<=width);assert.deepEqual(expanded.outside,[]);
      disclosures.push({summary:await summary.textContent(),...expanded});
      await summary.press('Enter');assert.equal(await disclosure.getAttribute('open'),null);
    }
    assert.equal(disclosures[0].rows,9);
    await page.getByRole('link',{name:'직접 조작 HTML 열기',exact:true}).focus();
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),'직접 조작 HTML 열기');
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:resolve(output,`report-${width}x${height}.png`),fullPage:true});
    await page.screenshot({path:resolve(output,`report-${width}x${height}-first.png`),fullPage:false});
    results.push({kind:'report-file',width,height,geometry,links:links.length,keyboardLink:true,disclosures});
  }
  const key='flow:poc:personal-workspace:v1:writing-input-lab:v1',calls=[];
  await page.exposeFunction('__writingFileStorageCall',call=>calls.push(call));
  await page.addInitScript(()=>{
    for(const method of ['setItem','removeItem','clear']){const native=Storage.prototype[method];Storage.prototype[method]=function(...args){void window.__writingFileStorageCall({method,key:args[0]??null});return Reflect.apply(native,this,args);};}
  });
  for(const [width,height] of [[390,844],[1440,900]]){
    await page.setViewportSize({width,height});await page.goto(pathToFileURL(lab).href);
    const area=page.getByRole('textbox',{name:'전체 문서 원문',exact:true});await area.waitFor({state:'visible'});
    const raw=await area.inputValue();await area.focus();await area.press('Control+End');await area.pressSequentially(' 파일 직접 조작');
    assert.equal(await area.inputValue(),raw+' 파일 직접 조작');
    await page.getByRole('button',{name:'실험 자료 저장',exact:true}).click();
    const stored=await page.evaluate(key=>localStorage.getItem(key),key);assert(stored);
    await page.reload();assert.equal(await area.inputValue(),raw+' 파일 직접 조작');
    assert.equal(await page.evaluate(()=>window.WritingInteractionsLab.getState().blocked),false);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:resolve(output,`lab-file-${width}x${height}.png`),fullPage:true});
    await page.screenshot({path:resolve(output,`lab-file-${width}x${height}-first.png`),fullPage:false});
    results.push({kind:'lab-file',width,height,keyboard:true,saveReload:true});
  }
  assert(calls.length>=2);assert(calls.every(c=>c.method!=='clear'&&c.key===key));
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);assert.deepEqual({report:hash(report),lab:hash(lab)},before);
  results.push({kind:'boundary',calls,errors,requests});outcome='passed';
}catch(e){failure=e.message;process.exitCode=1;}finally{
  await browser.close();const evidence={outcome,failure,source:before,results,errors,requests,
    meaning:'Real Chrome file:// interaction/render QA with disposable profile, not real-device, API or user observation.'};
  writeFileSync(resolve(output,'results.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
}
