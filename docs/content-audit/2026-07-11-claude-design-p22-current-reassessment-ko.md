# P22 현재 재평가와 다음 실행 기준

작성일: 2026-07-11

## 판정

P22의 자동 구현·검증 가능한 범위는 대부분 닫혔다. 현재 FlowMe는 한 브라우저 안에서 URL/메모 발견, 저장, 개인 수정, My Flow·Calendar 실행, 완료, 비공개 회고, 외부 파일 생성까지 이어지는 private beta 흐름을 갖췄다.

다만 **상용 서비스 준비 완료로 판정할 수는 없다.** 실제 반복 사용자 관찰, 계정·기기 간 저장 연속성, 실제 Calendar 앱 import, 완료 Flow의 과거 실행 보존이 남아 있다.

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
| P22-06 완료 Flow 재사용·버전 정책 | spec 완료 | 세 재사용 경우와 충돌 규칙 확정 | runId 기반 완료 기록 모델 구현 |
| P22-07 Studio·공개 리뷰 확장 | 의도적 보류 | Studio secondary tier 유지 | 실제 사용·정정 요청 데이터가 쌓일 때 재검토 |

## 여정별 변화

### URL/메모에서 실행물로

- 홈의 URL/메모 진입과 `/flows` hit 경로는 유지됐다.
- miss는 `초안 준비하기` 한 행동으로 압축됐다.
- 요청 관리·원 URL·재조회는 보조 영역으로 내려갔다.
- live AI 생성처럼 읽히는 문구는 없다.

판정: **자동 evidence 기준 개선 완료. 실제 신규 사용자 관찰 필요.**

### 저장 후 실행과 수정

- My Flow와 Calendar 기본 상세는 완료 체크와 닫기 중심이다.
- 제목·날짜·메모 편집과 원문·내보내기는 명시적으로 펼쳐야 나타난다.
- 실행 상태와 편집 상태가 같은 화면에서 동시에 경쟁하지 않는다.

판정: **구조 개선 완료. 긴 편집 폼의 사용 빈도는 관찰 전 미확정.**

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

- 중복 저장 방지는 있으나 지난 실행과 새 실행을 분리하는 모델은 없다.
- 현재 slug key 초기화는 완료 기록과 회고를 지울 수 있다.
- P22-06에서 실행 인스턴스, 날짜 재설정, 버전 충돌 규칙을 문서화했다.

판정: **정책은 닫혔고 구현은 아직이다. 다음 자동 구현의 최우선 후보다.**

## 출시 gate

### Private beta 허용 범위

- 한 기기·한 브라우저 사용
- 데이터 초기화 가능성을 사전에 알림
- 공개 리뷰·원본 수정 전송·실시간 AI·양방향 sync를 약속하지 않음
- 파일 export는 제공하되 Calendar provider별 import 성공을 보장하지 않음

### 상용 출시 전 필수

1. 최소 5명의 3회차 이상 종단 관찰
2. URL/메모 진입부터 첫 완료까지 drop-off 기록
3. 완료 후 2차 실행 또는 재방문 이유 기록
4. local-only, 계정 저장, 기기 변경·복구 정책 결정
5. 실제 Calendar 앱 import와 중복 처리 확인
6. 완료 기록을 보존하는 runId 기반 실행 모델

## 지금 하지 않을 것

- 화면 카드와 설명을 더 늘리는 polish
- Studio를 5번째 탭으로 승격
- 공개 별점·댓글·인기 순위
- 원본 자동 수정 또는 자동 버전 병합
- live AI 생성 과장
- provider sync
- 실제 사용자 관찰을 가상 persona 결과로 대체

## 다음 구현 선택

### 추천: P22-06 Slice A

실행 인스턴스와 완료 기록 보존을 먼저 구현한다. 화면의 `다시 쓰기`는 아직 추가하지 않는다.

이유:

- 현재 slug 기반 초기화는 과거 기록 손실 위험이 있다.
- UI부터 만들면 버튼은 작동해 보여도 완료 회고와 개인 수정본이 덮어써질 수 있다.
- runId와 완료 snapshot을 먼저 만들면 이후 `그대로 다시 쓰기`, `날짜만 새로 잡기`, `새 내용 검토`를 같은 데이터 경계 위에 올릴 수 있다.

### 병행 수동 gate

- P22-05 fixture를 설정된 Google Calendar, Apple Calendar 또는 Outlook profile 하나에 import한다.
- 같은 파일을 두 번 import해 중복 동작을 기록한다.
- 이 결과는 코드 구현과 분리해 evidence에 추가한다.

### 사용자 관찰 gate

P22-00은 Codex나 Claude가 대신 완료할 수 없다. 실제 사람에게 아래 세 번을 관찰해야 한다.

1. 첫 진입: URL/메모로 Flow를 찾고 저장
2. 실행 중: 날짜·제목·메모 수정, 완료 체크, Calendar 확인
3. 재방문: 완료 회고, 다시 사용할 의향, 파일 export 사용 결과

## 근거 문서

- [P22-01 완료 후 회고 evidence](./2026-07-11-claude-design-p22-01-completion-feedback-evidence/README.md)
- [P22-03 URL miss 압축 evidence](./2026-07-11-claude-design-p22-03-url-first-miss-compression-evidence/README.md)
- [P22-04 실행/편집 상세 분리 evidence](./2026-07-11-claude-design-p22-04-execution-edit-detail-evidence/README.md)
- [P22-05 외부 import evidence](./2026-07-11-claude-design-p22-05-external-import-evidence/README.md)
- [P22-06 완료 Flow 재사용·버전 정책](./2026-07-11-claude-design-p22-06-completed-flow-reuse-version-policy-ko.md)
- [P22 독립 제품·UX 평가](./2026-07-11-flowme-longitudinal-user-journey-review-package/codex-assessment.md)

## 다음 `/goal` 후보

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
P22-06 정책의 Slice A를 구현한다. 기존 slug 기반 My Flow 상태를 잃지 않으면서 실행 인스턴스와 완료 기록 snapshot을 도입하고, 같은 Flow의 새 실행이 과거 완료·회고·원본 알리기 기록을 덮어쓰지 않게 한다. 사용자-facing `다시 쓰기` UI, 새 버전 비교 UI, Studio 확장은 이번 slice에 포함하지 않는다.

완료 기준:
- legacy slug 상태를 첫 실행으로 읽는 migration adapter
- active/completed runId 분리
- 완료 당시 source version과 personal copy snapshot 보존
- 새 실행의 완료 체크·회고·원본 알리기 미복사
- 기존 My Flow/Calendar/export 동작 회귀 없음
- 저장 unit test와 targeted E2E 통과
```
