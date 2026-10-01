# 요구별 결과와 잔여

## 현재 판본과 결론

기준08aa8311의 별도 branch `agent/flow-folder-content-ux-20261001`에서 폴더 입력·콘텐츠 진입 후보를 구현했다. 제품639source 동결 hash는 `b9555ea7b3d17eb9b6d51e28ba16329e15b6a2d1a297eebaf3796a79b83a342b`다. 현재 개발계3105는 그대로이며 후보 교체·게시를 하지 않았다.

최신 #20의 ‘기존 이름도 인식하지 못하는 것 같다’는 발언은 실제 사용자 환경이 미확인이다. 컴포넌트의 편집 전 재현에서는 기존 이름 타이핑/붙여넣기 제안이 있었고, 없는 이름의 제안 부재를 확인했다. 기존 전체 기능을 새로 구현했다고 쓰지 않는다.

최종 전체 통합267파일·2,772/2,772와 npm2,258/2,258, 타입564entry진단0·production build·보안취약점0을 확인했다. 앱45+관련기존5=50/50, 독립 HTML25/25·독립 모델9/9다. 중복 표적59/89와 반복 실행은 총 제품 충족률로 합산하지 않는다. 첫 전체99FAIL·환경 보완·최종 고정 source 검증은 [QA](qa.md)에 분리한다.

## 원래 요구에 연결한 판정

| 요구 / 기존 연결 | 이번 적용·검증 | 판정의 한계 |
| --- | --- | --- |
| 개발2 J01/J02: 자유 문서·동일 원문 | 목록 메모가 자동 폴더가 되지 않음. 선택한 줄ID/전체 원문 보존 후 명시 연결. | 자식 없는 미연결 목록 메모에 한정. 모든 문장·목록 구조화 아님. |
| v4.1 J07: 보관 위치와 항목 소유 | 경로·ID와 기존 Item/기록 경계 유지. 생성 위치 표시. | **부분 연결.** 보관 위치와 Item 소유 구별 자체의 새 end-to-end 검증 아님. 기존 대조 원장은 유지. |
| 개발1/개발2 J11: 입력·복구 | 입력/연결 합성 거절 → 입력 보존 → 직접 재저장 → 같은 줄 연결 → 서버 Undo/reload. | limit1종. 실제 서버·lost receipt·외부 CAS·모든 복구 상황 전체가 이번45개에 포함되지는 않음. 순수/기존 회귀 근거와 구분. |
| 개발1 J12: 공개 탐색·선택 재사용 | 공개 글 유무와 무관한 Flow 찾기 진입, 검색·선택한 판본 읽기·TXT 출력 복귀·개인 사본 저장. | 합성 공개Flow1개/판본1개, 실제 외부 도구import·실제공개전수 품질은 아님. |
| 개발2 J13: 제작 원문→개인 실행 인계 | Flow 찾기에서 제작 진입, 비공개 초안 생성·원문 편집·명시 저장·복귀/reload. | **부분.** 명시적 개인 실행 인계는 이번 새 브라우저 미검사. 전체 J13 충족 처리하지 않음. |
| 후속 J14: 선택적 커뮤니티 | 경험·질문·지식 경로 보존, 공개글이 있어도 동일 첫 진입, 공개 hash 불변. | 기여·공개 정책의 새 구현/전수검증 아님. 개인 실행 기록 자동공개 없음. |

원래 ID/대체 관계는 [J01~J14 연결](../2026-10-01-alpha-ux-journey/requirements.md)과 그 문서가 연결한 v4.1·개발1·개발2 원장을 사용한다. 254요구/424하위조건의 집계나 전체 제품 완성률로 바꾸지 않는다.

## UI의 유지·변경 비교

1. 기존 3목적·선택적 커뮤니티를 유지하고 둘러보기의 처음 화면만 고정했다. savedBindings 상태의 네 번째legacy버튼은 유지했다.
2. 검색 앞의 반복 설명을 덜고 `Flow 찾기` 제목과 작은 `Flow 만들기`를 배치했다. 새 자동 제작 CTA나 가입 모드를 만들지 않았다.
3. 기존 UI 토큰·CSS·반응형 breakpoint를 변경하지 않았다. five-width DOM에서 overflow0, 모든 실제 클릭은 스크롤 뒤 전체 rectangle/중앙 hit를 검사했다. 보이지 않은 상태를 성공으로 강제 클릭하지 않았다.
4. 목록·오류·상세의 복귀 대상을 Flow 목록으로 구체화했다. 판본·검색의 기존 복원 상태를 사용한다.
5. 폴더 이름의 원문·경로·취소를 유지하고 생성 가능성·위치를 표시했다. long 안내·새 전환 문법·폴더 정책을 추가하지 않았다.
6. 알파의 공개 목록 안내를 계정 owner에 맞췄다. 기존 로컬 PoC의 기본 문구와 caller 계약은 유지했다.

앱 성공 스크린샷110장·DOM/typography110개는 존재와 계측을 전수 확인했다. 주 에이전트는390탐색·375생성패널·844×390제작·1024출력복귀·1440동명제안의5장을 시각 확인했다. 모든110장의 육안 검토나 픽셀별 before/after 비교를 수행했다고 주장하지 않는다. Creator의 합성 catalog-unavailable 안내는 frozen private 콘텐츠 팩을 일부러 사용하지 않은 조건이며 실서비스 장애로 판정하지 않는다.

