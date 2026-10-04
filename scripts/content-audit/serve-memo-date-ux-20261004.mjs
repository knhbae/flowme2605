import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// One explicit, self-contained review artifact. No directory or product API.
const file = new URL('../../docs/content-audit/2026-10-04-flowme-memo-date-ux-ko.html', import.meta.url);
const html = readFileSync(file);
const sha256 = createHash('sha256').update(html).digest('hex');
const server = createServer((request, response) => {
  if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
  if (request.url === '/favicon.ico') { response.writeHead(204); response.end(); return; }
  if (request.url !== '/memo-date.html') { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'",
    'X-Content-Type-Options': 'nosniff' });
  response.end(html);
});
server.listen(3114, '127.0.0.1', () => console.log(JSON.stringify({ origin: 'http://127.0.0.1:3114/memo-date.html', sha256, productApi: false })));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
