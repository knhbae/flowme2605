# P22 현재 재평가와 다음 실행 기준

작성일: 2026-07-11

## 판정

P22의 자동 구현·검증 가능한 범위는 대부분 닫혔다. 현재 FlowMe는 한 브라우저 안에서 URL/메모 발견, 저장, 개인 수정, My Flow·Calendar 실행, 완료, 비공개 회고, 외부 파일 생성까지 이어지는 private beta 흐름을 갖췄다. My Flow 전체 기록을 버전형 JSON으로 백업하고 빈 브라우저에 복원하는 수동 복구 경로도 추가됐다.

다만 **상용 서비스 준비 완료로 판정할 수는 없다.** 실제 반복 사용자 관찰, 계정 기반 자동 동기화 여부 결정, 실제 Calendar 앱 import가 남아 있다. 백업·복원은 수동 복구 수단이지 계정 저장이나 자동 동기화가 아니다.

따라서 다음 원칙을 적용한다.

1. 추가 UI polish와 Studio 확장은 멈춘다.
2. 자동화로 가능한 다음 구현은 P22-06 Slice A `실행 인스턴스와 완료 기록 보존`으로 제한한다.
3. 상용 출시 등급은 P22-00 실제 사용자 관찰과 persistence 결정을 통과하기 전까지 올리지 않는다.
4. P22-05 실제 Calendar 앱 수동 import 1건은 별도 수동 gate로 유지한다.

## P22 상태표

| 항목 | 현재 상태 | 확인된 결과 | 남은 조건 |
| --- | --- | --- | --- |
| P22-00 실제 종단 관찰·저장 연속성 | Blocking, 미실행 | 시뮬레이션과 자동 E2E만 있음 | 최소 5명·3회차 관찰, 기기 변경 기대, 출시 등급 승인 |
| P22-01 완료 후 회고 | 구현 완료 | 완료 후 비공개 회고 1개, 공개 리뷰 오해 0 | 계정 저장 전 local-only |
| P22-02 개인 수정/원본 알리기 경계 | P22-01에 포함해 구현 완료 | 두 저장 경계 분리, overlay mutation 0, live submit 오해 0 | 실제 전송 transport는 보류 |
| P22-03 URL miss 압축 | 구현 완료 | 첫 행동 1개, 운영 상태 문구 0, live AI 오해 false | 실제 신규 사용자의 이해 관찰 |
| P22-04 실행/편집 상세 분리 | 구현 완료 | 기본 직접 행동 최대 2, 편집 취소·저장 4/4, overflow 0 | 긴 편집 폼의 반복 사용성 관찰 |
| P22-05 외부 도구 왕복 | 조건부 완료 | Excel 3/3, Word 3/3, iCalendar parser 3/3+개인 1/1 | 설정된 Calendar 앱 import·중복 import 1회 |
| P22-06 완료 Flow 재사용·버전 정책 | Slice A·B·C·D 구현 완료 | runId, 완료 snapshot, 새 기준일 충돌 정책, 항목 단위 버전 검토, 완료 Flow 재사용 UI | 실제 반복 사용자 이해도 관찰 |
| P22-07 Studio·공개 리뷰 확장 | 의도적 보류 | Studio secondary tier 유지 | 실제 사용·정정 요청 데이터가 쌓일 때 재검토 |
| P22-00 지원 slice · 로컬 백업/복원 | 구현 완료 | 허용 키 기반 v1 백업, 빈 My Flow 복원, 실패 rollback, 내부 키 제외 | 실제 기기 이동 1건과 자동 sync 기대 관찰 |

## 여정별 변화

### URL/메모에서 실행물로

- 홈의 URL/메모 진입과 `/flows` hit 경로는 유지됐다.
- miss는 `초안 준비하기` 한 행동으로 압축됐다.
- 요청 관리·원 URL·재조회는 보조 영역으로 내려갔다.
- live AI 생성처럼 읽히는 문구는 없다.

판정: **자동 evidence 기준 개선 완료. 실제 신규 사용자 관찰 필요.**

### 공개 공유 화면에서 저장으로

- 일부 대표 `/f` route에만 즉시 보이던 저장 행동을 모든 비-export-first public Flow의 공통 계약으로 넓혔다.
- 모바일은 첫 스크롤 전 고정 `내 Flow에 저장` CTA 1개, wide는 hero 저장 CTA 1개만 보인다.
- 스크롤 뒤 나타나던 진행률+저장 bar는 공통 save-first route에서 제거하고, 파일 export는 본문 Flow 단위 2차 행동으로 유지했다.
- exact-video의 긴 source-derived 실행 기준은 짧은 요약 아래에서 기본 접힘으로 두고 필요할 때 펼친다.

