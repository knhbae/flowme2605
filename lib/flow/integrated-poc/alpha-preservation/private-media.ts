import type { ProgramPrivateSpace } from '../contract';

export function privateMediaIds(space: ProgramPrivateSpace): Set<string> {
  const ids = new Set<string>();
  for (const draft of space.participationDrafts) for (const media of draft.media) {
    if (media.dataUrl === `flowme-media:${media.id}` && /^media-[0-9a-f-]{36}$/.test(media.id)) ids.add(media.id);
  }
  return ids;
}
