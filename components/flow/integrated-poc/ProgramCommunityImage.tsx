'use client';

import { useEffect, useState } from 'react';
import type { ProgramMedia } from '../../../lib/flow/integrated-poc/contract';
import { isProgramStoredMedia, type ProgramCommunityMediaPort } from '../../../lib/flow/integrated-poc/community-media';

export function ProgramCommunityImage({ media, mediaPort }: { media: ProgramMedia; mediaPort?: ProgramCommunityMediaPort }) {
  const [loaded, setLoaded] = useState<{ key: string; src: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const stored = isProgramStoredMedia(media);
  useEffect(() => {
    if (!stored || !mediaPort) return;
    const abort = new AbortController(); let objectUrl: string | null = null;
    setFailed(false); setLoaded(null);
    void mediaPort.read(media.id, abort.signal).then(blob => {
      if (abort.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob); setLoaded({ key: media.dataUrl, src: objectUrl });
    }).catch(() => { if (!abort.signal.aborted) setFailed(true); });
    return () => { abort.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [media.id, media.dataUrl, mediaPort, stored]);
  const src = stored ? mediaPort && loaded?.key === media.dataUrl ? loaded.src : null
    : /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(media.dataUrl) ? media.dataUrl : null;
  if (!src) return <p role="status">{stored && mediaPort && !failed ? '사진 불러오는 중…' : '사진을 볼 수 없거나 삭제되었습니다.'}</p>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={media.alt} />;
}
