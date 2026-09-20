# K3-A 기존 작성·예시 회귀 QA

2026-09-05. 상태: **승인된 기존 회귀 29/29 PASS**. 이번 실행은 K3-A의 새 그룹·작성 틀 UI 뒤에도 기존 동작과 안전 경계가 유지되는지 확인했다. 개발2 전체, 세 산출물 전체 또는 실제 기기 검증 완료를 뜻하지 않는다.

## 1. 실행 후보와 증거

| 항목 | 확인한 값 |
|---|---|
| production BUILD_ID | `YfWMdaOcy9e77WdBG3b8W` · 로컬 3182 |
| AuthoringSurface SHA-256 | `793388C067DCF723CB7069B0383150C96905F0DBA66676F4362801518F61B6E3` |
| Workspace Surface SHA-256 | `953991F1F0A5D6F29DC0E9B1FB2BD96BE674DB48A427432CFB01B6F06EC108A0` |
| standalone app SHA-256 | `24CF2D67F89A84522C3970EF9FB31A69734ABFA4A72D5656020AD0F58F0ADBD5` |
| 당시 생성 HTML | 1,249,043 bytes · `1F64F15507D57574BC4E28BC8ADBC4E14A9CA61E1E5056166E7A6C35105CD5B8` |
| 실행 시작 / 소요 | 2026-09-05 09:52:34 UTC / 136.481초 |
| 결과 | 29 PASS · FAIL/skipped/flaky 0 · exit 0 |

실행 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3a/existing-regression-29-first-2026-09-05.json`), 실행 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3a/existing-regression-29-first-2026-09-05.log`), 전후 해시·변경 계약 원장 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3a/existing-regression-adapter-manifest-2026-09-05.json`)을 보존했다. standalone 시험은 기존 방식인 `buildText()` 메모리 HTML을 사용했으며 이 검증 작업이 HTML을 재생성하지 않았다.

이 build에는 후속 source-time reader와 memo 소유 구분도 포함된다. 같은 build의 결과 네 보기·exact handoff 회귀는 통과했으나, 아래 대표 결과 전환 검사를 특정 원본 시간·memo의 전수 표시 검사로 확대하지 않는다. 그 필드 검증은 K3-B의 별도 근거다.

## 2. 원래 시험과 달라진 부분

[K3-A 설계 §5](./k3a-design.md)의 승인된 표현 계약에 맞춰 **기존 4개 spec만** 수정했다. 수정 전 파일을 BEFORE 폴더 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3a/before-existing-regression-adapter`)에 복사하고 정확한 SHA를 기록했다. 새로운 회귀 spec 복제나 제품 코드 수정은 없었다.

| 변경 | 보존한 의미 |
|---|---|
| 날짜·대표 속성 진입에 `항목 정보→그룹` 추가 | 같은 Item owner, 기존 planner, 명시 적용과 source transaction |
| 16개 동시 카드 기대를 네 그룹 순회로 변경 | literal 16 key의 누락·중복 없음, 각 key의 editable 지원 메타데이터 |
| 완성 예시·검증 정보 disclosure를 명시적으로 열기 | exact compiled source/version/Item 수, 둘러보기 0쓰기 |
| `빈 틀 넣기` / `이 예시로 시작` 문구 사용 | scaffold 적용과 compiled 원문 적용을 구별 |
| Tab으로 밖에 나가면 chooser 닫힘·강제 opener 복귀 없음 | native 문서 순서·0쓰기. 명시 재진입 후 Escape→정확 opener 복귀도 계속 검사 |
| missing/version의 materialize는 disabled 대신 absence 검사 | 즉시 보이는 오류, independent scaffold enabled, 원문·저장 0쓰기. 오류를 펼친 뒤에만 확인하도록 약화하지 않음 |
| 캡처를 `testInfo.outputPath`로 이동 | 과거 docs 자산과 기존 viewport PNG 덮어쓰기 0 |

원문·scaffold·compiled bytes, first-blank selection, native insertText/Undo/Redo, reload, no-op·취소·실패, 운영 key/value 경계, 기존 reflow·hit·오류 assertion을 유지했다. missing/version 경고의 `visible` 검사는 추가했다. root가 발견·수정한 닫힌 disclosure 안의 경고를 이번 실제 회귀에서도 확인했다.

## 3. 시나리오별 결과

아래 번호는 보고서의 검사 행 번호다. 새 요구 ID나 새 갭 해결 수가 아니다.

