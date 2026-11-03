import { createAlphaPreservationHandler } from '@/lib/flow/integrated-poc/alpha-server/preservation-handler';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) { return createAlphaPreservationHandler(process.env)(request); }
