# Flow Lifecycle Classification Design

> 작성일: 2026-05-23  
> 목적: 전체 Flow를 대표 유지, 보강, 미리보기, 숨김, 삭제 후보로 분류하고 앱 내부 Lab에서 운영 판단이 보이게 만든다.

## 배경

현재 콘텐츠 정비는 두 층으로 나뉘어 있다.

| 층 | 이미 있는 산출물 | 한계 |
|---|---|---|
| Source-fit audit | 대표 후보 10개 수동 점수와 판정 | 전체 Flow 운영 상태로 바로 읽기 어렵다. |
| Content inventory | 전체 bundle을 manual/real/preview/legacy로 분류 | "유지할지, 고칠지, 숨길지, 삭제 후보인지"가 직접 드러나지 않는다. |
| Natural artifact audit | real-source 40개에 대해 자연 산출물과 UX gap 작성 | 개별 action matrix는 있으나 전체 노출/정리 bucket은 없다. |

사용자가 요청한 "필요 없는 Flow는 과감히 없애자"는 바로 route 삭제부터 하자는 뜻이 아니다. 현재 데이터 기준으로는 실제 원본 Flow 중 즉시 삭제할 근거가 있는 항목은 없다. 대신 다음 운영 상태를 분리한다.

## Lifecycle Bucket

| Bucket | 의미 | 공개/운영 처리 |
|---|---|---|
| `keep` | 원본 적합성과 실행 산출물이 충분해 대표/검색 노출 후보로 유지 | 대표 섹션과 주요 데모 후보 |
| `fix` | 원본 가치는 있으나 콘텐츠/UX/원본 정확도 보강이 필요 | route 유지, 대표 노출 전 backlog |
| `preview_only` | 채널별 확장 가능성을 보여주는 샘플 또는 카탈로그 참고용 | 채널/랩/카탈로그 맥락에서만 노출 |
| `hide` | 공개 카탈로그에서 숨겨야 하는 source-fit 판정 또는 replace/hide audit | 직접 URL만 유지하거나 숨김 처리 |
| `remove_candidate` | 원본 URL도 없는 legacy 접근 항목 | 삭제/대체 후보 목록에 올리고 실제 삭제는 별도 결정 |

## 분류 규칙

1. `ContentInventoryReview.publicHandling === hidden`이면 `hide`.
2. Natural artifact audit이 `replace_or_hide_source`이면 `hide`.
3. Manual source-fit이 `keep_representative`이면 `keep`.
4. Manual source-fit이 `reshape_before_featured` 또는 `catalog_preview_only`이면 `fix`.
   - `catalog_preview_only`는 완전 폐기가 아니라 원본 교체/구조 보강 후보로 본다.
5. Derived real-source는 `fix`.
   - 자연 산출물 audit의 `promote_to_manual_source_fit`도 아직 수동 source-fit으로 승격되기 전까지는 `fix`로 둔다.
   - 대표 후보로 올리려면 UX gap close PR과 수동 source-fit audit 승격이 필요하다.
6. Generated preview candidate는 `preview_only`.
7. Legacy accessible 중 원본 URL이 있으면 `source_status=needs_review`로 정규화하고 `fix`로 본다.
   - source metadata가 정규화됐지만 수동 audit 전이므로 삭제 후보는 아니다.
   - `source_status=real` 승격 또는 수동 source-fit audit이 필요하다.
8. Legacy accessible 중 원본 URL도 없으면 `remove_candidate`.
   - route 삭제는 하지 않는다. 기존 URL 호환은 유지하되, 새 catalog 대표 노출에서는 제외하는 후보로 본다.

## 앱 반영

### Content Lab

Content Lab의 인벤토리 섹션 아래에 "Lifecycle 분류" 카드를 추가한다.

노출 항목:

- 대표 유지
- 보강 필요
- 미리보기 전용
- 공개 숨김
- 삭제 후보
- 현재 기준에서는 real-source 즉시 삭제 없음이라는 안내

### Public Catalog

이번 작업에서는 공개 route를 삭제하지 않는다. 삭제 후보 bucket은 내부 판단과 문서 산출물로만 남긴다.

대표 노출 정책은 기존 `execution-model.ts`의 source-fit gating을 유지한다. 새 lifecycle 모듈은 정책을 설명하고 Lab/테스트에서 전수 분류를 보장하는 역할이다.

### PR History

PR마다 lifecycle 기준 변경, 실제 숨김/삭제 여부, 남은 보강 bucket을 기록한다.

## 산출물

1. `lib/flow/content-lifecycle.ts`
2. `lib/flow/content-lifecycle.test.ts`
3. Content Lab lifecycle summary UI
4. Content audit 문서: bucket 정의, 전체 count, 대표 slug 예시, 삭제 보류 근거
5. PR history 문서

## 테스트 기준

1. 모든 seed bundle이 정확히 하나의 lifecycle bucket을 가진다.
2. lifecycle bucket count 합계는 seed bundle 수와 같다.
3. 대표 수동 audit Flow는 `keep`이다.
4. source/title mismatch가 있는 대표 후보는 `fix`다.
5. generated preview는 `preview_only`다.
6. source URL이 있는 legacy accessible은 `source_status=needs_review` 정규화 후 `fix`다.
7. source URL도 없는 legacy accessible만 `remove_candidate`다.
8. 현재 real-source audit에는 `hide`가 없음을 테스트로 확인한다.
9. Content Lab summary가 lifecycle count를 반환한다.

## 비목표

- 이번 작업에서 대량 route 삭제를 실행하지 않는다.
- generated preview 440개를 모두 실제 원본 검토 완료 Flow로 승격하지 않는다.
- 검색 알고리즘, DB, 로그인, 사용자 행동 데이터 수집을 추가하지 않는다.
- individual Flow content rewrite는 lifecycle 이후 별도 backlog로 진행한다.
