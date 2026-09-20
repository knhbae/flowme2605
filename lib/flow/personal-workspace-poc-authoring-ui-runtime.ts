// K3-A browser entry. Only existing pure planners and display/UI state are
// exported; editor identity, native editing and every writer stay in adapters.
export * from './personal-workspace-poc-authoring-chooser';
export { buildPersonalWorkspacePocEditorLineGuides } from './personal-workspace-poc-editor-guidance';
export { buildPersonalWorkspacePocLiveEditorPresentation } from './personal-workspace-poc-editor-presentation';
export { fingerprintPersonalWorkspacePocAuthoringSource } from './personal-workspace-poc-authoring';
export {
  resolvePersonalWorkspacePocAuthoringGuideTarget,
  getPersonalWorkspacePocAuthoringMenuAction,
} from './personal-workspace-poc-authoring-guide';
export {
  createPersonalWorkspacePocSourceEditorTicket,
  planPersonalWorkspacePocHelperTransaction,
} from './personal-workspace-poc-source-editor';
