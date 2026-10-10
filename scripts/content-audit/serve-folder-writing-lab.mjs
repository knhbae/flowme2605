import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const routes = new Map([
  ['/', [new URL('../../docs/content-audit/2026-10-01-flowme-folder-writing-lab-ko.html', import.meta.url), 'text/html; charset=utf-8']],
  ['/folder-writing-lab-model.cjs', [new URL('./folder-writing-lab-model.cjs', import.meta.url), 'text/plain; charset=utf-8']],
]);
const labFile = '2026-10-01-flowme-folder-writing-lab-ko.html';
const reviewFile = '2026-10-01-flowme-folder-writing-review-ko.html';
routes.set(`/docs/content-audit/${labFile}`, routes.get('/'));
routes.set(`/${labFile}`, routes.get('/'));
routes.set(`/docs/content-audit/${reviewFile}`, [new URL(`../../docs/content-audit/${reviewFile}`, import.meta.url), 'text/html; charset=utf-8']);
for (const path of [
  '2026-10-01-alpha-folder-writing-ux/qa.md',
  '2026-10-01-alpha-folder-writing-ux/results.md',
  '2026-10-01-alpha-folder-writing-ux/contracts.md',
  '2026-10-01-alpha-folder-writing-ux/feedback-map.md',
  '2026-10-01-alpha-folder-writing-ux/ownership.md',
  '2026-10-01-alpha-ux-journey/requirements.md',
  '2026-10-01-alpha-ux-journey/ux-source-adoption.md',
]) routes.set(`/docs/specs/${path}`, [new URL(`../../docs/specs/${path}`, import.meta.url), 'text/plain; charset=utf-8']);
for (const directory of ['ux-journey-after-final', 'folder-writing-regression-final-v2']) {
  const path = `output/playwright/${directory}/artifacts/ux-journey.browser.ts-same-81857-iod-and-original-row-return-844x390/first-viewport.png`;
  routes.set(`/${path}`, [new URL(`../../${path}`, import.meta.url), 'image/png']);
}
export function createServer() {
  return http.createServer(async (req, res) => {
    if (req.method !== 'GET') { res.writeHead(405, { Allow: 'GET' }); res.end(); return; }
    const route = routes.get(req.url);
    if (!route) { res.writeHead(404); res.end('Not found'); return; }
    try {
      const body = await readFile(route[0]);
      res.writeHead(200, { 'Content-Type': route[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(body);
    } catch { res.writeHead(500); res.end('Unavailable'); }
  });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = process.argv[2] === '3111' ? 3111 : 3110;
  if (process.argv[2] && !['3110', '3111'].includes(process.argv[2])) throw Error('folder-writing-port-rejected');
  createServer().listen(port, '127.0.0.1', () => console.log(`Folder writing local artifacts: http://127.0.0.1:${port}`));
}
