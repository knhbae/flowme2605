# FlowMe UX 재검토 — P25 production 마감 (2026-07-20)

**검토 방식:** independent automated simulation + heuristic review.
실제 사용자 관찰 아님 (observed users 0 / 15 유지).

**근거(evidenceKind):**
- `production_fetch` — production SSR HTML 직접 수신: `/`, `/f/vehicle-inspection-prep`, `/f/washer-tub-clean-monthly`, `/flows`, `/my` (2026-07-20 00:46~00:48 UTC)
- `production_screenshot` — repo의 P25 final smoke 캡처 12장 (390/1024 × 6 route, 2026-07-19 22:49 UTC)
- `repo_evidence` — completion-audit.md, route-evidence.json, decision-log.json, STATUS.md, production-smoke/results.json
- `code_grep` — components/flow 라벨 확인 (부분: AppClient.tsx는 512KB 초과로 스캔 불가)
- `heuristic` — 위 근거 위의 설계 판단

이번 검토는 브라우저 상호작용(클릭/저장/완료)을 직접 수행하지 않았다. 상호작용 결과 판정은 P25-08 자동화 evidence를 인용하되 `repo_evidence`로 구분 표기한다.

## 판정 요약

- Blocking **0** — production 12/12 smoke, fetch한 5 route 모두 정상 응답, hydration 회귀 0. P25가 "구현·배포·자동 검증됨"이라는 기록 자체는 신뢰 가능.
- High **3**, Medium **8**, Low **2** — 대부분 구조가 아니라 **첫 만남 이해도, 역할 언어, 기본 완성도** 층위.
- P25의 9-surface 구조(전체 Flow 작업공간, 실행/배치 분리, 가역 완료, scope-first export)는 **유지(keep)** 판정. P26은 그 위의 이해도·밀도·완성도 프로그램.

## Findings

### High

**F-01 · 공개 예시 미리보기가 과거 날짜를 "다가오는 할 일"로 표시**
- route `/f/vehicle-inspection-prep` · viewport 390+1024 · evidenceKind: production_screenshot
- 재현: 첫 방문(날짜 미입력) → 예시 미리보기 자동 표시
- 기대: 예시는 미래 anchor(예: 검사일 D+21)로 D-14→D-Day 역산 구조를 시연
- 실제: 예시 검사일 = 오늘(7월 20일) → 첫 행이 `D-14 · 07-06`, 즉 2주 지난 날짜가 "다가오는 할 일" 섹션 최상단
- 영향: 첫 방문자의 저장 결과 예측(우려 1·3·10)을 정면으로 훼손. "저장하면 과거 일정이 생기나?"라는 불신 유발

**F-02 · 저장 전 화면에서 저장 결정과 경쟁하는 진입이 다수**
- route `/f/*` · viewport 390+1024 · evidenceKind: production_fetch + production_screenshot
- 재현: `/f/washer-tub-clean-monthly` 스크롤
- 기대: P25 계약 "one artifact + one save decision surface"
- 실제: `입력`(날짜) / sticky `그대로 저장`+`조정` / 본문 `그대로 저장`+`내 버전으로 조정` / 저장 전 `산출물 받기`·`내 실행판` 진입이 공존. 저장 결정 표면은 1개가 아니라 실질 3개+
- 영향: 우려 7(export 범위 예측)·8(설명 과다)이 카피가 아니라 **CTA 중복** 때문에 재발

**F-03 · 내 Flow와 캘린더의 빈 상태가 사실상 동일 → 역할이 학습되지 않음**
- route `/my`, `/calendar` · 390+1024 · evidenceKind: production_screenshot
- 실제: 두 탭 모두 "…콘텐츠를 먼저 고르세요" + 동일 CTA `콘텐츠 고르러 가기`. 차이는 부제 한 줄뿐. 또한 앱 전반 용어가 `Flow`인데 빈 상태만 `콘텐츠`
- 영향: 우려 5 미해결. 첫 사용자에게 두 탭이 같은 곳으로 보임

### Medium

**F-04 · 반복 Flow 기본 관리일이 KST 기준 어제로 표시될 수 있음 (재현 필요)**
- route `/f/washer-tub-clean-monthly` · evidenceKind: production_fetch (1회 관찰)
- 2026-07-20 09:4x KST 요청에서 "다음 통세척일 7월 19일 (일) · 이번 관리일" 수신. PR #137은 hydration 결정성만 고정; **기본 anchor의 기준 TZ**(서버 vs 사용자)는 별개 문제로 의심됨

