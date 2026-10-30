import { createAlphaCommandHandler } from '@/lib/flow/integrated-poc/alpha-server/command-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request): Promise<Response> {
  return createAlphaCommandHandler(process.env)(request);
}
