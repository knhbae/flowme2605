# P3-B 검증 기록

## 현재 상태

P3-B 구현과 fresh 검증을 마쳤다. `D2-057.1-.6`은 모두 current `충족 E4`이며, 현재 추적 판정은 `131 충족 / 10 부분 / 4 미충족 / 11 의도적 변경 / 12 제외`, primary gap 14다. `D2-002`와 `D2-004`는 부분으로 유지한다.

전체 `npm test`는 1,728/1,729에서 기존 날짜 기준 seed fixture 한 건 때문에 중단됐다. P3-B 관련 실패는 0건이고, 중단 뒤 남은 두 suite는 220/220을 별도로 통과했다. 이를 전체 회귀 PASS로 합산하지 않는다.

| 검증 | 상태 | 실제 결과 |
|---|---|---|
| CreatorDraft 순수 모델·validator | PASS | focused model/component/storage 묶음 68/68 |
| library storage·CAS·rollback·recovery | PASS | 같은 focused 묶음의 fault injection·exact rollback·journal recovery 통과 |
| React component·route | PASS | 개인공간 PoC 464/464, React Chromium 3/3 |
| standalone model | PASS | 71/71, 1,325.7394ms |
| React 핵심 브라우저 시나리오 | PASS | 3/3, 21.9초 |
| standalone 핵심 브라우저 시나리오 | PASS | 자동 Chromium walkthrough 5/5 viewport, 별도 Playwright test case 0개 |
| 필수 5 viewport | PASS | React·standalone 모두 overflow·핵심 행동 가림·console/page error 0 |
| 개인공간 PoC suite | PASS | 464/464 |
| 전체 `npm test` | FAIL | 1,728/1,729, 기존 `review_due` seed 1건; P3-B 실패 0, tail 220/220 별도 PASS |
| production build | PASS | Next.js 15.5.21, static page 18/18 |
| 요구 추적·보고서 browser QA | PASS | trace asset 8/8, P3-B 보고서 2/2, docs 16 files·4,594 links |

## 필수 기능 시나리오

1. 새 원문을 제작자 초안으로 저장하고 active 목록에서 찾는다.
2. 제목 또는 exact 원문 안의 첫 `http(s)` 출처 label로 검색하며 검색 중 storage write가 0인지 확인한다. URL 없는 원문은 `직접 작성한 원문`으로 표시한다.
3. 같은 초안을 열어 rawText, template, `draftId`, revision을 확인한다.
4. 수정 저장 후 reload에서 저장하지 않은 working changes와 binding을 복구한다.
5. 복제본의 새 identity·revision 1·exact source bytes와 원본 불변을 확인한다.
6. 보관 후 기본 목록에서 제외되고 보관함에서 exact record를 복원한다.
7. save·rename·duplicate·archive·restore의 직전 library mutation을 Undo한다.

## 실패·무변경 시나리오

- blank 명시 저장
- 같은 payload 저장
- 같은 표시 이름 rename
- rename 취소와 Escape
- 목록 검색·filter 변경·열기 취소
- stale library revision과 stale record revision
- unsupported version, 잘못된 ID·fingerprint·binding, 손상 JSON
- library 첫 write 실패, working draft 두 번째 write 실패, readback 불일치
- rollback 실패 뒤 다음 boot recovery

각 항목에서 기대하지 않은 성공 mutation과 허용 prefix 밖 writer 호출은 0이어야 한다.

## 판정 승격 gate

- D2-057.1 기존 reload 복구가 React·standalone에서 계속 E4다.
- D2-057.2-.6이 각각 현재 구현 파일, 직접 테스트, 실패 0인 fresh run을 가진다.
- D2-057 부모 override만 `부분 → 충족`이며 D2-002·D2-004는 `부분`이다.
- 현재 집계가 정확히 `총 168 / 충족 131 / 부분 10 / 미충족 4 / 의도적 변경 11 / 제외 12 / gap 14`다.
- 추적 HTML에 위 현재 판정과 P3-B 자동화 실제 건수가 표시된다.

## viewport 기록

| viewport | 가로 넘침 | console error | page error | 핵심 행동 가림 | 결과 |
|---|---:|---:|---:|---:|---|
| 390×844 | 0 | 0 | 0 | 0 | PASS |
| 375×812 | 0 | 0 | 0 | 0 | PASS |
| 844×390 | 0 | 0 | 0 | 0 | PASS |
| 1024×768 | 0 | 0 | 0 | 0 | PASS |
| 1440×900 | 0 | 0 | 0 | 0 | PASS |

standalone의 열린 CreatorDraft lane은 폴더 control 0개, 개인 Flow 저장 action 0개, `초안 변경 저장` 1개였다. 새 개인 작성 lane은 폴더 control 1개, 개인 Flow 저장 action 1개, 제작 초안 저장 action 1개였다. malformed 7-byte payload와 wrong-owner 330-byte payload는 reload 뒤 exact bytes가 보존됐고 mutation은 각각 0건이었다. 두 생성 HTML은 각각 443,509 bytes, byte-identical이며 SHA-256은 `34855A35C604743218A82F21113C0510C3AEBC53707C2E588EADAE45563D62F4`다.

## 증거 구분

- 실제 Android Chrome: 미실행
- 실제 iOS Safari: 미실행
- screen reader·보조기술: 미실행
- 관찰 사용자: 0명
- commit / push / PR / Preview / Production: 모두 미진행
