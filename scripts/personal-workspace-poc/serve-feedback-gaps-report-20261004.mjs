import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Exact public report only; no directory listing, auth, API or arbitrary files.
const report = new URL('../../docs/content-audit/2026-10-04-flowme-memo-date-feedback-gaps-report-ko.html', import.meta.url);
const server = createServer(async (request,response) => {
  if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
  if (request.url === '/favicon.ico') { response.writeHead(204); response.end(); return; }
  if (request.url !== '/') { response.writeHead(404); response.end(); return; }
  try { response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}); response.end(await readFile(report)); }
  catch { response.writeHead(500); response.end('Report unavailable'); }
});
server.listen(3118,'127.0.0.1',()=>console.log(JSON.stringify({scope:'single-report-qa',url:'http://127.0.0.1:3118/',file:fileURLToPath(report)})));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>process.exit(0)));
