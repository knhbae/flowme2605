// FlowMe — diet-habit-2week Before/After
// Validation review의 A3(stop-condition 분리) + A1·A2(공통 패턴) 적용.
//
//   A3. “중단·상담 관찰” 섹션의 stop-condition이 list 마지막 항목 →
//        artifact card 위쪽의 caution 패널로 분리. 원칙 2줄은 caption으로.
//   A2. anchor 라벨 “시작일” / “기준 날짜” → “관찰 시작일” + 결과 메시지
//   A1. 모바일 sticky CTA “내 도구로 가져가기” → “시트로 받기 · .xlsx”

const DH = {
  startDate: '2026. 06. 01 (월)',
  today: '2026. 06. 08 (월)',
  todayDay: 8, // Day 8 of 14
};

// 14 days × 6 cols (sheet preview)
const DH_ROWS = [
  { d: 1, date: '06.01', bf: '오트밀', lu: '비빔밥',     di: '닭가슴 샐러드', sl: '7h', ac: '30분 산책',  cd: '보통' },
  { d: 2, date: '06.02', bf: '계란·토스트', lu: '도시락', di: '두부 덮밥',      sl: '6h', ac: '없음',      cd: '피곤' },
  { d: 3, date: '06.03', bf: '바나나·요거트', lu: '비빔국수', di: '연어 구이', sl: '7h', ac: '20분 산책',  cd: '보통' },
  { d: 4, date: '06.04', bf: '오트밀', lu: '김치찌개',     di: '치킨 1인분',     sl: '5h', ac: '없음',      cd: '폭식감' },
  { d: 5, date: '06.05', bf: '시리얼', lu: '샌드위치',     di: '집밥',           sl: '8h', ac: '요가 30분',  cd: '좋음' },
  { d: 6, date: '06.06', bf: '계란말이', lu: '국수',         di: '돈까스',          sl: '6h', ac: '없음',      cd: '보통' },
  { d: 7, date: '06.07', bf: '토스트', lu: '비빔밥',         di: '샐러드',          sl: '7h', ac: '30분 산책', cd: '보통' },
  { d: 8, date: '06.08', bf: '오트밀', lu: '도시락',         di: '—',               sl: '7h', ac: '진행중',    cd: '관찰중' },
];

