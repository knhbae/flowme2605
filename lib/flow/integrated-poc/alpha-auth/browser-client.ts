import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ALPHA_AUTH_STORAGE_KEY, alphaAuthStorage, isAlphaBrowserOrigin, type AlphaAuthConfig } from './config';

let singleton: { signature: string; client: SupabaseClient } | null = null;
/** Browser-only auth singleton. Contains no account response/draft cache. Server never calls it. */
export function getAlphaBrowserClient(config: AlphaAuthConfig): SupabaseClient {
  if (typeof window === 'undefined' || !isAlphaBrowserOrigin(config, window.location.origin)) throw Error('alpha-environment-blocked');
  const signature = JSON.stringify(config);
  if (singleton && singleton.signature !== signature) throw Error('alpha-environment-changed');
  if (!singleton) {
    const client = createClient(config.url, config.publishableKey, { auth: {
      flowType: 'pkce', autoRefreshToken: true, persistSession: true, detectSessionInUrl: false,
      storageKey: ALPHA_AUTH_STORAGE_KEY, storage: alphaAuthStorage(window.localStorage), debug: false,
    } });
    singleton = { signature, client };
  }
  return singleton.client;
}
