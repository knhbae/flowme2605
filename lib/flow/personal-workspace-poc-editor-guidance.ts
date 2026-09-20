import { analyzePersonalWorkspacePocAuthoringFidelity } from './personal-workspace-poc-authoring-fidelity';
import { projectPersonalWorkspacePocAuthoringSourceLines } from './personal-workspace-poc-source-editor';
import type { PersonalWorkspacePocLiveEditorLineGuide } from './personal-workspace-poc-editor-presentation';

type ProjectionInput = Parameters<typeof projectPersonalWorkspacePocAuthoringSourceLines>[0];

/** K3-A adapter of the existing React line mapping; never supplies source text. */
export function buildPersonalWorkspacePocEditorLineGuides(
  input: ProjectionInput & Readonly<{ issues?: readonly Readonly<{ line: number; message: string }>[] }>,
): readonly PersonalWorkspacePocLiveEditorLineGuide[] {
  const projection = projectPersonalWorkspacePocAuthoringSourceLines(input);
  const manifest = input.fidelityManifest ?? analyzePersonalWorkspacePocAuthoringFidelity({
    rawText: input.rawText,
    sourceFingerprint: input.sourceFingerprint,
  }).manifest;
  const sourceLines = new Map(manifest.sourceLines.map(line => [line.line, line]));
  return projection.lines.map(line => {
    const sourceKind = sourceLines.get(line.line)?.kind;
    const issue = input.issues?.find(entry => entry.line === line.line);
    const kind = line.reason === 'unsupported' ? 'unsupported'
      : line.reason === 'protected' ? 'protected'
        : line.reason === 'incomplete' ? 'incomplete' : 'safe';
    return {
      line: line.line,
      kind,
      role: sourceKind === 'title' ? 'title'
        : sourceKind === 'section' ? 'section'
          : sourceKind === 'item' ? 'task'
            : sourceKind === 'property' ? 'property' : 'prose',
      hierarchyDepth: line.hierarchyDepth,
      showHierarchyGuide: line.showHierarchyGuide,
      ...(line.presentationText ? { presentationText: line.presentationText } : {}),
      ...(issue ? { reviewMessage: issue.message } : {}),
      ...(line.ghost ? {
        ghost: {
          valueStart: line.ghost.valueLocator.valueStartOffset - line.source.startOffset,
          valueEnd: line.ghost.valueLocator.valueEndOffset - line.source.startOffset,
          expectedValue: '' as const,
          text: line.ghost.text,
        },
      } : {}),
    };
  });
}
