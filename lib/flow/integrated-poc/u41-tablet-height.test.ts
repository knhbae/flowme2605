import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// U41: a tablet held sideways (701–1279px wide) is short, and the writing body is sized to the screen minus what the
// page lays out below it (the 17px fix). The page's and the card's paddings there took 64–84px of it (9 lines at
// 1000×511). On the writing screen they are thin in that range, as on a short phone; phones and wide screens keep
// theirs. Past the page's bottom the browser shows the root background: it is the page's canvas, not the beige body.
const css = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaWorkspace.module.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const block = (query: string) => { const at = css.indexOf(`@media ${query} {`); assert(at >= 0, query); return css.slice(at, css.indexOf('\n}\n', at)); };

test('U41: the writing screen of a tablet held sideways keeps thin paddings, so its body reaches the screen\'s bottom', () => {
  const tablet = block('(min-width: 701px) and (max-width: 1279px)');
  const writing = '.page[data-alpha-frame="b"][data-note-layout="true"]:has([data-program-period="documents"][aria-current="page"])';
  assert(tablet.includes(`${writing} { padding-top: 12px; padding-bottom: 12px; }`));
  assert(tablet.includes(`${writing} .workPane { padding-block: 12px; }`));
  // Only the writing screen: the lists (오늘·분류) and the other ranges keep their paddings.
  assert.equal(tablet.split('\n').filter(line => line.startsWith('  ')).length, 2);
});

test('U41: past the page\'s bottom the root shows the page\'s canvas, not the beige body', () => {
  assert.match(css, /:global\(html\):has\(\.page\[data-alpha-frame="b"\]\) \{ background: var\(--flowme-b-canvas\); \}/);
});
