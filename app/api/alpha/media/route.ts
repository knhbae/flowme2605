import { createAlphaMediaHandler } from '@/lib/flow/integrated-poc/alpha-server/media-handler';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request): Promise<Response> { return createAlphaMediaHandler(process.env)(request); }
export async function POST(request: Request): Promise<Response> { return createAlphaMediaHandler(process.env)(request); }
export async function DELETE(request: Request): Promise<Response> { return createAlphaMediaHandler(process.env)(request); }
