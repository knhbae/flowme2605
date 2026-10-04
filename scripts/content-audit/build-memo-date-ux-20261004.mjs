import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const templatePath = path.join(root, 'docs/content-audit/2026-10-04-flowme-memo-date-ux-assets/template.html');
const outputPath = path.join(root, 'docs/content-audit/2026-10-04-flowme-memo-date-ux-ko.html');
const model = readFileSync(path.join(root, 'lib/flow/integrated-poc/vendor/text-model.cjs'), 'utf8');
const input = readFileSync(path.join(root, 'lib/flow/integrated-poc/text-input-plan.cjs'), 'utf8');
const sha = value => createHash('sha256').update(value).digest('hex');
// Mechanical generation only. Author the template with apply_patch.
const scriptSafe = value => value.replace(/<\/script/gi, '<\\/script');
const replacements = { __VENDOR_MODEL__: scriptSafe(model), __INPUT_PLAN__: scriptSafe(input), __MODEL_SHA__: sha(model), __INPUT_SHA__: sha(input) };
let html = readFileSync(templatePath, 'utf8');
for (const [token, value] of Object.entries(replacements)) {
  if (!html.includes(token)) throw new Error(`Missing template token: ${token}`);
  html = html.replace(token, () => value);
}
if (/__(?:VENDOR_MODEL|INPUT_PLAN|MODEL_SHA|INPUT_SHA)__/.test(html)) throw new Error('Unresolved source token');
writeFileSync(outputPath, html, 'utf8');
console.log(JSON.stringify({ output: outputPath, bytes: Buffer.byteLength(html), modelSha256: sha(model), inputSha256: sha(input) }));
