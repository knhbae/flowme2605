# P26-06 Discovery / Save-before evidence

## 판정

- 상태: `complete_internal_evidence`
- 기준 커밋: `3ebdc72`
- 실제 관찰 사용자: `0`
- evidence: `current_source`, `current_command`, `current_browser`, `prior_design_artifact`

P26-06은 Home, `/flows`, public `/f`, source-backed `/flow-maps`가 서로 다른 카드와 저장 문법을 쓰던 문제를 하나의 사용자-facing `Flow` 문법으로 정리한다. 이번 결과는 자동화와 브라우저 검증이며 실제 사용자 검증이 아니다.

## 화면 계약

### 발견 카드

모든 일반 발견 카드는 아래 순서로 읽힌다.

1. 구체적인 Flow 제목
2. 검증 가능한 원문 이름
3. 대표 할 일 1~3개
4. 필요한 입력
5. 저장 후 얻는 결과와 전체 할 일 수

근거가 없는 사용 수, 검증 인원, 별점, 인기순은 표시하지 않는다. Home과 `/flows`는 같은 `FlowDiscoveryCard`를 사용한다. 결혼 참고표 2종과 Allblanc 영상 2종은 묶음 카드 안에서 다시 고르게 하지 않고 각각 독립 Flow로 진입한다.

### 저장 전

public Flow와 source-backed Flow Map은 같은 `FlowSaveBeforeFrame`을 사용한다.

- 모바일: 제목과 원문 -> 저장될 전체 Flow 대표 5개 -> 입력/선택 -> sticky 시작 행동
- wide: 전체 Flow 대표 항목과 입력/결정을 나란히 배치 -> 전체 workbench를 아래에 배치
- 1차 행동: `그대로 시작` 또는 선택한 날짜 기준 시작
- 2차 행동: `내게 맞게 조정`
- 상세 원문 기록과 주의: 접힌 보조 영역

## 참고 화면에서 채택한 원칙

원래 작업공간의 local prior artifact `docs/content-audit/2026-07-19-flow-content-usage-preview-ko.html`에서 다음 원칙을 채택했다. 이 파일은 현재 clean implementation worktree에는 복사하지 않았다.

- 짧은 source identity
- timing + title + 짧은 summary 행
- 같은 effective item을 Calendar/checklist/sheet/memo에서 읽는 구조
- destination별 전체 수와 날짜 없는 제외 수를 구분하는 방식

긴 소개, 사용법 설명, 내부 검토 문구는 production 화면에 복제하지 않았다.

## 브라우저 결과

- Home unified card: 2개
- `/flows` catalog unified card: 9개
- public save-before 대표 행: 5개
- wedding independent entries: 2개
- Allblanc independent entries: 2개
- unsupported popularity/social-proof labels: 0
- mobile/wide horizontal overflow: 0
- console/page errors: 0
- opposite-timezone hydration errors: 0

화면:

- [Home 390px](./screenshots/01-home-unified-flow-card-mobile.png)
- [Flow 찾기 390px](./screenshots/02-catalog-independent-flow-entry-mobile.png)
- [public save-before 390px](./screenshots/03-public-save-before-mobile.png)
- [source-backed save-before 390px](./screenshots/04-source-backed-save-before-mobile.png)
- [wedding fallback 390px](./screenshots/05-wedding-independent-choice-fallback-mobile.png)
- [public save-before 1024px](./screenshots/06-public-save-before-wide.png)

## 현재 검증

- P26-06 Playwright: `4 / 4` pass
- full Flow E2E: `196 / 196` pass
- URL-first/public/workbench/P24/P26 교차 회귀: 최초 `75 / 80` pass, 현재 문구와 read-only preview 측정 계약으로 갱신한 5건 targeted 재실행 `5 / 5` pass
- unit: `546 / 546` pass
- docs check: `14` required files, `2,591` local links
- production build: pass, 18 routes
- `git diff --check`: 오류 0, 기존 line-ending 경고만 존재

## 남은 범위

- 저장 후 첫 화면의 whole-Flow action hub는 P26-07이다.
- My Flow local IA와 content-shape별 그룹은 P26-08/09다.
- `내게 맞게 조정`의 progressive editor는 P26-10/11이다.
- 발견 카드의 신뢰 신호는 원문과 실제 운영 데이터만 허용한다. 리뷰·사용 수가 실제로 수집되기 전에는 빈 social proof를 만들지 않는다.
