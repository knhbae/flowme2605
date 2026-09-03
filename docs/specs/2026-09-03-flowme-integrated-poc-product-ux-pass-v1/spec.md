# FlowMe 통합 PoC 제품형 UX 패스 v1 Spec

- 작성일: 2026-09-03
- 상태: `P0_AUTOMATED_VALIDATION_COMPLETE_EXTERNAL_EVIDENCE_UNRUN`
- 제품 구현 정본: React exact-query PoC
- 조작 검토 동반물: 단일 HTML

## 1. 목표

개인공간 v4.1, 개발 1 saved-plan 편집, 개발 2 Text Authoring의 결과를 사용자가
한 제품으로 이해할 수 있는 핵심 여정으로 연결한다.

이번 단계는 이미 통과한 기능형 PoC를 운영 기능으로 승격하지 않는다. 새로 작성한 Flow와
네 saved-plan origin을 같은 Plan→Item 상세·개인 편집·실행 문법으로 열고, 화면에 남은
시험용 설명과 경쟁 행동을 덜어 제품형 UX로 다듬는 단계다.

## 2. 세 결과물과 보존할 정본

| 결과물 | 보존할 결정 | 이번 연결 |
| --- | --- | --- |
| 개인공간 v4.1 UI | 폴더·오늘·주간·월간·날짜 미정, QuickItem, 완료, 이동, Undo | 작성하거나 저장해 둔 Flow를 같은 목록·상세·기간 화면에서 찾고 실행한다. |
| 개발 1 saved-plan 편집 | 네 origin, Plan→Item 필드 순서, source read-only, staged 편집, 단일 저장 | `source-backed-map`, `personal-draft`, `canonical-personal-copy`, `legacy-saved-plan`이 같은 상세와 편집 surface를 쓴다. |
| 개발 2 Text Authoring | 원문 편집기 하나, 선택형 검토, 작성 틀·입력 예시, 명시 저장 | `authoring-handoff`도 기존 네 origin과 같은 개인 Flow 상세로 수렴한다. |

위 표의 연결은 세 결과물 전체 기능을 합쳤다는 뜻이 아니다. 이번 완료 범위는 작성·선택,
개인 편집, 실행 위치, 완료·복구로 이어지는 P0 핵심 여정이다.

## 3. 현재 판정

이번 제품형 UX 변경 뒤 final source와 production build를 기준으로 다시 실행했다.

- personal-workspace model/component `269/269` 통과
- standalone node `43/43` 통과
- React·standalone·교차 표면 runtime 브라우저 `57/57` 통과
- 최종 보고서 브라우저 `2/2` 통과
- 관련 기존 회귀 `220/220` 통과
- production build 통과, 정적·동적 route 18개 생성
- 전체 `npm test` `1,533/1,534`: 기존
  `dog-adoption-first-week:review_due:2026-06-04` 콘텐츠 신선도 1건 실패

따라서 P0 통합 흐름과 저장 경계는 자동화 범위에서 통과로 판정한다. 실제 Android Chrome,
iOS Safari, 보조기술, 실제 200% 텍스트 확대와 관찰 사용자 검증은 수행하지 않았다.

## 4. 이번 구현 범위

### 4.1 제품형 화면 감산

- 기본 사용자 화면에서 `PoC`, `shadow`, `write`, `mutation`, 내부 `ref`, `fingerprint`,
  `Stage`, QA용 카운터를 숨긴다.
- 기술 경계는 문서와 테스트에 남기되 사용자에게는 결과 중심 문장으로 바꾼다.
- 화면별 primary action은 하나만 둔다.
- 중복 설명, 상태 배지, 카드 외곽선과 상시 보조 패널을 줄인다.
- 모바일은 제품 탐색과 화면 action header가 겹치지 않는 한 층 header를 쓴다.

### 4.2 공통 Plan→Item 상세·편집

- 네 saved-plan origin과 `authoring-handoff`가 같은 필드 순서와 편집 component를 쓴다.
- source 정보는 읽기 전용으로, 개인 제목·메모·계획 날짜는 편집 가능 영역으로 보인다.
- Flow Item은 부모 Flow 폴더를 상속하며 Item 단독 폴더 편집을 제공하지 않는다.
- source에 없는 링크나 완료 기준을 만들어 내지 않는다.

### 4.3 계획 날짜와 실행 날짜

- 계획 날짜는 `원래 날짜 따르기 / 날짜 지정 / 날짜 미정` 세 상태를 쓴다.
- 개인 실행 날짜 이동은 실행 위치만 바꾸며 source 일정과 Flow 소속을 유지한다.
- 같은 Item이 상세, 오늘·주간·월간·날짜 미정에서 같은 identity와 상태를 보인다.

