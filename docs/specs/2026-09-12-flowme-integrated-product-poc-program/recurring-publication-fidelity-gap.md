# 반복 작성물의 선택 공개 — 새로 확인한 미충족

2026-09-14 · 상태: **미충족, 초안·미리보기 UI까지 연결**. P06/P07·S07/S10의 기존 제작 구조 보존 요구다. 새 커뮤니티 정책이나 실제 외부 게시 승인이 아니다.

현재 [초안 연결 결과](recurring-publication-draft-review.md)는 같은9메모를 명시 확인으로2반복/1보존메모로 정리하고 입력·실패·재시도·reload를18확인했다. 공개 store는 아직 기존3종이며 C/D/E의 공개 이후 연결이 남는다. 아래 task0/note9는 변경 전의 실제 발견 기록이다.

## 현재 진행 — 원본 읽기와 사용자 기능을 구분

[계약·연결 설계](recurring-publication-design.md)의 A 단계에 `public-recurrence-contract`와 `publication-series-source`를 추가했다. 일/주/월·유한/무기한을 기존 D2 계산기로 읽고 raw/native 두 제작 원본의 활성 반복 항목을 stable tuple로 식별한다. 개인 실행 override/완료·resolved anchor는 후보에 포함하지 않는다. 검증된 metadata 행만 중복 제거 대상으로 반환한다.

새35개를 포함한 관련66개 테스트가 통과했다. 여섯 틀×두 제작 origin의 읽기 모델을 대조한 것이며 모든 틀의 작성·공개 UI 전체 동등성을 뜻하지 않는다. 같은 보존 자료5대조 (로컬 전용 근거: `../../../output/integrated-product-poc/publication-series-record-review-2026-09-13T15-14-00-717Z.json`)에서도 실제2개/각8회·총16회차를 읽었다. 기존9메모 중8개가 정확한 source metadata에 속하고 나머지1개는 자동 삭제하지 않는다. 원문·공개 판본·개인 기록·저장된 공개 초안은 불변이다. 이 대조는 새 브라우저 실행이 아니다.

**`ProgramPublisher`와 store·개인 사본·출력 consumer는 아직 연결 전이다. 따라서 앱의 반복 선택 공개는 여전히 미충족이다.** 기존 공개 초안을 자동 변환하거나 버리지 않았으며, consumer 연결 전에는 새 반복 schedule payload를 저장 validator가 계속 거절한다. 다음 실행은 B~D 연결과 E의 같은 자료 연속 검증이다.

최종 전체140파일1,272/1,272 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T15-11-49-806Z.json`)·skip0·검사 중 소스 변경0, strict320/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T15-11-49-469Z.json`)을 확인했다. 새35개는 이 전체 수에 포함되며 별도로 더하지 않는다.

## 확인한 차이

기존 제작 폼에서 만든 `겨울 주간 운동 · 조건 입력 검증`은 실제 typed source의 반복 항목2개와 개인 실행16회차를 갖는다. 개인 문서 ID는 `doc-46993038-e527-4c61-844d-8e08d7d4fd9c`다. 이전 [조건별 폼·개인 실행](creator-structure-conditions-review.md)은 해당 범위의 성공으로 유지한다.

현재 화면29확인 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/compact-recovery-resume-2026-09-13T14-34-16-933Z.json`)에서 이 문서의 선택 공개를 실제 열었다. 저장된 공개 초안은 **task0개·note9개**로, 반복 규칙·요일·횟수가 메모 선택으로 나뉜다. 캡처 (로컬 전용 근거: `../../../output/playwright/integrated-program/compact-publisher-375-1789310062263.png`)와 현재 소스/원래 owner 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/recovery-map-crosscheck-2026-09-13T14-43-10-965Z.json`)가 일치한다.

- [createProgramPublicationDraft](../../../components/flow/integrated-poc/ProgramPublisher.tsx)는 개인 텍스트의 task/note만 읽고 기존 typed series owner를 공개 후보로 읽지 않는다.
- [PublicSchedule](../../../lib/flow/integrated-poc/contract.ts)은 `undated / fixed / relative`만 표현한다. 반복 규칙을 구조화해 유지할 수 없다.
- 따라서 반복 설정을 메모로 공개하거나 회차를 일회성 날짜 목록으로 펴는 것은 기존 반복 제작 기능의 동등한 통합이 아니다. 이번에는 선택·공개하지 않았으며 개인 source/기록·기존 공개 판본은 변하지 않았다.

일반 여행1항목의 선택 공개 성공을 반복 작성물의 공개까지 충족한 것으로 확대하지 않는다. 이 발견은 테스트 실패를 숨기기 위한 범위 축소가 아니라 다른 구조의 실제 평가에서 확인한 잔여 요구다.

## 다음 실행 묶음

1. **기획·UX/재사용 대조:** 기존 D2 반복 정의와 일반 항목, 개인 계획/회차/진행을 구별한다. 원래 반복 항목 단위로 선택하고 공개될 규칙·범위를 미리 보여 주는 접점을 정한다. 개인 실행 날짜·진행·기록은 자동 포함하지 않는다.
2. **개발 설계:** 기존 제작 typed owner와 expander를 재사용하는 버전 있는 PoC 공개 계약을 설계한다. 검증·선택 초안·불변 판본·개인 사본·출력·원본 비교의 모든 reader/writer 영향을 조사한다. 기존3종 일정 payload는 자동 migration/쓰기 없이 읽고 미지원·손상은 fail-closed한다.
3. **구현:** 반복 항목이9개 메모로 대체되지 않도록 후보 읽기→명시 선택→미리보기→로컬 판본→재사용/출력을 연결한다. 새 운영 schema·writer·실계정/외부 게시 기능은 추가하지 않는다.
4. **검증:** 같은 보존 자료에서2개 중1개 선택, 개인16회차와 기록 불변, 새 공개 원본의 반복 의미 보존, 사본의 별도 개인 계획, 실제 파일 결과, 실패/취소/중복/Undo/reload를 검사한다. 다른 반복 구조와 기존 일반 여행을 회귀한다.
5. **전체 종결 연결:** S07/S10의 해당 부분만 갱신하고 여섯 작성 틀 전체·Map 실제 삭제/다른 반복·S01~S10 최신판/두 전체 개선 루프는 계속 유지한다.

재공개·전체 백업·기록 초기화·새 실행 정책을 이 구현으로 확정하지 않는다. 설계에서 정말 새로운 정책이 필요해지면 해당 결정만 별도로 요청하고 독립 작업은 계속한다.
