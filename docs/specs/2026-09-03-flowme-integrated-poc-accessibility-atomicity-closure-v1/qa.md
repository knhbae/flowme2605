# P3-A QA 기록

## 최종 판정

P3-A 직접 범위는 통과했다. `V41-036`, `D2-058`을 각각 `부분`에서 `충족`으로 올렸고, 현재 primary snapshot은 `충족 130 / 부분 11 / 미충족 4 / 의도적 변경 11 / 제외 12`, primary gap은 15건이다.

전체 `npm test`는 이번 변경과 무관한 `dog-adoption-first-week`의 날짜 기준 `review_due 2026-06-04` fixture 1건에서 실패해 중단됐다. 실행된 1,655건 중 1,654건이 통과했으며, 중단 뒤 남은 회귀 220건은 별도로 모두 통과했다. 이를 전체 회귀 통과로 합산하지 않는다.

| 판정 대상 | 최종 표시 | 근거 |
|---|---|---|
| `V41-036` | 충족 | React·독립 HTML의 현재 navigation·항목 검토 accessible name, 키보드 진입, 닫기·Escape opener focus 복귀, zero-write 통과 |
| `D2-058` | 충족 | 여덟 원자성 하위 조건 E4와 모델·저장·standalone 실행 근거 정합, 관련 회귀 통과 |
| P3-A snapshot | 확정 | `충족 130 / 부분 11 / 미충족 4 / 의도적 변경 11 / 제외 12 / primary gap 15` |

## 집중 시나리오 결과

### A. 현재 탐색·항목 검토

1. exact query의 React PoC와 독립 HTML을 열었다.
2. navigation·개인공간 보기·선택형 항목 검토 control의 접근 가능한 이름을 확인했다.
3. 키보드로 검토 surface를 열고 닫기 버튼으로 닫은 뒤 opener focus 복귀를 확인했다.
4. 다시 열어 `Escape`로 닫고 같은 opener focus 복귀를 확인했다.
5. React와 독립 HTML에서 동일한 역할 mapping을 확인했다.
6. 각 흐름에서 허용 prefix 밖 쓰기·삭제와 전체 storage clear가 0건이고 운영 sentinel bytes가 동일함을 확인했다.

결과: 통과.

### B. 원자성 여덟 하위 조건

| ID | 조건 | 실행 근거 | 상태 |
|---|---|---|---|
| `D2-058.1` | 취소·Escape write 0 | 순수 transition + 브라우저 | PASS |
| `D2-058.2` | blank write 0 | 모델·저장 | PASS |
| `D2-058.3` | stale write 0 | revision·fingerprint preflight | PASS |
| `D2-058.4` | invalid write 0 | foreign·duplicate·tampered fail-closed | PASS |
| `D2-058.5` | storage failure rollback | late failure 뒤 state·draft exact bytes | PASS |
| `D2-058.6` | source+canonical+projection 원자 반영 | 한 PoC transaction의 성공 경로 | PASS |
| `D2-058.7` | 성공 mutation Undo 1회 | state와 draft bytes 동시 복구 | PASS |
| `D2-058.8` | recovery draft와 durable save 분리 | commit·Undo·reload | PASS |

## 자동 검증 결과

| 실행 묶음 | 실행 수 | 통과 | 실패 | 상태 | 비고 |
|---|---:|---:|---:|---|---|
| 원자성 집중 모델 | 51 | 51 | 0 | PASS | `D2-058.1`~`D2-058.8` fault injection·Undo·reload |
| 개인공간 PoC suite | 390 | 390 | 0 | PASS | pretest 18 + main 372 |
| 독립 HTML 모델 | 64 | 64 | 0 | PASS | standalone parity와 deterministic build |
| React 접근성·필수 viewport | 2 | 2 | 0 | PASS | 접근 가능한 이름·focus·zero-write + 필수 5개 viewport |
| 독립 HTML 접근성·필수 viewport | 2 | 2 | 0 | PASS | 같은 action mapping·focus·zero-write + 필수 5개 viewport |
| 관련 결합 브라우저 회귀 | 10 | 10 | 0 | PASS | React 4 + standalone 6 |
| production build | 18 | 18 | 0 | PASS | Next.js production build의 static page 18개 |
| 요구 추적 자산 | 8 | 8 | 0 | PASS | P2-C 4 + P3-A 4 |
| 보고서 브라우저 최종본 | 2 | 2 | 0 | PASS | 필터·상세·로컬 링크·read-only 및 반응형 |
| 문서 검사 | 4,594 | 4,594 | 0 | PASS | 필수 파일 16개 확인 |
| 전체 `npm test` | 1,655 | 1,654 | 1 | FAIL | 기존 날짜 기준 fixture 1건에서 중단; P3-A 관련 실패 0 |
| 중단 뒤 회귀 tail | 220 | 220 | 0 | PASS | 전체 `npm test` 통과로 합산하지 않음 |

## 필수 화면

| 화면 | 가로 넘침 | console error | page error | 가린 핵심 행동 | 상태 |
|---|---:|---:|---:|---:|---|
| 390×844 | 0 | 0 | 0 | 0 | PASS |
| 375×812 | 0 | 0 | 0 | 0 | PASS |
| 844×390 | 0 | 0 | 0 | 0 | PASS |
| 1024×768 | 0 | 0 | 0 | 0 | PASS |
| 1440×900 | 0 | 0 | 0 | 0 | PASS |

이 표는 자동 브라우저 검사 결과다. 실제 Android·iOS 기기 검사나 관찰 사용자 검증을 뜻하지 않는다.

## 데이터 불변

- 진입점: exact `/my?personalWorkspacePoc=v1`
- 허용 prefix: `flow:poc:personal-workspace:v1:*`
- 허용 prefix 밖 `setItem`·`removeItem`: 0건
- 전체 storage `clear`: 0건
- 운영 `flow:*` sentinel: 시나리오 전후 byte-for-byte 동일
- 보고서 브라우저 저장소 API 호출: 0건

## 자동화로 대체하지 않은 근거

- 실제 Android Chrome: 미실행
- 실제 iOS Safari: 미실행
- TalkBack·VoiceOver·screen reader: 미실행
- 실제 browser 200% 확대·OS 최대 글자: 미실행
- 실제 모바일 가상 키보드: 미실행
- 장시간 사용: 미실행
- 관찰 사용자: 0명

## 게시 상태

- commit: 미진행
- push: 미진행
- PR: 미진행
- Preview: 미진행
- Production: 미진행
