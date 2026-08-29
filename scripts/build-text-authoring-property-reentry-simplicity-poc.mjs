import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const predecessorPath = path.join(
  repositoryRoot,
  "docs",
  "content-audit",
  "2026-08-29-flowme-text-authoring-keyboard-property-tray-reliability-poc-results",
  "flowme-text-authoring-keyboard-property-tray-reliability-poc.html",
);
const prototypeDirectory = path.join(
  repositoryRoot,
  "docs",
  "specs",
  "2026-08-29-flowme-text-authoring-property-reentry-simplicity-poc",
  "prototype",
);
const outputPath = path.join(
  repositoryRoot,
  "docs",
  "content-audit",
  "2026-08-29-flowme-text-authoring-property-reentry-simplicity-poc-results",
  "flowme-text-authoring-property-reentry-simplicity-poc.html",
);
const expectedPredecessorSha256 =
  "C0BC3D6ECE3DB98AB48E6FDC5C3A186A129BB44B4614CAA8B2547F6A41A992E7";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

function normalizeEmbeddedText(value) {
  return value.replace(/\r\n?/gu, "\n");
}

const [predecessorBuffer, successorCssSource, successorJavascriptSource] = await Promise.all([
  readFile(predecessorPath),
  readFile(path.join(prototypeDirectory, "property-reentry-simplicity.css"), "utf8"),
  readFile(path.join(prototypeDirectory, "property-reentry-simplicity.mjs"), "utf8"),
]);
const successorCss = normalizeEmbeddedText(successorCssSource);
const successorJavascript = normalizeEmbeddedText(successorJavascriptSource);

const predecessorSha256 = sha256(predecessorBuffer);
if (predecessorSha256 !== expectedPredecessorSha256) {
  throw new Error(
    `Predecessor drift: expected ${expectedPredecessorSha256}, received ${predecessorSha256}.`,
  );
}
if (/<\/script/iu.test(successorJavascript)) {
  throw new Error("Successor module contains a closing script token.");
}

const provenance = [
  "<!--",
  "FLOWME_TEXT_AUTHORING_PROPERTY_REENTRY_SIMPLICITY_POC",
  `immutable-predecessor-sha256: ${predecessorSha256}`,
  `property-reentry-simplicity-js-sha256: ${sha256(successorJavascript)}`,
  `property-reentry-simplicity-css-sha256: ${sha256(successorCss)}`,
  "boundary: isolated local successor; no production route/store/schema integration",
  "interaction: property label re-entry targets value; actual-value tray; same-surface grouping",
  "observed-user-sessions: 0",
  "-->",
].join("\n");

let html = predecessorBuffer.toString("utf8");
html = html.replace(
  /<title>([^<]*)<\/title>/iu,
  "<title>FlowMe Text Authoring · 속성 재진입·단순화 PoC</title>",
);
html = html.replace(
  "</head>",
  `<style id="flowme-property-reentry-simplicity-styles">\n${successorCss}\n</style>\n${provenance}\n</head>`,
);
html = html.replace(
  "</body>",
  `<script id="flowme-property-reentry-simplicity-script" type="module">\n${successorJavascript}\n</script>\n</body>`,
);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, html, "utf8");

const [outputBuffer, predecessorAfterBuffer] = await Promise.all([
  readFile(outputPath),
  readFile(predecessorPath),
]);
const predecessorAfterSha256 = sha256(predecessorAfterBuffer);
if (predecessorAfterSha256 !== expectedPredecessorSha256) {
  throw new Error("Predecessor changed while successor was being built.");
}

process.stdout.write(`${JSON.stringify({
  predecessor: path.relative(repositoryRoot, predecessorPath),
  predecessorBytes: predecessorBuffer.byteLength,
  predecessorSha256,
  output: path.relative(repositoryRoot, outputPath),
  outputBytes: outputBuffer.byteLength,
  outputSha256: sha256(outputBuffer),
  successorJavascriptSha256: sha256(successorJavascript),
  successorCssSha256: sha256(successorCss),
}, null, 2)}\n`);
