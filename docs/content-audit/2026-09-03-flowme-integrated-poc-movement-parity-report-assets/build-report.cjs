const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const here = __dirname;
const reportName = '2026-09-03-flowme-integrated-poc-movement-parity-report-ko.html';
const reportPath = path.join(here, '..', reportName);
const traceDir = path.join(here, '..', '2026-09-02-flowme-integrated-poc-requirements-traceability-assets');

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(traceDir, name), 'utf8'));
const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const textValue = (value) => Array.isArray(value) ? value.join(' · ') : String(value ?? '');

const v41 = readJson('requirements-v41.json');
const d1 = readJson('requirements-d1.json');
const d2 = readJson('requirements-d2.json');
const thisRun = readJson('requirements-this-run.json');
const subcheckGroups = readJson('requirements-subchecks.json');
const manifest = readJson('verification-manifest.json');
const primary = [...v41, ...d1, ...d2];
const byId = new Map(primary.map((row) => [row.id, row]));
const thisRunById = new Map(thisRun.map((row) => [row.id, row]));
const subchecksByParent = new Map(subcheckGroups.map((group) => [group.parentId, group.subchecks]));

if (primary.length !== 168) throw new Error(`Expected 168 primary requirements, received ${primary.length}`);
if (byId.size !== primary.length) throw new Error('Duplicate primary requirement id');

const verdictNames = ['충족', '부분', '미충족', '의도적 변경', '결정 필요', '제외'];
const countVerdicts = (rows) => Object.fromEntries(verdictNames.map((name) => [name, rows.filter((row) => row.verdict === name).length]));
const counts = countVerdicts(primary);
const gapCount = counts['부분'] + counts['미충족'] + counts['결정 필요'];
const productRows = [
  { id: 'V41', name: 'v4.1 UI', rows: v41, summary: '개인공간 화면·이동 문법' },
  { id: 'D1', name: '개발 1', rows: d1, summary: 'saved-plan·상세·소유권' },
  { id: 'D2', name: '개발 2', rows: d2, summary: 'Text Authoring·원문 보존' },
].map((product) => ({ ...product, counts: countVerdicts(product.rows) }));

const closureIds = ['V41-007', 'V41-008', 'V41-009', 'V41-018', 'V41-037', 'V41-058'];
const closureRows = closureIds.map((id) => {
  const row = byId.get(id);
  if (!row) throw new Error(`Missing closure requirement ${id}`);
  return { ...row, run: thisRunById.get(id) ?? null, subchecks: subchecksByParent.get(id) ?? [] };
});
const closedCount = closureRows.filter((row) => row.verdict === '충족').length;
const staleRows = thisRun
  .filter((row) => /^(D1|D2)-/.test(row.id) && row.status.includes('재판정'))
  .map((row) => ({ ...row, requirement: byId.get(row.id) }))
  .filter((row) => row.requirement);

const movementIds = ['V41-003', ...closureIds, 'V41-066'];
const movementRows = movementIds.map((id) => byId.get(id)).filter(Boolean);
const externalRows = ['V41-062', 'V41-063', 'V41-064', 'V41-066'].map((id) => byId.get(id)).filter(Boolean);
const viewports = [...new Set((manifest.browser?.viewports ?? []).map(String))];
const requiredViewports = ['320x700', '375x812', '390x844', '844x390', '1024x768', '1440x900'];

const traceHash = crypto.createHash('sha256')
  .update(['requirements-v41.json', 'requirements-d1.json', 'requirements-d2.json', 'requirements-this-run.json', 'requirements-subchecks.json', 'verification-manifest.json']
    .map((name) => fs.readFileSync(path.join(traceDir, name)))
    .join('\u0000'))
  .digest('hex');

const generatedAt = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Seoul',
}).format(new Date());

const verdictChip = (verdict, evidence) => `<span class="chip" data-verdict="${escapeHtml(verdict)}">${escapeHtml(verdict)}</span>${evidence ? `<span class="chip evidence">${escapeHtml(evidence)}</span>` : ''}`;
const statusClass = (verdict) => verdict === '충족' ? 'closed' : verdict === '미충족' ? 'missing' : 'pending';

const renderProduct = (product, index) => {
  const productGap = product.counts['부분'] + product.counts['미충족'] + product.counts['결정 필요'];
  return `<article class="source" data-product="${product.id}">
    <div class="source-index">0${index + 1}</div>
    <div><p class="overline">${product.id} · 원천 ${index + 1}</p><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.summary)}</p></div>
    <dl><div><dt>전체</dt><dd>${product.rows.length}</dd></div><div><dt>충족</dt><dd>${product.counts['충족']}</dd></div><div><dt>gap</dt><dd>${productGap}</dd></div></dl>
  </article>`;
};

const renderClosure = (row) => {
  const state = statusClass(row.verdict);
  const runDetail = row.run?.detail ?? '이번 실행 기록이 아직 requirements-this-run.json에 연결되지 않았습니다.';
  return `<details class="closure-row" data-state="${state}" ${state !== 'closed' ? 'open' : ''}>
    <summary>
      <span class="req-id">${row.id}</span>
      <span class="req-title">${escapeHtml(row.title)}</span>
      <span class="req-status">${verdictChip(row.verdict, row.evidence)}</span>
    </summary>
    <div class="closure-body">
      <section><h4>요구</h4><p>${escapeHtml(row.expected)}</p></section>
      <section><h4>이번 구현·증거</h4><p>${escapeHtml(runDetail)}</p></section>
      <section><h4>현재 판정 이유</h4><p>${escapeHtml(row.reason)}</p></section>
      <section><h4>다음 조치</h4><p>${escapeHtml(row.action)}</p></section>
      ${row.subchecks.length ? `<ul class="subchecks">${row.subchecks.map((item) => `<li>${verdictChip(item.verdict, item.evidence)}<span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.note)}</small></span></li>`).join('')}</ul>` : ''}
    </div>
  </details>`;
};

const renderStale = (row) => `<article class="recheck-card" data-product="${row.requirement.product}">
  <header><span class="req-id">${row.id}</span>${verdictChip(row.requirement.verdict, row.requirement.evidence)}</header>
  <h3>${escapeHtml(row.requirement.title)}</h3>
  <p class="recheck-status">${escapeHtml(row.status)}</p>
  <p>${escapeHtml(row.detail)}</p>
  <details><summary>판정 근거와 남은 조치</summary><p><strong>근거:</strong> ${escapeHtml(row.requirement.reason)}</p><p><strong>조치:</strong> ${escapeHtml(row.requirement.action)}</p></details>
</article>`;

