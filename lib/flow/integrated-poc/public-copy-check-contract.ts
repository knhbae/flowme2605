import { PROGRAM_COPY_CHECK_RESOLUTION, type ProgramCopy, type ProgramPrivateSpace, type ProgramPublicItem, type ProgramPublicRepository } from './contract';
import { textWorkspaceModel as M } from './text-workspace';

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v)) && !Object.getOwnPropertySymbols(v).length
  && Object.entries(Object.getOwnPropertyDescriptors(v)).every(([k, d]) => !['__proto__', 'constructor', 'prototype'].includes(k) && d.enumerable && 'value' in d);
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const id = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && v.length <= 1200 && !['__proto__', 'constructor', 'prototype'].includes(v);
const title = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && v.length <= 500 && !/[\r\n]/.test(v);

export function validateProgramCopyCheckResolutions(copy: ProgramCopy, space: ProgramPrivateSpace, repository: ProgramPublicRepository): boolean {
  if (copy.checkResolutions === undefined) return true;
  try {
    const history = copy.checkResolutions;
    if (!record(history) || !exact(history, ['version', 'entries']) || history.version !== PROGRAM_COPY_CHECK_RESOLUTION.version
      || !Array.isArray(history.entries) || !history.entries.length || history.entries.length > PROGRAM_COPY_CHECK_RESOLUTION.entries) return false;
    const requests = new Set<string>(), docs = [...space.text.documents, ...space.text.flows];
    for (const entry of history.entries) {
      if (!record(entry) || !exact(entry, ['id', 'itemId', 'fromVersionId', 'toVersionId', 'at', 'decisions'])
        || ![entry.id, entry.itemId, entry.fromVersionId, entry.toVersionId].every(id) || !Object.hasOwn(copy.itemLines, entry.itemId) || requests.has(entry.id)
        || typeof entry.at !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(entry.at) || !Number.isFinite(Date.parse(entry.at)) || new Date(entry.at).toISOString() !== entry.at
        || !Array.isArray(entry.decisions) || !entry.decisions.length || entry.decisions.length > 500) return false;
      const versions = [entry.fromVersionId, entry.toVersionId].map(v => repository.versions.filter(row => row.id === v && row.flowId === copy.flowId));
      if (versions.some(rows => rows.length !== 1)) return false;
      const [before, incoming] = versions.map(rows => rows[0].items.find(row => row.id === entry.itemId));
      if (!before || !incoming) return false;
      const children = new Set<string>();
      for (const decision of entry.decisions) {
        if (!record(decision) || !exact(decision, ['childId', 'lineId', 'previousTitle', 'incomingTitle', 'choice'])
          || !id(decision.childId) || !id(decision.lineId) || !title(decision.previousTitle) || !title(decision.incomingTitle)
          || !['keep-private', 'accept-source'].includes(decision.choice as string) || children.has(decision.childId)
          || before.subchecks.some(row => row.id === decision.childId) || incoming.subchecks.find(row => row.id === decision.childId)?.title.trim() !== decision.incomingTitle
          || decision.previousTitle === decision.incomingTitle) return false;
        const pair = copy.kindHandoffs?.items[entry.itemId];
        if (![copy.subcheckLines[entry.itemId]?.[decision.childId], pair?.ordinary.subcheckLines[decision.childId], pair?.recurring.subcheckLines[decision.childId]].includes(decision.lineId)
          || docs.flatMap(doc => doc.lines).filter(line => line.id === decision.lineId).length !== 1) return false;
        children.add(decision.childId);
      }
      requests.add(entry.id);
    }
    return true;
  } catch { return false; }
}

/** Only the explicitly retained wording of this active form is a personal projection.
 * Immutable public/source-facts readers never call this helper. */
export function programCopyEffectiveChecks(copy: ProgramCopy, space: ProgramPrivateSpace, item: ProgramPublicItem): ProgramPublicItem['subchecks'] {
  const versionId = copy.appliedFields[item.id]?.subchecks ?? copy.baseVersionId;
  const entry = [...(copy.checkResolutions?.entries ?? [])].reverse().find(entry => entry.itemId === item.id && entry.toVersionId === versionId);
  if (!entry) return item.subchecks;
  const doc = M.getDocument(space.text, copy.documentId), recurring = copy.recurrence?.itemIds.includes(item.id);
  if (!doc) return item.subchecks;
  return item.subchecks.map(child => {
    const decision = entry.decisions.find(row => row.childId === child.id && row.choice === 'keep-private' && row.lineId === copy.subcheckLines[item.id]?.[child.id]);
    if (!decision) return child;
    const line = doc.lines.find(row => row.id === decision.lineId), value = line?.text.trimStart();
    const privateTitle = recurring ? value?.startsWith('반복 확인: ') ? value.slice('반복 확인: '.length).trim() : null
      : M.parseDocument(doc, space.text).items.find(row => row.id === decision.lineId)?.title;
    return title(privateTitle) ? { ...child, title: privateTitle } : child;
  });
}
