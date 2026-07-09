# FlowMe P17-00 Product Direction Review Package

- Generated: 2026-07-09T00:19:55.869Z
- Branch: `main`
- UI baseline commit: `b1cf896`
- Package generated from commit: `b1cf896`
- Review purpose: P1~P16 개선 루프 이후 제품 방향 판단
- Mobile viewport: 390x844
- Wide viewport: 1024x768

이 패키지는 새 기능이나 UI 수정이 아니라, 현재 FlowMe를 Claude Design이 시나리오별로 다시 판단할 수 있게 만든 제품 방향 review package입니다. P12~P16 guardrail/evidence 기준선은 기존 캡처 스크립트로 먼저 재생성했고, 그 위에 사용자 피드백 중심의 Calendar/My Flow/public export/URL-first/Studio 보강 screenshot을 추가했습니다.

## Files

- [audit.md](./audit.md)
- [review.html](./review.html)
- [route-evidence.json](./route-evidence.json)
- [prompt-ko.md](./prompt-ko.md)
- [screenshots/](./screenshots/)

## Product Direction Scenarios

- 처음 온 사용자: URL/메모를 실행 가능한 Flow로 바꾸고 My Flow/Calendar로 이어지는 제품 문장이 즉시 읽히는가.
- URL-first hit 사용자: 이미 준비된 Flow를 찾고 시작하는 가치가 AI 데모가 아니라 실제 실행 시작으로 보이는가.
- URL-first miss/candidate 사용자: 준비된 Flow가 없을 때 요청 저장만으로 충분한가, AI 초안 만들기 흐름이 필요한가.
- public /f 공유 진입 사용자: 공유받은 사용자가 Flow 단위 저장과 Step 단위 export를 혼동하지 않고 주 행동을 고를 수 있는가.
- My Flow 반복 사용자: 저장 완료, 다음 할 일, 지난/오늘/다음 상태, 열기/체크가 설명보다 먼저 보이는가.
- Calendar-heavy 사용자: Calendar가 보관된 데이터가 아니라 오늘/선택일 실행 화면으로 보이고, 여러 Flow/동일 날짜가 구분되는가.
- Creator / Studio 방향: Studio/creator를 지금 키울 핵심 축으로 볼지, 개인 실행 도구의 보조 표면으로 둘지 판단한다.

## Key Evidence Summary

- Total screenshots: 50
- Product direction scenarios: 7
- Product direction supplemental screenshots: 8
- Wide viewport evidence count: 9
- Normal route guardrail hits: 0
- URL-first visible Markdown hits: 0
- URL-first export mode visible Markdown hits: 0
- Candidate user-copy internal hits: 0
- Candidate card legacy status hits: 0
- Creator profile guardrail hits: 0
- Flow-lab user nav links by viewport: {"390":0,"768":0,"1024":0}
- Restart release-preview guardrail hits: 0
- Calendar group repeated timing meta rows: 0

## Review Focus

1. Calendar가 여러 Flow와 동일 날짜 항목을 충분히 구분하는가.
2. My Flow가 오늘 할 일 확인/체크까지 너무 깊지 않은가.
3. public `/f`에서 Flow 단위 저장/export와 Step 단위 export가 혼동되지 않는가.
4. URL-first hit의 수정 자유도와 miss의 AI draft 필요성이 어느 정도인가.
5. Studio/creator는 지금 키울 축인가, 아니면 보조 표면으로 유지해야 하는가.
