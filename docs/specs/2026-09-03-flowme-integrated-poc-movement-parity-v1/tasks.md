# FlowMe 통합 PoC 이동 방식 일치 v1 Tasks

## 0. 기준선

- [x] 세션 시작 절차와 최신 `origin/main` 일치 확인
- [x] dirty 원본 저장소를 미소유·읽기 전용으로 유지
- [x] 세 원천과 A0 역할 결정 재확인
- [x] stale 판정을 구현 gap으로 오인하지 않도록 재판정 후보 분리

## 1. 계약

- [x] 이번 P0와 제외 범위 고정
- [x] Flow/Task 허용 전이와 no-op/cancel 저장 의미 고정
- [x] 반응형·접근성·focus 계약 고정

## 2. React

- [x] 공용 이동 손잡이 lifecycle 추출
- [x] Flow 행 48px 손잡이 추가
- [x] Flow folder pointer/native drop과 키보드 opener 연결
- [x] Flow date/reorder invalid 및 cancel write 0 확인
- [x] component/model 테스트 보강

## 3. 독립 HTML

- [x] 왼쪽 비모달 이동 패널 shell/CSS 추가
- [x] Task 이동 메뉴를 패널로 전환
- [x] Flow 행 48px 손잡이와 folder drop 추가
- [x] 손잡이·길게 누르기·`…`·keyboard 공통 opener 연결
- [x] 현재 위치 중립, Escape/pointer cancel/blur/resize cleanup 연결
- [x] 전역 `save-status`만 live owner로 유지하고 패널·toast를 시각 사본으로 정리
- [x] 모바일 이동 패널 닫기와 목적지 조작 영역 48px 확인
- [x] 단일 HTML 두 산출물 재생성 및 byte parity 확인

## 4. 검증

- [x] final focused model/component 테스트 255/255 통과
- [x] standalone node 테스트 34/34 통과 — live owner·48px 회귀 포함
- [x] final React Stage 4 movement 브라우저 5/5 통과
- [x] core React browser 16/16과 새 `#move-panel` selector의 standalone browser
  16/16 통과
- [x] 최신 반응형 수정 기준 필수 5개 viewport + 320×700 화면 검사
- [x] 집중 검증에서 허용 prefix 밖 writer 0 및 운영 bytes 동일 확인
- [x] production build 18/18 통과
- [x] `docs:check` 통과 — 필수 문서 16개, 로컬 링크 4,588개
- [x] 최종 산출물 `git diff --check` 통과
- [ ] 전체 `npm.cmd test` — 1,520개 중 1,519개 통과 후 시간 의존
  `seed-flows` freshness 1건 실패로 중단. tail 220/220은 별도 통과했지만 전체
  회귀 PASS로 합산하지 않음. known issue로 유지

## 5. 산출물

- [x] 최종 재실행 결과로 추적표 verdict와 evidence 정합성 확인
- [x] 최종 재실행 결과로 통합 검증 보고서와 조작형 HTML 정합성 확인
- [x] 실제 기기·관찰 사용자·게시 상태 분리 보고

## 6. 이번 범위 밖 또는 미실행 증거

아래 항목은 자동화 통과로 대체하지 않으며 이번 movement-parity 구현 완료를 막는 내부
코드 작업으로 취급하지 않는다.

- [ ] 실제 Android Chrome — 미실행, 범위 밖
- [ ] 실제 iOS Safari — 미실행, 범위 밖
- [ ] TalkBack·VoiceOver 등 screen reader — 미실행, 범위 밖
- [ ] 관찰 사용자 검증 — 0명, 범위 밖
- [ ] commit·push·PR — 미진행, 범위 밖
- [ ] Preview·Production — 미진행, 범위 밖
