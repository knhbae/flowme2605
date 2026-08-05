# Claude Design Pass 1 — scorecard (FlowMe P35 Round 2)

- reviewer: Claude Design
- product candidate SHA: `c48911757fb529941d00efc2162338ffa8b7686a`
- build ID: `gdh4DIMGS69Kcn0GBTJtl`
- asset commit A: `0af680a215d49e648dd10f97eeb7954e5c689297`
- index commit B (coordinator-provided): `e0d9a5b8f17f1e30ca8a18a273c873aaff696db0`
- observed users: `0`
- 이 점수는 정적 evidence만으로 매긴 내부 후보 gate이며 실제 사용자 검증이 아니다.

## weighted gate

| 항목 | 가중치 | 점수 | 가중 점수 | 근거 |
|---|---:|---:|---:|---|
| State truth & lifecycle | 20 | 3 | 12.0 | 저장/미저장 전이와 cancel·reload는 증거가 견고하다(S03, S08, S12). overdue가 상태로 존재하지 않고(CD-004) public quick 경로 storage diff가 비어 있지 않으며(CD-002, 미검증) 편집기 `저장` 어휘가 충돌한다(CD-008). |
| Action ownership & execution clarity | 15 | 3 | 9.0 | plan/Item/result mutation의 범위 표기(`전체 24개 옮기기`, `현재 항목 1개 옮기기`)와 duplicate 선택 dialog는 명확하다. 날짜 없는 공개 화면의 3중 next step(CD-013), `바로 저장` label(CD-014), primary token 흔들림(CD-012)이 상쇄한다. |
| Artifact projection & fidelity | 20 | 4 | 16.0 | preview→confirm→receipt→raw의 ID·count·byte·hash 일치가 실제로 증명된다(S05 24 IDs / 3,754 B / `18e9a2fe…`, S12 재시도 payloadHash 동일, S18 round-trip, S20 단위 분리). 감점은 `주 결과` 라벨과 실제 선택의 불일치(CD-001)와 확인 단계의 사유 부재(CD-007). |
| Information architecture | 15 | 2 | 6.0 | 첫 viewport에서 상태·주 행동은 대체로 읽히지만, ≥1024에서 주 콘텐츠가 좁아지고 2/3가 빈 패널이며(CD-003) 같은 destination이 한 화면에서 두 역할을 갖는다(CD-001). |
| Disclosure & safety | 15 | 3 | 9.0 | 일방향·중복 경고가 닫힌 상태에서도 보이고 Escape 포커스 복귀가 기록됐다(S11). 반면 제외 사유가 결정 시점에 가려지고(CD-007) 판독 불가 기록이 조용히 사라진다(CD-005). |
| Terminology & copy | 5 | 2 | 2.0 | 영어 진단 문자열 노출(CD-006), 같은 영역의 3중 명칭(CD-011), viewport별 명칭 차이(CD-016), 파일명 어휘 불일치(CD-018), 정의 없는 단위(CD-019). |
| Visual consistency & responsive behavior | 5 | 2 | 2.0 | horizontal overflow 0·replacement character 0은 모든 캡처에서 확인된다. 그러나 primary fill이 route마다 다르고(CD-012), helper 문장이 줄바꿈으로 깨지며(CD-013), 헤더 제목이 잘린다(CD-020). |
| Accessibility & recovery | 5 | 3 | 3.0 | 항목 단위 accessible name이 잘 붙어 있고(`… 완료 체크`, `… 수정`), 오류가 `role=alert`로 노출되며 포커스가 트리거로 복귀한다(S16). 편집기에 이름 없는 컨트롤 1개(CD-009), 이름 없는 무효 입력(CD-010). |
| 합계 | 100 |  | **59.0** |  |

계산식: `Σ(score ÷ 5 × weight)` = 59.0 / 100.

## 비가중 내부 heuristic

| 항목 | 점수 | 근거 | 한계 |
|---|---:|---|---|
| Stated Job Fit — internal heuristic | 3 | 지정 task(찾기→미리보기→저장→실행→결과 이동)는 정적 evidence 상 끝까지 이어지고 결과 identity가 추적된다. 시간 상태(overdue)와 대형 viewport의 우선순위가 task와 어긋난다. | observed users 0. weighted score와 PASS gate에 포함하지 않는다. |

## scenario 판정

