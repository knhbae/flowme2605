import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';
import type { ProgramCommunityImage as ImageComponent } from './ProgramCommunityImage';
import type { ProgramCommunityMediaPort } from '../../../lib/flow/integrated-poc/community-media';

const media = { id: 'media-11111111-2222-4333-8444-555555555555', dataUrl: 'flowme-media:media-11111111-2222-4333-8444-555555555555', alt: '사진 설명', synthetic: false };
function harness(port?: ProgramCommunityMediaPort) {
  let cursor = 0; const slots: unknown[] = [], cleanups: (() => void)[] = [];
  const react = { ...React, useState: (initial: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value: unknown) => { slots[i] = value; }]; },
    useEffect: (effect: () => (() => void) | undefined) => { const i = cursor++; if (!(i in slots)) { slots[i] = true; const cleanup = effect(); if (cleanup) cleanups.push(cleanup); } } };
  const url = new URL('./ProgramCommunityImage.tsx', import.meta.url), require = createRequire(url);
  const compiled = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  const module = { exports: {} as { ProgramCommunityImage: typeof ImageComponent } };
  vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`)(module, module.exports, (id: string) => id === 'react' ? react : require(id));
  return { render: () => { cursor = 0; return module.exports.ProgramCommunityImage({ media, mediaPort: port }); }, cleanup: () => cleanups.forEach(fn => fn()) };
}
test('protected photo becomes a blob image with alt and is revoked and aborted on unmount', async () => {
  let signal: AbortSignal | undefined; const revoked: string[] = [];
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:protected-test'; URL.revokeObjectURL = value => { revoked.push(value); };
  try {
    const h = harness({ stage: async () => media, read: async (_id, incoming) => { signal = incoming; return new Blob(['photo'], { type: 'image/webp' }); } });
    assert.equal(h.render().type, 'p'); await Promise.resolve();
    const image = h.render(); assert.equal(image.type, 'img'); assert.equal(image.props.src, 'blob:protected-test'); assert.equal(image.props.alt, media.alt);
    h.cleanup(); assert(signal?.aborted); assert.deepEqual(revoked, ['blob:protected-test']);
  } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; }
});
test('late response after account unmount creates no object URL; absent port never exposes opaque reference as src', async () => {
  let resolve!: (blob: Blob) => void, created = 0; const create = URL.createObjectURL;
  URL.createObjectURL = () => { created++; return 'blob:late'; };
  try {
    const h = harness({ stage: async () => media, read: () => new Promise<Blob>(done => { resolve = done; }) });
    h.render(); h.cleanup(); resolve(new Blob(['photo'], { type: 'image/webp' })); await Promise.resolve(); assert.equal(created, 0);
    const unresolved = harness(); assert.equal(unresolved.render().type, 'p'); unresolved.cleanup();
  } finally { URL.createObjectURL = create; }
});
