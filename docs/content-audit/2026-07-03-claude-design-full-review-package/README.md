# FlowMe 전체 UX/UI Claude Design 소스 검토 패키지

이 폴더는 Claude Design이 FlowMe 앱을 Vercel 없이도 전반 검토할 수 있도록 만든 소스 우선 검토 패키지입니다.

핵심은 `prompt-ko.md`와 `source-review-map.md`입니다. `review.html`과 `screenshots/`는 실제 모바일 렌더링을 빠르게 대조하기 위한 보조 증거입니다.

## 추천 검토 순서

1. [prompt-ko.md](./prompt-ko.md)
2. [source-review-map.md](./source-review-map.md)
3. [review.html](./review.html)
4. [screenshots/](./screenshots/)
5. 필요 시 아래 핵심 소스 파일 직접 확인

## 핵심 소스 파일

- [components/flow/AppClient.tsx](../../../components/flow/AppClient.tsx)
- [components/flow/SourceBackedFlowMapPage.tsx](../../../components/flow/SourceBackedFlowMapPage.tsx)
- [components/flow/SourceBackedFlowMapSaveButton.tsx](../../../components/flow/SourceBackedFlowMapSaveButton.tsx)
- [components/flow/PlatformNav.tsx](../../../components/flow/PlatformNav.tsx)
- [lib/flow/curated-source-app-seed.ts](../../../lib/flow/curated-source-app-seed.ts)
- [lib/flow/source-backed-my-flow.ts](../../../lib/flow/source-backed-my-flow.ts)
- [lib/flow/storage.ts](../../../lib/flow/storage.ts)
- [lib/flow/my-flow-step-export.ts](../../../lib/flow/my-flow-step-export.ts)
- [tests/e2e/flow-mvp.spec.ts](../../../tests/e2e/flow-mvp.spec.ts)
- [docs/SERVICE_STRUCTURE.md](../../SERVICE_STRUCTURE.md)

## 검토 범위

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

## 검토 기준

- 5초 안에 화면 목적이 보이는가
- 첫 행동이 하나로 분명한가
- 설명문이 너무 많은가
- 사용자가 내부 모델을 몰라도 쓸 수 있는가
- 저장 후 다음 행동이 바로 보이는가
- 모바일 390px에서 시선 흐름이 자연스러운가
- export 버튼을 누르면 결과를 예측할 수 있는가
- source/detail/memo는 필요할 때 확인 가능하지만 첫 화면을 방해하지 않는가
- 상용 실행 앱처럼 보이는가

## 스크린샷 목록

- `01-home-mobile.png`: 홈
- `02-flow-finding-mobile.png`: Flow 찾기
- `03-flow-map-moving-mobile.png`: Flow Map 상세 - 이사
- `04-flow-map-math-mobile.png`: Flow Map 상세 - 중1 수학
- `05-public-jeonse-mobile.png`: 공개 Flow 상세 - 전세계약
- `06-public-moving-single-mobile.png`: 공개 Flow 상세 - 이사 단일 Flow
- `07-my-empty-mobile.png`: My Flow 빈 상태
- `08-my-flow-today-demo-mobile.png`: My Flow 오늘
- `09-my-flow-saved-list-demo-mobile.png`: My Flow 저장 목록
- `10-post-save-my-flow-mobile.png`: 저장 직후 My Flow
- `11-calendar-demo-mobile.png`: 캘린더
- `12-content-flows-internal-mobile.png`: 내부 콘텐츠 검토 화면

## 요청 출력

Claude Design에는 Blocking / High / Medium / Low로 나누어 다음 형식으로 달라고 요청합니다.

- 문제
- 근거 화면 또는 소스 파일
- 왜 사용자가 어려워지는지
- 수정 방향
- 기대 효과

사용자 화면과 내부 검토 화면은 반드시 분리해서 평가해야 합니다.
