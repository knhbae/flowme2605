# P3-F 작업 목록

## 정본·판정

- [x] P3-E readiness 문서와 primary/subcheck trace 대조
- [x] canonical model·storage 계약의 승인 상태와 runtime 미구현 상태 분리
- [x] 전역 ink/cobalt와 exact-query white/gray/teal의 owner 범위 확인
- [x] SourceRow와 canonical node의 stable-key tuple 확인
- [x] 네 부모 승격 조건과 남을 7개 gap 고정

## 후보 구현

- [x] 다중 content registry와 UUID-shaped identity 연결
- [x] SourceSnapshot/SourceRow, Item/Step/Flow, optional Bundle 관계 연결
- [x] version append·removed identity·standalone Flow positive fixture
- [x] collision·dangling·mistyped·cycle·future ref negative fixture
- [x] 여덟 plane owner와 deterministic precedence 연결
- [x] PublishedVersion immutable append와 overlay/run 불변 검증
- [x] derived ExportSnapshot envelope와 receipt relation 검증
- [x] cross-owner mutation fail-closed 검증
- [x] 전역 PlatformNav와 로컬 teal token scope 분리
- [x] v4.1 flat surface와 폴더→날짜→완료 흐름 유지
- [x] 원문 / 구조·도구 / 결과 역할과 mobile compact 2-state 연결
- [x] React와 standalone parity 연결

## 필수 자동 검증

- [x] identity·plane pure model focused test — candidate 26/26
- [x] component focused test — product shell 6/6
- [x] standalone model·interaction test
- [x] React browser와 standalone browser 시나리오
- [x] 필수 5 viewport overflow·가림·console/page error 검사
- [x] keyboard·비드래그 경로와 저장 오류·cancel zero mutation
- [x] 기본 `/my`와 운영 key/value byte 불변
- [x] P2-B~P3-F additive trace — 45/45(P3-F 자산 8개 포함)
- [x] 전체 `npm test` — 2,126/2,126, 12개 Node invocation
- [x] production build — 18/18 static page
- [x] 최종 Playwright — 77/77, 6개 spec·Stage 3 포함
- [x] docs 검사 — 필수 파일 16개, 로컬 링크 4,632/4,632
- [x] security audit 실행 — 실패, 고위험 1건·낮음 1건, 자동 수정 미실행

## P3-F trace

- [x] `V41-001`, `D2-002`, `D2-004`, `D2-007`만 격리 통합 PoC `충족/E4`로 기록
- [x] `138/4/3/11/12`, gap 7 고정
- [x] 남은 gap을 `V41-062`, `V41-063`, `V41-064`, `V41-066`, `D2-038`, `D2-042`, `D2-061`로 고정
- [x] Production ready false와 운영 미실행 경계 기록

## 실기 대기

- [ ] 실제 Android Chrome
- [ ] 실제 iOS Safari
- [ ] TalkBack
- [ ] VoiceOver
- [ ] OS 최대 글자·browser 200%
- [ ] 관찰 사용자 검증

## 명시적 제외

- [x] 범위 밖 유지 — 운영 schema·SQL·RLS·API·migration
- [x] 범위 밖 유지 — 기존 writer 변경
- [x] 범위 밖 유지 — provider fetch/sync
- [x] 범위 밖 유지 — 운영 publish·ExportSnapshot writer
- [x] 범위 밖 유지 — 기본 `/my` 재설계
- [x] 범위 밖 유지 — commit, push, PR, Preview, Production

체크되지 않은 실기 항목은 누락이 아니라 이번 후보의 판정 밖이다. 완료 수치와 security audit 실패는 [QA](./qa.md)에 실행 상태별로 기록한다.
