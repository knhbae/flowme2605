#!/usr/bin/env python3
"""
gen_flows4.py — FLOW 컨셉 재검토 기반 전면 재설계
핵심 추가:
  1. Anchor Input — "내 날짜 기준 역산" (product의 핵심 차별점)
  2. Artifact Framing — "이 Flow가 무엇이 되는가" 첫 화면에
  3. Export / Copy CTA — content→action 루프 완성
  4. 카테고리별 UX 유지 + 앵커 연동 강화
"""

import re, pathlib, html as htmllib, json

ROOT = pathlib.Path("/home/user/flowme2605")
OUT  = ROOT / "preview/260601"

# ── parse source files ─────────────────────────────────────────────────────
def parse_flows(path, src_type):
    text = path.read_text(encoding='utf-8')
    flows = []
    for ms in re.finditer(r"slug:\s*'([^']+)'", text):
        slug = ms.group(1)
        start = max(0, ms.start() - 600)
        end   = min(len(text), ms.start() + 1500)
        w = text[start:end]
        def f(n):
            m = re.search(rf"{n}:\s*'([^']*)'", w)
            return m.group(1) if m else ''
        raw_start = text.find('text: `', ms.start())
        raw_text = ''
        if raw_start > 0 and raw_start < ms.start() + 3000:
            bt = text.find('`', raw_start + 7)
            if bt > raw_start:
                raw_text = text[raw_start + 7: bt]
        flows.append(dict(
            slug=slug, src_type=src_type,
            title=f('title'), description=f('description'),
            category=f('category'), structure=f('structure_type'),
            anchor=f('anchor_type'), risk=f('risk_level'),
            dest=f('primary_destination'),
            src_url=f('source_url'), src_title=f('source_title'),
            warning=f('warning'), raw=raw_text
        ))
    return flows

def parse_steps(raw):
    sections, current_section, current_step = [], None, None
    for line in raw.split('\n'):
        m = re.match(r'^##\s+(.+)', line)
        if m:
            if current_section:
                if current_step: current_section['steps'].append(current_step)
                sections.append(current_section)
            current_section = {'title': m.group(1).strip(), 'steps': []}
            current_step = None
            continue
        m = re.match(r'^- (.+)', line)
        if m:
            if current_step and current_section:
                current_section['steps'].append(current_step)
            step_text = m.group(1).strip()
            # Day-range "D+14~D+35" at end: use the start (D+14) as the offset and
            # strip the whole range from the title, matching the TS parser.
            range_m = re.search(r'\b(D[-+]?\d+)~D[-+]?\d+\s*$', step_text)
            if range_m:
                anchor = range_m.group(1)
                name = step_text[:range_m.start()].strip()
            else:
                anchor_m = re.search(r'\b(D[-+]?\d+|D-Day|@every\s+\w+)\s*$', step_text)
                anchor = anchor_m.group(1) if anchor_m else ''
                name = step_text[:anchor_m.start()].strip() if anchor else step_text
            current_step = {'name': name, 'anchor': anchor, 'details': {}}
            continue
        for key in ('why','how','done','caution','link'):
            m2 = re.match(rf'^\s+{key}:\s*(.+)', line)
            if m2:
                current_step['details'][key] = m2.group(1).strip()
                break
    if current_section:
        if current_step: current_section['steps'].append(current_step)
        sections.append(current_section)
    return sections

def h(s): return htmllib.escape(str(s))

# ── anchor meta per flow ───────────────────────────────────────────────────
ANCHOR_META = {
    # official
    'national-scholarship-apply': {'label':'신청 마감일', 'placeholder':'예: 2026-03-12', 'unit':'end_date'},
    'birth-registration-prep':    {'label':'출생일', 'placeholder':'예: 2026-06-15', 'unit':'start_date'},
    'infant-health-checkup-schedule': {'label':'아이 생년월일', 'placeholder':'예: 2024-01-15', 'unit':'baby_birth_date'},
    # creator
    'domestic-trip-d7':    {'label':'여행 출발일', 'placeholder':'예: 2026-07-20', 'unit':'end_date'},
    'portfolio-4week':     {'label':'제출 목표일', 'placeholder':'예: 2026-08-01', 'unit':'end_date'},
    'new-hobby-30day':     {'label':'도전 시작일', 'placeholder':'예: 2026-06-15', 'unit':'start_date'},
    'morning-skincare-routine': {'label':'루틴 시작일', 'placeholder':'예: 오늘 날짜', 'unit':'start_date'},
    'skin-weekly-check':   {'label':'관찰 시작일', 'placeholder':'예: 오늘 날짜', 'unit':'start_date'},
    'reading-habit-30day': {'label':'독서 챌린지 시작일', 'placeholder':'예: 오늘 날짜', 'unit':'start_date'},
    'morning-routine-30day': {'label':'루틴 시작일', 'placeholder':'예: 오늘 날짜', 'unit':'start_date'},
    'weekly-meal-plan':    {'label':'주간 식단 시작일', 'placeholder':'예: 이번 월요일', 'unit':'start_date'},
    'monthly-household-budget': {'label':'기준 월', 'placeholder':'예: 2026-07', 'unit':'start_date'},
    'payday-finance-routine': {'label':'이번 월급날', 'placeholder':'예: 2026-06-25', 'unit':'start_date'},
    'home-cafe-daily':     {'label':'루틴 시작일', 'placeholder':'예: 오늘 날짜', 'unit':'start_date'},
    'digital-detox-weekly': {'label':'디톡스 시작일', 'placeholder':'예: 이번 월요일', 'unit':'start_date'},
    'dog-walk-routine':    {'label':'루틴 시작일', 'placeholder':'예: 오늘 날짜', 'unit':'start_date'},
    'pet-health-observation': {'label':'관찰 시작일', 'placeholder':'예: 오늘 날짜', 'unit':'start_date'},
}

# ── artifact destination meta ──────────────────────────────────────────────
DEST_META = {
    'calendar': {'icon':'📅', 'label':'캘린더', 'cta':'캘린더에 추가', 'desc':'날짜별 일정으로 변환됩니다'},
    'sheet':    {'icon':'📊', 'label':'스프레드시트', 'cta':'시트로 복사', 'desc':'표·기록 양식으로 내보낼 수 있습니다'},
    'hybrid':   {'icon':'🗂', 'label':'메모+캘린더', 'cta':'항목 복사', 'desc':'메모와 일정에 나눠 보관합니다'},
    'memo':     {'icon':'📝', 'label':'메모', 'cta':'메모로 복사', 'desc':'체크리스트를 메모·노트에 저장합니다'},
}

def render_details(step):
    d = step.get('details', {})
    out = ''
    if d.get('why'):
        out += f'<div class="det"><span class="det-lbl l-why">WHY</span><span class="det-txt">{h(d["why"])}</span></div>'
    if d.get('how'):
        out += f'<div class="det"><span class="det-lbl l-how">HOW</span><span class="det-txt">{h(d["how"])}</span></div>'
    if d.get('done'):
        out += f'<div class="det"><span class="det-lbl l-done">완료</span><span class="det-txt">{h(d["done"])}</span></div>'
    if d.get('caution'):
        out += f'<div class="det"><span class="det-lbl l-caution">주의</span><span class="det-txt caut">{h(d["caution"])}</span></div>'
    if d.get('link'):
        parts = [p.strip() for p in d['link'].split('|')]
        if len(parts) >= 2:
            lt = parts[2].lower() if len(parts) > 2 else 'off'
            pill_cls = {'official':'lp-off','reference':'lp-ref','creator':'lp-cre'}.get(lt,'lp-off')
            pill_lbl = {'official':'공식','reference':'참고','creator':'크리에이터'}.get(lt,'링크')
            out += f'<div class="det"><span class="det-lbl l-link">링크</span><span class="det-txt"><a href="{h(parts[1])}" target="_blank">{h(parts[0])}</a><span class="link-pill {pill_cls}">{pill_lbl}</span></span></div>'
    return out

