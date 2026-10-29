/**
 * The development-environment publication notice is acknowledged once per tab and account.
 * It lives in tab storage, so a new tab shows it again; any storage failure counts as
 * "not acknowledged" and the notice keeps showing.
 */
export const DEV_NOTICE_TEXT = '개발용 통합 검증판 · 공개한 내용은 개발계의 다른 로그인 사용자에게 보입니다. 중요한 자료의 유일본은 아직 넣지 마세요.';

const KEY_PREFIX = 'flow:poc:personal-workspace:v1:alpha-m3:dev-notice:';

export function readDevNoticeSeen(storage: Pick<Storage, 'getItem'> | undefined, ownerId: string): boolean {
  try { return storage?.getItem(KEY_PREFIX + ownerId) === 'seen'; } catch { return false; }
}

/** Returns whether the acknowledgement was stored; callers hide the notice only when it was. */
export function markDevNoticeSeen(storage: Pick<Storage, 'setItem'> | undefined, ownerId: string): boolean {
  if (!storage) return false;
  try { storage.setItem(KEY_PREFIX + ownerId, 'seen'); return true; } catch { return false; }
}
