// FlowMe — computer-skills-d30-study Before/After
// Validation review의 A1·A2·A4를 한 라우트에서 동시에 보여주는 spec.
//
//   A1. 모바일 sticky CTA 카피 → 산출물별 동적
//   A2. anchor 라벨 “기준 날짜” → “시험일을 알려주세요”
//   A4. `## D-7` 안에 D-1 항목 섞임 → `## D-1` 분리
//
// 4개 아트보드:
//   - CSDesktopBefore / CSDesktopAfter
//   - CSMobileBefore  / CSMobileAfter
// 마지막에 CSRationaleDoc — 변경 근거 + 다른 라우트로의 복제 가이드.

const CS_SOURCE = {
  category: '학습 · 자격증', dot: '#0F766E',
  examDate: '2026. 06. 22 (월)',
  todayStr: '2026. 05. 26',
  // D-30 = 2026.05.23, D-21 = 2026.06.01, D-14 = 2026.06.08, D-7 = 2026.06.15, D-1 = 2026.06.21
};

// 12개 항목 (D-30 → D-1)
const CS_ITEMS_AFTER = [
  // D-30 (3)
  { d: 'D-30', date: '05.23', section: 'D-30', t: '시험 범위와 출제 비중 정리하기',         tag: '경험', done: false },
  { d: 'D-30', date: '05.23', section: 'D-30', t: '남은 기간을 주차별 목표로 나누기',         tag: '경험', done: false },
  { d: 'D-30', date: '05.23', section: 'D-30', t: '매일 공부 가능한 시간 블록 표시하기',     tag: '경험', done: false },
  // D-21 (3)
  { d: 'D-21', date: '06.01', section: 'D-21', t: '핵심 개념 1회독 시작하기',                  tag: '경험', done: false },
  { d: 'D-21', date: '06.01', section: 'D-21', t: '단원별 헷갈리는 개념 표시하기',             tag: '경험', done: false },
  { d: 'D-21', date: '06.01', section: 'D-21', t: '기출 또는 예제 문제를 가볍게 풀기',         tag: '경험', done: false },
  // D-14 (3)
  { d: 'D-14', date: '06.08', section: 'D-14', t: '자주 틀리는 유형 노트 만들기',              tag: '경험', done: false },
  { d: 'D-14', date: '06.08', section: 'D-14', t: '시간 제한을 두고 문제 세트 풀기',           tag: '경험', done: false },
  { d: 'D-14', date: '06.08', section: 'D-14', t: '오답 원인을 개념/계산/실수로 분류하기',     tag: '경험', done: false },
  // D-7 (2) — 실전 정리만
  { d: 'D-7',  date: '06.15', section: 'D-7',  t: '실전처럼 모의고사 1회 풀기',                tag: '경험', done: false },
  { d: 'D-7',  date: '06.15', section: 'D-7',  t: '암기표와 오답노트만 남기기',                tag: '경험', done: false },
  // D-1 (1) — 분리됨
  { d: 'D-1',  date: '06.21', section: 'D-1',  t: '시험 당일 준비물과 이동 시간 확인하기',     tag: '공식', done: false },
];

// Before의 D-7 안에 D-1이 섞인 그룹핑
const CS_ITEMS_BEFORE_D7 = [
  { d: 'D-7',  date: '06.15', t: '실전처럼 모의고사 1회 풀기',                tag: '경험', done: false },
  { d: 'D-7',  date: '06.15', t: '암기표와 오답노트만 남기기',                tag: '경험', done: false },
  { d: 'D-1',  date: '06.21', t: '시험 당일 준비물과 이동 시간 확인하기',     tag: '공식', done: false, mismatch: true },
];

// ═══════════════════════════════════════════════════════════════
// Annotation pin — 빨간/파란 number bubble
// ═══════════════════════════════════════════════════════════════
function Pin({ n, tone = 'bad', style = {} }) {
  const tones = {
    bad:  { bg: FM.danger, fg: '#fff' },
    good: { bg: FM.success, fg: '#fff' },
    info: { bg: FM.primary, fg: '#fff' },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-grid', placeItems: 'center',
      width: 18, height: 18, borderRadius: 9,
      background: t.bg, color: t.fg,
      fontSize: 10.5, fontWeight: 700, fontFamily: 'Inter, sans-serif',
      letterSpacing: 0, flexShrink: 0,
      ...style,
    }}>{n}</span>
  );
}

