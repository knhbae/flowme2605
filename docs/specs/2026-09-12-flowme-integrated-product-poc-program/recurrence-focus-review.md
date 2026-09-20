# 반복 계획 변경 후 정확한 작업 위치

2026-09-13 · 통합 계획의 중간 UX/개발 보완. 전체 범위와 영구 제품 정책을 바꾸지 않는다.

## 실제 문제와 설계

Uc9의 실제 Map 개인 계획 적용 뒤 선택한 기존 source 회차가 새 개인 회차로 교체됐다. 저장은 성공했지만 키보드 초점이 BODY에 남았다. 이전 실행·복귀 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/structured-map-plan-return-2026-09-13T06-14-47-833Z.json`)의 실제 관찰이며 데이터 손상이나 저장 실패는 아니다.

- 열기: 날짜 입력으로 진입한다. 취소/Escape: 원래 계획 변경 버튼으로 돌아간다.
- quota/저장 실패: 날짜·미리보기는 유지하고 같은 적용 버튼에서 재시도한다.
- 성공: 저장이 확인된 개인 계획의 owner·operation·날짜로 실제 결과 회차를 찾는다. 제목/목록 첫 행이나 이전 source 회차로 추정하지 않는다.
- 결과가 현재 문서/기간에 보이면 해당 회차의 상세 버튼에 초점을 둔다. 화면 범위 밖이면 선택 문서와 필터는 유지하고 결과 날짜의 주간을 보여준다.
- 인물·판본·선택 문서가 바뀌거나 새 결과가 유일하지 않으면 임의 항목으로 보내지 않는다. 다른 화면으로 이동한 사용자의 초점을 뒤늦게 빼앗지 않는다.
- 초점 요청은 일시적 화면 상태다. 저장 key/schema/원본/실행 identity/Undo에는 추가하지 않는다. 초점 알림 오류를 이미 성공한 저장의 실패로 보고하지 않는다.

## 검토와 검증 범위

별도 안내 카드나 중복 버튼은 추가하지 않는다. 기존 비교·취소·오류·원본/개인 기록 구분은 판단에 필요해 유지한다. Figma 없이 코드와 실제 앱에서 확인한다. UI 스킬의 표적 검색은 정확한 초점 복귀 지침을 찾지 못해 적용하지 않았으며, 기존 재진입 요구와 재현한 결함을 기준으로 삼았다.

낮은 평가 항목은 접근/조작성과 인지 부담이다. 계획 성공 후 이어하기를 먼저 고치며, 긴 metadata·경고·스크롤 전체가 해결됐다고 판단하지 않는다. 순수 identity/실제 handler/상위 effect 검사는 DOM double과 구분하고, 새 build의 같은 실제 Map에서 취소·실패·재시도·화면 밖 계획·기간·Undo/reload·6크기와 보호 bytes를 확인한다. 결과는 [현재 판정](current-validation.md)에 기록한다.

## 구현과 실제 결과

2026-09-13 06:39 UTC의 aak 빌드에서 30확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/structured-map-focus-2026-09-13T06-39-08-846Z.json`) PASS. 이전 실제 Map·원래 완료·개인 계획을 그대로 이어 취소/Escape/같은 날짜/실패/재시도, 정확 결과 초점, 화면 밖2027-02-02 주간, 키보드 완료·reload·Undo를 검사했다. 준비 fixture를 다시 넣거나 원래 실패 데이터를 지우지 않았다. 보호5키 byte-identical·밖쓰기0·page/console0이다.

- [recurrence-plan-focus.ts](../../../lib/flow/integrated-poc/recurrence-plan-focus.ts): exact actor/owner/operation/date로 실제 회차 하나만 찾는 읽기 전용 resolver.
- [ProgramRecurrencePlan.tsx](../../../components/flow/integrated-poc/ProgramRecurrencePlan.tsx): 열기/취소/실패의 초점, 성공 확인 뒤 결과 요청. 알림 오류와 저장 오류를 분리한다.
- [ProgramRecurrence.tsx](../../../components/flow/integrated-poc/ProgramRecurrence.tsx), [ProgramSpace.tsx](../../../components/flow/integrated-poc/ProgramSpace.tsx): 안정적인 결과 버튼 ID와 post-commit 초점·필요한 주간 이동. stale 요청과 해제된 화면은 초점을 빼앗지 않는다.
- [handler 검사](../../../components/flow/integrated-poc/ProgramRecurrencePlan.test.tsx), [상위 effect 검사](../../../components/flow/integrated-poc/ProgramSpace.recurrence-focus.test.tsx)는 실제 소스/DOM double의 범위를 구분한다. 관련4파일25검사와 신규 전체1175검사에 포함되며 개수를 합산하지 않는다.

375px 성공 초점 (로컬 전용 근거: `../../../output/playwright/integrated-program-structured-map/map-focus-success-375-1789281553957.png`)과 1024px 다른 주간의 정확 회차 (로컬 전용 근거: `../../../output/playwright/integrated-program-structured-map/map-focus-far-week-1024-1789281556641.png`)를 직접 확인했다. Figma·실기기·OS 입력기·관찰 사용자 검증은 하지 않았다. 이 보완은 전체10상황/두 전체 개선 루프의 완료를 뜻하지 않는다.
