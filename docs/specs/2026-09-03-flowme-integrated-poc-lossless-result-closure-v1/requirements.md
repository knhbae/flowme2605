# P2-A 요구와 합격 기준

| ID | 원 요구 | 이번 합격 기준 | 상태 |
| --- | --- | --- | --- |
| P2A-TRACE-01 | 168개 현재 판정 | v4.1 `60/78`, D1 `24/26`, D2 `35/64`의 독립 감사 기준을 정본에 반영하고 기능 조각과 부모 판정을 분리한다. | 충족 |
| P2A-COPY-01 | D1-020 복수 사본 구분 | 동일 source의 활성 사본만 결정적인 ordinal label을 공유하고 single copy는 원제목을 유지한다. | 충족 |
| P2A-CALENDAR-01 | D2-017 월간 projection | effective execution date 기반 42칸 월간 결과와 날짜 미정 목록을 같은 Item ref로 만든다. | 충족 |
| P2A-TXT-01 | D2-020 TXT 배포본 | WorkingSource와 분리된 TXT를 deterministic filename으로 다운로드하며 storage write 0이다. | 충족 |
| P2A-CSV-01 | D2-020 표 배포본 | UTF-8 BOM·CRLF·escaping이 고정된 CSV를 다운로드하며 기존 export writer를 호출하지 않는다. | 충족 |
| P2A-CORPUS-01 | D2-023 31개 사례 | 정본 source shape를 가진 31개 fixture가 raw byte round trip과 expected structured/fallback을 통과한다. | 충족 |
| P2A-TABLE-01 | D2-024 표 문법 | Markdown table·CSV·TSV의 안전 행만 구조화하고 모호한 입력은 raw fallback한다. | 충족 |
| P2A-LONG-01 | D2-025 장문 무손실 | blockquote·code·HTML/comment·빈 줄·CRLF/LF를 손실 없이 보존한다. | 충족 |
| P2A-PARITY-01 | 두 surface parity | copy label, month manifest, TXT/CSV bytes와 outcome 의미가 React·단일 HTML에서 일치한다. | 충족 |
| P2A-SAFE-01 | 운영 데이터 불변 | prefix 밖 set/remove/clear 0, 운영 sentinel byte 차이 0, source mutation 0이다. | 충족 |

## 부모 요구 판정 원칙

- 기능 조각이 통과해도 원 요구에 실제 기기, 운영 writer, owner 결정이 함께 있으면 전체 충족으로 올리지 않는다.
- 테스트 존재가 아니라 모델 결과와 브라우저 조작 근거를 함께 본다.
- 표를 구조화하지 못해도 exact raw를 보존하고 이유를 제공하면 무손실 계약은 통과할 수 있다.
- 자동화·캡처는 실제 기기 또는 관찰 사용자 근거가 아니다.
