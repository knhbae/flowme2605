import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgramData, createProgramEnvelope } from '../program-data';
import { captureAlphaAccount, commandFromProgramTransition } from '../alpha-persistence/program-adapter';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { preservesAlphaPrivateSources } from '../alpha-server/private-boundary';
import { dispatchAlphaCreatorCommand } from '../alpha-creator/dispatch-source';
import { ALPHA_CREATOR_COMMAND_SCHEMA } from '../alpha-creator/contract';
import { setProgramDocumentFolder } from '../private-space';
import { publishProgramFlow } from '../publication';
import { createProgramPost } from '../community';
import { newProgramParticipationDraft } from '../participation-editor';
import { programClone, type ProgramData, type ProgramTransition } from '../contract';
import { ALPHA_SOCIAL_COMMAND_SCHEMA, isAlphaSocialCommand, isAlphaSocialIntent, type AlphaSocialIntent } from './contract';
import { executeAlphaSocialIntent, alphaSocialAllowedFields } from './dispatch';
const now='2026-09-21T12:00:00.000Z';
function ok<T>(v:ProgramTransition<T>){if(!v.ok)throw Error(v.reason);assert.equal(v.ok,true);return v;}
function fixture(){let data=createProgramData();const actorId=data.activeActorId;const pub=ok(publishProgramFlow(data,{actorId,requestId:'fixture',title:'Source',summary:'',category:'test',situations:[],source:{kind:'user-text',label:'Own',url:null,checkedAt:null},items:[{id:'item-one',title:'Task',description:'Source description',completionCriteria:'done',sourceUrl:null,schedule:{kind:'relative',days:1},subchecks:[]}]},now));data=pub.data;return {data,actorId,versionId:pub.result,flowId:data.public.flows[0].id};}
const run=(data:ProgramData,intent:AlphaSocialIntent,id='request')=>executeAlphaSocialIntent(data,data.activeActorId,intent,id,now);
test('social wire rejects aggregate owner timestamp and unknown properties',()=>{
 const intent={type:'reaction-set',targetKind:'post',targetId:'post',desired:true};
 const command={schema:ALPHA_SOCIAL_COMMAND_SCHEMA,kind:'social',requestId:'req',expectedRevision:0,expectedPublicRevision:0,intent};
 assert(isAlphaSocialCommand(command));for(const extra of [{ownerId:'other'},{changes:[]},{now}])assert(!isAlphaSocialCommand({...command,...extra}));
 assert(!isAlphaSocialIntent({...intent,actorId:'other'}));assert(!isAlphaSocialIntent({...intent,now}));assert(!isAlphaSocialCommand({...command,expectedPublicRevision:-1}));
});
test('public import changes only owner copy fields and preserves shared source',()=>{
 const f=fixture(),before=programClone(f.data);const r=ok(run(f.data,{type:'copy-import',versionId:f.versionId,itemIds:['item-one'],anchor:'2026-09-21'}));
 assert.equal(r.data.spaces[f.actorId].copies.length,1);assert.deepEqual(r.data.public,before.public);assert.deepEqual(r.data.spaces['creator-minji'],before.spaces['creator-minji']);assert.deepEqual(f.data,before);
});
test('copy anchor and inclusion preserve public revisions',()=>{
 const f=fixture();let r=ok(run(f.data,{type:'copy-import',versionId:f.versionId,itemIds:['item-one'],anchor:'2026-09-21'}));const copyId=r.result;
 r=ok(run(r.data,{type:'copy-anchor',copyId,anchor:'2026-09-23'},'anchor'));r=ok(run(r.data,{type:'copy-inclusion',copyId,itemId:'item-one',included:false},'exclude'));
 assert.equal(r.data.spaces[f.actorId].copies[0].anchor,'2026-09-23');assert.deepEqual(r.data.spaces[f.actorId].copies[0].includedItemIds,[]);assert.deepEqual(r.data.public,f.data.public);
});
test('foreign actor cannot execute against active owner context',()=>{const f=fixture();const r=executeAlphaSocialIntent(f.data,'creator-minji',{type:'copy-import',versionId:f.versionId,itemIds:['item-one'],anchor:null},'x',now);assert(!r.ok&&r.reason==='forbidden');assert.equal(r.data,f.data);});
test('copy proposal derives immutable item context and never sends private task text',()=>{
 const f=fixture(),imported=ok(run(f.data,{type:'copy-import',versionId:f.versionId,itemIds:['item-one'],anchor:null}));
 const r=ok(run(imported.data,{type:'proposal-create',copyId:imported.result,flowId:f.flowId,baseVersionId:f.versionId,itemId:'item-one',reason:'Clarify',patch:{description:'Suggested'}},'proposal'));
 assert.equal(r.data.public.proposals[0].patch.description,'Suggested');assert.deepEqual(r.data.spaces,imported.data.spaces);assert.deepEqual(r.data.public.versions,f.data.public.versions);
});
test('community draft submit atomically removes only matching private draft',()=>{
 const f=fixture();const draft={...newProgramParticipationDraft(),title:'Question',body:'How?',topic:'Test'};
 const saved=ok(run(f.data,{type:'participation-save',draft,expected:null},'draft'));
 const r=ok(run(saved.data,{type:'participation-submit',draft,expected:draft},'submit'));
 assert.equal(r.data.public.posts.length,1);assert.equal(r.data.spaces[f.actorId].participationDrafts.length,0);assert.equal(r.data.public.posts[0].createdAt,now);
});
test('failed stale community draft submit preserves input and public rows',()=>{
 const f=fixture();const draft={...newProgramParticipationDraft(),title:'Question',body:'How?',topic:'Test'};const saved=ok(run(f.data,{type:'participation-save',draft,expected:null}));
 const r=run(saved.data,{type:'participation-submit',draft,expected:null},'submit');assert(!r.ok&&r.reason==='conflict');assert.deepEqual(r.data,saved.data);
});
test('reaction desired state does not toggle twice on retry',()=>{
 const f=fixture(),post=ok(createProgramPost(f.data,{actorId:f.actorId,requestId:'post',kind:'question',title:'Q',body:'Body',topic:''},now));
 const intent:AlphaSocialIntent={type:'reaction-set',targetKind:'post',targetId:post.result,desired:true};const one=ok(run(post.data,intent));const two=ok(run(one.data,intent));assert.equal(two.changed,false);assert.equal(two.data.public.reactions.length,1);
 const off=ok(run(two.data,{...intent,desired:false},'off'));assert.equal(off.data.public.reactions.length,0);
});
test('foreign post deletion is denied; own deletion retains tombstone',()=>{
 const f=fixture(),post=ok(createProgramPost(f.data,{actorId:'creator-minji',requestId:'post',kind:'question',title:'Q',body:'Body',topic:''},now));
 const denied=run(post.data,{type:'post-delete',postId:post.result});assert(!denied.ok&&denied.reason==='forbidden');
 const own={...post.data,activeActorId:'creator-minji'};const removed=ok(run(own,{type:'post-delete',postId:post.result}));assert.equal(removed.data.public.posts[0].deleted,true);assert.equal(removed.data.public.posts[0].body,'');
});
test('strict draft shape cannot smuggle private aggregate into submission',()=>{const f=fixture();const draft={...newProgramParticipationDraft(),title:'Q',body:'B',spaces:f.data.spaces};assert(!isAlphaSocialIntent({type:'participation-submit',draft,expected:null}));});
test('reaction removal on a missing target is rejected, not a false success',()=>{const f=fixture();const r=run(f.data,{type:'reaction-set',targetKind:'post',targetId:'missing',desired:false});assert(!r.ok&&r.reason==='missing');});
test('public review allowlist never grants other private fields',()=>{assert.deepEqual(alphaSocialAllowedFields({type:'review-submit',proposalId:'p',expectedVersionId:'v',decision:'accept',draft:{note:'',expectedProposalToken:'x'}}),{private:['proposalReviewDrafts'],public:['proposals','flows','versions']});});
test('M3 and M4 continue validating an account containing M5 public copy references',()=>{
 const f=fixture(),copied=ok(run(f.data,{type:'copy-import',versionId:f.versionId,itemIds:['item-one'],anchor:null}));
 const {account,references}=captureAlphaAccount(createProgramEnvelope(copied.data),f.actorId,f.actorId);
 assert.equal(Boolean(isAccountForOwner(account,f.actorId,references)),true);assert.equal(Boolean(isAccountForOwner(account,f.actorId)),false);
 assert(preservesAlphaPrivateSources(account,programClone(account),references));
 const copy=account.space.copies[0];const command=commandFromProgramTransition(account,references,'folder',data=>setProgramDocumentFolder(data,{actorId:f.actorId,requestId:'folder',expectedSpace:data.spaces[f.actorId],documentId:copy.documentId,folderId:'folder-unfiled'}));
 assert.equal(command.kind,'change-private');
 const creator=dispatchAlphaCreatorCommand(account,{schema:ALPHA_CREATOR_COMMAND_SCHEMA,kind:'creator',requestId:'creator-noop',expectedRevision:account.revision,intent:{type:'working',working:null,now}},references);
 assert.equal(creator.ok,true);
});
