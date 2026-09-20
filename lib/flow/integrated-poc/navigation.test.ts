import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyProgramRecurrencePresentation, parseProgramLocation, programLocation, programNavigationMatchesDocument, programCheckpointForOpen, programCheckpointForNavigation, readProgramDiscoveryPresentation, readProgramNavigationCheckpoint, readProgramRecurrencePresentation } from './navigation';
import type { ProgramDestination } from './ui-contract';
test('community versioned presentation retains exact reply route and rejects unknown/private fields and foreign actor',()=>{
 const location='#flowme/community/post-one?reply=reply-one',community={version:1,query:'이사 경험',kind:'experience'};
 const value={schema:'flowme-navigation/1',actorId:'a',location,scroll:123,focus:'reply-reply-one',community};
 assert.deepEqual(readProgramNavigationCheckpoint(JSON.parse(JSON.stringify(value)),'a',location),value);
 for(const bad of [{...community,version:2},{...community,kind:'reply'},{...community,body:'PRIVATE'},{...community,query:'x'.repeat(3001)}])assert.equal(readProgramNavigationCheckpoint({...value,community:bad},'a',location),null);
 assert.equal(readProgramNavigationCheckpoint(value,'b',location),null);
 const legacy={...value};delete (legacy as {community?:unknown}).community;assert.ok(readProgramNavigationCheckpoint(legacy,'a',location));
 const dest={view:'activity' as const},target={...legacy,location:programLocation(dest)};
 assert.deepEqual(programCheckpointForNavigation(target,value,'a',dest)?.community,community);
 assert.equal(programLocation(parseProgramLocation(location)),location);
});

test('recurrence query windows and filters restore detached per period/document, without execution data', () => {
  const recurrence = { ...emptyProgramRecurrencePresentation(), pages: { today: 4, all: 2 }, includeHeld: true, includeExcluded: true, documents: { 'doc-one': { page: 3, includeHeld: true, includeExcluded: false } } };
  const checkpoint = { schema: 'flowme-navigation/1', actorId: 'a', location: '#flowme/space/doc-one', scroll: 100, focus: null,
    space: { period: 'today', date: '2026-09-12', folderId: '', query: '', selected: 'doc-one', showArchived: false, recurrence } };
  const restored = readProgramNavigationCheckpoint(JSON.parse(JSON.stringify(checkpoint)), 'a', checkpoint.location); assert.deepEqual(restored, checkpoint); assert(restored?.space?.recurrence);
  restored.space.recurrence.pages.today = 0; restored.space.recurrence.documents['doc-one'].page = 0;
  assert.equal(recurrence.pages.today, 4); assert.equal(recurrence.documents['doc-one'].page, 3);
  for (const bad of [{ ...recurrence, raw: 'private' }, { ...recurrence, pages: { today: -1, all: 0 } }, { ...recurrence, pages: { today: 129, all: 0 } }, { ...recurrence, pages: { today: .5, all: 0 } },
    { ...recurrence, documents: { d: { page: 0, includeHeld: false, includeExcluded: false, completion: 'completed' } } }, { ...recurrence, includeHeld: 'yes' }]) {
    assert.equal(readProgramRecurrencePresentation(bad), null);
    assert.equal(readProgramNavigationCheckpoint({ ...checkpoint, space: { ...checkpoint.space, recurrence: bad } }, 'a', checkpoint.location), null);
  }
  assert.equal(readProgramNavigationCheckpoint(checkpoint, 'other', checkpoint.location), null);
});

test('round trips fixed flow version/item, reply and publication intent in hash only', () => {
  for (const destination of [{ view: 'space' }, { view: 'flow', id: '원본/one', versionId: 'v:1', itemId: '항목#2' },
    { view: 'community', id: 'p1', replyId: 'r3' }, { view: 'space', id: 'd1', action: 'publish' },
    { view: 'creator' }, { view: 'creator', id: 'draft:원문/1' }] as ProgramDestination[]) {
    const hash = programLocation(destination); assert.deepEqual(parseProgramLocation(hash), destination);
    const url = new URL(`http://localhost/my?personalWorkspacePoc=v1${hash}`); assert.equal(url.search, '?personalWorkspacePoc=v1');
  }
});

