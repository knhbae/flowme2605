import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
// Loopback-only, exact owned artifacts. No arbitrary path, directory listing,
// account, static asset, proxy, cookies, or remote request is supported.
const routes=new Map([
 ['/lab',fileURLToPath(new URL('../../docs/content-audit/2026-10-02-flowme-feedback-ux-bundle-lab-ko.html',import.meta.url))],
 ['/report',fileURLToPath(new URL('../../docs/content-audit/2026-10-02-flowme-feedback-ux-bundle-report-ko.html',import.meta.url))],
 ['/2026-10-02-flowme-feedback-ux-bundle-report-ko.html',fileURLToPath(new URL('../../docs/content-audit/2026-10-02-flowme-feedback-ux-bundle-report-ko.html',import.meta.url))],
 ['/2026-10-02-flowme-feedback-ux-bundle-lab-ko.html',fileURLToPath(new URL('../../docs/content-audit/2026-10-02-flowme-feedback-ux-bundle-lab-ko.html',import.meta.url))],
]);
const server=createServer(async(req,res)=>{
 const target=routes.get(req.url);
 if(req.method!=='GET'||!target){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');return;}
 try{const body=await readFile(target);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(body);}
 catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Artifact not ready');}
});
server.listen(3114,'127.0.0.1',()=>console.log(JSON.stringify({host:'127.0.0.1',port:3114,artifactCount:2,arbitraryFiles:false,remoteForwarding:false})));
