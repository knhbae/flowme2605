import { NextResponse, type NextRequest } from 'next/server';
import { alphaRouteDecision } from '@/lib/flow/integrated-poc/alpha-route-guard';

// R4h: the public tunnel sends every path on the Alpha host here. Legacy pages and the
// unauthenticated /api/content-flow-review writer stay in the build but answer 404.
export function middleware(request: NextRequest): NextResponse {
  const decision = alphaRouteDecision(request.nextUrl.pathname);
  if (decision === 'allow') return NextResponse.next();
  // 307, not 308: the root may get its own page later, and a permanent redirect would stay cached.
  // A relative Location avoids building an absolute URL from a proxied host.
  if (decision === 'home') return new NextResponse(null, { status: 307, headers: { Location: '/alpha', 'Cache-Control': 'no-store' } });
  return new NextResponse('Not Found', { status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
