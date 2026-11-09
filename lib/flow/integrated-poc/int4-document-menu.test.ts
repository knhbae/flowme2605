import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// int4 (11/9): the writing document's ⋯ menu shows the one publication entry F5-b defines for that document
// (programPublicationDocumentEntry): 공개하기 opens the steps at ① 고르기, 공개 이어서 at its draft's ② 다듬기 (both after the
// document's input is saved, as before), 공개 관리 · 버전 n goes to 나's management screen through the host's navigate. The
// step lives in the host's state only (no stored navigation changes). The 나/이야기 screens sit on paper (F6-B1).
const read = (name: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('the ⋯ menu entry: one of three by where the document is; manage navigates, the other two open the steps after saving', () => {
  const space = read('ProgramSpace.tsx');
  assert(space.includes("const publicationEntry = selectedDoc && props.capabilities?.publication !== false && props.onPublishDocument ? programPublicationDocumentEntry(data, selectedDoc.id) : null;"));
  assert(space.includes("{publicationEntry && <button disabled={preparingDocumentAction} data-publication-entry={publicationEntry.kind} onClick={() => {"));
  assert(space.includes("if (publicationEntry.kind !== 'manage') { void openDocumentAction(id => props.onPublishDocument!(id, publicationEntry.initialStep), { modalReturnFocus: true }); return; }"));
  assert(space.includes("props.navigate({ view: 'activity', id: publicationEntry.flowId });"));
  assert(space.includes('}}>{publicationEntry.label}</button>}'));
  assert(!space.includes('>선택해서 공개</button>'));
  assert(space.includes("onPublishDocument?: (documentId: string, step?: 'pick' | 'refine') => void;"));
});

test('the host keeps the step for the publisher it opens (not stored) and resets it on close', () => {
  const alpha = read('AlphaWorkspace.tsx');
  assert(alpha.includes("const [publisherStep, setPublisherStep] = useState<'pick' | 'refine'>('pick');"));
  assert(alpha.includes("onPublishDocument={(id, step) => { setPublisherStep(step ?? 'pick'); setPublisher(id); }}"));
  assert(alpha.includes("initialStep={publisherStep} onClose={() => { setPublisher(null); setPublisherStep('pick'); }}"));
});

test('나 and 이야기 sit on paper', () => {
  assert(read('ProgramCommunity.module.css').includes('.community { max-width: 820px; margin: 0 auto; padding: 24px; color: var(--flowme-b-ink); background: var(--flowme-b-paper);'));
});
