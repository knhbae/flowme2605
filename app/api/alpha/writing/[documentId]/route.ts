import {createAlphaAppWritingRoute} from '@/lib/flow/integrated-poc/alpha-server/app-writing-route';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request,context:{params:Promise<{documentId:string}>}):Promise<Response>{
 const {documentId}=await context.params;
 return createAlphaAppWritingRoute(process.env)(request,documentId);
}
