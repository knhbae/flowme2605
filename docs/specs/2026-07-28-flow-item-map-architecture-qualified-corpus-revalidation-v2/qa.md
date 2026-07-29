# QA

## 자동 데이터 검증

검증기는 다음 교차 파일 조건을 확인한다.

- 필수 산출물 존재 및 JSON parse
- source hash와 byte size 일치
- 정상 corpus Bundle ID가 Qualified v2 handoff 8개와 정확히 일치
- Bundle 8 / Flow 21 / Step 49 / Item 160 / SourceRow 210
- scheduled 112 / unscheduled 48
- 모든 Item ID와 SourceRow ID의 유일성
- 모든 Item의 `sourceRowIds`가 실제 SourceRow를 참조
- Public Go 1 / Modify 6 / Hold 1
- 생활코딩 WEB1이 Public Go
- 트리플·핏펫이 정상 corpus에 없고 boundary에 존재
- 세 아키텍처가 같은 Item/SourceRow 의미 fingerprint 사용
- 새 scorecard가 v1 총점을 복사하지 않고 계산식·dimension 근거를 보유
- projection matrix가 Item 160개를 모두 포함
- 일정 없는 VEVENT 0
- VEVENT/VTODO 중첩 0
- 발명된 행동·날짜·반복·완료 기준 0
- provenance 누락 0
- 날짜 없는 48개가 비Calendar projection을 보유
- VTODO fallback 명시
- Flow·Step·Map 의미 보존이 ICS에 의존하지 않음
- Vertical 기회가 정상 corpus 수치에 포함되지 않음
- taxonomy alias mapping 존재
- 외부 Calendar 왕복과 실제 사용자 검증이 `NOT_RUN`

## 문서 검증

- spec/plan/tasks/qa와 모든 필수 JSON/schema/validator/test 존재
- 새 v2 HTML이 JSON 파생 수치를 표시
- 첫 화면에 생활코딩 WEB1, 이사 D-30, 반찬 또는 AND 영상 사례 표시
- Architecture/Logic/Public/Rights 상태를 분리 표시
- v1 baseline과 v2 delta, 경계 사례, Vertical appendix 표시
- VEVENT 설명서의 영향 범위와 비영향 범위 표시
- 자동 QA를 실제 사용자 검증으로 표현하지 않음

## 브라우저 검증

Playwright로 로컬 HTML을 다음 viewport에서 확인한다.

- Desktop: 1440×900
- Mobile: 390×844

확인 항목:

- 문서 제목과 첫 화면 핵심 사례 가시성
- 메뉴/필터 상호작용
- `document.documentElement.scrollWidth <= window.innerWidth`
- 깨진 이미지 0
- console error 0
- 긴 표·코드·URL이 모바일 폭을 넘지 않음

스크린샷은 `output/playwright/`에 저장하고 자동 렌더링 결과를 실제 사용자
검증이라고 부르지 않는다.

## 수동 경계 판정

- v1은 historical architecture baseline으로 보존
- Qualified v2는 최신 정상 corpus의 유일한 입력
- VTODO/RELATED-TO client 호환은 검증 완료로 표현하지 않음
- Public readiness와 personal conversion availability를 혼합하지 않음
- app runtime/DB/seed/API가 변경되지 않았음을 scoped diff로 확인
- commit/push/PR/merge/deploy가 없음을 확인

## 실행 결과 — 2026-07-28

| 검증 | 결과 | 근거 |
|---|---:|---|
| corpus 재생성 | PASS | 8 Bundle / 21 Flow / 49 Step / 160 Item / 210 SourceRow / 일정 112 / 날짜 없음 48 |
| architecture·projection 재생성 | PASS | Current 95 / Literal ICS-first 46 / Item-first SharedContext 89 |
| schema·교차 파일 validator | PASS | 202/202, 실패 0 |
| validator 음성 테스트 | PASS | 10/10 |
| JavaScript syntax | PASS | generator 3개, validator, test 모두 `node --check` 통과 |
| docs 검사 | PASS | 필수 문서 14개, 로컬 링크 2,548개 |
| whitespace diff | PASS | `git diff --check` |
| Desktop browser | PASS | 1440×900, document scrollWidth 1440, 깨진 이미지 0, console error/warning 0 |
| Mobile browser | PASS | 390×844, document scrollWidth 390, 깨진 이미지 0, console error/warning 0 |
| 필터 상호작용 | PASS | `날짜 없음` 선택 시 WEB1·신차 구매·여름 반찬·AND 영상 4개만 표시 |
| 외부 Calendar client 왕복 | NOT RUN | Google·Outlook·Apple의 VTODO·RELATED-TO 보존을 실제 확인하지 않음 |
| 실제 사용자 검증 | NOT RUN | 자동·에이전트·브라우저 QA만 수행 |
| publish | NOT RUN | commit / push / PR / merge / deploy 미수행 |

모바일 필터 바는 의도적으로 내부 가로 스크롤을 허용하지만 문서 자체의
가로 overflow는 0이다. 브라우저 증거는 다음 파일에 보존했다.

- `output/playwright/flow-architecture-v2-desktop-1440x900.png`
- `output/playwright/flow-architecture-v2-mobile-390x844.png`

Scoped closeout은 이번 spec 폴더, 새 v2 보고서, historical v1 안내,
iCalendar 설명서만 대상으로 수행했다. 전체 worktree의 다른 untracked
경로는 사용자·동시 작업 범위로 보존했고 app runtime, DB, seed,
production API는 변경하지 않았다.

## 확장형 설명 보고서 추가 QA — 2026-07-28

사용자 피드백에 따라 같은 frozen corpus와 판정을 유지하면서 설명 단위를
다시 나눴다.

- 8개 정상 콘텐츠를 각각 `원문 → SourceRow`, `canonical 계층`,
  `목적지 projection`의 3장으로 분리
- 27개 자격 판정 대상을 lifeArea별 9장으로 분리
- 본편은 사례당 SourceRow·Item 대표 3개만 표시
- 160 Item·210 SourceRow 전체는 필터 가능한 appendix에 보존
- Historical boundary 2개와 미래 field contract 8개는 정상 변환 수치와
  분리 표시

| 검증 | 결과 | 근거 |
|---|---:|---|
| 생성된 설명 슬라이드 | PASS | 55개 |
| 완전 변환 콘텐츠 | PASS | 8개 모두 3장씩 표시 |
| 더 넓은 coverage | PASS | 정상 8 + boundary 2 + 자격 판정 지도 27 + 미래 계약 8 |
| 증거 수준 혼합 방지 | PASS | 27개·미래 8개를 변환 완료 Flow로 세지 않음 |
| Desktop browser | PASS | 1440×900, 문서 가로 overflow 0, 최대 section 높이 1,059px |
| Mobile browser | PASS | 390×844, 문서 가로 overflow 0, navigation rail scrollbar 숨김 |
| 이미지·console | PASS | 깨진 이미지 0, error/warning 0 |
| appendix 필터 | PASS | 날짜 없음 4개, Public Hold 1개가 정확히 표시 |
| 자동 validator | PASS | 202/202 |
| validator test | PASS | 10/10 |
| 외부 Calendar client 왕복 | NOT RUN | 기존 증거 경계를 유지 |
| 실제 사용자 검증 | NOT RUN | 이번 작업은 자동·에이전트·브라우저 QA |

확장형 브라우저 증거:

- `output/playwright/flow-architecture-v2-expanded-desktop-1440x900.png`
- `output/playwright/flow-architecture-v2-expanded-web1-items-1440x900.png`
- `output/playwright/flow-architecture-v2-expanded-mobile-390x844.png`
