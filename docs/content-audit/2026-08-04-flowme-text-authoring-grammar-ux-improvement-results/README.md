# FlowMe Text Authoring v2 구현 완료 보고

- 기준일: 2026-08-04
- 작업 위치: `D:\flowme2605\flow-text-authoring-ta`
- 브랜치: `codex/text-authoring-ta-implementation-20260729`
- 구현 기준: [Codex 구현 프롬프트](../2026-08-04-flowme-text-authoring-grammar-ux-improvement-handoff/codex-implementation-prompt-ko.txt)
- 판정: **로컬 구현 및 기능 내부 QA 통과 / dependency audit 후속 필요**
- 증거 경계: 자동 테스트, 브라우저 자동화, 스크린샷은 내부 QA다. 관찰 사용자 검증은 수행하지 않았다.

## 1. 바뀐 사용자 행동

1. 사용자는 root `- [ ]`로 항목을 만들고, 그 아래의 `  - 설명:` 같은 들여쓴 bullet로 속성을 붙인다. 속성을 추가해도 항목 수가 늘지 않는다.
2. 표식 없는 문장은 임의의 할 일로 바뀌지 않고 원문과 issue로 남는다.
3. 제목이나 원문을 편집하면 구조와 결과가 짧은 debounce 뒤에 현재 화면을 유지한 채 반영된다. 반영 중에도 네 결과 버튼은 사라지거나 움직이지 않는다.
4. Calendar는 계산된 날짜순으로 보지만 원문·체크/할 일·표/엑셀·텍스트는 작성 순서를 유지한다. 두 순서가 다를 때만 `입력도 이 순서로 맞추기`가 보이며, 사용자가 실행한 경우에만 같은 Step 안의 Item 블록을 이동하고 되돌릴 수 있다.
5. 상대 날짜는 원문에 `- 기준일: YYYY-MM-DD`가 있을 때만 실제 날짜가 된다. 화면에서 기준일을 고르면 숨은 상태가 아니라 해당 원문 줄을 추가하거나 수정한다.
6. 결과 형태는 `캘린더 | 체크/할 일 | 표/엑셀 | 텍스트` 네 슬롯으로 고정된다. 만들 수 없는 결과도 자리를 유지하며 비활성 이유를 제공한다.
7. `항목 구조`는 읽기 전용 요약으로 시작한다. 이동·병합·분리·역할·포함 여부는 `구조 수정` 대화상자 안에서만 조정한다.
8. 제품 화면에는 대표 예시 5개만 노출하고, 검증용 27개 예시는 `?authoringQa=1`에서만 연다.
9. 모바일은 입력·구조·결과 중 한 단계만 열고 각 단계가 독립적으로 끝까지 스크롤된다. 짧은 세로 화면과 844×390 가로 화면에서도 마지막 내용과 하단 행동이 겹치지 않는다.

## 2. 문법·데이터 계약 변경

정본 writer 문법은 v2다.

```markdown
# Flow 제목
- 기준일: 2026-08-10
## Step
- [ ] Item
  - 설명: 설명입니다.
  - 날짜: 2026-08-03
  - 상대 날짜: D-3
  - 자료: [이름](https://example.com)
```

- parser는 v1의 대시 없는 들여쓴 속성을 계속 읽지만 writer는 v2만 출력한다.
- 공식 속성 bullet은 일반 목록보다 먼저 판정한다. 알 수 없는 colon bullet은 `unknown_property`, 들여쓴 checkbox는 `unsupported_nested_item` issue이며 가짜 Item을 만들지 않는다.
- raw source, source snapshot, source range, stable Item ID, source lineage를 보존한다.
- Calendar/ICS는 resolved date 오름차순과 작성 순서 tie-break를 사용한다. 날짜 없는 Item은 VEVENT를 만들지 않는다.
- 표/엑셀은 원본 표이거나, Item 2개 이상에 의미 있는 공통 필드가 2개 이상일 때만 활성화한다. 실제 열 이름·셀·URL을 유지한다.
- 텍스트 결과는 byte-equivalent `원문 그대로`와 변환된 TXT/Markdown을 구분한다.
- 정본 계약은 [text-authoring-contract-v2.json](../../specs/2026-07-28-flowme-text-authoring-ux-v1/text-authoring-contract-v2.json)이다. [v1 계약](../../specs/2026-07-28-flowme-text-authoring-ux-v1/text-authoring-contract-v1.json)은 읽기 호환 기준이다.