| ID | Claude 판정 | 근거 |
|---|---|---|
| S01 | REVISE | CD-002(미검증), CD-014. 5개 상태 storyboard는 완비. |
| S02 | REVISE | CD-001. |
| S03 | REVISE | CD-008, CD-010. transaction 경계 자체는 PASS 수준(storage diff 비어 있음). |
| S04 | PASS_WITH_NOTES | duplicate 선택·비활성 primary·재시도 동선이 명확. CD-017은 LOW. |
| S05 | PASS | preview→actual→receipt parity가 ID·count·byte·hash로 증명됨. |
| S06 | REVISE | CD-003, CD-016. |
| S07 | PASS_WITH_NOTES | Item/plan mutation 분리와 accessible name 양호. CD-011. |
| S08 | PASS_WITH_NOTES | cancel byte 동일, reload 지속 확인. CD-020. |
| S09 | PASS_WITH_NOTES | 4개 형식 confirm/receipt와 undated 사유 문자열 존재. CD-007. |
| S10 | REVISE | CD-015, CD-012. partial/conflict 처리와 오류 문구는 양호. |
| S11 | PASS | closed 상태 위험 노출, Enter/Escape, 포커스 복귀 확인. |
| S12 | REVISE | CD-006. duplicate lock과 receipt 재시도는 양호. |
| S13 | REVISE | CD-005. raw byte 보존은 확인. |
| S14 | REVISE | CD-009. 1/8/24/50 밀도 캡처는 완비, overflow 0. |
| S15 | REVISE | CD-003. actual 200% zoom 하위 판정은 `NOT_RUN — ACTUAL_ZOOM_NOT_ASSESSED`. |
| S16 | PASS_WITH_NOTES | `role=alert`·포커스 복귀 확인. `screenReaderSpeech: NOT_ASSESSED`. |
| S17 | `NOT_RUN — CODEX_ONLY` | Claude 입력 allowlist에 파일·URL 없음. 요구하지 않았고 점수에 넣지 않았다. |
| S18 | PASS (artifact display 범위) | round-trip 확인. LF→CRLF 정규화는 반증 로그의 Codex 요청으로 이관. |
| S19 | BLOCKED_BY_MISSING_EVIDENCE (UI 하위) | fixture·ICS는 확인되나 overdue/DST fixture의 화면 캡처가 없고 `/my?demo=ux20` 캡처가 재사용됨. CD-004는 재사용된 캡처에서 재현. |
| S20 | PASS_WITH_NOTES (표시 범위) | 단위 분리는 S21 캡처에서 화면으로 확인. S20 전용 화면 evidence는 없음. CD-019. |
| S21 | PASS_WITH_NOTES | transport·MIME·byte·hash 명시. CD-018. |
| S22 | `NOT_ASSESSED` | 전용 budget/trace 없음. weighted gate에 넣지 않음. |
| S23 | RUN | 자유 탐색 수행. CD-011, CD-012, CD-016, CD-020이 matrix 밖 root-cause 후보. |

## hard fail 점검

| 항목 | 판정 | 근거 |
|---|---|---|
| 잘못된 저장·완료·결과 또는 데이터 손실 | 미발견 | S03/S08 storage diff, S13 raw hash 동일. |
| preview/actual/receipt identity 불일치 | 미발견 | S05·S12 receipt itemIds 24개, payload byte·hash 일치. |
| public quick 경로의 의도하지 않은 persistent write | **후보 · 미확정** | CD-002. byte length·SHA 대조만으로는 제품 write와 수집기 cache를 구분할 수 없어 `NEEDS_CODEX_VERIFICATION`으로 둔다. 확정 시 hard fail. |
| 날짜 없는 Item에서 근거 없는 VEVENT 생성 | 미발견 | S19 rule, S20/S21 단위 분리, S09 `calendarUndatedReason`. |
| material risk를 action 전에 알 수 없음 | 미발견(일방향·중복) / **후보**(제외 사유) | S11 closed 상태 노출은 통과. CD-007은 손실 사유가 결정 시점에 가려지는 부분 사례. |
| primary action·복구가 keyboard로 불가능 | 미발견 | S11·S16 focus sequence. |
| silent legacy/malformed storage rewrite | 미발견 | S13 before/after hash 동일. |
| 필수 scenario `NOT_RUN`/`BLOCKED` | **해당** | S19 UI 하위 판정 `BLOCKED_BY_MISSING_EVIDENCE`. |
| product candidate dirty / chain of custody 불완전 | 미발견 | `git status` 원문 84 B·`08411ee7…` 일치, 표본 10개 파일 SHA-256 전량 일치(freeze 참조). |

## 내부 PASS 조건 대조

