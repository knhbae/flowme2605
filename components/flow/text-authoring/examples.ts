import type { TextAuthoringOwnership } from '@/lib/flow/text-authoring/types';

import validatedExampleFixturesJson from './validated-examples.generated.json';

export type TextAuthoringExampleGroup =
  | 'existing_content'
  | 'condition_change'
  | 'compatibility'
  | 'error_boundary';

export const TEXT_AUTHORING_EXAMPLE_GROUPS: Array<{
  id: TextAuthoringExampleGroup;
  label: string;
}> = [
  {
    id: 'existing_content',
    label: '기존 FLOW 콘텐츠',
  },
  {
    id: 'condition_change',
    label: '날짜·반복 바꿔보기',
  },
  {
    id: 'compatibility',
    label: '이전 입력·표 형식',
  },
  {
    id: 'error_boundary',
    label: '검토가 필요한 입력',
  },
];

export type TextAuthoringExample = {
  id: string;
  scenarioId?: string;
  group?: TextAuthoringExampleGroup;
  label: string;
  shortcutLabel?: string;
  inputLabel: string;
  resultLabel: string;
  expectedResultLabel?: string;
  title: string;
  source: string;
  sourceTitle?: string;
  sourceUrl?: string;
  ownership?: TextAuthoringOwnership;
  rawText: string;
  previewAnchor?: string;
  summary?: string;
  boundary?: string;
};

export const SIMPLE_TEXT_AUTHORING_EXAMPLE: TextAuthoringExample = {
  id: 'simple',
  label: '작성 형식 한눈에',
  shortcutLabel: '작성 형식',
  inputLabel: 'Markdown',
  resultLabel: '할 일·캘린더',
  title: '제목입니다.',
  source: '작성 형식 예시',
  ownership: 'personal',
  rawText: `# 제목입니다.
- 기준일: 2026-08-10

## 첫 번째 단계입니다.
- [ ] 첫 번째 항목입니다.
  - 설명: 설명입니다.
  - 날짜: 2026-08-03
  - 시간: 09:00
  - 시간대: Asia/Seoul
  - 소요 시간: 30분
  - 반복: 매주 월요일
  - 장소: 장소입니다.
  - 조건: 조건입니다.
  - 자료: [참고 자료](https://example.com/resource)
  - 안내: 안내입니다.
  - 주의: 주의입니다.
  - 출처: [원문](https://example.com/source)
  - 완료 기준: 완료 기준입니다.

## 두 번째 단계입니다.
- [ ] 두 번째 항목입니다.
  - 설명: 기준일보다 3일 전에 실행합니다.
  - 상대 날짜: D-3
- [ ] 날짜 없는 항목입니다.
  - 설명: 날짜가 없으면 할 일에는 남고 캘린더에서는 빠집니다.`,
};

export const VALIDATED_TEXT_AUTHORING_EXAMPLES =
  validatedExampleFixturesJson as unknown as TextAuthoringExample[];

function requiredValidatedExample(
  scenarioId: string,
): TextAuthoringExample {
  const example = VALIDATED_TEXT_AUTHORING_EXAMPLES.find(
    (candidate) => candidate.scenarioId === scenarioId,
  );
  if (!example) {
    throw new Error(`Missing validated authoring example: ${scenarioId}`);
  }
  return example;
}

function quickExample(
  id: string,
  scenarioId: string,
  label: string,
  shortcutLabel: string,
): TextAuthoringExample {
  return {
    ...requiredValidatedExample(scenarioId),
    id,
    label,
    shortcutLabel,
  };
}

export const JEJU_PRODUCT_TEXT_AUTHORING_EXAMPLE: TextAuthoringExample = {
  ...requiredValidatedExample('content-jeju-memo-5'),
  id: 'jeju',
  label: '제주 여행 메모',
  shortcutLabel: '여행 메모 → 할 일',
  rawText: `# 제주 여행 준비
## 할 일
- [ ] 항공권 확인
- [ ] 숙소 예약번호 정리
- [ ] 렌터카 예약
- [ ] 준비물 체크
- [ ] 출발 전날 온라인 체크인`,
};

export const TEXT_AUTHORING_EXAMPLES: TextAuthoringExample[] = [
  SIMPLE_TEXT_AUTHORING_EXAMPLE,
  JEJU_PRODUCT_TEXT_AUTHORING_EXAMPLE,
  quickExample(
    'moving',
    'content-moving-d30',
    '이사 D-30 체크리스트 · 27개',
    '이사 D-30 → 캘린더',
  ),
  quickExample(
    'course',
    'content-kmooc-14',
    'K-MOOC 14주 학습표',
    'K-MOOC → 시트',
  ),
  quickExample(
    'allblanc',
    'content-allblanc-7day',
    'Allblanc 7일 복근 챌린지',
    '영상 7편 → 캘린더',
  ),
];
