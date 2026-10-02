import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Locator } from 'playwright';
import { expect } from '@playwright/test';
const root=resolve('output/playwright/flow-execution-journey-lab');mkdirSync(root,{recursive:true});
async function main(){
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const results:unknown[]=[];
  for(const [width,height] of [[390,844],[375,812],[844,390],[1024,768],[1440,900]]){
    const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
    const writes:{method:string;key:string}[]=[],errors:string[]=[],network:string[]=[];
    await context.exposeBinding('__journeyAudit',(_,entry)=>{writes.push(entry);});
    // Plain source prevents tsx's function-name helper leaking into a browser
    // instrumentation callback. This does not suppress any product error.
    await context.addInitScript({content:String.raw`
      localStorage.setItem('flow:saved-plans',' original sentinel\r\n');localStorage.setItem('other-app:key',' bytes  ');
      for(const method of ['setItem','removeItem','clear']){const original=Storage.prototype[method];
        Object.defineProperty(Storage.prototype,method,{configurable:true,value:function(...args){
          globalThis.__journeyAudit({method,key:args[0]??''});
          if(method==='clear'||args[0]!=='flow:poc:personal-workspace:v1:journey-lab:flow-execution:v1')throw Error('lab-writer-outside-exact-key');
          return Reflect.apply(original,this,args);
        }});
      }
    `});
    page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    page.on('request',request=>{if(!request.url().startsWith('file:'))network.push(request.url());});
    const snapshot=()=>page.evaluate(()=>(globalThis as any).FlowExecutionJourneyLab.snapshot());
    async function click(target:Locator){await expect(target).toBeVisible();await target.evaluate(element=>element.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
      await expect.poll(()=>target.evaluate(element=>{const r=element.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&!!hit&&(hit===element||element.contains(hit));})).toBe(true);await target.click();}
    try{
      await page.goto(pathToFileURL(resolve('docs/content-audit/2026-10-01-flowme-flow-execution-journey-lab-ko.html')).href);
      const before=await snapshot();await page.locator('#open-native').focus();await page.keyboard.press('Enter');
      let current=await snapshot();assert.deepEqual(current.data,before.data);assert.equal(current.metrics.successfulWrites,0);assert.equal(current.documentId,'personal-native-1');
      const item='native:source-task-a',row=()=>page.locator('[data-item-id="'+item+'"]');
      await click(row().getByRole('button',{name:'내용·날짜·메모',exact:true}));await page.getByLabel('실행 날짜',{exact:true}).fill('2026-10-02');
      await page.getByLabel('개인 메모 · 한 줄',{exact:true}).fill('합성 개인 메모');await click(page.locator('#edit-save'));assert.equal((await snapshot()).metrics.successfulWrites,1);
      for(const view of ['week','month']){await click(page.locator('[data-view="'+view+'"]'));await expect(row()).toBeVisible();}
      await click(row().getByRole('button',{name:'완료',exact:true}));assert.equal((await snapshot()).data.documents[0].items[0].done,true);
      await click(row().getByRole('button',{name:'개인 문서의 같은 항목 열기',exact:true}));assert.equal((await snapshot()).dirty,false);
      await click(page.locator('#edit-cancel'));await click(row().getByRole('button',{name:'다시 열기',exact:true}));assert.equal((await snapshot()).data.documents[0].items[0].done,false);
      await click(page.locator('#undo'));assert.equal((await snapshot()).data.documents[0].items[0].done,true);
      await click(page.locator('[data-view="source"]'));await page.getByLabel('명시 선택 판본',{exact:true}).selectOption('2');
      const kept=await snapshot();await click(page.locator('#source-action'));await expect(page.locator('#compare-apply')).toBeDisabled();
      await page.keyboard.press('Escape');assert.deepEqual((await snapshot()).data,kept.data);await expect(page.locator('#source-action')).toBeFocused();
      await page.getByLabel('원본 영역',{exact:true}).selectOption('public');await click(page.locator('#source-action'));
      assert.equal((await snapshot()).data.documents.length,2);assert.equal((await snapshot()).data.documents[1].version,2);
      await click(page.locator('[data-view="source"]'));await page.getByLabel('원본 영역',{exact:true}).selectOption('creator');
      await click(page.locator('#open-native'));await click(row().getByRole('button',{name:'내용·날짜·메모',exact:true}));
      await page.getByLabel('개인 메모 · 한 줄',{exact:true}).fill('저장 실패 뒤 남은 입력');
      await click(page.locator('#lab-management > summary'));await page.locator('#simulate-error').check();
      const rejected=await snapshot();await click(page.locator('#edit-save'));current=await snapshot();
      assert.deepEqual(current.data,rejected.data);assert.equal(current.pending,true);assert.equal(current.metrics.successfulWrites,rejected.metrics.successfulWrites);
      await expect(page.locator('#edit-note')).toHaveValue('저장 실패 뒤 남은 입력');await page.locator('#simulate-error').uncheck();await click(page.locator('#retry'));
      assert.equal((await snapshot()).data.documents[0].items[0].note,'저장 실패 뒤 남은 입력');
      const saved=await snapshot();await page.reload();assert.deepEqual((await snapshot()).data,saved.data);assert.deepEqual((await snapshot()).undo,saved.undo);
      await click(page.locator('#lab-management > summary'));await page.locator('#binding-mode').selectOption('foreign');await expect(page.locator('#open-native')).toBeDisabled();
      await page.locator('#binding-mode').selectOption('valid');
      const key=saved.storageKey;await page.evaluate(key=>localStorage.setItem(key,'{"schema":999}'),key);await page.reload();
      assert.equal((await snapshot()).blocked,true);await expect(page.locator('#open-native')).toBeDisabled();assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),'{"schema":999}');
      await click(page.locator('#lab-management > summary'));page.once('dialog',dialog=>dialog.accept());await click(page.locator('#reset'));
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null);assert.equal((await snapshot()).blocked,false);
      assert.equal(await page.evaluate(()=>localStorage.getItem('flow:saved-plans')),' original sentinel\r\n');assert.equal(await page.evaluate(()=>localStorage.getItem('other-app:key')),' bytes  ');
      assert.equal((await snapshot()).sourceUnchanged,true);assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
      assert.equal(writes.filter(write=>write.method==='clear'||write.key!==key).length,0);assert.equal(writes.filter(write=>write.method==='removeItem').length,1);
      assert(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)<=innerWidth+1));
      await page.screenshot({path:resolve(root,`lab-${width}.png`),fullPage:true});results.push({width,height,ok:true,checks:9,writes,errors,network});
    }catch(error){await page.screenshot({path:resolve(root,`lab-${width}-failure.png`),fullPage:true}).catch(()=>{});results.push({width,height,ok:false,error:String(error),writes,errors,network});}
    finally{await context.close();}writeFileSync(resolve(root,'results.json'),JSON.stringify({scope:'Standalone simplified synthetic HTML only; not app/Auth/DB/device/user validation',results},null,2));
  }
  await browser.close();console.log(JSON.stringify({passed:results.filter((item:any)=>item.ok).length,failed:results.filter((item:any)=>!item.ok).length,results:results.map((item:any)=>({width:item.width,ok:item.ok,error:item.error}))},null,2));
  if(results.some((item:any)=>!item.ok))process.exitCode=1;
}
void main().catch(error=>{console.error(String(error));process.exitCode=1;});
