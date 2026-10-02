# Flow 제작·개인 사본·일정 실행 연결

2026-10-01. 사용자 ‘다음 목표 잡고 ㄱㄱ, 피드백 업데이트도 확인’ 승인으로 진행한다. 개인 텍스트 관리·공유 경험/지식·선택적 커뮤니티 기여를 유지한다. 읽기/출력에서 끝내거나 독립 개인 문서를 쓰는 경로를 제작·공개의 필수 단계로 바꾸지 않는다.

## 기준과 소유

- 깨끗한 새 작업본 `D:/flowme2605/flow-flow-execution-ux-20261001`, branch `agent/flow-flow-execution-ux-20261001`, base `9333b29931c838a51a5034e15e908ef0218e154b`. 최신 통합 제품을 포함하는 PR207 판본이며 main 병합판은 아니다.
- 최신 `origin/main`은 `efd8b642707b5c8e67b727f23169ae41c43cb5e8`로 읽기 확인했다. 기존 `flow-mvp`의 dirty/untracked는 모두 미소유다.
- 실행 개발계는 별도 `flow-folder-content-ux-20261001`, 제품 `6d534a97`, build `667DI4JldqTDckfQ16wB5`, loopback3105/Tunnel3864다. 이번 작업본의 install/build와 구분하며 교체하지 않는다.
- 피드백 정본은 다른 세션 소유 `D:/flowme2605/flow-mvp/docs/content-audit/2026-09-28-flowme-use-feedback-session-ko.md`다. 현재 21항목, SHA256 `6ADF5B6102D869A30B0751DD10B8DEADDF026E8A641DF8FC86A3E6ADE162ADBA`. 직전 기록의 `39BBBAA263CFA1579EC569C687684D1DE4DFB425DA4DCEC5A1A5FF21D6106516`과 다르다. 이전 원문 사본 없이 정확한 byte diff·변경 시점은 추정하지 않는다. 원본을 복제·수정·stage하지 않는다.

## 집중 범위

1. #18 제작 발견과 [J12/J13 요구](../2026-10-01-alpha-ux-journey/requirements.md)를 v4.1·개발1·개발2의 원래 요구 및 P06/P07 후속에 연결한다.
2. 제작 working/명시 저장 판본, raw/native 제작 owner, 공개 선택 판본, 개인 사본/문서·실행 기록을 구분한다.
3. 제작→결과 읽기→명시 개인 사용→같은 문서/Item의 날짜·완료→원문 복귀·reload를 실제 합성 브라우저로 재검사한다. 지원하지 않은 조합은 별도 후속으로 표시한다.
4. 취소/같은 값/조회는 추가 mutation0, 저장 실패는 성공 mutation0이며 입력/선택/원문을 보존한다. 개인 실행 변경은 제작/공개 원본·판본을 바꾸지 않는다.
5. 기존 승인 계약 안에서 확인한 기능·UX 갭만 좁게 보완한다. 이미 있는 기능을 신규 구현으로 세지 않는다.

## 진행·마감

2026-10-02 사용자 ‘승인!’으로 공개 Flow 개인 사본의 날짜·시간 저장 연결을 위한 좁은 요청 설계·구현을 추가 승인했다. 범위는 [조작 계약](interaction-contract.md)의 개인 일정 intent와 합성 검증이며 실제 DB 설정·migration·배포는 그대로 제외한다. 승인 대기 blocker는 해소됐고 같은 목표를 재개한다.

[단계 계획](plan.md)·[작업 원장](tasks.md)을 따른다. 요구별 현재/변경/검증/후속, 실제 실행 수와 실패·재시도 이력, 다섯 크기 평가, 조작 가능한 HTML을 제공한다. 제품과 HTML의 합성 모델·자동 QA·실기기·관찰 증거는 분리한다.

## 제외

새 @/#/메모/Enter 제품 문법·이름 정책, 하위 목록 전체 폴더 전환, 모든 콘텐츠/Flow Map 충실도, 공개 운영/커뮤니티 전면 재설계, 실계정 자료 이관, DB/Auth/migration·실제 서버 쓰기·설정·Tunnel/DNS·자동 시작·5D 활성화는 제외한다. 운영 `flow:*` writer/clear 호출 금지. commit/push/PR/merge·개발계 교체·Preview/Production·실기기/관찰 사용자 시험도 이번 목표 밖이다. 새 정책 결정을 요구하는 항목은 근거와 대안을 분리해 사용자에게 요청한다.
