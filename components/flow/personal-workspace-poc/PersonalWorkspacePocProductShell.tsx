'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEventHandler,
  type ReactNode,
  type RefObject,
} from 'react';

type PersonalWorkspacePocVisualViewportLike = Readonly<{
  offsetLeft: number;
  offsetTop: number;
  width: number;
  height: number;
}>;

export type PersonalWorkspacePocVisualViewportMetrics = Readonly<{
  source: 'layout-viewport' | 'visual-viewport';
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}>;

type PersonalWorkspacePocViewportEventTarget = Readonly<{
  addEventListener: (
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions | boolean,
  ) => void;
  removeEventListener: (
    type: string,
    listener: EventListener,
    options?: EventListenerOptions | boolean,
  ) => void;
  boundingRect?: Readonly<{
    top: number;
    height: number;
  }>;
}>;

export type PersonalWorkspacePocKeepVisibleAlignment = 'start' | 'end' | undefined;

const EMPTY_VISUAL_VIEWPORT_METRICS: PersonalWorkspacePocVisualViewportMetrics = Object.freeze({
  source: 'layout-viewport',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: 0,
  height: 0,
});

function finiteNonNegative(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

/**
 * Resolves the part of the layout viewport that is actually visible. Mobile
 * browsers may keep window.innerHeight unchanged while the software keyboard
 * covers the bottom of the page, so CSS `dvh` alone is not a sufficient seam.
 */
export function resolvePersonalWorkspacePocVisualViewport({
  layoutWidth,
  layoutHeight,
  visualViewport,
  virtualKeyboardBounds,
}: Readonly<{
  layoutWidth: number;
  layoutHeight: number;
  visualViewport?: PersonalWorkspacePocVisualViewportLike;
  virtualKeyboardBounds?: Readonly<{ top: number; height: number }>;
}>): PersonalWorkspacePocVisualViewportMetrics {
  const safeLayoutWidth = finiteNonNegative(layoutWidth, 0);
  const safeLayoutHeight = finiteNonNegative(layoutHeight, 0);
  const base = !visualViewport
    ? {
      source: 'layout-viewport',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: safeLayoutWidth,
      height: safeLayoutHeight,
    } as const
    : (() => {
      const top = Math.min(
        safeLayoutHeight,
        finiteNonNegative(visualViewport.offsetTop, 0),
      );
      const left = Math.min(
        safeLayoutWidth,
        finiteNonNegative(visualViewport.offsetLeft, 0),
      );
      const width = Math.min(
        Math.max(0, safeLayoutWidth - left),
        finiteNonNegative(visualViewport.width, safeLayoutWidth - left),
      );
      const height = Math.min(
        Math.max(0, safeLayoutHeight - top),
        finiteNonNegative(visualViewport.height, safeLayoutHeight - top),
      );
      return {
        source: 'visual-viewport',
        top,
        right: Math.max(0, safeLayoutWidth - left - width),
        bottom: Math.max(0, safeLayoutHeight - top - height),
        left,
        width,
        height,
      } as const;
    })();

  const keyboardHeight = finiteNonNegative(virtualKeyboardBounds?.height ?? 0, 0);
  if (keyboardHeight === 0) return base;
  const keyboardTop = Math.min(
    safeLayoutHeight,
    finiteNonNegative(virtualKeyboardBounds?.top ?? safeLayoutHeight, safeLayoutHeight),
  );
  const visibleBottom = Math.min(base.top + base.height, keyboardTop);
  const height = Math.max(0, visibleBottom - base.top);
  return {
    ...base,
    bottom: Math.max(base.bottom, safeLayoutHeight - visibleBottom),
    height,
  };
}

export function resolvePersonalWorkspacePocKeepVisibleAlignment({
  elementTop,
  elementBottom,
  viewportTop,
  viewportHeight,
  edgePadding = 12,
}: Readonly<{
  elementTop: number;
  elementBottom: number;
  viewportTop: number;
  viewportHeight: number;
  edgePadding?: number;
}>): PersonalWorkspacePocKeepVisibleAlignment {
  if (viewportHeight <= 0) return undefined;
  const padding = Math.max(0, Math.min(edgePadding, viewportHeight / 4));
  const visibleTop = viewportTop + padding;
  const visibleBottom = viewportTop + viewportHeight - padding;
  const elementHeight = Math.max(0, elementBottom - elementTop);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);

  if (elementHeight > visibleHeight) {
    if (elementBottom <= visibleTop) return 'start';
    if (elementTop >= visibleBottom) return 'end';
    return undefined;
  }
  if (elementTop < visibleTop) return 'start';
  if (elementBottom > visibleBottom) return 'end';
  return undefined;
}

