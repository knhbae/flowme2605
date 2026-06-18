// FlowMe — phase flow (이유식 단계)
// design.md가 FIRST FLAG 영역으로 언급한 민감 카테고리(육아).
// 출처 분리, 의료진 확인 안내, 알레르기 위험 라벨, "검증됨" 금지를 강하게 적용.

const BABY_PHASES = [
  { id: 'p1', name: '초기',   age: '4–6개월',   key: '미음·1종 농도',    color: '#E7F5EC', ink: FM.success, days: 30 },
  { id: 'p2', name: '중기',   age: '7–8개월',   key: '으깬 죽·2종 식감',  color: FM.primaryBg, ink: FM.primaryInk, days: 60 },
  { id: 'p3', name: '후기',   age: '9–11개월',  key: '진죽·핑거푸드',    color: FM.warningBg, ink: FM.warningInk, days: 90 },
  { id: 'p4', name: '완료기', age: '12개월~',   key: '진밥·가족식 일부',  color: '#FCEAEA', ink: '#7C2D2D', days: 60 },
];

const NEW_FOOD_PLAN = [
  // each = { day, name, watch (allergy/reaction risk) }
  { d: 'D-1', name: '쌀미음', watch: false, note: '농도 1:10 → 1:7' },
  { d: 'D-4', name: '브로콜리',  watch: false, note: '잎채소 도입' },
  { d: 'D-7', name: '단호박',    watch: false, note: '단맛 채소 1' },
  { d: 'D-10', name: '소고기',   watch: true,  note: '단백질 1차 · 3일 관찰' },
  { d: 'D-14', name: '닭고기',   watch: true,  note: '단백질 2차 · 3일 관찰' },
  { d: 'D-18', name: '계란 노른자', watch: true, note: '알레르기 주의 · 3일 관찰' },
  { d: 'D-22', name: '두부',     watch: true,  note: '대두 1차 · 3일 관찰' },
  { d: 'D-26', name: '바나나',   watch: false, note: '과일 도입' },
  { d: 'D-30', name: '시금치',   watch: false, note: '잎채소 2' },
];

const REACTION_LOG = [
  { d: '04.18', meal: '쌀미음',     amount: '30 ml', react: '안정', tone: 'normal', note: '잘 받아먹음' },
  { d: '04.21', meal: '브로콜리',   amount: '20 ml', react: '거부', tone: 'normal', note: '두 숟갈 후 입 닫음' },
  { d: '04.24', meal: '단호박',     amount: '40 ml', react: '안정', tone: 'normal', note: '잘 먹음' },
  { d: '04.27', meal: '소고기 (1)', amount: '15 g',  react: '안정', tone: 'normal', note: '소화 OK' },
  { d: '04.30', meal: '계란 노른자', amount: '소량',  react: '두드러기', tone: 'alert',  note: '얼굴·목 발진 — 병원 다녀옴' },
  { d: '05.03', meal: '두부',        amount: '20 g',  react: '안정', tone: 'normal', note: '잘 받음' },
];