// ═══════════════════════════════════════════════════════════════
// Shared observation sheet preview
// ═══════════════════════════════════════════════════════════════
function ObservationSheet({ rows, today }) {
  const cols = [
    { k: 'd',    label: 'Day',    w: 50,  mono: true },
    { k: 'date', label: '날짜',   w: 64,  mono: true },
    { k: 'bf',   label: '아침',   w: 110 },
    { k: 'lu',   label: '점심',   w: 110 },
    { k: 'di',   label: '저녁',   w: 110 },
    { k: 'sl',   label: '수면',   w: 60,  mono: true },
    { k: 'ac',   label: '활동',   w: 110 },
    { k: 'cd',   label: '컨디션', w: 80 },
  ];
  return (
    <div style={{ border: `1px solid ${FM.lineSoft}`, borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols.map(c => `${c.w}px`).join(' '), background: FM.bgAlt }}>
        {cols.map((c, i) => (
          <div key={c.k} style={{ padding: '8px 10px', borderRight: i < cols.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderBottom: `1px solid ${FM.lineSoft}`, fontSize: 11, fontWeight: 700, color: FM.ink }}>{c.label}</div>
        ))}
      </div>
      {rows.map((r, ri, arr) => {
        const isToday = r.d === today;
        const isStress = r.cd === '폭식감';
        return (
          <div key={ri} style={{
            display: 'grid', gridTemplateColumns: cols.map(c => `${c.w}px`).join(' '),
            background: isToday ? FM.primaryBg : (isStress ? FM.warningBg : 'transparent'),
          }}>
            {cols.map((c, i) => (
              <div key={c.k}
                className={c.mono ? 'fm-mono' : ''}
                style={{
                  padding: '8px 10px',
                  borderRight: i < cols.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
                  borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
                  fontSize: c.mono ? 11.5 : 12,
                  color: c.k === 'cd' && r.cd === '폭식감' ? FM.warningInk : (c.k === 'cd' && r.cd === '좋음' ? FM.success : FM.ink),
                  fontWeight: c.k === 'cd' && (isStress || r.cd === '좋음') ? 600 : 400,
                }}>{r[c.k]}</div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Desktop — BEFORE
// ═══════════════════════════════════════════════════════════════
function DietDesktopBefore() {
  return (
    <CSFrame tone="bad" label="문제 3개: stop-condition이 체크 항목 / 원칙이 체크 항목 / anchor 모호">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: '#B91C1C' }}/>
        <span style={{ fontSize: 12, fontWeight: 600, color: FM.inkSoft }}>건강 · 식습관 관찰</span>
        <span style={{ width: 1, height: 12, background: FM.line }}/>
        <span style={{ fontSize: 12, color: FM.muted }}>checklist · @매일 관찰 @주 1회 메모</span>
        <div style={{ flex: 1 }}/>
        <Badge tone="draft" icon={<Icon name="flag" size={11}/>}>초안 깃발</Badge>
      </div>

      <h1 style={{ margin: '12px 0 4px', fontSize: 24, fontWeight: 700, color: FM.ink, letterSpacing: '-0.022em', lineHeight: 1.2 }}>
        2주 식습관 관찰
      </h1>

      {/* anchor — vague */}
      <div style={{ marginTop: 14, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: FM.bgAlt, border: `1px solid ${FM.line}`, borderRadius: 8 }}>
          <div style={{ display: 'grid', gap: 2 }}>
            <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>앵커</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: FM.ink }}>
              <span style={{ background: '#FDE4E4', padding: '2px 6px', borderRadius: 4 }}>시작일</span>
            </div>
          </div>
          <div style={{ width: 1, height: 28, background: FM.line }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 7 }}>
            <Icon name="calendar" size={14} color={FM.primary}/>
            <span className="fm-num" style={{ fontSize: 14, fontWeight: 600, color: FM.ink }}>{DH.startDate}</span>
          </div>
          <Pin n={3} tone="bad" style={{ position: 'absolute', top: -8, left: -8 }}/>
        </div>
      </div>

      {/* artifact + stop-cond buried */}
      <div style={{ marginTop: 16 }}>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${FM.lineSoft}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>관찰 기록표 · primary</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: FM.ink, marginTop: 2 }}>14일 식사·수면·활동·컨디션</div>
          </div>
          <div style={{ padding: 16 }}>
            {/* condensed sheet preview */}
            <div style={{ overflow: 'hidden', maxHeight: 150 }}>
              <ObservationSheet rows={DH_ROWS.slice(0, 4)} today={DH.todayDay}/>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: FM.muted }}>… 14일 전체</div>
          </div>
        </Card>
      </div>

      {/* THE PROBLEM: 중단·상담 관찰 as list section */}
      <div style={{ marginTop: 16, position: 'relative' }}>
        <Pin n={1} tone="bad" style={{ position: 'absolute', left: -12, top: 0 }}/>
        <div style={{ fontSize: 12, fontWeight: 700, color: FM.ink, marginBottom: 8 }}>
          <span style={{ background: '#FDE4E4', padding: '1px 6px', borderRadius: 4 }}>## 중단·상담 관찰</span>
          <span style={{ marginLeft: 8, fontSize: 11, color: FM.muted, fontWeight: 500 }}>· 3개 항목 · 다른 섹션과 같은 무게로 노출</span>
        </div>
        <div style={{ border: `1px solid ${FM.lineSoft}`, borderRadius: 6, overflow: 'hidden' }}>
          {[
            { t: '체중보다 식사·수면·활동 패턴을 먼저 보기', kind: 'principle' },
            { t: '무리한 제한으로 폭식 유발감이 생겼는지 확인하기', kind: 'principle' },
            { t: '통증, 어지러움, 폭식 유발감이 반복되면 기록을 멈추고 상담 메모 남기기', kind: 'stop' },
          ].map((it, i, arr) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 12, alignItems: 'center',
              padding: '10px 12px',
              borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
              background: it.kind === 'stop' ? '#FDF6F6' : 'transparent',
            }}>
              <input type="checkbox" className="fm-check"/>
              <div style={{ fontSize: 13, color: FM.ink, fontWeight: 500 }}>{it.t}</div>
              {it.kind === 'stop' && <Badge tone="danger" icon={<Icon name="alert" size={10}/>}>stop 신호</Badge>}
              {it.kind === 'principle' && <Badge tone="outline">원칙</Badge>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
        <div style={{ padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={1} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>
            <strong>stop-condition이 일반 체크 항목.</strong> 사용자는 “통증/어지러움 반복되면 멈춤”을 단순 체크박스로 처리하고 넘어갈 가능성이 큼. 결정 기준(decision)인데 관찰 항목(observation)과 같은 무게.
          </div>
        </div>
        <div style={{ padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={2} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>
            <strong>원칙도 체크 항목.</strong> “체중보다 패턴을 먼저 보기”는 안내 문장. 체크박스로 두면 사용자가 한 번 클릭하고 잊는다.
          </div>
        </div>
        <div style={{ padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={3} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>
            <strong>anchor가 “시작일”.</strong> 무엇의 시작일인지(다이어트? 관찰? 운동?) 첫 화면에서 안 보임. health-sensitive 라우트에선 의도를 첫 줄에 못 박아야 함.
          </div>
        </div>
      </div>
    </CSFrame>
  );
}

// ═══════════════════════════════════════════════════════════════
// Desktop — AFTER
// ═══════════════════════════════════════════════════════════════
function DietDesktopAfter() {
  return (
    <CSFrame tone="good" label="stop-condition을 caution 패널로 분리 · 원칙은 caption · anchor 구체화">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: '#B91C1C' }}/>
        <span style={{ fontSize: 12, fontWeight: 600, color: FM.inkSoft }}>건강 · 식습관 관찰</span>
        <span style={{ width: 1, height: 12, background: FM.line }}/>
        <span style={{ fontSize: 12, color: FM.muted }}>관찰 시트 · 2주</span>
        <div style={{ flex: 1 }}/>
        <Badge tone="draft" icon={<Icon name="flag" size={11}/>}>초안 깃발</Badge>
      </div>

      <h1 style={{ margin: '12px 0 4px', fontSize: 24, fontWeight: 700, color: FM.ink, letterSpacing: '-0.022em', lineHeight: 1.2 }}>
        2주 식습관 관찰 기록표
      </h1>
      <div style={{ fontSize: 13, color: FM.inkSoft, lineHeight: 1.55, maxWidth: 620 }}>
        체중이 아니라 <strong style={{ color: FM.ink }}>식사·수면·활동·컨디션의 패턴</strong>을 봅니다. 같은 시트에 14일을 남기고, 무리한 신호가 보이면 멈춤.
      </div>

      {/* FIX 3: anchor */}
      <div style={{ marginTop: 14, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: FM.bgAlt, border: `1.5px solid ${FM.success}30`, borderRadius: 8 }}>
          <div style={{ display: 'grid', gap: 2 }}>
            <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>앵커</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: FM.ink }}>
              <span style={{ background: '#DCEFE2', padding: '2px 6px', borderRadius: 4 }}>관찰 시작일</span>
            </div>
          </div>
          <div style={{ width: 1, height: 28, background: FM.line }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 7 }}>
            <Icon name="calendar" size={14} color={FM.primary}/>
            <span className="fm-num" style={{ fontSize: 14, fontWeight: 600, color: FM.ink }}>{DH.startDate}</span>
          </div>
          <div style={{ fontSize: 12, color: FM.muted }}>14일 관찰 시트가 만들어졌어요 · 오늘 Day 8</div>
          <Pin n={3} tone="good" style={{ position: 'absolute', top: -8, left: -8 }}/>
        </div>
      </div>

      {/* FIX 1: STOP signals — extracted to caution panel ABOVE the artifact */}
      <div style={{ marginTop: 16, position: 'relative' }}>
        <div style={{ padding: 14, background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Icon name="alert" size={16} color={FM.danger}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#7C2D2D', display: 'flex', alignItems: 'center', gap: 8 }}>
                중단 신호 <span style={{ fontSize: 11, fontWeight: 600, color: '#7C2D2D', opacity: 0.7 }}>(체크 항목이 아닙니다 — 해당되면 즉시 멈춤)</span>
              </div>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#7C2D2D', fontSize: 12, lineHeight: 1.7 }}>
                <li>통증 또는 어지러움이 24시간 이상 지속</li>
                <li>폭식 유발감이 한 주에 2회 이상 반복</li>
                <li>위 신호가 보이면 의료/영양 상담 후 재시작 — 그 사이엔 시트만 보관</li>
              </ul>
            </div>
          </div>
        </div>
        <Pin n={1} tone="good" style={{ position: 'absolute', top: -8, left: -8 }}/>
      </div>

      {/* FIX 2: principles as caption (not checkbox) */}
      <div style={{ marginTop: 12, position: 'relative' }}>
        <div style={{ padding: '10px 14px', background: FM.bgAlt, border: `1px dashed ${FM.line}`, borderRadius: 6, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="info" size={14} color={FM.muted}/>
          <div style={{ fontSize: 11.5, color: FM.muted, lineHeight: 1.6 }}>
            <strong style={{ color: FM.inkSoft }}>관찰 원칙.</strong> 체중 숫자가 아니라 식사·수면·활동 패턴을 봅니다. 무리한 제한은 다음 주 폭식으로 이어질 수 있어요 — 강도 대신 지속을 봅니다.
          </div>
        </div>
        <Pin n={2} tone="good" style={{ position: 'absolute', top: -8, left: -8 }}/>
      </div>

      {/* artifact: full sheet now without buried decisions */}
      <div style={{ marginTop: 16 }}>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${FM.lineSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>관찰 기록표 · primary</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: FM.ink, marginTop: 2 }}>14일 시트 · Day 1 → Day 14</div>
                <div style={{ fontSize: 11.5, color: FM.muted, marginTop: 3 }}>오늘 Day 8 · 6/01 ~ 6/14 · 시트로 받아 본인 노션·구글시트·메모로 가져가세요</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="primary" size="sm" icon={<Icon name="sheet" size={13}/>}>시트로 받기 · .xlsx</Btn>
                <Btn variant="outline" size="sm" icon={<Icon name="copy" size={13}/>}>주간 요약 복사</Btn>
              </div>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <ObservationSheet rows={DH_ROWS} today={DH.todayDay}/>
            <div style={{ marginTop: 10, padding: '8px 12px', background: FM.warningBg, border: `1px solid #EAD9A3`, borderRadius: 6, fontSize: 11.5, color: FM.warningInk, lineHeight: 1.5 }}>
              Day 4 컨디션 “폭식감” 1회 기록됨 — 같은 주 안에 반복되면 위쪽 중단 신호를 다시 확인하세요.
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
        {[
          [1, 'stop-condition 3줄을 빨간 caution 패널로 분리해 artifact 위쪽에 고정. 체크박스 처리 차단 — “해당되면 즉시 멈춤”이라고 명시.'],
          [2, '원칙은 점선 박스 + info 아이콘으로 caption화. 안 읽혀도 좋지만 체크박스로 잘못 처리되는 일은 없음.'],
          [3, 'anchor는 “관찰 시작일” + 입력 즉시 “14일 관찰 시트가 만들어졌어요 · 오늘 Day 8”까지 한 줄에.'],
        ].map(([n, t]) => (
          <div key={n} style={{ padding: '8px 12px', background: FM.successBg, border: `1px solid #C6E1CF`, borderRadius: 6, display: 'flex', gap: 8 }}>
            <Pin n={n} tone="good"/>
            <div style={{ fontSize: 11.5, color: FM.success, lineHeight: 1.5 }}>{t}</div>
          </div>
        ))}
      </div>
    </CSFrame>
  );
}

// ═══════════════════════════════════════════════════════════════
// Mobile — BEFORE / AFTER
// ═══════════════════════════════════════════════════════════════
function DietMobileBefore() {
  return (
    <CSMobileShell tone="bad" label="14일 시트가 가로 스크롤로 잘림 · stop 신호가 list 하단에 묻힘">
      <Phone>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', justifyContent: 'space-between' }}>
          <Icon name="chev" size={18} color={FM.ink} sw={2}/>
          <div style={{ fontSize: 12, fontWeight: 600, color: FM.muted }}>flows / 식습관 2주</div>
          <Icon name="share" size={18} color={FM.ink}/>
        </div>

        <div style={{ padding: '4px 18px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: '#B91C1C' }}/>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: FM.inkSoft }}>건강 · 식습관</span>
            <Badge tone="draft" icon={<Icon name="flag" size={10}/>}>초안 깃발</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: FM.ink, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            2주 식습관 관찰
          </h1>

          {/* Sheet preview — horizontal scroll cuts it off */}
          <div style={{ marginTop: 14, position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>관찰 기록표</div>
            <div style={{ overflowX: 'auto', borderRadius: 6, border: `1px solid ${FM.lineSoft}` }}>
              <div style={{ minWidth: 720 }}>
                <ObservationSheet rows={DH_ROWS.slice(0, 3)} today={DH.todayDay}/>
              </div>
            </div>
            <div style={{ position: 'absolute', top: '60%', right: 0, padding: '4px 8px', background: FM.dangerBg, borderRadius: 4, fontSize: 10, color: FM.danger, fontWeight: 700 }}>
              ← 가로 스크롤 잘림
            </div>
            <Pin n={1} tone="bad" style={{ position: 'absolute', top: -4, right: -4 }}/>
          </div>

          {/* 중단·상담 관찰 — buried at bottom */}
          <div style={{ marginTop: 16, position: 'relative' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: FM.muted, marginBottom: 6 }}>중단·상담 관찰</div>
            <div style={{ background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 8, overflow: 'hidden' }}>
              {[
                '체중보다 식사·수면·활동 패턴을 먼저 보기',
                '무리한 제한으로 폭식 유발감이 생겼는지 확인하기',
                '통증·어지러움·폭식 유발감이 반복되면 멈추고 상담',
              ].map((t, i, arr) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '20px 1fr', gap: 10, alignItems: 'center',
                  padding: '10px 12px', borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
                }}>
                  <input type="checkbox" className="fm-check"/>
                  <div style={{ fontSize: 12.5, color: FM.ink, lineHeight: 1.4 }}>{t}</div>
                </div>
              ))}
            </div>
            <Pin n={2} tone="bad" style={{ position: 'absolute', top: -4, right: -4 }}/>
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 18px 18px', background: 'rgba(255,255,255,0.92)',
          borderTop: `1px solid ${FM.line}`, backdropFilter: 'blur(8px)',
        }}>
          <div style={{ position: 'relative' }}>
            <button style={{
              width: '100%', padding: '14px',
              background: FM.ink, color: '#fff',
              border: 'none', borderRadius: 10,
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Icon name="download" size={15}/>
              <span style={{ background: 'rgba(255,255,255,0.18)', padding: '1px 6px', borderRadius: 4 }}>내 도구로 가져가기</span>
            </button>
            <Pin n={3} tone="bad" style={{ position: 'absolute', top: -6, right: -6 }}/>
          </div>
        </div>
      </Phone>

      <div style={{ marginTop: 12, maxWidth: 420, display: 'grid', gap: 6 }}>
        <div style={{ padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={1} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>모바일에 가로 720px 시트가 강제 표시 — 컨디션 컬럼은 잘림. 사용자가 “보긴 어렵고 export는 어떻게?” 상태.</div>
        </div>
        <div style={{ padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={2} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>stop 신호가 시트 아래 일반 체크 항목. 스크롤하다 그냥 체크하고 넘어갈 위험.</div>
        </div>
        <div style={{ padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={3} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>sticky CTA가 추상 — 시트로 가는지 어디로 가는지 모름.</div>
        </div>
      </div>
    </CSMobileShell>
  );
}

function DietMobileAfter() {
  return (
    <CSMobileShell tone="good" label="중단 신호 banner-first · 시트는 요약 카드 + ‘시트로 받기 · .xlsx’">
      <Phone>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', justifyContent: 'space-between' }}>
          <Icon name="chev" size={18} color={FM.ink} sw={2}/>
          <div style={{ fontSize: 12, fontWeight: 600, color: FM.muted }}>flows / 식습관 2주</div>
          <Icon name="share" size={18} color={FM.ink}/>
        </div>

        <div style={{ padding: '4px 18px 100px' }}>
          {/* STOP signals banner — first thing on the page */}
          <div style={{ marginBottom: 12, position: 'relative' }}>
            <div style={{ padding: 10, background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 10, display: 'flex', gap: 9 }}>
              <Icon name="alert" size={13} color={FM.danger}/>
              <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>
                <strong>중단 신호.</strong> 통증·어지러움 24h+ / 폭식감 주 2회+ → 즉시 멈춤, 의료·영양 상담.
              </div>
            </div>
            <Pin n={1} tone="good" style={{ position: 'absolute', top: -4, right: -4 }}/>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: '#B91C1C' }}/>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: FM.inkSoft }}>건강 · 식습관 관찰</span>
            <Badge tone="draft" icon={<Icon name="flag" size={10}/>}>초안 깃발</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: FM.ink, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            2주 식습관 관찰
          </h1>

          {/* anchor */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 6 }}>
              <span style={{ background: '#DCEFE2', padding: '1px 6px', borderRadius: 3, color: FM.success }}>관찰 시작일</span>
            </div>
            <button style={{ width: '100%', padding: '14px', background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="calendar" size={16} color={FM.primary}/>
              <span className="fm-num" style={{ fontSize: 15, fontWeight: 600, color: FM.ink }}>{DH.startDate}</span>
              <div style={{ flex: 1 }}/>
              <Icon name="chev-d" size={14} color={FM.faint}/>
            </button>
            <div style={{ marginTop: 6, fontSize: 11.5, color: FM.success, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="check" size={12}/> 14일 시트가 만들어졌어요 · 오늘 Day 8
            </div>
          </div>

          {/* Summary card — instead of horizontal-scroll table */}
          <div style={{ marginTop: 16, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>이번 주 요약</div>
              <span style={{ fontSize: 11, color: FM.muted }}>Day 1–7 완료</span>
            </div>
            <div style={{ background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  ['평균 수면', '6.6h', null],
                  ['활동한 날', '4 / 7', null],
                  ['폭식감', '1회 (Day 4)', 'warn'],
                ].map(([k, v, tone]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10.5, color: FM.muted, fontWeight: 600 }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: tone === 'warn' ? FM.warningInk : FM.ink, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, padding: 10, background: FM.warningBg, borderRadius: 6, fontSize: 11.5, color: FM.warningInk, lineHeight: 1.5 }}>
                Day 4 폭식감 1회 — 한 주 안에 반복되면 위쪽 중단 신호 다시 확인.
              </div>
            </div>
            <Pin n={2} tone="good" style={{ position: 'absolute', top: -4, right: -4 }}/>
          </div>

          {/* Today's quick log */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>오늘 (Day 8 · 06.08)</div>
            <div style={{ background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10, padding: 12, display: 'grid', gap: 8 }}>
              {[['아침', '오트밀'], ['점심', '도시락'], ['저녁', '—'], ['컨디션 메모', '관찰중']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: k === '컨디션 메모' ? 'none' : `1px solid ${FM.lineSoft}` }}>
                  <span style={{ fontSize: 12, color: FM.muted, fontWeight: 600 }}>{k}</span>
                  <span style={{ fontSize: 12.5, color: v === '—' ? FM.faint : FM.ink, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '10px 18px 18px', background: 'rgba(255,255,255,0.92)',
          borderTop: `1px solid ${FM.line}`, backdropFilter: 'blur(8px)',
        }}>
          <div style={{ position: 'relative' }}>
            <button style={{
              width: '100%', padding: '14px',
              background: FM.primary, color: '#fff',
              border: 'none', borderRadius: 10,
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Icon name="sheet" size={15}/>
              <span style={{ background: 'rgba(255,255,255,0.18)', padding: '1px 6px', borderRadius: 4 }}>시트로 받기 · .xlsx</span>
            </button>
            <div style={{ marginTop: 6, fontSize: 11, color: FM.muted, textAlign: 'center' }}>
              구글시트·노션·엑셀에서 그대로 열 수 있어요
            </div>
            <Pin n={3} tone="good" style={{ position: 'absolute', top: -6, right: -6 }}/>
          </div>
        </div>
      </Phone>

      <div style={{ marginTop: 12, maxWidth: 420, display: 'grid', gap: 6 }}>
        <div style={{ padding: '8px 12px', background: FM.successBg, border: `1px solid #C6E1CF`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={1} tone="good"/>
          <div style={{ fontSize: 11.5, color: FM.success, lineHeight: 1.5 }}>health-sensitive 라우트는 의도(중단 신호)가 첫 줄. 메타·제목보다 위.</div>
        </div>
        <div style={{ padding: '8px 12px', background: FM.successBg, border: `1px solid #C6E1CF`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={2} tone="good"/>
          <div style={{ fontSize: 11.5, color: FM.success, lineHeight: 1.5 }}>가로 스크롤 표 대신 “이번 주 요약” 카드 3칸 + 폭식감 강조 — 전체는 시트로.</div>
        </div>
        <div style={{ padding: '8px 12px', background: FM.successBg, border: `1px solid #C6E1CF`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={3} tone="good"/>
          <div style={{ fontSize: 11.5, color: FM.success, lineHeight: 1.5 }}>sticky CTA가 “시트로 받기 · .xlsx”. 그 아래 한 줄로 어디서 열 수 있는지까지 명시.</div>
        </div>
      </div>
    </CSMobileShell>
  );
}

// ═══════════════════════════════════════════════════════════════
// Rationale — diet-specific (A3 중심)
// ═══════════════════════════════════════════════════════════════
function DietRationaleDoc() {
  return (
    <div className="fm fm-scroll" style={{ height: '100%', overflowY: 'auto', background: FM.bg, padding: '40px 56px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: FM.ink, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 10 }}>F</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: FM.ink }}>FlowMe</div>
          <Badge tone="danger" icon={<Icon name="alert" size={11}/>}>Health-sensitive · diet-habit-2week</Badge>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: FM.muted }}>validation-routes-ux-review.md A3 + B2</div>
        </div>

        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: FM.ink, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
          decision과 observation은 같은 list에 넣지 않는다
        </h1>
        <p style={{ marginTop: 10, fontSize: 14, color: FM.inkSoft, lineHeight: 1.7 }}>
          `diet-habit-2week`은 testable_content.md가 두 번째 observed-session 후보로 지목한 health-sensitive 라우트다. 가장 큰 위험은 “관찰 도구”로 만들어 놓은 것을 사용자가 “다이어트 코칭”으로 오해하는 것이다. 그 오해는 stop-condition(결정 기준)이 일반 관찰 항목과 같은 체크박스로 노출되는 순간 시작된다.
        </p>

        {/* fix table */}
        <div style={{ marginTop: 24, border: `1px solid ${FM.line}`, borderRadius: 8, overflow: 'hidden' }}>
          {[
            ['A3', 'decision이 observation list 안', '“통증·어지러움 반복되면 멈춤”이 일반 체크박스', 'artifact 위쪽 빨간 caution 패널로 분리 — “해당되면 즉시 멈춤” 명시', 'seed text의 ## 중단·상담 관찰 섹션을 stop_conditions/principles 두 필드로 분리'],
            ['A3-b', '원칙이 observation list 안', '“체중보다 패턴 보기”가 체크 항목', 'caption 박스로 빼서 안내 톤으로', 'principles[] 필드, list 렌더 제외'],
            ['A2', 'anchor가 “시작일”', '무엇의 시작일인지 첫 화면에 안 보임', '“관찰 시작일” + 입력 즉시 “14일 시트 · 오늘 Day 8”', 'setup_anchor_label = "관찰 시작일"'],
            ['A1', '추상 export CTA', '“내 도구로 가져가기”', '“시트로 받기 · .xlsx” + “구글시트·노션·엑셀에서 열 수 있어요”', 'primary_destination = "sheet" → label 매핑'],
            ['B2', '14일 표가 모바일에서 가로 스크롤', '컨디션 컬럼 잘림', '“이번 주 요약 카드” + 시트로 받기', '모바일 layout 조건부 분기'],
          ].map(([id, prob, before, after, fix], i, arr) => (
            <div key={id} style={{
              display: 'grid', gridTemplateColumns: '70px 1fr 1.2fr 1.4fr 1.4fr',
              borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
            }}>
              <div style={{ padding: '12px 14px', background: id.startsWith('A3') ? FM.dangerBg : FM.bgAlt, borderRight: `1px solid ${FM.lineSoft}`, fontSize: 11, fontWeight: 700, color: id.startsWith('A3') ? FM.danger : FM.primary, letterSpacing: '0.04em' }}>{id}</div>
              <div style={{ padding: '12px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, fontWeight: 600, color: FM.ink, lineHeight: 1.5 }}>{prob}</div>
              <div style={{ padding: '12px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: FM.danger, lineHeight: 1.5 }}>{before}</div>
              <div style={{ padding: '12px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: FM.success, lineHeight: 1.5, fontWeight: 500 }}>{after}</div>
              <div style={{ padding: '12px 14px', fontSize: 11.5, color: FM.muted, lineHeight: 1.55 }}>{fix}</div>
            </div>
          ))}
        </div>

        {/* Decision vs Observation principle box */}
        <div style={{ marginTop: 26, padding: 18, background: '#FCEAEA', border: `1px solid #F2C2C2`, borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7C2D2D', letterSpacing: '0.04em', textTransform: 'uppercase' }}>원칙</div>
          <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: '#7C2D2D', lineHeight: 1.5 }}>
            decision은 list에 들어가지 않는다.
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#7C2D2D', lineHeight: 1.7 }}>
            관찰(observation), 원칙(principle), 결정 기준(decision) 세 가지가 한 list에 섞이면 사용자는 가장 부담이 적은 행동(체크박스 클릭)으로 모두 처리한다. 결정 기준은 결정을 내려야 하는 모멘트의 위치에 별도 패널로, 원칙은 caption으로, 관찰만 체크 가능한 행으로 둔다.
          </div>
        </div>

        <h2 style={{ marginTop: 32, fontSize: 16, fontWeight: 700, color: FM.ink, letterSpacing: '-0.01em' }}>
          이 패턴이 같이 적용돼야 하는 라우트
        </h2>
        <div style={{ marginTop: 12, border: `1px solid ${FM.line}`, borderRadius: 8, overflow: 'hidden' }}>
          {[
            ['real-thankyou-bubu-home-workout-starter', '운동 직후 통증/어지러움 행', '루틴 위쪽 “멈춤 신호” 패널로 분리'],
            ['baby-food-menu-recipe', '알레르기 의심 반응 행', '응급 정지 조건 패널 (이미 적용됨 — 확인 필요)'],
            ['new-car-delivery-check', '“보류 후 영업소 신청” 안내', '“인수 보류 기준” 섹션 신설(A6)과 묶음'],
            ['used-car-buying-check', '“압류·저당 발견 시 보류” 안내', '“계약 보류 기준” 섹션 신설'],
            ['vehicle-inspection-prep', '“검사 부적합 시 즉시 정비” 안내', '결과 시트 위쪽 caution 패널'],
          ].map(([route, item, fix], i, arr) => (
            <div key={route} style={{
              display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 1.4fr',
              borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
            }}>
              <div className="fm-mono" style={{ padding: '10px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 11.5, color: FM.primaryInk, fontWeight: 600 }}>{route}</div>
              <div style={{ padding: '10px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: FM.ink }}>{item}</div>
              <div style={{ padding: '10px 14px', fontSize: 12, color: FM.success, fontWeight: 500 }}>{fix}</div>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: 32, fontSize: 16, fontWeight: 700, color: FM.ink, letterSpacing: '-0.01em' }}>
          PR로 묶는 법
        </h2>
        <ol style={{ marginTop: 8, paddingLeft: 18, display: 'grid', gap: 8, fontSize: 13.5, color: FM.inkSoft, lineHeight: 1.65 }}>
          <li>
            <strong style={{ color: FM.ink }}>PR-4 · Flow schema에 `stop_conditions[]`, `principles[]` 추가.</strong>
            seed-flows.ts의 dietHabitText를 일반 list에서 빼고 별도 필드로 분리. 다른 health-sensitive 라우트에 동일 schema 사용 가능.
          </li>
          <li>
            <strong style={{ color: FM.ink }}>PR-5 · Health-sensitive 라우트의 첫 화면 위치 규칙 1줄 추가.</strong>
            “stop_conditions가 있으면 page header 위에 caution 패널 렌더”. PR-4 머지 후 자동 동작.
          </li>
          <li>
            <strong style={{ color: FM.ink }}>PR-6 · 모바일 표는 요약 카드 + 시트 패턴 일반화.</strong>
            현재 `2026-05-25-mobile-log-summary-card-pass`에 diet-habit-2week만 적용. new-car / vehicle-inspection / baby-food의 표에도 확장.
          </li>
        </ol>

        <div style={{ marginTop: 32, padding: 16, background: FM.bgAlt, border: `1px solid ${FM.line}`, borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>변경하지 않음</div>
          <div style={{ marginTop: 8, fontSize: 13, color: FM.inkSoft, lineHeight: 1.65 }}>
            “건강한 식습관”, “2주 후 변화 예상” 같은 outcome 문구 추가 금지.<br/>
            체중 입력 필드 신설 금지 — 현재 라우트는 ‘체중이 아니라 패턴을 본다’가 원칙.<br/>
            의료/영양 상담 연결 자동화·예약 기능 금지 — observed session 결과 전까지는 사용자가 알아서 가도록.
          </div>
        </div>

        <div style={{ height: 60 }}/>
      </div>
    </div>
  );
}

Object.assign(window, {
  DietDesktopBefore, DietDesktopAfter,
  DietMobileBefore, DietMobileAfter,
  DietRationaleDoc,
});