판정: **공유 shell 일관성은 자동 QA 기준 개선 완료. 실제 공유 수신자의 저장 이해도는 관찰 필요.**

### 콘텐츠 최신성과 공개 제작자 기본 노출

- 의도적 채널 미리보기/hidden 462개와 정상 사용자 실행 후보 155개를 같은 최신성 분모로 계산하지 않는다.
- 정상 사용자 실행 후보 155개는 원문 URL, 출처 정밀도, 원문 확인일을 모두 갖도록 회귀 기준을 추가했다.
- 기존 확인일 누락 8개는 2026-07-11 원문 생존/주제 적합성을 다시 확인하고 `exact` 5개, `broad` 3개로 기록했다.
- 공개 `/u/flow-curation-team`은 75개 전체를 기본 노출하지 않고, 실제 원문 7개와 대표 Flow 1개만 먼저 보여준다. 검토 중 60개와 샘플 6개는 명시적 필터를 선택해야 보인다.
- 개인 `/u/my-flow-studio`는 초안 선반이므로 기존 전체/초안 기본 동작을 유지한다.
- live URL 감사에서 최초 404 6개와 redirect 5개를 0으로 줄였다. 삭제·불안정·source row 미확인 콘텐츠 6개는 preview로 이동했고, 2016/2025 고정 자료와 시점 고정 정책 수치는 현재 공식 안내로 교체했다.
- 연도가 붙지 않은 숫자도 다시 대조해 Toss 원문과 다른 40/40/20 비율, 출생신고와 행복출산의 온라인 경로 혼합, 안심상속의 근거 없는 6개월 문구를 제거했다. 현재 숫자 attention은 공식 기한 7개와 비교용 예시 1개이며 알려진 source contradiction은 0개다.

판정: **기본 공개 표면의 오래된/미검토 콘텐츠 혼입은 자동 QA 기준 개선 완료. 외부 원문 변경을 잡는 주기적 재확인은 계속 필요.**

### 오래된 페이지와 검색 노출 경계

- 미리보기 후보와 원본 검토 수치를 보여주던 `/creators`를 정상 secondary nav에서 제거했다. 공개 creator profile은 public Flow의 byline과 직접 profile link로 유지한다.
- `/content-flows`, `/creators`, `/ia-compare*`, `/restart/*`, `/flow-lab*`는 direct-only internal/release-preview route로 분리하고 `noindex`를 적용했다.
- `/my`, `/calendar`, `/flows/new`, `/flows/[id]/edit`, `/flow-maps/[map]/creator`, `/u/my-flow-studio`는 브라우저 저장 상태 또는 개인 편집을 다루므로 `noindex`다.
- preview creator channel과 존재하지 않는 `/u/*` profile은 `noindex`; 확인된 non-preview public creator profile만 indexable이다.
- 모바일 390px과 wide 1024px 정상 route에서 `/creators`와 internal/release-preview 링크는 0이다.

판정: **과거 실험·검토 페이지가 정상 nav나 검색 결과에서 현재 제품처럼 보이는 경로를 자동 QA 기준으로 차단했다. 직접 URL 개발 접근은 유지한다.**

### 저장 후 실행과 수정

- My Flow와 Calendar 기본 상세는 완료 체크와 닫기 중심이다.
- 제목·날짜·메모 편집과 원문·내보내기는 명시적으로 펼쳐야 나타난다.
- 실행 상태와 편집 상태가 같은 화면에서 동시에 경쟁하지 않는다.

판정: **구조 개선 완료. 긴 편집 폼의 사용 빈도는 관찰 전 미확정.**

### 로컬 기록 복구

- 빈 My Flow에서도 `데이터 관리`를 열 수 있다.
- 저장한 Flow, 개인 수정, 완료 실행, 회고, URL 요청을 허용 키 기반 v1 JSON으로 백업한다.
- 데모 인증, 내부 검토, 업데이트 dismiss 같은 비실행 키는 백업에서 제외한다.
- 복원 전 날짜와 기록 수를 확인하고, 복원 실패 시 기존 실행 기록을 되돌린다.
- 화면에서 `현재 브라우저에만 보관`과 `자동으로 맞춰지지 않음`을 명시한다.

판정: **수동 복구 기능은 자동 QA 기준 완료. 계정 저장·자동 sync와 실제 기기 이동 성공을 뜻하지 않는다.**

### 완료 후 학습

- 완료한 Flow에서 내 실행 회고와 원본 내용 알릴 점을 분리했다.
- 원본 관련 메모는 전송 완료가 아니라 local draft임을 명시한다.
- 완료 체크와 개인 수정본은 회고 저장으로 바뀌지 않는다.

판정: **소유권 경계의 첫 slice 완료. 서버 transport·공개 리뷰는 보류가 맞다.**