## 3. 사용자 피드백 1~10 처리 결과

| # | 요청 | 구현 결과 | 내부 확인 |
|---:|---|---|---|
| 1 | 속성도 `- 설명:`처럼 구조 표식 필요 | 모든 canonical Item 속성을 `  - 속성: 값`으로 출력하고, 속성 parser 우선순위를 일반 목록보다 앞에 둠 | G01, G02, G08 |
| 2 | Calendar와 원문 순서 분리 | Calendar/ICS만 날짜순, 나머지는 작성순. 명시적 원문 재정렬과 undo 추가 | D02, D03, D07 |
| 3 | Sheet 정체성·활성 조건 명확화 | `표/엑셀`로 통일하고 제목 목록은 비활성, 실제 표/반복 필드일 때 실제 열과 URL 표시 | D04, D05, D06 |
| 4 | 상대 날짜 기준일을 원문에 표시 | raw `- 기준일:`만 계산 기준으로 사용하고 UI 입력도 원문을 즉시 수정 | G04, D01 |
| 5 | 결과 버튼 위치 고정 | 네 슬롯을 항상 같은 순서·폭·위치로 유지하고 비활성 이유 제공 | U06, U08 |
| 6 | `정리 메모` 대신 텍스트 경계 | `텍스트` 안에서 원문 그대로, 정리된 TXT, 정리된 Markdown을 분리하고 각각 복사·내보내기 제공 | A07 및 focused E2E |
| 7 | 링크·상세를 결과에서 확인 | 설명·완료 기준·날짜·시간·장소·반복·조건·링크를 결과별 자연스러운 위치에 노출 | D08, D09 및 focused E2E |
| 8 | 기술 형식명을 첫 화면에서 제거 | CSV/TSV/Markdown 형식명은 가져오기 도움말·결과별 내보내기에만 배치 | U01, U02 및 copy review |
| 9 | 순서 번호 입력 불필요 | 작성 순서로 번호를 계산하며 numbered list는 읽기 호환, writer는 `- [ ]`로 정규화 | G06, D02 |
| 10 | `나눈 항목`을 `항목 구조`로 변경 | 기본 읽기 요약과 별도 `구조 수정` dialog로 분리 | U01, U03~U05 |

## 4. Simulation matrix

| 구분 | 통과 | 실패 | 대기 |
|---|---:|---:|---:|
| API acceptance: G01~G10, D01~D09, A01~A08 | 27 | 0 | 0 |
| 브라우저 QA: U01~U08 | 8 | 0 | 0 |
| 합계 | **35** | **0** | **0** |

실패 목록: 없음.

- 정본 결과: [simulation-matrix-v2-results.json](./simulation-matrix-v2-results.json)
- 브라우저 원시 증거: [ui-simulation-evidence.json](./ui-simulation-evidence.json)
- 첫 실행의 모바일 겹침·slot transient·navigation-induced request abort를 그대로 확인한 뒤 수정했다. 최종 실행은 U01~U08 `8 / 8`, console error `0`, page error `0`, failed request `0`, replacement character `0`, external request `0`이다.

## 5. 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `npm.cmd run test:text-authoring` | `147 / 147` 통과 |
| `npm.cmd test` | pretest `100 / 100` + unit `594 / 594`, 총 `694 / 694` 통과 |
| `npx.cmd tsc --noEmit` | repo-wide는 기존 비-TA 테스트 진단 `190`건으로 exit `2`; Text Authoring 소유 경로 진단은 `0`. Next production build type-check는 통과 |
| focused production Playwright | 위험 기반 12개 시나리오 통과; 제품 5개, QA 27개 경계, 상세 projection, Text 3종, 구조 수정, 모바일, v2 issue, XLSX/TXT, merge 포함 |
| `npm.cmd run build` | Next production build 통과, static pages `18 / 18`, `/flows/new` 생성 |
| `npm.cmd run build:text-authoring-html` | self-contained HTML 생성, `2,090,370` bytes |
| `npm.cmd run capture:text-authoring-grammar-ui` | U01~U08 `8 / 8`, 6 viewport, 스크린샷 9장 |
| `npm.cmd run build:text-authoring-v2-results` | 전체 matrix `35 / 35` |
| `npm.cmd run docs:check` | 필수 문서 `14`, 로컬 링크 `3,685` 검사 통과 |
| `git diff --check` | 오류 `0`; 기존 LF/CRLF 경고만 표시 |
| JSON parse | v1/v2 contract, 후보 계약·matrix, 결과 matrix·UI evidence 모두 통과 |
| `npm.cmd run security:audit` | 실패: transitive `brace-expansion`·`minimatch` High 2건, advisory `GHSA-rgw5-rvv9-x895`; fix available. 이번 작업은 dependency/lock을 바꾸지 않아 자동 수정하지 않음 |

