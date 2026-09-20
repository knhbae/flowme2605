import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  resolvePersonalWorkspacePocKeepVisibleAlignment,
  resolvePersonalWorkspacePocResidualScroll,
  resolvePersonalWorkspacePocVisualViewport,
} from './PersonalWorkspacePocProductShell';

const component = readFileSync(
  'components/flow/personal-workspace-poc/PersonalWorkspacePocProductShell.tsx',
  'utf8',
);
const styles = readFileSync(
  'components/flow/personal-workspace-poc/PersonalWorkspacePocProductShell.module.css',
  'utf8',
);
const workspace = readFileSync(
  'components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx',
  'utf8',
);
const authoring = readFileSync(
  'components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx',
  'utf8',
);

test('product shell owns global navigation outside the local token scope', () => {
  const navigation = component.indexOf('<PlatformNav includeMobileTabs />');
  const main = component.indexOf('<main');
  assert.ok(navigation >= 0 && main > navigation);
  assert.match(component, /data-product-shell-region="global-navigation"/u);
  assert.match(component, /data-product-shell-region="local-content"/u);
  assert.match(component, /data-product-navigation-owner/u);
});

test('local contract aliases action and focus only inside localMain; global navigation stays outside', () => {
  assert.match(styles, /--flowme-workspace-accent: #087f73/u);
  assert.match(styles, /--flowme-workspace-accent-strong: #066a61/u);
  assert.match(styles, /--flowme-workspace-accent-soft: #e5f2ef/u);
  const local = [...styles.matchAll(/\.localMain \{([\s\S]*?)\n\}/gu)]
    .map(match => match[1]).find(block => block.includes('--flowme-workspace-accent:'));
  assert.ok(local);
  for (const [role, token] of Object.entries({ action: 'accent', 'action-hover': 'accent-strong',
    'action-strong': 'accent-strong', 'action-soft': 'accent-soft', 'action-border': 'accent-border', focus: 'accent-strong' })) {
    assert.ok(local.includes(`--flowme-${role}: var(--flowme-workspace-${token});`));
  }
  const outside = styles.replace(local, '');
  assert.ok(local.includes('--flowme-surface-selected: var(--flowme-workspace-accent-soft);'));
  assert.ok(local.includes('--flowme-focus-outline: 3px solid var(--flowme-focus);'));
  assert.doesNotMatch(outside, /--flowme-(?:action(?:-\w+)?|focus)\s*:/u);
  assert.doesNotMatch(local, /--flowme-(?:danger|warning|positive|disabled)(?:-\w+)?\s*:/u);
  assert.doesNotMatch(workspace, /['"]--flowme-action['"]\s*:/u);
  assert.doesNotMatch(authoring, /['"]--flowme-action['"]\s*:/u);
});

test('48px rules name local controls without resizing global navigation or calendar cells', () => {
  const inventory = styles.match(/\/\* Explicit local action inventory[\s\S]*?\*\/([\s\S]*?\n\})/u)?.[1];
  assert.ok(inventory);
  assert.match(inventory, /min-width: 48px;[\s\S]*min-height: 48px;/u);
  assert.match(inventory, /personal-workspace-source-update-dialog/u);
  assert.match(inventory, /personal-workspace-entry-item-detail/u);
  assert.match(inventory, /personal-workspace-authoring-subcheck-focus-/u);
  assert.doesNotMatch(inventory, /platform-nav|calendar|\.localMain\s+button\s*[,\{]/u);
});

test('authoring consumes the inherited focus token without hardcoded focus classes', () => {
  assert.doesNotMatch(authoring, /focus-visible:ring-teal-700/u);
  assert.doesNotMatch(authoring, /focus:border-teal-700/u);
  assert.doesNotMatch(authoring, /focus:ring-teal-700\/20/u);
  assert.match(authoring, /focus-visible:ring-\[var\(--flowme-focus\)\]/u);
  assert.match(authoring, /focus:border-\[var\(--flowme-focus\)\]/u);
  assert.match(authoring, /focus:ring-\[var\(--flowme-focus\)\]/u);
});

test('shell records and implements the five required responsive evidence sizes', () => {
  for (const viewport of ['375x812', '390x844', '844x390', '1024x768', '1440x900']) {
    assert.match(component, new RegExp(viewport.replace('x', 'x'), 'u'));
  }
  assert.match(styles, /min-width: 375px[\s\S]*max-width: 390px/u);
  assert.match(styles, /max-width: 1023px[\s\S]*max-height: 500px[\s\S]*orientation: landscape/u);
  assert.match(styles, /min-width: 1024px[\s\S]*max-width: 1279px/u);
  assert.match(styles, /min-width: 1280px/u);
  assert.match(
    styles,
    /padding-top: max\(0\.75rem, var\(--personal-workspace-safe-top\)\)/u,
  );
  assert.match(component, /320x700,360x800/u);
});

test('authoring stage navigation exposes input and result while draft library stays auxiliary', () => {
  const nav = authoring.match(
    /<nav data-testid="personal-workspace-authoring-mobile-stage-nav"[\s\S]*?<\/nav>/u,
  )?.[0] ?? '';
  assert.match(nav, /personal-workspace-authoring-tab-input/u);
  assert.match(nav, /personal-workspace-authoring-tab-result/u);
  assert.doesNotMatch(nav, /personal-workspace-authoring-tab-library/u);
  assert.match(authoring, /data-testid="creator-draft-library-open"/u);
  assert.match(authoring, /data-testid="personal-workspace-authoring-tab-library"/u);
});

test('workspace presents imported flows as flat rows and marks the local layout contract', () => {
  assert.match(workspace, /data-product-row-style="flat"/u);
  assert.match(workspace, /data-testid="personal-workspace-shell-layout"/u);
  assert.match(styles, /grid-template-columns: 240px minmax\(0, 1fr\) !important/u);
});

test('visual viewport resolver exposes keyboard and zoom occlusion on every edge', () => {
  assert.deepEqual(resolvePersonalWorkspacePocVisualViewport({
    layoutWidth: 390,
    layoutHeight: 844,
  }), {
    source: 'layout-viewport',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: 390,
    height: 844,
  });
  assert.deepEqual(resolvePersonalWorkspacePocVisualViewport({
    layoutWidth: 390,
    layoutHeight: 844,
    visualViewport: {
      offsetLeft: 8,
      offsetTop: 44,
      width: 360,
      height: 480,
    },
  }), {
    source: 'visual-viewport',
    top: 44,
    right: 22,
    bottom: 320,
    left: 8,
    width: 360,
    height: 480,
  });
  assert.deepEqual(resolvePersonalWorkspacePocVisualViewport({
    layoutWidth: 390,
    layoutHeight: 844,
    visualViewport: {
      offsetLeft: 0,
      offsetTop: 0,
      width: 390,
      height: 844,
    },
    virtualKeyboardBounds: {
      top: 520,
      height: 324,
    },
  }), {
    source: 'visual-viewport',
    top: 0,
    right: 0,
    bottom: 324,
    left: 0,
    width: 390,
    height: 520,
  });
});

test('visual viewport resolver clamps malformed browser geometry fail-safe', () => {
  assert.deepEqual(resolvePersonalWorkspacePocVisualViewport({
    layoutWidth: 390,
    layoutHeight: 844,
    visualViewport: {
      offsetLeft: -50,
      offsetTop: Number.NaN,
      width: 900,
      height: -1,
    },
  }), {
    source: 'visual-viewport',
    top: 0,
    right: 0,
    bottom: 844,
    left: 0,
    width: 390,
    height: 0,
  });
});

test('keep-visible resolver moves only controls outside the visual viewport', () => {
  const viewport = { viewportTop: 40, viewportHeight: 480 };
  assert.equal(resolvePersonalWorkspacePocKeepVisibleAlignment({
    ...viewport,
    elementTop: 80,
    elementBottom: 128,
  }), undefined);
  assert.equal(resolvePersonalWorkspacePocKeepVisibleAlignment({
    ...viewport,
    elementTop: 20,
    elementBottom: 68,
  }), 'start');
  assert.equal(resolvePersonalWorkspacePocKeepVisibleAlignment({
    ...viewport,
    elementTop: 500,
    elementBottom: 548,
  }), 'end');
  assert.equal(resolvePersonalWorkspacePocKeepVisibleAlignment({
    ...viewport,
    elementTop: 0,
    elementBottom: 600,
  }), undefined);
});

test('residual scroll resolver corrects the focused control against visual viewport edges', () => {
  const viewport = { viewportTop: 40, viewportHeight: 480 };
  assert.equal(resolvePersonalWorkspacePocResidualScroll({
    ...viewport,
    elementTop: 80,
    elementBottom: 128,
  }), 0);
  assert.equal(resolvePersonalWorkspacePocResidualScroll({
    ...viewport,
    elementTop: 20,
    elementBottom: 68,
  }), -32);
  assert.equal(resolvePersonalWorkspacePocResidualScroll({
    ...viewport,
    elementTop: 500,
    elementBottom: 548,
  }), 40);
  assert.equal(resolvePersonalWorkspacePocResidualScroll({
    ...viewport,
    elementTop: 20,
    elementBottom: 600,
  }), -32);
  assert.equal(resolvePersonalWorkspacePocResidualScroll({
    viewportTop: 0,
    viewportHeight: 0,
    elementTop: 100,
    elementBottom: 148,
  }), 0);
});

test('keep-visible scheduling waits for viewport CSS commit and cancels both frames', () => {
  assert.match(
    component,
    /setMetrics\([\s\S]*keepVisibleFrame = window\.requestAnimationFrame\([\s\S]*keepFocusedControlVisible\(next\)/u,
  );
  assert.match(
    component,
    /if \(frame !== undefined\) window\.cancelAnimationFrame\(frame\);[\s\S]*if \(keepVisibleFrame !== undefined\) window\.cancelAnimationFrame\(keepVisibleFrame\);/u,
  );
  assert.match(component, /resolvePersonalWorkspacePocResidualScroll\(\{[\s\S]*window\.scrollBy\(\{ top: correction/u);
  assert.doesNotMatch(component, /localStorage|commitTransition|\.setItem\(|\.removeItem\(|\.clear\(/u);
});

test('shell temporarily disables inherited smooth scrolling and restores the exact root style', () => {
  assert.match(component, /getPropertyValue\('scroll-behavior'\)/u);
  assert.match(component, /getPropertyPriority\('scroll-behavior'\)/u);
  assert.match(component, /setProperty\('scroll-behavior', 'auto', 'important'\)/u);
  assert.match(
    component,
    /setProperty\([\s\S]*previousScrollBehavior,[\s\S]*previousScrollBehaviorPriority/u,
  );
  assert.match(component, /removeProperty\('scroll-behavior'\)/u);
});

test('product shell reacts to visual viewport, virtual keyboard, focus, and reduced motion', () => {
  assert.match(component, /window\.visualViewport/u);
  assert.match(component, /viewport\?\.addEventListener\('resize', update, \{ passive: true \}\)/u);
  assert.match(component, /viewport\?\.addEventListener\('scroll', update, \{ passive: true \}\)/u);
  assert.match(component, /virtualKeyboard\?\.addEventListener\('geometrychange', update\)/u);
  assert.match(component, /document\.addEventListener\('focusin', update\)/u);
  assert.match(component, /focused\.scrollIntoView\(\{[\s\S]*behavior: 'auto'/u);
  assert.match(component, /--personal-workspace-visual-viewport-bottom/u);
  assert.match(styles, /scroll-margin-bottom:[\s\S]*--personal-workspace-visual-viewport-bottom/u);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*scroll-behavior: auto !important/u);
  assert.match(styles, /animation-duration: 0\.01ms !important/u);
  assert.match(
    styles,
    /not\(\[data-product-visual-viewport-bottom='0'\]\)[\s\S]*\[data-product-primary='authoring-save'\][\s\S]*position: fixed !important/u,
  );
  assert.match(styles, /bottom:[\s\S]*--personal-workspace-visual-viewport-bottom[\s\S]*--flowme-mobile-workbar-bottom/u);
});
