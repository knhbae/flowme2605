'use client';

import React, { useEffect, useRef } from 'react';
import { restoreProgramDialogFocus } from '@/lib/flow/integrated-poc/dialog-return-focus';
import { PRIVACY_NOTICE_CLOSING, PRIVACY_NOTICE_DELETION, PRIVACY_NOTICE_INTRO, PRIVACY_NOTICE_READERS, PRIVACY_NOTICE_REQUEST, PRIVACY_NOTICE_STORED, PRIVACY_NOTICE_TITLE } from '@/lib/flow/integrated-poc/privacy-notice';
import styles from './AlphaPrivacyNotice.module.css';

/** R7: the one sheet that says what is stored and who sees it. Hosts open it only with a checked contact address
 *  (readPrivacyContact). Closing returns focus to where it was opened; when that place is gone (an action inside a
 *  menu that closed), `returnFocus` names where to go instead. */
export function AlphaPrivacyNotice({ contact, onClose, returnFocus }: { contact: string; onClose: () => void; returnFocus?: () => HTMLElement | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fallback = useRef(returnFocus);
  fallback.current = returnFocus;
  useEffect(() => {
    const element = dialog.current, opener = document.activeElement as HTMLElement | null;
    if (element && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
      if (!restoreProgramDialogFocus(opener)) fallback.current?.()?.focus({ preventScroll: true });
    };
  }, []);
  // The sheet fills the dialog, so a press on the dialog itself is on the backdrop.
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="alpha-privacy-notice-title" data-privacy-notice
    onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.sheet}>
      <header className={styles.head}><h2 id="alpha-privacy-notice-title">{PRIVACY_NOTICE_TITLE}</h2>
        <button type="button" className={styles.close} onClick={onClose}>닫기</button></header>
      <div className={styles.body}>
        <p>{PRIVACY_NOTICE_INTRO}</p>
        <section aria-labelledby="alpha-privacy-stored"><h3 id="alpha-privacy-stored">저장하는 것</h3>
          <ul>{PRIVACY_NOTICE_STORED.map(line => <li key={line}>{line}</li>)}</ul></section>
        <section aria-labelledby="alpha-privacy-readers"><h3 id="alpha-privacy-readers">누가 보나</h3>
          <ul>{PRIVACY_NOTICE_READERS.map(line => <li key={line}>{line}</li>)}</ul></section>
        <section aria-labelledby="alpha-privacy-deletion"><h3 id="alpha-privacy-deletion">지워 달라고 할 때</h3>
          <ul><li data-privacy-request><a href={`mailto:${contact}`}>{contact}</a>{PRIVACY_NOTICE_REQUEST}</li>
            {PRIVACY_NOTICE_DELETION.map(line => <li key={line}>{line}</li>)}</ul></section>
        <p className={styles.closing}>{PRIVACY_NOTICE_CLOSING}</p>
      </div>
    </div>
  </dialog>;
}
