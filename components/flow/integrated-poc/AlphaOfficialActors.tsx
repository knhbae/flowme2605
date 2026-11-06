'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AlphaAuthConfig } from '@/lib/flow/integrated-poc/alpha-auth/config';
import type { VerifiedAlphaSession } from '@/lib/flow/integrated-poc/alpha-auth/account-access';
import { createAlphaOfficialActorsReader } from '@/lib/flow/integrated-poc/alpha-official-actors';

const empty: readonly string[] = Object.freeze([]);
const OfficialActors = createContext<readonly string[]>(empty);

/** Always mounted around the existing authenticated shell: a login change must
 * not remount the writing host or retire another owner's unsaved input. */
export function AlphaOfficialActorsProvider({ config, session, request = fetch, children }: {
  config: AlphaAuthConfig | null; session: VerifiedAlphaSession | null; request?: typeof fetch; children: React.ReactNode;
}) {
  // Token refresh alone keeps the first read for this login/configuration.
  const reader = useMemo(() => config && session ? createAlphaOfficialActorsReader(config, session, request) : null,
    [config?.stage, config?.url, config?.publishableKey, config?.redirectUrl, config?.hosting,
      config?.tunnelOrigin, config?.capacity, session?.userId, request]);
  const [result, setResult] = useState<{ reader: typeof reader; actors: readonly string[] } | null>(null);
  useEffect(() => {
    let current = true;
    if (reader) void reader.read().then(actors => { if (current) setResult({ reader, actors }); });
    return () => { current = false; };
  }, [reader]);
  // A changed account/configuration gets no mark even before its effect runs.
  const actors = reader && result?.reader === reader ? result.actors : empty;
  return <OfficialActors.Provider value={actors}>{children}</OfficialActors.Provider>;
}

export function useAlphaOfficialActors() { return useContext(OfficialActors); }
