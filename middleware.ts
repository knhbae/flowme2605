import { NextResponse, type NextRequest } from 'next/server';
import { alphaHomeLocation, alphaRouteDecision } from '@/lib/flow/integrated-poc/alpha-route-guard';

const notFound = () => new NextResponse('Not Found', { status: 404,
  headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

// R4h: the public tunnel sends every path on the Alpha host here. Legacy pages and the
// unauthenticated /api/content-flow-review writer stay in the build but answer 404;
// only the old local PoC at /my stays open (alpha-route-guard.ts).
export function middleware(request: NextRequest): NextResponse {
  const decision = alphaRouteDecision(request.nextUrl.pathname);
  if (decision === 'allow') return NextResponse.next();
  if (decision === 'block') return notFound();
  // 307, not 308: the root may get its own page later, and a permanent redirect would stay cached.
  // The adapter rejects a relative Location, and nextUrl carries the listen address, not the public host.
  const location = alphaHomeLocation(request.headers.get('host'), request.headers.get('x-forwarded-proto'), request.nextUrl.protocol);
  if (!location) return notFound();
  const response = NextResponse.redirect(location, 307);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