### 외부 도구로 옮기기

- 한글 ICS byte folding, 제목·날짜·사용자 메모, sheet/memo projection을 보정했다.
- Excel·Word 실제 읽기와 독립 Calendar parser는 통과했다.
- Outlook local MAPI는 최소 fixture도 실패해 환경 blocked로 분리했다.

판정: **파일 품질은 개선됐지만 실제 Calendar 앱 성공을 주장하지 않는다.**

### 반복 사용

- 완료한 Flow에서 지난 실행을 기록으로 남기고 새 실행을 시작할 수 있다.
- 현재 slug key 초기화는 완료 기록과 회고를 지울 수 있다.
- P22-06에서 실행 인스턴스, 날짜 재설정, 버전 충돌 규칙을 문서화했다.
- Slice A에서 기존 slug 상태를 별도 run으로 보존하고 새 실행의 현재 상태만 초기화하는 저장 계약을 구현했다.
- Slice D에서 날짜형 Flow의 새 기준일·고정 날짜 선택과 날짜 없는 Flow의 같은 사본 재사용을 My Flow에 연결했다.

판정: **정책, 저장 계약, 날짜 재설정, 새 버전 비교, 사용자-facing 재사용 흐름은 닫혔다. 실제 반복 사용자 관찰은 아직이다.**

## 출시 gate

### Private beta 허용 범위

- 한 기기·한 브라우저 사용
- 데이터 초기화 가능성을 사전에 알림
- 필요하면 My Flow 백업 파일로 수동 복구
- 공개 리뷰·원본 수정 전송·실시간 AI·양방향 sync를 약속하지 않음
- 파일 export는 제공하되 Calendar provider별 import 성공을 보장하지 않음

### 상용 출시 전 필수

1. 최소 5명의 3회차 이상 종단 관찰
2. URL/메모 진입부터 첫 완료까지 drop-off 기록
3. 완료 후 2차 실행 또는 재방문 이유 기록
4. local-only 수동 백업 이후 계정 저장·자동 동기화 정책 결정
5. 실제 Calendar 앱 import와 중복 처리 확인
6. 실제 다른 브라우저에서 백업·복원 1건과 사용자 이해 확인

## 지금 하지 않을 것

- 화면 카드와 설명을 더 늘리는 polish
- Studio를 5번째 탭으로 승격
- 공개 별점·댓글·인기 순위
- 원본 자동 수정 또는 자동 버전 병합
- live AI 생성 과장
- provider sync
- 실제 사용자 관찰을 가상 persona 결과로 대체

## 다음 구현 선택

### 완료: P22-06 Slice A

실행 인스턴스와 완료 기록 보존 저장 계약을 구현했다. 화면의 `다시 쓰기`는 아직 추가하지 않았다.

이유:

- legacy 상태 승격, 완료 snapshot, 새 active run 분리가 unit test로 고정됐다.
- 완료 뒤 작성한 회고도 과거 run에 동기화된다.
- 기존 My Flow·Calendar·export 호출부는 바뀌지 않았다.

### 완료: P22-06 Slice B

`날짜만 새로 잡기`의 순수 정책 함수와 active Map projection 갱신을 구현했다. 개별 고정 날짜가 있으면 `새 기준일에 맞추기 / 기존 날짜 유지`를 선택하지 않고는 새 실행이 시작되지 않는다.

### 완료: P22-06 Slice D

완료된 My Flow에서 `이 Flow 다시 쓰기`를 보조 행동으로 열고, 날짜형 Flow에는 새 기준일과 고정 날짜 처리 선택을 한 sheet에서 받는다. 새 버전이 실제로 있을 때만 Slice C 검토 경로를 별도로 노출한다.

- URL 초안·일반 Flow의 제목·메모·날짜도 완료 실행 snapshot에 고정
- 새 실행에는 제목·사용자 메모만 안정 항목 키로 복사하고 일회성 로그는 미복사
- 마지막 완료 체크 시각을 실제 완료일로 기록
- source-backed saved snapshot과 persistence record 동시 갱신
- 모바일 390px, wide 1024px overflow 0

검증 evidence는 [P22-06D 완료 Flow 재사용 evidence](./2026-07-11-claude-design-p22-06d-flow-reuse-evidence/README.md)에 기록했다.

### 완료: P22-06 Slice C

실제 발행 버전 차이가 있는 fixture에서만 `새 내용 검토`를 열고, 안정 항목 ID 기준 changed/added/removed 분류와 개인 수정 충돌을 순수 로직·단위 테스트로 고정했다. 진행 중 실행은 저장 당시 발행본을 유지하고, 선택 결과는 새 run에만 반영한다. 새 실행의 진행 분모와 완료 대상도 사용자가 포함한 항목만 읽는다.

