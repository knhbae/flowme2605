/**
 * The development-environment publication notice is acknowledged once per device and account (W11, decision 2
 * option C). It lives in device storage, so a new tab does not show it again; raising DEV_NOTICE_VERSION with new
 * wording shows it once more. Any storage failure counts as "not acknowledged" and the notice keeps showing.
 * 더보기 › 저장과 공개 안내 shows the text at any time.
 * UX B1 (11/6): the wording says what is public, not that this is a development build; the version stays, so a
 * person who already confirmed the notice does not see it again.
 */
export const DEV_NOTICE_TEXT = '공개한 Flow와 글은 로그인한 다른 사용자도 봅니다. 내 문서와 할 일은 나만 봅니다.';
/** Raise when DEV_NOTICE_TEXT changes, so every device and account sees the new wording once (not raised for B1). */
export const DEV_NOTICE_VERSION = '2026-10-31';

const KEY_PREFIX = 'flow:poc:personal-workspace:v1:alpha-m3:dev-notice:';
/** The account part of the key: a 128-bit FNV digest (four seeds, as legacy IDs use), so device storage never
 *  holds the account ID itself. It keeps the raw ID out of storage; it is not a secret from whoever has the ID. */
function accountKey(ownerId: string): string {
  return [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35].map(seed => {
    let hash = seed;
    for (let i = 0; i < ownerId.length; i++) hash = Math.imul(hash ^ ownerId.charCodeAt(i), 0x01000193);
    return (hash >>> 0).toString(16).padStart(8, '0');
  }).join('');
}
const key = (ownerId: string, version: string) => `${KEY_PREFIX}${version}:${accountKey(ownerId)}`;
/** Keys of earlier builds that held the account ID: N1's per-tab key and W11's first device key. */
const FIRST_VERSION = '2026-10-31';
const legacyKeys = (ownerId: string) => ({ tab: `${KEY_PREFIX}${ownerId}`, first: `${KEY_PREFIX}${FIRST_VERSION}:${ownerId}` });

type DevNoticeStorage = Pick<Storage, 'getItem'> & Partial<Pick<Storage, 'setItem' | 'removeItem'>>;

/** Reading also clears the keys that held the account ID, from device storage and from tab storage (N1 kept it
 *  per tab). W11's first acknowledgement, for its version, moves to the digest key before its key goes; N1's
 *  per-tab one does not carry over, so the device-wide notice shows once, as for a raised version. A key goes
 *  only once its acknowledgement is safe; a storage failure leaves it and keeps the notice as it was. */
export function readDevNoticeSeen(storage: DevNoticeStorage | undefined, ownerId: string, version = DEV_NOTICE_VERSION, tabStorage?: DevNoticeStorage): boolean {
  let seen: boolean;
  try { seen = storage?.getItem(key(ownerId, version)) === 'seen'; } catch { return false; }
  const old = legacyKeys(ownerId);
  for (const store of [storage, tabStorage]) {
    if (!store) continue;
    try {
      const first = store.getItem(old.first);
      if (first !== null) {
        if (!seen && first === 'seen' && version === FIRST_VERSION) {
          if (!storage?.setItem) continue;
          storage.setItem(key(ownerId, version), 'seen'); seen = true;
        }
        store.removeItem?.(old.first);
      }
      if (store.getItem(old.tab) !== null) store.removeItem?.(old.tab);
    } catch { /* The old key stays. */ }
  }
  return seen;
}

/** Returns whether the acknowledgement was stored; callers hide the notice only when it was. */
export function markDevNoticeSeen(storage: Pick<Storage, 'setItem'> | undefined, ownerId: string, version = DEV_NOTICE_VERSION): boolean {
  if (!storage) return false;
  try { storage.setItem(key(ownerId, version), 'seen'); return true; } catch { return false; }
}
