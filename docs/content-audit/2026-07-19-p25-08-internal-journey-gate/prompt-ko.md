# Claude Design P25 통합 UX 재평가 요청

아래 내용을 그대로 사용해 FlowMe P25의 현재 UX를 독립적으로 재평가해 주세요.

---

FlowMe P25의 최신 내부 통합 결과를 UX·제품 구조 관점에서 검토해 주세요. 이번 검토는 실제 사용자 관찰이 아니라, GitHub 소스·문서·모바일/와이드 스크린샷을 바탕으로 한 독립 시뮬레이션입니다.

## 검토 자료

- GitHub evidence package:
  https://github.com/knhbae/flowme2605/tree/codex/p25-ux-foundation-plan/docs/content-audit/2026-07-19-p25-08-internal-journey-gate
- 검토 branch: `codex/p25-ux-foundation-plan`
- 핵심 문서:
  - `README.md`
  - `audit.md`
  - `review.html`
  - `route-evidence.json`
  - `journey-results.json`
  - `screenshots/`
  - `downloads/`
- 현재 production: https://flowme2605.vercel.app

중요: production은 아직 P24/main 배포본입니다. P25 런타임을 production URL만 보고 평가하지 말고, 위 branch의 소스와 evidence package를 정본으로 사용해 주세요.

## 검토 전제

- 실제 사용자 관찰 세션은 `0 / 15`입니다.
- 자동화, persona simulation, screenshot 검토를 실제 사용자 검증으로 표현하지 마세요.
- P25는 기능 추가보다 다음 구조를 하나의 실행 모델로 읽히게 하는 작업입니다.

```text
발견/공개 preview
→ 전체 Flow 저장
→ 전체 구조 확인
→ 필요한 항목만 개인 조정
→ My Flow에서 실행
→ Calendar에서 날짜 배치/확인
→ 완료·완료 취소
→ 전체/선택 범위 export
→ 회고·재사용
```

## 반드시 시뮬레이션할 6개 사용자 여정

1. **기준일 역산형: 이사 준비**
   - 이사일 지정
   - 전체 Flow 저장 결과 확인
   - returning My Flow에서 전체 구조 확인
   - 한 항목 완료 후 다시 미완료
   - 모바일과 wide에서 같은 Flow가 같은 구조로 읽히는지 평가

2. **날짜 없는 체크리스트형**
   - My Flow에서 날짜 없이 실행
   - Calendar의 `날짜 정하기`에서 선택·배치
   - 배치 취소 및 날짜 제거
   - 날짜 없음이 오류나 미완성 상태가 아니라 의도된 실행 상태로 읽히는지 평가

3. **반복 루틴형: 세탁조 청소**
   - public preview에서 반복 회차 예측
   - 저장 후 series와 occurrence 구분
   - 한 회차 완료·완료 취소
   - Calendar와 ICS의 반복 결과 비교
   - series 설명과 occurrence 실행 컨트롤이 중복되지 않는지 평가

4. **순서·날짜 혼합형**
   - 여러 항목 선택
   - 날짜 일괄 지정·제거·되돌리기
   - 선택 범위 export
   - 완료 모드와 조정 모드가 혼동되지 않는지 평가

5. **기록·메모형**
   - 메모를 여러 할 일로 나누는 preview
   - 일부 제외·제목 수정 후 저장
   - 저장/새로고침/전체 export/선택 export 개수 비교
   - 사용자가 입력하지 않은 filler가 실행 항목으로 섞이지 않는지 평가

6. **개인 초안·반복형**
   - URL miss 또는 메모 draft
   - 항목 추가·편집·반복 설정
   - occurrence 완료·재개·건너뜀·보류·복구
   - Calendar와 ICS stable identity 비교
   - 고급 편집이 progressive disclosure로 충분히 억제되는지 평가

## 집중 평가 질문

