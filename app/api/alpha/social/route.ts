import { createAlphaSocialCommandHandler } from '@/lib/flow/integrated-poc/alpha-server/social-command-handler';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request):Promise<Response>{return createAlphaSocialCommandHandler(process.env)(request);}