# ── common CSS ─────────────────────────────────────────────────────────────
BASE_CSS = """
:root{
  --bg:#f8f7f4;--surface:#fff;--surface2:#f2f1ee;--surface3:#eae8e4;
  --border:#e4e1dc;--border2:#d4d0c8;
  --ink:#1c1917;--ink2:#44403c;--sub:#78716c;--muted:#a8a29e;
  --accent:#c96442;--accent2:#b8542f;--accent-bg:#fdf6f2;--accent-line:#e9c4b3;
  --blue:#1d6fb5;--blue-bg:#eff6ff;--blue-line:#bfdbfe;
  --teal:#0d9488;--teal-bg:#f0fdfa;--teal-line:#99f6e4;
  --amber:#b45309;--amber-bg:#fffbeb;--amber-line:#fcd34d;
  --red:#b91c1c;--red-bg:#fef2f2;--red-line:#fecaca;
  --green:#15803d;--green-bg:#f0fdf4;--green-line:#bbf7d0;
  --violet:#6d28d9;--violet-bg:#f5f3ff;--violet-line:#ddd6fe;
  --rose:#be185d;--rose-bg:#fdf2f8;--rose-line:#f9a8d4;
  --shadow-sm:0 1px 2px rgba(28,25,23,.06);
  --shadow:0 1px 3px rgba(28,25,23,.07),0 1px 2px rgba(28,25,23,.04);
  --shadow-md:0 4px 16px rgba(28,25,23,.1);
  --r:14px;--r-md:11px;--r-sm:8px;--r-xs:5px;
}
*{box-sizing:border-box;margin:0;padding:0}
html{font-size:15px;-webkit-text-size-adjust:100%}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Apple SD Gothic Neo","Noto Sans KR",sans-serif;
     background:var(--bg);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:var(--blue);text-decoration:none}a:hover{text-decoration:underline}
.page{max-width:660px;margin:0 auto;padding:1.5rem 1.1rem 6rem}

.back-link{display:inline-flex;align-items:center;gap:.35rem;font-size:.8rem;color:var(--sub);
  margin-bottom:1.2rem;padding:.35rem .75rem;border-radius:999px;border:1px solid var(--border);background:var(--surface)}
.back-link:hover{color:var(--ink);border-color:var(--border2)}

.badge{display:inline-flex;align-items:center;gap:.25rem;font-size:.68rem;font-weight:600;
  letter-spacing:.02em;padding:.18rem .55rem;border-radius:999px;white-space:nowrap;border:1px solid transparent}
.b-cat{background:var(--surface2);color:var(--sub);border-color:var(--border)}
.b-official{background:var(--blue-bg);color:var(--blue);border-color:var(--blue-line)}
.b-reference{background:var(--violet-bg);color:var(--violet);border-color:var(--violet-line)}
.b-fin{background:var(--amber-bg);color:var(--amber);border-color:var(--amber-line)}
.b-med{background:var(--red-bg);color:var(--red);border-color:var(--red-line)}
.b-low{background:var(--green-bg);color:var(--green);border-color:var(--green-line)}
.badge-row{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.75rem}

.flow-title{font-size:1.5rem;font-weight:800;letter-spacing:-.025em;line-height:1.2;margin-bottom:.35rem}
.flow-desc{font-size:.88rem;color:var(--sub);line-height:1.55;margin-bottom:.9rem}

/* ── Artifact framing ── */
.artifact-frame{display:flex;align-items:center;gap:.7rem;background:var(--surface);
  border:1px solid var(--border);border-radius:var(--r-sm);padding:.6rem .85rem;margin-bottom:.8rem}
.artifact-icon{font-size:1.4rem;flex-shrink:0}
.artifact-info{flex:1;min-width:0}
.artifact-label{font-size:.72rem;font-weight:700;color:var(--muted);letter-spacing:.03em}
.artifact-desc{font-size:.8rem;color:var(--ink2);font-weight:500;margin-top:.05rem}
.artifact-dest-badge{font-size:.68rem;font-weight:700;padding:.18rem .5rem;border-radius:4px;
  background:var(--surface2);color:var(--sub);border:1px solid var(--border);flex-shrink:0}

/* ── Source card ── */
.source-card{display:flex;align-items:center;gap:.65rem;background:var(--surface);border:1px solid var(--border);
  border-radius:var(--r-xs);padding:.55rem .8rem;margin-bottom:.75rem}
.source-icon{font-size:.95rem;flex-shrink:0;width:1.8rem;height:1.8rem;display:grid;place-items:center;
  border-radius:var(--r-xs);background:var(--surface2)}
.source-body{flex:1;min-width:0}
.source-title{font-weight:600;font-size:.78rem;line-height:1.3}
.source-url{color:var(--muted);font-size:.66rem;margin-top:.08rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* ── Warning ── */
.warning-box{background:var(--amber-bg);border:1px solid var(--amber-line);border-left:3px solid #f59e0b;
  border-radius:var(--r-xs);padding:.65rem .9rem;margin-bottom:1rem;font-size:.8rem;color:#78350f;line-height:1.5}
.warning-box .wl{font-weight:700;font-size:.68rem;letter-spacing:.04em;text-transform:uppercase;
  display:flex;align-items:center;gap:.3rem;margin-bottom:.2rem}

/* ── Anchor panel ── */
.anchor-panel{background:var(--surface);border:2px solid var(--border);border-radius:var(--r);
  padding:1rem 1.1rem;margin-bottom:1.2rem;transition:border-color .2s}
.anchor-panel.filled{border-color:var(--teal);background:var(--teal-bg)}
.anchor-header{display:flex;align-items:center;gap:.55rem;margin-bottom:.6rem}
.anchor-step-num{width:1.6rem;height:1.6rem;border-radius:50%;background:var(--surface2);
  border:2px solid var(--border2);color:var(--muted);font-weight:800;font-size:.75rem;
  display:grid;place-items:center;flex-shrink:0}
.anchor-panel.filled .anchor-step-num{background:var(--teal);border-color:var(--teal);color:#fff}
.anchor-header-text{font-size:.85rem;font-weight:700;color:var(--ink)}
.anchor-header-sub{font-size:.75rem;color:var(--sub);margin-left:.2rem}
.anchor-row{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
.anchor-input{flex:1;min-width:160px;padding:.5rem .75rem;border:1.5px solid var(--border2);border-radius:var(--r-sm);
  font-size:.9rem;font-family:inherit;color:var(--ink);background:#fff;outline:none;transition:border-color .2s}
.anchor-input:focus{border-color:var(--teal);box-shadow:0 0 0 3px var(--teal-line)}
.anchor-btn{padding:.5rem 1rem;background:var(--teal);color:#fff;border:none;border-radius:var(--r-sm);
  font-size:.85rem;font-weight:700;cursor:pointer;font-family:inherit;transition:background .15s}
.anchor-btn:hover{background:#0f766e}
.anchor-btn.ghost{background:var(--surface2);color:var(--sub);border:1px solid var(--border2)}
.anchor-btn.ghost:hover{background:var(--surface3);color:var(--ink2)}
.anchor-result{margin-top:.5rem;font-size:.78rem;color:var(--teal);font-weight:600;display:none}
.anchor-panel.filled .anchor-result{display:block}

/* ── Progress ── */
.progress-wrap{margin:1rem 0 1.3rem}
.progress-label{display:flex;justify-content:space-between;font-size:.73rem;color:var(--muted);margin-bottom:.28rem}
.progress-bar-bg{height:5px;background:var(--surface3);border-radius:999px;overflow:hidden}
.progress-bar-fill{height:100%;border-radius:999px;width:0;transition:width .4s cubic-bezier(.4,0,.2,1)}

/* ── Detail labels ── */
.det{display:grid;grid-template-columns:44px 1fr;gap:.22rem .45rem;margin-top:.35rem;font-size:.79rem;align-items:start}
.det-lbl{font-size:.6rem;font-weight:700;letter-spacing:.04em;padding:.1rem .28rem;border-radius:3px;text-align:center;margin-top:.06rem}
.l-why{background:#f1f5f9;color:#475569}.l-how{background:var(--teal-bg);color:var(--teal)}
.l-done{background:var(--green-bg);color:var(--green)}.l-caution{background:var(--amber-bg);color:var(--amber)}
.l-link{background:var(--blue-bg);color:var(--blue)}
.det-txt{color:var(--ink2);line-height:1.5}.det-txt.caut{color:#78350f}
.det-txt a{font-size:.77rem}
.link-pill{font-size:.6rem;font-weight:600;padding:.06rem .28rem;border-radius:3px;margin-left:.22rem}
.lp-off{background:var(--blue-bg);color:var(--blue)}.lp-ref{background:var(--violet-bg);color:var(--violet)}
.lp-cre{background:var(--rose-bg);color:var(--rose)}

/* ── Checkbox ── */
.cbx{width:1.05rem;height:1.05rem;border:2px solid var(--border2);border-radius:4px;flex-shrink:0;
  cursor:pointer;appearance:none;-webkit-appearance:none;background:#fff;position:relative;transition:all .15s}
.cbx:checked{background:var(--ck-color,#0d9488);border-color:var(--ck-color,#0d9488)}
.cbx:checked::after{content:"✓";position:absolute;color:#fff;font-size:.65rem;font-weight:800;top:50%;left:50%;transform:translate(-50%,-54%)}

/* ── Export panel ── */
.export-panel{margin-top:1.5rem;background:var(--surface);border:1.5px solid var(--border);
  border-radius:var(--r);padding:1rem 1.1rem}
.export-panel-head{display:flex;align-items:center;gap:.5rem;font-size:.82rem;font-weight:700;
  color:var(--ink2);margin-bottom:.75rem}
.export-btn-row{display:flex;gap:.5rem;flex-wrap:wrap}
.export-btn{display:inline-flex;align-items:center;gap:.35rem;padding:.5rem 1rem;border-radius:var(--r-sm);
  font-size:.82rem;font-weight:700;font-family:inherit;cursor:pointer;border:none;transition:all .15s}
.export-btn.primary{background:var(--ink);color:#fff}
.export-btn.primary:hover{background:#292524}
.export-btn.secondary{background:var(--surface2);color:var(--ink2);border:1px solid var(--border2)}
.export-btn.secondary:hover{background:var(--surface3)}
.export-note{margin-top:.6rem;font-size:.72rem;color:var(--muted);line-height:1.5}
.export-copied{display:inline-flex;align-items:center;gap:.25rem;margin-top:.5rem;font-size:.76rem;
  font-weight:700;color:var(--teal);display:none}

/* ── Output ── */
.output-panel{margin-top:1.3rem;border:1px dashed var(--border2);border-radius:var(--r);
  padding:1rem 1.1rem;background:var(--surface)}
.output-head{display:flex;align-items:center;gap:.45rem;font-size:.78rem;font-weight:700;
  color:var(--ink2);margin-bottom:.6rem}
.memo-note{background:var(--accent-bg);border:1px solid var(--accent-line);border-radius:var(--r-sm);
  padding:.75rem .95rem;font-size:.8rem;color:var(--ink2);line-height:1.6}
.memo-note .mtitle{font-weight:700;color:var(--accent2);margin-bottom:.2rem}

/* ── mini cal ── */
.mcal{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;font-size:.67rem}
.mcal .dow{text-align:center;color:var(--muted);font-weight:600;padding:.18rem 0}
.mcal .day{aspect-ratio:1;display:grid;place-items:center;border-radius:4px;color:var(--ink2);background:var(--surface2)}
.mcal .day.mark{background:var(--cal-mark,var(--teal));color:#fff;font-weight:700}
.mcal .day.soft{background:var(--cal-soft,var(--teal-bg));color:var(--cal-mark,var(--teal));font-weight:600}
.mcal .day.empty{background:transparent}

/* ── Sheet table ── */
.sheet-tbl{width:100%;border-collapse:collapse;font-size:.77rem}
.sheet-tbl th{background:var(--surface2);padding:.35rem .5rem;text-align:left;color:var(--sub);font-weight:600;
  border:1px solid var(--border);font-size:.68rem}
.sheet-tbl td{padding:.35rem .5rem;border:1px solid var(--border);color:var(--ink2)}
.sheet-tbl td.ed{background:#fffef9;color:var(--muted);font-style:italic}

/* ── Toast ── */
#toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(120px);
  background:var(--ink);color:#f8f7f4;padding:.6rem 1.2rem;border-radius:var(--r-sm);font-size:.84rem;
  font-weight:600;transition:transform .4s cubic-bezier(.34,1.56,.64,1);z-index:99;box-shadow:var(--shadow-md)}
#toast.show{transform:translateX(-50%) translateY(0)}

@media(max-width:520px){.flow-title{font-size:1.28rem}.det{grid-template-columns:38px 1fr}}
"""

