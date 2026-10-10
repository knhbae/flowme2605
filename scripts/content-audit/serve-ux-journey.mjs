import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve('docs/content-audit');
const allowed = new Set(['2026-10-01-flowme-ux-journey-lab-ko.html', '2026-10-01-flowme-ux-journey-review-ko.html']);
const server = createServer((request, response) => {
  const name = new URL(request.url, 'http://127.0.0.1').pathname.slice(1);
  if (request.method !== 'GET' || !allowed.has(name)) { response.writeHead(404); response.end(); return; }
  try { response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(readFileSync(resolve(root, name))); } catch { response.writeHead(404); response.end(); }
});
server.listen(3109, '127.0.0.1', () => process.stdout.write('UX HTML local-only 127.0.0.1:3109\n'));
process.on('SIGINT', () => server.close());
process.on('SIGTERM', () => server.close());