const discovery = () => ({ query: '이사', category: '생활', situation: '첫 이사', lastFlowId: 'flow-one', scrollTop: 480,
  versionByFlow: { 'flow-one': 'version-one' }, details: { 'version-one': { selectedItemIds: ['item-one', 'item-two'], anchor: '2026-09-12', format: 'ics' as const } } });

test('discovery presentation round trips detached selections, filter, anchor and format only', () => {
  const input = discovery(), decoded = readProgramDiscoveryPresentation(JSON.parse(JSON.stringify(input)));
  assert.deepEqual(decoded, input); assert(decoded);
  decoded.details['version-one'].selectedItemIds.push('other'); decoded.versionByFlow['flow-one'] = 'other-version';
  assert.deepEqual(input.details['version-one'].selectedItemIds, ['item-one', 'item-two']); assert.equal(input.versionByFlow['flow-one'], 'version-one');
});

test('discovery codec rejects raw input, extra nested fields, corruption, invalid dates and resource overflows', () => {
  const valid = discovery();
  for (const value of [null, [], { ...valid, pastedText: 'private' }, { ...valid, transient: { raw: 'private' } }, { ...valid, url: 'https://private.example' },
    { ...valid, query: 'q'.repeat(3001) }, { ...valid, scrollTop: Infinity }, { ...valid, versionByFlow: { f: '' } },
    { ...valid, details: { v: { selectedItemIds: ['x', 'x'], anchor: '', format: 'txt' } } },
    { ...valid, details: { v: { selectedItemIds: ['x'], anchor: '2026-02-29', format: 'txt' } } },
    { ...valid, details: { v: { selectedItemIds: ['x'], anchor: '', format: 'html' } } },
    { ...valid, details: { v: { selectedItemIds: ['x'], anchor: '', format: 'txt', raw: 'private' } } },
    { ...valid, details: { v: { selectedItemIds: Array.from({ length: 1201 }, (_, i) => `i${i}`), anchor: '', format: 'txt' } } },
    { ...valid, versionByFlow: Object.fromEntries(Array.from({ length: 2001 }, (_, i) => [`f${i}`, `v${i}`])) }]) {
    assert.equal(readProgramDiscoveryPresentation(value), null);
  }
  assert(readProgramDiscoveryPresentation({ ...valid, details: { v: { selectedItemIds: [], anchor: '', format: 'csv' } } }));
  assert(readProgramDiscoveryPresentation({ ...valid, details: { v: { selectedItemIds: [], anchor: '2024-02-29', format: 'txt' } } }));
});

test('history checkpoint validates discovery and refuses raw fields even outside the discovery branch', () => {
  const input = { schema: 'flowme-navigation/1', actorId: 'a', location: '#flowme/discover', scroll: 50, focus: null, discovery: discovery() };
  assert.deepEqual(readProgramNavigationCheckpoint(input, 'a', input.location), input);
  assert.equal(readProgramNavigationCheckpoint(input, 'b', input.location), null);
  assert.equal(readProgramNavigationCheckpoint(input, 'a', '#flowme/flow/other'), null);
  assert.equal(readProgramNavigationCheckpoint({ ...input, raw: 'private' }, 'a', input.location), null);
  assert.equal(readProgramNavigationCheckpoint({ ...input, discovery: { ...discovery(), pastedTitle: 'private' } }, 'a', input.location), null);
  assert.equal(readProgramNavigationCheckpoint({ ...input, writing: { d: { start: 0, end: 0, scrollTop: 0, raw: 'private' } } }, 'a', input.location), null);
});
test('malformed, duplicate, cross-surface and arbitrary hashes fail closed to space', () => {
  for (const hash of ['#reply-r1', '#program-main', '#flowme/flow/%ZZ', '#flowme/flow/x?version=a&version=b',
    '#flowme/space/d?version=a', '#flowme/flow/f?reply=a', '#flowme/flow/f?item=a', '#flowme/community/p?action=publish',
    '#flowme/flow/f?unknown=1', '#flowme/space/d?action=delete', '#flowme/flow/f?version=%00', '#flowme/flow/f#reply-x']) {
    assert.deepEqual(parseProgramLocation(hash), { view: 'space' }, hash);
  }
});
test('navigation checkpoint is presentation-only and isolated to actor and location', () => {
  const state = { schema: 'flowme-navigation/1', actorId: 'a', location: '#flowme/space', scroll: 200, focus: 'f',
    space: { period: 'month', date: '2026-09-12', folderId: '', query: '여행', selected: 'd', showArchived: false }, writing: { d: { start: 12, end: 12, scrollTop: 120 } } };
  assert.deepEqual(readProgramNavigationCheckpoint(state, 'a', state.location), state);
  assert.equal(readProgramNavigationCheckpoint(state, 'b', state.location), null);
  assert.equal(readProgramNavigationCheckpoint(state, 'a', '#flowme/community'), null);
  for (const patch of [{ scroll: -1 }, { scroll: Infinity }, { writing: { d: { start: -1, end: 0, scrollTop: 0 } } }, { space: { ...state.space, query: 'x'.repeat(3001) } }]) {
    assert.equal(readProgramNavigationCheckpoint({ ...state, ...patch }, 'a', state.location), null);
  }
});