# ── anchor panel HTML ───────────────────────────────────────────────────────
def anchor_panel_html(flow, sections):
    anchor_type = flow.get('anchor','none')
    if anchor_type == 'none':
        return '''<div class="anchor-panel filled" id="anchor-panel">
  <div class="anchor-header">
    <div class="anchor-step-num">1</div>
    <div><span class="anchor-header-text">바로 시작</span>
    <span class="anchor-header-sub">— 날짜 입력 없이 바로 체크합니다</span></div>
  </div>
</div>'''

    meta = ANCHOR_META.get(flow['slug'], {})
    label = meta.get('label', '기준일')
    placeholder = meta.get('placeholder', '날짜 입력')
    unit = meta.get('unit', anchor_type)

    if unit == 'baby_age_month':
        input_html = f'''<input class="anchor-input" id="anchor-val" type="number" min="1" max="72"
          placeholder="{h(placeholder)}" oninput="onAnchorInput(this.value)">
        <span style="font-size:.82rem;color:var(--sub)">개월</span>'''
    else:
        input_html = f'<input class="anchor-input" id="anchor-val" type="date" oninput="onAnchorInput(this.value)">'

    if unit == 'end_date':
        sub_text  = '— 목표일 기준으로 D-X 날짜가 역산됩니다'
        result_text = f'✓ {h(label)} 설정됨 — 아래 항목의 날짜가 반영되었습니다'
    elif unit == 'start_date':
        sub_text  = '— 루틴 기준일로 기록됩니다'
        result_text = f'✓ {h(label)} 설정됨 — 루틴 기준일을 설정했습니다'
    elif unit == 'baby_birth_date':
        sub_text  = '— 생년월일을 입력하면 8차 검진 전체 일정이 캘린더에 표시됩니다'
        result_text = '✓ 생년월일 입력됨 — 아래에서 검진 일정을 확인하세요'
    else:  # baby_age_month
        sub_text  = '— 월령에 맞는 다음 검진 차수를 확인합니다'
        result_text = f'✓ 월령 입력 완료'

    return f'''<div class="anchor-panel" id="anchor-panel">
  <div class="anchor-header">
    <div class="anchor-step-num">1</div>
    <div><span class="anchor-header-text">STEP 1 — {h(label)} 입력</span>
    <span class="anchor-header-sub">{sub_text}</span></div>
  </div>
  <div class="anchor-row">
    {input_html}
    <button class="anchor-btn ghost" onclick="clearAnchor()">초기화</button>
  </div>
  <div class="anchor-result" id="anchor-result">{result_text}</div>
</div>'''

# ── artifact frame HTML ────────────────────────────────────────────────────
def artifact_frame_html(flow):
    dest = flow.get('dest','memo')
    dm = DEST_META.get(dest, DEST_META['memo'])
    src_type = flow.get('src_type','reference')
    src_badge = ('<span class="badge b-official">🏛 공식출처</span>' if src_type == 'official'
                 else '<span class="badge b-reference">📄 참고출처</span>')
    return f'''<div class="artifact-frame">
  <div class="artifact-icon">{dm["icon"]}</div>
  <div class="artifact-info">
    <div class="artifact-label">이 Flow → {h(dm["label"])}</div>
    <div class="artifact-desc">{h(dm["desc"])}</div>
  </div>
  {src_badge}
</div>'''

# ── header ─────────────────────────────────────────────────────────────────
def flow_header(flow):
    risk_map = {'financial_sensitive':('b-fin','💰 재정 주의'),
                'medical_sensitive':('b-med','🏥 의료 주의'),
                'medium':('b-cat','⚠ 주의'),
                'low':('b-low','✓ 안전')}
    struct_map = {'timeline':'⏱ 타임라인','routine':'🔄 루틴','phase':'◉ 단계','checklist':'✓ 체크리스트'}
    risk_cls, risk_lbl = risk_map.get(flow['risk'],('b-low',''))
    struct_lbl = struct_map.get(flow['structure'],'✓')
    src_icon = '🏛' if flow['src_type']=='official' else '📄'

    badges = f'<span class="badge b-cat">{h(flow["category"])}</span> <span class="badge b-cat">{struct_lbl}</span>'
    if risk_lbl:
        badges += f' <span class="badge {risk_cls}">{risk_lbl}</span>'

    return f'''<header>
  <div class="badge-row">{badges}</div>
  <h1 class="flow-title">{h(flow["title"])}</h1>
  <p class="flow-desc">{h(flow["description"])}</p>
  {artifact_frame_html(flow)}
  <a class="source-card" href="{h(flow["src_url"])}" target="_blank" style="text-decoration:none;color:inherit">
    <span class="source-icon">{src_icon}</span>
    <div class="source-body">
      <div class="source-title">{h(flow["src_title"])}</div>
      <div class="source-url">{h(flow["src_url"])}</div>
    </div>
  </a>
</header>'''

# ── export panel ────────────────────────────────────────────────────────────
def export_panel_html(flow, sections):
    dest = flow.get('dest','memo')
    dm = DEST_META.get(dest, DEST_META['memo'])

    lines = [f"# {flow['title']}", f"{flow['description']}", ""]
    for sec in sections:
        lines.append(f"## {sec['title']}")
        for step in sec['steps']:
            lines.append(f"□ {step['name']}")
            for k, lbl in [('why','WHY'),('how','HOW'),('caution','주의')]:
                if step['details'].get(k):
                    lines.append(f"  {lbl}: {step['details'][k]}")
        lines.append("")
    copy_text = '\\n'.join(l.replace("'","\\x27") for l in lines)

    return f'''<div class="export-panel">
  <div class="export-panel-head">
    <span>{dm["icon"]}</span>내 도구로 가져가기
  </div>
  <div class="export-btn-row">
    <button class="export-btn primary" onclick="copyFlow()">
      📋 {h(dm["cta"])}
    </button>
    <button class="export-btn secondary" onclick="shareText()">
      📤 공유 텍스트
    </button>
  </div>
  <div class="export-copied" id="copied-msg">✓ 클립보드에 복사됐어요</div>
  <p class="export-note">복사된 내용을 메모·노트·{h(dm["label"])} 앱에 그대로 붙여넣으면 실행 준비 완료입니다</p>
  <textarea id="copy-payload" style="position:absolute;left:-9999px;top:-9999px;opacity:0" readonly>{h(chr(10).join(lines))}</textarea>
</div>'''

# ── output panel ────────────────────────────────────────────────────────────
def output_panel_html(dest):
    if dest == 'calendar':
        cal = '<div class="mcal">'
        for d in ['일','월','화','수','목','금','토']:
            cal += f'<div class="dow">{d}</div>'
        cal += '<div class="day empty"></div>' * 3
        for i in range(1,29):
            cls = 'mark' if i>=3 else 'soft'
            cal += f'<div class="day {cls}">{i}</div>'
        cal += '</div>'
        return f'<div class="output-panel"><div class="output-head">📅 캘린더 미리보기</div>{cal}</div>'
    if dest == 'sheet':
        return '''<div class="output-panel"><div class="output-head">📊 시트 미리보기</div>
<table class="sheet-tbl"><thead><tr><th>항목</th><th>내용</th><th>날짜</th><th>상태</th></tr></thead>
<tbody><tr><td>항목 1</td><td class="ed">입력</td><td class="ed">날짜</td><td class="ed">-</td></tr>
<tr><td>항목 2</td><td class="ed">입력</td><td class="ed">날짜</td><td class="ed">-</td></tr></tbody></table></div>'''
    return '''<div class="output-panel"><div class="output-head">📝 메모 미리보기</div>
<div class="memo-note"><div class="mtitle">체크 완료 항목 요약</div>완료한 단계가 메모·노트로 정리됩니다.</div></div>'''

# ── progress ring ───────────────────────────────────────────────────────────
def prog_ring(color):
    return f'''<svg id="prog-ring" width="68" height="68" viewBox="0 0 90 90">
  <circle cx="45" cy="45" r="40" fill="none" stroke="#e4e1dc" stroke-width="8"/>
  <circle class="fill" cx="45" cy="45" r="40" fill="none" stroke="{color}" stroke-width="8"
    stroke-linecap="round" stroke-dasharray="251.2" stroke-dashoffset="251.2"
    style="transform:rotate(-90deg);transform-origin:center;transition:stroke-dashoffset .4s"/>
</svg>'''

# ── anchor JS ───────────────────────────────────────────────────────────────
def anchor_js(flow, sections):
    anchor_type = flow.get('anchor','none')
    if anchor_type == 'none':
        return ''
    unit = ANCHOR_META.get(flow['slug'],{}).get('unit', anchor_type)

    if unit == 'baby_birth_date':
        return """
// NHIS 영유아 건강검진 일정 (생년월일 기준)
const CHECKUP=[
  ['1차',   14,   35, false],
  ['2차',  120,  180, false],
  ['3차',  270,  360, false],
  ['4차',  540,  720, true ],
  ['5차',  900, 1080, true ],
  ['6차', 1260, 1440, true ],
  ['7차', 1620, 1800, true ],
  ['8차', 1980, 2130, false],
];
function addDays(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function fmtDate(d){return d.toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});}
function onAnchorInput(val){
  const panel=document.getElementById('anchor-panel');
  const res=document.getElementById('anchor-result');
  if(!val){panel.classList.remove('filled');if(res)res.innerHTML='';return;}
  const birth=new Date(val);
  if(isNaN(birth.getTime())){panel.classList.remove('filled');return;}
  panel.classList.add('filled');
  const today=new Date();
  let rows='';
  for(const [차,dStart,dEnd,구강] of CHECKUP){
    const s=addDays(birth,dStart), e=addDays(birth,dEnd);
    const isPast=e<today, isCurrent=s<=today&&today<=e;
    const badge=isPast?'<span style="color:#aaa">완료</span>':isCurrent?'<strong style="color:#2563eb">지금!</strong>':'<span style="color:#666">예정</span>';
    rows+=`<tr style="opacity:${isPast?'.45':'1'}">
      <td style="padding:.2rem .4rem;font-weight:600">${차}</td>
      <td style="padding:.2rem .4rem">${fmtDate(s)} ~ ${fmtDate(e)}</td>
      <td style="padding:.2rem .4rem">${구강?'✓ 구강검진 겹침':''}</td>
      <td style="padding:.2rem .4rem">${badge}</td>
    </tr>`;
  }
  if(res){
    res.innerHTML=`<div style="font-size:.82rem;margin-top:.3rem"><strong>생년월일 ${val} 기준 검진 일정</strong>
      <table style="border-collapse:collapse;width:100%;margin-top:.4rem">${rows}</table>
      <div style="margin-top:.4rem;font-size:.75rem;color:var(--sub)">실제 검진 가능 기관·날짜는 국민건강보험공단 앱(The건강보험)에서 확인하세요.</div>
    </div>`;
    res.style.display='block';
  }
}
function clearAnchor(){
  document.getElementById('anchor-val').value='';
  document.getElementById('anchor-panel').classList.remove('filled');
  const res=document.getElementById('anchor-result');
  if(res){res.innerHTML='';res.style.display='none';}
}
"""
    elif unit == 'baby_age_month':
        return """
const CHECKUP_SCHEDULE=[
  {차:'1차', min:0,  max:1,  label:'생후 14~35일 (신생아)'},
  {차:'2차', min:4,  max:6,  label:'4~6개월'},
  {차:'3차', min:9,  max:12, label:'9~12개월'},
  {차:'4차', min:18, max:24, label:'18~24개월'},
  {차:'5차', min:30, max:36, label:'30~36개월'},
  {차:'6차', min:42, max:48, label:'42~48개월'},
  {차:'7차', min:54, max:60, label:'54~60개월'},
  {차:'8차', min:66, max:71, label:'66~71개월'},
];
function onAnchorInput(val){
  const v=parseInt(val);
  const panel=document.getElementById('anchor-panel');
  const res=document.getElementById('anchor-result');
  if(!val||isNaN(v)||v<1||v>72){panel.classList.remove('filled');if(res)res.innerHTML='';return;}
  panel.classList.add('filled');
  const current=CHECKUP_SCHEDULE.find(c=>v>=c.min&&v<=c.max);
  const next=CHECKUP_SCHEDULE.find(c=>c.min>v);
  let msg='';
  if(current){
    msg=`<strong>아이 ${v}개월 → 지금 ${current.차} 검진 기간</strong> (${current.label})<br><span style="font-size:.78rem;color:var(--sub)">검진 가능 기간 안에 있습니다.</span>`;
  } else if(next){
    msg=`<strong>아이 ${v}개월 → 다음 ${next.차} 검진</strong> (${next.label})<br><span style="font-size:.78rem;color:var(--sub)">아직 검진 기간이 아닙니다.</span>`;
  } else {
    msg=`<strong>아이 ${v}개월</strong> — 영유아 건강검진 대상 기간(0~71개월)을 지났습니다.`;
  }
  if(res){res.innerHTML=msg;res.style.display='block';}
}
function clearAnchor(){
  document.getElementById('anchor-val').value='';
  document.getElementById('anchor-panel').classList.remove('filled');
  const res=document.getElementById('anchor-result');
  if(res){res.innerHTML='';res.style.display='none';}
}
"""
    else:
        direction = 'end' if unit == 'end_date' else 'start'
        return f"""
function onAnchorInput(val){{
  const panel=document.getElementById('anchor-panel');
  const res=document.getElementById('anchor-result');
  if(!val){{panel.classList.remove('filled');return;}}
  panel.classList.add('filled');
  if(res)res.style.display='block';
  const anchor=new Date(val);
  const today=new Date(); today.setHours(0,0,0,0);
  document.querySelectorAll('[data-day-offset]').forEach(el=>{{
    const offset=parseInt(el.dataset.dayOffset);
    const d=new Date(anchor);
    d.setDate(anchor.getDate()+offset);
    const diff=Math.round((d-today)/(1000*60*60*24));
    const label=diff>0?`D-${{diff}}`:diff===0?`오늘`:`D+${{Math.abs(diff)}}`;
    el.textContent=label;
    el.style.color=diff<=0?'#b91c1c':diff<=7?'#b45309':'#78716c';
  }});
}}
function clearAnchor(){{
  document.getElementById('anchor-val').value='';
  document.getElementById('anchor-panel').classList.remove('filled');
  document.querySelectorAll('[data-day-offset]').forEach(el=>{{
    el.textContent=el.dataset.originalLabel||'';
    el.style.color='';
  }});
}}
"""

