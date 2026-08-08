# R1 작업 원장

## 진행 상태

- [x] R1-00 Calendar 상태·효과·라우트·포커스·범위 저장 소유권을 매핑했다.
- [x] R1-00 액션별 초기화 차이와 외부 `syncToDate` 호출 지점을 확인했다.
- [x] R1-00 기준선 단위 20/20, lock 59/59, 선별 E2E 35/35를 확보했다.
- [x] R1-01 순수 Calendar controller 전환 모듈을 추가했다.
- [x] R1-01 월·날짜·범위·Flow 선택·이벤트·더보기·경로 전환을 특성화했다.
- [x] R1-02 React controller가 Calendar 전용 상태와 ref를 소유하게 했다.
- [x] R1-02 선택 Flow localStorage 어댑터를 기존 키와 형식 그대로 연결했다.
- [x] R1-02 기존 effect 순서와 초기·후속 포커스 동작을 보존했다.
- [x] R1-03 기존 Calendar callback을 controller action으로 단계별 연결했다.
- [x] R1-03 My Flow 저장 완료 동기화와 Calendar→My Flow 경로를 연결했다.
- [x] R1-03 route/query/Back/focus/scroll/scope 저장 브라우저 회귀를 보강했다.
- [x] R1-04 전체 검증과 의존성·소유권·scoped diff 감사를 완료했다.
- [x] R1-04 `AppClient`에 남은 Calendar 책임과 다음 후보를 재평가했다.

## R1에서 하지 않을 일

- [ ] My Flow controller 분리
- [ ] UI·문구·Flow 용어 변경
- [ ] 저장 형식·잠금·복구 변경
- [ ] 결과 가져가기·receipt 변경
- [ ] Text-to-Flow 통합
- [ ] 커밋·푸시·PR·배포

위 항목은 R1 미완료가 아니라 명시적 제외 범위다.

## 완료 후 사용자 결정

- [ ] R1 scoped diff와 검증 결과를 검토한다.
- [ ] MVP에서 리팩토링을 멈출지, 다음 한 개의 제한된 단위를 승인할지 결정한다.
- [ ] 필요할 때만 Git 발행과 배포를 별도로 승인한다.
