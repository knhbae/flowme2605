# 모바일 쓰기 r2/r8 선별 통합

2026-10-11 사용자 승인: 현재 Alpha 2c792086 기준의 제목·날짜 배치, 저장 안내 밀림, 편집 위치 유지만 통합한다. 정상 commit/push·새 CI·Alpha 적용을 포함한다. 데이터와 기존 복구 경로는 보존한다.

## 기준과 범위

- 현재 제공 기준: 2c792086e46bcfccb38bfc55fde704d80e5a0d87 / QGrlvltg2fuC33JnWUK8V.
- DEV2 r2/r8은 b785d088 기준 미커밋 자료다. 지정 runtime 8파일은 Alpha 기준과 동일한 committed source에서 출발했다.
- 모바일 제목은 전체 폭, 글 찾기는 동일 guarded 동작을 사용한다. 읽기 날짜 버튼은 같은 항목 안에 배치한다.
- 저장/보관/오류 표시가 본문을 밀지 않도록 기존 상태와 복구 행동을 일정한 상태행·펼침 영역으로 배치한다.
- 읽기 버튼은 같은 행에서 스크롤한다. native textarea·mirror 60px 여백·26px ruler·caret/선택/IME/Undo 경로는 유지한다.
- 행 버튼이 원문 선택에 포함되지 않도록 기존 선택 끝을 매핑하는 호환 보완만 포함한다.

관리 메뉴로 서버 Undo를 옮기는 변경, 완료 취소선 제거, 폴더 표시 감산, 다른 TXT 성능 후보, 데이터·저장 모델·출처 정책 변경은 제외한다. Undo의 상단 노출과 동작을 유지한 상태행 내부 배치 보정만 포함한다. 기존 Alpha/DEV2 checkout과 개인 문서는 보존한다.

## 단계와 완료 기준

1. 별도 clean candidate에 최소 delta 적용, 독립 scope review.
2. 관련 계약/회귀·타입·build, 390px/desktop 합성 CAS 화면 및 저장 성공/거절/재시도와 입력 위치 확인. 과거 375/212 결과와 분리한다.
3. 공개 generic code/tests/docs만 정상 게시, 정확 새 HEAD의 기존 CI lane 성공 확인. merge/force push/skip 없음.
4. 현재2c를 rollback으로 fresh source/build/Task/native/ownership guards를 연결하고 승인된 기존 경로로 Alpha 전환·복귀·최종 제공 확인.
5. 정상 지원 브라우저에서 제공판과 기존 시험문서의 관계·내용 보존을 확인한다. 실물폰/OS IME/처음 사용자 이해도는 실제 실행 없으면 미검증으로 남긴다.

300초 permit·65초 quiet·nonce/lock·generation/held handle·지원 포트 보호를 유지한다. 심사 거절은 우회하지 않으며, 실패 시 기존서비스 복구를 우선한다.