# ── export JS (common) ──────────────────────────────────────────────────────
EXPORT_JS = """
function copyFlow(){
  const ta=document.getElementById('copy-payload');
  if(!ta)return;
  try{
    navigator.clipboard.writeText(ta.value).then(()=>showCopied()).catch(()=>fallbackCopy(ta));
  }catch(e){fallbackCopy(ta);}
}
function fallbackCopy(ta){
  ta.style.position='fixed';ta.style.opacity='1';
  ta.select();document.execCommand('copy');
  ta.style.position='absolute';ta.style.opacity='0';
  showCopied();
}
function showCopied(){
  const m=document.getElementById('copied-msg');
  if(m){m.style.display='inline-flex';setTimeout(()=>{m.style.display='none';},2500);}
}
function shareText(){
  const ta=document.getElementById('copy-payload');
  if(!ta)return;
  if(navigator.share){navigator.share({text:ta.value}).catch(()=>{});}
  else copyFlow();
}
"""

# ── check JS ────────────────────────────────────────────────────────────────
def check_js(total, ring_color=None):
    ring_update = ''
    if ring_color:
        ring_update = "const ring=document.getElementById('prog-ring');if(ring){const c=ring.querySelector('circle.fill');if(c)c.style.strokeDashoffset=251.2*(1-done/total);}"
    return f"""
const total={total};let done=0;
function onCheck(el,sid,cls){{
  const node=document.getElementById(sid);
  if(el.checked){{done++;node.classList.add(cls)}}else{{done--;node.classList.remove(cls)}}
  const pct=Math.round(done/total*100);
  document.getElementById('ptext').textContent=done+' / '+total;
  document.getElementById('pbar').style.width=pct+'%';
  {ring_update}
  if(done===total){{const t=document.getElementById('toast');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}}
}}
"""

def check_js_with_si(total, n_sections, sec_step_counts, ring_color=None):
    ring_update = ''
    if ring_color:
        ring_update = "const ring=document.getElementById('prog-ring');if(ring){const c=ring.querySelector('circle.fill');if(c)c.style.strokeDashoffset=251.2*(1-done/total);}"
    return f"""
const total={total};let done=0;
const _sc={sec_step_counts};const _sd={[0]*n_sections};
function onCheck(el,sid,cls,si){{
  const node=document.getElementById(sid);
  const numId=sid.replace('s','');
  const st=document.getElementById('st'+numId);
  if(el.checked){{done++;if(si!=null)_sd[si]++;node.classList.add(cls);if(st){{st.textContent='완료';st.className='gov-item-status status-done';}}}}
  else{{done--;if(si!=null)_sd[si]--;node.classList.remove(cls);if(st){{st.textContent='미완료';st.className='gov-item-status status-todo';}}}}
  const pct=Math.round(done/total*100);
  document.getElementById('ptext').textContent=done+' / '+total;
  document.getElementById('pbar').style.width=pct+'%';
  {ring_update}
  for(let i=0;i<{n_sections};i++){{
    const sp=document.getElementById('gsec-prog-'+i);if(sp)sp.textContent=_sd[i]+'/'+_sc[i];
    const gs=document.getElementById('gstep-'+i);
    if(gs)gs.className='gov-step-ind-item '+(_sd[i]>=_sc[i]?'done':_sd[i]>0?'active':'');
  }}
  if(done===total){{const t=document.getElementById('toast');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}}
}}
"""

def page_wrap(flow, extra_css, total, body_html, page_js, toast_msg='🎉 완료!'):
    warn = f'<div class="warning-box"><div class="wl">⚠️ 주의사항</div>{h(flow["warning"])}</div>' if flow.get('warning') else ''
    prog = f'''<div class="progress-wrap">
  <div class="progress-label"><span>진행률</span><span id="ptext">0 / {total}</span></div>
  <div class="progress-bar-bg"><div class="progress-bar-fill" id="pbar"></div></div>
</div>'''
    return f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{h(flow["title"])} — FLOW</title>
<style>
{BASE_CSS}
{extra_css}
</style>
</head>
<body>
<div class="page">
<a class="back-link" href="index.html">← 전체 목록</a>
{flow_header(flow)}
{warn}
{anchor_panel_html(flow, [])}
{prog}
{body_html}
</div>
<div id="toast">{toast_msg}</div>
<script>
{anchor_js(flow, [])}
{EXPORT_JS}
{page_js}
</script>
</body></html>'''


###############################################################################
# ── TEMPLATE 1: GOV-WIZARD ──────────────────────────────────────────────────
###############################################################################
def render_gov_wizard(flow, sections):
    total = sum(len(s['steps']) for s in sections)
    extra_css = """
--ck-color:#1d6fb5;
.progress-bar-fill{background:#1d6fb5}
.gov-step-indicator{display:flex;align-items:flex-start;gap:0;margin-bottom:1.4rem;overflow-x:auto;padding-bottom:.2rem}
.gov-step-ind-item{display:flex;flex-direction:column;align-items:center;flex:1;min-width:0;position:relative}
.gov-step-ind-item:not(:last-child)::after{content:"";position:absolute;top:1.05rem;left:50%;right:-50%;height:2px;background:var(--border2);z-index:0}
.gov-step-ind-item.done:not(:last-child)::after,.gov-step-ind-item.active:not(:last-child)::after{background:var(--blue)}
.gov-step-num{width:2.1rem;height:2.1rem;border-radius:50%;border:2px solid var(--border2);background:var(--surface);
  display:grid;place-items:center;font-weight:800;font-size:.8rem;color:var(--muted);z-index:1;position:relative}
.gov-step-ind-item.active .gov-step-num{background:var(--blue);border-color:var(--blue);color:#fff;box-shadow:0 0 0 3px var(--blue-line)}
.gov-step-ind-item.done .gov-step-num{background:var(--green);border-color:var(--green);color:#fff}
.gov-step-lbl{font-size:.6rem;color:var(--muted);text-align:center;margin-top:.25rem;line-height:1.3;
  max-width:4.5rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gov-step-ind-item.active .gov-step-lbl{color:var(--blue);font-weight:700}
.gov-step-ind-item.done .gov-step-lbl{color:var(--green);font-weight:600}
.gov-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);margin-bottom:.9rem;overflow:hidden}
.gov-section-head{display:flex;align-items:center;gap:.7rem;padding:.8rem .95rem;border-bottom:1px solid var(--surface3)}
.gov-section-num{width:1.8rem;height:1.8rem;border-radius:50%;background:var(--blue-bg);border:1.5px solid var(--blue-line);
  color:var(--blue);font-weight:800;font-size:.78rem;display:grid;place-items:center;flex-shrink:0}
.gov-section-title{font-weight:700;font-size:.86rem;flex:1}
.gov-section-count{font-size:.68rem;color:var(--muted);background:var(--surface2);padding:.08rem .35rem;border-radius:999px}
.gov-section-progress{font-size:.7rem;color:var(--blue);font-weight:600}
.gov-item{border-bottom:1px solid var(--surface3)}
.gov-item:last-child{border-bottom:none}
.gov-item-head{display:flex;align-items:flex-start;gap:.65rem;padding:.72rem .95rem;cursor:pointer}
.gov-item.done .gov-item-head{opacity:.45}
.gov-item-name{font-size:.88rem;font-weight:600;line-height:1.35;flex:1}
.gov-item-status{font-size:.62rem;font-weight:700;padding:.08rem .32rem;border-radius:3px;white-space:nowrap;flex-shrink:0;margin-top:.12rem}
.status-todo{background:var(--surface2);color:var(--muted)}
.status-done{background:var(--green-bg);color:var(--green)}
.gov-item-details{padding:.45rem .95rem .8rem 3.3rem;border-top:1px solid var(--surface3);background:#fafaf9}
"""
    step_indicator = '<div class="gov-step-indicator">'
    for i, sec in enumerate(sections):
        cls = 'active' if i==0 else ''
        lbl = sec['title'][:9]
        step_indicator += f'<div class="gov-step-ind-item {cls}" id="gstep-{i}"><div class="gov-step-num">{i+1}</div><div class="gov-step-lbl">{h(lbl)}</div></div>'
    step_indicator += '</div>'

    idx, items_html = 0, ''
    for si, sec in enumerate(sections):
        n = len(sec['steps'])
        items_html += f'''<div class="gov-section" id="gsec-{si}">
  <div class="gov-section-head">
    <div class="gov-section-num">{si+1}</div>
    <div class="gov-section-title">{h(sec["title"])}</div>
    <span class="gov-section-count">{n}개</span>
    <span class="gov-section-progress" id="gsec-prog-{si}">0/{n}</span>
  </div>'''
        for step in sec['steps']:
            det = render_details(step)
            det_html = f'<div class="gov-item-details">{det}</div>' if det else ''
            items_html += f'''<div class="gov-item" id="s{idx}">
  <label class="gov-item-head" for="c{idx}">
    <input class="cbx" type="checkbox" id="c{idx}" onchange="onCheck(this,'s{idx}','done',{si})">
    <div style="flex:1"><div class="gov-item-name">{h(step["name"])}</div></div>
    <span class="gov-item-status status-todo" id="st{idx}">미완료</span>
  </label>{det_html}
