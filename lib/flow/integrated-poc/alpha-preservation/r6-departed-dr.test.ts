import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProgramPost } from '../contract';
import { createProgramData, createProgramEnvelope, validateProgramData } from '../program-data';
import { importProgramPublicVersion } from '../private-space';
import { captureAlphaAccount } from '../alpha-persistence/program-adapter';
import { canonicalJson, detached, sha256 } from '../alpha-persistence/json';
import { ALPHA_DEPARTED_ACTOR_NAME, isAlphaSocialContext } from '../alpha-social/projection';
import { SERVICE_DR_PROJECT, SERVICE_DR_TABLE_COLUMNS, createDisasterRecoveryBackup, disasterRecoverySchemaHash, validateDisasterRecoveryBackup, type ServiceDrInput, type ServiceDrRows } from './disaster-recovery';

// R6 (11/6, '남김'): public Flows, versions and posts outlive their author's account. A service DR package made after
// that deletion has public rows naming an alias with no identity row; the restore check must read them as every read
// does, and nothing more.
const OWNER = '11111111-1111-4111-8111-111111111111', OWNER_ALIAS = `member-${OWNER}`;
const GONE = 'member-22222222-2222-4222-8222-222222222222', NOW = '2026-11-06T00:00:00.000Z';
const MEDIA = 'media-33333333-3333-4333-8333-333333333333', bytes = new Uint8Array([82, 73, 70, 70, 1, 2, 3]);
const resolver = async () => ({ mime: 'image/webp', bytes });
const post = (id: string, authorId: string, flowId: string | null, title: string): ProgramPost => ({ id, authorId, kind: 'experience', title, body: '두 주 해 봤어요.', topic: '',
  flowId, versionId: flowId && `${flowId}-v1`, itemId: null, evidencePostIds: [], media: [], createdAt: NOW, updatedAt: NOW, deleted: false });

/** OWNER took a Flow of the departed author and reviewed it; the departed author posted too and reacted. */
async function seed(): Promise<ServiceDrInput> {
  let data = createProgramData();
  data.actors = [{ id: OWNER, name: '합성 소유자', simulated: true }, { id: GONE, name: '합성 작성자', simulated: true }];
  data.spaces = { [OWNER]: data.spaces['local-user'], [GONE]: data.spaces['creator-minji'] };
  data.activeActorId = OWNER;
  for (const id of ['flow-a', 'flow-b']) {
    data.public.flows.push({ id, ownerId: GONE, currentVersionId: `${id}-v1`, category: '생활', situations: [], derivedFrom: null, archived: false });
    data.public.versions.push({ id: `${id}-v1`, flowId: id, number: 1, parentVersionId: null, title: `지운 작성자의 Flow ${id}`, summary: '',
      source: { kind: 'user-text', label: '직접 작성한 내용', url: null, checkedAt: null }, createdBy: GONE, createdAt: NOW,
      items: [{ id: 'item', title: '할 일 하나', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }] });
  }
  data.public.posts.push(post('post-gone', GONE, 'flow-a', '작성자가 남긴 글'), post('post-mine', OWNER, 'flow-a', '해 봤어요 · 지운 작성자의 Flow'));
  data.public.reactions.push({ actorId: GONE, targetKind: 'post', targetId: 'post-mine' });
  const imported = importProgramPublicVersion(data, { actorId: OWNER, requestId: 'r6-import', expectedSpace: data.spaces[OWNER], versionId: 'flow-a-v1', itemIds: ['item'], anchor: null });
  assert(imported.ok); data = imported.data;
  assert(validateProgramData(data));
  const { account } = captureAlphaAccount(createProgramEnvelope(data), OWNER, OWNER);
  assert(account.space.copies.length === 1, 'the account holds a copy of the departed author\'s Flow');
  // The stored public rows name the owner by alias; the departed author's identity row is gone with the account.
  const repository = detached(data.public);
  for (const row of repository.posts) if (row.authorId === OWNER) row.authorId = OWNER_ALIAS;
  const tables = Object.fromEntries(Object.keys(SERVICE_DR_TABLE_COLUMNS).map(key => [key, []])) as unknown as ServiceDrRows;
  tables['public.flowme_alpha_accounts'] = [{ owner_id: OWNER, account }];
  tables['flowme_private.alpha_social_identities_v1'] = [{ owner_id: OWNER, public_actor_id: OWNER_ALIAS, display_name: '합성 소유자' }];
  tables['flowme_private.alpha_social_state_v1'] = [{ id: true, revision: 9, repository }];
  return { projectRef: SERVICE_DR_PROJECT, createdAt: NOW, schemaHash: await disasterRecoverySchemaHash(), tables, objectPaths: [] };
}
const repository = (input: ServiceDrInput) => input.tables['flowme_private.alpha_social_state_v1'][0].repository as ReturnType<typeof createProgramData>['public'];

