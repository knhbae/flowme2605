/** Existing shell's working-document projection; not another input model. */
type WorkingDocumentProjection={readonly archivedDocumentIds:readonly string[];readonly retentionDocuments?:Readonly<Record<string,string>>;readonly documentTrash?:Readonly<Record<string,unknown>>;readonly text:{readonly documents:Readonly<Record<string,{readonly title:string}>>;readonly documentOrder?:readonly string[]}};
export function alphaWritingDocuments(space:WorkingDocumentProjection){
 const retained=new Set(Object.values(space.retentionDocuments??{}));
 const entries=space.text.documentOrder?space.text.documentOrder.map(id=>[id,space.text.documents[id]] as const):Object.entries(space.text.documents);
 return entries.filter(([id])=>!space.archivedDocumentIds.includes(id)&&!space.documentTrash?.[id]&&!retained.has(id)).map(([id,doc])=>({id,title:doc.title}));
}
