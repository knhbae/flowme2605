// FlowMe — written UX analysis
// Surfaces the reasoning *before* the screens, so the user can audit the
// thinking. Lives as the first artboard in the canvas.

function AnalysisDoc() {
  const rows = [
    {
      h: '1. 현재 화면의 가장 큰 UX 문제',
      b: [
        '플로우를 열었을 때 “이게 무엇이 되는지”가 한 화면에 안 들어옴. 상단에 제목·요약·앵커 입력·산출물 설명·체크리스트·캘린더·기록표·메모·피드백이 차례로 쌓이는데, 각 카드의 역할이 비슷한 무게로 보임.',
        'export 버튼이 “복사 / 엑셀 / 캘린더 / 내 버전” 4개가 같은 줄에 모여서 “지금 뭘 눌러야 하는지”가 흐려짐. 목적지가 ‘엑셀로 받기’처럼 도구 이름으로만 적혀 있어 어디로 가는지 직관적이지 않음.',
        '출처·주의·제작자·footprint가 본문 흐름에 섞여 있어 “경험 팁”과 “공식 정보”의 시각적 분리가 약함. 민감 카테고리에서 신뢰 손실 위험.',
        '모바일에서 산출물(달력·표)이 가로 스크롤로 잘리는데, 첫 화면에서 그 사실을 알기 어려움. 사용자는 “복사하면 어떤 모양으로 들어가지?”라는 핵심 질문을 못 풀고 나감.',
      ],
    },
    {
      h: '2. 사용자의 첫 행동 정의',
      b: [
        '단 하나: **앵커 한 줄을 채우는 것**. (이사일, 시험일, 인수일, 출생일 등 1개)',
        '앵커가 채워지면 산출물은 placeholder 날짜에서 실제 날짜로 즉시 바뀌어야 하고, 그 순간 가장 가까운 export 버튼이 활성화돼 “캘린더에 넣기”로 바뀐다.',
        '두 번째 행동은 export(목적지 명시), 세 번째 행동은 첫 항목 체크 — 그 외 모든 보조 UI는 첫 화면에서 비중을 낮춘다.',
      ],
    },
    {
      h: '3. 이 Flow의 자연스러운 산출물 (artifact-plan 기반)',
      b: [
        '`timeline` 구조 (이사·시험·인수일 기반) → **월간 캘린더 + 실행 리스트**',
        '`routine` 구조 (운동·공부·언어) → **반복 캘린더(회차) + 회차 메모**',
        '`phase` 구조 (이유식·발달·수면훈련) → **식단 일정 + 반응 기록표**',
        '`checklist` 구조 (서류·증명·취업) → **메모 카드 + 체크리스트** 또는 **비교표 + 현장 체크**',
        '한 화면에 산출물 종류는 최대 2개. 그 외는 보조 카드로 접어둔다.',
      ],
    },
    {
      h: '4. 개선된 화면 구조 (위→아래)',
      b: [
        '① **상단 메타 한 줄** — 카테고리 · structure · 초안 깃발 · 출처 타입 (5–6개 토큰, 한 줄)',
        '② **제목 + 한 문장 요약** (2줄 내). 마케팅 카피 금지.',
        '③ **앵커 입력 한 줄** — 라벨이 “기준 날짜”가 아니라 “이사일 입력” 같은 Flow별 구체어',
        '④ **Primary Artifact** — 산출물 1개. 위쪽 끝에 목적지가 드러난 export 버튼. (예: “캘린더에 넣기 · ICS”)',
        '⑤ **Secondary Artifact** — 메모/비교/기록표 중 하나. 같은 카드 어휘로 옆 또는 아래에 배치.',
        '⑥ **체크 진행** — Primary 카드 안에서 inline으로 일어나고, 별도 진행률 UI는 두지 않음.',
        '⑦ **출처/주의/위험 분리 패널** — 우측 (데스크톱) / 접힌 섹션 (모바일). 본문 흐름을 막지 않음.',
        '⑧ **피드백** — 페이지 맨 아래. “이 산출물이 내 상황에 맞나?” 두 줄짜리 입력 + “막혔어요/도움됨” footprint 버튼.',
      ],
    },
    {
      h: '5–6. 데스크톱 / 모바일 레이아웃',
      b: [
        '데스크톱: 12-col, 좌측 8col에 산출물 워크벤치, 우측 4col에 메타·출처·주의·피드백. 상단은 풀폭. TOC는 산출물이 길어질 때만 우측 위에 sticky.',
        '모바일: 단일 column. 메타·출처는 “자세히” 토글로 접고, 첫 스크린에 anchor + primary artifact + 1개 export CTA만 보이게. footprint·secondary artifact·피드백은 아래로 밀어둠.',
        '모바일에서 표/캘린더는 가로 스크롤 대신 “요약 카드 + 시트로 받기” 패턴으로 우회 (전체는 export 후 봄).',
      ],
    },
    {
      h: '7. 주요 컴포넌트 목록',
      b: [
        'MetaRow · DraftFlag · CategoryDot · SourceBadge · RiskBadge',
        'AnchorInput (Flow별 라벨/단위)',
        'ArtifactCard (header eyebrow + title + 목적지 명시 export + body)',
        'CalendarPreview · ChecklistRow · ComparisonTable · LogTable · MemoCard · RoutineGrid',
        'SourcePanel (출처·last-checked·official link 분리)',
        'CautionPanel (risk_level별 톤)',
        'FootprintBar (열람/복사/체크/막힘 4개만)',
        'FeedbackBlock (2-line + “이 부분이 안 맞아요” 라벨 선택)',
      ],
    },
    {
      h: '8. 카피 기준 (버튼/섹션/빈 상태/오류)',
      b: [
        '버튼은 **목적지 + 동작**: “캘린더에 넣기”, “시트로 받기”, “이번 주 공부표 복사”, “구매 보류 메모 만들기”',
        '섹션 제목은 산출물 이름: “이사 캘린더”, “인수 점검 메모”, “30일 공부표”, “반응 기록표”',
        '빈 상태: “이사일을 넣으면 D-30 일정이 여기로 들어와요.” (다음 행동을 직접 안내)',
        '에러: “앵커가 비어 있어요. 캘린더로 보내려면 이사일이 필요해요.” (무엇이/왜/다음행동)',
        '금지어: “저장”, “관리”, “실행”, “확인”, “내보내기” 단독 사용. (목적지 없이는 의미 없음)',
      ],
    },
    {
      h: '9. Export 흐름',
      b: [
        '한 화면 1개의 primary export, 1–2개 secondary. 모두 “목적지 동사”로 라벨링.',
        'export 버튼은 **그 산출물 카드의 우상단**에 위치. 페이지 하단 sticky bar 패턴은 쓰지 않음(워크벤치 톤이 아니기 때문).',
        '상태 라벨은 옆에 작게: “복사됨 · 방금” “.ics 다운로드 — 캘린더 열기”.',
        '비활성 사유는 버튼 옆에 한 줄로 명시: “체크 1개 이상 있어야 시트로 받을 수 있어요”.',
      ],
    },
    {
      h: '10. 출처/주의/위험 배치',
      b: [
        '출처와 주의는 **본문에서 분리**해 우측 사이드 패널(데스크톱) / 접힌 disclosure(모바일)로 둔다.',
        '위험 라벨이 medical/legal/financial이면, 가장 가까운 “결정 지점” 위에 노란/빨강 안내 박스를 인라인으로 추가. 단, 그 박스는 본문 흐름을 끊는 위치에 두지 않는다(예: 인수 메모 카드 “보류 기준” 위).',
        '“공식 정보 vs 경험 팁”은 항목별로 source_badge로 한 줄 안에서 구분. 두 종류를 한 카드에 섞지 않는다.',
        '“검증됨” 라벨은 실데이터 전 절대 사용 금지. 대신 “초안 깃발 · Stage 0 검증용”.',
      ],
    },
    {
      h: '11. 구현 시 주의할 점',
      b: [
        '한 Flow에 두 가지 산출물이 자연스러우면 둘 다 보여주되, **export 액션은 산출물 카드 내부로만** 둘 것. 전역 sticky bar 금지.',
        '모바일에서 가로 스크롤 표를 만들지 말 것. 대신 “요약 카드 + 시트로 받기” 패턴.',
        '체크 상태는 로컬 우선, 익명 ID 기반. 가입 강요 금지.',
        'event 로깅은 view/anchor/copy/export/check/feedback 6개만 우선. 그 외 metric은 노출하지 않음.',
        'category color는 카테고리 닷(8px) 한 곳에만 쓰고, 본문 색은 ink/muted/primary로 통일.',
        'A11y: 모든 export 버튼에 aria-label로 “목적지 + 산출물명”을 명시. 표는 caption 또는 aria-labelledby로 산출물명을 묶어줄 것.',
      ],
    },
  ];

  return (
    <div className="fm fm-scroll" style={{
      height: '100%', overflowY: 'auto', background: FM.bg, padding: '40px 56px',
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: FM.ink, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 10, letterSpacing: 0 }}>F</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: FM.ink, letterSpacing: '-0.01em' }}>FlowMe</div>
          <Badge tone="draft" icon={<Icon name="flag" size={11}/>}>Stage 0 검토</Badge>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: FM.muted }}>design.md · agent.md 기준</div>
        </div>

        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: FM.ink, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
          FlowMe Flow 상세 — UX 리뷰 & 화면 설계안
        </h1>
        <p style={{ marginTop: 10, fontSize: 14, color: FM.inkSoft, lineHeight: 1.7, maxWidth: 640 }}>
          FlowMe는 콘텐츠를 사용자가 실행할 수 있는 산출물로 바꾸는 action compiler다.
          이 문서는 현재 Flow 상세 화면의 가장 큰 UX 문제와 그것을 풀기 위한 데스크톱/모바일
          레이아웃, 컴포넌트, 카피, export 흐름, 출처·주의 배치를 정리한다. 그 뒤로 이어지는
          아트보드가 실제 화면이다.
        </p>

        <div style={{ marginTop: 28, display: 'grid', gap: 22 }}>
          {rows.map((r, i) => (
            <section key={i} style={{ paddingTop: 18, borderTop: `1px solid ${FM.line}` }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: FM.ink, letterSpacing: '-0.01em' }}>{r.h}</h2>
              <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
                {r.b.map((line, j) => (
                  <li key={j} style={{ display: 'grid', gridTemplateColumns: '14px 1fr', gap: 8, fontSize: 13.5, color: FM.inkSoft, lineHeight: 1.65 }}>
                    <span style={{ color: FM.faint, marginTop: 2 }}>·</span>
                    <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#1F2933;font-weight:700">$1</strong>').replace(/`(.+?)`/g, '<code style="background:#F1EFE8;padding:1px 5px;border-radius:3px;font-size:12px;font-family:JetBrains Mono,monospace">$1</code>') }}/>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div style={{ marginTop: 36, padding: 16, background: FM.bgAlt, border: `1px solid ${FM.line}`, borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>판단 원칙</div>
          <div style={{ marginTop: 6, fontSize: 14, color: FM.ink, lineHeight: 1.6, fontWeight: 500 }}>
            이 UI는 사용자가 콘텐츠를 자기 일정·시트·메모·체크리스트로 가져가 <strong style={{ fontWeight: 700 }}>실행</strong>하는 데 도움이 되는가?
          </div>
          <div style={{ marginTop: 4, fontSize: 12.5, color: FM.muted, lineHeight: 1.6 }}>
            도움이 되지 않는 모든 요소는 첫 화면에서 우선순위를 내렸다.
          </div>
        </div>

        <div style={{ height: 60 }}/>
      </div>
    </div>
  );
}

Object.assign(window, { AnalysisDoc });
