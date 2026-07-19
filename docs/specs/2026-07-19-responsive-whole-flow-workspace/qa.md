# P25 Responsive Whole-Flow Workspace QA

## P25-02A

- Post-save count equals effective saved rows.
- Post-save and selected returning outline both expose `data-testid="my-flow-whole-flow-outline"`.
- Local tabs read `지금 / 내 Flow / 완료`.
- A single selected Flow shows every row without a hidden five-row preview.
- Completing a row adds it to `완료`; checking it again removes it and reopens execution.
- Mobile and wide horizontal overflow remain zero.
- Existing P24 save/personalize/Calendar journey tests stay green.

## P25-02B

- Wide selected Flow uses the central canvas, not a narrow one-third card.
- Flow rail, outline, and detail remain usable at 1024px.
- Mobile detail opens under the selected row without duplicate completion controls.
- Console errors and fixed-navigation overlap are zero.

