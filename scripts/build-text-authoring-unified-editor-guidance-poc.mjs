import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const predecessorPath = path.join(
  repositoryRoot,
  "docs",
  "content-audit",
  "2026-08-29-flowme-text-authoring-property-reentry-simplicity-poc-results",
  "flowme-text-authoring-property-reentry-simplicity-poc.html",
);
const prototypeDirectory = path.join(
  repositoryRoot,
  "docs",
  "specs",
  "2026-08-30-flowme-text-authoring-unified-editor-guidance-poc",
  "prototype",
);
const outputPath = path.join(
  repositoryRoot,
  "docs",
  "content-audit",
  "2026-08-30-flowme-text-authoring-unified-editor-guidance-poc-results",
  "flowme-text-authoring-unified-editor-guidance-poc.html",
);
const templateScaffoldPath = path.join(
  prototypeDirectory,
  "unified-editor-template-scaffolds.mjs",
);
const temporaryBasePath = path.join(path.dirname(outputPath), ".unified-editor-base.tmp.html");
const expectedPredecessorSha256 =
  "9DE9B546A72E747CEC782AC3DED0F46AFAC4DD55A5754C18D10E85C527F17FDF";
const inheritedStyleIds = Object.freeze([
  "flowme-continuous-live-editor-styles",
  "flowme-stable-anchor-keyboard-styles",
  "flowme-property-reentry-simplicity-styles",
]);
const inheritedScriptIds = Object.freeze([
  "flowme-continuous-live-editor-script",
  "flowme-stable-anchor-keyboard-script",
  "flowme-property-reentry-simplicity-script",
]);
const inheritedStableKeyboardGuard =
  'if (!safe || (event.target !== safe.content && !layer?.contains(event.target))) return;';

function sha256(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

function relativePath(filePath) {
  return path.relative(repositoryRoot, filePath).replaceAll(path.sep, "/");
}

function normalizeEmbeddedText(value) {
  return value.replace(/\r\n?/gu, "\n");
}

function extractElement(html, tagName, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(
    `<${tagName}\\b(?=[^>]*\\bid=["']${escapedId}["'])[^>]*>[\\s\\S]*?<\\/${tagName}>`,
    "iu",
  );
  const match = pattern.exec(html);
  if (!match) throw new Error(`Inherited ${tagName}#${id} was not found.`);
  return match[0];
}

function addUnifiedTemplateKeyboardBypass(scriptElement, id) {
  if (id !== "flowme-stable-anchor-keyboard-script") return scriptElement;
  const matchCount = scriptElement.split(inheritedStableKeyboardGuard).length - 1;
  if (matchCount !== 1) {
    throw new Error(`Inherited keyboard guard drift: expected 1 match, received ${matchCount}.`);
  }
  return scriptElement.replace(
    inheritedStableKeyboardGuard,
    () => [
      "if (",
      "  event.target instanceof Element",
      "  && event.target.closest('[data-unified-template-entry=\"true\"]')",
      '  && (event.key === "Enter" || event.key === " ")',
      ") return;",
      inheritedStableKeyboardGuard,
    ].join("\n  "),
  );
}

async function readAndVerify(filePath, expectedSha256, label) {
  const buffer = await readFile(filePath);
  const actualSha256 = sha256(buffer);
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `${label} drift: expected ${expectedSha256}, received ${actualSha256} (${relativePath(filePath)}).`,
    );
  }
  return { buffer, sha256: actualSha256 };
}

await mkdir(path.dirname(outputPath), { recursive: true });
const predecessor = await readAndVerify(
  predecessorPath,
  expectedPredecessorSha256,
  "Predecessor",
);
const templateScaffoldSha256 = sha256(
  normalizeEmbeddedText(await readFile(templateScaffoldPath, "utf8")),
);

const predecessorHtml = predecessor.buffer.toString("utf8");
const inheritedStyles = inheritedStyleIds.map((id) => extractElement(predecessorHtml, "style", id));
const inheritedScripts = inheritedScriptIds.map((id) => addUnifiedTemplateKeyboardBypass(
  extractElement(predecessorHtml, "script", id),
  id,
));
const css = normalizeEmbeddedText(
  await readFile(path.join(prototypeDirectory, "unified-editor-guidance.css"), "utf8"),
);
const bundle = await build({
  entryPoints: [path.join(prototypeDirectory, "unified-editor-guidance.mjs")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  write: false,
  sourcemap: false,
  legalComments: "none",
  logLevel: "silent",
});
const javascript = normalizeEmbeddedText(bundle.outputFiles[0].text);
if (/<\/script/iu.test(javascript)) {
  throw new Error("Unified-editor module contains a closing script token.");
}
if (/<\/style/iu.test(css)) {
  throw new Error("Unified-editor stylesheet contains a closing style token.");
}

try {
  await execFileAsync(
    process.execPath,
    [
      path.join(scriptDirectory, "build-text-authoring-standalone.mjs"),
      relativePath(temporaryBasePath),
      "--product",
      "--flow-view-poc",
    ],
    { cwd: repositoryRoot, windowsHide: true, maxBuffer: 1024 * 1024 * 8 },
  );
  let html = await readFile(temporaryBasePath, "utf8");
  const provenance = [
    "<!--",
    "FLOWME_TEXT_AUTHORING_UNIFIED_EDITOR_GUIDANCE_POC",
    `immutable-ux-predecessor-sha256: ${predecessor.sha256}`,
    `template-scaffold-snapshot-sha256: ${templateScaffoldSha256}`,
    `unified-editor-js-sha256: ${sha256(javascript)}`,
    `unified-editor-css-sha256: ${sha256(css)}`,
    "runtime-base: rebuilt from current local source so blank-scaffold parser behavior is real, not visually masked",
    "boundary: isolated local successor; production route/store/schema unchanged",
    "interaction: one existing CodeMirror buffer; optional template insertion; editor-wide presentation-only examples",
    "observed-user-sessions: 0",
    "-->",
  ].join("\n");
  html = html.replace(
    /<title>([^<]*)<\/title>/iu,
    "<title>FlowMe Text Authoring · 한 편집기 작성 틀과 입력 예시 PoC</title>",
  );
  html = html.replace(
    "</head>",
    () => `${inheritedStyles.join("\n")}\n<style id="flowme-unified-editor-guidance-styles">\n${css}\n</style>\n${provenance}\n</head>`,
  );
  html = html.replace(
    "</body>",
    () => `${inheritedScripts.join("\n")}\n<script id="flowme-unified-editor-guidance-script" type="module">\n${javascript}\n</script>\n</body>`,
  );
  await writeFile(outputPath, html, "utf8");
} finally {
  await rm(temporaryBasePath, { force: true });
}

const [outputBuffer, predecessorAfter] = await Promise.all([
  readFile(outputPath),
  readFile(predecessorPath),
]);
const predecessorAfterSha256 = sha256(predecessorAfter);
if (predecessorAfterSha256 !== expectedPredecessorSha256) {
  throw new Error("Predecessor changed while the successor was being built.");
}
process.stdout.write(`${JSON.stringify({
  predecessor: relativePath(predecessorPath),
  predecessorBeforeSha256: predecessor.sha256,
  predecessorAfterSha256,
  predecessorUnchanged: predecessor.sha256 === predecessorAfterSha256,
  templateScaffold: relativePath(templateScaffoldPath),
  templateScaffoldSha256,
  output: relativePath(outputPath),
  outputBytes: outputBuffer.byteLength,
  outputSha256: sha256(outputBuffer),
  javascriptSha256: sha256(javascript),
  cssSha256: sha256(css),
}, null, 2)}\n`);