function FrameLabel({ tone = 'bad', children }) {
  const tones = {
    bad:  { bg: FM.dangerBg,  bd: '#F2C2C2', fg: '#7C2D2D' },
    good: { bg: FM.successBg, bd: '#C6E1CF', fg: FM.success },
  };
  const t = tones[tone];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: t.bg, border: `1px solid ${t.bd}`, color: t.fg,
      fontSize: 11, fontWeight: 700, letterSpacing: '-0.005em',
    }}>
      {tone === 'bad' ? '✕  현재 (BEFORE)' : '✓  제안 (AFTER)'}
      <span style={{ fontWeight: 600, opacity: 0.8 }}>·  {children}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Desktop — shared shell (without TopBar for tight focus)
// ═══════════════════════════════════════════════════════════════
function CSFrame({ tone, label, children }) {
  return (
    <div className="fm" style={{ width: '100%', height: '100%', background: FM.page, padding: 20, overflow: 'hidden' }}>
      <div style={{ marginBottom: 12 }}>
        <FrameLabel tone={tone}>{label}</FrameLabel>
      </div>
      <div className="fm-scroll" style={{
        height: 'calc(100% - 48px)', overflowY: 'auto',
        background: FM.bg, border: `1px solid ${tone === 'bad' ? '#F2C2C2' : '#C6E1CF'}`,
        borderRadius: 10, padding: 24,
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── BEFORE — desktop ────────────────────────────────────────
function CSDesktopBefore() {
  return (
    <CSFrame tone="bad" label="문제 3개: anchor 라벨 · D-N 그룹핑 · export 카피">
      {/* meta line — same in both */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: CS_SOURCE.dot }}/>
        <span style={{ fontSize: 12, fontWeight: 600, color: FM.inkSoft }}>{CS_SOURCE.category}</span>
        <span style={{ width: 1, height: 12, background: FM.line }}/>
        <span style={{ fontSize: 12, color: FM.muted }}>timeline · D-Day · @매일 60~90분</span>
        <div style={{ flex: 1 }}/>
        <Badge tone="draft" icon={<Icon name="flag" size={11}/>}>초안 깃발</Badge>
      </div>

      <h1 style={{ margin: '12px 0 4px', fontSize: 24, fontWeight: 700, color: FM.ink, letterSpacing: '-0.022em', lineHeight: 1.2 }}>
        컴활 1급 — D-30 학습표
      </h1>
      <div style={{ fontSize: 13, color: FM.inkSoft, lineHeight: 1.55, maxWidth: 620 }}>
        시나공 교재 목차 기반 학습 행. 시험일을 기준으로 D-N 일정과 오답 기록표를 만들 수 있습니다.
      </div>

      {/* ─── PROBLEM 1: anchor label is generic ─── */}
      <div style={{ marginTop: 16, position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', background: FM.bgAlt,
          border: `1px solid ${FM.line}`, borderRadius: 8,
        }}>
          <div style={{ display: 'grid', gap: 2 }}>
            <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>앵커</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: FM.ink }}>
              <span style={{ background: '#FDE4E4', padding: '2px 6px', borderRadius: 4 }}>기준 날짜</span>
            </div>
          </div>
          <div style={{ width: 1, height: 28, background: FM.line }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 7, minWidth: 180 }}>
            <Icon name="calendar" size={14} color={FM.faint}/>
            <span className="fm-num" style={{ fontSize: 14, fontWeight: 500, color: FM.faint, letterSpacing: '-0.01em' }}>날짜를 입력하세요</span>
          </div>
          <Pin n={1} tone="bad" style={{ position: 'absolute', top: -8, left: -8 }}/>
        </div>
        <div style={{ marginTop: 8, padding: '6px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Pin n={1} tone="bad"/>
          <span style={{ fontSize: 11.5, color: '#7C2D2D' }}>
            <strong>“기준 날짜”</strong>가 무엇을 가리키는지 첫 화면에선 알 수 없음. 학습량 anchor(매일 60–90분)와 시험일 anchor가 함께 표시되어 사용자가 무엇을 먼저 입력해야 할지 두 번 생각해야 함.
          </span>
        </div>
      </div>

      {/* artifact card with PROBLEM 2 (D-N mismatch) and PROBLEM 3 (export copy) */}
      <div style={{ position: 'relative', marginTop: 20 }}>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          {/* card header */}
          <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${FM.lineSoft}`, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>학습 진행표 · primary</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: FM.ink, letterSpacing: '-0.015em', marginTop: 2 }}>D-30 학습 행</div>
              </div>
              {/* PROBLEM 3: generic export copy */}
              <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
                <Pin n={3} tone="bad" style={{ position: 'absolute', top: -10, right: -8 }}/>
                <Btn variant="outline" size="sm" icon={<Icon name="download" size={13}/>}>
                  <span style={{ background: '#FDE4E4', padding: '1px 4px', borderRadius: 3 }}>엑셀로 받기</span>
                </Btn>
                <Btn variant="outline" size="sm" icon={<Icon name="download" size={13}/>}>
                  <span style={{ background: '#FDE4E4', padding: '1px 4px', borderRadius: 3 }}>캘린더로 받기</span>
                </Btn>
              </div>
            </div>
          </div>

          {/* D-7 group with mismatch — PROBLEM 2 */}
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, position: 'relative' }}>
              <Pin n={2} tone="bad" style={{ position: 'absolute', left: -28, top: 0 }}/>
              <div style={{ fontSize: 12, fontWeight: 700, color: FM.ink, letterSpacing: '-0.005em' }}>
                <span style={{ background: '#FDE4E4', padding: '1px 6px', borderRadius: 4 }}>D-7 실전 정리</span>
              </div>
              <span style={{ fontSize: 11, color: FM.muted }}>· 3개 항목</span>
            </div>
            <div style={{ border: `1px solid ${FM.lineSoft}`, borderRadius: 6, overflow: 'hidden' }}>
              {CS_ITEMS_BEFORE_D7.map((it, i, arr) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '20px 84px 1fr auto', gap: 12, alignItems: 'center',
                  padding: '10px 12px', borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
                  background: it.mismatch ? '#FDF6F6' : 'transparent',
                }}>
                  <input type="checkbox" className="fm-check"/>
                  <div className="fm-mono" style={{
                    fontSize: 11.5, fontWeight: 600,
                    color: it.mismatch ? FM.danger : FM.primaryInk,
                  }}>
                    {it.mismatch && <span style={{ background: FM.dangerBg, padding: '1px 4px', borderRadius: 3 }}>{it.d} · {it.date}</span>}
                    {!it.mismatch && <>{it.d} · {it.date}</>}
                  </div>
                  <div style={{ fontSize: 13, color: FM.ink, fontWeight: 500 }}>{it.t}</div>
                  <Badge tone={it.tag === '공식' ? 'blue' : 'outline'}>{it.tag}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div style={{ marginTop: 8, padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={2} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>
            <strong>D-N 그룹핑 깨짐.</strong> 섹션 헤더는 D-7인데 안에 D-1 항목이 섞여 있음. 캘린더 export 시 D-7 그룹으로 잡혀 6월 15일에 알람이 울리게 됨 — 사용자는 시험 전날(6월 21일)에 알림을 기대.
          </div>
        </div>
        <div style={{ marginTop: 6, padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={3} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>
            <strong>“엑셀로 받기 / 캘린더로 받기”는 도구 이름.</strong> 목적지가 빠져 있고 무엇을 가져갈지가 안 보임. design.md §11이 금지한 추상어 계열.
          </div>
        </div>
      </div>
    </CSFrame>
  );
}

// ─── AFTER — desktop ────────────────────────────────────────
function CSDesktopAfter() {
  // group items by section
  const grouped = {};
  CS_ITEMS_AFTER.forEach(it => { (grouped[it.section] ||= []).push(it); });

  return (
    <CSFrame tone="good" label="3개 모두 적용 — 첫 화면이 ‘시험일 입력 → 캘린더 export’ 한 흐름으로 좁아짐">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: CS_SOURCE.dot }}/>
        <span style={{ fontSize: 12, fontWeight: 600, color: FM.inkSoft }}>{CS_SOURCE.category}</span>
        <span style={{ width: 1, height: 12, background: FM.line }}/>
        <span style={{ fontSize: 12, color: FM.muted }}>timeline · D-Day</span>
        <span style={{ fontSize: 11, color: FM.faint }}>· 제작자 권장: 매일 60–90분</span>
        <div style={{ flex: 1 }}/>
        <Badge tone="draft" icon={<Icon name="flag" size={11}/>}>초안 깃발</Badge>
      </div>

      <h1 style={{ margin: '12px 0 4px', fontSize: 24, fontWeight: 700, color: FM.ink, letterSpacing: '-0.022em', lineHeight: 1.2 }}>
        컴활 1급 — D-30 학습표
      </h1>
      <div style={{ fontSize: 13, color: FM.inkSoft, lineHeight: 1.55, maxWidth: 620 }}>
        시험일을 알려주시면 시나공 교재 목차에서 가져온 D-30 학습 행이 캘린더와 시트로 들어갑니다.
      </div>

      {/* FIX 1: specific anchor label */}
      <div style={{ marginTop: 16, position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', background: FM.bgAlt,
          border: `1.5px solid ${FM.success}30`, borderRadius: 8,
        }}>
          <div style={{ display: 'grid', gap: 2 }}>
            <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>앵커</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: FM.ink }}>
              <span style={{ background: '#DCEFE2', padding: '2px 6px', borderRadius: 4 }}>시험일을 알려주세요</span>
            </div>
          </div>
          <div style={{ width: 1, height: 28, background: FM.line }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 7, minWidth: 180 }}>
            <Icon name="calendar" size={14} color={FM.primary}/>
            <span className="fm-num" style={{ fontSize: 14, fontWeight: 600, color: FM.ink, letterSpacing: '-0.01em' }}>{CS_SOURCE.examDate}</span>
            <Icon name="chev-d" size={14} color={FM.faint}/>
          </div>
          <div style={{ fontSize: 12, color: FM.muted }}>이 날짜를 기준으로 D-30 학습표가 채워졌어요</div>
          <div style={{ flex: 1 }}/>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: FM.success, fontWeight: 600 }}>
            <Icon name="check" size={13}/> 12개 행 갱신됨
          </div>
          <Pin n={1} tone="good" style={{ position: 'absolute', top: -8, left: -8 }}/>
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: 20 }}>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${FM.lineSoft}`, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>학습 캘린더 · primary</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: FM.ink, letterSpacing: '-0.015em', marginTop: 2 }}>D-30 학습 행</div>
                <div style={{ fontSize: 11.5, color: FM.muted, marginTop: 3 }}>5/23 ~ 6/21 · 12개 항목 · 시험일 06.22</div>
              </div>
              {/* FIX 3: destination-explicit */}
              <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
                <Pin n={3} tone="good" style={{ position: 'absolute', top: -10, right: -8 }}/>
                <Btn variant="primary" size="sm" icon={<Icon name="calendar" size={13}/>}>
                  <span style={{ background: 'rgba(255,255,255,0.18)', padding: '1px 4px', borderRadius: 3 }}>캘린더에 넣기 · .ics</span>
                </Btn>
                <Btn variant="outline" size="sm" icon={<Icon name="sheet" size={13}/>}>
                  시트로 받기 · .xlsx
                </Btn>
              </div>
            </div>
          </div>

          {/* FIX 2: D-N grouped cleanly */}
          <div style={{ padding: 16, position: 'relative' }}>
            <Pin n={2} tone="good" style={{ position: 'absolute', left: -8, top: 12 }}/>
            <div style={{ display: 'grid', gap: 14 }}>
              {['D-30', 'D-21', 'D-14', 'D-7', 'D-1'].map((sec) => (
                <div key={sec}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div className="fm-mono" style={{ fontSize: 12, fontWeight: 700, color: sec === 'D-1' ? FM.warningInk : FM.primaryInk, padding: '2px 8px', background: sec === 'D-1' ? FM.warningBg : FM.primaryBg, borderRadius: 4 }}>{sec}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: FM.ink }}>
                      {sec === 'D-30' && '범위와 기준 잡기'}
                      {sec === 'D-21' && '1회독 실행'}
                      {sec === 'D-14' && '문제풀이 전환'}
                      {sec === 'D-7' && '실전 정리'}
                      {sec === 'D-1' && '시험 전날 점검'}
                    </div>
                    <span style={{ fontSize: 11, color: FM.muted }}>· {grouped[sec].length}개</span>
                    {sec === 'D-1' && (
                      <span style={{ marginLeft: 'auto', fontSize: 10.5, color: FM.success, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="check" size={11}/> 자기 섹션으로 분리됨
                      </span>
                    )}
                  </div>
                  <div style={{ border: `1px solid ${FM.lineSoft}`, borderRadius: 6, overflow: 'hidden' }}>
                    {grouped[sec].map((it, i, arr) => (
                      <div key={i} style={{
                        display: 'grid', gridTemplateColumns: '20px 84px 1fr auto', gap: 12, alignItems: 'center',
                        padding: '9px 12px', borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
                      }}>
                        <input type="checkbox" className="fm-check"/>
                        <div className="fm-mono" style={{ fontSize: 11.5, fontWeight: 600, color: sec === 'D-1' ? FM.warningInk : FM.primaryInk }}>
                          {it.d} · {it.date}
                        </div>
                        <div style={{ fontSize: 13, color: FM.ink, fontWeight: 500 }}>{it.t}</div>
                        <Badge tone={it.tag === '공식' ? 'blue' : 'outline'}>{it.tag}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          {[
            [1, '“시험일을 알려주세요” + 입력 후 “이 날짜를 기준으로 D-30 학습표가 채워졌어요”까지 한 줄에 노출. anchor 입력 = 결과 발생을 첫 화면 안에서 종결.'],
            [2, 'D-1 항목이 D-7 안에 섞이지 않고 자기 섹션으로 분리. 캘린더 export 시 6월 21일 알람으로 올바르게 등록됨.'],
            [3, '버튼은 “캘린더에 넣기 · .ics” / “시트로 받기 · .xlsx” — 목적지 + 형식을 모두 노출. 한 산출물 카드에 primary 1개, secondary 1개.'],
          ].map(([n, t]) => (
            <div key={n} style={{ padding: '8px 12px', background: FM.successBg, border: `1px solid #C6E1CF`, borderRadius: 6, display: 'flex', gap: 8 }}>
              <Pin n={n} tone="good"/>
              <div style={{ fontSize: 11.5, color: FM.success, lineHeight: 1.5 }}>{t}</div>
            </div>
          ))}
        </div>
      </div>
    </CSFrame>
  );
}

// ═══════════════════════════════════════════════════════════════
// Mobile — Before / After
// ═══════════════════════════════════════════════════════════════
function CSMobileShell({ tone, label, children }) {
  return (
    <div className="fm" style={{ width: '100%', height: '100%', background: FM.page, padding: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <FrameLabel tone={tone}>{label}</FrameLabel>
      </div>
      <div style={{ display: 'grid', placeItems: 'start center' }}>
        {children}
      </div>
    </div>
  );
}

function CSMobileBefore() {
  return (
    <CSMobileShell tone="bad" label="sticky CTA가 “내 도구로 가져가기” — 어디로 가는지 모름">
      <Phone>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', justifyContent: 'space-between' }}>
          <Icon name="chev" size={18} color={FM.ink} sw={2}/>
          <div style={{ fontSize: 12, fontWeight: 600, color: FM.muted }}>flows / 컴활 D-30</div>
          <Icon name="share" size={18} color={FM.ink}/>
        </div>

        <div style={{ padding: '4px 18px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: CS_SOURCE.dot }}/>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: FM.inkSoft }}>학습 · 자격증</span>
            <span style={{ fontSize: 11, color: FM.muted }}>· timeline</span>
            <Badge tone="draft" icon={<Icon name="flag" size={10}/>}>초안 깃발</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: FM.ink, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            컴활 1급 — D-30 학습표
          </h1>

          {/* PROBLEM 1: anchor label */}
          <div style={{ marginTop: 14, position: 'relative' }}>
            <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 6 }}>
              <span style={{ background: '#FDE4E4', padding: '1px 6px', borderRadius: 3, color: FM.danger }}>기준 날짜</span>
            </div>
            <button style={{
              width: '100%', padding: '14px',
              background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Icon name="calendar" size={16} color={FM.faint}/>
              <span className="fm-num" style={{ fontSize: 14, fontWeight: 500, color: FM.faint }}>날짜를 입력하세요</span>
              <div style={{ flex: 1 }}/>
              <Icon name="chev-d" size={14} color={FM.faint}/>
            </button>
            <Pin n={1} tone="bad" style={{ position: 'absolute', top: -4, right: -4 }}/>
          </div>

          {/* Sample list — placeholder rows */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>학습 행 · placeholder</div>
            <div className="fm-stripe" style={{ marginTop: 8, height: 180, borderRadius: 8, display: 'grid', placeItems: 'center', color: FM.muted, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>
              WAITING FOR ANCHOR
            </div>
          </div>
        </div>

        {/* PROBLEM 2: sticky CTA copy */}
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
              <Icon name="chev-d" size={14}/>
            </button>
            <Pin n={2} tone="bad" style={{ position: 'absolute', top: -6, right: -6 }}/>
          </div>
        </div>
      </Phone>

      <div style={{ marginTop: 12, maxWidth: 420, display: 'grid', gap: 6 }}>
        <div style={{ padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={1} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>“기준 날짜”는 학습량 anchor, 학기 시작일, 시험일 중 어느 것인지 명시되지 않음.</div>
        </div>
        <div style={{ padding: '8px 12px', background: FM.dangerBg, border: `1px solid #F2C2C2`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={2} tone="bad"/>
          <div style={{ fontSize: 11.5, color: '#7C2D2D', lineHeight: 1.5 }}>“내 도구로 가져가기”는 결국 추상명사. 사용자가 누르기 전엔 캘린더로 갈지 시트로 갈지 알 수 없음.</div>
        </div>
      </div>
    </CSMobileShell>
  );
}

function CSMobileAfter() {
  return (
    <CSMobileShell tone="good" label="anchor 구체화 + sticky CTA가 산출물별 동적 (.ics)">
      <Phone>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', justifyContent: 'space-between' }}>
          <Icon name="chev" size={18} color={FM.ink} sw={2}/>
          <div style={{ fontSize: 12, fontWeight: 600, color: FM.muted }}>flows / 컴활 D-30</div>
          <Icon name="share" size={18} color={FM.ink}/>
        </div>

        <div style={{ padding: '4px 18px 96px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: CS_SOURCE.dot }}/>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: FM.inkSoft }}>학습 · 자격증</span>
            <span style={{ fontSize: 11, color: FM.muted }}>· timeline</span>
            <Badge tone="draft" icon={<Icon name="flag" size={10}/>}>초안 깃발</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: FM.ink, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            컴활 1급 — D-30 학습표
          </h1>
          <div style={{ marginTop: 4, fontSize: 12.5, color: FM.inkSoft, lineHeight: 1.5 }}>
            시험일을 알려주시면 학습표가 캘린더와 시트로 들어가요.
          </div>

          {/* FIX 1: specific anchor */}
          <div style={{ marginTop: 14, position: 'relative' }}>
            <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 6 }}>
              <span style={{ background: '#DCEFE2', padding: '1px 6px', borderRadius: 3, color: FM.success }}>시험일을 알려주세요</span>
            </div>
            <button style={{
              width: '100%', padding: '14px',
              background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Icon name="calendar" size={16} color={FM.primary}/>
              <span className="fm-num" style={{ fontSize: 15, fontWeight: 600, color: FM.ink }}>{CS_SOURCE.examDate}</span>
              <div style={{ flex: 1 }}/>
              <Icon name="chev-d" size={14} color={FM.faint}/>
            </button>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: FM.success, fontWeight: 600 }}>
              <Icon name="check" size={12}/> 12개 행 갱신됨 · D-30부터
            </div>
            <Pin n={1} tone="good" style={{ position: 'absolute', top: -4, right: -4 }}/>
          </div>

          {/* Today’s rows summary card */}
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>오늘 (D-30)</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: FM.ink }}>범위와 기준 잡기</div>
              </div>
            </div>
            <div style={{ background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10, overflow: 'hidden' }}>
              {CS_ITEMS_AFTER.slice(0, 4).map((it, i, arr) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '20px 64px 1fr',
                  gap: 10, alignItems: 'center',
                  padding: '11px 14px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
                }}>
                  <input type="checkbox" className="fm-check"/>
                  <div className="fm-mono" style={{ fontSize: 10.5, fontWeight: 600, color: FM.primaryInk }}>{it.d}<br/><span style={{ color: FM.muted, fontWeight: 500 }}>{it.date}</span></div>
                  <div style={{ fontSize: 12.5, color: FM.ink, fontWeight: 500, lineHeight: 1.4 }}>{it.t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FIX 2: dynamic sticky CTA */}
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
              <Icon name="calendar" size={15}/>
              <span style={{ background: 'rgba(255,255,255,0.18)', padding: '1px 6px', borderRadius: 4 }}>캘린더에 넣기 · .ics</span>
            </button>
            <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
              <button style={{ flex: 1, padding: '8px', background: 'transparent', border: 'none', color: FM.muted, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit' }}>시트로 받기</button>
              <span style={{ color: FM.line }}>·</span>
              <button style={{ flex: 1, padding: '8px', background: 'transparent', border: 'none', color: FM.muted, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit' }}>오답노트만 복사</button>
            </div>
            <Pin n={2} tone="good" style={{ position: 'absolute', top: -6, right: -6 }}/>
          </div>
        </div>
      </Phone>

      <div style={{ marginTop: 12, maxWidth: 420, display: 'grid', gap: 6 }}>
        <div style={{ padding: '8px 12px', background: FM.successBg, border: `1px solid #C6E1CF`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={1} tone="good"/>
          <div style={{ fontSize: 11.5, color: FM.success, lineHeight: 1.5 }}>anchor 라벨이 “시험일을 알려주세요”로 고정. 입력 즉시 “12개 행 갱신됨”까지 확인.</div>
        </div>
        <div style={{ padding: '8px 12px', background: FM.successBg, border: `1px solid #C6E1CF`, borderRadius: 6, display: 'flex', gap: 8 }}>
          <Pin n={2} tone="good"/>
          <div style={{ fontSize: 11.5, color: FM.success, lineHeight: 1.5 }}>sticky CTA가 “캘린더에 넣기 · .ics”. secondary 2개는 ghost 텍스트로 둬서 primary 1개 원칙 유지.</div>
        </div>
      </div>
    </CSMobileShell>
  );
}

// ═══════════════════════════════════════════════════════════════
// Rationale + replication doc
// ═══════════════════════════════════════════════════════════════
function CSRationaleDoc() {
  return (
    <div className="fm fm-scroll" style={{ height: '100%', overflowY: 'auto', background: FM.bg, padding: '40px 56px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: FM.ink, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 10 }}>F</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: FM.ink }}>FlowMe</div>
          <Badge tone="blue">Validation fix · CS-D30</Badge>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: FM.muted }}>validation-routes-ux-review.md A1·A2·A4</div>
        </div>

        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: FM.ink, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
          왜 이 3가지를 한 번에 고치는가
        </h1>
        <p style={{ marginTop: 10, fontSize: 14, color: FM.inkSoft, lineHeight: 1.7 }}>
          testable_content.md가 첫 observed session으로 `computer-skills-d30-study`를 지목한다. 이 라우트에서 사용자의 첫 행동은
          <strong style={{ color: FM.ink }}> ① 시험일 입력 → ② 학습표가 채워진 걸 확인 → ③ 캘린더로 export</strong> 한 줄이다.
          이 한 줄에 걸린 3개의 마찰(추상 anchor 라벨 / D-N 그룹핑 어긋남 / 추상 export 카피)을 따로 고치면 효과가 반쪽이고, 한 번에 고쳐야 “anchor → 산출물 → export”라는 흐름이 한 화면에 보인다.
        </p>

        {/* 3 fixes table */}
        <div style={{ marginTop: 24, border: `1px solid ${FM.line}`, borderRadius: 8, overflow: 'hidden' }}>
          {[
            ['A2', '추상 anchor 라벨', '“기준 날짜” / “날짜를 입력하세요”', '“시험일을 알려주세요” + 입력 후 “12개 행 갱신됨”', 'flow schema에 `setup_anchor_label` 추가 · seed-flows.ts 라우트별 라벨'],
            ['A4', 'D-N 그룹핑 어긋남', '## D-7 안에 D-1 항목 섞임', '## D-1 자기 섹션으로 분리', 'studyExamD30Text seed 한 줄 이동 — 코드 변경 없음'],
            ['A1', '추상 export CTA', '“내 도구로 가져가기 ▾” (모바일)', '산출물별 동적 — 캘린더면 “캘린더에 넣기 · .ics”', '`primary_destination` 필드로 라벨 라우팅 (이미 schema 존재)'],
          ].map(([id, prob, before, after, fix], i, arr) => (
            <div key={id} style={{
              display: 'grid', gridTemplateColumns: '60px 1fr 1.2fr 1.2fr 1.2fr', gap: 0,
              borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
            }}>
              <div style={{ padding: '12px 14px', background: FM.bgAlt, borderRight: `1px solid ${FM.lineSoft}`, fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em' }}>{id}</div>
              <div style={{ padding: '12px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, fontWeight: 600, color: FM.ink, lineHeight: 1.5 }}>{prob}</div>
              <div style={{ padding: '12px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: FM.danger, lineHeight: 1.5, fontWeight: 500 }}>{before}</div>
              <div style={{ padding: '12px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: FM.success, lineHeight: 1.5, fontWeight: 500 }}>{after}</div>
              <div style={{ padding: '12px 14px', fontSize: 11.5, color: FM.muted, lineHeight: 1.55 }}>{fix}</div>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: 32, fontSize: 16, fontWeight: 700, color: FM.ink, letterSpacing: '-0.01em' }}>
          다른 10개 라우트로 복제하는 법
        </h2>
        <p style={{ marginTop: 6, fontSize: 13.5, color: FM.inkSoft, lineHeight: 1.65 }}>
          이 패턴이 잡히면 나머지 라우트는 라벨 5종 / anchor 라벨 5종 / 섹션 정리 3개만 갈아끼우면 끝난다.
        </p>

        <div style={{ marginTop: 14, border: `1px solid ${FM.line}`, borderRadius: 8, overflow: 'hidden' }}>
          {[
            ['moving-d30-basic',         '이사일을 알려주세요',           '캘린더에 넣기 · .ics',     '없음 (이미 정리됨)'],
            ['diet-habit-2week',         '관찰 시작일',                   '시트로 받기 · .xlsx',      'stop condition 마지막 행 → caution 패널'],
            ['new-car-delivery-check',   '인수 예정일',                   '메모로 복사 + 시트로 받기', '## 인수 보류 기준 신설'],
            ['baby-food-menu-recipe',    '이유식 시작일 / 생년월일',       '반응 기록표로 받기 · .xlsx', '의료 배너 3개 bullet로 압축'],
            ['used-car-buying-check',    '계약 예정일',                   '비교표 시트로 받기',       '## 계약 보류 기준 신설'],
            ['passport-renewal-docs',    '여행 출발일 (있으면)',          '제출 메모로 복사',         '## 제출 메모 섹션 본문에 명시'],
            ['real-mofa-overseas-travel-prep', '출국일',                  '비상 카드 한 장으로 받기',  '## 비상 연락 카드 섹션 신설'],
          ].map(([route, anchor, cta, extra], i, arr) => (
            <div key={route} style={{
              display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.3fr',
              borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
            }}>
              <div className="fm-mono" style={{ padding: '10px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 11.5, color: FM.primaryInk, fontWeight: 600 }}>{route}</div>
              <div style={{ padding: '10px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: FM.ink }}>{anchor}</div>
              <div style={{ padding: '10px 14px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: FM.ink, fontWeight: 500 }}>{cta}</div>
              <div style={{ padding: '10px 14px', fontSize: 11.5, color: FM.muted, lineHeight: 1.55 }}>{extra}</div>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: 32, fontSize: 16, fontWeight: 700, color: FM.ink, letterSpacing: '-0.01em' }}>
          PR 단위로 쪼개기
        </h2>
        <ol style={{ marginTop: 8, paddingLeft: 18, display: 'grid', gap: 8, fontSize: 13.5, color: FM.inkSoft, lineHeight: 1.65 }}>
          <li>
            <strong style={{ color: FM.ink }}>PR-1 · seed text 정리 (코드 변경 없음).</strong>
            studyExamD30Text의 D-1 항목을 `## D-1 시험 전날 점검`으로 분리. 같은 패턴을 diet/new-car seed에도 적용.
          </li>
          <li>
            <strong style={{ color: FM.ink }}>PR-2 · flow schema에 `setup_anchor_label` 추가.</strong>
            컴활 라우트만 “시험일을 알려주세요”로 채우고 나머지는 빈값 → 기본 fallback 유지. 한 라우트 검증 후 5개로 확장.
          </li>
          <li>
            <strong style={{ color: FM.ink }}>PR-3 · 모바일 sticky CTA 동적화.</strong>
            `primary_destination` 분기 5종 라벨. AppClient.tsx의 sticky sheet 한 곳만 수정. 다른 라우트 자동 적용.
          </li>
        </ol>
        <p style={{ marginTop: 14, fontSize: 12.5, color: FM.muted, lineHeight: 1.6 }}>
          PR-1·2·3는 독립이라 순서는 바꿔도 됨. 단 observed session 시작 전엔 셋 다 머지된 상태여야 의도한 첫 흐름이 검증된다.
        </p>

        <div style={{ marginTop: 32, padding: 16, background: FM.bgAlt, border: `1px solid ${FM.line}`, borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>변경하지 않음</div>
          <div style={{ marginTop: 8, fontSize: 13, color: FM.inkSoft, lineHeight: 1.65 }}>
            전역 sticky export bar 신설 금지. 산출물 카드 내부 또는 모바일 sticky sheet 안 — 둘 중 하나만.<br/>
            “검증됨” 라벨은 어떤 PR에서도 추가하지 않음. observed session 결과가 candidate signal이라도 validation으로 승격 금지.<br/>
            컨텐츠 자동 생성·로그인·결제·전역 progress bar는 이번 사이클 범위 밖.
          </div>
        </div>

        <div style={{ height: 60 }}/>
      </div>
    </div>
  );
}

Object.assign(window, {
  Pin, FrameLabel, CSFrame, CSMobileShell,
  CSDesktopBefore, CSDesktopAfter,
  CSMobileBefore, CSMobileAfter,
  CSRationaleDoc,
});
