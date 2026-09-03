'use client';

import { useEffect, useState } from 'react';

import { composePersonalWorkspacePocReadModel } from '@/lib/flow/personal-workspace-poc-composition';
import type {
  PersonalWorkspacePocReadModel,
  PersonalWorkspacePocState,
} from '@/lib/flow/personal-workspace-poc-contract';
import { buildPersonalWorkspacePocReadModel } from '@/lib/flow/personal-workspace-poc-read-model';
import {
  createPersonalWorkspacePocState,
  validatePersonalWorkspacePocStateReferences,
} from '@/lib/flow/personal-workspace-poc-state';
import {
  loadPersonalWorkspacePocAuthoringDraft,
  loadPersonalWorkspacePocState,
  type PersonalWorkspacePocAuthoringDraft,
} from '@/lib/flow/personal-workspace-poc-storage';
import { recoverPersonalWorkspacePocStorageCommit } from '@/lib/flow/personal-workspace-poc-storage-transaction';
import { mergeSourceBackedMyFlowBundles } from '@/lib/flow/source-backed-my-flow';
import { readBundles } from '@/lib/flow/storage';

import { PersonalWorkspacePocAuthoringSurface } from './PersonalWorkspacePocAuthoringSurface';

type AuthoringBootState =
  | { status: 'booting' }
  | {
      status: 'ready';
      model: PersonalWorkspacePocReadModel;
      state: PersonalWorkspacePocState;
      restored: boolean;
      authoringDraft?: PersonalWorkspacePocAuthoringDraft;
    }
  | { status: 'redirecting' };

/**
 * Boots the authoring PoC from read-only operating projections plus the
 * isolated personal-workspace shadow state. Any uncertain payload returns to
 * the existing /my route before an authoring writer can mount.
 */
export function PersonalWorkspacePocAuthoringRoute() {
  const [boot, setBoot] = useState<AuthoringBootState>({ status: 'booting' });

  useEffect(() => {
    const failClosed = () => {
      setBoot({ status: 'redirecting' });
      window.location.replace('/my');
    };

    try {
      const recovery = recoverPersonalWorkspacePocStorageCommit(window.localStorage);
      if (!recovery.recovered) {
        failClosed();
        return;
      }
      const modelResult = buildPersonalWorkspacePocReadModel(
        window.localStorage,
        mergeSourceBackedMyFlowBundles(readBundles()),
      );
      const stored = loadPersonalWorkspacePocState(window.localStorage);
      const authoringDraft = loadPersonalWorkspacePocAuthoringDraft(window.localStorage);
      if (
        !modelResult.ok
        || stored.kind === 'corrupt'
        || authoringDraft.kind === 'corrupt'
      ) {
        failClosed();
        return;
      }

      const state = stored.kind === 'ready'
        ? stored.state
        : createPersonalWorkspacePocState();
      const composition = composePersonalWorkspacePocReadModel(modelResult.model, state);
      if (
        !composition.ok
        || !validatePersonalWorkspacePocStateReferences(state, composition.model).ok
      ) {
        failClosed();
        return;
      }

      setBoot({
        status: 'ready',
        model: modelResult.model,
        state,
        restored: stored.kind === 'ready',
        ...(authoringDraft.kind === 'ready'
          ? { authoringDraft: authoringDraft.draft }
          : {}),
      });
    } catch {
      failClosed();
    }
  }, []);

  if (boot.status !== 'ready') {
    return (
      <main
        data-testid="personal-workspace-authoring-boot"
        aria-busy="true"
        className="mx-auto min-h-[60dvh] max-w-[1240px] px-4 py-8 sm:px-5"
      >
        <p className="text-sm font-semibold text-[var(--flowme-text-secondary)]">
          {boot.status === 'redirecting'
            ? '기존 내 계획으로 돌아갑니다.'
            : '안전한 작성 공간을 불러오는 중입니다.'}
        </p>
      </main>
    );
  }

  return (
    <PersonalWorkspacePocAuthoringSurface
      initialModel={boot.model}
      initialState={boot.state}
      restored={boot.restored}
      initialAuthoringDraft={boot.authoringDraft}
    />
  );
}
