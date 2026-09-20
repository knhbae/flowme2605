'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import { composePersonalWorkspacePocReadModel } from '@/lib/flow/personal-workspace-poc-composition';
import type {
  PersonalWorkspacePocReadModel,
  PersonalWorkspacePocState,
} from '@/lib/flow/personal-workspace-poc-contract';
import { PERSONAL_WORKSPACE_POC_STATE_KEY } from '@/lib/flow/personal-workspace-poc-contract';
import { buildPersonalWorkspacePocReadModel } from '@/lib/flow/personal-workspace-poc-read-model';
import {
  createPersonalWorkspacePocCreatorDraftLibrary,
  type PersonalWorkspacePocCreatorDraftLibrary,
} from '@/lib/flow/personal-workspace-poc-creator-drafts';
import { loadPersonalWorkspacePocCreatorDraftLibrary } from '@/lib/flow/personal-workspace-poc-creator-draft-storage';
import { recoverPersonalWorkspacePocCreatorDraftStorage } from '@/lib/flow/personal-workspace-poc-creator-draft-storage-transaction';
import {
  createPersonalWorkspacePocState,
  validatePersonalWorkspacePocStateReferences,
} from '@/lib/flow/personal-workspace-poc-state';
import {
  loadPersonalWorkspacePocAuthoringDraft,
  loadPersonalWorkspacePocState,
  PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
  type PersonalWorkspacePocAuthoringDraft,
} from '@/lib/flow/personal-workspace-poc-storage';
import { recoverPersonalWorkspacePocStorageCommit } from '@/lib/flow/personal-workspace-poc-storage-transaction';
import { loadPersonalWorkspacePocSourceCandidateStore } from '@/lib/flow/personal-workspace-poc-source-candidate-storage';
import { buildPersonalWorkspacePocEntryReadPacket, resolvePersonalWorkspacePocEntryRead } from '@/lib/flow/personal-workspace-poc-entry-read';
import { buildPersonalWorkspacePocMapGroupCatalog } from '@/lib/flow/personal-workspace-poc-map-selection';
import { observePersonalWorkspacePocEntryNavigation, restorePersonalWorkspacePocEntryNavigation } from '@/lib/flow/personal-workspace-poc-entry-navigation-browser';
import type { PersonalWorkspacePocEntryNavigationBinding, PersonalWorkspacePocEntryNavigationPresentation } from '@/lib/flow/personal-workspace-poc-entry-navigation';
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
      creatorDraftLibrary: PersonalWorkspacePocCreatorDraftLibrary;
      creatorDraftLibraryRaw: string | null;
      sourceRaw: string | null;
      stateRaw: string | null;
      entryBinding: PersonalWorkspacePocEntryNavigationBinding;
      entryEpoch: number;
      renderEpoch: number;
      entryReturn?: PersonalWorkspacePocEntryNavigationPresentation;
    }
  | { status: 'redirecting' };

/**
 * Boots the authoring PoC from read-only operating projections plus the
 * isolated personal-workspace shadow state. Any uncertain payload returns to
 * the existing /my route before an authoring writer can mount.
 */
