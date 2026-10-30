/**
 * The development-environment publication notice is acknowledged once per device and account (W11, decision 2
 * option C). It lives in device storage, so a new tab does not show it again; raising DEV_NOTICE_VERSION with new
 * wording shows it once more. Any storage failure counts as "not acknowledged" and the notice keeps showing.
 * 더보기 › 개발계 안내 shows the text at any time.
 */
export const DEV_NOTICE_TEXT = '개발용 통합 검증판 · 공개한 내용은 개발계의 다른 로그인 사용자에게 보입니다. 중요한 자료의 유일본은 아직 넣지 마세요.';
/** Raise when DEV_NOTICE_TEXT changes, so every device and account sees the new wording once. */
export const DEV_NOTICE_VERSION = '2026-10-31';

const KEY_PREFIX = 'flow:poc:personal-workspace:v1:alpha-m3:dev-notice:';
const key = (ownerId: string, version: string) => `${KEY_PREFIX}${version}:${ownerId}`;

export function readDevNoticeSeen(storage: Pick<Storage, 'getItem'> | undefined, ownerId: string, version = DEV_NOTICE_VERSION): boolean {
  try { return storage?.getItem(key(ownerId, version)) === 'seen'; } catch { return false; }
}

/** Returns whether the acknowledgement was stored; callers hide the notice only when it was. */
export function markDevNoticeSeen(storage: Pick<Storage, 'setItem'> | undefined, ownerId: string, version = DEV_NOTICE_VERSION): boolean {
  if (!storage) return false;
  try { storage.setItem(key(ownerId, version), 'seen'); return true; } catch { return false; }
}
