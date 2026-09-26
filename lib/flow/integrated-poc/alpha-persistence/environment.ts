import { programShape } from '../program-data';

export const ALPHA_ENVIRONMENT_POLICY = Object.freeze({ version: 2,
  developmentProject: 'wkmzcxpnojobxrgebapw', productionProjects: ['ldellkztijrijbpwthjl'] as readonly string[],
  redirectOrigins: ['http://localhost:3000', 'http://localhost:3104'] as readonly string[],
  renderTrialHosting: 'render-trial-v1',
});
const ENVIRONMENT_FIELDS = ['stage', 'projectRef', 'databaseUrl', 'authUrl', 'storageUrl', 'redirectUrl'];
function isRenderTrialOrigin(origin: string): boolean {
  const match = /^https:\/\/([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.onrender\.com$/.exec(origin);
  return !!match && match[1].length <= 63;
}
/** Pure preflight only. M1 does not construct a network client or perform migrations. */
export function validateAlphaDevelopmentEnvironment(value: unknown): boolean {
  try {
    if ((!programShape(value, ENVIRONMENT_FIELDS) && !programShape(value, [...ENVIRONMENT_FIELDS, 'hosting']))
      || !['development', 'test', 'preview'].includes(value.stage as string)
      || ALPHA_ENVIRONMENT_POLICY.productionProjects.includes(value.projectRef as string)
      || value.projectRef !== ALPHA_ENVIRONMENT_POLICY.developmentProject) return false;
    const hosted = Object.hasOwn(value, 'hosting');
    if (hosted && (value.hosting !== ALPHA_ENVIRONMENT_POLICY.renderTrialHosting || value.stage !== 'preview')) return false;
    const expected = `https://${ALPHA_ENVIRONMENT_POLICY.developmentProject}.supabase.co`;
    for (const field of ['databaseUrl', 'authUrl', 'storageUrl']) {
      if (value[field] !== expected) return false;
    }
    if (typeof value.redirectUrl !== 'string') return false;
    const redirect = new URL(value.redirectUrl);
    return !redirect.username && !redirect.password && !redirect.hash && !redirect.search
      && value.redirectUrl === `${redirect.origin}/auth/callback`
      && (hosted ? isRenderTrialOrigin(redirect.origin) : ALPHA_ENVIRONMENT_POLICY.redirectOrigins.includes(redirect.origin));
  } catch { return false; }
}