</div>'''
            idx += 1
        items_html += '</div>'

    body = step_indicator + items_html + export_panel_html(flow, sections) + output_panel_html(flow.get('dest','memo'))
    js = check_js_with_si(total, len(sections), [len(s['steps']) for s in sections])
    return page_wrap(flow, extra_css, total, body, js, '🎉 모든 단계 완료!')


###############################################################################
# ── TEMPLATE 2: TIMELINE-COUNTDOWN ─────────────────────────────────────────
###############################################################################
def render_timeline_countdown(flow, sections):
    total = sum(len(s['steps']) for s in sections)
    extra_css = """
--ck-color:#c96442;
.progress-bar-fill{background:#c96442}
.cbx:checked{background:#c96442;border-color:#c96442}
.tl-hero{background:linear-gradient(135deg,#1c1917,#292524);border-radius:var(--r);
  padding:1.1rem 1.25rem;margin-bottom:1.2rem;display:flex;align-items:center;gap:1rem;color:#fff}
.tl-hero-left{flex:1}
.tl-hero-label{font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:#a8a29e;margin-bottom:.2rem}
.tl-hero-count{font-size:2.2rem;font-weight:900;letter-spacing:-.04em;line-height:1}
.tl-hero-sub{font-size:.75rem;color:#a8a29e;margin-top:.15rem}
.tl-phase-badge{display:inline-flex;align-items:center;gap:.3rem;border-radius:6px;padding:.25rem .65rem;
  font-size:.68rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:1rem 0 .6rem}
.tl-phase-badge.today{background:#1c1917;color:#fff}
.tl-phase-badge.urgent{background:var(--red-bg);border:1px solid var(--red-line);color:var(--red)}
.tl-phase-badge.normal{background:var(--accent-bg);border:1px solid var(--accent-line);color:var(--accent2)}
.tl-phase-badge.future{background:var(--surface2);border:1px solid var(--border);color:var(--muted)}
.tl-node{position:relative;padding-left:3.3rem;padding-bottom:.9rem}
.tl-node::before{content:"";position:absolute;left:1rem;top:.5rem;bottom:-.1rem;width:2px;background:var(--accent-line)}
.tl-node:last-child::before{display:none}
.tl-marker{position:absolute;left:0;top:0;width:2.1rem;height:2.1rem;border-radius:50%;
  background:var(--surface);border:2px solid var(--accent-line);display:grid;place-items:center;
  font-size:.55rem;font-weight:800;color:var(--accent2);z-index:1}
.tl-marker.dday{background:#1c1917;border-color:#1c1917;color:#fff}
.tl-marker.urgent{background:var(--red);border-color:var(--red);color:#fff}
.tl-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);
  padding:.7rem .85rem;transition:box-shadow .15s}
.tl-card:hover{box-shadow:var(--shadow)}
.tl-card.done{opacity:.45}
.tl-head{display:flex;gap:.55rem;align-items:flex-start}
.tl-name{font-size:.88rem;font-weight:600;line-height:1.32;flex:1}
.tl-date-lbl{font-size:.68rem;font-weight:700;color:var(--muted);margin-top:.12rem}
"""
    ring = prog_ring('#c96442')
    hero = f'''<div class="tl-hero">
  <div class="tl-hero-left">
    <div class="tl-hero-label">완료한 항목</div>
    <div class="tl-hero-count" id="hero-cnt">0 <span style="font-size:1.1rem;font-weight:400;color:#78716c">/ {total}</span></div>
    <div class="tl-hero-sub">위에서 아래로 — 마감 역산 순서</div>
  </div>
  <div style="flex-shrink:0">{ring}</div>
</div>'''

    idx, nodes = 0, ''
    for sec in sections:
        title = sec['title'].strip()
        ph_cls = ('today' if 'D-Day' in title else
                  'urgent' if any(x in title for x in ['D-1','D-2','D-3','D-4','D-5','D-6','D-7']) else
                  'future' if any(x in title for x in ['이후','D+']) else 'normal')
        ph_icon = '⚡' if ph_cls=='today' else '🔥' if ph_cls=='urgent' else ''
        nodes += f'<div class="tl-phase-badge {ph_cls}">{ph_icon} {h(title)}</div>'
        for step in sec['steps']:
            anchor = step.get('anchor','')
            marker_cls = ('dday' if 'D-Day' in anchor else
                          'urgent' if any(x in anchor for x in ['D-1','D-2','D-3','D-4','D-5','D-6','D-7']) else '')
            off_m = re.search(r'D[-+]?(\d+)', anchor)
            day_off = off_m.group(0).replace('D-','-').replace('D+','') if off_m else None
            day_attr = f' data-day-offset="{day_off}" data-original-label="{h(anchor)}"' if day_off else ''
            det = render_details(step)
            det_html = f'<div style="margin-top:.35rem">{det}</div>' if det else ''
            nodes += f'''<div class="tl-node">
  <div class="tl-marker {marker_cls}"><span{day_attr}>{h(anchor) if anchor else "·"}</span></div>
  <label class="tl-card" id="s{idx}" for="c{idx}">
    <div class="tl-head">
      <input class="cbx" type="checkbox" id="c{idx}" onchange="onCheck(this,'s{idx}','done')">
      <div style="flex:1"><div class="tl-name">{h(step["name"])}</div>{det_html}</div>
    </div>
  </label>
</div>'''
            idx += 1

    body = hero + nodes + export_panel_html(flow, sections) + output_panel_html(flow.get('dest','memo'))
    js = check_js(total, '#c96442') + f"""
function onCheck(el,sid,cls){{
  const node=document.getElementById(sid);
  if(el.checked){{done++;node.classList.add(cls)}}else{{done--;node.classList.remove(cls)}}
  const pct=Math.round(done/total*100);
  document.getElementById('ptext').textContent=done+' / '+total;
  document.getElementById('pbar').style.width=pct+'%';
  const c=document.getElementById('hero-cnt');
  if(c)c.innerHTML=done+' <span style="font-size:1.1rem;font-weight:400;color:#78716c">/ {total}</span>';
  const ring=document.getElementById('prog-ring');
  if(ring){{const fc=ring.querySelector('circle.fill');if(fc)fc.style.strokeDashoffset=251.2*(1-done/total);}}
  if(done===total){{const t=document.getElementById('toast');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}}
}}
"""
    return page_wrap(flow, extra_css, total, body, js, '🎉 모든 단계 완료!')


###############################################################################
# ── TEMPLATE 3: ROUTINE-HABIT ───────────────────────────────────────────────
###############################################################################
def render_routine_habit(flow, sections):
    total = sum(len(s['steps']) for s in sections)
    cat = flow.get('category','')

    PRESETS = {
        ('스킨케어','뷰티'): ('#be185d','#fdf2f8','#f9a8d4','✨','AM 루틴','5–10분'),
        ('모닝','아침'):     ('#d97706','#fffbeb','#fcd34d','🌅','매일 아침','20–30분'),
        ('식단','요리'):     ('#16a34a','#f0fdf4','#bbf7d0','🥗','주간 반복','주 1회'),
        ('재무','재테크','가계'): ('#2563eb','#eff6ff','#bfdbfe','💰','월간 반복','30–60분'),
        ('반려',):          ('#7c3aed','#f5f3ff','#ddd6fe','🐾','매일','10–20분'),
        ('디지털',):        ('#0891b2','#ecfeff','#a5f3fc','📵','주간 반복','주 1회'),
        ('독서',):          ('#b45309','#fffbeb','#fcd34d','📚','매일','20–30분'),
        ('홈카페',):        ('#78350f','#fef3c7','#fde68a','☕','매일','10–15분'),
    }
    accent,acc_bg,acc_line,icon,cycle,time_est = '#0d9488','#f0fdfa','#99f6e4','✅','매일 반복','20분'
    for keys, vals in PRESETS.items():
        if any(k in cat or k in flow.get('title','') for k in keys):
            accent,acc_bg,acc_line,icon,cycle,time_est = vals; break

    extra_css = f"""
--ck-color:{accent};
.progress-bar-fill{{background:{accent}}}
.cbx:checked{{background:{accent};border-color:{accent}}}
.habit-hero{{background:linear-gradient(135deg,{acc_bg},{acc_line});border:1px solid {acc_line};
  border-radius:var(--r);padding:1.1rem 1.2rem;margin-bottom:1.2rem;display:flex;align-items:center;gap:1rem}}
.habit-hero-info{{flex:1}}
.habit-streak-label{{font-size:.66rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:{accent}}}
.habit-streak-val{{font-size:2rem;font-weight:900;letter-spacing:-.04em;color:{accent};line-height:1.1}}
.habit-streak-sub{{font-size:.75rem;color:var(--sub);margin-top:.12rem}}
.habit-time-chip{{display:inline-flex;align-items:center;gap:.25rem;background:rgba(255,255,255,.75);
  border-radius:999px;padding:.18rem .55rem;font-size:.7rem;font-weight:600;color:var(--ink2);margin-top:.35rem}}
.rt-week{{margin-bottom:1.3rem}}
.rt-week-label{{font-size:.7rem;color:var(--muted);margin-bottom:.38rem;font-weight:600;
  display:flex;align-items:center;justify-content:space-between}}
.rt-streak-cnt{{font-size:.7rem;font-weight:700;color:{accent}}}
.rt-week-grid{{display:grid;grid-template-columns:repeat(7,1fr);gap:.38rem}}
.rt-day{{aspect-ratio:1;border-radius:var(--r-xs);border:1.5px dashed var(--border2);display:grid;
  place-items:center;font-size:.68rem;font-weight:700;color:var(--muted);cursor:pointer;transition:all .15s}}
.rt-day:hover{{border-color:{accent};color:{accent}}}
.rt-day.on{{background:{accent};border-style:solid;border-color:{accent};color:#fff;font-size:.9rem}}
.rt-steps{{display:flex;flex-direction:column;gap:.55rem}}
.rt-step{{display:flex;gap:.8rem;align-items:flex-start;padding-bottom:.85rem;position:relative}}
.rt-step::before{{content:"";position:absolute;left:.88rem;top:1.9rem;bottom:-.1rem;width:2px;background:{acc_line}}}
.rt-step:last-child::before{{display:none}}
.rt-num{{width:1.8rem;height:1.8rem;border-radius:50%;background:{acc_bg};border:2px solid {acc_line};
  color:{accent};font-weight:800;font-size:.78rem;display:grid;place-items:center;flex-shrink:0;z-index:1;transition:all .2s}}
.rt-step.done .rt-num{{background:{accent};border-color:{accent};color:#fff}}
.rt-card{{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);
  padding:.68rem .88rem;cursor:pointer;transition:box-shadow .15s}}
.rt-card:hover{{box-shadow:var(--shadow)}}
.rt-step.done .rt-card{{opacity:.45}}
.rt-name{{font-size:.88rem;font-weight:600;line-height:1.32}}
.rt-sec-badge{{font-size:.66rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
  color:var(--muted);margin:.9rem 0 .38rem;padding-left:.2rem}}
"""
    ring = prog_ring(accent)
    hero = f'''<div class="habit-hero">
  <div class="habit-hero-info">
    <div class="habit-streak-label">연속 실천 스트릭</div>
    <div class="habit-streak-val" id="streak-val">0 <span style="font-size:1.1rem;font-weight:400;color:var(--muted)">일</span></div>
    <div class="habit-streak-sub">{cycle} · {h(flow["category"])}</div>
    <div class="habit-time-chip">⏱ {h(time_est)}</div>
  </div>
  <div style="flex-shrink:0">{ring}</div>
