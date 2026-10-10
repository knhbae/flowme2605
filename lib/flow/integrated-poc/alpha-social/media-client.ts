import type { ProgramMedia } from '../contract';
import { isProgramStoredMedia, PROGRAM_STORED_MEDIA_ID, type ProgramCommunityMediaPort } from '../community-media';

/** Same-origin authenticated media. The caller binds the token accessor to one account. */
export function createAlphaCommunityMediaPort(options: {
  accessToken: () => string | null;
  fetch?: typeof fetch;
}): ProgramCommunityMediaPort {
  const request = options.fetch ?? globalThis.fetch.bind(globalThis);
  const headers = () => {
    const token = options.accessToken();
    if (!token) throw new Error('사진을 확인하려면 다시 로그인해 주세요.');
    return { Authorization: `Bearer ${token}` };
  };
  return {
    async stage(input, signal) {
      const response = await request('/api/alpha/media', { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'stage', ...input }), signal, cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error('사진을 보관하지 못했습니다. 입력은 유지했습니다. 다시 선택해 주세요.');
      const result: unknown = await response.json();
      const media = result && typeof result === 'object' && 'ok' in result && result.ok === true && 'value' in result ? result.value : null;
      if (!media || typeof media !== 'object' || Object.keys(media).sort().join(',') !== 'alt,dataUrl,id,synthetic'
        || !('id' in media) || typeof media.id !== 'string' || !('dataUrl' in media) || typeof media.dataUrl !== 'string'
        || !('alt' in media) || typeof media.alt !== 'string' || !media.alt.trim() || media.alt.length > 500
        || !('synthetic' in media) || typeof media.synthetic !== 'boolean' || !isProgramStoredMedia(media as ProgramMedia)) {
        throw new Error('사진 보관 결과를 확인하지 못했습니다. 공개하지 않았습니다.');
      }
      return media as ProgramMedia;
    },
    async read(id, signal) {
      if (!PROGRAM_STORED_MEDIA_ID.test(id)) throw new Error('사진 연결을 확인하지 못했습니다.');
      const response = await request(`/api/alpha/media?id=${encodeURIComponent(id)}`, { headers: headers(), signal, cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error('사진을 볼 수 없거나 삭제되었습니다.');
      const blob = await response.blob();
      if (blob.type !== 'image/webp' || !blob.size || blob.size > 2_000_000) throw new Error('사진 형식을 확인하지 못했습니다.');
      return blob;
    },
    async discard(id, signal) {
      if (!PROGRAM_STORED_MEDIA_ID.test(id)) throw new Error('사진 연결을 확인하지 못했습니다.');
      const response = await request(`/api/alpha/media?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers(), signal, cache: 'no-store', credentials: 'same-origin' });
      if (response.status === 409) return false;
      if (!response.ok && response.status !== 404) throw new Error('임시 사진을 정리하지 못했습니다. 만료 후 접근할 수 없습니다.');
      return true;
    },
  };
}
