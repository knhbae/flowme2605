import { isAlphaRenderTrialReady } from '@/lib/flow/integrated-poc/alpha-server/render-readiness';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return new Response(null, { status: isAlphaRenderTrialReady(process.env) ? 200 : 503,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
