export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Deliberately unavailable: this deployment contains no background backup jobs. */
export function POST(): Response {
  return Response.json({ ok: false, reason: 'unavailable' }, { status: 503,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Authorization' } });
}
