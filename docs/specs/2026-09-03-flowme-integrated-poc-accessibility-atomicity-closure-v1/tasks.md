# P3-A 작업표

## 완료한 준비

- [x] P2-C primary gap 17건 재분류
- [x] P3-A 범위를 `V41-036`, `D2-058`로 제한
- [x] 현재 action mapping과 focus·zero-write UX 계약 작성
- [x] `D2-058.1`~`D2-058.8` 원자성 판정 규칙 작성
- [x] 남은 실기 7건·제품/운영 결정 8건 분리
- [x] 실제 기기·보조기술 기록지 작성, 미실행 항목 분리
- [x] 정적·responsive 검증 보고서와 실행 자료 작성

## 구현·자동 검증 완료

- [x] React 탐색·개인공간 보기·항목 검토 accessible name 보완
- [x] 독립 HTML에 같은 역할 mapping과 accessible name 반영
- [x] 검토 닫기·Escape 뒤 opener focus 복귀와 mutation 0 구현·검증
- [x] 원자성 여덟 하위 조건 집중 회귀 51/51
- [x] 개인공간 PoC suite 390/390, 독립 HTML 모델 64/64
- [x] React 접근성·필수 viewport 2/2, 독립 HTML 접근성·필수 viewport 2/2
- [x] 관련 결합 브라우저 회귀 10/10: React 4 + standalone 6
- [x] 필수 5개 viewport의 overflow·console error·page error·가린 핵심 행동 0건
- [x] 허용 prefix 밖 writer 0건, clear 0건, 운영 `flow:*` sentinel byte 동일 확인
- [x] production build static page 18/18
- [x] 요구 추적 자산 8/8, 보고서 최종본 browser QA 2/2
- [x] 문서 링크 4,594/4,594와 필수 파일 16개 확인
- [x] `V41-036`, `D2-058`을 충족으로 올리고 primary snapshot `130/11/4/11/12`, gap 15로 확정

## 전체 회귀에서 분리해 기록한 결함

- [x] 전체 `npm test` 실행: 1,655건 중 1,654건 통과, 1건 실패 후 중단
- [x] 실패가 기존 `dog-adoption-first-week`의 날짜 기준 `review_due 2026-06-04` fixture임을 분리 기록
- [x] 중단 뒤 회귀 tail 220/220 별도 통과
- [x] 위 결과를 전체 회귀 PASS로 합산하지 않음

## 다음 단계로 남긴 작업

- [ ] 실제 Android Chrome 검사
- [ ] 실제 iOS Safari 검사
- [ ] TalkBack·VoiceOver·screen reader 검사
- [ ] 실제 browser 200% 확대·OS 최대 글자 검사
- [ ] 실제 모바일 가상 키보드와 장시간 사용 검사
- [ ] 남은 제품·운영 결정 8건의 owner·정책 승인

관찰 사용자는 0명이다. P3-A의 commit·push·PR·Preview·Production은 모두 미진행이다.
