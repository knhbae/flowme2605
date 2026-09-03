import { MyFlows } from '@/components/flow/AppClient';
import { PersonalWorkspacePocRoute } from '@/components/flow/personal-workspace-poc/PersonalWorkspacePocRoute';
import {
  isPersonalWorkspacePocQuery,
  type PersonalWorkspacePocSearchParams,
} from '@/lib/flow/personal-workspace-poc-gate';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';
import type { Metadata } from 'next';
import React from 'react';

type MyFlowPageSearchParams = Promise<PersonalWorkspacePocSearchParams>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: MyFlowPageSearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const q3Copy = Array.isArray(params.q3Copy) ? params.q3Copy[0] : params.q3Copy;
  return {
    title: isPersonalWorkspacePocQuery(params)
      ? '개인공간'
      : q3Copy === 'off'
        ? 'My Flow'
        : '내 계획',
    robots: NON_INDEXABLE_ROUTE_ROBOTS,
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: MyFlowPageSearchParams;
}) {
  const params = await searchParams;
  return isPersonalWorkspacePocQuery(params)
    ? <PersonalWorkspacePocRoute />
    : <MyFlows />;
}
