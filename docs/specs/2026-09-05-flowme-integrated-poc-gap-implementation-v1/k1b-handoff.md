# K1-B 변경 파일과 인계

2026-09-05. 상위 단계별 목표는 계속 진행 중이다. K1-B의 상세 판정은 [통합 QA](./k1b-qa.md), [모델 QA](./k1b-model-qa.md), [화면 평가](./k1b-visual-review.md)를 함께 읽는다.

## 구현 범위

standalone Plan/Item/Quick 편집의 clean/dirty 닫기, 자식 draft 반영과 부모 최종 저장의 분리, 입력을 보존하는 실패·재시도, 같은 URL의 history 복귀, 새로고침 시 저장 복구 기록 확인을 구현했다. `prepared` 미확정과 `confirmed` 저장 완료를 구분하며 확정된 내용을 실패로 오인해 롤백하지 않는다. 원문·운영 writer·workspace 본문 schema는 변경하지 않는다.

## 소유 변경

아래 assets는 모두 `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/` 아래다. 변경 전부터 있던 dirty diff는 유지하고 이번 묶음의 최소 delta를 더했다.

| 파일 | 이번 변경 |
|---|---|
| `plan-item-session.js` / `plan-item-session.test.cjs` | 신규 순수 세션·저장 복구 모델과 74개 시험 |
| `app.js` | 세션 coordinator, 닫기 확인, staged apply·최종 저장, 실패/복구 UI, history·초점 복귀 |
| `style.css` | 편집 실패/복구 안내와 확인 행동의 국소 스타일 |
| `build-single-file.cjs` | 신규 모듈을 기존 단일 HTML 생성 순서에 포함 |
| `standalone.test.cjs` | 기존 inline 구현을 전제로 하던 두 정적 assertion을 순수 adapter 호출 계약으로 조정. 금지 clear 검사는 유지 |
| `tests/e2e/personal-workspace-k1b-dirty-close.spec.ts` | 신규 브라우저 19개. 파일·HTTP, 정상/취소/실패/복구, viewport와 저장 경계 |
| `tests/e2e/personal-workspace-stage-3-runtime.spec.ts` | 기존 dirty delta 보존. stale 검사 전에 준비용 QuickItem 비동기 저장의 행 생성 완료를 기다리는 assertion 3줄 추가. target 0·bytes 보존 기대는 그대로 |
| standalone-ko.html / android-single-file-ko.html | 위 asset에서 동일 bytes로 재생성. 수작업 HTML 분기 없음 |

현재 후보 해시는 `A0DE57EA01E571BE6716A8A7B91BDCE6B6A9F7FBE4D65D3D34EC3CE8D1773141`, 두 파일 모두 **1,008,623 bytes**다. 후보를 확인하는 다음 5곳만 같은 값으로 갱신했다. 과거 실기기 NOT_RUN 기록이나 과거 후보 증거를 새 값으로 바꾸지 않았다.

- `scripts/personal-workspace-poc/serve-p3h1-android-device.mjs`
- `scripts/personal-workspace-poc/serve-p3h1-android-device.test.mjs`
- `lib/flow/personal-workspace-poc-p3h1-android-evidence.ts`
- `docs/content-audit/2026-09-04-flowme-integrated-poc-p3h1-android-device-runner-ko-assets/model.js`
- `tests/e2e/personal-workspace-p3h1-android-device-host.spec.ts`

이번 K1-B에서는 React 제품 화면, 기존 standalone `model.js`와 shell을 수정하지 않았다. 앞선 K1-A/K2-A의 변경은 누적 작업 상태로 남아 있다. 문서 변경은 이 폴더의 K1-B 설계/복구 보완/QA/인계·진행 원장과 누적 한국어 HTML 보고서다.

## 저장 경계

내용 target은 기존 `flow:poc:personal-workspace:v1:standalone-integrated`다. 복구 기록은 신규 `flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v1` 하나다. 정상 내용 저장은 target set 1회이며 prepared/confirmed journal set 2회와 정리 remove 1회가 별도로 발생한다. ‘전체 API 호출이 1회’라는 뜻이 아니다.

취소·같은 내용·자식 Item 반영은 저장 0회다. 오류 후 복구의 set/remove 시도 수와 실제 마지막 성공 상태는 별도로 검증한다. 감지한 foreign target/journal은 덮어쓰거나 지우지 않는다. localStorage의 네이티브 원자적 CAS나 모든 다중 탭 race 방지를 보장하지 않는다.

시작 dirty 181개·미추적 280개는 모두 보존 대상이다. 기준 해시 (로컬 전용 근거: `../../../output/poc-gap-implementation/k1b/before-hashes.json`)와 `before/` 복사본을 남겼다. `standalone.test.cjs`의 추가 전 사본도 같은 before 경로에 있고 SHA는 `A67E53E03096E81FA22A812D5B744D810FDA40257A6423CCCD3FF95629B0A633`다. 전체 보호 비교는 현재 원장 (로컬 전용 근거: `../../../output/poc-gap-implementation/protected-latest.json`)의 허용 delta/예상 밖 변경을 구분한다. 551개 모두 불변이라고 표현하지 않는다.

## 다음 단계

K2-B는 기간 읽기/날짜 context → 구 정렬 보존·새 저장 계약 → UI 이동/순서 연결로 세분한다. 기존 view별 배열의 모순을 임의로 합치지 않는다. 새 key가 필요하면 K1-B target/journal, 명시 handoff와 Undo를 함께 검증한 다음 연결한다. 현재 K1-B의 소유 검사·복구 gate를 제거하거나 bypass하지 않는다.

K2-C는 일반 이동 직후 결과/Undo, K3-B/C는 원문 정보 반복·용어·줄바꿈 품질을 다룬다. 실기기·보조기술은 NOT_RUN, 관찰 사용자 0명이다. commit·push·PR·Preview·Production은 모두 미실행이다.
