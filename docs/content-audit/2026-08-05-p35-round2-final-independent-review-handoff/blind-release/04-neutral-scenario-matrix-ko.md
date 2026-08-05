# Pass 1 중립 scenario matrix

## 공통 실행 규칙

- 각 시나리오는 독립 seed에서 시작하고 `PASS | REVISE | BLOCKED | NOT_RUN`으로 끝낸다.
- Codex는 runtime·storage·artifact를, Claude Design은 제공된 storyboard를 검토한다.
- `REQUIRED_PER_SCENARIO`가 없으면 PASS를 주지 않는다.
- mobile 390×844를 기본으로 하고 지정된 경우 1024px, 1440×1000, 720×500 reflow proxy를 추가한다. actual 200% zoom은 승인된 측정 자료가 제공될 때만 별도로 판정한다.
- `Todo/Today`의 역할과 export 관계는 열린 질문이다. 화면·storage·artifact evidence를 보기 전에 분류하지 않는다.

실제 브라우저 200% zoom은 이번 candidate에서 승인된 측정 절차와 캡처가 없어 `NOT_ASSESSED`다. S15의 390×844·1024px·1440×1000과 720×500 reflow proxy는 계속 검토하되, proxy를 실제 zoom으로 바꾸어 말하지 않는다. 이 명시된 한계 하나만으로 전체 review를 중단하지 않고 S15의 actual-zoom 하위 판정만 `NOT_RUN`으로 둔다.

| ID | 중립 task/state | 핵심 검증 | 필수 evidence | Codex | Claude |
|---|---|---|---|---|---|
| S01 | `/flows` URL·메모 lookup의 hit/review/miss/empty/error | 상태 전환, 후보와 CTA, clipboard/download 결과 | 전 상태 storyboard, network/console, payload | RUN | RUN |
| S02 | `/f/[slug]` 공개 계획: dated/undated/mixed | 현재 상태, 날짜 의미, 가능한 결과 capability | full-screen states, effective Item IDs, capability manifest | RUN | RUN |
| S03 | 공개 plan/Item 편집의 apply/cancel/back/error | transaction 경계, 원본 불변, focus/recovery | action 전후, storage diff, error trace | RUN | RUN |
| S04 | 공개 계획 저장 및 개인 영역 전환 | write 수, 생성 identity, duplicate/retry, destination | storage journal, destination full screen, receipt | RUN | RUN |
| S05 | 저장된 개인 계획에서 범위·형식 선택 후 결과 이동 | action ownership, preview→actual→receipt parity | ordered storyboard, raw artifacts, hashes, history | RUN | RUN |
| S06 | `/my` 0/1/5/20 plans와 Todo/Today 후보 view | 빈 상태, library/detail/Todo·Today 영역의 역할과 위계, 0·과밀 상태 | paired mobile/desktop full screens, counts | RUN | RUN |
| S07 | Item 상세·편집·메모·완료·되돌리기 | Item mutation과 plan mutation 분리, 상태 표시 | action 전후, focus trace, storage diff | RUN | RUN |
| S08 | 저장된 plan 편집과 취소·오류·reload | public/saved transaction 의미와 recovery | storyboard, raw before/after record | RUN | RUN |
| S09 | 대표 계획의 결과 형식별 fidelity | 의미 있는 capability, unavailable/held 사유, loss | preview/actual/receipt, parser result, IDs | RUN | RUN |
| S10 | Flow Map choose-child/save-all/review-hold/conflict | 선택 범위, identity/count, partial/conflict 처리 | map states, storage journal, affected IDs | RUN | RUN |
| S11 | help·condition·warning의 closed/open과 keyboard | 발견성, action 전 consequence, focus/Escape/return | closed/open 전체 화면, focus sequence | RUN | RUN |
| S12 | Back/reload/duplicate/retry/storage failure | 중복 방지, state recovery, partial write | journal, console/network, receipt IDs | RUN | RUN |
| S13 | legacy/malformed/missing-base record read | 원본 byte 보존, read-only/recovery, silent rewrite 0 | raw before/after hashes, error state | RUN | RUN |
| S14 | 1/8/24/50 Items, 긴 한국어, emoji·특수문자 | 정보 손실, truncation, interaction density | full screens, raw payload/artifact | RUN | RUN |
| S15 | 390×844, 1024px, 1440×1000, 720×500 reflow proxy; actual 200% zoom은 `NOT_ASSESSED` | hierarchy parity, overflow, sticky/overlay 충돌 | viewport-paired full screens; actual zoom 하위 판정은 `NOT_RUN` | RUN | RUN |
| S16 | keyboard, screen reader relation, error announcement, reduced motion | operability, name/relation, focus, motion preference | accessibility trace, reduced-motion capture | RUN | RUN |
| S17 | phase flag의 rollback runtime 상태 | route/copy/state 복귀, storage migration 없음 | CLI/runtime trace와 storage diff만 사용 | RUN | `NOT_RUN — CODEX_ONLY` |
| S18 | TSV edge fixture | newline/tab/quote, UTF-8, CRLF round-trip, emoji | raw bytes, MIME, parser comparison, SHA-256 | RUN | artifact display만 RUN |
| S19 | timezone·DST 경계·overdue·dated/undated/mixed | day shift, overdue 의미, 임의 날짜 생성 금지 | timezone config, ICS/raw parse, UI states | RUN | RUN |
| S20 | routine projection | Item 수, series 수, VEVENT 수 단위 분리 | unit-labeled manifest, ICS parse, receipt | RUN | RUN |
| S21 | transport·MIME·파일 전달 | filename, media type, encoding, byte length, raw hash | headers/clipboard trace, raw file SHA-256 | RUN | manifest/preview RUN |
| S22 | performance 분류 | 전용 budget/trace 제공 여부만 판정 | measurement manifest 또는 없음의 기록 | `NOT_ASSESSED`가 기본 | `NOT_ASSESSED`가 기본 |
| S23 | Free exploration | 지정 matrix 밖 root-cause·회귀·복구 문제 | reviewer가 선택한 경로와 증거 | RUN | RUN |

## 대표 fixture 최소 집합

- 날짜가 있는 단순 계획
- 날짜가 없는 단순 계획
- dated/undated/mixed 계획
- 관찰 기록처럼 Sheet/Memo field가 중요한 계획
- routine/반복 계획
- Flow Map 선택·보류·충돌 계획
- newline, tab, quote, CRLF, emoji, 조합형/분해형 한국어, URL, 쉼표가 섞인 synthetic fixture
- DST 전환과 overdue를 포함한 timezone fixture

fixture의 표시 이름과 raw SHA-256은 evidence manifest에서 고정한다.

## public quick 결과의 별도 불변식

저장 행동을 거치지 않은 public quick 결과 시나리오는 실행 전후 persistent product storage diff가 비어 있고 persistent write count가 정확히 `0`이어야 한다. 임시 browser download·clipboard 호출은 persistent product write와 별도로 기록한다.
