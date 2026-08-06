import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import autoprefixer from 'autoprefixer';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const outputPath = path.join(
  repositoryRoot,
  'docs',
  'content-audit',
  '2026-08-04-flowme-text-authoring-grammar-ux-improvement-results',
  'flowme-text-authoring-v2-test.html',
);

const entrySource = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { TextAuthoringWorkspace } from '@/components/flow/text-authoring';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');
const showQaCatalog = new URLSearchParams(window.location.search).get('authoringQa') === '1';

createRoot(root).render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(TextAuthoringWorkspace, { showQaCatalog }),
  ),
);
`;

const nextStubPlugin = {
  name: 'flowme-standalone-next-stubs',
  setup(buildApi) {
    buildApi.onResolve({ filter: /^next\/link$/ }, () => ({
      path: 'next-link',
      namespace: 'flowme-standalone',
    }));
    buildApi.onResolve({ filter: /^next\/navigation$/ }, () => ({
      path: 'next-navigation',
      namespace: 'flowme-standalone',
    }));
    buildApi.onLoad(
      { filter: /^next-link$/, namespace: 'flowme-standalone' },
      () => ({
        loader: 'jsx',
        resolveDir: repositoryRoot,
        contents: `
import React from 'react';

export default function Link({ href, onClick, ...props }) {
  const resolvedHref = typeof href === 'string' ? href : '#';
  return React.createElement('a', {
    ...props,
    href: resolvedHref,
    onClick(event) {
      event.preventDefault();
      onClick?.(event);
    },
  });
}
`,
      }),
    );
    buildApi.onLoad(
      { filter: /^next-navigation$/, namespace: 'flowme-standalone' },
      () => ({
        loader: 'js',
        resolveDir: repositoryRoot,
        contents: `
export function usePathname() {
  return '/flows/new';
}

export function useRouter() {
  return {
    back() {},
    forward() {},
    prefetch() { return Promise.resolve(); },
    push() {},
    refresh() {},
    replace() {},
  };
}

export function useSearchParams() {
  return new URLSearchParams();
}
`,
      }),
    );
  },
};

const bundleResult = await build({
  absWorkingDir: repositoryRoot,
  bundle: true,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  entryNames: 'flowme-text-authoring-ta-test',
  format: 'iife',
  jsx: 'automatic',
  logLevel: 'info',
  minify: true,
  outdir: 'standalone-output',
  platform: 'browser',
  plugins: [nextStubPlugin],
  sourcemap: false,
  stdin: {
    contents: entrySource,
    loader: 'tsx',
    resolveDir: repositoryRoot,
    sourcefile: 'flowme-text-authoring-ta-test-entry.tsx',
  },
  target: ['chrome110', 'edge110', 'firefox110', 'safari16'],
  treeShaking: true,
  tsconfig: path.join(repositoryRoot, 'tsconfig.json'),
  write: false,
});

const javascriptOutput = bundleResult.outputFiles.find((file) =>
  file.path.endsWith('.js'),
);
if (!javascriptOutput) {
  throw new Error('Standalone JavaScript bundle was not generated.');
}

const globalsPath = path.join(repositoryRoot, 'app', 'globals.css');
const globalsCss = await fs.readFile(globalsPath, 'utf8');
const cssResult = await postcss([
  tailwindcss({
    content: [
      path.join(repositoryRoot, 'app/**/*.{ts,tsx}'),
      path.join(repositoryRoot, 'components/**/*.{ts,tsx}'),
    ],
    plugins: [],
    theme: { extend: {} },
  }),
  autoprefixer,
]).process(globalsCss, {
  from: globalsPath,
});

const escapedJavascript = javascriptOutput.text.replaceAll(
  '</script>',
  '<\\/script>',
);
const escapedCss = cssResult.css.replaceAll('</style>', '<\\/style>');

const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; base-uri 'none'; connect-src 'none'; form-action 'none'; img-src data: blob:; object-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:"
    >
    <title>FlowMe 텍스트 저작 TA 테스트</title>
    <style>${escapedCss}</style>
  </head>
  <body>
    <div id="root"></div>
    <noscript>이 테스트 HTML은 JavaScript가 필요합니다.</noscript>
    <script>${escapedJavascript}</script>
  </body>
</html>
`;

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, html, 'utf8');

const outputStats = await fs.stat(outputPath);
console.log(
  JSON.stringify(
    {
      bytes: outputStats.size,
      output: path.relative(repositoryRoot, outputPath).replaceAll('\\', '/'),
    },
    null,
    2,
  ),
);
