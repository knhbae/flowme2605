'use client';

import type { ReactNode } from 'react';

import {
  MY_FLOW_R3A_LAB_EXPERIENCE,
  type MyFlowExperienceVariant,
} from '@/lib/flow/my-flow-experience-variant';
import type { MyFlowWorkspaceSnapshotV1 } from '@/lib/flow/my-flow-workspace-snapshot';

import { MyFlowR3aLabSurface } from './experiences/MyFlowR3aLabSurface';
import type { MyFlowExperienceNavigationPort } from './MyFlowExperienceContract';

export type MyFlowExperienceHostProps = Readonly<{
  variant: MyFlowExperienceVariant;
  candidateEligible: boolean;
  snapshot: MyFlowWorkspaceSnapshotV1 | null;
  intents: MyFlowExperienceNavigationPort;
  classic: ReactNode;
  renderSelectedFlow: (savedFlowSlug: string) => ReactNode;
}>;

export function MyFlowExperienceHost({
  variant,
  candidateEligible,
  snapshot,
  intents,
  classic,
  renderSelectedFlow,
}: MyFlowExperienceHostProps) {
  const useCandidate = (
    variant === MY_FLOW_R3A_LAB_EXPERIENCE
    && candidateEligible
    && snapshot !== null
    && snapshot.integrity.status === 'ok'
  );

  if (!useCandidate || snapshot === null) return classic;

  return (
    <MyFlowR3aLabSurface
      snapshot={snapshot}
      intents={intents}
      renderSelectedFlow={renderSelectedFlow}
    />
  );
}
