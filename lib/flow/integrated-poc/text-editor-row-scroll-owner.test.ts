import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
const mount = source.slice(source.indexOf('    function appendRowControl('), source.indexOf('    function addRowButton('));
const geometry = source.slice(source.indexOf('      checkButtons.forEach(({ button, row: checkRow, glyph })'), source.indexOf('      syncMoveGeometry();', source.indexOf('    function syncGeometry()')));

test('reading and folded controls share the native row scroll owner; editing keeps its overlay', () => {
  for (const [readingView, folded] of [[true, false], [false, true], [false, false]]) {
    const events = new Map<string, (event: { stopPropagation(): void }) => void>();
    const mounted: unknown[] = [], overlay: unknown[] = [], classes = new Set<string>();
    const button = { classList: { add: (name: string) => classes.add(name) }, addEventListener: (name: string, fn: any) => events.set(name, fn) };
    const attributes = new Map<string, string>(), viewportAttributes = new Map<string, string>();
    const row = { append: (node: unknown) => mounted.push(node), setAttribute: (name: string, value: string) => attributes.set(name, value) };
    const context = vm.createContext({ readingView, foldedIds: new Set(folded ? ['folder'] : []), controls: { append: (node: unknown) => overlay.push(node) },
      viewport: { setAttribute: (name: string, value: string) => viewportAttributes.set(name, value) }, row, button });
    vm.runInContext(mount + '\nappendRowControl(row, button)', context);
    assert.equal(mounted.length, readingView || folded ? 1 : 0);
    assert.equal(overlay.length, readingView || folded ? 0 : 1);
    assert.equal(classes.has('tle-row-control'), readingView || folded);
    assert.equal(viewportAttributes.get('aria-hidden'), readingView || folded ? 'false' : undefined);
    assert.equal(attributes.get('role'), folded ? 'group' : undefined);
    for (const name of ['click', 'keydown']) {
      let stopped = false;
      events.get(name)?.({ stopPropagation() { stopped = true; } });
      assert.equal(stopped, readingView || folded, `${name} must not become a reading/folded row edit`);
    }
  }
});

function positioned(local: boolean, scrollTop: number, clientWidth = 390) {
  const root = { getBoundingClientRect: () => ({ left: 10, right: 400 }) };
  const row: any = { hidden: false, offsetTop: 108, getBoundingClientRect: () => ({ left: 24, right: 340, top: 108 - scrollTop }), querySelector: () => ({ getBoundingClientRect: () => ({ left: 68 }) }) };
  const button = () => ({ parentElement: local ? row : root, style: {} as Record<string, string>, disabled: false, hidden: false });
  const check = button(), scope = button(), fold = button(), reference = button();
  const glyph = { getBoundingClientRect: () => ({ left: 60 }) };
  vm.runInContext(geometry, vm.createContext({ checkButtons: [{ button: check, row, glyph }],
    rowButtons: [{ button: scope, row, type: 'scope-open' }, { button: reference, row, type: 'reference-open' }],
    foldButtons: [{ button: fold, row }], surface: { scrollTop, clientWidth, getBoundingClientRect: () => ({ left: 10 }) }, height: 400, root, mode: 'live', foldedIds: new Set(), actionsDisabled: false, moveState: null }));
  return { check, scope, fold, reference, row };
}

test('row-owned controls use local coordinates without a scroll-event-dependent top', () => {
  for (const scroll of [0, 44, 120, 600]) {
    const p = positioned(true, scroll);
    assert.equal(p.check.style.top, '0px'); assert.equal(p.check.style.left, '23px');
    assert.equal(p.scope.style.top, '0px'); assert.equal(p.scope.style.left, '31px');
    assert.equal(p.fold.style.top, '0px'); assert.equal(p.fold.style.left, '44px');
    assert.equal(p.reference.style.right, '-52px');
    for (const button of [p.check, p.scope, p.fold, p.reference]) assert.equal(button.hidden, false);
  }
});

test('offscreen row controls are clipped by the viewport rather than hidden until the next listener', () => {
  const p = positioned(true, 600);
  assert.equal(p.check.hidden, false);
  // Moving the owner before running syncGeometry leaves its control at top 0.
  const before = p.row.getBoundingClientRect().top;
  p.row.getBoundingClientRect = () => ({ left: 24, right: 340, top: before - 44 });
  assert.equal(p.check.style.top, '0px');
  assert.equal(p.row.getBoundingClientRect().top, before - 44);
});

test('native editing preserves the existing root-relative placement and clipping', () => {
  const p = positioned(false, 44);
  assert.equal(p.check.style.top, '64px'); assert.equal(p.check.style.left, '37px');
  assert.equal(p.scope.style.left, '45px'); assert.equal(p.fold.style.left, '58px');
  assert.equal(p.reference.style.right, undefined);
  assert.equal(positioned(false, 120).check.hidden, true);
});

test('row-owned reference/date rail stays inside the client edge with classic scrollbars', () => {
  const p = positioned(true, 44, 375);
  const right = 340 - Number.parseFloat(p.reference.style.right);
  assert.equal(right, 377); // client edge 385, with the existing eight-pixel inset
  assert(right <= 385);
});

test('checkbox, scope/reference and fold construction all use the same mount boundary', () => {
  assert.equal((source.match(/appendRowControl\(row, button\);/g) || []).length, 3);
  const css = readFileSync(new URL('./vendor/text-editor.css', import.meta.url), 'utf8');
  assert.match(css, /\.tle-line > \.tle-row-control \{[^}]*user-select: none;[^}]*-webkit-user-select: none;/);
  const hostCss = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.module.css', import.meta.url), 'utf8');
  assert.match(hostCss, /\.tle-root:is\(\.tle-reading-view, \.tle-folded-view\) \.tle-controls\) \{ background: transparent; \}/);
  for (const forbidden of ['textarea.value =', 'setSelectionRange', 'focus(', 'replaceChildren', 'dispatchEvent', 'onChange']) {
    assert(!mount.includes(forbidden)); assert(!geometry.includes(forbidden));
  }
});
