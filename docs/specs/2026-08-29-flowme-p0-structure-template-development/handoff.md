# FlowMe Text Authoring 구조 템플릿 P0 개발 handoff

## 현재 상태

- 기준 checkout: `D:\flowme2605\flow-text-authoring-structure-template-p0-baseline-20260829`
- 기준 HEAD: `a5da5d11424d0371ddcb8a516b986b486a65bb96`
- 작업 branch: `agent/text-authoring-structure-template-p0-dev-20260829`
- 범위: 구조 템플릿 순수 로직과 자동화 검증
- UI 변경: 없음
- commit, push, PR, merge, deploy: 없음
- observed users: 0명

## 구현

`lib/flow/text-authoring/structure-template/`에 다음 책임을 분리했다.

- `types.ts`: catalog, `StructureDraft p0.2`, 재귀 group, validation issue, compiled source와 materialization plan 타입
- `catalog.ts`: bundled catalog loader와 runtime validator
- `draft.ts`: 결정적 seed ID와 재귀 `GroupInstance` reducer
- `draft-validation.ts`, `validation.ts`: draft data contract, source readiness와 catalog rule 검증
- `date.ts`: UTC 기준 날짜·요일·유한 반복 계산
- `compiler.ts`: recurring routine, date preparation, itinerary preparation compiler
- `source.ts`: 결정적 source 직렬화
- `materialization.ts`: SHA-256 fingerprint fail-closed, 기존 원문 경계 보존, 한 번의 editor transaction을 위한 순수 plan과 command
- `sidecar.ts`: 빈 원문도 복구하는 sidecar 저장·결정적 최신 복구와 실패 rollback

기존 parser, canonical Flow 타입, projection engine는 교체하지 않았다. `lib/flow/text-authoring/index.ts`에서 새 순수 로직 API만 내보낸다.

## catalog와 fixture snapshot

기획 원본의 catalog 1개와 fixture 7개를 `snapshots/catalog-v1/`에 versioned snapshot으로 보존했다. `snapshot-manifest.json`과 catalog test가 8개 파일의 상대 경로, byte length, SHA-256을 원본과 같은 값으로 검증한다. runtime은 기획 checkout의 절대경로를 읽지 않는다. catalog 안의 `cleanWorktree` 값은 원본 감사 metadata로 보존되지만 파일 접근이나 runtime 분기에는 사용하지 않는다.

## 지켜진 원문 계약

- 선택·입력·sidecar 저장 중 `rawText` 변경 0
- 오류가 없고 source fingerprint가 일치할 때만 materialization plan 생성
- catalog validation 오류는 고정 `code`·`severity`를 가진 `blocked/issues`, 입력 미완성·손상·source 표현 불가는 별도 `not_ready/problems`로 분리
- 같은 draft와 같은 원문은 byte-identical 결과와 같은 transaction ID 생성
- 질문, 예시, placeholder, 빈 seed row 출력 0
- Item 없는 phase가 뒤 recurrence window를 이동시키는 경우와 childless itinerary 날짜가 사라지는 경우는 plan 0
- 전파된 공통값은 user value로 중복 집계하지 않음
- 하위 확인 항목은 Item 속성 뒤에 입력 순서대로 직렬화
- 오류는 `code`, `severity: error`, `scopeInstanceId`를 가지며 field 오류에는 `slotId` 포함
- 일반 문장·개인 메모 자동 구조화와 AI 생성 내용 0

## fresh 자동화 결과

2026-08-29 KST에 현재 working tree에서 실행했다.

| 검증 | 결과 |
| --- | --- |
| `npm.cmd run test:text-authoring-structure-template` | 51/51 통과 |
| positive fixture | 6/6 exact raw bytes, 예상 Step·Item·일정·반복·subcheck·projection 일치 |
| 기존 Text Authoring parser 재입력 | 6/6, parser issue 0 |
| negative RFC 6902 matrix | 20/20 patch 적용, 20/20 planner 차단 |
| validation rule coverage | shared 2 + template 17 = 19/19 |
| 시험 자동 생성 금지 | `generatedCurriculumRows == 0`, `forbiddenGeneratedContentCount == 0` |
| scoped strict TypeScript | 통과, structure-template 오류 0 |
| readiness/failure/recovery 보강 | 빈 seed, 필수값 누락, 손상 sidecar, source 표현 불가, inactive phase, childless itinerary, fractional ISO latest 복구 통과 |
| `npm.cmd run test:text-authoring` | 새 51/51 + 기존 shared 361/361 통과 |
| `npm.cmd run build` | production build 통과, 19/19 static page 생성 |
| `npm.cmd run docs:check` | 통과, 16개 필수 파일과 4,645개 local link 확인 |
| `npm.cmd test` | pretest 175/175; 다음 phase 623/624에서 기존 source review currentness 1건 실패 |
| repository-wide `npx.cmd tsc --noEmit` | 199개 오류, 모두 structure-template 밖; 새 module 오류 0 |

`npm.cmd test`의 실패 파일 `lib/flow/seed-flows.test.ts`는 이번 diff에 없다. 현재 날짜 기준으로 2026-05-21 또는 2026-05-23 재검토 기한이 지난 기존 source 44건을 0건으로 기대하는 currentness gate가 실패했다. 이후 test stage는 실행되지 않았다.

## UI 진입 gate

순수 로직 완료 뒤 UI checkout `D:\flowme2605\flow-text-authoring-flow-view-hybrid-ux-poc-20260828`을 다시 확인했다. 같은 기준 HEAD이지만 현재 93개 dirty path를 가진다. `FlowLiveEditor.tsx`, `TextAuthoringWorkspace.tsx`, `app/globals.css`, 관련 model·tests가 기존 변경과 겹치며 소유권·채택 범위가 확인되지 않았다. clean UI 기준선도 없고 template materialize 전용 one-transaction editor command 접점도 확정되지 않았다.

따라서 이번 작업에서는 UI를 수정하지 않았다. 다음 UI 작업은 아래 네 조건이 모두 닫힌 별도 isolated checkout에서 시작한다.

1. dirty 변경의 owner와 채택 path 확정
2. clean UI 기준선 확보
3. 기존 문맥별 `+`와 빈 문서 `작성 틀로 시작`의 역할 분리 확정
4. 반환된 materialization command를 editor history에 한 번만 적용하는 접점 확정

## 다음 작업

UI gate가 닫히면 빈 문서의 보조 진입만 추가하고, picker/form → 원문 미리보기 → 명시적 한 번의 materialize → 기존 편집기 복귀를 isolated PoC로 연결한다. 일반 텍스트 기본 행동, 기존 문맥별 `+`, 기존 문서 편집은 유지한다. 브라우저 QA와 모바일 키보드 검증은 그 UI 작업에서 수행한다.

현재 상태는 local implementation + automated QA다. 브라우저 QA, 실제 사용자 검증, 배포 완료를 의미하지 않는다.
