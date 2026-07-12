# FlowMe cross-category UX reference audit

Date: 2026-07-12

This package turns current calendar, workspace, task, workout-planning, and travel-planning references into concrete FlowMe design constraints. It is a design input, not observed-user validation and not a claim that FlowMe should copy any one product.

## Files

- [audit.md](./audit.md): findings, content archetypes, route implications, and redesign order.
- [references.md](./references.md): official product and help sources reviewed.
- [reference-matrix.json](./reference-matrix.json): machine-readable pattern and application matrix.
- [review.html](./review.html): browsable Korean review board.

## Decision

FlowMe should keep one shared execution model while rendering only the surface needed by each content shape. Month, today, project, detail, source, and export are different density levels, not sections that must all be visible at once.

The first visible redesign target is the shared public `/f/[slug]` execution shell. The current 1024px evidence shows a narrow execution list beside an oversized month calendar with unused vertical space. This is a shared layout defect, not a content-specific copy issue.
