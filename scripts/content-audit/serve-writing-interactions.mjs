import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
const files = new Map([
  ['/', ['docs/content-audit/2026-10-01-flowme-writing-interactions-lab-ko.html','text/html; charset=utf-8']],
  ['/2026-10-01-flowme-writing-interactions-lab-ko.html', ['docs/content-audit/2026-10-01-flowme-writing-interactions-lab-ko.html','text/html; charset=utf-8']],
  ['/2026-10-01-flowme-writing-interactions-review-ko.html', ['docs/content-audit/2026-10-01-flowme-writing-interactions-review-ko.html','text/html; charset=utf-8']],
]);
for(const name of ['spec','plan','tasks','qa','ownership','results'])for(const prefix of ['/docs/specs','/specs'])files.set(`${prefix}/2026-10-01-alpha-writing-interactions/${name}.md`,[`docs/specs/2026-10-01-alpha-writing-interactions/${name}.md`,'text/plain; charset=utf-8']);
const server = http.createServer(async (request,response)=>{if(request.method!=='GET'){response.writeHead(405);response.end();return;}const path=new URL(request.url,'http://127.0.0.1').pathname,entry=files.get(path);if(!entry){response.writeHead(404);response.end();return;}try{const body=await readFile(resolve(root,entry[0]));response.writeHead(200,{'Content-Type':entry[1],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(body);}catch{response.writeHead(500);response.end('Unavailable');}});
server.listen(3113,'127.0.0.1',()=>console.log(`Writing interactions local artifacts http://127.0.0.1:3113 · PID${process.pid}`));
