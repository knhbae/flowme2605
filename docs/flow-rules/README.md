# FLOW Quality Rules

FLOW 품질 기준은 좁고 딱딱한 금지 목록이 아니다. 콘텐츠 유형과 사용자 목적에 따라 달라지는 실행 품질을 판단하기 위한 운영 체계다.

## Current Addendum

- [Study progress table rules](./study-progress-tables.md): use a progress table only when the source has table-of-contents, curriculum, exam-scope, past-exam, weekly-plan, lesson, or assignment rows the creator can bring into FLOW.
- [Flow execution types](./flow-execution-types.md): classify each Flow as progress, process, timeline, routine, reference/bucket, log, or decision before choosing UI, and apply Flow of Flow only after child execution type is clear.
- [Execution specificity rules](./execution-specificity.md): treat `source reviewed` as a source boundary only; each category still needs enough source-derived detail, artifact fit, record fields, and stop/hold conditions for real execution.
- [Source-to-Flow conversion gate](./source-to-flow-conversion-gate.md): require one primary source per Flow, choose the natural artifact before UI components, reject forced checklist counts, and keep top-level inputs earned by the generated artifact.
- [Flow content source selection rules](./flow-content-source-selection.md): choose Korean-first original content with a real execution skeleton, use representative coverage axes to avoid repetitive batches, keep inputs close to calendar/reminder complexity, and reject sources that require invented filler.
- [Export destination fit rules](./export-destination-fit.md): choose calendar, sheet, memo/Notion, internal checklist, or Todoist/task CSV by the artifact's main job, and keep account integrations out until export friction is proven.
- [Integration readiness gate](./integration-readiness-gate.md): move from export-only to direct integration only when repeated destination use, import friction, stable schema, permission clarity, reversibility, and source/safety transfer are proven.
- [Validation evidence](./validation-evidence.md): reserve `validated` for routes with real user behavior data, not internal QA or screenshots.
- [First user validation script](./first-user-validation-script.md): observe whether target users complete the open, setup, artifact, export/copy, and outside-use loop.

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

- `.agents/skills/flow-content-conversion/SKILL.md`: 원본 콘텐츠를 Flow로 변환할 때 사용한다.
- `.agents/skills/flow-ux-review/SKILL.md`: 화면과 컨텐츠를 사용자 여정 관점에서 검토할 때 사용한다.
- `.agents/skills/flow-copy-editor/SKILL.md`: FLOW UI copy와 action copy가 뻔하거나 추상적일 때 사용한다.