test('R6 DR: a package made after an author\'s account is deleted passes, and is kept exactly as given', async () => {
  const input = await seed(), before = canonicalJson(input);
  const strict = { schema: 'flowme-alpha-social-context/1', revision: 9, ownActorId: OWNER_ALIAS, actors: [{ id: OWNER_ALIAS, name: '합성 소유자' }], public: repository(input) };
  assert.equal(isAlphaSocialContext(strict, { server: true }), false, 'the graph check alone refuses it (the failure before)');
  const backup = await createDisasterRecoveryBackup(input, resolver);
  assert.equal(canonicalJson(input), before, 'the input is not touched');
  assert.deepEqual(backup.tables['flowme_private.alpha_social_identities_v1'], input.tables['flowme_private.alpha_social_identities_v1'], 'no identity row is added');
  assert.deepEqual(backup.tables['flowme_private.alpha_social_state_v1'], input.tables['flowme_private.alpha_social_state_v1'], 'the public rows are kept as they are');
  assert.deepEqual(backup.tables['public.flowme_alpha_accounts'], input.tables['public.flowme_alpha_accounts']);
  assert(!canonicalJson(backup).includes(ALPHA_DEPARTED_ACTOR_NAME), 'no stand-in actor is written into the package');
  assert.deepEqual(await validateDisasterRecoveryBackup(canonicalJson(backup)), { ok: true, value: backup });
});

for (const kind of ['empty-id', 'malformed-id', 'public-extra-key', 'identity-extra-key', 'photo-of-departed', 'no-identities', 'own-identity-lost'] as const) test(`R6 DR: still rejects ${kind}`, async () => {
  const input = await seed(), rows = repository(input);
  let reason = /public-graph/;
  if (kind === 'empty-id') rows.posts[0].authorId = '';
  if (kind === 'malformed-id') rows.flows[0].ownerId = 'member-ZZ222222-2222-4222-8222-222222222222';
  if (kind === 'public-extra-key') (rows.posts[0] as unknown as Record<string, unknown>).hidden = true;
  if (kind === 'identity-extra-key') { input.tables['flowme_private.alpha_social_identities_v1'][0].deleted_at = NOW; reason = /column-allowlist/; }
  if (kind === 'photo-of-departed') {
    // A departed author's alias is accepted in the author slot only: a photo still needs its owner's identity.
    const objectPath = `media/${MEDIA}.webp`; input.objectPaths = [objectPath];
    input.tables['flowme_private.alpha_social_media_v1'] = [{ id: MEDIA, owner_id: OWNER, request_id: 'photo', object_path: objectPath, sha256: await sha256(bytes), bytes: bytes.length,
      width: 1, height: 1, alt: '사진', synthetic: true, status: 'published', created_at: NOW, expires_at: '2026-11-07T00:00:00.000Z' }];
    rows.posts[0].media = [{ id: MEDIA, dataUrl: `flowme-media:${MEDIA}`, alt: '사진', synthetic: true }];
    reason = /public-media-relation/;
  }
  if (kind === 'no-identities') { input.tables['flowme_private.alpha_social_identities_v1'] = []; reason = /missing-identities/; }
  if (kind === 'own-identity-lost') {
    // Another account keeps its identity; OWNER's is gone while OWNER's account still holds the copy.
    const other = '44444444-4444-4444-8444-444444444444', otherAccount = detached(input.tables['public.flowme_alpha_accounts'][0].account) as any;
    otherAccount.ownerId = other; otherAccount.source.actorId = other; otherAccount.space = createProgramData().spaces['local-user']; otherAccount.legacyReceipts = [];
    input.tables['public.flowme_alpha_accounts'].push({ owner_id: other, account: otherAccount });
    input.tables['flowme_private.alpha_social_identities_v1'] = [{ owner_id: other, public_actor_id: `member-${other}`, display_name: '다른 계정' }];
    reason = /account-graph/;
  }
  await assert.rejects(createDisasterRecoveryBackup(input, resolver), reason);
});
