import { Editor } from '@/components/flow/AppClient'; export default async function P({params}:{params:Promise<{id:string}>}){const {id}=await params; return <Editor id={id}/>}
