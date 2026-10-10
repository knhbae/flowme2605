import type { ProgramCreatorWorking } from '../creator-workspace-contract';
import type { PersonalWorkspacePocCreatorDraftAction } from '../../personal-workspace-poc-creator-drafts';
import type { AuthoringCorrectionOperation } from '../native-creator-document-contract';
import type { stageProgramNativeSourceUpdate, transitionProgramNativeSourceUpdate } from '../creator-native-source-store';
import type { ProgramNativeLineageMapping } from '../creator-native-lineage-contract';
import type { CreatorUpdateChoice, CreatorUpdatePreview } from '../creator-update';
import { programIdentifier, programShape } from '../program-data';
import { isProgramCreatorDraftJson } from '../creator-draft-provenance';
import { validateProgramCreatorWorking } from '../creator-workspace-validation';
import { canonicalJson, detached } from '../alpha-persistence/json';

export const ALPHA_CREATOR_COMMAND_SCHEMA = 'flowme-alpha-creator-command/1' as const;
type LibraryAction = Exclude<PersonalWorkspacePocCreatorDraftAction, { type: 'undo' } | { type: 'cancel' }>;
type StageInput = Parameters<typeof stageProgramNativeSourceUpdate>[1];
type SourceEvent = Parameters<typeof transitionProgramNativeSourceUpdate>[1]['event'];
export type AlphaCreatorIntent = { now: string } & (
  | { type: 'working'; working: ProgramCreatorWorking | null }
  | { type: 'library-action'; action: LibraryAction }
  | { type: 'catalog-content-import'; draftId: string; sourceSlug: string; sourceVersionId: string }
  | { type: 'catalog-library-import'; catalogVersion: string }
  | { type: 'native-operation'; draftId: string; operation: AuthoringCorrectionOperation }
  | { type: 'source-stage'; draftId: string; envelope: StageInput['envelope']; candidateDocument: StageInput['candidateDocument']; matches?: StageInput['matches']; projectionOptions?: StageInput['projectionOptions']; replaceSession?: boolean }
  | { type: 'source-transition'; draftId: string; event: SourceEvent }
  | { type: 'source-upgrade'; draftId: string }
  | { type: 'history-restore'; draftId: string; revisionId: string }
  | { type: 'raw-handoff'; draftId: string; expectedRecordRevision: number; today: string }
  | { type: 'native-handoff'; draftId: string; anchor?: string; choices: Record<string, CreatorUpdateChoice> }
  | { type: 'native-lineage'; draftId: string; anchor?: string; mapping: ProgramNativeLineageMapping }
  | { type: 'raw-update'; draftId: string; choices: Record<string, CreatorUpdateChoice> }
);
export type AlphaCreatorCommand = { schema: typeof ALPHA_CREATOR_COMMAND_SCHEMA; kind: 'creator'; requestId: string; expectedRevision: number; intent: AlphaCreatorIntent };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const shape = (v: Record<string, unknown>, required: string[], optional: string[] = []) => required.every(k => Object.hasOwn(v, k)) && Object.keys(v).every(k => required.includes(k) || optional.includes(k));
const stamp = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const positive = (v: unknown) => Number.isSafeInteger(v) && Number(v) > 0;
function choices(v: unknown, descriptorKeys = false): boolean {
  return object(v) && Object.keys(v).length <= 2000 && Object.entries(v).every(([key, row]) => (descriptorKeys ? key.length > 0 && key.length <= 600000 : programIdentifier(key)) && object(row)
    && shape(row, ['source', 'date', 'time', 'children']) && Object.values(row).every(value => value === 'keep' || value === 'incoming'));
}
function action(v: unknown, now: string): boolean {
  if (!object(v) || v.now !== now || !Number.isSafeInteger(v.expectedLibraryRevision) || Number(v.expectedLibraryRevision) < 0) return false;
  if (v.type === 'save') return shape(v, ['type', 'expectedLibraryRevision', 'draftId', 'rawText', 'sourceFingerprint', 'now'], ['expectedRecordRevision', 'title', 'templateId'])
    && programIdentifier(v.draftId) && typeof v.rawText === 'string' && v.rawText.length <= 100000 && typeof v.sourceFingerprint === 'string'
    && (v.expectedRecordRevision === undefined || positive(v.expectedRecordRevision)) && (v.title === undefined || typeof v.title === 'string') && (v.templateId === undefined || typeof v.templateId === 'string');
  if (v.type === 'duplicate') return shape(v, ['type', 'expectedLibraryRevision', 'expectedSourceRecordRevision', 'sourceDraftId', 'newDraftId', 'now'])
    && positive(v.expectedSourceRecordRevision) && programIdentifier(v.sourceDraftId) && programIdentifier(v.newDraftId);
  return ['rename', 'archive', 'restore'].includes(v.type as string)
    && shape(v, ['type', 'expectedLibraryRevision', 'expectedRecordRevision', 'draftId', 'now', ...(v.type === 'rename' ? ['title'] : [])])
    && positive(v.expectedRecordRevision) && programIdentifier(v.draftId) && (v.type !== 'rename' || typeof v.title === 'string');
}
export function isAlphaCreatorIntent(value: unknown): value is AlphaCreatorIntent {
  try {
    if (!isProgramCreatorDraftJson(value) || !object(value) || !stamp(value.now)) return false;
    if (value.type === 'working') return shape(value, ['type', 'now', 'working']) && (value.working === null || validateProgramCreatorWorking(value.working));
    if (value.type === 'library-action') return shape(value, ['type', 'now', 'action']) && action(value.action, value.now);
    if (value.type === 'catalog-library-import') return shape(value, ['type', 'now', 'catalogVersion']) && programIdentifier(value.catalogVersion);
    if (!programIdentifier(value.draftId)) return false;
    const base = ['type', 'now', 'draftId'];
    switch (value.type) {
      case 'catalog-content-import': return shape(value, [...base, 'sourceSlug', 'sourceVersionId'])
        && programIdentifier(value.sourceSlug) && programIdentifier(value.sourceVersionId);
      case 'native-operation': return shape(value, [...base, 'operation']) && object(value.operation) && typeof value.operation.type === 'string';
      case 'source-stage': return shape(value, [...base, 'envelope', 'candidateDocument'], ['matches', 'projectionOptions', 'replaceSession'])
        && object(value.envelope) && object(value.candidateDocument) && (value.matches === undefined || Array.isArray(value.matches))
        && (value.projectionOptions === undefined || object(value.projectionOptions)) && (value.replaceSession === undefined || typeof value.replaceSession === 'boolean');
      case 'source-transition': return shape(value, [...base, 'event']) && object(value.event) && typeof value.event.kind === 'string';
      case 'source-upgrade': return shape(value, base);
      case 'history-restore': return shape(value, [...base, 'revisionId']) && programIdentifier(value.revisionId);
      case 'raw-handoff': return shape(value, [...base, 'expectedRecordRevision', 'today']) && positive(value.expectedRecordRevision) && typeof value.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.today);
      case 'native-handoff': return shape(value, [...base, 'choices'], ['anchor']) && choices(value.choices) && (value.anchor === undefined || typeof value.anchor === 'string');
      case 'native-lineage': return shape(value, [...base, 'mapping'], ['anchor']) && object(value.mapping) && shape(value.mapping, ['items', 'remaining'])
        && object(value.mapping.items) && object(value.mapping.remaining) && Object.values(value.mapping.items).every(v => typeof v === 'string')
        && Object.values(value.mapping.remaining).every(v => v === 'keep' || v === 'retain') && (value.anchor === undefined || typeof value.anchor === 'string');
      case 'raw-update': return shape(value, [...base, 'choices']) && choices(value.choices, true);
      default: return false;
    }
  } catch { return false; }
}
export function isAlphaCreatorCommand(value: unknown): value is AlphaCreatorCommand {
  try {
    const v = detached(value);
    return programShape(v, ['schema', 'kind', 'requestId', 'expectedRevision', 'intent']) && v.schema === ALPHA_CREATOR_COMMAND_SCHEMA && v.kind === 'creator'
      && programIdentifier(v.requestId) && v.requestId.length <= 160 && Number.isSafeInteger(v.expectedRevision) && Number(v.expectedRevision) >= 0 && isAlphaCreatorIntent(v.intent);
  } catch { return false; }
}
export const validateAlphaCreatorCommand = isAlphaCreatorCommand;

/** Selection locators within one CAS-bound preview, not inferred execution identities.
 * Full descriptor bytes avoid hash collisions. Random preview/row IDs are omitted. */
export function alphaCreatorRawUpdateRowKey(preview: CreatorUpdatePreview, index: number): string {
  const row = preview.rows[index]; if (!row) throw Error('alpha-creator-row-missing');
  const { id: _id, ...descriptor } = row;
  return canonicalJson({ index, ...descriptor });
}
export function normalizeAlphaCreatorRawUpdateChoices(preview: CreatorUpdatePreview, selected: Record<string, CreatorUpdateChoice>): Record<string, CreatorUpdateChoice> {
  if (Object.keys(selected).some(id => !preview.rows.some(row => row.id === id))) throw Error('alpha-creator-choice-missing');
  return Object.fromEntries(preview.rows.flatMap((row, index) => selected[row.id] ? [[alphaCreatorRawUpdateRowKey(preview, index), detached(selected[row.id])]] : []));
}
