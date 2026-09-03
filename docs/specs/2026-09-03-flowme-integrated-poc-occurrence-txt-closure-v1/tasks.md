# 작업표

- [x] 정본·현재 코드·trace 재감사
- [x] occurrence/TXT 버전 계약 작성
- [x] occurrence 순수 모델과 경계 테스트
- [x] authoring 전용 속성·하위 체크·반복 parser
- [x] result projection v3와 complete TXT serializer
- [x] 회차 shadow transition·Undo·reload
- [x] React 회차 상세와 조작 연결
- [x] standalone 동등 구현과 single-file 생성
- [x] targeted 및 전체 자동 테스트 실행
- [x] production build
- [x] React·standalone 6 viewport 브라우저 시나리오·화면 평가
- [x] 운영 `flow:*` byte 불변 검증
- [x] 168개 trace와 P2-B 검증 보고서 갱신
- [x] closeout

## 종료 근거

- PoC 전용 회귀: `17/17 + 354/354`, standalone 모델: `62/62`, 집중 모델: `77/77` 통과
- React↔standalone 교차 계약: `17/17`, React·standalone P2-B 브라우저: 각각 `1/1` 통과
- React·standalone 6 viewport와 보고서 6 viewport: 각 `1/1`, `1/1`, `2/2` 통과
- production build: 정적 페이지 `18/18`, 문서 검사: 로컬 링크 `4,594/4,594` 통과
- `npm test`: `1,635/1,636` 통과 후 기존 날짜 의존 fixture 1건에서 중단. 남은 두 묶음은 별도 `220/220` 통과
- P2-B 판정: D2-017·D2-020 충족. 전체 보고서는 기존 회귀 1건을 분리한 조건부 완료
