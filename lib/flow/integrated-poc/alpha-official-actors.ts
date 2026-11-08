import { isAlphaAuthConfig, type AlphaAuthConfig } from './alpha-auth/config';
import type { VerifiedAlphaSession } from './alpha-auth/account-access';
import { programIdentifier, programShape } from './program-data';
import type { ProgramData } from './contract';

export const ALPHA_OFFICIAL_ACTORS_RPC = 'flowme_alpha_official_actors_v1';
const noOfficialActors: readonly string[] = Object.freeze([]);
const publicAlias = /^member-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const projections = new WeakMap<ProgramData, Readonly<{ ownerId: string; publicActorId: string }>>();

/** The account presentation already maps the viewer's public alias to its
 * private owner ID. Keep that verified correspondence beside the exact view,
 * never in JSON, an account, public repository or browser storage. */
export function rememberAlphaPublicActorProjection(data: ProgramData, ownerId: string, publicActorId: unknown) {
  projections.delete(data);
  if (data.activeActorId === ownerId && typeof publicActorId === 'string' && publicAlias.test(publicActorId))
    projections.set(data, Object.freeze({ ownerId, publicActorId }));
  return data;
}

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
/** What an official Flow is called (the cards' and the detail's '공식' tag stand for it). */
export const PROGRAM_OFFICIAL_LABEL = 'FlowMe가 정리한 자료';
export function programFlowAttributionLabel(flow: { id: string; ownerId: string },
  version: { flowId: string; createdBy: string; source: { kind: string } }, officialActors: readonly string[] = [], view?: ProgramData) {
  const projection = view && projections.get(view);
  const aliasOf = (id: string) => projection && projection.ownerId === view?.activeActorId && id === projection.ownerId ? projection.publicActorId : id;
  if (version.flowId === flow.id && officialActors.includes(aliasOf(flow.ownerId)) && officialActors.includes(aliasOf(version.createdBy)))
    return PROGRAM_OFFICIAL_LABEL;
  return version.source.kind === 'repository-source' ? '기존 출처 자료'
    : version.source.kind === 'user-text' ? '사용자가 정리한 자료' : null;
}
