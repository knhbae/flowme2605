# P3-C QA 계약

## 자동 모델 게이트

1. 31-case catalog는 ID·순서·그룹 `1/8/11/6/5`, exact rawText, provenance, boundary가 고정된다.
2. StructureDraft snapshot manifest의 파일 bytes/SHA, catalog version, contract `p0.2`가 일치한다.
3. 6 positive fixture는 compiler output이 expected source와 byte-identical이고 현재 React/standalone parser에서 같은 Item 수·issue 0이다.
4. 20 negative patch는 19 pinned rule을 모두 덮고 materialization plan을 만들지 않는다.
5. 검색·필터·preview는 원문·draft·workspace·operating storage mutation 0이다.
6. blank-only apply는 replacement 1건이고 native Undo 한 번으로 exact empty source로 돌아간다.
7. nonblank/same/cancel/Escape/pointer cancel/unknown/corrupt/unsupported/stale/IME/storage failure는 mutation 0과 before bytes 보존이다.
8. sidecar write는 고정 PoC key만 사용하며 rollback/reload가 exact draft를 복원한다.

## 브라우저 시나리오

1. 일반 작성 화면에서 `검증 예시`를 열고 검색·다섯 그룹·31개 사례를 탐색한다.
2. 실제 콘텐츠 사례의 전체 원문·형태·출처·보존 경계를 읽고 적용 전 mutation 0을 확인한다.
3. 빈 원문에 사례를 명시 적용하고 결과 4종을 확인한 뒤 native Undo와 reload를 확인한다.
4. StructureDraft 사례를 열어 contract/version 표시와 compiled source를 확인하고 blank-only로 적용한다.
5. 비어 있지 않은 원문, 취소, Escape, outside close, pointer cancel, 같은 대상, 손상 catalog, 저장 오류에서 mutation 0을 확인한다.
6. keyboard로 opener→검색→목록→preview→적용 또는 닫기까지 이동하고 focus return을 확인한다.
7. 시나리오 전후 non-PoC `flow:*` key/value가 byte-for-byte 동일한지 비교한다.

## 화면

- 390×844
- 375×812
- 844×390
- 1024×768
- 1440×900

각 화면에서 horizontal overflow, console error, page error, 가려진 핵심 행동, 48px 미만 핵심 target은 0이어야 한다. 긴 source preview는 내부 스크롤한다.

## 증거 등급

- E4: 이번 단계의 실제 자동/브라우저 실행과 산출물에 연결된 증거
- E3: 구현 또는 정적 검토만 있고 실제 사용자 조작 경로가 빠진 증거
- E2 이하: 설계·문서·과거 결과만 있는 증거

부모 승격은 모든 하위 판정이 current E4일 때만 허용한다.

## 2026-09-04 closeout 결과

### 자동·브라우저 실행

| 검증 묶음 | 실제 결과 | 판정 |
|---|---:|---|
| P3-C core assets | 78/78 | PASS |
| React authoring surface | 22/22 | PASS |
| ProductUx 회귀 | 6/6 | PASS |
| standalone | 82/82 | PASS |
| React·standalone parity | 18/18 | PASS |
| production browser | 62/62 | PASS |
| production build | 18/18 | PASS |
| `npm test` | 1809/1810 | 기존 비인과 실패 1건 |
| 중단 뒤 regression tail | 220/220 | PASS |

production browser 62건은 기존 통합 시나리오 48건과 P3-C 시나리오 14건이다. P3-C 시나리오에는 React·standalone의 검증 예시/StructureDraft 경로, 다섯 viewport, keyboard 경로와 저장 경계 검사가 포함된다.

### 저장 경계

- 허용 prefix 밖 `setItem`/write: 0건
- 허용 prefix 밖 `removeItem`: 0건
- `localStorage.clear()`: 0건
- 시나리오 전후 non-PoC `flow:*` key/value: byte-for-byte 동일
- StructureDraft sidecar: `flow:poc:personal-workspace:v1:structure-template-sidecars:p0.2`만 사용

### 전체 회귀의 알려진 실패

유일한 실패는 `lib/flow/seed-flows.test.ts`의 `dog-adoption-first-week:review_due:2026-06-04`다. `source_checked_at=2026-06-04`인 published seed가 서울 날짜 2026-09-04에는 92일 전이 되어 기존 90일 freshness gate에서 `review_due` 1건으로 집계된다. P3-C 파일을 참조하지 않는 기존 시간 의존 fixture이며 P3-C 변경과 인과가 없다. 해당 실패 뒤의 두 tail suite는 220/220으로 별도 통과했다.

### 증거 한계

- 실제 Android Chrome: 미실행
- 실제 iOS Safari: 미실행
- screen reader: 미실행
- 실제 브라우저 200% 확대: 미실행
- 관찰 사용자 검증: 미실행, 0명
- 브라우저 자동화와 화면 검사는 위 실기·관찰 증거를 대신하지 않는다.
