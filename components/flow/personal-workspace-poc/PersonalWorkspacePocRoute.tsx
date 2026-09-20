'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

import { buildPersonalWorkspacePocReadModel } from '@/lib/flow/personal-workspace-poc-read-model';
import { composePersonalWorkspacePocReadModel } from '@/lib/flow/personal-workspace-poc-composition';
import {
  createPersonalWorkspacePocState,
  validatePersonalWorkspacePocStateReferences,
} from '@/lib/flow/personal-workspace-poc-state';
import { loadPersonalWorkspacePocState } from '@/lib/flow/personal-workspace-poc-storage';
import { recoverPersonalWorkspacePocStorageCommit } from '@/lib/flow/personal-workspace-poc-storage-transaction';
import {
  loadPersonalWorkspacePocSourceCandidateStore,
} from '@/lib/flow/personal-workspace-poc-source-candidate-storage';
import {
  createPersonalWorkspacePocSourceCandidateStore,
  type PersonalWorkspacePocSourceCandidateStore,
} from '@/lib/flow/personal-workspace-poc-source-candidates';
import { mergeSourceBackedMyFlowBundles } from '@/lib/flow/source-backed-my-flow';
import { readBundles } from '@/lib/flow/storage';
import type {
  PersonalWorkspacePocReadModel,
  PersonalWorkspacePocState,
} from '@/lib/flow/personal-workspace-poc-contract';

import { PersonalWorkspacePocSurface } from './PersonalWorkspacePocSurface';
const ProgramApp = dynamic(() => import('../integrated-poc/ProgramApp').then(module => module.ProgramApp), {
  ssr: false,
  loading: () => <p role="status">개인공간을 불러오는 중입니다.</p>,
});

type BootState =
  | { status: 'booting' }
  | {
      status: 'ready';
      model: PersonalWorkspacePocReadModel;
      state: PersonalWorkspacePocState;
      sourceCandidateStore: PersonalWorkspacePocSourceCandidateStore;
      sourceCandidateRaw: string | null;
      restored: boolean;
    }
  | { status: 'redirecting' };

export function PersonalWorkspacePocRoute() {
  const [boot, setBoot] = useState<BootState>({ status: 'booting' });

  useEffect(() => {
    try {
      const recovery = recoverPersonalWorkspacePocStorageCommit(window.localStorage);
      if (!recovery.recovered) {
        setBoot({ status: 'redirecting' });
        window.location.replace('/my');
        return;
      }
      const modelResult = buildPersonalWorkspacePocReadModel(
        window.localStorage,
        mergeSourceBackedMyFlowBundles(readBundles()),
      );
      const stored = loadPersonalWorkspacePocState(window.localStorage);
      const storedSourceCandidates = loadPersonalWorkspacePocSourceCandidateStore(
        window.localStorage,
      );
      if (
        !modelResult.ok
        || stored.kind === 'corrupt'
        || storedSourceCandidates.kind === 'corrupt'
      ) {
        setBoot({ status: 'redirecting' });
        window.location.replace('/my');
        return;
      }
      const restoredState = stored.kind === 'ready'
        ? stored.state
        : createPersonalWorkspacePocState();
      const sourceCandidateStore = storedSourceCandidates.kind === 'ready'
        ? storedSourceCandidates.store
        : createPersonalWorkspacePocSourceCandidateStore();
      const composition = composePersonalWorkspacePocReadModel(
        modelResult.model,
        restoredState,
        sourceCandidateStore,
      );
      if (
        !composition.ok
        || !validatePersonalWorkspacePocStateReferences(restoredState, composition.model).ok
      ) {
        setBoot({ status: 'redirecting' });
        window.location.replace('/my');
        return;
      }
      setBoot({
        status: 'ready',
        model: modelResult.model,
        state: restoredState,
        sourceCandidateStore,
        sourceCandidateRaw: storedSourceCandidates.raw,
        restored: stored.kind === 'ready' || storedSourceCandidates.kind === 'ready',
      });
    } catch {
      setBoot({ status: 'redirecting' });
      window.location.replace('/my');
    }
  }, []);

  if (boot.status !== 'ready') {
    return (
      <main
        data-testid="personal-workspace-poc-boot"
        aria-busy="true"
        className="mx-auto min-h-[60dvh] max-w-[1240px] px-4 py-8 sm:px-5"
      >
        <p className="text-sm font-semibold text-[var(--flowme-text-secondary)]">
          {boot.status === 'redirecting' ? '기존 내 계획으로 돌아갑니다.' : '개인공간을 불러오는 중입니다.'}
        </p>
      </main>
    );
  }

  return (
    <ProgramApp baseModel={boot.model} legacyState={boot.state} sourceCandidateStore={boot.sourceCandidateStore} savedCount={boot.model.flows.length} legacy={<PersonalWorkspacePocSurface
      initialModel={boot.model}
      initialState={boot.state}
      initialSourceCandidateStore={boot.sourceCandidateStore}
      initialSourceCandidateRaw={boot.sourceCandidateRaw}
      restored={boot.restored}
    />} />
  );
}
