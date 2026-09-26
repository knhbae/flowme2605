import type { ProgramData } from '../contract';
import type { AlphaAccount, AlphaReferenceContext } from '../alpha-persistence/contract';
import type { AlphaCreatorCommand, AlphaCreatorIntent } from './contract';
import { buildCatalogLibrarySnapshot } from '../catalog-library-source';
import { dispatchAlphaCreatorCommand as dispatch, executeAlphaCreatorIntent as execute } from './dispatch';

export { previewAlphaCreatorSavedRestore } from './dispatch';
const catalog = { library: buildCatalogLibrarySnapshot };
export const executeAlphaCreatorIntent = (data: ProgramData, actorId: string, intent: AlphaCreatorIntent, requestId: string) =>
  execute(data, actorId, intent, requestId, catalog);
export const dispatchAlphaCreatorCommand = (account: AlphaAccount, command: AlphaCreatorCommand, references?: AlphaReferenceContext) =>
  dispatch(account, command, references, catalog);
