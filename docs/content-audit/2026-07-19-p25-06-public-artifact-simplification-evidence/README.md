# P25-06 Public artifact simplification evidence

P25-06은 공개 `/f/[slug]` 저장 전 화면을 `실제 Flow 구성 1개 + 저장 결정 1개`로 정리한다. 저장 범위를 바꾸지 않던 미리보기 체크박스를 제거하고, 공개 화면에서는 전체 구성을 읽은 뒤 `그대로 저장`하거나 `내 버전으로 조정`하도록 책임을 분리했다.

실제 할 일 완료는 저장 후 My Flow와 Calendar의 완료 체크박스에서만 수행한다. source/detail과 Flow 단위 portable export는 유지한다.

이 패키지는 현재 코드와 자동 브라우저 검증 결과다. 실제 사용자 관찰은 아니며 관찰 세션 수는 `0`이다.

## 구현 결과

- 첫 화면의 입력/저장 결과/첫 할 일 미니 미리보기와 본문 artifact 중복을 제거했다.
- anchor나 반복 요일처럼 실제로 필요한 입력만 저장 전에 표시한다.
- 저장 범위를 바꾸지 않던 pre-save checkbox를 읽기 전용 항목 marker로 교체했다.
- 저장 전 진행률과 회차 기록 입력을 제거해 완료 상태처럼 보이지 않게 했다.
- primary는 `그대로 저장`, secondary는 `내 버전으로 조정`으로 유지했다.
- artifact 제목과 항목 수는 한 번만 표시한다.
- 저장 후 My Flow의 완료 체크박스와 public Flow 단위 export는 유지했다.

## Evidence

- [Audit](./audit.md)
- [Route evidence](./route-evidence.json)
- [Screenshots](./screenshots/)

## 현재 검증

- Production build: 통과
- Public CTA/source-density targeted Playwright: `44 / 44` 통과
- 변경된 Flow MVP 회귀: 최종 대상 `2 / 2` 통과
- 모바일 `390x844`, wide `1024x768`: 첫 화면 artifact 노출, 가로 overflow `0`, console error `0`
- 실제 사용자 관찰: 실행하지 않음
