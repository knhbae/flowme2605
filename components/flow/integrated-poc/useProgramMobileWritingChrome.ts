'use client';

import React, { useEffect, useState } from 'react';

/** Browser chrome/pinch zoom must not be mistaken for a soft keyboard. */
export function programMobileWritingKeyboardOpen(baselineHeight: number, visibleHeight: number, scale = 1) {
  return Number.isFinite(baselineHeight) && Number.isFinite(visibleHeight)
    && Math.abs(scale - 1) < 0.05
    && baselineHeight - visibleHeight > Math.max(120, baselineHeight * 0.18);
}

/** Presentation only. Never flush, remount, focus or change the native editor. */
export function useProgramMobileWritingChrome(rootRef: React.RefObject<HTMLElement | null>, ready: boolean) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const root = rootRef.current, view = root?.ownerDocument.defaultView;
    if (!ready || !root || !view) { setHidden(false); return; }
    const visual = view.visualViewport;
    const mobile = view.matchMedia?.('(max-width: 700px)');
    let frame = 0, baselineHeight = Math.max(view.innerHeight, visual?.height ?? 0);
    let writingEditor: Element | null = null;
    const update = () => {
      frame = 0;
      const active = root.ownerDocument.activeElement;
      const inside = !!active && root.contains(active);
      const nativeBody = inside && active.matches('textarea:not([readonly]):not(:disabled)')
        && !!active.closest('[data-native-editor="v11-core"], [data-folder-region]');
      const pmBody = inside && active.matches('.ProseMirror[contenteditable="true"]')
        && !!active.closest('[data-rea-app-editor]');
      const body = nativeBody || pmBody;
      if (body) writingEditor = active.closest('[aria-label="개인 문서 편집"]');
      // F4-b fix (A4/A5): a line field (the folder's '＋ 오늘 할 일', a day's ＋) is writing too: the tabs step aside for it.
      const lineEntry = inside && active.matches('input[data-line-entry]:not(:disabled)');
      const editorTool = inside && !!writingEditor?.contains(active)
        && !!active.closest('[data-editor-tools]')
        && (!writingEditor?.matches('[data-rea-app-editor]')
          || !!writingEditor.querySelector('.ProseMirror[contenteditable="true"]'));
      const writing = body || editorTool || lineEntry;
      const visibleHeight = visual ? visual.height : view.innerHeight;
      if (!writing) writingEditor = null;
      // A title/search field may keep the keyboard open before returning to body.
      // Do not replace the closed-keyboard baseline with that shrunken viewport.
      if (!programMobileWritingKeyboardOpen(baselineHeight, visibleHeight, visual?.scale ?? 1)) {
        baselineHeight = Math.max(view.innerHeight, visibleHeight);
      }
      const isMobile = mobile?.matches ?? view.innerWidth <= 700;
      setHidden(isMobile && writing
        && programMobileWritingKeyboardOpen(baselineHeight, visibleHeight, visual?.scale ?? 1));
    };
    const schedule = () => { if (!frame) frame = view.requestAnimationFrame(update); };
    const orientation = () => {
      baselineHeight = Math.max(view.innerHeight, visual?.height ?? 0); schedule();
    };
    root.addEventListener('focusin', schedule); root.addEventListener('focusout', schedule);
    view.addEventListener('resize', schedule); view.addEventListener('orientationchange', orientation);
    visual?.addEventListener('resize', schedule); visual?.addEventListener('scroll', schedule);
    mobile?.addEventListener?.('change', schedule);
    schedule();
    return () => {
      view.cancelAnimationFrame(frame);
      root.removeEventListener('focusin', schedule); root.removeEventListener('focusout', schedule);
      view.removeEventListener('resize', schedule); view.removeEventListener('orientationchange', orientation);
      visual?.removeEventListener('resize', schedule); visual?.removeEventListener('scroll', schedule);
      mobile?.removeEventListener?.('change', schedule);
    };
  }, [rootRef, ready]);
  return hidden;
}

