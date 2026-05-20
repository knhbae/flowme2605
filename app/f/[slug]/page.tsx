import { PublicFlow } from '@/components/flow/AppClient'; export default async function P({params}:{params:Promise<{slug:string}>}){const {slug}=await params; return <PublicFlow slug={slug}/>}
