import http from 'node:http';
import { readFile } from 'node:fs/promises';

// One explicit synthetic HTML only. No directory, account, API or storage access.
const file = new URL('../../docs/content-audit/2026-10-04-flowme-date-detail-ux-ko.html', import.meta.url);
const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' || request.url !== '/date-detail.html') { response.writeHead(404); response.end(); return; }
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'" });
    response.end(body);
  } catch { response.writeHead(503); response.end('Prototype not ready'); }
});
server.listen(3116, '127.0.0.1', () => console.log('Date detail HTML: http://127.0.0.1:3116/date-detail.html'));
