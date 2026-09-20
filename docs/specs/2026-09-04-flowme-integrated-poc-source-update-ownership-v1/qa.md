# P3-D QA 계약과 실행 결과

## 판정 기준

### 순수 모델

1. envelope의 version, identity, provenance, exact bytes, length, integrity hash, idempotency key를 전이 전에 재검증한다.
2. Base·Working·Incoming과 change ID/order가 deterministic하다.
3. unknown/duplicate mapping, unsupported origin, incomplete, stale, tampered는 적용을 막는다.
4. 모든 change가 resolved일 때만 전체 resolution set을 한 번 적용한다.
5. 같은 후보 재적용은 `already-applied`와 zero mutation을 반환하고 revision을 중복 생성하지 않는다.
6. Undo는 보존한 exact before snapshot으로 한 번 돌아간다.
7. source apply와 Undo 전후 personal overlay·execution placement·completion·occurrence bytes가 같다.

### 저장 경계

1. 후보 store는 `flow:poc:personal-workspace:v1:source-candidates`만 쓴다.
2. expected bytes가 다르면 write 0이다.
3. 저장 후 readback 불일치 또는 예외에서는 이전 bytes를 복원한다.
4. 잘못된 schema/version/bytes는 corrupt로 판정하고 fail-closed한다.
5. prefix 밖 `setItem`, `removeItem`, `clear`는 0건이다.

### 사용자 시나리오

1. 저장 완료된 작성 Flow 상세에서 로컬 업데이트 예시를 연다.
2. 비교 전 Base·내 작업·새 원문과 영향 개수를 읽고 persistent mutation 0을 확인한다.
3. 일부만 해결하면 적용이 막히고 미해결 수가 정확히 보인다.
4. 모든 차이를 keyboard와 pointer로 해결하고 한 번 적용한다.
5. Flow 상세와 개인 실행 보기에서 새 source projection과 기존 개인 완료 상태를 함께 확인한다.
6. 적용 직후 한 번 Undo하고 exact 이전 source로 돌아간다.
7. 다시 적용해 reload 후 마지막 성공 상태를 복구한다.
8. Escape, backdrop, 나중에, 같은 선택, stale, tampered, save error에서는 적용 mutation이 0이다.
9. unsupported saved-plan origin에는 update control과 write가 없다.
10. 전후 non-PoC `flow:*` key/value가 byte-for-byte 같다.

원문 비교 surface에는 drag gesture가 없으므로 pointer cancel은 P3-D 직접 시나리오에서 제외한다. 기존 날짜·폴더·순서 이동의 pointer-cancel 계약은 관련 개인공간 회귀 범위다.

## 자동 테스트 실행 결과

| 검증 | 결과 | 실제 실행 수 | 비고 |
|---|---:|---:|---|
| canonical/ownership | 통과 | 11/11 | production owner를 꾸며내지 않는 계약 포함 |
| candidate/transition | 통과 | 12/12 | unresolved·deferred·stale·tampered·idempotency·Undo 포함 |
| candidate storage | 통과 | 9/9 | CAS·readback·rollback·corrupt hydrate 포함 |
| React component | 통과 | 6/6 | 상태 문구·disabled·반응형·접근성 계약 |
| P3-D focused 합계 | 통과 | 38/38 | 위 네 묶음의 합계 |
| 관련 개인공간 회귀 | 통과 | 584/584 | P3-B 68, P3-C 78, P3-D 38, occurrence/parity 18, 본체 382 |
| standalone unit | 통과 | 87/87 | single-file model·UI·저장 계약 |
| React 제품 E2E | 통과 | 2/2 | keyboard/backdrop 무저장, 키보드 결정·적용, reload·viewport 포함 |
| standalone source update E2E | 통과 | 1/1 | apply·reload·Undo·개인 상태·저장 경계 |
| production build | 통과 | 1/1 | Next.js production build 재확인 |
| 전체 `npm test` | 실패 | 1,848/1,849 | 아래 기존 날짜 기반 실패 1건 |
| approved-plan 회귀 별도 실행 | 통과 | 201/201 | 전체 실행 중단 지점 뒤 명령을 별도로 실행 |
| public-plan 회귀 별도 실행 | 통과 | 19/19 | 전체 실행 중단 지점 뒤 명령을 별도로 실행 |

전체 `npm test` 실패:

- 파일: `lib/flow/seed-flows.test.ts`
- 시나리오: `normal user routes fail the standard suite when source review is due`
- 대상: `dog-adoption-first-week:review_due:2026-06-04`
- 판정: P3-D 변경과 직접 관련 없는 현재 날짜 기반 source review 기한 실패다. 그렇더라도 전체 회귀 통과로 보고하지 않는다. 이 실패로 뒤에 연결된 approved/public plan 명령은 해당 전체 실행에서는 시작되지 않았고, 이후 별도 실행에서 각각 201/201과 19/19로 통과했다.

총 실행 수 1,849는 `npm test`가 실제로 도달한 묶음만 합산한 값이다. 별도로 실행한 approved-plan 201개, public-plan 19개, standalone E2E와 production build는 이 수에 더하지 않는다.

## 브라우저 화면 결과

| 화면 | React | standalone | 확인 항목 |
|---|---|---|---|
| 390×844 | 화면 검사 통과 | 통과 | mobile sheet, sticky action, 44px target |
| 375×812 | 화면 검사 통과 | 통과 | 긴 값 wrapping, 마지막 action 접근 |
| 844×390 | 화면 검사 통과 | 통과 | header/footer 사이 내부 scroll, action 노출 |
| 1024×768 | 화면 검사 통과 | 통과 | desktop drawer와 세 열 비교 |
| 1440×900 | 화면 검사 통과 | 통과 | 세 열 비교, 여백, 핵심 action |

다섯 화면에서 가로 넘침, console error, page error, 가려진 핵심 행동, 44px 미만 핵심 target은 발견되지 않았다. 강화한 keyboard/backdrop assertion을 포함한 React 2/2와 standalone 1/1을 현재 코드에서 재확인했다.

## 운영 데이터 불변 증거

- React와 standalone 시나리오는 source apply 전후 개인공간 state bytes가 동일한지 비교한다.
- non-PoC `flow:*` sentinel/snapshot은 시나리오 전후 byte-for-byte 동일했다.
- prefix 밖 `setItem`/`removeItem`: 0건
- `localStorage.clear()`: 0건
- candidate durable write: exact `flow:poc:personal-workspace:v1:source-candidates` key만 허용
- Escape/backdrop/비교 열기까지 candidate durable write: 0건

## 남은 한계와 결정 사항

- SourceRow는 `sourceOrder` 기반 PoC projection key이며 production SourceRow ID가 아니다.
- Step은 Item당 하나의 파생 ref이고 Bundle/Flow Map은 `null`이다.
- PublishedVersion, ExportSnapshot, provider sync는 미구현·미소유다.
- 네 saved-plan origin은 계속 read-only이고, 업데이트 후보는 `authoring-handoff`만 지원한다.
- standalone 직접 시나리오는 변경 2건을, React는 변경·추가를 포함한 3건을 조작한다. 삭제는 순수 모델에서 검증했다.
- 실제 Android Chrome, iOS Safari, TalkBack, VoiceOver, 실제 200%/OS 최대 글자, 관찰 사용자 검증은 미실행이다.

자동 브라우저·화면 캡처는 실제 기기나 관찰 사용자 검증을 대신하지 않는다.
