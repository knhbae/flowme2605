import { isAlphaAuthConfig, type AlphaAuthConfig } from './alpha-auth/config';
import type { VerifiedAlphaSession } from './alpha-auth/account-access';
import { programIdentifier, programShape } from './program-data';

export const ALPHA_OFFICIAL_ACTORS_RPC = 'flowme_alpha_official_actors_v1';
const noOfficialActors: readonly string[] = Object.freeze([]);
const publicAlias = /^member-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Separate optional metadata: never add keys to a social/account response. */
export function readAlphaOfficialActors(value: unknown): readonly string[] | null {
  if (!programShape(value, ['ok', 'value']) || value.ok !== true || !Array.isArray(value.value)
    || value.value.some(alias => typeof alias !== 'string' || !publicAlias.test(alias))
    || new Set(value.value).size !== value.value.length) return null;
  return Object.freeze([...value.value]);
}

/** Own one instance per mounted login session. Success and failure are both cached
 * in memory; token refresh, navigation and polling do not issue another request. */
export function createAlphaOfficialActorsReader(inputConfig: AlphaAuthConfig, inputSession: VerifiedAlphaSession,
  request: typeof fetch = fetch) {
  const config = { ...inputConfig }, session = { ...inputSession };
  let reading: Promise<readonly string[]> | undefined;
  async function load(): Promise<readonly string[]> {
    if (!isAlphaAuthConfig(config) || !session.accessToken || !programIdentifier(session.userId)) return noOfficialActors;
    try {
      const response = await request(`${config.url}/rest/v1/rpc/${ALPHA_OFFICIAL_ACTORS_RPC}`, {
        method: 'POST', headers: { apikey: config.publishableKey, Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json' }, body: '{}', cache: 'no-store', redirect: 'error',
        credentials: 'omit', signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) return noOfficialActors;
      return readAlphaOfficialActors(await response.json()) ?? noOfficialActors;
    } catch { return noOfficialActors; }
  }
  return { read: () => reading ??= load() };
}

/** Text, source attribution, display names and derivedFrom never grant a mark. */
export function programFlowAttributionLabel(flow: { id: string; ownerId: string },
  version: { flowId: string; createdBy: string; source: { kind: string } }, officialActors: readonly string[] = []) {
  if (version.flowId === flow.id && officialActors.includes(flow.ownerId) && officialActors.includes(version.createdBy))
    return 'FlowMe가 정리한 자료';
  return version.source.kind === 'repository-source' ? '기존 출처 자료'
    : version.source.kind === 'user-text' ? '사용자가 정리한 자료' : null;
}
