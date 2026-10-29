import {ALPHA_REA_WRITING_PROFILE,isWritingSubmission,prepareWritingSubmission} from '../alpha-persistence/rea-writing-edit';
import {createAlphaCommandHandler,type AlphaWritingDocumentScope} from './command-handler';
import {ALPHA_REA_TEXT_EDIT_PROFILE} from '../alpha-persistence/rea-text-edit';
import {ALPHA_REA_PROGRESS_EDIT_PROFILE} from '../alpha-persistence/rea-progress-edit';
import {ALPHA_ORDERED_BODY_PROFILE} from '../alpha-persistence/ordered-text-edit';
import {ALPHA_MEMO_BODY_PROFILE} from '../alpha-persistence/memo-cohort';

/** Trusted construction-time choice only. Request bodies/headers/URL parameters
 * cannot enable a writer profile. The default app route remains legacy v11.
 * Local tests supply both a synthetic environment and a mock backend transport. */
export function createAlphaWritingRoute(
  env:Record<string,string|undefined>,
  backend:typeof fetch=fetch,
  options:{profile?:'v11'|typeof ALPHA_REA_TEXT_EDIT_PROFILE|typeof ALPHA_REA_PROGRESS_EDIT_PROFILE|typeof ALPHA_REA_WRITING_PROFILE|typeof ALPHA_ORDERED_BODY_PROFILE|typeof ALPHA_MEMO_BODY_PROFILE;documentScope?:AlphaWritingDocumentScope;memoDocumentScope?:AlphaWritingDocumentScope}={},
){
  if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>k!=='profile'&&k!=='documentScope'&&k!=='memoDocumentScope')
    ||options.profile!==undefined&&options.profile!=='v11'&&options.profile!==ALPHA_REA_TEXT_EDIT_PROFILE&&options.profile!==ALPHA_REA_PROGRESS_EDIT_PROFILE&&options.profile!==ALPHA_REA_WRITING_PROFILE&&options.profile!==ALPHA_ORDERED_BODY_PROFILE&&options.profile!==ALPHA_MEMO_BODY_PROFILE)
    return async(_request:Request)=>Response.json({ok:false,reason:'unavailable'},{status:503});
  return createAlphaCommandHandler(env,backend,{
    ...(options.profile!==undefined&&options.profile!=='v11'?{textProfile:options.profile}:{}),
    ...(Object.hasOwn(options,'documentScope')?{documentScope:options.documentScope}:{}),
    ...(Object.hasOwn(options,'memoDocumentScope')?{memoDocumentScope:options.memoDocumentScope}:{}),
  });
}