| 번호 | 기존 spec / 실제 검사 | 결과 |
|---|---|---|
| 1 | Integration P2-C: 네 결과, 16 key 지원 순회, 날짜 값 선택, 시간·시간대, subcheck, near-miss | PASS |
| 2 | Integration P3-A: 모바일 이름, 검토 복귀, duration·dependent 취소/Escape, 정확 초점·0쓰기 | PASS |
| 3 | Standalone P3-C: 31개 목록·그룹 수, 대표 예시 preview·exact 적용·native Undo | PASS |
| 4 | Standalone P3-C: nonempty·backdrop·Escape·pointer cancel·native/저장 실패 | PASS |
| 5 | Standalone P3-C: planner 차단·catalog runtime 누락 | PASS |
| 6 | Standalone P3-C: compiled 예시 preview·명시 적용 1회·native Undo | PASS |
| 7 | Standalone P3-C: StructureDraft nonempty·취소·compiler/runtime/version·저장 실패 | PASS |
| 8 | Standalone P3-C: 필수 5 viewport의 dialog·내부 스크롤·초점·48px 행동 | PASS |
| 9 | React P3-C: 390×844 예시 dialog | PASS |
| 10 | React P3-C: 375×812 예시 dialog | PASS |
| 11 | React P3-C: 844×390 예시 dialog | PASS |
| 12 | React P3-C: 1024×768 예시 dialog | PASS |
| 13 | React P3-C: 1440×900 예시 dialog | PASS |
| 14 | React P3-C: 대표 예시 exact 적용→Undo→재적용→reload | PASS |
| 15 | React P3-C: nonempty·Escape·pointer cancel·backdrop·저장 실패 | PASS |
| 16 | React P3-C: compiled preview→blank-only transaction→Undo | PASS |
| 17 | Stage2: 네 origin·known/invalid URL·memo 입력 분기·Map read-only 선택 | PASS |
| 18 | Stage2: multi Map exact child 최초 선택·0쓰기 | PASS |
| 19 | Stage2: 원문→결과→exact source 저장, 별도 구조 확인 강제 없음 | PASS |
| 20 | Stage2: 같은 source/current-line raw/Flow 표현·보기 전환 0쓰기 | PASS |
| 21 | Stage2: 여섯 scaffold exact 삽입·first blank·native Undo/Redo·draft | PASS |
| 22 | Stage2: stale helper·합성 IME·picker 취소·Escape | PASS |
| 23 | Stage2: ghost 표시·source/selection/scroll/storage/native history 불변 | PASS |
| 24 | Stage2: 날짜 도움 명시 편집·Undo/Redo·잘못된 날짜 exact line 복귀 | PASS |
| 25 | Stage2: 틀·도움·검토의 keyboard/outside close·한 overlay·focus·0쓰기 | PASS |
| 26 | Stage2: draft exact reload·malformed fail-closed | PASS |
| 27 | Stage2: Tab/Shift+Tab native 순서·닫힘·명시 재진입 Escape 복귀 | PASS |
| 28 | Stage2: 7 viewport와 200% 등가 reflow·overflow·핵심 행동 | PASS |
| 29 | Stage2: 동적 visualViewport·reduced motion·행동 노출·0쓰기 | PASS |

파일별 2 + 6 + 8 + 13 = **29개 고유 등록 시험**이다. viewport loop·여섯 틀 loop의 반복을 추가 테스트로 세지 않는다. 이번은 현행화 뒤 첫 실제 실행이며, 역사 K1-A의 선정 21 PASS나 K1-A 38/38, 새 K3-A 22개와 중복 합산하지 않는다. [과거 K1-A QA](./k1a-qa.md)의 21개는 당시 후보의 결과다.

## 4. 커버한 범위와 커버하지 않은 범위

| 구분 | 이번 직접 근거 | 확대하면 안 되는 주장 |
|---|---|---|
| 16 속성 | 네 그룹의 literal key·지원 메타데이터 전체, 날짜 값 선택·시간/시간대·subcheck·duration 대표 편집/취소 | 16개 모두 독립된 실제 입력·적용·실패를 전수 수행했다는 주장 |
| 6 scaffold | 여섯 원문의 exact 삽입, first blank, native Undo/Redo, 저장 bytes | 새 여섯 제품 정책을 확정했다는 주장 |
| 6 compiled 자산 | 여섯 preview의 expected raw/version/Item 수 | 브라우저에서 여섯 compiled 예시를 모두 materialize했다는 주장. 명시 적용은 대표 예시 |
| 31 corpus | 전체 목록·분류 수·대표 원문 preview/적용/실패 | 31개 원문을 브라우저로 모두 적용하거나 관찰 사용자에게 검증했다는 주장 |
| source/time·memo | 최신 공통 reader build에서 기존 결과·handoff 경로가 계속 동작 | 해당 필드의 전수 의미 동등성. K3-B 전용 검사를 별도 인용해야 함 |

