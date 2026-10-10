# 실행 계획

1. **요구 대조**: 현재 code/QA와 v4.1·개발1·개발2 요구 및 UX1/2 인계·9/30 연구를 연결. 구형 U14의 ACK 표시 잔류는 이미 해결됨을 현재 QA로 대조.
2. **설계·비교**: 개인 작성 중심 여정은 깊게, 공개 탐색/개인 사본/외부 출력/선택적 기여는 전체 맵에 유지. A/B 같은 합성 자료·같은 동작·기존 토큰으로 비교. 새 시각 브랜드/이미지 생성 없는 기존 디자인의 좁은 UI 개선이다.
3. **최소 구현**: 계정 관리 강제 새 행 제거, editor 보조 동작 disclosure, 날짜 대상 표시. 각 Undo의 의미를 구분해 유지. 실제 baseline에서 이미 열린 Alpha 편집기의 원문 복귀 결함이 발견되어 native source focus를 연결한다. 일반 ProgramApp은 기존 navigation checkpoint의 단일 복원 권한을 유지하고 Alpha의 별도 복귀가 끼어들지 않도록 분리한다. docId/lineId route·writer·schema는 유지한다.
4. **검증**: 초기 현재 bundle 측정→변경 후 동일 여정·viewport 측정. 논리·컴포넌트·저장 경계·기존 브라우저 회귀, npm test·build·docs. 실제 API/Auth/DB는 합성으로 차단. browser/IAB에서 로컬 HTML을 먼저 확인하고 필요하면 Playwright 자동화를 병행.
5. **보고**: 조작 HTML·요구 대조·전후 계측·평가·보류/다음 후보·테스트 실제 실행수를 분리. clean source diff와 원래 공개 worktree 불변을 확인. 게시/교체0으로 마감.

## 역할과 소유

root: 목표·계획·요구/보고·Alpha shell CSS·검증과 최종 리뷰. 독립 요구 감사는 읽기 전용. editor 구현 담당은 ProgramTextEditor와 관련 전용 검사만 소유한다. prototype 담당은 단일 조작 HTML과 그 전용 검사만 소유한다. 다른 worktree dirty/untracked는 읽기만 한다.

## 평가 기준

첫 작성까지의 화면 점유, 경쟁하는 상시 행동, 다음 행동/변경 대상, 같은 Item·메모·폴더·기록 보존, 원문 위치 복귀, 키보드/비드래그 동선, 오류/취소/Undo 접근. 원시 DOM 수치와 전문가 내부 판정을 분리한다. 줄 수/클릭 수 감소만으로 사용성 개선을 입증하지 않는다.