</div>'''

    days = ['월','화','수','목','금','토','일']
    week_grid = ''.join(f'<div class="rt-day" onclick="toggleDay(this,\'{d}\')">{d}</div>' for d in days)
    weekly = f'''<div class="rt-week">
  <div class="rt-week-label"><span>이번 주 실천 기록</span><span class="rt-streak-cnt" id="streak-cnt">0일 연속</span></div>
  <div class="rt-week-grid">{week_grid}</div>
</div>'''

    idx, steps_html = 0, '<div class="rt-steps">'
    for sec in sections:
        if len(sections) > 1:
            steps_html += f'<div class="rt-sec-badge">{h(sec["title"])}</div>'
        for step in sec['steps']:
            det = render_details(step)
            det_html = f'<div style="margin-top:.35rem">{det}</div>' if det else ''
            steps_html += f'''<div class="rt-step" id="s{idx}">
  <div class="rt-num">{idx+1}</div>
  <label class="rt-card" for="c{idx}">
    <input class="cbx" type="checkbox" id="c{idx}" style="float:right" onchange="onCheck(this,'s{idx}','done')">
    <div class="rt-name">{h(step["name"])}</div>{det_html}
  </label>
</div>'''
            idx += 1
    steps_html += '</div>'

    body = hero + weekly + steps_html + export_panel_html(flow, sections) + output_panel_html(flow.get('dest','calendar'))
    js = check_js(total, accent) + f"""
let _streakDays=0;
function toggleDay(el,day){{
  el.classList.toggle('on');
  if(el.classList.contains('on'))el.textContent='{icon}';
  else el.textContent=day;
  _streakDays=document.querySelectorAll('.rt-day.on').length;
  document.getElementById('streak-cnt').textContent=_streakDays+'일 연속';
  const sv=document.getElementById('streak-val');
  if(sv)sv.innerHTML=_streakDays+' <span style="font-size:1.1rem;font-weight:400;color:var(--muted)">일</span>';
}}
function onCheck(el,sid,cls){{
  const node=document.getElementById(sid);
  if(el.checked){{done++;node.classList.add(cls)}}else{{done--;node.classList.remove(cls)}}
  const pct=Math.round(done/total*100);
  document.getElementById('ptext').textContent=done+' / '+total;
  document.getElementById('pbar').style.width=pct+'%';
  const ring=document.getElementById('prog-ring');
  if(ring){{const c=ring.querySelector('circle.fill');if(c)c.style.strokeDashoffset=251.2*(1-done/total);}}
  if(done===total){{const t=document.getElementById('toast');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}}
}}
"""
    return page_wrap(flow, extra_css, total, body, js, f'{icon} 오늘 루틴 완료!')


###############################################################################
# ── TEMPLATE 4: PHASE-MILESTONE ─────────────────────────────────────────────
###############################################################################
def render_phase_milestone(flow, sections):
    total = sum(len(s['steps']) for s in sections)
    extra_css = """
--ck-color:#7c3aed;
.progress-bar-fill{background:#7c3aed}
.cbx:checked{background:#7c3aed;border-color:#7c3aed}
.phase-stepper{display:flex;overflow-x:auto;gap:0;margin-bottom:1.4rem;padding:.25rem 0 .4rem}
.phase-step{display:flex;flex-direction:column;align-items:center;flex:0 0 auto;min-width:5rem;position:relative;padding:0 .25rem}
.phase-step:not(:last-child)::after{content:"";position:absolute;top:1.05rem;left:calc(50% + 1.05rem);
  right:calc(-50% + 1.05rem);height:2px;background:var(--border2)}
.phase-step.active:not(:last-child)::after,.phase-step.done:not(:last-child)::after{background:var(--violet-line)}
.phase-dot{width:2.1rem;height:2.1rem;border-radius:50%;background:var(--surface2);border:2px solid var(--border2);
  display:grid;place-items:center;font-size:.72rem;font-weight:800;color:var(--muted);position:relative;z-index:1;margin-bottom:.25rem}
.phase-step.active .phase-dot{background:#7c3aed;border-color:#7c3aed;color:#fff;box-shadow:0 0 0 3px var(--violet-line)}
.phase-step.done .phase-dot{background:var(--green);border-color:var(--green);color:#fff}
.phase-step.upcoming .phase-dot{background:var(--violet-bg);border-color:var(--violet-line);color:#7c3aed}
.phase-step-lbl{font-size:.6rem;text-align:center;color:var(--muted);line-height:1.3}
.phase-step.active .phase-step-lbl,.phase-step.upcoming .phase-step-lbl{color:#7c3aed;font-weight:700}
.pm-section{margin-bottom:1rem}
.pm-section-head{display:flex;align-items:center;gap:.6rem;padding:.72rem .95rem;
  background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md) var(--r-md) 0 0;
  border-bottom:2px solid #7c3aed}
.pm-section-title{font-weight:700;font-size:.88rem;flex:1}
.pm-type-badge{font-size:.62rem;font-weight:700;padding:.12rem .38rem;border-radius:3px}
.type-exam{background:#ede9fe;color:#6d28d9}.type-oral{background:#fce7f3;color:#be185d}
.type-dev{background:#d1fae5;color:#065f46}.type-vacc{background:#dbeafe;color:#1e40af}
.pm-item{background:var(--surface);border:1px solid var(--border);border-top:none;
  padding:.65rem .95rem;cursor:pointer;transition:background .1s}
.pm-item:last-child{border-radius:0 0 var(--r-md) var(--r-md)}
.pm-item.done{opacity:.45}
.pm-item-name{font-size:.86rem;font-weight:600;line-height:1.32}
"""
    labels = []
    for sec in sections:
        m = re.search(r'(\d+개월|\d+~\d+개월|신생아|일반|성인|영아)', sec['title'])
        labels.append(m.group(0) if m else sec['title'][:5])

    stepper = '<div class="phase-stepper">'
    for i,(sec,lbl) in enumerate(zip(sections,labels)):
        cls = 'active' if i==0 else 'upcoming'
        stepper += f'<div class="phase-step {cls}" id="ps-{i}"><div class="phase-dot">{i+1}</div><div class="phase-step-lbl">{h(lbl)}</div></div>'
    stepper += '</div>'

    idx, items_html = 0, ''
    sec_counts = []
    for si, sec in enumerate(sections):
        n = len(sec['steps'])
        sec_counts.append(n)
        title = sec['title']
        type_lbl,type_cls = '',''
        if '구강' in title: type_lbl,type_cls='구강검진','type-oral'
        elif '발달' in title: type_lbl,type_cls='발달평가','type-dev'
        elif '예방' in title: type_lbl,type_cls='예방접종','type-vacc'
        elif '일반' in title: type_lbl,type_cls='일반검진','type-exam'
        type_badge = f'<span class="pm-type-badge {type_cls}">{type_lbl}</span>' if type_lbl else ''
        items_html += f'''<div class="pm-section">
  <div class="pm-section-head"><span>🏥</span><div class="pm-section-title">{h(title)}</div>{type_badge}</div>'''
        for step in sec['steps']:
            det = render_details(step)
            det_html = f'<div style="padding:.35rem .95rem .65rem 3.2rem">{det}</div>' if det else ''
            items_html += f'''<label class="pm-item" id="s{idx}" for="c{idx}">
  <div style="display:flex;gap:.65rem;align-items:flex-start">
    <input class="cbx" type="checkbox" id="c{idx}" style="margin-top:.12rem" onchange="onCheck(this,'s{idx}','done',{si})">
    <div class="pm-item-name">{h(step["name"])}</div>
  </div>
