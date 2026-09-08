'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');
const { startServer } = require('./serve.cjs');

const BROWSER_SUITES = [
  'browser-regression.cjs',
  'browser-progress.cjs',
  'browser-v11.cjs',
  'browser-direct.cjs',
  'browser-freedom.cjs',
];

function run(file, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, file), ...args], {
      cwd: __dirname,
      env: { ...process.env, ...env },
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(file + ' failed: ' + (signal || code))));
  });
}

(async () => {
  const hosted = await startServer(0);
  try {
    console.log('브라우저 검사 주소: ' + hosted.url);
    await Promise.all(BROWSER_SUITES.map(file => run(file, ['--run', '--final'], { FLOWME_V11_URL: hosted.url })));
    await run('build-portable.cjs', [], {});
    await run('portable-smoke.cjs', [], {});
    await run('verify-package.cjs', [], {});
    console.log('FlowMe v11 전체 재검사 완료');
  } finally {
    await hosted.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
