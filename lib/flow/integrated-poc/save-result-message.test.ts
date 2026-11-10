import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData, createProgramEnvelope } from './program-data';
import { programClone } from './contract';
import { textWorkspaceModel as M } from './text-workspace';
import { createAlphaFakeServer } from './alpha-persistence/fake-server';
import { captureAlphaAccount, commandFromProgramTransition } from './alpha-persistence/program-adapter';
import { createAlphaClient } from './alpha-persistence/client';
import { canonicalJson } from './alpha-persistence/json';
import type { AlphaRepository } from './alpha-persistence/contract';
import { isAccountForOwner } from './alpha-auth/account-access';
import { programErrorMessage } from './ui-contract';

type Failure = 'read-invalid' | 'read-throws' | 'lost-response' | 'invalid' | 'revision-conflict';
async function fixture(failure: Failure) {
  const owner = '11111111-1111-4111-8111-111111111111';
  const data = createProgramData(), space = data.spaces[data.activeActorId];
  space.text = M.addDocument(space.text, { title: '합성 저장 확인' });
  const documentId = space.text.documents.find(row => row.title === '합성 저장 확인')!.id;
  space.text = M.editText(space.text, documentId, '[2026-11-10]\n- [ ] 합성 원래 할 일');
  data.actors = [{ id: owner, name: '합성', simulated: true }]; data.activeActorId = owner; data.spaces = { [owner]: space };
  const initial = captureAlphaAccount(createProgramEnvelope(data), owner, owner);
  const server = createAlphaFakeServer([initial]), port = server.connect(server.issueSession(owner));
  let executeCalls = 0, failRead = false; const lookedUp: string[] = [];
  const repository: AlphaRepository = { ...port,
    read: async () => {
      if (failRead) { failRead = false; if (failure === 'read-throws') throw Error('synthetic readback failure'); return { ok: false, reason: 'invalid' }; }
      return port.read();
    },
    execute: async command => {
      executeCalls++;
      if (failure === 'invalid' || failure === 'revision-conflict') return { ok: false, reason: failure };
      const receipt = await port.execute(command); assert(receipt.ok);
      if (failure === 'lost-response') throw Error('synthetic response lost after commit');
      failRead = true; return receipt;
    },
    lookup: async id => { lookedUp.push(id); return port.lookup(id); },
  };
  const client = createAlphaClient(isAccountForOwner); client.bindSession(owner, repository); assert(await client.refresh());
  const command = commandFromProgramTransition(initial.account, initial.references, 'synthetic-save-result', current => {
    const next = programClone(current), edited = next.spaces[owner];
    edited.text = M.editText(edited.text, documentId, '[2026-11-10]\n- [ ] 합성 원래 할 일\n- [ ] 합성 새 입력');
    return { ok: true, data: next, changed: true, result: documentId };
  });
  return { client, command, server, owner, initial, lookedUp, executeCalls: () => executeCalls };
}

for (const reason of ['read-invalid', 'read-throws', 'lost-response'] as const) {
  test(`uncertain save (${reason}) preserves the original request and resolves by lookup without resending`, async () => {
    const f = await fixture(reason), before = canonicalJson(f.command);
    assert.equal(await f.client.execute(f.command), false);
    const pending = f.client.snapshot();
    assert.equal(canonicalJson(pending.state?.pending), before);
    assert.equal(canonicalJson(pending.state?.draft), before, 'the submitted input is still recoverable');
    assert.equal(f.server.exportForBackup(f.owner).account.revision, f.initial.account.revision + 1);
    // A valid ACK followed by a failed read reaches the same host notice as a lost answer.
    const notice = programErrorMessage('checking-result');
    assert(notice.includes('저장 결과를 확인하지 못했습니다'));
    assert(!notice.includes('응답이 끊겨'), 'uncertainty does not establish a network interruption');
    assert(notice.includes('같은 요청으로 확인'));
    assert.equal(await f.client.resolvePending(false), true);
    assert.deepEqual(f.lookedUp, [f.command.requestId]); assert.equal(f.executeCalls(), 1);
    assert.equal(f.client.snapshot().state?.pending, null);
    assert.equal(canonicalJson(f.client.snapshot().state?.confirmed), canonicalJson(f.server.exportForBackup(f.owner).account));
  });
}
for (const reason of ['invalid', 'revision-conflict'] as const) {
  test(`known rejection (${reason}) is not an unknown outcome and preserves the rejected input`, async () => {
    const f = await fixture(reason), before = canonicalJson(f.server.exportForBackup(f.owner).account);
    assert.equal(await f.client.execute(f.command), false);
    const state = f.client.snapshot();
    assert.equal(state.state?.pending, null); assert.equal(state.lastError, reason);
    assert.equal(canonicalJson(state.state?.draft), canonicalJson(f.command));
    assert.equal(canonicalJson(f.server.exportForBackup(f.owner).account), before);
    assert.equal(f.server.diagnostics().mutations, 0);
    assert.equal(await f.client.resolvePending(false), false); assert.deepEqual(f.lookedUp, []);
    assert.equal(f.executeCalls(), 1);
  });
}
