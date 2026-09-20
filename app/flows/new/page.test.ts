import assert from 'node:assert/strict';
import test from 'node:test';

import { NewFlow } from '@/components/flow/AppClient';
import { PersonalWorkspacePocAuthoringRoute } from '@/components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringRoute';

import Page, { generateMetadata } from './page';

test('/flows/new mounts isolated authoring only for the exact PoC query', async () => {
  const exact = await Page({
    searchParams: Promise.resolve({ personalWorkspacePoc: 'v1' }),
  });
  const defaultRoute = await Page({ searchParams: Promise.resolve({}) });
  assert.equal(exact.type, PersonalWorkspacePocAuthoringRoute);
  assert.equal(defaultRoute.type, NewFlow);
});

test('/flows/new fails malformed PoC queries closed to the existing /my route', async () => {
  const invalidQueries = [
    { personalWorkspacePoc: 'v1', view: 'today' },
    { personalWorkspacePoc: ['v1', 'v1'] },
    { personalWorkspacePoc: 'V1' },
    { personalWorkspacePoc: undefined },
  ];
  for (const params of invalidQueries) {
    await assert.rejects(
      () => Page({ searchParams: Promise.resolve(params) }),
      (error: unknown) => {
        const candidate = error as { digest?: string };
        return typeof candidate.digest === 'string'
          && candidate.digest.includes('NEXT_REDIRECT')
          && candidate.digest.includes('/my');
      },
    );
  }
});

test('/flows/new metadata changes only for the exact PoC query and keeps robots', async () => {
  const exact = await generateMetadata({
    searchParams: Promise.resolve({ personalWorkspacePoc: 'v1' }),
  });
  const defaultRoute = await generateMetadata({
    searchParams: Promise.resolve({}),
  });
  const extra = await generateMetadata({
    searchParams: Promise.resolve({ personalWorkspacePoc: 'v1', view: 'today' }),
  });
  const duplicate = await generateMetadata({
    searchParams: Promise.resolve({ personalWorkspacePoc: ['v1', 'v1'] }),
  });

  assert.equal(exact.title, '새 개인 Flow 만들기');
  assert.equal(defaultRoute.title, 'Flow 만들기');
  assert.equal(extra.title, 'Flow 만들기');
  assert.equal(duplicate.title, 'Flow 만들기');
  assert.deepEqual(exact.robots, defaultRoute.robots);
  assert.deepEqual(extra.robots, defaultRoute.robots);
  assert.deepEqual(duplicate.robots, defaultRoute.robots);
});
