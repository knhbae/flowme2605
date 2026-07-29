# URL-to-FLOW v3 보고서 시각·브라우저 QA 원장

검수일: 2026-07-18  
대상: `report.html`, `previews/index.html`, `previews/case-01.html` ~ `case-12.html`

## 콘셉트 대비 구현

| 비교 지점 | 콘셉트 의도 | 실제 구현 | 판정 |
| --- | --- | --- | --- |
| 첫 화면 | SourceRow가 FLOW Item으로 바뀌는 예시를 즉시 제시 | `여권`, `데이터 유심` → `확인하기` 두 Item을 첫 화면 중앙에 배치 | 일치 |
| 정보 위계 | 검정/백색/코발트 중심의 강한 제목과 좌측 번호 레일 | 14장 모두 같은 레일, 제목, 코발트 강조 체계를 사용 | 일치 |
| 핵심 수치 | 자동 통과, Item 유지, unsupported, 품질 점수 | 실제 검증값 12/12, 15/15, 0, 4.99/5만 표시 | 일치 |
| 데이터 구조 | SourceRow → Item → Projection과 소유 주체를 분리 | 4번·6번 슬라이드에서 증거/상태/조합/출력과 LLM/compiler/human 경계를 분리 | 일치 |
| 반응형 | 데스크톱 발표 화면과 모바일 읽기 화면 모두 지원 | 1440×900에서는 1장=1뷰, 390×844에서는 세로 스크롤 카드로 전환 | 일치 |
| 내비게이션 | 발표 중 이전/다음 및 키보드 이동 | 데스크톱 버튼, `ArrowLeft`/`ArrowRight`/`Home`/`End`, 모바일 자연 스크롤 지원 | 일치 |
| 근거 범위 | 실험 결과와 다음 과제를 명확히 분리 | SourceRow→FLOW controller만 Go이며 URL fetch·extractor·실비용은 미검증이라고 첫 장과 마지막 장에 반복 표기 | 일치 |

## 의도적으로 수정한 콘셉트 오류

- 생성 콘셉트 첫 이미지의 `2024.05.01 ~ 2024.05.31`은 근거 없는 시각적 샘플이었다. 실제 보고서에는 사용하지 않았고 모든 레일을 `2026.07.18`로 통일했다.
- 콘셉트의 “실험 결과 요약”이라는 표현은 범위가 넓어 보일 수 있어 실제 첫 장에서는 “결론부터”와 controller 한정 문구를 사용했다.
- 콘셉트의 human 검토 이미지는 실제 human review로 오해될 수 있어 보고서에서는 `blind model-proxy`라고 정확히 표기했다.

## 실제 브라우저 검사

| 화면 | 검사값 | 결과 |
| --- | --- | --- |
| 보고서 데스크톱 1440×900 | 14개 slide, `scrollWidth=clientWidth=1440` | 통과 |
| 보고서 모바일 390×844 | 14개 모두 `scrollWidth=390`, 문서 가로 넘침 0 | 통과 |
| 보고서 콘솔 | error 0, warning 0 | 통과 |
| 키보드 이동 | `ArrowRight`로 2번 슬라이드 이동, `Home`으로 1번 복귀 | 통과 |
| 미리보기 인덱스 | 링크 12개: proposal 10개 + blocked 2개 | 통과 |
| 양성 미리보기 | case-01 Item 2개, blocked 0, 데스크톱/모바일 가로 넘침 0 | 통과 |
| 음성 미리보기 | case-11 Item 0, blocked 1, `missing_source_rows` 노출 | 통과 |
| 미리보기 콘솔 | error 0, warning 0 | 통과 |

## 캡처 근거

- `output/playwright/url-to-flow-v3-report/report-desktop.png`
- `output/playwright/url-to-flow-v3-report/report-slide-04.png`
- `output/playwright/url-to-flow-v3-report/report-slide-08.png`
- `output/playwright/url-to-flow-v3-report/report-slide-14.png`
- `output/playwright/url-to-flow-v3-report/report-mobile.png`
- `output/playwright/url-to-flow-v3-report/previews-index.png`
- `output/playwright/url-to-flow-v3-report/preview-case-01.png`
- `output/playwright/url-to-flow-v3-report/preview-case-01-mobile.png`
- `output/playwright/url-to-flow-v3-report/preview-case-11-blocked.png`

## 결론

읽기·반응형·내비게이션에서 중대한 불일치가 없다. 보고서는 실험 근거와 미검증 범위를 구분해 표시하며, 미리보기는 양성 proposal과 음성 차단을 같은 화면 언어로 설명한다.