자산·planner·19-rule/negative corpus의 순수 모델 검사는 해당 기존 suite와 전체 npm 근거에 별도로 연결한다. 이 브라우저 수로 대신하지 않는다.

## 5. 화면과 저장 경계

Stage2는 320×700, 360×800, 375×812, 390×844, 844×390, 1024×768, 1440×900과 CDP 720×450·DPR2의 200% **등가 reflow**를 실행했다. 실제 브라우저 UI 확대나 OS 글자 확대 검사가 아니다. P3-C 양쪽은 필수 다섯 viewport에서 예시 dialog와 행동을 검사했다.

새 output에 PNG 21개를 보존했다: Stage2 진입/작성 16개와 React P3-C 5개. 이 작성자는 React P3-C 다섯 장과 Stage2 작성 844×390 한 장, 총 6장을 직접 열었다. 나머지 15장은 이번 문서 작성 과정에서 직접 시각 평가하지 않았다.

- React 예시 dialog 390/375는 단일 preview, 큰 화면은 목록/preview를 나눠 보여 주며 닫기·적용 행동이 읽혔다. 작은 화면은 메타데이터 뒤 원문을 스크롤해서 보는 구성으로, 전체 원문이 처음부터 한 화면에 보인다는 뜻은 아니다.
- 844×390 예시 dialog는 낮은 본문 안에서 내부 스크롤과 적용 영역을 분리했다. 작성 844×390은 editor 일부가 보이고 나머지는 스크롤하는 상태다. 기존 자동 검사의 visible editor 최소 높이·행동 비중첩 기준 통과와 완성도 평가는 구별한다.
- 새 K3-A B11의 owner·오류·input·retry 동시 9점 hit 검사는 **다른 suite**의 근거다. 이 기존 suite의 순차 도달/중앙 hit 결과로 바꾸어 인용하지 않는다.

390 예시 캡처 (로컬 전용 근거: `../../../output/playwright/k3a-existing-regression-29-first-2026-09-05/personal-workspace-p3c-val-7fe18-문은-내부-스크롤되고-핵심-행동이-가려지지-않는다/p3c-react-viewports/validation-examples-390x844.png`), 844 예시 캡처 (로컬 전용 근거: `../../../output/playwright/k3a-existing-regression-29-first-2026-09-05/personal-workspace-p3c-val-e48d2-문은-내부-스크롤되고-핵심-행동이-가려지지-않는다/p3c-react-viewports/validation-examples-844x390.png`), 844 작성 캡처 (로컬 전용 근거: `../../../output/playwright/k3a-existing-regression-29-first-2026-09-05/personal-workspace-stage-2-41538-le-page-error-가려진-핵심-행동이-없다/stage2-viewports/authoring-844x390.png`).

기존 시험의 PoC prefix, source/draft bytes, 운영 fixture 전후 비교와 no-op·취소·오류의 0쓰기 assertion은 모두 유지한 상태로 PASS했다. 다만 이 네 spec은 K1-A와 달리 성공 시 `storage-boundary` attachment를 남기지 않는다. 따라서 **이번 29개의 API 총수·실제 context 총수·모든 시험의 console/page error 통합 총수를 새로 집계했다고 쓰지 않는다.** 오류 감시가 설치된 화면 시험에서 error 배열 0을 확인했다. 운영 증거는 격리된 자동 fixture이며 사용자 프로필·서버 운영 데이터 검사가 아니다.

## 6. 남은 일과 발행 상태

이 29개 선택 범위의 실패는 없다. K3-A 원본 비교·새 chooser/browser 결과·기술 disclosure와 K3-B 필드 결과의 최종 통합 판정은 root의 별도 보고서에 연결한다. 이번 작업에서 원본 대화 전체를 다시 읽거나 관찰 사용자 검증을 하지 않았다.

실제 Android Chrome/iOS Safari, 실제 OS IME, TalkBack/VoiceOver, OS 글자 확대는 **NOT_RUN**, 관찰 사용자 **0명**이다. 합성 composition·CDP·PNG는 그 증거를 대신하지 않는다.

이 하위 검증 작업의 commit·push·PR·Preview·Production 배포는 모두 안 함. 로컬 production build 실행은 배포가 아니다. `npm run docs:check`는 exit 0으로 통과했다(필수 파일 16개, 로컬 링크 5,246개). 실행 로그는 `output/poc-gap-implementation/k3a/existing-regression-docs-check-2026-09-05.log`다.
