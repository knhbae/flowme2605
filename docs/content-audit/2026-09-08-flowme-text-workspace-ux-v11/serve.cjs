'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = __dirname;
const FILES = new Map([
  ['/index.html', 'text/html; charset=utf-8'],
  ['/styles.css', 'text/css; charset=utf-8'],
  ['/editor.css', 'text/css; charset=utf-8'],
  ['/model.js', 'text/javascript; charset=utf-8'],
  ['/editor.js', 'text/javascript; charset=utf-8'],
  ['/app.js', 'text/javascript; charset=utf-8'],
]);

function startServer(port = Number(process.env.FLOWME_V11_PORT || 8771)) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('port must be an integer from 0 to 65535');
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname === '/' ? '/index.html' : new URL(request.url, 'http://127.0.0.1').pathname;
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
    }
    if (!FILES.has(pathname)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found'); return;
    }
    fs.readFile(path.join(ROOT, pathname.slice(1)), (error, data) => {
      if (error) {
        response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Read failed'); return;
      }
      response.writeHead(200, { 'Content-Type': FILES.get(pathname), 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : data);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      const actualPort = server.address().port;
      resolve({
        server,
        url: `http://127.0.0.1:${actualPort}/index.html`,
        close: () => new Promise((done, fail) => server.close(error => error ? fail(error) : done())),
      });
    });
  });
}

if (require.main === module) {
  startServer(Number(process.argv[2] || process.env.FLOWME_V11_PORT || 8771)).then(({ url }) => {
    console.log('FlowMe v11: ' + url);
    console.log('종료: Ctrl+C');
  }).catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { startServer };
