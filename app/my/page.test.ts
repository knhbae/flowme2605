import assert from 'node:assert/strict';
import test from 'node:test';

import { MyFlows } from '@/components/flow/AppClient';
import { PersonalWorkspacePocRoute } from '@/components/flow/personal-workspace-poc/PersonalWorkspacePocRoute';

import Page, { generateMetadata } from './page';

test('/my metadata uses plan language by default and preserves the exact Q3 rollback title', async () => {
  const q3 = await generateMetadata({ searchParams: Promise.resolve({}) });
  const rollback = await generateMetadata({
    searchParams: Promise.resolve({ q3Copy: 'off' }),
  });

  assert.equal(q3.title, '내 계획');
  assert.equal(rollback.title, 'My Flow');
  assert.deepEqual(q3.robots, rollback.robots);
});

test('/my mounts the isolated PoC only for the exact query and fails closed otherwise', async () => {
  const exact = await Page({
    searchParams: Promise.resolve({ personalWorkspacePoc: 'v1' }),
  });
  const defaultRoute = await Page({ searchParams: Promise.resolve({}) });
  const extra = await Page({
    searchParams: Promise.resolve({ personalWorkspacePoc: 'v1', view: 'today' }),
  });
  const duplicate = await Page({
    searchParams: Promise.resolve({ personalWorkspacePoc: ['v1', 'v1'] }),
  });
  const metadata = await generateMetadata({
    searchParams: Promise.resolve({ personalWorkspacePoc: 'v1' }),
  });

  assert.equal(exact.type, PersonalWorkspacePocRoute);
  assert.equal(defaultRoute.type, MyFlows);
  assert.equal(extra.type, MyFlows);
  assert.equal(duplicate.type, MyFlows);
  assert.equal(metadata.title, '개인공간');
});
