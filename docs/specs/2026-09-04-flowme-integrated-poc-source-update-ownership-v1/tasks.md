# P3-D 작업 목록

## 완료

- [x] 최신 main·격리 worktree·dirty ownership 확인
- [x] P1-E source update 정본과 현재 PoC 충돌 조사
- [x] P3-D 범위·보호 경계·UX·QA 계약 작성
- [x] canonical/ownership adapter와 단위 테스트
- [x] immutable candidate envelope와 transition 테스트
- [x] single-key storage CAS/readback/rollback/reload 테스트
- [x] effective source composition과 개인 overlay 보존 테스트
- [x] React 비교·적용·Undo UX와 component/E2E 구현
- [x] standalone runtime/UI/E2E와 single-file 재생성
- [x] 다섯 viewport의 React·standalone 화면 캡처와 overflow·핵심 action 검사
- [x] source candidate 시나리오의 prefix 밖 write 0·운영 bytes 불변 검사
- [x] focused 38/38, 관련 개인공간 회귀 584/584, standalone unit 87/87 실행
- [x] 강화한 React keyboard/backdrop E2E 2/2, standalone source update E2E 1/1 실행
- [x] production build 실행·통과
- [x] `npm run docs:check` 통과

## closeout에서 남은 일

- [ ] traceability subcheck·bounded verdict와 P3-D 리포트 실행 수 최종 동기화
- [ ] 전체 scoped diff 확인
- [ ] 전체 `npm test`의 기존 날짜 기반 source review 실패 1건 처리 또는 명시적 보류 판정

## 미실행·제외

- [ ] 실제 Android Chrome 검사
- [ ] 실제 iOS Safari 검사
- [ ] TalkBack·VoiceOver 검사
- [ ] 관찰 사용자 검증
- [ ] commit, push, PR, Preview, Production

미실행 항목과 자동 검증을 서로 대체해 표현하지 않는다.
