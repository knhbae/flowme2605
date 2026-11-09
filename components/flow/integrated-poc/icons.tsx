import React from 'react';

/** F6-B1 (11/9, 방향 B): one icon set on a 24 grid, 2px round strokes in the text color (currentColor), in place of the
 *  letter icons (⋯ × ⌄ ‹ › ↶ ＋ ↻ ☐ ⇤ ⇥ ↳) and the menu's own paths. Decorative: the button around one carries the name. */
export type ProgramIconName = 'write' | 'today' | 'folder' | 'flow' | 'me' | 'plus' | 'more' | 'close' | 'down' | 'up' | 'right' | 'back' | 'undo'
  | 'search' | 'check' | 'cal' | 'repeat' | 'inbox' | 'todo' | 'outdent' | 'indent' | 'mail' | 'lock' | 'link' | 'info';

/** The 흐름 마크's wave: three dots joined by one line (the app icon, the wordmark and the Flow tab). */
export const PROGRAM_FLOW_MARK_PATH = 'M5.5 16.5c3.2 0 3.3-9 6.5-9s3.3 9 6.5 9';
export const PROGRAM_FLOW_MARK_DOTS = [[5.5, 16.5], [12, 7.5], [18.5, 16.5]] as const;

const SHAPES: Record<ProgramIconName, React.ReactNode> = {
  write: <><path d="M4.5 19.5h3.8L19 8.8a2.2 2.2 0 0 0-3.1-3.1L5.2 16.4v3.1z" /><path d="M14.4 7.2l3.2 3.2" /></>,
  today: <><rect x="4" y="4" width="16" height="16" rx="4.5" /><path d="M8.6 12.3l2.4 2.4 4.5-4.9" /></>,
  folder: <path d="M3.5 8.2a2.2 2.2 0 0 1 2.2-2.2h3.6l2 2h7a2.2 2.2 0 0 1 2.2 2.2v7.1a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2z" />,
  flow: <><path d={PROGRAM_FLOW_MARK_PATH} />{PROGRAM_FLOW_MARK_DOTS.map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="2.1" />)}</>,
  me: <><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c1.3-3.6 4-5.4 7-5.4s5.7 1.8 7 5.4" /></>,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  more: <><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></>,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  down: <path d="M6.5 9.5l5.5 5.5 5.5-5.5" />,
  up: <path d="M6.5 14.5L12 9l5.5 5.5" />,
  right: <path d="M9.5 6.5l5.5 5.5-5.5 5.5" />,
  back: <path d="M14.5 6.5L9 12l5.5 5.5" />,
  undo: <><path d="M9 6.5L5 10.5l4 4" /><path d="M5 10.5h9.5a4.5 4.5 0 0 1 0 9H11" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="M19.5 19.5l-4-4" /></>,
  check: <path d="M5.5 12.5l4.2 4.2 8.8-9.4" />,
  cal: <><rect x="4" y="5.5" width="16" height="14.5" rx="3" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>,
  repeat: <><path d="M16.5 3.5l3 3-3 3" /><path d="M19.5 6.5h-10a5 5 0 0 0-5 5" /><path d="M7.5 20.5l-3-3 3-3" /><path d="M4.5 17.5h10a5 5 0 0 0 5-5" /></>,
  inbox: <><path d="M4 13.5l2.4-7h11.2l2.4 7v4.3a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 17.8z" /><path d="M4 13.5h4.8l1.2 2h4l1.2-2H20" /></>,
  todo: <rect x="4.5" y="4.5" width="15" height="15" rx="4" />,
  outdent: <><path d="M20 6H10M20 12h-7M20 18H10" /><path d="M7.5 9L4.5 12l3 3" /></>,
  indent: <><path d="M20 6H10M20 12h-7M20 18H10" /><path d="M4.5 9l3 3-3 3" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="M4.5 7.5l7.5 5.5 7.5-5.5" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>,
};

export function ProgramIcon({ name, size = 24, className }: { name: ProgramIconName; size?: number; className?: string }) {
  return <svg className={className} data-icon={name} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{SHAPES[name]}</svg>;
}

/** F6-B2 FIX 4: words that mark a repeat with the letter ↻ ("↻ 반복", "↻ 매주 토") drawn with the set's repeat icon instead
 *  (the words stay; the icon is decoration). */
export function programRepeatText(text: string, size = 16): React.ReactNode {
  if (!text.includes('↻')) return text;
  return text.split('↻').flatMap((part, index) => index === 0 ? (part ? [part] : [])
    : [<ProgramIcon key={index} name="repeat" size={size} className="flowme-repeat-icon" />, part.replace(/^ /, '')]);
}

/** The 흐름 마크 with its dots filled: the wordmark beside "FlowMe" and the 1280 rail's top. */
export function ProgramFlowMark({ size = 24, className }: { size?: number; className?: string }) {
  return <svg className={className} data-flow-mark viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" aria-hidden="true" focusable="false"><path d={PROGRAM_FLOW_MARK_PATH} />
    {PROGRAM_FLOW_MARK_DOTS.map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="2.2" fill="currentColor" />)}</svg>;
}