test('explicit document routes reject the previous document checkpoint during an import transition', () => {
  const location = programLocation({ view: 'space', id: 'new/copy' });
  const state = { schema: 'flowme-navigation/1', actorId: 'a', location, scroll: 0, focus: null,
    space: { period: 'documents', date: '2026-09-12', folderId: '', query: '', selected: 'old-document', showArchived: false } };
  assert.equal(programNavigationMatchesDocument(location, 'old-document'), false);
  assert.equal(programNavigationMatchesDocument(location, undefined), false);
  assert.equal(readProgramNavigationCheckpoint(state, 'a', location), null);
  const valid = { ...state, space: { ...state.space, selected: 'new/copy' } };
  assert.equal(programNavigationMatchesDocument(location, 'new/copy'), true);
  assert.deepEqual(readProgramNavigationCheckpoint(valid, 'a', location), valid);
  const publishLocation = programLocation({ view: 'space', id: 'new/copy', action: 'publish' });
  assert.equal(readProgramNavigationCheckpoint({ ...state, location: publishLocation }, 'a', publishLocation), null);
});

test('bare space and other surfaces retain private workspace presentation without claiming that document route', () => {
  for (const location of ['#flowme/space', '#flowme/creator/draft-one', '#flowme/flow/public-one', '#flowme/activity']) {
    const state = { schema: 'flowme-navigation/1', actorId: 'a', location, scroll: 200, focus: null,
      space: { period: 'month', date: '2026-11-23', folderId: '', query: '기억할 검색', selected: 'private-doc', showArchived: false } };
    assert.equal(programNavigationMatchesDocument(location, 'private-doc'), true);
    assert.deepEqual(readProgramNavigationCheckpoint(state, 'a', location), state);
  }
});

test('opening a period row returns to its document even when the URL already names that same document', () => {
  const destination = { view: 'space' as const, id: 'same-doc' }, location = programLocation(destination);
  const checkpoint = { schema: 'flowme-navigation/1', actorId: 'a', location, scroll: 400, focus: null,
    space: { period: 'all', date: '2026-09-12', folderId: '', query: '검색 보존', selected: 'same-doc', showArchived: false } };
  assert.equal(readProgramNavigationCheckpoint(checkpoint, 'a', location)?.space?.period, 'all', 'back/reload preserves the period');
  const opened = programCheckpointForOpen(checkpoint, 'a', destination);
  assert.equal(opened?.space?.period, 'documents'); assert.equal(opened?.space?.selected, 'same-doc');
  assert.equal(opened?.space?.query, '검색 보존'); assert.equal(checkpoint.space.period, 'all');
  assert.equal(programCheckpointForOpen(checkpoint, 'other-actor', destination), null);
  assert.equal(programCheckpointForOpen(checkpoint, 'a', { view: 'space', id: 'other-doc' }), null);
});