const screenshotGroups = [
  { type: 'task', viewport: '390x844', title: '할 일 · 세로', caption: '날짜·폴더 목적지와 현재 위치 표시' },
  { type: 'flow', viewport: '390x844', title: 'Flow · 세로', caption: 'Flow 전체의 폴더 이동 전용 상태' },
  { type: 'task', viewport: '844x390', title: '할 일 · 가로', caption: '왼쪽 목적지와 오른쪽 원 목록 통로' },
  { type: 'flow', viewport: '844x390', title: 'Flow · 가로', caption: '300px 이하 패널과 168px 이상 조작 통로' },
];
const renderShot = (surface, group) => {
  const filename = `${surface}-${group.type}-move-${group.viewport}.png`;
  const absolutePath = path.join(here, filename);
  const relativePath = `./2026-09-03-flowme-integrated-poc-movement-parity-report-assets/${filename}`;
  const label = `${surface === 'react' ? 'React 제품 PoC' : '독립 HTML'} · ${group.viewport}`;
  if (!fs.existsSync(absolutePath)) {
    return `<figure class="shot missing-shot"><div class="shot-fallback" role="img" aria-label="${escapeHtml(label)} 캡처 없음"><strong>캡처 대기</strong><span>${escapeHtml(label)}</span><code>${escapeHtml(filename)}</code><small>이미지 부재는 기능 실패로 판정하지 않습니다. 캡처가 생긴 뒤 builder를 다시 실행하면 자동으로 표시됩니다.</small></div><figcaption>${escapeHtml(label)}</figcaption></figure>`;
  }
  return `<figure class="shot"><button class="shot-open" type="button" data-image="${escapeHtml(relativePath)}" aria-label="${escapeHtml(label)} 크게 보기"><img src="${escapeHtml(relativePath)}" alt="${escapeHtml(label)} 이동 패널 화면" loading="lazy"></button><figcaption>${escapeHtml(label)}</figcaption></figure>`;
};
const renderScreenshotGroup = (group) => `<article class="compare-pair" data-kind="${group.type}" data-viewport="${group.viewport}">
  <header><div><p class="overline">${group.type === 'flow' ? 'FLOW FOLDER MOVE' : 'TASK MOVE'}</p><h3>${escapeHtml(group.title)}</h3></div><p>${escapeHtml(group.caption)}</p></header>
  <div class="shot-grid">${renderShot('react', group)}${renderShot('standalone', group)}</div>
</article>`;

const runCard = ({ label, value, note, status = 'passed' }) => `<article class="run-card" data-status="${status}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(note)}</p></article>`;
const progressTotal = primary.length || 1;
const progressSegments = [
  ['충족', counts['충족']], ['부분', counts['부분']], ['미충족', counts['미충족']],
  ['의도적 변경', counts['의도적 변경']], ['제외', counts['제외']],
].filter(([, value]) => value > 0);

