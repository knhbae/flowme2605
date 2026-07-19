# URL-to-FLOW Prompt Lab HTML Deck Visual Spec

Date: 2026-07-14<br>
Surface: self-contained Korean HTML presentation report

## Accepted concept references

- `docs/content-audit/2026-07-14-url-to-flow-prompt-lab/concepts/slide-concept-cover.png`
- `docs/content-audit/2026-07-14-url-to-flow-prompt-lab/concepts/slide-concept-gallery.png`
- `docs/content-audit/2026-07-14-url-to-flow-prompt-lab/concepts/slide-concept-pipeline.png`

The concepts establish the visual system, not report evidence. All final report text, data, controls, arrows, and status marks remain code-native.

## Visual direction

- Background: true white `#ffffff`.
- Main text: near black `#0b0b0d`.
- System/evidence accent: cobalt `#123dcc`.
- Gate/exception accent: coral `#ff4b2f`.
- Quiet rule: `#d8dce6`; pale evidence field: `#f2f5ff`.
- Typography: `Pretendard`, `Noto Sans KR`, `Apple SD Gothic Neo`, system sans-serif fallback.
- Headline: bold editorial Korean, short lines, 56–72 px on desktop.
- Body: 20–30 px on desktop; controls and evidence captions 14–16 px.
- Container model: open rails, ruled rows, comparison tables, and one purposeful outline. Avoid nested cards and bento grids.
- Geometry: square or lightly rounded corners, thin cobalt rules, solid arrows, coral only for control points and exceptions.

## Slide and component families

1. **Concrete transformation**: SourceRow on the left, arrow, Item fields on the right, one result line below.
2. **Ruled example gallery**: three to five full-width rows with source, transformation, and outcome.
3. **Ownership pipeline**: one horizontal rail with system-generated stages in cobalt and rule-owned gates in coral.
4. **Score table**: open table with explicit numerator/denominator and evidence caveat; no decorative charts.
5. **Case appendix**: two-column source/evidence and corrected FLOW preview; each case keeps its real SourceRow IDs visible in small type.
6. **Decision slide**: one strong conclusion, ordered next actions, and a clear scope boundary.

## Deck order

1. One-line source-to-FLOW example and v0.1→v0.2 result.
2. What passed, what did not, and what is still unverified.
3. Why SourceRow is the evidence minimum and Item is the execution minimum.
4. Ten positive content shapes with concrete examples.
5. Two negative gates.
6. SourceRow→Gate→LLM Proposal→Validator→Item/Export pipeline.
7. Prompt revision and three-round evidence.
8. Blind review quality, corrections, and proxy-review limitation.
9. Ten corrected FLOW previews.
10. Stability, cost/model comparison lane, backend preparation, and next decision.

## Interaction and responsive rules

- Desktop: each `.slide` keeps a 16:9 stage and scroll snapping; right-side index and previous/next controls stay visible.
- Keyboard: ArrowUp/ArrowLeft/PageUp and ArrowDown/ArrowRight/PageDown navigate; Home/End jump.
- Mobile: slides become natural-height documents; all rails wrap vertically; navigation becomes a compact bottom bar.
- Print: controls disappear and each slide starts a new landscape page.
- Reduced motion: disable smooth scrolling and reveal transitions.

## First-viewport copy lock

- `URL 한 개가, 실행 가능한 FLOW가 되려면`
- `극세 필터는 4주에 한 번 청소`
- `극세 필터 청소하기`
- `청소를 마쳤다`
- `Checklist · Calendar 후보`
- `v0.1 1/12 → v0.2 12/12`

No eyebrow, badge, pill, decorative metric, or extra navigation label may be added above the headline.