검증 evidence는 [P22-06C 새 버전 검토 evidence](./2026-07-11-claude-design-p22-06c-version-review-evidence/README.md)에 기록했다.

### 병행 수동 gate

- P22-05 fixture를 설정된 Google Calendar, Apple Calendar 또는 Outlook profile 하나에 import한다.
- 같은 파일을 두 번 import해 중복 동작을 기록한다.
- 이 결과는 코드 구현과 분리해 evidence에 추가한다.

### 다음 핵심 단계: 사용자 관찰 gate

P22-00은 Codex나 Claude가 대신 완료할 수 없다. 실제 사람에게 아래 세 번을 관찰해야 한다.

진행자용 [P22-00 실제 반복 사용자 관찰 보드](./2026-07-11-flowme-p22-00-observed-user-gate-kit-ko.html)와 [세션 기록 양식](../validation-sessions/2026-07-11-flowme-p22-00-session-template.md)을 준비했다. 내부 `/flow-lab/p22-observation`에서 완료 Flow·새 원문 비교 상태를 만든 뒤 참가자에게는 정상 `/my` 화면만 넘긴다. 이는 관찰 실행 준비이며 사용자 검증 결과가 아니다.

준비 상태와 모바일·wide 판정은 [P22-00 관찰 gate 준비 evidence](./2026-07-11-flowme-p22-00-observation-gate-evidence/README.md)에 기록했다.

1. 첫 진입: URL/메모로 Flow를 찾고 저장
2. 실행 중: 날짜·제목·메모 수정, 완료 체크, Calendar 확인
3. 재방문: 완료 회고, 다시 사용할 의향, 파일 export 사용 결과

## 근거 문서

- [P22-01 완료 후 회고 evidence](./2026-07-11-claude-design-p22-01-completion-feedback-evidence/README.md)
- [P22-03 URL miss 압축 evidence](./2026-07-11-claude-design-p22-03-url-first-miss-compression-evidence/README.md)
- [P22-04 실행/편집 상세 분리 evidence](./2026-07-11-claude-design-p22-04-execution-edit-detail-evidence/README.md)
- [P22-05 외부 import evidence](./2026-07-11-claude-design-p22-05-external-import-evidence/README.md)
- [P22-06 완료 Flow 재사용·버전 정책](./2026-07-11-claude-design-p22-06-completed-flow-reuse-version-policy-ko.md)
- [P22-06A Flow run storage evidence](./2026-07-11-claude-design-p22-06a-flow-run-storage-evidence/README.md)
- [P22-06B new anchor policy evidence](./2026-07-11-claude-design-p22-06b-new-anchor-policy-evidence/README.md)
- [P22-06C version review evidence](./2026-07-11-claude-design-p22-06c-version-review-evidence/README.md)
- [P22-06D completed Flow reuse evidence](./2026-07-11-claude-design-p22-06d-flow-reuse-evidence/README.md)
- [P22 local 백업·복원 evidence](./2026-07-11-flowme-local-backup-restore-evidence/README.md)
- [자동 회귀 기준선 복구 감사](./2026-07-11-flowme-automated-regression-recovery-audit-ko.md)
- [public 공유 save-first 일관성 evidence](./2026-07-11-flowme-public-save-first-consistency-evidence/README.md)
- [공개 콘텐츠 최신성·기본 노출 evidence](./2026-07-11-flowme-content-freshness-evidence/README.md)
- [정상 사용자 콘텐츠 출처 도달성 evidence](./2026-07-11-flowme-live-source-reachability-evidence/README.md)
- [숫자·서비스 경계 source-fit evidence](./2026-07-11-flowme-numeric-claim-source-fit-evidence/README.md)
- [route lifecycle·indexing evidence](./2026-07-11-flowme-route-lifecycle-indexing-evidence/README.md)
- [P22 독립 제품·UX 평가](./2026-07-11-flowme-longitudinal-user-journey-review-package/codex-assessment.md)

## 다음 `/goal` 후보

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
P22-00 실제 종단 관찰을 실행한다. 최소 5명이 첫 저장, 실행 중 수정·완료, 재방문·다시 쓰기를 3회차까지 수행하게 하고, 새 버전 검토 선택을 이해하는지 기록한다. 자동화 결과를 실제 사용자 검증으로 대체하지 않는다.

완료 기준:
- 최소 5명·3회차 관찰
- URL/메모 진입부터 첫 완료까지 drop-off 기록
- 완료 후 다시 쓰기와 새 버전 검토 이해도 기록
- Calendar import 실제 앱 1건과 중복 import 기록
- 계정·기기 간 저장 연속성 정책 결정
```
