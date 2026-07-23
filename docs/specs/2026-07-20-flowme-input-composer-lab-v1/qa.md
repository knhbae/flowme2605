# QA 기준

## Hard gates

1. 일반 6개 사례의 첫 artifact 미리보기 전 필수 payload는 각 0~2개다.
2. 입력은 실제 consumer가 있는 사용자 소유 gap만 받으며 불필요 입력은 0개다.
3. 8개 사례에서 upstream canonical entity와 gate/boundary 의미를 100% 보존한다.
4. source-derived 값을 사용자 editable 입력으로 다시 만들지 않는다.
5. schedule이 계산되지 않는 Item은 ICS event와 ICS download action이 0개다.
6. upstream Item 외 행동은 source fixture 또는 명시적 사용자 문장 provenance 없이 만들 수 없다.
7. 제작자 입력, 사용자 overlay, 실행 기록이 같은 write path를 공유하지 않는다.
8. 사용자 화면에 내부 enum/path/분류 코드를 노출하지 않는다.
9. Heat와 Todoist는 가짜 artifact 없이 검토/원문 확보 경계를 보여준다.
10. 네 입력 경로가 최소 한 사례 이상에 실제 적용된다.

## 자동 검증과 사용자 검증의 경계

- 자동 검증: JSON shape, controlled enum, 참조 무결성, 입력 budget, source re-entry, projection retention, ICS gate, visible-copy scan, browser smoke.
- 에이전트 검토: source fidelity, UX hierarchy, concept-to-HTML 비교.
- 아직 하지 않은 것: 실제 사용자 관찰, 외부 provider 응답 품질, 실제 crawler 성공률, production 비용/지연, 공개 권리 승인.

## 시각 인수 기준

- 첫 viewport에 실제 입력 composer와 artifact preview가 함께 보인다.
- 1440px에서 좌/중/우 작업대가 겹치지 않는다.
- 390px에서 입력 → 미리보기 순서로 한 열이 되며 가로 overflow가 없다.
- K-MOOC 14행과 LibriVox 38행은 저장 데이터에서 축약되지 않는다.
- safety condition과 blocked 이유는 접힌 고급 영역에 숨지 않는다.

## 2026-07-20 실행 결과

### 계약·validator

- 사례 8개, 일반 사례 6개, 경계 사례 2개, 입력 경로 4개가 생성됐다.
- 일반 사례의 첫 결과 전 필수 payload 최댓값은 2개다.
- 의미 보존율 100%, 불필요 입력 0, source 값 재입력 0이다.
- 일정 없는 ICS 위반 0, upstream에 없는 행동 0이다.
- creator/user write-path 충돌 0, blocked 사례의 가짜 artifact 0이다.
- schema + invariant validator가 통과했다.
- 유효 계약 1개와 의도적 오류 mutation 11개를 포함한 Node test 12/12가 통과했다.

### 브라우저

- 1440 × 900에서 좌·중·우 열 겹침 0, 문서 가로 overflow 0을 확인했다.
- 390 × 844에서 문서 가로 overflow 0을 확인했다. 경로와 사례 목록은 각각 내부 가로 스크롤을 유지한다.
- 이사일 변경 후 24개 Calendar Item의 상대 날짜가 함께 갱신됐다.
- K-MOOC 14행, LibriVox 38행 전체 펼치기와 행 상태 변경을 확인했다.
- 여권의 방문 선택 시에만 장소 입력이 나타나고, 에어컨 세척 선택은 Memo에 반영됐다.
- 세탁조 사례는 `40회 세탁마다 또는 기기 알림 시` 조건을 유지하며 Calendar event는 0개다.
- 폭염 대응은 3개 조건 대응 카드를 보여주되 실행 task는 0개다.
- 로그인 원문 경계는 source import 안내만 보여주며 task/row/event는 모두 0개다.
- 사용자에게 보이는 텍스트에서 내부 taxonomy/legacy token이 0개임을 확인했다.
- 날짜 input은 보이는 label과 연결되고 선택지는 이름 있는 group으로 노출된다.

### 저장소 검증

- `node scripts/content-audit/verify-flowme-input-composer-lab-v1.mjs`: PASS
- 관련 `.mjs` 5개 `node --check`: PASS
- `npm.cmd run docs:check`: PASS, required files 14개와 local links 2,442개 확인
- scoped `git diff --check`: PASS
- closeout inventory: 이번 작업은 새 path 3개이며 전체 dirty worktree의 기존 변경은 포함하지 않았다.

## 판정 경계

위 결과는 동결 fixture, deterministic adapter, 자동 validator, 에이전트 source/UX 검토, 로컬 브라우저 QA다. 실제 사용자 관찰, 실제 URL 수집, LLM provider 품질·비용·지연, 공개 권리 승인은 완료되지 않았다.
