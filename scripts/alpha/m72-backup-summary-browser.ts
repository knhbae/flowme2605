/** Actual preservation component in isolated Chromium, synthetic preview HTTP only.
 * No app server, credentials, real account, backup or remote service is accessed. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const entry = `
import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{AlphaPreservationPanel}from'./components/flow/integrated-poc/AlphaPreservationPanel';
import{createProgramPrivateSpace}from'./lib/flow/integrated-poc/program-data';
import{summarizePreservationContent}from'./lib/flow/integrated-poc/alpha-preservation/content-summary';
const owner='11111111-1111-4111-8111-111111111111',space=createProgramPrivateSpace();
const empty=summarizePreservationContent(space),full={...empty,creatorDrafts:2,creatorWorkingCopies:1,catalogFlows:177,catalogItems:957,catalogSections:371,catalogMaps:26,catalogVariants:2};
const mode=new URL(location.href).searchParams.get('mode');
window.summaryFixture={requests:[],saved:0};
window.fetch=async(url,init)=>{
 const body=JSON.parse(init.body);window.summaryFixture.requests.push(body.kind);
 if(url!='/api/alpha/preservation'||body.kind!=='preview')throw Error('unexpected-request');
 return{json:async()=>({ok:true,value:{ownerId:owner,mode:'restore',sourceSha256:'a'.repeat(64),expectedRevision:75,expectedPublicRevision:0,
 canApply:true,same:false,createdAt:'2026-09-23T06:32:41.638Z',documents:0,savedFlows:0,warnings:[],details:[],
 ...(mode==='missing'?{}:{content:{current:mode==='catalog'?empty:full,next:mode==='catalog'?full:empty}})}})};
};
function App(){const[open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>자료 가져오기 · 백업</button>{open&&<AlphaPreservationPanel
 account={{schema:'flowme-alpha-account/1',ownerId:owner,revision:75,source:{schema:'flowme-integrated-product-poc/1',actorId:owner,revision:0},space,legacyUndo:[],legacyReceipts:[]}}
 references={{actorIds:[owner],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}}}
 email="synthetic@example.invalid" accessToken="synthetic-token-no-network" onClose={()=>setOpen(false)} onSaved={async()=>{window.summaryFixture.saved++;}}/>}</>;}
createRoot(document.getElementById('root')).render(<App/>);
`;
async function main() {
  const output = `output/playwright/alpha-m72-backup-summary/${new Date().toISOString().replace(/[:.]/g, '-')}`;
  await mkdir(output, { recursive: true });
  const sources = ['components/flow/integrated-poc/AlphaPreservationPanel.tsx', 'components/flow/integrated-poc/AlphaPreservationPanel.module.css',
    'lib/flow/integrated-poc/alpha-preservation/content-summary.ts'];
  const hashes = await Promise.all(sources.map(async path => ({ path, sha256: createHash('sha256').update(await readFile(path)).digest('hex') })));
  const bundled = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, platform: 'browser', format: 'iife',
    write: false, outfile: resolve(output, 'component.js'), loader: { '.css': 'local-css' }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent' });
  const js = bundled.outputFiles.find(file => file.path.endsWith('.js'))!.text;
  const globals = await readFile('app/globals.css', 'utf8');
  const css = globals.slice(globals.indexOf(':root'), globals.indexOf('[data-flow-anatomy]')) + '\n*{box-sizing:border-box}body{margin:0}button{cursor:pointer}\n' + bundled.outputFiles.filter(file => file.path.endsWith('.css')).map(file => file.text).join('\n');
  const browser = await chromium.launch({ headless: true });
  const checks: string[] = [], screenshots: string[] = [], scenarios: object[] = [];
  const check = (label: string, value: unknown) => { assert(value, label); checks.push(label); };
  try {
    for (const mode of ['catalog', 'older', 'missing']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
      const page = await context.newPage(), errors: string[] = [], external: string[] = [];
      page.setDefaultTimeout(15_000);
      page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      const url = `http://localhost:3210/?mode=${mode}`;
      await context.route('**/*', route => {
        if (route.request().isNavigationRequest() && route.request().url() === url) return route.fulfill({ contentType: 'text/html',
          body: '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>백업 비교 격리 검사</title><body><main id="root"></main></body></html>' });
        external.push(route.request().url()); return route.abort();
      });
      await page.addInitScript(() => {
        localStorage.setItem('flow:sentinel', 'unchanged\r\n');
        (window as any).summaryWrites = [];
        for (const method of ['setItem', 'removeItem', 'clear'] as const) {
          const original = Storage.prototype[method];
          Storage.prototype[method] = function (...args: any[]) { (window as any).summaryWrites.push(method); return (original as any).apply(this, args); };
        }
      });
      try {
        await page.goto(url); await page.addStyleTag({ content: css }); await page.addScriptTag({ content: js });
        const open = page.getByRole('button', { name: '자료 가져오기 · 백업', exact: true });
        await open.click(); const dialog = page.getByRole('dialog');
        await page.getByRole('button', { name: '사진 포함 백업 만들기', exact: true }).waitFor();
        const input = page.getByLabel('JSON 파일 선택');
        await input.setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schema: 'flowme-alpha-sealed-account-backup/1', backup: { synthetic: true }, proof: 'a'.repeat(64) })) });
        const preview = page.getByRole('button', { name: '적용 전 미리보기', exact: true }); await preview.click();
        const area = page.getByRole('region', { name: '자료 적용 미리보기', exact: true }); await area.waitFor();
        const apply = page.getByRole('button', { name: '이 백업으로 개인공간 복원', exact: true });
        if (mode === 'missing') { check(`${mode}:no-table`, await area.getByRole('table').count() === 0); check(`${mode}:no-apply`, await apply.count() === 0); }
        else {
          const row = area.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '자료실 Flow', exact: true }) });
          check(`${mode}:catalog-counts`, JSON.stringify(await row.getByRole('cell').allTextContents()) === JSON.stringify(mode === 'catalog' ? ['0개', '177개'] : ['177개', '0개']));
          check(`${mode}:unchecked-disables-apply`, await apply.isDisabled());
        }
        for (const [width, height] of [[390, 844], [375, 812], [844, 390], [1024, 768], [1440, 900]]) {
          await page.setViewportSize({ width, height });
          const anchor = mode === 'missing' ? area.getByRole('alert') : area.getByRole('table');
          await anchor.scrollIntoViewIfNeeded();
          const bounds = await anchor.boundingBox();
          check(`${mode}:${width}:table-horizontal-fit`, bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
          check(`${mode}:${width}:no-overflow`, await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1) && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          const shot = `${output}/${mode}-${width}x${height}.png`; await page.screenshot({ path: shot }); screenshots.push(shot);
          if (mode !== 'missing') {
            const confirm = area.getByRole('checkbox'); await confirm.focus(); await page.keyboard.press('Space');
            check(`${mode}:${width}:keyboard-confirm`, await confirm.isChecked() && await apply.isEnabled());
            await page.keyboard.press('Tab'); check(`${mode}:${width}:keyboard-apply-focus`, await apply.evaluate(el => el === document.activeElement));
            const action = await apply.boundingBox(); check(`${mode}:${width}:apply-visible`, action && action.height >= 48 && action.y >= 0 && action.y + action.height <= height + 1);
            await confirm.uncheck();
          }
        }
        await area.getByRole('button', { name: '취소', exact: true }).click();
        check(`${mode}:cancel-clears-preview`, await area.count() === 0);
        await page.keyboard.press('Escape'); check(`${mode}:escape-closes`, await dialog.count() === 0);
        check(`${mode}:focus-restored`, await open.evaluate(el => el === document.activeElement));
        const state = await page.evaluate(() => ({ ...(window as any).summaryFixture, writes: (window as any).summaryWrites, sentinel: localStorage.getItem('flow:sentinel') }));
        check(`${mode}:preview-only`, JSON.stringify(state.requests) === '["preview"]' && state.saved === 0);
        check(`${mode}:storage-unchanged`, state.writes.length === 0 && state.sentinel === 'unchanged\r\n');
        check(`${mode}:external-zero`, external.length === 0); check(`${mode}:console-page-errors-zero`, errors.length === 0);
        scenarios.push({ mode, state, errors, external });
      } catch (error) {
        await page.screenshot({ path: `${output}/${mode}-failure.png` });
        await writeFile(`${output}/${mode}-failure.txt`, await page.locator('body').innerText()); throw error;
      } finally { await context.close(); }
    }
    const result = { pass: true, evidence: 'actual React component / synthetic preview / isolated Chromium; not app-server or device validation', checks, scenarios, screenshots,
      hashes, viewports: 5, actualDevices: 0, realAccounts: 0, remoteCalls: 0, observedUsers: 0 };
    await writeFile(`${output}/result.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify({ pass: true, checks: checks.length, output }));
  } catch (error) { await writeFile(`${output}/result.json`, JSON.stringify({ pass: false, error: String(error), checks, screenshots }, null, 2)); throw error; }
  finally { await browser.close(); }
}
void main().catch(error => { console.error(String(error)); process.exitCode = 1; });
