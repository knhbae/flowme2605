import { createAlphaCatalogHandler } from '@/lib/flow/integrated-poc/alpha-server/catalog-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request): Promise<Response> {
  return createAlphaCatalogHandler(process.env)(request);
}