| 조건 | 결과 |
|---|---|
| hard fail 0 | 미충족 (필수 scenario 하위 BLOCKED 1건, 후보 2건) |
| blocking finding 0 | 충족 (BLOCKING 0건, HIGH 4건) |
| weighted score ≥ 75 | 미충족 (59.0) |
| State truth & lifecycle ≥ 4 | 미충족 (3) |
| Artifact projection & fidelity ≥ 4 | 충족 (4) |
| Disclosure & safety ≥ 4 | 미충족 (3) |
| 모든 필수 scenario에 required evidence | 미충족 (S19 UI, S20 화면) |
| 관찰 사용자 `0명` 명시 | 충족 |

**Pass 1 판정: `REVISE`.**

## finding 표

| ID | reviewer | scenario | severity | invariant | evidence | counterevidence | status |
|---|---|---|---|---|---|---|---|
| `CD-001` | Claude Design | S02 | HIGH | 한 destination은 한 화면에서 한 역할 | `S02/03-*.png`, `S02/dated-undated-mixed.capability-manifest.json` | 없음 | REPRODUCED |
| `CD-002` | Claude Design | S01 | HIGH | public quick write count = 0 | `S01/lookup-*.storage-*.json` | blob 내용 미확인 | NEEDS_CODEX_VERIFICATION |
| `CD-003` | Claude Design | S15·S06 | HIGH | viewport 간 우선순위 유지 | `S15/state.json`, `S15/01·02·03·04` | 없음 | REPRODUCED |
| `CD-004` | Claude Design | S19·S15 | HIGH | overdue는 식별 가능한 상태 | `S19/*`, `S15/01-*.png` | S19 전용 캡처 없음 | REPRODUCED |
| `CD-005` | Claude Design | S13 | MEDIUM | 판독 불가 기록의 존재·복구 노출 | `S13/02`, `S13/03`, `raw/before-after-hashes.json` | raw byte 보존됨 | REPRODUCED |
| `CD-006` | Claude Design | S12 | MEDIUM | 오류 사유는 제품 언어 | `S12/04-*.png` | 없음 | REPRODUCED |
| `CD-007` | Claude Design | S21·S09 | MEDIUM | 결정 시점에 손실 사유 노출 | `S21/calendar-download-confirmation.png` | 숫자 차이는 노출됨 | REPRODUCED |
| `CD-008` | Claude Design | S03 | MEDIUM | 한 동사 = 한 mutation | `S03/02`, `S03/editor-apply.storage-after.json` | 없음 | REPRODUCED |
| `CD-009` | Claude Design | S14 | MEDIUM | 모든 컨트롤에 accessible name | `S14/state.json` | 요소 미특정 | NEEDS_CODEX_VERIFICATION |
| `CD-010` | Claude Design | S03 | MEDIUM | 오류 표시가 필드 수준에 존재 | `S03/07-*.state.json` | 없음 | REPRODUCED |
| `CD-011` | Claude Design | S04·S07·S13 | MEDIUM | 같은 역할은 같은 이름 | 4개 전체 화면 | 상태별 의도 가능성 | REPRODUCED |
| `CD-012` | Claude Design | S01·S04·S06·S10 | MEDIUM | primary role token 일관 | 5개 전체 화면 | 없음 | REPRODUCED |
| `CD-013` | Claude Design | S12 | MEDIUM | 단일 primary·완결 helper | `S12/06-*.png` | 없음 | REPRODUCED |
| `CD-014` | Claude Design | S01 | MEDIUM | label로 mutation 예측 | `S01/01-*.png` | 없음 | REPRODUCED |
| `CD-015` | Claude Design | S10 | LOW | 저장 상태 단정은 참이어야 함 | `S10/01-*.png`, `S16/state.json` | help에 정정 존재 | REPRODUCED |
| `CD-016` | Claude Design | S06·S15 | LOW | 영역 명칭 일관 | `S06/01`, `S15/01·02` | 없음 | REPRODUCED |
| `CD-017` | Claude Design | S04 | LOW | 사본 identity 구분 | `S04/duplicate.saved-records.json` | 목록 렌더 미캡처 | NEEDS_CODEX_VERIFICATION |
| `CD-018` | Claude Design | S21 | LOW | 산출물 이름 = 화면 어휘 | `S21/transport-manifest.json` | 없음 | REPRODUCED |
| `CD-019` | Claude Design | S21·S20 | LOW | 단위 이름 정의·재사용 | `S21/calendar-download-confirmation.png` | 단위 합산은 없음 | REPRODUCED |
| `CD-020` | Claude Design | S08 | LOW | identity 완전 표시 | `S08/05-*.png` | 없음 | REPRODUCED |