</label>{det_html}'''
            idx += 1
        items_html += '</div>'

    body = stepper + items_html + export_panel_html(flow, sections) + output_panel_html('calendar')
    js = f"""
const _psc={sec_counts};const _psd={[0]*len(sections)};const total={total};let done=0;
function onCheck(el,sid,cls,si){{
  const node=document.getElementById(sid);
  if(el.checked){{done++;_psd[si]++;node.classList.add(cls)}}else{{done--;_psd[si]--;node.classList.remove(cls)}}
  document.getElementById('ptext').textContent=done+' / '+total;
  document.getElementById('pbar').style.width=(done/total*100)+'%';
  for(let i=0;i<{len(sections)};i++){{
    const ps=document.getElementById('ps-'+i);
    if(ps)ps.className='phase-step '+(_psd[i]>=_psc[i]?'done':_psd[i]>0?'active':'upcoming');
  }}
  if(done===total){{const t=document.getElementById('toast');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}}
}}
{EXPORT_JS}
"""
    return page_wrap(flow, extra_css, total, body, js, '🎉 모든 검진 확인!')


###############################################################################
# ── TEMPLATE 5-8: simplified renders ────────────────────────────────────────
###############################################################################
def render_cooking(flow, sections):
    total = sum(len(s['steps']) for s in sections)
    extra_css = """
--ck-color:#16a34a;.progress-bar-fill{background:#16a34a}.cbx:checked{background:#16a34a;border-color:#16a34a}
.cook-hero{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:var(--r);padding:1rem 1.15rem;margin-bottom:1.2rem;display:flex;align-items:center;gap:.9rem}
.cook-hero-icon{font-size:2.3rem}.cook-hero-label{font-size:.66rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#15803d}
.cook-section{background:var(--surface);border:1px solid #bbf7d0;border-radius:var(--r);margin-bottom:.9rem;overflow:hidden}
.cook-sec-head{background:#f0fdf4;padding:.6rem .95rem;font-size:.78rem;font-weight:700;color:#15803d;display:flex;align-items:center;gap:.45rem;border-bottom:1px solid #bbf7d0}
.cook-item{border-bottom:1px solid #f0fdf4}.cook-item:last-child{border-bottom:none}.cook-item.done{opacity:.45}
.cook-item-row{display:flex;align-items:flex-start;gap:.65rem;padding:.65rem .95rem;cursor:pointer}
.cook-name{font-size:.87rem;font-weight:600;line-height:1.32;flex:1}.cook-details{padding:.3rem .95rem .65rem 3.2rem}
"""
    hero = f'<div class="cook-hero"><div class="cook-hero-icon">🍳</div><div><div class="cook-hero-label">레시피 실전 적용</div><div style="font-size:.95rem;font-weight:800;color:#1c1917;margin-top:.1rem">{h(flow["title"])}</div></div></div>'
    icons = ['🥕','🍳','📝','🌿']
    idx, items_html = 0, ''
    for si, sec in enumerate(sections):
        icon = icons[si] if si<len(icons) else '•'
        items_html += f'<div class="cook-section"><div class="cook-sec-head">{icon} {h(sec["title"])}</div>'
        for step in sec['steps']:
            det = render_details(step)
            det_html = f'<div class="cook-details">{det}</div>' if det else ''
            items_html += f'<div class="cook-item" id="s{idx}"><label class="cook-item-row" for="c{idx}"><input class="cbx" type="checkbox" id="c{idx}" style="margin-top:.14rem" onchange="onCheck(this,\'s{idx}\',\'done\')"><div class="cook-name">{h(step["name"])}</div></label>{det_html}</div>'
            idx += 1
        items_html += '</div>'
    body = hero + items_html + export_panel_html(flow, sections) + output_panel_html('memo')
    js = check_js(total) + "function onCheck(el,sid,cls){const node=document.getElementById(sid);if(el.checked){done++;node.classList.add(cls)}else{done--;node.classList.remove(cls)}document.getElementById('ptext').textContent=done+' / '+total;document.getElementById('pbar').style.width=(done/total*100)+'%';if(done===total){const t=document.getElementById('toast');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}}"
    return page_wrap(flow, extra_css, total, body, js, '🍽 요리 완성!')


def render_travel_pack(flow, sections):
    total = sum(len(s['steps']) for s in sections)
    extra_css = "--ck-color:#2563eb;.progress-bar-fill{background:#2563eb}.cbx:checked{background:#2563eb;border-color:#2563eb}.pack-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);margin-bottom:.8rem;overflow:hidden}.pack-sec-head{display:flex;align-items:center;gap:.6rem;padding:.72rem .95rem;border-bottom:1px solid var(--surface3)}.pack-sec-title{font-weight:700;font-size:.86rem;flex:1}.pack-item{display:flex;align-items:flex-start;gap:.65rem;padding:.62rem .95rem;border-bottom:1px solid var(--surface3);cursor:pointer}.pack-item:last-child{border-bottom:none}.pack-item.done .pack-name{opacity:.4;text-decoration:line-through}.pack-name{font-size:.87rem;font-weight:600;line-height:1.32;flex:1}.pack-details{padding:.28rem .95rem .6rem 3.15rem}"
    travel_icons = {'문서':'🪪','의류':'👔','세면':'🧴','전자':'💻','기타':'🎒','준비':'📋'}
    idx, items_html = 0, ''
    sec_counts = [len(s['steps']) for s in sections]
    for si, sec in enumerate(sections):
        title = sec['title']
        icon = next((v for k,v in travel_icons.items() if k in title), '📦')
        n = len(sec['steps'])
        items_html += f'<div class="pack-section"><div class="pack-sec-head"><span>{icon}</span><div class="pack-sec-title">{h(title)}</div></div>'
        for step in sec['steps']:
            det = render_details(step)
            det_html = f'<div class="pack-details">{det}</div>' if det else ''
            items_html += f'<div id="s{idx}"><label class="pack-item" for="c{idx}"><input class="cbx" type="checkbox" id="c{idx}" style="margin-top:.14rem" onchange="onCheck(this,\'s{idx}\',\'done\',{si})"><div class="pack-name">{h(step["name"])}</div></label>{det_html}</div>'
            idx += 1
        items_html += '</div>'
    body = items_html + export_panel_html(flow, sections) + output_panel_html('memo')
    js = f"const total={total};let done=0;const _tc={sec_counts};const _td={[0]*len(sections)};function onCheck(el,sid,cls,si){{const node=document.getElementById(sid);if(el.checked){{done++;_td[si]++;node.classList.add(cls)}}else{{done--;_td[si]--;node.classList.remove(cls)}}document.getElementById('ptext').textContent=done+' / '+total;document.getElementById('pbar').style.width=(done/total*100)+'%';if(done===total){{const t=document.getElementById('toast');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}}}}{EXPORT_JS}"
    return page_wrap(flow, extra_css, total, body, js, '🎒 짐 싸기 완료!')


def render_finance_checklist(flow, sections):
    total = sum(len(s['steps']) for s in sections)
    extra_css = "--ck-color:#2563eb;.progress-bar-fill{background:#2563eb}.cbx:checked{background:#2563eb;border-color:#2563eb}.fin-step{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);margin-bottom:.55rem;overflow:hidden}.fin-step-head{display:flex;align-items:flex-start;gap:.7rem;padding:.75rem .95rem;cursor:pointer}.fin-step.done .fin-step-head{opacity:.4}.fin-step-num{width:1.65rem;height:1.65rem;border-radius:50%;background:var(--blue-bg);border:1.5px solid var(--blue-line);color:var(--blue);font-weight:800;font-size:.76rem;display:grid;place-items:center;flex-shrink:0;margin-top:.06rem}.fin-step.done .fin-step-num{background:#2563eb;border-color:#2563eb;color:#fff}.fin-step-name{font-size:.88rem;font-weight:600;line-height:1.32;flex:1}.fin-step-details{padding:.38rem .95rem .75rem 3.3rem;border-top:1px solid var(--surface3)}.fin-sec-lbl{font-size:.68rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin:1rem 0 .38rem}"
    idx, steps_html = 0, ''
    for sec in sections:
        if len(sections) > 1:
            steps_html += f'<div class="fin-sec-lbl">{h(sec["title"])}</div>'
        for step in sec['steps']:
            det = render_details(step)
            det_html = f'<div class="fin-step-details">{det}</div>' if det else ''
            steps_html += f'<div class="fin-step" id="s{idx}"><label class="fin-step-head" for="c{idx}"><div class="fin-step-num">{idx+1}</div><input class="cbx" type="checkbox" id="c{idx}" style="margin-top:.14rem;float:right" onchange="onCheck(this,\'s{idx}\',\'done\')"><div class="fin-step-name">{h(step["name"])}</div></label>{det_html}</div>'
            idx += 1
    body = steps_html + export_panel_html(flow, sections) + output_panel_html('sheet')
    js = check_js(total) + "function onCheck(el,sid,cls){const node=document.getElementById(sid);if(el.checked){done++;node.classList.add(cls)}else{done--;node.classList.remove(cls)}document.getElementById('ptext').textContent=done+' / '+total;document.getElementById('pbar').style.width=(done/total*100)+'%';if(done===total){const t=document.getElementById('toast');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}}"
    return page_wrap(flow, extra_css, total, body, js, '💰 재무 체크 완료!')


def render_task_checklist(flow, sections):
    total = sum(len(s['steps']) for s in sections)
    cat = flow.get('category','')
    TASK_PRESETS = {
        ('독서',):   ('#b45309','#fffbeb','#fcd34d','📚','독서 실행 Flow'),
        ('정리','수납'): ('#7c3aed','#f5f3ff','#ddd6fe','🗂','정리·수납 Flow'),
        ('콘텐츠','창작'): ('#0891b2','#ecfeff','#a5f3fc','🎬','콘텐츠 창작 Flow'),
        ('커리어','취업'): ('#1d4ed8','#eff6ff','#bfdbfe','💼','커리어 Flow'),
    }
    accent,acc_bg,acc_line,icon,hero_lbl = '#0d9488','#f0fdfa','#99f6e4','✅','실행 Flow'
    for keys, vals in TASK_PRESETS.items():
        if any(k in cat for k in keys):
            accent,acc_bg,acc_line,icon,hero_lbl = vals; break
    extra_css = f"--ck-color:{accent};.progress-bar-fill{{background:{accent}}}.cbx:checked{{background:{accent};border-color:{accent}}}.task-section{{margin-bottom:1.1rem}}.task-sec-head{{display:flex;align-items:center;justify-content:space-between;margin-bottom:.42rem}}.task-sec-title{{font-size:.72rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}}.task-item{{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);margin-bottom:.42rem;overflow:hidden}}.task-item.done{{opacity:.45}}.task-item-head{{display:flex;align-items:flex-start;gap:.65rem;padding:.72rem .9rem;cursor:pointer}}.task-item-name{{font-size:.88rem;font-weight:600;line-height:1.32;flex:1}}.task-details{{padding:.35rem .9rem .72rem 3.2rem;border-top:1px solid var(--surface3)}}"
    idx, items_html = 0, ''
    sec_counts = [len(s['steps']) for s in sections]
    for si, sec in enumerate(sections):
        items_html += f'<div class="task-section"><div class="task-sec-head"><span class="task-sec-title">{h(sec["title"])}</span></div>'
        for step in sec['steps']:
            det = render_details(step)
            det_html = f'<div class="task-details">{det}</div>' if det else ''
            items_html += f'<div class="task-item" id="s{idx}"><label class="task-item-head" for="c{idx}"><input class="cbx" type="checkbox" id="c{idx}" style="margin-top:.14rem" onchange="onCheck(this,\'s{idx}\',\'done\',{si})"><div class="task-item-name">{h(step["name"])}</div></label>{det_html}</div>'
            idx += 1
        items_html += '</div>'
    body = items_html + export_panel_html(flow, sections) + output_panel_html(flow.get('dest','memo'))
    js = f"const total={total};let done=0;const _tc2={sec_counts};const _td2={[0]*len(sections)};function onCheck(el,sid,cls,si){{const node=document.getElementById(sid);if(el.checked){{done++;_td2[si]++;node.classList.add(cls)}}else{{done--;_td2[si]--;node.classList.remove(cls)}}document.getElementById('ptext').textContent=done+' / '+total;document.getElementById('pbar').style.width=(done/total*100)+'%';if(done===total){{const t=document.getElementById('toast');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}}}}{EXPORT_JS}"
    return page_wrap(flow, extra_css, total, body, js, '✅ 모두 완료!')


###############################################################################
# ── ROUTER ───────────────────────────────────────────────────────────────────
###############################################################################
def render_flow(flow):
    sections = parse_steps(flow.get('raw',''))
    if not sections:
        sections = [{'title':'항목','steps':[{'name':'준비 중','details':{}}]}]
    s = flow['structure']
    src = flow['src_type']
    cat = flow.get('category','')
    slug = flow['slug']

    if s == 'phase':            return render_phase_milestone(flow, sections)
    if s == 'timeline':         return render_timeline_countdown(flow, sections)
    if s == 'routine':          return render_routine_habit(flow, sections)
    if slug == 'recipe-video-execute': return render_cooking(flow, sections)
    if slug == 'travel-packing-list':  return render_travel_pack(flow, sections)
    if '재무' in cat or '재테크' in cat or '가계' in cat:
        if src != 'official':   return render_finance_checklist(flow, sections)
    if src == 'official':       return render_gov_wizard(flow, sections)
    return render_task_checklist(flow, sections)


###############################################################################
# ── INDEX ────────────────────────────────────────────────────────────────────
###############################################################################
def build_index(off_flows, cre_flows):
    def card(flow):
        dest = flow.get('dest','memo')
        dm = DEST_META.get(dest, DEST_META['memo'])
        risk_icon = {'financial_sensitive':'💰','medical_sensitive':'🏥','medium':'⚠','low':''}.get(flow['risk'],'')
        src_cls = 'off' if flow['src_type']=='official' else 'ref'
        anchor_icon = '📅' if flow['anchor'] != 'none' else ''
        return f'''<a class="card" href="{h(flow["slug"])}.html">
  <div class="card-top"><span class="cat-badge">{h(flow["category"])}</span><span class="dest-badge">{dm["icon"]} {h(dm["label"])}</span></div>
  <div class="card-title">{h(flow["title"])}</div>
  <div class="card-desc">{h(flow["description"][:70])}{"…" if len(flow["description"])>70 else ""}</div>
  <div class="card-foot">
    <span class="src-badge {src_cls}">{"🏛 공식" if flow["src_type"]=="official" else "📄 참고"}</span>
    {f'<span class="anchor-icon">{anchor_icon} 날짜 입력</span>' if anchor_icon else ''}
    {f'<span class="risk-icon">{risk_icon}</span>' if risk_icon else ''}
  </div>
