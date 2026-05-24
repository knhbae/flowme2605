# FLOW Quality Rules

FLOW 품질 기준은 좁고 딱딱한 금지 목록이 아니다. 콘텐츠 유형과 사용자 목적에 따라 달라지는 실행 품질을 판단하기 위한 운영 체계다.

## Current Addendum

- [Study progress table rules](./study-progress-tables.md): use a progress table only when the source has table-of-contents, curriculum, exam-scope, past-exam, weekly-plan, lesson, or assignment rows the creator can bring into FLOW.
- [Validation evidence](./validation-evidence.md): reserve `validated` for routes with real user behavior data, not internal QA or screenshots.

## How To Use

1. [Research basis](./research-basis.md)를 확인해 외부 UX/content 기준이 어떤 방향을 가리키는지 이해한다.
2. [Product principles](./product-principles.md)로 FLOW다운 결과물의 공통 원칙을 잡는다.
3. [Quality rubric](./quality-rubric.md)으로 결과물을 점수화한다.
4. [Content conversion playbooks](./content-conversion-playbooks.md)에서 해당 콘텐츠 유형의 기본값과 예외를 고른다.
5. [UX copy rules](./ux-copy.md)로 뻔한 문장, 과한 안내, 불명확한 버튼을 줄인다.
6. [Quality gate](./quality-gate.md)로 공개/배포 전 검토한다.

## Operating Model

- **Principles are broad.** 모든 Flow에 적용되는 제품 철학이다.
- **Rubrics are flexible.** 애매한 판단은 점수로 다루고, 개선 우선순위를 정한다.
- **Playbooks are defaults.** 카테고리별 기본 구조를 제공하지만 원본 콘텐츠와 사용자 목적이 우선한다.
- **Hard gates are rare.** 안전, 출처, 명백한 오해, 접근성 차단처럼 실패 비용이 큰 경우에만 hard fail로 본다.

## Related Repo Skills

- `skills/flow-content-conversion/SKILL.md`: 원본 콘텐츠를 Flow로 변환할 때 사용한다.
- `skills/flow-ux-review/SKILL.md`: 화면과 컨텐츠를 사용자 여정 관점에서 검토할 때 사용한다.
- `skills/flow-copy-editor/SKILL.md`: FLOW UI copy와 action copy가 뻔하거나 추상적일 때 사용한다.
