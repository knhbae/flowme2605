# 이사 D-30 재시작 계획

## 파일

| 파일 | 책임 |
| --- | --- |
| `package.json` | FullCalendar dependency가 없으면 추가한다. |
| `app/restart/moving-d30/page.tsx` | 실험 route entry와 metadata를 둔다. |
| `components/flow/MovingD30Restart.tsx` | setup, calendar, edit, export/save, auth gate, source surface를 담당한다. |
| `lib/flow/moving-d30-restart.ts` | seed item 정의, offset 계산, edit-state helper, export mapping을 담당한다. |
| `lib/flow/moving-d30-restart.test.ts` | 날짜 생성, 수정, 삭제, 추가, export-state mapping 단위 테스트를 담당한다. |
| `tests/e2e/flow-mvp.spec.ts` | setup, export 전 edit, save gate, source separation 브라우저 테스트를 담당한다. |
| `docs/specs/2026-05-27-moving-d30-restart/qa.md` | 구현 후 검증 evidence를 기록한다. |

## 순서

1. D-day item 생성과 edit-state mapping helper를 만든다.
2. move-date offset과 edited export state 단위 테스트를 추가한다.
3. `/restart/moving-d30` route와 component shell을 추가한다.
4. 생성된 event state를 FullCalendar month view에 연결한다.
5. 항목 편집을 추가한다: 날짜 이동, 제목/날짜/메모 수정, 추가, 삭제.
6. 편집된 event state 기준 export/save 표면을 추가한다.
7. repo의 기존 local/auth pattern에 맞춰 로그인/비로그인 저장 분기를 추가한다.
8. 아정당과 정부24 출처 분리 UI를 추가한다.
9. primary user journey E2E를 추가한다.
10. docs, unit, build, E2E, browser check를 실행한다.

## 리스크 관리

- 기존 route 동작을 건드리지 않도록 실험은 `/restart/moving-d30` 아래에 둔다.
- 구현상 명시적으로 필요하다고 확인되기 전에는 현재 사용자 변경이 있는 `app/globals.css`, `components/flow/AppClient.tsx`를 수정하지 않는다.
- 저장 동작은 repo에 이미 있는 local/auth model 범위에서 처리한다. 이번 pass에서 새 DB나 full account system을 도입하지 않는다.
- `캘린더에 넣기`를 primary path로 유지해서 native FlowMe save가 export-first 검증을 밀어내지 않게 한다.
- 정부24 정보를 법적 확정 조언이나 행정 절차 상세 가이드처럼 표현하지 않는다.
