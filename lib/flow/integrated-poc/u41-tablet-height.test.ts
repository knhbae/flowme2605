import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// U41: a tablet held sideways (701–1279px wide) is short, and the writing body is sized to the screen minus what the
// page lays out below it (the 17px fix). The page's and the card's paddings there took 64–84px of it (9 lines at
// 1000×511). On the writing screen they are thin in that range, as on a short phone; phones and wide screens keep
// theirs. Past the page's bottom the browser shows the root background: there, the page's canvas, not the beige body.
const css = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaWorkspace.module.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const block = (query: string) => { const at = css.indexOf(`@media ${query} {`); assert(at >= 0, query); return css.slice(at, css.indexOf('\n}\n', at)); };
// U44: the larger tablets held sideways (1280×800), up to 1366×900, take the same paddings: touch screens only, so a
// PC or laptop of that size (1366×768, 1280×800 with a mouse) and any taller 1280–1366px screen keep their own.
const tablet = block('(min-width: 701px) and (max-width: 1279px), (min-width: 1280px) and (max-width: 1366px) and (max-height: 900px) and (pointer: coarse)');
const writing = '.page[data-alpha-frame="b"][data-note-layout="true"]:has([data-program-period="documents"][aria-current="page"])';

test('U41: the writing screen of a tablet held sideways keeps thin paddings, so its body reaches the screen\'s bottom', () => {
  assert(tablet.includes(`${writing} { padding-top: 12px; padding-bottom: 12px; }`));
  assert(tablet.includes(`${writing} .workPane { padding-block: 12px; }`));
});

test('U41 review: the root\'s canvas has the same reach as the paddings (that width, the writing screen only)', () => {
  assert(tablet.includes(':global(html):has(.page[data-alpha-frame="b"][data-note-layout="true"] [data-program-period="documents"][aria-current="page"]) { background: var(--flowme-b-paper); }')); // F6-B1: the page's paper
  // Nothing else in that block, and no root background anywhere else in the file: 오늘·분류·더보기, phones and wide
  // screens keep theirs.
  assert.equal(tablet.split('\n').filter(line => line.startsWith('  ')).length, 3);
  assert.equal(css.match(/:global\(html\)/g)?.length, 1);
});