export function resolvePersonalWorkspacePocResidualScroll({
  elementTop,
  elementBottom,
  viewportTop,
  viewportHeight,
  edgePadding = 12,
}: Readonly<{
  elementTop: number;
  elementBottom: number;
  viewportTop: number;
  viewportHeight: number;
  edgePadding?: number;
}>): number {
  if (viewportHeight <= 0) return 0;
  const padding = Math.max(0, Math.min(edgePadding, viewportHeight / 4));
  const visibleTop = viewportTop + padding;
  const visibleBottom = viewportTop + viewportHeight - padding;
  if (elementTop < visibleTop) return elementTop - visibleTop;
  if (elementBottom > visibleBottom) return elementBottom - visibleBottom;
  return 0;
}

function sameVisualViewportMetrics(
  left: PersonalWorkspacePocVisualViewportMetrics,
  right: PersonalWorkspacePocVisualViewportMetrics,
): boolean {
  return left.source === right.source
    && left.top === right.top
    && left.right === right.right
    && left.bottom === right.bottom
    && left.left === right.left
    && left.width === right.width
    && left.height === right.height;
}

function usePersonalWorkspacePocVisualViewport(
  scopeRef: RefObject<HTMLElement | null>,
): PersonalWorkspacePocVisualViewportMetrics {
  const [metrics, setMetrics] = useState(EMPTY_VISUAL_VIEWPORT_METRICS);

  useEffect(() => {
    let frame: number | undefined;
    let keepVisibleFrame: number | undefined;
    const scrollingElement = document.scrollingElement instanceof HTMLElement
      ? document.scrollingElement
      : document.documentElement;
    const previousScrollBehavior = scrollingElement.style.getPropertyValue('scroll-behavior');
    const previousScrollBehaviorPriority = scrollingElement.style.getPropertyPriority('scroll-behavior');
    // `behavior: auto` otherwise inherits a global smooth-scroll rule. Dynamic
    // keyboard geometry needs an immediate, deterministic correction.
    scrollingElement.style.setProperty('scroll-behavior', 'auto', 'important');
    const viewport = window.visualViewport;
    const virtualKeyboard = (
      navigator as Navigator & { virtualKeyboard?: PersonalWorkspacePocViewportEventTarget }
    ).virtualKeyboard;
    const read = () => resolvePersonalWorkspacePocVisualViewport({
      layoutWidth: window.innerWidth,
      layoutHeight: window.innerHeight,
      ...(viewport ? {
        visualViewport: {
          offsetLeft: viewport.offsetLeft,
          offsetTop: viewport.offsetTop,
          width: viewport.width,
          height: viewport.height,
        },
      } : {}),
      ...(virtualKeyboard?.boundingRect ? {
        virtualKeyboardBounds: {
          top: virtualKeyboard.boundingRect.top,
          height: virtualKeyboard.boundingRect.height,
        },
      } : {}),
    });
    const keepFocusedControlVisible = (next: PersonalWorkspacePocVisualViewportMetrics) => {
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || !scopeRef.current?.contains(focused)) return;
      if (!focused.matches(
        'input:not([type="hidden"]), textarea, select, [contenteditable="true"], [data-keyboard-safe-action="true"]',
      )) return;
      const rect = focused.getBoundingClientRect();
      const alignment = resolvePersonalWorkspacePocKeepVisibleAlignment({
        elementTop: rect.top,
        elementBottom: rect.bottom,
        viewportTop: next.top,
        viewportHeight: next.height,
      });
      if (!alignment) return;
      focused.scrollIntoView({
        behavior: 'auto',
        block: alignment,
        inline: 'nearest',
      });
      // Sticky actions can satisfy layout-viewport geometry while still
      // sitting below the visual viewport. Correct that residual distance
      // explicitly after scrollIntoView has updated the document scroll.
      const correctedRect = focused.getBoundingClientRect();
      const correction = resolvePersonalWorkspacePocResidualScroll({
        elementTop: correctedRect.top,
        elementBottom: correctedRect.bottom,
        viewportTop: next.top,
        viewportHeight: next.height,
      });
      if (correction !== 0) {
        window.scrollBy({ top: correction, left: 0, behavior: 'auto' });
      }
    };
    const update = () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = undefined;
        const next = read();
        setMetrics((current) => sameVisualViewportMetrics(current, next) ? current : next);
        // The CSS viewport insets are rendered from `metrics`. Wait for that
        // commit before using scroll-margin and sticky offsets to reveal the
        // focused control; doing it in this same frame uses stale geometry.
        if (keepVisibleFrame !== undefined) window.cancelAnimationFrame(keepVisibleFrame);
        keepVisibleFrame = window.requestAnimationFrame(() => {
          keepVisibleFrame = undefined;
          keepFocusedControlVisible(next);
        });
      });
    };

    setMetrics(read());
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    document.addEventListener('focusin', update);
    viewport?.addEventListener('resize', update, { passive: true });
    viewport?.addEventListener('scroll', update, { passive: true });
    virtualKeyboard?.addEventListener('geometrychange', update);
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      if (keepVisibleFrame !== undefined) window.cancelAnimationFrame(keepVisibleFrame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('focusin', update);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      virtualKeyboard?.removeEventListener('geometrychange', update);
      if (previousScrollBehavior) {
        scrollingElement.style.setProperty(
          'scroll-behavior',
          previousScrollBehavior,
          previousScrollBehaviorPriority,
        );
      } else {
        scrollingElement.style.removeProperty('scroll-behavior');
      }
    };
  }, [scopeRef]);

  return metrics;
}

