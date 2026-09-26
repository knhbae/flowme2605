import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareLocalImport, inspectLocalImportActors } from './import';
import { createAlphaSyntheticFixtures } from '../alpha-persistence/synthetic-fixtures';
import { captureAlphaAccount, validateAlphaAccount } from '../alpha-persistence/program-adapter';
import { createProgramData, createProgramEnvelope, createProgramPrivateSpace } from '../program-data';
import { canonicalJson, sha256 } from '../alpha-persistence/json';
import { createAlphaBackup } from '../alpha-persistence/backup';
import type { AlphaAccount, AlphaReferenceContext } from '../alpha-persistence/contract';
import { shareProgramUndo } from '../program-undo-codec';
import { transitionCreatorNativeSourceSession, readCreatorNativeSourceSession } from '../creator-native-source-update';

function destination() {
  const owner = 'account-a';
  const account: AlphaAccount = { schema: 'flowme-alpha-account/1', ownerId: owner, revision: 42,
    source: { schema: 'flowme-integrated-product-poc/1', actorId: owner, revision: 0 }, space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const references: AlphaReferenceContext = { actorIds: [owner], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
  assert(validateAlphaAccount(account, references)); return { account, references };
}

for (const fixture of createAlphaSyntheticFixtures()) test(`selected import: ${fixture.name}`, async () => {
  const { account, references } = destination(), original = canonicalJson(fixture.envelope), targetRaw = canonicalJson(account);
  const result = await prepareLocalImport(original, fixture.actorId, account, references);
  assert.equal(canonicalJson(account), targetRaw); assert.equal(canonicalJson(fixture.envelope), original);
  if (fixture.name === 'public-versions-copy-community-photo') {
    assert(!result.ok); assert.equal(result.reason, 'unmapped-reference'); return;
  }
  assert(result.ok, JSON.stringify(result)); assert(validateAlphaAccount(result.account, references));
  assert.equal(result.account.ownerId, account.ownerId); assert.equal(result.account.revision, 42);
  assert.deepEqual(result.account.source, account.source); assert.deepEqual(result.account.legacyUndo, []); assert.deepEqual(result.account.legacyReceipts, []);
  const archived = JSON.parse(result.archive.sourceRaw);
  assert.deepEqual(archived.data.spaces[fixture.actorId], fixture.envelope.data.spaces[fixture.actorId]);
  assert.deepEqual(archived.undo[fixture.actorId], fixture.envelope.undo[fixture.actorId]);
  assert.equal(result.sourceSha256, await sha256(new TextEncoder().encode(result.archive.sourceRaw)));
  const server = await prepareLocalImport(result.archive.sourceRaw, fixture.actorId, account, references);
  assert(server.ok); assert.deepEqual(server, result);
  const again = await prepareLocalImport(result.archive.sourceRaw, fixture.actorId, result.account, references);
  assert(again.ok); assert(again.warnings.includes('already-applied'));
});

test('foreign private spaces and history never enter selected archive', async () => {
  const fixture = createAlphaSyntheticFixtures()[0], foreign = fixture.envelope.data.actors.find(a => a.id !== fixture.actorId)!.id;
  fixture.envelope.data.spaces[foreign] = structuredClone(fixture.envelope.data.spaces[fixture.actorId]);
  fixture.envelope.data.spaces[foreign].text.documents[0].title = 'FOREIGN-PRIVATE-SECRET';
  fixture.envelope.undo[foreign] = [{ label: 'FOREIGN-HISTORY-SECRET', groupId: null, workspace: structuredClone(fixture.envelope.data.spaces[foreign]) }];
  const { account, references } = destination();
  const result = await prepareLocalImport(canonicalJson(fixture.envelope), fixture.actorId, account, references);
  assert(result.ok); assert(!result.archive.sourceRaw.includes('FOREIGN-PRIVATE-SECRET')); assert(!result.archive.sourceRaw.includes('FOREIGN-HISTORY-SECRET'));
});

test('M1 backup owner is validated as source, not silently reassigned to destination', async () => {
  const fixture = createAlphaSyntheticFixtures()[0], source = captureAlphaAccount(fixture.envelope, fixture.actorId, 'old-local-owner');
  const backup = await createAlphaBackup(source.account, source.references), { account, references } = destination();
  const result = await prepareLocalImport(canonicalJson(backup), fixture.actorId, account, references);
  assert(result.ok); assert.equal(result.account.ownerId, 'account-a');
  assert.equal(result.archive.sourceRaw, canonicalJson(backup));
  const replay = await prepareLocalImport(result.archive.sourceRaw, fixture.actorId, account, references); assert(replay.ok); assert.deepEqual(replay, result);
  assert(!(await prepareLocalImport(canonicalJson(backup), 'wrong-actor', account, references)).ok);
  backup.manifest.payloadSha256 = 'bad'; assert(!(await prepareLocalImport(canonicalJson(backup), fixture.actorId, account, references)).ok);
});

test('program-store shared Undo decoder and nonempty target fail-closed', async () => {
  const fixture = createAlphaSyntheticFixtures()[0], encoded = structuredClone(fixture.envelope);
  encoded.undo = shareProgramUndo(encoded.undo) as typeof encoded.undo;
  const { account, references } = destination();
  const first = await prepareLocalImport(canonicalJson(encoded), fixture.actorId, account, references); assert(first.ok);
  const another = createAlphaSyntheticFixtures()[1];
  const second = await prepareLocalImport(canonicalJson(another.envelope), another.actorId, first.account, references);
  assert(!second.ok); assert.equal(second.reason, 'destination-not-empty');
  assert(!(await prepareLocalImport('{broken', fixture.actorId, account, references)).ok);
  assert(!(await prepareLocalImport(canonicalJson(createProgramEnvelope(createProgramData())), 'not-a-user', account, references)).ok);
});

test('actor inspection validates source without exposing private content', async () => {
  const fixture = createAlphaSyntheticFixtures()[0];
  const result = await inspectLocalImportActors(canonicalJson(fixture.envelope));
  assert(result.ok); assert.deepEqual(result.actors, fixture.envelope.data.actors.map(({ id, name }) => ({ id, name })));
  assert(!(await inspectLocalImportActors('{broken')).ok);
});

test('eventful native session import preserves full source and permits only mapped account authority',async()=>{
 const fixture=createAlphaSyntheticFixtures().find(f=>f.name==='native-source-update-session')!;
 const workspace=fixture.envelope.data.spaces[fixture.actorId].creatorWorkspace!,entry=Object.values(workspace.sourceUpdateSessions!)[0],old=entry.session;
 const owner=workspace.working!.nativeDocument!,authority={actorId:fixture.actorId,draftId:old.draftId,lane:'creator' as const,permission:true,archived:false};
 const focus=transitionCreatorNativeSourceSession(old,owner,{expectedSession:old,authority,requestId:'m6-before-import-focus',event:{kind:'focus',selectedChangeId:null,scrollTop:123}},'2026-09-21T12:00:00.000Z');assert(focus.ok);
 entry.session=focus.value.session;const before=canonicalJson(fixture.envelope),{account,references}=destination();
 const imported=await prepareLocalImport(before,fixture.actorId,account,references);assert(imported.ok,JSON.stringify(imported));
 const mapped=Object.values(imported.account.space.creatorWorkspace!.sourceUpdateSessions!)[0].session;
 assert.equal(mapped.sessionId,entry.session.sessionId);assert.deepEqual(mapped.events,entry.session.events);assert.equal(mapped.actorId,fixture.actorId);
 assert(readCreatorNativeSourceSession(mapped,owner,{...authority,actorId:account.source.actorId}).ok);
 assert(!readCreatorNativeSourceSession(mapped,owner,authority).ok);
 const archived=JSON.parse(imported.archive.sourceRaw);assert.deepEqual(archived.data.spaces[fixture.actorId].creatorWorkspace.sourceUpdateSessions,workspace.sourceUpdateSessions);
 const replay=await prepareLocalImport(imported.archive.sourceRaw,fixture.actorId,imported.account,references);assert(replay.ok);assert(replay.warnings.includes('already-applied'));
 assert.equal(canonicalJson(fixture.envelope),before);
});
