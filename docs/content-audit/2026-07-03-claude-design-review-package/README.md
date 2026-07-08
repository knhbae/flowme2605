# FlowMe UX/UI 2차 개선 Claude Design 검토 패키지

이 폴더는 Vercel preview 링크 없이 Claude Design이 FlowMe UX/UI 2차 개선본을 검토할 수 있도록 만든 오프라인 검토 패키지입니다.

## 보는 순서

1. `review.html`
2. `prompt-ko.md`
3. `screenshots/01-flows-mobile.png`
4. `screenshots/02-public-jeonse-mobile.png`
5. `screenshots/03-public-moving-mobile.png`
6. `screenshots/04-post-save-my-flow-mobile.png`

## 검토 요청 핵심

- Flow 찾기 카드가 상용 실행 앱처럼 빠르게 판단 가능한지
- 공개 Flow 상세에서 입력값, 저장 결과, 첫 행동이 5초 안에 보이는지
- 저장 후 My Flow에서 첫 할 일이 전체 목록보다 먼저 보이는지
- source/detail/memo/export가 첫 화면을 방해하지 않으면서 필요할 때 확인 가능한지
- 모바일 390px 기준으로 정보량과 시선 흐름이 적절한지

Claude Design에는 `prompt-ko.md` 내용을 붙여넣고, 이 폴더의 `review.html`과 `screenshots`를 기준으로 Blocking / High / Medium / Low 검토를 요청하면 됩니다.
