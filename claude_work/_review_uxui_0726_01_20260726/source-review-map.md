# FlowMe 전체 UX/UI 소스 검토 맵

이 문서는 Claude Design이 FlowMe 앱을 소스 기준으로 검토할 때 따라갈 지도입니다.

## 제품 전제

FlowMe는 설명형 콘텐츠 사이트가 아니라, 콘텐츠를 일정, 체크, 시트, 메모로 저장하고 실행하는 앱입니다.

유지해야 하는 기본 IA:

- 홈
- Flow 찾기
- 캘린더
- 내 Flow

사용자는 `Flow`, `Flow Map`, `Step`, `Item` 같은 내부 모델을 몰라도 사용 가능해야 합니다. 내부 모델은 코드와 creator/review 화면에서는 필요하지만, 일반 사용자 첫 화면에서는 행동 중심 언어로 내려와야 합니다.

## 1. 전체 Shell / Navigation

검토 파일:

- `components/flow/AppClient.tsx`
- `components/flow/PlatformNav.tsx`
- `docs/SERVICE_STRUCTURE.md`

검토 질문:

- 4탭 구조가 상용 앱처럼 명확한가?
- 홈, Flow 찾기, 캘린더, 내 Flow의 역할이 서로 겹치지 않는가?
- 모바일에서 bottom/tab/nav가 화면 내용을 가리지 않는가?
- detail route에서도 사용자가 현재 위치를 이해할 수 있는가?

## 2. 홈

검토 파일:

- `components/flow/AppClient.tsx`의 `HomeLanding`

검토 화면:

- `screenshots/01-home-mobile.png`

검토 질문:

- 첫 화면에서 FlowMe가 무엇을 하는 서비스인지 5초 안에 보이는가?
- 홈이 너무 catalog처럼 보이지 않는가?
- 첫 행동이 `Flow 찾기` 또는 대표 Flow 진입으로 충분히 분명한가?

## 3. Flow 찾기

검토 파일:

- `components/flow/AppClient.tsx`의 `FlowList`, 카드 렌더링 관련 함수
- `lib/flow/curated-source-app-seed.ts`
- `lib/flow/source-backed-my-flow.ts`

검토 화면:

- `screenshots/02-flow-finding-mobile.png`

검토 질문:

- 기존 콘텐츠와 9개 curated source-backed 콘텐츠가 별도 묶음처럼 튀지 않고 통합 목록처럼 보이는가?
- 카드 정보가 제목, 입력/조건, 저장 결과, 첫 행동, CTA 중심으로 충분히 정리됐는가?
- category/status/source/count가 과하게 앞에 나오지 않는가?
- 카드를 눌렀을 때 사용자가 어떤 결과를 얻을지 예측 가능한가?

## 4. Flow Map 상세

검토 파일:

- `components/flow/SourceBackedFlowMapPage.tsx`
- `components/flow/SourceBackedFlowMapSaveButton.tsx`
- `lib/flow/source-backed-my-flow.ts`

검토 화면:

- `screenshots/03-flow-map-moving-mobile.png`
- `screenshots/04-flow-map-math-mobile.png`

검토 질문:

- 상단에서 무엇을 저장하면 무엇이 생기는지 바로 보이는가?
- 원문 구조를 보존하면서도 첫 화면이 설명 과다로 느껴지지 않는가?
- 저장 CTA가 한 개의 주 행동으로 보이는가?
- source/detail/memo가 필요한 곳에 있지만 첫 화면을 방해하지 않는가?

## 5. 공개 Flow 상세

검토 파일:

- `components/flow/AppClient.tsx`의 `PublicFlow`
- `lib/flow/seed-flows.ts`
- `lib/flow/export.ts`

검토 화면:

- `screenshots/05-public-jeonse-mobile.png`
- `screenshots/06-public-moving-single-mobile.png`

검토 질문:

- 입력값, 저장 결과, 먼저 할 일이 첫 화면에서 이해되는가?
- 저장 CTA가 명확한가?
- export 영역은 결과를 예측할 수 있게 표현되는가?
- source/detail/memo가 신뢰를 주되 실행을 방해하지 않는가?

## 6. 저장 후 My Flow

검토 파일:

- `components/flow/AppClient.tsx`의 `MyFlows`
- `lib/flow/storage.ts`
- `lib/flow/source-backed-my-flow.ts`

검토 화면:

- `screenshots/10-post-save-my-flow-mobile.png`

검토 질문:

- 저장 완료가 끝처럼 보이지 않고 다음 할 일이 먼저 보이는가?
- 처음 저장한 사람이 무엇을 눌러야 하는지 바로 알 수 있는가?
- 저장 banner와 실제 실행 hub가 분리되어 보이는가?

## 7. My Flow 실행 Hub

검토 파일:

- `components/flow/AppClient.tsx`의 My Flow today/list/detail 영역
- `lib/flow/my-flow-step-export.ts`

검토 화면:

- `screenshots/07-my-empty-mobile.png`
- `screenshots/08-my-flow-today-demo-mobile.png`
- `screenshots/09-my-flow-saved-list-demo-mobile.png`

검토 질문:

- 빈 상태에서 사용자가 다시 Flow 찾기로 갈 이유와 행동이 명확한가?
- 저장된 Flow가 여러 개일 때 오늘/다음/밀린 할 일이 목록보다 먼저 보이는가?
- 저장 목록은 반복 사용자에게 충분히 빠르게 스캔되는가?
- detail, memo, source, export가 너무 빨리 노출되지 않는가?

## 8. 캘린더

검토 파일:

- `components/flow/AppClient.tsx`의 Calendar surface
- `lib/flow/my-flow-step-export.ts`
- `lib/flow/export.ts`

검토 화면:

- `screenshots/11-calendar-demo-mobile.png`

검토 질문:

- 캘린더가 My Flow inventory와 다른 schedule-first 목적을 갖는가?
- 날짜 선택, 일정 확인, 다음 행동이 모바일에서 잘 보이는가?
- 캘린더가 실행 앱처럼 느껴지는가?

## 9. Export / Source / Memo

검토 파일:

- `lib/flow/export.ts`
- `lib/flow/my-flow-step-export.ts`
- `components/flow/AppClient.tsx`
- `components/flow/SourceBackedFlowMapPage.tsx`

검토 질문:

- `캘린더 파일 받기`, `시트로 받기`, `메모로 복사` 같은 결과 중심 라벨이 일관적인가?
- 버튼을 누르면 무엇이 생기는지 예측 가능한가?
- source URL, sourceTrace, detail, memo가 삭제되지 않고 적절히 접혀 있는가?

## 10. 내부 검토 화면

검토 파일:

- `components/flow/KoreanFlowContentStudio.tsx`
- `components/flow/ContentLab.tsx`
- `docs/SERVICE_STRUCTURE.md`

검토 화면:

- `screenshots/12-content-flows-internal-mobile.png`

검토 질문:

- 내부 검토 화면과 사용자 화면이 명확히 분리되어 있는가?
- review/audit/sourceTrace/partial draft 같은 내부 문구가 일반 사용자 첫 화면으로 새지 않는가?
- 내부 화면은 내부자용으로 충분히 기능적이지만, public nav에 과하게 노출되지 않는가?

## 산출 요청

Blocking / High / Medium / Low로 나누어 주세요.

각 항목은 다음을 포함해 주세요.

- 문제
- 근거 화면 또는 소스 위치
- 사용자에게 생기는 혼란
- 수정 방향
- 기대 효과

가능하면 `components/flow/AppClient.tsx`의 거대한 단일 파일이 UX 변경 속도를 느리게 만드는지도 별도 의견을 주세요. 단, 이번 검토의 우선순위는 코드 구조보다 사용자 경험입니다.
