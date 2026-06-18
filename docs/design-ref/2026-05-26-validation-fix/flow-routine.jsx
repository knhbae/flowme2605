// FlowMe — routine flow
// Workout 30일 루틴. Anchor = 시작일.
//   Primary artifact:  주차×요일 회차 그리드 (반복 캘린더)
//   Secondary artifact: 회차 기록표 (세트·중량 로그)
//
// design.md routine 정의에 맞춤 — 일정 반복형. footprint 카운트는 회차 기준.

// ─── helpers ─────────────────────────────────────────────────
const WORKOUT_SESSIONS = [
  { key: 'A', name: '하체 (스쿼트)',  main: '백스쿼트 5×5',  acc: '레그컬 / 카프' },
  { key: 'B', name: '상체-밀기',       main: '벤치프레스 5×5', acc: '오버헤드 / 트라이셉' },
  { key: 'C', name: '하체 (데드)',     main: '데드리프트 1×5', acc: '루마니안 / 코어' },
  { key: 'D', name: '상체-당기기',     main: '바벨로우 5×5',    acc: '풀업 / 컬' },
  { key: 'R', name: '회복 / 모빌리티', main: '걷기 30분',       acc: '가동성 루틴' },
];
const PLAN = [ // 28일 × {sessionKey, done}
  // week 1 — habituation, lighter
  ['A', 'R', 'B', 'R', 'C', 'D', 'R'],
  // week 2
  ['A', 'B', 'R', 'C', 'D', 'R', 'A'],
  // week 3
  ['B', 'C', 'R', 'D', 'A', 'R', 'B'],
  // week 4
  ['C', 'D', 'R', 'A', 'B', 'R', 'C'],
];
const DOW = ['월', '화', '수', '목', '금', '토', '일'];
function getSession(k) { return WORKOUT_SESSIONS.find(s => s.key === k); }

