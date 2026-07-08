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

## 이번 검토에서 원하는 산출물

평가만 하고 끝내지 말고, 현재 구조를 유지하면서 상용 실행 앱처럼 보이게 만들기 위한 개선 방향과 실제 개발 가능한 산출물을 만들어주세요.

원하는 결과는 단순 코멘트가 아니라 다음 개발 루프의 입력물입니다.

필수 산출물:

1. 전체 UX 진단 요약
2. Blocking / High / Medium / Low 우선순위
3. 화면별 revised UX spec
4. Flow 찾기 카드 redesign spec
5. 공개 Flow 상세 / Flow Map 상세 상단 구조 개선안
6. 저장 후 My Flow / My Flow 실행 허브 개선안
7. export/source/detail/memo 정보 위계 정리안
8. UI copy 수정안
9. 개발자가 바로 작업할 수 있는 implementation checklist
10. 수정 후 검증 기준

전체 리디자인이나 새 앱 구조 제안보다, 기존 4탭 IA와 현재 seed/source-backed 구조를 유지한 상태에서 바로 고칠 수 있는 우선순위 높은 수정을 원합니다.

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

아래 형식을 지켜주세요.

### 1. Executive Summary

- 현재 앱이 상용 실행 앱처럼 보이는 정도
- 가장 큰 UX 병목 3개
- 유지해야 할 좋은 방향 3개

### 2. Priority Findings

Blocking / High / Medium / Low로 나눠서 주세요.

각 항목마다 아래를 적어주세요.

- 문제
- 근거 화면 또는 소스 파일
- 왜 사용자가 어려워지는지
- 수정 방향
- 기대 효과

### 3. Revised UX Direction

아래 화면별로 revised UX 방향을 적어주세요.

- 홈
- Flow 찾기
- Flow Map 상세
- 공개 Flow 상세
- 저장 완료 직후 My Flow
- My Flow 빈 상태
- My Flow 오늘/저장 목록/상세
- 캘린더
- source/detail/memo/export 영역
- 내부 검토 화면과 사용자 화면의 분리

각 화면마다 다음을 포함해주세요.

- 화면의 한 문장 목적
- 사용자가 먼저 봐야 할 정보
- 첫 행동
- 낮춰야 할 정보
- 숨기거나 접어야 할 정보
- 유지할 정보

### 4. Concrete UI Specs

아래 항목은 개발자가 바로 반영할 수 있을 정도로 구체적으로 써주세요.

- Flow 찾기 카드 정보 순서
- 카드에서 제거하거나 낮출 metadata
- CTA 라벨과 hierarchy
- 공개 Flow 상세 hero 구성
- Flow Map 상세 hero 구성
- 저장 후 My Flow confirmation 영역
- My Flow 오늘/다음/밀린 할 일 우선순위
- export 버튼 라벨과 배치
- source/detail/memo 접힘 구조

### 5. Copy Suggestions

사용자-facing 문구를 제안해주세요.

- 화면 제목
- 카드 보조 문구
- CTA 라벨
- 저장 후 안내 문구
- export 버튼 라벨
- source/detail/memo 섹션 라벨

내부 용어인 `Flow Map`, `Step`, `Item`, `sourceTrace`, `review`, `audit`, `partial_draft`는 일반 사용자 첫 화면 문구로 쓰지 말아주세요.

### 6. Implementation Checklist

개발자가 바로 작업할 수 있게 체크리스트로 주세요.

각 항목은 아래 형식이면 좋습니다.

- 파일 또는 영역
- 수정 내용
- 우선순위
- 완료 기준
- 검증 방법

### 7. Validation Plan

수정 후 어떤 화면과 흐름을 다시 확인해야 하는지 적어주세요.

반드시 포함:

- 모바일 390px
- 홈 -> Flow 찾기 -> 상세 -> 저장 -> My Flow
- 여러 Flow 저장 상태
- My Flow 빈 상태
- 캘린더
- export/source/detail/memo
- 내부 검토 문구 노출 여부

### 8. Do Not Change

건드리면 위험한 것과 유지해야 할 것을 따로 정리해주세요.

마지막에는 다음을 따로 정리해주세요.

- 지금 당장 고칠 5개
- 나중에 해도 되는 것
- 건드리면 위험한 것
- 디자인 시스템 관점에서 통일해야 할 것
