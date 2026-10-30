import { readAlphaAuthConfig } from '../alpha-auth/config';
import { ALPHA_ENVIRONMENT_POLICY } from '../alpha-persistence/environment';

/** Configuration readiness only: no account, database, or storage request. */
export function isAlphaRenderTrialReady(env: Record<string, string | undefined>): boolean {
  const config = readAlphaAuthConfig(env);
  return config?.hosting === 'render-trial-v1'
    && config.stage === 'preview'
    && /^[a-f0-9]{64}$/.test(env.FLOWME_ALPHA_M3_SIGNING_KEY ?? '')
    && config.capacity === ALPHA_ENVIRONMENT_POLICY.renderTrialCapacity;
}