test('app navigation preserves latest discovery selections instead of restoring the old space snapshot', () => {
  const target = { schema: 'flowme-navigation/1', actorId: 'a', location: '#flowme/space', scroll: 200, focus: 'old-focus',
    space: { period: 'week', date: '2026-09-12', folderId: '', query: '', selected: 'd', showArchived: false },
    discovery: { ...discovery(), details: {}, lastFlowId: null } };
  const live = { ...target, location: '#flowme/flow/flow-one', scroll: 900, focus: null, discovery: discovery() };
  const before = JSON.stringify({ target, live });
  const opened = programCheckpointForNavigation(target, live, 'a', { view: 'space' });
  assert.deepEqual(opened?.discovery, discovery()); assert.equal(opened?.scroll, 200); assert.equal(opened?.focus, 'old-focus');
  assert.equal(opened?.space?.period, 'week'); assert.equal(JSON.stringify({ target, live }), before);
  assert.deepEqual(readProgramNavigationCheckpoint(target, 'a', target.location)?.discovery?.details, {}, 'browser Back/reload still read that entry');
});

test('explicit discovery return keeps latest choices and private workspace, including intentional clearing', () => {
  const target = { schema: 'flowme-navigation/1', actorId: 'a', location: '#flowme/discover', scroll: 240, focus: null,
    space: { period: 'today', date: '2026-09-12', folderId: '', query: '', selected: 'old', showArchived: false },
    writing: { old: { start: 1, end: 1, scrollTop: 10 } }, discovery: discovery() };
  const live = { ...target, location: '#flowme/space/new', scroll: 0,
    space: { ...target.space, selected: 'new', date: '2026-10-03', period: 'month' },
    writing: { old: { start: 12, end: 15, scrollTop: 99 }, new: { start: 3, end: 4, scrollTop: 10 } },
    discovery: { ...discovery(), query: '', details: {} } };
  const opened = programCheckpointForNavigation(target, live, 'a', { view: 'discover' });
  assert.equal(opened?.space?.selected, 'new'); assert.equal(opened?.space?.date, '2026-10-03');
  assert.equal(opened?.writing?.old.start, 12); assert.equal(opened?.scroll, 240);
  assert.equal(opened?.discovery?.query, ''); assert.deepEqual(opened?.discovery?.details, {});
});

test('first explicit document open carries safe current presentation and opens the requested document', () => {
  const live = { schema: 'flowme-navigation/1', actorId: 'a', location: '#flowme/flow/flow-one', scroll: 500, focus: 'source',
    space: { period: 'today', date: '2026-09-12', folderId: '', query: '', selected: 'old', showArchived: false }, discovery: discovery() };
  const opened = programCheckpointForNavigation(undefined, live, 'a', { view: 'space', id: 'new/copy' });
  assert.equal(opened?.location, '#flowme/space/new%2Fcopy'); assert.equal(opened?.space?.selected, 'new/copy');
  assert.equal(opened?.space?.period, 'documents'); assert.equal(opened?.scroll, 0); assert.equal(opened?.focus, null);
  assert.deepEqual(opened?.discovery, discovery());
});

test('app navigation refuses foreign or invalid presentation and never transports source input', () => {
  const live = { schema: 'flowme-navigation/1', actorId: 'a', location: '#flowme/discover', scroll: 0, focus: null, discovery: discovery() };
  for (const bad of [{ ...live, actorId: 'b' }, { ...live, raw: 'PRIVATE' }, { ...live, location: '#other' },
    { ...live, discovery: { ...discovery(), transient: { raw: 'PRIVATE' } } }]) {
    assert.equal(programCheckpointForNavigation(undefined, bad, 'a', { view: 'space' }), null);
  }
  const opened = programCheckpointForNavigation(undefined, live, 'a', { view: 'community', id: 'post', replyId: 'reply' });
  assert.equal(opened?.location, '#flowme/community/post?reply=reply');
  opened!.discovery!.details['version-one'].selectedItemIds.push('detached');
  assert.equal(live.discovery.details['version-one'].selectedItemIds.length, 2);
});
