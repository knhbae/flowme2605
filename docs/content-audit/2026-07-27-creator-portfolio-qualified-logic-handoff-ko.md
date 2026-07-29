# 제작자 포트폴리오 Qualified v2 · 로직 세션 Handoff

Date: 2026-07-27

## 목적

기존 27명 제작자 조사를 그대로 앱에 넣지 않고, 주체·증거·권리 상태를 정규화한 뒤 source row가 준비된 대표 8개만 canonical dry-run 대상으로 넘긴다.

## 읽기 순서

1. `docs/content-audit/2026-07-27-creator-portfolio-qualified-v2.json`
2. `docs/content-audit/2026-07-27-creator-portfolio-qualified-review-ko.html`
3. `docs/content-audit/2026-07-27-creator-portfolio-qualified-assets/targeted-revalidation-v2.json`
4. `docs/specs/2026-07-11-canonical-flow-data-model/spec.md`
5. `docs/flow-rules/source-to-flow-conversion-gate.md`

## 로직 이관 8개

1. **이사 D-30 체크리스트** · 아정당 · full_flow · 입력 1개 · 공개 Modify
2. **초기 이유식 D+174~209 식단** · 뿐이토핑이유식 · full_flow · 입력 2개 · 공개 Hold
3. **오픽 모의고사 계획표** · 오픽만수르 · full_flow · 입력 2개 · 공개 Modify
4. **생활코딩 WEB1 진도표** · 생활코딩 · full_flow · 입력 0개 · 공개 Go
5. **신차 구매 8단계** · 겟차 · full_flow · 입력 1개 · 공개 Modify
6. **Allblanc 7일 복근 챌린지** · Allblanc TV · full_flow · 입력 2개 · 공개 Modify
7. **이번 주 여름 반찬 5가지** · 우리의식탁 · quick_flow_collection · 입력 0개 · 공개 Modify
8. **AND 취업 준비 영상 3편** · AND Studio · quick_flow_collection · 입력 0개 · 공개 Modify

## 데이터 사용 경계

- `userContentBundles`: 사용자에게 보여줄 Flow 콘텐츠다. 내부 점수와 권리 검토 문구를 섞지 않는다.
- `representativeSourceRows`: Item provenance의 기준이다.
- `entityRecords`: provider, creator, channel을 분리한 내부 귀속 데이터다.
- `evidenceRecords`: 사용자 반응, 자료 요청, 실행 결과, 제작자 응답을 분리한 내부 증거다.
- `rightsRecords`: 공개 가능 범위다. `public_conversion_allowed`는 생활코딩 WEB1의 명시적 정책에만 적용한다.
- `qualificationRecords`: 조사·로직·공개 판정을 분리한 내부 검토 데이터다.

## Canonical dry-run 순서

1. 각 Bundle에서 primary source 하나와 natural artifact 하나를 고정한다.
2. SourceRow → Item → Step → Flow → Bundle 연결을 보존한다.
3. Item은 독립 체크 가치가 있는 source row만 유지한다.
4. 날짜가 없는 후보에는 날짜를 만들지 않는다.
5. 입력은 기존 0~2개보다 늘리지 않는다.
6. link_metadata_only 후보는 영상·레시피 내부 내용을 새 Item으로 확장하지 않는다.
7. permission_required 또는 private_conversion_only 후보는 공개 seed가 아니라 내부 fixture로만 사용한다.
8. projection은 calendar/checklist/sheet/memo 결과를 같은 canonical Item에서 만든다.

## 공개 판정

- **Go**: 생활코딩 WEB1. 해당 코스의 공개 수정·배포 정책을 직접 확인했다.
- **Modify**: 구조는 준비됐지만 권리자 확인 또는 제목·URL만 남기는 범위 축소가 필요하다.
- **Hold**: 개인 변환 전용이거나 source row·최신성·민감도 조건이 충족되지 않았다.

## 하지 말 것

- 앱 코드나 seed에 바로 넣지 않는다.
- 기존의 단일 권리 준비 boolean을 공개 허가로 해석하지 않는다.
- 플랫폼 수요를 개별 제작자 수요로 복사하지 않는다.
- 댓글 수를 제작자 응답 증거로 사용하지 않는다.
- 원문에 없는 행동·날짜·반복·완료 기준을 추가하지 않는다.
- 유료 파일, 비밀번호 파일, 영상 자막, 레시피 전문을 복제하지 않는다.

## 로직 세션 완료 보고

- 8개별 canonical pass / revise / hold
- Item 유지·묶음·삭제 수
- 필요한 타입·projection 변경
- 공개 가능 범위와 내부 fixture 범위
- 앱 구현 세션으로 넘길 최종 후보
