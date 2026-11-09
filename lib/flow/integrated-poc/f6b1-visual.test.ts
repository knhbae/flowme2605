import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// F6-B1 (11/9, 방향 B 흐름 노트): tokens, the icon set, the tabs, the sign-in and the 1280 rail. Editor inside unchanged.
const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const component = (name: string) => read(`components/flow/integrated-poc/${name}`);
const globals = read('app/globals.css');
const token = (name: string) => { const match = new RegExp(`--flowme-b-${name}: ([^;]+);`).exec(globals); assert(match, name); return match[1]; };
const hex = (value: string) => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
const lum = (rgb: number[]) => { const [r, g, b] = rgb.map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (top: number[], alpha: number, under: number[]) => top.map((v, i) => v * alpha + under[i] * (1 - alpha));

test('the B tokens hold the spec values, and the old page/action tokens follow them', () => {
  const values: Record<string, string> = { paper: '#fbfaf7', sand: '#f2efe8', canvas: '#f2efe8', surface: '#fff', selected: '#e8ebfb', ink: '#1d2433', muted: '#5a6273',
    line: '#e2dccf', hair: '#ece7dc', control: '#857f72', primary: '#2f3fbf', navy: '#1c2550', 'on-navy': '#c9d0f5', 'teal-on-navy': '#8fdccf', flow: '#0a7064',
    'flow-soft': '#e3f2ef', chrome: '#1c2550', 'late-ink': '#9a5b00' };
  for (const [name, value] of Object.entries(values)) assert.equal(token(name), value, name);
  assert.equal(token('nav-active'), 'rgb(201 208 245 / .18)');
  assert(globals.includes('--flowme-bg: var(--flowme-b-paper);'));
  assert(globals.includes('--flowme-action: var(--flowme-b-primary);'));
  assert(globals.includes('--flowme-focus: var(--flowme-b-primary-strong);'));
  assert(!/#f5f3ec|#315ee7/.test(globals), 'the old beige and blue are gone');
});

test('text pairs meet 4.5:1 and icons or borders 3:1 on the screens they sit on', () => {
  const t = (name: string) => hex(token(name)), white = [255, 255, 255];
  const text: [string, string][] = [['ink', 'paper'], ['ink', 'sand'], ['muted', 'paper'], ['muted', 'sand'], ['muted', 'selected'], ['muted', 'surface-subtle'], ['primary', 'paper'],
    ['primary', 'selected'], ['primary-strong', 'selected'], ['late-ink', 'paper'], ['late-ink', 'sand'], ['late-ink', 'selected'], ['flow', 'paper'], ['flow', 'flow-soft'], ['on-navy', 'navy'], ['teal-on-navy', 'navy']];
  for (const [fg, bg] of text) assert(contrast(t(fg), t(bg)) >= 4.5, `${fg} on ${bg}`);
  assert(contrast(white, t('navy')) >= 4.5 && contrast(white, t('primary')) >= 4.5);
  assert(contrast(white, over(t('on-navy'), .18, t('navy'))) >= 4.5, 'the rail\'s current destination');
  assert(contrast(t('control'), t('paper')) >= 3 && contrast(t('control'), white) >= 3, 'icons and field borders');
  assert.equal(contrast(t('late-ink'), t('selected')).toFixed(2), '4.58');
});

test('late dates use the late token, not a literal', () => {
  assert(component('ProgramSpace.module.css').includes('.rowLate { font-style: normal; font-weight: 700; color: var(--flowme-b-late-ink); }'));
  assert(component('ProgramMonthGrid.module.css').includes('.titles [data-state="late"] { color: var(--flowme-b-late-ink); }'));
  assert(!/#986209/.test(component('ProgramMonthGrid.module.css')));
});

test('one icon set: the menu draws it (Flow is the 흐름 마크\'s wave), no inline paths, no letter icons in the touched screens', () => {
  const icons = component('icons.tsx');
  for (const name of ['write', 'today', 'folder', 'flow', 'me', 'plus', 'more', 'close', 'down', 'right', 'back', 'undo', 'search', 'check', 'cal', 'repeat', 'inbox', 'todo', 'outdent', 'indent', 'mail', 'lock', 'link', 'info'])
    assert(new RegExp(`\\n  ${name}: <`).test(icons), name);
  assert(icons.includes('strokeWidth="2"') && icons.includes('strokeLinecap="round"'));
  const alpha = component('AlphaWorkspace.tsx'), nav = alpha.slice(alpha.indexOf('<nav className={styles.globalNavigation}'), alpha.indexOf('</nav>', alpha.indexOf('<nav className={styles.globalNavigation}')));
  assert(nav.includes("[['documents', '쓰기', 'write'], ['today', '오늘', 'today'], ['all', '폴더', 'folder']]") && nav.includes('<ProgramIcon name="flow" />') && nav.includes('<ProgramIcon name="me" />'));
  assert(!nav.includes(' d=') && !nav.includes('<svg'), 'no inline drawing in the menu');
  assert(alpha.includes('<ProgramFlowMark className={styles.brandMark} /><span className={styles.brandName}>FlowMe</span>'));
  const glyphOnly = /> ?[⋯×‹›＋…⌄↶↻☐⇤⇥↳] ?<\/(button|summary)>|<span aria-hidden="true">[⋯×‹›＋…⌄]<\/span>|<i aria-hidden="true">[⌄›]<\/i>/;
  for (const name of ['AlphaWorkspace.tsx', 'ProgramSpace.tsx', 'ProgramTextEditor.tsx', 'ProgramFolderList.tsx', 'ProgramFolderTodayAdd.tsx', 'ProgramNoticeRow.tsx', 'ProgramDiscovery.tsx', 'AlphaAuthPanel.tsx'])
    assert(!glyphOnly.test(component(name)), name);
});

test('tabs: 68px on paper, 24px icons, 13px names, the current one in a 56×30 selected pill; 1280 rail navy with on-navy 18%', () => {
  const css = component('AlphaWorkspace.module.css');
  assert(css.includes('.page[data-alpha-frame="b"] .globalNavigation { height: calc(68px + env(safe-area-inset-bottom)); min-height: 68px;'));
  assert(css.includes('.page[data-alpha-frame="b"] .globalNavigation button { min-height: 60px; gap: 3px; padding: 0; font-size: 13px; font-weight: 600; line-height: 18px; }'));
  assert(css.includes('.page[data-alpha-frame="b"] .globalNavigation svg { box-sizing: content-box; width: 24px; height: 24px; padding: 3px 16px; border-radius: 15px; }'));
  assert(css.includes('.page[data-alpha-frame="b"] .globalNavigation button[aria-current] svg { background: var(--flowme-b-selected); }'));
  assert(css.includes('.page[data-alpha-frame="b"] .globalNavigation button[aria-current] { background: var(--flowme-b-nav-active); color: #fff; box-shadow: none; }'));
  assert(css.includes('.page[data-alpha-frame="b"] .globalNavigation button { min-height: 64px; gap: 4px; border-radius: 12px; font-size: 13px; line-height: 18px; }'));
  assert(!/calc\(60px \+ env\(safe-area-inset-bottom\)/.test(css + component('ProgramSpace.module.css') + component('ProgramDiscovery.module.css')), 'no place still clears 60px tabs');
  // The screens are paper: the frame, the pane, the writing body and its page.
  assert(css.includes('.page[data-alpha-frame="b"]{--flowme-bg:var(--flowme-b-paper);'));
  assert(component('ProgramTextEditor.module.css').includes('.host :global(.tle-root) { background: var(--flowme-b-paper); }'));
});

test('the sign-in uses the app tokens only: navy top with the mark, one sentence and a Flow 실; a paper sheet; 48px fields; R7 under it', () => {
  const css = component('AlphaAuthPanel.module.css'), tsx = component('AlphaAuthPanel.tsx');
  assert(!/var\(--flowme-(?!b-|focus-outline)/.test(css), 'no old --flowme-* tokens');
  assert(!/#[0-9a-f]{3,6}\b(?!'|%)/i.test(css.replace(/url\("data:[^"]+"\)/g, '').replace(/#fff\b/g, '')), 'no color literals but white');
  assert(css.includes('.page { display: flex; flex-direction: column; min-height: 100dvh; padding: 0; background: var(--flowme-b-navy);'));
  assert(css.includes('background: var(--flowme-b-paper); border: 0; border-radius: 26px 26px 0 0;'));
  assert(css.includes('.panel input { width: 100%; min-width: 0; min-height: 48px;'));
  assert(css.includes('@media (max-height: 639px) { .thread { display: none; }'));
  assert(tsx.includes('<ProgramFlowMark className={styles.brandMark} />FlowMe</a>') && tsx.includes('{LOGIN_THREAD}</header>'));
  assert(tsx.includes('const LOGIN_THREAD = <div className={styles.thread} aria-hidden="true">'));
});

test('UX FIX 1: Flow 찾기\'s search field has the 찾기 icon at its start and muted hint words', () => {
  const css = component('ProgramDiscovery.module.css');
  assert(css.includes('.page input::placeholder{color:var(--flowme-b-muted);opacity:1}'));
  const rule = css.slice(css.lastIndexOf('.searchField input{padding-left:44px;'));
  assert(rule.includes("stroke='%23857f72'") && rule.includes("%3Ccircle cx='11' cy='11' r='6'/%3E%3Cpath d='M19.5 19.5l-4-4'/%3E") && rule.includes('no-repeat 14px center/20px 20px}'));
});

test('app icon: the teal 흐름 마크 on navy (the favicon and the four PNGs), the manifest and status bar colors', () => {
  const svg = read('app/icon.svg');
  assert(svg.includes('fill="#1c2550"') && svg.includes('stroke="#8fdccf"') && svg.includes('M5.5 16.5c3.2 0 3.3-9 6.5-9s3.3 9 6.5 9'));
  for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180]] as const) {
    const png = readFileSync(new URL(`../../../public/alpha/${file}`, import.meta.url));
    assert.equal(png.readUInt32BE(16), size, file); assert.equal(png.readUInt32BE(20), size, file);
  }
  const manifest = JSON.parse(read('public/alpha/manifest.webmanifest'));
  assert.equal(manifest.background_color, '#1c2550'); assert.equal(manifest.theme_color, '#fbfaf7');
  assert(read('app/alpha/page.tsx').includes("export const viewport: Viewport = { themeColor: '#fbfaf7' };"));
});
