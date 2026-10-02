import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
async function main(){
  const label=process.env.FLOWME_JOURNEY_REPORT_LABEL;
  if(label!==undefined&&!/^[a-z0-9-]+$/.test(label))throw Error('report-label-rejected');
  const folder=resolve(`output/playwright/flow-execution-journey-report${label?`-${label}`:''}`);mkdirSync(folder,{recursive:true});
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const results:any[]=[];
  for(const [width,height] of [[390,844],[375,812],[844,390],[1024,768],[1440,900]]){
    const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors:string[]=[];
    page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    try{
      await page.goto(pathToFileURL(resolve('docs/content-audit/2026-10-01-flowme-flow-execution-journey-report-ko.html')).href);
      await expect(page.getByRole('heading',{level:1})).toHaveText('제작한 Flow에서 개인 실행으로 이어가기');
      await expect(page.locator('#verification-status')).toContainText('이번 연결 후보의 구현·앱 검증을 마쳤습니다');
      await expect(page.locator('#verification-status')).toContainText('기존 alpha 서비스는 교체하지 않았습니다');
      assert.equal(await page.locator('#requirement-results tbody tr').count(),10);
      await expect(page.locator('#test-results')).toContainText('105/105 PASS');
      await expect(page.locator('#test-results')).toContainText('60/60 PASS');
      await expect(page.locator('#test-results')).toContainText('2,258/2,258 PASS');
      await expect(page.locator('#test-results')).toContainText('20/20 PASS');
      assert.equal(await page.locator('#scenario-results tbody tr').count(),4);
      assert.equal(await page.locator('#viewport-results tbody tr').count(),5);
      await expect(page.locator('body')).toContainText('20완료·10PASS/10FAIL');
      const link=page.getByRole('link',{name:'직접 조작하는 HTML',exact:true});await link.focus();await expect(link).toBeFocused();
      const guide=page.locator('#qa-start-guide summary');await guide.focus();await expect(guide).toBeFocused();await guide.press('Enter');
      await expect(page.locator('#qa-start-guide code')).toBeVisible();
      await expect(page.locator('#qa-start-guide code')).toContainText('sb_publishable_synthetic_release');
      await expect(page.locator('#qa-start-guide code')).toContainText('next start -H 127.0.0.1 -p 3107');
      const evidence=page.locator('#app-screen-evidence summary');await evidence.focus();await evidence.press('Enter');
      await expect(page.locator('#app-screen-evidence img')).toHaveCount(2);
      const current=page.locator('#current-app-screens summary');await current.focus();await current.press('Enter');
      await expect(page.locator('#current-app-screens img')).toHaveCount(2);
      await expect.poll(()=>page.locator('.screenlist img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
      assert(await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)<=innerWidth+1));
      assert.deepEqual(errors,[]);await page.screenshot({path:resolve(folder,`report-${width}.png`),fullPage:true});
      await page.screenshot({path:resolve(folder,`report-${width}-viewport.png`)});
      await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:resolve(folder,`report-${width}-top.png`)});
      results.push({width,height,ok:true,errors});
    }catch(error){results.push({width,height,ok:false,error:String(error),errors});}finally{await context.close();}
  }
  await browser.close();writeFileSync(resolve(folder,'results.json'),JSON.stringify({scope:'Report render and keyboard link QA only',results},null,2));
  console.log(JSON.stringify({passed:results.filter(item=>item.ok).length,failed:results.filter(item=>!item.ok).length,results},null,2));if(results.some(item=>!item.ok))process.exitCode=1;
}
void main().catch(error=>{console.error(String(error));process.exitCode=1;});
