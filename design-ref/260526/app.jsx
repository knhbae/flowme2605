// FlowMe — components board + main canvas composition.

function SystemBoard() {
  return (
    <div className="fm fm-scroll" style={{ height: '100%', overflowY: 'auto', background: FM.bg, padding: 32 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Design system</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: FM.ink, letterSpacing: '-0.02em', marginTop: 4 }}>토큰 & 컴포넌트</div>
      <div style={{ fontSize: 13, color: FM.muted, marginTop: 4, maxWidth: 560, lineHeight: 1.6 }}>
        design.md 색상 정의에 정확히 일치. 본문은 ink·muted·primary로만, 카테고리는 작은 점 한 곳에만 쓴다.
      </div>

      {/* Colors */}
      <div style={{ marginTop: 24, fontSize: 11, fontWeight: 700, color: FM.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Colors</div>
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          ['#F8F7F4', 'bg', '문서 배경'],
          ['#FFFFFF', 'surface', '카드'],
          ['#1F2933', 'ink', '본문'],
          ['#6B7280', 'muted', '서브'],
          ['#E5E7EB', 'line', '구분선'],
          ['#2563EB', 'primary', '액션'],
          ['#A16207', 'warning', '주의'],
          ['#B91C1C', 'danger', '위험'],
        ].map(([hex, name, note]) => (
          <Card key={name} padding={10}>
            <div style={{ height: 40, borderRadius: 5, background: hex, border: `1px solid ${FM.line}` }}/>
            <div style={{ fontSize: 12, fontWeight: 600, color: FM.ink, marginTop: 6 }}>{name}</div>
            <div className="fm-mono" style={{ fontSize: 10.5, color: FM.muted, marginTop: 2 }}>{hex}</div>
            <div style={{ fontSize: 10.5, color: FM.muted, marginTop: 2 }}>{note}</div>
          </Card>
        ))}
      </div>

      {/* Category dots */}
      <div style={{ marginTop: 22, fontSize: 11, fontWeight: 700, color: FM.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Category dots</div>
      <div style={{ marginTop: 8, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[
          ['Moving', FM.cat.moving], ['Wedding', FM.cat.wedding], ['Travel', FM.cat.travel],
          ['Parenting', FM.cat.parenting], ['Workout', FM.cat.workout], ['Finance', FM.cat.finance],
        ].map(([n, c]) => (
          <div key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: c }}/>
            <span style={{ fontSize: 12, color: FM.ink, fontWeight: 500 }}>{n}</span>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div style={{ marginTop: 22, fontSize: 11, fontWeight: 700, color: FM.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Badges</div>
      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Badge tone="draft" icon={<Icon name="flag" size={11}/>}>초안 깃발</Badge>
        <Badge tone="blue">공식 정보</Badge>
        <Badge tone="neutral">제작자 경험</Badge>
        <Badge tone="outline">사용자 메모</Badge>
        <Badge tone="warn">공식 확인 필요</Badge>
        <Badge tone="danger">의료 주의</Badge>
        <Badge tone="success">완료</Badge>
      </div>

      {/* Buttons */}
      <div style={{ marginTop: 22, fontSize: 11, fontWeight: 700, color: FM.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Buttons — 목적지 동사</div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Btn variant="primary" size="md" icon={<Icon name="calendar" size={13}/>}>캘린더에 넣기</Btn>
        <Btn variant="dark" size="md" icon={<Icon name="memo" size={13}/>}>메모로 복사</Btn>
        <Btn variant="primarySoft" size="md" icon={<Icon name="sheet" size={13}/>}>시트로 받기</Btn>
        <Btn variant="outline" size="md" icon={<Icon name="copy" size={13}/>}>오늘 항목 복사</Btn>
        <Btn variant="danger" size="md" icon={<Icon name="alert" size={13}/>}>구매 보류 메모</Btn>
        <Btn variant="ghost" size="md">자세히</Btn>
      </div>

      {/* Banned copy */}
      <div style={{ marginTop: 22, fontSize: 11, fontWeight: 700, color: FM.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Copy — 약한 ↔ 좋은</div>
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          ['내보내기', '캘린더에 넣기'],
          ['저장하기', '오늘 실행 항목 복사'],
          ['관리하기', '관찰 시트로 받기'],
          ['확인하기', '중단/상담 조건 확인'],
          ['실행하기', '이번 주 공부표 받기'],
        ].map(([bad, good], i) => (
          <React.Fragment key={i}>
            <Card padding={10} tone="bg">
              <div style={{ fontSize: 10.5, color: FM.danger, fontWeight: 600 }}>약함</div>
              <div style={{ fontSize: 13, color: FM.muted, marginTop: 2, textDecoration: 'line-through' }}>{bad}</div>
            </Card>
            <Card padding={10}>
              <div style={{ fontSize: 10.5, color: FM.success, fontWeight: 600 }}>좋음</div>
              <div style={{ fontSize: 13, color: FM.ink, marginTop: 2, fontWeight: 600 }}>{good}</div>
            </Card>
          </React.Fragment>
        ))}
      </div>

      {/* Type */}
      <div style={{ marginTop: 22, fontSize: 11, fontWeight: 700, color: FM.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Type</div>
      <Card padding={16} style={{ marginTop: 8 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: FM.ink, letterSpacing: '-0.025em', lineHeight: 1.15 }}>이사 D-30 준비 캘린더</div>
        <div style={{ fontSize: 10.5, color: FM.muted, marginTop: 2 }}>Title · Pretendard 700 · 28 / -2.5%</div>
        <hr style={{ border: 0, borderTop: `1px solid ${FM.lineSoft}`, margin: '12px 0' }}/>
        <div style={{ fontSize: 14, color: FM.inkSoft, lineHeight: 1.6 }}>이사일을 넣으면 30일 일정이 자동으로 채워져요.</div>
        <div style={{ fontSize: 10.5, color: FM.muted, marginTop: 2 }}>Body · Pretendard 400 · 14 / 1.6</div>
        <hr style={{ border: 0, borderTop: `1px solid ${FM.lineSoft}`, margin: '12px 0' }}/>
        <div className="fm-mono" style={{ fontSize: 14, color: FM.primaryInk, fontWeight: 600 }}>D-14 · 06.20</div>
        <div style={{ fontSize: 10.5, color: FM.muted, marginTop: 2 }}>Mono · JetBrains Mono 600 · tabular</div>
      </Card>

      <div style={{ height: 40 }}/>
    </div>
  );
}

// ─── Canvas composition ──────────────────────────────────────
function App() {
  return (
    <DesignCanvas>
      <DCSection id="analysis" title="0 · UX 분석" subtitle="design.md / agent.md 기반의 화면 설계안">
        <DCArtboard id="analysis-doc" label="UX 리뷰 & 화면 설계안" width={920} height={1400}>
          <AnalysisDoc/>
        </DCArtboard>
      </DCSection>

      <DCSection id="desktop" title="1 · 데스크톱 — Flow 상세" subtitle="좌 8col 산출물 워크벤치 · 우 4col 메타·출처·주의·피드백">
        <DCArtboard id="desktop-moving" label="A · timeline · 이사 D-30 (앵커 적용됨)" width={1280} height={1480}>
          <ScreenMoving/>
        </DCArtboard>
        <DCArtboard id="desktop-car" label="B · decision + memo · 신차 인수 점검" width={1280} height={1280}>
          <ScreenCarDelivery/>
        </DCArtboard>
        <DCArtboard id="desktop-empty" label="C · 빈 상태 — 앵커 없음" width={1280} height={920}>
          <ScreenEmpty/>
        </DCArtboard>
      </DCSection>

      <DCSection id="mobile" title="2 · 모바일 — 첫 뷰포트가 산출물에 닿게" subtitle="anchor + primary export 1개를 한 화면에 · 표는 시트로 우회">
        <DCArtboard id="mobile-moving" label="A · 이사 D-30 · 앵커 적용 후" width={420} height={830}>
          <MobileMoving/>
        </DCArtboard>
        <DCArtboard id="mobile-empty" label="C · 빈 상태 — 앵커 없음" width={420} height={830}>
          <MobileEmpty/>
        </DCArtboard>
        <DCArtboard id="mobile-car" label="B · 신차 인수 점검 · 현장 뷰" width={420} height={830}>
          <MobileCar/>
        </DCArtboard>
      </DCSection>

      <DCSection id="system" title="3 · 시스템" subtitle="색상 · 배지 · 버튼 · 카피 기준">
        <DCArtboard id="system-board" label="토큰 & 컴포넌트" width={780} height={1120}>
          <SystemBoard/>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
