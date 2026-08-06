# Codex 로컬 UX·아키텍처 검토 프롬프트

새 Codex 세션에서 아래 본문을 그대로 사용합니다.

---

`D:\flowme2605\flow-mvp`의 현재 코드와 실제 Production을 근거로 P35 모바일 UX·UI 구조를 검토해 주세요. 이번 작업은 기획 검토와 제안만 포함하며 제품 코드는 수정하지 마세요.

## 목표

다음 기획·구현 세션이 바로 사용할 수 있는 결정 자료를 만듭니다.

- 공개 Flow가 공통 데이터와 renderer를 중심으로 동작하는지 판정
- 필요한 콘텐츠 차이와 누적된 UI 예외를 구분
- Flow 찾기, 조정, 저장, My Flow, 가져가기의 상태와 화면 규칙 정리
- 중복 단계·정보·메모·행동을 삭제·통합 관점에서 검토
- 최소 2개의 다른 모바일 구조 대안과 MVP 권고안 제안
- 전면 재작성과 제한된 구조 개선 중 적절한 범위 판정

## 먼저 할 일

1. `D:\flowme2605\flow-mvp`에서 `npm.cmd run workflow:session-start`를 실행하세요.
2. `AGENTS.md`, `agent.md`, `docs/STATUS.md`, `docs/SERVICE_STRUCTURE.md`, 관련 `docs/flow-rules/`를 읽으세요.
3. 현재 branch, HEAD, upstream, dirty files를 확인하고 기존 변경은 수정하거나 포함하지 마세요.
4. 아래 작업 패키지를 읽으세요.

```text
docs/content-audit/2026-07-31-p35-mobile-planning-handoff/
```

5. 1차 코드·화면 진단을 먼저 끝낸 뒤에만 `06-owner-feedback-normalized-ko.md`를 읽으세요.

## Production 확인

- 기준 URL: https://flowme2605.vercel.app
- 우선 viewport: 390 × 844
- 확인 경로:
  - `/flows`
  - `/f/moving-d30-basic`
  - `/f/vehicle-inspection-prep`
  - `/f/curated-allblanc-morning-workout`
  - `/flow-maps/middle-school-math-1`
  - `/my`
- 확인 흐름:

```text
Flow 찾기
→ 공개 Flow 미리보기
→ Flow 조정
→ Item 수정
→ Flow 가져가기
→ 내 Flow 저장
→ 저장 완료
→ My Flow의 Flow 보기
→ Item 상세
→ 할 일 보기
```

Playwright 또는 실제 브라우저를 사용하되, 화면을 본 사실과 실제 사용자 검증을 구분하세요.

## 코드에서 반드시 확인할 항목

- `app/f/[slug]/page.tsx`
- `app/flow-maps/[map]/page.tsx`
- `components/flow/FlowArtifactDataPreview.tsx`
- `components/flow/FlowSaveBeforeFrame.tsx`
- `components/flow/PublicFlowAdjustmentPanel.tsx`
- `components/flow/SourceBackedFlowMapPage.tsx`
- `components/flow/AppClient.tsx`

다음 질문에 파일·라인 근거로 답하세요.

1. projection → shape → renderer 공통 경로가 어디까지 적용되는가?
2. `/f`와 `/flow-maps`는 왜 다른 composition을 쓰며 합칠 수 있는가?
3. slug·category·prefix별 예외가 몇 종류이며 데이터 variant로 옮길 수 있는가?
4. Flow 전체 조정과 Item 수정은 어떤 state와 컴포넌트로 나뉘는가?
5. Step·그룹 이름을 수정하려면 데이터 모델과 저장 계약을 어디까지 바꿔야 하는가?
6. 저장 전·후 Flow 가져가기는 같은 기능인가, 다른 범위·상태인가?
7. 공개 Flow와 My Flow에서 재사용할 수 있는 Item detail/edit contract는 무엇인가?
8. `실행 메모`와 Item `memo`는 의미·저장·내보내기에서 어떻게 다른가?
9. `이 사본 사용`은 어떤 데이터 보호 조건에서 나타나는가?
10. 출처·원문·주의 정보는 어떤 경로·slug 조건으로 달라지는가?

## 검토 원칙

- 화면 차이만으로 하드코딩이라고 단정하지 않습니다.
- 공통 컴포넌트가 있다는 이유만으로 구조가 충분히 통합됐다고 단정하지 않습니다.
- 삭제와 통합을 먼저 검토합니다.
- Flow 찾기와 My Flow는 상태가 다르므로 같아야 할 계약과 달라야 할 내용을 나눕니다.
- 출처 링크, 중요한 주의, 데이터 복구, 되돌리기는 무조건 삭제하지 않습니다.
- Text-to-Flow, 계정·클라우드·협업, 구현, 배포는 범위 밖입니다.

## 제출물

### A. 독립 코드·화면 진단

- `Blocking / High / Medium / Low`
- 관찰, 원인 가설, 코드 근거, 확신 수준
- 구조 판정: `공통 데이터 매핑 중심 / 혼합 구조 / 콘텐츠별 구현 중심 / 판단 불가`

### B. 사용자 피드백 대조

`06-owner-feedback-normalized-ko.md`의 모든 O·F·M 항목을 아래로 분류합니다.

- 확인됨
- 일부 확인됨
- 현상은 맞지만 원인이 다름
- 현재 근거로 확인 불가
- 다른 해결을 권고

### C. 공통 계약 제안

- 상태 모델
- 모든 Flow가 공유할 shell과 전환
- 콘텐츠 유형별 variant schema
- Flow·Item 편집 계약
- 저장·가져가기 계약
- 공개 Flow·My Flow detail 계약
- 출처·주의 정책

### D. 모바일 구조 대안 2~3개

각 대안에 화면 흐름, 정보 계층, 편집 방식, 가져가기 위치, My Flow 구조, 장단점, 코드 영향 범위를 포함합니다.

### E. MVP 권고안과 실행 범위

- P0 / P1 / 보류
- 파일·컴포넌트별 영향 범위
- 삭제할 예외와 유지할 공통 코어
- 수용 기준
- 회귀 위험과 필요한 테스트
- 전면 재작성 여부

결과는 아래 폴더에 새 Markdown으로 남기되 기존 제품 파일은 수정하지 마세요.

```text
docs/content-audit/YYYY-MM-DD-p35-mobile-planning-review/
```

---