</a>'''

    off_cards = '\n'.join(card(f) for f in off_flows)
    cre_cards = '\n'.join(card(f) for f in cre_flows)

    return f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FLOW — 44개 실행 루트 목록</title>
<style>
:root{{--bg:#f8f7f4;--surface:#fff;--surface2:#f2f1ee;--border:#e4e1dc;--ink:#1c1917;--sub:#78716c;--muted:#a8a29e;--accent:#c96442;--blue:#1d6fb5;--teal:#0d9488}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;font-size:14px}}
.wrap{{max-width:1120px;margin:0 auto;padding:2rem 1.2rem 5rem}}
.concept{{background:var(--ink);color:#f8f7f4;border-radius:14px;padding:1.6rem 1.8rem;margin-bottom:2rem}}
.concept-kicker{{font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#a8a29e;margin-bottom:.35rem}}
.concept-title{{font-size:1.5rem;font-weight:900;letter-spacing:-.02em;line-height:1.2;margin-bottom:.4rem}}
.concept-desc{{font-size:.88rem;color:#a8a29e;line-height:1.6;max-width:600px}}
.concept-flow{{display:flex;align-items:center;gap:.4rem;margin-top:.9rem;flex-wrap:wrap}}
.concept-step{{font-size:.75rem;font-weight:700;color:#f8f7f4;background:#292524;border-radius:6px;padding:.3rem .6rem}}
.concept-arrow{{color:#78716c;font-size:.8rem}}
.concept-step.highlight{{background:var(--accent);color:#fff}}
.stats{{display:grid;grid-template-columns:repeat(5,1fr);gap:.6rem;margin-bottom:2rem}}
.stat{{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.65rem .85rem}}
.stat-n{{font-size:1.35rem;font-weight:800;letter-spacing:-.02em}}
.stat-l{{font-size:.68rem;color:var(--sub);margin-top:.08rem;line-height:1.3}}
.section-hd{{display:flex;align-items:center;justify-content:space-between;margin:2rem 0 .9rem}}
.section-hd h2{{font-size:.76rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}}
.section-meta{{font-size:.75rem;color:var(--sub)}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:.75rem}}
.card{{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:.9rem 1rem .85rem;
  text-decoration:none;color:var(--ink);display:flex;flex-direction:column;gap:.38rem;transition:box-shadow .15s,border-color .15s}}
.card:hover{{box-shadow:0 4px 16px rgba(28,25,23,.09);border-color:#ccc8c2}}
.card-top{{display:flex;align-items:center;justify-content:space-between;gap:.4rem}}
.cat-badge{{font-size:.66rem;font-weight:600;color:var(--sub);background:var(--surface2);padding:.12rem .4rem;border-radius:4px;border:1px solid var(--border)}}
.dest-badge{{font-size:.66rem;font-weight:600;color:#0f766e;background:#f0fdfa;padding:.12rem .4rem;border-radius:4px;border:1px solid #99f6e4}}
.card-title{{font-size:.88rem;font-weight:700;line-height:1.32;color:var(--ink)}}
.card-desc{{font-size:.73rem;color:var(--sub);line-height:1.5}}
.card-foot{{display:flex;align-items:center;gap:.4rem;margin-top:.1rem;flex-wrap:wrap}}
.src-badge{{font-size:.62rem;font-weight:700;padding:.08rem .3rem;border-radius:3px}}
.src-badge.off{{background:#eff6ff;color:#1d4ed8}}.src-badge.ref{{background:#f5f3ff;color:#6d28d9}}
.anchor-icon{{font-size:.62rem;color:#0d9488;font-weight:600}}.risk-icon{{font-size:.75rem}}
@media(max-width:600px){{.stats{{grid-template-columns:repeat(2,1fr)}}.concept-title{{font-size:1.2rem}}}}
</style>
</head>
<body>
<div class="wrap">
<div class="concept">
  <div class="concept-kicker">FLOW — 실행 루트 라이브러리</div>
  <div class="concept-title">좋은 콘텐츠를 <br>즉시 실행 가능한 루트로</div>
  <div class="concept-desc">공식 서비스·크리에이터 콘텐츠를 체크리스트·캘린더·메모·스프레드시트로 변환합니다. 내 도구에 복사해서 바로 실행하세요.</div>
  <div class="concept-flow">
    <span class="concept-step">콘텐츠</span><span class="concept-arrow">→</span>
    <span class="concept-step">날짜 입력</span><span class="concept-arrow">→</span>
    <span class="concept-step highlight">아티팩트 생성</span><span class="concept-arrow">→</span>
    <span class="concept-step">내 도구로 복사</span><span class="concept-arrow">→</span>
    <span class="concept-step">체크 실행</span>
  </div>
</div>
<div class="stats">
  <div class="stat"><div class="stat-n" style="color:#0d9488">44</div><div class="stat-l">전체 Flow<br>공식 24 + 크리에이터 20</div></div>
  <div class="stat"><div class="stat-n" style="color:#1d4ed8">8</div><div class="stat-l">UX 패턴<br>카테고리별 최적화</div></div>
  <div class="stat"><div class="stat-n" style="color:#c96442">13</div><div class="stat-l">날짜 입력 Flow<br>D-day 역산 지원</div></div>
  <div class="stat"><div class="stat-n" style="color:#b91c1c">14</div><div class="stat-l">민감 Flow<br>재무 12 + 의료 2</div></div>
  <div class="stat"><div class="stat-n" style="color:#7c3aed">4</div><div class="stat-l">내보내기 유형<br>캘린더·시트·메모·하이브리드</div></div>
</div>
<div class="section-hd">
  <h2>🏛 공식출처 — 정부·공공 서비스 (24개)</h2>
  <span class="section-meta">정부24·건강보험·장학재단·청약홈 등 실재 포털 매핑</span>
</div>
<div class="grid">{off_cards}</div>
<div class="section-hd" style="margin-top:2.4rem">
  <h2>📝 크리에이터·생활 콘텐츠 (20개)</h2>
  <span class="section-meta">YouTube·블로그 기반 라이프스타일 Flow</span>
</div>
<div class="grid">{cre_cards}</div>
<p style="margin-top:2rem;font-size:.72rem;color:var(--muted);border-top:1px solid var(--border);padding-top:.9rem">
  모든 Flow는 source_status: needs_review (공개 MVP 전) · WebSearch 교차확인 기준 · 공식 확인이 필요한 항목은 각 페이지에서 표시됩니다.
</p>
</div>
</body>
</html>'''


###############################################################################
# ── MAIN ─────────────────────────────────────────────────────────────────────
###############################################################################
off_flows = parse_flows(ROOT/'lib/flow/contents-batch-260601-official.ts', 'official')
cre_flows = parse_flows(ROOT/'lib/flow/contents-batch-260601-creator.ts', 'reference')
print(f"Parsed: {len(off_flows)} official + {len(cre_flows)} creator = {len(off_flows)+len(cre_flows)} total")

ok, errors = 0, []
for flow in off_flows + cre_flows:
    if not flow['slug']: continue
    try:
        html = render_flow(flow)
        (OUT / f"{flow['slug']}.html").write_text(html, encoding='utf-8')
        ok += 1
        print(f"  ✓ {flow['slug']} [{flow['structure']}] anchor={flow['anchor']}")
    except Exception as e:
        errors.append((flow['slug'], e))
        print(f"  ✗ {flow['slug']}: {e}")

(OUT / 'index.html').write_text(build_index(off_flows, cre_flows), encoding='utf-8')
print(f"\nindex.html written")
print(f"Done: {ok} flows + index, {len(errors)} errors")
for s,e in errors: print(f"  ERROR {s}: {e}")
