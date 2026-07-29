# v3 controller evidence vs v4 product-quality gate

| Question | v3 | v4 |
|---|---|---|
| Did every SourceRow stay accounted for? | yes | required hard gate |
| Is the source scope complete or bounded? | not tested | required |
| Does every Item have observable completion? | 0/15 | 100% in worked candidate |
| Are projections usable payloads? | 0 | 3 payloads in worked candidate |
| Does the result expose input -> bundle -> first action? | no | required |
| Does it match live Flow 찾기 capabilities? | not tested | 100% in worked candidate |
| Is it better than baseline? | not tested | score withheld until blind pairwise |

The v3 controller remains useful as a source-accounting layer. It is no longer a publish-quality decision maker.
