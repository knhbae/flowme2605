import { readAlphaAuthConfig } from '../alpha-auth/config';

/** Configuration readiness only: no account, database, or storage request. */
export function isAlphaRenderTrialReady(env: Record<string, string | undefined>): boolean {
  const config = readAlphaAuthConfig(env);
  return config?.hosting === 'render-trial-v1'
    && config.stage === 'preview'
    && /^[a-f0-9]{64}$/.test(env.FLOWME_ALPHA_M3_SIGNING_KEY ?? '')
    && config.capacity === 'checkpoint-v1';
}
