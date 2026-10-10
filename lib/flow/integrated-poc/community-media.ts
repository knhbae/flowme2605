import type { ProgramMedia } from './contract';

/** An opaque registry identity, never an object path, token or public URL. */
export const PROGRAM_STORED_MEDIA_ID = /^media-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function isProgramStoredMedia(value: Pick<ProgramMedia, 'id' | 'dataUrl'>): boolean {
  return PROGRAM_STORED_MEDIA_ID.test(value.id) && value.dataUrl === `flowme-media:${value.id}`;
}
export type ProgramCommunityMediaPort = {
  stage(input: { requestId: string; dataUrl: string; alt: string; synthetic: boolean }, signal: AbortSignal): Promise<ProgramMedia>;
  read(id: string, signal: AbortSignal): Promise<Blob>;
  /** Explicitly discard a newly staged upload. Live published attachments stay protected. */
  discard?(id: string, signal: AbortSignal): Promise<boolean>;
};