// ─── Desktop ─────────────────────────────────────────────────
function ScreenRoutine() {
  // anchor = 2026-06-01 (Mon)
  const startMD = '06.01';
  const todayWeek = 1; // we're at "week 2 · day 3"
  const todayDay = 2;
  const sessionLog = [
    { d: '06.01', name: '하체 (스쿼트)',  sets: '5×5 @ 70kg',  rpe: 7, note: '폼 OK · 무릎 안쪽 시그널 없음' },
    { d: '06.03', name: '상체-밀기',       sets: '5×5 @ 50kg',  rpe: 7, note: '벤치 손목 살짝 시큰' },
    { d: '06.05', name: '하체 (데드)',     sets: '1×5 @ 90kg',  rpe: 8, note: '워밍업 더 길게 잡기' },
    { d: '06.06', name: '상체-당기기',     sets: '5×5 @ 45kg',  rpe: 7, note: '풀업 4-3-3' },
    { d: '06.08', name: '하체 (스쿼트)',  sets: '5×5 @ 72kg',  rpe: 7, note: '+2kg · 페이스 양호' },
    { d: '06.09', name: '상체-밀기',       sets: '5×5 @ 52kg',  rpe: 8, note: '' },
  ];

  return (
    <DesktopFrame>
      <MetaRow
        category="운동 · 루틴" dot={FM.cat.workout}
        structure="routine · 4-week" anchorLabel="앵커: 시작일"
        source="제작자 경험"
        draft="초안 깃발 · Stage 0 검증용"
        lastChecked="2026.05.24"
      />
      <h1 style={{ margin: '14px 0 6px', fontSize: 28, fontWeight: 700, color: FM.ink, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
        스트렝스 4주 루틴 — 주 4-5회
      </h1>
      <div style={{ fontSize: 14, color: FM.inkSoft, lineHeight: 1.6, maxWidth: 720 }}>
        시작일을 넣으면 4주 회차표가 캘린더로 들어오고, 매 회차 끝나면 한 줄씩 기록표에 남깁니다. 무게는 본인 기준으로 조정하세요.
      </div>

      <div style={{ marginTop: 18 }}>
        <AnchorBar
          label="루틴 시작일"
          value="2026. 06. 01 (월)"
          hint="이 날짜를 1주차 1일로 잡고 4주차까지 회차를 만들어요"
          applied
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginTop: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          {/* Primary artifact: routine grid */}
          <ArtifactCard
            eye="회차 그리드 · primary"
            title="4주 루틴 · 28회 회차"
            desc="현재 위치는 2주차 수요일. 회차 키(A/B/C/D/R)는 아래 범례 참고."
            exports={[
              { icon: 'calendar', label: '캘린더에 넣기 · .ics' },
              { icon: 'sheet',    label: '시트로 받기' },
            ]}
          >
            {/* legend */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {WORKOUT_SESSIONS.map(s => (
                <div key={s.key} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 8px', borderRadius: 6,
                  background: s.key === 'R' ? FM.bgAlt : FM.card,
                  border: `1px solid ${FM.lineSoft}`,
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 4,
                    background: s.key === 'R' ? '#EDE9E0' : (s.key === 'A' || s.key === 'C' ? '#FDECEA' : FM.primaryBg),
                    color: s.key === 'R' ? FM.muted : (s.key === 'A' || s.key === 'C' ? '#B05646' : FM.primaryInk),
                    fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center',
                  }}>{s.key}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: FM.inkSoft }}>{s.name}</span>
                </div>
              ))}
            </div>

            {/* grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '64px repeat(7, 1fr)',
              gap: 4,
            }}>
              <div></div>
              {DOW.map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: FM.muted, padding: '4px 0' }}>{d}</div>
              ))}
              {PLAN.map((week, wi) => (
                <React.Fragment key={wi}>
                  <div style={{ display: 'grid', placeItems: 'start', padding: '6px 0' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: FM.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>WEEK</div>
                    <div className="fm-num" style={{ fontSize: 16, fontWeight: 700, color: FM.ink, lineHeight: 1 }}>{wi + 1}</div>
                  </div>
                  {week.map((k, di) => {
                    const s = getSession(k);
                    const isPast = wi < todayWeek || (wi === todayWeek && di < todayDay);
                    const isToday = wi === todayWeek && di === todayDay;
                    const isRest = k === 'R';
                    return (
                      <div key={di} style={{
                        minHeight: 76, padding: 8,
                        background: isToday ? FM.primaryBg : (isRest ? FM.bgAlt : FM.card),
                        border: isToday ? `1.5px solid ${FM.primary}` : `1px solid ${FM.lineSoft}`,
                        borderRadius: 6,
                        opacity: isPast && !isToday ? 0.65 : 1,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{
                            width: 18, height: 18, borderRadius: 4,
                            background: isRest ? '#EDE9E0' : (k === 'A' || k === 'C' ? '#FDECEA' : '#DCE7FB'),
                            color: isRest ? FM.muted : (k === 'A' || k === 'C' ? '#B05646' : FM.primaryInk),
                            fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center',
                          }}>{k}</span>
                          {isPast && !isToday && <Icon name="check" size={11} color={FM.success}/>}
                          {isToday && <span style={{ fontSize: 9.5, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em' }}>오늘</span>}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: isRest ? FM.muted : FM.ink, letterSpacing: '-0.005em', lineHeight: 1.3 }}>{s.name}</div>
                        {!isRest && <div style={{ marginTop: 2, fontSize: 10, color: FM.muted, lineHeight: 1.3 }}>{s.main}</div>}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <div style={{ marginTop: 12, padding: '10px 12px', background: FM.bgAlt, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="info" size={14} color={FM.muted}/>
              <div style={{ fontSize: 11.5, color: FM.muted, lineHeight: 1.5 }}>
                무게는 본인의 1RM ~ 60–70%에서 시작해 매주 2–5% 증량. 통증이 있으면 가중치 유지 또는 회차 키 R로 대체하세요.
              </div>
            </div>
          </ArtifactCard>

          {/* Secondary: rep log */}
          <ArtifactCard
            eye="회차 기록표 · secondary"
            title="지난 회차 기록"
            desc="각 회차 끝나고 세트·중량·RPE·한 줄 메모를 추가. 시트로 받아 보관해도 돼요."
            exports={[
              { icon: 'copy',  label: '오늘 기록 복사' },
              { icon: 'sheet', label: '시트로 받기' },
            ]}
            mainTone="primarySoft"
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: '78px 1fr 130px 60px 1.4fr',
              border: `1px solid ${FM.lineSoft}`, borderRadius: 6, overflow: 'hidden',
            }}>
              {['날짜', '회차', '세트 × 중량', 'RPE', '한 줄 메모'].map((h, i, arr) => (
                <div key={i} style={{
                  padding: '8px 12px', background: FM.bgAlt,
                  borderBottom: `1px solid ${FM.lineSoft}`,
                  borderRight: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
                  fontSize: 11, fontWeight: 700, color: FM.ink,
                }}>{h}</div>
              ))}
              {sessionLog.map((r, ri, arr) => (
                <React.Fragment key={ri}>
                  <div className="fm-mono" style={{ padding: '9px 12px', borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 11.5, color: FM.inkSoft, fontWeight: 600 }}>{r.d}</div>
                  <div style={{ padding: '9px 12px', borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: FM.ink, fontWeight: 500 }}>{r.name}</div>
                  <div className="fm-mono" style={{ padding: '9px 12px', borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 11.5, color: FM.ink, fontWeight: 500 }}>{r.sets}</div>
                  <div className="fm-num" style={{ padding: '9px 12px', borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 12, color: r.rpe >= 8 ? FM.warningInk : FM.inkSoft, fontWeight: 600, textAlign: 'center' }}>{r.rpe}</div>
                  <div style={{ padding: '9px 12px', borderBottom: ri < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none', fontSize: 12, color: r.note ? FM.inkSoft : FM.faint, lineHeight: 1.5 }}>{r.note || '— 메모 없음'}</div>
                </React.Fragment>
              ))}
              {/* today's input row */}
              <div className="fm-mono" style={{ padding: '9px 12px', borderRight: `1px solid ${FM.lineSoft}`, fontSize: 11.5, color: FM.primary, fontWeight: 700, background: FM.primaryBg }}>06.10</div>
              <div style={{ padding: '4px 8px', borderRight: `1px solid ${FM.lineSoft}`, background: FM.primaryBg, display: 'flex', alignItems: 'center' }}>
                <select defaultValue="C" style={{ width: '100%', border: `1px solid ${FM.line}`, borderRadius: 5, padding: '4px 6px', fontFamily: 'inherit', fontSize: 11.5, background: FM.card, color: FM.ink }}>
                  {WORKOUT_SESSIONS.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
                </select>
              </div>
              <input className="fm-mono" defaultValue="" placeholder="예: 1×5 @ 92kg" style={{ padding: '4px 8px', borderRight: `1px solid ${FM.lineSoft}`, background: FM.primaryBg, fontSize: 11.5, border: 'none', outline: 'none', color: FM.ink }}/>
              <input className="fm-num" defaultValue="" placeholder="—" style={{ padding: '4px 8px', borderRight: `1px solid ${FM.lineSoft}`, background: FM.primaryBg, fontSize: 12, border: 'none', outline: 'none', color: FM.ink, textAlign: 'center' }}/>
              <input defaultValue="" placeholder="오늘 어땠나요?" style={{ padding: '4px 8px', background: FM.primaryBg, fontSize: 12, border: 'none', outline: 'none', color: FM.ink, fontFamily: 'inherit' }}/>
            </div>

            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Btn variant="dark" size="sm" icon={<Icon name="check" size={13}/>}>오늘 회차 기록</Btn>
              <span style={{ fontSize: 11.5, color: FM.muted }}>6 / 28 회차 완료 · 22 남음</span>
              <div style={{ flex: 1, height: 6, background: FM.lineSoft, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: '21.4%', height: '100%', background: FM.cat.workout }}/>
              </div>
              <span className="fm-num" style={{ fontSize: 11, color: FM.muted, fontWeight: 600 }}>21%</span>
            </div>
          </ArtifactCard>
        </div>

        {/* right rail */}
        <div style={{ display: 'grid', gap: 12, position: 'sticky', top: 76 }}>
          <Card padding={14}>
            <div style={{ fontSize: 12, fontWeight: 700, color: FM.ink }}>이번 주 요약</div>
            <div style={{ marginTop: 10, display: 'grid', gap: 8, fontSize: 11.5 }}>
              {[
                ['현재', 'WEEK 2 · 화요일'],
                ['완료한 회차', '6 / 28'],
                ['연속 일수', '8일'],
                ['평균 RPE', '7.3'],
                ['예상 종료', '2026.06.28 (일)'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: FM.muted }}>{k}</span>
                  <span style={{ color: FM.ink, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding={14}>
            <div style={{ fontSize: 12, fontWeight: 700, color: FM.ink }}>오늘 (06.10) · 하체 데드</div>
            <div style={{ marginTop: 8, display: 'grid', gap: 4, fontSize: 12 }}>
              <div style={{ color: FM.inkSoft }}>· 메인: 데드리프트 1×5</div>
              <div style={{ color: FM.inkSoft }}>· 보조: 루마니안 3×8 / 코어</div>
              <div style={{ color: FM.muted, marginTop: 4 }}>지난번 90kg @ RPE 8 — 이번엔 92kg 시도</div>
            </div>
            <Btn variant="primary" size="sm" full style={{ marginTop: 10 }} icon={<Icon name="check" size={13}/>}>오늘 회차 시작</Btn>
          </Card>

          <CautionPanel
            tone="warn"
            title="통증 신호 멈춤 기준"
            body="동작 중 날카로운 통증, 다음날까지 가시지 않는 부상감, 폼 붕괴가 보이면 가중치를 유지하거나 회복 회차(R)로 대체하세요. 트레이너/의료 상담을 권장합니다."
          />

          <FootprintBar counts={{ view: 412, copy: 96, check: 188, stuck: 11 }}/>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── Mobile — Routine (오늘 회차 1개를 한 화면에) ────────────
function MobileRoutine() {
  return (
    <Phone label="모바일 · routine — 오늘 회차 1개를 한 화면에">
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', justifyContent: 'space-between' }}>
        <button style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
          <Icon name="chev" size={18} color={FM.ink} sw={2}/>
        </button>
        <div style={{ fontSize: 12, fontWeight: 600, color: FM.muted }}>flows / 4주 스트렝스</div>
        <Icon name="share" size={18} color={FM.ink}/>
      </div>

      <div style={{ padding: '4px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: FM.cat.workout }}/>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: FM.inkSoft }}>운동 · 루틴</span>
          <span style={{ fontSize: 11, color: FM.muted }}>· routine</span>
          <Badge tone="draft" icon={<Icon name="flag" size={10}/>}>초안 깃발</Badge>
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: FM.ink, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          스트렝스 4주 루틴
        </h1>

        {/* progress strip */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 11, color: FM.muted, fontWeight: 600 }}>WEEK 2 · 화</div>
          <div style={{ flex: 1, height: 6, background: FM.lineSoft, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: '21%', height: '100%', background: FM.cat.workout }}/>
          </div>
          <div className="fm-num" style={{ fontSize: 11, fontWeight: 600, color: FM.ink }}>6 / 28</div>
        </div>

        {/* TODAY's session card — primary */}
        <div style={{ marginTop: 14, padding: 16, background: FM.card, border: `1.5px solid ${FM.primary}`, borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: 5, background: '#FDECEA', color: '#B05646', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center' }}>C</span>
            <div style={{ fontSize: 11, fontWeight: 700, color: FM.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>오늘 · 06.10</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: FM.ink, marginTop: 6, letterSpacing: '-0.015em' }}>하체 (데드)</div>

          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {[
              ['메인', '데드리프트 1×5 @ 92kg', '지난번 90kg / RPE 8'],
              ['보조1', '루마니안 데드 3×8', ''],
              ['보조2', '코어 3 라운드', '플랭크 / 행잉레그'],
            ].map(([t, m, h], i) => (
              <div key={i} style={{ padding: 10, background: FM.bgAlt, borderRadius: 8 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: FM.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{t}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: FM.ink, marginTop: 2 }}>{m}</div>
                {h && <div style={{ fontSize: 11.5, color: FM.muted, marginTop: 2 }}>{h}</div>}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <Btn variant="primary" size="lg" full icon={<Icon name="check" size={15}/>}>오늘 회차 기록</Btn>
          </div>
        </div>

        {/* week strip */}
        <div style={{ marginTop: 16 }}>
          <SecHead eye="이번 주 회차" title="WEEK 2"/>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {PLAN[1].map((k, i) => {
              const s = getSession(k);
              const isPast = i < 2;
              const isToday = i === 2;
              const isRest = k === 'R';
              return (
                <div key={i} style={{
                  padding: 6, minHeight: 64,
                  background: isToday ? FM.primaryBg : (isRest ? FM.bgAlt : FM.card),
                  border: isToday ? `1.5px solid ${FM.primary}` : `1px solid ${FM.lineSoft}`,
                  borderRadius: 6, opacity: isPast ? 0.65 : 1,
                  display: 'grid', justifyItems: 'start', gap: 3,
                }}>
                  <div style={{ fontSize: 9, color: FM.muted, fontWeight: 600 }}>{DOW[i]}</div>
                  <span style={{
                    width: 18, height: 18, borderRadius: 4,
                    background: isRest ? '#EDE9E0' : (k === 'A' || k === 'C' ? '#FDECEA' : '#DCE7FB'),
                    color: isRest ? FM.muted : (k === 'A' || k === 'C' ? '#B05646' : FM.primaryInk),
                    fontSize: 9.5, fontWeight: 700, display: 'grid', placeItems: 'center',
                  }}>{k}</span>
                  {isPast && <Icon name="check" size={10} color={FM.success}/>}
                </div>
              );
            })}
          </div>
        </div>

        {/* recent log compact */}
        <div style={{ marginTop: 16 }}>
          <SecHead eye="최근 기록" title="지난 3회차" right={<Btn variant="outline" size="sm" icon={<Icon name="sheet" size={12}/>}>시트로</Btn>}/>
          <div style={{ marginTop: 10, background: FM.card, border: `1px solid ${FM.line}`, borderRadius: 10, overflow: 'hidden' }}>
            {[
              ['06.08', '하체 (스쿼트)', '5×5 @ 72kg', 7],
              ['06.06', '상체-당기기',   '5×5 @ 45kg', 7],
              ['06.05', '하체 (데드)',   '1×5 @ 90kg', 8],
            ].map((r, i, arr) => (
              <div key={i} style={{
                padding: '12px 14px',
                borderBottom: i < arr.length - 1 ? `1px solid ${FM.lineSoft}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div className="fm-mono" style={{ fontSize: 11.5, fontWeight: 600, color: FM.inkSoft }}>{r[0]}</div>
                  <div className="fm-num" style={{ fontSize: 11, fontWeight: 700, color: r[3] >= 8 ? FM.warningInk : FM.muted }}>RPE {r[3]}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: FM.ink, marginTop: 4 }}>{r[1]}</div>
                <div className="fm-mono" style={{ fontSize: 11.5, color: FM.muted, marginTop: 2 }}>{r[2]}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 30 }}/>
      </div>
    </Phone>
  );
}

Object.assign(window, { ScreenRoutine, MobileRoutine });