const reportData = JSON.stringify({
  counts, gapCount, closedCount, closureTotal: closureRows.length, traceHash,
  generatedAt, missingScreenshots: screenshotGroups.flatMap((group) => ['react', 'standalone'].map((surface) => `${surface}-${group.type}-move-${group.viewport}.png`)).filter((name) => !fs.existsSync(path.join(here, name))),
}).replaceAll('<', '\\u003c');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23007f72'/%3E%3Cpath d='M17 16h32v9H27v8h17v9H27v16H17z' fill='white'/%3E%3C/svg%3E">
  <title>FlowMe 통합 PoC 이동 방식 검증 리포트</title>
  <style>
    :root{--ink:#12201d;--muted:#5d6c68;--line:#cfdbd7;--line-strong:#9cb1aa;--paper:#fff;--wash:#eef4f2;--teal:#007f72;--teal-dark:#075e57;--teal-soft:#e1f4ef;--navy:#2e4467;--navy-soft:#edf1f7;--amber:#9a6100;--amber-soft:#fff3d6;--red:#9d3b36;--red-soft:#fff0ee;--violet:#6252a4;--violet-soft:#f0edff;--gray-soft:#eef1f1;--shadow:0 20px 56px rgba(16,43,37,.10)}
    *{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:76px}body{margin:0;background:var(--wash);color:var(--ink);font-family:Inter,system-ui,-apple-system,"Segoe UI","Noto Sans KR",sans-serif;line-height:1.58}button,a{touch-action:manipulation}button,input{font:inherit}a{color:inherit}.skip{position:fixed;left:12px;top:-100px;z-index:100;padding:12px 16px;background:#fff;border:2px solid var(--teal);font-weight:800}.skip:focus{top:12px}.topbar{position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:62px;padding:7px max(18px,env(safe-area-inset-right)) 7px max(18px,env(safe-area-inset-left));background:rgba(255,255,255,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(14px)}.brand{font-weight:950;letter-spacing:-.03em;white-space:nowrap}.topnav{display:flex;gap:3px;overflow:auto}.topnav a{display:inline-flex;align-items:center;min-height:44px;padding:0 11px;text-decoration:none;color:#42534f;font-size:13px;font-weight:760;white-space:nowrap}.topnav a:hover,.topnav a:focus-visible{background:var(--teal-soft);outline:0}.page{width:min(1440px,100%);margin:auto;background:var(--paper);box-shadow:var(--shadow)}
    .hero{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(320px,.72fr);gap:50px;padding:clamp(42px,7vw,96px) clamp(20px,6vw,84px) 46px;background:linear-gradient(135deg,#fff 58%,#e9f6f2)}.overline{margin:0 0 9px;color:var(--teal-dark);font-size:11px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.hero h1{max-width:850px;margin:0;font-size:clamp(38px,6vw,76px);line-height:1.04;letter-spacing:-.06em;word-break:keep-all;overflow-wrap:break-word}.hero .lead{max-width:800px;margin:24px 0 0;color:#40534e;font-size:clamp(16px,1.8vw,21px)}.hero-note{display:flex;gap:10px;align-items:flex-start;margin-top:24px;padding-top:19px;border-top:1px solid var(--line);color:var(--muted);font-size:13px}.hero-note b{color:var(--ink);white-space:nowrap}.decision-stack{align-self:center;border-top:4px solid var(--teal);background:#fff;box-shadow:0 16px 40px rgba(16,43,37,.09)}.decision-stack article{padding:22px;border:1px solid var(--line);border-top:0}.decision-stack span{display:block;color:var(--muted);font-size:12px}.decision-stack strong{display:block;margin-top:4px;font-size:clamp(24px,3vw,34px);letter-spacing:-.04em}.decision-stack p{margin:7px 0 0;color:var(--muted);font-size:13px}.decision-stack .warn{background:var(--amber-soft)}
    .metric-rail{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.metric{padding:19px clamp(13px,2vw,24px);border-right:1px solid var(--line)}.metric:last-child{border:0}.metric span{display:block;color:var(--muted);font-size:11px}.metric strong{display:block;margin-top:3px;font-size:clamp(23px,2.8vw,34px);letter-spacing:-.04em}.metric.gap{background:var(--amber-soft)}
    .section{padding:clamp(40px,6vw,76px) clamp(18px,6vw,84px);border-bottom:1px solid var(--line)}.section-head{display:grid;grid-template-columns:minmax(0,.8fr) minmax(300px,1.2fr);gap:36px;align-items:end;margin-bottom:28px}.section-head h2{margin:0;font-size:clamp(29px,4vw,48px);line-height:1.08;letter-spacing:-.045em}.section-head p{margin:0;color:var(--muted)}.source-map{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) minmax(220px,.9fr);gap:11px}.source{position:relative;display:grid;grid-template-columns:auto 1fr;gap:14px;padding:20px;border:1px solid var(--line);background:#fff}.source::after{content:"→";position:absolute;right:-11px;top:47%;z-index:2;color:var(--teal);font-weight:950}.source-index{font:900 30px/1 ui-monospace,SFMono-Regular,Consolas,monospace;color:#bed1cb}.source h3{margin:0;font-size:20px}.source p:not(.overline){margin:6px 0 0;color:var(--muted);font-size:13px}.source dl{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:14px 0 0}.source dl div{padding:8px;background:var(--wash)}.source dt{color:var(--muted);font-size:10px}.source dd{margin:1px 0 0;font-weight:900}.p0-node{padding:22px;border:1px solid var(--teal);background:var(--teal);color:#fff}.p0-node h3{margin:0;font-size:22px}.p0-node p{margin:8px 0 0;color:#d8f3ed;font-size:13px}.p0-node ul{margin:16px 0 0;padding-left:19px;font-size:13px}.progress{display:flex;height:14px;margin-top:22px;overflow:hidden;background:#e6ecea}.progress span{min-width:2px}.progress [data-verdict="충족"]{background:var(--teal)}.progress [data-verdict="부분"]{background:#df9c1c}.progress [data-verdict="미충족"]{background:#c34d47}.progress [data-verdict="의도적 변경"]{background:var(--violet)}.progress [data-verdict="제외"]{background:#8d9895}.progress-legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;color:var(--muted);font-size:12px}.progress-legend b{color:var(--ink)}
    .before-after{display:grid;grid-template-columns:1fr 64px 1fr;align-items:stretch}.state-panel{padding:26px;border:1px solid var(--line);background:#fff}.state-panel.before{background:#f7f8f8}.state-panel.after{border-color:#84b9ae;background:var(--teal-soft)}.state-panel h3{margin:4px 0 14px;font-size:24px}.state-panel ul{display:grid;gap:9px;margin:0;padding:0;list-style:none}.state-panel li{position:relative;padding-left:22px}.state-panel li::before{content:"";position:absolute;left:0;top:.65em;width:10px;height:2px;background:var(--line-strong)}.state-panel.after li::before{background:var(--teal)}.state-arrow{display:grid;place-items:center;color:var(--teal);font-size:28px;font-weight:950}.contract-line{display:grid;grid-template-columns:repeat(4,1fr);margin-top:14px;border:1px solid var(--line)}.contract-line div{padding:14px;border-right:1px solid var(--line)}.contract-line div:last-child{border:0}.contract-line small{display:block;color:var(--muted)}.contract-line strong{display:block;margin-top:2px;font-size:14px}
    .filterbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px;padding:12px;border:1px solid var(--line);background:#fff}.filter-group{display:flex;flex-wrap:wrap;gap:6px}.filter-button{min-height:44px;padding:0 14px;border:1px solid var(--line-strong);background:#fff;color:var(--ink);font-weight:760;cursor:pointer}.filter-button[aria-pressed="true"]{border-color:var(--teal);background:var(--teal);color:#fff}.filter-meta{color:var(--muted);font-size:13px}.closure-list{display:grid;gap:9px}.closure-row{border:1px solid var(--line);background:#fff}.closure-row[hidden]{display:none}.closure-row summary{display:grid;grid-template-columns:90px minmax(0,1fr) auto;align-items:center;gap:12px;min-height:64px;padding:10px 15px;cursor:pointer;list-style:none}.closure-row summary::-webkit-details-marker{display:none}.closure-row summary:hover{background:#f7faf9}.req-id{font-weight:950;color:var(--teal-dark)}.req-title{font-weight:820}.req-status{display:flex;gap:5px}.chip{display:inline-flex;align-items:center;justify-content:center;min-height:27px;padding:2px 9px;border-radius:999px;background:var(--gray-soft);color:#46534f;font-size:11px;font-weight:850;white-space:nowrap}.chip[data-verdict="충족"]{background:var(--teal-soft);color:var(--teal-dark)}.chip[data-verdict="부분"]{background:var(--amber-soft);color:var(--amber)}.chip[data-verdict="미충족"]{background:var(--red-soft);color:var(--red)}.chip[data-verdict="의도적 변경"]{background:var(--violet-soft);color:var(--violet)}.chip[data-verdict="제외"]{background:#e8ebeb;color:#53605d}.chip.evidence{background:var(--navy-soft);color:var(--navy)}.closure-body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-top:1px solid var(--line)}.closure-body section{padding:17px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.closure-body section:nth-child(2n){border-right:0}.closure-body h4{margin:0 0 6px;color:var(--muted);font-size:11px;letter-spacing:.08em}.closure-body p{margin:0;font-size:14px;white-space:pre-line}.subchecks{grid-column:1/-1;display:grid;gap:7px;margin:0;padding:16px;list-style:none;background:#f7faf9}.subchecks li{display:grid;grid-template-columns:auto auto minmax(0,1fr);align-items:start;gap:5px}.subchecks span:last-child{display:block;margin-left:5px}.subchecks strong,.subchecks small{display:block}.subchecks small{margin-top:2px;color:var(--muted)}
    .recheck-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.recheck-card{padding:20px;border:1px solid var(--line);border-top:4px solid var(--navy);background:#fff}.recheck-card[data-product="D2"]{border-top-color:var(--violet)}.recheck-card header{display:flex;align-items:center;justify-content:space-between;gap:8px}.recheck-card h3{margin:14px 0 7px;font-size:19px}.recheck-card p{margin:6px 0;color:var(--muted);font-size:14px}.recheck-card .recheck-status{color:var(--ink);font-weight:850}.recheck-card details{margin-top:13px;padding-top:12px;border-top:1px solid var(--line)}.recheck-card summary{cursor:pointer;font-weight:800}
    .comparison-controls{margin-bottom:16px}.comparison-grid{display:grid;gap:16px}.compare-pair{border:1px solid var(--line);background:#fff}.compare-pair[hidden]{display:none}.compare-pair>header{display:flex;align-items:end;justify-content:space-between;gap:22px;padding:17px 19px;border-bottom:1px solid var(--line)}.compare-pair h3{margin:0;font-size:21px}.compare-pair>header>p{max-width:440px;margin:0;color:var(--muted);font-size:13px}.shot-grid{display:grid;grid-template-columns:1fr 1fr}.shot{min-width:0;margin:0;padding:10px}.shot+.shot{border-left:1px solid var(--line)}.shot-open{display:block;width:100%;padding:0;border:0;background:#e9eeee;cursor:zoom-in}.shot img{display:block;width:100%;height:520px;object-fit:contain;background:#e9eeee}.shot figcaption{padding:8px 2px 2px;color:var(--muted);font-size:12px}.shot-fallback{display:grid;place-items:center;align-content:center;gap:7px;min-height:300px;padding:24px;background:repeating-linear-gradient(135deg,#f3f6f5,#f3f6f5 12px,#eaf0ee 12px,#eaf0ee 24px);text-align:center}.shot-fallback strong{font-size:22px}.shot-fallback span{color:var(--muted)}.shot-fallback code{max-width:100%;padding:5px 8px;background:#fff;overflow-wrap:anywhere}.shot-fallback small{max-width:420px;color:var(--muted)}
    .parity-wrap{overflow:auto;border:1px solid var(--line)}.parity{width:100%;min-width:760px;border-collapse:collapse}.parity th,.parity td{padding:14px 15px;border-bottom:1px solid var(--line);border-right:1px solid var(--line);text-align:left;vertical-align:top}.parity th:last-child,.parity td:last-child{border-right:0}.parity tr:last-child td{border-bottom:0}.parity th{background:#f2f6f4;color:var(--muted);font-size:12px}.parity td{font-size:14px}.parity td:first-child{font-weight:850}.ok{color:var(--teal-dark);font-weight:850}.boundary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-top:18px;border:1px solid var(--line)}.boundary article{position:relative;padding:18px;border-right:1px solid var(--line);background:#fff}.boundary article:last-child{border:0;background:var(--red-soft)}.boundary article:not(:last-child)::after{content:"→";position:absolute;right:-7px;top:44%;z-index:2;color:var(--teal);font-weight:950}.boundary small{display:block;color:var(--teal-dark);font-weight:850}.boundary h3{margin:5px 0 7px;font-size:17px}.boundary p{margin:0;color:var(--muted);font-size:13px}.evidence-band{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}.run-card{padding:18px;border:1px solid var(--line);background:#fff}.run-card[data-status="passed"]{border-top:4px solid var(--teal)}.run-card[data-status="failed"]{border-top:4px solid var(--red);background:var(--red-soft)}.run-card[data-status="pending"]{border-top:4px solid var(--amber);background:var(--amber-soft)}.run-card span{color:var(--muted);font-size:12px}.run-card strong{display:block;margin:4px 0;font-size:27px;letter-spacing:-.04em}.run-card p{margin:0;color:var(--muted);font-size:12px;overflow-wrap:anywhere}.regression-note{display:grid;grid-template-columns:minmax(170px,.35fr) minmax(0,1fr);gap:18px;margin-top:10px;padding:18px 20px;border-left:4px solid var(--red);background:var(--red-soft)}.regression-note strong{font-size:16px}.regression-note p{margin:0;color:#673a36;font-size:13px}.viewport-list{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));margin-top:12px;border:1px solid var(--line)}.viewport-list div{padding:14px;border-right:1px solid var(--line);text-align:center}.viewport-list div:last-child{border:0}.viewport-list strong{display:block}.viewport-list span{color:var(--teal-dark);font-size:12px;font-weight:800}.evidence-split{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;margin-top:18px}.proof,.unrun{padding:22px;border:1px solid var(--line);background:#fff}.unrun{border-color:#dfc88f;background:var(--amber-soft)}.proof h3,.unrun h3{margin:0 0 10px;font-size:19px}.proof ul,.unrun ul{margin:0;padding-left:19px}.proof li,.unrun li{margin:7px 0}.proof p,.unrun p{color:var(--muted);font-size:13px}
    .remaining{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:14px}.remaining-list{border-top:1px solid var(--line)}.remaining-row{display:grid;grid-template-columns:95px minmax(0,1fr) auto;gap:14px;padding:16px 0;border-bottom:1px solid var(--line)}.remaining-row h3{margin:0;font-size:16px}.remaining-row p{margin:4px 0 0;color:var(--muted);font-size:13px}.publish{padding:22px;border:1px solid var(--line);background:#f6f8f7}.publish h3{margin:0 0 14px}.publish dl{display:grid;grid-template-columns:1fr auto;gap:9px;margin:0}.publish dd{margin:0;font-weight:850}.publish .zero{margin-top:20px;padding-top:15px;border-top:1px solid var(--line)}.publish .zero strong{display:block;font-size:34px}.footer{padding:28px clamp(18px,6vw,84px) max(34px,env(safe-area-inset-bottom));background:#eaf0ee;color:var(--muted);font-size:12px}.footer code{overflow-wrap:anywhere}.empty-note{padding:24px;border:1px dashed var(--line-strong);color:var(--muted);text-align:center}
    dialog{width:min(1180px,calc(100% - 24px));max-height:calc(100vh - 24px);padding:0;border:1px solid var(--line);box-shadow:var(--shadow)}dialog::backdrop{background:rgba(7,25,21,.72)}.lightbox-head{position:sticky;top:0;z-index:1;display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fff;border-bottom:1px solid var(--line)}.lightbox-head strong{font-size:14px}.lightbox-head button{min-width:48px;min-height:48px;border:1px solid var(--line);background:#fff;font-size:22px;cursor:pointer}.lightbox img{display:block;max-width:100%;margin:auto;background:#eef2f1}
    @media(max-width:1100px){.hero{grid-template-columns:1fr}.decision-stack{display:grid;grid-template-columns:1fr 1fr}.metric-rail{grid-template-columns:repeat(3,1fr)}.metric:nth-child(3){border-right:0}.metric:nth-child(-n+3){border-bottom:1px solid var(--line)}.source-map{grid-template-columns:repeat(3,1fr)}.p0-node{grid-column:1/-1}.source::after{content:"↓";right:50%;top:auto;bottom:-14px}.evidence-band{grid-template-columns:repeat(2,1fr)}.viewport-list{grid-template-columns:repeat(3,1fr)}.viewport-list div:nth-child(3){border-right:0}.viewport-list div:nth-child(-n+3){border-bottom:1px solid var(--line)}.boundary{grid-template-columns:repeat(2,1fr)}.boundary article:nth-child(2){border-right:0}.boundary article:nth-child(-n+2){border-bottom:1px solid var(--line)}.boundary article:nth-child(2)::after{content:"↓";right:50%;top:auto;bottom:-13px}}
    @media(max-width:760px){html{scroll-padding-top:112px}.topbar{display:block}.topnav{display:flex;margin:3px -8px -3px;padding:0 8px}.hero{padding-top:40px;gap:28px}.hero h1{font-size:42px}.hero-note{display:block}.hero-note b{display:block;margin-bottom:5px}.decision-stack{grid-template-columns:1fr}.metric-rail{grid-template-columns:repeat(2,1fr)}.metric:nth-child(n){border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.metric:nth-child(2n){border-right:0}.metric:nth-last-child(-n+2){border-bottom:0}.section-head{grid-template-columns:1fr;gap:12px}.source-map{grid-template-columns:1fr}.p0-node{grid-column:auto}.source::after{right:20px}.before-after{grid-template-columns:1fr}.state-arrow{min-height:54px}.state-arrow span{transform:rotate(90deg)}.contract-line{grid-template-columns:1fr 1fr}.contract-line div:nth-child(2){border-right:0}.contract-line div:nth-child(-n+2){border-bottom:1px solid var(--line)}.closure-row summary{grid-template-columns:76px minmax(0,1fr);gap:7px}.req-status{grid-column:1/-1}.closure-body{grid-template-columns:1fr}.closure-body section,.closure-body section:nth-child(2n){border-right:0}.recheck-grid{grid-template-columns:1fr}.compare-pair>header{display:block}.compare-pair>header>p{margin-top:6px}.shot-grid{grid-template-columns:1fr}.shot+.shot{border-left:0;border-top:1px solid var(--line)}.shot img{height:auto;max-height:620px}.boundary,.evidence-band,.viewport-list,.evidence-split,.remaining,.regression-note{grid-template-columns:1fr}.boundary article:nth-child(n),.viewport-list div:nth-child(n){border-right:0;border-bottom:1px solid var(--line)}.boundary article:last-child,.viewport-list div:last-child{border-bottom:0}.boundary article:not(:last-child)::after{content:"↓";right:18px;top:auto;bottom:-13px}.remaining-row{grid-template-columns:76px minmax(0,1fr)}.remaining-row>span:last-child{grid-column:1/-1;justify-self:start}}
    @media(max-width:430px){.hero h1{font-size:38px}.contract-line{grid-template-columns:1fr}.contract-line div:nth-child(n){border-right:0;border-bottom:1px solid var(--line)}.contract-line div:last-child{border-bottom:0}.filterbar{align-items:stretch}.filter-group{display:grid;grid-template-columns:1fr 1fr;width:100%}.filter-button{width:100%}.metric strong{font-size:27px}.subchecks li{grid-template-columns:auto auto}.subchecks span:last-child{grid-column:1/-1;margin:3px 0 0}.publish dl{grid-template-columns:1fr}.publish dd{margin-bottom:5px}}
    @media(max-height:520px){.topbar{position:static}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{scroll-behavior:auto!important;transition:none!important}}
  </style>
</head>
<body>
  <a class="skip" href="#decision">핵심 판정으로 이동</a>
  <header class="topbar"><div class="brand">FLOW · 이동 방식 검증</div><nav class="topnav" aria-label="리포트 바로가기"><a href="#sources">세 원천</a><a href="#decision">재판정</a><a href="#comparison">화면 비교</a><a href="#parity">입력 동등성</a><a href="#evidence">검증</a><a href="#remaining">남은 일</a></nav></header>
  <main class="page">
    <section class="hero">
      <div><p class="overline">FlowMe integrated PoC · P0 movement parity</p><h1>세 결과물의 이동 방식을<br>한 제품 계약으로 맞췄습니다.</h1><p class="lead">v4.1 UI의 조작 문법, 개발 1의 saved-plan 소유권, 개발 2의 원문 보존을 같은 Flow·Task 이동 흐름에 연결했습니다. 이 리포트는 무엇을 요구했고, 무엇을 구현했으며, 어디까지 검증했는지 순서대로 보여 줍니다.</p><p class="hero-note"><b>판정 기준</b><span>자동 테스트·브라우저 자동화는 구현 증거입니다. 실제 Android·iOS·스크린리더·관찰 사용자 검증으로 표현하지 않습니다.</span></p></div>
      <aside class="decision-stack" aria-label="현재 결론"><article><span>이번 P0 재판정 대상</span><strong>${closedCount}/${closureRows.length} 충족</strong><p>${closedCount === closureRows.length ? '여섯 movement gap이 최신 trace에서 닫혔습니다.' : `${closureRows.length - closedCount}건은 구현 증거와 trace 판정을 다시 맞춰야 합니다.`}</p></article><article class="warn"><span>외부·실기 증거</span><strong>아직 미실행</strong><p>Android Chrome, iOS Safari, screen reader, 관찰 사용자 0명</p></article></aside>
    </section>
    <section class="metric-rail" aria-label="최신 primary 요구사항 집계">
      <article class="metric"><span>Primary 전체</span><strong>${primary.length}</strong></article>
      <article class="metric"><span>충족</span><strong>${counts['충족']}</strong></article>
      <article class="metric"><span>부분</span><strong>${counts['부분']}</strong></article>
      <article class="metric"><span>미충족</span><strong>${counts['미충족']}</strong></article>
      <article class="metric"><span>의도·제외</span><strong>${counts['의도적 변경'] + counts['제외']}</strong></article>
      <article class="metric gap"><span>현재 gap</span><strong>${gapCount}</strong></article>
    </section>

    <section class="section" id="sources">
      <header class="section-head"><div><p class="overline">01 · source connection</p><h2>세 원천에서 가져온 것</h2></div><p>이번 작업은 세 데이터를 합치는 migration이 아닙니다. 이미 격리된 read model과 shadow state 위에서 화면 adapter와 이동 전이를 같은 뜻으로 맞춘 단계입니다.</p></header>
      <div class="source-map">${productRows.map(renderProduct).join('')}<article class="p0-node"><p class="overline" style="color:#c8eee6">이번 P0 연결</p><h3>이동 방식 일치</h3><p>Flow와 Task가 입력 방식에 따라 다른 결과를 만들지 않도록 하나의 transition 계약으로 수렴합니다.</p><ul><li>Flow는 폴더만 이동</li><li>Item은 부모 Flow 폴더 상속</li><li>원문·원본 일정 불변</li></ul></article></div>
      <div class="progress" aria-label="판정 분포">${progressSegments.map(([name, value]) => `<span data-verdict="${name}" style="width:${(value / progressTotal) * 100}%" title="${name} ${value}"></span>`).join('')}</div><div class="progress-legend">${progressSegments.map(([name, value]) => `<span>${name} <b>${value}</b></span>`).join('')}<span>gap <b>${gapCount}</b></span></div>
    </section>

    <section class="section" id="change">
      <header class="section-head"><div><p class="overline">02 · before / after</p><h2>이번에 달라진 이동 흐름</h2></div><p>이전 화면마다 달랐던 시작점과 목적지 표현을 공통 손잡이·공통 패널·공통 전이로 정리했습니다. 제품 정책과 운영 schema는 새로 확정하지 않았습니다.</p></header>
      <div class="before-after"><article class="state-panel before"><p class="overline">작업 전</p><h3>표면마다 다른 이동</h3><ul><li>React Flow 행에는 Task와 같은 입력 동등성 부족</li><li>독립 HTML은 이동에 중앙 dialog 사용</li><li>현재 위치의 중립 표현 증거가 화면마다 다름</li><li>Flow 날짜·순서 invalid 경계가 조작 표면에 약함</li></ul></article><div class="state-arrow" aria-hidden="true"><span>→</span></div><article class="state-panel after"><p class="overline">작업 후</p><h3>한 이동 계약</h3><ul><li>Task·Flow에 본문과 분리된 48px 손잡이</li><li>350ms 길게 누르기와 8px 취소 기준 공유</li><li>왼쪽 비모달 <code>이동할 곳</code>, 오른쪽 원 목록 통로</li><li>Flow 성공은 <code>move-folder / saved_flow</code> 한 경로</li></ul></article></div>
      <div class="contract-line"><div><small>성공</small><strong>다른 유효 위치 · 변경 1</strong></div><div><small>같은 위치</small><strong>중립 상태 · 변경 0</strong></div><div><small>취소·대상 밖</small><strong>원상태 · 변경 0</strong></div><div><small>복구</small><strong>Undo · reload</strong></div></div>
    </section>

    <section class="section" id="decision">
      <header class="section-head"><div><p class="overline">03 · requirement → implementation → evidence</p><h2>movement gap 재판정</h2></div><p>각 행을 열면 요구, 이번 구현, 현재 판정 이유, 다음 조치를 같은 자리에서 읽을 수 있습니다. JSON이 갱신되면 판정과 전체 숫자도 함께 바뀝니다.</p></header>
      <div class="filterbar"><div class="filter-group" aria-label="movement 판정 필터"><button class="filter-button" type="button" data-closure-filter="all" aria-pressed="true">전체 ${closureRows.length}</button><button class="filter-button" type="button" data-closure-filter="closed" aria-pressed="false">충족 ${closedCount}</button><button class="filter-button" type="button" data-closure-filter="pending" aria-pressed="false">재판정 필요 ${closureRows.length - closedCount}</button></div><div class="filter-meta" id="closure-count" aria-live="polite">${closureRows.length}건 표시</div></div>
      <div class="closure-list">${closureRows.map(renderClosure).join('')}</div>
    </section>

    <section class="section" id="stale">
      <header class="section-head"><div><p class="overline">04 · stale verdict audit</p><h2>D1·D2의 낡은 판정도 바로잡았습니다.</h2></div><p>현재 화면·코드·브라우저 증거와 맞지 않던 항목은 신규 기능으로 잘못 계획하지 않도록 재연결했습니다. 부분 판정은 남은 범위를 숨기지 않습니다.</p></header>
      <div class="recheck-grid">${staleRows.length ? staleRows.map(renderStale).join('') : '<p class="empty-note">requirements-this-run.json에 D1·D2 추적 재판정 기록이 없습니다.</p>'}</div>
    </section>

    <section class="section" id="comparison">
      <header class="section-head"><div><p class="overline">05 · react / standalone</p><h2>같은 상태를 두 실행 표면에서 비교</h2></div><p>React 제품 PoC와 내려받아 여는 독립 HTML을 Task·Flow, 세로·가로로 맞춰 봅니다. 캡처가 아직 없으면 빈 이미지 아이콘 대신 정확한 대기 상태가 보입니다.</p></header>
      <div class="filterbar comparison-controls"><div class="filter-group" aria-label="화면 비교 필터"><button class="filter-button" type="button" data-gallery-filter="all" aria-pressed="true">모두</button><button class="filter-button" type="button" data-gallery-filter="task" aria-pressed="false">할 일</button><button class="filter-button" type="button" data-gallery-filter="flow" aria-pressed="false">Flow</button><button class="filter-button" type="button" data-gallery-filter="390x844" aria-pressed="false">세로</button><button class="filter-button" type="button" data-gallery-filter="844x390" aria-pressed="false">가로</button></div><div class="filter-meta" id="gallery-count" aria-live="polite">4개 비교 표시</div></div>
      <div class="comparison-grid">${screenshotGroups.map(renderScreenshotGroup).join('')}</div>
      <p class="hero-note"><b>비교 범위</b><span>두 표면의 전체 chrome을 같게 만드는 검사가 아니라, 이동 패널 위치·손잡이·목적지·원 목록 통로가 같은 계약을 표현하는지 비교합니다.</span></p>
    </section>

    <section class="section" id="parity">
      <header class="section-head"><div><p class="overline">06 · input parity</p><h2>어떻게 시작해도 같은 결과</h2></div><p>입력 수단은 여러 개지만 저장 의미는 하나입니다. Flow는 폴더만, Task는 종류에 맞는 날짜·폴더·같은 목록 순서만 허용합니다.</p></header>
      <div class="parity-wrap"><table class="parity"><thead><tr><th>입력</th><th>Task</th><th>Flow</th><th>공통 결과</th></tr></thead><tbody>
        <tr><td>손잡이 짧게 누르기</td><td>같은 <code>이동할 곳</code> 열기</td><td>폴더 전용 <code>이동할 곳</code> 열기</td><td class="ok">열기만으로 저장 0</td></tr>
        <tr><td>350ms 길게 누르기</td><td>손잡이에서만 시작</td><td>손잡이에서만 시작</td><td class="ok">8px 초과 전 이동이면 취소</td></tr>
        <tr><td>마우스 drag</td><td>날짜·순서 target 해석</td><td>폴더 target만 유효</td><td class="ok">유효 drop만 기존 transition</td></tr>
        <tr><td><code>…</code> 메뉴</td><td>손잡이와 같은 panel</td><td>손잡이와 같은 panel</td><td class="ok">별도 writer 없음</td></tr>
        <tr><td>Enter / Space</td><td>비드래그 이동 경로</td><td>비드래그 폴더 이동 경로</td><td class="ok">동일 state·Undo</td></tr>
        <tr><td>Escape / pointer cancel</td><td>원 opener 초점 복귀</td><td>원 opener 또는 화면 제목 복귀</td><td class="ok">저장 호출·bytes 변화 0</td></tr>
      </tbody></table></div>
    </section>

    <section class="section" id="boundary">
      <header class="section-head"><div><p class="overline">07 · storage boundary</p><h2>운영 데이터는 읽기만 합니다.</h2></div><p>PoC의 변경 가능한 값은 전용 shadow state에만 기록합니다. 브라우저 자동화의 격리 context에서 prefix 밖 set/remove/clear와 운영 sentinel byte 변화를 검사했습니다.</p></header>
      <div class="boundary"><article><small>READ ONLY</small><h3>기존 saved-plan</h3><p>네 origin을 identity가 겹치지 않는 read model로 투영</p></article><article><small>POC ONLY</small><h3>shadow state</h3><p><code>flow:poc:personal-workspace:v1:*</code>만 변경</p></article><article><small>PURE TRANSITION</small><h3>이동·Undo</h3><p>drag·menu·keyboard가 같은 저장 의미로 수렴</p></article><article><small>LOCKED</small><h3>운영 writer</h3><p>완료·메모·날짜·보관·export writer 호출 금지</p></article></div>
      <div class="evidence-band">${runCard({ label: '허용 prefix 밖 setItem', value: String(manifest.storageBoundary?.writesOutsideAllowedPrefix ?? '—'), note: manifest.storageBoundary?.scope ?? '검증 범위 기록 없음' })}${runCard({ label: '허용 prefix 밖 removeItem', value: String(manifest.storageBoundary?.removesOutsideAllowedPrefix ?? '—'), note: '자동 브라우저와 fault-injection 경계' })}${runCard({ label: 'localStorage.clear()', value: String(manifest.storageBoundary?.clearCalls ?? '—'), note: '초기화는 정확한 PoC prefix만 제거' })}${runCard({ label: '운영 sentinel bytes 변경', value: String(manifest.storageBoundary?.operatingSentinelBytesChanged ?? '—'), note: manifest.storageBoundary?.note ?? '' })}</div>
    </section>

    <section class="section" id="evidence">
      <header class="section-head"><div><p class="overline">08 · verification</p><h2>자동화로 확인한 범위</h2></div><p>이번 리포트의 숫자는 실행 종류를 섞지 않습니다. 순수 모델, 독립 HTML, 브라우저, build를 따로 기록하고 실제 기기·사용자 증거는 다음 구획에 남깁니다.</p></header>
      <div class="evidence-band">${runCard({ label: 'PoC 모델·컴포넌트', value: '255/255', note: '최종 재실행 PASS · npm.cmd run test:personal-workspace-poc' })}${runCard({ label: 'Stage 4 브라우저', value: '5/5', note: '최종 재실행 PASS · 320×700 포함 6 viewport' })}${runCard({ label: 'React 핵심 통합 브라우저', value: '16/16', note: 'personal-workspace-poc + integration-poc · PASS' })}${runCard({ label: '독립 HTML 브라우저', value: '16/16', note: 'Flow·Task 입력 동등성 및 캡처 포함 · PASS' })}</div>
      <div class="evidence-band">${runCard({ label: '독립 HTML 모델', value: '34/34', note: 'standalone.test.cjs · PASS' })}${runCard({ label: 'npm 전체 회귀', value: '1519/1520', note: '1 fail 뒤 중단 · 전체 성공 아님', status: 'failed' })}${runCard({ label: '중단 뒤 tail 그룹', value: '220/220', note: '별도 실행 통과 · 전체 회귀에 합산하지 않음' })}${runCard({ label: 'Production build', value: '18/18', note: '최종 재실행 PASS · npm.cmd run build' })}</div>
      <article class="regression-note"><strong>전체 회귀 판정: 실패</strong><p><code>seed-flows</code>의 <code>dog-adoption-first-week</code> 콘텐츠가 <code>review_due 2026-06-04</code> 신선도 기준을 넘긴 시간 의존 실패입니다. 이후 중단됐던 tail 그룹 220/220 통과는 별도 증거이며, 앞선 <code>npm.cmd test</code>를 성공으로 바꾸지 않습니다.</p></article>
      <div class="viewport-list" aria-label="브라우저 viewport 검사">${requiredViewports.map((viewport) => `<div><strong>${viewport.replace('x', ' × ')}</strong><span>${viewports.includes(viewport) ? '자동 검사 기록 있음' : '기록 없음'}</span></div>`).join('')}</div>
      <div class="evidence-split"><article class="proof"><h3>자동화로 말할 수 있는 것</h3><ul><li>가로 넘침, console error, page error: manifest 기록상 0건</li><li>손잡이·long press·drag·메뉴·키보드가 같은 transition으로 수렴</li><li>같은 위치·취소·invalid에서 저장 호출과 state bytes 변화 0</li><li>성공 뒤 Undo와 별도 기존 시나리오의 reload 복구</li></ul><p>이는 Chromium 자동화와 순수 모델 증거입니다.</p></article><article class="unrun"><h3>아직 말할 수 없는 것</h3><ul><li>실제 Android Chrome 제스처 품질</li><li>실제 iOS Safari safe area·문맥 메뉴</li><li>TalkBack·VoiceOver 사용성</li><li>관찰 사용자의 이해·성공률</li></ul><p>자동 캡처를 실제 기기 또는 관찰 사용자 검증으로 바꾸어 표현하지 않습니다.</p></article></div>
    </section>

    <section class="section" id="remaining">
      <header class="section-head"><div><p class="overline">09 · remaining decisions</p><h2>남은 결함과 다음 판단</h2></div><p>movement 자동화가 닫혀도 운영 승격이나 실기 품질이 자동으로 승인되지는 않습니다. 남은 항목을 증거 종류별로 분리합니다.</p></header>
      <div class="remaining"><div class="remaining-list">${externalRows.map((row) => `<article class="remaining-row"><span class="req-id">${row.id}</span><div><h3>${escapeHtml(row.title)}</h3><p>${escapeHtml(row.action)}</p></div><span>${verdictChip(row.verdict, row.evidence)}</span></article>`).join('')}<article class="remaining-row"><span class="req-id">D2-H04</span><div><h3>저장 owner 결정</h3><p>CreatorDraft와 개인 Flow 저장의 운영 owner 충돌은 별도 제품 결정이 필요합니다.</p></div><span>${verdictChip('결정 필요', 'E1')}</span></article></div><aside class="publish"><h3>게시·외부 검증 상태</h3><dl><dt>commit</dt><dd>${escapeHtml(manifest.publish?.commit ?? '미진행')}</dd><dt>push</dt><dd>${escapeHtml(manifest.publish?.push ?? '미진행')}</dd><dt>PR</dt><dd>${escapeHtml(manifest.publish?.pullRequest ?? '미진행')}</dd><dt>Preview</dt><dd>${escapeHtml(manifest.publish?.preview ?? '미진행')}</dd><dt>Production</dt><dd>${escapeHtml(manifest.publish?.production ?? '미진행')}</dd><dt>Android Chrome</dt><dd>${escapeHtml(manifest.externalEvidence?.androidChrome ?? '미실행')}</dd><dt>iOS Safari</dt><dd>${escapeHtml(manifest.externalEvidence?.iosSafari ?? '미실행')}</dd><dt>스크린리더</dt><dd>${escapeHtml(manifest.externalEvidence?.screenReader ?? '미실행')}</dd></dl><div class="zero"><span>관찰 사용자 수</span><strong>${escapeHtml(manifest.externalEvidence?.observedUsers ?? 0)}명</strong></div></aside></div>
    </section>
  </main>
  <footer class="footer"><p><strong>생성:</strong> ${escapeHtml(generatedAt)} · <strong>trace hash:</strong> <code>${traceHash}</code></p><p>정본 입력: requirements-v41.json, requirements-d1.json, requirements-d2.json, requirements-this-run.json, requirements-subchecks.json, verification-manifest.json. 이 파일은 외부 라이브러리 없이 로컬에서 열립니다.</p></footer>
  <dialog class="lightbox" id="lightbox" aria-labelledby="lightbox-title"><div class="lightbox-head"><strong id="lightbox-title">화면 크게 보기</strong><button type="button" id="lightbox-close" aria-label="화면 크게 보기 닫기">×</button></div><img id="lightbox-image" alt=""></dialog>
  <script id="report-data" type="application/json">${reportData}</script>
  <script>
    (() => {
      const closureRows = [...document.querySelectorAll('.closure-row')];
      const closureCount = document.querySelector('#closure-count');
      document.querySelectorAll('[data-closure-filter]').forEach((button) => button.addEventListener('click', () => {
        const filter = button.dataset.closureFilter;
        document.querySelectorAll('[data-closure-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        let visible = 0;
        closureRows.forEach((row) => { const show = filter === 'all' || row.dataset.state === filter; row.hidden = !show; if (show) visible += 1; });
        closureCount.textContent = visible + '건 표시';
      }));

      const galleryRows = [...document.querySelectorAll('.compare-pair')];
      const galleryCount = document.querySelector('#gallery-count');
      document.querySelectorAll('[data-gallery-filter]').forEach((button) => button.addEventListener('click', () => {
        const filter = button.dataset.galleryFilter;
        document.querySelectorAll('[data-gallery-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        let visible = 0;
        galleryRows.forEach((row) => { const show = filter === 'all' || row.dataset.kind === filter || row.dataset.viewport === filter; row.hidden = !show; if (show) visible += 1; });
        galleryCount.textContent = visible + '개 비교 표시';
      }));

      const dialog = document.querySelector('#lightbox');
      const dialogImage = document.querySelector('#lightbox-image');
      let opener = null;
      document.querySelectorAll('.shot-open').forEach((button) => button.addEventListener('click', () => {
        opener = button; dialogImage.src = button.dataset.image; dialogImage.alt = button.querySelector('img').alt; dialog.showModal();
      }));
      document.querySelector('#lightbox-close').addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
      dialog.addEventListener('close', () => { dialogImage.removeAttribute('src'); opener?.focus(); });
    })();
  </script>
</body>
</html>`;

fs.writeFileSync(reportPath, html, 'utf8');
console.log(JSON.stringify({
  report: reportPath,
  bytes: Buffer.byteLength(html),
  primary: primary.length,
  counts,
  gap: gapCount,
  movementClosed: `${closedCount}/${closureRows.length}`,
  staleRechecks: staleRows.length,
  missingScreenshots: JSON.parse(reportData).missingScreenshots,
  traceHash,
}, null, 2));
