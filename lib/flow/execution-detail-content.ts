import type { FlowItemDetail } from './types';

export type ExecutionDetailResource = {
  label: string;
  url: string;
  type: NonNullable<FlowItemDetail['links']>[number]['type'];
};

export type ExecutionDetailContent = {
  checklistItems: string[];
  resources: ExecutionDetailResource[];
  referenceNotes: string[];
};

const RESOURCE_METADATA_PATTERN = /^(?:영상|원본\s*영상|URL|링크|자료|요약)\s*:/u;
const URL_PATTERN = /https?:\/\/[^\s)\]}>,]+/u;

function normalizeHowLines(value?: string): string[] {
  return (value ?? '')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/u.test(line))
    .map((line) => line.replace(/^[-*]\s+/u, '').trim())
    .filter(Boolean);
}

export function splitExecutionDetailContent(detail?: FlowItemDetail): ExecutionDetailContent {
  const resources: ExecutionDetailResource[] = (detail?.links ?? []).map((link) => ({ ...link }));
  const resourceUrls = new Set(resources.map((resource) => resource.url));
  const checklistItems: string[] = [];
  const referenceNotes: string[] = [];
  let pendingResourceLabel = '';

  for (const line of normalizeHowLines(detail?.how)) {
    if (!RESOURCE_METADATA_PATTERN.test(line) && !URL_PATTERN.test(line)) {
      checklistItems.push(line);
      continue;
    }

    const [prefix, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (/^(?:영상|원본\s*영상)$/u.test(prefix.trim()) && value) {
      pendingResourceLabel = value;
      referenceNotes.push(line);
      continue;
    }

    const url = line.match(URL_PATTERN)?.[0];
    if (url && !resourceUrls.has(url)) {
      resources.push({ label: pendingResourceLabel || '원본 자료', url, type: 'reference' });
      resourceUrls.add(url);
    }
    referenceNotes.push(line);
  }

  return { checklistItems, resources, referenceNotes };
}
