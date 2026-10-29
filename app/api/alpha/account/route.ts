import { createAlphaWritingRoute } from '@/lib/flow/integrated-poc/alpha-server/writing-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request): Promise<Response> {
  return createAlphaWritingRoute(process.env)(request);
}
