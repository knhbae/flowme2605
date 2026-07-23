import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mapping = new Map([
  ['CAL-N01-BIRTH-REPORT', 'GB-01'],
  ['CAL-N02-GOOGLE-2FA', 'GB-02'],
  ['CAL-N03-LG-HUMIDIFIER', 'GB-03'],
  ['CAL-N04-LG-A9S-VIDEO', 'GB-04'],
  ['CAL-N05-EGG-ROLL-GIMBAP', 'GB-05'],
  ['CAL-N06-BOOKTRUST-QUEUE', 'GB-06'],
  ['CAL-N07-APPLE-BACKUP', 'GB-07'],
  ['CAL-N08-MMCA-GROUP', 'GB-08'],
  ['CAL-B01-NOTION-TEMPLATE', 'GB-09'],
  ['CAL-B02-CLASS101-PROMO', 'GB-10'],
  ['CAL-B03-OHOUSE-ADVICE', 'GB-11'],
  ['CAL-B04-SEOUL-KIDS-COLLECTION', 'GB-12'],
  ['HOLD-N01-RID-REISSUE', 'GB-13'],
  ['HOLD-N02-INFANT-CHECK', 'GB-14'],
  ['HOLD-N03-NHI-CURRICULUM', 'GB-15'],
  ['HOLD-N04-HOPPER-TEMPLATE', 'GB-16'],
  ['HOLD-B01-UK-IMMUNISATION', 'GB-17'],
  ['HOLD-B02-BUFFER-LIBRARY', 'GB-18'],
]);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function read(name) {
  return JSON.parse(fs.readFileSync(path.join(here, name), 'utf8'));
}

function write(name, value) {
  fs.writeFileSync(path.join(here, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function neutralize(document, name) {
  if (!Array.isArray(document.cases) || document.cases.length !== 18) {
    throw new Error(`${name} must contain 18 cases`);
  }
  document.cases = document.cases.map((entry) => {
    const caseId = mapping.get(entry.caseId);
    if (!caseId) throw new Error(`${name}: unmapped case ${entry.caseId}`);
    return { ...entry, caseId };
  });
  return document;
}

const manifest = neutralize(read('source-manifest-v1.json'), 'manifest');
const blind = neutralize(read('blind-source-packets-v1.json'), 'blind');
const gold = neutralize(read('gold-source-contract-v1.json'), 'gold');
const sealed = [...manifest.cases]
  .map(({ caseId, split }) => ({ caseId, split }))
  .sort((left, right) => left.caseId.localeCompare(right.caseId));
manifest.sealMetadata.sealedAt = new Date().toISOString();
manifest.sealMetadata.splitHash = crypto.createHash('sha256').update(canonicalJson(sealed)).digest('hex');

write('source-manifest-v1.json', manifest);
write('blind-source-packets-v1.json', blind);
write('gold-source-contract-v1.json', gold);

console.log(JSON.stringify({ caseCount: manifest.cases.length, splitHash: manifest.sealMetadata.splitHash }, null, 2));
