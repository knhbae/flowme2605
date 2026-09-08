'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const baseline=JSON.parse(read('baseline.json'));
assert.equal(baseline.preserved.length,39);
assert.match(baseline.purpose,/Historical preservation snapshot/);
const sources=['index.html','model.js','editor.js','app.js','editor.css','styles.css'];
const sourceHashes=Object.fromEntries(sources.map(name=>[name,sha(read(name))]));
const scripts=['model.js','editor.js','app.js','model.test.cjs','model-movement.test.cjs','browser-regression.cjs','browser-progress.cjs','browser-v11.cjs','browser-direct.cjs','browser-freedom.cjs','build-portable.cjs','portable-smoke.cjs','serve.cjs','verify-all.cjs'];
for(const name of scripts)new vm.Script(read(name),{filename:name});
const captureNames=['freedom-depth-375x844.png','freedom-nested-375x844.png','freedom-depth-1194x834.png'];
const captureHashes=Object.fromEntries(captureNames.map(name=>{const data=fs.readFileSync(path.join(__dirname,'captures',name));assert(data.length>0);return [name,sha(data)];}));
const suites=[];
for(const [file,total,pattern] of [['model.test.cjs',341,/(\d+)\/(\d+) model checks passed\./],['model-movement.test.cjs',64,/(\d+)\/(\d+) v11 movement checks passed\./]]){
  const output=execFileSync(process.execPath,[path.join(__dirname,file)],{encoding:'utf8'}),count=output.match(pattern);
  assert(count,'missing completed model summary: '+file);assert.equal(count[1],count[2]);assert.equal(Number(count[1]),total);
  const checks=output.split(/\r?\n/).filter(line=>line.startsWith('PASS '));assert.equal(checks.length,total);
  suites.push({file,passed:total,total,testSha256:sha(read(file)),checks,seedDestinations:output.match(/verified (\d+) seed destinations/)?.[1]||null});
}
const model={createdAt:new Date().toISOString(),passed:suites.reduce((sum,suite)=>sum+suite.passed,0),total:405,modelSha256:sourceHashes['model.js'],suites};
assert.equal(model.passed,model.total);
fs.writeFileSync(path.join(__dirname,'model-results.json'),JSON.stringify(model,null,2)+'\n');
let bundle=read('index.html').replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,name)=>'<style>\n'+read(name)+'\n</style>');
bundle=bundle.replace(/<script src="([^"]+)"><\/script>/g,(_,name)=>'<script>\n'+read(name).replace(/<\/script/gi,'<\\/script')+'\n</script>');
assert.equal(read('flowme-text-workspace-v11.html'),bundle,'portable bundle is stale');
const portable=JSON.parse(read('portable-results.json'));
assert.equal(portable.sha256,sha(bundle),'portable smoke was not run on final bundle');
assert.equal(portable.passed,13);assert.equal(portable.total,13);assert.deepEqual(portable.errors,[]);assert.deepEqual(portable.network,[]);
const browserSummaries={};
for(const [file,total] of [['browser-regression-results.json',29],['browser-progress-results.json',16],['browser-v11-results.json',18],['browser-direct-results.json',14],['browser-freedom-results.json',16]]){
  const result=JSON.parse(read(file));
  assert.equal(result.phase,'final');assert.equal(result.sourcesUnchangedDuringRun,true);assert.notEqual(result.v10UnchangedDuringRun,false);
  assert.equal(result.summary.executed,total);assert.equal(result.summary.passed,total);assert.equal(result.summary.failed,0);assert.equal(result.summary.notRun,0);
  for(const name of sources){assert.equal(result.sourceHashesBefore[name],sourceHashes[name],file+' before '+name);assert.equal(result.sourceHashesAfter[name],sourceHashes[name],file+' after '+name);}
  browserSummaries[file]=result.summary;
}
const result={createdAt:new Date().toISOString(),standalonePackage:true,preservationAtCreation:{recordedAt:baseline.createdAt,files:baseline.preserved.length,result:'unchanged'},sourceHashes,captureHashes,bundleSha256:sha(bundle),bundleMatchesSources:true,portableTestMatchesBundle:true,browserTestsMatchSources:true,modelPassed:model.passed,browserSummaries,portablePassed:portable.passed,syntaxChecks:scripts.length,realDevices:0,observedUsers:0};
fs.writeFileSync(path.join(__dirname,'integrity-results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
