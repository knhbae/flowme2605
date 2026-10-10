# 날짜·실행 상세 조작 UX

2026-10-04. 사용자 `다음목표 진행ㄱㄱ`에 따른 구현·검증 목표. 개인 텍스트 관리, 경험/지식 콘텐츠, 선택 참여의 방향을 유지한다. 전체 UX 완성이나 출시를 목표로 삼지 않는다.

## 기준선

- 작업본 `D:/flowme2605/flow-date-detail-ux-20261004`, branch `agent/alpha-date-detail-ux-20261004`, 시작 HEAD `a30ab173788f5d9ac4dd553bf8e85073546cf20a`, clean.
- 최신 fetch `origin/main=efd8b642707b5c8e67b727f23169ae41c43cb5e8`. 이번 증분은 PR #212의 검증·개발계 반영 판본 위에서 진행하며 main이나 기존 서비스 작업본을 수정하지 않는다.
- 이전 완료 정본은 제공 작업본 `D:/flowme2605/flow-memo-date-gaps-release-20261004/.tmp/manual-memo-date-gaps-release-20261004/qa-closeout-ko.md`. 그 판본의 QA43·CI4·운영7 결과를 이번 새 실행 수로 재사용하지 않는다.
- 최신 UX2 입력은 `D:/flowme2605/flow-text-integration-plan-20260908/docs/content-audit/2026-10-04-flowme-role-coverage-ux/handoff-ko.md`. 기획 인계이지 앱 구현/정책 확정 근거가 아니다.
- 피드백은 [26개 원장](../2026-10-04-memo-date-feedback-gaps/requirements.md), 직접 원본 작업본은 읽기만 한다. PDF/ZIP/원 캡처 미열람을 유지한다.

## 요구와 이번 경계

| ID | 근거 | 수용 조건 |
| --- | --- | --- |
| DU01 | 피드백 #3·#11, MD05, C08/C18 | 실행 상세를 열면 날짜·시간 입력과 적용이 먼저 보이고 진행/연결/순서는 요청 시 펼친다. 기존 기능 삭제 없음 |
| DU02 | FG01/MD07·PC02, C08/C09 | 날짜 출처와 미정 이동의 시간 유지·개별 적용 결과를 구분한다. 날짜 상속/시간-only/반복 정책은 바꾸지 않는다 |
| DU03 | FG05, V41-041·042·050, D2-039·040·058 | 다섯 viewport에서 핵심 조작 도달, 넘침/콘솔/page error0. 접기·펼치기·Escape·초점 복귀·동일값/취소0 mutation |
| DU04 | FG01, V41-013·014·025·028, D1-002·004·006·022, D2-003·014·015·039 | 문서→기간→같은 원문 대상 복귀. 같은 Item/원문/메모/기록/소속 유지. 미적용 날짜 입력을 새 복귀 버튼이 버리지 않음 |
| DU05 | FG01/FG02, 기존 DR01~DR10·PS 계약 | 접은 입력 유지, 저장 거절·직접 재시도·지연 응답 owner 보호, Undo/Redo/reload. 기존 handler/parser/writer/schema 재사용 |
| DU06 | UX2 P0 | 조회/접기만으로 계정·Item·copy·run·권한/분류 생성·변경 없음. ordinary/private-copy/occurrence owner를 합치지 않음 |
| DU07 | 사용자 HTML 선호 | 제품과 별개의 메모리 전용 조작 HTML 제공. 정상·취소·실패·복귀 비교 가능. 운영 데이터/계정 연결 없음 |

DU04의 새 버튼은 기존 task dialog 대상만 사용한다. recurring occurrence의 별도 ProgramRecurrence editor는 기능/정책을 변경하지 않고 회귀 경계를 유지한다. 모든 source origin과 전체424 하위조건을 재감사했다는 주장을 하지 않는다.

## 제외

폴더 전면 개편, 자연 메모 문법, 반복 한 회/전체, 독립 due, 공개 콘텐츠 확장, 실제 사용자 시험, 실제 계정/DB/Auth/DNS/Tunnel/운영 schema 변경, commit·push·PR·merge·개발계 교체·외부 배포. 현재 3105와 관리 서버, 지원 소유3106/3107을 건드리지 않는다. 새 QA는 빈 포트의 별도 합성 서버만 사용한다.

## 완료

요구별 현행/변경/검증/잔여를 연결한다. 조작 HTML·최소 구현·표적 회귀·npm test·production build·실제 합성 브라우저·5 viewport·UX 감산/독립 리뷰·docs/closeout 결과를 남긴다. 실제 기기·IME·AT·native picker popup·실DB 불변 비교는 미실행을 명시한다. backend 전달0과 합성 storage 불변을 실제DB 검사로 표현하지 않는다.
