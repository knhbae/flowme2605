import { NewFlow } from '@/components/flow/AppClient';
import { PersonalWorkspacePocAuthoringRoute } from '@/components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringRoute';
import {
  isPersonalWorkspacePocQuery,
  type PersonalWorkspacePocSearchParams,
} from '@/lib/flow/personal-workspace-poc-gate';
import { NON_INDEXABLE_ROUTE_ROBOTS } from '@/lib/flow/route-indexing-policy';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import React from 'react';

type NewFlowPageSearchParams = Promise<PersonalWorkspacePocSearchParams>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: NewFlowPageSearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  return {
    title: isPersonalWorkspacePocQuery(params)
      ? '새 개인 Flow 만들기'
      : 'Flow 만들기',
    robots: NON_INDEXABLE_ROUTE_ROBOTS,
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: NewFlowPageSearchParams;
}) {
  const params = await searchParams;
  if (isPersonalWorkspacePocQuery(params)) return <PersonalWorkspacePocAuthoringRoute />;
  if (Object.prototype.hasOwnProperty.call(params, 'personalWorkspacePoc')) redirect('/my');
  return <NewFlow />;
}