export function PersonalWorkspacePocAuthoringRoute() {
  const pathname = usePathname();
  const [boot, setBoot] = useState<AuthoringBootState>({ status: 'booting' });
  const renderEpoch = useRef(0);

  useEffect(() => {
    if (pathname !== '/flows/new') return;
    setBoot({ status: 'booting' });
    observePersonalWorkspacePocEntryNavigation();
    const failClosed = () => {
      setBoot({ status: 'redirecting' });
      window.location.replace('/my');
    };

    try {
      const recovery = recoverPersonalWorkspacePocStorageCommit(window.localStorage);
      const creatorDraftRecovery = recoverPersonalWorkspacePocCreatorDraftStorage(
        window.localStorage,
      );
      if (!recovery.recovered || !creatorDraftRecovery.recovered) {
        failClosed();
        return;
      }
      const modelResult = buildPersonalWorkspacePocReadModel(
        window.localStorage,
        mergeSourceBackedMyFlowBundles(readBundles()),
      );
      const stateRaw = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY);
      const stored = loadPersonalWorkspacePocState({ getItem: key => {
        if (key !== PERSONAL_WORKSPACE_POC_STATE_KEY) throw new Error('unexpected-entry-read-key');
        return stateRaw;
      } });
      const source = loadPersonalWorkspacePocSourceCandidateStore(window.localStorage);
      const draftRaw = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY);
      const authoringDraft = loadPersonalWorkspacePocAuthoringDraft({ getItem: key => {
        if (key !== PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY) throw new Error('unexpected-entry-draft-key');
        return draftRaw;
      } });
      const creatorDraftLibrary = loadPersonalWorkspacePocCreatorDraftLibrary(
        window.localStorage,
      );
      if (
        !modelResult.ok
        || stored.kind === 'corrupt'
        || source.kind === 'corrupt'
        || authoringDraft.kind === 'corrupt'
        || creatorDraftLibrary.kind === 'corrupt'
      ) {
        failClosed();
        return;
      }

      const state = stored.kind === 'ready'
        ? stored.state
        : createPersonalWorkspacePocState();
      const library = creatorDraftLibrary.kind === 'ready'
        ? creatorDraftLibrary.library
        : createPersonalWorkspacePocCreatorDraftLibrary(new Date().toISOString());
      const creatorBinding = authoringDraft.kind === 'ready'
        ? authoringDraft.draft.creatorBinding
        : undefined;
      if (
        creatorBinding
        && library.records[creatorBinding.draftId]?.status !== 'active'
      ) {
        failClosed();
        return;
      }
      const composition = composePersonalWorkspacePocReadModel(modelResult.model, state, source.kind === 'ready' ? source.store : undefined);
      const entryRead = buildPersonalWorkspacePocEntryReadPacket({ baseModel: modelResult.model, state, sourceRead: { ok: true, raw: source.raw } });
      if (
        !composition.ok
        || !entryRead.ok
        || !validatePersonalWorkspacePocStateReferences(state, composition.model).ok
      ) {
        failClosed();
        return;
      }

      const entryBinding = { stateRaw, sourceRaw: source.raw, modelJson: JSON.stringify(modelResult.model),
        draftRaw, libraryRaw: creatorDraftLibrary.raw };
      let entryReturn = restorePersonalWorkspacePocEntryNavigation(entryBinding);
      // A memory snapshot is only a selection hint. Authorize it against this fresh boot's packet and full membership.
      if (entryReturn) {
        const resolution = resolvePersonalWorkspacePocEntryRead(entryRead.packet, entryReturn.entryInput);
        const catalog = buildPersonalWorkspacePocMapGroupCatalog(composition.model);
        const matches = resolution.ok && 'matches' in resolution.resolution ? resolution.resolution.matches : [];
        const group = catalog.ok ? catalog.catalog.groups.find(value => value.groupRef === entryReturn?.groupRef) : undefined;
        const flow = composition.model.flows.find(value => value.ref === entryReturn?.flowRef);
        const inactive = [...(state.trashEntries ?? []), ...(state.deletedMembers ?? [])]
          .some(value => value.member === 'saved_flow' && value.memberRef === entryReturn?.flowRef);
        if (!resolution.ok || !catalog.ok || (entryReturn.flowRef && (!group || !flow || inactive
          || !group.children.some(child => child.flowRef === flow.ref)
          || !group.children.some(child => matches.some(match => match.flowRef === child.flowRef))
          || (entryReturn.preview.openItemRef && !flow.items.some(item => item.ref === entryReturn?.preview.openItemRef))))) {
          entryReturn = undefined;
        }
      }
      setBoot({
        status: 'ready',
        model: modelResult.model,
        state,
        restored: stored.kind === 'ready',
        creatorDraftLibrary: library,
        creatorDraftLibraryRaw: creatorDraftLibrary.raw,
        sourceRaw: source.raw,
        stateRaw,
        entryBinding,
        entryEpoch: observePersonalWorkspacePocEntryNavigation(),
        renderEpoch: ++renderEpoch.current,
        ...(entryReturn ? { entryReturn } : {}),
        ...(authoringDraft.kind === 'ready'
          ? { authoringDraft: authoringDraft.draft }
          : {}),
      });
    } catch {
      failClosed();
    }
  }, [pathname]);

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
      key={boot.renderEpoch}
      initialModel={boot.model}
      initialState={boot.state}
      restored={boot.restored}
      initialAuthoringDraft={boot.authoringDraft}
      initialCreatorDraftLibrary={boot.creatorDraftLibrary}
      initialCreatorDraftLibraryRaw={boot.creatorDraftLibraryRaw}
      initialSourceRaw={boot.sourceRaw}
      initialEntryStateRaw={boot.stateRaw}
      initialEntryBinding={boot.entryBinding}
      initialEntryEpoch={boot.entryEpoch}
      initialEntryReturn={boot.entryReturn}
    />
  );
}