전체 29개 Text Authoring E2E를 한 번에 재실행한 결과로 과장하지 않는다. 이번 변경 위험에 직접 닿는 focused E2E 12개와 별도의 U01~U08 브라우저 matrix를 실행했다.

## 6. 수정 파일과 기존 dirty 변경의 경계

이번 구현이 소유한 범위:

- route/layout: `app/flows/new/page.tsx`, Text Authoring 범위의 `app/globals.css`
- UI: `components/flow/text-authoring/*`
- parser·contract·projection·operation·storage·export·tests: `lib/flow/text-authoring/*`
- E2E: `tests/e2e/text-authoring.spec.ts`, rollback 경로를 명시한 `tests/e2e/flow-mvp.spec.ts`
- 생성·검증 스크립트: `scripts/build-text-authoring-standalone.mjs`, `scripts/content-audit/*text-authoring*`
- 계약·계획·상태 문서: `docs/specs/2026-07-28-flowme-text-authoring-ux-v1/*`, `docs/DECISIONS.md`, `docs/STATUS.md`, `docs/ROADMAP.md`, `docs/SERVICE_STRUCTURE.md`, `docs/specs/README.md`, `docs/validation-sessions/README.md`
- 근거: 이 폴더의 standalone HTML, JSON 2개, PNG 9개

작업 시작 시 worktree는 이미 Text Authoring 관련 tracked/untracked 변경이 섞인 dirty 상태였다. 기존 변경을 reset·checkout·clean하지 않았고, 관련 구현을 이어서 수정했다. `components/flow/FlowArtifactDataPreview.tsx` 등 시작 시점의 변경 표시는 임의로 정리하거나 소유권을 주장하지 않는다. `old/`, `claude_ver/`, legacy dump와 다른 제품 lane은 수정하지 않았다.

## 7. 미해결 결정과 위험

- v2는 nested Item을 지원하지 않는다. 안정적인 parent identity와 lossless round-trip 계약이 생길 때까지 `unsupported_nested_item` issue로 보존한다.
- 표식 없는 prose를 자동 Item으로 바꾸는 import-assist는 구현하지 않았다. 별도 승인·review gate가 필요하다.
- 반복·조건은 정의 텍스트를 보존하지만 occurrence 확장이나 ICS `RRULE`을 만들지 않는다.
- 이 구현은 기존 My Flow canonical model, 계정·cloud sync, 직접 외부 Calendar/VTODO write를 통합하지 않는다.
- 실제 대상 사용자의 저작 행동은 관찰하지 않았다. 내부 QA 통과는 사용성 검증이나 출시 승인으로 해석하지 않는다.
- 현재 dependency audit은 `exceljs -> archiver -> minimatch/brace-expansion` 경로의 High 2건으로 non-green이다. 이번 변경은 dependency나 lockfile을 수정하지 않았고, 무관한 의존성 업데이트를 자동 적용하지 않았다. publish를 승인하기 전에 별도 remediation과 전체 회귀가 필요하다.

## 8. Publish 상태

| 항목 | 상태 |
|---|---|
| 로컬 구현 | 완료 |
| commit | 하지 않음 |
| push | 하지 않음 |
| PR / merge | 하지 않음 |
| 새 Preview / production deploy | 하지 않음 |
| P35 production | 변경 없음 |
| 관찰 사용자 검증 | 수행하지 않음 |

## 산출물 바로 열기

- [Text Authoring v2 standalone HTML](./flowme-text-authoring-v2-test.html)
- [데스크톱 구조 수정](./ui-u01-structure-dialog-1440x900.png)
- [모바일 단계 끝 도달](./ui-u03-stage-scroll-390x844.png)
- [가로 화면 footer 겹침 확인](./ui-u05-landscape-844x390.png)
- [실시간 반영과 고정 슬롯](./ui-u06-live-reflection-1440x900.png)