import { PlatformNav } from '../PlatformNav';

const testStyleFallback = Object.freeze({
  productShell: 'productShell',
  navigationFrame: 'navigationFrame',
  localMain: 'localMain',
  workspaceMain: 'workspaceMain',
  authoringMain: 'authoringMain',
  skipLink: 'skipLink',
});

// The repository's direct Node test runner does not transform CSS Modules.
// Next.js still owns the real module in application builds; tests only need
// stable class names while exercising the exported surface logic.
const styles = process.env.NODE_TEST_CONTEXT
  ? testStyleFallback
  : require('./PersonalWorkspacePocProductShell.module.css') as typeof testStyleFallback;

export const PERSONAL_WORKSPACE_POC_PRODUCT_SHELL_CONTRACT = Object.freeze({
  version: 'p3-g-v1',
  navigationOwner: 'platform-nav',
  globalAction: 'cobalt',
  localContext: 'workspace-teal',
  viewports: '320x700,360x800,375x812,390x844,844x390,1024x768,1440x900',
});

type PersonalWorkspacePocProductShellProps = Readonly<{
  children: ReactNode;
  mainId?: string;
  mainTestId: string;
  storagePrefix: string;
  flowEditorScrollKey?: string;
  variant: 'workspace' | 'authoring';
  href: `#${string}`;
  skipLabel: string;
  onSkip?: MouseEventHandler<HTMLAnchorElement>;
  mainClassName?: string;
  mainStyle?: CSSProperties;
}>;

export function PersonalWorkspacePocProductShell({
  children,
  mainId,
  mainTestId,
  storagePrefix,
  flowEditorScrollKey,
  variant,
  href,
  skipLabel,
  onSkip,
  mainClassName = '',
  mainStyle,
}: PersonalWorkspacePocProductShellProps) {
  const productShellRef = useRef<HTMLDivElement>(null);
  const visualViewport = usePersonalWorkspacePocVisualViewport(productShellRef);
  const mainVariantClass = variant === 'workspace'
    ? styles.workspaceMain
    : styles.authoringMain;
  const visualViewportStyle = {
    '--personal-workspace-visual-viewport-top': `${visualViewport.top}px`,
    '--personal-workspace-visual-viewport-right': `${visualViewport.right}px`,
    '--personal-workspace-visual-viewport-bottom': `${visualViewport.bottom}px`,
    '--personal-workspace-visual-viewport-left': `${visualViewport.left}px`,
    '--personal-workspace-visual-viewport-width': visualViewport.width > 0
      ? `${visualViewport.width}px`
      : '100vw',
    '--personal-workspace-visual-viewport-height': visualViewport.height > 0
      ? `${visualViewport.height}px`
      : '100dvh',
  } as CSSProperties;

  return (
    <div
      ref={productShellRef}
      className={styles.productShell}
      style={visualViewportStyle}
      data-testid="personal-workspace-product-shell"
      data-product-shell-contract={PERSONAL_WORKSPACE_POC_PRODUCT_SHELL_CONTRACT.version}
      data-product-navigation-owner={PERSONAL_WORKSPACE_POC_PRODUCT_SHELL_CONTRACT.navigationOwner}
      data-product-global-action={PERSONAL_WORKSPACE_POC_PRODUCT_SHELL_CONTRACT.globalAction}
      data-product-local-context={PERSONAL_WORKSPACE_POC_PRODUCT_SHELL_CONTRACT.localContext}
      data-product-responsive-viewports={PERSONAL_WORKSPACE_POC_PRODUCT_SHELL_CONTRACT.viewports}
      data-product-surface={variant}
      data-product-visual-viewport-source={visualViewport.source}
      data-product-visual-viewport-bottom={visualViewport.bottom}
      data-product-visual-viewport-height={visualViewport.height || undefined}
    >
      <a
        href={href}
        className={styles.skipLink}
        onClick={onSkip}
      >
        {skipLabel}
      </a>

      <div className={styles.navigationFrame} data-product-shell-region="global-navigation">
        <PlatformNav includeMobileTabs />
      </div>

      <main
        id={mainId}
        data-testid={mainTestId}
        data-poc-storage-prefix={storagePrefix}
        data-flow-editor-scroll-key={flowEditorScrollKey}
        data-product-shell-region="local-content"
        data-product-local-token-contract="workspace-teal-v1"
        className={`${styles.localMain} ${mainVariantClass} ${mainClassName}`.trim()}
        style={mainStyle}
      >
        {children}
      </main>
    </div>
  );
}
