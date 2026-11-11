import { readAlphaBuildId } from '@/lib/flow/integrated-poc/alpha-server/build-id';
import { isAlphaHostedTrialReady } from '@/lib/flow/integrated-poc/alpha-server/render-readiness';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// W-VER-01 (11/11): the build this server runs, for a screen to compare with its own (no body, no account read).
export function GET(): Response {
  const build = readAlphaBuildId();
  return new Response(null, { status: isAlphaHostedTrialReady(process.env) ? 200 : 503,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(build ? { 'X-FlowMe-Build': build } : {}) } });
}
