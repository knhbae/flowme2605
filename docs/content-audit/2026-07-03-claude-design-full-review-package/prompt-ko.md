# Claude Design 검토 요청 프롬프트

아래 GitHub 폴더를 기준으로 FlowMe 앱 전체 UX/UI를 전반 검토해주세요.

검토 폴더:

`docs/content-audit/2026-07-03-claude-design-full-review-package`

먼저 읽을 파일:

1. `README.md`
2. `source-review-map.md`
3. `review.html`
4. `screenshots/` 이미지 12장

소스까지 직접 볼 수 있다면 특히 아래 파일을 함께 확인해주세요.

- `components/flow/AppClient.tsx`
- `components/flow/SourceBackedFlowMapPage.tsx`
- `components/flow/SourceBackedFlowMapSaveButton.tsx`
- `components/flow/PlatformNav.tsx`
- `lib/flow/curated-source-app-seed.ts`
- `lib/flow/source-backed-my-flow.ts`
- `lib/flow/storage.ts`
- `lib/flow/my-flow-step-export.ts`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/SERVICE_STRUCTURE.md`

## 서비스 전제

FlowMe는 설명형 콘텐츠 사이트가 아니라, 콘텐츠를 일정/체크/시트/메모로 저장하고 실행하는 앱입니다.

기본 IA는 유지합니다.

- 홈
- Flow 찾기
- 캘린더
- 내 Flow

일반 사용자는 `Flow`, `Flow Map`, `Step`, `Item`, `sourceTrace`, `review`, `audit` 같은 내부 모델을 몰라도 사용 가능해야 합니다.

## 이번 검토에서 보고 싶은 것

전체 리디자인 제안보다, 현재 구조를 유지하면서 상용 실행 앱처럼 보이게 만들기 위한 우선순위 높은 수정 의견을 원합니다.

특히 아래를 봐주세요.

1. 홈에서 서비스 목적과 첫 행동이 5초 안에 보이는가
2. Flow 찾기 카드가 빠르게 판단 가능한가
3. Flow Map 상세와 공개 Flow 상세에서 입력값, 저장 결과, 먼저 할 일이 보이는가
4. 저장 후 My Flow에서 다음 행동이 바로 보이는가
5. My Flow가 저장 목록보다 실행 허브처럼 보이는가
6. 캘린더가 schedule-first 실행 탭처럼 보이는가
7. source/detail/memo/export가 첫 화면을 방해하지 않으면서 필요할 때 확인 가능한가
8. 내부 검토 화면과 사용자 화면이 섞이지 않는가
9. 모바일 390px 기준으로 정보량, 버튼 수, 카드 밀도가 적절한가
10. Notion, 캘린더, 네이버 같은 상용 서비스와 비교했을 때 과한 설명이나 내부 구조 노출이 남아 있는가

## 출력 형식

Blocking / High / Medium / Low로 나눠서 주세요.

각 항목마다 아래를 적어주세요.

- 문제
- 근거 화면 또는 소스 파일
- 왜 사용자가 어려워지는지
- 수정 방향
- 기대 효과

마지막에는 다음을 따로 정리해주세요.

- 지금 당장 고칠 5개
- 나중에 해도 되는 것
- 건드리면 위험한 것
- 디자인 시스템 관점에서 통일해야 할 것
