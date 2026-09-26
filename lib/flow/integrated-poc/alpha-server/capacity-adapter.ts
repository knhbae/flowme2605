import type { AlphaPrivateCommand } from '../alpha-persistence/contract';
import { canonicalJson } from '../alpha-persistence/json';
import { SEALED_BACKUP_SCHEMA } from '../alpha-preservation/contract';
import { createAlphaMediaHandler } from './media-handler';
import { signAlphaCommand } from './command-proof';
import { executeCapacityM3, readCapacityM3Response } from './capacity-m3';
import { alphaInternalMediaRequest } from './request-origin';
import type { AlphaServerCall } from './social-context';

/** Explicit coordinated rollout only. A missing RPC/error NEVER falls back to
 * the unguarded writer. No environment file or remote setting is changed here. */
export function alphaCapacityMode(env: Record<string, string | undefined>): 'legacy' | 'checkpoint-v1' | null {
  const value = env.FLOWME_ALPHA_M3_CAPACITY;
  return value === undefined ? 'legacy' : value === 'checkpoint-v1' ? value : null;
}

/** Called only AFTER the existing command handler authenticates and validates
 * the complete candidate account/domain/private ownership against its revision. */
export async function executeAlphaCapacityCommand(input: {
  owner: string; command: AlphaPrivateCommand; origin: string; authorization: string; key: string;
  env: Record<string, string | undefined>; fetcher: typeof fetch; call: AlphaServerCall;
}) {
  const { owner, command, origin, authorization, key, env, fetcher, call } = input;
  const media = createAlphaMediaHandler(env, fetcher);
  return executeCapacityM3({ ownerId: owner, command, createdAt: new Date().toISOString() }, {
    rpc: async request => {
      // The derived checkpoint envelope can exceed the command's 30 MB cap.
      // SQL bounds it separately; canonicalJson would silently shrink that cap.
      const text = JSON.stringify(request);
      const response = await call('/rest/v1/rpc/flowme_alpha_capacity_m3_v1', { request_text: text, proof: signAlphaCommand(owner, text, key) });
      if (!response.ok) return { ok: false, reason: response.status === 401 || response.status === 403 ? 'unauthenticated' : 'unavailable' };
      return readCapacityM3Response(response);
    },
    resolveMedia: async id => {
      const response = await media(alphaInternalMediaRequest(origin, id, authorization, env.FLOWME_ALPHA_HOSTING === 'render-trial-v1'));
      if (!response.ok) throw Error('capacity-media-unavailable');
      return { mime: response.headers.get('content-type') ?? '', bytes: new Uint8Array(await response.arrayBuffer()) };
    },
    sealDigest: async (ownerId, digest) => signAlphaCommand(ownerId, canonicalJson({ schema: SEALED_BACKUP_SCHEMA, ownerId, digest }), key),
  });
}
