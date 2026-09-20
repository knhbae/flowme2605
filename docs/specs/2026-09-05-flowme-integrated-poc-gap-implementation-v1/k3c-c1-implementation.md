# K3-C C1 — 출처와 개인 미리보기 연결 작업 기록

2026-09-06. **진행 중**. [설계](./k3c-c1-entry-preview-design.md)와 승인된 단계별 계획 §10에 따라 진행한다. B3의 검증 완료를 C1 완료로 환산하지 않는다.

## 적용할 원본 요구와 구현 순서

| 원본 | 이번 연결 | 보호 조건 |
| --- | --- | --- |
| 개발1 K-D1-04/10, D1-017.1/.2/.7, D1-021 | 선택 전 출처/안전한 링크, 원문과 내 사본 owner, 같은 네 결과와 상세 | URL·완료 기준 창작0, 전체 tuple/refs, Text 기본 |
| v4.1 폴더·기간·Flow/Item 실행 | 읽기 입구에서 개인공간으로 이동하고 돌아오기 | 폴더 소속·실행 날짜·완료·순서·Undo를 검색으로 변경0 |
| 개발2 원문·개인·실행 분리 | 원문 설명/기준과 개인 메모를 따로 읽기 | 원문 exact, 일반 글/초안/작성 틀/native Undo 변경0 |

1. 현재 세 UI 갭을 실제 baseline에서 확인한다.
2. 기존 strict source decoder와 genuine source index를 사용한 **순수 읽기 packet**을 만든다. packet은 저장·Undo·현재 권한이 아니다. 네 검색 origin을 유지하고 authored를 새 검색 대상으로 추가하지 않는다.
3. React 검색 행·원문/내 사본 preview에 연결한다. 같은 개인 결과는 기존 ResultPresenter를 사용하며, 읽기 모드에서는 회차 완료·날짜 변경 같은 쓰기 제어를 렌더하지 않는다. 기본 prop 미지정의 기존 실행 화면은 유지한다.
4. exact query 안의 메모리 복귀 상태를 연결한다. 검색어·메모를 URL나 새 storage에 넣지 않고 source/target 변경 시 이전 읽기 owner를 재사용하지 않는다.
5. standalone에 별도 기존 Flow 찾기 입구를 연결한다. CreatorDraft 검색이나 작성 초안을 덮지 않는다. fixture 공급 차이를 숨기지 않는다.
6. source/개인 분리·전체 refs·읽기0쓰기·왕복·다섯 viewport와 기존 회귀를 실행한 뒤 실제 확인된 요구만 판정한다.

전체 source snapshot이 없는 legacy 사본은 보유한 source-owned 필드만 보여 주며 전체 원문 복원으로 표현하지 않는다. 개인 소유로만 남은 제목/구간/일정·순서를 원문 값으로 추정하지 않는다. source 날짜 offset은 원문 일정으로 구분하고 시각이나 개인 기준일 기반 절대일로 창작하지 않는다.

## 첫 실제 브라우저 baseline

신규 characterization spec (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3c-entry-characterization.spec.ts`)은 원본 운영 데이터를 복사하지 않은 **격리 fixture**다. public read adapter·state decoder·composition·Result가 실제로 수용한5개 Item과 개인 overlay를 사용한다.

| 등록 | 실제 수정 전 판정 |
| --- | --- |
| C1-R01 | 출처 행에 보유 source title과 원문 링크가 없음 — RED |
| C1-R02 | 개인 제목의 상세를 열면 원문 설명/기준 구획 대신 개인 메모만 표시 — RED |
| C1-R03 | 개인 title/order는 이미 일부 적용됐지만 네 결과를 담당하는 기존 presenter는 입구에 연결되지 않음 — RED |

첫 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-entry-baseline-20260906-01.json`)은 fixture slug에 `url-draft-`가 없어 actual origin 검증에서3개 모두 실패했다. UI 실행 전에 발생한 하니스 오류이며 제품 결함3개로 세지 않는다. heading의 실제 id selector도 신규 하니스에서 바로잡았다.

