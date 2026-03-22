# PRD-05: Aggregation & Privacy Threshold Enforcement

## Goal
Expose only aggregated results above configurable minimum group size.

## Rules
- Company-configurable minimum response threshold (default recommendation: 5).
- If below threshold, return "insufficient data".
- Show count and score only when threshold is met.

## Metrics
- Per-question average score (1-100)
- Response count
- Previous occurrence comparison and percentage change

## Notes
- Comparisons must use same filter context and threshold logic.
- Comments are shown verbatim once threshold is met (accepted risk).