// ─── Desktop ─────────────────────────────────────────────────
function ScreenBabyFood() {
  const currentPhaseIdx = 0; // 초기
  return (
    <DesktopFrame>
      {/* Risk strip — sensitive category banner */}
      <div style={{
        marginBottom: 14, padding: '10px 14px',
        background: '#FCEAEA', border: `1px solid #F2C2C2`,
        borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Icon name="alert" size={14} color={FM.danger}/>
        <div style={{ fontSize: 12, color: '#7C2D2D', lineHeight: 1.55 }}>
          <strong>의료 주의 카테고리.</strong> 이 Flow는 경험 팁과 공식 안내를 정리한 도구이며, 알레르기·소화 이상 신호가 보이면 즉시 소아과 진료를 받으세요. FlowMe는 의료 권위가 아닙니다.
        </div>
      </div>

      <MetaRow
        category="육아 · 이유식" dot={FM.cat.parenting}
        structure="phase · 4단계" anchorLabel="앵커: 아이 생년월일"
        source="공식 안내 + 부모 경험"
        draft="초안 깃발 · Stage 0 검증용"
        lastChecked="2026.05.20"
      />

      <h1 style={{ margin: '14px 0 6px', fontSize: 28, fontWeight: 700, color: FM.ink, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
        이유식 단계별 가이드 — 첫 30일
      </h1>
      <div style={{ fontSize: 14, color: FM.inkSoft, lineHeight: 1.6, maxWidth: 720 }}>
        아이 생년월일을 넣으면 현재 단계와 30일치 식단 도입 일정, 반응 기록표가 들어옵니다. 새 식재료는 한 번에 하나씩 3일 관찰이 기본입니다.
      </div>

      <div style={{ marginTop: 18 }}>
        <AnchorBar
          label="아이 생년월일"
          value="2025. 11. 20 (목) · 6개월"
          hint="이 생일을 기준으로 현재 ‘초기’ 단계 · D+12일째로 계산해요"
          applied
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginTop: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          {/* Phase progression bar */}
          <Card padding={16}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>단계 진행</div>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {BABY_PHASES.map((p, i) => {
                const active = i === currentPhaseIdx;
                const past = i < currentPhaseIdx;
                return (
                  <div key={p.id} style={{
                    padding: 12, borderRadius: 8,
                    background: active ? p.color : FM.bgAlt,
                    border: active ? `1.5px solid ${p.ink}` : `1px solid ${FM.lineSoft}`,
                    opacity: past ? 0.6 : 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: active ? p.ink : FM.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>STAGE {i + 1}</div>
                      {active && <Badge tone="blue">현재</Badge>}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: active ? p.ink : FM.ink, marginTop: 4 }}>{p.name}</div>
                    <div className="fm-num" style={{ fontSize: 11.5, color: FM.muted, marginTop: 2, fontWeight: 600 }}>{p.age}</div>
                    <div style={{ fontSize: 11.5, color: active ? p.ink : FM.muted, marginTop: 6, lineHeight: 1.5 }}>{p.key}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, padding: 10, background: FM.bgAlt, borderRadius: 6, fontSize: 11.5, color: FM.muted, lineHeight: 1.55 }}>
              현재 <strong style={{ color: FM.ink }}>초기 단계 · D+12일</strong>. 다음 단계(중기)는 2026.07.20부터예요. 단계 진입은 개월 수가 아니라 <strong style={{ color: FM.ink }}>아이의 식사 신호(혀 내미는 반사 사라짐, 손으로 음식 잡으려 함)</strong> 기준으로 보는 것이 좋습니다.
            </div>
          </Card>

          {/* Primary artifact: 30-day intro plan */}
          <ArtifactCard
            eye="식단 도입 일정 · primary"
            title="초기 30일 새 식재료 도입"
            desc="한 번에 한 식재료, 3일 관찰. 알레르기 위험 식재료는 별도 표시."
            exports={[
              { icon: 'calendar', label: '캘린더에 넣기 · .ics' },
              { icon: 'sheet',    label: '시트로 받기' },
            ]}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: '76px 1fr 1.4fr 100px',
              border: `1px solid ${FM.lineSoft}`, borderRadius: 6, overflow: 'hidden',
            }}>
              {['시점', '식재료', '메모', '주의'].map((h, i, arr) => (
                <div key={i} style={{
                  padding: '8px 12px', background: FM.bgAlt,
                  borderBottom: `1px solid ${FM.lineSoft}`,
                  borderRight: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
                  fontSize: 11, fontWeight: 700, color: FM.ink,
                }}>{h}</div>
              ))}
              {NEW_FOOD_PLAN.map((r, ri, arr) => (
                <React.Fragment key={ri}>
                  <div className="fm-mono" style={{ padding: '9px 12px', borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 11.5, color: FM.primaryInk, fontWeight: 600 }}>{r.d}</div>
                  <div style={{ padding: '9px 12px', borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12.5, color: FM.ink, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ padding: '9px 12px', borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: FM.inkSoft, lineHeight: 1.5 }}>{r.note}</div>
                  <div style={{ padding: '6px 10px', borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', display: 'flex', alignItems: 'center' }}>
                    {r.watch ? <Badge tone="danger" icon={<Icon name="alert" size={10}/>}>알레르기</Badge> : <Badge tone="outline">일반</Badge>}
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div style={{ marginTop: 10, padding: 10, background: '#FFF7E8', border: `1px solid #EAD9A3`, borderRadius: 6, fontSize: 11.5, color: FM.warningInk, lineHeight: 1.55 }}>
              <strong>3일 관찰 규칙.</strong> 새 식재료를 시작한 날부터 최소 3일은 다른 새 식재료를 추가하지 않습니다. 두드러기·구토·설사가 보이면 즉시 중단하고 소아과 진료.
            </div>
          </ArtifactCard>

          {/* Secondary: reaction log */}
          <ArtifactCard
            eye="반응 기록표 · secondary"
            title="끼니마다 반응 기록"
            desc="병원에 갈 때 그대로 보여줄 수 있는 형태. 알레르기 의심 반응은 빨간 표시로 남아요."
            exports={[
              { icon: 'sheet', label: '병원용 시트로 받기' },
              { icon: 'copy',  label: '의심 반응만 복사' },
            ]}
            mainTone="primarySoft"
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: '78px 1.2fr 80px 90px 1.5fr',
              border: `1px solid ${FM.lineSoft}`, borderRadius: 6, overflow: 'hidden',
            }}>
              {['날짜', '식사 / 식재료', '양', '반응', '메모'].map((h, i, arr) => (
                <div key={i} style={{
                  padding: '8px 12px', background: FM.bgAlt,
                  borderBottom: `1px solid ${FM.lineSoft}`,
                  borderRight: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
                  fontSize: 11, fontWeight: 700, color: FM.ink,
                }}>{h}</div>
              ))}
              {REACTION_LOG.map((r, ri, arr) => (
                <React.Fragment key={ri}>
                  <div className="fm-mono" style={{ padding: '9px 12px', borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 11.5, color: FM.inkSoft, fontWeight: 600, background: r.tone === 'alert' ? FM.dangerBg : 'transparent' }}>{r.d}</div>
                  <div style={{ padding: '9px 12px', borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: FM.ink, fontWeight: 500, background: r.tone === 'alert' ? FM.dangerBg : 'transparent' }}>{r.meal}</div>
                  <div className="fm-mono" style={{ padding: '9px 12px', borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 11.5, color: FM.inkSoft, background: r.tone === 'alert' ? FM.dangerBg : 'transparent' }}>{r.amount}</div>
                  <div style={{ padding: '6px 10px', borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderRight: `1px solid ${FM.lineSoft}`, display: 'flex', alignItems: 'center', background: r.tone === 'alert' ? FM.dangerBg : 'transparent' }}>
                    {r.tone === 'alert'
                      ? <Badge tone="danger" icon={<Icon name="alert" size={10}/>}>{r.react}</Badge>
                      : <Badge tone="outline">{r.react}</Badge>}
                  </div>
                  <div style={{ padding: '9px 12px', borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', fontSize: 12, color: r.tone === 'alert' ? '#7C2D2D' : FM.inkSoft, lineHeight: 1.5, background: r.tone === 'alert' ? FM.dangerBg : 'transparent', fontWeight: r.tone === 'alert' ? 600 : 400 }}>{r.note}</div>
                </React.Fragment>
              ))}
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Btn variant="outline" size="sm" icon={<Icon name="plus" size={13}/>}>오늘 끼니 추가</Btn>
              <span style={{ fontSize: 11.5, color: FM.muted }}>총 6회 기록 · <strong style={{ color: FM.danger }}>1건 의심 반응</strong></span>
            </div>
          </ArtifactCard>
        </div>

        {/* right rail — sensitive panels first */}
        <div style={{ display: 'grid', gap: 12, position: 'sticky', top: 76 }}>
          {/* immediate stop conditions */}
          <Card padding={14} style={{ background: '#FCEAEA', border: `1px solid #F2C2C2` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="alert" size={14} color={FM.danger}/>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#7C2D2D' }}>즉시 중단 · 응급</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#7C2D2D', lineHeight: 1.6 }}>
              · 입술/얼굴 부종, 호흡 곤란 → <strong>119</strong><br/>
              · 두드러기, 반복 구토, 설사 → 소아과 진료<br/>
              · 새 식재료 시작 3일 안에 이상 → 즉시 중단
            </div>
          </Card>

          <Card padding={14}>
            <div style={{ fontSize: 12, fontWeight: 700, color: FM.ink }}>이 Flow 정보</div>
            <div style={{ marginTop: 10, display: 'grid', gap: 6, fontSize: 11.5 }}>
              {[
                ['카테고리', '육아 · 이유식'],
                ['구조', 'phase · 4단계'],
                ['앵커', '아이 생년월일'],
                ['현재', '초기 · D+12'],
                ['제작자', '@parent-notes'],
                ['감수', '미감수 · 부모 경험'],
                ['버전', 'v0.2'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: FM.muted }}>{k}</span>
                  <span style={{ color: FM.ink, fontWeight: 500, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <SourcePanel
            lastChecked="2026.05.20"
            items={[
              { type: 'official',   title: '영유아 영양 안내 · 식품의약품안전처', url: 'mfds.go.kr' },
              { type: 'official',   title: '예방접종 도우미', url: 'nip.kdca.go.kr' },
              { type: 'experience', title: '이유식 30일 후기 24건', url: '@parent-notes' },
            ]}
          />

          <CautionPanel
            tone="warn"
            title="공식 정보 vs 경험 팁"
            body="이 Flow는 두 출처를 한 카드 안에 섞지 않습니다. 단계별 권장 식재료·도입 시점은 공식 자료 기준이고, 농도·식감·거부 신호 메모는 부모 경험입니다."
          />

          <FootprintBar counts={{ view: 928, copy: 264, check: 312, stuck: 47 }}/>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── Mobile — baby food ─────────────────────────────────────
function MobileBabyFood() {
  return (
    <Phone label="모바일 · phase — 민감 카테고리, 위험 라벨 + 응급 정지 조건">
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', justifyContent: 'space-between' }}>
        <button style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
          <Icon name="chev" size={18} color={FM.ink} sw={2}/>
        </button>
        <div style={{ fontSize: 12, fontWeight: 600, color: FM.muted }}>flows / 이유식 30일</div>
        <Icon name="share" size={18} color={FM.ink}/>
      </div>

      <div style={{ padding: '4px 18px 12px' }}>
        {/* sensitive banner first */}
        <div style={{
          padding: 10, background: '#FCEAEA',
          border: `1px solid #F2C2C2`, borderRadius: 10,
          display: 'flex', gap: 10, marginBottom: 12,
        }}>
          <Icon name="alert" size={13} color={FM.danger}/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>
            <strong>의료 주의.</strong> 이상 반응이 보이면 즉시 소아과 진료. FlowMe는 의료 권위가 아닙니다.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: FM.cat.parenting }}/>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: FM.inkSoft }}>육아 · 이유식</span>
          <span style={{ fontSize: 11, color: FM.muted }}>· phase</span>
          <Badge tone="draft" icon={<Icon name="flag" size={10}/>}>초안 깃발</Badge>
        </div>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: FM.ink, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          이유식 단계별 가이드
        </h1>

        {/* phase pills */}
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {BABY_PHASES.map((p, i) => (
            <div key={p.id} style={{
              padding: '8px 6px', borderRadius: 7,
              background: i === 0 ? p.color : FM.bgAlt,
              border: i === 0 ? `1.5px solid ${p.ink}` : `1px solid ${FM.lineSoft}`,
              textAlign: 'center',
              opacity: i > 0 ? 0.6 : 1,
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: i === 0 ? p.ink : FM.muted, letterSpacing: '0.04em' }}>S{i + 1}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? p.ink : FM.ink, marginTop: 2 }}>{p.name}</div>
              <div className="fm-num" style={{ fontSize: 10, color: FM.muted, marginTop: 2 }}>{p.age}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: FM.muted, lineHeight: 1.5 }}>
          현재 <strong style={{ color: FM.ink }}>초기 · D+12일</strong>. 다음 단계는 2026.07.20.
        </div>

        {/* Today's meal — primary card */}
        <div style={{ marginTop: 14, padding: 14, background: FM.card, border: `1.5px solid ${FM.primary}`, borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>오늘 (D+12) · 새 식재료</div>
            <Badge tone="danger" icon={<Icon name="alert" size={10}/>}>알레르기</Badge>
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, color: FM.ink, marginTop: 6, letterSpacing: '-0.015em' }}>계란 노른자</div>
          <div style={{ fontSize: 12.5, color: FM.muted, marginTop: 6, lineHeight: 1.55 }}>
            소량으로 시작 · 3일간 다른 새 식재료 추가 금지 · 두드러기/구토 시 즉시 중단
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
            <Btn variant="primary" size="lg" full icon={<Icon name="memo" size={14}/>}>오늘 반응 기록</Btn>
            <Btn variant="outline" size="md" full icon={<Icon name="sheet" size={13}/>}>병원용 기록표로 받기</Btn>
          </div>
        </div>

        {/* 30-day intro plan compact */}
        <div style={{ marginTop: 16 }}>
          <SecHead eye="새 식재료 도입" title="초기 30일" right={<Btn variant="outline" size="sm" icon={<Icon name="calendar" size={12}/>}>캘린더</Btn>}/>
          <div style={{ marginTop: 10, background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10, overflow: 'hidden' }}>
            {NEW_FOOD_PLAN.slice(0, 6).map((r, i, arr) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '54px 1fr auto',
                gap: 10, alignItems: 'center',
                padding: '11px 12px',
                borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
              }}>
                <div className="fm-mono" style={{ fontSize: 10.5, fontWeight: 600, color: FM.primaryInk }}>{r.d}</div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: FM.ink }}>{r.name}</div>
                  <div style={{ fontSize: 10.5, color: FM.muted, marginTop: 2 }}>{r.note}</div>
                </div>
                {r.watch
                  ? <Badge tone="danger" icon={<Icon name="alert" size={9}/>}>주의</Badge>
                  : <Badge tone="outline">일반</Badge>}
              </div>
            ))}
          </div>
        </div>

        {/* Reaction log compact */}
        <div style={{ marginTop: 16 }}>
          <SecHead eye="최근 반응" title="기록표"/>
          <div style={{ marginTop: 10, background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10, overflow: 'hidden' }}>
            {REACTION_LOG.slice(-3).reverse().map((r, i, arr) => (
              <div key={i} style={{
                padding: '11px 14px',
                borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
                background: r.tone === 'alert' ? FM.dangerBg : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="fm-mono" style={{ fontSize: 11, fontWeight: 600, color: FM.inkSoft }}>{r.d}</div>
                  {r.tone === 'alert'
                    ? <Badge tone="danger" icon={<Icon name="alert" size={9}/>}>{r.react}</Badge>
                    : <Badge tone="outline">{r.react}</Badge>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: r.tone === 'alert' ? '#7C2D2D' : FM.ink, marginTop: 4 }}>{r.meal} <span className="fm-mono" style={{ fontSize: 11, fontWeight: 500, color: FM.muted }}>· {r.amount}</span></div>
                <div style={{ fontSize: 11.5, color: r.tone === 'alert' ? '#7C2D2D' : FM.muted, marginTop: 3, lineHeight: 1.5, fontWeight: r.tone === 'alert' ? 600 : 400 }}>{r.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Source disclosure */}
        <details style={{ marginTop: 16, background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10 }}>
          <summary style={{
            listStyle: 'none', padding: '12px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="info" size={14} color={FM.muted}/>
            <span style={{ fontSize: 13, fontWeight: 600, color: FM.ink }}>출처 · 공식/경험 구분</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: FM.faint }}>마지막 확인 5/20</span>
          </summary>
          <div style={{ padding: '12px 14px', borderTop: `1px solid ${FM.lineSoft}`, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Badge tone="blue">공식</Badge>
              <span style={{ fontSize: 12, color: FM.ink }}>식품의약품안전처 영유아 영양 안내</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Badge tone="blue">공식</Badge>
              <span style={{ fontSize: 12, color: FM.ink }}>예방접종 도우미</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Badge tone="neutral">경험</Badge>
              <span style={{ fontSize: 12, color: FM.ink }}>@parent-notes · 24건 후기</span>
            </div>
          </div>
        </details>

        <div style={{ height: 30 }}/>
      </div>
    </Phone>
  );
}

Object.assign(window, { ScreenBabyFood, MobileBabyFood });
