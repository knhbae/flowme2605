'use strict';
// perfkit-284 measure.cjs (made by make-kit.cjs from the int9 r2 QA's tl2-perf.cjs, 11/11): one block on one server.
// typelag ② QA ⑤: per-key latency in the real-size synthetic document (inputs/real-fixture.json: 284 lines, 110 tasks
// 42 open, 72 folder lines, 127 indented, 49 blank, ~12.6 characters a line, longest 76), 1280×800 touch, CPU 4x.
// Metric as Codex/dev (typing-lag-profile): from the capturing compositionupdate / compositionend / keydown on the editor to
// the second animation frame after it, 120 ms between inputs. Phases, in today's last task title:
//   ime     Hangul composition updates (jamo, syllable) for 24 syllables
//   commit  the 24 compositionends
//   task    21 plain keys
//   enter   20 Enters at the end of a task line (each makes a new task line; one unmeasured key typed after each)
// CPU (whole machine, all cores) is read for 1 s before the throttle, every second during the block, and 1 s after; the
// caller drops a block whose before/after reading is over 35 %. view 'recent' = as the document opens (recent view),
// 'full' = after 펼치기 (every line drawn).
// Usage: node tl2-perf.cjs <port> <tag> [view=recent|full] [patch=none|off] [cpu=4]
const fs = require('fs'), os = require('os'), crypto = require('crypto');
const { chromium } = require('D:/flowme-integration03-node24221-f3-20261024/candidate/node_modules/playwright');
const [port, tag, view = 'recent', patch = 'none', cpuArg = '4'] = process.argv.slice(2);
if (!/^(3000|3104)$/.test(port || '')) throw Error('port 3120-3129');
const SERVER = `http://127.0.0.1:${port}`, KIT = 'D:/flowme-work/etc/perfkit-284', OUT = process.env.PERFKIT_OUT || `${KIT}/out`;
const fx = JSON.parse(fs.readFileSync(process.env.PERFKIT_FIXTURE || `${KIT}/real-fixture.json`, 'utf8')), row = fx.rows.big;
const pause = ms => new Promise(r => setTimeout(r, ms));
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const cpu = () => os.cpus().reduce((a, c) => [a[0] + c.times.idle, a[1] + Object.values(c.times).reduce((x, y) => x + y, 0)], [0, 0]);
const cpuWindow = async () => { const l = cpu(); await pause(1000); const h = cpu(); return Math.round(100 * (1 - (h[0] - l[0]) / (h[1] - l[1]))); };
const med = v => { const s = [...v].sort((a, b) => a - b); return s.length ? Math.round((s[Math.floor((s.length - 1) / 2)] + s[Math.ceil((s.length - 1) / 2)]) / 2) : null; };
const p95 = v => { const s = [...v].sort((a, b) => a - b); return s.length ? Math.round(s[Math.ceil(s.length * .95) - 1]) : null; };
const SYL = Array.from('가나다라마바사아자차카타파하가나다라마바사아자차'), JAMO = Array.from('ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true, isMobile: false, locale: 'ko-KR', timezoneId: 'Asia/Seoul', serviceWorkers: 'block' });
  // Natural missing preference: no test opt-in or opt-out is injected.
  await context.addInitScript({ path: __dirname + '/probe.js' });
  await context.addInitScript(([seed, base, start, origin, patch]) => {
    const Real = Date, now = () => base + Real.now() - start;
    function QaDate(...a) { if (!new.target) return new Real(now()).toString(); return a.length ? new Real(...a) : new Real(now()); }
    QaDate.prototype = Real.prototype; QaDate.now = now; QaDate.parse = Real.parse; QaDate.UTC = Real.UTC; globalThis.Date = QaDate;
    if (location.origin !== origin) return;
    if (!localStorage.getItem('flowme-p3c:reader')) localStorage.setItem('flowme-p3c:reader', JSON.stringify(seed.reader));
    if (!localStorage.getItem('flowme-p3c:public')) localStorage.setItem('flowme-p3c:public', JSON.stringify(seed.public));
    if (patch === 'off') localStorage.setItem('flowme:alpha:row-patch', 'off'); else localStorage.removeItem('flowme:alpha:row-patch');
  }, [row, Date.parse(fx.clock), Date.now(), SERVER, patch]);
  const errors = [], outside = [];
  await context.route('**/*', route => { const u = route.request().url(); if (u.startsWith(SERVER) || /^(data|blob):/.test(u)) return route.continue(); if (!/flowme_alpha_official_actor/.test(u)) outside.push(u.slice(0, 80)); return route.abort(); });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(`${SERVER}/alpha/s4`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-main-tab="me"]').filter({ visible: true }).first().waitFor({ timeout: 60000 }); await pause(2500);
  const ok = page.getByRole('button', { name: '확인', exact: true }).filter({ visible: true }).first(); if (await ok.count()) { await ok.click(); await pause(300); }
  const areaId = `program-text-${encodeURIComponent(row.documentId)}`, area = page.locator(`[id="${areaId}"]`);
  await area.waitFor({ state: 'attached', timeout: 20000 }); await pause(1500);
  if (view === 'full') { const b = page.getByRole('button', { name: '펼치기', exact: true }).filter({ visible: true }).first(); if (await b.count()) { await b.click(); await pause(2500); } }
  const raw0 = await area.inputValue(), lines = raw0.split('\n');
  const head = lines.indexOf('[2026-11-11]'); let last = head; for (let i = head + 1; i < lines.length && !lines[i].startsWith('['); i++) if (/- \[/.test(lines[i])) last = i;
  const anchor = lines.slice(0, last + 1).join('\n').length;
  const caret = async n => { await area.focus(); await area.evaluate((e, n) => { e.setSelectionRange(n, n); e.dispatchEvent(new Event('select', { bubbles: true })); }, n); };
  await caret(anchor); await pause(800);
  await page.evaluate(id => {
    const data = { records: [], pending: 0, phase: null, expected: null };
    window.__tlag = data;
    for (const kind of ['compositionupdate', 'compositionend', 'keydown']) document.addEventListener(kind, e => {
      if (e.target?.id !== id || !data.phase) return;
      const w = data.expected; if (!w || w.kind !== kind || (w.key != null && w.key !== e.key) || (w.data != null && w.data !== e.data)) return;
      data.expected = null; const start = performance.now(), before = window.__pairedProbe.snapshot(); data.pending++;
      requestAnimationFrame(() => requestAnimationFrame(() => { const end = performance.now(); data.records.push({ phase: w.phase, part: w.part, ms: end - start, startAt: start, endAt: end, before, after: window.__pairedProbe.snapshot() }); data.pending--; }));
    }, true);
  }, areaId);
  const arm = (phase, part, kind, match = {}) => page.evaluate(w => { window.__tlag.phase = w.phase; window.__tlag.expected = w; }, { phase, part, kind, ...match });
  const settle = async () => { for (let i = 0; i < 200; i++) { if (await page.evaluate(() => window.__tlag.pending === 0)) return; await pause(50); } };
  const recallOff = await page.evaluate(() => localStorage.getItem('flowme:alpha:task-recall'));if(recallOff!==null)throw Error('DEFAULT_KEY_WAS_INJECTED');
  const cdp = await context.newCDPSession(page);
  await pause(3000); // the page's own load work settles before the in-page CPU reading
  const pre = await cpuWindow();
  const during = []; let sampling = true; (async () => { while (sampling) during.push(await cpuWindow()); })();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(cpuArg) }); await cdp.send('Performance.enable'); await pause(800);
  await page.waitForFunction(() => { const p = window.__pairedProbe.snapshot(); return p.pending === 0 && p.ackQuietMs >= 500 && [...document.querySelectorAll('[data-save-state]')].every(node => node.getAttribute('data-quiet') === 'true'); }, undefined, { timeout: 30000 });
  const initial = await page.evaluate(id => { const stored = JSON.parse(localStorage.getItem('flowme-p3c:reader')); return { nativeRaw: document.getElementById(id).value, account: stored.account, committedText: stored.account.space.text, revision: stored.account.revision, serverStates: [...document.querySelectorAll('[data-save-state]')].map(node => ({ state: node.getAttribute('data-save-state'), quiet: node.getAttribute('data-quiet') })), probe: window.__pairedProbe.snapshot() }; }, areaId);
  const canonical = value => JSON.stringify(value, (_key, part) => part && typeof part === 'object' && !Array.isArray(part) ? Object.fromEntries(Object.entries(part).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : part);
  const committedTextSHA256 = crypto.createHash('sha256').update(canonical(initial.committedText)).digest('hex');
  const expectedTextSHA256 = crypto.createHash('sha256').update(canonical(row.reader.account.space.text)).digest('hex');
  const committedAccountSHA256 = crypto.createHash('sha256').update(canonical(initial.account)).digest('hex');
  const docId = decodeURIComponent(areaId.slice('program-text-'.length)), seedDoc = [...row.reader.account.space.text.documents, ...row.reader.account.space.text.flows].find(doc => doc.id === docId);
  const nativeMatchesCommitted = !!seedDoc && initial.nativeRaw === seedDoc.lines.map(line => line.text).join('\n');
  const start = { nativeMatchesCommitted, serverStates: initial.serverStates, committedAccountSHA256, committedTextSHA256, expectedTextSHA256, revision: initial.revision, workerPending: initial.probe.pending, ackQuietMs: initial.probe.ackQuietMs,
    clean: nativeMatchesCommitted && initial.serverStates.every(state => state.quiet === 'true') && initial.probe.pending === 0 && initial.probe.ackQuietMs >= 500 && committedTextSHA256 === expectedTextSHA256 };
  if (!start.clean) throw Error('FIXED_START_NOT_CLEAN');
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  await page.keyboard.insertText(' '); await pause(300);
  for (let i = 0; i < SYL.length; i++) {
    for (const [part, text] of [['initial', JAMO[i % 14]], ['syllable', SYL[i]]]) { await arm('ime', part, 'compositionupdate', { data: text }); await cdp.send('Input.imeSetComposition', { text, selectionStart: 1, selectionEnd: 1 }); await pause(120); }
    await arm('commit', 'commit', 'compositionend', { data: SYL[i] }); await cdp.send('Input.insertText', { text: SYL[i] }); await pause(120);
  }
  await settle();
  for (const key of Array.from(' abcdefghijklmnopqrst')) { await arm('task', 'key', 'keydown', { key }); await page.keyboard.press(key === ' ' ? 'Space' : key); await pause(120); }
  await settle(); await pause(300);
  for (let i = 0; i < 20; i++) { await arm('enter', 'key', 'keydown', { key: 'Enter' }); await page.keyboard.press('Enter'); await settle(); await pause(120); await page.keyboard.press(String.fromCharCode(97 + (i % 26))); await pause(240); }
  await settle();
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  sampling = false; const post = await cpuWindow();
  await pause(2000);
  const records = await page.evaluate(() => window.__tlag.records);
  const after = await area.inputValue();
  const summary = {};
  for (const name of ['ime', 'commit', 'task', 'enter']) { const v = records.filter(r => r.phase === name).map(r => r.ms); summary[name] = { n: v.length, median: med(v), p95: p95(v), max: v.length ? Math.round(Math.max(...v)) : null }; }
  const metrics = {}; for (const k of ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration']) metrics[k] = Math.round((m1[k] - m0[k]) * 1000);
  const typed = after.includes(SYL.join('') + 'abcdefghijklmnopqrst') || after.includes(SYL.join('') + ' abcdefghijklmnopqrst');
  const defaultProof=await page.evaluate(()=>({preference:localStorage.getItem('flowme:alpha:task-recall'),panels:document.querySelectorAll('[data-task-recall]').length,controls:[...document.querySelectorAll('[data-task-recall-preference]')].map(e=>e.getAttribute('aria-pressed'))}));
  const expected='true';if(defaultProof.preference!==null||defaultProof.panels!==0||!defaultProof.controls.length||defaultProof.controls.some(v=>v!==expected))throw Error('NATURAL_RECALL_DEFAULT_NOT_PROVED');
  const probe = await page.evaluate(() => ({ events: window.__pairedProbe.events, overflow: window.__pairedProbe.overflow }));
  if (probe.overflow) throw Error('PROBE_OVERFLOW');
  const report = { browserVersion: browser.version(), start, probe, defaultProof, preferenceMode: 'natural missing key, both baseline and candidate ON', recallOff, tag, port: Number(port), view, patch, cpu: Number(cpuArg), linesShown: lines.length, linesAfter: after.split('\n').length, cpuPre: pre, cpuPost: post,
    cpuDuring: during.length ? Math.round(during.reduce((a, b) => a + b, 0) / during.length) : null, cpuDuringMax: during.length ? Math.max(...during) : null,
    valid: pre <= 35 && post <= 35, summary, metrics, rawSha: sha(after), typedOk: typed, errors, outside };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(`${OUT}/${tag}.json`, JSON.stringify({ ...report, records, during }, null, 1));
  console.log(JSON.stringify(report));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