## 조작 가능한 HTML

[파일 조작본](../../content-audit/2026-10-01-flowme-folder-content-entry-prototype-ko.html)은 독립 합성 모델이다. 기존/새 폴더·닫기·Escape·생성·Undo·reload·찾기/읽기/개인 사본·비공개 초안을 직접 조작한다. 전용 단일PoC키 외 쓰기는 차단 검사했다. 독립 검토에서 실패 입력의 화면 간 유실 위험을 찾아 pending buffer·제안 숨김·직접 재저장을 보완했고 HTML5가 확인했다.

HTML 검사는 정상 loopback HTTP render 경로에서 실시했다. `file://`에서 모든 브라우저가 같은 저장·다운로드를 허용한다고 검증한 것은 아니다. 파일은 외부asset/network 없이 열리며 앱 계정/서버에 연결하지 않는다. 파일을 브라우저 미리보기에서 열고 스크립트가 실행되지 않는 경우 실제 브라우저로 열어야 한다.

## 남은 작업 / 결정

- 이번 후보의 변경 소유/보안·출처 검사·기존 PR와 중복 비교·CI·승인된 개발계 반영은 후속 게시 목표다. 이번 commit/push/PR/merge/개발계 교체0.
- #20 실제환경 URL·보기·필터·갱신 상태가 없으므로 사용자 원인 확정0. 현재는 관찰 사용자 시험을 추가하지 않는다.
- 전체 목록/하위항목의 폴더 전환, 부분 구조 권한, 실제 OS IME·AT·Android/iOS는 보류.
- 원래 F5~F10: 대용량 백업 재활성·복합 일정·Flow/Map 전수 충실도·공개 제안 부분채택·공개 운영 정책을 완료로 바꾸지 않는다.
- J13 실제 개인 실행 인계, real BFF/Auth/RLS·실공개catalog 및 외부도구import는 이번 새브라우저 범위밖. 신규기능이 없다는 뜻도 아니며 별도 근거를 가진 기존 구현과 구분한다.
- 장시간 탭·자동 시작·초기 복구 저장 Undo 후속은 유지한다. 이번 UX 후보의 선행 대용량 검증으로 붙이지 않는다.

## 변경한 파일

- 제품·단위 회귀: `lib/flow/integrated-poc/folder-link-suggestions.ts`와 `.test.ts`, `components/flow/integrated-poc/ProgramTextEditor.tsx`와 `.test.tsx`, `AlphaWorkspace.tsx`와 `.test.tsx`, `ProgramDiscovery.tsx`와 `.test.tsx`.
- 브라우저: `tests/e2e/folder-content-entry.browser.ts`, `.config.ts`, `.fixture.ts`; `folder-content-artifact.browser.ts`, `.config.ts`. 기존 `folder-writing.browser.ts`는 region 기대 문구1곳만 맞췄다.
- 독립 파일·검사 도구: `docs/content-audit/2026-10-01-flowme-folder-content-entry-prototype-ko.html`, `2026-10-01-flowme-folder-content-entry-report-ko.html`; `scripts/personal-workspace-poc/folder-content-artifact.test.mjs`, `folder-content-qa.mjs`.
- 추적 문서: 이 spec 디렉터리의 `spec.md`, `plan.md`, `contracts.md`, `qa.md`, `results.md`와 현재 작업본 `docs/STATUS.md`의 새 마감 항목. 과거 판정·원본 피드백 문서는 수정하지 않는다.

parser·writer·schema·CSS·DB migration·운영 설정·원본 카탈로그·다른 작업본 파일은 변경하지 않았다. 원본 실행 증거는 이 작업본 `output/`에 로컬 보존하며 게시한 것으로 표시하지 않는다.

## 도구·스킬의 기여

- `flow-session-start`: 깨끗한 별도 작업본과 현재 개발계 판본/운영 경계를 분리했다.
- `flow-ux-review`와 UX2: 폴더 생성 가능성·위치·직접 제작 진입의 선택을 검토했고 검색 앞 중복 설명을 감산했다. 사용자가 이미 쓰는 코드/토큰을 사용해 새 디자인 시스템·Figma 작업은 하지 않았다.
- 기존 모델·컴포넌트 harness와 Playwright: 같은ID·명령수·저장 namespace·공개 hash·five-width 조작을 측정했다. 실제 기기·OS IME·BFF/RLS 검증으로 확대하지 않는다.
- `flow-report-artifact`/`frontend-app-builder`: 조작 파일과 요구별 보고서를 분리했다. IAB와 Chrome을 통해 실제 DOM/화면을 점검했으며 파일 protocol 자체는 별도 한계로 기록했다. 기존 design token을 활용한 작은 기능 수정으로 ImageGen은 사용하지 않았다.
- Supabase skill: [공식 변경 기록](https://supabase.com/changelog)과 [API key 안내](https://supabase.com/docs/guides/getting-started/api-keys)를 읽었다. provider 구현/설정을 바꾸지 않았고 실제 secret을 가져오지 않았다. 합성 public configuration·네트워크 차단으로 검사했으므로 실DB/Auth 검증 근거가 아니다.
- `flow-work-closeout`: 실수/초기 실패와 최종 PASS, 로컬 후보와 게시·개발계·관찰 상태를 구분해서 남긴다.