정당 fixture 재실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-entry-baseline-20260906-02.json`)은 실제 **3실행/0PASS/3FAIL**이다. 각 failure는 위 UI 기대 한 개이고,3 context에서 **제품 set/remove/clear0, 전체 준비 key/value exact, console/pageerror0**였다. 루트가 R02의1440×900 PNG를 직접 확인했다. 사본 전체 개인값이 누락됐다고 진단하지 않고, 출처 누락·상세 owner 혼합·결과 연결 차이로 구분한다.

baseline 서버는 B3 최종 production `mRCFjc6SZUKFxn3lHvG3a`다. 이후 C1 구현 후보는 별도 build/JSON/QA로 기록한다. baseline을 현재 성공으로 소급하지 않는다.

## 남은 검증·범위

현재 새 packet과 단위 검사는 진행 중이며 React/standalone C1 연결 및 다섯 화면 완료는 아니다. source-only 설명을 기존 Result가 memo로 넘기는 코드 경로도 별도 characterization 후 판정한다. 새 adapter에서 조용히 원문 또는 개인값을 재해석하지 않는다.

기본 `/my`, 운영 key/schema/writer, global theme, 기존 source 후보 generator는 이 단계에서 변경하지 않는다. 사용자 기기·OS 키보드·보조기술은 미실행, 관찰 사용자0. commit/push/PR/Preview/Production없음.

## 2026-09-06 React 읽기 연결 확인

위의 첫 진행 상태 이후 실제 React 연결을 구현했다. [현재 QA](./k3c-c1-react-read-qa.md): 공통 결과의 source-only 설명/memo 혼합도 실제 RED 후 수정했고 새 packet21·readonly SSR2 및 기존72개 합동95/95를 확인했다. 현재 W3T4 production build에서 최초3개 화면 갭과 다섯 viewport, source 관측 변화 폐기·손상 gate의 신규10개, 기존 입력/작성 Stage2 13개가 통과했다. 초기9개 중 안내1실패 이력은 별도 보존했다. source offset은 원문 상대 일정 그대로다. 전체 원문·미확인 정보는 생성하지 않는다.

현재 새 입구10 context의 모든 저장API0·cross-document API0·준비 key/value exact·브라우저 오류0. 기존13개에는 명시적 작성/저장 시나리오가 있어 전체23개를0쓰기로 합산하지 않는다. 최신 npm은 기존 source-review기한1건으로2,030실행/2,029PASS/1FAIL, 중단 뒤201/19는 별도 통과. 기존551보호·예상밖0.

**다음 실행은 이 단계의 남은 요구다.** React 목록/개인공간 왕복의 memory/history 상태 복원은 미구현이고, source/target 변경 후 다시 읽는 경로·장문/다중링크·임포트 메모 전수 화면 검사도 남아 있다. standalone entry는 아직 연결하지 않았고 두 조작 HTML은 B3 7D1610 그대로다. C1 전체나 세 원본의 전체 coverage를 완료로 올리지 않는다.

왕복 수정 전 R07 실제 브라우저 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-baseline-20260906-01.json`) **1실행/1FAIL**을 추가했다. 실제 개인공간→Back에서 검색어가 빈 값으로 복원된다. 제품저장0·준비key/value동일이며 새로운 영구 저장을 필요로 하는 문제가 아니다. 다음 구현은 이 RED를 기준으로 정확한 source/target bytes를 다시 검증하는 메모리 ticket과 client navigation을 연결한다. Source/target/operating snapshot이 달라졌거나 기존 작성 초안이 활성일 때 과거 읽기 owner를 재사용하지 않는다.

## 2026-09-06 React 왕복 검증 / 다음은 C1-b

위 미구현 상태 이후 메모리 탐색 복귀와 client 이동을 구현했다. 최종 **HiAhDAh-TgaCKpB_m4CgB**에서 왕복15+읽기10+Stage2 13 **38/38**, 기존 작성 K1-A/K3-A **30/30**, 모델·렌더 **113/113**을 확인했다. 검색/목록/선택·owner·보기·월/선택일·열린 Item·스크롤·초점을 복원하고, 현재 source/state/draft/library와 full membership을 다시 검증한다. 관측 ABA나 읽기 실패는 옛 복귀 상태를 폐기한다. 새 저장 key와 운영 writer는 없다.

같은 화면의 작성↔검색에서는 기존 textarea와 native Undo를 유지한다. 저장 실패 입력은 미리보기 링크와 상단 출구에서 이동을 막고 작성기에 남긴다. 기존 작성 회귀에서 실제 재현한 늦은 초점 복귀도 새 사용자 선택을 덮지 않도록 수정했다. 기존 K1-A/K3-A 시험은 변경하지 않았다. route 왕복에서도 native Undo가 보존된다고 확대하지 않는다.

[왕복 QA](./k3c-c1-react-return-qa.md)에 세 원본 요구별 전후·실패 이력·실행 수·다섯 화면·경계를 구분했다. 최종 후보 첫37/38은 기본 /my의 정상 sort query를 신규 하니스가 거부한 실패이며, 기존 기본 화면의 두 URL 형태만 허용한 뒤38/38이다. 운영 제품을 바꾸지 않았다. npm은2,030실행2,029PASS/기존 출처 기한1FAIL, 이후201/19 별도PASS다.

다음은 [C1-b 최소 연결 계약](./k3c-c1-standalone-entry-contract.md)의 로컬 읽기 입구다. 현재 두 단일 HTML은7D1610으로 동결되어 있고 이번 React 기능을 포함하지 않는다. C1 전체·C2·C3·K4·전체 목표는 아직 완료가 아니다.
