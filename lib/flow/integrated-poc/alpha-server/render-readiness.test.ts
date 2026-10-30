import assert from 'node:assert/strict';
import test from 'node:test';
import { isAlphaRenderTrialReady } from './render-readiness';

const env = {
  FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'preview',
  FLOWME_ALPHA_HOSTING: 'render-trial-v1', FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw',
  FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co',
  FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  FLOWME_ALPHA_REDIRECT_URL: 'https://flowme-trial-1.onrender.com/auth/callback',
  FLOWME_ALPHA_M3_SIGNING_KEY: 'a'.repeat(64), FLOWME_ALPHA_M3_CAPACITY: 'on-demand-v1',
};

test('Render readiness requires an exact development trial configuration', () => {
  assert.equal(isAlphaRenderTrialReady(env), true);
  for (const overrides of [
    { FLOWME_ALPHA_ENABLED: 'production' }, { FLOWME_ALPHA_STAGE: 'development' },
    { FLOWME_ALPHA_HOSTING: undefined }, { FLOWME_ALPHA_HOSTING: 'render-production' },
    { FLOWME_ALPHA_PROJECT_REF: 'ldellkztijrijbpwthjl' },
    { FLOWME_ALPHA_REDIRECT_URL: 'https://elsewhere.example/auth/callback' },
    { FLOWME_ALPHA_M3_SIGNING_KEY: undefined }, { FLOWME_ALPHA_M3_SIGNING_KEY: 'weak' },
    { FLOWME_ALPHA_M3_CAPACITY: undefined }, { FLOWME_ALPHA_M3_CAPACITY: 'unknown' },
    { FLOWME_ALPHA_M3_CAPACITY: 'checkpoint-v1' }, { FLOWME_ALPHA_M3_CAPACITY: 'legacy' },
    { VERCEL_ENV: 'production' },
  ]) assert.equal(isAlphaRenderTrialReady({ ...env, ...overrides }), false);
});
