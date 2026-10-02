import { defineConfig } from '@playwright/test';
// Existing Alpha browser regressions only. Do not execute historical mirrors.
const label = process.env.FLOWME_JOURNEY_REGRESSION_LABEL;
if (label !== undefined && !/^[a-z0-9-]+$/.test(label)) throw Error('journey-regression-label-rejected');
const output = `../../output/playwright/flow-execution-journey-regression${label ? `-${label}` : ''}`;
export default defineConfig({
  testDir:'../../tests/e2e', testMatch:['cloudflare-release.browser.ts','folder-content-entry.browser.ts'],
  workers:1,retries:0,timeout:45_000,expect:{timeout:5_000},
  outputDir:output,
  reporter:[['json',{outputFile:`${output}/results.json`}]],
  use:{baseURL:'https://alpha.wikiplans.com',serviceWorkers:'block',timezoneId:'Asia/Seoul',trace:'retain-on-failure',screenshot:'only-on-failure',
    launchOptions:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}},
  projects:[['390x844',390,844],['375x812',375,812],['844x390',844,390],['1024x768',1024,768],['1440x900',1440,900]]
    .map(([name,width,height])=>({name:String(name),use:{viewport:{width:Number(width),height:Number(height)}}})),
});