**F-05 · /my 비브라우저 요청에 legacy '제작자 스튜디오' 셸 응답 (1회 관찰, 재현 필요)**
- evidenceKind: production_fetch
- `/my` fetch가 4탭 IA가 아닌 legacy nav(탐색/제작자/Flow Lab/만들기)의 제작자 스튜디오 마크업을 반환. 브라우저 smoke는 정상이므로 UA/SSR 분기 또는 CDN 변형 의심. 공유 미리보기·검색 노출 불일치 위험

**F-06 · public /f wide가 늘어진 모바일 컬럼**
- 1024에서 좌측 ~600px 단일 컬럼, 우측 공백. CTA 쌍이 왼쪽에 고아로 배치. 우려 9 부분 미해결 (앱 4탭은 wide 구성 있음)

**F-07 · 1024 캘린더 queue/grid/agenda 3영역 밀도** — P25 자체 Medium 인정. evidenceKind: repo_evidence

**F-08 · 고급 편집 경로 길이** — progressive disclosure로 구조는 해결, 경로 길이는 P25 자체 Medium. evidenceKind: repo_evidence

**F-09 · 날짜 입력이 상용 기준 미달**
- `yyyy-mm-dd` raw placeholder + 별도 `입력` 버튼의 2단계 커밋. 상용 도구는 캘린더 피커/자연어/프리셋(오늘·주말·+2주). 우려 10의 대표 사례

**F-10 · 여정 A 진입 route `/f/moving-d30-basic` 미검증**
- smoke 12 route에 미포함, 홈 추천은 `/flow-maps/moving-d30`로 연결. `/f/` alias 존재·정합 확인 필요. evidenceKind: production_fetch + repo_evidence

**F-11 · 완료 취소·삭제 복구·순서 변경의 발견 가능성 미확인**
- 기능은 P25-03B/05A 자동화로 존재 증명(repo_evidence). 그러나 컨트롤이 **어디서 보이는지**는 이번 정적 검토로 확인 불가 — 사용자 확인 가정으로 분리

**F-12 · AppClient.tsx 단일 파일 512KB 초과 (엔지니어링 건강)**
- 코드 검색 도구 크기 상한 초과. P26 전체 백로그 실행 속도·회귀 위험에 직결

### Low

**F-13 · 빈 내 Flow에서 `데이터 관리`가 유일한 보조 버튼** — 첫 사용자와 무관한 기능이 승격됨
**F-14 · 찾기 카드 카피 어색** — "이사일만 넣으면 저장됩니다: D-30 일정" 등 문장이 시스템 로그처럼 읽힘

## 10개 우려 판정

1. 날짜 없는 할 일의 이유/시점 — **부분 해결.** 실행처(내 Flow)·배치처(캘린더) 분리와 용어는 정착. "왜 날짜 없이 두는가"의 개념 온보딩은 없음 → P26-05
2. 조정이 필드 나열 — **구조 해결, 길이 미해결.** intent-first는 P26-06
3. 저장 직후 확신 — **자동화로 지지됨**(첫 저장 전체 Flow 확인, repo_evidence). 단 F-01이 저장 **전** 신뢰를 깎음
4. 전체 Flow 가독성 — **부분.** outline/detail은 성립, 1024 캘린더 밀도(F-07) 잔존
5. My Flow vs 캘린더 — **미해결** (F-03)
6. 완료~순서변경 연쇄 — **자동화로 지지, 발견성 미확인** (F-11)
7. export 예측 — **해결** (scope+count 선표시, Flow 전체/직접 선택/현재 항목). 사후 확인 surface는 없음 → P26-10
8. 설명문 과다 — **부분.** 설명 접힘은 됐으나 CTA·표면 중복(F-02)이 본질
9. 모바일 복잡/wide 늘어짐 — **부분.** 앱 탭 wide 구성은 개선, public /f wide(F-06)·캘린더 밀도(F-07) 잔존
10. 상용 대비 완성도 — **미달.** F-01/F-09/F-13/빈 상태 언어가 대표 사례. 시각 시스템 기준선 필요 → P26-11

## 자동화 확인 vs 사용자 확인 가정

**자동화로 확인됨:** route 가용성/redirect/overflow/console 0, 반복 projection 일치, export scope/count 일치, 완료 가역성, 저장 전 완료 컨트롤 0
**실제 사용자가 확인해야 할 가정:** 날짜 없는 할 일의 개념 이해, 내 Flow/캘린더 첫 구분, 저장 전 결과 예측 성공률, 조정 진입의 발견성, 완료 취소·복구·순서 변경 발견성, 예시 날짜 해석, export 결과 신뢰
