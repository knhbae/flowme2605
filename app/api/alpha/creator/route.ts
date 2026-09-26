import { createAlphaCreatorCommandHandler } from '@/lib/flow/integrated-poc/alpha-server/creator-command-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request): Promise<Response> {
  return createAlphaCreatorCommandHandler(process.env)(request);
}
