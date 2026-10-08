import assert from 'node:assert/strict';
import test from 'node:test';
import {createEmptyTextWorkspace,textWorkspaceModel as M} from './text-workspace';
import {programFolderAfterDocumentOpen} from './folder-document-regions';
test('document opening preserves applicable and explicit same-document scope, not an empty inherited scope',()=>{
  let state=M.addDocument(createEmptyTextWorkspace(),{title:'업무'});const first=state.documents[0].id;
  state=M.editText(state,first,'- [ ] 업무 확인');
  state=M.addDocument(state,{title:'생활'});const second=state.documents[1].id;
  state=M.editText(state,second,'- [ ] 생활 확인');
  state={...state,folders:[...state.folders,{id:'work',title:'업무',parentId:null}]};
  const task=M.tasks(state).find(t=>t.docId===first)!;
  state={...state,itemScopes:{...state.itemScopes,[task.id]:'work'},taskScopes:{...state.taskScopes,[task.id]:'work'}};
  const before=JSON.stringify(state);
  assert.equal(programFolderAfterDocumentOpen(state,first,second,'work'),'');
  assert.equal(programFolderAfterDocumentOpen(state,second,first,'work'),'work');
  assert.equal(programFolderAfterDocumentOpen(state,second,second,'work'),'work');
  assert.equal(programFolderAfterDocumentOpen(state,first,second,''),'');
  assert.equal(JSON.stringify(state),before);
});
