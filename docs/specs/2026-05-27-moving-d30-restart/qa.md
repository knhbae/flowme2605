# 이사 D-30 재시작 QA

## 필수 검사

| 검사 | 결과 | 근거 |
| --- | --- | --- |
| `npm run docs:check` | Not run | 스펙 파일 생성 후 실행한다. |
| `npm test` | Not run | 구현에서 helper/test가 추가된 뒤 필요하다. |
| `npm run build` | Not run | route/component 구현 뒤 필요하다. |
| `npm run test:e2e` | Not run | 브라우저 저니 구현 뒤 필요하다. |
| Browser review | Not run | `/restart/moving-d30` desktop/mobile state를 확인한다. |

## 검토 메모

- 제품 제약 검토: route는 export-first를 유지하고, `내 Flow로 저장`은 secondary continuation path로 둔다.
- 출처/위험 검토: 아정당 체크리스트 변환과 정부24 공식 안내는 분리되어야 한다.
- 브라우저 또는 screenshot 검토: 구현 전이라 아직 없음.
- 잔여 리스크: FullCalendar 기본 UI는 toolbar, event rendering, mobile density를 의도적으로 커스터마이즈하지 않으면 무거워 보일 수 있다.
