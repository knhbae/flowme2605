import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES } from '@/lib/flow/personal-workspace-poc-authoring';
import { findPersonalWorkspacePocStructureTemplatePreview } from '@/lib/flow/personal-workspace-poc-structure-template';
import { PersonalWorkspacePocAuthoringTemplatePreview } from './PersonalWorkspacePocAuthoringSurface';

const source = readFileSync(new URL('./PersonalWorkspacePocAuthoringSurface.tsx', import.meta.url), 'utf8');
const encoded = (value: string) => renderToStaticMarkup(<span>{value}</span>).slice(6, -7);
const neverApply = () => { throw new Error('Rendering a preview must not apply source'); };

for (const template of PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES) {
  test(`K3A ${template.templateId}: exact scaffold first, exact completed source and technical metadata only inside closed disclosures`, () => {
    const structure = findPersonalWorkspacePocStructureTemplatePreview(template.templateId);
    assert.ok(structure);
    const before = JSON.stringify({ template, structure });
    const html = renderToStaticMarkup(<PersonalWorkspacePocAuthoringTemplatePreview template={template} structure={structure} disabled={false} onApplyScaffold={neverApply} onApplyExample={neverApply} />);
    const scaffold = html.match(/data-testid="personal-workspace-authoring-template-scaffold-source"[^>]*>([\s\S]*?)<\/pre>/u)?.[1];
    assert.equal(scaffold, encoded(template.scaffold));
    const example = html.match(/<details data-testid="personal-workspace-authoring-template-completed-example"[^>]*>([\s\S]*?)<\/details>/u)?.[1] ?? '';
    assert.equal(example.match(/data-testid="personal-workspace-authoring-template-example-source"[^>]*>([\s\S]*?)<\/pre>/u)?.[1], encoded(structure.expectedRawText));
    assert.match(example, /data-testid="personal-workspace-authoring-structure-materialize"/u);
    assert.match(example, /이 예시로 시작/u);
    const technical = html.match(/<details data-testid="personal-workspace-authoring-template-technical-details"[^>]*>([\s\S]*?)<\/details>/u)?.[1] ?? '';
    assert.match(technical, /StructureDraft/u);
    assert.ok(technical.includes(structure.contractVersion));
    const defaultSurface = html.replace(/<details\b[^>]*>[\s\S]*?<\/details>/gu, '');
    assert.match(defaultSurface, /빈 틀 넣기/u);
    assert.doesNotMatch(defaultSurface, /StructureDraft|컴파일|structure-materialize|template-example-source/u);
    assert.doesNotMatch(html, /<details[^>]*\bopen[=\s>]/u);
    assert.equal((html.match(/aria-live="polite"/gu) ?? []).length, 1);
    assert.equal(JSON.stringify({ template, structure }), before);
  });
}

test('K3A missing example metadata remains a visible alert and never invents a completed source', () => {
  const html = renderToStaticMarkup(<PersonalWorkspacePocAuthoringTemplatePreview template={PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES[0]} structure={null} disabled={false} onApplyScaffold={neverApply} onApplyExample={neverApply} />);
  assert.match(html, /role="alert"/u);
  assert.match(html, /빈 틀은 사용할 수 있습니다/u);
  assert.doesNotMatch(html, /<details|structure-materialize|template-example-source/u);
  assert.match(html, /template-scaffold-source/u);
});

test('K3A applying/recovery disables both explicit actions while preserving all preview bytes', () => {
  const template = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES[0];
  const structure = findPersonalWorkspacePocStructureTemplatePreview(template.templateId);
  const html = renderToStaticMarkup(<PersonalWorkspacePocAuthoringTemplatePreview template={template} structure={structure} disabled onApplyScaffold={neverApply} onApplyExample={neverApply} />);
  assert.equal((html.match(/disabled=""/gu) ?? []).length, 2);
  assert.match(source, /key=\{templatePreview\.templateId\}[\s\S]*disabled=\{pending\.current \|\| sourceHelperRecoveryRequired\.current\}/u);
  assert.match(source, /onApplyScaffold=\{\(\) => void applyTemplate\(templatePreview\.templateId\)\}/u);
  assert.match(source, /onApplyExample=\{\(\) => void applyStructureTemplatePreview\(\)\}/u);
  const preview = source.slice(source.indexOf('export function PersonalWorkspacePocAuthoringTemplatePreview'), source.indexOf('export type PersonalWorkspacePocAuthoringIdentity'));
  assert.doesNotMatch(preview, /setRawText|localStorage|setItem|removeItem|applyNativeReplacement/u);
});