1. 저장 직후 사용자가 “무엇이 저장됐는지” 전체 Flow 단위로 즉시 확인할 수 있는가?
2. 다시 방문한 My Flow가 오늘 한 줄만 강조하면서도 전체 Flow 구조로 자연스럽게 확장되는가?
3. 날짜 없는 할 일의 목적과 Calendar 배치 흐름이 설명 없이도 이해되는가?
4. `완료`, `열기`, `수정`, `선택`, `날짜 배치`, `내보내기`가 서로 다른 행동으로 보이는가?
5. 반복 series와 실행 occurrence가 one occurrence / one completion control 원칙을 지키는가?
6. export에서 먼저 범위를 고르고 다음에 형식을 고르는 순서와 개수가 신뢰되는가?
7. public `/f`가 읽기 전용 전체 artifact preview와 Flow 단위 저장 판단에 집중하는가?
8. 모바일 390px에서 정보가 과밀하거나 긴 설명에 의존하지 않는가?
9. wide 1024px Calendar의 queue/grid/agenda가 동시에 보여도 핵심 제목이 충분히 읽히는가?
10. 개인 초안의 고급 일정·반복 편집이 기본 실행 경험보다 더 복잡해 보이지 않는가?

## 특히 비교할 화면

- post-save 전체 Flow vs returning My Flow
- My Flow 날짜 없는 할 일 vs Calendar 날짜 배치 queue
- public 반복 preview vs 저장 후 occurrence 실행
- 개별 조정 drawer vs 선택 항목 일괄 조정
- Flow 전체 export vs 선택 export
- Calendar 모바일 agenda vs 1024px wide agenda

## 결과 작성 형식

### 1. 전체 판정

- `keep / change / defer` 중 하나를 선택
- P25 화면 구조를 다음 iteration 기준선으로 유지할지 한 문단으로 설명

### 2. Findings

심각도 순서로 `Blocking / High / Medium / Low`를 먼저 작성해 주세요. 각 finding에는 반드시 다음을 포함해 주세요.

- 관련 여정과 화면
- mobile/wide 여부
- 사용자가 하려는 일
- 현재 화면에서 예상되는 해석
- 문제의 원인
- 최소 수정이 아니라 필요한 구조 수정 범위
- 근거 유형: `current_source`, `current_screenshot`, `prior_artifact`, `heuristic`

### 3. 여정별 판정표

각 여정을 아래 기준으로 `supported / hidden / partial / missing`으로 분류해 주세요.

- 전체 artifact 예측 가능성
- 개인 조정 발견성
- 실행·완료·완료 취소
- Calendar projection
- export projection
- 재사용 가능성

### 4. 화면별 결정

다음 표면마다 `keep / change / defer`와 구체적 이유를 작성해 주세요.

- public `/f`
- 저장 직후 handoff
- My Flow 모바일
- My Flow wide
- Calendar 모바일
- Calendar wide
- 개인 조정 drawer
- 선택 일괄 조정
- export sheet

### 5. P26 실행 백로그

단순 visual polish 목록이 아니라 사용자 가치와 상태 모델 기준으로 작성해 주세요.

- Blocking: 다음 검토 전 반드시 해결
- High: 핵심 실행 여정 신뢰를 떨어뜨림
- Medium: 발견성·밀도·일관성 개선
- Low: 마감 polish

각 항목에 route, 대상 persona, 기대 행동, 구현 경계, 검증 시나리오를 포함해 주세요.

### 6. 실제 사용자에게 나중에 확인할 질문

자동화나 screenshot으로 답할 수 없는 질문만 5개 이내로 정리해 주세요. 지금 당장 사용자 모집을 권하지 말고, 어떤 내부 조건이 충족되면 관찰을 시작할 수 있는지도 적어 주세요.

## 금지 사항

- production P24 화면을 P25 현재 화면으로 오인하지 마세요.
- 자동화 또는 persona simulation을 실제 사용자 관찰로 표현하지 마세요.
- 단순히 “깔끔하게”, “여백 추가”, “카드 정리” 수준으로 끝내지 마세요.
- 4탭 IA, public share shell, source/personal/execution 소유권을 근거 없이 다시 뒤집지 마세요.
- 새 AI, DB, OAuth, 소셜 기능으로 핵심 UX 문제를 회피하지 마세요.

최종 목표는 “기능이 많다”가 아니라, 여러 Flow 유형을 사용자가 **전체 확인 → 필요한 만큼 조정 → 실행 → 일정 반영 → 완료·복구 → 외부 활용**으로 자연스럽게 다룰 수 있는지 판정하는 것입니다.
