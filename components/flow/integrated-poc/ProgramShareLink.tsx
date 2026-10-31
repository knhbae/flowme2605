'use client';

import React, { useEffect, useRef, useState } from 'react';
import { programFlowShareUrl, shareProgramLink, type ProgramShareOutcome, type ProgramSharePort } from '@/lib/flow/integrated-poc/program-share-link';
import styles from './ProgramShareLink.module.css';

/** A phone's share sheet when it has one (coarse pointer), otherwise the clipboard. */
function browserSharePort(): ProgramSharePort {
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return { ...(coarse && typeof navigator.share === 'function' ? { share: (url: string) => navigator.share({ url }) } : {}),
    ...(navigator.clipboard && typeof navigator.clipboard.writeText === 'function' ? { copy: (text: string) => navigator.clipboard.writeText(text) } : {}) };
}

/** FC5: the same button in three places (Flow detail ⋯, the publish panel, 내 활동 › 내 공개 Flow). It shares a
 *  version-pinned link to this page's Flow detail; success says so for 3 seconds, a failure shows the link to copy. */
export function ProgramShareLink({ flowId, versionId, unverified = false }: { flowId: string; versionId: string; unverified?: boolean }) {
  // FC5 review 3: the result, the waiting state and a late share answer belong to the Flow and version they were
  // made for; another version shows none of them.
  const key = `${flowId}\n${versionId}`;
  const shown = useRef(key);
  useEffect(() => { shown.current = key; }, [key]);
  const [result, setResult] = useState<{ key: string; outcome: ProgramShareOutcome; url: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const state = result?.key === key ? result : null, busy = busyKey === key;
  const run = async () => {
    if (busy || unverified) return;
    const url = programFlowShareUrl(`${window.location.origin}${window.location.pathname}`, flowId, versionId);
    if (!url) return;
    const started = key;
    setBusyKey(started); window.clearTimeout(timer.current);
    const outcome = await shareProgramLink(url, browserSharePort());
    setBusyKey(current => current === started ? null : current);
    if (shown.current !== started) return;
    setResult({ key: started, outcome, url });
    if (outcome === 'shared' || outcome === 'copied') timer.current = window.setTimeout(() => setResult(null), 3000);
  };
  return <div className={styles.share} data-share-link>
    <button type="button" disabled={busy || unverified} onClick={() => void run()}>링크 복사</button>
    <p className={styles.hint}>{unverified ? '미확인 콘텐츠는 링크를 만들지 않습니다.' : 'Alpha에 로그인한 사람만 열 수 있습니다.'}</p>
    {(state?.outcome === 'copied' || state?.outcome === 'shared') && <p className={styles.done} role="status">{state.outcome === 'copied' ? '링크를 복사했습니다' : '링크를 공유했습니다'}</p>}
    {state?.outcome === 'fallback' && <div className={styles.fallback} role="status"><input readOnly aria-label="공유할 링크" value={state.url} onFocus={event => event.currentTarget.select()} />
      <p>길게 눌러 복사해 주세요</p></div>}
  </div>;
}
