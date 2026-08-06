import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS,
} from '../../lib/flow/text-authoring/grammar-simulation-cases';
import type {
  GrammarSimulationScenario,
} from '../../lib/flow/text-authoring/grammar-simulation';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..', '..');
const outputPath = path.join(
  repositoryRoot,
  'components',
  'flow',
  'text-authoring',
  'validated-examples.generated.json',
);

const INPUT_KIND_LABELS = {
  markdown: 'Markdown',
  mixed: '혼합 입력',
  plain_text: '일반 메모',
  table: '표',
  url: 'URL',
} as const;

const RESULT_LABELS = {
  calendar: '캘린더',
  memo: '메모',
  review: '검토 필요',
  sheet: '시트',
  todo: '할 일',
} as const;

function inferInputLabel(scenario: GrammarSimulationScenario): string {
  const [primaryKind] = scenario.expected.inputKinds ?? [];
  if (primaryKind) return INPUT_KIND_LABELS[primaryKind];
  if (/^(?:https?:\/\/)\S+$/u.test(scenario.rawText.trim())) return 'URL';
  if (
    scenario.rawText.includes('\t') ||
    /^\|.+\|$/mu.test(scenario.rawText) ||
    /^[^,\n]+,[^,\n]+,[^,\n]+$/mu.test(scenario.rawText)
  ) {
    return '표';
  }
  if (
    /^#{1,6}\s+/mu.test(scenario.rawText) ||
    /^\s*-\s+(?:\[[ xX]\]\s+)?/mu.test(scenario.rawText)
  ) {
    return 'Markdown';
  }
  return '일반 메모';
}

function expectedResultLabel(scenario: GrammarSimulationScenario): string {
  if (scenario.naturalDestination === 'review') {
    return `검토 필요 ${scenario.expected.issueCount ?? 0}건`;
  }
  const count = scenario.expected.itemCount ?? 0;
  return `${RESULT_LABELS[scenario.naturalDestination]} ${count}개`;
}

const examples = TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS.map(
  (scenario) => {
    const sourceTitle = scenario.options?.sourceTitle;
    const sourceUrl =
      scenario.options?.sourceUrl ?? scenario.sourceReference;
    return {
      id: scenario.id,
      scenarioId: scenario.id,
      group: scenario.group,
      label: scenario.title,
      inputLabel: inferInputLabel(scenario),
      resultLabel: RESULT_LABELS[scenario.naturalDestination],
      expectedResultLabel: expectedResultLabel(scenario),
      title:
        scenario.options?.title ??
        scenario.expected.title ??
        scenario.title,
      source:
        sourceUrl ??
        sourceTitle ??
        (scenario.group === 'existing_content'
          ? '기존 FLOW 콘텐츠'
          : '문법 검증 예시'),
      ...(sourceTitle ? { sourceTitle } : {}),
      ...(sourceUrl ? { sourceUrl } : {}),
      ownership: scenario.options?.ownership ?? 'personal',
      rawText: scenario.rawText,
      ...(scenario.anchor ? { previewAnchor: scenario.anchor } : {}),
      summary: scenario.summary,
      boundary: scenario.boundary,
    };
  },
);

async function main(): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(examples, null, 2)}\n`,
    'utf8',
  );

  console.log(
    JSON.stringify(
      {
        count: examples.length,
        output: path.relative(repositoryRoot, outputPath).replaceAll('\\', '/'),
      },
      null,
      2,
    ),
  );
}

void main();