### 4.4 staged 편집과 복구

- 편집 중 변경은 메모리의 draft에만 쌓고 운영 writer와 durable state를 건드리지 않는다.
- 저장 직전 변경 요약은 포함·제외 영향과 대상 Flow·Item을 사용자 문장으로 보여 준다.
- 명시 저장 한 번만 durable PoC state를 바꾼다.
- 취소·Escape·같은 값·stale·저장 실패는 성공 mutation 0건이다.
- 성공 뒤 Undo는 이전 workspace state와 필요한 작성 draft를 함께 복원한다.
- 새로고침은 마지막 성공 상태를 복원하고 손상 payload는 fail-closed한다.

### 4.5 React와 단일 HTML 일치

- 같은 화면 이름, primary action, 상태 문구와 핵심 편집 흐름을 쓴다.
- Next route, live origin loading, `PlatformNav`가 없는 fixture-only 차이는 허용한다.
- 단일 HTML은 실제 운영 데이터나 실제 saved-plan을 읽었다고 표현하지 않는다.

## 5. 저장·운영 경계

- 진입점은 `/my?personalWorkspacePoc=v1`과 `/flows/new?personalWorkspacePoc=v1`의
  exact-query gate만 사용한다.
- 모든 쓰기는 `flow:poc:personal-workspace:v1:*`에만 허용한다.
- 기존 `flow:*` key/schema와 `/my` 기본 화면을 변경하지 않는다.
- 기존 completion·memo·date·archive·export writer를 호출하지 않는다.
- `localStorage.clear()`를 호출하지 않는다.
- 기존 운영 데이터 불변 주장은 격리된 테스트 fixture와 브라우저 context에서 확보한
  자동화 증거로만 표현한다. 실제 사용자 browser profile이나 운영 backend 검사가 아니다.

## 6. 요구 재분류

| 분류 | 수 | 처리 원칙 |
| --- | ---: | --- |
| 현재 UX 구현 | 17 | 이번 단계에서 설계·구현·브라우저 검증한다. |
| 회귀 유지 | 4 | 이미 닫힌 하위 계약을 다시 구현하지 않고 regression gate로 둔다. |
| 실제 기기·보조기술 | 7 | 자동화와 분리하고 실제 실행 전까지 미실행으로 남긴다. |
| 운영·제품 결정 | 8 | PoC가 정책을 확정하지 않는다. |
| 후속 기능 | 12 | 현재 P0에 넣지 않는다. |

정확한 ID와 이유는 [requirements.md](./requirements.md)에 둔다.

## 7. 제외 범위

- Flow 휴지통 lifecycle 전체
- Sheet·복사용 TXT 전체 결과, 표·장문 grammar, source candidate
- full property catalog, inline/native picker 전체, near-miss 자동 복구
- source reverse edit와 recursive StructureDraft/compiler 채택
- CreatorDraft library·검색·복제·보관, public candidate, AI, account·cloud, 외부 동기화
- 운영 route/store/schema/migration/writer 연결과 token 영구 결정
- commit, push, PR, Preview, Production
- 실제 Android Chrome, iOS Safari, 가상 키보드, screen reader, 실제 200% zoom,
  관찰 사용자 검증

## 8. 완료 기준

- [x] 새 작성 Flow와 네 saved-plan origin이 같은 Plan→Item 상세·편집 문법을 쓴다.
- [x] source read-only, 개인 수정, 계획 날짜, 개인 실행 날짜의 owner가 화면에서 구분된다.
- [x] 변경 요약·저장 1회·취소·실패·Undo·reload가 같은 staged transition을 쓴다.
- [x] 기본 화면의 내부 구현 용어가 0건이고 화면별 primary action이 하나다.
- [x] React와 단일 HTML의 헤더·간격·행동명·상태 의미가 맞는다.
- [x] 320×700, 375×812, 390×844, 844×390, 1024×768, 1440×900에서
  가로 넘침, 핵심 행동 가림, console error, page error가 0건이다.
- [x] keyboard, Escape, opener focus 복귀, 비드래그 이동, retry, Undo를 확인한다.
- [x] 허용 prefix 밖 set/remove/clear가 0건이고 운영 sentinel bytes가 같다.
- [x] 조작형 HTML, 요구 추적표, 전후 화면, 통합 검증 보고서가 이번 fresh 근거를 가리킨다.
- [x] 전체 회귀 실패, 실제 기기, 관찰 사용자, 게시 상태를 기능 검증과 분리한다.
