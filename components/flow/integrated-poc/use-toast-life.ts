'use client';

import { useEffect, useRef, useState, type FocusEvent } from 'react';

/** What goes on the toast element so that a touch holds it. */
export type ToastHold = { onPointerEnter: () => void; onPointerLeave: () => void; onFocus: () => void; onBlur: (event: FocusEvent<HTMLElement>) => void };
/** Core3 (11/8): how long a bottom toast stays — the 복구함's and a Flow's arrival. It goes 10 s after it was shown or
 * last touched, and waits while the pointer, a finger or the focus is on it (`hold` goes on the toast). `shown` is the
 * toast's own value: a new one starts its 10 s again; null when none is shown. */
export function useToastLife<T>(shown: T | null, expire: (shown: T) => void, ms = 10_000): { held: { current: boolean }; hold: ToastHold } {
  const held = useRef(false), [touched, setTouched] = useState(0), expireRef = useRef(expire);
  expireRef.current = expire;
  useEffect(() => {
    if (shown === null) { held.current = false; return; }
    const timer = setTimeout(() => { if (!held.current) expireRef.current(shown); }, ms);
    return () => clearTimeout(timer);
  }, [shown, touched, ms]);
  const release = () => { held.current = false; setTouched(count => count + 1); };
  return {
    held,
    hold: {
      onPointerEnter: () => { held.current = true; },
      onPointerLeave: release,
      onFocus: () => { held.current = true; },
      onBlur: (event: FocusEvent<HTMLElement>) => { if (event.currentTarget.contains(event.relatedTarget as Node | null)) return; release(); },
    },
  };
}
